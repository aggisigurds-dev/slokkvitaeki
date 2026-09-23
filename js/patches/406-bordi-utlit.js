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
 * Valið er staðbundið (localStorage `bordi_utlit`) og sett á <html> ÁÐUR en
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

  const LYK = 'bordi_utlit';
  const ROD = ['glod', 'stal', 'hreinn', 'eldur'];
  const HEITI = { glod: '1 · Glóð', stal: '2 · Stál', hreinn: '3 · Hreinn', eldur: '0 · Eldur (upprunalegi)' };

  function lesa() {
    try { const v = localStorage.getItem(LYK); if (ROD.indexOf(v) >= 0) return v; } catch (_) {}
    return 'glod';
  }
  function setja(v) {
    document.documentElement.setAttribute('data-bordi', v);
    try { localStorage.setItem(LYK, v); } catch (_) {}
  }
  setja(lesa());   // strax, á undan teikningu borðans

  const B = '#bstal-banner';
  const H = (v) => 'html[data-bordi="' + v + '"] ';

  const css = [
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
    return String(ROD.indexOf(v) + 1 === 4 ? 0 : ROD.indexOf(v) + 1);
  }

  function skipta() {
    const nu = document.documentElement.getAttribute('data-bordi') || 'glod';
    const naest = ROD[(ROD.indexOf(nu) + 1) % ROD.length];
    setja(naest);
    const b = document.getElementById('_bd-skipta');
    if (b) b.textContent = merki();
    try { if (window.Toast && Toast.show) Toast.show('Borði: ' + HEITI[naest]); } catch (_) {}
  }

  function settur() {
    const wrap = document.querySelector(B + ' .bb-rightwrap');
    const klukka = wrap && wrap.querySelector('.bb-clockbox');
    if (!wrap || !klukka) return;
    let b = document.getElementById('_bd-skipta');
    if (b && b.parentNode === wrap && b.nextElementSibling === klukka) { const m = merki(); if (b.textContent !== m) b.textContent = m; return; }
    if (!b) {
      b = document.createElement('button');
      b.id = '_bd-skipta';
      b.type = 'button';
      b.title = 'Skipta um borða — 1 Glóð · 2 Stál · 3 Hreinn · 0 Eldur (til prófunar)';
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
