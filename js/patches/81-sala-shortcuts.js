/* === SALA SHORTCUTS v3 — duplicate removed ===
 * v1/v2 added a "🧾 Bókhald" shortcut button into the cart (KARFA) header,
 * next to "+ Annað". pos.js now renders its OWN "Bókhald" button there
 * (id=pos-bokhald → opens Bókhalds yfirlit), so this shortcut became a
 * DUPLICATE (the black button that popped in ~1s after load, styled by the
 * brunastal theme). Vefrýni 2026-06-23: Agnar flagged the double button.
 *
 * v3 no longer adds a button and actively REMOVES any "_sala_shortcut_by" that
 * an older cached copy may have inserted — leaving the single native
 * pos-bokhald button.
 */
(() => {
  if (window.__salaShortcutsInstalled) return;
  window.__salaShortcutsInstalled = true;

  function cleanup() {
    document.querySelectorAll('._sala_shortcut_by').forEach(b => b.remove());
  }

  cleanup();
  document.addEventListener('view-shown', e => {
    if (e && e.detail && e.detail.name === 'sala') setTimeout(cleanup, 100);
  });
  // mirror the old retry chain so the duplicate is removed whenever it would
  // previously have been (re-)added.
  setTimeout(cleanup, 500);
  setTimeout(cleanup, 1500);
  setTimeout(cleanup, 2500);
  console.log('[sala-shortcuts v3] duplicate Bókhald button removed');
})();
/* === END SALA SHORTCUTS === */
