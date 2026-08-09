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
      /* 2026-06-13: CSS-order engine — group gaps via a top-margin on the
         first button of each group (no separator DOM nodes get moved). */
      nav.view-nav .vnav-btn.nav-grp-start { margin-top: 14px !important; }
      @media (max-width: 900px) {
        nav.view-nav .vnav-btn.nav-grp-start { margin-top: 10px !important; }
      }
    `;
    document.head.appendChild(s);
  }

  // 2026-08-09: Pre-hide CSS from sb_hidden_cache. Late-injected buttons
  // (brunakerfi, drog — timeout ~1s) briefly paint at the top before reorder()
  // sets display:none. Inject a <style> from the cache NOW so they're hidden from
  // the instant they appear. reorder() removes this element before applying its
  // own display logic so there's no conflict.
  (function () {
    try {
      const c = localStorage.getItem('sb_hidden_cache');
      if (!c) return;
      const arr = JSON.parse(c);
      if (!Array.isArray(arr) || !arr.length) return;
      const rules = arr
        .filter(h => typeof h === 'string' && h[0] !== '#' && h.trim())
        .map(h => '.vnav-btn[data-view="' + h.replace(/"/g, '') + '"]{display:none !important}')
        .join('');
      if (!rules) return;
      const st = document.createElement('style');
      st.id = 'sb-prehide';
      st.textContent = rules;
      document.head.appendChild(st);
    } catch (_) {}
  })();

  // Sentinel for visual separators between groups.
  const SEP = '__SEP__';

  // 2026-05-21: a user-supplied ORDER (from AppSettings.sidebar_order) trumps
  // the default. Format: array of items, where each item is either '__SEP__'
  // (separator) or a string (one of the user's nav-button labels). Items in
  // settings.sidebar_hidden are skipped entirely. Items not listed flow to
  // the tail as before (so newly-shipped nav buttons aren't lost).
  // 2026-06-20: cache the saved order/hidden in localStorage. AppSettings loads
  // from Supabase a few seconds into the page, so on first paint it isn't ready
  // and the nav was laid out in the DEFAULT order, then visibly RE-SHUFFLED when
  // the real order arrived (the big late layout jump). Reading a localStorage
  // cache makes the user's order available SYNCHRONOUSLY from the first reorder,
  // so the nav lands in its final order immediately and never jumps. The cache
  // is refreshed every time AppSettings does have the value.
  function getCustomOrder() {
    try {
      if (window.AppSettings && AppSettings.path) {
        const v = AppSettings.path('sidebar_order');
        if (Array.isArray(v) && v.length) {
          try { localStorage.setItem('sb_order_cache', JSON.stringify(v)); } catch (_) {}
          return v.slice();
        }
      }
      const c = localStorage.getItem('sb_order_cache');
      if (c) { const a = JSON.parse(c); if (Array.isArray(a) && a.length) return a; }
    } catch (_) {}
    return null;
  }
  function getHidden() {
    try {
      if (window.AppSettings && AppSettings.path) {
        const v = AppSettings.path('sidebar_hidden');
        if (Array.isArray(v)) {
          try { localStorage.setItem('sb_hidden_cache', JSON.stringify(v)); } catch (_) {}
          return v;
        }
      }
      const c = localStorage.getItem('sb_hidden_cache');
      if (c) { const a = JSON.parse(c); if (Array.isArray(a)) return a; }
    } catch (_) {}
    return [];
  }

  // Each entry is either SEP (insert a divider) or an array of substrings
  // — the first nav button whose text contains ANY of those substrings
  // gets placed at this position. Multiple substrings let us tolerate
  // the user's typos (e.g. "Stjórnborð" vs "Stjórnstöð") and short forms.
  const ORDER = [
    ['Verkborð'],            // 2026-06-22: sameinaði verkborðið (patch 231) efst
    ['Verkdagbók'],
    ['Verkefni'],
    ['Þjónustuverk'],
    ['Fletta upp'],
    SEP,
    ['Yfirlit'],
    ['Stjórnstöð', 'Stjórnborð'],
    SEP,
    ['Sala'],
    ['Afgreiðsla'],
    ['Verkstæði'],
    ['Vörur og þjónusta'],   // 2026-05-26: moved up — Aggi flýtt sögurefli
    SEP,
    ['Þjónustutæki'],
    ['Leiðsögn'],  // 2026-05-19: placed above Fyrirtæki í Þjónustu — driver workflow starts on map
    ['Fyrirtæki í Þjónustu', 'Fyrirtækjaþjónusta', 'Fyrirtæki'],  // patch 153 hijacks this slot — old Fyrirtæki (view-companies) is hidden
    ['Brunakerfisþjónusta'],
    ['Viðskiptavinir'],
    ['Allir'],  // "Allir Viðskiptavinir" (patch 157) — substring "Allir" is unique
    SEP,
    // 2026-05-20: Bill-and-claim cluster — grouped together below the
    // customer list per Agnar's request. Til að rukka → Kröfu yfirlit
    // → Hreyfingarlisti form a natural billing flow.
    ['Til að rukka'],
    ['Kröfu yfirlit'],
    ['Bókhalds yfirlit', 'Bókhaldsyfirlit'],  // 2026-05-26: under Kröfu yfirlit
    ['Hreyfingarlisti'],
    ['Reikninga-póstur'],  // 2026-07-03: invoice-email helper (patch 240) in the billing cluster
    SEP,
    ['Geymsla'],
    ['Lánstæki'],
    ['Birgðir'],
    SEP,
    ['Tilboð'],
    ['Samningar'],
    SEP,
    ['Tekjur'],
    // 2026-06-04: "Reikningar" and "Kreditreikningur" sidebar entries retired
    // (patch 181) — "Kröfu yfirlit" (patch 166) is now the primary receivables
    // view. Their underlying modals stay reachable programmatically.
    SEP,
    ['Tenglar', 'Tenglir', 'Kort'],   // kort/links
    SEP,
    ['Leiðbeiningar'],
    SEP,
    ['Drög'],    // 2026-08-09: moved to bottom per Agnar — draft workflow, not primary nav
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

  // Stable id for a nav button: its data-view (preferred — survives label
  // edits and emoji changes), else a '#'-prefixed normalised label so it can
  // never collide with a real data-view value.
  function navId(btn) {
    const dv = btn.getAttribute && btn.getAttribute('data-view');
    if (dv) return dv;
    return '#' + btnText(btn);
  }
  // Known renamed buttons (df864e6a): a button whose label drifted over time has
  // several equivalent identifiers (old label, new label, stable data-view id).
  // A `sidebar_hidden` entry saved under ANY of these forms must still hide the
  // button — otherwise a value stored under the OLD label ("Stjórnborð") misses
  // the RENAMED button ("Stjórnstöð", id "stjornstod") because neither label is a
  // substring of the other, and it keeps showing even though it was turned off.
  // Each group is lowercase; forms are matched by exact id OR label-substring.
  const LABEL_ALIASES = [
    ['stjórnstöð', 'stjórnborð', 'stjornstod'],
  ];
  // Does hidden-entry `h` name button `b` via a known label-drift group?
  function aliasHidden(id, txt, h) {
    const hl = String(h).toLowerCase(), idl = String(id).toLowerCase();
    for (let i = 0; i < LABEL_ALIASES.length; i++) {
      const grp = LABEL_ALIASES[i];
      if (grp.indexOf(hl) === -1) continue;              // h isn't in this group
      if (grp.indexOf(idl) !== -1) return true;          // b IS this button (by id)
      if (grp.some(a => txt.indexOf(a) !== -1)) return true; // …or by any alias label
    }
    return false;
  }
  // Match one custom-order entry (a stable id, or an old label string) to a
  // not-yet-used, non-hidden button. Exact id first; old label substring as a
  // back-compat fallback so previously-saved label orders keep working.
  function matchCustomEntry(buttons, used, hidden, e) {
    if (typeof e !== 'string') return null;
    let f = buttons.find(b => !used.has(b) && !hidden.has(b) && navId(b) === e);
    if (f) return f;
    // Don't loose-substring-match an entry that is itself a real data-view id:
    // "yfirlit" must only ever match its own button, not "Kröfu yfirlit" etc.
    if (e[0] !== '#' && !buttons.some(b => b.getAttribute && b.getAttribute('data-view') === e)) {
      const el = e.toLowerCase();
      f = buttons.find(b => !used.has(b) && !hidden.has(b) && btnText(b).indexOf(el) !== -1);
    }
    // 2026-08-09: stale '#label N' entries (badge count baked in when saved)
    // fail exact navId match when badge changes. Strip trailing digit-word and
    // fuzzy-match so saved position survives badge updates (e.g. "📝Drög 3" → "Drög").
    if (!f && e[0] === '#') {
      const bare = e.slice(1).toLowerCase().replace(/\s+\d+$/, '').trim();
      if (bare) f = buttons.find(b => !used.has(b) && !hidden.has(b) && btnText(b).replace(/\s+\d+$/, '').indexOf(bare) !== -1);
    }
    return f || null;
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

  // 2026-06-13: SOLID rewrite. Position nav buttons with CSS `order` instead
  // of wiping + re-appending the DOM. The wipe was the root of every sidebar
  // complaint — buttons jumped/disappeared, clicks were swallowed mid-shuffle,
  // scroll bounced, and late arrivals popcorned to the tail. With CSS `order`
  // every button drops straight into its canonical slot the instant it exists,
  // WITHOUT ever moving in the DOM. We only set style/class (never add/remove
  // children), so this is idempotent and loop-free — safe to run on a live
  // MutationObserver. (.view-nav is display:flex column, so `order` applies.)
  function reorder() {
    const ph = document.getElementById('sb-prehide');
    if (ph) ph.remove();
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) return;
    const buttons = Array.from(nav.querySelectorAll('.vnav-btn'));
    if (!buttons.length) return;
    const qlinks = nav.querySelector('.qlinks-section');

    inProgress = true;
    try {
      const customOrder = getCustomOrder();
      const activeOrder = customOrder || ORDER;
      const isCustom = !!customOrder;
      const hiddenRaw = getHidden();
      // Set of every real data-view id present. A hidden entry that IS a data-view
      // id (e.g. "yfirlit") must match ONLY its own button by id — never loosely
      // by label substring, which is what wrongly hid "Kröfu yfirlit" and
      // "Bókhalds yfirlit" (their labels merely contain the word "yfirlit").
      const allViewIds = new Set(buttons.map(b => b.getAttribute && b.getAttribute('data-view')).filter(Boolean));
      function isHiddenBtn(b) {
        if (!hiddenRaw.length) return false;
        const id = navId(b);
        const txt = btnText(b);
        return hiddenRaw.some(h => {
          h = String(h);
          if (h === id) return true;                 // exact stable-id (data-view) match
          if (aliasHidden(id, txt, h)) return true;  // known label-drift (df864e6a — Stjórnborð→Stjórnstöð)
          if (h[0] === '#') return false;            // '#label' ids only match via navId (handled above)
          if (allViewIds.has(h)) return false;       // h is another view's id → never substring-match it as a label
          return txt.indexOf(h.toLowerCase()) !== -1; // legacy plain-label entry → substring match
        });
      }
      const hiddenButtons = new Set(buttons.filter(isHiddenBtn));

      // Reset per pass: clear group marks; show non-hidden, hide hidden.
      buttons.forEach(b => {
        b.classList.remove('nav-grp-start');
        if (hiddenButtons.has(b)) b.style.display = 'none';
        else if (b.style.display === 'none') b.style.display = '';
      });
      // Static separators + section labels (from index.html) have no `order`
      // → they'd sort to the very top (order:0). We render group spacing via
      // margins instead, so hide them (matches the old wipe, which removed them).
      nav.querySelectorAll('.nav-sep, .nav-section-label').forEach(el => { el.style.display = 'none'; });

      const used = new Set();
      const placedOrder = new Map();   // button -> numeric CSS order it received
      let qlinksUsed = false;
      let pos = 10;
      let groupStart = false;   // first group has no extra top-margin

      function place(el) {
        el.style.order = String(pos);
        placedOrder.set(el, pos);
        pos += 10;               // leave gaps so heal-placed buttons slot between
        if (groupStart) { if (el.classList) el.classList.add('nav-grp-start'); groupStart = false; }
      }

      for (const item of activeOrder) {
        if (item === SEP) { groupStart = true; continue; }
        if (isCustom) {
          const found = matchCustomEntry(buttons, used, hiddenButtons, item);
          if (found) { place(found); used.add(found); }
          continue;
        }
        // Default ORDER: array of label substrings. Tenglar section special-case.
        if (qlinks && !qlinksUsed && item.some(n => /tengl|kort|qlink/i.test(n))
            && /tengl/i.test(qlinks.textContent || '')) {
          place(qlinks); qlinksUsed = true; continue;
        }
        const found = buttons.find(b => !used.has(b) && !hiddenButtons.has(b) && matches(b, item));
        if (found) { place(found); used.add(found); }
      }

      // Leftover buttons — anything the active order didn't place.
      //  • KNOWN buttons (present in the built-in ORDER) that are merely missing
      //    from a STALE custom order are slotted into their CANONICAL position —
      //    right after the nearest built-in neighbour that DID get placed — so a
      //    newer button like "Drög" lands in its proper cluster instead of
      //    falling to the very bottom. This self-heals an outdated saved order
      //    without the user having to re-customise. (The old code dumped every
      //    such button to order:9000, which is why "Drög" kept sinking.)
      //  • Truly UNKNOWN buttons flow to the tail as before.
      function defaultIdx(btn) {
        for (let j = 0; j < ORDER.length; j++) {
          if (ORDER[j] === SEP) continue;
          if (matches(btn, ORDER[j])) return j;
        }
        return -1;
      }
      const leftovers = buttons.filter(b => !used.has(b) && !hiddenButtons.has(b));
      const known = [], unknown = [];
      leftovers.forEach(b => { (defaultIdx(b) >= 0 ? known : unknown).push(b); });

      // Place known leftovers in built-in order, each just after its nearest
      // preceding PLACED neighbour (chains through earlier heal-placed ones).
      known.sort((a, b) => defaultIdx(a) - defaultIdx(b));
      const bump = new Map();
      known.forEach(b => {
        const di = defaultIdx(b);
        let anchorOrder = 5, best = -1;   // 5 = before everything if no earlier neighbour
        placedOrder.forEach((ord, pb) => {
          const pdi = defaultIdx(pb);
          if (pdi >= 0 && pdi < di && pdi > best) { best = pdi; anchorOrder = ord; }
        });
        const n = (bump.get(anchorOrder) || 0) + 1;
        bump.set(anchorOrder, n);
        b.style.order = String(anchorOrder + n);   // up to 9 slots between placed (×10) items
        placedOrder.set(b, anchorOrder + n);
      });

      // Unknown buttons → tail (one group gap before them).
      let restPos = 9000, firstRest = true;
      unknown.forEach(b => {
        b.style.order = String(restPos++);
        if (firstRest) { b.classList.add('nav-grp-start'); firstRest = false; }
      });
      if (qlinks && !qlinksUsed) qlinks.style.order = String(restPos++);
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
  // 2026-07-14: anti-FOUC reveal. All view patches load with `defer`, so by
  // DOMContentLoaded every synchronously-injected nav button exists. Do one
  // authoritative reorder (places + applies cached hidden) and THEN reveal the
  // nav — the head inline-style keeps it hidden until now, killing the popcorn +
  // flash-then-hide startup. The 1.8s inline failsafe reveals even if this errors.
  document.addEventListener('DOMContentLoaded', function () {
    try { reorder(); } catch (_) {}
    if (window.__revealSidebar) window.__revealSidebar();
    scheduleReorder();
  });
  setTimeout(scheduleReorder, 1500);
  setTimeout(scheduleReorder, 3000);
  // Belt-and-braces: if DOMContentLoaded already fired before this patch ran,
  // reveal on the next tick so the nav never waits for the 1.8s failsafe.
  if (document.readyState !== 'loading' && window.__revealSidebar) {
    setTimeout(function () { try { reorder(); } catch (_) {} window.__revealSidebar(); }, 0);
  }
  // 2026-06-20: the old 6s/12s "late safety" passes were removed. The permanent
  // observer below already places any button into its slot the instant it is
  // injected, so those passes were redundant — and being the only reorders that
  // ran AFTER first paint + AFTER the user might be interacting, they were the
  // ones that visibly re-shuffled the nav seconds into the session.

  // 2026-06-13: with the CSS-order engine there are no DOM moves and no
  // click-swallowing, so a permanent observer is now safe — and it finally
  // kills late-arrival shuffle for good: any nav button added at ANY time is
  // placed into its slot the instant it appears (we only set style/class, so
  // this never re-triggers itself). childList+subtree:false so badge-count
  // text changes inside buttons don't fire it.
  (function observeNav(tries) {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { if ((tries || 0) < 40) setTimeout(() => observeNav((tries || 0) + 1), 300); return; }
    // 2026-06-20: place via requestAnimationFrame (before the next paint) instead
    // of a 120ms setTimeout. Some patches inject their nav button late (on a timer
    // or after data loads); with the old debounce the button painted at its
    // DEFAULT position (no CSS order yet → order:0 → TOP of the rail) for up to
    // 120ms before the reorder dropped it into place — the "page name flashes at
    // the top one-at-a-time then jumps into its slot" glitch. rAF runs in the
    // render step of the SAME frame as the injecting task, so the button receives
    // its order before it is ever painted → it appears directly in its slot.
    let raf = 0, fb = 0;
    const doReorder = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } if (fb) { clearTimeout(fb); fb = 0; } reorder(); };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(doReorder);   // foreground: runs before the next paint → button never paints unplaced
      if (!fb)  fb  = setTimeout(doReorder, 150);          // fallback: rAF is paused in a background tab, so guarantee placement anyway
    };
    new MutationObserver(schedule).observe(nav, { childList: true, subtree: false });
    schedule(); // position whatever buttons already exist before the first paint
    // 2026-07-14: re-apply whenever AppSettings loads/changes. sidebar_hidden
    // usually arrives from the server AFTER the first paint, and late
    // JS-inserted buttons (e.g. Stjórnstöð, patch 61) would otherwise never get
    // hidden — the nav MutationObserver only fires on DOM changes, not on the
    // settings load. onChange fires on every load/save so hide state catches up.
    if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(schedule);
  })(0);

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
  //
  // 2026-06-13: GATE on the sidebar keys actually changing. AppSettings.notify()
  // fires EVERY listener on EVERY save() — and ~30 unrelated patches save
  // settings constantly (notes, todo board, prices, ársskoðun, customer
  // subscriptions, geocode cache…). Each of those used to rebuild the whole nav
  // (un-hide all + full reorder) at an arbitrary mid-session moment — which is
  // what made tabs "sometimes move around" long after load, and made any hidden
  // tabs flash back in on every autosave. The load-time settling layers
  // (patches 180/189/196) don't cover these because they only run for the first
  // few seconds. Now we react ONLY when sidebar_order / sidebar_hidden actually
  // differ from last time — i.e. when the user really reorders (patch 171).
  // Late-arriving nav buttons are still placed by the guardian (patch 189),
  // which watches nav membership directly, so nothing is lost by gating here.
  if (window.AppSettings && typeof AppSettings.onChange === 'function') {
    let _lastSidebarSig = JSON.stringify([getCustomOrder(), getHidden()]);
    AppSettings.onChange(() => {
      const sig = JSON.stringify([getCustomOrder(), getHidden()]);
      if (sig === _lastSidebarSig) return;   // unrelated settings save — leave the nav alone
      _lastSidebarSig = sig;
      const nav = document.querySelector('nav.view-nav, .view-nav');
      if (nav) nav.querySelectorAll('.vnav-btn').forEach(b => { b.style.display = ''; });
      scheduleReorder();
    });
  }

  window.SidebarReorder = { reorder, scheduleReorder, ORDER, SEP, getCustomOrder, getHidden, version: 'v2' };
  console.log('[sidebar-reorder] v2 ready — custom order via AppSettings.sidebar_order');
})();
/* === END SIDEBAR REORDER === */
