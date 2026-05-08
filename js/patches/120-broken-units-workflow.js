/* === BROKEN UNITS WORKFLOW v1 ===
 *
 * Verkstæðismaður finnur tæki ónýtt þegar hleðsla er reynd. Þarf:
 *   1. Að geta merkt tækið sem ónýtt (verklidur.status='broken')
 *   2. Afgreiðslufólk sér viðvörun á verkbeiðninni þegar viðskiptavinur
 *      kemur að sækja → veit að það þarf að bjóða nýtt í staðinn
 *
 * Þessi patch bætir við:
 *
 * ── Á Verkstæði (counter-main detail) ──────────────────────────────────
 *   • 🚫 Ónýtt takki á hverri tækjarúðu
 *     – status='received'/'inprogress'/'done' → smellur → 'broken'
 *     – status='broken' → rauð undirstaða + smellur tekur af
 *   • Status badge á rúðunni er rauður „⚠ ÓNÝTT"
 *
 * ── Á Afgreiðslu (counter-main detail þegar verkbeiðni opnuð) ──────────
 *   • Áberandi rauður banner efst:
 *     „⚠ 4 af 15 tækjum eru ónýt — bjóða viðskiptavin nýtt í staðinn"
 *   • Takki: „🛒 Bæta nýju tæki í Sala"
 *     – Skiptir í Sala-view, leggur tækið í körfu
 *     – Forhleður tegund út frá ónýta tækinu
 */
