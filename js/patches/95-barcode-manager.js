/* === STRIKAMERKI MANAGER v1 ===
 *
 * Bætir við skjáborði fyrir strikamerki á tæki — handsláttur, skanna (QR + 1D),
 * vista og prenta á 54×17mm label.
 *
 * ── Aðgengi ───────────────────────────────────────────────────────────────
 *   1. Edit-modal opnar (frá Counter/Workshop/Companies/Geymsla/Lánstæki):
 *      ný "🏷 Strikamerki" hnappur efst sem opnar þessa skjáborð
 *   2. Á tækjarúðu (Counter / Workshop): nýr hraðtakkin "🏷" sem opnar þessa
 *      skjáborð beint án þess að fara í gegnum Edit
 *
 * ── Skjáborð inniheldur ────────────────────────────────────────────────────
 *   • Núverandi strikamerki (serial úr DB)
 *   • Input til að slá inn strikamerki handsmíðað
 *   • 📷 Skanna takki — opnar myndavél, les bæði QR og venjuleg 1D strikamerki
 *     (Code128, EAN-13, EAN-8, UPC, Code39, ITF) með ZXing-js
 *   • 💾 Vista — uppfærir uttaeki/lanstaeki.serial í Supabase
 *   • 🖨 Prenta á 54×17mm label (QR + nafn + sími) — kallar á patch 90 logic
 *
 * Skanninn styður:
 *   - QR (eins og fyrr)
 *   - Code 128 (algengasta 1D fyrir iðnaðar tæki)
 *   - EAN-13 / EAN-8 (verslunarstrikamerki)
 *   - UPC-A / UPC-E
 *   - Code 39 (eldri iðnaðar)
 *   - Interleaved 2 of 5 (ITF)
 */
