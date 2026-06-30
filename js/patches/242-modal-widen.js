/* === MODAL WIDEN v1 ===
 * Widens canonical modals (.modal.open > .modal-hd/.modal-bd/.modal-ft) so they
 * sit closer to the screen edges instead of the cramped 560px center column.
 * Applies GLOBALLY (every theme) per user intent: "modals should be wider —
 * closer to screen edges, not narrowly centered".
 *
 * New width: min(1100px, calc(100vw - 64px)) — caps at 1100px on big screens,
 * leaves 32px of breathing room on each side at smaller widths.
 *
 * Cascade strategy:
 *   - Same selector + !important as css/app.css:3553-3584 (the canonical
 *     MODAL FIX block), so specificity is equal — loads AFTER all CSS / patches
 *     in index.html, so source-order wins.
 *   - Confirm dialogs (.modal-sm) explicitly excluded via :not(.modal-sm) so
 *     they stay narrow (380px) — the body rule below targets the same
 *     {hd,bd,ft} only when the parent is NOT .modal-sm.
 *   - Mobile (<=480px): keeps 96vw to preserve mobile.css behavior.
 *
 * Per-patch custom containers (.sm-modal, .ct-modal, .gs-modal, ._ars-modal,
 * #floorplan-modal, etc.) are NOT touched — they own their own width.
 *
 * Pure CSS injection, no DOM mutations beyond head append.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__modalWidenInstalled) return;
  window.__modalWidenInstalled = true;

  const STYLE_ID = 'modal-widen-css';
  if (document.getElementById(STYLE_ID)) return;

  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    /* Widen canonical modals — beats css/app.css:3553-3584 by source order */
    .modal.open:not(.modal-sm) > .modal-hd,
    .modal.open:not(.modal-sm) > .modal-bd,
    .modal.open:not(.modal-sm) > .modal-ft {
      width: min(1100px, calc(100vw - 64px)) !important;
      max-width: 1100px !important;
    }

    /* Give the body a bit more vertical room too (130px ~ hd+ft+margins) */
    .modal.open > .modal-bd {
      max-height: calc(92vh - 130px) !important;
    }

    /* Mobile guard — keep 96vw to match mobile.css behavior */
    @media (max-width: 480px) {
      .modal.open > .modal-hd,
      .modal.open > .modal-bd,
      .modal.open > .modal-ft {
        width: 96vw !important;
        max-width: 96vw !important;
      }
    }
  `;
  document.head.appendChild(s);
})();
