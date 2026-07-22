/* === DOC YEAR GRID v2 — unified "Skjöl & viðhengi" card ===
 * The single document card on the company detail page, matching the v6 mockup
 * (mockups/taekjauttekt-eldthema-v6.html → "📁 Skjöl & viðhengi"):
 *
 *   📁 Skjöl & viðhengi                                    [+ Viðhengi]
 *   📊 Staða eftir ári   ·  year pills (ok / í vinnslu / vantar)
 *   📑 Þjónustusamningur ·  📄 Samningur 2019   + samningur
 *   ┌ Ár │ Úttektarskýrsla │ Reikningur ┐   (newest year first)
 *   │ 2026 │ ⏳ Í vinnslu    │ + reikningur │
 *   │ 2025 │ 📄 Skoðun       │ 🧾 R-000244  │
 *   📎 Önnur viðhengi    ·  chips + Viðhengi
 *
 * Two data sources are merged per (year, doc-type):
 *   • customer_documents — auto-indexed from Drive cloud-side (úttektarskýrslur,
 *     reikningar, samningar). Scoped per site via fyrirtaeki_id (Cowork's
 *     report→location map) so multi-location kts show the right reports.
 *   • company_attachments — manual uploads via patch 111 (window.CompanyAttachments),
 *     tagged with {year, kind}. The "+" / "vantar" buttons attach into here.
 *
 * Patch 111 is the engine (upload/preview/delete/pick); its standalone card is
 * suppressed so this is the only document card.
 */
