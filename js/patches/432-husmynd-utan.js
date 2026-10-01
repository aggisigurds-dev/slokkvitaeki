/* === HÚSMYND AÐ UTAN (432) ====================================================
 * Sóknin er í 367: ein tilraun þegar engin mynd er vistuð, svo skyndiminni á
 * co_bygging_mynd. Þessi skrá gerir ekkert. Hún má ekki hoppa yfir félög,
 * ekki pólla, og ekki hanga á „Uppfæra eftir heimilisfangi“ eða Hlaða.
 * Götumynd frá Google krefst lykils sem er ekki til.
 * ========================================================================== */
(function () {
  'use strict';
  if (window.HusmyndUtan) return;
  window.HusmyndUtan = {
    saekja: function () { return Promise.resolve({ sleppt: 'sjalfvirkt' }); },
    eftirHeimilisfangi: function () { return Promise.resolve({ sleppt: 'sjalfvirkt' }); },
    hopp: function () { return Promise.resolve(); },
    stodva: function () {},
    aAdSleppa: function () { return 'mynd-til'; },
    kall: function () { return 0; }
  };
})();
