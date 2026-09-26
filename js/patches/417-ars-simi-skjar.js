/* 417 — Ársskoðun í Skjár/Tafla á SÍMANUM (html.ars-wide-table, stikan af skjánum) — 25.09.2026.
 *
 *   Agnar (S26, appið Fjármál · Skjár): „make the heroboxes fit on top, and then the table scrollable · pinch zoom and
 *   scrolling in all directions". Layout-viewport símans er 412 px; 331/341 gerðu ALLA sýnina að einum breiðum
 *   skrunara (100vw + max-content) svo efri hlutinn (haus, spjöld, strimill) rann út af skjánum og pönnun dó.
 *
 *   Hér: efri hlutinn PASSAR í símabreiddina — spjöldin fjögur í tveimur dálkum (hetjan og Fjöldi yfir báða), strimillinn
 *   skrunar lárétt innan síns hólfs, haus-röðin og síustikan brjóta sig — og TAFLAN er eini breiði skrunarinn
 *   (._ars-tblscroll: overflow auto á báðum ásum, touch-action pan-x pan-y pinch-zoom). Sýnin sjálf skrunar aðeins lóðrétt.
 *   Sjö gervi-auðkenni slá sex 341 (23.09) sem setti max-content á #ars-main/.thm/.data-table-wrap/._ars-tblscroll.
 *   Pinch-zoom er á viewport-inu (331: user-scalable=yes) og gildir alls staðar.
 *
 *   Aðeins CSS. Gildir aðeins með html.ars-wide-table + body.has-mobnav (síminn); Tölvusíðu-hamur með stiku (≥ 900) ósnertur.
 */
