/* === SALA FROM SETTINGS v2 ===
 *
 * Wires AppSettings (patch 85) into the Sala POS view. Rewritten after v1
 * crashed the page — see memory feedback_patch_87_caution.md for context.
 *
 * Hard rules for this patch:
 *   1. NO body-wide MutationObserver (v1 looped infinitely on its own writes).
 *   2. Every DOM call wrapped in try/catch, silent on failure.
 *   3. Run only on `view-shown` (sala) and `AppSettings.onChange()`.
 *   4. Idempotent rebuild — short-circuit if state matches last apply.
 *   5. Tile reordering happens at most once per view-shown.
 *
 * Wires:
 *   • shortcuts[] → row of quick-action buttons above the services grid
 *   • sala.hidden_product_ids → hides those tiles in #pos-products
 *   • sala.pinned_product_ids → outline on those tiles (no reordering since 05.11.2026)
 *   • sala.sort_order / position_orders — NOT honored any more (05.11.2026): order = vorur.rodun
 *     (496 „Raða" saves it, 498 syncs it, pos.js sortTiles reads it). One source of truth.
 */
(() => {
  if (window.__salaFromSettingsV2Installed) return;
  window.__salaFromSettingsV2Installed = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function safe(fn, tag) {
    try { return fn(); } catch (e) {
      console.warn('[sala-from-settings] ' + (tag || ''), e && e.message);
    }
  }
  function getShortcuts() {
    if (!window.AppSettings) return [];
    const v = window.AppSettings.path('shortcuts');
    return Array.isArray(v) ? v.filter(s => s && s.label && +s.price > 0) : [];
  }
  function getSala() {
    if (!window.AppSettings) return {};
    const v = window.AppSettings.path('sala');
    return v && typeof v === 'object' ? v : {};
  }

  // ── Shortcut buttons ──────────────────────────────────────────────────────
  let _lastShortcutsKey = null;
  function injectShortcuts() {
    const services = document.getElementById('pos-services');
    if (!services) return;
    const card = services.parentElement;
    if (!card) return;
    const items = getShortcuts();
    const key = JSON.stringify(items);
    let strip = card.querySelector('._sfs-strip');

    if (!items.length) {
      if (strip) strip.remove();
      _lastShortcutsKey = '[]';
      return;
    }
    if (strip && key === _lastShortcutsKey) return;

    if (!strip) {
      strip = document.createElement('div');
      strip.className = '_sfs-strip';
      strip.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px';
      const sectTitle = card.querySelector('div[style*="text-transform:uppercase"]');
      if (sectTitle && sectTitle.parentElement === card) {
        sectTitle.insertAdjacentElement('afterend', strip);
      } else {
        card.insertBefore(strip, services);
      }
    }

    strip.innerHTML = items.map(s => {
      const incVat = Math.round(+s.price);
      return '<button type="button" class="_sfs-btn" ' +
        'data-label="' + esc(s.label) + '" data-price="' + incVat + '" ' +
        'style="padding:8px 12px;background:linear-gradient(135deg,var(--app-primary,#C93C1D),#7f1d1d);color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">' +
        (s.icon ? '<span style="font-size:14px">' + esc(s.icon) + '</span>' : '') +
        '<span>' + esc(s.label) + '</span>' +
        '<span style="opacity:.85;font-size:11px;font-weight:500">· ' + incVat.toLocaleString('is-IS') + ' kr</span>' +
        '</button>';
    }).join('');

    strip.querySelectorAll('._sfs-btn').forEach(btn => {
      btn.addEventListener('click', () => safe(() => {
        const label = btn.dataset.label;
        const price = +btn.dataset.price || 0;
        const exVat = Math.round(price / 1.24);
        if (window.POS && typeof window.POS.getState === 'function') {
          const st = window.POS.getState();
          if (!st || !Array.isArray(st.lines)) return;
          // VSK% from AppSettings.almennt.default_vsk_pct (Stillingar → Almennt).
          let vskPct = 24;
          try { const v = window.AppSettings && window.AppSettings.path('almennt.default_vsk_pct'); if (Number.isFinite(+v) && +v > 0) vskPct = +v; } catch (_) {}
          // Stillinga-flýtisala er handvalin þjónusta → heldur gömlu verkstæðis-
          // hegðuninni (starfsmaður valdi hana meðvitað sem þjónustu).
          st.lines.push({ type: 'service', desc: label, qty: 1, unit_price_ex_vat: exVat, vsk_pct: vskPct, ref: '', krefst_verkbeidni: true });
          if (typeof window.POS.rerender === 'function') window.POS.rerender();
          else if (typeof window.rerenderDynamic === 'function') window.rerenderDynamic();
          if (window.Toast && Toast.show) Toast.show('+ ' + label);
        }
      }, 'shortcut-click'));
    });

    _lastShortcutsKey = key;
  }

  // ── Pin / hide products & services ────────────────────────────────────────
  // Operates on both #pos-products (vörur) and #pos-services (þjónusta) since
  // both share the same settings (pinned/hidden by product id, position_orders).
  let _lastPinHideKey = null;
  function applyPinHide() {
    const productsGrid = document.getElementById('pos-products');
    const servicesGrid = document.getElementById('pos-services');
    if (!productsGrid && !servicesGrid) return;

    const productTiles = productsGrid ? Array.from(productsGrid.querySelectorAll('.pos-prod')) : [];
    const serviceTiles = servicesGrid ? Array.from(servicesGrid.querySelectorAll('.pos-svc')) : [];
    if (!productTiles.length && !serviceTiles.length) return;

    const s = getSala();
    const hidden = new Set((s.hidden_product_ids || []).map(Number));
    const pinned = new Set((s.pinned_product_ids || []).map(Number));
    const positions = s.position_orders || {};
    const sortOrder = s.sort_order || 'alphabetical';

    const key = JSON.stringify({ hidden: Array.from(hidden), pinned: Array.from(pinned), positions, sortOrder, p: productTiles.length, s: serviceTiles.length });
    if (key === _lastPinHideKey) return;

    function applyToGrid(grid, tiles) {
      if (!grid || !tiles.length) return;
      // Hide via display:none (style change — doesn't trigger childList mutations).
      tiles.forEach(t => {
        const id = +t.getAttribute('data-id');
        if (hidden.has(id)) {
          t.style.display = 'none';
          t.dataset._sfsHidden = '1';
        } else if (t.dataset._sfsHidden === '1') {
          t.style.display = '';
          delete t.dataset._sfsHidden;
        }
      });
      // 05.11.2026 (Agnar: „söluborðið heldur ekki röðuninni"): ENGIN endurröðun hér lengur. Þessi grein raðaði
      // flísunum aftur eftir gömlu `position_orders` ('Eigin röð', # + pinned) á eftir hverja teikningu og vann þar með
      // á vorur.rodun — röðinni sem „Raða" (496) vistar og pos.js sortTiles les. Tvær heimildir fyrir sömu röðina:
      // gamla talnaröðin (20→1, 6→2, 7→3 …) birtist efst og dró 11 þjónustur fram fyrir restina á öllum vélum, og fyrsta
      // sleppingin í „Raða" skrifaði bjöguðu röðina yfir grunninn. vorur.rodun er nú EINA röðunarheimildin (498
      // samstillir hana á opnum síðum). Felun (hidden_product_ids) og rauði rammi á festum flísum standa óbreytt.
      // Visual marker on pinned tiles
      tiles.forEach(t => {
        const id = +t.getAttribute('data-id');
        const isPinned = pinned.has(id);
        if (isPinned && t.dataset._sfsPinned !== '1') {
          t.dataset._sfsPinned = '1';
          t.style.outline = '2px solid var(--app-primary, #C93C1D)';
        } else if (!isPinned && t.dataset._sfsPinned === '1') {
          delete t.dataset._sfsPinned;
          t.style.outline = '';
        }
      });
    }

    applyToGrid(productsGrid, productTiles);
    applyToGrid(servicesGrid, serviceTiles);
    _lastPinHideKey = key;
  }

  // ── Reapply orchestration ─────────────────────────────────────────────────
  let _scheduled = false;
  function reapplySoon(delay) {
    if (_scheduled) return;
    _scheduled = true;
    setTimeout(() => {
      _scheduled = false;
      safe(injectShortcuts, 'injectShortcuts');
      safe(applyPinHide, 'applyPinHide');
    }, delay || 100);
  }

  // ── Triggers (all event-based — no observers) ────────────────────────────
  document.addEventListener('view-shown', e => {
    if (e && e.detail && e.detail.name === 'sala') reapplySoon(150);
  });

  // 2026-05-09: pos.js dispatches `sala-catalog-rendered` whenever it
  // rebuilds the products/services grid. Without this, pos.js's periodic
  // loadAll().then(render) watcher (every 300ms while sala is active and
  // pos-checkout is missing) silently reset the catalog to alphabetical
  // order and patch 87 had no way to know — user had to force-refresh
  // 1-3 times for the custom order to stick. Invalidate the cache key so
  // applyPinHide actually re-runs the reorder.
  document.addEventListener('sala-catalog-rendered', () => {
    _lastPinHideKey = null;
    reapplySoon(30);
  });

  function hookSettings() {
    if (window.AppSettings && typeof window.AppSettings.onChange === 'function') {
      window.AppSettings.onChange(() => reapplySoon(50));
      return true;
    }
    return false;
  }
  if (!hookSettings()) {
    // AppSettings might load after us. Poll once or twice.
    setTimeout(() => hookSettings() || setTimeout(hookSettings, 1500), 500);
  }

  // Initial paint — give pos.js plenty of time to render the grid first.
  function initialPaint() { reapplySoon(800); }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialPaint);
  } else {
    initialPaint();
  }

  console.log('[sala-from-settings v2] installed');
})();
/* === END SALA FROM SETTINGS v2 === */
