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
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const heading = main.querySelector('h1, h2, .company-name, [style*="font-size:21px"]');
    return heading ? heading.textContent.trim() : null;
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
    return {
      units,
      servicedIds,
      grouped,
      drive:      +trip.drive      || 0,
      skyrslugerd: +trip.skyrslugerd || 0
    };
  }

  async function runVisitWorkflow() {
    const coId = getCompanyId();
    const coNafn = getCompanyName();
    if (!coId || !coNafn) { alert('Fyrirtæki ekki fundið'); return; }
    let visit;
    try { visit = await collectVisit(coId, coNafn); }
    catch (e) { alert('Villa: ' + (e.message || e)); return; }

    if (!visit.servicedIds.length) {
      alert('Engin tæki merkt í þessari heimsókn. Veldu Hleðsla eða Yfirferð á einhverju tæki fyrst.');
      return;
    }

    const totals = readTotalsFromSection();
    const totalsStr = totals
      ? `Án VSK: ${fmtKr(totals.subEx)} · VSK: ${fmtKr(totals.vsk)} · Samtals: ${fmtKr(totals.total)}`
      : '(kostnaður óþekktur)';

    // Build summary lines (compact)
    const linesByKind = {};
    Object.entries(visit.grouped).forEach(([k, n]) => {
      const [type, size, kind] = k.split('|');
      const key = kind === 'hledsla' ? 'Hleðsla' : 'Yfirferð';
      linesByKind[key] = (linesByKind[key] || 0) + n;
    });
    const lineSummary = Object.entries(linesByKind)
      .map(([k, n]) => `${n}× ${k}`).join(' · ');

    const today = todayIso();
    const next = addMonthsIso(today, 12);

    const msg =
      `Klára heimsókn hjá "${coNafn}"?\n\n` +
      `${visit.servicedIds.length} tæki merkt (${lineSummary})\n` +
      `Skýrslugerð: ${fmtKr(visit.skyrslugerd)} · Akstur: ${fmtKr(visit.drive)}\n` +
      `${totalsStr}\n\n` +
      `Næsta skoðun verður færð á ${next} (12 mán) á öllum merktum tækjum.\n` +
      `Reikningur verður búinn til og opnaður fyrir prentun.`;
    if (!confirm(msg)) return;

    const sb = window.DB.sb;
    const trip = loadTrip(coId);

    // 1. Bump last_insp + next_insp on all serviced units.
    try {
      const updateRes = await sb.from('uttaeki')
        .update({ last_insp: today, next_insp: next })
        .in('id', visit.servicedIds);
      if (updateRes.error) throw updateRes.error;
    } catch (e) {
      alert('Tókst ekki að uppfæra dagsetningar á tækjum: ' + (e.message || e));
      return;
    }

    // 2. Insert sale in solur. Build line items from the grouped data + drive
    //    + skyrslugerd. Set greitt_med='reikningur' since brunakerfi/ársskoðun
    //    customers are invoiced (post-pay). Trigger assigns the num.
    const linur = [];
    Object.entries(visit.grouped).forEach(([k, n]) => {
      const [type, size, kind] = k.split('|');
      linur.push({
        desc: (kind === 'hledsla' ? 'Hleðsla' : 'Yfirferð') + ' · ' + type + ' ' + size,
        qty: n,
        // unit_price_ex_vat left blank — Stolpi/operator can fill from price
        // list. For now this is a marker that the units were serviced.
        unit_price_ex_vat: 0,
        vsk_pct: 24
      });
    });
    if (visit.skyrslugerd > 0) linur.push({ desc: 'Skýrslugerð', qty: 1, unit_price_ex_vat: visit.skyrslugerd, vsk_pct: 24 });
    if (visit.drive       > 0) linur.push({ desc: 'Akstur',      qty: 1, unit_price_ex_vat: visit.drive,       vsk_pct: 24 });

    const subEx = totals ? totals.subEx : 0;
    const vsk   = totals ? totals.vsk   : 0;
    const total = totals ? totals.total : 0;

    let saleId = null;
    try {
      const ins = await sb.from('solur').insert({
        customer_nafn: coNafn,
        starfsmadur: 'Kassi',
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

    // 3. Clear trip state — next visit starts fresh.
    clearTrip(coId);

    // 4. Open the invoice PDF for printing.
    if (saleId && window.SalaInvoice && typeof SalaInvoice.renderFromSale === 'function') {
      try {
        const r = await sb.from('solur').select('*').eq('id', saleId).single();
        if (r.data) {
          const w = window.open('', '_blank', 'width=900,height=1100');
          if (w) SalaInvoice.renderFromSale(w, r.data, null);
        }
      } catch (_) {}
    }

    // 5. Refresh the company detail so user sees updated next-insp dates.
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