(() => {
  if (window.__brokenUnitsInstalled) return;
  window.__brokenUnitsInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ── Toggle a verklidur row's broken status ─────────────────────────────
  async function toggleBroken(unitId, currentStatus, btn, row) {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }
    const isBrokenNow = currentStatus === 'broken';
    const newStatus = isBrokenNow ? 'received' : 'broken';
    if (!isBrokenNow) {
      if (!confirm('Merkja tæki sem ÓNÝTT?\n\nAfgreiðslufólk sér viðvörun á verkbeiðninni og getur boðið viðskiptavin nýtt í staðinn.')) return;
    }
    btn.disabled = true;
    btn.textContent = '...';
    try {
      const r = await SB.from('verklidur').update({ status: newStatus }).eq('id', unitId);
      if (r.error) throw r.error;
      // Update local cache
      if (window.DB && DB.cache && Array.isArray(DB.cache.jobs)) {
        for (const job of DB.cache.jobs) {
          if (!Array.isArray(job.units)) continue;
          const u = job.units.find(x => x.id === unitId);
          if (u) { u.status = newStatus; break; }
        }
      }
      // Update visuals
      stylizeRow(row, newStatus);
      stylizeBtn(btn, newStatus);
      // Refresh warning banner
      injectWarningBanner();
      if (window.Toast && Toast.show) {
        Toast.show(newStatus === 'broken' ? '🚫 Tæki merkt ónýtt' : '✓ Tæki aftur í lagi');
      }
    } catch (e) {
      alert('Villa: ' + (e.message || e));
      stylizeBtn(btn, currentStatus);
    } finally {
      btn.disabled = false;
    }
  }

  function stylizeBtn(btn, status) {
    if (status === 'broken') {
      btn.style.background = '#dc2626';
      btn.style.borderColor = '#991b1b';
      btn.style.color = '#fff';
      btn.innerHTML = '🚫 Ónýtt ✓';
      btn.title = 'Tæki er merkt ónýtt — smelltu til að taka af';
    } else {
      btn.style.background = '#fff';
      btn.style.borderColor = '#fecaca';
      btn.style.color = '#dc2626';
      btn.innerHTML = '🚫 Ónýtt';
      btn.title = 'Merkja tæki sem ónýtt';
    }
  }

  function stylizeRow(row, status) {
    if (status === 'broken') {
      row.style.background = '#fef2f2';
      row.style.borderLeft = '4px solid #dc2626';
      // Replace status badge text
      const badgeCell = row.querySelector('td:nth-child(5)');
      if (badgeCell) {
        badgeCell.innerHTML = '<span style="display:inline-block;padding:3px 9px;background:#dc2626;color:#fff;border-radius:99px;font-size:10px;font-weight:700;letter-spacing:0.04em">⚠ ÓNÝTT</span>';
      }
    } else {
      row.style.background = '';
      row.style.borderLeft = '';
      // Don't override the status badge — let the original render show it
    }
  }

  // ── Inject 🚫 Ónýtt button on each tæki row in counter-main ────────────
  function injectButtons() {
    const main = document.getElementById('counter-main');
    if (!main) return;
    const rows = main.querySelectorAll('table.dtbl tbody tr');
    rows.forEach(row => {
      if (row.dataset._buwDone === '1') return;
      // Get the unit id by matching serial against DB.cache
      const serialCell = row.querySelector('.ser');
      const serial = serialCell ? serialCell.textContent.trim() : '';
      if (!serial) return;
      // Find the unit in cache (search across jobs)
      let unit = null;
      if (window.DB && DB.cache && Array.isArray(DB.cache.jobs)) {
        for (const job of DB.cache.jobs) {
          if (!Array.isArray(job.units)) continue;
          const u = job.units.find(x => x.serial === serial);
          if (u) { unit = u; break; }
        }
      }
      if (!unit) return;
      row.dataset._buwDone = '1';
      row.dataset._buwUnitId = unit.id;
      // Apply current visual state
      stylizeRow(row, unit.status);

      // Find last cell (where the print QR button is) and append our button
      const lastTd = row.querySelector('td:last-child');
      if (!lastTd) return;
      const btn = document.createElement('button');
      btn.className = '_buw-broken-btn';
      btn.type = 'button';
      btn.style.cssText = 'padding:5px 9px;border:1px solid #fecaca;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700;margin-left:4px;line-height:1';
      stylizeBtn(btn, unit.status);
      btn.addEventListener('click', e => {
        e.stopPropagation();
        // Re-look up status from cache (may have been updated)
        const liveUnit = (DB.cache.jobs || [])
          .flatMap(j => j.units || [])
          .find(x => x.id === +row.dataset._buwUnitId);
        const currentStatus = liveUnit ? liveUnit.status : unit.status;
        toggleBroken(+row.dataset._buwUnitId, currentStatus, btn, row);
      });
      lastTd.appendChild(btn);
    });
  }

  // Find the current verkbeiðni (the one shown in counter-main) by parsing
  // the title text for the job num. Returns the job from DB.cache, or null.
  function getCurrentJob(main) {
    const titleEl = main.querySelector('.jd-title');
    if (!titleEl) return null;
    const txt = titleEl.textContent || '';
    // Look for R-XXXXX-VN or #YYYY-XXX
    const m = txt.match(/R-\d+(-V\d+)?|#\d+-\d+/);
    if (!m) return null;
    const num = m[0];
    const jobs = (window.DB && DB.cache && Array.isArray(DB.cache.jobs)) ? DB.cache.jobs : [];
    return jobs.find(j => j.num === num) || null;
  }

  function fmtKr(n) {
    return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr';
  }

  // ── Top-of-detail warning banner (Afgreiðsla) ──────────────────────────
  function injectWarningBanner() {
    const main = document.getElementById('counter-main');
    if (!main) return;

    const job = getCurrentJob(main);
    if (!job) {
      const existing = main.querySelector('._buw-banner');
      if (existing) existing.remove();
      return;
    }

    // Count broken vs total units
    const rows = main.querySelectorAll('table.dtbl tbody tr');
    let totalUnits = 0;
    let brokenUnits = 0;
    let firstBrokenType = '';
    rows.forEach(row => {
      const unitId = +row.dataset._buwUnitId;
      if (!unitId) return;
      totalUnits++;
      const liveUnit = (DB.cache.jobs || [])
        .flatMap(j => j.units || [])
        .find(x => x.id === unitId);
      if (liveUnit && liveUnit.status === 'broken') {
        brokenUnits++;
        if (!firstBrokenType) {
          firstBrokenType = (liveUnit.service || '').trim() || liveUnit.type || '';
        }
      }
    });

    // Remove existing banner
    const existing = main.querySelector('._buw-banner');
    if (existing) existing.remove();
    if (brokenUnits === 0) return;

    // Calculate adjusted price. job.verd is total (mvsk) for ALL units in
    // this verkbeiðni line. Per-unit = total / totalUnits. Refund =
    // per-unit × brokenUnits (rounded to whole kr).
    const totalVerd = +job.verd || 0;
    const pricePerUnit = totalUnits > 0 ? totalVerd / totalUnits : 0;
    const refundAmount = Math.round(pricePerUnit * brokenUnits);
    const adjustedTotal = Math.max(0, Math.round(totalVerd - refundAmount));

    const banner = document.createElement('div');
    banner.className = '_buw-banner';
    banner.dataset.jobId = String(job.id);
    banner.dataset.jobNum = String(job.num || '');
    banner.dataset.refund = String(refundAmount);
    banner.dataset.broken = String(brokenUnits);
    banner.style.cssText = 'margin:0 0 14px;padding:14px 16px;background:linear-gradient(135deg,#fef2f2,#fee2e2);border:2px solid #fca5a5;border-left:6px solid #dc2626;border-radius:10px';
    let priceBlock = '';
    if (totalVerd > 0) {
      priceBlock =
        '<div style="margin-top:10px;padding:9px 11px;background:#fff;border:1px solid #fecaca;border-radius:8px;font-size:12px;line-height:1.55;display:grid;grid-template-columns:1fr auto;gap:4px 12px;font-variant-numeric:tabular-nums">' +
          '<div style="color:#7f1d1d">Upphafleg upphæð (' + totalUnits + ' tæki):</div>' +
          '<div style="color:#7f1d1d;font-weight:600;text-align:right">' + esc(fmtKr(totalVerd)) + '</div>' +
          '<div style="color:#dc2626;font-weight:600">− ' + brokenUnits + ' ónýtt á ' + esc(fmtKr(pricePerUnit)) + '/stk:</div>' +
          '<div style="color:#dc2626;font-weight:700;text-align:right">− ' + esc(fmtKr(refundAmount)) + '</div>' +
          '<div style="color:#0f172a;font-weight:700;border-top:1px solid #fee2e2;padding-top:5px;margin-top:2px">Það sem á að rukka:</div>' +
          '<div style="color:#0f172a;font-weight:800;text-align:right;border-top:1px solid #fee2e2;padding-top:5px;margin-top:2px">' + esc(fmtKr(adjustedTotal)) + '</div>' +
        '</div>' +
        '<div style="margin-top:8px;padding:8px 10px;background:#dbeafe;border:1px solid #bfdbfe;border-radius:7px;font-size:11px;color:#1e3a8a;line-height:1.45">' +
          '💡 <strong>Smelltu „Sótt ✓"</strong> — kerfið opnar Sókn-glugga þar sem þú getur valið hvaða tæki viðskiptavinur tekur með, bætt nýjum við og rukkað rétta upphæð sjálfkrafa.' +
        '</div>';
    }
    banner.innerHTML =
      '<div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">' +
        '<div style="font-size:24px;flex-shrink:0;line-height:1">⚠</div>' +
        '<div style="flex:1;min-width:200px">' +
          '<div style="font-size:14px;font-weight:800;color:#991b1b;line-height:1.25">' +
            esc(brokenUnits) + ' af ' + esc(totalUnits) + ' tæki ' + (brokenUnits === 1 ? 'er ónýtt' : 'eru ónýt') +
          '</div>' +
          '<div style="font-size:12px;color:#7f1d1d;margin-top:3px;line-height:1.35">' +
            'Bjóða viðskiptavin nýtt í staðinn — og lækka upphæðina um þá sem hann tekur ekki.' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">' +
          // 2026-05-08: Kreditfæra-takki tekinn af — Pickup Checkout
          // (patch 121) leggur til ÁBYRGAR-flæði þar sem upphæðin er
          // löguð sjálfkrafa við Sókn. Ekki þörf á manual kreditfærslu.
          // Skiljum eftir sjónrænu viðvörunina + upphæðar-yfirlitið.
          '<button id="_buw-add-replacement" type="button" style="padding:9px 14px;background:#dc2626;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:12px;font-weight:700;white-space:nowrap">🛒 Bæta nýju í Sölu</button>' +
        '</div>' +
      '</div>' +
      priceBlock;

    const header = main.querySelector('.jd-header');
    if (header && header.nextSibling) {
      header.parentNode.insertBefore(banner, header.nextSibling);
    } else {
      main.insertBefore(banner, main.firstChild);
    }

    // Wire "Bæta í Sölu"
    const addBtn = banner.querySelector('#_buw-add-replacement');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (window.App && typeof App.switchView === 'function') App.switchView('sala');
        setTimeout(() => {
          if (window.Toast && Toast.show) {
            Toast.show('Bjóða viðskiptavin ' + brokenUnits + ' nýtt slökkvitæki' + (firstBrokenType ? ' (' + firstBrokenType + ')' : '') + ' í Sala-körfu');
          }
        }, 300);
      });
    }
    // Wire "Kreditfæra"
    const creditBtn = banner.querySelector('#_buw-credit-broken');
    if (creditBtn) {
      creditBtn.addEventListener('click', () => {
        openCreditForBroken(job, brokenUnits, refundAmount);
      });
    }
  }

  // Open the existing credit-invoice flow (patch 26 / 92) with a pre-filled
  // amount and reason. Tries multiple integration points.
  async function openCreditForBroken(job, brokenCount, refundAmount) {
    // Find the original sale by matching the job's parent num. Verkbeiðnir
    // get suffix '-V1', '-V2'... so the parent sale num strips that off.
    const parentNum = String(job.num || '').replace(/-V\d+$/, '');
    const SB = getSB();
    if (!SB || !parentNum) {
      alert('Get ekki fundið upphafleg sölu — notaðu Bókhaldsyfirlit til að kreditfæra handvirkt.');
      return;
    }
    let sale = null;
    try {
      const r = await SB.from('solur').select('*').eq('num', parentNum).maybeSingle();
      if (r.data) sale = r.data;
    } catch (e) { console.warn('[broken-units] could not find parent sale:', e); }

    // Fall back: open patch 92's credit-by-num dialog with the sale num
    if (window.CreditByNum && typeof CreditByNum.openLookupForNum === 'function') {
      CreditByNum.openLookupForNum(parentNum);
      return;
    }
    // Fall back to patch 26's openCreditDialog if we have the sale row
    if (sale && window.CreditInvoice && typeof CreditInvoice.openCreditDialog === 'function') {
      CreditInvoice.openCreditDialog(sale);
      return;
    }
    // Final fallback: nav to bokhald-yfirlit + alert
    alert('Kreditfærsla ' + parentNum + ' — ' + fmtKr(refundAmount) + ' fyrir ' + brokenCount + ' ónýt tæki.\n\nFarðu á Bókhaldsyfirlit og smelltu „Kreditfæra reikning".');
    if (window.App && typeof App.switchView === 'function') {
      App.switchView('bokhald-yfirlit');
    }
  }

  // Watch counter-main for changes
  function attach() {
    const cm = document.getElementById('counter-main');
    if (!cm) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(() => {
        injectButtons();
        injectWarningBanner();
      }, 100);
    }).observe(cm, { childList: true, subtree: true });
  }
  attach();
  setTimeout(() => { injectButtons(); injectWarningBanner(); }, 1500);

  console.log('[broken-units-workflow] installed — 🚫 Ónýtt takki á tækjarúðum + viðvörunarbanner');
})();
/* === END BROKEN UNITS WORKFLOW v1 === */
