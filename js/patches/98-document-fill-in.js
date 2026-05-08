/* === ÚTFYLLA SKJÖL v1 ===
 *
 * Bætir við "✏️ Útfylla" takka á attachment-skjölum (mynd / PDF) þannig að
 * notandi getur smellt hvar sem er á skjalið og slegið inn texta. Vistun
 * býr til nýja útgáfu af skjalinu með textanum „brennt" inn — geymast
 * sem aðskilið viðhengi.
 *
 * ── Eiginleikar ───────────────────────────────────────────────────────────
 *   • Smelltu hvar sem er á skjalið → texta-reiturinn birtist þar
 *   • Sláðu inn texta — leturstærð stillanleg (10–32 pt)
 *   • Færðu textann með drag (smelltu og haltu á gráu gripinu)
 *   • Eyddu með ✕ takka á hverjum reiti
 *   • Vistaðu → býr til nýja PNG mynd með textanum brennt inn, vistar í
 *     samningar/attachments möppu
 *
 * ── Stuðningur ────────────────────────────────────────────────────────────
 *   • Myndir (PNG, JPG, GIF, WebP, BMP) — beint á canvas
 *   • PDF — fyrsta blaðsíða nuður á canvas með PDF.js (CDN)
 *
 * ── Tæknileg innsýn ──────────────────────────────────────────────────────
 *   Annotations geymd in-memory á meðan editing er í gangi. Á save:
 *   composite á canvas (mynd + texti) → PNG → upload sem nýtt viðhengi.
 *   Texti er ALDREI brennt í upphaflega skjalið; alltaf búið til nýtt skjal.
 */
