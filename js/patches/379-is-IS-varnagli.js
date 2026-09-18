/* === ÍSLENSKT TÖLUSNIÐ — VARNAGLI (379, 2026-09-18) =======================
 *
 * MÆLT: 85 staðir í kerfinu kalla `toLocaleString('is-IS')` til að birta krónur.
 * Enginn þeirra hefur varnagla. Það er í lagi svo lengi sem vafrinn KANN íslensku.
 *
 * Sumir gera það ekki. Mælt í prófunarvafra 18.09.2026:
 *
 *     Intl.NumberFormat.supportedLocalesOf(['is-IS'])   →   []
 *     (323242).toLocaleString('is-IS')                  →   "323,242"
 *
 * Rétt er `323.242`. Kommu-útgáfan les eins og 323 krónur og 242 aurar.
 *
 * Þetta bilar ÞÖGULT — engin villa, bara rangur skilju-stafur á hverri einustu
 * upphæð í kerfinu. Chromium-byggingar án fulls ICU (höfuðlausar prófunarvélar,
 * sum innbyggð vafralög, sparneytnar Android-byggingar) hafa þetta ekki.
 *
 * Á vélum Agnars (Windows Chrome, Android Chrome á S26) ER íslenskan til staðar,
 * svo þessi skrá gerir þar EKKI NEITT. Hún er varnagli, ekki lagfæring.
 *
 * AF HVERJU HÚN ER SAMT ÞESS VIRÐI: hún ver líka PRÓFANIR. Staðfesti ég
 * peningatölu í vafra sem kann ekki íslensku les ég ranga tölu og gæti sagt að
 * eitthvað sé rétt sem er það ekki. Mælitæki sem lýgur er verra en ekkert.
 *
 * HÖNNUN — eins þröngt og hægt er:
 *   · virkjast AÐEINS þegar vafrinn styður ekki is-IS;
 *   · grípur AÐEINS köll sem biðja beinlínis um 'is-IS' (eða 'is');
 *   · öll önnur köll fara óbreytt í upprunalega fallið.
 * Patch 148 ákvað meðvitað að snerta ekki `Number.prototype`; sú ákvörðun átti
 * við ALMENNA vafningu. Þetta er skilyrt og gerir ekkert þar sem allt er í lagi.
 * ========================================================================== */
(function () {
  'use strict';
  if (window.__isISVarnagli) return;
  window.__isISVarnagli = true;

  // Styður vafrinn íslensku? Prófum hvort tveggja: skráninguna og útkomuna.
  var studd = false;
  try {
    var skrad = Intl.NumberFormat.supportedLocalesOf(['is-IS']).length > 0;
    var rett = (1234.5).toLocaleString('is-IS', { minimumFractionDigits: 1 }) === '1.234,5';
    studd = skrad && rett;
  } catch (_) { studd = false; }

  if (studd) return;                       // ekkert að gera — langoftast þessi leið

  console.warn('[379] Vafrinn styður ekki is-IS tölusnið — varnagli virkjaður. '
    + 'Upphæðir hefðu annars birst með kommu í stað punkts.');

  /** Íslenskt snið handvirkt: punktur í þúsundum, komma í aurum. */
  function islenskt(n, valk) {
    valk = valk || {};
    var neikvaett = n < 0;
    var abs = Math.abs(Number(n));
    if (!isFinite(abs)) return String(n);

    var lagm = valk.minimumFractionDigits;
    var hamark = valk.maximumFractionDigits;
    var aukastafir = hamark != null ? hamark : (lagm != null ? lagm : 0);
    // Sjálfgefið hjá toLocaleString er allt að 3 aukastafir — hermum eftir því.
    if (hamark == null && lagm == null) aukastafir = (abs % 1 === 0) ? 0 : 3;

    var s = abs.toFixed(aukastafir);
    var hlutar = s.split('.');
    var heilt = hlutar[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    var brot = hlutar[1] || '';
    if (lagm != null) while (brot.length < lagm) brot += '0';
    brot = brot.replace(/0+$/, '');
    if (lagm != null && brot.length < lagm) { while (brot.length < lagm) brot += '0'; }

    return (neikvaett ? '-' : '') + heilt + (brot ? ',' + brot : '');
  }

  function erIslenska(l) {
    if (!l) return false;
    if (typeof l === 'string') return /^is(-|$)/i.test(l);
    if (Array.isArray(l)) return l.some(erIslenska);
    return false;
  }

  var raunTala = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function (locales, valkostir) {
    if (erIslenska(locales)) {
      try { return islenskt(this.valueOf(), valkostir); } catch (_) { /* fellur í gegn */ }
    }
    return raunTala.apply(this, arguments);
  };

  // Sama fyrir Intl.NumberFormat — 01-sala-suite.js:1212 notar hana beint.
  try {
    var RaunNF = Intl.NumberFormat;
    var nyNF = function (locales, valkostir) {
      if (erIslenska(locales)) {
        return { format: function (n) { return islenskt(n, valkostir); } };
      }
      return new RaunNF(locales, valkostir);
    };
    nyNF.supportedLocalesOf = RaunNF.supportedLocalesOf.bind(RaunNF);
    Intl.NumberFormat = nyNF;
  } catch (_) {}
})();
