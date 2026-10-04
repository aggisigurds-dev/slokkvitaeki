/* === SÍÐUSTÆRÐ — hver síða á sína stærð í síma, vistuð á þjóninum (333) =====
 *
 * SAGA (stutt): 29.08–01.09.2026 voru −/+ fyrst viewport initial-scale (sama vél
 * og fingraklípan) og síðan CSS zoom á `.view.active` (efnið eitt, aldrei html —
 * html-zoom skildi eftir dauðan beige „frímerkis"-viewport). 26.09: grunnstækkun
 * á ÞjónustuVerkstæði (1,6). Klípan er áfram ósnert og sér um stækkunarglerið.
 *
 * 04.10.2026 — Agnar: „Þetta er búið að vera alveg endalaust vandamál. Er hægt að
 * setja einhvers konar stillingar svo ég geti stillt hverja síðu af og vistað" ·
 * „Kröfuyfirlit er nokkuð fínt" · „Teikningar lélegar" · „færa zoom takkann alveg
 * efst … sameinast hinu í header … setja inn í Stilla útlit. Default zoom per page"
 * · „sé samt alveg sér fyrir mobile view … að aðal desktop version fari ekki í rugl".
 *
 *   1. EIN tala fyrir allar síður dugði aldrei. Hver síða (og hver gluggi) á nú
 *      sína stærð. Talan er HLUTFALL AF RAUNSTÆRÐ — 100 % = letur eins og í
 *      venjulegu síma-appi — óháð Tölvusíðu-ham Chrome: virkt zoom = króm-
 *      hlutfall (353, ≈2,4 á S26) × talan. Sama tala gefur því sama útlit í
 *      símanum og í S26-rammanum á tölvunni (320).
 *   2. Vistað á þjóninn: AppSettings `simi_sidustaerd` = { simi:{<lykill>:{s,n,t}},
 *      tolva:{…} }. Sími og tölva hvor í sínu hólfi; tölvan les aldrei símahólfið.
 *      Venjuleg tölvusýn (ekki app, ekki Sími-hamur) fær ALDREI zoom.
 *   3. Síða sem hefur ekki verið stillt heldur gömlu stærðinni (staðbundna talan
 *      `app_page_zoom` × grunnur) — Kröfuyfirlit breytist ekki.
 *   4. Gluggar (.modal) fá eigin lykil (m:<id>) og eigið zoom. Teikningar
 *      (#modal-floorplan) lágu UTAN .view svo 160 % náði aldrei til þeirra. Í
 *      appham fær opinn gluggi ramma undir hausnum og yfir botnstikunni — haus
 *      gluggans (titill, Vista, ✕) lá áður undir app-hausnum.
 *   5. Fljótandi −/+ / 1:1 stikan er farin. 🎨 í app-hausnum (261) opnar
 *      „Stærð og útlit" — símavænt blað efst. Utan apps (Sími-hamur í vafra)
 *      opnar lítill „Aa"-hnappur efst til hægri sama blað.
 *
 * API (óbreytt fyrir 331/334/353/354): AppPageZoom.get() = virkt zoom (1 = ekkert),
 * set(z) = virkt zoom fyrir núverandi síðu (vistað). Nýtt: getS/setS (hlutfall af
 * raunstærð), opna/loka (blaðið), lykill(), stillingar().
 *
 * Aðeins útlit. 153/187-reikningur ÓSNERTUR.
 * ========================================================================== */
