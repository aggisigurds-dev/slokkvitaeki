// POS v3 — reads both services & products from vorur table (flokkur = "Þjónusta" vs other)
(function(){
  'use strict';
  console.log('[POS v3] Script loaded');
  var state = {
    customer: { mode:'kt', kt:'', nafn:'', simi:'', co_id:null, afslattur_pct: 0, athugasemdir: '' },
    // discount       = absolute kr off the FINAL price m. vsk (2026-06-12 —
    //                  changed from ex-VAT so the total lands on a round
    //                  number: 5.200 kr karfa − 200 kr afsl = 5.000 kr)
    // discount_pct   = % off subtotal (set per sale or pulled from customer)
    // discount_gross = marker for SalaInvoice: this state's kr discount is
    //                  m. vsk, not the legacy ex-VAT semantics
    lines: [], discount: 0, discount_pct: 0, discount_gross: true, notes: '', beidninumer: '',
    products: [], services: []
  };
  var ICONS = {
    flame: '<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M12 2c-1 4-4 6-4 10a4 4 0 0 0 8 0c0-1.5-.5-3-1.5-4 0 2-1 3-2.5 3 0-3 2-5 0-9z"/></svg>',
    cylinder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><rect x="7" y="5" width="10" height="15" rx="1"/><rect x="9" y="3" width="6" height="2" rx="0.5"/><line x1="9" y1="9" x2="15" y2="9"/></svg>',
    // CO₂ hleðsla — explicit gray fills so the icon stays gray even though the
    // surrounding tile uses red `color:` for the background tint.
    co2_hledsla: '<svg viewBox="0 0 24 24" width="28" height="28" xmlns="http://www.w3.org/2000/svg"><rect x="7" y="5" width="10" height="15" rx="1.2" fill="#cbd5e1" stroke="#475569" stroke-width="1.4" stroke-linejoin="round"/><rect x="9" y="3" width="6" height="2" rx="0.4" fill="#94a3b8" stroke="#475569" stroke-width="1"/><line x1="9" y1="9" x2="15" y2="9" stroke="#475569" stroke-width="1"/><text x="12" y="15" text-anchor="middle" font-size="4" font-weight="700" font-family="Arial,sans-serif" fill="#475569">CO₂</text></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"/><polyline points="9 12 11.5 14.5 16 10"/></svg>',
    wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3L13 9l2.3-2.3z"/></svg>',
    smoke: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
    blanket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" width="28" height="28"><rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M4 10h16M9 5v14"/></svg>',
    mount: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M4 4v16M4 8h8a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H4"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.5 11h11l2.5-7H6"/></svg>'
  };
  // CO₂ er ein "fjölskylda" — alltaf rautt + grátt gashylki íkon óháð því
  // hvort um er að ræða hleðslu, áfyllingu, yfirferð eða annað.
  function iconFromNafn(n){n=(n||'').toLowerCase();if(/co2|co₂/i.test(n))return'co2_hledsla';if(/áfyll|afyll/i.test(n))return'flame';if(/ársk|skoð/i.test(n))return'check';if(/viðhald|viðger|vidger/i.test(n))return'wrench';if(/slökk|tæki/i.test(n))return'cylinder';if(/reyk|skynjari/i.test(n))return'smoke';if(/teppi|blanket/i.test(n))return'blanket';if(/veggfesting|festing|mount/i.test(n))return'mount';return'cart';}
  function colorFromNafn(n){n=(n||'').toLowerCase();if(/co2|co₂/i.test(n))return'#dc2626';if(/áfyll|afyll/i.test(n))return'#dc2626';if(/ársk|skoð/i.test(n))return'#b45309';if(/viðhald|viðger|vidger/i.test(n))return'#6b7280';if(/slökk|tæki/i.test(n))return'#dc2626';if(/reyk/i.test(n))return'#ea580c';if(/teppi|blanket/i.test(n))return'#059669';if(/veggfesting|festing/i.test(n))return'#7c3aed';return'#475569';}
  function fmtKr(n){var s=Math.round(n).toString();var parts=[];while(s.length>3){parts.unshift(s.slice(-3));s=s.slice(0,-3);}parts.unshift(s);return parts.join('.')+' kr';}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function loadAll(){
    return DB.sb.from('vorur').select('*').eq('virkt',true).order('nafn').then(function(r){
      var all = r.data || [];
      state.services = all.filter(function(p){return p.flokkur==='Þjónusta';});
      state.products = all.filter(function(p){return p.flokkur!=='Þjónusta';});
    }).catch(function(e){state.products=[];state.services=[];});
  }
  function lookupKt(kt){
    kt = kt.replace(/[^0-9]/g, '');
    if (kt.length !== 10) return Promise.resolve(null);
    // 2026-05-08: Special "Staðgreitt" kennitala — never look up, return synthetic.
    if (kt === '9999999999') {
      return Promise.resolve({
        nafn: 'Staðgreitt',
        kennitala: '999999-9999',
        simi: '',
        heimilisfang: '',
        afslattur_pct: 0,
        athugasemdir: '',
        co_id: null,
        source: 'walkin'
      });
    }
    // Query BOTH fyrirtaeki (companies) and vidskiptavinir (individuals)
    // in parallel. Same kennitala can exist in both tables (e.g. when a
    // company is auto-created from a sale, but the user later set the
    // discount on the customer-facing Viðskiptavinir record). We prefer
    // fyrirtaeki for co_id linkage, but always pick whichever table has
    // the highest non-zero discount so the user's saved discount actually
    // applies. Falls back to RSK/já.is when neither table has the kt.
    return Promise.all([
      DB.sb.from('fyrirtaeki')
        .select('id,nafn,simi,kennitala,heimilisfang,afslattur_pct,athugasemdir')
        .eq('kennitala', kt).order('afslattur_pct', { ascending: false }).limit(20),
      DB.sb.from('vidskiptavinir')
        .select('id,nafn,simi,kennitala,heimilisfang,afslattur_pct,athugasemdir')
        .eq('kennitala', kt).order('afslattur_pct', { ascending: false }).limit(20)
    ]).then(function (results) {
      // 2026-06-23 (#2): a kt can have several rows (multi-site customers like
      // Colas — 5 starfsstöðvar). maybeSingle() errored on those, so the saved
      // discount never applied. Fetch all, pick the row with the highest
      // afslattur_pct (prefer one carrying an id for co_id linkage).
      function pickBest(arr){
        arr = (arr || []).slice();
        if (!arr.length) return null;
        arr.sort(function(a,b){ return ((+b.afslattur_pct||0) - (+a.afslattur_pct||0)) || ((b.id?1:0) - (a.id?1:0)); });
        return arr[0];
      }
      var fy = pickBest(results[0] && results[0].data);
      var vk = pickBest(results[1] && results[1].data);
      if (fy || vk) {
        var fyDisc = +(fy && fy.afslattur_pct) || 0;
        var vkDisc = +(vk && vk.afslattur_pct) || 0;
        var best   = Math.max(fyDisc, vkDisc);  // whichever table has a saved discount wins
        // Prefer whichever table has actual notes; if both have notes (rare),
        // prefer vidskiptavinir since that's the canonical customer record.
        var notes = (vk && vk.athugasemdir) || (fy && fy.athugasemdir) || '';
        return {
          nafn:  (fy && fy.nafn) || (vk && vk.nafn) || '',
          simi:  (fy && fy.simi) || (vk && vk.simi) || '',
          heimilisfang: (fy && fy.heimilisfang) || (vk && vk.heimilisfang) || '',
          co_id: fy ? fy.id : null,
          afslattur_pct: best,
          athugasemdir: notes,
          source: fy ? 'fyrirtaeki' : 'vidskiptavinir'
        };
      }
      // Not in either local table — fall back to the external registry.
      if (window.KtLookup && typeof window.KtLookup.lookup === 'function') {
        return window.KtLookup.lookup(kt).then(function (ext) {
          if (!ext) return null;
          return {
            nafn: ext.nafn || '', simi: ext.simi || '',
            co_id: null, heimilisfang: ext.heimilisfang || '',
            afslattur_pct: 0, athugasemdir: '', source: 'rsk'
          };
        }).catch(function () { return null; });
      }
      return null;
    });
  }
  function totals(){
    var ex=0,vsk=0;
    state.lines.forEach(function(l){var le=l.qty*l.unit_price_ex_vat;ex+=le;vsk+=le*(l.vsk_pct||24)/100;});
    // % discount first, off the without-VAT subtotal (unchanged). The kr
    // discount then comes off the FINAL price m. vsk, so the operator can
    // punch 200 on a 5.200 kr cart and charge exactly 5.000 kr. ex/vsk are
    // scaled back proportionally from the new total (handles mixed VAT rates).
    var pctDisc = ex * (parseFloat(state.discount_pct)||0) / 100;
    var ad1 = Math.max(0, ex - pctDisc);
    var av1 = ex>0 ? ad1 * (vsk/ex) : 0;
    var gross1 = ad1 + av1;
    var absDisc = Math.max(0, Math.min(gross1, parseFloat(state.discount)||0));
    var f = gross1>0 ? (gross1 - absDisc) / gross1 : 0;
    var ad = ad1*f, av = av1*f;
    // saved = total kr the customer saves off the m.vsk price — the number
    // shown in the cart and stored on solur.afslattur.
    var saved = (ex + vsk) - (ad + av);
    return { ex:ad, vsk:av, total:ad+av, raw_ex:ex, raw_vsk:vsk, pct_disc:pctDisc, abs_disc:absDisc, saved:saved };
  }
  function injectKarfaSkin(){
    if(document.getElementById('pos-karfa-skin'))return;
    var s=document.createElement('style');s.id='pos-karfa-skin';
    // KARFA er alltaf ljós „kvittunar-eyja" — yfirskrifar Brunastál/dökk-þema:
    // patch 229 endurkortlagði background:#fff → --thm-card (dökkt) og takka án
    // .btn-success → dökkan málm/rauðan. ID-sértækni (#view-sala .pos-cart …)
    // slær .view-reglur patch 229 svo karfan helst hvít eins og á hönnunar-mock.
    s.textContent=[
      '#view-sala .pos-cart{background:#fff!important;border:3px solid #0c0d10!important;box-shadow:0 14px 34px -18px rgba(10,15,25,.5)!important}',
      '#view-sala .pos-cart [style*="background:#fff"]{background:#fff!important}',
      '#view-sala .pos-cart [style*="color:#0f172a"]{color:#0f172a!important}',
      '#view-sala .pos-cart [style*="color:#334155"]{color:#334155!important}',
      '#view-sala .pos-cart [style*="color:#475569"]{color:#475569!important}',
      '#view-sala .pos-cart [style*="color:#64748b"]{color:#64748b!important}',
      '#view-sala .pos-cart [style*="color:#94a3b8"]{color:#94a3b8!important}',
      '#view-sala .pos-cart [style*="#e2e8f0"]{border-color:#e2e8f0!important}',
      '#view-sala .pos-cart .pos-qty-up,#view-sala .pos-cart .pos-qty-dn{background:#fff!important;color:#475569!important;border:none!important;box-shadow:none!important;text-shadow:none!important}',
      '#view-sala .pos-cart .pos-line-del{background:none!important;color:#cbd5e1!important;border:none!important;box-shadow:none!important;text-shadow:none!important}',
      '#view-sala .pos-cart #pos-add-service{background:linear-gradient(180deg,#2b2b31,#0c0d10)!important;color:#fff!important;border:1px solid #000!important;text-shadow:none!important}',
      '#view-sala .pos-cart #pos-hreyf{background:#fff!important;color:#334155!important;border:1px solid #cbd5e1!important;text-shadow:none!important;box-shadow:none!important}',
      '#view-sala .pos-cart #pos-checkout{background:linear-gradient(180deg,#1f7a48 0%,#16613a 52%,#0d4226 100%)!important;color:#fff!important;border:1px solid #0a3a20!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 8px 18px -8px rgba(13,66,38,.6)!important;text-shadow:none!important}',
      // The Brunastál skin (patch 245) styles EVERY .view input as a 42px-tall,
      // 14px-padded box. That balloons the cart's tiny inline inputs (unit-price
      // edit, and the 28/46px discount % / kr fields — the padding hides their
      // value entirely → "percentage doesn't show"). Re-assert the compact style
      // for just those inputs (higher specificity + !important beats patch 245).
      '#view-sala .pos-cart .pos-price-edit{height:auto!important;min-height:0!important;padding:0 2px!important;border:none!important;border-bottom:1px dotted #cbd5e1!important;border-radius:0!important;background:transparent!important;font-size:11px!important;width:56px!important;text-align:right!important}',
      '#view-sala .pos-cart #pos-discount,#view-sala .pos-cart #pos-discount-kr{height:auto!important;min-height:0!important;padding:0!important;border:none!important;border-radius:0!important;background:transparent!important;font-size:13px!important;text-align:right!important}',
      '#view-sala .pos-cart #pos-discount{width:30px!important}',
      '#view-sala .pos-cart #pos-discount-kr{width:46px!important}'
    ].join('\n');
    (document.head||document.documentElement).appendChild(s);
  }
  function render(){var v=document.getElementById('view-sala');if(!v)return;injectKarfaSkin();if(v.getAttribute('data-pos-v3')==='1')return;v.innerHTML=buildHTML();v.setAttribute('data-pos-v3','1');bindEvents();rerenderCatalog();rerenderDynamic();}
  // 2026-05-08: rerenderCatalog (vörur+þjónustur) er aðskilið frá
  // rerenderDynamic (karfa+totals). Áður var allt í einu sem þýddi að í
  // hvert sinn sem notandi bætti vöru í körfu var ALLUR vörulistinn
  // endurbyggður frá grunni — myndir hlóðu sig aftur og grid reflowaði,
  // sem leit út eins og óstöðugt layout. Núna: vörur+þjónustur
  // endurbyggjast eingöngu í initial render() og þegar loadAll() hleður
  // nýjum gögnum (sem gerist bara þegar notandi kemur aftur á Sala).
  function rerenderCatalog(){
    var sv=document.getElementById('pos-services');if(sv)sv.innerHTML=buildServicesHTML();
    var pr=document.getElementById('pos-products');if(pr)pr.innerHTML=buildProductsHTML();
    // 2026-05-09: notify patches (87-sala-from-settings) that the catalog
    // tiles were re-rendered so they can re-apply custom order, pinned tiles,
    // hidden product filtering. Without this, the periodic loadAll() watcher
    // on line 769 would silently reset the user's custom ordering to the
    // alphabetical default and patch 87 wouldn't notice (no observer).
    try { document.dispatchEvent(new CustomEvent('sala-catalog-rendered')); } catch (_) {}
  }
  function rerenderDynamic(){
    var l=document.getElementById('pos-lines');if(l)l.innerHTML=buildLinesHTML();
    var t=document.getElementById('pos-totals');if(t)t.innerHTML=buildTotalsHTML();
    var cb=document.getElementById('pos-checkout');
    if(cb){var tt=totals();cb.innerHTML=tt.total>0?('✓ ÁFRAM · '+fmtKr(tt.total)):'✓ ÁFRAM';cb.disabled=tt.total===0 || !beidniOk();}
  }
  function buildBannerHTML(){
    var now = new Date();
    var _wk = ['Sun','Mán','Þri','Mið','Fim','Fös','Lau'];
    var _mo = ['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'];
    var dagur = _wk[now.getDay()]+' '+now.getDate()+'. '+_mo[now.getMonth()];
    var klst = now.toLocaleTimeString('is-IS',{hour:'2-digit',minute:'2-digit',hour12:false});
    // Pick first starfsmadur name from AppSettings (Stillingar → Starfsmenn) as default.
    var staffName = 'Kassi';
    try{var _slist=window.AppSettings&&window.AppSettings.path('starfsmenn');if(Array.isArray(_slist)){var _first=_slist.find(function(s){return s&&s.name&&s.name.trim();});if(_first)staffName=_first.name.trim();}}catch(_e){}
    // Pull branding from AppSettings (Stillingar → Branding). Fallbacks keep
    // the banner sensible during initial load before settings hydrate.
    var b = (window.AppSettings && window.AppSettings.path('branding')) || {};
    var primary = b.primary_color || '#C93C1D';
    var title = b.banner_text || b.company_name || 'Slökkvitæki ehf';
    var subtitle = b.banner_subtitle || 'Slökkvitækjaþjónusta';
    var addrLine = ((b.address1 || '') + (b.address2 ? ', ' + b.address2 : '') + (b.phone ? ' · ' + b.phone : '')).trim();
    var style = b.banner_style || 'litrikt';
    function darken(hex, amount){
      var h = (hex || '#C93C1D').replace('#',''); if (h.length===3) h = h.split('').map(c=>c+c).join('');
      var r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), bl = parseInt(h.slice(4,6),16);
      r = Math.max(0, Math.round(r * (1 - amount)));
      g = Math.max(0, Math.round(g * (1 - amount)));
      bl = Math.max(0, Math.round(bl * (1 - amount)));
      return '#' + ('0'+r.toString(16)).slice(-2) + ('0'+g.toString(16)).slice(-2) + ('0'+bl.toString(16)).slice(-2);
    }
    var dark = darken(primary, 0.55);
    var darker = darken(primary, 0.78);

    if (style === 'mynd') {
      // Custom banner image — uses PNG files in /img/ with mobile + retina variants.
      // Picture element handles srcset/source so we get the right resolution per device.
      // Clock + date appears as a small overlay on the right.
      var imgUrl = (b.banner_image_url || '/img/banner-1x.png').trim();
      var img2x  = (b.banner_image_2x_url || '/img/banner-2x.png').trim();
      var imgMob = (b.banner_image_mobile_url || '/img/banner-mobile.png').trim();
      return '<div class="pos-banner" style="border-radius:10px;margin:16px;margin-bottom:12px;overflow:hidden;position:relative;line-height:0">' +
        '<picture>' +
          '<source media="(max-width: 720px)" srcset="' + esc(imgMob) + '">' +
          '<source media="(min-resolution: 1.5dppx)" srcset="' + esc(img2x) + '">' +
          '<img src="' + esc(imgUrl) + '" alt="' + esc(title) + '" style="width:100%;height:auto;display:block">' +
        '</picture>' +
        '<div style="position:absolute;top:50%;right:18px;transform:translateY(-50%);background:rgba(15,23,42,0.82);color:#fff;padding:10px 18px;border-radius:12px;font-weight:600;line-height:1.35;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);text-align:right;box-shadow:0 4px 14px rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.12);min-width:130px;z-index:5">' +
          '<div style="font-size:10px;opacity:0.65;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;margin-bottom:3px">Kassakerfi</div>' +
          '<div style="font-size:22px;font-variant-numeric:tabular-nums;font-weight:800">'+esc(klst)+'</div>' +
          '<div style="font-size:11px;opacity:0.9;margin-top:2px;font-weight:600">'+esc(dagur)+'</div>' +
          '<div style="font-size:11px;opacity:0.75;margin-top:3px">Starfsm: '+esc(staffName)+'</div>' +
        '</div>' +
      '</div>';
    }
    if (style === 'minimalt') {
      // Solid color, slim height, just title + clock
      return '<div class="pos-banner" style="background:'+primary+';color:#fff;border-radius:10px;margin:16px;margin-bottom:12px;padding:12px 20px;display:flex;justify-content:space-between;align-items:center;min-height:50px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">' +
        '<div style="font-size:18px;font-weight:700;letter-spacing:-0.01em">'+esc(title)+'</div>' +
        '<div style="font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;opacity:0.85">'+esc(klst)+' · '+esc(dagur)+'</div>' +
      '</div>';
    }
    if (style === 'ljos') {
      // Light/white background with primary color accents
      return '<div class="pos-banner" style="background:#fff;color:#0f172a;border:1px solid #e2e8f0;border-left:5px solid '+primary+';border-radius:10px;margin:16px;margin-bottom:12px;padding:14px 20px;display:flex;justify-content:space-between;align-items:center;min-height:60px;box-shadow:0 1px 3px rgba(0,0,0,0.04)">' +
        '<div>' +
          '<div style="font-size:20px;font-weight:800;color:#0f172a;letter-spacing:-0.01em">'+esc(title)+'</div>' +
          '<div style="font-size:12px;color:#64748b;margin-top:2px">'+esc(subtitle)+(addrLine?' · '+esc(addrLine):'')+'</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:18px;font-weight:700;color:'+primary+';font-variant-numeric:tabular-nums">'+esc(klst)+'</div>' +
          '<div style="font-size:11px;color:#64748b;margin-top:2px">'+esc(dagur)+'</div>' +
        '</div>' +
      '</div>';
    }
    if (style === 'hreint') {
      // Clean single-gradient — no diagonal overlays, no stripes
      return '<div class="pos-banner" style="background:linear-gradient(135deg,'+primary+',' +dark+ ');color:#fff;border-radius:12px;margin:16px;margin-bottom:12px;padding:18px 26px;display:flex;justify-content:space-between;align-items:center;min-height:80px;box-shadow:0 4px 14px rgba(0,0,0,0.12)">' +
        '<div>' +
          '<div style="font-size:24px;font-weight:800;letter-spacing:-0.02em;line-height:1">'+esc(title)+'</div>' +
          '<div style="font-size:12px;opacity:0.85;margin-top:5px;font-weight:500">'+esc(subtitle)+'</div>' +
          (addrLine?'<div style="font-size:11px;opacity:0.65;margin-top:2px">'+esc(addrLine)+'</div>':'') +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:11px;opacity:0.6;text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Kassakerfi</div>' +
          '<div style="font-size:22px;font-weight:700;margin-top:4px;font-variant-numeric:tabular-nums">'+esc(klst)+'</div>' +
          '<div style="font-size:11px;opacity:0.7;margin-top:2px">'+esc(dagur)+'</div>' +
        '</div>' +
      '</div>';
    }
    // Default 'litrikt' — original colourful banner with side stripe + diagonal overlays
    return '<div class="pos-banner" style="background:linear-gradient(135deg,'+darker+' 0%,'+dark+' 50%,'+darker+' 100%);color:#fff;padding:0;border-radius:14px;margin:16px;margin-bottom:12px;display:flex;align-items:stretch;box-shadow:0 8px 32px rgba(180,20,20,0.35);position:relative;overflow:hidden;min-height:92px">' +
      '<div style="width:6px;background:linear-gradient(180deg,#fbbf24,'+primary+','+darker+','+primary+',#fbbf24);box-shadow:0 0 12px rgba(251,191,36,0.6)"></div>' +
      '<div style="position:absolute;top:0;right:0;width:70%;height:100%;background:linear-gradient(120deg,transparent 0%,transparent 20%,rgba(251,191,36,0.12) 20%,rgba(251,191,36,0.08) 35%,transparent 35%,transparent 40%,rgba(239,68,68,0.15) 40%,rgba(239,68,68,0.10) 55%,transparent 55%,transparent 60%,rgba(251,191,36,0.08) 60%,rgba(251,191,36,0.05) 75%,transparent 75%,transparent 80%,rgba(239,68,68,0.06) 80%,rgba(239,68,68,0.03) 90%,transparent 90%);pointer-events:none"></div>' +
      '<div style="flex:1;padding:18px 28px;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1">' +
        '<div style="display:flex;align-items:center;gap:18px">' +
          '<div style="width:68px;height:68px;background:linear-gradient(135deg,'+primary+','+darker+');border-radius:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(239,68,68,0.5)">' +
            '<svg viewBox="0 0 48 48" width="42" height="42"><path d="M24 6c-2 7-8 10-8 18a8 8 0 0 0 16 0c0-4-2-6-4-8 0 3-2 4.5-3 4.5 0-4 2-6 -1-14.5z" fill="#fbbf24"/><path d="M24 14c-1.5 4-5 6-5 11a5 5 0 0 0 10 0c0-2-.5-3-2-4 0 1.5-1 2.5-2 2.5 0-2 1-4 -1-9.5z" fill="#fff" opacity="0.9"/></svg>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1;text-transform:uppercase;text-shadow:0 2px 8px rgba(0,0,0,0.5)">'+esc(title)+'</div>' +
            '<div style="font-size:12px;opacity:0.75;margin-top:5px;letter-spacing:0.06em;text-transform:uppercase;font-weight:600">'+esc(subtitle)+'</div>' +
            (addrLine?'<div style="font-size:11px;opacity:0.5;margin-top:2px">'+esc(addrLine)+'</div>':'') +
          '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:10px;opacity:0.45;text-transform:uppercase;letter-spacing:0.1em;font-weight:600">Kassakerfi</div>' +
          '<div style="font-size:20px;font-weight:700;margin-top:4px;font-variant-numeric:tabular-nums;text-shadow:0 2px 6px rgba(0,0,0,0.4)">'+klst+'</div>' +
          '<div style="font-size:11px;opacity:0.55;margin-top:2px">'+esc(dagur)+' · Starfsmaður: '+esc(staffName)+'</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  // Refresh just the banner without re-rendering the whole Sala view.
  // Called when AppSettings change so banner_style / banner_text updates take
  // effect immediately, without losing the cart state.
  function refreshBanner() {
    var v = document.getElementById('view-sala');
    if (!v) return;
    var existing = v.querySelector('.pos-banner');
    if (!existing) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = buildBannerHTML();
    var fresh = tmp.firstElementChild;
    if (fresh) existing.replaceWith(fresh);
  }
  // Expose for AppSettings change hook + external triggers.
  if (typeof window !== 'undefined') {
    window.POS = window.POS || {};
    window.POS.refreshBanner = refreshBanner;
  }
  function buildHTML(){
    return buildBannerHTML() +
    '<div style="display:grid;grid-template-columns:1fr 380px;gap:16px;padding:0 16px 16px;min-height:calc(100vh - 160px)">' +
      '<div>' +
        '<div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px">' +
            '<div class="pos-sec" style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em">Viðskiptavinur</div>' +
            // 2026-05-19: scan button between Viðskiptavinur label and Án-kennitölu
            // toggle — scanning a tæki QR looks up its client and fills the
            // customer box in one step.
            //
            // The legacy "→ Án kennitölu" toggle (pos-mode-toggle) is now
            // hidden — patch 114's "⚡ Án kennitölu" walk-in button (right
            // of the search input) is the canonical control. Kept in DOM
            // so pos.js's existing click handler attaches without erroring.
            '<div style="display:flex;gap:6px;align-items:center">' +
              '<button id="pos-scan-top" type="button" title="Skanna QR / strikamerki á tæki — finnur viðskiptavin" style="padding:6px 12px;border:1px solid #cbd5e1;background:#0f172a;color:#fff;border-radius:6px;font-weight:600;cursor:pointer;font-size:12px;white-space:nowrap;display:inline-flex;align-items:center;gap:5px">📷 Skanna</button>' +
              '<button id="pos-mode-toggle" type="button" style="display:none">→ Án kennitölu</button>' +
            '</div>' +
          '</div>' +
          '<div id="pos-kt-box">' +
            '<input id="pos-kt" placeholder="000000-0000" maxlength="11" autocomplete="off" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:16px;box-sizing:border-box;font-variant-numeric:tabular-nums">' +
            '<div id="pos-kt-result" style="margin-top:6px;font-size:13px;color:#64748b;min-height:18px"></div>' +
          '</div>' +
          '<div id="pos-manual-box" style="display:none">' +
            '<input id="pos-nafn" placeholder="Nafn viðskiptavinar" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:15px;box-sizing:border-box;margin-bottom:6px">' +
            '<input id="pos-simi" placeholder="Sími" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:15px;box-sizing:border-box">' +
          '</div>' +
          // Customer memo / price-instructions display — shown only when the
          // selected customer has saved athugasemdir on their record. Read-only;
          // surfaces price agreements and notes (e.g. "Yfirferð 2200, Hleðsla
          // 3700, 20% afsl. af nýjum tækjum") so the operator sees them while
          // adding line items. The actual sale-level athugasemdir textarea
          // is in the Karfa panel (pos-notes) and is independent of this.
          // 2026-05-11: Hidden permanently — patch 114's "Valinn viðskiptavinur"
          // card already shows the same athugasemdir block in the white panel
          // above. Showing both produced a duplicate yellow box that confused
          // the user. Keep the node so other patches (e.g. pos.js reset) that
          // toggle its display don't error out, but never let it appear.
          '<div id="pos-customer-memo" style="display:none !important;margin-top:10px;padding:10px 12px;background:#fef9c3;border:1px solid #fde047;border-radius:8px;border-left:4px solid #ca8a04" hidden>' +
            '<div style="font-size:11px;font-weight:700;color:#854d0e;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;display:flex;align-items:center;gap:6px">' +
              '<span>📝 Athugasemdir / Verðupplýsingar</span>' +
            '</div>' +
            '<div id="pos-customer-memo-text" style="font-size:13px;color:#422006;white-space:pre-wrap;line-height:1.45"></div>' +
          '</div>' +
        '</div>' +
        '<div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
            '<div class="pos-sec" style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em">Þjónusta</div>' +
            // 2026-05-19: removed "📷 Skanna QR" button — user reported the
            // camera scanner works poorly and the location uses a handheld
            // laser QR scanner instead (it types into the focused field
            // directly, no button needed). The top Skanna button in the
            // Viðskiptavinur header is the manual fallback. Kept the id
            // so the wireUp handler can defensively check.
            '<button id="pos-scan" style="display:none">unused</button>' +
          '</div>' +
          '<div id="pos-services" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px"></div>' +
        '</div>' +
        '<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9">' +
          '<div class="pos-sec" style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">Vörur</div>' +
          '<div id="pos-products" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px"></div>' +
        '</div>' +
      '</div>' +
      '<div>' +
        '<div class="pos-cart" style="background:#fff;border-radius:18px;padding:16px;box-shadow:0 14px 34px -18px rgba(10,15,25,.5);border:3px solid #0c0d10;position:sticky;top:12px;display:flex;flex-direction:column;max-height:calc(100vh - 200px)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:13px">' +
            '<div style="display:flex;align-items:center;gap:9px">' +
              '<span style="width:11px;height:11px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18)"></span>' +
              '<span style="font-size:15px;font-weight:800;letter-spacing:.13em;color:#0f172a">KARFA</span>' +
            '</div>' +
            '<div style="display:flex;gap:8px">' +
              '<button id="pos-add-service" style="background:linear-gradient(180deg,#2b2b31,#0c0d10);color:#fff;border:1px solid #000;padding:7px 13px;border-radius:10px;font-size:12.5px;cursor:pointer;font-weight:700;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)">+ Annað</button>' +
              '<button id="pos-hreyf" title="Hreyfingar / viðskiptasaga þessa viðskiptavinar" style="background:#fff;color:#334155;border:1px solid #cbd5e1;padding:7px 13px;border-radius:10px;font-size:12.5px;cursor:pointer;font-weight:700">📊 Hreyfingar</button>' +
              '<button id="pos-drog" style="background:#fff;color:#92400e;border:1px solid #fcd34d;padding:7px 13px;border-radius:10px;font-size:12.5px;cursor:pointer;font-weight:700">📝 Drög</button>' +
            '</div>' +
          '</div>' +
          '<div id="pos-lines" style="overflow-y:auto;flex:1;min-height:100px"></div>' +
          '<textarea id="pos-notes" placeholder="Athugasemdir..." style="width:100%;min-height:40px;margin-top:8px;padding:8px 10px;border:1px solid #e2e8f0;border-radius:10px;font-family:inherit;font-size:13px;box-sizing:border-box;resize:vertical;background:#fff"></textarea>' +
          '<div id="pos-totals" style="margin-top:8px"></div>' +
          '<button id="pos-checkout" style="width:100%;margin-top:14px;background:linear-gradient(180deg,#1f7a48 0%,#16613a 52%,#0d4226 100%);color:#fff;border:1px solid #0a3a20;padding:16px;border-radius:14px;font-weight:800;font-size:16px;letter-spacing:.03em;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 8px 18px -8px rgba(13,66,38,.6)">✓ ÁFRAM</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  function renderTile(item, isService){
    var priceInc = item.verd_an_vsk * (1 + (item.vsk_prosenta||24)/100);
    var verd = priceInc; // always show m/VSK price prominent  
    var col = colorFromNafn(item.nafn);
    var ic = iconFromNafn(item.nafn);
    // Brunastál: pick a metallic ic-*.png for matching ÞJÓNUSTA items (theme CSS
    // swaps it in; other themes ignore data-bstic and keep the SVG icon).
    var bstic = '';
    if (isService) { var _n = (item.nafn||'').toLowerCase();
      bstic = (/co₂|co2/.test(_n)) ? (/100\s?gr/.test(_n) ? 'rr' : 'r')
        : (/léttvatn|lettvatn/.test(_n)) ? 'gb'
        : (/froð|froda|abf/.test(_n)) ? 'g'
        : (/slanga|hose/.test(_n)) ? 'br'
        : (/reyk|skynjari/.test(_n)) ? 'y'
        : (/duft/.test(_n)) ? 'b' : '';
    }
    var img = item.mynd ? '<img src="'+esc(item.mynd)+'" style="width:42px;height:42px;object-fit:cover;border-radius:10px" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' : '';
    var iconDiv = '<div class="pos-tile-ic"'+(bstic?' data-bstic="'+bstic+'"':'')+' style="width:42px;height:42px;background:'+col+'15;color:'+col+';border-radius:10px;display:'+(item.mynd?'none':'flex')+';align-items:center;justify-content:center">' + ICONS[ic] + '</div>';
    var stockChip = (!isService && item.birgdir != null) ? '<div style="position:absolute;top:4px;right:6px;color:#065f46;font-size:11px;font-weight:700;text-shadow:0 1px 2px rgba(255,255,255,0.9),0 0 4px rgba(255,255,255,0.7)">'+item.birgdir+'</div>' : '';
    var cls = isService ? 'pos-svc' : 'pos-prod';
    return '<button class="'+cls+'" data-id="'+item.id+'" style="padding:10px 8px;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;cursor:pointer;text-align:center;transition:all .15s;display:flex;flex-direction:column;align-items:center;gap:6px;position:relative">' +
      stockChip + img + iconDiv +
      '<div style="font-weight:600;font-size:12px;color:#0f172a;line-height:1.2;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;min-height:29px">'+esc(item.nafn)+'</div>' +
      '<div style="font-size:14px;color:#0f172a;font-weight:800;line-height:1.1">'+fmtKr(verd)+'</div><div style="font-size:10px;color:#94a3b8;font-weight:500;margin-top:1px">'+fmtKr(item.verd_an_vsk)+' án vsk</div>' +
    '</button>';
  }
  function buildServicesHTML(){if(!state.services.length)return'<div style="color:#94a3b8;font-size:13px;text-align:center;padding:16px;grid-column:1/-1">Engin þjónusta skráð. Bættu við í Vörur og þjónusta tab.</div>';return state.services.map(function(s){return renderTile(s,true);}).join('');}
  function buildProductsHTML(){if(!state.products.length)return'<div style="color:#94a3b8;font-size:13px;text-align:center;padding:16px;grid-column:1/-1">Engar vörur skráðar.</div>';return state.products.map(function(p){return renderTile(p,false);}).join('');}
  function buildLinesHTML(){
    if(!state.lines.length)return'<div style="color:#94a3b8;text-align:center;padding:30px 16px;font-size:13px;border:2px dashed #e2e8f0;border-radius:12px">Karfan er tóm<br><span style="font-size:11px">Smelltu á flísar til að bæta við</span></div>';
    // 2026-06-22: KARFA endurhönnun — hver lína er „pill" með lit-rönd vinstra
    // megin (CO₂ rauð · Duft blá · léttvatn ljósblá o.s.frv.), nafn + „magn ×
    // einingarverð" undirtexti (mono, einingarverðið er ennþá ritanlegt inline),
    // hreinn magn-stepper og línutala. Línutalan er ÁN VSK (magn × einingarverð)
    // svo línurnar leggjast saman í „ÁN VSK" að neðan — eins og á hönnunar-mock;
    // VSK bætist við einu sinni neðst. (.pos-line-del/.pos-qty-up/-dn/.pos-price-
    // edit + data-idx haldast óbreytt svo atburða-bindingar virka áfram.)
    return state.lines.map(function(l,idx){
      var lineEx = l.qty * l.unit_price_ex_vat;
      var dn = (l.desc||'').toLowerCase();
      var col = /co₂|co2|kolsýr|kolsyr/.test(dn) ? '#dc2626'
              : /duft|abc|pfc/.test(dn) ? '#1d4ed8'
              : /léttv|lettv|froð|frod|abf/.test(dn) ? '#0ea5e9'
              : /reyk|skynjari/.test(dn) ? '#ea580c'
              : (colorFromNafn(l.desc) || '#475569');
      // 2026-07-01: cleaner „karfa" line per Agnar's mock — roomier light card,
      // title + „<einingarverð> kr/stk" undirtexti (verðið er ennþá ritanlegt
      // inline), pillulaga magn-stepper og stór línutala hægra megin. Sömu
      // klassar/ data-idx haldast svo bindingar (patch 113 tilboðsverð o.fl.) virki.
      return '<div style="position:relative;display:flex;align-items:center;gap:10px;background:#f8fafc;border:1px solid #e9eef3;border-left:4px solid '+col+';border-radius:12px;padding:11px 12px;margin-bottom:7px;box-shadow:0 1px 2px rgba(16,24,40,.05)">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;color:#0f172a;font-size:14px;line-height:1.25;overflow-wrap:break-word;word-break:break-word;padding-right:14px">'+esc(l.desc)+(l.ref?'<span style="font-weight:400;font-size:11px;color:#94a3b8"> · '+esc(l.ref)+'</span>':'')+'</div>' +
          '<div style="display:flex;align-items:center;gap:2px;margin-top:3px;font-size:12px;color:#64748b;font-family:\'Space Mono\',monospace">' +
            '<input class="pos-price-edit" data-idx="'+idx+'" type="text" inputmode="decimal" value="'+l.unit_price_ex_vat+'" ' +
              'title="Smelltu til að breyta einingarverði (án VSK)" ' +
              'style="width:56px;padding:0 1px;border:none;border-bottom:1px dotted #cbd5e1;background:transparent;font:inherit;font-size:12px;color:#64748b;text-align:right;font-variant-numeric:tabular-nums">' +
            '<span>kr/stk</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;align-items:center;background:#fff;border:1px solid #dbe2ea;border-radius:9px;overflow:hidden;flex-shrink:0">' +
          '<button class="pos-qty-dn" data-idx="'+idx+'" style="background:#fff;border:none;width:30px;height:30px;cursor:pointer;font-weight:800;color:#475569;font-size:16px;line-height:1">−</button>' +
          '<span style="min-width:24px;text-align:center;font-weight:800;font-size:14px;color:#0f172a;font-variant-numeric:tabular-nums">'+l.qty+'</span>' +
          '<button class="pos-qty-up" data-idx="'+idx+'" style="background:#fff;border:none;width:30px;height:30px;cursor:pointer;font-weight:800;color:#475569;font-size:16px;line-height:1">+</button>' +
        '</div>' +
        '<div style="flex-shrink:0;font-weight:800;color:#0f172a;font-size:15px;font-variant-numeric:tabular-nums;font-family:\'Space Mono\',monospace;white-space:nowrap;text-align:right;min-width:56px">'+fmtKr(lineEx)+'</div>' +
        '<button class="pos-line-del" data-idx="'+idx+'" title="Fjarlægja" style="position:absolute;top:5px;right:6px;background:none;color:#cbd5e1;border:none;cursor:pointer;font-size:15px;padding:0;line-height:1;flex-shrink:0">×</button>' +
      '</div>';
    }).join('');
  }
  // 2026-06-23 (#1 smálagfæring): Reykjavíkurborg (kt 530269-7609) leggur fram
  // pappírs-BEIÐNI með beiðninúmeri sem verður að fylgja reikningi. Þegar þessi
  // kt er valinn → skylda að slá inn beiðninúmer áður en salan er kláruð, og það
  // prentast á reikninginn (fremst í athugasemd → vegna-lína).
  var REYKJAVIKURBORG_KT = '5302697609';
  function needsBeidni(){ return String((state.customer && state.customer.kt) || '').replace(/[^0-9]/g,'') === REYKJAVIKURBORG_KT; }
  function beidniOk(){ return !needsBeidni() || !!String(state.beidninumer || '').trim(); }

  function buildTotalsHTML(){
    var t = totals();
    var pct = state.discount_pct || 0;
    var disc = state.discount || 0;
    var hasDisc = (pct > 0) || (state.discount > 0);
    // Customer-discount badge: show "↺ 10% (≈ 1.200 kr)" so user sees in
    // kr what would be saved before applying.
    var custDiscPct = state.customer && +state.customer.afslattur_pct || 0;
    var custDisc = '';
    if (custDiscPct > 0 && custDiscPct !== pct) {
      var custDiscKr = Math.round(t.raw_ex * custDiscPct / 100);
      custDisc = '<button id="pos-disc-cust-apply" type="button" title="Sækja afslátt viðskiptavinar" '
         + 'style="background:#dcfce7;color:#166534;border:1px solid #86efac;border-radius:6px;'
         + 'padding:2px 8px;font-size:11px;font-weight:600;cursor:pointer;margin-left:6px">'
         + '↺ ' + custDiscPct + '% (≈ ' + fmtKr(custDiscKr) + ')</button>';
    }
    // 2026-06-22: KARFA-stíll á heildartölum — uppercase grá merki, mono tölur,
    // afsláttur sem tvær „pill" (% + kr), Samtals stórt. Hér eru engar Án-VSK-
    // eftir-afslátt línur (mock sýnir ekki) en #pos-tot-ex/#pos-tot-disc-row eru
    // höfð falin svo _updateTotalsCells og eldri kóði sem leitar að þeim brotni ekki.
    var rates = state.lines.length ? Array.from(new Set(state.lines.map(function(l){return l.vsk_pct||24;}))) : [24];
    var vskLabel = rates.length === 1 ? ('VSK ' + rates[0] + '%') : 'VSK';
    var lbl  = 'font-size:12px;font-weight:700;letter-spacing:.07em;color:#94a3b8';
    var num  = "font-size:14px;font-weight:700;color:#334155;font-family:'Space Mono',monospace;font-variant-numeric:tabular-nums";
    var pill = 'display:inline-flex;align-items:center;gap:3px;background:#fff;border:1px solid #dbe2ea;border-radius:9px;padding:3px 9px';
    var pinp = "border:none;background:transparent;font:inherit;font-size:13px;text-align:right;font-variant-numeric:tabular-nums;color:#0f172a;outline:none";
    var beidniField = needsBeidni() ? (
      '<div style="margin-bottom:10px;padding:9px 11px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px">' +
        '<label style="display:block;font-size:11px;font-weight:700;color:#92400e;margin-bottom:4px">⚠ Beiðninúmer Reykjavíkurborgar (skylda)</label>' +
        '<input id="pos-beidni" type="text" inputmode="numeric" value="' + esc(String(state.beidninumer || '')) + '" placeholder="t.d. 0406559" autocomplete="off" style="width:100%;padding:8px 10px;border:1.5px solid ' + (String(state.beidninumer || '').trim() ? '#10b981' : '#f59e0b') + ';border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box;font-variant-numeric:tabular-nums">' +
        '<div style="font-size:10px;color:#b45309;margin-top:3px">Frumrit beiðni verður að fylgja reikningi — prentast á reikninginn.</div>' +
      '</div>'
    ) : '';
    return beidniField + '<div style="border-top:1px solid #e2e8f0;padding-top:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">' +
          '<span style="'+lbl+'">ÁN VSK</span><span id="pos-tot-raw" style="'+num+'">'+fmtKr(t.raw_ex)+'</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;gap:8px">' +
          '<span style="'+lbl+';display:flex;align-items:center">AFSLÁTTUR' + custDisc + '</span>' +
          '<span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end">' +
            '<span id="pos-disc-kr" style="color:#dc2626;font-weight:700;font-size:12px;font-family:\'Space Mono\',monospace;'+(hasDisc?'':'display:none;')+'">−'+fmtKr(t.saved)+'</span>' +
            '<span style="'+pill+'"><input id="pos-discount" type="text" inputmode="decimal" pattern="[0-9.,]*" value="'+pct+'" autocomplete="off" title="Afsláttur %" style="'+pinp+';width:28px"><span style="color:#94a3b8;font-size:12px">%</span></span>' +
            '<span style="'+pill+'"><input id="pos-discount-kr" type="text" inputmode="decimal" pattern="[0-9.,]*" value="'+(disc||'')+'" autocomplete="off" placeholder="0" title="Afsláttur í kr — dregst af lokaverðinu (m. vsk) svo upphæðin endi á sléttri tölu" style="'+pinp+';width:46px"><span style="color:#94a3b8;font-size:12px">kr</span></span>' +
          '</span>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0">' +
          '<span style="'+lbl+'">'+vskLabel+'</span><span id="pos-tot-vsk" style="'+num+'">'+fmtKr(t.vsk)+'</span>' +
        '</div>' +
        '<span id="pos-tot-ex" style="display:none">'+fmtKr(t.ex)+'</span><span id="pos-tot-disc-row" style="display:none"></span>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 0 2px;margin-top:7px;border-top:1px solid #eef1f5">' +
          '<span style="font-size:19px;font-weight:800;color:#0f172a">Samtals</span>' +
          '<span id="pos-tot-total" style="font-size:24px;font-weight:800;color:#0f172a;font-family:\'Space Mono\',monospace;font-variant-numeric:tabular-nums;white-space:nowrap">'+fmtKr(t.total)+'</span>' +
        '</div>' +
      '</div>';
  }
  // In-place update of the calculated cells — does NOT touch the discount input,
  // so the keyboard focus + cursor position stay intact while typing.
  function _updateTotalsCells() {
    var t = totals();
    var pct = state.discount_pct || 0;
    var hasDisc = (pct > 0) || (state.discount > 0);
    var setText = function(id, val){ var e = document.getElementById(id); if (e) e.textContent = val; };
    setText('pos-tot-raw', fmtKr(t.raw_ex));
    setText('pos-tot-ex', fmtKr(t.ex));
    setText('pos-tot-vsk', fmtKr(t.vsk));
    setText('pos-tot-total', fmtKr(t.total));
    var krEl = document.getElementById('pos-disc-kr');
    if (krEl) {
      krEl.textContent = '−' + fmtKr(t.saved);
      krEl.style.display = hasDisc ? '' : 'none';
    }
  }
  function bindEvents(){
    // Single mode-toggle button: kt <-> manual. Label shows the OTHER mode
    // (the destination) so the button text reads like an action.
    var modeBtn = document.getElementById('pos-mode-toggle');
    function syncModeUI(){
      var m = state.customer.mode;
      document.getElementById('pos-kt-box').style.display = m==='kt' ? '' : 'none';
      document.getElementById('pos-manual-box').style.display = m==='manual' ? '' : 'none';
      if (modeBtn) modeBtn.textContent = m==='kt' ? '→ Án kennitölu' : '← Með kennitölu';
    }
    if (modeBtn) modeBtn.addEventListener('click', function(){
      state.customer.mode = state.customer.mode==='kt' ? 'manual' : 'kt';
      syncModeUI();
    });
    syncModeUI();
    var ktEl=document.getElementById('pos-kt');
    if (ktEl) {
      ktEl.addEventListener('input', function () {
        var v = ktEl.value.replace(/[^0-9]/g, '');
        if (v.length > 6) v = v.substring(0, 6) + '-' + v.substring(6, 10);
        ktEl.value = v;
        state.customer.kt = v;
        var r = document.getElementById('pos-kt-result');
        var c = v.replace(/[^0-9]/g, '');
        if (c.length === 10) {
          r.textContent = 'Leita...';
          lookupKt(c).then(function (m) {
            // Helper: populate / hide the customer memo box. The memo shows
            // the customer's saved athugasemdir (price agreements, notes etc).
            function setMemo(text) {
              var box = document.getElementById('pos-customer-memo');
              var t = document.getElementById('pos-customer-memo-text');
              if (!box || !t) return;
              if (text && String(text).trim()) {
                t.textContent = text;
                box.style.display = '';
              } else {
                t.textContent = '';
                box.style.display = 'none';
              }
            }
            if (m) {
              // 2026-05-11: For walk-in (kt 999999-9999) the synthetic
              // lookup returns nafn='Staðgreitt'. But patch 114's walk-in
              // flow sets state.customer.nafn to the user-typed name AFTER
              // dispatching the kt input (sync) — and this lookupKt
              // callback is async. So this would overwrite the user's
              // typed name with 'Staðgreitt'. Preserve user-typed name.
              if (m.source === 'walkin' && state.customer.nafn && state.customer.nafn !== 'Staðgreitt') {
                // keep current nafn
              } else {
                state.customer.nafn = m.nafn;
              }
              if (m.source === 'walkin' && state.customer.simi && state.customer.simi !== '') {
                // keep current simi
              } else {
                state.customer.simi = m.simi;
              }
              state.customer.co_id = m.co_id;
              // 2026-07-01: carry the picked customer's kennitala so it isn't
              // lost on checkout (the Gjörvaverk bug — co_id was set but kt
              // stayed empty, so the sale saved customer_kt=null). Only set when
              // the match actually carries a kt, to avoid clobbering a typed kt.
              if (m.kennitala || m.kt) state.customer.kt = m.kennitala || m.kt;
              state.customer.heimilisfang = m.heimilisfang || '';
              state.customer.afslattur_pct = m.afslattur_pct || 0;
              state.customer.athugasemdir = m.athugasemdir || '';
              // Always overwrite — `if (>0) set` left old customer's discount in place
              // when switching to a customer with no discount, overcharging-saving them.
              state.discount_pct = m.afslattur_pct || 0;
              var discNote = m.afslattur_pct > 0 ? ' · <span style="color:#16a34a;font-weight:600">' + m.afslattur_pct + '% afsláttur</span>' : '';
              // Tag where the data came from so the user knows whether it
              // was already in the system (✓) or pulled live from RSK (📋).
              var srcIcon = m.source === 'rsk' ? '📋 RSK' : '✓';
              var srcColor = m.source === 'rsk' ? '#1d4ed8' : '#16a34a';
              r.innerHTML = '<span style="color:' + srcColor + ';font-weight:600">' + srcIcon + ' ' + esc(m.nafn) + '</span>'
                + (m.heimilisfang ? ' · <span style="color:#64748b">' + esc(m.heimilisfang) + '</span>' : '')
                + (m.simi ? ' · ' + esc(m.simi) : '')
                + discNote;
              setMemo(m.athugasemdir);
              rerenderDynamic();
            } else {
              state.customer.nafn = '';
              state.customer.simi = '';
              state.customer.co_id = null;
              state.customer.heimilisfang = '';
              state.customer.afslattur_pct = 0;
              state.customer.athugasemdir = '';
              setMemo('');
              r.innerHTML = '<span style="color:#b45309">Óþekkt kt — skráð sem nýr</span>';
            }
          });
        } else {
          r.textContent = '';
          // Hide the memo box when no customer is selected
          var memoBox = document.getElementById('pos-customer-memo');
          if (memoBox) memoBox.style.display = 'none';
          state.customer.athugasemdir = '';
        }
      });
    }
    var nEl=document.getElementById('pos-nafn'),sEl=document.getElementById('pos-simi');
    if(nEl)nEl.addEventListener('input',function(){state.customer.nafn=nEl.value;});
    if(sEl)sEl.addEventListener('input',function(){state.customer.simi=sEl.value;});
    document.getElementById('pos-add-service').addEventListener('click',promptService);
    // KARFA-haus „📊 Hreyfingar"-takki → opnar Hreyfingarlista fyrir viðskiptavininn
    // í körfunni (patch 167). Deep-link hash-ið (#hreyfingarlisti/<kt-eða-nafn>)
    // kveikir á handleDeepLink í 167 sem skiptir í view-ið OG flettir kúnnanum upp.
    // Enginn kúnni valinn → opnar bara listann tóman.
    var hreyfBtn=document.getElementById('pos-hreyf');
    if(hreyfBtn)hreyfBtn.addEventListener('click',function(){
      var q='';
      try{
        var c=state.customer||{};
        var kt=String(c.kt||'').replace(/[^0-9]/g,'');
        q=(kt.length===10&&kt!=='9999999999')?kt:String(c.nafn||'').trim();
        if(q==='Staðgreitt')q='';
      }catch(_){}
      if(q){location.hash='#hreyfingarlisti/'+encodeURIComponent(q);}
      else{try{if(window.App&&App.switchView){App.switchView('hreyfingarlisti');return;}}catch(_){}location.hash='#hreyfingarlisti';}
    });
    var drogBtn=document.getElementById('pos-drog');
    if(drogBtn)drogBtn.addEventListener('click',function(){try{if(window.DrogList&&DrogList.open){DrogList.open();}}catch(_){}});
    document.getElementById('pos-scan').addEventListener('click',scanQr);
    var topScanBtn = document.getElementById('pos-scan-top');
    if (topScanBtn) topScanBtn.addEventListener('click', scanQr);
    document.getElementById('pos-services').addEventListener('click',function(e){var b=e.target.closest('.pos-svc');if(!b)return;var id=parseInt(b.getAttribute('data-id'),10);var s=state.services.find(function(x){return x.id===id;});if(!s)return;state.lines.push({type:'service',desc:s.nafn,qty:1,unit_price_ex_vat:s.verd_an_vsk,vsk_pct:s.vsk_prosenta||24,ref:'',product_id:s.id});rerenderDynamic();});
    document.getElementById('pos-products').addEventListener('click',function(e){var b=e.target.closest('.pos-prod');if(!b)return;var id=parseInt(b.getAttribute('data-id'),10);addProductLine(id);});
    document.getElementById('pos-lines').addEventListener('click',function(e){var d=e.target.closest('.pos-line-del'),u=e.target.closest('.pos-qty-up'),n=e.target.closest('.pos-qty-dn');if(d){state.lines.splice(parseInt(d.getAttribute('data-idx'),10),1);rerenderDynamic();return;}if(u){var i=parseInt(u.getAttribute('data-idx'),10);state.lines[i].qty++;rerenderDynamic();return;}if(n){var j=parseInt(n.getAttribute('data-idx'),10);state.lines[j].qty--;if(state.lines[j].qty<=0)state.lines.splice(j,1);rerenderDynamic();return;}});
    // Per-line price editing — click input, edit, blur to save.
    document.getElementById('pos-lines').addEventListener('input',function(e){
      var p = e.target.closest('.pos-price-edit'); if (!p) return;
      var i = parseInt(p.getAttribute('data-idx'), 10);
      if (state.lines[i]) {
        // comma/dot-tolerant: "1.234,5" → 1234.5, "4032,26" → 4032.26, "4032.26" → 4032.26
        var raw = String(p.value).replace(/[^0-9.,]/g,'');
        if (raw.indexOf('.')>=0 && raw.indexOf(',')>=0) raw = raw.replace(/\./g,'').replace(',', '.');
        else raw = raw.replace(',', '.');
        state.lines[i].unit_price_ex_vat = parseFloat(raw) || 0;
        // Re-render only the totals; don't redraw the inputs (cursor jumps).
        var tEl = document.getElementById('pos-totals'); if (tEl) tEl.innerHTML = buildTotalsHTML();
        var cb = document.getElementById('pos-checkout');
        if (cb) { var tt = totals(); cb.innerHTML = tt.total > 0 ? ('✓ ÁFRAM · '+fmtKr(tt.total)) : '✓ ÁFRAM'; cb.disabled = tt.total === 0; }
        // Update only the line total cell on the same row.
        var row = p.closest('div[style*="display:flex"]'); // line container
      }
    });
    // Discount % input — live update without re-rendering the input.
    // Previous version replaced #pos-totals.innerHTML on every keystroke,
    // which destroys the focused input. The browser drops typed-but-not-yet-
    // delivered keystrokes (e.g. "20" became "2"). Now we update only the
    // calculated cells in place; the input stays mounted and focused.
    document.getElementById('pos-totals').addEventListener('input', function(e){
      var beidniEl = e.target.closest('#pos-beidni');
      if (beidniEl) {
        state.beidninumer = beidniEl.value;
        beidniEl.style.borderColor = String(state.beidninumer || '').trim() ? '#10b981' : '#f59e0b';
        var cbB = document.getElementById('pos-checkout');
        if (cbB) { var ttB = totals(); cbB.disabled = ttB.total === 0 || !beidniOk(); }
        return;
      }
      var pctEl = e.target.closest('#pos-discount');
      var krEl  = e.target.closest('#pos-discount-kr');
      if (!pctEl && !krEl) return;
      var raw = String(e.target.value || '').replace(/[^0-9.,]/g, '').replace(',', '.');
      if (pctEl) {
        state.discount_pct = Math.max(0, Math.min(100, parseFloat(raw) || 0));
      } else {
        // Clamp the kr discount so it never exceeds the cart total m. vsk
        // (the kr discount comes off the final price, not the ex-VAT subtotal).
        var subInc = state.lines.reduce(function(s, l){ return s + (l.qty * l.unit_price_ex_vat * (1 + (l.vsk_pct||24)/100)); }, 0);
        state.discount = Math.max(0, Math.min(subInc, parseFloat(raw) || 0));
      }
      _updateTotalsCells();
      // Update checkout button label
      var t = totals();
      var cb = document.getElementById('pos-checkout');
      if (cb) { cb.innerHTML = t.total>0?('✓ ÁFRAM · '+fmtKr(t.total)):'✓ ÁFRAM'; cb.disabled = t.total===0; }
      return;
      // Old fallback path — kept commented for reference
      // var tEl = document.getElementById('pos-totals');
      // var preserved = d.value;
      // if (tEl) tEl.innerHTML = buildTotalsHTML();
      // var newD = document.getElementById('pos-discount');
      // if (newD) newD.value = preserved;
      var cb = document.getElementById('pos-checkout');
      if (cb) { var tt = totals(); cb.innerHTML = tt.total > 0 ? ('✓ ÁFRAM · '+fmtKr(tt.total)) : '✓ ÁFRAM'; cb.disabled = tt.total === 0; }
    });
    // Auto-select all text when user focuses the discount field, so they
    // can immediately type a replacement value without manually clearing.
    document.getElementById('pos-totals').addEventListener('focusin', function(e){
      var d = e.target.closest('#pos-discount, #pos-discount-kr'); if (!d) return;
      setTimeout(function () { try { d.select(); } catch(_) {} }, 0);
    });
    // "Sækja afslátt viðskiptavinar" button — applies the customer's
    // saved default % to the current sale.
    document.getElementById('pos-totals').addEventListener('click', function(e){
      var b = e.target.closest('#pos-disc-cust-apply'); if (!b) return;
      state.discount_pct = +state.customer.afslattur_pct || 0;
      rerenderDynamic();
    });
    document.getElementById('pos-notes').addEventListener('input',function(e){state.notes=e.target.value;});
    document.getElementById('pos-checkout').addEventListener('click',checkout);
  }
  function promptService(){
    var old=document.getElementById('pos-svc-modal'); if(old)old.remove();
    var m=document.createElement('div');
    m.id='pos-svc-modal';
    m.style.cssText='position:fixed;inset:0;z-index:10060;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    m.innerHTML='<div style="background:#fff;border-radius:14px;padding:22px;max-width:380px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.25)">'+
      '<h2 style="margin:0 0 14px;font-size:17px;color:#0f172a">➕ Önnur þjónusta</h2>'+
      '<label style="display:block;font-size:11px;font-weight:700;color:#475569;margin:0 0 4px;text-transform:uppercase">Lýsing</label>'+
      '<input id="pos-svc-desc" value="Önnur þjónusta" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box;margin-bottom:12px">'+
      '<label style="display:block;font-size:11px;font-weight:700;color:#475569;margin:0 0 4px;text-transform:uppercase">Verð án VSK</label>'+
      '<input id="pos-svc-price" type="text" inputmode="decimal" value="5000" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box;text-align:right">'+
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">'+
        '<button id="pos-svc-x" style="padding:9px 16px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:#334155;cursor:pointer">Hætta við</button>'+
        '<button id="pos-svc-ok" style="padding:9px 18px;border-radius:8px;border:1px solid #16a34a;background:#16a34a;color:#fff;font-weight:700;cursor:pointer">Bæta við</button>'+
      '</div>'+
    '</div>';
    document.body.appendChild(m);
    var close=function(){m.remove();};
    m.querySelector('#pos-svc-x').addEventListener('click',close);
    m.addEventListener('click',function(e){if(e.target===m)close();});
    m.querySelector('#pos-svc-ok').addEventListener('click',function(){
      var d=(m.querySelector('#pos-svc-desc').value||'').trim();
      var p=(m.querySelector('#pos-svc-price').value||'').replace(/\./g,'').replace(',','.').replace(/[^0-9.]/g,'');
      var pr=parseFloat(p);
      if(!d){alert('Lýsing vantar');return;}
      if(isNaN(pr)){alert('Ógilt verð');return;}
      state.lines.push({type:'service',desc:d,qty:1,unit_price_ex_vat:pr,vsk_pct:24,ref:''});
      close();rerenderDynamic();
    });
    setTimeout(function(){var f=m.querySelector('#pos-svc-desc');if(f){f.focus();f.select();}},40);
  }
  function scanQr(){if(!window.Scanner||typeof Scanner.open!=='function'){alert('QR skanni ekki tilbúinn');return;}var toast=function(msg){if(window.Toast&&Toast.show)Toast.show(msg);};Scanner.open(function(code){if(!code)return;DB.sb.from('uttaeki').select('serial,type,size').eq('serial',code).maybeSingle().then(function(r){if(r.data){var u=r.data;state.lines.push({type:'service',desc:'Áfylling · '+(u.type||'')+' '+(u.size||''),qty:1,unit_price_ex_vat:8900,vsk_pct:24,ref:u.serial});toast('✓ '+(u.serial||code)+' bætt við');}else{state.lines.push({type:'service',desc:'Þjónusta',qty:1,unit_price_ex_vat:8900,vsk_pct:24,ref:code});toast('Tæki „'+code+'" fannst ekki — bætt við sem þjónustu');}rerenderDynamic();}).catch(function(e){toast('Villa við skönnun: '+(e.message||e));});});}
  function addProductLine(pid){var p=state.products.find(function(x){return x.id===pid;});if(!p)return;var ex=state.lines.find(function(l){return l.type==='product'&&l.product_id===pid;});if(ex){ex.qty++;}else state.lines.push({type:'product',desc:p.nafn,qty:1,unit_price_ex_vat:p.verd_an_vsk,vsk_pct:p.vsk_prosenta||24,product_id:p.id,ref:''});rerenderDynamic();}
  async function checkout(){
    if(!state.lines.length){alert('Engar línur');return;}
    if(!beidniOk()){alert('Sláðu inn Beiðninúmer Reykjavíkurborgar áður en salan er kláruð.\n(Frumrit beiðni verður að fylgja reikningi.)');var _be=document.getElementById('pos-beidni');if(_be)_be.focus();return;}
    var cust=state.customer.nafn.trim();
    // 2026-05-11: For walk-in (kt 999999-9999), if user didn't type a name
    // we want "Staðgreitt" on the receipt — NOT "kt: 999999-9999" which
    // looks confusing. The walk-in flow auto-fills 'Staðgreitt' but timing
    // bugs can leave nafn empty. Prefer 'Staðgreitt' over the kt string.
    if(!cust&&state.customer.mode==='kt'&&state.customer.kt){
      var ktClean=state.customer.kt.replace(/[^0-9]/g,'');
      if(ktClean==='9999999999') cust='Staðgreitt';
      else cust='kt: '+state.customer.kt;
    }
    // 2026-05-10 (B5+): replaced native await Confirm.show() with Confirm.show — native
    // confirm freezes browser, esp. blocking automation/MCP tools. Async-safe
    // because submitNew is already async.
    if(!cust){if(!(await Confirm.show('Enginn viðskiptavinur — halda áfram?')))return;cust='Staðgreitt';}
    var t=totals();var btn=document.getElementById('pos-checkout');btn.disabled=true;btn.innerHTML='Vista...';
    try{
      // Use the pre-allocated R-NNNNNN if one was reserved by the checkout
      // dialog (so the printed receipt matches the saved row). Otherwise the
      // BEFORE INSERT trigger on solur assigns one.
      var preNum = window._pendingReikningurNum || '';
      var pmCode = window._pendingPaymentMethod || 'kort';
      var pmLabel = pmCode === 'reikningur'   ? 'reikningur'
                  : pmCode === 'greitt_sidar' ? 'greitt_sidar'
                  : pmCode === 'pening'       ? 'Pening'
                                              : 'Kort';
      // Store the total kr discount m. vsk (what the customer actually saved
      // off the final price) as `afslattur` on solur. Receipts list line
      // totals m. vsk, so this is the number that makes the receipt add up.
      // (Pre-2026-06-12 rows stored the ex-VAT kr value instead —
      // SalaInvoice.renderFromSale detects which semantics a row uses by
      // checking which one reproduces the saved samtals.)
      var discKr = Math.round(t.saved || 0);
      // 2026-05-09 (Phase B): „Greitt síðar" býr til DRÖG sem patch 121
      // (pickup-checkout) klárar við Sótt ✓. Drög birtast ekki í Tekjum/Bókhaldi.
      var saleStatus = pmCode === 'greitt_sidar' ? 'drog' : 'final';
      // 2026-05-31: stamp paid_at for immediate payments (card/cash) so paid
      // sales stop showing as "unpaid" in accounting / kröfur / pickup badge.
      // Invoice (reikningur) and pay-later (greitt_sidar) stay unpaid until
      // they are billed / collected.
      var isPaidNow = (pmCode !== 'reikningur' && pmCode !== 'greitt_sidar');
      var nowIso = new Date().toISOString();
      // 2026-07-01 (Agnar rule): a sale ALWAYS gets a kennitala. A real customer
      // keeps their kt — and if the row was picked by name and the kt wasn't
      // carried, resolve it from the system (the Gjörvaverk bug). A sale with
      // only name/phone is a walk-in → the synthetic 999999-9999.
      var custKt;
      var _ktd=(state.customer.kt||'').replace(/[^0-9]/g,'');
      if(_ktd.length===10 && _ktd!=='9999999999'){
        custKt=state.customer.kt.trim();
      } else if(state.customer.co_id){
        custKt='';
        try{
          var _nm=(state.customer.nafn||'').trim().toLowerCase();
          var _rs=await Promise.all([
            DB.sb.from('fyrirtaeki').select('nafn,kennitala').eq('id',state.customer.co_id).maybeSingle(),
            DB.sb.from('vidskiptavinir').select('nafn,kennitala').eq('id',state.customer.co_id).maybeSingle()
          ]);
          var _f=_rs[0]&&_rs[0].data, _v=_rs[1]&&_rs[1].data, _pick=null;
          if(_f && (!_nm||String(_f.nafn||'').trim().toLowerCase()===_nm))_pick=_f;
          else if(_v && (!_nm||String(_v.nafn||'').trim().toLowerCase()===_nm))_pick=_v;
          if(!_pick)_pick=_f||_v;
          var _k=_pick&&String(_pick.kennitala||'').replace(/[^0-9]/g,'');
          if(_k&&_k.length===10&&_k!=='9999999999')custKt=_pick.kennitala;
        }catch(_){}
        if(!custKt)custKt='999999-9999';
      } else {
        custKt='999999-9999';
      }
      // #1: prepend the Reykjavíkurborg beiðninúmer so it prints on the reikningur.
      var _beidni=(needsBeidni() && String(state.beidninumer||'').trim()) ? String(state.beidninumer).trim() : '';
      var saleNotes = _beidni ? ('Beiðni ' + _beidni + (state.notes ? '\n' + state.notes : '')) : state.notes;
      var sr=await DB.sb.from('solur').insert({num:preNum||undefined,starfsmadur:'Kassi',customer_nafn:cust,customer_id:state.customer.co_id,customer_kt:custKt,linur:state.lines,upphaed_an_vsk:Math.round(t.ex),vsk_upphaed:Math.round(t.vsk),afslattur:discKr,samtals:Math.round(t.total),greitt_med:pmLabel,athugasemdir:saleNotes,status:saleStatus,paid_at:isPaidNow?nowIso:null,paid_method:isPaidNow?pmLabel:null}).select().single();
      if(sr.error)throw sr.error;
      var num = sr.data && sr.data.num ? sr.data.num : preNum;
      window._pendingReikningurNum = '';
      window._pendingPaymentMethod = '';
      // Auto-create viðskiptavinur for new kennitala customers.
      // 2026-05-08: Was incorrectly inserting into 'fyrirtaeki' (companies)
      // which polluted the Fyrirtækjaþjónusta list with walk-in POS customers.
      // Walk-ins from Sala belong in 'vidskiptavinir' (regular customers).
      // Only B2B service companies should ever be in 'fyrirtaeki', and those
      // are created manually via the "+ Nýtt fyrirtæki" button.
      if(state.customer.mode==='kt'&&state.customer.kt&&!state.customer.co_id){
        var cleanKt=state.customer.kt.replace(/[^0-9]/g,'');
        // 2026-05-08: Skip auto-create for the special "Staðgreitt" kennitala
        // 999999-9999 — walk-in customers should NOT be saved to vidskiptavinir.
        if(cleanKt==='9999999999'){
          // Just attach the name on the sale row for the receipt
          var walkinNm = state.customer.nafn || 'Staðgreitt';
          await DB.sb.from('solur').update({customer_nafn: walkinNm}).eq('id', sr.data.id);
        } else if(cleanKt.length===10){
          var custNm=state.customer.nafn||(state.customer.kt?'Viðskiptavinur':'Staðgreitt');
          try{
            var custId=null;
            // If this kt already belongs to a COMPANY (fyrirtaeki), link the sale to it
            // instead of creating a duplicate row in vidskiptavinir.
            var dashedKt=cleanKt.slice(0,6)+'-'+cleanKt.slice(6);
            var fyMatch=await DB.sb.from('fyrirtaeki').select('id,nafn').or('kennitala.eq.'+dashedKt+',kennitala.eq.'+cleanKt).limit(1).maybeSingle();
            if(fyMatch&&fyMatch.data&&fyMatch.data.id){
              custId=fyMatch.data.id;
            }else{
              // Re-use existing viðskiptavinur if same kennitala already in DB
              var existing=await DB.sb.from('vidskiptavinir').select('id,nafn').eq('kennitala',cleanKt).limit(1).maybeSingle();
              if(existing&&existing.data&&existing.data.id){
                custId=existing.data.id;
              }else{
                var cr=await DB.sb.from('vidskiptavinir').insert({nafn:custNm,kennitala:cleanKt,simi:state.customer.simi||''}).select().single();
                if(cr.data) custId=cr.data.id;
              }
            }
            if(custId){
              state.customer.co_id=custId;
              await DB.sb.from('solur').update({customer_id:custId,customer_nafn:custNm}).eq('id',sr.data.id);
            }
          }catch(ce){console.warn('[POS] Auto-create customer:',ce);}
        }
      }
      // 2026-07-01: manual-name safety net. A sale saved from the "Án kennitölu"
      // box (or kt-mode with no kt) lands with no customer_kt AND no customer_id
      // — which strips its kt in Kröfu yfirlit and blocks the Payday push. If the
      // typed name matches ONE company/customer on file (a single distinct kt),
      // backfill kt + links now. Exact case-insensitive name, unambiguous only —
      // never guesses a kt onto a bill.
      if(!custKt && !state.customer.co_id && cust && cust!=='Staðgreitt' && !/^kt:/.test(cust)){
        try{
          var _nm=cust.trim(); var _hits=[];
          var _fy=await DB.sb.from('fyrirtaeki').select('id,kennitala,customer_base_id').ilike('nafn',_nm).not('kennitala','is',null);
          (_fy.data||[]).forEach(function(r){_hits.push({kt:r.kennitala,coId:r.id,baseId:r.customer_base_id});});
          if(!_hits.length){
            var _cb=await DB.sb.from('customers_base').select('id,kennitala').ilike('nafn',_nm).not('kennitala','is',null);
            (_cb.data||[]).forEach(function(r){_hits.push({kt:r.kennitala,coId:null,baseId:r.id});});
          }
          if(!_hits.length){
            var _vd=await DB.sb.from('vidskiptavinir').select('id,kennitala,customer_base_id').ilike('nafn',_nm).not('kennitala','is',null);
            (_vd.data||[]).forEach(function(r){_hits.push({kt:r.kennitala,coId:r.id,baseId:r.customer_base_id});});
          }
          var _kts={}; _hits.forEach(function(h){var d=String(h.kt||'').replace(/\D/g,'');if(d.length===10)_kts[d]=h;});
          var _keys=Object.keys(_kts);
          if(_keys.length===1){
            var _h=_kts[_keys[0]]; var _dashed=_keys[0].slice(0,6)+'-'+_keys[0].slice(6);
            var _upd={customer_kt:_dashed};
            if(_h.coId!=null)_upd.customer_id=_h.coId;
            if(_h.baseId!=null)_upd.customer_base_id=_h.baseId;
            await DB.sb.from('solur').update(_upd).eq('id',sr.data.id);
            state.customer.co_id=_h.coId||state.customer.co_id;
          }
        }catch(_e){console.warn('[POS] name-kt backfill:',_e);}
      }
      var svc=state.lines.filter(function(l){return l.type==='service';});
      // The checkout dialog's "Sleppa að búa til verkbeiðnir" checkbox sets
      // window._pendingSkipVerk = true. Useful when a refill/hleðsla
      // happens on the spot and no follow-up work request is needed.
      var skipVerk = window._pendingSkipVerk === true;
      window._pendingSkipVerk = false; // reset for next sale
      var verkCount = 0;
      // 2026-05-12: Detect CO₂ byrjunargjald in the cart. It's a 'product'
      // line so it doesn't get its own verkbeiðni — but the user wants it
      // visible alongside the CO₂ 100gr refill it accompanies. We fold its
      // amount + a note into the matching CO₂ 100gr verkbeiðni below.
      var _bgLine = (state.lines || []).find(function(l){
        return /byrjunargjald/i.test(l.desc || '');
      });
      var _bgInc = 0;
      if (_bgLine) {
        var _bgQty = +_bgLine.qty || 1;
        var _bgEx  = +_bgLine.unit_price_ex_vat || 0;
        var _bgVat = +_bgLine.vsk_pct || 24;
        _bgInc = Math.round(_bgQty * _bgEx * (1 + _bgVat/100));
      }
      var _bgConsumed = false; // ensure we only bundle once even with multiple CO₂ lines
      if (!skipVerk) {
        // Pickup-offset comes from Stillingar → Almennt → "Default sókn (dagar)".
        // Default VSK% (when product/service didn't specify) also from settings.
        var pickupOffsetDays = 7;
        var defVsk = 24;
        try{var _o=window.AppSettings&&window.AppSettings.path('almennt.default_pickup_offset_days');if(Number.isFinite(+_o)&&+_o>0)pickupOffsetDays=+_o;var _v=window.AppSettings&&window.AppSettings.path('almennt.default_vsk_pct');if(Number.isFinite(+_v)&&+_v>0)defVsk=+_v;}catch(e){}
        // 2026-05-08: Auk þess að búa til verkbeiðnir þá búum við líka til
        // verklidur (eitt fyrir hvert magn í línunni). Án þess sá Verkstæði
        // alltaf „0 slökkvitæki" á hverri verkbeiðni — því job.units kemur
        // úr verklidur-töflu (sjá db.js loadAll).
        // Notum SalaLineUnits.get() ef notandi skráði raðnúmer í 🏷-gluggann
        // áður en hann smellti ÁFRAM. Annars er TMP-XXXXXX placeholder
        // sem tæknimaður skiptir út fyrir alvöru raðnúmer við skoðun.
        function makeTmpSerial(){
          var ALPHA='23456789ABCDEFGHJKLMNPQRSTUVWXYZ', s='';
          for(var k=0;k<6;k++){s+=ALPHA[Math.floor(Math.random()*ALPHA.length)];}
          return 'TMP-'+s;
        }
        // Build a quick lookup by line desc → registered units
        var pendingUnitsByDesc = {};
        try {
          if (window.SalaLineUnits && typeof SalaLineUnits.get === 'function') {
            var entries = SalaLineUnits.get();
            for (var ee=0; ee<entries.length; ee++) {
              var data = entries[ee][1];
              if (data && data.desc) pendingUnitsByDesc[data.desc] = data.units || [];
            }
          }
        } catch(_){}

        for(var i=0;i<svc.length;i++){
          var sl=svc[i];
          var vatRate=(sl.vsk_pct!=null?sl.vsk_pct:defVsk);
          // 2026-05-11: Include the cart's general "Athugasemd" textarea
          // in verkbeidnir.notes so workshop / counter staff actually see
          // the note the salesperson wrote at sale time. Previously the
          // note only landed on solur.athugasemdir and was invisible to
          // workshop, which made it easy to forget.
          // 2026-05-11 (later): only attach the general note to the FIRST
          // verkbeiðni — not every one. Otherwise patch 134 surfaces the
          // same note on every order in Counter/Workshop, making it look
          // like the note belongs to all orders ("Þeir hringdu..." sticky
          // on every job).
          var notesParts = [sl.desc + (sl.ref ? ' · ' + sl.ref : '')];
          if (i === 0 && state.notes && state.notes.trim()) notesParts.push(state.notes.trim());
          // 2026-05-12: For gram-based services (CO₂ 100gr × 20 = 1 cylinder)
          // the verklidur count is 1 but the price should reflect the FULL line
          // total (qty × unit). modal.js / counter view computes
          // totalKr = verd × units.length — so for 1-unit gram-based jobs we
          // must store qty × unit_price as verd, not just unit_price.
          var _qty = parseInt(sl.qty, 10) || 1;
          var _isGramBasedLine = /\b\d+\s*(gr?\.?|gramm|ml|litr?)\b/i.test(sl.desc);
          var _verd = Math.round(sl.unit_price_ex_vat * (1 + vatRate/100));
          if (_isGramBasedLine) _verd = Math.round(sl.unit_price_ex_vat * _qty * (1 + vatRate/100));
          // Fold CO₂ byrjunargjald into the CO₂ 100gr verkbeiðni (price + note)
          // Match Unicode ₂ (U+2082) as well as ASCII 2, plus 'kolsýra'.
          var _isCo2_100gr = (+sl.product_id === 83)
            || /(co[2₂]|kols[ýy]ra).*100\s*gr|100\s*gr.*(co[2₂]|kols[ýy]ra)/i.test(sl.desc);
          if (_isCo2_100gr && _bgInc > 0 && !_bgConsumed) {
            _verd += _bgInc;
            notesParts.push('🚚 Byrjunargjald: ' + _bgInc.toLocaleString('is-IS') + ' kr (innifalið)');
            _bgConsumed = true;
          }
          var insertResult = await DB.sb.from('verkbeidnir').insert({
            num: num+'-V'+(i+1),
            status: 'received',
            customer: cust,
            phone: state.customer.simi,
            dropoff: new Date().toISOString().substring(0,10),
            pickup: new Date(Date.now()+pickupOffsetDays*86400000).toISOString().substring(0,10),
            notes: notesParts.join('\n— '),
            verd: _verd
          }).select('id').single();
          // 2026-05-14: Don't lie about success when the insert errored out.
          // Log the error so it's visible, AND don't bump verkCount for the
          // failed insert — the post-sale modal then shows the real count.
          if (insertResult && insertResult.error) {
            console.error('[pos] verkbeidnir insert failed:', insertResult.error);
            continue; // skip verklidur creation for this line
          }
          verkCount++;
          // Insert verklidur rows so workshop view has clickable units
          var jobId = insertResult && insertResult.data && insertResult.data.id;
          if (jobId) {
            var qty = parseInt(sl.qty, 10) || 1;
            var registered = pendingUnitsByDesc[sl.desc] || [];
            // 2026-05-12: Gram-based services (e.g. "CO₂ 100 gr.") use qty as
            // the WEIGHT (20 × 100gr = 2kg refill into a single cylinder),
            // not as a count of separate units. Treat as 1 verklidur in that
            // case so workshop sees the cylinder once, not 20 phantom rows.
            // Detect via "gr" / "gramm" / "ml" / "litr" tokens in desc, OR by
            // checking that user didn't register multiple serials.
            var isGramBased = /\b\d+\s*(gr?\.?|gramm|ml|litr?)\b/i.test(sl.desc) && registered.length <= 1;
            var verklidurCount = isGramBased ? 1 : qty;
            var verklidurRows = [];
            for (var u=0; u<verklidurCount; u++) {
              var registeredUnit = registered[u];
              var serial = (registeredUnit && registeredUnit.serial && registeredUnit.serial.trim())
                || makeTmpSerial();
              verklidurRows.push({
                job_id: jobId,
                serial: serial,
                type: '—',                // workshop will fill in correct type
                size: '',
                service: isGramBased
                  ? sl.desc + ' × ' + qty + ' (samtals)'
                  : sl.desc,
                status: 'received'
              });
            }
            if (verklidurRows.length) {
              try { await DB.sb.from('verklidur').insert(verklidurRows); }
              catch (e) { console.warn('[pos] verklidur insert failed:', e); }
            }
          }
        }
      }
      // 2026-05-11: Replaced the blocking native alert() with a non-blocking
      // success modal that shows a clear summary + an explicit "Prenta aftur"
      // button. The alert() was confusing because it interrupted the print
      // window flow and the user had to dismiss it before they could see
      // what actually happened. Now the modal lives alongside the print
      // window (if it opened) so the user can compare or re-print easily.
      var verkMsgShort = skipVerk
        ? '⏭ Engar verkbeiðnir búnar til'
        : (verkCount + ' verkbeiðni' + (verkCount === 1 ? '' : 'r') + ' búin' + (verkCount === 1 ? '' : 'ar') + ' til');
      // 2026-05-19: Skip the "Sala kláruð" success modal when payment is
      // "greitt_sidar" (pay when picking up). The customer doesn't need a
      // receipt yet — the pickup-checkout flow (patch 121) will print one
      // at pickup. Showing the success modal here is just a click-to-
      // dismiss for the operator. Quick toast confirmation is enough.
      if (pmCode === 'greitt_sidar') {
        if (window.Toast && Toast.show) {
          Toast.show('✓ Drög stofnuð — ' + num + ' · greitt við afhendingu', 'success');
        }
      } else {
        showSaleSuccess({
          num: num,
          total: t.total,
          customer: cust,
          verkMsg: verkMsgShort,
          lines: state.lines.slice(),
          totals: t,
          method: pmLabel,
          phone: state.customer.simi || '',
          // 2026-05-18: snapshot discount so "Prenta aftur" shows it on the receipt.
          // Without these, fakeSale below hardcodes afslattur=0 and the re-print
          // silently drops the discount.
          discount_pct: state.discount_pct || 0,
          discount: state.discount || 0
        });
      }
      state.customer={mode:'kt',kt:'',nafn:'',simi:'',co_id:null,afslattur_pct:0,athugasemdir:''};state.lines=[];state.notes='';state.discount=0;state.discount_pct=0;state.beidninumer='';
      // Hide the customer memo box on reset so it doesn't leak into the next sale
      var memoBoxReset=document.getElementById('pos-customer-memo');if(memoBoxReset)memoBoxReset.style.display='none';
      var v=document.getElementById('view-sala');v.removeAttribute('data-pos-v3');render();
    }catch(e){alert('Villa: '+(e.message||e));}finally{btn.disabled=false;btn.innerHTML='✓ ÁFRAM';}
  }

  // Non-blocking success modal that replaces the old alert('✓ Sala ...').
  // Shows: invoice number, total, customer, verkbeiðnir count, and quick
  // actions (Prenta aftur, Skoða í reikningum, Ný sala).
  function showSaleSuccess(info) {
    var existing = document.getElementById('_pos-success');
    if (existing) existing.remove();
    var ov = document.createElement('div');
    ov.id = '_pos-success';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;animation:_psFade .2s ease-out';
    if (!document.getElementById('_ps-anim')) {
      var st = document.createElement('style');
      st.id = '_ps-anim';
      st.textContent = '@keyframes _psFade{from{opacity:0}to{opacity:1}}@keyframes _psSlide{from{transform:translateY(-12px);opacity:0}to{transform:translateY(0);opacity:1}}';
      document.head.appendChild(st);
    }
    ov.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:440px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.35);overflow:hidden;animation:_psSlide .25s ease-out">' +
        '<div style="background:linear-gradient(135deg,#10b981,#047857);color:#fff;padding:22px 26px">' +
          '<div style="font-size:36px;line-height:1;margin-bottom:6px">✓</div>' +
          '<div style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;opacity:.85">Sala kláruð</div>' +
          '<div style="font-size:26px;font-weight:800;margin-top:4px;font-variant-numeric:tabular-nums">' + fmtKr(info.total) + '</div>' +
        '</div>' +
        '<div style="padding:20px 26px;font-size:14px;color:#0f172a">' +
          '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b">Reikningsnúmer:</span><span style="font-weight:700;font-family:monospace">' + esc(info.num) + '</span></div>' +
          '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b">Viðskiptavinur:</span><span style="font-weight:600">' + esc(info.customer) + '</span></div>' +
          '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9"><span style="color:#64748b">Greitt með:</span><span style="font-weight:600">' + esc(info.method) + '</span></div>' +
          '<div style="display:flex;justify-content:space-between;padding:6px 0"><span style="color:#64748b">Verkstæði:</span><span style="font-weight:600;color:#1e40af">' + esc(info.verkMsg) + '</span></div>' +
        '</div>' +
        '<div style="padding:12px 22px 18px;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">' +
          '<button id="_ps-reprint" type="button" style="background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;border-radius:8px;padding:9px 14px;font-size:13px;cursor:pointer;font-weight:600">🖨 Prenta aftur</button>' +
          '<button id="_ps-view" type="button" style="background:#f1f5f9;color:#0f172a;border:1px solid #cbd5e1;border-radius:8px;padding:9px 14px;font-size:13px;cursor:pointer;font-weight:600">📋 Reikningar</button>' +
          '<button id="_ps-close" type="button" style="background:#10b981;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:14px;cursor:pointer;font-weight:700">↺ Ný sala</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    function closeOv() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
    ov.addEventListener('click', function(e){ if (e.target === ov) closeOv(); });
    document.getElementById('_ps-close').onclick = closeOv;
    document.getElementById('_ps-view').onclick = function(){
      closeOv();
      if (window.App && App.switchView) App.switchView('reikningar');
    };
    document.getElementById('_ps-reprint').onclick = function(){
      var btn = this;
      btn.disabled = true; btn.textContent = '🖨 Prentar...';
      var w = window.open('', '_blank', 'width=900,height=1100');
      if (!w) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta'); btn.disabled = false; btn.textContent = '🖨 Prenta aftur'; return; }
      if (window.SalaInvoice && typeof SalaInvoice.render === 'function') {
        // Synthesise a sale row so SalaInvoice.renderFromSale produces the
        // same A4 layout that historical re-prints use.
        // 2026-05-18: include the discount snapshot from the original sale
        // so the re-print matches the first print. `afslattur` is the kr value
        // applied; renderFromSale reads it as discount=afslattur, discount_pct=0.
        // 2026-06-12: afslattur is now the m.vsk saved amount; samtals is
        // included so renderFromSale's semantics detection picks gross.
        var fakeAfslattur = Math.round(+(info.totals && info.totals.saved) || 0);
        var fakeSale = {
          num: info.num,
          customer_nafn: info.customer,
          greitt_med: info.method,
          starfsmadur: 'Kassi',
          linur: info.lines || [],
          afslattur: fakeAfslattur,
          samtals: Math.round(+(info.totals && info.totals.total) || 0),
          athugasemdir: ''
        };
        if (typeof SalaInvoice.renderFromSale === 'function') {
          SalaInvoice.renderFromSale(w, fakeSale, null);
        } else {
          SalaInvoice.render(w, {
            customerName: info.customer,
            paymentMethod: info.method,
            invoiceNum: info.num,
            discount_pct: info.discount_pct || 0,
            discount: info.discount || fakeAfslattur || 0,
            discount_gross: true
          });
        }
      } else {
        showReceipt(info.num, info.customer, info.lines || [], info.totals, 0, info.phone || '', '');
      }
      setTimeout(function(){ btn.disabled = false; btn.textContent = '🖨 Prenta aftur'; }, 800);
    };

    // Auto-focus the "Ný sala" button so Enter closes the modal.
    setTimeout(function(){ var b = document.getElementById('_ps-close'); if (b) b.focus(); }, 50);
    // Esc closes too.
    document.addEventListener('keydown', function escH(e){
      if (e.key === 'Escape') { closeOv(); document.removeEventListener('keydown', escH); }
    });
  }
  function showReceipt(num, cust, lines, totals, svcCount, phone, notes){
    var now = new Date();
    var dateStr = now.toLocaleDateString('is-IS',{day:'numeric',month:'short',year:'numeric'});
    var timeStr = now.toLocaleTimeString('is-IS',{hour:'2-digit',minute:'2-digit',hour12:false});
    var linesHtml = lines.map(function(l){
      var lineTotal = l.qty * l.unit_price_ex_vat * (1 + (l.vsk_pct||24)/100);
      return '<tr><td style="padding:4px 0;font-size:13px">'+esc(l.desc)+(l.ref?' <span style="color:#888;font-size:11px">'+esc(l.ref)+'</span>':'')+'</td><td style="padding:4px 8px;text-align:center;font-size:13px">'+l.qty+'</td><td style="padding:4px 0;text-align:right;font-size:13px">'+fmtKr(lineTotal)+'</td></tr>';
    }).join('');
    var html = '<!DOCTYPE html><html><head><title>Kvittun '+esc(num)+'</title><style>@media print{body{margin:0;padding:10mm}@page{size:80mm auto;margin:0}}.receipt{font-family:system-ui,-apple-system,sans-serif;max-width:380px;margin:0 auto;padding:24px}.receipt-logo{text-align:center;margin-bottom:16px}.receipt-logo svg{margin-bottom:8px}.receipt-co{font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:-0.02em}.receipt-sub{font-size:11px;color:#666;margin-top:2px}.receipt-info{border-top:2px solid #000;border-bottom:1px solid #ccc;padding:10px 0;margin:12px 0;font-size:12px;display:grid;grid-template-columns:1fr 1fr;gap:4px}.receipt-info span{color:#666}.receipt table{width:100%;border-collapse:collapse}.receipt th{text-align:left;font-size:11px;color:#666;padding:4px 0;border-bottom:1px solid #ddd}.receipt .totals{border-top:2px solid #000;margin-top:8px;padding-top:8px}.receipt .total-row{display:flex;justify-content:space-between;padding:2px 0;font-size:13px;color:#444}.receipt .grand-total{font-size:18px;font-weight:800;color:#000;margin-top:4px;padding-top:4px;border-top:1px solid #ccc}.receipt .footer{text-align:center;margin-top:20px;font-size:11px;color:#888;border-top:1px dashed #ccc;padding-top:12px}.no-print{text-align:center;margin:20px auto;max-width:380px}@media print{.no-print{display:none}}</style></head><body>'+
    '<div class="no-print"><button onclick="window.print()" style="background:#1a7f4b;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-weight:700;font-size:16px;cursor:pointer;margin-right:8px">🖨 Prenta kvittun</button><button onclick="window.close()" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer">Loka</button></div>'+
    '<div class="receipt">'+
      '<div class="receipt-logo">'+
        '<svg viewBox="0 0 48 48" width="48" height="48"><circle cx="24" cy="24" r="22" fill="#dc2626"/><path d="M24 8c-2 7-8 10-8 18a8 8 0 0 0 16 0c0-4-2-6-4-8 0 3-2 4.5-3 4.5 0-4 2-6 -1-14.5z" fill="#fbbf24"/><path d="M24 14c-1.5 4-5 6-5 11a5 5 0 0 0 10 0c0-2-.5-3-2-4 0 1.5-1 2.5-2 2.5 0-2 1-4 -1-9.5z" fill="#fff"/></svg>'+
        '<div class="receipt-co">Slökkvitæki ehf</div>'+
        '<div class="receipt-sub">Helluhraun 10, 220 Hafnarfirði · 565-4080</div>'+
        '<div class="receipt-sub">Kt: 600508-0400</div>'+
      '</div>'+
      '<div class="receipt-info">'+
        '<div><span>Kvittun:</span> '+esc(num)+'</div>'+
        '<div><span>Dagsetning:</span> '+dateStr+'</div>'+
        '<div><span>Viðskiptavinur:</span> '+esc(cust)+'</div>'+
        '<div><span>Tími:</span> '+timeStr+'</div>'+
        (phone?'<div><span>Sími:</span> '+esc(phone)+'</div>':'')+
        '<div><span>Starfsmaður:</span> Kassi</div>'+
      '</div>'+
      '<table><thead><tr><th>Lýsing</th><th style="text-align:center">Magn</th><th style="text-align:right">Verð</th></tr></thead><tbody>'+linesHtml+'</tbody></table>'+
      '<div class="totals">'+
        '<div class="total-row"><span>Án VSK:</span><span>'+fmtKr(totals.ex)+'</span></div>'+
        '<div class="total-row"><span>VSK (24%):</span><span>'+fmtKr(totals.vsk)+'</span></div>'+
        '<div class="total-row grand-total"><span>Samtals:</span><span>'+fmtKr(totals.total)+'</span></div>'+
      '</div>'+
      (notes?'<div style="margin-top:12px;font-size:12px;color:#666;border:1px solid #eee;padding:8px;border-radius:4px"><b>Ath:</b> '+esc(notes)+'</div>':'')+
      (svcCount>0?'<div style="margin-top:8px;font-size:11px;color:#888">'+svcCount+' verkbeiðni/r búin/ar til</div>':'')+
      '<div class="footer">'+
        'Takk fyrir viðskiptin!<br>'+
        'Slökkvitæki ehf · Helluhraun 10 · 565-4080'+
      '</div>'+
    '</div></body></html>';
    var w = window.open('','_blank','width=450,height=700');
    if(w){ w.document.write(html); w.document.close(); }
    else { alert('\u2713 Sala '+num+' vistuð ('+fmtKr(totals.total)+')'); }
  }
  function printReceipt(sale, customerName, lines, totalsObj){
    var w = window.open('','_blank','width=400,height=700');
    if(!w){ alert('Popup blocker — leyfa popups'); return; }
    var now = new Date();
    var dateStr = now.toLocaleDateString('is-IS',{day:'numeric',month:'short',year:'numeric'});
    var timeStr = now.toLocaleTimeString('is-IS',{hour:'2-digit',minute:'2-digit',hour12:false});
    var linesHtml = lines.map(function(l){
      var lt = l.qty * l.unit_price_ex_vat * (1 + (l.vsk_pct||24)/100);
      return '<tr><td style="padding:4px 0;font-size:12px">'+(l.type==='service'?'🔧':'🛒')+' '+esc(l.desc)+(l.ref?' <span style="color:#888;font-size:10px">'+esc(l.ref)+'</span>':'')+'</td><td style="text-align:center;font-size:12px">'+l.qty+'</td><td style="text-align:right;font-size:12px;white-space:nowrap">'+fmtKr(lt)+'</td></tr>';
    }).join('');
    w.document.write('<html><head><title>Kvittun '+esc(sale.num)+'</title><style>@media print{body{margin:0;padding:8px}button{display:none!important}}body{font-family:system-ui,-apple-system,sans-serif;max-width:360px;margin:0 auto;padding:16px;color:#111}table{width:100%;border-collapse:collapse}</style></head><body>'+
    '<div style="text-align:center;padding:16px 0;border-bottom:2px solid #111">' +
      '<svg viewBox="0 0 48 48" width="48" height="48"><rect width="48" height="48" rx="10" fill="#dc2626"/><path d="M24 8c-2 6-7 9-7 16a7 7 0 0 0 14 0c0-3-1-5-3-7 0 3-1.5 4.5-3 4.5 0-4 3-7-1-13.5z" fill="#fbbf24"/><path d="M24 14c-1.5 3-4 5-4 9a4 4 0 0 0 8 0c0-2-.5-3-1.5-4 0 1.5-.5 2.5-1.5 2.5 0-2 1-3.5-1-7.5z" fill="#fff"/></svg>' +
      '<div style="font-size:20px;font-weight:800;margin-top:8px;text-transform:uppercase">Slökkvitæki ehf</div>' +
      '<div style="font-size:11px;color:#666;margin-top:2px">Slökkvitækjaþjónusta</div>' +
      '<div style="font-size:11px;color:#666">Helluhraun 10, 220 Hafnarfirði · 565-4080</div>' +
      '<div style="font-size:10px;color:#999;margin-top:4px">Kt. 600508-0400</div>' +
    '</div>' +
    '<div style="padding:12px 0;border-bottom:1px dashed #ccc;display:flex;justify-content:space-between;font-size:12px">' +
      '<div><strong>Kvittun:</strong> '+esc(sale.num)+'</div>' +
      '<div>'+dateStr+' '+timeStr+'</div>' +
    '</div>' +
    (customerName && customerName !== 'Staðgreitt' ? '<div style="padding:8px 0;border-bottom:1px dashed #ccc;font-size:12px"><strong>Viðskiptavinur:</strong> '+esc(customerName)+'</div>' : '') +
    '<table style="margin:12px 0"><thead><tr style="border-bottom:1px solid #333"><th style="text-align:left;padding:4px 0;font-size:11px;color:#666">Lýsing</th><th style="text-align:center;font-size:11px;color:#666">Magn</th><th style="text-align:right;font-size:11px;color:#666">Verð</th></tr></thead><tbody>'+linesHtml+'</tbody></table>' +
    '<div style="border-top:2px solid #111;padding:8px 0;font-size:12px">' +
      '<div style="display:flex;justify-content:space-between;padding:2px 0;color:#666"><span>Án VSK:</span><span>'+fmtKr(totalsObj.ex)+'</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:2px 0;color:#666"><span>VSK 24%:</span><span>'+fmtKr(totalsObj.vsk)+'</span></div>' +
      '<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:18px;font-weight:800"><span>Samtals:</span><span>'+fmtKr(totalsObj.total)+'</span></div>' +
    '</div>' +
    '<div style="text-align:center;padding:16px 0;border-top:1px dashed #ccc;color:#888;font-size:11px">' +
      '<div>Greitt með: '+(sale.greitt_med||'Kort')+'</div>' +
      (sale.athugasemdir ? '<div style="margin-top:4px">'+esc(sale.athugasemdir)+'</div>' : '') +
      '<div style="margin-top:8px;font-size:10px">Takk fyrir viðskiptin!</div>' +
    '</div>' +
    '<div style="text-align:center;padding:12px 0"><button onclick="window.print()" style="padding:10px 24px;background:#1a7f4b;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">🖨️ Prenta</button></div>' +
    '</body></html>');
    w.document.close();
  }
  function watch(){setInterval(function(){var v=document.getElementById('view-sala');if(!v||!v.classList.contains('active'))return;if(!document.getElementById('pos-checkout')){v.removeAttribute('data-pos-v3');loadAll().then(render);}},300);}
  window.POS = { getState: function(){ return state; }, totals: totals, rerenderDynamic: rerenderDynamic };
  function init(){watch();console.log('[POS v3] Ready');}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();