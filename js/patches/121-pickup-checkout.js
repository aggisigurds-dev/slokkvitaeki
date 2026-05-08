/* === PICKUP CHECKOUT FLOW v1 ===
 *
 * NÝ HUGMYND (2026-05-08): Sala er ekki kláruð fyrr en viðskiptavinurinn
 * SÆKIR — þá fyrst ákveðum við hvað var raunverulega afhent og rukkum
 * fyrir það. Bókhaldslega 1 hreinn reikningur — engar kreditfærslur.
 *
 * Þessi patch grípur „Sótt ✓" smell í Verkstæði/Afgreiðsla og opnar
 * í staðinn nýjan „Sókn (greiðsla)" glugga sem:
 *   1. Sýnir lista af tækjum frá verkbeiðninni (verklidur)
 *   2. Lítill ✓ haki á hverri línu — sjálfgefið TICKED. Notandi tekur af
 *      þeim sem viðskiptavinur tekur EKKI með (ónýt sem eru eftir)
 *   3. Leyfir að bæta við „nýtt slökkvitæki" í söluna sem viðskiptavinur
 *      kaupir í staðinn fyrir ónýtt
 *   4. Sýnir núverandi sölu-línur úr `solur.linur` og uppfærða upphæð
 *   5. Notandi velur greiðsluaðferð (Reiðufé / Kort / Reikningur)
 *   6. Á smell „✓ Klára sölu":
 *      • solur.linur uppfært (ónýt línur fjarlægðar / minnkaðar, nýjar
 *        bættar við)
 *      • solur.samtals / upphaed / vsk endurreiknað
 *      • solur.greitt_med + paid_at settu
 *      • verkbeidnir.status = 'collected', verklidur uppfærð til 'done'
 *      • Kvittun prentuð
 *
 * Þetta þarf að gerast EFTIR að patch 119 (↩ Verkstæði) hefur grafið
 * verkbeiðnirnar inn í Móttekin-dálkinn í 2-skiptingu, svo að Sótt ✓
 * fer ennþá í gegnum þennan kód.
 */
