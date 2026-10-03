/* 428-hak-hopp.js — 01.10.2026

   Agnar: „Serstaklega ef ýtt er á check við tæki eða skipt á milli yfirferð
   og hleðslu." Smellur á hak / valreit / Yfirferð / Hleðsla má EKKI:
     • hoppa síðunni eða stela skruni
     • rífa hliðarspjaldið (421 openDetail)
     • ræsa aðra fulla load()/rerender() sem yfirskrifar hakið
     • skipta um sýn eða fyrirtæki (hash)

   Kynslóðar-tákn: hvert smellur hækkar __hakHopp.kynslod. Seinkuð
   trip-cloud-restored (227), prófíl-endurteikning (421) og Companies.load
   sem lenda innan 2,5 s sleppa — staðbundna uppfærslan (224) er sannleikurinn.
*/
(function () {
  'use strict';
  if (window.__hakHopp428) return;
  window.__hakHopp428 = true;

  var GLUGGI_MS = 2500;
  var hopp = {
    kynslod: 0,
    sidast: 0,
    tegund: '',
    bump: function (teg) {
      this.kynslod++;
      this.sidast = Date.now();
      this.tegund = teg || '';
      return this.kynslod;
    },
    skalSleppa: function () {
      if (!this.sidast) return false;
      if ((Date.now() - this.sidast) > GLUGGI_MS) return false;
      return this.tegund === 'hak' || this.tegund === 'svc' || this.tegund === 'val';
    }
  };
  window.__hakHopp = hopp;

  var VEL = '.ut-check,.ut-chk,.ut-svc,.ut-onytt,.ut-svcseg,._ars-endur-cb,._ars-endur,._ars-nytt-chk,._ars-tu-toggle,._ars-mark';

  // Capture: stöðva hash-leiðsögn áður en 218/235/357 sjá smellinn.
  // stopPropagation EKKI hér — 224 á að fá bubbluna.
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest(VEL);
    if (!t) return;
    var a = (e.target.closest && e.target.closest('a[href^="#"]')) || t.closest('a[href^="#"]');
    if (a) e.preventDefault();
    if (t.tagName === 'BUTTON' && t.getAttribute('type') !== 'button') {
      try { t.setAttribute('type', 'button'); } catch (_) {}
      e.preventDefault();
    }
    var teg = t.classList.contains('ut-check') || t.classList.contains('_ars-endur-cb') || t.classList.contains('_ars-nytt-chk') || t.classList.contains('_ars-tu-toggle') || t.classList.contains('_ars-mark')
      ? 'hak'
      : (t.classList.contains('ut-chk') ? 'val' : 'svc');
    if (typeof installEinuSinni === 'function') installEinuSinni();
    hopp.bump(teg);
  }, true);

  function wrap(obj, name, gate) {
    if (!obj || typeof obj[name] !== 'function' || obj[name].__hakHopp) return;
    var orig = obj[name];
    var w = function () {
      if (gate && gate.apply(this, arguments)) return;
      return orig.apply(this, arguments);
    };
    try { Object.keys(orig).forEach(function (k) { try { w[k] = orig[k]; } catch (_) {} }); } catch (_) {}
    w.__hakHopp = true;
    obj[name] = w;
  }

  function install() {
    wrap(window.UttektTaeki, 'rerender', function () { return hopp.skalSleppa(); });
    wrap(window.Companies, 'openDetail', function (id) {
      if (!hopp.skalSleppa()) return false;
      if (window.__coLifandi) return true;
      return !!(window.Companies && Companies._detailOpen && Companies._detailOpen(id));
    });
    wrap(window.Companies, 'load', function () {
      return hopp.skalSleppa() && window.Companies && Companies._detailOpen && Companies._detailOpen();
    });
    wrap(window.Companies, 'render', function () {
      return hopp.skalSleppa() && window.Companies && Companies._detailOpen && Companies._detailOpen();
    });
    if (window.Arsskodun) {
      wrap(window.Arsskodun, 'loadAll', function () { return hopp.skalSleppa(); });
      wrap(window.Arsskodun, 'render', function () { return hopp.skalSleppa(); });
      wrap(window.Arsskodun, 'openDetail', function () {
        return hopp.skalSleppa() && !!document.querySelector('._ars-modal-bg ._ars-modal');
      });
    }
    wrap(window.App, 'switchView', function (v) {
      if (!hopp.skalSleppa()) return false;
      var active = document.querySelector('.view.active');
      if (!active) return false;
      if (v && ('view-' + v) === active.id) return false;
      // Smellur á hak/þjónustu má ekki skipta um sýn.
      return true;
    });
  }

  // 03.10.2026 — install() keyrði við ræsingu (t=0 OG t=800). Mælt á Ársskoðun:
  // 10.777 DOM-breytingar með 428 á móti 6.321 án hans, og 5.637 á grunninum frá
  // 30.09 — pappinn TVÖFALDAÐI vinnuna við hleðslu. Vefjurnar skipta hins vegar
  // engu fyrr en EFTIR smell á hak (skalSleppa() krefst bump innan 2,5 s), svo
  // þær eru settar upp við fyrsta slíkan smell. Hlustarinn hér að ofan keyrir
  // á undan og kallar install() áður en hann bumpar, svo fyrsti smellur er
  // jafn varinn og áður.
  var uppsett = false;
  function installEinuSinni() { if (uppsett) return; uppsett = true; install(); }
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest(VEL);
    if (t) installEinuSinni();
  }, true);

  try { console.log('[428-hak-hopp] installed'); } catch (_) {}
})();
