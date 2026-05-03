/* QR Label Print — Brother PT-P750W friendly
   Uses qrcodejs (cdnjs) which renders to DOM img */
(function(){
  'use strict';
  var QR_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';

  function loadQrLib(){
    return new Promise(function(res, rej){
      if (window.QRCode) { res(); return; }
      var s = document.createElement('script');
      s.src = QR_CDN;
      s.onload = function(){ res(); };
      s.onerror = function(){ rej(new Error('Could not load QR library')); };
      document.head.appendChild(s);
    });
  }

  function getQRMode(){ return localStorage.getItem('_qr_mode') || 'qr_only'; }
  function setQRMode(m){ localStorage.setItem('_qr_mode', m); }

  async function genQRDataUrl(payload, sizePx){
    await loadQrLib();
    return new Promise(function(res){
      var tmp = document.createElement('div');
      tmp.style.position = 'absolute';
      tmp.style.left = '-9999px';
      document.body.appendChild(tmp);
      new QRCode(tmp, {
        text: payload,
        width: sizePx || 400,
        height: sizePx || 400,
        correctLevel: QRCode.CorrectLevel.M
      });
      // Wait a tick for img to render
      setTimeout(function(){
        var img = tmp.querySelector('img');
        var canvas = tmp.querySelector('canvas');
        var dataUrl = img ? img.src : (canvas ? canvas.toDataURL('image/png') : '');
        tmp.remove();
        res(dataUrl);
      }, 100);
    });
  }

  async function printLabel(unit, opts){
    opts = opts || {};
    var mode = opts.mode || getQRMode();
    var payload = unit.serial;
    var qrDataUrl = await genQRDataUrl(payload, 400);

    var labelHtml;
    if (mode === 'qr_only') {
      labelHtml = `<div class="label"><img src="${qrDataUrl}" style="width:18mm;height:18mm;display:block;" /></div>`;
    } else {
      labelHtml = `<div class="label" style="display:flex;align-items:center;gap:2mm;height:18mm;">
        <img src="${qrDataUrl}" style="width:16mm;height:16mm;flex-shrink:0;" />
        <div style="font-family:Arial,sans-serif;font-size:8pt;line-height:1.2;">
          <div>${escHtml(unit.client || '')}</div>
          <div>${escHtml(unit.phone || '')}</div>
          <div style="font-weight:700;margin-top:1mm;">${escHtml(unit.serial)}</div>
        </div>
      </div>`;
    }

    var pageSize = mode === 'qr_only' ? '24mm 24mm' : '24mm 40mm';
    var labelDims = mode === 'qr_only' ? '18×18mm' : '40×18mm';

    var win = window.open('', '_blank', 'width=600,height=400');
    win.document.write(`<!doctype html><html><head><title>QR merki — ${escHtml(unit.serial)}</title>
<style>
@page { size: ${pageSize}; margin: 0; }
@media print { body { margin: 0; padding: 0; } .controls, .meta { display: none !important; } .page { padding:0; } .label-wrap { border:none; padding:0; } }
body { font-family: Arial, sans-serif; padding: 0; margin: 0; background:#f5f5f5; }
.page { padding:16px; display:flex;flex-direction:column;align-items:center;gap:14px; }
.label-wrap { background:#fff; padding: 6mm; border:1px dashed #ccc; border-radius:4px; }
.controls { display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:8px; }
.controls button, .controls a { background:#2563eb;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block; }
.controls .plain { background:#f3f4f6;color:#111; }
.meta { font-size:11px;color:#666;text-align:center; }
</style></head><body>
<div class="page">
  <div class="meta">Raðnúmer: <strong>${escHtml(unit.serial)}</strong> · Stærð: ${labelDims}</div>
  <div class="label-wrap">${labelHtml}</div>
  <div class="controls">
    <button onclick="window.print()">🖨 Prenta núna</button>
    <a href="${qrDataUrl}" download="qr-${escHtml(unit.serial)}.png">💾 Hlaða niður PNG</a>
    <button class="plain" onclick="window.close()">Loka</button>
  </div>
  <div class="meta" style="max-width:400px;text-align:center;margin-top:6px;">
    Mobile: Opna Brother iPrint&Label appið og hlaða inn PNG.<br>Desktop: Prenta beint í Brother PT-P750W driver.
  </div>
</div>
</body></html>`);
    win.document.close();
    return qrDataUrl;
  }

  function escHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  function openSettings(){
    var m = document.createElement('div');
    m.id = '_qr_settings';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9700;display:flex;align-items:center;justify-content:center;padding:20px;';
    var cur = getQRMode();
    m.innerHTML = `<div style="background:#fff;border-radius:14px;padding:24px;width:100%;max-width:440px;">
      <h2 style="margin:0 0 6px;font-size:18px;">🖨 QR prentstillingar</h2>
      <p style="margin:0 0 16px;color:#666;font-size:13px;">Veldu útlit á QR merki fyrir Brother PT-P750W (24mm tape)</p>
      <label style="display:block;border:2px solid ${cur==='qr_only'?'#2563eb':'#e5e7eb'};border-radius:10px;padding:14px;margin-bottom:10px;cursor:pointer;">
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="radio" name="_qrmode" value="qr_only" ${cur==='qr_only'?'checked':''}>
          <div><div style="font-weight:700;">QR aðeins (18×18mm)</div>
          <div style="font-size:12px;color:#666;">Lítið, ferhyrnt, hámark pláss fyrir QR</div></div>
        </div>
      </label>
      <label style="display:block;border:2px solid ${cur==='qr_text'?'#2563eb':'#e5e7eb'};border-radius:10px;padding:14px;margin-bottom:16px;cursor:pointer;">
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="radio" name="_qrmode" value="qr_text" ${cur==='qr_text'?'checked':''}>
          <div><div style="font-weight:700;">QR + nafn + sími + raðnúmer (40×18mm)</div>
          <div style="font-size:12px;color:#666;">Læsileg áletrun ef QR skanni bilar</div></div>
        </div>
      </label>
      <div style="display:flex;gap:8px;">
        <button id="_qr_cancel" style="flex:1;background:#f3f4f6;color:#111;border:none;border-radius:9px;padding:11px;font-size:13px;font-weight:600;cursor:pointer;">Hætta við</button>
        <button id="_qr_save" style="flex:2;background:#2563eb;color:#fff;border:none;border-radius:9px;padding:11px;font-size:13px;font-weight:700;cursor:pointer;">💾 Vista stillingu</button>
      </div>
    </div>`;
    document.body.appendChild(m);
    document.getElementById('_qr_cancel').onclick = function(){ m.remove(); };
    document.getElementById('_qr_save').onclick = function(){
      var sel = m.querySelector('input[name=_qrmode]:checked');
      if (sel) setQRMode(sel.value);
      m.remove();
    };
    m.onclick = function(e){ if (e.target===m) m.remove(); };
  }

  window.printQRLabel = printLabel;
  window.openQRSettings = openSettings;
  console.log('[QR] module loaded — mode:', getQRMode());
})();
