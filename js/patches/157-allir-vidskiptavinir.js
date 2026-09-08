/* === ALLIR VIÐSKIPTAVINIR v1 ===
 *
 * New "master customer list" view — every company in one place, with
 * service-subscription badges showing which contracts they hold.
 *
 * Concept (2026-05-18):
 *   The user has companies scattered across multiple views:
 *     • Fyrirtæki í Þjónustu  → 295 fyrirtækjaþjónusta contract customers
 *     • Brunakerfisþjónusta   → brunakerfi contract customers
 *     • Viðskiptavinir         → individuals (mined from work orders)
 *
 *   But customer base info lives in ONE table (fyrirtaeki). The other
 *   views are filtered slices. This patch surfaces the WHOLE customer
 *   base as a single page with service badges, so you can see at a
 *   glance who is in what contract — and so it's easy to find any
 *   customer regardless of which contract they're in.
 *
 *   Tonight's scope (additive, read-only):
 *     • New sidebar entry "Allir Viðskiptavinir"
 *     • Same card layout as Fyrirtæki í Þjónustu (preserved look)
 *     • Filter chips: Allir / Fyrirtækjaþj. / Brunakerfi / Án samnings
 *     • Search by name, kt, address, phone, email
 *     • Click card → opens existing company detail modal
 *
 *   Future (tomorrow eve+):
 *     • Buttons in the modal to register/unregister a customer for
 *       fyrirtækjaþjónusta or brunakerfi (writes to AppSettings)
 *     • Þjónustutæki reads its list from arsskodun_customers mark
 *     • Same for the brunakerfi workspace
 *
 *   What this patch DOESN'T touch:
 *     • Existing Viðskiptavinir nav stays as-is (individuals fallback)
 *     • No changes to Þjónustutæki, Fyrirtæki í Þjónustu, or Brunakerfi
 *     • No writes to any data — fully read-only
 */
