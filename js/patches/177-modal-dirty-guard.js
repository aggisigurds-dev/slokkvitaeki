/* === MODAL DIRTY-GUARD (177) =============================================
 *
 * Many modals in the app are dismissed when the user clicks the dark
 * backdrop around them — fine for read-only dialogs, but VERY annoying
 * when filling a long form (þjónustusamningur, eqedit, info-edit, etc.).
 * One stray finger-tap and the half-filled form vanishes.
 *
 * This patch intercepts backdrop clicks across the whole app and, if the
 * modal contains user-entered data (any input/textarea/select with a
 * non-default value), shows a "Loka samt? Ósvistaðar breytingar" confirm
 * before letting the close happen.
 *
 * Implementation:
 *   • Document-level click listener in CAPTURE phase, runs BEFORE the
 *     modal's own onclick handler.
 *   • Detect "backdrop click" heuristically: target === currentTarget of
 *     a fixed/absolute element with rgba/dark background and inset:0.
 *   • Walk inputs inside. Compare current values vs. their original
 *     `defaultValue` / `data-original` to decide if the form is dirty.
 *   • If dirty → preventDefault + stopPropagation + confirm dialog.
 *
 * This is a safety net, NOT a behavior change for clean modals.
 * ====================================================================== */
(() => {
  if (window.__modalDirtyGuardInstalled) return;
  window.__modalDirtyGuardInstalled = true;

  function isBackdropLike(el) {
    if (!el || !el.style) return false;
    const cs = window.getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'absolute') return false;
    // Cover most of viewport (full-screen overlay)
    const rect = el.getBoundingClientRect();
    if (rect.width < window.innerWidth * 0.9 || rect.height < window.innerHeight * 0.9) return false;
    // Some dark/translucent background indicates a backdrop
    const bg = cs.backgroundColor || '';
    return /rgba\(.+0\.[2-9]\d*\)/.test(bg) || /rgba\(.+,\s*0\.[1-9]/.test(bg) || el.style.background?.includes('rgba');
  }

  function isFormDirty(modal) {
    const inputs = modal.querySelectorAll('input,textarea,select');
    for (const inp of inputs) {
      // Skip hidden / readonly
      if (inp.type === 'hidden' || inp.readOnly || inp.disabled) continue;
      // Compare to defaultValue / data-original
      const orig = inp.dataset.original != null ? inp.dataset.original : (inp.defaultValue || '');
      if (inp.type === 'checkbox' || inp.type === 'radio') {
        if (inp.checked !== inp.defaultChecked) return true;
        continue;
      }
      const cur = String(inp.value || '');
      if (cur.trim() !== String(orig).trim() && cur.trim() !== '') return true;
    }
    return false;
  }

  document.addEventListener('click', e => {
    // Backdrop click is when target === currentTarget for a fixed-position element
    // We check the target directly: is it a backdrop-like element?
    const t = e.target;
    if (!t || !isBackdropLike(t)) return;
    // Only fires when user clicks the backdrop itself (not inner content)
    // because clicks on children would have e.target = the child, not backdrop
    if (!isFormDirty(t)) return;
    // Dirty + backdrop click → block + confirm
    if (!confirm('Loka samt? Þú hefur óvistaðar breytingar í þessari skjámynd.')) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return;
    }
    // User confirmed → allow normal close handler (modal.remove()) to run
    // Most modal handlers compare e.target === modal; we don't break that —
    // we just let the existing handler proceed. The propagation continued
    // because we didn't stop it on the "yes" branch.
  }, true);  // capture phase = runs before the modal's own onclick

  console.log('[patch-177] modal dirty-guard ready — backdrop click on dirty forms now asks first');
})();
