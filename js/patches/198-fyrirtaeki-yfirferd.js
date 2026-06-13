/* === FYRIRTÆKI · YFIRFERÐ v1 ===
 *
 * Viðskiptavina-/fyrirtækja fix-síða. Tveir flipar:
 *   • Fyrirtæki (fyrirtaeki + rekstrarfélag úr customers_base): síur Í þjónustu ·
 *     Vantar kt · Vantar heimili · Vantar netfang · Vantar samning · Ótengt grunni ·
 *     Bank-only · Flögguð · Rekstrarfélög. Athugasemd → fyrirtaeki.review_note
 *     (+ review_flag=true). Aðgerðir (afturkræfar): Flagga/Afflagga,
 *     Í/Úr þjónustu (er_i_thjonustu), Fjarlægja/Endurheimta (deleted_at).
 *   • Viðskiptavinir / einstaklingar (vidskiptavinir): Walk-in án kt →
 *     "Tengja Staðgreitt" (customer_base_id=870). "Uppfæra í þjónustu" og
 *     "Sameina við #id" eru CROSS-TABLE aðgerðir — teknar sem BEIÐNIR
 *     (cowork_review_notes, kind='vidsk') sem Code framkvæmir með afriti, frekar
 *     en að giska á áhættusama live-færslu. (Sjá fh.73; staðfest við Cowork.)
 *
 * Port af Cowork-frumgerð `fyrirtaeki-yfirferd` (Drive). Notar DB.sb. Scaffolding
 * speglar patch 166/197.
 */
