/* === VIÐSKIPTAVINUR PRICING / SÉRKJÖR v1 ===
 *
 * Eins og 113-company-pricing.js — en fyrir staka viðskiptavini í
 * Vidskiptavinir-töflunni (ekki fyrirtæki).
 *
 * Á viðskiptavinaspjaldi (vidsk-main detail) bætum við hluta
 * „💎 Sérkjör" með sömu uppbyggingu og hjá fyrirtækjum:
 *   • Listi yfir núverandi sérkjör (Vara · Verð án VSK · VSK · Athugasemd)
 *   • + Bæta við sérkjöri
 *   • Eyða með ✕
 *
 * Geymsla:
 *   AppSettings.vidsk_pricing[vidsk_id] = [
 *     { id, name, price_ex_vat, vsk_pct, notes }
 *   ]
 *
 * POS-tenging:
 *   Þegar Sala-cart inniheldur línu og valinn viðskiptavinur (kt í pos-kt
 *   matchast við vidsk-skrá) er með sérkjör → skiptum unit_price_ex_vat út.
 *   Lína fær blátt „💎 Sérkjör" badge (greinanlegt frá gula
 *   „💰 Tilboðsverð" frá fyrirtækjum).
 */
(() => {
  if (window.__vidskPricingInstalled) return;
  window.__vidskPricingInstalled = true;

  const STORAGE_KEY = 'vidsk_pricing';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) {
    return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr';
  }

  function getAllPricing() {
    const stored = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || {};
    return (stored && typeof stored === 'object') ? stored : {};
  }
  function getVidskPricing(vid) {
    const all = getAllPricing();
    const list = all[String(vid)];
    return Array.isArray(list) ? list : [];
  }
  async function saveVidskPricing(vid, list) {
    if (!window.AppSettings || !window.AppSettings.save) return false;
    // ÞRÖNGUR patch — aðeins þessi lykill. Að senda alla vörpuna skrifaði
    // yfir allt sem hinar vélarnar breyttu á meðan þessi flipi var opinn
    // (deepMerge yfirskrifar, hún sameinar ekki raðir).
    return await window.AppSettings.save({ [STORAGE_KEY]: { [String(vid)]: list } });
  }

  function getVidskList() {
    if (window.Vidskiptavinir && Array.isArray(Vidskiptavinir.list) && Vidskiptavinir.list.length) return Vidskiptavinir.list;
    if (window.DB && DB.cache && Array.isArray(DB.cache.vidsk)) return DB.cache.vidsk;
    return [];
  }

  // Determine which vidskiptavinur is currently shown on the detail view.
  // The view renders displayName(c) in .company-name and kennitala into the
  // info grid. We try kennitala (most reliable), fall back to name match.
  function getCurrentVidskId() {
    const main = document.getElementById('vidsk-main');
    if (!main) return null;
    // Detail view: presence of .company-name + back button (#vk-back)
    if (!main.querySelector('#vk-back')) return null;
    // Try to extract kennitala from info-grid: the row labeled "Kennitala"
    let kt = '';
    const labelDivs = main.querySelectorAll('.info-grid > div');
    for (let i = 0; i < labelDivs.length - 1; i++) {
      if ((labelDivs[i].textContent || '').trim() === 'Kennitala') {
        kt = (labelDivs[i + 1].textContent || '').replace(/[^0-9]/g, '');
        break;
      }
    }
    const list = getVidskList();
    if (kt && kt.length === 10) {
      const found = list.find(v => String(v.kennitala || '').replace(/[^0-9]/g, '') === kt);
      if (found) return found.id;
    }
    // Fallback: match by display name
    const nameEl = main.querySelector('.company-name');
    if (nameEl) {
      const nm = (nameEl.textContent || '').trim();
      const found = list.find(v => (v.nafn || '').trim() === nm);
      if (found) return found.id;
    }
    return null;
  }

  // ── UI: Section on vidsk detail ─────────────────────────────────────────
  function injectSection() {
    const main = document.getElementById('vidsk-main');
    if (!main) return;
    const vid = getCurrentVidskId();
    if (!vid) return;
    if (main.querySelector('._vpr-section')) {
      // Already injected — just refresh data if id changed
      const existing = main.querySelector('._vpr-section');
      if (existing.dataset.vid !== String(vid)) {
        existing.dataset.vid = String(vid);
        existing.innerHTML = renderSection(vid);
        wireSection(existing, vid);
      }
      return;
    }

    const section = document.createElement('div');
    section.className = '_vpr-section';
    section.dataset.vid = String(vid);
    section.style.cssText = 'margin:18px 0 22px;padding:16px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff;box-shadow:0 1px 3px rgba(0,0,0,0.04)';
    section.innerHTML = renderSection(vid);

    // Insert before any units table — append to main keeps it at bottom
    main.appendChild(section);
    wireSection(section, vid);
  }

  function renderSection(vid) {
    const list = getVidskPricing(vid);

    const rows = list.length ? list.map(p => {
      const totalIncVat = (+p.price_ex_vat || 0) * (1 + (+p.vsk_pct || 24) / 100);
      return '<tr data-id="' + esc(p.id) + '">' +
        '<td style="padding:7px 10px;font-size:13px;font-weight:600;color:#0f172a">' + esc(p.name) + '</td>' +
        '<td style="padding:7px 10px;font-size:13px;text-align:right;color:#1e3a8a;font-weight:700;font-variant-numeric:tabular-nums">' + fmtKr(p.price_ex_vat) + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;text-align:center;color:#475569">' + (p.vsk_pct != null ? p.vsk_pct : 24) + '%</td>' +
        '<td style="padding:7px 10px;font-size:13px;text-align:right;color:#475569;font-variant-numeric:tabular-nums">' + fmtKr(totalIncVat) + '</td>' +
        '<td style="padding:7px 10px;font-size:11px;color:#64748b">' + esc(p.notes || '') + '</td>' +
        '<td style="padding:7px 10px;text-align:center"><button class="_vpr-del" data-id="' + esc(p.id) + '" type="button" title="Eyða" style="background:#fff;border:1px solid #fecaca;color:#dc2626;border-radius:5px;width:24px;height:24px;cursor:pointer;font-size:11px">✕</button></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="6" style="padding:18px;text-align:center;color:#94a3b8;font-size:13px;font-style:italic">Engin sérkjör skráð — notaðu „+ Ný sérkjör" hér að ofan</td></tr>';

    return '' +
      '<div style="margin-bottom:14px">' +
        '<h3 style="margin:0;font-size:15px;font-weight:700;color:#1e3a8a">💎 Sérkjör</h3>' +
        '<div style="font-size:11px;color:#1e40af;margin-top:2px">Persónuleg sérverð sem yfirstíga búðarverð sjálfvirkt í Sala fyrir þennan viðskiptavin.</div>' +
      '</div>' +
      // Add new form (now first — sits above the list as one panel)
      '<div style="margin-bottom:14px">' +
        '<div style="font-size:11px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">+ Ný sérkjör</div>' +
        '<div style="display:grid;grid-template-columns:2fr 1fr 80px 2fr 110px;gap:6px;align-items:center">' +
          '<div style="display:flex;gap:4px">' +
            '<input id="_vpr-name" type="text" placeholder="t.d. Hleðsla 6kg duft" style="flex:1;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box;min-width:0">' +
            '<button class="_vpr-pick" type="button" title="Leita að vöru / þjónustu" style="padding:8px 10px;background:#dbeafe;border:1px solid #bfdbfe;color:#1e40af;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;flex-shrink:0">🔍</button>' +
          '</div>' +
          '<input id="_vpr-price" type="number" placeholder="Verð án VSK" min="0" step="1" style="padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box;text-align:right">' +
          '<input id="_vpr-vsk" type="number" value="24" min="0" max="100" placeholder="VSK%" style="padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box;text-align:center">' +
          '<input id="_vpr-notes" type="text" placeholder="Athugasemd (valkvætt)" style="padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box">' +
          '<button class="_vpr-add" type="button" style="padding:8px 14px;background:#1e3a8a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">+ Bæta við</button>' +
        '</div>' +
        '<div style="margin-top:6px;font-size:11px;color:#64748b">Smelltu 🔍 til að velja úr vörulistanum (verð fyllist sjálfvirkt). Nafnið matchast við körfulínur með case-insensitive substring.</div>' +
      '</div>' +
      // Subtle divider, then the existing prices list (one continuous panel)
      '<div style="border-top:1px solid #bfdbfe;padding-top:12px">' +
        '<div style="font-size:11px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Skráð sérkjör</div>' +
        '<div style="background:#fff;border:1px solid #bfdbfe;border-radius:8px;overflow:hidden">' +
          '<table style="width:100%;border-collapse:collapse">' +
            '<thead style="background:#dbeafe"><tr>' +
              '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.05em">Vara / þjónusta</th>' +
              '<th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.05em">Verð án vsk</th>' +
              '<th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.05em;width:60px">VSK</th>' +
              '<th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.05em">M/VSK</th>' +
              '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.05em">Athugasemd</th>' +
              '<th style="padding:8px 10px;width:40px"></th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  }

  function wireSection(section, vid) {
    section.addEventListener('click', async e => {
      const delBtn = e.target.closest('._vpr-del');
      const addBtn = e.target.closest('._vpr-add');
      const pickBtn = e.target.closest('._vpr-pick');
      if (pickBtn) {
        e.stopPropagation();
        if (window.VorurPicker && typeof VorurPicker.open === 'function') {
          VorurPicker.open(p => {
            const nameInp = section.querySelector('#_vpr-name');
            const priceInp = section.querySelector('#_vpr-price');
            const vskInp = section.querySelector('#_vpr-vsk');
            if (nameInp) nameInp.value = p.nafn || '';
            if (priceInp) priceInp.value = String(Math.round(+p.verd_an_vsk || 0));
            if (vskInp) vskInp.value = String(+p.vsk_prosenta || 24);
            // Focus price for quick override
            if (priceInp) { priceInp.focus(); priceInp.select(); }
          });
        } else {
          alert('Vörulisti ekki tilbúinn — endurhladdu síðunni.');
        }
        return;
      }
      if (delBtn) {
        e.stopPropagation();
        const id = delBtn.dataset.id;
        const list = getVidskPricing(vid).filter(p => p.id !== id);
        await saveVidskPricing(vid, list);
        refreshSection(section, vid);
        return;
      }
      if (addBtn) {
        e.stopPropagation();
        const name = section.querySelector('#_vpr-name').value.trim();
        const price = parseFloat(section.querySelector('#_vpr-price').value);
        const vsk = parseFloat(section.querySelector('#_vpr-vsk').value);
        const notes = section.querySelector('#_vpr-notes').value.trim();
        if (!name) { alert('Sláðu inn nafn vöru/þjónustu.'); return; }
        if (!Number.isFinite(price) || price < 0) { alert('Sláðu inn gilt verð.'); return; }
        const list = getVidskPricing(vid).slice();
        list.push({
          id: 'vp_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
          name,
          price_ex_vat: price,
          vsk_pct: Number.isFinite(vsk) ? vsk : 24,
          notes
        });
        await saveVidskPricing(vid, list);
        refreshSection(section, vid);
      }
    });
  }

  function refreshSection(section, vid) {
    section.innerHTML = renderSection(vid);
    wireSection(section, vid);
  }

  // ── Watch for vidsk detail rendering ────────────────────────────────────
  function attach() {
    const view = document.getElementById('view-vidskiptavinir');
    if (!view) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      // Don't process when user is on a different view
      if (!view.classList.contains('active')) return;
      clearTimeout(_t);
      _t = setTimeout(injectSection, 250);
    }).observe(view, { childList: true, subtree: true });
  }
  attach();
  setTimeout(injectSection, 1500);
  // 2026-05-08: removed setInterval(injectSection, 2500) — observer
  // covers all the cases that mattered.

  // ── POS hook ───────────────────────────────────────────────────────────
  function findOverrideForLine(desc, overrides) {
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

  function applyPosPricing() {
    const view = document.getElementById('view-sala');
    if (!view || !view.classList.contains('active')) return;
    // Find current vidsk id by kennitala in #pos-kt
    const ktInp = document.getElementById('pos-kt');
    if (!ktInp) return;
    const cleanKt = (ktInp.value || '').replace(/[^0-9]/g, '');
    if (cleanKt.length !== 10 || cleanKt === '9999999999') return;
    const list = getVidskList();
    const vidsk = list.find(v => String(v.kennitala || '').replace(/[^0-9]/g, '') === cleanKt);
    if (!vidsk) return;
    const overrides = getVidskPricing(vidsk.id);
    if (!overrides.length) return;

    const cartContainer = document.getElementById('pos-lines');
    if (!cartContainer) return;

    cartContainer.querySelectorAll('input.pos-price-edit').forEach(priceInput => {
      const lineEl = priceInput.closest('div[style*="border-bottom"]') || priceInput.closest('div');
      if (!lineEl) return;
      const descEl = lineEl.querySelector('div[style*="font-weight:600"]');
      const desc = descEl ? descEl.textContent.trim() : '';
      if (!desc) return;
      const override = findOverrideForLine(desc, overrides);
      if (!override) return;

      const currentPrice = parseFloat(priceInput.value) || 0;
      const targetPrice = +override.price_ex_vat;
      // Diff check alone prevents loops; dataset flag dropped (was unreliable
      // because pos.js re-renders the cart and removes the flag).
      if (Math.abs(currentPrice - targetPrice) > 0.01) {
        priceInput.value = String(targetPrice);
        priceInput.dispatchEvent(new Event('change', { bubbles: true }));
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      if (!lineEl.querySelector('._vpr-badge')) {
        const badge = document.createElement('span');
        badge.className = '_vpr-badge';
        badge.title = 'Sérkjör: ' + override.name + (override.notes ? ' — ' + override.notes : '');
        badge.style.cssText = 'display:inline-block;margin-left:6px;padding:1px 6px;background:#dbeafe;color:#1e3a8a;border:1px solid #93c5fd;border-radius:99px;font-size:10px;font-weight:700;letter-spacing:0.02em';
        badge.textContent = '💎 Sérkjör';
        if (descEl && descEl.parentElement) {
          descEl.parentElement.style.position = 'relative';
          descEl.appendChild(badge);
        }
      }
    });
  }

  function attachPos() {
    const view = document.getElementById('view-sala');
    if (!view) { setTimeout(attachPos, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      // Skip when Sala isn't active — saves CPU on other views
      if (!view.classList.contains('active')) return;
      clearTimeout(_t);
      _t = setTimeout(applyPosPricing, 150);
    }).observe(view, { childList: true, subtree: true });
  }
  attachPos();
  // 2026-05-08: removed setInterval(applyPosPricing, 1500) — observer
  // already fires on every cart/customer mutation.

  window.VidskPricing = {
    list: getVidskPricing,
    save: saveVidskPricing
  };

  console.log('[vidsk-pricing] installed — 💎 Sérkjör hluti á viðskiptavinaspjaldi + auto-apply í Sala');
})();
/* === END VIÐSKIPTAVINUR PRICING v1 === */
