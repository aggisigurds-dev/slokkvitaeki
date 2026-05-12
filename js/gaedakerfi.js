/* Gæðakerfi (Quality System) — IÐAN compliance v2
   Adds: audit log, verkbókhald, úrelt tæki, upgraded service ticket with signature */
(function(){
  'use strict';

  var GK_AUDIT_MARKER = '_gk_audit';
  var _currentTech = localStorage.getItem('_gk_tech') || 'Kerfisnotandi';

  window.GK = {
    tech: function(name){ if(name){ _currentTech=name; localStorage.setItem('_gk_tech',name); } return _currentTech; },
    log: function(action, table, recordId, before, after, description){
      var entry = { a:action, t:table, r:recordId, b:before||null, af:after||null, d:description||'', u:_currentTech, ts:new Date().toISOString() };
      // Bypass wrap by calling origFrom directly if available
      var sb = window._gk_origFrom ? { from: window._gk_origFrom } : DB.sb;
      return sb.from('skodunar_saga').insert({
        unit_id: null, date: entry.ts.slice(0,10), tech: _currentTech,
        result: GK_AUDIT_MARKER, notes: JSON.stringify(entry)
      }).then(function(res){ if(res&&res.error) console.warn('[GK] log err:', res.error.message); return res; });
    },
    fetchLog: function(limit){
      return DB.sb.from('skodunar_saga').select('id,created_at,notes').eq('result', GK_AUDIT_MARKER).order('created_at',{ascending:false}).limit(limit||500);
    }
  };

  function wrapDB() {
    if (!DB || !DB.sb) return false;
    if (DB.sb._gkWrapped) return true;
    var origFrom = DB.sb.from.bind(DB.sb);
    window._gk_origFrom = origFrom;
    DB.sb.from = function(tbl){
      var builder = origFrom(tbl);
      // Skip audit-log writes to prevent infinite loop
      ['update','insert','delete'].forEach(function(op){
        var orig = builder[op];
        if (!orig) return;
        builder[op] = function(payload){
          var result = orig.apply(builder, arguments);
          // Don't log writes to skodunar_saga with _gk_audit marker
          var isAuditWrite = tbl === 'skodunar_saga' && payload && payload.result === GK_AUDIT_MARKER;
          if (!isAuditWrite) {
            var desc = '';
            if (op==='insert') desc = 'Skráð nýtt í ' + tbl;
            if (op==='update') desc = 'Uppfærði ' + tbl + ': ' + (payload ? Object.keys(payload).join(', ') : '');
            if (op==='delete') desc = 'Eyddi úr ' + tbl;
            try { GK.log(op, tbl, null, null, payload||null, desc); } catch(e) { console.warn('[GK] log fail', e); }
          }
          return result;
        };
      });
      return builder;
    };
    DB.sb._gkWrapped = true;
    console.log('[GK] DB writes are now audited');
    return true;
  }

  function injectNav(){
    if (document.getElementById('_gk_nav')) return;
    var nav = document.querySelector('.view-nav');
    if (!nav) return;
    var stillingar = Array.prototype.find.call(nav.querySelectorAll('.vnav-btn'), function(b){
      return /Stillingar|Settings/.test(b.textContent);
    });
    var btn = document.createElement('a');
    btn.id = '_gk_nav';
    btn.className = 'vnav-btn';
    btn.href = '#';
    btn.innerHTML = '<span style="width:18px;display:inline-block;margin-right:6px;">📋</span>Gæðakerfi';
    btn.onclick = function(e){ e.preventDefault(); openGKView(); };
    if (stillingar && stillingar.nextSibling) {
      stillingar.parentNode.insertBefore(btn, stillingar.nextSibling);
    } else {
      nav.appendChild(btn);
    }
  }

  function openGKView(){
    var existing = document.getElementById('_gk_modal');
    if (existing) existing.remove();
    var modal = document.createElement('div');
    modal.id = '_gk_modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9500;display:flex;align-items:flex-start;justify-content:center;padding:24px;overflow-y:auto;';
    var box = document.createElement('div');
    box.style.cssText = 'background:#fff;border-radius:14px;width:100%;max-width:1100px;padding:20px 24px;box-shadow:0 12px 40px rgba(0,0,0,.3);';
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:2px solid #1a1f2e;margin-bottom:16px;">
        <div><h2 style="margin:0;font-size:20px;color:#111;">📋 Gæðakerfi</h2>
          <p style="margin:3px 0 0;font-size:12px;color:#666;">Verkbókhald · Aðgerðaskrá · Úrelt tæki — samkvæmt kröfum IÐAN</p></div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-size:11px;color:#888;">Notandi:</span>
          <input id="_gk_tech_input" value="${_currentTech}" style="border:1.5px solid #e5e7eb;border-radius:8px;padding:6px 10px;font-size:12px;width:140px;">
          <button id="_gk_print" style="background:#2563eb;color:#fff;border:none;border-radius:9px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;">🖨️ Prenta</button>
          <button id="_gk_close" style="background:#f3f4f6;color:#111;border:none;border-radius:9px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;">✕ Loka</button>
        </div>
      </div>
      <div id="_gk_tabs" style="display:flex;gap:6px;margin-bottom:14px;border-bottom:1px solid #e5e7eb;">
        <button class="_gk_tab _gk_tab_active" data-tab="verkbokhald">Verkbókhald</button>
        <button class="_gk_tab" data-tab="log">Aðgerðaskrá</button>
        <button class="_gk_tab" data-tab="urelt">Úrelt tæki</button>
      </div>
      <div id="_gk_content" style="min-height:400px;"></div>`;
    modal.appendChild(box);
    document.body.appendChild(modal);
    var st = document.createElement('style');
    st.textContent = '._gk_tab{background:transparent;border:none;padding:10px 18px;font-size:13px;font-weight:600;color:#888;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-1px;}._gk_tab_active{color:#1a1f2e;border-bottom-color:#2563eb;}._gk_tab:hover{color:#1a1f2e;}';
    box.appendChild(st);
    document.getElementById('_gk_close').onclick = function(){ modal.remove(); };
    document.getElementById('_gk_tech_input').onchange = function(){ GK.tech(this.value); };
    document.getElementById('_gk_print').onclick = function(){ printGKContent(); };
    Array.prototype.forEach.call(box.querySelectorAll('._gk_tab'), function(t){
      t.onclick = function(){
        Array.prototype.forEach.call(box.querySelectorAll('._gk_tab'), function(x){ x.classList.remove('_gk_tab_active'); });
        t.classList.add('_gk_tab_active');
        renderTab(t.getAttribute('data-tab'));
      };
    });
    renderTab('verkbokhald');
  }

  function renderTab(name){
    var c = document.getElementById('_gk_content');
    if (!c) return;
    c.innerHTML = '<p style="color:#aaa;text-align:center;padding:40px;">Hleður...</p>';
    if (name === 'verkbokhald') renderVerkbokhald(c);
    else if (name === 'log') renderLog(c);
    else if (name === 'urelt') renderUrelt(c);
  }

  function renderVerkbokhald(container){
    DB.sb.from('skodunar_saga').select('id,unit_id,date,tech,result,pressure,weight,notes,created_at').neq('result', GK_AUDIT_MARKER).order('date',{ascending:false}).limit(500).then(function(r){
      var rows = r.data || [];
      var units = DB.cache.units || [];
      var unitMap = {};
      units.forEach(function(u){ unitMap[u.id] = u; });
      container.innerHTML = `
        <div style="display:flex;gap:10px;margin-bottom:14px;align-items:center;">
          <input id="_gk_vb_search" placeholder="Leita eftir raðnúmeri, viðskiptavini, tæknimanni..." style="flex:1;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;">
          <input id="_gk_vb_from" type="date" style="padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;">
          <span style="color:#888;font-size:12px;">til</span>
          <input id="_gk_vb_to" type="date" style="padding:8px 10px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;">
          <button id="_gk_vb_csv" style="background:#059669;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;">⬇ CSV</button>
          <span style="font-size:12px;color:#666;">${rows.length} skoðanir</span>
        </div>
        <div id="_gk_vb_body" style="max-height:55vh;overflow-y:auto;border:1px solid #e5e7eb;border-radius:10px;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead style="background:#f9fafb;position:sticky;top:0;">
              <tr>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Dagsetning</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Viðskiptavinur</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Raðnúmer</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Tegund</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Framleiðandi</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Tæknimaður</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Hvað var gert</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Næsta skoðun</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Staðfest</th>
              </tr>
            </thead>
            <tbody id="_gk_vb_tbody"></tbody>
          </table>
        </div>`;
      function parseNotes(n){ try { return JSON.parse(n); } catch(e){ return { hvad_var_gert: n||'' }; } }
      function render(filter){
        var tbody = document.getElementById('_gk_vb_tbody');
        var fromD = document.getElementById('_gk_vb_from').value;
        var toD = document.getElementById('_gk_vb_to').value;
        var q = (filter||'').toLowerCase();
        var filtered = rows.filter(function(row){
          if (fromD && row.date < fromD) return false;
          if (toD && row.date > toD) return false;
          if (!q) return true;
          var u = unitMap[row.unit_id];
          var hay = [row.date, row.tech||'', row.result||'', u?u.serial:'', u?u.client:'', u?u.type:''].join(' ').toLowerCase();
          return hay.indexOf(q) >= 0;
        });
        tbody.innerHTML = filtered.map(function(row){
          var u = unitMap[row.unit_id] || {};
          var n = parseNotes(row.notes);
          var conf = n.stadfest ? '<span style="color:#059669;font-weight:600;">✓ '+(n.stadfest_tech||row.tech||'')+'</span>' : '<span style="color:#aaa;">—</span>';
          return `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:9px 10px;white-space:nowrap;">${row.date}</td>
            <td style="padding:9px 10px;">${u.client||'—'}</td>
            <td style="padding:9px 10px;"><span style="font-family:monospace;background:#f3f4f6;padding:2px 7px;border-radius:4px;font-size:11px;">${u.serial||'—'}</span></td>
            <td style="padding:9px 10px;">${u.type||'—'} ${u.size||''}</td>
            <td style="padding:9px 10px;">${n.framleidandi||'—'}</td>
            <td style="padding:9px 10px;">${row.tech||'—'}</td>
            <td style="padding:9px 10px;max-width:240px;">${n.hvad_var_gert||row.notes||'—'}</td>
            <td style="padding:9px 10px;white-space:nowrap;">${u.next_insp||'—'}</td>
            <td style="padding:9px 10px;">${conf}</td>
          </tr>`;
        }).join('') || '<tr><td colspan="9" style="text-align:center;padding:40px;color:#aaa;">Engar skoðanir samsvara</td></tr>';
      }
      document.getElementById('_gk_vb_search').oninput = function(){ render(this.value); };
      document.getElementById('_gk_vb_from').onchange = function(){ render(document.getElementById('_gk_vb_search').value); };
      document.getElementById('_gk_vb_to').onchange = function(){ render(document.getElementById('_gk_vb_search').value); };
      document.getElementById('_gk_vb_csv').onclick = function(){
          var fromD = document.getElementById('_gk_vb_from').value;
          var toD = document.getElementById('_gk_vb_to').value;
          var q = (document.getElementById('_gk_vb_search').value||'').toLowerCase();
          var filtered = rows.filter(function(row){
            if (fromD && row.date < fromD) return false;
            if (toD && row.date > toD) return false;
            if (!q) return true;
            var u = unitMap[row.unit_id];
            var hay = [row.date, row.tech||'', row.result||'', u?u.serial:'', u?u.client:'', u?u.type:''].join(' ').toLowerCase();
            return hay.indexOf(q) >= 0;
          });
          var headers = ['Dagsetning','Viðskiptavinur','Raðnúmer','Tegund','Stærð','Framleiðandi','Staðsetning','Tæknimaður','Niðurstaða','Þrýstingur','Hvað var gert','Næsta skoðun','Staðfest'];
          var csvRows = [headers.join(';')];
          filtered.forEach(function(row){
            var u = unitMap[row.unit_id] || {};
            var n = parseNotes(row.notes);
            var cells = [row.date||'', u.client||'', u.serial||'', u.type||'', u.size||'', n.framleidandi||'', u.location||'', row.tech||'', row.result||'', row.pressure||'', (n.hvad_var_gert||row.notes||'').replace(/[;\n\r]/g,' '), u.next_insp||'', n.stadfest?'Já':'Nei'];
            csvRows.push(cells.map(function(c){ return '"'+String(c).replace(/"/g,'""')+'"'; }).join(';'));
          });
          var csv = '\uFEFF' + csvRows.join('\n');
          var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url; a.download = 'verkbokhald_'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
          URL.revokeObjectURL(url);
          GK.log('export','skodunar_saga',null,null,{format:'csv',rows:filtered.length},'Verkbókhald CSV útflutningur ('+filtered.length+' línur)').then(function(){});
        };
        render('');
    });
  }

  function renderLog(container){
    GK.fetchLog(500).then(function(r){
      var rows = r.data || [];
      var entries = rows.map(function(row){
        try { return Object.assign({ _id:row.id, _ts:row.created_at }, JSON.parse(row.notes)); } catch(e) { return null; }
      }).filter(Boolean);
      container.innerHTML = `
        <div style="display:flex;gap:10px;margin-bottom:14px;align-items:center;">
          <input id="_gk_log_search" placeholder="Leita í aðgerðaskrá..." style="flex:1;min-width:200px;padding:9px 12px;border:1.5px solid #e5e7eb;border-radius:8px;font-size:13px;">
          <button id="_gk_log_csv" style="background:#059669;color:#fff;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:600;cursor:pointer;">⬇ CSV</button>
          <span style="font-size:12px;color:#666;">${entries.length} aðgerðir</span>
        </div>
        <div style="max-height:55vh;overflow-y:auto;border:1px solid #e5e7eb;border-radius:10px;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead style="background:#f9fafb;position:sticky;top:0;">
              <tr>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Tími</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Notandi</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Aðgerð</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Tafla</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Lýsing</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;font-weight:700;">Gögn</th>
              </tr>
            </thead>
            <tbody id="_gk_log_tbody"></tbody>
          </table>
        </div>`;
      function actionColor(a){ return a==='insert'?'#059669':a==='update'?'#2563eb':a==='delete'?'#dc2626':'#6b7280'; }
      function actionIcon(a){ return a==='insert'?'➕':a==='update'?'✏️':a==='delete'?'🗑️':'•'; }
      function render(filter){
        var tbody = document.getElementById('_gk_log_tbody');
        var q = (filter||'').toLowerCase();
        var filtered = !q ? entries : entries.filter(function(e){ return JSON.stringify(e).toLowerCase().indexOf(q) >= 0; });
        tbody.innerHTML = filtered.map(function(e){
          var t = new Date(e._ts||e.ts);
          var tStr = t.toLocaleDateString('is-IS')+' '+t.toLocaleTimeString('is-IS',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
          var dataStr = e.af ? JSON.stringify(e.af).slice(0,80) : '—';
          return `<tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:8px 10px;white-space:nowrap;font-family:monospace;font-size:11px;">${tStr}</td>
            <td style="padding:8px 10px;">${e.u||'—'}</td>
            <td style="padding:8px 10px;"><span style="color:${actionColor(e.a)};font-weight:600;">${actionIcon(e.a)} ${e.a||'—'}</span></td>
            <td style="padding:8px 10px;font-family:monospace;font-size:11px;color:#6b7280;">${e.t||'—'}</td>
            <td style="padding:8px 10px;">${e.d||'—'}</td>
            <td style="padding:8px 10px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace;font-size:10px;color:#888;">${dataStr}</td>
          </tr>`;
        }).join('') || '<tr><td colspan="6" style="text-align:center;padding:40px;color:#aaa;">Engar aðgerðir skráðar</td></tr>';
      }
      document.getElementById('_gk_log_search').oninput = function(){ render(this.value); };
      document.getElementById('_gk_log_csv').onclick = function(){
        var q = (document.getElementById('_gk_log_search').value||'').toLowerCase();
        var filtered = !q ? entries : entries.filter(function(e){ return JSON.stringify(e).toLowerCase().indexOf(q) >= 0; });
        var headers = ['Tími','Notandi','Aðgerð','Tafla','Lýsing','Gögn'];
        var csvRows = [headers.join(';')];
        filtered.forEach(function(e){
          var t = new Date(e._ts||e.ts);
          var tStr = t.toLocaleDateString('is-IS')+' '+t.toLocaleTimeString('is-IS',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
          var cells = [tStr, e.u||'', e.a||'', e.t||'', (e.d||'').replace(/[;\n\r]/g,' '), JSON.stringify(e.af||{}).replace(/[;\n\r]/g,' ')];
          csvRows.push(cells.map(function(c){ return '"'+String(c).replace(/"/g,'""')+'"'; }).join(';'));
        });
        var csv = '\uFEFF' + csvRows.join('\n');
        var blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = 'adgerdaskra_'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
        URL.revokeObjectURL(url);
      };
      render('');
    });
  }

  function renderUrelt(container){
    DB.sb.from('uttaeki').select('*').eq('status','urelt').order('serial').then(function(r){
      var urelt = r.data || [];
      DB.sb.from('uttaeki').select('*').neq('status','urelt').then(function(r2){
        var all = r2.data || [];
        var now = new Date();
        var nearObsolete = all.filter(function(u){
          if (!u.next_insp) return false;
          var d = new Date(u.next_insp);
          var monthsOver = (now - d) / (1000*60*60*24*30);
          return monthsOver > 24;
        });
        container.innerHTML = `
          <div style="margin-bottom:16px;background:#fef3c7;border-left:4px solid #f59e0b;padding:10px 14px;border-radius:6px;font-size:12px;color:#78350f;">
            <strong>Skv. IÐAN:</strong> Úrelt tæki skal skrá í verkbókhald. Tæki sem eru meira en 24 mán. fram yfir skoðunardag geta talist úrelt.
          </div>
          <h3 style="margin:16px 0 10px;font-size:14px;">Skráð sem úrelt (${urelt.length})</h3>
          <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:18px;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead style="background:#fef2f2;"><tr>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #fecaca;">Raðnúmer</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #fecaca;">Tegund</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #fecaca;">Viðskiptavinur</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #fecaca;">Staðsetning</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #fecaca;">Aðgerð</th>
              </tr></thead>
              <tbody>${urelt.map(function(u){
                return `<tr style="border-bottom:1px solid #f3f4f6;">
                  <td style="padding:9px 10px;font-family:monospace;font-size:11px;">${u.serial}</td>
                  <td style="padding:9px 10px;">${u.type} ${u.size||''}</td>
                  <td style="padding:9px 10px;">${u.client||'—'}</td>
                  <td style="padding:9px 10px;">${u.location||'—'}</td>
                  <td style="padding:9px 10px;"><button onclick="window._gk_reinstate('${u.id}')" style="background:#059669;color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer;">Endurvirkja</button></td>
                </tr>`;
              }).join('') || '<tr><td colspan="5" style="text-align:center;padding:30px;color:#aaa;">Engin skráð úrelt tæki</td></tr>'}</tbody>
            </table>
          </div>
          <h3 style="margin:16px 0 10px;font-size:14px;">Mögulega úrelt — yfir 24 mán. fram yfir skoðun (${nearObsolete.length})</h3>
          <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead style="background:#f9fafb;"><tr>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;">Raðnúmer</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;">Tegund</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;">Viðskiptavinur</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;">Skoðun rann út</th>
                <th style="text-align:left;padding:10px;border-bottom:2px solid #e5e7eb;">Aðgerð</th>
              </tr></thead>
              <tbody>${nearObsolete.map(function(u){
                var d = new Date(u.next_insp);
                var months = Math.floor((now - d)/(1000*60*60*24*30));
                return `<tr style="border-bottom:1px solid #f3f4f6;">
                  <td style="padding:9px 10px;font-family:monospace;font-size:11px;">${u.serial}</td>
                  <td style="padding:9px 10px;">${u.type} ${u.size||''}</td>
                  <td style="padding:9px 10px;">${u.client||'—'}</td>
                  <td style="padding:9px 10px;"><span style="color:#dc2626;font-weight:600;">${u.next_insp}</span> (${months} mán.)</td>
                  <td style="padding:9px 10px;"><button onclick="window._gk_markUrelt('${u.id}','${u.serial}')" style="background:#dc2626;color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer;">Merkja úrelt</button></td>
                </tr>`;
              }).join('') || '<tr><td colspan="5" style="text-align:center;padding:30px;color:#aaa;">Engin möguleg úrelt tæki</td></tr>'}</tbody>
            </table>
          </div>`;
      });
    });
    window._gk_markUrelt = async function(id, serial){
      if (!await Confirm.show('Merkja '+serial+' sem úrelt? Þetta verður skráð í aðgerðaskrá.')) return;
      DB.sb.from('uttaeki').update({status:'urelt'}).eq('id',id).then(function(){ renderTab('urelt'); });
    };
    window._gk_reinstate = async function(id){
      if (!await Confirm.show('Endurvirkja þetta tæki?')) return;
      DB.sb.from('uttaeki').update({status:'active'}).eq('id',id).then(function(){ renderTab('urelt'); });
    };
  }

  function printGKContent(){
    var c = document.getElementById('_gk_content');
    if (!c) return;
    var w = window.open('','_blank','width=1000,height=700');
    var d = new Date().toLocaleDateString('is-IS');
    w.document.write(`<html><head><title>Gæðakerfi — Slökkvitæki ehf</title><style>body{font-family:system-ui,sans-serif;padding:24px;color:#111;}h1{margin:0 0 6px;font-size:20px;}.head{border-bottom:2px solid #1a1f2e;padding-bottom:10px;margin-bottom:14px;}.meta{color:#666;font-size:12px;}table{width:100%;border-collapse:collapse;font-size:11px;}th,td{padding:7px 9px;text-align:left;border-bottom:1px solid #e5e7eb;}th{background:#f9fafb;font-weight:700;border-bottom:2px solid #d1d5db;}input,button{display:none!important;}@media print{body{padding:0;}}</style></head><body><div class="head"><h1>Slökkvitæki ehf — Gæðakerfi</h1><div class="meta">Útprentun: ${d} · Notandi: ${_currentTech}</div></div>${c.innerHTML}<script>setTimeout(function(){window.print();},400);<\/script></body></html>`);
    w.document.close();
  }

  // === Staðfesti signature — inject into existing ticket/kvittun area ===
  function injectSignatureBtn() {
    // Target the 'Slökkvitæki í verki' container in the center column
    var detail = null;
    var headers = document.querySelectorAll('h1, h2, h3, h4, b, strong, span, div');
    for (var i=0;i<headers.length;i++){
      if (/Slökkvitæki\s+í\s+verki/i.test(headers[i].textContent) && headers[i].children.length === 0) {
        var parent = headers[i].parentElement;
        while (parent && parent.tagName !== 'BODY') {
          if (parent.querySelector('table')) { detail = parent; break; }
          parent = parent.parentElement;
        }
        break;
      }
    }
    // Remove orphan sig zones outside the correct parent
    Array.prototype.forEach.call(document.querySelectorAll('._gk_sig_zone'), function(el){
      if (!detail || !detail.contains(el)) el.remove();
    });
    if (!detail) return;
    if (detail.querySelector('._gk_sig_zone')) return;
    // Add a Staðfesti section at bottom
    var zone = document.createElement('div');
    zone.className = '_gk_sig_zone';
    zone.style.cssText = 'margin-top:12px;padding:10px 12px;background:#f9fafb;border:1px dashed #d1d5db;border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;';
    zone.innerHTML = `
      <div style="font-size:11px;color:#555;">
        <strong>Gæðakerfi:</strong> Kvittun þjónustuaðila (IÐAN krafa).
        <span id="_gk_sig_status" style="margin-left:8px;color:#aaa;">Óstaðfest</span>
      </div>
      <button id="_gk_sig_btn" style="background:#059669;color:#fff;border:none;border-radius:7px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;">✓ Staðfesti</button>
    `;
    detail.appendChild(zone);
    document.getElementById('_gk_sig_btn').onclick = function(){
      var st = document.getElementById('_gk_sig_status');
      var now = new Date();
      var t = now.toLocaleDateString('is-IS')+' '+now.toLocaleTimeString('is-IS',{hour:'2-digit',minute:'2-digit',hour12:false});
      st.innerHTML = '<span style="color:#059669;font-weight:600;">✓ Staðfest af '+_currentTech+' · '+t+'</span>';
      document.getElementById('_gk_sig_btn').disabled = true;
      document.getElementById('_gk_sig_btn').style.opacity = '0.5';
      GK.log('signature', 'verkbeidnir', null, null, { tech: _currentTech, ts: now.toISOString() }, 'Kvittun staðfest af '+_currentTech);
    };
  }

  function init(){
    injectNav();
    window.openGKView = openGKView;
  }

  // Retry loop for DB wrap
  var wrapTries = 0;
  var wrapInterval = setInterval(function(){
    if (wrapDB()) clearInterval(wrapInterval);
    if (++wrapTries > 30) clearInterval(wrapInterval);
  }, 500);

  setInterval(function(){
    injectNav();
    injectSignatureBtn();
  }, 2000);
  setTimeout(init, 1500);
  console.log('[GK] v2 loaded');
})();