(() => {
  if (window.__docFillInInstalled) return;
  window.__docFillInInstalled = true;

  const BUCKET = 'samningar';
  const FOLDER = 'attachments';
  const STORAGE_KEY = 'skjalasnidmat_files';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function getSB() { return (window.DB && window.DB.sb) || null; }
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
  function isImage(file) {
    const c = String(file.content_type || '').toLowerCase();
    const n = String(file.name || '').toLowerCase();
    return c.includes('image') || /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(n);
  }
  function isPdf(file) {
    const c = String(file.content_type || '').toLowerCase();
    const n = String(file.name || '').toLowerCase();
    return c.includes('pdf') || n.endsWith('.pdf');
  }
  function canFillIn(file) { return isImage(file) || isPdf(file); }

  // Load PDF.js if needed
  function ensurePdfJs() {
    if (window.pdfjsLib) return Promise.resolve(true);
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      s.onload = () => {
        try {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
        } catch (_) {}
        resolve(true);
      };
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  // ── Render source (image or PDF first page) into a canvas-ready bitmap ────
  async function loadAsImage(file, url) {
    if (isImage(file)) {
      return await new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve({ src: img, w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => reject(new Error('Gat ekki hlaðið mynd'));
        img.src = url;
      });
    }
    if (isPdf(file)) {
      const ok = await ensurePdfJs();
      if (!ok) throw new Error('PDF.js ekki tiltæk');
      const pdf = await window.pdfjsLib.getDocument({ url, withCredentials: false }).promise;
      const page = await pdf.getPage(1);
      const baseViewport = page.getViewport({ scale: 1 });
      // Render at ~1.5× for clarity but cap at 2400px width
      const targetW = Math.min(2400, baseViewport.width * 1.5);
      const scale = targetW / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      return { src: canvas, w: canvas.width, h: canvas.height };
    }
    throw new Error('Ekki útfyllanleg skjalategund');
  }

  // ── Composite annotations onto image → returns blob ───────────────────────
  async function composite(bitmap, annotations) {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.w;
    canvas.height = bitmap.h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap.src, 0, 0, bitmap.w, bitmap.h);
    annotations.forEach(a => {
      const text = a.text || '';
      if (!text.trim()) return;
      ctx.font = a.bold
        ? (a.fontSize + 'px Arial, Helvetica, sans-serif')
        : (a.fontSize + 'px Arial, Helvetica, sans-serif');
      ctx.fillStyle = a.color || '#0f172a';
      ctx.textBaseline = 'top';
      // Multi-line support
      const lines = text.split(/\r?\n/);
      const lh = a.fontSize * 1.25;
      lines.forEach((ln, idx) => {
        ctx.fillText(ln, a.x, a.y + idx * lh);
      });
    });
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 0.95));
  }

  // ── Upload composited result as new attachment ────────────────────────────
  async function uploadFilledIn(originalFile, blob) {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return null; }
    const ts = Date.now();
    const baseName = String(originalFile.name || 'skjal').replace(/\.[a-z0-9]+$/i, '');
    const safeName = baseName.replace(/[^\w.\-]+/g, '_');
    const fileName = safeName + '_utfyllt_' + ts + '.png';
    const path = FOLDER + '/' + fileName;
    try {
      const r = await SB.storage.from(BUCKET).upload(path, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/png'
      });
      if (r.error) {
        alert('Villa við upphlaðningu: ' + r.error.message);
        return null;
      }
      const meta = {
        id: 'f_' + ts + '_' + Math.random().toString(36).slice(2,8),
        name: baseName + ' (útfyllt).png',
        path,
        content_type: 'image/png',
        size: blob.size,
        uploaded_at: new Date().toISOString(),
        filled_from: originalFile.id
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

  // ── Editor UI ─────────────────────────────────────────────────────────────
  async function openEditor(file) {
    if (!canFillIn(file)) {
      alert('Aðeins er hægt að útfylla myndir og PDF skjöl. Word/Excel skjöl þarf að opna í þeirra eigin forriti.');
      return;
    }
    const url = await getPublicUrl(file.path);
    if (!url) { alert('Gat ekki opnað skjalið.'); return; }

    let dlg = document.getElementById('_dfi-dlg');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_dfi-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100024;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;padding:0';

    dlg.innerHTML =
      '<div style="padding:10px 16px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">' +
        '<div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">' +
          '<span style="font-size:22px;line-height:1">✏️</span>' +
          '<div style="min-width:0">' +
            '<div style="font-weight:700;font-size:14px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Útfylla: ' + esc(file.name) + '</div>' +
            '<div style="font-size:11px;color:#94a3b8;margin-top:2px">Smelltu á skjalið til að bæta við texta. Færðu með að halda á gráu gripinu.</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
          '<label style="font-size:12px;color:#cbd5e1;display:flex;align-items:center;gap:4px">Letur:' +
            '<select id="_dfi-fontsize" style="padding:4px 6px;background:#1e293b;color:#fff;border:1px solid #475569;border-radius:5px;font-size:12px;margin-left:4px">' +
              '<option value="14">14pt</option>' +
              '<option value="16">16pt</option>' +
              '<option value="18" selected>18pt</option>' +
              '<option value="22">22pt</option>' +
              '<option value="26">26pt</option>' +
              '<option value="32">32pt</option>' +
            '</select>' +
          '</label>' +
          '<button class="_dfi-clear" type="button" style="padding:7px 12px;background:transparent;color:#fbbf24;border:1px solid #f59e0b;border-radius:6px;cursor:pointer;font-size:12px">Hreinsa allt</button>' +
          '<button class="_dfi-save" type="button" style="padding:7px 14px;background:#16a34a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700">💾 Vista nýja útgáfu</button>' +
          '<button id="_dfi-x" type="button" style="background:none;border:1px solid #475569;color:#cbd5e1;font-size:20px;width:36px;height:36px;border-radius:6px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
      '</div>' +
      '<div style="flex:1;background:#1e293b;display:flex;align-items:center;justify-content:center;padding:18px;overflow:auto">' +
        '<div id="_dfi-status" style="color:#cbd5e1;font-size:14px">Hleður skjalinu…</div>' +
        '<div id="_dfi-canvas-wrap" style="position:relative;display:none;background:#fff;box-shadow:0 12px 40px rgba(0,0,0,0.6)"></div>' +
      '</div>';
    document.body.appendChild(dlg);

    function close() { dlg.remove(); }
    dlg.querySelector('#_dfi-x').addEventListener('click', () => {
      if (annotations.length && annotations.some(a => (a.text || '').trim()) && !confirm('Loka án vistunar? Útfylling verður glötuð.')) return;
      close();
    });

    const status = dlg.querySelector('#_dfi-status');
    const wrap = dlg.querySelector('#_dfi-canvas-wrap');
    const fontSel = dlg.querySelector('#_dfi-fontsize');

    let bitmap = null;
    const annotations = []; // {id, x, y, fontSize, text, color, el}

    try {
      bitmap = await loadAsImage(file, url);
    } catch (e) {
      status.innerHTML = '<span style="color:#dc2626">Villa: ' + esc(e.message || String(e)) + '</span>';
      return;
    }
    status.style.display = 'none';
    wrap.style.display = 'block';

    // Determine display size: fit in viewport
    const viewportH = window.innerHeight - 120;
    const viewportW = window.innerWidth - 80;
    const ratio = bitmap.w / bitmap.h;
    let dispW = bitmap.w;
    let dispH = bitmap.h;
    if (dispW > viewportW) { dispW = viewportW; dispH = dispW / ratio; }
    if (dispH > viewportH) { dispH = viewportH; dispW = dispH * ratio; }
    const scale = dispW / bitmap.w; // display → original

    // Build the image element (for display)
    const imgCanvas = document.createElement('canvas');
    imgCanvas.width = bitmap.w;
    imgCanvas.height = bitmap.h;
    imgCanvas.style.cssText = 'display:block;width:' + dispW + 'px;height:' + dispH + 'px;cursor:crosshair';
    imgCanvas.getContext('2d').drawImage(bitmap.src, 0, 0);
    wrap.appendChild(imgCanvas);
    wrap.style.width = dispW + 'px';
    wrap.style.height = dispH + 'px';

    function placeAnnotation(displayX, displayY, initialText) {
      const fontSize = parseInt(fontSel.value, 10) || 18;
      const id = 'ann_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);

      // Position in original-coordinate space (used at composite time)
      const origX = Math.round(displayX / scale);
      const origY = Math.round(displayY / scale);

      const el = document.createElement('div');
      el.dataset.annId = id;
      el.style.cssText =
        'position:absolute;left:' + displayX + 'px;top:' + displayY + 'px;' +
        'min-width:80px;background:rgba(255,255,224,0.92);border:1px dashed #f59e0b;' +
        'border-radius:5px;padding:0;display:flex;align-items:flex-start;gap:0;' +
        'box-shadow:0 2px 6px rgba(0,0,0,0.15)';

      const grip = document.createElement('div');
      grip.title = 'Halda til að færa';
      grip.style.cssText = 'background:#fbbf24;color:#92400e;font-size:11px;font-weight:700;padding:0 5px;cursor:move;border-radius:5px 0 0 5px;display:flex;align-items:center;user-select:none';
      grip.textContent = '⋮⋮';
      el.appendChild(grip);

      const ta = document.createElement('textarea');
      ta.rows = 1;
      ta.value = initialText || '';
      ta.placeholder = 'Sláðu inn...';
      ta.style.cssText =
        'flex:1;border:none;background:transparent;outline:none;resize:none;' +
        'padding:3px 6px;font-family:Arial,Helvetica,sans-serif;font-size:' + (fontSize * scale) + 'px;' +
        'color:#0f172a;line-height:1.25;min-width:60px;min-height:' + (fontSize * scale * 1.4) + 'px;overflow:hidden';
      // Auto-resize textarea height
      function autosize() {
        ta.style.height = 'auto';
        ta.style.height = ta.scrollHeight + 'px';
        const minW = 80, maxW = dispW - displayX - 4;
        ta.style.width = Math.min(maxW, Math.max(minW, ta.scrollWidth + 8)) + 'px';
      }
      ta.addEventListener('input', () => {
        ann.text = ta.value;
        autosize();
      });
      el.appendChild(ta);

      const xBtn = document.createElement('button');
      xBtn.type = 'button';
      xBtn.title = 'Eyða';
      xBtn.textContent = '✕';
      xBtn.style.cssText = 'background:rgba(239,68,68,0.85);color:#fff;border:none;width:18px;height:18px;border-radius:0 5px 5px 0;font-size:11px;cursor:pointer;flex-shrink:0';
      xBtn.addEventListener('click', e => {
        e.stopPropagation();
        const i = annotations.findIndex(a => a.id === id);
        if (i >= 0) annotations.splice(i, 1);
        el.remove();
      });
      el.appendChild(xBtn);

      const ann = {
        id,
        x: origX,
        y: origY,
        fontSize,
        text: ta.value,
        color: '#0f172a',
        el,
        ta
      };
      annotations.push(ann);

      // Drag with grip
      let drag = null;
      grip.addEventListener('mousedown', e => {
        e.preventDefault();
        const rect = wrap.getBoundingClientRect();
        const startX = e.clientX, startY = e.clientY;
        const elLeft = parseFloat(el.style.left) || 0;
        const elTop = parseFloat(el.style.top) || 0;
        drag = { startX, startY, elLeft, elTop };
        function move(ev) {
          if (!drag) return;
          const dx = ev.clientX - drag.startX;
          const dy = ev.clientY - drag.startY;
          const newL = Math.max(0, Math.min(dispW - 60, drag.elLeft + dx));
          const newT = Math.max(0, Math.min(dispH - 20, drag.elTop + dy));
          el.style.left = newL + 'px';
          el.style.top = newT + 'px';
          ann.x = Math.round(newL / scale);
          ann.y = Math.round(newT / scale);
        }
        function up() {
          drag = null;
          document.removeEventListener('mousemove', move);
          document.removeEventListener('mouseup', up);
        }
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
      });
      // Touch support
      grip.addEventListener('touchstart', e => {
        const t = e.touches[0];
        if (!t) return;
        const elLeft = parseFloat(el.style.left) || 0;
        const elTop = parseFloat(el.style.top) || 0;
        drag = { startX: t.clientX, startY: t.clientY, elLeft, elTop };
        function tmove(ev) {
          const tt = ev.touches[0];
          if (!tt || !drag) return;
          ev.preventDefault();
          const dx = tt.clientX - drag.startX;
          const dy = tt.clientY - drag.startY;
          el.style.left = Math.max(0, Math.min(dispW - 60, drag.elLeft + dx)) + 'px';
          el.style.top = Math.max(0, Math.min(dispH - 20, drag.elTop + dy)) + 'px';
          ann.x = Math.round((parseFloat(el.style.left)) / scale);
          ann.y = Math.round((parseFloat(el.style.top)) / scale);
        }
        function tend() {
          drag = null;
          document.removeEventListener('touchmove', tmove);
          document.removeEventListener('touchend', tend);
        }
        document.addEventListener('touchmove', tmove, { passive: false });
        document.addEventListener('touchend', tend);
      });

      wrap.appendChild(el);
      autosize();
      ta.focus();
      return ann;
    }

    // Click on canvas places a new annotation
    imgCanvas.addEventListener('click', e => {
      const rect = imgCanvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      placeAnnotation(x, y, '');
    });

    // Clear all
    dlg.querySelector('._dfi-clear').addEventListener('click', () => {
      if (!annotations.length) return;
      if (!confirm('Hreinsa allar útfyllingar?')) return;
      annotations.forEach(a => a.el.remove());
      annotations.length = 0;
    });

    // Save
    dlg.querySelector('._dfi-save').addEventListener('click', async () => {
      const filled = annotations.filter(a => (a.text || '').trim());
      if (!filled.length) { alert('Engin útfylling til að vista. Smelltu á skjalið og sláðu inn texta.'); return; }
      const saveBtn = dlg.querySelector('._dfi-save');
      saveBtn.disabled = true;
      saveBtn.textContent = '⏳ Vistar...';
      try {
        const blob = await composite(bitmap, filled);
        const meta = await uploadFilledIn(file, blob);
        if (meta) {
          if (window.Toast && Toast.show) Toast.show('✓ Útfyllt útgáfa vistuð sem "' + meta.name + '"');
          if (window.DocAttachments && window.DocAttachments.refresh) window.DocAttachments.refresh();
          close();
        } else {
          saveBtn.disabled = false;
          saveBtn.textContent = '💾 Vista nýja útgáfu';
        }
      } catch (e) {
        alert('Villa: ' + (e.message || String(e)));
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Vista nýja útgáfu';
      }
    });
  }

  // ── Inject "✏️ Útfylla" button into attachment cards ─────────────────────
  function decorateAttachmentCards() {
    const cards = document.querySelectorAll('._da-card:not([data-fill-in-decorated])');
    cards.forEach(card => {
      card.dataset.fillInDecorated = '1';
      // Find the file id from any of the existing buttons
      const idBtn = card.querySelector('[data-id]');
      if (!idBtn) return;
      const id = idBtn.dataset.id;
      const file = getFilesList().find(f => f.id === id);
      if (!file || !canFillIn(file)) return;

      // Find the action row (last div in card)
      const actionRow = card.querySelector('div:last-child');
      if (!actionRow) return;

      const btn = document.createElement('button');
      btn.className = 'btn btn-outline btn-sm _dfi-fill-btn';
      btn.type = 'button';
      btn.title = 'Útfylla skjalið';
      btn.dataset.id = id;
      btn.style.cssText = 'color:#9a3412;border-color:#fed7aa;background:#fff7ed';
      btn.textContent = '✏️ Útfylla';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const f = getFilesList().find(x => x.id === id);
        if (f) openEditor(f);
      });
      // Insert as second button (after Open/Download)
      const firstBtn = actionRow.querySelector('button, a');
      if (firstBtn && firstBtn.nextSibling) {
        actionRow.insertBefore(btn, firstBtn.nextSibling);
      } else {
        actionRow.appendChild(btn);
      }
    });
  }

  // Watch for new attachment cards
  function setupWatcher() {
    setInterval(() => {
      const view = document.getElementById('view-samningar');
      if (view && view.classList.contains('active')) {
        decorateAttachmentCards();
      }
    }, 800);
  }
  setupWatcher();

  window.DocFillIn = {
    open: openEditor
  };

  console.log('[doc-fill-in] installed — útfylla mynd/PDF skjöl beint í Samningum');
})();
/* === END ÚTFYLLA SKJÖL v1 === */
