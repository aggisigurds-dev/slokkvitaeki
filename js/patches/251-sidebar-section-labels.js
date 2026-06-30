/* === 251-sidebar-section-labels.js — sectioned sidebar (STJÓRNSTÖÐ / LEIÐSÖGN /
 *      GÖGN / KERFI) =============================================================
 *
 * The Slökkvitæki sidebar is built incrementally: index.html ships a base set
 * of `.vnav-btn` buttons under `<nav class="view-nav">`, and a dozen patches
 * (sala.js, vorur.js, 11-bokhalds-yfirlit.js, 04-verkdagbok.js, 161-leidsogn,
 * 219-bilstjori, 231-verkbord, 232-bakendi, 236-sameining, 239-adstodarmidstod,
 * 59-technicians, …) prepend/insert their own nav button when they boot.  The
 * resulting list is a flat scroll of 20+ buttons with no visual grouping.
 *
 * This patch adds **uppercase muted section labels** above logical groups so
 * the eye can find the right tool in one scan, in the spirit of the Brunastál
 * design's "section eyebrow" treatment.  Sections (specified by the user):
 *
 *   STJÓRNSTÖÐ  — Verkborð · Sala · Afgreiðsla · Tekjur · Bókhalds yfirlit
 *   LEIÐSÖGN    — Leiðsögn · Bílstjóri
 *   GÖGN        — Fyrirtæki · Fyrirtæki í Þjónustu · Vörur · Verkdagbók ·
 *                 Lánstæki · Verkbeiðnir · Tækni · Workshop · Skýrslur
 *   KERFI       — Aðstoðarmiðstöð · Sameining · Bakendi · Stillingar
 *
 * Strategy:
 *   • Match nav buttons by the displayed text in <span> (or fallback text).
 *     Matching is case- and accent-folded so it tolerates emoji prefixes and
 *     minor label drift.  A button is the section anchor if it's the FIRST
 *     match in `priorities` order under that section.
 *   • Insert a `.nav-section-label` div RIGHT BEFORE the first found button
 *     of each group.  The HTML already ships with .nav-section-label rules,
 *     so it slots in cleanly.  We add `[data-vsec]` so we can find + replace
 *     our own labels without disturbing the (3) existing static ones in
 *     index.html.
 *   • Idempotent: the observer re-runs on sidebar DOM changes (every patch
 *     that adds a button triggers a mutation), but each tick first REMOVES
 *     our `[data-vsec]` labels before re-inserting → no duplicates.
 *   • Style: 10.5px uppercase, letter-spacing .06em, color #94a3b8,
 *     margin-top:14px, margin-left:12px, margin-bottom:4px — per spec.
 *
 * Theme-neutral: this patch works on EVERY theme (not scoped to Brunastál).
 * The `.nav-section-label` class is already paged a colour by 230 under
 * Brunastál; we provide the geometry rules.
 * ========================================================================= */
