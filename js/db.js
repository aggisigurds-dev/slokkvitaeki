'use strict';
var DB = {
  sb: null,
  online: false,
  cache: { jobs: [], units: [], schedule: [], history: [] },

  init: function() {
    if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL.includes('LÍMDU')) {
      document.getElementById('setup-banner').classList.remove('hidden');
      document.getElementById('sync-dot').className = 'sync-dot error';
      this.loadDemoData();
      return;
    }
    try {
      this.sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      document.getElementById('sync-dot').className = 'sync-dot syncing';
      this.loadAll();
      this.subscribeRealtime();
    } catch(e) {
      console.error('Supabase villa:', e);
      this.loadDemoData();
    }
  },

  setSyncState: function(state) {
    document.getElementById('sync-dot').className = 'sync-dot ' + state;
  },

  loadAll: async function() {
    this.setSyncState('syncing');
    try {
      var [j, v, u, s, h] = await Promise.all([
        this.sb.from('verkbeidnir').select('*').order('created_at', {ascending:false}),
        this.sb.from('verklidur').select('*'),
        this.sb.from('uttaeki').select('*').order('client'),
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
      this.setSyncState('online');
      this.online = true;
      App.refreshAll();
    } catch(e) {
      console.error('Load villa:', e);
      this.setSyncState('error');
      this.loadDemoData();
    }
  },

  subscribeRealtime: function() {
    if (!this.sb) return;
    var self = this;
    this.sb.channel('changes').on('postgres_changes', {event:'*', schema:'public'}, function() {
      self.loadAll();
    }).subscribe();
  },

  // ---- JOBS ----
  getJobs: function() { return this.cache.jobs; },
  getJob: function(id) { return this.cache.jobs.find(function(j) { return j.id === id; }); },
  getActiveJobs: function() { return this.cache.jobs.filter(function(j) { return j.status !== 'collected'; }); },
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
    if (job) { job.status = status; if (status === 'ready') job.units.forEach(function(u) { u.status = 'done'; }); }
    App.refreshAll();
  },

  updateUnitStatus: async function(jobId, unitId, status) {
    if (this.online) { await this.sb.from('verklidur').update({status}).eq('id', unitId); }
    var job = this.getJob(jobId);
    if (job) {
      var unit = job.units.find(function(u) { return u.id === unitId; });
      if (unit) unit.status = status;
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
    var row = { serial, type: data.type, size: data.size, client: data.client, location: data.location, last_insp: data.inst||today, next_insp: data.next||nextYear, status: 'ok', pressure: 14 };
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
