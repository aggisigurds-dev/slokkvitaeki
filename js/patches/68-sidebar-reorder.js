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
      /* 2026-06-19: section headers — the header now carries the group
         separation, so neutralise the old gap + gold hairline (patch 216). */
      nav.view-nav .nav-sec-hdr {
        font-size: 10px; font-weight: 700; letter-spacing: .08em;
        text-transform: uppercase; color: rgba(148,163,184,.85);
        padding: 4px 14px 3px; margin: 13px 0 1px;
        pointer-events: none; white-space: nowrap; user-select: none;
      }
      nav.view-nav .nav-sec-hdr.nav-sec-first { margin-top: 4px; }
      body.light-theme nav.view-nav .nav-sec-hdr { color: #64748b; }
      nav.view-nav .vnav-btn.nav-grp-start { margin-top: 3px !important; padding-top: 0 !important; }
      nav.view-nav .vnav-btn.nav-grp-start::after { display: none !important; }
      @media (max-width: 900px) {
        nav.view-nav .nav-sec-hdr { display: none !important; }
        nav.view-nav .vnav-btn.nav-grp-start { margin-top: 9px !important; }
      }
    `;
    document.head.appendChild(s);
  }

  // Sentinel for visual separators between groups.
  const SEP = '__SEP__';

  // === 2026-06-19: canonical grouped layout + section headers =============
  // "Fresh grouped layout + headers". LAYOUT is the new DEFAULT order, keyed by
  // stable data-view ids → exact match, so the Þjónustu-trio / Verkstæði never
  // collide the way substring matching does. It applies whenever there is no
  // *versioned* user order, so a pre-update custom order is superseded
  // automatically — NO settings write, nothing mutated on load (safe on the
  // deploy-preview, which shares the live DB). When the user re-customises via
  // patch 171, that order is stamped with LAYOUT_V and honoured again. Headers
  // are rendered from LAYOUT against the real placement.
  const LAYOUT_V = '2026-06-19';
  const LAYOUT = [
    ['Yfirlit',           ['stjornstod', 'bokhalds-yfirlit', 'krofu-yfirlit', 'hreyfingarlisti']],
    ['Dagleg vinna',      ['sala', 'counter', 'mottaka', 'workshop', 'vorur', 'verkdagbok', 'Verkefni']],
    ['Þjónusta & skoðun', ['arsskodun', 'thjonustu-verkstaedi', 'brunakerfi', 'thjonustuver', 'beidnir', 'thjonustuverk', 'leidsogn', 'bilstjori', 'vertid']],
    ['Viðskiptavinir',    ['allir-vidsk', 'rekstrarfelog', 'Drög', 'tilbodhub']],
    ['Bókhald',           ['til-rukkun', 'fyrirtaeki-yfirferd', 'bokhald-yfirferd', 'income']],
    ['Birgðir & kerfi',   ['lanstaeki', 'geymsla', 'settings', 'utlit']]
  ];
  function flattenLayout() {
    const out = [];
    LAYOUT.forEach((sec, i) => { if (i) out.push(SEP); sec[1].forEach(id => out.push(id)); });
    return out;
  }
  // Which section a placed button belongs to — exact data-view id first, then
  // label-substring fallback (for entries that aren't ids, e.g. 'Verkefni').
  function sectionOf(btn) {
    const id = navId(btn);
    for (const sec of LAYOUT) if (sec[1].indexOf(id) !== -1) return sec[0];
    const txt = btnText(btn);
    for (const sec of LAYOUT)
      for (const e of sec[1])
        if (e[0] !== '#' && txt.indexOf(String(e).toLowerCase()) !== -1) return sec[0];
    return null;
  }
  // Pooled section-header elements (created once, repositioned each pass).
  const _secEls = {};
  function renderSectionLabels(nav, placedOrder) {
    Object.keys(_secEls).forEach(k => { _secEls[k].style.display = 'none'; });
    const arr = [];
    placedOrder.forEach((ord, btn) => {
      if (btn.classList && btn.classList.contains('vnav-btn') && btn.style.display !== 'none') arr.push([ord, btn]);
    });
    arr.sort((a, b) => a[0] - b[0]);
    let prev = null, first = true;
    for (const [ord, btn] of arr) {
      const sec = sectionOf(btn);
      if (sec && sec !== prev) {
        let el = _secEls[sec];
        if (!el) { el = document.createElement('div'); el.className = 'nav-sec-hdr'; el.textContent = sec; _secEls[sec] = el; }
        if (el.parentNode !== nav) nav.appendChild(el);
        el.style.display = '';
        el.style.order = String(ord - 1);
        el.classList.toggle('nav-sec-first', first);
        prev = sec; first = false;
      }
    }
  }
  // =======================================================================

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
      // 2026-06-19: ignore a pre-update order (no LAYOUT_V stamp) so the fresh
      // grouped layout supersedes it; honour orders the user saves from now on.
      if (AppSettings.path('sidebar_order_v') !== LAYOUT_V) return null;
      // Raw entries: stable ids (data-view) or, for back-compat, old label
      // strings — plus SEP. Matched by navId()-exact first, label substring
      // as a fallback (see matchCustomEntry).
      return v.slice();
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
    // customer list per Agnar's request. Drög → Til að rukka → Kröfu yfirlit
    // → Hreyfingarlisti form a natural left-to-right billing flow.
    ['Drög'],
    ['Til að rukka'],
    ['Kröfu yfirlit'],
    ['Bókhalds yfirlit', 'Bókhaldsyfirlit'],  // 2026-05-26: under Kröfu yfirlit
    ['Hreyfingarlisti'],
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
  // Match one custom-order entry (a stable id, or an old label string) to a
  // not-yet-used, non-hidden button. Exact id first; old label substring as a
  // back-compat fallback so previously-saved label orders keep working.
  function matchCustomEntry(buttons, used, hidden, e) {
    if (typeof e !== 'string') return null;
    let f = buttons.find(b => !used.has(b) && !hidden.has(b) && navId(b) === e);
    if (f) return f;
    if (e[0] !== '#') {
      const el = e.toLowerCase();
      f = buttons.find(b => !used.has(b) && !hidden.has(b) && btnText(b).indexOf(el) !== -1);
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
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) return;
    const buttons = Array.from(nav.querySelectorAll('.vnav-btn'));
    if (!buttons.length) return;
    const qlinks = nav.querySelector('.qlinks-section');

    inProgress = true;
    try {
      const customOrder = getCustomOrder();
      const activeOrder = customOrder || flattenLayout();
      const isCustom = true;   // LAYOUT default + any saved order both match by id/substring
      const hiddenRaw = getHidden();
      function isHiddenBtn(b) {
        if (!hiddenRaw.length) return false;
        const id = navId(b);
        const txt = btnText(b);
        return hiddenRaw.some(h => {
          h = String(h);
          if (h === id) return true;                 // stable id
          return h[0] !== '#' && txt.indexOf(h.toLowerCase()) !== -1; // old label
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

      // 2026-06-19: render section headers from the final placement.
      try { renderSectionLabels(nav, placedOrder); } catch (_) {}
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
  // 2026-06-12: late safety passes — a few injectors (and slow AppSettings
  // loads) can land after the 3s pass; without these the late arrivals sat
  // unordered at the tail until the next mutation ("sidepanel shuffles").
  setTimeout(scheduleReorder, 6000);
  setTimeout(scheduleReorder, 12000);

  // 2026-06-13: with the CSS-order engine there are no DOM moves and no
  // click-swallowing, so a permanent observer is now safe — and it finally
  // kills late-arrival shuffle for good: any nav button added at ANY time is
  // placed into its slot the instant it appears (we only set style/class, so
  // this never re-triggers itself). childList+subtree:false so badge-count
  // text changes inside buttons don't fire it.
  (function observeNav(tries) {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { if ((tries || 0) < 40) setTimeout(() => observeNav((tries || 0) + 1), 300); return; }
    let t = null;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(reorder, 120); })
      .observe(nav, { childList: true, subtree: false });
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
