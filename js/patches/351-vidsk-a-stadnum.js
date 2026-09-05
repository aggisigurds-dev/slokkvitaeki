/* === ALLIR VIÐSKIPTAVINIR — Á STAÐNUM v1 (05.09.2026) ===
 *
 * Agnar: „Þetta borð hjálpar gersamlega ekki neitt — ýti á eitthvað og bara sent á
 * slökkvitækjasíðuna … get ekki gert neitt þarna: skjáskot, attachment, skrifað."
 *
 * Röðin á Allir-viðskiptavinir-borðinu opnast núna Á STAÐNUM (undir röðinni) í stað
 * þess að senda mann burt á kúnna-síðuna:
 *   • 📝 Nóta — sama fyrirtaeki.athugasemdir og litla reiturinn í röðinni, vistast sjálfkrafa
 *   • 📎 Viðhengi — skrár fyrirtækisins (CompanyAttachments, patch 111: bucket samningar/
 *     company_attachments/<id>/, metagögn í AppSettings.company_attachments) — velja skrá,
 *     draga-sleppa á spjaldið, eða LÍMA SKJÁSKOT (Ctrl+V / „📷 Skjáskot"-takkinn les klemmuspjaldið)
 *   • „Opna kúnna-síðu →" og „Fyrirtækjaspjald →" eru þarna þegar maður VILL fara lengra
 * Sami viðhengja-kubbur er settur undir 📝 Athugasemdir á kúnna-síðunni (patch 158), svo
 * það sem er hengt við á borðinu sést þar — og öfugt.
 *
 * Kúnna-síðan (158) og fyrirtækjaspjaldið (Companies) eru ÓBREYTT; 157 kallar hingað úr
 * röð-smellinum (VidskAStadnum.toggle) og fellur á openDetail sé plásturinn ekki hlaðinn.
 */