(() => {
  if (window.__barcodeMgrInstalled) return;
  window.__barcodeMgrInstalled = true;

  // Load ZXing-js from CDN if not already loaded
  function ensureZXing() {
    if (window.ZXing || window.ZXingBrowser) return Promise.resolve(true);
    return new Promise((resolve) => {
      const s = document.createElement('script');
      // @zxing/browser@0.1.5 has no umd/index.min.js (404) — the UMD bundle is
      // umd/zxing-browser.min.js, which exposes window.ZXingBrowser.
      s.src = 'https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/umd/zxing-browser.min.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function getSB() { return (window.DB && window.DB.sb) || null; }

  async function findUnit(unitId, table) {
    const SB = getSB();
    if (!SB) return null;
    const tbl = table === 'lanstaeki' ? 'lanstaeki' : 'uttaeki';
    const cache = (window.DB && window.DB.cache && window.DB.cache.units) || [];
    const cached = cache.find(u => u.id === unitId);
    if (cached && tbl === 'uttaeki') return { ...cached, _table: tbl };
    const r = await SB.from(tbl).select('*').eq('id', unitId).single();
    if (r.error || !r.data) return null;
    return { ...r.data, _table: tbl };
  }

  async function updateUnitSerial(unitId, serial, table) {
    const SB = getSB();
    if (!SB) return false;
    const tbl = table === 'lanstaeki' ? 'lanstaeki' : 'uttaeki';
    const r = await SB.from(tbl).update({ serial }).eq('id', unitId);
    if (r.error) {
      alert('Villa: ' + r.error.message);
      return false;
    }
    // Update local cache for uttaeki
    if (tbl === 'uttaeki' && window.DB && window.DB.cache && Array.isArray(window.DB.cache.units)) {
      const idx = window.DB.cache.units.findIndex(u => u.id === unitId);
      if (idx >= 0) window.DB.cache.units[idx].serial = serial;
    }
    return true;
  }

  // ── Print 54×17mm label (re-implementing patch 90 print logic) ────────────
  function printSingleBarcode(unit, jobCustomer, jobPhone) {
    const win = window.open('', 'strikamerki-eitt', 'width=420,height=700');
    if (!win) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta strikamerki.'); return; }
    const ps = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('prentun')) || {};
    const sz = ps.label_size || '54x17';
    const dpiComp = Number.isFinite(+ps.dpi_compensation) ? +ps.dpi_compensation : 2;
    let w = 54, h = 17;
    if (sz === '62x17')      { w = 62; h = 17; }
    else if (sz === '62x100'){ w = 62; h = 100; }
    else if (sz === '38x90') { w = 38; h = 90; }
    const top = 9 + dpiComp;
    const qr = Math.max(4, Math.min(20, h - top - 1));
    const serial = unit.serial || '';
    const name = (unit.type || '') + (unit.size ? ' · ' + unit.size : '');
    const customer = jobCustomer || unit.client || '';
    const phone = jobPhone || unit.phone || '';
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Strikamerki — ' + esc(serial) + '</title>' +
'<style>' +
  '@page { size: ' + w + 'mm ' + h + 'mm; margin: 0; }' +
  'html, body { margin: 0; padding: 0; color: #000; font-family: Arial, Helvetica, sans-serif; }' +
  '.lbl { width: ' + w + 'mm; height: ' + h + 'mm; box-sizing: border-box; padding: ' + top + 'mm 6mm 0mm 5mm; display: flex; align-items: center; gap: 1.5mm; overflow: hidden; }' +
  '.qr { width: ' + qr + 'mm; height: ' + qr + 'mm; flex-shrink: 0; }' +
  '.lbl-text { flex: 1; min-width: 0; line-height: 1.05; }' +
  '.lbl-serial { font-size: 10pt; font-weight: 800; font-family: \'Courier New\', monospace; }' +
  '.lbl-name { font-size: 7.5pt; font-weight: 600; margin-top: 0.4mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
  '.lbl-phone { font-size: 6.5pt; color: #222; margin-top: 0.3mm; }' +
  '.lbl-org { font-size: 5.5pt; color: #555; margin-top: 0.3mm; }' +
  '.toolbar { padding: 8px 12px; background: #f4f4f4; border-bottom: 1px solid #ddd; text-align: center; font-size: 12px; }' +
  '.toolbar button { padding: 6px 14px; font-size: 12px; cursor: pointer; margin: 0 4px; }' +
  '@media print { .toolbar { display: none; } }' +
'</style></head><body>' +
'<div class="toolbar">1 strikamerki · ' + w + ' × ' + h + ' mm <button onclick="window.print()">🖨️ Prenta</button> <button onclick="window.close()">Loka</button></div>' +
'<div class="lbl">' +
  '<img class="qr" src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=' + encodeURIComponent(serial) + '" alt="' + esc(serial) + '">' +
  '<div class="lbl-text">' +
    '<div class="lbl-serial">' + esc(serial) + '</div>' +
    '<div class="lbl-name">' + esc(customer || name) + '</div>' +
    (phone ? '<div class="lbl-phone">📞 ' + esc(phone) + '</div>' : '') +
    '<div class="lbl-org">Slökkvitæki ehf · 565-4080</div>' +
  '</div>' +
'</div>' +
'<script>var imgs=Array.from(document.images);var loaded=0;function maybePrint(){loaded++;if(loaded>=imgs.length)setTimeout(function(){window.print();},250);}if(imgs.length===0)setTimeout(function(){window.print();},200);else imgs.forEach(function(img){if(img.complete)maybePrint();else{img.addEventListener("load",maybePrint);img.addEventListener("error",maybePrint);}});<\/script>' +
'</body></html>';
    win.document.write(html);
    win.document.close();
  }

  // ── Scanner overlay ────────────────────────────────────────────────────────
  let _scanController = null;

  async function openScanner(onResult) {
    const ok = await ensureZXing();
    if (!ok) {
      alert('Gat ekki hlaðið skannarbiblioteki. Athugaðu nettengingu og reyndu aftur.');
      return;
    }

    let dlg = document.getElementById('_bc-scan-dlg');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_bc-scan-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100025;background:rgba(0,0,0,0.85);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px';
    dlg.innerHTML =
      '<div style="background:#0f172a;color:#fff;width:min(560px,100%);border-radius:14px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5)">' +
        '<div style="padding:14px 18px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1e293b">' +
          '<div>' +
            '<h3 style="margin:0;font-size:16px;font-weight:700">📷 Skanna strikamerki</h3>' +
            '<div style="font-size:11px;color:#94a3b8;margin-top:3px">QR · Code 128 · EAN · UPC · Code 39 · ITF</div>' +
          '</div>' +
          '<button id="_bc-x" type="button" style="background:none;border:none;font-size:24px;color:#cbd5e1;cursor:pointer;padding:2px 8px">✕</button>' +
        '</div>' +
        '<video id="_bc-video" style="width:100%;max-height:60vh;background:#000;display:block" playsinline muted></video>' +
        '<div id="_bc-status" style="padding:12px 18px;font-size:13px;color:#cbd5e1;text-align:center;background:#1e293b">Beindu kameru að strikamerkinu…</div>' +
        '<div style="padding:10px 18px;background:#1e293b;display:flex;gap:8px;justify-content:flex-end">' +
          '<button id="_bc-cancel" type="button" style="padding:9px 18px;border:1px solid #475569;border-radius:8px;background:transparent;color:#cbd5e1;cursor:pointer;font-size:13px">Hætta við</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    function close() {
      try { if (_scanController && typeof _scanController.stop === 'function') _scanController.stop(); } catch(_){}
      _scanController = null;
      dlg.remove();
    }
    dlg.querySelector('#_bc-x').addEventListener('click', close);
    dlg.querySelector('#_bc-cancel').addEventListener('click', close);

    const video = dlg.querySelector('#_bc-video');
    const status = dlg.querySelector('#_bc-status');

    try {
      const ZX = window.ZXingBrowser || window.ZXing || {};
      // Build hints for multi-format support
      let reader;
      if (ZX.BrowserMultiFormatReader) {
        reader = new ZX.BrowserMultiFormatReader();
      } else if (ZX.BrowserBarcodeReader) {
        reader = new ZX.BrowserBarcodeReader();
      } else {
        status.textContent = 'Skannarbiblioteki vantar í þessa útgáfu.';
        return;
      }

      // Pick rear camera if available
      let deviceId;
      try {
        const devices = await ZX.BrowserCodeReader.listVideoInputDevices();
        const back = devices.find(d => /back|rear|environment/i.test(d.label));
        deviceId = back ? back.deviceId : (devices[0] && devices[0].deviceId);
      } catch (e) { deviceId = undefined; }

      _scanController = await reader.decodeFromVideoDevice(deviceId, video, (result, err) => {
        if (result) {
          const text = (typeof result.getText === 'function') ? result.getText() : (result.text || result);
          const fmt = (typeof result.getBarcodeFormat === 'function') ? result.getBarcodeFormat() : '';
          status.innerHTML = '<span style="color:#22c55e;font-weight:700">✓ Lest: ' + esc(text) + '</span>' + (fmt ? ' <span style="opacity:0.7;font-size:11px">(' + esc(String(fmt)) + ')</span>' : '');
          // Stop and return
          setTimeout(() => {
            close();
            try { onResult && onResult(text); } catch(e){ console.warn('[barcode-mgr] onResult err:', e); }
          }, 400);
        }
      });
    } catch (e) {
      status.innerHTML = '<span style="color:#dc2626">Villa: ' + esc(e.message || String(e)) + '</span>';
      console.warn('[barcode-mgr] scanner error:', e);
    }
  }

  // ── Strikamerki dialog (manual entry / scan / save / print) ───────────────
  async function openBarcodeDialog(unitId, table) {
    const unit = await findUnit(unitId, table);
    if (!unit) { alert('Tæki fannst ekki'); return; }

    let dlg = document.getElementById('_bc-mgr-dlg');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_bc-mgr-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100022;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px';

    const customer = unit.client || '';
    const phone = unit.phone || '';
    const typeName = (unit.type || '') + (unit.size ? ' · ' + unit.size : '');

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.3);width:min(540px,calc(100vw - 24px));overflow:hidden">' +
        '<div style="padding:14px 20px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#1e293b,#0f172a);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<h3 style="margin:0;font-size:16px;font-weight:700">🏷 Strikamerki</h3>' +
            '<div style="font-size:11px;color:#94a3b8;margin-top:3px">' + esc(typeName) + (customer ? ' · ' + esc(customer) : '') + '</div>' +
          '</div>' +
          '<button id="_bcm-x" type="button" style="background:none;border:none;font-size:22px;color:#cbd5e1;cursor:pointer;padding:2px 8px">✕</button>' +
        '</div>' +
        '<div style="padding:18px 20px">' +
          '<label style="display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px">Núverandi strikamerki</label>' +
          '<div style="display:flex;gap:8px">' +
            '<input id="_bcm-input" type="text" value="' + esc(unit.serial || '') + '" placeholder="t.d. SK-2153 eða 1234567890123" autocomplete="off" ' +
              'style="flex:1;padding:11px 14px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:15px;font-family:\'Courier New\',monospace;font-weight:700;letter-spacing:0.04em;box-sizing:border-box">' +
            '<button id="_bcm-scan" type="button" title="Skanna með myndavél" style="padding:11px 16px;background:#2563eb;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;white-space:nowrap">📷 Skanna</button>' +
          '</div>' +
          '<p style="margin:8px 0 0;font-size:12px;color:#64748b;line-height:1.4">Sláðu inn strikamerki handsmíðað eða skannaðu QR / venjulegt 1D strikamerki (Code 128, EAN, UPC, Code 39, o.fl.).</p>' +
          '<div style="margin-top:18px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;line-height:1.6">' +
            '<div style="font-weight:700;color:#0f172a;margin-bottom:6px">Á label (54×17mm):</div>' +
            '<div style="color:#475569">QR-kóði + <strong style="color:#0f172a">' + esc(customer || typeName) + '</strong>' + (phone ? '<br>📞 ' + esc(phone) : '') + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:space-between;padding:14px 20px;border-top:1px solid #e2e8f0;background:#f8fafc;flex-wrap:wrap">' +
          '<button id="_bcm-cancel" type="button" style="padding:10px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Loka</button>' +
          '<div style="display:flex;gap:8px">' +
            '<button id="_bcm-save" type="button" style="padding:10px 18px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">💾 Vista</button>' +
            '<button id="_bcm-print" type="button" style="padding:10px 18px;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">🖨 Prenta label</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    const input = dlg.querySelector('#_bcm-input');
    setTimeout(() => input.focus(), 50);

    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_bcm-x').addEventListener('click', close);
    dlg.querySelector('#_bcm-cancel').addEventListener('click', close);

    dlg.querySelector('#_bcm-scan').addEventListener('click', () => {
      openScanner(text => {
        if (text) input.value = String(text).trim();
        input.focus();
      });
    });

    dlg.querySelector('#_bcm-save').addEventListener('click', async () => {
      const v = input.value.trim();
      if (!v) { alert('Strikamerki má ekki vera tómt.'); return; }
      const btn = dlg.querySelector('#_bcm-save');
      btn.disabled = true; btn.textContent = '...';
      const ok = await updateUnitSerial(unit.id, v, unit._table);
      btn.disabled = false; btn.textContent = '💾 Vista';
      if (ok) {
        if (window.Toast && Toast.show) Toast.show('✓ Strikamerki vistað');
        unit.serial = v;
      } else {
        alert('Villa við vistun.');
      }
    });

    dlg.querySelector('#_bcm-print').addEventListener('click', () => {
      // Use the latest input value (in case user typed/scanned but didn't save yet)
      const u = { ...unit, serial: input.value.trim() || unit.serial };
      // Try to derive job context (Counter detail)
      let jobCustomer = '', jobPhone = '';
      try {
        if (window.Counter && Counter.sel && window.DB && DB.getJob) {
          const job = DB.getJob(Counter.sel);
          if (job) { jobCustomer = job.customer || ''; jobPhone = job.phone || ''; }
        }
      } catch(_){}
      printSingleBarcode(u, jobCustomer, jobPhone);
    });
  }

  // Public API
  window.BarcodeMgr = {
    open: openBarcodeDialog,
    scan: openScanner,
    print: printSingleBarcode
  };

  // ── Inject "🏷 Strikamerki" hraðtakkin in all unit-row contexts ───────────
  function decorateRows() {
    // Counter (Afgreiðsla) and Workshop (Verkstæði)
    document.querySelectorAll('#counter-main table.dtbl tbody tr, #workshop-main table.dtbl tbody tr').forEach(decorateCounterRow);
    // Companies detail rows
    document.querySelectorAll('#companies-main table tbody tr').forEach(decorateCompanyRow);
    // Geymsla rows
    document.querySelectorAll('#view-geymsla table tbody tr').forEach(decorateGenericRow);
    // Lánstæki rows
    document.querySelectorAll('#view-lanstaeki table tbody tr').forEach(decorateGenericRow);
  }

  function decorateCounterRow(row) {
    if (row.dataset._bcm95 === '1') return;
    const cells = row.querySelectorAll('td');
    if (cells.length < 6) return;
    const serialEl = row.querySelector('.ser');
    const serial = serialEl ? serialEl.textContent.trim() : '';
    if (!serial) return;
    const units = (window.DB && window.DB.cache && window.DB.cache.units) || [];
    const unit = units.find(u => u.serial === serial);
    if (!unit) return;
    row.dataset._bcm95 = '1';
    const actionCell = cells[cells.length - 1];
    if (actionCell.querySelector('._bcm-btn')) return;
    const wrap = actionCell.querySelector('span') || actionCell;
    appendBarcodeBtn(wrap, unit.id, 'uttaeki');
  }

  function decorateCompanyRow(row) {
    if (row.dataset._bcm95 === '1') return;
    const cells = row.querySelectorAll('td');
    if (cells.length < 2) return;
    const serial = cells[0].textContent.trim();
    if (!serial) return;
    const units = (window.DB && window.DB.cache && window.DB.cache.units) || [];
    const unit = units.find(u => u.serial === serial);
    if (!unit) return;
    row.dataset._bcm95 = '1';
    const last = cells[cells.length - 1];
    if (last.querySelector('._bcm-btn')) return;
    appendBarcodeBtn(last, unit.id, 'uttaeki');
  }

  function decorateGenericRow(row) {
    if (row.dataset._bcm95 === '1') return;
    const fc = row.querySelector('td');
    if (!fc) return;
    const serial = fc.textContent.trim();
    if (!serial) return;
    const isLan = !!row.closest('#view-lanstaeki');
    if (isLan) return; // we don't have a sync cache for lanstaeki, fetch on demand from button click
    const units = (window.DB && window.DB.cache && window.DB.cache.units) || [];
    const unit = units.find(u => u.serial === serial);
    if (!unit) return;
    row.dataset._bcm95 = '1';
    const last = row.querySelector('td:last-child');
    if (!last || last.querySelector('._bcm-btn')) return;
    appendBarcodeBtn(last, unit.id, 'uttaeki');
  }

  function appendBarcodeBtn(parent, unitId, table) {
    const btn = document.createElement('button');
    btn.className = '_bcm-btn btn btn-ghost btn-sm';
    btn.type = 'button';
    btn.title = 'Strikamerki — handsláttur, skanna, prenta';
    btn.style.cssText = 'padding:4px 7px;min-width:28px;margin-left:3px;color:#0f172a';
    btn.innerHTML = '🏷';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openBarcodeDialog(unitId, table);
    });
    parent.appendChild(btn);
  }

  // Scoped observers per main container — no body-wide observer.
  function attach(id) {
    const el = document.getElementById(id);
    if (!el) { setTimeout(() => attach(id), 800); return; }
    let t = 0;
    new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(decorateRows, 120);
    }).observe(el, { childList: true, subtree: true });
  }
  attach('counter-main');
  attach('workshop-main');
  attach('companies-main');
  attach('view-geymsla');
  attach('view-lanstaeki');

  setTimeout(decorateRows, 1200);
  setTimeout(decorateRows, 3000);

  console.log('[barcode-mgr] installed — 🏷 button on unit rows + ZXing scanner ready');
})();
/* === END STRIKAMERKI MANAGER v1 === */
