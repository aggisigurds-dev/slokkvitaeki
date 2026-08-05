/* ============================================================================
 * discount-engine.js — AFSLÁTTARHÓPAR (category discount tiers), 2026-08-05
 *
 * Hrein reiknivél, engin DOM- eða DB-snerting. Keyrir bæði í vafra og í Node
 * svo Sala, reikningagerð og bakendinn reikni ALLTAF sömu tölu.
 *
 *   Vafri:            <script src="/js/discount-engine.js">  → window.DiscountEngine
 *   Netlify-fall/ESM: import '../../js/discount-engine.js';
 *                     const DiscountEngine = globalThis.DiscountEngine;
 *   CommonJS:         const DiscountEngine = require('./discount-engine.js');
 *
 * (Skráin er venjulegt script — ekki ESM-modúla — því vafrinn hleður henni með
 * <script defer> eins og öllum öðrum js/ skrám í þessu appi.)
 *
 * Reglan (ósk Agnars 2026-08-05):
 *   „öll þessi afsláttarhópar ganga framar heldur en afsláttur af öllu"
 *
 *   • Á línu sem lendir í flokki þar sem hópurinn hefur prósentu skráða
 *     (líka 0) → sú prósenta gildir og almenni afslátturinn er hunsaður.
 *   • Sé reiturinn AUÐUR (null) í hópnum → almenni afslátturinn
 *     (fyrirtaeki.afslattur_pct) gildir á þá línu eins og áður.
 *   • Enginn hópur → allt óbreytt (almennur afsláttur eða ekkert).
 *
 * Flokkarnir sex (sbr. sql/2026-08-05_afslattarhopar.sql):
 *   ext_refill · ext_service · hose_service · detector_service ·
 *   general_service · hardware_purchase
 * ========================================================================== */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DiscountEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this), function () {
  'use strict';

  var CATEGORIES = [
    { key: 'ext_refill',        col: 'ext_refill_pct',        label: 'Hleðsla slökkvitækja',   stutt: 'Hleðsla',    icon: '🔥' },
    { key: 'ext_service',       col: 'ext_service_pct',       label: 'Yfirferð slökkvitækja',  stutt: 'Yfirferð',   icon: '🧯' },
    { key: 'hose_service',      col: 'hose_service_pct',      label: 'Yfirferð brunaslangna',  stutt: 'Brunaslöngur', icon: '💧' },
    { key: 'detector_service',  col: 'detector_service_pct',  label: 'Yfirferð og þjónusta reykskynjara', stutt: 'Reykskynjarar', icon: '🚨' },
    { key: 'general_service',   col: 'general_service_pct',   label: 'Aðrir þjónustuliðir',    stutt: 'Þjónusta',   icon: '🛠️' },
    { key: 'hardware_purchase', col: 'hardware_purchase_pct', label: 'Ný tæki og vörur',       stutt: 'Ný tæki',    icon: '📦' }
  ];
  var BY_KEY = {};
  CATEGORIES.forEach(function (c) { BY_KEY[c.key] = c; });

  // ── Flokkun ───────────────────────────────────────────────────────────────
  // Vöruskráin (`vorur`) er ekki merkt þessum sex flokkum, svo við lesum úr
  // `flokkur` + `nafn`. Raunveruleg dæmi úr skránni eru í prófunum neðst í
  // skjalinu (docs) — „Duft 6 kg. ABC hleðsla" → ext_refill, „Yfirferð
  // Brunaslanga" → hose_service, „Reykskynjari" (vara) → hardware_purchase.
  var SERVICE_FLOKKAR = [
    'þjónusta', 'vinna', 'vinna og akstur', 'hleðsla slökkvitækja', 'yfirferð slökkvitækja'
  ];
  var RE_REFILL   = /(hleðsl|hledsl|hlesl|áfyll|afyll|byrjunargjald|\bhl\.)/;
  var RE_CHECK    = /(yfirfer|yfirferd|skoðun|skodun|ársskoð|arsskod|prófun|profun)/;
  var RE_HOSE     = /(brunaslang|brunaslöng|brunaslong|slöngu|slongu|slanga|slöngur)/;
  var RE_DETECTOR = /(skynjar)/;
  var RE_SERVICE  = /(þjónust|thjonust|vinna|akstur|uppsetning|skýrslu|skyrslu|vottun|förgun|forgun|þrif|hreinsun|viðger|vidger|viðhald|vidhald)/;
  var RE_SYSTEM   = /(brunakerf|viðvörunarkerf|vidvorunarkerf|kerfis)/;
  var RE_CO2      = /(co₂|co2|kolsýr|kolsyr)/;
  var RE_GRAMM    = /\d+\s*(gr|g)\b/;

  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().trim();
  }

  // Handvirk flokkun slær sjálfvirku regluna út. `overrides` er einfalt kort
  // { "<vöru-id>": "<flokkslykill>" } úr app_settings (sjá patch 296) — þar
  // getur Agnar dregið vöru í annan flokk eða tekið hana alveg út (NONE).
  var NONE = 'none';                      // „ekki með í neinum hópsflokki"

  function overrideFor(item, overrides) {
    if (!overrides || !item) return null;
    var id = item.id != null ? item.id : (item.product_id != null ? item.product_id : null);
    if (id == null) return null;
    var v = overrides[String(id)];
    if (!v) return null;                  // null/'' = engin handvirk stilling
    return (BY_KEY[v] || v === NONE) ? v : null;
  }

  /**
   * classifyItem({ id, nafn|desc, flokkur, type }[, overrides]) → category key
   * Handvirk stilling fyrst, svo sértækasti sjálfvirki flokkurinn; allt sem er
   * ekki þjónusta telst „ný tæki/vörur".
   */
  function classifyItem(item, overrides) {
    if (typeof item === 'string') item = { nafn: item };
    item = item || {};
    var ov = overrideFor(item, overrides);
    if (ov) return ov;
    var name = norm(item.nafn || item.desc || item.name);
    var flokkur = norm(item.flokkur);

    var isService =
      SERVICE_FLOKKAR.indexOf(flokkur) >= 0 ||
      item.type === 'service' ||
      RE_REFILL.test(name) || RE_CHECK.test(name) || RE_SERVICE.test(name);

    if (!isService) return 'hardware_purchase';

    // Brunakerfi/viðvörunarkerfi eru sjálfstæð þjónusta — ekki „yfirferð
    // slökkvitækja" þótt orðið ársskoðun komi fyrir.
    if (RE_SYSTEM.test(name)) return 'general_service';
    if (RE_HOSE.test(name)) return 'hose_service';
    if (RE_DETECTOR.test(name)) return 'detector_service';
    if (RE_REFILL.test(name) || flokkur === 'hleðsla slökkvitækja') return 'ext_refill';
    if (RE_CO2.test(name) && RE_GRAMM.test(name)) return 'ext_refill'; // „CO₂ 100 gr."
    if (RE_CHECK.test(name) || flokkur === 'yfirferð slökkvitækja') return 'ext_service';
    return 'general_service';
  }

  // ── Tölur ─────────────────────────────────────────────────────────────────
  // Kommu-þolið (Agnar slær inn „12,5" jafnt sem „12.5"); tómt/NULL skilar null
  // — það er merkingarmunur á „ekkert sett" og „0%".
  function parsePct(v) {
    if (v === null || v === undefined) return null;
    var s = String(v).trim();
    if (!s) return null;
    var n = parseFloat(s.replace(/\s/g, '').replace(',', '.'));
    if (!isFinite(n)) return null;
    return Math.max(0, Math.min(100, n));
  }
  function fmtPct(p) {
    return (Math.round(p * 100) / 100).toString().replace('.', ',');
  }

  /** Prósenta hópsins fyrir tiltekinn flokk — null ef reiturinn er auður. */
  function tierPct(tier, categoryKey) {
    if (!tier) return null;
    var cat = BY_KEY[categoryKey];
    if (!cat) return null;
    if (tier.virkt === false) return null;
    return parsePct(tier[cat.col]);
  }

  /** Ber hópurinn yfirhöfuð einhverja prósentu? */
  function tierHasAny(tier) {
    return CATEGORIES.some(function (c) { return parsePct(tier && tier[c.col]) !== null; });
  }

  function tierOf(clientRow, opts) {
    return (clientRow && (clientRow.discount_tier || clientRow.afslattarhopur)) ||
           (opts && opts.tier) || null;
  }

  /**
   * calculateLineItemPrice(clientRow, itemCategory, basePrice[, opts])
   *
   * @param clientRow    { afslattur_pct, discount_tier|afslattarhopur }
   *                     — röðin úr fyrirtaeki/vidskiptavinir með hópinn tengdan.
   * @param itemCategory flokkslykill ('ext_refill' …) EÐA vöruhlutur
   *                     ({nafn, flokkur}) sem er þá flokkaður sjálfkrafa.
   * @param basePrice    grunnverð línunnar (ISK, án VSK í Sölu).
   * @param opts         { tier, qty } — tier ef hópurinn er ekki á clientRow.
   * @returns {{category, category_label, discount_pct, discount_source,
   *            discount_desc, base_price, final_price, saved}}
   */
  function calculateLineItemPrice(clientRow, itemCategory, basePrice, opts) {
    opts = opts || {};
    var baseNum = parseFloat(String(basePrice == null ? 0 : basePrice).replace(',', '.'));
    var base = (isFinite(baseNum) && baseNum > 0) ? baseNum : 0;

    var category = (typeof itemCategory === 'string' && (BY_KEY[itemCategory] || itemCategory === NONE))
      ? itemCategory
      : classifyItem(itemCategory, opts.overrides);
    var cat = BY_KEY[category] ||
      { key: NONE, col: null, label: 'Utan hópsflokka', stutt: 'Utan flokka', icon: '🚫' };

    var tier = tierOf(clientRow, opts);
    var fromTier = tierPct(tier, category);
    var flat = parsePct(clientRow && clientRow.afslattur_pct) || 0;

    var pct, source, desc;
    if (fromTier !== null) {
      // Hópurinn gengur framar — líka þegar hann segir 0%.
      pct = fromTier;
      source = 'tier';
      desc = pct > 0
        ? 'Afsláttarhópur „' + (tier.tier_name || 'ónefndur') + '" · ' + cat.label + ' −' + fmtPct(pct) + '%'
        : 'Afsláttarhópur „' + (tier.tier_name || 'ónefndur') + '" · ' + cat.label + ' — enginn afsláttur';
    } else if (flat > 0) {
      pct = flat;
      source = 'flat';
      desc = 'Almennur afsláttur −' + fmtPct(flat) + '%';
    } else {
      pct = 0;
      source = 'none';
      desc = '';
    }

    var final_price = Math.round(base * (1 - pct / 100));
    return {
      category: category,
      category_label: cat.label,
      discount_pct: pct,
      discount_source: source,          // 'tier' | 'flat' | 'none'
      discount_desc: desc,
      base_price: base,
      final_price: final_price,
      saved: Math.round(base) - final_price
    };
  }

  /**
   * Heil karfa: skilar línunum með afslætti + vigtaðri prósentu fyrir
   * körfu-afsláttinn (línur sem fengu hóps-afslátt mega ekki fá hann aftur).
   */
  function calculateCart(clientRow, lines, opts) {
    lines = lines || [];
    var flat = parsePct(clientRow && clientRow.afslattur_pct) || 0;
    // Línurnar fá AÐEINS hóps-afsláttinn bakaðan inn (nákvæmlega eins og
    // `disc_pct` í Sölu, patch 296). Almenni afslátturinn er einn á körfuna og
    // skilar sér sem `cart_discount_pct` — annars væri hann talinn tvisvar.
    var out = lines.map(function (l) {
      var r = calculateLineItemPrice(clientRow, l.category || l, l.unit_price_ex_vat != null ? l.unit_price_ex_vat : l.basePrice, opts);
      if (r.discount_source === 'flat') {
        r.discount_pct = 0;
        r.final_price = Math.round(r.base_price);
        r.saved = 0;
        r.discount_source = 'cart_flat';   // fær afsláttinn á körfustigi
      }
      r.qty = Math.max(0, +l.qty || 0);
      return r;
    });
    var tot = 0, open = 0;
    out.forEach(function (r) {
      var s = r.qty * r.final_price;
      tot += s;
      if (r.discount_source !== 'tier') open += s;
    });
    return {
      lines: out,
      // Prósentan sem má leggja á KÖRFUNA í heild eftir að hóps-afslættir eru
      // bakaðir í línurnar (0 ef hópurinn nær yfir allt).
      cart_discount_pct: tot > 0 ? Math.round(flat * open / tot * 10) / 10 : flat
    };
  }

  return {
    CATEGORIES: CATEGORIES,
    NONE: NONE,
    byKey: function (k) { return BY_KEY[k] || null; },
    classifyItem: classifyItem,
    parsePct: parsePct,
    fmtPct: fmtPct,
    tierPct: tierPct,
    tierHasAny: tierHasAny,
    calculateLineItemPrice: calculateLineItemPrice,
    calculateCart: calculateCart
  };
});
