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
  var F = ':not(#_p417a):not(#_p417b):not(#_p417c):not(#_p417d):not(#_p417e):not(#_p417f):not(#_p417g)';
  function r(sel, css) { return sel.split(',').map(function (x) { return S + x.trim() + F; }).join(',') + '{' + css + '}'; }
  var W = '#ars-main > div[style*="max-width:1720px"]';
  var css = [
    '@media (max-width:900px){',
    // sýnin: lóðrétt skrun aðeins, engin lárétt pönnun á síðunni sjálfri
    S.replace(/\s+$/, '') + F + '{width:100vw!important;max-width:100vw!important;margin-left:0!important;overflow-x:hidden!important;overflow-y:auto!important;touch-action:pan-y pinch-zoom!important}',
    // ílátin halda símabreiddinni — ekki max-content (341 P6)
    r('#ars-main,#ars-main > div,.thm,.data-table-wrap', 'width:100%!important;min-width:0!important;max-width:100%!important;overflow:visible!important;box-sizing:border-box!important'),
    r(W, 'padding:10px 10px 30px!important'),
    // TAFLAN er skrunarinn: báðir ásar, pönnun og pinch-zoom
    // 341 skrifar #arsskodun-wrap#arsskodun-wrap (tvöfalt id) + sex gervi-auðkenni = 9 id; hér tvöfalt id + sjö = 10
    r('._ars-tblscroll,#arsskodun-wrap#arsskodun-wrap,._ars-tblscroll#arsskodun-wrap,.data-table-scroll', 'width:100%!important;max-width:100%!important;min-width:0!important;overflow:auto!important;overflow-x:auto!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch;touch-action:pan-x pan-y pinch-zoom!important;overscroll-behavior-x:contain;max-height:none!important'),
    // haus-röðin brýtur sig: takkarnir fara undir titilinn; Bílstjóri (414) situr í hægri kantinum efst
    r(W + ' > div:first-child', 'flex-wrap:wrap!important;gap:8px!important;padding-right:0!important'),
    r(W + ' > div:first-child > div', 'min-width:0;max-width:100%'),
    // spjöldin fjögur: tveir dálkar, hetjan og Fjöldi yfir báða
    r('.b414-grid', 'grid-template-columns:1fr 1fr!important;gap:10px!important'),
    r('.b414-k.gull,.b414-k.stal', 'grid-column:1 / -1'),
    r('.b414-k > .b414-i', 'padding:12px 14px 12px!important'),
    r('.b414-m > .b414-p', 'display:none!important'),
    // strimillinn skrunar lárétt innan síns hólfs; talningin til hægri víkur
    r('.b414-strim', 'overflow-x:auto!important;overflow-y:hidden;touch-action:pan-x pan-y pinch-zoom!important;-webkit-overflow-scrolling:touch'),
    r('.b414-man', 'min-width:640px;width:640px'),
    r('.b414-strim .hd .r', 'display:none!important'),
    // gamla mánaðaröðin (153 ._ars-morow) — strimillinn okkar leysir hana af; 394 felur hana aðeins á borðtölvu
    r('._ars-morow', 'display:none!important'),
    // síustikan og Staðirnir-hausinn brjóta sig
    r('._ars-filterstrip', 'flex-wrap:wrap!important;overflow-x:auto!important;max-width:100%!important;touch-action:pan-x pan-y pinch-zoom'),
    r('.arsm-sec', 'flex-wrap:wrap!important;gap:6px 12px!important'),
    // samantekt og síðufletting í símabreidd
    r('._ars-summary,._tfoot', 'flex-wrap:wrap!important;max-width:100%!important;overflow-x:auto!important'),
    '}'
  ].join('\n');
  var st = document.getElementById('_ars-simi-skjar-417-css');
  if (!st) { st = document.createElement('style'); st.id = '_ars-simi-skjar-417-css'; document.head.appendChild(st); }
  st.textContent = css;
  // 341 setur stílblaðið sitt AFTAST í head við hverja teikningu — okkar verður að standa á eftir því (sértækni jöfn þar
  // sem 341 notar sex gervi-auðkenni + !important; sjö hér vinna hvort eð er, en röðin kostar ekkert).
  // 331 stillaBreidd() skrifar inline width/min-width/max-width !important (breidd töflunnar) á #ars-main, .data-table-wrap og
  // ._ars-tblscroll — hugsað fyrir Tölvusíðu-ham með stiku þar sem sýnin pannar. Hér (stikan af skjánum) er TAFLAN skrunarinn
  // og ílátin eiga að halda símabreiddinni, svo inline-breiddirnar eru teknar af um leið og þær koma. 331 setur þær aðeins
  // við ham-/zoom-skipti (ekki í lykkju), svo þetta flöktir ekki; „Passa töflu" (zoom á töflunni) virkar áfram inni í skrunaranum.
  function simiVidd() { var h = document.documentElement; return h.classList.contains('ars-wide-table') && document.body && document.body.classList.contains('has-mobnav'); }
  function hreinsaBreidd() {
    if (!simiVidd()) return;
    var main = document.getElementById('ars-main'); if (!main) return;
    var stok = [main, main.querySelector('.data-table-wrap'), main.querySelector('._ars-tblscroll')];
    for (var i = 0; i < stok.length; i++) { var e = stok[i]; if (!e) continue; if (e.style.width || e.style.minWidth || e.style.maxWidth) { e.style.removeProperty('width'); e.style.removeProperty('min-width'); e.style.removeProperty('max-width'); } }
  }
  try {
    var vakt = new MutationObserver(function (ms) { for (var i = 0; i < ms.length; i++) { var tg = ms[i].target; if (tg && tg.nodeType === 1 && (tg.id === 'ars-main' || (tg.classList && (tg.classList.contains('_ars-tblscroll') || tg.classList.contains('data-table-wrap'))))) { hreinsaBreidd(); return; } } });
    var byrja = function () { var v = document.getElementById('view-arsskodun'); if (v) { vakt.observe(v, { attributes: true, attributeFilter: ['style'], subtree: true }); hreinsaBreidd(); } else setTimeout(byrja, 500); };
    byrja();
    window.addEventListener('resize', hreinsaBreidd);
  } catch (_) {}
  function aftast() { try { if (st.parentNode && st.parentNode.lastElementChild !== st) st.parentNode.appendChild(st); } catch (_) {} }
  try { new MutationObserver(function () { aftast(); }).observe(document.head, { childList: true }); } catch (_) {}
})();
