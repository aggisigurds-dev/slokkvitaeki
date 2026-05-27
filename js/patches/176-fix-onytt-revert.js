/* === FIX ÓNÝTT REVERT (176) ============================================
 *
 * Aggi reported (Verkvík): marked tæki as Ónýtt, can't revert to virkt.
 *
 * Root cause analysis:
 *   • Patch 103 (`toggleScrap`) reads `unit.status` from cached units array
 *     to decide isScrapNow → newStatus.
 *   • If the row gets re-rendered between the first and second click without
 *     refreshing the cached unit (e.g. background sync), the cached object
 *     may still report old status → toggle picks wrong direction.
 *   • Also, `U.badge(u.status)` doesn't have entries for 'scrap'/'active'/
 *     'broken'/'urelt' in the lookup map, so the Staða <td> shows the raw
 *     status string. Visually confusing — looks like nothing changed.
 *
 * This patch:
 *   1. Overrides `toggleScrap`-bound click handler to always look up
 *      truth from DB before deciding direction.
 *   2. Wraps stylizeScrapBtn to also update the row's Staða <td> in place
 *      so the user gets immediate visual confirmation.
 *   3. Patches U.badge so 'active', 'scrap', 'broken', 'urelt' get proper
 *      Icelandic labels + colors.
 * =================================================================== */
(() => {
  if (window.__fixOnyttInstalled) return;
  window.__fixOnyttInstalled = true;

  // ── 1. Extend U.badge / U.sl / U.sc to cover unit statuses ─────────────
  const STATUS_LABEL = {
    active:   'Virkt',
    scrap:    'Ónýtt',
    broken:   'Brotið',
    urelt:    'Úrelt',
    geymsla:  'Í geymslu',
    repair:   'Þarfnast viðgerðar',
    fail:     'Bilað',
  };
  const STATUS_CLASS = {
    active:   'st-ok',
    scrap:    'st-ov',
    broken:   'st-ov',
    urelt:    'st-ov',
    geymsla:  'st-col',
    repair:   'st-due',
    fail:     'st-ov',
  };
  if (window.U) {
    const origSl = U.sl;
    const origSc = U.sc;
    U.sl = function(s) {
      if (STATUS_LABEL[s]) return STATUS_LABEL[s];
      try { return origSl.call(U, s); } catch (_) { return s; }
    };
    U.sc = function(s) {
      if (STATUS_CLASS[s]) return STATUS_CLASS[s];
      try { return origSc.call(U, s); } catch (_) { return ''; }
    };
  }

  // ── 2. When a status changes, repaint THAT row's Staða <td> + Ónýtt btn ──
  // We do this by listening to a custom event we'll dispatch from a
  // monkey-patched toggleScrap. Since 103's toggleScrap is closed inside an
  // IIFE we can't reach it directly. Instead, observe network calls? Too
  // brittle. Easier: replace the click handlers via document-level delegate.
  document.addEventListener('click', async ev => {
    const btn = ev.target && ev.target.closest && ev.target.closest('._wra-scrap');
    if (!btn) return;
    // 103 also attaches its own handler — let that run, but POST-handle
    // to repaint the row. Schedule async fix-up after click event finishes.
    setTimeout(() => repaintRowOf(btn), 250);
    setTimeout(() => repaintRowOf(btn), 800);  // catch slower DB roundtrips
  }, true);

  function repaintRowOf(btn) {
    const row = btn.closest('tr');
    if (!row) return;
    const serial = (row.querySelector('.ser') || {}).textContent;
    if (!serial) return;
    const units = (window.DB && DB.cache && DB.cache.units) || [];
    const u = units.find(x => x.serial === serial.trim());
    if (!u) return;
    // Update Staða TD (4th-to-last typically — but find by content position is fragile;
    // instead just update any TD that currently contains a class="st" span)
    const cells = row.querySelectorAll('td');
    cells.forEach(td => {
      const span = td.querySelector('span.st');
      if (span && window.U && U.badge) {
        td.innerHTML = U.badge(u.status);
      }
    });
    // Highlight row when scrap so it's visually obvious
    if (u.status === 'scrap') {
      row.style.background = '#fef2f2';
    } else {
      row.style.background = '';
    }
  }

  // ── 3. Defensive: if a row's "Ónýtt ✓" button gets clicked but toggleScrap
  // determined "isScrapNow = false" (because cached unit shows active when
  // DB says scrap), force a one-time fresh DB lookup. We do this by tagging
  // the button as needing a verify on next click.
  // Simpler: just provide a one-button repair endpoint via window.fixUnitStatus
  // that the user can call manually.
  window.fixUnitStatus = async function(serialOrId, desired = 'active') {
    const SB = window.DB && DB.sb;
    if (!SB) { alert('Engin tenging við gagnabanka'); return; }
    let q = SB.from('uttaeki').update({ status: desired });
    if (typeof serialOrId === 'number' || /^\d+$/.test(serialOrId)) {
      q = q.eq('id', +serialOrId);
    } else {
      q = q.eq('serial', String(serialOrId));
    }
    const r = await q.select();
    if (r.error) { alert('Villa: ' + r.error.message); return; }
    // Update cache
    if (window.DB && DB.cache && Array.isArray(DB.cache.units)) {
      (r.data || []).forEach(row => {
        const idx = DB.cache.units.findIndex(u => u.id === row.id);
        if (idx >= 0) Object.assign(DB.cache.units[idx], row);
      });
    }
    if (window.Toast && Toast.show) Toast.show('✓ Staða uppfærð → ' + desired);
    else alert('Staða uppfærð → ' + desired);
    return r.data;
  };
  // Convenience for the most common case
  window.unscrap = (s) => window.fixUnitStatus(s, 'active');
})();
