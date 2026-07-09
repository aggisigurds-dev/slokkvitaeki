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
  var NOW = new Date().getFullYear();

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
    try{ var r=await sb.from('customer_documents').select('id,doc_type,year,drive_file_id,invoice_number,amount,doc_date,notes,fyrirtaeki_id').eq('customer_base_id', baseId);
      return r.data||[]; }catch(e){ return []; }
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
    var u=driveUrl(d.drive_file_id), full=docName(d);
    var disp=full.length>46?full.slice(0,44)+'…':full;
    var chip = u ? '<a class="sk-doc rep" href="'+esc(u)+'" target="_blank" rel="noopener" title="'+esc(full)+' — opna í Drive">📄 '+esc(disp)+'</a>'
                 : '<span class="sk-doc rep" title="'+esc(full)+' (engin Drive-slóð)">📄 '+esc(disp)+'</span>';
    return docWrap(chip, d.id);
  }
  function invDocChip(d){
    var u=driveUrl(d.drive_file_id); var lab=invLabel(d.invoice_number);
    var chip;
    if(u){
      chip = '<a class="sk-doc inv" href="'+esc(u)+'" target="_blank" rel="noopener" title="Opna reikning í Drive">🧾 '+esc(lab)+'</a>';
    } else if(d.invoice_number){
      // 2026-07-09: POS-tengdar skráningar („kt-tengt úr Sölu") hafa EKKERT
      // skjal (drive_file_id null) og teiknuðust sem dautt span — „reikningarnir
      // opnast ekki" (Agnar). Smellur opnar nú reikninginn beint úr sölunni
      // (solur → SalaInvoice.renderFromSale, sama mót og „Prenta aftur" í
      // Bókhalds yfirliti).
      chip = '<button type="button" class="sk-doc inv" data-salenum="'+esc(d.invoice_number)+'" title="Opna reikning úr Sölu">🧾 '+esc(lab)+'</button>';
    } else {
      chip = '<span class="sk-doc inv" title="Ekkert skjal né sölunúmer fylgir þessari skráningu">🧾 '+esc(lab)+'</span>';
    }
    return docWrap(chip, d.id);
  }
  function repAttChip(a){ var nm=String(a.name||'Skoðun'); var disp=nm.length>46?nm.slice(0,44)+'…':nm; return attWrap('<button type="button" class="sk-doc rep" data-att="'+esc(a.id)+'" title="'+esc(nm)+'">📄 '+esc(disp)+'</button>', a.id); }
  function invAttChip(a){ var m=String(a.name||'').match(/R-?\s?\d{3,}/i); return attWrap('<button type="button" class="sk-doc inv" data-att="'+esc(a.id)+'" title="'+esc(a.name)+'">🧾 '+esc(m?invLabel(m[0]):'Reikningur')+'</button>', a.id); }
  function addChip(kind, year, label){ return '<button type="button" class="sk-doc add" data-pick="1" data-kind="'+esc(kind)+'"'+(year?' data-year="'+esc(year)+'"':'')+'>'+esc(label)+'</button>'; }

  function pill(y, hasReport){
    var cls=hasReport?'ok':(y===NOW?'now':'none');
    var tip=hasReport?(y+' — skýrsla á skrá'):(y===NOW?(y+' — í vinnslu'):(y+' — engin skýrsla'));
    return '<span class="sk-pill '+cls+'" title="'+esc(tip)+'">'+String(y).slice(2)+'</span>';
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

    // ── group customer_documents per year/type ──
    var repByY={}, invByY={}, samn=[];
    docs.forEach(function(d){
      var t=d.doc_type, y=parseInt(d.year,10);
      if(t==='samningur'){ samn.push({src:'doc',d:d,year:y||null}); return; }
      if(!(y>=2000&&y<=NOW+1)) return;
      if(t==='uttektarskyrsla') (repByY[y]=repByY[y]||[]).push(d);
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

    // ── year set: every year with anything + the current year, newest first ──
    var ySet={}; ySet[NOW]=1;
    Object.keys(repByY).forEach(function(y){ySet[y]=1;});
    Object.keys(invByY).forEach(function(y){ySet[y]=1;});
    var YEARS=Object.keys(ySet).map(Number).sort(function(a,b){return b-a;});

    // ── status pills ──
    var pills=YEARS.map(function(y){ return pill(y, (repByY[y]||[]).length>0); }).join('');

    // ── samningur strip ──
    samn.sort(function(a,b){return (b.year||0)-(a.year||0);});
    var samnHtml = samn.map(function(s){
      if(s.src==='doc'){ var u=driveUrl(s.d.drive_file_id); var lab='Samningur'+(s.year?(' '+s.year):'');
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
    function invCell(y){
      var arr=invByY[y]||[];
      if(arr.length){ return arr.map(function(x){ return x._att?invAttChip(x._att):invDocChip(x); }).join('')+addChip('reikningur',y,'＋'); }
      if(y===NOW) return addChip('reikningur',y,'+ reikningur');
      return addChip('reikningur',y,'vantar');
    }
    var rows=YEARS.map(function(y){
      var cur=(y===NOW);
      return '<tr><td'+(cur?' style="color:var(--brand)"':'')+'>'+y+'</td>'+
        '<td>'+repCell(y)+'</td>'+
        '<td>'+invCell(y)+'</td></tr>';
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
      '<table class="sk-grid"><thead><tr><th>Ár</th><th>Úttektarskýrsla</th><th>Reikningur</th></tr></thead><tbody>'+rows+'</tbody></table>'+
      '<div class="sk-strip"><div class="sk-strip-l">📎 Önnur viðhengi</div><div class="sk-strip-r">'+otherHtml+'</div></div>'+
      notLinked + fixLink;
  }

  function wire(section){
    section.addEventListener('click', async function(e){
      var coId=+section.dataset.coId; if(!coId) return;
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
      // Skjalalaus reikningsskráning → opna reikninginn beint úr sölunni.
      var saleEl=e.target.closest('[data-salenum]');
      if(saleEl){
        e.preventDefault();
        var num=saleEl.getAttribute('data-salenum');
        // Glugginn er opnaður SYNKRONT í smellinum svo popup-vörn (sérstaklega
        // á síma) loki ekki á hann; innihaldið kemur þegar salan er sótt.
        var win=window.open('','_blank','width=900,height=1100');
        if(!win){ alert('Leyfðu sprettiglugga til að opna reikninginn.'); return; }
        try{ win.document.write('<p style="font-family:sans-serif;padding:24px;color:#334155">Sæki reikning '+esc(num)+'…</p>'); }catch(_){}
        try{
          var sb=SB(); if(!sb) throw new Error('engin gagnatenging');
          var rs=await sb.from('solur').select('*').eq('num', num).limit(1);
          var sale=rs&&rs.data&&rs.data[0];
          if(!sale) throw new Error('salan '+num+' fannst ekki í Sölu');
          if(!(window.SalaInvoice&&SalaInvoice.renderFromSale)) throw new Error('reikningsmótið er ekki tiltækt');
          var co=getCompany(coId);
          SalaInvoice.renderFromSale(win, sale, {
            kennitala: (co&&co.kennitala)||sale.customer_kt||'',
            heimilisfang: (co&&co.heimilisfang)||''
          });
        }catch(err){
          try{ win.close(); }catch(_){}
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
      '.sk-doc.rep{background:var(--bg);color:#0f172a;border-color:var(--brd)}',
      '.sk-doc.inv{background:#f0fdf4;color:#15803d;border-color:#bbf7d0}',
      '.sk-doc.prog{background:#fef3c7;color:#92400e;border-color:#fcd34d;font-weight:700}',
      '.sk-doc.add{background:var(--surface);color:var(--ink4);border:1px dashed var(--brd2);font-weight:600}',
      '.sk-doc.add:hover{color:var(--brand);border-color:var(--brand)}',
      '.sk-att-wrap{display:inline-flex;align-items:center;margin:2px 4px 2px 0}',
      '.sk-att-wrap .sk-doc{margin:0}',
      '.sk-att-x{border:1px solid var(--brd);border-left:0;background:var(--surface);color:var(--ink4);cursor:pointer;font-size:10px;padding:4px 6px;border-radius:0 8px 8px 0;line-height:1.2}',
      '.sk-att-x:hover{color:#dc2626;border-color:#fecaca}',
      '.sk-grid{width:100%;border-collapse:collapse;font-size:12.5px}',
      '.sk-grid th{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--ink3);font-weight:700;padding:8px 14px;text-align:left;background:var(--bg)}',
      '.sk-grid td{padding:7px 14px;border-top:1px solid var(--brd2,#f1f5f9);vertical-align:middle}',
      '.sk-grid td:first-child{font-weight:700;color:var(--ink1);width:64px}',
      '.sk-pill{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:700;padding:3px 11px;border-radius:99px;border:1px solid var(--brd);background:var(--surface);color:var(--ink4);font-variant-numeric:tabular-nums}',
      '.sk-pill::before{content:"";width:7px;height:7px;border-radius:50%;background:var(--ink4)}',
      '.sk-pill.ok{border-color:#bbf7d0;background:#f0fdf4;color:#15803d}.sk-pill.ok::before{background:#15803d}',
      '.sk-pill.now{border-color:var(--brd);background:var(--bg);color:var(--brand)}.sk-pill.now::before{background:var(--brand)}',
      '.sk-pill.none{opacity:.55}'
    ].join('\n');
    var st=document.createElement('style'); st.id='sk-card-css'; st.textContent=css; document.head.appendChild(st);
  }
  console.log('[patch-199] unified Skjöl & viðhengi card installed');
})();
/* === END DOC YEAR GRID === */
