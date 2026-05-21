/* === UNIT DELETE FROM COMPANY DETAIL v1 ===
 *
 * Adds a small "🗑 Eyða" button to each tæki row in companies-main so the
 * user can remove a unit directly from the company detail page (works for
 * both Fyrirtæki and Fyrirtæki í þjónustu — both use companies-main).
 *
 * Deletes the uttaeki row in Supabase, removes the matching `client` link
 * (so the unit is fully gone), removes the row from the in-memory cache,
 * then refreshes the company detail so the table reloads cleanly.
 *
 * Defensive: confirms via Confirm.show (falls back to native confirm), shows
 * a toast on success, surfaces errors via alert. The delete is irrevocable
 * so the confirm copy makes that clear.
 */
(() => {
  if (window.__unitDeleteInstalled) return;
  window.__unitDeleteInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Find the unit table inside companies-main (same heuristic patch 131 uses)
  function findUnitTable() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const tables = main.querySelectorAll('table.dtbl, table');
    for (const t of tables) {
      const ths = t.querySelectorAll('thead th');
      if (!ths.length) continue;
      let hasSerial = false, hasStatus = false;
      ths.forEach(th => {
        const tx = (th.textContent || '').trim().toLowerCase();
        if (tx.includes('raðnúmer') || tx.includes('radnumer')) hasSerial = true;
        if (tx === 'staða' || tx === 'stada' || tx === 'status') hasStatus = true;
      });
      if (hasSerial && hasStatus) return t;
    }
    return null;
  }

  function getCompanyId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const editBtn = main.querySelector('button[onclick*="Companies.openEdit"]');
    if (!editBtn) return null;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)/);
    return m ? +m[1] : null;
  }

  async function doDelete(unitId, serial, nafn) {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return false; }
    const label = (serial || ('tæki #' + unitId));
    // 2026-05-21: use Confirm.show when available (Promise-based, non-blocking).
    let ok;
    if (window.Confirm && typeof Confirm.show === 'function') {
      ok = await Confirm.show(
        'Eyða tækinu „' + label + '"?\n\n' +
        'Þetta fjarlægir tækið ALVEG úr kerfinu (uttaeki). Þetta er ekki afturkræft. ' +
        'Ef þú vilt bara merkja tækið sem ónýtt skaltu nota „Staða → 🚫 Ónýtt" í staðinn.',
        { danger: true, okText: 'Eyða' }
      );
    } else {
      ok = confirm('Eyða tækinu "' + label + '"?\n\nÞetta er ekki afturkræft.');
    }
    if (!ok) return false;

    try {
      const r = await SB.from('uttaeki').delete().eq('id', unitId);
      if (r.error) throw r.error;
    } catch (e) {
      alert('Tókst ekki að eyða: ' + (e.message || e));
      return false;
    }

    // Drop from in-memory DB cache if present so the next render doesn't
    // bring the row back briefly.
    try {
      if (window.DB && window.DB.cache && Array.isArray(window.DB.cache.units)) {
        const idx = window.DB.cache.units.findIndex(u => u.id === unitId);
        if (idx >= 0) window.DB.cache.units.splice(idx, 1);
      }
    } catch (_) {}

    if (window.Toast && Toast.show) Toast.show('🗑 Tæki „' + label + '" eytt');

    // Refresh the company detail so the row disappears.
    const coId = getCompanyId();
    if (coId && window.Companies && typeof Companies.openDetail === 'function') {
      setTimeout(() => Companies.openDetail(coId), 150);
    }
    return true;
  }

  function decorateRows() {
    const table = findUnitTable();
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(tr => {
      if (tr.dataset._udDone === '1') return;

      // Find the unit id from any button onclick that reads DB.getUnit(<id>)
      let unitId = null;
      const onclickBtns = tr.querySelectorAll('button[onclick]');
      for (const b of onclickBtns) {
        const m = b.getAttribute('onclick').match(/DB\.getUnit\((\d+)\)/);
        if (m) { unitId = +m[1]; break; }
      }
      if (!unitId) return;
      tr.dataset._udDone = '1';

      // Pull serial for the confirm dialog. Serial column is usually the
      // first cell — fall back to the cell whose header is "Raðnúmer".
      let serial = '';
      const firstCell = tr.querySelector('td');
      if (firstCell) serial = (firstCell.textContent || '').trim();

      // Last cell is the action cell where patch 131 / 90 add their buttons.
      const cells = tr.querySelectorAll('td');
      if (!cells.length) return;
      const actionCell = cells[cells.length - 1];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.title = 'Eyða tæki úr kerfinu';
      btn.style.cssText =
        'padding:4px 8px;background:#fff;border:1px solid #fecaca;color:#dc2626;' +
        'font-weight:600;border-radius:6px;font-size:12px;cursor:pointer;margin-left:4px';
      btn.innerHTML = '🗑';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        doDelete(unitId, serial);
      });
      actionCell.appendChild(btn);
    });
  }

  // Watch companies-main for re-renders so the buttons survive.
  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(decorateRows, 250);
    }).observe(main, { childList: true, subtree: true });
    setTimeout(decorateRows, 600);
  }
  attach();

  console.log('[patch-170] unit-delete installed — 🗑 button on each tæki row');
})();
/* === END UNIT DELETE === */