(() => {
  if (window.VidskAStadnum) return;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const getSB = () => (window.DB && window.DB.sb) || null;
  const CA = () => window.CompanyAttachments || null;
  const toast = (t) => { if (window.Toast && Toast.show) Toast.show(t); };
  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(); };
  const fmtSize = (b) => !b ? '' : b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  const isImg = (f) => /^image\//.test(f.content_type || '') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(f.name || '');
  const isPdf = (f) => /pdf/.test(f.content_type || '') || /\.pdf$/i.test(f.name || '');
  const ico = (f) => isImg(f) ? '🖼' : isPdf(f) ? '📄' : /\.(docx?|odt)$/i.test(f.name || '') ? '📝' : /\.(xlsx?|csv)$/i.test(f.name || '') ? '📊' : '📎';
  const company = (id) => ((window.Companies && Companies.list) || []).find(c => +c.id === +id) || null;

  // ── CSS (einu sinni) ──────────────────────────────────────────────────────
  if (!document.getElementById('_avx-css')) {
    const st = document.createElement('style'); st.id = '_avx-css';
    st.textContent = `
      tr._avx-panel > td{padding:0 !important;background:#f7f8fb;border-top:0 !important}
      ._avx{margin:0 12px 14px;border:1px solid rgba(20,24,34,.14);border-top:3px solid #c0241f;border-radius:0 0 14px 14px;background:#fff;box-shadow:0 14px 30px -20px rgba(25,35,60,.35);padding:14px 16px 16px;transition:box-shadow .15s}
      ._avx.drop{box-shadow:0 0 0 3px #93c5fd inset;background:#f0f6ff}
      ._avx-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
      ._avx-head b{font-size:15px;color:#11141c}
      ._avx-head .kt{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11.5px;color:#5b6472}
      ._avx-head .sp{flex:1}
      ._avx-btn{font:inherit;font-size:12px;font-weight:700;padding:7px 12px;border-radius:9px;border:1px solid rgba(20,24,34,.16);background:#fff;color:#11141c;cursor:pointer;white-space:nowrap;min-height:34px}
      ._avx-btn:hover{border-color:#c0241f;color:#c0241f}
      ._avx-btn.red{background:#c0241f;border-color:#c0241f;color:#fff}
      ._avx-btn.red:hover{background:#a11d19;color:#fff}
      ._avx-btn.ghost{border-style:dashed;color:#5b6472}
      ._avx-grid{display:grid;grid-template-columns:minmax(260px,1fr) minmax(300px,1.3fr);gap:16px}
      @media (max-width:720px){._avx-grid{grid-template-columns:1fr}._avx{margin:0 4px 10px;padding:12px}}
      ._avx-lbl{font-size:10.5px;font-weight:700;letter-spacing:.12em;color:#8a93a5;margin-bottom:6px;display:flex;align-items:center;gap:8px}
      ._avx-lbl .ok{color:#16a34a;font-weight:600;letter-spacing:0;opacity:0;transition:opacity .3s}
      ._avx-nota{width:100%;box-sizing:border-box;min-height:132px;padding:9px 11px;border:1px solid rgba(20,24,34,.18);border-radius:9px;font:inherit;font-size:13px;line-height:1.45;color:#11141c;background:#fdfdfe;resize:vertical}
      ._avx-nota:focus{outline:none;border-color:#c0241f;background:#fff}
      ._avx-tools{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
      ._avx-hint{font-size:11.5px;color:#8a93a5;margin:-4px 0 8px}
      ._avx-list{display:flex;flex-direction:column;gap:6px;max-height:300px;overflow:auto}
      ._avx-it{display:flex;align-items:center;gap:10px;padding:6px 8px;border:1px solid rgba(20,24,34,.1);border-radius:9px;background:#fff}
      ._avx-it .th{width:44px;height:44px;border-radius:7px;background:#eef1f6;display:flex;align-items:center;justify-content:center;font-size:20px;overflow:hidden;flex:0 0 44px;cursor:pointer}
      ._avx-it .th img{width:100%;height:100%;object-fit:cover;display:block}
      ._avx-it .nm{flex:1;min-width:0}
      ._avx-it .nm a{font-size:12.5px;font-weight:600;color:#11141c;text-decoration:none;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}
      ._avx-it .nm a:hover{color:#c0241f}
      ._avx-it .nm small{font-size:10.5px;color:#8a93a5}
      ._avx-it .x{font:inherit;font-size:12px;border:0;background:transparent;color:#8a93a5;cursor:pointer;padding:6px}
      ._avx-it .x:hover{color:#c0241f}
      ._avx-empty{font-size:12px;color:#8a93a5;font-style:italic;padding:10px;border:1px dashed rgba(20,24,34,.18);border-radius:9px;text-align:center}
      ._avx-busy{font-size:12px;color:#2f5fe0;font-weight:600}
      #view-allir-vidsk [data-kpi]{cursor:pointer}
      #view-allir-vidsk [data-kpi]:hover{box-shadow:0 0 0 2px #c0241f inset !important}
    `;
    document.head.appendChild(st);
  }

  let openId = null;          // röðin sem er opin á borðinu
  const _noteTimers = {};

  // ── Nóta — sama dálkur og litli reiturinn í röðinni (fyrirtaeki.athugasemdir) ──
  async function saveNote(coId, val) {
    const c = company(coId); const v = val.trim() || null;
    if (c) c.athugasemdir = v;
    const SB = getSB(); if (!SB) return false;
    const r = await SB.from('fyrirtaeki').update({ athugasemdir: v }).eq('id', coId);
    if (r && r.error) { console.warn('[351] nóta', r.error); toast('Villa við vistun nótu: ' + r.error.message); return false; }
    // spegla í litla reitinn í röðinni (157) og á kúnna-síðunni (158)
    document.querySelectorAll('._av-note[data-co-id="' + coId + '"], #_vd-athuga-ta').forEach(ta => { if (ta.value !== val && document.activeElement !== ta) ta.value = val; });
    return true;
  }

  // ── Viðhengi ──────────────────────────────────────────────────────────────
  async function uploadFiles(coId, files, box) {
    const ca = CA(); if (!ca) { toast('Viðhengja-kerfið (patch 111) er ekki hlaðið'); return; }
    const arr = [...files].filter(Boolean); if (!arr.length) return;
    const busy = box && box.querySelector('._avx-busy'); if (busy) busy.textContent = '⏳ Hleð inn ' + arr.length + ' skrá' + (arr.length === 1 ? '' : 'm') + '…';
    let n = 0;
    for (const f of arr) { const meta = await ca.upload(coId, f, {}); if (meta) n++; }
    if (busy) busy.textContent = '';
    if (n) toast('✓ ' + n + ' viðhengi tengt' + (n === 1 ? '' : ' (' + n + ')'));
    renderList(coId, box);
  }
  function screenshotName(type) {
    const d = new Date(); const ext = /jpe?g/.test(type) ? 'jpg' : /webp/.test(type) ? 'webp' : 'png';
    return 'skjaskot_' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '_' + pad(d.getHours()) + '-' + pad(d.getMinutes()) + '-' + pad(d.getSeconds()) + '.' + ext;
  }
  const asNamed = (f) => (!f.name || /^image\.(png|jpe?g|webp|gif)$/i.test(f.name) || f.name === 'blob') ? new File([f], screenshotName(f.type), { type: f.type }) : f;

  async function pasteFromClipboard(coId, box) {
    // 1) Klemmuspjaldið beint (Chrome/Edge — biður um leyfi einu sinni)
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        const files = [];
        for (const it of items) { const t = it.types.find(x => /^image\//.test(x)); if (t) files.push(new File([await it.getType(t)], screenshotName(t), { type: t })); }
        if (files.length) { await uploadFiles(coId, files, box); return; }
        toast('Engin mynd á klemmuspjaldinu — taktu skjáskot (Win+Shift+S) og reyndu aftur');
        return;
      }
    } catch (e) { /* leyfi hafnað / ekki stutt → Ctrl+V leiðin */ }
    toast('Ýttu á Ctrl+V hér á spjaldinu til að líma skjáskotið');
    const ta = box && box.querySelector('._avx-nota'); if (ta) ta.focus();
  }

  async function renderList(coId, box) {
    const el = box && box.querySelector('._avx-list'); if (!el) return;
    const ca = CA(); const list = ca ? ca.list(coId) : [];
    if (!list.length) { el.innerHTML = '<div class="_avx-empty">Engin viðhengi enn — dragðu skrá hingað, límdu skjáskot (Ctrl+V) eða veldu skrá</div>'; return; }
    el.innerHTML = list.map(f => `
      <div class="_avx-it" data-att="${esc(f.id || f.path)}">
        <div class="th" title="Opna">${ico(f)}</div>
        <div class="nm"><a title="${esc(f.name)}">${esc(f.name)}</a><small>${fmtDate(f.uploaded_at)}${f.size ? ' · ' + fmtSize(f.size) : ''}${f.kind ? ' · ' + esc(f.kind) : ''}</small></div>
        <button type="button" class="x dl" title="Sækja">⬇</button>
        <button type="button" class="x rm" title="Eyða viðhengi">🗑</button>
      </div>`).join('');
    el.querySelectorAll('._avx-it').forEach(it => {
      const f = list.find(x => String(x.id || x.path) === it.dataset.att); if (!f) return;
      const open = () => { if (ca.openPreview && (isImg(f) || isPdf(f))) ca.openPreview(f); else ca.download(f); };
      it.querySelector('.th').addEventListener('click', open);
      it.querySelector('.nm a').addEventListener('click', open);
      it.querySelector('.dl').addEventListener('click', () => ca.download(f));
      it.querySelector('.rm').addEventListener('click', async () => { await ca.delete(coId, f); renderList(coId, box); });
      if (isImg(f) && ca.getPublicUrl) ca.getPublicUrl(f.path).then(u => { if (u) it.querySelector('.th').innerHTML = '<img alt="" src="' + esc(u) + '">'; }).catch(() => {});
    });
  }

  // ── Kubburinn sjálfur (notaður bæði á borðinu og kúnna-síðunni) ───────────
  function buildBox(coId, opts) {
    const c = company(coId) || { id: coId, nafn: (opts && opts.nafn) || ('#' + coId) };
    const box = document.createElement('div'); box.className = '_avx'; box.dataset.coId = coId;
    const onBoard = !(opts && opts.detail);
    box.innerHTML = `
      ${onBoard ? `<div class="_avx-head"><b>${esc(c.nafn || '—')}</b><span class="kt">${esc(c.kennitala || '')}</span><span class="sp"></span>
        <button type="button" class="_avx-btn" data-go="detail" title="Kúnna-síðan: tæki, verð, fyrri viðskipti, skjöl">Opna kúnna-síðu →</button>
        <button type="button" class="_avx-btn ghost" data-go="company" title="Fyrirtækjaspjald (ársskoðun, tæki)">Fyrirtækjaspjald →</button>
        <button type="button" class="_avx-btn ghost" data-go="close" title="Loka">✕</button></div>` : ''}
      <div class="_avx-grid">
        ${onBoard ? `<div><div class="_avx-lbl">📝 NÓTA <span class="ok">✓ Vistað</span></div>
          <textarea class="_avx-nota" placeholder="Skrifaðu hér — vistast sjálfkrafa. Líma má skjáskot beint hér (Ctrl+V).">${esc(c.athugasemdir || '')}</textarea></div>` : ''}
        <div ${onBoard ? '' : 'style="grid-column:1 / -1"'}>
          <div class="_avx-lbl">📎 VIÐHENGI <span class="_avx-busy"></span></div>
          <div class="_avx-tools">
            <button type="button" class="_avx-btn red" data-act="pick">📎 Velja skrá</button>
            <button type="button" class="_avx-btn" data-act="paste">📷 Skjáskot af klemmuspjaldi</button>
            <input type="file" multiple style="display:none">
          </div>
          <div class="_avx-hint">Draga-sleppa skrá hvar sem er á spjaldið · Ctrl+V límir skjáskot · myndir, PDF, Word, Excel (≤ 25 MB)</div>
          <div class="_avx-list"></div>
        </div>
      </div>`;
    // nóta
    const ta = box.querySelector('._avx-nota');
    if (ta) ta.addEventListener('input', () => {
      clearTimeout(_noteTimers[coId]); ta.style.borderColor = '#fcd34d';
      _noteTimers[coId] = setTimeout(async () => {
        const ok = await saveNote(coId, ta.value);
        ta.style.borderColor = ok ? '#86efac' : '#fca5a5';
        const s = box.querySelector('._avx-lbl .ok'); if (s && ok) { s.style.opacity = 1; setTimeout(() => { s.style.opacity = 0; }, 1500); }
      }, 700);
    });
    // viðhengi
    const inp = box.querySelector('input[type=file]');
    box.querySelector('[data-act=pick]').addEventListener('click', () => inp.click());
    inp.addEventListener('change', () => { uploadFiles(coId, inp.files, box); inp.value = ''; });
    box.querySelector('[data-act=paste]').addEventListener('click', () => pasteFromClipboard(coId, box));
    box.addEventListener('paste', (e) => {
      const files = [...((e.clipboardData && e.clipboardData.items) || [])].filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean).map(asNamed);
      if (!files.length) return;                      // venjulegur texti → látið í friði
      e.preventDefault(); e.stopPropagation(); uploadFiles(coId, files, box);
    });
    ['dragenter', 'dragover'].forEach(ev => box.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); box.classList.add('drop'); }));
    ['dragleave', 'drop'].forEach(ev => box.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); box.classList.remove('drop'); }));
    box.addEventListener('drop', (e) => uploadFiles(coId, (e.dataTransfer && e.dataTransfer.files) || [], box));
    // ferðir
    box.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const g = b.dataset.go;
      if (g === 'close') return close();
      if (g === 'detail') { if (window.VidskDetail && VidskDetail.show) return VidskDetail.show(coId); if (window.AllirVidsk && AllirVidsk.openDetail) return AllirVidsk.openDetail(coId); }
      if (g === 'company') { if (window._openCompanySafe) return window._openCompanySafe(coId); if (window.Companies && Companies.openDetail) return Companies.openDetail(coId); toast('Fyrirtækjaspjald ekki tiltækt'); }
    }));
    box.addEventListener('click', e => e.stopPropagation());   // röðin má ekki halda að smellt hafi verið á hana
    renderList(coId, box);
    return box;
  }

  // ── Borðið: röð → spjald undir röðinni ────────────────────────────────────
  function close() {
    document.querySelectorAll('tr._avx-panel').forEach(tr => tr.remove());
    openId = null;
  }
  function toggle(coId, rowEl) {
    coId = +coId;
    if (openId === coId) return close();
    close();
    const row = rowEl || document.querySelector('#view-allir-vidsk ._av-row[data-co-id="' + coId + '"]');
    if (!row) { if (window.VidskDetail && VidskDetail.show) VidskDetail.show(coId); return; }
    const tr = document.createElement('tr'); tr.className = '_avx-panel';
    const td = document.createElement('td'); td.colSpan = (row.children.length || 9); tr.appendChild(td);
    td.appendChild(buildBox(coId));
    row.insertAdjacentElement('afterend', tr);
    openId = coId;
    const ta = td.querySelector('._avx-nota'); if (ta) setTimeout(() => ta.focus({ preventScroll: true }), 50);
    try { tr.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) {}
  }
  // 157 teiknar töfluna upp á nýtt við síur/leit/röðun — spjaldið kemur aftur ef röðin er enn til.
  const view = () => document.getElementById('view-allir-vidsk');
  let _reopen = null;
  function watchBoard() {
    const v = view(); if (!v || v.__avxWatched) return; v.__avxWatched = true;
    new MutationObserver(() => {
      if (openId == null) return;
      clearTimeout(_reopen);
      _reopen = setTimeout(() => {
        if (document.querySelector('tr._avx-panel')) return;
        const row = document.querySelector('#view-allir-vidsk ._av-row[data-co-id="' + openId + '"]');
        if (row) { const id = openId; openId = null; toggle(id, row); } else openId = null;
      }, 60);
    }).observe(v, { childList: true, subtree: true });
  }
  // KPI-spjöldin efst virka sem síur (157 merkir þau data-kpi → hnappur með sama nafni).
  document.addEventListener('click', (e) => {
    const k = e.target.closest && e.target.closest('#view-allir-vidsk [data-kpi]'); if (!k) return;
    const want = k.dataset.kpi; const v = view(); if (!v) return;
    const btn = v.querySelector('._av-ft[data-filter="' + want + '"]') || v.querySelector('._av-xft[data-xfilter="' + want + '"]');
    if (btn) btn.click(); else toast('Engin sía fyrir þetta spjald');
  });

  // ── Kúnna-síðan (158): sami viðhengja-kubbur undir 📝 Athugasemdir ───────
  function mountDetail() {
    const ta = document.getElementById('_vd-athuga-ta'); if (!ta) return;
    const card = ta.closest('div'); if (!card || card.parentElement.querySelector('._avx[data-detail]')) return;
    const m = (card.parentElement.textContent.match(/Viðskiptavinur ID #(\d+)/) || [])[1];
    const coId = +m || (window.VidskDetail && VidskDetail.currentId && VidskDetail.currentId()) || null;
    if (!coId) return;
    const box = buildBox(coId, { detail: true }); box.dataset.detail = '1';
    box.style.margin = '0 0 14px'; box.style.borderRadius = '12px'; box.style.borderTop = '1px solid rgba(20,24,34,.14)';
    card.insertAdjacentElement('afterend', box);
  }

  // Kapphlaup sem var til fyrir: borðið teiknast þegar flipinn opnast, oft ÁÐUR en
  // Companies.list er komið — og ekkert teiknar aftur (loadDocStatus o.fl. eru „einu sinni").
  // Þá stendur borðið í „0 fyrirtæki" með tóma töflu. Sé FJÖLDI-spjaldið 0 en gögnin komin
  // → teikna aftur. Snertir ekki síur/leit (FJÖLDI telur allt, óháð síu).
  function vaktaTomtBord() {
    const v = view(); if (!v || !v.classList.contains('active')) return;
    const n = ((window.Companies && Companies.list) || []).length; if (!n) return;
    const kpi = v.querySelector('[data-kpi="all"]'); if (!kpi) return;
    const talan = (kpi.textContent.match(/\d[\d.]*/) || ['0'])[0].replace(/\./g, '');
    if (talan !== '0') return;
    if (window.AllirVidsk && AllirVidsk.show) AllirVidsk.show();
  }

  function boot() {
    watchBoard();
    mountDetail();
    new MutationObserver(() => { watchBoard(); mountDetail(); }).observe(document.body, { childList: true, subtree: true });
    setInterval(vaktaTomtBord, 1500);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.VidskAStadnum = { toggle, close, mount: buildBox, version: 'v1' };
})();
