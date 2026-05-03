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

    /* Preview at near-actual scale (96dpi → 24mm≈91px, 100mm≈378px). */
    .qrlc-label {
      width: 378px; height: 91px;
      background: #fff; border: 1px solid #cbd5e1;
      display: flex; align-items: stretch;
      margin: 0 auto;
      font-family: 'Helvetica Neue', Arial, sans-serif;
      overflow: hidden;
      box-sizing: border-box;
      padding: 2px;
    }
    .qrlc-label .ql-qr {
      flex: 0 0 87px;       /* ~23mm at 96dpi */
      padding: 0;
      display: flex; align-items: center; justify-content: center;
    }
    .qrlc-label .ql-qr img {
      width: 87px; height: 87px;        /* fill the 23mm box */
      transform: rotate(90deg);         /* rotate so QR top faces text */
      image-rendering: pixelated;
    }
    .qrlc-label .ql-text {
      flex: 1; padding: 0 4px 0 6px;
      display: flex; flex-direction: column; justify-content: center;
      min-width: 0;
    }
    .qrlc-label .ql-name {
      font-size: 15px; font-weight: 700; color: #000;
      line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .qrlc-label .ql-phone {
      font-size: 13px; color: #000; margin-top: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .qrlc-label .ql-line {
      font-size: 11px; color: #334155; margin-top: 1px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .qrlc-label .ql-serial {
      font-size: 10px; color: #475569; margin-top: 3px; font-family: 'Courier New', monospace;
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
  function openPrintWindow(labelHTML) {
    const win = window.open('', '_blank', 'width=900,height=500');
    if (!win) { alert('Vinsamlegast leyfa popup glugga til að prenta.'); return; }
    win.document.open();
    win.document.write(`
      <!doctype html><html><head><meta charset="utf-8"><title>QR-miði 24×100mm</title>
      <style>
        @page { size: 100mm 24mm; margin: 0; }
        @media print {
          html, body { margin: 0; padding: 0; background: #fff; }
        }
        html, body { margin: 0; padding: 0; background: #fff;
          font-family: 'Helvetica Neue', Arial, sans-serif; }
        .sheet {
          width: 100mm; height: 24mm; box-sizing: border-box;
          padding: 0.5mm; display: flex; align-items: stretch;
          page-break-after: always;
        }
        .ql-qr {
          flex: 0 0 23mm; padding: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .ql-qr img {
          width: 23mm; height: 23mm;
          transform: rotate(90deg);
          image-rendering: pixelated;
        }
        .ql-text {
          flex: 1; padding: 0 1.5mm 0 2mm;
          display: flex; flex-direction: column; justify-content: center;
          min-width: 0; overflow: hidden;
        }
        .ql-name { font-size: 13pt; font-weight: 700; color: #000;
          line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ql-phone { font-size: 11pt; color: #000; margin-top: .8mm;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ql-line { font-size: 9pt; color: #000; margin-top: .5mm;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ql-serial { font-size: 8pt; color: #333; margin-top: .8mm;
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
            <label for="_qrlc_serial">Raðnúmer / SN</label>
            <input type="text" id="_qrlc_serial" placeholder="t.d. NEW-1234">
          </div>
          <div>
            <label for="_qrlc_extra">Auka lína (valfrjáls)</label>
            <input type="text" id="_qrlc_extra" placeholder="t.d. 6kg ABC Duft">
          </div>
        </div>

        <div class="qrlc-preview-wrap">
          <div class="qrlc-preview-cap">Forskoðun · 24 mm × 100 mm (QR snúinn 90°)</div>
          <div id="_qrlc_preview"></div>
        </div>

        <div class="qrlc-actions">
          <button class="qrlc-btn" id="_qrlc_cancel">Hætta við</button>
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

    document.getElementById('_qrlc_print').addEventListener('click', async () => {
      const previewEl = document.getElementById('_qrlc_preview');
      const ds = previewEl.dataset;
      const labelHTML = buildPrintLabel({
        qrDataUrl: ds.qr || '', name: ds.name, phone: ds.phone, serial: ds.serial, extra: ds.extra
      });
      openPrintWindow(labelHTML);
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
    btn.textContent = '🏷️ QR-miði (24×100mm)';
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openDialog(); });
    existing.parentElement.insertBefore(btn, existing.nextSibling);
  }

  ensureNavButton();
  setTimeout(ensureNavButton, 500);
  setTimeout(ensureNavButton, 1500);
  const obs = new MutationObserver(() => ensureNavButton());
  obs.observe(document.body, { childList: true, subtree: true });

  window.QrLabelCustomer = { open: openDialog, version: 'v2' };
})();
/* === END QR LABEL CUSTOMER === */
