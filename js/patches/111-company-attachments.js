/* === COMPANY ATTACHMENTS v1 ===
 *
 * Bætir við „📎 Skjöl & skýrslur" hluta á fyrirtækisspjaldi þar sem
 * notandi getur hlaðið inn skjölum (PDF, Word, myndir, Excel, …) sem
 * tengjast því fyrirtæki — t.d. eldri úttektarskýrslum, þjónustusamningum,
 * undirrituðum tilboðum, myndum af tækjum, o.s.frv.
 *
 * Eiginleikar:
 *   • Hlaða inn skjali (drag-and-drop eða file picker)
 *   • Listi yfir öll skjöl tengd fyrirtækinu (sortað eftir dagsetningu)
 *   • Forskoðun (PDF + myndir) í lightbox
 *   • Sækja skjal
 *   • Prenta (PDF/myndir)
 *   • Eyða skjali
 *
 * Geymsla:
 *   • Skrár fara í Supabase Storage „samningar" bucket undir
 *     „company_attachments/<co_id>/" möppu
 *   • Metagögn í AppSettings.company_attachments[co_id] = [{id,name,path,...}]
 *     (samstillt milli tækja)
 *
 * Aðgangur: nýr hluti birtist neðst á hverju fyrirtækisspjaldi.
 */