(() => {
  if (window.__sbSectionLabels251) return;
  window.__sbSectionLabels251 = true;

  // ── CSS for our labels (global — applies in all themes) ───────────────────
  const STYLE_ID = 'sb-section-labels-251-css';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .view-nav .nav-section-label[data-vsec]{
        display: block !important;
        font-family: 'Space Grotesk', system-ui, sans-serif;
        font-size: 10.5px !important;
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: .06em !important;
        color: #94a3b8 !important;
        margin: 14px 0 4px 12px !important;
        padding: 0 !important;
        pointer-events: none;
      }
      /* First-in-list label sits a bit tighter to the top */
      .view-nav .nav-section-label[data-vsec][data-vsec-first="1"]{
        margin-top: 6px !important;
      }
      /* Under Brunastál theme the colour shifts to the design's eyebrow tone */
      html[data-thm-preset="brunastal"] .view-nav .nav-section-label[data-vsec]{
        color: rgba(255,255,255,.32) !important;
      }
    `;
    (document.head || document.documentElement).appendChild(s);
  }

  // ── Label-to-button mapping ────────────────────────────────────────────────
  // Each section keeps an ORDERED list of button-text predicates.  The first
  // predicate that matches a live button anchors the section.  Predicates are
  // case+accent-insensitive substring matches against the button label text.
  const SECTIONS = [
    {
      label: 'STJÓRNSTÖÐ',
      anchors: ['verkbord', 'sala', 'afgreidsla', 'tekjur', 'bokhalds yfirlit', 'bokhald']
    },
    {
      label: 'LEIÐSÖGN',
      anchors: ['leidsogn', 'thjonustutaeki', 'bilstjori']
    },
    {
      label: 'GÖGN',
      anchors: [
        'fyrirtaeki', 'fyrirtaeki i thjonustu', 'arsskodun',
        'vorur', 'verkdagbok', 'lanstaeki',
        'verkbeidnir', 'taekni', 'workshop', 'verkstaedi', 'skyrslur'
      ]
    },
    {
      label: 'KERFI',
      anchors: ['adstodarmidstod', 'adstod', 'sameining', 'bakendi', 'stillingar']
    }
  ];

  // ── helpers ───────────────────────────────────────────────────────────────
  // Strip emoji + diacritics + lowercase → a stable comparison key.
  function fold(s) {
    if (!s) return '';
    return String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')   // drop emoji / punctuation
      .replace(/\s+/g, ' ')
      .trim();
  }
  function btnLabel(btn) {
    // Prefer the explicit <span>, otherwise the full textContent.
    const sp = btn.querySelector('span');
    return fold((sp && sp.textContent) || btn.textContent || '');
  }
  function findFirstAnchor(nav, anchors) {
    const btns = Array.from(nav.querySelectorAll('.vnav-btn'));
    // For each anchor predicate (in priority order), find the FIRST button
    // whose label STARTS WITH or CONTAINS the anchor token.  Return the
    // earliest such button in DOM order, so the section label sits at the top
    // of the visible group.
    let earliest = null;
    let earliestIndex = Infinity;
    for (const a of anchors) {
      for (let i = 0; i < btns.length; i++) {
        const lab = btnLabel(btns[i]);
        if (lab.indexOf(a) >= 0 && i < earliestIndex) {
          earliest = btns[i];
          earliestIndex = i;
          break;  // accept the earliest match for this anchor
        }
      }
    }
    return earliest;
  }

  // ── place / refresh labels ────────────────────────────────────────────────
  let placing = false;
  function placeLabels() {
    if (placing) return;
    placing = true;
    try {
      const nav = document.querySelector('nav.view-nav');
      if (!nav) return;

      // First, REMOVE any of our previous labels so we don't double-add when
      // a new vnav-btn is injected by a patch.  Only labels with data-vsec
      // are owned by us — the (3) static labels in index.html lack it and are
      // preserved untouched.
      nav.querySelectorAll('.nav-section-label[data-vsec]').forEach(n => n.remove());

      // Anchors found this tick — used to mark the first one.
      const placed = [];
      for (const sec of SECTIONS) {
        const anchor = findFirstAnchor(nav, sec.anchors);
        if (!anchor) continue;
        const lab = document.createElement('div');
        lab.className = 'nav-section-label';
        lab.setAttribute('data-vsec', fold(sec.label));
        lab.textContent = sec.label;
        anchor.parentNode.insertBefore(lab, anchor);
        placed.push(lab);
      }
      // Mark the very first label in DOM order with a tighter margin-top.
      if (placed.length) {
        // Sort by DOM order to find the absolute-first label
        placed.sort((a, b) =>
          (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1
        );
        placed[0].setAttribute('data-vsec-first', '1');
      }
    } finally {
      placing = false;
    }
  }

  // ── observe sidebar mutations: every patch that injects a vnav-btn fires
  //    a childList change on `nav.view-nav`. ───────────────────────────────
  function startObserver() {
    const nav = document.querySelector('nav.view-nav');
    if (!nav) { setTimeout(startObserver, 200); return; }
    placeLabels();
    let raf = 0;
    const mo = new MutationObserver(() => {
      // Debounce via rAF so a burst of injections is collapsed into one pass.
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; placeLabels(); });
    });
    mo.observe(nav, { childList: true, subtree: false });
    // Safety net: re-run every 1500ms in case a patch injects buttons through
    // an out-of-tree path (e.g. building the nav with innerHTML on a sibling).
    setInterval(placeLabels, 1500);
  }

  if (document.readyState !== 'loading') startObserver();
  else document.addEventListener('DOMContentLoaded', startObserver);

  console.log('[patch-251] sidebar section labels ready (STJÓRNSTÖÐ / LEIÐSÖGN / GÖGN / KERFI)');
})();
