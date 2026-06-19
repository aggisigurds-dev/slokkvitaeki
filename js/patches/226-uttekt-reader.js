/* 226-uttekt-reader.js — "Sjálfvirk útfylling úr úttektarskýrslu" box on the
 * company page. Reads the newest report's parsed lines (uttekt_skyrsla_lines,
 * filled cloud-side from the úttektarskýrslu PDFs) and lets the user create the
 * tæki from it — each gets an auto TMP- number, last service = Yfirferð, dated
 * to the report. Manual override: pick another report year. To attach a missing
 * report, point at the Skjöl section below.
 *
 * Sits in the left column under the tæki list. Additive; reuses the same uttaeki
 * insert shape as patch 73 (bulk add).
 */
(function () {
  'use strict';
  if (window.__uttektReaderInstalled) return;
  window.__uttektReaderInstalled = true;

  function SB(){ return (window.DB && DB.sb) || null; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function digits(s){ return String(s||'').replace(/\D/g,''); }
  function dash(kt){ var d=digits(kt); return d.length>=10?d.slice(0,6)+'-'+d.slice(6,10):d; }

  var CATMAP = {
    lettvatn:['Léttvatn','6 ltr'], duft2:['Duft','2 kg'], duft6:['Duft','6 kg'],
    co2_2:['CO2','2 kg'], co2_5:['CO2','5 kg'], slanga:['Brunaslanga',''],
    teppi:['Eldvarnateppi',''], reyk:['Reykskynjari','']
  };

  function getCoId(){
    var main=document.getElementById('companies-main'); if(!main) return null;
    var el=main.querySelector('[data-co-id]'); if(!el) return null;
    var v=el.getAttribute('data-co-id'); return (v&&/^\d+$/.test(v))?+v:null;
  }
  function getCo(coId){ var l=(window.Companies&&Companies.list)||[]; return l.find(function(c){return +c.id===+coId;})||null; }

  var _baseCache={};
  async function baseIdForKt(kt){
    var d=dash(kt); if(!d) return null;
    if(_baseCache[d]!==undefined) return _baseCache[d];
    var sb=SB(); if(!sb){ return null; }
    try{ var r=await sb.from('customers_base').select('id').eq('kennitala',d).limit(1);
      var id=(r.data&&r.data[0])?r.data[0].id:null; _baseCache[d]=id; return id; }catch(e){ return null; }
  }
  async function fetchLines(baseId){
    var sb=SB(); if(!sb||!baseId) return [];
    try{ var r=await sb.from('uttekt_skyrsla_lines').select('year,report_month,category,category_label,cnt,service,drive_file_id,fyrirtaeki_id').eq('customer_base_id',baseId);
      return r.data||[]; }catch(e){ return []; }
  }

  function tmpSerial(){ return 'TMP-'+Math.random().toString(36).slice(2,8).toUpperCase(); }

  async function createFromLines(coId, nafn, lines){
    var sb=SB(); if(!sb) { alert('Engin tenging'); return; }
    var today=new Date(); var y=lines[0]&&lines[0].year ? lines[0].year : today.getFullYear();
    var lastInsp=y+'-06-01';
    var nextInsp=(y+1)+'-06-01';
    var rows=[], used={};
    lines.forEach(function(l){
      var m=CATMAP[l.category]; var n=parseInt(l.cnt,10)||0; if(!m||n<=0) return;
      for(var i=0;i<n;i++){ var s; do{ s=tmpSerial(); }while(used[s]); used[s]=1;
        rows.push({ serial:s, type:m[0], size:m[1], client:nafn, location:'',
          last_insp:lastInsp, next_insp:nextInsp, status:'active', pressure:14 }); }
    });
    if(!rows.length){ alert('Engin tæki í skýrslunni.'); return; }
    if(!confirm('Bæta ' + rows.length + ' tækjum við „' + nafn + '" úr skýrslu ' + y + '?\nHvert fær tímabundið TMP-númer (uppfært við fyrstu skoðun).')) return;
    try{
      var r=await sb.from('uttaeki').insert(rows).select();
      if(r.error) throw r.error;
      if(window.DB&&DB.cache&&DB.cache.units&&r.data){ r.data.forEach(function(x){DB.cache.units.push(x);}); }
      try{ if(window.UttektTaeki&&UttektTaeki.rerender) UttektTaeki.rerender(coId); }catch(_){}
      try{ if(window.recomputeCompanyTotalCost) recomputeCompanyTotalCost(); }catch(_){}
      try{ if(window.Companies&&Companies.openDetail) Companies.openDetail(coId); }catch(_){}
      alert('✓ ' + rows.length + ' tæki bætt við úr skýrslu ' + y + '.');
    }catch(e){ alert('Villa: ' + (e.message||e)); }
  }

  function summary(lines){
    return lines.filter(function(l){return (parseInt(l.cnt,10)||0)>0;})
      .map(function(l){ var m=CATMAP[l.category]; return (l.cnt)+'× '+((m?m[0]+' '+m[1]:l.category_label)||l.category); })
      .join(' · ');
  }

  async function render(box, coId){
    var bodyId='_rdr-body';
    box.innerHTML='<div class="rdr-h">📄 Sjálfvirk útfylling úr úttektarskýrslu</div><div id="'+bodyId+'" class="rdr-body">Hleð…</div>';
    var body=box.querySelector('#'+bodyId);
    var co=getCo(coId); if(!co){ body.innerHTML='<span class="rdr-muted">—</span>'; return; }
    var baseId=await baseIdForKt(co.kennitala);
    var lines = baseId ? await fetchLines(baseId) : [];
    if(!lines.length){
      body.innerHTML='<div class="rdr-muted">Engin lesin úttektarskýrsla fundin fyrir þetta fyrirtæki ennþá.</div>'+
        '<div class="rdr-muted" style="margin-top:4px">Tengdu réttu skýrsluna í <b>Skjöl &amp; skýrslur</b> hér að neðan — hún les sjálfkrafa inn tækin.</div>';
      return;
    }
    // group by year, default newest
    var byYear={}; lines.forEach(function(l){ var yy=l.year||0; (byYear[yy]=byYear[yy]||[]).push(l); });
    var years=Object.keys(byYear).map(Number).sort(function(a,b){return b-a;});
    var sel=years[0];
    function paint(){
      var ls=byYear[sel]||[];
      var n=ls.reduce(function(a,l){return a+(parseInt(l.cnt,10)||0);},0);
      body.innerHTML=
        '<div class="rdr-row">'+
          '<div><div class="rdr-lab">Nýjasta skýrsla</div>'+
            '<div class="rdr-sum">'+esc(summary(ls)||'engin tæki skráð')+'</div></div>'+
          (years.length>1 ? '<select id="_rdr-year" class="rdr-sel">'+years.map(function(y){return '<option value="'+y+'"'+(y===sel?' selected':'')+'>Skýrsla '+y+'</option>';}).join('')+'</select>' : '<span class="rdr-yr">Skýrsla '+sel+'</span>')+
        '</div>'+
        '<button id="_rdr-fill" class="rdr-btn"'+(n?'':' disabled')+'>📥 Lesa úr skýrslu → bæta '+n+' tækjum við (TMP-númer)</button>'+
        '<div class="rdr-muted" style="margin-top:6px">Rangt fyrirtæki/skýrsla? Tengdu rétta úttektarskýrslu í <b>Skjöl &amp; skýrslur</b> að neðan.</div>';
      var ys=body.querySelector('#_rdr-year'); if(ys) ys.onchange=function(){ sel=+ys.value; paint(); };
      var fb=body.querySelector('#_rdr-fill'); if(fb) fb.onclick=function(){ createFromLines(coId, co.nafn, byYear[sel]||[]); };
    }
    paint();
  }

  function inject(){
    var main=document.getElementById('companies-main'); if(!main) return;
    var col=main.querySelector('.uttekt-col-l'); if(!col) return;
    var coId=getCoId(); if(!coId) return;
    var box=col.querySelector('.rdr-box');
    if(box){ if(String(box.dataset.co)!==String(coId)){ box.dataset.co=coId; render(box,coId); } return; }
    box=document.createElement('div'); box.className='rdr-box'; box.dataset.co=coId;
    col.appendChild(box); render(box,coId);
  }
  (function start(){ var m=document.getElementById('companies-main'); if(!m){ setTimeout(start,700); return; }
    var t=0; new MutationObserver(function(){ clearTimeout(t); t=setTimeout(inject,300); }).observe(m,{childList:true,subtree:true}); inject(); })();

  if(!document.getElementById('uttekt-reader-css')){
    var css=[
      '.rdr-box{background:var(--surface);border:1px dashed var(--brd2);border-radius:12px;padding:14px 16px;margin-top:14px}',
      '.rdr-h{font-family:"Space Mono",ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink1);margin-bottom:10px}',
      '.rdr-muted{font-size:12px;color:var(--ink3)}',
      '.rdr-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap}',
      '.rdr-lab{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink4)}',
      '.rdr-sum{font-size:13px;font-weight:600;color:var(--ink1);margin-top:2px}',
      '.rdr-sel{font:inherit;font-size:12.5px;padding:5px 8px;border:1px solid var(--brd);border-radius:8px;background:var(--surface);color:var(--ink1)}',
      '.rdr-yr{font-size:12px;font-weight:700;color:var(--ink2)}',
      '.rdr-btn{width:100%;border:0;border-radius:10px;padding:11px;font:inherit;font-weight:700;font-size:13px;cursor:pointer;background:var(--brand);color:#fff}',
      '.rdr-btn:disabled{opacity:.5;cursor:not-allowed}'
    ].join('\n');
    var st=document.createElement('style'); st.id='uttekt-reader-css'; st.textContent=css; document.head.appendChild(st);
  }
  console.log('[patch-226] úttektarskýrslu-reader box installed');
})();