(() => {
  if (window.__companyAttachmentsInstalled) return;
  window.__companyAttachmentsInstalled = true;

  const BUCKET = 'samningar';
  const FOLDER_PREFIX = 'company_attachments';
  const STORAGE_KEY = 'company_attachments'; // AppSettings key
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

  // ── Storage helpers ──────────────────────────────────────────────────────
  function getAllAttachments() {
    const stored = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || {};
    return (stored && typeof stored === 'object') ? stored : {};
  }
  function getCompanyAttachments(coId) {
    const all = getAllAttachments();
    const list = all[String(coId)];
    return Array.isArray(list) ? list : [];
  }
  async function saveCompanyAttachments(coId, list) {
    if (!window.AppSettings || !window.AppSettings.save) return false;
    const all = { ...getAllAttachments() };
    all[String(coId)] = list;
    return await window.AppSettings.save({ [STORAGE_KEY]: all });
  }
  async function getPublicUrl(path) {
    const SB = getSB();
    if (!SB) return null;
    try {
      const r = await SB.storage.from(BUCKET).createSignedUrl(path, 3600);
      if (r && r.data && r.data.signedUrl) return r.data.signedUrl;
    } catch (_) {}
    try {
      const r = SB.storage.from(BUCKET).getPublicUrl(path);
      if (r && r.data && r.data.publicUrl) return r.data.publicUrl;
    } catch (_) {}
    return null;
  }

  async function uploadAttachment(coId, file) {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return null; }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert('Skráin er stærri en ' + MAX_SIZE_MB + ' MB hámark.');
      return null;
    }
    const ts = Date.now();
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const path = FOLDER_PREFIX + '/' + coId + '/' + ts + '_' + safeName;
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
        id: 'a_' + ts + '_' + Math.random().toString(36).slice(2,8),
        name: file.name,
        path,
        content_type: file.type || '',
        size: file.size,
        uploaded_at: new Date().toISOString()
      };
      const list = getCompanyAttachments(coId);
      list.unshift(meta);
      await saveCompanyAttachments(coId, list);
      return meta;
    } catch (e) {
      alert('Villa: ' + (e.message || String(e)));
      return null;
    }
  }

  async function deleteAttachment(coId, file) {
    const SB = getSB();
    if (!SB) return false;
    try {
      const r = await SB.storage.from(BUCKET).remove([file.path]);
      if (r && r.error) console.warn('[company-attach] storage remove:', r.error.message);
    } catch (e) { console.warn('[company-attach] remove exception:', e); }
    const list = getCompanyAttachments(coId).filter(f => f.id !== file.id);
    return await saveCompanyAttachments(coId, list);
  }

  // ── UI: section on company detail ────────────────────────────────────────
  function getCompanyId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const editBtn = main.querySelector('button[onclick*="Companies.openEdit"]');
    if (!editBtn) return null;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/);
    return m ? +m[1] : null;
  }

  function injectSection() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const coId = getCompanyId();
    if (!coId) return;
    if (main.querySelector('._cat-section')) return;

    const section = document.createElement('div');
    section.className = '_cat-section';
    section.dataset.coId = coId;
    section.style.cssText = 'margin:18px 0 24px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.04)';
    section.innerHTML = renderSection(coId);

    // Insert near the bottom of companies-main (before the equipment table is fine)
    main.appendChild(section);
    wireSection(section, coId);
  }

  function renderSection(coId) {
    const list = getCompanyAttachments(coId);
    const cards = list.length ? list.map(f => {
      const ic = iconForType(f.content_type, f.name);
      return '' +
      '<div class="_cat-card" data-id="' + esc(f.id) + '" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px;box-shadow:0 1px 2px rgba(0,0,0,0.03)">' +
        '<div style="display:flex;align-items:flex-start;gap:8px">' +
          '<div style="font-size:24px;line-height:1;flex-shrink:0">' + ic.ico + '</div>' +
          '<div style="min-width:0;flex:1">' +
            '<div style="font-weight:700;font-size:13px;color:#0f172a;line-height:1.3;word-break:break-word">' + esc(f.name) + '</div>' +
            '<div style="font-size:11px;color:#64748b;margin-top:2px">' + fmtSize(f.size) + ' · ' + fmtDate(f.uploaded_at) + '</div>' +
          '</div>' +
          '<span style="font-size:9px;font-weight:700;background:' + ic.color + '15;color:' + ic.color + ';padding:2px 6px;border-radius:99px;text-transform:uppercase;letter-spacing:0.04em;flex-shrink:0">' + ic.label + '</span>' +
        '</div>' +
        '<div style="display:flex;gap:4px;margin-top:auto;flex-wrap:wrap">' +
          (isPreviewable(f.content_type, f.name)
            ? '<button class="_cat-open btn btn-primary btn-sm" data-id="' + esc(f.id) + '" style="flex:1;font-size:11px">📂 Opna</button>'
            : '<button class="_cat-download btn btn-primary btn-sm" data-id="' + esc(f.id) + '" style="flex:1;font-size:11px">⬇ Sækja</button>') +
          '<button class="_cat-download2 btn btn-outline btn-sm" data-id="' + esc(f.id) + '" title="Sækja" style="font-size:11px">⬇</button>' +
          '<button class="_cat-del btn btn-outline btn-sm" data-id="' + esc(f.id) + '" style="color:#dc2626;border-color:#fecaca;font-size:11px" title="Eyða">✕</button>' +
        '</div>' +
      '</div>';
    }).join('') : '<div style="grid-column:1/-1;padding:30px;text-align:center;color:#94a3b8;font-size:13px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px">Engin skjöl tengd þessu fyrirtæki ennþá — smelltu á <strong>+ Hlaða inn skjali</strong> til að byrja</div>';

    return '' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">' +
        '<div>' +
          '<h3 style="margin:0;font-size:15px;font-weight:700;color:#0f172a">📎 Skjöl & skýrslur</h3>' +
          '<div style="font-size:11px;color:#64748b;margin-top:2px">Eldri úttektarskýrslur, samningar, myndir, og önnur skjöl tengd þessu fyrirtæki.</div>' +
        '</div>' +
        '<button class="_cat-upload btn btn-primary btn-sm" style="padding:8px 14px">+ Hlaða inn skjali</button>' +
      '</div>' +
      '<div class="_cat-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px">' + cards + '</div>' +
      '<input type="file" class="_cat-file-input" accept="*/*" style="display:none">' +
      '<div class="_cat-dropzone" style="margin-top:10px;padding:14px;text-align:center;font-size:12px;color:#94a3b8;border:2px dashed transparent;border-radius:8px;transition:all .15s">Eða dragðu skjal hingað til að hlaða inn</div>';
  }

  function wireSection(section, coId) {
    const fileInput = section.querySelector('._cat-file-input');
    const dropzone = section.querySelector('._cat-dropzone');

    section.addEventListener('click', async e => {
      const upBtn = e.target.closest('._cat-upload');
      const openBtn = e.target.closest('._cat-open');
      const dlBtn = e.target.closest('._cat-download, ._cat-download2');
      const delBtn = e.target.closest('._cat-del');

      if (upBtn) { e.stopPropagation(); fileInput.click(); return; }

      if (openBtn) {
        e.stopPropagation();
        const f = getCompanyAttachments(coId).find(x => x.id === openBtn.dataset.id);
        if (f) openPreview(f);
        return;
      }

      if (dlBtn) {
        e.stopPropagation();
        const f = getCompanyAttachments(coId).find(x => x.id === dlBtn.dataset.id);
        if (f) downloadFile(f);
        return;
      }

      if (delBtn) {
        e.stopPropagation();
        const f = getCompanyAttachments(coId).find(x => x.id === delBtn.dataset.id);
        if (!f) return;
        if (confirm('Eyða skjalinu „' + f.name + '"? Þetta er ekki afturkræft.')) {
          delBtn.disabled = true;
          await deleteAttachment(coId, f);
          refreshSection(section, coId);
        }
        return;
      }
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      await doUpload(file);
      fileInput.value = '';
    });

    // Drag-and-drop
    if (dropzone) {
      ['dragenter', 'dragover'].forEach(ev =>
        dropzone.addEventListener(ev, e => {
          e.preventDefault();
          dropzone.style.borderColor = '#16a34a';
          dropzone.style.background = '#dcfce7';
          dropzone.style.color = '#166534';
        })
      );
      ['dragleave', 'drop'].forEach(ev =>
        dropzone.addEventListener(ev, e => {
          e.preventDefault();
          dropzone.style.borderColor = 'transparent';
          dropzone.style.background = '';
          dropzone.style.color = '#94a3b8';
        })
      );
      dropzone.addEventListener('drop', async e => {
        e.preventDefault();
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) await doUpload(file);
      });
    }

    async function doUpload(file) {
      const upBtn = section.querySelector('._cat-upload');
      if (upBtn) { upBtn.disabled = true; upBtn.textContent = '⏳ Hleður upp...'; }
      const result = await uploadAttachment(coId, file);
      if (upBtn) { upBtn.disabled = false; upBtn.textContent = '+ Hlaða inn skjali'; }
      if (result) {
        if (window.Toast && Toast.show) Toast.show('✓ Skjal hlaðið inn');
        refreshSection(section, coId);
      }
    }
  }

  function refreshSection(section, coId) {
    section.innerHTML = renderSection(coId);
    wireSection(section, coId);
  }

  // ── Preview / download ──────────────────────────────────────────────────
  async function openPreview(file) {
    const url = await getPublicUrl(file.path);
    if (!url) { alert('Gat ekki opnað skrá. Athugaðu nettengingu.'); return; }
    const ic = iconForType(file.content_type, file.name);
    const isPdf = ic.label === 'PDF';
    const isImg = ic.label === 'Mynd';

    let dlg = document.getElementById('_cat-preview');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_cat-preview';
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
          (isPdf || isImg ? '<button class="_catp-print" type="button" style="padding:8px 14px;background:#fff;color:#0f172a;border:none;border-radius:7px;cursor:pointer;font-size:13px;font-weight:600">🖨 Prenta</button>' : '') +
          '<a href="' + esc(url) + '" download="' + esc(file.name) + '" target="_blank" rel="noopener" style="padding:8px 14px;background:#1e293b;color:#fff;border:1px solid #475569;border-radius:7px;text-decoration:none;font-size:13px;font-weight:600">⬇ Sækja</a>' +
          '<button id="_catp-x" type="button" style="background:none;border:1px solid #475569;color:#cbd5e1;font-size:20px;width:38px;height:38px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
      '</div>' +
      '<div style="flex:1;background:#1e293b;display:flex;align-items:center;justify-content:center;padding:0;overflow:hidden">' +
        (isPdf ? '<iframe src="' + esc(url) + '" style="width:100%;height:100%;border:none;background:#fff"></iframe>'
         : isImg ? '<img src="' + esc(url) + '" alt="' + esc(file.name) + '" style="max-width:100%;max-height:100%;object-fit:contain">'
         : '<div style="color:#cbd5e1;text-align:center;padding:40px"><div style="font-size:48px;margin-bottom:12px">' + ic.ico + '</div><div>Forskoðun ekki tiltæk fyrir þetta skjal.</div><div style="margin-top:8px;font-size:13px;color:#94a3b8">Sæktu skjalið með ⬇ Sækja takkanum.</div></div>') +
      '</div>';
    document.body.appendChild(dlg);
    function close() { dlg.remove(); }
    dlg.querySelector('#_catp-x').addEventListener('click', close);
    dlg.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    setTimeout(() => dlg.focus(), 50);

    const printBtn = dlg.querySelector('._catp-print');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        const win = window.open('', 'cat-print', 'width=900,height=1100');
        if (!win) { alert('Sprettigluggi var lokaður — leyfðu sprettiglugga til að prenta.'); return; }
        if (isPdf) {
          win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(file.name) + '</title><style>html,body{margin:0;height:100%;background:#525659}iframe{border:none;width:100%;height:100%}</style></head><body><iframe src="' + esc(url) + '" onload="setTimeout(function(){try{this.contentWindow.print();}catch(e){window.print();}},500)"></iframe></body></html>');
        } else {
          win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(file.name) + '</title><style>@media print{@page{size:A4;margin:14mm}}body{margin:0;padding:14mm;background:#fff;text-align:center;font-family:Arial,Helvetica,sans-serif}img{max-width:100%;max-height:90vh;object-fit:contain}@media print{body{padding:0}img{max-height:none}}</style></head><body><img src="' + esc(url) + '" alt="' + esc(file.name) + '" onload="setTimeout(function(){window.print();},250)"></body></html>');
        }
        win.document.close();
      });
    }
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

  // ── Watch for company detail being rendered ────────────────────────────
  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(injectSection, 200);
    }).observe(main, { childList: true, subtree: true });
  }
  attach();
  setTimeout(injectSection, 1500);
  setTimeout(injectSection, 3000);

  // Refresh when AppSettings changes (cross-device sync)
  if (window.AppSettings && typeof window.AppSettings.onChange === 'function') {
    window.AppSettings.onChange(() => {
      const section = document.querySelector('._cat-section');
      if (section) {
        const coId = +section.dataset.coId;
        if (coId) refreshSection(section, coId);
      }
    });
  }

  window.CompanyAttachments = {
    list: getCompanyAttachments,
    upload: uploadAttachment,
    delete: deleteAttachment
  };

  console.log('[company-attachments] installed — 📎 Skjöl & skýrslur on company detail');
})();
/* === END COMPANY ATTACHMENTS v1 === */
