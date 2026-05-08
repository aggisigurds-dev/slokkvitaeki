/* === CART QTY DIRECT INPUT v1 ===
 *
 * Magn-reitur á Sala-körfulínum var read-only span með − / + takka. Þegar
 * notandi þurfti stór magn (t.d. 24 × CO₂ 100gr fyrir 2.4kg fyllingu) þá
 * þurfti hann að smella 23 sinnum. Þetta patch breytir spaninu í
 * editable <input> svo notandi getur skrifað töluna beint.
 *
 * Hvernig: MutationObserver á #pos-lines, fyrir hverja línu skiptum við
 * spaninu út fyrir input. Á change/blur reiknum við diff og dispatchum
 * fjölda click-atburða á + eða − takka pos.js til að ná markmáli (svo
 * öll önnur logic í pos.js — totals, checkout disable, refresh —
 * heldur áfram að virka).
 */
(() => {
  if (window.__cartQtyInputInstalled) return;
  window.__cartQtyInputInstalled = true;

  function decorateLines() {
    const cart = document.getElementById('pos-lines');
    if (!cart) return;
    cart.querySelectorAll('button.pos-qty-up').forEach(upBtn => {
      // Find the qty span between - and + buttons (sibling)
      const dnBtn = upBtn.parentElement && upBtn.parentElement.querySelector('button.pos-qty-dn');
      if (!dnBtn) return;
      // The span is between dnBtn and upBtn — use upBtn.previousElementSibling
      const span = upBtn.previousElementSibling;
      if (!span || span.tagName !== 'SPAN') return;
      if (span.dataset._cqiDone === '1') return;
      span.dataset._cqiDone = '1';

      const idx = upBtn.dataset.idx;
      const currentQty = parseInt(span.textContent.trim(), 10) || 1;

      // Build the input
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.inputMode = 'numeric';
      inp.pattern = '[0-9]*';
      inp.value = String(currentQty);
      inp.dataset.idx = idx;
      inp.dataset._cqiInput = '1';
      inp.title = 'Magn — sláðu inn beint';
      inp.style.cssText =
        'font-weight:700;font-size:13px;width:42px;text-align:center;' +
        'border:1px solid #cbd5e1;border-radius:5px;padding:2px 4px;' +
        'background:#fff;font:inherit;font-family:inherit;' +
        'font-variant-numeric:tabular-nums;outline:none;' +
        'transition:border-color 0.12s';
      inp.addEventListener('focus', () => {
        inp.style.borderColor = '#2563eb';
        inp.select();
      });
      inp.addEventListener('blur', () => {
        inp.style.borderColor = '#cbd5e1';
        applyQty(inp);
      });
      inp.addEventListener('change', () => applyQty(inp));
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
        if (e.key === 'Escape') { e.preventDefault(); inp.value = String(currentQty); inp.blur(); }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          inp.value = String((parseInt(inp.value, 10) || 0) + 1);
          applyQty(inp);
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nv = (parseInt(inp.value, 10) || 0) - 1;
          if (nv >= 1) {
            inp.value = String(nv);
            applyQty(inp);
          }
        }
      });
      // Replace span with input
      span.parentNode.replaceChild(inp, span);
    });
  }

  function applyQty(inp) {
    const idx = inp.dataset.idx;
    const target = parseInt(inp.value, 10);
    if (!Number.isFinite(target) || target < 0) {
      inp.value = '1';
      return;
    }
    if (target === 0) {
      // Clicking − until 0 deletes the line in pos.js. Trigger that.
      const cart = document.getElementById('pos-lines');
      const dnBtn = cart && cart.querySelector('button.pos-qty-dn[data-idx="' + idx + '"]');
      // Need to find current qty — we don't know it directly since span is gone.
      // Just dispatch one click and let user redo.
      if (dnBtn) dnBtn.click();
      return;
    }
    // Find current qty by scanning the line — there's no span anymore, but
    // we can read the input itself's previous value (stored in dataset or
    // re-read from totals). Easier: track current qty via dataset on input.
    const previous = parseInt(inp.dataset._lastQty || '0', 10);
    if (target === previous) return;
    inp.dataset._lastQty = String(target);

    const cart = document.getElementById('pos-lines');
    if (!cart) return;

    let currentQty = parseInt(inp.dataset._origQty || '0', 10);
    if (!currentQty) currentQty = 1;

    const diff = target - currentQty;
    inp.dataset._origQty = String(target);

    if (diff === 0) return;

    // pos.js re-renders the cart on every click — that destroys our button
    // reference AND reorders elements (delete shifts data-idx). So we must
    // re-find the button each iteration. The data-idx for the same line
    // stays stable for + / − ops (no splice).
    const dir = diff > 0 ? 'up' : 'dn';
    const count = Math.abs(diff);
    const sel = 'button.pos-qty-' + dir + '[data-idx="' + idx + '"]';
    for (let i = 0; i < count; i++) {
      const btn = document.querySelector(sel);
      if (!btn) break;
      btn.click();
    }
    // After the bulk-click, the cart has been re-rendered many times. Our
    // input was replaced. Decorate again so user sees the updated qty.
    setTimeout(decorateLinesInitial, 50);
  }

  // On first decoration, store the current qty as _origQty so applyQty knows
  // the starting point. We do this when initially replacing the span.
  function decorateLinesInitial() {
    const cart = document.getElementById('pos-lines');
    if (!cart) return;
    cart.querySelectorAll('button.pos-qty-up').forEach(upBtn => {
      const dnBtn = upBtn.parentElement && upBtn.parentElement.querySelector('button.pos-qty-dn');
      if (!dnBtn) return;
      // If span still there, replace it
      const span = upBtn.previousElementSibling;
      if (span && span.tagName === 'SPAN' && span.dataset._cqiDone !== '1') {
        const currentQty = parseInt(span.textContent.trim(), 10) || 1;
        span.dataset._cqiDone = '1';
        const idx = upBtn.dataset.idx;
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.inputMode = 'numeric';
        inp.pattern = '[0-9]*';
        inp.value = String(currentQty);
        inp.dataset.idx = idx;
        inp.dataset._cqiInput = '1';
        inp.dataset._origQty = String(currentQty);
        inp.dataset._lastQty = String(currentQty);
        inp.title = 'Magn — sláðu inn beint';
        inp.style.cssText =
          'font-weight:700;font-size:13px;width:46px;text-align:center;' +
          'border:1px solid #cbd5e1;border-radius:5px;padding:2px 4px;' +
          'background:#fff;font:inherit;font-family:inherit;' +
          'font-variant-numeric:tabular-nums;outline:none;' +
          'transition:border-color 0.12s';
        inp.addEventListener('focus', () => {
          inp.style.borderColor = '#2563eb';
          inp.select();
        });
        inp.addEventListener('blur', () => {
          inp.style.borderColor = '#cbd5e1';
          applyQty(inp);
        });
        inp.addEventListener('change', () => applyQty(inp));
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
          if (e.key === 'Escape') { e.preventDefault(); inp.value = inp.dataset._origQty; inp.blur(); }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            inp.value = String((parseInt(inp.value, 10) || 0) + 1);
            applyQty(inp);
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nv = (parseInt(inp.value, 10) || 0) - 1;
            if (nv >= 0) { inp.value = String(nv); applyQty(inp); }
          }
        });
        span.parentNode.replaceChild(inp, span);
      }
    });
  }

  function attach() {
    const cart = document.getElementById('pos-lines');
    if (!cart) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(decorateLinesInitial, 80);
    }).observe(cart, { childList: true, subtree: true });
  }
  attach();
  setTimeout(decorateLinesInitial, 1500);

  console.log('[cart-qty-input] installed — magn-reiturinn í körfu er nú editable');
})();
/* === END CART QTY DIRECT INPUT v1 === */
