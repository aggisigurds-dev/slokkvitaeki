/* === COMPANIES CLICK FIX v1 ===
   The "clicking a company in the list sometimes does nothing, need to
   refresh" bug, fixed for good.

   Root cause: companieslist.js sets `tr.onclick` on each row at render
   time. That handler depends on:
     (a) `window.Companies.list` being populated and in-sync
     (b) the listed company's `nafn` matching the row's displayed name
     (c) realtime re-renders not detaching the row mid-click
   Any of those drifting → click silently no-ops → user has to F5.

   This patch installs ONE capture-phase listener on document that:
     1. Catches every click anywhere inside #view-companies
     2. Walks up to the closest <tr> with a non-header td
     3. Reads the company name from the first cell
     4. Resolves the id from Companies.list, then DB as a backup
     5. Calls Companies.openDetail directly — no card-click dance
     6. Pre-empts any pre-attached row handler with
        e.stopImmediatePropagation() so we always win

   Also keeps Companies.list freshly hydrated by triggering a quick
   reload when the user enters Fyrirtækjaþjónusta after >60s away. */
(() => {
  if (window.__companiesClickFixInstalled) return;
  window.__companiesClickFixInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }

  let _busy = false;
  let _lastClickTs = 0;

  async function openByName(name) {
    if (!name) return;
    name = String(name).trim();
    if (!name) return;
    // 1) In-memory list (fast path)
    const list = (window.Companies && Companies.list) || [];
    let co = list.find(c => (c.nafn || '').trim() === name);
    if (!co) {
      // Try case-insensitive prefix match (handles small renames)
      const lo = name.toLowerCase();
      co = list.find(c => (c.nafn || '').toLowerCase() === lo);
    }
    if (co && window.Companies && typeof Companies.openDetail === 'function') {
      try { Companies.openDetail(co.id); return; } catch (_) {}
    }
    // 2) DB fallback — exact then ilike
    const SB = getSB();
    if (!SB) {
      console.warn('[patch-146] No DB connection, cannot resolve company:', name);
      return;
    }
    try {
      let r = await SB.from('fyrirtaeki').select('id,nafn').eq('nafn', name).maybeSingle();
      if (!r.data) {
        // case-insensitive fallback
        r = await SB.from('fyrirtaeki').select('id,nafn').ilike('nafn', name).limit(1).maybeSingle();
      }
      if (!r.data && name.length > 4) {
        // partial: first 8 chars prefix
        r = await SB.from('fyrirtaeki').select('id,nafn').ilike('nafn', name.slice(0, 8) + '%').limit(1).maybeSingle();
      }
      if (r.data && r.data.id && window.Companies && typeof Companies.openDetail === 'function') {
        // Also refresh Companies.list so subsequent clicks hit the fast path
        try {
          if (typeof Companies.load === 'function') Companies.load();
        } catch (_) {}
        Companies.openDetail(r.data.id);
        return;
      }
      console.warn('[patch-146] Company not found in DB:', name);
    } catch (e) {
      console.error('[patch-146] DB lookup failed:', e);
    }
  }

  // Find the company name from a row (tr or .company-card or list item)
  function nameFromElement(el) {
    if (!el) return null;
    // Skip header rows
    if (el.tagName === 'TR' && el.querySelector('th')) return null;
    // First td or strong text node
    const firstTd = el.querySelector ? (el.querySelector('td:first-child') || el.querySelector('strong, .company-name, h2, h3')) : null;
    if (firstTd) {
      const txt = firstTd.textContent.trim().split('\n')[0].trim();
      // Skip empty or generic header labels
      if (txt && !/^FYRIRTÆKI$/i.test(txt) && txt.length >= 2) return txt;
    }
    return null;
  }

  document.addEventListener('click', async e => {
    // Only inside companies view
    const view = e.target.closest && e.target.closest('#view-companies, #view-fyrirtaeki');
    if (!view) return;
    // Only when on the grid/list (not on a detail page or modal)
    if (e.target.closest('#counter-detail-modal, #workshop-detail-modal, #_tb-panel, #_kr-statement, #_kr-picker, #_se-dlg, ._cl_detail_open, #_qrlc_modal')) return;
    // Don't hijack clicks on form controls / buttons / links
    const tag = (e.target.tagName || '').toLowerCase();
    if (['button', 'input', 'select', 'textarea', 'a', 'svg', 'path'].includes(tag)) return;
    if (e.target.closest('button, input, select, textarea, a, label, [contenteditable], .vnav-btn')) return;

    // Find the row this click belongs to
    let row = e.target.closest('tr');
    if (!row) row = e.target.closest('.company-card');
    if (!row) return;
    // If it's the header tr (contains th), skip
    if (row.querySelector && row.querySelector('th')) return;
    // If we're inside the detail page already (back button etc.), skip
    if (e.target.closest('button[onclick*="Companies.openEdit"], #_pm_edit_css')) return;

    const name = nameFromElement(row);
    if (!name) return;

    // Debounce double-clicks
    const now = Date.now();
    if (now - _lastClickTs < 350) return;
    _lastClickTs = now;
    if (_busy) return;
    _busy = true;

    // Pre-empt any other handlers (the per-row tr.onclick)
    e.preventDefault();
    e.stopImmediatePropagation();

    try {
      await openByName(name);
    } finally {
      setTimeout(() => { _busy = false; }, 300);
    }
  }, true); // capture phase so we win against tr.onclick

  // Periodic Companies.list freshness — soft reload every 2 minutes when on
  // the view, so the in-memory list doesn't go stale.
  let _refreshTimer = null;
  document.addEventListener('view-shown', e => {
    const name = e && e.detail && (e.detail.name || e.detail);
    if (name === 'companies' || name === 'fyrirtaeki') {
      clearInterval(_refreshTimer);
      _refreshTimer = setInterval(() => {
        const view = document.getElementById('view-companies');
        if (!view || !view.classList.contains('active')) return;
        try { if (window.Companies && Companies.load) Companies.load(); } catch (_) {}
      }, 120000);
    }
  });

  console.log('[patch-146] companies-click-fix installed — clicks on company rows always resolve via DB');
})();
/* === END COMPANIES CLICK FIX === */
