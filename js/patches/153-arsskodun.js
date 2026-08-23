/* === ÁRSSKOÐUN v1 ===
 *
 * New top-level sidebar tab "📋 Ársskoðun" — replaces the role that the
 * old Fyrirtækjaþjónustu page had for once-per-year fire-extinguisher
 * inspection customers. Old Fyrirtækjaþjónusta is left untouched.
 *
 * What it shows
 *   • 295 companies that appear in the úttektarskýrslur sheet
 *   • Per-company: kennitala, address, monthly inspection slot, latest
 *     inspection status (2026 done? 2025?), equipment counts, estimated
 *     yearly service revenue (computed from equipment × yfirferð prices,
 *     adjusted by Áminning discount), Áminning note from skuldunautaskrá.
 *
 * Views
 *   • Card view (default) — visual grid like Brunakerfisþjónusta
 *   • List view — dense table, sortable, searchable
 *   • Toggle preserved via localStorage
 *
 * Filters
 *   • Month chips — show only companies whose inspection slot is that month
 *   • Status chips — "Búið 2026" / "Eftir 2026" / "Allt"
 *   • Free-text search (matches name, kt, address)
 *
 * Sort
 *   • Alphabetical (default for card view)
 *   • By inspection month (Jan-Dec → current year roll-over)
 *   • By last-serviced date (oldest first — i.e. most overdue)
 *
 * Detail modal
 *   • Equipment counts in a small grid
 *   • Áminning note (special pricing)
 *   • Estimated yearly revenue
 *   • History list (last inspections by year)
 *   • Quick links to: Fyrirtæki detail · Þjónustutæki (map) · Brunakerfi
 *
 * Data source
 *   • AppSettings.arsskodun_customers — written by tmp_import_arsskodun.mjs
 *     and tmp_enrich_arsskodun.mjs. Schema:
 *       <co_id>: { co_id, equipment:{lettvatn,duft2,duft6_12,co2_2,co2_5,
 *                  brunaslongur,eldvarnarteppi,reykskynjarar},
 *                  inspect_month, last_year_inspected, last_skodun,
 *                  last_skra, annad, history:[…],
 *                  aminning, aminning_parsed, estimated_yearly }
 */
