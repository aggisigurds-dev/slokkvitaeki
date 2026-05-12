/* === VÖRUR / ÞJÓNUSTA PICKER v1 ===
 *
 * Sameiginleg leitar-popup fyrir vörur og þjónustur — notuð af
 *   • 113-company-pricing  (+ Bæta við tilboði)
 *   • 116-vidsk-pricing    (+ Ný sérkjör)
 *
 * Stillir nafn, sjálfgefið verð (verd_an_vsk) og VSK% sjálfvirkt þegar
 * notandi velur vöru úr listanum, svo ekki þarf að slá inn handvirkt.
 *
 * Notkun:
 *   window.VorurPicker.open(function(p){
 *     // p = { id, nafn, flokkur, verd_an_vsk, vsk_prosenta, lysing }
 *   });
 *
 * Cache: products eru sóttar einu sinni úr Supabase og cachaðar fyrir
 * sömu session. Ef notandi vill nýja gögn → close + open aftur, eða
 * VorurPicker.refresh().
 */
(() => {
  if (window.__vorurPickerInstalled) return;
  window.__vorurPickerInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr'; }
  function getSB() { return (window.DB && window.DB.sb) || null; }

  let _cache = null;
  let _loadingPromise = null;

  function loadProducts() {
    if (_cache) return Promise.resolve(_cache);
    if (_loadingPromise) return _loadingPromise;
    const SB = getSB();
    if (!SB) return Promise.resolve([]);
    _loadingPromise = SB.from('vorur')
      .select('id,nafn,flokkur,verd_an_vsk,vsk_prosenta,lysing,virkt')
      .eq('virkt', true)
      .order('flokkur', { ascending: true })
      .order('nafn', { ascending: true })
      .then(r => {
        _cache = (r.data || []);
        _loadingPromise = null;
        return _cache;
      })
      .catch(e => {
        console.warn('[vorur-picker] load failed:', e);
        _loadingPromise = null;
        return [];
      });
    return _loadingPromise;
  }

  function open(onPick) {
    let dlg = document.getElementById('_vp-dialog');
    if (dlg) dlg.remove();

    dlg = document.createElement('div');
    dlg.id = '_vp-dialog';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100060;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px';

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.3);width:min(640px,calc(100vw - 24px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#1e3a8a,#1e40af);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<h3 style="margin:0;font-size:16px;font-weight:700">🔍 Velja vöru / þjónustu</h3>' +
            '<div style="font-size:11px;color:#bfdbfe;margin-top:2px">Smelltu á vöru til að nota nafn + verð sjálfvirkt</div>' +
          '</div>' +
          '<button id="_vp-x" type="button" style="background:transparent;border:1px solid #93c5fd;color:#fff;font-size:20px;width:36px;height:36px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
        '<div style="padding:12px 18px;border-bottom:1px solid #e2e8f0;display:flex;gap:8px;align-items:center">' +
          '<input id="_vp-search" type="text" autocomplete="off" placeholder="Leita að vöru, flokki eða lýsingu…" style="flex:1;padding:9px 12px;border:1px solid #cbd5e1;border-radius:7px;font-size:14px;box-sizing:border-box">' +
          '<select id="_vp-filter" style="padding:9px 10px;border:1px solid #cbd5e1;border-radius:7px;font-size:13px;background:#fff">' +
            '<option value="all">Allt</option>' +
            '<option value="vorur">Vörur</option>' +
            '<option value="thjonusta">Þjónusta</option>' +
          '</select>' +
        '</div>' +
        '<div id="_vp-list" style="flex:1;overflow:auto;padding:6px 0">' +
          '<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">Hleð inn vörum…</div>' +
        '</div>' +
        '<div style="padding:10px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;align-items:center">' +
          '<div id="_vp-count" style="font-size:11px;color:#64748b"></div>' +
          '<button id="_vp-cancel" type="button" style="padding:8px 16px;background:#fff;border:1px solid #cbd5e1;color:#475569;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600">Hætta við</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    const search = dlg.querySelector('#_vp-search');
    const filter = dlg.querySelector('#_vp-filter');
    const list = dlg.querySelector('#_vp-list');
    const countEl = dlg.querySelector('#_vp-count');

    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_vp-x').addEventListener('click', close);
    dlg.querySelector('#_vp-cancel').addEventListener('click', close);

    let products = [];

    function renderList() {
      const q = (search.value || '').trim().toLowerCase();
      const f = filter.value;
      let rows = products;
      if (f === 'vorur') rows = rows.filter(p => p.flokkur !== 'Þjónusta');
      else if (f === 'thjonusta') rows = rows.filter(p => p.flokkur === 'Þjónusta');
      if (q) {
        // 2026-05-10 (F2 fix): Tokenized search — split query by whitespace
        // and require ALL tokens to appear (in any order) across nafn/flokkur/
        // lysing. So "duft hleðsla 6" finds "6 kg. Duft ABC hleðsla", which
        // the previous strict-substring search missed.
        const tokens = q.split(/\s+/).filter(Boolean);
        rows = rows.filter(p => {
          const hay = ((p.nafn || '') + ' ' + (p.flokkur || '') + ' ' + (p.lysing || '')).toLowerCase();
          return tokens.every(tok => hay.indexOf(tok) >= 0);
        });
      }
      countEl.textContent = rows.length + ' / ' + products.length;

      if (!rows.length) {
        list.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">Engin niðurstaða — prófaðu annað leitarorð.</div>';
        return;
      }

      list.innerHTML = rows.map(p => {
        const isService = p.flokkur === 'Þjónusta';
        const flokkBadge = isService
          ? '<span style="font-size:9px;background:#dbeafe;color:#1e40af;padding:1px 7px;border-radius:99px;font-weight:700;margin-left:6px">🛠️ ' + esc(p.flokkur) + '</span>'
          : '<span style="font-size:9px;background:#fef3c7;color:#92400e;padding:1px 7px;border-radius:99px;font-weight:700;margin-left:6px">📦 ' + esc(p.flokkur || 'Vara') + '</span>';
        const priceEx = +p.verd_an_vsk || 0;
        const vsk = +p.vsk_prosenta || 24;
        const priceInc = priceEx * (1 + vsk / 100);
        return '<div class="_vp-row" data-id="' + esc(p.id) + '" style="padding:10px 18px;border-bottom:1px solid #f1f5f9;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:600;color:#0f172a;font-size:14px">' + esc(p.nafn || '—') + flokkBadge + '</div>' +
            (p.lysing ? '<div style="font-size:11px;color:#64748b;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:380px">' + esc(p.lysing) + '</div>' : '') +
          '</div>' +
          '<div style="text-align:right;flex-shrink:0">' +
            '<div style="font-weight:700;color:#0f172a;font-size:14px;font-variant-numeric:tabular-nums">' + fmtKr(priceInc) + '</div>' +
            '<div style="font-size:10px;color:#64748b;font-variant-numeric:tabular-nums">' + fmtKr(priceEx) + ' án vsk · ' + vsk + '%</div>' +
          '</div>' +
        '</div>';
      }).join('');

      list.querySelectorAll('._vp-row').forEach(row => {
        row.addEventListener('click', () => {
          const id = row.dataset.id;
          const p = products.find(x => String(x.id) === String(id));
          if (p && typeof onPick === 'function') {
            onPick({
              id: p.id,
              nafn: p.nafn || '',
              flokkur: p.flokkur || '',
              verd_an_vsk: +p.verd_an_vsk || 0,
              vsk_prosenta: +p.vsk_prosenta || 24,
              lysing: p.lysing || ''
            });
          }
          close();
        });
        row.addEventListener('mouseenter', () => { row.style.background = '#f1f5f9'; });
        row.addEventListener('mouseleave', () => { row.style.background = ''; });
      });
    }

    search.addEventListener('input', renderList);
    filter.addEventListener('change', renderList);
    search.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = list.querySelector('._vp-row');
        if (first) first.click();
      }
    });

    setTimeout(() => search.focus(), 80);

    loadProducts().then(p => {
      products = p;
      renderList();
    });
  }

  window.VorurPicker = {
    open,
    refresh: () => { _cache = null; _loadingPromise = null; },
    list: () => _cache || []
  };

  console.log('[vorur-picker] installed — VorurPicker.open(callback) til að velja vöru/þjónustu');
})();
/* === END VÖRUR PICKER v1 === */
