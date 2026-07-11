/* === VERKBORÐ v1 — eitt sameinað vinnuborð ===
 *
 * Sameinar gömlu efstu listana (Verkefni #145 · Þjónustuverk #172 ·
 * Beiðnir/Þjónustuver #182 · Eftirfylgni #194) + foldar Verkdagbók #04 inn —
 * í EITT hratt verkborð. Hugsað eins og léttur verkefna-/CRM-/tikket-listi:
 *
 *   • HRAÐ-skráning efst: skrifaðu og ýttu á Enter → komið inn. Veldu tegund
 *     með einum smelli (Tilboð / Póstur / Skýrsla / Heimsókn / Annað).
 *   • Allt á einum stað, raðað eftir því sem skiptir máli: áríðandi + á
 *     gjalddaga efst. Rauður dagsetningarstimpill þegar útrunnið.
 *   • Biðraðir: Í dag · Allt opið · Lokað  +  tegunda-síur.
 *   • Smelltu á röð → opnast ritill (titill, nótur, tegund, staða, forgangur,
 *     gjalddagi/mikilvæg dagsetning, viðskiptavinur). Smelltu á stöðu-depil til
 *     að færa áfram. Stjarna = áríðandi.
 *   • Verkdagbókar-færslur (óloknar) birtast inni í borðinu (📓) — opnast í
 *     Verkdagbók til að breyta; hægt að haka „Klárað“ beint.
 *   • ✨ Tillaga: endurnýtir /api/tv-summary (sama Haiku-endapunkt og #182) til
 *     að fá eina næsta-skref línu. Dýpri AI-hjálp kemur í fasa 2.
 *
 * Gögn: BEINT í `thjonustubeidni` töfluna (sama og Beiðnir #182 notar — engin
 * ný tafla, engin tvíföldun). Verkdagbók lesin live úr `verkdagbok`.
 *
 * Við fyrstu opnun felur borðið gömlu fjóra listana úr valmyndinni (bætir
 * 'verkefni'/'thjonustuverk'/'thjonustuver'/'eftirfylgni' í sidebar_hidden) og
 * setur sig efst — allt afturkræft í Stillingar → Valmynd. Gögnin lifa áfram.
 */