(() => {
  if (window.__fyrirtaekiYfirferdInstalled) return;
  window.__fyrirtaekiYfirferdInstalled = true;

  const VIEW_ID = 'view-fyrirtaeki-yfirferd';
  const NAV_KEY = 'fyrirtaeki-yfirferd';
  const STADGREITT_BASE = 870;

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  const B = v => v === true || v === 'true';
  const nowISO = () => new Date().toISOString();
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); }

  function ensureStyle() {
    if (document.getElementById('fyr-style')) return;
    const s = document.createElement('style');
    s.id = 'fyr-style';
    s.textContent = `
      #${VIEW_ID} .fyr-wrap{max-width:1240px;margin:0 auto;padding:20px}
      #${VIEW_ID} h1{margin:0;font-size:21px;color:#0f172a;display:flex;align-items:center;gap:9px}
      #${VIEW_ID} .sub{font-size:12.5px;color:#64748b;margin:2px 0 14px}
      #${VIEW_ID} .tabs{display:flex;gap:6px;margin-bottom:14px;border-bottom:2px solid #e2e8f0}
      #${VIEW_ID} .tab{padding:9px 16px;cursor:pointer;font-weight:700;font-size:13.5px;color:#64748b;border-bottom:2px solid transparent;margin-bottom:-2px}
      #${VIEW_ID} .tab.active{color:#1d4ed8;border-bottom-color:#1d4ed8}
      #${VIEW_ID} .chips{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}
      #${VIEW_ID} .chip{padding:6px 11px;border:1px solid #cbd5e1;border-radius:99px;background:#fff;cursor:pointer;font-size:12px;font-weight:600;color:#475569}
      #${VIEW_ID} .chip.sel{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
      #${VIEW_ID} .chip .c-n{opacity:.75;margin-left:4px}
      #${VIEW_ID} .bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:10px}
      #${VIEW_ID} .bar input[type=search]{padding:7px 10px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px}
      #${VIEW_ID} .meta{font-size:12px;color:#94a3b8}
      #${VIEW_ID} table{width:100%;border-collapse:collapse;font-size:12.5px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden}
      #${VIEW_ID} th{text-align:left;padding:8px 10px;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;background:#f8fafc;border-bottom:1px solid #e2e8f0}
      #${VIEW_ID} td{padding:7px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
      #${VIEW_ID} tr.dim td{opacity:.5}
      #${VIEW_ID} .miss{color:#dc2626;font-size:11px}
      #${VIEW_ID} .ok{color:#16a34a}
      #${VIEW_ID} .note-in{width:100%;min-width:90px;padding:4px 7px;border:1px solid #e2e8f0;border-radius:6px;font:inherit;font-size:12px}
      #${VIEW_ID} .note-in.has{border-color:#f59e0b;background:#fffbeb}
      #${VIEW_ID} .ab{padding:4px 8px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;cursor:pointer;font:inherit;font-size:11px;font-weight:600;margin-right:3px;white-space:nowrap}
      #${VIEW_ID} .ab.armed{background:#dc2626;color:#fff;border-color:#dc2626}
      #${VIEW_ID} .skel{padding:30px;text-align:center;color:#94a3b8}`;
    document.head.appendChild(s);
  }

  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const btns = Array.from(nav.querySelectorAll('.vnav-btn'));
    const anchor = btns.find(b => b.dataset.view === 'bokhald-yfirferd')
                || btns.find(b => /Viðskiptavinir|Vidskiptavinir|Fyrirtæki/.test(b.textContent || ''))
                || btns[0];
    if (!anchor) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (anchor.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="margin-right:6px">🏢</span>Fyrirtæki · yfirferð';
    btn.style.display = 'flex'; btn.style.alignItems = 'center';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); });
    if (anchor.parentNode) anchor.parentNode.insertBefore(btn, anchor.nextSibling); else nav.appendChild(btn);
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
      <main class="main-panel"><div class="fyr-wrap">
        <h1>🏢 Fyrirtæki · yfirferð</h1>
        <div class="sub">Lagaðu viðskiptavina-grunninn — vantar kt/heimili/netfang/samning, ótengt grunni, tvíteknir. Athugasemd per línu (Claude les & framkvæmir). Allt afturkræft.</div>
        <div class="tabs">
          <div class="tab active" data-tab="fyr">Fyrirtæki</div>
          <div class="tab" data-tab="vid">Viðskiptavinir / einstaklingar</div>
        </div>
        <section data-sec="fyr">
          <div class="chips" id="fyr-chips"></div>
          <div class="bar"><input id="fyr-q" type="search" placeholder="Leita: nafn, kt…"><span class="meta" id="fyr-count"></span></div>
          <div id="fyr-app"><div class="skel">Sæki fyrirtæki…</div></div>
        </section>
        <section data-sec="vid" style="display:none">
          <div class="bar"><input id="vid-q" type="search" placeholder="Leita: nafn, kt…"><label style="font-size:12.5px;color:#475569;display:flex;align-items:center;gap:5px"><input type="checkbox" id="vid-onlywalkin"> Bara án kt (walk-in)</label><span class="meta" id="vid-count"></span></div>
          <div id="vid-app"><div class="skel">Sæki viðskiptavini…</div></div>
        </section>
      </div></main>`;
    sample.parentElement.appendChild(v);
    v.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  }

  function patchSwitchView() {
    if (!window.App || window.App._fyrSwitchPatched) return;
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
    window.App._fyrSwitchPatched = true;
  }

  function switchTab(which) {
    const v = document.getElementById(VIEW_ID); if (!v) return;
    v.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === which));
    v.querySelectorAll('section[data-sec]').forEach(s => { s.style.display = s.dataset.sec === which ? '' : 'none'; });
    if (which === 'vid' && !_vidLoaded) loadVid();
  }

  // ── filters (chips) ───────────────────────────────────────────────────────
  const FILTERS = [
    { k: 'all', label: 'Allt', test: () => true },
    { k: 'thjon', label: 'Í þjónustu', test: f => B(f.er_i_thjonustu) },
    { k: 'nokt', label: 'Vantar kt', test: f => !f.kennitala },
    { k: 'noaddr', label: 'Vantar heimili', test: f => !f.heimilisfang },
    { k: 'nomail', label: 'Vantar netfang', test: f => !f.netfang },
    { k: 'nosamn', label: 'Vantar samning', test: f => B(f.er_i_thjonustu) && !f.greidsluskilmali },
    { k: 'nobase', label: 'Ótengt grunni', test: f => f.customer_base_id == null },
    { k: 'bank', label: 'Bank-only', test: f => B(f.is_bank_only) },
    { k: 'flag', label: 'Flögguð', test: f => B(f.review_flag) },
    { k: 'rek', label: 'Rekstrarfélög', test: f => !!f._rek }
  ];
  let fFilter = 'all';

  let FROWS = [], VROWS = [], BASE_REK = {}, _vidLoaded = false;

  async function load() {
    const SB = getSB(); const app = document.getElementById('fyr-app');
    if (!SB) { if (app) app.innerHTML = '<div class="skel" style="color:#dc2626">Engin gagnabankatenging.</div>'; return; }
    // rekstrarfélag map from customers_base
    const cb = await SB.from('customers_base').select('id,rekstrarfelag');
    BASE_REK = {};
    (cb.data || []).forEach(b => { if (b.rekstrarfelag) BASE_REK[b.id] = b.rekstrarfelag; });
    const r = await SB.from('fyrirtaeki')
      .select('id,nafn,kennitala,simi,netfang,heimilisfang,greidsluskilmali,status,er_i_thjonustu,deleted_at,customer_base_id,review_flag,review_note,is_bank_only')
      .order('nafn');
    if (r.error) { if (app) app.innerHTML = '<div class="skel" style="color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    FROWS = (r.data || []).map(f => ({ ...f, _rek: f.customer_base_id != null ? (BASE_REK[f.customer_base_id] || '') : '' }));
    bindFilters();
    renderFyr();
  }

  // ── generic sortable table (click any header to sort, click again = reverse) ─
  let fSort = { key: 'nafn', dir: 1 }, vidSort = { key: 'nafn', dir: 1 };
  const COLS_FYR = [
    { key: 'nafn', label: 'Nafn', get: f => f.nafn },
    { key: 'kennitala', label: 'Kt', get: f => f.kennitala },
    { key: 'heimilisfang', label: 'Heimili', get: f => f.heimilisfang },
    { key: 'netfang', label: 'Netfang', get: f => f.netfang },
    { key: 'er_i_thjonustu', label: 'Þjón.', type: 'num', get: f => B(f.er_i_thjonustu) ? 1 : 0 },
    { key: 'customer_base_id', label: 'Grunnur', type: 'num', get: f => f.customer_base_id == null ? -1 : f.customer_base_id },
    { key: 'review_note', label: 'Athugasemd', get: f => f.review_note },
    { label: '', sortable: false }
  ];
  const COLS_VID = [
    { key: 'nafn', label: 'Nafn', get: v => v.nafn },
    { key: 'kennitala', label: 'Kt', get: v => v.kennitala },
    { key: 'simi', label: 'Sími', get: v => v.simi },
    { key: 'customer_base_id', label: 'Grunnur', type: 'num', get: v => v.customer_base_id == null ? -1 : v.customer_base_id },
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

  function renderFyr() {
    const app = document.getElementById('fyr-app'); if (!app) return;
    const live = FROWS.filter(f => !f.deleted_at);
    // chips with counts
    const chipsEl = document.getElementById('fyr-chips');
    chipsEl.innerHTML = FILTERS.map(f => {
      const n = (f.k === 'all') ? live.length : FROWS.filter(x => !x.deleted_at && f.test(x)).length;
      return `<div class="chip ${fFilter === f.k ? 'sel' : ''}" data-f="${f.k}">${esc(f.label)}<span class="c-n">${n}</span></div>`;
    }).join('');
    chipsEl.querySelectorAll('.chip').forEach(c => c.onclick = () => { fFilter = c.dataset.f; renderFyr(); });
    const flt = FILTERS.find(x => x.k === fFilter) || FILTERS[0];
    const q = (document.getElementById('fyr-q')?.value || '').toLowerCase().trim();
    let rows = FROWS.filter(f => !f.deleted_at && flt.test(f) && (!q || (f.nafn || '').toLowerCase().includes(q) || (f.kennitala || '').includes(q)));
    document.getElementById('fyr-count').textContent = rows.length + ' / ' + live.length + ' fyrirtæki';
    if (!rows.length) { app.innerHTML = '<div class="skel">Engin fyrirtæki í þessari síu.</div>'; return; }
    app.innerHTML = buildTable(rows, COLS_FYR, fSort, rowFyr);
    bindFyrRows(app);
    bindSort(app, fSort, renderFyr);
  }
  function rowFyr(f) {
    const acts = `
      <button class="ab" data-act="${B(f.review_flag) ? 'unflag' : 'flag'}" data-id="${f.id}">${B(f.review_flag) ? 'Afflagga' : '⚑ Flagga'}</button>
      <button class="ab" data-act="${B(f.er_i_thjonustu) ? 'outsvc' : 'insvc'}" data-id="${f.id}">${B(f.er_i_thjonustu) ? 'Úr þjónustu' : 'Í þjónustu'}</button>
      <button class="ab" data-act="del" data-id="${f.id}">Fjarlægja</button>`;
    return `<tr>
      <td style="font-weight:600;color:#0f172a">${esc(f.nafn || '(nafnlaust)')}${B(f.review_flag) ? ' ⚑' : ''}${f._rek ? ' <span style="font-size:10px;color:#7c3aed">· ' + esc(f._rek) + '</span>' : ''}</td>
      <td>${f.kennitala ? esc(f.kennitala) : '<span class="miss">vantar</span>'}</td>
      <td>${f.heimilisfang ? esc(f.heimilisfang) : '<span class="miss">vantar</span>'}</td>
      <td>${f.netfang ? esc(f.netfang) : '<span class="miss">vantar</span>'}</td>
      <td>${B(f.er_i_thjonustu) ? '<span class="ok">✓</span>' : '—'}</td>
      <td>${f.customer_base_id != null ? '#' + f.customer_base_id : '<span class="miss">ótengt</span>'}</td>
      <td><input class="note-in${f.review_note ? ' has' : ''}" data-id="${f.id}" value="${esc(f.review_note || '')}" placeholder="skrifa…"></td>
      <td style="white-space:nowrap">${acts}</td>
    </tr>`;
  }

  // ── viðskiptavinir tab ────────────────────────────────────────────────────
  async function loadVid() {
    const SB = getSB(); const app = document.getElementById('vid-app'); if (!SB) return;
    _vidLoaded = true;
    const r = await SB.from('vidskiptavinir').select('id,nafn,kennitala,simi,netfang,heimilisfang,customer_base_id,deleted_at').order('nafn');
    if (r.error) { if (app) app.innerHTML = '<div class="skel" style="color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    VROWS = (r.data || []).filter(v => !v.deleted_at);
    bindVidFilters();
    renderVid();
  }
  function renderVid() {
    const app = document.getElementById('vid-app'); if (!app) return;
    const q = (document.getElementById('vid-q')?.value || '').toLowerCase().trim();
    const onlyWalkin = document.getElementById('vid-onlywalkin')?.checked;
    let rows = VROWS.filter(v => (!onlyWalkin || !v.kennitala) && (!q || (v.nafn || '').toLowerCase().includes(q) || (v.kennitala || '').includes(q)));
    document.getElementById('vid-count').textContent = rows.length + ' / ' + VROWS.length + ' viðskiptavinir';
    if (!rows.length) { app.innerHTML = '<div class="skel">Engir viðskiptavinir í þessari síu.</div>'; return; }
    app.innerHTML = buildTable(rows, COLS_VID, vidSort, rowVid);
    bindVidRows(app);
    bindSort(app, vidSort, renderVid);
  }
  function rowVid(v) {
    const linkStad = v.customer_base_id === STADGREITT_BASE
      ? '<span class="ok" style="font-size:11px">✓ Staðgreitt</span>'
      : (!v.kennitala ? `<button class="ab" data-act="stad" data-id="${v.id}">Tengja Staðgreitt</button>` : '');
    return `<tr>
      <td style="font-weight:600;color:#0f172a">${esc(v.nafn || '(nafnlaust)')}</td>
      <td>${v.kennitala ? esc(v.kennitala) : '<span class="miss">vantar (walk-in)</span>'}</td>
      <td style="color:#64748b">${esc(v.simi || '—')}</td>
      <td>${v.customer_base_id != null ? '#' + v.customer_base_id : '—'}</td>
      <td style="white-space:nowrap">
        ${linkStad}
        <button class="ab" data-act="upgrade" data-id="${v.id}" title="Beiðni: uppfæra í fyrirtækjaþjónustu (Code framkvæmir m/afriti)">⬆ Uppfæra í þjónustu</button>
        <button class="ab" data-act="merge" data-id="${v.id}" title="Beiðni: sameina við annað id">⛓ Sameina…</button>
      </td>
    </tr>`;
  }

  // ── actions ───────────────────────────────────────────────────────────────
  function armBtn(btn, go) {
    if (btn.dataset.armed !== '1') {
      document.querySelectorAll('#' + VIEW_ID + ' .ab.armed').forEach(x => { x.classList.remove('armed'); x.dataset.armed = '0'; x.textContent = x.dataset.lbl || x.textContent; });
      btn.dataset.armed = '1'; btn.classList.add('armed'); btn.dataset.lbl = btn.textContent; btn.textContent = 'Staðfesta?';
      setTimeout(() => { if (btn.dataset.armed === '1') { btn.dataset.armed = '0'; btn.classList.remove('armed'); btn.textContent = btn.dataset.lbl; } }, 4000);
      return;
    }
    go();
  }
  function bindFyrRows(scope) {
    scope.querySelectorAll('.ab[data-act]').forEach(b => b.onclick = () => armBtn(b, () => fyrAct(b.dataset.act, Number(b.dataset.id))));
    scope.querySelectorAll('.note-in').forEach(inp => inp.addEventListener('change', () => fyrNote(Number(inp.dataset.id), inp.value, inp)));
  }
  async function fyrAct(act, id) {
    const SB = getSB(); if (!SB) return;
    const f = FROWS.find(x => Number(x.id) === id); if (!f) return;
    let patch;
    if (act === 'flag') patch = { review_flag: true };
    else if (act === 'unflag') patch = { review_flag: false };
    else if (act === 'insvc') patch = { er_i_thjonustu: true };
    else if (act === 'outsvc') patch = { er_i_thjonustu: false };
    else if (act === 'del') patch = { deleted_at: nowISO() };
    const r = await SB.from('fyrirtaeki').update(patch).eq('id', id);
    if (r.error) { toast('Villa: ' + r.error.message); return; }
    Object.assign(f, patch);
    toast({ flag: 'Flaggað', unflag: 'Afflaggað', insvc: 'Sett í þjónustu', outsvc: 'Tekið úr þjónustu', del: 'Fjarlægt (afturkræft)' }[act] + ' ✓');
    renderFyr();
  }
  async function fyrNote(id, text, inp) {
    const SB = getSB(); if (!SB) return;
    const r = await SB.from('fyrirtaeki').update({ review_note: text, review_flag: !!String(text).trim() || undefined }).eq('id', id);
    if (r.error) { toast('Villa: ' + r.error.message); return; }
    const f = FROWS.find(x => Number(x.id) === id); if (f) { f.review_note = text; if (String(text).trim()) f.review_flag = true; }
    if (inp) inp.classList.toggle('has', !!String(text).trim());
    toast('Athugasemd vistuð ✓');
  }
  function bindVidRows(scope) {
    scope.querySelectorAll('.ab[data-act]').forEach(b => b.onclick = () => {
      const id = Number(b.dataset.id), act = b.dataset.act;
      if (act === 'stad') armBtn(b, () => vidLinkStad(id));
      else if (act === 'upgrade') vidRequest(id, 'UPPFÆRA-Í-ÞJÓNUSTU');
      else if (act === 'merge') {
        const target = prompt('Sameina þennan viðskiptavin við annað id?\nSláðu inn id (fyrirtaeki/vidskiptavinir) sem á að halda:');
        if (target && String(target).trim()) vidRequest(id, 'SAMEINA→#' + String(target).trim());
      }
    });
  }
  async function vidLinkStad(id) {
    const SB = getSB(); if (!SB) return;
    const r = await SB.from('vidskiptavinir').update({ customer_base_id: STADGREITT_BASE }).eq('id', id);
    if (r.error) { toast('Villa: ' + r.error.message); return; }
    const v = VROWS.find(x => Number(x.id) === id); if (v) v.customer_base_id = STADGREITT_BASE;
    toast('Tengt við Staðgreitt (870) ✓'); renderVid();
  }
  // Cross-table ops captured as reviewable requests (Code executes with backup).
  async function vidRequest(id, reqText) {
    const SB = getSB(); if (!SB) return;
    const r = await SB.from('cowork_review_notes').upsert({ kind: 'vidsk', sale_id: id, note: reqText, updated_at: nowISO() }, { onConflict: 'kind,sale_id' });
    if (r.error) { toast('Villa: ' + r.error.message); return; }
    toast('Beiðni skráð: ' + reqText + ' (Code framkvæmir)');
  }

  // ── filter wiring ─────────────────────────────────────────────────────────
  let _fb = false, _vb = false;
  function bindFilters() { if (_fb) return; _fb = true; document.getElementById('fyr-q')?.addEventListener('input', renderFyr); }
  function bindVidFilters() { if (_vb) return; _vb = true; document.getElementById('vid-q')?.addEventListener('input', renderVid); document.getElementById('vid-onlywalkin')?.addEventListener('change', renderVid); }

  function show() { ensureView(); if (window.App && App.switchView) App.switchView(NAV_KEY); else load(); }

  injectNav(); setTimeout(injectNav, 1000);
  ensureView();
  patchSwitchView();
  window.FyrirtaekiYfirferd = { show, load };
  console.log('[patch-198] Fyrirtæki · yfirferð installed (fyrirtaeki + vidskiptavinir fix)');
})();
/* === END FYRIRTÆKI · YFIRFERÐ === */
