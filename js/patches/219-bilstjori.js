/* === BÍLSTJÓRI (Drivers app) v1 ===
 *
 * A mobile-first page for the drivers: the day's driving list + on-site
 * equipment check-off + notes, in one thumb-friendly screen. Fuses Leiðsögn
 * (the map/route engine, patch 161) with Fyrirtæki í þjónustu (the per-company
 * service data) and the uttaeki inspection model — it READS AND WRITES THE SAME
 * DATA as those views (no parallel store):
 *
 *   • Driving list   — contract customers that need work (Útrunnið / Þessi
 *     mánuður / 🚩 Áríðandi), coloured green/amber/red by the SAME statusFor
 *     rule Leiðsögn uses. Tap a card → company sheet.
 *   • Company sheet  — address + "🧭 Keyra þangað", phone, shared minnispunktar
 *     and an 🚨 urgent message (both stored in arsskodun_customers[id] via
 *     AppSettings.save, so they sync office↔driver and show up in Leiðsögn too),
 *     and the TÆKJALISTI: each tæki has a tap-to-roll status chip
 *       ⚪ Óskoðað → 🟢 Yfirfarið → 🔵 Á verkstæði → ⚪ …
 *     writing uttaeki.status (+ last_insp/next_insp on Yfirfarið) — the same
 *     columns DB.addInspection / patch 90 write.
 *   • "✅ Tekið út" finishes the visit → sets field_inspected_year (the amber
 *     "tekið út — skjöl eftir" state the office report flow then turns green).
 *   • "🚗 Keyra leið dagsins" hands the list to Leiðsögn's route + Google Maps.
 *
 * Mobile-first: ≥44px tap targets, ≥16px text, primary actions in the bottom
 * thumb-zone, stack navigation (top-left back), loading/error/offline states.
 * Deep-linkable as #bilstjori (patch 218).
 *
 * Built 2026-06-17 at the owner's request ("app for the Drivers").
 */
