/* === REKSTRARFÉLÖG v1 ===
 * Adds a "Rekstrarfélög" nav tab (after Allir Viðskiptavinir) + a view that lists
 * management/parent companies that operate many buildings/húsfélög.
 *
 * - Data lives in AppSettings.rekstrarfelog (shared, server-backed, editable).
 *   Seeds once from the email-mined defaults if empty.
 * - Per firm: billing emails, building list (with kennitölur), doc counts.
 * - Each building links to its company record via Companies.openDetail(id)
 *   (matched by kennitala against window.Companies.list).
 * - Attach / view documents per firm using window.CompanyAttachments,
 *   keyed to a synthetic firm id, plus quick links to each building's own
 *   attachments.
 * Self-contained add-on — does not edit any core file.
 */
(function(){
  'use strict';
  if (window.__rekstrarfelogInstalled) return;
  window.__rekstrarfelogInstalled = true;

  var SEED = {"Eignaumsjón": {"domain": "eignaumsjon.is", "emails": ["gjaldkeri@eignaumsjon.is", "reikningar@eignaumsjon.is", "solrun@eignaumsjon.is"], "buildings": [{"kt": "5007070110", "nafn": "17.júní Torg 1-7, húsfélag"}, {"kt": "6407891239", "nafn": "Aflagrandi 40,húsfélag"}, {"kt": "5010891769", "nafn": "Bílskýli Dalseli 6-22"}, {"kt": "4410872769", "nafn": "Bólstaðarhlíð 40,húsfélag"}, {"kt": "4309901019", "nafn": "Dofraberg 11, húsfélag"}, {"kt": "4902120190", "nafn": "Flétturimi 10-16,húsfélag"}, {"kt": "6104932389", "nafn": "Flétturimi 16,húsfélag"}, {"kt": "6611191520", "nafn": "Hverfisgata 40, húsfélag"}, {"kt": "4702891989", "nafn": "Húsfélagið Skipholti 50b"}, {"kt": "6105140300", "nafn": "Kirkjulundur 12-14, húsfélag"}, {"kt": "4404023480", "nafn": "Kórsalir 3,húsfélag"}, {"kt": "5612090570", "nafn": "Maltakur 3,húsfélag"}, {"kt": "5009760129", "nafn": "Seljabraut 42, húsfélag"}, {"kt": "6811780159", "nafn": "Skaftahlíð 4-10,húsfélag"}, {"kt": "4406992869", "nafn": "Stigahlíð 26, húsfélag"}, {"kt": "5203240700", "nafn": "Suðurhraun 10, rekstrarfélag"}, {"kt": "4802962579", "nafn": "Sóleyjarhlíð 1, húsfélag"}, {"kt": "5204190120", "nafn": "Tangabryggja 13-15, húsfélag"}, {"kt": "6009740179", "nafn": "Tjarnarból 2, húsfélag"}, {"kt": "5710872199", "nafn": "Tjarnarból 6,húsfélag"}, {"kt": "4810741349", "nafn": "Torfufell 50, húsfélag"}, {"kt": "5606171190", "nafn": "Tungusel 1-7, húsfélag"}, {"kt": "4210081240", "nafn": "Álfaskeið 78-80, húsfélag"}, {"kt": "4409003210", "nafn": "Álfholt 2a,b,c,húsfélag"}, {"kt": "6201850439", "nafn": "Álftamýri 24-30, húsfélag"}, {"kt": "5303911089", "nafn": "Ásholt 2,húsfélag"}], "drive": "https://drive.google.com/drive/folders/15XSiBnb18k8DBFO60uGl2F6RrHWyV6B7"}, "Rekstrarumsjón": {"domain": "rekstrarumsjon.is", "emails": ["reikningar@rekstrarumsjon.is", "umsjon@rekstrarumsjon.is"], "buildings": [{"kt": "5903043440", "nafn": "Burknavellir 5, húsfélag"}, {"kt": "4309901019", "nafn": "Dofraberg 11, húsfélag"}, {"kt": "6706061980", "nafn": "Eskivellir 1, húsfélag"}, {"kt": "5312050490", "nafn": "Eskivellir 5,húsfélag"}, {"kt": "4802962579", "nafn": "Sóleyjarhlíð 1, húsfélag"}, {"kt": "4710023050", "nafn": "Álfaskeið 82-84,húsfélag"}, {"kt": "5311750859", "nafn": "Álfaskeið 98-100, húsfélag"}, {"kt": "4704868139", "nafn": "Álftahólar 4, húsfélag"}], "drive": "https://drive.google.com/drive/folders/1jswqJR8d7Veq2OBvGTmjkowlItoEgnoi"}, "Eignarekstur": {"domain": "eignarekstur.is", "emails": ["eignarekstur@eignarekstur.is", "reikningar@eignarekstur.is"], "buildings": [{"kt": "4804867309", "nafn": "Furugrund 73,húsfélag"}, {"kt": "6301032310", "nafn": "Húsfélagið Bæjarlind 12"}, {"kt": "5208190290", "nafn": "Árskógar 1-3, húsfélag"}, {"kt": "5102932079", "nafn": "Árskógar 6-8,húsfélag"}, {"kt": "6009911169", "nafn": "Þverholt 24,húsfélag"}], "drive": "https://drive.google.com/drive/folders/1OAbAZIc_ImXUp9Dlq7Y2qZkz3Mr9UML-"}, "Heimaleiga": {"domain": "heimaleiga.is", "emails": ["dimka@heimaleiga.is", "erna@heimaleiga.is"], "buildings": [{"kt": "6810130830", "nafn": "Aegina ehf."}, {"kt": "6502220400", "nafn": "EA Law Practice ehf."}, {"kt": "6110962599", "nafn": "Húsfélagið Laugavegi 42"}, {"kt": "6411150100", "nafn": "S&H Invest ehf."}], "drive": "https://drive.google.com/drive/folders/1CZehyhNFnIcO5KaXgKqE5BJRh8Q-FjVx"}, "Fjöleignir": {"domain": "fjoleignir.is", "emails": ["fjoleignir@fjoleignir.is"], "buildings": [{"kt": "5605952559", "nafn": "Gullsmári 11,húsfélag"}, {"kt": "4511901569", "nafn": "Háaleitisbraut 54,húsfélag"}, {"kt": "4701912019", "nafn": "Þúfubarð 19,húsfélag"}], "drive": "https://drive.google.com/drive/folders/1vvOogg-JhQG6BgbMf6vBW8zdkZMe2UAi"}, "Leiguval": {"domain": "leiguval.is", "emails": ["stefan@leiguval.is"], "buildings": [], "drive": "https://drive.google.com/drive/folders/12sTb775IuxDYSkZD76Yz4tDeXVP0ha9T"}};

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function fmtKt(k){ if(!k) return ''; var c=String(k).replace(/\D/g,''); return c.length>=10? c.slice(0,6)+'-'+c.slice(6,10):c; }
  function digits(s){ return String(s||'').replace(/\D/g,''); }

  // ---- data load/save via AppSettings (fallback to localStorage) ----
  function getData(){
    try {
      if (window.AppSettings && typeof AppSettings.path==='function'){
        var b = AppSettings.path('rekstrarfelog');
        if (b && typeof b==='object' && Object.keys(b).length) return b;
      }
    } catch(e){}
    try { var l=JSON.parse(localStorage.getItem('_slokk_rekstrarfelog')||'null'); if(l) return l; } catch(e){}
    return SEED;
  }
  async function saveData(d){
    try { localStorage.setItem('_slokk_rekstrarfelog', JSON.stringify(d)); } catch(e){}
    try { if (window.AppSettings && AppSettings.save) await AppSettings.save({ rekstrarfelog: d }); } catch(e){}
  }

  function companyByKt(kt){
    var list = (window.Companies && Companies.list) || [];
    var d = digits(kt);
    return list.find(function(c){ return digits(c.kennitala)===d; }) || null;
  }

  // ---- attachments helpers (reuse app's CompanyAttachments) ----
  function firmAttachId(firm){ return 'rf:'+firm; } // synthetic id namespace
  async function listFirmDocs(firm){
    try { if(window.CompanyAttachments && CompanyAttachments.list) return (await CompanyAttachments.list(firmAttachId(firm)))||[]; } catch(e){}
    return [];
  }

  // ---- view rendering ----
  var _state={ q:'' };
  function viewEl(){ return document.getElementById('view-rekstrarfelog'); }

  async function renderView(){
    var v=viewEl(); if(!v) return;
    var data=getData();
    var q=_state.q.toLowerCase().trim();
    var html='';
    html+='<div style="max-width:980px;margin:0 auto">';
    html+='<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:6px">'+
          '<h1 style="font-size:22px;margin:0;font-weight:750">Rekstrarfélög</h1>'+
          '<button id="_rf_add" class="btn btn-primary btn-sm" style="padding:8px 14px">+ Nýtt rekstrarfélag</button></div>';
    html+='<p style="color:#64748b;font-size:14px;margin:0 0 14px">Stór félög sem reka mörg húsfélög/byggingar. Smelltu á félag til að sjá byggingar, skjöl og tengiliði.</p>';
    html+='<input id="_rf_q" placeholder="🔎 Leita að félagi, byggingu eða kennitölu…" value="'+esc(_state.q)+'" style="width:100%;border:1px solid #e2e8f0;border-radius:10px;padding:11px 12px;font-size:14px;margin-bottom:16px">';
    html+='<div id="_rf_list"></div></div>';
    v.innerHTML=html;
    v.querySelector('#_rf_q').addEventListener('input', function(e){ _state.q=e.target.value; renderList(); });
    v.querySelector('#_rf_add').addEventListener('click', addFirm);
    renderList();
  }

  function renderList(){
    var v=viewEl(); if(!v) return; var box=v.querySelector('#_rf_list'); if(!box) return;
    var data=getData(); var q=_state.q.toLowerCase().trim();
    var names=Object.keys(data);
    box.innerHTML='';
    var shown=0;
    names.forEach(function(name){
      var info=data[name]; var blds=info.buildings||[];
      var match=!q || name.toLowerCase().indexOf(q)>=0 || (info.emails||[]).some(function(e){return e.toLowerCase().indexOf(q)>=0;}) ||
        blds.some(function(b){return (b.nafn||'').toLowerCase().indexOf(q)>=0 || digits(b.kt).indexOf(q.replace(/\D/g,''))>=0;});
      if(!match) return; shown++;
      var card=document.createElement('div');
      card.style.cssText='background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:16px 18px;margin-bottom:14px;box-shadow:0 1px 2px rgba(16,24,40,.04)';
      var emails=(info.emails||[]).map(function(e){return '<a href="mailto:'+esc(e)+'" style="color:#2563eb;text-decoration:none">'+esc(e)+'</a>';}).join(' · ');
      card.innerHTML=
        '<div class="_rf_head" style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;cursor:pointer">'+
          '<div><div style="font-size:17px;font-weight:700">'+esc(name)+'</div>'+
          '<div style="font-size:13px;color:#64748b;margin-top:3px">📧 '+(emails||'—')+(info.domain?' &nbsp;·&nbsp; '+esc(info.domain):'')+'</div></div>'+
          '<div style="flex:none;background:#eef4ff;color:#2563eb;border-radius:20px;padding:4px 12px;font-size:13px;font-weight:700;white-space:nowrap">'+blds.length+' byggingar</div>'+
        '</div>'+
        '<div class="_rf_toggle" style="font-size:12.5px;color:#2563eb;font-weight:600;margin-top:8px;cursor:pointer">Sjá nánar ▾</div>'+
        '<div class="_rf_body" style="display:none;margin-top:12px;border-top:1px solid #eef1f5;padding-top:10px"></div>';
      var body=card.querySelector('._rf_body');
      function flip(){ var open=body.style.display==='none'; body.style.display=open?'':'none'; card.querySelector('._rf_toggle').textContent=open?'Fela ▴':'Sjá nánar ▾'; if(open) fillBody(body,name,info); }
      card.querySelector('._rf_head').addEventListener('click',flip);
      card.querySelector('._rf_toggle').addEventListener('click',flip);
      box.appendChild(card);
    });
    if(!shown) box.innerHTML='<div style="color:#64748b;padding:16px">Ekkert fannst.</div>';
  }

  async function fillBody(body, name, info){
    body.innerHTML='<div style="color:#94a3b8;font-size:13px">Hleð…</div>';
    var blds=info.buildings||[];
    // building table
    var rows=blds.map(function(b){
      var co=companyByKt(b.kt);
      var link= co ? '<a href="#" data-coid="'+co.id+'" class="_rf_open" style="color:#2563eb;text-decoration:none">'+esc(b.nafn)+'</a>'
                   : esc(b.nafn)+' <span style="color:#cbd5e1;font-size:11px">(ekki í skrá)</span>';
      var doc = co ? '<a href="#" data-coid="'+co.id+'" class="_rf_docs" style="font-size:12px;color:#2563eb">skjöl</a>' : '';
      return '<tr><td style="padding:5px 6px;border-bottom:1px solid #eef1f5">'+link+'</td>'+
             '<td style="padding:5px 6px;border-bottom:1px solid #eef1f5;color:#64748b;font-variant-numeric:tabular-nums">'+fmtKt(b.kt)+'</td>'+
             '<td style="padding:5px 6px;border-bottom:1px solid #eef1f5;text-align:right">'+doc+'</td></tr>';
    }).join('');
    var docs=await listFirmDocs(name);
    var docHtml=docs.length? docs.map(function(d){
      var nm=d.name||d.file||'skjal'; var url=d.drive_url||d.url||'#';
      return '<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid #f1f5f9;font-size:13px">'+
             '<span>📄 '+esc(nm)+'</span>'+(url&&url!=='#'?'<a href="'+esc(url)+'" target="_blank" style="color:#2563eb">opna</a>':'')+'</div>';
    }).join('') : '<div style="color:#94a3b8;font-size:13px;padding:4px 0">Engin skjöl skráð á félagið ennþá.</div>';

    body.innerHTML=
      '<div style="display:flex;gap:18px;flex-wrap:wrap">'+
        '<div style="flex:1;min-width:280px">'+
          '<div style="font-weight:600;font-size:13px;color:#374151;margin-bottom:6px">Byggingar / húsfélög</div>'+
          '<table style="width:100%;border-collapse:collapse;font-size:13.5px"><thead><tr>'+
          '<th style="text-align:left;color:#64748b;font-size:12px;padding:4px 6px;border-bottom:1px solid #eef1f5">Bygging</th>'+
          '<th style="text-align:left;color:#64748b;font-size:12px;padding:4px 6px;border-bottom:1px solid #eef1f5">Kennitala</th>'+
          '<th></th></tr></thead><tbody>'+rows+'</tbody></table>'+
        '</div>'+
        '<div style="flex:1;min-width:260px">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
            '<div style="font-weight:600;font-size:13px;color:#374151">Skjöl félagsins</div>'+
            '<button class="_rf_upload btn btn-ghost btn-sm" style="font-size:12px;padding:4px 10px">+ Hlaða upp</button></div>'+
          (info.drive? '<a href="'+esc(info.drive)+'" target="_blank" style="display:inline-block;margin-bottom:8px;font-size:13px;color:#2563eb;font-weight:600;text-decoration:none">📁 Opna skjalamöppu í Drive →</a>':'')+
          '<div class="_rf_doclist">'+docHtml+'</div>'+
          '<input type="file" class="_rf_file" style="display:none">'+
        '</div>'+
      '</div>';

    // wire building -> company record
    body.querySelectorAll('._rf_open').forEach(function(a){ a.addEventListener('click', function(e){ e.preventDefault(); openCompany(a.getAttribute('data-coid')); }); });
    body.querySelectorAll('._rf_docs').forEach(function(a){ a.addEventListener('click', function(e){ e.preventDefault(); openCompany(a.getAttribute('data-coid')); }); });

    // wire firm upload
    var fileInput=body.querySelector('._rf_file');
    body.querySelector('._rf_upload').addEventListener('click', function(){ fileInput.click(); });
    fileInput.addEventListener('change', async function(){
      if(!fileInput.files || !fileInput.files.length) return;
      var btn=body.querySelector('._rf_upload'); btn.textContent='Hleð upp…'; btn.disabled=true;
      try {
        for (var i=0;i<fileInput.files.length;i++){
          if(window.CompanyAttachments && CompanyAttachments.upload) await CompanyAttachments.upload(firmAttachId(name), fileInput.files[i]);
        }
      } catch(e){ alert('Villa við upphal: '+(e.message||e)); }
      btn.textContent='+ Hlaða upp'; btn.disabled=false;
      fillBody(body,name,info); // refresh
    });
  }

  function openCompany(id){
    if(!id) return;
    var nid = isNaN(id)? id : parseInt(id,10);
    try {
      if(window.Companies && Companies.openDetail){ Companies.openDetail(nid); return; }
      if(window.App && App.switchView){ App.switchView('companies'); }
    } catch(e){ console.warn('openCompany failed', e); }
  }

  async function addFirm(){
    var name=prompt('Nafn rekstrarfélags:'); if(!name) return;
    var email=prompt('Reikninga-netfang (má sleppa):')||'';
    var data=getData();
    if(data[name]){ alert('Félag með þessu nafni er þegar til.'); return; }
    data[name]={ domain:(email.split('@')[1]||''), emails: email?[email]:[], buildings:[] };
    await saveData(data); renderList();
  }

  // ---- nav tab injection (mirrors vidskiptavinir.js pattern) ----
  // NOTE: the app re-renders its nav bar (counts update etc.), which wipes any
  // injected button. So we do NOT latch a one-time flag — instead injectTab runs
  // on an interval and re-adds the button whenever it is missing.
  function showOurView(btn){
    document.querySelectorAll('[id^=view-]').forEach(function(v){ v.style.display='none'; v.classList.remove('active'); });
    var v=viewEl();
    if(!v){ v=document.createElement('div'); v.id='view-rekstrarfelog'; v.className='view'; v.style.cssText='padding:20px';
      var ref=document.getElementById('view-companies')||document.getElementById('view-allir-vidsk');
      if(ref&&ref.parentNode) ref.parentNode.insertBefore(v,ref.nextSibling); else document.body.appendChild(v); }
    v.style.display=''; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    renderView();
  }
  function injectTab(){
    var btns=Array.prototype.slice.call(document.querySelectorAll('.vnav-btn'));
    // prefer to sit right after "Allir Viðskiptavinir"; fall back to companies btn
    var anchor=btns.find(function(b){return b.dataset.view==='allir-vidsk';})
             || btns.find(function(b){return b.dataset.view==='companies';});
    if(!anchor || !anchor.parentElement) return;
    if(anchor.parentElement.querySelector('[data-view="rekstrarfelog"]')) return; // already present
    var btn=anchor.cloneNode(true);
    btn.dataset.view='rekstrarfelog';
    btn.classList.remove('active');
    // robust label: most nav buttons wrap text in a <span>; otherwise set textContent
    var span=btn.querySelector('span');
    if(span){ span.textContent='🏢 Rekstrarfélög'; } else { btn.textContent='🏢 Rekstrarfélög'; }
    // remove any cloned badge/counter nodes
    btn.querySelectorAll('.badge,.count,[class*="badge"],[class*="count"]').forEach(function(n){ n.remove(); });
    btn.removeAttribute('onclick');
    btn.onclick=function(){ showOurView(btn); };
    anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    // hide our view when another nav button is clicked
    document.querySelectorAll('.vnav-btn').forEach(function(b){ if(b===btn) return; b.addEventListener('click', function(){ var v=viewEl(); if(v){ v.style.display='none'; v.classList.remove('active'); } btn.classList.remove('active'); }); });
    console.log('[Rekstrarfélög] tab injected');
  }
  setInterval(injectTab, 1200);
  setTimeout(injectTab, 600);
  window.openRekstrarfelog=function(){ injectTab(); var b=document.querySelector('[data-view="rekstrarfelog"]'); if(b) b.click(); };
})();
