/* 465 — DJÚPDVALI (13.10.2026)
 *
 * Agnar 13.10.2026: „mörg af síðunum í hliðarstikunni eru og verða ekkert notuð … má skoða að eyða þeim alveg eða
 * setja í djúpdvala." Þessi borð voru þegar falin í hliðarstikunni, en kóðinn þeirra hlóðst samt í hverri ræsingu
 * (~360 KB), teiknaði borðin, sótti gögn (Verkdagbók: 3 köll) og vafði App.switchView. Script-merki þeirra eru nú
 * kommentuð út í index.html (build-dist sleppir merkjum innan athugasemda) — skrárnar sjálfar eru óbreyttar.
 * Listi, rök og hvernig á að vekja borð: docs/DJUPDVALI.md.
 *
 * Þessi vörður: sé svæft borð opnað (gömul slóð, bókamerki, takki í 61) væri aðalsvæðið autt — grunn-switchView
 * gerir öll borð óvirk og finnur ekkert view-<nafn>. Í staðinn: Þjónustuborðið og tilkynning.
 */
(function () {
  'use strict';
  if (window.__djupdvali465) return;
  window.__djupdvali465 = true;

  // Lykill → heiti. Vaki borð: taktu kommentið af merkinu í index.html OG fjarlægðu lykilinn hér.
  var SVEFN = {
    'verkdagbok': 'Verkdagbók',
    'aging-report': 'Aldursgreining',
    'stadan': 'Staðan',
    'thjonustuverk': 'Þjónustuverk',
    'beidnir': 'Beiðnir',
    'leidbeiningar': 'Leiðbeiningar',
    'mottaka': 'Móttaka',
    'vertid': 'Vertíð',
    'lanstaeki': 'Lánstæki'
  };
  // Lánstæki er inline-kóði í index.html og view-lanstaeki er stöðugt HTML — það sefur þegar Lanstaeki-hluturinn er ekki til.
  var VAKANDI = { 'lanstaeki': function () { return typeof window.Lanstaeki !== 'undefined'; } };
  var HEIM = 'verkbord';
  function sofandi(v) {
    if (!Object.prototype.hasOwnProperty.call(SVEFN, v)) return false;
    return VAKANDI[v] ? !VAKANDI[v]() : !document.getElementById('view-' + v);
  }
  function segja(v) {
    var t = SVEFN[v] + ' er í djúpdvala — opnaði Þjónustuborðið í staðinn.';
    try { if (window.Toast && Toast.show) Toast.show(t); else console.info('[465] ' + t); } catch (_) {}
  }

  function vefja() {
    var A = window.App;
    if (!A || typeof A.switchView !== 'function') return false;
    if (A.switchView.__djupdvali465) return true;
    var orig = A.switchView;
    var vafin = function (v) {
      if (sofandi(v)) {
        segja(v);
        try { if (String(location.hash).replace(/^#/, '') === v) history.replaceState(null, '', '#' + HEIM); } catch (_) {}
        return orig.call(this, HEIM);
      }
      return orig.apply(this, arguments);
    };
    vafin.__djupdvali465 = true;
    A.switchView = vafin;
    return true;
  }

  // Slóð sem bendir á svæft borð við ræsingu (218 gæti hafa reynt á undan þessum pappa)
  function athugaSlod() {
    var h = String(location.hash || '').replace(/^#/, '').split('/')[0];
    if (h && sofandi(h) && window.App && App.switchView) App.switchView(HEIM);
  }

  if (!vefja()) {
    var n = 0, t = setInterval(function () { if (vefja() || ++n > 40) { clearInterval(t); athugaSlod(); } }, 250);
  } else {
    setTimeout(athugaSlod, 0);
  }
  window.Djupdvali = { svefn: function () { return Object.keys(SVEFN); }, sofandi: sofandi };
})();