(() => {
  if (window.__appPageZoom333) return;
  window.__appPageZoom333 = true;

  const LS = 'app_page_zoom';              // gamla staðbundna talan — síður sem hafa ekki verið stilltar
  const KEY = 'simi_sidustaerd';           // AppSettings-lykillinn (þjónninn)
  const AA_ID = '_sz-aa';
  const PNL_ID = '_sz-pnl';
  const STYLE_ID = 'app-page-zoom-333';
  const SMIN = 0.3, SMAX = 1.6, SKREF = 0.05;
  const FORSTILLT = [0.5, 0.6, 0.7, 0.85, 1];
  const HUB_VP = 'width=device-width, initial-scale=1, user-scalable=yes, viewport-fit=cover';
  const GRUNNUR = { 'view-thjonustu-verkstaedi': 1.6 };        // 26.09: eldri grunnstækkun (óstillt síða)
  // Byrjunarstærð (Agnar 04.10: „reyna að stilla þetta fyrst svo ég geti bara fínpússað") — aðeins í Tölvusíðu-ham
  // (króm > 1,2). Valið með yfirferð í S26-hermun (42/60/80/100 %): miðgildi leturs ≈ 10–11 dp án útflæðis.
  // Kröfuyfirlit („nokkuð fínt"), Ársskoðun (eigin Sími-hamur) og Brunahólf-iframe-síður halda gömlu stærðinni.
  const BYRJUN = {
    company: 0.7, 'm:modal-floorplan': 0.7,
    hreyfingarlisti: 0.85, thjonustuverk: 0.85, sala: 0.85,
    'thjonustu-verkstaedi': 0.8, rekstrarfelog: 0.8, kostnadur: 0.75
  };
  const NOFN = { company: 'Fyrirtækjasíða', 'm:modal-floorplan': 'Teikningar' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const r2 = n => Math.round(n * 100) / 100;
  const klemma = s => { s = +s; if (!isFinite(s)) s = 1; return r2(Math.min(SMAX, Math.max(SMIN, s))); };

  /* ── gamla staðbundna talan ─────────────────────────────────────────────── */
  try {
    if (!localStorage.getItem('app_page_zoom_grunnur_v1')) {
      localStorage.setItem('app_page_zoom_grunnur_v1', '1');
      const z = parseFloat(localStorage.getItem(LS) || '');
      if (Math.abs(z - 1.6) < 0.01) localStorage.setItem(LS, '1');
    }
  } catch (_) {}
  function gamla() {
    try {
      const z = parseFloat(localStorage.getItem(LS) || '');
      if (z >= 0.7 && z <= 2) return z;
    } catch (_) {}
    return 1;
  }

  /* ── umhverfi ───────────────────────────────────────────────────────────── */
  const C = () => { try { const c = window.AppKrom && AppKrom.get(); return c > 0 ? c : 1; } catch (_) { return 1; } };
  function erApp() { return !!(document.body && document.body.classList.contains('appmode')); }
  function virkt() { return erApp() || document.documentElement.getAttribute('data-viewmode') === 'mobile'; }
  function grofur() { try { return !!(window.matchMedia && matchMedia('(pointer: coarse)').matches); } catch (_) { return false; } }
  // Sími = snertitæki eða króm-skalað (Tölvusíðu-hamur / S26-ramminn). Tölva = allt annað.
  function flokkur() { return (C() > 1 || grofur()) ? 'simi' : 'tolva'; }
  function synilegt(el) {
    if (!el || !el.isConnected) return false;
    try { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length > 0; } catch (_) { return false; }
  }

  /* ── lyklar ─────────────────────────────────────────────────────────────── */
  function gluggi() {
    try {
      const st = (window.Modal && Array.isArray(Modal.stack)) ? Modal.stack : [];
      for (let i = st.length - 1; i >= 0; i--) {
        const m = document.getElementById(st[i]);
        if (m && m.classList.contains('open') && synilegt(m)) return m;
      }
      const opnir = [...document.querySelectorAll('.modal.open[id]')].filter(synilegt);
      return opnir.length ? opnir[opnir.length - 1] : null;
    } catch (_) { return null; }
  }
  function siduLykill() {
    if (erApp()) {
      const f = document.getElementById('_app-frame');
      if (synilegt(f)) {
        const t = document.querySelector('#_app-nav ._app-tab.on');
        if (t && t.dataset.k) return 'f:' + t.dataset.k;
      }
    }
    const h = (location.hash || '').replace(/^#\/?/, '').split(/[\/?&=]/)[0];
    if (h) return h;
    const v = document.querySelector('.view.active');
    return v ? v.id.replace(/^view-/, '') : 'heim';
  }
  function nafn(k, el) {
    if (NOFN[k]) return NOFN[k];
    if (k.indexOf('m:') === 0) {
      const h = el && el.querySelector('.modal-hd h2, .modal-hd h3, h2');
      const t = h ? h.textContent.replace(/\s+/g, ' ').trim() : '';
      return (t.split(/\s[—–-]\s/)[0] || k.slice(2)).slice(0, 40);
    }
    try {
      const p = window.AppProfiles && AppProfiles.pageByKey(k.replace(/^f:/, ''));
      if (p) return p.label;
    } catch (_) {}
    return k;
  }

  /* ── stillingar (þjónninn + óvistað á leiðinni) ─────────────────────────── */
  const bida = { simi: {}, tolva: {} };      // vistun á leið til þjónsins
  function stillingar() {
    let s = null;
    try { s = window.AppSettings && AppSettings.get(KEY); } catch (_) {}
    const o = { simi: {}, tolva: {} };
    ['simi', 'tolva'].forEach(fl => {
      const a = (s && s[fl] && typeof s[fl] === 'object') ? s[fl] : {};
      Object.keys(a).forEach(k => { if (a[k] && isFinite(a[k].s)) o[fl][k] = a[k]; });
      Object.keys(bida[fl]).forEach(k => { if (bida[fl][k] === null) delete o[fl][k]; else o[fl][k] = bida[fl][k]; });
    });
    return o;
  }
  let prufaS = null;      // AppPageZoom.prufa(s): sýna stærð án þess að vista (yfirferð / samanburður)
  // { s, uppruni: 'vistad' | 'byrjun' | 'gamalt' | 'prufa' }
  function staerd(k, erGluggi, viewId) {
    if (prufaS != null) return { s: prufaS, uppruni: 'prufa' };
    const v = stillingar()[flokkur()][k];
    if (v) return { s: klemma(v.s), uppruni: 'vistad' };
    const c = C();
    if (BYRJUN[k] && c >= 1.2) return { s: BYRJUN[k], uppruni: 'byrjun' };
    const e = erGluggi ? 1 : gamla() * (GRUNNUR[viewId] || 1);
    return { s: r2(e / c), uppruni: 'gamalt' };
  }

  /* ── beiting ────────────────────────────────────────────────────────────── */
  let nu = { k: 'heim', s: 1, uppruni: 'gamalt', el: null, gluggi: false, virkt: 1 };
  let sidustaerd = 1;     // virkt zoom síðunnar (get())

  function vpEl() {
    let vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement('meta');
      vp.setAttribute('name', 'viewport');
      (document.head || document.documentElement).appendChild(vp);
    }
    return vp;
  }
  function syncViewport() {
    try { const vp = vpEl(); if (vp.getAttribute('content') !== HUB_VP) vp.setAttribute('content', HUB_VP); } catch (_) {}
  }
  function clearCssZoom() {
    const nodes = [document.documentElement];
    if (document.body) nodes.push(document.body);
    nodes.forEach(n => { try { if (n.style.zoom) n.style.removeProperty('zoom'); } catch (_) {} });
  }
  function setVar(n, v) {
    const h = document.documentElement;
    if (h.style.getPropertyValue(n) !== v) h.style.setProperty(n, v);
  }

  function apply() {
    const html = document.documentElement;
    const on = virkt();
    const c = C();
    const view = document.querySelector('.view.active');
    const vk = siduLykill();
    const vs = staerd(vk, false, view && view.id);
    const ve = on ? r2(c * vs.s) : 1;
    const breytt = ve !== sidustaerd;
    sidustaerd = ve;
    try {
      setVar('--app-page-zoom', String(ve));
      if (html.classList.contains('app-page-zoomed') !== (ve !== 1)) html.classList.toggle('app-page-zoomed', ve !== 1);
    } catch (_) {}

    const g = on ? gluggi() : null;
    document.querySelectorAll('.modal._sz-m').forEach(m => { if (m !== g) m.classList.remove('_sz-m', '_sz-full'); });
    if (g) {
      const gk = 'm:' + g.id;
      const gs = staerd(gk, true);
      const ge = r2(c * gs.s);
      setVar('--app-modal-zoom', String(ge));
      if (!g.classList.contains('_sz-m')) g.classList.add('_sz-m');
      if (erApp()) {
        // Raunpixlar króms (zoom er inni í getBoundingClientRect) — glugginn deilir með eigin zoomi í CSS.
        const hr = document.getElementById('_app-hdr'), nr = document.getElementById('_app-nav');
        const top = synilegt(hr) ? Math.round(hr.getBoundingClientRect().bottom) : 0;
        const bot = (synilegt(nr) && !document.body.classList.contains('appmode-nonav')) ? Math.round(window.innerHeight - nr.getBoundingClientRect().top) : 0;
        setVar('--sz-top', Math.max(0, top) + 'px');
        setVar('--sz-bot', Math.max(0, bot) + 'px');
        if (!g.classList.contains('_sz-full')) g.classList.add('_sz-full');
      } else if (g.classList.contains('_sz-full')) g.classList.remove('_sz-full');
      nu = { k: gk, s: gs.s, uppruni: gs.uppruni, el: g, gluggi: true, virkt: ge };
    } else {
      nu = { k: vk, s: vs.s, uppruni: vs.uppruni, el: view, gluggi: false, virkt: ve };
    }
    clearCssZoom();
    syncViewport();
    syncAa();
    teiknaBlad(false);
    if (breytt) { try { if (window.AppKrom && AppKrom.measure) { AppKrom.measure(); setTimeout(AppKrom.measure, 160); } } catch (_) {} }
  }

  /* ── vistun ─────────────────────────────────────────────────────────────── */
  let _vt = null;
  const _vbid = {};
  function setS(s, k) {
    s = klemma(s);
    k = k || nu.k;
    const fl = flokkur();
    const n = nafn(k, k === nu.k ? nu.el : null);
    const rod = { s, n, t: Date.now() };
    bida[fl][k] = rod;
    _vbid[fl + '\u0001' + k] = rod;
    apply();
    clearTimeout(_vt);
    _vt = setTimeout(vista, 450);
    return s;
  }
  function endurstilla(k) {
    k = k || nu.k;
    const fl = flokkur();
    bida[fl][k] = null;
    _vbid[fl + '\u0001' + k] = null;
    apply();
    clearTimeout(_vt);
    _vt = setTimeout(vista, 150);
  }
  let _vistStada = '';
  async function vista() {
    const lyklar = Object.keys(_vbid);
    if (!lyklar.length) return;
    const patch = {};
    lyklar.forEach(x => {
      const [fl, k] = x.split('\u0001');
      (patch[fl] = patch[fl] || {})[k] = _vbid[x];
      delete _vbid[x];
    });
    _vistStada = 'vista';
    teiknaBlad(false);
    let ok = false;
    try { ok = !!(window.AppSettings && AppSettings.save && await AppSettings.save({ [KEY]: patch })); } catch (_) {}
    if (ok) {
      // Þjónninn geymir nú gildin — hreinsa „á leiðinni" nema nýrri breyting hafi komið á meðan.
      Object.keys(patch).forEach(fl => Object.keys(patch[fl]).forEach(k => {
        if (!((fl + '\u0001' + k) in _vbid)) delete bida[fl][k];
      }));
    }
    _vistStada = ok ? 'vistad' : 'villa';
    teiknaBlad(false);
  }

  /* ── stílar ─────────────────────────────────────────────────────────────── */
  const GULL = '#d9b762', MALMUR = 'linear-gradient(180deg,#2d3037 0%,#1b1d22 55%,#141519 100%)';
  const SILFUR = 'linear-gradient(180deg,#fbfcfd 0%,#e3e7ec 52%,#cdd3da 100%)';
  const MONO = "'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace";
  const DISP = "'Playfair Display',Georgia,serif";
  const SANS = "'IBM Plex Sans',-apple-system,'Segoe UI',Roboto,sans-serif";
  function css() {
    const P = '#' + PNL_ID;
    return [
      'html,body{touch-action:pan-x pan-y pinch-zoom}',
      /* ── EFNIÐ: zoom á .view.active (aldrei html). Breiddin og fyllingin undir föstu
         króminu deilast með zoominu — 261 negldi width:100vw á .view í appham. ── */
      'html.app-page-zoomed body.appmode .view.active,'
        + 'html.app-page-zoomed[data-viewmode="mobile"] .view.active{'
        + 'zoom:var(--app-page-zoom);'
        + 'width:calc(100vw / var(--app-page-zoom))!important;'
        + 'max-width:calc(100vw / var(--app-page-zoom))!important;'
        + 'min-height:calc(100vh / var(--app-page-zoom))}',
      'html.app-page-zoomed body.appmode .view.active{'
        + 'padding-top:calc(50px / var(--app-page-zoom))!important;'
        + 'padding-bottom:calc((140px + env(safe-area-inset-bottom,0px)) / var(--app-page-zoom))!important}',
      'html.app-page-zoomed body.appmode.appmode-nonav .view.active{padding-bottom:calc(24px / var(--app-page-zoom))!important}',
      /* ── GLUGGAR: eigið zoom + rammi undir app-hausnum / yfir botnstikunni.
         .modal ER bakgrunnurinn (inset:0); border-box svo innihaldið lendi milli króms. ── */
      'body.appmode .modal.open._sz-m,html[data-viewmode="mobile"] .modal.open._sz-m{zoom:var(--app-modal-zoom,1)!important}',
      'body.appmode .modal.open._sz-full{box-sizing:border-box!important;'
        + 'border-top:calc(var(--sz-top,0px) / var(--app-modal-zoom,1)) solid transparent!important;'
        + 'border-bottom:calc(var(--sz-bot,0px) / var(--app-modal-zoom,1)) solid transparent!important}',

      /* ── „Aa" utan apps (Sími-hamur í vafra) ── */
      '#' + AA_ID + '{position:fixed;right:8px;top:var(--sz-aa-top,8px);z-index:2147483600;display:none;'
        + 'min-width:38px;height:30px;padding:0 9px;border-radius:8px;border:1px solid #000;background:' + MALMUR + ';color:' + GULL + ';'
        + 'font:700 13px/28px ' + DISP + ';letter-spacing:.02em;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 4px 12px -6px rgba(0,0,0,.6);touch-action:manipulation}',
      '#' + AA_ID + '.synt{display:block}',

      /* ── BLAÐIÐ ── */
      P + '{position:fixed;right:8px;top:var(--sz-pnl-top,56px);z-index:2147483601;box-sizing:border-box;'
        + 'width:min(312px,calc(100vw / var(--app-krom-zoom,1) - 16px));max-height:calc(100vh / var(--app-krom-zoom,1) - var(--sz-pnl-top,56px) - 12px);overflow:auto;'
        + 'border-radius:12px;border:1px solid #000;background:' + MALMUR + ';color:#eef0f3;'
        + 'box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 22px 50px -18px rgba(0,0,0,.75);font-family:' + SANS + ';-webkit-tap-highlight-color:transparent}',
      P + '[hidden]{display:none!important}',
      P + ' .sz-hd{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 12px;border-bottom:1px solid rgba(217,183,98,.35)}',
      P + ' .sz-lbl{font:600 10px ' + MONO + ';letter-spacing:.18em;text-transform:uppercase;color:' + GULL + ';white-space:nowrap}',
      P + ' .sz-nm{flex:1;min-width:0;font:700 14px ' + DISP + ';color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      P + ' button{font-family:' + SANS + ';cursor:pointer;touch-action:manipulation}',
      P + ' .sz-x{flex:none;width:32px;height:32px;border-radius:8px;border:1px solid #000;background:rgba(255,255,255,.06);color:#cfd3da;font:400 22px/1 ' + SANS + '}',
      P + ' .sz-bd{padding:10px 12px 10px}',
      P + ' .sz-tala{flex:none;min-width:58px;text-align:right;white-space:nowrap}',
      P + ' .sz-pct{font:800 24px/1 ' + DISP + ';font-variant-numeric:lining-nums tabular-nums;color:#f6e7b8;text-shadow:0 1px 0 #000}',
      P + ' .sz-pc{font:700 13px ' + DISP + ';color:' + GULL + ';margin-left:2px}',
      P + ' .sz-rod{display:flex;align-items:center;gap:8px}',
      P + ' .sz-rod button{flex:none;width:38px;height:38px;border-radius:9px;border:1px solid #000;background:' + SILFUR + ';color:#1f2530;font:700 20px/1 ' + SANS + ';box-shadow:inset 0 1px 0 #fff,0 2px 4px -2px rgba(0,0,0,.6)}',
      P + ' input[type=range]{flex:1;min-width:0;height:28px;accent-color:' + GULL + ';margin:0}',
      P + ' .sz-for{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin:8px 0 0}',
      P + ' .sz-for button{height:32px;border-radius:8px;border:1px solid #000;background:rgba(255,255,255,.07);color:#e7e9ee;font:700 12px ' + MONO + '}',
      P + ' .sz-for button.on{background:' + SILFUR + ';color:#1f2530;box-shadow:inset 0 1px 0 #fff}',
      P + ' .sz-st{display:flex;align-items:center;gap:7px;margin:8px 0 0;font:500 11px/1.35 ' + SANS + ';color:#b9bfc9}',
      P + ' .sz-led{flex:none;width:8px;height:8px;border-radius:50%;background:#59606b}',
      P + ' .sz-led.ok{background:#5bd28a;box-shadow:0 0 6px #5bd28a}',
      P + ' .sz-led.bid{background:' + GULL + ';box-shadow:0 0 6px ' + GULL + '}',
      P + ' .sz-led.villa{background:#e0605a;box-shadow:0 0 6px #e0605a}',
      P + ' .sz-ak{display:flex;gap:6px;margin:8px 0 0}',
      P + ' .sz-ak button{flex:1;height:34px;border-radius:8px;border:1px solid #000;background:' + SILFUR + ';color:#1f2530;font:600 12.5px ' + SANS + ';box-shadow:inset 0 1px 0 #fff}',
      P + ' .sz-ak button:disabled{opacity:.45;cursor:default}',
      P + ' .sz-ak button.sz-dokk{background:rgba(255,255,255,.07);color:#e7e9ee;box-shadow:none}',
      P + ' details{margin:10px 0 0;border-top:1px solid rgba(255,255,255,.09);padding-top:8px}',
      P + ' summary{cursor:pointer;list-style:none;font:600 10px ' + MONO + ';letter-spacing:.16em;text-transform:uppercase;color:' + GULL + '}',
      P + ' summary::-webkit-details-marker{display:none}',
      P + ' summary::before{content:"\\25B8\\2002"}',
      P + ' details[open] summary::before{content:"\\25BE\\2002"}',
      P + ' .sz-li{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.06)}',
      P + ' .sz-li span{flex:1;min-width:0;font:500 13px ' + SANS + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      P + ' .sz-li b{font:700 13px ' + MONO + ';color:#f6e7b8}',
      P + ' .sz-li button{flex:none;width:32px;height:32px;border-radius:8px;border:1px solid #000;background:rgba(255,255,255,.06);color:#cfd3da;font:400 18px/1 ' + SANS + '}',
      P + ' .sz-tomt{font:500 12px ' + SANS + ';color:#8d95a1;padding:6px 0}'
    ].join('\n');
  }
  function mountCss() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    const t = css();
    if (s.textContent !== t) s.textContent = t;
  }

  /* ── „Aa" utan apps ─────────────────────────────────────────────────────── */
  function syncAa() {
    if (!document.body) return;
    let aa = document.getElementById(AA_ID);
    const syna = virkt() && !erApp();
    if (!aa) {
      if (!syna) return;
      aa = document.createElement('button');
      aa.id = AA_ID;
      aa.type = 'button';
      aa.title = 'Stærð þessarar síðu';
      aa.setAttribute('aria-label', 'Stærð þessarar síðu');
      aa.textContent = 'Aa';
      aa.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); vixla(); });
      document.body.appendChild(aa);
    }
    if (aa.classList.contains('synt') !== syna) aa.classList.toggle('synt', syna);
    if (syna) {
      const b = document.getElementById('bstal-banner');
      const top = synilegt(b) ? Math.round(b.getBoundingClientRect().bottom / C() + 6) : 8;
      setVar('--sz-aa-top', top + 'px');
    }
  }

  /* ── blaðið ─────────────────────────────────────────────────────────────── */
  let opid = false;
  function bladTop() {
    const c = C();
    if (erApp()) {
      const hr = document.getElementById('_app-hdr');
      if (synilegt(hr)) return Math.round(hr.getBoundingClientRect().bottom / c + 6);
    }
    const aa = document.getElementById(AA_ID);
    if (synilegt(aa)) return Math.round(aa.getBoundingClientRect().bottom / c + 6);
    return 12;
  }
  function stadaHtml() {
    if (_vistStada === 'vista') return '<i class="sz-led bid"></i>Vista á þjóninn…';
    if (_vistStada === 'villa') return '<i class="sz-led villa"></i>Vistun mistókst — reynt aftur sjálfkrafa';
    const hvar = flokkur() === 'simi' ? 'fyrir síma' : 'fyrir tölvu (app)';
    if (nu.uppruni === 'vistad') return '<i class="sz-led ok"></i>Vistað fyrir þessa síðu ' + hvar;
    if (nu.uppruni === 'byrjun') return '<i class="sz-led"></i>Byrjunarstærð · breyting vistast ' + hvar;
    return '<i class="sz-led"></i>Upprunaleg stærð · breyting vistast ' + hvar;
  }
  function listiHtml() {
    const fl = flokkur();
    const a = stillingar()[fl];
    const k = Object.keys(a).sort((x, y) => String(a[x].n || x).localeCompare(String(a[y].n || y), 'is'));
    const rows = k.map(x => '<div class="sz-li"><span>' + esc(a[x].n || x) + '</span><b>' + Math.round(a[x].s * 100) + ' %</b>'
      + '<button type="button" data-sz-burt="' + esc(x) + '" title="Fjarlægja — upprunaleg stærð" aria-label="Fjarlægja">×</button></div>').join('');
    return '<summary>Vistaðar síður (' + k.length + ')</summary>' + (rows || '<div class="sz-tomt">Engin síða stillt enn.</div>');
  }
  function teiknaBlad(fullt) {
    const p = document.getElementById(PNL_ID);
    if (!p || !opid) return;
    setVar('--sz-pnl-top', bladTop() + 'px');
    const pct = Math.round(nu.s * 100);
    if (fullt || !p.firstChild) {
      p.innerHTML =
        '<div class="sz-hd"><span class="sz-lbl">Stærð</span><b class="sz-nm"></b>'
        + '<button type="button" class="sz-x" data-sz="loka" aria-label="Loka">×</button></div>'
        + '<div class="sz-bd">'
        + '<div class="sz-rod"><button type="button" data-sz="minni" aria-label="Minnka">−</button>'
        + '<input type="range" min="' + Math.round(SMIN * 100) + '" max="' + Math.round(SMAX * 100) + '" step="5" aria-label="Stærð síðu">'
        + '<button type="button" data-sz="staerri" aria-label="Stækka">+</button>'
        + '<span class="sz-tala" title="Hlutfall af raunstærð — 100 % = letur eins og í venjulegu síma-appi"><span class="sz-pct"></span><span class="sz-pc">%</span></span></div>'
        + '<div class="sz-for">' + FORSTILLT.map(v => '<button type="button" data-sz-for="' + v + '">' + Math.round(v * 100) + '</button>').join('') + '</div>'
        + '<div class="sz-st"></div>'
        + '<div class="sz-ak"><button type="button" data-sz="upphafl">Upprunaleg</button>'
        + (window.PageEditor && PageEditor.toggle ? '<button type="button" class="sz-dokk" data-sz="utlit">Litir og letur…</button>' : '') + '</div>'
        + '<details class="sz-listi"></details>'
        + '</div>';
      const rng = p.querySelector('input[type=range]');
      rng.addEventListener('input', () => {
        p.querySelector('.sz-pct').textContent = rng.value;
        setS(+rng.value / 100);
      });
    }
    p.querySelector('.sz-nm').textContent = nafn(nu.k, nu.el);
    p.querySelector('.sz-pct').textContent = String(pct);
    const rng = p.querySelector('input[type=range]');
    if (document.activeElement !== rng && +rng.value !== pct) rng.value = String(pct);
    p.querySelectorAll('[data-sz-for]').forEach(b => b.classList.toggle('on', Math.round(+b.dataset.szFor * 100) === pct));
    p.querySelector('.sz-st').innerHTML = stadaHtml();
    const up = p.querySelector('[data-sz="upphafl"]');
    if (up) up.disabled = nu.uppruni !== 'vistad';
    const li = p.querySelector('.sz-listi');
    const opinn = li.open;
    const h = listiHtml();
    if (li._h !== h) { li.innerHTML = h; li._h = h; li.open = opinn; }
  }
  function opna() {
    mountCss();
    let p = document.getElementById(PNL_ID);
    if (!p) {
      p = document.createElement('div');
      p.id = PNL_ID;
      p.setAttribute('role', 'dialog');
      p.setAttribute('aria-label', 'Stærð síðu');
      p.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || !p.contains(b)) return;
        e.preventDefault();
        if (b.dataset.szFor) { setS(+b.dataset.szFor); return; }
        if (b.dataset.szBurt) { endurstilla(b.dataset.szBurt); return; }
        const a = b.dataset.sz;
        if (a === 'loka') loka();
        else if (a === 'minni') setS(Math.round((nu.s - SKREF) * 20) / 20);
        else if (a === 'staerri') setS(Math.round((nu.s + SKREF) * 20) / 20);
        else if (a === 'upphafl') endurstilla();
        else if (a === 'utlit') { loka(); try { PageEditor.toggle(); } catch (_) {} }
      });
      document.body.appendChild(p);
    }
    p.hidden = false;
    opid = true;
    apply();
    teiknaBlad(true);
  }
  function loka() {
    opid = false;
    const p = document.getElementById(PNL_ID);
    if (p) p.hidden = true;
  }
  function vixla() { if (opid) loka(); else opna(); }
  document.addEventListener('pointerdown', e => {
    if (!opid) return;
    const t = e.target;
    if (t.closest && (t.closest('#' + PNL_ID) || t.closest('#' + AA_ID) || t.closest('#_app-style'))) return;
    loka();
  }, true);
  document.addEventListener('keydown', e => { if (opid && e.key === 'Escape') loka(); });

  /* ── vaktir ─────────────────────────────────────────────────────────────── */
  let _at = null;
  function seinna(ms) { clearTimeout(_at); _at = setTimeout(apply, ms == null ? 0 : ms); }
  ['hashchange', 'popstate', 'pageshow', 'resize'].forEach(ev => window.addEventListener(ev, () => { seinna(0); setTimeout(apply, 250); }));
  document.addEventListener('slokk-viewmode', () => setTimeout(apply, 40));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) apply(); });
  // Sumar síður skipta um slóð með history-API (enginn hashchange) — t.d. Companies.openDetail. Ódýr vakt á lyklinum.
  setInterval(() => {
    if (document.hidden) return;
    const g = virkt() ? gluggi() : null;
    if ((g ? 'm:' + g.id : siduLykill()) !== nu.k) apply();
  }, 700);

  function vefja() {
    let ok = true;
    try {
      if (window.App && typeof App.switchView === 'function' && !App.switchView.__appZoom333) {
        const orig = App.switchView;
        App.switchView = function () { const r = orig.apply(this, arguments); seinna(0); setTimeout(apply, 120); return r; };
        App.switchView.__appZoom333 = true;
      }
    } catch (_) { ok = false; }
    try {
      if (window.Modal && typeof Modal.open === 'function' && !Modal.open.__sz333) {
        const o = Modal.open, c = Modal.close;
        Modal.open = function () { const r = o.apply(this, arguments); seinna(0); setTimeout(apply, 260); return r; };
        Modal.open.__sz333 = true;
        if (typeof c === 'function') {
          Modal.close = function () { const r = c.apply(this, arguments); seinna(0); return r; };
          Modal.close.__sz333 = true;
        }
      }
    } catch (_) { ok = false; }
    try {
      if (window.AppSettings && AppSettings.onChange && !vefja._as) { vefja._as = 1; AppSettings.onChange(() => seinna(0)); }
    } catch (_) {}
    return ok;
  }
  vefja();
  [200, 800, 2000].forEach(ms => setTimeout(vefja, ms));

  try {
    const mo = new MutationObserver(() => syncViewport());
    const startMo = () => {
      const vp = document.querySelector('meta[name="viewport"]');
      if (vp) mo.observe(vp, { attributes: true, attributeFilter: ['content'] });
    };
    if (document.head) startMo();
    else document.addEventListener('DOMContentLoaded', startMo, { once: true });
  } catch (_) {}

  function boot() { mountCss(); apply(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  [200, 800, 2000].forEach(ms => setTimeout(boot, ms));

  window.AppPageZoom = {
    get: () => sidustaerd,
    set: z => setS((+z || 1) / C()),
    getS: () => nu.s,
    setS,
    endurstilla,
    lykill: () => nu.k,
    nafn: () => nafn(nu.k, nu.el),
    uppruni: () => nu.uppruni,
    flokkur,
    stillingar: () => stillingar()[flokkur()],
    opna, loka, vixla,
    prufa: s => { prufaS = (s == null) ? null : klemma(s); apply(); return prufaS; },
    MIN: SMIN,
    version: '333-sidustaerd'
  };
  window.SlokkHubViewport = HUB_VP;
  console.log('[patch-333] síðustærð per síðu (þjónn)');
})();
/* === END SÍÐUSTÆRÐ === */
