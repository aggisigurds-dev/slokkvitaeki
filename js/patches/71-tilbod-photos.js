/* === TILBOD PHOTOS v1 ===
 *
 * Adds a "📷 Myndir" section to the Tilboð (quote) edit modal so the user
 * can attach photos / documents to a saved quote. Mirrors the Verkdagbók
 * photo flow:
 *  - Photos & files stored in Supabase Storage bucket "tilbod"
 *  - Metadata (name, path, url, mime, size) in `tilbod_attachments` table
 *
 * Required SQL (already added to MIGRATION.sql):
 *   - CREATE TABLE tilbod_attachments (...)
 *   - INSERT INTO storage.buckets ('tilbod', ...)
 *   - storage.objects policies tb_read / tb_insert / tb_update / tb_delete
 */
(() => {
  'use strict';
  if (typeof document === 'undefined') return;
  if (window.__tilbodPhotosInstalled) return;
  window.__tilbodPhotosInstalled = true;

  const BUCKET = 'tilbod';
  const TABLE  = 'tilbod_attachments';

  function getSB() { return window.DB && window.DB.sb; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
  }
  function fmtSize(b) {
    if (!b) return '';
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1024 / 1024).toFixed(1) + ' MB';
  }

  // ── Inject CSS once ──────────────────────────────────────────────────────
  if (!document.getElementById('tbph-style')) {
    const s = document.createElement('style');
    s.id = 'tbph-style';
    s.textContent = `
      .tbph-section { margin-top: 16px; padding-top: 12px; border-top: 1px solid #e2e8f0; }
      .tbph-hd { font-size: 11px; font-weight: 700; color: #64748b;
                 text-transform: uppercase; letter-spacing: .05em; margin-bottom: 8px; }
      .tbph-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
      .tbph-btn {
        display: flex; align-items: center; gap: 6px; padding: 8px 12px;
        background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 7px;
        color: #1e40af; font-size: 13px; font-weight: 600; cursor: pointer;
      }
      .tbph-btn:hover { background: #dbeafe; }
      .tbph-progress { font-size: 12px; color: #64748b; padding: 4px 0; }
      .tbph-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
                    border-radius: 6px; padding: 8px 10px; font-size: 12px; margin-top: 6px; }
      .tbph-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                   gap: 8px; margin-top: 8px; }
      .tbph-item { position: relative; background: #f8fafc; border: 1px solid #e2e8f0;
                   border-radius: 8px; overflow: hidden; aspect-ratio: 1; }
      .tbph-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .tbph-item .file { display: flex; align-items: center; justify-content: center;
                         width: 100%; height: 100%; font-size: 32px; color: #94a3b8; }
      .tbph-item .name {
        position: absolute; left: 0; right: 0; bottom: 0;
        background: linear-gradient(transparent, rgba(0,0,0,.7));
        color: #fff; padding: 14px 6px 4px; font-size: 10px;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .tbph-item .del {
        position: absolute; top: 4px; right: 4px;
        background: rgba(0,0,0,.6); color: #fff; border: none;
        width: 22px; height: 22px; border-radius: 50%;
        cursor: pointer; font-size: 12px; line-height: 1;
      }
      .tbph-empty { color: #94a3b8; font-size: 12px; padding: 8px 0; }
    `;
    document.head.appendChild(s);
  }

  // ── Render the photo section into the open Tilboð modal ──────────────────
  function injectIntoModal(tilbodId) {
    const mbody = document.getElementById('tb-mbody');
    if (!mbody) return;
    if (mbody.querySelector('.tbph-section')) return;
    const section = document.createElement('div');
    section.className = 'tbph-section';
    section.innerHTML = `
      <div class="tbph-hd">📷 Myndir og skjöl</div>
      <div class="tbph-actions">
        <label class="tbph-btn">
          📷 Taka mynd
          <input type="file" accept="image/*" capture="environment" hidden id="tbph-camera-${tilbodId || 'new'}">
        </label>
        <label class="tbph-btn">
          📎 Hlaða upp skjali
          <input type="file" accept="image/*,application/pdf" hidden id="tbph-file-${tilbodId || 'new'}">
        </label>
        ${!tilbodId ? '<span style="font-size:11px;color:#94a3b8;align-self:center">Vistaðu tilboðið fyrst til að bæta við myndum</span>' : ''}
      </div>
      <div class="tbph-progress" id="tbph-progress" style="display:none"></div>
      <div class="tbph-list" id="tbph-list">
        <div class="tbph-empty">Engar myndir eða skjöl ennþá</div>
      </div>`;
    mbody.appendChild(section);

    if (!tilbodId) return; // can't upload until the quote has an id
    // Wire upload + list
    const cam = document.getElementById('tbph-camera-' + tilbodId);
    const fil = document.getElementById('tbph-file-'   + tilbodId);
    if (cam) cam.addEventListener('change', e => uploadFile(tilbodId, e.target.files[0]).then(() => { e.target.value = ''; }));
    if (fil) fil.addEventListener('change', e => uploadFile(tilbodId, e.target.files[0]).then(() => { e.target.value = ''; }));
    refreshList(tilbodId);
  }

  async function uploadFile(tilbodId, file) {
    if (!file) return;
    const SB = getSB(); if (!SB) return;
    const prog = document.getElementById('tbph-progress');
    if (prog) {
      prog.style.display = 'block';
      prog.textContent = '⏳ Hleð upp ' + file.name + ' (' + fmtSize(file.size) + ')…';
    }
    try {
      const ts = Date.now();
      const safe = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = 'tilbod_' + tilbodId + '/' + ts + '_' + safe;
      const up = await SB.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;
      const { data: pub } = SB.storage.from(BUCKET).getPublicUrl(path);
      const url = pub && pub.publicUrl;
      const ins = await SB.from(TABLE).insert({
        tilbod_id: tilbodId,
        name:      file.name,
        path:      path,
        url:       url,
        mime_type: file.type || '',
        size:      file.size || 0
      });
      if (ins.error) throw ins.error;
      if (prog) prog.style.display = 'none';
      refreshList(tilbodId);
    } catch (e) {
      console.error('[tilbod-photos] upload failed', e);
      if (prog) {
        prog.style.display = 'block';
        prog.innerHTML = '<div class="tbph-error">⚠ Villa: ' + esc(e.message || String(e)) +
          '<br><small>Keyrðu MIGRATION.sql í Supabase til að setja upp tilbod-bucket og tilbod_attachments töflu.</small></div>';
      }
    }
  }

  async function refreshList(tilbodId) {
    const SB = getSB(); if (!SB) return;
    const list = document.getElementById('tbph-list');
    if (!list) return;
    const r = await SB.from(TABLE).select('*').eq('tilbod_id', tilbodId).order('created_at', { ascending: false });
    if (r.error) {
      list.innerHTML = '<div class="tbph-error">⚠ ' + esc(r.error.message) + '</div>';
      return;
    }
    const data = r.data || [];
    if (!data.length) {
      list.innerHTML = '<div class="tbph-empty">Engar myndir eða skjöl ennþá</div>';
      return;
    }
    list.innerHTML = data.map(a => {
      const isImg = (a.mime_type || '').startsWith('image/');
      const inner = isImg
        ? '<img src="' + esc(a.url) + '" alt="' + esc(a.name) + '">'
        : '<div class="file">📄</div>';
      return '<div class="tbph-item">'
        + '<a href="' + esc(a.url) + '" target="_blank" style="display:block;width:100%;height:100%">' + inner + '</a>'
        + '<button class="del" data-id="' + a.id + '" data-path="' + esc(a.path||'') + '" title="Eyða">×</button>'
        + '<div class="name">' + esc(a.name) + '</div>'
        + '</div>';
    }).join('');
    // Wire delete
    list.querySelectorAll('.del').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Eyða þessari skrá?')) return;
      const id = +b.getAttribute('data-id');
      const path = b.getAttribute('data-path');
      try {
        if (path) await SB.storage.from(BUCKET).remove([path]);
        await SB.from(TABLE).delete().eq('id', id);
        refreshList(tilbodId);
      } catch (e) {
        alert('Tókst ekki að eyða: ' + (e.message || e));
      }
    }));
  }

  // ── Hook into the existing Tilboð modal lifecycle ────────────────────────
  // The modal body has id `tb-mbody`. We watch the DOM and inject our
  // section whenever the modal appears, picking up the editing id from
  // the global `editingId` (exposed by 27-tilbod-quote.js's IIFE — fall
  // back to scraping the title text otherwise).
  let lastModalSeen = null;
  const obs = new MutationObserver(() => {
    const modal = document.getElementById('tb-modal');
    if (!modal) { lastModalSeen = null; return; }
    if (lastModalSeen === modal) return;
    lastModalSeen = modal;
    // Try a few times to give the modal body time to populate.
    function tryInject(retries) {
      const mbody = document.getElementById('tb-mbody');
      if (!mbody) {
        if (retries > 0) setTimeout(() => tryInject(retries - 1), 200);
        return;
      }
      // Find the editing tilbod id by looking it up on Tilbod / window state,
      // or by sniffing the title.
      const id = (window.Tilbod && window.Tilbod._editingId)
              || (window.__tilbodEditingId)
              || null;
      injectIntoModal(id);
    }
    tryInject(8);
  });
  obs.observe(document.body, { childList: true, subtree: true });

  window.TilbodPhotos = { refresh: refreshList, version: 'v1' };
  console.log('[tilbod-photos] v1 ready');
})();
/* === END TILBOD PHOTOS === */
