/* === VIKUDAGSKRÁ v1 — vikubanner efst á Verkborði ===
 *
 * Útfærir hönnunina „Verkborð með vikubanneri" (Claude Design verkefni
 * 12153b12 · „Vikudagskra banner.dc.html"): vikuræma sem situr milli
 * síðutitilsins og stjórnkortsins á Verkborði (#231).
 *
 *   • Dökkur haus: DAGSKRÁ · vikuheiti · vikunúmer  +  ‹ · Í dag ·
 *     Næsta vika › · „+ Skrá verk".
 *   • Mán–fös sem fimm reitir, lau/sun staflað í sjöttu súlunni (helgin er
 *     sjaldan bókuð, fær því hálfa hæð).
 *   • Dagurinn í dag fær rauðan pillu-dagsetningarstimpil og rauðan ramma,
 *     liðnir dagar daufan grábakgrunn.
 *   • Verk-flísar: litadepill eftir tegund, mono-tími, nafn viðskiptavinar og
 *     ✕ til að taka af dagskrá. Tómur dagur sýnir dauft „+".
 *   • Smellur á dag (eða „+ Skrá verk") opnar skráningarglugga:
 *     dagsetning · tími · fyrirtæki · tegund verks · athugasemd.
 *
 * GÖGN: `AppSettings.path('vikudagskra.jobs')` — þ.e. sama samstillta
 * app_settings-blobbið og Verkefni/Þjónustuverk nota. Hönnunar-frumgerðin
 * geymdi í localStorage; það hefði þýtt sér-dagskrá í hverju tæki, og Agnar
 * vinnur á síma + þremur tölvum. Vistun fer gegnum `AppSettings.save`, sem
 * merge-ar bara þennan eina lykil á servernum (sjá #85), svo dagskráin
 * treður ekki á öðrum stillingum.
 *
 * TÓM VIÐ FYRSTU OPNUN — frumgerðin sáði demo-færslum (Distica, Eimskip …);
 * þær eiga ekkert erindi í raunveruleg samstillt gögn.
 *
 * API: window.Vikudagskra = { mount, render, open }
 */
