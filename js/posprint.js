/* POS Receipt printing - dedicated sales receipt format */
(function(){'use strict';
function fmtKr(n){return Math.round(Number(n)||0).toLocaleString('is-IS')+' kr';}
function fmtDate(d){var dt=d?new Date(d):new Date();var p=function(n){return String(n).padStart(2,'0');};return p(dt.getDate())+'.'+p(dt.getMonth()+1)+'.'+dt.getFullYear()+' '+p(dt.getHours())+':'+p(dt.getMinutes());}
function pad(text,width){text=String(text||'');if(text.length>=width)return text.substring(0,width);return text+' '.repeat(width-text.length);}
function padL(text,width){text=String(text||'');if(text.length>=width)return text.substring(0,width);return ' '.repeat(width-text.length)+text;}
function buildReceipt(sale,lines,totals,method){
  var num = sale && sale.id ? ('S-'+sale.id) : 'S-'+Date.now();
  var dt = fmtDate(sale && sale.created_at);
  var W = 42;
  var out = [];
  out.push(''.padEnd(W,'='));
  out.push('    SLÖKKVITÆKI EHF · BRUNAKERFI');
  out.push(''.padEnd(W,'='));
  out.push('');
  out.push('Sala: ' + num);
  out.push('Dags: ' + dt);
  out.push('');
  out.push(''.padEnd(W,'-'));
  out.push(pad('Vara',22)+padL('Fj',4)+padL('Verð',16));
  out.push(''.padEnd(W,'-'));
  lines.forEach(function(l){
    var lineTotal = l.verd * l.qty * 1.24;
    out.push(pad(l.nafn,22)+padL(l.qty,4)+padL(fmtKr(lineTotal),16));
  });
  out.push(''.padEnd(W,'-'));
  out.push(pad('Án vsk',26)+padL(fmtKr(totals.sub),16));
  if(totals.disc>0){out.push(pad('Afsláttur',26)+padL('-'+fmtKr(totals.disc),16));}
  out.push(pad('Vsk 24%',26)+padL(fmtKr(totals.vat),16));
  out.push(''.padEnd(W,'='));
  out.push(pad('SAMTALS',26)+padL(fmtKr(totals.total),16));
  out.push(''.padEnd(W,'='));
  out.push('');
  out.push('Greitt með: ' + (method==='kort'?'💳 KORTI':'💵 REIÐUFÉ'));
  out.push('');
  out.push(''.padEnd(W,'-'));
  out.push('       Takk fyrir viðskiptin!');
  out.push(''.padEnd(W,'-'));
  return out.join('\n');
}
window.printSaleReceipt=function(sale,lines,totals,method){
  var text = buildReceipt(sale,lines,totals,method);
  // Create inline print overlay (popup-safe)
  var ov = document.createElement('div');
  ov.id='_psr_ov';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px';
  ov.innerHTML = '<div class="_psr_sheet" style="background:#fff;padding:24px;max-width:420px;width:100%;max-height:90vh;overflow-y:auto;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:14px">'+
    '<div style="display:flex;justify-content:space-between;align-items:center" class="_psr_hdr"><h2 style="margin:0;font-size:17px">Kvittun</h2><button id="_psr_x" style="background:none;border:none;font-size:22px;cursor:pointer;color:#6b7280">✕</button></div>'+
    '<pre style="margin:0;font-family:\'Courier New\',monospace;font-size:12.5px;line-height:1.35;white-space:pre;overflow-x:auto;background:#f9fafb;padding:14px;border:1px solid #e5e7eb;border-radius:8px" class="_psr_body">'+text.replace(/</g,'&lt;')+'</pre>'+
    '<div class="_psr_actions" style="display:flex;gap:8px;justify-content:flex-end"><button id="_psr_close" style="background:#f3f4f6;color:#374151;border:none;padding:10px 16px;border-radius:9px;cursor:pointer;font-size:14px">Loka</button><button id="_psr_print" style="background:#dc2626;color:#fff;border:none;padding:10px 16px;border-radius:9px;cursor:pointer;font-weight:600;font-size:14px">🖨️ Prenta</button></div>'+
  '</div>';
  document.body.appendChild(ov);
  // Inject print styles
  if(!document.getElementById('_psr_style')){
    var st=document.createElement('style');st.id='_psr_style';
    st.textContent='@media print {body > *:not(#_psr_ov){display:none !important;}#_psr_ov{position:static !important;background:#fff !important;padding:0 !important;display:block !important;}#_psr_ov ._psr_sheet{box-shadow:none !important;max-height:none !important;padding:0 !important;}#_psr_ov ._psr_hdr,#_psr_ov ._psr_actions{display:none !important;}#_psr_ov ._psr_body{background:#fff !important;border:none !important;padding:8px !important;font-size:11.5px !important;}}';
    document.head.appendChild(st);
  }
  function close(){ov.remove();}
  document.getElementById('_psr_x').onclick=close;
  document.getElementById('_psr_close').onclick=close;
  document.getElementById('_psr_print').onclick=function(){window.print();};
  ov.onclick=function(e){if(e.target===ov)close();};
};
console.log('[PosPrint] ready, window.printSaleReceipt available');
})();