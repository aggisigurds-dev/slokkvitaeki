/* === BORÐINN: RÓLEGRI ÚTGÁFUR + SKIPTIR (406, 23.09.2026) =================
 *
 * Agnar 23.09.2026, eftir að hafa skoðað þrjár rólegri útgáfur frá 22.09:
 * „Ég held 1 … en taka burtu 3 takkana setja síma/tafla/Skjá og
 * málningartáknið, breyta því iconi í eitthvað minna hreinna … vill samt
 * helst geta skipt milli þessara 3 bannera. rétt á meðan til að testa …
 * geyma stál bannerinn líka".
 *
 * Borðinn sjálfur (230) er ÓSNERTUR — hæð, hnit, hnoð, klukka og allir hlutir
 * standa. Þetta lag málar hann aðeins upp á nýtt eftir `data-bordi` á <html>:
 *
 *   glod   1 · GLÓÐ   svart stál, eldurinn aðeins sem glóðarrönd neðst
 *                     + mjúkt appelsínugult gljáband. Gyllt klukka.  ← sjálfgefið
 *   stal   2 · STÁL   burstað stál, ein rauð æð efst, engin eldmynd. Hvít klukka.
 *   hreinn 3 · HREINN nærri svartur, logarnir í 12% ógagnsæi, gullrönd neðst.
 *   eldur  0 · ELDUR  upprunalegi bálborðinn — engar yfirskriftir.
 *
 * Valið býr í Vidmot (`bordi.utlit`, 472 — allar vélar) og er sett á <html> ÁÐUR en
 * borðinn er teiknaður, svo ekkert blossi milli útlita við hleðslu.
 *
 * SKIPTIRINN er lítill hnappur við klukkuna sem hringar útlitin fjögur og
 * segir til með toast. Hann er TIL PRÓFUNAR — eitt orð og hann fer.
 * Hann situr INNI í `.bb-rightwrap` af ásettu ráði: 166 og 262 krefjast þess
 * bæði að sýn-rofinn standi beint á undan #_pe-btn og #_pe-btn beint á undan
 * .bb-rightwrap — hnappur þar á milli setur þær báðar af stað í endalausa
 * endurröðun (sbr. 405: mældar 156 DOM-breytingar á 4 s þegar það var reynt).
 *
 * MÁLNINGARTÁKNIÐ (#_pe-btn, 262) er minnkað og hreinsað hér í CSS — svg-ið
 * sjálft er ósnert í 262 (það teiknar hnappinn upp á nýtt við sýnaskipti), svo
 * yfirskriftin verður að vera í stílblaði en ekki í DOM-inu.
 */