(() => {
  if (window.__vikudagskraInstalled) return;
  window.__vikudagskraInstalled = true;

  const SLOT_ID = 'vb-dagskra';        // reiturinn sem #231 skilur eftir
  const HOST_ID = 'vd-modal-host';     // glugginn lifir utan borðsins
  const ACCENT  = '#c3271c';

  const TYPES = [
    ['Árskoðun',   '#c3271c'],
    ['Hleðsla',    '#b8770e'],
    ['Uppsetning', '#2c6e9e'],
    ['Verkstæði',  '#5b6470'],
    ['Annað',      '#8a8f98']
  ];
  const COLOR  = TYPES.reduce((a, t) => { a[t[0]] = t[1]; return a; }, {});
  const NAMES  = ['mán', 'þri', 'mið', 'fim', 'fös', 'lau', 'sun'];
  const MONTHS = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní',
                  'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[vikudagskra]', m); }

  const state = {
    offset: 0,
    jobs: [],
    modal: false,
    form: { date: '', time: '09:00', name: '', type: 'Árskoðun', note: '' }
  };

  // ── dagsetningar ─────────────────────────────────────────────────────────
  function fmt(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
           '-' + String(d.getDate()).padStart(2, '0');
  }
  function monday(base) {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    return d;
  }
  function isoWeek(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    t.setUTCDate(t.getUTCDate() - (t.getUTCDay() + 6) % 7 + 3);   // fimmtudagur vikunnar
    const first = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
    first.setUTCDate(first.getUTCDate() - (first.getUTCDay() + 6) % 7 + 3);
    return 1 + Math.round((t - first) / (7 * 864e5));
  }
  function weekLabel(mon) {
    const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
    if (mon.getMonth() === sun.getMonth())
      return mon.getDate() + '.–' + sun.getDate() + '. ' + MONTHS[mon.getMonth()] + ' ' + sun.getFullYear();
    return mon.getDate() + '. ' + MONTHS[mon.getMonth()] +
           (mon.getFullYear() !== sun.getFullYear() ? ' ' + mon.getFullYear() : '') +
           ' – ' + sun.getDate() + '. ' + MONTHS[sun.getMonth()] + ' ' + sun.getFullYear();
  }

  // ── gögn (samstillt gegnum AppSettings) ──────────────────────────────────
  function readJobs() {
    const v = (window.AppSettings && AppSettings.path) ? AppSettings.path('vikudagskra.jobs') : null;
    return Array.isArray(v) ? v : [];
  }
  async function persist(next) {
    state.jobs = next;
    render();
    if (!window.AppSettings || !AppSettings.save) { toast('Stillingar ekki tilbúnar — dagskráin vistaðist ekki'); return; }
    const ok = await AppSettings.save({ vikudagskra: { jobs: next } });
    if (!ok) toast('Náði ekki að vista dagskrána');
  }

  // ── stílar (hover/animation þarf alvöru CSS) ─────────────────────────────
  function injectCSS() {
    if (document.getElementById('vd-css')) return;
    const s = document.createElement('style');
    s.id = 'vd-css';
    s.textContent = `
      #${SLOT_ID} .vd-cell { transition: box-shadow .12s ease; }
      #${SLOT_ID} .vd-cell:hover { box-shadow: 0 3px 10px rgba(0,0,0,.12); }
      #${SLOT_ID} .vd-nav:hover { background: #2a2c33 !important; }
      #${SLOT_ID} .vd-cta:hover, #${HOST_ID} .vd-cta:hover { filter: brightness(1.14); }
      #${HOST_ID} .vd-nav:hover { background: #2a2c33 !important; }
      .vd-x { opacity: .4; transition: opacity .1s ease, color .1s ease; }
      .vd-x:hover { opacity: 1; color: ${ACCENT} !important; }
      #${HOST_ID} input:focus, #${HOST_ID} select:focus { border-color: ${ACCENT} !important; background: #fff !important; }
      @keyframes vdDim { from { opacity: 0; } to { opacity: 1; } }
      @keyframes vdPop { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      @media (max-width: 640px) {
        #${SLOT_ID} .vd-grid { grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)) !important; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── vikuræman ────────────────────────────────────────────────────────────
  function dayModel(mon, i, todayStr) {
    const d = new Date(mon); d.setDate(d.getDate() + i);
    const ds = fmt(d);
    const isToday = ds === todayStr, isPast = ds < todayStr;
    const jobs = state.jobs
      .filter(j => j && j.date === ds)
      .sort((a, b) => (String(a.time || '') < String(b.time || '') ? -1 : 1));
    return {
      ds, name: NAMES[i], num: d.getDate(), jobs,
      bg:     isToday ? 'rgba(195,39,28,.05)' : (isPast ? '#f3f4f6' : '#fafafa'),
      border: isToday ? 'rgba(195,39,28,.6)'  : '#e5e7eb',
      head:   (isPast && !isToday) ? '#b6bac2' : '#6b7280',
      numStyle: isToday
        ? 'min-width:20px;height:20px;padding:0 5px;border-radius:10px;background:' + ACCENT +
          ';color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;box-sizing:border-box'
        : 'font-size:13px;font-weight:800;color:' + (isPast ? '#b6bac2' : '#16181d')
    };
  }

  function jobHTML(j, small) {
    const dot = small ? 7 : 8, tf = small ? 10 : 11, nf = small ? 11 : 12;
    return '<div title="' + esc(j.note || 'Smelltu á ✕ til að eyða') + '" data-vd-stop="1" ' +
      'style="display:flex;align-items:center;gap:' + (small ? 5 : 6) + 'px;background:#fff;border:1px solid #e5e7eb;' +
      'border-radius:' + (small ? 8 : 9) + 'px;padding:' + (small ? '2px 5px 2px 7px' : '4px 5px 4px 7px') + ';' +
      'box-shadow:0 1px 2px rgba(0,0,0,.06);cursor:default">' +
        '<span style="width:' + dot + 'px;height:' + dot + 'px;border-radius:50%;background:' +
          (COLOR[j.type] || '#8a8f98') + ';flex:none"></span>' +
        '<span style="font-family:ui-monospace,\'Cascadia Mono\',Consolas,monospace;font-size:' + tf +
          'px;font-weight:700;color:#6b7280;flex:none">' + esc(j.time || '') + '</span>' +
        '<span style="font-size:' + nf + 'px;font-weight:700;flex:1;min-width:0;overflow:hidden;' +
          'text-overflow:ellipsis;white-space:nowrap">' + esc(j.name) + '</span>' +
        '<button class="vd-x" data-vd="del" data-vd-id="' + esc(j.id) + '" title="Eyða af dagskrá" ' +
          'style="border:none;background:none;cursor:pointer;padding:0 2px;font-size:' + (small ? 11 : 12) +
          'px;color:#9aa0aa;line-height:1;font-family:inherit">✕</button>' +
      '</div>';
  }

  function cellHTML(m, small) {
    return '<div class="vd-cell" data-vd="day" data-vd-date="' + m.ds + '" title="Smelltu til að skrá verk á þennan dag" ' +
      'style="cursor:pointer;border:1px solid ' + m.border + ';border-radius:12px;background:' + m.bg + ';' +
      'padding:' + (small ? '4px 6px 5px' : '6px 6px 8px') + ';' +
      (small ? 'flex:1;min-height:40px' : 'min-height:86px') + ';box-sizing:border-box;display:flex;flex-direction:column">' +
        '<div style="display:flex;align-items:center;gap:6px;padding:' + (small ? '1px 2px 0' : '2px 2px 0') + '">' +
          '<span style="font-size:' + (small ? 11 : 12) + 'px;font-weight:700;text-transform:uppercase;' +
            'letter-spacing:.5px;color:' + m.head + '">' + m.name + '</span>' +
          '<span style="' + m.numStyle + '">' + m.num + '</span>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:' + (small ? 4 : 5) + 'px;' +
          'margin-top:' + (small ? 3 : 6) + 'px;flex:1">' +
          m.jobs.map(j => jobHTML(j, small)).join('') +
          (!small && !m.jobs.length
            ? '<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#d3d6db;font-size:16px;font-weight:300;padding:4px 0">+</div>'
            : '') +
        '</div>' +
      '</div>';
  }

  function render() {
    const el = document.getElementById(SLOT_ID);
    if (!el) return;
    injectCSS();

    const todayStr = fmt(new Date());
    const mon = monday(new Date()); mon.setDate(mon.getDate() + state.offset * 7);
    const days    = [0, 1, 2, 3, 4].map(i => dayModel(mon, i, todayStr));
    const weekend = [5, 6].map(i => dayModel(mon, i, todayStr));

    const navBtn = (act, label, title, extra) =>
      '<button class="vd-nav" data-vd="' + act + '"' + (title ? ' title="' + title + '"' : '') + ' ' +
      'style="height:30px;' + (extra || 'padding:0 12px') + ';border:1px solid #3a3d45;border-radius:10px;' +
      'background:#23252c;color:#fff;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700;' +
      'display:inline-flex;align-items:center;justify-content:center;gap:6px">' + label + '</button>';

    el.innerHTML =
      '<div style="background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.4);overflow:hidden;color:#16181d">' +
        // dökki hausinn
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;' +
          'background:linear-gradient(180deg,#2e3037 0%,#17181c 55%,#0c0d10 100%);padding:8px 12px;border-bottom:1px solid #2a2c33">' +
          '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">' +
            '<span style="font-size:11px;font-weight:800;letter-spacing:1.6px;' +
              'background:linear-gradient(180deg,#96c2a4 0%,#4a8563 45%,#1e4631 100%);' +
              '-webkit-background-clip:text;background-clip:text;color:transparent">DAGSKRÁ</span>' +
            '<span style="font-size:16px;font-weight:800;color:#fff">' + esc(weekLabel(mon)) + '</span>' +
            '<span style="font-family:ui-monospace,\'Cascadia Mono\',Consolas,monospace;font-size:12px;color:#9aa0aa">· vika ' + isoWeek(mon) + '</span>' +
          '</div>' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            navBtn('prev', '‹', 'Fyrri vika', 'width:32px;padding:0;font-size:16px;line-height:1') +
            navBtn('today', 'Í dag', '') +
            navBtn('next', 'Næsta vika <span style="font-size:15px;line-height:1">›</span>', 'Næsta vika') +
            '<div style="width:1px;height:22px;background:#3a3d45;margin:0 4px"></div>' +
            '<button class="vd-cta" data-vd="add" style="height:30px;padding:0 14px;border:1px solid rgba(255,120,100,.5);' +
              'border-radius:10px;background:linear-gradient(180deg,#c3271c,#8c1410);color:#fff;cursor:pointer;' +
              'font-family:inherit;font-size:13px;font-weight:800;box-shadow:0 2px 8px rgba(195,39,28,.35)">+ Skrá verk</button>' +
          '</div>' +
        '</div>' +
        // vikuræman
        '<div style="padding:10px 12px 12px">' +
          '<div class="vd-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(148px,1fr));gap:8px">' +
            days.map(m => cellHTML(m, false)).join('') +
            '<div style="display:flex;flex-direction:column;gap:6px;min-width:0">' +
              weekend.map(m => cellHTML(m, true)).join('') +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:14px;margin-top:10px;padding:0 2px;flex-wrap:wrap">' +
            TYPES.map(t =>
              '<span style="display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:#9aa0aa">' +
                '<span style="width:8px;height:8px;border-radius:50%;background:' + t[1] + '"></span>' + t[0] +
              '</span>').join('') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  // ── skráningargluggi ─────────────────────────────────────────────────────
  function modalHost() {
    let h = document.getElementById(HOST_ID);
    if (!h) { h = document.createElement('div'); h.id = HOST_ID; document.body.appendChild(h); }
    return h;
  }

  function openModal(dateStr) {
    state.modal = true;
    state.form = { date: dateStr || fmt(new Date()), time: '09:00', name: '', type: 'Árskoðun', note: '' };
    renderModal();
  }
  function closeModal() { state.modal = false; renderModal(); }

  function renderModal() {
    const h = modalHost();
    if (!state.modal) { h.innerHTML = ''; return; }
    injectCSS();
    const f = state.form;
    const fld = 'width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid #e0e2e7;border-radius:10px;' +
                'background:#f6f7f9;outline:none;font-family:inherit;font-size:13px;color:#16181d';
    const lbl = 'font-size:12px;font-weight:700;color:#6b7280;margin-bottom:4px';

    h.innerHTML =
      '<div data-vd="close" style="position:fixed;inset:0;background:rgba(10,10,12,.6);display:flex;align-items:center;' +
        'justify-content:center;z-index:4000;animation:vdDim .12s ease;padding:20px">' +
        '<div data-vd-stop="1" style="width:400px;max-width:100%;background:#fff;border-radius:16px;' +
          'box-shadow:0 24px 70px rgba(0,0,0,.5);padding:18px 20px 20px;box-sizing:border-box;' +
          'animation:vdPop .16s ease;color:#16181d">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">' +
            '<h2 style="margin:0;font-size:17px;font-weight:800">Skrá verk á dagskrá</h2>' +
            '<button data-vd="close" style="border:none;background:none;cursor:pointer;font-size:16px;color:#9aa0aa;padding:2px 4px;font-family:inherit">✕</button>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:12px">' +
            // NB `data-original`: #177 (modal dirty-guard) telur <select> ALLTAF
            // breyttan — `defaultValue` er undefined á select, svo ósnert form
            // hefði spurt „óvistaðar breytingar?" við hvern bakgrunnssmell.
            // data-original er þeirra eigin undanþága: ósnert = hreint, en um
            // leið og Agnar skrifar nafn heldur vörnin sér.
            '<div style="display:flex;gap:8px">' +
              '<div style="flex:1"><div style="' + lbl + '">Dagsetning</div>' +
                '<input type="date" id="vd-date" value="' + esc(f.date) + '" data-original="' + esc(f.date) + '" style="' + fld + '"></div>' +
              '<div style="width:110px"><div style="' + lbl + '">Tími</div>' +
                '<input type="time" id="vd-time" value="' + esc(f.time) + '" data-original="' + esc(f.time) + '" style="' + fld + '"></div>' +
            '</div>' +
            '<div><div style="' + lbl + '">Fyrirtæki / viðskiptavinur</div>' +
              // sami fyrirtækjalisti og hraðlínan á Verkborði notar (#231)
              '<input type="text" id="vd-name" list="vb-companies" autocomplete="off" value="' + esc(f.name) + '" ' +
                'data-original="' + esc(f.name) + '" placeholder="t.d. Distica" style="' + fld + '">' +
              '<div id="vd-err" style="display:none;font-size:11px;font-weight:600;color:' + ACCENT + ';margin-top:4px">Vantar nafn viðskiptavinar</div></div>' +
            '<div><div style="' + lbl + '">Tegund verks</div>' +
              '<select id="vd-type" data-original="' + esc(f.type) + '" style="' + fld + ';cursor:pointer">' +
                TYPES.map(t => '<option value="' + t[0] + '"' + (f.type === t[0] ? ' selected' : '') + '>' + t[0] + '</option>').join('') +
              '</select></div>' +
            '<div><div style="' + lbl + '">Athugasemd</div>' +
              '<input type="text" id="vd-note" value="' + esc(f.note) + '" data-original="' + esc(f.note) + '" placeholder="Valfrjálst" style="' + fld + '"></div>' +
          '</div>' +
          '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px">' +
            '<button class="vd-nav" data-vd="close" style="height:36px;padding:0 14px;border:1px solid #3a3d45;border-radius:10px;' +
              'background:#23252c;color:#fff;cursor:pointer;font-family:inherit;font-size:13px;font-weight:700">Hætta við</button>' +
            '<button class="vd-cta" data-vd="save" style="height:36px;padding:0 16px;border:1px solid rgba(255,120,100,.5);border-radius:10px;' +
              'background:linear-gradient(180deg,#c3271c,#8c1410);color:#fff;cursor:pointer;font-family:inherit;font-size:13px;font-weight:800;' +
              'box-shadow:0 2px 8px rgba(195,39,28,.35)">Vista á dagskrá</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    const name = document.getElementById('vd-name');
    if (name) {
      name.focus();
      // Villuboðin hverfa við innslátt — beint á DOM svo fókus haldist.
      name.addEventListener('input', () => {
        const e = document.getElementById('vd-err');
        if (e && e.style.display !== 'none') { e.style.display = 'none'; name.style.borderColor = '#e0e2e7'; }
      });
    }
  }

  function readForm() {
    const v = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    return { date: v('vd-date'), time: v('vd-time'), name: v('vd-name'), type: v('vd-type'), note: v('vd-note') };
  }

  function saveJob() {
    const f = readForm();
    if (!f.name.trim()) {
      const e = document.getElementById('vd-err'), n = document.getElementById('vd-name');
      if (e) e.style.display = 'block';
      if (n) { n.style.borderColor = ACCENT; n.focus(); }
      return;
    }
    const date = f.date || fmt(new Date());
    const job = {
      id: 'vd' + Date.now() + Math.random().toString(36).slice(2, 6),
      date, time: f.time || '09:00', name: f.name.trim(), type: f.type || 'Annað', note: (f.note || '').trim()
    };
    // Hoppa á vikuna sem verkið lenti á svo notandinn sjái það strax.
    const target = monday(new Date(date + 'T12:00:00'));
    if (!isNaN(target)) state.offset = Math.round((target - monday(new Date())) / (7 * 864e5));
    state.modal = false;
    renderModal();
    persist(state.jobs.concat([job]));
  }

  // ── atburðir ─────────────────────────────────────────────────────────────
  // NB: sér-nafnrými `data-vd` (EKKI `data-act`). Vikuræman situr inni í
  // #view-verkbord og #231 hlerar öll `[data-act]` þar — „add"/„del" hefðu
  // annars kveikt á hraðskráningu og eyðingu á máli í borðinu sjálfu.
  document.addEventListener('click', ev => {
    const hit = ev.target.closest('[data-vd]');
    if (!hit) return;
    const act = hit.getAttribute('data-vd');
    // Verk-flísin og gluggakassinn eru „gegnheilir" — smellur inni í þeim má
    // ekki falla í gegn á daginn undir eða á bakgrunn gluggans.
    const stop = ev.target.closest('[data-vd-stop]');
    const throughSolid = stop && hit.contains(stop);

    if (act === 'prev')  { state.offset--; render(); return; }
    if (act === 'next')  { state.offset++; render(); return; }
    if (act === 'today') { state.offset = 0; render(); return; }
    if (act === 'add')   { ev.stopPropagation(); openModal(fmt(new Date())); return; }
    if (act === 'save')  { ev.preventDefault(); saveJob(); return; }
    if (act === 'del')   { ev.stopPropagation(); persist(state.jobs.filter(j => j && j.id !== hit.getAttribute('data-vd-id'))); return; }
    if (act === 'close') { if (!throughSolid) closeModal(); return; }
    if (act === 'day')   { if (!throughSolid) openModal(hit.getAttribute('data-vd-date')); }
  });

  document.addEventListener('keydown', ev => {
    if (!state.modal) return;
    if (ev.key === 'Escape') { closeModal(); return; }
    if (ev.key === 'Enter' && document.getElementById(HOST_ID) &&
        document.getElementById(HOST_ID).contains(document.activeElement)) {
      ev.preventDefault(); saveJob();
    }
  });

  // ── ræsing ───────────────────────────────────────────────────────────────
  function mount() {
    if (!document.getElementById(SLOT_ID)) return;
    state.jobs = readJobs();
    render();
  }

  // Stillingar hlaðast eftir á (og breytast þegar annað tæki vistar) → endurteikna.
  if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(mount);

  window.Vikudagskra = { mount, render, open: openModal };

  // Borðið kann að vera teiknað ÁÐUR en þessi skrá er lesin: #231 og #303 eru
  // bæði `defer` og #231 situr ~50 script-tögum framar, svo `renderAll()` hafði
  // þegar keyrt og séð `window.Vikudagskra === undefined` — reiturinn stóð eftir
  // tómur og ekkert kveikti á honum aftur. Því mountum við okkur sjálf hér, og
  // aftur við `load` fyrir seinni teikningu borðsins.
  mount();
  window.addEventListener('load', mount);

  console.log('[vikudagskra] installed');
})();
