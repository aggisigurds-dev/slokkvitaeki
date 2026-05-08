/* === SKJÖL / ATTACHMENT v1 ===
 *
 * Bætir við "Skjöl" hluta í Samningar-sýninni hlið við Skjalasniðmát-hlutann.
 * Notandi getur:
 *   • Hlaðið inn skjölum í upprunalegu formi (PDF, Word, JPG, PNG, Excel, ...)
 *   • Skoðað í forskoðun (PDF + myndir)
 *   • Sótt skrána (download)
 *   • Prentað (PDF og myndir)
 *   • Eytt skjali
 *
 * Geymsla:
 *   - Supabase Storage í "samningar" bucket, undir möppunni "attachments/"
 *   - Metagögn í AppSettings.skjalasnidmat_files array (id, name, path,
 *     content_type, size, uploaded_at)
 *
 * Þetta gerir notanda kleift að:
 *   - Setja inn fyrirfram-undirritaða pdf/word skjöl sem á að halda óbreyttum
 *   - Vista skannanir og myndir af samningum
 *   - Halda öllum skjölum á einum stað í Samningum
 */
(() => {
  if (window.__docAttachmentsInstalled) return;
  window.__docAttachmentsInstalled = true;

  const BUCKET = 'samningar';
  const FOLDER = 'attachments';
  const STORAGE_KEY = 'skjalasnidmat_files';
  const MAX_SIZE_MB = 25;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function getSB() { return (window.DB && window.DB.sb) || null; }

  function fmtSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
  }

  function iconForType(ct, name) {
    const c = String(ct || '').toLowerCase();
    const n = String(name || '').toLowerCase();
    if (c.includes('pdf') || n.endsWith('.pdf')) return { ico: '📄', label: 'PDF', color: '#dc2626' };
    if (c.includes('image') || /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(n)) return { ico: '🖼', label: 'Mynd', color: '#0ea5e9' };
    if (c.includes('word') || /\.(docx?|odt|rtf)$/.test(n)) return { ico: '📝', label: 'Word', color: '#2563eb' };
    if (c.includes('excel') || c.includes('spreadsheet') || /\.(xlsx?|ods|csv)$/.test(n)) return { ico: '📊', label: 'Excel', color: '#16a34a' };
    if (c.includes('zip') || /\.(zip|rar|7z)$/.test(n)) return { ico: '📦', label: 'Zip', color: '#a855f7' };
    if (c.includes('text') || /\.(txt|md)$/.test(n)) return { ico: '📃', label: 'Texti', color: '#64748b' };
    return { ico: '📎', label: 'Skjal', color: '#475569' };
  }

  function isPreviewable(ct, name) {
    const c = String(ct || '').toLowerCase();
    const n = String(name || '').toLowerCase();
    return c.includes('pdf') || n.endsWith('.pdf') || c.includes('image') || /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(n);
  }

  function isPrintable(ct, name) {
    return isPreviewable(ct, name);
  }

  // ── List/save metadata in AppSettings ──────────────────────────────────────
  function getFilesList() {
    const stored = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || [];
    return Array.isArray(stored) ? stored : [];
  }

  async function saveFilesList(list) {
    if (!window.AppSettings || !window.AppSettings.save) return false;
    return await window.AppSettings.save({ [STORAGE_KEY]: list });
  }

  async function getPublicUrl(path) {
    const SB = getSB();
    if (!SB) return null;
    // Try signed URL first (works whether bucket is public or private)
    try {
      const r = await SB.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (r && r.data && r.data.signedUrl) return r.data.signedUrl;
    } catch (_) {}
    // Fall back to public URL
    try {
      const r = SB.storage.from(BUCKET).getPublicUrl(path);
      if (r && r.data && r.data.publicUrl) return r.data.publicUrl;
    } catch (_) {}
    return null;
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  async function uploadFile(file) {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return null; }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert('Skráin er stærri en ' + MAX_SIZE_MB + ' MB hámark.');
      return null;
    }
    const ts = Date.now();
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const path = FOLDER + '/' + ts + '_' + safeName;
    try {
      const r = await SB.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream'
      });
      if (r.error) {
        alert('Villa við upphlaðningu: ' + r.error.message);
        return null;
      }
      const meta = {
        id: 'f_' + ts + '_' + Math.random().toString(36).slice(2,8),
        name: file.name,
        path,
        content_type: file.type || '',
        size: file.size,
        uploaded_at: new Date().toISOString()
      };
      const list = getFilesList();
      list.unshift(meta);
      await saveFilesList(list);
      return meta;
    } catch (e) {
      alert('Villa: ' + (e.message || String(e)));
      return null;
    }
  }

  async function deleteFile(file) {
    const SB = getSB();
    if (!SB) return false;
    try {
      const r = await SB.storage.from(BUCKET).remove([file.path]);
      // ignore remove errors (file may already be gone) but proceed to remove from metadata
      if (r && r.error) console.warn('[doc-attach] storage remove error:', r.error.message);
    } catch (e) { console.warn('[doc-attach] storage remove exception:', e); }
    const list = getFilesList().filter(f => f.id !== file.id);
    return await saveFilesList(list);
  }

  // ── UI: section ────────────────────────────────────────────────────────────
  function injectSection() {
    const main = document.querySelector('#view-samningar #ct-main');
    if (!main) return;
    if (main.querySelector('._da-section')) return;

    const section = document.createElement('div');
    section.className = '_da-section';
    section.style.cssText = 'max-width:1180px;margin:24px auto 0;padding-top:18px;border-top:1px dashed #e2e8f0';
    section.innerHTML = renderSection();
    main.appendChild(section);
    wireSection(section);
  }

  function renderSection() {
    const files = getFilesList();
    const cards = files.length ? files.map(f => {
      const ic = iconForType(f.content_type, f.name);
      return '' +
      '<div class="_da-card" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px;box-shadow:0 1px 3px rgba(0,0,0,0.04)">' +
        '<div style="display:flex;justify-content:space-between;align-items:start;gap:8px">' +
          '<div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1">' +
            '<div style="font-size:24px;line-height:1;flex-shrink:0">' + ic.ico + '</div>' +
            '<div style="min-width:0;flex:1">' +
              '<div style="font-weight:700;font-size:13px;color:#0f172a;line-height:1.3;word-break:break-word">' + esc(f.name) + '</div>' +
              '<div style="font-size:10px;color:#64748b;margin-top:2px">' + fmtSize(f.size) + ' · ' + fmtDate(f.uploaded_at) + '</div>' +
            '</div>' +
          '</div>' +
          '<span style="font-size:9px;font-weight:700;background:' + ic.color + '15;color:' + ic.color + ';padding:2px 6px;border-radius:99px;text-transform:uppercase;letter-spacing:0.04em;flex-shrink:0">' + ic.label + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:5px;margin-top:auto;flex-wrap:wrap">' +
          (isPreviewable(f.content_type, f.name)
            ? '<button class="_da-open btn btn-primary btn-sm" data-id="' + esc(f.id) + '" style="flex:1">📂 Opna</button>'
            : '<button class="_da-download btn btn-primary btn-sm" data-id="' + esc(f.id) + '" style="flex:1">⬇ Sækja</button>') +
          (isPrintable(f.content_type, f.name)
            ? '<button class="_da-print btn btn-outline btn-sm" data-id="' + esc(f.id) + '" title="Prenta">🖨</button>'
            : '') +
          '<button class="_da-download2 btn btn-outline btn-sm" data-id="' + esc(f.id) + '" title="Sækja">⬇</button>' +
          '<button class="_da-del btn btn-outline btn-sm" data-id="' + esc(f.id) + '" style="color:#dc2626;border-color:#fecaca" title="Eyða">✕</button>' +
        '</div>' +
      '</div>';
    }).join('') : '<div style="grid-column:1/-1;padding:30px;text-align:center;color:#94a3b8;font-size:13px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px">Engin skjöl hlaðin enn — smelltu á <strong>+ Hlaða inn skjali</strong> til að byrja</div>';

    return '' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">' +
        '<div>' +
          '<h2 style="margin:0;font-size:18px;color:#0f172a">📎 Skjöl / Viðhengi</h2>' +
          '<div style="font-size:12px;color:#64748b;margin-top:2px">Upprunaleg skjöl (PDF, Word, myndir, Excel, …) — geymd í upprunalegu formi.</div>' +
        '</div>' +
        '<button class="_da-upload btn btn-primary" style="padding:9px 16px">+ Hlaða inn skjali</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">' + cards + '</div>' +
      '<input type="file" id="_da-file-input" accept="*/*" style="display:none">';
  }

  function wireSection(section) {
    const fileInput = section.querySelector('#_da-file-input');

    section.addEventListener('click', async e => {
      const upBtn = e.target.closest('._da-upload');
      const openBtn = e.target.closest('._da-open');
      const dlBtn = e.target.closest('._da-download, ._da-download2');
      const prBtn = e.target.closest('._da-print');
      const delBtn = e.target.closest('._da-del');

      if (upBtn) { e.stopPropagation(); fileInput.click(); return; }

      if (openBtn) {
        e.stopPropagation();
        const f = getFilesList().find(x => x.id === openBtn.dataset.id);
        if (f) openPreview(f);
        return;
      }

      if (dlBtn) {
        e.stopPropagation();
        const f = getFilesList().find(x => x.id === dlBtn.dataset.id);
        if (f) downloadFile(f);
        return;
      }

      if (prBtn) {
        e.stopPropagation();
        const f = getFilesList().find(x => x.id === prBtn.dataset.id);
        if (f) printFile(f);
        return;
      }

      if (delBtn) {
        e.stopPropagation();
        const f = getFilesList().find(x => x.id === delBtn.dataset.id);
        if (!f) return;
        if (confirm('Eyða skjalinu "' + f.name + '"? Þetta er ekki afturkræft.')) {
          delBtn.disabled = true;
          await deleteFile(f);
          refreshSection();
        }
        return;
      }
    });

    fileInput.addEventListener('change', async e => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      // Show progress hint
      const upBtn = section.querySelector('._da-upload');
      if (upBtn) {
        upBtn.disabled = true;
        upBtn.textContent = '⏳ Hleður upp...';
      }
      const result = await uploadFile(file);
      if (upBtn) {
        upBtn.disabled = false;
        upBtn.textContent = '+ Hlaða inn skjali';
      }
      fileInput.value = '';
      if (result) {
        if (window.Toast && Toast.show) Toast.show('✓ Skjal hlaðið inn');
        refreshSection();
      }
    });
  }

  function refreshSection() {
    const section = document.querySelector('._da-section');
    if (!section) { injectSection(); return; }
    section.innerHTML = renderSection();
    wireSection(section);
  }

  // ── Preview / print / download ─────────────────────────────────────────────
  async function openPreview(file) {
    const url = await getPublicUrl(file.path);
    if (!url) { alert('Gat ekki opnað skrá. Athugaðu nettengingu.'); return; }
    const ic = iconForType(file.content_type, file.name);
    const isPdf = ic.label === 'PDF';
    const isImg = ic.label === 'Mynd';

    let dlg = document.getElementById('_da-preview');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_da-preview';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100023;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;padding:0';
    dlg.innerHTML =
      '<div style="padding:12px 18px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:10px">' +
        '<div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">' +
          '<span style="font-size:22px;line-height:1">' + ic.ico + '</span>' +
          '<div style="min-width:0">' +
            '<div style="font-weight:700;font-size:14px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(file.name) + '</div>' +
            '<div style="font-size:11px;color:#94a3b8;margin-top:2px">' + fmtSize(file.size) + ' · ' + fmtDate(file.uploaded_at) + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-shrink:0">' +
          '<button class="_dap-print" type="button" style="padding:8px 14px;background:#fff;color:#0f172a;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600">🖨 Prenta</button>' +
          '<a href="' + esc(url) + '" download="' + esc(file.name) + '" target="_blank" rel="noopener" style="padding:8px 14px;background:#1e293b;color:#fff;border:1px solid #475569;border-radius:7px;text-decoration:none;font-size:13px;font-weight:600">⬇ Sækja</a>' +
          '<button id="_dap-x" type="button" style="background:none;border:1px solid #475569;color:#cbd5e1;font-size:20px;width:38px;height:38px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
      '</div>' +
      '<div style="flex:1;background:#1e293b;display:flex;align-items:center;justify-content:center;padding:0;overflow:hidden">' +
        (isPdf
          ? '<iframe src="' + esc(url) + '" style="width:100%;height:100%;border:none;background:#fff"></iframe>'
          : isImg
          ? '<img src="' + esc(url) + '" alt="' + esc(file.name) + '" style="max-width:100%;max-height:100%;object-fit:contain">'
          : '<div style="color:#cbd5e1;text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:12px">' + ic.ico + '</div><div>Forskoðun ekki tiltæk fyrir þetta skjal.</div><div style="margin-top:8px;font-size:13px;color:#94a3b8">Sæktu eða prentaðu skjalið með takkunum hér að ofan.</div></div>'
        ) +
      '</div>';
    document.body.appendChild(dlg);

    function close() { dlg.remove(); }
    dlg.querySelector('#_dap-x').addEventListener('click', close);
    dlg.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    setTimeout(() => dlg.focus(), 50);

    dlg.querySelector('._dap-print').addEventListener('click', () => printFile(file, url));
  }

  async function downloadFile(file) {
    const url = await getPublicUrl(file.path);
    if (!url) { alert('Gat ekki sótt skrá.'); return; }
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 200);
  }

  async function printFile(file, urlIn) {
    const url = urlIn || await getPublicUrl(file.path);
    if (!url) { alert('Gat ekki opnað skjal til prentunar.'); return; }
    const ic = iconForType(file.content_type, file.name);
    const isPdf = ic.label === 'PDF';
    const isImg = ic.label === 'Mynd';
    if (!isPdf && !isImg) { alert('Aðeins PDF og myndir er hægt að prenta beint. Sæktu skjalið og prentaðu úr þess eigin forriti.'); return; }
    const win = window.open('', 'doc-print', 'width=900,height=1100');
    if (!win) { alert('Sprettigluggi var lokaður — leyfðu sprettiglugga til að prenta.'); return; }
    if (isPdf) {
      win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(file.name) + '</title>' +
        '<style>html,body{margin:0;height:100%;background:#525659}iframe{border:none;width:100%;height:100%}</style></head><body>' +
        '<iframe src="' + esc(url) + '" onload="setTimeout(function(){try{this.contentWindow.print();}catch(e){window.print();}},500)"></iframe>' +
        '</body></html>');
    } else {
      win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(file.name) + '</title>' +
        '<style>@media print{@page{size:A4;margin:14mm}}body{margin:0;padding:14mm;background:#fff;text-align:center;font-family:Arial,Helvetica,sans-serif}img{max-width:100%;max-height:90vh;object-fit:contain}@media print{body{padding:0}img{max-height:none}}</style>' +
        '</head><body>' +
        '<img src="' + esc(url) + '" alt="' + esc(file.name) + '" onload="setTimeout(function(){window.print();},250)">' +
        '</body></html>');
    }
    win.document.close();
  }

  // ── Mount when Samningar view opens ────────────────────────────────────────
  document.addEventListener('view-shown', e => {
    if (e && e.detail && e.detail.name === 'samningar') {
      setTimeout(injectSection, 250);
      setTimeout(injectSection, 900);
    }
  });
  setInterval(() => {
    const view = document.getElementById('view-samningar');
    if (view && view.classList.contains('active') && !view.querySelector('._da-section')) {
      injectSection();
    }
  }, 1500);

  // Refresh on AppSettings change (cross-device sync)
  if (window.AppSettings && typeof window.AppSettings.onChange === 'function') {
    window.AppSettings.onChange(() => {
      const view = document.getElementById('view-samningar');
      if (view && view.classList.contains('active')) refreshSection();
    });
  }

  window.DocAttachments = {
    list: getFilesList,
    upload: async () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.onchange = async () => { if (inp.files[0]) { await uploadFile(inp.files[0]); refreshSection(); } };
      inp.click();
    },
    refresh: refreshSection
  };

  console.log('[doc-attachments] installed — upload/preview/print/download for Samningar');
})();
/* === END SKJÖL / ATTACHMENT v1 === */