(() => {
  if (window.__verkbordInstalled) return;
  window.__verkbordInstalled = true;

  const VIEW_ID = 'view-verkbord';
  const NAV_KEY = 'verkbord';

  // ── helpers ──────────────────────────────────────────────────────────────
  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[verkbord]', m); }
  function nowIso() { return new Date().toISOString(); }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = (iso instanceof Date) ? iso : new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  }
  function currentUser() {
    try {
      const p = window.UserAuth && UserAuth.getProfile && UserAuth.getProfile();
      if (p && p.nafn) return p.nafn;
      const u = window.UserAuth && UserAuth.getUser && UserAuth.getUser();
      if (u && u.email) return u.email.split('@')[0];
    } catch (_) {}
    return 'Slökkvitæki';
  }

  // ── reference data ───────────────────────────────────────────────────────
  // Unified type vocabulary. Includes the legacy keys patch #182 wrote so old
  // rows still get a sensible chip.
  const TYPES = {
    tilbod:             { label: 'Tilboð',      emoji: '💰', color: '#1d4ed8', bg: '#eff6ff' },
    email:              { label: 'Póstur',      emoji: '✉️', color: '#7c3aed', bg: '#f5f3ff' },
    skyrsla:            { label: 'Skýrsla',     emoji: '📄', color: '#0891b2', bg: '#ecfeff' },
    heimsokn:           { label: 'Heimsókn',    emoji: '🚐', color: '#16a34a', bg: '#f0fdf4' },
    hringja:            { label: 'Hringja',     emoji: '📞', color: '#d97706', bg: '#fffbeb' },
    samningur:          { label: 'Samningur',   emoji: '📝', color: '#16a34a', bg: '#f0fdf4' },
    skjalabeidni:       { label: 'Skjöl',       emoji: '📁', color: '#7c3aed', bg: '#f5f3ff' },
    verkdagbok:         { label: 'Verkdagbók',  emoji: '📓', color: '#92400e', bg: '#fef3c7' },
    annad:              { label: 'Annað',       emoji: '•',  color: '#64748b', bg: '#f1f5f9' },
    // legacy (#182):
    skodun_tilbod:      { label: 'Skoðun & tilboð',  emoji: '💰', color: '#1d4ed8', bg: '#eff6ff' },
    nyr_samningur:      { label: 'Nýr samningur',    emoji: '📝', color: '#16a34a', bg: '#f0fdf4' },
    uttekt_eftirfylgni: { label: 'Úttekt / eftirfylgni', emoji: '🔎', color: '#0891b2', bg: '#ecfeff' }
  };
  function typeDef(t) { return TYPES[t] || TYPES.annad; }
  function typeChip(t) {
    const d = typeDef(t);
    return '<span class="vb-type" style="color:' + d.color + ';background:' + d.bg + ';border-color:' + d.color + '33">' + d.emoji + ' ' + esc(d.label) + '</span>';
  }
  // Tegunda-síur → hvaða raun-type gildi falla undir.
  const TYPE_GROUP = {
    tilbod:    ['tilbod', 'skodun_tilbod'],
    email:     ['email'],
    skyrsla:   ['skyrsla', 'uttekt_eftirfylgni'],
    heimsokn:  ['heimsokn'],
    verkdagbok:['verkdagbok'],
    hringja:   ['hringja']
  };
  const FILTERS = [
    { v: 'tilbod',     label: '💰 Tilboð' },
    { v: 'email',      label: '✉️ Póstur' },
    { v: 'skyrsla',    label: '📄 Skýrslur' },
    { v: 'heimsokn',   label: '🚐 Heimsóknir' },
    { v: 'verkdagbok', label: '📓 Verkdagbók' },
    { v: 'hringja',    label: '📞 Hringja' }
  ];
  // Hröðu tegundir í skráningarstikunni.
  const ADD_TYPES = ['annad', 'tilbod', 'email', 'skyrsla', 'heimsokn'];

  // ── Merki/tags (2026-07-10, ósk Agnars — sama sett og gamla Þjónustuverk-borðið)
  // Geymd í thjonustubeidni.tags (jsonb fylki, additive dálkur). Mörg merki per
  // beiðni; sían efst telur og síar; ritillinn togglar.
  const TAGS = {
    gera_tilbod:        { label: 'Gera tilboð',        emoji: '📄', color: '#7c3aed' },
    thjonustusamningur: { label: 'Þjónustusamningur',  emoji: '📝', color: '#16a34a' },
    bokhald:            { label: 'Bókhald',            emoji: '📊', color: '#1d4ed8' },
    kvortun:            { label: 'Kvörtun',            emoji: '😠', color: '#dc2626' },
    hringja:            { label: 'Hringja',            emoji: '📞', color: '#d97706' },
    brunakerfi:         { label: 'Brunakerfi',         emoji: '🔥', color: '#ea580c' },
    eftir_ad_rukka:     { label: 'Eftir að rukka',     emoji: '💰', color: '#be123c' },
    thjonusta:          { label: 'Þjónusta',           emoji: '🔧', color: '#0d9488' },
    senda_tolvupost:    { label: 'Senda tölvupóst',    emoji: '✉️', color: '#0369a1' }
  };
  const TAG_ORDER = Object.keys(TAGS);

  // ── Flokkarnir fimm (Þjónustuborð v2, 2026-07-10) ─────────────────────────
  // Aðal-flokkun borðsins — geymd í thjonustubeidni.flokkur (additive dálkur,
  // batch-flokkað í grunninum með leitarorðum/merkjum/tegund; ritillinn breytir).
  // MERKIN (TAGS) lifa áfram sem auka-merkingar í ritlinum.
  const FLOKKAR = {
    tilbod:     { label: 'Tilboð',     emoji: '💰', color: '#1d4ed8' },
    thjonusta:  { label: 'Þjónusta',   emoji: '🔧', color: '#0d9488' },
    brunakerfi: { label: 'Brunakerfi', emoji: '🔥', color: '#ea580c' },
    rukkun:     { label: 'Rukkun',     emoji: '💸', color: '#be123c' },
    samskipti:  { label: 'Samskipti',  emoji: '📞', color: '#d97706' }
  };
  const FLOKK_ORDER = Object.keys(FLOKKAR);
  function flokkDef(f) { return FLOKKAR[f] || { label: 'Annað', emoji: '•', color: '#64748b' }; }
  function rowFlokk(r) { return (r && r.flokkur && FLOKKAR[r.flokkur]) ? r.flokkur : ''; }
  function flokkChip(f) {
    const d = flokkDef(f);
    return '<span style="display:inline-block;padding:2px 9px;border-radius:99px;font-size:10.5px;font-weight:700;' +
      'color:' + d.color + ';background:' + d.color + '14;border:1px solid ' + d.color + '44;white-space:nowrap">' +
      d.emoji + ' ' + esc(d.label) + '</span>';
  }
  // Merki sem segja það sama og flokkur raðarinnar eru falin á röðinni.
  const TAG_TO_FLOKK = {
    thjonusta: 'thjonusta', thjonustusamningur: 'thjonusta', brunakerfi: 'brunakerfi',
    gera_tilbod: 'tilbod', bokhald: 'rukkun', eftir_ad_rukka: 'rukkun',
    hringja: 'samskipti', senda_tolvupost: 'samskipti'
  };

  // ── Þjónustuverk v3 útlit (2026-07-10, dc.html referens frá Agnari) ────────
  // Dökk-metal chippar (spec: „Dark-metal control surface"), 5px vinstri-rönd
  // eftir flokki, metallísk STAÐA-pilla. Allir litir beint úr Thjonustuverkv3.
  const V3_METAL = 'background:linear-gradient(180deg,#2f333b,#1b1e24 60%,#111318);border:1px solid #0a0b0d;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)';
  const V3_METAL_ON = 'background:linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%);border:1px solid #0a0b0d;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)';
  const V3_CARD = 'border-radius:16px;border:1px solid rgba(20,24,34,.1);background:linear-gradient(180deg,#ffffff,#f5f7fb);box-shadow:0 16px 38px -20px rgba(15,23,42,.36),inset 0 2px 0 rgba(255,255,255,.95)';
  // Merkja-litir á dökku (spec §Category chip text colors)
  const TAG_DK = {
    gera_tilbod: '#b79cff', thjonustusamningur: '#c3ccd8', bokhald: '#8fb0ff',
    kvortun: '#ff8a82', hringja: '#f2c24e', brunakerfi: '#ff8a82',
    eftir_ad_rukka: '#ff8a82', thjonusta: '#4fd08a', senda_tolvupost: '#8fb0ff'
  };
  // 5px vinstri-röndin litast af FLOKKI raðarinnar (mynstrið í referensinum).
  const RAIL = { tilbod: '#2f5fe0', thjonusta: '#22b063', brunakerfi: '#df2c2c', rukkun: '#be123c', samskipti: '#e0a93e' };
  function railColor(r) { return RAIL[rowFlokk(r)] || '#8a929e'; }
  // Sýnileg merki raðar = merki notandans ∪ merki leidd af flokknum, í TAG_ORDER röð.
  const FLOKK_TO_TAG = { tilbod: 'gera_tilbod', thjonusta: 'thjonusta', brunakerfi: 'brunakerfi', rukkun: 'eftir_ad_rukka', samskipti: 'senda_tolvupost' };
  function dispTags(r) {
    const set = {};
    rowTags(r).forEach(t => { set[t] = 1; });
    const f = FLOKK_TO_TAG[rowFlokk(r)];
    if (f) set[f] = 1;
    return TAG_ORDER.filter(t => set[t]);
  }
  function dkChip(t, act, rid) {
    const d = TAGS[t]; if (!d) return '';
    return '<span' + (act ? ' data-act="' + act + '" data-tag="' + t + '"' + (rid != null ? ' data-id="' + esc(rid) + '"' : '') : '') +
      ' style="display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:104px;font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:7px;' + V3_METAL + ';color:' + (TAG_DK[t] || '#c3ccd8') + ';white-space:nowrap;cursor:pointer">' + d.emoji + ' ' + esc(d.label) + '</span>';
  }
  // Metallíska STAÐA-pillan (Ný = blá; beint úr referensinum).
  const PILL_GRAD = {
    nytt:      'linear-gradient(145deg,#5a86e0,#2f5fe0 42%,#1a3a8c 72%,#2d55c4)',
    i_vinnslu: 'linear-gradient(145deg,#8f77e8,#6d28d9 42%,#3d1a8c 72%,#5b2dc4)',
    bedid:     'linear-gradient(145deg,#e0b25a,#d97706 42%,#8c5a1a 72%,#c4952d)',
    tilbuid:   'linear-gradient(150deg,#2bbf6c,#0f6e3a)',
    lokad:     'linear-gradient(150deg,#2bbf6c,#0f6e3a)'
  };
  function stadaPill(r) {
    const st = statusDef(r.status);
    const lbl = r.status === 'nytt' ? 'Ný' : st.label;
    return '<span data-act="status" data-id="' + esc(r.id) + '" title="Smella til að færa stöðuna áfram" ' +
      'style="font-size:11px;font-weight:600;padding:4px 12px;border-radius:8px;background:' + (PILL_GRAD[r.status] || PILL_GRAD.nytt) + ';color:#fff;border:1px solid #12296b;white-space:nowrap;cursor:pointer;' +
      'box-shadow:inset 0 1.5px 0 rgba(255,255,255,.4),inset 0 -2px 4px rgba(0,0,0,.24),0 2px 5px -2px rgba(20,30,60,.4);text-shadow:0 1px 1px rgba(0,0,0,.3);filter:saturate(.74)">' + esc(lbl) + '</span>';
  }
  function fmtDots(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  }

  function rowTags(r) {
    let t = r && r.tags;
    if (typeof t === 'string') { try { t = JSON.parse(t); } catch (_) { t = []; } }
    return Array.isArray(t) ? t.filter(x => TAGS[x]) : [];
  }
  function tagChip(t, small) {
    const d = TAGS[t]; if (!d) return '';
    return '<span style="display:inline-block;padding:' + (small ? '1px 7px' : '2px 9px') + ';border-radius:99px;font-size:' + (small ? '10px' : '10.5px') + ';font-weight:700;color:' + d.color + ';background:' + d.color + '14;border:1px solid ' + d.color + '44;white-space:nowrap">' + d.emoji + ' ' + esc(d.label) + '</span>';
  }

  const STATUSES = {
    nytt:      { label: 'Nýtt',      color: '#475569', dot: '#94a3b8' },
    i_vinnslu: { label: 'Í vinnslu', color: '#1d4ed8', dot: '#2563eb' },
    bedid:     { label: 'Beðið',     color: '#92400e', dot: '#d97706' },
    tilbuid:   { label: 'Tilbúið',   color: '#166534', dot: '#16a34a' },
    lokad:     { label: 'Lokað',     color: '#166534', dot: '#16a34a' }
  };
  const STATUS_ORDER = ['nytt', 'i_vinnslu', 'bedid', 'tilbuid', 'lokad'];
  function statusDef(s) { return STATUSES[s] || STATUSES.nytt; }
  function nextStatus(s) { const i = STATUS_ORDER.indexOf(s); return STATUS_ORDER[(i + 1) % STATUS_ORDER.length]; }

  const PRIORITIES = { lagur: 'Lágur', venjulegur: 'Venjulegur', har: 'Hár' };

  function dueInfo(iso) {
    if (!iso) return null;
    const d = new Date(iso); if (isNaN(d)) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    const diff = Math.round((dd - today) / 86400000);
    let label, overdue = false;
    if (diff < 0) { overdue = true; label = 'Fyrir ' + (-diff) + (-diff === 1 ? ' degi' : ' dögum'); }
    else if (diff === 0) label = 'Í dag';
    else if (diff === 1) label = 'Á morgun';
    else if (diff <= 7) label = 'Eftir ' + diff + ' daga';
    else label = fmtDate(iso);
    return { label, overdue, diff };
  }
  function isOpen(r) { return r.status !== 'lokad'; }
  function isOverdue(r) { if (!isOpen(r)) return false; const di = dueInfo(r.due_at); return !!(di && di.overdue); }
  function isToday(r) {
    if (!isOpen(r)) return false;
    if (r.important) return true;
    const di = dueInfo(r.due_at);
    return !!(di && di.diff <= 0);
  }

  // ── state ────────────────────────────────────────────────────────────────
  const QKEY = '_vb_queue', FKEY = '_vb_filter', SKEY = '_vb_sort', TGKEY = '_vb_tag', VMKEY = '_vb_viewmode';
  const state = {
    items: [],          // thjonustubeidni rows
    vd: [],             // open verkdagbok rows (folded in)
    companies: null,    // fyrirtaeki names for the datalist (lazy)
    loading: false,
    // Biðraðir Þjónustuborðs v2: 📥 Innhólf (post) · 📋 Verkefni (verk) · Lokað.
    // Gömul vistuð gildi ('opid'/'idag') varpast á næsta jafngildi.
    queue: (function () {
      try {
        const q = localStorage.getItem(QKEY) || 'post';
        return (q === 'opid' || q === 'idag') ? 'verk' : q;
      } catch (_) { return 'post'; }
    })(),
    // Flokka-sían (fimm flokkarnir; 'annad' = án flokks) + „📦 Sýna eldri".
    fFlokk: (function () { try { return localStorage.getItem('_vb_flokk') || ''; } catch (_) { return ''; } })(),
    showOld: false,
    filter: (function () { try { return localStorage.getItem(FKEY) || ''; } catch (_) { return ''; } })(),
    // 2026-07-10 (ósk Agnars): röðunar-valkostur — 'snjall' (sjálfgefið, áríðandi/
    // gjalddagi/forgangur eins og áður) eða 'nyjast' (hrein dagsetningarröð, nýjast efst).
    sort: (function () { try { return localStorage.getItem(SKEY) || 'snjall'; } catch (_) { return 'snjall'; } })(),
    // Merki-sía + sýn (þétt/ítarlegt) — bæði geymd milli heimsókna (2026-07-10).
    fTag: (function () { try { return localStorage.getItem(TGKEY) || ''; } catch (_) { return ''; } })(),
    viewMode: (function () { try { return localStorage.getItem(VMKEY) || 'venjulegt'; } catch (_) { return 'venjulegt'; } })(),
    search: '',
    addType: 'annad',
    addTags: [],        // merki valin í ný-beiðni línunni (hreinsast eftir skráningu)
    threadLatest: {},   // beidniId → nýjasti póstur í þræðinum (sjá loadThreadLatest)
    addRsk: null,       // síðasta RSK-uppfletting úr fyrirtækjareitnum {kt,nafn,heimilisfang}
    // Þjónustuverk v3: ⭐ Áríðandi-sía, dálkaröðun, síðuskipting, composer-sýnileiki
    fStar: false,
    colSort: null,      // {key:'dags'|'mal'|'stada', dir:'asc'|'desc'} | null
    page: 0,
    // Composer opið á tölvu, lokað á síma/spjaldtölvu (+ Nýtt mál opnar) —
    // verkefnin fyrst á minni skjám (þröskuldur fylgir 1020px media-reglunni).
    composerOpen: (function () { try { return window.innerWidth > 1020; } catch (_) { return true; } })(),
    expandedId: null
  };
  function setQueue(q) { state.queue = q; try { localStorage.setItem(QKEY, q); } catch (_) {} }
  function setFlokk(f) { state.fFlokk = f; try { localStorage.setItem('_vb_flokk', f); } catch (_) {} }
  function setSort(v) { state.sort = v; try { localStorage.setItem(SKEY, v); } catch (_) {} }
  function setTag(v) { state.fTag = v; try { localStorage.setItem(TGKEY, v); } catch (_) {} }
  function setViewMode(v) { state.viewMode = v; try { localStorage.setItem(VMKEY, v); } catch (_) {} }
  function setFilter(f) { state.filter = f; try { localStorage.setItem(FKEY, f); } catch (_) {} }

  // verkdagbok rows → pseudo work-items (read-through; structure stays in #04).
  function vdItems() {
    return state.vd.map(r => ({
      id: 'vd:' + r.id, _vd: true, _raw: r,
      title: (r.fyrirtaeki || 'Verkdagbók') + (r.athugasemdir ? '' : ' — þjónusta'),
      notes: r.athugasemdir || '',
      type: 'verkdagbok', status: r.done ? 'lokad' : 'nytt',
      priority: 'venjulegur', important: false, due_at: null,
      customer_nafn: r.fyrirtaeki || '', source: 'verkdagbok',
      created_at: r.created_at
    }));
  }
  function allItems() { return state.items.concat(vdItems()); }

  // ── data ─────────────────────────────────────────────────────────────────
  async function load() {
    const SB = getSB(); if (!SB) return;
    state.loading = true; renderList();
    try {
      const a = await SB.from('thjonustubeidni').select('*').is('deleted_at', null)
        .order('created_at', { ascending: false }).range(0, 1499);
      if (a.error) throw a.error;
      state.items = a.data || [];
    } catch (e) {
      console.warn('[verkbord] load thjonustubeidni', e);
      state.items = [];
    }
    try {
      const b = await SB.from('verkdagbok').select('*').eq('done', false).eq('archived', false)
        .order('created_at', { ascending: false }).range(0, 499);
      state.vd = (b && !b.error && b.data) ? b.data : [];
    } catch (e) { state.vd = []; }
    state.loading = false;
    renderControls(); renderList(); refreshBadge();
    // Nýjasta svarið í þræðinum (2026-07-10, ósk Agnars): ✨-samantektin/forsýnin
    // gat sýnt GAMALT efni úr miðjum póstþræði (löngu afgreitt). Flettum upp
    // nýjasta póstinum með sömu efnislínu og sýnum HANN — keyrt eftir fyrstu
    // málningu svo borðið birtist strax.
    loadThreadLatest().then(ok => { if (ok) renderList(); }).catch(() => {});
  }

  // Efnislína án Re:/Fwd:/Sv:-forskeyta — lykill fyrir þráða-mátun.
  function normSubj(s) {
    let t = String(s || '').trim().toLowerCase();
    for (let i = 0; i < 6; i++) t = t.replace(/^(re|fw|fwd|sv|vs)\s*:\s*/i, '');
    return t.replace(/\s+/g, ' ').trim();
  }
  async function loadThreadLatest() {
    const SB = getSB(); if (!SB) return false;
    const emailRows = state.items.filter(x => isOpen(x) && /^email:/.test(String(x.channel_ref || '')));
    if (!emailRows.length) { state.threadLatest = {}; return false; }
    let emails = [];
    try {
      const r = await SB.from('email_digest')
        .select('id,sender_name,sender_email,subject,snippet,body_preview,received_at')
        .eq('account', 'eldklar@eldklar.is')
        .order('received_at', { ascending: false }).range(0, 799);
      if (r.error) throw r.error;
      emails = r.data || [];
    } catch (_) { return false; }
    // Nýjasti póstur per efnislínu (listinn er raðaður nýjast fyrst).
    const newest = new Map();
    for (const e of emails) {
      const k = normSubj(e.subject);
      if (k && !newest.has(k)) newest.set(k, e);
    }
    const out = {};
    for (const b of emailRows) {
      const m = newest.get(normSubj(b.title));
      if (!m) continue;
      if (('email:' + m.id) === String(b.channel_ref)) continue;              // sami póstur og beiðnin
      if (new Date(m.received_at) - new Date(b.created_at) < 60e3) continue;  // ekkert nýrra komið
      const text = String(m.body_preview || m.snippet || '').trim();
      if (!text) continue;
      out[b.id] = {
        text, at: m.received_at,
        from: m.sender_name || m.sender_email || '',
        mine: /eldklar/i.test(m.sender_email || ''),
      };
    }
    state.threadLatest = out;
    return Object.keys(out).length > 0;
  }

  async function loadCompanies() {
    if (state.companies) return state.companies;
    const SB = getSB(); if (!SB) { state.companies = []; return []; }
    try {
      const r = await SB.from('fyrirtaeki').select('id,nafn,kennitala,customer_base_id').is('deleted_at', null).range(0, 1999);
      state.companies = (r && !r.error && r.data) ? r.data.filter(c => c.nafn) : [];
    } catch (_) { state.companies = []; }
    return state.companies;
  }

  async function quickAdd(title, type, custName, expand, tags, rsk) {
    title = (title || '').trim();
    if (!title) return;
    const SB = getSB(); if (!SB) { toast('Engin gagnabankatenging'); return; }
    // Fyrirtækja-tenging (2026-07-10): nafn úr quick-línunni matchast við
    // fyrirtaeki (case-fold) → customer_base_id; annars geymist nafnið samt.
    custName = (custName || '').trim();
    let baseId = null;
    if (custName) {
      const cos = await loadCompanies();
      const hit = (cos || []).find(c => String(c.nafn || '').trim().toLowerCase() === custName.toLowerCase());
      if (hit) { custName = hit.nafn; baseId = hit.customer_base_id || null; }
    }
    // RSK-fyrirtæki sem er ekki á skrá: kt + heimilisfang fylgja í nótunum.
    const rskNote = (rsk && !baseId) ? 'RSK: kt ' + rsk.kt + (rsk.heimilisfang ? ' · ' + rsk.heimilisfang : '') : '';
    const obj = {
      title, notes: rskNote, type: type || 'annad', status: 'nytt', priority: 'venjulegur',
      customer_nafn: custName || null, customer_base_id: baseId,
      tags: Array.isArray(tags) ? tags : [],
      source: 'beint', important: false, created_at: nowIso(), created_by: currentUser(), updated_at: nowIso()
    };
    try {
      const r = await SB.from('thjonustubeidni').insert(obj).select().single();
      if (r.error) throw r.error;
      state.items.unshift(r.data);
      if (expand && r.data) state.expandedId = r.data.id;   // ⚙ Fleiri valkostir → opna ritilinn strax
      renderControls(); renderList(); refreshBadge();
    } catch (e) { toast('Náði ekki að bæta við: ' + (e.message || e)); }
  }

  async function saveRow(id, patch) {
    const SB = getSB(); if (!SB) return;
    patch.updated_at = nowIso();
    const row = state.items.find(x => x.id === id);
    if (row) Object.assign(row, patch);
    try { const r = await SB.from('thjonustubeidni').update(patch).eq('id', id); if (r.error) throw r.error; }
    catch (e) { toast('Náði ekki að vista: ' + (e.message || e)); }
  }
  async function softDelete(id) {
    const SB = getSB(); if (!SB) return;
    if (!window.confirm('Eyða þessu verki? (geymist sem eytt og endurheimtanlegt)')) return;
    try {
      const r = await SB.from('thjonustubeidni').update({ deleted_at: nowIso() }).eq('id', id);
      if (r.error) throw r.error;
      state.items = state.items.filter(x => x.id !== id);
      if (state.expandedId === id) state.expandedId = null;
      renderControls(); renderList(); refreshBadge();
    } catch (e) { toast('Eyðing mistókst: ' + (e.message || e)); }
  }
  // Fljót-eyðing af listanum — engin staðfesting (mjúk eyðing, endurheimtanleg).
  async function quickDelete(id) {
    const SB = getSB(); if (!SB) return;
    const row = state.items.find(x => x.id === id);
    // Bjartsýn: fjarlægja strax úr sýn svo það sé snöggt.
    state.items = state.items.filter(x => x.id !== id);
    if (state.expandedId === id) state.expandedId = null;
    renderControls(); renderList(); refreshBadge();
    try {
      const r = await SB.from('thjonustubeidni').update({ deleted_at: nowIso() }).eq('id', id);
      if (r.error) throw r.error;
    } catch (e) { toast('Eyðing mistókst: ' + (e.message || e)); if (row) { state.items.push(row); renderControls(); renderList(); } }
  }
  // „Reikningur hefur verið greiddur" o.þ.h. eru Payday/Mailchimp GREIÐSLU-
  // TILKYNNINGAR — upplýsingar, ekki verk. Þær soguðust inn og blésu listann upp
  // í 400+. Þekkja þær svo hægt sé að hreinsa í einu lagi (og telja í hausnum).
  function isPaymentNoise(r) {
    if (!r || r._vd) return false;
    const t = String(r.title || '').toLowerCase();
    return /reikningur hefur verið greiddur|greiðslustaðfesting|payment (received|confirmation)|hefur verið greidd/.test(t);
  }
  async function clearPaymentNoise() {
    const SB = getSB(); if (!SB) return;
    const noisy = state.items.filter(isPaymentNoise);
    if (!noisy.length) { toast('Engar greiðslu-tilkynningar til að hreinsa'); return; }
    if (!window.confirm('Fela ' + noisy.length + ' greiðslu-tilkynningar? (Payday „reikningur greiddur" — upplýsingar, ekki verk. Endurheimtanlegt.)')) return;
    const ids = noisy.map(x => x.id);
    state.items = state.items.filter(x => !isPaymentNoise(x));
    renderControls(); renderList(); refreshBadge();
    try {
      for (let i = 0; i < ids.length; i += 100) {
        const r = await SB.from('thjonustubeidni').update({ deleted_at: nowIso() }).in('id', ids.slice(i, i + 100));
        if (r.error) throw r.error;
      }
      toast('🧹 ' + ids.length + ' greiðslu-tilkynningar faldar');
    } catch (e) { toast('Hreinsun stöðvaðist: ' + (e.message || e)); load(); }
  }
  async function vdSetDone(rawId) {
    const SB = getSB(); if (!SB) return;
    try {
      const r = await SB.from('verkdagbok').update({ done: true }).eq('id', rawId);
      if (r.error) throw r.error;
      state.vd = state.vd.filter(x => x.id !== rawId);
      renderControls(); renderList(); refreshBadge();
    } catch (e) { toast('Tókst ekki: ' + (e.message || e)); }
  }

  // ✨ next-step suggestion via the existing /api/tv-summary endpoint (#182).
  async function aiSuggest(id) {
    const row = state.items.find(x => x.id === id);
    if (!row) return;
    const btn = document.querySelector('.vb-ai[data-id="' + id + '"]');
    if (btn) { btn.disabled = true; btn.textContent = '… hugsa'; }
    try {
      const items = [{ id: row.id, customer_nafn: row.customer_nafn, type: row.type, title: row.title, notes: row.notes }];
      const r = await fetch('/api/tv-summary', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || (data && data.error)) throw new Error((data && data.error) || ('HTTP ' + r.status));
      const sums = (data && data.summaries) || {};
      const txt = sums[row.id] || sums[String(row.id)];
      if (txt) { row.summary = txt; saveRow(id, { summary: txt }); renderList(); }
      else { toast('Engin tillaga kom til baka'); if (btn) { btn.disabled = false; btn.textContent = '✨ Tillaga'; } }
    } catch (e) { toast('Tillaga mistókst: ' + (e.message || e)); if (btn) { btn.disabled = false; btn.textContent = '✨ Tillaga'; } }
  }

  // ── filtering / sorting ──────────────────────────────────────────────────
  // Pósthólf vs Verkefni (2026-07-10, ósk Agnars — „handvirkt sér… ákveðnir
  // póstar sem voru færðir yfir… og síðan pósthólf"): sjálfvirkt innsognir
  // póstar (channel_ref 'email:…') sitja í 📧 Pósthólfi þar til þeir eru
  // „📋 færðir yfir" (promoted_at sett) — þá teljast þeir með handvirku
  // verkefnunum í 📋 Verkefni. Handvirk skráning fer alltaf beint í Verkefni.
  function isPost(r) {
    if (r._vd || r.promoted_at) return false;
    return r.source === 'email' || /^email:/.test(String(r.channel_ref || ''));
  }
  // Geymslan (Þjónustuborð v2): gamli póst-staflinn ber archived_at — sést
  // undir „📦 Eldra" í innhólfinu, telst hvergi annars staðar. Ekkert eytt.
  function isArchived(r) { return !r._vd && !!r.archived_at; }
  // „Svarað": annaðhvort svarað AF borðinu (svarad_at sett við Resend-send)
  // eða nýjasta skeytið í þræðinum er frá okkur (threadLatest.mine).
  function isReplied(r) {
    if (r.svarad_at) return true;
    const tl = state.threadLatest[r.id];
    return !!(tl && tl.mine);
  }
  // „Bíður svars" = opinn innhólfspóstur sem við höfum ekki svarað.
  function isWaiting(r) { return isPost(r) && !isArchived(r) && isOpen(r) && !isReplied(r); }
  function waitDays(r) {
    const d = Math.floor((Date.now() - new Date(r.created_at || Date.now())) / 86400000);
    return d < 0 ? 0 : d;
  }
  function inQueue(r) {
    if (state.queue === 'lokad') return !isOpen(r);
    if (state.queue === 'post') return isOpen(r) && isPost(r) && (state.showOld ? true : !isArchived(r));
    if (state.queue === 'allt') return isOpen(r) && !isArchived(r); // v3: allt opið (innhólf + verkefni)
    // verk (sjálfgefið) — handvirkt + fært yfir; geymslan aldrei hér
    return isOpen(r) && !isPost(r) && !isArchived(r);
  }
  // 2026-07-10: gamla type-sían fjarlægð (flokkun fer nú gegnum MERKI). Hlutlaus
  // svo gömul vistuð type-sía í localStorage feli ekki raðir. (Fall haldið til
  // öryggis ef eitthvað kallar enn á það.)
  function inFilter() { return true; }
  // Merkja-sían nær líka yfir gömlu type-flokkana sem sjást á póst-röðunum
  // (röð án merkja sýnir type-chippann — þá á að vera hægt að sía eftir honum).
  const TYPE_TO_TAG = {
    tilbod: 'gera_tilbod', skodun_tilbod: 'gera_tilbod',
    hringja: 'hringja',
    samningur: 'thjonustusamningur', nyr_samningur: 'thjonustusamningur'
  };
  function effTags(r) {
    const t = rowTags(r);
    if (t.length) return t;
    const m = TYPE_TO_TAG[r && r.type];
    return m ? [m] : [];
  }
  function visibleRows() {
    let r = allItems().filter(x => inQueue(x) && inFilter(x));
    // Flokka-sían (v2): '' = allt, 'annad' = án flokks, annars einn af fimm.
    if (state.fFlokk) r = r.filter(x => (state.fFlokk === 'annad' ? !rowFlokk(x) : rowFlokk(x) === state.fFlokk));
    // v3 TÖG-sían: merki notandans ∪ flokks-leidd merki, + ⭐ Áríðandi.
    if (state.fTag) r = r.filter(x => dispTags(x).indexOf(state.fTag) !== -1);
    if (state.fStar) r = r.filter(x => !!x.important);
    const s = state.search.trim().toLowerCase();
    if (s) r = r.filter(x => [x.customer_nafn, x.title, x.notes].some(f => (f || '').toLowerCase().includes(s)));
    // v3 dálkaröðun (DAGS./MÁL/STAÐA hausar) — trompar aðrar raðanir þegar valin.
    if (state.colSort) {
      const cs = state.colSort, dir = cs.dir === 'asc' ? 1 : -1;
      r.sort((a, b) => {
        let av, bv;
        if (cs.key === 'dags') { av = new Date(a.created_at || 0).getTime(); bv = new Date(b.created_at || 0).getTime(); }
        else if (cs.key === 'stada') { av = STATUS_ORDER.indexOf(a.status); bv = STATUS_ORDER.indexOf(b.status); }
        else { av = ((a.customer_nafn || '') + ' ' + (a.title || '')).toLowerCase(); bv = ((b.customer_nafn || '') + ' ' + (b.title || '')).toLowerCase(); }
        return av < bv ? -dir : av > bv ? dir : 0;
      });
      return r;
    }
    // Innhólfið raðast sér: ósvarað ELST efst (því lengur sem kúnni bíður, því
    // ofar), svo svarað/upplýsingar nýjast efst, geymslan (ef sýnd) aftast.
    if (state.queue === 'post' && state.sort !== 'nyjast') {
      r.sort((a, b) => {
        const aa = isArchived(a) ? 1 : 0, ba = isArchived(b) ? 1 : 0;
        if (aa !== ba) return aa - ba;
        const aw = isWaiting(a) ? 0 : 1, bw = isWaiting(b) ? 0 : 1;
        if (aw !== bw) return aw - bw;
        if (!aw) return new Date(a.created_at || 0) - new Date(b.created_at || 0); // bíða: elst efst
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
      return r;
    }
    if (state.sort === 'nyjast') {
      // Hrein dagsetningarröð — nýjast efst (ósk Agnars 2026-07-10).
      r.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      return r;
    }
    const prio = { har: 0, venjulegur: 1, lagur: 2 };
    r.sort((a, b) => {
      // áríðandi efst, svo útrunnið/gjalddagi, svo forgangur, svo nýjast.
      const ai = (a.important ? 1 : 0), bi = (b.important ? 1 : 0);
      if (ai !== bi) return bi - ai;
      const ao = isOverdue(a) ? 1 : 0, bo = isOverdue(b) ? 1 : 0;
      if (ao !== bo) return bo - ao;
      const ad = dueInfo(a.due_at), bd = dueInfo(b.due_at);
      const adv = ad ? ad.diff : 99999, bdv = bd ? bd.diff : 99999;
      if (adv !== bdv) return adv - bdv;
      const ap = prio[a.priority] ?? 1, bp = prio[b.priority] ?? 1;
      if (ap !== bp) return ap - bp;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    return r;
  }
  function counts() {
    const all = allItems();
    const c = { idag: 0, verk: 0, post: 0, allt: 0, geymsla: 0, lokad: 0, wait: 0, od: 0 };
    for (const x of all) {
      if (!isOpen(x)) { c.lokad++; continue; }
      if (isPost(x)) {
        if (isArchived(x)) { c.geymsla++; continue; }
        c.post++;
        if (isWaiting(x)) c.wait++;
        continue;
      }
      if (isArchived(x)) { c.geymsla++; continue; }
      c.verk++;
      if (isToday(x)) c.idag++;
      if (isOverdue(x)) c.od++;
    }
    c.allt = c.post + c.verk;
    return c;
  }

  // ── sidebar nav ──────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const tpl = nav.querySelector('.vnav-btn');
    if (!tpl) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.style.cssText += ';position:relative;z-index:5;display:flex;align-items:center';
    btn.innerHTML = '<span style="margin-right:6px">✅</span>Verkborð' +
      ' <span class="vb-badge" style="margin-left:auto;background:#fff;color:#b91c1c;font-size:10px;font-weight:800;padding:1px 7px;border-radius:99px;display:none"></span>';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY); else show();
    });
    nav.insertBefore(btn, nav.firstChild); // efst — patch 68 heldur svo röðinni
    refreshBadge();
  }
  function refreshBadge() {
    const b = document.querySelector('.vb-badge');
    if (!b) return;
    // Badge = það sem kallar á athygli: póstar sem bíða svars + verk dagsins.
    const c = counts();
    const n = c.wait + c.idag;
    b.textContent = String(n);
    b.style.display = n > 0 ? 'inline-block' : 'none';
  }

  // ── view container + switchView hook ──────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="vb-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
    injectStyle();
    wireDelegation(v);
  }
  function show() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    if (v) { v.style.display = 'block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === NAV_KEY));
    // Spegla slóðina (deep-link) — 231-wrapperinn skammhleypir framhjá patch 218
    // switchView-speglinum, svo hash sat fast á fyrri síðu (#sala).
    try { if (location.hash !== '#verkbord') history.replaceState(null, '', '#verkbord'); } catch (_) {}
    renderAll();
    retireOldOnce();
    load();
  }
  function patchSwitchView() {
    if (!window.App || window.App._vbSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      return orig.apply(this, arguments);
    };
    window.App._vbSwitchPatched = true;
  }

  // ── one-time retire of the old lists ──────────────────────────────────────
  async function retireOldOnce() {
    try {
      if (!window.AppSettings || !AppSettings.save || !AppSettings.isLoaded || !AppSettings.isLoaded()) return;
      if (AppSettings.path('verkbord.retired_v1')) return;
      const hidden = (AppSettings.path('sidebar_hidden') || []).slice();
      const add = ['verkefni', 'thjonustuverk', 'thjonustuver', 'eftirfylgni'];
      add.forEach(h => { if (!hidden.some(x => String(x).toLowerCase() === h)) hidden.push(h); });
      const patch = { verkbord: { retired_v1: true }, sidebar_hidden: hidden };
      let order = AppSettings.path('sidebar_order');
      if (Array.isArray(order) && order.length &&
          !order.some(x => { const v = String(x).toLowerCase(); return v === 'verkbord' || v.indexOf('verkborð') !== -1; })) {
        patch.sidebar_order = ['verkbord'].concat(order);
      }
      await AppSettings.save(patch);
      hideOldButtonsNow();
      toast('Faldi gömlu listana — sjást aftur í Stillingar → Valmynd ef þú vilt.');
    } catch (e) { console.warn('[verkbord] retireOldOnce', e); }
  }
  function hideOldButtonsNow() {
    const nav = document.querySelector('nav.view-nav, .view-nav'); if (!nav) return;
    const ids = ['thjonustuverk', 'thjonustuver', 'eftirfylgni'];
    nav.querySelectorAll('.vnav-btn').forEach(b => {
      const dv = b.getAttribute('data-view');
      const txt = (b.textContent || '').toLowerCase();
      if ((dv && ids.indexOf(dv) !== -1) || (!b.querySelector('.vb-badge') && /(^|\s)verkefni(\s|$)/.test(txt) && dv !== NAV_KEY)) {
        b.style.display = 'none';
      }
    });
  }

  // ── migration: import sensible open items from the old blob lists ─────────
  async function importOld() {
    const SB = getSB(); if (!SB) { toast('Engin gagnabankatenging'); return; }
    if (!window.AppSettings) { toast('Stillingar ekki tilbúnar'); return; }
    const existingRefs = new Set(state.items.map(x => x.channel_ref).filter(Boolean));
    const toInsert = [];
    // Verkefni (#145) — kanban cards not in a "done" column.
    const todo = AppSettings.path('todo');
    if (todo && Array.isArray(todo.columns)) {
      todo.columns.forEach(col => {
        const done = /klárað|done|lokið/i.test(col.title || '');
        (col.cards || []).forEach(card => {
          const ref = 'imp:verkefni:' + card.id;
          if (done || existingRefs.has(ref)) return;
          const title = (card.title || '').trim() || (card.body || '').trim().slice(0, 60) || '(án titils)';
          toInsert.push({
            title, notes: card.body || '', type: 'annad',
            status: /vinnsl/i.test(col.title || '') ? 'i_vinnslu' : 'nytt',
            priority: 'venjulegur', source: 'beint', important: false, channel_ref: ref,
            created_at: card.created_at || nowIso(), created_by: currentUser(), updated_at: nowIso()
          });
        });
      });
    }
    // Þjónustuverk (#172) — open cases.
    const tv = AppSettings.path('thjonustuverk');
    if (tv && Array.isArray(tv.cases)) {
      tv.cases.forEach(cs => {
        if (cs.status === 'lokid') return;
        const ref = 'imp:tverk:' + cs.id;
        if (existingRefs.has(ref)) return;
        const hasTilbod = cs.tilbod && (cs.tilbod.lines || cs.tilbod.items || []).length;
        toInsert.push({
          title: (cs.title || '').trim() || '(án titils)', notes: cs.body || '',
          type: hasTilbod ? 'tilbod' : 'annad',
          status: cs.status === 'i_vinnslu' ? 'i_vinnslu' : 'nytt',
          priority: 'venjulegur', source: 'beint', important: false, channel_ref: ref,
          customer_nafn: cs.customer_nafn || cs.customer || null,
          created_at: cs.created_at || nowIso(), created_by: currentUser(), updated_at: nowIso()
        });
      });
    }
    if (!toInsert.length) { toast('Ekkert nýtt að flytja inn — allt þegar komið.'); return; }
    if (!window.confirm('Flytja inn ' + toInsert.length + ' atriði úr Verkefni + Þjónustuverk?')) return;
    try {
      const r = await SB.from('thjonustubeidni').insert(toInsert).select();
      if (r.error) throw r.error;
      state.items = (r.data || []).concat(state.items);
      renderControls(); renderList(); refreshBadge();
      toast('Flutti inn ' + (r.data || []).length + ' atriði.');
    } catch (e) { toast('Innflutningur mistókst: ' + (e.message || e)); }
  }

  // ── styles ────────────────────────────────────────────────────────────────
  function injectStyle() {
    if (document.getElementById('verkbord-style')) return;
    const s = document.createElement('style');
    s.id = 'verkbord-style';
    s.textContent = `
      /* ═══ Þjónustuverk v3 (dc.html referens) ═══ */
      #view-verkbord { font-family: 'Space Grotesk', 'IBM Plex Sans', system-ui, sans-serif; color: #11141c;
        padding: 0 !important;
        background: linear-gradient(180deg, #060607 0px, #060607 120px, #aeb4be 420px, #9ba1ad 100%) !important; }
      #view-verkbord .vb-wrap { max-width: 1560px; margin: 0 auto; padding: 22px 24px 60px; }
      /* Ein skrunanleg chippa-lína (síma-mynstur). */
      #view-verkbord .vb-scroll { display: flex; gap: 7px; align-items: center; width: 100%;
        flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch;
        scrollbar-width: none; padding-bottom: 2px; }
      #view-verkbord .vb-scroll::-webkit-scrollbar { display: none; }
      #view-verkbord .vb-scroll > * { flex: 0 0 auto; }
      /* v3 raðir: zebra + hover-lyfting (úr referensinum). */
      #view-verkbord .task { position: relative; transition: background .12s ease; background: #fff; }
      #view-verkbord .task:nth-child(even) { background: #fbfcfe; }
      #view-verkbord .task:hover { background: #fff; box-shadow: 0 8px 24px -8px rgba(15,23,42,.26); z-index: 2; }
      #view-verkbord .task:hover > span:first-child { filter: brightness(1.15) saturate(1.2); }
      #view-verkbord .task.open { background: #fff; box-shadow: 0 8px 24px -8px rgba(15,23,42,.3); z-index: 3; }
      #view-verkbord button:active, #view-verkbord [data-act]:active { transform: translateY(1px); }
      #view-verkbord input:focus { border-color: #2f5fe0 !important; box-shadow: 0 0 0 3px rgba(47,95,224,.14) !important; }
      #view-verkbord .vb-empty { text-align: center; color: #5b6472; padding: 44px 18px;
        font-size: 14.5px; font-weight: 600; }
      /* Ritillinn (inni í opinni röð) — óbreytt virkni, ljóst kort. */
      #view-verkbord .vb-ed { margin-top: 12px; border-top: 1px dashed rgba(20,24,34,.14); padding-top: 12px; display: grid; gap: 10px; cursor: default; }
      #view-verkbord .vb-ed label { font-size: 10.5px; font-weight: 700; color: #8a93a5;
        letter-spacing: .12em; text-transform: uppercase; display: block; margin-bottom: 4px; }
      #view-verkbord .vb-ed input, #view-verkbord .vb-ed select, #view-verkbord .vb-ed textarea {
        font: inherit; font-size: 14px; border: 1px solid rgba(20,24,34,.14); border-radius: 9px;
        padding: 9px 12px; width: 100%; box-sizing: border-box; background: #eef1f6; color: #141822; outline: none; }
      #view-verkbord .vb-ed textarea { min-height: 140px !important; resize: vertical !important; line-height: 1.5; }
      #view-verkbord .vb-ed-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
      #view-verkbord .vb-ed-actions { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; }
      #view-verkbord .vb-btn { font: inherit; font-size: 12.5px; font-weight: 600;
        padding: 9px 14px; border-radius: 9px; cursor: pointer; min-height: 38px;
        border: 1px solid rgba(20,24,34,.14); background: #f1f5f9; color: #3a4250; }
      #view-verkbord .vb-btn:hover { background: #e2e8f0; }
      #view-verkbord .vb-btn.red { border: 1px solid #f3c6c4; background: #fdecec; color: #c0241f; }
      #view-verkbord .vb-btn.green { background: linear-gradient(150deg,#2bbf6c,#0f6e3a);
        color: #fff; border: 1px solid #156e3a; font-weight: 700;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.25); }
      /* ── Sími/spjaldtölva (2026-07-11, skjámynd Agnars): taflan kremst í mjóa
         súlu þegar MERKI-dálkur + aðgerðir sitja hægra megin. Á ≤1020px víkur
         MERKI-dálkurinn; á ≤820px víkur dags-dálkurinn og röðin leggst í TVÆR
         línur — efnið fullbreitt efst, aðgerðirnar (Færa · Ný · ✕) hægra megin
         á eigin línu undir. Titillinn fær að brjóta línur eðlilega. ── */
      @media (max-width: 1020px) {
        #view-verkbord .vb-colmerki { display: none !important; }
      }
      @media (max-width: 820px) {
        #view-verkbord .vb-wrap { padding: 14px 10px 90px; }
        #view-verkbord .vb-dags { display: none !important; }
        #view-verkbord .vb-rowflex { flex-wrap: wrap; gap: 8px 10px !important;
          padding-left: 12px !important; padding-right: 12px !important; }
        #view-verkbord .vb-rowflex > div:not(.vb-acts):not(.vb-dags) { flex: 1 1 calc(100% - 40px) !important; }
        #view-verkbord .vb-acts { flex: 1 1 100% !important; justify-content: flex-end;
          padding-top: 0 !important; gap: 9px !important;
          border-top: 1px dashed rgba(20,24,34,.08); padding-top: 7px !important; margin-top: 2px; }
        /* Dálkahausinn einfaldast: bara MÁL + STAÐA */
        #view-verkbord .vb-colh { display: none !important; }
        /* Stjórnkortið þéttara */
        #view-verkbord #vb-controls { padding: 12px 12px !important; }
        #view-verkbord #vb-composer { padding: 12px 12px !important; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── render (Þjónustuverk v3 — speglar Thjonustuverkv3.dc.html) ────────────
  function renderAll() {
    const main = document.getElementById('vb-main'); if (!main) return;
    const c = counts();
    main.innerHTML =
      '<div class="vb-wrap">' +
        // Síðutitill á dökka bandinu + „+ Nýtt mál" (togglar composer-kortið)
        '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px;flex-wrap:wrap">' +
          '<div>' +
            '<div style="font-size:28px;font-weight:700;color:#fff;letter-spacing:-.01em">🔧 Þjónustuverk</div>' +
            '<div style="font-size:13px;color:rgba(255,255,255,.6);margin-top:4px">Tilboð, fyrirspurnir og póstar sem þarf að fylgja eftir</div>' +
            '<div id="vb-morgun" style="font-size:12px;color:rgba(255,255,255,.55);margin-top:3px;font-family:\'Space Mono\',monospace"></div>' +
          '</div>' +
          '<button data-act="composer" class="abtn" style="height:42px;padding:0 18px;border-radius:12px;border:1px solid rgba(190,32,28,.55);' +
            'background:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%);color:#fff;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;' +
            'box-shadow:0 0 16px -4px rgba(160,16,16,.55),inset 0 1px 0 rgba(255,255,255,.16);display:inline-flex;align-items:center;gap:7px">＋ Nýtt mál</button>' +
        '</div>' +
        // Composer-kort (skráningarlínan + MERKI tagpicks)
        '<div id="vb-composer" style="' + V3_CARD + ';padding:14px 16px;margin-bottom:16px;display:' + (state.composerOpen ? 'block' : 'none') + '">' +
          '<div style="display:flex;gap:8px;align-items:center;margin-bottom:9px;flex-wrap:wrap">' +
            '<input class="vb-add-cust" id="vb-add-cust" list="vb-add-colist" placeholder="🗂 Fyrirtæki eða kennitala (RSK)…" autocomplete="off" ' +
              'style="flex:1 1 200px;min-width:150px;height:38px;padding:0 13px;border-radius:9px;border:1px solid rgba(20,24,34,.14);background:#eef1f6;color:#141822;font-family:inherit;font-size:13px;outline:none">' +
            '<datalist id="vb-add-colist"></datalist>' +
            '<input class="vb-add-input" id="vb-add-input" placeholder="+ Skrá verk… (Enter vistar)" autocomplete="off" ' +
              'style="flex:2 1 240px;min-width:170px;height:38px;padding:0 13px;border-radius:9px;border:1px solid rgba(20,24,34,.14);background:#eef1f6;color:#141822;font-family:inherit;font-size:13.5px;font-weight:500;outline:none">' +
            '<button data-act="add" class="abtn" style="flex:none;height:38px;padding:0 16px;border-radius:9px;border:1px solid rgba(190,32,28,.55);' +
              'background:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%);color:#fff;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.16)">+ Bæta við</button>' +
            '<button data-act="addmore" title="Skrá og opna alla valkosti (forgangur, frestur, nánar…)" ' +
              'style="flex:none;height:38px;padding:0 13px;border-radius:9px;border:1px solid rgba(20,24,34,.14);background:#fff;color:#475569;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer">⚙ Fleiri</button>' +
          '</div>' +
          '<div class="vb-scroll" style="align-items:center">' +
            '<span style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#94a3b8;margin-right:1px">🏷 MERKI</span>' +
            TAG_ORDER.map(t => {
              const d = TAGS[t], on = state.addTags.indexOf(t) !== -1;
              return '<button data-act="addtag" data-tag="' + t + '" type="button" ' +
                'style="font-family:inherit;font-size:11.5px;font-weight:600;padding:4px 10px;border-radius:7px;' + V3_METAL + ';color:' + (TAG_DK[t] || '#c3ccd8') + ';cursor:pointer;white-space:nowrap;' +
                'opacity:' + (on ? '1' : '.55') + (on ? ';outline:1px solid currentColor;outline-offset:-1px' : '') + '">' +
                d.emoji + ' ' + esc(d.label) + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        '<div id="vb-controls" style="' + V3_CARD + ';padding:15px 17px;margin-bottom:16px"></div>' +
        '<div style="border-radius:18px;border:1px solid rgba(20,24,34,.1);background:#fff;box-shadow:0 16px 40px -20px rgba(15,23,42,.34);overflow:hidden">' +
          '<div id="vb-list"></div>' +
        '</div>' +
      '</div>';
    renderControls(); renderList();
  }

  // Stjórnkortið (v3): Innhólf/Allt/Verkefni/Lokað flipar + leit + röðun/sýn,
  // skil, svo TÖG-síuröðin (⭐ Áríðandi + dökk-metal merkjachippar með teljara).
  function renderControls() {
    const el = document.getElementById('vb-controls'); if (!el) return;
    const c = counts();
    const noiseN = allItems().filter(x => isOpen(x) && isPaymentNoise(x)).length;
    // Morgunlínan undir síðutitlinum (mono, á dökka bandinu).
    const mg = document.getElementById('vb-morgun');
    if (mg) mg.textContent =
      (c.wait ? c.wait + (c.wait === 1 ? ' póstur bíður svars' : ' póstar bíða svars') : 'enginn póstur bíður svars') +
      (c.idag ? ' · ' + c.idag + ' verk í dag' : '') + (c.od ? ' · ' + c.od + ' fram yfir' : '');

    const tab = (v, icon, label, n) => {
      const on = state.queue === v;
      return '<button data-act="queue" data-q="' + v + '" style="display:inline-flex;align-items:center;gap:7px;height:38px;padding:0 16px;border-radius:11px;' +
        (on ? V3_METAL_ON : V3_METAL) + ';color:' + (on ? '#fff' : 'rgba(255,255,255,.85)') + ';font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap">' +
        icon + label +
        '<span style="font-family:\'Space Mono\',monospace;font-size:11px;font-weight:700;color:#fff;background:rgba(255,255,255,.16);border-radius:20px;padding:1px 8px">' + n + '</span></button>';
    };

    el.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(20,24,34,.08);flex-wrap:wrap">' +
        '<div class="vb-scroll" style="width:auto;flex:1 1 auto;min-width:0">' +
          tab('post', '📥 ', 'Innhólf', c.post) +
          tab('allt', '☰ ', 'Allt', c.allt) +
          tab('verk', '📋 ', 'Verkefni', c.verk) +
          tab('lokad', '✓ ', 'Lokað', c.lokad) +
        '</div>' +
        '<div style="position:relative;flex:1 1 200px;min-width:160px;max-width:260px">' +
          '<span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9aa3b5;font-size:13px">🔎</span>' +
          '<input class="malSearch" id="vb-search" placeholder="Leita í málum…" value="' + esc(state.search) + '" ' +
            'style="width:100%;height:38px;padding:0 12px 0 34px;border-radius:11px;border:1px solid rgba(20,24,34,.14);background:#fff;color:#141822;font-family:inherit;font-size:13px;outline:none;box-shadow:inset 0 1px 2px rgba(20,30,60,.05)">' +
        '</div>' +
        '<div class="vb-scroll" style="width:auto;flex:0 1 auto">' +
          '<button data-act="sort" data-s="snjall" title="Áríðandi og gjalddagar efst — hreinsar dálkaröðun" ' +
            'style="display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:11px;' + (state.sort !== 'nyjast' && !state.colSort ? V3_METAL_ON + ';color:#fff' : V3_METAL + ';color:rgba(255,255,255,.9)') + ';font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">⭐ Snjallröðun</button>' +
          '<span style="display:inline-flex;border:1px solid #0a0b0d;border-radius:11px;overflow:hidden">' +
            '<button data-act="viewmode" data-vm="thett" style="height:38px;padding:0 13px;border:0;' + (state.viewMode === 'thett' ? V3_METAL_ON.replace('border:1px solid #0a0b0d;', '') + ';color:#fff' : V3_METAL.replace('border:1px solid #0a0b0d;', '') + ';color:rgba(255,255,255,.6)') + ';font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">☰ Þétt</button>' +
            '<button data-act="viewmode" data-vm="itarlegt" style="height:38px;padding:0 13px;border:0;border-left:1px solid rgba(20,24,34,.3);' + (state.viewMode !== 'thett' ? V3_METAL_ON.replace('border:1px solid #0a0b0d;', '') + ';color:#fff' : V3_METAL.replace('border:1px solid #0a0b0d;', '') + ';color:rgba(255,255,255,.6)') + ';font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">▮ Ítarlegt</button>' +
          '</span>' +
          '<button data-act="email" title="Flytja inn nýjar beiðnir úr eldklar-pósthólfinu (engin tvítök)" style="display:inline-flex;align-items:center;height:38px;padding:0 13px;border-radius:11px;' + V3_METAL + ';color:rgba(255,255,255,.85);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">✉️ Sækja póst</button>' +
          (noiseN ? '<button data-act="clearnoise" title="Fela allar Payday-greiðslutilkynningar í einu (endurheimtanlegt)" style="display:inline-flex;align-items:center;height:38px;padding:0 13px;border-radius:11px;' + V3_METAL + ';color:#ff8a82;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">🧹 ' + noiseN + '</button>' : '') +
        '</div>' +
      '</div>' +
      // TÖG-síuröðin
      '<div class="vb-scroll" style="align-items:center">' +
        '<span style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#8a93a5;margin-right:2px">TÖG</span>' +
        '<button data-act="starfilter" style="font-family:inherit;font-size:12px;font-weight:700;padding:5px 11px;border-radius:8px;' + V3_METAL + ';color:#f2c24e;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;' +
          (state.fStar ? 'outline:1px solid #f2c24e;outline-offset:-1px' : 'opacity:.8') + '">⭐ Áríðandi' + (c ? '' : '') + '</button>' +
        (function () {
          const tc = {};
          allItems().filter(x => inQueue(x)).forEach(x => dispTags(x).forEach(t => { tc[t] = (tc[t] || 0) + 1; }));
          return TAG_ORDER.map(t => {
            const d = TAGS[t], on = state.fTag === t, n = tc[t] || 0;
            if (!n && !on) return '';
            return '<button data-act="tagfilter" data-tag="' + t + '" title="Sía eftir merkinu ' + esc(d.label) + '" ' +
              'style="font-family:inherit;font-size:12px;font-weight:600;padding:5px 11px;border-radius:8px;' + V3_METAL + ';color:' + (TAG_DK[t] || '#c3ccd8') + ';cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;' +
              (on ? 'outline:1px solid currentColor;outline-offset:-1px' : 'opacity:.8') + '">' +
              d.emoji + ' ' + esc(d.label) + ' <span style="opacity:.6">' + n + '</span></button>';
          }).join('');
        })() +
      '</div>';
  }

  // Listakortið (v3): dökk-metal dálkahaus með röðunar-örvum, kaflar í
  // innhólfinu (bíða svars / svarað / geymsla), zebra-raðir, síðuskipting.
  const PAGE_SIZE = 50; // 2026-07-11: 25 → 50 (ósk Agnars)
  function colHead() {
    const arrow = (k) => {
      if (!state.colSort || state.colSort.key !== k) return '<span style="color:rgba(255,255,255,.45)">↕</span>';
      return '<span style="color:#fff">' + (state.colSort.dir === 'asc' ? '▲' : '▼') + '</span>';
    };
    return '<div style="display:flex;align-items:center;gap:16px;padding:11px 18px 11px 21px;' + V3_METAL.replace('border:1px solid #0a0b0d', 'border-bottom:1px solid #0a0b0d') + ';font-size:11.5px;font-weight:700;letter-spacing:.08em;color:#f0f2f5">' +
      '<span style="width:22px;flex:none"></span>' +
      '<span data-act="colsort" data-k="dags" style="width:74px;flex:none;display:inline-flex;align-items:center;gap:4px;cursor:pointer" class="vb-colh">DAGS. ' + arrow('dags') + '</span>' +
      '<span data-act="colsort" data-k="mal" style="flex:1;min-width:0;display:inline-flex;align-items:center;gap:4px;cursor:pointer">FYRIRTÆKI / MÁL ' + arrow('mal') + '</span>' +
      '<span style="width:220px;flex:none" class="vb-colmerki">MERKI</span>' +
      '<span data-act="colsort" data-k="stada" style="flex:none;display:inline-flex;align-items:center;gap:4px;cursor:pointer">STAÐA ' + arrow('stada') + '</span>' +
    '</div>';
  }
  function pager(total, shownFrom, shownTo) {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (pages <= 1) return '<div style="display:flex;align-items:center;padding:12px 18px;background:linear-gradient(180deg,#f1f4f9,#e7ebf2);border-top:1px solid rgba(20,24,34,.09)">' +
      '<span style="font-size:12px;color:#6b7686">Sýnir <b style="color:#3a4250">' + total + '</b> mál</span></div>';
    const cur = Math.min(state.page, pages - 1);
    let nums = [];
    for (let i = 0; i < pages; i++) {
      if (i === 0 || i === pages - 1 || Math.abs(i - cur) <= 1) nums.push(i);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    const btn = (label, pg, on, dis) =>
      dis ? '' : '<button data-act="page" data-p="' + pg + '" style="height:32px;min-width:32px;padding:0 8px;border-radius:8px;font-family:\'Space Mono\',monospace;font-size:12.5px;cursor:pointer;' +
        (on ? 'border:1px solid #0a0b0d;background:linear-gradient(145deg,#08080a,#2a2a30 50%,#070709);color:#fff;font-weight:700'
            : 'border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fff,#e3e7ee);color:#3a4250;font-weight:600;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)') + '">' + label + '</button>';
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;background:linear-gradient(180deg,#f1f4f9,#e7ebf2);border-top:1px solid rgba(20,24,34,.09);flex-wrap:wrap">' +
      '<span style="font-size:12px;color:#6b7686">Sýnir <b style="color:#3a4250">' + (shownFrom + 1) + '–' + shownTo + '</b> af <b style="color:#3a4250">' + total + '</b> málum</span>' +
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
        (cur > 0 ? btn('‹', cur - 1, false) : '') +
        nums.map(n => n === '…' ? '<span style="font-size:12px;color:#94a3b8;padding:0 2px">…</span>' : btn(String(n + 1), n, n === cur)).join('') +
        (cur < pages - 1 ? btn('›', cur + 1, false) : '') +
      '</div></div>';
  }
  function renderList() {
    const el = document.getElementById('vb-list'); if (!el) return;
    if (state.loading && !state.items.length) { el.innerHTML = colHead() + '<div class="vb-empty">Sæki…</div>'; return; }
    const rows = visibleRows();
    const sec = (t) => '<div style="display:flex;align-items:center;gap:8px;padding:9px 18px;background:linear-gradient(180deg,#f1f4f9,#e9edf4);border-top:1px solid rgba(20,24,34,.08);font-size:10.5px;font-weight:700;letter-spacing:.1em;color:#8a93a5">' + t + '</div>';
    let html = colHead();
    let listRows, total;
    if (state.queue === 'post') {
      const c = counts();
      const wait = rows.filter(x => isWaiting(x) && !isArchived(x));
      const rest = rows.filter(x => !isWaiting(x) && !isArchived(x));
      const old = rows.filter(isArchived);
      html +=
        (wait.length ? sec('🔴 BÍÐA SVARS — ELSTU EFST') + wait.map(renderRow).join('') : '') +
        (rest.length ? sec(wait.length ? 'SVARAÐ & UPPLÝSINGAR' : 'INNHÓLF') + rest.map(renderRow).join('') : '') +
        (!wait.length && !rest.length && !state.showOld ? '<div class="vb-empty">🎉 Innhólfið er tómt.</div>' : '') +
        (c.geymsla || old.length
          ? '<div data-act="showold" style="text-align:center;font-size:12.5px;color:#5b6472;padding:11px;cursor:pointer;text-decoration:underline;border-top:1px solid rgba(20,24,34,.07)">' +
            (state.showOld ? '▲ Fela eldri póst' : '📦 Sýna eldri póst (' + c.geymsla + ' í geymslu — ekkert eytt)') + '</div>' : '') +
        (state.showOld ? old.slice(0, 300).map(renderRow).join('') : '') +
        pager(wait.length + rest.length, 0, wait.length + rest.length);
    } else {
      total = rows.length;
      if (!total) {
        html += '<div class="vb-empty">' + (state.search ? 'Ekkert fannst fyrir „' + esc(state.search) + '\u201c.' : 'Engin mál hér.') + '</div>';
      } else {
        const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (state.page > pages - 1) state.page = pages - 1;
        const from = state.page * PAGE_SIZE;
        listRows = rows.slice(from, from + PAGE_SIZE);
        html += listRows.map(renderRow).join('') + pager(total, from, from + listRows.length);
      }
    }
    el.innerHTML = html;
    if (state.expandedId != null) {
      const open = el.querySelector('.vb-row.open, .task.open');
      if (open) wireEditor(open);
    }
  }

  // v3 task-röðin: 5px flokkslituð rönd · stjarna · mono-dags · titill+lýsing+
  // tenging · MERKI-dálkur (jafnbreiðir dökk-metal chippar) · STAÐA-pilla · ✕.
  function renderRow(r) {
    const open = state.expandedId === r.id;
    const done = !isOpen(r);
    const compact = state.viewMode === 'thett' && !open;
    // Breiðara viewið (▮ Ítarlegt, líka sjálfgefna „venjulegt"): skýringin fær
    // allt að 4 línur í stað einnar (ósk Agnars 11.7.) — Þétt heldur einni.
    const wide = state.viewMode !== 'thett';
    const di = dueInfo(r.due_at);
    const od = isOverdue(r);
    const tags = dispTags(r);
    // Innihaldslínan: nýjasta þráðasvar → ✨ samantekt → nótu-forsýn.
    const tl = state.threadLatest[r.id];
    const pvMax = state.viewMode !== 'thett' ? 620 : 260;
    const desc = tl
      ? '↩ ' + (tl.mine ? 'Við svöruðum' : tl.from) + ' · ' + fmtShortDate(tl.at) + ' — ' + cleanPreview(tl.text, pvMax)
      : (r.summary ? '✨ ' + r.summary : cleanPreview(r.notes || '', pvMax));
    const descColor = tl ? '#0f766e' : (r.summary && /^✅|^⚠️/.test(r.summary) ? (/^⚠️/.test(r.summary) ? '#be123c' : '#047857') : '#5b6472');
    // Litlar stöðu-flögur við lýsinguna (bíð-dagar / svarað / geymsla / gjalddagi)
    const flags =
      (isWaiting(r) ? '<span style="font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:7px;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;white-space:nowrap">🔴 ' +
        (function (d) { return d === 0 ? 'kom í dag' : d === 1 ? 'bíður 1 dag' : 'bíður ' + d + ' daga'; })(waitDays(r)) + '</span>' : '') +
      (isPost(r) && !isWaiting(r) && isOpen(r) && isReplied(r) ? '<span style="font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:7px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;white-space:nowrap">✓ svarað</span>' : '') +
      (isArchived(r) ? '<span style="font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:7px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;white-space:nowrap">📦 geymsla</span>' : '') +
      (di ? '<span style="font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:7px;white-space:nowrap;font-family:\'Space Mono\',monospace;' +
        (od ? 'background:#fff1f2;color:#be123c;border:1px solid #fecdd3' : 'background:#fffbeb;color:#b45309;border:1px solid #fde68a') + '">📅 ' + esc(di.label) + '</span>' : '');
    const linkLine = r.customer_nafn
      ? '<span data-act="history" data-id="' + esc(r.id) + '" style="font-size:12.5px;font-weight:600;color:#2f5fe0;display:inline-flex;align-items:center;gap:5px;cursor:pointer">🏢 ' + esc(r.customer_nafn) + '</span>'
      : '<span style="font-size:12px;color:#94a3b8;font-style:italic;display:inline-flex;align-items:center;gap:5px">🔗 engin tenging</span>';
    return '<div class="task' + (open ? ' open' : '') + (done ? ' vb-done' : '') + '" data-id="' + esc(r.id) + '" data-act="expand" ' +
      'style="display:flex;align-items:stretch;gap:0;border-top:1px solid rgba(20,24,34,.07);cursor:pointer' + (done ? ';opacity:.62' : '') + '">' +
      '<span style="width:5px;flex:none;background:' + railColor(r) + '"></span>' +
      '<div style="flex:1;min-width:0;display:flex;gap:16px;padding:' + (compact ? '9px 18px' : '14px 18px') + ';align-items:flex-start" class="vb-rowflex">' +
        '<span data-act="star" data-id="' + esc(r.id) + '" title="Áríðandi" style="flex:none;width:22px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-top:1px;font-size:15px;color:' + (r.important ? '#e0a93e' : '#cbd2dc') + '">' + (r.important ? '★' : '☆') + '</span>' +
        '<div class="vb-dags" style="width:74px;flex:none;font-family:\'Space Mono\',monospace;font-size:11.5px;color:#9098a6;padding-top:2px">' + fmtDots(r.created_at) + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:14px;font-weight:600;color:#11141c;' + (compact ? 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis' : 'line-height:1.35') + '">' +
            (done ? '<s style="color:#9098a6">' + esc(r.title || '(án titils)') + '</s>' : esc(r.title || '(án titils)')) + '</div>' +
          (!compact && desc ? '<div style="font-size:12.5px;color:' + descColor + ';margin-top:2px;' +
            (wide ? 'display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;white-space:normal;overflow-wrap:break-word;line-height:1.5'
                  : 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis') + '">' + esc(desc) + '</div>' : '') +
          (!compact ? '<div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' + linkLine + flags +
            (r._vd ? '<span style="font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:7px;background:#fef3c7;color:#92400e;border:1px solid #fde68a">📓 úr Verkdagbók</span>' : '') +
          '</div>' : '') +
          (open ? renderEditor(r) : '') +
        '</div>' +
        '<div class="vb-colmerki" style="width:220px;flex:none;display:flex;flex-wrap:wrap;gap:5px;justify-content:flex-end;align-content:flex-start">' +
          tags.map(t => dkChip(t)).join('') +
        '</div>' +
        '<div class="vb-acts" style="flex:none;display:flex;align-items:center;gap:12px;padding-top:1px">' +
          (isPost(r) && isOpen(r) && !isArchived(r) ? '<span data-act="promote" data-id="' + esc(r.id) + '" title="Færa á verkefnalistann" ' +
            'style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:8px;background:linear-gradient(150deg,#2bbf6c,#0f6e3a);color:#fff;border:1px solid #156e3a;white-space:nowrap;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.25)">📋 Færa</span>' : '') +
          (isArchived(r) && isOpen(r) ? '<span data-act="unarchive" data-id="' + esc(r.id) + '" title="Taka úr geymslu" ' +
            'style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:8px;border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fff,#e3e7ee);color:#3a4250;white-space:nowrap;cursor:pointer">↩ Út</span>' : '') +
          stadaPill(r) +
          (r._vd ? '' : '<span data-act="quickdel" data-id="' + esc(r.id) + '" title="Fela / eyða (endurheimtanlegt)" style="color:#cbd2dc;cursor:pointer;font-size:15px">✕</span>') +
        '</div>' +
      '</div>' +
    '</div>';
  }
  // Nótu-forsýn: fjarlægja langar slóðir (mailchimp/gallery o.fl.) sem gera
  // sjálfvirku póst-tilkynningarnar ólæsilegar á listanum.
  function cleanPreview(s, max) {
    return String(s || '').replace(/https?:\/\/\S+/g, '🔗').replace(/\[\s*🔗\s*\]/g, '🔗').replace(/\s+/g, ' ').trim().slice(0, max || 260);
  }
  function fmtShortDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.';
  }

  function renderEditor(r) {
    if (r._vd) {
      return '<div class="vb-ed" data-act="noexpand">' +
        (r.notes ? '<div style="font-size:13px;color:#475569;white-space:pre-wrap">' + esc(r.notes) + '</div>' : '<div class="vb-hint">Þjónustufærsla úr Verkdagbók.</div>') +
        '<div class="vb-ed-actions">' +
          '<button class="vb-btn" data-act="vd-open" data-id="' + esc(r.id) + '">📓 Opna í Verkdagbók</button>' +
          '<button class="vb-btn green" data-act="vd-done" data-id="' + esc(r.id) + '">✓ Klárað</button>' +
        '</div></div>';
    }
    const statusOpts = STATUS_ORDER.map(s => '<option value="' + s + '"' + (r.status === s ? ' selected' : '') + '>' + STATUSES[s].label + '</option>').join('');
    // Þjónustuborð v2: FLOKKURINN kemur í stað gömlu Tegundar í ritlinum
    // (type-dálkurinn stendur óbreyttur í grunninum fyrir eldri síður).
    const flokkOpts = ['<option value=""' + (!rowFlokk(r) ? ' selected' : '') + '>• Annað</option>'].concat(
      FLOKK_ORDER.map(f => '<option value="' + f + '"' + (rowFlokk(r) === f ? ' selected' : '') + '>' + FLOKKAR[f].emoji + ' ' + FLOKKAR[f].label + '</option>')).join('');
    const prioOpts = Object.keys(PRIORITIES).map(p => '<option value="' + p + '"' + (r.priority === p ? ' selected' : '') + '>' + PRIORITIES[p] + '</option>').join('');
    const dueVal = r.due_at ? new Date(r.due_at).toISOString().slice(0, 10) : '';
    return '<div class="vb-ed" data-act="noexpand">' +
      '<div><label>Titill</label><input data-field="title" value="' + esc(r.title || '') + '"></div>' +
      '<div><label>Nótur</label><textarea data-field="notes" placeholder="Lýsing, símanúmer, krækjur…">' + esc(r.notes || '') + '</textarea></div>' +
      '<div class="vb-ed-grid">' +
        '<div><label>Flokkur</label><select data-field="flokkur">' + flokkOpts + '</select></div>' +
        '<div><label>Staða</label><select data-field="status">' + statusOpts + '</select></div>' +
        '<div><label>Forgangur</label><select data-field="priority">' + prioOpts + '</select></div>' +
        '<div><label>Gjalddagi / dagsetning</label><input type="date" data-field="due_at" value="' + dueVal + '"></div>' +
      '</div>' +
      '<div><label>Viðskiptavinur</label><input data-field="customer_nafn" list="vb-companies" value="' + esc(r.customer_nafn || '') + '" placeholder="Fyrirtæki…"><datalist id="vb-companies"></datalist></div>' +
      // Merki (2026-07-10): smella til að setja/taka af — vistast strax í tags (jsonb).
      '<div><label>Merki</label><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">' +
        TAG_ORDER.map(t => {
          const d = TAGS[t], on = rowTags(r).indexOf(t) !== -1;
          return '<button data-act="tagtoggle" data-id="' + esc(r.id) + '" data-tag="' + t + '" type="button" ' +
            'style="font:inherit;font-size:11px;font-weight:700;padding:5px 10px;border-radius:99px;cursor:pointer;' +
            'color:' + (on ? '#fff' : d.color) + ';background:' + (on ? d.color : d.color + '12') + ';border:1.5px solid ' + d.color + (on ? '' : '44') + '">' +
            d.emoji + ' ' + esc(d.label) + '</button>';
        }).join('') +
      '</div></div>' +
      '<div class="vb-ed-actions">' +
        '<button class="vb-ai vb-btn" data-act="ai" data-id="' + esc(r.id) + '">✨ Tillaga</button>' +
        // ✉️ Svara — beint úr borðinu (2026-07-10): opnar sama svar-gluggann og
        // Reikninga-póstur (Claude semur uppkast → yfirfara → senda gegnum Resend).
        // Aðeins á póst-beiðnum sem eiga upprunapóst (channel_ref='email:<id>').
        (isEmailBeidni(r) ? '<button class="vb-btn" data-act="reply" data-id="' + esc(r.id) + '" title="Svara póstinum — Claude semur uppkast sem þú yfirferð og sendir">✉️ Svara</button>' : '') +
        // Pósthólf ↔ Verkefni: færa yfir / til baka (ósk Agnars 2026-07-10).
        (isEmailBeidni(r) && isOpen(r) ? (isPost(r)
          ? '<button class="vb-btn" data-act="promote" data-id="' + esc(r.id) + '" style="border-color:#16a34a55;background:#f0fdf4;color:#166534">📋 Færa á verkefnalistann</button>'
          : '<button class="vb-btn" data-act="demote" data-id="' + esc(r.id) + '" title="Setja aftur í pósthólfið">↩ Í pósthólfið</button>') : '') +
        (r.customer_nafn ? '<button class="vb-btn" data-act="history" data-id="' + esc(r.id) + '" title="Öll gögn kúnnans — sölur, Payday-kröfur, skýrslur og samningar (sami gluggi og á Sölu)">🧾 Sjá fyrri viðskipti</button>' : '') +
        // 📞 Hringja: fyrsta símanúmerið úr titli/nótum verður tel:-hlekkur.
        (function () {
          const m = String((r.title || '') + ' ' + (r.notes || '')).match(/\b[4-8]\d{2}[- ]?\d{4}\b/);
          return m ? '<a class="vb-btn" data-act="noexpand" href="tel:' + m[0].replace(/\D/g, '') + '" style="text-decoration:none;display:inline-flex;align-items:center">📞 Hringja ' + m[0] + '</a>' : '';
        })() +
        (isPost(r) && !isArchived(r) && isOpen(r) ? '<button class="vb-btn" data-act="archive" data-id="' + esc(r.id) + '" title="Setja í geymslu (📦 Eldra) — ekkert eytt">📦 Í geymslu</button>' : '') +
        '<span style="flex:1"></span>' +
        '<button class="vb-btn red" data-act="del" data-id="' + esc(r.id) + '">🗑 Eyða</button>' +
        (isOpen(r) ? '<button class="vb-btn green" data-act="done" data-id="' + esc(r.id) + '">✓ Klára verk</button>' : '') +
        '<button class="vb-btn" data-act="collapse">Loka glugga</button>' +
      '</div></div>';
  }

  // ── event wiring ─────────────────────────────────────────────────────────
  let _searchTimer = null, _noteTimer = null;
  function wireDelegation(root) {
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-act]'); if (!t) return;
      const act = t.getAttribute('data-act');
      const id = t.getAttribute('data-id');
      const nid = id && id.indexOf('vd:') !== 0 ? Number(id) : id;
      if (act === 'add') { doAdd(); return; }
      if (act === 'addmore') { doAdd(true); return; }
      if (act === 'email') { ingestEmailHere(t); return; }
      if (act === 'addtag') {
        const tg = t.getAttribute('data-tag'), d = TAGS[tg];
        const i = state.addTags.indexOf(tg);
        if (i === -1) state.addTags.push(tg); else state.addTags.splice(i, 1);
        const on = i === -1;
        t.style.color = on ? '#fff' : d.color;
        t.style.background = on ? d.color : d.color + '12';
        t.style.borderColor = d.color + (on ? '' : '44');
        return;
      }
      if (act === 'addtype') {
        state.addType = t.getAttribute('data-type');
        root.querySelectorAll('.vb-add-types .vb-tchip').forEach(c => {
          const ct = c.getAttribute('data-type'), on = ct === state.addType, d = typeDef(ct);
          c.classList.toggle('active', on);
          // Lita-chipparnir (2026-07-10): inline-litirnir verða að fylgja valinu.
          c.style.color = on ? '#fff' : d.color;
          c.style.background = on ? d.color : d.bg;
          c.style.borderColor = d.color + (on ? '' : '55');
        });
        const inp = document.getElementById('vb-add-input'); if (inp) inp.focus();
        return;
      }
      if (act === 'queue') { setQueue(t.getAttribute('data-q')); state.page = 0; renderControls(); renderList(); return; }
      if (act === 'filter') { setFilter(t.getAttribute('data-f')); renderControls(); renderList(); return; }
      if (act === 'sort') { setSort(t.getAttribute('data-s')); state.colSort = null; state.page = 0; renderControls(); renderList(); return; }
      if (act === 'viewmode') { setViewMode(t.getAttribute('data-vm')); renderControls(); renderList(); return; }
      // v3: composer-toggl (+ Nýtt mál), ⭐ Áríðandi-sía, dálkaröðun, síðuskipting.
      if (act === 'composer') {
        state.composerOpen = !state.composerOpen;
        const p = document.getElementById('vb-composer');
        if (p) { p.style.display = state.composerOpen ? 'block' : 'none'; if (state.composerOpen) { const i = document.getElementById('vb-add-input'); if (i) i.focus(); } }
        return;
      }
      if (act === 'starfilter') { state.fStar = !state.fStar; state.page = 0; renderControls(); renderList(); return; }
      if (act === 'colsort') {
        e.stopPropagation();
        const k = t.getAttribute('data-k');
        state.colSort = (state.colSort && state.colSort.key === k)
          ? (state.colSort.dir === 'asc' ? { key: k, dir: 'desc' } : null)
          : { key: k, dir: k === 'dags' ? 'desc' : 'asc' };
        state.page = 0; renderList(); return;
      }
      if (act === 'page') {
        e.stopPropagation();
        state.page = Number(t.getAttribute('data-p')) || 0; renderList();
        const lc = document.getElementById('vb-list'); if (lc) lc.scrollIntoView({ block: 'start', behavior: 'smooth' });
        return;
      }
      if (act === 'history') {
        e.stopPropagation();
        const row = state.items.find(x => x.id === Number(t.getAttribute('data-id')));
        if (!row || !window.SalaCustomerHistory || !SalaCustomerHistory.open) return;
        loadCompanies().then(cos => {
          const co = (cos || []).find(c => String(c.nafn || '').trim().toLowerCase() === String(row.customer_nafn || '').trim().toLowerCase());
          // Fannst á skrá → full kt-uppfletting (sölur+Payday+skjöl+samningar);
          // annars nafna-leit (sýnir a.m.k. sölurnar á sama nafni).
          SalaCustomerHistory.open(co
            ? { id: co.id, source: 'fyrirtaeki', kt: co.kennitala || '', nafn: co.nafn }
            : { id: '', source: '', kt: '', nafn: row.customer_nafn || '' });
        });
        return;
      }
      if (act === 'tagfilter') { const tg = t.getAttribute('data-tag'); setTag(state.fTag === tg ? '' : tg); renderControls(); renderList(); return; }
      if (act === 'tagtoggle') {
        e.stopPropagation();
        const rid = Number(t.getAttribute('data-id'));
        const row = state.items.find(x => x.id === rid); if (!row) return;
        const cur = rowTags(row), tg = t.getAttribute('data-tag');
        const next = cur.indexOf(tg) !== -1 ? cur.filter(x => x !== tg) : cur.concat([tg]);
        saveRow(rid, { tags: next });
        renderControls(); renderList();
        return;
      }
      if (act === 'import') { importOld(); return; }
      // Þjónustuborð v2: flokka-sía, geymsla, klára.
      if (act === 'flokk') { const f = t.getAttribute('data-f'); setFlokk(state.fFlokk === f ? '' : f); renderControls(); renderList(); return; }
      if (act === 'showold') { state.showOld = !state.showOld; renderList(); return; }
      if (act === 'archive') {
        e.stopPropagation();
        saveRow(nid, { archived_at: nowIso() });
        toast('📦 Sett í geymslu'); state.expandedId = null;
        renderControls(); renderList(); refreshBadge(); return;
      }
      if (act === 'unarchive') {
        e.stopPropagation();
        saveRow(nid, { archived_at: null });
        toast('↩ Komið aftur í innhólfið');
        renderControls(); renderList(); refreshBadge(); return;
      }
      if (act === 'done') {
        e.stopPropagation();
        saveRow(nid, { status: 'lokad' });
        toast('✓ Verk klárað'); state.expandedId = null;
        renderControls(); renderList(); refreshBadge(); return;
      }
      // 📋 Færa póst úr Pósthólfi yfir á verkefnalistann (og ↩ til baka).
      if (act === 'promote') {
        e.stopPropagation();
        saveRow(nid, { promoted_at: nowIso() });
        toast('📋 Fært á verkefnalistann');
        renderControls(); renderList(); refreshBadge();
        return;
      }
      if (act === 'demote') {
        e.stopPropagation();
        saveRow(nid, { promoted_at: null });
        toast('📧 Fært aftur í pósthólfið');
        renderControls(); renderList(); refreshBadge();
        return;
      }
      if (act === 'noexpand') { e.stopPropagation(); return; }
      if (act === 'status') { e.stopPropagation(); advance(id); return; }
      if (act === 'star') { e.stopPropagation(); toggleStar(id); return; }
      if (act === 'ai') { e.stopPropagation(); aiSuggest(nid); return; }
      if (act === 'reply') { e.stopPropagation(); replyToBeidni(nid); return; }
      if (act === 'quickdel') { e.stopPropagation(); quickDelete(nid); return; }
      if (act === 'clearnoise') { clearPaymentNoise(); return; }
      if (act === 'del') { e.stopPropagation(); softDelete(nid); return; }
      if (act === 'collapse') { e.stopPropagation(); state.expandedId = null; renderList(); return; }
      if (act === 'vd-open') { e.stopPropagation(); if (window.App && App.switchView) App.switchView('verkdagbok'); return; }
      if (act === 'vd-done') { e.stopPropagation(); vdSetDone(id.slice(3)); return; }
      if (act === 'expand') {
        const rid = t.getAttribute('data-id');
        const real = rid && rid.indexOf('vd:') !== 0 ? Number(rid) : rid;
        state.expandedId = (state.expandedId === real) ? null : real;
        renderList();
        if (state.expandedId != null) loadCompanies().then(fillCompanyList);
        return;
      }
    });
    root.addEventListener('input', e => {
      if (e.target.id === 'vb-search') {
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => { state.search = e.target.value; renderList(); }, 180);
        return;
      }
      const f = e.target.getAttribute && e.target.getAttribute('data-field');
      if (f && (f === 'title' || f === 'notes')) {
        const id = currentEditorId(e.target);
        if (id == null) return;
        clearTimeout(_noteTimer);
        const val = e.target.value;
        _noteTimer = setTimeout(() => saveRow(id, { [f]: val }), 500);
      }
    });
    root.addEventListener('keydown', e => {
      if (e.target.id === 'vb-add-input' && e.key === 'Enter') { e.preventDefault(); doAdd(); }
      if (e.target.id === 'vb-add-cust' && e.key === 'Enter') { e.preventDefault(); document.getElementById('vb-add-input')?.focus(); }
    });
    // Fyrirtækja-datalist quick-línunnar fyllist við fyrstu snertingu (lazy).
    root.addEventListener('focusin', e => {
      if (e.target.id === 'vb-add-cust' || e.target.id === 'vb-add-input') loadCompanies().then(fillCompanyList);
    });
    // RSK-uppfletting (2026-07-10, ósk Agnars — „finna þá fyrirtæki á skrá eða
    // rsk"): sé KENNITALA (10 tölustafir) slegin í fyrirtækjareitinn flettist
    // hún upp í RSK fyrirtækjaskrá gegnum /api/kt-lookup og reiturinn fyllist
    // með opinbera nafninu; kt+heimilisfang geymast og fara í nótur verksins.
    root.addEventListener('change', e => {
      if (e.target.id !== 'vb-add-cust') return;
      const digits = String(e.target.value || '').replace(/\D/g, '');
      if (digits.length !== 10) { state.addRsk = null; return; }
      const inp = e.target;
      inp.style.borderColor = '#d97706';
      fetch('/.netlify/functions/kt-lookup?kt=' + digits)
        .then(r => r.ok ? r.json() : Promise.reject(new Error('fannst ekki')))
        .then(d => {
          if (!d || !d.nafn) throw new Error('fannst ekki');
          state.addRsk = { kt: digits, nafn: d.nafn, heimilisfang: [d.heimilisfang, d.postnumer, d.stadur].filter(Boolean).join(' ') };
          inp.value = d.nafn;
          inp.style.borderColor = '#16a34a';
          toast('RSK: ' + d.nafn + (state.addRsk.heimilisfang ? ' · ' + state.addRsk.heimilisfang : ''));
        })
        .catch(() => { state.addRsk = null; inp.style.borderColor = '#dc2626'; toast('Kennitalan fannst ekki í RSK'); });
    });
    root.addEventListener('change', e => {
      const f = e.target.getAttribute && e.target.getAttribute('data-field');
      if (!f) return;
      const id = currentEditorId(e.target);
      if (id == null) return;
      let val = e.target.value;
      if (f === 'due_at') val = val ? new Date(val + 'T00:00:00').toISOString() : null;
      if (f === 'customer_nafn') {
        const match = (state.companies || []).find(c => c.nafn === val);
        saveRow(id, { customer_nafn: val || null, customer_base_id: match ? match.customer_base_id : null });
      } else {
        saveRow(id, { [f]: val });
      }
      if (f === 'status' || f === 'type') { renderControls(); renderList(); refreshBadge(); }
    });
  }
  function currentEditorId() { return state.expandedId; }
  function doAdd(expand) {
    const inp = document.getElementById('vb-add-input'); if (!inp) return;
    const cust = document.getElementById('vb-add-cust');
    const v = inp.value; inp.value = '';
    const cv = cust ? cust.value : '';
    if (cust) cust.value = '';
    // Merkin tekin SAMSTUNDIS (quickAdd er async — má ekki lesa state eftir hreinsun).
    // RSK-uppflettingin (ef kt var slegin inn) fylgir verkinu í nótur.
    const rsk = (state.addRsk && cv && state.addRsk.nafn === cv) ? state.addRsk : null;
    state.addRsk = null;
    if (cust) cust.style.borderColor = '';
    quickAdd(v, state.addType, cv, !!expand, state.addTags.slice(), rsk);
    state.addTags = [];
    document.querySelectorAll('#view-verkbord [data-act="addtag"]').forEach(c => {
      const d = TAGS[c.getAttribute('data-tag')]; if (!d) return;
      c.style.color = d.color; c.style.background = d.color + '12'; c.style.borderColor = d.color + '44';
    });
    inp.focus();
  }
  // ✉️ Sækja tölvupóst — endurnýtir póst-innsogið úr Þjónustuveri (182, sama
  // tafla thjonustubeidni, idempotent á channel_ref) og endurhleður borðið.
  async function ingestEmailHere(btn) {
    if (!window.Thjonustuver || !Thjonustuver.ingestEmail) { toast('Póst-innsogið (182) er ekki hlaðið'); return; }
    const old = btn.textContent;
    btn.disabled = true; btn.textContent = '✉️ Sæki…';
    try { await Thjonustuver.ingestEmail(); } catch (e) { toast('Villa: ' + (e.message || e)); }
    btn.disabled = false; btn.textContent = old;
    load();
  }
  // Er þetta beiðni sem varð til úr pósti? channel_ref='email:<email_digest.id>'
  // (sett af Þjónustuver ingestEmail) → hægt að svara sendandanum.
  function isEmailBeidni(r) {
    return !!(r && (r.source === 'email' || /^email:/.test(String(r.channel_ref || ''))));
  }
  // ✉️ Svara — flettir upp upprunapóstinum (email_digest) og opnar svar-gluggann
  // úr Reikninga-pósti (240, ReikningaPostur.replyTo). Sami Claude-uppkast +
  // Resend-sending og þar. Allt samtalið gerist því á borðinu (ósk Agnars).
  async function replyToBeidni(id) {
    const row = state.items.find(x => String(x.id) === String(id)); if (!row) return;
    if (!window.ReikningaPostur || !ReikningaPostur.replyTo) { toast('Svar-vélin (Reikninga-póstur, 240) er ekki hlaðin'); return; }
    const ref = String(row.channel_ref || '');
    const digestId = ref.indexOf('email:') === 0 ? ref.slice(6) : null;
    let m = null;
    const SB = getSB();
    if (digestId && SB) {
      try {
        const r = await SB.from('email_digest')
          .select('message_id,sender_name,sender_email,subject,snippet,body_preview')
          .eq('id', digestId).maybeSingle();
        if (r && r.data) {
          const e = r.data;
          m = { message_id: e.message_id, sender_name: e.sender_name || row.customer_nafn || '',
            from: e.sender_email || '', subject: e.subject || row.title || '',
            body_preview: e.body_preview || '', snippet: e.snippet || row.notes || '' };
        }
      } catch (_) {}
    }
    // Fallback ef digest-röðin fannst ekki — nota það sem er á beiðninni.
    if (!m) m = { message_id: null, sender_name: row.customer_nafn || '', from: '', subject: row.title || '', body_preview: '', snippet: row.notes || '' };
    if (!m.from) { toast('Ekkert sendandanetfang fannst á þessari beiðni — opnaðu upprunapóstinn í Reikninga-pósti.'); return; }
    // Þegar svarið er SENT (Resend-ok í 240-glugganum) fær beiðnin svarad_at —
    // hún dettur þá sjálfkrafa úr „🔴 Bíða svars" og ber „✓ svarað"-merkið.
    m._onSent = () => {
      saveRow(row.id, { svarad_at: nowIso(), status: row.status === 'nytt' ? 'i_vinnslu' : row.status });
      renderControls(); renderList(); refreshBadge();
    };
    ReikningaPostur.replyTo(m);
  }
  function advance(id) {
    if (typeof id === 'string' && id.indexOf('vd:') === 0) { return; }
    const rid = Number(id);
    const row = state.items.find(x => x.id === rid); if (!row) return;
    const ns = nextStatus(row.status);
    saveRow(rid, { status: ns });
    renderControls(); renderList(); refreshBadge();
  }
  function toggleStar(id) {
    if (typeof id === 'string' && id.indexOf('vd:') === 0) return;
    const rid = Number(id);
    const row = state.items.find(x => x.id === rid); if (!row) return;
    saveRow(rid, { important: !row.important });
    renderControls(); renderList(); refreshBadge();
  }
  function wireEditor(rowEl) {
    // Nótu-svæðið stækkar sjálft að innihaldinu (upp að ~60% skjáhæðar) og
    // heldur áfram að vaxa á meðan skrifað er; resize:vertical leyfir handvirkt.
    const ta = rowEl.querySelector('textarea[data-field="notes"]');
    if (ta) {
      // setProperty(...,'important') — patch 245 (Brunastál) setur height:auto
      // !important á allar textareur og vinnur annars á venjulegu inline-height.
      const cap = Math.max(360, Math.round(window.innerHeight * 0.65));
      const grow = () => {
        ta.style.setProperty('height', 'auto', 'important');
        ta.style.setProperty('height', Math.min(ta.scrollHeight + 4, cap) + 'px', 'important');
      };
      grow();
      ta.addEventListener('input', grow);
    }
  }
  function fillCompanyList() {
    if (!state.companies) return;
    const opts = state.companies.slice(0, 1500).map(c => '<option value="' + esc(c.nafn) + '"></option>').join('');
    const dl = document.getElementById('vb-companies'); if (dl) dl.innerHTML = opts;
    const dl2 = document.getElementById('vb-add-colist'); if (dl2) dl2.innerHTML = opts;   // quick-línan (2026-07-10)
  }

  // ── boot ──────────────────────────────────────────────────────────────────
  function boot() {
    injectNav();
    patchSwitchView();
    setTimeout(() => { injectNav(); patchSwitchView(); }, 1500);
    // keep the "Í dag" badge fresh once settings/DB are warm
    if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => refreshBadge());
    // light preload so the badge has a number before first open
    setTimeout(() => { if (getSB() && !state.items.length) quietCount(); }, 2500);
  }
  async function quietCount() {
    const SB = getSB(); if (!SB) return;
    try {
      const a = await SB.from('thjonustubeidni').select('*').is('deleted_at', null).range(0, 1499);
      if (!a.error) { state.items = a.data || []; }
      const b = await SB.from('verkdagbok').select('*').eq('done', false).eq('archived', false).range(0, 499);
      if (b && !b.error) state.vd = b.data || [];
      refreshBadge();
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Verkbord = { open: show, reload: load, importOld };
  console.log('[patch-231] Verkborð installed — App.switchView("verkbord")');
})();
/* === END VERKBORÐ === */
