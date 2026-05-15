/* === BRUNAKERFISÞJÓNUSTA v1 ===
   New top-level view for fire-warning-system customers. Separate from
   regular fyrirtækjaþjónusta because:
     • Different staff (electricians, not slökkvitækjamenn)
     • Annual ársskoðun in a fixed month per customer
     • Þjónustusamningur form is the brunakerfi variant
     • Documents (contracts, prior inspections) stay attached per customer

   Tab placement: right below "Fyrirtækjaþjónusta" in the sidebar (added
   to patch-68's ORDER list).

   Deep link: append `?tab=brunakerfi[&co=<id>]` to the URL to open this
   view (and optionally a specific company) on page load.

   Data model — AppSettings.brunakerfi_customers (synced):
     {
       <co_id>: {
         co_id, unit_count, inspect_month (1-12), last_inspected, notes
       }, ...
     }

   The actual fyrirtæki + uttaeki + thjonustusamningar + saved templates
   already live in their own tables / AppSettings keys — we just project
   the brunakerfi-specific list and link to them. */
(() => {
  if (window.__brunakerfiInstalled) return;
  window.__brunakerfiInstalled = true;

  const STORAGE_KEY = 'brunakerfi_customers';
  const NOTES_KEY = 'brunakerfi_notes';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
  }
  const MONTHS_IS = ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'];

  function getList() {
    const m = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || {};
    return m && typeof m === 'object' ? m : {};
  }
  async function saveOne(coId, entry) {
    if (!window.AppSettings || !window.AppSettings.save) return false;
    const map = Object.assign({}, getList());
    if (entry === null) delete map[String(coId)];
    else map[String(coId)] = Object.assign({}, map[String(coId)] || {}, entry, { co_id: coId });
    return await window.AppSettings.save({ [STORAGE_KEY]: map });
  }

  let _cache = { companies: [], filledDocs: [] };

  // ── Top-of-view notes (free-form instructions for electricians) ──────────
  function getNotes() {
    const v = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(NOTES_KEY)) || '';
    return typeof v === 'string' ? v : '';
  }

  // Persistence: must survive (a) quick tab close, (b) Mac/Windows app
  // switches, (c) cross-device sync. Strategy:
  //   • Save with a SHORT debounce (300 ms) on every keystroke.
  //   • Save IMMEDIATELY on blur.
  //   • Flush any pending save on visibilitychange→hidden and pagehide
  //     (these fire reliably even when the user closes the tab).
  //   • Maintain a single "current text" buffer so concurrent renders don't
  //     overwrite a user's in-progress typing.
  let _notesTimer = null;
  let _notesPendingValue = null;     // text waiting to be flushed
  let _notesIsTyping = false;        // user actively editing right now
  let _notesUserDirty = false;       // text has been edited locally since last paint

  function showSavedFlash() {
    const saved = document.querySelector('._bk-notes-saved');
    if (saved) {
      saved.style.opacity = '1';
      setTimeout(() => { saved.style.opacity = '0'; }, 1500);
    }
  }
  async function flushNotes(ta) {
    if (_notesPendingValue == null) return false;
    if (!window.AppSettings || !window.AppSettings.save) return false;
    clearTimeout(_notesTimer);
    _notesTimer = null;
    const val = _notesPendingValue;
    _notesPendingValue = null;
    const ok = await window.AppSettings.save({ [NOTES_KEY]: val });
    if (ok) showSavedFlash();
    if (!ok) _notesPendingValue = val; // keep pending so we can retry
    return ok;
  }

  function wireNotes(root) {
    const ta = root.querySelector('#_bk-notes-ta');
    if (!ta) return;

    ta.addEventListener('focus', () => { _notesIsTyping = true; });
    ta.addEventListener('input', () => {
      _notesIsTyping = true;
      _notesUserDirty = true;
      _notesPendingValue = ta.value;
      clearTimeout(_notesTimer);
      _notesTimer = setTimeout(() => { flushNotes(ta); }, 300);
    });
    ta.addEventListener('blur', () => {
      _notesIsTyping = false;
      flushNotes(ta);
    });
  }

  // Single global listener (registered once) so re-renders don't stack
  // multiple subscriptions. When AppSettings refreshes from the server,
  // pull the latest note text into the textarea — unless the user is
  // actively typing right now (don't stomp in-flight edits).
  if (!window.__bkNotesOnChangeHooked && window.AppSettings && typeof window.AppSettings.onChange === 'function') {
    window.__bkNotesOnChangeHooked = true;
    window.AppSettings.onChange(() => {
      if (_notesIsTyping) return;
      const ta = document.getElementById('_bk-notes-ta');
      if (!ta) return;
      const fresh = getNotes();
      if (fresh !== ta.value) {
        ta.value = fresh;
        _notesUserDirty = false;
      }
    });
  }

  // Global safety net: flush before the tab closes, gets hidden (mobile app
  // switch), or the page is unloaded. These events fire reliably across
  // browsers and ensure the user never loses what they typed.
  if (!window.__bkNotesFlushHooked) {
    window.__bkNotesFlushHooked = true;
    function flushAny() {
      const ta = document.getElementById('_bk-notes-ta');
      // We can't await an async save during unload — but Supabase JS client
      // uses fetch with keepalive, so the request completes even after the
      // tab is closed.
      try { flushNotes(ta); } catch (_) {}
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flushAny();
    });
    window.addEventListener('pagehide', flushAny);
    window.addEventListener('beforeunload', flushAny);
  }

  async function loadAll() {
    const SB = getSB();
    if (!SB) return;
    const map = getList();
    const ids = Object.keys(map).map(k => +k).filter(Boolean);
    let companies = [];
    if (ids.length) {
      const { data } = await SB.from('fyrirtaeki').select('id,nafn,kennitala,simi,heimilisfang,netfang,athugasemdir,tengiliður').in('id', ids);
      companies = (data || []).map(c => ({ ...c, _bk: map[String(c.id)] || {} }));
    }
    _cache.companies = companies.sort((a, b) => (a.nafn || '').localeCompare(b.nafn || '', 'is'));
    // Saved filled documents (Ársskoðun, Þjónustusamningur) — from AppSettings.skjalasnidmat_filled
    const filled = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('skjalasnidmat_filled')) || [];
    _cache.filledDocs = Array.isArray(filled) ? filled : [];
  }

  // ── Sidebar entry ────────────────────────────────────────────────────────
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('[data-view="brunakerfi"]')) return;
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    const fyrirtBtn = allBtns.find(b => /fyrirtækj/i.test(b.textContent || ''));
    const tpl = fyrirtBtn || allBtns[0];
    if (!tpl) { setTimeout(injectSidebar, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', 'brunakerfi');
    btn.innerHTML = '<span style="margin-right:6px">🚨</span>Brunakerfisþjónusta';
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (window.App && typeof App.switchView === 'function') App.switchView('brunakerfi');
      else show();
    });
    // Insert AFTER Fyrirtækjaþjónusta
    if (fyrirtBtn && fyrirtBtn.parentNode) fyrirtBtn.parentNode.insertBefore(btn, fyrirtBtn.nextSibling);
    else nav.appendChild(btn);
  }

  // ── Render ───────────────────────────────────────────────────────────────
  async function show() {
    const main = document.getElementById('brunakerfi-main');
    if (!main) return;
    main.innerHTML = '<div style="padding:24px;color:#94a3b8">Hleður…</div>';
    // Refresh AppSettings from Supabase so notes typed on another device
    // show up here (avoids the stale-cache cross-device problem). If the
    // user is currently typing, the onChange listener guards against
    // stomping their in-flight edit.
    if (!_notesIsTyping && window.AppSettings && typeof window.AppSettings.load === 'function') {
      try { await window.AppSettings.load(); } catch (_) {}
    }
    await loadAll();
    renderList();
  }

  function renderList() {
    const main = document.getElementById('brunakerfi-main');
    if (!main) return;
    const list = _cache.companies;
    const totalUnits = list.reduce((s, c) => s + (+c._bk.unit_count || 0), 0);
    const monthBuckets = {};
    list.forEach(c => {
      const m = +c._bk.inspect_month || 0;
      if (m >= 1 && m <= 12) (monthBuckets[m] = monthBuckets[m] || []).push(c);
    });

    main.innerHTML = `
      <div style="max-width:1200px;margin:0 auto;padding:22px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:18px">
          <div>
            <h1 style="margin:0;font-size:22px;color:#0f172a;display:flex;align-items:center;gap:10px">🚨 Brunakerfisþjónusta</h1>
            <div style="font-size:12px;color:#64748b;margin-top:2px">Þjónustusamningar og ársskoðanir brunaviðvörunarkerfa — ${list.length} fyrirtæki · ${totalUnits} einingar</div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button class="_bk-share" type="button" style="padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:12px;color:#475569" title="Afrita beinan tengil á þennan tab">🔗 Afrita tengil</button>
            <button class="_bk-add" type="button" style="padding:9px 16px;background:#dc2626;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">+ Bæta við fyrirtæki</button>
          </div>
        </div>

        <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;padding:11px 14px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <div style="font-size:11px;font-weight:700;color:#1e40af;text-transform:uppercase;letter-spacing:.05em">📝 Nótur &amp; leiðbeiningar</div>
            <span class="_bk-notes-saved" style="font-size:10px;color:#16a34a;font-weight:700;opacity:0;transition:opacity .2s">✓ Vistað</span>
          </div>
          <textarea id="_bk-notes-ta" rows="4" placeholder="Almennar leiðbeiningar fyrir rafvirkja, símanúmer, athugasemdir vakta… (sjálfkrafa vistað)" style="width:100%;padding:8px 10px;border:1px solid #93c5fd;border-radius:6px;font:inherit;font-size:12.5px;color:#0f172a;background:#fff;resize:vertical;min-height:96px;outline:none;box-sizing:border-box">${esc(getNotes())}</textarea>
        </div>

        ${list.length === 0 ? `
          <div style="background:#fff;border:2px dashed #cbd5e1;border-radius:12px;padding:40px;text-align:center;color:#64748b">
            <div style="font-size:34px;margin-bottom:10px">🚨</div>
            <div style="font-size:15px;font-weight:600;color:#0f172a;margin-bottom:4px">Engin fyrirtæki skráð í brunakerfisþjónustu enn</div>
            <div style="font-size:12px">Smelltu á <strong>"+ Bæta við fyrirtæki"</strong> til að bæta við fyrsta viðskiptavininum.</div>
          </div>
        ` : `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">
          ${list.map(c => renderCard(c)).join('')}
        </div>

        <div style="margin-top:24px;padding:14px 18px;background:#fff;border:1px solid #e2e8f0;border-radius:10px">
          <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">📅 Ársskoðun-dagatal</div>
          <div style="display:grid;grid-template-columns:repeat(12,1fr);gap:6px">
            ${Array.from({length:12}, (_, i) => i + 1).map(m => {
              const arr = monthBuckets[m] || [];
              return `<div style="background:${arr.length ? '#fef3c7' : '#f8fafc'};border:1px solid ${arr.length ? '#fde68a' : '#e2e8f0'};border-radius:7px;padding:8px;text-align:center;min-height:54px">
                <div style="font-size:10px;font-weight:700;color:#92400e">${esc(MONTHS_IS[m-1].slice(0,3))}</div>
                <div style="font-size:18px;font-weight:800;color:${arr.length ? '#92400e' : '#cbd5e1'};margin:2px 0">${arr.length}</div>
                <div style="font-size:9px;color:#64748b">fyrirtæki</div>
              </div>`;
            }).join('')}
          </div>
        </div>
        `}
      </div>
    `;

    main.querySelector('._bk-add')?.addEventListener('click', openAddDialog);
    main.querySelector('._bk-share')?.addEventListener('click', shareLink);
    wireNotes(main);
    main.querySelectorAll('._bk-card').forEach(el => {
      const id = +el.dataset.coId;
      el.querySelector('._bk-open')?.addEventListener('click', () => openCompanyDetail(id));
      el.querySelector('._bk-skyrsla')?.addEventListener('click', e => { e.stopPropagation(); newReport(id); });
      el.querySelector('._bk-samn')?.addEventListener('click', e => { e.stopPropagation(); newContract(id); });
      el.querySelector('._bk-edit')?.addEventListener('click', e => { e.stopPropagation(); openEditDialog(id); });
      el.querySelector('._bk-del')?.addEventListener('click', async e => {
        e.stopPropagation();
        const co = _cache.companies.find(c => c.id === id);
        if (!co) return;
        if (!confirm('Fjarlægja "' + co.nafn + '" úr brunakerfisþjónustu? (Fyrirtækið sjálft helst í kerfinu)')) return;
        await saveOne(id, null);
        await show();
      });
    });
  }

  function renderCard(c) {
    const bk = c._bk || {};
    const m = +bk.inspect_month || 0;
    const monthLabel = m >= 1 && m <= 12 ? MONTHS_IS[m-1] : '—';
    const lastIns = bk.last_inspected ? fmtDate(bk.last_inspected) : '—';
    const docs = _cache.filledDocs.filter(d => {
      if (!d || !d.values) return false;
      // Match by co_id (most reliable) or by any name field
      if (d.co_id && d.co_id === c.id) return true;
      const v = d.values;
      const cust = (v.vidskiptavinur_nafn || v.verkkaupi || v.customer_nafn || d.customer || '').toLowerCase();
      return cust === (c.nafn || '').toLowerCase();
    });
    return `
      <div class="_bk-card" data-co-id="${c.id}" style="background:#fff;border:1px solid #e2e8f0;border-radius:11px;padding:13px 15px;display:flex;flex-direction:column;gap:8px;box-shadow:0 1px 3px rgba(0,0,0,0.04);transition:all .15s" onmouseover="this.style.borderColor='#fca5a5'" onmouseout="this.style.borderColor='#e2e8f0'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
          <div style="min-width:0;flex:1">
            <div style="font-weight:700;color:#0f172a;font-size:14.5px;line-height:1.25">${esc(c.nafn || '—')}</div>
            ${c.kennitala ? `<div style="font-size:11px;color:#64748b;font-family:monospace;margin-top:1px">kt. ${esc(c.kennitala)}</div>` : ''}
            ${c.heimilisfang ? `<div style="font-size:11px;color:#64748b;margin-top:1px">📍 ${esc(c.heimilisfang)}</div>` : ''}
          </div>
          <div style="display:flex;gap:2px;flex-shrink:0">
            <button class="_bk-edit" type="button" title="Breyta" style="background:transparent;border:1px solid #e2e8f0;color:#64748b;border-radius:5px;width:24px;height:24px;cursor:pointer;font-size:11px;padding:0">✏️</button>
            <button class="_bk-del" type="button" title="Fjarlægja" style="background:transparent;border:1px solid #fecaca;color:#dc2626;border-radius:5px;width:24px;height:24px;cursor:pointer;font-size:11px;padding:0">✕</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11.5px">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px">
            <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase">Einingar</div>
            <div style="font-size:15px;font-weight:800;color:#0f172a">${+bk.unit_count || 0}</div>
          </div>
          <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:5px 8px">
            <div style="font-size:9px;font-weight:700;color:#92400e;text-transform:uppercase">Skoðun</div>
            <div style="font-size:13px;font-weight:700;color:#92400e">${esc(monthLabel)}</div>
          </div>
        </div>
        <div style="font-size:10.5px;color:#64748b">Síðasta skoðun: <strong style="color:#0f172a">${esc(lastIns)}</strong> · ${docs.length} skjöl vistuð</div>
        <div style="display:flex;gap:5px;margin-top:3px;flex-wrap:wrap">
          <button class="_bk-open" type="button" style="flex:1;min-width:80px;padding:6px 8px;background:#0f172a;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600">📂 Opna</button>
          <button class="_bk-skyrsla" type="button" style="padding:6px 8px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600" title="Ný ársskoðun">📋 Skýrsla</button>
          <button class="_bk-samn" type="button" style="padding:6px 8px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600" title="Þjónustusamningur">📜 Samningur</button>
        </div>
      </div>
    `;
  }

  // ── Add company to the brunakerfi list — proper modal picker ─────────────
  function openAddDialog() {
    document.getElementById('_bk-add-dlg')?.remove();
    const dlg = document.createElement('div');
    dlg.id = '_bk-add-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100055;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
    dlg.innerHTML = `
      <div style="background:#fff;border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,0.3);width:min(520px,calc(100vw - 28px));max-height:80vh;display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:14px 20px;background:#dc2626;color:#fff;display:flex;justify-content:space-between;align-items:center">
          <h3 style="margin:0;font-size:16px;font-weight:700">🚨 Bæta fyrirtæki í brunakerfisþjónustu</h3>
          <button id="_bk-a-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;width:30px;height:30px;border-radius:5px;cursor:pointer;font-size:15px;line-height:1">✕</button>
        </div>
        <div style="padding:16px 20px;border-bottom:1px solid #e2e8f0">
          <input id="_bk-a-search" type="text" autocomplete="off" placeholder="🔍 Leita að kennitölu eða nafni…"
            style="width:100%;padding:11px 14px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box;outline:none">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:10px">
            <div style="font-size:11px;color:#64748b">Sláðu inn að minnsta kosti 2 stafi til að leita.</div>
            <button id="_bk-a-create" type="button" style="padding:6px 11px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700;white-space:nowrap">+ Stofna nýtt fyrirtæki</button>
          </div>
        </div>
        <div id="_bk-a-results" style="flex:1;overflow-y:auto;padding:8px 14px"></div>
      </div>`;
    document.body.appendChild(dlg);
    const inp = dlg.querySelector('#_bk-a-search');
    const results = dlg.querySelector('#_bk-a-results');
    function close() { dlg.remove(); }
    dlg.querySelector('#_bk-a-x').addEventListener('click', close);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape' && document.body.contains(dlg)) { close(); document.removeEventListener('keydown', onKey); }
    });
    dlg.querySelector('#_bk-a-create').addEventListener('click', () => {
      const seed = inp.value.trim();
      close();
      openCreateCompanyDialog(seed);
    });
    setTimeout(() => inp.focus(), 40);

    let timer = null;
    inp.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => runSearch(inp.value.trim()), 180);
    });

    async function runSearch(term) {
      if (term.length < 2) { results.innerHTML = ''; return; }
      const SB = getSB();
      if (!SB) { results.innerHTML = '<div style="padding:14px;color:#94a3b8;text-align:center;font-size:12.5px">Engin gagnabankatenging</div>'; return; }
      const digits = term.replace(/[^0-9]/g, '');
      let q = SB.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,simi').order('nafn').limit(12);
      if (digits.length >= 3) q = q.or(`kennitala.ilike.${digits}%`);
      else q = q.ilike('nafn', '%' + term + '%');
      const { data } = await q;
      const list = data || [];
      const existing = getList();
      if (!list.length) {
        const seedDigits = term.replace(/[^0-9]/g, '');
        const isKt = seedDigits.length >= 6;
        results.innerHTML = `
          <div style="padding:18px;text-align:center">
            <div style="color:#94a3b8;font-style:italic;font-size:13px;margin-bottom:10px">Engin samsvörun fyrir <strong>${esc(term)}</strong></div>
            <button id="_bk-a-create2" type="button" style="padding:10px 16px;background:#16a34a;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">+ Stofna „${esc(term)}" sem nýtt fyrirtæki</button>
          </div>`;
        results.querySelector('#_bk-a-create2').addEventListener('click', () => {
          close();
          openCreateCompanyDialog(term, isKt ? seedDigits : '');
        });
        return;
      }
      results.innerHTML = list.map((c, i) => {
        const already = !!existing[String(c.id)];
        return `<div class="_bk-a-row" data-i="${i}" style="padding:10px 12px;border:1px solid ${already ? '#fde68a' : '#e2e8f0'};border-radius:8px;margin-bottom:6px;background:${already ? '#fffbeb' : '#fff'};${already ? 'opacity:.6;cursor:not-allowed' : 'cursor:pointer'};display:flex;justify-content:space-between;align-items:center;gap:8px" ${already ? '' : 'onmouseover="this.style.background=\'#fef3c7\'" onmouseout="this.style.background=\'#fff\'"'}>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;color:#0f172a;font-size:13.5px">${esc(c.nafn || '—')}</div>
            <div style="font-size:11px;color:#64748b;margin-top:1px">${c.kennitala ? 'kt. ' + esc(c.kennitala) : ''}${c.heimilisfang ? ' · 📍 ' + esc(c.heimilisfang) : ''}</div>
          </div>
          ${already ? '<span style="font-size:10px;font-weight:700;color:#92400e;background:#fde68a;padding:2px 8px;border-radius:99px">Þegar á lista</span>' : '<span style="font-size:14px;color:#94a3b8">›</span>'}
        </div>`;
      }).join('');
      // Wire rows
      results.querySelectorAll('._bk-a-row').forEach(r => {
        r.addEventListener('click', async () => {
          const i = +r.dataset.i;
          const co = list[i];
          if (existing[String(co.id)]) return;
          await saveOne(co.id, { unit_count: 0, inspect_month: 0 });
          close();
          await show();
          setTimeout(() => openEditDialog(co.id), 120);
        });
      });
    }
  }

  // ── Create a brand-new fyrirtæki + add it to brunakerfi list ─────────────
  function openCreateCompanyDialog(seedText, seedKt) {
    const looksLikeKt = /^\d{3,10}$/.test(String(seedText || '').replace(/[^0-9]/g, ''));
    const initialNafn = looksLikeKt ? '' : (seedText || '');
    const initialKt = (seedKt || (looksLikeKt ? String(seedText).replace(/[^0-9]/g, '') : '')).slice(0, 10);

    document.getElementById('_bk-new-dlg')?.remove();
    const dlg = document.createElement('div');
    dlg.id = '_bk-new-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100060;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
    dlg.innerHTML = `
      <div style="background:#fff;border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,0.3);width:min(460px,calc(100vw - 28px));overflow:hidden">
        <div style="padding:13px 18px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-size:11px;color:#bbf7d0;text-transform:uppercase;letter-spacing:.06em;font-weight:600">Stofna fyrirtæki</div>
            <div style="font-size:15px;font-weight:700;margin-top:2px">+ Nýtt fyrirtæki</div>
          </div>
          <button id="_bk-new-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;width:28px;height:28px;border-radius:5px;cursor:pointer;font-size:14px;line-height:1">✕</button>
        </div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:11px">
          <div>
            <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Nafn *</label>
            <input id="_bk-new-nafn" type="text" value="${esc(initialNafn)}" placeholder="Fyrirtæki ehf." style="width:100%;padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;margin-top:4px;box-sizing:border-box">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Kennitala</label>
              <input id="_bk-new-kt" type="text" inputmode="numeric" value="${esc(initialKt)}" placeholder="0000000000" maxlength="11" style="width:100%;padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;margin-top:4px;box-sizing:border-box;font-family:monospace">
            </div>
            <div>
              <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Sími</label>
              <input id="_bk-new-simi" type="tel" placeholder="555 1234" style="width:100%;padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;margin-top:4px;box-sizing:border-box">
            </div>
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Netfang</label>
            <input id="_bk-new-email" type="email" placeholder="netfang@fyrirtaeki.is" style="width:100%;padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;margin-top:4px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Heimilisfang</label>
            <input id="_bk-new-addr" type="text" placeholder="Götu 1, 101 Reykjavík" style="width:100%;padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;margin-top:4px;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Tengiliður</label>
            <input id="_bk-new-tengl" type="text" placeholder="Nafn tengiliðs" style="width:100%;padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;margin-top:4px;box-sizing:border-box">
          </div>
          <div id="_bk-new-err" style="display:none;font-size:12px;color:#dc2626;font-weight:600;padding:6px 10px;background:#fee2e2;border-radius:6px"></div>
        </div>
        <div style="padding:11px 18px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end">
          <button id="_bk-new-cancel" type="button" style="padding:8px 16px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>
          <button id="_bk-new-save" type="button" style="padding:8px 18px;background:#16a34a;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">Vista og bæta í brunakerfi</button>
        </div>
      </div>`;
    document.body.appendChild(dlg);

    function close() { dlg.remove(); }
    dlg.querySelector('#_bk-new-x').addEventListener('click', close);
    dlg.querySelector('#_bk-new-cancel').addEventListener('click', close);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });

    const nafnInp = dlg.querySelector('#_bk-new-nafn');
    const ktInp = dlg.querySelector('#_bk-new-kt');
    const errEl = dlg.querySelector('#_bk-new-err');
    setTimeout(() => { (initialNafn ? ktInp : nafnInp).focus(); }, 30);

    // Auto-format kt as user types: 6 digits + dash + 4 digits
    ktInp.addEventListener('input', () => {
      const raw = ktInp.value.replace(/[^0-9]/g, '').slice(0, 10);
      ktInp.value = raw.length > 6 ? raw.slice(0,6) + '-' + raw.slice(6) : raw;
    });

    // Enter on any field saves
    dlg.querySelectorAll('input').forEach(i => {
      i.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); dlg.querySelector('#_bk-new-save').click(); }
      });
    });

    function showErr(msg) { errEl.textContent = msg; errEl.style.display = ''; }

    dlg.querySelector('#_bk-new-save').addEventListener('click', async () => {
      const nafn = nafnInp.value.trim();
      const ktClean = ktInp.value.replace(/[^0-9]/g, '');
      const simi = dlg.querySelector('#_bk-new-simi').value.trim();
      const email = dlg.querySelector('#_bk-new-email').value.trim();
      const addr = dlg.querySelector('#_bk-new-addr').value.trim();
      const tengl = dlg.querySelector('#_bk-new-tengl').value.trim();
      if (!nafn) { showErr('Nafn vantar'); return; }
      if (ktClean && ktClean.length !== 10) { showErr('Kennitala verður að vera 10 tölustafir (eða tóm)'); return; }
      const SB = getSB();
      if (!SB) { showErr('Engin gagnabankatenging'); return; }

      // kt-collision check. Same-kt-different-name is intentional for hotel
      // chains and holding companies, so we no longer auto-block. Instead
      // we ask the user with a disambiguation dialog (patch 151).
      if (ktClean) {
        try {
          const r = await SB.from('fyrirtaeki').select('id,nafn,heimilisfang,simi').eq('kennitala', ktClean);
          const matches = (r && r.data) || [];
          const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
          const exact = matches.find(m => norm(m.nafn) === norm(nafn));
          if (exact) {
            // Same kt + same name → just hook the existing row into brunakerfi
            if (getList()[String(exact.id)]) { showErr('Þeir eru þegar á brunakerfis-listanum.'); return; }
            await saveOne(exact.id, { unit_count: 0, inspect_month: 0 });
            close();
            await show();
            setTimeout(() => openEditDialog(exact.id), 120);
            return;
          }
          if (matches.length > 0) {
            // Skip the popup entirely for known/auto-detected chain kts —
            // they always have different verkkaupi names per site so the
            // disambiguation dialog is just noise. patch 151 owns the
            // chain registry.
            const BI = window.BrunakerfiDocImport;
            const isChain = BI && BI.isChainKt ? BI.isChainKt(ktClean, matches) : false;
            if (!isChain) {
              const dialog = BI && BI.showKtCollisionDialog;
              if (!dialog) {
                // Fallback if patch 151 isn't loaded yet — keep the old prompt
                const list = matches.map(m => m.nafn || '—').join(', ');
                if (!confirm('Kt. ' + ktClean.slice(0,6) + '-' + ktClean.slice(6) + ' er þegar skráð á: ' + list + '\n\nStofna nýtt fyrirtæki samt? (T.d. fyrir nýjan stað innan keðju)')) return;
              } else {
                const decision = await dialog(matches, nafn, ktClean);
                if (decision.action === 'cancel') return;
                if (decision.action === 'use_existing') {
                  if (getList()[String(decision.coId)]) { showErr('Þeir eru þegar á brunakerfis-listanum.'); return; }
                  await saveOne(decision.coId, { unit_count: 0, inspect_month: 0 });
                  close();
                  await show();
                  setTimeout(() => openEditDialog(decision.coId), 120);
                  return;
                }
                // 'create_new' → fall through and insert a new row below
              }
            }
            // Chain (or user picked "create_new") → fall through to insert
          }
        } catch (_) {}
      }

      const rec = {
        nafn, kennitala: ktClean || null,
        simi: simi || null, netfang: email || null,
        heimilisfang: addr || null,
        tengiliður: tengl || null
      };
      try {
        const r = await SB.from('fyrirtaeki').insert(rec).select('id,nafn,kennitala').single();
        if (r.error) { showErr(r.error.message); return; }
        // Refresh Companies.list cache so the new row shows up everywhere
        try { if (window.Companies && Companies.load) Companies.load(); } catch (_) {}
        await saveOne(r.data.id, { unit_count: 0, inspect_month: 0 });
        close();
        await show();
        setTimeout(() => openEditDialog(r.data.id), 120);
      } catch (e) {
        showErr(e.message || String(e));
      }
    });
  }

  function openEditDialog(coId) {
    const co = _cache.companies.find(c => c.id === coId) || {};
    const bk = co._bk || {};
    const ktInitial = co.kennitala ? String(co.kennitala) : '';
    const ktDisplay = ktInitial.length === 10 ? ktInitial.slice(0,6) + '-' + ktInitial.slice(6) : ktInitial;

    document.getElementById('_bk-edit-dlg')?.remove();
    const dlg = document.createElement('div');
    dlg.id = '_bk-edit-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit;overflow-y:auto';
    dlg.innerHTML = `
      <div style="background:#fff;border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,0.3);width:min(560px,calc(100vw - 24px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:13px 18px;background:#dc2626;color:#fff;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
          <h3 style="margin:0;font-size:15px;font-weight:700">Breyta — ${esc(co.nafn || '')}</h3>
          <button id="_bk-edit-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;width:28px;height:28px;border-radius:5px;cursor:pointer;font-size:15px">✕</button>
        </div>

        <div style="flex:1;overflow-y:auto;padding:14px 20px;display:flex;flex-direction:column;gap:14px">

          <!-- Section 1: Fyrirtækisupplýsingar -->
          <div>
            <div style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #fecaca">🏢 Fyrirtækisupplýsingar</div>
            <div style="display:flex;flex-direction:column;gap:9px">
              <div>
                <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:3px">Nafn fyrirtækis *</label>
                <input id="_bk-e-nafn" type="text" value="${esc(co.nafn || '')}" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13.5px;box-sizing:border-box">
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:3px">Kennitala</label>
                  <input id="_bk-e-kt" type="text" inputmode="numeric" value="${esc(ktDisplay)}" placeholder="000000-0000" maxlength="11" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13.5px;box-sizing:border-box;font-family:monospace">
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:3px">Sími</label>
                  <input id="_bk-e-simi" type="tel" value="${esc(co.simi || '')}" placeholder="555 1234" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13.5px;box-sizing:border-box">
                </div>
              </div>
              <div>
                <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:3px">Netfang</label>
                <input id="_bk-e-email" type="email" value="${esc(co.netfang || '')}" placeholder="netfang@fyrirtaeki.is" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13.5px;box-sizing:border-box">
              </div>
              <div>
                <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:3px">Heimilisfang</label>
                <input id="_bk-e-addr" type="text" value="${esc(co.heimilisfang || '')}" placeholder="Götu 1, 101 Reykjavík" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13.5px;box-sizing:border-box">
              </div>
              <div>
                <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:3px">Tengiliður</label>
                <input id="_bk-e-tengl" type="text" value="${esc(co['tengiliður'] || '')}" placeholder="Nafn tengiliðs" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13.5px;box-sizing:border-box">
              </div>
            </div>
          </div>

          <!-- Section 2: Brunakerfis-upplýsingar -->
          <div>
            <div style="font-size:10px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #fecaca">🚨 Brunakerfis-upplýsingar</div>
            <div style="display:flex;flex-direction:column;gap:9px">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:3px">Fjöldi eininga</label>
                  <input id="_bk-units" type="number" min="0" value="${+bk.unit_count || 0}" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13.5px;box-sizing:border-box">
                </div>
                <div>
                  <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:3px">Mánuður ársskoðunar</label>
                  <select id="_bk-month" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13.5px;box-sizing:border-box;background:#fff">
                    <option value="0">— ekki tilgreint —</option>
                    ${MONTHS_IS.map((n, i) => `<option value="${i+1}" ${+bk.inspect_month === i+1 ? 'selected' : ''}>${esc(n)}</option>`).join('')}
                  </select>
                </div>
              </div>
              <div>
                <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:3px">Síðasta skoðun</label>
                <input id="_bk-last" type="date" value="${esc(bk.last_inspected || '')}" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13.5px;box-sizing:border-box">
              </div>
              <div>
                <label style="display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:3px">Athugasemd (brunakerfi)</label>
                <textarea id="_bk-notes" rows="2" style="width:100%;padding:8px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box;resize:vertical">${esc(bk.notes || '')}</textarea>
              </div>
            </div>
          </div>

          <div id="_bk-e-err" style="display:none;font-size:12px;color:#dc2626;font-weight:600;padding:7px 11px;background:#fee2e2;border-radius:6px"></div>
        </div>

        <div style="padding:12px 18px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;flex-shrink:0">
          <button id="_bk-edit-cancel" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>
          <button id="_bk-edit-save" type="button" style="padding:9px 18px;background:#dc2626;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">Vista breytingar</button>
        </div>
      </div>`;
    document.body.appendChild(dlg);
    function close() { dlg.remove(); }
    dlg.querySelector('#_bk-edit-x').addEventListener('click', close);
    dlg.querySelector('#_bk-edit-cancel').addEventListener('click', close);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });

    const errEl = dlg.querySelector('#_bk-e-err');
    function showErr(msg) { errEl.textContent = msg; errEl.style.display = ''; }

    // Auto-format kennitala as user types (000000-0000)
    const ktInp = dlg.querySelector('#_bk-e-kt');
    ktInp.addEventListener('input', () => {
      const raw = ktInp.value.replace(/[^0-9]/g, '').slice(0, 10);
      ktInp.value = raw.length > 6 ? raw.slice(0,6) + '-' + raw.slice(6) : raw;
    });

    dlg.querySelector('#_bk-edit-save').addEventListener('click', async () => {
      const nafn = dlg.querySelector('#_bk-e-nafn').value.trim();
      const ktClean = ktInp.value.replace(/[^0-9]/g, '');
      const simi = dlg.querySelector('#_bk-e-simi').value.trim();
      const email = dlg.querySelector('#_bk-e-email').value.trim();
      const addr = dlg.querySelector('#_bk-e-addr').value.trim();
      const tengl = dlg.querySelector('#_bk-e-tengl').value.trim();

      if (!nafn) { showErr('Nafn fyrirtækis vantar'); return; }
      if (ktClean && ktClean.length !== 10) { showErr('Kennitala verður að vera 10 tölustafir (eða tóm)'); return; }

      const SB = getSB();
      if (!SB) { showErr('Engin gagnabankatenging'); return; }

      // Update the fyrirtaeki row (core company info)
      try {
        const updateRec = {
          nafn,
          kennitala: ktClean || null,
          simi: simi || null,
          netfang: email || null,
          heimilisfang: addr || null,
          'tengiliður': tengl || null
        };
        const r = await SB.from('fyrirtaeki').update(updateRec).eq('id', coId);
        if (r.error) { showErr('Vista mistókst: ' + r.error.message); return; }
        // Refresh Companies cache so the new info shows up everywhere
        try { if (window.Companies && Companies.load) Companies.load(); } catch (_) {}
      } catch (e) {
        showErr('Villa: ' + (e.message || String(e)));
        return;
      }

      // Save the brunakerfi-specific entry
      const entry = {
        unit_count: parseInt(dlg.querySelector('#_bk-units').value, 10) || 0,
        inspect_month: parseInt(dlg.querySelector('#_bk-month').value, 10) || 0,
        last_inspected: dlg.querySelector('#_bk-last').value || null,
        notes: dlg.querySelector('#_bk-notes').value.trim()
      };
      await saveOne(coId, entry);

      if (window.Toast && Toast.show) Toast.show('✓ Vistað');
      close();
      await show();
    });
  }

  // ── Per-company detail panel ─────────────────────────────────────────────
  function openCompanyDetail(coId) {
    const co = _cache.companies.find(c => c.id === coId);
    if (!co) return;
    const bk = co._bk || {};
    const docs = _cache.filledDocs.filter(d => {
      if (!d || !d.values) return false;
      if (d.co_id && d.co_id === co.id) return true;
      const v = d.values;
      const cust = (v.vidskiptavinur_nafn || v.verkkaupi || v.customer_nafn || d.customer || '').toLowerCase();
      return cust === (co.nafn || '').toLowerCase();
    });
    const attsKey = 'company_attachments';
    const attsAll = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(attsKey)) || {};
    const atts = attsAll[String(coId)] || [];

    document.getElementById('_bk-detail')?.remove();
    const dlg = document.createElement('div');
    dlg.id = '_bk-detail';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100040;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:14px;font-family:inherit';
    dlg.innerHTML = `
      <div style="background:#f8fafc;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,0.3);width:min(820px,calc(100vw - 24px));max-height:calc(100vh - 24px);display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:14px 22px;background:#dc2626;color:#fff;display:flex;justify-content:space-between;align-items:center">
          <div>
            <h2 style="margin:0;font-size:17px;font-weight:700">🚨 ${esc(co.nafn || '')}</h2>
            <div style="font-size:11px;color:#fecaca;margin-top:2px">${co.kennitala ? 'kt. ' + esc(co.kennitala) : ''}${co.heimilisfang ? ' · 📍 ' + esc(co.heimilisfang) : ''}</div>
          </div>
          <button id="_bk-d-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:15px">✕</button>
        </div>
        <div style="flex:1;overflow-y:auto;padding:18px 22px">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px">
              <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase">Einingar</div>
              <div style="font-size:18px;font-weight:800;color:#0f172a">${+bk.unit_count || 0}</div>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px">
              <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase">Skoðunarmánuður</div>
              <div style="font-size:14px;font-weight:700;color:#92400e">${+bk.inspect_month >= 1 && +bk.inspect_month <= 12 ? esc(MONTHS_IS[+bk.inspect_month-1]) : '—'}</div>
            </div>
            <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px">
              <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase">Síðasta skoðun</div>
              <div style="font-size:14px;font-weight:700;color:#0f172a">${esc(fmtDate(bk.last_inspected))}</div>
            </div>
          </div>

          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:14px">
            <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:9px">🚀 Aðgerðir</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              <button class="_bk-d-skyrsla" type="button" style="padding:9px 14px;background:#dc2626;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600">📋 Ný ársskoðun</button>
              <button class="_bk-d-samn" type="button" style="padding:9px 14px;background:#0f172a;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600">📜 Nýr þjónustusamningur</button>
              <button class="_bk-d-reikn" type="button" style="padding:9px 14px;background:#16a34a;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700">🧾 Nýr skoðunarreikningur</button>
              <button class="_bk-d-edit" type="button" style="padding:9px 14px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600">✏️ Breyta upplýsingum</button>
              <button class="_bk-d-fyr" type="button" style="padding:9px 14px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600">🏢 Fyrirtækisspjald</button>
            </div>
          </div>

          <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:14px">
            <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:9px">📁 Vistuð skjöl (${docs.length})</div>
            ${docs.length === 0 ? '<div style="font-size:12px;color:#94a3b8;font-style:italic">Engin skjöl vistuð enn — smelltu „📋 Ný ársskoðun" eða „📜 Nýr þjónustusamningur" til að byrja.</div>' : `
              <div style="display:flex;flex-direction:column;gap:6px">
                ${docs.map(d => `<div data-doc="${esc(d.id)}" class="_bk-doc-row" style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;cursor:pointer">
                  <div style="min-width:0;flex:1">
                    <div style="font-size:12.5px;font-weight:600;color:#0f172a">${esc(d.name || d.template_name || '—')}</div>
                    <div style="font-size:10px;color:#64748b;margin-top:1px">${esc(d.template_name || '')} · ${esc(fmtDate(d.updated_at || d.created_at))}</div>
                  </div>
                  <div style="font-size:14px;color:#64748b">›</div>
                </div>`).join('')}
              </div>
            `}
          </div>

          <div id="_bk-d-atts-box" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;gap:8px;flex-wrap:wrap">
              <div style="font-size:12px;font-weight:700;color:#0f172a">📎 Skjöl &amp; viðhengi (<span id="_bk-d-atts-count">${atts.length}</span>)</div>
              <button id="_bk-d-upload" type="button" style="padding:7px 13px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:700">📎 Hlaða inn skjali</button>
            </div>
            <div id="_bk-d-drop" style="border:1.5px dashed #cbd5e1;border-radius:8px;padding:14px 16px;text-align:center;font-size:11.5px;color:#64748b;margin-bottom:10px;background:#f8fafc;cursor:pointer">
              Dragðu skrár hingað eða smelltu á „📎 Hlaða inn skjali" hér að ofan
              <div style="font-size:10px;color:#94a3b8;margin-top:3px">PDF, Word, myndir · max 25 MB · vistast hjá fyrirtæki</div>
            </div>
            <div id="_bk-d-atts-list">
              ${atts.length === 0 ? '<div style="font-size:12px;color:#94a3b8;font-style:italic">Engin skjöl viðhengi enn.</div>' : `
                <div style="display:flex;flex-direction:column;gap:4px">
                  ${atts.map(a => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#f8fafc;border-radius:6px;font-size:11.5px">
                    <div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">📄 ${esc(a.name || '')}</div>
                    <div style="color:#64748b;font-size:10px">${esc(fmtDate(a.uploaded_at))}</div>
                  </div>`).join('')}
                </div>
              `}
            </div>
            <input id="_bk-d-fileinp" type="file" multiple hidden>
          </div>
        </div>
      </div>`;
    document.body.appendChild(dlg);
    dlg.querySelector('#_bk-d-x').addEventListener('click', () => dlg.remove());
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.remove(); });
    dlg.querySelector('._bk-d-skyrsla').addEventListener('click', () => { dlg.remove(); newReport(coId); });
    dlg.querySelector('._bk-d-samn').addEventListener('click', () => { dlg.remove(); newContract(coId); });
    dlg.querySelector('._bk-d-reikn')?.addEventListener('click', () => {
      dlg.remove();
      if (window.BrunakerfiPriceForm && BrunakerfiPriceForm.open) {
        BrunakerfiPriceForm.open({ co });
      } else {
        alert('Reikningsform ekki tilbúið (patch 150).');
      }
    });
    dlg.querySelector('._bk-d-edit').addEventListener('click', () => { dlg.remove(); openEditDialog(coId); });
    dlg.querySelector('._bk-d-fyr').addEventListener('click', () => {
      dlg.remove();
      if (window.App && App.switchView) App.switchView('companies');
      setTimeout(() => { if (window.Companies && Companies.openDetail) Companies.openDetail(coId); }, 300);
    });
    dlg.querySelectorAll('._bk-doc-row').forEach(r => {
      r.addEventListener('click', () => {
        const id = r.dataset.doc;
        const d = docs.find(x => x.id === id);
        // Brunakerfi pricelist (patch 150) has its own form — route to it.
        if (d && d.template_id === 'brunakerfi_pricelist' && window.BrunakerfiPriceForm) {
          dlg.remove();
          BrunakerfiPriceForm.open({ co, filledId: id });
          return;
        }
        if (window.DocumentTemplates && DocumentTemplates.openFilled) {
          dlg.remove();
          DocumentTemplates.openFilled(id);
        } else if (window.DocumentTemplates && DocumentTemplates.open) {
          if (d && d.template_id) { dlg.remove(); DocumentTemplates.open(d.template_id); }
        }
      });
    });

    // ── File upload wiring (attach docs straight onto company) ─────────────
    // Uses window.CompanyAttachments.upload() from patch 111. After each
    // upload finishes we re-read AppSettings.company_attachments[coId] and
    // re-render the list inline (no full panel refresh, no scroll-bounce).
    const upBtn = dlg.querySelector('#_bk-d-upload');
    const fileInp = dlg.querySelector('#_bk-d-fileinp');
    const dropZone = dlg.querySelector('#_bk-d-drop');
    const attsListEl = dlg.querySelector('#_bk-d-atts-list');
    const attsCountEl = dlg.querySelector('#_bk-d-atts-count');

    async function openAttachmentByPath(path, name) {
      const SB = getSB();
      if (!SB) { alert('Engin gagnabankatenging'); return; }
      try {
        const r = await SB.storage.from('samningar').createSignedUrl(path, 3600);
        if (r && r.data && r.data.signedUrl) { window.open(r.data.signedUrl, '_blank', 'noopener'); return; }
      } catch (_) {}
      try {
        const r = SB.storage.from('samningar').getPublicUrl(path);
        if (r && r.data && r.data.publicUrl) { window.open(r.data.publicUrl, '_blank', 'noopener'); return; }
      } catch (_) {}
      alert('Gat ekki opnað skrá: ' + (name || path));
    }

    function renderAtts(list) {
      attsCountEl.textContent = list.length;
      if (!list.length) {
        attsListEl.innerHTML = '<div style="font-size:12px;color:#94a3b8;font-style:italic">Engin skjöl viðhengi enn.</div>';
        return;
      }
      attsListEl.innerHTML = '<div style="display:flex;flex-direction:column;gap:4px">' +
        list.map((a, i) => {
          const name = a.name || a.filename || ('Skjal ' + (i+1));
          return `<div class="_bk-att-row" data-path="${esc(a.path || '')}" data-name="${esc(name)}" style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:#f8fafc;border-radius:6px;font-size:11.5px;gap:8px;cursor:pointer" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background='#f8fafc'">
            <div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#1e40af">📄 ${esc(name)}</div>
            <div style="color:#64748b;font-size:10px;flex-shrink:0">${esc(fmtDate(a.uploaded_at || a.created_at))}</div>
          </div>`;
        }).join('') + '</div>';
      attsListEl.querySelectorAll('._bk-att-row').forEach(r => {
        r.addEventListener('click', () => {
          const p = r.dataset.path;
          if (p) openAttachmentByPath(p, r.dataset.name);
        });
      });
    }

    async function uploadFiles(files) {
      if (!files || !files.length) return;
      if (!window.CompanyAttachments || typeof window.CompanyAttachments.upload !== 'function') {
        alert('Skjalavistun ekki tilbúin (patch-111 vantar). Endurhladið síðunni og reynið aftur.');
        return;
      }
      // Visual feedback while uploading
      const origDropHTML = dropZone.innerHTML;
      dropZone.innerHTML = '<div style="color:#2563eb;font-weight:600">⏳ Hleður upp ' + files.length + ' skrá' + (files.length === 1 ? '' : 'r') + '…</div>';
      let okCount = 0;
      for (const f of files) {
        if (f.size > 25 * 1024 * 1024) {
          alert('Skráin „' + f.name + '" er stærri en 25 MB. Sleppi henni.');
          continue;
        }
        try {
          await window.CompanyAttachments.upload(coId, f);
          okCount++;
        } catch (e) {
          alert('Vista mistókst (' + f.name + '): ' + (e && e.message ? e.message : String(e)));
        }
      }
      dropZone.innerHTML = origDropHTML;
      // Re-read fresh list
      const fresh = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(attsKey)) || {};
      renderAtts(fresh[String(coId)] || []);
      if (okCount > 0 && window.Toast && Toast.show) Toast.show('✓ ' + okCount + ' skjöl vistuð');
    }

    upBtn.addEventListener('click', () => fileInp.click());
    dropZone.addEventListener('click', () => fileInp.click());
    fileInp.addEventListener('change', e => {
      const files = Array.from(e.target.files || []);
      uploadFiles(files);
      fileInp.value = ''; // reset so same file can be re-picked
    });
    ['dragover', 'dragenter'].forEach(ev => {
      dropZone.addEventListener(ev, e => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.style.borderColor = '#2563eb';
        dropZone.style.background = '#dbeafe';
        dropZone.style.color = '#1e40af';
      });
    });
    ['dragleave', 'dragend'].forEach(ev => {
      dropZone.addEventListener(ev, () => {
        dropZone.style.borderColor = '#cbd5e1';
        dropZone.style.background = '#f8fafc';
        dropZone.style.color = '#64748b';
      });
    });
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.style.borderColor = '#cbd5e1';
      dropZone.style.background = '#f8fafc';
      dropZone.style.color = '#64748b';
      const files = Array.from(e.dataTransfer && e.dataTransfer.files || []);
      uploadFiles(files);
    });

    // Initial render so the click-to-open handler is attached to existing rows
    renderAtts(atts);
  }

  // ── Template picker for the brunakerfi flow ──────────────────────────────
  // Before opening a contract / inspection form, show a picker listing every
  // matching template (user-added + seeds). The user can:
  //   • Pick a template → opens it with company info pre-filled
  //   • Click "✏️ Breyta" on a row → opens the template editor (modify + save
  //     under any name they want)
  //   • Click "+ Stofna nýtt sniðmát" → opens an empty editor
  // The matcher accepts both -a and -i endings ("Brunakerfa" / "Brunakerfi").
  function findMatchingTemplates(matchPatterns) {
    if (!window.DocumentTemplates || !DocumentTemplates.list) return [];
    let templates;
    try { templates = DocumentTemplates.list() || []; } catch (_) { return []; }
    const out = [];
    const seen = new Set();
    for (const t of templates) {
      const name = t.name || '';
      if (matchPatterns.some(p => p.test(name)) && !seen.has(t.id)) {
        seen.add(t.id);
        out.push(t);
      }
    }
    // User-added first (more recent + customized), seeds at the bottom
    out.sort((a, b) => (a._seed ? 1 : 0) - (b._seed ? 1 : 0));
    return out;
  }

  function openTemplatePicker(opts) {
    const { title, matchPatterns, seedFallbackId, onPick } = opts;
    const matches = findMatchingTemplates(matchPatterns);
    // No matches at all → just fall through to the seed
    if (!matches.length) { onPick(seedFallbackId); return; }
    // Exactly one match → skip the picker, open directly
    if (matches.length === 1) { onPick(matches[0].id); return; }

    document.getElementById('_bk-tplpick')?.remove();
    const dlg = document.createElement('div');
    dlg.id = '_bk-tplpick';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100070;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
    dlg.innerHTML = `
      <div style="background:#fff;border-radius:12px;box-shadow:0 24px 60px rgba(0,0,0,0.35);width:min(560px,calc(100vw - 24px));max-height:80vh;display:flex;flex-direction:column;overflow:hidden">
        <div style="padding:14px 20px;background:#dc2626;color:#fff;display:flex;justify-content:space-between;align-items:center;flex-shrink:0">
          <h3 style="margin:0;font-size:15px;font-weight:700">${esc(title)}</h3>
          <button id="_bk-tp-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;width:30px;height:30px;border-radius:6px;cursor:pointer;font-size:15px;line-height:1">✕</button>
        </div>
        <div style="padding:10px 16px 8px;font-size:12px;color:#64748b;flex-shrink:0">Veldu sniðmát:</div>
        <div id="_bk-tp-list" style="flex:1;overflow-y:auto;padding:4px 14px 12px">
          ${matches.map((t, i) => `
            <div class="_bk-tp-row" data-id="${esc(t.id)}" style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;background:#fff;cursor:pointer;gap:10px;transition:all .12s" onmouseover="this.style.borderColor='#dc2626';this.style.background='#fef2f2'" onmouseout="this.style.borderColor='#e2e8f0';this.style.background='#fff'">
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;color:#0f172a;font-size:13.5px">${esc(t.name || '—')}</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px">
                  ${t._seed ? '<span style="background:#e0f2fe;color:#075985;padding:1px 7px;border-radius:99px;font-weight:600">Forsniðið</span>' : '<span style="background:#dcfce7;color:#166534;padding:1px 7px;border-radius:99px;font-weight:600">Mín útgáfa</span>'}
                  ${t.type ? ' · ' + esc(t.type) : ''}
                </div>
              </div>
              <div style="display:flex;gap:5px;flex-shrink:0">
                <button class="_bk-tp-edit" type="button" data-id="${esc(t.id)}" title="Breyta sniðmáti" style="padding:5px 9px;background:#fff;border:1px solid #cbd5e1;color:#475569;border-radius:5px;cursor:pointer;font:inherit;font-size:11px">✏️ Breyta</button>
                <button class="_bk-tp-use" type="button" data-id="${esc(t.id)}" style="padding:5px 11px;background:#dc2626;color:#fff;border:none;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;font-weight:700">Opna ›</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="padding:11px 18px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-shrink:0;background:#f8fafc">
          <button id="_bk-tp-new" type="button" style="padding:8px 14px;background:#16a34a;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700">+ Stofna nýtt sniðmát</button>
          <button id="_bk-tp-cancel" type="button" style="padding:8px 14px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:12.5px;color:#475569">Hætta við</button>
        </div>
      </div>`;
    document.body.appendChild(dlg);
    function close() { dlg.remove(); }
    dlg.querySelector('#_bk-tp-x').addEventListener('click', close);
    dlg.querySelector('#_bk-tp-cancel').addEventListener('click', close);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });

    // Row click anywhere outside the inner buttons → use template
    dlg.querySelectorAll('._bk-tp-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('._bk-tp-edit') || e.target.closest('._bk-tp-use')) return;
        close();
        onPick(row.dataset.id);
      });
    });
    dlg.querySelectorAll('._bk-tp-use').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        close();
        onPick(btn.dataset.id);
      });
    });
    dlg.querySelectorAll('._bk-tp-edit').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        close();
        const id = btn.dataset.id;
        const t = matches.find(x => x.id === id);
        if (!window.DocumentTemplates) { alert('Sniðmátaritill ekki tilbúinn.'); return; }
        // Seeds can't be edited directly — clone first, then edit the copy.
        // (Patch 94 alerts otherwise. cloneSeed handles the full flow.)
        if (t && t._seed && DocumentTemplates.cloneSeed) {
          try { await DocumentTemplates.cloneSeed(id); }
          catch (_) { alert('Villa við að afrita sniðmát.'); }
        } else if (DocumentTemplates.edit) {
          DocumentTemplates.edit(id);
        }
      });
    });
    dlg.querySelector('#_bk-tp-new').addEventListener('click', () => {
      close();
      if (window.DocumentTemplates && DocumentTemplates.edit) {
        // Pass no id = open editor in "create new" mode
        DocumentTemplates.edit(null);
      } else {
        alert('Sniðmátaritill ekki tilbúinn.');
      }
    });
  }

  function newReport(coId) {
    const co = _cache.companies.find(c => c.id === coId);
    if (!co) return;
    openTemplatePicker({
      title: '📋 Veldu ársskoðunar-sniðmát',
      matchPatterns: [/ársskoðun.*brunakerf/i, /arsskodun.*brunakerf/i, /skoðun.*brunakerf/i],
      seedFallbackId: 'seed_arsskodun_brunakerfa',
      onPick: (id) => openTemplateWithPrefill(id, co)
    });
  }
  function newContract(coId) {
    const co = _cache.companies.find(c => c.id === coId);
    if (!co) return;
    openTemplatePicker({
      title: '📜 Veldu þjónustusamnings-sniðmát',
      matchPatterns: [/þjónustusamningur.*brunakerf/i, /thjonustusamningur.*brunakerf/i, /samningur.*brunakerf/i],
      seedFallbackId: 'seed_thjonustusamningur_brunakerfi',
      onPick: (id) => openTemplateWithPrefill(id, co)
    });
  }
  function openTemplateWithPrefill(templateId, co) {
    if (!window.DocumentTemplates || !DocumentTemplates.open) {
      alert('Skjalasniðmát ekki tilbúin (patch 94).');
      return;
    }
    DocumentTemplates.open(templateId);
    // Auto-fill known fields after the form has rendered
    setTimeout(() => {
      const form = document.querySelector('#_dt-form-modal #_dt-form');
      if (!form) return;
      const setField = (key, val) => {
        const inp = form.querySelector('[data-field="' + key + '"]');
        if (inp && val != null) {
          inp.value = String(val);
          inp.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };
      setField('vidskiptavinur_nafn', co.nafn);
      setField('verkkaupi', co.nafn);
      setField('kennitala', co.kennitala);
      setField('heimilisfang', co.heimilisfang);
      setField('simi', co.simi);
    }, 200);
  }

  // ── Share link ───────────────────────────────────────────────────────────
  // 2026-05-15: Use BOTH ?tab=brunakerfi AND #view-brunakerfi in the URL.
  // The hash is what patch 88 (apply-utlit-almennt) respects when deciding
  // whether to honor the URL vs. fall back to AppSettings.starting_view.
  // Without the hash, the default 'sala' wins and the user lands on the
  // wrong page.
  function shareLink() {
    const url = window.location.origin + window.location.pathname + '?tab=brunakerfi#view-brunakerfi';
    try {
      navigator.clipboard.writeText(url).then(() => {
        const toast = window.Toast && Toast.show;
        if (toast) Toast.show('✓ Tengill afritaður á clipboard');
        else alert('Tengill: ' + url);
      });
    } catch (_) { alert('Tengill: ' + url); }
  }

  // ── Deep link on load ────────────────────────────────────────────────────
  function checkDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const wantBk = params.get('tab') === 'brunakerfi' || /view-brunakerfi/i.test(location.hash || '');
    if (!wantBk) return;
    // Aggressive re-assert: patch 88 + sala.js may try to flip back to 'sala'
    // during boot. We switch immediately when App is ready and again at
    // +800ms / +2000ms to win any race.
    function trySwitch() {
      if (window.App && typeof App.switchView === 'function' && document.getElementById('view-brunakerfi')) {
        try { App.switchView('brunakerfi'); } catch (_) {}
        return true;
      }
      return false;
    }
    const tries = setInterval(() => { if (trySwitch()) clearInterval(tries); }, 150);
    setTimeout(() => clearInterval(tries), 6000);
    setTimeout(trySwitch, 800);
    setTimeout(trySwitch, 2000);
    setTimeout(() => {
      // Ensure we end up on brunakerfi even if a later setting tried to revert
      const active = document.querySelector('.view.active');
      if (active && active.id !== 'view-brunakerfi') trySwitch();
      const coId = params.get('co');
      if (coId) setTimeout(() => openCompanyDetail(+coId), 500);
    }, 2500);
  }

  // ── Hook view-shown to render when user opens this tab ────────────────────
  document.addEventListener('view-shown', e => {
    const name = e && e.detail && (e.detail.name || e.detail);
    if (name === 'brunakerfi') show();
  });

  // ── Boot ─────────────────────────────────────────────────────────────────
  injectSidebar();
  setTimeout(injectSidebar, 1000);
  checkDeepLink();

  window.Brunakerfi = { show, openCompanyDetail, newReport, newContract };
  console.log('[patch-147] brunakerfi installed — sidebar entry + view + deep-link');
})();
/* === END BRUNAKERFISÞJÓNUSTA === */