(function(){
  'use strict';
  if (window.__docYearGridInstalled) return;
  window.__docYearGridInstalled = true;

  function SB(){ return (window.DB && window.DB.sb) || window.__vdaSB || null; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function digits(s){ return String(s||'').replace(/\D/g,''); }
  function dash(kt){ var d=digits(kt); return d.length>=10 ? d.slice(0,6)+'-'+d.slice(6,10) : d; }
  function driveUrl(id){ return id ? 'https://drive.google.com/file/d/'+id+'/view' : ''; }
  // Skjöl lifa á TVEIMUR stöðum: eldri/Drive-lesin skjöl bera `drive_file_id`, en
  // skjöl sem appið sjálft býr til (patch 111/233 viðhengi, endurgerðar skýrslur úr
  // Cowork o.fl.) liggja í Supabase Storage og bera AÐEINS `storage_path` — með
  // bucket-nafninu fremst, t.d. "samningar/company_attachments/1611/skra.pdf".
  // Þau höfðu engan hlekk og teiknuðust sem dautt, ósmellanlegt atriði (t.d. JDÓ
  // úttektarskýrslan 2026). Bucket-arnir eru public svo bein slóð dugar — engin
  // async signed-url þörf, sem heldur þessu samstillt við render-inn.
  function storageUrl(p){
    if(!p) return '';
    var base = (window.SUPABASE_URL||'').replace(/\/+$/,'');
    if(!base) return '';
    var s = String(p).replace(/^\/+/,'');
    var i = s.indexOf('/'); if(i < 1) return '';
    return base+'/storage/v1/object/public/'+s.slice(0,i)+'/'+s.slice(i+1).split('/').map(encodeURIComponent).join('/');
  }
  function docUrl(d){ return d ? (driveUrl(d.drive_file_id) || storageUrl(d.storage_path)) : ''; }
  var NOW = new Date().getFullYear();

  // Ein færsla úr ársnetinu (handvirkt viðhengi {_att:a} EÐA customer_documents
  // skjal d) → póst-viðhengi ({driveId} eða {url}) fyrir 📧 Senda-gluggann.
  // Drive-skrár fara sem {driveId} (gmail-send sækir þær server-megin).
  async function entryAttachment(x, fallbackName){
    if(!x) return null;
    var getUrl = window.CompanyAttachments && CompanyAttachments.getPublicUrl;
    if(x._att){
      var a=x._att, nm=a.name || fallbackName;
      if(a.path && getUrl){ var u=await CompanyAttachments.getPublicUrl(a.path); if(u) return { filename:nm, url:u }; }
      return null;
    }
    if(x.drive_file_id) return { filename: fallbackName, driveId: x.drive_file_id };
    if(x.storage_path && getUrl){ var u2=await CompanyAttachments.getPublicUrl(x.storage_path); if(u2) return { filename: fallbackName, url:u2 }; }
    return null;
  }

  function getCompanyId(){
    var main=document.getElementById('companies-main'); if(!main) return null;
    var el=main.querySelector('[data-co-id]:not(._cat-section):not(._dyg-section):not(._cpr-section)');
    if(el){ var v=el.getAttribute('data-co-id'); if(v&&/^\d+$/.test(v)) return +v; }
    return null;
  }
  function getCompany(coId){ var list=(window.Companies&&Companies.list)||[]; return list.find(function(c){return +c.id===+coId;})||null; }

  var _baseCache={};
  async function baseIdForKt(kt){
    var d=dash(kt); if(!d) return null;
    if(_baseCache[d]!==undefined) return _baseCache[d];
    var sb=SB(); if(!sb) return null;
    try{ var r=await sb.from('customers_base').select('id').eq('kennitala', d).limit(1);
      var id=(r.data&&r.data[0])?r.data[0].id:null; _baseCache[d]=id; return id; }
    catch(e){ return null; }
  }
  var _ktCache={};
  async function ktForCoId(coId){
    if(_ktCache[coId]!==undefined) return _ktCache[coId];
    var sb=SB(); if(!sb) return null;
    try{ var r=await sb.from('fyrirtaeki').select('kennitala').eq('id', coId).maybeSingle();
      var kt=(r.data&&r.data.kennitala)||null; _ktCache[coId]=kt; return kt; }
    catch(e){ return null; }
  }
  async function fetchDocs(baseId){
    var sb=SB(); if(!sb||!baseId) return [];
    try{ var r=await sb.from('customer_documents').select('id,doc_type,year,drive_file_id,storage_path,invoice_number,amount,doc_date,notes,fyrirtaeki_id').eq('customer_base_id', baseId);
      return r.data||[]; }catch(e){ return []; }
  }
  // Payday-kröfur kúnnans (eftir kt) úr speglinum payday_invoices_slokk. Margar
  // krófur eru stofnaðar BEINT í Payday (bókari/mánaðaruppgjör) og eiga hvorki
  // solur-röð né reiknings-PDF í Drive → sáust í Kröfu yfirliti en EKKI á
  // fyrirtækja-prófílnum. Þær eru fyrirtækja-víðar (einn kt, ekki per starfsstöð)
  // svo þær birtast á öllum stöðum kt-sins, eins og reikningar/samningar.
  function fmtKrLoc(n){ try{ return (window.fmtKr?window.fmtKr(n):String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,'.')); }catch(e){ return String(n); } }
  async function fetchPayday(kt){
    var sb=SB(); var d=dash(kt), dd=digits(kt); if(!sb||dd.length<10||dd==='9999999999') return [];
    try{
      var r=await sb.from('payday_invoices_slokk')
        .select('payday_id,number,amount_total,created_date,due_date,paid_date,status,reference')
        .or('kt.eq.'+d+',kt.eq.'+dd).limit(400);
      return r.data||[];
    }catch(e){ return []; }
  }
  function pdYear(p){ var s=String(p.created_date||p.due_date||''); var m=s.match(/(20[0-9]{2})/); return m?parseInt(m[1],10):null; }
  function pdChip(p){
    var lab='PD '+(p.number||p.payday_id||'');
    var amt=(p.amount_total!=null&&p.amount_total!=='')?(' · '+fmtKrLoc(p.amount_total)+' kr'):'';
    var st=p.paid_date?'greitt':(p.status||'ógreitt');
    var due=p.due_date?(' · gjalddagi '+esc(String(p.due_date).slice(0,10))):'';
    return '<span class="sk-doc pd" title="Payday-krafa'+esc(amt)+' · '+esc(st)+due+' (opnast í Payday)">🟣 '+esc(lab)+'</span>';
  }
  // Multi-location support: one kennitala can have several staðir. Split the kt's
  // docs per location by fyrirtaeki_id (precise, Cowork's map) or by matching the
  // doc's filename (notes) to the location heimilisfang (fallback).
  async function siblingsForKt(kt){
    var sb=SB(); if(!sb) return [];
    try{ var r=await sb.from('fyrirtaeki').select('id,nafn,heimilisfang').eq('kennitala', dash(kt)); return r.data||[]; }
    catch(e){ return []; }
  }
  function addrKeys(h){
    h=String(h||'');
    var sw=(h.match(/[A-Za-zÁÉÍÓÚÝÆÖÞÐáéíóúýæöþð]{3,}/)||[''])[0];
    var streetStem=sw.toLowerCase().replace(/(ur|inn|num|i|a)$/,'');
    var postcode=(h.match(/\b(\d{3})\b/)||[])[1]||'';
    var cm=h.match(/\d{3}\s+([A-ZÁÉÍÓÚÝÆÖÞÐ][a-záéíóúýæöþð]{3,})/)||h.match(/,\s*([A-ZÁÉÍÓÚÝÆÖÞÐ][a-záéíóúýæöþð]{3,})\s*$/);
    var city=(cm?cm[1]:'').toLowerCase().replace(/(ur|inn|i)$/,'');
    return {streetStem:streetStem, postcode:postcode, city:city};
  }
  function docMatchesLoc(notes, my, all){
    var n=String(notes||'').toLowerCase();
    if(my.streetStem && my.streetStem.length>=4 && n.indexOf(my.streetStem)>=0) return true;
    if(my.postcode){ var pcShared=all.some(function(k){return k!==my && k.postcode===my.postcode && k.streetStem!==my.streetStem;}); if(!pcShared && n.indexOf(my.postcode)>=0) return true; }
    if(my.city && my.city.length>=4){ var cityShared=all.some(function(k){return k!==my && k.city===my.city && k.streetStem!==my.streetStem;}); if(!cityShared && n.indexOf(my.city)>=0) return true; }
    return false;
  }
  async function filterDocsToLocation(docs, kt, coId){
    var sibs=await siblingsForKt(kt);
    if(sibs.length<=1) return docs;
    var keys=sibs.map(function(s){return {id:s.id, k:addrKeys(s.heimilisfang)};});
    var allK=keys.map(function(x){return x.k;});
    var mine=keys.filter(function(x){return +x.id===+coId;})[0];
    if(!mine) return docs;
    return docs.filter(function(d){
      if(d.fyrirtaeki_id!=null) return +d.fyrirtaeki_id===+coId;     // precise map (Cowork)
      // Reikningar + samningar are issued company-wide (one per kt, not per
      // starfsstöð) and are rarely location-tagged — show them on every site of
      // the kt rather than guessing an address from the filename. Only the
      // per-site úttektarskýrslur get the address (notes) filter.
      if(d.doc_type==='reikningur' || d.doc_type==='samningur') return true;
      var matched=keys.filter(function(x){return docMatchesLoc(d.notes, x.k, allK);});
      if(!matched.length) return true;                               // óvíst → birt á öllum
      return matched.some(function(x){return +x.id===+coId;});
    });
  }

  // ── attachment helpers (company_attachments via patch 111) ────────────────
  function attList(coId){ try{ return (window.CompanyAttachments&&CompanyAttachments.list(coId))||[]; }catch(e){ return []; } }
  function attYear(a){
    if(a.year && a.year!=='0') return String(a.year);
    var m=String(a.name||'').match(/\b(20[2-3][0-9])\b/); return m?m[1]:null;
  }
  // Classify a manual attachment into a slot: 'skyrsla' | 'reikningur' |
  // 'samningur' | 'other'. Explicit kind wins, else sniff the filename.
  function attKind(a){
    if(a.kind==='skyrsla'||a.kind==='reikningur'||a.kind==='samningur') return a.kind;
    var nm=String(a.name||'');
    if(/samning/i.test(nm)) return 'samningur';
    if(/reikn|r-?\s?\d{3,}/i.test(nm)) return 'reikningur';
    if(/sko(ð|d)un|(ú|u)ttekt|sk(ý|y)rsl/i.test(nm)) return 'skyrsla';
    return 'other';
  }
  function invLabel(s){
    var t=String(s||'').trim(); if(!t) return 'Reikningur';
    if(/^r/i.test(t)) return t.toUpperCase().replace(/\s+/g,'');
    return 'R-'+t.replace(/\s+/g,'');
  }

  // ── chips ─────────────────────────────────────────────────────────────────
  // Wrap a customer_documents chip with a ✕ that removes the (often wrong-named /
  // mis-yeared) entry from the page — deletes the customer_documents row.
  function docWrap(chip, id){
    return '<span class="sk-att-wrap">'+chip+'<button type="button" class="sk-att-x" data-deldoc="'+esc(id)+'" title="Eyða skráningu af síðunni">✕</button></span>';
  }
  // 2026-06-24: same ✕ for MANUAL / auto-saved attachments (company_attachments)
  // so the úttektarskýrslu/reikninga-reitir geta líka eytt þeim — áður var ✕
  // bara á sjálfvirkt-skráðu customer_documents. data-del → CompanyAttachments.delete.
  function attWrap(chip, id){
    return '<span class="sk-att-wrap">'+chip+'<button type="button" class="sk-att-x" data-del="'+esc(id)+'" title="Eyða viðhengi">✕</button></span>';
  }
  // 2026-06-24: show the report's FILE NAME (from notes, minus the " · kt …"
  // suffix) instead of a generic „Skoðun" — so a wrong-matched report is spotted
  // at a glance and deleted with the ✕, without opening each one.
  function docName(d){
    // Trim only the redundant " · kt 123456-7890" suffix the indexer appends —
    // keep the rest of the filename verbatim (company · address · month · year).
    var nm=String(d.notes||'').replace(/\s*[·•]\s*kt\b.*$/i,'').trim();
    return nm || ('Skoðun'+(d.year?(' '+d.year):''));
  }
  function repDocChip(d){
    var u=docUrl(d), full=docName(d);
    var disp=full.length>46?full.slice(0,44)+'…':full;
    var ico = d.doc_type==='brunakerfi' ? '🔥' : '📄';
    var chip = u ? '<a class="sk-doc rep" href="'+esc(u)+'" target="_blank" rel="noopener" title="'+esc(full)+' — opna í Drive">'+ico+' '+esc(disp)+'</a>'
                 : '<span class="sk-doc rep" title="'+esc(full)+' (engin Drive-slóð)">'+ico+' '+esc(disp)+'</span>';
    return docWrap(chip, d.id);
  }
  function invDocChip(d, srcByNum){
    var u=docUrl(d); var lab=invLabel(d.invoice_number);
    var chip;
    var nk = d.invoice_number ? numKey(d.invoice_number) : '';
    var inSolur = nk && srcByNum && srcByNum[nk];
    if(u){
      chip = '<a class="sk-doc inv" href="'+esc(u)+'" target="_blank" rel="noopener" title="Opna reikning í Drive">🧾 '+esc(lab)+'</a>';
    } else if(inSolur){
      // 2026-07-09: POS-tengdar skráningar („kt-tengt úr Sölu") hafa EKKERT
      // skjal (drive_file_id null) en EIGA sölu-röð → smellur opnar reikninginn
      // beint úr sölunni (solur → SalaInvoice.renderFromSale, sama mót og „Prenta
      // aftur" í Bókhalds yfirliti). AÐEINS gert þegar númerið er raunveruleg
      // sala (2026-07-21, Agnar: „i only want 000419") — Stólpi/eldra-bókhalds
      // færslur án sölu-raðar hafa ekkert að opna og teiknast sem óvirk merki.
      chip = '<button type="button" class="sk-doc inv" data-invopen="'+esc(d.invoice_number)+'" title="Opna reikning úr Sölu">🧾 '+esc(lab)+'</button>';
    } else {
      chip = '<span class="sk-doc inv" title="Skráning úr eldra bókhaldi — ekkert PDF-skjal né sölureikningur í kerfinu">🧾 '+esc(lab)+'</span>';
    }
    return docWrap(chip, d.id);
  }
  function repAttChip(a){ var nm=String(a.name||'Skoðun'); var disp=nm.length>46?nm.slice(0,44)+'…':nm; return attWrap('<button type="button" class="sk-doc rep" data-att="'+esc(a.id)+'" title="'+esc(nm)+'">📄 '+esc(disp)+'</button>', a.id); }
  function invAttChip(a){ var m=String(a.name||'').match(/R-?\s?\d{3,}/i); return attWrap('<button type="button" class="sk-doc inv" data-att="'+esc(a.id)+'" title="'+esc(a.name)+'">🧾 '+esc(m?invLabel(m[0]):'Reikningur')+'</button>', a.id); }
  function addChip(kind, year, label){ return '<button type="button" class="sk-doc add" data-pick="1" data-kind="'+esc(kind)+'"'+(year?' data-year="'+esc(year)+'"':'')+'>'+esc(label)+'</button>'; }

  function pill(y, hasReport, confirmed){
    var cls=hasReport?'ok':(y===NOW?'now':'none'); if(confirmed) cls+=' done';
    var tip=confirmed?(y+' — ✓ fact-checkað (staðfest handvirkt)')
      :(hasReport?(y+' — skýrsla á skrá'):(y===NOW?(y+' — í vinnslu'):(y+' — engin skýrsla')));
    return '<span class="sk-pill '+cls+'" title="'+esc(tip)+'">'+String(y).slice(2)+'</span>';
  }

  // 2026-07-14 (ósk Agnars): aðgreina reikninga eftir uppruna á fyrirtækjaprófílnum.
  // Byggt á `solur.source` (uttekt/pos/sott) sem er stimplað á vistunar-stað +
  // bakfært. Náum í num→source fyrir kt kúnnans og flokkum reiknings-chippana.
  function numKey(v){ var mm=String(v==null?'':v).match(/(\d{2,})/); return mm?String(parseInt(mm[1],10)):''; }
  async function fetchSolurSrc(kt){
    var sb=SB(); if(!sb||!kt) return {};
    var d=String(kt).replace(/\D/g,''); if(d.length<7) return {};
    var dash=d.length===10?(d.slice(0,6)+'-'+d.slice(6)):d;
    try{
      var r=await sb.from('solur').select('num,source').or('customer_kt.eq.'+d+',customer_kt.eq.'+dash);
      if(r.error||!r.data) return {};
      var m={}; r.data.forEach(function(s){ var k=numKey(s.num); if(k) m[k]=s.source||'pos'; }); return m;
    }catch(_){ return {}; }
  }
  // Reikningur-sölur kúnnans (greitt_med='reikningur' — sömu og Kröfu yfirlit
  // sýnir) eftir kt. Aðeins þær sem eru tengdar ÞESSUM stað (customer_id===coId)
  // eða kt-víðar án staðar (customer_id tómt) — svo reikningar rekstrarfélags
  // dreifist ekki á alla staði. Tómt við villu.
  async function fetchSolurInvoices(kt, coId){
    var sb=SB(); if(!sb||!kt) return [];
    var d=String(kt).replace(/\D/g,''); if(d.length<7) return [];
    var dash=d.length===10?(d.slice(0,6)+'-'+d.slice(6)):d;
    try{
      var r=await sb.from('solur')
        .select('num,samtals,created_at,customer_id,greitt_med,source')
        .eq('greitt_med','reikningur')
        .or('customer_kt.eq.'+d+',customer_kt.eq.'+dash);
      if(r.error||!r.data) return [];
      return r.data.filter(function(s){ return !s.customer_id || String(s.customer_id)===String(coId); });
    }catch(_){ return []; }
  }
  // Reiknings-chip R-númer → 'afgr' ef solur.source er pos/sott, annars 'uttekt'
  // (sjálfgefið úttekt — prófíllinn er skoðunar-miðaður svo óþekkt skjöl teljast
  // úttekt frekar en að fela þau ranglega undir afgreiðslu).
  function chipInvNum(x){
    if(!x._att && x.invoice_number) return String(x.invoice_number);
    var nm=x._att?String(x._att.name||''):String(x.name||'');
    var mm=nm.match(/R-?\s?0*(\d{3,})/i); return mm?('R-'+mm[1]):'';
  }
  function chipInvSrc(x, srcMap){
    var k=numKey(chipInvNum(x)); var src=k?srcMap[k]:null;
    return (src==='pos'||src==='sott')?'afgr':'uttekt';
  }
  function invGroup(tag, col, bg, brd, chips){
    return '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin:2px 0">'+
      '<span style="font-size:9px;font-weight:700;color:'+col+';background:'+bg+';border:1px solid '+brd+';border-radius:99px;padding:1px 6px;white-space:nowrap">'+tag+'</span>'+chips+'</div>';
  }
  // Opna reikninginn í INNBYGGÐU yfirlagi (iframe) í stað window.open. Á síma
  // opnaði window.open reikninginn í sömu flipa-sögu → „til baka" fór ÚT úr
  // appinu (Agnar 2026-07-21). Yfirlagið hefur eigin ✕ Loka + 🖨 Prenta og
  // snertir enga vafra-sögu. Fest á <body> (utan .view) svo patch 245 skinnið
  // hreyfi það ekki. renderInto fær iframe.contentWindow (SalaInvoice skrifar
  // í .document — sama og window).
  function openInvoiceOverlay(title, renderInto){
    var prev=document.getElementById('_sk-inv-ov'); if(prev){ try{prev.remove();}catch(_){} }
    var ov=document.createElement('div');
    ov.id='_sk-inv-ov';
    ov.style.cssText='position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,.6);display:flex;flex-direction:column';
    var bar=document.createElement('div');
    bar.style.cssText='flex:0 0 auto;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 14px;background:#0f172a;color:#fff';
    bar.innerHTML='<b style="font-size:15px">Reikningur '+esc(title||'')+'</b>';
    var btns=document.createElement('div'); btns.style.cssText='display:flex;gap:8px';
    var pr=document.createElement('button'); pr.type='button'; pr.textContent='🖨 Prenta';
    pr.style.cssText='padding:9px 16px;background:#166534;color:#fff;border:none;border-radius:9px;font-size:15px;cursor:pointer';
    var cl=document.createElement('button'); cl.type='button'; cl.textContent='✕ Loka';
    cl.style.cssText='padding:9px 16px;background:#334155;color:#fff;border:none;border-radius:9px;font-size:15px;cursor:pointer';
    btns.appendChild(pr); btns.appendChild(cl); bar.appendChild(btns);
    var frame=document.createElement('iframe');
    frame.style.cssText='flex:1 1 auto;width:100%;border:0;background:#fff';
    ov.appendChild(bar); ov.appendChild(frame);
    document.body.appendChild(ov);
    function close(){ try{ov.remove();}catch(_){} document.removeEventListener('keydown',onKey); }
    function onKey(ev){ if(ev.key==='Escape') close(); }
    cl.onclick=close;
    ov.addEventListener('click',function(ev){ if(ev.target===ov) close(); });
    document.addEventListener('keydown',onKey);
    var iwin=frame.contentWindow;
    try{ renderInto(iwin); }catch(err){ close(); alert('Villa við að teikna reikning: '+(err&&err.message||err)); return; }
    pr.onclick=function(){ try{ iwin.focus(); iwin.print(); }catch(_){ try{ window.print(); }catch(__){} } };
  }

  // ── Handvirkt fact-check per (fyrirtæki, ár) ────────────────────────────────
  // Tvísmella á árið í töflunni → staðfest (grænt ✓). Geymt í AppSettings
  // (samstillt milli tækja) svo glóandi græni depillinn birtist líka í
  // Fyrirtæki-í-þjónustu listanum (patch 187 les sama lykil). ATH: þetta er
  // MANNSINS staðfesting („ég er búinn að fact-checka þetta ár"), aðskilin frá
  // sjálfvirku skýrslu/reiknings-stöðunni.
  function fcAll(){ try{ return (window.AppSettings&&AppSettings.path&&AppSettings.path('year_factcheck'))||{}; }catch(_){ return {}; } }
  function fcIs(coId,y){ var m=fcAll()[String(coId)]; return !!(m&&m[String(y)]); }
  function fcToggle(coId,y){
    var all; try{ all=JSON.parse(JSON.stringify(fcAll())); }catch(_){ all={}; }
    var k=String(coId), ky=String(y); all[k]=all[k]||{};
    var now=!all[k][ky]; if(now) all[k][ky]=1; else delete all[k][ky];
    try{ if(window.AppSettings&&AppSettings.save) AppSettings.save({year_factcheck:all}); }catch(_){}
    try{ document.dispatchEvent(new Event('attachment-year-changed')); }catch(_){}
    return now;
  }

  async function render(section, coId){
    var hdr='<div class="sk-h"><h3>📁 Skjöl &amp; viðhengi</h3>'+
            '<button type="button" class="sk-add-btn" data-pick="1">+ Viðhengi</button></div>';
    section.innerHTML=hdr+'<div style="padding:14px;color:var(--ink3);font-size:13px">Hleð…</div>';

    var co=getCompany(coId);
    var kt = co ? co.kennitala : await ktForCoId(coId);
    var baseId = kt ? await baseIdForKt(kt) : null;
    var docs = baseId ? await fetchDocs(baseId) : [];
    if(baseId && kt) docs = await filterDocsToLocation(docs, kt, coId);
    var payday = kt ? await fetchPayday(kt) : [];
    var srcByNum = kt ? await fetchSolurSrc(kt) : {};

    // ── group customer_documents per year/type ──
    // 2026-07-21 (Agnar): brunakerfi (eldvarnakerfi) er ÖNNUR þjónusta en
    // slökkvitæki — sami staður getur haft báðar. Áður lentu þær í SÖMU
    // úttektarskýrslu-dálknum og litu út eins og tvítök/rugl. Nú AÐSKILDAR:
    // repByY = slökkvitæki-úttektir, bruByY = brunakerfi-skoðanir.
    var repByY={}, bruByY={}, invByY={}, pdByY={}, samn=[];
    payday.forEach(function(p){ var y=pdYear(p); if(y>=2000&&y<=NOW+1) (pdByY[y]=pdByY[y]||[]).push(p); });
    docs.forEach(function(d){
      var t=d.doc_type, y=parseInt(d.year,10);
      if(t==='samningur'){ samn.push({src:'doc',d:d,year:y||null}); return; }
      if(!(y>=2000&&y<=NOW+1)) return;
      if(t==='brunakerfi') (bruByY[y]=bruByY[y]||[]).push(d);
      else if(t==='uttektarskyrsla') (repByY[y]=repByY[y]||[]).push(d);
      else if(t==='reikningur') (invByY[y]=invByY[y]||[]).push(d);
    });

    // ── merge manual attachments (company_attachments) ──
    var atts=attList(coId), other=[];
    atts.forEach(function(a){
      var k=attKind(a), y=parseInt(attYear(a),10);
      if(k==='samningur'){ samn.push({src:'att',a:a,year:y||null}); return; }
      if(k==='other' || !(y>=2000&&y<=NOW+1)){ other.push(a); return; }
      if(k==='skyrsla') (repByY[y]=repByY[y]||[]).push({_att:a});
      else if(k==='reikningur') (invByY[y]=invByY[y]||[]).push({_att:a});
    });

    // ── merge reikningur-sölur beint úr solur (sömu og í Kröfu yfirliti) ──
    // 2026-07-21 (Agnar): reikningar sem sjást í Kröfu yfirliti (solur með
    // greitt_med='reikningur') vantaði á prófílinn ef þeir voru ekki skráðir í
    // customer_documents. Sækjum þá beint eftir kt og skeytum inn — afrit
    // (sama R-númer) sleppt. Opnast gegnum sömu sölu-leið (data-invopen).
    var solInv = kt ? await fetchSolurInvoices(kt, coId) : [];
    if(solInv.length){
      var haveInv={};
      Object.keys(invByY).forEach(function(y){ (invByY[y]||[]).forEach(function(x){
        var k=x.invoice_number?numKey(x.invoice_number):(x._att?numKey(chipInvNum(x)):''); if(k) haveInv[k]=1;
      }); });
      solInv.forEach(function(s){
        var k=numKey(s.num); if(!k||haveInv[k]) return; haveInv[k]=1;
        var y=parseInt(String(s.created_at||'').slice(0,4),10);
        if(!(y>=2000&&y<=NOW+1)) return;
        (invByY[y]=invByY[y]||[]).push({ invoice_number:s.num, amount:s.samtals, doc_date:s.created_at, _fromSolur:true });
      });
    }

    // ── year set: every year with anything + the current year, newest first ──
    var ySet={}; ySet[NOW]=1;
    Object.keys(repByY).forEach(function(y){ySet[y]=1;});
    Object.keys(bruByY).forEach(function(y){ySet[y]=1;});
    Object.keys(invByY).forEach(function(y){ySet[y]=1;});
    Object.keys(pdByY).forEach(function(y){ySet[y]=1;});
    var YEARS=Object.keys(ySet).map(Number).sort(function(a,b){return b-a;});

    // ── status pills ──
    var pills=YEARS.map(function(y){ return pill(y, (repByY[y]||[]).length>0, fcIs(coId,y)); }).join('');

    // ── samningur strip ──
    samn.sort(function(a,b){return (b.year||0)-(a.year||0);});
    var samnHtml = samn.map(function(s){
      if(s.src==='doc'){ var u=docUrl(s.d); var lab='Samningur'+(s.year?(' '+s.year):'');
        return docWrap(u?'<a class="sk-doc rep" href="'+esc(u)+'" target="_blank" rel="noopener">📑 '+esc(lab)+'</a>':'<span class="sk-doc rep">📑 '+esc(lab)+'</span>', s.d.id); }
      return '<button type="button" class="sk-doc rep" data-att="'+esc(s.a.id)+'" title="'+esc(s.a.name)+'">📑 Samningur'+(s.year?(' '+s.year):'')+'</button>';
    }).join('') + addChip('samningur','','+ samningur');

    // ── year table rows ──
    // Every cell carries a manual attach button — a compact ＋ when docs already
    // exist (so a wrong/auto-indexed year can be corrected by hand), or the
    // full „vantar"/„+ skýrsla" prompt when empty.
    function repCell(y){
      var arr=repByY[y]||[];
      if(arr.length){ return arr.map(function(x){ return x._att?repAttChip(x._att):repDocChip(x); }).join('')+addChip('skyrsla',y,'＋'); }
      if(y===NOW) return '<span class="sk-doc prog" title="Skoðun ársins ekki enn skjalfest">⏳ Í vinnslu</span>'+addChip('skyrsla',y,'+ skýrsla');
      return addChip('skyrsla',y,'vantar');
    }
    // Brunakerfi-dálkur (eldvarnakerfi) — aðskilinn frá slökkvitæki-úttektum.
    function bruCell(y){
      var arr=bruByY[y]||[];
      if(arr.length){ return arr.map(function(x){ return x._att?repAttChip(x._att):repDocChip(x); }).join(''); }
      return '<span style="color:var(--ink4);font-size:11px">—</span>';
    }
    function invCell(y){
      var arr=invByY[y]||[], pd=pdByY[y]||[];
      // Flokka reikningana: 🧯 Úttekt (úr ársskoðun) vs 🧾 Afgreiðsla (POS/Sótt);
      // Payday-kröfur í sínum eigin hóp (uppruni óviss). Aðeins hópar með innihald.
      var utt=[], afg=[];
      arr.forEach(function(x){ (chipInvSrc(x,srcByNum)==='afgr'?afg:utt).push(x); });
      var chip=function(x){ return x._att?invAttChip(x._att):invDocChip(x, srcByNum); };
      var uttChips=utt.map(chip).join(''), afgChips=afg.map(chip).join(''), pdChips=pd.map(pdChip).join('');
      var groups='';
      if(uttChips) groups+=invGroup('🧯 Úttekt','#b45309','#fff7ed','#fed7aa',uttChips);
      if(afgChips) groups+=invGroup('🧾 Afgreiðsla','#1e40af','#eff6ff','#bfdbfe',afgChips);
      if(pdChips)  groups+=invGroup('💳 Payday','#6d28d9','#f5f3ff','#ddd6fe',pdChips);
      if(groups) return groups+addChip('reikningur',y,'＋');
      if(y===NOW) return addChip('reikningur',y,'+ reikningur');
      return addChip('reikningur',y,'vantar');
    }
    // 📧 Senda-dálkur: hnappur á ári sem á skýrslu og/eða reikning. Geymum
    // ársgögnin á section svo wire()-smellurinn byggi viðhengin (async) þá.
    section._repByY = repByY; section._invByY = invByY; section._sendCo = { coId: coId, kt: kt, nafn: (co && co.nafn) || '' };
    function sendCell(y){
      var hasRep=(repByY[y]||[]).length, hasInv=(invByY[y]||[]).length;
      if(!hasRep && !hasInv) return '';
      return '<button type="button" class="sk-doc _sk-send" data-send-year="'+y+'" title="Senda úttektarskýrslu og/eða reikning '+y+' í tölvupósti" style="border-color:#99f6e4;color:#0f766e">📧 Senda</button>';
    }
    section._bruByY = bruByY;
    var rows=YEARS.map(function(y){
      var cur=(y===NOW); var ok=fcIs(coId,y);
      var ycls='sk-yr'+(ok?' sk-yr-ok':'')+(cur&&!ok?' sk-yr-now':'');
      return '<tr><td class="'+ycls+'" data-yr="'+y+'" title="Tvísmelltu til að staðfesta fact-check '+y+'">'+(ok?'✓ ':'')+y+'</td>'+
        '<td>'+repCell(y)+'</td>'+
        '<td>'+bruCell(y)+'</td>'+
        '<td>'+invCell(y)+'</td>'+
        '<td>'+sendCell(y)+'</td></tr>';
    }).join('');

    // ── önnur viðhengi strip ──
    var otherHtml = (other.length
      ? other.map(function(a){ var ic=/\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(a.name)?'🖼':(/\.pdf$/i.test(a.name)?'📄':'📎');
          return '<span class="sk-att-wrap"><button type="button" class="sk-doc prog" data-att="'+esc(a.id)+'" title="'+esc(a.name)+'">'+ic+' '+esc(a.name.length>22?a.name.slice(0,20)+'…':a.name)+'</button>'+
                 '<button type="button" class="sk-att-x" data-del="'+esc(a.id)+'" title="Eyða viðhengi">✕</button></span>'; }).join('')
      : '') + addChip('', '', '+ Viðhengi');

    var notLinked = !baseId ? '<div class="sk-strip" style="color:var(--ink4);font-size:11.5px">Ekki enn tengt grunnskrá (customers_base)'+(kt?(' · kt '+esc(dash(kt))):'')+' — sjálfvirkar skýrslur birtast þegar tengt.</div>' : '';

    // Quick jump to the Brunahólf Skýrslu-stöð for THIS company (same customers_base
    // across both apps) to fix a report/invoice matched to the wrong site or year.
    var fixLink = baseId ? '<div class="sk-strip" style="justify-content:flex-end"><a href="https://brunaholf.netlify.app/#bakendi/'+baseId+'" target="_blank" rel="noopener" style="font-size:11.5px;font-weight:700;color:var(--ink3);text-decoration:none" title="Laga pörun skýrslna/reikninga við staði í Brunahólf">🔗 Laga pörun í Brunahólf →</a></div>' : '';

    section.innerHTML = hdr +
      '<div class="sk-strip"><div class="sk-strip-l">📊 Staða eftir ári</div><div class="sk-strip-r">'+ (pills||'<span style="color:var(--ink4);font-size:12px">engin gögn</span>') +'</div></div>'+
      '<div class="sk-strip"><div class="sk-strip-l">📑 Þjónustusamningur</div><div class="sk-strip-r">'+samnHtml+'</div></div>'+
      '<div class="sk-gridwrap"><table class="sk-grid"><thead><tr><th>Ár</th><th>🧯 Slökkvitæki</th><th>🔥 Brunakerfi</th><th>Reikningur</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
      '<div class="sk-strip"><div class="sk-strip-l">📎 Önnur viðhengi</div><div class="sk-strip-r">'+otherHtml+'</div></div>'+
      notLinked + fixLink;
  }

  function wire(section){
    // Tvísmella á árið → staðfesta/afturkalla fact-check ársins.
    section.addEventListener('dblclick', function(e){
      var td=e.target.closest && e.target.closest('.sk-yr'); if(!td) return;
      var coId=+section.dataset.coId; var y=+td.getAttribute('data-yr'); if(!coId||!y) return;
      e.preventDefault(); fcToggle(coId,y); render(section, coId);
    });
    section.addEventListener('click', async function(e){
      var coId=+section.dataset.coId; if(!coId) return;

      // 📧 Senda — opnar póst-ritilinn (patch 254) með hökum fyrir úttektarskýrslu
      // og reikning ársins + breytanlegan staðlaðan texta. Sent gegnum Gmail.
      var sendEl=e.target.closest('[data-send-year]');
      if(sendEl){
        e.preventDefault();
        if(!(window.ReceiptSender && ReceiptSender.compose)){ alert('Póst-ritillinn hlóðst ekki — endurhladdu síðunni.'); return; }
        var y=sendEl.getAttribute('data-send-year');
        var rep=(section._repByY && section._repByY[y]||[])[0];
        var inv=(section._invByY && section._invByY[y]||[])[0];
        var meta=section._sendCo||{}; var nafn=meta.nafn||'';
        // Netfang forfyllt af fyrirtækinu (má breyta í glugganum).
        var email=''; try{ var sb=SB(); if(sb && meta.coId){ var er=await sb.from('fyrirtaeki').select('netfang').eq('id', meta.coId).maybeSingle(); if(er&&er.data&&er.data.netfang) email=String(er.data.netfang).trim(); } }catch(_){}
        var choices=[];
        if(rep) choices.push({ label:'Úttektarskýrsla '+y, checked:true, build:function(){ return entryAttachment(rep,'Úttektarskýrsla '+y+'.pdf'); } });
        if(inv) choices.push({ label:'Reikningur '+y, checked:true, build:function(){ return entryAttachment(inv,'Reikningur '+y+'.pdf'); } });
        ReceiptSender.compose({
          title:'Senda — '+nafn,
          to:email,
          subject:'Úttektarskýrsla og reikningur '+y+' — Slökkvitæki ehf',
          bodyText:ReceiptSender.standardText('skyrsla', { nafn:nafn, ar:y }),
          attachmentChoices:choices,
        });
        return;
      }

      var pickEl=e.target.closest('[data-pick]');
      if(pickEl){
        e.preventDefault();
        if(!(window.CompanyAttachments&&CompanyAttachments.pick)){ alert('Skjalakerfi ekki tilbúið — endurhladdu síðunni.'); return; }
        var kind=pickEl.getAttribute('data-kind')||undefined;
        var year=pickEl.getAttribute('data-year')||undefined;
        await CompanyAttachments.pick(coId, {year:year, kind:kind});
        render(section, coId);
        return;
      }
      var delEl=e.target.closest('[data-del]');
      if(delEl){
        e.preventDefault();
        var id=delEl.getAttribute('data-del');
        var f=attList(coId).find(function(x){return x.id===id;});
        if(!f) return;
        var ok = (window.Confirm&&Confirm.show) ? await Confirm.show('Eyða viðhengi „'+f.name+'"?') : window.confirm('Eyða viðhengi „'+f.name+'"?');
        if(ok){ await CompanyAttachments.delete(coId, f); render(section, coId); }
        return;
      }
      // Delete a customer_documents entry (wrong name / wrong year). Removes the
      // record from the page; the underlying Drive file is left in Drive.
      var delDoc=e.target.closest('[data-deldoc]');
      if(delDoc){
        e.preventDefault();
        var did=delDoc.getAttribute('data-deldoc');
        var ok2 = (window.Confirm&&Confirm.show) ? await Confirm.show('Eyða þessari skráningu af síðunni?\n(skjalið sjálft helst í Google Drive)') : window.confirm('Eyða þessari skráningu af síðunni?');
        if(ok2){ var sb=SB(); if(sb){ try{ await sb.from('customer_documents').delete().eq('id', did); }catch(err){ alert('Villa við eyðingu: '+(err.message||err)); } } render(section, coId); }
        return;
      }
      var attEl=e.target.closest('[data-att]');
      if(attEl){
        e.preventDefault();
        var aid=attEl.getAttribute('data-att');
        var a=attList(coId).find(function(x){return x.id===aid;});
        if(a&&window.CompanyAttachments&&CompanyAttachments.openPreview) CompanyAttachments.openPreview(a);
        return;
      }
      // Skjalalaus reikningsskráning sem á sölu-röð (t.d. R-000419) → opna
      // reikninginn í innbyggðu yfirlagi (iframe) beint úr sölunni (sama mót og
      // „Prenta aftur" í Kröfu yfirliti) — ekki window.open (fór út úr appinu á síma).
      var invEl=e.target.closest('[data-invopen]');
      if(invEl){
        e.preventDefault();
        var num=invEl.getAttribute('data-invopen');
        try{
          var sb=SB(); if(!sb) throw new Error('engin gagnatenging');
          var rs=await sb.from('solur').select('*').eq('num', num).limit(1);
          var sale=rs&&rs.data&&rs.data[0];
          if(!sale) throw new Error('salan '+num+' fannst ekki í Sölu');
          if(!(window.SalaInvoice&&SalaInvoice.renderFromSale)) throw new Error('reikningsmótið er ekki tiltækt');
          var co=getCompany(coId);
          openInvoiceOverlay(num, function(iwin){
            SalaInvoice.renderFromSale(iwin, sale, {
              kennitala: (co&&co.kennitala)||sale.customer_kt||'',
              heimilisfang: (co&&co.heimilisfang)||''
            });
          });
        }catch(err){
          alert('Gat ekki opnað reikninginn: '+(err&&err.message||err));
        }
        return;
      }
    });
  }

  function inject(){
    var main=document.getElementById('companies-main'); if(!main) return;
    var coId=getCompanyId(); if(!coId) return;
    var existing=main.querySelector('._dyg-section');
    if(existing){ if(String(existing.dataset.coId)!==String(coId)){ existing.dataset.coId=coId; render(existing,coId); } return; }
    var section=document.createElement('div');
    section.className='_dyg-section sk-card';
    section.dataset.coId=coId;
    wire(section);
    // Place at the bottom of the detail (after pricing / cost sections).
    var cat=main.querySelector('._cat-section');
    if(cat) main.insertBefore(section, cat); else main.appendChild(section);
    render(section, coId);
  }

  var _t=0;
  var mo=new MutationObserver(function(){ clearTimeout(_t); _t=setTimeout(inject, 500); });
  (function start(){ var main=document.getElementById('companies-main'); if(!main){ setTimeout(start,800); return; } mo.observe(main,{childList:true}); inject(); })();
  // Re-render when a manual attachment is added/changed (patch 111 dispatches this).
  document.addEventListener('attachment-year-changed', function(){
    var s=document.querySelector('._dyg-section'); if(s) render(s, +s.dataset.coId);
  });

  if(!document.getElementById('sk-card-css')){
    var css=[
      '.sk-card{background:var(--surface);border:1px solid var(--brd);border-radius:14px;margin:14px 0;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,.04)}',
      '.sk-h{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 15px;border-bottom:1px solid var(--brd)}',
      '.sk-h h3{margin:0;font-size:15px;font-weight:800;color:var(--ink1);display:flex;align-items:center;gap:8px}',
      '.sk-add-btn{font-size:12px;font-weight:700;border:1px solid #1e3a8a;background:linear-gradient(180deg,#60a5fa 0%,#2563eb 48%,#1e40af 52%,#1e3a8a 100%);color:#fff;border-radius:8px;padding:7px 13px;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.32),inset 0 -1px 0 rgba(0,0,0,.35),0 1px 2px rgba(0,0,0,.25);text-shadow:0 1px 1px rgba(0,0,0,.4)}',
      '.sk-strip{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:11px 14px;border-top:1px solid var(--brd2,#f1f5f9)}',
      '.sk-strip-l{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--ink3);min-width:148px}',
      '.sk-strip-r{display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1}',
      '.sk-doc{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:4px 10px;border-radius:8px;border:1px solid;cursor:pointer;margin:2px 4px 2px 0;text-decoration:none;font-family:inherit;line-height:1.2}',
      '.sk-doc.rep{background:var(--surface2);color:#0f172a;border-color:var(--brd)}',
      '.sk-doc.inv{background:#f0fdf4;color:#15803d;border-color:#bbf7d0}',
      '.sk-doc.pd{background:#f5f3ff;color:#6d28d9;border-color:#ddd6fe;cursor:default}',
      '.sk-doc.prog{background:#fef3c7;color:#92400e;border-color:#fcd34d;font-weight:700}',
      '.sk-doc.add{background:var(--surface);color:var(--ink4);border:1px dashed var(--brd2);font-weight:600}',
      '.sk-doc.add:hover{color:var(--brand);border-color:var(--brand)}',
      '.sk-att-wrap{display:inline-flex;align-items:center;margin:2px 4px 2px 0}',
      '.sk-att-wrap .sk-doc{margin:0}',
      '.sk-att-x{border:1px solid var(--brd);border-left:0;background:var(--surface);color:var(--ink4);cursor:pointer;font-size:10px;padding:4px 6px;border-radius:0 8px 8px 0;line-height:1.2}',
      '.sk-att-x:hover{color:#dc2626;border-color:#fecaca}',
      // Taflan má aldrei klippast af (.sk-card er overflow:hidden) — láta hana
      // skruna lárétt í eigin kassa svo Reikningur-dálkurinn tapist ekki á síma.
      '.sk-gridwrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -2px}',
      '.sk-grid{width:100%;border-collapse:collapse;font-size:12.5px}',
      '.sk-grid th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink3);font-weight:700;padding:7px 10px;text-align:left;background:var(--bg);white-space:nowrap}',
      '.sk-grid td{padding:5px 10px;border-top:1px solid var(--brd2,#f1f5f9);vertical-align:middle}',
      '.sk-grid td:first-child{font-weight:700;color:var(--ink1);width:56px;white-space:nowrap}',
      // Skjala-chippar: fast há, þjöppuð leturstærð (yfirskrifar Brunastál-skinnið)
      // + stytting með … svo löng skráarnöfn víkki ekki töfluna endalaust.
      '.sk-card .sk-doc{font-size:11.5px!important;line-height:1.2!important;padding:4px 9px!important;max-width:min(52vw,230px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.sk-card .sk-doc.add{max-width:none}',
      '.sk-pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:3px 11px;border-radius:99px;border:1px solid var(--brd);background:var(--surface);color:var(--ink4);font-variant-numeric:tabular-nums}',
      '.sk-pill::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--hairline)}',
      '.sk-pill.ok{border-color:#bbf7d0;background:#f0fdf4;color:#15803d}.sk-pill.ok::before{background:#15803d}',
      '.sk-pill.now{border-color:var(--brd);background:var(--surface2);color:var(--brand)}.sk-pill.now::before{background:var(--brand)}',
      '.sk-pill.none{opacity:.55}',
      // Glóandi grænn = handvirkt fact-checkað ár.
      '.sk-pill.done{border-color:#16a34a;background:#dcfce7;color:#14532d;box-shadow:0 0 0 1px rgba(22,163,74,.25)}',
      '.sk-pill.done::before{background:#16a34a;box-shadow:0 0 6px 1.5px rgba(22,163,74,.9);animation:sk-glow 1.6s ease-in-out infinite}',
      '@keyframes sk-glow{0%,100%{box-shadow:0 0 5px 1px rgba(22,163,74,.75)}50%{box-shadow:0 0 8px 2.5px rgba(22,163,74,1)}}',
      // Ár-reitur er tvísmellanlegur.
      '.sk-grid td.sk-yr{cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation}',
      '.sk-grid td.sk-yr-now{color:var(--brand)}',
      '.sk-grid td.sk-yr-ok{color:#15803d!important;font-weight:800}'
    ].join('\n');
    var st=document.createElement('style'); st.id='sk-card-css'; st.textContent=css; document.head.appendChild(st);
  }
  console.log('[patch-199] unified Skjöl & viðhengi card installed');
})();
/* === END DOC YEAR GRID === */
