/* === VÖRUR / ÞJÓNUSTA PICKER v2 (flokka-tíglar + mest notað + grúppuð) ===
 *
 * Sameiginleg leitar-popup fyrir vörur og þjónustur — notuð víða:
 *   • 78-counter-workshop   (verkstæði → breyta tæki → bæta við þjónustu)
 *   • 121-pickup-checkout   (Sótt → bæta við vöru)
 *   • 129-company-total-cost(+ Bæta við vöru eða þjónustu)
 *   • 142-sale-editor       (bæta línu á sölu)
 *   • 113/116/158/172       (verðlistar / tilboð / sérkjör)
 *
 * Stillir nafn, sjálfgefið verð (verd_an_vsk) og VSK% sjálfvirkt þegar
 * notandi velur vöru úr listanum, svo ekki þarf að slá inn handvirkt.
 *
 * Notkun (ÓBREYTT frá v1 — allir kallarar virka áfram):
 *   window.VorurPicker.open(function(p){
 *     // p = { id, nafn, flokkur, verd_an_vsk, vsk_prosenta, lysing }
 *   });
 *
 * v2 (2026-07-23): endurhannað eftir Claude Design comp „Voruval Picker.dc.html"
 *   — flokka-tíglar (gler-stíll, litur + íkon per flokk) í stað <select>, „Mest
 *   notað" pillur (nýjustu val + sjálfgefnir skýrslu-liðir) og flokka-borðar
 *   yfir grúppuðum lista. Gagna-/kallara-samningur óbreyttur.
 *
 * Cache: products sótt einu sinni úr Supabase, cachað fyrir session.
 * VorurPicker.refresh() til að hreinsa.
 */
