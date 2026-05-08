/* === VERKBEIÐNI PAYMENT STATUS v1 ===
 *
 * For verkbeiðnir tied to a "Greitt síðar" sale (paid at pickup), surface the
 * payment state directly in the work-order detail panel so the user can see
 * up-front that money is owed before the customer leaves.
 *
 *   • Payment indicator chip next to the status badge: 💰 Greiðist við sókn
 *     (kr {amt}) when the matching solur row is still unpaid.
 *   • "💰 Setja inn greitt" button that marks the solur as paid without
 *     waiting for the customer to actually pick up the unit. Use case: paid
 *     in advance over phone / by transfer before pickup.
 *
 * Counter.markCollected (modal.js) already handles the standard pickup-time
 * payment confirmation; this patch only adds the explicit ahead-of-pickup
 * path and the visible status. */
(() => {
  if (window.__verkbeidniPaymentInstalled) return;
  window.__verkbeidniPaymentInstalled = true;

  const PAID_METHOD = 'greitt_sidar_pickup';

  function fmtKr(n) {
    return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr';
  }

  // Pull the matching unpaid Greitt síðar sale for a given verkbeiðni number
  // (R-000021-V1 → R-000021). Returns null if none / already paid.
  async function findPendingSale(jobNum) {
    if (!window.DB || !window.DB.sb || !jobNum) return null;
    const saleNum = String(jobNum).replace(/-V\d+$/, '');
    try {
      const r = await window.DB.sb.from('solur')
        .select('id,num,samtals,greitt_med,paid_at')
        .eq('num', saleNum)
        .eq('greitt_med', 'greitt_sidar')
        .is('paid_at', null)
        .maybeSingle();
      return r && r.data ? r.data : null;
    } catch (e) { return null; }
  }

  async function markSalePaid(saleId) {
    if (!window.DB || !window.DB.sb) return false;
    try {
      const r = await window.DB.sb.from('solur')
        .update({ paid_at: new Date().toISOString(), paid_method: PAID_METHOD })
        .eq('id', saleId);
      return !r.error;
    } catch (e) { return false; }
  }

  // Inject the payment chip + button into the verkbeiðni detail panel.
  async function decorateDetail() {
    const main = document.getElementById('counter-main');
    if (!main) return;
    if (main.dataset._vbpDecorated === 'pending') return;

    const titleEl = main.querySelector('.jd-title');
    if (!titleEl) return;

    // Already decorated for this render? Bail. (Counter.renderDetail wipes
    // innerHTML each time, so the marker resets automatically.)
    if (main.querySelector('._vbp-chip')) return;

    const jobNumMatch = (titleEl.textContent || '').match(/(R-\d{6}(?:-V\d+)?)/);
    if (!jobNumMatch) return;
    const jobNum = jobNumMatch[1];

    main.dataset._vbpDecorated = 'pending';
    const sale = await findPendingSale(jobNum);
    main.dataset._vbpDecorated = 'done';
    if (!sale) return;

    // Status badge sits in .jd-actions; insert chip just before it.
    const actions = main.querySelector('.jd-actions');
    if (!actions) return;

    const chip = document.createElement('span');
    chip.className = '_vbp-chip';
    chip.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:5px 10px;background:#fef3c7;color:#92400e;border:1px solid #fbbf24;border-radius:6px;font-size:12px;font-weight:600;margin-right:6px';
    chip.innerHTML = '💰 Greiðist við sókn · ' + fmtKr(sale.samtals);
    actions.insertBefore(chip, actions.firstChild);

    const btn = document.createElement('button');
    btn.className = 'btn btn-sm _vbp-mark-paid';
    btn.type = 'button';
    btn.style.cssText = 'background:#16a34a;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer;margin-right:6px';
    btn.textContent = '💰 Setja inn greitt';
    btn.addEventListener('click', async () => {
      const ok = confirm('Staðfesta að greiðsla ' + fmtKr(sale.samtals) + ' hafi borist?\n\n' +
                         'Verkið verður áfram á stöðunni "Tilbúið" — smelltu "Sótt ✓" þegar viðskiptavinur sækir tækið.');
      if (!ok) return;
      btn.disabled = true;
      btn.textContent = 'Vista…';
      const success = await markSalePaid(sale.id);
      if (success) {
        if (window.Toast && Toast.show) Toast.show('Greiðsla skráð ✓');
        chip.style.background = '#dcfce7';
        chip.style.borderColor = '#86efac';
        chip.style.color = '#166534';
        chip.innerHTML = '✓ Greitt';
        btn.remove();
      } else {
        if (window.Toast && Toast.show) Toast.show('Villa við að skrá greiðslu');
        btn.disabled = false;
        btn.textContent = '💰 Setja inn greitt';
      }
    });
    actions.insertBefore(btn, actions.firstChild);
  }

  // Watch for verkbeiðni renders. Counter.renderDetail rewrites #counter-main
  // each time a job is selected; we re-decorate after each rewrite.
  function watch() {
    const main = document.getElementById('counter-main');
    if (!main) { setTimeout(watch, 600); return; }
    decorateDetail();
    new MutationObserver(() => {
      // Counter rewrote the panel — clear marker and redecorate
      delete main.dataset._vbpDecorated;
      decorateDetail();
    }).observe(main, { childList: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch);
  } else {
    watch();
  }

  console.log('[verkbeidni-payment] installed');
})();
/* === END VERKBEIÐNI PAYMENT STATUS v1 === */
