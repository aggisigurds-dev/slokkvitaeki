/* === SÍMI/APP · FLJÓTANDI TAKKAR (329, 2026-08-29) ========================
 *
 * Agnar: „geturðu kanski prófað þetta til og reyna að laga app view og
 * mobile view". Prófað var í alvöru síma-útsýni (390×844) og í app-ham —
 * ekki í símarammanum. Það skiptir öllu máli, sjá „AF HVERJU SÁST ÞETTA
 * EKKI" að neðan.
 *
 * ── HVAÐ VAR BILAÐ ────────────────────────────────────────────────────────
 * Fimm fljótandi takkar sitja allir í neðra hægra horninu, hver úr sínum
 * patch, og enginn þeirra veit af hinum. Mælt á 390×844:
 *
 *   #pat-launch       🤖 AI-flokka póst (308)   z-index 100070
 *   #cg-sk-trigger    🎯 CG-upptaka (297)       z-index  99900
 *   #_dst-btn._float  📐 Dálkastjóri (326)      z-index   9999
 *   #_slokk_langbtn   EN/IS (v9.js)             z-index   9999
 *   #qr-fab           📷 QR-skanni (57)         z-index   9998
 *
 * Afleiðingarnar voru tvenns konar, eftir því hvor lagstaflinn vann:
 *
 * 1. BÍLSTJÓRI — takkarnir vinna. Dokkan neðst (.dock, „🧭 Keyra leið
 *    dagsins") er á z-index 30. 🎯 CG lagðist á vinstri endann og
 *    🤖 AI-flokka póst á þann hægri, svo AÐALTAKKI bílstjóra-appsins var
 *    hálfhulinn og textinn klipptur í miðju. Þetta er takkinn sem allur
 *    dagurinn byrjar á.
 *
 * 2. APP-HAMUR — navið vinnur. #_app-nav er á z-index 2147481001, þ.e. yfir
 *    þeim öllum. Takkarnir fimm lentu því UNDIR botn-navinu: ósýnilegir og
 *    ósmellanlegir. 📷 QR-skanninn — verkfærið sem síminn er notaður fyrir
 *    úti á vettvangi — var þar með dauður í hverju einasta uppsettu appi.
 *
 * Í venjulegum símaham (hvorki app né Bílstjóri) skarast þeir svo innbyrðis:
 * EN×QR 31×36px, EN×AI 59×38px, AI×QR 52×37px — mælt, ekki áætlað.
 *
 * ── AF HVERJU SÁST ÞETTA EKKI ─────────────────────────────────────────────
 * Af því að símaramminn LÝGUR. Patch 320 felur #pat-launch, #cg-sk-trigger
 * og #_dst-btn inni í rammanum (barna-hamurinn, „ritillinn á að sitja UTAN
 * við símann"). „Stilla útlit → Sími" sýnir því hreinni síma en til er.
 * Þessi patch lætur ALVÖRU símann og appið haga sér eins og forskoðunin —
 * það er öll hugmyndin: sama hlutinn hvort sem horft er á hann í ramma eða
 * í hendinni.
 *
 * ── HVAÐ ER GERT ──────────────────────────────────────────────────────────
 * • Bakvinnslu-takkarnir þrír eru faldir í app-ham, í Bílstjóra og á alvöru
 *   síma. Nákvæmlega sami listi og 320 felur nú þegar í rammanum og 327 felur
 *   á Söluborðinu. Þeir standa ÓBREYTTIR á tölvuskjá.
 * • 📷 QR-skanninn er lyftur UPP FYRIR botnstikuna (og yfir hana í z-index)
 *   svo hann sé aftur nothæfur. „Botnstika" er hvaða negld aðgerðastika sem
 *   er neðst á skjánum — botn-navið í appinu (#_app-nav) EÐA græna ✓ ÁFRAM
 *   stikan á Sölu (#pos-checkout, negld í pos.js:313 á síma).
 * • EN/IS er falið þegar botnstika er á skjánum (það lá ofan á henni) og fært
 *   í neðra VINSTRA hornið annars, svo það hætti að liggja á QR-tákninu.
 *
 * Hæð botnstikunnar er MÆLD í keyrslu, ekki negld: navið er ein til þrjár
 * raðir eftir því hve margar síður eru valdar, og ÁFRAM-stikan vex með
 * upphæðinni. Hörð tala hefði skilið QR-takkann ofan í stikunni um leið og
 * önnur röð bættist við. Sama rök og `syncFrameBottom()` í 261.
 *
 * ATH ÞETTA EYÐIR ENGU og snertir hvorki 153/187-útreikninginn né tölvuskjá.
 * ======================================================================== */
