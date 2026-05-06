/* === SIDEBAR REORDER v1 ===
 *
 * Re-arranges the navigation buttons in `.view-nav` into a fixed,
 * user-defined order. Runs after all other patches have had a chance
 * to inject their own nav buttons, then continues to keep the order
 * stable when new buttons appear.
 *
 * The order is matched by button text content (substring) so it works
 * regardless of which patch added the button or what data-view it uses.
 *
 * "rest" means: any nav button whose text doesn't match an entry in
 * ORDER is appended at the end (after a separator), so nothing gets
 * lost — even nav buttons we haven't accounted for here.
 */
(() => {
  if (window.__sidebarReorderInstalled) return;
  window.__sidebarReorderInstalled = true;

  // Inject CSS that gives our group separators much more breathing room than
  // the default 4-6px thin-line separator. Two visual cues stack here:
  //  1) bigger top+bottom margin (14px each) so groups visually breathe
  //  2) a faintly brighter divider line so the eye lands on group boundaries
  //  3) on collapsed mobile sidebar (≤900px) keep it tight to save height
  if (!document.getElementById('sidebar-reorder-style')) {
    const s = document.createElement('style');
    s.id = 'sidebar-reorder-style';
    s.textContent = `
      nav.view-nav .nav-sep.nav-sep-group {
        height: 1px !important;
        margin: 14px 12px !important;
        background: rgba(255,255,255,.10) !important;
      }
      @media (max-width: 900px) {
        nav.view-nav .nav-sep.nav-sep-group {
          margin: 10px 6px !important;
        }
      }
    `;
    document.head.appendChild(s);
  }

  // Sentinel for visual separators between groups.
  const SEP = '__SEP__';

  // Each entry is either SEP (insert a divider) or an array of substrings
  // — the first nav button whose text contains ANY of those substrings
  // gets placed at this position. Multiple substrings let us tolerate
  // the user's typos (e.g. "Stjórnborð" vs "Stjórnstöð") and short forms.
  const ORDER = [
    ['Verkdagbók'],
    ['Fletta upp'],
    SEP,
    ['Yfirlit'],
    ['Stjórnstöð', 'Stjórnborð'],
    SEP,
    ['Sala'],
    ['Afgreiðsla'],
    ['Verkstæði'],
    SEP,
    ['Þjónustutæki'],
    ['Fyrirtækjaþjónusta', 'Fyrirtæki'],
    ['Viðskiptavinir'],
    SEP,
    ['Geymsla'],
    ['Lánstæki'],
    ['Birgðir'],
    ['Vörur og þjónusta'],
    SEP,
    ['Tilboð'],
    ['Samningar'],
    SEP,
    ['Bókhalds yfirlit', 'Bókhaldsyfirlit'],
    ['Tekjur'],
    ['Reikningar'],
    SEP,
    ['Tenglar', 'Tenglir', 'Kort'],   // kort/links
    SEP
    // Everything else flows after the last separator.
  ];

  // Normalise text: lowercase, trim, collapse whitespace, strip leading
  // SVG-icon character so we just compare against the visible label.
  function btnText(btn) {
    return String(btn.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
  function matches(btn, names) {
    const txt = btnText(btn);
    return names.some(n => txt.indexOf(String(n).toLowerCase()) !== -1);
  }

  // Throttle so the MutationObserver doesn't loop on its own writes.
  let scheduled = false;
  let inProgress = false;
  function scheduleReorder() {
    if (scheduled || inProgress) return;
    scheduled = true;
    setTimeout(() => { scheduled = false; reorder(); }, 200);
  }

  function reorder() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) return;
    const buttons = Array.from(nav.querySelectorAll('.vnav-btn'));
    if (!buttons.length) return;
    // The "Tenglar" group is rendered as a single .qlinks-section block
    // (a div containing all the link items). Treat it like a button when
    // matching positions in ORDER.
    const qlinks = nav.querySelector('.qlinks-section');

    inProgress = true;
    try {
      const used = new Set();
      let qlinksUsed = false;
      const ordered = [];

      for (const item of ORDER) {
        if (item === SEP) {
          // Marked with `nav-sep-group` so our injected CSS gives it more
          // breathing room than the default thin-line separator.
          const s = document.createElement('div');
          s.className = 'nav-sep nav-sep-group';
          ordered.push(s);
        } else {
          // Special-case: the Tenglar section matches a wider net of names
          // (the section label says "Tenglar", any of its children also OK).
          if (qlinks && !qlinksUsed && item.some(n => /tengl|kort|qlink/i.test(n))
              && /tengl/i.test(qlinks.textContent || '')) {
            ordered.push(qlinks);
            qlinksUsed = true;
            continue;
          }
          const found = buttons.find(b => !used.has(b) && matches(b, item));
          if (found) { ordered.push(found); used.add(found); }
        }
      }

      // "rest" — any nav-button not explicitly placed stays at the end.
      const rest = buttons.filter(b => !used.has(b));
      if (rest.length || (qlinks && !qlinksUsed)) {
        const last = ordered[ordered.length - 1];
        if (!last || !last.classList?.contains('nav-sep')) {
          const s = document.createElement('div');
          s.className = 'nav-sep';
          ordered.push(s);
        }
        rest.forEach(b => ordered.push(b));
        if (qlinks && !qlinksUsed) ordered.push(qlinks);
      }

      // The very last separator before the "rest" tail also gets the bigger
      // gap so the trailing group is visually distinct.
      ordered.forEach(el => {
        if (el.classList?.contains('nav-sep') && !el.classList.contains('nav-sep-group')) {
          el.classList.add('nav-sep-group');
        }
      });

      // Wipe existing buttons / separators / section labels / qlinks and
      // re-append in the new order. Anything else inside the nav (e.g. a
      // brand block, if present) is left in place.
      Array.from(nav.children).forEach(child => {
        if (child.classList?.contains('vnav-btn')
         || child.classList?.contains('nav-sep')
         || child.classList?.contains('nav-section-label')
         || child.classList?.contains('qlinks-section')) {
          child.remove();
        }
      });
      ordered.forEach(el => nav.appendChild(el));
    } finally {
      inProgress = false;
    }
  }

  // Initial passes — run a few times because various patches inject
  // their nav buttons on different timers (some at DOMContentLoaded,
  // some after a 500ms / 1500ms / 3000ms delay).
  document.addEventListener('DOMContentLoaded', scheduleReorder);
  setTimeout(scheduleReorder, 800);
  setTimeout(scheduleReorder, 2000);
  setTimeout(scheduleReorder, 4000);
  setTimeout(scheduleReorder, 7000);

  // Watch for late button insertions (e.g. role gates, login completion)
  // and re-apply the order. The `inProgress` guard prevents the observer
  // looping on the writes we make ourselves.
  const obs = new MutationObserver(() => {
    if (inProgress) return;
    scheduleReorder();
  });
  function startObs() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(startObs, 1000); return; }
    obs.observe(nav, { childList: true });
  }
  startObs();

  window.SidebarReorder = { reorder, version: 'v1' };
  console.log('[sidebar-reorder] v1 ready');
})();
/* === END SIDEBAR REORDER === */
