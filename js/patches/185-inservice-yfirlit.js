/* === FYRIRTÆKI Í ÞJÓNUSTU — STAÐA YFIRLIT v1 ===
 * Adds a "📋 Staða — yfirlit" button to the Fyrirtæki í Þjónustu page that
 * opens a single sortable/filterable status table of EVERY service customer:
 * Tæki · úttekt 2024/2025/2026 (green 📄↗ link when a report exists on Drive)
 * · Næsta skoðun, with grand totals + filter chips (vantar 2026 / engin gögn /
 * skoðun liðin). The whole picture of what's left, forgotten, missing.
 *
 * Report status comes from AppSettings.uttekt_files (kt → {year:url}, parsed
 * from the úttektarskýrslu filenames in Drive) + the uttaeki equipment history.
 * Self-contained: injects a button into the companies view, renders into an
 * overlay; touches no core file.
 */
(() => {
  if (window.__inserviceYfirlitInstalled) return;
  window.__inserviceYfirlitInstalled = true;

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function digits(s){ return String(s||'').replace(/\D/g,''); }
  function fmtKt(k){ var c=digits(k); return c.length>=10? c.slice(0,6)+'-'+c.slice(6,10):c; }
  function todayStr(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }

  // ---- equipment index (uttaeki) — same folding as patch 175 ----
  var _equip=null,_equipP=null;
  function _norm(s){ return String(s||'').toLowerCase()
    .replace(/húsfélagið|húsfélag|húsf\.?|rekstrarfélag|bílskýli|bílageymsla|sameign/g,'')
    .replace(/ehf\.?|slf\.?|sf\.?|svf\.?/g,'')
    .replace(/\b\d{3}\s+[a-záðéíóúýþæö]+\.?$/,'')
    .replace(/[^a-z0-9áðéíóúýþæö]+/g,' ').replace(/\s+/g,' ').trim(); }
  function _compact(s){ return _norm(s).replace(/\s+/g,''); }
  function _streetnum(s){ var n=_norm(s); var m=n.match(/([a-záðéíóúýþæö]{3,})\s*(\d+)/); return m?(m[1]+m[2]):''; }
  function _blank(){ return {units:0,y2024:0,y2025:0,y2026:0,next:null}; }
  function _add(e,u){ e.units++; var y=u.last_insp?String(u.last_insp).slice(0,4):null;
    if(y==='2024')e.y2024++; else if(y==='2025')e.y2025++; else if(y==='2026')e.y2026++;
    if(u.next_insp&&(!e.next||u.next_insp<e.next)) e.next=u.next_insp; }
  function getEquip(){
    if(_equip) return Promise.resolve(_equip);
    if(_equipP) return _equipP;
    _equipP=(async function(){
      var SB=(window.DB&&DB.sb)||window.__vdaSB;
      if(!SB){ _equip={match:function(){return null;}}; return _equip; }
      var rows=[],from=0;
      try{ while(true){ var r=await SB.from('uttaeki').select('client,last_insp,next_insp').range(from,from+999);
        if(r.error)break; rows=rows.concat(r.data||[]); if(!r.data||r.data.length<1000)break; from+=1000; if(from>20000)break; } }catch(e){}
      var base={},comp={},street={};
      rows.forEach(function(u){ var b=_norm(u.client); if(!b)return; var c=_compact(u.client),s=_streetnum(u.client);
        (base[b]||(base[b]=_blank())); _add(base[b],u);
        (comp[c]||(comp[c]=_blank())); _add(comp[c],u);
        if(s){ (street[s]||(street[s]=_blank())); _add(street[s],u); } });
      _equip={ match:function(name){ var b=_norm(name); if(base[b])return base[b];
        var c=_compact(name); if(comp[c])return comp[c];
        var s=_streetnum(name); if(s&&street[s])return street[s]; return null; } };
      return _equip;
    })();
    return _equipP;
  }
  function uttektFiles(){ try{ if(window.AppSettings&&AppSettings.path) return AppSettings.path('uttekt_files')||{}; }catch(e){} return {}; }

  function inServiceList(){
    var cos=(window.Companies&&Companies.list)||[];
    return cos.filter(function(c){
      if(c.er_i_thjonustu===true) return true;
      if(window.InServiceClients&&InServiceClients.has) return InServiceClients.has(c.nafn);
      return false;
    });
  }

  var _fltr='all';
  function yCell(done,units,url){
    if(!done) return '<td style="padding:5px 4px;border-bottom:1px solid #eef1f5;text-align:center;color:#d1d5db">·</td>';
    var v=units>0?units:'✓'; var style=url?'color:#15803d;background:#f0fdf4':'color:#1d4ed8;background:#eff6ff';
    var inner=url?'<a href="'+esc(url)+'" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">'+v+' 📄↗</a>':v;
    return '<td style="padding:5px 4px;border-bottom:1px solid #eef1f5;text-align:center;font-weight:700;'+style+'">'+inner+'</td>';
  }
  async function renderOverview(box){
    box.innerHTML='<div style="color:#94a3b8;padding:24px">Hleð…</div>';
    var equip=await getEquip(); var uf=uttektFiles(); var today=todayStr();
    var all=inServiceList().map(function(c){
      var kt=digits(c.kennitala); var st=equip.match(c.nafn)||null; var lks=uf[kt]||{};
      var units=st?st.units:0;
      var d24=(st&&st.y2024>0)||!!lks['2024'], d25=(st&&st.y2025>0)||!!lks['2025'], d26=(st&&st.y2026>0)||!!lks['2026'];
      var hasData=units>0||d24||d25||d26;
      var next=st?st.next:null; var overdue=!!(next&&next<today&&hasData);
      var cls=!hasData?'none':(d26?'done':((d24||d25)?'need':'other'));
      return {c:c,kt:kt,units:units,d24:d24,d25:d25,d26:d26,lks:lks,next:next,overdue:overdue,cls:cls,hasData:hasData};
    });
    var tot={n:all.length,done:0,need:0,none:0,overdue:0};
    all.forEach(function(r){ if(r.cls==='done')tot.done++; else if(r.cls==='need')tot.need++; else if(r.cls==='none')tot.none++; if(r.overdue)tot.overdue++; });
    var rows=all.filter(function(r){ var f=_fltr;
      if(f==='done')return r.cls==='done'; if(f==='need')return r.cls==='need'; if(f==='none')return r.cls==='none'; if(f==='overdue')return r.overdue; return true; });
    rows.sort(function(a,b){ return (a.c.nafn||'').toLowerCase()<(b.c.nafn||'').toLowerCase()?-1:1; });
    function chip(k,l){ var on=_fltr===k; return '<button data-f="'+k+'" class="_isy-chip" style="padding:6px 12px;border:1px solid '+(on?'#0f172a':'#cbd5e1')+';background:'+(on?'#0f172a':'#fff')+';color:'+(on?'#fff':'#475569')+';border-radius:99px;font-size:12.5px;font-weight:600;cursor:pointer">'+l+'</button>'; }
    var bd='1px solid #eef1f5';
    var trs=rows.map(function(r){
      var nm = r.c && r.c.id ? '<a href="#" data-coid="'+r.c.id+'" class="_isy-open" style="color:#2563eb;text-decoration:none">'+esc(r.c.nafn||'—')+'</a>' : esc(r.c.nafn||'—');
      var unitCell='<td style="padding:5px 6px;border-bottom:'+bd+';text-align:center;'+(r.units>0?'font-weight:600':'color:#b45309')+'">'+(r.units>0?r.units:'0')+'</td>';
      var nextCell = r.next ? '<td style="padding:5px 6px;border-bottom:'+bd+';text-align:center;'+(r.overdue?'background:#fef2f2;color:#b91c1c;':'color:#475569;')+'font-variant-numeric:tabular-nums;white-space:nowrap">'+esc(r.next)+(r.overdue?' ⚠':'')+'</td>' : '<td style="padding:5px 6px;border-bottom:'+bd+';text-align:center;color:#cbd5e1">—</td>';
      return '<tr><td style="padding:5px 6px;border-bottom:'+bd+'">'+nm+'</td>'+
        '<td style="padding:5px 6px;border-bottom:'+bd+';color:#64748b;font-variant-numeric:tabular-nums;white-space:nowrap">'+esc(fmtKt(r.kt))+'</td>'+
        unitCell+yCell(r.d24,r.units,r.lks['2024'])+yCell(r.d25,r.units,r.lks['2025'])+yCell(r.d26,r.units,r.lks['2026'])+nextCell+'</tr>';
    }).join('');
    if(!trs) trs='<tr><td colspan="7" style="padding:18px;text-align:center;color:#94a3b8">Ekkert fannst.</td></tr>';
    box.innerHTML=
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap">'+
        '<button id="_isy-back" style="padding:7px 13px;border:1px solid #cbd5e1;background:#fff;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer">‹ Til baka</button>'+
        '<h2 style="margin:0;font-size:18px;font-weight:750">Staða — yfirlit (öll fyrirtæki í þjónustu)</h2>'+
        '<button id="_isy-print" style="margin-left:auto;padding:7px 13px;border:1px solid #0f172a;background:#0f172a;color:#fff;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer">🖨 Prenta skýrslu</button>'+
      '</div>'+
      '<div class="_ovr-totals" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">'+
        '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px 14px;font-size:13px"><b>'+tot.n+'</b> fyrirtæki</div>'+
        '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:8px 14px;font-size:13px;color:#15803d">✓ <b>'+tot.done+'</b> með úttekt 2026</div>'+
        '<div style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:8px 14px;font-size:13px;color:#b7791f">⏳ <b>'+tot.need+'</b> vantar 2026</div>'+
        '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:8px 14px;font-size:13px;color:#b45309">⚠ <b>'+tot.none+'</b> engin gögn</div>'+
        '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:8px 14px;font-size:13px;color:#b91c1c">⏰ <b>'+tot.overdue+'</b> skoðun liðin</div>'+
      '</div>'+
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'+
        chip('all','Allir ('+all.length+')')+chip('done','✓ Með úttekt 2026 ('+tot.done+')')+chip('need','⏳ Vantar 2026 ('+tot.need+')')+chip('none','⚠ Engin gögn ('+tot.none+')')+chip('overdue','⏰ Skoðun liðin ('+tot.overdue+')')+
      '</div>'+
      '<div style="overflow-x:auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr>'+
      ['Fyrirtæki','Kennitala','Tæki','2024','2025','2026','Næsta skoðun'].map(function(h,i){ return '<th style="text-align:'+(i<2?'left':'center')+';color:#64748b;font-size:12px;padding:8px 6px;border-bottom:1px solid #eef1f5">'+h+'</th>'; }).join('')+
      '</tr></thead><tbody>'+trs+'</tbody></table></div>';
    box.querySelector('#_isy-back').onclick=function(){ closeOverview(); };
    var _pb=box.querySelector('#_isy-print'); if(_pb) _pb.onclick=function(){ if(window.SlokkPrint) window.SlokkPrint('Fyrirtæki í þjónustu — staða og úttektir', box); };
    box.querySelectorAll('._isy-chip').forEach(function(c){ c.onclick=function(){ _fltr=c.getAttribute('data-f'); renderOverview(box); }; });
    box.querySelectorAll('._isy-open').forEach(function(a){ a.onclick=function(e){ e.preventDefault(); var id=a.getAttribute('data-coid');
      try{ if(window.Companies&&Companies.openDetail) Companies.openDetail(isNaN(id)?id:parseInt(id,10)); else if(window.VidskDetail&&VidskDetail.show) VidskDetail.show(parseInt(id,10)); }catch(err){} }; });
  }

  function closeOverview(){ var ov=document.getElementById('_isy-view'); if(ov) ov.style.display='none'; }
  function openOverview(){
    // Render into a fixed, body-level overlay so the page re-rendering its
    // own list area can never wipe or hide it.
    var ov=document.getElementById('_isy-view');
    if(!ov){
      ov=document.createElement('div'); ov.id='_isy-view';
      ov.style.cssText='position:fixed;inset:0;background:#f8fafc;z-index:99999;overflow:auto;padding:18px 20px 60px';
      var inner=document.createElement('div'); inner.id='_isy-inner'; inner.style.cssText='max-width:1100px;margin:0 auto';
      ov.appendChild(inner); document.body.appendChild(ov);
    }
    ov.style.display=''; renderOverview(document.getElementById('_isy-inner'));
  }

  function ensureButton(){
    var m=document.getElementById('companies-main'); if(!m||!m.parentElement) return;
    if(document.getElementById('_isy-btn')) return;
    var bar=document.createElement('div'); bar.id='_isy-btnbar'; bar.style.cssText='display:flex;justify-content:flex-end;padding:8px 12px 0';
    var b=document.createElement('button'); b.id='_isy-btn'; b.textContent='📋 Staða — yfirlit';
    b.style.cssText='padding:8px 14px;border:1px solid #0f172a;background:#0f172a;color:#fff;border-radius:9px;font-weight:600;font-size:13px;cursor:pointer';
    b.onclick=openOverview; bar.appendChild(b);
    m.parentElement.insertBefore(bar, m);
  }
  setInterval(ensureButton, 1500);
  setTimeout(ensureButton, 800);
})();