(function () {
  'use strict';
  var S = 'html.ars-wide-table body.has-mobnav #view-arsskodun ';
  var SA = 'html.ars-simi-phone body #view-arsskodun ';   // Sími-hamurinn á síma (331) — sama símalag á efri hlutann
  function ra(sel, css) { return [S, SA].map(function (P) { return sel.split(',').map(function (x) { return P + x.trim() + F; }).join(','); }).join(',') + '{' + css + '}'; }
  var MONO = '"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace';
  var SANS = '"IBM Plex Sans",-apple-system,"Segoe UI",system-ui,sans-serif';
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  var F = ':not(#_p417a):not(#_p417b):not(#_p417c):not(#_p417d):not(#_p417e):not(#_p417f):not(#_p417g)';
  function r(sel, css) { return sel.split(',').map(function (x) { return S + x.trim() + F; }).join(',') + '{' + css + '}'; }
  var W = '#ars-main > div[style*="max-width:1720px"]';
  var css = [
    '@media (max-width:1100px){',
    // sýnin: lóðrétt skrun aðeins, engin lárétt pönnun á síðunni sjálfri
    [S, SA].map(function (P) { return P.replace(/\s+$/, '') + F; }).join(',') + '{width:100vw!important;max-width:100vw!important;margin-left:0!important;overflow-x:hidden!important;overflow-y:auto!important;touch-action:pan-y pinch-zoom!important}',
    // ílátin halda símabreiddinni — ekki max-content (341 P6)
    ra('#ars-main,#ars-main > div,.thm,.data-table-wrap', 'width:100%!important;min-width:0!important;max-width:100%!important;overflow:visible!important;box-sizing:border-box!important'),
    ra(W, 'padding:10px 10px 30px!important'),
    // TAFLAN er skrunarinn: báðir ásar, pönnun og pinch-zoom
    // 341 skrifar #arsskodun-wrap#arsskodun-wrap (tvöfalt id) + sex gervi-auðkenni = 9 id; hér tvöfalt id + sjö = 10
    ra('._ars-tblscroll,#arsskodun-wrap#arsskodun-wrap,._ars-tblscroll#arsskodun-wrap,.data-table-scroll', 'width:100%!important;max-width:100%!important;min-width:0!important;overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y pinch-zoom!important;overscroll-behavior-x:contain;max-height:none!important'),
    // haus-röðin brýtur sig: takkarnir fara undir titilinn; Bílstjóri (414) situr í hægri kantinum efst
    ra(W + ' > div:first-child', 'flex-wrap:wrap!important;gap:8px!important;padding-right:112px!important'),   // Bílstjóri (414) situr efst í hægri kantinum
    ra(W + ' > div:first-child > div', 'min-width:0;max-width:100%'),
    // spjöldin fjögur: tveir dálkar, hetjan og Fjöldi yfir báða
    ra('.b414-grid', 'grid-template-columns:1fr 1fr!important;gap:10px!important'),
    ra('.b414-k.gull,.b414-k.stal', 'grid-column:1 / -1'),
    ra('.b414-k > .b414-i', 'padding:12px 14px 12px!important'),
    ra('.b414-m > .b414-p', 'display:none!important'),
    // strimillinn skrunar lárétt innan síns hólfs; talningin til hægri víkur
    ra('.b414-strim', 'overflow-x:auto!important;overflow-y:hidden;touch-action:pan-x pan-y pinch-zoom!important;-webkit-overflow-scrolling:touch'),
    ra('.b414-man', 'min-width:640px;width:640px'),
    ra('.b414-strim .hd .r', 'display:none!important'),
    // gamla mánaðaröðin (153 ._ars-morow) — strimillinn okkar leysir hana af; 394 felur hana aðeins á borðtölvu
    ra('._ars-morow', 'display:none!important'),
    // síustikan og Staðirnir-hausinn brjóta sig
    ra('._ars-filterstrip', 'flex-wrap:wrap!important;overflow-x:auto!important;max-width:100%!important;touch-action:pan-x pan-y pinch-zoom'),
    ra('.arsm-sec', 'flex-wrap:wrap!important;gap:6px 12px!important'),
    // Sími-hamurinn: 153-síustikan (+ Nýtt, leit, stöðuflísar) sem silfurflísar á dökku, samantekt og raðalisti (._arsm-tbl) með málmhaus
    ra('._ars-filterstrip', 'background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;gap:8px!important;margin:0 0 10px!important'),
    ra('._ars-filterstrip ._ars-statusrow', 'display:flex;flex-wrap:nowrap;gap:6px;width:100%;border:0!important;background:transparent!important;border-radius:0!important;padding:2px 0!important'),
    ra('._ars-filterstrip ._ars-st', 'height:34px!important;padding:0 12px!important;border-radius:9px!important;background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.16)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14)!important;color:#1f2530!important;font:600 12.5px ' + SANS + '!important;min-height:0!important;line-height:1!important;white-space:nowrap'),
    ra('._ars-filterstrip ._ars-st[aria-pressed="true"],._ars-filterstrip ._ars-st.on,._ars-filterstrip ._ars-st.active,._ars-filterstrip ._ars-st.is-on', 'background:' + METAL + '!important;border-color:#000!important;color:#fff!important'),
    ra('#_ars-search', 'flex:1;min-width:180px;height:38px!important;border-radius:9px!important;background:#eef1f6!important;border:1px solid rgba(20,24,34,.14)!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)!important;color:#1f2530!important;font:400 13px ' + SANS + '!important'),
    ra('#_ars-pnr-row,#_arsmap-wrapper', 'color:#c9d0da!important'),
    ra('#_ars-pnr-row > span', 'color:#a9b1bf!important'),
    ra('._ars-summary', 'color:#c9d0da!important;background:rgba(255,255,255,.04)!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:10px;flex-wrap:wrap'),
    ra('._ars-summary div', 'color:#c9d0da!important'),
    ra('._arsm-tbl', 'border:1px solid #000!important;border-radius:10px!important;box-shadow:0 18px 40px -12px rgba(10,14,22,.6)!important'),
    ra('._arsm-head', 'background:' + METAL + '!important;color:#d9dee6!important;border-bottom:1px solid #000!important'),
    ra('._arsm-head ._arsm-name', 'background:transparent!important'),
    ra('._arsm-head ._arsm-h,._arsm-head ._arsm-yrhead span', 'color:#d9dee6!important;font-family:' + MONO + '!important;letter-spacing:.12em!important;text-transform:uppercase'),
    // samantekt og síðufletting í símabreidd
    r('._ars-summary,._tfoot', 'flex-wrap:wrap!important;max-width:100%!important;overflow-x:auto!important'),
    '}'
  ].join('\n');
  var st = document.getElementById('_ars-simi-skjar-417-css');
  if (!st) { st = document.createElement('style'); st.id = '_ars-simi-skjar-417-css'; document.head.appendChild(st); }
  st.textContent = css;
  // 341 setur stílblaðið sitt AFTAST í head við hverja teikningu — okkar verður að standa á eftir því.
  // (331 stillaBreidd() er nú girt frá has-mobnav svo inline-breiddirnar koma ekki lengur.)
  function aftast() { try { if (st.parentNode && st.parentNode.lastElementChild !== st) st.parentNode.appendChild(st); } catch (_) {} }
  try { new MutationObserver(function () { aftast(); }).observe(document.head, { childList: true }); } catch (_) {}
})();
