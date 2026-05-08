/* === COMPANY PRICING / TILBOÐSVERÐ v1 ===
 *
 * Hver fyrirtæki getur haft sín eigin „Tilboðsverð" sem yfirstíga sjálfvirkt
 * almenn búðarverð á Sala-síðu þegar starfsmaður þeirra kemur með tæki.
 *
 * Dæmi (Hagvagnar Tilboðsverð 2026):
 *   Hleðsla tilboðsverð              3.065 kr + vsk
 *   Nýtt 6 kg duftslökkvitæki        6.062 kr + vsk
 *   2 kg duftslökkvitæki             4.831 kr + vsk
 *   Léttvatnsslökkvitæki             6.941 kr + vsk
 *   Akstur per ferð                  1.362 kr + vsk
 *
 * Þannig: Þegar starfsmaður frá Hagvagnar setur kennitölu inn í Sala, og
 * smellir á t.d. „Hleðsla CO₂ 5 kg", þá leitar kerfið í tilboðsverðum og
 * skiptir sjálfvirkt á búðarverðið út fyrir tilboðsverðið. Lína fær
 * gulan „💰 Tilboðsverð" badge.
 *
 * ── UI ─────────────────────────────────────────────────────────────────
 *   Á fyrirtækisspjaldi: nýr „💰 Tilboðsverð" hluti með:
 *     • Lista yfir núverandi tilboð (Vara · Verð án VSK · VSK% · Athugasemd)
 *     • + Bæta við tilboði (form)
 *     • Eyða með ✕
 *
 * ── Geymsla ─────────────────────────────────────────────────────────────
 *   AppSettings.company_pricing[co_id] = [
 *     { id, name, price_ex_vat, vsk_pct, notes }
 *   ]
 *
 * ── POS-tenging ────────────────────────────────────────────────────────
 *   Þegar Sala-cart inniheldur línu og state.customer.co_id matchar
 *   fyrirtæki með tilboðsverðum:
 *     • Athugum hvort line.desc matchi einhverju tilboði (case-insensitive
 *       substring match — ef tilboð heitir „Hleðsla" þá matchar bæði
 *       „Hleðsla CO₂ 5 kg" og „Hleðsla 2kg duft").
 *     • Skiptum unit_price_ex_vat út fyrir tilboðsverðið.
 *     • Bætum „💰 Tilboðsverð" badge á línuna.
 */
