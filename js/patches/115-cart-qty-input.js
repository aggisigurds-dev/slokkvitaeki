/* === CART QTY DIRECT INPUT v2 ===
 *
 * Magn-reitur á Sala-körfulínum var read-only span með − / + takka. Þetta
 * patch breytir spaninu í editable <input> svo notandi getur slegið töluna
 * beint inn (t.d. 24 × CO₂ 100gr fyrir 2.4kg fyllingu) frekar en að smella
 * + 23 sinnum.
 *
 * v2 (2026-05-21): rewrote from the bulk-click chain to direct state
 * mutation via window.POS.getState() + POS.rerenderDynamic(). The previous
 * approach dispatched many synthetic click events which competed with
 * pos.js's own re-renders mid-loop and silently fell apart when other
 * patches (105 sala-line-units, 118 cart-savings) touched the cart DOM.
 *
 * Side-effect: pressing Enter blurs (commits). Esc reverts to previous qty.
 * Arrow keys nudge by 1. Setting qty to 0 deletes the line.
 */
(() => {
  if (window.__cartQtyInputInstalled) return;
  window.__cartQtyInputInstalled = true;

  function getPOS() { return window.POS && typeof window.POS.getState === 'function' ? window.POS : null; }

  // Find the qty <span> for a given pos-qty-up button.
  // Structure (pos.js):  [-]  [span: qty]  [+]   — siblings inside row 2.
  function findQtySpan(upBtn) {
    const sib = upBtn.previousElementSibling;
    if (sib && sib.tagName === 'SPAN' && sib.dataset._cqiDone !== '1') return sib;
    return null;
  }

  function applyQty(idx, newQty) {
    const POS = getPOS();
    if (!POS) return false;
    const state = POS.getState();
    if (!state || !Array.isArray(state.lines)) return false;
    const line = state.lines[idx];
    if (!line) return false;
    const target = Math.max(0, Math.floor(+newQty || 0));
    if (target === 0) {
      state.lines.splice(idx, 1);
    } else {
      line.qty = target;
    }
    if (typeof POS.rerenderDynamic === 'function') POS.rerenderDynamic();
    return true;
  }

  function makeInput(idx, currentQty) {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.inputMode = 'numeric';
    inp.pattern = '[0-9]*';
    inp.value = String(currentQty);
    inp.dataset.idx = idx;
    inp.dataset._cqiInput = '1';
    inp.dataset._lastQty = String(currentQty);
    inp.title = 'Magn — sláðu inn beint';
    inp.style.cssText =
      'width:46px;text-align:center;font-weight:700;font-size:13px;' +
      'border:1px solid #cbd5e1;border-radius:5px;padding:2px 4px;' +
      'background:#fff;font-family:inherit;font-variant-numeric:tabular-nums;' +
      'outline:none;transition:border-color .12s';
    inp.addEventListener('focus', () => { inp.style.borderColor = '#2563eb'; inp.select(); });
    inp.addEventListener('blur',  () => {
      inp.style.borderColor = '#cbd5e1';
      const target = parseInt(inp.value, 10);
      if (!Number.isFinite(target) || target < 0) {
        inp.value = inp.dataset._lastQty || '1';
        return;
      }
      const last = parseInt(inp.dataset._lastQty || '0', 10);
      if (target === last) return;
      applyQty(+inp.dataset.idx, target);
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); inp.blur(); return; }
      if (e.key === 'Escape') { e.preventDefault(); inp.value = inp.dataset._lastQty || '1'; inp.blur(); return; }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        inp.value = String((parseInt(inp.value, 10) || 0) + 1);
        applyQty(+inp.dataset.idx, +inp.value);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nv = (parseInt(inp.value, 10) || 0) - 1;
        if (nv >= 0) { inp.value = String(nv); applyQty(+inp.dataset.idx, nv); }
        return;
      }
    });
    return inp;
  }

  function decorateLines() {
    const cart = document.getElementById('pos-lines');
    if (!cart) return;
    cart.querySelectorAll('button.pos-qty-up').forEach(upBtn => {
      const idx = upBtn.dataset.idx;
      if (idx == null) return;
      const span = findQtySpan(upBtn);
      if (!span) return;
      const currentQty = parseInt((span.textContent || '').trim(), 10) || 1;
      span.dataset._cqiDone = '1';
      const inp = makeInput(idx, currentQty);
      span.parentNode.replaceChild(inp, span);
    });
  }

  function attach() {
    const cart = document.getElementById('pos-lines');
    if (!cart) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(decorateLines, 60);
    }).observe(cart, { childList: true, subtree: true });
    decorateLines();
  }
  attach();
  setTimeout(decorateLines, 1200);
  setTimeout(decorateLines, 3000);

  console.log('[cart-qty-input v2] installed — magn-reiturinn í körfu er nú editable');
})();
/* === END CART QTY DIRECT INPUT v2 === */
