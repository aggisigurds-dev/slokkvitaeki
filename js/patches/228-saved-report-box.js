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

  // 2026-09-17: þögnin er RÉTT í báðum köllum — hreinn lestur með varaleið. Bregðist
  // þjóns-lesturinn er reynt localStorage, og skili hvorugt neinu birtist borðinn
  // einfaldlega ekki. Ekkert er skrifað og engin vistuð skýrsla er sögð til sem er ekki.
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

  // 2026-09-12 (Verkefnalisti d4bd85dc): kláruð ferð er EKKI óklárað drög. 165 merkir ferðina
  // _locked + _invoice við „Klára heimsókn"; eldri ferðir bera hvorugt og stóðu því sem
  // „Óklárað úttekt vistuð" ofan á greiddri úttekt (mælt: 124 af 167 opnum ferðum á stöðum
  // með úttektarsölu ársins, t.d. Klaki Tech #466 / R-000677). Gömul ferð (enginn _invoice-
  // lykill) víkur þegar árið er frágengið skv. 271. Ferð sem 328 núllstillti fyrir NÝJA úttekt
  // ber _invoice:null og sést áfram.
  function finished(t, coId){
    if (!t || typeof t!=='object') return false;
    if (t._locked===true || (t._invoice && typeof t._invoice==='object')) return true;
    if (!('_invoice' in t)) {
      try { return !!(window.VisitYearLock && VisitYearLock.isComplete && VisitYearLock.isComplete(coId, new Date().getFullYear())); } catch(_){}
    }
    return false;
  }
  function openSummary(coId){
    var t=tripFor(coId);
    return finished(t, coId) ? null : summarize(t);
  }

  window.SavedReports = {
    get: tripFor,
    summary: openSummary,
    has: function(coId){ return !!openSummary(coId); },
    // 14.10.2026: 462 kallar þetta í sama tifi og borðinn teiknast (sjá SKREF þar) — áður kom kassinn 0,7–3 s síðar
    // og ýtti öllum prófílnum 76 px niður (CLS 0,035 á tölvu, 0,08 á síma, mælt á félagi 1853).
    inject: function(){ inject(); }
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
      '<button type="button" class="_sr-kasta" title="Henda óklárðu úttektinni — hún hverfur af ÞjónustuVerkstæðinu">✕ Henda</button>'+
    '</div>';
  }
  function inject(){
    var main=document.getElementById('companies-main'); if(!main) return;
    var coId=getCoId();
    var existing=main.querySelector('._sr-box');
    if(!coId){ if(existing) existing.remove(); return; }
    var s=openSummary(coId);
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
  /* ── Henda óklárðu úttektinni ───────────────────────────────────────────
   * 21.10.2026 — Agnar: „það var þá eitthvað óvart, en ég þarf að geta hent
   * þessu út einhvernstaðar."
   *
   * Hér var engin útgönguleið. Óvart-vistuð úttekt hékk á fyrirtækjasíðunni
   * OG dró félagið inn á ÞjónustuVerkstæðið (190 setur `hasDraft` í „í
   * vinnslu"), og eina leiðin út var „Afmerkja", sem setur `sv_force_unstarted`
   * — felur félagið af borðinu en skilur drögin eftir.
   *
   * HVERNIG HREINSUNIN VERÐUR AÐ LÍTA ÚT — þrjár leiðir, tvær rangar:
   *  ✗ `{}` á þjóninn. MÆLT 21.10.2026: ferðin stóð óhreyfð eftir. Djúp-merge
   *    af tómum hlut breytir engu; `deepMerge` fjarlægir aldrei lykil.
   *  ✗ `removeItem` einn og sér (legsteinn 227). 165 ber örið: „removeItem-
   *    legsteinninn dugði ekki — keep-skrif á eftir honum (eða computed-skrif
   *    129) af-legsteinaði hann og skýja-mergið hélt gamla búknum."
   *  ✓ NÚLLA HVERN LYKIL sem ferðin á. Núll yfirskrifar í merge, aðgerðin er
   *    idempotent og hún virkar eins á öllum fimm vélunum — sama leið og
   *    `clearTrip` í 165 notar. Lyklarnir eru lesnir úr ferðinni SJÁLFRI (bæði
   *    skýja- og vafra-eintakinu) svo enginn reitur sleppi: fast CLEAR_BODY í
   *    165 nefnir hvorki `skodunaradili` né `skodun_manudur`, og hefði skilið
   *    kassann eftir á skjánum.
   *
   * Og röðin: ÞJÓNNINN FYRST, vafrinn á eftir. Mistakist skrifið stendur allt
   * óhaggað og sagt er frá — annars hyrfi úttektin af ÞESSARI vél og kæmi
   * aftur af hinum við næstu samstillingu.
   *
   * Þetta eru GÖGN (461 telur `slokk_trip_*` til gagna), svo spurt er fyrst og
   * talið upp hverju er hent — ekki þögult hreinsiverk.
   */
  var TRIP_KEY = 'slokk_trip_';   // sama og CHOICE_KEY í 165
  function tomurBukur(coId){
    var lyklar = {};
    try { var sky = (window.AppSettings && AppSettings.path) ? (AppSettings.path('inspection_trips') || {}) : {};
          var c = sky[String(coId)]; if (c && typeof c === 'object') Object.keys(c).forEach(function(k){ lyklar[k] = 1; }); } catch(_){}
    try { var l = JSON.parse(localStorage.getItem(TRIP_KEY + coId) || 'null');
          if (l && typeof l === 'object') Object.keys(l).forEach(function(k){ lyklar[k] = 1; }); } catch(_){}
    var body = {};
    Object.keys(lyklar).forEach(function(k){ if (k !== '_ts' && k !== '_deleted') body[k] = null; });
    body._locked = false; body._doneIds = [];
    return body;
  }
  async function hendaDrogum(coId){
    var s = openSummary(coId); if(!s) return;
    var lysing=[];
    if (s.unitCount) lysing.push(s.unitCount+' tæki valin');
    if (s.extras) lysing.push(s.extras+' aukalínur');
    if (s.insp) lysing.push('skoðunaraðili: '+s.insp);
    if (s.manudur) lysing.push('mánuður: '+s.manudur);
    if (s.notes) lysing.push('minnispunktur');
    var sp = 'Henda óklárðu úttektinni?' +
      (lysing.length ? ('\n\nÞetta fer: ' + lysing.join(' · ')) : '') +
      '\n\nÞetta er ekki hægt að afturkalla.';
    var ja = false;
    try { ja = (window.Confirm && Confirm.show) ? await Confirm.show(sp, { danger: true, okText: 'Henda' }) : window.confirm(sp); } catch(_){ return; }
    if (!ja) return;
    var body = tomurBukur(coId);
    var ok = false;
    try { if (window.AppSettings && AppSettings.save) ok = await AppSettings.save({ inspection_trips: { [String(coId)]: body } }); } catch(_){}
    if (!ok) { if (window.Toast && Toast.show) Toast.show('⚠️ Ekki tókst að henda — úttektin stendur óbreytt'); return; }
    // Vafra-eintakið með sama búk (227 speglar setItem í skýið — idempotent).
    try { localStorage.setItem(TRIP_KEY + coId, JSON.stringify(body)); } catch(_){}
    inject();
    // Borðið les `SavedReports.has` → félagið dettur út úr „í vinnslu".
    try { if (window.ThjonustuVerkstaedi && ThjonustuVerkstaedi.render) ThjonustuVerkstaedi.render(); } catch(_){}
    if (window.Toast && Toast.show) Toast.show('🗑️ Óklárðu úttektinni hent');
  }
  document.addEventListener('click', function(e){
    var b = e.target && e.target.closest && e.target.closest('._sr-kasta');
    if(!b) return;
    var coId=getCoId(); if(!coId) return;
    b.disabled=true;
    hendaDrogum(coId).catch(function(){}).then(function(){ try{ b.disabled=false; }catch(_){} });
  });

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
  // 2026-09-17: þögnin er RÉTT — aðeins skráning á áhorfanda til endurteikningar.
  // Bregðist hún teiknar MutationObserver-inn hér að ofan borðann eftir sem áður.
  try { if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(inject); } catch(_){}

  if(!document.getElementById('_sr-css')){
    var css=[
      '._sr-box{margin:0 0 14px}',
      '._sr-in{display:flex;align-items:center;gap:12px;background:var(--amb-bg,#fffbeb);border:1px solid var(--amb-bd,#fcd34d);border-radius:12px;padding:11px 14px}',
      '._sr-ic{font-size:20px;line-height:1;flex:none}',
      '._sr-tx{flex:1;min-width:0}',
      '._sr-h{font-size:12.5px;font-weight:800;color:var(--amb,#b45309)}',
      '._sr-s{font-size:12px;color:var(--ink2);margin-top:1px;overflow:hidden;text-overflow:ellipsis}',
      '._sr-go{flex:none;border:0;background:var(--amb,#b45309);color:#fff;border-radius:9px;padding:8px 13px;font:inherit;font-weight:700;font-size:12.5px;cursor:pointer}',
      '._sr-kasta{flex:none;border:1px solid #fecaca;background:#fef2f2;color:#b91c1c;border-radius:9px;padding:8px 11px;font:inherit;font-weight:700;font-size:12.5px;cursor:pointer}',
      '._sr-kasta:disabled{opacity:.5;cursor:default}'
    ].join('\n');
    var st=document.createElement('style'); st.id='_sr-css'; st.textContent=css; document.head.appendChild(st);
  }
  console.log('[patch-228] saved-report box + SavedReports helper installed');
})();
