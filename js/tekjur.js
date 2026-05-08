// Tekjur v2 — Sales history dashboard with monthly charts, detail view, CSV/Excel export
(function(){
  'use strict';
  console.log('[Tekjur v2] Script loaded');
  var _sales = [];
  var _view = 'overview'; // 'overview' | 'detail'
  var _selectedSale = null;

  function fmtKr(n){var s=Math.round(n).toString();var p=[];while(s.length>3){p.unshift(s.slice(-3));s=s.slice(0,-3);}p.unshift(s);return p.join('.')+' kr';}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}

  async function loadSales(){
    var r = await DB.sb.from('solur').select('*').order('created_at',{ascending:false});
    _sales = r.data || [];
  }

  function getMonthlyData(){
    var months = {};
    _sales.forEach(function(s){
      var d = new Date(s.created_at);
      var key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
      if(!months[key]) months[key] = {key:key, year:d.getFullYear(), month:d.getMonth(), count:0, total:0, vsk:0, exVat:0, sales:[]};
      months[key].count++;
      months[key].total += s.samtals || 0;
      months[key].vsk += s.vsk_upphaed || 0;
      months[key].exVat += s.upphaed_an_vsk || 0;
      months[key].sales.push(s);
    });
    return Object.values(months).sort(function(a,b){return a.key > b.key ? -1 : 1;});
  }

  function getProductBreakdown(){
    var items = {};
    _sales.forEach(function(s){
      var linur = s.linur;
      if(!Array.isArray(linur)) return;
      linur.forEach(function(l){
        var k = l.desc || 'Óþekkt';
        if(!items[k]) items[k] = {desc:k, qty:0, total:0, type:l.type||'product'};
        items[k].qty += l.qty || 1;
        items[k].total += (l.qty||1) * (l.unit_price_ex_vat||0) * (1 + (l.vsk_pct||24)/100);
      });
    });
    return Object.values(items).sort(function(a,b){return b.total - a.total;});
  }

  function renderOverview(){
    var v = document.getElementById('view-income');
    if(!v) return;
    var monthly = getMonthlyData();
    var breakdown = getProductBreakdown();
    var totalRev = _sales.reduce(function(s,x){return s+(x.samtals||0);},0);
    var totalVsk = _sales.reduce(function(s,x){return s+(x.vsk_upphaed||0);},0);
    var totalEx = _sales.reduce(function(s,x){return s+(x.upphaed_an_vsk||0);},0);
    var moNames = ['jan','feb','mar','apr','maí','jún','júl','ágú','sep','okt','nóv','des'];

    // Build bar chart SVG
    var maxVal = Math.max.apply(null, monthly.map(function(m){return m.total;}));
    if(maxVal <= 0) maxVal = 1;
    var chartBars = monthly.slice(0,12).reverse().map(function(m,i){
      var h = Math.max(4, (m.total / maxVal) * 180);
      var x = 40 + i * 52;
      return '<rect x="'+x+'" y="'+(220-h)+'" width="36" height="'+h+'" rx="4" fill="#dc2626" opacity="0.85"/>' +
        '<text x="'+(x+18)+'" y="240" fill="#94a3b8" font-size="10" text-anchor="middle">'+moNames[m.month]+'</text>' +
        '<text x="'+(x+18)+'" y="'+(215-h)+'" fill="#64748b" font-size="9" text-anchor="middle">'+Math.round(m.total/1000)+'þ</text>';
    }).join('');
    var chartWidth = Math.max(300, 40 + monthly.slice(0,12).length * 52 + 20);
    var chartSvg = '<svg viewBox="0 0 '+chartWidth+' 260" style="width:100%;max-height:280px"><rect width="'+chartWidth+'" height="260" fill="none"/><line x1="40" y1="220" x2="'+(chartWidth-20)+'" y2="220" stroke="#e2e8f0" stroke-width="1"/>'+chartBars+'</svg>';

    v.innerHTML = '<div style="padding:20px;max-width:1200px;margin:0 auto">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">' +
        '<h1 style="margin:0;font-size:22px;color:#0f172a">Tekjur og sölur</h1>' +
        '<div style="display:flex;gap:8px">' +
          '<button id="tekjur-csv" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px">📥 CSV</button>' +
          '<button id="tekjur-xlsx" style="background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;padding:8px 14px;border-radius:8px;font-weight:600;cursor:pointer;font-size:13px">📊 Excel</button>' +
        '</div>' +
      '</div>' +
      // Summary cards
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px;margin-bottom:20px">' +
        summaryCard('Heildartekjur', fmtKr(totalRev), '#dc2626') +
        summaryCard('Án VSK', fmtKr(totalEx), '#0d6efd') +
        summaryCard('VSK samtals', fmtKr(totalVsk), '#b45309') +
        summaryCard('Fjöldi sölur', _sales.length+'', '#1a7f4b') +
      '</div>' +
      // Chart
      '<div style="background:#fff;border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9">' +
        '<div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:12px">Mánaðar tekjur</div>' +
        (monthly.length ? chartSvg : '<div style="color:#94a3b8;text-align:center;padding:40px">Engar sölur skráðar</div>') +
      '</div>' +
      // Product breakdown
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">' +
        '<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9">' +
          '<div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:12px">Mest seldar vörur/þjónusta</div>' +
          (breakdown.length ? breakdown.slice(0,8).map(function(b){
            var pct = totalRev > 0 ? Math.round(b.total / totalRev * 100) : 0;
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9">' +
              '<div><div style="font-weight:600;font-size:13px;color:#0f172a">'+(b.type==='service'?'🔧':'🛒')+' '+esc(b.desc)+'</div><div style="font-size:11px;color:#94a3b8">'+b.qty+' stk · '+pct+'%</div></div>' +
              '<div style="font-weight:700;font-size:13px;color:#0f172a">'+fmtKr(b.total)+'</div>' +
            '</div>';
          }).join('') : '<div style="color:#94a3b8;text-align:center;padding:20px">Engin gögn</div>') +
        '</div>' +
        // Monthly breakdown table
        '<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9">' +
          '<div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:12px">Eftir mánuðum</div>' +
          (monthly.length ? monthly.map(function(m){
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f1f5f9">' +
              '<div><div style="font-weight:600;font-size:13px;color:#0f172a">'+moNames[m.month]+' '+m.year+'</div><div style="font-size:11px;color:#94a3b8">'+m.count+' sölur</div></div>' +
              '<div style="font-weight:700;font-size:13px;color:#0f172a">'+fmtKr(m.total)+'</div>' +
            '</div>';
          }).join('') : '<div style="color:#94a3b8;text-align:center;padding:20px">Engin gögn</div>') +
        '</div>' +
      '</div>' +
      // Sales list
      '<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9">' +
        '<div style="font-size:14px;font-weight:700;color:#0f172a;margin-bottom:12px">Allar sölur</div>' +
        (_sales.length ? _sales.map(function(s){
          var d = new Date(s.created_at);
          var dStr = d.toLocaleDateString('is-IS',{day:'numeric',month:'short',year:'numeric'});
          var tStr = d.toLocaleTimeString('is-IS',{hour:'2-digit',minute:'2-digit',hour12:false});
          var lineCount = Array.isArray(s.linur) ? s.linur.length : 0;
          return '<div class="tekjur-sale" data-id="'+s.id+'" style="display:flex;justify-content:space-between;align-items:center;padding:12px 8px;border-bottom:1px solid #f1f5f9;cursor:pointer;border-radius:6px;transition:background .15s" onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'\'">' +
            '<div style="display:flex;align-items:center;gap:12px">' +
              '<div style="width:36px;height:36px;background:#fef2f2;color:#dc2626;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700">'+lineCount+'</div>' +
              '<div>' +
                '<div style="font-weight:600;font-size:14px;color:#0f172a">'+esc(s.num||'')+'</div>' +
                '<div style="font-size:12px;color:#64748b">'+esc(s.customer_nafn||'Óþekktur')+' · '+dStr+' '+tStr+'</div>' +
              '</div>' +
            '</div>' +
            '<div style="text-align:right">' +
              '<div style="font-weight:700;font-size:15px;color:#0f172a">'+fmtKr(s.samtals||0)+'</div>' +
              '<div style="font-size:11px;color:#94a3b8">'+(s.greitt_med||'Kort')+'</div>' +
            '</div>' +
          '</div>';
        }).join('') : '<div style="color:#94a3b8;text-align:center;padding:40px">Engar sölur skráðar</div>') +
      '</div>' +
    '</div>';
    bindOverviewEvents();
  }

  function summaryCard(label, value, color){
    return '<div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #f1f5f9;border-left:4px solid '+color+'">' +
      '<div style="font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">'+label+'</div>' +
      '<div style="font-size:22px;font-weight:800;color:#0f172a;margin-top:4px">'+value+'</div>' +
    '</div>';
  }

  function bindOverviewEvents(){
    // Sale click → show detail
    Array.from(document.querySelectorAll('.tekjur-sale')).forEach(function(el){
      el.addEventListener('click', function(){
        var id = parseInt(el.getAttribute('data-id'),10);
        var sale = _sales.find(function(s){return s.id===id;});
        if(sale) showSaleDetail(sale);
      });
    });
    // CSV export
    var csvBtn = document.getElementById('tekjur-csv');
    if(csvBtn) csvBtn.addEventListener('click', exportCSV);
    // Excel export
    var xlsBtn = document.getElementById('tekjur-xlsx');
    if(xlsBtn) xlsBtn.addEventListener('click', exportExcel);
  }

  function showSaleDetail(sale){
    var d = new Date(sale.created_at);
    var dStr = d.toLocaleDateString('is-IS',{day:'numeric',month:'short',year:'numeric'});
    var tStr = d.toLocaleTimeString('is-IS',{hour:'2-digit',minute:'2-digit',hour12:false});
    var linur = Array.isArray(sale.linur) ? sale.linur : [];
    var linesHtml = linur.map(function(l){
      var lt = (l.qty||1) * (l.unit_price_ex_vat||0) * (1 + (l.vsk_pct||24)/100);
      return '<tr><td style="padding:6px 0;font-size:13px">'+(l.type==='service'?'🔧':'🛒')+' '+esc(l.desc)+(l.ref?' <span style="color:#94a3b8;font-size:11px">'+esc(l.ref)+'</span>':'')+'</td><td style="text-align:center;font-size:13px">'+(l.qty||1)+'</td><td style="text-align:right;font-size:13px">'+fmtKr(l.unit_price_ex_vat||0)+'</td><td style="text-align:right;font-size:13px;font-weight:600">'+fmtKr(lt)+'</td></tr>';
    }).join('');
    var modalId = 'tekjur-detail-modal';
    var old = document.getElementById(modalId); if(old) old.remove();
    var m = document.createElement('div');
    m.id = modalId;
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px';
    m.innerHTML = '<div style="background:#fff;border-radius:12px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
        '<h2 style="margin:0;font-size:20px;color:#0f172a">Sala '+esc(sale.num||'')+'</h2>' +
        '<button class="tekjur-close" style="background:none;border:none;font-size:24px;color:#64748b;cursor:pointer">×</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">' +
        '<div style="font-size:13px"><span style="color:#64748b">Dags:</span> '+dStr+' '+tStr+'</div>' +
        '<div style="font-size:13px"><span style="color:#64748b">Greiðsla:</span> '+(sale.greitt_med||'Kort')+'</div>' +
        '<div style="font-size:13px"><span style="color:#64748b">Viðskiptavinur:</span> '+esc(sale.customer_nafn||'Óþekktur')+'</div>' +
        '<div style="font-size:13px"><span style="color:#64748b">Starfsmaður:</span> '+(sale.starfsmadur||'Kassi')+'</div>' +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;margin-bottom:16px"><thead><tr style="border-bottom:2px solid #e2e8f0"><th style="text-align:left;padding:8px 0;font-size:12px;color:#64748b">Lýsing</th><th style="text-align:center;font-size:12px;color:#64748b">Magn</th><th style="text-align:right;font-size:12px;color:#64748b">Einingaverð</th><th style="text-align:right;font-size:12px;color:#64748b">Samtals</th></tr></thead><tbody>'+linesHtml+'</tbody></table>' +
      '<div style="border-top:2px solid #e2e8f0;padding-top:12px">' +
        '<div style="display:flex;justify-content:space-between;padding:3px 0;color:#64748b;font-size:13px"><span>Án VSK:</span><span>'+fmtKr(sale.upphaed_an_vsk||0)+'</span></div>' +
        '<div style="display:flex;justify-content:space-between;padding:3px 0;color:#64748b;font-size:13px"><span>VSK:</span><span>'+fmtKr(sale.vsk_upphaed||0)+'</span></div>' +
        (sale.afslattur ? '<div style="display:flex;justify-content:space-between;padding:3px 0;color:#b45309;font-size:13px"><span>Afsláttur:</span><span>-'+fmtKr(sale.afslattur)+'</span></div>' : '') +
        '<div style="display:flex;justify-content:space-between;padding:6px 0;font-weight:700;font-size:18px;color:#0f172a"><span>Samtals:</span><span>'+fmtKr(sale.samtals||0)+'</span></div>' +
      '</div>' +
      (sale.athugasemdir ? '<div style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:6px;font-size:13px;color:#64748b"><strong>Athugasemdir:</strong> '+esc(sale.athugasemdir)+'</div>' : '') +
      '<div style="display:flex;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid #e2e8f0">' +
        '<button class="tekjur-print" style="flex:1;padding:10px;background:#1a7f4b;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px">🖨️ Prenta kvittun</button>' +
        '<button class="tekjur-close" style="flex:1;padding:10px;background:#f1f5f9;color:#334155;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px">Loka</button>' +
      '</div>' +
    '</div>';
    document.body.appendChild(m);
    m.addEventListener('click',function(e){if(e.target===m)m.remove();});
    Array.from(m.querySelectorAll('.tekjur-close')).forEach(function(b){b.addEventListener('click',function(){m.remove();});});
    m.querySelector('.tekjur-print').addEventListener('click',function(){
      printReceiptFromSale(sale);
    });
  }

  function printReceiptFromSale(sale){
    var linur = Array.isArray(sale.linur) ? sale.linur : [];
    var t = {ex: sale.upphaed_an_vsk||0, vsk: sale.vsk_upphaed||0, total: sale.samtals||0};
    // Use the POS print function if available
    if(typeof printReceipt === 'function'){
      printReceipt(sale, sale.customer_nafn||'', linur, t);
    } else {
      // Fallback: open print window
      var w = window.open('','_blank','width=400,height=600');
      if(!w){alert('Popup lokað');return;}
      w.document.write('<html><body style="font-family:system-ui;max-width:360px;margin:0 auto;padding:16px"><h2>Kvittun '+esc(sale.num||'')+'</h2><p>'+esc(sale.customer_nafn||'')+'</p><p>Samtals: '+fmtKr(sale.samtals||0)+'</p><button onclick="window.print()">Prenta</button></body></html>');
      w.document.close();
    }
  }

  function exportCSV(){
    var header = 'Númer,Dagsetning,Viðskiptavinur,Starfsmaður,Án VSK,VSK,Samtals,Greiðslumáti,Athugasemdir\n';
    var rows = _sales.map(function(s){
      var d = new Date(s.created_at);
      return [s.num||'', d.toISOString().substring(0,10), '"'+(s.customer_nafn||'').replace(/"/g,'""')+'"', s.starfsmadur||'', s.upphaed_an_vsk||0, s.vsk_upphaed||0, s.samtals||0, s.greitt_med||'', '"'+(s.athugasemdir||'').replace(/"/g,'""')+'"'].join(',');
    }).join('\n');
    var csv = '\uFEFF'+header+rows; // BOM for UTF-8
    var blob = new Blob([csv],{type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'slokkvitaeki-solur-'+new Date().toISOString().substring(0,10)+'.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportExcel(){
    // Build simple XLSX-compatible XML spreadsheet
    var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<?mso-application progid="Excel.Sheet"?>\n<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n<Worksheet ss:Name="Sölur">\n<Table>\n';
    xml += '<Row><Cell><Data ss:Type="String">Númer</Data></Cell><Cell><Data ss:Type="String">Dagsetning</Data></Cell><Cell><Data ss:Type="String">Viðskiptavinur</Data></Cell><Cell><Data ss:Type="String">Starfsmaður</Data></Cell><Cell><Data ss:Type="String">Án VSK</Data></Cell><Cell><Data ss:Type="String">VSK</Data></Cell><Cell><Data ss:Type="String">Samtals</Data></Cell><Cell><Data ss:Type="String">Greiðslumáti</Data></Cell></Row>\n';
    _sales.forEach(function(s){
      var d = new Date(s.created_at);
      xml += '<Row><Cell><Data ss:Type="String">'+(s.num||'')+'</Data></Cell><Cell><Data ss:Type="String">'+d.toISOString().substring(0,10)+'</Data></Cell><Cell><Data ss:Type="String">'+esc(s.customer_nafn||'')+'</Data></Cell><Cell><Data ss:Type="String">'+(s.starfsmadur||'')+'</Data></Cell><Cell><Data ss:Type="Number">'+(s.upphaed_an_vsk||0)+'</Data></Cell><Cell><Data ss:Type="Number">'+(s.vsk_upphaed||0)+'</Data></Cell><Cell><Data ss:Type="Number">'+(s.samtals||0)+'</Data></Cell><Cell><Data ss:Type="String">'+(s.greitt_med||'')+'</Data></Cell></Row>\n';
    });
    xml += '</Table>\n</Worksheet>\n</Workbook>';
    var blob = new Blob([xml],{type:'application/vnd.ms-excel'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'slokkvitaeki-solur-'+new Date().toISOString().substring(0,10)+'.xls';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function watchView(){
    setInterval(function(){
      var v = document.getElementById('view-income');
      if(v && v.classList.contains('active') && !v.querySelector('.tekjur-sale') && !v.querySelector('[style*="Tekjur"]')){
        loadSales().then(renderOverview);
      }
    }, 500);
  }

  function init(){
    // Override the Tekjur nav to render our view
    var tekjurBtn = document.querySelector('[data-view="income"]');
    if(tekjurBtn){
      tekjurBtn.addEventListener('click', function(){
        setTimeout(function(){ loadSales().then(renderOverview); }, 100);
      });
    }
    watchView();
    console.log('[Tekjur v2] Ready');
  }

  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();