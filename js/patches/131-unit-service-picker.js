/* Per-unit "Áætlað" picker í tæki-töflu á fyrirtækisspjaldi.
 *
 * Bætir dálk við hliðina á "Staða" í tæki-töflu á Companies.openDetail.
 * Notandi getur fyrir hvert tæki valið:
 *   • Hleðsla    — full hleðsla (sjálfgefið)
 *   • Yfirferð   — bara skoðun
 *   • Sleppa     — fer ekki í þessari ferð
 *
 * Vistast í localStorage[`slokk_trip_<coId>`].units[unitId] og patch 129
 * (Heildarkostnaður) reads það til að reikna réttan kostnað.
 */
(() => {
  if (window.__unitServicePickerInstalled) return;
  window.__unitServicePickerInstalled = true;

  const CHOICE_DEFAULT = 'hledsla';
  const CHOICES = [
    { v: 'hledsla',  label: 'Hleðsla',  color: '#166534', bg: '#dcfce7' },
    { v: 'yfirferd', label: 'Yfirferð', color: '#1e40af', bg: '#dbeafe' },
    { v: 'none',     label: 'Sleppa',   color: '#64748b', bg: '#f1f5f9' }
  ];

  function getCompanyId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const editBtn = main.querySelector('button[onclick*="Companies.openEdit"]');
    if (!editBtn) return null;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)/);
    return m ? +m[1] : null;
  }

  function tripStateKey(coId) { return 'slokk_trip_' + coId; }
  function loadTripState(coId) {
    try { return JSON.parse(localStorage.getItem(tripStateKey(coId)) || '{}'); }
    catch (_) { return {}; }
  }
  function saveTripState(coId, state) {
    try { localStorage.setItem(tripStateKey(coId), JSON.stringify(state)); } catch (_) {}
  }

  function getUnitChoice(coId, unitId) {
    const st = loadTripState(coId);
    return (st.units && st.units[unitId]) || CHOICE_DEFAULT;
  }
  function setUnitChoice(coId, unitId, value) {
    const st = loadTripState(coId);
    st.units = st.units || {};
    st.units[unitId] = value;
    saveTripState(coId, st);
  }

  function selectHtml(coId, unitId) {
    const cur = getUnitChoice(coId, unitId);
    const curDef = CHOICES.find(c => c.v === cur) || CHOICES[0];
    const opts = CHOICES.map(c =>
      '<option value="' + c.v + '"' + (c.v === cur ? ' selected' : '') + '>' + c.label + '</option>'
    ).join('');
    return '<select class="_usp-sel" data-uid="' + unitId + '" ' +
      'style="padding:3px 6px;border:1px solid ' + curDef.bg + ';background:' + curDef.bg + ';color:' + curDef.color + ';border-radius:5px;font:inherit;font-size:11px;font-weight:600;cursor:pointer">' + opts + '</select>';
  }

  // Find the unit table in the company detail page.
  function findUnitTable() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    // The table has headers including 'Raðnúmer' and 'Staða'.
    const tables = main.querySelectorAll('table.dtbl, table');
    for (const t of tables) {
      const ths = t.querySelectorAll('thead th');
      if (!ths.length) continue;
      let hasSerial = false, hasStatus = false;
      ths.forEach(th => {
        const tx = th.textContent.trim().toLowerCase();
        if (tx.includes('raðnúmer') || tx.includes('radnumer')) hasSerial = true;
        if (tx === 'staða' || tx === 'stada' || tx === 'status') hasStatus = true;
      });
      if (hasSerial && hasStatus) return t;
    }
    return null;
  }

  function injectColumn() {
    const coId = getCompanyId();
    if (!coId) return;
    const table = findUnitTable();
    if (!table) return;
    if (table.dataset._uspInjected === '1') return;
    table.dataset._uspInjected = '1';

    // 1. Add header column after "Staða".
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;
    const ths = Array.from(headerRow.children);
    let statusIdx = -1;
    ths.forEach((th, i) => {
      const tx = th.textContent.trim().toLowerCase();
      if (tx === 'staða' || tx === 'stada' || tx === 'status') statusIdx = i;
    });
    if (statusIdx === -1) return;
    const newTh = document.createElement('th');
    newTh.textContent = 'Áætlað';
    newTh.style.cssText = 'width:110px';
    if (statusIdx + 1 < ths.length) headerRow.insertBefore(newTh, ths[statusIdx + 1]);
    else headerRow.appendChild(newTh);

    // 2. For each row, look up unit_id from the action buttons (Field.openInspect(DB.getUnit(<id>))).
    const bodyRows = table.querySelectorAll('tbody tr');
    bodyRows.forEach(tr => {
      const cells = tr.children;
      if (cells.length <= statusIdx) return;
      // Extract unit id from any onclick that calls DB.getUnit(<id>)
      let unitId = null;
      const actionBtns = tr.querySelectorAll('button[onclick]');
      for (const b of actionBtns) {
        const m = b.getAttribute('onclick').match(/DB\.getUnit\((\d+)\)/);
        if (m) { unitId = +m[1]; break; }
      }
      if (!unitId) return;
      const td = document.createElement('td');
      td.innerHTML = selectHtml(coId, unitId);
      td.style.cssText = 'padding:6px 8px';
      if (statusIdx + 1 < cells.length) tr.insertBefore(td, cells[statusIdx + 1]);
      else tr.appendChild(td);
    });

    // 3. Wire changes — update state + ask patch 129 to recompute.
    table.addEventListener('change', e => {
      const sel = e.target.closest('._usp-sel');
      if (!sel) return;
      const unitId = +sel.dataset.uid;
      const value = sel.value;
      setUnitChoice(coId, unitId, value);
      const cd = CHOICES.find(c => c.v === value) || CHOICES[0];
      sel.style.background = cd.bg;
      sel.style.color = cd.color;
      sel.style.borderColor = cd.bg;
      if (typeof window.recomputeCompanyTotalCost === 'function') {
        window.recomputeCompanyTotalCost();
      }
    });
  }

  // Watch companies-main for the detail page rendering.
  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(injectColumn, 250);
    }).observe(main, { childList: true, subtree: true });
    injectColumn();
  }
  attach();

  // Expose so patch 129 can read choices.
  window.UnitServicePicker = {
    getChoice: getUnitChoice,
    setChoice: setUnitChoice
  };

  console.log('[unit-service-picker] installed');
})();
