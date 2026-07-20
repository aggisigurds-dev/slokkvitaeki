/* === MÓTTAKA — arrival / QR-on-arrival scan flow (§4+§5c) v1 ===
 *
 * The intake side of the unified tæki base. When a batch of slökkvitæki comes
 * in the door you:
 *
 *   1. 📷 Skanna serial (reuses window.openQRScanner — QR content = serial, §5a).
 *      • Þekkt tæki  → custody 'móttekið' + hengt á opið seasonal_job kúnnans.
 *      • Nýtt tæki   → búa til uttaeki (serial + base_id + job) → PRENTA QR-miða
 *                      (window.Print.showQR — Brother 18×Nmm, prentpath ósnertur)
 *                      → custody 'móttekið'.
 *
 *   2. "Núna hér" borð — öll tæki í vörslu (custody ∈ {móttekið, á verkstæði,
 *      tilbúið}), raðað eftir dögum (elsta efst). Hver færsla færist áfram:
 *          móttekið → á verkstæði → tilbúið → afhent
 *      'tilbúið' = þjónustu lokið = rukkanlegt 1× (skráð í taeki_events; sjálf
 *      reikningagerðin er mánaðar-cut, sér). 'afhent' dettur af borðinu.
 *
 * Every transition is stamped into taeki_events (unit_id + serial + job +
 * custody_status + tech + at). The QR print path and custody DB schema are
 * reused as-is — this patch is pure frontend wiring.
 */
