/* 366 — FLJÓTANDI TAKKAR MEGA EKKI HRANNAST UPP Á SÍMA
 *
 * Agnar 09.09.2026, með skjámyndum af símanum: „mobile view still a mesh."
 *
 * MÆLT á 375×812 (#arsskodun): þrettán `fixed`/`sticky` stjórntæki á skjánum,
 * fjögur þeirra ofan í hvort öðru í neðra hægra horninu:
 *
 *   _app-zoom       243,698  124×30   z-index 2147483600  ← HÆSTA mögulega gildi,
 *                                                            lá beint á töfluröðunum
 *   _ad-fab   💬    309,682   52×52   z-index 2147481000
 *   qr-fab    📷    303,740   52×52   z-index 9998
 *   _slokk_langbtn  12,754    59×44   (EN, vinstra megin)
 *
 * Vandinn er ekki útlitið á töflunni — hún skrúnar rétt og síðan er 375 px breið
 * eins og hún á að vera. Vandinn er að stjórntækin voru staðsett hvert í sínu lagi,
 * hvert án vitundar um hin, og lentu því hvert ofan á öðru.
 *
 * AÐFERÐIN — ekkert er falið.
 * Öll þessi tæki eru raunverulega notuð. Þau eru sett í einn lóðréttan stafla
 * upp frá neðra hægra horninu með föstu bili, svo þau geti aldrei skarast, og
 * zoom-stýringin fer efst í staflann í stað þess að liggja á gögnunum.
 * (Sambærileg meðferð er þegar til á Sölu-síðunni — sjá audit-sala-simi.)
 *
 * Aðeins ≤768 px. Á tölvu er nóg pláss og ekkert breytist.
 */
(function () {
  'use strict';

  var STAFLI = [
    { id: 'qr-fab',      h: 52 },   // 📷 skanni — neðst, oftast notaður
    { id: '_ad-fab',     h: 52 },   // 💬 aðstoðarmaður
    { id: '_app-zoom',   h: 30 },   // zoom — efst, því hann er sjaldnast snertur
  ];
  var KANTUR = 12, BIL = 10;

  function farsimi() { return window.innerWidth <= 768; }

  function radaStafla() {
    if (!farsimi()) { hreinsa(); return; }
    var bottom = KANTUR;
    for (var i = 0; i < STAFLI.length; i++) {
      var e = document.getElementById(STAFLI[i].id);
      if (!e) continue;
      var cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      e.style.setProperty('position', 'fixed', 'important');
      e.style.setProperty('right', KANTUR + 'px', 'important');
      e.style.setProperty('bottom', bottom + 'px', 'important');
      e.style.setProperty('left', 'auto', 'important');
      e.style.setProperty('top', 'auto', 'important');
      e.dataset.fljotandiStafli = '1';
      bottom += (e.offsetHeight || STAFLI[i].h) + BIL;
    }
    // EN-takkinn heldur sínu horni vinstra megin — hann rekst ekki á staflann.
    var en = document.getElementById('_slokk_langbtn');
    if (en) {
      // `right` VERÐUR að núllast líka. Takkinn hafði bæði left og right sett;
      // að setja aðeins left teygði hann yfir 351 px og byrjaði á -163.
      // Mælt í prófun áður en þetta fór út.
      en.style.setProperty('bottom', KANTUR + 'px', 'important');
      en.style.setProperty('left', KANTUR + 'px', 'important');
      en.style.setProperty('right', 'auto', 'important');
      en.style.setProperty('width', 'auto', 'important');
      en.dataset.fljotandiStafli = '1';
    }
  }

  function hreinsa() {
    document.querySelectorAll('[data-fljotandi-stafli]').forEach(function (e) {
      ['position', 'right', 'bottom', 'left', 'top', 'width'].forEach(function (p) {
        e.style.removeProperty(p);
      });
      delete e.dataset.fljotandiStafli;
    });
  }

  var t = null;
  function seinkad() { clearTimeout(t); t = setTimeout(radaStafla, 120); }

  // Takkarnir eru búnir til af ólíkum pöppum á ólíkum tímum — sumir eftir að
  // notandi opnar sýn. Fylgjumst með svo staflinn raðist líka fyrir þá sem
  // birtast seinna, í stað þess að keyra einu sinni og vona.
  if (document.body) new MutationObserver(seinkad).observe(document.body, { childList: true, subtree: false });
  window.addEventListener('resize', seinkad);
  window.addEventListener('hashchange', seinkad);
  document.addEventListener('DOMContentLoaded', seinkad);
  seinkad();
  setTimeout(radaStafla, 1500);
  setTimeout(radaStafla, 4000);
})();
