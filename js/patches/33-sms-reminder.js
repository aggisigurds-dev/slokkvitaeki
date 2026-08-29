/* === SMS REMINDER v1 === */
/* Shows a panel in Afgreiðsla sidebar when jobs are ready for pickup.
 * Each job gets an "Opna SMS" button that opens the native SMS app
 * with a pre-filled Icelandic message — works on iOS and Android.
 * Optional Twilio integration for desktop sending (requires proxy for CORS).
 *
 * verkbeidnir columns used: id, num, customer, phone, status, dropoff
 * Trigger status: 'Tilbúið'
 *
 * localStorage keys:
 *   sms_template      — message body template
 *   sms_company_phone — shown in message as contact number
 *   sms_overdue_days  — days after dropoff to flag as overdue (default 2)
 *   sms_sent_log      — JSON map of {jobId: isoTimestamp}
 *   sms_twilio_sid / sms_twilio_token / sms_twilio_from — Twilio (optional)
 */
(() => {
  if (window.__smsReminderInstalled) return;
  window.__smsReminderInstalled = true;

  const K = {
    TEMPLATE:     'sms_template',
    CO_PHONE:     'sms_company_phone',
    OVERDUE_DAYS: 'sms_overdue_days',
    LOG:          'sms_sent_log',
    TW_SID:       'sms_twilio_sid',
    TW_TOKEN:     'sms_twilio_token',
    TW_FROM:      'sms_twilio_from'
  };

  const DEFAULT_TEMPLATE =
    'Góðan dag {nafn}! Slökkvitæki ehf hér. Tæki þitt (verk #{num}) er tilbúið til afhendingar. ' +
    'Vinsamlegast sæktu það eins fljótt og auðið er. Sími: {phone}.';

  function getSB() { return (window.DB && window.DB.sb) || null; }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function get(key, fallback) { return localStorage.getItem(key) || fallback || ''; }

  function getTemplate() { return get(K.TEMPLATE) || DEFAULT_TEMPLATE; }
  function getOverdueDays() { return parseInt(get(K.OVERDUE_DAYS, '2')) || 2; }

  function buildMsg(job) {
    return getTemplate()
      .replace(/{nafn}/g, job.customer || '')
      .replace(/{num}/g,  job.num || String(job.id))
      .replace(/{phone}/g, get(K.CO_PHONE));
  }

  function normalizePhone(raw) {
    if (!raw) return '';
    let p = String(raw).replace(/[\s\-().]/g, '');
    if (p.startsWith('00354')) return '+' + p.slice(2);
    if (!p.startsWith('+')) {
      if (p.length === 7) return '+354' + p;
      if (p.length === 10 && p.startsWith('354')) return '+' + p;
      return '+354' + p;
    }
    return p;
  }

  function smsHref(phone, body) {
    return 'sms:' + normalizePhone(phone) + '?body=' + encodeURIComponent(body);
  }

  function getSmsLog() {
    try { return JSON.parse(localStorage.getItem(K.LOG) || '{}'); } catch { return {}; }
  }
  function markSent(jobId) {
    const log = getSmsLog();
    log[jobId] = new Date().toISOString();
    localStorage.setItem(K.LOG, JSON.stringify(log));
  }

  function daysSince(iso) {
    if (!iso) return 0;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('sms-reminder-style')) {
    const s = document.createElement('style');
    s.id = 'sms-reminder-style';
    s.textContent = `
      #sms-ready-panel {
        border-bottom: 1px solid #fde68a;
        background: #fffbeb;
        font-size: 13px;
      }
      .sms-panel-hd {
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px 14px; cursor: pointer; user-select: none;
      }
      .sms-panel-hd-left { display: flex; align-items: center; gap: 7px; font-weight: 600; color: #92400e; }
      .sms-panel-body { padding: 0 14px 10px; }
      .sms-job-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 7px 0; border-bottom: 1px solid #fef3c7; gap: 8px; flex-wrap: wrap;
      }
      .sms-job-row:last-child { border-bottom: none; }
      .sms-job-name { font-weight: 600; color: #1e293b; }
      .sms-job-meta { font-size: 11px; color: #64748b; }
      .sms-job-overdue { color: #dc2626; font-weight: 600; }
      .sms-open-btn {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 5px 10px; background: #22c55e; color: #fff; border: none;
        border-radius: 7px; font: inherit; font-size: 12px; font-weight: 600;
        cursor: pointer; white-space: nowrap; text-decoration: none;
      }
      .sms-open-btn:hover { background: #16a34a; }
      .sms-sent-dot {
        display: inline-block; width: 6px; height: 6px;
        background: #22c55e; border-radius: 50%; margin-right: 3px;
        vertical-align: middle;
      }
      #sms-nav-badge {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 16px; height: 16px; background: #f59e0b; color: #fff;
        border-radius: 8px; font-size: 10px; font-weight: 700; margin-left: 4px; padding: 0 3px;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Load Tilbúið jobs ──────────────────────────────────────────────────────
  async function loadReadyJobs() {
    const SB = getSB();
    if (!SB) return [];
    const { data } = await SB.from('verkbeidnir')
      .select('id,num,customer,phone,status,dropoff')
      .eq('status', 'Tilbúið')
      .order('dropoff', { ascending: true });
    return (data || []).filter(j => j.phone && j.phone.trim());
  }

  // ── Render the sidebar panel ───────────────────────────────────────────────
  async function renderPanel() {
    const sidebar = document.getElementById('counter-sidebar');
    if (!sidebar) return;

    const jobs = await loadReadyJobs();

    // Update / remove nav badge
    let navBadge = document.getElementById('sms-nav-badge');
    const counterBtn = document.querySelector('.vnav-btn[data-view="counter"]');
    if (counterBtn && !navBadge) {
      navBadge = document.createElement('span');
      navBadge.id = 'sms-nav-badge';
      counterBtn.appendChild(navBadge);
    }
    if (navBadge) {
      navBadge.textContent = jobs.length || '';
      navBadge.style.display = jobs.length ? 'inline-flex' : 'none';
    }

    // Remove existing panel
    const existing = document.getElementById('sms-ready-panel');
    if (existing) existing.remove();
    if (!jobs.length) return;

    const panel = document.createElement('div');
    panel.id = 'sms-ready-panel';

    const smsLog = getSmsLog();
    const overdueDays = getOverdueDays();
    const overdueCount = jobs.filter(j => daysSince(j.dropoff) >= overdueDays).length;

    let rows = jobs.map(j => {
      const days = daysSince(j.dropoff);
      const isOverdue = days >= overdueDays;
      const sentAt = smsLog[j.id];
      const msg = buildMsg(j);
      const href = smsHref(j.phone, msg);

      return `
        <div class="sms-job-row">
          <div>
            <div class="sms-job-name">${esc(j.customer || '—')}
              ${sentAt ? `<span class="sms-sent-dot" title="SMS sent ${new Date(sentAt).toLocaleDateString('is-IS')}"></span>` : ''}
            </div>
            <div class="sms-job-meta">
              ${esc(j.phone)} · Verk #${esc(j.num || j.id)}
              ${isOverdue ? `<span class="sms-job-overdue"> · ${days} dagar</span>` : ''}
            </div>
          </div>
          <a href="${href}" class="sms-open-btn" onclick="window.__SmsReminder.onOpen(${j.id})">📱 SMS</a>
        </div>`;
    }).join('');

    panel.innerHTML = `
      <div class="sms-panel-hd" onclick="this.parentElement.querySelector('.sms-panel-body').classList.toggle('hidden')">
        <div class="sms-panel-hd-left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .82h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
          ${jobs.length} tæki tilbúin${overdueCount ? ` · <span style="color:#dc2626">${overdueCount} seinn</span>` : ''}
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2" style="width:12px;height:12px"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="sms-panel-body">${rows}</div>`;

    // Insert at top of sidebar, after the header
    const hd = sidebar.querySelector('.sidebar-header');
    hd ? hd.after(panel) : sidebar.prepend(panel);
  }

  // ── Twilio send (optional — needs CORS proxy in prod) ─────────────────────
  async function sendTwilio(to, body) {
    const sid   = get(K.TW_SID);
    const token = get(K.TW_TOKEN);
    const from  = get(K.TW_FROM);
    if (!sid || !token || !from) throw new Error('Twilio ekki stillt');
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(sid + ':' + token),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ To: normalizePhone(to), From: from, Body: body })
      }
    );
    if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.message || 'Twilio villa ' + resp.status); }
  }

  // ── Settings injection ─────────────────────────────────────────────────────
  function injectSettings() {
    const sm = document.getElementById('settings-main');
    if (!sm || sm.querySelector('#sms-settings-sec')) return;

    const sec = document.createElement('div');
    sec.id = 'sms-settings-sec';
    sec.style.cssText = 'margin-top:24px;padding-top:24px;border-top:1px solid #e2e8f0;max-width:520px';
    sec.innerHTML = `
      <div style="font-size:14px;font-weight:700;color:#1e293b;margin-bottom:14px">📱 SMS Áminningar</div>
      <div style="display:grid;gap:12px">
        <div>
          <label class="fl">Sími fyrirtækis (birtist í skilaboðum)</label>
          <input id="sms-co-phone" class="fi" type="tel" placeholder="+354 5xx xxxx" value="${esc(get(K.CO_PHONE))}">
        </div>
        <div>
          <label class="fl">Dagar til að merka sem seinn</label>
          <input id="sms-days" class="fi" type="number" min="1" max="30" value="${getOverdueDays()}" style="max-width:80px">
        </div>
        <div>
          <label class="fl">Sniðmát skilaboða</label>
          <textarea id="sms-tpl" class="fi" rows="4" style="resize:vertical">${esc(getTemplate())}</textarea>
          <div style="font-size:11px;color:#94a3b8;margin-top:3px">Breytur: {nafn} &nbsp;{num} &nbsp;{phone}</div>
        </div>
        <details style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 14px">
          <summary style="font-size:13px;font-weight:600;color:#475569;cursor:pointer">⚡ Twilio (valfrjálst)</summary>
          <div style="display:grid;gap:10px;margin-top:12px">
            <div><label class="fl">Account SID</label>
              <input id="sms-tw-sid" class="fi" placeholder="ACxxxxxxxx" value="${esc(get(K.TW_SID))}"></div>
            <div><label class="fl">Auth Token</label>
              <input id="sms-tw-tok" class="fi" type="password" placeholder="••••••••" value="${esc(get(K.TW_TOKEN))}"></div>
            <div><label class="fl">Frá-númer</label>
              <input id="sms-tw-from" class="fi" placeholder="+15551234567" value="${esc(get(K.TW_FROM))}"></div>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 10px;font-size:11px;color:#92400e">
              ⚠ Twilio krefst CORS proxy. "Opna SMS app" hnappur virkar alltaf án Twilio.
            </div>
          </div>
        </details>
        <button id="sms-save-btn" class="btn btn-primary btn-sm" style="width:fit-content">Vista stillingar</button>
      </div>`;

    sm.appendChild(sec);

    var smsSaveBtn = document.getElementById('sms-save-btn');
    if (smsSaveBtn) smsSaveBtn.onclick = () => {
      localStorage.setItem(K.CO_PHONE, (document.getElementById('sms-co-phone')?.value || '').trim());
      localStorage.setItem(K.OVERDUE_DAYS, document.getElementById('sms-days')?.value || '2');
      localStorage.setItem(K.TEMPLATE, document.getElementById('sms-tpl')?.value || '');
      localStorage.setItem(K.TW_SID,   (document.getElementById('sms-tw-sid')?.value || '').trim());
      localStorage.setItem(K.TW_TOKEN, (document.getElementById('sms-tw-tok')?.value || '').trim());
      localStorage.setItem(K.TW_FROM,  (document.getElementById('sms-tw-from')?.value || '').trim());
      if (window.Toast && Toast.show) Toast.show('✓ SMS stillingar vistaðar');
    };
  }

  // ── Hook view changes ──────────────────────────────────────────────────────
  document.addEventListener('view-shown', e => {
    if (e.detail === 'counter')  setTimeout(renderPanel, 400);
    if (e.detail === 'settings') setTimeout(injectSettings, 100);
  });

  // Also refresh when new jobs complete (listen for mottaka:done)
  document.addEventListener('mottaka:done', () => setTimeout(renderPanel, 1000));

  // Expose for inline onclick
  window.__SmsReminder = {
    onOpen(jobId) {
      markSent(jobId);
      setTimeout(renderPanel, 600);
    }
  };

  window.SmsReminder = { renderPanel, loadReadyJobs, sendTwilio, buildMsg };
  console.log('[sms-reminder] installed');
})();
/* === END SMS REMINDER === */
