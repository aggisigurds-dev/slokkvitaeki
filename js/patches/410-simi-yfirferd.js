/* 410-simi-yfirferd.js — 24.09.2026
 * Símatúr um allar sýnir (53 í símaham + 42 í apphamnum, 412 px): það sem fannst er lagað hér.
 *
 *   1. Bókhalds·yfirlit (#mip-panel): Ógreiddir-taflan var 720 px í 324 px hólfi með overflow:hidden → klipptist.
 *      Nú lárétt skrun á hólfinu í síma/appi.
 *   2. Tilboð & samningar (#view-tilbodhub .th-row): takkarnir ✏️🖨🗑 fóru 30 px út fyrir skjáinn → röðin brotnar.
 *   3. Viðskiptavinir (._cl_table): haus-reitirnir voru display:block → NAFN/KENNITALA/SÍMI stafluðust lóðrétt.
 *   4. App-stikan (#_app-nav): 64–76 px fastir hnappar klipptu heitin („runakerfi", „lökkviker"). Hnappur tekur nú
 *      breidd heitisins, stikan skrunar (var þegar overflow-x:auto) og fær fölnun hægra megin meðan meira er falið.
 *   5. Klípu-zoom: vörður — viewport-meta má aldrei læsa (user-scalable=no / maximum-scale=1 / width=NNN) og
 *      html/body/.view mega ekki hafa touch-action sem bannar klípu (none, pan-x, pan-y). Mælt með CDP
 *      synthesizePinchGesture: scale 1 → 2 í síma-, app- og fyrirtækjasíðu. Vörðurinn heldur því þannig.
 *
 * Gildissvið: html[data-viewmode="mobile"], html.slokk-phone-dev, body.appmode. Tölvan ósnert.
 */
(function () {
  'use strict';
  const ID = '_s410-simi';
  if (document.getElementById(ID)) return;

  const PH = 'html:is([data-viewmode="mobile"],.slokk-phone-dev,:has(>body.appmode))';
  const P5 = ':not(#_p410a):not(#_p410b):not(#_p410c):not(#_p410d):not(#_p410e)'; // fimm gervi-auðkenni: yfir P4 í 353

  const css = [
    // 1) Bókhalds·yfirlit — hólfið skrunar lárétt í stað þess að klippa töfluna
    PH + ' body #view-bokhalds-yfirlit #mip-panel' + P5 + '{overflow-x:auto!important;-webkit-overflow-scrolling:touch;max-width:100%!important}',
    PH + ' body #view-bokhalds-yfirlit #mip-panel > table' + P5 + '{min-width:640px}',
    // 2) Tilboð & samningar — röðin brotnar, takkarnir fara í næstu línu
    PH + ' body #view-tilbodhub .th-row' + P5 + '{flex-wrap:wrap!important;gap:8px 10px!important;padding:10px 12px!important}',
    PH + ' body #view-tilbodhub .th-row > div[style*="flex:1"]' + P5 + '{flex:1 1 150px!important;min-width:0!important}',
    PH + ' body #view-tilbodhub .th-row > button' + P5 + '{min-height:36px!important}',
    // 3) Viðskiptavinir — haus-reitir sem reitir, ekki blokkir
    PH + ' body #view-vidskiptavinir ._cl_table th' + P5 + '{display:table-cell!important}',
    // 4) App-stikan — hnappur tekur breidd heitisins; stikan skrunar; fölnun meðan meira er falið hægra megin
    'html body.appmode #_app-nav button' + P5 + '{flex:0 0 auto!important;min-width:64px!important;width:auto!important;padding-left:10px!important;padding-right:10px!important;white-space:nowrap!important;overflow:visible!important}',
    'html body.appmode #_app-nav' + P5 + '{scroll-snap-type:x proximity;scrollbar-width:none}',
    'html body.appmode #_app-nav::-webkit-scrollbar{display:none}',
    'html body.appmode #_app-nav button' + P5 + '{scroll-snap-align:start}',
    'html body.appmode #_app-nav._s410-meira' + P5 + '{-webkit-mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 34px),rgba(0,0,0,.15) 100%);mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 34px),rgba(0,0,0,.15) 100%)}',
    // 5) klípu-zoom: enginn af þessum má banna klípu
    PH + ' , ' + PH + ' body, ' + PH + ' body .view' + P5 + '{touch-action:manipulation}'
  ].join('\n');

  const s = document.createElement('style');
  s.id = ID;
  s.textContent = css;
  (document.head || document.documentElement).appendChild(s);

  // ── verðir ─────────────────────────────────────────────────────────────────
  function simi() {
    const h = document.documentElement;
    return h.getAttribute('data-viewmode') === 'mobile' || h.classList.contains('slokk-phone-dev') || !!(document.body && document.body.classList.contains('appmode'));
  }
  const OPEN = 'width=device-width, initial-scale=1, user-scalable=yes, viewport-fit=cover';
  function vpLaest(c) {
    c = String(c || '');
    return !c || /user-scalable\s*=\s*(no|0)/i.test(c) || /maximum-scale\s*=\s*1(?:\.0+)?(?![\d.])/i.test(c) || /(^|,)\s*width\s*=\s*\d+/i.test(c);
  }
  function vordur() {
    if (!simi()) return;
    // viewport-meta
    try {
      let vp = document.querySelector('meta[name="viewport"]');
      if (!vp) { vp = document.createElement('meta'); vp.name = 'viewport'; document.head.appendChild(vp); }
      if (vpLaest(vp.getAttribute('content'))) vp.setAttribute('content', OPEN);
    } catch (_) {}
    // touch-action á rótinni og sýninni
    try {
      const view = document.querySelector('.view.active, .view[style*="display: block"], [id^="view-"]:not([style*="display: none"])');
      [document.documentElement, document.body, view].forEach(function (el) {
        if (!el) return;
        const ta = getComputedStyle(el).touchAction;
        if (/^(none|pan-x|pan-y|pan-x pan-y|pan-y pan-x)$/.test(ta)) el.style.setProperty('touch-action', 'manipulation', 'important');
      });
    } catch (_) {}
    // app-stikan: fölnun meðan meira er falið hægra megin
    try {
      const nav = document.getElementById('_app-nav');
      if (nav) {
        const meira = nav.scrollWidth - nav.clientWidth - nav.scrollLeft > 6;
        nav.classList.toggle('_s410-meira', meira);
        if (!nav.__s410) { nav.__s410 = true; nav.addEventListener('scroll', vordur, { passive: true }); }
      }
    } catch (_) {}
  }
  function start() { vordur(); setInterval(vordur, 2500); }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  document.addEventListener('slokk-viewmode', vordur);
})();
