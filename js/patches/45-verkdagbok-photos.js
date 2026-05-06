/* === VERKDAGBOK PHOTOS & ATTACHMENTS v2 === */
/* Photo capture and file attachment for Verkdagbók entries.
 *
 * Files are uploaded to a Supabase Storage bucket named 'verkdagbok'.
 * Metadata (path, public URL, MIME, size) is saved in verkdagbok_attachments.
 *
 * Zero external setup required — uses your existing Supabase project.
 *
 * SQL (already added to MIGRATION.sql):
 *   - verkdagbok_attachments table
 *   - storage.buckets row creating the public 'verkdagbok' bucket
 *   - storage.objects RLS policies allowing all read/write
 *
 * What happens on upload:
 *   • File/photo is uploaded to bucket 'verkdagbok' under entry_<id>/timestamp_name
 *   • Public URL stored in verkdagbok_attachments.url
 *   • Thumbnail = same URL for images (rendered by <img>)
 */
(() => {
  if (window.__vdPhotosInstalled) return;
  window.__vdPhotosInstalled = true;

  const BUCKET = 'verkdagbok';

  function getSB()  { return window.DB && window.DB.sb; }
  function esc(s)   { return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function fmtSize(bytes) { if(bytes<1024)return bytes+'B'; if(bytes<1048576)return(bytes/1024).toFixed(0)+'KB'; return(bytes/1048576).toFixed(1)+'MB'; }
  function fileIcon(mime) {
    if(!mime)return'📎';
    if(mime.startsWith('image/'))return'🖼';
    if(mime.includes('pdf'))return'📄';
    if(mime.includes('word')||mime.includes('document'))return'📝';
    if(mime.includes('sheet')||mime.includes('excel'))return'📊';
    if(mime.includes('video'))return'🎥';
    return'📎';
  }

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('vdp-style')) {
    const s = document.createElement('style');
    s.id = 'vdp-style';
    s.textContent = `
      .vdp-modal-wrap { position:fixed; inset:0; z-index:99999; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.5); padding:16px; }
      .vdp-modal { background:#fff; border-radius:16px; padding:24px; max-width:560px; width:100%; max-height:88vh; overflow:auto; box-shadow:0 24px 64px rgba(0,0,0,.3); }
      .vdp-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
      .vdp-hd h3 { margin:0; font-size:16px; font-weight:700; }
      .vdp-actions-row { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
      .vdp-btn-pick { flex:1; min-width:140px; padding:14px; border:2px dashed var(--brd,#cbd5e1); border-radius:12px; background:#f8fafc; cursor:pointer; font-size:14px; font-weight:600; color:var(--ink2,#475569); display:flex; flex-direction:column; gap:4px; align-items:center; }
      .vdp-btn-pick:hover { border-color:var(--blu,#3b82f6); background:#eff6ff; color:var(--blu,#3b82f6); }
      .vdp-btn-pick .ico { font-size:24px; }
      .vdp-list { display:flex; flex-direction:column; gap:8px; }
      .vdp-item { display:flex; align-items:center; gap:10px; padding:8px; border:1px solid var(--brd,#e2e8f0); border-radius:10px; }
      .vdp-thumb { width:48px; height:48px; border-radius:8px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-size:22px; overflow:hidden; flex-shrink:0; }
      .vdp-thumb img { width:100%; height:100%; object-fit:cover; }
      .vdp-info { flex:1; min-width:0; }
      .vdp-name { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .vdp-sub { font-size:11px; color:var(--ink3,#64748b); }
      .vdp-del { background:none; border:none; cursor:pointer; color:#dc2626; font-size:16px; padding:4px 8px; }
      .vdp-progress { padding:12px; background:#eff6ff; border-radius:10px; color:var(--blu,#3b82f6); font-size:13px; text-align:center; }
      .vdp-empty { padding:24px; text-align:center; color:var(--ink3,#64748b); font-size:13px; }
      .vdp-strip { display:flex; gap:6px; margin-top:8px; flex-wrap:wrap; }
      .vdp-strip-thumb { width:56px; height:56px; border-radius:8px; background:#f1f5f9; cursor:pointer; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:20px; }
      .vdp-strip-thumb img { width:100%; height:100%; object-fit:cover; }
      .vdp-cam-btn { background:none; border:none; cursor:pointer; padding:6px; font-size:18px; position:relative; }
      .vdp-cam-btn .badge { position:absolute; top:-2px; right:-2px; background:#dc2626; color:#fff; font-size:10px; font-weight:700; border-radius:8px; padding:1px 5px; min-width:14px; }
      .vdp-error { padding:12px; background:#fef2f2; border-radius:10px; color:#dc2626; font-size:13px; }
    `;
    document.head.appendChild(s);
  }

  // ── Open modal ────────────────────────────────────────────────────────────
  async function open(entryId) {
    document.getElementById('vdp-modal')?.remove();
    const m = document.createElement('div');
    m.id = 'vdp-modal';
    m.className = 'vdp-modal-wrap';
    m.dataset.entryId = entryId;
    m.onclick = e => { if (e.target === m) _close(); };
    m.innerHTML = `
      <div class="vdp-modal">
        <div class="vdp-hd">
          <h3>📷 Myndir og skjöl</h3>
          <button onclick="VDPhotos._close()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#64748b">✕</button>
        </div>
        <div class="vdp-actions-row">
          <label class="vdp-btn-pick">
            <span class="ico">📷</span><span>Taka mynd</span>
            <input type="file" accept="image/*" capture="environment" hidden onchange="VDPhotos._onFile(event)">
          </label>
          <label class="vdp-btn-pick">
            <span class="ico">📎</span><span>Hlaða upp skjali</span>
            <input type="file" accept="image/*,application/pdf,video/*,.doc,.docx,.xls,.xlsx" hidden onchange="VDPhotos._onFile(event)">
          </label>
        </div>
        <div id="vdp-progress"></div>
        <div id="vdp-list" class="vdp-list"><div class="vdp-empty">Hleður…</div></div>
      </div>`;
    document.body.appendChild(m);
    await _refreshList(entryId);
  }
  function _close() { document.getElementById('vdp-modal')?.remove(); }

  async function _refreshList(entryId) {
    const SB = getSB();
    const list = document.getElementById('vdp-list');
    if (!SB || !list) return;
    const { data, error } = await SB.from('verkdagbok_attachments')
      .select('*').eq('entry_id', entryId).order('created_at', { ascending: false });
    if (error) {
      list.innerHTML = `<div class="vdp-error">⚠️ ${esc(error.message)}<br><small>Keyrðu MIGRATION.sql í Supabase til að búa til töflu og bucket.</small></div>`;
      return;
    }
    if (!data || !data.length) {
      list.innerHTML = '<div class="vdp-empty">Engar myndir eða skjöl ennþá</div>';
      _refreshButton(entryId, 0);
      return;
    }
    list.innerHTML = data.map(a => {
      const isImg = (a.mime_type||'').startsWith('image/');
      const thumb = isImg ? `<img src="${esc(a.url)}" alt="${esc(a.name)}">` : fileIcon(a.mime_type);
      const sz = a.size ? fmtSize(a.size) : '';
      return `
        <div class="vdp-item">
          <div class="vdp-thumb">${thumb}</div>
          <div class="vdp-info">
            <div class="vdp-name"><a href="${esc(a.url)}" target="_blank" style="color:inherit;text-decoration:none">${esc(a.name)}</a></div>
            <div class="vdp-sub">${esc(a.mime_type||'')} ${sz}</div>
          </div>
          <button class="vdp-del" title="Eyða" onclick="VDPhotos._deleteAttachment(${a.id}, '${esc(a.path||'')}')">🗑</button>
        </div>`;
    }).join('');
    _refreshButton(entryId, data.length);
    _refreshStrip(entryId, data);
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  async function _onFile(ev) {
    const m = document.getElementById('vdp-modal');
    if (!m) return;
    const entryId = m.dataset.entryId;
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    ev.target.value = '';
    const SB = getSB();
    if (!SB) return;
    const prog = document.getElementById('vdp-progress');
    if (prog) prog.innerHTML = `<div class="vdp-progress">⏳ Hleð upp ${esc(f.name)} (${fmtSize(f.size)})…</div>`;
    try {
      const ts   = Date.now();
      const safe = (f.name||'file').replace(/[^a-zA-Z0-9._-]/g,'_');
      const path = `entry_${entryId}/${ts}_${safe}`;
      const up = await SB.storage.from(BUCKET).upload(path, f, { contentType: f.type, upsert:false });
      if (up.error) throw up.error;
      const { data: pub } = SB.storage.from(BUCKET).getPublicUrl(path);
      const url = pub && pub.publicUrl;
      const ins = await SB.from('verkdagbok_attachments').insert({
        // entry_id is UUID — pass through as string. parseInt() would truncate
        // the UUID at the first non-digit character and PostgreSQL would
        // reject the result with "invalid input syntax for type uuid".
        entry_id:   entryId,
        name:       f.name,
        path:       path,
        url:        url,
        mime_type:  f.type || '',
        size:       f.size || 0
      });
      if (ins.error) throw ins.error;
      if (prog) prog.innerHTML = '';
      await _refreshList(entryId);
    } catch (e) {
      console.error('[vdp] upload failed', e);
      if (prog) prog.innerHTML = `<div class="vdp-error">⚠️ Villa: ${esc(e.message||e)}</div>`;
    }
  }

  async function _deleteAttachment(id, path) {
    if (!confirm('Eyða þessari skrá?')) return;
    const SB = getSB();
    const m = document.getElementById('vdp-modal');
    const entryId = m && m.dataset.entryId;
    try {
      if (path) await SB.storage.from(BUCKET).remove([path]);
      await SB.from('verkdagbok_attachments').delete().eq('id', id);
      if (entryId) await _refreshList(entryId);
    } catch (e) {
      alert('Tókst ekki að eyða: ' + (e.message||e));
    }
  }

  // ── Inject 📷 button + thumbnail strip into Verkdagbók ───────────────────
  let _countCache = {}; // entryId -> count

  async function _loadAllCounts() {
    const SB = getSB();
    if (!SB) return {};
    const { data } = await SB.from('verkdagbok_attachments').select('entry_id, url, mime_type').order('created_at', { ascending:false });
    const map = {};
    (data||[]).forEach(a => {
      if (!map[a.entry_id]) map[a.entry_id] = { count:0, items:[] };
      map[a.entry_id].count++;
      if (map[a.entry_id].items.length < 4) map[a.entry_id].items.push(a);
    });
    _countCache = map;
    return map;
  }

  function _refreshButton(entryId, count) {
    document.querySelectorAll(`[data-vdp-btn="${entryId}"]`).forEach(btn => {
      const b = btn.querySelector('.badge');
      if (count > 0) {
        if (b) b.textContent = count;
        else btn.insertAdjacentHTML('beforeend', `<span class="badge">${count}</span>`);
      } else if (b) b.remove();
    });
    if (!_countCache[entryId]) _countCache[entryId] = { count:0, items:[] };
    _countCache[entryId].count = count;
  }

  function _refreshStrip(entryId, items) {
    const card = document.querySelector(`.vd-card[data-id="${entryId}"]`);
    if (!card) return;
    let strip = card.querySelector('.vdp-strip');
    if (!items || !items.length) { if (strip) strip.remove(); return; }
    if (!strip) {
      strip = document.createElement('div');
      strip.className = 'vdp-strip';
      const body = card.querySelector('.vd-body') || card;
      body.appendChild(strip);
    }
    strip.innerHTML = items.slice(0,4).map(a => {
      const isImg = (a.mime_type||'').startsWith('image/');
      const inner = isImg ? `<img src="${esc(a.url)}">` : fileIcon(a.mime_type);
      return `<div class="vdp-strip-thumb" onclick="event.stopPropagation();window.open('${esc(a.url)}','_blank')">${inner}</div>`;
    }).join('');
  }

  function _injectIntoRow(el) {
    if (!el || el.dataset.vdpDone) return;
    const entryId = el.dataset.id;
    if (!entryId) return;
    el.dataset.vdpDone = '1';

    // Find action area: .vd-actions for cards, td.act for table rows
    const actions = el.querySelector('.vd-actions') || el.querySelector('td.act');
    if (!actions) return;

    const cnt = _countCache[entryId]?.count || 0;
    const btn = document.createElement('button');
    btn.className = 'vdp-cam-btn';
    btn.dataset.vdpBtn = entryId;
    btn.title = 'Myndir og skjöl';
    btn.innerHTML = '📷' + (cnt>0?`<span class="badge">${cnt}</span>`:'');
    btn.onclick = e => { e.stopPropagation(); open(entryId); };
    actions.insertBefore(btn, actions.firstChild);

    // Thumbnail strip on cards
    if (el.classList.contains('vd-card') && _countCache[entryId]?.items?.length) {
      _refreshStrip(entryId, _countCache[entryId].items);
    }
  }

  const _obs = new MutationObserver(() => {
    const view = document.getElementById('view-verkdagbok');
    if (!view || view.style.display === 'none') return;
    view.querySelectorAll('.vd-card[data-id]:not([data-vdp-done]), .vd-row[data-id]:not([data-vdp-done])').forEach(_injectIntoRow);
  });
  _obs.observe(document.body, { childList:true, subtree:true });

  // Re-load counts when verkdagbok view is shown
  document.addEventListener('view-shown', e => {
    if (e.detail && e.detail.view === 'verkdagbok') {
      _loadAllCounts().then(() => {
        document.querySelectorAll('#view-verkdagbok .vd-card[data-id], #view-verkdagbok .vd-row[data-id]').forEach(el => {
          el.removeAttribute('data-vdp-done');
          _injectIntoRow(el);
        });
      });
    }
  });
  // First load too
  setTimeout(() => _loadAllCounts(), 1500);

  window.VDPhotos = { open, _close, _onFile, _deleteAttachment };
  console.log('[verkdagbok-photos] installed (Supabase Storage)');
})();
/* === END VERKDAGBOK PHOTOS === */