(() => {
  if (window.__arsskodunInstalled) return;
  window.__arsskodunInstalled = true;

  const VIEW_ID = 'view-arsskodun';
  const NAV_KEY = 'arsskodun';
  const STORAGE_KEY = 'arsskodun_customers';
  const LS_VIEW = 'arsskodun_view2';
  const LS_SORT = 'arsskodun_sort';
  const LS_SORTCOL = 'arsskodun_sortCol';
  const LS_SORTDIR = 'arsskodun_sortDir';
  const LS_MONTH = 'arsskodun_month';
  const LS_MONTHS = 'arsskodun_months'; // 2026-07-31: fjöl-val mánaða (fylki; 0 = án mánaðar)
  const LS_STATUS = 'arsskodun_status';
  const LS_SEARCH = 'arsskodun_search';
  // 2026-08-11 (ósk Agnars): fela „slepptir í fyrra" úr ÖLLUM öðrum sýnum og úr
  // talningunum. Þeir eru sofandi kúnnar (endurvirkjunar-listi), ekki vinna sem
  // stendur eftir á árinu — þeir blésu upp „Eftir"-tölurnar og duldu hvað er
  // raunverulega eftir hjá virku kúnnunum.
  const LS_SKIPHIDE = 'arsskodun_hideSkipped';
  // 2026-08-12 (ósk Agnars): póstnúmera-sían — 'all' = engin sía (öll númer),
  // annars JSON-fylki af völdum númerum ('' = fyrirtæki án skráðs póstnúmers).
  const LS_POSTNR = 'arsskodun_postnr';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) {
    const v = Math.round(Number(n) || 0);
    if (!v) return '—';
    return v.toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function fmtKrShort(n) {
    const v = Math.round(Number(n) || 0);
    if (v === 0) return '—';
    if (v >= 1000000) return (v / 1000000).toFixed(1).replace('.0','').replace('.', ',') + 'M';
    if (v >= 10000) return Math.round(v / 1000) + 'þ';
    if (v >= 1000) return (v / 1000).toFixed(1).replace('.', ',') + 'þ';
    return String(v);
  }
  const MONTHS_IS = ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'];
  const MONTHS_IS_SHORT = ['Jan','Feb','Mar','Apr','Maí','Jún','Júl','Ágú','Sep','Okt','Nóv','Des'];

  // 2026-06: yearly estimate = Σ(tæki × Yfirferð) + these per-company add-ons.
  // NO recharge (hleðsla) — Agnar's choice, recharge isn't a yearly cost.
  const SKYRSLUGERD = 4340;   // Skýrslugerð: 3500 + 24% VSK (once per year)
  const AKSTUR_UNIT = 3720;   // Akstur: 3000 + 24% VSK × akstur_multiplier
  // Filter out junk áminning entries — sometimes the sheet has "0 kr",
  // "FALSE", or short throwaway strings that aren't real notes.
  //
  // Some rows got polluted with a leading "FALSE" / "TRUE" / "0 kr" /
  // "FALSE\n" prefix during the earlier Viðskiptavinir-sheet enrichment
  // (the parser read one column too early — c[38]=Falinn? instead of
  // c[39]=Áminning). Cheaper to strip at read time than to re-import.
  function cleanAminning(s) {
    let t = String(s == null ? '' : s).trim();
    if (!t) return '';
    // Strip junk prefix (single token + separator)
    t = t.replace(/^(false|true|0\s*kr|null|—|-)\s*[\n,;.\s]*/i, '').trim();
    if (!t) return '';
    if (/^(0\s*kr|false|true|—|-|0|null)$/i.test(t)) return '';
    if (t.length < 4) return '';                 // single words / typos
    if (/^h(æ|a)\s*h(ó|o)w*\s*$/i.test(t)) return ''; // "hæ hó" test entry
    return t;
  }

  function fmtKt(k) {
    const s = String(k || '').replace(/[^0-9]/g, '');
    if (s.length === 10) return s.slice(0, 6) + '-' + s.slice(6);
    return s || '';
  }

  // ── Data loader ──────────────────────────────────────────────────────────
  let _cache = { list: [], byId: {}, allCompanies: [] };
  // Stale-while-revalidate (verkefnalisti c881bcfa, 2026-07-09): síðasta
  // reiknaða listanum er haldið í localStorage svo kald opnun málar STRAX
  // (gamla eintakið) og ferskt hleðst hljóðlega í bakgrunni — í stað þess að
  // síminn horfi á „Hleður…" (eða, verra, tóma „0 fyrirtæki" síðu) í nokkrar
  // sekúndur meðan fjórar töflur eru sóttar.
  const SNAP_KEY = 'ars_snapshot_v1';
  let _loadingAll = false;   // satt meðan loadAll er í gangi — stýrir „Hleður"-tómastöðunni
  function readSnapshot() {
    try {
      const s = JSON.parse(localStorage.getItem(SNAP_KEY) || 'null');
      return (s && Array.isArray(s.list) && s.list.length) ? s : null;
    } catch (_) { return null; }
  }
  function writeSnapshot() {
    // tolur fylgir með svo talnakortin sýni síðustu þekktu tölu STRAX á
    // snapshot-málun (í stað „—" þar til ferska sóknin klárar).
    try { localStorage.setItem(SNAP_KEY, JSON.stringify({ t: Date.now(), list: _cache.list, tolur: _cache.tolur || null })); }
    catch (_) {}   // t.d. QuotaExceeded — snapshot er bara hraðabót
  }

  async function loadAll() {
    _loadingAll = true;
    try { return await _loadAllInner(); } finally { _loadingAll = false; }
  }
  async function _loadAllInner() {
    const SB = getSB();
    if (!SB) return;

    // 2026-06-21 (perf): kick off the INDEPENDENT loads CONCURRENTLY instead of
    // awaiting them one-by-one. The cold open spent ~3s here because AppSettings,
    // fyrirtaeki, uttaeki (6 pages) and vorur were fetched sequentially even
    // though none depends on another — running them in parallel collapses the
    // wall-clock to the slowest single chain. (Paging WITHIN each fetch is still
    // sequential, as it must be.)
    const appSettingsP = (window.AppSettings && window.AppSettings.load)
      ? Promise.resolve(window.AppSettings.load()).catch(() => {})
      : Promise.resolve();
    // Load ALL fyrirtaeki rows. Supabase caps each response at 1000 rows
    // (server-side "Max rows"), so .range() alone is not enough — page through.
    const companiesP = DB.fetchAll((from, to) => SB.from('fyrirtaeki')
      .select('id,nafn,kennitala,simi,farsimi,heimilisfang,netfang,tengiliður,athugasemdir,vefsida,er_i_thjonustu,customer_base_id,created_at,postnumer,plan_note')
      .is('deleted_at', null)
      .order('nafn')
      .range(from, to)).catch(error => { console.error('[arsskodun] loadAll', error); return null; });
    // 2026-06-01: tæki count + estimated yearly revenue are DERIVED LIVE from the
    // real uttaeki table (status='active'); pricing from the vorur "yfirferð"
    // rates (single source of truth) with hardcoded fallbacks. Both run in
    // parallel with the company + settings loads.
    const unitsP = loadActiveUnitsByClient(SB).catch(() => ({}));
    const nextInspP = loadNextInspByClient(SB).catch(() => ({}));
    const priceP = loadYfirferdPrices(SB).catch(() => ({}));
    // 2026-07-14: authoritative "last inspection" facts parsed from each
    // company's most-recent úttektarskýrsla PDF (inspection month + per-category
    // device counts). Table arsskodun_report_facts is populated by the report
    // extractor. When a company has a facts row it becomes the source of truth
    // for BOTH the Skoðun month and the Tæki count — overriding the name-matched
    // uttaeki guess (auto-generated placeholders) and any stale blob month.
    const factsP = SB.from('arsskodun_report_facts')
      .select('fyrirtaeki_id,inspect_month,equipment,report_year,total_devices')
      .then(r => (r && r.data) || [])
      .catch(() => []);
    // 2026-08-17 (Agnar — Pizzan: „everything yellow but still Skoðað 2026 …
    // link that also to the 26 label color"): fact-check staða yfirstandandi
    // árs (year_factcheck, sama tafla og árs-merkin í 187/199) TROMPAR
    // „Skoðað <ár>"-stöðuna: 'gap' (gult) = EKKI búið · 'human' (grænt) = búið
    // · annars ræður blobbinn (last_year_inspected). Tvísmellur á '26-merkið
    // verður þannig rofinn fyrir stöðuna líka.
    const fcCurP = SB.from('year_factcheck').select('co_id,status').eq('year', new Date().getFullYear())
      .then(r => { const m = {}; ((r && r.data) || []).forEach(x => { m[String(x.co_id)] = x.status; }); return m; })
      .catch(() => ({}));
    // 2026-08-19 (Agnar #11 — „fyrirtæki í þjónustu are not syncing to ársskoðun …
    // Hamraborg 7"): document_pairs klarad úttektar-pör yfirstandandi árs (per
    // fyrirtaeki_id) er DVARANDI „úttekt ársins fullbúin"-merkið sem Agnar viðheldur
    // handvirkt þvert á öppin. Það TROMPAR staðnað `gap`-flagg í isDoneYear (gap var
    // oft skrifað ÁÐUR en verkið kláraðist). Sami lykill og '26-merkin í 187/199.
    const klaradCurP = SB.from('document_pairs').select('fyrirtaeki_id')
      .eq('year', new Date().getFullYear()).eq('service_type', 'uttekt').eq('status', 'klarad')
      .then(r => { const s = new Set(); ((r && r.data) || []).forEach(x => { if (x.fyrirtaeki_id != null) s.add(String(x.fyrirtaeki_id)); }); return s; })
      .catch(() => new Set());
    // 2026-08-13 (Agnar): talnakortin þrjú efst (Fjöldi / Búið / Eftir) lesa
    // EINA sannleikstölu úr Supabase-viewinu v_thjonustu_tolur í stað
    // staðbundinna JS-útreikninga sem ráku í sundur við grunninn
    // (689/309/314 á kortunum vs 612/245/263 í grunninum). buid_2026 +
    // eftir_2026 = i_arsskodun alltaf. Á villu sýna kortin „—", aldrei
    // heimareiknaða tölu.
    const tolurP = SB.from('v_thjonustu_tolur').select('*').single()
      .then(r => (r && r.data) || null)
      .catch(() => null);
    // 2026-08-14: besti þekkti skoðunarmánuðurinn úr v_skodunar_manudur —
    // sameinar skýrslu- OG reikninga-mánuði (44 staðir eiga mánuð sem kemur
    // AÐEINS úr úttektar-reikningi, t.d. Norðurbrú 1 → maí). Fyllir aðeins í
    // eyðu, á undan next_insp-ágiskuninni.
    const skManP = SB.from('v_skodunar_manudur').select('fyrirtaeki_id,inspect_month,heimild').limit(3000)
      .then(r => (r && r.data) || [])
      .catch(() => []);
    // 2026-07-17 (❓ Óvíst triage): skýrslu-ÁR hvers félags úr customer_documents
    // (Drive-hryggnum) — knýr sönnunar-merkin á Óvíst-flipanum. Síðuskipt (töflurnar
    // eru komnar yfir 1000-raða klippingu Supabase) og fail-safe (tómt map á villu).
    const docYearsP = (async () => {
      const byCo = {}, byBase = {}, bruByCo = {};
      try {
        for (let from = 0; ; from += 1000) {
          const r = await SB.from('customer_documents')
            .select('fyrirtaeki_id,customer_base_id,year,doc_type')
            .in('doc_type', ['uttektarskyrsla', 'brunakerfi'])
            .range(from, from + 999);
          const rows = (r && r.data) || [];
          rows.forEach(d => {
            const y = +d.year || 0; if (!y) return;
            // 2026-07-29 (Agnar): brunakerfis-skýrsla mátti EKKI lengur telja sem
            // slökkvitækja-skýrsla ársins — hún lét „📄 Skýrsla 2026 til" kvikna á
            // þessari síðu þótt engin úttektarskýrsla væri til. Ártölin eru því
            // aðskilin: `byCo/byBase` = AÐEINS úttektarskýrslur, `bruByCo` heldur
            // brunakerfinu til hliðar (það sannar áfram að kúnninn sé raunverulegur
            // í ❓ Óvíst-þríflokkuninni, en segir ekkert um slökkvitækin).
            const bruna = d.doc_type === 'brunakerfi';
            if (d.fyrirtaeki_id != null) {
              const m = bruna ? bruByCo : byCo;
              (m[String(d.fyrirtaeki_id)] = m[String(d.fyrirtaeki_id)] || new Set()).add(y);
            }
            if (!bruna && d.customer_base_id != null) (byBase[String(d.customer_base_id)] = byBase[String(d.customer_base_id)] || new Set()).add(y);
          });
          if (rows.length < 1000) break;
        }
      } catch (_) {}
      return { byCo, byBase, bruByCo };
    })();

    await appSettingsP;
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || {};
    const bruMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('brunakerfi_customers')) || {};

    const allCompanies = await companiesP;
    if (!allCompanies) return;   // fetch failed — keep the previous cache (same early-out as before)
    _cache.allCompanies = allCompanies;
    _cache.byId = Object.fromEntries(allCompanies.map(c => [c.id, c]));

    const unitsByClient = await unitsP;
    const nextInspByClient = await nextInspP;
    const PRICE = await priceP;
    const factsList = await factsP;
    const factsById = Object.fromEntries((factsList || []).map(f => [String(f.fyrirtaeki_id), f]));
    const docYears = await docYearsP;
    _cache.docYears = docYears;
    _cache.tolur = await tolurP;
    const skManById = Object.fromEntries((await skManP).map(r => [String(r.fyrirtaeki_id), r]));
    _cache.fcCur = await fcCurP;   // co_id → 'human'|'claude'|'gap' fyrir yfirstandandi ár
    _cache.klaradCur = await klaradCurP;   // Set<fyrirtaeki_id(str)> með klarad úttektar-par í ár

    // 2026-05-19: Only include companies that are ACTUALLY in service
    // (subscribed to ársskoðun, subscribed to brunakerfi, OR — new — they have
    // real active tæki in uttaeki). Companies without any service belong in
    // Allir Viðskiptavinir only.
    function inService(c) {
      const key = String(c.id);
      const a = arsMap[key];
      // 2026-08-20: explicit "⬇ Úr þjónustu" veto. A hand-removal stamps
      // removed_from_service_at + subscribed:false together (takeOutOfService
      // ~2165 / patch 280) AND clears er_i_thjonustu on the fyrirtaeki row — but
      // that alone did NOT make the company leave the list: the manual equipment
      // blob and live uttaeki rows below re-qualified it on every refresh, so a
      // deliberately-removed customer kept reappearing (Gullsmári 9 → went to a
      // competitor, still had 10+10 equipment + 20 units, would not go away).
      // The stamp lives on in the blob; its EFFECT is overridden the moment the
      // company is re-activated on the fyrirtaeki row (er_i_thjonustu=true —
      // patch 198/280) OR re-subscribed (subscribed=true — patch 158/280). An
      // active brunakerfi subscription still wins (!bruMap): removal clears the
      // slökkvitæki service, never a live fire-system contract.
      if (a && a.removed_from_service_at && c.er_i_thjonustu !== true && a.subscribed !== true && !bruMap[key]) return false;
      // A company qualifies if it has equipment with counts > 0 (legacy
      // migration data) OR was explicitly subscribed via the button (patch 158
      // stamps `subscribed: true`) OR has real active units in uttaeki.
      // 2026-06-02: the subscription flag now lives on the fyrirtaeki row
      // (er_i_thjonustu column) — per-row writes, immune to the settings-blob
      // last-write-wins race that was dropping companies. Legacy blob flags
      // are still honoured as a fallback during the transition.
      const hasArs = c.er_i_thjonustu === true || !!(a && (
        a.subscribed === true ||
        (a.equipment && Object.values(a.equipment).some(v => +v > 0))
      ));
      const hasBru = !!bruMap[key];
      const hasUnits = (unitsByClient[foldName(c.nafn)] || []).length > 0;
      return hasArs || hasBru || hasUnits;
    }

    // 2026-07-17: fjöldi staða per base — notað í sönnunar-stöðunni að neðan
    // (rekstrarfélags-vörn: base-tengt skjal gildir aðeins fyrir eins-staðar base).
    const _baseSiteCount = {};
    allCompanies.forEach(c => {
      if (c.customer_base_id != null) {
        const k = String(c.customer_base_id);
        _baseSiteCount[k] = (_baseSiteCount[k] || 0) + 1;
      }
    });

    _cache.list = allCompanies
      .filter(inService)
      .map(c => {
        const manual = arsMap[String(c.id)] || {};
        const _ars = Object.assign({}, manual);
        const units = unitsByClient[foldName(c.nafn)] || [];
        _ars._units = units;   // keep the raw uttaeki rows so the modal can list + delete individual tæki
        // Skýrslu-ár úr customer_documents (fyrir Óvíst-sönnunarmerkin)
        const dySet = new Set([
          ...(docYears.byCo[String(c.id)] || []),
          ...(c.customer_base_id != null ? (docYears.byBase[String(c.customer_base_id)] || []) : []),
        ]);
        _ars._docYears = Array.from(dySet).sort();          // AÐEINS úttektarskýrslur
        // Brunakerfis-ár til hliðar: sanna að kúnninn sé raunverulegur (❓ Óvíst)
        // en mega ALDREI látast vera slökkvitækjaskoðun ársins.
        _ars._bruYears = Array.from(new Set(docYears.bruByCo[String(c.id)] || [])).sort();
        // 2026-07-16 (Lagfæringar-hamur): equipment_manual = the owner overrode the
        // counts by hand — the manual blob equipment wins over BOTH the live
        // uttaeki derivation and the report facts (same pattern as inspect_month_manual).
        if (units.length && !manual.equipment_manual) {
          // 2026-06: estimate = Σ(tæki × Yfirferð × VSK) + Skýrslugerð + Akstur,
          // NO recharge. Same formula the detail uses (single source of truth).
          const equip = {};
          let est = 0;
          units.forEach(u => {
            const cat = categoryOf(u.type, u.size);
            equip[cat] = (equip[cat] || 0) + 1;
            est += (PRICE[cat] != null ? PRICE[cat] : PRICE.annad);
          });
          if (est > 0) est += SKYRSLUGERD + AKSTUR_UNIT * (+manual.akstur_multiplier || 1);
          _ars.equipment = equip;
          _ars.estimated_yearly = Math.round(est);
          _ars._unit_count = units.length;
          _ars._derived = true;
        }
        // 2026-07-14: report facts win over the name-matched uttaeki guess.
        // The úttektarskýrsla is the ground truth for what was actually inspected.
        // 2026-07-16 REGLA (stale-facts fix): facts-tækjatalan yfirskrifar lifandi
        // uttaeki-afleiðsluna AÐEINS þegar skýrslan er FERSK (report_year >= 2025).
        // Gömul skýrsla (2023/2024) má ekki fela tæki sem eru til í dag — t.d.
        // fyrirtaeki 1458 (4 RS úr 2023-skýrslu vs 12 í uttaeki) og 703 (2024-
        // skýrsla faldi 6 CO2). Gamalt facts-row má samt gefa inspect_month
        // þegar ekkert ferskara er til. Handvirku yfirskriftirnar
        // (equipment_manual / inspect_month_manual) vinna ÁFRAM yfir allt.
        const fact = factsById[String(c.id)];
        if (fact) {
          const factFresh = +fact.report_year >= 2025;
          const eqp = fact.equipment && typeof fact.equipment === 'object' ? fact.equipment : null;
          const eqTotal = eqp ? Object.values(eqp).reduce((s, v) => s + (+v || 0), 0) : 0;
          if (factFresh && eqp && eqTotal > 0 && !manual.equipment_manual) {
            _ars.equipment = eqp;
            let est2 = 0;
            Object.entries(eqp).forEach(([cat, n]) => {
              est2 += (PRICE[cat] != null ? PRICE[cat] : PRICE.annad) * (+n || 0);
            });
            if (est2 > 0) est2 += SKYRSLUGERD + AKSTUR_UNIT * (+manual.akstur_multiplier || 1);
            _ars.estimated_yearly = Math.round(est2);
            _ars._unit_count = eqTotal;
            _ars._fromReport = true;
          }
          // 2026-07-16 MÁNAÐAR-FORGANGSREGLA: inspect_month_manual > blob
          // inspect_month (hvaða gildi sem er, geymt af notanda) > fact.inspect_month
          // > afleiðsla. Skýrslu-mánuðurinn FYLLIR aðeins í eyðu — geymdur blob-
          // mánuður (t.d. fyrirtaeki 604, inspect_month=3) má aldrei tapa fyrir
          // giski úr skýrslu.
          const blobMonth = +manual.inspect_month >= 1 && +manual.inspect_month <= 12;
          if (!manual.inspect_month_manual && !blobMonth && fact.inspect_month != null && +fact.inspect_month >= 1 && +fact.inspect_month <= 12) {
            _ars.inspect_month = +fact.inspect_month;
            _ars._month_from_report = true;
          }
          if (fact.report_year) _ars._report_year = fact.report_year;
        }
        // 2026-08-14: mánuður úr v_skodunar_manudur — viewið sameinar skýrslu-
        // og reikninga-mánuði (heimild 'skyrsla'/'reikningur'). Fyllir aðeins í
        // eyðu: manual > blob > fact > VIEW > next_insp-ágiskun.
        if (!_ars.inspect_month) {
          const sm = skManById[String(c.id)];
          if (sm && +sm.inspect_month >= 1 && +sm.inspect_month <= 12) {
            _ars.inspect_month = +sm.inspect_month;
            if (sm.heimild === 'skyrsla') _ars._month_from_report = true;
            else _ars._month_from_reikningur = true;
          }
        }
        // 2026-08-10 (ósk Agnars, "Staða eftir ári" boxið á fyrirtækjasíðunni):
        // þegar HVORUGT blob né skýrsla gefa mánuð, notum elstu (næstu)
        // next_insp meðal tækjanna sem síðustu vörn — sama regla og "næsta
        // skoðun" annars staðar (companieslist.js, 185-inservice-yfirlit.js:
        // elsta dagsetning vinnur). Fyllir AÐEINS í eyðu, sama og skýrslu-
        // þrepið að ofan — vinnur aldrei yfir blob eða skýrslu-mánuð.
        // Samsvarandi þrep er í 199-doc-year-grid.js (skjalasíðan) svo báðar
        // síður sýni sama gildi — sótt úr nextInspByClient (loadNextInspByClient),
        // EKKI `units`/unitsByClient (sjá athugasemd við loadNextInspByClient).
        if (!_ars.inspect_month) {
          const nextInsp = nextInspByClient[foldName(c.nafn)];
          if (nextInsp) {
            const mm = +String(nextInsp).slice(5, 7);
            if (mm >= 1 && mm <= 12) { _ars.inspect_month = mm; _ars._month_from_uttaeki = true; }
          }
        }
        // Handvirk tækja-yfirskrift: nota blob-tölurnar (þegar afritaðar inn í
        // _ars gegnum Object.assign) og telja heildina fyrir röðun/print.
        if (manual.equipment_manual && manual.equipment) {
          _ars._unit_count = Object.values(manual.equipment).reduce((s, v) => s + (+v || 0), 0);
        }
        // 2026-07-17 SÖNNUNAR-STAÐA: staðan reiknast úr sönnuninni sjálfri —
        // sé staðfest skýrsla til fyrir STAÐINN (customer_documents tengt á
        // fyrirtaeki_id, eða facts-röðin) með nýrra ár en blobbið segir, telst
        // staðurinn skoðaður það ár. Þá getur „skýrsla til en samt Á eftir"
        // aldrei gerst aftur. Rekstrarfélags-vörn: base-tengd skjöl (án
        // fyrirtaeki_id) gilda AÐEINS þegar base á nákvæmlega EINN stað —
        // annars gæti skýrsla eins útibús merkt öll hin skoðuð. Röng tenging
        // lagast í Skýrslu-stöð (Brunahólf) og staðan fylgir þá sjálfkrafa.
        {
          const nowYr = new Date().getFullYear();
          const siteYrs = Array.from(docYears.byCo[String(c.id)] || []);
          if (c.customer_base_id != null && (_baseSiteCount[String(c.customer_base_id)] || 0) === 1) {
            siteYrs.push(...(docYears.byBase[String(c.customer_base_id)] || []));
          }
          const evYr = Math.max(0,
            ...siteYrs.map(Number).filter(n => n > 2000 && n <= nowYr),
            (fact && +fact.report_year > 2000 && +fact.report_year <= nowYr) ? +fact.report_year : 0);
          if (evYr > (+_ars.last_year_inspected || 0)) {
            _ars.last_year_inspected = evYr;
            _ars._year_from_report = true;
          }
        }
        return {
          ...c,
          _ars,
          _bru: bruMap[String(c.id)] || null
        };
      })
      .sort((a, b) => String(a.nafn || '').localeCompare(String(b.nafn || ''), 'is'));
    writeSnapshot();   // næsta kalda opnun málar strax úr þessu eintaki
  }

  // ── Live-equipment helpers (2026-06-01) ───────────────────────────────────
  // Diacritic/case-folded key for matching fyrirtaeki.nafn ↔ uttaeki.client.
  function foldName(s) {
    return String(s || '').toLowerCase().trim()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/æ/g, 'ae').replace(/ö/g, 'o')
      .replace(/[.,]/g, '')          // 2026-06-02: ignore punctuation so a rename like
      .replace(/\s+/g, ' ').trim();  // "Dra ehf." → "Dra ehf" can't drop a company off the list
  }
  // Same, but also folds subscript digits so "CO₂" matches "CO2".
  function foldTok(s) {
    return foldName(s).replace(/[₀-₉]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x2080 + 48));
  }
  // Map a raw uttaeki.type to a canonical service category.
  function categoryOf(type, size) {
    const t = foldTok(type);
    const sizeNum = parseFloat(String(size || '').replace(',', '.')) || 0;
    if (/lettv|abf|frod/.test(t)) return 'lettvatn';
    if (/duft|abc|pfc/.test(t)) return sizeNum > 3 ? 'duft6_12' : 'duft2';
    if (/co2|kolsyr/.test(t)) return sizeNum > 3 ? 'co2_5' : 'co2_2';
    if (/brunaslang|brunaslong|hose/.test(t)) return 'brunaslongur';
    if (/reykskynj|smoke/.test(t)) return 'reykskynjarar';
    if (/teppi|blanket|eldvarn/.test(t)) return 'eldvarnarteppi';
    return 'annad'; // Slönguskápur, Óþekkt, unmatched
  }
  // 2026-07-02 (Agnar): roll the fine-grained categories up into the three
  // service groups the office lists per place —
  //   SLT = öll slökkvitæki (Duft + Léttvatn + CO₂)
  //   BSL = Brunaslöngur
  //   RS  = Reykskynjarar
  // (eldvarnarteppi / annað fall into `other`, kept out of the three columns
  // but still counted in `total`).
  function eqGroups(equipment) {
    const e = equipment || {};
    const n = k => +e[k] || 0;
    const slt = n('lettvatn') + n('duft2') + n('duft6_12') + n('co2_2') + n('co2_5');
    const bsl = n('brunaslongur');
    const rs  = n('reykskynjarar');
    const other = n('eldvarnarteppi') + n('annad');
    return { slt, bsl, rs, other, total: slt + bsl + rs + other };
  }
  // Compact SLT/BSL/RS trio for a table cell. `mode`:'screen' → stacked mini
  // stats w/ theme tokens; 'print' → plain inline text for the print sheet.
  function eqTrioHtml(equipment, mode) {
    const g = eqGroups(equipment);
    if (!g.total) return mode === 'print' ? '' : '—';
    const cell = (val, label, title) => {
      const dim = val ? '' : 'opacity:.35;';
      return '<span title="' + title + '" style="display:inline-flex;flex-direction:column;align-items:center;line-height:1.04;' + dim + '">' +
        '<span style="font-weight:800;color:var(--ink1);font-size:13px;font-variant-numeric:tabular-nums">' + val + '</span>' +
        '<span style="font-size:8px;font-weight:700;color:var(--ink3);letter-spacing:.04em">' + label + '</span>' +
      '</span>';
    };
    if (mode === 'print') {
      const parts = [];
      if (g.slt) parts.push('SLT ' + g.slt);
      if (g.bsl) parts.push('BSL ' + g.bsl);
      if (g.rs)  parts.push('RS ' + g.rs);
      if (g.other) parts.push('Annað ' + g.other);
      return parts.join(' · ');
    }
    return '<span class="_ars-eqtrio" style="display:inline-flex;gap:9px;align-items:center;justify-content:center">' +
      cell(g.slt, 'SLT', 'Slökkvitæki (Duft + Léttvatn + CO₂)') +
      cell(g.bsl, 'BSL', 'Brunaslöngur') +
      cell(g.rs,  'RS',  'Reykskynjarar') +
      (g.other ? cell(g.other, 'Annað', 'Eldvarnarteppi / annað') : '') +
    '</span>';
  }
  async function loadActiveUnitsByClient(SB) {
    const byClient = {};
    try {
      let from = 0; const page = 1000;
      while (true) {
        const { data, error } = await SB.from('uttaeki')
          .select('id,serial,type,size,client,status')
          .eq('status', 'active')
          .order('id')
          .range(from, from + page - 1);
        if (error || !data) break;
        data.forEach(u => {
          const k = foldName(u.client);
          if (!k) return;
          (byClient[k] = byClient[k] || []).push(u);
        });
        if (data.length < page) break;
        from += page;
      }
    } catch (e) { console.warn('[arsskodun] units load', e); }
    return byClient;
  }
  // 2026-08-10: separate from loadActiveUnitsByClient on purpose — that one
  // filters status='active' (narrower than most of this codebase's "still in
  // service" convention) and doesn't select next_insp at all. The "next
  // inspection" derivation used everywhere else (companieslist.js, 185-
  // inservice-yfirlit.js) is status != 'urelt' + earliest next_insp wins —
  // matching that here so a company with real units sitting in status='ok'
  // (the common case) isn't silently skipped.
  async function loadNextInspByClient(SB) {
    const byClient = {};
    try {
      let from = 0; const page = 1000;
      while (true) {
        const { data, error } = await SB.from('uttaeki')
          .select('client,next_insp')
          .neq('status', 'urelt')
          .not('next_insp', 'is', null)
          .order('id')
          .range(from, from + page - 1);
        if (error || !data) break;
        data.forEach(u => {
          const k = foldName(u.client);
          if (!k) return;
          if (!byClient[k] || u.next_insp < byClient[k]) byClient[k] = u.next_insp;
        });
        if (data.length < page) break;
        from += page;
      }
    } catch (e) { console.warn('[arsskodun] next_insp load', e); }
    return byClient;
  }
  // Per-category ANNUAL revenue per unit, with VSK.
  // 2026-06-02: this used to return yfirferð only, án VSK — which understated
  // the yearly estimate badly (~17 m.kr. instead of ~28 m.kr.). A real service
  // year per unit is yfirferð (yearly inspection) + hleðsla (recharge), and the
  // figure the company cares about is what it invoices, i.e. með VSK. So each
  // category now = (yfirferð + hleðsla) × 1,24. Prices pull live from the vorur
  // list (single source of truth) with hardcoded fallbacks so it never zeroes.
  async function loadYfirferdPrices(SB) {
    const VAT = 1.24;
    const FB_Y = { lettvatn: 3150, duft: 3387.1, co2: 3270.16, brunaslanga: 4345.97, reykskynjari: 2345.97, skod: 2016.13 };
    const FB_H = { lettvatn: 6782.26, duft2: 4193.55, duft6_12: 6782.26, co2_2: 3400, co2_5: 6900 };
    let vorur = [];
    try {
      const { data } = await SB.from('vorur').select('nafn,verd_an_vsk,virkt').eq('virkt', true);
      vorur = data || [];
    } catch (_) {}
    const find = re => {
      const v = vorur.find(p => re.test(foldTok(p.nafn)));
      return v ? +v.verd_an_vsk : null;
    };
    // yfirferð (yearly inspection) per category
    const y = {
      lettvatn:     find(/yfirfer.*lettv|lettv.*yfirfer/) ?? FB_Y.lettvatn,
      duft:         find(/yfirfer.*duft|duft.*yfirfer/)   ?? FB_Y.duft,
      co2:          find(/yfirfer.*co2|co2.*yfirfer/)     ?? FB_Y.co2,
      brunaslanga:  find(/yfirfer.*brunaslang|brunaslang.*yfirfer/) ?? FB_Y.brunaslanga,
      reykskynjari: find(/yfirfer.*reykskynj|reykskynj.*yfirfer/)   ?? FB_Y.reykskynjari,
      skod:         find(/skodunargjald/) ?? FB_Y.skod,
    };
    // hleðsla (recharge) per category — 0 for items that aren't recharged.
    const h = {
      lettvatn: find(/lettv.*hled|hled.*lettv/) ?? FB_H.lettvatn,
      duft2:    find(/duft 2.*hled/)            ?? FB_H.duft2,
      duft6_12: find(/duft 6.*hled/)            ?? FB_H.duft6_12,
      co2_2:    find(/co2 2.*hled/)             ?? FB_H.co2_2,
      co2_5:    find(/co2 5.*hled/)             ?? FB_H.co2_5,
    };
    // 2026-06: Yfirferð only × VSK. Recharge (hleðsla) is NOT counted yearly;
    // Skýrslugerð + Akstur add-ons are applied per-company (loadAll / detail).
    const annual = (yf) => Math.round(yf * VAT);
    return {
      lettvatn:       annual(y.lettvatn, h.lettvatn),
      duft2:          annual(y.duft,     h.duft2),
      duft6_12:       annual(y.duft,     h.duft6_12),
      co2_2:          annual(y.co2,      h.co2_2),
      co2_5:          annual(y.co2,      h.co2_5),
      brunaslongur:   annual(y.brunaslanga, 0),
      reykskynjarar:  annual(y.reykskynjari, 0),
      eldvarnarteppi: annual(y.skod, 0),
      annad:          annual(y.skod, 0),
    };
  }

  // ── Sidebar entry ────────────────────────────────────────────────────────
  // Replace the OLD Fyrirtæki nav (data-view="companies") with our Ársskoðun
  // entry — same position, new label. The old view is still available via
  // direct URL (?view=companies) for the rare case a feature isn't here yet.
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) {
      // Already injected — but make sure the old Fyrirtæki button is hidden.
      hideOldFyrirtaekiBtn(nav);
      return;
    }
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    // Find old companies nav (legacy "Fyrirtæki"). We'll insert RIGHT BEFORE
    // it and then hide it, so our new entry lands in the same sidebar slot.
    const oldFyrirtBtn = allBtns.find(b => b.getAttribute('data-view') === 'companies')
                     || allBtns.find(b => /^\s*(🏢)?\s*Fyrirtæki\s*$/i.test(b.textContent || ''));
    const after = oldFyrirtBtn
              || allBtns.find(b => /brunakerf/i.test(b.textContent || ''))
              || allBtns.find(b => /þjónustutæki/i.test(b.textContent || ''))
              || allBtns[0];
    const tpl = after || allBtns[0];
    if (!tpl) { setTimeout(injectSidebar, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="margin-right:6px">🏢</span>Fyrirtæki í Þjónustu';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY);
      else show();
    });
    if (oldFyrirtBtn && oldFyrirtBtn.parentNode) {
      // Insert BEFORE the old button so we take its slot.
      oldFyrirtBtn.parentNode.insertBefore(btn, oldFyrirtBtn);
    } else if (after && after.parentNode) {
      after.parentNode.insertBefore(btn, after.nextSibling);
    } else {
      nav.appendChild(btn);
    }
    hideOldFyrirtaekiBtn(nav);
  }
  function hideOldFyrirtaekiBtn(nav) {
    nav.querySelectorAll('.vnav-btn[data-view="companies"]').forEach(b => {
      b.style.display = 'none';
    });
  }

  // ── View container ───────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-companies');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="ars-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  // ── Hook App.switchView ──────────────────────────────────────────────────
  function patchSwitchView() {
    if (!window.App || window.App._arsSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v => {
          v.style.display = 'none';
          v.classList.remove('active');
        });
        const v = document.getElementById(VIEW_ID);
        if (v) { v.style.display = 'block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY);
        });
        try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
        show();
        return;
      }
      if (orig) return orig.apply(this, arguments);
    };
    window.App._arsSwitchPatched = true;
  }

  // ── Filters / sort state ────────────────────────────────────────────────
  // 2026-05-29: search term is no longer persisted — always start blank.
  try { localStorage.removeItem(LS_SEARCH); } catch (_) {}
  const state = {
    view: localStorage.getItem(LS_VIEW) || 'list',          // 'card' | 'list' (default list)
    sort: localStorage.getItem(LS_SORT) || 'alpha',         // 'alpha' | 'month' | 'oldest' (legacy)
    sortCol: localStorage.getItem(LS_SORTCOL) || '',         // name|address|email|month|tools|estimate|priority|status|lastYr
    sortDir: localStorage.getItem(LS_SORTDIR) || 'asc',      // asc | desc
    // 2026-07-31: mánaðar-sían er nú FJÖL-VAL (fylki). 0 = „Án mánaðar" (ekkert
    // skoðunarmánuður skráður). Tómt fylki = allir mánuðir. Flyst yfir úr gamla
    // eins-mánaðar LS_MONTH svo vistað val glatist ekki.
    months: (() => {
      try { const raw = localStorage.getItem(LS_MONTHS); if (raw != null) { const a = JSON.parse(raw); if (Array.isArray(a)) return a; } } catch (_) {}
      const legacy = parseInt(localStorage.getItem(LS_MONTH) || '0', 10);
      return (legacy >= 1 && legacy <= 12) ? [legacy] : [];
    })(),
    // null = engin póstnúmera-sía (öll númer með). Fylki = AÐEINS þessi númer
    // sjást ('' stendur fyrir „án skráðs númers"). Sjálfgefið er allt með og
    // notandinn „tekur af" í Númer-glugganum — eða hreinsar allt og velur 1+.
    postnr: (() => {
      try {
        const raw = localStorage.getItem(LS_POSTNR);
        if (raw != null && raw !== 'all') { const a = JSON.parse(raw); if (Array.isArray(a)) return a.map(String); }
      } catch (_) {}
      return null;
    })(),
    status: localStorage.getItem(LS_STATUS) || 'all',        // 'all' | 'done' | 'pending' | 'never'
    // Sjálfgefið AF (=sýna þá) svo ekkert hverfi óumbeðið hjá þeim sem þekkja
    // listann eins og hann var. Gátreiturinn í „🟡 Slepptir í fyrra" kveikir.
    hideSkipped: localStorage.getItem(LS_SKIPHIDE) === '1',
    search: ''
  };
  // „Númer"-glugginn opinn/lokaður — bara fyrir þessa setu, ekki vistað.
  let _pnrOpen = false;
  // Smellur utan gluggans lokar honum. Skráð EINU SINNI á document (ekki í
  // render()) svo hlustendur hlaðist ekki upp við hverja endurteikningu.
  document.addEventListener('mousedown', e => {
    if (!_pnrOpen) return;
    if (e.target.closest && e.target.closest('#_ars-pnr-row')) return;
    _pnrOpen = false;
    if (document.getElementById('ars-main')) render();
  });
  // 2026-08-17: árs-merki breytt (tvísmellur í 187 eða á kúnnasíðunni 199) →
  // ferskt fact-check fyrir yfirstandandi ár + endurteikna, svo „Skoðað <ár>"-
  // staðan fylgi litnum á '26-merkinu samstundis (sjá isDoneYear).
  document.addEventListener('attachment-year-changed', async () => {
    try {
      const SB = getSB(); if (!SB) return;
      const r = await SB.from('year_factcheck').select('co_id,status').eq('year', new Date().getFullYear());
      const m = {}; ((r && r.data) || []).forEach(x => { m[String(x.co_id)] = x.status; });
      _cache.fcCur = m;
      const _en = document.activeElement && document.activeElement.classList
        && document.activeElement.classList.contains('_ars-plannote');
      if (document.getElementById('ars-main') && !_en) render();   // ekki sópa burt ferðanótu í ritun
    } catch (_) {}
  });
  // Sleppt í fyrra = síðast skoðað fyrir meira en ári síðan (en einhvern tíma).
  // EIN skilgreining — bæði sían sjálf, feluglerið og talningarnar lesa hana,
  // svo þær geta ekki rekið í sundur (sbr. 'skipped2025'-síuna hér að neðan).
  // 2026-08-17 (Agnar: „be able to unhide some of them"): handvirk yfirskrift
  // `ekki_sleppt` (vistuð í arsskodun_customers-blokkinni, sett með ↩ Virkja-
  // takkanum í 🟡 Slepptir-sýninni) trompar reikninguna — fyrirtækið telst þá
  // virkt aftur í öllum sýnum og tölum þótt síðasta skoðunarár sé gamalt.
  function isSkippedLastYear(c, curYear) {
    const a = c._ars || {};
    if (a.ekki_sleppt) return false;
    const last = +a.last_year_inspected || 0;
    return last > 0 && last < curYear - 1;
  }
  // 2026-08-17 (Agnar — Pizzan: gult '26-merki en samt „Skoðað 2026" og „I
  // cant change that"): EIN skilgreining á „árið búið". Fact-check litur
  // yfirstandandi árs (year_factcheck — sami og '26-merkin í 187/199 hringa
  // með tvísmelli) TROMPAR blobbinn: gult (gap) = EKKI búið · grænt (human) =
  // búið · blátt/ekkert = last_year_inspected ræður. Tvísmellur á '26-merkið
  // er þar með rofinn fyrir Skoðað-stöðuna, síurnar og talnakortið.
  function isDoneYear(c, curYear) {
    const fc = (_cache.fcCur || {})[String(c.id)];
    // 2026-08-19 (Agnar #11): klarad úttektar-par (skýrsla↔reikningur paruð, per
    // stað, Agnar-viðhaldið) TROMPAR staðnað gap — Hamraborg 7 o.fl. voru merkt
    // gap ÁÐUR en verkið kláraðist. klaradCur er yfirstandandi árs, svo aðeins
    // fyrir það ár (sama gildissvið og fc/gap sem það trompar).
    if (curYear === new Date().getFullYear() && _cache.klaradCur && _cache.klaradCur.has(String(c.id))) return true;
    if (fc === 'gap') return false;
    if (fc === 'human') return true;
    return (+((c._ars || {}).last_year_inspected) || 0) === curYear;
  }
  function saveState() {
    localStorage.setItem(LS_VIEW, state.view);
    localStorage.setItem(LS_SORT, state.sort);
    localStorage.setItem(LS_SORTCOL, state.sortCol || '');
    localStorage.setItem(LS_SORTDIR, state.sortDir || 'asc');
    localStorage.setItem(LS_MONTHS, JSON.stringify(state.months || []));
    localStorage.setItem(LS_POSTNR, state.postnr === null ? 'all' : JSON.stringify(state.postnr));
    localStorage.setItem(LS_STATUS, state.status);
    localStorage.setItem(LS_SKIPHIDE, state.hideSkipped ? '1' : '0');
  }
  // Póstnúmer fyrirtækis, samræmt: alltaf strengur, '' = ekkert skráð.
  const pnrOf = c => String(c.postnumer == null ? '' : c.postnumer).trim();
  // Label fyrir valin póstnúmer (samantektin + prentun lesa hann).
  function postnrFilterLabel() {
    if (state.postnr === null) return '';
    if (!state.postnr.length) return '📍 ekkert póstnúmer valið';
    const a = state.postnr.slice().sort((x, y) => (parseInt(x, 10) || 9999) - (parseInt(y, 10) || 9999));
    return '📍 ' + a.map(p => p === '' ? 'án númers' : p).join(', ');
  }
  // Label fyrir valda mánuði (fjöl-val + „Án mánaðar").
  function monthFilterLabel(curYear) {
    const ms = (state.months || []).slice().sort((a, b) => a - b);
    if (!ms.length) return '';
    const parts = ms.map(m => m === 0 ? 'Án mánaðar' : MONTHS_IS[m - 1]);
    return parts.join(', ') + (ms.some(m => m >= 1 && m <= 12) ? ' ' + curYear : '');
  }

  // opts.ignorePostnr: sleppa póstnúmera-síunni en halda öllum hinum. Notað til
  // að telja hvað hvert póstnúmer myndi skila undir núverandi stöðu/mánuði —
  // þannig sýnir talan í „📍 Númer"-glugganum raunverulegan fjölda raða.
  function filteredSorted(opts) {
    const ignorePostnr = !!(opts && opts.ignorePostnr);
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    let arr = _cache.list.slice();

    // 2026-06-10: a free-text search always looks across the WHOLE customer
    // base — it ignores the month chips so you can find any company by name/kt/
    // address no matter which inspection month it sits in. The month filter
    // only applies when the search box is empty.
    const hasSearch = !!state.search.trim();
    if (!hasSearch && state.months && state.months.length) {
      // Fjöl-val: sýna fyrirtæki hvers skoðunarmánuður er í valinu. 0 = „Án
      // mánaðar" (enginn mánuður skráður, m<1 eða >12).
      const set = new Set(state.months);
      const noMonth = set.has(0);
      arr = arr.filter(c => {
        const m = +c._ars.inspect_month || 0;
        const inRange = m >= 1 && m <= 12;
        return inRange ? set.has(m) : noMonth;
      });
    }
    // 2026-08-12 (ósk Agnars): póstnúmera-sían — „📍 Númer"-takkinn fyrir ofan
    // listann. null = allt með; fylki = aðeins valin númer ('' = án númers).
    // Víkur fyrir frjálsri leit, alveg eins og mánaðar- og stöðusíurnar.
    if (!hasSearch && !ignorePostnr && state.postnr !== null) {
      const pset = new Set(state.postnr);
      arr = arr.filter(c => pset.has(pnrOf(c)));
    }
    // 2026-07-17 (ósk Agnars): „líklega óvart í þjónustu" — fyrirtæki sem
    // lentu á listanum (t.d. gegnum afgreiðslu-sölu) en hafa ENGA þjónustusögu:
    // aldrei skoðað, enginn skoðunarmánuður og engin tæki. Þau eru sýnd í
    // „❓ Óvíst" flipanum og ÚTILOKUÐ úr báðum Eftir-listunum svo þeir sýni
    // bara alvöru þjónustukúnna. Tekin úr þjónustu inni á fyrirtækjasíðunni.
    const isSuspect = (c) => {
      const a = c._ars || {};
      if (+a.last_year_inspected || +a.inspect_month) return false;
      if (+(a.field_inspected_year || 0) === curYear) return false;
      const eqTot = Object.values(a.equipment || {}).reduce((s, v) => s + (+v || 0), 0);
      return eqTot === 0;
    };
    // 2026-07-28 (ósk Agnars — „leitin virðist biluð"): mánaðarsían vék þegar
    // fyrir leit (sjá að ofan) EN stöðusían gerði það ekki. Stöðuflipinn geymist
    // milli heimsókna, svo t.d. „Eftir"-flipinn tæmdi leitarniðurstöðurnar og
    // það leit út eins og leitin fyndi ekkert. Nú hunsar frjáls leit ALLAR síur
    // — hún fer alltaf yfir allan viðskiptavinahópinn.
    if (hasSearch) {
      // engin stöðusía meðan leitað er
    } else if (state.status === 'done') {
      arr = arr.filter(c => isDoneYear(c, curYear));
    } else if (state.status === 'suspect') {
      arr = arr.filter(isSuspect);
    } else if (state.status === 'pending') {
      // 2026-07-17 (ósk Agnars): „Eftir" = AÐEINS raunverulega á eftir — rauða
      // „Á eftir" pillan (mánuður kominn/liðinn) + „Sleppt '24" (sleppt í fyrra).
      // Sýnir EKKI „Á dagskrá" (mánuður seinna á árinu / enginn mánuður) og ekki
      // „Í vinnslu" — það á heima í nýja „Eftir 2026" flipanum.
      arr = arr.filter(c => {
        if (isDoneYear(c, curYear)) return false;
        if (+(c._ars.field_inspected_year || 0) === curYear) return false;   // Í vinnslu
        const skipped = isSkippedLastYear(c, curYear);
        const m = +c._ars.inspect_month || 0;
        return skipped || (m > 0 && m <= curMonth);
      });
    } else if (state.status === 'pending2026') {
      // Allt sem er óbúið á árinu: Eftir + Sleppt + Á dagskrá + Í vinnslu —
      // en ÁN „❓ Óvíst" (líklega óvart í þjónustu, sjá isSuspect).
      arr = arr.filter(c => !isDoneYear(c, curYear) && !isSuspect(c));
    } else if (state.status === 'nytt') {
      // Handvirkt merkt NÝTT á fyrirtækjaprófílnum (patch 281).
      arr = arr.filter(c => !!(window.NyttBadge && NyttBadge.is(c.id)));
    } else if (state.status === 'never') {
      arr = arr.filter(c => !c._ars.last_year_inspected);
    } else if (state.status === 'skipped2025') {
      // 2026-05-26: companies inspected 2024 but skipped 2025 — the "weird year"
      // hole. Detect by last_year_inspected === 2024 (or any year < curYear-1).
      // 2026-08-17: VILJANDI hráa reglan (án ekki_sleppt-yfirskriftar) — þessi
      // sýn er stjórnborðið: hún sýnir líka þá sem voru handvirkt virkjaðir
      // aftur (með ✓-merki + takka til að snúa við) svo yfirlitið tapist ekki.
      arr = arr.filter(c => {
        const last = +c._ars.last_year_inspected || 0;
        return last > 0 && last < curYear - 1;
      });
    } else if (state.status === 'priority') {
      // 2026-05-26: damage-control filter — show only flagged priority cases.
      arr = arr.filter(c => +(c._ars.priority || 0) > 0);
    } else if (state.status === 'ivinnslu') {
      // „Í vinnslu" = úttekt hafin á árinu en árið ekki klárað. Sama regla og
      // dökkbláa „Í vinnslu"-pillan í töflunni notar (field_inspected_year), svo
      // sían og merkið á röðinni segja ALLTAF það sama.
      arr = arr.filter(c => +(c._ars.field_inspected_year || 0) === curYear &&
                            !isDoneYear(c, curYear));
    } else if (state.status === 'akstur') {
      // Allir sem eru á akstursleið (1/2/3). Lesið gegnum ArsAkstur eins og
      // 🚗-chippinn í töflunni — ekki beint úr blobbinu, svo leiðin sem patch
      // 267 heldur utan um sé eina heimildin.
      // state._akOnly (1/2/3) = AÐEINS sá listi — svo prenta megi hvern aksturslista
      // fyrir sig (per bílstjóra) í póstnúmeraröð. 0/undefined = allir listar (óbreytt).
      const _AKof = c => ((window.ArsAkstur && ArsAkstur.of) ? (+ArsAkstur.of(c.id) || 0) : (+(c._ars || {}).akstur || 0));
      const _only = +state._akOnly || 0;
      arr = arr.filter(c => { const v = _AKof(c); return (_only >= 1 && _only <= 3) ? (v === _only) : (v > 0); });
    }
    // 2026-08-11: fela slepptu. Gildir EKKI á „🟡 Slepptir í fyrra" sjálfri (þar
    // eru þeir efnið) og ekki meðan leitað er (leitin fer alltaf yfir allt, sbr.
    // hasSearch að ofan) — annars myndi kúnni „hverfa" úr leit án skýringar.
    if (state.hideSkipped && !hasSearch && state.status !== 'skipped2025') {
      arr = arr.filter(c => !isSkippedLastYear(c, curYear));
    }
    // Akstursleiðin röðuð 1 → 2 → 3 svo listinn lesist eins og keyrsludagurinn.
    if (state.status === 'akstur') {
      const AK = c => (window.ArsAkstur && ArsAkstur.of) ? (+ArsAkstur.of(c.id) || 0) : (+(c._ars || {}).akstur || 0);
      arr.sort((a, b) => AK(a) - AK(b) || String(a.nafn || '').localeCompare(String(b.nafn || ''), 'is'));
    }
    // Sort by priority (red > yellow > green > none) first, then by other criteria
    // — but only when filtering by priority (otherwise the existing sort flow wins)
    if (state.status === 'priority') {
      arr.sort((a, b) => (+(b._ars.priority || 0)) - (+(a._ars.priority || 0)));
    }
    const q = state.search.trim().toLowerCase();
    if (q) {
      // Diacritic-insensitive: normalise BOTH sides via NFD + strip combining
      // marks, then also fold the Icelandic-specific letters that don't have
      // an obvious ASCII equivalent (þ → th, ð → d, æ → ae, ö → o).
      const fold = s => String(s || '').toLowerCase()
        .normalize('NFD').replace(/\p{Diacritic}/gu, '')
        .replace(/þ/g, 'th').replace(/ð/g, 'd')
        .replace(/æ/g, 'ae').replace(/ö/g, 'o');
      const qn = fold(q);
      arr = arr.filter(c => {
        const hay = (c.nafn || '') + ' ' + (c.kennitala || '') + ' ' + (c.heimilisfang || '') + ' ' + (c.postnumer || '');
        return fold(hay).includes(qn);
      });
    }
    // 2026-05-26: column-based sort. state.sortCol drives, state.sortDir is asc|desc.
    // Falls back to legacy state.sort (alpha|month|oldest) for users with old
    // localStorage state.
    const SORT_COMPARATORS = {
      name: (a, b) => String(a.nafn || '').localeCompare(b.nafn || '', 'is'),
      postnumer: (a, b) => ((parseInt(a.postnumer, 10) || 99999) - (parseInt(b.postnumer, 10) || 99999))
                       || String(a.nafn || '').localeCompare(b.nafn || '', 'is'),
      address: (a, b) => String(a.heimilisfang || '').localeCompare(b.heimilisfang || '', 'is')
                       || String(a.nafn || '').localeCompare(b.nafn || '', 'is'),
      email: (a, b) => {
        const ea = (a.netfang || '').trim();
        const eb = (b.netfang || '').trim();
        // Empty emails always last regardless of asc/desc
        if (!ea && eb) return 1;
        if (ea && !eb) return -1;
        return ea.localeCompare(eb, 'is')
            || String(a.nafn || '').localeCompare(b.nafn || '', 'is');
      },
      month: (a, b) => {
        const ma = +a._ars.inspect_month || 13;
        const mb = +b._ars.inspect_month || 13;
        // Sort by closest-upcoming for month asc; raw 1-12 for explicit user click
        return ma - mb || String(a.nafn).localeCompare(b.nafn, 'is');
      },
      tools: (a, b) => {
        const ta = Object.values(a._ars.equipment || {}).reduce((s, v) => s + (+v || 0), 0);
        const tb = Object.values(b._ars.equipment || {}).reduce((s, v) => s + (+v || 0), 0);
        return ta - tb || String(a.nafn).localeCompare(b.nafn, 'is');
      },
      estimate: (a, b) => (+a._ars.estimated_yearly || 0) - (+b._ars.estimated_yearly || 0)
                        || String(a.nafn).localeCompare(b.nafn, 'is'),
      status: (a, b) => {
        // 0=done, 1=fieldOnly, 2=overdue, 3=skipped, 4=pending — relevance order
        const score = c => {
          const ars = c._ars || {};
          const lastYr = +ars.last_year_inspected || 0;
          const fieldYr = +ars.field_inspected_year || 0;
          const m = +ars.inspect_month || 0;
          if (isDoneYear(c, curYear)) return 0;
          if (fieldYr === curYear) return 1;
          if (isSkippedLastYear(c, curYear)) return 3;
          if (m > 0 && m <= curMonth) return 2;
          return 4;
        };
        return score(a) - score(b) || String(a.nafn).localeCompare(b.nafn, 'is');
      },
      priority: (a, b) => (+(b._ars.priority || 0)) - (+(a._ars.priority || 0))  // higher first
                       || String(a.nafn).localeCompare(b.nafn, 'is'),
      akstur: (a, b) => {
        const V = c => (window.ArsAkstur && ArsAkstur.of) ? (+ArsAkstur.of(c.id) || 0) : (+((c._ars || {}).akstur) || 0);
        const R = v => v === 0 ? 99 : v;   // óáranslistaðir (0) neðst → listar 1/2/3 raðast saman fyrir prentun
        return R(V(a)) - R(V(b)) || String(a.nafn).localeCompare(b.nafn, 'is');
      },
      lastYr: (a, b) => (+a._ars.last_year_inspected || 0) - (+b._ars.last_year_inspected || 0)
                       || String(a.nafn).localeCompare(b.nafn, 'is'),
      // Póst-staða: ósvarað (rautt) → mikilvægt (gult) → í sambandi (grænt) →
      // eldri saga (grátt) → engin. Les stöðuna úr póst-merkinu (patch 295 /
      // CompanyMail.status); ef það er ekki hlaðið fellur allt í sama flokk og
      // röðin verður stafrófsröð (skaðlaust).
      poststada: (a, b) => {
        const rank = c => {
          const s = (window.CompanyMail && CompanyMail.status) ? CompanyMail.status(c.id) : null;
          return s === 'red' ? 0 : s === 'yellow' ? 1 : s === 'green' ? 2 : s === 'hist' ? 3 : 4;
        };
        return rank(a) - rank(b) || String(a.nafn || '').localeCompare(b.nafn || '', 'is');
      },
      // Póstsaga til / engin — hrein „availability"-röðun: kúnnar sem við eigum
      // EINHVER póstsamskipti við (nýleg EÐA eldri) efst, hinir neðst. Nær yfir
      // öll ~200 félögin með sögu, ekki bara ~100 með nýlegt merki (CompanyMail.hasHistory).
      postavail: (a, b) => {
        const has = c => (window.CompanyMail && CompanyMail.hasHistory && CompanyMail.hasHistory(c.id)) ? 0 : 1;
        return has(a) - has(b) || String(a.nafn || '').localeCompare(b.nafn || '', 'is');
      },
    };
    // Legacy fallback
    if (!state.sortCol) {
      if (state.sort === 'alpha')  state.sortCol = 'name';
      else if (state.sort === 'month')  state.sortCol = 'month';
      else if (state.sort === 'oldest') state.sortCol = 'lastYr';
      else state.sortCol = 'month';
      state.sortDir = 'asc';
    }
    const cmp = SORT_COMPARATORS[state.sortCol] || SORT_COMPARATORS.name;
    arr.sort(cmp);
    if (state.sortDir === 'desc') arr.reverse();
    return arr;
  }

  // ── Render ───────────────────────────────────────────────────────────────
  // 2026-06-20 (perf): re-entry is INSTANT. This view's DOM survives while it is
  // hidden, so coming BACK to "Fyrirtæki í þjónustu" used to needlessly wipe the
  // table to "Hleður…", re-fetch from Supabase, and rebuild all ~743 rows
  // (~1.5–2s of main-thread work) every single time. Now we keep the already-
  // rendered table on screen and refresh in the BACKGROUND, re-rendering only if
  // the underlying data actually changed (cheap signature compare), throttled so
  // rapid back-and-forth doesn't hammer the DB.
  let _rendered = false;
  let _lastDataSig = '';
  let _lastLoad = 0;
  let _bgRefreshing = false;

  // Cheap fingerprint of what the table draws — id + the few fields that change
  // (inspection status/month, derived unit count/estimate, priority). Far cheaper
  // than a re-render; lets a background refresh skip rebuilding when nothing
  // material changed.
  function dataSig() {
    const a = (_cache && _cache.list) || [];
    // tolur er hluti undirskriftarinnar: annars endurteiknaðist síðan EKKI
    // þegar view-talan kom inn eftir snapshot-málun (listinn óbreyttur →
    // sama sig → korpin sátu föst á „—"). Sást live 13.08.
    let s = JSON.stringify((_cache && _cache.tolur) || 0) + '|' + a.length + ':';
    for (let i = 0; i < a.length; i++) {
      const c = a[i], x = c._ars || {};
      s += c.id + ',' + (x.last_year_inspected || '') + ',' + (x.inspect_month || '')
         + ',' + (x._unit_count || '') + ',' + (x.estimated_yearly || '') + ',' + (x.priority || '') + ';';
    }
    return s;
  }

  async function backgroundRefresh() {
    if (_bgRefreshing) return;
    if (Date.now() - _lastLoad < 8000) return;   // rapid back-and-forth → skip the refetch
    _bgRefreshing = true;
    try {
      await loadAll();
      _lastLoad = Date.now();
      const ns = dataSig();
      // Ekki endurteikna (sópa burt röðum) á meðan notandi skrifar í ferðanótu —
      // textinn hyrfi úr reitnum. Sleppum þessari umferð; _lastDataSig stendur óbreytt
      // svo næsta refresh teiknar þegar reiturinn er ekki lengur í fókus.
      const _editingNote = document.activeElement && document.activeElement.classList
        && document.activeElement.classList.contains('_ars-plannote');
      if (ns !== _lastDataSig && !_editingNote) { render(); _lastDataSig = ns; }  // only rebuild if data changed
    } catch (_) {} finally { _bgRefreshing = false; }
  }

  async function show() {
    ensureView();
    const main = document.getElementById('ars-main');
    if (!main) return;
    // Fast path: already rendered (toolbar present) and DOM intact → show it
    // instantly and refresh in the background. No "Hleður…" flash, no blocking
    // rebuild of 743 rows.
    if (_rendered && document.getElementById('_ars-search')) {
      backgroundRefresh();
      return;
    }
    // Kald opnun: mála STRAX úr localStorage-snapshotinu (síðasta heimsókn) og
    // sækja ferskt í bakgrunni — „Hleður…" sést bara í allra fyrstu heimsókn.
    const snap = (!_cache.list.length) ? readSnapshot() : null;
    if (snap) {
      _cache.list = snap.list;
      _cache.byId = Object.fromEntries(snap.list.map(c => [c.id, c]));   // detail-smellir virka strax
      if (snap.tolur && !_cache.tolur) _cache.tolur = snap.tolur;        // talnakortin strax, ekki „—"
      render();
      _rendered = true;
      _lastDataSig = dataSig();
      backgroundRefresh();
      return;
    }
    main.innerHTML = '<div style="padding:24px;color:var(--ink4)">Hleður…</div>';
    await loadAll();
    _lastLoad = Date.now();
    render();
    _rendered = true;
    _lastDataSig = dataSig();
  }

  // ── ⚡ Lagfæringar-hamur (override mode, 2026-07-16) ──────────────────────
  // Kveikt/slökkt með ⚡-hnappnum í tólastikunni; geymt í localStorage svo
  // stillingin lifi milli heimsókna. Í hamnum verða Mánuður/Tæki/Ár-reitirnir
  // í listanum smellanlegir svo eigandinn geti lagað augljóslega ranga tölu
  // beint — án þess að opna fyrirtækið.
  const OVR_LS = 'ars_override_mode';
  function overrideOn() { try { return localStorage.getItem(OVR_LS) === '1'; } catch (_) { return false; } }
  // Breytingaskrá (2026-07-16, ósk Agnars): HVER handvirk yfirskrift skráist í
  // Supabase-töfluna override_log (co, reitur, gamalt→nýtt, hvenær) svo Claude
  // geti síðar lagað RÓTINA (ranga skýrslu/tengingu) og merkt resolved.
  // Best-effort — má aldrei stöðva vistunina sjálfa.
  function ovrLog(coId, field, oldV, newV) {
    try {
      const c = (_cache.byId && _cache.byId[coId]) || {};
      const sb = getSB();
      if (!sb) return;
      sb.from('override_log').insert({
        co_id: coId, co_nafn: c.nafn || null, field: field,
        old_value: oldV == null ? null : String(oldV),
        new_value: newV == null ? null : String(newV),
        page: 'arsskodun'
      }).then(() => {}, () => {});
    } catch (_) {}
  }
  // Gildi sem ber handvirka yfirskrift fær gult strikamerki + punkt.
  function manualMark(html, isManual) {
    if (!isManual) return html;
    return '<span title="Handvirkt yfirskrifað" style="border-bottom:2px dotted #f59e0b;padding-bottom:1px">' + html + '</span>'
      + '<span title="Handvirkt yfirskrifað" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#f59e0b;margin-left:4px;vertical-align:middle"></span>';
  }

  // Inline mánaðar-val í listareit. Vistar í arsskodun_customers-blobið
  // (inspect_month + inspect_month_manual:true — vinnur yfir skýrslu-mánuðinn).
  // Esc/blur hættir við; „↺ Hreinsa yfirskrift" fellir handvirka gildið svo
  // skýrslu-gögnin flæði aftur.
  function ovrEditMonth(cell, coId) {
    if (cell.querySelector('select')) return;
    const c = _cache.list.find(x => x.id === coId);
    if (!c) return;
    const ars = c._ars || {};
    const cur = +ars.inspect_month || 0;
    const isManual = !!ars.inspect_month_manual;
    const prev = cell.innerHTML;
    const sel = document.createElement('select');
    sel.className = '_ars-ovr-pop';
    sel.style.cssText = 'min-height:40px;min-width:118px;max-width:100%;padding:6px 8px;border:2px solid #f59e0b;border-radius:8px;font:inherit;font-size:13px;background:var(--surface);color:var(--ink1);outline:none;cursor:pointer';
    sel.innerHTML = '<option value="0"' + (cur === 0 ? ' selected' : '') + '>— enginn</option>'
      + MONTHS_IS.map((n, i) => `<option value="${i + 1}" ${cur === i + 1 ? 'selected' : ''}>${n}</option>`).join('')
      + (isManual ? '<option value="clear">↺ Hreinsa yfirskrift</option>' : '');
    cell.innerHTML = '';
    cell.appendChild(sel);
    sel.focus();
    let done = false;
    const cancel = () => { if (done) return; done = true; cell.innerHTML = prev; };
    sel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); cancel(); } });
    sel.addEventListener('blur', () => setTimeout(cancel, 150));
    sel.addEventListener('change', async () => {
      if (done) return;
      done = true;
      const v = sel.value;
      // ALLTAF LEYFA VISTUN — engin validering, valið vistast alltaf.
      const patch = v === 'clear'
        ? { inspect_month: 0, inspect_month_manual: false }
        : { inspect_month: parseInt(v, 10) || 0, inspect_month_manual: true };
      const ok = (window.AppSettings && AppSettings.save)
        ? await AppSettings.save({ [STORAGE_KEY]: { [String(coId)]: patch } })
        : false;
      if (!ok) { alert('Vista mistókst'); cell.innerHTML = prev; return; }
      ovrLog(coId, 'inspect_month', cur || '—', v === 'clear' ? '↺ hreinsað' : (MONTHS_IS[patch.inspect_month - 1] || '—'));
      Object.assign(ars, patch);
      if (v === 'clear') { try { await loadAll(); } catch (_) {} }  // skýrslu-mánuðurinn flæðir aftur
      render();
    });
  }

  // Inline ártals-innsláttur (Síðast skoðað). 4 tölustafir eða tómt (= hreinsa).
  // last_year_inspected er blob-only — engin skýrslu-yfirskrift, enginn vörður.
  function ovrEditYear(cell, coId) {
    if (cell.querySelector('input')) return;
    const c = _cache.list.find(x => x.id === coId);
    if (!c) return;
    const ars = c._ars || {};
    const cur = +ars.last_year_inspected || 0;
    const prev = cell.innerHTML;
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'numeric';
    inp.maxLength = 4;
    inp.value = cur || '';
    inp.placeholder = 'áár';
    inp.className = '_ars-ovr-pop';
    inp.style.cssText = 'min-height:40px;width:74px;padding:6px 8px;border:2px solid #f59e0b;border-radius:8px;font:inherit;font-size:13px;font-weight:700;text-align:center;background:var(--surface);color:var(--ink1);outline:none';
    cell.innerHTML = '';
    cell.appendChild(inp);
    inp.focus();
    inp.select();
    let done = false;
    const cancel = () => { if (done) return; done = true; cell.innerHTML = prev; };
    const commit = async () => {
      if (done) return;
      const raw = String(inp.value || '').trim();
      // Tómt = hreinsa; annars 4 tölustafir. Rangt snið = hætta við (aldrei blokka).
      if (raw !== '' && !/^\d{4}$/.test(raw)) { cancel(); return; }
      const y = raw === '' ? 0 : parseInt(raw, 10);
      if (y === cur) { cancel(); return; }
      done = true;
      const ok = (window.AppSettings && AppSettings.save)
        ? await AppSettings.save({ [STORAGE_KEY]: { [String(coId)]: { last_year_inspected: y } } })
        : false;
      if (!ok) { alert('Vista mistókst'); cell.innerHTML = prev; return; }
      ovrLog(coId, 'last_year_inspected', cur || '—', y || '↺ hreinsað');
      ars.last_year_inspected = y;
      render();
    };
    inp.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); cancel(); }
      else if (e.key === 'Enter') { e.preventDefault(); commit(); }
    });
    inp.addEventListener('blur', () => setTimeout(commit, 150));
  }

  function render() {
    const main = document.getElementById('ars-main');
    // Preserve search-box focus across re-renders: typing in #_ars-search
    // triggers a debounced render that calls main.innerHTML=... which
    // destroys the old input element. Without this, the user loses focus
    // after every keystroke once they pause for >200ms.
    const prevActive = document.activeElement;
    const keepSearchFocus = !!(prevActive && prevActive.id === '_ars-search');
    const selStart = keepSearchFocus ? prevActive.selectionStart : null;
    const selEnd = keepSearchFocus ? prevActive.selectionEnd : null;
    if (!main) return;
    const all = _cache.list;
    const filtered = filteredSorted();
    // 2026-06-21 (mobile): on a phone-width screen force the CARD layout — the
    // wide 8-column table scrolls sideways and is unusable with a thumb. Desktop
    // keeps the user's chosen view (state.view).
    // 2026-07-06: the app-wide view-mode toggle (📱 Sími / ▦ Tafla / 🖥 Skjár,
    // lives in the Brunastál banner — patch 166) now also drives this page.
    //   mobile  → single-column stacked cards (renderCards + data-viewmode CSS)
    //   table   → dense company table (renderTable + data-viewmode CSS)
    //   desktop → the current behaviour (phone-auto + the user's Kort/Listi pick)
    _ensureArsMobileCss();
    _ensureArsVmCss();
    const vm = arsViewMode();
    const isPhone = (window.innerWidth || document.documentElement.clientWidth) <= 768;
    // 2026-08-23 (app-ham, samþykkt mockup v2): sími/app-ham fær nýtt ÞÉTT
    // raða-útlit — EIN lína á fyrirtæki (nafn · 4-ára reitir · mánuður · akstur ·
    // staða). Kviknar á data-viewmode="mobile" (viewmode-rofinn) EÐA body.appmode
    // (app-skelin, patch 261 — hún setur líka data-viewmode=mobile gegnum 166, en
    // við lesum bæði svo það sé skothelt). Skjáborðið (Kort/Listi) er ÓBREYTT.
    const appMode = !!(document.body && document.body.classList.contains('appmode'));
    const effView = (vm === 'mobile' || appMode) ? 'mrows'
                  : vm === 'table'  ? 'list'
                  : (isPhone ? 'card' : state.view);
    // Stats restricted to companies that ARE in árskoðun (have equipment).
    // The full list still includes everyone — the user wanted the whole
    // fyrirtækjaregistur in one tab, but tiles only count the ones that
    // matter for yearly inspections.
    const today = new Date();
    const curYear = today.getFullYear();
    // 2026-08-11: þegar „fela slepptu" er á taka ÖLL spjöldin, mánaðar-teljararnir
    // og virðis-tölurnar mið af því — annars segði „Eftir 2026" áfram töluna sem
    // innihélt sofandi kúnnana og listinn fyrir neðan sýndi aðra. Feluglerið er
    // hunsað meðan leitað er, alveg eins og í filteredSorted().
    const skipHidden = state.hideSkipped && !state.search.trim();
    const arsAllRaw = all.filter(c => c._ars && c._ars.equipment);
    const arsAll = skipHidden ? arsAllRaw.filter(c => !isSkippedLastYear(c, curYear)) : arsAllRaw;
    const skippedCount = arsAllRaw.filter(c => isSkippedLastYear(c, curYear)).length;
    // 2026-08-17 (Agnar: „sýndu frekar 303-309 töluna og síðan 245 töluna fyrir
    // neðan"): Búið-spjaldið sýnir nú SÖMU tölu og listinn/sían — fjölda merkta
    // „Skoðað <ár>" (last_year_inspected) — með skjalfestu grunntöluna
    // (v_thjonustu_tolur.buid_2026 = 2026-skýrsla skráð) sem undirlínu. Bilið
    // milli talnanna = skoðaðir staðir sem vantar skráða skýrslu.
    const buidTalin = all.filter(c => isDoneYear(c, curYear)).length;
    const allCount = skipHidden ? all.filter(c => !isSkippedLastYear(c, curYear)).length : all.length;
    const monthCounts = Array(13).fill(0);
    // index 0 = fjöldi án skráðs mánaðar („Án mánaðar"-chippurinn)
    arsAll.forEach(c => { const m = +c._ars.inspect_month || 0; if (m >= 1 && m <= 12) monthCounts[m]++; else monthCounts[0]++; });

    // Póstnúmerin í gögnunum + fjöldi á hvert (fyrir „📍 Númer"-gluggann).
    // Bæjarnafnið er lesið úr heimilisföngunum sjálfum (algengasti textinn
    // aftan við númerið) — ekkert hardkóðað póstnúmerakort að viðhalda.
    // Talan við hvert númer er fjöldinn undir NÚVERANDI stöðu/mánaðar-síu (án
    // póstnúmera-síunnar sjálfrar) — þannig segir hún „svona margar raðir fæ ég
    // ef ég vel þetta númer". Listi númeranna kemur samt úr öllum gögnunum svo
    // hann hoppi ekki til þegar stöðusíu er breytt.
    const pnrPool = filteredSorted({ ignorePostnr: true });
    const pnrCounts = new Map();   // '101' -> fjöldi ('' = án skráðs númers)
    const pnrTowns = new Map();    // '101' -> { 'Reykjavík': n, … }
    pnrPool.forEach(c => {
      const p = pnrOf(c);
      pnrCounts.set(p, (pnrCounts.get(p) || 0) + 1);
    });
    all.forEach(c => {
      const p = pnrOf(c);
      if (!pnrCounts.has(p)) pnrCounts.set(p, 0);
      if (!p) return;
      const m = String(c.heimilisfang || '').match(new RegExp('(?:^|[\\s,])' + p + '\\s+([^\\d,]+?)\\s*$'));
      if (m && m[1].trim()) {
        const tm = pnrTowns.get(p) || {};
        const t = m[1].trim();
        tm[t] = (tm[t] || 0) + 1;
        pnrTowns.set(p, tm);
      }
    });
    const pnrCodes = [...pnrCounts.keys()].filter(p => p !== '')
      .sort((a, b) => (parseInt(a, 10) || 9999) - (parseInt(b, 10) || 9999));
    // Allir mögulegu lyklarnir — notað þegar „tekið er af" úr fullu vali.
    const pnrAllKeys = pnrCodes.concat(pnrCounts.has('') ? [''] : []);
    const pnrTownOf = p => {
      const tm = pnrTowns.get(p);
      if (!tm) return '';
      return Object.entries(tm).sort((a, b) => b[1] - a[1])[0][0];
    };
    const pnrChecked = p => state.postnr === null || state.postnr.includes(p);
    const pnrActive = state.postnr !== null;
    const doneThisYear = arsAll.filter(c => +c._ars.last_year_inspected === curYear).length;
    // Talnakortin þrjú: AÐEINS viewið v_thjonustu_tolur (sjá athugasemd í
    // _loadAllInner) — engir staðbundnir útreikningar mega birtast þar.
    const T = _cache.tolur || {};
    const tv = k => (T[k] == null ? '—' : T[k]);
    const totalEstimate = arsAll.reduce((s, c) => s + (+c._ars.estimated_yearly || 0), 0);
    const estDoneThisYear = arsAll
      .filter(c => +c._ars.last_year_inspected === curYear)
      .reduce((s, c) => s + (+c._ars.estimated_yearly || 0), 0);

    // 2026-05-17 (Luna): per-month / per-filter revenue summary shown below
    // the list. Lets the user see "if I do all of May's inspections, that's X kr".
    const filteredAars = filtered.filter(c => c._ars && c._ars.equipment);
    const filteredTotal = filteredAars.reduce((s, c) => s + (+c._ars.estimated_yearly || 0), 0);
    const filteredDone = filteredAars
      .filter(c => +c._ars.last_year_inspected === curYear)
      .reduce((s, c) => s + (+c._ars.estimated_yearly || 0), 0);
    const filteredRemain = Math.max(0, filteredTotal - filteredDone);
    const filteredDonePct = filteredTotal > 0 ? Math.round(filteredDone / filteredTotal * 100) : 0;
    const filterLabel = (state.months && state.months.length)
      ? monthFilterLabel(curYear)
      : (state.status === 'done'    ? `Búið ${curYear} (allir mánuðir)`
       : state.status === 'pending' ? `Á eftir + sleppt (allir mánuðir)`
       : state.status === 'pending2026' ? `Eftir ${curYear} — allt óbúið (allir mánuðir)`
       : state.status === 'suspect' ? `Óvíst — líklega óvart í þjónustu (engin saga, enginn mánuður, engin tæki)`
       : state.status === 'ivinnslu'? `Í vinnslu`
       : state.status === 'akstur'  ? `Aksturslisti`
       : state.status === 'never'   ? `Aldrei skoðað`
       : `Allir mánuðir ${curYear}`);
    // 2026-07-28: meðan leitað er gilda ENGAR síur (sjá filteredSorted), svo
    // merkimiðinn má ekki halda áfram að segja „Jún 2026" — það var einmitt það
    // sem lét leitina líta út fyrir að vera biluð.
    const searching = !!state.search.trim();
    const effFilterLabel = searching
      ? `Leit: „${esc(state.search.trim())}" — allir mánuðir og allar stöður`
      : filterLabel + (pnrActive ? ' · ' + postnrFilterLabel() : '');

    main.innerHTML = `
      <div style="max-width:1720px;margin:0 auto;padding:10px 18px 60px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:11px;min-width:0">
            <div style="width:38px;height:38px;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:18px;background:linear-gradient(180deg,#4a4e57,#2b2e34);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.18),inset 0 -3px 6px rgba(0,0,0,.4)">🏢</div>
            <div style="min-width:0">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:-.01em;line-height:1.15">Fyrirtæki í Þjónustu</h1>
              <div class="_ars-sub" style="font-size:12px;color:rgba(255,255,255,.6);margin-top:1px">${tv('allar_i_thjonustu')} fyrirtæki · ${tv('i_arsskodun')} í árlegri slökkvitækjaskoðun${skipHidden ? ` · <span class="_ars-goskip" title="Opna listann yfir slepptu — þar má virkja einstaka aftur með ↩" style="color:#fcd34d;cursor:pointer;text-decoration:underline dotted">🟡 ${skippedCount} slepptir faldir</span>` : ''}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button id="_ars-new" type="button" style="padding:7px 14px;background:#dc2626;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">+ Nýtt fyrirtæki</button>
            <div style="display:flex;border:1px solid var(--brd2);border-radius:8px;overflow:hidden;background:var(--surface)">
              <button data-view-mode="card" class="_ars-vm" style="padding:7px 14px;border:none;background:${state.view==='card'?'var(--brand)':'var(--surface)'};color:${state.view==='card'?'#fff':'var(--ink2)'};cursor:pointer;font:inherit;font-size:12px;font-weight:600">🟦 Kort</button>
              <button data-view-mode="list" class="_ars-vm" style="padding:7px 14px;border:none;background:${state.view==='list'?'var(--brand)':'var(--surface)'};color:${state.view==='list'?'#fff':'var(--ink2)'};cursor:pointer;font:inherit;font-size:12px;font-weight:600;border-left:1px solid var(--brd2)">📋 Listi</button>
            </div>
            <select id="_ars-sort" aria-label="Raða eftir" title="Raða eftir" style="padding:7px 10px;border:1px solid var(--brd2);border-radius:8px;background:var(--surface);font:inherit;font-size:12px;color:var(--ink1);cursor:pointer">
              <option value="alpha" ${state.sort==='alpha'?'selected':''}>↕️ Stafrófsröð</option>
              <option value="postnumer" ${state.sort==='postnumer'?'selected':''}>📍 Póstnúmer</option>
              <option value="month" ${state.sort==='month'?'selected':''}>📅 Eftir skoðunarmánuði (næst fyrst)</option>
              <option value="oldest" ${state.sort==='oldest'?'selected':''}>⏳ Þeir elstu fyrst (lengst síðan skoðað)</option>
              <option value="poststada" ${state.sort==='poststada'?'selected':''}>🚦 Póst-staða (ósvarað → saga → engin)</option>
              <option value="postavail" ${state.sort==='postavail'?'selected':''}>📧 Póstsaga til (fyrst)</option>
            </select>
            <span id="_ars-print-wrap" style="position:relative;display:inline-flex;align-items:stretch">
              <button id="_ars-print" type="button" title="Prenta listann eins og hann er síaður núna" style="padding:7px 12px;border:1px solid var(--brd2);border-radius:8px 0 0 8px;background:var(--surface);font:inherit;font-size:12px;font-weight:600;color:var(--ink1);cursor:pointer">🖨 Prenta lista</button>
              <button id="_ars-print-caret" type="button" aria-haspopup="true" aria-expanded="false" title="Prenta aksturslista (per bílstjóra) í póstnúmeraröð" style="padding:7px 9px;border:1px solid var(--brd2);border-left:none;border-radius:0 8px 8px 0;background:var(--surface);font:inherit;font-size:11px;font-weight:700;color:var(--ink2);cursor:pointer;display:inline-flex;align-items:center;gap:2px">🚗<span style="font-size:9px">▾</span></button>
              <div id="_ars-print-menu" role="menu" style="display:none;position:absolute;top:calc(100% + 5px);right:0;z-index:60;min-width:236px;background:var(--surface);border:1px solid var(--brd2);border-radius:10px;box-shadow:0 10px 28px rgba(0,0,0,.20);padding:5px">
                <div style="font-size:10px;font-weight:800;color:var(--ink3);text-transform:uppercase;letter-spacing:.05em;padding:6px 9px 4px">Prenta aksturslista · póstnúmeraröð</div>
                <button data-ak="1" class="_ars-pak" type="button" style="display:block;width:100%;text-align:left;padding:8px 10px;border:none;background:none;border-radius:7px;font:inherit;font-size:12.5px;font-weight:600;color:var(--ink1);cursor:pointer">🚗 Aksturslisti 1</button>
                <button data-ak="2" class="_ars-pak" type="button" style="display:block;width:100%;text-align:left;padding:8px 10px;border:none;background:none;border-radius:7px;font:inherit;font-size:12.5px;font-weight:600;color:var(--ink1);cursor:pointer">🚗 Aksturslisti 2</button>
                <button data-ak="3" class="_ars-pak" type="button" style="display:block;width:100%;text-align:left;padding:8px 10px;border:none;background:none;border-radius:7px;font:inherit;font-size:12.5px;font-weight:600;color:var(--ink1);cursor:pointer">🚗 Aksturslisti 3</button>
                <button data-ak="0" class="_ars-pak" type="button" style="display:block;width:100%;text-align:left;padding:8px 10px;border:none;background:none;border-radius:7px;font:inherit;font-size:12px;font-weight:600;color:var(--ink2);cursor:pointer;border-top:1px solid var(--brd);margin-top:3px">🚗 Allir listar saman</button>
              </div>
            </span>
            <button id="_ars-ovr" type="button" aria-pressed="${overrideOn()}" title="" style="padding:6px 8px;border:none;border-radius:8px;background:${overrideOn() ? 'rgba(245,158,11,.18)' : 'transparent'};font:inherit;font-size:13px;cursor:pointer;opacity:${overrideOn() ? '1' : '.35'};min-width:36px;min-height:36px">⚡</button>
          </div>
        </div>

        <div class="_ars-statgrid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
          <div style="background:var(--surface);border:1px solid var(--brd);border-radius:10px;padding:11px 13px">
            <div style="font-size:10px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.05em">Fjöldi</div>
            <div style="font-size:22px;font-weight:800;color:var(--ink1);line-height:1.1;margin-top:2px">${tv('fjoldi')}</div>
            <div style="font-size:10.5px;color:var(--ink3)">${tv('i_arsskodun')} í ársskoðun</div>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:11px 13px" title="Stóra talan = merkt Skoðað ${curYear} — sama tala og listinn sýnir. Neðri talan = ${curYear}-skýrsla skráð í skjalagrunninn. Munurinn = skoðaðir staðir sem vantar skráða skýrslu.">
            <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em">Búið ${curYear}</div>
            <div style="font-size:22px;font-weight:800;color:#15803d;line-height:1.1;margin-top:2px">${buidTalin}</div>
            <div style="font-size:10.5px;color:#16a34a">þar af ${tv('buid_2026')} með skýrslu skjalfesta</div>
          </div>
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:11px 13px">
            <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em">Eftir ${curYear}</div>
            <div style="font-size:22px;font-weight:800;color:#b45309;line-height:1.1;margin-top:2px">${tv('eftir_2026')}</div>
            <div style="font-size:10.5px;color:#b45309">í pípunni</div>
          </div>
          <div class="bstal-hero" style="background:var(--thm-sumh);color:#fff;border:1px solid var(--brand);border-radius:10px;padding:11px 13px">
            <div style="font-size:10px;font-weight:700;color:var(--brd2);text-transform:uppercase;letter-spacing:.05em">≈ Áætlað virði ársþjónustu ${curYear}</div>
            <div style="font-size:22px;font-weight:800;color:#fff;line-height:1.1;margin-top:2px;font-variant-numeric:tabular-nums">${fmtKr(totalEstimate)}</div>
            <div style="font-size:10.5px;color:#86efac">þar af ≈ ${fmtKr(estDoneThisYear)} búið</div>
          </div>
        </div>

        <!-- Filter strip -->
        <div class="_ars-filterstrip" style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
          <input id="_ars-search" type="search" placeholder="🔎 Leita…" value="${esc(state.search)}" style="flex:1;min-width:120px;max-width:190px;padding:8px 11px;border:1px solid var(--brd2);border-radius:8px;font:inherit;font-size:13px;background:var(--surface);color:var(--ink1);outline:none"/>
          ${searching ? `<span id="_ars-searchall" title="Meðan leitað er gilda hvorki mánaðar- né stöðusía — leitin fer yfir alla viðskiptavini" style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:8px;background:#1d4ed8;color:#fff;font-size:11.5px;font-weight:700;white-space:nowrap">🔎 Leit yfir allt<span id="_ars-clearsearch" title="Hreinsa leit og setja síur aftur á" style="cursor:pointer;opacity:.85;font-weight:800">✕</span></span>` : ''}
          <div class="_ars-statusrow" style="display:flex;gap:5px;border:1px solid var(--brd2);border-radius:8px;overflow:hidden;background:var(--surface)">
            ${[
              { v: 'all', label: 'Allt' },
              { v: 'done', label: '✅ Búið ' + curYear },
              { v: 'pending', label: '⏳ Eftir' },
              { v: 'pending2026', label: '🗓️ Eftir ' + curYear },
              { v: 'skipped2025', label: '🟡 Slepptir í fyrra' },
              { v: 'priority', label: '❗ Forgangur' },
              { v: 'suspect', label: '❓ Óvíst' },
              { v: 'never', label: '⛔ Aldrei' },
              // 2026-07-28: handvirka NÝTT-merkið (patch 281 — takki á
              // fyrirtækjaprófílnum). Sama merki og sía og í Brunakerfi yfirliti.
              { v: 'nytt', label: '🆕 Nýtt' },
              // 2026-07-30 (ósk Agnars): tvær síur í viðbót — vinnan sem er
              // hafin en óklárðuð, og allir sem eru á akstursleið.
              { v: 'ivinnslu', label: '🔧 Í vinnslu' },
              { v: 'akstur', label: '🚗 Aksturslisti' }
            ].map(s => `
              <button data-status="${s.v}" class="_ars-st" style="padding:7px 11px;border:none;background:${state.status===s.v?'var(--brand)':'var(--surface)'};color:${state.status===s.v?'#fff':'var(--ink2)'};cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">${esc(s.label)}</button>
              ${s.v !== 'skipped2025' ? '' : `
              <span id="_ars-skiphide" role="checkbox" tabindex="0" aria-checked="${state.hideSkipped ? 'true' : 'false'}"
                title="${state.hideSkipped
                  ? `Slepptir (${skippedCount}) eru FALDIR úr öllum öðrum sýnum og tölum — smelltu til að sýna þá aftur`
                  : `Fela slepptu (${skippedCount}) úr öllum öðrum sýnum og tölum svo „Eftir“ sýni bara virku kúnnana`}"
                style="display:inline-flex;align-items:center;gap:4px;padding:7px 9px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700;user-select:none;white-space:nowrap;border-left:1px solid var(--brd2);background:${state.hideSkipped ? '#a16207' : 'var(--surface)'};color:${state.hideSkipped ? '#fff' : 'var(--ink3)'}">${state.hideSkipped ? '☑' : '☐'} fela</span>
              `}
            `).join('')}
          </div>
        </div>

        <!-- Month chip row (fjöl-val: veldu nokkra mánuði saman; „Án mánaðar" aftast) -->
        <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
          <span style="font-size:10.5px;font-weight:700;color:var(--ink3);text-transform:uppercase;padding-right:3px">Mánuður:</span>
          ${(() => {
            const selSet = new Set(state.months || []);
            const allActive = selSet.size === 0;
            const chip = (dm, label, cnt, active, dim) =>
              `<button data-month="${dm}" class="_ars-mo" aria-pressed="${active}" style="padding:5px 11px;border:1px solid ${active?'var(--brand)':(dim?'var(--brd)':'var(--brd2)')};background:${active?'var(--brand)':'var(--surface)'};color:${active?'#fff':(dim?'#64748b':'var(--ink1)')};border-radius:99px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">${label}${cnt?` <span style="opacity:.6;font-weight:500">${cnt}</span>`:''}</button>`;
            let out = chip('all', 'Allir', 0, allActive, false);
            out += MONTHS_IS_SHORT.map((m, i) => {
              const mn = i + 1, cnt = monthCounts[mn];
              return chip(mn, esc(m), cnt, selSet.has(mn), !cnt);
            }).join('');
            // „Án mánaðar" aftast (fyrirtæki án skráðs skoðunarmánaðar)
            out += chip(0, '🚫 Án mánaðar', monthCounts[0], selSet.has(0), !monthCounts[0]);
            return out;
          })()}
        </div>

        <!-- Póstnúmera-sía (2026-08-12, ósk Agnars): „Númer"-takki sem opnar
             langan glugga með ÖLLUM póstnúmerum — allt valið sjálfgefið, hægt
             að taka af, hreinsa allt, velja allt, eða velja bara 1+ númer.
             Fyrir keyrslur í bæi lengra í burtu. -->
        <div id="_ars-pnr-row" style="display:flex;gap:5px;flex-wrap:wrap;margin:-8px 0 14px;align-items:center;position:relative">
          <span style="font-size:10.5px;font-weight:700;color:var(--ink3);text-transform:uppercase;padding-right:3px">Númer:</span>
          <button id="_ars-pnr-btn" type="button" aria-expanded="${_pnrOpen}" title="Sía listann eftir póstnúmerum — fyrir keyrslur í bæi lengra í burtu" style="padding:5px 12px;border:1px solid ${pnrActive ? 'var(--brand)' : 'var(--brd2)'};background:${pnrActive ? 'var(--brand)' : 'var(--surface)'};color:${pnrActive ? '#fff' : 'var(--ink1)'};border-radius:99px;cursor:pointer;font:inherit;font-size:11px;font-weight:700">📍 Númer${pnrActive ? ` · ${state.postnr.length} valin` : ''} ${_pnrOpen ? '▴' : '▾'}</button>
          ${pnrActive ? `
            <span style="font-size:11px;color:var(--ink2);max-width:520px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(postnrFilterLabel())}</span>
            <button id="_ars-pnr-clear" type="button" title="Taka póstnúmera-síuna af — sýna öll númer aftur" style="padding:5px 11px;border:1px solid var(--brd2);background:var(--surface);color:var(--ink2);border-radius:99px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">✕ Sýna öll</button>
          ` : ''}
          ${_pnrOpen ? `
          <div id="_ars-pnr-panel" style="position:absolute;top:100%;left:0;margin-top:6px;z-index:80;background:var(--surface);border:1px solid var(--brd2);border-radius:12px;box-shadow:0 18px 44px rgba(0,0,0,.30);width:min(460px,94vw);max-height:65vh;display:flex;flex-direction:column;overflow:hidden">
            <div style="display:flex;gap:6px;align-items:center;padding:9px 11px;border-bottom:1px solid var(--brd);background:var(--surface2)">
              <span style="font-size:11px;font-weight:800;color:var(--ink1);margin-right:auto">📍 Póstnúmer${pnrActive ? ` — ${state.postnr.length} af ${pnrAllKeys.length} valin` : ' — öll valin'}</span>
              <button id="_ars-pnr-selall" type="button" style="padding:4px 10px;border:1px solid var(--brd2);background:var(--surface);color:var(--ink1);border-radius:7px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">☑ Velja allt</button>
              <button id="_ars-pnr-selnone" type="button" style="padding:4px 10px;border:1px solid var(--brd2);background:var(--surface);color:var(--ink1);border-radius:7px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">☐ Hreinsa allt</button>
              <button id="_ars-pnr-close" type="button" style="padding:4px 10px;border:none;background:var(--brand);color:#fff;border-radius:7px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:800">✓ Loka</button>
            </div>
            <div style="overflow-y:auto;padding:5px">
              ${pnrAllKeys.map(p => {
                const on = pnrChecked(p);
                const town = p === '' ? '' : pnrTownOf(p);
                const cnt = pnrCounts.get(p) || 0;
                return `<button type="button" class="_ars-pnr-opt" data-pnr="${esc(p)}" aria-pressed="${on}" title="${cnt ? cnt + ' fyrirtæki með núverandi síu' : 'Ekkert fyrirtæki með núverandi síu'}" style="display:flex;width:100%;gap:9px;align-items:center;padding:7px 10px;border:none;border-radius:8px;background:${on ? 'transparent' : 'var(--surface2)'};cursor:pointer;font:inherit;text-align:left;opacity:${cnt ? 1 : .55}">
                  <span style="font-size:14px;line-height:1;color:${on ? 'var(--brand)' : 'var(--ink4)'}">${on ? '☑' : '☐'}</span>
                  <span style="min-width:38px;text-align:center;padding:1px 6px;border-radius:6px;background:${on ? 'var(--surface2,#eef2ff)' : 'transparent'};color:${on ? '#3730a3' : 'var(--ink4)'};font-size:11px;font-weight:800;font-variant-numeric:tabular-nums">${p === '' ? '—' : esc(p)}</span>
                  <span style="flex:1;font-size:12px;color:${on ? 'var(--ink1)' : 'var(--ink4)'};font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p === '' ? '🚫 Án skráðs númers' : esc(town)}</span>
                  <span style="font-size:11px;color:var(--ink3);font-variant-numeric:tabular-nums">${cnt}</span>
                </button>`;
              }).join('')}
            </div>
          </div>
          ` : ''}
        </div>

        ${filtered.length === 0 ? (all.length === 0 && _loadingAll ? `
          <div style="background:var(--surface);border:2px dashed var(--brd2);border-radius:12px;padding:38px;text-align:center;color:var(--ink3)">
            <div style="font-size:30px;margin-bottom:8px">⏳</div>
            <div style="font-size:14px;font-weight:600;color:var(--ink1);margin-bottom:3px">Hleður gögnum…</div>
            <div style="font-size:12px">Fyrirtækin birtast eftir andartak.</div>
          </div>
        ` : `
          <div style="background:var(--surface);border:2px dashed var(--brd2);border-radius:12px;padding:38px;text-align:center;color:var(--ink3)">
            <div style="font-size:30px;margin-bottom:8px">🔍</div>
            <div style="font-size:14px;font-weight:600;color:var(--ink1);margin-bottom:3px">Engin fyrirtæki passa við þessa síu</div>
            <div style="font-size:12px">Reyndu að breyta sía eða leitarstreng.</div>
          </div>
        `) : (state.status === 'suspect' ? renderSuspectList(filtered) : (effView === 'mrows' ? renderMobileRows(filtered) : effView === 'card' ? renderCards(filtered) : renderTable(filtered)))}

        ${filteredAars.length > 0 ? `
        <div class="_ars-summary" style="margin-top:14px;padding:13px 16px;background:var(--surface2);border:1px solid var(--brd);border-radius:10px;display:flex;gap:24px;justify-content:space-between;flex-wrap:wrap;align-items:center">
          <div>
            <div style="font-size:10.5px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.05em">Samantekt — ${esc(effFilterLabel)}</div>
            <div style="font-size:13px;color:var(--ink2);margin-top:3px">${filteredAars.length} fyrirtæki í ársskoðun</div>
          </div>
          <div style="display:flex;gap:22px;flex-wrap:wrap">
            <div style="text-align:right">
              <div style="font-size:10.5px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.05em">≈ Áætlað virði</div>
              <div style="font-size:18px;font-weight:800;color:var(--ink1);font-variant-numeric:tabular-nums">${fmtKr(filteredTotal)}</div>
            </div>
            ${filteredDone > 0 ? `
            <div style="text-align:right">
              <div style="font-size:10.5px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em">Þar af búið</div>
              <div style="font-size:18px;font-weight:800;color:#15803d;font-variant-numeric:tabular-nums">${fmtKr(filteredDone)}</div>
              <div style="font-size:10.5px;color:#16a34a">${filteredDonePct}%</div>
            </div>` : ''}
            ${filteredRemain > 0 ? `
            <div style="text-align:right">
              <div style="font-size:10.5px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em">Eftir</div>
              <div style="font-size:18px;font-weight:800;color:#b45309;font-variant-numeric:tabular-nums">${fmtKr(filteredRemain)}</div>
            </div>` : ''}
          </div>
        </div>
        ` : ''}

        <div style="margin-top:18px;font-size:11px;color:var(--ink4);text-align:center">
          Sýni <strong style="color:var(--ink2)">${filtered.length}</strong> af ${allCount} viðskiptavinum${skipHidden ? ` · <span class="_ars-goskip" title="Opna listann yfir slepptu" style="cursor:pointer;text-decoration:underline dotted">${skippedCount} slepptir faldir</span>` : ''}
        </div>
      </div>
    `;

    // Re-stamp the póst-stöðumerki (patch 295) deterministically after every
    // render. Filter/month/sort re-renders rebuild the rows, and the badge's own
    // MutationObserver raced that — so the dots vanished. This runs right after
    // the rows are in the DOM. No-op if the badge patch isn't loaded.
    try { window.CompanyMail && CompanyMail.onListRender && CompanyMail.onListRender(); } catch (_) {}

    // Wire interactions
    main.querySelectorAll('._ars-vm').forEach(b => b.addEventListener('click', () => {
      state.view = b.dataset.viewMode; saveState(); render();
    }));
    main.querySelector('#_ars-new')?.addEventListener('click', openNewCompanyDialog);
    main.querySelector('#_ars-sort')?.addEventListener('change', e => {
      const v = e.target.value;
      // Drive the SAME sort path as the column headers (state.sortCol/Dir) so the
      // choice actually re-sorts the list — and so the print, which uses
      // filteredSorted(), matches exactly what is on screen.
      if (v === 'alpha')       { state.sortCol = 'name';      state.sortDir = 'asc'; }
      else if (v === 'postnumer') { state.sortCol = 'postnumer'; state.sortDir = 'asc'; }
      else if (v === 'month')  { state.sortCol = 'month';     state.sortDir = 'asc'; }
      else if (v === 'oldest') { state.sortCol = 'lastYr';    state.sortDir = 'asc'; }
      else if (v === 'poststada') { state.sortCol = 'poststada'; state.sortDir = 'asc'; }
      else if (v === 'postavail') { state.sortCol = 'postavail'; state.sortDir = 'asc'; }
      state.sort = v; saveState(); render();
    });
    main.querySelector('#_ars-print')?.addEventListener('click', printList);
    // 🚗▾ Prenta-aksturslista fellilisti (per bílstjóra, póstnúmeraröð). Gagnsæ bakgrunns-
    // hlíf lokar honum — engir document-hlustarar sem leka milli render-umferða.
    (() => {
      const caret = main.querySelector('#_ars-print-caret');
      const menu  = main.querySelector('#_ars-print-menu');
      if (!caret || !menu) return;
      const close = () => { menu.style.display = 'none'; caret.setAttribute('aria-expanded', 'false'); document.getElementById('_ars-print-back')?.remove(); };
      const open  = () => {
        menu.style.display = 'block'; caret.setAttribute('aria-expanded', 'true');
        const back = document.createElement('div');
        back.id = '_ars-print-back';
        back.style.cssText = 'position:fixed;inset:0;z-index:59;background:transparent';
        back.addEventListener('click', close);
        document.body.appendChild(back);
      };
      caret.addEventListener('click', (e) => { e.stopPropagation(); (menu.style.display === 'block') ? close() : open(); });
      menu.querySelectorAll('._ars-pak').forEach(btn => {
        btn.addEventListener('mouseenter', () => { btn.style.background = 'var(--surface2,#eef2ff)'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = 'none'; });
        btn.addEventListener('click', (e) => { e.stopPropagation(); close(); printAksturList(+btn.dataset.ak || 0); });
      });
    })();
    main.querySelector('#_ars-ovr')?.addEventListener('click', () => {
      try { localStorage.setItem(OVR_LS, overrideOn() ? '0' : '1'); } catch (_) {}
      render();
    });
    // ⚡ Lagfæringar-hamur: smellanlegir reitir í listanum
    if (overrideOn()) {
      main.querySelectorAll('._ars-ovr-month').forEach(el => el.addEventListener('click', e => {
        e.stopPropagation(); ovrEditMonth(el, +el.dataset.coId);
      }));
      main.querySelectorAll('._ars-ovr-eq').forEach(el => el.addEventListener('click', e => {
        e.stopPropagation(); openDetail(+el.dataset.coId, { eqEdit: true });
      }));
      main.querySelectorAll('._ars-ovr-year').forEach(el => el.addEventListener('click', e => {
        e.stopPropagation(); ovrEditYear(el, +el.dataset.coId);
      }));
    }
    main.querySelectorAll('._ars-st').forEach(b => b.addEventListener('click', () => {
      state.status = b.dataset.status; saveState(); render();
    }));
    // Síðuskipting töflunnar (Fyrri/Næsta) — skruna efst á töfluna eftir flettingu.
    const pgPrev = main.querySelector('#_ars-pgprev');
    const pgNext = main.querySelector('#_ars-pgnext');
    const pgGo = d => { state._page = Math.max(1, (state._page || 1) + d); render();
      try { const t = document.querySelector('._ars-tblscroll'); if (t) t.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (_) {} };
    if (pgPrev && !pgPrev.disabled) pgPrev.addEventListener('click', () => pgGo(-1));
    if (pgNext && !pgNext.disabled) pgNext.addEventListener('click', () => pgGo(1));
    // 2026-08-17: „N slepptir faldir"-textinn (haus + fótur) er smellanlegur og
    // stekkur beint í 🟡 Slepptir-sýnina þar sem má yfirfara og virkja aftur.
    main.querySelectorAll('._ars-goskip').forEach(el => el.addEventListener('click', (e) => {
      e.stopPropagation(); state.status = 'skipped2025'; saveState(); render();
    }));
    // ✕ á áminningu beint á röðinni (2026-08-17, Agnar: „they are stuck on
    // some companies and I cant remove them") — sama vistun og 🗑 í ítarsýninni.
    main.querySelectorAll('._ars-amin-x').forEach(b => b.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const id = +b.dataset.coId; if (!id) return;
      if (!confirm('Eyða áminningunni af þessu fyrirtæki?')) return;
      const ok = (window.AppSettings && AppSettings.save)
        ? await AppSettings.save({ [STORAGE_KEY]: { [String(id)]: { aminning: '' } } })
        : false;
      if (!ok) { alert('Vistun mistókst — reyndu aftur'); return; }
      ovrLog(id, 'aminning', 'texti', '');
      const c2 = (_cache.list || []).find(x => +x.id === id);
      if (c2 && c2._ars) c2._ars.aminning = '';
      render();
    }));
    // ↩ Virkja aftur / aftur í sleppt — handvirk ekki_sleppt-yfirskrift per
    // fyrirtæki (vistast samstillt í arsskodun_customers + override_log).
    main.querySelectorAll('._ars-unskip').forEach(b => b.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const coId = +b.dataset.coId; if (!coId) return;
      const c = (_cache.byId && _cache.byId[coId]) || (_cache.list || []).find(x => +x.id === coId);
      if (!c) return;
      const cur = !!((c._ars || {}).ekki_sleppt);
      const next = !cur;
      b.disabled = true;
      try {
        if (window.AppSettings && AppSettings.save) {
          await AppSettings.save({ [STORAGE_KEY]: { [String(coId)]: { ekki_sleppt: next } } });
        }
        c._ars = c._ars || {}; c._ars.ekki_sleppt = next;
        ovrLog(coId, 'ekki_sleppt', String(cur), String(next));
        if (window.Toast && Toast.show) Toast.show(next
          ? '↩ ' + (c.nafn || '') + ' virkur aftur — telst ekki lengur sleppt'
          : '🟡 ' + (c.nafn || '') + ' aftur merkt sleppt');
      } catch (err) { alert('Vistun mistókst: ' + (err && err.message || err)); }
      render();
    }));
    // 🟡 „fela"-gátreiturinn — víxlar hvort slepptir sjáist í hinum sýnunum.
    // Stendur við hliðina á síunni sjálfri en kveikir hana EKKI (annars gætirðu
    // ekki falið þá án þess að hoppa í listann yfir þá).
    const skipBox = main.querySelector('#_ars-skiphide');
    if (skipBox) {
      const toggleSkip = (e) => {
        e.preventDefault(); e.stopPropagation();
        state.hideSkipped = !state.hideSkipped;
        saveState(); render();
      };
      skipBox.addEventListener('click', toggleSkip);
      skipBox.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') toggleSkip(e);
      });
    }
    main.querySelectorAll('._ars-mo').forEach(b => b.addEventListener('click', () => {
      // Fjöl-val: „Allir" hreinsar; annars víxlar (add/remove) mánuðinum (0 = án mánaðar).
      const raw = b.dataset.month;
      if (raw === 'all') {
        state.months = [];
      } else {
        const mn = parseInt(raw, 10);
        const set = new Set(state.months || []);
        if (set.has(mn)) set.delete(mn); else set.add(mn);
        state.months = [...set].sort((a, b) => a - b);
      }
      saveState(); render();
    }));
    // 📍 Númer — póstnúmera-glugginn. Opinn/lokaður lifir yfir render (module-
    // level _pnrOpen) svo glugginn haldist opinn meðan tekið er af/bætt við.
    main.querySelector('#_ars-pnr-btn')?.addEventListener('click', () => {
      _pnrOpen = !_pnrOpen; render();
    });
    main.querySelector('#_ars-pnr-clear')?.addEventListener('click', () => {
      state.postnr = null; saveState(); render();
    });
    main.querySelector('#_ars-pnr-selall')?.addEventListener('click', () => {
      state.postnr = null; saveState(); render();
    });
    main.querySelector('#_ars-pnr-selnone')?.addEventListener('click', () => {
      state.postnr = []; saveState(); render();
    });
    main.querySelector('#_ars-pnr-close')?.addEventListener('click', () => {
      _pnrOpen = false; render();
    });
    main.querySelectorAll('._ars-pnr-opt').forEach(b => b.addEventListener('click', () => {
      const p = b.dataset.pnr;
      if (state.postnr === null) {
        // Fullt val → fyrsta „taka af" smellinn breytir í fylki án þessa númers.
        state.postnr = pnrAllKeys.filter(k => k !== p);
      } else {
        const set = new Set(state.postnr);
        if (set.has(p)) set.delete(p); else set.add(p);
        // Ef ALLT er aftur valið → aftur í „engin sía" (null) svo ný númer í
        // gögnunum detti sjálfkrafa inn í framtíðinni.
        state.postnr = (pnrAllKeys.length && pnrAllKeys.every(k => set.has(k))) ? null : [...set];
      }
      saveState(); render();
    }));
    // 2026-05-26: column-header sort click — toggle dir if same col, else
    // switch to col with asc as default.
    main.querySelectorAll('._ars-sort').forEach(th => th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (state.sortCol === col) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortCol = col;
        // Sensible default direction per column: name/address/email ascending,
        // numeric/priority/status descending (so biggest/most-important on top)
        state.sortDir = (col === 'name' || col === 'address' || col === 'postnumer' || col === 'email' || col === 'month')
                        ? 'asc' : 'desc';
      }
      saveState(); render();
    }));
    // 🚦 Póst-staða röðun beint úr Fyrirtæki-hausnum (merkin birtast í þeim dálki).
    // Smellur hringar: ósvarað→saga→engin (poststada) → póstsaga til fyrst (postavail)
    // → til baka í stafrófsröð. stopPropagation svo nafn-röðun th-sins fari ekki í gang.
    main.querySelectorAll('._ars-mailsort').forEach(el => el.addEventListener('click', e => {
      e.stopPropagation();
      if (state.sortCol === 'poststada') {
        state.sortCol = 'postavail'; state.sortDir = 'asc'; state.sort = 'postavail';
      } else if (state.sortCol === 'postavail') {
        state.sortCol = 'name'; state.sortDir = 'asc'; state.sort = 'alpha';
      } else {
        state.sortCol = 'poststada'; state.sortDir = 'asc'; state.sort = 'poststada';
      }
      saveState(); render();
    }));
    let _searchTimer = null;
    main.querySelector('#_ars-search')?.addEventListener('input', e => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => { state.search = e.target.value; saveState(); render(); }, 200);
    });
    // ✕ á „Leit yfir allt"-merkinu: hreinsar leitina svo síurnar taki aftur gildi
    main.querySelector('#_ars-clearsearch')?.addEventListener('click', () => {
      clearTimeout(_searchTimer);
      state.search = ''; saveState(); render();
    });
    main.querySelectorAll('._ars-row, ._ars-card').forEach(el => {
      el.addEventListener('click', e => {
        // input/select/textarea í varnarlistanum (2026-08-14): ferðanótu-reiturinn
        // opnaði annars fyrirtækið við smell — guard hér er öruggari en að
        // treysta á stopPropagation á reitnum sjálfum.
        if (e.target.closest('button, a, input, select, textarea, ._ars-ovr-month, ._ars-ovr-eq, ._ars-ovr-year, ._ars-ovr-pop')) return;
        const id = +el.dataset.coId;
        if (!id) return;
        // 2026-06-18: skip the intermediate quick-view modal — go straight to
        // the company page (same as the modal's "🏢 Opna fyrirtæki" button).
        // The modal (openDetail) is still reachable programmatically (deep
        // links / other patches) but a row tap no longer stops on it.
        if (window._openCompanySafe) window._openCompanySafe(id);
        else if (window.App && App.switchView) { App.switchView('companies'); setTimeout(() => { if (window.Companies && Companies.openDetail) Companies.openDetail(id); }, 200); }
        else openDetail(id);
      });
    });

    // 📱 app-ham: akstur-toggle í þéttu röðunum (0→1→2→3→0). Skrifar í
    // RAUNVERULEGU akstur-geymsluna (arsskodun_customers[id].akstur) gegnum
    // window.ArsAkstur.set — sama einingar-skrif og patch 267/Bílstjóri lesa
    // (deep-merge, eyðir aldrei öðrum lyklum). Endurlitar hnappinn STRAX; vistun
    // er debounce-uð svo hröð 0→1→2→3 smelling verður EIN vistun. stopPropagation
    // svo röð-smellur opni ekki fyrirtækið um leið.
    main.querySelectorAll('._arsm-ak').forEach(btn => btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const id = +btn.dataset.akco; if (!id) return;
      const now = btn.classList.contains('d1') ? 1 : btn.classList.contains('d2') ? 2 : btn.classList.contains('d3') ? 3 : 0;
      const next = (now + 1) % 4;
      btn.classList.remove('d1', 'd2', 'd3');
      if (next) btn.classList.add('d' + next);
      btn.textContent = next || '—';
      btn.title = next ? ('Akstur ' + next + ' — smelltu til að breyta') : 'Enginn aksturslisti — smelltu til að setja á lista';
      const c = (_cache.byId && _cache.byId[id]) || (_cache.list || []).find(x => +x.id === id);
      if (c) { c._ars = c._ars || {}; c._ars.akstur = next; }   // svo endurteikning haldi litnum
      clearTimeout(_mrowAkTimers[id]);
      _mrowAkTimers[id] = setTimeout(() => {
        if (window.ArsAkstur && window.ArsAkstur.set) window.ArsAkstur.set(id, next);
        else if (window.AppSettings && AppSettings.save) AppSettings.save({ [STORAGE_KEY]: { [String(id)]: { akstur: next } } });
      }, 550);
    }));

    // ❓ Óvíst triage-listi: opna fyrirtæki + taka úr þjónustu
    main.querySelectorAll('._ars-open').forEach(a => a.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const id = +a.dataset.coId; if (!id) return;
      if (window._openCompanySafe) window._openCompanySafe(id);
      else if (window.App && App.switchView) App.switchView('companies');
    }));
    main.querySelectorAll('._ars-unsvc').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      takeOutOfService(+b.dataset.coId, b);
    }));
    main.querySelectorAll('._ars-open-map').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const id = +b.dataset.coId;
      openOnMap(id);
    }));
    main.querySelectorAll('._ars-open-fyrirt').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const id = +b.dataset.coId;
      if (window._openCompanySafe) window._openCompanySafe(id);
      else if (window.App && App.switchView) App.switchView('companies');
    }));

    // ✈ Ferðanótan (2026-08-14, ósk Agnars): dauft innsláttarsvæði undir
    // fyrirtækjanafninu á listanum — tímabundnar nótur við ferðaskipulag.
    // Vistast debounced í fyrirtaeki.plan_note; skjá-cache uppfærður svo
    // endurteiknun sópi ekki gildinu burt. Smellur opnar EKKI fyrirtækið.
    main.querySelectorAll('._ars-plannote').forEach(inp => {
      inp.addEventListener('click', e => e.stopPropagation());
      inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); });
      // Vistun ferðanótu — EITT fall svo bæði debounce OG blur noti sömu leið.
      // Blur vistar STRAX (fara úr reit) svo textinn tapist ekki þótt endurteikning
      // hafi ekki enn gripið hann; villa er sýnileg (rauð útlína + logProblem), ekki þögul.
      inp.dataset.saved = (inp.value.trim() || '');
      const savePlanNote = async () => {
        const id = +inp.dataset.coId;
        const val = inp.value.trim() || null;
        if (inp.dataset.saved === (val == null ? '' : val)) return;   // óbreytt → sleppa
        const SB = getSB(); if (!SB || !id) return;
        try {
          const r = await SB.from('fyrirtaeki').update({ plan_note: val }).eq('id', id);
          if (r.error) throw r.error;
          inp.dataset.saved = (val == null ? '' : val);
          const c1 = _cache.byId && _cache.byId[id]; if (c1) c1.plan_note = val;
          const c2 = _cache.list.find(x => x.id === id); if (c2) c2.plan_note = val;
        } catch (err) {
          console.warn('[arsskodun] plan_note', err);
          try { if (window.logProblem) window.logProblem('plan_note_save_failed', 'co ' + id); } catch (_) {}
          inp.style.outline = '2px solid #dc2626'; inp.title = 'Ferðanóta vistaðist EKKI — reyndu aftur';
        }
      };
      inp.addEventListener('input', () => { inp.style.outline = ''; clearTimeout(inp._t); inp._t = setTimeout(savePlanNote, 500); });
      inp.addEventListener('blur', () => { clearTimeout(inp._t); savePlanNote(); });
    });

    // "Tekið út" toggle (2026-05-25): operator can mark physical inspection done
    // without finishing the paperwork. Persists to arsskodun_customers[co].field_inspected_year.
    main.querySelectorAll('._ars-tu-toggle').forEach(btn => btn.addEventListener('click', async e => {
      e.stopPropagation();
      const coId = +btn.dataset.coId;
      if (!coId) return;
      if (!window.AppSettings || !window.AppSettings.save) { alert('Engar stillingar tiltækar'); return; }
      const curYear = new Date().getFullYear();
      const allMap = (window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || {};
      const entry = allMap[String(coId)] || {};
      const isCurrentlyMarked = +entry.field_inspected_year === curYear;
      const newVal = isCurrentlyMarked ? 0 : curYear;   // 0 = ekki í vinnslu (deep-merge heldur 0, ólíkt delete)
      btn.disabled = true;
      // RACE-LAGFÆRING (2026-07-15): áður var ÖLL arsskodun_customers taflan skrifuð
      // úr gömlum lestri (`allMap`) → hak á einni röð gat yfirskrifað nýlega breytingu
      // á annarri röð. Nú er AÐEINS þessi færsla skrifuð (AppSettings.save djúp-merge-ar),
      // svo raðir stangast ekki á.
      const ok = await window.AppSettings.save({ [STORAGE_KEY]: { [String(coId)]: { field_inspected_year: newVal } } });
      if (!ok) { alert('Vista mistókst'); btn.disabled = false; return; }
      // Update local cache so re-render picks up the change without a full reload
      const c = _cache.list.find(x => x.id === coId);
      if (c) c._ars = Object.assign({}, c._ars || {}, { field_inspected_year: newVal });
      // JUMP-LAGFÆRING: render() endur-teiknar allan listann → skrun stökk á topp.
      // Varðveita skrunstöðu skrun-hýsilsins (og glugga) yfir endur-teiknun.
      const host = (function (el) { let n = el; while (n && n !== document.body) { const s = getComputedStyle(n); if (/(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight) return n; n = n.parentElement; } return document.scrollingElement || document.documentElement; })(main);
      const sy = host ? host.scrollTop : 0, wy = window.scrollY;
      render();
      const _restore = () => { try { if (host) host.scrollTop = sy; window.scrollTo(0, wy); } catch (_) {} };
      requestAnimationFrame(_restore);
      // Patch 187/267 endur-sprauta ár-dálkum/akstur-chip ASYNC eftir render (breytir
      // hæð) → endurstilla aftur þegar það hefur sest svo skrun reki ekki til.
      setTimeout(_restore, 340);
    }));

    if (keepSearchFocus) {
      const fresh = main.querySelector('#_ars-search');
      if (fresh) {
        fresh.focus();
        try {
          fresh.setSelectionRange(selStart ?? fresh.value.length, selEnd ?? fresh.value.length);
        } catch (_) { /* type=search may not allow setSelectionRange in some browsers */ }
      }
    }
  }

  // ── Print the currently-filtered list ─────────────────────────────────────
  // Prints exactly what filteredSorted() returns (same search + status + month
  // filters and sort the user sees), as a clean A4-landscape worklist.
  // Prenta EINN aksturslista (1/2/3) í póstnúmeraröð svo hver bílstjóri fái sitt blað.
  // n=0 → allir listar saman. Endurnýtir printList()/filteredSorted(): setur stöðuna
  // tímabundið (akstur-sía + póstnúmera-röðun, heill listi óháð völdum mánuði/leit/
  // póstnúmera-síu), prentar, og SKILAR stöðunni óbreyttri — skjárinn hreyfist ekki og
  // ekkert er vistað (OUT-hlið; brýtur ekki ALLTAF-LEYFA-VISTUN).
  function printAksturList(n) {
    n = +n || 0;
    const snap = {
      status: state.status, sortCol: state.sortCol, sortDir: state.sortDir, sort: state.sort,
      months: state.months, search: state.search, postnr: state.postnr, _akOnly: state._akOnly
    };
    try {
      state.status  = 'akstur';
      state._akOnly = (n >= 1 && n <= 3) ? n : 0;
      state.sortCol = 'postnumer'; state.sortDir = 'asc'; state.sort = 'postnumer';
      state.months  = [];            // heill aksturslisti — ekki bundinn við valinn mánuð
      state.search  = '';
      state.postnr  = null;          // engin póstnúmera-sía — öll númer í röð
      printList({ compact: true });  // þjappaða aksturslista-sniðið; filteredSorted() les stöðuna synchronous
    } finally {
      Object.assign(state, snap);    // skila nákvæmlega fyrri stöðu (skjár + localStorage óbreytt)
    }
  }

  // opts.compact = þjappaða aksturslista-sniðið (skoðanaár í einn reit, ✈ Ferðanóta-
  // dálkur, Tæki í skjá-sniðinu). Reglulega „Prenta lista" (smellur → Event, ekki
  // {compact:true}) heldur fulla blaðinu óbreyttu.
  function printList(opts) {
    const compact = !!(opts && opts.compact === true);
    const arr = filteredSorted();
    if (!arr.length) { alert('Engin fyrirtæki í listanum til að prenta.'); return; }
    const curYear = new Date().getFullYear();
    const curMonth = new Date().getMonth() + 1;
    const filterLabel = (state.months && state.months.length)
      ? monthFilterLabel(curYear)
      : (state.status === 'done'        ? `Búið ${curYear}`
       : state.status === 'pending'     ? 'Á eftir + sleppt'
       : state.status === 'pending2026' ? `Eftir ${curYear}`
       : state.status === 'suspect'     ? 'Óvíst — líklega óvart í þjónustu'
       : state.status === 'ivinnslu'    ? 'Í vinnslu'
       : state.status === 'akstur'      ? ('Aksturslisti' + ((+state._akOnly >= 1 && +state._akOnly <= 3) ? (' ' + state._akOnly + ' · póstnúmeraröð') : ''))
       : state.status === 'never'       ? 'Aldrei skoðað'
       : state.status === 'skipped2025' ? 'Slepptir í fyrra'
       : state.status === 'priority'    ? 'Forgangur'
       : `Allir mánuðir ${curYear}`);
    const pnrNote = (!state.search.trim() && state.postnr !== null) ? ` · ${esc(postnrFilterLabel())}` : '';
    const searchNote = (state.search.trim() ? ` · leit: “${esc(state.search.trim())}”` : '') + pnrNote;

    let totalEst = 0;
    const rows = arr.map((c, i) => {
      const ars = c._ars || {};
      const m = +ars.inspect_month || 0;
      const lastYr = +ars.last_year_inspected || 0;
      const fieldYr = +ars.field_inspected_year || 0;
      const totalEq = Object.values(ars.equipment || {}).reduce((s, v) => s + (+v || 0), 0);
      const est = +ars.estimated_yearly || 0;
      totalEst += est;
      // Mirror the on-screen "${curYear}" status dot exactly (same flags,
      // colours and meaning) so the printed list matches what's on screen.
      const isDone = isDoneYear(c, curYear);
      const isFieldOnly = !isDone && fieldYr === curYear;
      const isSkipped = !isDone && !isFieldOnly && isSkippedLastYear(c, curYear);
      const isOverdue = !isDone && !isFieldOnly && !isSkipped && (m > 0 && m <= curMonth);
      // „Á dagskrá" = himinblátt (sky) eins og pillan á skjánum (var grátt) svo
      // prentaði listinn passi við aðallistann.
      const dot = isDone ? '#22c55e' : (isFieldOnly ? '#3b82f6' : (isSkipped ? '#f59e0b' : (isOverdue ? '#ef4444' : '#38bdf8')));
      const statusLabel = isDone ? ('Skoðað ' + curYear)
        : (isFieldOnly ? 'Í skýrslugerð'
        : (isSkipped ? ('Sleppt · síðast ' + lastYr)
        : (isOverdue ? 'Útrunnið' : 'Á dagskrá')));
      const phone = [c.simi, c.farsimi].filter(Boolean).join(' / ');
      // '23–'26 úttektarskýrslu-staða — SAMA uppspretta og aðallistinn (patch 187),
      // svo prentaði listinn passar við það sem er á skjánum.
      const yi = (window.InserviceRowReports && window.InserviceRowReports.yearInfo) ? window.InserviceRowReports.yearInfo(c) : {};
      const yearBadges = ['2023', '2024', '2025', '2026'].map(y => {
        const info = yi[y] || {};
        const done = !!info.has, due = !done && !!info.due;
        const bg = done ? '#DBEEE3' : (due ? '#FBEAC6' : '#F0EFEA');
        const bd = done ? 'rgba(28,143,96,.35)' : (due ? 'rgba(217,146,6,.5)' : '#E2DFD6');
        const col = done ? '#0F5E3F' : (due ? '#8A5C04' : '#B9B6AC');
        const dc  = done ? '#1C8F60' : (due ? '#D99206' : 'transparent');
        const reik = info.reik ? '<span class="reik" title="Reikningur tengdur">🧾</span>' : '';
        return `<span class="yrtag" style="background:${bg};border-color:${bd};color:${col}"><span class="yrdot" style="background:${dc}"></span>${y.slice(-2)}</span>${reik}`;
      });
      const yearCells = yearBadges.map(h => `<td class="yr">${h}</td>`).join('');   // fullt: 4 reitir (aðeins skrifstofu-prentun)
      // Aksturslisti (bílstjóra-númer) — sama gildi og chip-inn á skjánum
      const akv = (window.ArsAkstur && ArsAkstur.of) ? (+ArsAkstur.of(c.id) || 0) : (+ars.akstur || 0);
      const aksturCell = `<td class="c">${akv ? `<span class="akstur">🚗${akv}</span>` : ''}</td>`;
      // Forgangur — AÐEINS litur (ósk Agnars), engin textamerking
      const pri = +ars.priority || 0;
      const PCOL = (window.Priority && window.Priority.COLORS) || ['#cbd5e1', '#16a34a', '#eab308', '#dc2626'];
      const priCell = `<td class="c">${pri > 0 ? `<span class="pdot" style="background:${PCOL[pri] || PCOL[0]}"></span>` : ''}</td>`;
      const nameCell = `<td><strong>${esc(c.nafn || '')}</strong>${c.kennitala ? `<div class="kt">kt. ${esc(fmtKt(c.kennitala))}</div>` : ''}</td>`;
      const stCell = `<td class="st"><span class="dot" style="background:${dot}"></span>${esc(statusLabel)}</td>`;
      return compact ? `<tr>
        <td class="num">${i + 1}</td>
        ${nameCell}
        <td>${esc(c.heimilisfang || '')}</td>
        <td class="nowrap">${esc(phone)}</td>
        <td class="c taeki">${eqTrioHtml(ars.equipment, 'screen') || ''}</td>
        <td class="nota">${c.plan_note ? '✈ ' + esc(c.plan_note) : ''}</td>
        <td class="c">${esc(MONTHS_IS_SHORT[m - 1] || '—')}</td>
        <td class="chk"><span class="box"></span></td>
      </tr>` : `<tr>
        <td class="num">${i + 1}</td>
        ${nameCell}
        ${yearCells}
        <td>${esc(c.heimilisfang || '')}</td>
        <td class="nowrap">${esc(phone)}</td>
        <td class="c">${esc(MONTHS_IS_SHORT[m - 1] || '—')}</td>
        <td class="c nowrap">${eqTrioHtml(ars.equipment, 'print') || ''}</td>
        <td class="r">${est ? fmtKr(est) : ''}</td>
        ${aksturCell}
        ${priCell}
        ${stCell}
      </tr>`;
    }).join('');

    const win = window.open('', '_blank');
    if (!win) { alert('Leyfðu sprettiglugga til að prenta.'); return; }
    const logo = (window.SlokkLogo && SlokkLogo.imgHtml) ? SlokkLogo.imgHtml({ heightPx: 46, alt: 'Slökkvitæki ehf' }) : '';
    const dateStr = new Date().toLocaleDateString('is-IS');
    win.document.write(`<!doctype html><html lang="is"><head><meta charset="utf-8"><title>Fyrirtæki í Þjónustu — ${esc(filterLabel)}</title>
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body.portrait table { font-size: 10px; }
  body.portrait th, body.portrait td { padding: 4px 5px; }
  body { font-family: 'IBM Plex Sans', system-ui, Arial, sans-serif; color:#0f172a; margin:0; padding:18px; }
  .hd { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0f172a; padding-bottom:10px; margin-bottom:12px; }
  .hd h1 { margin:0; font-size:18px; }
  .hd .sub { font-size:12px; color:#475569; margin-top:3px; }
  .hd .meta { text-align:right; font-size:11px; color:#64748b; }
  table { width:100%; border-collapse:collapse; font-size:11px; }
  th, td { padding:5px 7px; border-bottom:1px solid #e2e8f0; text-align:left; vertical-align:top; }
  th { background:#f1f5f9; font-size:9.5px; text-transform:uppercase; letter-spacing:.04em; color:#475569; border-bottom:1.5px solid #cbd5e1; }
  td.num, td.c { text-align:center; color:#64748b; }
  td.r { text-align:right; font-variant-numeric:tabular-nums; }
  td.nowrap { white-space:nowrap; }
  .kt { font-size:9.5px; color:#94a3b8; font-family:monospace; }
  td.st { white-space:nowrap; }
  .dot { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:5px; vertical-align:middle; box-shadow:0 0 0 1px rgba(0,0,0,.12); }
  td.yr, th.c { text-align:center; }
  td.yr { padding:4px 3px; white-space:nowrap; }
  .yrtag { display:inline-flex; align-items:center; gap:4px; height:15px; padding:0 6px 0 5px; border-radius:2px 8px 8px 2px; font-family:monospace; font-size:9px; font-weight:700; border:1px solid transparent; box-sizing:border-box; }
  .yrdot { width:4px; height:4px; border-radius:50%; flex:0 0 auto; }
  .reik { margin-left:2px; font-size:9px; }
  .akstur { display:inline-block; background:#38bdf8; color:#fff; border:1px solid #0ea5e9; border-radius:99px; padding:1px 7px; font-size:9.5px; font-weight:800; }
  .pdot { display:inline-block; width:11px; height:11px; border-radius:50%; box-shadow:0 0 0 1px rgba(0,0,0,.12); }
  tbody tr:nth-child(even) td { background:#fafbfc; }
  tfoot td { font-weight:700; border-top:2px solid #0f172a; background:#fff; }
  .toolbar { margin-bottom:12px; }
  .toolbar button { padding:8px 16px; font-size:13px; border:none; border-radius:7px; cursor:pointer; font-weight:600; margin-right:6px; }
  .toolbar .p { background:#dc2626; color:#fff; }
  .toolbar .x { background:#f1f5f9; color:#334155; }
  .toolbar .o { background:#e2e8f0; color:#334155; }
  .toolbar .o.act { background:#0f172a; color:#fff; }
  .toolbar .lbl { font-size:12px; color:#64748b; margin:0 4px 0 8px; align-self:center; }
  @media print { .toolbar { display:none; } body { padding:0; } }
  ${compact ? `
  :root { --ink1:#0f172a; --ink3:#94a3b8; }
  table { font-size:12px; }
  th, td { padding:6px 8px; }
  tbody tr { page-break-inside: avoid; }
  td.taeki { text-align:center; font-weight:700; letter-spacing:.02em; }
  td.nota { font-size:10.5px; color:#334155; max-width:240px; line-height:1.2; white-space:normal; }
  th.chk, td.chk { text-align:center; width:70px; }
  td.chk .box { display:inline-block; width:16px; height:16px; border:1.5px solid #64748b; border-radius:4px; vertical-align:middle; }
  ` : ''}
</style>
<style id="pgstyle">@page { size: A4 landscape; margin: 12mm; }</style></head><body class="landscape">
  <div class="toolbar">
    <button class="p" onclick="window.print()">🖨 Prenta</button>
    <span class="lbl">Snið:</span>
    <button class="o" id="btn-ls" onclick="setOrient('landscape')">Langsnið</button>
    <button class="o" id="btn-pt" onclick="setOrient('portrait')">Skammsnið</button>
    <button class="x" onclick="window.close()">Loka</button>
  </div>
  <div class="hd">
    <div>
      <h1>${compact ? '🚗 Aksturslisti' : 'Fyrirtæki í Þjónustu'}</h1>
      <div class="sub">${compact
        ? `<strong>${esc(filterLabel)}</strong> · ${arr.length} stopp &nbsp;·&nbsp; Bílstjóri: ______________`
        : `Sía: <strong>${esc(filterLabel)}</strong>${searchNote} · ${arr.length} fyrirtæki`}</div>
    </div>
    <div class="meta">${logo}<div style="margin-top:4px">Slökkvitæki ehf · ${dateStr}</div></div>
  </div>
  <table>
    <thead><tr>${compact ? `
      <th class="num">#</th><th>Fyrirtæki</th>
      <th>Heimilisfang</th><th>Sími</th>
      <th class="c">Tæki (SLT·BSL·RS)</th>
      <th title="Ferðanóta">✈ Nóta</th>
      <th class="c">Mán.</th>
      <th class="c chk">✓ Búið</th>` : `
      <th class="num">#</th><th>Fyrirtæki</th>
      <th class="c yr">'23</th><th class="c yr">'24</th><th class="c yr">'25</th><th class="c yr">'26</th>
      <th>Heimilisfang</th><th>Sími</th>
      <th class="c">Skoðun</th><th class="c">Tæki (SLT·BSL·RS)</th><th class="r">Áætl.</th>
      <th class="c" title="Aksturslisti">🚗</th><th class="c" title="Forgangur">❗</th>
      <th>Staða ${curYear}</th>`}
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>${compact
      ? `<td></td><td>Samtals ${arr.length} stopp</td><td colspan="6"></td>`
      : `<td></td><td>Samtals ${arr.length} fyrirtæki</td><td colspan="8"></td><td class="r">${fmtKr(totalEst)}</td><td colspan="3"></td>`}</tr></tfoot>
  </table>
  <script>
    function setOrient(o){
      document.getElementById('pgstyle').textContent='@page{ size:A4 '+o+'; margin:12mm }';
      document.body.className=o;
      document.getElementById('btn-ls').classList.toggle('act', o==='landscape');
      document.getElementById('btn-pt').classList.toggle('act', o==='portrait');
    }
    setOrient('landscape');
  <\/script>
</body></html>`);
    win.document.close();
  }

  function attCount(coId) {
    const attsAll = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('company_attachments')) || {};
    return (attsAll[String(coId)] || []).length;
  }

  // ── ❓ Óvíst — triage-listi (2026-07-17, ósk Agnars) ────────────────────────
  // Hvert fyrirtæki fær SÖNNUNAR-MERKI (skýrslu-ár úr Drive-hryggnum · 🆕 nýtt
  // á árinu · 🧯 bara tæki · ⬜ engin gögn) + „⬇ Úr þjónustu" takka sem færir
  // það niður í Allir viðskiptavinir (er_i_thjonustu=false + subscribed=false —
  // afturkræft á fyrirtækjasíðunni). Hjálpar við að fact-checka listann hægt
  // og örugglega, eitt í einu.
  function suspectVerdict(c) {
    const yrs = (c._ars && c._ars._docYears) || [];
    const maxYr = yrs.length ? Math.max(...yrs) : 0;
    const units = ((c._ars && c._ars._units) || []).length;
    const isNew = c.created_at && String(c.created_at) >= '2026-01-01';
    if (maxYr >= 2025) return { key: 'skyrsla', badge: `📄 Skýrsla ${maxYr} til`, color: '#166534', bg: '#dcfce7', hint: 'Alvöru þjónustukúnni — skýrsla ' + yrs.join(', ') + ' í skjalakerfinu. Vantar bara mánuð/merkingu.' };
    if (maxYr > 0) return { key: 'gomul', badge: `📁 Gömul saga (síðast ${maxYr})`, color: '#92400e', bg: '#fef3c7', hint: 'Skýrslur ' + yrs.join(', ') + ' — ekkert síðan. Dottinn úr þjónustu eða gleymdur?' };
    // 2026-07-29: brunakerfis-skýrsla sannar að kúnninn sé raunverulegur, en
    // hún er ÖNNUR þjónusta — merkið segir það hreint út í stað þess að láta
    // líta út fyrir að slökkvitækin hafi verið skoðuð.
    const bYrs = (c._ars && c._ars._bruYears) || [];
    if (bYrs.length) {
      const bMax = Math.max(...bYrs);
      return { key: 'brunakerfi', badge: `🚨 Brunakerfi ${bMax} — engin slökkvitækjaskýrsla`, color: '#9a3412', bg: '#ffedd5',
        hint: 'Í brunakerfisþjónustu (skýrslur ' + bYrs.join(', ') + ') en ENGIN úttektarskýrsla fyrir slökkvitæki. Önnur þjónusta — ekki sönnun um slökkvitækjaskoðun.' };
    }
    // 2026-07-23 (ósk Agnars): handvirk „Nýtt"-merking þegar engin skýrsla er til —
    // fjólublátt, opnar mánaðarval á fyrirtækjasíðunni (arsskodun_customers.nytt_manual).
    if (c._ars && c._ars.nytt_manual) return { key: 'nytt', badge: '🆕 Nýtt — bíður skoðunar', color: '#7c3aed', bg: '#ede9fe', hint: 'Merkt handvirkt sem nýr þjónustukúnni — bíður fyrstu skoðunar.' };
    if (isNew) return { key: 'nytt', badge: '🆕 Nýtt — bíður fyrstu skoðunar', color: '#1d4ed8', bg: '#dbeafe', hint: 'Stofnað ' + String(c.created_at).slice(0, 10) + ' — engin skýrsla enn, eðlilegt fyrir nýjan kúnna.' };
    if (units > 0) return { key: 'taeki', badge: `🧯 Bara tæki (${units})`, color: '#7c3aed', bg: '#ede9fe', hint: 'Engin skýrsla nokkru sinni — bara sjálfvirk tæki á nafninu. Óvíst hvort þau eru raunveruleg.' };
    return { key: 'ekkert', badge: '⬜ Engin gögn', color: '#64748b', bg: '#f1f5f9', hint: 'Engin skýrsla, engin tæki, engin saga — líklega óvart í þjónustu.' };
  }
  function renderSuspectList(arr) {
    const groups = {};
    arr.forEach(c => { const v = suspectVerdict(c); (groups[v.key] = groups[v.key] || { v, list: [] }).list.push(c); });
    const ORDER = ['ekkert', 'taeki', 'gomul', 'nytt', 'skyrsla'];
    return `
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:11px 14px;margin-bottom:12px;font-size:12.5px;color:#92400e">
        Þessi fyrirtæki hafa <b>enga skráða skoðunarsögu</b>. Merkin sýna hvaða sönnunargögn fundust.
        „⬇ Úr þjónustu" færir fyrirtæki niður í Allir viðskiptavinir (afturkræft — kveikt aftur á fyrirtækjasíðunni).
      </div>
      ${ORDER.filter(k => groups[k]).map(k => {
        const g = groups[k];
        return `
        <div style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:7px">
            <span style="background:${g.v.bg};color:${g.v.color};font-size:12px;font-weight:800;padding:4px 11px;border-radius:99px">${g.v.badge.replace(/ \d{4}.*$/, '')} · ${g.list.length}</span>
            <span style="font-size:11.5px;color:var(--ink3)">${esc(g.v.hint)}</span>
          </div>
          <div style="background:var(--surface);border:1px solid var(--brd);border-radius:10px;overflow:hidden">
            ${g.list.map(c => {
              const v = suspectVerdict(c);
              return `
              <div style="display:flex;align-items:center;gap:10px;padding:9px 13px;border-bottom:1px solid var(--brd);flex-wrap:wrap">
                <a href="#" class="_ars-open" data-co-id="${c.id}" style="font-size:13.5px;font-weight:700;color:var(--ink1);text-decoration:none;border-bottom:1px dotted var(--brd2)">${esc(c.nafn)}</a>
                <span style="font-size:11px;color:var(--ink3);font-family:ui-monospace,monospace">${esc(c.kennitala || 'kt vantar')}</span>
                <span style="background:${v.bg};color:${v.color};font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:99px">${v.badge}</span>
                <span style="flex:1"></span>
                <button class="_ars-unsvc" data-co-id="${c.id}" type="button" style="font-size:11.5px;font-weight:700;padding:6px 11px;border-radius:8px;border:1px solid #fca5a5;background:#fff;color:#b91c1c;cursor:pointer">⬇ Úr þjónustu</button>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}`;
  }
  async function takeOutOfService(coId, btn) {
    const c = (_cache.byId || {})[coId] || (_cache.list || []).find(x => String(x.id) === String(coId));
    const name = c ? c.nafn : ('#' + coId);
    if (!confirm('Taka „' + name + '" úr þjónustu?\n\nFyrirtækið helst í Allir viðskiptavinir og má kveikja aftur á fyrirtækjasíðunni.')) return;
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    try {
      const SB = window.DB && DB.sb;
      await SB.from('fyrirtaeki').update({ er_i_thjonustu: false }).eq('id', coId);
      if (window.AppSettings && AppSettings.save) {
        await AppSettings.save({ [STORAGE_KEY]: { [String(coId)]: { subscribed: false, removed_from_service_at: new Date().toISOString().slice(0, 10) } } });
      }
      try {   // audit-slóð: sama override_log og ⚡-hamurinn notar
        await SB.from('override_log').insert({ co_id: +coId, co_nafn: name, field: 'er_i_thjonustu', old_value: 'true', new_value: 'false', page: 'arsskodun-ovist' });
      } catch (_) {}
      _cache.list = (_cache.list || []).filter(x => String(x.id) !== String(coId));
      render();
      if (window.Toast && Toast.show) Toast.show('⬇ ' + name + ' tekið úr þjónustu');
    } catch (e) {
      alert('Villa: ' + (e && e.message || e));
      if (btn) { btn.disabled = false; btn.textContent = '⬇ Úr þjónustu'; }
    }
  }

  // ── 📱 Sími/app-ham — ÞÉTT raðir: EIN lína á fyrirtæki (samþykkt mockup v2) ──
  // Röð: [nafn · 4-ára reitir · mánuður · akstur · staða]. Hvítt spjald sem
  // poppar á steel-gráa app-bakgrunninum (patch 261). Endurnýtir NÁKVÆMLEGA sömu
  // gögn og skjáborðstaflan — engin ný gagnaleiðsla:
  //   • 4-ára reitir: grænt = úttektarskýrsla skráð það ár (_ars._docYears, reiknað
  //     úr customer_documents ~216-330); gult = skoðað en skýrslu vantar
  //     (last_year_inspected / arsskodun_report_facts._report_year); grátt = ekkert.
  //   • staða: sama stState (isDoneYear/field/skip/over/queue) og renderTable.
  //   • akstur: window.ArsAkstur (arsskodun_customers[id].akstur) — sama einingar-
  //     skrif og patch 267/Bílstjóri lesa.
  // Röð-smellur opnar fyrirtækið gegnum ._ars-row-handlerinn (~1786). Skjáborðið er
  // ósnert — þetta er sér render-grein sem kviknar aðeins í mobile/app-ham.
  const _mrowAkTimers = Object.create(null);   // debounce vistunar við hraðar 0→1→2→3 smellingar
  function arsAksturOf(c) {
    const v = +((c && c._ars && c._ars.akstur)) || 0;
    return (v >= 1 && v <= 3) ? v : 0;
  }
  function _ensureArsMrowCss() {
    if (document.getElementById('_ars-mrow-css')) return;
    const s = document.createElement('style');
    s.id = '_ars-mrow-css';
    const V = '#view-arsskodun ';
    const A = 'body.appmode #view-arsskodun ';   // app-ham yfirlög (beat patch 261 .view button)
    s.textContent = [
      // hvítt spjald sem poppar á steel-gráa app-bakgrunninum
      V+'._arsm-tbl{background:#fff;border:1px solid #e6e9ee;border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(20,30,25,.05),0 14px 30px -24px rgba(20,30,25,.45);margin-top:4px}',
      // ein lína = grind: nafn | 4-ára | mánuður | akstur | staða
      V+'._arsm-row{display:grid;grid-template-columns:minmax(0,1fr) 66px 34px 34px 26px;gap:7px;align-items:center;padding:9px 11px;border-bottom:1px solid #eef1f5;cursor:pointer;background:#fff}',
      V+'._arsm-row:last-child{border-bottom:none}',
      V+'._arsm-row:active{background:#f3f5f8}',
      // haus-röð — árin sýnd einu sinni efst
      V+'._arsm-head{background:#eef1f5;cursor:default}',
      V+'._arsm-head:active{background:#eef1f5}',
      V+'._arsm-h{font-size:8.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#8a94a3}',
      V+'._arsm-c{text-align:center}',
      V+'._arsm-yrhead{display:flex;gap:2px}',
      V+'._arsm-yrhead span{flex:1;text-align:center;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:8.5px;color:#8a94a3}',
      // nafn + undirlína (póstnr · tækjafjöldi · ✉ vantar)
      V+'._arsm-name{min-width:0}',
      V+'._arsm-nm{font-size:13.5px;font-weight:600;color:#141a22;white-space:normal;overflow:visible;overflow-wrap:anywhere;letter-spacing:-.01em;line-height:1.2}',
      V+'._arsm-sub{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:9.5px;color:#8a94a3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px}',
      // 4-ára reitir
      V+'._arsm-yr{display:flex;gap:2px}',
      V+'._arsm-yr i{flex:1;height:17px;border-radius:3px;background:#e3e6ea;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-style:normal;font-weight:700;line-height:1}',
      V+'._arsm-yr i.rep{background:#1f9d57}',
      V+'._arsm-yr i.gap{background:#e0a83a}',
      // mánuður (rautt ef núverandi mánuður · grátt „—" ef enginn)
      V+'._arsm-mo{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;font-weight:700;color:#141a22;text-align:center;line-height:1.1;white-space:nowrap}',
      V+'._arsm-mo.none{color:#8a94a3;font-weight:400}',
      V+'._arsm-mo.due{color:#c0392b}',
      // akstur-toggle (0=grár „—" · 1=blár · 2=grænn · 3=fjólublár) — sbr. mockup v2
      V+'._arsm-ak{width:30px;height:26px;margin:0 auto;border-radius:8px;border:1.5px solid #e6e9ee;background:#f4f6f9;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;font-weight:700;color:#8a94a3;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;line-height:1}',
      V+'._arsm-ak.d1{background:#e8f0fe;border-color:#2563eb;color:#2563eb}',
      V+'._arsm-ak.d2{background:#e7f7ee;border-color:#1f9d57;color:#1f9d57}',
      V+'._arsm-ak.d3{background:#f1ecfe;border-color:#8b5cf6;color:#8b5cf6}',
      // staða-punktur
      V+'._arsm-st{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;margin:0 auto;line-height:1}',
      V+'._arsm-st.done{background:#e7f7ee;color:#1f9d57}',
      V+'._arsm-st.eftir{background:#fdf3e0;color:#c98a1a}',
      V+'._arsm-st.til{background:#e8f0fe;color:#2563eb}',
      V+'._arsm-st.vantar{background:#fdeceb;color:#c0392b}',
      // ── app-ham yfirlög: patch 261 þvingar .view button{min-height:50px;
      //    font-size:17px;padding:12px} + .view{font-size:17px}. #view-arsskodun-
      //    sértækni + !important heldur röðunum þéttum (sama vopn og 261 notar
      //    sjálft á töfluna, sjá 261:518-522). ──
      A+'._arsm-ak{min-height:0!important;height:26px!important;font-size:12px!important;padding:0!important;line-height:1!important}',
      A+'._arsm-nm{font-size:13.5px!important}',
      A+'._arsm-sub{font-size:9.5px!important}',
      A+'._arsm-mo{font-size:11px!important}',
      A+'._arsm-h,'+A+'._arsm-yrhead span{font-size:8.5px!important}',
      A+'._arsm-yr i{font-size:8px!important}',
      A+'._arsm-st{font-size:11px!important}'
    ].join('\n');
    document.head.appendChild(s);
  }
  function renderMobileRows(arr) {
    _ensureArsMrowCss();
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    const ovr = overrideOn();
    const years = [curYear - 3, curYear - 2, curYear - 1, curYear];
    // done→grænt✓ · work(í skýrslugerð)→blátt📄 · over→rautt⚠ · skip/queue→amber⏳
    const rows = arr.map(c => {
      const ars = c._ars || {};
      const m = +ars.inspect_month || 0;
      const lastYr = +ars.last_year_inspected || 0;
      const fieldYr = +ars.field_inspected_year || 0;
      const totalEq = eqGroups(ars.equipment || {}).total;
      // 4-ára reitir — grænt (skýrsla) / gult (skoðað, skýrslu vantar) / grátt
      const repSet = new Set((ars._docYears || []).map(Number));
      const factYr = +ars._report_year || 0;
      const yrHtml = years.map(y => {
        if (repSet.has(y)) return `<i class="rep" title="Úttektarskýrsla ${y} á skrá">✓</i>`;
        if (y === lastYr || y === factYr) return `<i class="gap" title="Skoðað ${y} — skýrslu vantar">!</i>`;
        return `<i title="Engin skoðun skráð ${y}"></i>`;
      }).join('');
      // Staða — sama stState-rök og renderTable (~2618-2624)
      const isDone = isDoneYear(c, curYear);
      const isFieldOnly = !isDone && fieldYr === curYear;
      const isSkipped = !isDone && !isFieldOnly && isSkippedLastYear(c, curYear);
      const isOverdue = !isDone && !isFieldOnly && !isSkipped && (m > 0 && m <= curMonth);
      const stState = isDone ? 'done' : isFieldOnly ? 'work' : isSkipped ? 'skip' : isOverdue ? 'over' : 'queue';
      const stMap = {
        done:  ['done',   '✓', 'Skoðað ' + curYear],
        work:  ['til',    '📄', 'Í vinnslu — skýrsla/reikningur eftir'],
        over:  ['vantar', '⚠', 'Á eftir — skoðun ókláruð'],
        skip:  ['eftir',  '⏳', 'Sleppt í fyrra (síðast ' + (lastYr || '—') + ')'],
        queue: ['eftir',  '⏳', 'Á dagskrá']
      };
      const st = stMap[stState] || stMap.queue;
      // Mánuður
      const moLabel = (m >= 1 && m <= 12) ? MONTHS_IS_SHORT[m - 1] : '—';
      const moCls = (m >= 1 && m <= 12) ? (m === curMonth ? 'due' : '') : 'none';
      // í Lagfæringar-ham (overrideOn) heldur mánaðar-reiturinn _ars-ovr-month
      // handlernum (1626) — annars hreinn texti (smellur á röð opnar fyrirtæki).
      const moCell = ovr
        ? `<div class="_ars-ovr-month _arsm-mo ${moCls}" data-co-id="${c.id}" title="⚡ Smelltu til að breyta skoðunarmánuði">${esc(moLabel)}</div>`
        : `<div class="_arsm-mo ${moCls}">${esc(moLabel)}</div>`;
      // Akstur (0→1→2→3→0)
      const ak = arsAksturOf(c);
      // Undirlína: póstnr · N tæki · ✉ vantar
      const pnr = pnrOf(c);
      const email = (c.netfang || '').trim();
      const subBits = [];
      if (pnr) subBits.push(esc(pnr));
      subBits.push(totalEq + ' tæki');
      if (!email) subBits.push('✉ vantar');
      return `
        <div class="_ars-row _arsm-row" data-co-id="${c.id}" tabindex="0">
          <div class="_arsm-name">
            <div class="_arsm-nm">${esc(c.nafn || '—')}</div>
            <div class="_arsm-sub">${subBits.join(' · ')}</div>
          </div>
          <div class="_arsm-yr">${yrHtml}</div>
          ${moCell}
          <button type="button" class="_arsm-ak${ak ? ' d' + ak : ''}" data-akco="${c.id}" title="${ak ? 'Akstur ' + ak + ' — smelltu til að breyta' : 'Enginn aksturslisti — smelltu til að setja á lista'}">${ak || '—'}</button>
          <span class="_arsm-st ${st[0]}" title="${esc(st[2])}">${st[1]}</span>
        </div>`;
    }).join('');
    return `
      <div class="_arsm-tbl">
        <div class="_arsm-row _arsm-head">
          <div class="_arsm-h">Fyrirtæki</div>
          <div class="_arsm-yrhead">${years.map(y => `<span>'${String(y).slice(-2)}</span>`).join('')}</div>
          <div class="_arsm-h _arsm-c">Mán</div>
          <div class="_arsm-h _arsm-c">🚗</div>
          <div class="_arsm-h _arsm-c">St</div>
        </div>
        ${rows}
      </div>`;
  }

  function renderCards(arr) {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    const ovr = overrideOn();
    return `
      <div class="_ars-cardgrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:11px">
        ${arr.map(c => {
          const ars = c._ars || {};
          const eq = ars.equipment || {};
          const totalEq = Object.values(eq).reduce((s, v) => s + (+v || 0), 0);
          const m = +ars.inspect_month || 0;
          const monthLabel = m >= 1 && m <= 12 ? MONTHS_IS[m-1] : '—';
          const lastYr = +ars.last_year_inspected || 0;
          const fieldYr = +ars.field_inspected_year || 0;     // 2026-05-25: physical inspection done, paperwork pending
          const isDone = isDoneYear(c, curYear);
          const isFieldOnly = !isDone && fieldYr === curYear; // Tekið út — skjöl eftir
          // 2026-05-26: "skipped last year" — last inspection was 2024 (or older)
          // even though curYear-1 (2025) should have happened. Coworker reported
          // 2025 was a chaotic year and several locations never got visited.
          const isSkipped = !isDone && !isFieldOnly && isSkippedLastYear(c, curYear);
          const isOverdue = !isDone && !isFieldOnly && !isSkipped && (m > 0 && m <= curMonth);
          const aminning = cleanAminning(ars.aminning);
          const est = +ars.estimated_yearly || 0;

          const statusBadge = isDone
            ? '<span style="background:#dcfce7;color:#15803d;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;border:1px solid #bbf7d0">✅ ' + curYear + '</span>'
            : isFieldOnly
            ? '<span style="background:#dbeafe;color:var(--brand);font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;border:1px solid #93c5fd">🔵 Í skýrslugerð</span>'
            : isSkipped
            ? `<span title="Síðast skoðað ${lastYr} — sleppt í fyrra" style="background:#fef3c7;color:#a16207;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;border:1px solid #fde68a;display:inline-flex;align-items:center;gap:2px">⏰ '${String(lastYr).slice(-2)}</span>`
            : isOverdue
            ? '<span style="background:#fee2e2;color:#b91c1c;font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;border:1px solid #fecaca">⚠ Á eftir</span>'
            : '<span style="background:var(--brd);color:var(--ink2);font-size:9.5px;font-weight:700;padding:2px 7px;border-radius:99px;border:1px solid var(--brd2)">⏳ Í pípu</span>';
          // Toggle button: lets user mark "tekið út" without finishing paperwork.
          // Click cycles: nothing → Tekið út → cleared (back to nothing) ; once "skoðað"
          // (isDone) is set, the toggle is hidden because the work is fully done.
          const toggleBtn = !isDone
            ? `<button class="_ars-tu-toggle" data-co-id="${c.id}" type="button" title="${isFieldOnly ? 'Hreinsa — ekki í vinnslu' : 'Merkja sem Í vinnslu (skýrsla/reikningur eftir)'}" style="font-size:9.5px;padding:2px 7px;border-radius:99px;border:1px solid ${isFieldOnly ? '#60a5fa' : 'var(--brd2)'};background:${isFieldOnly ? '#dbeafe' : 'var(--surface)'};color:${isFieldOnly ? 'var(--brand)' : 'var(--ink2)'};cursor:pointer;font-weight:600;line-height:1.3">${isFieldOnly ? '✓ Í vinnslu' : '☐ Í vinnslu'}</button>`
            : '';

          return `
            <div class="_ars-card" data-co-id="${c.id}" style="background:var(--surface);border:1px solid var(--brd);border-radius:11px;padding:12px 14px;display:flex;flex-direction:column;gap:7px;box-shadow:0 1px 2px rgba(0,0,0,0.03);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='var(--hairline)';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'" onmouseout="this.style.borderColor='var(--brd)';this.style.boxShadow='0 1px 2px rgba(0,0,0,0.03)'">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <div style="min-width:0;flex:1">
                  <div class="_ars-cn" style="font-weight:700;color:var(--ink1);font-size:13.5px;line-height:1.25;display:flex;align-items:center;gap:6px;flex-wrap:wrap">${esc(c.nafn || '—')}${(window.RekstrarfelagBadge && c.kennitala) ? RekstrarfelagBadge.html(c.kennitala) : ''}</div>
                  ${c.kennitala ? `<div style="font-size:10.5px;color:var(--ink4);font-family:monospace;margin-top:1px">kt. ${esc(fmtKt(c.kennitala))}</div>` : ''}
                  ${c.heimilisfang ? `<div class="_ars-ca" style="font-size:11px;color:var(--ink3);margin-top:2px">📍 ${c.postnumer ? `<span class="_ars-pc" style="display:inline-block;min-width:34px;text-align:center;margin-right:4px;padding:0 5px;border-radius:5px;background:var(--surface2,#eef2ff);color:#3730a3;font-size:10px;font-weight:800;font-variant-numeric:tabular-nums">${esc(c.postnumer)}</span>` : ''}${esc(c.heimilisfang)}</div>` : ''}
                  ${(() => {
                    // 2026-05-26: surface netfang on the card so the operator can
                    // see at a glance which companies are missing it for the month.
                    const email = (c.netfang || '').trim();
                    if (email) {
                      return `<div style="font-size:11px;color:#0369a1;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(email)}">✉ <a href="mailto:${esc(email)}" style="color:#0369a1;text-decoration:none" onclick="event.stopPropagation()">${esc(email)}</a></div>`;
                    }
                    return `<div style="font-size:11px;color:#dc2626;margin-top:2px;font-weight:600">✉ Netfang vantar</div>`;
                  })()}
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;align-items:flex-end">
                  <div style="display:flex;gap:4px;align-items:center">${(window.Priority && window.Priority.btnHtml(c.id, 18)) || ''}${statusBadge}</div>
                  ${toggleBtn}
                  ${ovr ? `<span class="_ars-ovr-year" data-co-id="${c.id}" title="⚡ Síðast skoðað (ár) — smelltu til að breyta" style="display:inline-flex;align-items:center;min-height:26px;padding:3px 9px;border:1px dashed #d97706;background:#fffbeb;color:#92400e;border-radius:8px;font-size:10.5px;font-weight:700;cursor:pointer;white-space:nowrap">📅 ${lastYr || '—'}</span>` : ''}
                </div>
              </div>

              <div class="_ars-cgrid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;font-size:11px;margin-top:2px">
                <div ${ovr ? `class="_ars-ovr-month" data-co-id="${c.id}" title="⚡ Smelltu til að breyta skoðunarmánuði"` : ''} style="background:${ovr ? '#fffbeb' : 'var(--bg)'};border:1px ${ovr ? 'dashed #d97706' : 'solid var(--brd)'};border-radius:6px;padding:4px 7px${ovr ? ';cursor:pointer;min-height:40px;box-sizing:border-box' : ''}">
                  <div style="font-size:9px;font-weight:700;color:var(--ink3);text-transform:uppercase">Skoðun</div>
                  <div style="font-size:12px;font-weight:700;color:${m===curMonth?'#dc2626':'var(--ink1)'}">${manualMark(esc(MONTHS_IS_SHORT[m-1] || '—'), !!ars.inspect_month_manual)}</div>
                </div>
                <div ${ovr ? `class="_ars-ovr-eq" data-co-id="${c.id}" title="⚡ Smelltu til að breyta tækjatölum"` : ''} style="background:${ovr ? '#fffbeb' : 'var(--bg)'};border:1px ${ovr ? 'dashed #d97706' : 'solid var(--brd)'};border-radius:6px;padding:4px 7px${ovr ? ';cursor:pointer;min-height:40px;box-sizing:border-box' : ''}">
                  <div style="font-size:9px;font-weight:700;color:var(--ink3);text-transform:uppercase">Tæki</div>
                  <div style="margin-top:1px">${manualMark(eqTrioHtml(eq, 'screen'), !!ars.equipment_manual)}</div>
                </div>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:4px 7px">
                  <div style="font-size:9px;font-weight:700;color:#166534;text-transform:uppercase">Áætl.</div>
                  <div style="font-size:11.5px;font-weight:700;color:#15803d;font-variant-numeric:tabular-nums">${fmtKrShort(est)}</div>
                </div>
              </div>

              ${(() => {
                const ac = attCount(c.id);
                return ac > 0 ? `<div style="display:flex;align-items:center;gap:5px;font-size:10.5px;color:var(--ink3)"><span style="background:#dbeafe;color:var(--brand);font-weight:700;padding:1px 6px;border-radius:99px;border:1px solid #93c5fd">📎 ${ac} ${ac === 1 ? 'skjal' : 'skjöl'}</span></div>` : '';
              })()}
              ${aminning ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:5px 8px;font-size:10.5px;color:#92400e;line-height:1.35"><strong style="font-weight:700">📌 Áminning:</strong> ${esc(aminning.slice(0, 140))}${aminning.length>140?'…':''}</div>` : ''}

              <div style="display:flex;gap:5px;margin-top:3px">
                <button class="_ars-open-fyrirt" data-co-id="${c.id}" type="button" style="flex:1;padding:5px 9px;background:var(--surface);color:var(--ink1);border:1px solid var(--brd2);border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:600">🏢 Fyrirtæki</button>
                <button class="_ars-open-map" data-co-id="${c.id}" type="button" style="flex:1;padding:5px 9px;background:var(--surface);color:var(--ink1);border:1px solid var(--brd2);border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:600">🗺️ Á korti</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ── Status pill (unified) ───────────────────────────────────────────────
  // 2026-06: the right side of the list used to be three loose bits — a
  // floating "⏰ '24" badge, a bare colour dot and a ☐ toggle — plus two
  // never-used action buttons (🏢 🗺️). Replaced by ONE cohesive status pill
  // (icon + text) + a quiet hover-only "Í vinnslu" button; the action buttons
  // are gone (the whole row is still clickable to open the company).
  const _PILL_ICON = {
    done:  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    work:  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0 5 5l-9 9a2.8 2.8 0 1 1-4-4l9-9z"/></svg>',
    skip:  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>',
    over:  '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    queue: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>'
  };
  // 2026-06-20: saturated glossy gradient pills (match FyrirtaekiiThjonustu
  // mockup) — was light tints which washed out on the metallic backdrop.
  const _PILL_C = {
    done:  ['linear-gradient(150deg,#1f9d57,#0a4a26)', '#0c5e31', '#fff'],
    work:  ['linear-gradient(150deg,#4f74dc,#16306f)', '#16306f', '#fff'],
    skip:  ['linear-gradient(150deg,#e0a93e,#9a6a14)', '#8a5e12', '#fff'],
    over:  ['linear-gradient(150deg,#e25555,#a01818)', '#7a1212', '#fff'],
    // 2026-07-15 (ósk Agnars): „Á dagskrá" var NÁKVÆMLEGA sami gulur og „Sleppt '24"
    // → ruglingslegt. Nú himinblátt (sky) — aðgreint bæði frá gula `skip` og frá
    // dökkbláa `work` („Í vinnslu"); sami sky-tónn og akstur-chippinn notar.
    queue: ['linear-gradient(150deg,#38bdf8,#0369a1)', '#0369a1', '#fff']
  };
  function statusPill(state, label, title) {
    const c = _PILL_C[state] || _PILL_C.queue;
    // Fast breidd (min-width + miðjað) svo allar pillur eru jafn stórar → aksturs-
    // chippinn + ✓ raðast í beina dálka niður töfluna (ósk Agnars 2026-07-14).
    return '<span title="' + esc(title || label) + '" style="display:inline-flex;align-items:center;justify-content:center;gap:5px;'
      + 'font-size:10.5px;font-weight:700;line-height:1;padding:4px 9px;border-radius:99px;white-space:nowrap;'
      + 'min-width:104px;box-sizing:border-box;'
      + 'background:' + c[0] + ';color:' + c[2] + ';border:1px solid ' + c[1] + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.4)">'
      + (_PILL_ICON[state] || '') + esc(label) + '</span>';
  }
  // One-time CSS for the hover-reveal "Í vinnslu" button (kept out of inline
  // styles since :hover can't be expressed inline).
  function _ensureStatusCss() {
    if (document.getElementById('_ars-status-css')) return;
    const s = document.createElement('style');
    s.id = '_ars-status-css';
    s.textContent =
      // 2026-06-20: compact checkmark toggle (grey → blue). 2026-06-23 (vefrýni):
      // always-visible grey ✓ (discoverable); click → blue ✓ + the status pill
      // flips to "Í vinnslu"; unchecking reverts to the normal status pill.
      '._ars-mark{opacity:.6;width:26px;height:26px;flex:none;display:inline-flex;align-items:center;justify-content:center;'
      + 'font:800 14px/1 inherit;color:#9aa3af;background:#fff;border:1.5px solid #cbd5e1;border-radius:50%;cursor:pointer;'
      + 'transition:opacity .15s,color .15s,background .15s,border-color .15s,box-shadow .15s}'
      + 'tr._ars-row:hover ._ars-mark,._ars-mark:focus-visible{opacity:1}'
      + '._ars-mark:hover{color:#2f5fe0;background:#eef3ff;border-color:#9bb0e6}'
      + '._ars-mark.on{opacity:1;color:#fff;background:linear-gradient(150deg,#4f74dc,#16306f);border-color:#16306f;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 2px 6px -2px rgba(20,40,120,.5)}';
    document.head.appendChild(s);
  }

  // 2026-06-21: phone styling for this screen. The card grid is already single-
  // column at phone width; this makes the cards + toolbar genuinely thumb-usable
  // (readable text, ≥44px tap targets, 16px search input so the browser doesn't
  // zoom on focus). Scoped to #view-arsskodun + a max-width media query, so it
  // never touches desktop.
  function _ensureArsMobileCss() {
    if (document.getElementById('_ars-mobile-css')) return;
    const s = document.createElement('style');
    s.id = '_ars-mobile-css';
    s.textContent =
      '@media (max-width:768px){' +
        '#view-arsskodun ._ars-vm{display:none!important}' +
        '#view-arsskodun ._ars-cardgrid{grid-template-columns:1fr!important;gap:9px!important}' +
        '#view-arsskodun ._ars-card{padding:14px 15px!important;gap:10px!important;border-radius:13px!important}' +
        '#view-arsskodun ._ars-cn{font-size:16px!important;line-height:1.3!important}' +
        '#view-arsskodun ._ars-ca{font-size:13px!important}' +
        '#view-arsskodun ._ars-cgrid{gap:7px!important;font-size:12px!important}' +
        '#view-arsskodun ._ars-cgrid>div{padding:8px 9px!important}' +
        '#view-arsskodun ._ars-cgrid>div>div:last-child{font-size:15px!important}' +
        '#view-arsskodun ._ars-card ._ars-open-fyrirt,#view-arsskodun ._ars-card ._ars-open-map{min-height:44px!important;font-size:13px!important;border-radius:9px!important}' +
        '#view-arsskodun ._ars-card ._ars-tu-toggle{min-height:38px!important;font-size:12.5px!important;padding:7px 12px!important}' +
        '#view-arsskodun #_ars-search{font-size:16px!important;padding:12px 13px!important;border-radius:10px!important;width:100%!important;box-sizing:border-box!important}' +
        '#view-arsskodun #_ars-new,#view-arsskodun #_ars-print,#view-arsskodun #_ars-ovr{min-height:44px!important;font-size:13px!important}' +
        '#view-arsskodun ._ars-ovr-year{min-height:40px!important;font-size:12px!important}' +
        '#view-arsskodun #_ars-sort{min-height:44px!important;font-size:16px!important}' +
        '#view-arsskodun ._ars-st,#view-arsskodun ._ars-mo,#view-arsskodun #_ars-skiphide,#view-arsskodun .by-preset{min-height:38px!important;font-size:12.5px!important;padding:7px 11px!important}' +
        /* 2026-06-28: stat-card grid was repeat(4,1fr) — overflowed S26.
           Collapse to 2 columns on mobile so all 4 cards fit. */
        '#view-arsskodun ._ars-statgrid{grid-template-columns:1fr 1fr!important;gap:8px!important}' +
        /* Status-filter row was a fixed flex row inside an overflow:hidden
           wrapper — clipped on narrow screens. Let it scroll horizontally
           and snap each chip into the visible area. */
        '#view-arsskodun ._ars-statusrow{overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory;max-width:100%}' +
        '#view-arsskodun ._ars-statusrow>button{scroll-snap-align:start;flex:0 0 auto!important;white-space:nowrap}' +
      '}';
    document.head.appendChild(s);
  }

  // ── App-wide view-mode (📱 Sími / ▦ Tafla / 🖥 Skjár) ────────────────────
  // The toggle itself lives in the banner (patch 166); it writes
  // html[data-viewmode] and fires a `slokk-viewmode` event. Here we only READ
  // that attribute and restyle. Fallback 'desktop'.
  function arsViewMode() {
    const m = document.documentElement.dataset.viewmode;
    return (m === 'mobile' || m === 'table' || m === 'desktop') ? m : 'desktop';
  }
  // CSS keyed off html[data-viewmode] so it applies at ANY width (the toggle is
  // deliberate, not screen-size driven). Matches the Kröfu yfirlit look:
  // stacked big-tap cards for mobile · dense sticky-dark-header table for table.
  function _ensureArsVmCss() {
    if (document.getElementById('_ars-vm-css')) return;
    const s = document.createElement('style');
    s.id = '_ars-vm-css';
    const M = 'html[data-viewmode="mobile"] #view-arsskodun ';
    const T = 'html[data-viewmode="table"] #view-arsskodun ';
    s.textContent =
      // ── 📱 Sími — ÞÉTT single-column spjöld (~3× lægri hæð per fyrirtæki) ──
      M + '._ars-cardgrid{grid-template-columns:1fr!important;gap:6px!important}' +
      M + '._ars-card{padding:8px 11px!important;gap:2px!important;border-radius:10px!important}' +
      M + '._ars-cn{font-size:13.5px!important;line-height:1.15!important;overflow:visible;white-space:normal;overflow-wrap:anywhere}' +
      M + '._ars-ca{font-size:11px!important;margin-top:0!important;overflow:visible;white-space:normal;overflow-wrap:anywhere}' +
      // fela kt-línu + netfangs-línu á spjaldinu (sést í ítarsýn/fyrirtæki) svo hæðin hrynur
      M + '._ars-card ._ars-cn+div{font-size:9px!important}' +
      // þrír stat-kassar → ein þjöppuð lína, engir rammar
      M + '._ars-cgrid{display:flex!important;gap:12px!important;margin-top:1px!important;font-size:11px!important}' +
      M + '._ars-cgrid>div{background:transparent!important;border:0!important;padding:0!important;display:flex!important;align-items:baseline;gap:4px}' +
      M + '._ars-cgrid>div>div:first-child{font-size:8.5px!important;color:var(--ink3)!important}' +
      M + '._ars-cgrid>div>div:last-child{font-size:12px!important;margin-top:0!important}' +
      M + '._ars-eqtrio>span{flex-direction:row!important;gap:2px!important;align-items:baseline!important}' +
      M + '._ars-eqtrio>span>span:last-child{font-size:8px!important}' +
      // fela aðgerða-hnappana (🏢/🗺️) — snerta spjaldið opnar ítarsýn með sömu aðgerðum
      M + '._ars-card ._ars-open-fyrirt,' + M + '._ars-card ._ars-open-map{display:none!important}' +
      M + '._ars-card ._ars-tu-toggle{min-height:0!important;font-size:11px!important;padding:2px 8px!important}' +
      // toolbar/filters made thumb-usable regardless of window width
      M + '._ars-vm{display:none!important}' +
      M + '#_ars-search{font-size:16px!important;padding:12px 13px!important;border-radius:10px!important;width:100%!important;box-sizing:border-box!important}' +
      M + '#_ars-new,' + M + '#_ars-print{min-height:44px!important;font-size:13px!important}' +
      M + '#_ars-sort{min-height:44px!important;font-size:16px!important}' +
      M + '._ars-st,' + M + '._ars-mo,' + M + '#_ars-skiphide{min-height:38px!important;font-size:12.5px!important;padding:7px 11px!important}' +
      M + '._ars-statgrid{grid-template-columns:1fr 1fr!important;gap:8px!important}' +
      M + '._ars-statusrow{overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch;max-width:100%}' +
      M + '._ars-statusrow>button{flex:0 0 auto!important;white-space:nowrap}' +
      // ── ▦ Tafla — ULTRA-dense rows: ~3× lægri hæð per fyrirtæki ──
      T + 'table{font-size:11px!important;min-width:0!important}' +
      T + 'table thead{position:sticky;top:0;z-index:2}' +
      T + 'table thead tr{background:#0f172a!important;border-bottom:0!important}' +
      T + 'table thead th{background:#0f172a!important;color:#fff!important;padding:4px 8px!important;font-size:9px!important;white-space:nowrap}' +
      // tight vertical padding + single-line cells (taflan skrunar lárétt hvort eð er)
      T + 'table tbody td{padding:2px 8px!important;font-size:11px!important;line-height:1.1!important;white-space:nowrap!important;vertical-align:middle!important}' +
      T + 'table tbody td div{line-height:1.1!important;margin-top:0!important}' +
      // kt-lína örsmá (bara í nafna-dálknum)
      T + 'table tbody td:first-child>div:nth-child(2){font-size:8.5px!important}' +
      // fletja SLT/BSL/RS-þrenninguna í EINA línu (var 2 línur = hæsta atriðið)
      T + '._ars-eqtrio{gap:7px!important}' +
      T + '._ars-eqtrio>span{flex-direction:row!important;gap:2px!important;align-items:baseline!important;line-height:1!important}' +
      T + '._ars-eqtrio>span>span:first-child{font-size:11px!important}' +
      T + '._ars-eqtrio>span>span:last-child{font-size:8px!important}' +
      // fela áminningar-línu í töflu (sést á spjaldinu/ítarlegri sýn)
      T + 'table tbody td:first-child>div:nth-child(3){display:none!important}';
    document.head.appendChild(s);
  }

  // ── Design-eftirmynd töflunnar (2026-08-17): CSS beint úr Claude Design
  // verkefninu „Ground 0 - Fyrirtaeki i thjonustu v3.dc.html" (842ebdfe…),
  // skorðað við #view-arsskodun. Grunn-töfluklassarnir (.data-table o.fl.)
  // koma úr theme-scoped.css (.thm-vafið), þetta eru yfirlags-reglurnar +
  // sérklasar designsins (_yr/_dd/_devs/_st/_chk …). AÐEINS taflan — ekkert
  // annað á síðunni (ósk Agnars).
  function _ensureMockCss() {
    if (document.getElementById('_ars-mock-css')) return;
    const s = document.createElement('style');
    s.id = '_ars-mock-css';
    const V = '#view-arsskodun ';
    s.textContent = [
      // 245 (Brunastál content-skin) málar `.view table th` ljósgrá með
      // !important — dökka málm-bandið úr designinu þarf sama vopn hér.
      V+'.data-table thead tr{background:linear-gradient(180deg,#3a3d45 0%,#2a2d33 45%,#1b1d22 100%)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 -1px 0 #000!important}',
      V+'.data-table th{background:transparent!important;color:#f0f2f5!important;text-shadow:0 1px 1px rgba(0,0,0,.4)!important;border:0!important;text-transform:uppercase!important;font-weight:700!important}',
      V+'.data-table .sort-ar{color:rgba(255,255,255,.5)!important}',
      V+'.data-table th{padding:11px 12px;font-size:10.5px;letter-spacing:.15em}',
      V+'.data-table tbody td{padding:7px 12px;border-top:1px solid #eceff4;line-height:1.25;height:44px;white-space:nowrap;font-size:13px}',
      V+'.data-table tbody tr:hover{background:#f7f9fd}',
      V+'.data-table{min-width:1300px;width:100%;table-layout:fixed}',
      // Súlubreiddirnar koma úr <colgroup> í renderTable (skothelt í fixed
      // layout, ónæmt fyrir colspan-hausnum) — design: 186/118/4×64/284/62/158/74/66/150.
      // árs-reitirnir fjórir (187 sprautar, sitja nú á 4–7 á eftir heimilisfangi)
      V+'.data-table td:nth-child(4),'+V+'.data-table td:nth-child(5),'+V+'.data-table td:nth-child(6),'+V+'.data-table td:nth-child(7){padding-left:2px;padding-right:2px;text-align:center}',
      V+'._co{display:block;font-size:13px;font-weight:600;color:var(--ink);white-space:normal;overflow:visible;overflow-wrap:anywhere}',
      V+'._kt{display:block;font-family:var(--mono);font-size:10px;color:var(--muted);letter-spacing:.02em;white-space:nowrap;line-height:1.2}',
      V+'._addr{white-space:normal;overflow:visible;overflow-wrap:anywhere;display:block}',
      V+'._post{font-family:var(--mono);font-size:11px;font-weight:700;color:var(--muted);margin-right:8px}',
      V+'._mo{font-family:var(--mono);font-size:12px;color:var(--ink-2)}',
      V+'._note{width:100%;height:24px;border:1px solid transparent;border-radius:7px;background:transparent;color:#3a4250;font-family:var(--ui);font-size:11.5px;padding:0 9px;box-sizing:border-box;transition:background .12s,border-color .12s}',
      V+'._note::placeholder{color:#c7ccd6;letter-spacing:.16em}',
      V+'._note:hover{border-color:#e6e9ef;background:#fbfcfd}',
      V+'._note:focus{outline:none;border-color:#2f5fe0;background:#fff;color:#0f172a}',
      V+'._yrs{display:flex;gap:11px;justify-content:center}',
      V+'._dd{display:inline-flex;flex-direction:column;align-items:center;gap:3px}',
      V+'._dd > u{display:flex;gap:3px;text-decoration:none}',
      V+'._dd > u > i{width:5px;height:5px;border-radius:50%;background:#dfe3ea}',
      V+'._dd > u > i.rep{background:#1f9d57}',
      V+'._dd > u > i.inv{background:#2f5fe0}',
      V+'._yr{display:inline-flex;align-items:center;justify-content:center;gap:5px;width:52px;height:20px;border-radius:6px;font-family:var(--mono);font-size:11px;font-weight:700;color:#aab3c0;background:#f4f6f9;border:1px solid #e7eaf0;text-decoration:none;cursor:pointer}',
      V+'._yr::before{content:"";width:6px;height:6px;border-radius:50%;background:rgba(0,0,0,.14);flex:none}',
      V+'._yr.lit::before{background:#37c47e;box-shadow:0 0 5px rgba(55,196,126,.8)}',
      V+'._yr.now.lit::before,'+V+'._yr.both.lit::before{background:#7df0b4;box-shadow:0 0 5px rgba(125,240,180,.9)}',
      V+'._yr.inv-only.lit::before{background:#9fc3ff;box-shadow:0 0 5px rgba(159,195,255,.9)}',
      V+'._yr.on{color:#3a4250;background:#e7ebf2;border-color:#d8dde6}',
      // 2026-08-17 (Agnar: „should not be black"): --btn-grad rann í svart í
      // 20px hæð — vantar-merkin nota nú sama skýra rauða gradient og Á eftir-
      // pillan svo þau lesist RAUÐ, ekki svört.
      V+'._yr.now{color:#fff;background:linear-gradient(145deg,#d84f4a 0%,#b0201b 42%,#6e100d 72%,#9c1d18 100%);border-color:#4d0a08;box-shadow:inset 0 1.5px 0 rgba(255,255,255,.25),inset 0 -2px 4px rgba(0,0,0,.26)}',
      V+'._yr.both,'+V+'._yr.on.both,'+V+'._yr.now.both{color:#fff;background:linear-gradient(145deg,#1c7a45 0%,#0f4f2b 42%,#062815 72%,#0c3f22 100%);border-color:#041c0e;text-shadow:0 1px 1px rgba(0,0,0,.35);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.2),inset 0 -2px 4px rgba(0,0,0,.26)}',
      V+'._yr.inv-only{color:#fff;background:linear-gradient(145deg,#5a86e0 0%,#2f5fe0 42%,#1a3a8c 72%,#2d55c4 100%);border-color:#12296b;text-shadow:0 1px 1px rgba(0,0,0,.3);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.32),inset 0 -2px 4px rgba(0,0,0,.22)}',
      // 2026-08-17 (Agnar): GULL á yfirstandandi ár þegar skoðunarmánuðurinn er
      // EKKI kominn (t.d. Des-skoðun) — rautt er aðeins fyrir mánuð sem er
      // kominn/liðinn án skoðunar. Gull-tónninn er rf-gullið (árs-tekju-
      // kassinn á Rekstrarfélögum) að ósk Agnars — „use this golden color".
      V+'._yr.penda{color:#fff8e6;background:linear-gradient(150deg,#8a6410,#c99a1e 44%,#5a3f08);border-color:rgba(255,220,130,.45);text-shadow:0 1px 1px rgba(0,0,0,.35);box-shadow:inset 0 1px 0 rgba(255,240,190,.28),inset 0 -2px 4px rgba(0,0,0,.25)}',
      V+'._devs{display:flex;justify-content:flex-end;align-items:stretch}',
      V+'._devs div{padding:0 10px;text-align:right}',
      V+'._devs div + div{border-left:1px solid #e9ecf1}',
      V+'._devs b{display:block;font-family:var(--mono);font-size:13px;font-weight:700;color:var(--ink);line-height:1.15}',
      V+'._devs i{font-style:normal;font-size:8px;letter-spacing:.1em;color:var(--muted)}',
      V+'._devs div.off b{color:var(--empty)}',
      V+'._devs div.off i{color:#d8dde4}',
      V+'._estcell{padding:0 0 0 10px;border-left:1px solid #e9ecf1;text-align:right}',
      V+'._estcell b{display:block;font-family:var(--mono);font-size:13px;font-weight:700;color:var(--ink);line-height:1.15}',
      V+'._estcell i{font-style:normal;font-size:8px;letter-spacing:.1em;color:var(--muted)}',
      V+'.data-table tbody tr.overdue td:first-child{box-shadow:inset 2px 0 0 var(--accent)}',
      V+'.data-table tbody tr:focus-visible{outline:none;background:#eef3ff;box-shadow:inset 0 0 0 2px rgba(47,95,224,.35)}',
      V+'._stcell{display:grid;grid-template-columns:32px 1fr;align-items:center;justify-items:start}',
      V+'._st{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:600;padding:4px 10px;border-radius:7px;white-space:nowrap}',
      V+'._st--work{color:#fff;background:linear-gradient(145deg,#2a4c8f 0%,#183363 45%,#0a1a3a 75%,#122750 100%);border:1px solid #060f24;text-shadow:0 1px 1px rgba(0,0,0,.35);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.2)}',
      V+'._st--done{color:#fff;background:linear-gradient(145deg,#1c7a45 0%,#0f4f2b 42%,#062815 72%,#0c3f22 100%);border:1px solid #041c0e;text-shadow:0 1px 1px rgba(0,0,0,.35);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.22),inset 0 -2px 4px rgba(0,0,0,.28),0 2px 5px -2px rgba(10,40,20,.5)}',
      V+'._st--plan{color:#fff;background:linear-gradient(145deg,#5a86e0 0%,#2f5fe0 42%,#1a3a8c 72%,#2d55c4 100%);border:1px solid #12296b;text-shadow:0 1px 1px rgba(0,0,0,.3);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.35),inset 0 -2px 4px rgba(0,0,0,.22),0 2px 5px -2px rgba(20,40,90,.45)}',
      V+'._st--late{color:#fff;background:linear-gradient(145deg,#d84f4a 0%,#b0201b 42%,#6e100d 72%,#9c1d18 100%);border:1px solid #4d0a08;text-shadow:0 1px 1px rgba(0,0,0,.35);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.28),inset 0 -2px 4px rgba(0,0,0,.26),0 2px 5px -2px rgba(90,15,10,.5)}',
      // Sleppt — sama rf-gull og .penda svo gullið er eitt í töflunni
      V+'._st--skip{color:#fff8e6;background:linear-gradient(150deg,#8a6410,#c99a1e 44%,#5a3f08);border:1px solid rgba(255,220,130,.45);text-shadow:0 1px 1px rgba(0,0,0,.35);box-shadow:inset 0 1px 0 rgba(255,240,190,.28),inset 0 -2px 4px rgba(0,0,0,.25)}',
      V+'._chk{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;border:1px solid #d8dde6;background:#fff;color:#c3cad6;cursor:pointer;padding:0}',
      V+'._chk:hover{border-color:#b9c1cd;color:#7d8794}',
      V+'._chk.on{border-color:#060f24;color:#fff;background:linear-gradient(145deg,#2a4c8f 0%,#183363 45%,#0a1a3a 75%,#122750 100%);box-shadow:inset 0 1.5px 0 rgba(255,255,255,.28),0 2px 6px -2px rgba(10,25,60,.6)}',
      V+'._tfoot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 14px;border-top:1px solid #eceff4;background:#fbfcfe}',
      V+'._tfoot > span{font-family:var(--mono);font-size:11px;letter-spacing:.08em;color:var(--body)}',
      V+'._pager{display:flex;gap:6px}',
      V+'._pager button{height:26px;padding:0 11px;border-radius:7px;border:1px solid #e2e6ed;background:#fff;color:#5b6472;font-family:var(--ui);font-size:12px;cursor:pointer}',
      V+'._pager button:hover{border-color:#c3cad6;color:#3a4250}',
      V+'._pager button[disabled]{opacity:.45;cursor:default}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function renderTable(arr) {
    _ensureStatusCss();
    _ensureMockCss();
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth = today.getMonth() + 1;
    const ovr = overrideOn();
    // Mockup-eftirmynd (2026-08-17): síðuskipting 50 í einu — „SÝNI 1–50 AF n"
    // + Fyrri/Næsta. state._page er setu-bundin (ekki vistuð) og klemmist við
    // hverja endurteiknun svo síu-/leitarbreytingar detta aldrei á tóma síðu.
    const PER = 50;
    const totalRows = arr.length;
    const pages = Math.max(1, Math.ceil(totalRows / PER));
    if (!state._page || state._page > pages) state._page = 1;
    const p0 = (state._page - 1) * PER;
    const pageArr = arr.slice(p0, p0 + PER);
    const pgBtn = 'padding:7px 16px;border:1px solid var(--brd2);border-radius:8px;background:var(--surface);font:inherit;font-size:12px;font-weight:600;color:var(--ink1);cursor:pointer';
    return `
      <div class="thm">
      <div class="data-table-wrap">
        <div class="_ars-tblscroll data-table-scroll">
        <table class="data-table">
          <colgroup>
            <col style="width:186px"><col style="width:118px">
            <col style="width:284px">
            <col style="width:64px"><col style="width:64px"><col style="width:64px"><col style="width:64px">
            <col style="width:62px"><col style="width:158px">
            <col style="width:74px"><col style="width:66px"><col style="width:150px">
          </colgroup>
          <thead>
            <tr>
              ${(() => {
                // Röðunarhausar — design v3 (842ebdfe): grunnstíllinn (málm-band,
                // hvítt uppercase, sticky) kemur úr theme-scoped .thm .data-table.
                const cur = state.sortCol;
                const dir = state.sortDir;
                const arrow = (col) => '<span class="sort-ar">' + (cur === col ? (dir === 'asc' ? '▲' : '▼') : '⇅') + '</span>';
                return `
                  <th data-sort="name" class="_ars-sort">Fyrirtæki${arrow('name')}<span class="_ars-mailsort" title="Raða eftir póst-stöðu (merkin í þessum dálki). 1× smellur: ósvarað → saga → engin · 2×: póstsaga til fyrst · 3×: til baka í stafrófsröð" style="margin-left:7px;cursor:pointer;font-size:10px;font-weight:800;padding:1px 5px;border-radius:6px;vertical-align:middle;white-space:nowrap;${(cur==='poststada'||cur==='postavail')?'background:rgba(59,130,246,.22);outline:1px solid rgba(59,130,246,.55);color:#fff':'opacity:.5'}">🚦${cur==='poststada'?' staða '+(dir==='asc'?'▲':'▼'):cur==='postavail'?' saga '+(dir==='asc'?'▲':'▼'):''}</span></th>
                  <th data-notacol="1" title="✈ Ferðanóta — tímabundnar nótur við ferðaskipulag">Ferðanóta</th>
                  <th data-addrcol="1" data-sort="postnumer" class="_ars-sort" title="Raða eftir póstnúmeri (fyrir akstursleiðir)">Heimilisfang${arrow('postnumer')}</th>
                  <th data-sort="month" class="_ars-sort center">Skoðun${arrow('month')}</th>
                  <th data-sort="tools" class="_ars-sort num">Tæki${arrow('tools')}</th>
                  <th data-sort="akstur" class="_ars-sort center" title="Aksturslisti (1/2/3) — raða til að prenta per bílstjóra">Akstur${arrow('akstur')}</th>
                  <th data-sort="priority" class="_ars-sort center">Forg.${arrow('priority')}</th>
                  <th data-sort="status" class="_ars-sort center" title="Hringlaga hakið merkir Í vinnslu — skoðun hafin, skýrsla/reikningur eftir">Staða ${curYear}${arrow('status')}</th>
                `;
              })()}
            </tr>
          </thead>
          <tbody>
            ${pageArr.map(c => {
              const ars = c._ars || {};
              const eq = ars.equipment || {};
              const totalEq = Object.values(eq).reduce((s, v) => s + (+v || 0), 0);
              const m = +ars.inspect_month || 0;
              const lastYr = +ars.last_year_inspected || 0;
              const fieldYr = +ars.field_inspected_year || 0;
              const isDone = isDoneYear(c, curYear);
              const isFieldOnly = !isDone && fieldYr === curYear;
              const isSkipped = !isDone && !isFieldOnly && isSkippedLastYear(c, curYear);
              const isOverdue = !isDone && !isFieldOnly && !isSkipped && (m > 0 && m <= curMonth);
              const est = +ars.estimated_yearly || 0;
              const aminning = cleanAminning(ars.aminning);
              const stState = isDone ? 'done' : isFieldOnly ? 'work' : isSkipped ? 'skip' : isOverdue ? 'over' : 'queue';
              const stLabel = isDone ? ('Skoðað ' + curYear)
                : isFieldOnly ? 'Í vinnslu'
                : isSkipped ? ("Sleppt '" + String(lastYr).slice(-2))
                : isOverdue ? 'Á eftir'
                : 'Á dagskrá';
              const stTitle = isDone ? ('Skoðað ' + curYear)
                : isFieldOnly ? 'Í vinnslu — skoðun hafin, skýrsla/reikningur eftir'
                : isSkipped ? ('Síðast skoðað ' + lastYr)
                : isOverdue ? 'Útrunnið' : 'Á dagskrá';
              const markBtn = !isDone
                ? `<button class="_ars-tu-toggle _ars-mark${isFieldOnly ? ' on' : ''}" data-co-id="${c.id}" type="button" title="${isFieldOnly ? 'Í vinnslu (skýrslugerð) — smelltu til að hreinsa' : 'Merkja sem Í vinnslu (skýrsla/reikningur eftir)'}">✓</button>`
                : '';
              const g = eqGroups(ars.equipment || {});
              return `
                <tr class="_ars-row${stState === 'over' ? ' overdue' : ''}" data-co-id="${c.id}" tabindex="0" style="cursor:pointer">
                  <td>
                    <span class="_co">${esc(c.nafn || '—')}</span>
                    ${c.kennitala ? `<span class="_kt">${esc(fmtKt(c.kennitala))}</span>` : ''}
                    ${((window.NyttBadge && NyttBadge.is(c.id)) || (window.RekstrarfelagBadge && c.kennitala && RekstrarfelagBadge.html(c.kennitala)) || state.status === 'skipped2025') ? `<span style="display:flex;gap:4px;flex-wrap:wrap;margin-top:2px;align-items:center">${(window.NyttBadge && NyttBadge.is(c.id)) ? NyttBadge.badgeHtml() : ''}${(window.RekstrarfelagBadge && c.kennitala) ? RekstrarfelagBadge.html(c.kennitala) : ''}${state.status === 'skipped2025' ? (ars.ekki_sleppt
                      ? `<button class="_ars-unskip" data-co-id="${c.id}" type="button" title="Handvirkt virkjaður aftur — smelltu til að merkja aftur sem sleppt" style="font-size:9.5px;padding:2px 8px;border-radius:99px;border:1px solid #86efac;background:#f0fdf4;color:#15803d;cursor:pointer;font-weight:700">✓ virkur · ↩ aftur í sleppt</button>`
                      : `<button class="_ars-unskip" data-co-id="${c.id}" type="button" title="Virkja aftur — telst þá ekki lengur sleppt og birtist í öllum sýnum og tölum" style="font-size:9.5px;padding:2px 8px;border-radius:99px;border:1px solid #fde68a;background:#fef3c7;color:#a16207;cursor:pointer;font-weight:700">↩ Virkja aftur</button>`) : ''}</span>` : ''}
                    ${aminning ? `<div style="font-size:10px;color:#b45309;margin-top:1px;line-height:1.3;white-space:normal"><span style="font-weight:700">📌</span> ${esc(aminning.slice(0, 90))}${aminning.length>90?'…':''} <button class="_ars-amin-x" data-co-id="${c.id}" type="button" title="Eyða áminningunni af þessu fyrirtæki" style="border:none;background:transparent;color:#b45309;cursor:pointer;font-size:10px;padding:0 3px;opacity:.7">✕</button></div>` : ''}
                  </td>
                  <td class="_ars-notacell"><input class="_note _ars-plannote" data-co-id="${c.id}" value="${esc(c.plan_note || '')}" placeholder="·····" title="Ferðanóta — tímabundnar nótur við ferðaskipulag" maxlength="140"></td>
                  <td class="_ars-addrcell"><span class="_addr">${c.postnumer ? `<span class="_post">${esc(c.postnumer)}</span>` : ''}${esc(c.heimilisfang || '—')}</span></td>
                  <td class="center${ovr ? ' _ars-ovr-month' : ''}"${ovr ? ` data-co-id="${c.id}" title="⚡ Smelltu til að breyta skoðunarmánuði" style="cursor:pointer;background:rgba(245,158,11,.07)"` : ''}><span class="_mo" style="${m===curMonth?'color:#c0241f;font-weight:700':''}">${manualMark(esc(MONTHS_IS_SHORT[m-1] || '—'), !!ars.inspect_month_manual)}</span></td>
                  <td ${ovr ? `class="_ars-ovr-eq" data-co-id="${c.id}" title="⚡ Smelltu til að breyta tækjatölum" style="cursor:pointer;background:rgba(245,158,11,.07)"` : ''}>
                    <div class="_devs">
                      <div class="${g.slt ? '' : 'off'}" title="Slökkvitæki"><b>${g.slt || 0}</b><i>SLT</i></div>
                      <div class="${g.bsl ? '' : 'off'}" title="Brunaslöngur"><b>${g.bsl || 0}</b><i>BSL</i></div>
                      <div class="${g.rs ? '' : 'off'}" title="Reykskynjarar"><b>${g.rs || 0}</b><i>RS</i></div>
                      ${g.other ? `<div title="Annað"><b>${g.other}</b><i>ANNAÐ</i></div>` : ''}
                      <div class="_estcell" title="Áætlað virði ársþjónustu"><b>${fmtKrShort(est)}</b><i>ÁÆTL</i></div>
                    </div>${ars.equipment_manual ? '<span title="Handvirkt yfirskrifað" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#f59e0b;margin-left:4px;vertical-align:top"></span>' : ''}
                  </td>
                  <td class="center _arsak-cell" onclick="event.stopPropagation()"></td>
                  <td class="center" onclick="event.stopPropagation()">${(window.Priority && window.Priority.btnHtml(c.id, 18)) || ''}</td>
                  <td class="center">
                    <div class="_stcell">
                      ${!isDone
                        ? `<button class="_chk _ars-tu-toggle _ars-mark${isFieldOnly ? ' on' : ''}" data-co-id="${c.id}" type="button" title="${isFieldOnly ? 'Í vinnslu (skýrslugerð) — smelltu til að hreinsa' : 'Merkja sem Í vinnslu (skýrsla/reikningur eftir)'}"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg></button>`
                        : '<span></span>'}
                      <span style="display:inline-flex;align-items:center;gap:6px">
                        <span class="_st ${stState === 'done' ? '_st--done' : stState === 'work' ? '_st--work' : stState === 'skip' ? '_st--skip' : stState === 'over' ? '_st--late' : '_st--plan'}" title="${esc(stTitle)}">${stState === 'over' ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10.3 3.9-8.2 14.2a1.9 1.9 0 0 0 1.7 2.9h16.4a1.9 1.9 0 0 0 1.7-2.9L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>' : ''}${esc(stLabel)}</span>
                        ${ovr ? `<span class="_ars-ovr-year" data-co-id="${c.id}" title="⚡ Síðast skoðað (ár) — smelltu til að breyta" style="display:inline-flex;align-items:center;min-height:24px;padding:2px 8px;border:1px dashed #d97706;background:#fffbeb;color:#92400e;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;white-space:nowrap">📅 ${lastYr || '—'}</span>` : ''}
                      </span>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        </div>
        <div class="_tfoot">
          <span>SÝNI ${totalRows ? (p0 + 1) : 0}–${Math.min(p0 + PER, totalRows)} AF ${totalRows}</span>
          <div class="_pager">
            <button id="_ars-pgprev" type="button" ${state._page <= 1 ? 'disabled' : ''}>Fyrri</button>
            <button id="_ars-pgnext" type="button" ${state._page >= pages ? 'disabled' : ''}>Næsta</button>
          </div>
        </div>
      </div>
      </div>
    `;
  }

  // ── Detail modal ─────────────────────────────────────────────────────────
  function openDetail(coId, opts) {
    opts = opts || {};
    const c = _cache.list.find(x => x.id === coId);
    if (!c) return;
    const ars = c._ars || {};
    const eq = ars.equipment || {};
    const m = +ars.inspect_month || 0;
    const history = ars.history || [];
    const aminning = cleanAminning(ars.aminning);
    const est = +ars.estimated_yearly || 0;
    // 2026-06: linked inspection report (úttektarskýrsla) from the Drive master.
    const skyrsla = ars._skyrsla || '';
    const skyrslaName = skyrsla ? skyrsla.split('/').pop().replace(/\.(pdf|docx)$/i, '') : '';
    // Prefer a resolved direct Drive file URL (_skyrsla_url); else search Drive by name.
    const skyrslaUrl = ars._skyrsla_url ? ars._skyrsla_url
      : (skyrsla ? 'https://drive.google.com/drive/search?q=' + encodeURIComponent(skyrslaName) : '');
    const eqRows = [
      ['lettvatn', 'Léttvatn 6 ltr.'],
      ['duft2', 'Duft 2 kg.'],
      ['duft6_12', 'Duft 6-12 kg.'],
      ['co2_2', 'CO₂ 2 kg.'],
      ['co2_5', 'CO₂ 5 kg.'],
      ['brunaslongur', 'Brunaslöngur'],
      ['eldvarnarteppi', 'Eldvarnarteppi'],
      ['reykskynjarar', 'Reykskynjarar'],
      ['annad', 'Annað / óþekkt']
    ];
    const eqTotal = Object.values(eq).reduce((s, v) => s + (+v || 0), 0);

    // Backdrop
    document.querySelectorAll('._ars-modal-bg').forEach(n => n.remove());
    const bg = document.createElement('div');
    bg.className = '_ars-modal-bg';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow-y:auto';
    bg.innerHTML = `
      <div class="_ars-modal" style="background:var(--surface);border-radius:14px;max-width:780px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.4);overflow:hidden">
        <div style="padding:16px 20px;border-bottom:1px solid var(--brd);display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div style="flex:1;min-width:0">
            <div class="_ars-info-view">
              <div style="font-size:18px;font-weight:700;color:var(--ink1)">${esc(c.nafn || '—')}</div>
              <div style="font-size:11.5px;color:var(--ink3);margin-top:3px">${esc(fmtKt(c.kennitala) || '—')}${c.heimilisfang ? ' · 📍 ' + esc(c.heimilisfang) : ''}</div>
              ${c.simi || c.farsimi ? `<div style="font-size:11px;color:var(--ink3);margin-top:1px">📞 ${esc([c.simi, c.farsimi].filter(Boolean).join(' / '))}</div>` : ''}
              ${c.netfang ? `<div style="font-size:11px;color:var(--ink3);margin-top:1px">✉️ ${esc(c.netfang)}</div>` : ''}
              ${c['tengiliður'] ? `<div style="font-size:11px;color:var(--ink3);margin-top:1px">👤 ${esc(c['tengiliður'])}</div>` : ''}
            </div>
            <div class="_ars-info-edit" style="display:none">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase">Nafn<input data-field="nafn" value="${esc(c.nafn || '')}" style="padding:6px 9px;border:1px solid var(--brd2);border-radius:6px;font:inherit;font-size:13px;color:var(--ink1);background:var(--surface);outline:none"/></label>
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase">Kennitala<input data-field="kennitala" value="${esc(c.kennitala || '')}" style="padding:6px 9px;border:1px solid var(--brd2);border-radius:6px;font:inherit;font-size:13px;color:var(--ink1);background:var(--surface);outline:none;font-family:monospace"/></label>
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase;grid-column:1/-1">Heimilisfang<input data-field="heimilisfang" value="${esc(c.heimilisfang || '')}" style="padding:6px 9px;border:1px solid var(--brd2);border-radius:6px;font:inherit;font-size:13px;color:var(--ink1);background:var(--surface);outline:none"/></label>
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase">Sími<input data-field="simi" value="${esc(c.simi || '')}" style="padding:6px 9px;border:1px solid var(--brd2);border-radius:6px;font:inherit;font-size:13px;color:var(--ink1);background:var(--surface);outline:none"/></label>
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase">Farsími<input data-field="farsimi" value="${esc(c.farsimi || '')}" style="padding:6px 9px;border:1px solid var(--brd2);border-radius:6px;font:inherit;font-size:13px;color:var(--ink1);background:var(--surface);outline:none"/></label>
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase">Netfang<input data-field="netfang" type="email" value="${esc(c.netfang || '')}" style="padding:6px 9px;border:1px solid var(--brd2);border-radius:6px;font:inherit;font-size:13px;color:var(--ink1);background:var(--surface);outline:none"/></label>
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase">Tengiliður<input data-field="tengiliður" value="${esc(c['tengiliður'] || '')}" style="padding:6px 9px;border:1px solid var(--brd2);border-radius:6px;font:inherit;font-size:13px;color:var(--ink1);background:var(--surface);outline:none"/></label>
                <label style="display:flex;flex-direction:column;gap:2px;font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase">Skoðunarmánuður<select class="_ars-month-edit" style="padding:6px 9px;border:1px solid var(--brd2);border-radius:6px;font:inherit;font-size:13px;color:var(--ink1);background:var(--surface);outline:none">
                  <option value="0">— enginn</option>
                  ${['janúar','febrúar','mars','apríl','maí','júní','júlí','ágúst','september','október','nóvember','desember'].map((n,i)=>`<option value="${i+1}" ${(+ars.inspect_month===i+1)?'selected':''}>${n}</option>`).join('')}
                </select></label>
              </div>
              <div style="display:flex;gap:6px;margin-top:8px">
                <button class="_ars-info-save" type="button" style="padding:6px 14px;background:#15803d;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">💾 Vista</button>
                <button class="_ars-info-cancel" type="button" style="padding:6px 14px;background:var(--surface);color:var(--ink2);border:1px solid var(--brd2);border-radius:6px;cursor:pointer;font:inherit;font-size:12px">Hætta við</button>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;align-items:center">
            ${c.kennitala ? `<button class="_ars-add-site" type="button" title="Bæta við annarri staðsetningu á sömu kennitölu (sama rekstrarfélag)" style="background:#eff6ff;border:1px solid #bfdbfe;color:#1e40af;border-radius:6px;height:28px;padding:0 9px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700;white-space:nowrap">🏢 + Staðsetning</button>` : ''}
            <button class="_ars-info-toggle" type="button" title="Breyta upplýsingum" style="background:var(--brd);border:1px solid var(--brd);color:var(--ink2);border-radius:5px;width:28px;height:28px;cursor:pointer;font-size:13px;padding:0">✏️</button>
            <button class="_ars-close" type="button" style="background:transparent;border:none;font-size:24px;color:var(--ink4);cursor:pointer;line-height:1;padding:0 4px">×</button>
          </div>
        </div>

        <div style="padding:18px 20px;display:flex;flex-direction:column;gap:14px">

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
            <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:8px 11px">
              <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase">Skoðunarmánuður</div>
              <div style="font-size:16px;font-weight:800;color:#b45309;margin-top:2px">${m>=1&&m<=12 ? esc(MONTHS_IS[m-1]) : '—'}</div>
            </div>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 11px">
              <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase">Síðasta skoðun</div>
              <div style="font-size:16px;font-weight:800;color:#15803d;margin-top:2px">${ars.last_year_inspected || '—'}</div>
              ${ars.last_skodun ? `<div style="font-size:10.5px;color:#16a34a">${esc(ars.last_skodun)}</div>` : ''}
              ${skyrsla ? `<a href="${skyrslaUrl}" target="_blank" rel="noopener" title="${esc(skyrsla)}" style="display:inline-block;margin-top:3px;font-size:10.5px;color:var(--brand);text-decoration:none;font-weight:700">📄 Skýrsla</a>` : ''}
            </div>
            <div style="background:var(--surface2);border:1px solid var(--brd);border-radius:8px;padding:8px 11px">
              <div style="font-size:10px;font-weight:700;color:var(--ink2);text-transform:uppercase">Áætluð árstekja</div>
              <div style="font-size:16px;font-weight:800;color:var(--ink1);margin-top:2px;font-variant-numeric:tabular-nums">${fmtKr(est)}</div>
              ${ars.aminning_parsed && ars.aminning_parsed.discount_pct ? `<div style="font-size:10.5px;color:#dc2626">−${ars.aminning_parsed.discount_pct}% afsl.</div>` : ''}
            </div>
          </div>

          ${(() => {
            // 2026-07-23 (ósk Agnars): þegar ENGIN skýrsla er til → grátt hak til að
            // merkja fyrirtækið „Nýtt" (fjólublátt) og velja skoðunarmánuð. Hvort
            // tveggja birtist á Fyrirtæki-í-þjónustu (verdict-merki + mánuður).
            const noReports = !(+ars.last_year_inspected) && !skyrsla && !((ars._docYears || []).length);
            if (!noReports && !ars.nytt_manual) return '';
            const on = !!ars.nytt_manual, mm = +ars.inspect_month || 0;
            return `
          <div style="background:${on ? '#ede9fe' : 'var(--surface2)'};border:1px solid ${on ? '#c4b5fd' : 'var(--brd)'};border-radius:9px;padding:11px 13px;display:flex;flex-wrap:wrap;align-items:center;gap:12px">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;font-weight:700;color:${on ? '#6d28d9' : 'var(--ink1)'}">
              <input type="checkbox" class="_ars-nytt-chk" ${on ? 'checked' : ''} style="width:17px;height:17px;accent-color:#7c3aed;cursor:pointer">
              🆕 Nýr í þjónustu — bíður fyrstu skoðunar
            </label>
            ${on ? '<span style="background:#ede9fe;color:#7c3aed;font-size:11px;font-weight:800;padding:3px 10px;border-radius:99px">🆕 Nýtt</span>' : ''}
            <span style="flex:1"></span>
            <label style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--ink3);font-weight:700;text-transform:uppercase${on ? '' : ';opacity:.45;pointer-events:none'}">Skoðunarmánuður
              <select class="_ars-nytt-month" style="padding:5px 9px;border:1px solid var(--brd2);border-radius:6px;font:inherit;font-size:13px;color:var(--ink1);background:var(--surface);outline:none">
                <option value="0">— velja —</option>
                ${MONTHS_IS.map((n, i) => `<option value="${i + 1}" ${mm === i + 1 ? 'selected' : ''}>${n}</option>`).join('')}
              </select>
            </label>
          </div>`;
          })()}

          <!-- 📧 Póstsamskipti (2026-07-18, ósk Agnars): síðustu tölvupóstsamskipti
               við kúnnann úr eldklar-pósthólfunum (email_digest) — brot af nýjasta
               skeyti + ✨ AI-samantekt, stækkanlegt í alla söguna. -->
          <div id="_ars-postur" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:9px;padding:10px 13px">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <div style="font-size:10px;font-weight:700;color:#0369a1;text-transform:uppercase">📧 Póstsamskipti (eldklar)</div>
              <div style="display:flex;gap:6px">
                <button class="_ars-post-ai" type="button" style="display:none;background:none;border:1px solid #bae6fd;color:#0369a1;border-radius:5px;padding:2px 8px;cursor:pointer;font:inherit;font-size:11px">✨ AI-samantekt</button>
                <button class="_ars-post-more" type="button" style="display:none;background:none;border:1px solid #bae6fd;color:#0369a1;border-radius:5px;padding:2px 8px;cursor:pointer;font:inherit;font-size:11px">▼ Öll sagan</button>
              </div>
            </div>
            <div class="_ars-post-body" style="font-size:12px;color:#0c4a6e;margin-top:6px">⏳ Sæki póstsögu…</div>
            <div class="_ars-post-list" style="display:none;margin-top:8px;max-height:340px;overflow-y:auto;display:none;flex-direction:column;gap:5px"></div>
          </div>

          ${aminning ? `
          <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:9px;padding:10px 13px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
              <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase">📌 Áminning (úr skuldunautaskrá)</div>
              <button class="_ars-amin-del" type="button" title="Eyða áminningunni" style="background:none;border:1px solid #fde68a;color:#92400e;border-radius:5px;padding:2px 8px;cursor:pointer;font:inherit;font-size:11px">🗑 Eyða</button>
            </div>
            <div style="font-size:12px;color:#78350f;line-height:1.5;white-space:pre-wrap">${esc(aminning)}</div>
            ${ars.aminning_parsed && (ars.aminning_parsed.yfirferd_price || ars.aminning_parsed.hledsla_price) ? `
              <div style="margin-top:6px;display:flex;gap:10px;flex-wrap:wrap;font-size:10.5px;color:#92400e">
                ${ars.aminning_parsed.yfirferd_price ? `<span style="background:var(--surface);border:1px solid #fde68a;border-radius:5px;padding:2px 7px"><strong>Yfirferð:</strong> ${fmtKr(ars.aminning_parsed.yfirferd_price)}</span>` : ''}
                ${ars.aminning_parsed.hledsla_price ? `<span style="background:var(--surface);border:1px solid #fde68a;border-radius:5px;padding:2px 7px"><strong>Hleðsla:</strong> ${fmtKr(ars.aminning_parsed.hledsla_price)}</span>` : ''}
              </div>` : ''}
          </div>` : ''}

          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <div style="font-size:11px;font-weight:700;color:var(--ink2);text-transform:uppercase">🧰 Þjónustutæki  <span class="_ars-eq-total" style="color:var(--ink4);font-weight:500">(${eqTotal} alls)</span></div>
              <button class="_ars-eq-toggle" type="button" title="Breyta tölum" style="background:var(--brd);border:1px solid var(--brd);color:var(--ink2);border-radius:5px;padding:3px 8px;cursor:pointer;font:inherit;font-size:11px">✏️ Breyta</button>
            </div>
            <div class="_ars-eq-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">
              ${eqRows.map(([k, label]) => {
                const v = +eq[k] || 0;
                return `<div data-eq-cell="${k}" style="background:${v?'var(--bg)':'var(--surface)'};border:1px solid ${v?'var(--brd2)':'var(--brd)'};border-radius:7px;padding:7px 9px;text-align:center;position:relative">
                  <div style="font-size:9.5px;color:var(--ink3);font-weight:600;line-height:1.2">${esc(label)}</div>
                  <div class="_ars-eq-val" style="font-size:18px;font-weight:800;color:${v?'var(--ink1)':'var(--brd2)'};margin-top:2px">${v||'·'}</div>
                  <input class="_ars-eq-input" data-eq="${k}" type="number" min="0" step="1" value="${v}" style="display:none;width:100%;padding:4px 6px;border:1px solid var(--brd2);border-radius:5px;font:inherit;font-size:14px;font-weight:700;color:var(--ink1);background:var(--surface);outline:none;text-align:center;margin-top:2px;box-sizing:border-box;-moz-appearance:textfield"/>
                </div>`;
              }).join('')}
            </div>
            <div class="_ars-eq-actions" style="display:none;gap:6px;margin-top:8px">
              <button class="_ars-eq-save" type="button" style="padding:6px 14px;background:#15803d;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">💾 Vista breytingar</button>
              <button class="_ars-eq-cancel" type="button" style="padding:6px 14px;background:var(--surface);color:var(--ink2);border:1px solid var(--brd2);border-radius:6px;cursor:pointer;font:inherit;font-size:12px">Hætta við</button>
              ${ars.equipment_manual ? `<button class="_ars-eq-clearovr" type="button" title="Fella handvirku tölurnar niður svo skýrslu-/tækjagögn flæði aftur" style="padding:6px 14px;background:#fffbeb;color:#92400e;border:1px dashed #d97706;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">↺ Hreinsa yfirskrift</button>` : ''}
            </div>
          </div>

          ${(() => {
            // 2026-06-24: per-tæki list with delete. The aggregate count grid
            // above is DERIVED LIVE from uttaeki, so reducing a number there never
            // sticks (it's recomputed on every render). To really remove a tæki the
            // uttaeki row itself must go — so list the units and let the user
            // hard-delete each one (FK-safe: clears taeki_events + skodunar_saga
            // first). Permanent so the tæki is also gone from the invoice/úttekt flow.
            const units = (ars._units || []).slice().sort((a, b) => String(a.serial || '').localeCompare(String(b.serial || ''), 'is'));
            if (!units.length) return '';
            return `
              <div>
                <div class="_ars-units-toggle" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;cursor:pointer;user-select:none">
                  <div style="font-size:11px;font-weight:700;color:var(--ink2);text-transform:uppercase">🧯 Stök tæki <span class="_ars-units-count" style="color:var(--ink4);font-weight:500">(${units.length})</span></div>
                  <span class="_ars-units-caret" style="color:var(--ink3);font-size:11px;font-weight:600">▸ Sýna / eyða</span>
                </div>
                <div class="_ars-units-list" style="display:none;flex-direction:column;gap:4px;max-height:260px;overflow-y:auto">
                  ${units.map(u => {
                    const cat = categoryOf(u.type, u.size);
                    return `<div class="_ars-unit-row" data-unit-id="${esc(u.id)}" style="display:flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--brd);border-radius:6px;padding:6px 10px;font-size:11.5px">
                      <span style="font-family:monospace;color:var(--ink2);min-width:84px">${esc(u.serial || '—')}</span>
                      <span style="flex:1;min-width:0;color:var(--ink1)">${esc(u.type || '—')}${u.size ? ' · ' + esc(u.size) : ''}</span>
                      <button class="_ars-unit-del" data-unit-id="${esc(u.id)}" data-unit-serial="${esc(u.serial || '')}" data-unit-cat="${esc(cat)}" type="button" title="Eyða þessu tæki varanlega" style="padding:4px 9px;background:var(--surface);border:1px solid #fecaca;color:#dc2626;border-radius:6px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">🗑</button>
                    </div>`;
                  }).join('')}
                </div>
              </div>`;
          })()}

          ${(() => {
            // Pull Drive-link attachments from AppSettings.company_attachments
            const attsAll = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('company_attachments')) || {};
            const list = attsAll[String(coId)] || [];
            if (!list.length) return '';
            // Sort newest year first
            const sorted = list.slice().sort((a, b) => (+b.year || 0) - (+a.year || 0));
            return `
              <div>
                <div style="font-size:11px;font-weight:700;color:var(--ink2);text-transform:uppercase;margin-bottom:6px">📎 Skjöl <span style="color:var(--ink4);font-weight:500">(${list.length})</span></div>
                <div style="display:flex;flex-direction:column;gap:4px">
                  ${sorted.map((a, idx) => {
                    // Drive-link entries get a direct <a> opening Drive viewer.
                    // Storage entries (have `path` but no drive_url/drive_id)
                    // get a click handler that fetches a signed URL — patch 111
                    // before this fix rendered href="#" which reloaded the SPA
                    // back to the list view.
                    const isStorage = !a.drive_url && !a.drive_id && a.path;
                    const url = a.drive_url || (a.drive_id && String(a.drive_id).indexOf('sb:') !== 0 ? 'https://brunaholf.netlify.app/api/skjal?id=' + encodeURIComponent(a.drive_id) : null);
                    const icon = a.kind === 'samningur' ? '📜' : '🧾';
                    const yearTag = a.year ? `<span style="background:#f0fdf4;color:#15803d;font-size:10px;font-weight:700;padding:1px 6px;border-radius:99px;border:1px solid #bbf7d0;margin-left:6px">${a.year}</span>` : '';
                    const autoTag = a.auto_matched ? '<span style="color:var(--ink4);font-size:10px" title="Sjálfkrafa pörun">✦</span>' : '';
                    const inner = `
                      <span style="font-size:14px">${icon}</span>
                      <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.name || 'Skjal')}</span>
                      ${yearTag}
                      ${autoTag}
                      <span style="color:var(--ink4);font-size:10px">↗</span>`;
                    const baseStyle = "display:flex;align-items:center;gap:8px;background:var(--surface2);border:1px solid var(--brd);border-radius:6px;padding:6px 10px;text-decoration:none;color:var(--ink1);font-size:11.5px;transition:background .1s;text-align:left;width:100%;font:inherit;cursor:pointer";
                    if (isStorage) {
                      return `<button type="button" data-ars-att-co="${coId}" data-ars-att-idx="${idx}" style="${baseStyle}" onmouseover="this.style.background='var(--surface)';this.style.borderColor='var(--brd2)'" onmouseout="this.style.background='var(--bg)';this.style.borderColor='var(--brd)'">${inner}</button>`;
                    }
                    return `<a href="${esc(url || '#')}" target="_blank" rel="noopener" style="${baseStyle}" onmouseover="this.style.background='var(--surface)';this.style.borderColor='var(--brd2)'" onmouseout="this.style.background='var(--bg)';this.style.borderColor='var(--brd)'">${inner}</a>`;
                  }).join('')}
                </div>
              </div>
            `;
          })()}

          ${(() => {
            if (!history.length) return '';
            // Dedupe: úttektir sometimes records the same kt twice for the
            // same inspection month (e.g. the customer had two work orders
            // that month). Collapse by year+skodun, keeping the entry with
            // a status if both exist.
            const seen = {};
            for (const h of history) {
              const key = String(h.year) + '|' + String(h.skodun || '');
              if (!seen[key] || (!seen[key].stada && h.stada)) seen[key] = h;
            }
            const rows = Object.values(seen).sort((a, b) => String(b.year).localeCompare(String(a.year)));
            return `
            <div>
              <div style="font-size:11px;font-weight:700;color:var(--ink2);text-transform:uppercase;margin-bottom:6px">📜 Saga <span style="color:var(--ink4);font-weight:500">(${rows.length})</span></div>
              <div style="display:flex;flex-direction:column;gap:4px">
                ${rows.map(h => `
                  <div style="background:var(--surface2);border:1px solid var(--brd);border-radius:6px;padding:6px 10px;display:flex;justify-content:space-between;gap:10px;align-items:center;font-size:11.5px">
                    <div><strong style="color:var(--ink1)">${esc(String(h.year))}</strong> <span style="color:var(--ink3)">${esc(h.skodun || '')}</span></div>
                    <div style="color:var(--ink2);font-size:11px">${esc((h.stada||'').replace(/_/g, ' ')) || ''}</div>
                  </div>
                `).join('')}
              </div>
            </div>`;
          })()}

          <div style="display:flex;gap:7px;flex-wrap:wrap;padding-top:8px;border-top:1px solid var(--brd)">
            <button class="_ars-go-fyrirt" type="button" style="flex:1;min-width:140px;padding:8px 12px;background:var(--brand);color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">🏢 Opna fyrirtæki</button>
            <button class="_ars-go-map" data-co-id="${c.id}" type="button" style="flex:1;min-width:140px;padding:8px 12px;background:var(--surface);color:var(--ink1);border:1px solid var(--brd2);border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">🗺️ Sjá á korti</button>
            <button class="_ars-go-brunakerfi" type="button" style="flex:1;min-width:140px;padding:8px 12px;background:var(--surface);color:#dc2626;border:1px solid #fca5a5;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">🚨 Brunakerfi</button>
            <button class="_ars-go-samningur" data-co-id="${c.id}" type="button" style="flex:1;min-width:140px;padding:8px 12px;background:var(--surface);color:var(--ink1);border:1px solid var(--brd2);border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">📑 Þjónustusamningur</button>
          </div>
        </div>
      </div>
    `;
    bg.addEventListener('click', e => {
      if (e.target === bg) bg.remove();
    });
    bg.querySelector('._ars-close').addEventListener('click', () => bg.remove());

    // 2026-07-23 (ósk Agnars): „Nýtt"-hak (fjólublátt) + skoðunarmánuður fyrir
    // fyrirtæki án skýrslu. Vistast í arsskodun_customers (nytt_manual + inspect_month).
    bg.querySelector('._ars-nytt-chk')?.addEventListener('change', async (e) => {
      const on = !!e.target.checked;
      try { await window.AppSettings.save({ arsskodun_customers: { [String(coId)]: { nytt_manual: on } } }); } catch (_) {}
      if (ars) ars.nytt_manual = on;
      try { ovrLog(coId, 'nytt_manual', on ? '—' : '🆕', on ? '🆕 Nýtt' : '↺ hreinsað'); } catch (_) {}
      bg.remove(); openDetail(coId);
    });
    bg.querySelector('._ars-nytt-month')?.addEventListener('change', async (e) => {
      const mv = parseInt(e.target.value, 10) || 0;
      const old = MONTHS_IS[(+ (ars && ars.inspect_month) || 0) - 1] || '—';
      try {
        await window.AppSettings.save({ arsskodun_customers: { [String(coId)]: mv ? { inspect_month: mv, inspect_month_manual: true } : { inspect_month: 0, inspect_month_manual: false } } });
      } catch (_) {}
      if (ars) { ars.inspect_month = mv; ars.inspect_month_manual = !!mv; }
      try { ovrLog(coId, 'inspect_month', old, MONTHS_IS[mv - 1] || '↺ hreinsað'); } catch (_) {}
    });
    // „🏢 + Staðsetning" — nýr staður á SÖMU kt (rekstrarfélag). Forfyllir kt+nafn
    // svo hann tengist sömu base sjálfkrafa (gegnum trigger) og geti ekki misritast.
    bg.querySelector('._ars-add-site')?.addEventListener('click', () => {
      const baseNafn = String(c.nafn || '').replace(/\s*[-–—].*$/, '').trim() || c.nafn || '';
      bg.remove();
      openNewCompanyDialog({
        title: '🏢 Bæta við staðsetningu',
        hint: 'Nýr staður undir <b>' + esc(c.nafn || '') + '</b> (sama kennitala → sama rekstrarfélag). Sláðu bara inn heimilisfangið; kt+nafn eru forfyllt og staðurinn tengist sjálfkrafa.',
        nafn: baseNafn + ' - ',
        kennitala: c.kennitala || '',
        heimilisfang: '',
      });
    });

    // Delegated click for storage-backed attachments (those rendered as
    // <button data-ars-att-co data-ars-att-idx> because they have a `path`
    // but no drive_url/drive_id). Fetch signed URL via patch 111 and open
    // in a new tab — never let it bubble up to whatever was eating clicks
    // and reloading the SPA.
    bg.addEventListener('click', async e => {
      const btn = e.target.closest('button[data-ars-att-co][data-ars-att-idx]');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const coId = +btn.dataset.arsAttCo;
      const idx  = +btn.dataset.arsAttIdx;
      const attsAll = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('company_attachments')) || {};
      const list = attsAll[String(coId)] || [];
      const sorted = list.slice().sort((a, b) => (+b.year || 0) - (+a.year || 0));
      const att = sorted[idx];
      if (!att || !att.path) return;
      const CA = window.CompanyAttachments;
      const url = CA && CA.getPublicUrl ? await CA.getPublicUrl(att.path) : null;
      if (!url) { alert('Gat ekki opnað skjalið.'); return; }
      window.open(url, '_blank', 'noopener');
    });

    // ── Contact info editing ────────────────────────────────────────────
    const infoView = bg.querySelector('._ars-info-view');
    const infoEdit = bg.querySelector('._ars-info-edit');
    const infoToggle = bg.querySelector('._ars-info-toggle');
    function setInfoMode(editing) {
      infoView.style.display = editing ? 'none' : '';
      infoEdit.style.display = editing ? '' : 'none';
      infoToggle.style.display = editing ? 'none' : '';
    }
    infoToggle.addEventListener('click', () => setInfoMode(true));
    bg.querySelector('._ars-info-cancel').addEventListener('click', () => setInfoMode(false));
    bg.querySelector('._ars-info-save').addEventListener('click', async () => {
      const patch = {};
      infoEdit.querySelectorAll('input[data-field]').forEach(i => {
        const f = i.dataset.field;
        const v = String(i.value || '').trim();
        // Only include fields that actually changed (null-vs-empty equivalence)
        if (v !== String(c[f] || '').trim()) patch[f] = v || null;
      });
      // Skoðunarmánuður — handvirkt val vistast í arsskodun_customers blobið
      // (AppSettings) og VINNUR yfir skýrslu-mánuðinn (inspect_month_manual).
      let monthChanged = false;
      const mSel = infoEdit.querySelector('._ars-month-edit');
      if (mSel) {
        const mv = parseInt(mSel.value, 10) || 0;
        if (mv !== (+ars.inspect_month || 0)) {
          monthChanged = true;
          try {
            // Vista AÐEINS þennan reit með 0/false sentinel við hreinsun. Áður var
            // `delete` keyrt á LIFANDI blob úr AppSettings.path(); deep-merge getur
            // ekki eytt lykli svo mánuðurinn kom aftur við endurhleðslu (fix
            // 2026-08-22, save-audit F3). Sama leið og hreinsun á línu ~1189.
            const patch = (mv >= 1 && mv <= 12)
              ? { inspect_month: mv, inspect_month_manual: true }
              : { inspect_month: 0, inspect_month_manual: false };
            if (window.AppSettings && AppSettings.save) await AppSettings.save({ arsskodun_customers: { [String(coId)]: patch } });
            ovrLog(coId, 'inspect_month', MONTHS_IS[(+ars.inspect_month || 0) - 1] || '—', MONTHS_IS[mv - 1] || '↺ hreinsað');
            ars.inspect_month = mv || undefined;
          } catch (e) { alert('Mánuður vistaðist ekki: ' + (e.message || e)); }
        }
      }
      if (!Object.keys(patch).length) {
        if (monthChanged) { bg.remove(); loadAll().then(render); return; }
        setInfoMode(false); return;
      }
      const SB = getSB();
      if (!SB) { alert('Engin tenging við gagnagrunn'); return; }
      const _oldNafn = (c.nafn || '').trim();
      const { error } = await SB.from('fyrirtaeki').update(patch).eq('id', coId);
      if (error) { alert('Vista mistókst: ' + error.message); return; }
      // 2026-08-13 — LÁTA NAFNBREYTINGU FYLGJA TÆKJUNUM (sama og 14-companies-
      // openedit.js:178). Þetta breytingarform getur breytt `nafn` og tækin
      // (uttaeki/lanstaeki) tengjast fyrirtækinu AÐEINS gegnum client-nafnið.
      if (patch.nafn && _oldNafn && patch.nafn !== _oldNafn) {
        for (const tafla of ['uttaeki', 'lanstaeki']) {
          try {
            const cc = await SB.from(tafla).update({ client: patch.nafn }).eq('client', _oldNafn);
            if (cc && cc.error) console.warn('[153] cascade ' + tafla + ':', cc.error.message);
          } catch (e) { console.warn('[153] cascade ' + tafla + ':', e && e.message); }
        }
        try { if (window.DB && DB.refresh) DB.refresh(); } catch (_) {}
      }
      // Update local cache + close modal & re-render
      Object.assign(c, patch);
      Object.assign(_cache.byId[coId] || {}, patch);
      const inList = _cache.list.find(x => x.id === coId);
      if (inList) Object.assign(inList, patch);
      bg.remove();
      render();
    });

    // ── Equipment editing ──────────────────────────────────────────────
    const eqGrid = bg.querySelector('._ars-eq-grid');
    const eqToggle = bg.querySelector('._ars-eq-toggle');
    const eqActions = bg.querySelector('._ars-eq-actions');
    function setEqMode(editing) {
      eqGrid.querySelectorAll('._ars-eq-val').forEach(el => el.style.display = editing ? 'none' : '');
      eqGrid.querySelectorAll('._ars-eq-input').forEach(el => el.style.display = editing ? '' : 'none');
      eqActions.style.display = editing ? 'flex' : 'none';
      eqToggle.style.display = editing ? 'none' : '';
    }
    // 📧 Póstsamskipti — sækja úr email_digest og teikna í _ars-postur boxið.
    (async () => {
      const box = bg.querySelector('#_ars-postur');
      if (!box) return;
      const bodyEl = box.querySelector('._ars-post-body');
      const listEl = box.querySelector('._ars-post-list');
      const aiBtn = box.querySelector('._ars-post-ai');
      const moreBtn = box.querySelector('._ars-post-more');
      const SB = (window.DB && DB.sb) || null;
      if (!SB) { bodyEl.textContent = 'Póstgrunnur ekki tiltækur'; return; }
      const nf = String(c.netfang || '').trim().toLowerCase();
      const ktDash = (() => { const d = String(c.kennitala || '').replace(/\D/g, ''); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : ''; })();
      let msgs = [];
      try {
        const seen = new Set();
        const add = r => { (r && r.data || []).forEach(m => { if (!seen.has(m.id)) { seen.add(m.id); msgs.push(m); } }); };
        const COLS = 'id,account,folder,sender_name,sender_email,to_addresses,subject,snippet,body_preview,received_at';
        if (nf) {
          add(await SB.from('email_digest').select(COLS).or('sender_email.eq.' + nf + ',to_addresses.ilike.%' + nf + '%').order('received_at', { ascending: false }).limit(30));
        }
        if (ktDash) {
          add(await SB.from('email_digest').select(COLS).or('subject.ilike.%' + ktDash + '%,body_preview.ilike.%' + ktDash + '%').order('received_at', { ascending: false }).limit(15));
        }
        msgs.sort((a, b) => String(b.received_at).localeCompare(String(a.received_at)));
      } catch (e) { bodyEl.textContent = 'Villa við póstleit: ' + (e.message || e); return; }
      if (!msgs.length) {
        bodyEl.innerHTML = '<span style="color:#64748b;font-style:italic">Engin póstsamskipti fundust' + (nf ? '' : ' — ekkert netfang skráð á fyrirtækið') + '</span>';
        return;
      }
      const dirTag = m => (m.folder === 'SENT')
        ? '<span style="background:#dcfce7;color:#15803d;border-radius:99px;padding:0 7px;font-size:10px;font-weight:700">↗ Sent</span>'
        : '<span style="background:#e0f2fe;color:#0369a1;border-radius:99px;padding:0 7px;font-size:10px;font-weight:700">↘ Móttekið</span>';
      const dt = m => esc(String(m.received_at || '').slice(0, 10));
      const latest = msgs[0];
      bodyEl.innerHTML =
        '<div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap">' + dirTag(latest) +
          '<span style="font-weight:700">' + esc(latest.subject || '(ekkert efni)') + '</span>' +
          '<span style="color:#64748b;font-size:11px">' + dt(latest) + ' · ' + esc(latest.sender_email || '') + '</span></div>' +
        '<div style="margin-top:4px;color:#334155;font-size:11.5px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">' + esc(latest.snippet || latest.body_preview || '') + '</div>';
      moreBtn.style.display = ''; moreBtn.textContent = '▼ Öll sagan (' + msgs.length + ')';
      aiBtn.style.display = '';
      let open = false;
      moreBtn.addEventListener('click', () => {
        open = !open;
        listEl.style.display = open ? 'flex' : 'none';
        moreBtn.textContent = (open ? '▲ Fela' : '▼ Öll sagan (' + msgs.length + ')');
        if (open && !listEl.childElementCount) {
          listEl.innerHTML = msgs.map((m, i) =>
            '<div class="_ars-post-row" data-i="' + i + '" style="background:var(--surface,#fff);border:1px solid #bae6fd;border-radius:7px;padding:6px 9px;cursor:pointer">' +
              '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:11.5px">' + dirTag(m) +
                '<span style="font-weight:700;color:#0c4a6e">' + esc(m.subject || '(ekkert efni)') + '</span>' +
                '<span style="color:#64748b;font-size:10.5px">' + dt(m) + ' · ' + esc(m.sender_email || '') + '</span></div>' +
              '<div class="_ars-post-full" style="display:none;margin-top:4px;font-size:11.5px;color:#334155;white-space:pre-wrap;line-height:1.5"></div>' +
            '</div>').join('');
          listEl.querySelectorAll('._ars-post-row').forEach(row => row.addEventListener('click', () => {
            const full = row.querySelector('._ars-post-full');
            const m = msgs[+row.dataset.i];
            if (full.style.display === 'none') { full.textContent = m.body_preview || m.snippet || '(ekkert innihald í grunni)'; full.style.display = ''; }
            else full.style.display = 'none';
          }));
        }
      });
      aiBtn.addEventListener('click', async () => {
        aiBtn.disabled = true; aiBtn.textContent = '⏳…';
        try {
          const ctxt = msgs.slice(0, 6).map(m => dt(m) + ' ' + (m.folder === 'SENT' ? '[VIÐ SENDUM]' : '[ÞEIR SENDU]') + ' ' + (m.subject || '') + ': ' + String(m.snippet || m.body_preview || '').slice(0, 220)).join(' | ');
          const r = await fetch('/api/tv-summary', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [{ id: 'p', customer_nafn: c.nafn, type: 'samskipti', title: 'Samantekt á póstsamskiptum — hver er staðan?', notes: ctxt }] }) });
          const d = await r.json();
          const s = d && d.summaries && d.summaries.p;
          if (s) bodyEl.insertAdjacentHTML('afterbegin', '<div style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:5px 9px;margin-bottom:6px;font-size:11.5px;color:#713f12"><b>✨ AI:</b> ' + esc(s) + '</div>');
          else throw new Error((d && d.error) || 'ekkert svar');
        } catch (e) { alert('AI-samantekt mistókst: ' + (e.message || e)); }
        finally { aiBtn.disabled = false; aiBtn.textContent = '✨ AI-samantekt'; }
      });
    })();

    // 2026-07-17: eyða gamalli áminningu (innfluttur texti úr skuldunautaskrá
    // sem enginn ritill náði til — „get ekki eytt af prófílnum").
    const aminDel = bg.querySelector('._ars-amin-del');
    if (aminDel) aminDel.addEventListener('click', async () => {
      if (!confirm('Eyða áminningunni af þessu fyrirtæki?')) return;
      const ok = (window.AppSettings && AppSettings.save)
        ? await AppSettings.save({ [STORAGE_KEY]: { [String(coId)]: { aminning: '' } } })
        : false;
      if (ok) { aminDel.closest('div[style*="fffbeb"]').remove(); render(); }
      else alert('Vistun mistókst — reyndu aftur');
    });
    eqToggle.addEventListener('click', () => setEqMode(true));
    bg.querySelector('._ars-eq-cancel').addEventListener('click', () => setEqMode(false));
    // ⚡ Lagfæringar-hamur: opnað beint úr Tæki-reit listans → tækjahlutinn
    // strax í breytingaham og skrunað að honum (endurnýtir setEqMode — enginn
    // annar tækjaritill).
    if (opts.eqEdit) {
      setEqMode(true);
      setTimeout(() => { try { eqGrid.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (_) {} }, 60);
    }
    bg.querySelector('._ars-eq-save').addEventListener('click', async () => {
      const newEq = {};
      eqGrid.querySelectorAll('._ars-eq-input').forEach(i => {
        newEq[i.dataset.eq] = Math.max(0, parseInt(i.value, 10) || 0);
      });
      // Save to AppSettings.arsskodun_customers[coId].equipment
      if (!window.AppSettings || !window.AppSettings.save) {
        alert('Engar stillingar tiltækar'); return;
      }
      const allMap = (window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || {};
      const entry = Object.assign({}, allMap[String(coId)] || {});
      entry.co_id = coId;
      entry.equipment = newEq;
      // 2026-07-16 (Lagfæringar-hamur): handvirk tala vinnur yfir uttaeki-
      // afleiðsluna OG skýrslu-facts í loadAll (sama mynstur og inspect_month_manual).
      entry.equipment_manual = true;
      // 2026-06: use the SAME canonical pricing as the list card
      // (loadYfirferdPrices — yfirferð + hleðsla × VSK per category) so the
      // detail estimate can never diverge from the card again. Single source
      // of truth — no separate yfirferð-only formula + add-ons.
      const PRICES = await loadYfirferdPrices(window.DB && window.DB.sb);
      let total = 0;
      for (const k in newEq) {
        const qty = +newEq[k] || 0;
        if (!qty) continue;
        total += qty * (PRICES[k] != null ? PRICES[k] : (PRICES.annad || 0));
      }
      if (total > 0) total += SKYRSLUGERD + AKSTUR_UNIT * (+entry.akstur_multiplier || 1);
      entry.estimated_yearly = Math.round(total);
      // RACE-vörn (sama og _ars-tu-toggle 2026-07-15): skrifa AÐEINS þessa
      // færslu — AppSettings.save djúp-merge-ar, svo aðrar raðir haldast.
      const ok = await window.AppSettings.save({ [STORAGE_KEY]: { [String(coId)]: entry } });
      if (!ok) { alert('Vista mistókst'); return; }
      ovrLog(coId, 'equipment', JSON.stringify((c._ars && c._ars.equipment) || {}), JSON.stringify(newEq));
      // Update local cache + redraw page so the card reflects new counts
      if (c._ars) { c._ars.equipment = newEq; c._ars.estimated_yearly = entry.estimated_yearly; c._ars.equipment_manual = true; }
      bg.remove();
      render();
    });
    // ↺ Hreinsa tækja-yfirskrift — skýrslu-/tækjagögnin flæða aftur.
    bg.querySelector('._ars-eq-clearovr')?.addEventListener('click', async () => {
      const ok = (window.AppSettings && AppSettings.save)
        ? await AppSettings.save({ [STORAGE_KEY]: { [String(coId)]: { equipment_manual: false } } })
        : false;
      if (!ok) { alert('Vista mistókst'); return; }
      bg.remove();
      try { await loadAll(); } catch (_) {}
      render();
    });

    // ── Stök tæki: expand/collapse + per-unit soft-delete (status='urelt') ──
    const unitsToggle = bg.querySelector('._ars-units-toggle');
    const unitsListEl = bg.querySelector('._ars-units-list');
    if (unitsToggle && unitsListEl) {
      unitsToggle.addEventListener('click', () => {
        const open = unitsListEl.style.display !== 'none';
        unitsListEl.style.display = open ? 'none' : 'flex';
        const caret = bg.querySelector('._ars-units-caret');
        if (caret) caret.textContent = open ? '▸ Sýna / eyða' : '▾ Fela';
      });
    }
    bg.addEventListener('click', async e => {
      const delBtn = e.target.closest('._ars-unit-del');
      if (!delBtn) return;
      e.preventDefault();
      e.stopPropagation();
      const unitId = delBtn.dataset.unitId;
      const serial = delBtn.dataset.unitSerial || ('tæki #' + unitId);
      const cat = delBtn.dataset.unitCat;
      let ok;
      if (window.Confirm && typeof Confirm.show === 'function') {
        ok = await Confirm.show(
          'Eyða tækinu „' + serial + '" varanlega?\n\nTækið og öll saga þess er fjarlægð úr kerfinu. Þetta er EKKI afturkræft.',
          { danger: true, okText: 'Eyða' }
        );
      } else {
        ok = confirm('Eyða tækinu "' + serial + '" varanlega? Þetta er EKKI afturkræft.');
      }
      if (!ok) return;
      const SB = window.DB && window.DB.sb;
      if (!SB) { alert('Engin gagnabankatenging'); return; }
      delBtn.disabled = true;
      const prevTxt = delBtn.textContent; delBtn.textContent = '…';
      try {
        // Hard delete. uttaeki.id is referenced by taeki_events.unit_id +
        // skodunar_saga.unit_id (FK, no cascade) — clear the children first or
        // the delete throws "violates foreign key constraint".
        const _ce = await Promise.all([
          SB.from('taeki_events').delete().eq('unit_id', unitId),
          SB.from('skodunar_saga').delete().eq('unit_id', unitId)
        ]);
        const _cerr = _ce.find(x => x && x.error);
        if (_cerr) throw _cerr.error;
        const r = await SB.from('uttaeki').delete().eq('id', unitId);
        if (r.error) throw r.error;
      } catch (err) {
        alert('Tókst ekki að eyða: ' + (err.message || err));
        delBtn.disabled = false; delBtn.textContent = prevTxt;
        return;
      }
      if (window.Toast && Toast.show) Toast.show('🗑 Tæki „' + serial + '" eytt');
      // Anti-flash: drop from the DB unit cache if present.
      try {
        if (window.DB && DB.cache && Array.isArray(DB.cache.units)) {
          const i = DB.cache.units.findIndex(u => String(u.id) === String(unitId));
          if (i >= 0) DB.cache.units.splice(i, 1);
        }
      } catch (_) {}
      // In-place modal update so the user can keep deleting without a flash.
      const row = delBtn.closest('._ars-unit-row');
      if (row) row.remove();
      const remaining = bg.querySelectorAll('._ars-unit-row').length;
      const cntEl = bg.querySelector('._ars-units-count');
      if (cntEl) cntEl.textContent = '(' + remaining + ')';
      const eqTotalEl = bg.querySelector('._ars-eq-total');
      if (eqTotalEl) {
        const n = Math.max(0, (parseInt((eqTotalEl.textContent.match(/\d+/) || ['0'])[0], 10) || 0) - 1);
        eqTotalEl.textContent = '(' + n + ' alls)';
      }
      if (cat) {
        const cell = bg.querySelector('[data-eq-cell="' + cat + '"]');
        if (cell) {
          const valEl = cell.querySelector('._ars-eq-val');
          const inp = cell.querySelector('._ars-eq-input');
          const nv = Math.max(0, (parseInt((valEl && valEl.textContent) || '0', 10) || 0) - 1);
          if (valEl) valEl.textContent = nv || '·';
          if (inp) inp.value = nv;
        }
      }
      // Refresh underlying data + background list. The modal lives on
      // document.body, so render() (which only rewrites #ars-main) keeps it open.
      try { await loadAll(); render(); } catch (_) {}
    });

    bg.querySelector('._ars-go-fyrirt').addEventListener('click', () => {
      bg.remove();
      if (window._openCompanySafe) window._openCompanySafe(coId);
      else if (window.App && App.switchView) App.switchView('companies');
    });
    bg.querySelector('._ars-go-map').addEventListener('click', () => {
      // Switch view FIRST, then remove modal — bg.remove() can trigger
      // MutationObservers that re-render Ársskoðun and steal focus back.
      openOnMap(coId);
      bg.remove();
    });
    bg.querySelector('._ars-go-brunakerfi').addEventListener('click', () => {
      bg.remove();
      if (window.App && App.switchView) App.switchView('brunakerfi');
    });
    // 2026-05-31: open the prefilled Þjónustusamningur (aðal) template for this
    // company, same as the company-detail page button.
    const _samnBtn = bg.querySelector('._ars-go-samningur');
    if (_samnBtn) _samnBtn.addEventListener('click', () => {
      bg.remove();
      if (window.DocTemplates && DocTemplates.openForCompany) DocTemplates.openForCompany(coId);
    });
    document.body.appendChild(bg);
  }

  // ── New-company dialog ───────────────────────────────────────────────────
  // Lightweight inline form: nafn + kennitala + heimilisfang + sími + netfang.
  // Saves directly into fyrirtaeki (no Ársskoðun data — they can edit it
  // afterwards from the detail modal). Reloads the list on success.
  // prefill (valfrjálst): { nafn, kennitala, heimilisfang, title, hint }
  // Notað af „+ Bæta við staðsetningu" til að forfylla kt+nafn svo nýr staður
  // tengist sömu base sjálfkrafa (gegnum trigger) og geti ekki mis-tengst.
  function openNewCompanyDialog(prefill) {
    prefill = prefill || {};
    document.querySelectorAll('._ars-modal-bg').forEach(n => n.remove());
    const bg = document.createElement('div');
    bg.className = '_ars-modal-bg';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:9999;display:flex;align-items:flex-start;justify-content:center;padding:60px 16px;overflow-y:auto';
    bg.innerHTML = `
      <div style="background:var(--surface);border-radius:14px;max-width:520px;width:100%;box-shadow:0 25px 60px rgba(0,0,0,0.4);overflow:hidden">
        <div style="padding:14px 18px;border-bottom:1px solid var(--brd);display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:16px;font-weight:700;color:var(--ink1)">${prefill.title || '+ Nýtt fyrirtæki'}</div>
          <button class="_ars-new-close" type="button" style="background:transparent;border:none;font-size:24px;color:var(--ink4);cursor:pointer;line-height:1;padding:0 4px">×</button>
        </div>
        <div style="padding:18px;display:flex;flex-direction:column;gap:10px">
          ${prefill.hint ? `<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 11px;font-size:12.5px;color:#1e40af">${prefill.hint}</div>` : ''}
          <div style="position:relative">
            <label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--ink2);font-weight:700;text-transform:uppercase">🔍 Leita í fyrirtækjaskrá (RSK)
              <input class="_ars-rsk-q" placeholder="Nafn eða kennitala…" autocomplete="off" style="padding:8px 11px;border:1.5px solid #93c5fd;border-radius:7px;font:inherit;font-size:14px;color:var(--ink1);background:var(--surface);outline:none"/>
            </label>
            <div class="_ars-rsk-res" style="display:none;position:absolute;left:0;right:0;top:100%;z-index:10;background:var(--surface);border:1px solid var(--brd2);border-radius:8px;box-shadow:0 12px 30px rgba(0,0,0,.25);max-height:240px;overflow-y:auto"></div>
          </div>
          <label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--ink2);font-weight:700;text-transform:uppercase">Nafn *<input data-f="nafn" required style="padding:8px 11px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:14px;color:var(--ink1);background:var(--surface);outline:none"/></label>
          <label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--ink2);font-weight:700;text-transform:uppercase">Kennitala<input data-f="kennitala" placeholder="123456-7890" style="padding:8px 11px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:14px;color:var(--ink1);background:var(--surface);outline:none;font-family:monospace"/></label>
          <label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--ink2);font-weight:700;text-transform:uppercase">Heimilisfang<input data-f="heimilisfang" style="padding:8px 11px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:14px;color:var(--ink1);background:var(--surface);outline:none"/></label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--ink2);font-weight:700;text-transform:uppercase">Sími<input data-f="simi" style="padding:8px 11px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:14px;color:var(--ink1);background:var(--surface);outline:none"/></label>
            <label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--ink2);font-weight:700;text-transform:uppercase">Netfang<input data-f="netfang" type="email" style="padding:8px 11px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:14px;color:var(--ink1);background:var(--surface);outline:none"/></label>
          </div>
          <label style="display:flex;flex-direction:column;gap:3px;font-size:11px;color:var(--ink2);font-weight:700;text-transform:uppercase">Tengiliður<input data-f="tengiliður" style="padding:8px 11px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:14px;color:var(--ink1);background:var(--surface);outline:none"/></label>
          <div class="_ars-new-err" style="color:#dc2626;font-size:12px;display:none"></div>
          <div style="display:flex;gap:8px;margin-top:6px">
            <button class="_ars-new-save" type="button" style="flex:1;padding:9px 14px;background:#15803d;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">💾 Vista</button>
            <button class="_ars-new-cancel" type="button" style="padding:9px 14px;background:var(--surface);color:var(--ink2);border:1px solid var(--brd2);border-radius:8px;cursor:pointer;font:inherit;font-size:13px">Hætta við</button>
          </div>
        </div>
      </div>
    `;
    bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });
    bg.querySelector('._ars-new-close').addEventListener('click', () => bg.remove());
    bg.querySelector('._ars-new-cancel').addEventListener('click', () => bg.remove());
    // Forfylla úr prefill (t.d. „+ Bæta við staðsetningu" → kt+nafn frá sama félagi)
    ['nafn', 'kennitala', 'heimilisfang'].forEach(f => {
      if (prefill[f] != null) { const el = bg.querySelector('input[data-f="' + f + '"]'); if (el) el.value = prefill[f]; }
    });
    // Ef kt er forfyllt → fókusa á heimilisfang (það eina sem eftir er að slá inn)
    const focusF = prefill.kennitala ? 'heimilisfang' : 'nafn';
    setTimeout(() => { const el = bg.querySelector('input[data-f="' + focusF + '"]'); if (el) el.focus(); }, 50);

    // ── RSK-leit (verkefni 5bc7106c, 2026-07-14) ──────────────────────────
    // Nafn eða kt → /api/kt-lookup (?nafn= listar úr fyrirtækjaskrá, ?kt= flettir
    // upp einni). Smellur á niðurstöðu fyllir Nafn + Kennitala + Heimilisfang.
    (() => {
      const q = bg.querySelector('._ars-rsk-q');
      const res = bg.querySelector('._ars-rsk-res');
      if (!q || !res) return;
      let t = null, seq = 0;
      const fill = (r) => {
        const set = (f, v) => { const el = bg.querySelector('input[data-f="' + f + '"]'); if (el && v) el.value = v; };
        set('nafn', r.nafn);
        set('kennitala', r.kennitala ? r.kennitala.replace(/^(\d{6})(\d{4})$/, '$1-$2') : '');
        set('heimilisfang', r.heimilisfang_full || r.heimilisfang || '');
        res.style.display = 'none';
        q.value = r.nafn || q.value;
      };
      const show = (items, note) => {
        if (!items.length && !note) { res.style.display = 'none'; return; }
        res.innerHTML = (note ? '<div style="padding:8px 11px;font-size:12px;color:var(--ink4)">' + note + '</div>' : '') +
          items.map((r, i) =>
            '<button type="button" class="_ars-rsk-hit" data-i="' + i + '" style="display:block;width:100%;text-align:left;padding:8px 11px;background:transparent;border:none;border-bottom:1px solid var(--brd);cursor:pointer;font:inherit">' +
              '<div style="font-size:13px;font-weight:600;color:var(--ink1)">' + esc(r.nafn || '') + '</div>' +
              '<div style="font-size:11.5px;color:var(--ink4);font-family:monospace">' + esc(r.kennitala || '') + '</div>' +
              (r.heimilisfang_full ? '<div style="font-size:11.5px;color:var(--ink3)">' + esc(r.heimilisfang_full) + '</div>' : '') +
            '</button>').join('');
        res.style.display = 'block';
        res.querySelectorAll('._ars-rsk-hit').forEach(b => b.addEventListener('click', () => fill(items[+b.dataset.i])));
      };
      q.addEventListener('input', () => {
        clearTimeout(t);
        const val = q.value.trim();
        const digits = val.replace(/[^0-9]/g, '');
        if (val.length < 2) { res.style.display = 'none'; return; }
        t = setTimeout(async () => {
          const mySeq = ++seq;
          show([], '⏳ Leita í RSK…');
          try {
            let items = [];
            if (digits.length === 10) {
              const r = await fetch('/api/kt-lookup?kt=' + digits);
              if (r.ok) { const d = await r.json(); if (d && d.nafn) items = [d]; }
            } else {
              const r = await fetch('/api/kt-lookup?nafn=' + encodeURIComponent(val));
              if (r.ok) { const d = await r.json(); items = (d && d.results) || []; }
            }
            if (mySeq !== seq) return;
            show(items, items.length ? '' : 'Ekkert fannst í fyrirtækjaskrá');
          } catch (_) {
            if (mySeq === seq) show([], '⚠ Leit mistókst');
          }
        }, 450);
      });
      bg.addEventListener('click', e => { if (!e.target.closest('._ars-rsk-q') && !e.target.closest('._ars-rsk-res')) res.style.display = 'none'; });
    })();
    bg.querySelector('._ars-new-save').addEventListener('click', async () => {
      const errEl = bg.querySelector('._ars-new-err');
      errEl.style.display = 'none';
      const data = {};
      bg.querySelectorAll('input[data-f]').forEach(i => {
        const v = String(i.value || '').trim();
        if (v) data[i.dataset.f] = v;
      });
      if (!data.nafn) {
        errEl.textContent = 'Nafn er nauðsynlegt.';
        errEl.style.display = 'block';
        return;
      }
      const SB = getSB();
      if (!SB) { errEl.textContent = 'Engin tenging við gagnagrunn.'; errEl.style.display = 'block'; return; }
      // Fyrirtæki stofnað HÉR (á þjónustu-síðunni) er þjónustukúnni → birtist strax
      // í listanum. (customer_base_id tengist sjálfkrafa í gagnagrunni gegnum
      // trigger `fyrirtaeki_autolink_base` — eftir kt, býr til base ef vantar.)
      data.er_i_thjonustu = true;
      const { data: rows, error } = await SB.from('fyrirtaeki').insert(data).select();
      if (error) {
        errEl.textContent = 'Vista mistókst: ' + error.message;
        errEl.style.display = 'block';
        return;
      }
      bg.remove();
      await loadAll();
      render();
      // Open the newly-created row's detail modal so user can keep editing
      if (rows && rows[0]) {
        setTimeout(() => openDetail(rows[0].id), 100);
      }
    });
    document.body.appendChild(bg);
  }

  // ── Map deep-link ────────────────────────────────────────────────────────
  // Switch to view-field (Þjónustutæki / Leaflet map) and pan-zoom to the
  // company's marker. Uses the window.MapFix.focusCompany helper exposed
  // by mapfix.js, which polls until the map + markers are ready.
  //
  // Failure modes (the helper returns { ok:false, reason:... }):
  //   • no-map      — Leaflet hasn't initialised yet (rare; view never opened)
  //   • no-marker   — Company has no cached geocoordinate; we toast the user
  //                   and link them to "Uppfæra" (the geocoding button).
  async function openOnMap(coId) {
    const co = _cache.byId[coId];
    if (!co) return;
    if (!window.App || !window.App.switchView) return;
    // 2026-05-19: Þjónustutæki (view-field) nav retired. Send users to
    // Leiðsögn instead — same Leaflet map, plus the route planner.
    window.App.switchView('leidsogn');
    // Leiðsögn doesn't expose a focus-by-id API yet; the marker for this
    // customer will be on the map. Add it to the route stack for the user.
    if (window.Leidsogn && typeof window.Leidsogn.addToRoute === 'function') {
      try { window.Leidsogn.addToRoute(coId); } catch (_) {}
    }
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  function boot() {
    injectSidebar();
    ensureView();
    patchSwitchView();
    // Re-run injection if sidebar gets rebuilt later (patch 68 reorders)
    setTimeout(injectSidebar, 1200);
    setTimeout(injectSidebar, 2500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose for debugging
  // loadAll exported 2026-06-12 so ÞjónustuVerkstæði (patch 190) can pull the
  // same live equipment counts + estimated yearly revenue per company.
  window.Arsskodun = { show, openDetail, openOnMap, _cache, render, loadAll, version: 'v1' };

  // Keep the cached priority in sync when the ❗ control is cycled (patch 175),
  // so sorting by ❗ stays correct. The ❗ button updates itself in place — no
  // re-render here (that reset scroll and made the list jump).
  // App-wide view-mode toggle (patch 166) → re-render THIS page live when it is
  // the active view, so flipping 📱/▦/🖥 in the banner switches the layout
  // instantly. Only re-renders when already rendered + visible (cheap no-op else).
  document.addEventListener('slokk-viewmode', () => {
    const v = document.getElementById(VIEW_ID);
    if (v && v.classList.contains('active') && _rendered) { try { render(); } catch (_) {} }
  });

  document.addEventListener('priority-changed', e => {
    const co = (_cache.list || []).find(x => String(x.id) === String(e.detail.coId));
    if (co) {
      co._ars = co._ars || {};
      if (e.detail.newPri > 0) co._ars.priority = e.detail.newPri;
      else delete co._ars.priority;
    }
  });
  console.log('[arsskodun] v1 ready');
})();
/* === END ÁRSSKOÐUN === */
