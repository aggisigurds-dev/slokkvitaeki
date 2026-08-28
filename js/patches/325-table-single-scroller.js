/* === EINN LÁRÉTTUR SKRUNARI Á TÖFLU (325) ===================================
 *
 * VANDINN (Agnar, 2026-08-28, sími í Skjá-ham):
 * Ársskoðunar-taflan „stoppar á sama stað" — notandi strýkur til hliðar, taflan
 * færist ~117px og stoppar, og hann þarf NÝTT strok til að hún haldi áfram.
 *
 * ORSÖK: tveir hlaðnir skrunarar. mobile.css:66 setur
 *     .view table, .view .tbl, .view [class*="table"] { overflow-x:auto }
 * þar sem [class*="table"] er JÓKER sem hittir EKKI bara <table> heldur líka
 * umgjarðirnar — data-table-scroll, data-table-wrap og _ars-tblscroll bera öll
 * „table" í class. Þrír hlutir verða því skrunkassar þar sem einn á að vera.
 * Mælt á 980px (breiddin sem Chrome „desktop site" gefur símanum) í Skjá-ham:
 *     table.data-table   skrunar 117px   <- strokið deyr hér
 *     div._ars-tblscroll skrunar 390px   <- krefst nys stroks
 * Sími-hamur = 0 skrunarar, Tafla = 1, Skjár = 2. Aðeins Skjár var brotinn.
 *
 * LAUSNIN: umgjörðin skrunar, taflan aldrei. Þá er alltaf NÁKVÆMLEGA einn
 * skrunari og allt innihald næst í einu stroki.
 *
 * AUKAVERKUN (til batnaðar): áður náðist aðeins hluti töflunnar gegnum
 * umgjörðina — á 412px í Síma-ham var taflan 653px en aðeins 338px næðust.
 * Eftir breytinguna er næð breidd == breidd töflu í öllum hömum (727/727,
 * 1197/1197, 1300/1300). Sama vandamál og 2026-07-30 (sjá 245, lína 145).
 *
 * SÉRTÆKNI: 263-mobile-baseline.js:67 setur
 *     html[data-viewmode="mobile"] .view table{display:block;overflow-x:auto}
 * sem er (0,2,2). Hrein .view ._ars-tblscroll>table er (0,2,1) og TAPAR — því
 * er :not(#_a)-þéttingin notuð, sami húsasiður og í mobile.css.
 *
 * :has() SITUR SÉR: ef vafri kann ekki :has() fellur heil reglurunan úr gildi.
 * Kjarnareglurnar eru því í eigin bálki og :has()-afhreiðrunin í öðrum.
 * ========================================================================== */
(() => {
  if (window.__tableSingleScroller325) return;
  window.__tableSingleScroller325 = true;

  const ID = 'table-single-scroller-325';
  const W = ['.data-table-scroll', '._ars-tblscroll', '.data-table-wrap'];
  const PAD2 = ':not(#_a):not(#_b)';
  const PAD4 = ':not(#_a):not(#_b):not(#_c):not(#_d)';

  function inject() {
    let s = document.getElementById(ID);
    if (!s) {
      s = document.createElement('style');
      s.id = ID;
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = [
      /* 1. Umgjörðin er skrunarinn. */
      W.map((w) => '.view ' + w + PAD2).join(',') +
        '{overflow-x:auto!important;-webkit-overflow-scrolling:touch}',

      /* 2. Taflan sjálf skrunar ALDREI — hún er efnið, ekki kassinn. */
      W.map((w) => '.view ' + w + '>table' + PAD4).join(',') +
        '{display:table!important;overflow-x:visible!important;' +
        'overflow-y:visible!important;max-width:none!important}',
    ].join('\n');

    /* 3. Afhreiðrun: ytri wrap sem geymir sérstakan skrunara skrunar ekki.
          Sér blað svo :has()-fall felli ekki reglur 1-2. */
    let h = document.getElementById(ID + '-has');
    if (!h) {
      h = document.createElement('style');
      h.id = ID + '-has';
      (document.head || document.documentElement).appendChild(h);
    }
    h.textContent =
      '.view .data-table-wrap:has(.data-table-scroll)' + PAD2 + ',' +
      '.view .data-table-wrap:has(._ars-tblscroll)' + PAD2 +
      '{overflow-x:visible!important}';
  }

  if (document.head) inject();
  else document.addEventListener('DOMContentLoaded', inject);
})();
