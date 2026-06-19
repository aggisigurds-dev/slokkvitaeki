'use strict';
// Features: Companies, Settings, Income

var Companies = {
  list: [],
  render: function() {
    var el = document.getElementById('companies-main');
    if (!el) return;
    var L = this.list;
    var html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">' +
      '<div><div style="font-size:19px;font-weight:600">Fyrirt\u00e6ki</div>' +
      '<div style="font-size:13px;color:var(--ink3)">' + L.length + ' skr\u00e1\u00f0</div></div>' +
      '<button class="btn btn-primary btn-sm" onclick="Companies.openNew()">+ N\u00fdtt fyrirt\u00e6ki</button></div>';
    if (!L.length) {
      html += '<div class="empty-state"><div class="es-icon">\ud83c\udfe2</div>' +
        '<div class="es-title">Engin fyrirt\u00e6ki</div>' +
        '<div class="es-sub">Smelltu \u00e1 \u201e+ N\u00fdtt fyrirt\u00e6ki\u201c</div></div>';
    } else {
      // 2026-05-08: Use the pre-built `DB.cache.unitsByClient` index for
      // O(1) lookup instead of scanning all units per company. At 456
      // companies × 3000 units this changes 1.36M iterations into 456
      // hash lookups.
      var _ubc = (DB.cache && DB.cache.unitsByClient) || {};
      html += '<div class="company-grid">' + L.map(function(c) {
        var units = _ubc[c.nafn] || [];
        // "Overdue" = active unit whose next inspection is in the past. Real status values
        // are 'active'/'geymsla'/etc. — there's no 'overdue' status string.
        var _today = new Date().toISOString().substring(0,10);
        var ov = units.filter(function(u) { return u.status === 'active' && u.next_insp && u.next_insp < _today; }).length;
        var nafn = U.e(c.nafn);
        var simi = c.simi ? '<div class="company-meta">' + U.e(c.simi) + '</div>' : '';
        var addr = c.heimilisfang || c.heimilisFang || '';
        var hv = addr ? '<span class="company-stat">' + U.e(addr) + '</span>' : '';
        var badge = ov > 0 ? '<span class="st st-ov">' + ov + ' \u00fatrunnin</span>' : '<span class="st st-ok">\u00cd lagi</span>';
        return '<div class="company-card" onclick="Companies.openDetail(' + c.id + ')">' +
          '<div class="company-card-top">' +
            '<div class="company-initials">' + c.nafn.slice(0, 2).toUpperCase() + '</div>' +
            '<div style="flex:1;min-width:0"><div class="company-name">' + nafn + '</div>' + simi + '</div>' +
            badge +
          '</div>' +
          '<div class="company-card-bottom"><span class="company-stat"><strong>' + units.length + '</strong> t\u00e6ki</span>' + hv + '</div>' +
          '<div style="display:flex;gap:6px;margin-top:10px">' +
            '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();Companies.openDetail(' + c.id + ')">Sko\u00f0a t\u00e6ki</button>' +
            '<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();Companies.addUnit(' + c.id + ',\'' + nafn + '\')">+ T\u00e6ki</button>' +
          '</div>' +
        '</div>';
      }).join('') + '</div>';
    }
    el.innerHTML = html;
  },
  load: async function() {
    if (!DB.online) {
      this.list = [];
      this.render();
      return;
    }
    // Page through — Supabase caps each response at 1000 rows.
    this.list = await DB.fetchAll(function(from, to){ return DB.sb.from('fyrirtaeki').select('*').is('deleted_at', null).order('nafn').range(from, to); });
    this.render();
  },
  openNew: function() {
    var ids = ['nf-nafn', 'nf-kt', 'nf-simi', 'nf-netfang', 'nf-heimilisfang', 'nf-tengiliður', 'nf-athugasemdir'];
    ids.forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
    Modal.open('modal-nyfyrirtaeki');
  },
  submitNew: async function() {
    var nafn = ((document.getElementById('nf-nafn') || {}).value || '').trim();
    if (!nafn) { Toast.show('Sl\u00e1\u00f0u inn nafn'); return; }
    var g = function(id) { var el = document.getElementById(id); return el ? (el.value || '').trim() : ''; };
    // NB: column names must match the table exactly (lowercase `heimilisfang`,
    // and the id `nf-tengili\u00f0ur`/`nf-heimilisfang` from the modal). The old code
    // sent `heimilisFang` (capital F) which is not a column, so PostgREST
    // rejected every insert \u2014 yet the modal still closed and toasted "success",
    // which is why new companies "disappeared" without ever saving.
    var data = {
      nafn: nafn,
      kennitala: g('nf-kt'),
      simi: g('nf-simi'),
      netfang: g('nf-netfang'),
      'tengili\u00f0ur': g('nf-tengili\u00f0ur'),
      heimilisfang: g('nf-heimilisfang'),
      athugasemdir: g('nf-athugasemdir')
    };
    if (DB.online && DB.sb) {
      var r = await DB.sb.from('fyrirtaeki').insert(data).select().single();
      if (r.error) {
        // Keep the modal open so the half-filled form isn't lost.
        Toast.show('Villa vi\u00f0 vistun: ' + (r.error.message || r.error));
        console.error('[Companies.submitNew]', r.error);
        return;
      }
      this.list.push(r.data);
    } else {
      data.id = Date.now();
      this.list.push(data);
    }
    Modal.close('modal-nyfyrirtaeki');
    this.render();
    Toast.show('Fyrirt\u00e6ki skr\u00e1\u00f0: ' + nafn);
  },
  openDetail: function(id) {
    var c = this.list.find(function(x) { return x.id === id; });
    if (!c) return;
    var units = DB.cache.units.filter(function(u) { return u.client === c.nafn; });
    var el = document.getElementById('companies-main');
    var nafn = U.e(c.nafn);
    var kt = c.kennitala ? U.e(c.kennitala) : '';
    var addr = U.e(c.heimilisFang || c.heimilisfang || '');
    var simi = c.simi ? U.e(c.simi) : '';
    var netfang = c.netfang ? U.e(c.netfang) : '';
    // Inspection-month chip for the banner (from the visit-date helper if present).
    var inspBadge = '';
    try {
      var _vd = (window.SlokkVisitDate && SlokkVisitDate.get) ? SlokkVisitDate.get(c.id) : null;
      if (_vd && _vd.manudur) inspBadge = '📅 Skoðun: ' + U.e(_vd.manudur);
    } catch (_e) {}
    // 2026-05-19: redesigned header \u2014 company name gets its own line at
    // the top (no longer squeezed next to a row of 8 action buttons),
    // info chips below, then a clean wrap-friendly action bar. Patches
    // 91 (Mikilv\u00e6gt), 154 (Ey\u00f0a), 123 (\u00dattektarsk\u00fdrsla), 73 (M\u00f6rg t\u00e6ki),
    // 137 (Merkja sko\u00f0un) inject into the action bar via the existing
    // selectors so nothing needs re-wiring.
    var html =
      // Top bar: back button on its own line
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">' +
        '<button class="btn btn-ghost btn-sm" onclick="App.switchView(\'arsskodun\')" style="padding:6px 12px;display:inline-flex;align-items:center;gap:4px">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><polyline points="15 18 9 12 15 6"/></svg>' +
          ' Til baka' +
        '</button>' +
        '<div style="display:flex;gap:6px;align-items:center">' +
          '<button class="btn btn-outline btn-sm" onclick="Companies.openEdit(' + c.id + ')" style="padding:6px 12px;display:inline-flex;align-items:center;gap:5px">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
            ' Breyta' +
          '</button>' +
        '</div>' +
      '</div>' +

      // Header banner (v6 design \u2014 dark theme-aware gradient + monogram).
      // Styled by patch 223 (.co-banner*); adapts to the active \u2699\ufe0f \u00datlit theme.
      '<div class="co-banner">' +
        '<div class="co-banner-id">' +
          '<div class="co-banner-mono">' + c.nafn.slice(0, 2).toUpperCase() + '</div>' +
          '<div style="min-width:0">' +
            '<div class="co-banner-name">' + nafn + '</div>' +
            (kt ? '<div class="co-banner-kt">kt. ' + kt + '</div>' : '') +
            '<div class="co-banner-facts">' +
              (addr    ? '<span>\ud83d\udccd <b>' + addr + '</b></span>' : '') +
              (simi    ? '<span>\ud83d\udcde <a href="tel:' + simi + '">' + simi + '</a></span>' : '') +
              (netfang ? '<span>\u2709 <a href="mailto:' + netfang + '">' + netfang + '</a></span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        (inspBadge ? '<div class="co-banner-right"><span class="co-banner-badge">' + inspBadge + '</span></div>' : '') +
      '</div>' +

      // Action bar (patches 102/91/154/137/73/123 etc. inject into this row).
      // 2026-05-19: data-co-id makes the row addressable independently of
      // the Companies.openEdit button (which lives in the top bar now).
      '<div data-co-id="' + c.id + '" style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:18px">' +
        // Hidden anchor button \u2014 patches that derive co_id from a
        // Companies.openEdit onclick handler (e.g. patch 102) still find
        // it here without showing a duplicate visible button.
        '<button class="_co-edit-anchor" type="button" onclick="Companies.openEdit(' + c.id + ')" style="display:none">edit anchor</button>' +
        '<button class="btn btn-primary btn-sm" onclick="Companies.addUnit(' + c.id + ',\'' + nafn + '\')">+ B\u00e6ta vi\u00f0 t\u00e6ki</button>' +
        // 2026-05-31: opens the main "\u00dej\u00f3nustusamningur" template (patch 94)
        // pre-filled with this company's nafn/kt/heimilisfang.
        '<button class="btn btn-outline btn-sm" onclick="window.DocTemplates&&DocTemplates.openForCompany(' + c.id + ')">\ud83d\udcd1 \u00dej\u00f3nustusamningur</button>' +
        '<button class="btn btn-outline btn-sm" onclick="FloorPlan.load(' + c.id + ');FloorPlan.open(' + c.id + ',\'' + nafn + '\',' + 'Companies.list.find(function(x){return x.id===' + c.id + ';}) ? DB.cache.units.filter(function(u){return u.client===\'' + nafn + '\';}) : [])"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg> Teikning</button>' +
      '</div>';
    // Keep the legacy info-grid empty (kept for other patches that
    // selectorize into it). S\u00edmi + netfang already shown in the card above.
    html += '<div class="info-grid" style="display:none"></div>';
    html += '<div class="uttekt-cols"><div class="uttekt-col-l">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
      '<span style="font-size:14px;font-weight:600">Sl\u00f6kkvit\u00e6ki (' + units.length + ')</span>' +
      '</div>';
    if (!units.length) {
      html += '<div class="empty-state" style="padding:24px"><div class="es-sub">Engin t\u00e6ki skr\u00e1\u00f0 fyrir \u00feetta fyrirt\u00e6ki</div></div>';
    } else if (window.UttektTaeki && UttektTaeki.buildHtml) {
      // v6 design (patch 224): grouped two-column rows, wired to the same
      // UnitServicePicker billing choices the cost panel reads.
      html += UttektTaeki.buildHtml(c.id, units);
    } else {
      html += '<div class="tcard"><table class="dtbl"><thead><tr>' +
        '<th>Ra\u00f0n\u00famer</th><th>Tegund</th><th>Sta\u00f0setning</th><th>N\u00e6sta sko\u00f0un</th><th>Sta\u00f0a</th><th></th>' +
        '</tr></thead><tbody>';
      units.forEach(function(u) {
        html += '<tr>' +
          '<td><span class="ser">' + U.e(u.serial) + '</span></td>' +
          '<td>' + U.e(u.type) + '</td>' +
          '<td>' + U.e(u.location || '') + '</td>' +
          '<td>' + U.fd(u.next_insp) + '</td>' +
          '<td>' + Companies._unitStatusSelect(u) + '</td>' +
          '<td><button class="btn btn-ghost btn-sm" onclick="Field.openInspect(DB.getUnit(' + u.id + '))" title="Skr\u00e1 sko\u00f0un">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><polyline points="20 6 9 17 4 12"/></svg>' +
          '</button>' +
          '<button class="btn btn-ghost btn-sm" onclick="Print.showQR(DB.getUnit(' + u.id + '))" title="Prenta QR">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px"><path d="M4 6V4h2"/><path d="M4 18v2h2"/><path d="M20 6V4h-2"/><path d="M20 18v2h-2"/><line x1="4" y1="12" x2="20" y2="12"/></svg>' +
          '</button></td>' +
        '</tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div><div class="uttekt-col-r" id="_ctc-slot"></div></div>';
    el.innerHTML = html;
  },
  // 2026-06-11: stable per-tæki status dropdown rendered as part of the
  // canonical company-detail HTML (was previously bolted on by a 2s
  // setInterval in 00-legacy, which flickered/was wiped on every re-render).
  // 'onytt'/'geymsla'/'urelt' fall out of the bill below (patch 129 only
  // counts status='active').
  _STATUS_STYLE: {
    active:    { bg: '#dcfce7', fg: '#166534', label: '✓ Virkt' },
    i_vinnslu: { bg: '#fef3c7', fg: '#92400e', label: '⏳ Í vinnslu' },
    geymsla:   { bg: '#dbeafe', fg: '#1e40af', label: '📦 Í geymslu' },
    urelt:     { bg: '#fee2e2', fg: '#b91c1c', label: '♻ Úrelt' },
    onytt:     { bg: '#fecaca', fg: '#991b1b', label: '🚫 Ónýtt' }
  },
  _normStatus: function(s) {
    var c = String(s == null ? '' : s).toLowerCase();
    if (c === 'onytt' || c === 'ónýtt') return 'onytt';
    if (c === 'geymsla' || c === 'í geymslu' || c === 'i_geymslu' || c === 'i geymslu') return 'geymsla';
    if (c === 'urelt' || c === 'úrelt') return 'urelt';
    if (c === 'i_vinnslu' || c === 'í vinnslu' || c === 'i vinnslu') return 'i_vinnslu';
    return 'active'; // active / ok / null all show (and bill) as virkt
  },
  _unitStatusSelect: function(u) {
    var val = Companies._normStatus(u.status);
    var st = Companies._STATUS_STYLE[val] || Companies._STATUS_STYLE.active;
    var order = ['active', 'i_vinnslu', 'geymsla', 'urelt', 'onytt'];
    var opts = order.map(function(k) {
      return '<option value="' + k + '"' + (k === val ? ' selected' : '') + '>' +
        Companies._STATUS_STYLE[k].label + '</option>';
    }).join('');
    return '<select class="_pm_status_sel _co-status" data-uid="' + u.id + '" ' +
      'onchange="Companies.setUnitStatus(this,' + u.id + ')" ' +
      'style="padding:3px 7px;border:1px solid ' + st.bg + ';background:' + st.bg + ';color:' + st.fg +
      ';border-radius:5px;font:inherit;font-size:11px;font-weight:600;cursor:pointer">' + opts + '</select>';
  },
  setUnitStatus: function(sel, id) {
    var v = sel.value;
    var st = Companies._STATUS_STYLE[v] || Companies._STATUS_STYLE.active;
    sel.style.background = st.bg; sel.style.borderColor = st.bg; sel.style.color = st.fg;
    var tr = sel.closest('tr'); if (tr) tr.style.opacity = (v === 'active') ? '1' : '0.55';
    DB.sb.from('uttaeki').update({ status: v }).eq('id', id).then(function(r) {
      if (r.error) { alert('Villa við að vista stöðu: ' + r.error.message); return; }
      var u = DB.cache && DB.cache.units && DB.cache.units.find(function(x) { return x.id === id; });
      if (u) u.status = v;
      // ónýtt/geymsla/úrelt drop out of the bill → recompute the total below.
      if (typeof window.recomputeCompanyTotalCost === 'function') window.recomputeCompanyTotalCost();
    });
  },
  addUnit: function(id, nafn) {
    document.getElementById('au-client').value = nafn;
    document.getElementById('au-loc').value = '';
    var t = U.today(), n = (parseInt(t.slice(0, 4)) + 1) + t.slice(4);
    document.getElementById('au-inst').value = t;
    document.getElementById('au-next').value = n;
    document.getElementById('au-type').selectedIndex = 0;
    document.getElementById('au-size').value = '';
    Modal.open('modal-addunit');
  }
};

var Settings = {
  taekjategundier: [],
  thjonustategundier: [],
  taeknimenn: [],
  render: function() {
    var el = document.getElementById('settings-main');
    if (!el) return;
    var html = '<div style="font-size:19px;font-weight:600;margin-bottom:4px">Stillingar</div>' +
      '<div style="font-size:13px;color:var(--ink3);margin-bottom:20px">Stj\u00f3rna\u00f0u t\u00e6kjategundum, \u00fej\u00f3nustum og t\u00e6knim\u00f6nnum</div>';
    html += '<div class="tcard" style="margin-bottom:16px">' +
      '<div class="card-header"><span class="card-title">T\u00e6kjategundir</span>' +
      '<button class="btn btn-primary btn-sm" onclick="Settings.addRow(\'tg\')">+ B\u00e6ta vi\u00f0</button></div>' +
      '<div style="padding:0">' +
      (this.taekjategundier.length ? this.taekjategundier.map(function(t) {
        return '<div class="settings-row">' +
          '<div><div style="font-size:14px;font-weight:500">' + U.e(t.heiti) + '</div>' +
          (t.lysing ? '<div style="font-size:12px;color:var(--ink3)">' + U.e(t.lysing) + '</div>' : '') +
          '</div><div style="display:flex;align-items:center;gap:8px">' +
          '<span class="st ' + (t.virkur ? 'st-ok' : 'st-col') + '">' + (t.virkur ? 'Virk' : '\u00d3virk') + '</span>' +
          '<button class="btn btn-ghost btn-sm" onclick="Settings.editRow(\'tg\',' + t.id + ',\'' + U.e(t.heiti) + '\')">Breyta</button>' +
          '</div></div>';
      }).join('') : '<div style="padding:16px;color:var(--ink3)">Engar t\u00e6kjategundir</div>') +
      '</div></div>';
    html += '<div class="tcard" style="margin-bottom:16px">' +
      '<div class="card-header"><span class="card-title">\u00dej\u00f3nustategundir</span>' +
      '<button class="btn btn-primary btn-sm" onclick="Settings.addRow(\'svc\')">+ B\u00e6ta vi\u00f0</button></div>' +
      '<div style="padding:0">' +
      (this.thjonustategundier.length ? this.thjonustategundier.map(function(t) {
        return '<div class="settings-row">' +
          '<div style="font-size:14px;font-weight:500">' + U.e(t.heiti) + '</div>' +
          '<button class="btn btn-ghost btn-sm" onclick="Settings.editRow(\'svc\',' + t.id + ',\'' + U.e(t.heiti) + '\')">Breyta</button>' +
          '</div>';
      }).join('') : '<div style="padding:16px;color:var(--ink3)">Engar \u00fej\u00f3nustategundir</div>') +
      '</div></div>';
    html += '<div class="tcard">' +
      '<div class="card-header"><span class="card-title">T\u00e6knimenn</span>' +
      '<button class="btn btn-primary btn-sm" onclick="Settings.addTech()">+ B\u00e6ta vi\u00f0</button></div>' +
      '<div style="padding:0">' +
      (this.taeknimenn.length ? this.taeknimenn.map(function(t) {
        return '<div class="settings-row">' +
          '<div><div style="font-size:14px;font-weight:500">' + U.e(t.nafn) + '</div>' +
          (t.simi ? '<div style="font-size:12px;color:var(--ink3)">' + U.e(t.simi) + '</div>' : '') +
          '</div><span class="st ' + (t.virkur ? 'st-ok' : 'st-col') + '">' + (t.virkur ? 'Virkur' : '\u00d3virkur') + '</span>' +
          '</div>';
      }).join('') : '<div style="padding:16px;color:var(--ink3)">Engir t\u00e6knimenn</div>') +
      '</div></div>';
    el.innerHTML = html;
  },
  load: async function() {
    if (!DB.online) { this.render(); return; }
    var results = await Promise.all([
      DB.sb.from('taekjategundier').select('*').order('heiti'),
      DB.sb.from('thjonustategundier').select('*').order('heiti'),
      DB.sb.from('taeknimenn').select('*').order('nafn')
    ]);
    this.taekjategundier = results[0].data || [];
    this.thjonustategundier = results[1].data || [];
    this.taeknimenn = results[2].data || [];
    this.render();
  },
  addRow: function(type) {
    var h = prompt(type === 'tg' ? 'Heiti t\u00e6kjategundar:' : 'Heiti \u00feJ\u00f3nustu:');
    if (!h) return;
    var tbl = type === 'tg' ? 'taekjategundier' : 'thjonustategundier';
    var arr = type === 'tg' ? this.taekjategundier : this.thjonustategundier;
    var item = { heiti: h.trim(), virkur: true };
    if (type === 'tg') { var l = prompt('L\u00fdSing (valfr\u00e1lst):') || ''; item.lysing = l.trim(); }
    if (DB.online) {
      var self = this;
      DB.sb.from(tbl).insert(item).select().single().then(function(r) {
        if (!r.error) { arr.push(r.data); self.render(); }
      });
    } else { item.id = Date.now(); arr.push(item); this.render(); }
    Toast.show('B\u00e6tt vi\u00f0: ' + h);
  },
  editRow: function(type, id, cur) {
    var h = prompt('Breyta heiti:', cur);
    if (!h) return;
    var tbl = type === 'tg' ? 'taekjategundier' : 'thjonustategundier';
    var arr = type === 'tg' ? this.taekjategundier : this.thjonustategundier;
    var item = arr.find(function(x) { return x.id === id; });
    if (item) { item.heiti = h.trim(); }
    if (DB.online) DB.sb.from(tbl).update({ heiti: h.trim() }).eq('id', id);
    this.render();
  },
  addTech: function() {
    var n = prompt('Nafn t\u00e6knimanns:');
    if (!n) return;
    var s = prompt('S\u00edman\u00famer:') || '';
    var item = { nafn: n.trim(), simi: s.trim(), virkur: true };
    var self = this;
    if (DB.online) {
      DB.sb.from('taeknimenn').insert(item).select().single().then(function(r) {
        if (!r.error) { self.taeknimenn.push(r.data); self.render(); }
      });
    } else { item.id = Date.now(); this.taeknimenn.push(item); this.render(); }
    Toast.show('T\u00e6knima\u00f0ur: ' + n);
  }
};

var Income = {
  render: function() {
    var el = document.getElementById('income-main');
    if (!el) return;
    var jobs = DB.cache.jobs || [];
    var today = new Date().toISOString().slice(0,10);
    var thisMonth = today.slice(0,7);
    var lastMonth = (function(){var d=new Date(today);d.setMonth(d.getMonth()-1);return d.toISOString().slice(0,7);})();
    var sum = function(arr){return arr.reduce(function(s,j){return s+(parseFloat(j.verd)||0);},0);};
    var todayInc = sum(jobs.filter(function(j){return j.dropoff===today&&j.verd&&parseFloat(j.verd)>0;}));
    var monthInc = sum(jobs.filter(function(j){return (j.dropoff||'').startsWith(thisMonth)&&j.verd&&parseFloat(j.verd)>0;}));
    var lastInc  = sum(jobs.filter(function(j){return (j.dropoff||'').startsWith(lastMonth)&&j.verd&&parseFloat(j.verd)>0;}));
    var totalInc = sum(jobs.filter(function(j){return j.verd&&parseFloat(j.verd)>0;}));
    var months=['jan','feb','mar','apr','ma\u00ed','j\u00fan','j\u00fal','\u00e1g\u00fa','sep','okt','n\u00f3v','des'];
    var md={};
    jobs.forEach(function(j){if(!j.dropoff||!(j.verd&&parseFloat(j.verd)>0))return;var k=j.dropoff.slice(0,7);md[k]=(md[k]||0)+(parseFloat(j.verd)||0);});
    var maxVal=Math.max.apply(null,Object.values(md).concat([1]));
    var bars=Object.keys(md).sort().slice(-6).map(function(k){var v=md[k],pct=Math.round((v/maxVal)*100);var d=new Date(k+'-01');return'<div class="income-bar-col"><div class="income-bar-wrap"><div class="income-bar" style="height:'+pct+'%"></div></div><div class="income-bar-label">'+months[d.getMonth()]+'</div><div class="income-bar-val">'+Math.round(v).toLocaleString('is')+'</div></div>';}).join('');
    var html='<div style="font-size:19px;font-weight:600;margin-bottom:4px">Tekjuyfirlit</div>'+
      '<div style="font-size:13px;color:var(--ink3);margin-bottom:20px">Tekjur verkst\u00e6\u00f0is eftir d\u00f6gum og m\u00e1nu\u00f0um</div>'+
      '<div class="stat-grid4" style="margin-bottom:20px">'+
        '<div class="ic" style="text-align:center"><div class="ic-lbl">\u00cd dag</div><div style="font-size:24px;font-weight:700;color:var(--grn)">'+todayInc.toLocaleString('is')+' kr</div></div>'+
        '<div class="ic" style="text-align:center"><div class="ic-lbl">\u00deessi m\u00e1nu\u00f0ur</div><div style="font-size:24px;font-weight:700;color:var(--blu)">'+monthInc.toLocaleString('is')+' kr</div></div>'+
        '<div class="ic" style="text-align:center"><div class="ic-lbl">S\u00ed\u00f0asti m\u00e1nu\u00f0ur</div><div style="font-size:24px;font-weight:700">'+lastInc.toLocaleString('is')+' kr</div></div>'+
        '<div class="ic" style="text-align:center"><div class="ic-lbl">Samtals</div><div style="font-size:24px;font-weight:700">'+totalInc.toLocaleString('is')+' kr</div></div>'+
      '</div>'+
      '<div class="tcard" style="margin-bottom:16px"><div class="card-header"><span class="card-title">M\u00e1na\u00f0arlegar tekjur</span></div>'+
      '<div style="padding:20px">'+(bars?'<div class="income-chart">'+bars+'</div>':'<div style="text-align:center;color:var(--ink3);padding:20px">B\u00e6ttu ver\u00f0i vi\u00f0 verk til a\u00f0 sj\u00e1 t\u00f6lfr\u00e6\u00f0i</div>')+'</div></div>'+
      '<div class="tcard"><div class="card-header"><span class="card-title">\u00d6ll verk</span>'+
      '<span style="font-size:12px;color:var(--ink3);margin-left:8px">Smelltu \u00e1 ver\u00f0 til a\u00f0 breyta</span></div>'+
      '<table class="dtbl"><thead><tr><th>Dagsetning</th><th>Vi\u00f0skiptavinur</th><th>Verk</th><th>Ver\u00f0</th><th>Sta\u00f0a</th></tr></thead><tbody>'+
      (jobs.length?jobs.slice(0,30).map(function(j){var hv=j.verd&&parseFloat(j.verd)>0;return'<tr><td>'+U.fd(j.dropoff)+'</td><td>'+U.e(j.customer)+'</td><td>'+U.e(j.num)+'</td><td><span onclick="Counter.editVerd('+j.id+')" style="cursor:pointer;font-family:var(--mono);font-weight:600;color:'+(hv?'var(--grn)':'var(--ink3)')+'" title="Smelltu til a\u00f0 setja ver\u00f0">'+(hv?parseFloat(j.verd).toLocaleString('is')+' kr':'+ Setja ver\u00f0')+'</span></td><td>'+U.badge(j.status)+'</td></tr>';}).join(''):'<tr><td colspan="5" style="text-align:center;color:var(--ink3);padding:20px">Engin verk skr\u00e1\u00f0</td></tr>')+
      '</tbody></table></div>';
    el.innerHTML = html;
  }
};

function _patchAppSwitchView() {
  if (typeof App === 'undefined') return;
  if (App.switchView._patched) return;
  var orig = App.switchView.bind(App);
  App.switchView = function(v) {
    orig(v);
    if (v === 'companies' && typeof Companies !== 'undefined') Companies.load();
    if (v === 'settings' && typeof Settings !== 'undefined') Settings.load();
    if (v === 'income' && typeof Income !== 'undefined') Income.render();
    if (v === 'geymsla' && typeof Geymsla !== 'undefined') Geymsla.load();
  };
  App.switchView._patched = true;
}
document.addEventListener('DOMContentLoaded', function() {
  _patchAppSwitchView();
  setTimeout(_patchAppSwitchView, 200);
  setTimeout(_patchAppSwitchView, 800);
});
