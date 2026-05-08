/* Scan Mode v2 — multi-context continuous camera auto-capture
   Contexts: geymsla (uttaeki table), lanstaeki (lanstaeki table) */
(function(){
  'use strict';

  var CONTEXTS = {
    geymsla: {
      title: 'Skanna í geymslu',
      table: 'uttaeki',
      status: 'geymsla',
      steps: [
        { key:'serial',   label:'Raðnúmer',       icon:'🏷️', hint:'Beindu myndavélinni á raðnúmer' },
        { key:'customer', label:'Viðskiptavinur', icon:'👤', hint:'Beindu á handritaða nafnið' },
        { key:'phone',    label:'Sími (7 stafir)',icon:'📞', hint:'Beindu á símanúmerið' },
        { key:'storage',  label:'Geymslurými',    icon:'📦', hint:'Beindu á G1-G20 merkið' }
      ],
      buildRecord: function(v){
        return {
          serial: v.serial,
          type: v.type,
          size: v.size,
          client: v.customer,
          phone: v.phone,
          location: 'Geymsla - ' + v.storage,
          status: 'geymsla',
          notes: 'Skráð með skönnun'
        };
      }
    },
    lanstaeki: {
      title: 'Skanna lánstæki',
      table: 'lanstaeki',
      status: 'loaned',
      steps: [
        { key:'serial',   label:'Raðnúmer lánstækis', icon:'🏷️', hint:'Beindu á raðnúmer á tækinu' },
        { key:'customer', label:'Viðskiptavinur',     icon:'👤', hint:'Hver er að fá lánað?' },
        { key:'phone',    label:'Sími (7 stafir)',    icon:'📞', hint:'Beindu á símanúmerið' }
      ],
      buildRecord: function(v){
        return {
          serial: v.serial,
          type: v.type,
          size: v.size,
          client: v.customer,
          location: v.customer, // "hvar er tækið" = hjá viðskiptavini
          status: 'loaned',
          loaned_at: new Date().toISOString().slice(0,10),
          notes: 'Lánað út ' + new Date().toLocaleDateString('is-IS') + ' · Sími: ' + v.phone
        };
      }
    }
  };

  var state = null;

  function openScan(contextKey){
    contextKey = contextKey || 'geymsla';
    var ctx = CONTEXTS[contextKey];
    if (!ctx) { alert('Ókunnugt samhengi: '+contextKey); return; }
    closeScan();
    state = {
      ctx: ctx,
      ctxKey: contextKey,
      stepIdx: 0,
      values: {},
      stream: null,
      lastFrame: null,
      stillFrames: 0,
      processing: false,
      phase: 'scanning'
    };
    buildUI();
    startCamera();
  }

  function closeScan(){
    if (state && state.stream) {
      state.stream.getTracks().forEach(function(t){ t.stop(); });
    }
    var m = document.getElementById('_scan_modal');
    if (m) m.remove();
    state = null;
  }

  function buildUI(){
    var steps = state.ctx.steps;
    var pbars = steps.map(function(s,i){
      return '<div class="_sc_pbar '+(i===0?'_sc_pbar_active':'')+'" data-step="'+i+'"></div>';
    }).join('');

    var modal = document.createElement('div');
    modal.id = '_scan_modal';
    modal.style.cssText = 'position:fixed;inset:0;background:#000;z-index:10000;display:flex;flex-direction:column;';
    modal.innerHTML = `
      <div id="_sc_topbar" style="background:rgba(0,0,0,.85);color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <div style="flex:1;">
          <div id="_sc_step_label" style="font-size:14px;font-weight:700;">Skref 1 af ${steps.length}</div>
          <div id="_sc_step_hint" style="font-size:12px;opacity:0.85;margin-top:2px;"></div>
        </div>
        <button id="_sc_close" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;">✕ Hætta</button>
      </div>
      <div id="_sc_progress" style="display:flex;gap:4px;padding:6px 16px;background:rgba(0,0,0,.85);flex-shrink:0;">${pbars}</div>
      <div id="_sc_viewport" style="flex:1;position:relative;overflow:hidden;background:#111;display:flex;align-items:center;justify-content:center;">
        <video id="_sc_video" playsinline muted autoplay style="width:100%;height:100%;object-fit:cover;"></video>
        <canvas id="_sc_canvas" style="display:none;"></canvas>
        <div id="_sc_frame" style="position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center;">
          <div style="border:3px dashed rgba(255,255,255,.6);border-radius:16px;width:75%;height:35%;box-shadow:0 0 0 100vmax rgba(0,0,0,.35);"></div>
        </div>
        <div id="_sc_status" style="position:absolute;top:14px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);color:#fff;padding:10px 18px;border-radius:30px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px;">
          <span id="_sc_status_dot" style="width:10px;height:10px;border-radius:50%;background:#fbbf24;"></span>
          <span id="_sc_status_text">Haltu myndavél kyrri...</span>
        </div>
      </div>
      <div id="_sc_bottom" style="background:rgba(0,0,0,.85);color:#fff;padding:14px 16px;flex-shrink:0;">
        <div id="_sc_collected" style="display:flex;gap:6px;flex-wrap:wrap;font-size:11px;"></div>
        <div id="_sc_actions" style="display:flex;gap:8px;margin-top:10px;">
          <button id="_sc_manual" style="flex:1;background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:600;cursor:pointer;">⌨ Slá inn handvirkt</button>
          <button id="_sc_retake" style="flex:1;background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:600;cursor:pointer;">⟳ Taka mynd</button>
        </div>
      </div>
    `;
    var st = document.createElement('style');
    st.textContent = '._sc_pbar{flex:1;height:4px;background:rgba(255,255,255,.2);border-radius:2px;transition:background .2s;}._sc_pbar_done{background:#10b981;}._sc_pbar_active{background:#fbbf24;}._sc_pill{background:rgba(255,255,255,.1);padding:6px 10px;border-radius:8px;display:flex;align-items:center;gap:6px;}._sc_pill_done{background:rgba(16,185,129,.25);}';
    modal.appendChild(st);
    document.body.appendChild(modal);
    document.getElementById('_sc_close').onclick = closeScan;
    document.getElementById('_sc_manual').onclick = manualEntry;
    document.getElementById('_sc_retake').onclick = function(){
      if (state.phase === 'scanning') { state.stillFrames = 0; updateStatus('Haltu myndavél kyrri...', '#fbbf24'); }
    };
    updateStepUI();
    updateCollected();
  }

  function updateStepUI(){
    var step = state.ctx.steps[state.stepIdx];
    var n = state.ctx.steps.length;
    document.getElementById('_sc_step_label').textContent = step.icon + ' ' + step.label + ' (skref '+(state.stepIdx+1)+' af '+n+')';
    document.getElementById('_sc_step_hint').textContent = step.hint;
    Array.prototype.forEach.call(document.querySelectorAll('._sc_pbar'), function(b, i){
      b.classList.remove('_sc_pbar_active','_sc_pbar_done');
      if (i < state.stepIdx) b.classList.add('_sc_pbar_done');
      else if (i === state.stepIdx) b.classList.add('_sc_pbar_active');
    });
  }

  function updateCollected(){
    var pills = state.ctx.steps.map(function(s, i){
      var v = state.values[s.key];
      return '<div class="_sc_pill '+(v?'_sc_pill_done':'')+'">'+s.icon+' '+(v||'—')+'</div>';
    }).join('');
    document.getElementById('_sc_collected').innerHTML = pills;
  }

  function updateStatus(text, color){
    document.getElementById('_sc_status_text').textContent = text;
    document.getElementById('_sc_status_dot').style.background = color;
  }

  async function startCamera(){
    try {
      var s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: {ideal:'environment'}, width:{ideal:1280}, height:{ideal:720} }
      });
      state.stream = s;
      var v = document.getElementById('_sc_video');
      v.srcObject = s;
      await v.play();
      setTimeout(tick, 500);
    } catch (e) {
      updateStatus('Enginn aðgangur að myndavél: ' + e.message, '#dc2626');
    }
  }

  function tick(){
    if (!state || state.phase !== 'scanning') { setTimeout(tick, 200); return; }
    var v = document.getElementById('_sc_video');
    if (!v || v.videoWidth === 0) { setTimeout(tick, 200); return; }
    var c = document.getElementById('_sc_canvas');
    var smallW = 64, smallH = 48;
    c.width = smallW; c.height = smallH;
    var ctx = c.getContext('2d');
    ctx.drawImage(v, 0, 0, smallW, smallH);
    var frame = ctx.getImageData(0, 0, smallW, smallH).data;
    var diff = 0;
    if (state.lastFrame) {
      for (var i=0;i<frame.length;i+=4){
        diff += Math.abs(frame[i] - state.lastFrame[i]);
      }
      diff = diff / (smallW * smallH);
    } else { diff = 999; }
    state.lastFrame = new Uint8ClampedArray(frame);
    if (diff < 3) {
      state.stillFrames++;
      if (state.stillFrames === 1) updateStatus('📷 Næstum tilbúið...', '#fbbf24');
      else if (state.stillFrames === 2) updateStatus('📷 Tilbúin...', '#10b981');
      if (state.stillFrames >= 3) { capture(); return; }
    } else {
      if (state.stillFrames > 0) updateStatus('Haltu myndavél kyrri...', '#fbbf24');
      state.stillFrames = 0;
    }
    setTimeout(tick, 250);
  }

  async function capture(){
    state.phase = 'processing';
    updateStatus('🤖 Les...', '#3b82f6');
    var v = document.getElementById('_sc_video');
    var c = document.getElementById('_sc_canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    var base64 = c.toDataURL('image/jpeg', 0.8).split(',')[1];
    var step = state.ctx.steps[state.stepIdx];
    try {
      var res = await fetch('/api/ocr-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, type: step.key })
      });
      if (!res.ok) {
        // OCR endpoint not deployed (404) or upstream error → fall back to manual entry
        updateStatus('⚠ OCR ekki tiltæk — sláðu inn handvirkt', '#dc2626');
        state.phase = 'scanning'; state.stillFrames = 0;
        setTimeout(function(){ manualEntry(); }, 1500);
        return;
      }
      var data = await res.json();
      if (data.error === 'API_KEY_MISSING') {
        updateStatus('⚠ Vantar API lykil', '#dc2626');
        state.phase = 'scanning'; state.stillFrames = 0;
        setTimeout(function(){ manualEntry(); }, 1500);
        return;
      }
      if (data.error) {
        updateStatus('✗ Villa: ' + (data.message||data.error), '#dc2626');
        state.phase = 'scanning'; state.stillFrames = 0;
        setTimeout(tick, 1500);
        return;
      }
      if (!data.value) {
        updateStatus('Ekkert læsilegt — reyndu aftur', '#dc2626');
        state.phase = 'scanning'; state.stillFrames = 0;
        setTimeout(tick, 1500);
        return;
      }
      state.values[step.key] = data.value;
      updateCollected();
      updateStatus('✓ ' + data.value, '#10b981');
      setTimeout(function(){
        state.stepIdx++; state.stillFrames = 0;
        if (state.stepIdx >= state.ctx.steps.length) {
          showReview();
        } else {
          state.phase = 'scanning';
          updateStepUI();
          updateStatus('Haltu myndavél kyrri...', '#fbbf24');
          tick();
        }
      }, 1200);
    } catch (e) {
      updateStatus('Netvilla: '+e.message, '#dc2626');
      state.phase = 'scanning'; state.stillFrames = 0;
      setTimeout(tick, 1500);
    }
  }

  function manualEntry(){
    var step = state.ctx.steps[state.stepIdx];
    var cur = state.values[step.key] || '';
    var val = prompt(step.icon + ' ' + step.label + '\n\n' + step.hint, cur);
    if (val === null) return;
    state.values[step.key] = val.trim();
    updateCollected();
    state.stepIdx++; state.stillFrames = 0;
    if (state.stepIdx >= state.ctx.steps.length) showReview();
    else { updateStepUI(); state.phase = 'scanning'; tick(); }
  }

  function showReview(){
    state.phase = 'review';
    if (state.stream) { state.stream.getTracks().forEach(function(t){t.stop();}); state.stream = null; }
    var modal = document.getElementById('_scan_modal');
    modal.style.background = '#fff';
    var extraFields = '';
    if (state.ctxKey === 'geymsla') {
      extraFields = `<label style="display:block;"><div style="font-size:12px;color:#666;margin-bottom:4px;">📦 Geymslurými</div><input id="_sc_rev_storage" value="${escHtml(state.values.storage||'')}" style="width:100%;padding:11px 12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:15px;box-sizing:border-box;"></label>`;
    }
    modal.innerHTML = `
      <div style="padding:20px;max-width:500px;margin:0 auto;width:100%;">
        <h2 style="margin:0 0 6px;color:#111;">${state.ctx.title}: staðfestu</h2>
        <p style="margin:0 0 18px;color:#666;font-size:13px;">Lagaðu ef eitthvað er rangt. Fer beint í ${state.ctx.table}.</p>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <label style="display:block;"><div style="font-size:12px;color:#666;margin-bottom:4px;">🏷️ Raðnúmer</div><input id="_sc_rev_serial" value="${escHtml(state.values.serial||'')}" style="width:100%;padding:11px 12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:15px;box-sizing:border-box;"></label>
          <label style="display:block;"><div style="font-size:12px;color:#666;margin-bottom:4px;">👤 Viðskiptavinur</div><input id="_sc_rev_customer" value="${escHtml(state.values.customer||'')}" style="width:100%;padding:11px 12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:15px;box-sizing:border-box;"></label>
          <label style="display:block;"><div style="font-size:12px;color:#666;margin-bottom:4px;">📞 Sími</div><input id="_sc_rev_phone" value="${escHtml(state.values.phone||'')}" inputmode="tel" style="width:100%;padding:11px 12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:15px;box-sizing:border-box;"></label>
          ${extraFields}
          <label style="display:block;"><div style="font-size:12px;color:#666;margin-bottom:4px;">Tegund</div><select id="_sc_rev_type" style="width:100%;padding:11px 12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:15px;box-sizing:border-box;background:#fff;"><option value="ABC Duft">ABC Duft</option><option value="CO2">CO2</option><option value="Vatn">Vatn</option><option value="Froðu">Froðu</option></select></label>
          <label style="display:block;"><div style="font-size:12px;color:#666;margin-bottom:4px;">Stærð</div><select id="_sc_rev_size" style="width:100%;padding:11px 12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:15px;box-sizing:border-box;background:#fff;"><option>6kg</option><option>9kg</option><option>5kg</option><option>12kg</option><option>3kg</option><option>9L</option></select></label>
        </div>
        <div style="display:flex;gap:10px;margin-top:22px;">
          <button id="_sc_rev_back" style="flex:1;background:#f3f4f6;color:#111;border:none;border-radius:10px;padding:14px;font-size:14px;font-weight:600;cursor:pointer;">← Byrja upp á nýtt</button>
          <button id="_sc_rev_save" style="flex:2;background:#059669;color:#fff;border:none;border-radius:10px;padding:14px;font-size:14px;font-weight:700;cursor:pointer;">✓ Vista og næsta</button>
        </div>
      </div>
    `;
    document.getElementById('_sc_rev_back').onclick = function(){ openScan(state.ctxKey); };
    document.getElementById('_sc_rev_save').onclick = saveAndNext;
  }

  async function saveAndNext(){
    state.phase = 'saving';
    var v = {
      serial: document.getElementById('_sc_rev_serial').value.trim(),
      customer: document.getElementById('_sc_rev_customer').value.trim(),
      phone: document.getElementById('_sc_rev_phone').value.trim().replace(/[^0-9]/g,''),
      type: document.getElementById('_sc_rev_type').value,
      size: document.getElementById('_sc_rev_size').value
    };
    var sto = document.getElementById('_sc_rev_storage');
    if (sto) v.storage = sto.value.trim().toUpperCase();
    var btn = document.getElementById('_sc_rev_save');
    btn.textContent = 'Vistar...'; btn.disabled = true;
    try {
      var record = state.ctx.buildRecord(v);
      var res = await DB.sb.from(state.ctx.table).insert(record).then(function(r){return r;});
      if (res && res.error) throw res.error;
      var ctxKey = state.ctxKey;
      var modal = document.getElementById('_scan_modal');
      modal.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:14px;background:#059669;color:#fff;"><div style="font-size:72px;">✓</div><div style="font-size:22px;font-weight:700;">'+v.serial+' vistað!</div><div style="font-size:14px;opacity:0.9;">Opna myndavél fyrir næsta...</div></div>';
      modal.style.background = '#059669';
      setTimeout(function(){ openScan(ctxKey); }, 1400);
    } catch (e) {
      btn.textContent = '✓ Vista og næsta'; btn.disabled = false;
      alert('Villa við vistun: ' + (e.message || e));
    }
  }

  function escHtml(s){ return String(s||'').replace(/[&<>"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  function injectGeymslaBtn(){
    if (document.getElementById('_sc_openbtn_g')) return;
    var gv = document.getElementById('view-geymsla');
    if (!gv || !gv.offsetParent) return;
    var headerRow = gv.querySelector('div[style*="justify-content:space-between"]');
    if (!headerRow) {
      var divs = gv.querySelectorAll('div');
      for (var i=0;i<divs.length;i++){
        if (divs[i].children.length === 0 && /Geymsla/.test(divs[i].textContent)) {
          headerRow = divs[i].parentElement.parentElement; break;
        }
      }
    }
    if (!headerRow) return;
    var btn = document.createElement('button');
    btn.id = '_sc_openbtn_g';
    btn.innerHTML = '📷 Skanna nýtt tæki';
    btn.style.cssText = 'background:#7c3aed;color:#fff;border:none;border-radius:9px;padding:10px 16px;font-size:14px;font-weight:700;cursor:pointer;margin-left:8px;box-shadow:0 2px 6px rgba(124,58,237,.3);';
    btn.onclick = function(){ openScan('geymsla'); };
    headerRow.appendChild(btn);
  }

  function injectLanstaekiBtn(){
    if (document.getElementById('_sc_openbtn_l')) return;
    var lv = document.getElementById('view-lanstaeki');
    if (!lv || !lv.offsetParent) return;
    var headerRow = lv.querySelector('div[style*="justify-content:space-between"]');
    if (!headerRow) {
      var divs = lv.querySelectorAll('div');
      for (var i=0;i<divs.length;i++){
        if (divs[i].children.length === 0 && /Lánstæki/.test(divs[i].textContent)) {
          headerRow = divs[i].parentElement.parentElement; break;
        }
      }
    }
    if (!headerRow) return;
    var btn = document.createElement('button');
    btn.id = '_sc_openbtn_l';
    btn.innerHTML = '📷 Skanna lánstæki';
    btn.style.cssText = 'background:#f59e0b;color:#fff;border:none;border-radius:9px;padding:10px 16px;font-size:14px;font-weight:700;cursor:pointer;margin-left:8px;box-shadow:0 2px 6px rgba(245,158,11,.3);';
    btn.onclick = function(){ openScan('lanstaeki'); };
    headerRow.appendChild(btn);
  }

  window.openScanMode = function(ctx){ openScan(ctx||'geymsla'); };
  setInterval(function(){ injectGeymslaBtn(); injectLanstaekiBtn(); }, 2000);
  console.log('[Scan] v2 loaded with contexts:', Object.keys(CONTEXTS));
})();