(() => {
  const ID = '_simi-fljotandi-takkar';
  if (document.getElementById(ID)) return;

  /* Bakvinnslu-lagið sem á ekkert erindi í síma. Sami listi og 320 felur í
     símarammanum — haldið í sömu röð svo auðvelt sé að bera saman. */
  const BAKVINNSLA = [
    '#pe-pagelinks',
    '#pe-pagelinks-doc',
    '#pat-launch',
    '#cg-sk-trigger',
    '#_dst-btn._float',
  ];

  /* Símaramminn (320) keyrir barnið með ?devframe=simi|tafla. Þar er `screen`
     skjár TÖLVUNNAR, svo 166 setur ekki .slokk-phone-dev og símareglurnar
     hefðu ekki gilt í forskoðuninni. Merkjum barnið sjálf — annars héldi
     ramminn áfram að sýna annað en síminn, sem er einmitt gallinn sem þessi
     patch er skrifaður út af. */
  try {
    if (new URLSearchParams(location.search).get('devframe')) {
      document.documentElement.classList.add('slokk-simahamur');
    }
  } catch (_) {}

  /* Fjögur svið: uppsett app, læsti Bílstjórinn, alvöru símavélbúnaður og
     símaramminn. `html.slokk-phone-dev` kemur úr 166 (skjástærð/snerting),
     EKKI úr gluggabreidd — mjór gluggi á tölvuskjá telst því ekki sími og
     skjáborðið helst ósnert. */
  const SVID = [
    'body.appmode',
    'body.bs-active',
    'html.slokk-phone-dev body',
    'html.slokk-simahamur body',
  ];

  const felur = [];
  SVID.forEach((s) => BAKVINNSLA.forEach((b) => felur.push(s + ' ' + b)));

  /* Sértækni: #qr-fab er settur með inline cssText í 57 og #_slokk_langbtn
     með `!important` í app.css:3551 + @media-reglu í v9.js. Fölsku
     auðkennin (:not(#_p1)…) eru húsareglan hér til að vinna þau — sjá
     .claude/skills/slokkvitaeki-layout. Inline-stílar 57 bera ekki
     `!important`, svo `!important` héðan dugar á þá. */
  const css = `
${felur.join(',\n')} { display:none !important; }

/* Botnstika á skjánum → 📷 QR-skanninn fer upp fyrir hana og yfir hana.
   html.slokk-botnstika og --slokk-botnstika eru sett í keyrslu að neðan. */
html.slokk-botnstika body #qr-fab:not(#_p1):not(#_p2) {
  bottom: calc(var(--slokk-botnstika, 61px) + 14px) !important;
  z-index: 2147481002 !important;
}

/* EN/IS lá ofan á botnstikunni (og undir navinu, sem er á z-index
   2147481001 — þ.e. hvorugur takkinn var smellanlegur). */
html.slokk-botnstika body #_slokk_langbtn:not(#_p1):not(#_p2):not(#_p3),
body.appmode #_slokk_langbtn:not(#_p1):not(#_p2):not(#_p3) { display:none !important; }

/* Sé engin botnstika fer EN í vinstra hornið á síma, svo það hætti að liggja
   ofan á QR-tákninu. Hægra hornið tilheyrir skannanum. */
html.slokk-phone-dev body #_slokk_langbtn:not(#_p1):not(#_p2):not(#_p3),
html.slokk-simahamur body #_slokk_langbtn:not(#_p1):not(#_p2):not(#_p3) {
  left: 12px !important;
  right: auto !important;
  bottom: 14px !important;
  transform: none !important;
}
`;

  const st = document.createElement('style');
  st.id = ID;
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  /* Botnstikurnar sem geta legið undir fljótandi tökkunum. Listinn er stuttur
     og nefndur — ekki `[class*=...]`-leit, sem grípur alltaf meira en til
     stóð í þessum kóðagrunni (sjá slokkvitaeki-layout, kafli 6). */
  const STIKUR = ['_app-nav', 'pos-checkout'];
  const rot = document.documentElement;
  let sidast = -1;

  function maeldStika() {
    let h = 0;
    for (const id of STIKUR) {
      const el = document.getElementById(id);
      if (!el || !el.isConnected) continue;
      const cs = getComputedStyle(el);
      /* Aðeins NEGLDAR stikur telja. Á tölvuskjá er #pos-checkout venjulegur
         takki inni í körfunni (position:static) — þá er engin stika og
         ekkert breytist. Þannig snertir þetta aldrei skjáborðið. */
      if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.height < 8 || r.width < window.innerWidth * 0.6) continue;
      if (r.bottom < window.innerHeight - 4) continue;   // verður að sitja við botninn
      h = Math.max(h, Math.round(r.height));
    }
    if (h === sidast) return;
    sidast = h;
    if (h > 0) rot.style.setProperty('--slokk-botnstika', h + 'px');
    else rot.style.removeProperty('--slokk-botnstika');
    rot.classList.toggle('slokk-botnstika', h > 0);
  }

  maeldStika();
  document.addEventListener('DOMContentLoaded', maeldStika);
  window.addEventListener('load', maeldStika);
  window.addEventListener('resize', maeldStika);
  /* Stikurnar eru byggðar (og endurbyggðar) löngu eftir að þessi patch les —
     261 endurbyggir navið á 1,5s fresti og pos.js teiknar körfuna upp á nýtt
     við hverja breytingu. Þess vegna fylgjari frekar en ein mæling. */
  try {
    new MutationObserver(maeldStika).observe(document.body, { childList: true, subtree: true });
  } catch (_) {}
  setInterval(maeldStika, 2000);

  console.log('[patch-329] símaham: fljótandi takkar hreinsaðir');
})();
/* === END SÍMI/APP · FLJÓTANDI TAKKAR === */
