'use strict';
var DB = {
  sb: null,
  online: false,
  cache: { jobs: [], units: [], schedule: [], history: [] },
  _lastLoadOk: null,   // timestamp of the last SUCCESSFUL load (null = never)

  // Fetch ALL rows for a query, working around Supabase's server-side
  // "Max rows" cap (1000). Pages through .range() in 1000-row chunks until a
  // short page signals the end. `makeQuery(from, to)` must return a query
  // builder with .range(from, to) applied. Returns a flat array (throws on err).
  fetchAll: async function(makeQuery, pageSize) {
    var page = pageSize || 1000, from = 0, all = [];
    for (;;) {
      var res = await makeQuery(from, from + page - 1);
      if (res && res.error) throw res.error;
      var rows = (res && res.data) || [];
      all = all.concat(rows);
      if (rows.length < page) break;
      from += page;
      if (from > 500000) break; // safety stop
    }
    return all;
  },

  init: function() {
    if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL.includes('LÍMDU')) {
      document.getElementById('setup-banner').classList.remove('hidden');
      document.getElementById('sync-dot').className = 'sync-dot error';
      this.loadDemoData();
      return;
    }
    try {
      // 2026-08-01 (ósk Agnars, eftir endurtekið Realtime-tengingarrof í
      // Supabase-niðurtíma sem hefur áður valdið svipuðum vandræðum): lengri
      // timeout + hægari, veldisvaxandi endurtengingar-bil (1s→2s→4s…hám. 30s)
      // í stað sjálfgefins hám. 10s. Kemur í veg fyrir að appið hamri á
      // endurtengingu meðan Supabase-hliðin er í vandræðum.
      this.sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        realtime: {
          timeout: 30000,
          reconnectAfterMs: function (tries) { return Math.min(1000 * Math.pow(2, tries), 30000); },
        },
      });
      var _sb = document.getElementById('setup-banner'); if(_sb){ _sb.classList.add('hidden'); _sb.style.display='none'; }
      document.getElementById('sync-dot').className = 'sync-dot syncing';
      this.loadAll();
      this.subscribeRealtime();
    } catch(e) {
      console.error('Supabase villa:', e);
      // Genuine failure (client-init threw) — NOT setup mode. Never show fake
      // demo data; surface the error + let the user retry.
      this.showLoadError(e);
    }
  },

  setSyncState: function(state) {
    document.getElementById('sync-dot').className = 'sync-dot ' + state;
  },

  // Real load/connection failure (as opposed to placeholder setup mode, which
  // still shows demo data). NEVER loads demo data here — that silently replaced
  // the real customers with fake ones. Instead: keep any previously loaded data
  // on screen (with a small "offline, data from HH:MM" note) or, if nothing has
  // loaded yet this session, show a full-width error state with a retry button.
  showLoadError: function(err) {
    try { this.setSyncState('error'); } catch(_) {}
    var self = this;
    var hadData = !!this._lastLoadOk;
    var bar = document.getElementById('db-load-error');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'db-load-error';
      bar.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:100096;background:linear-gradient(180deg,#c0241f,#8a1010);color:#fff;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 6px 18px -6px rgba(0,0,0,.5)';
      (document.body || document.documentElement).appendChild(bar);
    }
    if (hadData) {
      var t = new Date(this._lastLoadOk);
      var hhmm = ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
      bar.style.padding = '9px 16px';
      bar.innerHTML = '<div style="display:flex;align-items:center;gap:12px;justify-content:center;flex-wrap:wrap;font-size:13px;font-weight:700">'
        + '<span>⚠ Engin nettenging — sýni gögn frá ' + hhmm + '</span>'
        + '<button type="button" id="_db-le-retry" style="border:0;border-radius:8px;padding:6px 12px;background:rgba(255,255,255,.92);color:#8a1010;font:inherit;font-weight:800;cursor:pointer">↻ Reyna aftur</button>'
        + '</div>';
    } else {
      bar.style.padding = '40px 22px';
      bar.innerHTML = '<div style="max-width:420px;margin:0 auto;text-align:center">'
        + '<div style="font-size:20px;font-weight:800;margin-bottom:8px">⚠ Náði ekki í gögn</div>'
        + '<div style="font-size:14px;opacity:.9;margin-bottom:16px">Villa við að hlaða gögnum úr gagnagrunni. Athugaðu nettenginguna og reyndu aftur.</div>'
        + '<button type="button" id="_db-le-retry" style="border:0;border-radius:10px;padding:12px 22px;background:#fff;color:#8a1010;font:inherit;font-size:15px;font-weight:800;cursor:pointer">↻ Reyna aftur</button>'
        + '</div>';
    }
    bar.style.display = 'block';
    var btn = document.getElementById('_db-le-retry');
    if (btn) btn.onclick = function() {
      bar.style.display = 'none';
      try { self.setSyncState('syncing'); } catch(_) {}
      if (self.sb) self.loadAll(); else self.init();
    };
  },

  loadAll: async function() {
    this.setSyncState('syncing');
    try {
      // Paginate uttaeki: PostgREST default cap is 1000 rows. We now have
      // 3,777+ active rows (after the bulk insert from arsskodun) so a
      // single .select() returns at most 1000. Fetch in chunks via .range()
      // until exhausted so the full cache is consistent with the DB.
      async function loadAllUttaeki(sb) {
        var pageSize = 1000;
        var allRows = [];
        for (var start = 0; ; start += pageSize) {
          // 2026-08-17: .order('id') tiebreaker — ORDER BY client eitt og sér er
          // ekki einkvæmt (hundruð raða deila sama client) svo Postgres má raða
          // jafningjum MISMUNANDI milli síðu-fyrirspurna og raðir detta þá milli
          // síðna: skyndiminnið endaði með 6191 af 6197 tækjum og Afltak (6 ný
          // tæki) „átti engin tæki" — reikningsglugginn opnaðist ekki.
          var res = await sb.from('uttaeki').select('*').order('client').order('id').range(start, start + pageSize - 1);
          if (res.error) throw res.error;
          var rows = res.data || [];
          allRows = allRows.concat(rows);
          if (rows.length < pageSize) break;
          if (start > 50000) break; // safety stop
        }
        return { data: allRows };
      }
      // verkbeidnir + verklidur ALSO hit the 1000-row cap (verklidur is at ~926
      // and climbing). A single .select() there silently returns only the first
      // 1000 rows — jobs would then lose their unit rows (Counter/Workshop unit
      // counts + Income go wrong) with no error. Page through both like uttaeki.
      var self = this;
      var [j, v, u, s, h] = await Promise.all([
        self.fetchAll(function(from,to){ return self.sb.from('verkbeidnir').select('*').order('created_at', {ascending:false}).order('id').range(from,to); }).then(function(data){ return { data: data }; }),
        self.fetchAll(function(from,to){ return self.sb.from('verklidur').select('*').order('id').range(from,to); }).then(function(data){ return { data: data }; }),
        loadAllUttaeki(this.sb),
        this.sb.from('dagskra').select('*').order('date'),
        this.sb.from('skodunar_saga').select('*').order('created_at', {ascending:false}).limit(20)
      ]);
      // Merge units into jobs
      this.cache.jobs = (j.data||[]).map(function(job) {
        job.units = (v.data||[]).filter(function(u) { return u.job_id === job.id; });
        return job;
      });
      this.cache.units = u.data || [];
      this.cache.schedule = s.data || [];
      this.cache.history = h.data || [];
      // 2026-05-08: Pre-bucket units by client name ONCE here so callers
      // (Companies.render, 89-monthly-strip, features.js, …) can do
      // O(1) lookup instead of O(N) filter per company. At 456 companies
      // × 3000 units this saves 1.36M iterations on every render.
      this.cache.unitsByClient = Object.create(null);
      var arr = this.cache.units;
      for (var i = 0; i < arr.length; i++) {
        var k = arr[i].client || '';
        if (!k) continue;
        (this.cache.unitsByClient[k] = this.cache.unitsByClient[k] || []).push(arr[i]);
      }
      this.setSyncState('online');
      this.online = true;
      this._lastLoadOk = Date.now();
      var _le = document.getElementById('db-load-error'); if (_le) _le.style.display = 'none';
      App.refreshAll();
    } catch(e) {
      console.error('Load villa:', e);
      // Real load failure — do NOT fall back to demo data (it silently showed
      // fake customers). Keep last-good data if we have it; else show a retry
      // error state. setSyncState('error') happens inside showLoadError.
      this.showLoadError(e);
    }
  },

  subscribeRealtime: function() {
    if (!this.sb) return;
    var self = this;
    // 2026-05-08: Áður triggaði HVAÐA breyting sem var (insert/update/delete
    // á hvaða töflu sem er) full `loadAll()` sem sækir 5 töflur og endurraðar
    // 3 view. Á 400+ fyrirtækjum + 3000 tækjum + autosave á hverja innslátt
    // verður þetta sjálfsgrafandi: hver innsláttur kveikir á 5 fyrirspurnum
    // og 3 view-renderum sem aftur trigga ný observer-fíringar á öðrum
    // tækjum sem allir notendur eru að nota samtímis.
    //
    // Núna er debounced (3 sek) og BARA aktíverað ef breytingin er á töflu
    // sem aktíva view-ið þarf. Annars uppfærum við bara cache fyrir
    // tilteknu töfluna í staðinn fyrir loadAll.
    var _debounce = null;
    var _pendingTables = new Set();
    function applyChange() {
      _debounce = null;
      var tables = Array.from(_pendingTables);
      _pendingTables.clear();
      // Look up which view is currently active and decide if we need a full
      // reload. The cheap path: just refresh the affected table.
      var activeView = (window.App && App.view) || (document.querySelector('.view.active') || {}).id || '';
      var activeId = String(activeView).replace(/^view-/, '');
      // Workshop / Counter / Field views read jobs+units → need verkbeidnir/verklidur
      // Companies view reads units → need uttaeki
      // Most other views are independent of these tables
      var viewsNeedingJobs = ['workshop', 'counter', 'sala', 'field', 'dashboard', 'home'];
      var viewsNeedingUnits = ['companies', 'field', 'lanstaeki', 'workshop', 'home', 'dashboard'];
      var needsJobs = tables.some(function(t){return t==='verkbeidnir'||t==='verklidur';}) && viewsNeedingJobs.indexOf(activeId) >= 0;
      // 2026-06-11: when a company DETAIL is open, its own edit handlers
      // already update DB.cache + re-render in place. Running a full loadAll()
      // (all ~5k units across 5 tables) + App.refreshAll() on every uttaeki
      // write just re-fetches everything and re-decorates the whole profile —
      // that was the "company profile reloads / loads popping up and changing"
      // slowness. Skip the heavy reload while a detail is open.
      var _coMain = document.getElementById('companies-main');
      var _coDetailOpen = !!(_coMain && _coMain.querySelector('button[onclick*="Companies.openEdit"], button[onclick*="Companies.render"]'));
      var needsUnits = tables.indexOf('uttaeki') >= 0 && viewsNeedingUnits.indexOf(activeId) >= 0
        && !(activeId === 'companies' && _coDetailOpen);
      if (needsJobs || needsUnits) {
        self.loadAll();
      }
      // For companies/vidskiptavinir table changes, just nudge the
      // module-level reloaders if available — much cheaper than loadAll.
      if (tables.indexOf('fyrirtaeki') >= 0 && window.Companies && typeof Companies.load === 'function') {
        try { Companies.load(); } catch(e){}
      }
      if (tables.indexOf('vidskiptavinir') >= 0 && window.Vidskiptavinir && typeof Vidskiptavinir.load === 'function') {
        try { Vidskiptavinir.load(); } catch(e){}
      }
      // 2026-09-01 (Agnar: "erum að vinna í nokkrum tölvum og stundum henda
      // okkar á milli"). Þjónustuborðið hafði ENGA lifandi samstillingu —
      // hvorki hér né í patch 231 (engin .channel/subscribe/setInterval þar).
      // Það hlóðst aðeins við opnun, svo mál sem samstarfsmaður bjó til sást
      // aldrei fyrr en endurhlaðið var. Aðeins endurhlaðið þegar borðið er
      // RAUNVERULEGA opið — annars er þetta ókeypis; sama regla og gildir um
      // jobs/units hér að ofan.
      if (tables.indexOf('thjonustubeidni') >= 0
          && window.Verkbord && typeof Verkbord.reload === 'function') {
        var _vbOpen = document.getElementById('view-verkbord');
        _vbOpen = _vbOpen && _vbOpen.classList.contains('active');
        if (_vbOpen) { try { Verkbord.reload(); } catch(e){} }
      }
      // Other tables (solur, app_settings, etc.) — let observers/views
      // refetch lazily when they become active.
    }
    // 2026-08-01 (ósk Agnars): ÁÐUR var þetta EIN ósíuð áskrift á ALLT
    // `schema:'public'` — sami Supabase-grunnur og Brunahólf notar, svo ÞESSI
    // vafraflipi fékk líka hverja einustu breytingu í Brunahólfs-töflunum
    // (email_digest, ajour_registrations, automation_runs, redder_invoices …)
    // þó kóðinn hér fyrir neðan hunsi þær hvort eð er. Skorðum áskriftina við
    // AÐEINS þær töflur sem applyChange() bregst raunverulega við — minnkar
    // umferðina verulega og gerir tenginguna síður viðkvæma fyrir álagi sem á
    // ekkert skylt við þetta app.
    var RT_TABLES = ['uttaeki', 'verkbeidnir', 'verklidur', 'fyrirtaeki', 'vidskiptavinir', 'thjonustubeidni'];
    var ch = this.sb.channel('changes');
    RT_TABLES.forEach(function (tbl) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: tbl }, function (payload) {
        var t = payload && payload.table;
        if (t) _pendingTables.add(t);
        if (_debounce) clearTimeout(_debounce);
        // 2026-06-11: 3s → 5s so a burst of edits (e.g. flipping several tæki
        // statuses) coalesces into one refresh instead of several.
        _debounce = setTimeout(applyChange, 5000);
      });
    });
    ch.subscribe(function (status) { console.log('[db-rt] channel status:', status); });
  },

  // ---- JOBS ----
  getJobs: function() { return this.cache.jobs; },
  getJob: function(id) { return this.cache.jobs.find(function(j) { return j.id === id; }); },
  getActiveJobs: function() { return this.cache.jobs.filter(function(j) { return j.status !== 'collected' && j.status !== 'eytt'; }); },
  getReadyJobs: function() { return this.cache.jobs.filter(function(j) { return j.status === 'ready'; }); },
  getWorkshopJobs: function() { return this.cache.jobs.filter(function(j) { return j.status === 'received' || j.status === 'inprogress'; }); },

  createJob: async function(data) {
    if (!this.online) { Toast.show('Engin nettenging — verk vistað staðbundið'); return this.createJobLocal(data); }
    this.setSyncState('syncing');
    var jobRes = await this.sb.from('verkbeidnir').insert({
      num: data.num, status: 'received',
      customer: data.customer, phone: data.phone,
      dropoff: data.dropoff, pickup: data.pickup, notes: data.notes,
      verd: data.verd ? parseFloat(data.verd) : 0
    }).select().single();
    if (jobRes.error) { Toast.show('Villa: ' + jobRes.error.message); return null; }
    var jobId = jobRes.data.id;
    var unitInserts = data.units.map(function(u, i) {
      return { job_id: jobId, serial: data.num.replace('#','SÆ-').replace('-','-') + String.fromCharCode(65+i), type: u.type, size: u.size, service: u.service, status: 'received' };
    });
    await this.sb.from('verklidur').insert(unitInserts);
    await this.loadAll();
    return this.getJob(jobId);
  },

  createJobLocal: function(data) {
    var id = Date.now();
    var job = { id, num: data.num, status: 'received', customer: data.customer, phone: data.phone, dropoff: data.dropoff, pickup: data.pickup, notes: data.notes, verd: data.verd ? parseFloat(data.verd) : 0,
      units: data.units.map(function(u, i) { return { id: Date.now()+i, job_id: id, serial: data.num.replace('#','SÆ-') + String.fromCharCode(65+i), type: u.type, size: u.size, service: u.service, status: 'received' }; }) };
    this.cache.jobs.unshift(job);
    return job;
  },

  updateJobStatus: async function(id, status) {
    if (this.online) { await this.sb.from('verkbeidnir').update({status}).eq('id', id); }
    var job = this.getJob(id);
    if (job) {
      job.status = status;
      // 2026-05-24: When promoting a job to 'ready', cascade any unfinished
      // units to 'done' so the workshop column shows full progress. Broken
      // units MUST be preserved — the pickup flow keys off `status==='broken'`
      // to default-uncheck them in the Sókn modal. Previously this loop
      // overwrote broken→done, silently re-delivering bad units.
      if (status === 'ready') job.units.forEach(function(u) { if (u.status !== 'broken' && u.status !== 'eytt') u.status = 'done'; });
    }
    App.refreshAll();
  },

  updateUnitStatus: async function(jobId, unitId, status) {
    if (this.online) { await this.sb.from('verklidur').update({status}).eq('id', unitId); }
    var job = this.getJob(jobId);
    if (job) {
      var unit = job.units.find(function(u) { return u.id === unitId; });
      if (unit) unit.status = status;
      // 2026-05-24: Auto-promote the whole verkbeidni to 'ready' (= moves
      // to Afgreiðsla column) as soon as the last outstanding unit gets a
      // 'done' or 'broken' click. Before this, the user had to click
      // Tilbúið twice — once on the tile, once on the job card. Broken
      // units count as "accounted for"; pickup flow handles non-delivery.
      var allAccountedFor = (status === 'done' || status === 'broken')
        && job.units.every(function(u) { return u.status === 'done' || u.status === 'broken' || u.status === 'eytt'; });
      if (allAccountedFor && job.status !== 'ready') {
        await this.updateJobStatus(jobId, 'ready');
        return;
      }
      if (job.status === 'received') { await this.updateJobStatus(jobId, 'inprogress'); return; }
    }
    App.refreshAll();
  },

  // ---- FIELD UNITS ----
  getUnits: function() { return this.cache.units; },
  getUnit: function(id) { return this.cache.units.find(function(u) { return u.id === id; }); },
  findBySerial: function(s) { return this.cache.units.find(function(u) { return u.serial.toLowerCase() === s.toLowerCase().trim(); }); },
  getOverdue: function() { var today=new Date().toISOString().substring(0,10); return this.cache.units.filter(function(u){ return u.status==='active' && u.next_insp && u.next_insp < today; }); },
  getDue: function() { var today=new Date().toISOString().substring(0,10); var d=new Date(); d.setDate(d.getDate()+30); var in30=d.toISOString().substring(0,10); return this.cache.units.filter(function(u){ return u.status==='active' && u.next_insp && u.next_insp >= today && u.next_insp <= in30; }); },

  addUnit: async function(data) {
    var today = new Date().toISOString().slice(0,10);
    var nextYear = (parseInt(today.slice(0,4))+1) + today.slice(4);
    var serial = 'SÆ-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random()*9000)+1000);
    // 2026-08-30 (regla 0 + verk 3):
    //   • status var HARÐKÓÐAÐ 'ok'. Allt annað í kerfinu notar 'active' (4.802
    //     raðir) og hver einasta talning síar á það — 74 tæki á 8 fyrirtækjum
    //     urðu því ósýnileg. Kirkjuvellir #708 misstu 4 duft-tæki þannig og
    //     bæði Agnar og Claude skráðu þau aftur: reikningur upp á 152.880 í
    //     stað 121.713.
    //   • Hvorki fyrirtaeki_id né customer_base_id fylgdi með — aðeins
    //     nafnastrengur. Listinn síar á id og sá þau ekki; reikningurinn telur
    //     á nafni og taldi þau. Notandinn sér 1 og borgar fyrir 2.
    var _fid = (data.fyrirtaeki_id != null && data.fyrirtaeki_id !== '') ? Number(data.fyrirtaeki_id) : null;
    var _bid = (data.customer_base_id != null && data.customer_base_id !== '') ? Number(data.customer_base_id) : null;
    // Base-id-ið er sótt af fyrirtækinu ef það fylgdi ekki — ein uppfletting,
    // engin ágiskun.
    if (_fid != null && _bid == null) {
      try {
        var _c = (window.Companies && Companies.list || []).find(function (x) { return +x.id === _fid; });
        if (_c && _c.customer_base_id != null) _bid = Number(_c.customer_base_id);
      } catch (_) {}
    }
    var row = { serial, type: data.type, size: data.size, client: data.client, location: data.location, last_insp: data.inst||today, next_insp: data.next||nextYear, status: 'active', pressure: 14 };
    if (_fid != null) row.fyrirtaeki_id = _fid;
    if (_bid != null) row.customer_base_id = _bid;
    if (this.online) {
      var res = await this.sb.from('uttaeki').insert(row).select().single();
      if (!res.error) this.cache.units.push(res.data);
      return res.data || { ...row, id: Date.now() };
    } else {
      var u = { ...row, id: Date.now() };
      this.cache.units.push(u);
      return u;
    }
  },

  addInspection: async function(unitId, data) {
    var today = new Date().toISOString().slice(0,10);
    var nextYear = (parseInt(today.slice(0,4))+1) + today.slice(4);
    var unit = this.getUnit(unitId);
    if (!unit) return;
    var newStatus = data.result === 'pass' ? 'ok' : 'overdue';
    unit.last_insp = today; unit.next_insp = nextYear; unit.status = newStatus; unit.pressure = parseInt(data.pressure)||unit.pressure;
    if (this.online) {
      await this.sb.from('uttaeki').update({ last_insp: today, next_insp: nextYear, status: newStatus, pressure: unit.pressure }).eq('id', unitId);
      await this.sb.from('skodunar_saga').insert({ unit_id: unitId, date: today, tech: 'Jón S.', result: data.result, pressure: unit.pressure, weight: data.weight, notes: data.notes });
    }
    this.cache.history.unshift({ id: Date.now(), date: today, client: unit.client, tech: 'Jón S.', result: data.result, notes: data.notes });
    App.refreshAll();
  },

  // ---- DEMO DATA (when no Supabase) ----
  loadDemoData: function() {
    this.cache.jobs = [
      { id:1, num:'#2025-041', status:'inprogress', customer:'Jón Sigurðsson', phone:'+354 691 2345', dropoff:'2025-04-17', pickup:'2025-04-18', notes:'Kanna þykkt á gömlum tækjum',
        units:[ {id:11,job_id:1,serial:'SÆ-2025-0041A',type:'ABC Duft',size:'6 kg',service:'Hlaðning',status:'done'}, {id:12,job_id:1,serial:'SÆ-2025-0041B',type:'CO₂',size:'5 kg',service:'Hlaðning + Skoðun',status:'received'}, {id:13,job_id:1,serial:'SÆ-2025-0041C',type:'ABC Duft',size:'9 kg',service:'Hlaðning',status:'received'} ]},
      { id:2, num:'#2025-040', status:'ready', customer:'Bryndís Halldórsdóttir', phone:'+354 862 7890', dropoff:'2025-04-16', pickup:'2025-04-17', notes:'',
        units:[ {id:14,job_id:2,serial:'SÆ-2025-0040A',type:'Froðu',size:'9 L',service:'Skoðun',status:'done'} ]},
      { id:3, num:'#2025-039', status:'received', customer:'Sigríður Björnsdóttir', phone:'+354 776 5432', dropoff:'2025-04-17', pickup:'2025-04-18', notes:'Viðgerð á handfangi',
        units:[ {id:15,job_id:3,serial:'SÆ-2025-0039A',type:'Froðu',size:'9 L',service:'Viðgerð',status:'received'}, {id:16,job_id:3,serial:'SÆ-2025-0039B',type:'ABC Duft',size:'6 kg',service:'Skoðun',status:'received'} ]}
    ];
    this.cache.units = [
      {id:101,serial:'SÆ-2023-0044',type:'CO₂',size:'5 kg',client:'Harpa',location:'Aðalsal',last_insp:'2024-11-10',next_insp:'2025-11-10',status:'ok',pressure:14},
      {id:102,serial:'SÆ-2022-0019',type:'ABC Duft',size:'6 kg',client:'Keflavíkurflugvöllur',location:'Hlið B',last_insp:'2024-01-15',next_insp:'2025-01-15',status:'overdue',pressure:11},
      {id:103,serial:'SÆ-2024-0012',type:'Vatn',size:'9 L',client:'Ísafjörður Hótel',location:'Eldhús',last_insp:'2024-12-01',next_insp:'2025-06-01',status:'due',pressure:13}
    ];
    this.cache.schedule = [
      {id:1,date:'2025-04-18',time:'13:00',client:'Keflavíkurflugvöllur',units:24,tech:'Anna Björnsdóttir'},
      {id:2,date:'2025-04-22',time:'10:00',client:'Ráðhús Reykjavíkur',units:12,tech:'Karl Magnússon'}
    ];
    this.cache.history = [
      {id:1,date:'2025-03-15',client:'Harpa',tech:'Jón S.',result:'pass',notes:'Öll tæki í lagi'},
      {id:2,date:'2025-02-20',client:'Keflavíkurflugvöllur',tech:'Anna B.',result:'pass',notes:'2 tæki skipt út'}
    ];
    App.refreshAll();
  }
};
