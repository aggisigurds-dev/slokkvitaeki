/* === BAKENDI — gagnalíkans-stjórnborð v1 (231) =============================
 *
 * Admin / "backend" síða yfir gagnalíkanið. Fimm flipar:
 *   📊 Yfirlit       — talningar per töflu + gagnaheilsa (vantar kt, ótengt FK)
 *   🧯 Úttæki        — gagnaættfræði: client-texti → customer_base_id / fyrirtæki
 *   🏢 Rekstrarfélög — rollup úr customers_base.rekstrarfelag + úttækjafjöldi
 *   🗺️ Skema         — gagnalíkanið + tengsl (FK), með lifandi röðatölum
 *   🛠️ Endurhönnun   — þekkt vandamál + tillögur + LIFANDI „vantar kennitölu"
 *
 * Gögn koma úr read-only Postgres-view-um (búin til 2026-06-22):
 *   v_bakendi_overview · v_bakendi_uttaeki_clients ·
 *   v_bakendi_rekstrarfelog · v_bakendi_missing_kt
 * (öll með SELECT-rétti á anon). Framendinn gerir bara SB.from(view).select('*').
 *
 * Víravirkjun eins og kerfi-registry (221) / beiðnir (178): nýr view-bakendi
 * div, hnappur klónaður í hliðarstikuna (guardian 189 dedup-ar á data-view),
 * App.switchView gripið fyrir 'bakendi' svo deep-link #bakendi (patch 218) virki.
 * ========================================================================== */
