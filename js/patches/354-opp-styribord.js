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
  // 17.09.2026 (yfirferð á þöglum villum): þagnirnar hér eru RÉTTAR — báðar
  // hreinsanir eru best-effort og línan á eftir endurhleður síðuna hvort eð er
  // með ?nocache=<tími>, sem framhjá-hleður skyndiminninu. Mistakist önnur
  // hvor fær notandinn samt ferska síðu; ekkert tapast.
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
    const done = () => { state.msg = 'Greining afrituð'; render(); };
    try { navigator.clipboard.writeText(txt).then(done, () => { state.msg = txt; render(); }); } catch (_) { state.msg = txt; render(); }
  }

  /* ── teikning ───────────────────────────────────────────────────────────── */
  // 01.10.2026 (B48): Brunastál C — málmhaus með hnoðum, silfur-merki, rauður valinn hnappur, línutákn í stað emoji.
  const MONO = '"JetBrains Mono",ui-monospace,monospace', SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif', DISP = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const MBTN = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
  const RAUTT = 'linear-gradient(180deg,#c22f26 0%,#951818 50%,#650c0d 100%)';
  const svg = d => '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const IK = {
    leita: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
    afrita: svg('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>'),
    endur: svg('<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>'),
    hreinsa: svg('<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>'),
    opna: svg('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>'),
    nidur: svg('<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>'),
    simi: svg('<rect x="7" y="2.5" width="10" height="19" rx="2.2"/><path d="M11 18.5h2"/>')
  };
  const CSS = [
    '#view-opp #' + ID + '{padding:14px 14px 12px}',
    '#view-opp #' + ID + ' .st-h{position:relative;display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;padding:11px 12px 11px 32px;background:' + METAL + ';border:1px solid #000;border-radius:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 1px 2px rgba(0,0,0,.4)}',
    '#view-opp #' + ID + ' .st-h::before{content:"";position:absolute;left:12px;top:10px;width:7px;height:7px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.6)}',
    '#view-opp #' + ID + ' .st-h::after{content:"";position:absolute;left:12px;bottom:10px;width:7px;height:7px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.6)}',
    '#view-opp #' + ID + ' .st-t{margin-right:auto;min-width:0}',
    '#view-opp #' + ID + ' .st-t small{display:block;font-family:' + MONO + ';font-size:9.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#aab1bb!important}',
    '#view-opp #' + ID + ' .st-t strong{display:block;font-family:' + DISP + ';font-size:20px;font-weight:800;color:#fff;line-height:1.15;margin-top:2px;text-shadow:0 1px 0 rgba(0,0,0,.6)}',
    '#view-opp #' + ID + ' .st-h .op-btn{background:' + MBTN + ' !important;border:1px solid #000 !important;color:#e3e7ee !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 1px 2px rgba(0,0,0,.5) !important}',
    '#view-opp #' + ID + ' .st-h .op-btn svg{color:#c9ced6}',
    '#view-opp #' + ID + ' .st-h .op-btn:hover{color:#fff !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 0 1px rgba(224,96,90,.55) !important}',
    '#view-opp #' + ID + ' .st-sec{font-family:' + MONO + ';font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#5b6370;margin:14px 0 6px}',
    '#view-opp #' + ID + ' .st-chips{display:flex;flex-wrap:wrap;gap:6px}',
    '#view-opp #' + ID + ' .st-chip{display:inline-flex;align-items:baseline;gap:6px;font-family:' + SANS + ';font-size:12.5px;font-weight:600;color:#1c2028;background:' + SILVER + ';border:1px solid rgba(20,24,34,.22);border-radius:6px;padding:5px 9px;line-height:1.2;box-shadow:inset 0 1px 0 #fff}',
    '#view-opp #' + ID + ' .st-chip small{font-family:' + MONO + ';font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#6b7380}',
    '#view-opp #' + ID + ' .st-chip.warn{border-color:rgba(179,38,30,.5);color:#8a1414}',
    '#view-opp #' + ID + ' .st-chip.warn small{color:#b3261e}',
    '#view-opp #' + ID + ' .st-chip.ok{border-color:rgba(29,90,51,.45);color:#1d5a33}',
    '#view-opp #' + ID + ' .st-chip.ok small{color:#2f7a4b}',
    '#view-opp #' + ID + ' .st-note{font-size:12.5px;color:#1c2028;background:#fff;border:1px solid rgba(20,24,34,.16);border-left:3px solid #b3261e;border-radius:7px;padding:8px 10px;margin-top:8px;line-height:1.45}',
    '#view-opp #' + ID + ' .st-seg{display:inline-flex;flex-wrap:wrap;gap:3px;background:#c9ced6;border:1px solid rgba(20,24,34,.25);border-radius:8px;padding:3px;box-shadow:inset 0 1px 3px rgba(0,0,0,.18)}',
    '#view-opp #' + ID + ' .st-seg button{font-family:' + MONO + ' !important;font-size:12.5px;font-weight:700;min-height:38px;min-width:44px;padding:0 12px;border:1px solid transparent !important;border-radius:6px !important;background:transparent !important;color:#2a2f37 !important;box-shadow:none !important;text-shadow:none !important;cursor:pointer}',
    '#view-opp #' + ID + ' .st-seg button:hover{background:rgba(255,255,255,.55) !important}',
    '#view-opp #' + ID + ' .st-seg button.on{background:' + RAUTT + ' !important;border-color:#2a0303 !important;color:#fff !important;text-shadow:0 1px 1px rgba(0,0,0,.55) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 1px 2px rgba(0,0,0,.3) !important}',
    '#view-opp #' + ID + ' .st-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:6px}',
    /* öpp-listinn: staflað (nafn · staða · takkar) — tafla var of breið á 375px */
    '#view-opp #' + ID + ' .st-apps{display:flex;flex-direction:column;gap:6px}',
    '#view-opp #' + ID + ' .st-app{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:center;padding:8px 10px;border:1px solid rgba(20,24,34,.14);border-radius:8px;background:rgba(255,255,255,.72)}',
    '#view-opp #' + ID + ' .st-app .nm{font-size:14px;font-weight:700;color:#1c2028;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#view-opp #' + ID + ' .st-app .nm small{font-family:' + MONO + ';font-weight:600;color:#6b7380;font-size:9px;letter-spacing:.12em;text-transform:uppercase;margin-left:8px}',
    '#view-opp #' + ID + ' .st-app .acts{display:flex;gap:4px;grid-row:span 2}',
    '#view-opp #' + ID + ' .st-app .stat{grid-column:1;font-size:12.5px;line-height:1.35;min-width:0;word-break:break-word}',
    '#view-opp #' + ID + ' .st-ok{color:#1d5a33;font-weight:700}',
    '#view-opp #' + ID + ' .st-no{color:#4a515c}',
    '#view-opp #' + ID + ' .st-unk{color:#6b7380}',
    '#view-opp #' + ID + ' .st-bad{color:#8a1414;font-weight:700}',
    '#view-opp #' + ID + ' .st-mini{width:40px;height:40px;padding:0 !important;border-radius:7px !important;border:1px solid rgba(20,24,34,.28) !important;background:' + SILVER + ' !important;color:#1c2028 !important;box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.12) !important;text-shadow:none !important;cursor:pointer;flex:none;display:inline-flex !important;align-items:center;justify-content:center}',
    '#view-opp #' + ID + ' .st-mini svg{width:16px;height:16px}',
    '#view-opp #' + ID + ' .st-mini[data-open]{color:#b3261e !important}',
    /* B48 sími: titill fær heila línu, takkarnir deila næstu; Króm-röðin kemst í eina línu á 375 */
    '@media (max-width:600px){#view-opp #' + ID + ' .st-t{flex:1 1 100%}#view-opp #' + ID + ' .st-h .op-btn{flex:1 1 0;justify-content:center;min-width:0}#view-opp #' + ID + ' .st-seg button{min-width:38px;padding:0 8px}}',
    '#view-opp #' + ID + ' .st-msg{font-size:12.5px;color:#2a2f37;margin-top:10px;white-space:pre-wrap;word-break:break-word}',
    '#view-opp #' + ID + ' .op-btn{min-height:40px;padding:0 13px;font-size:13px}'
  ].join('\n');

  function mountCss() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style'); s.id = STYLE_ID; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function html() {
    const d = diag();
    const chips = [
      '<span class="st-chip" title="screen.width × screen.height"><small>Skjár</small>' + esc(d.screen) + ' dp</span>',
      '<span class="st-chip' + (d.desktopMode ? ' warn' : '') + '" title="innerWidth × innerHeight (CSS-px)"><small>Síða</small>' + esc(d.layout) + ' px' + (d.desktopMode ? ' · Tölvusíðu-hamur' : '') + '</span>',
      '<span class="st-chip' + (d.krom !== 1 ? ' ok' : '') + '"><small>Króm</small>×' + fmtNum(d.krom) + (d.manual != null ? ' (handstillt)' : ' (sjálfvirkt)') + '</span>',
      '<span class="st-chip"><small>Zoom</small>' + Math.round(d.zoom * 100) + ' %</span>',
      '<span class="st-chip' + (d.standalone ? ' ok' : '') + '">' + (d.standalone ? '<small>Uppsett app</small>' + esc(d.key) : '<small>Keyrsla</small>Í vafra') + '</span>',
      '<span class="st-chip" title="commit · tími"><small>Útgáfa</small>' + esc(d.build) + '</span>',
      '<span class="st-chip' + (d.sw ? ' ok' : ' warn') + '">' + (d.sw ? '<small>SW</small>virkur' : '<small>SW</small>enginn') + '</span>'
    ].join('');
    const note = d.desktopMode
      ? '<div class="st-note">Chrome sýnir þessa síðu í <b>Tölvusíðu-ham</b> (síðan er ' + esc(d.layout.split('×')[0]) + ' px breið á ' + esc(d.screen.split('×')[0]) + ' dp skjá). Krómið (haus, valmynd, botnstika) er skalað á móti ×' + fmtNum(d.auto) + '. Viljirðu símaútlitið: <b>⋮ → taka hakið af „Tölvusíða"</b>.</div>'
      : '';
    const kromSel = d.manual != null ? String(d.manual) : 'auto';
    const kromSeg = '<div class="st-seg">' + KROM.map(([v, l]) => '<button type="button" data-krom="' + v + '" class="' + (String(v) === kromSel || (kromSel !== 'auto' && +v === +kromSel) ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
    // 04.10.2026: síðustærð er stillt fyrir HVERJA síðu (333) — litaspjaldið í app-hausnum → Stærð, eða S26-ramminn á tölvunni.
    const vist = (window.AppPageZoom && AppPageZoom.stillingar) ? Object.keys(AppPageZoom.stillingar()).length : 0;
    const zoomSeg = '<div class="st-note">Hver síða á sína stærð, vistaða á þjóninn (sími og tölva hvor í sínu hólfi). '
      + 'Í appinu: <b>litaspjaldið í hausnum → Stærð</b>. Á tölvunni: <b>' + IK.simi + ' S26</b> við hvert app opnar það í S26-ramma '
      + 'sem sýnir nákvæmlega það sem síminn sýnir — það sem þú stillir þar gildir í símanum. Vistaðar síður hér: <b>' + vist + '</b>.</div>';
    const rows = apps().map(a => {
      const [cls, txt] = installedStatus(a, d);
      const c = state.checks[a.key];
      return '<div class="st-app">' +
        '<div class="nm" title="/app/' + esc(a.key) + '/">' + esc(a.name) + '<small>' + (a.custom ? 'notenda-búið' : 'innbyggt') + '</small></div>' +
        '<div class="acts"><button type="button" class="st-mini" data-s26="' + esc(a.key) + '" title="Opna í S26-ramma (stilla stærð hverrar síðu á tölvunni)">' + IK.simi + '</button><button type="button" class="st-mini" data-open="' + esc(a.key) + '" title="Opna">' + IK.opna + '</button><button type="button" class="st-mini" data-inst="' + esc(a.key) + '" title="Setja upp í síma">' + IK.nidur + '</button></div>' +
        '<div class="stat"><span class="st-' + cls + '">' + esc(txt) + '</span>' + (c ? '<br><span class="' + (c.ok ? 'st-ok' : 'st-bad') + '">' + esc(c.text) + '</span>' : '') + '</div>' +
        '</div>';
    }).join('');
    const relLine = state.related
      ? (state.related.length ? '' : '<div class="st-msg">Chrome skráir ekkert innbyggt app uppsett á þessu tæki (getInstalledRelatedApps).</div>')
      : (state.relatedErr ? '<div class="st-msg">Staðfesting uppsetninga: ' + esc(state.relatedErr) + '</div>' : '');
    return '<div class="st-h"><div class="st-t"><small>Öpp · tæki og útgáfa</small><strong>Stýriborð</strong></div>' +
      '<button type="button" class="op-btn" data-act="check"' + (state.busy ? ' disabled' : '') + '>' + IK.leita + 'Athuga öpp</button>' +
      '<button type="button" class="op-btn" data-act="copy">' + IK.afrita + 'Afrita greiningu</button></div>' +
      '<div class="st-sec">Tæki og útgáfa</div><div class="st-chips">' + chips + '</div>' + note +
      '<div class="st-sec">Króm-stærð (haus · valmynd · botnstika · zoom-stika)</div>' + kromSeg +
      '<div class="st-sec">Síðustærð (hver síða)</div>' + zoomSeg +
      '<div class="st-sec">Öpp á þessu tæki</div><div class="st-apps">' + (rows || '<div class="st-msg">Engin öpp fundust á síðunni.</div>') + '</div>' + relLine +
      '<div class="st-sec">Aðgerðir</div><div class="st-row">' +
      '<button type="button" class="op-btn" data-act="reload">' + IK.endur + 'Endurhlaða</button>' +
      '<button type="button" class="op-btn" data-act="clear">' + IK.hreinsa + 'Hreinsa skyndiminni + SW</button></div>' +
      (state.msg ? '<div class="st-msg">' + esc(state.msg) + '</div>' : '');
  }

  function wire(p) {
    p.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !p.contains(b)) return;
      e.preventDefault();
      if (b.dataset.krom != null) { try { window.AppKrom && AppKrom.set(b.dataset.krom === 'auto' ? 'auto' : +b.dataset.krom); } catch (_) {} render(); return; }
      if (b.dataset.s26) {
        const k = b.dataset.s26, nm = (apps().find(x => x.key === k) || {}).name || k;
        try { if (window.SlokkDevFrame) { SlokkDevFrame.open('s26', { url: location.origin + '/?app=' + encodeURIComponent(k) + '&devframe=s26', title: nm + ' · S26' }); return; } } catch (_) {}
        return;
      }
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
      // 26.09.2026 (hopp 0,57): 60 ms bið lét spjöldin mála fyrst og stýriborðið ýtti þeim svo niður. Óinngjafaða vaktin
      // setur það inn í sama verki og sýnin teiknast (ensure er einnar-ferðar: hættir strax sé spjaldið til).
      try { new (window.__NativeMutationObserver || MutationObserver)(() => { try { ensure(); } catch (_) {} }).observe(v, { childList: true, subtree: true }); } catch (_) {}
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
