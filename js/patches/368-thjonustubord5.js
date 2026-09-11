/* === ÞJÓNUSTUBORÐ 5 — Master borð, mitt borð, hamir, einingar og flýtileiðir (368) ============
 *
 * Agnar 10.09.2026: „þjónustuborðið er ekki alveg að virka núna, og margt þar sem þarf ekki að vera
 * … væri gott að hafa það smá skipt svo sé ekki jafn yfirþyrmandi, að hver starfsmaður geti haft sitt
 * ennþá og síðan Master borð, að við getum pickað af því smá saman og haft bara fá atriði á okkar
 * borði" · „jafnvel skipta um mode … skýrslumode … kröfumode … akstursskipulags mode … samskiptamode"
 * · Boss-útlitið. Tillagan (artifact „Þjónustuborð Boss v5") samþykkt. Lógóið er ekki endurtekið
 * hér — haus appsins ber það þegar.
 * Síðar sama kvöld: vinnuskjáirnir eru bogadregnir og um þrefalt breiðari en 1920 px, með tugi flipa
 * opna („Keldan, Drive, Brunahólf, Turbopaint, Payday, kröfuyfirlit, Tímavera …") — „kveikja á
 * hliðar viðbótum … festa linka eins og favorite bar í chrome" · „mode yrði alveg snilld í það,
 * með mismunandi opnur" · „gatt-admin og kanski link á þjónustugáttina líka".
 *
 * KVEIKT 11.09.2026 („þá mátt kveikja á þjónustuborð 2"): hnappurinn „🔧 Þjónustuborð" (231 injectNav,
 * data-view 'verkbord') opnar #bord og Verkefnalista-appið byrjar hér (261). Gamla borðið (231) er
 * áfram á #verkbord og verður fjarlægt þegar Agnar segir til („eyða hinu þegar við erum búin").
 *
 * EINANGRAÐ (Shadow DOM): Brunastál-þemað þvingar `.view .btn` í hvítt á svörtu og `.view h1/h2/h3`
 *   í næstum svart með !important (mælt 10.09.2026) — gullhnappurinn varð svartur og titill valins
 *   máls hefði orðið svartur á svörtu. Borðið býr því í eigin skuggarót: stílar appsins ná ekki inn,
 *   stílar borðsins leka ekki út, og observerar annarra patcha sjá ekki hnappana. Atburðir eru
 *   hlustaðir á rótinni (click/change/keydown), ekki á document.
 *
 * BREIDD (gámafyrirspurnir, ekki skjástærð — borðið lagar sig að plássinu sem það fær):
 *   ≤ 760 px    sími: einn dálkur, Master/Mitt borð sem flipar, valið mál opnast undir línunni.
 *   761–1599    einn dálkur af einingum, borðið í tveimur dálkum.
 *   ≥ 1600      einingar hamsins í dálki vinstra megin, aðrar einingar hægra megin, borðið í miðju.
 *   miðja ≥1500 Master · Mitt borð · Valið mál hlið við hlið (bogaskjárinn).
 *   Hver hamur er sín „opna": einingar hamsins (MODES.first) fara vinstra megin og opnar.
 *
 * HVAÐ ER Á MASTER (mælt 10.09.2026): 82 opin mál — 77 á Charlize, 3 án starfsmanns, 2 á Bjarndísi.
 *   231 setur óúthlutuð mál eldri en 30 daga sjálfkrafa á AI_WORKER = 'Charlize' (claimOldJobs).
 *   Charlize er því bunki, ekki manneskja: Master = opið, ekki í geymslu, og enginn starfsmaður EÐA
 *   Charlize. Mitt borð = assigned_to er sá sem situr við tölvuna (BordStarfsmadur, 350).
 *
 * SKRIF — beint á thjonustubeidni, lesið til baka með .select():
 *   Taka    assigned_to = ég, AÐEINS ef málið er enn laust (skilyrt) — tveir fá ekki sama málið.
 *   Skila   assigned_to = null (231 setur það aftur á Charlize ef það er eldra en 30 daga).
 *   Lokið   status = 'lokad'.     Svarað  svarad_at + status i_vinnslu, eins og 231 gerir.
 *   Nýtt    sömu reitir og hraðlína 231 (quickAdd).
 *
 * LESIÐ OG VISTAÐ ANNARS STAÐAR (engin ný tafla):
 *   Vinnuborð hvers og eins  AppSettings thjonustubord5.by_staff.<nafn> = { mode, mods, links }
 *                            mode/mods sem smá-plástrar; links byggt á NÝJASTA lista við vistun
 *   Dagskrá                  vikudagskra.by_staff.<nafn>.jobs (303); skráð og breytt í glugga 303
 *   Skipulagsborð            skipulagsbord.by_staff.<nafn>.cards (305)
 *   Vinnublöð                sara_yfirferd.stada (364)
 *   Kröfur                   solur reikningur, ógreitt, ekki void (sama og listinn í 166)
 *   Póstur í völdu máli      email_digest eftir channel_ref 'email:<id>' (sama og 231; sýnin
 *                            v_samskipti_postur sleppir 8 af 18 opnum póstmálum)
 * ============================================================================================== */