(() => {
  if (window.__vorurPickerInstalled) return;
  window.__vorurPickerInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  // Íslensk þúsundamörk, engin aukastafur (12900 → „12.900").
  function fmtNum(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS'); }
  function getSB() { return (window.DB && window.DB.sb) || null; }

  // Flokkur → íkon + grunnlitur (hue). Sami og í hönnunar-comp-inu; óþekktir
  // flokkar fá hlutlausan bláan fallback.
  const CAT_META = {
    'Allt':          { icon: '▦',  hue: '#1e3a8a' },
    'Slökkvitæki':   { icon: '🧯', hue: '#dc2626' },
    'Brunaslöngur':  { icon: '🚒', hue: '#c2410c' },
    'Skilti':        { icon: '🆘', hue: '#15803d' },
    'Reykskynjarar': { icon: '💨', hue: '#7c3aed' },
    'Brunakerfi':    { icon: '🚨', hue: '#be123c' },
    'Varahlutir':    { icon: '🔧', hue: '#475569' },
    'Fylgihlutir':   { icon: '🔩', hue: '#0f766e' },
    'Ýmsar vörur':   { icon: '📦', hue: '#b45309' },
    'Þjónusta':      { icon: '📋', hue: '#0369a1' }
  };
  function metaFor(cat) { return CAT_META[cat] || { icon: '▪', hue: '#1e3a8a' }; }

  // „Mest notað" — nýjustu val notandans (localStorage) fyrst, svo sjálfgefnir
  // skýrslu-þjónustuliðir svo reiturinn er aldrei tómur í fyrsta skipti.
  const RECENT_KEY = 'vp_recent_v1';
  const DEFAULT_RECENT = [
    'Samantekt og gerð skoðunarskýrslu',
    'Skoðun á aðalstöð brunaviðvörunarkerfis',
    'Skoðun skynjara / boða, pr. stk',
    'Skoðun á aðalafli og varaafli'
  ];
  function getRecents() {
    try { const a = JSON.parse(localStorage.getItem(RECENT_KEY)); return Array.isArray(a) ? a : []; }
    catch (_) { return []; }
  }
  function pushRecent(nafn) {
    if (!nafn) return;
    try {
      let a = getRecents().filter(n => n !== nafn);
      a.unshift(nafn);
      if (a.length > 12) a = a.slice(0, 12);
      localStorage.setItem(RECENT_KEY, JSON.stringify(a));
    } catch (_) {}
  }

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

  // ── Gler-tígull (flokkur) — sami stíll og comp-ið ────────────────────────
  function tileStyle(hue, on) {
    return [
      'display:flex', 'flex-direction:column', 'gap:3px', 'padding:13px 12px',
      'min-height:62px', 'justify-content:center', 'border-radius:12px', 'cursor:pointer',
      'position:relative', 'overflow:hidden', 'transition:all .15s ease',
      // solid fallback fyrst (ef color-mix er ekki stutt), svo gler-image ofan á
      'background-color:' + (on ? hue : '#eef1f6'),
      'background-image:' + (on
        ? 'linear-gradient(155deg, color-mix(in oklch, ' + hue + ' 55%, transparent) 0%, color-mix(in oklch, ' + hue + ' 78%, transparent) 100%), linear-gradient(155deg, rgba(255,255,255,.5), rgba(255,255,255,.08))'
        : 'linear-gradient(155deg, rgba(255,255,255,.75) 0%, color-mix(in oklch, ' + hue + ' 10%, transparent) 100%)'),
      'backdrop-filter:blur(10px)', '-webkit-backdrop-filter:blur(10px)',
      'color:' + (on ? '#fff' : '#1a1a1a'),
      'text-shadow:' + (on ? '0 1px 3px rgba(0,0,0,.25)' : 'none'),
      'border:1px solid ' + (on ? 'color-mix(in oklch, ' + hue + ' 45%, rgba(255,255,255,.7))' : 'rgba(255,255,255,.9)'),
      'box-shadow:' + (on
        ? 'inset 0 1px 1px rgba(255,255,255,.6), inset 0 -6px 14px color-mix(in oklch, ' + hue + ' 35%, transparent), 0 8px 20px color-mix(in oklch, ' + hue + ' 35%, transparent), 0 2px 4px rgba(0,0,0,.12)'
        : 'inset 0 1px 1px rgba(255,255,255,.9), 0 4px 12px rgba(30,50,90,.1), 0 1px 2px rgba(0,0,0,.05)'),
      'transform:' + (on ? 'translateY(-2px)' : 'none')
    ].join(';');
  }

  function open(onPick) {
    let dlg = document.getElementById('_vp-dialog');
    if (dlg) dlg.remove();

    dlg = document.createElement('div');
    dlg.id = '_vp-dialog';
    // 2026-05-21: 100080 svo tíninn sitji ALLTAF ofan á host-modal sem opnaði
    // hann (Þjónustuverk 100070, sölu-ritill, verðlista-gluggar 100050-100070).
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100080;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px';

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.35);width:min(600px,calc(100vw - 24px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden">' +
        // ── Haus ──
        '<div style="background:#1e3a8a;color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<div style="font-size:15px;font-weight:800">🔍 Velja vöru / þjónustu</div>' +
            '<div style="font-size:11.5px;opacity:.75">Smelltu á vöru til að nota nafn + verð sjálfvirkt</div>' +
          '</div>' +
          '<div id="_vp-x" title="Loka" style="width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.15);border-radius:8px;font-size:14px;cursor:pointer">✕</div>' +
        '</div>' +
        // ── Leit + flokka-tíglar ──
        '<div style="padding:12px 16px;display:flex;flex-direction:column;gap:9px;border-bottom:1px solid rgba(0,0,0,.07);background:radial-gradient(ellipse 70% 90% at 15% 0%, rgba(220,38,38,.12), transparent 60%),radial-gradient(ellipse 60% 80% at 85% 20%, rgba(30,58,138,.14), transparent 60%),radial-gradient(ellipse 50% 70% at 50% 100%, rgba(3,105,161,.1), transparent 65%),linear-gradient(180deg,#f4f6fa,#e9edf4)">' +
          '<input id="_vp-search" type="text" autocomplete="off" placeholder="Leita að vöru, flokki eða lýsingu…" style="border:1.5px solid rgba(0,0,0,.15);border-radius:9px;padding:11px 13px;font-size:14px;width:100%;box-sizing:border-box">' +
          '<div id="_vp-tiles" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:7px"></div>' +
        '</div>' +
        // ── Mest notað ──
        '<div id="_vp-recent-wrap" style="padding:10px 16px 4px;display:none;flex:none">' +
          '<div style="font-size:10px;font-weight:800;color:rgba(0,0,0,.4);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">★ Mest notað í þínum skýrslum</div>' +
          '<div id="_vp-recent" style="display:flex;flex-wrap:wrap;gap:6px"></div>' +
        '</div>' +
        // ── Grúppaður listi ──
        '<div id="_vp-list" style="flex:1;min-height:130px;overflow:auto;padding:6px 0 10px">' +
          '<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">Hleð inn vörum…</div>' +
        '</div>' +
        // ── Fótur ──
        '<div style="padding:10px 16px;border-top:1px solid rgba(0,0,0,.08);display:flex;justify-content:space-between;align-items:center;gap:12px">' +
          '<div id="_vp-count" style="font-size:12px;color:rgba(0,0,0,.5)"></div>' +
          '<div id="_vp-cancel" style="font-size:13px;font-weight:700;border:1px solid rgba(0,0,0,.15);border-radius:9px;padding:9px 16px;color:rgba(0,0,0,.6);cursor:pointer">Hætta við</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    const search    = dlg.querySelector('#_vp-search');
    const tilesEl   = dlg.querySelector('#_vp-tiles');
    const recentWrap= dlg.querySelector('#_vp-recent-wrap');
    const recentEl  = dlg.querySelector('#_vp-recent');
    const listEl    = dlg.querySelector('#_vp-list');
    const countEl   = dlg.querySelector('#_vp-count');

    let products = [];
    const state = { query: '', cat: 'Allt' };

    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_vp-x').addEventListener('click', close);
    dlg.querySelector('#_vp-cancel').addEventListener('click', close);

    function doPick(p) {
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
      pushRecent(p && p.nafn);
      close();
    }

    // Flokkar í CAT_META-röð fyrst, svo hvaðeina sem eftir er.
    function categories() {
      const present = [];
      products.forEach(p => { const c = p.flokkur || 'Ýmsar vörur'; if (present.indexOf(c) < 0) present.push(c); });
      const ordered = Object.keys(CAT_META).filter(c => c !== 'Allt' && present.indexOf(c) >= 0);
      present.forEach(c => { if (ordered.indexOf(c) < 0) ordered.push(c); });
      return ['Allt', ...ordered];
    }
    function catCount(c) {
      return c === 'Allt' ? products.length : products.filter(p => (p.flokkur || 'Ýmsar vörur') === c).length;
    }

    function renderTiles() {
      tilesEl.innerHTML = categories().map(c => {
        const m = metaFor(c), on = state.cat === c;
        const countClr = on ? 'rgba(255,255,255,.75)' : 'color-mix(in oklch, ' + m.hue + ' 65%, black)';
        return '<div data-cat="' + esc(c) + '" style="' + tileStyle(m.hue, on) + '">' +
            '<div style="position:absolute;right:-6px;bottom:-10px;font-size:52px;opacity:.16;pointer-events:none;filter:saturate(1.2)">' + m.icon + '</div>' +
            '<div style="font-size:18px;font-weight:800;line-height:1.15;position:relative">' + esc(c) + '</div>' +
            '<div style="font-size:12px;font-weight:700;position:relative;color:' + countClr + '">' + catCount(c) + ' vörur</div>' +
          '</div>';
      }).join('');
    }

    function renderRecent() {
      if (state.query || state.cat !== 'Allt') { recentWrap.style.display = 'none'; return; }
      const byName = {};
      products.forEach(p => { if (!(p.nafn in byName)) byName[p.nafn] = p; });
      const names = [];
      getRecents().concat(DEFAULT_RECENT).forEach(n => { if (byName[n] && names.indexOf(n) < 0) names.push(n); });
      const top = names.slice(0, 6);
      if (!top.length) { recentWrap.style.display = 'none'; return; }
      recentWrap.style.display = '';
      recentEl.innerHTML = top.map(n => {
        const p = byName[n];
        const priceInc = (+p.verd_an_vsk || 0) * (1 + (+p.vsk_prosenta || 24) / 100);
        const label = n.length > 34 ? n.slice(0, 33) + '…' : n;
        return '<div data-name="' + esc(n) + '" style="font-size:12px;font-weight:700;background:rgba(30,58,138,.07);border:1px solid rgba(30,58,138,.25);color:#1e3a8a;padding:8px 12px;border-radius:99px;cursor:pointer">' +
          esc(label) + ' · <b>' + fmtNum(priceInc) + ' kr</b></div>';
      }).join('');
    }

    function filteredRows() {
      const q = (state.query || '').trim().toLowerCase();
      let rows = products;
      if (state.cat !== 'Allt') rows = rows.filter(p => (p.flokkur || 'Ýmsar vörur') === state.cat);
      if (q) {
        // Tókenuð leit (2026-05-10): öll orð verða að finnast (í hvaða röð sem er)
        // yfir nafn/flokk/lýsingu — svo „duft hleðsla 6" finnur „6 kg. Duft ABC hleðsla".
        const tokens = q.split(/\s+/).filter(Boolean);
        rows = rows.filter(p => {
          const hay = ((p.nafn || '') + ' ' + (p.flokkur || '') + ' ' + (p.lysing || '')).toLowerCase();
          return tokens.every(tok => hay.indexOf(tok) >= 0);
        });
      }
      return rows;
    }

    function bannerHtml(cat, count) {
      const m = metaFor(cat);
      // Fastur lita-borði (hue) með glans-yfirlagi — engin color-mix svo hann
      // birtist eins í öllum vöfrum. Hvítur texti, fjöldi hægra megin.
      return '<div style="position:relative;overflow:hidden;margin:8px 10px 0;border-radius:10px;padding:11px 15px;display:flex;justify-content:space-between;align-items:center;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.28);background-color:' + m.hue + ';background-image:linear-gradient(160deg, rgba(255,255,255,.30) 0%, rgba(255,255,255,.05) 42%, rgba(0,0,0,.22) 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.35), 0 4px 12px rgba(15,23,42,.16)">' +
          '<div style="position:absolute;right:8px;bottom:-12px;font-size:46px;opacity:.22;pointer-events:none">' + m.icon + '</div>' +
          '<div style="font-size:16px;font-weight:800;position:relative">' + esc(cat) + '</div>' +
          '<div style="font-size:11.5px;font-weight:700;color:rgba(255,255,255,.8);position:relative">' + count + ' vörur</div>' +
        '</div>';
    }

    function rowHtml(p) {
      const priceEx = +p.verd_an_vsk || 0;
      const vsk = +p.vsk_prosenta || 24;
      const priceInc = priceEx * (1 + vsk / 100);
      return '<div class="_vp-row" data-id="' + esc(p.id) + '" style="padding:10px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;cursor:pointer;border-bottom:1px solid rgba(0,0,0,.04)">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-size:13.5px;font-weight:700;color:#1a1a1a">' + esc(p.nafn || '—') + '</div>' +
            (p.lysing ? '<div style="font-size:11.5px;color:rgba(0,0,0,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.lysing) + '</div>' : '') +
          '</div>' +
          '<div style="text-align:right;flex:none">' +
            '<div style="font-size:14px;font-weight:800;color:#1a1a1a;font-variant-numeric:tabular-nums">' + fmtNum(priceInc) + ' kr</div>' +
            '<div style="font-size:10.5px;color:rgba(0,0,0,.45);font-variant-numeric:tabular-nums">' + fmtNum(priceEx) + ' kr án vsk · ' + vsk + '%</div>' +
          '</div>' +
        '</div>';
    }

    function renderList() {
      const rows = filteredRows();
      countEl.textContent = rows.length + ' / ' + products.length;
      if (!rows.length) {
        listEl.innerHTML = '<div style="padding:40px;text-align:center;font-size:13px;color:rgba(0,0,0,.45)">Engin vara fannst — prófaðu annan flokk eða leitarorð</div>';
        return;
      }
      const groupMap = {};
      rows.forEach(p => { const c = p.flokkur || 'Ýmsar vörur'; (groupMap[c] = groupMap[c] || []).push(p); });
      const order = categories().filter(c => c !== 'Allt' && groupMap[c]);
      Object.keys(groupMap).forEach(c => { if (order.indexOf(c) < 0) order.push(c); });
      listEl.innerHTML = order.map(c =>
        bannerHtml(c, groupMap[c].length) + groupMap[c].map(rowHtml).join('')
      ).join('');
    }

    function render() { renderTiles(); renderRecent(); renderList(); }

    // ── Atburðir (delegation) ──
    tilesEl.addEventListener('click', e => {
      const t = e.target.closest('[data-cat]'); if (!t) return;
      state.cat = t.getAttribute('data-cat');
      render();
    });
    recentEl.addEventListener('click', e => {
      const t = e.target.closest('[data-name]'); if (!t) return;
      const p = products.find(x => x.nafn === t.getAttribute('data-name'));
      if (p) doPick(p);
    });
    listEl.addEventListener('click', e => {
      const t = e.target.closest('._vp-row'); if (!t) return;
      const p = products.find(x => String(x.id) === String(t.getAttribute('data-id')));
      if (p) doPick(p);
    });
    listEl.addEventListener('mouseover', e => { const r = e.target.closest('._vp-row'); if (r) r.style.background = 'rgba(30,58,138,.05)'; });
    listEl.addEventListener('mouseout',  e => { const r = e.target.closest('._vp-row'); if (r) r.style.background = ''; });

    search.addEventListener('input', () => { state.query = search.value; render(); });
    search.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = listEl.querySelector('._vp-row');
        if (first) first.click();
      }
    });

    setTimeout(() => search.focus(), 80);

    loadProducts().then(p => { products = p; render(); });
  }

  window.VorurPicker = {
    open,
    refresh: () => { _cache = null; _loadingPromise = null; },
    list: () => _cache || []
  };

  console.log('[vorur-picker] installed v2 — VorurPicker.open(callback) til að velja vöru/þjónustu');
})();
/* === END VÖRUR PICKER v2 === */
