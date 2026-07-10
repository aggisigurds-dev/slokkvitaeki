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
    queue: (function () { try { return localStorage.getItem(QKEY) || 'idag'; } catch (_) { return 'idag'; } })(),
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
    // 2026-07-10 (kvörtun Agnars — „algjörlega ónothæft"): á síma fyllti
    // stjórnborðið HEILAN skjá áður en fyrsta verkefnið sást. Aukahlutir
    // skráningarlínunnar (fyrirtæki/merki/fleiri valkostir) og auka-stjórntækin
    // (röðun/sýn/póst-takkar) eru því samanbrotin þar til beðið er um þau.
    addOpen: false,     // aukahlutir skráningarlínunnar sýnilegir?
    moreOpen: false,    // „⚙ Meira"-röðin (röðun/sýn/póstur/innflutningur) opin?
    expandedId: null
  };
  function setQueue(q) { state.queue = q; try { localStorage.setItem(QKEY, q); } catch (_) {} }
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

  async function quickAdd(title, type, custName, expand, tags) {
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
    const obj = {
      title, notes: '', type: type || 'annad', status: 'nytt', priority: 'venjulegur',
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
  function inQueue(r) {
    if (state.queue === 'idag') return isToday(r);
    if (state.queue === 'lokad') return !isOpen(r);
    return isOpen(r); // opid
  }
  // 2026-07-10: gamla type-sían fjarlægð (flokkun fer nú gegnum MERKI). Hlutlaus
  // svo gömul vistuð type-sía í localStorage feli ekki raðir. (Fall haldið til
  // öryggis ef eitthvað kallar enn á það.)
  function inFilter() { return true; }
  function visibleRows() {
    let r = allItems().filter(x => inQueue(x) && inFilter(x));
    if (state.fTag) r = r.filter(x => rowTags(x).indexOf(state.fTag) !== -1);
    const s = state.search.trim().toLowerCase();
    if (s) r = r.filter(x => [x.customer_nafn, x.title, x.notes].some(f => (f || '').toLowerCase().includes(s)));
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
    const c = { idag: 0, opid: 0, lokad: 0 };
    for (const x of all) { if (isToday(x)) c.idag++; if (isOpen(x)) c.opid++; else c.lokad++; }
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
    const n = counts().idag;
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
      #view-verkbord { font-family: 'Space Grotesk', system-ui, sans-serif; color: #11141c; }
      /* 2026-07-10 (ósk Agnars): efnissvæðið nær næstum út í enda skjásins. */
      #view-verkbord .vb-wrap { max-width: none; margin: 0 auto; padding: 22px 28px 80px; }
      /* ☰ Þéttur listi — ein lína per verk (titill + merki á sömu línu). */
      #view-verkbord .vb-row.thett { padding: 7px 14px; }
      #view-verkbord .vb-row.thett .vb-main { display: flex; align-items: center; gap: 10px; min-width: 0; }
      #view-verkbord .vb-row.thett .vb-title { font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 0 1 auto; }
      #view-verkbord .vb-row.thett .vb-meta { margin-top: 0; flex: 1; flex-wrap: nowrap; overflow: hidden; min-width: 0; }
      /* Quick-add card — surface card */
      #view-verkbord .vb-add { display:flex; gap:10px; flex-wrap:wrap; align-items:center;
        background:#fff; border:1px solid rgba(20,24,34,.08); border-radius:16px; padding:14px 16px;
        box-shadow:0 10px 28px -16px rgba(25,35,60,.16); position:sticky; top:0; z-index:6; }
      #view-verkbord .vb-add-input { flex:1; min-width:220px; font:inherit; font-size:15px;
        background:#f6f8fb; border:1px solid rgba(20,24,34,.12); border-radius:11px; padding:11px 14px;
        color:#141822; outline:none; }
      #view-verkbord .vb-add-input:focus { border-color:#2f5fe0; background:#fff; box-shadow:0 0 0 3px rgba(47,95,224,.14); }
      /* Primary button — accent metallic blue per spec --btn-grad */
      #view-verkbord .vb-add-btn { font:inherit; font-size:14px; font-weight:700; color:#fff;
        background:linear-gradient(145deg,#03040a 0%,#0c1730 24%,#1d3c80 48%,#264c9e 56%,#0f2042 78%,#03060d 100%);
        border:1px solid rgba(110,155,255,.55); border-radius:12px; padding:11px 18px; cursor:pointer; min-height:44px;
        box-shadow:0 0 16px -4px rgba(64,113,240,.5), inset 0 1px 0 rgba(255,255,255,.16); }
      #view-verkbord .vb-add-btn:active { transform:translateY(1px); }
      #view-verkbord .vb-add-types { display:flex; gap:7px; flex-wrap:wrap; width:100%; margin-top:4px; }
      /* Add-type chips — light tint, active = accent blue */
      #view-verkbord .vb-tchip { font:inherit; font-size:12.5px; font-weight:600;
        padding:7px 13px; border-radius:10px;
        border:1px solid rgba(20,24,34,.14);
        background:linear-gradient(180deg,#fdfdfe,#e3e7ee);
        color:#3a4250; cursor:pointer; min-height:34px; }
      #view-verkbord .vb-tchip.active {
        background:linear-gradient(145deg,#03040a 0%,#0c1730 24%,#1d3c80 48%,#264c9e 56%,#0f2042 78%,#03060d 100%);
        color:#fff; border-color:#0a0b0d;
      }
      #view-verkbord .vb-controls { display:flex; gap:9px; flex-wrap:wrap; align-items:center; margin:18px 2px 14px; }
      /* Queue pills — large, inactive = metal, active = metallic black per spec */
      #view-verkbord .vb-q { font:inherit; font-size:13px; font-weight:600; padding:8px 16px; border-radius:11px;
        border:1px solid rgba(20,24,34,.14);
        background:linear-gradient(180deg,#fdfdfe,#e3e7ee); color:#3a4250; cursor:pointer; min-height:40px;
        display:inline-flex; align-items:center; gap:7px; }
      #view-verkbord .vb-q.active {
        background:linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%);
        color:#fff; border-color:#0a0b0d;
      }
      #view-verkbord .vb-q .n { font-family:'Space Mono', monospace; opacity:.85; font-weight:700; margin-left:5px; }
      /* Filter chips — same family, smaller */
      #view-verkbord .vb-fchip { font:inherit; font-size:12.5px; font-weight:600;
        padding:6px 13px; border-radius:10px;
        border:1px solid rgba(20,24,34,.14);
        background:#fff; color:#3a4250; cursor:pointer; min-height:36px; }
      #view-verkbord .vb-fchip.active { background:#eef3ff; color:#2f5fe0; border-color:#c6d6ff; font-weight:700; }
      #view-verkbord .vb-search { flex:1; min-width:160px; font:inherit; font-size:14px;
        border:1px solid rgba(20,24,34,.12); border-radius:10px; padding:9px 13px;
        background:#fff; color:#141822; outline:none; }
      #view-verkbord .vb-search:focus { border-color:#2f5fe0; box-shadow:0 0 0 3px rgba(47,95,224,.14); }
      #view-verkbord .vb-list { display:flex; flex-direction:column; gap:10px; }
      /* Row — hlutlaus, rólegur. Vinstri-kantur gefur stöðu-lit án þess að lita allt spjaldið. */
      #view-verkbord .vb-row { background:#fff; border:1px solid rgba(20,24,34,.07);
        border-left:3px solid #d7dce4; border-radius:13px; padding:14px 16px;
        display:flex; align-items:flex-start; gap:13px; cursor:pointer;
        box-shadow:0 1px 3px rgba(25,35,60,.06);
        transition:background .12s ease, box-shadow .12s ease, border-color .12s ease; }
      #view-verkbord .vb-row:hover { background:#f7f9fd; box-shadow:0 3px 10px -5px rgba(25,35,60,.16); }
      /* Áríðandi (⭐) = mjór rauður kantur, EKKI rauð fylling á öllu spjaldinu. */
      #view-verkbord .vb-row.imp { border-left-color:#e11d48; }
      /* Útrunnið = amber kantur (mildara en rautt á öllu). */
      #view-verkbord .vb-row.od { border-left-color:#f59e0b; }
      #view-verkbord .vb-row.imp.od { border-left-color:#e11d48; }
      #view-verkbord .vb-row.open { box-shadow:0 10px 28px -16px rgba(25,35,60,.28); border-left-color:#2f5fe0; }
      #view-verkbord .vb-dot { width:22px; height:22px; min-width:22px; border-radius:50%; border:2.5px solid;
        margin-top:2px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; font-size:12px; background:#fff; }
      #view-verkbord .vb-main { flex:1; min-width:0; }
      #view-verkbord .vb-title { font-size:14.5px; font-weight:650; color:#111827; line-height:1.35; word-break:break-word;
        display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      #view-verkbord .vb-row.done .vb-title { text-decoration:line-through; color:#9098a6; }
      #view-verkbord .vb-meta { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:7px; }
      /* Type chip — spec §3 shape */
      #view-verkbord .vb-type { font-size:11px; font-weight:600; padding:2.5px 9px; border-radius:7px; border:1px solid; white-space:nowrap; }
      #view-verkbord .vb-cust { font-size:12px; color:#4b5563; font-weight:500; }
      #view-verkbord .vb-cust::before { content:''; }
      /* Due chip — neutral; .od = overdue amber */
      #view-verkbord .vb-due { font-family:'Space Mono', monospace; font-size:11px; font-weight:600;
        padding:2.5px 8px; border-radius:7px; background:#f1f5f9; color:#64748b; border:1px solid #e6eaf0; }
      #view-verkbord .vb-due.od { background:#fffbeb; color:#b45309; border-color:#fde68a; }
      /* Innihaldslína — ✨ samantekt: hrein, létt, hámark 2 línur (enginn þungur kassi). */
      #view-verkbord .vb-sum { font-size:12.5px; color:#4338ca; margin-top:8px; line-height:1.5;
        padding-left:20px; position:relative;
        display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      #view-verkbord .vb-sum::before { content:'✨'; position:absolute; left:0; top:0; font-size:12px; opacity:.9; }
      /* Rá forsýn (þegar engin samantekt) — dauf, ein lína. */
      #view-verkbord .vb-body { font-size:12px; color:#8a93a5; margin-top:7px; line-height:1.45;
        display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; }
      /* ↩ Nýjasta svarið í þræðinum — sterkara en forsýn, hámark 2 línur. */
      #view-verkbord .vb-latest { font-size:12.5px; color:#334155; margin-top:8px; line-height:1.5;
        display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      #view-verkbord .vb-latest b { color:#0f766e; font-weight:700; }
      #view-verkbord .vb-star { font-size:17px; cursor:pointer; line-height:1; margin-top:1px; opacity:.5; }
      #view-verkbord .vb-star:hover { opacity:1; }
      #view-verkbord .vb-tag { font-size:10px; font-weight:700; color:#b45309; background:#fffbeb; padding:2px 7px; border-radius:6px; border:1px solid #fde68a; }
      /* Editor — inside the row, dashed top border */
      #view-verkbord .vb-ed { margin-top:12px; border-top:1px dashed rgba(20,24,34,.12); padding-top:12px; display:grid; gap:10px; }
      #view-verkbord .vb-ed label { font-size:10.5px; font-weight:700; color:#8a93a5;
        letter-spacing:.12em; text-transform:uppercase; display:block; margin-bottom:4px; }
      #view-verkbord .vb-ed input, #view-verkbord .vb-ed select, #view-verkbord .vb-ed textarea {
        font:inherit; font-size:14px; border:1px solid rgba(20,24,34,.12); border-radius:10px;
        padding:10px 12px; width:100%; box-sizing:border-box; background:#f6f8fb; color:#141822; outline:none; }
      #view-verkbord .vb-ed input:focus, #view-verkbord .vb-ed select:focus, #view-verkbord .vb-ed textarea:focus {
        border-color:#2f5fe0; background:#fff; box-shadow:0 0 0 3px rgba(47,95,224,.14); }
      #view-verkbord .vb-ed textarea { min-height:74px; resize:vertical; line-height:1.5; }
      #view-verkbord .vb-ed-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:10px; }
      #view-verkbord .vb-ed-actions { display:flex; gap:9px; flex-wrap:wrap; align-items:center; }
      /* Tertiary button (D — light neutral) */
      #view-verkbord .vb-btn { font:inherit; font-size:12.5px; font-weight:600;
        padding:10px 14px; border-radius:10px; cursor:pointer; min-height:40px;
        border:1px solid rgba(20,24,34,.14); background:#f1f5f9; color:#3a4250; }
      #view-verkbord .vb-btn:hover { background:#e2e8f0; }
      /* Danger / red button */
      #view-verkbord .vb-btn.red { border:1px solid #f3c6c4; background:#fdecec; color:#c0241f; }
      /* Confirm/done — dark-metal green per spec §2 C */
      #view-verkbord .vb-btn.green { background:linear-gradient(150deg,#2bbf6c,#0f6e3a);
        color:#fff; border:1px solid #156e3a; font-weight:700;
        box-shadow:inset 0 1px 0 rgba(255,255,255,.25); }
      #view-verkbord .vb-empty { text-align:center; color:#5b6472; padding:50px 18px;
        font-size:15px; font-weight:600; border:1px dashed rgba(20,24,34,.12); border-radius:14px; background:#fff; }
      #view-verkbord .vb-hint { font-size:12px; color:#5b6472; margin:2px 2px 0; font-weight:600; }
      /* Ein skrunanleg chippa-lína (síma-mynstur) — engin 5-línu chippa-veggur. */
      #view-verkbord .vb-scroll { display:flex; gap:6px; align-items:center; width:100%;
        flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch;
        scrollbar-width:none; padding-bottom:2px; }
      #view-verkbord .vb-scroll::-webkit-scrollbar { display:none; }
      #view-verkbord .vb-scroll > * { flex:0 0 auto; }
      @media (max-width:640px){
        #view-verkbord .vb-wrap{ padding:10px 10px 90px; }
        #view-verkbord .vb-add{ padding:10px 12px; gap:8px; }
        /* Reitur + takki deila EINNI línu (reiturinn má minnka) — extra-röðin
           er width:100% og brotnar því sjálf á næstu línu þegar hún er opin. */
        #view-verkbord .vb-add-input{ min-width:0; flex:1 1 0; }
        #view-verkbord .vb-add-btn{ padding:11px 13px; white-space:nowrap; }
        #view-verkbord .vb-controls{ margin:12px 2px 10px; gap:7px; }
        #view-verkbord .vb-q{ flex:1; text-align:center; justify-content:center; padding:8px 10px; }
        #view-verkbord .vb-search{ min-width:0; flex:1 1 100%; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── render ─────────────────────────────────────────────────────────────────
  function renderAll() {
    const main = document.getElementById('vb-main'); if (!main) return;
    main.innerHTML =
      '<div class="vb-wrap">' +
        '<div class="vb-add">' +
          // 2026-07-10 v2 (kvörtun Agnars — verkefnin verða að sjást STRAX á síma):
          // sjálfgefið er skráningarlínan EIN lína (texti + takki). Aukahlutirnir
          // (fyrirtækjareitur, ⚙ Fleiri valkostir, MERKI) birtast fyrst þegar
          // smellt er í reitinn — sjá focusin í wireDelegation.
          '<input class="vb-add-input" id="vb-add-input" placeholder="＋ Skrá verk… (Enter vistar)" autocomplete="off">' +
          '<button class="vb-add-btn" data-act="add">+ Bæta við</button>' +
          '<div id="vb-add-extra" style="display:' + (state.addOpen ? 'flex' : 'none') + ';flex-wrap:wrap;gap:8px;width:100%;align-items:center">' +
            '<input class="vb-add-cust" id="vb-add-cust" list="vb-add-colist" placeholder="🏢 Fyrirtæki…" autocomplete="off" ' +
              'style="flex:1 1 180px;min-width:140px;font:inherit;font-size:14px;padding:10px 13px;border-radius:11px;border:1.5px solid rgba(20,24,34,.14);background:#fbfcfe;outline:none">' +
            '<datalist id="vb-add-colist"></datalist>' +
            '<button data-act="addmore" title="Skrá og opna alla valkosti (forgangur, frestur, nánar…)" ' +
              'style="font:inherit;font-size:12.5px;font-weight:700;padding:10px 13px;border-radius:11px;border:1.5px solid rgba(20,24,34,.14);background:#fff;color:#475569;cursor:pointer">⚙ Fleiri valkostir</button>' +
            // Merki (2026-07-10, „hafðu bara tag"): velja má mörg um leið og skráð
            // er. EIN skrunanleg lína á síma (.vb-scroll) í stað 5 lína af chippum.
            '<div class="vb-scroll" style="margin-top:2px">' +
              '<span style="font-size:10.5px;font-weight:800;color:#8891a0;text-transform:uppercase;letter-spacing:.04em;align-self:center">🏷 Merki</span>' +
              TAG_ORDER.map(t => {
                const d = TAGS[t], on = state.addTags.indexOf(t) !== -1;
                return '<button data-act="addtag" data-tag="' + t + '" type="button" ' +
                  'style="font:inherit;font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;cursor:pointer;white-space:nowrap;' +
                  'color:' + (on ? '#fff' : d.color) + ';background:' + (on ? d.color : d.color + '12') + ';border:1.5px solid ' + d.color + (on ? '' : '44') + '">' +
                  d.emoji + ' ' + esc(d.label) + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="vb-hint" id="vb-hint"></div>' +
        '<div class="vb-controls" id="vb-controls"></div>' +
        '<div class="vb-list" id="vb-list"></div>' +
      '</div>';
    renderControls(); renderList();
  }

  function renderControls() {
    const el = document.getElementById('vb-controls'); if (!el) return;
    const c = counts();
    const q = (v, label, n) => '<button class="vb-q' + (state.queue === v ? ' active' : '') + '" data-act="queue" data-q="' + v + '">' + label + '<span class="n">' + n + '</span></button>';
    const f = (v, label) => '<button class="vb-fchip' + (state.filter === v ? ' active' : '') + '" data-act="filter" data-f="' + v + '">' + label + '</button>';
    // 2026-07-10 v2 (kvörtun Agnars): þrjár léttar línur í stað veggjar —
    // (A) biðröð + leit, (B) merki-sía í EINNI skrunanlegri línu + „⚙ Meira",
    // (C) röðun/sýn/póst-takkar — aðeins þegar ⚙ Meira er opið.
    const noiseN = allItems().filter(x => isOpen(x) && isPaymentNoise(x)).length;
    el.innerHTML =
      q('idag', '🔥 Í dag', c.idag) + q('opid', 'Opið', c.opid) + q('lokad', 'Lokað', c.lokad) +
      '<input class="vb-search" id="vb-search" placeholder="🔎 Leita…" value="' + esc(state.search) + '">' +
      // Tag-sía með teljara (2026-07-10, ósk Agnars): „Allt" endurstillir; hver
      // merki-chippi sýnir fjölda OPINNA verka með því merki. Ein skrunlína.
      '<div class="vb-scroll">' +
        (function () {
          const counts = {};
          allItems().filter(isOpen).forEach(x => rowTags(x).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
          const allChip = '<button class="vb-fchip' + (!state.fTag ? ' active' : '') + '" data-act="tagfilter" data-tag="">Allt</button>';
          const used = TAG_ORDER.filter(t => (counts[t] || 0) > 0 || state.fTag === t);
          const chips = used.map(t => {
            const d = TAGS[t], on = state.fTag === t, n = counts[t] || 0;
            return '<button data-act="tagfilter" data-tag="' + t + '" title="Sía eftir merkinu ' + esc(d.label) + '" ' +
              'style="font:inherit;font-size:11.5px;font-weight:700;padding:6px 11px;border-radius:99px;cursor:pointer;white-space:nowrap;' +
              'color:' + (on ? '#fff' : d.color) + ';background:' + (on ? d.color : d.color + '12') + ';border:1.5px solid ' + d.color + (on ? '' : '44') + '">' +
              d.emoji + ' ' + esc(d.label) + ' <span style="opacity:.7">' + n + '</span></button>';
          }).join('');
          return allChip + chips;
        })() +
        '<span style="flex:1 0 8px"></span>' +
        '<button class="vb-fchip' + (state.moreOpen ? ' active' : '') + '" data-act="more" title="Röðun, sýn, sækja tölvupóst og fleira">⚙ Meira' +
          (state.sort === 'nyjast' || noiseN ? ' <span style="color:#e11d48">•</span>' : '') + '</button>' +
      '</div>' +
      (!state.moreOpen ? '' :
      '<div style="display:flex;gap:7px;flex-wrap:wrap;width:100%;margin-top:2px;align-items:center">' +
        // Röðun (2026-07-10): snjallröðun (áríðandi/gjalddagi eins og áður) eða
        // hrein dagsetningarröð með nýjast efst. Valið geymist milli heimsókna.
        '<button class="vb-fchip' + (state.sort !== 'nyjast' ? ' active' : '') + '" data-act="sort" data-s="snjall" title="Áríðandi og gjalddagar efst (sjálfgefið)">⭐ Snjallröðun</button>' +
        '<button class="vb-fchip' + (state.sort === 'nyjast' ? ' active' : '') + '" data-act="sort" data-s="nyjast" title="Raða eftir dagsetningu — nýjast efst">🕒 Nýjast efst</button>' +
        // Sýn: ☰ þéttur listi (ein lína per verk) · ▤ ítarlegri (nótur sjást líka)
        '<span style="display:inline-flex;border:1.5px solid rgba(20,24,34,.14);border-radius:10px;overflow:hidden">' +
          '<button data-act="viewmode" data-vm="thett" title="Þéttur listi — ein lína per verk" style="font:inherit;font-size:12px;font-weight:700;padding:8px 11px;border:none;cursor:pointer;background:' + (state.viewMode === 'thett' ? '#0f172a' : '#fff') + ';color:' + (state.viewMode === 'thett' ? '#fff' : '#475569') + '">☰ Þétt</button>' +
          '<button data-act="viewmode" data-vm="itarlegt" title="Ítarlegri listi — nótur og samantekt sjást" style="font:inherit;font-size:12px;font-weight:700;padding:8px 11px;border:none;border-left:1px solid rgba(20,24,34,.14);cursor:pointer;background:' + (state.viewMode !== 'thett' ? '#0f172a' : '#fff') + ';color:' + (state.viewMode !== 'thett' ? '#fff' : '#475569') + '">▤ Ítarlegt</button>' +
        '</span>' +
        '<button class="vb-fchip" data-act="email" title="Flytja inn nýjar beiðnir úr eldklar-pósthólfinu (sama innsog og Þjónustuver — engin tvítök)">✉️ Sækja tölvupóst</button>' +
        (noiseN ? '<button class="vb-fchip" data-act="clearnoise" title="Fela allar Payday „reikningur greiddur" tilkynningar í einu (endurheimtanlegt)" style="border-color:#fca5a5;color:#b91c1c;background:#fef2f2">🧹 Hreinsa greiðslu-tilkynningar (' + noiseN + ')</button>' : '') +
        '<button class="vb-fchip" data-act="import" title="Flytja inn opin atriði úr gömlu Verkefni + Þjónustuverk listunum">⬇︎ Flytja inn úr gömlu</button>' +
      '</div>');
  }

  function renderList() {
    const el = document.getElementById('vb-list'); if (!el) return;
    if (state.loading && !state.items.length) { el.innerHTML = '<div class="vb-empty">Sæki…</div>'; return; }
    const rows = visibleRows();
    if (!rows.length) {
      el.innerHTML = '<div class="vb-empty">' +
        (state.queue === 'idag' ? '🎉 Ekkert sem þarf að gera í dag.' :
         state.search ? 'Ekkert fannst fyrir „' + esc(state.search) + '“.' : 'Enginn verk hér.') + '</div>';
      return;
    }
    const cap = 300;
    el.innerHTML = rows.slice(0, cap).map(renderRow).join('') +
      (rows.length > cap ? '<div class="vb-hint" style="text-align:center">Sýni fyrstu ' + cap + ' af ' + rows.length + '.</div>' : '');
    if (state.expandedId != null) {
      const open = el.querySelector('.vb-row.open');
      if (open) wireEditor(open);
    }
  }

  function renderRow(r) {
    const st = statusDef(r.status);
    const di = dueInfo(r.due_at);
    const od = isOverdue(r);
    const open = state.expandedId === r.id;
    const done = !isOpen(r);
    // Dot = hrein STAÐA (nýtt/í vinnslu/…). Áríðandi + útrunnið sjást á vinstri-
    // kantinum (rautt/amber), ekki líka á dotinu — annars tvöföld/ruglandi merking.
    const dotColor = st.dot;
    const compact = state.viewMode === 'thett' && !open;
    const tags = rowTags(r);
    const cls = 'vb-row' + (r.important ? ' imp' : '') + (od && !done ? ' od' : '') + (open ? ' open' : '') + (done ? ' done' : '') + (compact ? ' thett' : '');
    let html = '<div class="' + cls + '" data-id="' + esc(r.id) + '" data-act="expand">' +
      '<div class="vb-dot" data-act="status" data-id="' + esc(r.id) + '" title="' + esc(st.label) + ' — smella til að færa áfram" ' +
        'style="border-color:' + dotColor + ';color:' + dotColor + '">' + (done ? '✓' : '') + '</div>' +
      '<div class="vb-main">' +
        '<div class="vb-title">' + esc(r.title || '(án titils)') + '</div>' +
        '<div class="vb-meta">' +
          // 2026-07-10 (ósk Agnars — „hafðu bara tag"): sýna MERKI þegar þau eru
          // til. Falla á sjálfvirka type-chippann AÐEINS þegar engin merki eru
          // (svo email-raðir án merkja séu ekki alveg flokkslausar).
          (tags.length ? tags.map(t => tagChip(t, true)).join('') : typeChip(r.type)) +
          (r._vd ? '<span class="vb-tag">úr Verkdagbók</span>' : '') +
          (r.customer_nafn ? '<span class="vb-cust">🏢 ' + esc(r.customer_nafn) + '</span>' : '') +
          (di ? '<span class="vb-due' + (od ? ' od' : '') + '">📅 ' + esc(di.label) + '</span>' : '') +
          '<span class="vb-cust" style="color:' + st.color + '">' + esc(st.label) + '</span>' +
        '</div>' +
        // Ein hrein innihaldslína (2026-07-10): NÝJASTA svarið í þræðinum vinnur
        // (gömul ✨-samantekt gat vísað í löngu afgreitt atriði úr miðjum þræði),
        // annars ✨ samantekt, annars stutt forsýn úr textanum. Aldrei fleiri en ein.
        (!compact ? (function () {
          const tl = state.threadLatest[r.id];
          if (tl) {
            return '<div class="vb-latest">↩ <b>' + (tl.mine ? 'Við svöruðum' : esc(tl.from)) + '</b> · ' + esc(fmtShortDate(tl.at)) + ' — ' + esc(cleanPreview(tl.text)) + '</div>';
          }
          if (r.summary) return '<div class="vb-sum">' + esc(r.summary) + '</div>';
          return (state.viewMode !== 'thett' && r.notes) ? '<div class="vb-body">' + esc(cleanPreview(r.notes)) + '</div>' : '';
        })() : '') +
        (open ? renderEditor(r) : '') +
      '</div>' +
      // Hægri-dálkur: ⭐ áríðandi + ✕ fljót-eyðing (2026-07-10, ósk Agnars —
      // hreinsa hávaða beint af listanum án þess að opna). Mjúk eyðing (endur-
      // heimtanleg), engin staðfesting svo það sé fljótlegt á 400+ tilkynningum.
      '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex-shrink:0">' +
        '<div class="vb-star" data-act="star" data-id="' + esc(r.id) + '" title="Áríðandi">' + (r.important ? '⭐' : '☆') + '</div>' +
        (r._vd ? '' : '<button class="vb-xdel" data-act="quickdel" data-id="' + esc(r.id) + '" title="Fela / eyða þessari færslu (endurheimtanleg)" ' +
          'style="border:none;background:none;cursor:pointer;font-size:15px;line-height:1;color:#c2c8d2;padding:2px 4px;border-radius:6px">✕</button>') +
      '</div>' +
    '</div>';
    return html;
  }
  // Nótu-forsýn: fjarlægja langar slóðir (mailchimp/gallery o.fl.) sem gera
  // sjálfvirku póst-tilkynningarnar ólæsilegar á listanum.
  function cleanPreview(s) {
    return String(s || '').replace(/https?:\/\/\S+/g, '🔗').replace(/\[\s*🔗\s*\]/g, '🔗').replace(/\s+/g, ' ').trim().slice(0, 260);
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
    const typeOpts = ['tilbod', 'email', 'skyrsla', 'heimsokn', 'hringja', 'samningur', 'skjalabeidni', 'annad']
      .map(t => '<option value="' + t + '"' + (r.type === t ? ' selected' : '') + '>' + typeDef(t).emoji + ' ' + typeDef(t).label + '</option>').join('');
    const prioOpts = Object.keys(PRIORITIES).map(p => '<option value="' + p + '"' + (r.priority === p ? ' selected' : '') + '>' + PRIORITIES[p] + '</option>').join('');
    const dueVal = r.due_at ? new Date(r.due_at).toISOString().slice(0, 10) : '';
    return '<div class="vb-ed" data-act="noexpand">' +
      '<div><label>Titill</label><input data-field="title" value="' + esc(r.title || '') + '"></div>' +
      '<div><label>Nótur</label><textarea data-field="notes" placeholder="Lýsing, símanúmer, krækjur…">' + esc(r.notes || '') + '</textarea></div>' +
      '<div class="vb-ed-grid">' +
        '<div><label>Tegund</label><select data-field="type">' + typeOpts + '</select></div>' +
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
        (r.customer_nafn ? '<button class="vb-btn" data-act="history" data-id="' + esc(r.id) + '" title="Öll gögn kúnnans — sölur, Payday-kröfur, skýrslur og samningar (sami gluggi og á Sölu)">🧾 Sjá fyrri viðskipti</button>' : '') +
        '<span style="flex:1"></span>' +
        '<button class="vb-btn red" data-act="del" data-id="' + esc(r.id) + '">🗑 Eyða</button>' +
        '<button class="vb-btn green" data-act="collapse">✓ Loka</button>' +
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
      if (act === 'queue') { setQueue(t.getAttribute('data-q')); renderControls(); renderList(); return; }
      if (act === 'filter') { setFilter(t.getAttribute('data-f')); renderControls(); renderList(); return; }
      if (act === 'sort') { setSort(t.getAttribute('data-s')); renderControls(); renderList(); return; }
      if (act === 'viewmode') { setViewMode(t.getAttribute('data-vm')); renderControls(); renderList(); return; }
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
      if (act === 'more') { state.moreOpen = !state.moreOpen; renderControls(); return; }
      if (act === 'import') { importOld(); return; }
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
    // Aukahlutir skráningarlínunnar (fyrirtæki/merki/⚙) opnast við fókus á
    // textareitinn — EKKI endur-teiknað (þá týndist fókusinn), bara sýnt.
    root.addEventListener('focusin', e => {
      if (e.target.id === 'vb-add-cust') loadCompanies().then(fillCompanyList);
      if (e.target.id === 'vb-add-input' && !state.addOpen) {
        state.addOpen = true;
        const ex = document.getElementById('vb-add-extra');
        if (ex) ex.style.display = 'flex';
        loadCompanies().then(fillCompanyList);
      }
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
    quickAdd(v, state.addType, cv, !!expand, state.addTags.slice());
    state.addTags = [];
    document.querySelectorAll('#view-verkbord [data-act="addtag"]').forEach(c => {
      const d = TAGS[c.getAttribute('data-tag')]; if (!d) return;
      c.style.color = d.color; c.style.background = d.color + '12'; c.style.borderColor = d.color + '44';
    });
    // Fella aukahlutina saman eftir skráningu — línan verður aftur ein lína.
    state.addOpen = false;
    const ex = document.getElementById('vb-add-extra');
    if (ex) ex.style.display = 'none';
    inp.blur();
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
    const ta = rowEl.querySelector('textarea[data-field="notes"]');
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, 320) + 'px'; }
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
