/* === PRICELIST SEED v1 ===
 * Idempotent insert of new fire-extinguisher products + service entries
 * pulled from the user's pricelist photos (May 2026).
 *
 * Behaviour:
 *  - Runs once on app load.
 *  - For every product in the catalog below, checks the `vorur` table for a
 *    row with the same `nafn` (name); only inserts when missing.
 *  - Marks completion in localStorage (`_pricelist66Seeded`) so we don't
 *    re-query Supabase on every page load.
 *  - Existing rows are NEVER modified — if the user has tweaked a product's
 *    price/description/image, this patch leaves it alone.
 *
 * Prices below are stored as `verd_an_vsk` (canonical column). They were
 * provided by the user as VAT-INCLUSIVE retail prices, so we divide each by
 * 1.24 (24% std VSK) to get the without-VAT figure.
 *
 * To re-run for testing, in browser console:
 *     localStorage.removeItem('_pricelist66Seeded'); location.reload();
 */
(function () {
  'use strict';

  function svgToDataUrl(svg) {
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
  }
  // Same icon helper as demoseed.js: emoji on a coloured square.
  function makeIcon(emoji, bg) {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
            '<rect width="200" height="200" fill="' + bg + '"/>' +
            '<text x="100" y="130" font-size="110" text-anchor="middle">' + emoji + '</text>' +
            '</svg>';
    return svgToDataUrl(s);
  }

  // Custom drawn fire-extinguisher tank icon — used for ABF where the generic
  // 🧯 emoji isn't distinctive enough. bodyHex is the cylinder colour, bgHex is
  // the square background, label is shown on the front decal (e.g. "ABF").
  function makeTankIcon(bodyHex, bgHex, label) {
    // Pre-compute a darker shade of the body for the rounded top/bottom caps.
    var dark = darken(bodyHex, 0.65);
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
              '<rect width="200" height="200" fill="' + bgHex + '"/>' +
              // Pull-pin ring on top
              '<rect x="93" y="18" width="14" height="22" rx="3" fill="#9ca3af"/>' +
              // Lever / handle assembly
              '<rect x="78" y="36" width="44" height="14" rx="3" fill="#1f2937"/>' +
              // Cylinder top dome
              '<ellipse cx="100" cy="55" rx="22" ry="8" fill="' + dark + '"/>' +
              // Cylinder body
              '<rect x="78" y="55" width="44" height="105" fill="' + bodyHex + '"/>' +
              // Cylinder bottom dome
              '<ellipse cx="100" cy="160" rx="22" ry="8" fill="' + dark + '"/>' +
              // Hose curving off to the side
              '<path d="M 78 75 Q 50 95 50 140" stroke="#1f2937" stroke-width="5" ' +
                'fill="none" stroke-linecap="round"/>' +
              // Pressure gauge
              '<circle cx="68" cy="62" r="6" fill="#fff" stroke="#1f2937" stroke-width="1.5"/>' +
              '<line x1="68" y1="62" x2="71" y2="59" stroke="#1f2937" stroke-width="1.5"/>' +
              // White decal/label on the front
              '<rect x="82" y="92" width="36" height="34" rx="2" fill="#fff"/>' +
              '<text x="100" y="115" font-size="14" font-weight="700" ' +
                'text-anchor="middle" fill="#1f2937" ' +
                'font-family="Arial, Helvetica, sans-serif">' + label + '</text>' +
            '</svg>';
    return svgToDataUrl(s);
  }

  // Inspection icon: magnifying glass with two recycle-style arrows around it
  // on the family colour background. Used for every "Yfirferð" (annual
  // inspection) row so it's instantly distinguishable from "Slökkvitæki"
  // (the tank itself) and "Hleðsla" (refill — still uses the tank icon).
  //
  // The two curved arrows symbolise the periodic / recycling nature of an
  // inspection schedule, and the magnifying glass is the universal "examine"
  // metaphor.
  function makeInspectionIcon(bgHex, fgHex) {
    var s =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        '<rect width="200" height="200" fill="' + bgHex + '"/>' +
        // Top recycle arrow: arc from upper-left around the top to upper-right
        '<path d="M 35 95 A 65 65 0 0 1 165 95" ' +
              'stroke="' + fgHex + '" stroke-width="12" fill="none" stroke-linecap="round"/>' +
        // Arrowhead at upper-right pointing down
        '<polygon points="170,92 152,80 160,108" fill="' + fgHex + '"/>' +
        // Bottom recycle arrow: arc from lower-right around the bottom to lower-left
        '<path d="M 165 105 A 65 65 0 0 1 35 105" ' +
              'stroke="' + fgHex + '" stroke-width="12" fill="none" stroke-linecap="round"/>' +
        // Arrowhead at lower-left pointing up
        '<polygon points="30,108 48,120 40,92" fill="' + fgHex + '"/>' +
        // Magnifying glass — circle centred, handle to bottom-right
        '<circle cx="100" cy="100" r="26" stroke="' + fgHex + '" ' +
          'stroke-width="9" fill="' + bgHex + '"/>' +
        '<line x1="119" y1="119" x2="142" y2="142" stroke="' + fgHex + '" ' +
          'stroke-width="11" stroke-linecap="round"/>' +
      '</svg>';
    return svgToDataUrl(s);
  }

  // Refill icon: a big down-arrow above an open container with a wavy
  // fill-line — universal "pour something into a container" metaphor used
  // for every "Hleðsla" (refill) row. Same colour scheme as the inspection
  // icon: family colour background, white symbol on dark colours and dark
  // grey symbol on light colours.
  function makeRefillIcon(bgHex, fgHex) {
    var s =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">' +
        '<rect width="200" height="200" fill="' + bgHex + '"/>' +
        // Big down arrow at top (refill direction)
        '<line x1="100" y1="22" x2="100" y2="78" stroke="' + fgHex + '" ' +
          'stroke-width="14" stroke-linecap="round"/>' +
        '<polyline points="76,60 100,84 124,60" stroke="' + fgHex + '" ' +
          'stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        // Open-top container (rounded bottom, no top — being filled)
        '<path d="M 50 102 L 50 168 Q 50 178 60 178 L 140 178 Q 150 178 150 168 L 150 102" ' +
          'stroke="' + fgHex + '" stroke-width="10" fill="none" ' +
          'stroke-linecap="round" stroke-linejoin="round"/>' +
        // Wavy fill level showing partial liquid (≈60% full)
        '<path d="M 58 140 Q 79 130 100 140 Q 121 150 142 140 L 142 172 Q 142 173 141 173 L 59 173 Q 58 173 58 172 Z" ' +
          'fill="' + fgHex + '" opacity="0.85"/>' +
      '</svg>';
    return svgToDataUrl(s);
  }

  // Lighten/darken a hex colour by multiplying each channel. factor < 1 darkens.
  function darken(hex, factor) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join('');
    var r = Math.round(parseInt(h.slice(0, 2), 16) * factor);
    var g = Math.round(parseInt(h.slice(2, 4), 16) * factor);
    var b = Math.round(parseInt(h.slice(4, 6), 16) * factor);
    function px(v) { return ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2); }
    return '#' + px(r) + px(g) + px(b);
  }
  function showToast(msg, kind) {
    var t = document.createElement('div');
    var bg = kind === 'ok' ? '#10b981' : '#374151';
    t.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:'
      + bg + ';color:#fff;padding:14px 22px;border-radius:10px;z-index:99999;font-weight:600;'
      + 'font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.3);';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .4s';
      t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 500);
    }, 4000);
  }

  // Convert VAT-inclusive price → verd_an_vsk (rounded to whole krónur).
  function exVat(incVat, vskPct) {
    var v = vskPct == null ? 24 : +vskPct;
    return Math.round(+incVat / (1 + v / 100));
  }

  // ---- Catalog -------------------------------------------------------------
  // Real-world colour coding (per user):
  //   ABC Duft (powder) → DARK BLUE  #1e40af
  //   CO₂              → RED        #dc2626
  //   Léttvatn         → CYAN       #06b6d4
  //   ABF (cooking)    → LIGHT BLUE #bfdbfe (with custom drawn tank icon)
  //   Brunaslanga      → ORANGE     #ea580c
  //   Reykskynjari     → AMBER      #f59e0b
  var COLOR_DUFT = '#1e40af';
  var COLOR_CO2  = '#dc2626';
  var COLOR_LETT = '#06b6d4';
  var COLOR_ABF  = '#bfdbfe';

  // ---- Tank icons (one canonical drawing per family) ---------------------
  // Every "tank" — the Slökkvitæki itself, plus Yfirferð and Hleðsla services
  // for that tank — uses the SAME drawn-cylinder icon. Only the background
  // colour and the white front-decal label change per family. CO₂ uses a
  // dark/black body for visibility on its red background; the others all use
  // the standard red extinguisher body.
  var LETT_TANK_ICON = makeTankIcon('#dc2626', COLOR_LETT, 'LV');     // cyan bg, red tank
  var DUFT_TANK_ICON = makeTankIcon('#dc2626', COLOR_DUFT, 'ABC');    // dark-blue bg, red tank
  var ABF_TANK_ICON  = makeTankIcon('#dc2626', COLOR_ABF,  'ABF');    // light-blue bg, red tank
  var CO2_TANK_ICON  = makeTankIcon('#1f2937', COLOR_CO2,  'CO₂');    // red bg, dark tank for contrast

  // ---- Inspection icons (magnifying-glass + recycle arrows) -------------
  // Used for every Yfirferð / Skoðun row so the operator can tell at a glance
  // whether they're picking the tank itself, the refill (Hleðsla), or the
  // annual inspection. Same family colours as the tanks.
  //   Duft / CO₂ / Léttvatn  →  white symbol on dark family colour
  //   ABF (light-blue bg)    →  dark grey symbol for contrast
  var LETT_INSP_ICON = makeInspectionIcon(COLOR_LETT, '#ffffff');     // cyan bg, white glass+arrows
  var DUFT_INSP_ICON = makeInspectionIcon(COLOR_DUFT, '#ffffff');     // dark-blue bg, white symbol
  var ABF_INSP_ICON  = makeInspectionIcon(COLOR_ABF,  '#1f2937');     // light-blue bg, dark symbol
  var CO2_INSP_ICON  = makeInspectionIcon(COLOR_CO2,  '#ffffff');     // red bg, white symbol

  // ---- Refill icons (down-arrow + container with wavy fill) -------------
  // Used for every Hleðsla / Áfylling row. Same family-colour background,
  // same white-on-dark / dark-on-light foreground convention as inspections.
  var LETT_REFILL_ICON = makeRefillIcon(COLOR_LETT, '#ffffff');       // cyan bg, white refill
  var DUFT_REFILL_ICON = makeRefillIcon(COLOR_DUFT, '#ffffff');       // dark-blue bg, white refill
  var ABF_REFILL_ICON  = makeRefillIcon(COLOR_ABF,  '#1f2937');       // light-blue bg, dark refill
  var CO2_REFILL_ICON  = makeRefillIcon(COLOR_CO2,  '#ffffff');       // red bg, white refill

  var products = [
    // ----- Extinguishers (flokkur: Slökkvitæki) — all share the tank look -
    { nafn: 'Slökkvitæki Léttvatn 6 ltr', incVat: 14500, flokkur: 'Slökkvitæki',
      lysing: 'Vatnsslökkvitæki – fyrir A-flokks elda',
      icon: LETT_TANK_ICON },
    { nafn: 'Slökkvitæki Duft 6 kg',      incVat: 13900, flokkur: 'Slökkvitæki',
      lysing: 'Duftslökkvitæki – A, B, C flokkar',
      icon: DUFT_TANK_ICON },
    { nafn: 'Slökkvitæki Duft 2 kg',      incVat:  8124, flokkur: 'Slökkvitæki',
      lysing: 'Lítið duftslökkvitæki – fyrir bíla og minni rými',
      icon: DUFT_TANK_ICON },
    { nafn: 'Slökkvitæki ABF 6 ltr',      incVat: 29685, flokkur: 'Slökkvitæki',
      lysing: 'ABF / F-class – fyrir matarolíu og eldhúsi',
      icon: ABF_TANK_ICON },
    { nafn: 'Slökkvitæki CO₂ 5 kg',       incVat: 26900, flokkur: 'Slökkvitæki',
      lysing: 'Koltvísýringsslökkvitæki – fyrir rafmagn og rafeindatæki',
      icon: CO2_TANK_ICON },
    { nafn: 'Slökkvitæki CO₂ 2 kg',       incVat: 16752, flokkur: 'Slökkvitæki',
      lysing: 'Lítið CO₂ slökkvitæki – fyrir bíla og skrifstofur',
      icon: CO2_TANK_ICON },

    // ----- Services: Yfirferð / Inspection (flokkur: Þjónusta) ------------
    // Each Yfirferð row uses the magnifying-glass + recycle-arrows icon on
    // the family's background colour. This visually separates inspections
    // from the tank itself (Slökkvitæki) and from refills (Hleðsla, which
    // keep the tank icon).
    { nafn: 'Yfirferð Léttvatn',          incVat:  3906, flokkur: 'Þjónusta',
      lysing: 'Árleg yfirferð á léttvatns-slökkvitæki',
      icon: LETT_INSP_ICON },
    { nafn: 'Yfirferð Duft',              incVat:  4200, flokkur: 'Þjónusta',
      lysing: 'Árleg yfirferð á duftslökkvitæki',
      icon: DUFT_INSP_ICON },
    { nafn: 'Yfirferð ABF 6 ltr',         incVat:  3584, flokkur: 'Þjónusta',
      lysing: 'Árleg yfirferð á ABF slökkvitæki',
      icon: ABF_INSP_ICON },
    { nafn: 'Yfirferð CO₂ 5 kg',          incVat:  4055, flokkur: 'Þjónusta',
      lysing: 'Árleg yfirferð á CO₂ slökkvitæki',
      icon: CO2_INSP_ICON },
    { nafn: 'Yfirferð CO₂ 2 kg',          incVat:  4055, flokkur: 'Þjónusta',
      lysing: 'Árleg yfirferð á CO₂ slökkvitæki',
      icon: CO2_INSP_ICON },
    { nafn: 'Yfirferð Brunaslanga',       incVat:  5389, flokkur: 'Þjónusta',
      lysing: 'Yfirferð og þrýstiprófun á brunaslöngu',
      icon: makeIcon('🚒', '#ea580c') },
    { nafn: 'Yfirferð Reykskynjari',      incVat:  2909, flokkur: 'Þjónusta',
      lysing: 'Yfirferð og prófun á reykskynjara',
      icon: makeIcon('🚨', '#f59e0b') },

    // ----- Services: Hleðsla / Refill (flokkur: Þjónusta) -----------------
    // Each Hleðsla row uses the same tank icon as its family — keeps the
    // family identity strong (red CO₂ tank, blue ABC tank, etc).
    { nafn: 'Hleðsla Léttvatn',           incVat:  8410, flokkur: 'Þjónusta',
      lysing: 'Áfylling á léttvatns-slökkvitæki',
      icon: LETT_TANK_ICON },
    { nafn: 'Hleðsla Duft',               incVat:  8410, flokkur: 'Þjónusta',
      lysing: 'Áfylling á duftslökkvitæki',
      icon: DUFT_TANK_ICON },
    { nafn: 'Hleðsla Duft 2 kg',          incVat:  5200, flokkur: 'Þjónusta',
      lysing: 'Áfylling á 2 kg duftslökkvitæki',
      icon: DUFT_TANK_ICON },
    { nafn: 'Hleðsla ABF 6 ltr',          incVat: 18340, flokkur: 'Þjónusta',
      lysing: 'Áfylling á ABF slökkvitæki',
      icon: ABF_TANK_ICON },
    { nafn: 'Hleðsla CO₂ 5 kg',           incVat:  8556, flokkur: 'Þjónusta',
      lysing: 'Áfylling á CO₂ slökkvitæki',
      icon: CO2_TANK_ICON },
    { nafn: 'Hleðsla CO₂ 2 kg',           incVat:  4216, flokkur: 'Þjónusta',
      lysing: 'Áfylling á 2 kg CO₂ slökkvitæki',
      icon: CO2_TANK_ICON },
    // Special: ice-cube on RED background (CO₂ family colour) — denotes the
    // freezer prep step before refilling a CO₂ cylinder.
    { nafn: 'CO₂ byrjunargjald',          incVat:  1240, flokkur: 'Þjónusta',
      lysing: 'Stofngjald fyrir CO₂ áfyllingu — tankurinn settur í frysti fyrst',
      icon: makeIcon('🧊', COLOR_CO2) }
  ];

  // ---- Legacy item re-colour ----------------------------------------------
  // Pre-existing rows in the user's DB whose icons should be replaced with
  // the new canonical tank style. Names match what the user already has.
  var legacyIconFixes = [
    // From the original demoseed.js (5kg variants) — these are tanks
    { nafn: 'Slökkvitæki 6kg ABC Duft',          icon: DUFT_TANK_ICON },
    { nafn: 'Slökkvitæki 2kg CO₂',               icon: CO2_TANK_ICON  },
    // Áfylling (legacy refill) entries — also use tank icon to match Hleðsla
    { nafn: 'Áfylling 2kg ABC Duft',             icon: DUFT_TANK_ICON },
    { nafn: 'Áfylling 6kg ABC Duft',             icon: DUFT_TANK_ICON },
    { nafn: 'Áfylling 12kg ABC Duft',            icon: DUFT_TANK_ICON },
    { nafn: 'Áfylling 2kg CO₂',                  icon: CO2_TANK_ICON  },
    { nafn: 'Áfylling 5kg CO₂',                  icon: CO2_TANK_ICON  },
    { nafn: 'Áfylling Léttvatnstækis 6kg',       icon: LETT_TANK_ICON }
  ];

  async function seed() {
    if (!window.DB || !DB.sb) { setTimeout(seed, 600); return; }

    // Fetch every existing row (name + current icon) so we can:
    //  - decide which products to insert (missing names)
    //  - decide which existing rows need their icon re-coloured
    var existingByName = {};
    try {
      var r = await DB.sb.from('vorur').select('id,nafn,mynd');
      if (r.error) {
        console.warn('[pricelist-seed] could not read vorur:', r.error.message);
        return;
      }
      (r.data || []).forEach(function (p) {
        existingByName[String(p.nafn || '').trim().toLowerCase()] = p;
      });
    } catch (e) {
      console.warn('[pricelist-seed] exception reading vorur:', e);
      return;
    }

    // ---- Step 1: insert any missing products/services ---------------------
    if (!localStorage.getItem('_pricelist66Seeded')) {
      // Respect user deletions — names in AppSettings.sala.deleted_product_names
      // were explicitly removed and should never be re-seeded.
      var tombstoned = {};
      try{
        var dpn = window.AppSettings && window.AppSettings.path && window.AppSettings.path('sala.deleted_product_names');
        if (Array.isArray(dpn)) dpn.forEach(function(n){ tombstoned[String(n||'').trim().toLowerCase()] = true; });
      } catch(_){}
      var rows = products
        .filter(function (p) {
          var key = p.nafn.toLowerCase();
          return !existingByName[key] && !tombstoned[key];
        })
        .map(function (p) {
          return {
            nafn: p.nafn,
            lysing: p.lysing || '',
            verd_an_vsk: exVat(p.incVat, 24),
            vsk_prosenta: 24,
            birgdir: 0,
            flokkur: p.flokkur,
            mynd: p.icon || '',
            virkt: true
          };
        });

      if (rows.length) {
        var ins = await DB.sb.from('vorur').insert(rows).select();
        if (ins.error) {
          console.warn('[pricelist-seed] insert failed:', ins.error.message);
        } else {
          // Refresh existingByName with the just-inserted rows so the icon
          // migration below sees them.
          (ins.data || []).forEach(function (p) {
            existingByName[String(p.nafn || '').trim().toLowerCase()] = p;
          });
          console.log('[pricelist-seed] inserted ' + (ins.data || []).length + ' new products/services');
          showToast('✓ ' + rows.length + ' nýjar vörur/þjónustur skráðar', 'ok');
        }
      }
      localStorage.setItem('_pricelist66Seeded', 'seeded-' + Date.now());
    }

    // ---- Step 2: icon migration ------------------------------------------
    // Re-paint icons on existing rows so the colour scheme matches the user's
    // real-world coding (Duft = dark blue, CO₂ = red, ABF = custom tank).
    // Safe to re-run, only updates rows whose current `mynd` is one of our
    // generated SVG-data-URLs (user-uploaded photos are preserved untouched).
    // Bump the localStorage key whenever the catalog colours change so every
    // browser re-runs the migration once.
    if (!localStorage.getItem('_pricelist66IconsV8')) {
      var updates = 0;
      var migrationList = products.concat(legacyIconFixes);
      for (var i = 0; i < migrationList.length; i++) {
        var spec = migrationList[i];
        var existing = existingByName[spec.nafn.toLowerCase()];
        if (!existing || !existing.id) continue;
        if (existing.mynd === spec.icon) continue;
        // Skip rows whose current icon isn't one of our generated SVGs
        // (e.g. user-uploaded photo). Empty icon = OK to fill in.
        if (existing.mynd && existing.mynd.indexOf('data:image/svg+xml;base64,') !== 0) continue;
        try {
          var u = await DB.sb.from('vorur').update({ mynd: spec.icon }).eq('id', existing.id);
          if (!u.error) updates++;
        } catch (e) { /* ignore individual row failures */ }
      }
      localStorage.setItem('_pricelist66IconsV8', 'migrated-' + Date.now());
      if (updates) {
        console.log('[pricelist-seed] re-coloured ' + updates + ' icons');
        showToast('🎨 ' + updates + ' tákn uppfærð', 'ok');
      }
    }

    // Force the products view to refresh so changes appear immediately.
    var view = document.getElementById('view-vorur');
    if (view && view.classList.contains('active')) {
      view.innerHTML = '';
    }
  }

  setTimeout(seed, 2500);
})();
/* === END PRICELIST SEED === */