(() => {
  if (window.__bilstjoriInstalled) return;
  window.__bilstjoriInstalled = true;

  const VIEW_ID = 'view-bilstjori';
  const NAV_KEY = 'bilstjori';
  const GC_KEY  = '_slokk_gc';   // shared geocode cache (with patch 161)

  // ── tiny helpers ─────────────────────────────────────────────────────────
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }
  function fmtKt(kt) {
    const s = String(kt || '').replace(/\D/g, '');
    return s.length === 10 ? s.slice(0,6) + '-' + s.slice(6) : (kt || '');
  }
  const MONTHS_IS = ['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'];
  const today = () => new Date().toISOString().slice(0,10);
  const nextYearIso = () => { const t = today(); return (parseInt(t.slice(0,4))+1) + t.slice(4); };
  const curYear = () => new Date().getFullYear();
  function readGc() { try { return JSON.parse(localStorage.getItem(GC_KEY) || '{}'); } catch (_) { return {}; } }

  // ── shared service-data accessors (same stores as Leiðsögn / patch 175) ───
  function companies() { return (window.Companies && Companies.list) || []; }
  function arsAll() { return (window.AppSettings && AppSettings.path && AppSettings.path('arsskodun_customers')) || {}; }
  function bruAll() { return (window.AppSettings && AppSettings.path && AppSettings.path('brunakerfi_customers')) || {}; }
  async function arsSave(coId, patch) {
    if (!window.AppSettings || !AppSettings.save) return false;
    try { return await AppSettings.save({ arsskodun_customers: { [String(coId)]: patch } }); }
    catch (_) { return false; }
  }
  function inService(c, ars, bru) {
    return (ars && ars.equipment) || !!bru ||
      (window.InServiceClients && window.InServiceClients.has && window.InServiceClients.has(c.nafn));
  }

  // Status colour rule — kept identical to patch 161 statusFor so the driver
  // list and the Leiðsögn map agree to the pixel.
  function statusFor(ars) {
    const a = ars || {};
    const cy = curYear(), cm = new Date().getMonth() + 1;
    const m = +a.inspect_month || 0;
    const lastYr = +a.last_year_inspected || 0;
    const fieldYr = +a.field_inspected_year || 0;
    const isDone = lastYr === cy;
    const isFieldOnly = !isDone && fieldYr === cy;
    const isOverdue = !isDone && !isFieldOnly && m > 0 && m < cm;
    const isDueNow = !isDone && !isFieldOnly && m === cm;
    if (isDone)      return { key:'done',        color:'#1a7f4b', label:'Í lagi ' + cy };
    if (isFieldOnly) return { key:'in_progress', color:'#f59e0b', label:'Tekið út — skjöl eftir' };
    if (isOverdue)   return { key:'overdue',     color:'#dc2626', label:'Útrunnið (' + (MONTHS_IS[m-1] || '?') + ')' };
    if (isDueNow)    return { key:'duenow',      color:'#b45309', label:'Þessi mánuður' };
    if (m > 0)       return { key:'scheduled',   color:'#475569', label:'Á dagskrá: ' + (MONTHS_IS[m-1] || '?') };
    return { key:'unknown', color:'#94a3b8', label:'Engin dagsetning' };
  }
  function phoneOf(c) { return c.simi || c['sími'] || c.phone || c.telefon || ''; }
  function coordOf(c, gc) { gc = gc || readGc(); return gc['__co__:' + c.id] || gc[c.heimilisfang] || gc[c.nafn] || null; }

  // Build the driver work-list: every in-service customer, with status; the
  // ones needing attention first. Includes no-coord customers (search still
  // reaches them; the drive button just falls back to an address query).
  function buildList() {
    const ars = arsAll(), bru = bruAll(), gc = readGc();
    const out = [];
    companies().forEach(c => {
      const a = ars[String(c.id)], b = bru[String(c.id)];
      if (!inService(c, a, b)) return;
      out.push({ co: c, ars: a || {}, status: statusFor(a), coord: coordOf(c, gc),
                 priority: +((a || {}).priority) > 0, urgent: (a && a.urgent) ? String(a.urgent).trim() : '' });
    });
    return out;
  }

  // ── equipment (uttaeki) — the same table the inspection flow writes ───────
  // Driver-facing state derived from uttaeki.status (+ last_insp year).
  function unitState(u) {
    const st = (u.status || '').toLowerCase();
    if (st === 'loaned') return 'verkstaedi';
    if (st === 'ok' && String(u.last_insp || '').slice(0,4) === String(curYear())) return 'yfirfarid';
    return 'oskodad';
  }
  const STATE_META = {
    oskodad:   { bg:'var(--surface2,#f8f8fa)', fg:'var(--ink2,#404550)', bd:'var(--brd,#e4e6ea)', icon:'⚪', label:'Óskoðað' },
    yfirfarid: { bg:'var(--grn-bg,#edfaf3)', fg:'var(--grn,#1a7f4b)', bd:'var(--grn-bd,#a7e8c5)', icon:'🟢', label:'Yfirfarið' },
    verkstaedi:{ bg:'var(--blu-bg,#eff6ff)', fg:'var(--blu,#1d4ed8)', bd:'var(--blu-bd,#93c5fd)', icon:'🔵', label:'Á verkstæði' }
  };
  const ROLL = { oskodad:'yfirfarid', yfirfarid:'verkstaedi', verkstaedi:'oskodad' };
  function updateForState(next) {
    if (next === 'yfirfarid') return { status:'ok', last_insp: today(), next_insp: nextYearIso() };
    if (next === 'verkstaedi') return { status:'loaned' };
    return { status:'active' }; // óskoðað = normal in-field
  }
  async function loadUnits(c) {
    const name = c.nafn || '';
    if (window.DB && DB.sb) {
      try {
        let q = DB.sb.from('uttaeki')
          .select('id,serial,type,size,location,status,last_insp,next_insp')
          .order('type', { ascending: true });
        const kt = String(c.kennitala || '').replace(/\D/g,'');
        // match by client name, or by kennitala if uttaeki.client holds the kt
        q = (kt.length === 10) ? q.or('client.ilike.' + JSON.stringify(name) + ',client.eq.' + kt)
                               : q.ilike('client', name);
        const r = await q;
        if (!r.error && Array.isArray(r.data)) return r.data;
      } catch (_) {}
    }
    // offline / no client: fall back to cache
    const cache = (window.DB && DB.cache) || {};
    if (cache.unitsByClient && cache.unitsByClient[name]) return cache.unitsByClient[name];
    if (Array.isArray(cache.units)) return cache.units.filter(u => (u.client || '') === name);
    return [];
  }
  async function saveUnitState(unitId, nextState) {
    const upd = updateForState(nextState);
    if (window.DB && DB.sb) {
      const r = await DB.sb.from('uttaeki').update(upd).eq('id', unitId);
      if (r && r.error) throw new Error(r.error.message || 'update villa');
    }
    // keep DB.cache in sync if present
    try {
      const cache = (window.DB && DB.cache) || {};
      const u = (cache.units || []).find(x => String(x.id) === String(unitId));
      if (u) Object.assign(u, upd);
    } catch (_) {}
    return true;
  }

  // ── view container ────────────────────────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-leidsogn') ||
                   document.getElementById('view-arsskodun') ||
                   document.getElementById('view-counter');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = (sample.className || 'view').replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<div id="_bs-root" class="_bs-root"></div>';
    sample.parentElement.appendChild(v);
    injectStyles();
  }

  function injectStyles() {
    if (document.getElementById('_bs-styles')) return;
    const s = document.createElement('style');
    s.id = '_bs-styles';
    s.textContent = [
      '._bs-root{max-width:680px;margin:0 auto;padding:0 0 100px;font-family:var(--font,Inter,system-ui,sans-serif);font-size:16px;color:var(--ink1,#0f1117);background:var(--bg,#f5f5f7);min-height:100vh;-webkit-tap-highlight-color:transparent}',
      '._bs-top{position:sticky;top:0;z-index:5;background:var(--sidebar-bg,#1a1f2e);color:#fff;padding:16px 16px 14px;display:flex;flex-direction:column;gap:11px;border-bottom:2px solid var(--brand,#C93C1D)}',
      '._bs-top h1{margin:0;font-size:19px;font-weight:700;letter-spacing:-.02em;display:flex;align-items:center;gap:9px}',
      '._bs-search{width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:12px 14px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.08);color:#fff}',
      '._bs-search::placeholder{color:rgba(255,255,255,.5)}',
      '._bs-search:focus{outline:none;border-color:var(--brand,#C93C1D);background:rgba(255,255,255,.12)}',
      '._bs-seg{display:flex;gap:5px;background:rgba(255,255,255,.07);padding:4px;border-radius:11px}',
      '._bs-seg button{flex:1;min-height:38px;font:inherit;font-size:13.5px;font-weight:600;border:none;border-radius:8px;background:transparent;color:rgba(255,255,255,.7);cursor:pointer}',
      '._bs-seg button.on{background:#fff;color:var(--ink1,#0f1117);box-shadow:0 1px 2px rgba(0,0,0,.18)}',
      '._bs-list{padding:12px 14px;display:flex;flex-direction:column;gap:9px}',
      '._bs-card{display:flex;gap:13px;align-items:center;width:100%;text-align:left;background:var(--surface,#fff);border:1px solid var(--brd,#e4e6ea);border-radius:var(--radius-lg,14px);padding:14px 15px;min-height:64px;cursor:pointer;box-shadow:var(--shadow-sm,0 1px 3px rgba(0,0,0,.06));transition:background .12s,box-shadow .12s}',
      '._bs-card:active{background:var(--surface2,#f8f8fa);box-shadow:var(--shadow-md,0 4px 12px rgba(0,0,0,.08))}',
      '._bs-dot{width:12px;height:12px;border-radius:50%;flex:none;box-shadow:0 0 0 3px rgba(0,0,0,.04)}',
      '._bs-card-main{flex:1;min-width:0}',
      '._bs-card-name{font-weight:600;font-size:16px;line-height:1.3;color:var(--ink1,#0f1117);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-card-sub{font-size:13.5px;color:var(--ink3,#8891a0);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-card-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:6px;font-size:12.5px;font-weight:600}',
      '._bs-badge{font-size:11.5px;font-weight:700;padding:2px 9px;border-radius:999px;background:var(--red-bg,#fff0ed);color:var(--red,#C93C1D);border:1px solid var(--red-bd,#fca5a5)}',
      '._bs-chev{font-size:23px;color:var(--ink4,#bcc3cc);flex:none;line-height:1}',
      '._bs-empty{padding:48px 24px;text-align:center;color:var(--ink3,#8891a0);font-size:15px}',
      '._bs-err{margin:12px 14px;padding:14px;border-radius:12px;background:var(--red-bg,#fff0ed);border:1px solid var(--red-bd,#fca5a5);color:var(--brand-dk,#a83018);font-size:14px;display:flex;justify-content:space-between;align-items:center;gap:10px}',
      '._bs-bottom{position:fixed;left:0;right:0;bottom:0;z-index:20;background:linear-gradient(to top,var(--bg,#f5f5f7) 62%,rgba(245,245,247,0));padding:14px 14px calc(14px + env(safe-area-inset-bottom));display:flex;justify-content:center}',
      '._bs-bottom .inner{width:100%;max-width:652px}',
      '._bs-primary{width:100%;box-sizing:border-box;min-height:54px;font:inherit;font-size:16.5px;font-weight:700;letter-spacing:-.01em;border:none;border-radius:var(--radius-lg,14px);background:var(--brand,#C93C1D);color:#fff;cursor:pointer;box-shadow:var(--shadow-md,0 4px 12px rgba(0,0,0,.12))}',
      '._bs-primary:active{background:var(--brand-dk,#a83018)}',
      '._bs-primary[disabled]{background:var(--ink4,#bcc3cc);box-shadow:none;cursor:default}',
      // company sheet (slide-in stack)
      '._bs-sheet{position:fixed;inset:0;z-index:30;background:var(--bg,#f5f5f7);display:flex;flex-direction:column;transform:translateX(100%);transition:transform .24s cubic-bezier(.32,.72,0,1);overflow:hidden}',
      '._bs-sheet.in{transform:translateX(0)}',
      '._bs-sheet-top{position:sticky;top:0;background:var(--sidebar-bg,#1a1f2e);color:#fff;padding:12px;display:flex;align-items:center;gap:11px;border-bottom:2px solid var(--brand,#C93C1D)}',
      '._bs-back{min-width:44px;min-height:44px;border:none;border-radius:11px;background:rgba(255,255,255,.1);color:#fff;font-size:22px;line-height:1;cursor:pointer;flex:none}',
      '._bs-back:active{background:rgba(255,255,255,.18)}',
      '._bs-sheet-title{flex:1;min-width:0}',
      '._bs-sheet-title .nm{font-weight:700;font-size:17px;letter-spacing:-.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-sheet-title .st{font-size:12.5px;color:rgba(255,255,255,.7);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-sheet-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 14px 120px}',
      '._bs-addr{font-size:14.5px;color:var(--ink2,#404550);margin:2px 2px 14px;line-height:1.45}',
      '._bs-actrow{display:flex;gap:10px;margin-bottom:14px}',
      '._bs-act{flex:1;min-height:50px;font:inherit;font-size:15px;font-weight:600;border-radius:12px;border:1px solid var(--brd,#e4e6ea);background:var(--surface,#fff);color:var(--ink1,#0f1117);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;box-shadow:var(--shadow-sm,0 1px 3px rgba(0,0,0,.06))}',
      '._bs-act.go{background:var(--brand,#C93C1D);border-color:var(--brand,#C93C1D);color:#fff}',
      '._bs-act:active{filter:brightness(.97)}',
      '._bs-sec{background:var(--surface,#fff);border:1px solid var(--brd,#e4e6ea);border-radius:var(--radius-lg,14px);padding:15px;margin-bottom:13px;box-shadow:var(--shadow-sm,0 1px 3px rgba(0,0,0,.06))}',
      '._bs-sec h3{margin:0 0 11px;font-size:13px;font-weight:700;color:var(--ink2,#404550);text-transform:uppercase;letter-spacing:.03em;display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '._bs-urgent{background:var(--red-bg,#fff0ed);border-color:var(--red-bd,#fca5a5)}',
      '._bs-urgent h3{color:var(--brand,#C93C1D)}',
      '._bs-ta{width:100%;box-sizing:border-box;font:inherit;font-size:15px;line-height:1.5;padding:11px 12px;border:1px solid var(--brd2,#d0d4da);border-radius:10px;resize:vertical;min-height:62px;background:var(--surface,#fff);color:var(--ink1,#0f1117)}',
      '._bs-ta:focus{outline:none;border-color:var(--brand,#C93C1D)}',
      '._bs-save{margin-top:9px;min-height:42px;padding:0 16px;font:inherit;font-size:13.5px;font-weight:600;border:none;border-radius:9px;background:var(--ink1,#0f1117);color:#fff;cursor:pointer}',
      '._bs-unit{display:flex;align-items:center;gap:12px;padding:11px 12px;border:1px solid var(--brd,#e4e6ea);border-radius:12px;margin-bottom:9px;background:var(--surface,#fff)}',
      '._bs-unit-main{flex:1;min-width:0}',
      '._bs-unit-t{font-weight:600;font-size:15px;color:var(--ink1,#0f1117);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-unit-s{font-size:12.5px;color:var(--ink3,#8891a0);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '._bs-chip{min-width:132px;min-height:46px;border:1px solid transparent;border-radius:11px;font:inherit;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;flex:none}',
      '._bs-chip:active{filter:brightness(.96)}',
      '._bs-prog{font-size:12.5px;color:var(--ink3,#8891a0);font-weight:700;text-transform:none;letter-spacing:0}'
    ].join('');
    document.head.appendChild(s);
  }

  // ── state ────────────────────────────────────────────────────────────────
  let _seg = 'today';     // 'today' | 'all'
  let _search = '';

  // ── home: driving list ────────────────────────────────────────────────────
  const DUE = { overdue:0, duenow:1, scheduled:2, in_progress:3, done:4, unknown:5 };
  function render() {
    ensureView();
    const root = document.getElementById('_bs-root');
    if (!root) { setTimeout(render, 150); return; }

    const ready = !!(window.Companies && Companies.list);
    const all = ready ? buildList() : [];
    const q = _search.trim().toLowerCase();

    let list = all.slice();
    if (_seg === 'today') {
      list = list.filter(x => x.status.key === 'overdue' || x.status.key === 'duenow' || x.priority);
    }
    if (q) {
      list = list.filter(x =>
        (x.co.nafn || '').toLowerCase().includes(q) ||
        (x.co.heimilisfang || '').toLowerCase().includes(q) ||
        String(x.co.kennitala || '').replace(/\D/g,'').includes(q.replace(/\D/g,'')));
    }
    list.sort((a, b) =>
      (a.priority === b.priority ? 0 : (a.priority ? -1 : 1)) ||
      ((DUE[a.status.key] ?? 9) - (DUE[b.status.key] ?? 9)) ||
      String(a.co.nafn).localeCompare(b.co.nafn, 'is'));

    const driveCount = list.filter(x => x.coord && (x.status.key === 'overdue' || x.status.key === 'duenow' || x.priority)).length;

    root.innerHTML =
      '<div class="_bs-top">' +
        '<h1><span>🚚</span><span>Bílstjóri</span></h1>' +
        '<input id="_bs-q" class="_bs-search" type="search" inputmode="search" placeholder="Leita að fyrirtæki, heimilisfangi, kt…" value="' + esc(_search) + '">' +
        '<div class="_bs-seg">' +
          '<button data-seg="today" class="' + (_seg==='today'?'on':'') + '" type="button">📋 Dagsins verk</button>' +
          '<button data-seg="all" class="' + (_seg==='all'?'on':'') + '" type="button">🏢 Allir í þjónustu</button>' +
        '</div>' +
      '</div>' +
      (!ready
        ? '<div class="_bs-empty">⏳ Sæki gögn…</div>'
        : (list.length
            ? '<div class="_bs-list">' + list.map(cardHtml).join('') + '</div>'
            : '<div class="_bs-empty">' + (_seg==='today' ? '✅ Ekkert áríðandi eftir í dag.' : 'Engin fyrirtæki fundust.') + '</div>')) +
      '<div class="_bs-bottom"><div class="inner">' +
        '<button id="_bs-drive" class="_bs-primary" type="button"' + (driveCount ? '' : ' disabled') + '>🚗 Keyra leið dagsins' + (driveCount ? ' (' + driveCount + ')' : '') + '</button>' +
      '</div></div>';

    // wire
    const qEl = document.getElementById('_bs-q');
    if (qEl) qEl.addEventListener('input', e => {
      _search = e.target.value || '';
      // re-render list body only (keep focus): simplest is full re-render w/ focus restore
      const pos = qEl.selectionStart; render();
      const q2 = document.getElementById('_bs-q'); if (q2) { q2.focus(); try { q2.setSelectionRange(pos, pos); } catch (_) {} }
    });
    root.querySelectorAll('._bs-seg button').forEach(b => b.addEventListener('click', () => {
      _seg = b.dataset.seg; _search = ''; render();
    }));
    root.querySelectorAll('._bs-card').forEach(card => card.addEventListener('click', () => {
      openCompany(+card.dataset.id);
    }));
    const drive = document.getElementById('_bs-drive');
    if (drive) drive.addEventListener('click', () => driveDay(list));
  }

  function cardHtml(x) {
    const c = x.co;
    return (
      '<button class="_bs-card" type="button" data-id="' + c.id + '">' +
        '<span class="_bs-dot" style="background:' + x.status.color + '"></span>' +
        '<span class="_bs-card-main">' +
          '<span class="_bs-card-name">' + (x.priority ? '🚩 ' : '') + esc(c.nafn || '—') + '</span>' +
          '<span class="_bs-card-sub">' + (c.heimilisfang ? '📍 ' + esc(c.heimilisfang) : '<span style="color:#dc2626">⚠ Ekkert heimilisfang</span>') + '</span>' +
          '<span class="_bs-card-meta">' +
            '<span style="color:' + x.status.color + ';font-weight:700">' + esc(x.status.label) + '</span>' +
            (x.urgent ? '<span class="_bs-badge" style="background:#fef2f2;color:#b91c1c">🚨 Áríðandi skilaboð</span>' : '') +
          '</span>' +
        '</span>' +
        '<span class="_bs-chev">›</span>' +
      '</button>'
    );
  }

  function driveDay(list) {
    const stops = list.filter(x => x.coord && (x.status.key==='overdue' || x.status.key==='duenow' || x.priority))
      .map(x => ({ id: x.co.id, name: x.co.nafn, addr: x.co.heimilisfang || '', lat: x.coord.lat, lng: x.coord.lng }));
    if (!stops.length) return;
    if (window.Leidsogn && Leidsogn.clearRoute && Leidsogn.addToRoute && Leidsogn.launchNav) {
      try {
        Leidsogn.clearRoute();
        stops.forEach(s => Leidsogn.addToRoute(s.id, s.name, s.addr, s.lat, s.lng));
        Leidsogn.launchNav();
        return;
      } catch (_) {}
    }
    // fallback: open Google Maps directly with waypoints
    const dest = stops[stops.length - 1];
    const wp = stops.slice(0, -1).map(s => s.lat + ',' + s.lng).join('|');
    let url = 'https://www.google.com/maps/dir/?api=1&destination=' + dest.lat + ',' + dest.lng + '&travelmode=driving';
    if (wp) url += '&waypoints=' + encodeURIComponent(wp);
    window.open(url, '_blank');
  }

  // ── company sheet (stack) ─────────────────────────────────────────────────
  function navTo(co, lat, lng) {
    let url;
    if (lat != null && lng != null) {
      url = 'https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lng + '&travelmode=driving';
    } else {
      const addr = [co.nafn, co.heimilisfang].filter(Boolean).join(', ');
      url = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(addr) + '&travelmode=driving';
    }
    window.open(url, '_blank');
  }

  function openCompany(coId) {
    const c = companies().find(x => String(x.id) === String(coId));
    if (!c) return;
    const a = arsAll()[String(coId)] || {};
    const st = statusFor(a);
    const coord = coordOf(c);
    const phone = phoneOf(c);

    const sheet = document.createElement('div');
    sheet.className = '_bs-sheet';
    sheet.innerHTML =
      '<div class="_bs-sheet-top">' +
        '<button class="_bs-back" type="button" aria-label="Til baka">‹</button>' +
        '<div class="_bs-sheet-title"><div class="nm">' + esc(c.nafn || '—') + '</div>' +
          '<div class="st">' + (c.kennitala ? 'kt. ' + esc(fmtKt(c.kennitala)) + ' · ' : '') +
          '<span style="color:' + st.color + '">●</span> ' + esc(st.label) + '</div></div>' +
      '</div>' +
      '<div class="_bs-sheet-body">' +
        (c.heimilisfang ? '<div class="_bs-addr">📍 ' + esc(c.heimilisfang) + '</div>' : '') +
        '<div class="_bs-actrow">' +
          '<button class="_bs-act go" id="_bs-nav" type="button">🧭 Keyra þangað</button>' +
          (phone ? '<a class="_bs-act call" href="tel:' + esc(String(phone).replace(/\s/g,'')) + '">📞 Hringja</a>' : '') +
        '</div>' +

        '<div class="_bs-sec _bs-urgent">' +
          '<h3><span>🚨 Áríðandi skilaboð</span></h3>' +
          '<textarea class="_bs-ta" id="_bs-urgent-ta" placeholder="Brýn skilaboð fyrir bílstjóra / skrifstofu (sést á forsíðu listans)…">' + esc(a.urgent || '') + '</textarea>' +
          '<button class="_bs-save" id="_bs-urgent-save" type="button">💾 Vista skilaboð</button>' +
        '</div>' +

        '<div class="_bs-sec">' +
          '<h3><span>📝 Minnispunktar</span><span style="font-weight:600;color:var(--ink3,#8891a0);font-size:12px;text-transform:none;letter-spacing:0">deilt með Leiðsögn</span></h3>' +
          '<textarea class="_bs-ta" id="_bs-note-ta" placeholder="Áminningar: hringja á undan, lykill hjá húsverði, bílastæði í bakgarði…">' + esc(a.notes || '') + '</textarea>' +
          '<button class="_bs-save" id="_bs-note-save" type="button">💾 Vista</button>' +
        '</div>' +

        '<div class="_bs-sec">' +
          '<h3><span>🧯 Tækjalisti</span><span class="_bs-prog" id="_bs-prog">…</span></h3>' +
          '<div id="_bs-units"><div class="_bs-empty" style="padding:18px">⏳ Sæki tæki…</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="_bs-bottom"><div class="inner" style="display:flex;gap:10px">' +
        '<button class="_bs-primary" id="_bs-add-route" style="background:var(--ink2,#404550);box-shadow:none;flex:1">➕ Á leið</button>' +
        '<button class="_bs-primary" id="_bs-done" style="flex:2">✅ Tekið út (klára heimsókn)</button>' +
      '</div></div>';

    document.body.appendChild(sheet);
    requestAnimationFrame(() => sheet.classList.add('in'));

    const close = () => { sheet.classList.remove('in'); setTimeout(() => sheet.remove(), 230); };
    sheet.querySelector('._bs-back').addEventListener('click', close);

    sheet.querySelector('#_bs-nav').addEventListener('click', () => navTo(c, coord && coord.lat, coord && coord.lng));

    sheet.querySelector('#_bs-add-route').addEventListener('click', () => {
      if (coord && window.Leidsogn && Leidsogn.addToRoute) {
        Leidsogn.addToRoute(c.id, c.nafn, c.heimilisfang || '', coord.lat, coord.lng);
        toast('➕ Bætt á leið');
      } else { toast('⚠ Vantar staðsetningu'); }
    });

    // urgent + notes save (synced via AppSettings, shared with Leiðsögn)
    sheet.querySelector('#_bs-urgent-save').addEventListener('click', async e => {
      const v = sheet.querySelector('#_bs-urgent-ta').value;
      e.target.textContent = '… vista'; e.target.disabled = true;
      const ok = await arsSave(coId, { urgent: v });
      e.target.textContent = ok ? '✓ Vistað' : '⚠ Villa'; setTimeout(() => { e.target.textContent = '💾 Vista skilaboð'; e.target.disabled = false; }, 1400);
    });
    sheet.querySelector('#_bs-note-save').addEventListener('click', async e => {
      const v = sheet.querySelector('#_bs-note-ta').value;
      e.target.textContent = '… vista'; e.target.disabled = true;
      const ok = await arsSave(coId, { notes: v });
      e.target.textContent = ok ? '✓ Vistað' : '⚠ Villa'; setTimeout(() => { e.target.textContent = '💾 Vista'; e.target.disabled = false; }, 1400);
    });

    sheet.querySelector('#_bs-done').addEventListener('click', async e => {
      e.target.textContent = '… vista'; e.target.disabled = true;
      const ok = await arsSave(coId, { field_inspected_year: curYear() });
      toast(ok ? '✅ Skráð sem tekið út' : '⚠ Villa við vistun');
      try { if (window.Leidsogn && Leidsogn.refresh) Leidsogn.refresh(); } catch (_) {}
      close();
      render();
    });

    // load equipment
    loadUnitsInto(sheet, c);
  }

  async function loadUnitsInto(sheet, c) {
    const box = sheet.querySelector('#_bs-units');
    const prog = sheet.querySelector('#_bs-prog');
    let units;
    try { units = await loadUnits(c); }
    catch (e) {
      box.innerHTML = '<div class="_bs-err">Villa við að sækja tæki.<button class="_bs-save" style="background:#b91c1c" type="button">↻ Reyna aftur</button></div>';
      box.querySelector('button').addEventListener('click', () => loadUnitsInto(sheet, c));
      return;
    }
    if (!units.length) {
      box.innerHTML = '<div class="_bs-empty" style="padding:18px">Engin skráð tæki á þessu fyrirtæki.</div>';
      if (prog) prog.textContent = '0 tæki';
      return;
    }
    const draw = () => {
      const done = units.filter(u => unitState(u) === 'yfirfarid').length;
      if (prog) prog.textContent = 'Yfirfarin: ' + done + '/' + units.length;
      box.innerHTML = units.map(u => {
        const stt = unitState(u);
        const m = STATE_META[stt];
        const sub = [u.size, u.location, u.serial].filter(Boolean).map(esc).join(' · ');
        return (
          '<div class="_bs-unit">' +
            '<div class="_bs-unit-main">' +
              '<div class="_bs-unit-t">' + esc(u.type || 'Tæki') + '</div>' +
              (sub ? '<div class="_bs-unit-s">' + sub + '</div>' : '') +
            '</div>' +
            '<button class="_bs-chip" data-id="' + u.id + '" type="button" style="background:' + m.bg + ';color:' + m.fg + ';border-color:' + m.bd + '">' + m.icon + ' ' + m.label + '</button>' +
          '</div>'
        );
      }).join('');
      box.querySelectorAll('._bs-chip').forEach(btn => btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const u = units.find(x => String(x.id) === String(id));
        if (!u) return;
        const next = ROLL[unitState(u)];
        const meta = STATE_META[next];
        btn.style.background = meta.bg; btn.style.color = meta.fg; btn.style.borderColor = meta.bd; btn.textContent = meta.icon + ' ' + meta.label; // optimistic
        Object.assign(u, updateForState(next));
        try { await saveUnitState(id, next); draw(); }
        catch (_) { toast('⚠ Vistun mistókst'); }
      }));
    };
    draw();
  }

  // ── toast ─────────────────────────────────────────────────────────────────
  function toast(msg) {
    if (window.Toast && Toast.show) { try { Toast.show(msg); return; } catch (_) {} }
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:92px;transform:translateX(-50%);z-index:100090;background:var(--ink1,#0f1117);color:#fff;padding:11px 18px;border-radius:999px;font-size:14px;font-weight:700;font-family:var(--font,Inter,sans-serif);box-shadow:0 8px 24px rgba(0,0,0,.3)';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1800);
  }

  // ── nav button + view switch hook + boot ──────────────────────────────────
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 600); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const ref = nav.querySelector('[data-view="leidsogn"]') || nav.querySelector('.vnav-btn');
    const btn = document.createElement('button');
    btn.className = (ref && ref.className) || 'vnav-btn';
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">' +
        '<path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>' +
      '</svg><span>Bílstjóri</span></span>';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY); else show();
    });
    if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling);
    else nav.insertBefore(btn, nav.firstChild);
  }

  function show() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display='none'; v.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    if (v) { v.style.display='block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
    // mirror into the url (#bilstjori) — patch 218 doesn't see this branch
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    render();
  }

  function patchSwitchView() {
    if (!window.App || window.App._bilstjoriPatched) { if (!window.App) return setTimeout(patchSwitchView, 120); }
    if (window.App._bilstjoriPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      if (orig) return orig.apply(this, arguments);
    };
    // carry flags so patch 154 / 218 don't re-wrap
    for (const k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._bilstjoriPatched = true;
  }

  function boot() {
    ensureView();
    injectSidebar();
    patchSwitchView();
    setTimeout(injectSidebar, 1400);
    setTimeout(injectSidebar, 3000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Bilstjori = { show, render, version: 'v1' };
  console.log('[bilstjori v1] installed');
})();
/* === END BÍLSTJÓRI === */
