/* Vörur og þjónusta v2 — tabs for products + services, image upload, price editing */
(function(){
  'use strict';
  var _products = [];
  var _activeTab = 'allt'; // 'allt' | 'vorur' | 'thjonusta'

  function fmtKr(n){return Math.round(Number(n)||0).toLocaleString('is-IS')+' kr';}
  function fmtKrVat(n){var w=Number(n)*1.24;return Math.round(w).toLocaleString('is-IS')+' kr m/vsk';}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  async function compressImage(file,maxDim){
    maxDim = maxDim || 800;
    return new Promise(function(res,rej){
      var r=new FileReader();
      r.onload=function(){
        var img=new Image();
        img.onload=function(){
          var c=document.createElement('canvas');
          var w=img.width,h=img.height;
          if(w>maxDim||h>maxDim){
            if(w>h){h=Math.round(h*(maxDim/w));w=maxDim;}
            else{w=Math.round(w*(maxDim/h));h=maxDim;}
          }
          c.width=w;c.height=h;
          c.getContext('2d').drawImage(img,0,0,w,h);
          res(c.toDataURL('image/jpeg',0.85));
        };
        img.onerror=rej;
        img.src=r.result;
      };
      r.onerror=rej;
      r.readAsDataURL(file);
    });
  }

  async function loadProducts(){
    var r = await DB.sb.from('vorur').select('*').order('flokkur',{ascending:true}).order('nafn',{ascending:true});
    _products = r.data || [];
  }

  function filteredProducts(){
    if(_activeTab==='vorur') return _products.filter(function(p){return p.flokkur !== 'Þjónusta';});
    if(_activeTab==='thjonusta') return _products.filter(function(p){return p.flokkur === 'Þjónusta';});
    return _products;
  }

  function renderView(){
    var v = document.getElementById('view-vorur');
    if(!v) return;
    var counts = {
      allt: _products.length,
      vorur: _products.filter(function(p){return p.flokkur !== 'Þjónusta';}).length,
      thjonusta: _products.filter(function(p){return p.flokkur === 'Þjónusta';}).length
    };
    v.innerHTML = '<div style="padding:20px;max-width:1200px;margin:0 auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">' +
        '<h1 style="margin:0;font-size:22px;color:#0f172a">Vörur og þjónusta</h1>' +
        '<button id="vorur-new" style="background:#1a7f4b;color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px">+ Ný vara/þjónusta</button>' +
      '</div>' +
      // Tabs
      '<div style="display:flex;gap:4px;margin-bottom:16px;border-bottom:2px solid #e2e8f0">' +
        tabBtn('allt','Allt · '+counts.allt) +
        tabBtn('vorur','Vörur · '+counts.vorur) +
        tabBtn('thjonusta','Þjónusta · '+counts.thjonusta) +
      '</div>' +
      // Grid
      '<div id="vorur-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px"></div>' +
    '</div>';
    bindEvents();
    renderGrid();
  }

  function tabBtn(key,label){
    var a = _activeTab === key;
    return '<button class="vorur-tab" data-tab="'+key+'" style="padding:10px 18px;background:'+(a?'#fff':'transparent')+';border:none;border-bottom:'+(a?'3px solid #dc2626':'3px solid transparent')+';color:'+(a?'#0f172a':'#64748b')+';font-weight:'+(a?'700':'500')+';cursor:pointer;font-size:14px;margin-bottom:-2px">'+label+'</button>';
  }

  function renderGrid(){
    var grid = document.getElementById('vorur-grid');
    if(!grid) return;
    var rows = filteredProducts();
    if(!rows.length){grid.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:40px;grid-column:1/-1">Engar færslur. Smelltu á "+ Ný vara/þjónusta" til að bæta við.</div>';return;}
    grid.innerHTML = rows.map(function(p){
      var priceInc = p.verd_an_vsk * (1 + (p.vsk_prosenta||24)/100);
      var img = p.mynd ? '<img src="'+esc(p.mynd)+'" style="width:100%;height:140px;object-fit:cover;border-radius:8px;background:#f8fafc">' : '<div style="width:100%;height:140px;background:#f8fafc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:32px">📦</div>';
      var isSvc = p.flokkur === 'Þjónusta';
      var badge = '<span style="display:inline-block;background:'+(isSvc?'#fef3c7':'#dbeafe')+';color:'+(isSvc?'#92400e':'#1e40af')+';font-size:10px;padding:2px 7px;border-radius:12px;font-weight:700;letter-spacing:0.03em">'+esc(p.flokkur||'')+'</span>';
      var stockInfo = !isSvc && p.birgdir!=null ? '<div style="font-size:11px;color:#64748b;margin-top:4px">🏷️ '+p.birgdir+' á lager</div>' : '';
      var virktPill = p.virkt ? '' : '<span style="display:inline-block;background:#fee2e2;color:#b91c1c;font-size:10px;padding:2px 7px;border-radius:12px;font-weight:700;margin-left:4px">ÓVIRKT</span>';
      return '<div class="vorur-card" data-id="'+p.id+'" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor=\'#cbd5e1\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.05)\'" onmouseout="this.style.borderColor=\'#e2e8f0\';this.style.boxShadow=\'\'">' +
        img +
        '<div style="margin-top:10px">' +
          '<div>'+badge+virktPill+'</div>' +
          '<div style="font-weight:700;color:#0f172a;font-size:14px;margin-top:6px;line-height:1.3">'+esc(p.nafn)+'</div>' +
          (p.lysing ? '<div style="color:#64748b;font-size:12px;margin-top:4px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">'+esc(p.lysing)+'</div>' : '') +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">' +
            '<div><div style="font-weight:700;color:#0f172a;font-size:15px">'+fmtKr(priceInc)+'</div><div style="color:#64748b;font-size:11px">'+fmtKr(p.verd_an_vsk)+' án vsk</div></div>' +
            stockInfo +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');
    // Click handlers
    Array.from(grid.querySelectorAll('.vorur-card')).forEach(function(c){
      c.addEventListener('click',function(){
        openEditor(parseInt(c.getAttribute('data-id'),10));
      });
    });
  }

  function bindEvents(){
    Array.from(document.querySelectorAll('.vorur-tab')).forEach(function(b){
      b.addEventListener('click',function(){
        _activeTab = b.getAttribute('data-tab');
        renderView();
      });
    });
    var nb = document.getElementById('vorur-new');
    if(nb) nb.addEventListener('click',function(){openEditor(null);});
  }

  function openEditor(id){
    var product = id ? _products.find(function(p){return p.id===id;}) : null;
    var isNew = !product;
    var isSvc = _activeTab === 'thjonusta';
    if(product) isSvc = product.flokkur === 'Þjónusta';
    var flokkar = ['Slökkvitæki','Viðvörunarkerfi','Eldvarnir','Fylgihlutir','Þjónusta'];
    var modalId = 'vorur-modal';
    // Remove old modal
    var old = document.getElementById(modalId);
    if(old) old.remove();
    var m = document.createElement('div');
    m.id = modalId;
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px';
    var p = product || {nafn:'',lysing:'',verd_an_vsk:0,vsk_prosenta:24,birgdir:0,flokkur:isSvc?'Þjónusta':'Slökkvitæki',mynd:'',virkt:true};
    m.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">' +
        '<h2 style="margin:0;color:#0f172a;font-size:20px">'+(isNew?'Ný vara/þjónusta':'Breyta: '+esc(p.nafn))+'</h2>' +
        '<button id="vorur-close" style="background:none;border:none;font-size:24px;color:#64748b;cursor:pointer;padding:0 6px">×</button>' +
      '</div>' +
      // Image preview + upload
      '<div style="display:flex;gap:16px;margin-bottom:16px">' +
        '<div id="vorur-img-prev" style="width:140px;height:140px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">' +
          (p.mynd ? '<img src="'+esc(p.mynd)+'" style="width:100%;height:100%;object-fit:cover">' : '<span style="color:#cbd5e1;font-size:32px">📦</span>') +
        '</div>' +
        '<div style="flex:1">' +
          '<label style="display:block;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600">Mynd</label>' +
          '<input type="file" id="vorur-img-input" accept="image/*" style="font-size:13px;margin-bottom:8px">' +
          '<div style="font-size:11px;color:#94a3b8">Mælt: 800x800px eða minni</div>' +
          (p.mynd ? '<button id="vorur-img-clear" style="margin-top:8px;background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer">Fjarlægja mynd</button>' : '') +
        '</div>' +
      '</div>' +
      // Form fields
      '<label style="display:block;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600">Nafn *</label>' +
      '<input id="f-nafn" type="text" value="'+esc(p.nafn)+'" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box;margin-bottom:12px">' +
      '<label style="display:block;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600">Lýsing</label>' +
      '<textarea id="f-lysing" style="width:100%;min-height:60px;padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box;margin-bottom:12px;font-family:inherit;resize:vertical">'+esc(p.lysing||'')+'</textarea>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        '<div>' +
          '<label style="display:block;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600">Flokkur</label>' +
          '<select id="f-flokkur" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box">' +
            flokkar.map(function(f){return '<option value="'+esc(f)+'"'+(p.flokkur===f?' selected':'')+'>'+esc(f)+'</option>';}).join('') +
          '</select>' +
        '</div>' +
        '<div>' +
          '<label style="display:block;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600">VSK %</label>' +
          '<input id="f-vsk" type="number" value="'+(p.vsk_prosenta||24)+'" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box">' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        '<div>' +
          '<label style="display:block;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600">Verð án VSK</label>' +
          '<input id="f-verd" type="number" value="'+(p.verd_an_vsk||0)+'" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box">' +
          '<div id="f-verd-vsk" style="font-size:11px;color:#64748b;margin-top:4px">'+fmtKrVat(p.verd_an_vsk||0)+'</div>' +
        '</div>' +
        '<div>' +
          '<label style="display:block;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600">Birgðir '+(isSvc?'(á ekki við fyrir þjónustu)':'')+'</label>' +
          '<input id="f-birgdir" type="number" value="'+(p.birgdir||0)+'" '+(isSvc?'disabled':'')+' style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box;'+(isSvc?'background:#f8fafc;color:#cbd5e1':'')+'">' +
        '</div>' +
      '</div>' +
      '<label style="display:flex;align-items:center;gap:8px;margin-bottom:20px;cursor:pointer">' +
        '<input id="f-virkt" type="checkbox" '+(p.virkt!==false?'checked':'')+' style="width:18px;height:18px">' +
        '<span style="font-size:14px;color:#334155">Virkt — sýna í Sala tab</span>' +
      '</label>' +
      '<div style="display:flex;gap:8px;justify-content:space-between;padding-top:16px;border-top:1px solid #e2e8f0">' +
        (isNew ? '<div></div>' : '<button id="vorur-del" style="background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;padding:10px 16px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px">Eyða</button>') +
        '<div style="display:flex;gap:8px">' +
          '<button id="vorur-cancel" style="background:#f1f5f9;color:#334155;border:none;padding:10px 16px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px">Hætta við</button>' +
          '<button id="vorur-save" style="background:#1a7f4b;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer;font-size:14px">Vista</button>' +
        '</div>' +
      '</div>' +
    '</div>';
    document.body.appendChild(m);
    // Track image state
    var imgDataUrl = p.mynd || null;
    // Events
    document.getElementById('vorur-close').addEventListener('click',function(){m.remove();});
    document.getElementById('vorur-cancel').addEventListener('click',function(){m.remove();});
    m.addEventListener('click',function(e){if(e.target===m)m.remove();});
    document.getElementById('f-verd').addEventListener('input',function(e){
      document.getElementById('f-verd-vsk').textContent = fmtKrVat(e.target.value||0);
    });
    // Auto-toggle birgdir when flokkur switches to/from Þjónusta
    document.getElementById('f-flokkur').addEventListener('change',function(e){
      var isSvcNow = e.target.value === 'Þjónusta';
      var br = document.getElementById('f-birgdir');
      br.disabled = isSvcNow;
      br.style.background = isSvcNow?'#f8fafc':'#fff';
      br.style.color = isSvcNow?'#cbd5e1':'#0f172a';
    });
    // Image upload
    document.getElementById('vorur-img-input').addEventListener('change',async function(e){
      var f = e.target.files[0]; if(!f) return;
      try {
        var dataUrl = await compressImage(f, 800);
        imgDataUrl = dataUrl;
        document.getElementById('vorur-img-prev').innerHTML = '<img src="'+dataUrl+'" style="width:100%;height:100%;object-fit:cover">';
      } catch(err){ alert('Villa við að hlaða mynd: '+err); }
    });
    var clearBtn = document.getElementById('vorur-img-clear');
    if(clearBtn) clearBtn.addEventListener('click',function(){
      imgDataUrl = '';
      document.getElementById('vorur-img-prev').innerHTML = '<span style="color:#cbd5e1;font-size:32px">📦</span>';
      clearBtn.remove();
    });
    // Save
    document.getElementById('vorur-save').addEventListener('click',async function(){
      var data = {
        nafn: document.getElementById('f-nafn').value.trim(),
        lysing: document.getElementById('f-lysing').value.trim(),
        verd_an_vsk: parseFloat(document.getElementById('f-verd').value) || 0,
        vsk_prosenta: parseInt(document.getElementById('f-vsk').value,10) || 24,
        birgdir: parseInt(document.getElementById('f-birgdir').value,10) || 0,
        flokkur: document.getElementById('f-flokkur').value,
        mynd: imgDataUrl || '',
        virkt: document.getElementById('f-virkt').checked
      };
      if(!data.nafn){alert('Nafn er skilyrði');return;}
      var btn = document.getElementById('vorur-save');
      btn.disabled = true; btn.textContent = 'Vista...';
      try {
        if(isNew){
          var ir = await DB.sb.from('vorur').insert(data).select().single();
          if(ir.error) throw ir.error;
        } else {
          var ur = await DB.sb.from('vorur').update(data).eq('id',product.id).select().single();
          if(ur.error) throw ur.error;
        }
        await refresh();
        m.remove();
      } catch(e){ alert('Villa: '+(e.message||e)); btn.disabled=false; btn.textContent='Vista'; }
    });
    // Delete
    var delBtn = document.getElementById('vorur-del');
    if(delBtn) delBtn.addEventListener('click',async function(){
      if(!confirm('Viltu virkilega eyða "'+p.nafn+'"?')) return;
      delBtn.disabled = true; delBtn.textContent = 'Eyði...';
      try {
        var dr = await DB.sb.from('vorur').delete().eq('id',product.id);
        if(dr.error) throw dr.error;
        await refresh();
        m.remove();
      } catch(e){ alert('Villa: '+(e.message||e)); delBtn.disabled=false; delBtn.textContent='Eyða'; }
    });
  }

  async function refresh(){ await loadProducts(); renderView(); }

  // Inject nav button once
  function injectNav(){
    var nav = document.querySelector('nav.view-nav');
    if(!nav) return;
    if(document.querySelector('[data-view="vorur"]')) return; // already there
    var btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.setAttribute('data-view','vorur');
    // SVG box icon + label — "Vörur og þjónusta"
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/></svg> Vörur og þjónusta';
    btn.style.cssText = 'display:flex;align-items:center;gap:8px';
    btn.onclick = function(){App.switchView('vorur');};
    // Insert after Viðskiptavinir in "Skrár" section
    var skrar = Array.from(nav.querySelectorAll('div,span')).find(function(e){return e.textContent==='Skrár';});
    if(skrar){
      var next = skrar.nextElementSibling;
      // Walk to find Viðskiptavinir button
      while(next && !/Viðskiptavinir/.test(next.textContent)){next = next.nextElementSibling;}
      if(next && next.nextElementSibling){
        nav.insertBefore(btn, next.nextElementSibling);
      } else { nav.appendChild(btn); }
    } else { nav.appendChild(btn); }
  }

  // Ensure view-vorur element exists
  function ensureViewVorur(){
    if(document.getElementById('view-vorur')) return;
    var v = document.createElement('section');
    v.id = 'view-vorur'; v.className = 'view';
    document.body.appendChild(v);
  }

  function watchView(){
    setInterval(function(){
      var v = document.getElementById('view-vorur');
      if(v && v.classList.contains('active') && v.innerHTML.indexOf('vorur-grid')<0){
        refresh();
      }
    }, 500);
  }

  function init(){
    ensureViewVorur();
    injectNav();
    watchView();
    console.log('[Vörur og þjónusta v2] Ready');
  }

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}
})();