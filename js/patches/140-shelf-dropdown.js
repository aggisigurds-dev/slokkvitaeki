/* === SHELF DROPDOWN v1 ===
   Adds a G1-G40 "Hilla" dropdown to every job card in Afgreiðsla (Counter)
   and Verkstæði (Workshop), so the user can mark which physical shelf a job
   is stored on and see it at a glance.

   Persistence: AppSettings.path('job_shelves')[jobId] = 'G5' — saved to the
   Supabase app_settings table so it syncs across devices.

   Detection: MutationObserver on the two views. For every element whose
   onclick handler calls Counter.select(N) or Workshop.select(N), inject a
   small inline <select> if one isn't there yet. Click/change events stop
   propagation so the card doesn't open when the user picks a shelf.

   Range: G1-G40 (configurable via SHELF_COUNT below). Empty option "—" means
   unassigned.

   Compatible with the legacy settigeymslu.js (📦 button) — those still write
   to uttaeki.location='Geymsla - GN'. This patch is independent and only
   tracks active-job shelves. */
(() => {
  if (window.__shelfDropdownInstalled) return;
  window.__shelfDropdownInstalled = true;

  const SHELF_COUNT = 40;
  const SHELVES = Array.from({ length: SHELF_COUNT }, (_, i) => 'G' + (i + 1));

  function getMap() {
    if (!window.AppSettings) return {};
    return window.AppSettings.path('job_shelves') || {};
  }

  // Local cache so renders don't have to read from AppSettings each time
  // (AppSettings.path traverses deepMerge'd object — still fast, but caching
  // is fine).
  function getShelf(jobId) {
    return getMap()[String(jobId)] || '';
  }

  async function setShelf(jobId, shelf) {
    if (!window.AppSettings || typeof window.AppSettings.save !== 'function') return;
    const cur = Object.assign({}, getMap());
    if (shelf) cur[String(jobId)] = shelf;
    else delete cur[String(jobId)];
    // Pass the whole map so deletions stick (deepMerge would otherwise only add).
    // AppSettings.save merges the patch object — but for a top-level key with
    // an object value, it deep-merges. We work around by writing all values
    // explicitly, including the ones we want gone (null gets stripped by JSON
    // round-trip in deepMerge). Safer: do a two-step write — save the whole
    // map under a fresh wrapper.
    try {
      await window.AppSettings.save({ job_shelves: cur });
    } catch (e) {
      console.warn('[patch-140] save shelf failed:', e);
    }
  }

  function buildSelect(jobId, isReady) {
    const current = getShelf(jobId);
    const sel = document.createElement('select');
    sel.dataset.shelfDd = '1';
    sel.dataset.jobId = String(jobId);
    sel.title = 'Hilla í geymslu (G1–G' + SHELF_COUNT + ')';
    // Soft colour, slightly different for ready vs in-progress so the eye
    // can pick out unassigned items quickly.
    const hasShelf = !!current;
    const bg = hasShelf ? (isReady ? '#dcfce7' : '#dbeafe') : '#fff';
    const fg = hasShelf ? (isReady ? '#166534' : '#1e40af') : '#94a3b8';
    const bd = hasShelf ? (isReady ? '#86efac' : '#93c5fd') : '#cbd5e1';
    // NB size-critical props are !important so the Brunastál input skin
    // (patch 245 forces .view select to height:42px;padding:0 14px;font:14px)
    // can't override them — that padding clips the G1/G2 value out of view.
    sel.style.cssText =
      'flex-shrink:0;align-self:center;height:auto!important;min-height:0!important;' +
      'padding:3px 6px!important;font-size:12px!important;font-weight:700;line-height:1.2!important;' +
      'border:1px solid ' + bd + '!important;background:' + bg + '!important;color:' + fg + '!important;' +
      'border-radius:6px!important;cursor:pointer;font-family:inherit;outline:none;' +
      'min-width:58px!important;max-width:74px!important;width:auto!important;text-align:center;';

    // Empty option (— = unassigned)
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '— Hilla';
    sel.appendChild(emptyOpt);
    SHELVES.forEach(s => {
      const o = document.createElement('option');
      o.value = s;
      o.textContent = s;
      if (s === current) o.selected = true;
      sel.appendChild(o);
    });
    if (!current) emptyOpt.selected = true;

    // Stop propagation so the underlying card click doesn't fire
    ['click', 'mousedown', 'pointerdown'].forEach(evt =>
      sel.addEventListener(evt, e => e.stopPropagation())
    );

    sel.addEventListener('change', async (e) => {
      e.stopPropagation();
      const v = sel.value;
      // Re-style immediately for snappy feedback
      const newHasShelf = !!v;
      sel.style.background = newHasShelf ? (isReady ? '#dcfce7' : '#dbeafe') : '#fff';
      sel.style.color = newHasShelf ? (isReady ? '#166534' : '#1e40af') : '#94a3b8';
      sel.style.borderColor = newHasShelf ? (isReady ? '#86efac' : '#93c5fd') : '#cbd5e1';
      await setShelf(jobId, v);
      // Force re-render of both views so other places (e.g. expanded customer
      // groups) reflect the new value.
      try { if (window.Counter && Counter.render) Counter.render(); } catch (_) {}
      try { if (window.Workshop && Workshop.render) Workshop.render(); } catch (_) {}
    });

    return sel;
  }

  // Inject a shelf select into every card under the given root.
  // 2026-05-12: Two layouts:
  //   - Ready cards already use a flex row with a "Sótt ✓" button at the
  //     right — drop the select inline BEFORE that button.
  //   - All other cards (job cards, workshop cards, expanded customer-group
  //     sub-cards, contract column cards) have no dedicated flex slot, so
  //     anchor the select absolute top-right and reserve right padding so
  //     text doesn't run under it.
  function injectInto(root, viewKind) {
    if (!root) return;
    const rx = viewKind === 'counter'
      ? /Counter\.select\((\d+)\)/
      : /Workshop\.select\((\d+)\)/;
    root.querySelectorAll('[onclick]').forEach(el => {
      const oc = el.getAttribute('onclick') || '';
      const m = oc.match(rx);
      if (!m) return;
      const jobId = +m[1];
      const parent = el.parentElement;
      // Ready card heuristic: the parent is a flex row containing a Sótt button.
      const sottBtn = parent && parent.querySelector('button.btn-success, button[class*="success"]');
      const isReady = viewKind === 'counter' && !!sottBtn;

      if (isReady) {
        if (parent.querySelector('[data-shelf-dd="1"]')) return;
        const sel = buildSelect(jobId, true);
        sel.style.margin = '0 4px';
        parent.insertBefore(sel, sottBtn);
        return;
      }

      // Non-ready: corner-anchor on the card itself
      if (el.querySelector('[data-shelf-dd="1"]')) return;
      const cs = window.getComputedStyle(el);
      if (cs.position === 'static') el.style.position = 'relative';
      if (!el.dataset._shelfPadded) {
        el.dataset._shelfPadded = '1';
        const curPadRight = parseFloat(cs.paddingRight) || 0;
        if (curPadRight < 56) el.style.paddingRight = '60px';
      }
      const sel = buildSelect(jobId, false);
      sel.style.position = 'absolute';
      sel.style.top = '6px';
      sel.style.right = '6px';
      sel.style.zIndex = '2';
      el.appendChild(sel);
    });
  }

  function injectAll() {
    injectInto(document.getElementById('view-counter'), 'counter');
    injectInto(document.getElementById('view-workshop'), 'workshop');
  }

  function watch(viewId, kind) {
    const v = document.getElementById(viewId);
    if (!v) { setTimeout(() => watch(viewId, kind), 500); return; }
    let t = 0;
    new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => injectInto(v, kind), 60);
    }).observe(v, { childList: true, subtree: true });
    // Initial pass
    injectInto(v, kind);
  }

  // Re-render the views once AppSettings finishes its initial load, so cards
  // pick up persisted shelf values even if the view rendered first.
  function bootstrap() {
    watch('view-counter', 'counter');
    watch('view-workshop', 'workshop');
    setTimeout(injectAll, 400);
    setTimeout(injectAll, 1200);
    setTimeout(injectAll, 3000);
    if (window.AppSettings && typeof window.AppSettings.onChange === 'function') {
      window.AppSettings.onChange(() => injectAll());
    }
  }
  bootstrap();
  console.log('[patch-140] shelf-dropdown installed — G1–G' + SHELF_COUNT + ' on Afgreiðsla + Verkstæði cards');
})();
/* === END SHELF DROPDOWN === */