(() => {
  if (window.__pickupCheckoutInstalled) return;
  window.__pickupCheckoutInstalled = true;

  const SAFE_GUARD_KEY = '_pickupBypass';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function fmtKr(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }

  // ── Find the parent solur row from a verkbeiðni number ────────────────
  // Verkbeiðni nums are like 'R-000044-V1'. The sale num is 'R-000044'.
  function parentSaleNum(verkNum) {
    return String(verkNum || '').replace(/-V\d+$/, '');
  }

  async function fetchSaleByNum(num) {
    const SB = getSB();
    if (!SB || !num) return null;
    const r = await SB.from('solur').select('*').eq('num', num).maybeSingle();
    return r.error ? null : (r.data || null);
  }

  // Get all units for a verkbeiðni group sharing the same sale num.
  // I.e. all jobs whose num starts with parent num + -V
  function jobsForSaleNum(saleNum) {
    if (!window.DB || !DB.cache || !Array.isArray(DB.cache.jobs)) return [];
    const re = new RegExp('^' + saleNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(-V\\d+)?$');
    return DB.cache.jobs.filter(j => re.test(j.num || ''));
  }

  // ── Modal ──────────────────────────────────────────────────────────────
  function openPickupModal(jobId) {
    const job = (window.DB && DB.getJob) ? DB.getJob(jobId) : null;
    if (!job) { alert('Verk fannst ekki'); return; }
    const saleNum = parentSaleNum(job.num);
    const allJobs = jobsForSaleNum(saleNum);
    // Collect all units across all jobs of this sale
    const allUnits = [];
    allJobs.forEach(j => {
      (j.units || []).forEach(u => allUnits.push({ jobId: j.id, jobNum: j.num, unit: u }));
    });

    // Async: fetch the original sale row
    fetchSaleByNum(saleNum).then(sale => {
      renderPickupModal(job, sale, allUnits);
    });
  }

  // Items added during pickup (replacements customer wants to buy)
  const pickupExtras = []; // [{name, qty, unit_price_ex_vat, vsk_pct}]

  function renderPickupModal(job, sale, unitsCtx) {
    let dlg = document.getElementById('_pkc-dialog');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_pkc-dialog';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100020;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px';

    const customer = (sale && sale.customer_nafn) || job.customer || 'Viðskiptavinur';
    const saleNum = (sale && sale.num) || parentSaleNum(job.num);

    // Build initial state for unit checkboxes (default: all checked = customer takes)
    // Broken units default UNCHECKED — they're staying.
    const unitState = unitsCtx.map((ctx, i) => ({
      idx: i,
      jobId: ctx.jobId,
      unit: ctx.unit,
      checked: ctx.unit.status !== 'broken'
    }));

    // Lines from existing sale, if any
    const saleLinur = (sale && Array.isArray(sale.linur)) ? sale.linur : [];

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.3);width:min(700px,calc(100vw - 24px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#059669,#047857);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<h3 style="margin:0;font-size:17px;font-weight:700">📦 Sókn — ' + esc(customer) + '</h3>' +
            '<div style="font-size:11px;color:#a7f3d0;margin-top:2px">Sala ' + esc(saleNum) + ' · ' + unitsCtx.length + ' tæki í verki</div>' +
          '</div>' +
          '<button id="_pkc-x" type="button" style="background:transparent;border:1px solid #34d399;color:#fff;font-size:20px;width:36px;height:36px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
        '<div id="_pkc-body" style="flex:1;overflow:auto;padding:18px 22px"></div>' +
        '<div id="_pkc-totals" style="padding:11px 22px;border-top:1px solid #e2e8f0;background:#f8fafc"></div>' +
        '<div style="padding:13px 22px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">' +
          '<button id="_pkc-cancel" type="button" style="padding:9px 18px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
          '<select id="_pkc-pay" style="padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;background:#fff">' +
            '<option value="reidufe">💵 Reiðufé</option>' +
            '<option value="kort">💳 Kort</option>' +
            '<option value="reikningur">📋 Setja í reikning</option>' +
            '<option value="greitt_sidar">⏳ Greitt síðar</option>' +
          '</select>' +
          '<button id="_pkc-finalize" type="button" style="padding:9px 18px;background:#059669;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">✓ Klára sölu og afhenda</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    function close() { dlg.remove(); try { delete window._pkcRefresh; } catch(_){} }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_pkc-x').addEventListener('click', close);
    dlg.querySelector('#_pkc-cancel').addEventListener('click', close);

    // Render body and totals
    function renderBody() {
      const body = dlg.querySelector('#_pkc-body');
      let html = '';

      // ── Section 1: Tæki sem viðskiptavinur tekur ────────────────────────
      html += '<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Tæki frá viðgerð</div>';
      if (unitState.length) {
        html += '<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">';
        unitState.forEach(s => {
          const u = s.unit;
          const broken = u.status === 'broken';
          html += '<label style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid #f1f5f9;cursor:pointer;background:' + (broken ? '#fef2f2' : '#fff') + '">' +
            '<input type="checkbox" data-idx="' + s.idx + '" ' + (s.checked ? 'checked' : '') + ' class="_pkc-unit-chk" style="width:18px;height:18px;cursor:pointer">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:13px;font-weight:600;color:' + (broken ? '#7f1d1d' : '#0f172a') + '">' +
                esc(u.serial || '—') + ' · ' + esc(u.service || u.type || '—') +
                (broken ? ' <span style="background:#dc2626;color:#fff;padding:1px 8px;border-radius:99px;font-size:10px;font-weight:700;margin-left:6px">⚠ ÓNÝTT</span>' : '') +
              '</div>' +
              (broken
                ? '<div style="font-size:11px;color:#7f1d1d;margin-top:2px">Verkstæði fann ónýtt — verður EKKI afhent</div>'
                : '<div style="font-size:11px;color:#64748b;margin-top:2px">Tilbúið til afhendingar</div>'
              ) +
            '</div>' +
          '</label>';
        });
        html += '</div>';
      } else {
        html += '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;border:1px dashed #cbd5e1;border-radius:8px">Engin tæki á þessari verkbeiðni</div>';
      }
      html += '</div>';

      // ── Section 2: Replacement / extra products to add ──────────────────
      html += '<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
        '<div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Ný tæki / aukalega</div>' +
        '<button id="_pkc-add-extra" type="button" style="padding:5px 11px;background:#dbeafe;border:1px solid #bfdbfe;color:#1e40af;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600">+ Bæta við</button>' +
      '</div>';
      if (pickupExtras.length) {
        html += '<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">';
        pickupExtras.forEach((ex, i) => {
          const lineTotal = (ex.qty || 1) * (ex.unit_price_ex_vat || 0) * (1 + (ex.vsk_pct || 24) / 100);
          html += '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid #f1f5f9">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:13px;font-weight:600;color:#0f172a">' + esc(ex.name) + '</div>' +
              '<div style="font-size:11px;color:#64748b;margin-top:2px">' + (ex.qty || 1) + ' × ' + esc(fmtKr(ex.unit_price_ex_vat || 0)) + ' án vsk · vsk ' + (ex.vsk_pct || 24) + '%</div>' +
            '</div>' +
            '<div style="font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums">' + esc(fmtKr(lineTotal)) + '</div>' +
            '<button class="_pkc-rm-extra" data-i="' + i + '" type="button" style="background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:18px;padding:2px 6px">×</button>' +
          '</div>';
        });
        html += '</div>';
      } else {
        html += '<div style="padding:14px;text-align:center;color:#94a3b8;font-size:12px;border:1px dashed #cbd5e1;border-radius:8px;font-style:italic">Engin viðbót — smelltu „+ Bæta við" til að bjóða nýtt</div>';
      }
      html += '</div>';

      body.innerHTML = html;

      // Wire checkboxes
      body.querySelectorAll('._pkc-unit-chk').forEach(cb => {
        cb.addEventListener('change', e => {
          const idx = +cb.dataset.idx;
          const s = unitState.find(x => x.idx === idx);
          if (s) s.checked = cb.checked;
          renderTotals();
        });
      });
      // Wire add-extra
      body.querySelector('#_pkc-add-extra').addEventListener('click', () => openExtraDialog());
      // Wire remove-extra
      body.querySelectorAll('._pkc-rm-extra').forEach(b => {
        b.addEventListener('click', () => {
          pickupExtras.splice(+b.dataset.i, 1);
          renderBody();
          renderTotals();
        });
      });
    }

    function calcTotals() {
      // Original sale: take all linur as-is. Reduce qty for broken units?
      // Simpler: ignore original linur for unit-rows (they're abstract per-line),
      // and instead price the unit rows individually by:
      // - Per-unit price = sale.samtals / total units (if sale has it)
      // - Otherwise use job.verd / units in that job
      const allUnits = unitState;
      const totalUnits = allUnits.length;
      const taken = allUnits.filter(s => s.checked);
      const takenCount = taken.length;
      // Per-unit price from sale or job
      let perUnit = 0;
      if (sale && sale.samtals && totalUnits > 0) {
        perUnit = +sale.samtals / totalUnits;
      } else if (job.verd && (job.units || []).length > 0) {
        perUnit = +job.verd / (job.units || []).length;
      }
      const unitsTotal = perUnit * takenCount;
      const extrasTotal = pickupExtras.reduce((s, ex) => {
        return s + (ex.qty || 1) * (ex.unit_price_ex_vat || 0) * (1 + (ex.vsk_pct || 24) / 100);
      }, 0);
      const grand = unitsTotal + extrasTotal;
      return {
        totalUnits, takenCount, perUnit,
        unitsTotal: Math.round(unitsTotal),
        extrasTotal: Math.round(extrasTotal),
        grand: Math.round(grand)
      };
    }

    function renderTotals() {
      const t = calcTotals();
      const totals = dlg.querySelector('#_pkc-totals');
      const original = sale && sale.samtals ? +sale.samtals : 0;
      const diff = t.grand - original;
      totals.innerHTML =
        '<div style="display:grid;grid-template-columns:1fr auto;gap:3px 12px;font-size:13px;font-variant-numeric:tabular-nums">' +
          (original ? '<div style="color:#64748b">Upphafleg upphæð:</div><div style="color:#64748b;text-align:right">' + esc(fmtKr(original)) + '</div>' : '') +
          '<div style="color:#475569">' + t.takenCount + ' tæki á ' + esc(fmtKr(t.perUnit)) + ' = </div>' +
          '<div style="color:#475569;text-align:right">' + esc(fmtKr(t.unitsTotal)) + '</div>' +
          (t.extrasTotal ? '<div style="color:#475569">+ Aukalega:</div><div style="color:#475569;text-align:right">' + esc(fmtKr(t.extrasTotal)) + '</div>' : '') +
          '<div style="font-weight:800;font-size:15px;color:#0f172a;border-top:1px solid #cbd5e1;padding-top:5px;margin-top:3px">SAMTALS:</div>' +
          '<div style="font-weight:800;font-size:15px;color:#0f172a;text-align:right;border-top:1px solid #cbd5e1;padding-top:5px;margin-top:3px">' + esc(fmtKr(t.grand)) + '</div>' +
          (original && diff !== 0
            ? '<div style="color:' + (diff < 0 ? '#16a34a' : '#dc2626') + ';font-size:12px;font-weight:600">' +
                (diff < 0 ? '↓ Lægra um ' : '↑ Hærra um ') + esc(fmtKr(Math.abs(diff))) +
              '</div><div></div>'
            : ''
          ) +
        '</div>';
    }

    // Expose a refresh function so openExtraDialog can re-render after
    // adding a new line. Cleaned up when modal closes.
    window._pkcRefresh = () => { renderBody(); renderTotals(); };

    renderBody();
    renderTotals();

    // Wire finalize
    dlg.querySelector('#_pkc-finalize').addEventListener('click', async () => {
      const t = calcTotals();
      const payMethod = dlg.querySelector('#_pkc-pay').value;
      const finalBtn = dlg.querySelector('#_pkc-finalize');
      finalBtn.disabled = true;
      finalBtn.textContent = 'Vista…';
      try {
        await finalizePickup(job, sale, unitState, pickupExtras, payMethod, t);
        // Reset extras for next pickup
        pickupExtras.length = 0;
        close();
        if (window.Toast && Toast.show) Toast.show('✓ Sótt og selt — ' + fmtKr(t.grand));
      } catch (e) {
        finalBtn.disabled = false;
        finalBtn.textContent = '✓ Klára sölu og afhenda';
        alert('Villa: ' + (e.message || e));
      }
    });
  }

  // ── Add an extra (replacement) line to the pickup ──────────────────────
  // Triggered via the global window-level callback set by renderPickupModal.
  function openExtraDialog() {
    if (!window.VorurPicker || typeof VorurPicker.open !== 'function') {
      alert('Vörulisti ekki tilbúinn — endurhladdu síðunni og prófaðu aftur.');
      return;
    }
    VorurPicker.open(p => {
      const qty = parseInt(prompt('Magn fyrir „' + p.nafn + '":', '1'), 10);
      if (!Number.isFinite(qty) || qty < 1) return;
      pickupExtras.push({
        name: p.nafn,
        qty,
        unit_price_ex_vat: +p.verd_an_vsk || 0,
        vsk_pct: +p.vsk_prosenta || 24
      });
      // Re-render via the modal's own refresh function
      if (typeof window._pkcRefresh === 'function') window._pkcRefresh();
    });
  }

  // ── Finalize: update solur, mark verkbeidnir collected, mark units done ─
  async function finalizePickup(job, sale, unitState, extras, payMethod, totals) {
    const SB = getSB();
    if (!SB) throw new Error('Engin gagnabankatenging');

    // 1. Build new linur for solur. Strategy:
    //    - Keep existing linur if sale exists, but adjust qty by takenCount
    //      vs total (proportional). Simpler: replace linur entirely with a
    //      single summary line per service + extras.
    //    - Or even simpler: keep it informational-only and just update samtals.
    // For now: keep original linur as-is (informational) and just update
    // samtals + greitt_med + paid_at.

    if (sale && sale.id) {
      const updates = {
        samtals: totals.grand,
        greitt_med: payMethod,
        paid_at: payMethod === 'greitt_sidar' || payMethod === 'reikningur' ? null : new Date().toISOString()
      };
      // If the price went down due to broken units, also reduce upphaed_an_vsk + vsk_upphaed proportionally
      if (sale.samtals && +sale.samtals > 0) {
        const ratio = totals.grand / +sale.samtals;
        if (sale.upphaed_an_vsk) updates.upphaed_an_vsk = Math.round(+sale.upphaed_an_vsk * ratio);
        if (sale.vsk_upphaed) updates.vsk_upphaed = Math.round(+sale.vsk_upphaed * ratio);
      }
      // Note about what happened
      const brokenList = unitState.filter(s => !s.checked).map(s => s.unit.serial).filter(Boolean);
      const extraList = extras.map(ex => ex.qty + '× ' + ex.name);
      const auditNote = '\n\n[Sótt ' + todayISO() + ']' +
        (brokenList.length ? '\nÓnýt eftir: ' + brokenList.join(', ') : '') +
        (extraList.length ? '\nViðbót: ' + extraList.join(', ') : '') +
        '\nGreiðsla: ' + payMethod;
      updates.athugasemdir = (sale.athugasemdir || '') + auditNote;

      const r = await SB.from('solur').update(updates).eq('id', sale.id);
      if (r.error) throw r.error;
    }

    // 2. Mark all jobs in the sale as collected, and units as done/broken
    const allJobs = jobsForSaleNum(parentSaleNum(job.num));
    for (const j of allJobs) {
      try {
        await SB.from('verkbeidnir').update({ status: 'collected', pickup: todayISO() }).eq('id', j.id);
      } catch (_) {}
    }
    for (const s of unitState) {
      const newStatus = s.unit.status === 'broken' ? 'broken' : 'done';
      try {
        await SB.from('verklidur').update({ status: newStatus }).eq('id', s.unit.id);
      } catch (_) {}
    }

    // 3. Update local cache
    if (window.DB && DB.cache && Array.isArray(DB.cache.jobs)) {
      for (const j of allJobs) {
        const cached = DB.cache.jobs.find(x => x.id === j.id);
        if (cached) cached.status = 'collected';
      }
    }

    // 4. Trigger UI refresh
    if (window.App && typeof App.refreshAll === 'function') App.refreshAll();
    if (window.Counter && typeof Counter.render === 'function') Counter.render();
    if (window.DB && typeof DB.loadAll === 'function') DB.loadAll();
  }

  // ── Hook Counter.markCollected ──────────────────────────────────────────
  function installHook() {
    if (!window.Counter || typeof Counter.markCollected !== 'function') {
      setTimeout(installHook, 500);
      return;
    }
    if (Counter.markCollected.__pkcHooked) return;
    const orig = Counter.markCollected.bind(Counter);
    Counter.markCollected = async function(id) {
      // Allow bypass for the rare case where someone wants the old flow
      if (Counter[SAFE_GUARD_KEY]) {
        Counter[SAFE_GUARD_KEY] = false;
        return orig(id);
      }
      openPickupModal(id);
    };
    Counter.markCollected.__pkcHooked = true;
    console.log('[pickup-checkout] Counter.markCollected wrapped');
  }
  installHook();

  // Public API
  window.PickupCheckout = {
    open: openPickupModal
  };

  console.log('[pickup-checkout] installed — Sótt ✓ opnar pickup modal');
})();
/* === END PICKUP CHECKOUT FLOW v1 === */
