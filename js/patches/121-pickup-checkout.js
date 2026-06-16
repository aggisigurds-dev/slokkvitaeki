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
  // 2026-05-24: Final-adjustments state — applied on top of the sale right
  // before the draft flips to final. Both reset to defaults on modal close.
  let pickupDiscountPct = 0;   // 0–100 (%), scales every line's unit_price
  let pickupNote = '';         // free-text athugasemd appended to audit trail

  function renderPickupModal(job, sale, unitsCtx) {
    let dlg = document.getElementById('_pkc-dialog');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_pkc-dialog';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100020;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px';

    const customer = (sale && sale.customer_nafn) || job.customer || 'Viðskiptavinur';
    const saleNum = (sale && sale.num) || parentSaleNum(job.num);

    // 2026-05-19: Detect upfront payment. If sale was already paid at
    // drop-off (paid_at set + greitt_med is kort/reidufe), the pickup
    // modal must NOT show payment options — that's confusing. Show a
    // big GREEN "GREITT" banner instead so the operator can see at a
    // glance that no payment is needed.
    const isAlreadyPaid = !!(sale && sale.paid_at &&
      sale.greitt_med && /^(kort|reidufe|peningar|pening)$/i.test(sale.greitt_med));
    const paidMethodLabel = (sale && sale.greitt_med) === 'kort'    ? '💳 Kort' :
                            (sale && sale.greitt_med) === 'reidufe' ? '💵 Reiðufé' :
                            (sale && sale.greitt_med) ? esc(sale.greitt_med) : '';
    const paidWhen = sale && sale.paid_at ? new Date(sale.paid_at).toLocaleDateString('is-IS') : '';

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
        (isAlreadyPaid
          // PAID UPFRONT — green banner, no payment selector. Just deliver.
          ? '<div style="padding:0;border-top:1px solid #166534;background:#16a34a;color:#fff;display:flex;align-items:center;gap:14px;justify-content:space-between;flex-wrap:wrap">' +
              '<div style="padding:14px 22px;display:flex;align-items:center;gap:12px">' +
                '<div style="font-size:28px">✓</div>' +
                '<div>' +
                  '<div style="font-size:15px;font-weight:800;letter-spacing:.04em">GREITT</div>' +
                  '<div style="font-size:11px;color:#dcfce7">Greitt fyrirfram með ' + paidMethodLabel + (paidWhen ? ' · ' + paidWhen : '') + '</div>' +
                '</div>' +
              '</div>' +
              '<div style="padding:11px 22px;display:flex;gap:8px;flex-wrap:wrap">' +
                '<button id="_pkc-cancel" type="button" style="padding:9px 18px;border:1px solid rgba(255,255,255,0.4);border-radius:8px;background:transparent;color:#fff;cursor:pointer;font:inherit;font-size:13px">Hætta við</button>' +
                '<button id="_pkc-finalize" type="button" style="padding:9px 18px;background:#fff;color:#166534;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:800">📦 Afhenda tæki</button>' +
              '</div>' +
            '</div>'
          : '<div style="padding:13px 22px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">' +
              '<button id="_pkc-cancel" type="button" style="padding:9px 18px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
              '<select id="_pkc-pay" style="padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;background:#fff">' +
                // 2026-05-12: Default to Kort (card) — that's how the vast majority
                // of pickups are paid in 2026. Reiðufé moved to second.
                '<option value="kort" selected>💳 Kort</option>' +
                '<option value="reidufe">💵 Reiðufé</option>' +
                '<option value="reikningur">📋 Setja í reikning</option>' +
                '<option value="greitt_sidar">⏳ Greitt síðar</option>' +
              '</select>' +
              '<button id="_pkc-finalize" type="button" style="padding:9px 18px;background:#059669;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">✓ Klára sölu og afhenda</button>' +
            '</div>'
        ) +
      '</div>';
    document.body.appendChild(dlg);

    function close() {
      dlg.remove();
      // 2026-05-10 (F3 fix): clear extras on close so a re-open starts fresh.
      pickupExtras.length = 0;
      // 2026-05-24: same reset for the new final-adjustments fields so the
      // next pickup starts with a clean slate (no leaked discount/note).
      pickupDiscountPct = 0;
      pickupNote = '';
      try { delete window._pkcRefresh; } catch(_){}
    }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_pkc-x').addEventListener('click', close);
    dlg.querySelector('#_pkc-cancel').addEventListener('click', close);

    // Render body and totals
    function renderBody() {
      const body = dlg.querySelector('#_pkc-body');
      let html = '';

      // ── Section 0: Customer info (editable until paid) ──────────────────
      // Walk-ins (kt 999999-9999) often want to add their real kt at pickup
      // for their receipt. Allow editing here so user can update without
      // having to cancel + recreate the sale.
      const curNafn = (sale && sale.customer_nafn) || job.customer || '';
      const curKt = (sale && (sale.customer_kt || (sale.linur && sale.linur[0] && sale.linur[0].customer_kt))) || '';
      const curSimi = (job.phone || '');
      html += '<div style="margin-bottom:14px;padding:11px 13px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px">' +
        '<div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Upplýsingar á reikning</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">' +
          '<div>' +
            '<label style="display:block;font-size:10px;color:#64748b;font-weight:600;margin-bottom:3px">Nafn</label>' +
            '<input id="_pkc-cust-nafn" type="text" value="' + esc(curNafn) + '" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box">' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:10px;color:#64748b;font-weight:600;margin-bottom:3px">Kennitala (valkvætt)</label>' +
            '<input id="_pkc-cust-kt" type="text" placeholder="000000-0000" value="' + esc(curKt) + '" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box;font-family:monospace">' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:10px;color:#64748b;font-weight:600;margin-bottom:3px">Sími</label>' +
            '<input id="_pkc-cust-simi" type="tel" value="' + esc(curSimi) + '" style="width:100%;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box">' +
          '</div>' +
          '<div style="display:flex;align-items:end">' +
            '<div style="font-size:10px;color:#94a3b8;line-height:1.35">Þú getur breytt nafni og bætt við kennitölu áður en kvittunin er prentuð.</div>' +
          '</div>' +
        '</div>' +
      '</div>';

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
          // F1 fix: qty is now an inline editable input.
          html += '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid #f1f5f9">' +
            '<div style="flex:1;min-width:0">' +
              '<div style="font-size:13px;font-weight:600;color:#0f172a">' + esc(ex.name) + '</div>' +
              '<div style="font-size:11px;color:#64748b;margin-top:2px">' + esc(fmtKr(ex.unit_price_ex_vat || 0)) + ' án vsk · vsk ' + (ex.vsk_pct || 24) + '%</div>' +
            '</div>' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<input class="_pkc-extra-qty" data-i="' + i + '" type="number" min="1" step="1" value="' + (ex.qty || 1) + '" style="width:56px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;text-align:center;font-variant-numeric:tabular-nums">' +
              '<span style="color:#94a3b8;font-size:12px">×</span>' +
            '</div>' +
            '<div style="font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;min-width:80px;text-align:right">' + esc(fmtKr(lineTotal)) + '</div>' +
            '<button class="_pkc-rm-extra" data-i="' + i + '" type="button" title="Eyða línu" style="background:none;border:none;color:#cbd5e1;cursor:pointer;font-size:18px;padding:2px 6px">×</button>' +
          '</div>';
        });
        html += '</div>';
      } else {
        html += '<div style="padding:14px;text-align:center;color:#94a3b8;font-size:12px;border:1px dashed #cbd5e1;border-radius:8px;font-style:italic">Engin viðbót — smelltu „+ Bæta við" til að bjóða nýtt</div>';
      }
      html += '</div>';

      // ── Section 3: Final adjustments — discount + free-text note ────────
      // 2026-05-24: Lets the operator apply a percent discount and jot a
      // short note before the draft sale is finalised. Discount scales every
      // line's unit_price_ex_vat (mixed-VSK safe) and is also recorded in
      // the `afslattur` column for reporting. Note is appended to audit.
      html += '<div style="margin-bottom:14px;padding:12px 14px;background:#fef9c3;border:1px solid #fde68a;border-radius:8px">' +
        '<div style="font-size:12px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px">Lokastilling fyrir kvittun</div>' +
        '<div style="display:grid;grid-template-columns:auto auto 1fr;gap:8px 10px;align-items:center">' +
          '<label style="font-size:12px;font-weight:600;color:#78350f">Afsláttur:</label>' +
          '<div style="display:flex;align-items:center;gap:6px">' +
            '<input id="_pkc-disc" type="number" min="0" max="100" step="1" value="' + (pickupDiscountPct || 0) + '" ' +
              'style="width:64px;padding:5px 8px;border:1px solid #fde68a;border-radius:5px;font:inherit;font-size:13px;text-align:center;background:#fff">' +
            '<span style="font-size:12px;color:#78350f;font-weight:600">%</span>' +
          '</div>' +
          '<div id="_pkc-disc-kr" style="font-size:11.5px;color:#92400e;font-style:italic">' +
            (pickupDiscountPct ? '(reiknað þegar þú breytir % eða línum)' : '') +
          '</div>' +
          '<label style="font-size:12px;font-weight:600;color:#78350f;align-self:start;padding-top:5px">Athugasemd:</label>' +
          '<textarea id="_pkc-note" rows="2" placeholder="t.d. afsláttur — fastur kúnni · kennitala send eftir á · annað" ' +
            'style="grid-column:2 / span 2;width:100%;padding:6px 9px;border:1px solid #fde68a;border-radius:5px;font:inherit;font-size:12.5px;line-height:1.4;resize:vertical;box-sizing:border-box;background:#fff">' + esc(pickupNote || '') + '</textarea>' +
        '</div>' +
      '</div>';

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
      // Wire qty edit on extras
      body.querySelectorAll('._pkc-extra-qty').forEach(inp => {
        inp.addEventListener('input', () => {
          const i = +inp.dataset.i;
          const v = parseInt(inp.value, 10);
          if (!Number.isFinite(v) || v < 1) return;
          if (pickupExtras[i]) {
            pickupExtras[i].qty = v;
            renderTotals();
            // Update the line-total cell next to this input without full re-render
            const cell = inp.closest('div[style*="padding:9px"]');
            if (cell) {
              const totalEl = cell.querySelector('div[style*="min-width:80px"]');
              if (totalEl) {
                const ex = pickupExtras[i];
                const lt = (ex.qty || 1) * (ex.unit_price_ex_vat || 0) * (1 + (ex.vsk_pct || 24) / 100);
                totalEl.textContent = fmtKr(lt);
              }
            }
          }
        });
      });
      // Wire remove-extra
      body.querySelectorAll('._pkc-rm-extra').forEach(b => {
        b.addEventListener('click', () => {
          pickupExtras.splice(+b.dataset.i, 1);
          renderBody();
          renderTotals();
        });
      });
      // 2026-05-24: Normalise kennitala field on input/blur so the user sees
      // the canonical XXXXXX-XXXX format appear as they type. DB trigger also
      // normalises on write — this is the UI-feedback half of the same fix.
      if (window.U && typeof U.bindKtInput === 'function') {
        const ktInp = dlg.querySelector('#_pkc-cust-kt');
        if (ktInp) U.bindKtInput(ktInp);
      }
      // 2026-05-24: Wire discount + note inputs. Discount triggers a totals
      // recompute without re-rendering the whole body (keeps caret position
      // in the textarea). Note is just stashed; written out at finalize.
      const discInp = body.querySelector('#_pkc-disc');
      if (discInp) {
        discInp.addEventListener('input', () => {
          const v = parseFloat(discInp.value);
          pickupDiscountPct = Number.isFinite(v) && v >= 0 ? Math.min(100, v) : 0;
          renderTotals();
        });
      }
      const noteInp = body.querySelector('#_pkc-note');
      if (noteInp) {
        noteInp.addEventListener('input', () => { pickupNote = noteInp.value; });
      }
    }

    function calcTotals() {
      const allUnits = unitState;
      const totalUnits = allUnits.length;
      const takenCount = allUnits.filter(s => s.checked).length;
      // Mirror finalizePickup so the preview matches what is actually charged:
      // peel the UNCHECKED units off the largest-qty lines (the old
      // samtals/totalUnits estimate diverged on sales mixing units + products).
      let unitsTotal = 0;
      const oldLinur = (sale && Array.isArray(sale.linur)) ? sale.linur.map(l => ({ ...l, qty: +l.qty || 0 })) : [];
      if (oldLinur.length) {
        let toRemove = totalUnits - takenCount;
        if (toRemove > 0) {
          const order = oldLinur.map((l, i) => ({ i, qty: l.qty })).sort((a, b) => b.qty - a.qty);
          for (const e of order) { if (toRemove <= 0) break; const take = Math.min(toRemove, oldLinur[e.i].qty); oldLinur[e.i].qty -= take; toRemove -= take; }
          if (toRemove > 0 && totalUnits > 0) { const ratio = takenCount / totalUnits; oldLinur.forEach(l => { l.qty = Math.max(0, Math.round(l.qty * ratio)); }); }
        }
        unitsTotal = oldLinur.reduce((a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0) * (1 + (+l.vsk_pct || 24) / 100), 0);
      } else if (job.verd && (job.units || []).length > 0) {
        unitsTotal = (+job.verd / (job.units || []).length) * takenCount;
      }
      const perUnit = takenCount > 0 ? unitsTotal / takenCount : 0;
      const extrasTotal = pickupExtras.reduce((s, ex) => {
        return s + (ex.qty || 1) * (ex.unit_price_ex_vat || 0) * (1 + (ex.vsk_pct || 24) / 100);
      }, 0);
      const subTotal = unitsTotal + extrasTotal;
      // 2026-05-24: Apply optional pickup-time discount (0–100 %).
      const discPct = Math.max(0, Math.min(100, +pickupDiscountPct || 0));
      const discountKr = subTotal * discPct / 100;
      const grand = subTotal - discountKr;
      return {
        totalUnits, takenCount, perUnit,
        unitsTotal: Math.round(unitsTotal),
        extrasTotal: Math.round(extrasTotal),
        subTotal: Math.round(subTotal),
        discountPct: discPct,
        discountKr: Math.round(discountKr),
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
          (t.discountKr
            ? '<div style="color:#b45309;font-weight:600">− Afsláttur (' + t.discountPct + '%):</div>' +
              '<div style="color:#b45309;font-weight:600;text-align:right">−' + esc(fmtKr(t.discountKr)) + '</div>'
            : ''
          ) +
          '<div style="font-weight:800;font-size:15px;color:#0f172a;border-top:1px solid #cbd5e1;padding-top:5px;margin-top:3px">SAMTALS:</div>' +
          '<div style="font-weight:800;font-size:15px;color:#0f172a;text-align:right;border-top:1px solid #cbd5e1;padding-top:5px;margin-top:3px">' + esc(fmtKr(t.grand)) + '</div>' +
          (original && diff !== 0
            ? '<div style="color:' + (diff < 0 ? '#16a34a' : '#dc2626') + ';font-size:12px;font-weight:600">' +
                (diff < 0 ? '↓ Lægra um ' : '↑ Hærra um ') + esc(fmtKr(Math.abs(diff))) +
              '</div><div></div>'
            : ''
          ) +
        '</div>';
      // Live-update the small "kr afsláttur" hint next to the discount input
      const krEl = dlg.querySelector('#_pkc-disc-kr');
      if (krEl) {
        krEl.textContent = t.discountKr
          ? '= −' + fmtKr(t.discountKr) + ' kr'
          : '';
      }
    }

    // Expose a refresh function so openExtraDialog can re-render after
    // adding a new line. Cleaned up when modal closes.
    window._pkcRefresh = () => { renderBody(); renderTotals(); };

    renderBody();
    renderTotals();

    // Wire finalize
    dlg.querySelector('#_pkc-finalize').addEventListener('click', async () => {
      const t = calcTotals();
      // If sale was paid upfront, the payment selector isn't rendered —
      // reuse the existing greitt_med from the sale row instead.
      const paySelect = dlg.querySelector('#_pkc-pay');
      const payMethod = paySelect
        ? paySelect.value
        : ((sale && sale.greitt_med) || 'kort');
      // 2026-05-11: Capture edited customer info — user may have added kt
      // or changed name/phone since drop-off
      const customerInfo = {
        nafn: (dlg.querySelector('#_pkc-cust-nafn')?.value || '').trim(),
        kt: (dlg.querySelector('#_pkc-cust-kt')?.value || '').trim(),
        simi: (dlg.querySelector('#_pkc-cust-simi')?.value || '').trim()
      };
      const finalBtn = dlg.querySelector('#_pkc-finalize');
      finalBtn.disabled = true;
      finalBtn.textContent = 'Vista…';
      try {
        // 2026-05-24: Pass the pickup-time discount % and free-text note
        // captured in the modal. finalizePickup applies the discount by
        // scaling each line's unit_price_ex_vat and stores the kr amount
        // in `afslattur`; note is appended to the audit trail.
        await finalizePickup(job, sale, unitState, pickupExtras, payMethod, t, customerInfo, pickupDiscountPct, pickupNote);
        // Reset extras + final-adjustments state for next pickup
        pickupExtras.length = 0;
        pickupDiscountPct = 0;
        pickupNote = '';
        const saleNumForPrint = parentSaleNum(job.num);
        close();
        if (window.Toast && Toast.show) Toast.show('✓ Sótt og selt — ' + fmtKr(t.grand));
        // 2026-05-12 (#9): After pickup, offer to print the receipt. The sale
        // was just updated with final linur + paid_at, so we re-fetch and
        // hand it to SalaInvoice.renderFromSale (same template as Sala).
        setTimeout(() => offerReceiptPrint(saleNumForPrint), 400);
      } catch (e) {
        finalBtn.disabled = false;
        finalBtn.textContent = '✓ Klára sölu og afhenda';
        alert('Villa: ' + (e.message || e));
      }
    });
  }

  // ── Add an extra (replacement) line to the pickup ──────────────────────
  // 2026-05-10 (B5 fix): Replaced native `prompt()` with a custom qty modal.
  // The native prompt blocked the entire browser thread (including the MCP /
  // automation tooling), and looked out of place against the rest of the app.
  function openExtraDialog() {
    if (!window.VorurPicker || typeof VorurPicker.open !== 'function') {
      alert('Vörulisti ekki tilbúinn — endurhladdu síðunni og prófaðu aftur.');
      return;
    }
    VorurPicker.open(p => askQty(p, qty => {
      if (!Number.isFinite(qty) || qty < 1) return;
      pickupExtras.push({
        name: p.nafn,
        qty,
        unit_price_ex_vat: +p.verd_an_vsk || 0,
        vsk_pct: +p.vsk_prosenta || 24
      });
      if (typeof window._pkcRefresh === 'function') window._pkcRefresh();
    }));
  }

  // Custom qty prompt — non-blocking, themed, keyboard-friendly.
  function askQty(product, onPicked) {
    const existing = document.getElementById('_pkc-qty-dialog');
    if (existing) existing.remove();
    const dlg = document.createElement('div');
    dlg.id = '_pkc-qty-dialog';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100030;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:16px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3);width:min(420px,calc(100vw - 32px));overflow:hidden">' +
        '<div style="padding:13px 18px;background:linear-gradient(135deg,#0d6efd,#0a58ca);color:#fff">' +
          '<div style="font-size:11px;color:#bfdbfe;text-transform:uppercase;letter-spacing:0.06em;font-weight:600">Magn</div>' +
          '<div style="font-size:15px;font-weight:700;margin-top:2px">' + esc(product.nafn) + '</div>' +
        '</div>' +
        '<div style="padding:18px">' +
          '<input id="_pkc-qty-input" type="number" min="1" step="1" value="1" autofocus style="width:100%;padding:11px 14px;border:1.5px solid #cbd5e1;border-radius:8px;font:inherit;font-size:18px;text-align:center;font-variant-numeric:tabular-nums;box-sizing:border-box">' +
          '<div style="font-size:11px;color:#64748b;margin-top:6px;text-align:center">Sláðu inn fjölda · Enter = staðfesta · Esc = hætta við</div>' +
        '</div>' +
        '<div style="padding:11px 18px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end">' +
          '<button id="_pkc-qty-cancel" type="button" style="padding:8px 16px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
          '<button id="_pkc-qty-ok" type="button" style="padding:8px 18px;background:#0d6efd;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">Bæta við</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    const inp = dlg.querySelector('#_pkc-qty-input');
    function close() { dlg.remove(); }
    function submit() {
      const v = parseInt(inp.value, 10);
      close();
      onPicked(v);
    }
    dlg.querySelector('#_pkc-qty-cancel').addEventListener('click', close);
    dlg.querySelector('#_pkc-qty-ok').addEventListener('click', submit);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); submit(); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
    setTimeout(() => { inp.focus(); inp.select(); }, 30);
  }

  // ── Finalize: update solur, mark verkbeidnir collected, mark units done ─
  async function finalizePickup(job, sale, unitState, extras, payMethod, totals, customerInfo, discountPct, userNote) {
    const SB = getSB();
    if (!SB) throw new Error('Engin gagnabankatenging');

    // Phase B (2026-05-09): Replace linur to reflect what was ACTUALLY
    // delivered. Original linur are scaled proportionally by takenCount /
    // totalUnits (handles the common case of "12 hleðslur kom inn, 4 ónýt,
    // 8 afhent → qty 12 → 8"). Lines whose qty rounds to 0 are dropped.
    // Extras added at pickup are appended as new lines. Totals are
    // recomputed from the new linur (not proportional from old samtals).
    // Status flips drög → final.

    // Build the final linur (the actual delivered lines).
    //
    // Two paths:
    //   A) sale exists (POS sold upfront, or patch 122 created a draft solur)
    //      → scale existing linur proportionally by takenCount / totalUnits,
    //        append extras, recompute totals, UPDATE the row.
    //   B) sale missing (no upfront sale, no draft → "Sækja inn" before this
    //      fix shipped, or solur insert failed for any reason)
    //      → INSERT a new solur row with extras only as the line items, since
    //        we have no source price data. Totals come from extras.
    const totalUnits = unitState.length;
    const takenCount = unitState.filter(s => s.checked).length;
    const unchecked = totalUnits - takenCount;

    // 2026-05-15: FIXED — was scaling each line by (taken/total) ratio,
    // which silently rounds back to the original when each cart line has
    // qty=1 (5 lines × 0.8 ratio → round(0.8)=1 → no reduction). For KAT
    // this meant the printed receipt still showed 50.000 kr after the user
    // unchecked a broken unit. Now we directly subtract `unchecked` items
    // from the line pool, starting with the largest-qty line so single-qty
    // lines drop out cleanly when broken.
    const oldLinur = (sale && Array.isArray(sale.linur)) ? sale.linur : [];
    const workingLinur = oldLinur.map(l => ({ ...l, qty: +l.qty || 0 }));
    let toRemove = unchecked;
    if (toRemove > 0) {
      // Sort by qty descending — peel from biggest first
      const order = workingLinur
        .map((l, i) => ({ i, qty: l.qty }))
        .sort((a, b) => b.qty - a.qty);
      for (const entry of order) {
        if (toRemove <= 0) break;
        const take = Math.min(toRemove, workingLinur[entry.i].qty);
        workingLinur[entry.i].qty -= take;
        toRemove -= take;
      }
      // Safety: if we couldn't account for every unchecked (e.g. linur qty
      // sum < totalUnits), fall back to proportional scaling for whatever
      // remains. Rare edge case.
      if (toRemove > 0 && totalUnits > 0) {
        const ratio = takenCount / totalUnits;
        workingLinur.forEach(l => { l.qty = Math.max(0, Math.round(l.qty * ratio)); });
      }
    }
    const newLinur = workingLinur.filter(l => l.qty > 0);

    extras.forEach(ex => {
      newLinur.push({
        desc: ex.name,
        qty: ex.qty,
        unit_price_ex_vat: ex.unit_price_ex_vat,
        vsk_pct: ex.vsk_pct,
        type: 'product'
      });
    });

    // 2026-05-24: Apply optional pickup-time discount by scaling every
    // line's unit_price_ex_vat. Doing it on the lines (rather than just
    // adjusting the grand total) keeps mixed-VSK math correct: each line
    // still pays its own VSK rate, just on a discounted base. Captures
    // the kr amount in `afslatturKr` for the `afslattur` column.
    const discPct = Math.max(0, Math.min(100, +discountPct || 0));
    let afslatturKr = 0;
    if (discPct > 0 && newLinur.length) {
      const preEx = newLinur.reduce((a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0), 0);
      const preVsk = newLinur.reduce((a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0) * ((+l.vsk_pct || 0) / 100), 0);
      const preSamtals = preEx + preVsk;
      const factor = 1 - discPct / 100;
      newLinur.forEach(l => { l.unit_price_ex_vat = +l.unit_price_ex_vat * factor; });
      afslatturKr = Math.round(preSamtals * discPct / 100);
    }

    const newEx = newLinur.reduce(
      (a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0), 0);
    const newVsk = newLinur.reduce(
      (a, l) => a + (+l.qty || 0) * (+l.unit_price_ex_vat || 0) * ((+l.vsk_pct || 0) / 100), 0);
    const newSamtals = newEx + newVsk;

    const brokenList = unitState.filter(s => !s.checked).map(s => s.unit.serial).filter(Boolean);
    const extraList = extras.map(ex => ex.qty + '× ' + ex.name);
    const trimmedNote = (userNote || '').trim();
    const auditNote = '\n\n[Sótt ' + todayISO() + ']' +
      (brokenList.length ? '\nEkki afhent: ' + brokenList.join(', ') : '') +
      (extraList.length ? '\nViðbót: ' + extraList.join(', ') : '') +
      (afslatturKr ? '\nAfsláttur: ' + discPct + '% (−' + afslatturKr + ' kr)' : '') +
      (trimmedNote ? '\nAthugasemd: ' + trimmedNote : '') +
      '\nGreiðsla: ' + payMethod;

    // 2026-05-11: Customer info captured from the pickup modal — may have
    // been edited (e.g. walk-in adds kt at pickup, name corrected). Look up
    // by kt to link customer_id if present, otherwise just store the nafn.
    let customerIdToSave = sale && sale.customer_id;
    let customerNafnToSave = sale ? sale.customer_nafn : (job.customer || '');
    if (customerInfo && customerInfo.nafn) customerNafnToSave = customerInfo.nafn;
    if (customerInfo && customerInfo.kt) {
      const cleanKt = customerInfo.kt.replace(/[^0-9]/g, '');
      if (cleanKt.length === 10 && cleanKt !== '9999999999') {
        try {
          const fy = await SB.from('fyrirtaeki').select('id,nafn').eq('kennitala', cleanKt).maybeSingle();
          if (fy.data) { customerIdToSave = fy.data.id; if (!customerInfo.nafn) customerNafnToSave = fy.data.nafn; }
          else {
            const vk = await SB.from('vidskiptavinir').select('id,nafn').eq('kennitala', cleanKt).maybeSingle();
            if (vk.data) { customerIdToSave = vk.data.id; if (!customerInfo.nafn) customerNafnToSave = vk.data.nafn; }
          }
        } catch (_) {}
      }
    }
    const ktAuditNote = (customerInfo && customerInfo.kt && customerInfo.kt.replace(/[^0-9]/g,'') !== '9999999999')
      ? '\nKt: ' + customerInfo.kt
      : '';
    if (sale && sale.id) {
      // Path A: update the existing draft sale → final.
      const updates = {
        status: 'final',
        linur: newLinur,
        upphaed_an_vsk: Math.round(newEx),
        vsk_upphaed: Math.round(newVsk),
        // 2026-05-24: Record pickup-time discount kr; 0 if none was set.
        afslattur: afslatturKr,
        samtals: Math.round(newSamtals),
        greitt_med: payMethod,
        paid_at: payMethod === 'greitt_sidar' || payMethod === 'reikningur' ? null : new Date().toISOString(),
        customer_nafn: customerNafnToSave,
        customer_id: customerIdToSave,
        athugasemdir: (sale.athugasemdir || '') + ktAuditNote + auditNote
      };
      let r = await SB.from('solur').update(updates).eq('id', sale.id);
      if (r.error && /status/i.test(r.error.message || '')) {
        // status column missing — retry without status
        const { status, ...rest } = updates;
        r = await SB.from('solur').update(rest).eq('id', sale.id);
      }
      if (r.error) throw r.error;
    } else {
      // 2026-05-10 (B1 fix) Path B: no sale exists yet. INSERT a new solur
      // row right now so the transaction has accounting visibility. Common
      // case: "Sækja inn úr fyrirtæki" verkbeiðnir from before patch 122
      // started creating draft solur, OR if that draft insert failed.
      const newSale = {
        num: parentSaleNum(job.num),
        starfsmadur: 'Verkstæði',
        customer_nafn: job.customer || '',
        customer_id: null,
        linur: newLinur,
        upphaed_an_vsk: Math.round(newEx),
        vsk_upphaed: Math.round(newVsk),
        afslattur: afslatturKr,
        samtals: Math.round(newSamtals),
        greitt_med: payMethod,
        paid_at: payMethod === 'greitt_sidar' || payMethod === 'reikningur' ? null : new Date().toISOString(),
        athugasemdir: 'Stofnað við Sótt ✓ úr verkstæðis-afhendingu' + auditNote,
        status: 'final'
      };
      let r = await SB.from('solur').insert(newSale).select().single();
      if (r.error && /status/i.test(r.error.message || '')) {
        const { status, ...rest } = newSale;
        r = await SB.from('solur').insert(rest).select().single();
      }
      if (r.error) throw r.error;
    }

    // 2. Mark all jobs in the sale as collected, and units as done/broken
    const allJobs = jobsForSaleNum(parentSaleNum(job.num));
    for (const j of allJobs) {
      try {
        await SB.from('verkbeidnir').update({ status: 'collected', pickup: todayISO() }).eq('id', j.id);
      } catch (_) {}
    }
    // 2026-05-11 fix: If user UNCHECKED a unit in the pickup modal it means
    // "not delivered" — so its verklidur should be marked 'broken'. Previously
    // we only set 'broken' if DB ALREADY had it as 'broken', which meant
    // unchecking in the modal had ZERO effect on stored status (samtals didn't
    // reduce either because price-scaling relies on this state).
    for (const s of unitState) {
      const newStatus = s.checked ? 'done' : 'broken';
      try {
        await SB.from('verklidur').update({ status: newStatus }).eq('id', s.unit.id);
      } catch (_) {}
    }

    // 2b. (2026-05-10) For verklidur with a uttaeki_id link (created by
    // patch 122's "Sækja inn" flow), auto-update the uttaeki row:
    //   • not broken + customer took it → next_insp = today + 12 mán,
    //     last_insp = today, status = 'active'
    //   • broken → uttaeki.status = 'broken' (replaced; stays out of
    //     normal scheduling until manually returned to service)
    // This eliminates the manual 12-month rescheduling step.
    const today = todayISO();
    const next12mo = (() => {
      const d = new Date(); d.setMonth(d.getMonth() + 12);
      return d.toISOString().slice(0, 10);
    })();
    for (const s of unitState) {
      const uid = s.unit && s.unit.uttaeki_id;
      if (!uid) continue;
      try {
        if (s.unit.status === 'broken') {
          await SB.from('uttaeki').update({ status: 'broken' }).eq('id', uid);
        } else if (s.checked) {
          await SB.from('uttaeki').update({
            status: 'active',
            last_insp: today,
            next_insp: next12mo
          }).eq('id', uid);
        }
        // s.checked === false (customer didn't take it back) → leave uttaeki
        // alone; the field-service record stays as-is.
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

  // ── 2026-05-12 (#9): Receipt print prompt after pickup ──────────────────
  // Shows a small dialog with "🖨 Prenta kvittun" + "Sleppa" so the user can
  // hand the customer a receipt right after the Sótt-flow completes.
  async function offerReceiptPrint(saleNum) {
    const SB = getSB();
    if (!SB || !saleNum) return;
    let sale = null;
    try {
      const r = await SB.from('solur').select('*').eq('num', saleNum).maybeSingle();
      sale = r.data;
    } catch (_) {}
    if (!sale) return;
    if (!window.SalaInvoice || typeof SalaInvoice.renderFromSale !== 'function') return;

    document.getElementById('_pkc-print-prompt')?.remove();
    const dlg = document.createElement('div');
    dlg.id = '_pkc-print-prompt';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;padding:22px 26px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(15,23,42,.3);">' +
        '<h2 style="margin:0 0 6px;font-size:17px;color:#0f172a;">✓ Sótt og selt</h2>' +
        '<div style="font-size:13px;color:#64748b;margin-bottom:16px;">Salnúmer ' + esc(saleNum) + ' · ' + fmtKr(sale.samtals || 0) + '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end">' +
          '<button id="_pkc-print-skip" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Sleppa</button>' +
          '<button id="_pkc-print-go" type="button" style="padding:9px 18px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">🖨 Prenta kvittun</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    function closePrompt() { dlg.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); closePrompt(); }
      if (e.key === 'Enter')  { e.preventDefault(); doPrint(); }
    }
    document.addEventListener('keydown', onKey);
    dlg.querySelector('#_pkc-print-skip').addEventListener('click', closePrompt);
    dlg.addEventListener('click', e => { if (e.target === dlg) closePrompt(); });
    async function doPrint() {
      const win = window.open('', '_blank', 'width=900,height=1100');
      if (!win) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta kvittun.'); return; }
      let cust = null;
      if (sale.customer_id) {
        try {
          const c = await SB.from('vidskiptavinir').select('*').eq('id', sale.customer_id).maybeSingle();
          if (c.data) cust = c.data;
          else {
            const f = await SB.from('fyrirtaeki').select('*').eq('id', sale.customer_id).maybeSingle();
            if (f.data) cust = f.data;
          }
        } catch (_) {}
      }
      try { SalaInvoice.renderFromSale(win, sale, cust); } catch (e) { alert('Villa: ' + (e.message || e)); }
      closePrompt();
    }
    dlg.querySelector('#_pkc-print-go').addEventListener('click', doPrint);
    // Auto-focus the print button — Enter prints, Escape skips
    setTimeout(() => dlg.querySelector('#_pkc-print-go')?.focus(), 30);
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