(() => {
  if (window.__thjonustubord368) return;
  window.__thjonustubord368 = true;

  const VIEW_ID = 'view-bord', NAV_KEY = 'bord', CFG_KEY = 'thjonustubord5';
  const LIMIT = 5, PAGE = 15, POLL_MS = 60000;
  const AI_WORKER = 'Charlize';                                        // sama nafn og í 231
  const SENTINELS = { '': 1, Allir: 1, allir: 1, nema_agnar: 1, nema_ai: 1 };
  const LAUS_SIA = 'assigned_to.is.null,assigned_to.in.("",Allir,allir,nema_agnar,nema_ai,' + AI_WORKER + ')';

  const sb = () => (window.DB && DB.sb) || null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MAN = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  const VIKUDAGUR = ['sunnudagur', 'mánudagur', 'þriðjudagur', 'miðvikudagur', 'fimmtudagur', 'föstudagur', 'laugardagur'];
  const DAG = ['SUN', 'MÁN', 'ÞRI', 'MIÐ', 'FIM', 'FÖS', 'LAU'];
  // Tegundir á dagskrá (303, eftir NAFNI) og á skipulagsborði (305, eftir SÆTI) eru ekki sami listinn,
  // svo hvor er lesinn eftir sinni heimild, með sínum litum.
  const VD_TEG = [['Árskoðun', '#1d4ed8'], ['Brunakerfiskoðun', '#c3271c'], ['Fund', '#7c3aed'], ['Uppsetning', '#d97706'], ['Annað', '#16a34a']];
  const SB_TEG = [['Árskoðun', '#c3271c'], ['Hleðsla', '#b8770e'], ['Uppsetning', '#2c6e9e'], ['Verkstæði', '#5b6470'], ['Annað', '#8a8f98']];
  const vdLitur = t => (VD_TEG.find(x => x[0] === t) || [0, '#8f8776'])[1];
  const MAL_TEG = { tilbod: 'Tilboð', email: 'Póstur', skyrsla: 'Skýrsla', heimsokn: 'Heimsókn', hringja: 'Hringja', samningur: 'Samningur', skjalabeidni: 'Skjöl', verkdagbok: 'Verkdagbók', annad: 'Annað', skodun_tilbod: 'Skoðun & tilboð', nyr_samningur: 'Nýr samningur', uttekt_eftirfylgni: 'Úttekt / eftirfylgni' };
  // Síður í kerfinu sem hægt er að festa með einum smelli. Gáttirnar eru sér síður á sama vef.
  const TILLOGUR = [
    ['Gátt-admin', '/gatt-admin/'], ['Þjónustugáttin', '/gatt/'],
    ['Kröfu yfirlit', '#krofu-yfirlit'], ['Pósthólf', '#thjonustuver-postar'], ['Reikninga-póstur', '#reikninga-postur'],
    ['Aksturslisti', '#aksturslisti'], ['Gamla borðið', '#verkbord']
  ];

  const MODS = {
    dagskra:   { n: '01', t: 'Dagskrá', d: 'Vikan í einni sýn. Plús skráir verk á daginn.' },
    skipulag:  { n: '05', t: 'Skipulagsborð', d: 'Spjöldin þín af skipulagsborðinu.' },
    vinnublod: { n: '06', t: 'Vinnublöð', d: 'Bíða yfirferðar og samþykkt.' },
    postsvor:  { n: '07', t: 'Póstsvörun', d: 'Póstmál sem bíða svars.' },
    akstur:    { n: '08', t: 'Akstursskipulag', d: 'Aksturslisti og vakt.' },
    krofur:    { n: '09', t: 'Kröfur', d: 'Útistandandi kröfur í Kröfu yfirliti.' }
  };
  const BOTTOM = ['skipulag', 'vinnublod', 'postsvor', 'akstur', 'krofur'];
  const MODES = {
    thjonusta: { l: 'Þjónusta', board: true, first: [], filter: 'allt' },
    samskipti: { l: 'Samskipti', board: true, first: ['postsvor'], filter: 'post' },
    skyrslur:  { l: 'Skýrslur', board: false, first: ['vinnublod', 'skipulag'] },
    krofur:    { l: 'Kröfur', board: false, first: ['krofur'] },
    akstur:    { l: 'Akstur', board: false, first: ['akstur', 'dagskra'] }
  };
  // [kveikt, sjálfgefið opið] — flest samanbrotið. Forstillt eftir starfsmanni; hver og einn breytir í ⚙.
  const SJALFGEFID = { dagskra: [1, 0], skipulag: [0, 0], vinnublod: [0, 0], postsvor: [0, 0], akstur: [0, 0], krofur: [0, 0] };
  const FYRIR = {
    'Agnar': { skipulag: [1, 1], vinnublod: [1, 0], krofur: [1, 0] },
    'Bjarndís': { vinnublod: [1, 1], postsvor: [1, 0] },
    'Afgreiðsla': { dagskra: [1, 1], akstur: [1, 0] }
  };

  const S = {
    rows: [], names: {}, loaded: false, loading: false, err: '', loadedAt: null,
    view: 'master', filter: 'allt', synd: PAGE, sel: {}, cfgOpen: false, open: {}, post: {},
    counts: { sara: null, krofur: null }, composer: false, busy: {}, linkForm: false, linkEdit: false
  };

  /* ── starfsmaður ── */
  const nu = () => { try { return (window.BordStarfsmadur && BordStarfsmadur.get()) || 'Agnar'; } catch (_) { return 'Agnar'; } };
  const folk = () => {
    let l = [];
    try { l = (window.BordStarfsmadur && BordStarfsmadur.list()) || []; } catch (_) {}
    if (!l.length) l = ['Agnar', 'Afgreiðsla', 'Bjarndís', 'Anni', 'Elías'];
    return l.filter((x, i) => x && x !== AI_WORKER && l.indexOf(x) === i);
  };
  const canonW = v => { const s = String(v == null ? '' : v).trim(); return s === 'Sara' ? 'Bjarndís' : s; };
  const normW = v => { const s = canonW(v); return SENTINELS[s] ? '' : s; };
  const lagt = s => String(s || '').toLocaleLowerCase('is');
  const isFree = r => { const w = normW(r.assigned_to); return !w || w === AI_WORKER; };
  const onBoardOf = (r, n) => { const w = normW(r.assigned_to); return !!w && w !== AI_WORKER && lagt(w) === lagt(n); };

  /* ── stillingar: vinnuborð hvers og eins (samstillt milli véla) ── */
  const P = k => { try { return (window.AppSettings && AppSettings.path) ? AppSettings.path(k) : null; } catch (_) { return null; } };
  const stillingarTilbunar = () => !!(window.AppSettings && AppSettings.path && AppSettings.save && (!AppSettings.isLoaded || AppSettings.isLoaded()));
  const _cfg = {};
  let _vistar = 0;
  function readCfg(n) {
    const v = P(CFG_KEY + '.by_staff.' + n);
    const base = Object.assign({}, SJALFGEFID, FYRIR[n] || {});
    const mods = {};
    Object.keys(SJALFGEFID).forEach(k => {
      const x = v && v.mods && Array.isArray(v.mods[k]) ? v.mods[k] : base[k];
      mods[k] = [x[0] ? 1 : 0, x[1] ? 1 : 0];
    });
    return { mode: v && MODES[v.mode] ? v.mode : 'thjonusta', mods };
  }
  function cfg() {
    const n = nu();
    if (_cfg[n]) return _cfg[n];
    const c = readCfg(n);
    if (stillingarTilbunar()) _cfg[n] = c;        // sjálfgefin gildi festast ekki á meðan stillingar hlaðast
    return c;
  }
  // Smá-plástur (bara það sem breyttist) — deepMerge í 85 sameinar hlutina, svo ein breyting
  // étur aldrei aðra sem var vistuð á annarri vél.
  async function vistaCfg(hluti, skilabod) {
    const n = nu();
    _vistar++;
    let ok = false;
    try { ok = !!(await AppSettings.save({ [CFG_KEY]: { by_staff: { [n]: hluti } } })); } catch (_) {}
    _vistar--;
    if (!ok) { delete _cfg[n]; toast('Stillingin vistaðist ekki. Reyndu aftur.', true); render(); }
    else if (skilabod) toast(skilabod);
  }
  const isOn = k => !!cfg().mods[k][0];
  const inMode = k => MODES[cfg().mode].first.indexOf(k) >= 0;
  const openKey = k => nu() + ':' + (inMode(k) ? cfg().mode + ':' : '') + k;
  function isOpen(k) {
    const key = openKey(k);
    if (!(key in S.open)) S.open[key] = inMode(k) ? true : !!cfg().mods[k][1];
    return S.open[key];
  }

  /* ── flýtileiðir: festir tenglar hvers og eins, eins og bókamerkjastika ── */
  const linksFor = n => { const l = P(CFG_KEY + '.by_staff.' + n + '.links'); return Array.isArray(l) ? l.filter(x => x && x.id && x.nafn && x.slod) : []; };
  // Aðeins síður í appinu (#…), síður á sama vef (/…) og http(s). „keldan.is" fær https:// framan við.
  function lagaSlod(s) {
    s = String(s || '').trim();
    if (/^#[a-z0-9-]+$/i.test(s)) return s;
    if (/^\/(?!\/)\S*$/.test(s)) return s;
    if (/^https?:\/\/\S+$/i.test(s)) return s;
    if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/i.test(s)) return 'https://' + s;
    return '';
  }
  // Listinn er fylki og fylki eru skrifuð heil — því er breytingin reiknuð á NÝJASTA lista
  // stillinganna við vistun, ekki á það sem var teiknað (sama lærdómur og í 303).
  async function vistaLinks(breyta, skilabod) {
    if (!stillingarTilbunar()) { toast('Stillingarnar eru enn að hlaðast — reyndu aftur eftir augnablik.', true); return false; }
    const n = nu();
    const nyr = breyta(linksFor(n).slice());
    _vistar++;
    let ok = false;
    try { ok = !!(await AppSettings.save({ [CFG_KEY]: { by_staff: { [n]: { links: nyr } } } })); } catch (_) {}
    _vistar--;
    if (!ok) toast('Flýtileiðin vistaðist ekki. Reyndu aftur.', true);
    else if (skilabod) toast(skilabod);
    render();
    return ok;
  }

  /* ── gögn ── */
  const SEL = 'id,title,notes,summary,status,type,important,due_at,created_at,updated_at,source,channel_ref,assigned_to,customer_base_id,fyrirtaeki_id,customer_nafn,svarad_at';
  let _sig = '', _aftur = false, _dbBid = 0, _dbT = 0;
  // Könnunin á 60 s fresti teiknar AÐEINS ef eitthvað breyttist — annars myndi hún rugla skrun
  // í pósti sem verið er að lesa. Sóttímanum er skipt út beint.
  async function load(hljott) {
    const c = sb();
    if (!c) {
      // DB.sb verður til eftir á við ræsingu (mælt: „Engin tenging" stóð á skjánum þar til næsta
      // könnun). Beðið í allt að 15 s áður en villa er sýnd.
      if (++_dbBid <= 50) {
        if (_dbBid === 1 && !hljott) render();
        clearTimeout(_dbT);
        _dbT = setTimeout(() => load(hljott), 300);
        return;
      }
      _dbBid = 0;
      S.err = 'Engin tenging við gagnagrunn';
      render();
      return;
    }
    _dbBid = 0;
    if (S.loading) { _aftur = true; return; }
    S.loading = true;
    if (!hljott) render();
    let breytt = !hljott;
    try {
      const [r, rs, rk] = await Promise.all([
        c.from('thjonustubeidni').select(SEL).is('deleted_at', null).is('archived_at', null)
          .or('status.is.null,status.neq.lokad').order('created_at', { ascending: false }).limit(800),
        c.from('sara_yfirferd').select('stada'),
        c.from('solur').select('id', { count: 'exact', head: true }).eq('greitt_med', 'reikningur').is('paid_at', null).neq('status', 'void')
      ]);
      if (r.error) throw r.error;
      const rows = r.data || [];
      const sara = rs.error ? null : (rs.data || []).reduce((m, x) => { m[x.stada] = (m[x.stada] || 0) + 1; return m; }, {});
      const krofur = rk.error ? null : rk.count;
      const ids = [...new Set(rows.filter(x => !x.customer_nafn && x.customer_base_id).map(x => x.customer_base_id))].filter(id => !(id in S.names));
      for (let i = 0; i < ids.length; i += 150) {
        const rb = await c.from('customers_base').select('id,nafn').in('id', ids.slice(i, i + 150));
        (rb.data || []).forEach(b => { S.names[b.id] = b.nafn; });
        breytt = true;
      }
      const sig = JSON.stringify([rows.map(x => [x.id, x.assigned_to, x.status, x.updated_at, x.svarad_at, x.important, x.title, x.summary]), sara, krofur]);
      if (sig !== _sig || S.err || !S.loaded) breytt = true;
      _sig = sig;
      S.rows = rows;
      S.counts.sara = sara;
      S.counts.krofur = krofur;
      S.err = '';
      S.loaded = true;
    } catch (e) {
      const msg = (e && e.message) || String(e);
      if (S.err !== msg) breytt = true;
      S.err = msg;
      console.warn('[368-thjonustubord5] load', e);
    }
    S.loadedAt = new Date();
    S.loading = false;
    if (breytt) render(); else stimpla();
    if (_aftur) { _aftur = false; load(true); }
  }
  function stimpla() {
    const v = document.getElementById(VIEW_ID);
    const el = v && v.shadowRoot && v.shadowRoot.querySelector('.t5-sott');
    if (el && S.loadedAt) el.textContent = ' · sótt kl. ' + klukka(S.loadedAt);
  }

  const tStamp = s => { const t = Date.parse(s); return isNaN(t) ? 0 : t; };
  const isPost = r => r.source === 'email' || /^email:/.test(String(r.channel_ref || ''));
  const postId = r => { const m = /^email:(\d+)/.exec(String(r.channel_ref || '')); return m ? +m[1] : null; };
  const postOf = r => { const id = postId(r); return id == null ? false : S.post[id]; };
  const rodun = (a, b) => (b.important ? 1 : 0) - (a.important ? 1 : 0)
    || (a.due_at ? tStamp(a.due_at) : Infinity) - (b.due_at ? tStamp(b.due_at) : Infinity)
    || tStamp(b.created_at) - tStamp(a.created_at);
  const masterRows = () => S.rows.filter(isFree).sort(rodun);
  const mineRows = () => S.rows.filter(r => onBoardOf(r, nu())).sort(rodun);
  const ageDays = r => { const t = tStamp(r.created_at); return t ? Math.max(0, Math.floor((Date.now() - t) / 864e5)) : 0; };
  const ageCls = a => (a >= 14 ? 'hot' : a <= 2 ? 'warm' : '');
  const whereOf = r => r.customer_nafn || S.names[r.customer_base_id] || '';
  const tegMals = r => isPost(r) ? 'Póstur' : (MAL_TEG[r.type] || (r.type && String(r.type).length < 24 ? String(r.type) : 'Beiðni'));
  function aiLine(r) {
    const s = String(r.summary || '').trim();
    if (s) return s.slice(0, 220);
    return (String(r.notes || '').split('\n').map(x => x.trim()).find(Boolean) || '').slice(0, 220);
  }
  const matchFilter = (r, f) => f === 'allt' || (f === 'hot' ? !!r.important : f === 'post' ? isPost(r) : !isPost(r));

  /* ── skrif (lesið til baka) ── */
  async function patchRow(id, patch, baraEfLaust) {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    let q = c.from('thjonustubeidni').update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq('id', id);
    if (baraEfLaust) q = q.or(LAUS_SIA);
    const r = await q.select('id,assigned_to,status,svarad_at');
    if (r.error) throw r.error;
    return r.data || [];
  }
  async function act(id, fn) {
    if (S.busy[id]) return;
    S.busy[id] = 1;
    render();
    try { await fn(); } catch (e) { toast('Vistaðist ekki: ' + ((e && e.message) || e), true); }
    delete S.busy[id];
    render();
    await load(true);
  }
  function take(id) {
    const n = nu();
    if (folk().indexOf(n) < 0) { toast('Veldu þitt nafn í „Ég er“ fyrst.', true); return; }
    if (mineRows().length >= LIMIT) { toast('Borðið þitt er fullt (' + LIMIT + '). Kláraðu eða skilaðu máli fyrst.', true); S.view = 'mitt'; render(); return; }
    return act(id, async () => {
      const rows = await patchRow(id, { assigned_to: n }, true);
      if (!rows.length) { toast('Einhver annar tók þetta mál rétt í þessu.', true); return; }
      if (normW(rows[0].assigned_to) !== n) throw new Error('las til baka „' + rows[0].assigned_to + '“');
      S.sel[n] = id;
      S.view = 'mitt';
      toast('Komið á borðið þitt');
    });
  }
  const giveBack = id => act(id, async () => {
    const rows = await patchRow(id, { assigned_to: null });
    if (!rows.length || rows[0].assigned_to) throw new Error('málið fannst ekki');
    toast('Skilað á Master');
  });
  const done = id => act(id, async () => {
    const rows = await patchRow(id, { status: 'lokad' });
    if (!rows.length || rows[0].status !== 'lokad') throw new Error('málið fannst ekki');
    toast('Merkt lokið');
  });
  async function createCase(title, cust) {
    const c = sb();
    if (!c) { toast('Engin tenging við gagnagrunn', true); return false; }
    let nafn = cust || null, baseId = null, fid = null;
    if (nafn) {
      try {
        const rf = await c.from('fyrirtaeki').select('id,nafn,customer_base_id').ilike('nafn', nafn.replace(/[%_\\]/g, x => '\\' + x)).is('deleted_at', null).limit(2);
        if (rf.data && rf.data.length === 1) { nafn = rf.data[0].nafn; baseId = rf.data[0].customer_base_id || null; fid = rf.data[0].id; }
      } catch (_) {}
    }
    const nuna = new Date().toISOString();
    const obj = {
      title, notes: '', type: 'annad', status: 'nytt', priority: 'venjulegur',
      customer_nafn: nafn, customer_base_id: baseId, fyrirtaeki_id: fid, assigned_to: null, tags: [],
      source: 'beint', important: false, created_at: nuna, created_by: nu(), updated_at: nuna
    };
    const r = await c.from('thjonustubeidni').insert(obj).select('id').single();
    if (r.error || !r.data) { toast('Málið vistaðist ekki: ' + ((r.error && r.error.message) || 'ekkert svar'), true); return false; }
    toast('Komið á Master borð' + (fid ? ' · tengt ' + nafn : ''));
    await load(true);
    return true;
  }

  /* ── póstur í völdu máli ── */
  async function loadPost(r) {
    const id = postId(r);
    if (id == null || (id in S.post)) return;
    S.post[id] = null;
    try {
      const res = await sb().from('email_digest').select('id,message_id,account,sender_name,sender_email,subject,snippet,body_preview,received_at').eq('id', id).maybeSingle();
      S.post[id] = res.error ? false : (res.data || false);
    } catch (_) { S.post[id] = false; }
    render();
  }
  function reply(id) {
    const r = S.rows.find(x => x.id === id);
    if (!r) return;
    const p = postOf(r);
    if (p === undefined || p === null) { loadPost(r); toast('Sæki póstinn — reyndu aftur eftir augnablik.', true); return; }
    if (!window.ReikningaPostur || !ReikningaPostur.replyTo) { toast('Svar-glugginn (Reikninga-póstur) er ekki hlaðinn.', true); return; }
    if (!p || !p.sender_email) { toast('Ekkert sendandanetfang fannst á þessu máli.', true); return; }
    const m = {
      message_id: p.message_id, account: p.account || '', sender_name: p.sender_name || r.customer_nafn || '', from: p.sender_email,
      subject: p.subject || r.title || '', body_preview: p.body_preview || '', snippet: p.snippet || r.notes || ''
    };
    // 240 kallar á þetta þegar svarið er SENT — sama merking og á gamla borðinu.
    m._onSent = () => act(r.id, async () => {
      const rows = await patchRow(r.id, { svarad_at: new Date().toISOString(), status: r.status === 'nytt' ? 'i_vinnslu' : r.status });
      if (!rows.length || !rows[0].svarad_at) throw new Error('svarið sendist en merkingin vistaðist ekki');
      toast('Svarið sent · merkt svarað');
    });
    try { ReikningaPostur.replyTo(m); } catch (e) { toast('Svar-glugginn opnaðist ekki: ' + ((e && e.message) || e), true); }
  }

  /* ── einingar úr öðrum hlutum kerfisins (lesið) ── */
  function jobsFor(n) {
    const j = P('vikudagskra.by_staff.' + n + '.jobs');
    if (Array.isArray(j)) return j.filter(Boolean);
    if (n === 'Agnar') { const g = P('vikudagskra.jobs'); if (Array.isArray(g)) return g.filter(Boolean); }
    return [];
  }
  function cardsFor(n) {
    const v = P('skipulagsbord.by_staff.' + n);
    if (v && Array.isArray(v.cards)) return v.cards.filter(Boolean);
    if (n === 'Agnar') {
      const g = P('skipulagsbord');
      if (g && Array.isArray(g.cards)) return g.cards.filter(Boolean);
      const g2 = P('skipulagsborg');
      if (g2 && Array.isArray(g2.cards)) return g2.cards.filter(Boolean);
    }
    return [];
  }
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  function week() {
    const jobs = jobsFor(nu()), out = [], d0 = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i), key = ymd(d);
      out.push({
        key, d: DAG[d.getDay()], n: d.getDate(), today: i === 0,
        jobs: jobs.filter(j => String(j.date || '').slice(0, 10) === key)
          .sort((a, b) => (a.allday ? 0 : 1) - (b.allday ? 0 : 1) || String(a.time || '').localeCompare(String(b.time || '')))
      });
    }
    return out;
  }
  function goView(v, anchor) {
    try { if (window.App && App.switchView) App.switchView(v); } catch (_) {}
    if (!anchor) return;
    let k = 0;
    const t = setInterval(() => {
      const el = document.getElementById(anchor);
      if (el || ++k > 20) { clearInterval(t); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
    }, 150);
  }
  function openCompany(fid) {
    try {
      if (window.App && App.switchView) App.switchView('companies');
      if (window.Companies && Companies.openDetail) Companies.openDetail(+fid);
    } catch (_) { toast('Fyrirtækjaspjaldið opnaðist ekki.', true); }
  }

  /* ── útlit (inni í skuggarótinni) ── */
  function cssText() {
    return [
      ':host{display:block;--ink:#161513;--ink2:#4a463f;--mute:#6f685c;--on:#f4f1ea;--on2:#c8c1b1;--on3:#8f8776;--rule:#d9d3c6;--rule2:#e6e1d6;--rule3:#cfc8b9;--edge:#c9c2b3;--edge2:#a89f8c;--terra:#b5522a;--green:#2f7a4a;--gink:#8a6a1c;--g5:#c9a54a;--g6:#b8892e;--g8:#8f6a1c;',
      '--gline:linear-gradient(90deg,#7a5a12 0%,#c9a54a 18%,#f5d76e 38%,#fff3b0 47%,#f5d76e 56%,#c9a54a 78%,#7a5a12 100%);',
      '--gface:linear-gradient(115deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.55) 45%,rgba(255,255,255,0) 52%),repeating-linear-gradient(180deg,rgba(255,255,255,.08) 0 1px,rgba(0,0,0,0) 1px 3px),linear-gradient(180deg,#f3dc95 0%,#d9b25a 14%,#b8892e 46%,#8f6a1c 52%,#a87b1f 74%,#cfa54a 92%,#e8cb7a 100%);',
      '--gside:linear-gradient(115deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.4) 46%,rgba(255,255,255,0) 54%),repeating-linear-gradient(180deg,rgba(255,255,255,.07) 0 1px,rgba(0,0,0,0) 1px 3px),linear-gradient(180deg,#e8cb7a 0%,#c9a54a 45%,#9c7422 55%,#b8892e 100%);',
      '--gcoin:repeating-conic-gradient(from 0deg,rgba(255,255,255,.09) 0 1.5deg,rgba(0,0,0,0) 1.5deg 4deg),radial-gradient(circle at 32% 28%,#fff3d0 0%,#e8cb7a 16%,#b8892e 46%,#7a5a12 76%,#3e2c06 100%);',
      '--panel:linear-gradient(180deg,#fff 0%,#fbf9f5 100%);--panelsh:inset 0 1px 0 #fff,inset 0 0 0 1px rgba(255,255,255,.6),inset 0 -1px 0 rgba(22,21,19,.06),0 1px 2px rgba(22,21,19,.1),0 6px 10px -6px rgba(22,21,19,.18),0 18px 36px -18px rgba(22,21,19,.4);',
      '--strip:linear-gradient(180deg,#faf8f4,#f1ede4);--stripsh:inset 0 1px 0 #fff,inset 0 -1px 0 rgba(255,255,255,.7);',
      '--key:linear-gradient(180deg,#fff,#f1ede4);--keysh:inset 0 1px 0 #fff,0 1px 2px rgba(22,21,19,.18),0 2px 0 rgba(22,21,19,.06);',
      '--well:linear-gradient(180deg,#f1ede4,#fff 55%);--wellsh:inset 0 2px 4px rgba(22,21,19,.12),inset 0 0 0 1px rgba(255,255,255,.8),0 1px 0 #fff;',
      '--slab:linear-gradient(160deg,#26241f 0%,#151412 40%,#0c0c0b 100%);--slabsh:inset 0 1px 0 rgba(255,255,255,.1),inset 0 0 0 1px rgba(226,196,111,.12),inset 0 -1px 0 rgba(0,0,0,.9),0 2px 0 #000,0 20px 40px -14px rgba(0,0,0,.85);',
      '--dwell:linear-gradient(180deg,#050505,#121110 60%,#0a0a09);--dwellsh:inset 0 3px 8px rgba(0,0,0,.95),inset 0 -1px 0 rgba(255,255,255,.05),0 1px 0 rgba(255,255,255,.08),0 0 0 1px #2a2823;',
      "--disp:'Playfair Display',Georgia,'Times New Roman',serif;--mono:'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace;--body:'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}",
      '[hidden]{display:none!important}',
      '*{box-sizing:border-box}',
      '.t5{container:t5 / inline-size;color:var(--ink);font-family:var(--body);font-size:13px;line-height:1.45;background:radial-gradient(ellipse at 50% 0%,#faf8f3 0%,#f4f1ea 55%,#ece7dc 100%);padding:16px 22px 40px;min-height:70vh;text-align:left}',
      '.t5 :focus-visible{outline:2px solid var(--g6);outline-offset:2px}',
      'h1,h2,h3,p{margin:0}',
      '.grow{flex:1}',
      '.col{display:flex;flex-direction:column;gap:16px;min-width:0}',
      '.kicker{display:flex;align-items:center;gap:10px;font-size:11px;font-weight:700;letter-spacing:.2em;color:var(--g8);text-transform:uppercase}',
      '.kicker::before{content:"";width:28px;height:2px;background:var(--gline);box-shadow:0 1px 0 #fff}',
      '.h1{font-family:var(--disp);font-size:40px;font-weight:800;letter-spacing:-.02em;line-height:1;margin:6px 0 0;color:var(--ink);text-shadow:0 1px 0 #fff,0 2px 2px rgba(22,21,19,.18)}',
      '.lbl{font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}',
      '.head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px 18px;flex-wrap:wrap}',
      '.meta{margin:8px 0 0;font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}',
      '.beta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}',
      '.note{font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}',
      '.acts{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap}',
      '.who{display:flex;flex-direction:column;gap:5px;margin:0}',
      '.who select{height:36px;min-width:150px;padding:0 11px;border:1px solid var(--edge);border-radius:4px;background:var(--well);box-shadow:var(--wellsh);font:600 13px var(--body);color:var(--ink)}',
      '.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 14px;border-radius:4px;font:600 12.5px var(--body);cursor:pointer;white-space:nowrap;transition:filter 120ms}',
      '.btn:hover{filter:brightness(1.04)}.btn:active{filter:brightness(.96)}',
      '.btn.sm{height:30px;padding:0 11px;font-size:12px}.btn.lg{height:42px;padding:0 18px;font-size:13.5px}',
      '.btn.iv{border:1px solid var(--edge);border-bottom-color:var(--edge2);background:var(--key);color:var(--ink);box-shadow:var(--keysh)}',
      '.btn.gold{border:1px solid #5a4410;border-top-color:#f7e6b8;border-bottom-color:#2e2004;border-radius:5px;background:var(--gface);color:var(--ink);font-weight:800;text-shadow:0 1px 0 rgba(255,255,255,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),inset 0 -2px 3px rgba(60,40,0,.45),0 3px 6px rgba(22,21,19,.45),0 0 12px rgba(184,137,46,.35)}',
      '.btn[disabled]{cursor:progress;filter:grayscale(.35) brightness(.95);opacity:.8}',
      '.btn[aria-pressed="true"]{background:var(--gside);font-weight:800}',
      '.seg{display:inline-flex;border:1px solid var(--edge2);border-radius:5px;overflow:hidden;box-shadow:var(--keysh);background:var(--key)}',
      '.seg button{height:30px;padding:0 12px;border:0;border-left:1px solid var(--edge);background:transparent;font:600 12px var(--body);color:var(--ink);cursor:pointer;white-space:nowrap}',
      '.seg button:first-child{border-left:0}',
      '.seg button[aria-pressed="true"]{background:var(--gside);font-weight:800;box-shadow:inset 0 1px 0 rgba(255,255,255,.5),inset 0 -1px 0 rgba(0,0,0,.25)}',
      '.seg.modeseg button{height:36px;padding:0 16px;font-size:13px}',
      '.seg.sm button{height:26px;padding:0 9px;font-size:11.5px}',
      '.seg .c{font-family:var(--mono);font-size:10.5px;margin-left:5px;font-variant-numeric:tabular-nums}',
      // Síurnar í haus Master-borðs voru 17 px breiðari en síminn (mælt á 375 px) — skruna í sínum reit.
      '.phead .seg{max-width:100%;overflow-x:auto}',
      '.modes{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.links{display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px;padding:8px 12px;border:1px solid var(--rule3);border-radius:5px;background:var(--strip);box-shadow:var(--stripsh),0 1px 2px rgba(22,21,19,.08)}',
      '.lkw{display:inline-flex;align-items:center;gap:3px}',
      '.lk{display:inline-flex;align-items:center;gap:7px;height:30px;padding:0 12px 0 5px;border:1px solid var(--edge);border-bottom-color:var(--edge2);border-radius:15px;background:var(--key);box-shadow:var(--keysh);color:var(--ink);font:600 12.5px var(--body);text-decoration:none;cursor:pointer;white-space:nowrap}',
      '.lk:hover{filter:brightness(1.04)}',
      '.lk-ic{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:var(--gside);color:#3e2c06;font:800 11px/1 var(--body);box-shadow:inset 0 1px 0 rgba(255,255,255,.5)}',
      '.lk-m{font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}',
      '.lk-x{width:22px;height:22px;border:1px solid var(--edge);border-radius:50%;background:#fff;color:var(--terra);font:700 11px/1 var(--body);cursor:pointer;padding:0}',
      '.lk-tomt{font-size:12px;color:var(--mute)}',
      '.lk-ham{display:flex;align-items:center;gap:8px;padding:0 16px 10px;font-size:12px;color:var(--ink2)}',
      '.lk-till{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 16px 12px;border-top:1px solid var(--rule2)}',
      '.panel{background:var(--panel);border:1px solid var(--rule3);border-radius:5px;box-shadow:var(--panelsh);min-width:0}',
      '.phead{display:flex;align-items:center;flex-wrap:wrap;gap:10px 12px;padding:11px 16px;background:var(--strip);box-shadow:var(--stripsh);border-bottom:1px solid transparent;border-image:var(--gline) 1;border-image-width:0 0 1px 0;border-radius:5px 5px 0 0}',
      '.mod:not(.open):not(.alltaf) .phead{border-image-width:0;border-radius:5px}',
      '.ptitle{font-family:var(--disp);font-size:20px;font-weight:700;letter-spacing:-.01em;line-height:1.1;text-shadow:0 1px 0 #fff;color:var(--ink)}',
      '.plate{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.14em;padding:2px 7px;border:1px solid #7a5a12;border-radius:2px;color:#3e2c06;text-shadow:0 1px 0 rgba(255,255,255,.45);background:linear-gradient(115deg,rgba(255,255,255,0) 35%,rgba(255,255,255,.6) 48%,rgba(255,255,255,0) 56%),linear-gradient(180deg,#f0d78a,#c9a54a 60%,#a87b1f);box-shadow:inset 0 1px 0 rgba(255,255,255,.8),inset 0 -1px 0 rgba(60,40,0,.4)}',
      '.plate.dark{color:#e2c46f;background:linear-gradient(180deg,#2a2823,#161513);border-color:rgba(201,165,74,.5);text-shadow:none}',
      '.sum{font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);min-width:0}',
      '.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}',
      '.kpi{position:relative;padding:14px 16px 13px;background:linear-gradient(180deg,#fff 0%,#fbf9f5 70%,#f1ede4 100%);border:1px solid var(--rule);border-top:3px solid transparent;border-image:var(--gline) 1;border-image-width:3px 0 0 0;border-radius:4px;box-shadow:var(--panelsh);min-width:0}',
      '.kpi.dark{background:var(--slab);border-color:#000;color:var(--on);box-shadow:var(--slabsh)}',
      '.kpi.dark .lbl{color:var(--on3)}',
      '.kv{font-family:var(--disp);font-size:34px;font-weight:800;letter-spacing:-.02em;line-height:1;margin-top:8px;font-variant-numeric:lining-nums tabular-nums}',
      '.kv small{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--mute);margin-left:3px}',
      '.km{font-size:11.5px;color:var(--mute);margin-top:6px}.kpi.dark .km{color:var(--on2)}',
      '.layout{display:flex;flex-direction:column;gap:16px;min-width:0}',
      '.rail{display:flex;flex-direction:column;gap:14px;min-width:0;container:rail / inline-size}',
      '.main{min-width:0;container:main / inline-size}',
      '.board{display:grid;grid-template-columns:minmax(0,1.32fr) minmax(0,1fr);grid-template-rows:auto 1fr;grid-template-areas:"master mine" "master sel";gap:18px;align-items:start}',
      '.colmaster{grid-area:master}.colmine{grid-area:mine}.colsel{grid-area:sel}',
      '.phone-seg{display:none}',
      '.psub{padding:9px 16px;font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);border-bottom:1px solid var(--rule2);overflow-wrap:anywhere}',
      '.age{font-family:var(--mono);font-size:11px;font-weight:600;color:var(--mute);font-variant-numeric:tabular-nums}',
      '.age.warm{color:var(--gink)}.age.hot{color:var(--terra)}',
      '.kick{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--mute);overflow-wrap:anywhere}',
      '.frow{display:grid;grid-template-columns:44px minmax(0,1fr) auto;gap:12px;align-items:start;padding:13px 16px;border-top:1px solid var(--rule2)}',
      '.frow:first-child{border-top:0}',
      '.rt{font-family:var(--disp);font-size:17px;font-weight:700;line-height:1.25;margin:4px 0 3px;overflow-wrap:anywhere;color:var(--ink)}',
      '.ai{max-width:62ch;font-size:12.5px;line-height:1.5;color:var(--ink2)}',
      '.tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}',
      '.tag{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;padding:3px 6px;border-radius:2px;border:1px solid var(--edge);color:var(--ink2);background:var(--well)}',
      '.tag.hot{border-color:rgba(181,82,42,.55);color:var(--terra)}.tag.ok{border-color:rgba(47,122,74,.5);color:var(--green)}',
      '.empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:26px 16px;text-align:center;color:var(--mute);font-size:12.5px}',
      '.coin{width:40px;height:40px;border-radius:50%;background:var(--gcoin);opacity:.22;box-shadow:inset 0 2px 1px rgba(255,255,255,.7),inset 0 -3px 5px rgba(0,0,0,.45)}',
      '.pager{display:flex;justify-content:center;padding:10px 16px 14px;border-top:1px solid var(--rule2)}',
      '.slots{display:inline-flex;align-items:center;gap:4px}',
      '.slot{width:11px;height:11px;border-radius:2px;border:1px solid var(--edge2);background:var(--well);box-shadow:var(--wellsh)}',
      '.slot.on{background:linear-gradient(180deg,#3a3732,#161513);border-color:#000}',
      '.slotn{font-family:var(--mono);font-size:11px;font-weight:600;color:var(--ink2);margin-left:4px}.slotn.over{color:var(--terra)}',
      '.mrow{display:grid;grid-template-columns:12px minmax(0,1fr);gap:8px;padding:12px 16px;border-top:1px solid var(--rule2)}',
      '.mrow:first-child{border-top:0}.mrow[aria-current="true"]{background:rgba(241,237,228,.6)}',
      '.pin{visibility:hidden;font-size:9px;color:var(--g6);padding-top:3px}.mrow[aria-current="true"] .pin{visibility:visible}',
      '.mpick{display:block;width:100%;padding:0;margin:0;border:0;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}',
      '.mt{display:block;font-family:var(--disp);font-size:16px;font-weight:700;line-height:1.25;margin:4px 0 2px;overflow-wrap:anywhere;color:var(--ink)}',
      '.mn{display:block;margin:0 0 8px;font-size:12.5px;color:var(--ink2)}',
      '.mfoot{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:6px}',
      '.sel{background:var(--slab);border:1px solid #000;border-top:3px solid transparent;border-image:var(--gline) 1;border-image-width:3px 0 0 0;border-radius:5px;color:var(--on);box-shadow:var(--slabsh);padding:14px 18px 18px;display:flex;flex-direction:column;gap:12px;min-width:0}',
      '.sel.inline{margin:0 10px 12px}',
      '.sel .age{color:var(--on3)}.sel .age.warm{color:#d9b25a}.sel .age.hot{color:#e08a60}',
      '.slabel{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--g5)}',
      '.stitle{font-family:var(--disp);font-size:23px;font-weight:800;line-height:1.15;color:var(--on);overflow-wrap:anywhere}',
      '.smeta{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--on2);overflow-wrap:anywhere}',
      '.aisum{font-size:12.5px;line-height:1.55;color:var(--on2)}.aisum .slabel{margin-right:8px}',
      '.well{border:1px solid #000;border-radius:4px;background:var(--dwell);box-shadow:var(--dwellsh);padding:12px 14px}',
      '.well p{margin:7px 0 0;font-size:13px;line-height:1.6;color:#efe9da;white-space:pre-line;overflow-wrap:anywhere;max-height:260px;overflow:auto}',
      '.sacts{display:flex;gap:8px;flex-wrap:wrap}',
      '.sel .empty{color:var(--on3)}',
      '.tog{min-width:34px;padding:0 9px}',
      '.week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;padding:12px 14px}',
      '.day{display:flex;flex-direction:column;gap:6px;min-width:0;padding:8px 9px 9px;border:1px solid var(--rule);border-bottom-color:var(--edge);border-radius:4px;background:var(--key);box-shadow:var(--keysh);color:var(--ink)}',
      '.day.today{background:var(--slab);border-color:#000;color:var(--on)}',
      '.dh{display:flex;align-items:center;gap:4px}',
      '.djobs{display:flex;flex-direction:column;gap:6px;min-width:0}',
      '.dlink{display:flex;align-items:baseline;gap:6px;padding:0;border:0;background:none;font:inherit;color:inherit;cursor:pointer}',
      '.dn{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.14em}.day:not(.today) .dn{color:var(--mute)}',
      '.dd{font-family:var(--disp);font-size:16px;font-weight:800;line-height:1}',
      '.dplus{width:22px;height:22px;flex:none;border:1px solid var(--edge);border-radius:3px;background:var(--key);color:var(--ink);font:700 14px/1 var(--body);cursor:pointer;padding:0}',
      '.today .dplus{background:#2a2823;border-color:#3a3732;color:var(--on)}',
      '.dots{display:flex;gap:4px;flex-wrap:wrap;min-height:8px}',
      '.dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex:none}',
      '.dnone{font-size:11px;color:var(--mute)}.today .dnone{color:var(--on3)}',
      '.job{display:grid;gap:1px;width:100%;padding:6px 7px;border-radius:3px;background:rgba(255,255,255,.7);border:1px solid var(--rule2);border-left:3px solid #8f8776;font:11.5px/1.3 var(--body);color:var(--ink2);text-align:left;overflow-wrap:anywhere;cursor:pointer}',
      'span.job{cursor:default}',
      '.job b{font-family:var(--mono);font-size:10.5px;font-weight:600;color:var(--ink)}.job small{font-size:11px;color:var(--mute)}',
      '.today .job{background:rgba(255,255,255,.06);border-color:#2a2823;color:var(--on2)}.today .job b{color:var(--on)}',
      '.legend{display:flex;flex-wrap:wrap;gap:6px 14px;padding:0 16px 12px;font-size:11.5px;color:var(--mute)}.legend span{display:inline-flex;align-items:center;gap:6px}',
      '.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;padding:12px 14px}',
      '.pcard{display:flex;flex-direction:column;gap:4px;padding:10px 11px;border:1px solid var(--rule);border-bottom-color:var(--edge);border-radius:4px;background:linear-gradient(180deg,#fff,#fbf9f5);box-shadow:var(--keysh);min-width:0}',
      '.pcard b{font-size:13px;line-height:1.3;overflow-wrap:anywhere}.pcard span{font-size:12px;color:var(--ink2);line-height:1.4;overflow-wrap:anywhere}',
      '.pcard .pt{display:flex;align-items:center;gap:6px;margin-top:4px;font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}',
      '.lrow{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 16px;border-top:1px solid var(--rule2)}',
      '.lrow:first-child{border-top:0}.lrow b{display:block;font-size:13px;overflow-wrap:anywhere}.lrow .s{display:block;font-size:12px;color:var(--mute)}',
      '.kboxes{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;padding:12px 14px}',
      '.kbox{padding:10px 12px;border-radius:4px;background:var(--well);box-shadow:var(--wellsh);border:1px solid var(--edge)}',
      '.kbox .v{font-family:var(--disp);font-size:24px;font-weight:800;line-height:1.1;margin-top:4px;font-variant-numeric:tabular-nums}',
      '.more{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 16px 12px;font-size:12px;color:var(--mute)}',
      '.cfgrow{display:grid;grid-template-columns:34px minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:10px 16px;border-top:1px solid var(--rule2)}',
      '.cfgt b{display:block;font-family:var(--disp);font-size:15px;font-weight:700}.cfgt span{display:block;font-size:12px;color:var(--mute)}',
      '.lock{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}',
      '.cfgfoot{padding:11px 16px;border-top:1px solid var(--rule);font-size:12px;color:var(--mute)}',
      '.sw{position:relative;width:40px;height:22px;flex:none;border-radius:11px;border:1px solid var(--edge2);background:var(--well);box-shadow:var(--wellsh);cursor:pointer;padding:0}',
      '.sw::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--key);border:1px solid var(--edge);box-shadow:var(--keysh)}',
      '.sw[aria-checked="true"]{background:linear-gradient(180deg,#2a7a45 0%,#174a2a 55%,#144424 100%);border-color:#0a2a15}.sw[aria-checked="true"]::after{left:20px}',
      '.boardstrip{display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px;width:100%;min-height:50px;padding:9px 16px;border:1px solid var(--rule3);border-radius:5px;background:var(--strip);box-shadow:var(--stripsh),0 1px 2px rgba(22,21,19,.1);font:inherit;color:var(--ink);text-align:left;cursor:pointer}',
      '.boardstrip b{font-family:var(--disp);font-size:16px;font-weight:700}.boardstrip .v{font-family:var(--mono);font-size:11px;color:var(--mute);margin-right:10px}',
      '.composer{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr) auto auto;gap:8px;padding:12px 16px}',
      '.composer input[type="text"]{height:34px;padding:0 10px;border:1px solid var(--edge);border-radius:4px;background:#fff;font:14px var(--body);color:var(--ink);min-width:0}',
      '.err{padding:10px 14px;border:1px solid rgba(181,82,42,.45);border-radius:4px;background:#fff7f2;color:var(--terra);font-size:12.5px}',
      '.t5toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:99990;max-width:min(92vw,520px);padding:11px 16px;border:1px solid #000;border-radius:5px;background:var(--slab);color:var(--on);font:600 12.5px var(--body);box-shadow:var(--slabsh)}',
      '.t5toast.warn{border-top:3px solid var(--terra)}',
      // Breiðir skjáir: einingar hamsins vinstra megin, aðrar hægra megin, borðið í miðjunni.
      '@container t5 (min-width: 1600px){.layout{display:grid;grid-template-columns:minmax(280px,320px) minmax(0,1fr) minmax(300px,360px);gap:18px;align-items:start}' +
        '.layout.nol{grid-template-columns:minmax(0,1fr) minmax(300px,360px)}.layout.nor{grid-template-columns:minmax(280px,320px) minmax(0,1fr)}.layout.nol.nor{grid-template-columns:minmax(0,1fr)}}',
      '@container t5 (min-width: 2600px){.layout{grid-template-columns:minmax(320px,380px) minmax(0,1fr) minmax(340px,420px)}' +
        '.layout.nol{grid-template-columns:minmax(0,1fr) minmax(340px,420px)}.layout.nor{grid-template-columns:minmax(320px,380px) minmax(0,1fr)}.layout.nol.nor{grid-template-columns:minmax(0,1fr)}}',
      '@container main (min-width: 1500px){.board{grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) minmax(0,1fr);grid-template-rows:auto;grid-template-areas:"master mine sel"}}',
      // Mjór dálkur (hliðardálkur á breiðum skjá eða sími): vikan sem listi, eitt spjald í röð.
      '@container rail (max-width: 560px){.week{display:flex;flex-direction:column;gap:6px;padding:10px 12px}.day{flex-direction:row;align-items:flex-start;gap:10px}.dh{flex:0 0 100px}.djobs{flex:1}' +
        '.cards{grid-template-columns:minmax(0,1fr)}.lrow{grid-template-columns:44px minmax(0,1fr)}.lrow .btn,.lrow .lock{grid-column:2;justify-self:start}}',
      '@container t5 (min-width: 761px){.sel.inline{display:none}}',
      '@container t5 (max-width: 760px){' +
        '.t5{padding:12px 10px 24px}.h1{font-size:30px}' +
        '.acts{width:100%}.who{flex:1 1 100%}.who select{width:100%}.acts .btn{flex:1}' +
        '.modes .lbl{display:none}.seg.modeseg{display:flex;width:100%;overflow-x:auto}.seg.modeseg button{flex:1 0 auto;height:38px;padding:0 12px}' +
        '.kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.kv{font-size:26px}' +
        '.board{display:flex;flex-direction:column;gap:14px}.board>*{min-width:0;max-width:100%}' +
        '.phone-seg{display:flex;width:100%}.phone-seg button{flex:1;height:40px;font-size:13px}' +
        '.board[data-view="master"] .colmine{display:none}.board[data-view="mitt"] .colmaster{display:none}' +
        '.sel.side{display:none}' +
        '.frow{grid-template-columns:minmax(0,1fr) auto;padding:12px}.frow .age{grid-column:1 / -1}' +
        '.cfgrow{grid-template-columns:30px minmax(0,1fr) auto;padding:10px 12px}.cfgrow .seg{grid-column:2 / -1;justify-self:start}' +
        '.composer{grid-template-columns:minmax(0,1fr)}' +
      '}',
      '@media (prefers-reduced-motion: reduce){.btn{transition:none}}'
    ].join('\n');
  }
  // Skuggarótin verður til einu sinni; atburðir hlustaðir á henni (change fer ekki út úr skugga).
  function rot() {
    const v = document.getElementById(VIEW_ID);
    if (!v) return null;
    if (v.shadowRoot) return v.shadowRoot;
    if (!v.attachShadow) return null;
    if (!document.getElementById('t5-fonts')) {
      const l = document.createElement('link');
      l.id = 't5-fonts';
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Mono:wght@500;600&display=swap';
      document.head.appendChild(l);
    }
    const r = v.attachShadow({ mode: 'open' });
    const st = document.createElement('style');
    st.textContent = cssText();
    const mount = document.createElement('div');
    mount.className = 't5-mount';
    r.appendChild(st);
    r.appendChild(mount);
    r.addEventListener('click', onClick);
    r.addEventListener('change', onChange);
    r.addEventListener('keydown', onKey);
    return r;
  }

  /* ── teikning ── */
  const plate = n => '<span class="plate">' + n + '</span>';
  const emptyHtml = t => '<div class="empty"><span class="coin" aria-hidden="true"></span>' + t + '</div>';
  const wellHtml = (label, text) => '<div class="well"><div class="slabel">' + esc(label) + '</div><p>' + esc(text) + '</p></div>';
  const fmtD = iso => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.getDate() + '. ' + MAN[d.getMonth()].slice(0, 3) + '.'; };
  const klukka = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const dis = id => (S.busy[id] ? ' disabled' : '');

  function feedRow(r) {
    const a = ageDays(r), w = whereOf(r), ai = aiLine(r);
    const tags = (r.important ? '<span class="tag hot">Áríðandi</span>' : '') +
      (r.due_at ? '<span class="tag">Frestur ' + esc(fmtD(r.due_at)) + '</span>' : '') +
      (r.status === 'i_vinnslu' ? '<span class="tag">Í vinnslu</span>' : '') +
      (isPost(r) && r.svarad_at ? '<span class="tag ok">Svarað</span>' : '');
    return '<article class="frow">' +
      '<div class="age ' + ageCls(a) + '" title="' + a + ' dagar síðan málið varð til">' + a + 'D</div>' +
      '<div><div class="kick">' + esc(tegMals(r)) + (w ? ' · ' + esc(w) : '') + '</div>' +
        '<h3 class="rt">' + esc(r.title || '(ónefnt mál)') + '</h3>' +
        (ai ? '<p class="ai">' + esc(ai) + '</p>' : '') +
        (tags ? '<div class="tags">' + tags + '</div>' : '') + '</div>' +
      '<button type="button" class="btn iv sm" data-t5="take" data-id="' + r.id + '"' + dis(r.id) + '>' + (S.busy[r.id] ? 'Augnablik…' : 'Taka ›') + '</button>' +
    '</article>';
  }
  function mineRow(r, valid) {
    const a = ageDays(r), w = whereOf(r), ai = aiLine(r);
    return '<div class="mrow" aria-current="' + valid + '">' +
      '<span class="pin" aria-hidden="true">◆</span>' +
      '<div><button type="button" class="mpick" data-t5="select" data-id="' + r.id + '">' +
          '<span class="kick">' + esc(tegMals(r)) + (w ? ' · ' + esc(w) : '') + '</span>' +
          '<span class="mt">' + esc(r.title || '(ónefnt mál)') + '</span>' +
          (ai && !valid ? '<span class="mn">' + esc(ai) + '</span>' : '') +
        '</button>' +
        '<div class="mfoot"><span class="age ' + ageCls(a) + '">' + a + 'D</span>' +
          (r.due_at ? '<span class="lock">Frestur ' + esc(fmtD(r.due_at)) + '</span>' : '') +
          (r.important ? '<span class="tag hot">Áríðandi</span>' : '') +
          (isPost(r) ? (r.svarad_at ? '<span class="tag ok">Svarað</span>' : '<span class="tag">Bíður svars</span>') : '') +
          '<span class="grow"></span>' +
          '<button type="button" class="btn iv sm" data-t5="done" data-id="' + r.id + '"' + dis(r.id) + '>✓ Lokið</button>' +
          '<button type="button" class="btn iv sm" data-t5="giveback" data-id="' + r.id + '"' + dis(r.id) + '>↩ Skila</button>' +
        '</div></div></div>';
  }
  function selHtml(r) {
    if (!r) return emptyHtml('Veldu mál af borðinu þínu eða taktu næsta af Master.<button type="button" class="btn gold" data-t5="take-next">Taka næsta af Master ›</button>');
    const a = ageDays(r), w = whereOf(r), post = isPost(r);
    let well;
    if (post) {
      const p = postOf(r);
      if (p === undefined) loadPost(r);
      if (p === undefined || p === null) well = wellHtml('Pósturinn', 'Sæki póstinn…');
      else if (p === false) well = wellHtml('Pósturinn', 'Upprunapósturinn fannst ekki. Samantekt málsins stendur hér að ofan.');
      else {
        let txt = String(p.body_preview || p.snippet || '').trim();
        let hver = p.sender_name || p.sender_email || '';
        try {
          if (window.SamskiptiTexti && SamskiptiTexti.eiginTexti) txt = SamskiptiTexti.eiginTexti(txt) || txt;
          if (window.SamskiptiTexti && SamskiptiTexti.hreintNafn) hver = SamskiptiTexti.hreintNafn(p.sender_name, p.sender_email);
        } catch (_) {}
        well = wellHtml(hver + (p.received_at ? ' · ' + fmtD(p.received_at) : ''), txt.slice(0, 1800) || '(enginn texti)');
      }
    } else {
      well = wellHtml('Lýsing', String(r.notes || '').trim().slice(0, 1800) || 'Engin lýsing skráð.');
    }
    const p = post ? postOf(r) : null;
    const getaSvarad = !!(post && p && p.sender_email);
    const acts = (getaSvarad
        ? '<button type="button" class="btn gold lg" data-t5="reply" data-id="' + r.id + '"' + dis(r.id) + '>↩ Svara í sama þræði</button>' +
          '<button type="button" class="btn iv" data-t5="done" data-id="' + r.id + '"' + dis(r.id) + '>✓ Lokið</button>'
        : '<button type="button" class="btn gold lg" data-t5="done" data-id="' + r.id + '"' + dis(r.id) + '>✓ Merkja lokið</button>') +
      '<button type="button" class="btn iv" data-t5="giveback" data-id="' + r.id + '"' + dis(r.id) + '>↩ Skila á Master</button>' +
      (r.fyrirtaeki_id ? '<button type="button" class="btn iv" data-t5="company" data-fid="' + r.fyrirtaeki_id + '">Opna fyrirtæki ›</button>' : '');
    const meta = [w, tegMals(r), r.due_at ? 'Frestur ' + fmtD(r.due_at) : '', r.important ? 'Áríðandi' : '', post ? (r.svarad_at ? 'Svarað ' + fmtD(r.svarad_at) : 'Bíður svars') : ''].filter(Boolean).join(' · ');
    return '<div style="display:flex;align-items:center;gap:10px"><span class="plate dark">04</span><span class="slabel">Valið mál</span><span class="grow"></span><span class="age ' + ageCls(a) + '">' + a + 'D</span></div>' +
      '<h3 class="stitle">' + esc(r.title || '(ónefnt mál)') + '</h3>' +
      '<div class="smeta">' + esc(meta) + '</div>' +
      (r.summary ? '<div class="aisum"><span class="slabel">Samantekt</span>' + esc(String(r.summary).slice(0, 600)) + '</div>' : '') +
      well + '<div class="sacts">' + acts + '</div>';
  }

  function modPanel(k, summary, body, action, alltaf) {
    const m = MODS[k], open = isOpen(k);
    return '<section class="panel mod' + (open ? ' open' : '') + (alltaf ? ' alltaf' : '') + '" aria-label="' + esc(m.t) + '">' +
      '<header class="phead">' + plate(m.n) + '<h2 class="ptitle">' + m.t + '</h2><span class="sum">' + summary + '</span><span class="grow"></span>' +
        ((open || alltaf) && action ? action : '') +
        '<button type="button" class="btn iv sm tog" data-t5="mod-open" data-m="' + k + '" aria-expanded="' + open + '" aria-label="' + (open ? 'Fella saman ' : 'Opna ') + esc(m.t) + '">' + (open ? '▴' : '▾') + '</button>' +
      '</header>' + (open || alltaf ? body : '') + '</section>';
  }
  function dagskraHtml() {
    const open = isOpen('dagskra'), days = week();
    const total = days.reduce((s, d) => s + d.jobs.length, 0);
    const jobHtml = j => {
      const inni = '<b>' + esc(j.allday ? 'Allan daginn' : (j.time || '')) + '</b>' + esc(j.name || '') + (j.note ? '<small>' + esc(String(j.note).slice(0, 90)) + '</small>' : '');
      return j.id
        ? '<button type="button" class="job" data-t5="job-edit" data-jid="' + esc(j.id) + '" style="border-left-color:' + vdLitur(j.type) + '" title="' + esc(j.type || '') + ' — smelltu til að breyta">' + inni + '</button>'
        : '<span class="job" style="border-left-color:' + vdLitur(j.type) + '">' + inni + '</span>';
    };
    const body = '<div class="week">' + days.map(d =>
      '<div class="day' + (d.today ? ' today' : '') + '">' +
        '<div class="dh"><button type="button" class="dlink" data-t5="mod-open" data-m="dagskra" aria-label="' + d.d + ' ' + d.n + '., ' + d.jobs.length + ' verk">' +
          '<span class="dn">' + d.d + '</span><span class="dd">' + d.n + '</span></button><span class="grow"></span>' +
          '<button type="button" class="dplus" data-t5="job-new" data-date="' + d.key + '" aria-label="Skrá verk ' + d.d + ' ' + d.n + '.">+</button></div>' +
        '<div class="djobs">' + (open
          ? (d.jobs.length ? d.jobs.map(jobHtml).join('') : '<span class="dnone">Ekkert skráð</span>')
          : '<span class="dots">' + d.jobs.map(j => '<i class="dot" style="background:' + vdLitur(j.type) + '" title="' + esc((j.time ? j.time + ' ' : '') + (j.name || '')) + '"></i>').join('') + '</span>') +
        '</div>' +
      '</div>').join('') + '</div>' +
      (open ? '<div class="legend">' + VD_TEG.map(t => '<span><i class="dot" style="background:' + t[1] + '"></i>' + t[0] + '</span>').join('') + '</div>' : '');
    const action = '<button type="button" class="btn gold sm" data-t5="job-new" data-date="' + days[0].key + '">+ Skrá verk</button>';
    return modPanel('dagskra', days[0].jobs.length + ' í dag · ' + total + ' næstu 7 daga', body, action, true);
  }
  function bottomHtml(k) {
    const n = nu();
    if (k === 'skipulag') {
      const cards = cardsFor(n).slice().sort((a, b) => (+a.slot || 0) - (+b.slot || 0));
      const body = cards.length
        ? '<div class="cards">' + cards.slice(0, 12).map(cd => {
            const row = cd.verkbord_id != null ? S.rows.find(x => String(x.id) === String(cd.verkbord_id)) : null;
            const nafn = (row && row.customer_nafn) || cd.name || '';
            const titill = (row && row.title) || cd.title || '';
            const t = cd.type != null && SB_TEG[cd.type] ? SB_TEG[cd.type] : null;
            const stada = cd.verkbord_id != null
              ? (row ? (isFree(row) ? 'Á Master' : 'Á borði ' + normW(row.assigned_to)) : 'Mál lokað eða í geymslu')
              : 'Minnispunktur';
            return '<div class="pcard">' + (nafn ? '<b>' + esc(nafn) + '</b>' : '') + (titill ? '<span>' + esc(titill) + '</span>' : '') +
              '<span class="pt">' + (t ? '<i class="dot" style="background:' + t[1] + '"></i>' + esc(t[0]) + ' · ' : '') + esc(stada) + '</span></div>';
          }).join('') + '</div>' +
          (cards.length > 12 ? '<div class="more">+ ' + (cards.length - 12) + ' spjöld til viðbótar á skipulagsborðinu</div>' : '')
        : emptyHtml('Engin spjöld á skipulagsborðinu þínu.');
      return modPanel(k, cards.length + ' spjöld', body,
        '<button type="button" class="btn gold sm" data-t5="go" data-view="verkbord" data-anchor="vb-skipulag">Opna skipulagsborð ›</button>');
    }
    if (k === 'vinnublod') {
      const c = S.counts.sara;
      return modPanel(k, c ? (c.bidur || 0) + ' bíða yfirferðar · ' + (c.samthykkt || 0) + ' samþykkt' : 'talning náðist ekki',
        c ? '<div class="kboxes"><div class="kbox"><div class="lbl">Bíða yfirferðar</div><div class="v">' + (c.bidur || 0) + '</div></div>' +
            '<div class="kbox"><div class="lbl">Samþykkt</div><div class="v">' + (c.samthykkt || 0) + '</div></div>' +
            '<div class="kbox"><div class="lbl">Kláruð</div><div class="v">' + (c.klarad || 0) + '</div></div></div>'
          : '<div class="more">Talningin náðist ekki. Vinnublöðin eru á gamla borðinu.</div>',
        '<button type="button" class="btn gold sm" data-t5="go" data-view="verkbord" data-anchor="vb-sara">Opna vinnublöð ›</button>');
    }
    if (k === 'postsvor') {
      const rows = S.rows.filter(r => isPost(r) && !r.svarad_at).sort(rodun);
      return modPanel(k, rows.length + ' bíða svars', rows.length
        ? rows.slice(0, 8).map(r => {
            const a = ageDays(r), free = isFree(r), me = onBoardOf(r, n);
            return '<div class="lrow"><span class="age ' + ageCls(a) + '">' + a + 'D</span>' +
              '<div><b>' + esc(r.title || '(ónefnt)') + '</b><span class="s">' + esc([whereOf(r), free ? 'á Master' : 'á borði ' + normW(r.assigned_to)].filter(Boolean).join(' · ')) + '</span></div>' +
              (free ? '<button type="button" class="btn iv sm" data-t5="take" data-id="' + r.id + '"' + dis(r.id) + '>Taka ›</button>'
                : me ? '<button type="button" class="btn iv sm" data-t5="select" data-id="' + r.id + '">Opna ›</button>'
                : '<span class="lock">' + esc(normW(r.assigned_to)) + '</span>') + '</div>';
          }).join('') + (rows.length > 8 ? '<div class="more">+ ' + (rows.length - 8) + ' til viðbótar</div>' : '')
        : emptyHtml('Enginn póstur bíður svars.'),
        '<button type="button" class="btn gold sm" data-t5="go" data-view="thjonustuver-postar">Opna pósthólfið ›</button>');
    }
    if (k === 'akstur') {
      return modPanel(k, 'Aksturslisti og vakt', '<div class="more">Aksturslistinn og vaktin opnast á sinni eigin síðu.</div>',
        '<button type="button" class="btn gold sm" data-t5="go" data-view="aksturslisti">Opna aksturslista ›</button>');
    }
    if (k === 'krofur') {
      const c = S.counts.krofur;
      return modPanel(k, c == null ? 'talning náðist ekki' : c + ' útistandandi',
        '<div class="kboxes"><div class="kbox"><div class="lbl">Útistandandi kröfur</div><div class="v">' + (c == null ? '—' : c) + '</div></div></div>',
        '<button type="button" class="btn gold sm" data-t5="go" data-view="krofu-yfirlit">Opna Kröfu yfirlit ›</button>');
    }
    return '';
  }

  function kpiHtml(master, mine) {
    const card = (l, v, m, dark, small) => '<div class="kpi' + (dark ? ' dark' : '') + '"><div class="lbl">' + l + '</div><div class="kv">' + v + (small ? '<small>' + small + '</small>' : '') + '</div><div class="km">' + m + '</div></div>';
    const hot = S.rows.filter(r => r.important).length;
    const posts = S.rows.filter(isPost);
    const unanswered = posts.filter(r => !r.svarad_at).length, answered = posts.length - unanswered;
    const todayKey = ymd(new Date());
    const newToday = master.filter(r => ymd(new Date(tStamp(r.created_at))) === todayKey).length;
    const days = week(), jobsToday = days[0].jobs.length, jobsWeek = days.reduce((s, d) => s + d.jobs.length, 0);
    const mode = cfg().mode, sara = S.counts.sara;
    const mitt = card('Mitt borð', mine.length, 'haltu því stuttu', false, '/ ' + LIMIT);
    const heitt = card('Áríðandi', hot, 'opin áríðandi mál', true);
    if (mode === 'krofur') return card('Útistandandi kröfur', S.counts.krofur == null ? '—' : S.counts.krofur, 'ógreiddir reikningar') + card('Á Master', master.length, 'opin mál án starfsmanns') + mitt + heitt;
    if (mode === 'skyrslur') return card('Bíða yfirferðar', sara ? (sara.bidur || 0) : '—', 'vinnublöð') + card('Samþykkt', sara ? (sara.samthykkt || 0) : '—', 'tilbúin í skýrslu og reikning') + card('Skipulagsspjöld', cardsFor(nu()).length, 'á þínu borði') + card('Verk í dag', jobsToday, jobsWeek + ' næstu 7 daga', true);
    if (mode === 'akstur') return card('Verk í dag', jobsToday, 'á dagskránni þinni') + card('Næstu 7 daga', jobsWeek, 'á dagskránni þinni') + mitt + heitt;
    if (mode === 'samskipti') return card('Bíða svars', unanswered, 'póstmál án svars') + card('Póstar á Master', master.filter(isPost).length, 'taktu næsta') + card('Svarað', answered, 'bíður kúnnans') + heitt;
    return card('Á Master', master.length, newToday + ' ný í dag') + mitt + card('Bíða svars', unanswered, 'póstmál án svars') + heitt;
  }

  function linksHtml(mode) {
    const all = linksFor(nu());
    const synileg = all.filter(l => !Array.isArray(l.modes) || !l.modes.length || l.modes.indexOf(mode) >= 0);
    const falin = all.length - synileg.length;
    const chips = synileg.map(l => {
      const inni = '<span class="lk-ic" aria-hidden="true">' + esc(String(l.nafn).trim().charAt(0).toUpperCase() || '·') + '</span><span>' + esc(l.nafn) + '</span>' +
        (Array.isArray(l.modes) && l.modes.length && MODES[l.modes[0]] ? '<span class="lk-m">' + esc(MODES[l.modes[0]].l) + '</span>' : '');
      const tengill = l.slod.charAt(0) === '#'
        ? '<button type="button" class="lk" data-t5="go" data-view="' + esc(l.slod.slice(1)) + '" title="Opna ' + esc(l.nafn) + '">' + inni + '</button>'
        : '<a class="lk" href="' + esc(l.slod) + '" target="_blank" rel="noopener noreferrer" title="' + esc(l.slod) + '">' + inni + '</a>';
      return '<span class="lkw">' + tengill + (S.linkEdit ? '<button type="button" class="lk-x" data-t5="link-del" data-lid="' + esc(l.id) + '" aria-label="Fjarlægja ' + esc(l.nafn) + '">✕</button>' : '') + '</span>';
    }).join('');
    const form = !S.linkForm ? '' :
      '<section class="panel" aria-label="Festa flýtileið"><div class="composer">' +
        '<input type="text" data-k="ln" placeholder="Nafn, t.d. Keldan" aria-label="Nafn flýtileiðar">' +
        '<input type="text" data-k="lu" placeholder="Slóð, t.d. keldan.is" aria-label="Slóð" inputmode="url">' +
        '<button type="button" class="btn gold sm" data-t5="link-save">Festa</button>' +
        '<button type="button" class="btn iv sm" data-t5="link-add">Hætta við</button></div>' +
      '<label class="lk-ham"><input type="checkbox" data-k="lm"> Aðeins í hamnum „' + esc(MODES[mode].l) + '“</label>' +
      '<div class="lk-till"><span class="lbl">Síður í kerfinu</span>' +
        TILLOGUR.filter(t => !all.some(l => l.slod === t[1])).map(t =>
          '<button type="button" class="btn iv sm" data-t5="link-quick" data-nafn="' + esc(t[0]) + '" data-slod="' + esc(t[1]) + '">+ ' + esc(t[0]) + '</button>').join('') +
      '</div></section>';
    return '<section class="links" aria-label="Flýtileiðir"><span class="lbl">Flýtileiðir</span>' +
      (chips || '<span class="lk-tomt">Festu síðurnar sem þú hoppar á milli — Keldan, Drive, Payday, Tímavera …</span>') +
      (falin ? '<span class="lk-m">+ ' + falin + ' í öðrum hömum</span>' : '') +
      '<span class="grow"></span>' +
      '<button type="button" class="btn iv sm" data-t5="link-add" aria-expanded="' + S.linkForm + '">+ Festa tengil</button>' +
      (all.length ? '<button type="button" class="btn iv sm" data-t5="link-edit" aria-pressed="' + S.linkEdit + '">' + (S.linkEdit ? 'Búið' : 'Breyta') + '</button>' : '') +
      '</section>' + form;
  }

  function cfgHtml() {
    const c = cfg();
    const core = [['02', 'Master borð'], ['03', 'Mitt borð'], ['04', 'Valið mál']].map(x =>
      '<div class="cfgrow">' + plate(x[0]) + '<div class="cfgt"><b>' + x[1] + '</b><span>Kjarninn í flæðinu.</span></div><span></span><span class="lock">Alltaf</span></div>').join('');
    const rows = ['dagskra'].concat(BOTTOM).map(k => {
      const m = MODS[k], on = !!c.mods[k][0], def = !!c.mods[k][1];
      return '<div class="cfgrow">' + plate(m.n) + '<div class="cfgt"><b>' + m.t + '</b><span>' + m.d + '</span></div>' +
        '<div class="seg sm" role="group" aria-label="Sjálfgefið fyrir ' + m.t + '">' +
          '<button type="button" data-t5="cfg-def" data-m="' + k + '" data-v="1" aria-pressed="' + def + '">Opið</button>' +
          '<button type="button" data-t5="cfg-def" data-m="' + k + '" data-v="0" aria-pressed="' + !def + '">Samanbrotið</button></div>' +
        '<button type="button" class="sw" role="switch" aria-checked="' + on + '" data-t5="cfg-on" data-m="' + k + '" aria-label="' + m.t + '"></button></div>';
    }).join('');
    return '<header class="phead"><span class="plate">⚙</span><h2 class="ptitle">Mitt vinnuborð · ' + esc(nu()) + '</h2><span class="grow"></span>' +
        '<button type="button" class="btn gold sm" data-t5="cfg">Loka ›</button></header>' +
      core + rows +
      '<div class="cfgrow"><span class="plate">—</span><div class="cfgt"><b>Spjall</b><span>Slökkt í bili fyrir alla.</span></div><span></span><span class="lock">Slökkt</span></div>' +
      '<div class="cfgfoot">Breytingar vistast strax og fylgja þér á milli tölva og í appið. Hver hamur er sín opna: einingar hamsins fara efst — á breiðum skjá í dálkinn vinstra megin.</div>';
  }

  let _frestad = 0;
  function render() {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.classList.contains('active')) return;
    const root = rot();
    if (!root) return;
    const mount = root.querySelector('.t5-mount');
    // Opinn fellilisti lokast ef teiknað er undir honum — bíða þar til hann er frá.
    const ae = root.activeElement;
    if (ae && ae.tagName === 'SELECT') { clearTimeout(_frestad); _frestad = setTimeout(render, 1200); return; }
    const n = nu(), c = cfg(), mode = MODES[c.mode];
    const master = masterRows(), mine = mineRows();
    let selId = S.sel[n];
    if (!mine.some(r => r.id === selId)) selId = S.sel[n] = mine.length ? mine[0].id : null;
    const selRow = mine.find(r => r.id === selId) || null;
    const visible = master.filter(r => matchFilter(r, S.filter));
    const now = new Date();
    const hot = S.rows.filter(r => r.important).length;
    const ppl = folk();

    const top = mode.first.slice();
    if (isOn('dagskra') && top.indexOf('dagskra') < 0) top.unshift('dagskra');
    const topHtml = top.map(k => (k === 'dagskra' ? dagskraHtml() : bottomHtml(k))).join('');
    const bottom = BOTTOM.filter(k => isOn(k) && top.indexOf(k) < 0).map(bottomHtml).join('');

    let slots = '';
    for (let i = 0; i < LIMIT; i++) slots += '<span class="slot' + (i < mine.length ? ' on' : '') + '"></span>';
    const selMarkup = selHtml(selRow);
    const nyleg = master.filter(r => ageDays(r) <= 30).length;
    const bunki = master.filter(r => normW(r.assigned_to) === AI_WORKER).length;
    const fjoldi = f => master.filter(r => matchFilter(r, f)).length;

    const feed = !S.loaded && (S.loading || _dbBid) ? emptyHtml('Sæki mál…')
      : visible.length
        ? visible.slice(0, S.synd).map(feedRow).join('') +
          (visible.length > S.synd ? '<div class="pager"><button type="button" class="btn iv sm" data-t5="more">Sýna fleiri · ' + (visible.length - S.synd) + ' eftir</button></div>' : '')
        : emptyHtml(master.length ? 'Ekkert í þessari síu.' : (S.loaded ? 'Master borðið er tómt.' : 'Engin mál sótt enn.'));

    const board = mode.board
      ? '<div class="board" data-view="' + S.view + '">' +
          '<div class="seg phone-seg" role="group" aria-label="Borð">' +
            '<button type="button" data-t5="view" data-v="master" aria-pressed="' + (S.view === 'master') + '">Master borð<span class="c">' + master.length + '</span></button>' +
            '<button type="button" data-t5="view" data-v="mitt" aria-pressed="' + (S.view === 'mitt') + '">Mitt borð<span class="c">' + mine.length + '</span></button></div>' +
          '<section class="panel colmaster" aria-label="Master borð">' +
            '<header class="phead">' + plate('02') + '<h2 class="ptitle">Master borð</h2><span class="sum">' + master.length + ' mál</span><span class="grow"></span>' +
              '<div class="seg" role="group" aria-label="Sía">' + [['allt', 'Allt'], ['post', 'Póstar'], ['beidni', 'Beiðnir'], ['hot', 'Áríðandi']].map(f =>
                '<button type="button" data-t5="filter" data-f="' + f[0] + '" aria-pressed="' + (S.filter === f[0]) + '">' + f[1] + '<span class="c">' + fjoldi(f[0]) + '</span></button>').join('') + '</div>' +
              '<button type="button" class="btn gold sm" data-t5="take-next">Taka næsta ›</button></header>' +
            '<div class="psub">' + nyleg + ' síðustu 30 daga · ' + bunki + ' í bunka Charlize · Á borðum: ' +
              ppl.map(x => esc(x) + ' ' + S.rows.filter(r => onBoardOf(r, x)).length).join(' · ') + '</div>' +
            feed +
          '</section>' +
          '<section class="panel colmine" aria-label="Mitt borð">' +
            '<header class="phead">' + plate('03') + '<h2 class="ptitle">Mitt borð</h2>' +
              '<span class="slots" aria-label="' + mine.length + ' af ' + LIMIT + '">' + slots + '<span class="slotn' + (mine.length > LIMIT ? ' over' : '') + '">' + mine.length + '/' + LIMIT + '</span></span>' +
              '<span class="grow"></span><button type="button" class="btn iv sm" data-t5="take-next">Taka næsta ›</button></header>' +
            (mine.length > LIMIT ? '<div class="psub" style="color:var(--terra)">' + mine.length + ' mál á borðinu — skilaðu því sem bíður á Master</div>' : '') +
            (mine.length
              ? mine.map(r => mineRow(r, r.id === selId) + (r.id === selId ? '<div class="sel inline">' + selMarkup + '</div>' : '')).join('')
              : emptyHtml('Borðið þitt er autt.')) +
          '</section>' +
          '<section class="sel side colsel" aria-live="polite">' + selMarkup + '</section>' +
        '</div>'
      : '<button type="button" class="boardstrip" data-t5="mode" data-mode="thjonusta">' + plate('02') + '<b>Master borð</b><span class="v">' + master.length + ' mál</span>' +
          plate('03') + '<b>Mitt borð</b><span class="v">' + mine.length + ' / ' + LIMIT + '</span><span class="grow"></span><span class="v">Aftur í Þjónustu ›</span></button>';

    const layout = '<div class="layout' + (topHtml ? '' : ' nol') + (bottom ? '' : ' nor') + '">' +
      (topHtml ? '<aside class="rail left" aria-label="Einingar hamsins">' + topHtml + '</aside>' : '') +
      '<div class="main">' + board + '</div>' +
      (bottom ? '<aside class="rail right" aria-label="Aðrar einingar">' + bottom + '</aside>' : '') +
    '</div>';

    const html =
      '<div class="t5"><div class="col">' +
        '<div class="head"><div>' +
          '<div class="kicker">Þjónusta · ' + VIKUDAGUR[now.getDay()] + ' ' + now.getDate() + '. ' + MAN[now.getMonth()] + '</div>' +
          '<h1 class="h1">Þjónustuborð</h1>' +
          '<p class="meta">' + (c.mode !== 'thjonusta' ? 'Hamur: ' + mode.l + ' · ' : '') + master.length + ' á Master · ' + mine.length + ' á þínu borði · ' + hot + ' áríðandi' +
            '<span class="t5-sott">' + (S.loadedAt ? ' · sótt kl. ' + klukka(S.loadedAt) : '') + '</span></p>' +
          '<div class="beta">' +
            '<button type="button" class="btn iv sm" data-t5="go" data-view="verkbord">Gamla borðið ›</button></div>' +
        '</div><div class="acts">' +
          '<label class="who"><span class="lbl">Ég er</span><select data-t5="who" aria-label="Starfsmaður">' +
            (ppl.indexOf(n) < 0 ? '<option value="" selected disabled>Veldu nafn…</option>' : '') +
            ppl.map(x => '<option' + (x === n ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></label>' +
          '<button type="button" class="btn iv" data-t5="cfg" aria-expanded="' + S.cfgOpen + '">⚙ Mitt vinnuborð</button>' +
          '<button type="button" class="btn iv" data-t5="composer" aria-expanded="' + S.composer + '">+ Nýtt mál</button>' +
        '</div></div>' +
        (S.composer ? '<section class="panel" aria-label="Nýtt mál"><div class="composer">' +
            '<input type="text" data-k="nt" placeholder="Hvað þarf að gera?" aria-label="Titill máls">' +
            '<input type="text" data-k="nc" placeholder="Fyrirtæki (valfrjálst)" aria-label="Fyrirtæki">' +
            '<button type="button" class="btn gold sm" data-t5="composer-save">Setja á Master</button>' +
            '<button type="button" class="btn iv sm" data-t5="composer">Hætta við</button></div></section>' : '') +
        '<div class="modes"><span class="lbl">Hamur</span><div class="seg modeseg" role="group" aria-label="Hamur">' +
          Object.keys(MODES).map(k => '<button type="button" data-t5="mode" data-mode="' + k + '" aria-pressed="' + (c.mode === k) + '">' + MODES[k].l + '</button>').join('') +
        '</div></div>' +
        linksHtml(c.mode) +
        (ppl.indexOf(n) < 0 ? '<p class="err">„' + esc(n) + '“ er ekki starfsmaður á þessu borði' + (n === AI_WORKER ? ' — Charlize er bunkinn á Master' : '') + '. Veldu þitt nafn í „Ég er“.</p>' : '') +
        (S.cfgOpen ? '<section class="panel" aria-label="Mitt vinnuborð">' + cfgHtml() + '</section>' : '') +
        (S.err ? '<p class="err">Náði ekki í málin: ' + esc(S.err) + ' <button type="button" class="btn iv sm" data-t5="reload">Reyna aftur</button></p>' : '') +
        '<div class="kpis">' + kpiHtml(master, mine) + '</div>' +
        layout +
      '</div></div>';

    // Hálfskrifaður texti (nýtt mál, flýtileið) og fókus lifa endurteikningu af.
    const fokus = ae && ae.dataset ? ae.dataset.k : null;
    const drog = {};
    root.querySelectorAll('input[data-k]').forEach(i => { drog[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; });
    // Skrun innan pósts og vikunnar heldur sér ef sama mál er enn valið.
    const SKRUN = '.well p, .week, .seg.modeseg';
    const skrunSel = v.dataset.t5sel === String(selId);
    const skrun = [...root.querySelectorAll(SKRUN)].map(x => [x.scrollTop, x.scrollLeft]);
    mount.innerHTML = html;
    v.dataset.t5sel = String(selId);
    if (skrunSel) root.querySelectorAll(SKRUN).forEach((x, i) => { if (skrun[i]) { x.scrollTop = skrun[i][0]; x.scrollLeft = skrun[i][1]; } });
    root.querySelectorAll('input[data-k]').forEach(i => {
      const k = i.dataset.k;
      if (k in drog) { if (i.type === 'checkbox') i.checked = drog[k]; else i.value = drog[k]; }
    });
    if (fokus) { const f = root.querySelector('[data-k="' + fokus + '"]'); if (f) f.focus(); }
  }

  /* ── skilaboð ── */
  let _toastT = 0;
  function toast(msg, warn) {
    const host = rot() || document.body;
    let t = host.querySelector('.t5toast');
    if (!t) { t = document.createElement('div'); t.className = 't5toast'; t.setAttribute('role', 'status'); host.appendChild(t); }
    t.textContent = msg;
    t.className = 't5toast' + (warn ? ' warn' : '');
    t.hidden = false;
    clearTimeout(_toastT);
    _toastT = setTimeout(() => { t.hidden = true; }, warn ? 4200 : 2600);
  }

  /* ── atburðir (hlustað á skuggarótinni) ── */
  function onClick(e) {
    const v = document.getElementById(VIEW_ID), root = v && v.shadowRoot;
    if (!root || !v.classList.contains('active')) return;
    const el = e.target && e.target.closest ? e.target.closest('[data-t5]') : null;
    if (!el || el.tagName === 'SELECT') return;
    const a = el.dataset.t5, id = el.dataset.id ? Number(el.dataset.id) : null, m = el.dataset.m;
    const c = cfg();
    const krefstStillinga = () => { if (stillingarTilbunar()) return true; toast('Stillingarnar eru enn að hlaðast — reyndu aftur eftir augnablik.', true); return false; };
    const nyttId = () => 'lk' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    switch (a) {
      case 'take': take(id); return;
      case 'take-next': {
        const next = masterRows().filter(r => matchFilter(r, S.filter))[0];
        if (next) take(next.id); else toast('Ekkert á Master í þessari síu.');
        return;
      }
      case 'select': S.sel[nu()] = id; S.view = 'mitt'; render(); return;
      case 'done': done(id); return;
      case 'giveback': giveBack(id); return;
      case 'reply': reply(id); return;
      case 'company': openCompany(el.dataset.fid); return;
      case 'filter': S.filter = el.dataset.f; S.synd = PAGE; render(); return;
      case 'more': S.synd += PAGE; render(); return;
      case 'view': S.view = el.dataset.v; render(); return;
      case 'mode':
        if (!krefstStillinga()) return;
        c.mode = el.dataset.mode;
        S.filter = MODES[c.mode].filter || 'allt';
        S.synd = PAGE;
        S.view = 'master';
        render();
        vistaCfg({ mode: c.mode });
        return;
      case 'mod-open': S.open[openKey(m)] = !isOpen(m); render(); return;
      case 'cfg': S.cfgOpen = !S.cfgOpen; render(); return;
      case 'cfg-on':
        if (!krefstStillinga()) return;
        c.mods[m][0] = c.mods[m][0] ? 0 : 1;
        delete S.open[openKey(m)];
        render();
        vistaCfg({ mods: { [m]: c.mods[m].slice() } }, MODS[m].t + (c.mods[m][0] ? ' komið á vinnuborðið' : ' tekið af vinnuborðinu'));
        return;
      case 'cfg-def':
        if (!krefstStillinga()) return;
        c.mods[m][1] = el.dataset.v === '1' ? 1 : 0;
        delete S.open[openKey(m)];
        render();
        vistaCfg({ mods: { [m]: c.mods[m].slice() } });
        return;
      case 'composer':
        S.composer = !S.composer;
        render();
        if (S.composer) { const f = root.querySelector('[data-k="nt"]'); if (f) f.focus(); }
        return;
      case 'composer-save': {
        const t = root.querySelector('[data-k="nt"]'), cu = root.querySelector('[data-k="nc"]');
        const title = t ? t.value.trim() : '';
        if (!title) { toast('Skrifaðu hvað þarf að gera.', true); if (t) t.focus(); return; }
        el.disabled = true;
        createCase(title, cu ? cu.value.trim() : '').then(ok => {
          if (ok) { S.composer = false; render(); } else el.disabled = false;
        });
        return;
      }
      case 'link-add':
        S.linkForm = !S.linkForm;
        render();
        if (S.linkForm) { const f = root.querySelector('[data-k="ln"]'); if (f) f.focus(); }
        return;
      case 'link-edit': S.linkEdit = !S.linkEdit; render(); return;
      case 'link-save': {
        const ln = root.querySelector('[data-k="ln"]'), lu = root.querySelector('[data-k="lu"]'), lm = root.querySelector('[data-k="lm"]');
        const nafn = ln ? ln.value.trim().slice(0, 40) : '', slod = lagaSlod(lu ? lu.value : '');
        if (!nafn) { toast('Gefðu flýtileiðinni nafn.', true); if (ln) ln.focus(); return; }
        if (!slod) { toast('Slóðin þarf að vera vefslóð (t.d. keldan.is), /síða eða #síða í appinu.', true); if (lu) lu.focus(); return; }
        const modes = lm && lm.checked ? [c.mode] : [];
        el.disabled = true;
        vistaLinks(l => l.concat([{ id: nyttId(), nafn, slod, modes }]), 'Fest: ' + nafn).then(ok => {
          if (ok) { S.linkForm = false; render(); } else el.disabled = false;
        });
        return;
      }
      case 'link-quick': {
        const lm = root.querySelector('[data-k="lm"]');
        const modes = lm && lm.checked ? [c.mode] : [];
        vistaLinks(l => l.some(x => x.slod === el.dataset.slod) ? l : l.concat([{ id: nyttId(), nafn: el.dataset.nafn, slod: el.dataset.slod, modes }]), 'Fest: ' + el.dataset.nafn);
        return;
      }
      case 'link-del': vistaLinks(l => l.filter(x => x.id !== el.dataset.lid), 'Flýtileið fjarlægð'); return;
      case 'job-new':
        try { if (window.Vikudagskra && Vikudagskra.open) Vikudagskra.open(el.dataset.date); else toast('Dagskrárglugginn er ekki hlaðinn.', true); }
        catch (_) { toast('Dagskrárglugginn opnaðist ekki.', true); }
        return;
      case 'job-edit': {
        const j = jobsFor(nu()).find(x => String(x.id) === el.dataset.jid);
        if (!j) { toast('Verkið fannst ekki lengur á dagskránni.', true); render(); return; }
        try { Vikudagskra.open(j.date, j); } catch (_) { toast('Dagskrárglugginn opnaðist ekki.', true); }
        return;
      }
      case 'go': goView(el.dataset.view, el.dataset.anchor); return;
      case 'reload': load(); return;
    }
  }
  function onChange(e) {
    const el = e.target, v = document.getElementById(VIEW_ID);
    if (!v || !el || !el.dataset || el.dataset.t5 !== 'who' || !el.value) return;
    el.blur();
    S.view = 'master';
    S.synd = PAGE;
    try { if (window.BordStarfsmadur && BordStarfsmadur.set) BordStarfsmadur.set(el.value); } catch (_) {}
    render();
  }
  function onKey(e) {
    const v = document.getElementById(VIEW_ID), root = v && v.shadowRoot;
    if (!root || !v.classList.contains('active')) return;
    const k = e.target && e.target.dataset ? e.target.dataset.k : null;
    if (e.key === 'Enter' && (k === 'nt' || k === 'nc')) { e.preventDefault(); const b = root.querySelector('[data-t5="composer-save"]'); if (b && !b.disabled) b.click(); }
    if (e.key === 'Enter' && (k === 'ln' || k === 'lu')) { e.preventDefault(); const b = root.querySelector('[data-t5="link-save"]'); if (b && !b.disabled) b.click(); }
    if (e.key === 'Escape' && (S.composer || S.cfgOpen || S.linkForm)) { S.composer = false; S.cfgOpen = false; S.linkForm = false; render(); }
  }

  /* ── sýnin (sama mynstur og 310) ── */
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return true;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala') || document.querySelector('.view');
    if (!sample || !sample.parentElement) return false;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = (sample.className || 'view').replace(/\bactive\b/g, '').trim();
    v.style.display = 'none';
    sample.parentElement.appendChild(v);
    return true;
  }
  let _poll = 0;
  function show() {
    if (!ensureView()) return;
    document.querySelectorAll('[id^="view-"]').forEach(x => { x.style.display = 'none'; x.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    v.style.display = 'block';
    v.classList.add('active');
    // Hnappurinn „🔧 Þjónustuborð" ber data-view 'verkbord' (231 injectNav). 218 syncNav tekur
    // lýsinguna af eftir hash-leiðsögn, svo hún er sett aftur augnabliki síðar.
    const lysaNav = () => document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'verkbord' || b.dataset.view === NAV_KEY));
    lysaNav();
    setTimeout(() => { const vv = document.getElementById(VIEW_ID); if (vv && vv.classList.contains('active')) lysaNav(); }, 60);
    try { if (location.hash !== '#' + NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    S.filter = MODES[cfg().mode].filter || 'allt';
    render();
    load(S.loaded);
    clearInterval(_poll);
    _poll = setInterval(() => {
      const vv = document.getElementById(VIEW_ID);
      if (!vv || !vv.classList.contains('active')) { clearInterval(_poll); return; }
      if (!document.hidden) load(true);
    }, POLL_MS);
  }
  function patchSwitchView() {
    if (!window.App || window.App._t5SwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      const mine = document.getElementById(VIEW_ID);
      if (mine) { mine.style.display = 'none'; mine.classList.remove('active'); }
      clearInterval(_poll);
      return orig.apply(this, arguments);
    };
    window.App._t5SwitchPatched = true;
  }
  function openFromHash() {
    if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) return;
    const v = document.getElementById(VIEW_ID);
    if (v && v.classList.contains('active')) return;
    if (window.App && App.switchView) App.switchView(NAV_KEY); else show();
  }
  let _stSig = '';
  const stillingaSig = () => { const n = nu(); try { return JSON.stringify([n, P(CFG_KEY + '.by_staff.' + n), jobsFor(n), cardsFor(n), folk()]); } catch (_) { return String(Date.now()); } };
  function boot() {
    patchSwitchView();
    ensureView();
    window.addEventListener('hashchange', openFromHash);
    let rT = 0;
    window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(render, 200); });
    document.addEventListener('visibilitychange', () => {
      const v = document.getElementById(VIEW_ID);
      if (!document.hidden && v && v.classList.contains('active')) load(true);
    });
    // Stillingar breytast þegar HVAÐ SEM ER í appinu vistar — teiknað aðeins ef það snertir þetta borð.
    try {
      if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => {
        const s = stillingaSig();
        if (s === _stSig) return;
        _stSig = s;
        if (!_vistar) Object.keys(_cfg).forEach(k => delete _cfg[k]);
        render();
      });
    } catch (_) {}
    const aSkiptum = () => { S.view = 'master'; S.linkForm = false; S.linkEdit = false; render(); };
    if (window.BordStarfsmadur && BordStarfsmadur.onChange) BordStarfsmadur.onChange(aSkiptum);
    else (window.__bordStarfsmadurAskrift = window.__bordStarfsmadurAskrift || []).push(aSkiptum);
    openFromHash();
    setTimeout(() => { patchSwitchView(); ensureView(); openFromHash(); }, 1600);
    window.Thjonustubord5 = { show, load, render, version: '368g' };
    console.log('[368-thjonustubord5] installed (#bord)');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
/* === END ÞJÓNUSTUBORÐ 5 === */
