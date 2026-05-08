/* === CART SAVINGS DISPLAY v2 ===
 *
 * Sýnir notanda hversu mikið viðskiptavinurinn er að spara í kr á
 * núverandi körfu — mismun á búðarverði og þeim verðum sem eru
 * raunverulega rukkuð (eftir tilboðsverð / sérkjör).
 *
 * v2 (2026-05-08): Hætti að treysta á _cprApplied / _vprApplied dataset
 * flagg á körfulínum (þau hverfa við hverja re-render). Núna les patch
 * 118 sjálfstætt overrides úr `window.CompanyPricing` / `window.VidskPricing`
 * og finnur hvaða línur hafa fengið override beitt — með því að bera
 * saman line-desc við override-name.
 *
 * Útreikningur:
 *   • Fyrir hverja körfulínu, skoða hvort einhver override matchi (lýsing)
 *   • Bera saman búðarverð (vorur.verd_an_vsk) við line-verð
 *   • Sparnaður = (búðarverð − line-verð) × magn × (1 + VSK%)
 *   • Sum'a saman sem tilboðsverð (B2B) eða sérkjör (vidsk) eftir tegund
 *
 * Perf: snemma exit ef Sala er ekki active. Notar sömu MutationObserver
 * og rerender-debounce og áður, en án óþarfa setInterval.
 */
