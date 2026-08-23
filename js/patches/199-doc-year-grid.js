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
  // 2026-08-20: Drive-hlekkir opna EKKI óskráðar (ódeildar) skrár → „file does not exist".
  // Beinum í gegnum /api/skjal á Brunahólfi — server-OAuth (freshAccessToken,
  // supportsAllDrives) streymir PDF-inu inline, engin Google-innskráning. Sama leið og
  // patch 273/274. 'sb:'-forskeytt er storage-vísun, ekki Drive-auðkenni.
  function driveUrl(id){ return id && String(id).indexOf('sb:')!==0 ? 'https://brunaholf.netlify.app/api/skjal?id='+encodeURIComponent(id) : ''; }
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
  // 2026-08-20: Storage FYRST — Drive-hlekkir rotna (skrár færðar/óskráðar til deilingar
  // → „Sorry, the file you have requested does not exist"), storage_path er STÖÐUG opinber
  // slóð sem krefst engrar Google-innskráningar. Sama forgangsröðun og customer.js
  // docViewUrl í Brunahólf (2026-08-07). 'sb:'-forskeytt drive_file_id er storage-vísun,
  // EKKI Drive-auðkenni (sbr. hasFile-vörnina á línu 1114) → aldrei byggja Drive-slóð úr því.
  function docUrl(d){
    if(!d) return '';
    var su = storageUrl(d.storage_path); if(su) return su;
    var did = d.drive_file_id;
    if(did && String(did).indexOf('sb:') !== 0) return driveUrl(did);
    return '';
  }
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
    // 2026-08-17 (E Fasteignafélag o.fl., 9 raðir): customers_base geymdi kt
    // sumstaðar ÁN bandstriks — .eq á strikuðu myndina fann þá enga tengingu,
    // „Ekki enn tengt grunnskrá" birtist ranglega og skjöl grunnskrárinnar
    // (skýrslur + reikningar) hlóðust ekki. Gögnin voru normalíseruð, en
    // uppflettingin þolir nú BÁÐAR myndir svo nýr innflutningur brjóti ekkert.
    var digits=String(d).replace(/\D/g,'');
    try{ var r=await sb.from('customers_base').select('id').or('kennitala.eq.'+d+',kennitala.eq.'+digits).limit(1);
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
    try{ var r=await sb.from('customer_documents').select('id,doc_type,year,drive_file_id,storage_path,invoice_number,amount,doc_date,notes,file_name,fyrirtaeki_id,is_duplicate,found_by').eq('customer_base_id', baseId);
      return r.data||[]; }catch(e){ return []; }
  }
  // Brunakerfis-skoðanir (doc_type='brunakerfi') eru lyklaðar á fyrirtaeki_id —
  // patch 273 skrifar customer_base_id NULL — svo base-leiðin (fetchDocs) nær þeim
  // EKKI þegar staðurinn er ekki tengdur grunnskrá. Sækjum þær beint eftir
  // fyrirtaeki_id svo brunakerfis-dálkurinn fyllist ALLTAF (líka fyrir ótengda staði).
  async function fetchBrunakerfiDocs(coId){
    var sb=SB(); if(!sb||!coId) return [];
    try{ var r=await sb.from('customer_documents')
        .select('id,doc_type,year,drive_file_id,storage_path,invoice_number,amount,doc_date,notes,file_name,fyrirtaeki_id,is_duplicate,found_by')
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
  // 2026-08-07 (Agnar, Þangbakki 8-10): afturkallaðar Payday-krófur voru sjálf-
  // skráðar í customer_documents sem doc_type='reikningur' — CANCELLED (+X) OG
  // kredit-tvíburinn CREDIT (−X) sem núllar hana. Þær eru EKKI raunverulegir
  // reikningar (net-núll, ekkert PDF) en fylltu reiknings-lista ársins svo
  // „1 skýrsla + 1 reikningur" varð „1 + 3" → sjálf-tenging neitaði (þarf nákvæmlega
  // einn) og handvirki „hvaða reikningur?" veljarinn birtist í stað þess að
  // nýi reikningurinn tengdist sjálfkrafa. Sleppum þeim úr reiknings-kandidötunum
  // (líka úr chippunum — afturkallaður reikningur á ekki að sýnast sem útgefinn).
  // Aðeins doc-raðir (viðhengi/sölu-raðir bera ekki þessa Payday-status-notu).
  function isVoidInvoiceDoc(d){
    if(!d || d._att || d._fromSolur) return false;
    return /\((?:CANCELLED|CREDIT|AFTURK|KREDIT)\)/i.test(String(d.notes||''));
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
    try{ var r=await sb.from('document_pairs').select('id,year,service_type,report_doc_id,invoice_doc_id,solur_id,status,matched_by,fyrirtaeki_id').eq('customer_base_id', baseId);
      return r.data||[]; }catch(e){ return []; }
  }
  // 2026-08-10: the real unique index (Brunahólf, 2026-08-09) is
  // (customer_base_id, year, service_type, COALESCE(fyrirtaeki_id,0)) — an
  // EXPRESSION index. PostgREST's upsert onConflict= only matches a plain
  // column-list constraint, never an expression, so the old
  // onConflict:'customer_base_id,year,service_type' upsert here always threw
  // "no unique or exclusion constraint matching ON CONFLICT" — silently
  // swallowed by the catch below, so "🔗 Tengja" looked like it worked (button
  // flashed "Vista…") but the row never saved and the picker reset to
  // unselected on the next render. Select-then-insert/update sidesteps the
  // expression-index limitation entirely. fyrirtaekiId scopes the pair to
  // THIS location (fyrirtaeki.id) so multi-site customers (e.g. Heimaleiga)
  // don't collide onto one shared row — see brunaholf CLAUDE.md 2026-08-09.
  async function savePair(baseId, year, serviceType, fyrirtaekiId, patch){
    var sb=SB(); if(!sb||!baseId) return;
    try{
      var q = sb.from('document_pairs').select('id').eq('customer_base_id', baseId).eq('year', +year).eq('service_type', serviceType);
      q = (fyrirtaekiId!=null) ? q.eq('fyrirtaeki_id', fyrirtaekiId) : q.is('fyrirtaeki_id', null);
      var existing = await q.maybeSingle();
      var row = Object.assign({
        customer_base_id: baseId, year: +year, service_type: serviceType,
        fyrirtaeki_id: (fyrirtaekiId!=null?fyrirtaekiId:null), updated_at: new Date().toISOString(),
      }, patch);
      if(existing && existing.data && existing.data.id) await sb.from('document_pairs').update(row).eq('id', existing.data.id);
      else await sb.from('document_pairs').insert(row);
      return true;
    }catch(e){ console.warn('[savePair]', e); return false; } // auto-path is best-effort; manual path checks this
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
  // 2026-08-23 (ósk Agnars): sama og docWrap en með 3-stiga factcheck-checkmarki
  // fremst — AÐEINS á skýrslum og reikningum. dfcMark skilar tómu fyrir skjöl án
  // customer_documents-id (t.d. _fromSolur sölu-reikningar) svo þau fá aðeins ✕.
  function docWrapFc(chip, id){
    return '<span class="sk-att-wrap">'+dfcMark(id)+chip+'<button type="button" class="sk-att-x" data-deldoc="'+esc(id)+'" title="Eyða skráningu af síðunni">✕</button></span>';
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
  // 2026-08-07: `notes` geymir EKKI alltaf skráarheiti. Sumar innsogsleiðir
  // skrifa UPPRUNA sinn þangað — „drive-multitool · 2010 · RESOLVE", „fasi0
  // 2026-07-30: skráð úr samningar-bucket …" — og þá stóð sá texti í chippinu.
  // Það segir ekkert um HVAÐA skýrsla þetta er og eyðilagði einmitt tilganginn
  // hér að ofan: að sjá ranglega tengda skýrslu í fljótu bragði. Mælt á lifandi
  // gögnum: 1.151 af 1.843 skýrslu-röðum (61%) báru slíkan stimpil.
  // 2026-08-17: „uttekt-master" bætt við — Drive-pörunarbakfyllingin 2026-06-06
  // stimplaði 378 raðir hjá 275 fyrirtækjum með „uttekt-master MATCH nn: …" og
  // sá hrástimpill birtist sem skjalanafn (skráarheitið í honum er hvort eð er
  // ótraust skv. skjol.md — auto-renamer skemmdi ~1/3 nafna).
  var STAMP_RE = /^\s*(drive-multitool|doc-index|relink(-docs)?|skjalavarsla|uttekt-upload|uttekt-master|fasi0)\b/i;
  function docName(d){
    // 2026-08-20: raunverulegt Drive-skráarheiti er nú geymt í `file_name`
    // (structured „Fyrirtæki - Heimilisfang - kt - tegund - ár"). Það er ALLTAF
    // rétta nafnið — kýs það fram yfir `notes` (sem bar oft uppruna-stimpil). Sýnir
    // líka heimilisfangið beint í nafninu → augljóst ef samningur á rangt fyrirtæki.
    var fn = String(d.file_name || '').trim().replace(/\.(pdf|docx?|jpe?g|png)$/i, '');
    if (fn) return fn;
    var raw = String(d.notes || '').trim();
    // Uppruna-stimpill er ekki nafn — henda honum og byggja nafn úr gögnunum.
    var nm = STAMP_RE.test(raw) ? '' : raw
      // " · kt 123456-7890" og " · app-útgáfa 2026-07-30" eru viðaukar sem
      // indexarinn hengir aftan á RAUNVERULEGT skráarheiti — nafnið sjálft heldur
      // sér orðrétt (fyrirtæki · heimilisfang · mánuður · ár).
      .replace(/\s*[·•]\s*kt\b.*$/i, '')
      .replace(/\s*[·•]\s*app-útgáfa\b.*$/i, '')
      .trim();
    if (nm) return nm;
    // Varaleið: kúnnanafn + ár. Mælt: 1.130 af 1.151 stimpil-röðum eiga
    // customer_name og 1.150 eiga year — engin á hvorugt, svo þetta er aldrei tómt.
    var co = String(d.customer_name || '').trim();
    var kind = d.doc_type === 'brunakerfi' ? 'Brunakerfi' : 'Skoðun';
    return [co, kind + (d.year ? (' ' + d.year) : '')].filter(Boolean).join(' — ');
  }
  function repDocChip(d){
    var u=docUrl(d), full=docName(d);
    var disp=full.length>46?full.slice(0,44)+'…':full;
    var ico = d.doc_type==='brunakerfi' ? '🔥' : '📄';
    // 2026-08-17 (Agnar: „get ekkert opnað"): skjalalausa chippið leit út eins
    // og hlekkur (cursor:pointer á .sk-doc) en gerði ekkert. Nú er það sýnilega
    // dautt (⚠, dauft, strikaður rammi) og smellur útskýrir sig — sýnir söguna
    // úr notes („dauður Drive-hlekkur fjarlægður … ÞARF AÐ FINNA AFTUR").
    var chip = u ? '<a class="sk-doc rep" href="'+esc(u)+'" target="_blank" rel="noopener" title="'+esc(full)+' — opna í Drive">'+ico+' '+esc(disp)+'</a>'
                 : '<span class="sk-doc rep miss" data-misstitle="'+esc(String(d.notes||'').slice(0,500))+'" title="Skjalið er ekki lengur í Drive — þarf að finna frumritið aftur. Smelltu fyrir söguna.">⚠ '+esc(disp)+'</span>';
    return docWrapFc(chip, d.id);
  }
  // 2026-08-17 (regla Agnars: „Kröfuyfirlits-eintakið er truth"): bakfylltu/
  // endursmíðuðu eintökin frá 18.–19.7 (cowork-regen/-payday-backfill/-backfill,
  // claude-code:fasi0) og skjöl með upphæð sem stangast á við söluna eru EKKI
  // frumrit — sölu-reikningurinn gildir. Þau víkja: salan verður aðaleintakið
  // og skjalið sést sem dauft ⚠-merki með skýringu (ekkert eytt).
  var SUSPECT_FOUND = /^(cowork-regen|cowork-payday-backfill|cowork-backfill|claude-code:fasi0)/i;
  function invDocChip(d, srcByNum){
    var u=docUrl(d); var lab=invLabel(d.invoice_number);
    var chip;
    var nk = d.invoice_number ? numKey(d.invoice_number) : '';
    var inSolur = nk && srcByNum && srcByNum[nk];
    if(inSolur){
      var _s = srcByNum[nk];
      var _amtOff = (d.amount != null && _s.samtals != null && Math.abs(+d.amount - _s.samtals) > 2);
      if(_amtOff || SUSPECT_FOUND.test(String(d.found_by||''))){
        var _why = _amtOff
          ? ('upphæð skjalsins (' + d.amount + ' kr) stangast á við söluna (' + _s.samtals + ' kr)')
          : ('bakfyllt/endurgert eintak: ' + String(d.found_by||''));
        return docWrapFc(
          '<button type="button" class="sk-doc inv" data-invopen="'+esc(d.invoice_number)+'" title="Opna reikninginn úr Sölu — Kröfuyfirlits-eintakið gildir">🧾 '+esc(lab)+'</button>' +
          '<span class="sk-doc inv miss" title="⚠ '+esc(_why)+' — sölu-reikningurinn er rétthærri. Smelltu á ✕ til að fjarlægja skráninguna.">⚠</span>',
          d.id);
      }
    }
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
    return docWrapFc(chip, d.id);
  }
  function repAttChip(a){ var nm=String(a.name||'Skoðun'); var disp=nm.length>46?nm.slice(0,44)+'…':nm; return attWrap('<button type="button" class="sk-doc rep" data-att="'+esc(a.id)+'" title="'+esc(nm)+'">📄 '+esc(disp)+'</button>', a.id); }
  function invAttChip(a){ var m=String(a.name||'').match(/R-?\s?\d{3,}/i); return attWrap('<button type="button" class="sk-doc inv" data-att="'+esc(a.id)+'" title="'+esc(a.name)+'">🧾 '+esc(m?invLabel(m[0]):'Reikningur')+'</button>', a.id); }
  function addChip(kind, year, label){ return '<button type="button" class="sk-doc add" data-pick="1" data-kind="'+esc(kind)+'"'+(year?' data-year="'+esc(year)+'"':'')+'>'+esc(label)+'</button>'; }

  // 2026-08-11 (ósk Agnars — „connections between these buttons is needed and
  // override enabled"): STAÐA EFTIR ÁRI-pillurnar voru DAUÐAR — hreinn skraut-
  // <span> án `data-yr` og án smellhlustara. Þær sýndu sömu stöðu og árs-dálkarnir
  // í listanum en ekkert var hægt að gera við þær, svo rangt grænt ár varð ekki
  // leiðrétt þaðan. Nú bera þær `data-yr` og deila NÁKVÆMLEGA sama fact-check
  // ástandi og árs-hausinn (`.sk-yr`) — tvísmellur hringar
  // ekkert → ✓ staðfest → 🟠 skýrsla vantar → ekkert.
  // 2026-08-17 (ósk Agnars: „Láta þetta verða grænt þegar ég er búinn að gera
  // bæði"): árið verður GRÆNT sjálfkrafa þegar BÆÐI skýrsla og reikningur eru
  // á skrá (sama regla og ✓ FULLBÚIÐ á þjónustukortinu og '_yr both' á
  // listanum). Skjölin eru staðreyndir og tromma því gap/claude-flögg;
  // handvirk staðfesting (glóandi grænt) heldur sínu útliti ofar öllu.
  function pill(y, hasReport, fcStat, note, hasInv){
    var cls=hasReport?'ok':(y===NOW?'now':'none');
    var both=!!(hasReport&&hasInv);
    if(fcStat==='human') cls+=' done'; else if(both) cls+=' both'; else if(fcStat==='claude') cls+=' claude'; else if(fcStat==='gap') cls+=' gap';
    var tip=fcStat==='human'?(y+' — ✓ staðfest handvirkt (grænt) — tvísmelltu fyrir 🟠 „skýrsla vantar"')
      :both?(y+' — ✓ fullbúið: skýrsla OG reikningur á skrá — tvísmelltu til að staðfesta handvirkt')
      :fcStat==='claude'?(y+' — 🔵 blátt: úttekt gerð / yfirfarið, skýrsla vantar'+(note?(': '+note):'')+' — tvísmelltu til að hreinsa (sjálfvirk staða)')
      :fcStat==='gap'?(y+' — 🟠 '+(note||'skýrsla vantar')+' — tvísmelltu fyrir 🔵 „úttekt gerð, skýrsla vantar"')
      :(hasReport?(y+' — skýrsla á skrá — tvísmelltu til að yfirtaka handvirkt (grænt → gult → blátt → sjálfvirkt)')
        :(y===NOW?(y+' — í vinnslu — tvísmelltu til að staðfesta'):(y+' — engin skýrsla — tvísmelltu til að staðfesta')));
    return '<span class="sk-pill '+cls+'" data-yr="'+y+'" title="'+esc(tip)+'">'+String(y).slice(2)+'</span>';
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
      var r=await sb.from('solur').select('num,source,vidskiptategund,samtals').or('customer_kt.eq.'+d+',customer_kt.eq.'+dash);
      if(r.error||!r.data) return {};
      // Pakki 7: vidskiptategund (uttekt/bud/ovisst) er nákvæmari en source —
      // geymum bæði; chipInvSrc lætur tegundina ráða þegar hún er til.
      var m={}; r.data.forEach(function(s){ var k=numKey(s.num); if(k) m[k]={ src:s.source||'pos', teg:s.vidskiptategund||null, samtals:(s.samtals!=null?+s.samtals:null) }; }); return m;
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
        .select('id,num,samtals,created_at,customer_id,greitt_med,source')
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
    var k=numKey(chipInvNum(x)); var e=k?srcMap[k]:null;
    if(e&&typeof e==='object'){
      // vidskiptategund ræður (Pakki 7): bud → afgreiðsla, uttekt → úttekt;
      // ovisst/óþekkt fellur á gömlu source-regluna.
      if(e.teg==='bud') return 'afgr';
      if(e.teg==='uttekt') return 'uttekt';
      return (e.src==='pos'||e.src==='sott')?'afgr':'uttekt';
    }
    return (e==='pos'||e==='sott')?'afgr':'uttekt';
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
  // 2026-08-18: opna reikning BEINT úr sölu-röðinni (solur → SalaInvoice.
  // renderFromSale, sama mót og „Prenta aftur"). Notað af BÆÐI 🧾-chippinu
  // (data-invopen) OG 👁-skoða-takkanum í „hvaða reikningur?"-veljaranum svo
  // reikningur án PDF opnist alltaf án þess að fara á Sölu-síðuna og leita.
  async function openInvFromSale(num, coId){
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
  }
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
  // Tvísmella hringar nú í FJÓRUM stigum (2026-08-17, Agnar: „double click …
  // to toggle the status. green yellow, blue"). Blátt varð handvirkt aðgengilegt
  // — áður gat aðeins Claude sett 'claude'; nú er það líka handmerkið fyrir
  // „úttekt gerð / yfirfarið en skýrsla vantar":
  //   ekkert → 'human' (✓ grænt) → 'gap' (🟠 gult) → 'claude' (🔵 blátt) → hreinsa
  // SAMI hringur og í árs-dálkum listans (patch 187, sama year_factcheck-tafla)
  // svo yfirskrift héðan breytir reitnum á Fyrirtæki í þjónustu og öfugt.
  async function fcToggle(coId,y){
    var st=fcStatus(coId,y);
    if(st==='human')      await fcSet(coId,y,'gap','Merkt handvirkt: skýrsla vantar');
    else if(st==='gap')   await fcSet(coId,y,'claude','Merkt handvirkt: úttekt gerð — skýrsla vantar');
    else if(st==='claude')await fcClear(coId,y);
    else                  await fcSet(coId,y,'human',null);
  }

  // ── Fact-check per SKJAL (doc_id) — ÞRJÚ STIG (2026-08-23, ósk Agnars) ───────
  // Hliðstæða year_factcheck hér að ofan, en á HVERT skjal (skýrslu/reikning) í
  // stað (fyrirtæki,ár). Geymt í Supabase-töflunni `doc_factcheck`
  // (doc_id bigint PK, status smallint) — RLS slökkt, vafrinn skrifar beint eins
  // og year_factcheck. Hringur (ósk Agnars, orðrétt „grey→blue→green→grey"):
  //   0 grátt (sjálfgefið) → 1 blátt (Claude factcheck) → 2 grænt (staðfest) → 0.
  // Aðeins á skjölum sem eiga customer_documents.id — sölu-reikningar án id
  // (_fromSolur/_saleId) fá ekkert merki (dfcMark skilar tómu).
  var _dfc = {};             // doc_id(str) → status (1|2); vantar => 0 (grátt)
  function dfcStatus(docId){ var v=_dfc[String(docId)]; return v==null?0:+v; }
  function dfcCls(st){ return st===2?'green':st===1?'blue':'grey'; }
  function dfcTip(st){
    return st===2 ? 'Staðfest (grænt) — smelltu til að núllstilla'
         : st===1 ? 'Claude factcheck (blátt) — smelltu til að staðfesta (grænt)'
         : 'Ekki yfirfarið (grátt) — smelltu fyrir Claude factcheck (blátt)';
  }
  // Lítill smellanlegur checkmark fyrir eitt skjal. Tómt ef ekkert customer_
  // documents-id → þau eiga ekkert að merkja (og brotna ekki).
  function dfcMark(docId){
    if(docId==null) return '';
    var s=String(docId); if(s===''||s==='undefined'||s==='null') return '';
    var st=dfcStatus(docId);
    return '<button type="button" class="sk-dfc '+dfcCls(st)+'" data-dfc="'+esc(s)+'" title="'+esc(dfcTip(st))+'">✓</button>';
  }
  // Hlaða stöðu fyrir tiltekin skjala-id (öll skjöl félagsins) — kallað í render
  // rétt á eftir fcLoad(coId). doc_factcheck hefur engan co_id-dálk svo þetta
  // tekur DOCIDS (ekki coId): safnað úr docs+bruDocs sem félagið á.
  async function dfcLoad(docIds){
    var sb=SB(); if(!sb) return;
    var ids=(docIds||[]).filter(function(x){ var s=String(x); return x!=null && s!=='' && s!=='undefined' && s!=='null'; });
    if(!ids.length) return;
    ids.forEach(function(id){ delete _dfc[String(id)]; });  // reset: eytt fact-check (status 0) verði grátt aftur
    try{
      var r=await sb.from('doc_factcheck').select('doc_id,status').in('doc_id', ids);
      (r.data||[]).forEach(function(x){ _dfc[String(x.doc_id)]=x.status; });
    }catch(_){}
  }
  async function dfcSet(docId, status){
    var sb=SB(); if(!sb) return;
    var id=/^\d+$/.test(String(docId))?+docId:docId;
    try{
      var r=await sb.from('doc_factcheck').upsert({doc_id:id, status:status, updated_at:new Date().toISOString()}, {onConflict:'doc_id'});
      if(r && r.error) throw r.error;
      _dfc[String(docId)]=status;
    }catch(e){ alert('Villa við vistun: '+(e.message||e)); }
  }
  async function dfcClear(docId){
    var sb=SB(); if(!sb) return;
    var id=/^\d+$/.test(String(docId))?+docId:docId;
    try{
      var r=await sb.from('doc_factcheck').delete().eq('doc_id', id);
      if(r && r.error) throw r.error;
      delete _dfc[String(docId)];
    }catch(e){ alert('Villa: '+(e.message||e)); }
  }
  // 0→1 (blátt) → 2 (grænt) → 0 (grátt, eytt).
  async function dfcToggle(docId){
    var st=dfcStatus(docId);
    if(st===1)      await dfcSet(docId,2);
    else if(st===2) await dfcClear(docId);
    else            await dfcSet(docId,1);
  }
  // Einu sinni: flytja gömlu AppSettings-grænin (patch #465) yfir í töfluna.
  (function migrateGreens(){
    function run(){
      try{
        if(localStorage.getItem('fc_migrated_v1')) return;
        var sb=SB(); if(!sb){ return; }                    // reynt aftur síðar (næsta onChange)
        var old=(window.AppSettings&&AppSettings.path&&AppSettings.path('year_factcheck'))||{};
        var rows=[]; Object.keys(old).forEach(function(co){ Object.keys(old[co]||{}).forEach(function(yr){ if(old[co][yr]) rows.push({co_id:+co, year:+yr, status:'human'}); }); });
        localStorage.setItem('fc_migrated_v1','1');
        if(rows.length) sb.from('year_factcheck').upsert(rows,{onConflict:'co_id,year'}).then(function(){},function(){});
      }catch(_){}
    }
    // Keyra EFTIR að AppSettings er hlaðið. Áður keyrði þetta við parse (áður en
    // async-load kláraðist), las {} og merkti sig samt búið => ekkert fluttist
    // (fix 2026-08-22, save-audit S5).
    if(window.AppSettings && AppSettings.isLoaded && AppSettings.isLoaded()) run();
    else if(window.AppSettings && AppSettings.onChange) AppSettings.onChange(run);
    else setTimeout(run, 3000);
  })();

  // ── Skoðunarmánuður (deilt með Fyrirtæki í Þjónustu — 153-arsskodun.js) ────
  // Sama forgangsröð og þar (MÁNAÐAR-FORGANGSREGLA): handvirk yfirskrift >
  // blob-mánuður > skýrslu-mánuður (arsskodun_report_facts) > NÝTT: elsta
  // næsta-skoðun (uttaeki.next_insp) meðal tækja staðarins — fyllir AÐEINS í
  // eyðu þegar hvorugt hinna tveggja er til. Vistun fer í SÖMU
  // arsskodun_customers-blokkina (AppSettings) sem 153-arsskodun.js les, svo
  // Fyrirtæki í Þjónustu sýnir nákvæmlega sama gildi án nokkurrar
  // viðbótarvinnu þar — sjá samsvarandi 4. forgangsþrep bætt við þá skrá.
  var MONTHS_IS=['Janúar','Febrúar','Mars','Apríl','Maí','Júní','Júlí','Ágúst','September','Október','Nóvember','Desember'];
  var MONTHS_IS_SHORT=['Jan','Feb','Mar','Apr','Maí','Jún','Júl','Ágú','Sep','Okt','Nóv','Des'];
  var ARS_KEY='arsskodun_customers';
  var _uttNextCache={};
  // 2026-08-10: baseId-síað upphaflega. 2026-08-23 (Factcheck-átak, borð-entry
  // 2): fært á uttaeki.fyrirtaeki_id (per starfsstöð) svo skoðunarmánuðurinn
  // hér sýni NÁKVÆMLEGA sama gildi og 153-arsskodun.js (sem er líka fært á
  // fyrirtaeki_id). Gamla base-víða leitin blandaði saman systkina-stöðum í
  // fjölstaða-rekstrarfélögum. Tæki með fyrirtaeki_id=null (39, entry 13)
  // detta út — enginn staður erfir þau.
  function monthFromUttaeki(coId){
    if(!coId) return Promise.resolve(null);
    if(_uttNextCache[coId]!==undefined) return Promise.resolve(_uttNextCache[coId]);
    var sb=SB(); if(!sb) return Promise.resolve(null);
    return sb.from('uttaeki').select('next_insp').eq('fyrirtaeki_id',coId).neq('status','urelt')
      .not('next_insp','is',null).order('next_insp',{ascending:true}).limit(1)
      .then(function(r){
        var d=(r.data&&r.data[0]&&r.data[0].next_insp)||null;
        var out=null;
        if(d){ var mm=+String(d).slice(5,7); if(mm>=1&&mm<=12) out={month:mm,date:d}; }
        _uttNextCache[coId]=out; return out;
      }, function(){ _uttNextCache[coId]=null; return null; });
  }
  async function loadInspectMonth(coId, baseId){
    var blob=(window.AppSettings&&AppSettings.path&&AppSettings.path(ARS_KEY))||{};
    var manual=blob[String(coId)]||{};
    var m=+manual.inspect_month||0;
    if(m>=1&&m<=12) return {month:m, manual:!!manual.inspect_month_manual, source:'blob'};
    var sb=SB();
    if(sb){
      try{
        var r=await sb.from('arsskodun_report_facts').select('inspect_month').eq('fyrirtaeki_id',coId)
          .not('inspect_month','is',null).order('report_year',{ascending:false}).limit(1);
        var fm=r.data&&r.data[0]&&+r.data[0].inspect_month;
        if(fm>=1&&fm<=12) return {month:fm, manual:false, source:'report'};
      }catch(e){}
    }
    var derived=await monthFromUttaeki(coId);   // per starfsstöð (fyrirtaeki_id), sbr. 153
    if(derived) return {month:derived.month, manual:false, source:'uttaeki', date:derived.date};
    return null;
  }
  function monthPillHtml(info){
    if(!info) return '<button type="button" class="sk-month-pill empty" data-month-edit="1" title="Enginn skoðunarmánuður skráður — smelltu til að setja">📅 mánuður?</button>';
    var lbl=MONTHS_IS_SHORT[info.month-1];
    var src = info.manual ? 'handvirkt valið' : (info.source==='report' ? 'úr úttektarskýrslu' : 'reiknað úr næstu skoðun tækja'+(info.date?(' ('+info.date+')'):''));
    return '<button type="button" class="sk-month-pill'+(info.manual?' manual':'')+'" data-month-edit="1" title="'+esc('Skoðunarmánuður — '+src+' — smelltu til að breyta')+'">📅 '+esc(lbl)+'</button>';
  }

  async function render(section, coId){
    // 2026-08-18 (Agnar): rafræna krafan fer ALLTAF — rofinn hér stýrir aðeins
    // hvort tölvupóstafrit (reikningur+skýrsla) fylgi. payday_delivery:
    // 'electronic' = póstur AF; annað/tómt = póstur Á (sjálfgefið).
    var _co0=getCompany(coId);
    var _postOff=!!(_co0 && _co0.payday_delivery==='electronic');
    var hdr='<div class="sk-h"><h3>📁 Skjöl &amp; viðhengi</h3>'+
            '<button type="button" class="sk-mailpref" data-co="'+coId+'" data-off="'+(_postOff?'1':'')+'" '+
              'title="Rafræn krafa fer alltaf. Þessi rofi stýrir hvort tölvupóstafrit (reikningur + úttektarskýrsla) fylgi að auki þegar netfang er skráð." '+
              'style="font-size:11.5px;font-weight:700;border:1px solid '+(_postOff?'#fca5a5':'#a7f3d0')+';background:'+(_postOff?'#fef2f2':'#ecfdf5')+';color:'+(_postOff?'#b91c1c':'#065f46')+';border-radius:99px;padding:5px 11px;cursor:pointer">'+
              (_postOff?'📧 Póstafrit: AF':'📧 Póstafrit: Á')+'</button>'+
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
      else if(t==='reikningur'){ if(!isVoidInvoiceDoc(d)) (invByY[y]=invByY[y]||[]).push(d); }
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

    // ── hlaða skjala-factcheck fyrir öll skjöl félagsins (skýrslur + reikningar) ──
    // Eftir að docs+bruDocs eru komin en ÁÐUR en chippar eru teiknaðir, svo
    // litur checkmarksins sé réttur við fyrstu teikn (sama og fcLoad hér að ofan).
    var _docIds=[];
    docs.forEach(function(d){ if(d && d.id!=null) _docIds.push(d.id); });
    bruDocs.forEach(function(d){ if(d && d.id!=null) _docIds.push(d.id); });
    await dfcLoad(_docIds);

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
        (invByY[y]=invByY[y]||[]).push({ invoice_number:s.num, amount:s.samtals, doc_date:s.created_at, _fromSolur:true, _saleId:s.id });
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
      // 2026-08-17 (Steypustöðin R-000157 sýnd GREITT ranglega): Payday-
      // HLAUPANÚMERIÐ (p.number, t.d. „157") árekst við R-númer ANNARS
      // reiknings (R-000157) í numKey-vörpuninni og víxlaði greiðslustöðu.
      // Lyklum því aðeins á reference (ber R-númerið) — og á number eingöngu
      // þegar það ber sjálft R-forskeyti.
      var _keys=[p.reference];
      if(/^\s*r/i.test(String(p.number||''))) _keys.push(p.number);
      _keys.forEach(function(v){ var k=numKey(v); if(k && !paydayByNum[k]) paydayByNum[k]=p; });
    });
    function paydayStatusFor(inv){
      var k = inv && (inv.invoice_number?numKey(inv.invoice_number):numKey(chipInvNum(inv)));
      var p = k && paydayByNum[k]; if(!p) return null;
      return { paid: !!p.paid_date, dueDate: p.due_date||null };
    }

    // ── document_pairs (durable bundle store — sjá savePair) ──
    // Multi-site kt (t.d. Heimaleiga): pör MEÐ fyrirtaeki_id tilheyra AÐEINS
    // þeim eina stað — sibling-staðir sjá þau ekki. Pör ÁN fyrirtaeki_id (fyrir
    // 2026-08-09) eru staðlaus fallback sem hvaða staður má nota þar til hann
    // fær sitt eigið. Sama regla og document_pairs triggerinn í Brunahólf.
    var pairs = baseId ? await fetchPairs(baseId) : [];
    var pairsByYear={};
    pairs.forEach(function(pr){
      if(pr.fyrirtaeki_id!=null && +pr.fyrirtaeki_id!==+coId) return; // á öðrum stað — ekki okkar
      var y = pairsByYear[pr.year] = pairsByYear[pr.year]||{};
      var mine = pr.fyrirtaeki_id!=null;
      if(!y[pr.service_type] || mine) y[pr.service_type]=pr;
    });

    // ── year set: every year with anything + the current year, newest first ──
    var ySet={}; ySet[NOW]=1;
    Object.keys(repByY).forEach(function(y){ySet[y]=1;});
    Object.keys(bruByY).forEach(function(y){ySet[y]=1;});
    Object.keys(invByY).forEach(function(y){ySet[y]=1;});
    Object.keys(pdByY).forEach(function(y){ySet[y]=1;});
    var YEARS=Object.keys(ySet).map(Number).sort(function(a,b){return b-a;});

    // ── status pills ──
    var pills=YEARS.map(function(y){ return pill(y, (repByY[y]||[]).length>0, fcStatus(coId,y), fcNote(coId,y), (invByY[y]||[]).length>0); }).join('');
    var monthInfo = await loadInspectMonth(coId, baseId);
    section._monthInfo = monthInfo;

    // ── samningur strip ──
    // 2026-08-05 (Agnar: „hefur hunsað öll endurnefndu skjölin"): samningur-raðir
    // í customer_documents bera ALLTAF year=NULL (CHECK-reglan customer_
    // documents_year_shape krefst þess) — svo „Samningur "+s.year sýndi ALDREI
    // neitt greinandi, sama hvað notandinn endurnefndi skrána í (t.d. bætti
    // stofnárinu inn í skráarheitið sjálft, af því ártals-dálkurinn er lokaður
    // fyrir samninga). Sýnum núna alvöru skráarheitið (sama og docName() gerir
    // fyrir skýrslur) svo endurnefningin — þ.m.t. ár í heitinu — birtist loksins.
    function samnLabel(s){
      if(s.src==='doc'){
        // 2026-08-20: kýs raunverulegt Drive-skráarheiti (file_name) fram yfir
        // notes — SÖMU rök og docName(). Áður las þetta notes beint, svo uppruna-
        // stimpillinn („drive-multitool · 2024") stóð sem nafn þótt raunheitið
        // væri þegar til í file_name (259 af 358 samningum). Nú birtist það loksins.
        var fn=String(s.d.file_name||'').trim().replace(/\.(pdf|docx?|jpe?g|png)$/i,'');
        if(fn) return fn;
        var nm=String(s.d.notes||'').replace(/\s*[·•]\s*kt\b.*$/i,'').trim();
        return (nm && !STAMP_RE.test(nm)) ? nm : 'Samningur';
      }
      return String(s.a.name||'Samningur');
    }
    samn.sort(function(a,b){return (b.year||0)-(a.year||0);});
    function samnChip(s){
      var full=samnLabel(s), disp=full.length>46?full.slice(0,44)+'…':full;
      if(s.src==='doc'){ var u=docUrl(s.d);
        return docWrap(u?'<a class="sk-doc rep" href="'+esc(u)+'" target="_blank" rel="noopener" title="'+esc(full)+'">📑 '+esc(disp)+'</a>':'<span class="sk-doc rep miss" data-misstitle="'+esc(String(s.d.notes||'').slice(0,500))+'" title="Skjalið er ekki lengur í Drive — smelltu fyrir söguna.">⚠ '+esc(disp)+'</span>', s.d.id); }
      return '<button type="button" class="sk-doc rep" data-att="'+esc(s.a.id)+'" title="'+esc(full)+'">📑 '+esc(disp)+'</button>';
    }
    // 2026-08-07 (skissa Agnars): samningurinn fær sama kort-tungumál og árin —
    // eitt kort per þjónustu með lituðum kanti og stöðupillu hægra megin.
    // Flokkun á kort: nafnið/notes segja til um brunakerfis-samning; allt annað
    // telst slökkvitækja-samningur (það er sögulega sjálfgefna tegundin).
    // Gildis-mat er AÐEINS úr ártölum sem standa í skjalaheitinu sjálfu:
    // „2024–2026" → Í GILDI þar til loka-árið er liðið, þá ÚTRUNNINN. Samningur
    // án ártala í heiti telst Í GILDI (skjal á skrá = gildandi, venjan hans) —
    // við giskum ekki á dagsetningar sem hvergi standa.
    function samnCard(kind){
      var bkc = kind==='brunakerfi';
      var items = samn.filter(function(s){
        var t=(samnLabel(s)+' '+String(s.src==='doc'?(s.d.notes||''):'')).toLowerCase();
        return bkc === /brunakerfi|brunavarn|brunavi[ðd]v/i.test(t);
      });
      var pill, yrs='';
      if(!items.length) pill='<span class="sk-samn-pill vantar">VANTAR</span>';
      else {
        var lbl=items.map(function(s){return samnLabel(s);}).join(' ');
        var m=lbl.match(/(20\d{2})\s*[–—-]\s*(20\d{2})/);
        var endY = m ? +m[2] : null;
        if(m) yrs='<span class="sk-samn-yrs">📄 '+m[1]+'–'+m[2]+'</span>';
        pill = (endY && endY < NOW)
          ? '<span class="sk-samn-pill utrunn">ÚTRUNNINN '+endY+'</span>'
          : '<span class="sk-samn-pill gildi">Í GILDI</span>';
      }
      var chips = items.map(samnChip).join('') + (items.length?'':addChip('samningur','','+ samningur'));
      return '<div class="sk-samn-card '+(bkc?'bkc':'slk')+'">'+(bkc?'🔥':'🧯')+' <b>Samningur — '+(bkc?'brunakerfi':'slökkvitæki')+'</b>'+chips+yrs+pill+'</div>';
    }
    var samnHtml = samnCard('uttekt') + samnCard('brunakerfi');

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
        // 2026-08-17 (Agnar, Afltak): reikningur sem er ÞEGAR tengdur HINNI
        // þjónustunni (geymt par eða þegar-leyst í þessari umferð — uttekt
        // leysist á undan brunakerfi innan ársins) er FRÁTEKINN og á hvorki að
        // bjóðast í „hvaða reikningur?"-veljaranum né gera árið tvírætt.
        // Brunakerfis-kortið spurði annars um R-númer sem sat þegar fast á
        // Slökkvitækjaþjónustunni.
        var _taken={};
        SERVICES.forEach(function(o){
          if(o.kind===svc.kind) return;
          var op=pairsByYear[y]&&pairsByYear[y][o.kind];
          if(op&&op.invoice_doc_id!=null) _taken[op.invoice_doc_id]=1;
          var or=resolved[y+'|'+o.kind];
          if(or&&or.inv&&or.inv.id!=null) _taken[or.inv.id]=1;
        });
        invArr=invArr.filter(function(x){ return x._att || x.id==null || !_taken[x.id]; });
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
            savePair(baseId, y, svc.kind, coId, { report_doc_id: rep.id, invoice_doc_id: inv.id, status:'klarad', matched_by:'exact' });
          }
        }
        resolved[y+'|'+svc.kind]={ inv:inv, ambiguous:ambiguous, invCandidates:invArr };
      });
    });
    section._repByY = repByY; section._bruByY = bruByY; section._invByY = invByY;
    section._resolved = resolved; section._sendCo = { coId: coId, kt: kt, nafn: (co && co.nafn) || '' };

    // 2026-08-05 (Agnar: "ég þarf að geta séð hvað í andsskotanum ég er að
    // linka við" — a bare "R-107802 · 114.710 kr" gives no way to tell WHICH
    // building/period a candidate invoice actually belongs to). Options now
    // show the invoice date too, and a 👁 button opens the selected candidate's
    // actual file so it can be checked before committing to "Tengja".
    function fmtDagsShort(iso){ var m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})/); return m? m[3]+'.'+m[2]+'.'+m[1] : ''; }
    function manualLinkHtml(y, svc, invArr){
      if(!invArr.length) return '';
      var opts=invArr.map(function(x,i){
        var lab=invLabel(x.invoice_number||chipInvNum(x));
        var dt=x.doc_date?(' · '+fmtDagsShort(x.doc_date)):'';
        var amt=x.amount!=null?(' · '+fmtKrLoc(x.amount)+' kr'):'';
        var src=x._fromSolur?' · úr Sölu (ekkert PDF)':(x._att?' · viðhengi':'');
        return '<option value="'+i+'">'+esc(lab+dt+amt+src)+'</option>';
      }).join('');
      return '<span class="sk-link-wrap"><select class="sk-link-sel" data-link-sel="'+y+'|'+svc.kind+'"><option value="">— hvaða reikningur? —</option>'+opts+'</select>'+
        '<button type="button" class="sk-link-peek" data-link-peek="'+y+'|'+svc.kind+'" title="Opna völdu skrána til að staðfesta áður en tengt er" disabled>👁</button>'+
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
      return addChip('reikningur', y, y===NOW?'+ reikningur':'vantar reikning');
    }
    function svcRepHtml(y, svc){
      var arr=svc.repMap[y]||[];
      if(arr.length) return arr.map(function(x){ return x._att?repAttChip(x._att):repDocChip(x); }).join('')+addChip('skyrsla',y,'＋');
      if(y===NOW) return '<span class="sk-doc prog" title="Skoðun ársins ekki enn skjalfest">⏳ Í vinnslu</span>'+addChip('skyrsla',y,'+ skýrsla');
      return addChip('skyrsla',y,'vantar skýrslu');
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
    // 2026-08-07 (skissa Agnars): hvert þjónustukort ber STÖÐUMERKI í hausnum
    // (✓ FULLBÚIÐ / 1 AF 2 VANTAR) og hver lína fær punkt — grænan fylltan
    // þegar skjalið er til, gulan brotinn hring þegar vantar — með lágstafa
    // merkimiða (skýrsla/reikningur) AFTAN við chippið í stað borðans framan við.
    function svcCardExpanded(y, svc){
      var arr=svc.repMap[y]||[];
      var r=resolved[y+'|'+svc.kind];
      var hasRep=arr.length>0, hasInv=!!r.inv;
      var wsLink=svcWorkspaceLink(svc);
      if(!hasRep && !hasInv && !r.ambiguous && y!==NOW)
        return '<div class="sk-svc-card sk-svc-empty"><div class="sk-svc-hd">'+svc.icon+' <b>'+esc(svc.label)+'</b>'+wsLink+'</div><div class="sk-svc-row">engin '+esc(svc.label.toLowerCase())+addChip('skyrsla',y,'+ skýrsla')+'</div></div>';
      var badge = hasRep&&hasInv ? '<span class="sk-svc-st ok">✓ FULLBÚIÐ</span>'
                : (hasRep||hasInv) ? '<span class="sk-svc-st part">1 AF 2 VANTAR</span>'
                : '<span class="sk-svc-st prog">⏳ Í VINNSLU</span>';
      var repRow='<div class="sk-svc-row"><span class="sk-dot '+(hasRep?'ok':'miss')+'"></span>'+svcRepHtml(y,svc)+'<span class="sk-svc-tag">skýrsla</span></div>';
      var invRow='<div class="sk-svc-row"><span class="sk-dot '+(hasInv?'ok':'miss')+'"></span>'+svcInvHtml(y,svc,false)+'<span class="sk-svc-tag inv">reikningur</span></div>';
      return '<div class="sk-svc-card"><div class="sk-svc-hd">'+svc.icon+' <b>'+esc(svc.label)+'</b>'+badge+svcSendBtn(y,svc)+wsLink+'</div>'+repRow+invRow+'</div>';
    }
    var yearBlocks=YEARS.map(function(y){
      var cur=(y===YEARS[0]); var st=fcStatus(coId,y);
      // Bæði skjölin til → árshausinn grænn líka (sama regla og pillan).
      var yBoth=(repByY[y]||[]).length>0 && (invByY[y]||[]).length>0;
      var ycls='sk-yr'+(st==='human'?' sk-yr-ok':yBoth?' sk-yr-ok':st==='claude'?' sk-yr-claude':st==='gap'?' sk-yr-gap':'')+(cur&&!st&&!yBoth?' sk-yr-now':'');
      var mark=st==='human'?'✓ ':yBoth?'✓ ':st==='claude'?'🔵 ':st==='gap'?'🟠 ':'';
      var ttl=st==='human'?('✓ Staðfest '+y+' — tvísmelltu til að merkja „skýrsla vantar" (🟠)')
             :st==='claude'?('Claude yfirfór'+(fcNote(coId,y)?(': '+fcNote(coId,y)):'')+' — tvísmelltu til að staðfesta')
             :st==='gap'?((fcNote(coId,y)||'Skýrsla vantar')+' — tvísmelltu til að fjarlægja flagg')
             :('Tvísmelltu til að staðfesta fact-check '+y+' (aftur = „skýrsla vantar")');
      // 2026-08-07: ÖLL ár fá spjöldin tvö hlið við hlið (skissa Agnars) —
      // eldri ár voru áður þjappaðar línur, en stöðumerkið + punktarnir segja
      // söguna betur og eins alls staðar. cur helst fyrir upphæðir (forCompact).
      var body = '<div class="sk-svc-grid">'+SERVICES.map(function(svc){return svcCardExpanded(y,svc);}).join('')+'</div>';
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
      '<div class="sk-strip"><div class="sk-strip-l">📊 Staða eftir ári</div><div class="sk-strip-r">'+ (pills||'<span style="color:var(--ink4);font-size:12px">engin gögn</span>') + monthPillHtml(monthInfo) +'</div></div>'+
      '<div class="sk-svc-grid sk-samn-grid">'+samnHtml+'</div>'+
      '<div class="sk-yrwrap">'+yearBlocks+
        '<div class="sk-yr-add"><button type="button" class="sk-doc add" data-add-yr-svc="1">+ ár / þjónusta</button>'+
        '<span class="sk-sub">skýrsla og reikningur parast sjálfkrafa eftir ári — nýjasta árið opið, eldri ár samanþjöppuð</span></div>'+
      '</div>'+
      '<div class="sk-strip"><div class="sk-strip-l">📎 Önnur viðhengi</div><div class="sk-strip-r">'+otherHtml+'</div></div>'+
      notLinked + fixLink;
  }

  function wire(section){
    // Tvísmella á árið → hringa fact-check ársins. Virkar bæði á árs-hausnum
    // (.sk-yr) OG á STAÐA EFTIR ÁRI-pillunni (.sk-pill) — sama ástand, sami
    // hringur, svo hvor leiðin sem er dugar til að leiðrétta rangt ár.
    section.addEventListener('dblclick', async function(e){
      var td=e.target.closest && (e.target.closest('.sk-yr') || e.target.closest('.sk-pill'));
      if(!td) return;
      var coId=+section.dataset.coId; var y=+td.getAttribute('data-yr'); if(!coId||!y) return;
      e.preventDefault(); await fcToggle(coId,y); render(section, coId);
    });
    section.addEventListener('click', async function(e){
      var coId=+section.dataset.coId; if(!coId) return;

      // ✓ Skjala-factcheck (3-stiga) — smellur hringar 0→1→2→0 fyrir EITT skjal.
      // Verður að grípa á undan öllu öðru + stöðva bólun svo smellur á merkið
      // opni EKKI skjalið/PDF-ið (checkmarkið er systkini chip-hlekksins).
      var dfcEl=e.target.closest('[data-dfc]');
      if(dfcEl){
        e.preventDefault(); e.stopPropagation();
        var ddid=dfcEl.getAttribute('data-dfc');
        if(!ddid || ddid==='undefined' || ddid==='null') return;
        await dfcToggle(ddid);
        var dst=dfcStatus(ddid);           // uppfært (eða óbreytt ef vistun brást)
        dfcEl.classList.remove('grey','blue','green');
        dfcEl.classList.add(dfcCls(dst));
        dfcEl.title=dfcTip(dst);
        return;
      }

      // 📅 Skoðunarmánuður — smellur opnar innfellt val, sama mynstur og
      // ovrEditMonth í 153-arsskodun.js, vistar í SÖMU arsskodun_customers
      // blokkina svo Fyrirtæki í Þjónustu sýni breytinguna án viðbótarvinnu.
      var monthBtn=e.target.closest('[data-month-edit]');
      if(monthBtn){
        e.preventDefault();
        if(monthBtn.parentNode && monthBtn.parentNode.querySelector('select[data-month-sel]')) return;
        var curInfo=section._monthInfo||null;
        var cur=curInfo?curInfo.month:0;
        var isManual=curInfo?!!curInfo.manual:false;
        var sel=document.createElement('select');
        sel.setAttribute('data-month-sel','1');
        sel.style.cssText='min-height:30px;padding:3px 8px;border:2px solid #6366f1;border-radius:8px;font:inherit;font-size:12px;background:var(--surface);color:var(--ink1);outline:none;cursor:pointer';
        var opts='<option value="0"'+(cur===0?' selected':'')+'>— enginn —</option>';
        MONTHS_IS.forEach(function(n,i){ opts+='<option value="'+(i+1)+'"'+(cur===i+1?' selected':'')+'>'+n+'</option>'; });
        if(isManual) opts+='<option value="clear">↺ Hreinsa yfirskrift</option>';
        sel.innerHTML=opts;
        monthBtn.replaceWith(sel);
        sel.focus();
        var done=false;
        var cancel=function(){ if(done)return; done=true; render(section, coId); };
        sel.addEventListener('keydown', function(ev){ if(ev.key==='Escape'){ ev.stopPropagation(); cancel(); } });
        sel.addEventListener('blur', function(){ setTimeout(cancel,150); });
        sel.addEventListener('change', async function(){
          if(done) return; done=true;
          var v=sel.value;
          var patch = v==='clear' ? {inspect_month:0, inspect_month_manual:false} : {inspect_month:parseInt(v,10)||0, inspect_month_manual:true};
          var patchWrap={}; patchWrap[String(coId)]=patch;
          var saveObj={}; saveObj[ARS_KEY]=patchWrap;
          var ok=(window.AppSettings&&AppSettings.save) ? await AppSettings.save(saveObj) : false;
          if(!ok){ alert('Vista mistókst'); render(section, coId); return; }
          try{
            var sbx=SB();
            if(sbx){
              var coObj=getCompany(coId);
              sbx.from('override_log').insert({
                co_id:coId, co_nafn:(coObj&&coObj.nafn)||null, field:'inspect_month',
                old_value:cur?(MONTHS_IS[cur-1]||String(cur)):'—',
                new_value: v==='clear' ? '↺ hreinsað' : (MONTHS_IS[patch.inspect_month-1]||'—'),
                page:'doc-year-grid'
              }).then(function(){},function(){});
            }
          }catch(_){}
          render(section, coId);
        });
        return;
      }

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
        var hasFile=function(x){ return x && ((x.drive_file_id && String(x.drive_file_id).indexOf('sb:')!==0) || x.storage_path || (x._att && x._att.path)); };
        var choices=[];
        if(hasFile(rep)) choices.push({ label:'🧯 Úttektarskýrsla '+y, checked:true, build:function(){ return entryAttachment(rep,'Úttektarskýrsla '+y+'.pdf'); } });
        if(hasFile(bru)) choices.push({ label:'🔥 Brunakerfisskýrsla '+y, checked:true, build:function(){ return entryAttachment(bru,'Brunakerfisskýrsla '+y+'.pdf'); } });
        // „Nothing disappears" (Agnar): reikningur má ALDREI detta úr búnti þótt hann
        // eigi ekkert Drive-PDF. Sölu-skráður reikningur (solur, `_saleId` — leyst af
        // _resolved) er teiknaður sem PDF beint úr sölunni gegnum
        // ReceiptSender.invoiceAttachment (sama og 253 Fyrri viðskipti-búntið) svo
        // skýrsla + reikningur fara ALLTAF saman, líka þegar reikningurinn á ekkert PDF.
        if(hasFile(inv)){
          choices.push({ label:'🧾 Reikningur '+(inv&&inv.invoice_number?inv.invoice_number:y), checked:true, build:function(){ return entryAttachment(inv,'Reikningur '+y+'.pdf'); } });
        } else if(inv && inv._saleId && window.ReceiptSender && ReceiptSender.invoiceAttachment){
          choices.push({ label:'🧾 Reikningur '+(inv.invoice_number||y), checked:true, build:function(){ return ReceiptSender.invoiceAttachment(inv._saleId); } });
        }
        if(!choices.length){ alert('Engin skjöl til að senda fyrir '+y+'.'); return; }
        ReceiptSender.compose({
          title:'Senda — '+nafn,
          to:email,
          subject:(rep?'Úttektarskýrsla':bru?'Brunakerfisskýrsla':'Reikningur')+' '+y+' — Slökkvitæki ehf',
          bodyText:ReceiptSender.standardText(rep?'skyrsla':bru?'brunakerfi':'reikningur', { nafn:nafn, ar:y }),
          attachmentChoices:choices,
        });
        return;
      }

      // 👁 Skoða — opnar völdu skrána (Drive/storage) svo hægt sé að staðfesta
      // að hún tilheyri ÞESSARI byggingu/tímabili áður en smellt er á Tengja.
      var peekEl=e.target.closest('[data-link-peek]');
      if(peekEl){
        e.preventDefault();
        var pk=peekEl.getAttribute('data-link-peek').split('|');
        var psel=section.querySelector('[data-link-sel="'+pk[0]+'|'+pk[1]+'"]');
        var pidx=psel && psel.value!=='' ? +psel.value : null;
        if(pidx==null) return;
        var pArr=(section._resolved && section._resolved[+pk[0]+'|'+pk[1]] && section._resolved[+pk[0]+'|'+pk[1]].invCandidates)||[];
        var pinv=pArr[pidx];
        var purl=pinv?docUrl(pinv):'';
        if(purl){ window.open(purl, '_blank', 'noopener'); return; }
        // 2026-08-18 (Agnar, Icecom: „nú vill reikningurinn ekki opnast … pirrandi
        // að þurfa að fara á sölusíðu og leita aftur"): ekkert PDF EN reikningurinn
        // er til sem sölu-röð → opna hann beint úr sölunni (sama og data-invopen),
        // í stað þess að segja „ekkert til". Notandinn þarf ekki lengur að fara á
        // Sölu-síðuna og leita handvirkt.
        if(pinv && pinv.invoice_number){ await openInvFromSale(pinv.invoice_number, coId); return; }
        alert('Engin skrá tengd þessari sölu — hún kemur bara úr Sölu-skráningu, ekkert PDF til að skoða.');
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
        var saved = await savePair(baseId, ly, lkind, coId, { report_doc_id: (rep&&!rep._att)?rep.id:null, invoice_doc_id: (inv&&!inv._att&&!inv._fromSolur)?inv.id:null, status:'klarad', matched_by:'manual' });
        if(!saved){ alert('Tenging vistaðist ekki — reyndu aftur eða láttu Agnar vita.'); linkSaveEl.disabled=false; linkSaveEl.textContent='🔗 Tengja'; return; }
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
      //
      // 2026-08-11 (Agnar: „I cant remove some auto generated stuck fake invoice
      // in many companys"): ✕ gerði EKKERT á mörgum skráningum og sagði ekki af
      // hverju. Tvær ástæður, báðar lagaðar hér:
      //
      //  1. `document_pairs` vísar í `customer_documents` með ON DELETE NO ACTION
      //     (bæði invoice_doc_id og report_doc_id). Sé skjalið PARAÐ hafnar
      //     Postgres eyðingunni. Mælt 2026-08-11: 80 af 167 „Stólpi
      //     reikningayfirlit"-röðunum voru læstar svona — sjálfvirki pörunar-
      //     triggerinn (sjá CLAUDE.md) parar þær um leið og þær verða til.
      //  2. supabase-js KASTAR ekki á PostgREST-villu — það skilar {data,error}.
      //     Gamla try/catch-ið greip því aldrei neitt, villan hvarf þegjandi og
      //     chippið kom óbreytt til baka. Þess vegna leit þetta út eins og „fast".
      //
      // Nú er parið losað FYRST (nullum bara þessa hlið; parið sjálft fer ef
      // hvorug hliðin er eftir) og svo eytt — og `error` er LESIÐ, ekki vonað.
      var delDoc=e.target.closest('[data-deldoc]');
      if(delDoc){
        e.preventDefault();
        var did=delDoc.getAttribute('data-deldoc');
        if(!did || did==='undefined' || did==='null'){ alert('Þessi færsla á sér enga skráningu til að eyða (kemur beint úr Sölu).'); return; }
        var ok2 = (window.Confirm&&Confirm.show) ? await Confirm.show('Eyða þessari skráningu af síðunni?\n(skjalið sjálft helst í Google Drive)') : window.confirm('Eyða þessari skráningu af síðunni?');
        if(ok2){
          var sb=SB();
          if(sb){
            try{
              // (1) losa pörin sem vísa í skjalið — annars hafnar FK-in eyðingunni.
              var pr=await sb.from('document_pairs').select('id,report_doc_id,invoice_doc_id')
                .or('report_doc_id.eq.'+did+',invoice_doc_id.eq.'+did);
              if(pr.error) throw pr.error;
              for(var pi=0; pi<(pr.data||[]).length; pi++){
                var pRow=pr.data[pi];
                var keepRep = String(pRow.report_doc_id)===String(did) ? null : pRow.report_doc_id;
                var keepInv = String(pRow.invoice_doc_id)===String(did) ? null : pRow.invoice_doc_id;
                var res;
                if(keepRep==null && keepInv==null){
                  // Parið er tómt eftir losunina — engin ástæða til að geyma það.
                  res=await sb.from('document_pairs').delete().eq('id', pRow.id);
                } else {
                  res=await sb.from('document_pairs').update({
                    report_doc_id: keepRep,
                    invoice_doc_id: keepInv,
                    status: keepInv==null ? 'vantar_reikning' : 'vantar_skyrslu',
                    matched_by: 'manual_unlink'
                  }).eq('id', pRow.id);
                }
                if(res && res.error) throw res.error;
              }
              // (2) eyða skjalaskráningunni sjálfri.
              var dr=await sb.from('customer_documents').delete().eq('id', did);
              if(dr.error) throw dr.error;
            }catch(err){
              alert('Villa við eyðingu: '+((err&&(err.message||err.hint||err.details))||err));
            }
          }
          render(section, coId);
        }
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
        await openInvFromSale(invEl.getAttribute('data-invopen'), coId);
        return;
      }
    });
    // Enable the "🔗 Tengja" button only once an invoice is actually picked
    // in its neighbouring <select> (both live in the same .sk-link-wrap).
    section.addEventListener('change', function(e){
      var sel=e.target.closest && e.target.closest('[data-link-sel]'); if(!sel) return;
      var btn=sel.parentElement && sel.parentElement.querySelector('[data-link-save]');
      if(btn) btn.disabled = (sel.value==='');
      var peek=sel.parentElement && sel.parentElement.querySelector('[data-link-peek]');
      if(peek) peek.disabled = (sel.value==='');
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
  // 2026-08-09 (Agnar: „þarf að force reset og finna fyrirtækið aftur") — inject()
  // teiknaði AÐEINS þegar coId breyttist, svo að koma til baka á SAMA fyrirtæki
  // eftir að reikningur/skýrsla varð til (t.d. R-719 í Klára-að-senda-flæðinu)
  // skildi spjaldið eftir gamalt; fellilistinn sá ekki nýja reikninginn og eina
  // leiðin var hard reload. fetchDocs() er alltaf ferskt — það var bara aldrei
  // KALLAÐ aftur. Þrír kveikjarar (allir debounced á sama tímamæli):
  //   • hashchange        — notandinn kom til baka á fyrirtækið í SPA-leiðsögninni
  //   • visibilitychange  — annar flipi/annað tæki skrifaði á meðan
  //   • customer-doc-written — skýrsla/reikningur varð til í þessari lotu
  //     (168/273/274 dispatch-a þennan atburð eftir vel heppnað insert)
  function _dygRefresh(){
    var s=document.querySelector('._dyg-section'); if(!s) return;
    var id=getCompanyId(); if(!id || String(id)!==String(s.dataset.coId)) return;
    render(s, +s.dataset.coId);
  }
  var _dygRT=0;
  function _dygRefreshSoon(){ clearTimeout(_dygRT); _dygRT=setTimeout(_dygRefresh, 250); }
  window.addEventListener('hashchange', _dygRefreshSoon);
  document.addEventListener('visibilitychange', function(){
    if(document.visibilityState==='visible') _dygRefreshSoon();
  });
  document.addEventListener('customer-doc-written', _dygRefreshSoon);

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
      '.sk-doc.rep.miss{cursor:help;opacity:.62;border-style:dashed;color:#92400e;background:#fffbeb;border-color:#fcd34d}',
      '.sk-doc.inv.miss{cursor:help;opacity:.62;border-style:dashed;color:#92400e;background:#fffbeb;border-color:#fcd34d;padding:4px 7px}',
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
      // 2026-08-07 skissa: stöðumerki í kort-haus + punktar á línum
      '.sk-svc-st{font-size:10px;font-weight:800;letter-spacing:.03em;padding:2px 8px;border-radius:99px;margin-left:auto;white-space:nowrap}',
      '.sk-svc-st.ok{color:#15803d;background:#f0fdf4;border:1px solid #bbf7d0}',
      '.sk-svc-st.part{color:#b45309;background:#fffbeb;border:1px solid #fde68a}',
      '.sk-svc-st.prog{color:#a16207;background:#fef9c3;border:1px solid #fde68a}',
      '.sk-dot{flex:0 0 9px;width:9px;height:9px;border-radius:50%}',
      '.sk-dot.ok{background:#22c55e}',
      '.sk-dot.miss{width:7px;height:7px;flex-basis:7px;background:transparent;border:2px dashed #f59e0b}',
      // samnings-kortin tvö (vinstri 🧯 / hægri 🔥), sami grid og þjónustukortin
      '.sk-samn-grid{margin:8px 0}',
      '.sk-samn-card{display:flex;align-items:center;flex-wrap:wrap;gap:7px;background:var(--bg);border:1px solid var(--brd2,#f1f5f9);border-left:4px solid #3b82f6;border-radius:10px;padding:8px 12px;font-size:13px}',
      '.sk-samn-card.bkc{border-left-color:#ef4444}',
      '.sk-samn-yrs{font-size:11px;font-weight:700;color:var(--ink3);white-space:nowrap}',
      '.sk-samn-pill{margin-left:auto;font-size:10px;font-weight:800;letter-spacing:.03em;padding:2px 9px;border-radius:99px;white-space:nowrap}',
      '.sk-samn-pill.gildi{color:#1d4ed8;background:#eff6ff;border:1px solid #bfdbfe}',
      '.sk-samn-pill.vantar{color:#b45309;background:#fffbeb;border:1px solid #fde68a}',
      '.sk-samn-pill.utrunn{color:#b91c1c;background:#fef2f2;border:1px solid #fecaca}',
      '.sk-month-pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:3px 11px;border-radius:99px;border:1px solid #c7d2fe;background:#eef2ff;color:#3730a3;cursor:pointer;font:inherit;font-variant-numeric:tabular-nums}',
      '.sk-month-pill:hover{background:#e0e7ff}',
      '.sk-month-pill.manual{border-style:dashed;border-color:#f59e0b;background:#fffbeb;color:#92400e}',
      '.sk-month-pill.empty{opacity:.6;border-style:dashed;color:var(--ink4);background:var(--surface)}',
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
      // 2026-08-07 (Agnar): valmyndin á að vera JAFNSTÓR chip-unum, en þemað
      // (245-skinnið) málar öll select stór með !important — svo þessi regla
      // þarf sömu vopn. Stærðirnar spegla .sk-doc (11.5px / 4px 10px).
      '.sk-link-sel{font:inherit!important;font-size:11px!important;font-weight:600!important;padding:3px 8px!important;height:auto!important;min-height:0!important;line-height:1.2!important;max-width:180px!important;border:1px solid var(--brd2,#f1f5f9)!important;border-radius:8px!important;background:var(--surface)!important;box-shadow:none!important;color:var(--ink2,var(--ink1))!important}',
      '.sk-link-btn{all:unset;cursor:pointer;font-size:11px;font-weight:700;padding:3px 9px;border-radius:7px;border:1px solid #99f6e4;color:#0f766e;background:var(--surface)}',
      '.sk-link-btn:disabled{opacity:.4;cursor:default}',
      '.sk-link-peek{all:unset;cursor:pointer;font-size:12px;padding:3px 7px;border-radius:7px;border:1px solid var(--brd2,#f1f5f9);color:var(--ink3);background:var(--surface)}',
      '.sk-link-peek:disabled{opacity:.4;cursor:default}',
      '.sk-yr-add{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-top:10px}',
      '.sk-sub{font-size:11px;color:var(--ink4)}',
      // Skjala-chippar: fast há, þjöppuð leturstærð (yfirskrifar Brunastál-skinnið)
      // + stytting með … svo löng skráarnöfn víkki ekki töfluna endalaust.
      '.sk-card .sk-doc{font-size:11.5px!important;line-height:1.2!important;padding:4px 9px!important;max-width:min(52vw,230px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.sk-card .sk-doc.add{max-width:none}',
      '.sk-pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:3px 11px;border-radius:99px;border:1px solid var(--brd);background:var(--surface);color:var(--ink4);font-variant-numeric:tabular-nums;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation}',
      '.sk-pill:hover{filter:brightness(.97);box-shadow:0 0 0 2px rgba(0,0,0,.06)}',
      '.sk-pill::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--hairline)}',
      '.sk-pill.ok{border-color:#bbf7d0;background:#f0fdf4;color:#15803d}.sk-pill.ok::before{background:#15803d}',
      '.sk-pill.now{border-color:var(--brd);background:var(--surface2);color:var(--brand)}.sk-pill.now::before{background:var(--brand)}',
      '.sk-pill.none{opacity:.55}',
      // Glóandi grænn = handvirkt staðfest (human).
      '.sk-pill.both{border-color:#16a34a;background:#dcfce7;color:#14532d}',
      '.sk-pill.both::before{background:#16a34a}',
      '.sk-pill.done{border-color:#16a34a;background:#dcfce7;color:#14532d;box-shadow:0 0 0 1px rgba(22,163,74,.25)}',
      '.sk-pill.done::before{background:#16a34a;box-shadow:0 0 6px 1.5px rgba(22,163,74,.9);animation:sk-glow 1.6s ease-in-out infinite}',
      '@keyframes sk-glow{0%,100%{box-shadow:0 0 5px 1px rgba(22,163,74,.75)}50%{box-shadow:0 0 8px 2.5px rgba(22,163,74,1)}}',
      // Blár = Claude yfirfór (bíður staðfestingar).
      '.sk-pill.claude{border-color:#2563eb;background:#dbeafe;color:#1e3a8a}',
      '.sk-pill.claude::before{background:#2563eb;box-shadow:0 0 5px 1px rgba(37,99,235,.8)}',
      // Appelsínugulur = skýrsla vantar (gap sem Claude fann).
      '.sk-pill.gap{border-color:#f59e0b;background:#fef3c7;color:#92400e}',
      '.sk-pill.gap::before{background:#f59e0b}',
      // ── 3-stiga skjala-factcheck checkmark (2026-08-23): grátt→blátt→grænt ──
      '.sk-dfc{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:19px;height:19px;padding:0;margin:2px 5px 2px 0;border-radius:50%;border:1px solid;font-size:11px;font-weight:800;line-height:1;cursor:pointer;font-family:inherit;user-select:none;-webkit-user-select:none;touch-action:manipulation}',
      '.sk-dfc.grey{background:#f1f5f9;color:#94a3b8;border-color:#cbd5e1}',
      '.sk-dfc.blue{background:#dbeafe;color:#1d4ed8;border-color:#2563eb}',
      '.sk-dfc.green{background:#dcfce7;color:#15803d;border-color:#16a34a}',
      '.sk-dfc:hover{filter:brightness(.97);box-shadow:0 0 0 2px rgba(0,0,0,.08)}'
    ].join('\n');
    var st=document.createElement('style'); st.id='sk-card-css'; st.textContent=css; document.head.appendChild(st);
  }
  // 2026-08-18: Póstafrits-rofinn í hausnum — víxlar fyrirtaeki.payday_delivery
  // milli 'electronic' (póstur AF) og 'both' (póstur Á). Rafræna krafan fer
  // alltaf, óháð rofanum (payday-push þvingar createElectronicInvoice=true).
  document.addEventListener('click', async function(e){
    var b = e.target && e.target.closest ? e.target.closest('.sk-mailpref') : null;
    if(!b) return;
    e.preventDefault();
    var coId = +b.dataset.co; if(!coId) return;
    var turnOff = !b.dataset.off;   // núverandi Á → slökkva
    b.disabled = true;
    try{
      var sb = SB();
      var r = await sb.from('fyrirtaeki').update({ payday_delivery: turnOff ? 'electronic' : 'both' }).eq('id', coId);
      if(r.error) throw r.error;
      try{
        var co = (window.Companies && Companies.list || []).find(function(x){ return +x.id === +coId; });
        if(co) co.payday_delivery = turnOff ? 'electronic' : 'both';
      }catch(_){}
      var sec = b.closest('[data-co-id], #_sk-card, .sk-card') || null;
      if(window.Toast && Toast.show) Toast.show(turnOff ? '📧 Póstafrit SLÖKKT — aðeins rafræn krafa' : '📧 Póstafrit KVEIKT — rafrænt + póstur');
      // Endurteikna hausinn: einfaldast að endursmíða spjaldið.
      var host = document.querySelector('#_sk-doc-card, ._sk-doc-card');
      b.dataset.off = turnOff ? '1' : '';
      b.textContent = turnOff ? '📧 Póstafrit: AF' : '📧 Póstafrit: Á';
      b.style.borderColor = turnOff ? '#fca5a5' : '#a7f3d0';
      b.style.background = turnOff ? '#fef2f2' : '#ecfdf5';
      b.style.color = turnOff ? '#b91c1c' : '#065f46';
    }catch(err){
      alert('Villa við vistun afhendingar: ' + ((err && err.message) || err));
    }finally{ b.disabled = false; }
  }, false);

  // 2026-08-17: dauð skjala-chips (skjal horfið úr Drive) svara smelli með
  // sögunni úr notes — þar stendur hvers vegna hlekkurinn var hreinsaður og
  // „ÞARF AÐ FINNA AFTUR"-áminningin. Betra en þögult dautt span.
  document.addEventListener('click', function(e){
    var m = e.target && e.target.closest ? e.target.closest('.sk-doc.rep.miss') : null;
    if(!m) return;
    e.preventDefault();
    var saga = m.getAttribute('data-misstitle') || '';
    alert('Skjalið er ekki lengur aðgengilegt í Drive — frumritið þarf að finna aftur.\n\nSagan:\n' + (saga || '(engin skráð saga)'));
  }, false);
  console.log('[patch-199] unified Skjöl & viðhengi card installed');
})();
/* === END DOC YEAR GRID === */