(() => {
  if (window.__bakendiInstalled) return;
  window.__bakendiInstalled = true;

  const VIEW_ID = 'view-bakendi';
  const NAV_KEY = 'bakendi';

  // ── helpers ────────────────────────────────────────────────────────────────
  function getSB() { return (window.DB && window.DB.sb) || window.__vdaSB || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtNum(n) { return (Number(n) || 0).toLocaleString('is-IS'); }
  function pct(part, whole) { return whole ? Math.round((Number(part) || 0) / whole * 100) : 0; }
  function fmtDate(d) {
    if (!d) return '—';
    const s = String(d).slice(0, 10), p = s.split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : s;
  }

  const state = {
    tab: 'yfirlit', loading: false, loaded: false, err: null,
    overview: null, clients: [], rekstrar: [], missing: [],
    clientFilter: 'all', clientQ: '', missingQ: ''
  };

  const TABS = [
    { k: 'yfirlit',       label: '📊 Yfirlit' },
    { k: 'uttektir',      label: '🧯 Úttæki' },
    { k: 'rekstrarfelog', label: '🏢 Rekstrarfélög' },
    { k: 'skema',         label: '🗺️ Skema' },
    { k: 'endurhonnun',   label: '🛠️ Endurhönnun' }
  ];

  // Static lýsing á gagnalíkaninu fyrir Skema-flipann. count = lykill í overview.
  const SCHEMA = [
    { t: 'customers_base', count: 'customers_base', root: true,
      desc: 'Sameinuð grunnskrá viðskiptavina (rótin). vidskiptavinir + fyrirtaeki sameinast hingað.',
      cols: ['id', 'kennitala', 'nafn', 'rekstrarfelag', 'source_v_id → vidskiptavinir', 'source_f_id → fyrirtaeki'] },
    { t: 'fyrirtaeki', count: 'fyrirtaeki',
      desc: 'Fyrirtæki / húsfélög. Tengist rótinni um customer_base_id.',
      cols: ['id', 'nafn', 'kennitala', 'customer_base_id → customers_base', 'tengiliður ⚠', 'tengilidur ⚠', 'status', 'er_i_thjonustu', 'deleted_at'],
      warn: 'Tveir tengiliðadálkar: „tengiliður" (með ð) OG „tengilidur" (ascii). Sameina í einn.' },
    { t: 'vidskiptavinir', count: 'vidskiptavinir',
      desc: 'Eldra einstaklings-viðskiptavinalag. Tengist rótinni um customer_base_id.',
      cols: ['id', 'kennitala', 'nafn', 'customer_base_id → customers_base', 'deleted_at'] },
    { t: 'uttaeki', count: 'uttaeki',
      desc: 'Slökkvitæki / búnaður. Geymir BÆÐI frjálsan „client" texta OG customer_base_id FK.',
      cols: ['id', 'serial', 'type', 'client (texti) ⚠', 'customer_base_id → customers_base', 'last_insp', 'next_insp', 'status', 'custody_status'],
      warn: '„client" er frjáls texti — sjá Úttæki-flipann fyrir hve margar raðir tengjast ekki rótinni.' },
    { t: 'solur', count: 'solur',
      desc: 'Sölur (POS / reikningar).',
      cols: ['id', 'num', 'customer_nafn', 'customer_id', 'customer_base_id', 'customer_kt', 'linur (jsonb)', 'samtals'] },
    { t: 'verkbeidnir', count: 'verkbeidnir',
      desc: 'Verkbeiðnir.',
      cols: ['id', 'num', 'customer (texti)', 'status', 'verd'] },
    { t: 'lanstaeki', count: 'lanstaeki',
      desc: 'Lánstæki.',
      cols: ['id', 'serial', 'client (texti)', 'status'] }
  ];

  // ── data load ──────────────────────────────────────────────────────────────
  async function load() {
    const SB = getSB();
    if (!SB) { state.err = 'Enginn gagnagrunnur tengdur (DB.sb vantar).'; state.loaded = true; render(); return; }
    state.loading = true; state.err = null; render();
    try {
      const [ov, cl, rk, mk] = await Promise.all([
        SB.from('v_bakendi_overview').select('*').single(),
        SB.from('v_bakendi_uttaeki_clients').select('*'),
        SB.from('v_bakendi_rekstrarfelog').select('*'),
        SB.from('v_bakendi_missing_kt').select('*')
      ]);
      if (ov.error) throw ov.error;
      state.overview = ov.data || {};
      state.clients = cl.data || [];
      state.rekstrar = rk.data || [];
      state.missing = mk.data || [];
    } catch (e) {
      state.err = (e && e.message) || String(e);
    }
    state.loading = false; state.loaded = true; render();
  }

  // ── small computed helpers ───────────────────────────────────────────────────
  function stateCounts() {
    const c = { all: 0, linked: 0, nameonly: 0, orphan: 0 };
    (state.clients || []).forEach(r => {
      c.all++;
      if (r.link_state === 'linked') c.linked++;
      else if (r.link_state === 'name-only') c.nameonly++;
      else c.orphan++;
    });
    return c;
  }
  function badge(s) {
    const m = ({
      'linked':    ['#f0fdf4', '#bbf7d0', '#15803d', '🟢 Tengd'],
      'name-only': ['#fffbeb', '#fde68a', '#a16207', '🟡 Nafn-match'],
      'orphan':    ['#fef2f2', '#fecaca', '#b91c1c', '🔴 Munaðarlaus']
    })[s] || ['#f1f5f9', '#cbd5e1', '#475569', s];
    return '<span class="bk-badge" style="background:' + m[0] + ';border-color:' + m[1] + ';color:' + m[2] + '">' + m[3] + '</span>';
  }
  function sevStyle(sev) {
    const m = ({
      red:   ['#fef2f2', '#fecaca', '#b91c1c'],
      amber: ['#fffbeb', '#fde68a', '#a16207'],
      info:  ['#eff6ff', '#bfdbfe', '#1d4ed8'],
      ok:    ['#f0fdf4', '#bbf7d0', '#15803d']
    })[sev] || ['#f1f5f9', '#cbd5e1', '#475569'];
    return 'background:' + m[0] + ';border-color:' + m[1] + ';color:' + m[2];
  }
  function openCompany(id) {
    if (window.App && App.switchView) App.switchView('companies');
    setTimeout(() => { try { if (window.Companies && Companies.openDetail) Companies.openDetail(+id); } catch (_) {} }, 60);
  }

  // ── tab renderers (return HTML strings) ──────────────────────────────────────
  function tabYfirlit() {
    const o = state.overview || {}, lc = stateCounts();
    const stat = (n, l) => '<div class="bk-stat"><div class="n">' + fmtNum(n) + '</div><div class="l">' + l + '</div></div>';
    const stats = [
      stat(o.uttaeki, 'Úttæki'),
      stat(o.fyrirtaeki, 'Fyrirtæki'),
      stat(o.vidskiptavinir, 'Viðskiptavinir'),
      stat(o.customers_base, 'Grunnskrá (rót)'),
      stat(o.rekstrarfelog, 'Rekstrarfélög'),
      stat(o.solur, 'Sölur'),
      stat(o.verkbeidnir, 'Verkbeiðnir'),
      stat(o.lanstaeki, 'Lánstæki')
    ].join('');
    const hc = (sev, n, l, x, goto) =>
      '<div class="bk-hcard"' + (goto ? ' data-goto="' + goto + '"' : '') +
      ' style="' + sevStyle(sev) + ';cursor:' + (goto ? 'pointer' : 'default') + '">' +
      '<div class="n">' + n + '</div><div class="l">' + l + '</div>' + (x ? '<div class="x">' + x + '</div>' : '') + '</div>';
    const health = [
      hc(o.fyrirtaeki_no_kt > 0 ? 'red' : 'ok', fmtNum(o.fyrirtaeki_no_kt), 'Fyrirtæki án kennitölu', pct(o.fyrirtaeki_no_kt, o.fyrirtaeki) + '% — blokkar sameiningu / dkPlus', 'endurhonnun'),
      hc(o.uttaeki_no_base > 0 ? 'amber' : 'ok', fmtNum(o.uttaeki_no_base), 'Úttæki ótengd grunnskrá', pct(o.uttaeki_no_base, o.uttaeki) + '% — customer_base_id tómt', 'uttektir'),
      hc(lc.orphan > 0 ? 'amber' : 'ok', fmtNum(lc.orphan), 'Munaðarlausir client-strengir', 'passa hvorki rót né fyrirtæki', 'uttektir'),
      hc(o.vidskiptavinir_no_kt > 0 ? 'amber' : 'ok', fmtNum(o.vidskiptavinir_no_kt), 'Viðskiptavinir án kt', '', 'endurhonnun'),
      hc('info', fmtNum(o.customers_base_no_kt), 'Grunnskrá án kt', o.customers_base_no_kt === 0 ? 'hrein ✓' : '', '')
    ].join('');
    return '<div class="bk-sech">Talningar</div><div class="bk-grid">' + stats + '</div>' +
      '<div class="bk-sech">Gagnaheilsa</div><div class="bk-health">' + health + '</div>' +
      '<p class="bk-note">Smelltu á heilsuspjald til að skoða nánar.</p>';
  }

  function tabUtt() {
    const lc = stateCounts();
    const chips = [
      ['all', 'Allir', lc.all],
      ['linked', '🟢 Tengd grunnskrá', lc.linked],
      ['name-only', '🟡 Aðeins nafn-match', lc.nameonly],
      ['orphan', '🔴 Munaðarlausir', lc.orphan]
    ].map(c => '<button class="bk-chip' + (state.clientFilter === c[0] ? ' on' : '') + '" data-filt="' + c[0] + '">' + c[1] + ' (' + fmtNum(c[2]) + ')</button>').join('');
    return '<p class="bk-sub" style="margin-top:-4px">Hvert úttæki geymir bæði frjálsan „client"-texta og FK „customer_base_id". Hér sést hvort hver client-strengur tengist grunnskránni (🟢), passar bara við fyrirtækjanafn (🟡), eða hvorugt (🔴).</p>' +
      '<div class="bk-chips">' + chips + '</div>' +
      '<input class="bk-search" id="_bk-utt-q" placeholder="🔎 Leita að client-streng…" value="' + esc(state.clientQ) + '">' +
      '<div class="bk-panel"><table><thead><tr>' +
      '<th>Client (texti)</th><th class="c">Úttæki</th><th class="c">Tengd</th><th class="c">Ótengd</th>' +
      '<th class="c">Síðasta</th><th class="c">Næsta</th><th>Staða</th>' +
      '</tr></thead><tbody id="_bk-utt-rows"></tbody></table></div>';
  }
  function paintUttRows() {
    const tb = document.getElementById('_bk-utt-rows'); if (!tb) return;
    let rows = (state.clients || []).slice();
    if (state.clientFilter !== 'all') rows = rows.filter(r => r.link_state === state.clientFilter);
    const q = state.clientQ.trim().toLowerCase();
    if (q) rows = rows.filter(r => String(r.client || '').toLowerCase().indexOf(q) >= 0);
    rows.sort((a, b) => (b.n_units - a.n_units) || String(a.client || '').localeCompare(String(b.client || ''), 'is'));
    const cap = 600, shown = rows.slice(0, cap);
    tb.innerHTML = shown.map(r => {
      const name = r.fyrirtaeki_id
        ? '<a href="#" class="bk-link" data-coid="' + r.fyrirtaeki_id + '">' + esc(r.client) + '</a>'
        : '<span class="nm">' + esc(r.client) + '</span>';
      return '<tr><td>' + name + '</td>' +
        '<td class="c">' + fmtNum(r.n_units) + '</td>' +
        '<td class="c">' + fmtNum(r.n_linked) + '</td>' +
        '<td class="c"' + (r.n_unlinked > 0 ? ' style="color:#b45309;font-weight:600"' : '') + '>' + fmtNum(r.n_unlinked) + '</td>' +
        '<td class="c">' + fmtDate(r.last_insp) + '</td>' +
        '<td class="c">' + fmtDate(r.next_insp) + '</td>' +
        '<td>' + badge(r.link_state) + '</td></tr>';
    }).join('') || '<tr><td colspan="7" style="padding:18px;text-align:center;color:var(--ink3,#94a3b8)">Ekkert fannst.</td></tr>';
    if (rows.length > cap) tb.innerHTML += '<tr><td colspan="7" style="text-align:center;color:var(--ink3,#94a3b8);font-size:12px">Sýni ' + cap + ' af ' + fmtNum(rows.length) + '.</td></tr>';
    tb.querySelectorAll('[data-coid]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openCompany(a.getAttribute('data-coid')); }));
  }

  function tabRek() {
    const rk = state.rekstrar || [];
    const tot = rk.reduce((a, r) => { a.f += +r.n_felog || 0; a.u += +r.n_units || 0; return a; }, { f: 0, u: 0 });
    const trs = rk.map(r =>
      '<tr><td><span class="nm">' + esc(r.rekstrarfelag) + '</span></td>' +
      '<td class="c">' + fmtNum(r.n_felog) + '</td>' +
      '<td class="c">' + fmtNum(r.n_with_kt) + '</td>' +
      '<td class="c">' + fmtNum(r.n_units) + '</td></tr>'
    ).join('') || '<tr><td colspan="4" style="padding:18px;text-align:center;color:var(--ink3,#94a3b8)">Engin rekstrarfélög.</td></tr>';
    return '<p class="bk-sub" style="margin-top:-4px">Móðurfélög sem reka mörg húsfélög/byggingar. Gögn úr <span class="bk-mono">customers_base.rekstrarfelag</span>.</p>' +
      '<div class="bk-panel"><table><thead><tr><th>Rekstrarfélag</th><th class="c">Fyrirtæki</th><th class="c">m. kt</th><th class="c">Úttæki</th></tr></thead><tbody>' +
      trs +
      (rk.length ? '<tr style="font-weight:700"><td>Samtals</td><td class="c">' + fmtNum(tot.f) + '</td><td class="c"></td><td class="c">' + fmtNum(tot.u) + '</td></tr>' : '') +
      '</tbody></table></div>' +
      '<p class="bk-note">Byggingalisti og úttektir per bygging eru á sérstöku <a href="#" class="bk-link" data-goto-view="rekstrarfelog">Rekstrarfélög-síðunni →</a></p>';
  }

  function tabSkema() {
    const o = state.overview || {};
    const cards = SCHEMA.map(s => {
      const cnt = o[s.count] != null ? fmtNum(o[s.count]) + ' raðir' : '';
      const cols = s.cols.map(c =>
        '<span class="bk-col">' + esc(c) + '</span>').join('');
      return '<div class="bk-scard' + (s.root ? ' root' : '') + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px">' +
          '<div style="font-size:15px;font-weight:800;color:var(--ink1,#0f172a)">' + esc(s.t) + (s.root ? ' <span style="font-size:11px;color:var(--brand,#0d6efd)">• rót</span>' : '') + '</div>' +
          '<div style="font-size:12px;color:var(--ink3,#94a3b8);font-variant-numeric:tabular-nums">' + cnt + '</div>' +
        '</div>' +
        '<div style="font-size:12.5px;color:var(--ink2,#475569);margin:4px 0 7px">' + esc(s.desc) + '</div>' +
        '<div>' + cols + '</div>' +
        (s.warn ? '<div class="bk-warn">⚠ ' + esc(s.warn) + '</div>' : '') +
        '</div>';
    }).join('');
    return '<p class="bk-sub" style="margin-top:-4px">Gagnalíkanið eins og það er í dag. <span class="bk-mono">→</span> merkir vísun (FK) í aðra töflu. <span class="bk-mono">customers_base</span> er sameinuð rót; eldri lögin tvö (<span class="bk-mono">vidskiptavinir</span>, <span class="bk-mono">fyrirtaeki</span>) vísa upp í hana.</p>' + cards;
  }

  function tabEndur() {
    const o = state.overview || {}, lc = stateCounts();
    const probs = [
      ['Úttæki: frjáls „client"-texti í stað trausts FK',
        fmtNum(o.uttaeki_no_base) + ' af ' + fmtNum(o.uttaeki) + ' úttækjum eru ótengd grunnskrá (customer_base_id tómt) og ' + fmtNum(lc.orphan + lc.nameonly) + ' client-strengir passa illa. Tillaga: bakfylla customer_base_id (nafn→kt→base) og gera „client" að afleiddu birtingargildi.'],
      ['Þrjú viðskiptavinalög',
        'vidskiptavinir (' + fmtNum(o.vidskiptavinir) + ') + fyrirtaeki (' + fmtNum(o.fyrirtaeki) + ') → customers_base (' + fmtNum(o.customers_base) + '). ' + fmtNum(o.fyrirtaeki_no_kt) + ' fyrirtæki án kennitölu hindra örugga sameiningu — kt er lykillinn. Tillaga: klára kt á öll fyrirtæki, svo eitt master-spjald per kt.'],
      ['fyrirtaeki: tvöfaldur tengiliðadálkur',
        '„tengiliður" (með ð) OG „tengilidur" (ascii) eru báðir til í töflunni. Tillaga: flytja allt í einn dálk og fella hinn niður.'],
      ['Status-dálkar dreifðir og ósamræmdir',
        'fyrirtaeki.status, uttaeki.status + uttaeki.custody_status, solur.status — frjáls gildi. Tillaga: skrá leyfileg gildi (enum) per dálk og staðla.']
    ].map(p =>
      '<div class="bk-prob"><div style="font-weight:800;color:var(--ink1,#0f172a);font-size:14px;margin-bottom:3px">' + esc(p[0]) + '</div>' +
      '<div style="font-size:12.5px;color:var(--ink2,#475569);line-height:1.5">' + p[1] + '</div></div>'
    ).join('');
    return '<div class="bk-sech">Þekkt vandamál og tillögur</div>' + probs +
      '<div class="bk-sech" style="margin-top:22px">Vantar kennitölu — lifandi listi (' + fmtNum((state.missing || []).length) + ')</div>' +
      '<input class="bk-search" id="_bk-miss-q" placeholder="🔎 Leita að nafni eða netfangi…" value="' + esc(state.missingQ) + '">' +
      '<div class="bk-panel"><table><thead><tr><th>Heimild</th><th>Nafn</th><th>Netfang</th><th>Sími</th><th class="c">Skráð</th></tr></thead><tbody id="_bk-miss-rows"></tbody></table></div>';
  }
  function paintMissRows() {
    const tb = document.getElementById('_bk-miss-rows'); if (!tb) return;
    let rows = (state.missing || []).slice();
    const q = state.missingQ.trim().toLowerCase();
    if (q) rows = rows.filter(r => (String(r.nafn || '') + ' ' + String(r.netfang || '')).toLowerCase().indexOf(q) >= 0);
    rows.sort((a, b) => String(a.src).localeCompare(String(b.src)) || String(a.nafn || '').localeCompare(String(b.nafn || ''), 'is'));
    const srcBadge = s => {
      const m = ({
        fyrirtaeki: ['#eff6ff', '#bfdbfe', '#1d4ed8'],
        vidskiptavinir: ['#f0fdf4', '#bbf7d0', '#15803d'],
        customers_base: ['#fef2f2', '#fecaca', '#b91c1c']
      })[s] || ['#f1f5f9', '#cbd5e1', '#475569'];
      return '<span class="bk-badge" style="background:' + m[0] + ';border-color:' + m[1] + ';color:' + m[2] + '">' + esc(s) + '</span>';
    };
    const cap = 400, shown = rows.slice(0, cap);
    tb.innerHTML = shown.map(r => {
      const name = r.src === 'fyrirtaeki'
        ? '<a href="#" class="bk-link" data-coid="' + r.id + '">' + esc(r.nafn || '(nafnlaust)') + '</a>'
        : '<span class="nm">' + esc(r.nafn || '(nafnlaust)') + '</span>';
      return '<tr><td>' + srcBadge(r.src) + '</td><td>' + name + '</td>' +
        '<td>' + esc(r.netfang || '—') + '</td><td>' + esc(r.simi || '—') + '</td>' +
        '<td class="c">' + fmtDate(r.created_at) + '</td></tr>';
    }).join('') || '<tr><td colspan="5" style="padding:18px;text-align:center;color:var(--ink3,#94a3b8)">Ekkert fannst — allt með kt. 🎉</td></tr>';
    if (rows.length > cap) tb.innerHTML += '<tr><td colspan="5" style="text-align:center;color:var(--ink3,#94a3b8);font-size:12px">Sýni ' + cap + ' af ' + fmtNum(rows.length) + '.</td></tr>';
    tb.querySelectorAll('[data-coid]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openCompany(a.getAttribute('data-coid')); }));
  }

  function errHtml() {
    return '<div class="bk-panel" style="padding:18px;color:#b91c1c">Náði ekki í Bakendi-gögn: ' + esc(state.err || '') +
      '<div style="color:var(--ink3,#94a3b8);font-size:12px;margin-top:8px">Athugaðu að <span class="bk-mono">v_bakendi_*</span> view-in séu til og með SELECT-rétti á anon.</div></div>';
  }

  // ── master render ────────────────────────────────────────────────────────────
  function render() {
    const main = document.getElementById('_bk-main'); if (!main) return;
    if (state.loading && !state.overview) {
      main.innerHTML = '<div class="bk-wrap"><div style="padding:40px;color:var(--ink3,#94a3b8)">Hleð gögnum…</div></div>';
      return;
    }
    let body;
    if (state.err && !state.overview) body = errHtml();
    else body = ({ yfirlit: tabYfirlit, uttektir: tabUtt, rekstrarfelog: tabRek, skema: tabSkema, endurhonnun: tabEndur }[state.tab] || tabYfirlit)();
    main.innerHTML =
      '<div class="bk-wrap">' +
        '<div class="bk-top">' +
          '<h1>🛠️ Bakendi</h1>' +
          '<button class="bk-refresh" id="_bk-refresh">↻ Sækja</button>' +
        '</div>' +
        '<p class="bk-sub">Stjórnborð yfir gagnalíkanið — talningar, gagnaættfræði úttækja, rekstrarfélög, skema og endurhönnunar-verkefni. Lifandi úr Supabase.</p>' +
        '<div class="bk-tabs">' + TABS.map(t => '<button class="bk-tab' + (state.tab === t.k ? ' on' : '') + '" data-tab="' + t.k + '">' + t.label + '</button>').join('') + '</div>' +
        body +
      '</div>';
    wire(main);
  }

  function wire(main) {
    const rf = main.querySelector('#_bk-refresh'); if (rf) rf.addEventListener('click', () => load());
    main.querySelectorAll('.bk-tab').forEach(b => b.addEventListener('click', () => { state.tab = b.dataset.tab; render(); }));
    main.querySelectorAll('[data-goto]').forEach(el => {
      const g = el.getAttribute('data-goto'); if (!g) return;
      el.addEventListener('click', () => { state.tab = g; render(); });
    });
    main.querySelectorAll('[data-goto-view]').forEach(el => el.addEventListener('click', e => {
      e.preventDefault(); const v = el.getAttribute('data-goto-view'); if (window.App && App.switchView) App.switchView(v);
    }));
    main.querySelectorAll('[data-filt]').forEach(b => b.addEventListener('click', () => { state.clientFilter = b.dataset.filt; render(); }));
    const uq = main.querySelector('#_bk-utt-q');
    if (uq) { uq.addEventListener('input', () => { state.clientQ = uq.value; paintUttRows(); }); paintUttRows(); }
    const mq = main.querySelector('#_bk-miss-q');
    if (mq) { mq.addEventListener('input', () => { state.missingQ = mq.value; paintMissRows(); }); paintMissRows(); }
  }

  // ── styles ─────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('_bk-styles')) return;
    const P = '#' + VIEW_ID + ' ';
    const css = [
      P + '.bk-wrap{max-width:1000px;margin:0 auto;padding:20px 22px 72px}',
      P + '.bk-top{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}',
      P + 'h1{font-size:23px;font-weight:800;margin:0;letter-spacing:-.02em;color:var(--ink1,#0f172a)}',
      P + '.bk-sub{color:var(--ink3,#94a3b8);font-size:13px;margin:2px 0 16px;max-width:720px;line-height:1.5}',
      P + '.bk-refresh{padding:8px 14px;border:1px solid var(--brd,#e6eaf0);background:var(--surface,#fff);border-radius:9px;color:var(--ink2,#475569);font-weight:600;font-size:13px;cursor:pointer}',
      P + '.bk-tabs{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:18px;border-bottom:1px solid var(--brd,#e6eaf0)}',
      P + '.bk-tab{padding:9px 13px;border:none;background:none;border-bottom:2px solid transparent;color:var(--ink3,#94a3b8);font-weight:700;font-size:13.5px;cursor:pointer;margin-bottom:-1px}',
      P + '.bk-tab.on{color:var(--brand,#0d6efd);border-bottom-color:var(--brand,#0d6efd)}',
      P + '.bk-sech{font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--ink2,#475569);margin:0 0 10px}',
      P + '.bk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:11px;margin-bottom:22px}',
      P + '.bk-stat{background:var(--surface,#fff);border:1px solid var(--brd,#e6eaf0);border-radius:13px;padding:13px 15px}',
      P + '.bk-stat .n{font-size:24px;font-weight:800;color:var(--ink1,#0f172a);font-variant-numeric:tabular-nums;line-height:1.1}',
      P + '.bk-stat .l{font-size:12px;color:var(--ink3,#94a3b8);margin-top:3px}',
      P + '.bk-health{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:11px;margin-bottom:8px}',
      P + '.bk-hcard{border-radius:12px;padding:13px 15px;border:1px solid}',
      P + '.bk-hcard .n{font-size:22px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1.1}',
      P + '.bk-hcard .l{font-size:12.5px;margin-top:2px;font-weight:600}',
      P + '.bk-hcard .x{font-size:11px;opacity:.9;margin-top:3px}',
      P + '.bk-note{font-size:12px;color:var(--ink3,#94a3b8);margin:10px 0 0}',
      P + '.bk-panel{background:var(--surface,#fff);border:1px solid var(--brd,#e6eaf0);border-radius:13px;overflow:hidden}',
      P + 'table{width:100%;border-collapse:collapse;font-size:13px}',
      P + 'th{background:var(--surface2,#f8fafc);color:var(--ink3,#94a3b8);font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:9px 13px;border-bottom:1px solid var(--brd,#e6eaf0);white-space:nowrap}',
      P + 'th.c,' + P + 'td.c{text-align:center}',
      P + 'th.r,' + P + 'td.r{text-align:right}',
      P + 'td{padding:8px 13px;border-top:1px solid var(--brd,#eef1f5);vertical-align:middle;color:var(--ink2,#475569)}',
      P + 'td .nm,' + P + '.nm{font-weight:600;color:var(--ink1,#0f172a)}',
      P + '.bk-chips{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px}',
      P + '.bk-chip{padding:6px 12px;border:1px solid var(--brd,#e6eaf0);background:var(--surface,#fff);color:var(--ink2,#475569);border-radius:99px;font-size:12.5px;font-weight:600;cursor:pointer}',
      P + '.bk-chip.on{background:var(--brand,#0d6efd);border-color:var(--brand,#0d6efd);color:#fff}',
      P + '.bk-search{width:100%;border:1px solid var(--brd,#e6eaf0);border-radius:10px;padding:10px 13px;font-size:13.5px;margin-bottom:13px;background:var(--surface,#fff);box-sizing:border-box;color:var(--ink1,#0f172a);outline:none}',
      P + '.bk-badge{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;border:1px solid;white-space:nowrap}',
      P + 'a.bk-link{color:var(--brand,#0d6efd);text-decoration:none}',
      P + 'a.bk-link:hover{text-decoration:underline}',
      P + '.bk-mono{font-family:ui-monospace,Menlo,monospace;font-size:.92em;color:var(--ink3,#94a3b8)}',
      P + '.bk-scard{background:var(--surface,#fff);border:1px solid var(--brd,#e6eaf0);border-radius:13px;padding:14px 16px;margin-bottom:12px}',
      P + '.bk-scard.root{border-color:var(--brand,#0d6efd);box-shadow:0 0 0 1px var(--brand,#0d6efd) inset}',
      P + '.bk-col{display:inline-block;font-family:ui-monospace,Menlo,monospace;font-size:11px;background:var(--surface2,#f8fafc);border:1px solid var(--brd,#e6eaf0);border-radius:6px;padding:2px 7px;margin:2px 3px 0 0;color:var(--ink2,#475569)}',
      P + '.bk-warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:9px;padding:8px 11px;font-size:12px;margin-top:9px}',
      P + '.bk-prob{background:var(--surface,#fff);border:1px solid var(--brd,#e6eaf0);border-left:4px solid #f59e0b;border-radius:11px;padding:13px 15px;margin-bottom:11px}'
    ].join('');
    const st = document.createElement('style'); st.id = '_bk-styles'; st.textContent = css; document.head.appendChild(st);
  }

  // ── view + sidebar wiring (mirrors kerfi-registry 221 / beiðnir 178) ─────────
  function viewEl() { return document.getElementById(VIEW_ID); }
  function ensureView() {
    if (viewEl()) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-companies') || document.querySelector('.view');
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample ? sample.className.replace(/\bactive\b/g, '').trim() : 'view';
    v.style.display = 'none';
    v.innerHTML = '<main id="_bk-main" class="main-panel" style="height:100%;overflow-y:auto"></main>';
    const ref = document.getElementById('view-settings') || sample;
    if (ref && ref.parentNode) ref.parentNode.insertBefore(v, ref.nextSibling); else document.body.appendChild(v);
  }
  function hideMine() { const v = viewEl(); if (v) { v.style.display = 'none'; v.classList.remove('active'); } }
  function show() {
    ensureView(); injectStyles();
    document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    const v = viewEl(); if (v) { v.style.display = 'block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    if (!state.loaded && !state.loading) load(); else render();
  }
  function patchSwitchView() {
    if (!window.App || typeof App.switchView !== 'function') return;
    if (App.switchView.__bakendiPatched) return;
    const orig = App.switchView;
    const wrapped = function (view) { if (view === NAV_KEY) { show(); return; } return orig.apply(this, arguments); };
    for (const k in orig) { try { wrapped[k] = orig[k]; } catch (_) {} }
    wrapped.__bakendiPatched = true;
    App.switchView = wrapped;
  }
  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav'); if (!nav) return;
    if (nav.querySelector('.vnav-btn[data-view="' + NAV_KEY + '"]')) return;
    const btns = Array.from(nav.querySelectorAll('.vnav-btn')); if (!btns.length) return;
    const ref = nav.querySelector('.vnav-btn[data-view="kerfi"]') ||
                nav.querySelector('.vnav-btn[data-view="settings"]') ||
                btns[btns.length - 1];
    const btn = ref.cloneNode(true);
    btn.setAttribute('data-view', NAV_KEY);
    btn.classList.remove('active');
    btn.removeAttribute('onclick');
    const span = btn.querySelector('span'); if (span) span.textContent = '🛠️ Bakendi'; else btn.textContent = '🛠️ Bakendi';
    btn.querySelectorAll('.badge,.count,[class*="badge"],[class*="count"]').forEach(n => n.remove());
    btn.onclick = function (e) { if (e && e.preventDefault) e.preventDefault(); if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); };
    ref.parentNode.insertBefore(btn, ref.nextSibling);
    // Hide my view when the user navigates to any other tab (belt + suspenders;
    // core switchView already hides views, this just guarantees it).
    nav.querySelectorAll('.vnav-btn').forEach(b => {
      if (b.getAttribute('data-view') === NAV_KEY || b.__bkWired) return;
      b.__bkWired = true; b.addEventListener('click', hideMine);
    });
  }

  function boot() { injectStyles(); ensureView(); patchSwitchView(); injectSidebar(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  [400, 900, 1600, 3000].forEach(t => setTimeout(() => { patchSwitchView(); injectSidebar(); }, t));
  setInterval(injectSidebar, 2500);

  window.Bakendi = { open: show, reload: load };
  console.log('[patch-231] Bakendi · gagnalíkans-stjórnborð installed');
})();
/* === END BAKENDI === */
