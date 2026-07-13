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
    // 2026-06: stable data-co-id first (see patch 129).
    const idEl = main.querySelector('[data-co-id]:not(._cat-section)');
    if (idEl) { const v = idEl.getAttribute('data-co-id'); if (v && /^\d+$/.test(v)) return +v; }
    const editBtn = main.querySelector('button._co-edit-anchor[onclick*="Companies.openEdit"]') || main.querySelector('button[onclick*="Companies.openEdit"]');
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
    section.dataset.open = '0';
    // 2026-06-12 (Todoist): þéttara spjald — minni padding/bil. Collapsed default.
    section.style.cssText = 'margin:14px 0 16px;padding:10px 14px;border:1px solid var(--brd);border-radius:12px;background:var(--surface);box-shadow:0 1px 3px rgba(0,0,0,0.04)';
    section.innerHTML = renderSection(coId, false);

    // Insert near the bottom (before the company-attachments section if present)
    const catSection = main.querySelector('._cat-section');
    if (catSection) {
      catSection.parentNode.insertBefore(section, catSection);
    } else {
      main.appendChild(section);
    }
    wireSection(section, coId);
  }

  // Collapsed by default (most companies have no tilboðsverð). Remembered per
  // section instance via the dataset; the toggle flips it.
  function renderSection(coId, open) {
    const list = getCompanyPricing(coId);
    const cnt = list.length;
    const badge = cnt
      ? '<span style="font-size:11px;font-weight:700;color:var(--brand);background:var(--bg);border:1px solid var(--brd);border-radius:99px;padding:1px 8px">' + cnt + '</span>'
      : '<span style="font-size:11px;color:var(--ink4)">engin</span>';
    const header =
      '<button class="_cpr-toggle" type="button" aria-expanded="' + (open ? 'true' : 'false') + '" style="all:unset;box-sizing:border-box;display:flex;align-items:center;gap:8px;width:100%;cursor:pointer">' +
        '<span style="font-size:13px;transition:transform .15s;transform:rotate(' + (open ? '90' : '0') + 'deg);color:var(--ink3)">▸</span>' +
        '<span style="font-size:13px;font-weight:700;color:#1e3a8a">💰 Tilboðsverð</span>' +
        badge +
        '<span style="margin-left:auto;font-size:10.5px;color:var(--ink3)">sérverð sem yfirstíga búðarverð í Sala</span>' +
      '</button>';
    if (!open) return header;

    return header + '<div style="margin-top:10px">' + renderBody(coId, list) + '</div>';
  }

  function renderBody(coId, list) {
    const rows = list.length ? list.map(p => {
      const totalIncVat = (+p.price_ex_vat || 0) * (1 + (+p.vsk_pct || 24) / 100);
      return '<tr data-id="' + esc(p.id) + '">' +
        '<td style="padding:5px 9px;font-size:13px;font-weight:600;color:var(--ink1)">' + esc(p.name) + '</td>' +
        '<td style="padding:5px 9px;font-size:13px;text-align:right;color:var(--brand);font-weight:700;font-variant-numeric:tabular-nums">' + fmtKr(p.price_ex_vat) + '</td>' +
        '<td style="padding:5px 9px;font-size:12px;text-align:center;color:var(--ink2)">' + (p.vsk_pct != null ? p.vsk_pct : 24) + '%</td>' +
        '<td style="padding:5px 9px;font-size:13px;text-align:right;color:var(--ink2);font-variant-numeric:tabular-nums">' + fmtKr(totalIncVat) + '</td>' +
        '<td style="padding:5px 9px;font-size:11px;color:var(--ink3)">' + esc(p.notes || '') + '</td>' +
        '<td style="padding:5px 9px;text-align:center"><button class="_cpr-del" data-id="' + esc(p.id) + '" type="button" title="Eyða" style="background:var(--surface);border:1px solid #fecaca;color:#dc2626;border-radius:5px;width:24px;height:24px;cursor:pointer;font-size:11px">✕</button></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="6" style="padding:18px;text-align:center;color:var(--ink4);font-size:13px;font-style:italic">Engin tilboðsverð skráð — notaðu „+ Bæta við" hér að ofan</td></tr>';

    return '' +
      // Add new form (now first — sits above the list as one panel)
      '<div style="margin-bottom:10px">' +
        '<div style="display:grid;grid-template-columns:2fr 1fr 80px 2fr 100px;gap:6px;align-items:center">' +
          '<div style="display:flex;gap:4px">' +
            '<input id="_cpr-name" type="text" placeholder="t.d. Hleðsla tilboðsverð" style="flex:1;padding:6px 9px;border:1px solid var(--brd2);border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box;min-width:0">' +
            '<button class="_cpr-pick" type="button" title="Leita að vöru / þjónustu" style="padding:6px 9px;background:var(--bg);border:1px solid var(--brd);color:var(--brand);border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;flex-shrink:0">🔍</button>' +
          '</div>' +
          '<input id="_cpr-price" type="number" placeholder="Verð án VSK" min="0" step="1" style="padding:6px 9px;border:1px solid var(--brd2);border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box;text-align:right">' +
          '<input id="_cpr-vsk" type="number" value="24" min="0" max="100" placeholder="VSK%" style="padding:6px 9px;border:1px solid var(--brd2);border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box;text-align:center">' +
          '<input id="_cpr-notes" type="text" placeholder="Athugasemd (valkvætt)" style="padding:6px 9px;border:1px solid var(--brd2);border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box">' +
          '<button class="_cpr-add" type="button" style="padding:8px 14px;background:var(--brand);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">+ Bæta við</button>' +
        '</div>' +
        '<div style="margin-top:4px;font-size:10.5px;color:var(--ink3)">🔍 velur úr vörulistanum — verð fyllist sjálfvirkt.</div>' +
      '</div>' +
      // Subtle divider, then the existing prices list (one continuous panel)
      '<div style="border-top:1px solid var(--brd);padding-top:8px">' +
        '<div style="font-size:11px;font-weight:700;color:#1e3a8a;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Skráð tilboðsverð</div>' +
        '<div style="background:var(--surface);border:1px solid var(--brd);border-radius:8px;overflow:hidden">' +
          '<table style="width:100%;border-collapse:collapse">' +
            '<thead style="background:var(--bg)"><tr>' +
              '<th style="padding:6px 9px;text-align:left;font-size:10px;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:0.05em">Vara / þjónusta</th>' +
              '<th style="padding:6px 9px;text-align:right;font-size:10px;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:0.05em">Verð án vsk</th>' +
              '<th style="padding:6px 9px;text-align:center;font-size:10px;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:0.05em;width:60px">VSK</th>' +
              '<th style="padding:6px 9px;text-align:right;font-size:10px;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:0.05em">M/VSK</th>' +
              '<th style="padding:6px 9px;text-align:left;font-size:10px;font-weight:700;color:var(--brand);text-transform:uppercase;letter-spacing:0.05em">Athugasemd</th>' +
              '<th style="padding:6px 9px;width:40px"></th>' +
            '</tr></thead>' +
            '<tbody>' + rows + '</tbody>' +
          '</table>' +
        '</div>' +
      '</div>';
  }

  function wireSection(section, coId) {
    section.addEventListener('click', async e => {
      const toggle = e.target.closest('._cpr-toggle');
      if (toggle) {
        e.stopPropagation();
        const open = section.dataset.open !== '1';
        section.dataset.open = open ? '1' : '0';
        section.innerHTML = renderSection(coId, open);
        return;
      }
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
    // Listener is delegated on `section` and survives innerHTML swaps — don't re-wire.
    section.innerHTML = renderSection(coId, section.dataset.open === '1');
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

  // 2026-07-13: rewritten to drive off POS.getState() instead of scraping the
  // cart DOM. The cart redesign (#44) changed the line markup (desc is now
  // font-weight:700, the card no longer has border-bottom), which silently broke
  // the old querySelector traversal → tilboðsverð never applied (Ferðafélag
  // Íslands 6kg duft). State-based is redesign-proof + also resolves co_id/kt
  // reliably (incl. rekstrarfélög: pricing saved on any same-kt fyrirtæki row).
  function overridesForCustomer(cust) {
    if (!cust) return [];
    const coId = cust.co_id;
    let ov = coId ? getCompanyPricing(coId) : [];
    if (ov.length) return ov;
    // Fallback: any company sharing this kt that has pricing (multi-site kt).
    const kt = String(cust.kt || '').replace(/[^0-9]/g, '');
    if (kt.length === 10 && kt !== '9999999999') {
      const all = getAllPricing();
      const list = (window.Companies && Companies.list) || [];
      for (const c of list) {
        if (String(c.kennitala || '').replace(/[^0-9]/g, '') === kt) {
          const l = all[String(c.id)];
          if (Array.isArray(l) && l.length) return l;
        }
      }
    }
    return [];
  }

  function applyPosPricing() {
    const view = document.getElementById('view-sala');
    if (!view || !view.classList.contains('active')) return;
    const POS = window.POS;
    if (!POS || typeof POS.getState !== 'function') return;
    const st = POS.getState();
    if (!st || !st.customer || !Array.isArray(st.lines)) return;
    const overrides = overridesForCustomer(st.customer);
    if (!overrides.length) { decorateBadges(); return; }

    let changed = false;
    st.lines.forEach(l => {
      const o = findOverrideForLine(l.desc, overrides);
      if (!o) { if (l._tilbod) { l._tilbod = null; } return; }
      const target = +o.price_ex_vat;
      if (Math.abs((+l.unit_price_ex_vat || 0) - target) > 0.01) { l.unit_price_ex_vat = target; changed = true; }
      l._tilbod = o.name + (o.notes ? ' — ' + o.notes : '');
    });
    if (changed && typeof POS.rerenderDynamic === 'function') { POS.rerenderDynamic(); return; }
    decorateBadges();
  }

  // Yellow „💰 Tilboðsverð" badge on affected cart lines. Keyed by data-idx →
  // state.lines[idx]._tilbod (set above), so it survives the cart redesign.
  function decorateBadges() {
    const POS = window.POS;
    const st = (POS && POS.getState && POS.getState()) || null;
    const lines = (st && st.lines) || [];
    const cart = document.getElementById('pos-lines');
    if (!cart) return;
    cart.querySelectorAll('input.pos-price-edit').forEach(pi => {
      const idx = +pi.getAttribute('data-idx');
      const card = pi.closest('div[style*="border-left"]') || pi.parentElement && pi.parentElement.parentElement;
      if (!card) return;
      const tag = lines[idx] && lines[idx]._tilbod;
      const existing = card.querySelector('._cpr-badge');
      if (tag && !existing) {
        const descEl = card.querySelector('div[style*="font-weight:700"], div[style*="font-weight:600"]');
        if (descEl) {
          const badge = document.createElement('span');
          badge.className = '_cpr-badge';
          badge.title = 'Tilboðsverð: ' + tag;
          badge.style.cssText = 'display:inline-block;margin-left:6px;padding:1px 6px;background:#fef9c3;color:#854d0e;border:1px solid #fde047;border-radius:99px;font-size:10px;font-weight:700;letter-spacing:0.02em';
          badge.textContent = '💰 Tilboðsverð';
          descEl.appendChild(badge);
        }
      } else if (!tag && existing) {
        existing.remove();
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
