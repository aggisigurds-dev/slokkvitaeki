/* === RECURRING SERVICE v1 === */
/* When a field service job (Þjónustutæki inspection) is closed/marked done,
 * automatically calculates and sets next_insp on the service unit, and
 * optionally creates a new reminder job for the next visit.
 *
 * SQL hint — add service_interval_months to þjonustutaeki if not present:
 *   ALTER TABLE þjonustutaeki ADD COLUMN IF NOT EXISTS service_interval_months INT DEFAULT 12;
 *
 * Hooks:
 *  1. Verkdagbok job status changes to "done/lokid" → scan for linked units
 *  2. Þjónustutæki unit "Klárað" button → update next_insp + prompt to create next job
 *  3. Adds a "Næsta skoðun" field to the unit detail form
 *
 * Default interval: 12 months (configurable per unit).
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__recurringServiceInstalled) return;
  window.__recurringServiceInstalled = true;

  const DEFAULT_INTERVAL = 12; // months

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function isoDateOnly(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function addMonths(dateStr, months) {
    const d = new Date(dateStr || Date.now());
    d.setMonth(d.getMonth() + months);
    return isoDateOnly(d);
  }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.getDate() + '.' + (d.getMonth()+1) + '.' + d.getFullYear();
  }

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('rs-style')) {
    const s = document.createElement('style');
    s.id = 'rs-style';
    s.textContent = `
      .rs-interval-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
      .rs-interval-row label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
      .rs-interval-input { width: 70px; padding: 5px 8px; border: 1px solid #cbd5e1; border-radius: 6px; font: inherit; font-size: 13px; text-align: center; }
      .rs-schedule-next-btn {
        display: inline-flex; align-items: center; gap: 5px;
        padding: 5px 12px; background: #f0fdf4; border: 1px solid #86efac;
        color: #16a34a; border-radius: 7px; font: inherit; font-size: 12px;
        font-weight: 600; cursor: pointer; margin-top: 8px;
      }
      .rs-schedule-next-btn:hover { background: #dcfce7; }
    `;
    document.head.appendChild(s);
  }

  // ── Core: update next inspection date ────────────────────────────────────
  async function updateNextInsp(unitId, intervalMonths) {
    const SB = getSB();
    if (!SB) return null;
    const months = intervalMonths || DEFAULT_INTERVAL;
    const nextDate = addMonths(new Date().toISOString(), months);
    const update = { next_insp: nextDate };
    // Try to also update service_interval_months if column exists
    try {
      await SB.from('þjonustutaeki').update({ ...update, service_interval_months: months }).eq('id', unitId);
    } catch (_) {
      await SB.from('þjonustutaeki').update(update).eq('id', unitId);
    }
    return nextDate;
  }

  // ── Create next scheduled job (in dagbok if it exists) ───────────────────
  async function createNextAppointment(unit, nextDate) {
    const SB = getSB();
    if (!SB) return;
    try {
      const start = new Date(nextDate + 'T08:00:00');
      const end = new Date(nextDate + 'T10:00:00');
      await SB.from('dagbok').insert({
        title: 'Þjónustuskoðun — ' + (unit.tegund || unit.serial || 'tæki'),
        company_id: unit.company_id || null,
        company_nafn: unit.company_nafn || unit.company || null,
        notes: 'Sjálfvirkt búið til. Raðnr: ' + (unit.serial || ''),
        scheduled_start: start.toISOString(),
        scheduled_end: end.toISOString(),
        status: 'scheduled'
      });
    } catch (_) {}  // dagbok table may not exist yet
  }

  // ── Prompt after completing a job ────────────────────────────────────────
  function showNextInspPrompt(unit, nextDate, onConfirm) {
    // Use Toast + custom notification instead of blocking dialog
    if (!unit) return;
    const msg = `Næsta skoðun ${unit.serial || unit.tegund || ''}: ${fmtDate(nextDate)}`;
    if (window.Toast && Toast.show) Toast.show('📅 ' + msg + ' — búið til dagbókarfærslu?');

    // Non-blocking — show a small floating banner
    let banner = document.getElementById('rs-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'rs-banner';
      banner.style.cssText = `
        position: fixed; bottom: 70px; right: 20px; z-index: 99999;
        background: #fff; border: 1px solid #86efac; border-radius: 10px;
        box-shadow: 0 8px 30px rgba(0,0,0,.15);
        padding: 14px 16px; max-width: 320px; font-family: inherit; font-size: 13px;
      `;
      document.body.appendChild(banner);
    }
    banner.innerHTML = `
      <div style="font-weight:700;color:#166534;margin-bottom:6px;">📅 Skrá næstu skoðun?</div>
      <div style="color:#334155;margin-bottom:10px;">${esc(msg)}</div>
      <div style="display:flex;gap:8px;">
        <button id="rs-yes-btn" style="flex:1;padding:7px;background:#16a34a;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;">✓ Já, búa til</button>
        <button id="rs-no-btn" style="padding:7px 12px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:7px;cursor:pointer;font:inherit;font-size:12px;color:#475569;">Nei</button>
      </div>`;
    document.getElementById('rs-yes-btn').onclick = async () => {
      await createNextAppointment(unit, nextDate);
      banner.remove();
      if (window.Toast && Toast.show) Toast.show('✓ Dagbókarfærsla búin til');
      if (onConfirm) onConfirm();
    };
    document.getElementById('rs-no-btn').onclick = () => banner.remove();
    setTimeout(() => { if (banner.parentNode) banner.remove(); }, 15000);
  }

  // ── Hook: watch for "klárað/done" clicks on service units ────────────────
  function hookDoneButtons() {
    document.addEventListener('click', async e => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const txt = (btn.textContent || '').trim().toLowerCase();
      // Match Icelandic done/close patterns used in field/verkdagbok views
      if (!/^(klárað|lokið|skoðun klárað|done|mark done)$/.test(txt)) return;
      // Find parent card/row to get unit id
      const card = btn.closest('[data-unit-id],[data-id],[data-service-id]');
      if (!card) return;
      const unitId = card.dataset.unitId || card.dataset.id || card.dataset.serviceId;
      if (!unitId) return;

      // Fetch unit data
      const SB = getSB();
      if (!SB) return;
      const { data: unit } = await SB
        .from('þjonustutaeki')
        .select('id,serial,tegund,company_id,company_nafn,service_interval_months')
        .eq('id', unitId).single();
      if (!unit) return;

      const interval = unit.service_interval_months || DEFAULT_INTERVAL;
      const nextDate = await updateNextInsp(unit.id, interval);
      if (nextDate) showNextInspPrompt(unit, nextDate, null);
    });
  }

  // ── Inject interval field into unit detail forms ──────────────────────────
  function injectIntervalField(form, unitId, currentInterval) {
    if (!form || form.querySelector('.rs-interval-row')) return;
    const nextInspField = form.querySelector('[name="next_insp"], #unit-next-insp, [id*="next_insp"]');
    if (!nextInspField) return;
    const row = document.createElement('div');
    row.className = 'rs-interval-row';
    row.innerHTML = `
      <label>Þjónustubil:</label>
      <input type="number" class="rs-interval-input" id="rs-interval-${unitId}" value="${currentInterval || DEFAULT_INTERVAL}" min="1" max="120">
      <span style="font-size:12px;color:#64748b;">mánuðir</span>`;
    nextInspField.parentNode.insertBefore(row, nextInspField.nextSibling);

    // "Schedule next" button
    const schedBtn = document.createElement('button');
    schedBtn.type = 'button';
    schedBtn.className = 'rs-schedule-next-btn';
    schedBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Setja næstu skoðun`;
    schedBtn.addEventListener('click', async () => {
      const interval = parseInt(document.getElementById(`rs-interval-${unitId}`)?.value) || DEFAULT_INTERVAL;
      const nextDate = await updateNextInsp(unitId, interval);
      if (nextDate) {
        // Update the next_insp input if it exists
        if (nextInspField) nextInspField.value = nextDate;
        if (window.Toast && Toast.show) Toast.show('✓ Næsta skoðun: ' + fmtDate(nextDate));
      }
    });
    row.appendChild(schedBtn);
  }

  // ── Watch for unit detail forms opening ──────────────────────────────────
  const formObs = new MutationObserver(() => {
    document.querySelectorAll('[data-unit-id],[data-service-id]').forEach(el => {
      const uid = el.dataset.unitId || el.dataset.serviceId;
      const interval = parseInt(el.dataset.serviceInterval || el.dataset.interval) || DEFAULT_INTERVAL;
      if (uid) injectIntervalField(el, uid, interval);
    });
  });
  formObs.observe(document.body, { childList: true, subtree: true });

  hookDoneButtons();

  window.RecurringService = {
    updateNextInsp,
    createNextAppointment,
    addMonths,
    DEFAULT_INTERVAL
  };
  console.log('[recurring-service] installed');
})();
/* === END RECURRING SERVICE === */
