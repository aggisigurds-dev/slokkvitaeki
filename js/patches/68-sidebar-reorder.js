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

  // 2026-05-21: a user-supplied ORDER (from AppSettings.sidebar_order) trumps
  // the default. Format: array of items, where each item is either '__SEP__'
  // (separator) or a string (one of the user's nav-button labels). Items in
  // settings.sidebar_hidden are skipped entirely. Items not listed flow to
  // the tail as before (so newly-shipped nav buttons aren't lost).
  function getCustomOrder() {
    try {
      if (!window.AppSettings || !AppSettings.path) return null;
      const v = AppSettings.path('sidebar_order');
      if (!Array.isArray(v) || !v.length) return null;
      // Convert flat string array into ORDER's nested-array shape.
      return v.map(x => x === SEP ? SEP : (Array.isArray(x) ? x : [x]));
    } catch (_) { return null; }
  }
  function getHidden() {
    try {
      if (!window.AppSettings || !AppSettings.path) return [];
      const v = AppSettings.path('sidebar_hidden');
      return Array.isArray(v) ? v : [];
    } catch (_) { return []; }
  }

  // Each entry is either SEP (insert a divider) or an array of substrings
  // — the first nav button whose text contains ANY of those substrings
  // gets placed at this position. Multiple substrings let us tolerate
  // the user's typos (e.g. "Stjórnborð" vs "Stjórnstöð") and short forms.
  const ORDER = [
    ['Verkdagbók'],
    ['Verkefni'],
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
    ['Leiðsögn'],  // 2026-05-19: placed above Fyrirtæki í Þjónustu — driver workflow starts on map
    ['Fyrirtæki í Þjónustu', 'Fyrirtækjaþjónusta', 'Fyrirtæki'],  // patch 153 hijacks this slot — old Fyrirtæki (view-companies) is hidden
    ['Brunakerfisþjónusta'],
    ['Viðskiptavinir'],
    ['Allir'],  // "Allir Viðskiptavinir" (patch 157) — substring "Allir" is unique
    SEP,
    // 2026-05-20: Bill-and-claim cluster — grouped together below the
    // customer list per Agnar's request. Drög → Til að rukka → Kröfu yfirlit
    // → Hreyfingarlisti form a natural left-to-right billing flow.
    ['Drög'],
    ['Til að rukka'],
    ['Kröfu yfirlit'],
    ['Hreyfingarlisti'],
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
    ['Kreditreikning', 'Kreditfæra'],
    SEP,
    ['Tenglar', 'Tenglir', 'Kort'],   // kort/links
    SEP,
    ['Leiðbeiningar'],
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
    // If the user just clicked anywhere in the sidebar, defer reordering by
    // 800ms so the click handler completes before we shuffle the DOM.
    const sinceClick = Date.now() - _lastUserClick;
    const delay = sinceClick < 800 ? 800 : 200;
    scheduled = true;
    setTimeout(() => { scheduled = false; reorder(); }, delay);
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

      // 2026-05-21: prefer custom order from AppSettings when set.
      const activeOrder = getCustomOrder() || ORDER;
      const hiddenList = getHidden().map(s => String(s).toLowerCase());
      function isHiddenBtn(b) {
        if (!hiddenList.length) return false;
        const txt = btnText(b);
        return hiddenList.some(h => txt.indexOf(h) !== -1);
      }
      const hiddenButtons = new Set(buttons.filter(isHiddenBtn));
      for (const item of activeOrder) {
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
          const found = buttons.find(b => !used.has(b) && !hiddenButtons.has(b) && matches(b, item));
          if (found) { ordered.push(found); used.add(found); }
        }
      }

      // Hide hidden buttons (skip them in the ordered list).
      hiddenButtons.forEach(b => { b.style.display = 'none'; });

      // "rest" — any nav-button not explicitly placed stays at the end.
      const rest = buttons.filter(b => !used.has(b) && !hiddenButtons.has(b));
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

      // Save sidebar scroll position so user doesn't get bounced to top when
      // we wipe + reappend (this is what was making nav clicks feel laggy —
      // a late reorder fired during a click and the button moved away).
      const savedScrollTop = nav.scrollTop;

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

      // Restore scroll position
      nav.scrollTop = savedScrollTop;
    } finally {
      inProgress = false;
    }
  }

  // If the user is actively clicking, hold off reordering until they're done
  // — prevents the "click swallowed because button was removed mid-click" bug.
  let _lastUserClick = 0;
  document.addEventListener('mousedown', e => {
    if (e.target && e.target.closest && e.target.closest('.view-nav, nav.view-nav')) {
      _lastUserClick = Date.now();
    }
  }, true);

  // 2026-05-07: simplified to TWO passes only (down from 5 + observer).
  // The late reorders + MutationObserver were destroying buttons under the
  // user's cursor when they clicked, causing the "need to click 2-3 times"
  // bug. Two passes cover 99 % of patches' nav-button injections.
  // Trade-off: any nav button added after 3 s won't be auto-reordered, but
  // that's rare and a hard refresh fixes it. Reorder is also exposed on
  // window.SidebarReorder.reorder() if the user wants to trigger it manually.
  document.addEventListener('DOMContentLoaded', scheduleReorder);
  setTimeout(scheduleReorder, 1500);
  setTimeout(scheduleReorder, 3000);

  // Safety-net delegated click handler on the nav itself. If the inline
  // onclick on a button gets lost for any reason (e.g. detach + re-attach
  // via cloneNode anywhere in the chain), this still routes the click to
  // App.switchView. Idempotent — passing through to the original handler is
  // fine because App.switchView itself is idempotent for re-clicks.
  function attachDelegated(tries) {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) {
      if ((tries || 0) > 30) return;
      setTimeout(() => attachDelegated((tries || 0) + 1), 500);
      return;
    }
    if (nav.dataset._navDelegated === '1') return;
    nav.dataset._navDelegated = '1';
    nav.addEventListener('click', e => {
      const btn = e.target && e.target.closest && e.target.closest('.vnav-btn[data-view]');
      if (!btn) return;
      const view = btn.getAttribute('data-view');
      if (!view) return;
      // Don't fight with patches that intercept specific views (vidskiptavinir,
      // Reikningar) at the document capture phase — those still run first.
      if (window.App && typeof window.App.switchView === 'function') {
        // Use a short setTimeout so this fires AFTER the button's own onclick
        // runs (if it's still wired). If onclick succeeds, switchView is
        // idempotent so a second call is harmless.
        setTimeout(() => {
          // Only fire fallback if the view didn't activate via onclick
          const target = document.getElementById('view-' + view);
          if (target && !target.classList.contains('active')) {
            try { window.App.switchView(view); } catch (_) {}
          }
        }, 30);
      }
    });
  }
  attachDelegated();

  // 2026-05-21: re-apply when the user saves a new sidebar order via the
  // customizer modal (patch 171). Show any previously-hidden buttons too so
  // toggling visibility off→on works without a reload.
  if (window.AppSettings && typeof AppSettings.onChange === 'function') {
    AppSettings.onChange(() => {
      const nav = document.querySelector('nav.view-nav, .view-nav');
      if (nav) nav.querySelectorAll('.vnav-btn').forEach(b => { b.style.display = ''; });
      scheduleReorder();
    });
  }

  window.SidebarReorder = { reorder, scheduleReorder, ORDER, SEP, getCustomOrder, getHidden, version: 'v2' };
  console.log('[sidebar-reorder] v2 ready — custom order via AppSettings.sidebar_order');
})();
/* === END SIDEBAR REORDER === */
