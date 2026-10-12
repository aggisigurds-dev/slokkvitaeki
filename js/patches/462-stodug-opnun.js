/* 462 — STÖÐUG OPNUN PRÓFÍLS (12.10.2026)
 *
 * Agnar 12.10.2026: „reyndu að það sjáist sem minnst hopp á efri hlutann á síðunni sem maður sér fyrst".
 *
 * Mælt á 13 félögum á lifandi síðu (77a14e7, hæð hvers hluta í hverjum ramma): efri hlutinn var teiknaður í
 * fimm atrennum á fyrstu 2,3 sekúndunum, af því hver hluti hékk á sínu eigin tifi:
 *
 *   hluti                                   pappi   kveikja                 hopp
 *   Samskipti-kassinn undir borðanum        286     250 ms bið + geymsla    +252 px á 0,35–0,65 s (stærst)
 *   húsmyndin í borðanum                    367     setInterval 1200 ms     +106 px á 0,7–1,0 s
 *   upplýsingalínurnar í borðanum           363     setInterval 1200 ms     +28…+130 px á 0,8–2,3 s
 *   Óskráð-línan / staðreyndir / knappar    411/405 vakt (252: næsti rammi) borðinn 235→211, röðin ±32 px
 *
 * Öll gögnin sem þessir hlutar þurfa til að TAKA PLÁSS eru þegar í minni við opnun (AppSettings, Companies.list);
 * aðeins innihaldið kemur síðar. Hér er því einn krókur sem lætur hvern þeirra teikna sig um leið og borðinn er
 * kominn — í sama tifi, áður en vafrinn málar — svo fyrsta myndin af prófílnum hefur nú þegar endanlega lögun.
 * Hver pappi á áfram sinn hnút og sitt tif (regla 4 í CLAUDE.md); hér er aðeins kallað fyrr á sama verkið.
 *
 * Kveikja: óinngjafinn MutationObserver (252 frestar öllum hinum til næsta ramma) á beinum börnum
 * #companies-main — sama aðferð og 450 notar fyrir kerfisspjaldið. Nýr .co-banner-hnútur = ný teikning.
 */
(function () {
  'use strict';
  if (window.__stodugOpnun462) return;
  window.__stodugOpnun462 = true;

  var NMO = window.__NativeMutationObserver || window.MutationObserver;
  // Röðin skiptir máli: 405 setur staðreyndirnar á undan húsmyndinni ef hún er komin (sama DOM-röð og áður).
  var SKREF = [
    ['367', function () { if (window.ByggingMynd) ByggingMynd.endurteikna(false); }],       // húsmyndin (190 px flís)
    ['363', function () { if (window.BannerUpplysingar) BannerUpplysingar.haldaVid(); }],   // upplýsingalínurnar
    ['405', function () { if (window.Efsta405) Efsta405.tick(); }],                        // staðreyndir, knappar, valmynd
    ['432s', function () { if (window.Seruppdrattir) Seruppdrattir.syna(); }],              // „Séruppdrættir · Sæki…"
    ['432f', function () { if (window.FasteignFacts) FasteignFacts.syna(); }],              // hús-línurnar
    ['411', function () { if (window.Thett411) Thett411.tick(); }],                         // Óskráð-línan, athugasemdin
    ['370', function () { if (window.HreyfingaryfirlitTakki) HreyfingaryfirlitTakki.setja(); }],
    ['286', function () { if (window.SamskiptiPanel && SamskiptiPanel.forbua) SamskiptiPanel.forbua(); }],
    ['405b', function () { if (window.Efsta405) Efsta405.tick(); }]                        // það sem ofantalið færði inn
  ];

  // 363/367/432 lesa félagið úr slóðinni (#company/<id>). 235 setur hana í sama kalli og teikninguna, svo hún er rétt
  // hér — en sé hún það ekki (önnur leið inn) er beðið eftir tifum pappanna sjálfra frekar en að teikna rangt félag.
  var LESA_SLOD = { '367': 1, '363': 1, '432s': 1, '432f': 1 };
  function slodRett(main) {
    var m = String(location.hash || '').match(/#(?:company|companies|fyrirtaeki)\/(\d+)/);
    var b = main.querySelector('button[onclick^="Companies.openEdit"]');
    var k = b && String(b.getAttribute('onclick') || '').match(/openEdit\((\d+)\)/);
    return !!(m && k && m[1] === k[1]);
  }

  var sidastBordi = null;
  function festa() {
    var main = document.getElementById('companies-main'); if (!main) return;
    var bn = main.querySelector(':scope > .co-banner');
    if (!bn || bn === sidastBordi) return;
    sidastBordi = bn;
    var rett = slodRett(main);
    for (var i = 0; i < SKREF.length; i++) {
      if (!rett && LESA_SLOD[SKREF[i][0]]) continue;
      try { SKREF[i][1](); } catch (e) { console.warn('[462] ' + SKREF[i][0], e); }
    }
  }

  // Upprunalegi „+ Bæta við tæki" (features.js) stóð 27 px hár í takkaröðinni undir borðanum í fyrsta rammanum, þar til
  // 73 faldi hann (100–350 ms) — allt fyrir neðan hoppaði upp. 73 felur hann alltaf á prófílnum og 404 smellir á hann
  // gegnum umboð (falinn takki tekur við .click()), svo á tölvu í Brunastáli er hann falinn frá upphafi.
  if (!document.getElementById('stodug-462')) {
    var st = document.createElement('style'); st.id = 'stodug-462';
    st.textContent = 'html[data-thm-preset="brunastal"]:not([data-viewmode="mobile"]):not(.slokk-phone-dev) body:not(.appmode) ' +
      '#companies-main > div[data-co-id]:not(._dyg-section) > button.btn-primary[onclick^="Companies.addUnit"]{display:none!important}';
    (document.head || document.documentElement).appendChild(st);
  }

  // #companies-main-hnútnum er stundum skipt út (sbr. 370/450) — vaktin fylgir núverandi hnút.
  var vaktadur = null;
  function vakta() {
    var main = document.getElementById('companies-main');
    if (!main || main === vaktadur) return;
    vaktadur = main;
    new NMO(festa).observe(main, { childList: true });
  }
  vakta();
  if (!vaktadur) document.addEventListener('DOMContentLoaded', vakta, { once: true });
  setInterval(vakta, 2000);   // eitt getElementById — ekkert gerist meðan hnúturinn er sá sami

  window.StodugOpnun = { festa: festa };
})();
