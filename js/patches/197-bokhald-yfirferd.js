/* === BÓKHALD · YFIRFERÐ v1 ===
 *
 * Ein síða, tveir flipar — yfirferð / villuleit / afgreiðsla:
 *   • Sölur (solur):       lífsferils-flokkun (Bíður · Krafa tilbúin · Staðgreitt ·
 *                          Drög · Villur · Kredit · Void), tvítekninga-leit, síur,
 *                          athugasemd per línu, afturkræfar aðgerðir (Fela/Birta,
 *                          Ógilt/Gilt).
 *   • Verkbeiðnir (verkbeidnir): Bíður · Sótt-en-opið · Lokið · Móttekið · Drög,
 *                          aðgerðir Merkja sótt / Opna.
 *
 * Port af Cowork-frumgerð `bokhald-villuleit` (Drive + borð fh.80). Notar app
 * supabase-client `DB.sb` — EKKI callMcpTool. Athugasemdir → cowork_review_notes
 * (kind,sale_id,note) upsert. Allar aðgerðir afturkræfar með tveggja-skrefa
 * "Staðfesta?" hnappi. Nav-hnappur við hlið "Kröfu yfirlit".
 *
 * Scaffolding (injectNav / ensureView / patchSwitchView) speglar patch 166.
 */
