/* Byrjunargjald-haki á körfunni á Sölu.
 *
 * Bætir litlu hakaboxi „🚚 Byrjunargjald 1.000 kr" milli totals og áfram-takka.
 * Þegar hakað er á → kerfi bætir „CO₂ byrjunargjald" (úr vörum, 1000 kr +
 * VSK) sjálfvirkt í körfu.  Þegar afhakað er → línan er fjarlægð.
 *
 * Hakar ekki sjálfvirkt — notandi velur ef við á (ekki á öllum sölum).
 */
(() => {
  if (window.__byrjunargjaldToggleInstalled) return;
  window.__byrjunargjaldToggleInstalled = true;

  const PRODUCT_NAME_RX = /byrjun[ar]gjald/i;
  let _byrjunarProduct = null; // cached

  async function loadProduct() {
    if (_byrjunarProduct) return _byrjunarProduct;
    const sb = window.DB && window.DB.sb;
    if (!sb) return null;
    const { data } = await sb.from('vorur')
      .select('id,nafn,verd_an_vsk,vsk_prosenta')
      .ilike('nafn', '%byrjun%')
      .eq('virkt', true)
      .order('nafn')
      .limit(1)
      .maybeSingle();
    _byrjunarProduct = data || null;
    return _byrjunarProduct;
  }

  function cartHasByrjunar(state) {
    return (state.lines || []).some(l => PRODUCT_NAME_RX.test(l.desc || ''));
  }

  function addByrjunar(state, product) {
    if (cartHasByrjunar(state)) return false;
    state.lines.push({
      type: 'product',
      desc: product.nafn,
      qty: 1,
      unit_price_ex_vat: +product.verd_an_vsk || 1000,
      vsk_pct: +product.vsk_prosenta || 24,
      product_id: product.id,
      ref: ''
    });
    return true;
  }

  function removeByrjunar(state) {
    const before = state.lines.length;
    state.lines = (state.lines || []).filter(l => !PRODUCT_NAME_RX.test(l.desc || ''));
    return state.lines.length !== before;
  }

  function rerenderCart() {
    // Mirror what pos.js rerenderDynamic does
    const linesEl = document.getElementById('pos-lines');
    const totalsEl = document.getElementById('pos-totals');
    if (window.POS && typeof POS.totals === 'function') {
      // pos.js exposes rerenderDynamic only internally; trigger via input
      // event on a line input (no-op effect but pos.js wires this to total
      // recompute). Simpler: just call buildLinesHTML via a tiny dispatch.
      try {
        const evt = new Event('input', { bubbles: true });
        document.dispatchEvent(evt);
      } catch(_){}
    }
    // Force a re-render by dispatching cart-changed
    document.dispatchEvent(new CustomEvent('pos-cart-changed'));
    // Also re-render via direct call if available
    if (window.POS && POS.rerenderDynamic) POS.rerenderDynamic();
  }

  // 2026-05-12: Show the byrjunargjald toggle only when the cart contains
  // CO₂ 100gr (the only service where the user actually charges this fee).
  const CO2_100GR_RX = /co.{0,2}2.*100\s*gr|100\s*gr.*co.{0,2}2/i;
  function cartHasCo2Refill(state) {
    return (state.lines || []).some(l => CO2_100GR_RX.test(l.desc || ''));
  }

  function setToggleVisibility(state) {
    const wrap = document.getElementById('_bg-toggle-wrap');
    if (!wrap) return;
    const show = cartHasCo2Refill(state);
    wrap.style.display = show ? 'flex' : 'none';
    // If we hid the toggle but byrjunargjald is in cart, leave the line
    // alone — user explicitly added it earlier.
  }

  function injectToggle() {
    const totalsEl = document.getElementById('pos-totals');
    if (!totalsEl) return;
    if (document.getElementById('_bg-toggle-wrap')) return;
    const wrap = document.createElement('label');
    wrap.id = '_bg-toggle-wrap';
    wrap.style.cssText = 'display:none;align-items:center;gap:8px;margin-top:8px;padding:8px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a;cursor:pointer;user-select:none';
    wrap.innerHTML =
      '<input type="checkbox" id="_bg-toggle" style="width:16px;height:16px;cursor:pointer;accent-color:#16a34a">' +
      '<span style="flex:1">🚚 Byrjunargjald</span>' +
      '<span id="_bg-price" style="font-weight:600;color:#64748b">1.240 kr</span>';
    totalsEl.parentNode.insertBefore(wrap, totalsEl.nextSibling);

    const cb = wrap.querySelector('#_bg-toggle');
    const priceEl = wrap.querySelector('#_bg-price');
    loadProduct().then(p => {
      if (!p) {
        wrap.style.opacity = '.55';
        cb.disabled = true;
        wrap.title = 'CO₂ byrjunargjald vara ekki fundin í Vörur og þjónusta';
        priceEl.textContent = '?';
        return;
      }
      const inc = (+p.verd_an_vsk || 0) * (1 + (+p.vsk_prosenta || 24) / 100);
      priceEl.textContent = Math.round(inc).toLocaleString('is-IS') + ' kr';
    });

    // Sync checkbox to current cart state.
    function syncFromCart() {
      const state = (window.POS && POS.getState && POS.getState()) || null;
      if (!state) return;
      // Visibility tied to CO₂ 100gr line being present.
      setToggleVisibility(state);
      cb.checked = cartHasByrjunar(state);
      wrap.style.background = cb.checked ? '#dcfce7' : '#f8fafc';
      wrap.style.borderColor = cb.checked ? '#86efac' : '#e2e8f0';
    }
    syncFromCart();

    cb.addEventListener('change', async () => {
      const state = (window.POS && POS.getState && POS.getState()) || null;
      if (!state) return;
      const product = await loadProduct();
      if (!product) { cb.checked = false; return; }
      if (cb.checked) addByrjunar(state, product);
      else removeByrjunar(state);
      // Trigger pos.js to redraw cart + totals
      if (window.POS && typeof POS.rerenderDynamic === 'function') {
        POS.rerenderDynamic();
      } else {
        // Fallback — synth input on something pos.js watches
        const inp = document.querySelector('.pos-price-edit');
        if (inp) inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
      syncFromCart();
    });

    // Keep in sync when other patches change the cart.
    new MutationObserver(syncFromCart).observe(
      document.getElementById('pos-lines'), { childList: true, subtree: true }
    );
  }

  function attach() {
    const totalsEl = document.getElementById('pos-totals');
    if (!totalsEl) { setTimeout(attach, 600); return; }
    injectToggle();
    // Re-inject if cart UI re-renders (Sala view loads fresh).
    new MutationObserver(() => {
      const t = document.getElementById('pos-totals');
      if (t && !document.getElementById('_bg-toggle-wrap')) injectToggle();
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();

  console.log('[byrjunargjald-toggle] installed');
})();
