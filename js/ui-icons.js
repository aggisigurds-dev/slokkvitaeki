/* ============================================================================
 * ui-icons.js — hlutlaus línu-táknmyndir (SVG) fyrir vöru- og þjónustuflokka
 *
 * Ósk Agnars 2026-08-05: „finnst samt þessi emoji voða barnalegir, mátt
 * endilega reyna gera þetta meira faglegt."
 *
 * Emoji teiknast mismunandi eftir stýrikerfi, eru mislit og lesast sem
 * leikfang. Hér eru í staðinn 1,6px stroke-teiknaðar myndir sem erfa lit
 * frá `currentColor` — svo þær taka lit spjaldsins og haldast samstiga
 * hvort sem er í ljósu eða dökku þema.
 *
 * Notkun:
 *   UIIcons.svg('extinguisher', { size: 20 })   → '<svg …>'
 *   UIIcons.forFlokkur('Varahlutir')            → nafn á tákni fyrir vöruflokk
 *   UIIcons.forCategory('ext_refill')           → tákn fyrir afsláttarflokk
 * ========================================================================== */
(function (root) {
  'use strict';

  // 24×24 grunnur, aðeins innihald <svg>. Stroke = currentColor.
  var P = {
    // Slökkvitæki
    extinguisher: '<path d="M9 7h6v13a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V7Z"/><path d="M10 7V5.5A1.5 1.5 0 0 1 11.5 4h1A1.5 1.5 0 0 1 14 5.5V7"/><path d="M14 6h2.5"/><path d="M9 11h6"/>',
    // Hleðsla / áfylling — hringrás
    refill:       '<path d="M20 11a8 8 0 0 0-13.7-5.7L4 7.5"/><path d="M4 4v3.5h3.5"/><path d="M4 13a8 8 0 0 0 13.7 5.7L20 16.5"/><path d="M20 20v-3.5h-3.5"/>',
    // Yfirferð / skoðun — skjöldur með haki
    check:        '<path d="M12 3 5 6v5.5c0 4.2 3 8.1 7 9.5 4-1.4 7-5.3 7-9.5V6l-7-3Z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    // Brunaslanga — spóla
    hose:         '<circle cx="10" cy="12" r="6"/><circle cx="10" cy="12" r="2"/><path d="M16 12h3a2 2 0 0 1 2 2v3"/><path d="M19 20h3"/>',
    // Reykskynjari — bylgjur
    detector:     '<circle cx="12" cy="15" r="2"/><path d="M8.5 11.5a5 5 0 0 1 7 0"/><path d="M6 9a8.5 8.5 0 0 1 12 0"/>',
    // Þjónusta / vinna — skiptilykill
    wrench:       '<path d="M15 6.5a4 4 0 0 0-5.4 5.4L4 17.5 6.5 20l5.6-5.6A4 4 0 0 0 17.5 9l-2.3 2.3L12.7 8.8 15 6.5Z"/>',
    // Ný tæki / vörur — kassi
    box:          '<path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5v-7Z"/><path d="m3 8.5 9 4.5 9-4.5"/><path d="M12 13v7"/>',
    // Varahlutir — tannhjól
    cog:          '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"/>',
    // Fylgihlutir — ró/bolti
    bolt:         '<path d="m12 3 7 4v10l-7 4-7-4V7l7-4Z"/><circle cx="12" cy="12" r="3"/>',
    // Skilti / ljós / miðar
    sign:         '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M12 16v4M9 20h6"/><path d="M12 8v3.5M12 13.4v.2"/>',
    // Skynjarar og rafhlöður
    battery:      '<rect x="3" y="8" width="15" height="8" rx="1.5"/><path d="M21 11v2"/><path d="M6.5 11v2M10 11v2"/>',
    // Viðvörunarkerfi — bjalla
    alarm:        '<path d="M18 15V10a6 6 0 1 0-12 0v5l-1.5 2.5h15L18 15Z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
    // Eldvarnir — logi
    flame:        '<path d="M12 3c1 3.5-3 4.5-3 8a3 3 0 0 0 6 0c0-1.6-.7-2.6-1.4-3.4C14.2 10 13 11 12 11c0-2.8 2-4.5 0-8Z" transform="translate(0 4)"/><path d="M12 3c1 3.5-3 4.5-3 8a3 3 0 0 0 6 0c0-1.6-.7-2.6-1.4-3.4"/>',
    // Vinna og akstur — bíll
    truck:        '<path d="M3 7h11v9H3z"/><path d="M14 10h3.5l2.5 3v3h-6"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
    // Vinna — starfsmaður
    worker:       '<circle cx="12" cy="8" r="3"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    // Tæki — verkfærataska
    toolbox:      '<rect x="3" y="8" width="18" height="11" rx="1.5"/><path d="M9 8V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v2"/><path d="M3 13h18"/>',
    // Sjúkratöskur — kross
    aid:          '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M12 10.5v5M9.5 13h5"/>',
    // Festingar — krækja
    mount:        '<path d="M5 4v16"/><path d="M5 8h7a3.5 3.5 0 0 1 0 7H5"/>',
    // Þjónusta (listi)
    clipboard:    '<rect x="5" y="5" width="14" height="16" rx="1.5"/><path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><path d="M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
    // Almennt
    tag:          '<path d="M3.5 11.7 11 4.2h7.5v7.5l-7.5 7.5-7.5-7.5Z"/><circle cx="15" cy="8" r="1.4"/>',
    layers:       '<path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z"/><path d="m4 12 8 4.3 8-4.3"/><path d="m4 16.3 8 4.3 8-4.3"/>',
    sliders:      '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    search:       '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    list:         '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
    grid:         '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    ban:          '<circle cx="12" cy="12" r="8"/><path d="m6.5 6.5 11 11"/>',
    swap:         '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    plus:         '<path d="M12 5v14M5 12h14"/>',
    x:            '<path d="m6 6 12 12M18 6 6 18"/>',
    star:         '<path d="m12 4 2.4 5 5.6.8-4 3.9 1 5.5-5-2.6-5 2.6 1-5.5-4-3.9 5.6-.8L12 4Z"/>',
    dot:          '<circle cx="12" cy="12" r="4"/>'
  };

  function svg(name, opts) {
    opts = opts || {};
    var d = P[name] || P.dot;
    var s = opts.size || 18;
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" ' +
      'stroke="currentColor" stroke-width="' + (opts.weight || 1.6) + '" ' +
      'stroke-linecap="round" stroke-linejoin="round" ' +
      'style="flex:none;display:block' + (opts.style ? ';' + opts.style : '') + '" ' +
      'aria-hidden="true" focusable="false">' + d + '</svg>';
  }

  // Vöruflokkur (vorur.flokkur) → tákn
  var BY_FLOKKUR = {
    'Þjónusta': 'clipboard',
    'Slökkvitæki': 'extinguisher',
    'Varahlutir': 'cog',
    'Fylgihlutir': 'bolt',
    'Ýmsar vörur': 'box',
    'Skilti, ljós og miðar': 'sign',
    'Skynjarar og rafhlöður': 'battery',
    'Brunaslöngurhjól': 'hose',
    'Brunaslöngur': 'hose',
    'Eldvarnir': 'flame',
    'Hleðsla slökkvitækja': 'refill',
    'Yfirferð slökkvitækja': 'check',
    'Viðvörunarkerfi': 'alarm',
    'Vinna': 'worker',
    'Vinna og akstur': 'truck',
    'Tæki': 'toolbox',
    'Sjúkratöskur': 'aid',
    'Slökkvitækjafestingar': 'mount',
    'Reykskynjarar': 'detector',
    'Brunakerfi': 'alarm',
    'Allt': 'grid'
  };

  // Afsláttarflokkur (discount-engine) → tákn
  var BY_CATEGORY = {
    ext_refill: 'refill',
    ext_service: 'check',
    hose_service: 'hose',
    detector_service: 'detector',
    general_service: 'wrench',
    hardware_purchase: 'box',
    none: 'ban'
  };

  root.UIIcons = {
    svg: svg,
    has: function (n) { return !!P[n]; },
    forFlokkur: function (f) { return BY_FLOKKUR[String(f || '').trim()] || 'box'; },
    forCategory: function (k) { return BY_CATEGORY[k] || 'dot'; },
    flokkurSvg: function (f, o) { return svg(BY_FLOKKUR[String(f || '').trim()] || 'box', o); },
    categorySvg: function (k, o) { return svg(BY_CATEGORY[k] || 'dot', o); }
  };
})(typeof window !== 'undefined' ? window : this);
