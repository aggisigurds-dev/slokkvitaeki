/* === ÖPP: STÝRIBORÐ + UPPSETNINGAR-SKRÁ TÆKISINS (354) =====================
 *
 * Agnar 06.09.2026: „er hægt að gera einhvernskonar stýriborð inn á öpp page" ·
 * „sum öppin sem stangast á og get bara haft fyrsta sem ég installaði á skjáinn".
 *
 * Spjald efst á 📱 Öpp-síðunni (#view-opp). 261 render() teiknar síðuna upp á
 * nýtt með innerHTML — MutationObserver setur spjaldið inn aftur.
 *
 *   1. TÆKI + ÚTGÁFA: skjár (dp), síðubreidd (CSS-px) og hvort Chrome sé í
 *      Tölvusíðu-ham (síða breiðari en skjár), króm-hlutfall (353), síðuzoom (333),
 *      keyrir sem uppsett app eða í vafra, útgáfa (BUILD), service worker.
 *   2. STILLINGAR: króm-stærð (AppKrom) og síðuzoom (AppPageZoom) — takkar.
 *   3. ÖPP Á ÞESSU TÆKI: staða per app — ✓ staðfest uppsett (getInstalledRelatedApps
 *      með related_applications í manifest.json), ✓ skráð á þessu tæki
 *      (appinstalled-atburður → localStorage slokk_installed_apps_v1), keyrir núna,
 *      annars „óþekkt". „Athuga öpp" sækir manifest hvers apps og staðfestir að
 *      id / start_url / scope = /app/<key>/ og að ENGIN tvö öpp deili id.
 *      Það var árekstrarrótin: notenda-búin öpp höfðu ekkert manifest og fengu
 *      aðal-manifestið (id „/") — sömu auðkenni → aðeins fyrsta uppsetningin lifði.
 *      Lagað 06.09: /api/app-manifest?key= + head-veljarinn setur hlekkinn strax.
 *   4. AÐGERÐIR: endurhlaða, hreinsa skyndiminni + service worker, afrita greiningu
 *      (til að líma í spjall).
 *
 * Aðeins útlit og greining EINS tækis — localStorage leyfilegt (útlitsval +
 * uppsetningarskrá þessa tækis, ekki gögn). 153/187-reikningur ÓSNERTUR.
 * ========================================================================== */
