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

  // ---- inline SVG icons (Lucide-style) + scoped styles for the redesigned cards ----
  // 2026-06-19: cleaner master cards (icon avatar + email chips + building count)
  // + a tidier detail table. Colours come from var(--brand) so the active theme
  // (ember by default, or the user's custom accent) is respected — nothing hardcoded.
  var SVG = {
    building:'<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/><path d="M9 9h.01M9 12h.01M9 15h.01M9 18h.01"/></svg>',
    layers:'<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/></svg>',
    mail:'<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/></svg>',
    globe:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20"/></svg>',
    hash:'<svg viewBox="0 0 24 24"><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/></svg>',
    phone:'<svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    user:'<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    chev:'<svg viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>'
  };
  function injectStyles(){
    if(document.getElementById('_rf-styles')) return;
    var s=document.createElement('style'); s.id='_rf-styles';
    var P='#view-rekstrarfelog ';
    s.textContent=[
      // master card
      P+'.rf-card{background:var(--surface);border:1px solid var(--brd);border-radius:14px;margin-bottom:14px;box-shadow:0 1px 2px rgba(16,24,40,.04);overflow:hidden;transition:box-shadow .15s,border-color .15s}',
      P+'.rf-card:hover{box-shadow:0 4px 16px rgba(16,24,40,.08);border-color:var(--brd2)}',
      P+'.rf-head{display:flex;align-items:center;gap:14px;padding:15px 17px;cursor:pointer}',
      P+'.rf-ava{width:42px;height:42px;border-radius:11px;flex:none;display:grid;place-items:center;color:var(--brand);background:color-mix(in srgb,var(--brand) 12%,var(--surface));border:1px solid color-mix(in srgb,var(--brand) 24%,var(--surface))}',
      P+'.rf-ava svg{width:22px;height:22px}',
      P+'.rf-name{font-size:16px;font-weight:700;color:var(--ink1);line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      P+'.rf-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}',
      P+'.rf-chip{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;border-radius:7px;padding:3px 8px;border:1px solid var(--brd);background:var(--surface2);color:var(--ink2);text-decoration:none;max-width:260px}',
      P+'.rf-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      P+'.rf-chip svg{width:12px;height:12px;opacity:.7;flex:none}',
      P+'a.rf-chip.mail{color:var(--brand);background:color-mix(in srgb,var(--brand) 8%,var(--surface));border-color:color-mix(in srgb,var(--brand) 22%,var(--surface))}',
      P+'a.rf-chip.mail:hover{background:color-mix(in srgb,var(--brand) 16%,var(--surface))}',
      P+'a.rf-chip.mail svg{opacity:.95}',
      P+'.rf-count{flex:none;display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:var(--ink2);background:var(--surface2);border:1px solid var(--brd);border-radius:99px;padding:6px 13px;white-space:nowrap}',
      P+'.rf-count b{color:var(--ink1);font-variant-numeric:tabular-nums}',
      P+'.rf-count svg{width:15px;height:15px;color:var(--ink3);flex:none}',
      P+'.rf-chev{flex:none;color:var(--ink3);display:grid;place-items:center;transition:transform .2s}',
      P+'.rf-chev svg{width:20px;height:20px}',
      P+'.rf-notewrap{padding:0 17px 14px}',
      P+'.rf-body{border-top:1px solid var(--brd);padding:15px 17px}',
      P+'.rf-ava svg,'+P+'.rf-chip svg,'+P+'.rf-count svg,'+P+'.rf-chev svg{stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
      // tidy detail table
      P+'.rf-tblwrap{overflow-x:auto;border:1px solid var(--brd);border-radius:11px;background:var(--surface)}',
      P+'.rf-tbl{width:100%;border-collapse:separate;border-spacing:0;font-size:13px}',
      P+'.rf-tbl thead th{text-align:left;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--ink3);padding:9px 10px;border-bottom:1px solid var(--brd);background:var(--surface2);white-space:nowrap}',
      P+'.rf-tbl thead th.c{text-align:center}',
      P+'.rf-tbl tbody tr{transition:background .12s}',
      P+'.rf-tbl tbody tr:hover{background:var(--surface2)}',
      // 2026-06-19: under any DARK theme give the page a rich black → brand
      // gradient (Grafít/Miðnætti brand = dökkblátt → svart+dökkblár stigull).
      'html[data-thm-dark="1"] #view-rekstrarfelog{background:radial-gradient(900px 520px at 85% -8%,color-mix(in srgb,var(--thm-brand) 45%,transparent),transparent 62%),linear-gradient(168deg,#05070d 0%,color-mix(in srgb,var(--thm-brand) 26%,#05070d) 125%)!important}',
      // metallic "plate" look for the cards under dark themes (beveled, brand-tinted)
      'html[data-thm-dark="1"] #view-rekstrarfelog .rf-card{background:linear-gradient(176deg,color-mix(in srgb,var(--thm-brand) 13%,#1b1f26) 0%,#15181d 60%,#101319 100%)!important;border:1px solid color-mix(in srgb,var(--thm-brand) 20%,#2b303a)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 18px 42px -22px rgba(0,0,0,.95)!important}',
      'html[data-thm-dark="1"] #view-rekstrarfelog .rf-card:hover{box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 24px 54px -22px rgba(0,0,0,1),0 0 0 1px color-mix(in srgb,var(--thm-brand) 30%,transparent)!important}'
    ].join('');
    document.head.appendChild(s);
  }

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
  // Per-building attach key: the company record id when the building is in the
  // customer registry, else a synthetic 'rfb:<kt>' namespace (same
  // company_attachments storage either way).
  function bldAttachKey(b, co){
    if(co) return String(co.id);
    var d=digits(b.kt); return 'rfb:'+(d||_compact(b.nafn||''));
  }
  // 2026-06-10: per-building úttektarskýrslu link key. Several buildings can
  // share ONE kennitala (e.g. Heimaleiga ehf operates Laugavegur 1/18,
  // Urðarhvarf 2/4, Hamraborg 7, …) so a kt-only key would collapse them onto
  // the same link. Key by kt + the exact building name instead; the lookups
  // fall back to the legacy kt-only key so existing single-building links keep
  // working untouched.
  function bldLinkKey(b){ return digits(b.kt)+'::'+String(b.nafn||''); }
  // Year-tagged uploaded file for a (building, year): explicit tag wins, then
  // filename detection for untagged files; year==='0' = explicitly cleared.
  function fileForYear(caMap, key, y){
    var list = caMap[key]; if(!Array.isArray(list)) return null;
    return list.find(function(x){ return String(x.year)===y; }) ||
           list.find(function(x){ return x.year==null && new RegExp('\\b'+y+'\\b').test(String(x.name||'')); }) || null;
  }
  function getCaMap(){
    try { if(window.AppSettings&&AppSettings.path) return AppSettings.path('company_attachments')||{}; } catch(e){}
    return {};
  }

  // ---- equipment / inspection index (uttaeki.last_insp / next_insp) ----
  // Each fire unit records its most recent inspection (last_insp) and next-due
  // date (next_insp). We match a building name to its units (handling the messy
  // free-text client field) and roll up per-year counts + the earliest next-due.
  var _equip=null, _equipPromise=null;
  function _norm(s){ return String(s||'').toLowerCase()
      .replace(/húsfélagið|húsfélag|húsf\.?|rekstrarfélag|bílskýli|bílageymsla|sameign/g,'')
      .replace(/ehf\.?|slf\.?|sf\.?|svf\.?/g,'')
      .replace(/\b\d{3}\s+[a-záðéíóúýþæö]+\.?$/,'')   // trailing postcode + city
      .replace(/[^a-z0-9áðéíóúýþæö]+/g,' ').replace(/\s+/g,' ').trim(); }
  function _compact(s){ return _norm(s).replace(/\s+/g,''); }
  function _streetnum(s){ var n=_norm(s); var m=n.match(/([a-záðéíóúýþæö]{3,})\s*(\d+)/); return m?(m[1]+m[2]):''; }
  function _blank(){ return {units:0,y2024:0,y2025:0,y2026:0,next:null}; }
  function _add(e,u){ e.units++; var y=u.last_insp?String(u.last_insp).slice(0,4):null;
    if(y==='2024')e.y2024++; else if(y==='2025')e.y2025++; else if(y==='2026')e.y2026++;
    if(u.next_insp&&(!e.next||u.next_insp<e.next)) e.next=u.next_insp; }
  async function getEquipIndex(){
    if(_equip) return _equip;
    if(_equipPromise) return _equipPromise;
    _equipPromise=(async function(){
      var SB=window.__vdaSB||(window.DB&&DB.sb);
      if(!SB){ _equip={match:function(){return null;}}; return _equip; }
      var rows=[],from=0;
      try{ while(true){ var r=await SB.from('uttaeki').select('client,last_insp,next_insp').range(from,from+999);
        if(r.error)break; rows=rows.concat(r.data||[]); if(!r.data||r.data.length<1000)break; from+=1000; if(from>20000)break; } }catch(e){}
      var base={},comp={},street={};
      rows.forEach(function(u){ var b=_norm(u.client); if(!b)return; var c=_compact(u.client), s=_streetnum(u.client);
        (base[b]||(base[b]=_blank())); _add(base[b],u);
        (comp[c]||(comp[c]=_blank())); _add(comp[c],u);
        if(s){ (street[s]||(street[s]=_blank())); _add(street[s],u); } });
      _equip={ match:function(name){ var b=_norm(name); if(base[b])return base[b];
        var c=_compact(name); if(comp[c])return comp[c];
        var s=_streetnum(name); if(s&&street[s])return street[s]; return null; } };
      return _equip;
    })().catch(function(e){
      // 2026-06-12: höfnuð promise sat áður föst í cache-inu — hver einasta
      // útvíkkun eftir það strandaði á „Hleð…". Hreinsa svo retry virki.
      console.warn('[rekstrarfelog] equip index', e);
      _equipPromise=null;
      return { match:function(){return null;} };
    });
    return _equipPromise;
  }
  function _todayStr(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }

  // 2026-06-14 (Todoist): shared-kennitala report bleed. Heimaleiga ehf (kt
  // 510117-0690) runs many buildings (Freyjugata 16, Laugavegur 1/18, Urðarhvarf
  // 2/4, Hamraborg 7 …). Úttektarskýrslur are attached to the *company* record
  // (matched by kt), so every sibling building showed the same report — e.g.
  // Freyjugata's on all of them. For a SHARED kt we now only show a report whose
  // file name matches that building's street + house-number. Unique-kt buildings
  // are completely untouched (fall through to the original fileForYear).
  function sharedKtSet(){
    var data=getData(), counts={}, set={};
    Object.keys(data).forEach(function(n){ (((data[n]||{}).buildings)||[]).forEach(function(b){
      var d=digits(b.kt); if(d) counts[d]=(counts[d]||0)+1; }); });
    Object.keys(counts).forEach(function(d){ if(counts[d]>1) set[d]=true; });
    return set;
  }
  // street prefix (declension-proof) + house number that identifies one building
  function _bldSig(b){
    var m=_norm(((b&&b.nafn)||'')+' '+((b&&b.heimilisfang)||'')).match(/([a-záðéíóúýþæö]{4,})\s*(\d+)[a-d]?/);
    return m ? { street:m[1].slice(0,6), num:m[2] } : null;
  }
  function fileMatchesBuilding(file,b){
    var hay=_norm(file&&(file.name||file.file||'')); if(!hay) return false;
    // (a) street prefix + house number both present in the file name
    var sig=_bldSig(b);
    if(sig && hay.indexOf(sig.street)>=0 && new RegExp('(^|\\D)'+sig.num+'(\\D|$)').test(hay)) return true;
    // (b) a parenthetical building alias, e.g. "Laugavegur 1 (Ice Apartments)"
    //     → matches a report named "ice apartments …" that carries no address.
    var al=(String((b&&b.nafn)||'').match(/\(([^)]+)\)/)||[])[1];
    if(al){ al=_norm(al); if(al.length>=4 && hay.indexOf(al)>=0) return true; }
    return false;
  }
  // building-aware fileForYear: when the kt is shared, require the file name to
  // match THIS building; otherwise identical to the plain fileForYear.
  function fileForYearBld(caMap,key,y,b,ktShared){
    if(!ktShared) return fileForYear(caMap,key,y);
    var list=caMap[key]; if(!Array.isArray(list)) return null;
    return list.find(function(x){ return String(x.year)===y && fileMatchesBuilding(x,b); }) ||
           list.find(function(x){ return x.year==null && new RegExp('\\b'+y+'\\b').test(String(x.name||'')) && fileMatchesBuilding(x,b); }) || null;
  }

  // ---- view rendering ----
  // sortKey/'sortDir': röðun yfirlitstöflunnar — '' = sjálfgefin (félag+bygging)
  var _state={ q:'', mode:'firms', fltr:'all', sortKey:'', sortDir:1 };
  function viewEl(){ return document.getElementById('view-rekstrarfelog'); }

  async function renderView(){
    var v=viewEl(); if(!v) return;
    injectStyles();
    var data=getData();
    var q=_state.q.toLowerCase().trim();
    var html='';
    html+='<div style="max-width:980px;margin:0 auto">';
    html+='<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:4px">'+
          '<h1 style="font-size:24px;margin:0;font-weight:800;letter-spacing:-.02em;color:var(--ink1)">Rekstrarfélög</h1>'+
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
            '<a href="/rekstrarfelog-uttektir.xlsx" download style="padding:8px 14px;text-decoration:none;border:1px solid var(--brd);border-radius:9px;color:var(--ink2);font-weight:600;font-size:13px;background:var(--surface)">📊 Aðgerðalisti (Excel)</a>'+
            '<button id="_rf_add" class="btn btn-primary btn-sm" style="padding:8px 14px;border-radius:9px">+ Nýtt rekstrarfélag</button>'+
          '</div></div>';
    html+='<p style="color:var(--ink3);font-size:13.5px;margin:0 0 16px;max-width:640px">Stór félög sem reka mörg húsfélög/byggingar. Smelltu á félag til að sjá byggingar, skjöl og tengiliði.</p>';
    html+='<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">'+
          '<button id="_rf_m_firms" class="_rf_modebtn">🏢 Eftir félögum</button>'+
          '<button id="_rf_m_all" class="_rf_modebtn">📋 Allar byggingar (yfirlit)</button>'+
          '</div>';
    html+='<input id="_rf_q" placeholder="🔎 Leita að félagi, byggingu eða kennitölu…" value="'+esc(_state.q)+'" style="width:100%;border:1px solid var(--brd);border-radius:11px;padding:12px 14px;font-size:14px;margin-bottom:18px;background:var(--surface);box-sizing:border-box;outline:none">';
    html+='<div id="_rf_list"></div><div id="_rf_overview" style="display:none"></div></div>';
    v.innerHTML=html;
    function styleModeBtns(){
      [['_rf_m_firms','firms'],['_rf_m_all','all']].forEach(function(p){
        var b=v.querySelector('#'+p[0]); if(!b) return; var on=_state.mode===p[1];
        b.style.cssText='padding:8px 14px;border:1px solid '+(on?'var(--brand)':'var(--brd2)')+';background:'+(on?'var(--brand)':'var(--surface)')+';color:'+(on?'#fff':'var(--ink2)')+';border-radius:9px;font-size:13px;font-weight:600;cursor:pointer';
      });
    }
    function applyMode(){
      var list=v.querySelector('#_rf_list'), ov=v.querySelector('#_rf_overview');
      if(_state.mode==='all'){ list.style.display='none'; ov.style.display=''; renderOverview(); }
      else { ov.style.display='none'; list.style.display=''; renderList(); }
      styleModeBtns();
    }
    v.querySelector('#_rf_q').addEventListener('input', function(e){ _state.q=e.target.value; if(_state.mode==='all') renderOverview(); else renderList(); });
    v.querySelector('#_rf_add').addEventListener('click', addFirm);
    v.querySelector('#_rf_m_firms').addEventListener('click', function(){ _state.mode='firms'; applyMode(); });
    v.querySelector('#_rf_m_all').addEventListener('click', function(){ _state.mode='all'; applyMode(); });
    applyMode();
  }

  // ---- combined overview: all buildings across all firms (totals + flat table) ----
  function computeBldStatus(b, equip, attMap, linkMap, today, caMap, sharedKt){
    var co=companyByKt(b.kt);
    var st=equip.match(b.nafn);
    var ktShared=!!(sharedKt&&sharedKt[digits(b.kt)]);
    var att=((!ktShared)&&co&&(attMap[co.id]||attMap[String(co.id)]))||[0,0,0];
    var lks=linkMap[bldLinkKey(b)]||(ktShared?null:linkMap[digits(b.kt)])||{};
    var akey=bldAttachKey(b,co);
    var f23=fileForYearBld(caMap,akey,'2023',b,ktShared),f24=fileForYearBld(caMap,akey,'2024',b,ktShared),
        f25=fileForYearBld(caMap,akey,'2025',b,ktShared),f26=fileForYearBld(caMap,akey,'2026',b,ktShared);
    var units=st?st.units:0;
    var e24=st?st.y2024:0,e25=st?st.y2025:0,e26=st?st.y2026:0;
    var d24=(e24>0)||!!att[0]||!!lks['2024']||!!f24, d25=(e25>0)||!!att[1]||!!lks['2025']||!!f25, d26=(e26>0)||!!att[2]||!!lks['2026']||!!f26;
    var hasRep=!!(att[0]||att[1]||att[2]||f24||f25||f26);
    var lkYears=Object.keys(lks);
    var hasData=units>0||hasRep||d24||d25||d26||lkYears.length>0||!!f23;
    var next=st?st.next:null;
    var overdue=!!(next&&next<today&&hasData);
    var cls = !hasData?'none':(d26?'done':((d24||d25)?'need':'other'));
    return {co:co,units:units,att:att,lks:lks,akey:akey,f23:f23,f24:f24,f25:f25,f26:f26,d23:(!!lks['2023'])||!!f23,d24:d24,d25:d25,d26:d26,hasRep:hasRep,next:next,overdue:overdue,cls:cls,hasData:hasData};
  }
  // shared link renderer for a year-tagged file: Drive-external files
  // (drive_url, no Storage path) link straight out; Storage uploads open via
  // a signed URL through patch 187's _yr-att handler.
  function fileLinkA(file, y, label){
    var title=esc(file.name||'')+' — skjal tengt við '+y+' í fyrirtækinu';
    if(file.drive_url||file.url) return '<a href="'+esc(file.drive_url||file.url)+'" target="_blank" rel="noopener" title="'+title+'" style="color:inherit;text-decoration:none">'+label+' 📄↗</a>';
    return '<a href="#" class="_yr-att" data-path="'+esc(file.path||'')+'" title="'+title+'" style="color:inherit;text-decoration:none">'+label+' 📄</a>';
  }
  function yCellO(done, rep, units, url, file, y){
    var bd='1px solid var(--brd)';
    if(!done) return '<td style="padding:6px 4px;border-bottom:'+bd+';text-align:center;color:var(--ink4)">·</td>';
    var v=units>0?units:'✓'; var greenish=rep||url||file;
    var col=greenish?'#15803d':'var(--brand)', dot=greenish?'#1C8F60':'#3b82f6';
    var inner=url?'<a href="'+esc(url)+'" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">'+v+' 📄↗</a>'
      : (file?fileLinkA(file,y,v)
      : (v+(rep?' 📄':'')));
    return '<td style="padding:6px 4px;border-bottom:'+bd+';text-align:center">'+
      '<span style="display:inline-flex;align-items:center;gap:5px;font-weight:700;font-size:12.5px;color:'+col+'">'+
      '<span style="width:6px;height:6px;border-radius:50%;background:'+dot+';flex:0 0 auto"></span>'+inner+'</span></td>';
  }
  async function renderOverview(){
    var v=viewEl(); if(!v) return; var box=v.querySelector('#_rf_overview'); if(!box) return;
    box.innerHTML='<div style="color:var(--ink4);padding:16px">Hleð…</div>';
    var data=getData(); var equip=await getEquipIndex();
    var attMap={},linkMap={};
    try{ if(window.AppSettings&&AppSettings.path){ attMap=AppSettings.path('rf_uttekt_att')||{}; linkMap=AppSettings.path('rf_uttekt_links')||{}; } }catch(e){}
    var caMap=getCaMap();
    var sharedKt=sharedKtSet();
    var today=_todayStr();
    var all=[], firms=0;
    Object.keys(data).forEach(function(name){ var blds=(data[name].buildings)||[]; if(blds.length) firms++;
      blds.forEach(function(b,bi){ all.push({firm:name,b:b,bi:bi,s:computeBldStatus(b,equip,attMap,linkMap,today,caMap,sharedKt)}); }); });
    var tot={byg:all.length,done:0,need:0,none:0,overdue:0};
    all.forEach(function(r){ if(r.s.cls==='done')tot.done++; else if(r.s.cls==='need')tot.need++; else if(r.s.cls==='none')tot.none++; if(r.s.overdue)tot.overdue++; });
    var f=_state.fltr||'all', q=_state.q.toLowerCase().trim();
    var rows=all.filter(function(r){
      if(q && !(r.firm.toLowerCase().indexOf(q)>=0 || (r.b.nafn||'').toLowerCase().indexOf(q)>=0 || digits(r.b.kt).indexOf(q.replace(/\D/g,''))>=0)) return false;
      if(f==='done')return r.s.cls==='done'; if(f==='need')return r.s.cls==='need'; if(f==='none')return r.s.cls==='none'; if(f==='overdue')return r.s.overdue; return true;
    });
    // 2026-06-12 (Todoist): smellt á dálkhaus raðar eftir honum (▲/▼ togglar);
    // án vals gildir gamla röðunin félag → bygging.
    function sortVal(r,k){
      switch(k){
        case 'firm':  return r.firm||'';
        case 'byg':   return r.b.nafn||'';
        case 'kt':    return digits(r.b.kt)||'';
        case 'taeki': return +r.s.units||0;
        case 'y23':   return (r.s.d23?1:0)*100000+(+r.s.units||0);
        case 'y24':   return (r.s.d24?1:0)*100000+(+r.s.units||0);
        case 'y25':   return (r.s.d25?1:0)*100000+(+r.s.units||0);
        case 'y26':   return (r.s.d26?1:0)*100000+(+r.s.units||0);
        case 'next':  return r.s.next||'9999-12-31';
        default: return '';
      }
    }
    rows.sort(function(a,b){
      if(_state.sortKey){
        var va=sortVal(a,_state.sortKey), vb=sortVal(b,_state.sortKey);
        var c = (typeof va==='number' && typeof vb==='number') ? (va-vb) : String(va).localeCompare(String(vb),'is');
        if(c!==0) return c*_state.sortDir;
      }
      if(a.firm!==b.firm)return a.firm<b.firm?-1:1; return (a.b.nafn||'')<(b.b.nafn||'')?-1:1;
    });
    // 2026-06-18: calmer stat bar — one card with dot-coded stats + dividers,
    // instead of five separate multicolour "sticker" boxes.
    function stat(dot,num,lab,col){
      return '<div style="display:flex;align-items:center;gap:8px">'+
        (dot?'<span style="width:8px;height:8px;border-radius:50%;background:'+dot+';flex:0 0 auto"></span>':'')+
        '<span style="font-size:18px;font-weight:800;color:'+(col||'var(--ink1)')+';font-variant-numeric:tabular-nums">'+num+'</span>'+
        '<span style="font-size:12px;color:var(--ink3)">'+lab+'</span></div>';
    }
    var sep='<span style="width:1px;height:26px;background:var(--brd)"></span>';
    var totHtml='<div class="_ovr-totals" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;background:var(--surface);border:1px solid var(--brd);border-radius:12px;padding:12px 18px;margin-bottom:14px;box-shadow:0 1px 2px rgba(16,24,40,.04)">'+
      stat('',firms,'félög')+sep+stat('var(--ink4)',tot.byg,'byggingar')+sep+
      stat('#1C8F60',tot.done,'með úttekt 2026','#15803d')+
      stat('#D99206',tot.need,'vantar 2026','#b7791f')+
      stat('#f97316',tot.none,'engin gögn','#b45309')+
      stat('#ef4444',tot.overdue,'skoðun liðin','#b91c1c')+
      '</div>';
    function chip(key,label){ var on=f===key; return '<button class="_rf_fchip" data-f="'+key+'" style="padding:6px 12px;border:1px solid '+(on?'var(--brand)':'var(--brd2)')+';background:'+(on?'var(--brand)':'var(--surface)')+';color:'+(on?'#fff':'var(--ink2)')+';border-radius:99px;font-size:12.5px;font-weight:600;cursor:pointer">'+label+'</button>'; }
    var chips='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">'+
      chip('all','Allir ('+all.length+')')+chip('done','✓ Með úttekt 2026 ('+tot.done+')')+chip('need','⏳ Vantar 2026 ('+tot.need+')')+chip('none','⚠ Engin gögn ('+tot.none+')')+chip('overdue','⏰ Skoðun liðin ('+tot.overdue+')')+'</div>';
    var bd='1px solid var(--brd)';
    var trs=rows.map(function(r){
      var b=r.b, s=r.s;
      var bname = s.co ? '<a href="#" data-coid="'+s.co.id+'" class="_rf_open" style="color:var(--brand);text-decoration:none">'+esc(b.nafn)+'</a>' : esc(b.nafn)+' <span style="color:var(--brd2);font-size:11px">(ekki í skrá)</span>';
      var unitCell='<td style="padding:5px 6px;border-bottom:'+bd+';text-align:center;'+(s.units>0?'font-weight:600':'color:#b45309')+'">'+(s.units>0?s.units:(s.hasRep?'–':'0'))+'</td>';
      var y23=yCellO(s.d23,false,s.units,s.lks['2023'],s.f23,'2023'),y24=yCellO(s.d24,!!s.att[0],s.units,s.lks['2024'],s.f24,'2024'),y25=yCellO(s.d25,!!s.att[1],s.units,s.lks['2025'],s.f25,'2025'),y26=yCellO(s.d26,!!s.att[2],s.units,s.lks['2026'],s.f26,'2026');
      var nextCell = s.next ? '<td style="padding:5px 6px;border-bottom:'+bd+';text-align:center;'+(s.overdue?'background:#fef2f2;color:#b91c1c;':'color:var(--ink2);')+'font-variant-numeric:tabular-nums;white-space:nowrap">'+esc(s.next)+(s.overdue?' ⚠':'')+'</td>' : '<td style="padding:5px 6px;border-bottom:'+bd+';text-align:center;color:var(--brd2)">—</td>';
      return '<tr>'+
        '<td style="padding:5px 6px;border-bottom:'+bd+';color:var(--ink2);white-space:nowrap">'+esc(r.firm)+'</td>'+
        '<td style="padding:5px 6px;border-bottom:'+bd+'">'+bname+'</td>'+
        '<td style="padding:5px 6px;border-bottom:'+bd+';color:var(--ink3);font-variant-numeric:tabular-nums;white-space:nowrap">'+fmtKt(b.kt)+'</td>'+
        unitCell+y23+y24+y25+y26+nextCell+'</tr>';
    }).join('');
    if(!trs) trs='<tr><td colspan="9" style="padding:16px;text-align:center;color:var(--ink4)">Ekkert fannst.</td></tr>';
    box.innerHTML='<div class="noprint" style="display:flex;justify-content:flex-end;margin-bottom:8px"><button id="_rf_print" style="padding:7px 13px;border:1px solid var(--brand);background:var(--brand);color:#fff;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer">🖨 Prenta skýrslu</button></div>'+totHtml+chips+
      '<div style="overflow-x:auto;background:var(--surface);border:1px solid var(--brd);border-radius:12px"><table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr>'+
      sth('firm','Rekstrarfélag','left','6px')+
      sth('byg','Bygging','left','6px')+
      sth('kt','Kennitala','left','6px')+
      sth('taeki','Tæki','center','4px')+
      sth('y23','2023','center','4px')+
      sth('y24','2024','center','4px')+
      sth('y25','2025','center','4px')+
      sth('y26','2026','center','4px')+
      sth('next','Næsta skoðun','center','6px')+
      '</tr></thead><tbody>'+trs+'</tbody></table></div>';
    function sth(k,label,align,pad){
      var on=_state.sortKey===k;
      var arrow=on?(_state.sortDir===1?' ▲':' ▼'):'';
      return '<th class="_rf_sth" data-k="'+k+'" title="Raða eftir '+esc(label)+'" style="text-align:'+align+';color:'+(on?'var(--ink1)':'var(--ink3)')+';font-size:12px;padding:8px '+pad+';border-bottom:1px solid var(--brd);cursor:pointer;user-select:none;white-space:nowrap">'+esc(label)+arrow+'</th>';
    }
    box.querySelectorAll('._rf_sth').forEach(function(h){ h.addEventListener('click', function(){
      var k=h.getAttribute('data-k');
      if(_state.sortKey===k){ if(_state.sortDir===1){ _state.sortDir=-1; } else { _state.sortKey=''; _state.sortDir=1; } }
      else { _state.sortKey=k; _state.sortDir=1; }
      renderOverview();
    }); });
    box.querySelectorAll('._rf_fchip').forEach(function(c){ c.addEventListener('click', function(){ _state.fltr=c.getAttribute('data-f'); renderOverview(); }); });
    box.querySelectorAll('._rf_open').forEach(function(a){ a.addEventListener('click', function(e){ e.preventDefault(); openCompany(a.getAttribute('data-coid')); }); });
    var _pb=box.querySelector('#_rf_print'); if(_pb) _pb.onclick=function(){ if(window.SlokkPrint) window.SlokkPrint('Rekstrarfélög — byggingar og úttektir', box); };
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
      card.className='_rf_card rf-card';
      var chips='';
      (info.emails||[]).forEach(function(e){ chips+='<a class="rf-chip mail _rf_email" href="mailto:'+esc(e)+'" title="'+esc(e)+'">'+SVG.mail+'<span>'+esc(e)+'</span></a>'; });
      if(info.domain) chips+='<span class="rf-chip">'+SVG.globe+'<span>'+esc(info.domain)+'</span></span>';
      if(info.kt) chips+='<span class="rf-chip">'+SVG.hash+'<span>'+esc(fmtKt(info.kt))+'</span></span>';
      if(info.simi) chips+='<span class="rf-chip">'+SVG.phone+'<span>'+esc(info.simi)+'</span></span>';
      if(info.tengilidur) chips+='<span class="rf-chip">'+SVG.user+'<span>'+esc(info.tengilidur)+'</span></span>';
      if(!chips) chips='<span class="rf-chip" style="opacity:.7">Engin netföng skráð</span>';
      card.innerHTML=
        '<div class="_rf_head rf-head">'+
          '<div class="rf-ava">'+SVG.building+'</div>'+
          '<div style="flex:1;min-width:0">'+
            '<div class="rf-name">'+esc(name)+'</div>'+
            '<div class="_rf_emailline rf-chips">'+chips+'</div>'+
          '</div>'+
          '<div class="rf-count">'+SVG.layers+'<b>'+blds.length+'</b> byggingar</div>'+
          '<div class="_rf_chev rf-chev">'+SVG.chev+'</div>'+
        '</div>'+
        // 2026-06-12 (Todoist): athugasemd beint á borðanum — vistast sjálfkrafa
        '<div class="rf-notewrap"><input class="_rf_note" value="'+esc(info.notes||'')+'" placeholder="Athugasemd um rekstraraðilann — vistast sjálfkrafa" '+
          'style="display:block;width:100%;padding:7px 10px;border:1px solid var(--brd);border-radius:8px;font:inherit;font-size:12.5px;background:var(--surface);box-sizing:border-box"></div>'+
        '<div class="_rf_body rf-body" style="display:none"></div>';
      var body=card.querySelector('._rf_body');
      var chev=card.querySelector('._rf_chev');
      function flip(){ var open=body.style.display==='none'; body.style.display=open?'':'none'; if(chev) chev.style.transform=open?'rotate(180deg)':''; if(open) fillBody(body,name,info); }
      card.querySelector('._rf_head').addEventListener('click',flip);
      card.querySelectorAll('._rf_email').forEach(function(a){ a.addEventListener('click',function(e){ e.stopPropagation(); }); });
      var noteInp=card.querySelector('._rf_note');
      noteInp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); noteInp.blur(); } });
      noteInp.addEventListener('blur',async function(){
        var val=noteInp.value.trim();
        var d=getData(); if(!d[name]) d[name]=info;
        if((d[name].notes||'')===val) return;
        d[name].notes=val; info.notes=val;
        await saveData(d);
        if(window.Toast&&Toast.show) Toast.show('✓ Vistað');
      });
      box.appendChild(card);
    });
    if(!shown) box.innerHTML='<div style="color:var(--ink3);padding:16px">Ekkert fannst.</div>';
  }

  // 2026-06-12 (Todoist „wont open"): fillBody gat strandað á „Hleð…" að
  // eilífu ef eitthvað í samsetningunni kastaði (equip-index, skjalalisti,
  // gölluð byggingarröð). Nú: try/catch utan um allt + ↺ Reyna aftur.
  async function fillBody(body, name, info){
    body.innerHTML='<div style="color:var(--ink4);font-size:13px">Hleð…</div>';
    try {
      await _fillBodyInner(body, name, info);
    } catch (e) {
      console.warn('[rekstrarfelog] fillBody', e);
      body.innerHTML='<div style="color:#b91c1c;font-size:13px;padding:6px 0">⚠ Villa við að hlaða: '+esc((e&&e.message)||String(e))+
        ' <button class="_rf_retry" type="button" style="margin-left:8px;padding:4px 10px;border:1px solid var(--brd2);background:var(--surface);border-radius:6px;cursor:pointer;font:inherit;font-size:12px">↺ Reyna aftur</button></div>';
      var rb=body.querySelector('._rf_retry');
      if(rb) rb.onclick=function(){ fillBody(body,name,info); };
    }
  }
  async function _fillBodyInner(body, name, info){
    var blds=info.buildings||[];
    var equip=await getEquipIndex();
    var attMap={}; try{ if(window.AppSettings&&AppSettings.path){ attMap=AppSettings.path('rf_uttekt_att')||{}; } }catch(e){}
    var linkMap={}; try{ if(window.AppSettings&&AppSettings.path){ linkMap=AppSettings.path('rf_uttekt_links')||{}; } }catch(e){}
    var caMap=getCaMap();
    var sharedKt=sharedKtSet();
    var today=_todayStr();
    // per-firm tally
    var n2026=0, nNeed=0, nNone=0, nOverdue=0;
    var bd='1px solid var(--brd)';
    // year cell: done? -> tæki count (or ✓). green+📄 = úttektarskýrsla; ↗ = tengill í Drive; blár = aðeins búnaðarsaga
    function yCell(done, rep, units, url, file, y){
      if(!done) return '<td style="padding:6px 4px;border-bottom:'+bd+';text-align:center;color:var(--ink4)">·</td>';
      var v = units>0 ? units : '✓';
      var greenish = rep || url || file;
      var col = greenish ? '#15803d' : 'var(--brand)', dot = greenish ? '#1C8F60' : '#3b82f6';
      var inner = url ? '<a href="'+esc(url)+'" target="_blank" rel="noopener" title="Opna úttektarskýrslu í Google Drive" style="color:inherit;text-decoration:none">'+v+' 📄↗</a>'
        : (file ? fileLinkA(file,y,v)
        : (v+(rep?' 📄':'')));
      return '<td style="padding:6px 4px;border-bottom:'+bd+';text-align:center">'+
        '<span style="display:inline-flex;align-items:center;gap:5px;font-weight:700;font-size:12.5px;color:'+col+'">'+
        '<span style="width:6px;height:6px;border-radius:50%;background:'+dot+';flex:0 0 auto"></span>'+inner+'</span></td>';
    }
    // building table
    var rows=blds.map(function(b,_bi){
      var co=companyByKt(b.kt);
      var link= co ? '<a href="#" data-coid="'+co.id+'" class="_rf_open" style="color:var(--brand);text-decoration:none">'+esc(b.nafn)+'</a>'
                   : esc(b.nafn)+' <span style="color:var(--brd2);font-size:11px">(ekki í skrá)</span>';
      var doc = co ? '<a href="#" data-coid="'+co.id+'" class="_rf_docs" style="font-size:12px;color:var(--brand)">skjöl</a>' : '';
      var st = equip.match(b.nafn);
      var ktShared = !!(sharedKt && sharedKt[digits(b.kt)]);
      var att = ((!ktShared) && co && (attMap[co.id]||attMap[String(co.id)])) || [0,0,0];
      var lks = linkMap[bldLinkKey(b)] || (ktShared?null:linkMap[digits(b.kt)]) || {};
      var akey = bldAttachKey(b, co);
      var f23=fileForYearBld(caMap,akey,'2023',b,ktShared), f24=fileForYearBld(caMap,akey,'2024',b,ktShared),
          f25=fileForYearBld(caMap,akey,'2025',b,ktShared), f26=fileForYearBld(caMap,akey,'2026',b,ktShared);
      var units = st ? st.units : 0;
      var e24=st?st.y2024:0, e25=st?st.y2025:0, e26=st?st.y2026:0;
      var d23=!!lks['2023']||!!f23;
      var d24=(e24>0)||!!att[0]||!!lks['2024']||!!f24, d25=(e25>0)||!!att[1]||!!lks['2025']||!!f25, d26=(e26>0)||!!att[2]||!!lks['2026']||!!f26;
      var hasRep = !!(att[0]||att[1]||att[2]||f24||f25||f26);
      var lkYears = Object.keys(lks);
      var hasData = units>0 || hasRep || d24 || d25 || d26 || lkYears.length>0 || !!f23;
      if(!hasData) nNone++; else if(d26) n2026++; else if(d24||d25) nNeed++;
      // links for years outside the 2024-2026 columns (e.g. older skýrslur) shown after the name
      var oldLinks = lkYears.filter(function(y){return y<'2023';}).sort().map(function(y){
        return ' <a href="'+esc(lks[y])+'" target="_blank" rel="noopener" title="Úttektarskýrsla '+y+' í Drive" style="font-size:11px;color:#15803d;text-decoration:none;white-space:nowrap">📄'+y+'↗</a>'; }).join('');
      link = link + oldLinks;
      if(b.heimilisfang) link += '<div style="font-size:11px;color:var(--ink4);margin-top:2px">📍 '+esc(b.heimilisfang)+'</div>';
      var unitCell='<td style="padding:5px 6px;border-bottom:'+bd+';text-align:center;'+(units>0?'font-weight:600':'color:'+(hasRep?'var(--brd2)':'#b45309'))+'">'+(units>0?units:(hasRep||lkYears.length?'–':'0'))+'</td>';
      var y23=yCell(d23,false,units,lks['2023'],f23,'2023'), y24=yCell(d24,!!att[0],units,lks['2024'],f24,'2024'), y25=yCell(d25,!!att[1],units,lks['2025'],f25,'2025'), y26=yCell(d26,!!att[2],units,lks['2026'],f26,'2026');
      var nextCell;
      if(st && st.next){ var overdue = st.next < today; if(overdue && hasData) nOverdue++;
        var col = overdue ? '#b91c1c' : 'var(--ink2)'; var bg = overdue ? 'background:#fef2f2;' : '';
        nextCell='<td style="padding:5px 6px;border-bottom:'+bd+';text-align:center;'+bg+'color:'+col+';font-variant-numeric:tabular-nums;white-space:nowrap">'+esc(st.next)+(overdue?' ⚠':'')+'</td>';
      } else { nextCell='<td style="padding:5px 6px;border-bottom:'+bd+';text-align:center;color:var(--brd2)">—</td>'; }
      return '<tr><td style="padding:5px 6px;border-bottom:'+bd+'">'+link+'</td>'+
             '<td style="padding:5px 6px;border-bottom:'+bd+';color:var(--ink3);font-variant-numeric:tabular-nums">'+fmtKt(b.kt)+'</td>'+
             unitCell+y23+y24+y25+y26+nextCell+
             '<td style="padding:5px 6px;border-bottom:'+bd+';text-align:right;white-space:nowrap">'+doc+
             ' <a href="#" class="_rf_delb" data-bi="'+_bi+'" title="Fjarlægja byggingu" style="color:#dc2626;text-decoration:none;font-size:12px;margin-left:6px">✕</a></td></tr>';
    }).join('');
    var summary='<div style="display:flex;gap:14px;flex-wrap:wrap;font-size:12.5px;color:var(--ink2);margin-bottom:8px">'+
      '<span>🏠 '+blds.length+' byggingar</span>'+
      '<span style="color:#15803d;font-weight:600">✓ '+n2026+' með úttekt 2026</span>'+
      (nNeed?'<span style="color:#b7791f;font-weight:600">⏳ '+nNeed+' vantar 2026</span>':'')+
      (nNone?'<span style="color:#b45309;font-weight:600">⚠ '+nNone+' engin gögn</span>':'')+
      (nOverdue?'<span style="color:#b91c1c;font-weight:600">⏰ '+nOverdue+' skoðun liðin</span>':'')+'</div>';
    var docs=[];
    try{ docs=(await listFirmDocs(name))||[]; }catch(e){ console.warn('[rekstrarfelog] docs',e); }
    var docHtml=docs.length? docs.map(function(d){
      var nm=d.name||d.file||'skjal'; var url=d.drive_url||d.url||'#';
      return '<div style="display:flex;justify-content:space-between;gap:8px;padding:4px 0;border-bottom:1px solid var(--brd);font-size:13px">'+
             '<span>📄 '+esc(nm)+'</span>'+(url&&url!=='#'?'<a href="'+esc(url)+'" target="_blank" style="color:var(--brand)">opna</a>':'')+'</div>';
    }).join('') : '<div style="color:var(--ink4);font-size:13px;padding:4px 0">Engin skjöl skráð á félagið ennþá.</div>';

    // Editable rekstrarfélag info card (kennitala / netföng / lén / nótur).
    var fEmails=(info.emails||[]).join(', ');
    var emails=(info.emails||[]).map(function(e){return '<a href="mailto:'+esc(e)+'" style="color:var(--brand);text-decoration:none">'+esc(e)+'</a>';}).join(' · ');
    var inS='width:100%;padding:6px 9px;border:1px solid var(--brd2);border-radius:7px;font:inherit;font-size:13px;box-sizing:border-box;margin-top:2px';
    var infoPanel=
      '<div class="_rf_info" style="background:var(--bg);border:1px solid var(--brd);border-radius:10px;padding:12px 14px;margin-bottom:14px">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
          '<div style="font-size:11px;font-weight:700;color:var(--ink2);text-transform:uppercase;letter-spacing:.04em">Upplýsingar um rekstrarfélag</div>'+
          '<button class="_rf_info_edit" type="button" style="font-size:12px;padding:4px 10px;background:var(--surface);border:1px solid var(--brd2);border-radius:7px;color:var(--ink2);font-weight:600;cursor:pointer">✏️ Breyta</button>'+
        '</div>'+
        '<div class="_rf_info_view" style="font-size:13px;color:var(--ink2);line-height:1.6">'+
          '<div><b>Kennitala:</b> '+(info.kt?esc(fmtKt(info.kt)):'—')+'</div>'+
          '<div><b>Netföng:</b> '+(emails||'—')+(info.domain?' &nbsp;·&nbsp; <span style="color:var(--ink3)">'+esc(info.domain)+'</span>':'')+'</div>'+
          '<div><b>Sími:</b> '+(info.simi?esc(info.simi):'—')+' &nbsp;·&nbsp; <b>Tengiliður:</b> '+(info.tengilidur?esc(info.tengilidur):'—')+'</div>'+
          '<div style="margin-top:4px"><b>Athugasemdir:</b><div style="white-space:pre-wrap;color:var(--ink2);margin-top:2px">'+(info.notes?esc(info.notes):'—')+'</div></div>'+
        '</div>'+
        '<div class="_rf_info_form" style="display:none">'+
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">'+
            '<label style="flex:1;min-width:150px;font-size:12px;color:var(--ink2)">Kennitala<input class="_rf_f_kt" value="'+esc(info.kt||'')+'" placeholder="000000-0000" style="'+inS+'"></label>'+
            '<label style="flex:1;min-width:150px;font-size:12px;color:var(--ink2)">Lén<input class="_rf_f_domain" value="'+esc(info.domain||'')+'" placeholder="domain.is" style="'+inS+'"></label>'+
          '</div>'+
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">'+
            '<label style="flex:1;min-width:150px;font-size:12px;color:var(--ink2)">Sími<input class="_rf_f_simi" value="'+esc(info.simi||'')+'" placeholder="555-0000" style="'+inS+'"></label>'+
            '<label style="flex:1;min-width:150px;font-size:12px;color:var(--ink2)">Tengiliður<input class="_rf_f_tengil" value="'+esc(info.tengilidur||'')+'" placeholder="Nafn tengiliðar" style="'+inS+'"></label>'+
          '</div>'+
          '<label style="display:block;font-size:12px;color:var(--ink2);margin-bottom:8px">Netföng (aðgreind með kommu)<input class="_rf_f_emails" value="'+esc(fEmails)+'" placeholder="reikningar@... , umsjon@..." style="'+inS+'"></label>'+
          '<label style="display:block;font-size:12px;color:var(--ink2);margin-bottom:8px">Athugasemdir / viðbótargögn<textarea class="_rf_f_notes" rows="4" style="'+inS+';resize:vertical">'+esc(info.notes||'')+'</textarea></label>'+
          '<div style="display:flex;gap:8px;justify-content:flex-end">'+
            '<button class="_rf_info_cancel" type="button" style="padding:6px 14px;background:var(--surface);border:1px solid var(--brd2);border-radius:7px;color:var(--ink2);font-weight:600;font-size:12.5px;cursor:pointer">Hætta við</button>'+
            '<button class="_rf_info_save" type="button" style="padding:6px 16px;background:#16a34a;color:#fff;border:none;border-radius:7px;font-weight:700;font-size:12.5px;cursor:pointer">💾 Vista</button>'+
          '</div>'+
        '</div>'+
      '</div>';
    body.innerHTML=
      infoPanel+
      '<div style="display:flex;gap:18px;flex-wrap:wrap">'+
        '<div style="flex:1 1 100%;min-width:280px">'+
          '<div style="font-weight:600;font-size:13px;color:var(--ink2);margin-bottom:6px">Byggingar / húsfélög — úttektir</div>'+
          summary+
          '<div class="rf-tblwrap"><table class="rf-tbl"><thead><tr>'+
          '<th>Bygging</th>'+
          '<th>Kennitala</th>'+
          '<th class="c">Tæki</th>'+
          '<th class="c">2023</th>'+
          '<th class="c">2024</th>'+
          '<th class="c">2025</th>'+
          '<th class="c">2026</th>'+
          '<th class="c">Næsta skoðun</th>'+
          '<th></th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
          '<button class="_rf_addb" style="margin-top:8px;padding:6px 12px;background:var(--surface);border:1px dashed var(--brd2);border-radius:8px;color:var(--brand);font-weight:600;font-size:12.5px;cursor:pointer">+ Bæta við byggingu / fyrirtæki</button>'+
          '<div style="font-size:11px;color:var(--ink4);margin-top:6px">Árdálkar sýna fjölda tækja sem úttekt nær til. <span style="color:#15803d">Grænn + 📄</span> = úttektarskýrsla á skrá (viðhengi); <span style="color:var(--brand)">blár</span> = aðeins skráð í búnaðarsögu. «Næsta skoðun» = fyrsti gjalddagi, ⚠ = liðinn.</div>'+
        '</div>'+
        '<div style="flex:1;min-width:260px">'+
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'+
            '<div style="font-weight:600;font-size:13px;color:var(--ink2)">Skjöl félagsins</div>'+
            '<button class="_rf_upload btn btn-ghost btn-sm" style="font-size:12px;padding:4px 10px">+ Hlaða upp</button></div>'+
          (info.drive? '<a href="'+esc(info.drive)+'" target="_blank" style="display:inline-block;margin-bottom:8px;font-size:13px;color:var(--brand);font-weight:600;text-decoration:none">📁 Opna skjalamöppu í Drive →</a>':'')+
          '<div class="_rf_doclist">'+docHtml+'</div>'+
          '<input type="file" class="_rf_file" style="display:none">'+
        '</div>'+
      '</div>';

    // wire the editable rekstrarfélag info card
    var infoEditBtn=body.querySelector('._rf_info_edit');
    var infoViewEl=body.querySelector('._rf_info_view');
    var infoFormEl=body.querySelector('._rf_info_form');
    function showInfoForm(on){ if(!infoFormEl||!infoViewEl||!infoEditBtn) return;
      infoFormEl.style.display=on?'':'none'; infoViewEl.style.display=on?'none':'';
      infoEditBtn.textContent=on?'✕ Loka':'✏️ Breyta'; }
    if(infoEditBtn) infoEditBtn.addEventListener('click', function(){ showInfoForm(infoFormEl.style.display==='none'); });
    var infoCancel=body.querySelector('._rf_info_cancel');
    if(infoCancel) infoCancel.addEventListener('click', function(){ showInfoForm(false); });
    var infoSave=body.querySelector('._rf_info_save');
    if(infoSave) infoSave.addEventListener('click', async function(){
      var kt=(body.querySelector('._rf_f_kt').value||'').trim();
      var domain=(body.querySelector('._rf_f_domain').value||'').trim();
      var simi=(body.querySelector('._rf_f_simi').value||'').trim();
      var tengil=(body.querySelector('._rf_f_tengil').value||'').trim();
      var emailsRaw=(body.querySelector('._rf_f_emails').value||'').trim();
      var notes=(body.querySelector('._rf_f_notes').value||'');
      var emailsArr=emailsRaw?emailsRaw.split(/[,;\n]+/).map(function(s){return s.trim();}).filter(Boolean):[];
      infoSave.disabled=true; infoSave.textContent='Vista…';
      var d=getData(); if(!d[name]) d[name]=info;
      d[name].kt=kt; d[name].domain=domain; d[name].emails=emailsArr; d[name].notes=notes;
      d[name].simi=simi; d[name].tengilidur=tengil;
      try{ await saveData(d); }catch(e){}
      info.kt=kt; info.domain=domain; info.emails=emailsArr; info.notes=notes;
      info.simi=simi; info.tengilidur=tengil;
      if(window.Toast&&Toast.show) Toast.show('✓ Upplýsingar vistaðar');
      fillBody(body,name,info); // re-render with the new values
    });

    // wire building -> company record
    body.querySelectorAll('._rf_open').forEach(function(a){ a.addEventListener('click', function(e){ e.preventDefault(); openCompany(a.getAttribute('data-coid')); }); });
    body.querySelectorAll('._rf_docs').forEach(function(a){ a.addEventListener('click', function(e){ e.preventDefault(); openCompany(a.getAttribute('data-coid')); }); });

    // wire add / remove building — self-service editing, no code needed
    var addB = body.querySelector('._rf_addb');
    if (addB) addB.addEventListener('click', async function(){
      var nafn = prompt('Nafn byggingar / fyrirtækis:'); if(!nafn || !nafn.trim()) return;
      var kt   = (prompt('Kennitala (má sleppa):','')||'').trim();
      var heim = (prompt('Heimilisfang (má sleppa):','')||'').trim();
      var d = getData(); if(!d[name]) d[name]=info;
      d[name].buildings = (d[name].buildings||[]).concat([{ nafn:nafn.trim(), kt:kt, heimilisfang:heim }]);
      await saveData(d);
      info.buildings = d[name].buildings;
      fillBody(body, name, info);
    });
    body.querySelectorAll('._rf_delb').forEach(function(x){
      x.addEventListener('click', async function(e){
        e.preventDefault();
        var bi = parseInt(x.getAttribute('data-bi'),10);
        var b = (info.buildings||[])[bi]; if(!b) return;
        if(!confirm('Fjarlægja "'+(b.nafn||'')+'" úr félaginu?')) return;
        var d = getData();
        if(d[name] && Array.isArray(d[name].buildings)){ d[name].buildings.splice(bi,1); await saveData(d); info.buildings=d[name].buildings; }
        fillBody(body, name, info);
      });
    });

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

  var _cameFromRf = false;
  function openCompany(id){
    if(!id) return;
    var nid = isNaN(id)? id : parseInt(id,10);
    // Hide our view first — Companies.openDetail switches views
    // programmatically (no nav-button click), so without this the
    // rekstrarfélög content stays visible beside the company page.
    var v=viewEl();
    if(v){ v.style.display='none'; v.classList.remove('active'); }
    var ourBtn=document.querySelector('[data-view="rekstrarfelog"]');
    if(ourBtn) ourBtn.classList.remove('active');
    _cameFromRf = true;
    try {
      if(window.Companies && Companies.openDetail){ Companies.openDetail(nid); return; }
      if(window.App && App.switchView){ App.switchView('companies'); }
    } catch(e){ console.warn('openCompany failed', e); }
  }
  // "Til baka" on a company page opened FROM rekstrarfélög returns here
  // instead of the companies list. Capture phase so we win over the detail
  // page's own back handler. Any nav-button click cancels the breadcrumb.
  document.addEventListener('click', function(e){
    var el=e.target.closest('button, a');
    if(!el) return;
    if(el.classList && el.classList.contains('vnav-btn')){ _cameFromRf=false; return; }
    if(!_cameFromRf) return;
    if(!/til baka/i.test(el.textContent||'')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    _cameFromRf=false;
    if(window.openRekstrarfelog) window.openRekstrarfelog();
  }, true);

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
    var existing=document.querySelector('[data-view="rekstrarfelog"]');
    if(existing){
      // 2026-06-09: already present → do NOTHING. The old behaviour yanked the
      // button back next to the anchor on every 1.2s tick, which fought patch
      // 68's (custom) ordering forever — the sidebar visibly reshuffled on
      // every refresh. Position is patch 68's job, not ours.
      return;
    }
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
