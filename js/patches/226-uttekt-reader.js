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
  function driveUrl(id){ return id?'https://drive.google.com/file/d/'+id+'/view':''; }

  // Which report the tækjalisti was built from — saved per company (synced via
  // AppSettings) so the proof shows on every device.
  function getSource(coId){ try{ if(window.AppSettings&&AppSettings.path){ var all=AppSettings.path('inspection_source')||{}; return all[String(coId)]||null; } }catch(_){} return null; }
  function saveSource(coId, src){ try{ if(window.AppSettings&&AppSettings.save){ var o={inspection_source:{}}; o.inspection_source[String(coId)]=src; return AppSettings.save(o); } }catch(_){} return Promise.resolve(); }
  async function fetchReportDocs(baseId){
    var sb=SB(); if(!sb||!baseId) return [];
    try{ var r=await sb.from('customer_documents').select('year,drive_file_id,notes').eq('customer_base_id',baseId).eq('doc_type','uttektarskyrsla'); return r.data||[]; }catch(e){ return []; }
  }
  // The report the tækjalisti is based on: prefer the recorded import source,
  // else the newest attached úttektarskýrsla, else the newest report on file.
  function computeSrc(coId, repDocs){
    var rec=getSource(coId); if(rec&&rec.name) return Object.assign({_basis:true}, rec);
    var atts=((window.CompanyAttachments&&CompanyAttachments.list(coId))||[]).filter(function(a){
      var k=a.kind||''; return k==='skyrsla' || /sko(ð|d)un|(ú|u)ttekt|sk(ý|y)rsl/i.test(a.name||'');
    });
    if(atts.length){ atts.sort(function(x,y){return (Date.parse(y.uploaded_at||0)||0)-(Date.parse(x.uploaded_at||0)||0);}); var a=atts[0]; return {name:a.name, att_id:a.id, year:a.year}; }
    if(repDocs&&repDocs.length){ var ds=repDocs.slice().sort(function(x,y){return (+y.year||0)-(+x.year||0);}); var d=ds[0]; return {name:(d.notes||('Skýrsla '+(d.year||''))), drive_file_id:d.drive_file_id, year:d.year}; }
    return null;
  }
  function sourceFooter(s){
    if(!s||!s.name) return '';
    var lab=s._basis?'Tækjalisti byggður á':'Tengd skýrsla';
    var when=s.ts?(' · '+new Date(s.ts).toLocaleDateString('is-IS')):'';
    var nm=esc(String(s.name).length>46?String(s.name).slice(0,44)+'…':s.name);
    var link = s.drive_file_id ? '<a href="'+esc(driveUrl(s.drive_file_id))+'" target="_blank" rel="noopener" class="rdr-srcname">📄 '+nm+' ↗</a>'
             : (s.att_id ? '<button type="button" class="rdr-srcname" data-srcatt="'+esc(s.att_id)+'">📄 '+nm+'</button>'
             : '<span class="rdr-srcname">📄 '+nm+'</span>');
    return '<div class="rdr-srcbar">📌 '+lab+': '+link+when+'</div>';
  }

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

  // Bucket an EXISTING uttaeki row into the same category keys as CATMAP, so the
  // import can reconcile the report counts against what's already registered.
  function catOf(u){
    var t=(u.type||'').toLowerCase(), s=(u.size||'').toLowerCase();
    if(/reyk|smoke/.test(t)) return 'reyk';
    if(/teppi|blanket/.test(t)) return 'teppi';
    if(/slang|slöng|hose/.test(t)) return 'slanga';
    if(/co2|co₂|kolsýr|kolsyr/.test(t)) return /\b5\b|5\s*kg/.test(s)?'co2_5':'co2_2';
    if(/léttv|lettv|abf|vatn|water|froð|frod/.test(t)) return 'lettvatn';
    if(/duft|abc|pfc/.test(t)) return /\b(6|9|12)\b/.test(s)?'duft6':'duft2';
    return null;
  }

  async function createFromLines(coId, nafn, lines, source){
    var sb=SB(); if(!sb) { alert('Engin tenging'); return; }
    var today=new Date(); var y=lines[0]&&lines[0].year ? lines[0].year : today.getFullYear();
    var lastInsp=y+'-06-01';
    var nextInsp=(y+1)+'-06-01';
    // Count what is ALREADY registered for this company, per category, so we
    // only add the tæki that are missing (no duplicates).
    var existing=((window.DB&&DB.cache&&DB.cache.units)||[]).filter(function(u){return u.client===nafn;});
    var have={}; existing.forEach(function(u){ var c=catOf(u); if(c) have[c]=(have[c]||0)+1; });
    var rows=[], used={}, summary=[];
    lines.forEach(function(l){
      var m=CATMAP[l.category]; var n=parseInt(l.cnt,10)||0; if(!m||n<=0) return;
      var existN=have[l.category]||0;
      var add=Math.max(0, n-existN);
      var label=m[0]+(m[1]?' '+m[1]:'');
      summary.push('• '+label+': skýrsla '+n+' · skráð '+existN+' → '+(add>0?('bæti við '+add):'fullt ✓'));
      for(var i=0;i<add;i++){ var s; do{ s=tmpSerial(); }while(used[s]); used[s]=1;
        rows.push({ serial:s, type:m[0], size:m[1], client:nafn, location:'',
          last_insp:lastInsp, next_insp:nextInsp, status:'active', pressure:14 }); }
    });
    if(!summary.length){ alert('Engin tæki í skýrslunni.'); return; }
    // Remember which report this came from (proof), even if nothing new is added.
    var src = Object.assign({ name:'Skýrsla '+y, year:y, ts:Date.now() }, source||{});
    try{ await saveSource(coId, src); }catch(_){}
    if(!rows.length){ alert('✓ Öll tæki úr skýrslu '+y+' eru þegar skráð — ekkert bætt við.\n\n'+summary.join('\n')); try{ if(window.Companies&&Companies.openDetail) Companies.openDetail(coId); }catch(_){} return; }
    if(!confirm('Skýrsla '+y+' — samræmt við skráð tæki hjá „'+nafn+'":\n\n'+summary.join('\n')+'\n\nBæta '+rows.length+' tækjum við sem vantar? (TMP-númer, uppfært við fyrstu skoðun)')) return;
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

  // Build synthetic lines from manually-typed counts and reuse createFromLines.
  function createFromCounts(coId, nafn, year, counts, source){
    var lines=Object.keys(counts)
      .filter(function(k){return (parseInt(counts[k],10)||0)>0;})
      .map(function(k){ return { category:k, cnt:parseInt(counts[k],10)||0, year:year }; });
    if(!lines.length){ alert('Sláðu inn fjölda á a.m.k. einni tegund.'); return; }
    createFromLines(coId, nafn, lines, source);
  }

  // ── PDF reading (úttektarskýrsla → counts) ───────────────────────────────
  // Loads pdf.js on first use, extracts the text, and parses the standard
  // Slökkvitæki úttektarskýrsla layout: "<tegund>. Fjöldi: N Í lagi: …".
  function ensurePdfJs(){
    if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if(window.__pdfjsLoading) return window.__pdfjsLoading;
    window.__pdfjsLoading=new Promise(function(res,rej){
      var s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js';
      s.onload=function(){ try{ window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js'; }catch(_){ } res(window.pdfjsLib); };
      s.onerror=function(){ rej(new Error('Gat ekki hlaðið PDF-lesara (net?)')); };
      document.head.appendChild(s);
    });
    return window.__pdfjsLoading;
  }
  async function readPdfText(file){
    var lib=await ensurePdfJs();
    var buf=await file.arrayBuffer();
    var pdf=await lib.getDocument({data:buf}).promise;
    var out='';
    for(var p=1;p<=pdf.numPages;p++){
      var page=await pdf.getPage(p);
      var tc=await page.getTextContent();
      out+=tc.items.map(function(it){return it.str;}).join(' ')+'\n';
    }
    return out;
  }
  function parseReportText(text){
    var t=String(text||'').replace(/ /g,' ').replace(/[₀-₉]/g,function(c){return String.fromCharCode(c.charCodeAt(0)-0x2080+48);});
    function grab(re){ var m=t.match(re); if(!m) return null; if(/^x$/i.test(m[1])) return 0; var n=parseInt(m[1],10); return isNaN(n)?null:n; }
    var counts={
      lettvatn: grab(/l[eé]ttvatn[\s\S]*?Fj[öo]ldi:\s*(x|\d+)/i),
      duft2:    grab(/duft\s*2\s*kg[\s\S]*?Fj[öo]ldi:\s*(x|\d+)/i),
      duft6:    grab(/duft\s*6[\s\S]*?Fj[öo]ldi:\s*(x|\d+)/i),
      co2_2:    grab(/co2\s*2\s*kg[\s\S]*?Fj[öo]ldi:\s*(x|\d+)/i),
      co2_5:    grab(/co2\s*5\s*kg[\s\S]*?Fj[öo]ldi:\s*(x|\d+)/i),
      slanga:   grab(/brunasl[öo]ng[\s\S]*?Fj[öo]ldi:\s*(x|\d+)/i),
      teppi:    grab(/eldvarnart?eppi[\s\S]*?Fj[öo]ldi:\s*(x|\d+)/i),
      reyk:     grab(/reykskynjar[\s\S]*?Fj[öo]ldi:\s*(x|\d+)/i)
    };
    var ym=t.match(/yfirfarin[\s\S]{0,40}?(20\d{2})/i)||t.match(/\b(20\d{2})\b/);
    return { counts:counts, year: ym?parseInt(ym[1],10):null };
  }

  function manualFormHtml(){
    return '<div class="rdr-man">'+
      '<div class="rdr-pdfrow">'+
        '<input type="file" accept="application/pdf,.pdf" class="rdr-pdf-input" style="display:none">'+
        '<button type="button" class="rdr-pdfbtn">📄 Lesa úr PDF skýrslu → bæta tækjum við</button>'+
        '<span class="rdr-pdf-status rdr-muted"></span>'+
      '</div>'+
    '</div>';
  }
  function wireManual(body, coId, nafn){
    var pdfBtn=body.querySelector('.rdr-pdfbtn'), pdfInp=body.querySelector('.rdr-pdf-input'), pdfStat=body.querySelector('.rdr-pdf-status');
    if(!pdfBtn||!pdfInp) return;
    pdfBtn.onclick=function(){ pdfInp.click(); };
    pdfInp.onchange=async function(){
      var f=pdfInp.files&&pdfInp.files[0]; pdfInp.value='';
      if(!f) return;
      if(pdfStat){ pdfStat.textContent='⏳ Les PDF…'; }
      try{
        var text=await readPdfText(f);
        var pr=parseReportText(text);
        var total=0; Object.keys(pr.counts).forEach(function(k){ if(pr.counts[k]>0) total+=pr.counts[k]; });
        if(!total){ if(pdfStat){ pdfStat.textContent='⚠ Fann engar „Fjöldi"-tölur í þessari PDF'; } return; }
        if(pdfStat){ pdfStat.textContent='✓ Las '+total+' tæki'+(pr.year?(' · '+pr.year):'')+''; }
        // Keep the PDF as proof — upload it as that year's úttektarskýrslu so it
        // shows in Skjöl & viðhengi too, and record it as the tækjalisti source.
        var src={ name:f.name, year:pr.year||null, ts:Date.now() };
        if(window.CompanyAttachments&&CompanyAttachments.upload){
          try{ var meta=await CompanyAttachments.upload(coId, f, {kind:'skyrsla', year:String(pr.year||'')});
            if(meta){ src.att_id=meta.id; } if(pdfStat){ pdfStat.textContent='✓ Las '+total+' tæki · PDF vistuð sem viðhengi'; }
          }catch(_){}
        }
        createFromCounts(coId, nafn, pr.year||new Date().getFullYear(), pr.counts, src);
      }catch(e){ if(pdfStat){ pdfStat.textContent='⚠ '+(e.message||e); } }
    };
  }

  async function render(host, coId){
    host.innerHTML='<div class="rdr-muted">Hleð…</div>';
    var body=host;
    var co=getCo(coId); if(!co){ body.innerHTML='<span class="rdr-muted">—</span>'; return; }
    var baseId=await baseIdForKt(co.kennitala);
    var lines = baseId ? await fetchLines(baseId) : [];
    var repDocs = baseId ? await fetchReportDocs(baseId) : [];
    var footer = sourceFooter(computeSrc(coId, repDocs));

    // No auto-parsed report yet → manual entry is the primary path.
    if(!lines.length){
      body.innerHTML='<div class="rdr-muted">Engin <b>sjálf-lesin</b> skýrsla fundin ennþá — skráðu fjöldann af síðustu skýrslu hér að neðan, eða tengdu skýrsluna í <b>Skjöl &amp; viðhengi</b>.</div>'+
        manualFormHtml()+footer;
      wireManual(body, coId, co.nafn);
      return;
    }

    // Auto-parsed lines exist → show them + the manual form underneath.
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
        '<div class="rdr-muted" style="margin-top:6px">Rangt fyrirtæki/skýrsla? Tengdu rétta úttektarskýrslu í <b>Skjöl &amp; viðhengi</b> að neðan.</div>'+
        '<div class="rdr-div"></div>'+
        manualFormHtml()+footer;
      var ys=body.querySelector('#_rdr-year'); if(ys) ys.onchange=function(){ sel=+ys.value; paint(); };
      var fb=body.querySelector('#_rdr-fill'); if(fb) fb.onclick=function(){ var ls=byYear[sel]||[]; createFromLines(coId, co.nafn, ls, {name:'Skýrsla '+sel, year:sel, drive_file_id:(ls[0]&&ls[0].drive_file_id)||null, ts:Date.now()}); };
      wireManual(body, coId, co.nafn);
    }
    paint();
  }

  function inject(){
    var main=document.getElementById('companies-main'); if(!main) return;
    var coId=getCoId(); if(!coId) return;
    var box=main.querySelector('.rdr-box');
    if(box){
      if(String(box.dataset.co)!==String(coId)){ box.dataset.co=coId; render(box.querySelector('.rdr-bodywrap'), coId); }
      if(main.lastElementChild!==box) main.appendChild(box); // keep at very bottom
      return;
    }
    box=document.createElement('div'); box.className='rdr-box'; box.dataset.co=coId; box.dataset.open='0';
    box.innerHTML=
      '<button class="rdr-toggle" type="button" aria-expanded="false">'+
        '<span class="rdr-chev">▸</span>'+
        '<span class="rdr-ttl">📋 Útfylling tækjalista úr úttektarskýrslu</span>'+
      '</button>'+
      '<div class="rdr-bodywrap" style="display:none"></div>';
    var tg=box.querySelector('.rdr-toggle');
    tg.onclick=function(){
      var open=box.dataset.open!=='1'; box.dataset.open=open?'1':'0';
      box.querySelector('.rdr-bodywrap').style.display=open?'block':'none';
      box.querySelector('.rdr-chev').textContent=open?'▾':'▸';
      tg.setAttribute('aria-expanded', open?'true':'false');
    };
    main.appendChild(box); // bottom of the page
    render(box.querySelector('.rdr-bodywrap'), coId);
  }
  (function start(){ var m=document.getElementById('companies-main'); if(!m){ setTimeout(start,700); return; }
    var t=0; new MutationObserver(function(){ clearTimeout(t); t=setTimeout(inject,300); }).observe(m,{childList:true,subtree:true}); inject(); })();
  // Open the saved source PDF (company_attachments) when its chip is clicked.
  document.addEventListener('click', function(e){
    var b=e.target.closest && e.target.closest('[data-srcatt]'); if(!b) return;
    var coId=getCoId(); var id=b.getAttribute('data-srcatt');
    var f=((window.CompanyAttachments&&CompanyAttachments.list(coId))||[]).find(function(x){return x.id===id;});
    if(f&&window.CompanyAttachments&&CompanyAttachments.openPreview) CompanyAttachments.openPreview(f);
  });
  // Re-render the open reader when settings sync (source/attachments arrive).
  try{ if(window.AppSettings&&AppSettings.onChange) AppSettings.onChange(function(){
    var box=document.querySelector('.rdr-box'); if(box&&box.dataset.open==='1'){ var b=box.querySelector('.rdr-bodywrap'); if(b) render(b, +box.dataset.co); }
  }); }catch(_){}

  if(!document.getElementById('uttekt-reader-css')){
    var css=[
      '.rdr-box{background:var(--surface);border:1px dashed var(--brd2);border-radius:12px;margin:14px 0}',
      '.rdr-toggle{width:100%;display:flex;align-items:center;gap:9px;background:none;border:0;cursor:pointer;padding:11px 15px;font:inherit;text-align:left}',
      '.rdr-chev{color:var(--ink3);font-size:12px;width:12px;flex:none}',
      '.rdr-ttl{font-family:"Space Mono",ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink1)}',
      '.rdr-bodywrap{padding:0 15px 14px}',
      '.rdr-h{font-family:"Space Mono",ui-monospace,monospace;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink1);margin-bottom:10px}',
      '.rdr-muted{font-size:12px;color:var(--ink3)}',
      '.rdr-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap}',
      '.rdr-lab{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--ink4)}',
      '.rdr-sum{font-size:13px;font-weight:600;color:var(--ink1);margin-top:2px}',
      '.rdr-sel{font:inherit;font-size:12.5px;padding:5px 8px;border:1px solid var(--brd);border-radius:8px;background:var(--surface);color:var(--ink1)}',
      '.rdr-yr{font-size:12px;font-weight:700;color:var(--ink2)}',
      '.rdr-btn{width:100%;border:0;border-radius:10px;padding:11px;font:inherit;font-weight:700;font-size:13px;cursor:pointer;background:var(--brand);color:#fff}',
      '.rdr-btn:disabled{opacity:.5;cursor:not-allowed}',
      '.rdr-btn-sm{width:auto;padding:9px 14px;white-space:nowrap}',
      '.rdr-pdfrow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.rdr-pdfbtn{border:1px solid var(--brand);background:var(--bg);color:var(--brand);border-radius:9px;padding:9px 14px;font:inherit;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}',
      '.rdr-pdf-status{font-size:11.5px;flex:1;min-width:120px}',
      '.rdr-div{height:1px;background:var(--brd);margin:14px 0 12px}',
      '.rdr-man{}',
      '.rdr-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:7px 10px;margin-bottom:10px}',
      '.rdr-cat{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12.5px;color:var(--ink1)}',
      '.rdr-cat span{flex:1;min-width:0}',
      '.rdr-cnt{width:64px;padding:7px 8px;border:1px solid var(--brd);border-radius:7px;font:inherit;font-size:13px;text-align:center;background:var(--surface);color:var(--ink1)}',
      '.rdr-manrow{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:4px}',
      '.rdr-yrlab{font-size:12px;color:var(--ink2);display:flex;align-items:center;gap:6px}',
      '.rdr-yrin{width:78px;padding:7px 8px;border:1px solid var(--brd);border-radius:7px;font:inherit;font-size:13px;text-align:center;background:var(--surface);color:var(--ink1)}',
      '@media(max-width:520px){.rdr-grid{grid-template-columns:1fr}.rdr-manrow{flex-direction:column;align-items:stretch}.rdr-btn-sm{width:100%}}',
      '.rdr-srcbar{margin-top:12px;padding-top:10px;border-top:1px dashed var(--brd);font-size:11.5px;color:var(--ink3);display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.rdr-srcname{font-size:11.5px;font-weight:700;color:var(--brand);text-decoration:none;background:none;border:0;padding:0;cursor:pointer;font-family:inherit}'
    ].join('\n');
    var st=document.createElement('style'); st.id='uttekt-reader-css'; st.textContent=css; document.head.appendChild(st);
  }
  console.log('[patch-226] úttektarskýrslu-reader box installed');
})();
