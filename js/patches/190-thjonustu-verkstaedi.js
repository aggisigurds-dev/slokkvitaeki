/* === ÞJÓNUSTUVERKSTÆÐI v1 ===
 *
 * Control-tower for service cycles (Fyrirtækjaþjónusta + Ferðaþjónustu):
 * a Kanban over the `service_visits` table where each card is one company's
 * open service cycle, moving Opin → Bíður → Tilbúið → Lokið.
 *
 * Solves the two pains from the workflow review:
 *   1. The "90% done, waiting on a phone call" black hole — a visit can be
 *      PARKED with a reason + a "hvað á eftir" one-liner instead of being
 *      forgotten. Parked visits show with their reason and how long they've
 *      sat; >3 days flags red.
 *   2. No single place to close the loop — the "Tilbúið" column is the office
 *      queue: each ready card has [Reikningur] + [Úttektarskýrsla] right there.
 *
 * This is a VIEW + thin data layer over `service_visits`. It does not fork
 * Verkstæði (which stays per-serial) — it groups the same work per company
 * cycle. Public API: window.ServiceVisits.
 *
 * Storage: Supabase table `service_visits` (see sql migration
 * 2026-06-10_create_service_visits). Reads/writes via DB.sb (anon key).
 */
(() => {
  if (window.__thjonustuVerkstaediInstalled) return;
  window.__thjonustuVerkstaediInstalled = true;

  const VIEW_ID = 'view-thjonustu-verkstaedi';
  const NAV_KEY = 'thjonustu-verkstaedi';
  const TABLE   = 'service_visits';

  const COLUMNS = [
    { key: 'opin',    label: 'OPIN — í vinnslu',        head: '#dbeafe', headTx: '#1e3a8a', bar: '#2563eb' },
    { key: 'bidur',   label: 'BÍÐUR (með ástæðu)',      head: '#fef3c7', headTx: '#7c2d12', bar: '#d97706' },
    { key: 'tilbuid', label: 'TILBÚIÐ — vantar reikn./skýrslu', head: '#dcfce7', headTx: '#14532d', bar: '#16a34a' },
    { key: 'lokid',   label: 'LOKIÐ (þ. mánuð)',        head: '#e7e7e7', headTx: '#334155', bar: '#64748b' },
  ];
  const REASONS = [
    { v: 'simtal',     label: '⏳ Bíð símtals' },
    { v: 'varahlutur', label: '✋ Vantar varahlut' },
    { v: 'verkstaedi', label: '🧰 Bíð verkstæðis' },
    { v: 'svar',       label: '💬 Bíð svars viðskiptavinar' },
    { v: 'endurkoma',  label: '🚌 Bíð endurkomu (ferðaþj.)' },
  ];
  const reasonLabel = v => (REASONS.find(r => r.v === v) || {}).label || v || '';

  // ── helpers ──────────────────────────────────────────────────────────────
  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso); if (isNaN(d)) return '—';
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
  }
  function daysSince(iso) {
    if (!iso) return 0;
    const d = new Date(iso); if (isNaN(d)) return 0;
    return Math.floor((Date.now() - d.getTime()) / 86400000);
  }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[þjónustuverkstæði]', m); }

  // ── data layer (window.ServiceVisits) ─────────────────────────────────────
  let _cache = [];
  async function list() {
    const sb = SB(); if (!sb) return [];
    try {
      const { data, error } = await sb.from(TABLE).select('*').order('last_touched_at', { ascending: false }).limit(500);
      if (error) throw error;
      _cache = data || [];
      return _cache;
    } catch (e) { console.warn('[þjónustuverkstæði] list', e); return []; }
  }
  async function openForCustomer(kt) {
    const sb = SB(); if (!sb) return null;
    const k = digits(kt); if (!k) return null;
    try {
      const { data } = await sb.from(TABLE).select('*')
        .eq('customer_kt', k).neq('status', 'lokid')
        .order('started_at', { ascending: false }).limit(1);
      return (data && data[0]) || null;
    } catch (e) { return null; }
  }
  async function create(seed) {
    const sb = SB(); if (!sb) return null;
    const row = {
      customer_kt: digits(seed.kennitala || seed.customer_kt),
      customer_nafn: seed.nafn || seed.customer_nafn || '',
      fyrirtaeki_id: seed.fyrirtaeki_id || null,
      service_type: seed.service_type || 'fyrirtaeki',
      mode: seed.mode || 'lota',
      status: 'opin',
      technician: seed.technician || null,
      units: seed.units || [],
      units_total: seed.units_total || (Array.isArray(seed.units) ? seed.units.length : 0),
    };
    try {
      const { data, error } = await sb.from(TABLE).insert(row).select().single();
      if (error) throw error;
      return data;
    } catch (e) { toast('Villa: ' + (e.message || e)); return null; }
  }
  async function update(id, patch) {
    const sb = SB(); if (!sb) return null;
    patch = { ...patch, last_touched_at: new Date().toISOString() };
    try {
      const { data, error } = await sb.from(TABLE).update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (e) { toast('Villa: ' + (e.message || e)); return null; }
  }

  window.ServiceVisits = { list, openForCustomer, create, update, holdPrompt, get cache() { return _cache; } };

  // ── park / hold modal (reason + "hvað á eftir") ───────────────────────────
  // Exposed so the existing "Klára heimsókn" flows can call it when not all
  // units are finished. Returns a Promise that resolves to the saved row or null.
  function holdPrompt(visit) {
    return new Promise(resolve => {
      document.getElementById('_sv-hold')?.remove();
      const cur = visit || {};
      const m = document.createElement('div');
      m.id = '_sv-hold';
      m.style.cssText = 'position:fixed;inset:0;z-index:100070;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
      m.innerHTML =
        `<div style="background:#fff;border-radius:14px;padding:22px;max-width:460px;width:100%;box-shadow:0 20px 60px rgba(15,23,42,.3)">
          <h2 style="margin:0 0 4px;font-size:18px;color:#0f172a">⏸ Vista opna heimsókn</h2>
          <div style="font-size:13px;color:#64748b;margin-bottom:16px">${esc(cur.customer_nafn || '')} — ekki rukkað fyrr en heimsókn er lokið.</div>
          <div style="font-size:12.5px;font-weight:700;color:#334155;margin-bottom:6px">Af hverju stoppum við?</div>
          <div id="_sv-reasons" style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
            ${REASONS.map(r => `<label style="display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer;padding:7px 10px;border:1px solid #e2e8f0;border-radius:8px"><input type="radio" name="_svr" value="${r.v}" ${cur.block_reason === r.v ? 'checked' : ''}>${esc(r.label)}</label>`).join('')}
          </div>
          <div style="font-size:12.5px;font-weight:700;color:#334155;margin-bottom:6px">Hvað á eftir? (ein lína)</div>
          <input id="_sv-next" value="${esc(cur.next_action || '')}" placeholder="t.d. hringja í Jón um stærð 6kg" style="width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;margin-bottom:14px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px">
            <span style="font-size:12.5px;color:#334155;font-weight:700">Áminning eftir</span>
            <select id="_sv-remind" style="padding:6px 8px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px">
              <option value="1">1 dag</option><option value="2">2 daga</option><option value="3" selected>3 daga</option><option value="7">viku</option><option value="">enga</option>
            </select>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button id="_sv-cancel" style="padding:9px 16px;border-radius:8px;font-size:14px;cursor:pointer;border:1px solid #e2e8f0;background:#fff;color:#334155;font-weight:500">Hætta við</button>
            <button id="_sv-save" style="padding:9px 18px;border-radius:8px;font-size:14px;cursor:pointer;border:none;background:#d97706;color:#fff;font-weight:700">Vista opna</button>
          </div>
        </div>`;
      document.body.appendChild(m);
      const close = (val) => { m.remove(); resolve(val || null); };
      m.querySelector('#_sv-cancel').onclick = () => close(null);
      m.addEventListener('click', e => { if (e.target === m) close(null); });
      m.querySelector('#_sv-save').onclick = async () => {
        const reason = (m.querySelector('input[name="_svr"]:checked') || {}).value || null;
        const next = m.querySelector('#_sv-next').value.trim();
        const remDays = m.querySelector('#_sv-remind').value;
        const remind_at = remDays ? new Date(Date.now() + (+remDays) * 86400000).toISOString().slice(0,10) : null;
        const patch = { status: 'bidur', block_reason: reason, next_action: next || null, remind_at };
        let saved;
        if (cur.id) saved = await update(cur.id, patch);
        else saved = await create({ ...cur, ...patch }).then(r => r && update(r.id, patch));
        toast('⏸ Heimsókn vistuð sem opin');
        close(saved);
        if (isActive()) render();
      };
    });
  }

  // ── view container + nav ───────────────────────────────────────────────────
  function viewEl() { return document.getElementById(VIEW_ID); }
  function isActive() { const v = viewEl(); return v && v.style.display !== 'none' && v.classList.contains('active'); }

  function ensureView() {
    if (viewEl()) return;
    const v = document.createElement('div');
    v.id = VIEW_ID; v.className = 'view'; v.style.cssText = 'padding:20px';
    const ref = document.getElementById('view-companies') || document.getElementById('view-arsskodun');
    if (ref && ref.parentNode) ref.parentNode.insertBefore(v, ref.nextSibling);
    else document.body.appendChild(v);
  }

  async function render() {
    ensureView();
    const v = viewEl(); if (!v) return;
    v.innerHTML = '<div style="color:#94a3b8;padding:20px">Hleð…</div>';
    const rows = await list();
    const byStatus = { opin: [], bidur: [], tilbuid: [], lokid: [] };
    const thisMonth = new Date().toISOString().slice(0,7);
    rows.forEach(r => {
      if (r.status === 'lokid') {
        // only show this month's closed cycles to keep the column short
        if ((r.invoiced_at || r.completed_at || r.last_touched_at || '').slice(0,7) === thisMonth) byStatus.lokid.push(r);
      } else if (byStatus[r.status]) byStatus[r.status].push(r);
      else byStatus.opin.push(r);
    });

    const colHtml = COLUMNS.map(col => {
      const cards = (byStatus[col.key] || []).map(r => cardHtml(r, col)).join('') ||
        '<div style="color:#cbd5e1;font-size:13px;padding:18px;text-align:center;border:1px dashed #e2e8f0;border-radius:10px">—</div>';
      return `<div style="flex:1;min-width:250px">
          <div style="background:${col.head};color:${col.headTx};border-radius:10px;padding:9px 12px;font-size:13.5px;font-weight:700;margin-bottom:10px">${esc(col.label)} <span style="opacity:.7">· ${(byStatus[col.key]||[]).length}</span></div>
          <div style="display:flex;flex-direction:column;gap:10px">${cards}</div>
        </div>`;
    }).join('');

    v.innerHTML = `
      <div style="max-width:1500px;margin:0 auto">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px">
          <h1 style="font-size:22px;margin:0;font-weight:750">🔧 ÞjónustuVerkstæði</h1>
          <button id="_sv-new" style="padding:8px 14px;border:none;border-radius:8px;background:#0f172a;color:#fff;font-weight:600;font-size:13px;cursor:pointer">+ Ný heimsókn</button>
        </div>
        <p style="color:#64748b;font-size:14px;margin:0 0 16px">Opnar þjónustulotur fyrir Fyrirtækjaþjónustu og Ferðaþjónustu. Smelltu á spjald til að vinna í því.</p>
        <div style="display:flex;gap:14px;align-items:flex-start;overflow-x:auto;padding-bottom:10px">${colHtml}</div>
      </div>`;
    v.querySelector('#_sv-new').onclick = newVisitPrompt;
    v.querySelectorAll('[data-sv-act]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      onCardAction(b.getAttribute('data-sv-act'), +b.getAttribute('data-sv-id'));
    }));
  }

  function cardHtml(r, col) {
    const stale = r.status === 'bidur' && daysSince(r.last_touched_at) >= 3;
    const reason = r.status === 'bidur'
      ? `<div style="font-size:12px;color:#92400e;margin-top:3px">${esc(reasonLabel(r.block_reason))}${r.next_action ? ' — ' + esc(r.next_action) : ''}</div>`
      : '';
    const age = r.status !== 'lokid'
      ? `<div style="font-size:11px;color:${stale ? '#dc2626' : '#94a3b8'};margin-top:4px">${stale ? '🔴 ' : ''}síðast snert: ${daysSince(r.last_touched_at)} d</div>`
      : `<div style="font-size:11px;color:#94a3b8;margin-top:4px">rukkað ${fmtDate(r.invoiced_at || r.completed_at)}</div>`;
    const units = `<div style="font-size:12px;color:#475569;margin-top:2px">${r.units_total || 0} tæki${r.mode === 'innkoma' ? ' · innkoma' : ''}</div>`;
    let actions = '';
    if (r.status === 'opin')
      actions = `<button data-sv-act="hold" data-sv-id="${r.id}" style="${btn('#fef3c7','#92400e')}">⏸ Vista opna</button> <button data-sv-act="ready" data-sv-id="${r.id}" style="${btn('#dcfce7','#14532d')}">✓ Tilbúið</button>`;
    else if (r.status === 'bidur')
      actions = `<button data-sv-act="hold" data-sv-id="${r.id}" style="${btn('#f1f5f9','#334155')}">✎ Ástæða</button> <button data-sv-act="resume" data-sv-id="${r.id}" style="${btn('#dbeafe','#1e3a8a')}">▶ Halda áfram</button> <button data-sv-act="ready" data-sv-id="${r.id}" style="${btn('#dcfce7','#14532d')}">✓ Tilbúið</button>`;
    else if (r.status === 'tilbuid')
      actions = `<button data-sv-act="invoice" data-sv-id="${r.id}" style="${btn('#dbeafe','#1e3a8a')}">🧾 Reikningur</button> <button data-sv-act="report" data-sv-id="${r.id}" style="${btn('#ede9fe','#5b21b6')}">📄 Skýrsla</button> <button data-sv-act="close" data-sv-id="${r.id}" style="${btn('#dcfce7','#14532d')}">✓ Loka</button>`;
    return `<div style="background:#fff;border:1px solid #e2e8f0;border-left:4px solid ${col.bar};border-radius:10px;padding:11px 13px;box-shadow:0 1px 2px rgba(16,24,40,.04)">
        <div style="font-weight:700;font-size:14px;color:#0f172a">${esc(r.customer_nafn || '—')}</div>
        ${units}${reason}${age}
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px">${actions}</div>
      </div>`;
  }
  function btn(bg, tx) { return `padding:5px 9px;border:none;border-radius:7px;background:${bg};color:${tx};font-size:11.5px;font-weight:700;cursor:pointer`; }

  async function onCardAction(act, id) {
    const r = _cache.find(x => +x.id === id); if (!r) return;
    if (act === 'hold') { await holdPrompt(r); return; }
    if (act === 'resume') { await update(id, { status: 'opin', block_reason: null }); render(); return; }
    if (act === 'ready')  { await update(id, { status: 'tilbuid', completed_at: new Date().toISOString() }); render(); return; }
    if (act === 'close')  { await update(id, { status: 'lokid' }); render(); return; }
    if (act === 'invoice') {
      // Reuse existing dkPlus / sala invoice path when available; else guide.
      if (window.SalaInvoice && r.dk_invoice_id) { toast('Reikningur þegar til'); return; }
      toast('Reikningagerð fyrir lotu — tenging við dkPlus kemur í næsta skrefi.');
      await update(id, { invoiced_at: new Date().toISOString() }); render();
      return;
    }
    if (act === 'report') {
      // Hook to the existing úttektarskýrsla generators if present.
      const co = (window.Companies && Companies.list || []).find(c => digits(c.kennitala) === digits(r.customer_kt));
      if (co && window.CompanyInspectionReport && CompanyInspectionReport.open) { CompanyInspectionReport.open(co.id); return; }
      if (co && window.VisitReport && VisitReport.open) { VisitReport.open(co.id); return; }
      toast('Úttektarskýrsla — opnaðu fyrirtækið til að búa hana til (tenging kemur næst).');
      return;
    }
  }

  // ── "+ Ný heimsókn" — pick a service company, create an open visit ─────────
  function newVisitPrompt() {
    document.getElementById('_sv-new-modal')?.remove();
    const cos = (window.Companies && Companies.list || []).filter(c => c && c.nafn && c.er_i_thjonustu);
    const m = document.createElement('div');
    m.id = '_sv-new-modal';
    m.style.cssText = 'position:fixed;inset:0;z-index:100070;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
    m.innerHTML =
      `<div style="background:#fff;border-radius:14px;padding:22px;max-width:460px;width:100%;box-shadow:0 20px 60px rgba(15,23,42,.3)">
        <h2 style="margin:0 0 14px;font-size:18px;color:#0f172a">+ Ný þjónustuheimsókn</h2>
        <input id="_sv-co-search" placeholder="🔎 Leita að fyrirtæki…" style="width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;margin-bottom:8px">
        <select id="_sv-co" size="6" style="width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13.5px;margin-bottom:12px;padding:4px">
          ${cos.map(c => `<option value="${c.id}">${esc(c.nafn)}${c.kennitala ? ' — ' + esc(c.kennitala) : ''}</option>`).join('')}
        </select>
        <div style="display:flex;gap:10px;margin-bottom:16px;font-size:13.5px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="_svmode" value="lota" checked> Lota (regluleg)</label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="radio" name="_svmode" value="innkoma"> Innkoma (drop-in)</label>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button id="_sv-n-cancel" style="padding:9px 16px;border-radius:8px;font-size:14px;cursor:pointer;border:1px solid #e2e8f0;background:#fff;color:#334155">Hætta við</button>
          <button id="_sv-n-create" style="padding:9px 18px;border-radius:8px;font-size:14px;cursor:pointer;border:none;background:#0f172a;color:#fff;font-weight:700">Stofna</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    const sel = m.querySelector('#_sv-co');
    m.querySelector('#_sv-co-search').addEventListener('input', e => {
      const q = e.target.value.toLowerCase();
      Array.from(sel.options).forEach(o => { o.style.display = o.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    });
    const close = () => m.remove();
    m.querySelector('#_sv-n-cancel').onclick = close;
    m.addEventListener('click', e => { if (e.target === m) close(); });
    m.querySelector('#_sv-n-create').onclick = async () => {
      const coId = sel.value; if (!coId) { toast('Veldu fyrirtæki'); return; }
      const co = cos.find(c => String(c.id) === String(coId));
      const mode = (m.querySelector('input[name="_svmode"]:checked') || {}).value || 'lota';
      const units = (window.DB && DB.cache && DB.cache.units || []).filter(u => u.status === 'active' && u.client === co.nafn)
        .map(u => ({ uttaeki_id: u.id, serial: u.serial, type: u.type, outcome: null, note: '' }));
      await create({ kennitala: co.kennitala, nafn: co.nafn, fyrirtaeki_id: co.id, mode, units, units_total: units.length });
      close(); render();
    };
  }

  // ── open-visit banner on the company detail page (best-effort) ─────────────
  // Shows a red strip at the top of companies-main when the open company has an
  // active service_visit, so a parked job can't silently disappear.
  let _bannerKt = null;
  async function maybeBanner() {
    const main = document.getElementById('companies-main');
    if (!main) { _bannerKt = null; return; }
    const idEl = main.querySelector('[data-co-id]');
    const coId = idEl ? +idEl.getAttribute('data-co-id') : null;
    const co = coId && window.Companies && (Companies.list || []).find(c => +c.id === coId);
    const kt = co ? digits(co.kennitala) : null;
    if (!kt) return;
    if (main.querySelector('._sv-banner[data-kt="' + kt + '"]')) return; // already shown
    if (_bannerKt === kt) return;
    _bannerKt = kt;
    const visit = await openForCustomer(kt);
    main.querySelectorAll('._sv-banner').forEach(b => b.remove());
    if (!visit) return;
    const stale = visit.status === 'bidur' && daysSince(visit.last_touched_at) >= 3;
    const div = document.createElement('div');
    div.className = '_sv-banner';
    div.setAttribute('data-kt', kt);
    div.style.cssText = 'margin:0 0 12px;padding:11px 14px;border-radius:10px;background:#fee2e2;border:1px solid #dc2626;color:#7f1d1d;font-size:13.5px;display:flex;align-items:center;gap:10px;flex-wrap:wrap';
    div.innerHTML = `<b>🔴 OPIN HEIMSÓKN</b> · hafin ${fmtDate(visit.started_at)} · ${esc(reasonLabel(visit.block_reason) || 'í vinnslu')}${visit.next_action ? ' — ' + esc(visit.next_action) : ''}${stale ? ' · <b>' + daysSince(visit.last_touched_at) + ' d!</b>' : ''} <button id="_sv-goto" style="margin-left:auto;padding:5px 11px;border:none;border-radius:7px;background:#dc2626;color:#fff;font-size:12px;font-weight:700;cursor:pointer">Opna á borði →</button>`;
    main.insertBefore(div, main.firstChild);
    div.querySelector('#_sv-goto').onclick = () => openView();
  }
  setInterval(maybeBanner, 1500);

  // ── nav injection (mirrors patch 175) ──────────────────────────────────────
  function openView() {
    document.querySelectorAll('[id^=view-]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    ensureView();
    const v = viewEl();
    v.style.display = ''; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector('[data-view="' + NAV_KEY + '"]'); if (btn) btn.classList.add('active');
    render();
  }
  function injectTab() {
    const btns = Array.prototype.slice.call(document.querySelectorAll('.vnav-btn'));
    const anchor = btns.find(b => b.dataset.view === 'workshop') || btns.find(b => b.dataset.view === 'field');
    if (!anchor || !anchor.parentElement) return;
    if (document.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const btn = anchor.cloneNode(true);
    btn.dataset.view = NAV_KEY;
    btn.classList.remove('active');
    const span = btn.querySelector('span');
    if (span) span.textContent = '🔧 ÞjónustuVerkstæði'; else btn.textContent = '🔧 ÞjónustuVerkstæði';
    btn.querySelectorAll('.badge,.count,[class*="badge"],[class*="count"]').forEach(n => n.remove());
    btn.removeAttribute('onclick');
    btn.onclick = openView;
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    document.querySelectorAll('.vnav-btn').forEach(b => {
      if (b === btn) return;
      b.addEventListener('click', () => { const vv = viewEl(); if (vv) { vv.style.display = 'none'; vv.classList.remove('active'); } btn.classList.remove('active'); });
    });
    console.log('[þjónustuverkstæði] tab injected');
  }
  setInterval(injectTab, 1200);
  setTimeout(injectTab, 600);
  window.openThjonustuVerkstaedi = openView;
  console.log('[patch-190] ÞjónustuVerkstæði installed');
})();
/* === END ÞJÓNUSTUVERKSTÆÐI === */
