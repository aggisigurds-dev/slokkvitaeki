/* QR Bulk Printer v2 - inline print (no popup), fixes popup-blocker issue */
(function(){'use strict';
function ensureQRLib(cb){
  if(window.QRCode){cb();return;}
  var s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
  s.onload=cb;
  s.onerror=function(){alert('Get ekki hlaðið QR lesara. Athugaðu nettengingu.');};
  document.head.appendChild(s);
}
function qrPNG(text,size){
  var d=document.createElement('div');
  new QRCode(d,{text:text,width:size,height:size,correctLevel:QRCode.CorrectLevel.M});
  var img=d.querySelector('img');var cv=d.querySelector('canvas');
  return cv?cv.toDataURL('image/png'):img?img.src:'';
}
async function nextSerialBlock(count,prefix){
  var pf=prefix||'NEW';
  var r=await DB.sb.from('uttaeki').select('serial').like('serial',pf+'-%');
  var maxN=0;
  if(r.data){r.data.forEach(function(u){var m=u.serial.match(new RegExp('^'+pf+'-(\\d+)$'));if(m){var n=parseInt(m[1],10);if(n>maxN)maxN=n;}});}
  var serials=[];
  for(var i=0;i<count;i++){serials.push(pf+String(maxN+1+i).padStart(4,'0'));}
  return serials;
}
function showDialog(){
  if(document.getElementById('_qrbulk_modal')) return;
  var ov=document.createElement('div');
  ov.id='_qrbulk_modal';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
  var box=document.createElement('div');
  box.style.cssText='background:#fff;border-radius:14px;width:480px;max-width:95vw;max-height:90vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 12px 40px rgba(0,0,0,.3);';
  box.innerHTML='<div style="padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0;font-size:17px">🏷️ Prenta margfaldar QR merkimiða</h2><button id="_qb_x" style="background:none;border:none;font-size:20px;cursor:pointer;color:#6b7280">✕</button></div>'+
    '<div style="padding:20px;overflow-y:auto">'+
    '<p style="margin:0 0 14px 0;font-size:13px;color:#6b7280;line-height:1.5">Prentaðu auða QR merkimiða með óskráðum raðnúmerum. Límdu þá á tæki á staðnum, og skráðu seinna með <b>Skanna</b> aðgerðinni í Geymslu eða Lánstæki.</p>'+
    '<div style="margin-bottom:14px"><label style="display:block;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:4px">Fjöldi miða</label><input id="_qb_count" type="number" min="1" max="200" value="24" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:14px;box-sizing:border-box"></div>'+
    '<div style="margin-bottom:14px"><label style="display:block;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:4px">Forskeyti raðnúmera</label><select id="_qb_prefix" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:14px;box-sizing:border-box"><option value="NEW">NEW (almennt)</option><option value="GY">GY (geymsla)</option><option value="LN">LN (lánstæki)</option><option value="SL">SL (slönguskápur)</option><option value="RS">RS (reykskynjari)</option><option value="FY">FY (fyrirtæki)</option><option value="VI">VI (viðskiptavinir)</option></select></div>'+
    '<div style="margin-bottom:14px"><label style="display:block;font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:700;margin-bottom:4px">Stærð á blaði</label><select id="_qb_layout" style="width:100%;padding:10px 12px;border:1.5px solid #e5e7eb;border-radius:9px;font-size:14px;box-sizing:border-box"><option value="4x6">A4 - 4×6 grind (24 miðar)</option><option value="3x5">A4 - 3×5 grind (15 miðar, stærri)</option><option value="5x8">A4 - 5×8 grind (40 miðar, smæstir)</option><option value="sticker">Brother PT 18×18mm (einn í einu)</option><option value="brother4" selected>Brother PT 24mm — 4 í röð (klippt sjálf)</option><option value="sticker24">Brother PT 24×24mm (einn í einu)</option></select></div>'+
    '<div id="_qb_status" style="font-size:12px;color:#6b7280;min-height:18px"></div>'+
    '</div>'+
    '<div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;gap:10px;justify-content:flex-end"><button id="_qb_cancel" style="background:#f3f4f6;border:none;padding:10px 18px;border-radius:9px;cursor:pointer;font-size:14px;color:#374151">Hætta við</button><button id="_qb_print" style="background:#dc2626;color:#fff;border:none;padding:10px 18px;border-radius:9px;cursor:pointer;font-weight:600;font-size:14px">🖨 Prenta</button></div>';
  ov.appendChild(box);document.body.appendChild(ov);
  function close(){ov.remove();}
  document.getElementById('_qb_x').onclick=close;
  document.getElementById('_qb_cancel').onclick=close;
  ov.onclick=function(e){if(e.target===ov)close();};
  document.getElementById('_qb_print').onclick=async function(){
    var st=document.getElementById('_qb_status');
    var n=Math.max(1,Math.min(200,parseInt(document.getElementById('_qb_count').value,10)||24));
    var prefix=document.getElementById('_qb_prefix').value;
    var layout=document.getElementById('_qb_layout').value;
    st.textContent='Sæki næstu raðnúmer...';
    var serials=await nextSerialBlock(n,prefix);
    st.textContent='Bý til '+n+' QR myndir...';
    await new Promise(function(r){ensureQRLib(r);});
    var qrs=serials.map(function(s){return {serial:s,png:qrPNG(s,200)};});
    st.textContent='Opna forskoðun...';
    close();
    renderInlinePrintView(qrs,layout,prefix);
  };
}
function renderInlinePrintView(qrs,layout,prefix){
  var cols,size;
  if(layout==='3x5'){cols=3;size=55;}
  else if(layout==='5x8'){cols=5;size=32;}
  else if(layout==='sticker'){cols=1;size=14;}
  else if(layout==='sticker24'){cols=1;size=20;}
  else if(layout==='brother4'){cols=4;size=20;}
  else {cols=4;size=42;}
  // Page height is calculated AFTER rendering by measuring real grid height (see below).
  // Remove any previous print overlay
  var old=document.getElementById('_qb_printview');
  if(old)old.remove();
  var oldStyle=document.getElementById('_qb_print_style');
  if(oldStyle)oldStyle.remove();
  // Inject print CSS that hides everything except our overlay (NO @page yet — added after measuring)
  var style=document.createElement('style');
  style.id='_qb_print_style';
  var nonPageCss='@media print{body > *:not(#_qb_printview){display:none !important}#_qb_printview{position:static !important;inset:auto !important;background:#fff !important;padding:0 !important;overflow:visible !important}#_qb_printview ._qb_controls{display:none !important}#_qb_printview ._qb_sheet{padding:'+(layout==="brother4"||layout==="sticker24"||layout==="sticker"?"0":"6mm")+' !important;box-shadow:none !important;margin:0 !important;max-width:none !important;width:100% !important;overflow:visible !important;}#_qb_printview ._qb_hdr{display:none !important}}';
  // Add @page rule for fixed-size layouts (sticker modes only — brother4 set later by measurement)
  if(layout==='sticker24') nonPageCss=nonPageCss.replace('@media print{','@media print{@page{size:24mm 28mm;margin:1mm}');
  else if(layout==='sticker') nonPageCss=nonPageCss.replace('@media print{','@media print{@page{size:18mm 22mm;margin:1mm}');
  else if(layout==='brother4') nonPageCss=nonPageCss.replace('@media print{','@media print{@page{size:100mm auto;margin:1mm}');
  else nonPageCss=nonPageCss.replace('@media print{','@media print{@page{size:A4;margin:8mm}');
  style.textContent=nonPageCss;
  document.head.appendChild(style);
  // Build overlay
  var ov=document.createElement('div');
  ov.id='_qb_printview';
  ov.style.cssText='position:fixed;inset:0;background:#e5e7eb;z-index:10002;overflow-y:auto;';
  // Controls bar (hidden during print)
  var ctrls=document.createElement('div');
  ctrls.className='_qb_controls';
  ctrls.style.cssText='position:sticky;top:0;background:#111;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,.3);z-index:2';
  ctrls.innerHTML='<div style="font-weight:600">🏷️ Forskoðun: '+qrs.length+' '+prefix+' merkimiðar ('+layout+')</div><div><button id="_qb_print_now" style="background:#10b981;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600;margin-right:8px">🖨 Prenta núna</button><button id="_qb_close_pv" style="background:#6b7280;color:#fff;border:none;padding:10px 18px;border-radius:8px;cursor:pointer">Loka</button></div>';
  ov.appendChild(ctrls);
  // Sheet
  var sheet=document.createElement('div');
  sheet.className='_qb_sheet';
  sheet.style.cssText='background:#fff;padding:12mm;margin:20px auto;max-width:210mm;box-shadow:0 4px 16px rgba(0,0,0,.2);box-sizing:border-box';
  var hdrHtml='<div class="_qb_hdr" style="font-size:10pt;color:#666;margin-bottom:6mm;text-align:center">Slökkvitæki ehf — '+qrs.length+' merkimiðar — '+(new Date()).toLocaleDateString('is-IS')+'</div>';
  var gridHtml='';
  var pageBreak = (layout==='sticker' || layout==='sticker24') ? 'page-break-after:always;break-after:page;' : '';
  var cellPadding = (layout==='brother4') ? '0.5mm 0' : '4mm 2mm';
  var cellBorder = (layout==='brother4') ? 'border:none;' : 'border:1px dashed #aaa;border-radius:4px;';
  if(layout==='brother4'){
    for(var ri=0;ri<qrs.length;ri+=cols){
      var chunk=qrs.slice(ri,ri+cols);
      var brk=(ri+cols<qrs.length)?'page-break-after:always;break-after:page;':'';
      gridHtml+='<div style="display:grid;grid-template-columns:repeat('+cols+',1fr);gap:1mm;'+brk+'">';
      chunk.forEach(function(q){
        gridHtml+='<div style="display:flex;align-items:center;justify-content:center;gap:0.5mm;padding:0">';
        gridHtml+='<div style="writing-mode:vertical-rl;transform:rotate(180deg);font-family:monospace;font-size:6pt;font-weight:700;white-space:nowrap;letter-spacing:.3px">'+q.serial+'</div>';
        gridHtml+='<img src="'+q.png+'" style="display:block;width:'+size+'mm;height:'+size+'mm">';
        gridHtml+='</div>';
      });
      gridHtml+='</div>';
    }
  } else {
    gridHtml='<div style="display:grid;grid-template-columns:repeat('+cols+',1fr);gap:4mm">';
    qrs.forEach(function(q){gridHtml+='<div style="'+cellBorder+'padding:'+cellPadding+';text-align:center;break-inside:avoid;page-break-inside:avoid;'+pageBreak+'"><img src="'+q.png+'" style="display:block;width:'+size+'mm;height:'+size+'mm;margin:0 auto"><div style="font-family:monospace;font-size:8pt;font-weight:700;margin-top:0.5mm;letter-spacing:.5px">'+q.serial+'</div></div>';});
    gridHtml+='</div>';
  }
  sheet.innerHTML=hdrHtml+gridHtml;
  ov.appendChild(sheet);
  document.body.appendChild(ov);
  document.getElementById('_qb_print_now').onclick=function(){window.print();};
  document.getElementById('_qb_close_pv').onclick=function(){ov.remove();style.remove();};
}
function injectButton(){
  if(document.getElementById('_qb_btn')) return;
  var sb=document.querySelector('aside.sidebar, .topbar nav, [class*="view-nav"]');
  var btn=document.createElement('button');
  btn.id='_qb_btn';
  btn.className='vnav-btn';
  btn.innerHTML='<span style="display:inline-flex;align-items:center;gap:8px">🏷️ Prenta QR miða</span>';
  btn.style.cssText='display:flex;align-items:center;width:100%;text-align:left;background:none;border:none;padding:8px 12px;font-size:13px;color:var(--sidebar-text);cursor:pointer;border-radius:6px;';
  btn.onmouseover=function(){this.style.background='rgba(0,0,0,.05)';};
  btn.onmouseout=function(){this.style.background='';};
  btn.onclick=showDialog;
  if(sb){var div=document.createElement('div');div.style.cssText='border-top:1px solid rgba(0,0,0,.08);margin:8px 0;padding-top:8px';div.appendChild(btn);sb.appendChild(div);}
}
setInterval(injectButton,1500);
setTimeout(injectButton,800);
window.openQRBulkPrint=showDialog;
console.log('[QRBulkPrint v2] loaded - inline print, no popup');
})();