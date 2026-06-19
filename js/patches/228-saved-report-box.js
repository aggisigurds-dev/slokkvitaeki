/* 228-saved-report-box.js — surface the SAVED (óklárað) inspection report.
 *
 * Patch 227 backs up the inspection working state (slokk_trip_<coId>) to the
 * cloud (AppSettings.inspection_trips). This patch makes that saved-but-unfinished
 * report VISIBLE:
 *   1. A special box at the top of the company page: "📝 Óklárað úttekt vistuð"
 *      with a short summary + "Halda áfram ↓" (scrolls to the calculator).
 *   2. window.SavedReports.has(coId) — used by ÞjónustuVerkstæði (patch 190) to
 *      list companies that have a report in progress (badge + 🔵 í vinnslu).
 */
(function () {
  'use strict';
  if (window.__savedReportBox) return;
  window.__savedReportBox = true;

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }

  function tripFor(coId){
    var t=null;
    try { if (window.AppSettings && AppSettings.path) { var all=AppSettings.path('inspection_trips')||{}; t=all[String(coId)]||null; } } catch(_){}
    if (!t) { try { t=JSON.parse(localStorage.getItem('slokk_trip_'+coId)||'null'); } catch(_){} }
    return t;
  }
  // A trip counts as a real saved report only when it carries actual work — not
  // just an auto-seeded default. Returns a summary or null.
  function summarize(t){
    if (!t || typeof t!=='object') return null;
    var unitCount = (t.units && typeof t.units==='object') ? Object.keys(t.units).length : 0;
    var notes=(t.notes||'').trim();
    var insp=(t.skodunaradili||'').trim();
    var manudur=(t.skodun_manudur||'').trim();
    var dags=(t.skodun_dagsetning||'').trim();
    var invtext=(t.invoice_text||'').trim();
    var ath=(t.athugasemdir_skyrsla||'').trim();
    var extras=Array.isArray(t.extras)?t.extras.length:0;
    var meaningful = unitCount>0 || notes || insp || manudur || dags || invtext || ath || extras>0 || (+t.discount_pct>0);
    if (!meaningful) return null;
    return { unitCount:unitCount, notes:notes, insp:insp, manudur:manudur, extras:extras, ts:+t._ts||0 };
  }
  function relTime(ts){
    if (!ts) return '';
    var s=Math.max(0,(Date.now()-ts)/1000);
    if (s<90) return 'rétt í þessu';
    var m=s/60; if (m<90) return Math.round(m)+' mín síðan';
    var h=m/60; if (h<36) return Math.round(h)+' klst síðan';
    return Math.round(h/24)+' daga síðan';
  }

  window.SavedReports = {
    get: tripFor,
    summary: function(coId){ return summarize(tripFor(coId)); },
    has: function(coId){ return !!summarize(tripFor(coId)); }
  };

  // ── company-page special box ──────────────────────────────────────────────
  function getCoId(){
    var main=document.getElementById('companies-main'); if(!main) return null;
    var el=main.querySelector('[data-co-id]'); if(!el) return null;
    var v=el.getAttribute('data-co-id'); return (v&&/^\d+$/.test(v))?+v:null;
  }
  function boxHtml(s){
    var bits=[];
    if (s.unitCount) bits.push(s.unitCount+' tæki valin');
    if (s.insp) bits.push('skoðunaraðili: '+esc(s.insp));
    if (s.manudur) bits.push('mánuður: '+esc(s.manudur));
    if (s.extras) bits.push(s.extras+' aukalínur');
    if (s.notes) bits.push('„'+esc(s.notes.slice(0,60))+(s.notes.length>60?'…':'')+'"');
    var sum = bits.length ? bits.join(' · ') : 'vinnsla í gangi';
    return '<div class="_sr-in">'+
      '<div class="_sr-ic">📝</div>'+
      '<div class="_sr-tx"><div class="_sr-h">Óklárað úttekt vistuð'+(s.ts?(' · '+relTime(s.ts)):'')+'</div>'+
        '<div class="_sr-s">'+sum+'</div></div>'+
      '<button type="button" class="_sr-go">Halda áfram ↓</button>'+
    '</div>';
  }
  function inject(){
    var main=document.getElementById('companies-main'); if(!main) return;
    var coId=getCoId();
    var existing=main.querySelector('._sr-box');
    if(!coId){ if(existing) existing.remove(); return; }
    var s=summarize(tripFor(coId));
    if(!s){ if(existing) existing.remove(); return; }
    if(existing){
      if(existing.dataset.co!==String(coId) || existing.dataset.ts!==String(s.ts)){
        existing.dataset.co=coId; existing.dataset.ts=s.ts; existing.innerHTML=boxHtml(s);
      }
      if(main.firstElementChild!==existing) main.insertBefore(existing, main.firstChild);
      return;
    }
    var box=document.createElement('div'); box.className='_sr-box'; box.dataset.co=coId; box.dataset.ts=s.ts;
    box.innerHTML=boxHtml(s);
    main.insertBefore(box, main.firstChild);
  }
  // delegated "Halda áfram" → scroll to the calculator / tæki list
  document.addEventListener('click', function(e){
    if(e.target && e.target.classList && e.target.classList.contains('_sr-go')){
      var main=document.getElementById('companies-main'); if(!main) return;
      var t=main.querySelector('#_ctc-section')||main.querySelector('.uttekt-col-r')||main.querySelector('.ut-list');
      if(t) t.scrollIntoView({behavior:'smooth', block:'start'});
    }
  });

  var _t=0;
  (function start(){ var m=document.getElementById('companies-main'); if(!m){ setTimeout(start,700); return; }
    new MutationObserver(function(){ clearTimeout(_t); _t=setTimeout(inject,350); }).observe(m,{childList:true}); inject(); })();
  try { if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(inject); } catch(_){}

  if(!document.getElementById('_sr-css')){
    var css=[
      '._sr-box{margin:0 0 14px}',
      '._sr-in{display:flex;align-items:center;gap:12px;background:var(--amb-bg,#fffbeb);border:1px solid var(--amb-bd,#fcd34d);border-radius:12px;padding:11px 14px}',
      '._sr-ic{font-size:20px;line-height:1;flex:none}',
      '._sr-tx{flex:1;min-width:0}',
      '._sr-h{font-size:12.5px;font-weight:800;color:var(--amb,#b45309)}',
      '._sr-s{font-size:12px;color:var(--ink2);margin-top:1px;overflow:hidden;text-overflow:ellipsis}',
      '._sr-go{flex:none;border:0;background:var(--amb,#b45309);color:#fff;border-radius:9px;padding:8px 13px;font:inherit;font-weight:700;font-size:12.5px;cursor:pointer}'
    ].join('\n');
    var st=document.createElement('style'); st.id='_sr-css'; st.textContent=css; document.head.appendChild(st);
  }
  console.log('[patch-228] saved-report box + SavedReports helper installed');
})();
