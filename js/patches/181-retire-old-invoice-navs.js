/* === RETIRE OLD INVOICE NAVS v1 ===
 *
 * "Kröfu yfirlit" (patch 166) is now the primary receivables / invoice view.
 * This patch retires the three older, overlapping sidebar entries so drivers
 * have a single canonical place to look:
 *
 *   • "Reikningar"        — #_reik_nav_btn   (legacy reikningar modal, 00-legacy)
 *   • "Kreditreikningur"  — ._cbn-nav-btn    (credit-by-num launcher, patch 92)
 *   • "Kúnnareikningur"   — ._kr-nav-btn     (kúnnareikningur picker, patch 144)
 *
 * None of these buttons carries a data-view, so we target them by their
 * stable id / class hooks instead (the data-view CSS form used by patch 162
 * does not apply here).
 *
 * Only the SIDEBAR ENTRIES are hidden. The underlying modals / pickers stay in
 * the DOM and remain reachable programmatically (openReikModal(),
 * KunnaReikningur.open(), the credit-by-num lookup, plus the in-modal
 * "↩ Kreditfæra reikning" header buttons — those use a different class and are
 * NOT matched here), so nothing breaks and the change is fully reversible by
 * deleting this file.
 *
 * Mirrors patch 162's approach: a CSS !important rule rather than an inline
 * style, because patches 68 (sidebar-reorder), 15 (sidebar counts) and 180
 * (sidebar-stabilize) rebuild/touch the nav after the injectors run, which
 * would drop an inline style. The injectors always re-add the same id/class,
 * so the selector keeps matching the freshly-injected button.
 *
 * Built 2026-06-04. Reversible: just delete this patch file.
 */
(() => {
  if (window.__retireOldInvoiceNavsInstalled) return;
  window.__retireOldInvoiceNavsInstalled = true;

  const STYLE_ID = 'retire-old-invoice-navs-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      nav.view-nav #_reik_nav_btn,
      .view-nav #_reik_nav_btn,
      #_reik_nav_btn.vnav-btn,
      nav.view-nav ._cbn-nav-btn,
      .view-nav ._cbn-nav-btn,
      .vnav-btn._cbn-nav-btn,
      nav.view-nav ._kr-nav-btn,
      .view-nav ._kr-nav-btn,
      .vnav-btn._kr-nav-btn {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(s);
  }

  console.log('[retire-old-invoice-navs v1] CSS-hide installed — Reikningar / Kreditreikningur / Kúnnareikningur retired in favour of Kröfu yfirlit');
})();
/* === END RETIRE OLD INVOICE NAVS === */
