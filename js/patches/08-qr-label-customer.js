/* === QR LABEL CUSTOMER v2 === */
/* Adds a "🏷️ QR-miði (24×100mm)" workflow with a much larger, rotated QR
   for easier camera focus.
   - QR fills near-full 23mm × 23mm (was 22mm).
   - QR rotated 90° clockwise so its "top" (position-detection markers) faces
     inward toward the text — improves scanning angle on small thermal labels.
   - Generates a higher-resolution QR PNG (320px) for sharper edges.
   - Same workflow as v1: search customer → pick device → preview → print. */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  // Re-installable: tear down any prior version cleanly
  document.getElementById('_qrlc_modal')?.remove();
  document.getElementById('qr-lc-style')?.remove();
  document.querySelector('.vnav-btn[data-qrlc]')?.remove();
  window.__qrLabelCustomerInstalled = true;

  function getSB() {
    if (window.DB && window.DB.sb) return window.DB.sb;
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_KEY) return null;
    if (!window.__qrLcSB) {
      window.__qrLcSB = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
    }
    return window.__qrLcSB;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function ensureQRLib() {
    return new Promise((resolve, reject) => {
      if (typeof window.QRCode !== 'undefined') return resolve();
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Could not load QR library'));
      document.head.appendChild(s);
    });
  }
  function qrPNG(text, size) {
    return new Promise(resolve => {
      const div = document.createElement('div');
      new window.QRCode(div, {
        text, width: size, height: size,
        colorDark: '#000000', colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel.M
      });
      setTimeout(() => {
        const canvas = div.querySelector('canvas');
        const img = div.querySelector('img');
        if (canvas) resolve(canvas.toDataURL('image/png'));
        else if (img) resolve(img.src);
        else resolve('');
      }, 30);
    });
  }

  // ------- Styles ----------
  const STYLE_ID = 'qr-lc-style';
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    #_qrlc_modal {
      position: fixed; inset: 0; z-index: 9998;
      background: rgba(15,23,42,.55);
      display: flex; align-items: flex-start; justify-content: center;
      padding: 30px 16px; overflow-y: auto;
      font-family: inherit;
    }
    #_qrlc_modal .qrlc-card {
      background: #fff; border-radius: 14px; padding: 22px;
      max-width: 560px; width: 100%;
      box-shadow: 0 20px 60px rgba(15,23,42,.25);
    }
    #_qrlc_modal h2 {
      margin: 0 0 4px; font-size: 18px; color: #0f172a;
      display: flex; align-items: center; gap: 8px;
    }
    #_qrlc_modal .qrlc-sub { font-size: 13px; color: #64748b; margin-bottom: 14px; }
    #_qrlc_modal label {
      display: block; font-size: 12px; font-weight: 600; color: #475569;
      margin: 12px 0 4px; text-transform: uppercase; letter-spacing: .04em;
    }
    #_qrlc_modal input[type=text],
    #_qrlc_modal input[type=tel],
    #_qrlc_modal select {
      width: 100%; padding: 9px 11px; border: 1px solid #e2e8f0; border-radius: 8px;
      font: inherit; font-size: 14px; color: #0f172a; background: #fff;
      outline: none; box-sizing: border-box; transition: border-color .15s, background .15s;
    }
    #_qrlc_modal input:focus, #_qrlc_modal select:focus {
      border-color: #3b82f6; background: #f0f7ff;
    }
    #_qrlc_modal .qrlc-search-results {
      max-height: 200px; overflow-y: auto;
      border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 6px;
      background: #fff; display: none;
    }
    #_qrlc_modal .qrlc-search-results.open { display: block; }
    #_qrlc_modal .qrlc-sr-item {
      padding: 8px 12px; cursor: pointer;
      border-bottom: 1px solid #f1f5f9; font-size: 13px;
    }
    #_qrlc_modal .qrlc-sr-item:hover { background: #eff6ff; }
    #_qrlc_modal .qrlc-sr-item:last-child { border-bottom: none; }
    #_qrlc_modal .qrlc-sr-name { font-weight: 600; color: #0f172a; }
    #_qrlc_modal .qrlc-sr-meta { color: #64748b; font-size: 12px; }
    #_qrlc_modal .qrlc-empty { padding: 12px; color: #94a3b8; font-style: italic; text-align: center; font-size: 13px; }
    #_qrlc_modal .qrlc-preview-wrap {
      margin: 16px 0; padding: 14px;
      background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 10px;
    }
    #_qrlc_modal .qrlc-preview-cap { font-size: 11px; color: #64748b; text-align: center; margin-bottom: 8px; }
    #_qrlc_modal .qrlc-actions {
      display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;
    }
    #_qrlc_modal .qrlc-btn {
      padding: 9px 16px; border-radius: 8px; font-size: 14px; cursor: pointer;
      border: 1px solid #e2e8f0; background: #fff; color: #334155; font-weight: 500;
      transition: all .15s;
    }
    #_qrlc_modal .qrlc-btn:hover { border-color: #94a3b8; background: #f8fafc; }
    #_qrlc_modal .qrlc-btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
    #_qrlc_modal .qrlc-btn.primary:hover:not(:disabled) { background: #1d4ed8; }
    #_qrlc_modal .qrlc-btn:disabled { opacity: .5; cursor: not-allowed; }
    #_qrlc_modal .qrlc-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

    /* Preview at near-actual scale (96dpi → 18mm≈68px, 70mm≈264px). */
    .qrlc-label {
      width: 264px; height: 68px;
      background: #fff; border: 1px solid #cbd5e1;
      display: flex; align-items: stretch;
      margin: 0 auto;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      overflow: hidden;
      box-sizing: border-box;
      padding: 2px;
    }
    .qrlc-label .ql-qr {
      flex: 0 0 64px;       /* ~17mm at 96dpi */
      padding: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .qrlc-label .ql-qr img {
      width: 64px; height: 64px;        /* fill the 17mm box */
      transform: rotate(90deg);         /* rotate so QR top faces text */
      image-rendering: pixelated;
    }
    .qrlc-label .ql-text {
      flex: 1; padding: 0 4px 0 6px;
      display: flex; flex-direction: column; justify-content: center;
      min-width: 0;
    }
    /* Sized so the 18×70mm preview matches the print output. */
    .qrlc-label .ql-name {
      font-size: 16px; font-weight: 800; color: #000;
      line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .qrlc-label .ql-phone {
      font-size: 14px; font-weight: 600; color: #000; margin-top: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .qrlc-label .ql-line {
      font-size: 11px; color: #000; margin-top: 1px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .qrlc-label .ql-serial {
      font-size: 11px; font-weight: 600; color: #000; margin-top: 2px;
      font-family: 'Courier New', monospace;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
  `;
  document.head.appendChild(s);

  function buildLabelHTML({ qrDataUrl, name, phone, serial, extra }) {
    return `
      <div class="qrlc-label">
        <div class="ql-qr">
          ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR">` : '<span style="font-size:10px;color:#94a3b8;">QR</span>'}
        </div>
        <div class="ql-text">
          <div class="ql-name">${esc(name || '—')}</div>
          ${phone ? `<div class="ql-phone">📞 ${esc(phone)}</div>` : ''}
          ${extra ? `<div class="ql-line">${esc(extra)}</div>` : ''}
          ${serial ? `<div class="ql-serial">${esc(serial)}</div>` : ''}
        </div>
      </div>`;
  }

  // ------- Print ----------
  // Allowed label lengths in mm (matches the dropdown in the dialog).
  const LABEL_LENGTHS = [50, 70, 90, 100];
  // Brother PT-P750W on 24mm TZe tape: ~18mm printable height.
  const LABEL_HEIGHT_MM = 18;

  function openPrintWindow(labelHTML, lengthMm) {
    const len = LABEL_LENGTHS.includes(+lengthMm) ? +lengthMm : 70;
    const textLeft = 23; // mm — same QR cell on every length
    const win = window.open('', '_blank', 'width=900,height=500');
    if (!win) { alert('Vinsamlegast leyfa popup glugga til að prenta.'); return; }
    win.document.open();
    win.document.write(`
      <!doctype html><html><head><meta charset="utf-8"><title>QR-miði ${LABEL_HEIGHT_MM}×${len}mm</title>
      <style>
        /* Page size matches the ACTUAL printable area of the Brother PT-P750W
           on 24mm TZe tape: 18mm tall (the tape is 24mm but the printer leaves
           a ~3mm dead zone on each side). Length is configurable.
           Absolute positioning so nothing can reflow under the print pipeline. */
        @page { size: ${len}mm ${LABEL_HEIGHT_MM}mm; margin: 0; }
        @media print {
          html, body { margin: 0; padding: 0; background: #fff; }
        }
        html, body { margin: 0; padding: 0; background: #fff;
          font-family: 'Helvetica Neue', Arial, sans-serif; }
        .sheet {
          width: ${len}mm; height: ${LABEL_HEIGHT_MM}mm; box-sizing: border-box;
          position: relative;
          page-break-after: always;
          overflow: hidden;
        }
        .ql-qr {
          position: absolute;
          left: 4mm; top: 0.5mm;
          width: 17mm; height: 17mm;
        }
        .ql-qr img {
          display: block;
          width: 17mm; height: 17mm;
          transform: rotate(90deg);
          image-rendering: pixelated;
        }
        .ql-text {
          position: absolute;
          left: ${textLeft}mm; right: 1mm; top: 0.5mm; bottom: 0.5mm;
          display: flex; flex-direction: column; justify-content: center;
          overflow: hidden;
        }
        .ql-name { font-size: 13pt; font-weight: 800; color: #000;
          line-height: 1.05; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ql-phone { font-size: 11pt; font-weight: 600; color: #000; margin-top: 0.4mm;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ql-line { font-size: 8pt; color: #000; margin-top: 0.3mm;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ql-serial { font-size: 8pt; color: #000; font-weight: 600; margin-top: 0.4mm;
          font-family: 'Courier New', monospace;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media screen {
          body { padding: 18px; background: #f1f5f9; }
          .sheet { background: #fff; border: 1px solid #cbd5e1; margin: 0 auto 8px; }
        }
      </style>
      </head><body>
      ${labelHTML}
      <script>setTimeout(()=>{ try { window.focus(); window.print(); } catch(e){} }, 250);</script>
      </body></html>
    `);
    win.document.close();
  }

  // Print a calibration test pattern: corner markers + a centred crosshair so
  // the user can confirm the printable area + horizontal centring on the tape.
  // Useful when switching tape sizes or troubleshooting clipped edges.
  function printTestPattern(lengthMm) {
    const len = LABEL_LENGTHS.includes(+lengthMm) ? +lengthMm : 70;
    const h = LABEL_HEIGHT_MM;
    const win = window.open('', '_blank', 'width=900,height=500');
    if (!win) { alert('Vinsamlegast leyfa popup glugga til að prenta.'); return; }
    win.document.open();
    win.document.write(`
      <!doctype html><html><head><meta charset="utf-8"><title>Calibration ${h}×${len}mm</title>
      <style>
        @page { size: ${len}mm ${h}mm; margin: 0; }
        html, body { margin: 0; padding: 0; background: #fff;
          font-family: 'Courier New', monospace; }
        .sheet {
          width: ${len}mm; height: ${h}mm; box-sizing: border-box;
          position: relative; page-break-after: always; overflow: hidden;
        }
        /* 5mm L-shaped corner markers, 0.4mm stroke. */
        .corner { position: absolute; width: 5mm; height: 5mm; }
        .corner::before, .corner::after {
          content:''; position:absolute; background:#000;
        }
        .corner::before { width: 5mm; height: 0.4mm; }
        .corner::after  { width: 0.4mm; height: 5mm; }
        .tl { top: 0; left: 0; }
        .tr { top: 0; right: 0; transform: scaleX(-1); }
        .bl { bottom: 0; left: 0; transform: scaleY(-1); }
        .br { bottom: 0; right: 0; transform: scale(-1,-1); }
        /* Centred crosshair (full size 6mm). */
        .crosshair { position: absolute; top: 50%; left: 50%;
          width: 6mm; height: 6mm; transform: translate(-50%,-50%); }
        .crosshair::before, .crosshair::after { content:''; position:absolute; background:#000; }
        .crosshair::before { left: 0; top: calc(50% - 0.2mm); width: 6mm; height: 0.4mm; }
        .crosshair::after  { top: 0; left: calc(50% - 0.2mm); width: 0.4mm; height: 6mm; }
        /* Size label centred. */
        .size {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, calc(-50% + 4mm));
          font-size: 8pt; font-weight: 700; color: #000;
        }
        /* Edge labels for orientation. */
        .edge { position: absolute; font-size: 6pt; color: #000; }
        .edge-l { left: 0.5mm; top: 50%; transform: translateY(-50%); }
        .edge-r { right: 0.5mm; top: 50%; transform: translateY(-50%); }
      </style>
      </head><body>
        <div class="sheet">
          <div class="corner tl"></div>
          <div class="corner tr"></div>
          <div class="corner bl"></div>
          <div class="corner br"></div>
          <div class="crosshair"></div>
          <div class="size">${h}×${len}mm</div>
          <div class="edge edge-l">L</div>
          <div class="edge edge-r">R</div>
        </div>
        <script>setTimeout(()=>{ try { window.focus(); window.print(); } catch(e){} }, 250);</script>
      </body></html>
    `);
    win.document.close();
  }
  function buildPrintLabel({ qrDataUrl, name, phone, serial, extra }) {
    return `
      <div class="sheet">
        <div class="ql-qr">${qrDataUrl ? `<img src="${qrDataUrl}">` : ''}</div>
        <div class="ql-text">
          <div class="ql-name">${esc(name || '—')}</div>
          ${phone ? `<div class="ql-phone">📞 ${esc(phone)}</div>` : ''}
          ${extra ? `<div class="ql-line">${esc(extra)}</div>` : ''}
          ${serial ? `<div class="ql-serial">${esc(serial)}</div>` : ''}
        </div>
      </div>`;
  }

  let state = { customer: null, devices: [], selectedDevice: null, qrSize: 320, searchTimer: null };

  // Fetch the next sequential serial (S0001, S0002, …) from Supabase via RPC
  async function fetchNextSerial() {
    try {
      const SB = getSB(); if (!SB) return '';
      const { data, error } = await SB.rpc('next_uttaeki_serial');
      if (error) { console.warn('[qrlc] next_uttaeki_serial', error); return ''; }
      return typeof data === 'string' ? data : '';
    } catch (e) { return ''; }
  }

  async function searchCustomers(query) {
    const SB = getSB(); if (!SB) return [];
    const v = (query || '').trim();
    if (v.length < 2) return [];
    const digits = v.replace(/\D/g, '');
    let q;
    if (digits.length >= 2 && digits === v.replace(/-/g,'')) {
      q = SB.from('vidskiptavinir').select('kennitala, nafn, simi').or(
        'kennitala.ilike.' + digits + '%,kennitala.ilike.' + digits.slice(0,6) + '-' + digits.slice(6) + '%'
      ).limit(8);
    } else {
      q = SB.from('vidskiptavinir').select('kennitala, nafn, simi').ilike('nafn', '%' + v + '%').limit(8);
    }
    const { data, error } = await q;
    if (error) return [];
    return data || [];
  }

  async function loadDevicesForCustomer(customer) {
    const SB = getSB(); if (!SB) return [];
    const out = []; const name = customer.nafn;
    if (name) {
      const { data } = await SB.from('uttaeki').select('id, serial, type, size, client, location, phone').ilike('client', '%' + name + '%').limit(20);
      if (data) for (const r of data) out.push({ kind: 'uttaeki', ...r });
    }
    if (name) {
      const { data } = await SB.from('lanstaeki').select('id, serial, type, size, client, location').ilike('client', '%' + name + '%').limit(20);
      if (data) for (const r of data) out.push({ kind: 'lanstaeki', ...r });
    }
    const seen = new Set();
    return out.filter(d => { const k = d.kind + ':' + d.serial; if (seen.has(k)) return false; seen.add(k); return true; });
  }

  async function refreshPreview() {
    const previewEl = document.getElementById('_qrlc_preview');
    if (!previewEl) return;
    const printBtn = document.getElementById('_qrlc_print');

    const name = (document.getElementById('_qrlc_name')?.value || '').trim();
    const phone = (document.getElementById('_qrlc_phone')?.value || '').trim();
    const serial = (document.getElementById('_qrlc_serial')?.value || '').trim();
    const extra = (document.getElementById('_qrlc_extra')?.value || '').trim();

    if (printBtn) printBtn.disabled = !name && !phone && !serial;

    let qrText = serial || (state.customer?.kennitala) || ((name || '') + (phone ? ' ' + phone : '')).trim();
    if (!qrText) qrText = '—';

    let qrDataUrl = '';
    try { await ensureQRLib(); qrDataUrl = await qrPNG(qrText, state.qrSize); } catch (e) {}

    previewEl.innerHTML = buildLabelHTML({ qrDataUrl, name, phone, serial, extra });
    previewEl.dataset.qr = qrDataUrl;
    previewEl.dataset.name = name;
    previewEl.dataset.phone = phone;
    previewEl.dataset.serial = serial;
    previewEl.dataset.extra = extra;
  }

  function selectCustomer(c) {
    state.customer = c; state.devices = []; state.selectedDevice = null;
    document.getElementById('_qrlc_search').value = c.nafn || '';
    document.getElementById('_qrlc_results').classList.remove('open');
    document.getElementById('_qrlc_name').value = c.nafn || '';
    document.getElementById('_qrlc_phone').value = c.simi || '';
    document.getElementById('_qrlc_serial').value = '';
    document.getElementById('_qrlc_extra').value = '';
    const devSel = document.getElementById('_qrlc_device');
    devSel.innerHTML = '<option value="">— Hleður tækjum…</option>';
    devSel.disabled = true;
    loadDevicesForCustomer(c).then(devs => {
      state.devices = devs;
      devSel.innerHTML = '<option value="">— ekkert valið —</option>' +
        devs.map((d, i) => {
          const lbl = d.serial + (d.type ? ' · ' + d.type : '') + (d.size ? ' ' + d.size : '') + (d.location ? ' · ' + d.location : '') + (d.kind === 'lanstaeki' ? ' (lánstæki)' : '');
          return '<option value="' + i + '">' + esc(lbl) + '</option>';
        }).join('');
      devSel.disabled = false;
    });
    refreshPreview();
  }

  function selectDevice(idx) {
    const d = state.devices[idx];
    if (!d) { state.selectedDevice = null; return; }
    state.selectedDevice = d;
    document.getElementById('_qrlc_serial').value = d.serial || '';
    if (d.type || d.size) {
      document.getElementById('_qrlc_extra').value = [d.type, d.size].filter(Boolean).join(' ');
    }
    refreshPreview();
  }

  function openDialog() {
    closeDialog();
    state = { customer: null, devices: [], selectedDevice: null, qrSize: 320, searchTimer: null };
    const modal = document.createElement('div');
    modal.id = '_qrlc_modal';
    modal.innerHTML = `
      <div class="qrlc-card">
        <h2>🏷️ QR-miði 24 × 100 mm</h2>
        <div class="qrlc-sub">Stór QR-kóði (23×23mm) snúinn 90° til að auðvelda skönnun.</div>

        <label for="_qrlc_search">Leita að viðskiptavini</label>
        <input type="text" id="_qrlc_search" placeholder="Kennitala eða nafn (a.m.k. 2 stafir)…" autocomplete="off">
        <div id="_qrlc_results" class="qrlc-search-results"></div>

        <label for="_qrlc_device">Tæki (valfrjálst)</label>
        <select id="_qrlc_device" disabled><option value="">— veldu viðskiptavin fyrst —</option></select>

        <div class="qrlc-row2">
          <div>
            <label for="_qrlc_name">Nafn</label>
            <input type="text" id="_qrlc_name" placeholder="Nafn viðskiptavinar">
          </div>
          <div>
            <label for="_qrlc_phone">Sími</label>
            <input type="tel" id="_qrlc_phone" placeholder="Sími">
          </div>
        </div>
        <div class="qrlc-row2">
          <div>
            <label for="_qrlc_serial">Raðnúmer / SN <button type="button" id="_qrlc_genserial" style="margin-left:6px;font-size:11px;padding:2px 8px;border:1px solid #cbd5e1;background:#f8fafc;border-radius:4px;cursor:pointer">↻ Fá næsta (S0001…)</button></label>
            <input type="text" id="_qrlc_serial" placeholder="t.d. S0001">
          </div>
          <div>
            <label for="_qrlc_extra">Auka lína (valfrjáls)</label>
            <input type="text" id="_qrlc_extra" placeholder="t.d. 6kg ABC Duft">
          </div>
        </div>

        <div class="qrlc-preview-wrap">
          <div class="qrlc-preview-cap">Forskoðun · <span id="_qrlc_preview_cap_size">18 × 70 mm</span> (printable area · QR snúinn 90°)</div>
          <div id="_qrlc_preview"></div>
        </div>

        <div class="qrlc-row2" style="margin-top:8px">
          <div>
            <label for="_qrlc_length">Lengd miða (mm)</label>
            <select id="_qrlc_length">
              <option value="50">50 mm — stutt</option>
              <option value="70" selected>70 mm — stöðluð</option>
              <option value="90">90 mm</option>
              <option value="100">100 mm — löng</option>
            </select>
          </div>
          <div>
            <label for="_qrlc_count">Fjöldi miða</label>
            <input type="number" id="_qrlc_count" min="1" max="20" step="1" value="1" style="font-variant-numeric:tabular-nums">
          </div>
        </div>

        <div style="margin-top:6px">
          <button type="button" class="qrlc-btn" id="_qrlc_testpattern" style="width:100%" title="Prentar kvörðunarmynstur með hornum og krosshair fyrir að stilla prentara/límband.">
            🎯 Prufuprent (kvörðun)
          </button>
        </div>

        <div class="qrlc-actions">
          <button class="qrlc-btn" id="_qrlc_cancel">Loka</button>
          <button class="qrlc-btn primary" id="_qrlc_print" disabled>🖨 Prenta</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const search = document.getElementById('_qrlc_search');
    const results = document.getElementById('_qrlc_results');
    search.focus();
    search.addEventListener('input', () => {
      clearTimeout(state.searchTimer);
      const v = search.value.trim();
      if (v.length < 2) { results.classList.remove('open'); results.innerHTML = ''; return; }
      state.searchTimer = setTimeout(async () => {
        const matches = await searchCustomers(v);
        if (matches.length === 0) {
          results.innerHTML = '<div class="qrlc-empty">Engin samsvörun</div>';
        } else {
          results.innerHTML = matches.map((m, i) =>
            `<div class="qrlc-sr-item" data-i="${i}">
               <div class="qrlc-sr-name">${esc(m.nafn || '(ónefnt)')}</div>
               <div class="qrlc-sr-meta">${esc(m.kennitala || '')}${m.simi ? ' · 📞 ' + esc(m.simi) : ''}</div>
             </div>`
          ).join('');
          results.querySelectorAll('.qrlc-sr-item').forEach(el => {
            el.addEventListener('mousedown', (ev) => {
              ev.preventDefault();
              const i = +el.dataset.i;
              selectCustomer(matches[i]);
            });
          });
        }
        results.classList.add('open');
      }, 180);
    });
    search.addEventListener('blur', () => setTimeout(() => results.classList.remove('open'), 200));

    document.getElementById('_qrlc_device').addEventListener('change', (e) => {
      const v = e.target.value;
      if (v === '') { state.selectedDevice = null; return; }
      selectDevice(+v);
    });

    ['_qrlc_name', '_qrlc_phone', '_qrlc_serial', '_qrlc_extra'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        clearTimeout(state.searchTimer);
        state.searchTimer = setTimeout(refreshPreview, 120);
      });
    });

    document.getElementById('_qrlc_cancel').addEventListener('click', closeDialog);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeDialog(); });
    document.addEventListener('keydown', escHandler);

    document.getElementById('_qrlc_genserial').addEventListener('click', async () => {
      const btn = document.getElementById('_qrlc_genserial');
      btn.textContent = '⏳';
      const next = await fetchNextSerial();
      btn.textContent = '↻ Fá næsta (S0001…)';
      if (next) {
        document.getElementById('_qrlc_serial').value = next;
        refreshPreview();
      } else {
        alert('Gat ekki fengið næsta raðnúmer — keyrðu MIGRATION.sql í Supabase');
      }
    });

    document.getElementById('_qrlc_print').addEventListener('click', async () => {
      const printBtn = document.getElementById('_qrlc_print');
      // Reentrancy guard: prevent double-clicks while we're generating.
      if (printBtn.dataset.busy === '1') return;
      printBtn.dataset.busy = '1';
      printBtn.disabled = true;

      // Sequential-serial generation for multi-label print. Parses the
      // current serial (e.g. "S0001") and increments for labels 2..N.
      // If the serial doesn't match SnnnnnZ, falls back to appending "-N".
      function nextSerial(base, n) {
        if (n === 0) return base;
        const m = String(base || '').match(/^([A-Za-z]*)(\d+)$/);
        if (m) {
          const prefix = m[1];
          const num = parseInt(m[2], 10) + n;
          return prefix + String(num).padStart(m[2].length, '0');
        }
        return base + '-' + (n + 1);
      }

      try {
        // Read directly from inputs at click-time. The dataset on
        // _qrlc_preview can be stale because refreshPreview is async and
        // multiple concurrent calls (openDialog + selectCustomer +
        // fetchNextSerial completion) can race for kt-customer flow.
        const name   = (document.getElementById('_qrlc_name')?.value   || '').trim();
        const phone  = (document.getElementById('_qrlc_phone')?.value  || '').trim();
        let   serialBase = (document.getElementById('_qrlc_serial')?.value || '').trim();
        const extra  = (document.getElementById('_qrlc_extra')?.value  || '').trim();

        // If the serial input is still empty (openWithCustomer's
        // fetchNextSerial hadn't returned yet when the user clicked),
        // pull one now so we don't print "-2"/"-3" fallback labels.
        if (!serialBase) {
          printBtn.textContent = '⏳ Sæki raðnúmer…';
          serialBase = await fetchNextSerial();
          if (serialBase) {
            const inp = document.getElementById('_qrlc_serial');
            if (inp) inp.value = serialBase;
          }
        }

        const lengthMm = +(document.getElementById('_qrlc_length')?.value || 70);
        const count = Math.max(1, Math.min(20, +(document.getElementById('_qrlc_count')?.value || 1)));

        printBtn.textContent = count > 1 ? '⏳ Bý til ' + count + ' miða…' : '⏳ Bý til miða…';

        // refreshPreview swallows ensureQRLib errors in its try/catch, so
        // the QR library might have silently failed to load. Force-await
        // it here before we try to generate — otherwise the first qrPNG
        // call will throw TypeError on `new window.QRCode(...)` and the
        // whole handler will die silently.
        await ensureQRLib();

        // Generate all QRs in parallel. This minimises the delay between
        // the click and window.open (popup blockers can revoke the
        // user-gesture grant if too much time passes between them) and
        // keeps multi-label print snappy.
        const serials = [];
        for (let i = 0; i < count; i++) serials.push(nextSerial(serialBase || '', i));
        const qrTexts = serials.map(s => {
          const t = [name, phone, s, extra].filter(Boolean).join(' · ');
          // qrcodejs throws on empty input — always pass at least one char.
          return t || s || '—';
        });
        const qrUrls = await Promise.all(qrTexts.map(t => qrPNG(t, 320)));

        let labelHTML = '';
        for (let i = 0; i < count; i++) {
          labelHTML += buildPrintLabel({
            qrDataUrl: qrUrls[i], name, phone, serial: serials[i], extra
          });
        }

        openPrintWindow(labelHTML, lengthMm);

        // Advance the visible serial input so the NEXT manual print starts
        // from where this batch ended.
        if (count > 1) {
          const inp = document.getElementById('_qrlc_serial');
          if (inp) { inp.value = nextSerial(serialBase || '', count); refreshPreview(); }
        }
      } catch (err) {
        console.error('[qrlc] print failed', err);
        try { alert('Villa við að prenta: ' + (err && err.message ? err.message : err)); } catch (_) {}
      } finally {
        printBtn.dataset.busy = '0';
        printBtn.disabled = false;
        // Restore label via syncCountLabel (defined below in same closure).
        try { if (typeof syncCountLabel === 'function') syncCountLabel(); } catch (_) {}
      }
    });

    // Live-update the Prenta button label so the operator sees "Prenta 5 miða"
    // when they bump the count.
    const countInput = document.getElementById('_qrlc_count');
    const printBtnEl = document.getElementById('_qrlc_print');
    function syncCountLabel() {
      const n = Math.max(1, Math.min(20, +(countInput?.value || 1)));
      if (printBtnEl) printBtnEl.textContent = n > 1 ? '🖨 Prenta ' + n + ' miða' : '🖨 Prenta';
    }
    if (countInput) {
      countInput.addEventListener('input', syncCountLabel);
      syncCountLabel();
    }

    // Length dropdown updates the preview caption so the user sees what they
    // are about to print.
    document.getElementById('_qrlc_length').addEventListener('change', (e) => {
      const cap = document.getElementById('_qrlc_preview_cap_size');
      if (cap) cap.textContent = `18 × ${e.target.value} mm`;
    });

    // Test-pattern button — prints calibration markers at the currently
    // selected length so the user can verify printer alignment.
    document.getElementById('_qrlc_testpattern').addEventListener('click', () => {
      const lengthMm = +(document.getElementById('_qrlc_length')?.value || 70);
      printTestPattern(lengthMm);
    });

    refreshPreview();
  }
  function escHandler(e) { if (e.key === 'Escape') closeDialog(); }
  function closeDialog() {
    document.getElementById('_qrlc_modal')?.remove();
    document.removeEventListener('keydown', escHandler);
  }

  function ensureNavButton() {
    if (document.querySelector('.vnav-btn[data-qrlc]')) return;
    const existing = Array.from(document.querySelectorAll('.vnav-btn'))
      .find(b => /Prenta\s*QR/i.test(b.textContent));
    if (!existing || !existing.parentElement) return;
    const btn = document.createElement('button');
    btn.className = existing.className.replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-qrlc', '1');
    btn.textContent = '🏷️ QR-miði (18×70mm)';
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openDialog(); });
    existing.parentElement.insertBefore(btn, existing.nextSibling);
  }

  ensureNavButton();
  setTimeout(ensureNavButton, 500);
  setTimeout(ensureNavButton, 1500);
  const obs = new MutationObserver(() => ensureNavButton());
  obs.observe(document.body, { childList: true, subtree: true });

  // Allow callers (e.g. patch 07 checkout) to open the dialog with a customer
  // pre-selected and a fresh serial auto-fetched. 2026-05-19: optional
  // labelCount pre-fills the Fjöldi miða input so a 5-tæki refill auto-
  // batches all 5 labels with sequential serials.
  async function openWithCustomer(customer, labelCount) {
    openDialog();
    if (customer && (customer.nafn || customer.kt || customer.simi)) {
      // Reuse selectCustomer to wire up devices & names
      selectCustomer({ nafn: customer.nafn || '', kennitala: customer.kt || '', simi: customer.simi || '' });
    }
    // Pre-fill label count if caller knows how many tæki to print labels for
    if (typeof labelCount === 'number' && labelCount > 1) {
      const cnt = document.getElementById('_qrlc_count');
      if (cnt) {
        cnt.value = Math.min(20, Math.max(1, Math.floor(labelCount)));
        cnt.dispatchEvent(new Event('input'));
      }
    }
    // Auto-populate serial with next from sequence
    const next = await fetchNextSerial();
    if (next) {
      const inp = document.getElementById('_qrlc_serial');
      if (inp) { inp.value = next; refreshPreview(); }
    }
  }
  window.QrLabelCustomer = {
    open: openWithCustomer, openEmpty: openDialog, fetchNextSerial, printTestPattern,
    // Exposed so other patches (e.g. 139-print-brother-labels) can reuse the
    // exact same template/CSS rather than copy-pasting it.
    openPrintWindow, buildPrintLabel, ensureQRLib, qrPNG, LABEL_LENGTHS, LABEL_HEIGHT_MM,
    version: 'v5-20260519b'
  };
})();
/* === END QR LABEL CUSTOMER === */
