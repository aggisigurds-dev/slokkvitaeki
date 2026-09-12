/* === ÞJÓNUSTUVER ATTACHMENTS (183) — upload your own files to a beiðni ========
 *
 * Adds a "📎 Viðhengi" section to the Þjónustuver beiðni modal (existing beiðnir
 * only) so the operator can attach their OWN files / photos to a request —
 * separate from the "Skjöl & senda" Drive-doc → email flow.
 *
 * Files go to Supabase Storage bucket `thjonustubeidni-attachments` and are
 * recorded in `thjonustubeidni_attachments` (source='upload'). The same table
 * also holds Drive-picked docs (source='drive'), so this section lists both but
 * only lets you remove what's stored here.
 *
 * Exposes window.TvAttach:
 *   - wire(containerEl, beidniId)  → render + wire the section into a container
 *   - loadBadges()                 → refresh the 📎 N row badges
 *
 * Patch 182's openForm() drops a <div id="_tv-attach"> into the modal body and
 * calls TvAttach.wire(); badges paint onto #view-thjonustuver ._tv-row[data-id].
 * ============================================================================ */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.TvAttach && window.TvAttach._installed) return;

  const BUCKET = 'thjonustubeidni-attachments';
  const TABLE = 'thjonustubeidni_attachments';

  function getSB() {
    if (window.DB && window.DB.sb) return window.DB.sb;
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) return null;
    if (!window.__tvaSB) window.__tvaSB = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    return window.__tvaSB;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function driveUrl(id) { return id && String(id).indexOf('sb:') !== 0 ? 'https://brunaholf.netlify.app/api/skjal?id=' + encodeURIComponent(id) : ''; }

  // ── Styles ────────────────────────────────────────────────────────────────
  if (!document.getElementById('_tva-style')) {
    const s = document.createElement('style');
    s.id = '_tva-style';
    s.textContent = `
      .tva-sec{margin-top:4px;border:1px solid #e2e8f0;border-radius:11px;padding:13px 14px}
      .tva-sec h4{margin:0 0 9px;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.04em}
      .tva-btns{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
      .tva-btn{padding:8px 13px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:12.5px;color:#334155;display:inline-flex;align-items:center;gap:6px}
      .tva-btn:hover:not(:disabled){background:#f8fafc;border-color:#94a3b8}
      .tva-btn:disabled{opacity:.5;cursor:not-allowed}
      .tva-btn.primary{background:#2563eb;color:#fff;border-color:#2563eb}
      .tva-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}
      .tva-tile{position:relative;aspect-ratio:1;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:#f8fafc;cursor:pointer}
      .tva-tile:hover{border-color:#94a3b8}
      .tva-tile img{width:100%;height:100%;object-fit:cover;display:block}
      .tva-tile.file{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:7px;text-align:center;font-size:10px;color:#475569}
      .tva-tile.file .ico{font-size:26px;margin-bottom:4px}
      .tva-tile.file .nm{line-height:1.2;max-height:36px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;word-break:break-word}
      .tva-tile .del{position:absolute;top:3px;right:3px;width:19px;height:19px;border:none;border-radius:50%;background:rgba(15,23,42,.62);color:#fff;font-size:11px;line-height:19px;cursor:pointer;padding:0}
      .tva-tile .src{position:absolute;bottom:3px;left:3px;font-size:13px;filter:drop-shadow(0 1px 1px rgba(0,0,0,.4))}
      .tva-empty{font-size:12px;color:#94a3b8;padding:4px 0}
      .tva-badge{display:inline-flex;align-items:center;gap:2px;font-size:11px;color:#475569;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:99px;padding:0 7px;margin-left:6px;font-weight:600}`;
    document.head.appendChild(s);
  }

  // ── Data ──────────────────────────────────────────────────────────────────
  async function uploadFile(beidniId, file) {
    const SB = getSB();
    const ts = Date.now();
    const safe = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const path = beidniId + '/' + ts + '-' + safe;
    const { error: upErr } = await SB.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || 'application/octet-stream', upsert: false
    });
    if (upErr) throw upErr;
    const { data: u } = SB.storage.from(BUCKET).getPublicUrl(path);
    const { error: insErr } = await SB.from(TABLE).insert({
      beidni_id: beidniId, name: file.name, path, url: u && u.publicUrl || '',
      mime_type: file.type || null, size: file.size, source: 'upload'
    });
    if (insErr) throw insErr;
  }
  async function listAttachments(beidniId) {
    const SB = getSB();
    const { data, error } = await SB.from(TABLE).select('*').eq('beidni_id', beidniId).order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }
  async function deleteAttachment(att) {
    const SB = getSB();
    if (att.path) { try { await SB.storage.from(BUCKET).remove([att.path]); } catch (_) {} }
    const { error } = await SB.from(TABLE).delete().eq('id', att.id);
    if (error) throw error;
  }

  // ── Tile rendering ────────────────────────────────────────────────────────
  function tileHTML(att) {
    const isImg = (att.mime_type || '').startsWith('image/');
    const open = att.url || driveUrl(att.drive_file_id);
    const ext = ((att.name || '').split('.').pop() || '').toLowerCase();
    let ico = '📎';
    if (ext === 'pdf') ico = '📄';
    else if (['doc', 'docx'].includes(ext)) ico = '📝';
    else if (['xls', 'xlsx', 'csv'].includes(ext)) ico = '📊';
    else if (['mp4', 'mov', 'webm', 'avi'].includes(ext)) ico = '🎬';
    const srcIco = att.source === 'drive' ? '☁️' : '';
    return `<div class="tva-tile ${isImg ? 'image' : 'file'}" data-id="${esc(att.id)}" data-url="${esc(open)}">
      ${isImg ? `<img src="${esc(open)}" alt="${esc(att.name || '')}" loading="lazy">`
              : `<div class="ico">${ico}</div><div class="nm">${esc(att.name || 'skrá')}</div>`}
      ${srcIco ? `<span class="src" title="Drive-skjal">${srcIco}</span>` : ''}
      <button class="del" data-id="${esc(att.id)}" title="Eyða">✕</button>
    </div>`;
  }

  // ── Section wiring ────────────────────────────────────────────────────────
  function wire(container, beidniId) {
    if (!container || !beidniId) return;
    if (!getSB()) { container.innerHTML = ''; return; }
    container.innerHTML = `
      <div class="tva-sec">
        <h4>📎 Viðhengi</h4>
        <div class="tva-btns">
          <button type="button" class="tva-btn primary" data-act="photo">📷 Taka mynd</button>
          <button type="button" class="tva-btn" data-act="file">📎 Velja skrá</button>
        </div>
        <input type="file" data-inp="photo" accept="image/*" capture="environment" multiple style="display:none">
        <input type="file" data-inp="file" multiple style="display:none">
        <div data-list><div class="tva-empty">Hleður…</div></div>
      </div>`;
    const listEl = container.querySelector('[data-list]');
    const photoBtn = container.querySelector('[data-act="photo"]');
    const fileBtn = container.querySelector('[data-act="file"]');
    const photoInp = container.querySelector('[data-inp="photo"]');
    const fileInp = container.querySelector('[data-inp="file"]');
    let atts = [];

    async function refresh() {
      try {
        atts = await listAttachments(beidniId);
        listEl.innerHTML = atts.length
          ? '<div class="tva-grid">' + atts.map(tileHTML).join('') + '</div>'
          : '<div class="tva-empty">Engin viðhengi enn — taktu mynd eða veldu skrá.</div>';
        wireTiles();
      } catch (e) { listEl.innerHTML = '<div class="tva-empty" style="color:#dc2626">Villa: ' + esc(e.message) + '</div>'; }
    }
    function wireTiles() {
      listEl.querySelectorAll('.tva-tile').forEach(tile => {
        tile.addEventListener('click', ev => {
          if (ev.target.classList.contains('del')) return;
          const u = tile.dataset.url; if (u) window.open(u, '_blank', 'noopener');
        });
      });
      listEl.querySelectorAll('.tva-tile .del').forEach(b => {
        b.addEventListener('click', async ev => {
          ev.stopPropagation();
          const att = atts.find(a => String(a.id) === b.dataset.id); if (!att) return;
          const ok = window.Confirm && Confirm.show ? await Confirm.show('Eyða "' + (att.name || 'skránni') + '"?') : confirm('Eyða "' + (att.name || 'skránni') + '"?');
          if (!ok) return;
          try { await deleteAttachment(att); await refresh(); loadBadges(); }
          catch (e) { alert('Villa við að eyða: ' + e.message); }
        });
      });
    }
    async function handleFiles(files) {
      const arr = Array.from(files || []); if (!arr.length) return;
      photoBtn.disabled = fileBtn.disabled = true;
      listEl.innerHTML = '<div class="tva-empty">Hleður upp ' + arr.length + ' skrá…</div>';
      let failed = 0;
      for (const f of arr) { try { await uploadFile(beidniId, f); } catch (e) { console.error('tva upload', e); failed++; } }
      photoBtn.disabled = fileBtn.disabled = false;
      if (failed) alert(failed + ' af ' + arr.length + ' skrá tókst ekki að hlaða upp.');
      await refresh(); loadBadges();
      photoInp.value = ''; fileInp.value = '';
    }
    photoBtn.addEventListener('click', () => photoInp.click());
    fileBtn.addEventListener('click', () => fileInp.click());
    photoInp.addEventListener('change', () => handleFiles(photoInp.files));
    fileInp.addEventListener('change', () => handleFiles(fileInp.files));
    refresh();
  }

  // ── Row badges (📎 N) ─────────────────────────────────────────────────────
  let counts = new Map();
  let timer = null;
  async function loadBadges() {
    const SB = getSB(); if (!SB) return;
    try {
      const { data } = await SB.from(TABLE).select('beidni_id').limit(5000);
      const m = new Map();
      for (const r of (data || [])) m.set(String(r.beidni_id), (m.get(String(r.beidni_id)) || 0) + 1);
      counts = m; paintBadges();
    } catch (_) {}
  }
  function paintBadges() {
    document.querySelectorAll('#view-thjonustuver ._tv-row[data-id]').forEach(el => {
      el.querySelectorAll('.tva-badge').forEach(b => b.remove());
      const c = counts.get(String(el.dataset.id)); if (!c) return;
      const badge = document.createElement('span');
      badge.className = 'tva-badge'; badge.textContent = '📎 ' + c;
      // Card layout: append near the title; table layout: into the first text cell.
      const target = el.querySelector('._tv-title') || el.querySelector('td:nth-child(3)') || el;
      target.appendChild(badge);
    });
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(loadBadges, 250); }
  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1 && (n.id === 'view-thjonustuver' || (n.querySelector && n.querySelector('._tv-row')))) { schedule(); return; }
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });
  setTimeout(loadBadges, 1200);

  window.TvAttach = { _installed: true, wire, loadBadges, BUCKET, TABLE };
})();
