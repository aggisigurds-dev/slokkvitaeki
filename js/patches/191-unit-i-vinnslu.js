/* === TÆKI: "Í VINNSLU" tri-state per unit + fela Staða-dropdown ===
 *
 * Companion to patch 131 (the "Áætlað" planning picker). Splits the tæki
 * table on the company-detail page into two zones:
 *
 *   ÁÆTLUN     — patch 131's "Áætlað" dropdown (the plan / cost forecast)
 *   Í VINNSLU  — what was ACTUALLY done, filled in on the visit
 *
 * Per unit, a tri-state ✓ button (one click cycles):
 *   0  grey ✓     → not done; Í vinnslu box empty (e.g. need to check the tæki)
 *   1  green ✓    → done as planned; box AUTO-FILLS from Áætlað (quick path)
 *   2  ✎ Breyta   → box becomes editable so you can set a different actual
 *                   (the actual OVERRIDES the plan)
 *   → back to grey (box clears)
 *
 * The redundant per-row "Staða" (Active) dropdown is hidden — it was noise.
 *
 * State rides in the same localStorage trip key as patch 131
 * (slokk_trip_<coId>) under `.actual[unitId] = { done, value }`, so the two
 * pickers stay in one place. Exposed on window.UnitIVinnslu for the
 * billing / ÞjónustuVerkstæði wiring (next slice).
 */
