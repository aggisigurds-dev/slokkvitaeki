/* === BRUNAKERFI YFIRLIT — ný sjálfstæð yfirlitssíða (2026-07-20) ===
 *
 * Rík yfirlitssíða fyrir brunakerfis-þjónustu, að fyrirmynd „Fyrirtæki í þjónustu"
 * (patch 153/187) EN les AÐEINS hreinu, nýju brunakerfi-gögnin: `customer_documents`
 * með doc_type='brunakerfi' (úttektarskýrslurnar sem brunakerfi-gather safnaði) tengt
 * við `fyrirtaeki`. Snertir hvorki gömlu Brunakerfisþjónustu-síðuna (147) né 153.
 *
 * View `view-brunakerfi-yfirlit`, slug `#brunayfirlit`, hliðarstiku-hnappur „🔥 Brunakerfi yfirlit".
 * Sortanleg dálkahaus, ár-dálkar ('22–'26 = skýrsla þess árs), skoðunarmánuður,
 * leit, síur, tölfluspjöld. Public: window.BrunakerfiYfirlit = { open, reload }.
 */
(() => {
  if (window.__bkYfirlitInstalled) return;
  window.__bkYfirlitInstalled = true;

  const VIEW_ID = 'view-brunakerfi-yfirlit';
  const NAV_KEY = 'brunayfirlit';
  const NOW = new Date().getFullYear();
  const YEARS = [];
  for (let y = NOW - 3; y <= NOW; y++) YEARS.push(String(y));   // t.d. 2023..2026
  const MON = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'];
  const MON_FULL = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];

  const state = { sortCol: 'name', sortDir: 'asc', search: '', month: 0, filter: 'all',
    // ☰ þétt / ▤ ítarlegt (ósk Agnars 2026-07-21 — símarnir sýndu ~8 raðir)
    // Sjálfgefið ÞÉTT á síma-breidd (uppsetta Brunakerfi-appið opnast í símaham),
    // ÍTARLEGT á tölvu — vistað val (bky_view) yfirskrifar alltaf.
    view: (function () { var d = (typeof window !== 'undefined' && window.innerWidth && window.innerWidth <= 768) ? 'thett' : 'full'; try { return localStorage.getItem('bky_view') || d; } catch (_) { return d; } })() };
  let _rows = null, _loading = false;

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function driveUrl(id) { return id && String(id).indexOf('sb:') !== 0 ? 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view' : ''; }
  function storageUrl(p) {
    if (!p) return '';
    const base = String(window.SUPABASE_URL || '').replace(/\/+$/, ''); if (!base) return '';
    const s = String(p).replace(/^\/+/, ''); const i = s.indexOf('/'); if (i < 1) return '';
    return base + '/storage/v1/object/public/' + s.slice(0, i) + '/' + s.slice(i + 1).split('/').map(encodeURIComponent).join('/');
  }
  async function fetchAll(mk) {
    if (window.DB && DB.fetchAll) return DB.fetchAll(mk, 1000);
    const out = []; let from = 0; for (;;) { const r = await mk(from, from + 999); const d = (r && r.data) || []; out.push(...d); if (d.length < 1000) break; from += 1000; } return out;
  }

  // Fyrirtæki í brunakerfis-þjónustu skv. AppSettings-kortinu (líka þau sem eiga
  // enga skýrslu enn → „Nýtt" bíður fyrstu skoðunar).
  function serviceMapIds() {
    try {
      const m = (window.AppSettings && AppSettings.path && AppSettings.path('brunakerfi_customers')) || {};
      return Object.keys(m).filter(k => !!m[k]).map(k => +k).filter(Boolean);
    } catch (_) { return []; }
  }

  // ── gögn ────────────────────────────────────────────────────────────────────
  async function load() {
    const sb = SB(); if (!sb) return [];
    const docs = await fetchAll((from, to) => sb.from('customer_documents')
      .select('fyrirtaeki_id,year,drive_file_id,storage_path,doc_date')
      .eq('doc_type', 'brunakerfi').not('fyrirtaeki_id', 'is', null).range(from, to));
    const mapIds = serviceMapIds();
    const ids = [...new Set([...docs.map(d => d.fyrirtaeki_id), ...mapIds].filter(Boolean))];
    let cos = [];
    if (ids.length) {
      const chunks = [];
      for (let i = 0; i < ids.length; i += 300) chunks.push(ids.slice(i, i + 300));
      for (const ch of chunks) {
        const r = await sb.from('fyrirtaeki').select('id,nafn,heimilisfang,simi,farsimi,netfang,"tengiliður"').in('id', ch);
        cos.push(...((r && r.data) || []));
      }
    }
    const coMap = {}; cos.forEach(c => coMap[c.id] = c);
    const byCo = {};
    docs.forEach(d => {
      const c = coMap[d.fyrirtaeki_id]; if (!c) return;
      const r = byCo[c.id] || (byCo[c.id] = { id: c.id, nafn: c.nafn || '', address: c.heimilisfang || '',
        simi: c.simi || c.farsimi || '', netfang: c.netfang || '', tengilidur: c['tengiliður'] || '',
        years: {}, months: {}, count: 0, latest: 0, latestMonth: 0 });
      const y = String(d.year || '');
      if (!y) return;
      const url = driveUrl(d.drive_file_id) || storageUrl(d.storage_path);
      if (!r.years[y] || url) r.years[y] = url || r.years[y] || '#';
      r.count++;
      const m = d.doc_date ? (new Date(d.doc_date).getUTCMonth() + 1) : 0;
      if (m) r.months[y] = m;
      if (+y > r.latest) { r.latest = +y; r.latestMonth = m || r.months[y] || 0; }
    });
    // Þjónustu-fyrirtæki sem eiga ENGA skýrslu enn → bæta við sem „Nýtt".
    mapIds.forEach(id => {
      if (byCo[id] || !coMap[id]) return;
      const c = coMap[id];
      byCo[id] = { id: c.id, nafn: c.nafn || '', address: c.heimilisfang || '', simi: c.simi || c.farsimi || '',
        netfang: c.netfang || '', tengilidur: c['tengiliður'] || '', years: {}, months: {}, count: 0, latest: 0, latestMonth: 0 };
    });
    const out = Object.values(byCo);
    out.forEach(r => { r.isNew = r.count === 0; });   // engin skýrsla = bíður fyrstu skoðunar
    return out;
  }

  // ── röðun ───────────────────────────────────────────────────────────────────
  const CMP = {
    name: (a, b) => (a.nafn || '').localeCompare(b.nafn || '', 'is'),
    address: (a, b) => (a.address || '').localeCompare(b.address || '', 'is'),
    tengilidur: (a, b) => (a.tengilidur || '').localeCompare(b.tengilidur || '', 'is'),
    latest: (a, b) => (a.latest - b.latest) || (a.latestMonth - b.latestMonth),
    count: (a, b) => a.count - b.count,
    month: (a, b) => (a.latestMonth || 99) - (b.latestMonth || 99),
  };
  function filteredSorted() {
    let arr = (_rows || []).slice();
    const q = state.search.trim().toLowerCase();
    if (q) arr = arr.filter(r => (r.nafn + ' ' + r.address + ' ' + r.tengilidur + ' ' + r.simi + ' ' + r.netfang).toLowerCase().indexOf(q) !== -1);
    else if (state.month >= 1 && state.month <= 12) arr = arr.filter(r => r.latestMonth === state.month);
    if (state.filter === 'done') arr = arr.filter(r => !!r.years[String(NOW)]);
    else if (state.filter === 'pending') arr = arr.filter(r => !r.years[String(NOW)] && !r.isNew);
    else if (state.filter === 'new') arr = arr.filter(r => r.isNew);
    const cmp = CMP[state.sortCol] || CMP.name;
    arr.sort(cmp);
    if (state.sortDir === 'desc') arr.reverse();
    return arr;
  }

  // ── teikning ────────────────────────────────────────────────────────────────
  function yearCell(r, y) {
    const cmp = state.view === 'thett';
    const tdPad = cmp ? '3px 2px' : '6px 4px';
    const pill = cmp ? 'padding:2px 6px;font-size:10.5px' : 'padding:3px 9px;font-size:12px';
    const dotSz = cmp ? '6px' : '7px';
    const url = r.years[y];
    const yy = y.slice(-2);
    if (url) {
      return '<td class="_bky-yr" style="text-align:center;padding:' + tdPad + '"><a href="' + esc(url) + '" target="_blank" rel="noopener" title="Opna skýrslu ' + y + '" ' +
        'style="display:inline-flex;align-items:center;gap:4px;' + pill + ';border-radius:99px;background:#DBEEE3;border:1px solid rgba(28,143,96,.35);color:#0F5E3F;font-weight:700;text-decoration:none">' +
        '<span style="width:' + dotSz + ';height:' + dotSz + ';border-radius:50%;background:#1C8F60;display:inline-block"></span>' + yy + '</a></td>';
    }
    const due = (y === String(NOW));
    const bg = due ? '#FBEAC6' : '#F0EFEA', bd = due ? 'rgba(217,146,6,.5)' : '#D5D8DE', col = due ? '#8A5C04' : '#6B7280';
    const dot = due ? 'background:#D99206' : 'box-shadow:inset 0 0 0 1.5px #C7CAD0';
    return '<td class="_bky-yr" style="text-align:center;padding:' + tdPad + '"><span title="' + (due ? 'Vantar skoðun ' + y : 'Engin skýrsla ' + y) + '" ' +
      'style="display:inline-flex;align-items:center;gap:4px;' + pill + ';border-radius:99px;background:' + bg + ';border:1px solid ' + bd + ';color:' + col + ';font-weight:700">' +
      '<span style="width:' + dotSz + ';height:' + dotSz + ';border-radius:50%;display:inline-block;' + dot + '"></span>' + yy + '</span></td>';
  }
  function sortTh(label, col, align, cls) {
    const active = state.sortCol === col;
    const arrow = active ? (state.sortDir === 'asc' ? ' ▲' : ' ▼') : ' ⇅';
    return '<th class="_bky-sort' + (cls === 'wcol' ? ' _bky-wcol' : '') + '" data-sort="' + col + '" style="text-align:' + (align || 'left') + ';padding:9px 10px;cursor:pointer;white-space:nowrap;color:#475569;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;user-select:none">' +
      esc(label) + '<span style="opacity:' + (active ? '1' : '.4') + ';font-weight:600">' + arrow + '</span></th>';
  }

  function render() {
    const root = document.getElementById('_bky-root'); if (!root) return;
    if (_loading && !_rows) { root.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8">Hleð brunakerfi-gögnum…</div>'; return; }
    const rows = filteredSorted();
    const all = _rows || [];
    const doneNow = all.filter(r => !!r.years[String(NOW)]).length;
    const totalReports = all.reduce((s, r) => s + r.count, 0);
    const newCount = all.filter(r => r.isNew).length;

    // mánaðar-teljarar
    const mc = {}; all.forEach(r => { if (r.latestMonth) mc[r.latestMonth] = (mc[r.latestMonth] || 0) + 1; });

    const card = (label, val, sub, tone) => {
      const tones = { blue: ['#1e3a8a', '#3b82f6'], green: ['#14532d', '#22c55e'], amber: ['#713f12', '#eab308'], grey: ['#1f2937', '#6b7280'], purple: ['#4c1d95', '#a855f7'] };
      const [bg, ac] = tones[tone] || tones.grey;
      return '<div style="flex:1 1 160px;min-width:150px;background:linear-gradient(160deg,' + bg + ',#0b0e13);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px 16px;box-shadow:0 6px 18px -8px rgba(0,0,0,.5)">' +
        '<div style="font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:' + ac + '">' + esc(label) + '</div>' +
        '<div style="font-size:26px;font-weight:800;color:#fff;margin-top:2px;line-height:1">' + esc(val) + '</div>' +
        (sub ? '<div style="font-size:11px;color:#94a3b8;margin-top:4px">' + esc(sub) + '</div>' : '') + '</div>';
    };

    const chip = (key, label) => '<button class="_bky-filter" data-f="' + key + '" type="button" style="padding:6px 12px;border-radius:99px;border:1px solid ' +
      (state.filter === key ? '#0f766e;background:#0f766e;color:#fff' : '#cbd5e1;background:#fff;color:#334155') + ';font:inherit;font-size:12.5px;font-weight:700;cursor:pointer">' + esc(label) + '</button>';
    const monthChip = (m, label) => {
      const on = state.month === m;
      const n = m === 0 ? all.length : (mc[m] || 0);
      return '<button class="_bky-month" data-m="' + m + '" type="button" style="padding:5px 10px;border-radius:8px;border:1px solid ' +
        (on ? '#0f766e;background:#0f766e;color:#fff' : '#d7dce4;background:#fff;color:#475569') + ';font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">' +
        esc(label) + (n ? ' <span style="opacity:.7;font-weight:600">' + n + '</span>' : '') + '</button>';
    };

    root.innerHTML =
      '<div style="max-width:1280px;margin:0 auto;padding:18px 20px 40px">' +
        '<div style="display:flex;align-items:center;gap:12px;margin:6px 0 14px">' +
          '<div style="font-size:22px">🔥</div>' +
          '<div><div style="font-size:20px;font-weight:800;color:#0f172a">Brunakerfi — yfirlit</div>' +
          '<div style="font-size:12.5px;color:#64748b">' + all.length + ' fyrirtæki í brunakerfis-þjónustu · ' + totalReports + ' úttektarskýrslur</div></div></div>' +

        // tölfluspjöld
        '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px">' +
          card('Fyrirtæki', all.length, 'í brunakerfis-þjónustu', 'blue') +
          card('Skýrslur alls', totalReports, 'úttektarskýrslur á skrá', 'grey') +
          card('Búið ' + NOW, doneNow, Math.round(doneNow / (all.length || 1) * 100) + '% af árinu', 'green') +
          card('Nýtt', newCount, 'bíða fyrstu skoðunar', 'purple') +
        '</div>' +

        // stjórntæki
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">' +
          chip('all', 'Allt') + chip('done', '✅ Búið ' + NOW) + chip('pending', '⏳ Eftir ' + NOW) + chip('new', '🆕 Nýtt') +
          '<span style="display:inline-flex;border:1px solid #cbd5e1;border-radius:99px;overflow:hidden">' +
            '<button class="_bky-viewbtn" data-v="thett" type="button" style="padding:6px 11px;border:0;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;' + (state.view === 'thett' ? 'background:#0f766e;color:#fff' : 'background:#fff;color:#334155') + '">☰ Þétt</button>' +
            '<button class="_bky-viewbtn" data-v="full" type="button" style="padding:6px 11px;border:0;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;' + (state.view !== 'thett' ? 'background:#0f766e;color:#fff' : 'background:#fff;color:#334155') + '">▤ Ítarlegt</button>' +
          '</span>' +
          '<input class="_bky-search" type="search" placeholder="🔍 Leita (nafn · heimilisfang · tengiliður)…" value="' + esc(state.search) + '" ' +
            'style="flex:1 1 200px;min-width:160px;margin-left:auto;padding:8px 12px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;font:inherit;font-size:13px">' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">' +
          monthChip(0, 'Allir mán.') + MON_FULL.map((m, i) => monthChip(i + 1, m.slice(0, 3))).join('') +
        '</div>' +

        // tafla — lárétt skrun bundið í þennan kassa (max-width:100% svo síðan sjálf
        // renni ekki lárétt á síma; -webkit-overflow-scrolling fyrir mjúkt skrun).
        '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:14px;overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%">' +
          '<table class="_bky-tbl' + (state.view === 'thett' ? ' _bky-cmp' : '') + '" style="width:100%;border-collapse:collapse;min-width:820px">' +
            '<thead><tr style="border-bottom:1px solid #e8ecf1">' +
              sortTh('Fyrirtæki', 'name') +
              YEARS.map(y => '<th class="_bky-yr" style="text-align:center;padding:9px 4px;color:#475569;font-size:11px;font-weight:800">' + "'" + y.slice(-2) + '</th>').join('') +
              sortTh('Heimilisfang', 'address', 'left', 'wcol') +
              // Sími vék fyrir Mánuði (ósk Agnars 2026-07-21): mánuður síðustu
              // skoðunar segir hvenær 12 mánuðirnir eru liðnir. Síminn lifir á
              // fyrirtækjasíðunni (hringja-chippan).
              sortTh('Mánuður', 'month', 'center', 'wcol') +
              sortTh('Síðast', 'latest', 'center', 'wcol') +
              sortTh('Skjöl', 'count', 'center') +
            '</tr></thead><tbody>' +
            (rows.length ? rows.map(rowHtml).join('') :
              '<tr><td colspan="' + (5 + YEARS.length) + '" style="padding:30px;text-align:center;color:#94a3b8;font-style:italic">Engin fyrirtæki passa við síuna.</td></tr>') +
            '</tbody></table>' +
        '</div>' +
        '<div style="margin-top:10px;font-size:11.5px;color:#64748b">Grænn = skýrsla þess árs (smelltu til að opna) · gulur = vantar ' + NOW + ' · grár = engin skýrsla það ár.</div>' +
      '</div>';

    wire(root);
  }

  function rowHtml(r) {
    const cmp = state.view === 'thett';
    const last = r.latest ? (r.latest + (r.latestMonth ? ' · ' + MON[r.latestMonth - 1] : '')) : '—';
    // Mánaðardálkurinn: mánuður síðustu skoðunar. RAUTT+feitletrað þegar 12
    // mánuðirnir eru liðnir (mánuðurinn kominn/framhjá og engin skýrsla í ár).
    const nowMon = new Date().getMonth() + 1;
    const due = !r.years[String(NOW)] && r.latestMonth && r.latestMonth <= nowMon && !r.isNew;
    const monCell = r.latestMonth
      ? '<span style="' + (due ? 'color:#b91c1c;font-weight:800' : 'color:#0f172a;font-weight:600') + '"' +
        (due ? ' title="12 mánuðir liðnir — skoðun komin á tíma"' : '') + '>' + esc(MON[r.latestMonth - 1]) + (due ? ' ⚠' : '') + '</span>'
      : '<span style="color:#94a3b8">—</span>';
    const newBadge = r.isNew ? '<span title="Bíður fyrstu skoðunar" style="margin-left:7px;padding:1px 7px;border-radius:99px;background:#7c3aed;color:#fff;font-size:9.5px;font-weight:800;letter-spacing:.03em;vertical-align:middle">NÝTT</span>' : '';
    if (cmp) {
      // ☰ Þétt: ein lína per fyrirtæki — nafn + árpunktar + skjöl; ekkert netfang,
      // engin mobile-fold, 📋-hnappurinn falinn með CSS (röðin opnar síðuna).
      return '<tr class="_bky-row" data-id="' + r.id + '" style="border-bottom:1px solid #f1f5f9;cursor:pointer">' +
        '<td style="padding:4px 8px;max-width:0;min-width:120px"><div style="font-weight:700;color:#0f172a;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.nafn) + newBadge + '</div></td>' +
        YEARS.map(y => yearCell(r, y)).join('') +
        '<td class="_bky-wcol" style="padding:4px 8px;color:#475569;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:170px">' + esc(r.address) + '</td>' +
        '<td class="_bky-wcol" style="padding:4px 8px;text-align:center;font-size:11px;white-space:nowrap">' + monCell + '</td>' +
        '<td class="_bky-wcol" style="padding:4px 8px;text-align:center;color:#0f172a;font-size:11px;white-space:nowrap">' + esc(last) + '</td>' +
        '<td style="padding:4px 8px;text-align:center;color:#0f172a;font-size:12px;font-weight:700">' + r.count + '</td>' +
      '</tr>';
    }
    // Mobile-fold: heimilisfang · síðasti skoðunarmánuður undir nafninu á mjóum
    // skjá (breiðu dálkarnir faldir). Sími/tengiliður lifa á fyrirtækjasíðunni.
    const mobInfo = [r.address, r.latestMonth ? 'síðast ' + MON[r.latestMonth - 1] + ' ' + (r.latest || '') : ''].filter(Boolean).join(' · ');
    return '<tr class="_bky-row" data-id="' + r.id + '" style="border-bottom:1px solid #f1f5f9;cursor:pointer">' +
      '<td style="padding:9px 10px"><div style="font-weight:700;color:#0f172a;font-size:13px">' + esc(r.nafn) + newBadge + '</div>' +
        (r.netfang ? '<div style="font-size:10.5px;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;max-width:220px;white-space:nowrap">' + esc(r.netfang) + '</div>' : '') +
        (mobInfo ? '<div class="_bky-mob" style="font-size:10.5px;color:#64748b;margin-top:2px;line-height:1.35">' + esc(mobInfo) + '</div>' : '') + '</td>' +
      YEARS.map(y => yearCell(r, y)).join('') +
      '<td class="_bky-wcol" style="padding:9px 10px;color:#475569;font-size:12px">' + esc(r.address) + '</td>' +
      '<td class="_bky-wcol" style="padding:9px 10px;text-align:center;font-size:12.5px;white-space:nowrap">' + monCell + '</td>' +
      '<td class="_bky-wcol" style="padding:9px 10px;text-align:center;color:#0f172a;font-size:12px;white-space:nowrap">' + esc(last) + '</td>' +
      '<td style="padding:9px 10px;text-align:center;color:#0f172a;font-size:13px;font-weight:700">' + r.count + '</td>' +
    '</tr>';
  }

  function wire(root) {
    root.querySelectorAll('._bky-sort').forEach(th => th.addEventListener('click', () => {
      const col = th.dataset.sort;
      if (state.sortCol === col) state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      else { state.sortCol = col; state.sortDir = (col === 'name' || col === 'address' || col === 'tengilidur') ? 'asc' : 'desc'; }
      render();
    }));
    root.querySelectorAll('._bky-filter').forEach(b => b.addEventListener('click', () => { state.filter = b.dataset.f; render(); }));
    root.querySelectorAll('._bky-month').forEach(b => b.addEventListener('click', () => { state.month = +b.dataset.m; render(); }));
    root.querySelectorAll('._bky-viewbtn').forEach(b => b.addEventListener('click', () => {
      state.view = b.dataset.v;
      try { localStorage.setItem('bky_view', state.view); } catch (_) {}
      render();
    }));
    const s = root.querySelector('._bky-search');
    if (s) s.addEventListener('input', () => { state.search = s.value; const p = s.selectionStart; render(); const n = document.querySelector('._bky-search'); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (_) {} } });
    root.querySelectorAll('._bky-row').forEach(tr => tr.addEventListener('click', e => {
      if (e.target.closest('a')) return;   // ár-hlekkur opnar sjálfur
      const id = tr.dataset.id;
      if (window._openCompanySafe) window._openCompanySafe(+id);
      else if (window.App && App.switchView) { App.switchView('companies'); }
    }));
  }

  async function reload() {
    if (_loading) return;
    _loading = true; render();
    try { _rows = await load(); } catch (e) { _rows = _rows || []; console.warn('[bky] load', e); }
    _loading = false; render();
  }

  // ── view + wiring (eins og 268) ─────────────────────────────────────────────
  function ensureView() {
    let v = document.getElementById(VIEW_ID); if (v) return v;
    v = document.createElement('div'); v.id = VIEW_ID; v.className = 'view';
    v.style.cssText = 'display:none;min-height:100vh;background:#eef1f5';
    // Sími-fyrst: á mjóum skjá fela breiðu dálkana (heimilisfang/tengiliður/sími/
    // síðast) og sýna þá í staðinn undir fyrirtækjanafninu → engin lárétt skrun.
    v.innerHTML =
      '<style>' +
        '#' + VIEW_ID + ' ._bky-mob{display:none}' +
        // ☰ Þétt: 📋/📝-hnappurinn (patch 273) víkur — röðin sjálf opnar síðuna
        '#' + VIEW_ID + ' ._bky-cmp ._bks-btn{display:none!important}' +
        '@media (max-width:900px){' +
          '#' + VIEW_ID + ' ._bky-wcol{display:none!important}' +
          '#' + VIEW_ID + ' table._bky-tbl{min-width:0!important}' +
          '#' + VIEW_ID + ' ._bky-mob{display:block}' +
          '#' + VIEW_ID + ' ._bky-yr{padding:6px 2px!important}' +
        '}' +
      '</style>' +
      '<div id="_bky-root"></div>';
    document.body.appendChild(v);
    return v;
  }
  function open() {
    ensureView();
    document.querySelectorAll('.view,[id^="view-"]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID); v.style.display = 'block'; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    try { localStorage.setItem('lastView', NAV_KEY); } catch (_) {}
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    reload();
  }
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 600); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    // KLÓNA innfædda hnappinn (Brunakerfisþjónusta) svo bygging/stílun (SVG-tákn,
    // data-ico-norm, bil) sé NÁKVÆMLEGA eins — eigin markup skekkti hnappinn.
    const ref = nav.querySelector('[data-view="brunakerfi"]') || nav.querySelector('.vnav-btn[data-view]') || nav.querySelector('.vnav-btn');
    if (!ref) { setTimeout(injectSidebar, 600); return; }
    const btn = ref.cloneNode(true);
    btn.setAttribute('data-view', NAV_KEY);
    btn.classList.remove('active');
    btn.removeAttribute('style');   // ekki erfa `order` frá ref — látum patch 68 raða
    // Skipta út sýnilega textanum (halda tákninu úr appinu).
    const tn = [...btn.childNodes].reverse().find(n => n.nodeType === 3 && n.textContent.trim());
    if (tn) tn.textContent = ' Brunakerfi yfirlit';
    else { const s = [...btn.querySelectorAll('span')].reverse().find(x => x.textContent.trim()); if (s) s.textContent = 'Brunakerfi yfirlit'; else btn.appendChild(document.createTextNode(' Brunakerfi yfirlit')); }
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else open(); });
    if (ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling);
    else nav.insertBefore(btn, nav.firstChild);
  }
  function patchSwitchView() {
    if (!window.App) { setTimeout(patchSwitchView, 150); return; }
    if (window.App._bkyPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { open(); return; }
      const r = orig ? orig.apply(this, arguments) : undefined;
      try { const v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'none'; v.classList.remove('active'); } } catch (_) {}
      return r;
    };
    for (const k in orig) { try { window.App.switchView[k] = orig[k]; } catch (_) {} }
    window.App._bkyPatched = true;
  }
  function boot() {
    injectSidebar(); setTimeout(injectSidebar, 1500); patchSwitchView();
    if ((location.hash || '').replace(/^#/, '') === NAV_KEY) setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); else open(); }, 300);
    window.addEventListener('hashchange', () => { if ((location.hash || '').replace(/^#/, '') === NAV_KEY) open(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.BrunakerfiYfirlit = { open, reload };
  console.log('[patch-272] Brunakerfi yfirlit installed');
})();
/* === END BRUNAKERFI YFIRLIT === */
