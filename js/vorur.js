/* Vörur og þjónusta v2 — tabs for products + services, image upload, price editing */
(function(){
  'use strict';
  var _products = [];
  var _activeTab = 'allt'; // 'allt' | 'vorur' | 'thjonusta'
  var _activeCat = '';     // '' = allir flokkar; annars nafn flokks (undirflokka-sía)
  var _searchTerm = '';

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
    var rows = _products;
    if(_activeTab==='vorur') rows = rows.filter(function(p){return p.flokkur !== 'Þjónusta';});
    else if(_activeTab==='thjonusta') rows = rows.filter(function(p){return p.flokkur === 'Þjónusta';});
    if(_activeCat) rows = rows.filter(function(p){return (p.flokkur||'Annað') === _activeCat;});
    var q = (_searchTerm||'').trim().toLowerCase();
    if(q){
      rows = rows.filter(function(p){
        return (p.nafn||'').toLowerCase().indexOf(q)>=0
            || (p.flokkur||'').toLowerCase().indexOf(q)>=0
            || (p.lysing||'').toLowerCase().indexOf(q)>=0;
      });
    }
    return rows;
  }

  // Sorted list of distinct flokkar (Þjónusta fyrst, Annað síðast) — sama röð og grid-ið.
  function sortCats(cats){
    return cats.sort(function(a,b){
      if (a === 'Þjónusta' && b !== 'Þjónusta') return -1;
      if (b === 'Þjónusta' && a !== 'Þjónusta') return 1;
      if (a === 'Annað' && b !== 'Annað') return 1;
      if (b === 'Annað' && a !== 'Annað') return -1;
      return a.localeCompare(b, 'is');
    });
  }

  function distinctCats(rows){
    var seen = {};
    (rows||_products).forEach(function(p){ seen[p.flokkur||'Annað'] = (seen[p.flokkur||'Annað']||0)+1; });
    return { names: sortCats(Object.keys(seen)), counts: seen };
  }

  function renderView(){
    var v = document.getElementById('view-vorur');
    if(!v) return;
    var counts = {
      allt: _products.length,
      vorur: _products.filter(function(p){return p.flokkur !== 'Þjónusta';}).length,
      thjonusta: _products.filter(function(p){return p.flokkur === 'Þjónusta';}).length
    };
    // Undirflokka-chippar miðast við virka flipann (án undirflokka-síunnar sjálfrar).
    var tabRows = _products;
    if(_activeTab==='vorur') tabRows = tabRows.filter(function(p){return p.flokkur !== 'Þjónusta';});
    else if(_activeTab==='thjonusta') tabRows = tabRows.filter(function(p){return p.flokkur === 'Þjónusta';});
    var cats = distinctCats(tabRows);
    if(_activeCat && cats.names.indexOf(_activeCat) < 0) _activeCat = '';
    // theme.css (2026-07-09): viewið flush svo .thm .app-page bandið eigi útlitið.
    if(!document.getElementById('vorur-thm-style')){
      var st = document.createElement('style');
      st.id = 'vorur-thm-style';
      st.textContent = '#view-vorur{padding:0 !important;max-width:none !important}';
      document.head.appendChild(st);
    }
    v.innerHTML = '<div class="thm"><div class="app-page"><main class="app-main">' +
      '<div class="page-title">' +
        '<div class="page-title__lead">' +
          '<span class="page-title__icon">📦</span>' +
          '<div><h1>Vörur og þjónusta</h1><p>Vörulistinn sem Sala notar — verð, birgðir og flokkar</p></div>' +
        '</div>' +
        '<div class="page-title__tools">' +
          '<button id="vorur-new" style="background:linear-gradient(180deg,#209d5c,#178048);color:#fff;border:1px solid rgba(0,0,0,.25);padding:9px 16px;border-radius:9px;font-family:\'Space Grotesk\',system-ui,sans-serif;font-weight:700;cursor:pointer;font-size:13px;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 4px 10px -4px rgba(0,0,0,.5)">+ Ný vara/þjónusta</button>' +
        '</div>' +
      '</div>' +
      // Search
      '<div style="position:relative;margin-bottom:14px">' +
        '<input id="vorur-search" type="search" placeholder="🔎 Leita eftir nafni, lýsingu eða flokki…" value="'+esc(_searchTerm)+'" ' +
          'style="width:100%;padding:11px 14px 11px 14px;border:1px solid #cbd5e1;border-radius:10px;font:inherit;font-size:14px;box-sizing:border-box;background:#fff">' +
      '</div>' +
      // Tabs — theme filter-chips
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">' +
        tabBtn('allt','Allt · '+counts.allt) +
        tabBtn('vorur','Vörur · '+counts.vorur) +
        tabBtn('thjonusta','Þjónusta · '+counts.thjonusta) +
      '</div>' +
      // Undirflokkar — ein skrunanleg lína af chippum (sími-fyrst: aldrei margra lína veggur)
      '<div style="display:flex;gap:6px;align-items:center;overflow-x:auto;white-space:nowrap;padding-bottom:6px;margin-bottom:12px;-webkit-overflow-scrolling:touch;scrollbar-width:thin">' +
        catChip('','Allir flokkar', tabRows.length) +
        cats.names.map(function(c){ return catChip(c, c, cats.counts[c]); }).join('') +
      '</div>' +
      // Grouped grid
      '<div id="vorur-grid"></div>' +
    '</main></div></div>';
    bindEvents();
    renderGrid();
  }

  function tabBtn(key,label){
    var a = _activeTab === key;
    return '<button class="vorur-tab filter-chip'+(a?' is-active':'')+'" data-tab="'+key+'" type="button">'+label+'</button>';
  }

  // Undirflokka-chip — solid litir (ekki rgba yfir bandinu) svo lesskil séu alltaf góð.
  function catChip(key,label,count){
    var a = _activeCat === key;
    return '<button class="vorur-cat" data-cat="'+esc(key)+'" type="button" style="flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:99px;cursor:pointer;font:inherit;font-size:12px;font-weight:700;' +
      (a ? 'background:#14171d;color:#fff;border:1px solid #14171d'
         : 'background:#fff;color:#334155;border:1px solid #cbd5e1') + '">' +
      esc(label) +
      '<span style="font-size:10.5px;padding:1px 7px;border-radius:10px;font-weight:700;' +
        (a ? 'background:rgba(255,255,255,.22);color:#fff' : 'background:#eef1f6;color:#5b6573') + '">'+count+'</span>' +
    '</button>';
  }

  function renderGrid(){
    var grid = document.getElementById('vorur-grid');
    if(!grid) return;
    var rows = filteredProducts();
    if(!rows.length){
      grid.innerHTML = '<div style="color:#94a3b8;text-align:center;padding:40px">' +
        (_searchTerm ? 'Engin niðurstaða fyrir "'+esc(_searchTerm)+'"' : 'Engar færslur. Smelltu á "+ Ný vara/þjónusta" til að bæta við.') +
      '</div>';
      return;
    }
    // Group by flokkur (category) — same pattern as Sala "Aðrar Vörur" panel.
    var byCat = {};
    rows.forEach(function(p){
      var c = (p.flokkur||'Annað');
      (byCat[c] = byCat[c] || []).push(p);
    });
    // Sort categories: Þjónusta first, then alphabetically. "Annað" last.
    var cats = sortCats(Object.keys(byCat));
    grid.innerHTML = cats.map(function(cat){
      return '<div style="margin-bottom:24px">' +
        // SOLID dökk pilla með hvítum texta — rgba-gegnsæið gamla rann saman við
        // gráa hluta bandsins („grey on grey", verkefnalisti 2026-07-11).
        '<div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:10px;padding:6px 14px;border-radius:99px;background:#14171d;border:1px solid rgba(255,255,255,.22);box-shadow:0 2px 8px -2px rgba(0,0,0,.4)">' +
          '<span style="font-size:13px;font-weight:800;color:#ffffff;text-transform:uppercase;letter-spacing:0.05em">'+esc(cat)+'</span>' +
          '<span style="font-size:11px;color:#ffffff;background:rgba(255,255,255,.24);padding:1px 8px;border-radius:10px;font-weight:700">'+byCat[cat].length+'</span>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(178px,1fr));gap:10px">' +
          byCat[cat].map(renderCard).join('') +
        '</div>' +
      '</div>';
    }).join('');
    // Click handlers on the cards (now nested inside category sections)
    Array.from(grid.querySelectorAll('.vorur-card')).forEach(function(c){
      c.addEventListener('click',function(){
        openEditor(parseInt(c.getAttribute('data-id'),10));
      });
    });
  }

  // 2026-07-14: litarammi eftir tegund slökkvitækis svo það sé fljótlegt að finna
  // tegundir. Duft/ABC = blátt · CO2 = rautt · Léttvatn = himinblátt · Froða/ABF
  // = blágrænt. Frumorðið (duft/co2/léttvatn/froða) ræður fyrst, svo flokkskóðinn.
  function typeColor(p){
    var n = (((p && p.nafn) || '') + ' ' + ((p && p.flokkur) || '')).toLowerCase();
    if(/fro[ðd]/.test(n)) return '#14b8a6';        // Froða — blágrænt
    if(/l[ée]ttv/.test(n)) return '#38bdf8';       // Léttvatn — himinblátt
    if(/co[2₂]|kols[ýy]r|koltv[íi]/.test(n)) return '#dc2626';  // CO₂ — rautt (líka undirskrifað ₂ í "CO₂")
    if(/duft/.test(n)) return '#2563eb';           // Duft — blátt
    if(/\babf\b/.test(n)) return '#14b8a6';
    if(/\babc\b/.test(n)) return '#2563eb';
    if(/\bab\b/.test(n)) return '#38bdf8';
    return null;
  }
  // Deila tegundarlitnum með öðrum sýnum (Sala/POS) svo skilgreiningin drift-i ekki.
  try { window.SlokkTypeColor = typeColor; } catch(e){}

  function renderCard(p){
      var priceInc = p.verd_an_vsk * (1 + (p.vsk_prosenta||24)/100);
      var tc = typeColor(p);
      // 2026-07-15: tegundarliturinn sem litaður VINSTRI-kantur Á myndinni sjálfri
      // (hálfur rammi — ósk Agnars „a left color half frame on the side of the
      // picture"). NB full-rammi (allar hliðar) var reyndur 2026-07-26 en Agnar
      // vildi HÁLFAN ramma → bakkað í vinstri-kant.
      var frame = tc ? ';border-left:3.6px solid '+tc+';box-sizing:border-box' : '';
      var img = p.mynd ? '<img src="'+esc(p.mynd)+'" style="width:100%;height:72px;object-fit:cover;border-radius:7px;background:#f8fafc'+frame+'">' : '<div style="width:100%;height:72px;background:#f8fafc;border-radius:7px;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:22px'+frame+'">📦</div>';
      var isSvc = p.flokkur === 'Þjónusta';
      var badge = '<span style="display:inline-block;background:'+(isSvc?'#fef3c7':'#dbeafe')+';color:'+(isSvc?'#92400e':'#1e40af')+';font-size:10px;padding:2px 7px;border-radius:12px;font-weight:700;letter-spacing:0.03em">'+esc(p.flokkur||'')+'</span>';
      var stockInfo = !isSvc && p.birgdir!=null ? '<div style="font-size:11px;color:#64748b;margin-top:4px">🏷️ '+p.birgdir+' á lager</div>' : '';
      var virktPill = p.virkt ? '' : '<span style="display:inline-block;background:#fee2e2;color:#b91c1c;font-size:10px;padding:2px 7px;border-radius:12px;font-weight:700;margin-left:4px">ÓVIRKT</span>';
      var adraPill = p.sja_adrar_vorur === true ? '<span style="display:inline-block;background:#e2e8f0;color:#334155;font-size:10px;padding:2px 7px;border-radius:12px;font-weight:700;margin-left:4px">aðrar vörur</span>' : '';
      // \u2b50 beint \u00e1 kortinu: setur v\u00f6runa \u00e1 s\u00f6luforsi\u00f0una \u00e1n \u00feess a\u00f0 opna hana.
      // Fyllt stjarna = \u00e1 fors\u00ed\u00f0u, t\u00f3m = ekki. Smellurinn stoppar h\u00e9r (stopPropagation
      // \u00ed bindEvents) svo hann opni ekki ritilinn \u00ed lei\u00f0inni.
      var star = '<button class="vorur-star" data-id="'+p.id+'" type="button" title="'+(p.forsida===true?'\u00c1 fors\u00ed\u00f0u S\u00f6lubor\u00f0s \u2014 smelltu til a\u00f0 taka af':'Setja \u00e1 fors\u00ed\u00f0u S\u00f6lubor\u00f0s')+'" '+
        'style="position:absolute;top:6px;right:6px;z-index:2;width:26px;height:26px;line-height:24px;text-align:center;'+
        'border-radius:99px;border:1px solid '+(p.forsida===true?'#fbbf24':'#e2e8f0')+';background:'+(p.forsida===true?'#fffbeb':'#fff')+';'+
        'cursor:pointer;font-size:13px;padding:0;box-shadow:0 1px 2px rgba(0,0,0,.06)">'+(p.forsida===true?'\u2b50':'\u2606')+'</button>';
      return '<div class="vorur-card" data-id="'+p.id+'" style="position:relative;background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:9px;cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor=\'#cbd5e1\';this.style.boxShadow=\'0 4px 12px rgba(0,0,0,0.05)\'" onmouseout="this.style.borderColor=\'#e2e8f0\';this.style.boxShadow=\'\'">' +
        star + img +
        '<div style="margin-top:7px">' +
          '<div>'+badge+virktPill+adraPill+'</div>' +
          '<div style="font-weight:700;color:#0f172a;font-size:12.5px;margin-top:5px;line-height:1.25">'+esc(p.nafn)+'</div>' +
          (p.lysing ? '<div style="color:#64748b;font-size:11px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical">'+esc(p.lysing)+'</div>' : '') +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">' +
            '<div><div style="font-weight:700;color:#0f172a;font-size:13.5px">'+fmtKr(priceInc)+'</div><div style="color:#64748b;font-size:10px">'+fmtKr(p.verd_an_vsk)+' án vsk</div></div>' +
            stockInfo +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function bindEvents(){
    Array.from(document.querySelectorAll('.vorur-tab')).forEach(function(b){
      b.addEventListener('click',function(){
        _activeTab = b.getAttribute('data-tab');
        renderView();
      });
    });
    Array.from(document.querySelectorAll('.vorur-cat')).forEach(function(b){
      b.addEventListener('click',function(){
        var c = b.getAttribute('data-cat') || '';
        _activeCat = (_activeCat === c) ? '' : c; // smellur á virkan chip = af-sía
        renderView();
      });
    });
    Array.from(document.querySelectorAll('.vorur-star')).forEach(function(b){
      b.addEventListener('click', async function(e){
        e.preventDefault(); e.stopPropagation();   // ekki opna ritilinn
        var id = +b.getAttribute('data-id');
        var p = (_products || []).find(function(x){ return +x.id === id; });
        if(!p) return;
        var next = !(p.forsida === true);
        b.disabled = true;
        try {
          var r = await DB.sb.from('vorur').update({ forsida: next }).eq('id', id).select().single();
          if(r.error) throw r.error;
          p.forsida = next;
          renderView();
        } catch(err){
          b.disabled = false;
          alert('Tókst ekki að vista: ' + ((err && err.message) || err));
        }
      });
    });
    var nb = document.getElementById('vorur-new');
    if(nb) nb.addEventListener('click',function(){openEditor(null);});
    var search = document.getElementById('vorur-search');
    if(search){
      search.addEventListener('input',function(e){
        _searchTerm = e.target.value || '';
        // Re-render only the grid — keep input focus + cursor position.
        renderGrid();
      });
    }
  }

  function openEditor(id){
    var product = id ? _products.find(function(p){return p.id===id;}) : null;
    var isNew = !product;
    var isSvc = _activeTab === 'thjonusta';
    if(product) isSvc = product.flokkur === 'Þjónusta';
    // Allir flokkar sem ERU til í gögnunum (líka „Skilti, ljós og miðar" o.fl.
    // sem gamli fasti listinn sýndi ekki), + grunn-listinn, + flokkur vörunnar.
    var base = ['Slökkvitæki','Viðvörunarkerfi','Eldvarnir','Fylgihlutir','Þjónusta'];
    var seenF = {};
    var flokkar = [];
    _products.forEach(function(x){ var f=(x.flokkur||'').trim(); if(f && !seenF[f]){seenF[f]=1; flokkar.push(f);} });
    base.forEach(function(f){ if(!seenF[f]){seenF[f]=1; flokkar.push(f);} });
    if(product && product.flokkur && !seenF[product.flokkur]){ seenF[product.flokkur]=1; flokkar.push(product.flokkur); }
    sortCats(flokkar);
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
            '<option value="__nyr">➕ Nýr flokkur…</option>' +
          '</select>' +
          '<input id="f-flokkur-nyr" type="text" placeholder="Nafn á nýjum flokki" style="display:none;width:100%;margin-top:8px;padding:10px;border:1px solid #1a7f4b;border-radius:6px;font-size:14px;box-sizing:border-box">' +
        '</div>' +
        '<div>' +
          '<label style="display:block;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600">VSK %</label>' +
          '<input id="f-vsk" type="number" value="'+(p.vsk_prosenta||24)+'" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box">' +
        '</div>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
        '<div>' +
          '<label style="display:block;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600">Verð m/VSK <span style="color:#94a3b8;font-weight:400">· útsöluverð</span></label>' +
          '<input id="f-verd-inc" type="number" value="'+Math.round((p.verd_an_vsk||0) * (1 + (p.vsk_prosenta||24)/100))+'" style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box">' +
          '<div id="f-verd-ex" style="font-size:11px;color:#64748b;margin-top:4px">'+fmtKr(p.verd_an_vsk||0)+' án vsk</div>' +
        '</div>' +
        '<div>' +
          '<label style="display:block;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600">Birgðir '+(isSvc?'(á ekki við fyrir þjónustu)':'')+'</label>' +
          '<input id="f-birgdir" type="number" value="'+(p.birgdir||0)+'" '+(isSvc?'disabled':'')+' style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box;'+(isSvc?'background:#f8fafc;color:#cbd5e1':'')+'">' +
        '</div>' +
      '</div>' +
      '<label style="display:flex;align-items:center;gap:8px;margin-bottom:10px;cursor:pointer">' +
        '<input id="f-virkt" type="checkbox" '+(p.virkt!==false?'checked':'')+' style="width:18px;height:18px">' +
        '<span style="font-size:14px;color:#334155">Virkt — sýna í Sala tab</span>' +
      '</label>' +
      // Forsíðu-val + röðun (Agnar 26.08): sé EITTHVAÐ merkt á forsíðu sýna
      // flísarnar á Sölusíðunni AÐEINS merktu vörurnar; röðunarnúmerið raðar
      // (1 = fremst, tómt/hátt = aftast). Ekkert merkt = allt sýnist áfram.
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">' +
        '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;flex:1;min-width:220px">' +
          '<input id="f-forsida" type="checkbox" '+(p.forsida===true?'checked':'')+' style="width:18px;height:18px">' +
          '<span style="font-size:14px;color:#334155">⭐ Sýna á forsíðu Söluborðs (flísunum)</span>' +
        '</label>' +
        '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#64748b">Röðun' +
          '<input id="f-rodun" type="number" min="1" value="'+(p.rodun==null?'':p.rodun)+'" placeholder="t.d. 1" title="1 = fremst á Sölusíðunni; tómt eða há tala = aftast" style="width:90px;padding:8px;border:1px solid #cbd5e1;border-radius:6px;font-size:14px;box-sizing:border-box">' +
        '</label>' +
      '</div>' +
      // Sala: hak = falið af aðalflísunum, sýnt undir „Sjá aðrar vörur".
      // Óhakað (og virkt) = áfram á Söluborðinu (stjörnusían ræður forsíðu-flísunum).
      '<label style="display:flex;align-items:center;gap:8px;margin-bottom:20px;cursor:pointer">' +
        '<input id="f-sja-adrar" type="checkbox" '+(p.sja_adrar_vorur===true?'checked':'')+' style="width:18px;height:18px">' +
        '<span style="font-size:14px;color:#334155">Sýna undir aðrar vörur</span>' +
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
    // The user types verð m/vsk (sale price). The verð án vsk shown below is
    // computed dynamically from the current VSK %. On save we divide back out
    // to store verd_an_vsk in the DB (which is the canonical column).
    function recomputeExVat() {
      var inc = parseFloat(document.getElementById('f-verd-inc').value) || 0;
      var vskPct = parseFloat(document.getElementById('f-vsk').value) || 24;
      var ex = inc / (1 + vskPct/100);
      document.getElementById('f-verd-ex').textContent = fmtKr(ex) + ' án vsk';
    }
    document.getElementById('f-verd-inc').addEventListener('input', recomputeExVat);
    document.getElementById('f-vsk').addEventListener('input', recomputeExVat);

    // 2026-09-02: hökin tvö eru SJÁLFSTÆÐ og má haka við bæði — Agnar:
    // „væri fínt ef þær geta verið hakaðar við á báðum stöðum". `forsida`
    // stýrir aðalrúðunni á Söluborðinu, `sja_adrar_vorur` listann að neðan.
    // Þær voru um tíma látnar útiloka hvor aðra — það var mislestur á vandanum:
    // böggurinn var ekki að bæði væru hökuð heldur að `pos.js` síði á hinum
    // fánanum á undan forsíðunni og faldi því allar 18 forsíðu-vörurnar.

    // Auto-toggle birgdir when flokkur switches to/from Þjónusta,
    // + sýna nýr-flokkur reitinn þegar „➕ Nýr flokkur…" er valið.
    document.getElementById('f-flokkur').addEventListener('change',function(e){
      var nyrInp = document.getElementById('f-flokkur-nyr');
      if(e.target.value === '__nyr'){
        nyrInp.style.display = 'block';
        nyrInp.focus();
      } else {
        nyrInp.style.display = 'none';
      }
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
      // User entered verð m/vsk; convert back to verd_an_vsk for the DB.
      var inc = parseFloat(document.getElementById('f-verd-inc').value) || 0;
      var vskPct = parseInt(document.getElementById('f-vsk').value,10) || 24;
      var verdAnVsk = inc / (1 + vskPct/100);
      var flokkurVal = document.getElementById('f-flokkur').value;
      if(flokkurVal === '__nyr'){
        flokkurVal = (document.getElementById('f-flokkur-nyr').value || '').trim();
        if(!flokkurVal){alert('Skrifaðu nafn á nýja flokkinn');return;}
      }
      var data = {
        nafn: document.getElementById('f-nafn').value.trim(),
        lysing: document.getElementById('f-lysing').value.trim(),
        verd_an_vsk: Math.round(verdAnVsk * 100) / 100,
        vsk_prosenta: vskPct,
        birgdir: parseInt(document.getElementById('f-birgdir').value,10) || 0,
        flokkur: flokkurVal,
        mynd: imgDataUrl || '',
        virkt: document.getElementById('f-virkt').checked,
        forsida: document.getElementById('f-forsida').checked,
        sja_adrar_vorur: !!(document.getElementById('f-sja-adrar') && document.getElementById('f-sja-adrar').checked),
        rodun: (function(){ var v = parseInt(document.getElementById('f-rodun').value, 10); return isNaN(v) ? null : v; })()
      };
      if(!data.nafn){alert('Nafn er skilyrði');return;}
      var btn = document.getElementById('vorur-save');
      btn.disabled = true; btn.textContent = 'Vista...';
      try {
        if(isNew){
          // 03.09.2026: gagnagrunns-vörður fellir innsetningu á nafni sem er á
          // sala.deleted_product_names (sjá vorur_hafna_eyddum). Skrái maður
          // vöruna HANDVIRKT vill maður hana augljóslega aftur — takum nafnið
          // því af listanum ÁÐUR en við setjum inn, annars félli röðin hljóðlega
          // og .single() skilaði villu sem enginn skildi.
          try {
            if(window.AppSettings && typeof window.AppSettings.save==='function'){
              var eydd = (window.AppSettings.path('sala.deleted_product_names')||[]);
              var nyttNafn = String(data.nafn||'').trim().toLowerCase();
              var eftir = eydd.filter(function(n){ return String(n||'').trim().toLowerCase() !== nyttNafn; });
              if(eftir.length !== eydd.length) await window.AppSettings.save({sala:{deleted_product_names: eftir}});
            }
          } catch(_){ /* best-effort — vörðurinn segir samt frá í vorur_hafnad_log */ }
          var ir = await DB.sb.from('vorur').insert(data).select().single();
          if(ir.error) throw ir.error;
        } else {
          var ur = await DB.sb.from('vorur').update(data).eq('id',product.id).select().single();
          if(ur.error) throw ur.error;
        }
        try { if (window.POS && typeof window.POS.invalidateVorur === 'function') window.POS.invalidateVorur(); } catch(_){}
        await refresh();
        m.remove();
      } catch(e){ alert('Villa: '+(e.message||e)); btn.disabled=false; btn.textContent='Vista'; }
    });
    // Delete
    var delBtn = document.getElementById('vorur-del');
    if(delBtn) delBtn.addEventListener('click',async function(){
      if(!await Confirm.show('Viltu virkilega eyða "'+p.nafn+'"?')) return;
      delBtn.disabled = true; delBtn.textContent = 'Eyði...';
      try {
        var dr = await DB.sb.from('vorur').delete().eq('id',product.id);
        if(dr.error) throw dr.error;
        // Tombstone the name so seed-patches (66 pricelist-seed, 80 aux-products)
        // don't re-insert it on next page load.
        try{
          if(window.AppSettings && typeof window.AppSettings.save==='function'){
            var existing = (window.AppSettings.path('sala.deleted_product_names')||[]).slice();
            var name = String(p.nafn||'').trim();
            if(name && existing.indexOf(name)<0){
              existing.push(name);
              await window.AppSettings.save({sala:{deleted_product_names: existing}});
            }
          }
        } catch(_){ /* tombstone is best-effort */ }
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