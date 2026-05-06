/* === UNDIRSKRIFTARREITUR / SIGNATURE PAD v1 === */
/* Captures customer signature on canvas, saves as PNG to verkbeidnir.signature_url
 *
 * SQL:
 *   ALTER TABLE verkbeidnir ADD COLUMN IF NOT EXISTS signature_url TEXT;
 *   ALTER TABLE verkbeidnir ADD COLUMN IF NOT EXISTS signed_by TEXT;
 *   ALTER TABLE verkbeidnir ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
 */
(() => {
  if (window.__sigpadInstalled) return;
  window.__sigpadInstalled = true;

  const BUCKET = 'samningar'; // reuse contracts bucket

  function getSB(){ return window.DB && window.DB.sb; }
  function esc(s){return String(s==null?'':s);}

  function open(jobId, jobNum, customerNafn, onSaved){
    const m = document.createElement('div');
    m.id = 'sigpad';
    m.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px';
    m.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:22px;max-width:560px;width:100%">
        <h3 style="margin:0 0 4px">✍️ Undirskrift viðskiptavinar</h3>
        <div style="font-size:13px;color:#64748b;margin-bottom:12px">${esc(jobNum?'Verk '+jobNum:'')} ${esc(customerNafn||'')}</div>
        <canvas id="sig-canvas" width="500" height="200" style="border:2px dashed #cbd5e1;border-radius:8px;width:100%;background:#fafbfc;cursor:crosshair;touch-action:none"></canvas>
        <div style="display:flex;gap:8px;margin-top:8px">
          <input id="sig-name" placeholder="Nafn undirritaðs" style="flex:1;padding:8px;border:1px solid #e2e8f0;border-radius:6px">
        </div>
        <div style="display:flex;gap:8px;justify-content:space-between;margin-top:12px">
          <button class="btn btn-outline" onclick="SignaturePad._clear()">🧽 Hreinsa</button>
          <div style="display:flex;gap:8px">
            <button class="btn btn-outline" onclick="document.getElementById('sigpad').remove()">Hætta við</button>
            <button class="btn btn-primary" onclick="SignaturePad._save()">💾 Vista</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(m);
    m.dataset.jobId = jobId || '';
    if (onSaved) m._onSaved = onSaved;

    const canvas = document.getElementById('sig-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 200 * 2;
    ctx.scale(2,2);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    let drawing = false, hasDrawn = false;
    function pos(e){
      const r = canvas.getBoundingClientRect();
      const x = (e.touches?e.touches[0].clientX:e.clientX) - r.left;
      const y = (e.touches?e.touches[0].clientY:e.clientY) - r.top;
      return { x, y };
    }
    function start(e){ e.preventDefault(); drawing=true; hasDrawn=true; const p=pos(e); ctx.beginPath(); ctx.moveTo(p.x,p.y); }
    function move(e){ if(!drawing) return; e.preventDefault(); const p=pos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); }
    function end(){ drawing=false; }
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive:false });
    canvas.addEventListener('touchmove', move, { passive:false });
    canvas.addEventListener('touchend', end);
    window._sigCanvas = canvas; window._sigCtx = ctx; window._sigHasDrawn = () => hasDrawn;
  }

  function _clear(){
    const c = document.getElementById('sig-canvas');
    if (!c) return;
    c.getContext('2d').clearRect(0,0,c.width,c.height);
    window._sigHasDrawn = () => false;
  }

  async function _save(){
    const m = document.getElementById('sigpad');
    const c = document.getElementById('sig-canvas');
    if (!c || !window._sigHasDrawn || !window._sigHasDrawn()) { alert('Vinsamlegast skrifaðu undir'); return; }
    const name = document.getElementById('sig-name').value.trim();
    if (!name) { alert('Sláðu inn nafn undirritaðs'); return; }
    const dataUrl = c.toDataURL('image/png');
    const blob = await (await fetch(dataUrl)).blob();
    const SB = getSB();
    const jobId = parseInt(m.dataset.jobId)||null;
    const ts = Date.now();
    const path = jobId ? `sig_job_${jobId}/${ts}.png` : `sig/${ts}.png`;
    const up = await SB.storage.from(BUCKET).upload(path, blob, { contentType:'image/png' });
    if (up.error) { alert('Villa: '+up.error.message); return; }
    const { data: pub } = SB.storage.from(BUCKET).getPublicUrl(path);
    const url = pub.publicUrl;
    if (jobId) {
      await SB.from('verkbeidnir').update({
        signature_url: url, signed_by: name, signed_at: new Date().toISOString()
      }).eq('id', jobId);
    }
    if (m._onSaved) m._onSaved({ url, name });
    m.remove();
    if (!m._onSaved) alert('✓ Undirskrift vistuð');
  }

  // Inject ✍️ button on job rows
  const obs = new MutationObserver(() => {
    document.querySelectorAll('[data-job-id]:not([data-sig-injected])').forEach(row => {
      const id = row.dataset.jobId;
      if (!id) return;
      row.dataset.sigInjected='1';
      const actions = row.querySelector('.row-actions, .job-actions');
      if (!actions) return;
      const btn = document.createElement('button');
      btn.className='btn btn-ghost btn-sm';
      btn.title='Undirskrift';
      btn.innerHTML='✍️';
      btn.onclick = e => { e.stopPropagation(); open(id, row.dataset.num||row.dataset.jobNum||'', row.dataset.customer||row.dataset.companyNafn||''); };
      actions.appendChild(btn);
    });
  });
  obs.observe(document.body, { childList:true, subtree:true });

  window.SignaturePad = { open, _clear, _save };
  console.log('[signature-pad] installed');
})();