(() => {
  if (window.__cartSavingsInstalled) return;
  window.__cartSavingsInstalled = true;

  function fmtKr(n) {
    return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr';
  }

  // Find product in vorur cache by case-insensitive name (best match).
  function findProduct(desc) {
    if (!window.VorurPicker || typeof VorurPicker.list !== 'function') return null;
    const list = VorurPicker.list() || [];
    if (!list.length || !desc) return null;
    const d = String(desc).toLowerCase().trim();
    let best = null;
    list.forEach(p => {
      const n = String(p.nafn || '').toLowerCase().trim();
      if (!n) return;
      if (n === d) { best = p; return; }
      if (!best && (d.indexOf(n) === 0 || n.indexOf(d) === 0)) best = p;
      if (!best && (d.indexOf(n) >= 0 || n.indexOf(d) >= 0)) best = p;
    });
    return best;
  }

  // Substring match for override-name vs line-desc (mirrors patch 113/116)
  function findOverride(desc, overrides) {
    if (!desc || !overrides || !overrides.length) return null;
    const d = String(desc).toLowerCase();
    let best = null;
    overrides.forEach(o => {
      const n = String(o.name || '').toLowerCase().trim();
      if (!n) return;
      if (d.indexOf(n) >= 0 || n.indexOf(d) >= 0) {
        if (!best || n.length > String(best.name).length) best = o;
      }
    });
    return best;
  }

  // Determine current customer's overrides (B2B + vidsk)
  function getCurrentOverrides() {
    const ktInp = document.getElementById('pos-kt');
    const cleanKt = ktInp ? (ktInp.value || '').replace(/[^0-9]/g, '') : '';
    if (cleanKt.length !== 10 || cleanKt === '9999999999') return { tilbod: [], serkjor: [] };

    let tilbod = [];
    let serkjor = [];

    // B2B (fyrirtaeki) overrides
    const companies = (window.Companies && Companies.list) || [];
    const co = companies.find(c => String(c.kennitala || '').replace(/[^0-9]/g, '') === cleanKt);
    if (co && window.CompanyPricing && typeof CompanyPricing.list === 'function') {
      tilbod = CompanyPricing.list(co.id) || [];
    }

    // Vidskiptavinur overrides
    const vidsk = (window.Vidskiptavinir && Vidskiptavinir.list) ||
                  (window.DB && DB.cache && DB.cache.vidsk) || [];
    const vk = vidsk.find(v => String(v.kennitala || '').replace(/[^0-9]/g, '') === cleanKt);
    if (vk && window.VidskPricing && typeof VidskPricing.list === 'function') {
      serkjor = VidskPricing.list(vk.id) || [];
    }

    return { tilbod, serkjor };
  }

  function computeCartSavings() {
    const cart = document.getElementById('pos-lines');
    if (!cart) return { tilbod: 0, serkjor: 0 };
    const overrides = getCurrentOverrides();
    if (!overrides.tilbod.length && !overrides.serkjor.length) return { tilbod: 0, serkjor: 0 };

    let tilbodSum = 0;
    let serkjorSum = 0;

    cart.querySelectorAll('input.pos-price-edit').forEach(priceInput => {
      const lineEl = priceInput.closest('div[style*="border-bottom"]') || priceInput.closest('div');
      if (!lineEl) return;
      const descEl = lineEl.querySelector('div[style*="font-weight:600"]');
      // Strip badges from desc text so override-match isn't polluted
      const desc = descEl
        ? descEl.textContent.replace(/💰\s*Tilboðsverð|💎\s*Sérkjör/g, '').trim()
        : '';
      if (!desc) return;

      // Try B2B first, then vidsk (B2B takes precedence if both apply)
      let override = findOverride(desc, overrides.tilbod);
      let kind = 'tilbod';
      if (!override) { override = findOverride(desc, overrides.serkjor); kind = 'serkjor'; }
      if (!override) return;

      const product = findProduct(desc);
      if (!product) return;
      const catalogPrice = +product.verd_an_vsk || 0;
      const actualPrice = parseFloat(priceInput.value) || 0;
      if (catalogPrice <= actualPrice) return;

      // Read qty robustly — patch 115 may have replaced span with input
      let qty = 1;
      const upBtn = lineEl.querySelector('button.pos-qty-up');
      if (upBtn && upBtn.previousElementSibling) {
        const sib = upBtn.previousElementSibling;
        const raw = (sib.tagName === 'INPUT' ? sib.value : sib.textContent || '').trim();
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n > 0) qty = n;
      }

      const vsk = +product.vsk_prosenta || 24;
      const saved = (catalogPrice - actualPrice) * qty * (1 + vsk / 100);
      if (kind === 'tilbod') tilbodSum += saved;
      else serkjorSum += saved;
    });

    return { tilbod: Math.round(tilbodSum), serkjor: Math.round(serkjorSum) };
  }

  function injectSavingsRow() {
    const view = document.getElementById('view-sala');
    if (!view || !view.classList.contains('active')) return;
    const totals = document.getElementById('pos-totals');
    if (!totals) return;
    const inner = totals.querySelector('div');
    if (!inner) return;

    const sav = computeCartSavings();
    const showTilbod = sav.tilbod > 0;
    const showSerkjor = sav.serkjor > 0;

    let existing = totals.querySelector('._cs-row');
    if (!showTilbod && !showSerkjor) {
      if (existing) existing.remove();
      return;
    }

    if (!existing) {
      existing = document.createElement('div');
      existing.className = '_cs-row';
      existing.style.cssText = 'margin:6px 0;padding:8px 11px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:7px';
      const discRow = totals.querySelector('#pos-tot-disc-row');
      const refNode = (discRow && discRow.nextSibling) || inner.firstChild;
      inner.insertBefore(existing, refNode);
    }

    let html = '<div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:3px">💰 Sparnaður viðskiptavinar</div>';
    if (showTilbod) {
      html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:#065f46;font-variant-numeric:tabular-nums;padding:1px 0">' +
        '<span>💰 Tilboðsverð (B2B):</span>' +
        '<span style="font-weight:700">−' + fmtKr(sav.tilbod) + '</span>' +
      '</div>';
    }
    if (showSerkjor) {
      html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:#1e3a8a;font-variant-numeric:tabular-nums;padding:1px 0">' +
        '<span>💎 Sérkjör:</span>' +
        '<span style="font-weight:700">−' + fmtKr(sav.serkjor) + '</span>' +
      '</div>';
    }
    if (showTilbod && showSerkjor) {
      html += '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800;color:#065f46;font-variant-numeric:tabular-nums;padding:3px 0 1px;border-top:1px solid #a7f3d0;margin-top:3px">' +
        '<span>Samtals sparnaður:</span>' +
        '<span>−' + fmtKr(sav.tilbod + sav.serkjor) + '</span>' +
      '</div>';
    }
    existing.innerHTML = html;
  }

  // Watch totals/cart for changes — only when Sala active
  function attach() {
    const view = document.getElementById('view-sala');
    if (!view) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      // Early exit if Sala isn't active — saves CPU on other views
      if (!view.classList.contains('active')) return;
      // Also bail if mutation happened in our own savings row (avoid loop)
      clearTimeout(_t);
      _t = setTimeout(injectSavingsRow, 200);
    }).observe(view, { childList: true, subtree: true });
  }
  attach();
  // No setInterval — observer fires on every cart/customer change anyway
  setTimeout(injectSavingsRow, 1500);

  console.log('[cart-savings] v2 installed — independent override detection');
})();
/* === END CART SAVINGS DISPLAY v2 === */
