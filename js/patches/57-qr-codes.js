/* === QR-STRIKAMERKI / QR CODES v1 === */
/* Prints sheet of QR codes for fire extinguishers (uttaeki).
 * Scanning a QR opens the device detail in the app: #device=<id>.
 * Uses qrcode library loaded from CDN.
 */
(() => {
  if (window.__qrInstalled) return;
  window.__qrInstalled = true;

  function getSB(){ return window.DB && window.DB.sb; }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  // Load QRCode.js library on demand
  let qrLibPromise = null;
  function loadQRLib(){
    if (qrLibPromise) return qrLibPromise;
    qrLibPromise = new Promise((resolve, reject) => {
      if (window.QRCode) return resolve(window.QRCode);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
      s.onload = () => resolve(window.QRCode);
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return qrLibPromise;
  }

  function deviceUrl(id){
    return location.origin + location.pathname.replace(/[^/]+$/,'') + '#device=' + id;
  }

  async function generateQRDataUrl(text, size){
    await loadQRLib();
    return await window.QRCode.toDataURL(text, { width:size||120, margin:1 });
  }

  // ── Print QR labels for selected/all devices ──────────────────────────────
  async function printLabels(deviceIds){
    const SB = getSB(); if (!SB) return;
    let q = SB.from('uttaeki').select('id,serial,client,type').order('serial');
    if (deviceIds && deviceIds.length) q = q.in('id', deviceIds);
    const { data } = await q;
    if (!data || !data.length) { alert('Engin tæki fundust'); return; }
    await loadQRLib();
    const w = window.open('', '_blank');
    if (!w) { alert('Leyfðu popup glugga'); return; }
    let cards = '';
    for (const d of data) {
      const url = deviceUrl(d.id);
      const dataUrl = await generateQRDataUrl(url, 140);
      cards += `<div class="lbl">
        <img src="${dataUrl}" alt="QR">
        <div class="info">
          <div class="nr">${esc(d.serial||'#'+d.id)}</div>
          <div class="co">${esc(d.client||'')}</div>
          <div class="tg">${esc(d.type||'')}</div>
        </div>
      </div>`;
    }
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>QR Strikamerki</title>
<style>
  @page{size:A4;margin:8mm}
  body{font-family:'IBM Plex Sans',system-ui,sans-serif;margin:0;padding:8mm}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm}
  .lbl{border:1px solid #000;padding:4mm;display:flex;gap:4mm;align-items:center;page-break-inside:avoid}
  .lbl img{width:28mm;height:28mm}
  .info{flex:1;font-size:12px}
  .nr{font-weight:700;font-size:14px}
  .co{color:#444;margin:2px 0}
  .tg{color:#888;font-size:11px}
  @media print{body{padding:0}}
</style></head><body><div class="grid">${cards}</div>
<script>setTimeout(()=>window.print(),500);<\/script></body></html>`);
    w.document.close();
  }

  // ── Mobile-friendly scanner: opens camera, scans QR, navigates ────────────
  function openScanner(){
    const m = document.createElement('div');
    m.style.cssText='position:fixed;inset:0;z-index:99999;background:#000;display:flex;flex-direction:column';
    m.innerHTML = `
      <div style="background:#1e293b;color:#fff;padding:14px;display:flex;justify-content:space-between;align-items:center">
        <strong>📷 Skanna QR-strikamerki</strong>
        <button onclick="this.closest('div[style*=fixed]').remove();window.QRScanner&&window.QRScanner._stop()" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer">✕</button>
      </div>
      <video id="qr-video" style="flex:1;width:100%;object-fit:cover;background:#000" playsinline></video>
      <div id="qr-status" style="background:#fef3c7;color:#92400e;padding:14px;text-align:center;font-size:13px">Beindu myndavélinni að QR-strikamerkinu</div>`;
    document.body.appendChild(m);

    // Use BarcodeDetector API where available (Chrome on Android), fall back to manual entry
    if ('BarcodeDetector' in window) {
      const detector = new window.BarcodeDetector({ formats:['qr_code'] });
      navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } }).then(stream => {
        const v = document.getElementById('qr-video');
        v.srcObject = stream; v.play();
        let stopped = false;
        window.QRScanner = { _stop:()=>{ stopped=true; stream.getTracks().forEach(t=>t.stop()); } };
        async function tick(){
          if (stopped) return;
          try {
            const codes = await detector.detect(v);
            if (codes && codes[0]) {
              const u = codes[0].rawValue;
              const idMatch = u.match(/device=(\d+)/);
              if (idMatch) {
                window.QRScanner._stop();
                m.remove();
                location.hash = 'device='+idMatch[1];
                _showDevice(parseInt(idMatch[1]));
                return;
              }
            }
          } catch(e){}
          requestAnimationFrame(tick);
        }
        tick();
      }).catch(e => {
        document.getElementById('qr-status').textContent = '⚠️ Get ekki opnað myndavél: '+e.message;
      });
    } else {
      document.getElementById('qr-status').innerHTML = '⚠️ QR-skanning virkar bara í Chrome á Android. Notaðu símann eða sláðu inn nr handvirkt:<br><input id="qr-manual" placeholder="Tækisnr" style="margin-top:8px;padding:6px;border-radius:4px;border:1px solid #ddd"><button onclick="window.QRScanner._manual()" style="margin-left:6px;padding:6px 12px;background:#3b82f6;color:#fff;border:none;border-radius:4px;cursor:pointer">Opna</button>';
      window.QRScanner = { _stop:()=>{}, _manual:async ()=>{
        const nr = document.getElementById('qr-manual').value.trim();
        if (!nr) return;
        const SB = getSB();
        const { data } = await SB.from('uttaeki').select('id').eq('serial', nr).limit(1).single();
        if (data) { m.remove(); _showDevice(data.id); } else alert('Tæki fannst ekki');
      }};
    }
  }

  // Listen for #device=X hash on load → show device detail
  async function _showDevice(id){
    const SB = getSB(); if (!SB) return;
    const { data: dev } = await SB.from('uttaeki').select('*').eq('id', id).single();
    if (!dev) { alert('Tæki fannst ekki'); return; }
    if (window.DeviceHistory && window.DeviceHistory.show) window.DeviceHistory.show(dev);
    else alert(`Tæki: ${dev.serial}\n${dev.client||''}\nSíðasta skoðun: ${dev.last_insp||'—'}\nNæsta skoðun: ${dev.next_insp||'—'}`);
  }

  function checkHash(){
    const m = (location.hash||'').match(/device=(\d+)/);
    if (m) _showDevice(parseInt(m[1]));
  }
  setTimeout(checkHash, 1500);
  window.addEventListener('hashchange', checkHash);

  // Floating scanner button
  function ensureBtn(){
    if (document.getElementById('qr-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'qr-fab';
    btn.title = 'Skanna QR-strikamerki';
    btn.innerHTML = '📷';
    btn.style.cssText='position:fixed;bottom:20px;right:20px;width:52px;height:52px;border-radius:50%;background:#3b82f6;color:#fff;border:none;font-size:24px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.25);z-index:9998;display:none';
    btn.onclick = openScanner;
    document.body.appendChild(btn);
    // Show only on mobile
    if (window.innerWidth < 768) btn.style.display = 'block';
    window.addEventListener('resize', () => btn.style.display = window.innerWidth<768?'block':'none');
  }
  setTimeout(ensureBtn, 1500);

  // Inject "🏷 Prenta QR" button into þjónustutæki view header
  const obs = new MutationObserver(() => {
    const view = document.getElementById('view-thjonustutaeki');
    if (!view || view.dataset.qrBtnAdded) return;
    const hd = view.querySelector('h1, .page-title');
    if (!hd || !hd.parentElement) return;
    view.dataset.qrBtnAdded = '1';
    const btn = document.createElement('button');
    btn.className = 'btn btn-outline';
    btn.style.cssText = 'margin-left:auto';
    btn.innerHTML = '🏷 Prenta QR-strikamerki';
    btn.onclick = () => printLabels();
    if (hd.parentElement.style.display !== 'flex') hd.parentElement.style.display = 'flex';
    hd.parentElement.appendChild(btn);
  });
  obs.observe(document.body, { childList:true, subtree:true });

  window.QRCodes = { printLabels, openScanner, generateQRDataUrl, deviceUrl };
  console.log('[qr-codes] installed');
})();
