/* === VISIT WORKFLOW v1 ===
 *
 * "Klára heimsókn" / "End-of-visit" workflow on the company-detail page.
 *
 * After the technician has ticked Áætlað (Hleðsla/Yfirferð/Sleppa) on each
 * unit, this patch lets them finish the visit with one click:
 *
 *   1. Show a confirmation summary (totals, # serviced units, drive cost).
 *   2. On confirm:
 *      • Update each serviced unit's last_insp + next_insp (today + 12 mo).
 *      • Insert a sale row in `solur` capturing the line items.
 *      • Open the invoice for printing (SalaInvoice.renderFromSale).
 *      • Clear the local trip state so the next visit starts blank.
 *      • Reload the company detail to show fresh next-inspection dates.
 *
 * Reuses patch 129's pricing engine (window.recomputeCompanyTotalCost) and
 * patch 131's per-unit choices (window.UnitServicePicker).
 */
(() => {
  if (window.__visitWorkflowInstalled) return;
  window.__visitWorkflowInstalled = true;

  const CHOICE_KEY = 'slokk_trip_';

  function getCompanyId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const editBtn = main.querySelector('button[onclick*="Companies.openEdit"]');
    if (!editBtn) return null;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)/);
    return m ? +m[1] : null;
  }
  function getCompanyName() {
    // 1. Preferred: read from Companies.list (same source patch 129 uses)
    if (window.Companies && Array.isArray(Companies.list)) {
      const id = getCompanyId();
      const c = id ? Companies.list.find(x => x.id === id) : null;
      if (c && c.nafn) return c.nafn;
    }
    // 2. Fallback: DOM heading scan with broader selectors
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const heading = main.querySelector('h1, h2, .company-name, [style*="font-size:21px"], [style*="font-size: 21px"], [style*="font-size:22px"], [style*="font-size: 22px"]');
    if (heading) {
      const t = heading.textContent.trim();
      if (t) return t;
    }
    return null;
  }
  // DB fallback when we have an id but no name in memory.
  async function fetchCompanyName(coId) {
    if (!coId) return null;
    const sb = window.DB && window.DB.sb;
    if (!sb) return null;
    try {
      const r = await sb.from('fyrirtaeki').select('nafn').eq('id', coId).maybeSingle();
      return r && r.data ? r.data.nafn : null;
    } catch (_) { return null; }
  }
  function loadTrip(coId) {
    try { return JSON.parse(localStorage.getItem(CHOICE_KEY + coId) || '{}'); }
    catch (_) { return {}; }
  }
  function clearTrip(coId) {
    try { localStorage.removeItem(CHOICE_KEY + coId); } catch (_) {}
  }
  function todayIso() { return new Date().toISOString().slice(0, 10); }
  function addMonthsIso(iso, months) {
    const d = new Date(iso);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }
  function fmtKr(n) {
    return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Read the bottom-row totals from patch 129's section. Hacky but avoids
  // re-computing — patch 129 already knows the right answer.
  function readTotalsFromSection() {
    const section = document.getElementById('_ctc-section');
    if (!section) return null;
    const cells = section.querySelectorAll('tfoot td');
    // tfoot layout: row 1 = Án vsk, row 2 = VSK, row 3 = SAMTALS
    const parseKr = txt => parseInt(String(txt).replace(/[^0-9]/g, ''), 10) || 0;
    if (cells.length < 6) return null;
    return {
      subEx: parseKr(cells[1].textContent),
      vsk: parseKr(cells[3].textContent),
      total: parseKr(cells[5].textContent)
    };
  }

  // Pull all visible unit-rows + their Áætlað choice. Returns line summaries
  // by (type, size, kind) so we can build invoice lines + know which uttaeki
  // ids need next_insp bumped.
  async function collectVisit(coId, coNafn) {
    const sb = window.DB && window.DB.sb;
    if (!sb) throw new Error('Engin nettenging');
    const trip = loadTrip(coId);
    const choices = trip.units || {};
    // Fetch live unit list
    const { data: units, error } = await sb
      .from('uttaeki')
      .select('id,serial,type,size,client,status,last_insp,next_insp')
      .eq('client', coNafn);
    if (error) throw error;
    const servicedIds = [];
    const grouped = {}; // {type|size|kind: count}
    for (const u of units) {
      const ch = choices[u.id] || 'yfirferd'; // safe default
      if (ch !== 'hledsla' && ch !== 'yfirferd') continue;
      servicedIds.push(u.id);
      const k = (u.type || '—') + '|' + (u.size || '') + '|' + ch;
      grouped[k] = (grouped[k] || 0) + 1;
    }
    // 2026-05-20: same defaults as patch 129 (3000 / 3500 / 1). The patch-129
    // input boxes show the defaults visually but only persist to localStorage
    // on blur — so if the user never touches them, trip.drive/skyrslugerd
    // are undefined and we'd previously bill 0 kr for both.
    return {
      units,
      servicedIds,
      grouped,
      drive:       (trip.drive       != null) ? +trip.drive       : 3000,
      driveQty:    (trip.driveQty    != null) ? Math.max(0, +trip.driveQty) : 1,
      skyrslugerd: (trip.skyrslugerd != null) ? +trip.skyrslugerd : 3500,
      skodunaradili: (trip.skodunaradili || '').trim(),
      // 2026-05-21: manual line items added via "+ Bæta við vöru eða þjónustu"
      extras:      Array.isArray(trip.extras) ? trip.extras : []
    };
  }

  // 2026-05-20: scrape priced rows from the green Heildarkostnaður table.
  // Uses the visible product name + per-stk price + vsk% so the previewed
  // invoice lines match the cost table EXACTLY (instead of zero-price stubs).
  function scrapeCostRows() {
    const section = document.getElementById('_ctc-section');
    if (!section) return [];
    const out = [];
    const trs = section.querySelectorAll('table tbody tr');
    trs.forEach(tr => {
      // Skip Skýrslugerð / Akstur rows (they have the inline inputs)
      if (tr.querySelector('#_ctc-skyrslu') || tr.querySelector('#_ctc-drive')) return;
      const tds = tr.querySelectorAll('td');
      if (tds.length < 6) return;
      // Skip the "Sleppt" greyed-out rows (they have colspan=3 in cells 3-5)
      if (/sleppt/i.test(tds[2] && tds[2].textContent || '')) return;
      const firstTd = tds[0];
      const sub = firstTd.querySelector('div');
      const productName = sub ? sub.textContent.trim() : '';
      const headLine = firstTd.firstChild && firstTd.firstChild.textContent
        ? firstTd.firstChild.textContent.trim()
        : firstTd.textContent.replace(productName, '').trim();
      const qty = parseInt((tds[1].textContent || '').trim().replace(/[^0-9]/g, ''), 10) || 0;
      if (qty === 0) return;
      const kindLabel = (tds[2].textContent || '').trim();
      // 2026-05-20: Strip every non-digit character. This is locale-agnostic —
      // "7.000 kr", "7,000 kr", "7 000 kr" all collapse to "7000". Previous
      // attempt used parseFloat after a dot-strip + comma-to-dot, which broke
      // on Chrome's "7,000" output (parseFloat treated . as decimal → 7).
      const unitPrice = parseInt((tds[3].textContent || '').replace(/[^0-9]/g, ''), 10) || 0;
      const vskPct = parseInt((tds[4].textContent || '').replace(/[^0-9]/g, ''), 10) || 24;
      const desc = (kindLabel ? kindLabel + ' · ' : '') + (productName || headLine);
      out.push({ desc, qty, unit_price_ex_vat: unitPrice, vsk_pct: vskPct });
    });
    return out;
  }

  function buildLinur(visit, costRows) {
    // Prefer the scraped, priced rows. Fall back to the legacy 0-price rows
    // only if scraping somehow yielded nothing (e.g. _ctc-section missing).
    const linur = costRows.length ? costRows.slice() : (function () {
      const arr = [];
      Object.entries(visit.grouped).forEach(([k, n]) => {
        const [type, size, kind] = k.split('|');
        arr.push({
          desc: (kind === 'hledsla' ? 'Hleðsla' : 'Yfirferð') + ' · ' + type + ' ' + size,
          qty: n, unit_price_ex_vat: 0, vsk_pct: 24
        });
      });
      return arr;
    })();
    // 2026-05-21: Manual extras come BEFORE the Skýrslugerð/Akstur lines so
    // they sit with the equipment items on the printed invoice.
    if (Array.isArray(visit.extras)) {
      visit.extras.forEach(e => {
        const q = Math.max(0, Number(e.qty) || 0);
        if (q === 0) return;
        linur.push({
          desc: String(e.name || 'Vara'),
          qty: q,
          unit_price_ex_vat: Math.max(0, Number(e.unit_price_ex_vat) || 0),
          vsk_pct: Number(e.vsk_pct) || 24
        });
      });
    }
    if (visit.skyrslugerd > 0) linur.push({ desc: 'Skýrslugerð', qty: 1, unit_price_ex_vat: visit.skyrslugerd, vsk_pct: 24 });
    // 2026-05-20: Akstur qty comes from the per-company driveQty input
    // (defaults to 1). Lets Agnar bill 2× Akstur etc. when extra trips needed.
    if (visit.drive > 0 && visit.driveQty > 0) {
      linur.push({ desc: 'Akstur', qty: visit.driveQty, unit_price_ex_vat: visit.drive, vsk_pct: 24 });
    }
    return linur;
  }

  async function runVisitWorkflow() {
    const coId = getCompanyId();
    let coNafn = getCompanyName();
    if (!coNafn && coId) coNafn = await fetchCompanyName(coId);
    if (!coId || !coNafn) {
      console.warn('[visit-workflow] coId=', coId, ' coNafn=', coNafn);
      alert('Fyrirtæki ekki fundið — opnaðu fyrirtæki að nýju og reyndu aftur.');
      return;
    }
    let visit;
    try { visit = await collectVisit(coId, coNafn); }
    catch (e) { alert('Villa: ' + (e.message || e)); return; }

    if (!visit.servicedIds.length) {
      alert('Engin tæki merkt í þessari heimsókn. Veldu Hleðsla eða Yfirferð á einhverju tæki fyrst.');
      return;
    }

    const totals = readTotalsFromSection();
    const today = todayIso();
    const next = addMonthsIso(today, 12);

    const sb = window.DB.sb;
    const costRows = scrapeCostRows();
    const linur = buildLinur(visit, costRows);

    // Fetch customer info so the preview invoice has kt + address.
    let custData = null;
    try {
      const c = await sb.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,simi').eq('id', coId).maybeSingle();
      if (c && c.data) custData = c.data;
    } catch (_) {}

    // Build a synthetic sale for the preview render.
    const subEx = totals ? totals.subEx : 0;
    const vsk   = totals ? totals.vsk   : 0;
    const total = totals ? totals.total : 0;
    // 2026-05-20: starfsmadur now comes from the Skoðunaraðili field on the
    // company page (e.g. "Elías"). Falls back to "Kassi" if not set.
    const starfsmadur = visit.skodunaradili || 'Kassi';
    const previewSale = {
      num: '(Forskoðun — óvistað)',
      customer_nafn: coNafn,
      customer_id: coId,
      starfsmadur,
      linur,
      upphaed_an_vsk: subEx,
      vsk_upphaed: vsk,
      samtals: total,
      afslattur: 0,
      greitt_med: 'reikningur',
      athugasemdir: `Heimsókn ${today} — ${visit.servicedIds.length} tæki, næsta skoðun ${next}`,
      created_at: new Date().toISOString()
    };

    showPreview(previewSale, custData, {
      coId, coNafn, visit, linur, totals, today, next, sb, starfsmadur
    });
  }

  // ── Preview modal — shows the bill as it will look + Aftur / Staðfesta ──
  function showPreview(previewSale, custData, ctx) {
    const existing = document.getElementById('_vw-preview');
    if (existing) existing.remove();
    const dlg = document.createElement('div');
    dlg.id = '_vw-preview';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,0.7);display:flex;align-items:center;justify-content:center;padding:18px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.4);width:min(960px,calc(100vw - 32px));height:calc(100vh - 60px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:12px 18px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;background:#fef3c7">' +
          '<div>' +
            '<div style="font-size:14px;font-weight:800;color:#92400e">📄 Forskoðun reiknings — ekki vistað enn</div>' +
            '<div style="font-size:11px;color:#78350f;margin-top:2px">Svona mun reikningurinn líta út. Smelltu „Aftur" til að breyta áfram — eða „Staðfesta" til að vista og prenta.</div>' +
          '</div>' +
          '<button id="_vw-close" type="button" style="background:transparent;border:none;font-size:22px;cursor:pointer;color:#78350f;line-height:1;padding:6px">✕</button>' +
        '</div>' +
        '<iframe id="_vw-frame" style="flex:1;border:none;background:#fff"></iframe>' +
        '<div style="padding:14px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">' +
          '<button id="_vw-back" type="button" style="padding:10px 18px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">← Aftur — breyta enn</button>' +
          '<button id="_vw-confirm" type="button" style="padding:10px 22px;background:#166534;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:800;box-shadow:0 1px 3px rgba(22,101,52,.3)">✓ Staðfesta — búa til reikning</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    const frame = dlg.querySelector('#_vw-frame');
    frame.src = 'about:blank';
    // Defer until the iframe's blank document is ready, then render.
    setTimeout(() => {
      try {
        if (window.SalaInvoice && typeof SalaInvoice.renderFromSale === 'function') {
          SalaInvoice.renderFromSale(frame.contentWindow, previewSale, custData);
        } else {
          const doc = frame.contentDocument || frame.contentWindow.document;
          doc.open();
          doc.write('<div style="padding:30px;font-family:Arial;color:#dc2626">Reikningsmótið er ekki tiltækt — get ekki sýnt forskoðun.</div>');
          doc.close();
        }
      } catch (e) {
        try {
          const doc = frame.contentDocument || frame.contentWindow.document;
          doc.open();
          doc.write('<div style="padding:30px;font-family:Arial;color:#dc2626">Villa: ' + esc(e.message || String(e)) + '</div>');
          doc.close();
        } catch (_) {}
      }
    }, 40);

    function close() { dlg.remove(); }
    dlg.querySelector('#_vw-close').addEventListener('click', close);
    dlg.querySelector('#_vw-back').addEventListener('click', close);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
    });

    const confirmBtn = dlg.querySelector('#_vw-confirm');
    confirmBtn.addEventListener('click', async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Vinn úr…';
      try {
        await finalizeVisit(ctx);
        close();
      } catch (e) {
        confirmBtn.disabled = false;
        confirmBtn.textContent = '✓ Staðfesta — búa til reikning';
        alert('Villa: ' + (e.message || e));
      }
    });
  }

  // ── Actual save — runs only after the user confirms in the preview ─────
  async function finalizeVisit({ coId, coNafn, visit, linur, totals, today, next, sb, starfsmadur }) {
    // 1. Bump last_insp + next_insp on all serviced units.
    const updateRes = await sb.from('uttaeki')
      .update({ last_insp: today, next_insp: next })
      .in('id', visit.servicedIds);
    if (updateRes.error) throw updateRes.error;

    // 2. Insert sale row.
    const subEx = totals ? totals.subEx : 0;
    const vsk   = totals ? totals.vsk   : 0;
    const total = totals ? totals.total : 0;
    let saleId = null;
    try {
      const ins = await sb.from('solur').insert({
        customer_nafn: coNafn,
        starfsmadur: starfsmadur || 'Kassi',
        linur,
        upphaed_an_vsk: subEx,
        vsk_upphaed: vsk,
        samtals: total,
        afslattur: 0,
        greitt_med: 'reikningur',
        athugasemdir: `Heimsókn ${today} — ${visit.servicedIds.length} tæki, næsta skoðun ${next}`
      }).select('num,id').single();
      if (ins.error) throw ins.error;
      saleId = ins.data && ins.data.id;
    } catch (e) {
      alert('Sala vistuð ekki: ' + (e.message || e) + '\n\n(Tækin þó uppfærð með nýrri dagsetningu.)');
    }

    // 3. Clear trip state.
    clearTrip(coId);

    // 4. Open the saved invoice for printing.
    if (saleId && window.SalaInvoice && typeof SalaInvoice.renderFromSale === 'function') {
      try {
        const r = await sb.from('solur').select('*').eq('id', saleId).single();
        if (r.data) {
          const w = window.open('', '_blank', 'width=900,height=1100');
          if (w) SalaInvoice.renderFromSale(w, r.data, null);
        }
      } catch (_) {}
    }

    // 5. Refresh company detail.
    if (window.Companies && typeof Companies.openDetail === 'function') {
      setTimeout(() => Companies.openDetail(coId), 200);
    }
  }

  function injectButtons() {
    const section = document.getElementById('_ctc-section');
    if (!section) return;
    if (section.querySelector('._vw-bar')) return; // already injected
    const bar = document.createElement('div');
    bar.className = '_vw-bar';
    bar.style.cssText = 'display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;justify-content:flex-end';
    bar.innerHTML =
      '<button id="_vw-finish" type="button" style="padding:10px 18px;background:#166534;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:14px;font-weight:700;box-shadow:0 1px 3px rgba(0,0,0,.15)">' +
      '✓ Klára heimsókn — búa til reikning</button>';
    section.appendChild(bar);
    section.querySelector('#_vw-finish').addEventListener('click', runVisitWorkflow);
  }

  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(injectButtons, 350);
    }).observe(main, { childList: true, subtree: true });
    injectButtons();
  }
  attach();

  console.log('[visit-workflow] installed');
})();
/* === END VISIT WORKFLOW v1 === */
