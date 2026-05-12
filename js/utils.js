'use strict';
var U={sl:function(s){var m={received:'Móttekið',inprogress:'Í vinnslu',ready:'Tilbúið',collected:'Sótt',done:'Lokið',overdue:'Útrunnið',ok:'Í lagi',due:'Gjaldfallið',pass:'Í lagi',fail:'Ekki í lagi',scheduled:'Áætlað',i_geymslu:'Í geymslu'};return m[s]||s;},sc:function(s){var m={received:'st-rec',inprogress:'st-inp',ready:'st-rdy',collected:'st-col',done:'st-dn',overdue:'st-ov',ok:'st-ok',due:'st-due',pass:'st-ok',fail:'st-ov',i_geymslu:'st-col'};return m[s]||'';},dc:function(s){var m={received:'d-blue',inprogress:'d-amber',ready:'d-green',collected:'d-gray',overdue:'d-red'};return m[s]||'d-gray';},today:function(){return new Date().toISOString().slice(0,10);},tomorrow:function(){var d=new Date();d.setDate(d.getDate()+1);return d.toISOString().slice(0,10);},fd:function(s){if(!s)return'';var d=new Date(s+'T00:00:00');var m=['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'];return d.getDate()+'. '+m[d.getMonth()]+' '+d.getFullYear();},fd2:function(s){if(!s)return'';var d=new Date(s+'T00:00:00');var m=['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'];return d.getDate()+'. '+m[d.getMonth()];},e:function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');},badge:function(status){return '<span class="st '+U.sc(status)+'">'+U.sl(status)+'</span>';},nextJobNum:function(){return '#'+new Date().getFullYear()+'-'+String(Math.floor(Math.random()*900)+100);},
/* 2026-05-10 (#3): Strip -Vn suffix for display so verkbeiðnir núm
 * birtast samræmt sem R-NNNNNN óháð því hvort þau koma frá POS (R-NNNNNN-V1)
 * eða Sækja inn (R-NNNNNN). Multi-verkbeiðnir per sölu eru sjaldgæf — ef til
 * staðar, sýna þá -V1/-V2 í detail view (vbu.js renderar þau full). */
displayNum:function(n){return String(n==null?'':n).replace(/-V\d+$/,'');}};
/* 2026-05-10 (L1): Toast was small, bottom-left near sidebar — easy to miss
 * after a confirmation (e.g. "Verk tilbúið" after Merkja sem tilbúið).
 * Now: bigger, centered bottom, animated, longer duration. Inline styles
 * override the existing CSS so nothing else needs to change. */
var Toast={t:null,show:function(msg){
  var el=document.getElementById('toast');if(!el)return;
  el.textContent=msg;
  el.style.cssText=[
    'position:fixed','bottom:32px','left:50%','transform:translateX(-50%) translateY(0)',
    'background:#0f172a','color:#fff','padding:14px 24px','border-radius:12px',
    'font-size:15px','font-weight:600','letter-spacing:0.01em',
    'box-shadow:0 12px 40px rgba(0,0,0,0.35),0 0 0 1px rgba(255,255,255,0.05) inset',
    'z-index:100100','opacity:1','transition:opacity .25s, transform .25s',
    'max-width:90vw','text-align:center','pointer-events:none','display:block'
  ].join(';');
  // Slide-up animation on enter
  el.animate(
    [{transform:'translateX(-50%) translateY(20px)',opacity:0},{transform:'translateX(-50%) translateY(0)',opacity:1}],
    {duration:220,easing:'ease-out'}
  );
  clearTimeout(this.t);
  this.t=setTimeout(function(){
    el.style.opacity='0';
    el.style.transform='translateX(-50%) translateY(8px)';
    setTimeout(function(){el.style.display='none';},250);
  },4000);
}};
var Modal={stack:[],open:function(id){document.getElementById('overlay').classList.add('open');var m=document.getElementById(id);m.classList.add('open');this.stack.push(id);},close:function(id){document.getElementById(id).classList.remove('open');this.stack=this.stack.filter(function(x){return x!==id;});if(!this.stack.length)document.getElementById('overlay').classList.remove('open');},closeAll:function(){document.querySelectorAll('.modal.open').forEach(function(m){m.classList.remove('open');});document.getElementById('overlay').classList.remove('open');this.stack=[];}};

/* 2026-05-10: Confirm.show(msg, opts?) → Promise<boolean>
 * Async replacement for native confirm(). Native confirm freezes the entire
 * browser tab (including any automation tooling) — Confirm.show is a small
 * themed modal with OK/Hætta við buttons + Enter/Esc keybindings. Callers
 * must await it. Use only in async functions; for sync callbacks, fall back
 * to native confirm or restructure to async. */
