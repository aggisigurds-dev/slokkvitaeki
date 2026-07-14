/* === VERKSTÆÐI: KOMIÐ ÚR ÞJÓNUSTU (á verkstæði tæki) v1 ===
 *
 * Ósk Agnars (2026-07-14): tækin sem bílstjóri hakar „🔵 Á verkstæði"
 * (uttaeki.status='loaned') birtast á Aksturslista-síðunni — láta þau líka
 * birtast á VERKSTÆÐI-síðunni (view-workshop) efst í Samningshafar-súlunni
 * (.bw-sh-body), með sama verkstæðis-lífsferli (custody_status):
 *   null (Nýkomið) → komid → tilbuid (+service_choice hladid/onytt/nytt) → farid.
 *
 * Sjálfstætt: bætir AÐEINS við einni sektíon efst í .bw-sh-body — snertir ekki
 * verkbeiðna-rökfræði patch 78/122. Endur-teiknar þegar Workshop.render() hreinsar
 * (MutationObserver á #view-workshop). Skrifar beint í uttaeki (sama og patch 268).
 */
(() => {
  if (window.__vkLoanedInstalled) return;
  window.__vkLoanedInstalled = true;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CUSTODY = {
    'null':  { label: 'Nýkomið', col: '#64748b' },
    komid:   { label: 'Komið á verkstæði', col: '#2563eb' },
    tilbuid: { label: 'Tilbúið', col: '#059669' },
    farid:   { label: 'Farið af verkstæði', col: '#7c3aed' },
  };
  const DISP = { hladid: '🔋 Hlaðið', onytt: '❌ Ónýtt', nytt: '🆕 Keypt nýtt' };

  let _shop = [], _loadedAt = 0, _busy = false, _injecting = false;

  async function loadShop(force) {
    if (!(window.DB && DB.sb)) { _shop = []; return; }
    if (!force && Date.now() - _loadedAt < 8000) return;
    try {
      const r = await DB.sb.from('uttaeki').select('id,client,type,size,serial,status,custody_status,service_choice').eq('status', 'loaned').limit(2000);
      _shop = r.data || []; _loadedAt = Date.now();
    } catch (_) {}
  }
  async function saveCustody(id, patch) {
    if (!(window.DB && DB.sb)) return false;
    try { const r = await DB.sb.from('uttaeki').update(patch).eq('id', id); return !(r && r.error); } catch (_) { return false; }
  }
  function byClient() {
    const m = {};
    _shop.forEach(u => { const k = u.client || '— óþekkt —'; (m[k] = m[k] || []).push(u); });
    return Object.keys(m).sort((a, b) => m[b].length - m[a].length || a.localeCompare(b, 'is')).map(k => ({ client: k, items: m[k] }));
  }

  function sectionHtml() {
    const grp = byClient();
    const INK = '#11141c', INK3 = '#6b7280';
    const stBtn = (id, act, label, col) =>
      '<button type="button" class="_vk-cust" data-id="' + id + '" data-act="' + act + '" style="border:0;background:' + col + ';color:#fff;border-radius:7px;padding:4px 9px;font:inherit;font-size:11px;font-weight:700;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.22)">' + label + '</button>';
    const row = (u) => {
      const cs = u.custody_status || 'null';
      const meta = [u.type || 'Tæki', u.size, u.serial].filter(Boolean).map(esc).join(' · ');
      const pill = CUSTODY[cs] || CUSTODY['null'];
      let actions = '';
      if (cs === 'null') actions = stBtn(u.id, 'komid', '✅ Komið', '#2563eb');
      else if (cs === 'komid') actions = stBtn(u.id, 'hladid', '🔋 Hlaðið', '#16a34a') + stBtn(u.id, 'onytt', '❌ Ónýtt', '#dc2626') + stBtn(u.id, 'nytt', '🆕 Nýtt', '#d97706');
      else if (cs === 'tilbuid') actions = '<span style="font-size:11px;color:#fff;background:#059669;border-radius:99px;padding:2px 8px;font-weight:700">' + (DISP[u.service_choice] || 'Tilbúið') + '</span>' + stBtn(u.id, 'farid', '➡️ Farið', '#7c3aed');
      else if (cs === 'farid') actions = '<span style="font-size:11px;color:#6d28d9;background:#ede9fe;border:1px solid #c4b5fd;border-radius:99px;padding:2px 8px;font-weight:700">🚚 Bíður skila</span>';
      return '<div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:6px 0;border-top:1px solid #eef2f7">' +
        '<span style="width:8px;height:8px;border-radius:50%;flex:none;background:' + pill.col + '"></span>' +
        '<span style="font-size:12px;color:' + INK + ';font-weight:600">' + meta + '</span>' +
        '<span style="font-size:9.5px;color:#fff;font-weight:700;background:' + pill.col + ';border-radius:99px;padding:1px 7px">' + esc(pill.label) + '</span>' +
        '<span style="display:flex;gap:5px;margin-left:auto;flex-wrap:wrap">' + actions + '</span>' +
      '</div>';
    };
    const body = grp.length ? grp.map(g =>
      '<div style="padding:5px 0 2px">' +
        '<div style="font-size:12.5px;font-weight:800;color:' + INK + '">' + esc(g.client) + ' <span style="font-weight:600;color:' + INK3 + ';font-size:11px">· ' + g.items.length + ' tæki</span></div>' +
        g.items.map(row).join('') +
      '</div>').join('')
      : '<div style="padding:10px 4px;color:' + INK3 + ';font-size:12px">Engin tæki komin úr þjónustu núna.</div>';
    return '<div id="_vk-loaned" style="background:#f4f7fb;border:1px solid #dbe3ee;border-radius:12px;padding:9px 11px;margin-bottom:12px">' +
      '<div style="display:flex;align-items:center;margin-bottom:5px">' +
        '<span style="font-size:11px;font-weight:800;letter-spacing:.04em;color:#1f2937">🚚 KOMIÐ ÚR ÞJÓNUSTU</span>' +
        (_shop.length ? '<span style="margin-left:auto;font-size:11px;color:#2563eb;font-weight:700">' + _shop.length + ' tæki</span>' : '') +
      '</div>' + body +
    '</div>';
  }

  // Ein umsjónar-hlustun með HÖFT (capture) á document. Þetta grípur smellinn
  // ÁÐUR en nokkur foreldris-hlustun (t.d. patch 78 sem endur-teiknar
  // Samningshafar-súluna) fær hann — svo hnappurinn hverfur ekki undan okkur.
  // Per-element listeners duttu út þegar sektíónin var endur-sprautuð.
  let _delegated = false;
  function installDelegate() {
    if (_delegated) return; _delegated = true;
    document.addEventListener('click', async (e) => {
      const b = e.target && e.target.closest && e.target.closest('._vk-cust');
      if (!b) return;
      e.preventDefault(); e.stopPropagation();
      const id = b.dataset.id, act = b.dataset.act;
      const P = { komid: { custody_status: 'komid' }, hladid: { custody_status: 'tilbuid', service_choice: 'hladid' },
        onytt: { custody_status: 'tilbuid', service_choice: 'onytt' }, nytt: { custody_status: 'tilbuid', service_choice: 'nytt' },
        farid: { custody_status: 'farid' } }[act];
      if (!P) return;
      b.disabled = true; b.style.opacity = '.5';
      const local = _shop.find(u => String(u.id) === String(id)); if (local) Object.assign(local, P);
      await saveCustody(id, P);
      await loadShop(true); inject(true);
    }, true);
  }

  async function inject(force) {
    const bodies = document.querySelectorAll('#view-workshop .bw-sh-body');
    if (!bodies.length) return;
    if (_busy) return; _busy = true;
    try {
      await loadShop(force);
      _injecting = true;
      bodies.forEach(body => {
        const old = body.querySelector('#_vk-loaned');
        if (old) old.remove();
        body.insertAdjacentHTML('afterbegin', sectionHtml());
      });
      setTimeout(() => { _injecting = false; }, 30);
    } finally { _busy = false; }
  }

  // fylgjast með view-workshop: þegar Workshop.render() endurbyggir → sprauta aftur
  function watch() {
    installDelegate();
    let t = null;
    const obs = new MutationObserver(() => {
      if (_injecting) return;
      const vw = document.getElementById('view-workshop');
      if (!vw || vw.style.display === 'none') return;
      const body = vw.querySelector('.bw-sh-body');
      if (body && !body.querySelector('#_vk-loaned')) { clearTimeout(t); t = setTimeout(() => inject(false), 120); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('view-shown', e => { if (e && e.detail && e.detail.name === 'workshop') setTimeout(() => inject(true), 200); });
    // Öryggis-tikk: sprauta strax + reglulega ef verkstæðis-súlan er sýnileg og
    // sektíónin vantar (MutationObserver missir af þegar DOM breytist ekki).
    const tick = () => {
      const vw = document.getElementById('view-workshop');
      if (!vw || vw.style.display === 'none') return;
      const body = vw.querySelector('.bw-sh-body');
      if (body && !body.querySelector('#_vk-loaned')) inject(false);
    };
    tick(); setInterval(tick, 3000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch);
  else watch();

  window.VkLoaned = { inject: () => inject(true) };
  console.log('[verkstaedi-loaned] v2 installed (delegated click)');
})();
/* === END VERKSTÆÐI: KOMIÐ ÚR ÞJÓNUSTU === */