(() => {
  if (window.__oppStyribord354) return;
  window.__oppStyribord354 = true;

  const ID = '_op-styri';
  const STYLE_ID = 'opp-styribord-354';
  const LS_INST = 'slokk_installed_apps_v1';
  const BUILTIN = ['fjarmal', 'verkefni', 'brunaholf', 'brunakerfi', 'bilstjori', 'boss'];
  const ZOOM_STEPS = [0.7, 0.8, 0.9, 1, 1.15, 1.35, 1.6, 2];   // = 333
  const KROM = [['auto', 'Sjálfvirkt'], ['1', '1,0'], ['1.5', '1,5'], ['2', '2,0'], ['2.5', '2,5'], ['3', '3,0']];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const state = { checks: {}, related: null, relatedErr: null, busy: false, msg: '' };

  /* ── uppsetningar-skrá þessa tækis ─────────────────────────────────────── */
  function readInst() { try { return JSON.parse(localStorage.getItem(LS_INST) || '{}') || {}; } catch (_) { return {}; } }
  function writeInst(o) { try { localStorage.setItem(LS_INST, JSON.stringify(o)); } catch (_) {} }
  function currentKey() {
    const pm = (location.pathname || '').match(/^\/app\/([a-z]+)\/?/);
    if (pm) return pm[1];
    try { const q = new URLSearchParams(location.search).get('app'); if (q) return q; } catch (_) {}
    const b = document.body && document.body.getAttribute('data-app');
    return b || 'main';
  }
  function standalone() {
    try { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; } catch (_) { return false; }
  }
  function markInstalled(key) {
    const o = readInst(); if (o[key]) return; o[key] = new Date().toISOString(); writeInst(o);
  }
  window.addEventListener('appinstalled', () => {
    markInstalled(currentKey());
    try { if (window.Toast && Toast.show) Toast.show('✓ Appið er komið á heimaskjáinn'); } catch (_) {}
    render();
  });
  if (standalone()) markInstalled(currentKey());   // keyrir sem uppsett app → það er uppsett

  /* ── greining ───────────────────────────────────────────────────────────── */
  function diag() {
    let manual = null; try { manual = localStorage.getItem('app_krom_zoom'); } catch (_) {}
    let auto = 1, krom = 1;
    try { if (window.AppKrom) { auto = AppKrom.auto(); krom = AppKrom.get(); } } catch (_) {}
    let zoom = 1; try { if (window.AppPageZoom) zoom = AppPageZoom.get(); } catch (_) {}
    return {
      screen: (screen.width || 0) + '×' + (screen.height || 0),
      layout: (window.innerWidth || 0) + '×' + (window.innerHeight || 0),
      dpr: window.devicePixelRatio || 1,
      vv: window.visualViewport ? Math.round(visualViewport.scale * 100) / 100 : null,
      desktopMode: auto >= 1.2,
      krom, auto, manual: manual != null ? +manual : null,
      zoom,
      standalone: standalone(), key: currentKey(),
      build: window.BUILD ? (BUILD.commit + ' · ' + BUILD.time) : '—',
      sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller),
      online: navigator.onLine !== false,
      touch: (navigator.maxTouchPoints || 0),
      ua: navigator.userAgent,
      inst: readInst(),
      url: location.href
    };
  }
  function fmtNum(n) { return String(Math.round(n * 100) / 100).replace('.', ','); }
  function fmtDate(iso) {
    try { const d = new Date(iso); return d.toLocaleDateString('is-IS', { day: '2-digit', month: '2-digit' }); } catch (_) { return ''; }
  }

  /* ── öppin: lesin af launcher-spjöldunum (261 teiknar þau) ─────────────── */
  function apps() {
    const out = [];
    document.querySelectorAll('#view-opp .op-card').forEach(card => {
      const b = card.querySelector('._op-open[data-app]'); if (!b) return;
      const key = b.getAttribute('data-app');
      const nm = card.querySelector('.op-nm');
      const custom = BUILTIN.indexOf(key) < 0;
      out.push({
        key, name: nm ? nm.textContent.trim() : key, custom,
        manifest: custom ? ('/api/app-manifest?key=' + encodeURIComponent(key)) : ('/manifest-' + key + '.json'),
        id: '/app/' + key + '/'
      });
    });
    return out;
  }
  function installedStatus(a, d) {
    const rel = state.related;
    if (rel && rel.some(r => (r.id && r.id === a.id) || (r.url && r.url.indexOf('/manifest-' + a.key + '.json') >= 0))) return ['ok', '✓ Uppsett (staðfest)'];
    if (d.standalone && d.key === a.key) return ['ok', '✓ Keyrir núna sem app'];
    if (d.inst[a.key]) return ['ok', '✓ Skráð uppsett hér ' + fmtDate(d.inst[a.key])];
    if (rel && !a.custom) return ['no', '– Ekki uppsett á þessu tæki'];
    return ['unk', '? Óþekkt — ýttu á „Athuga öpp"'];
  }

  /* ── manifest-athugun + árekstrar ───────────────────────────────────────── */
  async function checkAll() {
    if (state.busy) return; state.busy = true; state.msg = 'Athuga…'; render();
    const list = apps();
    const ids = {};
    for (const a of list) {
      const c = { ok: false, text: '' };
      try {
        const r = await fetch(a.manifest, { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const m = await r.json();
        const probs = [];
        if (m.id !== a.id) probs.push('id=' + (m.id || '—'));
        if (m.start_url !== a.id) probs.push('start_url=' + (m.start_url || '—'));
        if (m.scope !== a.id) probs.push('scope=' + (m.scope || '—'));
        if (!Array.isArray(m.icons) || !m.icons.some(i => /512/.test(i.sizes || ''))) probs.push('vantar 512px tákn');
        if (m.display !== 'standalone') probs.push('display=' + (m.display || '—'));
        c.id = m.id || ''; c.name = m.name || '';
        (ids[c.id] = ids[c.id] || []).push(a.key);
        c.ok = probs.length === 0; c.text = c.ok ? '✓ Manifest í lagi' : ('⚠ ' + probs.join(' · '));
      } catch (e) { c.ok = false; c.text = '⚠ Manifest næst ekki (' + (e && e.message ? e.message : e) + ')'; }
      state.checks[a.key] = c;
    }
    Object.keys(ids).forEach(id => {
      if (ids[id].length > 1) ids[id].forEach(k => { const c = state.checks[k]; c.ok = false; c.text = '⚠ ÁREKSTUR: sama id „' + id + '" og ' + ids[id].filter(x => x !== k).join(', '); });
    });
    try {
      if (navigator.getInstalledRelatedApps) {
        const rel = await navigator.getInstalledRelatedApps();
        state.related = (rel || []).map(r => ({ id: r.id || '', url: r.url || '', platform: r.platform || '' }));
        state.relatedErr = null;
      } else { state.related = null; state.relatedErr = 'vafrinn styður ekki getInstalledRelatedApps'; }
    } catch (e) { state.related = null; state.relatedErr = String(e && e.message || e); }
    state.busy = false; state.msg = 'Athugað ' + new Date().toLocaleTimeString('is-IS', { hour: '2-digit', minute: '2-digit' });
    render();
  }

  /* ── aðgerðir ───────────────────────────────────────────────────────────── */
  function zoomStep(dir) {
    const cur = window.AppPageZoom ? AppPageZoom.get() : 1;
    if (dir < 0) { let j = ZOOM_STEPS.length - 1; while (j > 0 && ZOOM_STEPS[j] >= cur - 0.001) j--; return ZOOM_STEPS[j]; }
    let k = 0; while (k < ZOOM_STEPS.length - 1 && ZOOM_STEPS[k] <= cur + 0.001) k++; return ZOOM_STEPS[k];
  }
  async function hreinsa() {
    state.msg = 'Hreinsa…'; render();
    try { if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); } } catch (_) {}
    try { if (window.caches && caches.keys) { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } } catch (_) {}
    location.href = location.pathname + '?nocache=' + Date.now() + (location.hash || '');
  }
  function afrita() {
    const d = diag();
    const lines = [
      'Slökkvitæki — greining tækis ' + new Date().toLocaleString('is-IS'),
      'Útgáfa: ' + d.build, 'Slóð: ' + d.url,
      'Skjár: ' + d.screen + ' dp · Síða: ' + d.layout + ' CSS-px · DPR ' + d.dpr + ' · visualViewport ' + d.vv,
      'Tölvusíðu-hamur: ' + (d.desktopMode ? 'JÁ (síða breiðari en skjár)' : 'nei'),
      'Króm-hlutfall: ' + fmtNum(d.krom) + (d.manual != null ? ' (handstillt)' : ' (sjálfvirkt ' + fmtNum(d.auto) + ')') + ' · Síðuzoom: ' + Math.round(d.zoom * 100) + '%',
      'Keyrir sem: ' + (d.standalone ? 'uppsett app (' + d.key + ')' : 'vafri') + ' · SW: ' + (d.sw ? 'virkur' : 'enginn') + ' · snertipunktar ' + d.touch,
      'Uppsett skráð hér: ' + (Object.keys(d.inst).map(k => k + ' ' + fmtDate(d.inst[k])).join(', ') || 'ekkert'),
      'Staðfest uppsett: ' + (state.related ? (state.related.map(r => r.id || r.url).join(', ') || 'ekkert') : ('óathugað' + (state.relatedErr ? ' (' + state.relatedErr + ')' : ''))),
      'Manifest: ' + (Object.keys(state.checks).map(k => k + ' → ' + state.checks[k].text).join(' | ') || 'óathugað'),
      'UA: ' + d.ua
    ];
    const txt = lines.join('\n');
    const done = () => { state.msg = '📋 Greining afrituð'; render(); };
    try { navigator.clipboard.writeText(txt).then(done, () => { state.msg = txt; render(); }); } catch (_) { state.msg = txt; render(); }
  }

  /* ── teikning ───────────────────────────────────────────────────────────── */
  const CSS = [
    '#view-opp #' + ID + '{padding:16px 16px 14px}',
    '#view-opp #' + ID + ' .st-h{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}',
    '#view-opp #' + ID + ' .st-t{font-size:17px;font-weight:800;color:#11141c;margin-right:auto}',
    '#view-opp #' + ID + ' .st-sec{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#94a3b8;margin:14px 0 6px}',
    '#view-opp #' + ID + ' .st-chips{display:flex;flex-wrap:wrap;gap:6px}',
    '#view-opp #' + ID + ' .st-chip{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;font-weight:600;color:#334155;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:99px;padding:5px 10px;line-height:1.2}',
    '#view-opp #' + ID + ' .st-chip.warn{background:#fff7ed;border-color:#fdba74;color:#9a3412}',
    '#view-opp #' + ID + ' .st-chip.ok{background:#e7f5ee;border-color:#a7dcc0;color:#166534}',
    '#view-opp #' + ID + ' .st-note{font-size:12.5px;color:#9a3412;background:#fff7ed;border:1px solid #fdba74;border-radius:10px;padding:8px 10px;margin-top:8px;line-height:1.45}',
    '#view-opp #' + ID + ' .st-seg{display:inline-flex;flex-wrap:wrap;gap:4px;background:#f1f5f9;border-radius:12px;padding:4px}',
    '#view-opp #' + ID + ' .st-seg button{font:inherit;font-size:13px;font-weight:700;min-height:40px;min-width:44px;padding:0 12px;border:none;border-radius:9px;background:transparent;color:#475569;cursor:pointer}',
    '#view-opp #' + ID + ' .st-seg button.on{background:#0f172a;color:#fff}',
    '#view-opp #' + ID + ' .st-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:6px}',
    '#view-opp #' + ID + ' table{width:100%;border-collapse:collapse;font-size:13px}',
    '#view-opp #' + ID + ' td{padding:8px 6px;border-top:1px solid #eef1f5;vertical-align:top}',
    '#view-opp #' + ID + ' td.nm{font-weight:800;color:#11141c;white-space:nowrap}',
    '#view-opp #' + ID + ' td.nm small{display:block;font-weight:500;color:#94a3b8;font-size:11px}',
    '#view-opp #' + ID + ' .st-ok{color:#166534;font-weight:700}',
    '#view-opp #' + ID + ' .st-no{color:#64748b}',
    '#view-opp #' + ID + ' .st-unk{color:#94a3b8}',
    '#view-opp #' + ID + ' .st-bad{color:#b91c1c;font-weight:700}',
    '#view-opp #' + ID + ' .st-mini{font:inherit;font-size:12.5px;font-weight:700;min-height:36px;padding:0 10px;border-radius:9px;border:1px solid #d7dce4;background:#fff;color:#334155;cursor:pointer;white-space:nowrap}',
    '#view-opp #' + ID + ' .st-msg{font-size:12.5px;color:#475569;margin-top:10px;white-space:pre-wrap;word-break:break-word}',
    '#view-opp #' + ID + ' .op-btn{min-height:40px;padding:8px 13px;font-size:13px}',
    '@media(max-width:560px){#view-opp #' + ID + ' td.acts{white-space:normal}#view-opp #' + ID + ' td.acts .st-mini{margin:2px 2px 2px 0}}'
  ].join('\n');

  function mountCss() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style'); s.id = STYLE_ID; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function html() {
    const d = diag();
    const chips = [
      '<span class="st-chip" title="screen.width × screen.height">📐 Skjár ' + esc(d.screen) + ' dp</span>',
      '<span class="st-chip' + (d.desktopMode ? ' warn' : '') + '" title="innerWidth × innerHeight (CSS-px)">🖥 Síða ' + esc(d.layout) + ' px' + (d.desktopMode ? ' · Tölvusíðu-hamur' : '') + '</span>',
      '<span class="st-chip' + (d.krom !== 1 ? ' ok' : '') + '">🔍 Króm ×' + fmtNum(d.krom) + (d.manual != null ? ' (handstillt)' : ' (sjálfvirkt)') + '</span>',
      '<span class="st-chip">🔎 Zoom ' + Math.round(d.zoom * 100) + ' %</span>',
      '<span class="st-chip' + (d.standalone ? ' ok' : '') + '">' + (d.standalone ? '📲 Uppsett app · ' + esc(d.key) : '🌐 Í vafra') + '</span>',
      '<span class="st-chip" title="commit · tími">🏷 ' + esc(d.build) + '</span>',
      '<span class="st-chip' + (d.sw ? ' ok' : ' warn') + '">' + (d.sw ? '⚙ SW virkur' : '⚙ SW enginn') + '</span>'
    ].join('');
    const note = d.desktopMode
      ? '<div class="st-note">⚠ Chrome sýnir þessa síðu í <b>Tölvusíðu-ham</b> (síðan er ' + esc(d.layout.split('×')[0]) + ' px breið á ' + esc(d.screen.split('×')[0]) + ' dp skjá). Krómið (haus, ☰, botnstika) er skalað á móti ×' + fmtNum(d.auto) + '. Viljirðu símaútlitið: <b>⋮ → taka hakið af „Tölvusíða"</b>.</div>'
      : '';
    const kromSel = d.manual != null ? String(d.manual) : 'auto';
    const kromSeg = '<div class="st-seg">' + KROM.map(([v, l]) => '<button type="button" data-krom="' + v + '" class="' + (String(v) === kromSel || (kromSel !== 'auto' && +v === +kromSel) ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
    const zoomSeg = '<div class="st-seg"><button type="button" data-zoom="out">−</button><button type="button" class="on">' + Math.round(d.zoom * 100) + ' %</button><button type="button" data-zoom="in">+</button><button type="button" data-zoom="reset">1:1</button></div>';
    const rows = apps().map(a => {
      const [cls, txt] = installedStatus(a, d);
      const c = state.checks[a.key];
      return '<tr><td class="nm">' + esc(a.name) + '<small>/app/' + esc(a.key) + '/ · ' + (a.custom ? 'notenda-búið' : 'innbyggt') + '</small></td>' +
        '<td><span class="st-' + cls + '">' + esc(txt) + '</span>' + (c ? '<br><span class="' + (c.ok ? 'st-ok' : 'st-bad') + '">' + esc(c.text) + '</span>' : '') + '</td>' +
        '<td class="acts"><button type="button" class="st-mini" data-open="' + esc(a.key) + '">▶ Opna</button> <button type="button" class="st-mini" data-inst="' + esc(a.key) + '">⤓ Setja upp</button></td></tr>';
    }).join('');
    const relLine = state.related
      ? (state.related.length ? '' : '<div class="st-msg">Chrome skráir ekkert innbyggt app uppsett á þessu tæki (getInstalledRelatedApps).</div>')
      : (state.relatedErr ? '<div class="st-msg">Staðfesting uppsetninga: ' + esc(state.relatedErr) + '</div>' : '');
    return '<div class="st-h"><div class="st-t">🎛 Stýriborð</div>' +
      '<button type="button" class="op-btn" data-act="check"' + (state.busy ? ' disabled' : '') + '>🔎 Athuga öpp</button>' +
      '<button type="button" class="op-btn" data-act="copy">📋 Afrita greiningu</button></div>' +
      '<div class="st-sec">Tæki og útgáfa</div><div class="st-chips">' + chips + '</div>' + note +
      '<div class="st-sec">Króm-stærð (haus · ☰ · botnstika · zoom-stika)</div>' + kromSeg +
      '<div class="st-sec">Síðuzoom (efnið)</div>' + zoomSeg +
      '<div class="st-sec">Öpp á þessu tæki</div><table><tbody>' + (rows || '<tr><td>Engin öpp fundust á síðunni.</td></tr>') + '</tbody></table>' + relLine +
      '<div class="st-sec">Aðgerðir</div><div class="st-row">' +
      '<button type="button" class="op-btn" data-act="reload">🔄 Endurhlaða</button>' +
      '<button type="button" class="op-btn" data-act="clear">🧹 Hreinsa skyndiminni + SW</button></div>' +
      (state.msg ? '<div class="st-msg">' + esc(state.msg) + '</div>' : '');
  }

  function wire(p) {
    p.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !p.contains(b)) return;
      e.preventDefault();
      if (b.dataset.krom != null) { try { window.AppKrom && AppKrom.set(b.dataset.krom === 'auto' ? 'auto' : +b.dataset.krom); } catch (_) {} render(); return; }
      if (b.dataset.zoom) { try { if (window.AppPageZoom) AppPageZoom.set(b.dataset.zoom === 'reset' ? 1 : zoomStep(b.dataset.zoom === 'in' ? 1 : -1)); } catch (_) {} setTimeout(render, 120); return; }
      if (b.dataset.open) { location.href = location.origin + '/app/' + b.dataset.open + '/'; return; }
      if (b.dataset.inst) { location.href = location.origin + '/app/' + b.dataset.inst + '/?install=1'; return; }
      if (b.dataset.act === 'check') { checkAll(); return; }
      if (b.dataset.act === 'copy') { afrita(); return; }
      if (b.dataset.act === 'reload') { location.reload(); return; }
      if (b.dataset.act === 'clear') { hreinsa(); return; }
    });
  }

  function panel() { return document.getElementById(ID); }
  function render() {
    const p = panel(); if (!p) return;
    try { p.innerHTML = html(); } catch (_) {}
  }
  function ensure() {
    const main = document.querySelector('#view-opp .op-main'); if (!main) return;
    if (panel()) return;
    mountCss();
    const p = document.createElement('div');
    p.id = ID; p.className = 'op-card';
    const sub = main.querySelector('.op-sub');
    if (sub && sub.parentNode === main) sub.insertAdjacentElement('afterend', p); else main.insertAdjacentElement('afterbegin', p);
    wire(p);
    render();
    // Staðfesting uppsetninga í bakgrunni (kostar ekkert) — manifest-athugun er handvirk.
    try {
      if (navigator.getInstalledRelatedApps && state.related == null) {
        navigator.getInstalledRelatedApps().then(rel => { state.related = (rel || []).map(r => ({ id: r.id || '', url: r.url || '', platform: r.platform || '' })); render(); }, e => { state.relatedErr = String(e && e.message || e); });
      }
    } catch (_) {}
  }

  let _t = null;
  function schedule() { clearTimeout(_t); _t = setTimeout(ensure, 60); }
  function boot() {
    ensure();
    const v = document.getElementById('view-opp');
    if (v && !v.__styri354) {
      v.__styri354 = true;
      try { new MutationObserver(schedule).observe(v, { childList: true }); } catch (_) {}
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  [300, 1200, 3000].forEach(ms => setTimeout(boot, ms));
  window.addEventListener('hashchange', () => setTimeout(boot, 80));
  // Lifandi flögur (zoom-stikan, snúningur) meðan spjaldið sést — ódýrt.
  let _sig = '';
  setInterval(() => {
    const p = panel(); if (!p || !p.isConnected) return;
    const v = document.getElementById('view-opp'); if (!v || !v.classList.contains('active')) return;
    const d = diag(); const sig = [d.layout, d.krom, d.zoom, d.sw, d.online].join('|');
    if (sig !== _sig) { _sig = sig; render(); }
  }, 2000);

  window.OppStyribord = { render, ensure, check: checkAll, diag, version: '354' };
  console.log('[patch-354] öpp stýriborð');
})();
/* === END ÖPP STÝRIBORÐ === */
