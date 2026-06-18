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

  async function uploadAttachment(coId, file, opts) {
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
      // Year: explicit (year-cell upload from the 23/24/25/26 columns) wins,
      // else auto-tag from the filename (e.g. "Rjúpufell 2025.pdf") so it
      // lights up in the year columns without manual tagging.
      const ym = (opts && opts.year) ? [null, String(opts.year)] : file.name.match(/\b(20[2-3][0-9])\b/);
      const meta = {
        id: 'a_' + ts + '_' + Math.random().toString(36).slice(2,8),
        name: file.name,
        path,
        content_type: file.type || '',
        size: file.size,
        uploaded_at: new Date().toISOString(),
        year: ym ? ym[1] : null
      };
      const list = getCompanyAttachments(coId);
      list.unshift(meta);
      await saveCompanyAttachments(coId, list);
      if (meta.year) { try { document.dispatchEvent(new CustomEvent('attachment-year-changed')); } catch (_) {} }
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
    // 2026-05-31: Prefer the stable data-co-id on the company-detail action
    // bar (features.js) over scraping a Companies.openEdit button. Stray
    // openEdit buttons elsewhere in companies-main could make querySelector
    // capture the WRONG company, filing uploaded PDFs under the wrong
    // fyrirtæki. The :not(._cat-section) guard skips our own section, which
    // also carries a data-co-id.
    const idEl = main.querySelector('[data-co-id]:not(._cat-section)');
    if (idEl) {
      const v = idEl.getAttribute('data-co-id');
      if (v && /^\d+$/.test(v)) return +v;
    }
    // Legacy fallback: scrape the hidden edit-anchor's onclick handler.
    const editBtn = main.querySelector('button[onclick*="Companies.openEdit"]');
    if (!editBtn) return null;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/);
    return m ? +m[1] : null;
  }

  // 2026-05-21: small flag so our own moveToBottom() doesn't bounce back
  // through the MutationObserver and into patch 129's observer in a loop.
  let _moving = false;
  function injectSection() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const coId = getCompanyId();
    if (!coId) return;
    const existing = main.querySelector('._cat-section');
    if (existing) {
      // already injected — keep at the very bottom even when later patches
      // (heildarkostnaður, notes, visit-workflow) append their own sections.
      if (main.lastElementChild !== existing) {
        _moving = true;
        main.appendChild(existing);
        // Clear the flag after the current microtask so the MutationObserver
        // callback (queued sync by appendChild) sees _moving=true and skips.
        setTimeout(() => { _moving = false; }, 0);
      }
      return;
    }

    const section = document.createElement('div');
    section.className = '_cat-section';
    section.dataset.coId = coId;
    section.style.cssText = 'margin:18px 0 24px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.04)';
    section.innerHTML = renderSection(coId);

    // Append last — and the early-return above re-appends on every render
    // so it stays last.
    main.appendChild(section);
    wireSection(section, coId);
  }

  // 2026-06: yfirlits-grid — úttektarskýrslur + reikningar per ár (2023–2026)
  // úr SÖMU skjölum (flokkað eftir ári + heiti). Chip-arnir endurnýta sömu
  // _cat-open/_cat-download smelli-meðhöndlun og listinn að neðan.
  function docYearGridHtml(list) {
    const YEARS = [2026, 2025, 2024, 2023];
    const cell = {}; // cell[year][type] = [files]
    (list || []).forEach(f => {
      const nm = String(f.name || '');
      const yr = (f.year && f.year !== '0') ? String(f.year) : ((nm.match(/\b(20[2-3][0-9])\b/) || [])[1] || null);
      if (!yr) return;
      if (!(f.drive_url || f.drive_id || f.path)) return; // skráningar án skjals sleppt
      let type = null;
      if (/reikn|r-?\s?\d{3,}/i.test(nm)) type = 'reikningur';
      else if (/sko(ð|d)un|(ú|u)ttekt|sk(ý|y)rsl/i.test(nm)) type = 'skyrsla';
      if (!type) return;
      (cell[yr] = cell[yr] || {});
      (cell[yr][type] = cell[yr][type] || []).push(f);
    });
    const chip = (f, kind) => {
      const prev = isPreviewable(f.content_type, f.name);
      const nm = String(f.name || '');
      const c = kind === 'reikningur'
        ? { bg: '#f0fdf4', bd: '#bbf7d0', col: '#15803d', ico: '🧾', lab: (nm.match(/R-?\s?\d{3,}/i) || ['Reikningur'])[0].replace(/\s+/g, '') }
        : { bg: '#f5f3ff', bd: '#ddd6fe', col: '#6d28d9', ico: '📄', lab: 'Skoðun' };
      return '<button class="' + (prev ? '_cat-open' : '_cat-download') + '" data-id="' + esc(f.id) + '" title="' + esc(nm) + '" ' +
        'style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;padding:3px 9px;border-radius:8px;cursor:pointer;margin:2px 2px 0 0;' +
        'background:' + c.bg + ';border:1px solid ' + c.bd + ';color:' + c.col + '">' + c.ico + ' ' + esc(c.lab) + '</button>';
    };
    const dash = '<span style="color:#cbd5e1">—</span>';
    const rows = YEARS.map(y => {
      const sk = (cell[y] && cell[y].skyrsla) || [];
      const re = (cell[y] && cell[y].reikningur) || [];
      const isCur = (y === new Date().getFullYear());
      return '<tr style="border-top:1px solid #f1f5f9">' +
        '<td style="padding:8px 12px;font-weight:700;color:' + (isCur ? '#1d4ed8' : '#0f172a') + '">' + y + '</td>' +
        '<td style="padding:6px 12px">' + (sk.length ? sk.map(f => chip(f, 'skyrsla')).join('') : dash) + '</td>' +
        '<td style="padding:6px 12px">' + (re.length ? re.map(f => chip(f, 'reikningur')).join('') : dash) + '</td>' +
      '</tr>';
    }).join('');
    return '<div style="margin-bottom:16px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 14px;border-bottom:1px solid #e2e8f0">' +
        '<h3 style="margin:0;font-size:14px;font-weight:800;color:#0f172a">📁 Skjöl eftir ári</h3>' +
        '<span style="font-size:11px;color:#94a3b8">2023–2026</span>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;font-size:12.5px">' +
        '<thead><tr style="background:#f8fafc;color:#475569;font-size:10px;text-transform:uppercase;letter-spacing:.04em">' +
          '<th style="padding:8px 12px;text-align:left">Ár</th>' +
          '<th style="padding:8px 12px;text-align:left">Úttektarskýrsla</th>' +
          '<th style="padding:8px 12px;text-align:left">Reikningur</th>' +
        '</tr></thead><tbody>' + rows + '</tbody>' +
      '</table></div>';
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
        (() => {
          // Effective year: explicit tag, else auto-detected from the filename
          // (year === '0' = user explicitly cleared — no auto-detection).
          const nm = (f.year == null && (String(f.name||'').match(/\b(20[2-3][0-9])\b/) || [])[1]) || null;
          const eff = (f.year && f.year !== '0') ? String(f.year) : nm;
          return '<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:#64748b">' +
          'Ár:' +
          '<select class="_cat-year" data-id="' + esc(f.id) + '" onclick="event.stopPropagation()" style="font:inherit;font-size:11px;padding:2px 4px;border:1px solid ' + (eff ? '#86efac' : '#e2e8f0') + ';border-radius:6px;background:' + (eff ? '#f0fdf4' : '#fff') + ';color:#0f172a">' +
            '<option value=""' + (!eff ? ' selected' : '') + '>—</option>' +
            ['2023','2024','2025','2026'].map(y => '<option value="' + y + '"' + (eff === y ? ' selected' : '') + '>' + y + '</option>').join('') +
          '</select>' +
          (eff ? '<span title="Birtist í ' + esc(eff) + ' dálki í Fyrirtæki í þjónustu listanum' + (f.year ? '' : ' (sjálfvirkt af skráarnafni)') + '" style="color:#15803d;font-weight:700">📄→' + esc(eff.slice(2)) + (f.year ? '' : '<span style="color:#94a3b8;font-weight:500"> sjálfv.</span>') + '</span>' : '') +
        '</div>'; })() +
        '<div style="display:flex;gap:4px;margin-top:auto;flex-wrap:wrap">' +
          // Only show open/download when an actual file is attached. Marker rows
          // (e.g. "Þjónustusamningur skráður (Samningar.xlsx …)") have no
          // drive_url/drive_id/path — a button there built …/file/d/undefined/view.
          ((f.drive_url || f.drive_id || f.path)
            ? ((isPreviewable(f.content_type, f.name)
                ? '<button class="_cat-open btn btn-primary btn-sm" data-id="' + esc(f.id) + '" style="flex:1;font-size:11px">📂 Opna</button>'
                : '<button class="_cat-download btn btn-primary btn-sm" data-id="' + esc(f.id) + '" style="flex:1;font-size:11px">⬇ Sækja</button>') +
               '<button class="_cat-download2 btn btn-outline btn-sm" data-id="' + esc(f.id) + '" title="Sækja" style="font-size:11px">⬇</button>')
            : '<span style="flex:1;font-size:10.5px;color:#94a3b8;align-self:center">Skráning · ekkert skjal viðhengt</span>') +
          '<button class="_cat-del btn btn-outline btn-sm" data-id="' + esc(f.id) + '" style="color:#dc2626;border-color:#fecaca;font-size:11px" title="Eyða">✕</button>' +
        '</div>' +
      '</div>';
    }).join('') : '<div style="grid-column:1/-1;padding:30px;text-align:center;color:#94a3b8;font-size:13px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px">Engin skjöl tengd þessu fyrirtæki ennþá — smelltu á <strong>+ Hlaða inn skjali</strong> til að byrja</div>';

    return '' +
      docYearGridHtml(list) +
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
        if (await Confirm.show('Eyða skjalinu „' + f.name + '"? Þetta er ekki afturkræft.')) {
          delBtn.disabled = true;
          await deleteAttachment(coId, f);
          refreshSection(section, coId);
        }
        return;
      }
    });

    // Year tag changed on a card → persist + tell the year-columns patch (187)
    // so the 23/24/25/26 view refreshes its icons.
    section.addEventListener('change', async e => {
      const sel = e.target.closest('._cat-year');
      if (!sel) return;
      e.stopPropagation();
      const list = getCompanyAttachments(coId);
      const f = list.find(x => x.id === sel.dataset.id);
      if (!f) return;
      // '' (—) stores '0' = explicitly none, so filename auto-detection
      // doesn't resurrect a cleared tag.
      f.year = sel.value === '' ? '0' : sel.value;
      await saveCompanyAttachments(coId, list);
      try { document.dispatchEvent(new CustomEvent('attachment-year-changed')); } catch (_) {}
      refreshSection(section, coId);
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
    // Drive-link attachments (added by patch 147's brunakerfi bulk-import in
    // session 2026-05-15) carry `drive_url` / `drive_id` instead of a Supabase
    // Storage `path`. Open them directly in Drive viewer — patch 111's
    // preview lightbox can't host Google Drive content securely anyway.
    const driveUrl = (file && file.drive_url) ? file.drive_url
      : (file && file.drive_id ? 'https://drive.google.com/file/d/' + file.drive_id + '/view' : '');
    if (driveUrl) { window.open(driveUrl, '_blank', 'noopener'); return; }
    if (!file || !file.path) { alert('Engin skrá fylgir þessari færslu — þetta er skráning (t.d. úr Samningar.xlsx), ekki upphlaðið skjal.'); return; }
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
    // Drive files — open the viewer; Drive handles download itself. Only when a
    // real reference exists, so marker rows don't build …/file/d/undefined/view.
    const driveUrl = (file && file.drive_url) ? file.drive_url
      : (file && file.drive_id ? 'https://drive.google.com/file/d/' + file.drive_id + '/view' : '');
    if (driveUrl) { window.open(driveUrl, '_blank', 'noopener'); return; }
    if (!file || !file.path) { alert('Engin skrá fylgir þessari færslu — þetta er skráning (t.d. úr Samningar.xlsx), ekki upphlaðið skjal.'); return; }
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
    // 2026-05-21: narrowed scope + self-mutation guard + bigger debounce.
    //   • childList only (no subtree): we just need to react when sections
    //     are added/removed at the top level, not on every text-node update
    //     inside _ctc-section that happens every keystroke or re-render.
    //   • _moving guard: ignore the synthetic mutation produced by our own
    //     "move to bottom" appendChild — otherwise that mutation triggers
    //     patch 129's observer → re-render → moves things → triggers us →
    //     re-append → loop. Killed responsiveness on the detail view.
    //   • 600ms debounce (was 200ms): coalesces bursts of patches that
    //     inject their sections in rapid succession.
    new MutationObserver((muts) => {
      if (_moving) return;
      // Ignore mutations where only our own ._cat-section was added/removed
      const ours = muts.every(m => {
        const nodes = [].concat(Array.from(m.addedNodes), Array.from(m.removedNodes));
        return nodes.length > 0 && nodes.every(n => n.classList && n.classList.contains('_cat-section'));
      });
      if (ours) return;
      clearTimeout(_t);
      _t = setTimeout(injectSection, 600);
    }).observe(main, { childList: true });
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
    delete: deleteAttachment,
    openPreview: openPreview,
    download: downloadFile,
    getPublicUrl: getPublicUrl
  };

  console.log('[company-attachments] installed — 📎 Skjöl & skýrslur on company detail');
})();
/* === END COMPANY ATTACHMENTS v1 === */
