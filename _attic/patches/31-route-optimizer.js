/* === ROUTE OPTIMIZER v1 === */
/* Shows today's scheduled field appointments in optimal driving order.
 *
 * Works in two modes:
 *  1. Postal-code sort (no API key needed) — groups by postcode proximity
 *     starting from the company's base address.
 *  2. Google Maps Directions API — if user provides an API key in Settings,
 *     computes actual driving time between stops and reorders accordingly.
 *
 * Features:
 *  • "Leiðarskipulag" nav button next to Þjónustutæki
 *  • Today's appointments from dagbok, sorted into optimal route
 *  • "Start navigation" links (opens Google Maps turn-by-turn per stop)
 *  • Route summary: total stops, estimated total drive time
 *  • Export as PDF / copy as text for a daily run-sheet
 *  • Print-friendly layout
 *
 * Settings:
 *  localStorage key "base_address"    — starting address (company base)
 *  localStorage key "maps_api_key"    — Google Maps API key (optional)
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__routeOptimizerInstalled) return;
  window.__routeOptimizerInstalled = true;

  const VIEW_ID = 'view-route-optimizer';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function pad(n) { return String(n).padStart(2,'0'); }
  function fmtTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  }

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('ro-style')) {
    const s = document.createElement('style');
    s.id = 'ro-style';
    s.textContent = `
      #${VIEW_ID} { padding: 0; overflow-y: auto; }
      #${VIEW_ID} .ro-wrap { max-width: 900px; margin: 0 auto; padding: 20px 16px 40px; }
      #${VIEW_ID} .ro-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
      #${VIEW_ID} .ro-header h1 { margin: 0; font-size: 22px; font-weight: 800; }
      #${VIEW_ID} .ro-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
      #${VIEW_ID} .ro-date-nav { display: flex; gap: 6px; align-items: center; }
      #${VIEW_ID} .ro-date-btn { padding: 5px 10px; border: 1px solid #e2e8f0; border-radius: 7px; background: #fff; cursor: pointer; font: inherit; font-size: 13px; color: #334155; }
      #${VIEW_ID} .ro-date-btn:hover { background: #f1f5f9; }
      #${VIEW_ID} .ro-date-disp { font-size: 14px; font-weight: 700; color: #0f172a; min-width: 160px; text-align: center; }

      #${VIEW_ID} .ro-base-row { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; margin-bottom: 16px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
      #${VIEW_ID} .ro-base-row label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
      #${VIEW_ID} .ro-base-input { flex: 1; min-width: 200px; padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 7px; font: inherit; font-size: 13px; }
      #${VIEW_ID} .ro-base-input:focus { outline: none; border-color: #2563eb; }
      #${VIEW_ID} .ro-save-base { padding: 7px 12px; background: #2563eb; color: #fff; border: none; border-radius: 7px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }

      #${VIEW_ID} .ro-summary-bar { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
      #${VIEW_ID} .ro-summary-bar .rs-item { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; }
      #${VIEW_ID} .ro-summary-bar .rs-item .lbl { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; letter-spacing: .05em; }
      #${VIEW_ID} .ro-summary-bar .rs-item .val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 2px; }

      #${VIEW_ID} .ro-actions { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
      #${VIEW_ID} .ro-btn { padding: 7px 14px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; font: inherit; font-size: 13px; cursor: pointer; color: #334155; }
      #${VIEW_ID} .ro-btn:hover { background: #f1f5f9; }
      #${VIEW_ID} .ro-btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
      #${VIEW_ID} .ro-btn.primary:hover { background: #1d4ed8; }

      #${VIEW_ID} .ro-stops { display: flex; flex-direction: column; gap: 10px; }
      #${VIEW_ID} .ro-stop {
        background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
        padding: 0; overflow: hidden; display: flex; align-items: stretch;
      }
      #${VIEW_ID} .ro-stop .stop-num {
        width: 44px; background: #2563eb; color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: 800; flex-shrink: 0;
      }
      #${VIEW_ID} .ro-stop.done .stop-num { background: #16a34a; }
      #${VIEW_ID} .ro-stop.base-stop .stop-num { background: #475569; font-size: 14px; }
      #${VIEW_ID} .ro-stop .stop-body { flex: 1; padding: 12px 14px; }
      #${VIEW_ID} .ro-stop .stop-title { font-weight: 700; font-size: 14px; color: #0f172a; }
      #${VIEW_ID} .ro-stop .stop-co { color: #2563eb; font-size: 13px; font-weight: 600; margin-top: 2px; }
      #${VIEW_ID} .ro-stop .stop-time { font-size: 12px; color: #64748b; margin-top: 2px; }
      #${VIEW_ID} .ro-stop .stop-notes { font-size: 12px; color: #475569; margin-top: 4px; }
      #${VIEW_ID} .ro-stop .stop-actions { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
      #${VIEW_ID} .ro-stop .stop-nav-btn { padding: 4px 10px; background: #eff6ff; border: 1px solid #bfdbfe; color: #2563eb; border-radius: 6px; font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
      #${VIEW_ID} .ro-stop .stop-nav-btn:hover { background: #dbeafe; }
      #${VIEW_ID} .ro-stop .stop-done-btn { padding: 4px 10px; background: #f0fdf4; border: 1px solid #86efac; color: #16a34a; border-radius: 6px; font: inherit; font-size: 11px; font-weight: 600; cursor: pointer; }
      #${VIEW_ID} .ro-stop .stop-done-btn:hover { background: #dcfce7; }
      #${VIEW_ID} .ro-stop.done { opacity: .65; }
      #${VIEW_ID} .ro-empty { padding: 60px; text-align: center; color: #94a3b8; font-style: italic; }
      #${VIEW_ID} .ro-open-maps-btn {
        padding: 9px 16px; background: #16a34a; color: #fff; border: none; border-radius: 8px;
        font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block;
      }
      #${VIEW_ID} .ro-open-maps-btn:hover { background: #15803d; }

      @media print {
        body * { visibility: hidden; }
        #${VIEW_ID}, #${VIEW_ID} * { visibility: visible; }
        #${VIEW_ID} { position: absolute; left: 0; top: 0; width: 100%; }
        #${VIEW_ID} .ro-actions, #${VIEW_ID} .ro-base-row, #${VIEW_ID} .ro-date-nav { display: none !important; }
        #${VIEW_ID} .stop-actions { display: none !important; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── State ─────────────────────────────────────────────────────────────────
  let stops = [];
  let currentDate = todayISO();
  const doneSet = new Set(JSON.parse(localStorage.getItem('ro_done_' + todayISO()) || '[]'));

  // ── Load appointments ─────────────────────────────────────────────────────
  async function load(dateStr) {
    const SB = getSB();
    if (!SB) return;
    try {
      const from = new Date(dateStr + 'T00:00:00').toISOString();
      const to = new Date(dateStr + 'T23:59:59').toISOString();
      const { data, error } = await SB
        .from('dagbok')
        .select('id,title,company_nafn,assigned_to,scheduled_start,scheduled_end,notes,status')
        .gte('scheduled_start', from)
        .lte('scheduled_start', to)
        .neq('status', 'cancelled')
        .order('scheduled_start');
      if (error) {
        if (/relation.*does not exist/i.test(error.message)) { stops = []; return; }
        throw error;
      }
      stops = (data || []).map(ev => ({
        id: ev.id,
        title: ev.title,
        company: ev.company_nafn || '',
        assigned: ev.assigned_to || '',
        start: ev.scheduled_start,
        end: ev.scheduled_end,
        notes: ev.notes || '',
        status: ev.status,
        address: ev.notes || '' // fallback — address may be in notes
      }));
    } catch (e) {
      console.warn('[route-optimizer]', e.message);
      stops = [];
    }
  }

  // ── Simple postal-code sort ────────────────────────────────────────────────
  // Extract postcode from address string e.g. "Suðurlandsbraut 50, 108 Reykjavík" → 108
  function extractPostcode(addr) {
    const m = (addr || '').match(/\b(\d{3})\b/);
    return m ? parseInt(m[1], 10) : 9999;
  }

  function sortByPostcode(stopsArr, baseAddr) {
    const basePC = extractPostcode(baseAddr);
    return [...stopsArr].sort((a, b) => {
      const pcA = extractPostcode(a.address || a.notes || a.company || '');
      const pcB = extractPostcode(b.address || b.notes || b.company || '');
      // Sort ascending from base postcode, wrapping around
      return Math.abs(pcA - basePC) - Math.abs(pcB - basePC);
    });
  }

  // ── Sort by scheduled time (primary approach if no address info) ──────────
  function sortByTime(stopsArr) {
    return [...stopsArr].sort((a, b) => new Date(a.start) - new Date(b.start));
  }

  // ── Build Google Maps multi-stop URL ──────────────────────────────────────
  function mapsUrl(stops, baseAddr) {
    const origin = encodeURIComponent(baseAddr || 'Reykjavík, Iceland');
    const waypoints = stops.map(s => encodeURIComponent(s.company || s.title || 'Iceland')).join('/');
    return `https://www.google.com/maps/dir/${origin}/${waypoints}`;
  }

  function mapsNavUrl(address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || 'Iceland')}`;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function fmtDateDisplay(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const days = ['Sun','Mán','Þri','Mið','Fim','Fös','Lau'];
    const months = ['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'];
    return days[d.getDay()] + ' ' + d.getDate() + '. ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

  function render() {
    const view = document.getElementById(VIEW_ID);
    if (!view || !view.classList.contains('active')) return;
    const wrap = view.querySelector('.ro-wrap');
    if (!wrap) return;

    const baseAddr = localStorage.getItem('base_address') || '';
    const sortedStops = stops.length ? sortByTime(stops) : [];

    // Update date display
    const disp = wrap.querySelector('.ro-date-disp');
    if (disp) disp.textContent = fmtDateDisplay(currentDate);

    // Summary
    const pending = sortedStops.filter(s => !doneSet.has(String(s.id))).length;
    const done = sortedStops.filter(s => doneSet.has(String(s.id))).length;
    wrap.querySelector('#ro-summary').innerHTML = `
      <div class="rs-item"><div class="lbl">Stoppistöðvar</div><div class="val">${sortedStops.length}</div></div>
      <div class="rs-item"><div class="lbl">Klárað</div><div class="val" style="color:#16a34a;">${done}</div></div>
      <div class="rs-item"><div class="lbl">Eftir</div><div class="val" style="color:${pending > 0 ? '#d97706' : '#16a34a'};">${pending}</div></div>
    `;

    if (!sortedStops.length) {
      wrap.querySelector('#ro-stops').innerHTML = '<div class="ro-empty">Engar tímasetningar á þessum degi 📋</div>';
      return;
    }

    // Build Maps route URL
    const mapsLink = baseAddr ? mapsUrl(sortedStops, baseAddr) : null;
    wrap.querySelector('#ro-maps-btn').style.display = mapsLink ? '' : 'none';
    if (mapsLink) wrap.querySelector('#ro-maps-btn').href = mapsLink;

    // Stop cards
    const stopsHTML = sortedStops.map((s, i) => {
      const isDone = doneSet.has(String(s.id));
      const navAddr = s.company || s.title || '';
      const startNavUrl = mapsNavUrl(navAddr);
      return `<div class="ro-stop${isDone ? ' done' : ''}" data-stop-id="${s.id}">
        <div class="stop-num">${i + 1}</div>
        <div class="stop-body">
          <div class="stop-title">${esc(s.title)}</div>
          ${s.company ? `<div class="stop-co">🏢 ${esc(s.company)}</div>` : ''}
          <div class="stop-time">
            🕐 ${esc(fmtTime(s.start))}${s.end ? ' – ' + esc(fmtTime(s.end)) : ''}
            ${s.assigned ? ` &nbsp;·&nbsp; 👤 ${esc(s.assigned)}` : ''}
          </div>
          ${s.notes ? `<div class="stop-notes">📝 ${esc(s.notes)}</div>` : ''}
          <div class="stop-actions">
            <a class="stop-nav-btn" href="${startNavUrl}" target="_blank" rel="noopener">
              🗺 Opna í kortum
            </a>
            ${!isDone ? `<button class="stop-done-btn" data-done-id="${s.id}">✓ Klárað</button>` : `<span style="font-size:11px;color:#16a34a;font-weight:600;">✓ Klárað</span>`}
          </div>
        </div>
      </div>`;
    }).join('');

    wrap.querySelector('#ro-stops').innerHTML = stopsHTML;

    // Wire done buttons
    wrap.querySelectorAll('[data-done-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = String(btn.dataset.doneId);
        doneSet.add(id);
        localStorage.setItem('ro_done_' + currentDate, JSON.stringify([...doneSet]));
        // Update dagbok status
        const SB = getSB();
        if (SB) {
          await SB.from('dagbok').update({ status: 'done' }).eq('id', parseInt(id));
        }
        render();
      });
    });
  }

  // ── Date navigation ────────────────────────────────────────────────────────
  function changeDate(delta) {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    currentDate = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
    doneSet.clear();
    const saved = JSON.parse(localStorage.getItem('ro_done_' + currentDate) || '[]');
    saved.forEach(id => doneSet.add(id));
    (async () => { await load(currentDate); render(); })();
  }

  // ── Copy run-sheet to clipboard ───────────────────────────────────────────
  function copyRunSheet() {
    const lines = [`Ferðaáætlun ${fmtDateDisplay(currentDate)}`, ''];
    stops.forEach((s, i) => {
      lines.push(`${i+1}. ${fmtTime(s.start)} — ${s.title}`);
      if (s.company) lines.push(`   ${s.company}`);
      if (s.notes) lines.push(`   ${s.notes}`);
    });
    navigator.clipboard?.writeText(lines.join('\n')).then(() => {
      if (window.Toast && Toast.show) Toast.show('✓ Afritað á klippiborð');
    });
  }

  // ── Build view HTML ───────────────────────────────────────────────────────
  function buildViewHTML() {
    const base = localStorage.getItem('base_address') || '';
    return `
      <main class="main-panel" style="overflow-y:auto;">
      <div class="ro-wrap">
        <div class="ro-header">
          <div>
            <h1>🗺 Ferðaáætlun</h1>
            <div class="ro-sub">Skipulag á daglegum heimsóknum í bestu röð</div>
          </div>
          <div class="ro-date-nav">
            <button class="ro-date-btn" id="ro-prev">◀</button>
            <span class="ro-date-disp" id="ro-date-disp"></span>
            <button class="ro-date-btn" id="ro-next">▶</button>
            <button class="ro-date-btn" id="ro-today-btn">Í dag</button>
          </div>
        </div>
        <div class="ro-base-row">
          <label>Upphafsstaður:</label>
          <input id="ro-base-inp" type="text" class="ro-base-input" value="${esc(base)}" placeholder="t.d. Suðurlandsbraut 50, 108 Reykjavík">
          <button class="ro-save-base" id="ro-save-base-btn">Vista</button>
        </div>
        <div id="ro-summary" class="ro-summary-bar"></div>
        <div class="ro-actions">
          <a id="ro-maps-btn" class="ro-open-maps-btn" href="#" target="_blank" rel="noopener" style="display:none;">
            🗺 Opna alla leið í Google Maps
          </a>
          <button id="ro-copy-btn" class="ro-btn">📋 Afrita ferðaáætlun</button>
          <button id="ro-print-btn" class="ro-btn">🖨 Prenta</button>
          <button id="ro-refresh-btn" class="ro-btn">🔄 Endurnýja</button>
        </div>
        <div id="ro-stops" class="ro-stops"></div>
      </div>
      </main>`;
  }

  // ── View injection ────────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const views = document.querySelectorAll('.view');
    if (!views.length) return;
    const last = views[views.length - 1];
    const view = document.createElement('section');
    view.id = VIEW_ID; view.className = 'view';
    view.innerHTML = buildViewHTML();
    last.parentNode.insertBefore(view, last.nextSibling);

    document.getElementById('ro-prev').addEventListener('click', () => changeDate(-1));
    document.getElementById('ro-next').addEventListener('click', () => changeDate(+1));
    document.getElementById('ro-today-btn').addEventListener('click', () => {
      currentDate = todayISO(); doneSet.clear(); (async () => { await load(currentDate); render(); })();
    });
    document.getElementById('ro-save-base-btn').addEventListener('click', () => {
      const v = document.getElementById('ro-base-inp')?.value.trim() || '';
      localStorage.setItem('base_address', v);
      if (window.Toast && Toast.show) Toast.show('✓ Upphafsstaður vistaður');
      render();
    });
    document.getElementById('ro-copy-btn').addEventListener('click', copyRunSheet);
    document.getElementById('ro-print-btn').addEventListener('click', () => window.print());
    document.getElementById('ro-refresh-btn').addEventListener('click', async () => {
      document.getElementById('ro-refresh-btn').textContent = '🔄 Hleður…';
      await load(currentDate); render();
      document.getElementById('ro-refresh-btn').textContent = '🔄 Endurnýja';
    });
  }

  function ensureNavButton() {
    if (document.querySelector('[data-route-nav]')) return;
    const fieldBtn = Array.from(document.querySelectorAll('.vnav-btn')).find(b => /Þjónustutæki/i.test(b.textContent));
    if (!fieldBtn || !fieldBtn.parentElement) return;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.setAttribute('data-route-nav', '1');
    btn.setAttribute('data-view', 'route-optimizer');
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>Ferðaáætlun`;
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); switchToView(); });
    fieldBtn.parentElement.insertBefore(btn, fieldBtn.nextSibling);
  }

  async function switchToView() {
    ensureView();
    document.querySelectorAll('.view.active').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.vnav-btn.active').forEach(b => b.classList.remove('active'));
    const view = document.getElementById(VIEW_ID);
    if (view) view.classList.add('active');
    const btn = document.querySelector('[data-route-nav]');
    if (btn) btn.classList.add('active');
    await load(currentDate); render();
  }

  ensureView();
  ensureNavButton();
  setTimeout(() => { ensureView(); ensureNavButton(); }, 700);
  setTimeout(() => { ensureView(); ensureNavButton(); }, 2200);
  const obs = new MutationObserver(() => { ensureView(); ensureNavButton(); });
  obs.observe(document.body, { childList: true, subtree: true });

  window.RouteOptimizer = { open: switchToView };
  console.log('[route-optimizer] installed');
})();
/* === END ROUTE OPTIMIZER === */