(() => {
  if (window.__mottakaInstalled) return;
  window.__mottakaInstalled = true;

  const VIEW_ID = 'view-mottaka';
  const NAV_KEY = 'mottaka';

  // Custody board columns, in flow order. 'afhent' is terminal → off the board.
  const STAGES = [
    { k: 'móttekið',    label: '📥 Móttekið',    hint: 'Komið inn — bíður þess að fara á verkstæði', next: 'á verkstæði', nextLabel: 'Á verkstæði →' },
    { k: 'á verkstæði', label: '🔧 Á verkstæði',  hint: 'Á til-að-gera hillu — bíður þjónustu',        next: 'tilbúið',     nextLabel: 'Tilbúið →' },
    { k: 'tilbúið',     label: '✅ Tilbúið',      hint: 'Þjónustað — tilbúið til sóknar (rukkanlegt)', next: 'afhent',      nextLabel: 'Afhent ✓' },
  ];
  const ACTIVE = STAGES.map(s => s.k);             // on-board custody states

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[mottaka]', m); }
  function fold(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim(); }
  function getTech() { try { return localStorage.getItem('mt_tech') || ''; } catch (_) { return ''; } }
  function setTech(v) { try { localStorage.setItem('mt_tech', v || ''); } catch (_) {} }

  function sinceLabel(at) {
    if (!at) return '';
    const ms = Date.now() - new Date(at).getTime();
    if (isNaN(ms)) return '';
    const d = Math.floor(ms / 86400000);
    if (d <= 0) return 'í dag';
    if (d === 1) return 'í gær';
    return d + ' dagar';
  }

  const state = { units: [], bases: [], baseById: {}, loading: false };

  // ── Data load ──────────────────────────────────────────────────────────────
  async function loadBases() {
    const SB = getSB(); if (!SB) return;
    try {
      const data = await DB.fetchAll((from, to) => SB.from('customers_base').select('id,nafn,kennitala,simi').order('nafn').range(from, to)); // 1.043 raðir — blaðsíðuflett gegnum 1000-raða þakið
      state.bases = data || [];
      state.baseById = {};
      state.bases.forEach(b => { state.baseById[b.id] = b; });
    } catch (e) { console.warn('[mottaka] bases', e); }
  }

  async function loadBoard() {
    const SB = getSB(); if (!SB) return;
    try {
      const { data, error } = await SB.from('uttaeki')
        .select('id,serial,type,size,client,location,phone,custody_status,customer_base_id,seasonal_job_id')
        .in('custody_status', ACTIVE);
      if (error) throw error;
      const units = data || [];
      // Pull the most-recent event per unit for "since" + day-sort.
      const ids = units.map(u => u.id).filter(Boolean);
      const lastAt = {};
      if (ids.length) {
        try {
          const { data: evs } = await SB.from('taeki_events')
            .select('unit_id,at').in('unit_id', ids).order('at', { ascending: false });
          (evs || []).forEach(e => { if (e.unit_id && !lastAt[e.unit_id]) lastAt[e.unit_id] = e.at; });
        } catch (_) { /* events optional for display */ }
      }
      units.forEach(u => { u._at = lastAt[u.id] || null; });
      state.units = units;
    } catch (e) {
      console.warn('[mottaka] board', e);
      state.units = [];
    }
  }

  async function load() {
    const SB = getSB(); if (!SB) { toast('Engin nettenging'); return; }
    state.loading = true; render();
    await Promise.all([loadBases(), loadBoard()]);
    state.loading = false; render();
  }

  // ── seasonal_job: one open job per base customer ─────────────────────────────
  async function findOrCreateJob(baseId) {
    const SB = getSB();
    if (!SB || !baseId) return null;
    try {
      const { data: open } = await SB.from('seasonal_job')
        .select('id').eq('customer_base_id', baseId).eq('status', 'open')
        .order('opened_at', { ascending: false }).limit(1);
      if (open && open[0]) return open[0].id;
      const base = state.baseById[baseId];
      const title = (base ? base.nafn : 'Verk') + ' — ' +
        new Date().toLocaleDateString('is-IS', { month: 'long', year: 'numeric' });
      const { data: created, error } = await SB.from('seasonal_job')
        .insert({ customer_base_id: baseId, title, status: 'open' }).select('id').single();
      if (error) throw error;
      return created ? created.id : null;
    } catch (e) { console.warn('[mottaka] job', e); return null; }
  }

  async function logEvent(unit, eventType, custody) {
    const SB = getSB(); if (!SB) return;
    try {
      await SB.from('taeki_events').insert({
        unit_id: unit.id || null,
        serial: unit.serial || null,
        seasonal_job_id: unit.seasonal_job_id || null,
        event: eventType,
        custody_status: custody || null,
        tech: getTech() || null,
      });
    } catch (e) { console.warn('[mottaka] logEvent', e); }
  }

  // ── Scan entry point ────────────────────────────────────────────────────────
  function startScan() {
    if (!window.openQRScanner) { toast('Skanni ekki hlaðinn'); return; }
    window.openQRScanner(serial => handleScan(String(serial || '').trim()));
  }

  async function handleScan(serial) {
    const SB = getSB(); if (!SB || !serial) return;
    let unit = null;
    try {
      const { data } = await SB.from('uttaeki').select('*').ilike('serial', serial).limit(1);
      unit = data && data[0];
    } catch (e) { console.warn('[mottaka] lookup', e); }

    if (unit) {
      if (unit.custody_status && unit.custody_status !== 'afhent') {
        toast('„' + serial + '“ er þegar á borðinu (' + unit.custody_status + ')');
        await load();
        return;
      }
      await receiveKnown(unit);     // known unit, fresh arrival
    } else {
      openNewUnitModal(serial);     // unknown serial → create + print
    }
  }

  // Known unit arrives → móttekið + attach to its customer's open job.
  async function receiveKnown(unit) {
    const SB = getSB(); if (!SB) return;
    const jobId = await findOrCreateJob(unit.customer_base_id);
    try {
      await SB.from('uttaeki').update({
        custody_status: 'móttekið',
        seasonal_job_id: jobId || unit.seasonal_job_id || null,
      }).eq('id', unit.id);
      unit.custody_status = 'móttekið';
      unit.seasonal_job_id = jobId || unit.seasonal_job_id || null;
      await logEvent(unit, 'arrival', 'móttekið');
      toast('📥 Móttekið: ' + (unit.serial || '') + (state.baseById[unit.customer_base_id] ? ' · ' + state.baseById[unit.customer_base_id].nafn : ''));
      await load();
    } catch (e) { toast('Villa: ' + (e.message || e)); }
  }

  // ── Advance / step back custody ──────────────────────────────────────────────
  async function advance(unit, toState) {
    const SB = getSB(); if (!SB) return;
    try {
      await SB.from('uttaeki').update({ custody_status: toState }).eq('id', unit.id);
      unit.custody_status = toState;
      await logEvent(unit, 'custody', toState);
      if (toState === 'tilbúið') toast('✅ Tilbúið (rukkanlegt): ' + (unit.serial || ''));
      else if (toState === 'afhent') toast('📦 Afhent: ' + (unit.serial || ''));
      await load();
    } catch (e) { toast('Villa: ' + (e.message || e)); }
  }

  // ── New-unit modal (unknown serial / brand-new tæki) ─────────────────────────
  function baseDatalist() {
    return '<datalist id="_mt-bases">' +
      state.bases.map(b => `<option value="${esc(b.nafn)}"${b.kennitala ? ' label="' + esc(b.kennitala) + '"' : ''}>`).join('') +
      '</datalist>';
  }

  function genSerial() {
    return 'SÆ-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);
  }

  function openNewUnitModal(scannedSerial) {
    document.getElementById('_mt-modal')?.remove();
    const m = document.createElement('div');
    m.id = '_mt-modal';
    m.style.cssText = 'position:fixed;inset:0;z-index:10050;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;';
    const serialVal = scannedSerial || genSerial();
    const newSerial = !scannedSerial;
    m.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:22px;max-width:440px;width:100%;box-shadow:0 20px 60px rgba(15,23,42,.25);font-family:inherit;max-height:92vh;overflow:auto">
        <h2 style="margin:0 0 4px;font-size:18px;color:#0f172a">➕ Nýtt tæki í móttöku</h2>
        <div style="font-size:12.5px;color:#64748b;margin-bottom:16px">${newSerial
          ? 'Ekkert QR fannst — nýtt raðnúmer búið til. Prentaðu miða og límdu á tækið.'
          : 'Skannað raðnúmer fannst ekki í kerfinu — skráðu það sem nýtt tæki.'}</div>
        <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin:0 0 4px;text-transform:uppercase;letter-spacing:.04em">Raðnúmer</label>
        <input id="_mt-serial" value="${esc(serialVal)}" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box;font-family:monospace;text-transform:uppercase;margin-bottom:4px">
        <div id="_mt-serialhint" style="font-size:11px;color:#94a3b8;min-height:0;margin-bottom:12px"></div>
        <div style="display:flex;gap:10px;margin-bottom:12px">
          <div style="flex:1"><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin:0 0 4px;text-transform:uppercase">Tegund</label>
            <input id="_mt-type" list="_mt-types" placeholder="Duft / CO₂ / Léttvatn…" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box">
            <datalist id="_mt-types"><option value="Duft"><option value="CO₂"><option value="Léttvatn"><option value="ABF"><option value="Vatn"><option value="Eldvarnateppi"></datalist></div>
          <div style="width:96px"><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin:0 0 4px;text-transform:uppercase">Stærð</label>
            <input id="_mt-size" placeholder="6 kg" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box"></div>
          <div style="width:84px"><label style="display:block;font-size:11px;font-weight:700;color:#475569;margin:0 0 4px;text-transform:uppercase">Fjöldi</label>
            <input id="_mt-qty" type="number" min="1" step="1" value="1" title="Fjöldi tækja sem koma inn — býr til raðnúmer + miða fyrir hvert" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box;text-align:center;font-weight:700"></div>
        </div>
        <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin:0 0 4px;text-transform:uppercase">Fyrirtæki (eigandi)</label>
        <input id="_mt-base" list="_mt-bases" placeholder="Leitaðu að fyrirtæki…" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box;margin-bottom:4px">
        <div id="_mt-basehint" style="font-size:11.5px;color:#94a3b8;min-height:15px;margin-bottom:12px"></div>
        ${baseDatalist()}
        <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#334155;margin-bottom:16px;cursor:pointer">
          <input type="checkbox" id="_mt-print" ${newSerial ? 'checked' : ''}> 🖨 Prenta QR-miða eftir skráningu</label>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button id="_mt-cancel" style="padding:9px 16px;border-radius:8px;font-size:14px;cursor:pointer;border:1px solid #e2e8f0;background:#fff;color:#334155;font-weight:500">Hætta við</button>
          <button id="_mt-save" style="padding:9px 18px;border-radius:8px;font-size:14px;cursor:pointer;border:1px solid #16a34a;background:#16a34a;color:#fff;font-weight:700">📥 Skrá móttekið</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector('#_mt-cancel').addEventListener('click', close);
    m.addEventListener('click', e => { if (e.target === m) close(); });

    const baseInp = m.querySelector('#_mt-base');
    const baseHint = m.querySelector('#_mt-basehint');
    const resolveBase = () => {
      const v = fold(baseInp.value);
      if (!v) return null;
      return state.bases.find(b => fold(b.nafn) === v) ||
             state.bases.find(b => fold(b.nafn).startsWith(v)) || null;
    };
    baseInp.addEventListener('input', () => {
      const b = resolveBase();
      baseHint.textContent = b ? '✓ ' + b.nafn + (b.kennitala ? ' · ' + b.kennitala : '') : (baseInp.value ? 'Óþekkt — verður vistað sem nafn án tengingar' : '');
      baseHint.style.color = b ? '#16a34a' : '#94a3b8';
    });

    // Fjöldi (quantity): when >1, raðnúmer are generated automatically per unit
    // (the single serial field no longer applies), and N labels print in one go.
    const qtyInp = m.querySelector('#_mt-qty');
    const serialInp = m.querySelector('#_mt-serial');
    const serialHint = m.querySelector('#_mt-serialhint');
    const saveBtn = m.querySelector('#_mt-save');
    const readQty = () => Math.max(1, parseInt(qtyInp.value, 10) || 1);
    const syncQtyUI = () => {
      const n = readQty();
      if (n > 1) {
        serialInp.disabled = true;
        serialInp.style.opacity = '.5';
        serialHint.textContent = `Raðnúmer verða búin til sjálfkrafa fyrir hvert tæki (${n} stk).`;
        saveBtn.textContent = `📥 Skrá ${n} móttekin`;
      } else {
        serialInp.disabled = false;
        serialInp.style.opacity = '1';
        serialHint.textContent = '';
        saveBtn.textContent = '📥 Skrá móttekið';
      }
    };
    qtyInp.addEventListener('input', syncQtyUI);
    qtyInp.addEventListener('change', syncQtyUI);

    saveBtn.addEventListener('click', async () => {
      const type = (m.querySelector('#_mt-type').value || '').trim();
      const size = (m.querySelector('#_mt-size').value || '').trim();
      const base = resolveBase();
      const clientName = base ? base.nafn : (baseInp.value || '').trim();
      const doPrint = m.querySelector('#_mt-print').checked;
      const qty = readQty();
      if (qty > 1) {
        close();
        await createNewUnitsBatch({ count: qty, type, size, baseId: base ? base.id : null, clientName, doPrint });
        return;
      }
      const serial = (serialInp.value || '').trim().toUpperCase();
      if (!serial) { toast('Raðnúmer vantar'); return; }
      close();
      await createNewUnit({ serial, type, size, baseId: base ? base.id : null, clientName, doPrint });
    });
    setTimeout(() => m.querySelector('#_mt-type')?.focus(), 40);
  }

  async function createNewUnit({ serial, type, size, baseId, clientName, doPrint }) {
    const SB = getSB(); if (!SB) return;
    // Guard against a duplicate serial that slipped past the scan lookup.
    try {
      const { data: dup } = await SB.from('uttaeki').select('id').ilike('serial', serial).limit(1);
      if (dup && dup[0]) { toast('Raðnúmer er þegar til — skanna í staðinn'); await load(); return; }
    } catch (_) {}
    const jobId = await findOrCreateJob(baseId);
    const row = {
      serial, type: type || null, size: size || null,
      client: clientName || null, customer_base_id: baseId || null,
      seasonal_job_id: jobId || null, custody_status: 'móttekið', status: 'ok',
    };
    let saved = null;
    try {
      const { data, error } = await SB.from('uttaeki').insert(row).select().single();
      if (error) throw error;
      saved = data;
      await logEvent(saved, 'arrival', 'móttekið');
      toast('➕ Skráð & móttekið: ' + serial);
    } catch (e) { toast('Villa við skráningu: ' + (e.message || e)); return; }
    if (doPrint && window.Print && Print.showQR) {
      try { Print.showQR(saved); } catch (e) { console.warn('[mottaka] print', e); }
    }
    await load();
  }

  // Generate `count` serials that are unique within the batch AND not already
  // in uttaeki (checked in bulk), so a whole arrival of identical tæki each
  // gets its own raðnúmer + label.
  async function genUniqueSerials(count) {
    const SB = getSB();
    const out = new Set();
    let guard = 0;
    while (out.size < count && guard < 60) {
      guard++;
      const need = count - out.size;
      const cand = [];
      for (let i = 0; i < need; i++) {
        let s; do { s = genSerial(); } while (cand.includes(s) || out.has(s));
        cand.push(s);
      }
      const existing = new Set();
      if (SB && cand.length) {
        try {
          const { data } = await SB.from('uttaeki').select('serial').in('serial', cand);
          (data || []).forEach(r => existing.add(String(r.serial || '').toUpperCase()));
        } catch (_) { /* if the lookup fails, fall through — insert guard is the backstop */ }
      }
      cand.forEach(s => { if (!existing.has(s.toUpperCase())) out.add(s); });
    }
    return Array.from(out).slice(0, count);
  }

  // Batch intake: N identical tæki in one go → N units (unique serials) on the
  // same customer/job, all móttekið, then one print job with N Brother labels.
  async function createNewUnitsBatch({ count, type, size, baseId, clientName, doPrint }) {
    const SB = getSB(); if (!SB) return;
    const n = Math.max(1, count | 0);
    const jobId = await findOrCreateJob(baseId);
    const serials = await genUniqueSerials(n);
    if (!serials.length) { toast('Gat ekki búið til raðnúmer'); return; }
    const rows = serials.map(serial => ({
      serial, type: type || null, size: size || null,
      client: clientName || null, customer_base_id: baseId || null,
      seasonal_job_id: jobId || null, custody_status: 'móttekið', status: 'ok',
    }));
    let saved = [];
    try {
      const { data, error } = await SB.from('uttaeki').insert(rows).select();
      if (error) throw error;
      saved = data || [];
      for (const u of saved) await logEvent(u, 'arrival', 'móttekið');
      const spec = [type, size].filter(Boolean).join(' ');
      toast('➕ Skráð & móttekið: ' + saved.length + ' tæki' + (spec ? ' · ' + spec : ''));
    } catch (e) { toast('Villa við skráningu: ' + (e.message || e)); return; }
    // Print all labels in ONE job (single length-picker + print window).
    if (doPrint && saved.length && window.Print && Print.showJob) {
      try {
        Print.showJob({
          customer: clientName || '—',
          phone: '',
          units: saved.map(u => ({ serial: u.serial, type: u.type, size: u.size })),
        });
      } catch (e) { console.warn('[mottaka] print batch', e); }
    }
    await load();
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  function unitCard(u) {
    const stage = STAGES.find(s => s.k === u.custody_status) || STAGES[0];
    const base = state.baseById[u.customer_base_id];
    const who = base ? base.nafn : (u.client || '—');
    const spec = [u.type, u.size].filter(Boolean).join(' ');
    const since = sinceLabel(u._at);
    const idx = STAGES.indexOf(stage);
    const backBtn = idx > 0
      ? `<button class="_mt-back" data-id="${u.id}" data-to="${esc(STAGES[idx - 1].k)}" title="Til baka" style="padding:6px 9px;border:1px solid #e2e8f0;background:#fff;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;color:#94a3b8">↩</button>`
      : '';
    return `<div style="border:1px solid #e2e8f0;border-radius:11px;padding:11px 13px;margin-bottom:9px;background:#fff">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
        <div style="font-family:monospace;font-size:13.5px;font-weight:700;color:#0f172a">${esc(u.serial || '—')}</div>
        ${since ? `<div style="font-size:11px;color:#94a3b8;white-space:nowrap">${esc(since)}</div>` : ''}
      </div>
      <div style="font-size:13px;color:#334155;margin-top:2px">${esc(who)}</div>
      ${spec ? `<div style="font-size:12px;color:#64748b;margin-top:1px">${esc(spec)}</div>` : ''}
      <div style="display:flex;gap:7px;align-items:center;margin-top:9px">
        <button class="_mt-next" data-id="${u.id}" data-to="${esc(stage.next)}" style="flex:1;padding:7px 10px;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;background:${stage.next === 'afhent' ? '#0f172a' : '#0d6efd'};color:#fff">${esc(stage.nextLabel)}</button>
        ${backBtn}
      </div>
    </div>`;
  }

  function render() {
    const main = document.getElementById('_mt-main');
    if (!main) return;
    const byStage = {};
    STAGES.forEach(s => { byStage[s.k] = []; });
    state.units.forEach(u => { if (byStage[u.custody_status]) byStage[u.custody_status].push(u); });
    // Oldest first within a column so stale tæki surface to the top.
    Object.values(byStage).forEach(arr => arr.sort((a, b) =>
      (new Date(a._at || 0)) - (new Date(b._at || 0))));

    const col = s => `<div style="flex:1;min-width:230px;background:#f8fafc;border:1px solid #eef2f7;border-radius:13px;padding:12px">
      <div style="font-size:13.5px;font-weight:800;color:#0f172a">${s.label} <span style="color:#94a3b8;font-weight:600">${byStage[s.k].length}</span></div>
      <div style="font-size:11px;color:#94a3b8;margin:2px 0 11px">${esc(s.hint)}</div>
      ${byStage[s.k].length ? byStage[s.k].map(unitCard).join('') : '<div style="font-size:12px;color:#cbd5e1;padding:14px 0;text-align:center">— tómt —</div>'}
    </div>`;

    main.innerHTML = `<div style="max-width:1100px;margin:0 auto;padding:18px 20px 60px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px">
        <div style="font-size:20px;font-weight:800;color:#0f172a">📥 Móttaka <span style="font-size:13px;font-weight:500;color:#94a3b8">— núna hér</span></div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input id="_mt-tech" placeholder="Starfsmaður" value="${esc(getTech())}" style="padding:7px 11px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:12.5px;width:130px">
          <button id="_mt-refresh" style="padding:8px 13px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;color:#475569">↻ Sækja</button>
          <button id="_mt-new" style="padding:8px 13px;background:#fff;border:1px solid #16a34a;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;color:#16a34a">➕ Nýtt án QR</button>
          <button id="_mt-scan" style="padding:8px 16px;background:#0d6efd;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700;color:#fff">📷 Skanna tæki</button>
        </div>
      </div>
      ${state.loading
        ? '<div style="opacity:.6;padding:24px">Hleður…</div>'
        : `<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">${STAGES.map(col).join('')}</div>`}
    </div>`;

    main.querySelector('#_mt-refresh')?.addEventListener('click', load);
    main.querySelector('#_mt-scan')?.addEventListener('click', startScan);
    main.querySelector('#_mt-new')?.addEventListener('click', () => openNewUnitModal(''));
    const techEl = main.querySelector('#_mt-tech');
    techEl?.addEventListener('change', () => setTech(techEl.value.trim()));
    main.querySelectorAll('._mt-next').forEach(b => b.addEventListener('click', () => {
      const u = state.units.find(x => String(x.id) === b.dataset.id);
      if (u) advance(u, b.dataset.to);
    }));
    main.querySelectorAll('._mt-back').forEach(b => b.addEventListener('click', () => {
      const u = state.units.find(x => String(x.id) === b.dataset.id);
      if (u) advance(u, b.dataset.to);
    }));
  }

  // ── View + sidebar wiring (mirrors patch 178) ────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-workshop') || document.getElementById('view-counter') ||
                   document.getElementById('view-companies');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="_mt-main" class="main-panel" style="height:100%;overflow-y:auto"></main>';
    sample.parentElement.appendChild(v);
  }

  function show() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    if (v) { v.style.display = 'block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    render();
    if (!state.units.length && !state.loading) load();
  }

  function patchSwitchView() {
    if (!window.App || window.App._mottakaPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      return orig.apply(this, arguments);
    };
    window.App._mottakaPatched = true;
  }

  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    const ref = allBtns.find(b => b.getAttribute('data-view') === 'workshop') ||
                allBtns.find(b => b.getAttribute('data-view') === 'counter') || allBtns[0];
    const btn = document.createElement('button');
    btn.className = (ref && ref.className) || 'vnav-btn';
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">' +
      '<path d="M21 8v13H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>' +
      '<span>Móttaka</span></span>';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY); else show();
    });
    if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling); else nav.appendChild(btn);
  }

  function boot() {
    injectSidebar();
    ensureView();
    patchSwitchView();
    [600, 1500, 3000].forEach(t => setTimeout(injectSidebar, t));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Mottaka = { open: show, reload: load, scan: startScan };
  console.log('[patch-179] Móttaka (arrival/QR scan flow) installed');
})();
/* === END MÓTTAKA === */
