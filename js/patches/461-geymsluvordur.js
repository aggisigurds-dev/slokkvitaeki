/* 461-geymsluvordur.js — 12.10.2026

   Agnar á Suðurlandsbraut 30: „ég breytti í hleðslu, en breytist ekkert í
   útreikningi" … „þetta hoppar alltaf aftur í yfirferð".

   MÆLT Í VAFRANUM HANS: localStorage var 10 MB / 785 lyklar — FULLT. Jafnvel
   2 KB setItem fékk QuotaExceededError. Tveir skyndiminnislyklar átu 7,6 MB:
   ars_snapshot_v1 (153, 4 MB) og slokk_app_settings_v1 (85, 3,6 MB), auk
   fp_<id> (375/433, afrit af teikningum þjónsins) og company_mail_cache_v2.

   Afleiðingin: 131 saveTripState → setItem kastar → gleypt í try/catch →
   valið (Hleðsla) vistast ALDREI. 224 málar takkann samt „on" (_radUpp),
   129 reiknar út frá getChoice = sjálfgefið yfirferd (línurnar breytast ekki),
   og næsta rerender sýnir Yfirferð. Engin villa sást neins staðar.

   Reglan hér: ferðin (slokk_trip_*), hök og læsingar eru GÖGN; snapshot-ið,
   app_settings-afritið, teikninga-afritin og póstmerkin eru SKYNDIMINNI sem
   þjónninn endurbyggir. Fáist ekki pláss fyrir gögn víkur skyndiminnið.

   Þarf að hlaðast á UNDAN 85 og 227 (bæði vefja setItem líka) svo þessi
   vörður sé innsti hringurinn: 227 → 461 → innbyggt setItem.
*/
(function () {
  'use strict';
  if (window.__geymsluvordur461) return;
  window.__geymsluvordur461 = true;

  // Aðeins lyklar sem SANNANLEGA eru afrit af þjóninum (lesið í 153, 85, 295/431, 375/433).
  var SKYNDIMINNI = [
    /^ars_snapshot_v1$/, /^slokk_app_settings_v1$/, /^company_mail_cache_v2$/, /^fp_\d+$/
  ];
  function erSkyndiminni(k) { for (var i = 0; i < SKYNDIMINNI.length; i++) if (SKYNDIMINNI[i].test(k)) return true; return false; }

  var LS = window.localStorage;
  if (!LS) return;
  var innbyggt = LS.setItem.bind(LS);
  var sagt = false;

  function hreinsaSkyndiminni() {
    var frelsad = 0, n = 0;
    try {
      for (var i = LS.length - 1; i >= 0; i--) {
        var k = LS.key(i);
        if (!k || !erSkyndiminni(k)) continue;
        frelsad += ((LS.getItem(k) || '').length + k.length) * 2;
        LS.removeItem(k); n++;
      }
    } catch (_) {}
    return { n: n, kb: Math.round(frelsad / 1024) };
  }

  function segja(h) {
    if (sagt) return; sagt = true;
    var m = '⚠ Geymsla vafrans var full — ' + h.n + ' skyndiminnislyklar hreinsaðir (' + h.kb + ' KB). Vistun gengur aftur.';
    try { console.warn('[461-geymsluvordur] ' + m); } catch (_) {}
    var reynt = 0, t = setInterval(function () {
      if ((window.Toast && Toast.show && (Toast.show(m), true)) || ++reynt > 20) clearInterval(t);
    }, 1500);
    try { if (window.logProblem) window.logProblem('localstorage_fullt', m); } catch (_) {}
  }

  function erKvóti(e) {
    return e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
  }

  LS.setItem = function (k, v) {
    try { return innbyggt(k, v); }
    catch (e) {
      if (!erKvóti(e)) throw e;
      // Skyndiminni má ekki troða út gögn: ef lykillinn sjálfur er skyndiminni, sleppa honum hljóðlaust.
      if (erSkyndiminni(String(k))) return;
      var h = hreinsaSkyndiminni();
      segja(h);
      return innbyggt(k, v);   // kasti þetta aftur sér kallarinn það — betra en þögn
    }
  };

  // Fyrirbyggjandi: yfir 6 MB (af ~10) losa skyndiminnið strax við ræsingu, áður en fyrsta skrif ferðar bregst.
  try {
    var alls = 0;
    for (var i = 0; i < LS.length; i++) { var k = LS.key(i); alls += ((LS.getItem(k) || '').length + k.length) * 2; }
    window.__geymslaKB = Math.round(alls / 1024);
    if (alls > 6 * 1024 * 1024) { var h = hreinsaSkyndiminni(); if (h.n) { try { console.warn('[461-geymsluvordur] ' + window.__geymslaKB + ' KB í geymslu við ræsingu — ' + h.n + ' skyndiminnislyklar hreinsaðir (' + h.kb + ' KB)'); } catch (_) {} } }
  } catch (_) {}

  window.Geymsluvordur = { hreinsa: hreinsaSkyndiminni, erSkyndiminni: erSkyndiminni };
  try { console.log('[461-geymsluvordur] installed (' + (window.__geymslaKB || '?') + ' KB)'); } catch (_) {}
})();
