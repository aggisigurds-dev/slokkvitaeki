/* === CALENDAR / DAGBÓK v1 === */
/* Weekly appointment calendar for scheduling field jobs and service visits.
 *
 * SQL required (run once in Supabase):
 *   CREATE TABLE IF NOT EXISTS dagbok (
 *     id BIGSERIAL PRIMARY KEY,
 *     title TEXT NOT NULL,
 *     company_id BIGINT,
 *     company_nafn TEXT,
 *     assigned_to TEXT,
 *     scheduled_start TIMESTAMPTZ NOT NULL,
 *     scheduled_end TIMESTAMPTZ,
 *     notes TEXT,
 *     status TEXT DEFAULT 'scheduled', -- scheduled, done, cancelled
 *     job_id BIGINT,
 *     created_at TIMESTAMPTZ DEFAULT NOW()
 *   );
 *
 * Features:
 *  • Week view (Mon–Sun) with hourly slots 07:00–19:00
 *  • Click any slot → new appointment modal
 *  • Click existing appointment → edit/delete/done
 *  • Navigate back/forward by week
 *  • Today button
 *  • Colour-coded by status
 *  • Compact mobile fallback (day list view)
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__calendarInstalled) return;
  window.__calendarInstalled = true;

  const VIEW_ID = 'view-calendar';
  const HOURS_START = 7, HOURS_END = 19;
  const DAYS_IS = ['Mán','Þri','Mið','Fim','Fös','Lau','Sun'];
  const DAYS_FULL = ['Mánudagur','Þriðjudagur','Miðvikudagur','Fimmtudagur','Föstudagur','Laugardagur','Sunnudagur'];
  const MONTHS_IS = ['janúar','febrúar','mars','apríl','maí','júní','júlí','ágúst','september','október','nóvember','desember'];

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function pad(n) { return String(n).padStart(2,'0'); }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
  function isoTime(d) { return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtShortDate(d) { return d.getDate() + '. ' + MONTHS_IS[d.getMonth()]; }

  // Get Monday of a week containing date d
  function weekMonday(d) {
    const day = (d.getDay() + 6) % 7; // Mon=0
    const m = new Date(d);
    m.setDate(d.getDate() - day);
    m.setHours(0,0,0,0);
    return m;
  }

  const STATUS_COLOR = {
    scheduled: '#3b82f6',
    done: '#16a34a',
    cancelled: '#94a3b8'
  };

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('cal-style')) {
    const s = document.createElement('style');
    s.id = 'cal-style';
    s.textContent = `
      #${VIEW_ID} { padding: 0; overflow: hidden; display: flex; flex-direction: column; }
      #${VIEW_ID} .cal-toolbar {
        display: flex; gap: 8px; align-items: center; padding: 10px 14px;
        border-bottom: 1px solid #e2e8f0; background: #fff; flex-shrink: 0;
        flex-wrap: wrap;
      }
      #${VIEW_ID} .cal-nav-btn {
        padding: 6px 12px; border: 1px solid #e2e8f0; background: #fff;
        border-radius: 7px; cursor: pointer; font: inherit; font-size: 13px; color: #334155;
      }
      #${VIEW_ID} .cal-nav-btn:hover { background: #f1f5f9; }
      #${VIEW_ID} .cal-today-btn {
        padding: 6px 14px; border: 1px solid #2563eb; background: #eff6ff;
        color: #2563eb; border-radius: 7px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600;
      }
      #${VIEW_ID} .cal-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 8px; flex: 1; }
      #${VIEW_ID} .cal-new-btn {
        padding: 7px 14px; background: #2563eb; color: #fff; border: none;
        border-radius: 8px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600;
      }
      #${VIEW_ID} .cal-new-btn:hover { background: #1d4ed8; }

      #${VIEW_ID} .cal-grid-wrap { flex: 1; overflow: auto; }
      #${VIEW_ID} .cal-grid {
        display: grid;
        grid-template-columns: 48px repeat(7, 1fr);
        min-width: 600px;
      }
      #${VIEW_ID} .cal-grid-header { display: contents; }
      #${VIEW_ID} .cal-corner, #${VIEW_ID} .cal-day-hd {
        position: sticky; top: 0; z-index: 5;
        background: #f8fafc; border-bottom: 2px solid #e2e8f0;
        padding: 8px 4px; text-align: center; font-size: 12px; font-weight: 700; color: #475569;
      }
      #${VIEW_ID} .cal-day-hd.today-col { background: #eff6ff; color: #2563eb; }
      #${VIEW_ID} .cal-day-hd .day-num { font-size: 18px; font-weight: 800; display: block; line-height: 1.1; }
      #${VIEW_ID} .cal-day-hd.today-col .day-num { color: #2563eb; }

      #${VIEW_ID} .cal-hour-label {
        font-size: 11px; color: #94a3b8; text-align: right; padding: 0 6px;
        display: flex; align-items: flex-start; height: 56px; padding-top: 4px;
        border-bottom: 1px solid #f1f5f9; box-sizing: border-box;
      }
      #${VIEW_ID} .cal-cell {
        border-right: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;
        height: 56px; position: relative; cursor: pointer; background: #fff;
        box-sizing: border-box;
      }
      #${VIEW_ID} .cal-cell:hover { background: #f8fafc; }
      #${VIEW_ID} .cal-cell.today-col { background: #fafbff; }
      #${VIEW_ID} .cal-event {
        position: absolute; left: 2px; right: 2px; top: 2px;
        border-radius: 5px; padding: 2px 6px;
        font-size: 11px; font-weight: 600; color: #fff;
        cursor: pointer; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
        z-index: 2;
      }
      #${VIEW_ID} .cal-event:hover { filter: brightness(0.92); }
      #${VIEW_ID} .cal-event.done { opacity: .6; text-decoration: line-through; }
      #${VIEW_ID} .cal-event.cancelled { opacity: .4; filter: grayscale(1); }

      /* Event modal */
      #cal-event-modal {
        position: fixed; inset: 0; z-index: 100010;
        display: flex; align-items: center; justify-content: center;
        font-family: inherit;
      }
      #cal-event-modal .cal-back { position: absolute; inset: 0; background: rgba(15,23,42,.55); }
      #cal-event-modal .cal-card {
        position: relative; background: #fff; border-radius: 14px;
        box-shadow: 0 20px 60px rgba(0,0,0,.3);
        width: min(480px,calc(100vw - 24px)); max-height: 90vh; overflow-y: auto;
      }
      #cal-event-modal .cal-mhd { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #e2e8f0; }
      #cal-event-modal .cal-mhd h3 { margin: 0; font-size: 16px; font-weight: 700; }
      #cal-event-modal .cal-mx { background: none; border: none; font-size: 20px; color: #94a3b8; cursor: pointer; padding: 2px 8px; border-radius: 6px; }
      #cal-event-modal .cal-mx:hover { background: #f1f5f9; }
      #cal-event-modal .cal-mrow { margin-bottom: 13px; padding: 0 20px; }
      #cal-event-modal .cal-mrow:first-of-type { margin-top: 16px; }
      #cal-event-modal .cal-mrow label { display: block; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
      #cal-event-modal .cal-minput { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 7px; font: inherit; font-size: 13px; box-sizing: border-box; }
      #cal-event-modal .cal-minput:focus { outline: none; border-color: #2563eb; }
      #cal-event-modal .cal-mfoot { display: flex; gap: 8px; justify-content: flex-end; padding: 12px 20px; border-top: 1px solid #e2e8f0; flex-wrap: wrap; }
      #cal-event-modal .cal-del { padding: 8px 14px; border: 1px solid #fca5a5; color: #dc2626; background: #fef2f2; border-radius: 8px; cursor: pointer; font: inherit; font-size: 13px; margin-right: auto; }
      #cal-event-modal .cal-done-btn { padding: 8px 14px; border: 1px solid #86efac; color: #16a34a; background: #f0fdf4; border-radius: 8px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; }
      #cal-event-modal .cal-cancel-btn { padding: 8px 14px; border: 1px solid #e2e8f0; background: #fff; border-radius: 8px; cursor: pointer; font: inherit; font-size: 13px; color: #475569; }
      #cal-event-modal .cal-save-btn { padding: 8px 14px; background: #2563eb; color: #fff; border: none; border-radius: 8px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; }
    `;
    document.head.appendChild(s);
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let events = [];
  let weekStart = weekMonday(new Date());

  // ── Data ──────────────────────────────────────────────────────────────────
  async function load() {
    const SB = getSB();
    if (!SB) return;
    const from = new Date(weekStart);
    const to = new Date(weekStart);
    to.setDate(to.getDate() + 7);
    try {
      const { data, error } = await SB
        .from('dagbok')
        .select('*')
        .gte('scheduled_start', from.toISOString())
        .lt('scheduled_start', to.toISOString())
        .order('scheduled_start');
      if (error) {
        if (/relation.*does not exist/i.test(error.message)) { events = []; return; }
        throw error;
      }
      events = data || [];
    } catch (e) {
      console.warn('[calendar]', e.message);
      events = [];
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    const view = document.getElementById(VIEW_ID);
    if (!view || !view.classList.contains('active')) return;
    const gridWrap = view.querySelector('.cal-grid-wrap');
    if (!gridWrap) return;

    const now = new Date();
    const todayStr = isoDate(now);

    // Build date array for week
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }

    // Header
    const endDay = days[6];
    view.querySelector('.cal-title').textContent =
      fmtShortDate(days[0]) + ' – ' + fmtShortDate(endDay) + ' ' + endDay.getFullYear();

    // Build grid
    let html = '<div class="cal-grid"><div class="cal-corner"></div>';
    // Day headers
    for (let i = 0; i < 7; i++) {
      const d = days[i];
      const isToday = isoDate(d) === todayStr;
      html += `<div class="cal-day-hd${isToday ? ' today-col' : ''}">
        <span class="day-num">${d.getDate()}</span>
        ${DAYS_IS[i]}
      </div>`;
    }

    // Hour rows
    for (let h = HOURS_START; h < HOURS_END; h++) {
      html += `<div class="cal-hour-label">${pad(h)}:00</div>`;
      for (let di = 0; di < 7; di++) {
        const d = days[di];
        const isToday = isoDate(d) === todayStr;
        const slotStart = new Date(d);
        slotStart.setHours(h, 0, 0, 0);
        const slotEnd = new Date(d);
        slotEnd.setHours(h + 1, 0, 0, 0);
        // Find events in this slot
        const slotEvents = events.filter(e => {
          const es = new Date(e.scheduled_start);
          return isoDate(es) === isoDate(d) && es.getHours() === h;
        });
        let evHtml = '';
        for (const ev of slotEvents) {
          const color = STATUS_COLOR[ev.status] || STATUS_COLOR.scheduled;
          evHtml += `<div class="cal-event ${ev.status}" style="background:${color};" data-ev-id="${ev.id}" title="${esc(ev.title)}">
            ${esc(fmtTime(ev.scheduled_start))} ${esc(ev.title)}${ev.company_nafn ? ' · '+esc(ev.company_nafn) : ''}
          </div>`;
        }
        html += `<div class="cal-cell${isToday ? ' today-col' : ''}" data-slot-date="${isoDate(d)}" data-slot-hour="${h}">${evHtml}</div>`;
      }
    }
    html += '</div>';
    gridWrap.innerHTML = html;

    // Wire cell clicks (new event)
    gridWrap.querySelectorAll('.cal-cell[data-slot-date]').forEach(cell => {
      cell.addEventListener('click', e => {
        if (e.target.closest('.cal-event')) return; // handled below
        openEventModal(null, cell.dataset.slotDate, parseInt(cell.dataset.slotHour));
      });
    });
    // Wire event clicks (edit)
    gridWrap.querySelectorAll('.cal-event[data-ev-id]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation();
        const ev = events.find(ev => ev.id == el.dataset.evId);
        if (ev) openEventModal(ev);
      });
    });
  }

  // ── Event modal ────────────────────────────────────────────────────────────
  function buildEventModal() {
    if (document.getElementById('cal-event-modal')) return;
    const el = document.createElement('div');
    el.id = 'cal-event-modal';
    el.style.display = 'none';
    el.innerHTML = `
      <div class="cal-back"></div>
      <div class="cal-card">
        <div class="cal-mhd">
          <h3 id="cal-modal-title">Nýtt tímasetning</h3>
          <button class="cal-mx" id="cal-mx">✕</button>
        </div>
        <div class="cal-mrow" style="margin-top:16px;">
          <label>Titill</label>
          <input id="cal-ev-title" type="text" class="cal-minput" placeholder="t.d. Þjónustuskoðun hjá Verkfærissalan">
        </div>
        <div class="cal-mrow">
          <label>Viðskiptavinur (valfrjálst)</label>
          <input id="cal-ev-co" type="text" class="cal-minput" placeholder="Fyrirtæki eða viðskiptavinur">
        </div>
        <div class="cal-mrow">
          <label>Dagsetning og tími</label>
          <div style="display:flex;gap:8px;">
            <input id="cal-ev-date" type="date" class="cal-minput" style="flex:1;">
            <input id="cal-ev-time-start" type="time" class="cal-minput" style="width:100px;" value="08:00">
            <span style="align-self:center;color:#94a3b8;">–</span>
            <input id="cal-ev-time-end" type="time" class="cal-minput" style="width:100px;" value="09:00">
          </div>
        </div>
        <div class="cal-mrow">
          <label>Starfsmaður</label>
          <input id="cal-ev-staff" type="text" class="cal-minput" placeholder="Nafn starfsmanns">
        </div>
        <div class="cal-mrow">
          <label>Athugasemd</label>
          <textarea id="cal-ev-notes" class="cal-minput" rows="2" placeholder="Frekari upplýsingar…" style="resize:vertical;"></textarea>
        </div>
        <div class="cal-mfoot" id="cal-mfoot">
          <button class="cal-cancel-btn" id="cal-ev-cancel">Hætta við</button>
          <button class="cal-save-btn" id="cal-ev-save">Vista</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('.cal-back').onclick = closeEventModal;
    el.querySelector('#cal-mx').onclick = closeEventModal;
    el.querySelector('#cal-ev-cancel').onclick = closeEventModal;
  }

  function closeEventModal() {
    const el = document.getElementById('cal-event-modal');
    if (el) el.style.display = 'none';
  }

  async function openEventModal(ev, dateStr, hour) {
    buildEventModal();
    const modal = document.getElementById('cal-event-modal');
    const isNew = !ev;
    document.getElementById('cal-modal-title').textContent = isNew ? 'Ný tímasetning' : 'Breyta tímasetningu';

    const d = dateStr || (ev ? isoDate(new Date(ev.scheduled_start)) : isoDate(new Date()));
    const h = hour != null ? hour : (ev ? new Date(ev.scheduled_start).getHours() : 8);
    document.getElementById('cal-ev-title').value = ev ? (ev.title || '') : '';
    document.getElementById('cal-ev-co').value = ev ? (ev.company_nafn || '') : '';
    document.getElementById('cal-ev-date').value = d;
    document.getElementById('cal-ev-time-start').value = ev ? isoTime(new Date(ev.scheduled_start)) : pad(h) + ':00';
    document.getElementById('cal-ev-time-end').value = ev && ev.scheduled_end ? isoTime(new Date(ev.scheduled_end)) : pad(Math.min(h+1,23)) + ':00';
    document.getElementById('cal-ev-staff').value = ev ? (ev.assigned_to || '') : '';
    document.getElementById('cal-ev-notes').value = ev ? (ev.notes || '') : '';

    // Footer buttons
    const foot = document.getElementById('cal-mfoot');
    foot.innerHTML = '';
    if (!isNew) {
      const delBtn = document.createElement('button');
      delBtn.className = 'cal-del'; delBtn.textContent = '🗑 Eyða';
      delBtn.onclick = async () => {
        if (!await Confirm.show('Eyða þessari tímasetningu?')) return;
        const SB = getSB(); if (!SB) return;
        await SB.from('dagbok').delete().eq('id', ev.id);
        events = events.filter(e => e.id !== ev.id);
        closeEventModal(); render();
      };
      foot.appendChild(delBtn);
      if (ev.status !== 'done') {
        const doneBtn = document.createElement('button');
        doneBtn.className = 'cal-done-btn'; doneBtn.textContent = '✓ Klárað';
        doneBtn.onclick = async () => {
          const SB = getSB(); if (!SB) return;
          await SB.from('dagbok').update({ status: 'done' }).eq('id', ev.id);
          ev.status = 'done';
          closeEventModal(); render();
        };
        foot.appendChild(doneBtn);
      }
    }
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cal-cancel-btn'; cancelBtn.textContent = 'Hætta við';
    cancelBtn.onclick = closeEventModal;
    foot.appendChild(cancelBtn);
    const saveBtn = document.createElement('button');
    saveBtn.className = 'cal-save-btn'; saveBtn.textContent = 'Vista';
    saveBtn.onclick = async () => {
      const title = document.getElementById('cal-ev-title').value.trim();
      if (!title) { if (window.Toast && Toast.show) Toast.show('Sláðu inn titil'); return; }
      const date = document.getElementById('cal-ev-date').value;
      const ts = document.getElementById('cal-ev-time-start').value;
      const te = document.getElementById('cal-ev-time-end').value;
      if (!date || !ts) { if (window.Toast && Toast.show) Toast.show('Veldu dagsetningu og tíma'); return; }
      const start = new Date(date + 'T' + ts + ':00');
      const end = te ? new Date(date + 'T' + te + ':00') : null;
      const row = {
        title,
        company_nafn: document.getElementById('cal-ev-co').value.trim() || null,
        assigned_to: document.getElementById('cal-ev-staff').value.trim() || null,
        notes: document.getElementById('cal-ev-notes').value.trim() || null,
        scheduled_start: start.toISOString(),
        scheduled_end: end ? end.toISOString() : null,
        status: ev ? ev.status : 'scheduled'
      };
      saveBtn.disabled = true;
      try {
        const SB = getSB(); if (!SB) throw new Error('Engin tenging');
        if (isNew) {
          const { data, error } = await SB.from('dagbok').insert(row).select().single();
          if (error) throw error;
          events.push(data);
        } else {
          const { error } = await SB.from('dagbok').update(row).eq('id', ev.id);
          if (error) throw error;
          Object.assign(ev, row);
        }
        closeEventModal(); render();
        if (window.Toast && Toast.show) Toast.show('✓ Vistað');
      } catch (e) {
        if (window.Toast && Toast.show) Toast.show('Villa: ' + e.message);
        saveBtn.disabled = false;
      }
    };
    foot.appendChild(saveBtn);
    modal.style.display = 'flex';
  }

  // ── View HTML ──────────────────────────────────────────────────────────────
  function buildViewHTML() {
    return `
      <div class="cal-toolbar">
        <button class="cal-nav-btn" id="cal-prev">◀</button>
        <button class="cal-today-btn" id="cal-today">Í dag</button>
        <button class="cal-nav-btn" id="cal-next">▶</button>
        <span class="cal-title" id="cal-title"></span>
        <button class="cal-new-btn" id="cal-new">+ Tímasetning</button>
      </div>
      <div class="cal-grid-wrap" id="cal-grid-wrap"></div>`;
  }

  // ── View injection ─────────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const views = document.querySelectorAll('.view');
    if (!views.length) return;
    const last = views[views.length - 1];
    const view = document.createElement('section');
    view.id = VIEW_ID; view.className = 'view';
    view.innerHTML = buildViewHTML();
    last.parentNode.insertBefore(view, last.nextSibling);

    document.getElementById('cal-prev').addEventListener('click', async () => {
      weekStart.setDate(weekStart.getDate() - 7);
      await load(); render();
    });
    document.getElementById('cal-next').addEventListener('click', async () => {
      weekStart.setDate(weekStart.getDate() + 7);
      await load(); render();
    });
    document.getElementById('cal-today').addEventListener('click', async () => {
      weekStart = weekMonday(new Date());
      await load(); render();
    });
    document.getElementById('cal-new').addEventListener('click', () => {
      openEventModal(null, isoDate(new Date()), 8);
    });
  }

  function ensureNavButton() {
    if (document.querySelector('[data-cal-nav]')) return;
    const fieldBtn = Array.from(document.querySelectorAll('.vnav-btn')).find(b => /Þjónustutæki/i.test(b.textContent));
    if (!fieldBtn || !fieldBtn.parentElement) return;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.setAttribute('data-cal-nav', '1');
    btn.setAttribute('data-view', 'calendar');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>Dagbók`;
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); switchToView(); });
    fieldBtn.parentElement.insertBefore(btn, fieldBtn);
  }

  async function switchToView() {
    ensureView();
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.vnav-btn.active').forEach(b => b.classList.remove('active'));
    const view = document.getElementById(VIEW_ID);
    if (view) view.classList.add('active');
    const btn = document.querySelector('[data-cal-nav]');
    if (btn) btn.classList.add('active');
    weekStart = weekMonday(new Date());
    await load(); render();
  }

  ensureView();
  ensureNavButton();
  setTimeout(() => { ensureView(); ensureNavButton(); }, 700);
  setTimeout(() => { ensureView(); ensureNavButton(); }, 2200);
  const obs = new MutationObserver(() => { ensureView(); ensureNavButton(); });
  obs.observe(document.body, { childList: true, subtree: true });

  window.CalendarView = { open: switchToView, refresh: async () => { await load(); render(); } };
  console.log('[calendar] installed');
})();
/* === END CALENDAR === */
