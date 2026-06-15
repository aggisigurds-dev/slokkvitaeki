/* === DOC YEAR GRID v1 ===
 * Per-company "year × document-type" grid in the customer detail page —
 * the layout Agnar mocked up on Miro:
 *     rows: Úttektarskýrsla, Reikningur   ·   columns: last 4 years
 * Source of truth: Supabase `customer_documents` (auto-filled from Drive by the
 * brunaholf indexers), bridged via company.kennitala -> customers_base.id.
 * Each filled cell is a green link that opens the doc in Drive. Injected into
 * #companies-main the same way as patch 111 (Skjöl & skýrslur); read-only v1.
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
  var YEARS = [NOW-3, NOW-2, NOW-1, NOW];

  function getCompanyId(){
    var main=document.getElementById('companies-main'); if(!main) return null;
    var el=main.querySelector('[data-co-id]:not(._cat-section):not(._dyg-section)');
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
    try{ var r=await sb.from('customer_documents').select('id,doc_type,year,drive_file_id,invoice_number,amount').eq('customer_base_id', baseId);
      return r.data||[]; }catch(e){ return []; }
  }

  function cell(docs){
    var bd='border:1px solid #eef1f5;padding:8px;text-align:center';
    if(!docs.length) return '<td style="'+bd+';color:#d1d5db">·</td>';
    var d=docs[0]; var url=driveUrl(d.drive_file_id);
    var label='✓'+(docs.length>1?(' ×'+docs.length):'');
    var inner=url ? '<a href="'+esc(url)+'" target="_blank" rel="noopener" title="Opna í Drive" style="color:#15803d;font-weight:700;text-decoration:none">'+label+' 📄</a>'
                  : '<span style="color:#15803d;font-weight:700">'+label+'</span>';
    return '<td style="'+bd+';background:#f0fdf4;border-color:#bbf7d0">'+inner+'</td>';
  }

  async function render(section, coId){
    var head='<div style="font-weight:700;font-size:14px;color:#0f172a;margin-bottom:8px">📅 Skjöl eftir ári</div>';
    section.innerHTML=head+'<div style="color:#94a3b8;font-size:13px">Hleð…</div>';
    var co=getCompany(coId);
    // The visit-workflow page (patch 165) doesn't populate window.Companies.list,
    // so fall back to reading the kennitala straight from fyrirtaeki by id.
    var kt = co ? co.kennitala : await ktForCoId(coId);
    if(!kt){ section.innerHTML=head+'<div style="color:#94a3b8;font-size:13px">Vantar kennitölu.</div>'; return; }
    var baseId = await baseIdForKt(kt);
    if(!baseId){
      section.innerHTML=head+'<div style="color:#94a3b8;font-size:13px">Ekki enn tengt grunnskrá (customers_base)'+(kt?(' · kt '+esc(dash(kt))):' · vantar kennitölu')+' — því engin árayfirlit hér.</div>';
      return;
    }
    var docs=await fetchDocs(baseId);
    var th='text-align:center;color:#64748b;font-size:12px;padding:6px 10px;border:1px solid #eef1f5;background:#f8fafc';
    var rh='font-weight:600;color:#374151;font-size:13px;padding:6px 12px;border:1px solid #eef1f5;white-space:nowrap;text-align:left';
    function byTY(type,y){ return docs.filter(function(d){ return d.doc_type===type && String(d.year)===String(y); }); }
    var html=head
      + '<div style="overflow:auto"><table style="border-collapse:collapse;font-size:13px">'
      + '<thead><tr><th style="'+th+'"></th>'+YEARS.map(function(y){return '<th style="'+th+'">'+y+'</th>';}).join('')+'</tr></thead><tbody>'
      + '<tr><td style="'+rh+'">Úttektarskýrsla</td>'+YEARS.map(function(y){return cell(byTY('uttektarskyrsla',y));}).join('')+'</tr>'
      + '<tr><td style="'+rh+'">Reikningur</td>'+YEARS.map(function(y){return cell(byTY('reikningur',y));}).join('')+'</tr>'
      + '</tbody></table></div>'
      + '<div style="font-size:11px;color:#94a3b8;margin-top:6px">Grænn ✓ = skjal á skrá (smelltu til að opna í Drive). Sjálfkrafa úr customer_documents.</div>';
    section.innerHTML=html;
  }

  function inject(){
    var main=document.getElementById('companies-main'); if(!main) return;
    var coId=getCompanyId(); if(!coId) return;
    var existing=main.querySelector('._dyg-section');
    if(existing){ if(String(existing.dataset.coId)!==String(coId)){ existing.dataset.coId=coId; render(existing,coId); } return; }
    var section=document.createElement('div');
    section.className='_dyg-section';
    section.dataset.coId=coId;
    section.style.cssText='background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px;margin:14px 0;box-shadow:0 1px 2px rgba(16,24,40,.04)';
    var att=main.querySelector('._cat-section');
    if(att) main.insertBefore(section, att); else main.appendChild(section);
    render(section, coId);
  }

  var _t=0;
  var mo=new MutationObserver(function(){ clearTimeout(_t); _t=setTimeout(inject, 500); });
  (function start(){ var main=document.getElementById('companies-main'); if(!main){ setTimeout(start,800); return; } mo.observe(main,{childList:true}); inject(); })();
})();
/* === END DOC YEAR GRID === */