(() => {
  if (window.__allirVidskInstalled) return;
  window.__allirVidskInstalled = true;

  const VIEW_ID  = 'view-allir-vidsk';
  const NAV_KEY  = 'allir-vidsk';
  const LS_FILT  = 'allir_vidsk_filter';
  const LS_SRCH  = 'allir_vidsk_search';
  const LS_VIEW  = 'allir_vidsk_view2';    // 'card' | 'list' (default list)
  const LS_SORT  = 'allir_vidsk_sort';     // 'nafn' | 'nafn-desc' | 'kt' | 'newest' | 'units'
  const LS_XFILT = 'allir_vidsk_xfilter';  // extra filter — comma-separated of:
                                           //   has-email | has-gps | no-address

  // 2026-05-29: search term is no longer persisted — always start blank.
  try { localStorage.removeItem(LS_SRCH); } catch (_) {}
  const state = {
    filter:  localStorage.getItem(LS_FILT)  || 'all',
    search:  '',
    view:    localStorage.getItem(LS_VIEW)  || 'list',
    sort:    localStorage.getItem(LS_SORT)  || 'nafn',
    xfilter: (localStorage.getItem(LS_XFILT) || '').split(',').filter(Boolean),
    editId:  null,           // transient: company row currently in inline-edit mode
    selectMode: false,       // transient: bulk-select toolbar on/off
    selected: new Set()      // transient: ids picked in select mode
  };
  function saveState() {
    localStorage.setItem(LS_FILT,  state.filter);
    localStorage.setItem(LS_VIEW,  state.view);
    localStorage.setItem(LS_SORT,  state.sort);
    localStorage.setItem(LS_XFILT, state.xfilter.join(','));
  }

  // ── Helpers ────────────────────────────────────────────────────────────
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }
  function fmtKt(kt) {
    const s = String(kt || '').replace(/\D/g, '');
    return s.length === 10 ? s.slice(0,6) + '-' + s.slice(6) : (kt || '');
  }

  // ── Data ───────────────────────────────────────────────────────────────
  // ── Document counter (samningur / úttektarskýrslur / reikningar) ───────────
  // Surfaces, per company, which service documents are on file so you can spot
  // — while scrolling — who is still missing docs. Keyed customer_base_id
  // (fyrirtaeki carries it) → customer_doc_status, kennitala as fallback.
  let _docByBase = new Map(), _docByKt = new Map(), _docLoaded = false;
  const _normKt = s => String(s == null ? '' : s).replace(/\D/g, '');

  // Per-company, per-year document sets — for the "has docs in 2023/24/25/26" filter.
  let _docYearsByBase = new Map(), _docYearsByFyrirtaeki = new Map(), _docYearsLoaded = false;
  // Parallel maps scoped to doc_type='uttektarskyrsla' only — for the úttektarskýrsla 2025/26 chips.
  let _uttektYearsByBase = new Map(), _uttektYearsByFyrirtaeki = new Map();
  // 07.09.2026 (Agnar): „sýna hvenær síðasta úttektarskýrsla eða úttektar-reikningur var gerð —
  // hvaða ár". Síðasta ár per STAÐ (fyrirtaeki_id — aldrei kennitala, sbr. villuleit/systkini-kt);
  // customer_base_id aðeins til vara þegar staðurinn á ekkert skjal með fyrirtaeki_id, og þá
  // merkt „kt" svo röðin sýni strikaðan ramma. Skýrsla = customer_documents uttektarskyrsla.
  // Reikningur = customer_documents reikningur (vidskiptategund uttekt/null) ∪ uttekt_reikningur_facts
  // (sama heimild og Fyrirtæki í þjónustu / v_uttekt_ar) ∪ solur (vidskiptategund=uttekt, final).
  let _lastRepByF = new Map(), _lastRepByBase = new Map(), _lastInvByF = new Map(), _lastInvByBase = new Map();
  // Reikningar flokkaðir per stað: u = úttektarreikningar (vidskiptategund uttekt/∅) · b = búðarkaup (bud) · o = óvisst/annað.
  let _reikCntByF = new Map(), _reikCntByBase = new Map();
  async function loadDocYears() {
    if (!window.DB || !window.DB.fetchAll || !window.DB.sb) return;
    try {
      const data = await window.DB.fetchAll((from, to) =>
        window.DB.sb.from('customer_documents')
          .select('customer_base_id,fyrirtaeki_id,year,doc_type,is_duplicate,vidskiptategund')
          .range(from, to)
      );
      _docYearsByBase = new Map(); _docYearsByFyrirtaeki = new Map();
      _uttektYearsByBase = new Map(); _uttektYearsByFyrirtaeki = new Map();
      _lastRepByF = new Map(); _lastRepByBase = new Map(); _lastInvByF = new Map(); _lastInvByBase = new Map();
      _reikCntByF = new Map(); _reikCntByBase = new Map();
      (data || []).forEach(r => {
        const yr = +r.year || 0;
        if (r.is_duplicate === true) return;   // tvítök telja hvergi (sama regla og v_uttekt_ar)
        const dt = (r.doc_type || '').toLowerCase();
        const isUttekt = dt.startsWith('uttekt');
        // 07.09.2026 (Agnar): „aðskilja búðarkaup frá úttektar-invoicum" — R/B/? í Skjöl-pillunum.
        // Regla hans: reikningur með „Akstur" innan í er úttektarreikningur; skjalagrunnurinn ber þá
        // flokkun í vidskiptategund, sölur appsins fara gegnum v_solur_uttektarreikningar (sama regla).
        if (dt === 'reikningur') {
          const cat = (r.vidskiptategund == null || r.vidskiptategund === 'uttekt') ? 'u' : r.vidskiptategund === 'bud' ? 'b' : 'o';
          const cnt = (map, k) => { const o = map.get(k) || { u: 0, b: 0, o: 0 }; o[cat]++; map.set(k, o); };
          if (r.fyrirtaeki_id != null) cnt(_reikCntByF, String(r.fyrirtaeki_id));
          if (r.customer_base_id != null) cnt(_reikCntByBase, String(r.customer_base_id));
        }
        if (!yr) return;                        // árlausir seðlar telja í fjölda en ekki í ár
        const isReik = dt === 'reikningur' && (r.vidskiptategund == null || r.vidskiptategund === 'uttekt');
        const bump = (map, k) => { if (yr > (map.get(k) || 0)) map.set(k, yr); };
        if (isUttekt) { if (r.fyrirtaeki_id != null) bump(_lastRepByF, String(r.fyrirtaeki_id)); if (r.customer_base_id != null) bump(_lastRepByBase, String(r.customer_base_id)); }
        if (isReik)   { if (r.fyrirtaeki_id != null) bump(_lastInvByF, String(r.fyrirtaeki_id)); if (r.customer_base_id != null) bump(_lastInvByBase, String(r.customer_base_id)); }
        if (r.customer_base_id != null) {
          const k = String(r.customer_base_id);
          if (!_docYearsByBase.has(k)) _docYearsByBase.set(k, new Set());
          _docYearsByBase.get(k).add(yr);
          if (isUttekt) {
            if (!_uttektYearsByBase.has(k)) _uttektYearsByBase.set(k, new Set());
            _uttektYearsByBase.get(k).add(yr);
          }
        }
        if (r.fyrirtaeki_id != null) {
          const k = String(r.fyrirtaeki_id);
          if (!_docYearsByFyrirtaeki.has(k)) _docYearsByFyrirtaeki.set(k, new Set());
          _docYearsByFyrirtaeki.get(k).add(yr);
          if (isUttekt) {
            if (!_uttektYearsByFyrirtaeki.has(k)) _uttektYearsByFyrirtaeki.set(k, new Set());
            _uttektYearsByFyrirtaeki.get(k).add(yr);
          }
        }
      });
      // Reikningsár líka úr uttekt_reikningur_facts og sölum appsins — allt á fyrirtaeki_id.
      const bumpF = (k, y) => { if (y > (_lastInvByF.get(k) || 0)) _lastInvByF.set(k, y); };
      await Promise.all([
        window.DB.fetchAll((from, to) => window.DB.sb.from('uttekt_reikningur_facts').select('fyrirtaeki_id,invoice_year').not('invoice_year', 'is', null).range(from, to))
          .then(rows => (rows || []).forEach(r => { if (r.fyrirtaeki_id != null && +r.invoice_year) bumpF(String(r.fyrirtaeki_id), +r.invoice_year); }))
          .catch(e => console.warn('[allir-vidsk] uttekt_reikningur_facts', e)),
        // v_solur_uttektarreikningar = final-sölur með vidskiptategund=uttekt EÐA línu með Akstur/Skýrslugerð (regla Agnars)
        window.DB.fetchAll((from, to) => window.DB.sb.from('v_solur_uttektarreikningar').select('customer_id,ar').range(from, to))
          .then(rows => (rows || []).forEach(r => { if (r.customer_id != null && +r.ar) bumpF(String(r.customer_id), +r.ar); }))
          .catch(e => console.warn('[allir-vidsk] v_solur_uttektarreikningar', e))
      ]);
      _docYearsLoaded = true;
    } catch (_) {}
  }
  // Síðasta ár skýrslu/reiknings fyrir röð: staður fyrst, kennitala (base) til vara — merkt via='kt'.
  function lastYearsFor(c) {
    const fid = String(c.id), base = c.customer_base_id != null ? String(c.customer_base_id) : null;
    const repF = _lastRepByF.get(fid) || 0, invF = _lastInvByF.get(fid) || 0;
    const rep = repF || (base && _lastRepByBase.get(base)) || 0;
    const inv = invF || (base && _lastInvByBase.get(base)) || 0;
    return { rep, inv, max: Math.max(rep, inv), repVia: repF ? 'stadur' : (rep ? 'kt' : ''), invVia: invF ? 'stadur' : (inv ? 'kt' : '') };
  }
  function docYearsFor(c) {
    const byBase = c.customer_base_id != null ? _docYearsByBase.get(String(c.customer_base_id)) : null;
    const byFyrirtaeki = _docYearsByFyrirtaeki.get(String(c.id));
    if (byBase && byFyrirtaeki) {
      const merged = new Set(byBase);
      byFyrirtaeki.forEach(y => merged.add(y));
      return merged;
    }
    return byBase || byFyrirtaeki || null;
  }
  function uttektYearsFor(c) {
    const byBase = c.customer_base_id != null ? _uttektYearsByBase.get(String(c.customer_base_id)) : null;
    const byFyrirtaeki = _uttektYearsByFyrirtaeki.get(String(c.id));
    if (byBase && byFyrirtaeki) {
      const merged = new Set(byBase);
      byFyrirtaeki.forEach(y => merged.add(y));
      return merged;
    }
    return byBase || byFyrirtaeki || null;
  }

  async function loadDocStatus() {
    const SB = (window.DB && window.DB.sb); if (!SB) return;
    try {
      const { data } = await SB.from('customer_doc_status')
        .select('customer_base_id,kennitala,has_samningur,uttektir,reikningar,total_docs');
      _docByBase = new Map(); _docByKt = new Map();
      (data || []).forEach(s => {
        const rec = { samningur: !!s.has_samningur, uttektir: +s.uttektir || 0, reikningar: +s.reikningar || 0, total: +s.total_docs || 0 };
        if (s.customer_base_id != null) _docByBase.set(String(s.customer_base_id), rec);
        const kt = _normKt(s.kennitala); if (kt) _docByKt.set(kt, rec);
      });
      _docLoaded = true;
    } catch (_) { /* view may be unavailable */ }
  }
  function docsFor(c) {
    const rec = (c.customer_base_id != null && _docByBase.get(String(c.customer_base_id))) || _docByKt.get(_normKt(c.kennitala)) || null;
    if (!rec) return null;
    // customer_doc_status er lögaðila-víð. Á fjölstaða-kt (Center/Pizzan)
    // málaði Ú11/R8 á hvert hótel sem ætti 0. Aðeins sýnt þegar kt/base á einn stað.
    const kt = _normKt(c.kennitala);
    const list = (window.Companies && Companies.list) || [];
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const x = list[i];
      if (c.customer_base_id != null && x.customer_base_id === c.customer_base_id) n++;
      else if (kt && _normKt(x.kennitala) === kt) n++;
    }
    if (n > 1) return null;
    return rec;
  }

  // Bank-import-only payer rows (PR1 / framhald 48A): fyrirtaeki flagged
  // is_bank_only — no kt, no tæki, no samningur, just a name + bank note. They
  // inflated "Allir" + "Vantar skjöl", so they're hidden from every view except
  // the dedicated "Greiðendur (bank)" filter. Reversible (the flag, not delete).
  let _bankOnlyIds = new Set(), _bankLoaded = false;
  /* „Hide mode" (Agnar 08.09.2026: „getur kannski sett þau í hálfgert hide mode.
     allt sem er smá óvissa með. filter."). Sama hugsun og bank-only: fyrirtæki
     sem EKKERT tengist — hvorki tæki, sala, skjal né skýrsla — eru falin úr
     venjulegum sýnum en lifa í sinni eigin síu með ÁSTÆÐU skráðri í
     `ovisst_astaeda`. Þetta er ekki rusl: 173 raðir úr listainnflutningum,
     flestar með gildri kennitölu og heimilisfangi, og 108 á höfuðborgarsvæðinu.
     Þær eru mögulegir kúnnar — sjá docs/FACT-CHECK-YFIRFERD.md. Aldrei eyðing. */
  let _ovissIds = new Set();
  async function loadBankOnly() {
    const SB = (window.DB && window.DB.sb); if (!SB) return;
    try {
      const { data } = await SB.from('fyrirtaeki').select('id').eq('is_bank_only', true);
      _bankOnlyIds = new Set((data || []).map(r => +r.id));
      _bankLoaded = true;
    } catch (_) { /* column may not exist yet on older deploys */ }
    try {
      // Pögun skylda: ópöguð fyrirspurn þegir við 1000 raðir og þá lækju
      // faldar raðir aftur inn í „Allir" án þess að nokkur tæki eftir því.
      const rows = await window.DB.fetchAll(function (from, to) {
        return SB.from('fyrirtaeki').select('id').eq('ovisst', true).order('id').range(from, to);
      });
      _ovissIds = new Set((rows || []).map(r => +r.id));
    } catch (_) { /* dálkurinn kann að vanta á eldri deploy */ }
  }
  function docPill(text, ok, kind) {
    const st = kind === 'bud' ? 'color:#1d4ed8;background:#eef3ff;border:1px solid #c6d6ff;'
      : ok ? 'color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0;' : 'color:#5b6472;background:#eef1f6;border:1px solid #d7dde6;';
    return '<span style="display:inline-block;padding:1px 5px;border-radius:5px;font-size:10px;font-weight:700;' + st + '">' + text + '</span>';
  }
  // Reikningaflokkun fyrir röð: staður fyrst, kennitala (base) til vara — sama mynstur og lastYearsFor.
  function reikCntFor(c) {
    return _reikCntByF.get(String(c.id)) || (c.customer_base_id != null ? _reikCntByBase.get(String(c.customer_base_id)) : null) || null;
  }
  function docBadge(c) {
    const d = c._docs, rc = c._reik;
    if (!d && !rc) return '<span style="color:#8891a0;font-size:11px">—</span>';
    const sam = !!(d && d.samningur), utt = d ? (+d.uttektir || 0) : 0;
    // R = úttektarreikningar · B = búðarkaup · ? = óvisst — 07.09.2026 (Agnar: „aðskilja búðarkaup frá úttektar-invoicum")
    const reik = rc
      ? docPill('R' + rc.u, rc.u > 0) + (rc.b ? docPill('B' + rc.b, true, 'bud') : '') + (rc.o ? docPill('?' + rc.o, false) : '')
      : docPill('R' + (d ? (+d.reikningar || 0) : 0), !!(d && d.reikningar > 0));
    return '<span style="display:inline-flex;gap:3px;white-space:nowrap" title="Samningur · Úttektarskýrslur · R = úttektarreikningar · B = búðarkaup · ? = óvisst">' +
      docPill('S' + (sam ? '✓' : '✗'), sam) +
      docPill('Ú' + utt, utt > 0) +
      reik + '</span>';
  }

  function getAll() {
    const companies = (window.Companies && Companies.list) || [];
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || {};
    const brunMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('brunakerfi_customers')) || {};
    // Ferðaþjónusta — same idea as the two contract services but with NO
    // contract and flexible/seasonal drop-offs. Stored like the other two
    // (AppSettings map keyed by company id) so all three segments stay together.
    const ferdaMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('ferdathjonusta_customers')) || {};
    const units = (window.DB && window.DB.cache && window.DB.cache.units) || [];
    const gc = (() => { try { return JSON.parse(localStorage.getItem('_slokk_gc') || '{}'); } catch (_) { return {}; } })();
    // Pre-tally unit counts by client name once (much faster than filtering
    // per company for 444 cards).
    const unitsByClient = {};
    units.forEach(u => {
      if (u.status !== 'urelt') {
        unitsByClient[u.client] = (unitsByClient[u.client] || 0) + 1;
      }
    });
    return companies.map(c => {
      const ars = arsMap[String(c.id)];
      const bru = brunMap[String(c.id)];
      const ferda = ferdaMap[String(c.id)];
      const unitCount = unitsByClient[c.nafn] || 0;
      return {
        ...c,
        // 2026-07-09 (critical bug, Agnar): notaði BARA gamla equipment-blobbið
        // svo kúnnar sem ERU í þjónustu (er_i_thjonustu á fyrirtaeki-röðinni,
        // subscribed-flaggið, eða með alvöru virk tæki) töldust „Án samnings".
        // Nú SAMA regla og inService() í patch 153 (Fyrirtæki í Þjónustu) —
        // síðurnar tvær mega aldrei flokka ólíkt.
        _hasArs: c.er_i_thjonustu === true || !!(ars && (
          ars.subscribed === true ||
          (ars.equipment && Object.values(ars.equipment).some(v => +v > 0))
        )) || unitCount > 0,
        _hasBru: !!bru,
        _hasFerda: !!ferda,
        _ars: ars || {},
        _bru: bru || {},
        _ferda: ferda || {},
        _unitCount: unitCount,
        _hasGps: !!(c.heimilisfang && gc[c.heimilisfang]) || !!(c.nafn && gc[c.nafn]),
        _docs: docsFor(c),
        _bankOnly: _bankOnlyIds.has(+c.id),
        _ovisst: _ovissIds.has(+c.id),
        _docYears: docYearsFor(c),
        _uttektYears: uttektYearsFor(c),
        _last: lastYearsFor(c),
        _reik: reikCntFor(c)
      };
    });
  }

  function filterAll(arr) {
    const search = (state.search || '').trim().toLowerCase();
    let result = arr.slice();

    // Primary service filter (chips). Bank-import-only payers are hidden from
    // every view except their own "Greiðendur (bank)" filter.
    if (state.filter === 'bank') {
      result = result.filter(c => c._bankOnly);
    } else if (state.filter === 'ovisst') {
      result = result.filter(c => c._ovisst);
    } else {
      result = result.filter(c => !c._bankOnly && !c._ovisst);
      if (state.filter === 'fyrirt') result = result.filter(c => c._hasArs);
      else if (state.filter === 'brunak') result = result.filter(c => c._hasBru);
      else if (state.filter === 'ferda') result = result.filter(c => c._hasFerda);
      else if (state.filter === 'onei') result = result.filter(c => !c._hasArs && !c._hasBru && !c._hasFerda);
    }

    // Secondary filters (xfilter) — additive AND
    if (state.xfilter.includes('has-email')) {
      result = result.filter(c => !!c.netfang);
    }
    if (state.xfilter.includes('no-email')) {           // ÁN NETFANGS-spjaldið (05.09.2026)
      result = result.filter(c => !c.netfang);
    }
    if (state.xfilter.includes('has-gps')) {
      result = result.filter(c => c._hasGps);
    }
    if (state.xfilter.includes('no-address')) {
      result = result.filter(c => !c.heimilisfang);
    }
    if (state.xfilter.includes('has-units')) {
      result = result.filter(c => c._unitCount > 0);
    }
    if (state.xfilter.includes('review')) {
      result = result.filter(c => !!c.review_flag);
    }
    if (state.xfilter.includes('missing-docs')) {
      result = result.filter(c => !c._docs || c._docs.total === 0);
    }
    if (state.xfilter.includes('has-samningur')) {
      result = result.filter(c => c._docs && c._docs.samningur);
    }
    if (state.xfilter.includes('has-uttekt-2025')) {
      result = result.filter(c => c._uttektYears && c._uttektYears.has(2025));
    }
    if (state.xfilter.includes('has-uttekt-2026')) {
      result = result.filter(c => c._uttektYears && c._uttektYears.has(2026));
    }
    for (const yr of [2023, 2024, 2025, 2026]) {
      if (state.xfilter.includes('has-docs-' + yr)) {
        result = result.filter(c => c._docYears && c._docYears.has(yr));
      }
    }

    // Free-text search. NB: the kennitala check digit-strips both sides,
    // but if the user typed letters the stripped search becomes '' and
    // ''.includes('') is true — which would match every company. Guard
    // against that by only running the kt match when the search has at
    // least one digit.
    if (search) {
      const ktSearch = search.replace(/\D/g, '');
      result = result.filter(c =>
        (c.nafn || '').toLowerCase().includes(search) ||
        (ktSearch && (c.kennitala || '').replace(/\D/g,'').includes(ktSearch)) ||
        (c.heimilisfang || '').toLowerCase().includes(search) ||
        (c.simi || '').includes(search) ||
        (c.farsimi || '').includes(search) ||
        (c.netfang || '').toLowerCase().includes(search) ||
        (c.tengiliður || '').toLowerCase().includes(search)
      );
    }

    // Sort
    const collator = new Intl.Collator('is', { sensitivity: 'base' });
    switch (state.sort) {
      case 'nafn-desc':
        result.sort((a, b) => collator.compare(String(b.nafn || ''), String(a.nafn || '')));
        break;
      case 'kt':
        result.sort((a, b) => {
          const ak = String(a.kennitala || '').replace(/\D/g,'');
          const bk = String(b.kennitala || '').replace(/\D/g,'');
          return ak.localeCompare(bk);
        });
        break;
      case 'newest':
        // Higher ID = newer (auto-incremented PK)
        result.sort((a, b) => (+b.id || 0) - (+a.id || 0));
        break;
      case 'units':
        result.sort((a, b) => (b._unitCount - a._unitCount) || collator.compare(String(a.nafn || ''), String(b.nafn || '')));
        break;
      case 'addr':
        result.sort((a, b) => collator.compare(String(a.heimilisfang || ''), String(b.heimilisfang || '')));
        break;
      case 'simi':
        result.sort((a, b) => String(a.simi || a.farsimi || '').localeCompare(String(b.simi || b.farsimi || '')));
        break;
      case 'docs':
        // Fewest docs first (so gaps surface). Nulls (no base match) sort last.
        result.sort((a, b) => ((a._docs ? a._docs.total : 999) - (b._docs ? b._docs.total : 999)) || collator.compare(String(a.nafn || ''), String(b.nafn || '')));
        break;
      case 'last':
        // Nýjasta úttektar-ár fyrst (skýrsla eða reikningur); þeir sem eiga ekkert neðst.
        result.sort((a, b) => ((b._last ? b._last.max : 0) - (a._last ? a._last.max : 0)) || collator.compare(String(a.nafn || ''), String(b.nafn || '')));
        break;
      case 'nafn':
      default:
        result.sort((a, b) => collator.compare(String(a.nafn || ''), String(b.nafn || '')));
    }
    return result;
  }

  // ── Sidebar ────────────────────────────────────────────────────────────
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;

    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    // Insert after the existing Viðskiptavinir nav if we can find it,
    // else after the Ársskoðun (Fyrirtæki í Þjónustu) entry, else end.
    const vidskBtn = allBtns.find(b => /viðskiptavinir/i.test(b.textContent) && b.getAttribute('data-view') !== NAV_KEY);
    const arsBtn = allBtns.find(b => b.getAttribute('data-view') === 'arsskodun');
    const refBtn = vidskBtn || arsBtn || allBtns[allBtns.length - 1];

    const sampleClass = (refBtn && refBtn.className) || 'vnav-btn';
    const btn = document.createElement('button');
    btn.className = sampleClass;
    btn.setAttribute('data-view', NAV_KEY);
    // Match the inline-flex icon+label pattern used by other nav buttons.
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px">' +
                    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">' +
                      '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>' +
                      '<circle cx="9" cy="7" r="4"/>' +
                      '<path d="M23 21v-2a4 4 0 0 0-3-3.87"/>' +
                      '<path d="M16 3.13a4 4 0 0 1 0 7.75"/>' +
                    '</svg>' +
                    '<span>Allir Viðskiptavinir</span></span>';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY);
      else show();
    });

    if (refBtn && refBtn.parentNode) {
      refBtn.parentNode.insertBefore(btn, refBtn.nextSibling);
    } else {
      nav.appendChild(btn);
    }
  }

  // ── View container ─────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-arsskodun') ||
                   document.getElementById('view-counter') ||
                   document.getElementById('view-companies');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="_av-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  // ── Hook App.switchView ────────────────────────────────────────────────
  function patchSwitchView() {
    if (!window.App || window.App._allirVidskPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v => {
          v.style.display = 'none'; v.classList.remove('active');
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
    window.App._allirVidskPatched = true;
  }

  // ── Render ─────────────────────────────────────────────────────────────
  function show() {
    ensureView();
    const main = document.getElementById('_av-main');
    if (!main) { setTimeout(show, 200); return; }
    render(main);
    // Load the document counter once, then refresh so the badges fill in.
    if (!_docLoaded) loadDocStatus().then(() => {
      const m = document.getElementById('_av-main');
      if (m) render(m);
    });
    // Load the per-year doc sets once, then refresh so the year filter chips fill in.
    if (!_docYearsLoaded) loadDocYears().then(() => {
      const m = document.getElementById('_av-main');
      if (m) render(m);
    });
    // Load the bank-only flag set once, then refresh so they drop out of view.
    if (!_bankLoaded) loadBankOnly().then(() => {
      const m = document.getElementById('_av-main');
      if (m) render(m);
    });
  }

  function render(main) {
    // 2026-05-19: preserve search-input focus across debounced re-renders.
    // Typing in #_av-search fires a 200ms timeout that calls main.innerHTML=…
    // which destroys the input. Without this, the user can only type one
    // letter at a time — every keystroke loses focus.
    const prevActive = document.activeElement;
    const keepSearchFocus = !!(prevActive && prevActive.id === '_av-search');
    const selStart = keepSearchFocus ? prevActive.selectionStart : null;
    const selEnd   = keepSearchFocus ? prevActive.selectionEnd   : null;

    const all = getAll();
    const filtered = filterAll(all);

    // Headline counts exclude bank-import-only payers (they get their own chip).
    const nonBank = all.filter(c => !c._bankOnly && !c._ovisst);
    const cntBank = all.filter(c => c._bankOnly).length;
    const cntOvisst = all.filter(c => c._ovisst).length;
    const cntAll = nonBank.length;
    const cntArs = nonBank.filter(c => c._hasArs).length;
    const cntBru = nonBank.filter(c => c._hasBru).length;
    const cntFerda = nonBank.filter(c => c._hasFerda).length;
    const cntOne = nonBank.filter(c => !c._hasArs && !c._hasBru && !c._hasFerda).length;

    // Counts for the secondary (xfilter) chips
    const cntWithEmail   = nonBank.filter(c => !!c.netfang).length;
    const cntWithGps     = nonBank.filter(c => c._hasGps).length;
    const cntNoAddress   = nonBank.filter(c => !c.heimilisfang).length;
    const cntWithUnits   = nonBank.filter(c => c._unitCount > 0).length;
    const cntInService   = nonBank.filter(c => c._hasArs || c._hasBru).length;
    const cntNoEmail     = cntAll - cntWithEmail;
    const cntReview      = nonBank.filter(c => !!c.review_flag).length;
    const cntMissingDocs = nonBank.filter(c => !c._docs || c._docs.total === 0).length;
    const cntSamningur   = nonBank.filter(c => c._docs && c._docs.samningur).length;
    const cntUttekt2025  = nonBank.filter(c => c._uttektYears && c._uttektYears.has(2025)).length;
    const cntUttekt2026  = nonBank.filter(c => c._uttektYears && c._uttektYears.has(2026)).length;
    const docYearCounts = {};
    [2023, 2024, 2025, 2026].forEach(yr => {
      docYearCounts[yr] = nonBank.filter(c => c._docYears && c._docYears.has(yr)).length;
    });

    // theme.css (2026-07-09): viewið flush svo .thm .app-page bandið eigi útlitið.
    if (!document.getElementById('av-thm-style')) {
      const _st = document.createElement('style');
      _st.id = 'av-thm-style';
      _st.textContent = '#view-allir-vidsk{padding:0 !important;max-width:none !important}';
      document.head.appendChild(_st);
    }
    main.innerHTML = `
      <div class="thm"><div class="app-page"><main class="app-main" style="font-family:'IBM Plex Sans',-apple-system,'Segoe UI',sans-serif;color:#11141c">

        <div class="page-title">
          <div class="page-title__lead">
            <span class="page-title__icon">👥</span>
            <div>
              <h1>Allir Viðskiptavinir</h1>
              <p>
                <span style="font-family:'JetBrains Mono',ui-monospace,monospace;color:#fff;font-weight:700">${cntAll}</span> fyrirtæki ·
                <span style="color:#fca5a5"><span style="font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700">${cntArs}</span> í fyrirtækjaþjónustu</span> ·
                <span style="color:#93c5fd"><span style="font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700">${cntBru}</span> í brunakerfi</span> ·
                <span style="color:#7dd3fc"><span style="font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700">${cntFerda}</span> í ferðaþjónustu</span> ·
                <span style="font-family:'JetBrains Mono',ui-monospace,monospace;color:#fff;font-weight:700">${cntOne}</span> án samnings
              </p>
            </div>
          </div>
          <div class="page-title__tools">
            <input id="_av-search" type="text" placeholder="🔍 Leita..." value="${esc(state.search)}"
                   style="height:38px;padding:0 14px;border:1px solid rgba(0,0,0,.35);border-radius:10px;font:inherit;font-size:13.5px;width:280px;background:#fff;color:#141822;outline:none;box-shadow:inset 0 1px 3px rgba(0,0,0,.15)">
          </div>
        </div>

        <!-- Stat tiles — sömu stærðir og ._ars-statgrid í Fyrirtæki í þjónustu (153): 11/13 px, 22 px tala -->
        <div class="_av-statgrid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-bottom:14px">
          <div style="background:#fff;border:1px solid rgba(20,24,34,.1);border-radius:10px;padding:11px 13px;cursor:pointer" data-kpi="all" title="Sýna alla">
            <div style="font-size:10px;font-weight:700;color:#8a93a5;text-transform:uppercase;letter-spacing:.05em">Fjöldi</div>
            <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:22px;font-weight:800;color:#11141c;line-height:1.1;margin-top:2px">${cntAll}</div>
            <div style="font-size:10.5px;color:#8a93a5">viðskiptavinir</div>
          </div>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:11px 13px;cursor:pointer" data-kpi="fyrirt" title="Sía: fyrirtækjaþjónusta">
            <div style="font-size:10px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.05em">Í þjónustu</div>
            <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:22px;font-weight:800;color:#15803d;line-height:1.1;margin-top:2px">${cntInService}</div>
            <div style="font-size:10.5px;color:#16a34a">${cntArs} fyrirtækjaþj. · ${cntBru} brunakerfi</div>
          </div>
          <div style="background:#fff;border:1px solid rgba(20,24,34,.1);border-radius:10px;padding:11px 13px;cursor:pointer" data-kpi="has-units" title="Sía: hefur tæki">
            <div style="font-size:10px;font-weight:700;color:#8a93a5;text-transform:uppercase;letter-spacing:.05em">Með tæki</div>
            <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:22px;font-weight:800;color:#11141c;line-height:1.1;margin-top:2px">${cntWithUnits}</div>
            <div style="font-size:10.5px;color:#8a93a5">skráð slökkvitæki</div>
          </div>
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:11px 13px;cursor:pointer" data-kpi="no-email" title="Sía: vantar netfang">
            <div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:.05em">Án netfangs</div>
            <div style="font-family:'JetBrains Mono',ui-monospace,monospace;font-size:22px;font-weight:800;color:#b45309;line-height:1.1;margin-top:2px">${cntNoEmail}</div>
            <div style="font-size:10.5px;color:#b45309">vantar tölvupóst</div>
          </div>
        </div>

        <!-- Toolbar: view toggle + sort -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div style="display:inline-flex;border:1px solid rgba(20,24,34,.14);border-radius:11px;overflow:hidden;background:#fff;padding:3px;gap:3px">
              <button data-view-mode="card" class="_av-vm" type="button" style="padding:7px 14px;background:${state.view==='card'?'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)':'transparent'};color:${state.view==='card'?'#fff':'#3a4250'};border:none;border-radius:9px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:5px">▦ Kort</button>
              <button data-view-mode="list" class="_av-vm" type="button" style="padding:7px 14px;background:${state.view==='list'?'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)':'transparent'};color:${state.view==='list'?'#fff':'#3a4250'};border:none;border-radius:9px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;display:flex;align-items:center;gap:5px">☰ Listi</button>
            </div>
            <button id="_av-new-cust" type="button" style="padding:8px 16px;height:38px;background:linear-gradient(150deg,#2bbf6c,#0f6e3a);color:#fff;border:1px solid #156e3a;border-radius:11px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;box-shadow:inset 0 1px 0 rgba(255,255,255,.25);display:flex;align-items:center;gap:5px">+ Nýr viðskiptavinur</button>
          </div>
          ${state.view === 'list' ? '<div style="font-family:\'JetBrains Mono\',ui-monospace,monospace;font-size:11px;color:#9098a6">Smelltu á dálkahaus til að raða</div>' : ''}
        </div>

        <!-- Primary service filter chips -->
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
          ${[
            ['all',    'Allir',                  cntAll],
            ['fyrirt', '🔥 Fyrirtækjaþjónusta',  cntArs],
            ['brunak', '🚨 Brunakerfi',          cntBru],
            ['ferda',  '🚌 Ferðaþjónusta',       cntFerda],
            ['onei',   'Án samnings',            cntOne]
          ].concat(cntBank ? [['bank', '🏦 Greiðendur (bank)', cntBank]] : [])
           .concat(cntOvisst ? [['ovisst', '🕶 Óvissir (faldir)', cntOvisst]] : []).map(([key, lbl, n]) => {
            const sel = state.filter === key;
            const inactive = 'background:linear-gradient(180deg,#fdfdfe,#e3e7ee);border:1px solid rgba(20,24,34,.14);color:#3a4250';
            const active   = 'background:linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%);color:#fff;border:1px solid #0a0b0d';
            return `<button data-filter="${key}" class="_av-ft" style="padding:7px 14px;${sel?active:inactive};border-radius:10px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600">${lbl} <span style="font-family:'JetBrains Mono',ui-monospace,monospace;opacity:.7;font-weight:700">${n}</span></button>`;
          }).join('')}
        </div>

        <!-- Secondary filter chips (xfilter — AND'd with primary) -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px;align-items:center">
          <span style="font-size:10.5px;font-weight:700;color:#8a93a5;letter-spacing:.12em;padding-right:4px">SÍA:</span>
          ${[
            ['review',     '⚑ Til skoðunar',  cntReview],
            ['missing-docs','📄 Vantar skjöl', cntMissingDocs],
            ...(_docLoaded ? [['has-samningur', '📋 Þjónustusamningur', cntSamningur]] : []),
            ...(_docYearsLoaded ? [
              ['has-uttekt-2025', '📝 Úttekt \'25', cntUttekt2025],
              ['has-uttekt-2026', '📝 Úttekt \'26', cntUttekt2026]
            ] : []),
            ['has-email',  '✉️ Netfang',      cntWithEmail],
            ['no-email',   '✉️ Vantar netfang', cntNoEmail],
            ['has-gps',    '📍 GPS staðsetning', cntWithGps],
            ['has-units',  '🧯 Hefur tæki',   cntWithUnits],
            ['no-address', '❌ Vantar heimilisfang', cntNoAddress],
            ...(_docYearsLoaded ? [2023, 2024, 2025, 2026].map(yr => ['has-docs-' + yr, '📅 Skjöl \'' + String(yr).slice(2), docYearCounts[yr]]) : [])
          ].map(([key, lbl, n]) => {
            const sel = state.xfilter.includes(key);
            const inactive = 'background:#fff;border:1px solid rgba(20,24,34,.14);color:#5b6472';
            const active   = 'background:#eef3ff;border:1px solid #c6d6ff;color:#2f5fe0;font-weight:700';
            return `<button data-xfilter="${key}" class="_av-xft" style="padding:5px 11px;${sel?active:inactive};border-radius:8px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">${lbl} <span style="font-family:'JetBrains Mono',ui-monospace,monospace;opacity:.7">${n}</span></button>`;
          }).join('')}
          ${state.xfilter.length ? `<button id="_av-clear-x" type="button" style="padding:5px 11px;border:none;background:none;color:#c0241f;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">Hreinsa síu ✕</button>` : ''}
          <button id="_av-selmode" type="button" style="margin-left:auto;padding:6px 13px;border:1px solid ${state.selectMode?'#0a0b0d':'rgba(20,24,34,.14)'};background:${state.selectMode?'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)':'#fff'};color:${state.selectMode?'#fff':'#3a4250'};border-radius:9px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">☑︎ ${state.selectMode?'Hætta vali':'Velja margar'}</button>
        </div>

        ${state.selectMode ? `
        <!-- Bulk action bar -->
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px;padding:12px 14px;background:#eef3ff;border:1px solid #c6d6ff;border-radius:12px">
          <span style="font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700;color:#2f5fe0;font-size:13px">${state.selected.size} valdir</span>
          <button id="_av-sel-clear" type="button" style="padding:6px 12px;border:1px solid rgba(20,24,34,.14);background:#fff;border-radius:9px;cursor:pointer;font:inherit;font-size:12px;color:#3a4250">Hreinsa val</button>
          <div style="flex:1;min-width:0"></div>
          <button id="_av-bulk-merge" type="button" ${state.selected.size === 2 ? '' : 'disabled'} title="Sameina tvö fyrirtæki sem eru sama viðskiptavinurinn (færir tæki + skjöl yfir á það sem heldur; hitt fer í geymslu). Veldu nákvæmlega 2." style="padding:6px 12px;border:1px solid #ddd6fe;background:#f5f3ff;color:#6d28d9;border-radius:9px;cursor:pointer;font:inherit;font-size:12px;font-weight:700${state.selected.size === 2 ? '' : ';opacity:.5'}">🔗 Sameina ${state.selected.size === 2 ? 'tvö' : '(veldu 2)'}</button>
          <button id="_av-bulk-ferda" type="button" ${state.selected.size?'':'disabled'} style="padding:6px 12px;border:1px solid #bae6fd;background:#e0f2fe;color:#0369a1;border-radius:9px;cursor:pointer;font:inherit;font-size:12px;font-weight:700${state.selected.size?'':';opacity:.5'}">🚌 Merkja Ferðaþjónustu</button>
          <button id="_av-bulk-archive" type="button" ${state.selected.size?'':'disabled'} title="Mjúk geymsla (deleted_at). Sleppir þeim sem hafa samning/skjöl." style="padding:6px 12px;border:1px solid #fde68a;background:#fffbeb;color:#b45309;border-radius:9px;cursor:pointer;font:inherit;font-size:12px;font-weight:700${state.selected.size?'':';opacity:.5'}">📦 Geyma (mjúkt)</button>
        </div>` : ''}

        ${filtered.length === 0 ? `
          <div style="background:#fff;border:1px dashed rgba(20,24,34,.12);border-radius:14px;padding:44px;text-align:center;color:#5b6472">
            <div style="font-size:30px;margin-bottom:8px">🔍</div>
            <div style="font-size:14px;font-weight:600;color:#11141c;margin-bottom:3px">Engir viðskiptavinir passa við þessa síu</div>
            <div style="font-size:12px;color:#8a93a5">Reyndu að breyta sía eða leitarstreng.</div>
          </div>
        ` : (state.view === 'list' ? renderList(filtered) : renderCards(filtered))}

        <div style="margin-top:20px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;color:#9098a6;text-align:center">
          Sýni <strong style="color:#11141c">${filtered.length}</strong> af ${state.filter === 'bank' ? cntBank : state.filter === 'ovisst' ? cntOvisst : cntAll} viðskiptavinum${cntBank && state.filter !== 'bank' ? ` · ${cntBank} bank-greiðendur faldir` : ''}${cntOvisst && state.filter !== 'ovisst' ? ` · ${cntOvisst} óvissir faldir` : ''}
        </div>
      </main></div></div>
    `;

    // Wire
    main.querySelectorAll('._av-ft').forEach(b => b.addEventListener('click', () => {
      state.filter = b.dataset.filter; saveState(); render(main);
    }));
    main.querySelectorAll('._av-vm').forEach(b => b.addEventListener('click', () => {
      state.view = b.dataset.viewMode; saveState(); render(main);
    }));
    // Sort by clicking a table column header (list view). Nafn toggles A→Ö / Ö→A.
    main.querySelectorAll('th[data-sort]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.sort;
      state.sort = (k === 'nafn') ? (state.sort === 'nafn' ? 'nafn-desc' : 'nafn') : k;
      saveState(); render(main);
    }));
    // Síðuflettir listans (50 í einu, sjá renderList)
    main.querySelector('#_av-pgprev')?.addEventListener('click', () => { state._page = Math.max(1, (state._page || 1) - 1); render(main); });
    main.querySelector('#_av-pgnext')?.addEventListener('click', () => { state._page = (state._page || 1) + 1; render(main); });
    main.querySelectorAll('._av-xft').forEach(b => b.addEventListener('click', () => {
      const key = b.dataset.xfilter;
      const idx = state.xfilter.indexOf(key);
      if (idx >= 0) state.xfilter.splice(idx, 1);
      else state.xfilter.push(key);
      saveState(); render(main);
    }));
    main.querySelector('#_av-clear-x')?.addEventListener('click', () => {
      state.xfilter = []; saveState(); render(main);
    });
    // + Nýr viðskiptavinur — this list renders from Companies.list (the
    // `fyrirtaeki` table), so it MUST create the record there. The old POS
    // quick-add (_upsOpenNewCustomer) inserted into `vidskiptavinir` instead,
    // a table this list never reads — so new companies saved but "vanished".
    // Use the canonical company modal (Companies.openNew → fyrirtaeki) and
    // re-render when it closes so the new row appears immediately.
    main.querySelector('#_av-new-cust')?.addEventListener('click', () => {
      const reRender = () => { const m = document.getElementById('_av-main'); if (m) render(m); };
      if (window.Companies && typeof Companies.openNew === 'function') {
        Companies.openNew();
        const modal = document.getElementById('modal-nyfyrirtaeki');
        if (!modal) { reRender(); return; }
        if (window.__avNewCustWatch) { window.__avNewCustWatch.disconnect(); window.__avNewCustWatch = null; }
        // Modal.open adds the `open` class; Modal.close removes it. Re-render
        // once it's gone (covers both save and cancel).
        const watch = new MutationObserver(() => {
          if (!modal.classList.contains('open')) {
            watch.disconnect();
            if (window.__avNewCustWatch === watch) window.__avNewCustWatch = null;
            reRender();
          }
        });
        window.__avNewCustWatch = watch;
        watch.observe(modal, { attributes: true, attributeFilter: ['class'] });
        return;
      }
      // Fallback: if Companies isn't ready, fall back to the shared quick-add.
      if (typeof window._upsOpenNewCustomer === 'function') {
        window._upsOpenNewCustomer('', '');
        if (window.__avNewCustWatch) { window.__avNewCustWatch.disconnect(); window.__avNewCustWatch = null; }
        const watch = new MutationObserver(() => {
          if (!document.getElementById('_ups-newdlg')) {
            watch.disconnect();
            if (window.__avNewCustWatch === watch) window.__avNewCustWatch = null;
            reRender();
          }
        });
        window.__avNewCustWatch = watch;
        watch.observe(document.body, { childList: true });
      } else if (window.Toast && Toast.show) {
        Toast.show('Stofnunargluggi ekki tiltækur');
      }
    });
    let _searchTimer = null;
    main.querySelector('#_av-search')?.addEventListener('input', e => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(() => { state.search = e.target.value; saveState(); render(main); }, 200);
    });
    main.querySelectorAll('._av-card, ._av-row').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('button, a')) return;
        const id = +el.dataset.coId;
        if (!id) return;
        // 05.09.2026 (Agnar): röðin opnast Á STAÐNUM — nóta, viðhengi, skjáskot — í stað þess
        // að senda mann á kúnna-síðuna (patch 351). Sé hann ekki hlaðinn: gamla leiðin.
        if (window.VidskAStadnum && VidskAStadnum.toggle) return VidskAStadnum.toggle(id, el);
        openDetail(id);
      });
    });
    // Subscribe/unsubscribe buttons — stop card-click propagation so we
    // don't accidentally open the detail at the same time.
    main.querySelectorAll('._av-toggle').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();
        const coId = +b.dataset.coId;
        const svc = b.dataset.svc;
        const action = b.dataset.action;
        toggleService(coId, svc, action);
      });
    });
    main.querySelectorAll('._av-flag').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); toggleReview(+b.dataset.coId); });
    });
    // Athugasemd — þunn lína (eins og ferðanótan í Fyrirtæki í þjónustu, 153). Vistast
    // sjálfkrafa 800 ms eftir síðasta staf og STRAX við Enter/blur. Litur línunnar segir
    // stöðuna (gul = óvistað · græn = vistað · rauð = villa) — CSS á data-save. Áður
    // sagði græni ramminn „vistað" líka þegar Supabase skilaði villu (supabase-js kastar
    // ekki, skilar {error}) — saveNote athugar það núna.
    main.querySelectorAll('._av-note').forEach(ta => {
      const coId = +ta.dataset.coId;
      const flush = () => {
        clearTimeout(_noteTimers[coId]); _noteTimers[coId] = null;
        saveNote(coId, ta.value).then(ok => {
          if (!document.contains(ta)) return;
          ta.dataset.save = ok === false ? 'error' : 'saved';
          ta.title = ta.value || 'Athugasemd — vistast sjálfkrafa';
          setTimeout(() => { if (document.contains(ta) && ta.dataset.save !== 'pending') delete ta.dataset.save; }, 1500);
        });
      };
      ta.addEventListener('input', () => {
        clearTimeout(_noteTimers[coId]);
        ta.dataset.save = 'pending';
        _noteTimers[coId] = setTimeout(flush, 800);
      });
      ta.addEventListener('blur', () => { if (_noteTimers[coId]) flush(); });
      ta.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ta.blur(); } });
      ta.addEventListener('click', e => e.stopPropagation());
    });
    // Bulk select mode
    main.querySelector('#_av-selmode')?.addEventListener('click', () => {
      state.selectMode = !state.selectMode;
      if (!state.selectMode) state.selected.clear();
      render(main);
    });
    main.querySelector('#_av-sel-clear')?.addEventListener('click', () => { state.selected.clear(); render(main); });
    main.querySelectorAll('._av-sel').forEach(cb => {
      cb.addEventListener('change', e => {
        e.stopPropagation();
        const id = +cb.dataset.coId;
        if (cb.checked) state.selected.add(id); else state.selected.delete(id);
        render(main);
      });
    });
    main.querySelector('#_av-bulk-ferda')?.addEventListener('click', () => bulkTagFerda());
    main.querySelector('#_av-bulk-archive')?.addEventListener('click', () => bulkArchive());
    main.querySelector('#_av-bulk-merge')?.addEventListener('click', () => {
      const ids = Array.from(state.selected);
      if (ids.length === 2) openMergeModal(ids[0], ids[1]);
    });

    // Inline edit (kt / heimilisfang / sími)
    main.querySelectorAll('._av-edit').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); state.editId = +b.dataset.coId; render(main); });
    });
    main.querySelectorAll('._av-ecancel').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); state.editId = null; render(main); });
    });
    main.querySelectorAll('._av-esave').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation(); e.preventDefault();
        const row = b.closest('._av-row'); if (!row) return;
        const vals = {};
        row.querySelectorAll('._av-ei').forEach(inp => { vals[inp.dataset.k] = inp.value.trim(); });
        saveEdit(+b.dataset.coId, vals);
      });
    });

    // Restore search-input focus + cursor position (see top of render()).
    if (keepSearchFocus) {
      const fresh = main.querySelector('#_av-search');
      if (fresh) {
        fresh.focus();
        try {
          fresh.setSelectionRange(selStart ?? fresh.value.length, selEnd ?? fresh.value.length);
        } catch (_) { /* type=text always allows setSelectionRange */ }
      }
    }
  }

  function renderCards(arr) {
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:11px">
        ${arr.map(c => {
          // Service toggle buttons — click to subscribe / unsubscribe.
          // When subscribed: red/blue filled chip with × icon (click to remove).
          // When not subscribed: outlined chip with + icon (click to add).
          const arsBtn = c._hasArs
            ? `<button class="_av-toggle" data-co-id="${c.id}" data-svc="ars" data-action="remove" type="button" title="Fjarlægja úr fyrirtækjaþjónustu" style="background:#fee2e2;color:#b91c1c;font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;border:1px solid #fecaca;cursor:pointer;font-family:inherit">🔥 Fyrirtækjaþj. <span style="opacity:.6;margin-left:2px">✕</span></button>`
            : `<button class="_av-toggle" data-co-id="${c.id}" data-svc="ars" data-action="add" type="button" title="Skrá í fyrirtækjaþjónustu" style="background:#fff;color:#94a3b8;font-size:10px;font-weight:600;padding:3px 8px;border-radius:99px;border:1px dashed #cbd5e1;cursor:pointer;font-family:inherit">🔥 + Fyrirtækjaþj.</button>`;

          const bruBtn = c._hasBru
            ? `<button class="_av-toggle" data-co-id="${c.id}" data-svc="bru" data-action="remove" type="button" title="Fjarlægja úr brunakerfi" style="background:#dbeafe;color:#1d4ed8;font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;border:1px solid #93c5fd;cursor:pointer;font-family:inherit">🚨 Brunakerfi <span style="opacity:.6;margin-left:2px">✕</span></button>`
            : `<button class="_av-toggle" data-co-id="${c.id}" data-svc="bru" data-action="add" type="button" title="Skrá í brunakerfi" style="background:#fff;color:#94a3b8;font-size:10px;font-weight:600;padding:3px 8px;border-radius:99px;border:1px dashed #cbd5e1;cursor:pointer;font-family:inherit">🚨 + Brunakerfi</button>`;

          const ferdaBtn = c._hasFerda
            ? `<button class="_av-toggle" data-co-id="${c.id}" data-svc="ferda" data-action="remove" type="button" title="Fjarlægja úr ferðaþjónustu" style="background:#e0f2fe;color:#0369a1;font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px;border:1px solid #7dd3fc;cursor:pointer;font-family:inherit">🚌 Ferðaþj. <span style="opacity:.6;margin-left:2px">✕</span></button>`
            : `<button class="_av-toggle" data-co-id="${c.id}" data-svc="ferda" data-action="add" type="button" title="Skrá í ferðaþjónustu" style="background:#fff;color:#94a3b8;font-size:10px;font-weight:600;padding:3px 8px;border-radius:99px;border:1px dashed #cbd5e1;cursor:pointer;font-family:inherit">🚌 + Ferðaþj.</button>`;

          return `
            <div class="_av-card" data-co-id="${c.id}" style="background:#fff;border:1px solid #e2e8f0;border-radius:11px;padding:12px 14px;display:flex;flex-direction:column;gap:7px;box-shadow:0 1px 2px rgba(0,0,0,0.03);cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor='#94a3b8';this.style.boxShadow='0 2px 8px rgba(0,0,0,0.06)'" onmouseout="this.style.borderColor='#e2e8f0';this.style.boxShadow='0 1px 2px rgba(0,0,0,0.03)'">
              <div style="min-width:0">
                <div style="font-weight:700;color:#0f172a;font-size:14px;line-height:1.25">${esc(c.nafn || '—')}</div>
                ${c.kennitala ? `<div style="font-size:11px;color:#94a3b8;font-family:monospace;margin-top:1px">kt. ${esc(fmtKt(c.kennitala))}</div>` : ''}
              </div>
              <div style="display:flex;flex-direction:column;gap:2px;font-size:11px;color:#64748b">
                ${c.heimilisfang ? `<div>📍 ${esc(c.heimilisfang)}</div>` : ''}
                ${c.simi || c.farsimi ? `<div>📞 ${esc(c.simi || c.farsimi)}</div>` : ''}
                ${c.netfang ? `<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">✉️ ${esc(c.netfang)}</div>` : ''}
                ${c.tengiliður ? `<div>👤 ${esc(c.tengiliður)}</div>` : ''}
              </div>
              <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:2px">${arsBtn}${bruBtn}${ferdaBtn}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ── List (table) view — compact alternative to cards ───────────────────
  // ── Listi — sama töflusnið og Fyrirtæki í þjónustu (153 renderTable) ──────────
  // Agnar 07.09.2026: „textaboxið svo yfirþyrmandi, mætti bara vera þunn lína eins og
  // fyrirtæki í þjónustu" + „uppsetningin svipað eins og fyrirtæki í þjónustu".
  // Dökkt málm-band í haus, 44 px raðir, nafn+kt staflað, athugasemd sem ÞUNN
  // punktalína (var 2ja lína textarea með ramma → ~106 px röð), 50 raðir á síðu með
  // SÝNI a–b AF n + Fyrri/Næsta. Tölurnar eru afrit af _ensureMockCss í 153 — 153 má
  // ekki snerta (ORYGGISNET), svo þetta er haldið samhljóða henni handvirkt.
  function _ensureAvTblCss() {
    if (document.getElementById('_av-tbl-css')) return;
    const s = document.createElement('style');
    s.id = '_av-tbl-css';
    const V = '#view-allir-vidsk ';
    const MONO = "'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace";
    s.textContent = [
      V+'.data-table-wrap{border-radius:16px;border:1px solid rgba(20,24,34,.08);background:#fff;overflow:hidden;box-shadow:0 10px 28px -16px rgba(25,35,60,.16)}',
      V+'.data-table-scroll{overflow-x:auto}',
      // Dálkasumman í <colgroup> er 1188 px = innihaldsbreiddin við 1440 px skjá með hliðarstiku;
      // breiðari skjár teygir dálkana hlutfallslega, mjórri skrunar inni í .data-table-scroll.
      V+'.data-table{width:100%;min-width:1100px;border-collapse:collapse;table-layout:fixed;font:inherit}',
      V+'.data-table thead{position:sticky;top:0;z-index:2}',
      // 245 (Brunastál content-skin) málar `.view table th` ljósgrá með !important — sama vopn og 153.
      V+'.data-table thead tr{background:linear-gradient(180deg,#3a3d45 0%,#2a2d33 45%,#1b1d22 100%)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 -1px 0 #000!important}',
      V+'.data-table th{background:transparent!important;color:#f0f2f5!important;text-shadow:0 1px 1px rgba(0,0,0,.4)!important;border:0!important;text-transform:uppercase!important;font-weight:700!important;text-align:left;padding:11px 12px;font-size:10.5px;letter-spacing:.15em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      V+'.data-table th.center{text-align:center}',
      V+'.data-table th.right{text-align:right}',
      V+'.data-table th[data-sort]{cursor:pointer;user-select:none}',
      V+'.data-table .sort-ar{font-size:9px;color:rgba(255,255,255,.5)!important;margin-left:5px}',
      // 245 (bstal-content-skin) og bstal-polish setja `.view table tbody td{padding:10px 14px!important}`
      // — það gerði raðirnar 49 px og klippti aðgerðadálkinn; !important hér er sama vopn og 153 notar.
      V+'.data-table tbody td{padding:7px 12px!important;border-top:1px solid #eceff4;line-height:1.25;height:44px;white-space:nowrap;font-size:13px;color:#3a4250;vertical-align:middle;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box}',
      V+'.data-table tbody td.center{text-align:center}',
      V+'.data-table tbody td.right{text-align:right;padding-left:6px!important;padding-right:8px!important}',   // 5 takkar (153 px) rúmast í 172 px dálki
      V+'.data-table tbody tr._av-row{cursor:pointer;transition:background .12s ease}',
      V+'.data-table tbody tr._av-row:hover{background:#f7f9fd}',
      V+'.data-table tbody tr._av-row:focus-visible{outline:none;background:#eef3ff;box-shadow:inset 0 0 0 2px rgba(47,95,224,.35)}',
      V+'._co{display:block;font-size:13px;font-weight:600;color:#11141c;white-space:normal;overflow:visible;overflow-wrap:break-word;word-break:normal;line-height:1.2}',
      V+'._kt{display:block;font-family:'+MONO+';font-size:10px;color:#8a93a5;letter-spacing:.02em;white-space:nowrap;line-height:1.2}',
      V+'._rvnote{display:block;font-size:10.5px;color:#b45309;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}',
      V+'._addr{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      V+'._post{font-family:'+MONO+';font-size:11px;font-weight:700;color:#8a93a5;margin-right:8px}',
      V+'.data-table td.mono{font-family:'+MONO+';font-size:11.5px;color:#3a4250}',
      V+'.data-table td.num{font-family:'+MONO+';font-size:13px;font-weight:700;color:#11141c;text-align:center}',
      V+'.data-table td.num.tom{color:#cbd2dc;font-weight:400}',
      // Þunna athugasemdalínan — orðrétt sömu tölur og ._note / input._ars-plannote í 153.
      V+'._note{display:block;width:100%;min-width:0;max-width:100%;height:22px!important;min-height:22px!important;max-height:22px!important;border:0!important;border-bottom:1px dotted #c3c9d3!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;color:#3a4250;font:inherit;font-size:12px!important;line-height:20px!important;padding:0 2px!important;margin:0;box-sizing:border-box;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      V+'._note::placeholder{color:#c7ccd6;letter-spacing:.14em}',
      V+'._note:hover{border-bottom-color:#9aa3b2!important}',
      V+'._note:focus{outline:none;border-bottom-color:#2f5fe0!important;border-bottom-style:solid!important;background:#fff!important;color:#0f172a}',
      // vistunarstaða á línunni sjálfri: gul = óvistað · græn = vistað · rauð = villa
      V+'._note[data-save="pending"]{border-bottom:1px solid #f59e0b!important}',
      V+'._note[data-save="saved"]{border-bottom:1px solid #22c55e!important}',
      V+'._note[data-save="error"]{border-bottom:1px solid #dc2626!important}',
      // SÍÐAST — sömu málm-gljáar og ._yr.both / .penda / .now í 153
      V+'._av-last{display:inline-flex;gap:7px;align-items:center;justify-content:center}',
      V+'._av-yr{display:inline-flex;align-items:center;gap:3px;font-style:normal;font-size:11px;line-height:1}',
      V+'._av-yr b{font-family:'+MONO+';font-size:11px;font-weight:700;padding:2px 6px;border-radius:6px;border:1px solid #e7eaf0;background:#f4f6f9;color:#aab3c0;line-height:1.2}',
      V+'._av-yr.ok b{color:#fff;background:linear-gradient(145deg,#1c7a45 0%,#0f4f2b 42%,#062815 72%,#0c3f22 100%);border-color:#041c0e;text-shadow:0 1px 1px rgba(0,0,0,.35)}',
      V+'._av-yr.prev b{color:#fff8e6;background:linear-gradient(150deg,#8a6410,#c99a1e 44%,#5a3f08);border-color:rgba(255,220,130,.45);text-shadow:0 1px 1px rgba(0,0,0,.35)}',
      V+'._av-yr.old b{color:#fff;background:linear-gradient(145deg,#d84f4a 0%,#b0201b 42%,#6e100d 72%,#9c1d18 100%);border-color:#4d0a08;text-shadow:0 1px 1px rgba(0,0,0,.35)}',
      V+'._av-yr.none b{color:#c3cad6}',
      V+'._av-yr.kt b{border-style:dashed;opacity:.85}',
      V+'._av-notacell{min-width:0;overflow:hidden;vertical-align:middle}',
      V+'._av-act{display:inline-flex;gap:3px;justify-content:flex-end;white-space:nowrap}',
      V+'._av-svc{display:inline-flex;gap:4px}',
      V+'._tfoot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 14px;border-top:1px solid #eceff4;background:#fbfcfe}',
      V+'._tfoot > span{font-family:'+MONO+';font-size:11px;letter-spacing:.08em;color:#5b6472}',
      V+'._pager{display:flex;gap:6px}',
      V+'._pager button{height:26px;padding:0 11px;border-radius:7px;border:1px solid #e2e6ed;background:#fff;color:#5b6472;font:inherit;font-size:12px;cursor:pointer}',
      V+'._pager button:hover{border-color:#c3cad6;color:#3a4250}',
      V+'._pager button[disabled]{opacity:.45;cursor:default}',
      // patch 261 (app-hamur) þvingar .view button/input í 50 px — sama vörn og 153 notar
      'body.appmode '+V+'._note{height:22px!important;min-height:22px!important;font-size:12px!important;padding:0 2px!important}',
      'body.appmode '+V+'._pager button{min-height:26px!important;height:26px!important;font-size:12px!important;padding:0 11px!important}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function renderList(arr) {
    _ensureAvTblCss();
    // Síðuskipting eins og í 153: 50 í einu (eða stilling Stílstjórans, __peTablePer).
    // Ný sía / leit / röðun → alltaf aftur á fyrstu síðu; annars klemmt við fjöldann.
    const PER = (typeof window.__peTablePer === 'number' && window.__peTablePer > 0) ? window.__peTablePer : 50;
    const sig = [state.filter, state.xfilter.join(','), state.search, state.sort].join('|');
    if (sig !== state._pageSig) { state._pageSig = sig; state._page = 1; }
    const totalRows = arr.length;
    const pages = Math.max(1, Math.ceil(totalRows / PER));
    if (!state._page || state._page > pages) state._page = 1;
    const p0 = (state._page - 1) * PER;
    const pageArr = arr.slice(p0, p0 + PER);

    const arrow = key => {
      const on = key === 'nafn' ? (state.sort === 'nafn' || state.sort === 'nafn-desc') : state.sort === key;
      return '<span class="sort-ar">' + (on ? (state.sort === 'nafn-desc' ? '▼' : '▲') : '⇅') + '</span>';
    };
    const sortTh = (label, key, cls) => `<th data-sort="${key}"${cls ? ' class="' + cls + '"' : ''} title="Raða eftir ${esc(label)}">${esc(label)}${arrow(key)}</th>`;
    const curYear = new Date().getFullYear();
    // 📝 síðasta úttektarskýrsla · 🧾 síðasti úttektarreikningur — litir eins og árs-perurnar í 153:
    // yfirstandandi ár grænt, í fyrra gull, eldra rautt, ekkert grátt. Strikað = skráð á kennitölu.
    const yTag = (ico, y, via, what) => {
      if (!y) return `<i class="_av-yr none" title="${what}: engin skráð">${ico}<b>—</b></i>`;
      const cls = y >= curYear ? 'ok' : y === curYear - 1 ? 'prev' : 'old';
      return `<i class="_av-yr ${cls}${via === 'kt' ? ' kt' : ''}" title="${what} ${y}${via === 'kt' ? ' (skráð á kennitölu, ekki þennan stað)' : ''}">${ico}<b>’${String(y).slice(2)}</b></i>`;
    };
    const pill = (txt, bg, fg, bd, title) => `<span title="${esc(title)}" style="background:${bg};color:${fg};font-size:10.5px;font-weight:600;padding:2px 7px;border-radius:7px;border:1px solid ${bd}">${txt}</span>`;

    return `
      <div class="data-table-wrap">
        <div class="data-table-scroll">
        <table class="data-table _av-table no-skin">
          <colgroup>
            <col style="width:210px"><col style="width:176px"><col style="width:96px">
            <col style="width:52px"><col style="width:84px"><col style="width:124px">
            <col style="width:128px"><col style="width:146px"><col style="width:172px">
          </colgroup>
          <thead>
            <tr>
              ${sortTh('Nafn', 'nafn')}
              ${sortTh('Heimilisfang', 'addr')}
              ${sortTh('Sími', 'simi')}
              ${sortTh('Tæki', 'units', 'center')}
              <th>Þjónusta</th>
              ${sortTh('Skjöl', 'docs')}
              ${sortTh('Síðast', 'last', 'center')}
              <th>Athugasemd</th>
              <th class="right">Aðgerð</th>
            </tr>
          </thead>
          <tbody>
            ${pageArr.map(c => {
              const editing = state.editId === c.id;
              const eInput = (k, v) => `<input class="_av-ei" data-k="${k}" value="${esc(v == null ? '' : v)}" onclick="event.stopPropagation()" style="width:100%;box-sizing:border-box;padding:3px 5px;border:1px solid #93c5fd;border-radius:5px;font:inherit;font-size:11.5px">`;
              const svc = [];
              if (c._hasArs) svc.push(pill('🔥', '#fdecec', '#c0241f', '#f3c6c4', 'Fyrirtækjaþjónusta'));
              if (c._hasBru) svc.push(pill('🚨', '#eef3ff', '#2f5fe0', '#c6d6ff', 'Brunakerfi'));
              if (c._hasFerda) svc.push(pill('🚌', '#e0f2fe', '#0369a1', '#bae6fd', 'Ferðaþjónusta'));
              if (!svc.length) svc.push('<span style="color:#cbd2dc;font-size:11px">—</span>');
              const addr = c.heimilisfang || '';
              const post = (c.postnumer && !addr.includes(String(c.postnumer))) ? `<span class="_post">${esc(c.postnumer)}</span>` : '';
              const nameStack =
                `<span class="_co">${c.review_flag ? '<span title="' + esc(c.review_note || 'Til skoðunar') + '" style="color:#c77a16;margin-right:4px">⚑</span>' : ''}${esc(c.nafn || '—')}</span>` +
                (editing ? eInput('kennitala', c.kennitala) : `<span class="_kt">${esc(fmtKt(c.kennitala) || '—')}</span>`) +
                (c.review_flag && c.review_note ? `<span class="_rvnote" title="${esc(c.review_note)}">${esc(c.review_note)}</span>` : '');
              const nameCell = state.selectMode
                ? `<div style="display:flex;align-items:center;gap:7px;min-width:0"><input type="checkbox" class="_av-sel" data-co-id="${c.id}" ${state.selected.has(c.id) ? 'checked' : ''} onclick="event.stopPropagation()" style="margin:0;width:15px;height:15px;flex:none"><div style="min-width:0;flex:1">${nameStack}</div></div>`
                : nameStack;
              return `
                <tr class="_av-row" data-co-id="${c.id}" tabindex="0">
                  <td class="_av-namecell">${nameCell}</td>
                  <td class="_av-addrcell" title="${esc(addr)}">${editing ? eInput('heimilisfang', addr) : `<span class="_addr">${post}${esc(addr || '—')}</span>`}</td>
                  <td class="mono">${editing ? eInput('simi', c.simi) : esc(c.simi || c.farsimi || '—')}</td>
                  <td class="num${c._unitCount > 0 ? '' : ' tom'}">${c._unitCount || '·'}</td>
                  <td><span class="_av-svc">${svc.join('')}</span></td>
                  <td>${docBadge(c)}</td>
                  <td class="center"><span class="_av-last">${yTag('📝', (c._last || {}).rep, (c._last || {}).repVia, 'Síðasta úttektarskýrsla')}${yTag('🧾', (c._last || {}).inv, (c._last || {}).invVia, 'Síðasti úttektarreikningur')}</span></td>
                  <td class="_av-notacell" onclick="event.stopPropagation()"><input class="_av-note _note" data-co-id="${c.id}" value="${esc(c.athugasemdir || '')}" placeholder="···" title="${esc(c.athugasemdir || 'Athugasemd — vistast sjálfkrafa')}"></td>
                  <td class="right" onclick="event.stopPropagation()"><span class="_av-act">
                    ${editing ? `
                    <button class="_av-esave" data-co-id="${c.id}" type="button" title="Vista breytingar" style="padding:3px 9px;border:1px solid #86efac;background:#16a34a;color:#fff;border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">✓ Vista</button>
                    <button class="_av-ecancel" type="button" title="Hætta við" style="padding:3px 7px;border:1px solid #cbd5e1;background:#fff;color:#64748b;border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">✕</button>
                    ` : `
                    <button class="_av-edit" data-co-id="${c.id}" type="button" title="Breyta kt / heimilisfangi / síma" style="padding:3px 7px;border:1px dashed #cbd5e1;background:#fff;color:#94a3b8;border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">✏</button>
                    <button class="_av-flag" data-co-id="${c.id}" type="button" title="${c.review_flag?'Afmerkja (til skoðunar)':'Merkja til skoðunar + nóta'}" style="padding:3px 7px;border:1px ${c.review_flag?'solid #fcd34d':'dashed #cbd5e1'};background:${c.review_flag?'#fef3c7':'#fff'};color:${c.review_flag?'#b45309':'#94a3b8'};border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">⚑</button>
                    <button class="_av-toggle" data-co-id="${c.id}" data-svc="ars" data-action="${c._hasArs?'remove':'add'}" type="button" title="${c._hasArs?'Fjarlægja úr fyrirtækjaþj.':'Skrá í fyrirtækjaþjónustu'}" style="padding:3px 7px;border:1px ${c._hasArs?'solid #fecaca':'dashed #cbd5e1'};background:${c._hasArs?'#fee2e2':'#fff'};color:${c._hasArs?'#b91c1c':'#94a3b8'};border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">🔥</button>
                    <button class="_av-toggle" data-co-id="${c.id}" data-svc="bru" data-action="${c._hasBru?'remove':'add'}" type="button" title="${c._hasBru?'Fjarlægja úr brunakerfi':'Skrá í brunakerfi'}" style="padding:3px 7px;border:1px ${c._hasBru?'solid #93c5fd':'dashed #cbd5e1'};background:${c._hasBru?'#dbeafe':'#fff'};color:${c._hasBru?'#1d4ed8':'#94a3b8'};border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">🚨</button>
                    <button class="_av-toggle" data-co-id="${c.id}" data-svc="ferda" data-action="${c._hasFerda?'remove':'add'}" type="button" title="${c._hasFerda?'Fjarlægja úr ferðaþjónustu':'Skrá í ferðaþjónustu'}" style="padding:3px 7px;border:1px ${c._hasFerda?'solid #7dd3fc':'dashed #cbd5e1'};background:${c._hasFerda?'#e0f2fe':'#fff'};color:${c._hasFerda?'#0369a1':'#94a3b8'};border-radius:6px;cursor:pointer;font:inherit;font-size:10.5px;font-weight:700">🚌</button>
                    `}
                  </span></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        </div>
        <div class="_tfoot">
          <span>SÝNI ${totalRows ? (p0 + 1) : 0}–${Math.min(p0 + PER, totalRows)} AF ${totalRows}</span>
          <div class="_pager">
            <button id="_av-pgprev" type="button" ${state._page <= 1 ? 'disabled' : ''}>Fyrri</button>
            <button id="_av-pgnext" type="button" ${state._page >= pages ? 'disabled' : ''}>Næsta</button>
          </div>
        </div>
      </div>
    `;
  }

  // ── Subscribe / unsubscribe — write to AppSettings ─────────────────────
  // Uses the same storage keys + structure as patches 153 (arsskodun) and
  // 147 (brunakerfi). Minimal entry on add — user can fill details in the
  // service workspace afterwards. Remove deletes the key entirely so the
  // customer drops out of the service workspace.
  // ⚑ Flag-for-review + per-row note. Persists to fyrirtaeki.review_flag/
  // review_note (additive cols) and updates the in-memory Companies.list so the
  // marker shows immediately. The note is kept even when un-flagged, so
  // re-flagging remembers it.
  async function toggleReview(coId) {
    const SB = (window.DB && window.DB.sb);
    const company = (window.Companies && Companies.list || []).find(c => +c.id === +coId);
    if (!company) return;
    const turningOn = !company.review_flag;
    if (turningOn) {
      const inp = prompt('Til skoðunar — ástæða / nóta (valfrjálst):', company.review_note || '');
      if (inp === null) return; // cancelled
      company.review_note = inp.trim();
    }
    company.review_flag = turningOn;
    if (SB) {
      try {
        await SB.from('fyrirtaeki')
          .update({ review_flag: turningOn, review_note: company.review_note || null })
          .eq('id', coId);
      } catch (e) { if (window.Toast && Toast.show) Toast.show('Náði ekki að vista: ' + (e.message || e)); }
    }
    const main = document.getElementById('_av-main'); if (main) render(main);
  }

  // Bulk soft-archive (deleted_at) for the selected rows. Guardrail: NEVER
  // archive a customer that has a samningur or any document on file, and never
  // hard-delete. Skipped rows are reported so nothing silently disappears.
  async function bulkArchive() {
    const SB = (window.DB && window.DB.sb);
    const ids = Array.from(state.selected);
    if (!ids.length) return;
    const list = (window.Companies && Companies.list) || [];
    const byId = new Map(list.map(c => [+c.id, c]));
    const protectedIds = [], doIds = [];
    ids.forEach(id => {
      const c = byId.get(+id);
      const docs = c && docsFor(c);
      // protect anyone with a samningur or any document on file
      if (docs && (docs.samningur || docs.total > 0)) protectedIds.push(id);
      else doIds.push(id);
    });
    let msg = `Geyma (mjúkt) ${doIds.length} viðskiptavin${doIds.length === 1 ? '' : 'i'}? Þeir hverfa úr listanum en er hægt að endurheimta.`;
    if (protectedIds.length) msg += `\n\n⚠ ${protectedIds.length} sleppt — hafa samning/skjöl (má ekki geyma).`;
    if (!doIds.length) { alert('Engir valdir mega fara í geymslu — allir hafa samning/skjöl.'); return; }
    if (!confirm(msg)) return;
    let ok = 0, err = 0;
    for (const id of doIds) {
      try {
        const r = await SB.from('fyrirtaeki').update({ deleted_at: new Date().toISOString() }).eq('id', id);
        if (r.error) throw r.error;
        ok++;
        const idx = list.findIndex(c => +c.id === +id);
        if (idx >= 0) list.splice(idx, 1); // drop from the live cache
        state.selected.delete(id);
      } catch (e) { err++; console.warn('[allir-vidsk] archive failed', id, e); }
    }
    if (window.Toast && Toast.show) Toast.show(`📦 ${ok} sett í geymslu${err ? ' · ' + err + ' mistókust' : ''}${protectedIds.length ? ' · ' + protectedIds.length + ' vernduð' : ''}`);
    if (!state.selected.size) state.selectMode = false;
    const main = document.getElementById('_av-main'); if (main) render(main);
  }

  // ── Merge two duplicate companies ──────────────────────────────────────
  // The owner picks two rows that are the SAME customer; this folds the loser
  // into the keeper: equipment (uttaeki/lanstaeki, keyed by client NAME) and
  // name-based history move to the keeper's name, documents/beiðnir move to the
  // keeper's base id, the keeper's empty fields are filled from the loser, the
  // service marks move over, and the loser is soft-archived (deleted_at) with a
  // note — recoverable, nothing hard-deleted.
  function openMergeModal(idA, idB) {
    const list = (window.Companies && Companies.list) || [];
    const a = list.find(c => +c.id === +idA), b = list.find(c => +c.id === +idB);
    if (!a || !b) { if (window.Toast && Toast.show) Toast.show('Fann ekki bæði fyrirtækin'); return; }
    // Default keeper = more units, then more complete, then lower id (older).
    const score = c => (c._unitCount || 0) * 100 + ['kennitala','netfang','heimilisfang','simi','customer_base_id'].filter(k => c[k]).length;
    let keeperId = (score(a) > score(b)) ? a.id : (score(b) > score(a)) ? b.id : Math.min(a.id, b.id);

    document.getElementById('_av-merge')?.remove();
    const m = document.createElement('div');
    m.id = '_av-merge';
    m.style.cssText = 'position:fixed;inset:0;z-index:100060;display:flex;align-items:flex-start;justify-content:center;padding-top:5vh;font-family:inherit';
    const col = (c, sel) => `
      <label style="flex:1;min-width:0;display:block;border:2px solid ${sel ? '#6d28d9' : '#e2e8f0'};background:${sel ? '#faf5ff' : '#fff'};border-radius:11px;padding:12px 13px;cursor:pointer">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <input type="radio" name="_av-keep" value="${c.id}" ${sel ? 'checked' : ''} style="width:16px;height:16px">
          <span style="font-weight:800;font-size:14px;color:#0f172a">${esc(c.nafn || '—')}</span>
        </div>
        <div style="font-size:11.5px;color:#64748b;line-height:1.7">
          ${c.kennitala ? 'kt. ' + esc(fmtKt(c.kennitala)) + '<br>' : '<span style=\"color:#cbd5e1\">engin kt</span><br>'}
          ${c.heimilisfang ? '📍 ' + esc(c.heimilisfang) + '<br>' : ''}
          ${c.simi || c.farsimi ? '📞 ' + esc(c.simi || c.farsimi) + '<br>' : ''}
          ${c.netfang ? '✉️ ' + esc(c.netfang) + '<br>' : ''}
          🧯 <strong style="color:#0f172a">${c._unitCount || 0}</strong> tæki · ${docBadge(c)}
        </div>
        <div style="margin-top:6px;font-size:10.5px;font-weight:700;color:${sel ? '#6d28d9' : '#94a3b8'}">${sel ? '✓ HELDUR — hitt færist hingað' : 'fer í geymslu'}</div>
      </label>`;
    const draw = () => {
      m.querySelector('#_av-merge-cols').innerHTML = col(a, keeperId === a.id) + col(b, keeperId === b.id);
      const keeper = keeperId === a.id ? a : b, loser = keeperId === a.id ? b : a;
      m.querySelector('#_av-merge-preview').innerHTML =
        `<strong>${esc(loser.nafn)}</strong> (${loser._unitCount || 0} tæki) sameinast inn í <strong>${esc(keeper.nafn)}</strong>. ` +
        `Tæki, skjöl og saga færast yfir; ${esc(loser.nafn)} fer í geymslu (endurheimtanlegt).` +
        (loser._unitCount ? `<div style="margin-top:5px;color:#b45309">⚠ ${loser._unitCount} tæki verða endurmerkt á „${esc(keeper.nafn)}“.</div>` : '');
      m.querySelectorAll('input[name="_av-keep"]').forEach(r => r.onchange = () => { keeperId = +r.value; draw(); });
    };
    m.innerHTML = `
      <div style="position:absolute;inset:0;background:rgba(15,23,42,.55)"></div>
      <div style="position:relative;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.3);width:min(620px,calc(100vw - 20px));max-height:90vh;overflow-y:auto">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:15px 20px;border-bottom:1px solid #e2e8f0">
          <h3 style="margin:0;font-size:17px;font-weight:700">🔗 Sameina tvö fyrirtæki</h3>
          <button id="_av-merge-x" style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer">✕</button>
        </div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:13px">
          <div style="font-size:12.5px;color:#475569">Veldu hvort skráin á að <strong>halda</strong> — hin sameinast inn í hana og fer í geymslu.</div>
          <div id="_av-merge-cols" style="display:flex;gap:12px;align-items:stretch"></div>
          <div id="_av-merge-preview" style="font-size:12px;color:#334155;background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;padding:10px 12px;line-height:1.5"></div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;padding:13px 20px;border-top:1px solid #e2e8f0">
          <button id="_av-merge-cancel" style="padding:9px 16px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>
          <button id="_av-merge-go" style="padding:9px 18px;border:none;background:#6d28d9;color:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">🔗 Sameina núna</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    draw();
    const close = () => m.remove();
    m.querySelector('#_av-merge-x').onclick = close;
    m.querySelector('#_av-merge-cancel').onclick = close;
    m.querySelector('#_av-merge-go').onclick = async () => {
      const go = m.querySelector('#_av-merge-go'); go.disabled = true; go.textContent = 'Sameina…';
      const keeper = keeperId === a.id ? a : b, loser = keeperId === a.id ? b : a;
      const res = await doMerge(keeper, loser);
      close();
      if (res && res.ok) {
        if (window.Toast && Toast.show) Toast.show('🔗 Sameinað → ' + keeper.nafn + (res.units ? ' (' + res.units + ' tæki færð)' : ''));
        state.selected.clear(); state.selectMode = false;
      } else if (window.Toast && Toast.show) Toast.show('Sameining mistókst: ' + ((res && res.error) || 'óþekkt'));
      const main = document.getElementById('_av-main'); if (main) render(main);
    };
  }

  async function doMerge(keeper, loser) {
    const SB = (window.DB && window.DB.sb); if (!SB) return { error: 'DB ekki tilbúið' };
    try {
      let units = 0;
      // 1) Equipment + name-based history → keeper's name.
      if (loser.nafn && keeper.nafn && loser.nafn !== keeper.nafn) {
        const moved = await SB.from('uttaeki').update({ client: keeper.nafn }).eq('client', loser.nafn).select('id');
        units = (moved && moved.data && moved.data.length) || 0;
        await SB.from('lanstaeki').update({ client: keeper.nafn }).eq('client', loser.nafn);
        for (const [tbl, colName] of [['solur', 'customer_nafn'], ['verkbeidnir', 'customer'], ['sala_transactions', 'customer']]) {
          try { await SB.from(tbl).update({ [colName]: keeper.nafn }).eq(colName, loser.nafn); } catch (_) {}
        }
      }
      // 2) Documents + beiðnir → keeper's base id (only when both have one).
      if (loser.customer_base_id && keeper.customer_base_id && loser.customer_base_id !== keeper.customer_base_id) {
        try { await SB.from('customer_documents').update({ customer_base_id: keeper.customer_base_id }).eq('customer_base_id', loser.customer_base_id); } catch (_) {}
        try { await SB.from('thjonustubeidni').update({ customer_base_id: keeper.customer_base_id }).eq('customer_base_id', loser.customer_base_id); } catch (_) {}
      }
      // 3) Fill the keeper's empty identity/contact fields from the loser.
      const fill = {};
      ['kennitala', 'heimilisfang', 'simi', 'farsimi', 'netfang', 'tengiliður', 'customer_base_id'].forEach(k => {
        if ((keeper[k] == null || keeper[k] === '') && loser[k]) fill[k] = loser[k];
      });
      if (Object.keys(fill).length) { try { await SB.from('fyrirtaeki').update(fill).eq('id', keeper.id); Object.assign(keeper, fill); } catch (_) {} }
      // 4) Move service-subscription marks (AppSettings maps keyed by company id).
      if (window.AppSettings && window.AppSettings.save) {
        const patch = {};
        ['arsskodun_customers', 'brunakerfi_customers', 'ferdathjonusta_customers'].forEach(key => {
          const map = window.AppSettings.path(key) || {};
          const lo = map[String(loser.id)];
          if (lo) {
            const sub = {};                       // þröngt: TVÖ id, ekki 808
            if (!map[String(keeper.id)]) sub[String(keeper.id)] = lo;
            sub[String(loser.id)] = null;
            patch[key] = sub;
          }
        });
        if (Object.keys(patch).length) { try { await window.AppSettings.save(patch); } catch (_) {} }
      }
      // 5) Soft-archive the loser with a merge note (recoverable).
      const stamp = new Date().toISOString();
      const note = '[sameinað ' + stamp.slice(0, 10) + '] → ' + keeper.nafn + ' (#' + keeper.id + ')';
      try { await SB.from('fyrirtaeki').update({ deleted_at: stamp, review_flag: false, review_note: note }).eq('id', loser.id); } catch (_) {}
      // 6) Drop the loser from the in-memory list so the UI updates immediately.
      const list = (window.Companies && Companies.list) || [];
      const li = list.findIndex(c => +c.id === +loser.id); if (li >= 0) list.splice(li, 1);
      return { ok: true, units };
    } catch (e) { return { error: (e && e.message) || String(e) }; }
  }

  // Bulk tag selected rows as Ferðaþjónusta (additive AppSettings map, like the
  // per-row 🚌 toggle).
  async function bulkTagFerda() {
    if (!window.AppSettings || !window.AppSettings.save) { alert('AppSettings ekki tilbúið'); return; }
    const ids = Array.from(state.selected);
    if (!ids.length) return;
    if (!confirm(`Merkja ${ids.length} viðskiptavin${ids.length === 1 ? '' : 'i'} sem Ferðaþjónustu?`)) return;
    // Þröngur patch — AÐEINS þau id sem verið er að merkja. Að senda alla vörpuna
    // af-merkti þögult alla sem höfðu verið merktir annars staðar frá hleðslu.
    const cur = window.AppSettings.path('ferdathjonusta_customers') || {};
    const map = {};
    ids.forEach(id => {
      map[String(id)] = Object.assign({}, cur[String(id)] || {}, { co_id: +id, flexible: true, marked_at: (cur[String(id)] && cur[String(id)].marked_at) || new Date().toISOString().slice(0, 10) });
    });
    await window.AppSettings.save({ ferdathjonusta_customers: map });
    if (window.Toast && Toast.show) Toast.show(`🚌 ${ids.length} merkt sem Ferðaþjónusta`);
    state.selected.clear(); state.selectMode = false;
    const main = document.getElementById('_av-main'); if (main) render(main);
  }

  // Athugasemdir (notes) auto-save — debounced 800ms, writes to fyrirtaeki.athugasemdir
  // and updates the in-memory Companies.list so the next render shows the latest value.
  const _noteTimers = {};
  async function saveNote(coId, text) {
    const SB = (window.DB && window.DB.sb);
    const val = text.trim() || null;
    const list = (window.Companies && Companies.list) || [];
    const idx = list.findIndex(c => +c.id === +coId);
    if (idx >= 0) list[idx].athugasemdir = val;
    if (SB) {
      try {
        const r = await SB.from('fyrirtaeki').update({ athugasemdir: val }).eq('id', coId);
        if (r && r.error) throw r.error;
      } catch (e) { console.warn('[allir-vidsk] saveNote failed', e); return false; }
    }
    return true;
  }

  // Inline-edit save → write kt / heimilisfang / sími to fyrirtaeki and update
  // Companies.list so the change shows immediately.
  async function saveEdit(coId, vals) {
    const SB = (window.DB && window.DB.sb);
    const company = (window.Companies && Companies.list || []).find(c => +c.id === +coId);
    const upd = {
      kennitala: (vals.kennitala || '').trim() || null,
      heimilisfang: (vals.heimilisfang || '').trim() || null,
      simi: (vals.simi || '').trim() || null
    };
    if (company) Object.assign(company, upd);
    if (SB && company) {
      try { await SB.from('fyrirtaeki').update(upd).eq('id', coId); if (window.Toast && Toast.show) Toast.show('✓ Vistað'); }
      catch (e) { if (window.Toast && Toast.show) Toast.show('Náði ekki að vista: ' + (e.message || e)); }
    }
    state.editId = null;
    const main = document.getElementById('_av-main'); if (main) render(main);
  }

  async function toggleService(coId, svc, action) {
    if (!window.AppSettings || !window.AppSettings.save) {
      alert('AppSettings ekki tilbúið');
      return;
    }
    const STORAGE_KEY = svc === 'ars' ? 'arsskodun_customers'
                      : svc === 'ferda' ? 'ferdathjonusta_customers'
                      : 'brunakerfi_customers';
    const svcLabelOf = s => s === 'ars' ? 'fyrirtækjaþjónustu' : s === 'ferda' ? 'ferðaþjónustu' : 'brunakerfi';
    const map = Object.assign({}, window.AppSettings.path(STORAGE_KEY) || {});
    const company = (window.Companies && Companies.list || []).find(c => +c.id === +coId);
    const name = (company && company.nafn) || ('co#' + coId);

    if (action === 'add') {
      const svcLabel = svcLabelOf(svc);
      if (!confirm('Skrá "' + name + '" í ' + svcLabel + '?')) return;
      if (svc === 'ars') {
        // Minimal arsskodun entry — equipment object is what _hasArs checks.
        map[String(coId)] = Object.assign({}, map[String(coId)] || {}, {
          equipment: (map[String(coId)] && map[String(coId)].equipment) || {},
          inspect_month: (map[String(coId)] && map[String(coId)].inspect_month) || 0,
          last_year_inspected: (map[String(coId)] && map[String(coId)].last_year_inspected) || 0
        });
      } else if (svc === 'ferda') {
        // Ferðaþjónusta: no contract, flexible drop-offs. Any truthy entry
        // flags _hasFerda; serviced units route through seasonal_job (§4).
        map[String(coId)] = Object.assign({}, map[String(coId)] || {}, {
          co_id: +coId,
          flexible: true,
          marked_at: (map[String(coId)] && map[String(coId)].marked_at) || new Date().toISOString().slice(0, 10)
        });
      } else {
        // Minimal brunakerfi entry.
        map[String(coId)] = Object.assign({}, map[String(coId)] || {}, {
          co_id: +coId,
          inspect_month: (map[String(coId)] && map[String(coId)].inspect_month) || 0,
          unit_count: (map[String(coId)] && map[String(coId)].unit_count) || 0
        });
      }
    } else if (action === 'remove') {
      const svcLabel = svcLabelOf(svc);
      if (!confirm('Fjarlægja "' + name + '" úr ' + svcLabel + '?\n\n(Gögn um búnað haldast — bara samningsmerkið fer.)')) return;
      // AppSettings.save() deep-merges; delete doesn't propagate. Set to
      // null instead — _hasArs requires .equipment and _hasBru is !!bru
      // so null is treated as "not subscribed".
      map[String(coId)] = null;
    }
    const ok = await window.AppSettings.save({ [STORAGE_KEY]: map });
    if (!ok) { alert('Vista mistókst'); return; }
    // Re-render to reflect the new state
    const main = document.getElementById('_av-main');
    if (main) render(main);
  }

  // ── Open the unified customer detail page (patch 158) ─────────────────
  // This is the platform's customer view — base info + service subscriptions
  // + units + notes in one place. Falls back to the legacy opener if
  // patch 158 isn't loaded for any reason.
  function openDetail(coId) {
    if (window.VidskDetail && typeof window.VidskDetail.show === 'function') {
      return window.VidskDetail.show(coId);
    }
    // Fallback: legacy company detail
    if (window._openCompanySafe) return window._openCompanySafe(coId);
    if (window.Companies && typeof Companies.openDetail === 'function') return Companies.openDetail(coId);
    console.warn('[allir-vidsk] no detail opener available for', coId);
  }

  // ── Boot ───────────────────────────────────────────────────────────────
  function boot() {
    injectSidebar();
    ensureView();
    patchSwitchView();
    // Re-inject sidebar a couple of times — patch 68 reorders the nav
    setTimeout(injectSidebar, 1200);
    setTimeout(injectSidebar, 2500);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Expose for debugging
  window.AllirVidsk = { show, openDetail, getAll, version: 'v1' };
  console.log('[allir-vidsk v1] installed');
})();
/* === END ALLIR VIÐSKIPTAVINIR === */
