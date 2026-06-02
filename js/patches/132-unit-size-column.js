/* Inline-editable Stærð column in unit list on Fyrirtækjaþjónusta detail.
 *
 * Bætir „Stærð" dálki á eftir „Tegund" í tæki-töflu á fyrirtækisspjaldi.
 * Notandi getur smellt á gildið og breytt á flugi — vistast strax í
 * uttaeki.size og kallar á patch 129 recompute svo heildarkostnaður
 * uppfærist.
 *
 * Smart datalist: sýnir algeng gildi (2 kg, 5 kg, 6 kg, 9 kg, 12 kg,
 * 6 L, 30 m) sem suggestions svo notandi geti staðlað eldri gögn.
 */
(() => {
  if (window.__unitSizeColumnInstalled) return;
  window.__unitSizeColumnInstalled = true;

  // Standard extinguisher / hose sizes shown in the dropdown. A real <select>
  // (not an <input list=datalist>) so picking a value fires a reliable
  // 'change' event — the old datalist often didn't emit one on mobile, which
  // left sizes like "Óþekkt" stuck because the edit never saved.
  const SIZE_OPTIONS = ['2 kg', '5 kg', '6 kg', '9 kg', '12 kg', '6 L', '30 m'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function buildSizeSelect(unitId, cur) {
    const c = cur || '';
    let opts = '<option value="">—</option>';
    // Preserve any non-standard current value (e.g. "6-12 kg", "6 ltr") so we
    // never silently clobber it; it shows selected at the top.
    if (c && SIZE_OPTIONS.indexOf(c) === -1) {
      opts += '<option value="' + esc(c) + '" selected>' + esc(c) + ' (núv.)</option>';
    }
    SIZE_OPTIONS.forEach(s => {
      opts += '<option value="' + s + '"' + (s === c ? ' selected' : '') + '>' + s + '</option>';
    });
    return '<select class="_usc-size" data-uid="' + unitId + '" ' +
      'style="width:90px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:5px;' +
      'font:inherit;font-size:12px;background:#fff;cursor:pointer">' + opts + '</select>';
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

  function getUnitSize(unitId) {
    const cache = (window.DB && DB.cache && DB.cache.units) || [];
    const u = cache.find(x => x.id === unitId);
    return u ? (u.size || '') : '';
  }

  async function saveSize(unitId, newSize) {
    const sb = window.DB && window.DB.sb;
    if (!sb) return false;
    const { error } = await sb.from('uttaeki').update({ size: newSize }).eq('id', unitId);
    if (error) {
      console.warn('[unit-size-column] save error:', error.message);
      return false;
    }
    // Update local cache so other patches see the new value immediately.
    const cache = (window.DB && DB.cache && DB.cache.units) || [];
    const u = cache.find(x => x.id === unitId);
    if (u) u.size = newSize;
    // Trigger recompute of the total cost panel.
    if (typeof window.recomputeCompanyTotalCost === 'function') {
      window.recomputeCompanyTotalCost();
    }
    return true;
  }

  function injectColumn() {
    const table = findUnitTable();
    if (!table) return;
    if (table.dataset._uscInjected === '1') return;
    table.dataset._uscInjected = '1';

    // Find Tegund column index.
    const headerRow = table.querySelector('thead tr');
    if (!headerRow) return;
    const ths = Array.from(headerRow.children);
    let typeIdx = -1;
    ths.forEach((th, i) => {
      if (th.textContent.trim().toLowerCase() === 'tegund') typeIdx = i;
    });
    if (typeIdx === -1) return;

    // Insert "Stærð" header right after Tegund.
    const newTh = document.createElement('th');
    newTh.textContent = 'Stærð';
    newTh.style.cssText = 'width:90px';
    if (typeIdx + 1 < ths.length) headerRow.insertBefore(newTh, ths[typeIdx + 1]);
    else headerRow.appendChild(newTh);

    // For each body row, insert the input.
    const bodyRows = table.querySelectorAll('tbody tr');
    bodyRows.forEach(tr => {
      const unitId = getUnitIdFromRow(tr);
      if (!unitId) return;
      const cur = getUnitSize(unitId);
      const td = document.createElement('td');
      td.style.cssText = 'padding:6px 8px';
      td.innerHTML = buildSizeSelect(unitId, cur);
      const cells = tr.children;
      if (typeIdx + 1 < cells.length) tr.insertBefore(td, cells[typeIdx + 1]);
      else tr.appendChild(td);
    });

    // Wire change handlers (delegated).
    // 2026-05-11: Was firing BOTH 'change' and 'blur' on the same edit —
    // two Supabase round-trips per save (often visible as the cell flicker
    // green twice). The blur handler also bypassed the visual feedback.
    // Now only 'change' handles saves; 'blur' just re-checks in case the
    // user blurred without firing change (e.g. via Tab without modifying).
    table.addEventListener('change', e => {
      const inp = e.target.closest('._usc-size');
      if (!inp) return;
      const unitId = +inp.dataset.uid;
      const newSize = inp.value.trim();
      if (newSize === (inp.dataset._lastSaved || '')) return;
      inp.dataset._lastSaved = newSize;
      inp.style.background = '#fef9c3';
      saveSize(unitId, newSize).then(ok => {
        inp.style.background = ok ? '#dcfce7' : '#fee2e2';
        setTimeout(() => { inp.style.background = '#fff'; }, 700);
      });
    });
    table.addEventListener('blur', e => {
      const inp = e.target.closest('._usc-size');
      if (!inp) return;
      // Only save on blur if change didn't already fire (text differs).
      const unitId = +inp.dataset.uid;
      const cur = getUnitSize(unitId);
      const newSize = inp.value.trim();
      if (newSize === cur) return;
      if (newSize === (inp.dataset._lastSaved || '')) return;
      inp.dataset._lastSaved = newSize;
      saveSize(unitId, newSize);
    }, true);
  }

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

  console.log('[unit-size-column] installed');
})();