var Confirm = {
  show: function(msg, opts) {
    opts = opts || {};
    return new Promise(function(resolve) {
      var existing = document.getElementById('_cfm-dialog');
      if (existing) existing.remove();
      var dlg = document.createElement('div');
      dlg.id = '_cfm-dialog';
      dlg.style.cssText = 'position:fixed;inset:0;z-index:100200;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:16px';
      var okText = opts.okText || 'Já';
      var cancelText = opts.cancelText || 'Hætta við';
      var color = opts.danger ? '#dc2626' : '#0d6efd';
      var msgHtml = String(msg || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
      dlg.innerHTML =
        '<div style="background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.3);width:min(420px,calc(100vw - 32px));overflow:hidden">' +
          '<div style="padding:18px 22px;font-size:14px;line-height:1.5;color:#0f172a">' + msgHtml + '</div>' +
          '<div style="padding:11px 18px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end;background:#f8fafc">' +
            '<button id="_cfm-no" type="button" style="padding:8px 16px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">' + cancelText + '</button>' +
            '<button id="_cfm-ok" type="button" style="padding:8px 18px;background:' + color + ';color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">' + okText + '</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(dlg);
      function done(answer) {
        dlg.remove();
        document.removeEventListener('keydown', onKey);
        resolve(!!answer);
      }
      dlg.querySelector('#_cfm-no').addEventListener('click', function(){done(false);});
      dlg.querySelector('#_cfm-ok').addEventListener('click', function(){done(true);});
      dlg.addEventListener('click', function(e){if(e.target===dlg)done(false);});
      function onKey(e){if(e.key==='Enter'){e.preventDefault();done(true);}else if(e.key==='Escape'){e.preventDefault();done(false);}}
      document.addEventListener('keydown', onKey);
      setTimeout(function(){var ok=dlg.querySelector('#_cfm-ok');if(ok)ok.focus();},30);
    });
  }
};
var QR={svg:function(text,size){size=size||60;var h=0;for(var i=0;i<text.length;i++)h=((h<<5)-h+text.charCodeAt(i))|0;var c=21,cs=size/c,s='<svg viewBox="0 0 '+size+' '+size+'" xmlns="http://www.w3.org/2000/svg">';function fin(ox,oy){s+='<rect x="'+(ox*cs)+'" y="'+(oy*cs)+'" width="'+(7*cs)+'" height="'+(7*cs)+'" fill="black"/><rect x="'+((ox+1)*cs)+'" y="'+((oy+1)*cs)+'" width="'+(5*cs)+'" height="'+(5*cs)+'" fill="white"/><rect x="'+((ox+2)*cs)+'" y="'+((oy+2)*cs)+'" width="'+(3*cs)+'" height="'+(3*cs)+'" fill="black"/>';}fin(0,0);fin(14,0);fin(0,14);var r=Math.abs(h);for(var row=0;row<c;row++)for(var col=0;col<c;col++){var inf=(row<8&&col<8)||(row<8&&col>12)||(row>12&&col<8);if(!inf){r=(r*1664525+1013904223)&0xffffffff;if(r&1)s+='<rect x="'+(col*cs).toFixed(1)+'" y="'+(row*cs).toFixed(1)+'" width="'+cs.toFixed(1)+'" height="'+cs.toFixed(1)+'" fill="black"/>';}}return s+'</svg>';}};
var Print={job:null,showJob:function(job){this.job=job;var html='<div style="font-size:12px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px">Miðar ('+job.units.length+' stk.)</div>';job.units.forEach(function(u){html+='<div class="stk-prev"><div class="stk-logo"><div class="stk-logo-dot"><svg viewBox="0 0 24 24"><path d="M12 2C9.5 5 8 7.5 8 10a4 4 0 008 0c0-1.5-.5-3-2-4.5-.5 2-1.5 3-2 3.5-.5-.5-1-2-.5-4.5C11 5 10 6.5 10 6.5S12 5 12 2zm-2 14h4v6h-4v-6z"/></svg></div><div class="stk-logo-txt">Slökkvitæki ehf<br>Brunakerfi</div></div>';html+='<div class="stk-body"><div class="stk-fields">';html+='<div class="stk-f"><div class="stk-f-lbl">Verk</div><div class="stk-f-val">'+U.e(job.num)+'</div></div>';html+='<div class="stk-f"><div class="stk-f-lbl">Viðskiptavinur</div><div class="stk-f-val">'+U.e(job.customer)+'</div></div>';html+='<div class="stk-f"><div class="stk-f-lbl">Þjónusta</div><div class="stk-f-val">'+U.e(u.service)+'</div></div>';html+='<div class="stk-f"><div class="stk-f-lbl">Afhending</div><div class="stk-f-val">'+U.fd(job.pickup)+'</div></div>';html+='</div><div class="stk-qr">'+QR.svg(u.serial,52)+'</div></div></div>';});html+='<hr style="border:none;border-top:1px solid #ddd;margin:14px 0"/>';html+='<div class="rcpt-co">Slökkvitæki ehf · Brunakerfi</div>';html+='<div class="rcpt-ln"><span>Verk númer</span><span style="font-weight:700">'+U.e(job.num)+'</span></div>';html+='<div class="rcpt-ln"><span>Viðskiptavinur</span><span>'+U.e(job.customer)+'</span></div>';html+='<div class="rcpt-ln"><span>Sími</span><span>'+U.e(job.phone)+'</span></div>';job.units.forEach(function(u){html+='<div class="rcpt-ln"><span>'+U.e(u.serial)+'</span><span>'+U.e(u.service)+'</span></div>';});html+='<div class="rcpt-ln rcpt-tot"><span>Afhendingardagur</span><span>'+U.fd(job.pickup)+'</span></div>';html+='<div class="rcpt-note">Við hringum þegar tilbúið · +354 XXX XXXX</div>';document.getElementById('print-body').innerHTML=html;Modal.open('modal-print');},
showQR:function(unit){var html='<div class="stk-prev"><div class="stk-logo"><div class="stk-logo-dot"><svg viewBox="0 0 24 24"><path d="M12 2C9.5 5 8 7.5 8 10a4 4 0 008 0c0-1.5-.5-3-2-4.5-.5 2-1.5 3-2 3.5-.5-.5-1-2-.5-4.5C11 5 10 6.5 10 6.5S12 5 12 2zm-2 14h4v6h-4v-6z"/></svg></div><div class="stk-logo-txt">Slökkvitæki ehf<br>Brunakerfi</div></div>';html+='<div class="stk-body"><div class="stk-fields">';html+='<div class="stk-f"><div class="stk-f-lbl">Raðnúmer</div><div class="stk-f-val">'+U.e(unit.serial)+'</div></div>';html+='<div class="stk-f"><div class="stk-f-lbl">Tegund</div><div class="stk-f-val">'+U.e(unit.type)+' · '+U.e(unit.size)+'</div></div>';html+='<div class="stk-f"><div class="stk-f-lbl">Staðsetning</div><div class="stk-f-val">'+U.e(unit.client)+'</div></div>';html+='<div class="stk-f"><div class="stk-f-lbl">Næsta skoðun</div><div class="stk-f-val">'+U.fd(unit.next_insp)+'</div></div>';html+='</div><div class="stk-qr">'+QR.svg(unit.serial,52)+'</div></div></div>';document.getElementById('print-body').innerHTML=html;Modal.open('modal-print');},
doPrint:function(){var pb=document.getElementById('print-body'),pa=document.getElementById('printarea');if(!pb||!pa){window.print();return;}var css='<style>body{margin:0;padding:8mm;font-family:Arial,sans-serif;background:white;}.stk-prev{border:1.5px dashed #bbb;border-radius:6px;padding:8px 10px;margin-bottom:12px;}.stk-logo{display:flex;align-items:center;gap:5px;margin-bottom:6px;}.stk-logo-dot{width:14px;height:14px;background:#C93C1D;border-radius:50%;display:flex;align-items:center;justify-content:center;}.stk-logo-dot svg{width:8px;height:8px;fill:white;}.stk-logo-txt{font-size:7pt;font-weight:700;line-height:1.2;color:#000;}.stk-body{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;}.stk-fields{flex:1;}.stk-f{margin-bottom:3px;}.stk-f-lbl{font-size:6pt;font-weight:700;text-transform:uppercase;color:#666;display:block;}.stk-f-val{font-size:10pt;font-weight:600;color:#000;}.stk-qr{width:50px;height:50px;flex-shrink:0;}.stk-qr svg{width:100%;height:100%;}hr{border:none;border-top:1px solid #ccc;margin:8px 0;}.rcpt-co{font-size:10pt;font-weight:700;margin-bottom:6px;color:#000;}.rcpt-ln{display:flex;justify-content:space-between;font-size:8pt;padding:2px 0;border-bottom:1px dotted #ccc;color:#000;}.rcpt-tot{font-weight:700;border-top:1px solid #000;border-bottom:none;margin-top:3px;padding-top:3px;}.rcpt-note{font-size:7pt;color:#666;font-style:italic;margin-top:5px;text-align:center;}</style>';pa.innerHTML=css+pb.innerHTML;pa.style.cssText='display:block;position:fixed;inset:0;background:white;z-index:9999;padding:10mm;overflow:auto;';setTimeout(function(){window.print();setTimeout(function(){pa.style.cssText='display:none;';pa.innerHTML='';},500);},200);}};