(() => {
  if (window.__companyPricingInstalled) return;
  window.__companyPricingInstalled = true;

  const STORAGE_KEY = 'company_pricing';

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

  function getCompanyPricing(coId) {
    const all = getAllPricing();
    const list = all[String(coId)];
    return Array.isArray(list) ? list : [];
  }

  async function saveCompanyPricing(coId, list) {
    if (!window.AppSettings || !window.AppSettings.save) return false;
    const all = { ...getAllPricing() };
    all[String(coId)] = list;
    return await window.AppSettings.save({ [STORAGE_KEY]: all });
  }

  function getCompanyId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const editBtn = main.querySelector('button[onclick*="Companies.openEdit"]');
    if (!editBtn) return null;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/);
    return m ? +m[1] : null;
  }

  // ── UI: Section on company detail ────────────────────────────────────────
  function injectSection() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const coId = getCompanyId();
    if (!coId) return;
    if (main.querySelector('._cpr-section')) return;

    const section = document.createElement('div');
    section.className = '_cpr-section';
    section.dataset.coId = coId;
    section.style.cssText = 'margin:18px 0 22px;padding:16px;border:1px solid #fde68a;border-radius:12px;background:#fffbeb;box-shadow:0 1px 3px rgba(0,0,0,0.04)';
    section.innerHTML = renderSection(coId);

    // Insert near the bottom (before the company-attachments section if present)
    const catSection = main.querySelector('._cat-section');
    if (catSection) {
      catSection.parentNode.insertBefore(section, catSection);
    } else {
      main.appendChild(section);
    }
    wireSection(section, coId);
  }

  function renderSection(coId) {
    const list = getCompanyPricing(coId);

    const rows = list.length ? list.map(p => {
      const totalIncVat = (+p.price_ex_vat || 0) * (1 + (+p.vsk_pct || 24) / 100);
      return '<tr data-id="' + esc(p.id) + '">' +
        '<td style="padding:7px 10px;font-size:13px;font-weight:600;color:#0f172a">' + esc(p.name) + '</td>' +
        '<td style="padding:7px 10px;font-size:13px;text-align:right;color:#92400e;font-weight:700;font-variant-numeric:tabular-nums">' + fmtKr(p.price_ex_vat) + '</td>' +
        '<td style="padding:7px 10px;font-size:12px;text-align:center;color:#475569">' + (p.vsk_pct != null ? p.vsk_pct : 24) + '%</td>' +
        '<td style="padding:7px 10px;font-size:13px;text-align:right;color:#475569;font-variant-numeric:tabular-nums">' + fmtKr(totalIncVat) + '</td>' +
        '<td style="padding:7px 10px;font-size:11px;color:#64748b">' + esc(p.notes || '') + '</td>' +
        '<td style="padding:7px 10px;text-align:center"><button class="_cpr-del" data-id="' + esc(p.id) + '" type="button" title="Eyða" style="background:#fff;border:1px solid #fecaca;color:#dc2626;border-radius:5px;width:24px;height:24px;cursor:pointer;font-size:11px">✕</button></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="6" style="padding:18px;text-align:center;color:#94a3b8;font-size:13px;font-style:italic">Engin tilboðsverð skráð — smelltu „+ Bæta við" hér að neðan</td></tr>';

    return '' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
        '<div>' +
          '<h3 style="margin:0;font-size:15px;font-weight:700;color:#92400e">💰 Tilboðsverð</h3>' +
          '<div style="font-size:11px;color:#92400e;margin-top:2px">Sérverð sem yfirstíga búðarverð sjálfvirkt í Sala fyrir þetta fyrirtæki.</div>' +
        '</div>' +
      '</div>' +
      '<div style="background:#fff;border:1px solid #fde68a;border-radius:8px;overflow:hidden">' +
        '<table style="width:100%;border-collapse:collapse">' +
          '<thead style="background:#fef3c7"><tr>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em">Vara / þjónusta</th>' +
            '<th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em">Verð án vsk</th>' +
            '<th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;width:60px">VSK</th>' +
            '<th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em">M/VSK</th>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em">Athugasemd</th>' +
            '<th style="padding:8px 10px;width:40px"></th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
      // Add new form
      '<div style="margin-top:10px;padding:12px;background:#fff;border:1px dashed #fde68a;border-radius:8px">' +
        '<div style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">+ Bæta við tilboði</div>' +
        '<div style="display:grid;grid-template-columns:2fr 1fr 80px 2fr 100px;gap:6px;align-items:center">' +
          '<div style="display:flex;gap:4px">' +
            '<input id="_cpr-name" type="text" placeholder="t.d. Hleðsla tilboðsverð" style="flex:1;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box;min-width:0">' +
            '<button class="_cpr-pick" type="button" title="Leita að vöru / þjónustu" style="padding:8px 10px;background:#fef3c7;border:1px solid #fde68a;color:#92400e;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;flex-shrink:0">🔍</button>' +
          '</div>' +
          '<input id="_cpr-price" type="number" placeholder="Verð án VSK" min="0" step="1" style="padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box;text-align:right">' +
          '<input id="_cpr-vsk" type="number" value="24" min="0" max="100" placeholder="VSK%" style="padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box;text-align:center">' +
          '<input id="_cpr-notes" type="text" placeholder="Athugasemd (valkvætt)" style="padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box">' +
          '<button class="_cpr-add" type="button" style="padding:8px 14px;background:#92400e;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">+ Bæta við</button>' +
        '</div>' +
        '<div style="margin-top:6px;font-size:11px;color:#64748b">Smelltu 🔍 til að velja úr vörulistanum (verð fyllist sjálfvirkt). Nafnið matchast við körfulínur með case-insensitive substring.</div>' +
      '</div>';
  }

  function wireSection(section, coId) {
    section.addEventListener('click', async e => {
      const delBtn = e.target.closest('._cpr-del');
      const addBtn = e.target.closest('._cpr-add');
      const pickBtn = e.target.closest('._cpr-pick');
      if (pickBtn) {
        e.stopPropagation();
        if (window.VorurPicker && typeof VorurPicker.open === 'function') {
          VorurPicker.open(p => {
            const nameInp = section.querySelector('#_cpr-name');
            const priceInp = section.querySelector('#_cpr-price');
            const vskInp = section.querySelector('#_cpr-vsk');
            if (nameInp) nameInp.value = p.nafn || '';
            if (priceInp) priceInp.value = String(Math.round(+p.verd_an_vsk || 0));
            if (vskInp) vskInp.value = String(+p.vsk_prosenta || 24);
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
        const list = getCompanyPricing(coId).filter(p => p.id !== id);
        await saveCompanyPricing(coId, list);
        refreshSection(section, coId);
        return;
      }
      if (addBtn) {
        e.stopPropagation();
        const name = section.querySelector('#_cpr-name').value.trim();
        const price = parseFloat(section.querySelector('#_cpr-price').value);
        const vsk = parseFloat(section.querySelector('#_cpr-vsk').value);
        const notes = section.querySelector('#_cpr-notes').value.trim();
        if (!name) { alert('Sláðu inn nafn vöru/þjónustu.'); return; }
        if (!Number.isFinite(price) || price < 0) { alert('Sláðu inn gilt verð.'); return; }
        const list = getCompanyPricing(coId).slice();
        list.push({
          id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
          name,
          price_ex_vat: price,
          vsk_pct: Number.isFinite(vsk) ? vsk : 24,
          notes
        });
        await saveCompanyPricing(coId, list);
        refreshSection(section, coId);
      }
    });
  }

  function refreshSection(section, coId) {
    section.innerHTML = renderSection(coId);
    wireSection(section, coId);
  }

  // ── Watch for company detail rendering ─────────────────────────────────
  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    const view = document.getElementById('view-companies');
    let _t = 0;
    new MutationObserver(() => {
      // Skip if user has navigated away from the Companies view
      if (view && !view.classList.contains('active')) return;
      clearTimeout(_t);
      _t = setTimeout(injectSection, 250);
    }).observe(main, { childList: true, subtree: true });
  }
  attach();
  setTimeout(injectSection, 1500);

  // ── POS hook: apply company pricing to cart lines ──────────────────────
  function findOverrideForLine(desc, overrides) {
    if (!desc || !overrides || !overrides.length) return null;
    const d = String(desc).toLowerCase();
    // Find best match — longest matching name wins (more specific)
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
    // Only act when on Sala view
    const view = document.getElementById('view-sala');
    if (!view || !view.classList.contains('active')) return;
    // Find current customer co_id — pos.js stores it on state.customer but
    // it's in closure. We read from #pos-cust-* fields or via kt result.
    // Easiest: parse the kt result element which has esc(m.nafn) and we
    // can extract co_id from a custom data attr if pos.js supplies one.
    // Fallback: look at pos-cust-result inner HTML for "fyrirtæki" link.
    // Best — look up co_id by querying customer name against Companies.list.
    let coId = null;
    // pos.js exposes some state via _pendingReikningurNum etc but not co_id.
    // We'll read from the customer name displayed and match against list.
    const nameDiv = document.querySelector('#pos-kt-result, #pos-customer-display, [class*="pos-cust"]');
    if (nameDiv) {
      const txt = (nameDiv.textContent || '').trim();
      const list = (window.Companies && Companies.list) || [];
      const found = list.find(c => txt.indexOf(c.nafn) >= 0);
      if (found) coId = found.id;
    }
    // Also try by kennitala
    if (!coId) {
      const ktInp = document.getElementById('pos-kt');
      if (ktInp && ktInp.value) {
        const cleanKt = ktInp.value.replace(/[^0-9]/g, '');
        if (cleanKt.length === 10) {
          const list = (window.Companies && Companies.list) || [];
          const found = list.find(c => String(c.kennitala || '').replace(/[^0-9]/g, '') === cleanKt);
          if (found) coId = found.id;
        }
      }
    }
    if (!coId) return;
    const overrides = getCompanyPricing(coId);
    if (!overrides.length) return;

    // For each cart line: find description + price input, apply override
    const cartContainer = document.getElementById('pos-lines') || document.querySelector('.pos-lines');
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
      // Only apply if current price differs. The diff check alone is enough
      // to prevent loops — pos.js's input handler persists the new price to
      // state.lines, so on re-render priceInput.value === targetPrice and we
      // skip re-application. (Used to also use a dataset flag, but that flag
      // was lost on every cart re-render — caused unreliable re-applies.)
      if (Math.abs(currentPrice - targetPrice) > 0.01) {
        priceInput.value = String(targetPrice);
        priceInput.dispatchEvent(new Event('change', { bubbles: true }));
        priceInput.dispatchEvent(new Event('input', { bubbles: true }));
      }

      // Add badge if not already present
      if (!lineEl.querySelector('._cpr-badge')) {
        const badge = document.createElement('span');
        badge.className = '_cpr-badge';
        badge.title = 'Tilboðsverð: ' + override.name + (override.notes ? ' — ' + override.notes : '');
        badge.style.cssText = 'display:inline-block;margin-left:6px;padding:1px 6px;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:99px;font-size:10px;font-weight:700;letter-spacing:0.02em';
        badge.textContent = '💰 Tilboðsverð';
        // Insert after the description div
        if (descEl && descEl.parentElement) {
          descEl.parentElement.style.position = 'relative';
          descEl.appendChild(badge);
        }
      }
    });
  }

  // Watch the cart for changes — only acts when Sala is the active view.
  function attachPos() {
    const view = document.getElementById('view-sala');
    if (!view) { setTimeout(attachPos, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      // Early-out if user is on a different view → no DOM work
      if (!view.classList.contains('active')) return;
      clearTimeout(_t);
      _t = setTimeout(applyPosPricing, 150);
    }).observe(view, { childList: true, subtree: true });
  }
  attachPos();
  // 2026-05-08: removed setInterval(applyPosPricing, 1500) — observer
  // already fires on every cart/customer mutation. Interval was dead work.

  window.CompanyPricing = {
    list: getCompanyPricing,
    save: saveCompanyPricing
  };

  console.log('[company-pricing] installed — 💰 Tilboðsverð hluti á fyrirtækisspjaldi + auto-apply í Sala');
})();
/* === END COMPANY PRICING v1 === */