(() => {
  if (window.__bokhaldYfirferdInstalled) return;
  window.__bokhaldYfirferdInstalled = true;

  const VIEW_ID = 'view-bokhald-yfirferd';
  const NAV_KEY = 'bokhald-yfirferd';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  const isk = n => (Math.round(Number(n) || 0)).toLocaleString('is-IS').replace(/,/g, '.');
  function fmtKr(n) { return isk(n) + ' kr'; }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso); if (isNaN(d)) return '—';
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  }
  const B = v => v === true || v === 'true';
  const normName = s => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const nowISO = () => new Date().toISOString();
  const todayDate = () => new Date().toISOString().slice(0, 10);
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); }

  // ── one-time style ─────────────────────────────────────────────────────────
  function ensureStyle() {
    if (document.getElementById('bky-style')) return;
    const s = document.createElement('style');
    s.id = 'bky-style';
    s.textContent = `
      #${VIEW_ID} .bky-wrap{max-width:1240px;margin:0 auto;padding:20px}
      #${VIEW_ID} h1{margin:0;font-size:21px;color:#0f172a;display:flex;align-items:center;gap:9px}
      #${VIEW_ID} .sub{font-size:12.5px;color:#64748b;margin:2px 0 14px}
      #${VIEW_ID} .tabs{display:flex;gap:6px;margin-bottom:14px;border-bottom:2px solid #e2e8f0}
      #${VIEW_ID} .tab{padding:9px 16px;cursor:pointer;font-weight:700;font-size:13.5px;color:#64748b;border-bottom:2px solid transparent;margin-bottom:-2px}
      #${VIEW_ID} .tab.active{color:#1d4ed8;border-bottom-color:#1d4ed8}
      #${VIEW_ID} .tiles{display:flex;flex-wrap:wrap;gap:9px;margin-bottom:14px}
      #${VIEW_ID} .tile{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 14px;cursor:pointer;min-width:120px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
      #${VIEW_ID} .tile.sel{border-color:#1d4ed8;box-shadow:0 0 0 2px #bfdbfe}
      #${VIEW_ID} .tile .t-lbl{font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.03em}
      #${VIEW_ID} .tile .t-n{font-size:22px;font-weight:800;color:#0f172a}
      #${VIEW_ID} .tile .t-sum{font-size:11px;color:#94a3b8}
      #${VIEW_ID} .tile.ok{border-left:4px solid #16a34a}
      #${VIEW_ID} .tile.warn{border-left:4px solid #d97706}
      #${VIEW_ID} .tile.bad{border-left:4px solid #dc2626}
      #${VIEW_ID} .alerts{display:flex;flex-direction:column;gap:7px;margin-bottom:12px}
      #${VIEW_ID} .alert{padding:9px 13px;border-radius:8px;font-size:12.5px;font-weight:600}
      #${VIEW_ID} .alert.bad{background:#fef2f2;border:1px solid #fecaca;color:#b91c1c}
      #${VIEW_ID} .alert.warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
      #${VIEW_ID} .bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
      #${VIEW_ID} .bar input[type=search],#${VIEW_ID} .bar select{padding:7px 10px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;background:#fff}
      #${VIEW_ID} .bar .chk{display:flex;align-items:center;gap:5px;font-size:12.5px;color:#475569;cursor:pointer}
      #${VIEW_ID} .btn{padding:7px 11px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:12.5px}
      #${VIEW_ID} .meta{font-size:12px;color:#94a3b8}
      #${VIEW_ID} table{width:100%;border-collapse:collapse;font-size:12.5px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
      #${VIEW_ID} th{text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;background:#f8fafc;border-bottom:1px solid #e2e8f0}
      #${VIEW_ID} td{padding:7px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
      #${VIEW_ID} tr.dim td{opacity:.5}
      #${VIEW_ID} tr.dup td{background:#fff7ed}
      #${VIEW_ID} .pill{font-size:10px;font-weight:700;padding:2px 7px;border-radius:99px}
      #${VIEW_ID} .note-in{width:100%;min-width:90px;padding:4px 7px;border:1px solid #e2e8f0;border-radius:6px;font:inherit;font-size:12px}
      #${VIEW_ID} .note-in.has{border-color:#f59e0b;background:#fffbeb}
      #${VIEW_ID} .ab{padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font:inherit;font-size:11px;font-weight:600;margin-right:3px;white-space:nowrap}
      #${VIEW_ID} .ab.armed{background:#dc2626;color:#fff;border-color:#dc2626}
      #${VIEW_ID} .skel{padding:30px;text-align:center;color:#94a3b8}`;
    document.head.appendChild(s);
  }

  // ── Sidebar entry (after "Kröfu yfirlit") ────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const btns = Array.from(nav.querySelectorAll('.vnav-btn'));
    const anchor = btns.find(b => b.dataset.view === 'krofu-yfirlit')
                || btns.find(b => /Kröfu yfirlit|Krofu yfirlit/.test(b.textContent || ''))
                || btns[0];
    if (!anchor) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (anchor.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="margin-right:6px">📊</span>Bókhald · yfirferð';
    btn.style.display = 'flex'; btn.style.alignItems = 'center';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY); else show();
    });
    if (anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    else nav.appendChild(btn);
  }

  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    ensureStyle();
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = `
      <main class="main-panel"><div class="bky-wrap">
        <h1>📊 Bókhald · yfirferð</h1>
        <div class="sub">Sölur + verkbeiðnir á einum stað — síaðu, finndu tvítekningar, skrifaðu athugasemd, lagaðu beint. Allt afturkræft.</div>
        <div class="tabs">
          <div class="tab active" data-tab="sala">Sölur</div>
          <div class="tab" data-tab="verk">Verkbeiðnir / afgreiðsla</div>
        </div>
        <section data-sec="sala">
          <div class="alerts" id="bky-alertsS"></div>
          <div class="tiles" id="bky-tilesS"></div>
          <div class="bar">
            <input id="bky-qS" type="search" placeholder="Leita: kúnni, nr…">
            <select id="bky-fGreitt"><option value="">Öll greiðsla</option></select>
            <select id="bky-fStada"><option value="">Öll staða</option></select>
            <label class="chk"><input type="checkbox" id="bky-fDup"> 🔗 Tvítekningar</label>
            <label class="chk"><input type="checkbox" id="bky-fHidden"> Sýna faldar/ógildar</label>
            <button class="btn" id="bky-resetS">Hreinsa</button>
            <span class="meta" id="bky-countS"></span>
          </div>
          <div id="bky-appS"><div class="skel">Sæki sölur…</div></div>
        </section>
        <section data-sec="verk" style="display:none">
          <div class="alerts" id="bky-alertsV"></div>
          <div class="tiles" id="bky-tilesV"></div>
          <div class="bar">
            <input id="bky-qV" type="search" placeholder="Leita: kúnni, nr, sími…">
            <select id="bky-fVstatus"><option value="">Öll staða</option></select>
            <button class="btn" id="bky-resetV">Hreinsa</button>
            <span class="meta" id="bky-countV"></span>
          </div>
          <div id="bky-appV"><div class="skel">Sæki verkbeiðnir…</div></div>
        </section>
      </div></main>`;
    sample.parentElement.appendChild(v);
    v.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  }

  function patchSwitchView() {
    if (!window.App || window.App._bkySwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) {
        ensureView();
        document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
        const v = document.getElementById(VIEW_ID);
        if (v) { v.style.display = 'block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === NAV_KEY));
        load();
        return;
      }
      return orig.apply(this, arguments);
    };
    window.App._bkySwitchPatched = true;
  }

  function switchTab(which) {
    const v = document.getElementById(VIEW_ID); if (!v) return;
    v.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === which));
    v.querySelectorAll('section[data-sec]').forEach(s => { s.style.display = s.dataset.sec === which ? '' : 'none'; });
    if (which === 'verk' && !_verkLoaded) loadVerk();
  }

  // ── classification (fh.80 — röð skiptir máli) ────────────────────────────
  const CASH = ['kort', 'reidufe', 'reiðufé', 'reidufé', 'pening', 'peningur', 'stadgreitt', 'staðgreitt'];
  function cat(r) {
    const gm = (r.greitt_med || '').toLowerCase().trim();
    if (r.stada === 'void') return 'void';
    if (B(r.is_credit)) return 'kredit';
    if (r.stada === 'drog') return 'drog';
    if (gm === 'greitt_sidar' && B(r.paid)) return 'villa';
    if (r.stada === 'final' && Number(r.amt) < 0 && !B(r.is_credit)) return 'villa';
    if (CASH.includes(gm) || Number(r.base_id) === 870) return 'stadgreitt';
    if (gm === 'reikningur' && r.stada === 'final' && r.base_id != null && Number(r.base_id) !== 870 && !B(r.krafa_sent)) return 'krafa';
    if (gm === 'reikningur' || gm === 'greitt_sidar') return 'bidur';
    return 'annad';
  }
  const CATS = { bidur: { label: 'Bíður afhendingar', cls: '' }, krafa: { label: 'Krafa tilbúin', cls: 'ok' }, stadgreitt: { label: 'Staðgreitt', cls: '' }, drog: { label: 'Drög', cls: 'warn' }, villa: { label: 'Villur', cls: 'bad' }, kredit: { label: 'Kredit', cls: '' }, void: { label: 'Void', cls: '' }, annad: { label: 'Annað', cls: '' } };
  const ORDER = ['bidur', 'krafa', 'stadgreitt', 'drog', 'villa', 'kredit', 'void', 'annad'];

  function vcat(v) {
    const s = v.status;
    if (s === 'collected') return 'lokid';
    if (s === 'received') return 'mottekid';
    if (s === 'draft' || s === 'drog') return 'drog';
    if (s === 'ready') return B(v.picked_up) ? 'sott_opid' : 'bidur';
    return 'annad';
  }
  const VCATS = { bidur: { label: 'Bíður afhendingar', cls: '' }, sott_opid: { label: 'Sótt – enn opið', cls: 'warn' }, lokid: { label: 'Lokið', cls: 'ok' }, mottekid: { label: 'Móttekið', cls: '' }, drog: { label: 'Drög', cls: 'warn' }, annad: { label: 'Annað', cls: '' } };
  const VORDER = ['sott_opid', 'bidur', 'drog', 'mottekid', 'lokid', 'annad'];

  // ── action SQL → supabase-js (afturkræft) ────────────────────────────────
  async function doSaleAct(act, id, row) {
    const SB = getSB(); if (!SB) return;
    let patch;
    if (act === 'hide') patch = { hidden: true, hidden_at: nowISO(), updated_at: nowISO() };
    else if (act === 'show') patch = { hidden: false, hidden_at: null, updated_at: nowISO() };
    else if (act === 'void') patch = { status: 'void', updated_at: nowISO() };
    else if (act === 'gild') patch = { status: 'final', updated_at: nowISO() };
    const r = await SB.from('solur').update(patch).eq('id', id);
    if (r.error) { toast('Villa: ' + r.error.message); return; }
    if (act === 'hide') row.hidden = true; if (act === 'show') row.hidden = false;
    if (act === 'void') row.stada = 'void'; if (act === 'gild') row.stada = 'final';
    row._cat = cat(row);
    toast(({ hide: 'Falið', show: 'Birt', void: 'Ógilt', gild: 'Gilt' }[act]) + ' ✓');
    renderSala();
  }
  async function doVerkAct(act, id, v) {
    const SB = getSB(); if (!SB) return;
    let patch;
    if (act === 'vcollect') { patch = { status: 'collected' }; if (!v.pickup) patch.pickup = todayDate(); }
    else if (act === 'vopen') patch = { status: 'ready' };
    const r = await SB.from('verkbeidnir').update(patch).eq('id', id);
    if (r.error) { toast('Villa: ' + r.error.message); return; }
    if (act === 'vcollect') { v.status = 'collected'; v.pickup = v.pickup || todayDate(); }
    if (act === 'vopen') v.status = 'ready';
    v._cat = vcat(v);
    toast((act === 'vcollect' ? 'Merkt sótt' : 'Opnað') + ' ✓');
    renderVerk();
  }
  async function saveNote(kind, id, text, inp) {
    const SB = getSB(); if (!SB) return;
    const r = await SB.from('cowork_review_notes')
      .upsert({ kind, sale_id: id, note: text, updated_at: nowISO() }, { onConflict: 'kind,sale_id' });
    if (r.error) { toast('Villa: ' + r.error.message); return; }
    const arr = kind === 'verk' ? VROWS : ROWS;
    const row = arr.find(x => Number(x.id) === Number(id));
    if (row) row.note = text;
    if (inp) inp.classList.toggle('has', !!String(text).trim());
    toast('Athugasemd vistuð ✓');
  }

  // two-step confirm
  function armBtn(btn, go) {
    if (btn.dataset.armed !== '1') {
      document.querySelectorAll('#' + VIEW_ID + ' .ab.armed').forEach(x => { x.classList.remove('armed'); x.dataset.armed = '0'; x.textContent = x.dataset.lbl || x.textContent; });
      btn.dataset.armed = '1'; btn.classList.add('armed'); btn.dataset.lbl = btn.textContent; btn.textContent = 'Staðfesta?';
      setTimeout(() => { if (btn.dataset.armed === '1') { btn.dataset.armed = '0'; btn.classList.remove('armed'); btn.textContent = btn.dataset.lbl; } }, 4000);
      return;
    }
    go();
  }
  function bindActions(scope) {
    scope.querySelectorAll('.ab[data-act]').forEach(b => b.onclick = () => armBtn(b, () => {
      const id = Number(b.dataset.id), act = b.dataset.act;
      if (act.startsWith('v')) { const v = VROWS.find(x => Number(x.id) === id); doVerkAct(act, id, v); }
      else { const r = ROWS.find(x => Number(x.id) === id); doSaleAct(act, id, r); }
    }));
    scope.querySelectorAll('.note-in').forEach(inp => inp.addEventListener('change', () => saveNote(inp.dataset.k, Number(inp.dataset.id), inp.value, inp)));
    scope.querySelectorAll('[data-sopen]').forEach(b => b.onclick = () => openSaleDetail(Number(b.dataset.sopen)));
  }

  // ── open a sale in a popup right here (review without leaving the page) ──────
  async function openSaleDetail(id) {
    const SB = getSB(); if (!SB) return;
    const row = ROWS.find(x => Number(x.id) === Number(id)) || {};
    const prev = document.getElementById('bky-detail'); if (prev) prev.remove();
    const bg = document.createElement('div'); bg.id = 'bky-detail';
    bg.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:99999;display:flex;align-items:flex-start;justify-content:center;padding:36px 14px;overflow:auto';
    bg.innerHTML = '<div style="background:#fff;border-radius:14px;max-width:640px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3);overflow:hidden">'
      + '<div style="display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid #e2e8f0">'
      + '<strong style="font-size:16px;color:#0f172a">Sala ' + esc(row.num || '') + '</strong><span style="flex:1"></span>'
      + '<button id="bky-detail-x" style="border:none;background:none;font-size:24px;line-height:1;cursor:pointer;color:#64748b">&times;</button></div>'
      + '<div id="bky-detail-body" style="padding:18px"><div class="skel">Sæki…</div></div></div>';
    document.body.appendChild(bg);
    const close = () => bg.remove();
    bg.addEventListener('click', e => { if (e.target === bg) close(); });
    document.getElementById('bky-detail-x').onclick = close;
    document.addEventListener('keydown', function onEsc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); } });
    const r = await SB.from('solur').select('*').eq('id', id).single();
    const body = document.getElementById('bky-detail-body'); if (!body) return;
    if (r.error || !r.data) { body.innerHTML = '<div style="color:#dc2626">Villa við að sækja sölu: ' + esc(r.error ? r.error.message : 'fannst ekki') + '</div>'; return; }
    const s = r.data;
    let lines = s.linur; if (typeof lines === 'string') { try { lines = JSON.parse(lines); } catch (_e) { lines = []; } } if (!Array.isArray(lines)) lines = [];
    const N = n => Number(n) || 0;
    const lname = l => l.desc || l.nafn || l.name || l.label || l.text || l.vara || l.heiti || l.ref || '—';
    const lqty = l => N(l.qty != null ? l.qty : (l.magn != null ? l.magn : (l.fjoldi != null ? l.fjoldi : 1)));
    const lprice = l => N(l.unit_price_ex_vat != null ? l.unit_price_ex_vat : (l.verd != null ? l.verd : (l.verd_an_vsk != null ? l.verd_an_vsk : (l.price != null ? l.price : l.upphaed))));
    const ltot = l => l.samtals != null ? N(l.samtals) : (l.total != null ? N(l.total) : Math.round(lqty(l) * lprice(l)));
    const bt = 'border-top:1px solid #f1f5f9';
    const lrows = lines.length
      ? lines.map(l => '<tr><td style="padding:5px 6px;' + bt + '">' + esc(lname(l)) + '</td><td style="padding:5px 6px;text-align:right;' + bt + '">' + lqty(l) + '</td><td style="padding:5px 6px;text-align:right;' + bt + '">' + fmtKr(lprice(l)) + '</td><td style="padding:5px 6px;text-align:right;font-weight:600;' + bt + '">' + fmtKr(ltot(l)) + '</td></tr>').join('')
      : '<tr><td colspan="4" style="padding:10px;color:#94a3b8">Engar línur skráðar á þessa sölu.</td></tr>';
    const meta = (k, v) => '<div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0"><span style="color:#64748b">' + k + '</span><span style="font-weight:600;color:#0f172a">' + v + '</span></div>';
    let html = '<div style="margin-bottom:14px">' + meta('Kúnni', esc(s.customer_nafn || row.kunni || '—')) + meta('Dagsetning', esc((s.created_at || '').slice(0, 10))) + meta('Greiðsla', esc(s.greitt_med || '—')) + meta('Staða', esc(s.status || '—')) + '</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden"><thead><tr style="background:#f8fafc;color:#64748b;font-size:11px;text-transform:uppercase"><th style="text-align:left;padding:6px">Vara</th><th style="text-align:right;padding:6px">Magn</th><th style="text-align:right;padding:6px">Verð</th><th style="text-align:right;padding:6px">Samtals</th></tr></thead><tbody>' + lrows + '</tbody></table>';
    html += '<div style="margin-top:12px;border-top:1px solid #e2e8f0;padding-top:10px">';
    if (s.upphaed_an_vsk != null) html += meta('Án vsk', fmtKr(s.upphaed_an_vsk));
    if (s.vsk_upphaed != null) html += meta('VSK', fmtKr(s.vsk_upphaed));
    if (N(s.afslattur)) html += meta('Afsláttur', '−' + fmtKr(s.afslattur));
    html += '<div style="display:flex;justify-content:space-between;gap:12px;padding:6px 0"><span style="font-weight:700;font-size:15px">Samtals m. vsk</span><span style="font-weight:800;font-size:15px;color:#0f172a">' + fmtKr(s.samtals) + '</span></div></div>';
    if (s.athugasemdir) html += '<div style="margin-top:12px;background:#f8fafc;border-radius:8px;padding:10px;font-size:13px;color:#334155"><b>Athugasemd sölu:</b> ' + esc(s.athugasemdir) + '</div>';
    if (row.note) html += '<div style="margin-top:8px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;font-size:13px;color:#92400e"><b>Yfirferð:</b> ' + esc(row.note) + '</div>';
    body.innerHTML = html;
  }

  // ── data ───────────────────────────────────────────────────────────────
  let ROWS = [], VROWS = [], NOTES = { sala: {}, verk: {} }, _verkLoaded = false;
  let sCat = 'all';

  async function load() {
    const SB = getSB();
    const appS = document.getElementById('bky-appS');
    if (!SB) { if (appS) appS.innerHTML = '<div class="skel" style="color:#dc2626">Engin gagnabankatenging.</div>'; return; }
    // notes
    const n = await SB.from('cowork_review_notes').select('kind,sale_id,note');
    NOTES = { sala: {}, verk: {} };
    (n.data || []).forEach(x => { (NOTES[x.kind] || (NOTES[x.kind] = {}))[x.sale_id] = x.note; });
    // sales
    const r = await SB.from('solur')
      .select('id,num,created_at,customer_nafn,greitt_med,status,samtals,customer_base_id,paid_at,is_credit,krafa_sent_at,hidden')
      .order('created_at', { ascending: false });
    if (r.error) { if (appS) appS.innerHTML = '<div class="skel" style="color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    ROWS = (r.data || []).map(s => ({
      id: s.id, num: s.num || '', dags: (s.created_at || '').slice(0, 10),
      kunni: (s.customer_nafn && s.customer_nafn.trim()) || '(óþekktur)',
      greitt_med: s.greitt_med || '', stada: s.status || '', amt: Number(s.samtals) || 0,
      base_id: s.customer_base_id, paid: s.paid_at != null, is_credit: !!s.is_credit,
      krafa_sent: s.krafa_sent_at != null, hidden: !!s.hidden, created_at: s.created_at,
      note: NOTES.sala[s.id] || ''
    }));
    ROWS.forEach(r => r._cat = cat(r));
    // build per-customer sale-date index for verk picked_up
    _saleDatesByCust = {};
    ROWS.forEach(s => { if (!s.hidden) { const k = normName(s.kunni); (_saleDatesByCust[k] = _saleDatesByCust[k] || []).push((s.created_at || '').slice(0, 10)); } });
    fillSelect('bky-fGreitt', ROWS.map(r => r.greitt_med).filter(Boolean));
    fillSelect('bky-fStada', ROWS.map(r => r.stada).filter(Boolean));
    bindFilters();
    renderSala();
  }
  let _saleDatesByCust = {};

  async function loadVerk() {
    const SB = getSB(); if (!SB) return;
    _verkLoaded = true;
    const r = await SB.from('verkbeidnir').select('id,num,customer,phone,dropoff,pickup,status,verd').order('dropoff', { ascending: false });
    const appV = document.getElementById('bky-appV');
    if (r.error) { if (appV) appV.innerHTML = '<div class="skel" style="color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    VROWS = (r.data || []).map(v => {
      const dates = _saleDatesByCust[normName(v.customer)] || [];
      const picked_up = !!v.dropoff && dates.some(d => d && d >= v.dropoff);
      return { id: v.id, num: v.num || '', kunni: (v.customer && v.customer.trim()) || '(óþekktur)', phone: v.phone || '', dropoff: v.dropoff, pickup: v.pickup, status: v.status || '', verd: Number(v.verd) || 0, picked_up, note: NOTES.verk[v.id] || '' };
    });
    VROWS.forEach(v => v._cat = vcat(v));
    fillSelect('bky-fVstatus', VROWS.map(v => v.status).filter(Boolean));
    bindVerkFilters();
    renderVerk();
  }

  function fillSelect(id, vals) {
    const s = document.getElementById(id); if (!s) return;
    const have = new Set(Array.from(s.options).map(o => o.value));
    [...new Set(vals)].sort().forEach(v => { if (!have.has(v)) { const o = document.createElement('option'); o.value = v; o.textContent = v; s.appendChild(o); } });
  }

  // ── render: SÖLUR ─────────────────────────────────────────────────────────
  // ── generic sortable table (click any header to sort, click again = reverse) ─
  let sSort = { key: 'dags', dir: -1 }, vSort = { key: 'dropoff', dir: -1 };
  const COLS_SALA = [
    { key: 'num', label: 'Nr', get: r => r.num },
    { key: 'dags', label: 'Dags', type: 'date', get: r => r.dags },
    { key: 'kunni', label: 'Kúnni', get: r => r.kunni },
    { key: 'greitt_med', label: 'Greiðsla', get: r => r.greitt_med },
    { key: 'stada', label: 'Staða', get: r => r.stada },
    { key: 'amt', label: 'Upphæð', type: 'num', align: 'right', get: r => r.amt },
    { key: '_cat', label: 'Flokkur', get: r => (CATS[r._cat] || {}).label || r._cat },
    { key: 'note', label: 'Athugasemd', get: r => r.note },
    { label: '', sortable: false }
  ];
  const COLS_VERK = [
    { key: 'num', label: 'Nr', get: v => v.num },
    { key: 'kunni', label: 'Kúnni', get: v => v.kunni },
    { key: 'phone', label: 'Sími', get: v => v.phone },
    { key: 'dropoff', label: 'Móttekið', type: 'date', get: v => v.dropoff },
    { key: 'pickup', label: 'Sótt', type: 'date', get: v => v.pickup },
    { key: '_cat', label: 'Flokkur', get: v => (VCATS[v._cat] || {}).label || v._cat },
    { key: 'verd', label: 'Verð', type: 'num', align: 'right', get: v => v.verd },
    { key: 'note', label: 'Athugasemd', get: v => v.note },
    { label: '', sortable: false }
  ];
  function buildTable(rows, cols, st, rowFn) {
    const c = cols.find(x => x.key === st.key) || cols.find(x => x.sortable !== false);
    let sorted = rows;
    if (c) sorted = rows.slice().sort((a, b) => {
      const va = c.get(a), vb = c.get(b);
      if (c.type === 'num') return ((Number(va) || 0) - (Number(vb) || 0)) * st.dir;
      return String(va == null ? '' : va).localeCompare(String(vb == null ? '' : vb), 'is', { numeric: true }) * st.dir;
    });
    const thead = '<thead><tr>' + cols.map(col => {
      const al = col.align === 'right' ? 'text-align:right;' : '';
      if (col.sortable === false) return `<th style="${al}"></th>`;
      const ar = st.key === col.key ? (st.dir > 0 ? ' ▲' : ' ▼') : '';
      return `<th class="th-sort" data-key="${esc(col.key)}" style="cursor:pointer;white-space:nowrap;${al}">${esc(col.label)}<span style="color:#1d4ed8;font-size:10px">${ar}</span></th>`;
    }).join('') + '</tr></thead>';
    return '<table>' + thead + '<tbody>' + sorted.map(rowFn).join('') + '</tbody></table>';
  }
  function bindSort(scope, st, rerender) {
    scope.querySelectorAll('.th-sort').forEach(th => th.onclick = () => {
      const k = th.dataset.key;
      if (st.key === k) st.dir = -st.dir; else { st.key = k; st.dir = 1; }
      rerender();
    });
  }

  function sBase() {
    const showHidden = document.getElementById('bky-fHidden')?.checked;
    return showHidden ? ROWS : ROWS.filter(r => !r.hidden);
  }
  function computeDups(set) {
    const m = {};
    set.forEach(r => r._dup = 0);
    set.forEach(r => { if (r.amt > 0 && r.stada !== 'void') { const k = r.kunni + '|' + r.amt; (m[k] = m[k] || []).push(r); } });
    Object.values(m).forEach(g => { if (g.length > 1) g.forEach(r => r._dup = g.length); });
  }
  function renderSala() {
    const app = document.getElementById('bky-appS'); if (!app) return;
    const base = sBase();
    computeDups(base);
    // tiles
    const counts = {}; const sums = {};
    ORDER.forEach(c => { counts[c] = 0; sums[c] = 0; });
    base.forEach(r => { counts[r._cat] = (counts[r._cat] || 0) + 1; sums[r._cat] = (sums[r._cat] || 0) + r.amt; });
    const tilesEl = document.getElementById('bky-tilesS');
    tilesEl.innerHTML = `<div class="tile ${sCat === 'all' ? 'sel' : ''}" data-cat="all"><div class="t-lbl">Allt</div><div class="t-n">${base.length}</div><div class="t-sum">${fmtKr(base.reduce((s, r) => s + r.amt, 0))}</div></div>` +
      ORDER.filter(c => counts[c]).map(c => `<div class="tile ${CATS[c].cls} ${sCat === c ? 'sel' : ''}" data-cat="${c}"><div class="t-lbl">${esc(CATS[c].label)}</div><div class="t-n">${counts[c]}</div><div class="t-sum">${fmtKr(sums[c])}</div></div>`).join('');
    tilesEl.querySelectorAll('.tile').forEach(t => t.onclick = () => { sCat = t.dataset.cat; renderSala(); });
    // alerts
    const dupN = base.filter(r => r._dup).length, villaN = counts.villa || 0, drogN = counts.drog || 0;
    const al = document.getElementById('bky-alertsS'); al.innerHTML = '';
    if (villaN) al.innerHTML += `<div class="alert bad">⚠️ ${villaN} sölur með villu (skoðaðu „Villur"-flokkinn)</div>`;
    if (dupN) al.innerHTML += `<div class="alert warn">🔗 ${dupN} mögulega tvíteknar sölur (sami kúnni + upphæð)</div>`;
    if (drogN) al.innerHTML += `<div class="alert warn">📝 ${drogN} drög óklárðuð</div>`;
    // filter
    const q = (document.getElementById('bky-qS')?.value || '').toLowerCase().trim();
    const fG = document.getElementById('bky-fGreitt')?.value || '';
    const fS = document.getElementById('bky-fStada')?.value || '';
    const fDup = document.getElementById('bky-fDup')?.checked;
    let rows = base.filter(r => {
      if (sCat !== 'all' && r._cat !== sCat) return false;
      if (fG && r.greitt_med !== fG) return false;
      if (fS && r.stada !== fS) return false;
      if (fDup && !r._dup) return false;
      if (q && !(r.kunni.toLowerCase().includes(q) || r.num.toLowerCase().includes(q))) return false;
      return true;
    });
    document.getElementById('bky-countS').textContent = rows.length + ' / ' + base.length + ' sölur';
    if (!rows.length) { app.innerHTML = '<div class="skel">Engar sölur í þessari síu.</div>'; return; }
    app.innerHTML = buildTable(rows, COLS_SALA, sSort, rowSala);
    bindActions(app);
    bindSort(app, sSort, renderSala);
  }
  function rowSala(r) {
    const c = CATS[r._cat] || CATS.annad;
    const pillCls = c.cls === 'bad' ? 'background:#fee2e2;color:#991b1b' : c.cls === 'warn' ? 'background:#fef3c7;color:#92400e' : c.cls === 'ok' ? 'background:#dcfce7;color:#166534' : 'background:#e2e8f0;color:#475569';
    const acts = r.hidden
      ? `<button class="ab" data-act="show" data-id="${r.id}">Birta</button>`
      : `<button class="ab" data-act="hide" data-id="${r.id}">Fela</button>`;
    const acts2 = r.stada === 'void'
      ? `<button class="ab" data-act="gild" data-id="${r.id}">Gilt</button>`
      : `<button class="ab" data-act="void" data-id="${r.id}">Ógilt</button>`;
    return `<tr class="${r.hidden || r.stada === 'void' ? 'dim' : ''} ${r._dup ? 'dup' : ''}">
      <td style="font-family:monospace;color:#475569">${esc(r.num)}${r._dup ? ' <span class="pill" style="background:#fed7aa;color:#9a3412">🔗${r._dup}</span>' : ''}</td>
      <td style="color:#64748b">${esc(r.dags)}</td>
      <td style="font-weight:600;color:#0f172a">${esc(r.kunni)}</td>
      <td style="color:#64748b">${esc(r.greitt_med || '—')}</td>
      <td style="color:#64748b">${esc(r.stada || '—')}</td>
      <td style="text-align:right;font-weight:700;font-variant-numeric:tabular-nums">${fmtKr(r.amt)}</td>
      <td><span class="pill" style="${pillCls}">${esc(c.label)}</span></td>
      <td><input class="note-in${r.note ? ' has' : ''}" data-k="sala" data-id="${r.id}" value="${esc(r.note)}" placeholder="skrifa…"></td>
      <td style="white-space:nowrap"><button class="ab ab-open" data-sopen="${r.id}" title="Skoða þessa sölu — línur, upphæðir, athugasemd">👁 Opna</button>${acts}${acts2}</td>
    </tr>`;
  }

  // ── render: VERKBEIÐNIR ───────────────────────────────────────────────────
  function renderVerk() {
    const app = document.getElementById('bky-appV'); if (!app) return;
    const counts = {}; VORDER.forEach(c => counts[c] = 0);
    VROWS.forEach(v => counts[v._cat] = (counts[v._cat] || 0) + 1);
    const tilesEl = document.getElementById('bky-tilesV');
    tilesEl.innerHTML = `<div class="tile ${vCat === 'all' ? 'sel' : ''}" data-cat="all"><div class="t-lbl">Allt</div><div class="t-n">${VROWS.length}</div></div>` +
      VORDER.filter(c => counts[c]).map(c => `<div class="tile ${VCATS[c].cls} ${vCat === c ? 'sel' : ''}" data-cat="${c}"><div class="t-lbl">${esc(VCATS[c].label)}</div><div class="t-n">${counts[c]}</div></div>`).join('');
    tilesEl.querySelectorAll('.tile').forEach(t => t.onclick = () => { vCat = t.dataset.cat; renderVerk(); });
    const al = document.getElementById('bky-alertsV'); al.innerHTML = '';
    if (counts.sott_opid) al.innerHTML = `<div class="alert warn">📦 ${counts.sott_opid} verkbeiðnir líklega sóttar en enn opnar — merktu sóttar</div>`;
    const q = (document.getElementById('bky-qV')?.value || '').toLowerCase().trim();
    const fV = document.getElementById('bky-fVstatus')?.value || '';
    let rows = VROWS.filter(v => {
      if (vCat !== 'all' && v._cat !== vCat) return false;
      if (fV && v.status !== fV) return false;
      if (q && !(v.kunni.toLowerCase().includes(q) || v.num.toLowerCase().includes(q) || (v.phone || '').includes(q))) return false;
      return true;
    });
    document.getElementById('bky-countV').textContent = rows.length + ' / ' + VROWS.length + ' verkbeiðnir';
    if (!rows.length) { app.innerHTML = '<div class="skel">Engar verkbeiðnir í þessari síu.</div>'; return; }
    app.innerHTML = buildTable(rows, COLS_VERK, vSort, rowVerk);
    bindActions(app);
    bindSort(app, vSort, renderVerk);
  }
  let vCat = 'all';
  function rowVerk(v) {
    const c = VCATS[v._cat] || VCATS.annad;
    const pillCls = c.cls === 'warn' ? 'background:#fef3c7;color:#92400e' : c.cls === 'ok' ? 'background:#dcfce7;color:#166534' : 'background:#e2e8f0;color:#475569';
    const acts = v.status === 'collected'
      ? `<button class="ab" data-act="vopen" data-id="${v.id}">Opna</button>`
      : `<button class="ab" data-act="vcollect" data-id="${v.id}">Merkja sótt</button>`;
    return `<tr>
      <td style="font-family:monospace;color:#475569">${esc(v.num)}</td>
      <td style="font-weight:600;color:#0f172a">${esc(v.kunni)}</td>
      <td style="color:#64748b">${esc(v.phone || '—')}</td>
      <td style="color:#64748b">${esc(fmtDate(v.dropoff))}</td>
      <td style="color:#64748b">${esc(v.pickup ? fmtDate(v.pickup) : '—')}</td>
      <td><span class="pill" style="${pillCls}">${esc(c.label)}</span></td>
      <td style="text-align:right;font-variant-numeric:tabular-nums">${v.verd ? fmtKr(v.verd) : '—'}</td>
      <td><input class="note-in${v.note ? ' has' : ''}" data-k="verk" data-id="${v.id}" value="${esc(v.note)}" placeholder="skrifa…"></td>
      <td style="white-space:nowrap">${acts}</td>
    </tr>`;
  }

  // ── filter wiring ─────────────────────────────────────────────────────────
  let _filtersBound = false, _vFiltersBound = false;
  function bindFilters() {
    if (_filtersBound) return; _filtersBound = true;
    ['bky-qS', 'bky-fGreitt', 'bky-fStada', 'bky-fDup', 'bky-fHidden'].forEach(id => {
      const el = document.getElementById(id); if (el) el.addEventListener(el.tagName === 'INPUT' && el.type === 'search' ? 'input' : 'change', renderSala);
    });
    document.getElementById('bky-resetS')?.addEventListener('click', () => {
      sCat = 'all';
      ['bky-qS', 'bky-fGreitt', 'bky-fStada'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
      ['bky-fDup', 'bky-fHidden'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = false; });
      renderSala();
    });
  }
  function bindVerkFilters() {
    if (_vFiltersBound) return; _vFiltersBound = true;
    ['bky-qV', 'bky-fVstatus'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', renderVerk); });
    document.getElementById('bky-resetV')?.addEventListener('click', () => { vCat = 'all'; ['bky-qV', 'bky-fVstatus'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; }); renderVerk(); });
  }

  function show() { ensureView(); if (window.App && App.switchView) App.switchView(NAV_KEY); else load(); }

  injectNav(); setTimeout(injectNav, 1000);
  ensureView();
  patchSwitchView();
  window.BokhaldYfirferd = { show, load };
  console.log('[patch-197] Bókhald · yfirferð installed (sölur + verkbeiðnir review)');
})();
/* === END BÓKHALD · YFIRFERÐ === */
