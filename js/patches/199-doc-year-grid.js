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
    if(x.storage_path){
      // storage_path getur verið bucket-prefixed ('samningar/…' úr customer_documents,
      // t.d. brunakerfis-skýrslur) EÐA bucket-relative. getPublicUrl (patch 111) væntir
      // bucket-relative slóðar í `samningar` og skilar undirritaðri slóð sem gmail-send
      // nær í — klippum forskeytið af ef það er til staðar, föllum á opinbera slóð annars.
      var sp = String(x.storage_path).replace(/^samningar\//, '');
      if(getUrl){ var u2=await CompanyAttachments.getPublicUrl(sp); if(u2) return { filename: fallbackName, url:u2 }; }
      var su=storageUrl(x.storage_path); if(su) return { filename: fallbackName, url:su };
    }
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
  // 2026-08-05 (Agnar: "how in the hell can I fix this damn chaos in center" —
  // Miðgarður alone had 15 samningur rows, only 5 real): an earlier cleanup
  // sweep already flags copies via `is_duplicate`, but this card never read
  // that column — every "afrit" kept rendering as if it were a real document.
  // Fetch it here (so it's available to filter); the actual filtering happens
  // PER (year,type) GROUP further down (see dedupBucket) — NOT here, because
  // `is_duplicate` is also (mis)used to flag rows whose Drive link died and
  // needs re-finding ("dauður hlekkur... ÞARF AÐ FINNA AFTUR"), not just true
  // copies. Blindly dropping every flagged row would hide those years
  // entirely (0 left) instead of decluttering them — worse than the mess.
  async function fetchDocs(baseId){
    var sb=SB(); if(!sb||!baseId) return [];
    try{ var r=await sb.from('customer_documents').select('id,doc_type,year,drive_file_id,storage_path,invoice_number,amount,doc_date,notes,fyrirtaeki_id,is_duplicate').eq('customer_base_id', baseId);
      return r.data||[]; }catch(e){ return []; }
  }
  // Brunakerfis-skoðanir (doc_type='brunakerfi') eru lyklaðar á fyrirtaeki_id —
  // patch 273 skrifar customer_base_id NULL — svo base-leiðin (fetchDocs) nær þeim
  // EKKI þegar staðurinn er ekki tengdur grunnskrá. Sækjum þær beint eftir
  // fyrirtaeki_id svo brunakerfis-dálkurinn fyllist ALLTAF (líka fyrir ótengda staði).
  async function fetchBrunakerfiDocs(coId){
    var sb=SB(); if(!sb||!coId) return [];
    try{ var r=await sb.from('customer_documents')
        .select('id,doc_type,year,drive_file_id,storage_path,invoice_number,amount,doc_date,notes,fyrirtaeki_id,is_duplicate')
        .eq('fyrirtaeki_id', coId).eq('doc_type','brunakerfi');
      return r.data||[]; }catch(e){ return []; }
  }
  // Fjarlægja is_duplicate=true færslur úr EINUM (ár,þjónusta) hóp — EN AÐEINS
  // ef a.m.k. ein ómerkt (eða handvirkt viðhengi, sem ber aldrei þetta flagg)
  // stendur eftir. Annars stæði árið eftir með EKKERT í staðinn fyrir "óreiðu"
  // — sýnilegt-en-brotið er skárra en að láta líta út fyrir að skoðun vanti.
  function dedupBucket(arr){
    if(!arr || arr.length<2) return arr||[];
    var hasReal = arr.some(function(x){ return x._att || !x.is_duplicate; });
    if(!hasReal) return arr;
    return arr.filter(function(x){ return x._att || !x.is_duplicate; });
  }
  // samn er {src:'doc',d:...}/{src:'att',a:...} umbúðir, ekki hráar raðir —
  // sama regla, bara sótt gegnum s.d.is_duplicate (viðhengi bera aldrei flaggið).
  function dedupSamn(arr){
    if(!arr || arr.length<2) return arr||[];
    var isDup=function(s){ return s.src==='doc' && s.d && s.d.is_duplicate; };
    var hasReal = arr.some(function(s){ return !isDup(s); });
    if(!hasReal) return arr;
    return arr.filter(function(s){ return !isDup(s); });
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
  // ── document_pairs (Brunahólf's skýrsla<->reikningur bundle table) ─────────
  // 2026-08-05 (ósk Agnars: „auto generated bundle... but I want to create
  // bundle for other companies, that claude have difficulties connecting").
  // Read+write directly via the shared Supabase client — same project/anon
  // grants patch 253's "📦 Pör" band already uses, no new endpoint needed.
  // service_type is 'uttekt' (slökkvitæki) | 'brunakerfi' — NOT the app's own
  // doc_type spelling, see sql/2026-08-05_document_pairs.sql in Brunahólf.
  async function fetchPairs(baseId){
    var sb=SB(); if(!sb||!baseId) return [];
    try{ var r=await sb.from('document_pairs').select('id,year,service_type,report_doc_id,invoice_doc_id,solur_id,status,matched_by').eq('customer_base_id', baseId);
      return r.data||[]; }catch(e){ return []; }
  }
  async function savePair(baseId, year, serviceType, patch){
    var sb=SB(); if(!sb||!baseId) return;
    try{
      await sb.from('document_pairs').upsert(Object.assign({
        customer_base_id: baseId, year: +year, service_type: serviceType, updated_at: new Date().toISOString(),
      }, patch), { onConflict: 'customer_base_id,year,service_type' });
    }catch(e){ /* best-effort — the live render already shows the pairing either way */ }
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
  // 2026-07-29 (Agnar: „hún kom inn í slökkvitækja 2026 reitinn"): BRUNAKERFIS-
  // skýrslan var líka vistuð sem viðhengi með kind:'skyrsla' (patch 273) — sama
  // tegund og slökkvitækjaskýrslan. customer_documents er aðskilið eftir doc_type
  // hér að neðan, EN viðhengin bera bara `kind`, svo aðskilnaðurinn tapaðist við
  // samruna þeirra og brunaskýrslan fyllti úttektarskýrslu-reit ársins.
  // Nú fær brunakerfið sína eigin tegund. Skrárheitið er notað sem varaleið
  // fyrir viðhengin sem þegar eru vistuð með gamla kind-inu — patch 273 smíðar
  // heitið alltaf sem „… - brunakerfi-skoðunarskýrsla.pdf".
  function attKind(a){
    var nm=String(a.name||'');
    if(a.kind==='brunakerfi') return 'brunakerfi';
    if(/brunakerfi[\s-]*sko(ð|d)unarsk(ý|y)rsl/i.test(nm)) return 'brunakerfi';
    if(a.kind==='skyrsla'||a.kind==='reikningur'||a.kind==='samningur') return a.kind;
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

  function pill(y, hasReport, fcStat, note){
    var cls=hasReport?'ok':(y===NOW?'now':'none');
    if(fcStat==='human') cls+=' done'; else if(fcStat==='claude') cls+=' claude'; else if(fcStat==='gap') cls+=' gap';
    var tip=fcStat==='human'?(y+' — ✓ staðfest handvirkt')
      :fcStat==='claude'?(y+' — 🔵 Claude yfirfór'+(note?(': '+note):'')+' — tvísmelltu til að staðfesta')
      :fcStat==='gap'?(y+' — 🟠 '+(note||'skýrsla vantar')+' — tvísmelltu til að fjarlægja flagg')
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

  // ── Fact-check per (fyrirtæki, ár) — TVÖ STIG ───────────────────────────────
  // Geymt í Supabase-töflunni `year_factcheck` (co_id,year,status,note) svo bæði
  // Claude (skrifar 'claude' = BLÁR forskoðaður) OG skrifstofan (tvísmellir →
  // 'human' = GLÓANDI GRÆNN staðfestur) deili sama ástandi milli tækja.
  //   • 'claude' = Claude yfirfór, lítur rétt út → bíður mannlegrar staðfestingar
  //   • 'human'  = skrifstofan tvítékkaði og staðfesti
  // Patch 187 (listinn) les sömu töflu og sýnir bláan/grænan depil.
  var _fc = {};              // co_id → { year(str) → {status, note} }
  function fcStatus(coId,y){ var m=_fc[String(coId)]; var r=m&&m[String(y)]; return r?r.status:null; }
  function fcNote(coId,y){ var m=_fc[String(coId)]; var r=m&&m[String(y)]; return (r&&r.note)||''; }
  async function fcLoad(coId){
    var sb=SB(); if(!sb||!coId){ _fc[String(coId)]={}; return; }
    try{ var r=await sb.from('year_factcheck').select('year,status,note').eq('co_id',coId);
      var m={}; (r.data||[]).forEach(function(x){ m[String(x.year)]={status:x.status,note:x.note}; }); _fc[String(coId)]=m;
    }catch(_){ _fc[String(coId)]={}; }
  }
  async function fcSet(coId,y,status,note){
    var sb=SB(); if(!sb) return;
    try{ await sb.from('year_factcheck').upsert({co_id:coId, year:+y, status:status, note:(note||null), updated_at:new Date().toISOString()}, {onConflict:'co_id,year'});
      (_fc[String(coId)]=_fc[String(coId)]||{})[String(y)]={status:status,note:note||''};
      try{ document.dispatchEvent(new Event('attachment-year-changed')); }catch(_){}
    }catch(e){ alert('Villa við vistun: '+(e.message||e)); }
  }
  async function fcClear(coId,y){
    var sb=SB(); if(!sb) return;
    try{ await sb.from('year_factcheck').delete().eq('co_id',coId).eq('year',+y);
      if(_fc[String(coId)]) delete _fc[String(coId)][String(y)];
      try{ document.dispatchEvent(new Event('attachment-year-changed')); }catch(_){}
    }catch(e){ alert('Villa: '+(e.message||e)); }
  }
  // Tvísmella: 'human' → hreinsa · 'gap' → hreinsa (fjarlægja flagg) · annars
  // (blátt/ekkert) → 'human' (staðfesta).
  async function fcToggle(coId,y){
    var st=fcStatus(coId,y);
    if(st==='human'||st==='gap') await fcClear(coId,y); else await fcSet(coId,y,'human',null);
  }
  // Einu sinni: flytja gömlu AppSettings-grænin (patch #465) yfir í töfluna.
  (function migrateGreens(){
    try{
      if(localStorage.getItem('fc_migrated_v1')) return;
      var old=(window.AppSettings&&AppSettings.path&&AppSettings.path('year_factcheck'))||{};
      var sb=SB(); if(!sb){ return; } // reynt aftur síðar (næsta hleðsla)
      var rows=[]; Object.keys(old).forEach(function(co){ Object.keys(old[co]||{}).forEach(function(yr){ if(old[co][yr]) rows.push({co_id:+co, year:+yr, status:'human'}); }); });
      localStorage.setItem('fc_migrated_v1','1');
      if(rows.length) sb.from('year_factcheck').upsert(rows,{onConflict:'co_id,year'}).then(function(){},function(){});
    }catch(_){}
  })();

  async function render(section, coId){
    var hdr='<div class="sk-h"><h3>📁 Skjöl &amp; viðhengi</h3>'+
            '<button type="button" class="sk-add-btn" data-pick="1">+ Viðhengi</button></div>';
    section.innerHTML=hdr+'<div style="padding:14px;color:var(--ink3);font-size:13px">Hleð…</div>';

    var co=getCompany(coId);
    var kt = co ? co.kennitala : await ktForCoId(coId);
    await fcLoad(coId);
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
      if(k==='brunakerfi') (bruByY[y]=bruByY[y]||[]).push({_att:a});
      else if(k==='skyrsla') (repByY[y]=repByY[y]||[]).push({_att:a});
      else if(k==='reikningur') (invByY[y]=invByY[y]||[]).push({_att:a});
    });

    // ── brunakerfis-skoðanir beint eftir fyrirtaeki_id ──
    // Tryggir að brunakerfis-skýrslan lendi í RÉTTUM dálki (🔥) líka þegar
    // staðurinn er ekki tengdur customers_base (þá skilar fetchDocs engu).
    var bruDocs = await fetchBrunakerfiDocs(coId);
    bruDocs.forEach(function(d){
      var y=parseInt(d.year,10); if(!(y>=2000&&y<=NOW+1)) return;
      var dup=(bruByY[y]||[]).some(function(x){ return !x._att && x.id===d.id; });
      if(!dup) (bruByY[y]=bruByY[y]||[]).push(d);
    });

    // Brunakerfis-skýrslan er vistuð TVISVAR viljandi (customer_documents fyrir
    // yfirlitin + viðhengi fyrir skjalaspjaldið, sjá patch 273). Nú þegar báðar
    // lenda í sama dálki þarf að fella afritið burt: raunverulega skjalaröðin
    // er kanónísk, viðhengið víkur fyrir henni innan ársins.
    Object.keys(bruByY).forEach(function(y){
      var arr = bruByY[y] || [];
      if (arr.some(function(x){ return !x._att; })) {
        bruByY[y] = arr.filter(function(x){ return !x._att; });
      }
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

    // ── fella burt is_duplicate=true úr hverjum (ár,þjónusta) hóp, sjá dedupBucket ──
    [repByY, bruByY, invByY].forEach(function(byY){
      Object.keys(byY).forEach(function(y){ byY[y] = dedupBucket(byY[y]); });
    });
    samn = dedupSamn(samn);

    // ── Payday greitt/ógreitt-staða per reikningsnúmer (bara sýnt þegar öruggt
    // er hvaða Payday-krafa svarar til hvers reiknings — annars sleppt frekar
    // en giskað, sama regla og annars staðar í þessari skrá) ──
    var paydayByNum={};
    payday.forEach(function(p){
      [p.reference, p.number].forEach(function(v){ var k=numKey(v); if(k && !paydayByNum[k]) paydayByNum[k]=p; });
    });
    function paydayStatusFor(inv){
      var k = inv && (inv.invoice_number?numKey(inv.invoice_number):numKey(chipInvNum(inv)));
      var p = k && paydayByNum[k]; if(!p) return null;
      return { paid: !!p.paid_date, dueDate: p.due_date||null };
    }

    // ── document_pairs (durable bundle store — sjá savePair) ──
    var pairs = baseId ? await fetchPairs(baseId) : [];
    var pairsByYear={};
    pairs.forEach(function(pr){ (pairsByYear[pr.year]=pairsByYear[pr.year]||{})[pr.service_type]=pr; });

    // ── year set: every year with anything + the current year, newest first ──
    var ySet={}; ySet[NOW]=1;
    Object.keys(repByY).forEach(function(y){ySet[y]=1;});
    Object.keys(bruByY).forEach(function(y){ySet[y]=1;});
    Object.keys(invByY).forEach(function(y){ySet[y]=1;});
    Object.keys(pdByY).forEach(function(y){ySet[y]=1;});
    var YEARS=Object.keys(ySet).map(Number).sort(function(a,b){return b-a;});

    // ── status pills ──
    var pills=YEARS.map(function(y){ return pill(y, (repByY[y]||[]).length>0, fcStatus(coId,y), fcNote(coId,y)); }).join('');

    // ── samningur strip ──
    // 2026-08-05 (Agnar: „hefur hunsað öll endurnefndu skjölin"): samningur-raðir
    // í customer_documents bera ALLTAF year=NULL (CHECK-reglan customer_
    // documents_year_shape krefst þess) — svo „Samningur "+s.year sýndi ALDREI
    // neitt greinandi, sama hvað notandinn endurnefndi skrána í (t.d. bætti
    // stofnárinu inn í skráarheitið sjálft, af því ártals-dálkurinn er lokaður
    // fyrir samninga). Sýnum núna alvöru skráarheitið (sama og docName() gerir
    // fyrir skýrslur) svo endurnefningin — þ.m.t. ár í heitinu — birtist loksins.
    function samnLabel(s){
      if(s.src==='doc'){ var nm=String(s.d.notes||'').replace(/\s*[·•]\s*kt\b.*$/i,'').trim(); return nm || 'Samningur'; }
      return String(s.a.name||'Samningur');
    }
    samn.sort(function(a,b){return (b.year||0)-(a.year||0);});
    var samnHtml = samn.map(function(s){
      var full=samnLabel(s), disp=full.length>46?full.slice(0,44)+'…':full;
      if(s.src==='doc'){ var u=docUrl(s.d);
        return docWrap(u?'<a class="sk-doc rep" href="'+esc(u)+'" target="_blank" rel="noopener" title="'+esc(full)+'">📑 '+esc(disp)+'</a>':'<span class="sk-doc rep" title="'+esc(full)+'">📑 '+esc(disp)+'</span>', s.d.id); }
      return '<button type="button" class="sk-doc rep" data-att="'+esc(s.a.id)+'" title="'+esc(full)+'">📑 '+esc(disp)+'</button>';
    }).join('') + addChip('samningur','','+ samningur');

    // ── per-year × per-service bundle cards (verkefnalisti mockup, 2026-08-05) ──
    // The newest year is expanded into two side-by-side service cards (🧯
    // Slökkvitæki / 🔥 Brunakerfi), each showing its skýrsla + linked reikningur
    // + payment status + a Senda button of its own. Older years collapse to one
    // compact line per service. „Bundle" = report+invoice showing as connected —
    // computed LIVE every render (never a stale cache), and persisted into
    // Brunahólf's `document_pairs` only when the link is unambiguous, so other
    // consumers (patch 253's Pör band) benefit too without ever risking a wrong
    // guess: ambiguous years (two reports, or several invoices) get a manual
    // „🔗 Tengja handvirkt" picker instead of a silent guess.
    var SERVICES=[
      { kind:'uttekt', label:'Slökkvitækjaþjónusta', icon:'🧯', repMap:repByY },
      { kind:'brunakerfi', label:'Brunakerfisþjónusta', icon:'🔥', repMap:bruByY },
    ];
    // Resolve once per (year, service) — stored pairing wins; else an
    // UNAMBIGUOUS 1 report + 1 invoice + no other active service that year is
    // auto-linked (and saved); otherwise left for the manual picker.
    var resolved={};
    YEARS.forEach(function(y){
      SERVICES.forEach(function(svc){
        var repArr=svc.repMap[y]||[];
        var otherArr=(svc.kind==='uttekt'?bruByY:repByY)[y]||[];
        var invArr=invByY[y]||[];
        var stored=pairsByYear[y]&&pairsByYear[y][svc.kind];
        var inv=null;
        if(stored&&stored.invoice_doc_id!=null){
          inv=invArr.find(function(x){ return !x._att && x.id===stored.invoice_doc_id; })||null;
        }
        var autoSave=false;
        if(!inv && repArr.length===1 && invArr.length===1 && otherArr.length===0){ inv=invArr[0]; autoSave=!stored; }
        var ambiguous = !inv && invArr.length>=1;
        if(autoSave && baseId){
          var rep=repArr[0];
          if(rep && inv && !rep._att && !inv._att && !inv._fromSolur && rep.id!=null && inv.id!=null){
            savePair(baseId, y, svc.kind, { report_doc_id: rep.id, invoice_doc_id: inv.id, status:'klarad', matched_by:'exact' });
          }
        }
        resolved[y+'|'+svc.kind]={ inv:inv, ambiguous:ambiguous, invCandidates:invArr };
      });
    });
    section._repByY = repByY; section._bruByY = bruByY; section._invByY = invByY;
    section._resolved = resolved; section._sendCo = { coId: coId, kt: kt, nafn: (co && co.nafn) || '' };

    function manualLinkHtml(y, svc, invArr){
      if(!invArr.length) return '';
      var opts=invArr.map(function(x,i){ var lab=invLabel(x.invoice_number||chipInvNum(x)); var amt=x.amount!=null?(' · '+fmtKrLoc(x.amount)+' kr'):''; return '<option value="'+i+'">'+esc(lab+amt)+'</option>'; }).join('');
      return '<span class="sk-link-wrap"><select class="sk-link-sel" data-link-sel="'+y+'|'+svc.kind+'"><option value="">— hvaða reikningur? —</option>'+opts+'</select>'+
        '<button type="button" class="sk-link-btn" data-link-save="'+y+'|'+svc.kind+'" disabled>🔗 Tengja</button></span>';
    }
    function svcInvHtml(y, svc, forCompact){
      var r=resolved[y+'|'+svc.kind];
      if(r.inv){
        var chip = r.inv._att?invAttChip(r.inv._att):invDocChip(r.inv, srcByNum);
        var st=paydayStatusFor(r.inv);
        var stBadge = st ? ('<span class="sk-svc-pay '+(st.paid?'ok':'due')+'">'+(st.paid?'✓ Greitt':'⚠ Ógreitt')+'</span>') : '';
        var amt = (!forCompact && r.inv.amount!=null) ? ('<span class="sk-svc-amt">'+fmtKrLoc(r.inv.amount)+' kr</span>') : '';
        return chip+stBadge+amt;
      }
      if(r.ambiguous) return manualLinkHtml(y, svc, r.invCandidates);
      return addChip('reikningur', y, y===NOW?'+ reikningur':'vantar');
    }
    function svcRepHtml(y, svc){
      var arr=svc.repMap[y]||[];
      if(arr.length) return arr.map(function(x){ return x._att?repAttChip(x._att):repDocChip(x); }).join('')+addChip('skyrsla',y,'＋');
      if(y===NOW) return '<span class="sk-doc prog" title="Skoðun ársins ekki enn skjalfest">⏳ Í vinnslu</span>'+addChip('skyrsla',y,'+ skýrsla');
      return addChip('skyrsla',y,'vantar');
    }
    function svcSendBtn(y, svc){
      var hasRep=(svc.repMap[y]||[]).length, r=resolved[y+'|'+svc.kind];
      if(!hasRep && !r.inv) return '';
      return '<button type="button" class="sk-svc-send" data-send-year="'+y+'" data-send-kind="'+svc.kind+'" title="Senda '+esc(svc.label)+' '+y+' í tölvupósti">📧 Senda</button>';
    }
    // 🔗 Brunakerfi þjónustusíða (patch 274) — sérhæft vinnusvæði með skoðunar-
    // skýrslu-forminu, búnaðarskránni og verðútreikningum. Þessi kortið hér er
    // yfirlitið; smellur opnar sérsíðuna í stað þess að endurbyggja hana hér
    // (Agnar 2026-08-05: "make them sepperate but still conected"). Sömu gögn
    // (customer_documents doc_type='brunakerfi') fæða báðar síðurnar.
    function svcWorkspaceLink(svc){
      if(svc.kind!=='brunakerfi') return '';
      return '<button type="button" class="sk-svc-ws" data-open-bkc="1" title="Opna sérhæfðu Brunakerfi þjónustusíðuna — skoðunarskýrslur, verð, búnaðarskrá">🔥 Þjónustusíða →</button>';
    }
    function svcCardExpanded(y, svc){
      var arr=svc.repMap[y]||[];
      var repRow = arr.length || y===NOW ? '<div class="sk-svc-row"><span class="sk-svc-tag">SKÝRSLA</span>'+svcRepHtml(y,svc)+'</div>' : '';
      var r=resolved[y+'|'+svc.kind];
      var invRow = (arr.length || r.inv || r.ambiguous) ? '<div class="sk-svc-row"><span class="sk-svc-tag inv">REIKN.</span>'+svcInvHtml(y,svc,false)+'</div>' : '';
      var wsLink=svcWorkspaceLink(svc);
      if(!repRow && !invRow) return '<div class="sk-svc-card sk-svc-empty"><div class="sk-svc-hd">'+svc.icon+' <b>'+esc(svc.label)+'</b>'+wsLink+'</div><div class="sk-svc-row">engin '+esc(svc.label.toLowerCase())+addChip('skyrsla',y,'+ skýrsla')+'</div></div>';
      return '<div class="sk-svc-card"><div class="sk-svc-hd">'+svc.icon+' <b>'+esc(svc.label)+'</b>'+svcSendBtn(y,svc)+wsLink+'</div>'+repRow+invRow+'</div>';
    }
    function svcCompact(y, svc){
      var arr=svc.repMap[y]||[], r=resolved[y+'|'+svc.kind];
      if(!arr.length && !r.inv && !r.ambiguous) return '<div class="sk-svc-compact sk-svc-empty">'+svc.icon+' engin '+esc(svc.label.toLowerCase())+'</div>';
      var repChip = arr.length ? (arr[0]._att?repAttChip(arr[0]._att):repDocChip(arr[0])) : addChip('skyrsla',y,'vantar');
      return '<div class="sk-svc-compact">'+svc.icon+' '+repChip+svcInvHtml(y,svc,true)+svcSendBtn(y,svc)+'</div>';
    }

    var yearBlocks=YEARS.map(function(y){
      var cur=(y===YEARS[0]); var st=fcStatus(coId,y);
      var ycls='sk-yr'+(st==='human'?' sk-yr-ok':st==='claude'?' sk-yr-claude':st==='gap'?' sk-yr-gap':'')+(cur&&!st?' sk-yr-now':'');
      var mark=st==='human'?'✓ ':st==='claude'?'🔵 ':st==='gap'?'🟠 ':'';
      var ttl=st==='claude'?('Claude yfirfór'+(fcNote(coId,y)?(': '+fcNote(coId,y)):'')+' — tvísmelltu til að staðfesta')
             :st==='gap'?((fcNote(coId,y)||'Skýrsla vantar')+' — tvísmelltu til að fjarlægja flagg')
             :('Tvísmelltu til að staðfesta fact-check '+y);
      var body = cur
        ? '<div class="sk-svc-grid">'+SERVICES.map(function(svc){return svcCardExpanded(y,svc);}).join('')+'</div>'
        : '<div class="sk-svc-compactrow">'+SERVICES.map(function(svc){return svcCompact(y,svc);}).join('')+'</div>';
      return '<div class="sk-yrblock"><div class="'+ycls+' sk-yr-label" data-yr="'+y+'" title="'+esc(ttl)+'">'+mark+y+'</div>'+body+'</div>';
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
      '<div class="sk-yrwrap">'+yearBlocks+
        '<div class="sk-yr-add"><button type="button" class="sk-doc add" data-add-yr-svc="1">+ ár / þjónusta</button>'+
        '<span class="sk-sub">skýrsla og reikningur parast sjálfkrafa eftir ári — nýjasta árið opið, eldri ár samanþjöppuð</span></div>'+
      '</div>'+
      '<div class="sk-strip"><div class="sk-strip-l">📎 Önnur viðhengi</div><div class="sk-strip-r">'+otherHtml+'</div></div>'+
      notLinked + fixLink;
  }

  function wire(section){
    // Tvísmella á árið → staðfesta/afturkalla fact-check ársins.
    section.addEventListener('dblclick', async function(e){
      var td=e.target.closest && e.target.closest('.sk-yr'); if(!td) return;
      var coId=+section.dataset.coId; var y=+td.getAttribute('data-yr'); if(!coId||!y) return;
      e.preventDefault(); await fcToggle(coId,y); render(section, coId);
    });
    section.addEventListener('click', async function(e){
      var coId=+section.dataset.coId; if(!coId) return;

      // 🔥 Þjónustusíða → opnar patch 274's sérhæfðu Brunakerfi-yfirlitssíðu
      // fyrirtækisins (skoðunarskýrsluform, verð, búnaðarskrá) — sama gögn,
      // sérhæfðara vinnusvæði. Aðskilið kort, ein-smells hlekkur á milli.
      var wsEl=e.target.closest('[data-open-bkc]');
      if(wsEl){
        e.preventDefault();
        if(window.BrunakerfiFyrirtaeki && BrunakerfiFyrirtaeki.open) BrunakerfiFyrirtaeki.open(coId);
        else alert('Brunakerfi þjónustusíðan hlóðst ekki — endurhladdu síðunni.');
        return;
      }

      // 📧 Senda — opnar póst-ritilinn (patch 254) með hökum fyrir úttektarskýrslu
      // og reikning ársins + breytanlegan staðlaðan texta. Sent gegnum Gmail.
      // Hver þjónustukort hefur SITT EIGIÐ Senda (data-send-kind) — sendir bara
      // þá skýrslu + reikninginn sem er tengdur ÞEIRRI þjónustu þetta ár, ekki
      // bæði slökkvitæki og brunakerfi í einu.
      var sendEl=e.target.closest('[data-send-year]');
      if(sendEl){
        e.preventDefault();
        if(!(window.ReceiptSender && ReceiptSender.compose)){ alert('Póst-ritillinn hlóðst ekki — endurhladdu síðunni.'); return; }
        var y=sendEl.getAttribute('data-send-year');
        var kind=sendEl.getAttribute('data-send-kind');
        var rep, bru, inv;
        if(kind==='brunakerfi'){
          bru=(section._bruByY && section._bruByY[y]||[])[0];
          inv=(section._resolved && section._resolved[y+'|brunakerfi'] && section._resolved[y+'|brunakerfi'].inv)||null;
        } else if(kind==='uttekt'){
          rep=(section._repByY && section._repByY[y]||[])[0];
          inv=(section._resolved && section._resolved[y+'|uttekt'] && section._resolved[y+'|uttekt'].inv)||null;
        } else {
          // fallback (shouldn't happen post-redesign, kept for safety)
          rep=(section._repByY && section._repByY[y]||[])[0];
          bru=(section._bruByY && section._bruByY[y]||[])[0];
          inv=(section._invByY && section._invByY[y]||[])[0];
        }
        var meta=section._sendCo||{}; var nafn=meta.nafn||'';
        // Netfang forfyllt af fyrirtækinu (má breyta í glugganum).
        var email=''; try{ var sb=SB(); if(sb && meta.coId){ var er=await sb.from('fyrirtaeki').select('netfang').eq('id', meta.coId).maybeSingle(); if(er&&er.data&&er.data.netfang) email=String(er.data.netfang).trim(); } }catch(_){}
        // Hakað val — notandinn velur hvað fer með (🧯 úttektarskýrsla ·
        // 🔥 brunakerfisskýrsla · 🧾 reikningur) og svo opnast venjulegi póst-glugginn.
        // Aðeins bjóða skjöl sem raunverulega leysast í PDF-skrá — annars myndi
        // hakað val hengja EKKERT (t.d. reikningur sem er aðeins solur-skráning án
        // PDF-skjals; hann er sendur af brunakerfis-/sölu-síðunni þar sem hann er teiknaður).
        var hasFile=function(x){ return x && ((x.drive_file_id && String(x.drive_file_id).indexOf('sb:')!==0) || x.storage_path || (x._att && x._att.path)); };
        var choices=[];
        if(hasFile(rep)) choices.push({ label:'🧯 Úttektarskýrsla '+y, checked:true, build:function(){ return entryAttachment(rep,'Úttektarskýrsla '+y+'.pdf'); } });
        if(hasFile(bru)) choices.push({ label:'🔥 Brunakerfisskýrsla '+y, checked:true, build:function(){ return entryAttachment(bru,'Brunakerfisskýrsla '+y+'.pdf'); } });
        if(hasFile(inv)) choices.push({ label:'🧾 Reikningur '+(inv&&inv.invoice_number?inv.invoice_number:y), checked:true, build:function(){ return entryAttachment(inv,'Reikningur '+y+'.pdf'); } });
        if(!choices.length){ alert('Engin PDF-skjöl til að senda fyrir '+y+'. Reikning sem er aðeins skráður í Sölu má senda af brunakerfis-/sölu-síðunni.'); return; }
        ReceiptSender.compose({
          title:'Senda — '+nafn,
          to:email,
          subject:(rep?'Úttektarskýrsla':bru?'Brunakerfisskýrsla':'Reikningur')+' '+y+' — Slökkvitæki ehf',
          bodyText:ReceiptSender.standardText(rep?'skyrsla':bru?'brunakerfi':'reikningur', { nafn:nafn, ar:y }),
          attachmentChoices:choices,
        });
        return;
      }

      // 🔗 Tengja handvirkt — ambiguous year (multiple invoices / reports that
      // year) where the auto-heuristic wouldn't guess confidently. Persists
      // into document_pairs with matched_by='manual' so it's a durable link
      // from here on, same as the auto-resolved case.
      var linkSaveEl=e.target.closest('[data-link-save]');
      if(linkSaveEl){
        e.preventDefault();
        var lk=linkSaveEl.getAttribute('data-link-save').split('|'), ly=+lk[0], lkind=lk[1];
        var sel=section.querySelector('[data-link-sel="'+lk[0]+'|'+lkind+'"]');
        var idx=sel && sel.value!=='' ? +sel.value : null;
        if(idx==null) return;
        var invArr=(section._resolved && section._resolved[ly+'|'+lkind] && section._resolved[ly+'|'+lkind].invCandidates)||[];
        var inv=invArr[idx]; if(!inv) return;
        var repArr=(lkind==='brunakerfi'?section._bruByY:section._repByY)[ly]||[];
        var rep=repArr[0];
        var baseId=null; try{ var k=(getCompany(coId)||{}).kennitala; baseId=k?await baseIdForKt(k):null; }catch(_){}
        if(!baseId){ alert('Fyrirtækið er ekki tengt grunnskrá (customers_base) — hægt er að laga pörun í Brunahólf í staðinn.'); return; }
        linkSaveEl.disabled=true; linkSaveEl.textContent='Vista…';
        await savePair(baseId, ly, lkind, { report_doc_id: (rep&&!rep._att)?rep.id:null, invoice_doc_id: (inv&&!inv._att&&!inv._fromSolur)?inv.id:null, status:'klarad', matched_by:'manual' });
        render(section, coId);
        return;
      }
      // + ár / þjónusta — bæta við skýrslu/reikningi fyrir ár eða þjónustu sem
      // ekki er þegar í listanum (t.d. brunakerfisþjónusta sem er nýhafin).
      var addYrSvc=e.target.closest('[data-add-yr-svc]');
      if(addYrSvc){
        e.preventDefault();
        var yStr=prompt('Fyrir hvaða ár?', String(NOW)); if(!yStr) return;
        var yNum=parseInt(yStr,10); if(!(yNum>=2000&&yNum<=NOW+1)){ alert('Ógilt ár'); return; }
        var svcAns=prompt('Þjónusta:\n1 = Slökkvitækjaþjónusta\n2 = Brunakerfisþjónusta\n\n1 eða 2:', '1');
        var svcKind = svcAns==='2' ? 'brunakerfi' : 'skyrsla';
        if(!(window.CompanyAttachments&&CompanyAttachments.pick)){ alert('Skjalakerfi ekki tilbúið — endurhladdu síðunni.'); return; }
        await CompanyAttachments.pick(coId, { year:String(yNum), kind:svcKind });
        render(section, coId);
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
    // Enable the "🔗 Tengja" button only once an invoice is actually picked
    // in its neighbouring <select> (both live in the same .sk-link-wrap).
    section.addEventListener('change', function(e){
      var sel=e.target.closest && e.target.closest('[data-link-sel]'); if(!sel) return;
      var btn=sel.parentElement && sel.parentElement.querySelector('[data-link-save]');
      if(btn) btn.disabled = (sel.value==='');
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
      // ── per-year bundle cards (replaces the old flat table, 2026-08-05) ──
      '.sk-yrwrap{padding:2px 14px 12px}',
      '.sk-yrblock{border-top:1px solid var(--brd2,#f1f5f9);padding:10px 0}',
      '.sk-yrblock:first-child{border-top:0}',
      '.sk-yr-label{display:inline-block;font-weight:800;color:var(--ink1);font-size:13px;margin-bottom:6px;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation}',
      '.sk-yr-label.sk-yr-now{color:var(--brand)}',
      '.sk-yr-label.sk-yr-ok{color:#15803d!important}',
      '.sk-yr-label.sk-yr-claude{color:#1d4ed8!important}',
      '.sk-yr-label.sk-yr-gap{color:#b45309!important}',
      // Expanded (newest) year: two service cards side by side, stacking on narrow screens.
      '.sk-svc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '@media (max-width:620px){.sk-svc-grid{grid-template-columns:1fr}}',
      '.sk-svc-card{background:var(--bg);border:1px solid var(--brd2,#f1f5f9);border-radius:10px;padding:10px 12px}',
      '.sk-svc-card.sk-svc-empty{opacity:.65}',
      '.sk-svc-hd{display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:13px}',
      '.sk-svc-send{all:unset;cursor:pointer;margin-left:auto;font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;border:1px solid #99f6e4;color:#0f766e;background:var(--surface)}',
      '.sk-svc-send:hover{background:#f0fdfa}',
      '.sk-svc-ws{all:unset;cursor:pointer;margin-left:auto;font-size:11px;font-weight:700;padding:4px 10px;border-radius:8px;border:1px solid #fecaca;color:#b91c1c;background:var(--surface)}',
      '.sk-svc-ws:hover{background:#fef2f2}',
      '.sk-svc-row{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin:4px 0}',
      '.sk-svc-tag{font-size:9px;font-weight:700;color:var(--ink3);background:var(--surface2);border:1px solid var(--brd2,#f1f5f9);border-radius:99px;padding:1px 7px;white-space:nowrap}',
      '.sk-svc-tag.inv{color:#15803d;background:#f0fdf4;border-color:#bbf7d0}',
      '.sk-svc-pay{font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:99px}',
      '.sk-svc-pay.ok{color:#15803d;background:#f0fdf4}',
      '.sk-svc-pay.due{color:#b45309;background:#fef3c7}',
      '.sk-svc-amt{font-size:11px;font-weight:700;color:var(--ink2,var(--ink1))}',
      // Older (collapsed) years: one compact line per service.
      '.sk-svc-compactrow{display:flex;flex-direction:column;gap:3px}',
      '.sk-svc-compact{display:flex;align-items:center;flex-wrap:wrap;gap:5px;font-size:12px;color:var(--ink2,var(--ink1))}',
      '.sk-svc-compact.sk-svc-empty{color:var(--ink4);font-style:italic}',
      '.sk-svc-btn{all:unset;cursor:pointer;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:7px;border:1px solid var(--brd2,#f1f5f9);color:var(--ink3)}',
      '.sk-svc-btn:hover{color:var(--brand);border-color:var(--brand)}',
      // 🔗 manual-link picker (shown only when auto-pairing is genuinely ambiguous).
      '.sk-link-wrap{display:inline-flex;align-items:center;gap:5px}',
      '.sk-link-sel{font:inherit;font-size:11px;padding:3px 6px;border:1px solid var(--brd2,#f1f5f9);border-radius:7px;background:var(--surface)}',
      '.sk-link-btn{all:unset;cursor:pointer;font-size:11px;font-weight:700;padding:3px 9px;border-radius:7px;border:1px solid #99f6e4;color:#0f766e;background:var(--surface)}',
      '.sk-link-btn:disabled{opacity:.4;cursor:default}',
      '.sk-yr-add{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-top:10px}',
      '.sk-sub{font-size:11px;color:var(--ink4)}',
      // Skjala-chippar: fast há, þjöppuð leturstærð (yfirskrifar Brunastál-skinnið)
      // + stytting með … svo löng skráarnöfn víkki ekki töfluna endalaust.
      '.sk-card .sk-doc{font-size:11.5px!important;line-height:1.2!important;padding:4px 9px!important;max-width:min(52vw,230px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.sk-card .sk-doc.add{max-width:none}',
      '.sk-pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:3px 11px;border-radius:99px;border:1px solid var(--brd);background:var(--surface);color:var(--ink4);font-variant-numeric:tabular-nums}',
      '.sk-pill::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--hairline)}',
      '.sk-pill.ok{border-color:#bbf7d0;background:#f0fdf4;color:#15803d}.sk-pill.ok::before{background:#15803d}',
      '.sk-pill.now{border-color:var(--brd);background:var(--surface2);color:var(--brand)}.sk-pill.now::before{background:var(--brand)}',
      '.sk-pill.none{opacity:.55}',
      // Glóandi grænn = handvirkt staðfest (human).
      '.sk-pill.done{border-color:#16a34a;background:#dcfce7;color:#14532d;box-shadow:0 0 0 1px rgba(22,163,74,.25)}',
      '.sk-pill.done::before{background:#16a34a;box-shadow:0 0 6px 1.5px rgba(22,163,74,.9);animation:sk-glow 1.6s ease-in-out infinite}',
      '@keyframes sk-glow{0%,100%{box-shadow:0 0 5px 1px rgba(22,163,74,.75)}50%{box-shadow:0 0 8px 2.5px rgba(22,163,74,1)}}',
      // Blár = Claude yfirfór (bíður staðfestingar).
      '.sk-pill.claude{border-color:#2563eb;background:#dbeafe;color:#1e3a8a}',
      '.sk-pill.claude::before{background:#2563eb;box-shadow:0 0 5px 1px rgba(37,99,235,.8)}',
      // Appelsínugulur = skýrsla vantar (gap sem Claude fann).
      '.sk-pill.gap{border-color:#f59e0b;background:#fef3c7;color:#92400e}',
      '.sk-pill.gap::before{background:#f59e0b}'
    ].join('\n');
    var st=document.createElement('style'); st.id='sk-card-css'; st.textContent=css; document.head.appendChild(st);
  }
  console.log('[patch-199] unified Skjöl & viðhengi card installed');
})();
/* === END DOC YEAR GRID === */
