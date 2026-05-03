// POS v3 — reads both services & products from vorur table (flokkur = "Þjónusta" vs other)
(function(){
  'use strict';
  console.log('[POS v3] Script loaded');
  var state = {
    customer: { mode:'kt', kt:'', nafn:'', simi:'', co_id:null },
    lines: [], discount: 0, notes: '',
    products: [], services: []
  };
  var ICONS = {
    flame: '<svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M12 2c-1 4-4 6-4 10a4 4 0 0 0 8 0c0-1.5-.5-3-1.5-4 0 2-1 3-2.5 3 0-3 2-5 0-9z"/></svg>',
    cylinder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><rect x="7" y="5" width="10" height="15" rx="1"/><rect x="9" y="3" width="6" height="2" rx="0.5"/><line x1="9" y1="9" x2="15" y2="9"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z"/><polyline points="9 12 11.5 14.5 16 10"/></svg>',
    wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.3 2.3L13 9l2.3-2.3z"/></svg>',
    smoke: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="28" height="28"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
    blanket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" width="28" height="28"><rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M4 10h16M9 5v14"/></svg>',
    mount: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><path d="M4 4v16M4 8h8a3 3 0 0 1 3 3v2a3 3 0 0 1-3 3H4"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28"><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.5 11h11l2.5-7H6"/></svg>'
  };
  function iconFromNafn(n){n=(n||'').toLowerCase();if(/co2|co₂/i.test(n))return'cylinder';if(/áfyll|afyll/i.test(n))return'flame';if(/ársk|skoð/i.test(n))return'check';if(/viðhald|viðger|vidger/i.test(n))return'wrench';if(/slökk|tæki/i.test(n))return'cylinder';if(/reyk|skynjari/i.test(n))return'smoke';if(/teppi|blanket/i.test(n))return'blanket';if(/veggfesting|festing|mount/i.test(n))return'mount';return'cart';}
  function colorFromNafn(n){n=(n||'').toLowerCase();if(/áfyll|afyll/i.test(n)&&/co2|co₂/i.test(n))return'#0d6efd';if(/áfyll|afyll/i.test(n))return'#dc2626';if(/ársk|skoð/i.test(n))return'#b45309';if(/viðhald|viðger|vidger/i.test(n))return'#6b7280';if(/co2|co₂/i.test(n))return'#0d6efd';if(/slökk|tæki/i.test(n))return'#dc2626';if(/reyk/i.test(n))return'#ea580c';if(/teppi|blanket/i.test(n))return'#059669';if(/veggfesting|festing/i.test(n))return'#7c3aed';return'#475569';}
  function fmtKr(n){var s=Math.round(n).toString();var parts=[];while(s.length>3){parts.unshift(s.slice(-3));s=s.slice(0,-3);}parts.unshift(s);return parts.join('.')+' kr';}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function loadAll(){
    return DB.sb.from('vorur').select('*').eq('virkt',true).order('nafn').then(function(r){
      var all = r.data || [];
      state.services = all.filter(function(p){return p.flokkur==='Þjónusta';});
      state.products = all.filter(function(p){return p.flokkur!=='Þjónusta';});
    }).catch(function(e){state.products=[];state.services=[];});
  }
  function lookupKt(kt){kt=kt.replace(/[^0-9]/g,'');if(kt.length!==10)return Promise.resolve(null);return DB.sb.from('fyrirtaeki').select('id,nafn,simi,kennitala').eq('kennitala',kt).maybeSingle().then(function(r){if(r.data)return{nafn:r.data.nafn,simi:r.data.simi||'',co_id:r.data.id};return null;});}
  function totals(){var ex=0,vsk=0;state.lines.forEach(function(l){var le=l.qty*l.unit_price_ex_vat;ex+=le;vsk+=le*(l.vsk_pct||24)/100;});var ad=Math.max(0,ex-state.discount);var av=ex>0?ad*(vsk/ex):0;return{ex:ad,vsk:av,total:ad+av};}
  function render(){var v=document.getElementById('view-sala');if(!v)return;if(v.getAttribute('data-pos-v3')==='1')return;v.innerHTML=buildHTML();v.setAttribute('data-pos-v3','1');bindEvents();rerenderDynamic();}
  function rerenderDynamic(){var l=document.getElementById('pos-lines');if(l)l.innerHTML=buildLinesHTML();var t=document.getElementById('pos-totals');if(t)t.innerHTML=buildTotalsHTML();var sv=document.getElementById('pos-services');if(sv)sv.innerHTML=buildServicesHTML();var pr=document.getElementById('pos-products');if(pr)pr.innerHTML=buildProductsHTML();var cb=document.getElementById('pos-checkout');if(cb){var tt=totals();cb.innerHTML=tt.total>0?('✓ GREIÐA · '+fmtKr(tt.total)):'✓ GREIÐA';cb.disabled=tt.total===0;}}
  function buildBannerHTML(){
    var now = new Date();
    var _wk = ['Sun','Mán','Þri','Mið','Fim','Fös','Lau'];
    var _mo = ['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'];
    var dagur = _wk[now.getDay()]+' '+now.getDate()+'. '+_mo[now.getMonth()];
    var klst = now.toLocaleTimeString('is-IS',{hour:'2-digit',minute:'2-digit'});
    return '<div class="pos-banner" style="background:linear-gradient(135deg,#1a0505 0%,#3b0a0a 25%,#5c1010 50%,#2d0808 75%,#0f0505 100%);color:#fff;padding:0;border-radius:14px;margin:16px;margin-bottom:12px;display:flex;align-items:stretch;box-shadow:0 8px 32px rgba(180,20,20,0.35);position:relative;overflow:hidden;min-height:92px">' +
      '<div style="width:6px;background:linear-gradient(180deg,#fbbf24,#ef4444,#991b1b,#ef4444,#fbbf24);box-shadow:0 0 12px rgba(251,191,36,0.6)"></div>' +
      '<div style="position:absolute;top:0;right:0;width:70%;height:100%;background:linear-gradient(120deg,transparent 0%,transparent 20%,rgba(251,191,36,0.12) 20%,rgba(251,191,36,0.08) 35%,transparent 35%,transparent 40%,rgba(239,68,68,0.15) 40%,rgba(239,68,68,0.10) 55%,transparent 55%,transparent 60%,rgba(251,191,36,0.08) 60%,rgba(251,191,36,0.05) 75%,transparent 75%,transparent 80%,rgba(239,68,68,0.06) 80%,rgba(239,68,68,0.03) 90%,transparent 90%);pointer-events:none"></div>' +
      '<div style="position:absolute;bottom:0;left:0;width:100%;height:40%;background:linear-gradient(180deg,transparent,rgba(251,191,36,0.06));pointer-events:none"></div>' +
      '<div style="flex:1;padding:18px 28px;display:flex;justify-content:space-between;align-items:center;position:relative;z-index:1">' +
        '<div style="display:flex;align-items:center;gap:18px">' +
          '<div style="width:68px;height:68px;background:linear-gradient(135deg,#ef4444,#991b1b);border-radius:14px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(239,68,68,0.5),0 0 24px rgba(251,191,36,0.2)">' +
            '<svg viewBox="0 0 48 48" width="42" height="42"><path d="M24 6c-2 7-8 10-8 18a8 8 0 0 0 16 0c0-4-2-6-4-8 0 3-2 4.5-3 4.5 0-4 2-6 -1-14.5z" fill="#fbbf24"/><path d="M24 14c-1.5 4-5 6-5 11a5 5 0 0 0 10 0c0-2-.5-3-2-4 0 1.5-1 2.5-2 2.5 0-2 1-4 -1-9.5z" fill="#fff" opacity="0.9"/></svg>' +
          '</div>' +
          '<div>' +
            '<div style="font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1;text-transform:uppercase;text-shadow:0 2px 8px rgba(0,0,0,0.5)">Slökkvitæki<span style="color:#ef4444"> ehf</span></div>' +
            '<div style="font-size:12px;opacity:0.75;margin-top:5px;letter-spacing:0.06em;text-transform:uppercase;font-weight:600">Slökkvitækjaþjónusta</div>' +
            '<div style="font-size:11px;opacity:0.5;margin-top:2px">Helluhraun 10, 220 Hafnarfirði · 565-4080</div>' +
          '</div>' +
        '</div>' +
        '<div style="text-align:right">' +
          '<div style="font-size:10px;opacity:0.45;text-transform:uppercase;letter-spacing:0.1em;font-weight:600">Kassakerfi</div>' +
          '<div style="font-size:20px;font-weight:700;margin-top:4px;font-variant-numeric:tabular-nums;text-shadow:0 2px 6px rgba(0,0,0,0.4)">'+klst+'</div>' +
          '<div style="font-size:11px;opacity:0.55;margin-top:2px">'+esc(dagur)+' · Starfsmaður: Kassi</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  function buildHTML(){
    return buildBannerHTML() +
    '<div style="display:grid;grid-template-columns:1fr 380px;gap:16px;padding:0 16px 16px;min-height:calc(100vh - 160px)">' +
      '<div>' +
        '<div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
            '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em">Viðskiptavinur</div>' +
            '<div style="display:flex;gap:4px">' +
              '<button class="pos-mode-btn" data-mode="kt" style="padding:6px 12px;border:1px solid #60a5fa;background:#eff6ff;color:#1e40af;border-radius:6px;font-weight:600;cursor:pointer;font-size:12px">Kennitala</button>' +
              '<button class="pos-mode-btn" data-mode="manual" style="padding:6px 12px;border:1px solid #cbd5e1;background:#fff;color:#64748b;border-radius:6px;font-weight:600;cursor:pointer;font-size:12px">Nafn/Sími</button>' +
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
        '</div>' +
        '<div style="background:#fff;border-radius:12px;padding:16px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
            '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em">Þjónusta</div>' +
            '<button id="pos-scan" style="background:#1e293b;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-weight:600;cursor:pointer;font-size:12px">📷 Skanna QR</button>' +
          '</div>' +
          '<div id="pos-services" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px"></div>' +
        '</div>' +
        '<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9">' +
          '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px">Vörur</div>' +
          '<div id="pos-products" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px"></div>' +
        '</div>' +
      '</div>' +
      '<div>' +
        '<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9;position:sticky;top:12px;display:flex;flex-direction:column;max-height:calc(100vh - 200px)">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
            '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em">Karfa</div>' +
            '<button id="pos-add-service" style="background:#f1f5f9;color:#334155;border:none;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;font-weight:600">+ Eigin</button>' +
          '</div>' +
          '<div id="pos-lines" style="overflow-y:auto;flex:1;min-height:100px"></div>' +
          '<div id="pos-totals" style="margin-top:10px"></div>' +
          '<textarea id="pos-notes" placeholder="Athugasemdir..." style="width:100%;min-height:44px;margin-top:10px;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-family:inherit;font-size:13px;box-sizing:border-box;resize:vertical"></textarea>' +
          '<button id="pos-checkout" style="width:100%;margin-top:10px;background:linear-gradient(180deg,#16a34a,#15803d);color:#fff;border:none;padding:14px;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 2px 6px rgba(22,163,74,0.25)">✓ GREIÐA</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  function renderTile(item, isService){
    var priceInc = item.verd_an_vsk * (1 + (item.vsk_prosenta||24)/100);
    var verd = priceInc; // always show m/VSK price prominent  
    var col = colorFromNafn(item.nafn);
    var ic = iconFromNafn(item.nafn);
    var img = item.mynd ? '<img src="'+esc(item.mynd)+'" style="width:42px;height:42px;object-fit:cover;border-radius:10px" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' : '';
    var iconDiv = '<div style="width:42px;height:42px;background:'+col+'15;color:'+col+';border-radius:10px;display:'+(item.mynd?'none':'flex')+';align-items:center;justify-content:center">' + ICONS[ic] + '</div>';
    var stockChip = (!isService && item.birgdir != null) ? '<div style="position:absolute;top:6px;right:6px;background:#ecfdf5;color:#065f46;font-size:10px;padding:2px 6px;border-radius:20px;font-weight:600">'+item.birgdir+'</div>' : '';
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
    if(!state.lines.length)return'<div style="color:#94a3b8;text-align:center;padding:32px 16px;font-size:13px;border:2px dashed #e2e8f0;border-radius:8px">Karfan er tóm<br><span style="font-size:11px">Smelltu á flísar til að bæta við</span></div>';
    return state.lines.map(function(l,idx){
      var lineTotal=l.qty*l.unit_price_ex_vat*(1+(l.vsk_pct||24)/100);
      var col=l.type==='service'?'#b45309':'#0d6efd';
      return '<div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9">' +
        '<div style="width:28px;height:28px;background:'+col+'15;color:'+col+';border-radius:6px;display:flex;align-items:center;justify-content:center;margin-right:8px;flex-shrink:0;font-size:14px">'+(l.type==='service'?'🔧':'🛒')+'</div>' +
        '<div style="flex:1;min-width:0"><div style="font-weight:600;color:#0f172a;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(l.desc)+'</div><div style="color:#64748b;font-size:11px">'+l.qty+' × '+fmtKr(l.unit_price_ex_vat)+(l.ref?' · '+esc(l.ref):'')+'</div></div>' +
        '<div style="display:flex;align-items:center;gap:4px;margin-left:6px"><button class="pos-qty-dn" data-idx="'+idx+'" style="background:#f1f5f9;border:none;width:22px;height:22px;border-radius:6px;cursor:pointer;font-weight:700;color:#64748b">−</button><span style="font-weight:600;font-size:13px;min-width:18px;text-align:center">'+l.qty+'</span><button class="pos-qty-up" data-idx="'+idx+'" style="background:#f1f5f9;border:none;width:22px;height:22px;border-radius:6px;cursor:pointer;font-weight:700;color:#64748b">+</button></div>' +
        '<div style="font-weight:700;color:#0f172a;margin-left:8px;white-space:nowrap;font-size:12px;min-width:60px;text-align:right">'+fmtKr(lineTotal)+'</div>' +
        '<button class="pos-line-del" data-idx="'+idx+'" style="background:none;color:#cbd5e1;border:none;cursor:pointer;font-size:18px;padding:2px 6px">×</button>' +
      '</div>';
    }).join('');
  }
  function buildTotalsHTML(){var t=totals();return '<div style="border-top:2px solid #e2e8f0;padding-top:10px;font-variant-numeric:tabular-nums"><div style="display:flex;justify-content:space-between;padding:3px 0;color:#64748b;font-size:13px"><span>Án VSK:</span><span>'+fmtKr(t.ex)+'</span></div><div style="display:flex;justify-content:space-between;padding:3px 0;color:#64748b;font-size:13px"><span>VSK:</span><span>'+fmtKr(t.vsk)+'</span></div><div style="display:flex;justify-content:space-between;padding:6px 0;font-weight:700;font-size:18px;color:#0f172a;margin-top:4px;border-top:1px solid #f1f5f9"><span>Samtals:</span><span>'+fmtKr(t.total)+'</span></div></div>';}
  function bindEvents(){
    document.querySelectorAll('.pos-mode-btn').forEach(function(b){b.addEventListener('click',function(){var m=b.getAttribute('data-mode');state.customer.mode=m;document.querySelectorAll('.pos-mode-btn').forEach(function(x){var a=x.getAttribute('data-mode')===m;x.style.background=a?'#eff6ff':'#fff';x.style.borderColor=a?'#60a5fa':'#cbd5e1';x.style.color=a?'#1e40af':'#64748b';});document.getElementById('pos-kt-box').style.display=m==='kt'?'':'none';document.getElementById('pos-manual-box').style.display=m==='manual'?'':'none';});});
    var ktEl=document.getElementById('pos-kt');
    if(ktEl){ktEl.addEventListener('input',function(){var v=ktEl.value.replace(/[^0-9]/g,'');if(v.length>6)v=v.substring(0,6)+'-'+v.substring(6,10);ktEl.value=v;state.customer.kt=v;var r=document.getElementById('pos-kt-result');var c=v.replace(/[^0-9]/g,'');if(c.length===10){r.textContent='Leita...';lookupKt(c).then(function(m){if(m){state.customer.nafn=m.nafn;state.customer.simi=m.simi;state.customer.co_id=m.co_id;r.innerHTML='<span style="color:#16a34a;font-weight:600">✓ '+esc(m.nafn)+'</span>'+(m.simi?' · '+esc(m.simi):'');}else{state.customer.nafn='';state.customer.simi='';state.customer.co_id=null;r.innerHTML='<span style="color:#b45309">Óþekkt kt — skráð sem nýr</span>';}});}else{r.textContent='';}});}
    var nEl=document.getElementById('pos-nafn'),sEl=document.getElementById('pos-simi');
    if(nEl)nEl.addEventListener('input',function(){state.customer.nafn=nEl.value;});
    if(sEl)sEl.addEventListener('input',function(){state.customer.simi=sEl.value;});
    document.getElementById('pos-add-service').addEventListener('click',promptService);
    document.getElementById('pos-scan').addEventListener('click',scanQr);
    document.getElementById('pos-services').addEventListener('click',function(e){var b=e.target.closest('.pos-svc');if(!b)return;var id=parseInt(b.getAttribute('data-id'),10);var s=state.services.find(function(x){return x.id===id;});if(!s)return;state.lines.push({type:'service',desc:s.nafn,qty:1,unit_price_ex_vat:s.verd_an_vsk,vsk_pct:s.vsk_prosenta||24,ref:'',product_id:s.id});rerenderDynamic();});
    document.getElementById('pos-products').addEventListener('click',function(e){var b=e.target.closest('.pos-prod');if(!b)return;var id=parseInt(b.getAttribute('data-id'),10);addProductLine(id);});
    document.getElementById('pos-lines').addEventListener('click',function(e){var d=e.target.closest('.pos-line-del'),u=e.target.closest('.pos-qty-up'),n=e.target.closest('.pos-qty-dn');if(d){state.lines.splice(parseInt(d.getAttribute('data-idx'),10),1);rerenderDynamic();return;}if(u){var i=parseInt(u.getAttribute('data-idx'),10);state.lines[i].qty++;rerenderDynamic();return;}if(n){var j=parseInt(n.getAttribute('data-idx'),10);state.lines[j].qty--;if(state.lines[j].qty<=0)state.lines.splice(j,1);rerenderDynamic();return;}});
    document.getElementById('pos-notes').addEventListener('input',function(e){state.notes=e.target.value;});
    document.getElementById('pos-checkout').addEventListener('click',checkout);
  }
  function promptService(){var d=prompt('Lýsing:','Önnur þjónusta');if(!d)return;var p=prompt('Verð án VSK:','5000');if(!p)return;var pr=parseFloat(p.replace(/[^0-9.]/g,''));if(isNaN(pr)){alert('Ógilt verð');return;}state.lines.push({type:'service',desc:d,qty:1,unit_price_ex_vat:pr,vsk_pct:24,ref:''});rerenderDynamic();}
  function scanQr(){if(!window.Scanner||typeof Scanner.open!=='function'){alert('QR skanni ekki tilbúinn');return;}Scanner.open(function(code){if(!code)return;DB.sb.from('uttaeki').select('*').eq('serial',code).maybeSingle().then(function(r){if(r.data){var u=r.data;state.lines.push({type:'service',desc:'Áfylling · '+(u.type||'')+' '+(u.size||''),qty:1,unit_price_ex_vat:8900,vsk_pct:24,ref:u.serial});}else{state.lines.push({type:'service',desc:'Þjónusta',qty:1,unit_price_ex_vat:8900,vsk_pct:24,ref:code});}rerenderDynamic();});});}
  function addProductLine(pid){var p=state.products.find(function(x){return x.id===pid;});if(!p)return;var ex=state.lines.find(function(l){return l.type==='product'&&l.product_id===pid;});if(ex){ex.qty++;}else state.lines.push({type:'product',desc:p.nafn,qty:1,unit_price_ex_vat:p.verd_an_vsk,vsk_pct:p.vsk_prosenta||24,product_id:p.id,ref:''});rerenderDynamic();}
  async function checkout(){
    if(!state.lines.length){alert('Engar línur');return;}
    var cust=state.customer.nafn.trim();
    if(!cust&&state.customer.mode==='kt'&&state.customer.kt)cust='kt: '+state.customer.kt;
    if(!cust){if(!confirm('Enginn viðskiptavinur — halda áfram?'))return;cust='Staðgreitt';}
    var t=totals();var btn=document.getElementById('pos-checkout');btn.disabled=true;btn.innerHTML='Vista...';
    try{
      var y=new Date().getFullYear(),rnd=Math.floor(Math.random()*90000)+10000,num='#'+y+'-'+rnd;
      var sr=await DB.sb.from('solur').insert({num:num,starfsmadur:'Kassi',customer_nafn:cust,customer_id:state.customer.co_id,linur:state.lines,upphaed_an_vsk:Math.round(t.ex),vsk_upphaed:Math.round(t.vsk),afslattur:state.discount,samtals:Math.round(t.total),greitt_med:'Kort',athugasemdir:state.notes}).select().single();
      if(sr.error)throw sr.error;
      // Auto-create fyrirtaeki for new kennitala customers
      if(state.customer.mode==='kt'&&state.customer.kt&&!state.customer.co_id){
        var cleanKt=state.customer.kt.replace(/[^0-9]/g,'');
        if(cleanKt.length===10){
          var custNm=state.customer.nafn||('Vidskiptavinur '+state.customer.kt);
          try{
            var cr=await DB.sb.from('fyrirtaeki').insert({nafn:custNm,kennitala:cleanKt,simi:state.customer.simi||''}).select().single();
            if(cr.data){
              state.customer.co_id=cr.data.id;
              await DB.sb.from('solur').update({customer_id:cr.data.id,customer_nafn:custNm}).eq('id',sr.data.id);
            }
          }catch(ce){console.warn('[POS] Auto-create customer:',ce);}
        }
      }
      var svc=state.lines.filter(function(l){return l.type==='service';});
      for(var i=0;i<svc.length;i++){var sl=svc[i];await DB.sb.from('verkbeidnir').insert({num:num+'-V'+(i+1),status:'received',customer:cust,phone:state.customer.simi,dropoff:new Date().toISOString().substring(0,10),pickup:new Date(Date.now()+7*86400000).toISOString().substring(0,10),notes:sl.desc+(sl.ref?' · '+sl.ref:''),verd:Math.round(sl.unit_price_ex_vat*1.24)});}
      alert('✓ Sala '+num+'\n'+fmtKr(t.total)+'\n'+svc.length+' verkbeiðnir búnar til');
      state.customer={mode:'kt',kt:'',nafn:'',simi:'',co_id:null};state.lines=[];state.notes='';
      var v=document.getElementById('view-sala');v.removeAttribute('data-pos-v3');render();
    }catch(e){alert('Villa: '+(e.message||e));}finally{btn.disabled=false;btn.innerHTML='✓ GREIÐA';}
  }
  function showReceipt(num, cust, lines, totals, svcCount, phone, notes){
    var now = new Date();
    var dateStr = now.toLocaleDateString('is-IS',{day:'numeric',month:'short',year:'numeric'});
    var timeStr = now.toLocaleTimeString('is-IS',{hour:'2-digit',minute:'2-digit'});
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
    var timeStr = now.toLocaleTimeString('is-IS',{hour:'2-digit',minute:'2-digit'});
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
  window.POS = { getState: function(){ return state; }, totals: totals };
  function init(){watch();console.log('[POS v3] Ready');}
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();