(() => {
  if (window.__bordiUtlitInstalled) return;
  window.__bordiUtlitInstalled = true;

  // 15.10.2026: valið býr í Vidmot ('bordi.utlit', 472) — eitt val fyrir allar vélar; gamli localStorage-lykillinn
  // `bordi_utlit` er fluttur einu sinni sem upphafsgildi. Skrifað AÐEINS við smell á skiptinn (áður skrifaði hleðslan líka).
  const LYK = 'bordi.utlit';
  const ROD = ['glod', 'stal', 'hreinn', 'eldur', 'premium-hreinn', 'premium-eldur', 'blatt-stal', 'kopar-mjott'];
  const NUMER = {glod:'1', stal:'2', hreinn:'3', eldur:'0', 'premium-hreinn':'4', 'premium-eldur':'5', 'blatt-stal':'6', 'kopar-mjott':'7'};
  const HEITI = { glod: '1 · Glóð', stal: '2 · Stál', hreinn: '3 · Hreinn', eldur: '0 · Eldur (upprunalegi)',
    'premium-hreinn': '4 · Premium hreinn', 'premium-eldur': '5 · Premium með eldi',
    'blatt-stal': '6 · Blátt stál', 'kopar-mjott': '7 · Dökkur kopar' };
  try { if (window.Vidmot) Vidmot.flytja(LYK, 'bordi_utlit', v => (ROD.indexOf(v) >= 0 ? v : undefined)); } catch (_) {}

  function lesa() {
    try { const v = window.Vidmot ? Vidmot.lesa(LYK, 'glod') : 'glod'; if (ROD.indexOf(v) >= 0) return v; } catch (_) {}
    return 'glod';
  }
  function beita(v) {
    if (document.documentElement.getAttribute('data-bordi') !== v) document.documentElement.setAttribute('data-bordi', v);
  }
  function setja(v) {
    beita(v);
    try { if (window.Vidmot) Vidmot.setja(LYK, v); } catch (_) {}
  }
  beita(lesa());   // strax, á undan teikningu borðans — ekkert skrif við hleðslu
  // Val frá annarri vél (eða þjónninn nýrri en skyndiminnið við ræsingu): aðeins litir borðans, ekkert hopp — beitt strax.
  document.addEventListener('vidmot-breytt', e => { try { if (e.detail && e.detail.lykill === LYK && !e.detail.heima) beita(lesa()); } catch (_) {} });

  const B = '#bstal-banner';
  const H = (v) => 'html[data-bordi="' + v + '"] ';
  const P = 'html:is([data-bordi="premium-hreinn"],[data-bordi="premium-eldur"]) ' + B;

  const SLIM_ART = {
    'blatt-stal': 'linear-gradient(142deg,transparent 17%,#81c8ef26 17.2%,transparent 22%),radial-gradient(ellipse at 46% 0%,#216a8a 0%,transparent 60%),linear-gradient(102deg,#08121b,#102f41 45%,#070e14)',
    'kopar-mjott': [
      'radial-gradient(ellipse 520px 22px at 285px calc(100% - 6px), #b53619a6, transparent 82%)',
      'linear-gradient(137deg, transparent 76%, #ffffff05 76.2%, transparent 91%)',
      'linear-gradient(180deg, #191a1d, #0d0e10 62%, #151214)'
    ].join(',')
  };
  const fullBanner = 'html[data-thm-preset="brunastal"][data-bstal-banner="on"]:not([data-bstal-mini="1"])';
  const slim = fullBanner + ':is([data-bordi="blatt-stal"],[data-bordi="kopar-mjott"])';
  const copper = fullBanner + '[data-bordi="kopar-mjott"]';
  const underBanner = selector => selector + ' .view.active:not(#view-field):not(#view-counter):not(#view-workshop)';
  const specialViews = selector => ['field','counter','workshop'].map(id => selector + ' #view-' + id + '.active').join(',');
  const glowLine = 'linear-gradient(90deg,#793b19,#f69149 20%,#ffd49a 31%,#944921 45%,#ffb46a 72%,#6c301b)';
  const css = [
    slim + ' ' + B + '{height:100px!important;padding:5px;border-radius:13px}',
    slim + ' ' + B + ' .bb-face{border-radius:9px}',
    slim + ' ' + B + ' .bb-logo img{height:34px}',
    slim + ' ' + B + ' .bb-word{font-size:12px;margin-top:2px}',
    slim + ' ' + B + ' .bb-clockbox{padding:4px 10px}',
    slim + ' ' + B + ' .bb-clock{font-size:24px}',
    slim + ' #bstal-ember{top:112px}',
    underBanner(slim) + '{padding-top:114px!important}',
    specialViews(slim) + '{padding-top:118px!important}',
    '@media(max-width:760px){' + slim + ' ' + B + '{height:84px!important}' + slim + ' ' + B + ' .bb-logo img{height:25px}' +
      slim + ' ' + B + ' .bb-word{font-size:10px}' + slim + ' ' + B + ' .bb-clock{font-size:19px}' +
      slim + ' #bstal-ember{top:94px}' + underBanner(slim) + '{padding-top:92px!important}' +
      specialViews(slim) + '{padding-top:94px!important}}',
    ...Object.entries(SLIM_ART).flatMap(([id, art]) => [
      H(id) + B + ' .bb-face{background:' + art + '!important}',
      H(id) + B + ' .bb-flames{display:none!important}',
      H(id) + B + ' .bb-face::after{content:"";position:absolute;inset:auto 2px 0;height:2px;pointer-events:none;background:' + glowLine + ';box-shadow:0 0 8px #ed793b}'
    ]),
    H('kopar-mjott') + B + ' .bb-bolt,' + H('kopar-mjott') + ' #bstal-ember{display:none!important}',
    H('kopar-mjott') + B + '{padding:2px;border-radius:8px;box-shadow:inset 0 1px #ffffff20,0 6px 14px #0008}',
    H('kopar-mjott') + B + ' .bb-face{border-radius:6px;box-shadow:inset 0 1px #ffffff14}',
    H('kopar-mjott') + B + ' .bb-logo::before{display:none}',
    H('kopar-mjott') + B + ' .bb-face::before{content:"";position:absolute;inset:0 auto 0 0;width:316px;max-width:100%;pointer-events:none;z-index:2;' +
      'background:center/100% 100% no-repeat url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 316 64%27 preserveAspectRatio=%27none%27%3E%3Cdefs%3E%3ClinearGradient id=%27e%27 x2=%271%27 y2=%270%27%3E%3Cstop stop-color=%27%23533224%27/%3E%3Cstop offset=%27.84%27 stop-color=%27%23b34e2d%27/%3E%3Cstop offset=%27.90%27 stop-color=%27%23ffd19c%27/%3E%3Cstop offset=%271%27 stop-color=%27%236a3020%27/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d=%27M1 1H313L267 53Q260 61 251 61H19Q13 61 9 56L1 46Z%27 fill=%27%23151618%27/%3E%3Cpath d=%27M1 46L9 56Q13 61 19 61H251Q260 61 267 53L313 1%27 fill=%27none%27 stroke=%27url(%23e)%27/%3E%3C/svg%3E")}',
    H('kopar-mjott') + B + ' .bb-face::after{inset:auto 0 17.2% 265px;height:1px;background:linear-gradient(90deg,#ffc28e,#fff0c9 10%,#ff994e 29%,#aa321a 75%,#512219);box-shadow:0 0 5px 1px #ff561cac;z-index:1}',
    '@media(min-width:761px){' + copper + ' ' + B + '{height:68px!important}' +
      underBanner(copper) + '{padding-top:82px!important}' +
      specialViews(copper) + '{padding-top:86px!important}}',
    '@media(max-width:520px){' + H('kopar-mjott') + B + ' .bb-face::before{width:205px}' +
      H('kopar-mjott') + B + ' .bb-face::after{left:172px}}',
    'html[data-bstal-mini="1"][data-bordi="kopar-mjott"] ' + B + ' .bb-face::before,html[data-bstal-mini="1"][data-bordi="kopar-mjott"] ' + B + ' .bb-face::after{display:none}',
    H('kopar-mjott') + B + ' .bb-clockbox{background:linear-gradient(#241e1b,#111114)!important}',
    H('kopar-mjott') + B + ' .bb-clock{text-shadow:none!important}',
    /* ── sameiginlegt: glóðar-/æðaröndin er teiknuð á .bb-face, sem á engin
       pseudo-element fyrir (leitað: engin ::before/::after á .bb-face) ── */
    H('glod') + B + ' .bb-flames,' + H('stal') + B + ' .bb-flames{display:none!important}',

    /* 1 · GLÓÐ */
    H('glod') + B + ' .bb-face{background-image:repeating-linear-gradient(108deg,rgba(255,255,255,.05) 0 1px,transparent 1px 5px),linear-gradient(180deg,#14161a 0%,#0a0b0d 55%,#141013 100%)!important}',
    H('glod') + B + ' .bb-face::before{content:"";position:absolute;left:0;right:0;bottom:0;height:34px;z-index:3;pointer-events:none;background:linear-gradient(180deg,rgba(255,120,30,0) 0%,rgba(255,120,30,.16) 100%)}',
    H('glod') + B + ' .bb-face::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;z-index:4;pointer-events:none;background:linear-gradient(90deg,#3a0b02,#e5231f 18%,#ff9d3a 38%,#ffd24a 52%,#ff7a1a 68%,#e5231f 84%,#3a0b02)}',
    H('glod') + B + ' .bb-clock{color:#ffd27a!important;text-shadow:0 0 12px rgba(255,180,60,.35)!important}',
    H('glod') + B + ' .bb-eyebrow{color:#d3ab4e!important}',

    /* 2 · STÁL */
    H('stal') + B + ' .bb-face{background-image:repeating-linear-gradient(101deg,rgba(255,255,255,.055) 0 1px,transparent 1px 4px),linear-gradient(180deg,#2b2f36 0%,#171a1f 48%,#22262c 52%,#0e1013 100%)!important}',
    H('stal') + B + ' .bb-face::after{content:"";position:absolute;left:0;right:0;top:0;height:2px;z-index:4;pointer-events:none;background:linear-gradient(90deg,rgba(229,35,31,0),#e5231f 30%,#ff7a1a 50%,#e5231f 70%,rgba(229,35,31,0))}',
    H('stal') + B + ' .bb-clock{color:#eef1f4!important;text-shadow:none!important}',
    H('stal') + B + ' .bb-eyebrow{color:#9aa3b1!important}',
    H('stal') + B + ' .bb-clockbox{background:linear-gradient(180deg,#0f1115,#05070a)!important}',

    /* 3 · HREINN */
    H('hreinn') + B + ' .bb-face{background-image:linear-gradient(180deg,#0b0c0e 0%,#08090b 100%)!important}',
    H('hreinn') + B + ' .bb-flames{opacity:.12!important}',
    H('hreinn') + B + ' .bb-face::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;z-index:4;pointer-events:none;background:linear-gradient(90deg,rgba(211,171,78,0),#d3ab4e 30%,#ffe9b0 50%,#d3ab4e 70%,rgba(211,171,78,0))}',
    H('hreinn') + B + ' .bb-clock{color:#ffd27a!important;text-shadow:none!important}',
    H('hreinn') + B + ' .bb-eyebrow{color:#8a7f66!important}',
    H('hreinn') + B + ' .bb-clockbox{border-color:rgba(211,171,78,.28)!important}',

    /* 4–5 · Premium. Existing banner controls and positioning remain in place. */
    B + ' .bb-premium-word{display:none}',
    P + ' .bb-face{background:repeating-linear-gradient(122deg,#ffffff07 0 1px,transparent 1px 5px),radial-gradient(ellipse at 26% 115%,#793510 0%,transparent 48%),linear-gradient(145deg,#1a1c20,#0a0c0f 67%)!important}',
    P + ' .bb-face::after{content:"";position:absolute;inset:auto 2px 2px;height:2px;z-index:4;pointer-events:none;background:linear-gradient(90deg,#5c2409 0%,#f08a32 16%,#ffe0a8 20%,#ec6830 38%,#812f14 78%,#271210 100%);box-shadow:0 0 9px #ff773d9c}',
    P + ' .bb-clockbox{border-color:#b9743c!important;background:linear-gradient(155deg,#1b1716,#0a0b0c)!important}',
    P + ' .bb-clock{color:#ffca83!important;text-shadow:0 0 11px #f98d3e66!important}',
    P + ' .bb-rightwrap::before{content:"ÞJÓNUSTUGÁTT";flex:none;white-space:nowrap;padding:6px 9px;border:1px solid #ad6734;border-radius:5px;background:#101012;color:#ffcc8c;font:650 10px/1.2 system-ui,sans-serif}',
    '@media(max-width:1100px){' + P + ' .bb-rightwrap::before{display:none}}',
    H('premium-hreinn') + B + ' .bb-flames{display:none!important}',
    H('premium-hreinn') + B + ' .bb-logo{align-self:stretch;display:flex!important;align-items:center}',
    H('premium-hreinn') + B + ' .bb-logo>img,' + H('premium-hreinn') + B + ' .bb-word{display:none!important}',
    H('premium-hreinn') + B + ' .bb-logo::before{inset:-10px -16px -6px -20px;background:linear-gradient(130deg,#1e2025,#0c0e10)!important;clip-path:polygon(0 0,100% 0,84% 100%,0 100%)}',
    H('premium-hreinn') + B + ' .bb-premium-word{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;align-items:center;gap:1px 7px;color:#fff;font:750 clamp(13px,1.6vw,21px)/1 system-ui,sans-serif;white-space:nowrap}',
    H('premium-hreinn') + B + ' .bb-premium-word i{grid-row:1/3;font-style:normal;font-size:1.25em}',
    H('premium-hreinn') + B + ' .bb-premium-word small{grid-column:2;color:#ffad64;font-size:.54em;letter-spacing:.22em}',
    H('premium-eldur') + B + ' .bb-flames{display:block!important;opacity:1!important}',

    /* ── málningartáknið: minna og hreinna (svg-ið í 262 ósnert) ── */
    /* min-height:0 er NAUÐSYNLEGT: 262 setur sjálft `min-height:32px` á hnappinn
       (_pe-css), svo 26px hæðin beit ekki og reiturinn var 26×32 en ekki ferningur. */
    B + ' #_pe-btn{width:26px!important;height:26px!important;min-width:0!important;min-height:0!important;padding:0!important;'
      + 'display:flex!important;align-items:center!important;justify-content:center!important;'
      + 'border:1px solid rgba(255,255,255,.16)!important;border-radius:3px!important;background:rgba(255,255,255,.04)!important}',
    B + ' #_pe-btn svg{display:none!important}',
    B + ' #_pe-btn::before{content:"";width:12px;height:12px;border-radius:50%;'
      + 'border:1px solid rgba(255,255,255,.55);background:linear-gradient(90deg,rgba(255,255,255,.82) 50%,transparent 50%)}',
    B + ' #_pe-btn:hover{background:rgba(255,255,255,.1)!important}',

    /* ── skiptirinn ── */
    B + ' #_bd-skipta{width:26px;height:26px;display:flex;align-items:center;justify-content:center;'
      + 'border:1px solid rgba(255,255,255,.16);border-radius:3px;background:rgba(255,255,255,.04);'
      + 'color:rgba(255,255,255,.72);font:700 10px/1 "JetBrains Mono",ui-monospace,monospace;cursor:pointer;padding:0}',
    B + ' #_bd-skipta:hover{background:rgba(255,255,255,.1);color:#fff}'
  ].join('\n');

  function stilar() {
    if (document.getElementById('bordi-utlit-css')) return;
    const st = document.createElement('style');
    st.id = 'bordi-utlit-css';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }
  stilar();

  function merki() {
    const v = document.documentElement.getAttribute('data-bordi') || 'glod';
    return NUMER[v] || NUMER.glod;
  }

  function veljaBorða(next) {
    if (!ROD.includes(next)) return false;
    const previous = lesa();
    beita(next);
    const button = document.getElementById('_bd-skipta');
    if (button) button.textContent = merki();
    if (next === previous) return true;
    setja(next);
    try { if (window.Toast && Toast.show) Toast.show('Borði: ' + HEITI[next]); } catch (_) {}
    return true;
  }
  window.BordiUtlit = {
    options: () => ROD.map(id => ({id, label:HEITI[id], sample:SLIM_ART[id]})),
    active: () => document.documentElement.getAttribute('data-bordi') || 'glod',
    select: veljaBorða
  };

  function skipta() {
    const nu = document.documentElement.getAttribute('data-bordi') || 'glod';
    veljaBorða(ROD[(ROD.indexOf(nu) + 1) % ROD.length]);
  }

  function settur() {
    const logo = document.querySelector(B + ' .bb-logo');
    if (logo && !logo.querySelector('.bb-premium-word')) {
      const title = document.createElement('span');
      title.className = 'bb-premium-word';
      title.innerHTML = '<i aria-hidden="true">🔥</i><b>BRUNAHÓLF</b><small>SLÖKKVITÆKI EHF.</small>';
      logo.appendChild(title);
    }
    const wrap = document.querySelector(B + ' .bb-rightwrap');
    const klukka = wrap && wrap.querySelector('.bb-clockbox');
    if (!wrap || !klukka) return;
    let b = document.getElementById('_bd-skipta');
    if (b && b.parentNode === wrap && b.nextElementSibling === klukka) { const m = merki(); if (b.textContent !== m) b.textContent = m; return; }
    if (!b) {
      b = document.createElement('button');
      b.id = '_bd-skipta';
      b.type = 'button';
      b.title = 'Skipta um borða — ' + ROD.map(id => HEITI[id]).join(' · ');
      b.setAttribute('aria-label', 'Skipta um borða');
      b.textContent = merki();
      b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); skipta(); });
    }
    wrap.insertBefore(b, klukka);
  }

  let bidur = false;
  function tif() {
    if (bidur) return;
    bidur = true;
    const keyra = () => { bidur = false; try { settur(); } catch (_) {} };
    if (document.visibilityState === 'visible' && window.requestAnimationFrame) requestAnimationFrame(keyra);
    else setTimeout(keyra, 250);
  }
  function byrja() {
    const el = document.getElementById('bstal-banner');
    if (!el) return setTimeout(byrja, 300);
    if (!el.__bdMO) { el.__bdMO = new MutationObserver(tif); el.__bdMO.observe(el, { childList: true, subtree: true }); }
    tif();
  }
  byrja();

  console.log('[patch-406] 🎚 Borði:', lesa(), '— skiptir við klukkuna');
})();
/* === END BORÐI ÚTLIT === */
