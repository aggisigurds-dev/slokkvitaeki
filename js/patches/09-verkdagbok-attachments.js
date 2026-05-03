/* === VERKDAGBOK ATTACHMENTS v1 === */
/* Adds files & photos to Verkdagbok entries:
   - 📷 Take photo (back camera on phone) and 📎 Attach files in the edit modal
   - Uploads to Supabase Storage bucket "verkdagbok-attachments"
   - Records each attachment in verkdagbok_attachments table
   - Image thumbnails in a grid; click to open full-size in new tab
   - Delete with confirm
   - 📎 N badge on cards/rows that have attachments */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__vdAttachmentsInstalled) return;
  window.__vdAttachmentsInstalled = true;

  const BUCKET = 'verkdagbok-attachments';

  function getSB() {
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) return null;
    if (!window.__vdaSB) {
      window.__vdaSB = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    }
    return window.__vdaSB;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  // ----- Styles -----
  const STYLE_ID = 'vda-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .vda-section {
        margin: 16px 0 0; padding-top: 14px;
        border-top: 1px dashed #e2e8f0;
      }
      .vda-section h4 {
        font-size: 11px; font-weight: 600; color: #475569;
        text-transform: uppercase; letter-spacing: .04em;
        margin: 0 0 8px;
      }
      .vda-buttons { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
      .vda-btn {
        padding: 8px 14px; border: 1px solid #e2e8f0; border-radius: 8px;
        background: #fff; cursor: pointer; font-size: 13px; color: #334155;
        display: inline-flex; align-items: center; gap: 6px;
        transition: all .15s; font-family: inherit;
      }
      .vda-btn:hover:not(:disabled) { border-color: #94a3b8; background: #f8fafc; }
      .vda-btn:disabled { opacity: .5; cursor: not-allowed; }
      .vda-btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
      .vda-btn.primary:hover:not(:disabled) { background: #1d4ed8; }
      .vda-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
        gap: 8px;
      }
      .vda-tile {
        position: relative; aspect-ratio: 1;
        border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;
        background: #f8fafc; cursor: pointer; transition: border-color .15s;
      }
      .vda-tile:hover { border-color: #94a3b8; }
      .vda-tile img {
        width: 100%; height: 100%; object-fit: cover; display: block;
      }
      .vda-tile.file {
        display: flex; flex-direction: column; align-items: center;
        justify-content: center; padding: 8px; text-align: center;
        font-size: 10px; color: #475569; word-break: break-word;
      }
      .vda-tile.file .icon { font-size: 28px; margin-bottom: 4px; }
      .vda-tile.file .name {
        line-height: 1.2; max-height: 36px; overflow: hidden;
        display: -webkit-box; -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
      }
      .vda-tile .del {
        position: absolute; top: 4px; right: 4px;
        width: 24px; height: 24px; border-radius: 50%;
        background: rgba(15,23,42,0.7); color: #fff; border: none;
        cursor: pointer; font-size: 12px; line-height: 1;
        display: flex; align-items: center; justify-content: center;
        opacity: 0; transition: opacity .15s, background .15s;
      }
      .vda-tile:hover .del, .vda-tile:active .del { opacity: 1; }
      .vda-tile .del:hover { background: #dc2626; opacity: 1; }
      @media (hover: none) { .vda-tile .del { opacity: .85; } }
      .vda-empty {
        padding: 20px; text-align: center; color: #94a3b8;
        font-style: italic; font-size: 12px;
        border: 1px dashed #e2e8f0; border-radius: 8px;
      }
      .vda-loading {
        padding: 16px; color: #64748b; font-size: 13px; text-align: center;
        border: 1px dashed #e2e8f0; border-radius: 8px;
      }
      .vda-setup {
        background: #fffbeb; border: 1px solid #fcd34d; border-radius: 8px;
        padding: 12px; font-size: 12px; color: #92400e;
      }
      .vda-setup strong { display: block; margin-bottom: 4px; }
      .vda-setup pre {
        background: #fff; padding: 10px; border-radius: 4px;
        font-size: 10px; line-height: 1.4; overflow-x: auto;
        max-height: 240px; margin: 8px 0 4px;
        font-family: 'Courier New', monospace; color: #0f172a;
      }
      .vda-setup .copy-btn {
        background: #475569; color: #fff; border: none;
        padding: 6px 12px; border-radius: 6px; font-size: 12px;
        cursor: pointer; margin-top: 4px;
      }
      .vda-setup .copy-btn:hover { background: #334155; }
      .vda-badge {
        background: #e0e7ff; color: #3730a3;
        padding: 2px 7px; border-radius: 99px;
        font-size: 11px; margin-left: 6px;
        display: inline-flex; align-items: center; gap: 3px;
        font-weight: 600;
      }
    `;
    document.head.appendChild(s);
  }

  // ----- Setup SQL -----
  const SETUP_SQL = [
    "-- Verkdagbók viðhengi: keyrðu þetta einu sinni í Supabase SQL Editor",
    "",
    "-- 1) Storage bucket (public)",
    "insert into storage.buckets (id, name, public)",
    "values ('verkdagbok-attachments', 'verkdagbok-attachments', true)",
    "on conflict (id) do update set public = true;",
    "",
    "-- 2) Storage policies for anon role",
    "drop policy if exists \"vda_anon_select\" on storage.objects;",
    "drop policy if exists \"vda_anon_insert\" on storage.objects;",
    "drop policy if exists \"vda_anon_delete\" on storage.objects;",
    "create policy \"vda_anon_select\" on storage.objects for select to anon, authenticated using (bucket_id = 'verkdagbok-attachments');",
    "create policy \"vda_anon_insert\" on storage.objects for insert to anon, authenticated with check (bucket_id = 'verkdagbok-attachments');",
    "create policy \"vda_anon_delete\" on storage.objects for delete to anon, authenticated using (bucket_id = 'verkdagbok-attachments');",
    "",
    "-- 3) Attachments table",
    "create table if not exists verkdagbok_attachments (",
    "  id uuid primary key default gen_random_uuid(),",
    "  entry_id uuid references verkdagbok(id) on delete cascade,",
    "  filename text,",
    "  storage_path text not null,",
    "  public_url text,",
    "  mime_type text,",
    "  size_bytes bigint,",
    "  uploaded_at timestamptz default now()",
    ");",
    "create index if not exists vda_entry_idx on verkdagbok_attachments(entry_id);",
    "",
    "alter table verkdagbok_attachments enable row level security;",
    "drop policy if exists \"vda_open_select\" on verkdagbok_attachments;",
    "drop policy if exists \"vda_open_insert\" on verkdagbok_attachments;",
    "drop policy if exists \"vda_open_delete\" on verkdagbok_attachments;",
    "create policy \"vda_open_select\" on verkdagbok_attachments for select to anon, authenticated using (true);",
    "create policy \"vda_open_insert\" on verkdagbok_attachments for insert to anon, authenticated with check (true);",
    "create policy \"vda_open_delete\" on verkdagbok_attachments for delete to anon, authenticated using (true);"
  ].join('\n');

  // ----- API -----
  let setupOK = null; // null = unknown, true = ready, false = needs SQL
  async function checkSetup() {
    if (setupOK !== null) return setupOK;
    const SB = getSB();
    if (!SB) return false;
    try {
      const { error } = await SB.from('verkdagbok_attachments').select('id').limit(1);
      setupOK = !error;
    } catch (e) { setupOK = false; }
    return setupOK;
  }

  async function uploadFile(entryId, file) {
    const SB = getSB();
    const ts = Date.now();
    const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const path = entryId + '/' + ts + '-' + safeName;
    const { error: upErr } = await SB.storage.from(BUCKET).upload(path, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false
    });
    if (upErr) throw upErr;
    const { data: urlData } = SB.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = urlData?.publicUrl || '';
    const { error: insErr } = await SB.from('verkdagbok_attachments').insert({
      entry_id: entryId,
      filename: file.name,
      storage_path: path,
      public_url: publicUrl,
      mime_type: file.type || null,
      size_bytes: file.size
    });
    if (insErr) throw insErr;
  }

  async function listAttachments(entryId) {
    const SB = getSB();
    const { data, error } = await SB
      .from('verkdagbok_attachments')
      .select('*')
      .eq('entry_id', entryId)
      .order('uploaded_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function deleteAttachment(att) {
    const SB = getSB();
    try { await SB.storage.from(BUCKET).remove([att.storage_path]); } catch(e) {}
    const { error } = await SB.from('verkdagbok_attachments').delete().eq('id', att.id);
    if (error) throw error;
  }

  // ----- UI rendering -----
  function tileHTML(att) {
    const isImage = (att.mime_type || '').startsWith('image/');
    const ext = ((att.filename || '').split('.').pop() || '').toLowerCase();
    let icon = '📎';
    if (ext === 'pdf') icon = '📄';
    else if (['doc','docx'].includes(ext)) icon = '📝';
    else if (['xls','xlsx','csv'].includes(ext)) icon = '📊';
    else if (['mp4','mov','webm','avi'].includes(ext)) icon = '🎬';
    return `
      <div class="vda-tile ${isImage ? 'image' : 'file'}" data-id="${esc(att.id)}" data-url="${esc(att.public_url || '')}">
        ${isImage
          ? `<img src="${esc(att.public_url)}" alt="${esc(att.filename || '')}" loading="lazy">`
          : `<div class="icon">${icon}</div><div class="name">${esc(att.filename || 'skrá')}</div>`}
        <button class="del" data-id="${esc(att.id)}" title="Eyða">✕</button>
      </div>`;
  }

  function listHTML(attachments) {
    if (!attachments.length) {
      return '<div class="vda-empty">Engin viðhengi enn — taktu mynd eða veldu skrá að ofan</div>';
    }
    return '<div class="vda-grid">' + attachments.map(tileHTML).join('') + '</div>';
  }

  function setupHTML() {
    return `
      <div class="vda-setup">
        <strong>⚠️ Viðhengi-uppsetning vantar</strong>
        Keyrðu þessa SQL skipun einu sinni í Supabase SQL Editor (síðan endurhladdu þessa síðu):
        <pre id="vda-setup-sql">${esc(SETUP_SQL)}</pre>
        <button class="copy-btn" id="vda-copy-sql">📋 Afrita SQL</button>
      </div>`;
  }

  function sectionHTML() {
    return `
      <div class="vda-section">
        <h4>📎 Skjöl og myndir</h4>
        <div class="vda-buttons">
          <button type="button" class="vda-btn primary" id="vda-photo-btn">📷 Taka mynd</button>
          <button type="button" class="vda-btn" id="vda-file-btn">📎 Velja skrá</button>
        </div>
        <input type="file" id="vda-photo-input" accept="image/*" capture="environment" multiple style="display:none">
        <input type="file" id="vda-file-input" multiple style="display:none">
        <div id="vda-list"><div class="vda-loading">Hleður…</div></div>
      </div>`;
  }

  // ----- Wire up an injected section -----
  async function wireSection(section, entryId) {
    const listEl = section.querySelector('#vda-list');
    const photoBtn = section.querySelector('#vda-photo-btn');
    const fileBtn = section.querySelector('#vda-file-btn');
    const photoInput = section.querySelector('#vda-photo-input');
    const fileInput = section.querySelector('#vda-file-input');

    if (!(await checkSetup())) {
      listEl.innerHTML = setupHTML();
      photoBtn.disabled = true;
      fileBtn.disabled = true;
      const copyBtn = listEl.querySelector('#vda-copy-sql');
      copyBtn?.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(SETUP_SQL); copyBtn.textContent = '✓ Afritað'; setTimeout(() => copyBtn.textContent = '📋 Afrita SQL', 1500); }
        catch (e) { alert('Gat ekki afritað — veldu SQL textann handvirkt og afritaðu.'); }
      });
      return;
    }

    let attachments = [];
    async function refresh() {
      try {
        attachments = await listAttachments(entryId);
        listEl.innerHTML = listHTML(attachments);
        wireTiles();
      } catch (e) {
        listEl.innerHTML = '<div class="vda-empty" style="color:#dc2626;">Villa: ' + esc(e.message) + '</div>';
      }
    }

    function wireTiles() {
      listEl.querySelectorAll('.vda-tile').forEach(tile => {
        tile.addEventListener('click', (ev) => {
          if (ev.target.classList.contains('del')) return;
          const url = tile.dataset.url;
          if (url) window.open(url, '_blank');
        });
      });
      listEl.querySelectorAll('.vda-tile .del').forEach(b => {
        b.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          const id = b.dataset.id;
          const att = attachments.find(a => a.id === id);
          if (!att) return;
          if (!confirm('Eyða "' + (att.filename || 'skránni') + '"?')) return;
          try { await deleteAttachment(att); await refresh(); }
          catch (e) { alert('Villa við að eyða: ' + e.message); }
        });
      });
    }

    async function handleFiles(files) {
      if (!files || !files.length) return;
      const arr = Array.from(files);
      photoBtn.disabled = true; fileBtn.disabled = true;
      listEl.innerHTML = '<div class="vda-loading">Hleður upp ' + arr.length + ' skrá' + (arr.length > 1 ? 'm' : '') + '…</div>';
      let failed = 0;
      for (const f of arr) {
        try { await uploadFile(entryId, f); }
        catch (e) { console.error('upload failed', e); failed++; }
      }
      photoBtn.disabled = false; fileBtn.disabled = false;
      if (failed > 0) alert(failed + ' af ' + arr.length + ' skrá tókust ekki að hlaða upp.');
      await refresh();
      photoInput.value = ''; fileInput.value = '';
    }

    photoBtn.addEventListener('click', () => photoInput.click());
    fileBtn.addEventListener('click', () => fileInput.click());
    photoInput.addEventListener('change', () => handleFiles(photoInput.files));
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    await refresh();
  }

  // ----- Hook into the Verkdagbok edit modal -----
  let pendingEditId = null;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.vd-edit');
    if (btn) pendingEditId = btn.dataset.id;
  }, true);

  async function injectIntoModal(modal) {
    if (!modal || modal.querySelector('.vda-section')) return;
    const entryId = pendingEditId;
    pendingEditId = null;
    if (!entryId) return;
    // Find the action button row (the div containing #ve-cancel)
    const cancelBtn = modal.querySelector('#ve-cancel');
    if (!cancelBtn) return;
    const actionsRow = cancelBtn.parentElement;
    if (!actionsRow) return;
    // Build section
    const wrap = document.createElement('div');
    wrap.innerHTML = sectionHTML();
    const section = wrap.firstElementChild;
    actionsRow.parentElement.insertBefore(section, actionsRow);
    await wireSection(section, entryId);
  }

  const obs = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.id === 'vd-edit-modal') { injectIntoModal(n); }
        else if (n.querySelector) {
          const found = n.querySelector('#vd-edit-modal');
          if (found) injectIntoModal(found);
        }
      }
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  // Also handle if modal is already open at install time
  setTimeout(() => {
    const m = document.getElementById('vd-edit-modal');
    if (m) injectIntoModal(m);
  }, 100);

  // ----- Card / row badges (count of attachments) -----
  let badgeCounts = new Map();
  let badgeRefreshTimer = null;
  async function loadBadgeCounts() {
    if (!(await checkSetup())) return;
    const SB = getSB();
    try {
      const { data } = await SB.from('verkdagbok_attachments').select('entry_id').limit(2000);
      const m = new Map();
      for (const r of (data || [])) m.set(r.entry_id, (m.get(r.entry_id) || 0) + 1);
      badgeCounts = m;
      paintBadges();
    } catch (e) {}
  }
  function paintBadges() {
    if (!badgeCounts.size) return;
    document.querySelectorAll('#view-verkdagbok .vd-card[data-id], #view-verkdagbok .vd-row[data-id]').forEach(el => {
      el.querySelectorAll('.vda-badge').forEach(b => b.remove());
      const c = badgeCounts.get(el.dataset.id);
      if (!c) return;
      const badge = document.createElement('span');
      badge.className = 'vda-badge';
      badge.textContent = '📎 ' + c;
      // Card layout: append to .vd-meta or .vd-body
      const card = el.classList.contains('vd-card');
      if (card) {
        let meta = el.querySelector('.vd-meta');
        if (!meta) {
          meta = document.createElement('div');
          meta.className = 'vd-meta';
          el.querySelector('.vd-body')?.appendChild(meta);
        }
        meta.appendChild(badge);
      } else {
        // Row: append to fyr-cell
        const cell = el.querySelector('.fyr-cell');
        if (cell) cell.appendChild(badge);
      }
    });
  }
  function scheduleBadgeRefresh() {
    clearTimeout(badgeRefreshTimer);
    badgeRefreshTimer = setTimeout(loadBadgeCounts, 250);
  }
  // Refresh badges when verkdagbok view re-renders
  const vdObs = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.target.id === 'vd-main' || m.target.closest?.('#vd-main')) {
        scheduleBadgeRefresh(); return;
      }
      for (const n of m.addedNodes) {
        if (n.nodeType === 1 && (n.id === 'vd-main' || n.querySelector?.('.vd-card, .vd-row'))) {
          scheduleBadgeRefresh(); return;
        }
      }
    }
  });
  vdObs.observe(document.body, { childList: true, subtree: true });
  setTimeout(loadBadgeCounts, 1000);
  setTimeout(loadBadgeCounts, 3000);

  window.VdAttachments = {
    refresh: loadBadgeCounts,
    setupSQL: SETUP_SQL,
    version: 'v1'
  };
})();
/* === END VERKDAGBOK ATTACHMENTS === */
