/* Inline-editable Tegund (type) column on the Fyrirtækjaþjónusta unit list.
 *
 * Companion to patch 132 (editable Stærð). Turns the read-only "Tegund" cell
 * in each tæki row into a <select> so mislabeled units — e.g. the 167 rows
 * typed "Óþekkt" or a stray "ABC" — can be corrected in place. Saves straight
 * to uttaeki.type, updates DB.cache, and triggers the cost recompute (patch
 * 129) so the total + the auto-derived ársskoðun revenue stay in sync.
 *
 * The current value is always kept as an option (even if non-standard) so an
 * unusual existing label is never silently lost when the dropdown renders.
 */
(() => {
  if (window.__unitTypeColumnInstalled) return;
  window.__unitTypeColumnInstalled = true;

  // Canonical service types. Order = most common first.
  const TYPES = ['Léttvatn', 'ABC Duft', 'Duft', 'CO₂', 'Brunaslanga', 'Slönguskápur', 'Reykskynjari', 'Eldvarnateppi'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function findUnitTable() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const tables = main.querySelectorAll('table.dtbl, table');
    for (const t of tables) {
      const ths = t.querySelectorAll('thead th');
      if (!ths.length) continue;
      let hasSerial = false, hasType = false;
      ths.forEach(th => {
        const tx = th.textContent.trim().toLowerCase();
        if (tx.includes('raðnúmer') || tx.includes('radnumer')) hasSerial = true;
        if (tx === 'tegund') hasType = true;
      });
      if (hasSerial && hasType) return t;
    }
    return null;
  }

  function getUnitIdFromRow(tr) {
    const btns = tr.querySelectorAll('button[onclick]');
    for (const b of btns) {
      const m = b.getAttribute('onclick').match(/DB\.getUnit\((\d+)\)/);
      if (m) return +m[1];
    }
    return null;
  }

  function getUnitType(unitId) {
    const cache = (window.DB && DB.cache && DB.cache.units) || [];
    const u = cache.find(x => x.id === unitId);
    return u ? (u.type || '') : '';
  }

  async function saveType(unitId, newType) {
    const sb = window.DB && window.DB.sb;
    if (!sb) return false;
    const { error } = await sb.from('uttaeki').update({ type: newType }).eq('id', unitId);
    if (error) {
      console.warn('[unit-type-column] save error:', error.message);
      return false;
    }
    const cache = (window.DB && DB.cache && DB.cache.units) || [];
    const u = cache.find(x => x.id === unitId);
    if (u) u.type = newType;
    if (typeof window.recomputeCompanyTotalCost === 'function') {
      window.recomputeCompanyTotalCost();
    }
    return true;
  }

  function optionsHtml(cur) {
    const has = TYPES.some(t => t === cur);
    let html = '';
    if (cur && !has) {
      // Preserve the existing (non-standard) value as the selected option.
      html += '<option value="' + esc(cur) + '" selected>' + esc(cur) + ' (núverandi)</option>';
    }
    TYPES.forEach(t => {
      html += '<option value="' + esc(t) + '"' + (t === cur ? ' selected' : '') + '>' + esc(t) + '</option>';
    });
    return html;
  }

  function injectEditors() {
    const table = findUnitTable();
    if (!table) return;

    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;
    const ths = Array.from(headerRow.children);
    let typeIdx = -1;
    ths.forEach((th, i) => {
      if (th.textContent.trim().toLowerCase() === 'tegund') typeIdx = i;
    });
    if (typeIdx === -1) return;

    table.querySelectorAll('tbody tr').forEach(tr => {
      const cells = tr.children;
      if (typeIdx >= cells.length) return;
      const cell = cells[typeIdx];
      if (!cell || cell.dataset._utcInjected === '1') return;
      const unitId = getUnitIdFromRow(tr);
      if (!unitId) return;
      cell.dataset._utcInjected = '1';
      const cur = getUnitType(unitId);
      cell.innerHTML =
        '<select class="_utc-type" data-uid="' + unitId + '" ' +
        'style="max-width:140px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:5px;font:inherit;font-size:12px;background:#fff;cursor:pointer">' +
        optionsHtml(cur) + '</select>';
    });

    if (!table.dataset._utcWired) {
      table.dataset._utcWired = '1';
      table.addEventListener('change', e => {
        const sel = e.target.closest('._utc-type');
        if (!sel) return;
        const unitId = +sel.dataset.uid;
        const newType = sel.value;
        if (newType === (sel.dataset._lastSaved || getUnitType(unitId))) return;
        sel.dataset._lastSaved = newType;
        sel.style.background = '#fef9c3';
        saveType(unitId, newType).then(ok => {
          sel.style.background = ok ? '#dcfce7' : '#fee2e2';
          setTimeout(() => { sel.style.background = '#fff'; }, 700);
        });
      });
    }
  }

  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(injectEditors, 280);
    }).observe(main, { childList: true, subtree: true });
    injectEditors();
  }
  attach();

  console.log('[unit-type-column] installed');
})();