(() => {
  if (window.__unitIVinnsluInstalled) return;
  window.__unitIVinnsluInstalled = true;

  // Same outcome vocabulary as patch 131 so Áætlað ↔ Í vinnslu line up.
  const CHOICES = [
    { v: 'hledsla',  label: 'Hleðsla',  color: '#166534', bg: '#dcfce7' },
    { v: 'yfirferd', label: 'Yfirferð', color: '#1e40af', bg: '#dbeafe' },
    { v: 'nyitt',    label: 'Nýtt',     color: '#6b21a8', bg: '#f3e8ff' },
    { v: 'none',     label: 'Sleppa',   color: '#64748b', bg: '#f1f5f9' }
  ];
  const choiceOf = v => CHOICES.find(c => c.v === v) || CHOICES[1];

  function getCompanyId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    // 2026-06: stable data-co-id first (see patch 129).
    const idEl = main.querySelector('[data-co-id]:not(._cat-section)');
    if (idEl) { const v = idEl.getAttribute('data-co-id'); if (v && /^\d+$/.test(v)) return +v; }
    const editBtn = main.querySelector('button._co-edit-anchor[onclick*="Companies.openEdit"]') || main.querySelector('button[onclick*="Companies.openEdit"]');
    if (!editBtn) return null;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)/);
    return m ? +m[1] : null;
  }

  function tripKey(coId) { return 'slokk_trip_' + coId; }
  function loadTrip(coId) { try { return JSON.parse(localStorage.getItem(tripKey(coId)) || '{}'); } catch (_) { return {}; } }
  function saveTrip(coId, st) { try { localStorage.setItem(tripKey(coId), JSON.stringify(st)); } catch (_) {} }

  function getActual(coId, unitId) {
    const st = loadTrip(coId);
    return (st.actual && st.actual[unitId]) || { done: 0, value: null };
  }
  function setActual(coId, unitId, a) {
    const st = loadTrip(coId);
    st.actual = st.actual || {};
    st.actual[unitId] = a;
    saveTrip(coId, st);
  }
  // The planned choice from patch 131 (auto-fill source).
  function plannedChoice(coId, unitId, typeText) {
    if (window.UnitServicePicker && UnitServicePicker.getChoice) return UnitServicePicker.getChoice(coId, unitId, typeText);
    const st = loadTrip(coId);
    return (st.units && st.units[unitId]) || 'yfirferd';
  }

  // ── cell renderer ──────────────────────────────────────────────────────────
  function cellHtml(coId, unitId, typeText) {
    const a = getActual(coId, unitId);
    const btnBase = 'width:26px;height:26px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;flex:none;line-height:1';
    let btn, box;
    if (a.done === 1) {
      const c = choiceOf(a.value);
      btn = `<button class="_ivi-chk" data-uid="${unitId}" title="Smelltu til að breyta raunverki" style="${btnBase};border:1px solid #15803d;background:#16a34a;color:#fff">✓</button>`;
      box = `<span class="_ivi-box" style="padding:2px 8px;border-radius:5px;background:${c.bg};color:${c.color};font-size:11px;font-weight:700">${c.label}</span>`;
    } else if (a.done === 2) {
      const cur = a.value || plannedChoice(coId, unitId, typeText);
      const opts = CHOICES.map(c => `<option value="${c.v}"${c.v === cur ? ' selected' : ''}>${c.label}</option>`).join('');
      btn = `<button class="_ivi-chk" data-uid="${unitId}" title="Smelltu til að hreinsa" style="${btnBase};border:1px solid #d97706;background:#fef3c7;color:#92400e">✎</button>`;
      box = `<select class="_ivi-sel" data-uid="${unitId}" style="padding:2px 6px;border:1px solid #fcd34d;background:#fffbeb;color:#92400e;border-radius:5px;font:inherit;font-size:11px;font-weight:600;cursor:pointer">${opts}</select>`;
    } else {
      btn = `<button class="_ivi-chk" data-uid="${unitId}" title="Merkja sem búið" style="${btnBase};border:1px dashed #cbd5e1;background:#fff;color:#cbd5e1">✓</button>`;
      box = `<span class="_ivi-box" style="color:#cbd5e1;font-size:11px">—</span>`;
    }
    return `<div style="display:flex;align-items:center;gap:7px">${btn}${box}</div>`;
  }

  function findUnitTable() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    for (const t of main.querySelectorAll('table.dtbl, table')) {
      const ths = t.querySelectorAll('thead th');
      if (!ths.length) continue;
      let serial = false, status = false;
      ths.forEach(th => {
        const tx = th.textContent.trim().toLowerCase();
        if (tx.includes('raðnúmer') || tx.includes('radnumer')) serial = true;
        if (tx === 'staða' || tx === 'stada' || tx === 'status') status = true;
      });
      if (serial && status) return t;
    }
    return null;
  }

  function colIndex(ths, names) {
    for (let i = 0; i < ths.length; i++) {
      const tx = ths[i].textContent.trim().toLowerCase();
      if (names.includes(tx)) return i;
    }
    return -1;
  }

  function inject() {
    const coId = getCompanyId();
    if (!coId) return;
    const table = findUnitTable();
    if (!table) return;
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;
    let ths = Array.from(headerRow.children);

    // Need patch 131's "Áætlað" column to exist first — we sit right after it.
    const planIdx = colIndex(ths, ['áætlað', 'aaetlad', 'aætlað']);
    if (planIdx === -1) return;            // 131 not injected yet — retry next tick
    if (table.dataset._iviInjected === '1') { hideStada(table); return; }
    table.dataset._iviInjected = '1';

    // 1) header "Í vinnslu" right after Áætlað
    const th = document.createElement('th');
    th.textContent = 'Í vinnslu';
    th.dataset._iviTh = '1';
    th.style.cssText = 'width:150px;background:#f0fdf4';
    if (planIdx + 1 < ths.length) headerRow.insertBefore(th, headerRow.children[planIdx + 1]);
    else headerRow.appendChild(th);

    // tint the Áætlað header so the two zones read as a split
    ths[planIdx].style.background = '#eff6ff';

    // 2) one cell per row, after the Áætlað cell
    const tegundIdx = colIndex(ths, ['tegund', 'type']);
    table.querySelectorAll('tbody tr').forEach(tr => {
      const cells = tr.children;
      if (cells.length <= planIdx) return;
      let unitId = null;
      for (const b of tr.querySelectorAll('button[onclick]')) {
        const m = b.getAttribute('onclick').match(/DB\.getUnit\((\d+)\)/);
        if (m) { unitId = +m[1]; break; }
      }
      if (!unitId) return;
      const typeText = tegundIdx >= 0 ? (cells[tegundIdx]?.textContent || '') : '';
      const td = document.createElement('td');
      td.dataset._iviTd = '1';
      td.style.cssText = 'padding:2px 6px';
      td.innerHTML = cellHtml(coId, unitId, typeText);
      td.dataset.uid = unitId;
      td.dataset.type = typeText;
      if (planIdx + 1 < cells.length) tr.insertBefore(td, cells[planIdx + 1]);
      else tr.appendChild(td);
    });

    hideStada(table);

    // 3) interactions (delegated, bound once)
    if (!table.dataset._iviWired) {
      table.dataset._iviWired = '1';
      table.addEventListener('click', e => {
        const btn = e.target.closest('._ivi-chk');
        if (!btn) return;
        const uid = +btn.dataset.uid;
        const td = btn.closest('td[data-uid]');
        const typeText = td ? td.dataset.type : '';
        const a = getActual(coId, uid);
        let next;
        if (a.done === 0) next = { done: 1, value: plannedChoice(coId, uid, typeText) };   // grey → green (autofill)
        else if (a.done === 1) next = { done: 2, value: a.value };                          // green → breyta
        else next = { done: 0, value: null };                                              // breyta → grey (clear)
        setActual(coId, uid, next);
        if (td) td.innerHTML = cellHtml(coId, uid, typeText);
        notifyChange();
        if (next.done > 0) ensureCompanyInProgress(coId);
      });
      table.addEventListener('change', e => {
        const sel = e.target.closest('._ivi-sel');
        if (!sel) return;
        const uid = +sel.dataset.uid;
        const td = sel.closest('td[data-uid]');
        setActual(coId, uid, { done: 2, value: sel.value });
        if (td) td.innerHTML = cellHtml(coId, uid, td.dataset.type);
        notifyChange();
        ensureCompanyInProgress(coId);
      });
    }
  }

  // Hide redundant columns — "Staða" (Active) + "Staðsetning" (just repeats the
  // company address) — header + every row cell, so the table breathes.
  function hideCol(table, ths, names) {
    const idx = colIndex(ths, names);
    if (idx === -1) return;
    if (ths[idx]) ths[idx].style.display = 'none';
    table.querySelectorAll('tbody tr').forEach(tr => { if (tr.children[idx]) tr.children[idx].style.display = 'none'; });
  }
  function hideStada(table) {
    const ths = Array.from(table.querySelectorAll('thead tr th'));
    hideCol(table, ths, ['staða', 'stada', 'status']);
    hideCol(table, ths, ['staðsetning', 'stadsetning', 'location']);
  }

  function notifyChange() {
    // let the cost panel / future billing know actuals changed
    try { document.dispatchEvent(new CustomEvent('unit-ivinnslu-changed')); } catch (_) {}
    if (typeof window.recomputeCompanyTotalCost === 'function') { try { window.recomputeCompanyTotalCost(); } catch (_) {} }
  }

  // Marking a unit Í vinnslu flips the whole company to the blue "Í vinnslu"
  // status (patch 153 flag) so it shows up on the 🔵 Í vinnslu page (192) to
  // finish skýrsla/reikningur. One coherent pipeline — no separate board.
  async function ensureCompanyInProgress(coId) {
    try {
      if (!window.AppSettings || !AppSettings.save || !AppSettings.path) return;
      const KEY = 'arsskodun_customers';
      const cy = new Date().getFullYear();
      const map = AppSettings.path(KEY) || {};
      const e = Object.assign({}, map[String(coId)] || {});
      if (+e.last_year_inspected === cy || +e.field_inspected_year === cy) return; // already done / blue
      e.field_inspected_year = cy;
      // AÐEINS þetta fyrirtæki — heil-varpan þurrkaði út stöðu hinna 807.
      await AppSettings.save({ [KEY]: { [String(coId)]: { field_inspected_year: cy } } });
    } catch (_) {}
  }

  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    let t = 0;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(inject, 80); }).observe(main, { childList: true, subtree: true });
    inject();
  }
  attach();

  window.UnitIVinnslu = {
    getActual,                                   // {done, value} — done 1|2 = completed
    isDone: (coId, uid) => getActual(coId, uid).done > 0,
    outcomeFor: (coId, uid, typeText) => {       // actual overrides plan when done
      const a = getActual(coId, uid);
      return a.done > 0 ? (a.value || plannedChoice(coId, uid, typeText)) : null;
    }
  };
  console.log('[patch-191] tæki Í vinnslu (tri-state) installed');
})();
/* === END TÆKI Í VINNSLU === */
