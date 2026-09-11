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
 * GAMLA BORÐIÐ FARIÐ 11.09.2026 (231 + 347 út): 368 festir hliðarstikuhnappinn sjálft (festaHnapp, data-view
 * 'verkbord'), tekur við #verkbord/#verkefni, setur óúthlutað > 30 d. í bunka Charlize (saekjaBunka) og sýnir fylgiskjöl.
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
 *   Setja á assigned_to = hver sem er / Master, skilyrt á eigandann sem var á skjánum („Færa á mig").
 *   Skila   assigned_to = null (231 setur það aftur á Charlize ef það er eldra en 30 daga).
 *   Lokið   status = 'lokad'.     Svarað  svarad_at + status i_vinnslu, eins og 231 gerir.
 *   Breyta  title/notes/due_at/status/important · Eyða deleted_at (með afturköllun).
 *   Tillaga summary = ein lína frá /api/tv-summary (Haiku) með sögu fyrirtækis og pósti; „Afturkalla" setur fyrri aftur.
 *   Hamur   tags += ham:<id> (skilyrt á updated_at). Hver hamur sýnir borðið með sínum málum: beint merki, eða flokkur/merki
 *           hamsins, og Samskipti tekur líka pósta. Þjónusta = ekki beint tengt öðrum ham. Sérsniðnir hamir:
 *           AppSettings thjonustubord5.hamir (Agnar 11.09.2026: „tengt málefni við ham.. ekki allt bara við þjónustu").
 *   Nýtt    á mig (sjálfgefið), Master eða annan; fyrirtæki valið úr tillögum (Companies.list).
 *
 * FLÆÐI (Agnar 11.09.2026: „pirrandi að geta ekki skoðað neitt nema sín 5 mál" · „burt með allar svona
 *   asnalegar hömlur" · „vill geta ýtt á fyrirtækin og skoðað að vild" · „allir eiga að geta sett sitt
 *   nafn á sín verk"): engin mörk á fjölda mála; hvaða opið mál sem er opnast í „Valið mál" (Master,
 *   annarra, leit, einingar); síur Öll opin / borð starfsmanns / fyrirtæki / Líklega búin; „Bara mitt
 *   borð"; fyrirtækið alltaf smellanlegt (#company/<id>, Ctrl-smellur = nýr flipi); leit í haus.
 *
 * LESIÐ OG VISTAÐ ANNARS STAÐAR (engin ný tafla):
 *   Vinnuborð hvers og eins  AppSettings thjonustubord5.by_staff.<nafn> = { mode, mods, links }
 *                            mode/mods sem smá-plástrar; links byggt á NÝJASTA lista við vistun
 *   Dagskrá                  vikudagskra.by_staff.<nafn>.jobs (303); skráð og breytt í glugga 303
 *   Skipulagsborð            skipulagsbord.by_staff.<nafn>.cards + .krass (sömu gögn og 305) — skrifað
 *                            beint hér: texti, litur, röð, mynd, eyða; drög lifa þar til þjónninn tekur við
 *   Saga fyrirtækis          fyrirtaeki_virkni (pg_cron 05:30 UTC + „↻ Uppfæra", sql/2026-09-11_fyrirtaeki_virkni.sql)
 *   Vinnublöð                sara_yfirferd.stada (364)
 *   Kröfur                   solur reikningur, ógreitt, ekki void (sama og listinn í 166)
 *   Póstur í völdu máli      email_digest eftir channel_ref 'email:<id>' (sama og 231; sýnin
 *                            v_samskipti_postur sleppir 8 af 18 opnum póstmálum)
 * ============================================================================================== */
(() => {
  if (window.__thjonustubord368) return;
  window.__thjonustubord368 = true;

  const VIEW_ID = 'view-bord', NAV_KEY = 'bord', CFG_KEY = 'thjonustubord5';
  const PAGE = 15, POLL_MS = 60000;     // engin mörk á fjölda mála á borði (Agnar 11.09.2026)
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
    ['Aksturslisti', '#aksturslisti']
  ];

  const MODS = {
    dagskra:   { n: '01', t: 'Dagskrá', d: 'Vikan í einni sýn. Plús skráir verk á daginn.' },
    skipulag:  { n: '05', t: 'Skipulagsborð', d: 'Spjöldin þín af skipulagsborðinu.' },
    vinnublod: { n: '06', t: 'Vinnublöð', d: 'Yfirferð vinnublaða: samþykkja, merkja klárað, sjá skýrslu og reikning.' },
    postsvor:  { n: '07', t: 'Póstsvörun', d: 'Póstmál sem bíða svars.' },
    akstur:    { n: '08', t: 'Aksturslistar', d: 'Listar 1–3 fyrir bílstjóra: færa á milli, prenta með samantekt, leið í korti.' },
    krofur:    { n: '09', t: 'Kröfur', d: 'Útistandandi kröfur: yfir gjalddaga, ósendar og fjárhæðir.' },
    // Úr gamla borðinu (231) — kveikt og slökkt í ⚙ Mitt vinnuborð (Agnar 11.09.2026).
    frestir:   { n: '10', t: 'Frestir', d: 'Opin mál með frest — liðnir fyrst.' },
    nyjast:    { n: '11', t: 'Nýjast', d: 'Nýjustu opnu málin, sama hver á þau.' },
    saga:      { n: '12', t: 'Saga fyrirtækis', d: 'Síðustu reikningar, greiðslur og skýrslur í völdu máli.' },
    breyta:    { n: '13', t: 'Breyta máli', d: 'Titill, lýsing, frestur, staða og áríðandi í völdu máli.' },
    forgangur: { n: '14', t: 'Forgangur', d: 'Áríðandi, liðnir frestir og kúnnar sem reka á eftir okkur.' },
    nymal:     { n: '15', t: 'Ný mál — greining', d: 'Mál merkt ný: aldur, útköll og það sem vantar heimilisfang.' },
    brunakerfi: { n: '16', t: 'Brunakerfi — hvert þarf að fara', d: 'Kerfi sem eru komin á tíma, á leiðinni eða í vinnslu.' },
    starfsmenn: { n: '17', t: 'Starfsmenn', d: 'Staðan hjá hverjum og einum: mál, ný, frestir og verk.' },
    ivinnslu:  { n: '18', t: 'Í vinnslu — er það búið?', d: 'Það sem er merkt í vinnslu, borið saman við skýrslur og reikninga.' },
    gleymt:    { n: '19', t: 'Gleymst að rukka?', d: 'Úttekt án reiknings, greitt síðar sem bíður, kort og reiðufé ekki merkt greitt.' },
    bakfaersla: { n: '20', t: 'Bakfærslur og breytingar', d: 'Beiðnir um bakfærslu eða breyttan reikning — mál, póstar og kreditreikningar.' },
    afgreidsla: { n: '21', t: 'Staðan í afgreiðslu', d: 'Kassinn: sala dagsins og vikunnar, opin drög og ógreitt.' }
  };
  const BOTTOM = ['skipulag', 'frestir', 'nyjast', 'vinnublod', 'postsvor', 'akstur', 'krofur', 'forgangur', 'nymal', 'brunakerfi', 'starfsmenn', 'ivinnslu', 'gleymt', 'bakfaersla', 'afgreidsla'];
  const I_VOLDU = ['saga', 'breyta'];
  const STODUR = [['nytt', 'Nýtt'], ['i_vinnslu', 'Í vinnslu'], ['bedid', 'Bíður'], ['tilbuid', 'Tilbúið'], ['lokad', 'Lokað']];
  const MODES = {
    thjonusta: { l: 'Þjónusta', board: true, first: [], filter: 'allt', flokkar: [], merki: [] },
    samskipti: { l: 'Samskipti', board: true, first: ['postsvor'], filter: 'allt', flokkar: ['samskipti'], merki: ['senda_tolvupost', 'hringja'] },
    skyrslur:  { l: 'Skýrslur', board: true, first: ['ivinnslu', 'vinnublod', 'skipulag'], filter: 'allt', flokkar: [], merki: ['senda_skyrslur'] },
    krofur:    { l: 'Kröfur', board: true, first: ['krofur', 'gleymt', 'bakfaersla', 'afgreidsla'], filter: 'allt', flokkar: ['rukkun'], merki: ['eftir_ad_rukka', 'bokhald'] },
    akstur:    { l: 'Akstur', board: true, first: ['forgangur', 'akstur', 'brunakerfi', 'nymal', 'starfsmenn', 'dagskra'], filter: 'allt', flokkar: ['brunakerfi'], merki: ['uppsetning', 'brunakerfi', 'arskodun'], tegundir: ['heimsokn', 'skodun_tilbod'] }
  };
  // Gömlu flokkarnir (thjonustubeidni.flokkur) og merkin (tags) úr 231 — sama orðaforði, svo hamir fyllast strax.
  const FLOKKAR = { thjonusta: 'Þjónusta', rukkun: 'Rukkun', tilbod: 'Tilboð', samskipti: 'Samskipti', brunakerfi: 'Brunakerfi' };
  const MERKI = { thjonusta: 'Þjónusta', eftir_ad_rukka: 'Eftir að rukka', bokhald: 'Bókhald', senda_skyrslur: 'Senda skýrslur', senda_tolvupost: 'Senda tölvupóst',
    thjonustusamningur: 'Þjónustusamningur', gera_tilbod: 'Gera tilboð', brunakerfi: 'Brunakerfi', hringja: 'Hringja', uppsetning: 'Uppsetning', draft: 'Draft', kvortun: 'Kvörtun' };
  const HAM_MERKI = 'ham:';
  const serHamir = () => { const l = P(CFG_KEY + '.hamir'); return Array.isArray(l) ? l.filter(h => h && h.id && h.l && !MODES[h.id]) : []; };
  function M(id) {
    if (MODES[id]) return MODES[id];
    const h = serHamir().find(x => x.id === id);
    return h ? { l: String(h.l), board: true, filter: 'allt', ser: true, first: (Array.isArray(h.first) ? h.first : []).filter(k => MODS[k]),
      flokkar: Array.isArray(h.flokkar) ? h.flokkar : [], merki: Array.isArray(h.merki) ? h.merki : [] } : null;
  }
  const hamaListi = () => Object.keys(MODES).concat(serHamir().map(h => h.id));
  // [kveikt, sjálfgefið opið] — flest samanbrotið. Forstillt eftir starfsmanni; hver og einn breytir í ⚙.
  const SJALFGEFID = { dagskra: [1, 0], skipulag: [0, 0], vinnublod: [0, 0], postsvor: [0, 0], akstur: [0, 0], krofur: [0, 0], frestir: [1, 0], nyjast: [0, 0], saga: [1, 1], breyta: [1, 0], forgangur: [0, 0], nymal: [0, 0], brunakerfi: [0, 0], starfsmenn: [0, 0], ivinnslu: [0, 0], gleymt: [0, 0], bakfaersla: [0, 0], afgreidsla: [0, 0] };
  const FYRIR = {
    'Agnar': { skipulag: [1, 1], vinnublod: [1, 0], krofur: [1, 0] },
    'Bjarndís': { vinnublod: [1, 1], postsvor: [1, 0] },
    'Afgreiðsla': { dagskra: [1, 1], akstur: [1, 0] }
  };

  const S = {
    rows: [], names: {}, loaded: false, loading: false, err: '', loadedAt: null,
    view: 'master', filter: 'allt', synd: PAGE, sel: {}, cfgOpen: false, open: {}, post: {},
    counts: { sara: null, krofur: null }, composer: false, busy: {}, linkForm: false, linkEdit: false,
    leit: { q: '', fyr: [], opid: false, idx: -1 }, ny: { q: '', fyr: null, tillogur: [], opid: false, idx: -1 },
    skDrog: {}, undo: null, virkni: {}, virkniBid: false, bmDrog: {}, bmOpid: {}, aiBid: {}
  };

  /* ── starfsmaður ── */
  const nu = () => { try { return (window.BordStarfsmadur && BordStarfsmadur.get()) || 'Agnar'; } catch (_) { return 'Agnar'; } };
  const folk = () => {
    let l = [];
    try { l = (window.BordStarfsmadur && BordStarfsmadur.list()) || []; } catch (_) {}
    if (!l.length) l = ['Agnar', 'Bjarndís', 'Binni', 'Anni', 'Hákon', 'Afgreiðsla', 'Charlize', 'Allir'];
    return l.filter((x, i) => x && l.indexOf(x) === i);
  };
  const canonW = v => { const s = String(v == null ? '' : v).trim(); return s === 'Sara' ? 'Bjarndís' : s; };
  const normW = v => { const s = canonW(v); return SENTINELS[s] ? '' : s; };
  const lagt = s => String(s || '').toLocaleLowerCase('is');
  const isFree = r => { const w = normW(r.assigned_to); return !w || w === AI_WORKER; };
  // Sýndarborðin: „Charlize" = bunkinn, „Allir" = sameiginleg verk. Önnur nöfn eins og áður.
  const onBoardOf = (r, n) => {
    const skr = lagt(canonW(r.assigned_to)), nn = lagt(n);
    if (nn === 'allir' || nn === lagt(AI_WORKER)) return !!skr && skr === nn;
    const w = normW(r.assigned_to);
    return !!w && w !== AI_WORKER && lagt(w) === nn;
  };

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
    return { mode: v && M(v.mode) ? v.mode : 'thjonusta', mods, baraMitt: !!(v && v.bara_mitt) };
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
  const inMode = k => (M(cfg().mode) || MODES.thjonusta).first.indexOf(k) >= 0;
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
  const SEL = 'id,title,notes,summary,status,type,important,due_at,created_at,updated_at,source,channel_ref,assigned_to,customer_base_id,fyrirtaeki_id,customer_nafn,svarad_at,tags,flokkur';
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
      // Saga fyrirtækja (fyrirtaeki_virkni) — aðeins fyrir viðskiptavini sem hafa ekki verið sóttir; morgunkeyrslan
      // og „↻ Uppfæra" sjá um að gögnin séu ný.
      const cbs = [...new Set(rows.map(x => x.customer_base_id).filter(Boolean))].filter(id => !(id in S.virkni));
      for (let i = 0; i < cbs.length; i += 150) {
        const hluti = cbs.slice(i, i + 150);
        const rv = await c.from('fyrirtaeki_virkni').select('customer_base_id,fyrirtaeki_id,sidasta_sala,sidasti_reikningur,sidasta_skyrsla,reiknad_at').in('customer_base_id', hluti);
        if (rv.error) break;
        hluti.forEach(id => { S.virkni[id] = null; });
        (rv.data || []).forEach(x => { S.virkni[x.customer_base_id] = x; });
        breytt = true;
      }
      const sig = JSON.stringify([rows.map(x => [x.id, x.assigned_to, x.status, x.updated_at, x.svarad_at, x.important, x.title, x.summary, JSON.stringify(x.tags || []), x.flokkur]), sara, krofur]);
      if (sig !== _sig || S.err || !S.loaded) breytt = true;
      _sig = sig;
      S.rows = rows;
      S.counts.sara = sara;
      S.counts.krofur = krofur;
      S.err = '';
      S.loaded = true;
      saekjaBunka(rows);
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
  // Óúthlutuð mál eldri en 30 daga fara í bunka Charlize — áður gert af 231 (claimOldJobs). Aðeins null/tómt (ekki
  // „Allir", sem er nú sameiginlegt borð), skilyrt svo úthlutun annarrar vélar étist ekki, og á 10 mín. fresti í vafra.
  let _bunkiVid = 0;
  async function saekjaBunka(rows) {
    const c = sb();
    if (!c || Date.now() - _bunkiVid < 600000) return;
    _bunkiVid = Date.now();
    const skil = Date.now() - 30 * 864e5;
    const ids = rows.filter(r => !canonW(r.assigned_to) && tStamp(r.created_at) && tStamp(r.created_at) < skil).map(r => r.id);
    if (!ids.length) return;
    let alls = 0;
    for (let i = 0; i < ids.length; i += 100) {
      const r = await c.from('thjonustubeidni').update({ assigned_to: AI_WORKER, updated_at: new Date().toISOString() })
        .in('id', ids.slice(i, i + 100)).or('assigned_to.is.null,assigned_to.eq.').select('id');
      if (r.error) { console.warn('[368] bunki Charlize', r.error.message); break; }
      alls += (r.data || []).length;
    }
    if (alls) load(true);
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
  const tagList = r => (Array.isArray(r.tags) ? r.tags : []).filter(t => typeof t === 'string');
  const skyrirHamir = r => tagList(r).filter(t => t.indexOf(HAM_MERKI) === 0).map(t => t.slice(HAM_MERKI.length)).filter(id => !!M(id));
  // Beint merki ræður. Þjónusta = ekki beint tengt öðrum ham. Aðrir hamir taka líka sinn flokk/merki (og Samskipti pósta).
  function iHam(r, id) {
    const sk = skyrirHamir(r);
    if (sk.indexOf(id) >= 0) return true;
    if (id === 'thjonusta') return !sk.length;
    const h = M(id);
    if (!h) return false;
    if (id === 'samskipti' && isPost(r)) return true;
    if (r.type && (h.tegundir || []).indexOf(r.type) >= 0) return true;
    if (r.flokkur && h.flokkar.indexOf(r.flokkur) >= 0) return true;
    const tags = tagList(r);
    return h.merki.some(t => tags.indexOf(t) >= 0);
  }
  const hamRows = () => { const m = cfg().mode; return S.rows.filter(r => iHam(r, m)); };
  const masterRows = () => hamRows().filter(r => isFree(r) && !onBoardOf(r, nu())).sort(rodun);
  const mineRows = () => hamRows().filter(r => onBoardOf(r, nu())).sort(rodun);
  const ageDays = r => { const t = tStamp(r.created_at); return t ? Math.max(0, Math.floor((Date.now() - t) / 864e5)) : 0; };
  const ageCls = a => (a >= 14 ? 'hot' : a <= 2 ? 'warm' : '');
  const whereOf = r => r.customer_nafn || S.names[r.customer_base_id] || '';
  const tegMals = r => isPost(r) ? 'Póstur' : (MAL_TEG[r.type] || (r.type && String(r.type).length < 24 ? String(r.type) : 'Beiðni'));
  function aiLine(r) {
    const s = String(r.summary || '').trim();
    if (s) return s.slice(0, 220);
    return (String(r.notes || '').split('\n').map(x => x.trim()).find(Boolean) || '').slice(0, 220);
  }
  // Síur: allt/post/beidni/hot velja úr Master · 'oll' = öll opin mál · 'p:<nafn>' = borð eins
  // starfsmanns · 'f:<id>' = opin mál eins fyrirtækis.
  const serSia = f => f === 'oll' || /^[pf]:/.test(f);
  const matchFilter = (r, f) => f === 'allt' || serSia(f) || (f === 'buid' ? !!virkniEftir(r) : f === 'hot' ? !!r.important : f === 'post' ? isPost(r) : !isPost(r));
  function feedRows(master) {
    const f = S.filter;
    if (f === 'oll') return S.rows.slice().sort(rodun);
    if (/^p:/.test(f)) return S.rows.filter(r => onBoardOf(r, f.slice(2))).sort(rodun);
    if (/^f:/.test(f)) return S.rows.filter(r => String(r.fyrirtaeki_id) === f.slice(2)).sort(rodun);
    return master.filter(r => matchFilter(r, f));
  }

  /* ── skrif (lesið til baka) ── */
  // sia: true = aðeins ef málið er enn laust · { adur } = aðeins ef eigandinn er enn sá sem var á skjánum.
  async function patchRow(id, patch, sia) {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    let q = c.from('thjonustubeidni').update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq('id', id);
    if (sia === true) q = q.or(LAUS_SIA);
    else if (sia && 'adur' in sia) q = sia.adur == null ? q.is('assigned_to', null) : q.eq('assigned_to', sia.adur);
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
  // Engin mörk á fjölda mála (Agnar 11.09.2026: „burt með allar svona asnalegar hömlur").
  function take(id) {
    const n = nu();
    if (folk().indexOf(n) < 0) { toast('Veldu þitt nafn í „Ég er“ fyrst.', true); return; }
    const r = S.rows.find(x => x.id === id);
    if (r && !isFree(r)) return setjaA(id, n);
    return act(id, async () => {
      const rows = await patchRow(id, { assigned_to: n }, true);
      if (!rows.length) { toast('Einhver annar tók þetta mál rétt í þessu.', true); return; }
      if (lagt(canonW(rows[0].assigned_to)) !== lagt(n)) throw new Error('las til baka „' + rows[0].assigned_to + '“');
      S.sel[n] = id;
      if (!cfg().baraMitt) S.view = 'mitt';
      toast('Komið á borðið þitt');
    });
  }
  // Setja mál á hvern sem er — mig, annan starfsmann eða Master (tómt). Skilyrt á eigandann sem var
  // á skjánum, svo breyting á annarri vél á sama augnabliki étist ekki þegjandi.
  function setjaA(id, hver) {
    const r = S.rows.find(x => x.id === id);
    if (!r) return;
    const n = nu(), nyr = canonW(hver) || null;
    if ((canonW(r.assigned_to) || null) === nyr) return;
    return act(id, async () => {
      const rows = await patchRow(id, { assigned_to: nyr }, { adur: r.assigned_to == null ? null : r.assigned_to });
      if (!rows.length) { toast('Málið hafði breyst á annarri vél — sýni nýjustu stöðu.', true); return; }
      if ((canonW(rows[0].assigned_to) || null) !== nyr) throw new Error('las til baka „' + rows[0].assigned_to + '“');
      S.sel[n] = id;
      toast(!nyr ? 'Sett á Master' : lagt(nyr) === lagt(n) ? 'Komið á borðið þitt' : 'Sett á borð ' + nyr);
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
  async function createCase(o) {
    const c = sb();
    if (!c) { toast('Engin tenging við gagnagrunn', true); return false; }
    let nafn = o.cust || null, baseId = null, fid = null;
    try {
      const q = o.fyr && o.fyr.id
        ? c.from('fyrirtaeki').select('id,nafn,customer_base_id').eq('id', o.fyr.id).limit(1)
        : nafn ? c.from('fyrirtaeki').select('id,nafn,customer_base_id').ilike('nafn', nafn.replace(/[%_\\]/g, x => '\\' + x)).is('deleted_at', null).limit(2) : null;
      const rf = q ? await q : null;
      if (rf && rf.data && rf.data.length === 1) { nafn = rf.data[0].nafn; baseId = rf.data[0].customer_base_id || null; fid = rf.data[0].id; }
    } catch (_) {}
    const n = nu(), eigandi = canonW(o.eigandi) || null, nuna = new Date().toISOString();
    const obj = {
      title: o.title, notes: o.lysing || '', type: 'annad', status: 'nytt', priority: 'venjulegur',
      customer_nafn: nafn, customer_base_id: baseId, fyrirtaeki_id: fid, assigned_to: eigandi, tags: o.ham && o.ham !== 'thjonusta' && M(o.ham) ? [HAM_MERKI + o.ham] : [],
      source: 'beint', important: !!o.aridandi, due_at: /^\d{4}-\d{2}-\d{2}$/.test(o.frestur || '') ? new Date(o.frestur + 'T12:00:00').toISOString() : null,
      created_at: nuna, created_by: n, updated_at: nuna
    };
    const r = await c.from('thjonustubeidni').insert(obj).select('id').single();
    if (r.error || !r.data) { toast('Málið vistaðist ekki: ' + ((r.error && r.error.message) || 'ekkert svar'), true); return false; }
    S.sel[n] = r.data.id;
    toast((!eigandi ? 'Komið á Master borð' : lagt(eigandi) === lagt(n) ? 'Komið á borðið þitt' : 'Komið á borð ' + eigandi) + (fid ? ' · tengt ' + nafn : '') + (o.ham && o.ham !== 'thjonusta' && M(o.ham) ? ' · ' + M(o.ham).l : ''));
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
  const spjold = n => cardsFor(n).slice().sort((a, b) => (+a.slot || 0) - (+b.slot || 0));
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
      '.fbody{min-width:0}',
      '.fpick{display:block;width:100%;min-width:0;padding:0;margin:0;border:0;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}',
      '.fpick .rt,.fpick .ai{display:block}',
      '.fpick .rt,.mt,.lpick b{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}',
      '.fpick:hover .rt,.mpick:hover .mt{text-decoration:underline;text-decoration-color:var(--g6);text-underline-offset:3px}',
      '.frow[aria-current="true"]{background:rgba(241,237,228,.75);box-shadow:inset 3px 0 0 var(--g6)}',
      '.clink{display:inline;padding:0;margin:0;border:0;background:none;font:inherit;letter-spacing:inherit;text-transform:inherit;color:var(--g8);text-decoration:underline;text-decoration-color:rgba(184,137,46,.45);text-underline-offset:2px;cursor:pointer}',
      '.clink:hover{color:var(--ink);text-decoration-color:var(--g6)}',
      '.clink.dk{color:#e8cb7a;text-decoration-color:rgba(232,203,122,.5)}.clink.dk:hover{color:#fff3b0}',
      '.shead{display:flex;align-items:center;gap:10px}',
      '.sx{width:28px;height:28px;flex:none;border:1px solid #3a3732;border-radius:4px;background:#1c1b18;color:var(--on2);font:700 13px/1 var(--body);cursor:pointer;padding:0}',
      '.sfyr{font-size:14px;font-weight:600;color:var(--on)}',
      '.sacts.sm2{align-items:center;padding-top:10px;border-top:1px solid #2a2823}',
      '.setja{display:inline-flex;align-items:center;gap:8px}',
      '.setja select{height:36px;min-width:140px;padding:0 10px;border:1px solid #3a3732;border-radius:4px;background:#1c1b18;color:var(--on);font:600 13px var(--body)}',
      '.pchip{margin:2px 0 0 6px;padding:1px 7px;border:1px solid var(--edge);border-radius:10px;background:var(--key);font:600 10.5px var(--mono);letter-spacing:.06em;color:var(--ink2);cursor:pointer;text-transform:uppercase}',
      '.pchip[aria-pressed="true"]{background:var(--gside);color:var(--ink)}',
      '.board.bara{grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);grid-template-rows:auto;grid-template-areas:"mine sel"}',
      '.mt{display:block;font-family:var(--disp);font-size:16px;font-weight:700;line-height:1.25;margin:4px 0 2px;overflow-wrap:anywhere;color:var(--ink)}',
      '.mn{display:block;margin:0 0 8px;font-size:12.5px;color:var(--ink2)}',
      '.mfoot{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:6px}',
      '.sel{background:var(--slab);border:1px solid #000;border-top:3px solid transparent;border-image:var(--gline) 1;border-image-width:3px 0 0 0;border-radius:5px;color:var(--on);box-shadow:var(--slabsh);padding:14px 18px 18px;display:flex;flex-direction:column;gap:12px;min-width:0}',
      '.sel.inline{margin:0 10px 12px}',
      // Á tölvu límist valið mál við skjáinn á meðan skrunað er niður listann.
      '.sel.side{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto}',
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
      '.leit{position:relative;max-width:640px}',
      '.leit input{width:100%;height:40px;padding:0 14px;border:1px solid var(--edge);border-radius:5px;background:var(--well);box-shadow:var(--wellsh);font:14px var(--body);color:var(--ink)}',
      '.pop{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:60;max-height:min(60vh,520px);overflow:auto;background:#fff;border:1px solid var(--rule3);border-radius:5px;box-shadow:0 18px 40px -12px rgba(22,21,19,.45)}',
      '.plbl{padding:8px 14px 4px;font:600 10px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}',
      '.pitem{display:flex;align-items:center;gap:10px;width:100%;padding:8px 14px;border:0;border-top:1px solid var(--rule2);background:none;text-align:left;font:inherit;color:var(--ink);cursor:pointer}',
      '.pitem.on,.pitem:hover{background:#f6f2e8}',
      '.pmain{display:flex;flex-direction:column;flex:1;min-width:0;color:inherit;text-decoration:none}',
      '.pitem b{font-size:13.5px;overflow-wrap:anywhere}.pitem span{font-size:12px;color:var(--mute)}.pmal{flex-direction:column;align-items:flex-start;gap:1px}',
      '.pnone{padding:10px 14px;font-size:12.5px;color:var(--mute)}',
      '.composer.ny{grid-template-columns:minmax(0,2fr) minmax(0,1.4fr) auto;align-items:start}',
      '.nyfyr{position:relative;min-width:0}.nyfyr input{width:100%}.valid{display:block;margin-top:3px;font-size:11.5px;font-weight:600;color:var(--green)}',
      '.nylbl{display:flex;flex-direction:column;gap:3px}.nylbl select,.nylbl input{height:34px;padding:0 8px;border:1px solid var(--edge);border-radius:4px;background:#fff;font:13px var(--body);color:var(--ink)}',
      '.composer textarea{grid-column:1 / 3;min-height:34px;padding:7px 10px;border:1px solid var(--edge);border-radius:4px;background:#fff;font:13px var(--body);color:var(--ink);resize:vertical}',
      '.nychk{display:flex;align-items:center;gap:6px;font-size:13px}.nybtn{display:flex;gap:8px;grid-column:1 / -1;justify-content:flex-end}',
      '.t5toast .undo{margin-left:12px;height:26px;padding:0 10px;border:1px solid #5a4410;border-radius:4px;background:var(--gside);color:#1b1405;font:700 12px var(--body);cursor:pointer}',
      '.skwrap{display:flex;flex-direction:column;gap:12px;padding:12px 14px}.krass{display:flex;flex-direction:column;gap:4px}',
      '.krass textarea{width:100%;min-height:70px;padding:10px 12px;border:1px solid var(--edge);border-radius:4px;background:#fffdf7;box-shadow:var(--wellsh);font:13.5px/1.55 var(--body);color:var(--ink);resize:vertical}',
      '.skgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;align-items:start}',
      '.skc{display:flex;flex-direction:column;gap:4px;padding:6px 8px 8px;border:1px solid var(--rule);border-top:4px solid var(--rule3);border-radius:4px;background:linear-gradient(180deg,#fff,#fbf9f5);box-shadow:var(--keysh);min-width:0}',
      '.skc.yfir{outline:2px dashed var(--g6);outline-offset:2px}.skh{display:flex;align-items:center;gap:4px}',
      '.skgrip{cursor:grab;color:var(--mute);font-size:15px;padding:0 4px 0 0;user-select:none}',
      '.skdot{width:12px;height:12px;border-radius:50%;border:1px solid rgba(0,0,0,.2);padding:0;cursor:pointer;opacity:.4}.skdot.on{opacity:1;box-shadow:0 0 0 2px #fff,0 0 0 3px var(--ink2)}',
      '.skb{min-width:24px;height:24px;padding:0 6px;border:1px solid var(--edge);border-radius:3px;background:var(--key);font:600 12px/1 var(--body);color:var(--ink2);cursor:pointer}.skb[disabled]{opacity:.35;cursor:default}.skx{color:var(--terra)}',
      '.skn{width:100%;border:0;border-bottom:1px dashed transparent;background:transparent;font:700 14px var(--body);color:var(--ink);padding:3px 2px}.skn:focus{outline:none;border-bottom-color:var(--g6)}',
      '.skt{width:100%;border:0;background:transparent;font:13px/1.45 var(--body);color:var(--ink2);padding:2px;resize:vertical;min-height:38px}.skt:focus{outline:none;background:#fffdf7}',
      '.skm{display:flex;flex-direction:column;align-items:flex-start;gap:4px}.skm img{max-width:100%;max-height:160px;border-radius:3px;border:1px solid var(--rule2)}',
      '.skf{font-size:11.5px;color:var(--mute)}.skstada{font-size:11.5px;color:var(--mute)}',
      '.sknew{min-height:96px;border:1px dashed var(--edge2);border-radius:4px;background:transparent;font:600 13px var(--body);color:var(--mute);cursor:pointer}.sknew:hover{background:#fffdf7;color:var(--ink)}',
      '.saga{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border:1px solid #2a2823;border-radius:4px;background:#11100e}',
      '.saga.buid{border-color:rgba(74,160,106,.6);box-shadow:inset 3px 0 0 #4aa06a}',
      '.sg-h{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px}.sg-buid{font-size:12px;font-weight:700;color:#8fd3a6}',
      '.sg-r{height:26px;padding:0 10px;border:1px solid #3a3732;border-radius:4px;background:#1c1b18;color:var(--on2);font:600 11.5px var(--body);cursor:pointer}.sg-r[disabled]{opacity:.6;cursor:progress}',
      '.sg-l{display:flex;flex-direction:column;gap:3px;font-size:12.5px;color:var(--on2)}.sg-l b{color:var(--on)}',
      '.sg-l em{font-style:normal;font-weight:700}.sg-l em.ok{color:#8fd3a6}.sg-l em.bid{color:#e8b06a}.sg-m{font-size:11px;color:var(--on3)}',
      '.lpick{display:block;padding:0;margin:0;border:0;background:none;text-align:left;font:inherit;color:inherit;cursor:pointer}.lpick:hover b{text-decoration:underline;text-decoration-color:var(--g6);text-underline-offset:3px}',
      '.bm-t{align-self:flex-start}.bm{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border:1px solid #2a2823;border-radius:4px;background:#11100e}',
      '.bm label{display:flex;flex-direction:column;gap:3px;min-width:0}.bm-r{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:flex-end}',
      '.bm input,.bm textarea,.bm select{padding:6px 9px;border:1px solid #3a3732;border-radius:4px;background:#1c1b18;color:var(--on);font:13px var(--body)}.bm textarea{resize:vertical;min-height:70px}',
      '.bm .bm-c{flex-direction:row;align-items:center;gap:6px;color:var(--on2);font-size:13px}',
      '.hchips{display:flex;align-items:center;flex-wrap:wrap;gap:6px}',
      '.hchip{height:26px;padding:0 10px;border:1px solid #3a3732;border-radius:13px;background:#1c1b18;color:var(--on2);font:600 11.5px var(--body);cursor:pointer}',
      '.hchip.on{background:var(--gside);border-color:#5a4410;color:#1b1405}.hchip.auto{border-style:dashed;border-color:rgba(232,203,122,.6);color:#e8cb7a}',
      '.tag.ham{border-color:rgba(184,137,46,.55);color:var(--g8)}',
      '.hamform .hf{display:flex;flex-direction:column;gap:12px;padding:12px 16px}.hamform .nylbl{max-width:360px}',
      '.hgrp{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px}.hgrp .lbl{flex-basis:100%}',
      '.hchk{display:inline-flex;align-items:center;gap:5px;font-size:12.5px;color:var(--ink2)}.hnote{font-size:12px;color:var(--mute)}',
      '.aklist{display:flex;flex-direction:column}.akrow{display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:10px;align-items:start;padding:9px 14px;border-top:1px solid var(--rule2)}',
      '.akrow:first-child{border-top:0}.aknr{font:700 12px var(--mono);color:var(--mute);padding-top:2px}',
      '.akinfo{display:flex;flex-direction:column;gap:2px;min-width:0}.akinfo .s{font-size:12px;color:var(--mute);overflow-wrap:anywhere}.akacts{display:flex;gap:4px}',
      'a.btn{text-decoration:none}',
      '.sect{padding:10px 14px 4px;font:600 10px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}',
      '.stbl-w{overflow-x:auto;padding:6px 10px}.stbl{width:100%;border-collapse:collapse;font-size:12.5px}',
      '.stbl th{font:600 10px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--mute);text-align:left;padding:6px;border-bottom:1px solid var(--rule)}',
      '.stbl td{padding:6px;border-bottom:1px solid var(--rule2);font-variant-numeric:tabular-nums}.stbl td.hot{color:var(--terra);font-weight:700}',
      '.kbox .km{font-size:11px;color:var(--mute);margin-top:2px}',
      '.vbsia{padding:10px 14px 4px}.vbrow{display:flex;flex-direction:column;gap:6px;padding:10px 14px;border-top:1px solid var(--rule2)}',
      '.vbrow.buid{background:rgba(47,122,74,.06);box-shadow:inset 3px 0 0 var(--green)}',
      '.vbhead{display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px}.vbhead .clink,.vbhead b{font-weight:700;font-size:14px;text-transform:none;letter-spacing:0}.vbhead .s{font-size:12px;color:var(--mute)}',
      '.vbl{margin:0;padding:8px 12px;list-style:none;border:1px solid var(--rule2);border-radius:4px;background:var(--well);font-size:12.5px}.vbl li{display:flex;gap:8px;justify-content:space-between;padding:2px 0}',
      '.vbtexti{font-size:12.5px;white-space:pre-line;color:var(--ink2)}.vbspurn{font-size:12.5px;color:var(--terra);font-weight:600}',
      '.hreinsun .hrsia{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 14px;border-bottom:1px solid var(--rule2)}.hrlist{max-height:60vh;overflow:auto}',
      '.hrrow{display:grid;grid-template-columns:20px 44px minmax(0,1fr);gap:10px;align-items:start;padding:9px 14px;border-top:1px solid var(--rule2)}.hrrow:first-child{border-top:0}',
      '.hrrow input{margin:3px 0 0;width:16px;height:16px;cursor:pointer}.hrinfo{display:flex;flex-direction:column;gap:2px;min-width:0}.hrinfo .s{font-size:12px;color:var(--mute);overflow-wrap:anywhere}',
      '.tfbanner{display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;margin:0 0 6px;padding:8px 12px;border:1px solid var(--g6);border-radius:5px;background:#fff8e6;font-size:13px;font-weight:600;color:var(--ink)}',
      '.tftak{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}',
      '.fskjol{display:flex;flex-direction:column;gap:6px;padding:10px 12px;border:1px solid #2a2823;border-radius:4px;background:#11100e}',
      '.fsupp{display:inline-flex;align-items:center;cursor:pointer}.fslist{display:flex;flex-direction:column;gap:4px}',
      '.fsrow{display:flex;align-items:center;gap:8px;min-width:0}.fsrow .clink{overflow-wrap:anywhere}',
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
        '.cards{grid-template-columns:minmax(0,1fr)}.lrow{grid-template-columns:44px minmax(0,1fr)}.lrow .btn,.lrow .lock,.lrow .tag{grid-column:2;justify-self:start}}',
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
        '.composer,.composer.ny{grid-template-columns:minmax(0,1fr)}.composer textarea{grid-column:auto}.leit{max-width:none}' +
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
    r.addEventListener('input', onInput);
    r.addEventListener('focusout', e => { const el = e.target; if (el && el.dataset && el.dataset.sk) skola(el.dataset.sk === 'krass' ? '__krass' : el.dataset.skid); });
    ['dragstart', 'dragover', 'drop', 'dragend'].forEach(t => r.addEventListener(t, onDrag));
    r.addEventListener('paste', onPaste);
    document.addEventListener('visibilitychange', () => { if (document.hidden) skolaAllt(); });
    window.addEventListener('pagehide', skolaAllt);
    return r;
  }

  /* ── teikning ── */
  const plate = n => '<span class="plate">' + n + '</span>';
  const emptyHtml = t => '<div class="empty"><span class="coin" aria-hidden="true"></span>' + t + '</div>';
  const wellHtml = (label, text) => '<div class="well"><div class="slabel">' + esc(label) + '</div><p>' + esc(text) + '</p></div>';
  const fmtD = iso => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.getDate() + '. ' + MAN[d.getMonth()].slice(0, 3) + '.'; };
  const klukka = d => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const dis = id => (S.busy[id] ? ' disabled' : '');

  // Fyrirtækið er alltaf smellanlegt. Tengt fyrirtæki fær raunverulega slóð (#company/<id>, 357), svo
  // Ctrl-smellur eða miðjuhnappur opnar það í nýjum flipa; annars er flett upp eftir viðskiptavini.
  function fyrLink(r, cls) {
    const w = whereOf(r);
    if (!w) return '';
    const k = 'clink' + (cls ? ' ' + cls : '');
    return r.fyrirtaeki_id
      ? '<a class="' + k + '" href="#company/' + r.fyrirtaeki_id + '" data-t5="fyr" data-id="' + r.id + '" title="Opna ' + esc(w) + '">' + esc(w) + '</a>'
      : '<button type="button" class="' + k + '" data-t5="fyr" data-id="' + r.id + '" title="Finna ' + esc(w) + '">' + esc(w) + '</button>';
  }
  const eigandaTexti = (r, n) => onBoardOf(r, n) ? 'Á þínu borði'
    : isFree(r) ? (normW(r.assigned_to) === AI_WORKER ? 'Í bunka Charlize' : lagt(canonW(r.assigned_to)) === 'allir' ? 'Á borði Allir' : 'Á Master')
    : 'Hjá ' + normW(r.assigned_to);
  // Sönnun þess að verkið sé líklega búið: reikningur, sala eða skýrsla hjá sama viðskiptavini EFTIR að málið
  // varð til (Engjasel 31: uppsetningarmálið stóð opið þótt reikningurinn hefði verið greiddur 14.08).
  function virkniEftir(r) {
    const v = r && r.customer_base_id ? S.virkni[r.customer_base_id] : null;
    if (!v) return null;
    const upphaf = tStamp(r.created_at), eftir = [];
    const rk = v.sidasti_reikningur, sl = v.sidasta_sala, sk = v.sidasta_skyrsla;
    if (rk && tStamp(rk.dags) > upphaf) eftir.push('reikningur');
    else if (sl && tStamp(sl.dags) > upphaf) eftir.push('sala');
    if (sk && tStamp(sk.dags) > upphaf) eftir.push('skýrsla');
    return eftir.length ? eftir : null;
  }
  const kr = x => Math.round(Number(x) || 0).toLocaleString('is-IS').replace(/,/g, '.') + ' kr.';
  function sagaHtml(r) {
    if (!isOn('saga') || !r.customer_base_id) return '';
    const v = S.virkni[r.customer_base_id], eftir = virkniEftir(r), linur = [];
    if (v === undefined) linur.push('<span class="sg-m">Sæki sögu fyrirtækisins…</span>');
    else if (!v) linur.push('<span class="sg-m">Engin sala né skýrsla skráð hjá þessu fyrirtæki.</span>');
    else {
      const rk = v.sidasti_reikningur, sl = v.sidasta_sala, sk = v.sidasta_skyrsla;
      if (rk) linur.push('<span>🧾 <b>Reikningur ' + esc(rk.num || '') + '</b> · ' + esc(fmtD(rk.dags)) + ' · ' + kr(rk.samtals) + ' · ' +
        (rk.paid_at ? '<em class="ok">greiddur ' + esc(fmtD(rk.paid_at)) + '</em>' : (rk.krafa_sent_at ? 'krafa send ' + esc(fmtD(rk.krafa_sent_at)) + ' · ' : '') + '<em class="bid">ógreiddur</em>') + '</span>');
      if (sl && (!rk || sl.id !== rk.id)) linur.push('<span>🛒 <b>Sala ' + esc(sl.num || '') + '</b> · ' + esc(fmtD(sl.dags)) + ' · ' + kr(sl.samtals) + '</span>');
      if (sk) linur.push('<span>📄 <b>' + (sk.doc_type === 'brunakerfi' ? 'Brunakerfisskýrsla' : 'Úttektarskýrsla') + '</b> · ' + esc(fmtD(sk.dags)) + '</span>');
    }
    return '<div class="saga' + (eftir ? ' buid' : '') + '">' +
      '<div class="sg-h"><span class="slabel">Saga fyrirtækisins</span>' +
        (eftir ? '<span class="sg-buid">✓ Líklega afgreitt — ' + esc(eftir.join(' og ')) + ' eftir að málið varð til</span>' : '') +
        '<span class="grow"></span><button type="button" class="sg-r" data-t5="virkni-uppf"' + (S.virkniBid ? ' disabled' : '') + ' title="Reikna sölur, reikninga og skýrslur upp á nýtt">' + (S.virkniBid ? 'Uppfæri…' : '↻ Uppfæra') + '</button></div>' +
      '<div class="sg-l">' + linur.join('') + '</div>' +
      (v && v.reiknad_at ? '<div class="sg-m">Uppfært ' + esc(fmtD(v.reiknad_at)) + ' kl. ' + klukka(new Date(v.reiknad_at)) + ' · uppfærist sjálfkrafa á hverjum morgni</div>' : '') +
    '</div>';
  }
  // ✨ Tillaga — sami endapunktur og gamla borðið (/api/tv-summary, Haiku): ein stutt lína um næsta skref,
  // vistuð í summary. Nýja borðið sendir sögu fyrirtækisins og póstinn með (dagsetningar fullar svo líkanið geti
  // borið saman „Stofnað" og SAGA), svo „búið og greitt" sjáist. Fyrri samantekt glatast ekki: „Afturkalla".
  async function aiTillaga(id) {
    const r = S.rows.find(x => x.id === id);
    if (!r || S.aiBid[id]) return;
    S.aiBid[id] = true;
    render();
    const fyrri = r.summary || '';
    const dd = s => { const d = new Date(s); return isNaN(d.getTime()) ? '' : String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); };
    try {
      if (isPost(r) && postOf(r) === undefined) await loadPost(r);
      // Borið saman HÉR, ekki af líkaninu (prófað 11.09: nýtt mál með eldri greiddum reikningi fékk „Líklega búið").
      const v = r.customer_base_id ? S.virkni[r.customer_base_id] : null, p = isPost(r) ? postOf(r) : null, eftir = [], eldri = [];
      const upphaf = tStamp(r.created_at), rada = (x, lysing) => (tStamp(x.dags) > upphaf ? eftir : eldri).push(lysing);
      if (v && v.sidasti_reikningur) rada(v.sidasti_reikningur, 'reikningur ' + (v.sidasti_reikningur.num || '') + ' ' + dd(v.sidasti_reikningur.dags) + (v.sidasti_reikningur.paid_at ? ' greiddur ' + dd(v.sidasti_reikningur.paid_at) : ' ógreiddur'));
      if (v && v.sidasta_skyrsla) rada(v.sidasta_skyrsla, (v.sidasta_skyrsla.doc_type === 'brunakerfi' ? 'brunakerfisskýrsla ' : 'úttektarskýrsla ') + dd(v.sidasta_skyrsla.dags));
      const texti = String((p && (p.body_preview || p.snippet)) || r.notes || '').replace(/\s+/g, ' ').trim();
      const notes = ['Stofnað ' + dd(r.created_at), eigandaTexti(r, nu()), r.due_at ? 'frestur ' + dd(r.due_at) : '',
        isPost(r) ? (r.svarad_at ? 'svarað ' + dd(r.svarad_at) : 'ósvarað') : '',
        // Eldri saga er EKKI send: líkanið las hana sem „búið" (prófað 11.09, 6/6 röng). Hún sést í spjaldinu.
        eftir.length ? 'SAGA EFTIR STOFNUN: ' + eftir.join(', ') : '',
        texti ? 'TEXTI: ' + texti : ''].filter(Boolean).join(' · ');
      const res = await fetch('/api/tv-summary', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ items: [{ id: r.id, customer_nafn: whereOf(r), type: tegMals(r), title: r.title || '', notes }] }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) throw new Error(data.error || ('HTTP ' + res.status));
      const txt = String((data.summaries || {})[String(r.id)] || '').trim();
      if (!txt) { toast('Engin tillaga kom til baka.', true); return; }
      // Borðið veit hvort eitthvað kom eftir stofnun — það ræður, ekki líkanið.
      if (!eftir.length && /l[ií]klega\s+b[uú]i[ðd]/i.test(txt)) {
        toast('Tillagan sagði „Líklega búið" en engin sala eða skýrsla kom eftir að málið varð til — ekki vistað.', true);
        return;
      }
      const rows = await patchRow(id, { summary: txt });
      if (!rows.length) throw new Error('málið fannst ekki');
      r.summary = txt;
      toast('✨ ' + txt, false, fyrri ? () => act(id, async () => { await patchRow(id, { summary: fyrri }); toast('Fyrri samantekt er komin aftur'); }) : null);
    } catch (e) {
      toast('Tillagan kom ekki: ' + ((e && e.message) || e), true);
    } finally {
      delete S.aiBid[id];
      render();
      load(true);
    }
  }
  async function uppfaeraVirkni() {
    const c = sb();
    if (!c || S.virkniBid) return;
    S.virkniBid = true;
    render();
    let skil = null;
    try { const r = await c.rpc('bh_fyrirtaeki_virkni_uppfaera'); if (r.error) throw r.error; skil = r.data; }
    catch (e) { toast('Uppfærslan tókst ekki: ' + ((e && e.message) || e), true); }
    S.virkni = {};
    S.virkniBid = false;
    await load(true);
    if (skil != null) toast(skil === -1 ? 'Sagan var uppfærð fyrir innan við mínútu — sýni nýjustu stöðu.' : 'Saga fyrirtækja uppfærð');
  }

  function feedRow(r, valid) {
    const a = ageDays(r), ai = aiLine(r), n = nu(), w = fyrLink(r);
    const tags = (r.important ? '<span class="tag hot">Áríðandi</span>' : '') +
      (r.due_at ? '<span class="tag">Frestur ' + esc(fmtD(r.due_at)) + '</span>' : '') +
      (r.status === 'i_vinnslu' ? '<span class="tag">Í vinnslu</span>' : '') +
      (isPost(r) && r.svarad_at ? '<span class="tag ok">Svarað</span>' : '') +
      (virkniEftir(r) ? '<span class="tag ok" title="Reikningur, sala eða skýrsla eftir að málið varð til">Líklega afgreitt</span>' : '') +
      (!isFree(r) ? '<span class="tag">' + esc(eigandaTexti(r, n)) + '</span>' : '') +
      skyrirHamir(r).filter(k => k !== cfg().mode).map(k => '<span class="tag ham">' + esc(M(k).l) + '</span>').join('');
    const hlid = onBoardOf(r, n) ? '<span class="lock">Þitt</span>'
      : '<button type="button" class="btn iv sm" data-t5="take" data-id="' + r.id + '"' + dis(r.id) +
        (isFree(r) ? '>' : ' title="Færa málið af borði ' + esc(normW(r.assigned_to)) + ' á þitt borð">') +
        (S.busy[r.id] ? 'Augnablik…' : isFree(r) ? 'Taka ›' : 'Færa á mig ›') + '</button>';
    return '<article class="frow" aria-current="' + !!valid + '">' +
      '<div class="age ' + ageCls(a) + '" title="' + a + ' dagar síðan málið varð til">' + a + 'D</div>' +
      '<div class="fbody"><div class="kick">' + esc(tegMals(r)) + (w ? ' · ' + w : '') + '</div>' +
        '<button type="button" class="fpick" data-t5="skoda" data-id="' + r.id + '" title="Skoða málið">' +
          '<span class="rt">' + esc(r.title || '(ónefnt mál)') + '</span>' +
          (ai ? '<span class="ai">' + esc(ai) + '</span>' : '') + '</button>' +
        (tags ? '<div class="tags">' + tags + '</div>' : '') + '</div>' + hlid +
    '</article>';
  }
  function mineRow(r, valid) {
    const a = ageDays(r), w = fyrLink(r), ai = aiLine(r);
    return '<div class="mrow" aria-current="' + valid + '">' +
      '<span class="pin" aria-hidden="true">◆</span>' +
      '<div><div class="kick">' + esc(tegMals(r)) + (w ? ' · ' + w : '') + '</div>' +
        '<button type="button" class="mpick" data-t5="select" data-id="' + r.id + '">' +
          '<span class="mt">' + esc(r.title || '(ónefnt mál)') + '</span>' +
          (ai && !valid ? '<span class="mn">' + esc(ai) + '</span>' : '') +
        '</button>' +
        '<div class="mfoot"><span class="age ' + ageCls(a) + '">' + a + 'D</span>' +
          (r.due_at ? '<span class="lock">Frestur ' + esc(fmtD(r.due_at)) + '</span>' : '') +
          (r.important ? '<span class="tag hot">Áríðandi</span>' : '') +
          (isPost(r) ? (r.svarad_at ? '<span class="tag ok">Svarað</span>' : '<span class="tag">Bíður svars</span>') : '') +
          (virkniEftir(r) ? '<span class="tag ok">Líklega afgreitt</span>' : '') +
          '<span class="grow"></span>' +
          '<button type="button" class="btn iv sm" data-t5="done" data-id="' + r.id + '"' + dis(r.id) + '>✓ Lokið</button>' +
          '<button type="button" class="btn iv sm" data-t5="giveback" data-id="' + r.id + '"' + dis(r.id) + '>↩ Skila</button>' +
        '</div></div></div>';
  }
  // Breyta máli — sömu reitir og „⋯ Meira" á gamla borðinu. Drög lifa í S.bmDrog (valið mál er teiknað
  // tvisvar: hliðarspjald og í línunni í síma) og teikning bíður á meðan skrifað er.
  function breytaHtml(r) {
    if (!isOn('breyta')) return '';
    if (!S.bmOpid[r.id]) return '<button type="button" class="sg-r bm-t" data-t5="bm-opna" data-id="' + r.id + '">✏️ Breyta máli</button>';
    const d = S.bmDrog[r.id] || {}, g = (k, v) => (d[k] != null ? d[k] : v), reitur = (k, x) => ' data-bm="' + k + '" data-id="' + r.id + '"' + (x || '');
    return '<div class="bm">' +
      '<label><span class="slabel">Titill</span><input' + reitur('title') + ' value="' + esc(g('title', r.title || '')) + '"></label>' +
      '<label><span class="slabel">Lýsing og athugasemdir</span><textarea' + reitur('notes') + ' rows="4">' + esc(g('notes', r.notes || '')) + '</textarea></label>' +
      '<div class="bm-r">' +
        '<label><span class="slabel">Frestur</span><input type="date"' + reitur('due') + ' value="' + esc(g('due', r.due_at ? ymd(new Date(r.due_at)) : '')) + '"></label>' +
        '<label><span class="slabel">Staða</span><select' + reitur('status') + '>' +
          STODUR.map(s => '<option value="' + s[0] + '"' + (g('status', r.status || 'nytt') === s[0] ? ' selected' : '') + '>' + s[1] + '</option>').join('') + '</select></label>' +
        '<label class="bm-c"><input type="checkbox"' + reitur('important', g('important', !!r.important) ? ' checked' : '') + '> Áríðandi</label></div>' +
      '<div class="sacts"><button type="button" class="btn gold" data-t5="bm-vista" data-id="' + r.id + '"' + dis(r.id) + '>Vista breytingar</button>' +
        '<button type="button" class="btn iv" data-t5="bm-opna" data-id="' + r.id + '">Loka</button><span class="grow"></span>' +
        '<button type="button" class="btn iv" data-t5="bm-eyda" data-id="' + r.id + '"' + dis(r.id) + '>🗑 Eyða máli</button></div>' +
    '</div>';
  }
  function bmSkra(el) {
    const id = Number(el.dataset.id);
    if (id) (S.bmDrog[id] = S.bmDrog[id] || {})[el.dataset.bm] = el.type === 'checkbox' ? el.checked : el.value;
  }
  function selHtml(r) {
    if (!r) return emptyHtml('Smelltu á hvaða mál sem er til að skoða það — eða taktu næsta af Master.<button type="button" class="btn gold" data-t5="take-next">Taka næsta af Master ›</button>');
    const n = nu(), a = ageDays(r), post = isPost(r), minn = onBoardOf(r, n), laust = isFree(r), eigandi = normW(r.assigned_to);
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
    const b = (cls, t5, txt) => '<button type="button" class="btn ' + cls + '" data-t5="' + t5 + '" data-id="' + r.id + '"' + dis(r.id) + '>' + txt + '</button>';
    const taka = minn ? '' : b('gold lg', 'take', S.busy[r.id] ? 'Augnablik…' : laust ? 'Taka á mitt borð ›' : 'Færa á mitt borð ›');
    const svara = getaSvarad ? b(minn ? 'gold lg' : 'iv', 'reply', '↩ Svara í sama þræði') : '';
    const lokid = minn && !getaSvarad ? b('gold lg', 'done', '✓ Merkja lokið') : b('iv', 'done', '✓ Lokið');
    const skila = minn ? b('iv', 'giveback', '↩ Skila á Master') : '';
    const fyr = whereOf(r) ? b('iv', 'fyr', '🏢 Opna fyrirtæki ›') : '';
    const setja = '<label class="setja"><span class="slabel">Setja á</span><select data-t5="assign" data-id="' + r.id + '"' + dis(r.id) + ' aria-label="Setja málið á">' +
      '<option value=""' + (!canonW(r.assigned_to) ? ' selected' : '') + '>Master</option>' +
      folk().map(x => '<option' + (lagt(x) === lagt(canonW(r.assigned_to)) ? ' selected' : '') + '>' + esc(x) + '</option>').join('') +
      (canonW(r.assigned_to) && !folk().some(x => lagt(x) === lagt(canonW(r.assigned_to))) ? '<option selected>' + esc(canonW(r.assigned_to)) + '</option>' : '') +
      '</select></label>';
    const stada = minn ? 'Á þínu borði' : laust ? 'Á Master' : 'Á borði ' + eigandi;
    const meta = [tegMals(r), stada, r.due_at ? 'Frestur ' + fmtD(r.due_at) : '', r.important ? 'Áríðandi' : '', post ? (r.svarad_at ? 'Svarað ' + fmtD(r.svarad_at) : 'Bíður svars') : ''].filter(Boolean).join(' · ');
    const w = fyrLink(r, 'dk');
    return '<div class="shead"><span class="plate dark">04</span><span class="slabel">' + (minn ? 'Valið mál' : 'Til skoðunar') + '</span><span class="grow"></span>' +
        '<span class="age ' + ageCls(a) + '">' + a + 'D</span><button type="button" class="sx" data-t5="sel-close" aria-label="Loka málinu">✕</button></div>' +
      '<h3 class="stitle">' + esc(r.title || '(ónefnt mál)') + '</h3>' +
      (w ? '<div class="sfyr">🏢 ' + w + '</div>' : '') +
      '<div class="smeta">' + esc(meta) + '</div>' +
      (r.summary ? '<div class="aisum"><span class="slabel">Samantekt</span>' + esc(String(r.summary).slice(0, 600)) + '</div>' : '') +
      sagaHtml(r) + skjolHtml(r) + well +
      '<div class="sacts">' + taka + svara + lokid + skila + fyr + '</div>' +
      '<div class="sacts sm2">' + setja + aksturVal(r) + (!r.fyrirtaeki_id ? b('iv', 'tf-leita', '🏢 Tengja fyrirtæki') : '') + b('iv', 'sk-add', '📋 Á skipulagsborð') + b('iv', 'vd-add', '🗓 Á dagskrá') +
        '<button type="button" class="btn iv" data-t5="ai-tillaga" data-id="' + r.id + '"' + (S.aiBid[r.id] ? ' disabled' : '') +
          ' title="Gervigreind les málið, póstinn og sögu fyrirtækisins og leggur til næsta skref">' + (S.aiBid[r.id] ? '… hugsa' : '✨ Tillaga') + '</button></div>' + hamirHtml(r) + breytaHtml(r);
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
  /* ── einingar sem sækja gögn: latar, geymdar í 5 mín (engin sókn við hverja 60 s könnun) ── */
  const G = {};
  function gogn(lykill, saekja, maxAldur) {
    const g = G[lykill] || (G[lykill] = {});
    if (!g.bid && (!g.at || Date.now() - g.at > (maxAldur || 300000))) {
      g.bid = true;
      Promise.resolve().then(saekja).then(d => { g.data = d; g.villa = ''; }, e => { g.villa = (e && e.message) || String(e); })
        .then(() => { g.bid = false; g.at = Date.now(); render(); });
    }
    return g;
  }
  const gleyma = forskeyti => Object.keys(G).forEach(x => { if (x.indexOf(forskeyti) === 0) delete G[x]; });
  const uppfTakki = forskeyti => '<button type="button" class="btn iv sm tog" data-t5="g-uppf" data-g="' + esc(forskeyti) + '" title="Sækja nýjustu gögn" aria-label="Uppfæra">↻</button>';

  /* ── aksturslistar (267 ArsAkstur: arsskodun_customers[fid].akstur = 1–3) ── */
  function aksturslistar() {
    const a = P('arsskodun_customers') || {}, out = { 1: [], 2: [], 3: [] };
    Object.keys(a).forEach(id => { const v = +((a[id] || {}).akstur) || 0; if (v >= 1 && v <= 3 && +id) out[v].push(+id); });
    return out;
  }
  async function saekjaStopp(ids) {
    const c = sb();
    if (!c || !ids.length) return [];
    const [rf, ru] = await Promise.all([
      c.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,postnumer,simi,farsimi,"tengiliður",tengilidur,plan_note').in('id', ids),
      c.from('v_uttaeki_fid_rollup').select('fyrirtaeki_id,units,slt,bsl,rs').in('fyrirtaeki_id', ids)
    ]);
    if (rf.error) throw rf.error;
    const tae = {};
    (ru.data || []).forEach(x => { tae[x.fyrirtaeki_id] = x; });
    return (rf.data || []).map(f => Object.assign({}, f, { taeki: tae[f.id] || null }))
      .sort((a, b) => String(a.postnumer || '').localeCompare(String(b.postnumer || '')) || String(a.heimilisfang || '').localeCompare(String(b.heimilisfang || ''), 'is'));
  }
  const simiAf = f => [f.simi, f.farsimi].filter(Boolean).join(' / ');
  const mapsSlod = stopp => 'https://www.google.com/maps/dir/' + stopp.filter(f => f.heimilisfang).slice(0, 10)
    .map(f => encodeURIComponent([f.heimilisfang, f.postnumer].filter(Boolean).join(' '))).join('/');
  function aksturVal(r) {
    if (!r.fyrirtaeki_id || !window.ArsAkstur) return '';
    let nu0 = 0;
    try { nu0 = +ArsAkstur.of(r.fyrirtaeki_id) || 0; } catch (_) {}
    return '<label class="setja"><span class="slabel">🚗 Akstur</span><select data-t5="ak-mal" data-fid="' + r.fyrirtaeki_id + '" aria-label="Aksturslisti">' +
      ['Enginn listi', 'Listi 1', 'Listi 2', 'Listi 3'].map((l, v) => '<option value="' + v + '"' + (nu0 === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>';
  }
  async function setjaAkstur(fid, n) {
    if (!window.ArsAkstur || !ArsAkstur.set) { toast('Aksturslistarnir eru ekki hlaðnir.', true); return; }
    let ok = false;
    try { ok = await ArsAkstur.set(fid, n); } catch (_) {}
    toast(ok ? (n ? 'Komið á aksturslista ' + n : 'Tekið af aksturslista') : 'Vistaðist ekki — reyndu aftur.', !ok);
    gleyma('akstur:');
    render();
  }
  // Prentað blað fyrir bílstjórann: samantekt efst (stopp, tæki, opin mál, póstnúmer), svo stoppin í póstnúmeraröð.
  async function prentaAksturslista(n) {
    const ids = aksturslistar()[n] || [];
    if (!ids.length) { toast('Listi ' + n + ' er tómur.', true); return; }
    const w = window.open('', '_blank');                  // strax við smell, svo sprettigluggavörn stöðvi ekki
    if (!w) { toast('Vafrinn lokaði glugganum — leyfðu sprettiglugga fyrir síðuna.', true); return; }
    w.document.write('<p style="font:14px system-ui">Sæki aksturslista…</p>');
    let stopp;
    try { stopp = await saekjaStopp(ids); } catch (e) { w.document.body.textContent = 'Náði ekki í listann: ' + ((e && e.message) || e); return; }
    const d = new Date(), dags = d.getDate() + '. ' + MAN[d.getMonth()] + ' ' + d.getFullYear();
    const sum = stopp.reduce((s, f) => { const t = f.taeki || {}; s.units += t.units || 0; s.slt += t.slt || 0; s.bsl += t.bsl || 0; s.rs += t.rs || 0; return s; }, { units: 0, slt: 0, bsl: 0, rs: 0 });
    const malAf = f => S.rows.filter(r => r.fyrirtaeki_id === f.id);
    const opinMal = stopp.reduce((s, f) => s + malAf(f).length, 0);
    const pnr = stopp.map(f => f.postnumer).filter(Boolean);
    const lina = (f, i) => {
      const t = f.taeki || {}, teng = f['tengiliður'] || f.tengilidur || '';
      const gera = malAf(f).map(r => '• ' + esc(r.title || '') + (r.summary ? ' — ' + esc(String(r.summary).slice(0, 120)) : '')).join('<br>') +
        (f.plan_note ? (malAf(f).length ? '<br>' : '') + '✈ ' + esc(f.plan_note) : '');
      return '<tr><td class="n">' + (i + 1) + '</td><td><b>' + esc(f.nafn || '') + '</b>' + (f.kennitala ? '<br><small>' + esc(f.kennitala) + '</small>' : '') + '</td>' +
        '<td>' + esc(f.heimilisfang || '') + '<br><small>' + esc(f.postnumer || '') + '</small></td>' +
        '<td>' + esc(simiAf(f)) + (teng ? '<br><small>' + esc(teng) + '</small>' : '') + '</td>' +
        '<td class="t">' + (t.units ? t.units + '<br><small>SLT ' + (t.slt || 0) + ' · BSL ' + (t.bsl || 0) + ' · RS ' + (t.rs || 0) + '</small>' : '—') + '</td>' +
        '<td>' + (gera || '<small>—</small>') + '</td><td class="c">☐</td></tr>';
    };
    w.document.open();
    w.document.write('<!doctype html><html lang="is"><head><meta charset="utf-8"><title>Aksturslisti ' + n + ' — ' + dags + '</title><style>' +
      '@page{size:A4 landscape;margin:12mm}body{font:12px/1.4 system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;margin:14px}' +
      'h1{font-size:20px;margin:0 0 4px}.sub{color:#555;margin:0 0 10px}' +
      '.sum{display:flex;gap:22px;flex-wrap:wrap;border:1px solid #bbb;border-radius:6px;padding:8px 12px;margin:0 0 12px}.sum b{font-size:15px}' +
      'table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ccc;padding:6px;text-align:left;vertical-align:top}' +
      'th{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#444;border-bottom:2px solid #111}' +
      'td.n{width:22px;font-weight:700}td.t{white-space:nowrap}td.c{width:24px;font-size:18px;text-align:center}small{color:#555}' +
      '.bil{margin-top:14px;color:#555}@media print{.np{display:none}}</style></head><body>' +
      '<p class="np"><button onclick="print()">🖨 Prenta</button></p>' +
      '<h1>Aksturslisti ' + n + ' · ' + esc(dags) + '</h1><p class="sub">Póstnúmeraröð · Bílstjóri: ______________________</p>' +
      '<div class="sum"><span><b>' + stopp.length + '</b> stopp</span>' +
        '<span><b>' + sum.units + '</b> tæki (SLT ' + sum.slt + ' · BSL ' + sum.bsl + ' · RS ' + sum.rs + ')</span>' +
        '<span><b>' + opinMal + '</b> opin mál á stoppunum</span>' +
        (pnr.length ? '<span>Póstnúmer ' + esc(pnr[0]) + (pnr.length > 1 ? '–' + esc(pnr[pnr.length - 1]) : '') + '</span>' : '') + '</div>' +
      '<table><thead><tr><th>#</th><th>Fyrirtæki</th><th>Heimilisfang</th><th>Sími / tengiliður</th><th>Tæki</th><th>Hvað á að gera</th><th>✓</th></tr></thead><tbody>' +
      stopp.map(lina).join('') + '</tbody></table><p class="bil">Samtals ' + stopp.length + ' stopp.</p></body></html>');
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (_) {} }, 400);
  }

  function akTakki(fid) {
    let v = 0;
    try { v = window.ArsAkstur ? (+ArsAkstur.of(fid) || 0) : 0; } catch (_) {}
    return v ? '<span class="tag ok" title="Á aksturslista ' + v + '">🚗 ' + v + '</span>'
      : [1, 2, 3].map(n => '<button type="button" class="skb" data-t5="ak-setja" data-fid="' + fid + '" data-v="' + n + '" title="Setja á aksturslista ' + n + '">🚗' + n + '</button>').join('');
  }
  // Rekur einhver á eftir okkur: ≥2 póstar frá sama sendanda á 14 dögum án svars frá okkur, eða ítrekunarorð á 30 dögum.
  // (Mælt 11.09.2026: merkin eru fá — 1–2 í einu — svo listinn á að vera stuttur og raunverulegur.)
  async function saekjaElt() {
    const c = sb();
    if (!c) return { eltir: [], itrek: [] };
    const r = await c.from('email_digest').select('id,folder,sender_email,sender_name,subject,snippet,to_addresses,received_at')
      .eq('account', 'eldklar@eldklar.is').gte('received_at', new Date(Date.now() - 30 * 864e5).toISOString()).order('received_at', { ascending: false }).limit(800);
    if (r.error) throw r.error;
    const rows = r.data || [], fraOkkur = m => m.folder === 'SENT' || /eldklar/i.test(m.sender_email || '');
    const SJALFVIRKT = /no-?reply|mailer-daemon|notification|bounce/i, REIKN = /sölureikning|reikningur nr|kvittun|pöntun afgreidd|order confirmation|greiðsluse/i;
    const ut = rows.filter(fraOkkur);
    const inn = rows.filter(m => !fraOkkur(m) && !SJALFVIRKT.test(m.sender_email || '') && !REIKN.test(m.subject || ''));
    const svarad = (netfang, eftir) => ut.some(m => String(m.to_addresses || '').toLowerCase().indexOf(netfang) >= 0 && tStamp(m.received_at) > eftir);
    const fjortan = Date.now() - 14 * 864e5, hopar = {};
    inn.filter(m => tStamp(m.received_at) >= fjortan).forEach(m => { const k = String(m.sender_email || '').toLowerCase(); if (k) (hopar[k] = hopar[k] || []).push(m); });
    const eltir = Object.keys(hopar).map(k => ({ netfang: k, mails: hopar[k] })).filter(h => h.mails.length >= 2 && !svarad(h.netfang, tStamp(h.mails[0].received_at)));
    const ORD = /ítrek|itrek|bíð enn|bíðum enn|hef ekki heyrt|höfum ekki heyrt|minni á|enn ekki fengið|hvenær (komið|getið|kemur)/i;
    const itrek = inn.filter(m => ORD.test((m.subject || '') + ' ' + (m.snippet || '')) && !svarad(String(m.sender_email || '').toLowerCase(), tStamp(m.received_at))
      && !eltir.some(h => h.netfang === String(m.sender_email || '').toLowerCase()));
    return { eltir, itrek };
  }
  // Sama regla og Brunakerfi-yfirlitið (272): engin skýrsla í ár, mánuður síðustu skýrslu kominn, ekki nýtt.
  async function saekjaBrunakerfi() {
    const c = sb();
    if (!c) return [];
    const velja = (f, t) => c.from('customer_documents').select('fyrirtaeki_id,year,doc_date,storage_path,drive_file_id').eq('doc_type', 'brunakerfi').not('fyrirtaeki_id', 'is', null).range(f, t);
    const docs = window.DB && DB.fetchAll ? await DB.fetchAll(velja, 1000) : ((await velja(0, 999)).data || []);
    const kort = P('brunakerfi_customers') || {};
    const ids = [...new Set(docs.map(d => d.fyrirtaeki_id).concat(Object.keys(kort).filter(x => !!kort[x]).map(Number)).filter(Boolean))];
    if (!ids.length) return [];
    const rf = await c.from('fyrirtaeki').select('id,nafn,heimilisfang,postnumer,simi,farsimi,"tengiliður"').in('id', ids);
    if (rf.error) throw rf.error;
    const ars = P('arsskodun_customers') || {}, AR = new Date().getFullYear(), MAN_NU = new Date().getMonth() + 1;
    return (rf.data || []).map(f => {
      const skjol = docs.filter(d => d.fyrirtaeki_id === f.id && d.year && (d.storage_path || d.drive_file_id) && !/\.html?(\b|$)/i.test(String(d.storage_path || '')));
      const latest = skjol.reduce((m, d) => Math.max(m, +d.year || 0), 0);
      const nyjast = skjol.filter(d => +d.year === latest && d.doc_date).sort((a, b) => tStamp(b.doc_date) - tStamp(a.doc_date))[0];
      const latestMonth = nyjast ? new Date(nyjast.doc_date).getUTCMonth() + 1 : 0;
      const done = skjol.some(d => +d.year === AR);
      const nytt = !skjol.length || !!(window.NyttBadge && NyttBadge.is && NyttBadge.is(f.id));
      const wip = !done && +((ars[String(f.id)] || {}).field_inspected_year) === AR;
      return Object.assign({}, f, { latest, latestMonth, done, nytt, wip,
        due: !done && !nytt && !wip && latestMonth > 0 && latestMonth <= MAN_NU, upcoming: !done && !nytt && !wip && latestMonth > MAN_NU });
    });
  }

  /* ── Skýrslur: vinnublöð (sara_yfirferd) og það sem er í vinnslu ── */
  async function saekjaSkyrslur() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const AR = new Date().getFullYear();
    const rv = await c.from('sara_yfirferd').select('*').in('stada', ['bidur', 'samthykkt']);
    if (rv.error) throw rv.error;
    const blod = rv.data || [], ars = P('arsskodun_customers') || {};
    const iVinnslu = Object.keys(ars).filter(id => +((ars[id] || {}).field_inspected_year) === AR && +((ars[id] || {}).last_year_inspected) !== AR).map(Number).filter(Boolean);
    const fids = [...new Set(blod.map(b => b.fyrirtaeki_id).filter(Boolean).concat(iVinnslu))];
    const D = { blod, iVinnslu, fyr: [], skjol: [], solur: [], systkin: {}, AR };
    if (!fids.length) return D;
    const rf = await c.from('fyrirtaeki').select('id,nafn,customer_base_id').in('id', fids);
    if (rf.error) throw rf.error;
    D.fyr = rf.data || [];
    const bases = [...new Set(D.fyr.map(f => f.customer_base_id).filter(Boolean))];
    const tomt = Promise.resolve({ data: [] });
    const [rd, rs, rsy] = await Promise.all([
      c.from('customer_documents').select('fyrirtaeki_id,doc_type,doc_date,year').in('fyrirtaeki_id', fids).in('doc_type', ['uttektarskyrsla', 'brunakerfi']).eq('year', AR).not('is_duplicate', 'is', true),
      bases.length ? c.from('solur').select('num,customer_base_id,created_at,samtals,greitt_med,paid_at,is_credit').in('customer_base_id', bases).eq('status', 'final').gte('created_at', AR + '-01-01') : tomt,
      bases.length ? c.from('fyrirtaeki').select('id,customer_base_id').in('customer_base_id', bases).is('deleted_at', null) : tomt
    ]);
    D.skjol = rd.data || [];
    D.solur = (rs.data || []).filter(s => !s.is_credit);
    (rsy.data || []).forEach(x => { D.systkin[x.customer_base_id] = (D.systkin[x.customer_base_id] || 0) + 1; });
    return D;
  }
  // Dagsetning vinnublaðs: dagsetning (dd.mm.áááá), annars 1. dagur mánaðarins (manudur), annars 0 = óþekkt.
  function blodDags(b, AR) {
    const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(b.dagsetning || '').trim());
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]).getTime();
    const t = String(b.manudur || '').trim().toLowerCase(), i = MAN.findIndex(x => t.indexOf(x) === 0);
    return i >= 0 ? new Date(AR, i, 1).getTime() : 0;
  }
  function sonnun(fid, fra, D) {
    const f = D.fyr.find(x => x.id === fid) || null;
    const sk = D.skjol.filter(d => d.fyrirtaeki_id === fid && (!d.doc_date || tStamp(d.doc_date) >= fra)).sort((a, b) => tStamp(b.doc_date) - tStamp(a.doc_date))[0] || null;
    const rk = f && f.customer_base_id ? D.solur.filter(s => s.customer_base_id === f.customer_base_id && tStamp(s.created_at) >= fra).sort((a, b) => tStamp(b.created_at) - tStamp(a.created_at))[0] || null : null;
    return { sk, rk, nafn: f ? f.nafn : '', systkin: f && f.customer_base_id ? (D.systkin[f.customer_base_id] || 0) : 0 };
  }
  const vbListi = D => D.blod.map(b => { const fra = blodDags(b, D.AR), x = sonnun(b.fyrirtaeki_id, fra, D); return Object.assign(x, { b, fra, buid: !!(x.sk && x.rk) }); });
  function vbSamtals(b) {
    let ex = 0, vsk = 0;
    (Array.isArray(b.linur) ? b.linur : []).forEach(l => { const e = (+l.n || 0) * (+l.v || 0); ex += e; vsk += e * ((isFinite(+l.vsk) && l.vsk !== '' && l.vsk != null ? +l.vsk : 24) / 100); });
    const auka = (+b.akstur || 0) * (+b.akstur_verd || 0) + (+b.skyrslugerd || 0);
    return Math.round(ex + auka + vsk + auka * 0.24);
  }
  function vbInnihald(b) {
    const linur = Array.isArray(b.linur) ? b.linur : [];
    return (linur.length || +b.akstur || +b.skyrslugerd ? '<ul class="vbl">' +
        linur.map(l => '<li><span>' + esc(l.l || '(lína)') + '</span><span>' + esc(String(l.n || 0)) + ' × ' + kr(l.v) + '</span></li>').join('') +
        (+b.akstur ? '<li><span>Akstur</span><span>' + esc(String(b.akstur)) + ' × ' + kr(b.akstur_verd) + '</span></li>' : '') +
        (+b.skyrslugerd ? '<li><span>Skýrslugerð</span><span>' + kr(b.skyrslugerd) + '</span></li>' : '') + '</ul>' : '') +
      (b.texti ? '<div class="vbtexti">' + esc(b.texti) + '</div>' : '') +
      (b.spurning ? '<div class="vbspurn">❓ ' + esc(b.spurning) + '</div>' : '') +
      (b.athugasemd ? '<div class="vbtexti">📝 ' + esc(b.athugasemd) + '</div>' : '');
  }
  function vbRow(x) {
    const b = x.b, samt = b.stada === 'samthykkt', opid = !!(S.vbOpin || {})[b.id], upph = vbSamtals(b), bid = S.busy['vb' + b.id] ? ' disabled' : '';
    const nafn = b.fyrirtaeki_id ? '<a class="clink" href="#company/' + b.fyrirtaeki_id + '" data-t5="fyr-id" data-fid="' + b.fyrirtaeki_id + '">' + esc(b.fyrirtaeki || x.nafn || '(ónefnt)') + '</a>' : '<b>' + esc(b.fyrirtaeki || '(ónefnt)') + '</b>';
    const sonn = (x.sk ? '<span class="tag ok">📄 Skýrsla ' + esc(x.sk.doc_date ? fmtD(x.sk.doc_date) : String(x.sk.year)) + '</span>' : '<span class="tag">Engin skýrsla ' + new Date().getFullYear() + '</span>') +
      (x.rk ? '<span class="tag ok">🧾 ' + esc(x.rk.num || 'Sala') + ' · ' + esc(fmtD(x.rk.created_at)) + (x.rk.paid_at ? ' · greitt' : '') + '</span>' : '<span class="tag">Enginn reikningur</span>') +
      (!x.fra ? '<span class="tag" title="Hvorki dagsetning né mánuður á blaðinu — allt árið borið saman">Dagsetning vantar</span>' : '') +
      (x.systkin > 1 && x.rk ? '<span class="tag hot" title="Fleiri staðir á sama viðskiptavini — reikningurinn gæti átt við annan stað">⚠ ' + x.systkin + ' staðir á kúnna</span>' : '');
    return '<div class="vbrow' + (x.buid ? ' buid' : '') + '"><div class="vbhead">' +
        '<span class="tag' + (samt ? ' ok' : '') + '">' + (samt ? 'Samþykkt' : 'Bíður') + '</span>' + nafn +
        '<span class="s">' + esc(b.dagsetning || b.manudur || 'Dagsetning vantar') + (b.skodunarmadur ? ' · ' + esc(b.skodunarmadur) : '') + (upph ? ' · ' + kr(upph) : '') + '</span>' +
        '<span class="grow"></span><button type="button" class="btn iv sm tog" data-t5="vb-opna" data-vb="' + b.id + '" aria-expanded="' + opid + '" aria-label="Innihald blaðsins">' + (opid ? '▴' : '▾') + '</button></div>' +
      '<div class="tags">' + sonn + '</div>' + (opid ? vbInnihald(b) : '') +
      '<div class="sacts">' +
        '<button type="button" class="btn iv sm" data-t5="vb-stada" data-vb="' + b.id + '" data-v="' + (samt ? 'bidur' : 'samthykkt') + '"' + bid + '>' + (samt ? '↩ Aftur í bið' : '✓ Samþykkja') + '</button>' +
        '<button type="button" class="btn ' + (x.buid ? 'gold' : 'iv') + ' sm" data-t5="vb-stada" data-vb="' + b.id + '" data-v="klarad"' + bid + '>' + (x.buid ? 'Líklega búið — merkja klárað' : 'Merkja klárað') + '</button>' +
      '</div></div>';
  }
  // Sömu skrif og 364 (hak / sleppa / opna-aftur), lesin til baka. Afturkalla skilar fyrri stöðu.
  async function vbStada(id, stada, fyrriStada) {
    const c = sb(), g = G.skyrslur, b = g && g.data ? g.data.blod.find(x => x.id === id) : null;
    if (!c || (!b && !fyrriStada)) return;
    const fyrri = fyrriStada || { stada: b.stada, samthykkt_at: b.samthykkt_at || null, samthykkt_by: b.samthykkt_by || null };
    const patch = stada === 'samthykkt' ? { stada, samthykkt_at: new Date().toISOString(), samthykkt_by: nu() }
      : stada === 'bidur' ? { stada, samthykkt_at: null, samthykkt_by: null } : fyrriStada ? Object.assign({}, fyrriStada) : { stada };
    S.busy['vb' + id] = 1;
    render();
    try {
      const r = await c.from('sara_yfirferd').update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq('id', id).select('id,stada');
      if (r.error) throw r.error;
      if (!r.data || !r.data.length || r.data[0].stada !== patch.stada) throw new Error('las ekki til baka');
      if (fyrriStada) toast('Fyrri staða vinnublaðsins er komin aftur');
      else toast(stada === 'samthykkt' ? '🟢 ' + (b.fyrirtaeki || 'Vinnublaðið') + ' samþykkt — Sara má klára skýrslu og reikning' : stada === 'bidur' ? '🟡 ' + (b.fyrirtaeki || 'Vinnublaðið') + ' aftur í bið' : '✓ ' + (b.fyrirtaeki || 'Vinnublaðið') + ' merkt klárað',
        false, () => vbStada(id, fyrri.stada, fyrri));
    } catch (e) { toast('Vistaðist ekki: ' + ((e && e.message) || e), true); }
    delete S.busy['vb' + id];
    gleyma('skyrslur');
    render();
    load(true);
  }

  /* ── Kröfur-hamur: gögn ── */
  async function saekjaKrofur() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const [ro, rc] = await Promise.all([
      c.from('solur').select('id,num,customer_nafn,customer_base_id,samtals,created_at,krafa_sent_at,invoiced_at,dk_invoice_id,krafa_note,is_credit').eq('greitt_med', 'reikningur').is('paid_at', null).neq('status', 'void'),
      c.from('solur').select('credit_of').eq('is_credit', true).not('credit_of', 'is', null)
    ]);
    if (ro.error) throw ro.error;
    const bakfaert = new Set((rc.data || []).map(x => x.credit_of));
    const krofur = (ro.data || []).filter(s => !s.is_credit && !bakfaert.has(s.id));
    const nums = krofur.map(s => s.num).filter(Boolean), gjald = {};
    if (nums.length) {
      try {
        const rp = await c.from('payday_invoices_slokk').select('reference,due_date,final_due_date,status').in('reference', nums);
        (rp.data || []).forEach(p => { gjald[p.reference] = p; });
      } catch (_) {}
    }
    return krofur.map(s => Object.assign({}, s, { gjald: gjald[s.num] || null, send: !!(s.krafa_sent_at || s.invoiced_at || s.dk_invoice_id) }));
  }
  async function saekjaGleymt() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const fjortan = new Date(Date.now() - 14 * 864e5).toISOString();
    const [ru, rg, rk] = await Promise.all([
      c.from('v_gleymt_ad_rukka_uttekt').select('fyrirtaeki_id,nafn,heimilisfang,postnumer,skyrslur,skyrsla_dags').order('skyrsla_dags', { ascending: true }),
      c.from('solur').select('id,num,customer_nafn,samtals,created_at,starfsmadur').eq('greitt_med', 'greitt_sidar').eq('status', 'drog').is('paid_at', null).lt('created_at', fjortan).order('created_at', { ascending: true }),
      c.from('solur').select('id,num,customer_nafn,samtals,created_at,greitt_med,starfsmadur').in('greitt_med', ['kort', 'reidufe']).is('paid_at', null).eq('status', 'final').not('is_credit', 'is', true).order('created_at', { ascending: true })
    ]);
    if (ru.error) throw ru.error;
    return { uttekt: ru.data || [], sidar: rg.data || [], kort: rk.data || [] };
  }
  const BAKF_ORD = ['bakfær', 'kreditreikn', 'kredit', 'leiðrétt', 'endurgreið', 'tvírukk', 'breyta reikn', 'rangur reikn', 'afrit af reikn', 'fella niður'];
  async function saekjaBakfaerslur() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const fra60 = new Date(Date.now() - 60 * 864e5).toISOString();
    const or = BAKF_ORD.map(o => 'subject.ilike."%' + o + '%",snippet.ilike."%' + o + '%"').join(',');
    const [rp, rc] = await Promise.all([
      c.from('email_digest').select('id,subject,snippet,sender_name,sender_email,received_at,folder').eq('account', 'eldklar@eldklar.is').gte('received_at', fra60).or(or).order('received_at', { ascending: false }).limit(40),
      c.from('solur').select('id,num,customer_nafn,samtals,created_at,credit_of').eq('is_credit', true).gte('created_at', fra60).order('created_at', { ascending: false })
    ]);
    if (rp.error) throw rp.error;
    return { postar: (rp.data || []).filter(m => m.folder !== 'SENT'), kredit: rc.data || [] };
  }
  async function saekjaAfgreidslu() {
    const c = sb();
    if (!c) throw new Error('Engin tenging við gagnagrunn');
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    const vika = new Date(d0); vika.setDate(vika.getDate() - ((vika.getDay() + 6) % 7));
    const SEL_S = 'id,num,customer_nafn,samtals,created_at,greitt_med,status,paid_at,is_credit';
    const [rv, ro] = await Promise.all([
      c.from('solur').select(SEL_S).eq('starfsmadur', 'Kassi').gte('created_at', vika.toISOString()).neq('status', 'void'),
      c.from('solur').select(SEL_S).eq('starfsmadur', 'Kassi').is('paid_at', null).neq('status', 'void').not('is_credit', 'is', true)
    ]);
    if (rv.error) throw rv.error;
    return { vika: (rv.data || []).filter(s => !s.is_credit), opin: ro.data || [], dagur: d0.getTime() };
  }
  const summa = l => l.reduce((s, x) => s + (+x.samtals || 0), 0);
  const daga = t => Math.max(0, Math.floor((Date.now() - tStamp(t)) / 864e5));
  const soluLina = (x, merki) => '<div class="lrow"><span class="age">' + esc(x.num || '—') + '</span><div><b>' + esc(x.customer_nafn || '(ónefnt)') + '</b>' +
    '<span class="s">' + kr(x.samtals) + ' · ' + esc(fmtD(x.created_at)) + (x.starfsmadur ? ' · ' + esc(x.starfsmadur) : '') + (x.krafa_note ? ' · ' + esc(String(x.krafa_note).slice(0, 60)) : '') + '</span></div>' + (merki || '<span></span>') + '</div>';

  /* ── Hreinsa Master ── */
  const HR_FLOKKAR = [['tvitekid', 'Tvítekið'], ['buid', 'Líklega búið'], ['ekkertfyr', 'Vantar fyrirtæki'], ['gamalt', 'Gamalt og óhreyft'], ['opid', 'Enn opið']];
  const titilLykill = t => fold(String(t || '').replace(/^\s*((re|fw|fwd|sv|tr)\s*:\s*)+/i, '')).replace(/[^a-z0-9]+/g, ' ').trim();
  function flokkaMaster() {
    const rows = S.rows.filter(isFree), nyrriTil = {}, nuna = Date.now();
    const merkjaEldri = hopur => {
      if (hopur.length < 2) return;
      const rod = hopur.slice().sort((a, b) => tStamp(b.created_at) - tStamp(a.created_at));
      rod.slice(1).forEach(r => { if (!nyrriTil[r.id]) nyrriTil[r.id] = rod[0]; });
    };
    const hopar = {}, thraedir = {};
    rows.forEach(r => {
      const k = (r.fyrirtaeki_id || r.customer_base_id || fold(whereOf(r)) || '-') + '|' + titilLykill(r.title);
      if (titilLykill(r.title)) (hopar[k] = hopar[k] || []).push(r);
      if (r.channel_ref) (thraedir[r.channel_ref] = thraedir[r.channel_ref] || []).push(r);
    });
    Object.values(hopar).forEach(merkjaEldri);
    Object.values(thraedir).forEach(merkjaEldri);
    return rows.map(r => {
      const hreyft = Math.floor((nuna - tStamp(r.updated_at || r.created_at)) / 864e5), vk = virkniEftir(r);
      if (nyrriTil[r.id]) return { r, fl: 'tvitekid', astaeda: 'Nýrra eintak til: #' + nyrriTil[r.id].id + ' ' + String(nyrriTil[r.id].title || '').slice(0, 50) };
      if (vk) return { r, fl: 'buid', astaeda: 'Eftir að málið varð til: ' + vk.join(' og ') };
      if (!r.fyrirtaeki_id && !r.customer_base_id) return { r, fl: 'ekkertfyr', astaeda: 'Ekki tengt fyrirtæki' };
      if (ageDays(r) > 90 && hreyft > 60) return { r, fl: 'gamalt', astaeda: 'Ekki hreyft í ' + hreyft + ' daga' };
      return { r, fl: 'opid', astaeda: ageDays(r) + ' daga gamalt' };
    });
  }
  function hreinsunHtml() {
    if (!S.hreinsa) return '';
    const listi = flokkaMaster(), sia = S.hrSia || 'tvitekid', val = S.hrVal || (S.hrVal = {});
    const synd = listi.filter(x => x.fl === sia).sort((a, b) => tStamp(a.r.created_at) - tStamp(b.r.created_at));
    if (sia === 'ekkertfyr') gogn('tf-post', saekjaSendendur, 600000);
    const valin = Object.keys(val).filter(id => val[id] && S.rows.some(r => String(r.id) === id)).length;
    const allir = synd.length > 0 && synd.every(x => val[x.r.id]);
    return '<section class="panel hreinsun" aria-label="Hreinsa Master">' +
      '<header class="phead"><span class="plate">🧹</span><h2 class="ptitle">Hreinsa Master</h2><span class="sum">' + listi.length + ' mál á Master · þú velur hverju er lokað</span><span class="grow"></span>' +
        '<button type="button" class="btn iv sm" data-t5="hr-opna">Loka hreinsun</button></header>' +
      '<div class="hrsia"><div class="seg sm" role="group" aria-label="Flokkar">' + HR_FLOKKAR.map(f =>
          '<button type="button" data-t5="hr-sia" data-v="' + f[0] + '" aria-pressed="' + (sia === f[0]) + '">' + f[1] + '<span class="c">' + listi.filter(x => x.fl === f[0]).length + '</span></button>').join('') + '</div>' +
        '<span class="grow"></span>' +
        '<button type="button" class="btn iv sm" data-t5="hr-allir" data-v="' + (allir ? '0' : '1') + '"' + (synd.length ? '' : ' disabled') + '>' + (allir ? 'Afvelja flokkinn' : 'Velja allan flokkinn') + '</button>' +
        '<button type="button" class="btn gold sm" data-t5="hr-loka"' + (valin && !S.hrBid ? '' : ' disabled') + '>' + (S.hrBid ? 'Loka…' : '✓ Loka völdum (' + valin + ')') + '</button></div>' +
      (synd.length ? '<div class="hrlist">' + synd.map(x => '<div class="hrrow">' +
          '<input type="checkbox" data-t5="hr-val" data-id="' + x.r.id + '"' + (val[x.r.id] ? ' checked' : '') + ' aria-label="Velja mál #' + x.r.id + '">' +
          '<span class="age ' + ageCls(ageDays(x.r)) + '">' + ageDays(x.r) + 'D</span><span class="hrinfo">' +
          '<button type="button" class="lpick" data-t5="skoda" data-id="' + x.r.id + '"><b>' + esc(x.r.title || '(ónefnt mál)') + '</b></button>' +
          '<span class="s">' + [fyrLink(x.r), esc(eigandaTexti(x.r, nu())), esc(x.astaeda)].filter(Boolean).join(' · ') + '</span>' + (x.fl === 'ekkertfyr' ? tfTakkar(x.r) : '') + '</span></div>').join('') + '</div>'
        : emptyHtml('Ekkert mál í þessum flokki.')) +
    '</section>';
  }
  async function lokaVoldum() {
    const c = sb();
    const ids = Object.keys(S.hrVal || {}).filter(id => S.hrVal[id]).map(Number).filter(id => S.rows.some(r => r.id === id));
    if (!c || !ids.length || S.hrBid) return;
    if (!window.confirm('Loka ' + ids.length + (ids.length === 1 ? ' máli' : ' málum') + '? Þau hverfa af borðunum en eyðast ekki — „Afturkalla" opnar þau aftur.')) return;
    const fyrri = {};
    ids.forEach(id => { const r = S.rows.find(x => x.id === id); fyrri[id] = (r && r.status) || 'nytt'; });
    S.hrBid = true;
    render();
    try {
      const r = await c.from('thjonustubeidni').update({ status: 'lokad', updated_at: new Date().toISOString() }).in('id', ids).select('id,status');
      if (r.error) throw r.error;
      const lokud = (r.data || []).filter(x => x.status === 'lokad').map(x => x.id);
      S.hrVal = {};
      toast('Lokað: ' + lokud.length + (lokud.length === 1 ? ' mál' : ' mál') + (lokud.length < ids.length ? ' — ' + (ids.length - lokud.length) + ' vistuðust ekki' : ''), lokud.length < ids.length,
        lokud.length ? () => opnaAftur(lokud, fyrri) : null);
    } catch (e) { toast('Lokunin vistaðist ekki: ' + ((e && e.message) || e), true); }
    S.hrBid = false;
    await load(true);
  }
  async function opnaAftur(ids, fyrri) {
    const c = sb();
    if (!c) return;
    const eftirStodu = {};
    ids.forEach(id => { (eftirStodu[fyrri[id]] = eftirStodu[fyrri[id]] || []).push(id); });
    let ok = 0;
    for (const st of Object.keys(eftirStodu)) {
      const r = await c.from('thjonustubeidni').update({ status: st, updated_at: new Date().toISOString() }).in('id', eftirStodu[st]).select('id');
      if (!r.error) ok += (r.data || []).length;
    }
    toast(ok === ids.length ? 'Málin eru opin aftur' : 'Aðeins ' + ok + ' af ' + ids.length + ' opnuðust aftur', ok !== ids.length);
    await load(true);
  }

  /* ── tengja mál við fyrirtæki ── */
  let _fyrFold = null, _fyrFoldLen = -1;
  function fyrirtaekjaFold() {
    const listi = window.Companies && Array.isArray(Companies.list) ? Companies.list : [];
    if (_fyrFold && _fyrFoldLen === listi.length) return _fyrFold;
    _fyrFoldLen = listi.length;
    const hreinsa = s => fold(s).replace(/\b(ehf|hf|sf|slf|husfelagid|husfelag)\b\.?/g, ' ').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
    _fyrFold = listi.filter(c => c && c.id && c.nafn && !c.deleted_at && String(c.kennitala || '').replace(/D/g, '') !== '9999999999' && !/^sta.greit/i.test(String(c.nafn).trim()))
      .map(c => ({ c, n: hreinsa(c.nafn), h: fold(c.heimilisfang || '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(), e: String(c.netfang || '').toLowerCase().trim() }));
    return _fyrFold;
  }
  async function saekjaSendendur() {
    const c = sb(), ids = S.rows.filter(r => isPost(r) && !r.fyrirtaeki_id && !r.customer_base_id).map(postId).filter(x => x != null);
    if (!c || !ids.length) return {};
    const r = await c.from('email_digest').select('id,sender_email,sender_name').in('id', ids);
    const m = {};
    (r.data || []).forEach(x => { m[x.id] = x; });
    return m;
  }
  const _tillogur = {};
  function tillogurFyrirtaekis(r) {
    const g = G['tf-post'], p = isPost(r) && g && g.data ? g.data[postId(r)] : null;
    const lykill = (r.updated_at || '') + '|' + fyrirtaekjaFold().length + '|' + !!p;
    if (_tillogur[r.id] && _tillogur[r.id].k === lykill) return _tillogur[r.id].t;
    const netfang = p && p.sender_email ? String(p.sender_email).toLowerCase() : '';
    const texti = ' ' + fold([r.title, r.notes, r.summary, r.customer_nafn, p && p.sender_name].filter(Boolean).join(' ')).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
    const stig = [];
    fyrirtaekjaFold().forEach(x => {
      let s = 0;
      if (netfang && x.e && x.e === netfang) s += 100;
      if (x.n.length >= 6 && texti.indexOf(' ' + x.n + ' ') >= 0) s += 30 + x.n.length;
      if (x.h.length >= 6 && texti.indexOf(' ' + x.h) >= 0) s += 20 + x.h.length;
      if (s) stig.push({ c: x.c, s });
    });
    const t = stig.sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.c);
    _tillogur[r.id] = { k: lykill, t };
    return t;
  }
  function tfTakkar(r) {
    return '<span class="tftak">' + tillogurFyrirtaekis(r).map(c => '<button type="button" class="skb" data-t5="tf-tengja" data-id="' + r.id + '" data-fid="' + c.id + '" title="Tengja við ' + esc(c.nafn) + (c.heimilisfang ? ', ' + esc(c.heimilisfang) : '') + '">🏢 ' + esc(String(c.nafn).slice(0, 40)) + '</button>').join('') +
      '<button type="button" class="skb" data-t5="tf-leita" data-id="' + r.id + '">🔍 Leita að fyrirtæki</button></span>';
  }
  function tfBanner() {
    const r = S.rows.find(x => x.id === S.tengjaVid);
    if (!r) { S.tengjaVid = null; return ''; }
    return '<p class="tfbanner">🏢 Veldu fyrirtæki í leitinni til að tengja við „' + esc(String(r.title || '(ónefnt mál)').slice(0, 70)) + '"' +
      '<button type="button" class="btn iv sm" data-t5="tf-haetta">Hætta við</button></p>';
  }
  function tengjaFyrirtaeki(id, fid) {
    const c = sb(), r = S.rows.find(x => x.id === id);
    if (!c || !r || !fid) return;
    return act(id, async () => {
      const rf = await c.from('fyrirtaeki').select('id,nafn,customer_base_id').eq('id', fid).single();
      if (rf.error || !rf.data) throw new Error('fyrirtækið fannst ekki');
      const fyrri = { fyrirtaeki_id: r.fyrirtaeki_id || null, customer_base_id: r.customer_base_id || null, customer_nafn: r.customer_nafn || null };
      const patch = { fyrirtaeki_id: rf.data.id, customer_base_id: rf.data.customer_base_id || null, customer_nafn: rf.data.nafn };
      const ru = await c.from('thjonustubeidni').update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq('id', id).select('id,fyrirtaeki_id');
      if (ru.error) throw ru.error;
      if (!ru.data || !ru.data.length || ru.data[0].fyrirtaeki_id !== rf.data.id) throw new Error('las ekki til baka');
      S.tengjaVid = null;
      toast('Tengt við ' + rf.data.nafn, false, () => act(id, async () => {
        const rb = await c.from('thjonustubeidni').update(Object.assign({ updated_at: new Date().toISOString() }, fyrri)).eq('id', id).select('id');
        toast(rb.error || !(rb.data || []).length ? 'Afturköllun tókst ekki' : 'Tengingin var tekin af', !!rb.error);
      }));
    });
  }

  /* ── fylgiskjöl (thjonustubeidni_files + verkbord-files — sama geymsla og 231/306) ── */
  async function saekjaSkjol(id) {
    const c = sb();
    if (!c) return [];
    const r = await c.from('thjonustubeidni_files').select('*').eq('beidni_id', id).order('created_at');
    if (r.error) throw r.error;
    return r.data || [];
  }
  const staerd = b => !b ? '' : b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
  function skjolHtml(r) {
    const g = gogn('skjol:' + r.id, () => saekjaSkjol(r.id), 120000), bid = !!(S.skjolBid && S.skjolBid[r.id]), listi = g.data || [];
    return '<div class="fskjol"><div class="sg-h"><span class="slabel">📎 Fylgiskjöl' + (g.data ? ' (' + listi.length + ')' : '') + '</span><span class="grow"></span>' +
        '<label class="sg-r fsupp" data-t5="skjal-velja">' + (bid ? 'Hleð upp…' : '+ Bæta við skjölum') + '<input type="file" multiple data-t5-skjal="' + r.id + '" hidden' + (bid ? ' disabled' : '') + '></label></div>' +
      (g.villa ? '<div class="sg-m">Náði ekki í fylgiskjölin: ' + esc(g.villa) + '</div>'
        : !g.data ? '<div class="sg-m">Sæki fylgiskjöl…</div>'
        : listi.length ? '<div class="fslist">' + listi.map(f => '<div class="fsrow">' +
            '<a class="clink dk" href="' + esc(f.url || '') + '" target="_blank" rel="noopener">' + esc(f.name || 'skjal') + '</a>' +
            '<span class="sg-m">' + esc([staerd(f.size), f.created_at ? fmtD(f.created_at) : ''].filter(Boolean).join(' · ')) + '</span><span class="grow"></span>' +
            '<button type="button" class="sx" data-t5="skjal-eyda" data-id="' + r.id + '" data-fid="' + f.id + '" aria-label="Eyða ' + esc(f.name || 'skjali') + '">✕</button></div>').join('') + '</div>'
        : '<div class="sg-m">Engin fylgiskjöl á þessu máli.</div>') +
    '</div>';
  }
  async function hladaSkjolum(id, files) {
    const c = sb();
    if (!c || !files.length) return;
    S.skjolBid = S.skjolBid || {};
    S.skjolBid[id] = true;
    render();
    let ok = 0;
    for (const file of files) {
      if (file.size > 25 * 1048576) { toast(file.name + ' er of stór (hámark 25 MB).', true); continue; }
      const slod = id + '/' + Date.now() + '-' + String(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
      try {
        const up = await c.storage.from('verkbord-files').upload(slod, file, { contentType: file.type || 'application/octet-stream', upsert: false });
        if (up.error) throw up.error;
        const url = ((c.storage.from('verkbord-files').getPublicUrl(slod) || {}).data || {}).publicUrl;
        const ins = await c.from('thjonustubeidni_files').insert({ beidni_id: Number(id), name: file.name, path: slod, url, mime_type: file.type || null, size: file.size || null }).select('id');
        if (ins.error) throw ins.error;
        ok++;
      } catch (e) { toast(file.name + ' vistaðist ekki: ' + ((e && e.message) || e), true); }
    }
    delete S.skjolBid[id];
    gleyma('skjol:' + id);
    if (ok) toast(ok === 1 ? 'Skjalið er komið á málið' : ok + ' skjöl komin á málið');
    render();
  }
  async function eydaSkjali(id, fileId) {
    const c = sb(), g = G['skjol:' + id], f = g && g.data ? g.data.find(x => x.id === fileId) : null;
    if (!c || !f || !window.confirm('Eyða skjalinu „' + (f.name || '') + '"? Það er ekki hægt að afturkalla.')) return;
    try {
      if (f.path) { const rm = await c.storage.from('verkbord-files').remove([f.path]); if (rm.error) throw rm.error; }
      const del = await c.from('thjonustubeidni_files').delete().eq('id', fileId).select('id');
      if (del.error) throw del.error;
      toast('Skjalinu var eytt');
    } catch (e) { toast('Eyðing tókst ekki: ' + ((e && e.message) || e), true); }
    gleyma('skjol:' + id);
    render();
  }

  function lrowHtml(r, merki) {
    const a = ageDays(r), w = fyrLink(r);
    return '<div class="lrow"><span class="age ' + ageCls(a) + '">' + a + 'D</span>' +
      '<div><button type="button" class="lpick" data-t5="skoda" data-id="' + r.id + '" title="Skoða málið"><b>' + esc(r.title || '(ónefnt mál)') + '</b></button>' +
      '<span class="s">' + (w ? w + ' · ' : '') + esc(eigandaTexti(r, nu())) + '</span></div>' + (merki || '<span></span>') + '</div>';
  }
  function bottomHtml(k) {
    const n = nu();
    if (k === 'skipulag') {
      // Agnar 11.09.2026: „algjörlega læst og tilgangslaust" · „opna á allt og customizable, geta eytt hlutum
      // og skrifað þar sem maður vill skrifa". Sömu gögn og 305: skipulagsbord.by_staff.<nafn> = { cards, krass }.
      const cards = spjold(n);
      const krass = S.skDrog.__krass != null ? S.skDrog.__krass : String(P('skipulagsbord.by_staff.' + n + '.krass') || '');
      const kort = cards.map((cd, i) => {
        const d = S.skDrog[cd.id] || {}, id = esc(cd.id);
        const nafn = d.name != null ? d.name : (cd.name || ''), texti = d.title != null ? d.title : (cd.title || '');
        const row = cd.verkbord_id != null ? S.rows.find(x => String(x.id) === String(cd.verkbord_id)) : null;
        const t = cd.type != null && SB_TEG[cd.type] ? SB_TEG[cd.type] : null;
        return '<div class="skc" data-skid="' + id + '" style="border-top-color:' + (t ? t[1] : 'var(--rule3)') + '">' +
          '<div class="skh"><span class="skgrip" draggable="true" data-skdrag="' + id + '" title="Dragðu til að færa">⠿</span>' +
            SB_TEG.map((x, ti) => '<button type="button" class="skdot' + (cd.type === ti ? ' on' : '') + '" data-t5="sk-type" data-skid="' + id + '" data-i="' + ti + '" style="background:' + x[1] + '" title="' + esc(x[0]) + '" aria-label="' + esc(x[0]) + '"></button>').join('') +
            '<span class="grow"></span>' +
            '<button type="button" class="skb" data-t5="sk-faera" data-skid="' + id + '" data-v="-1" aria-label="Færa framar"' + (i === 0 ? ' disabled' : '') + '>‹</button>' +
            '<button type="button" class="skb" data-t5="sk-faera" data-skid="' + id + '" data-v="1" aria-label="Færa aftar"' + (i === cards.length - 1 ? ' disabled' : '') + '>›</button>' +
            '<button type="button" class="skb skx" data-t5="sk-del" data-skid="' + id + '" aria-label="Eyða spjaldi">✕</button></div>' +
          '<input class="skn" data-sk="name" data-skid="' + id + '" value="' + esc(nafn) + '" placeholder="Fyrirsögn" aria-label="Fyrirsögn">' +
          '<textarea class="skt" data-sk="title" data-skid="' + id + '" rows="' + Math.min(8, Math.max(2, String(texti).split('\n').length + 1)) + '" placeholder="Skrifaðu hvað sem er…" aria-label="Texti">' + esc(texti) + '</textarea>' +
          (cd.mynd ? '<div class="skm"><a href="' + esc(cd.mynd) + '" target="_blank" rel="noopener"><img src="' + esc(cd.mynd) + '" alt="Mynd á spjaldi" loading="lazy"></a>' +
            '<button type="button" class="skb" data-t5="sk-mynd-x" data-skid="' + id + '">Fjarlægja mynd</button></div>' : '') +
          (cd.verkbord_id != null ? '<div class="skf">' + (row ? '<button type="button" class="clink" data-t5="skoda" data-id="' + row.id + '">Opna mál ›</button> · ' + esc(eigandaTexti(row, n)) : 'Málið er lokað eða í geymslu') + '</div>' : '') +
        '</div>';
      }).join('');
      const body = '<div class="skwrap">' +
        '<label class="krass"><span class="lbl">Krassblað</span><textarea data-sk="krass" rows="' + Math.min(14, Math.max(3, krass.split('\n').length + 1)) + '" placeholder="Skrifaðu hvað sem er — vistast sjálfkrafa og fylgir þér á milli tölva.">' + esc(krass) + '</textarea></label>' +
        '<div class="skgrid">' + kort + '<button type="button" class="sknew" data-t5="sk-ny">+ Nýtt spjald</button></div>' +
        '<div class="skstada">' + esc(S.skStada || 'Allt vistast sjálfkrafa. Límdu skjáskot beint í spjald.') + '</div></div>';
      return modPanel(k, cards.length + ' spjöld', body, '<button type="button" class="btn gold sm" data-t5="sk-ny">+ Nýtt spjald</button>');
    }
    if (k === 'frestir') {
      const dagur = ymd(new Date());
      const flokkur = r => { const d = ymd(new Date(r.due_at)); return d < dagur ? 'lidid' : d === dagur ? 'idag' : 'seinna'; };
      const rows = S.rows.filter(r => r.due_at).sort((a, b) => tStamp(a.due_at) - tStamp(b.due_at));
      const lidnir = rows.filter(r => flokkur(r) === 'lidid').length, idag = rows.filter(r => flokkur(r) === 'idag').length;
      return modPanel(k, lidnir + ' liðnir · ' + idag + ' í dag · ' + rows.length + ' alls', rows.length
        ? rows.slice(0, 12).map(r => { const f = flokkur(r); return lrowHtml(r, '<span class="tag' + (f === 'lidid' ? ' hot' : '') + '">' + (f === 'lidid' ? 'Liðinn ' + esc(fmtD(r.due_at)) : f === 'idag' ? 'Í dag' : esc(fmtD(r.due_at))) + '</span>'); }).join('') +
          (rows.length > 12 ? '<div class="more">+ ' + (rows.length - 12) + ' til viðbótar</div>' : '')
        : emptyHtml('Engin opin mál með frest.'));
    }
    if (k === 'nyjast') {
      const rows = S.rows.slice().sort((a, b) => tStamp(b.created_at) - tStamp(a.created_at)).slice(0, 10);
      return modPanel(k, S.rows.filter(r => ageDays(r) <= 7).length + ' ný síðustu 7 daga', rows.length
        ? rows.map(r => lrowHtml(r, '<span class="tag">' + esc(tegMals(r)) + '</span>')).join('')
        : emptyHtml('Engin opin mál.'));
    }
    if (k === 'forgangur') {
      const g = isOpen(k) ? gogn('elt', saekjaElt, 600000) : null, nuna = Date.now();
      const lidnir = S.rows.filter(r => r.due_at && tStamp(r.due_at) < nuna - 12 * 3600e3).sort((a, b) => tStamp(a.due_at) - tStamp(b.due_at));
      const aridandi = S.rows.filter(r => r.important && lidnir.indexOf(r) < 0).sort(rodun);
      const eltRow = (m, merki) => {
        const r = S.rows.find(x => x.channel_ref === 'email:' + m.id), a = Math.max(0, Math.floor((nuna - tStamp(m.received_at)) / 864e5));
        return '<div class="lrow"><span class="age ' + ageCls(a) + '">' + a + 'D</span><div>' +
          (r ? '<button type="button" class="lpick" data-t5="skoda" data-id="' + r.id + '"><b>' + esc(m.subject || '(ekkert efni)') + '</b></button>' : '<b>' + esc(m.subject || '(ekkert efni)') + '</b>') +
          '<span class="s">' + esc(m.sender_name || m.sender_email || '') + ' · ' + (r ? esc(eigandaTexti(r, nu())) : 'ekki á borðinu') + '</span></div>' + merki + '</div>';
      };
      let body = '', elt = 0;
      if (g && g.data) {
        elt = g.data.eltir.length + g.data.itrek.length;
        if (elt) body += '<div class="sect">Rekur á eftir okkur</div>' +
          g.data.eltir.map(h => eltRow(h.mails[0], '<span class="tag hot">' + h.mails.length + ' póstar án svars</span>')).join('') +
          g.data.itrek.map(m => eltRow(m, '<span class="tag hot">Ítrekun</span>')).join('');
      } else body += g && g.villa ? '<p class="err">Náði ekki í póstinn: ' + esc(g.villa) + '</p>' : '<div class="more">Les póstinn…</div>';
      if (lidnir.length) body += '<div class="sect">Frestur liðinn (' + lidnir.length + ')</div>' + lidnir.slice(0, 8).map(r => lrowHtml(r, '<span class="tag hot">' + esc(fmtD(r.due_at)) + '</span>')).join('');
      if (aridandi.length) body += '<div class="sect">Áríðandi (' + aridandi.length + ')</div>' + aridandi.slice(0, 8).map(r => lrowHtml(r, '<span class="tag hot">Áríðandi</span>')).join('');
      if (g && g.data && !elt && !lidnir.length && !aridandi.length) body = emptyHtml('Enginn rekur á eftir, engir liðnir frestir og ekkert áríðandi.');
      return modPanel(k, elt + ' reka á eftir · ' + lidnir.length + ' liðnir frestir · ' + aridandi.length + ' áríðandi', body,
        uppfTakki('elt') + '<button type="button" class="btn iv sm" data-t5="go" data-view="thjonustuver-postar">Pósthólfið ›</button>');
    }
    if (k === 'nymal') {
      const ny = S.rows.filter(r => !r.status || r.status === 'nytt');
      const utkall = r => ['heimsokn', 'skodun_tilbod'].indexOf(r.type) >= 0 || r.flokkur === 'brunakerfi' || tagList(r).some(t => ['uppsetning', 'arskodun', 'brunakerfi'].indexOf(t) >= 0);
      const utk = ny.filter(utkall).sort(rodun), vantar = ny.filter(r => !r.fyrirtaeki_id && !r.customer_base_id), buin = ny.filter(r => virkniEftir(r));
      const kb = (l, v, m) => '<div class="kbox"><div class="lbl">' + l + '</div><div class="v">' + v + '</div>' + (m ? '<div class="km">' + m + '</div>' : '') + '</div>';
      const body = '<div class="kboxes">' + kb('≤ 7 dagar', ny.filter(r => ageDays(r) <= 7).length) + kb('8–30 dagar', ny.filter(r => ageDays(r) > 7 && ageDays(r) <= 30).length) +
          kb('Eldri en 30', ny.filter(r => ageDays(r) > 30).length, ny.filter(r => normW(r.assigned_to) === AI_WORKER).length + ' í bunka Charlize') + kb('Líklega búin', buin.length) + '</div>' +
        (utk.length ? '<div class="sect">Útköll — þarf að fara (' + utk.length + ')</div>' + utk.slice(0, 10).map(r => lrowHtml(r, r.fyrirtaeki_id ? '<span class="akacts">' + akTakki(r.fyrirtaeki_id) + '</span>' : '<span class="tag">Vantar fyrirtæki</span>')).join('') : '') +
        (vantar.length ? '<div class="sect">Vantar fyrirtæki og heimilisfang (' + vantar.length + ')</div>' + vantar.slice(0, 6).map(r => lrowHtml(r, '')).join('') +
          (vantar.length > 6 ? '<div class="more">+ ' + (vantar.length - 6) + ' til viðbótar — tengdu fyrirtæki í „Breyta máli" eða með leitinni</div>' : '') : '');
      return modPanel(k, ny.length + ' ný · ' + utk.length + ' útköll · ' + vantar.length + ' án fyrirtækis', body);
    }
    if (k === 'brunakerfi') {
      const g = isOpen(k) ? gogn('bk', saekjaBrunakerfi, 600000) : null, AR = new Date().getFullYear();
      let body;
      if (!g || (!g.data && !g.villa)) body = emptyHtml('Les brunakerfin…');
      else if (g.villa) body = '<p class="err">Náði ekki í brunakerfin: ' + esc(g.villa) + '</p>';
      else {
        const d = g.data, pnr = (a, b) => String(a.postnumer || '').localeCompare(String(b.postnumer || ''));
        const stopp = x => '<div class="akrow"><span class="aknr">' + (x.latestMonth ? esc(MAN[x.latestMonth - 1].slice(0, 3)) : '—') + '</span><div class="akinfo">' +
            '<a class="clink" href="#company/' + x.id + '" data-t5="fyr-id" data-fid="' + x.id + '">' + esc(x.nafn || '(ónefnt)') + '</a>' +
            '<span class="s">' + esc([x.heimilisfang, x.postnumer].filter(Boolean).join(', ') || 'Vantar heimilisfang') + (simiAf(x) ? ' · ' + esc(simiAf(x)) : '') + (x.latest ? ' · síðasta skýrsla ' + x.latest : '') + '</span></div>' +
          '<div class="akacts">' + akTakki(x.id) + '</div></div>';
        const hluti = (heiti, listi) => listi.length ? '<div class="sect">' + heiti + ' (' + listi.length + ')</div><div class="aklist">' + listi.map(stopp).join('') + '</div>' : '';
        body = hluti('Komið á tíma — þarf að fara', d.filter(x => x.due).sort(pnr)) + hluti('Í vinnslu', d.filter(x => x.wip)) +
          hluti('Ný — bíða fyrstu skoðunar', d.filter(x => x.nytt && !x.done && !x.wip)) + hluti('Á næstunni', d.filter(x => x.upcoming).sort((a, b) => a.latestMonth - b.latestMonth));
        if (!body) body = emptyHtml('Ekkert brunakerfi komið á tíma.');
      }
      return modPanel(k, g && g.data ? g.data.filter(x => x.due).length + ' komin á tíma · ' + g.data.filter(x => x.done).length + ' búin ' + AR : 'Brunakerfi', body,
        uppfTakki('bk') + '<button type="button" class="btn iv sm" data-t5="go" data-view="brunayfirlit">Brunakerfi ›</button>');
    }
    if (k === 'starfsmenn') {
      const nuna = Date.now(), dagur = ymd(new Date()), upphafDags = new Date(new Date().toDateString()).getTime();
      const lina = x => {
        const mal = S.rows.filter(r => onBoardOf(r, x)), lidnir = mal.filter(r => r.due_at && tStamp(r.due_at) < nuna), jobs = jobsFor(x);
        const vika = jobs.filter(j => { const t = tStamp(j.date); return t >= upphafDags && t < upphafDags + 7 * 864e5; }).length;
        return '<tr><td><button type="button" class="clink" data-t5="filter" data-f="p:' + esc(x) + '" title="Sýna borð ' + esc(x) + '">' + esc(x) + '</button></td>' +
          '<td>' + mal.length + '</td><td>' + mal.filter(r => r.status === 'nytt').length + '</td><td' + (lidnir.length ? ' class="hot"' : '') + '>' + lidnir.length + '</td>' +
          '<td>' + mal.filter(r => r.important).length + '</td><td>' + jobs.filter(j => String(j.date || '').slice(0, 10) === dagur).length + ' / ' + vika + '</td><td>' + cardsFor(x).length + '</td></tr>';
      };
      const body = '<div class="stbl-w"><table class="stbl"><thead><tr><th>Starfsmaður</th><th>Mál</th><th>Ný</th><th>Frestur liðinn</th><th>Áríðandi</th><th>Verk í dag / 7 d.</th><th>Spjöld</th></tr></thead><tbody>' +
        folk().map(lina).join('') + '</tbody></table></div>' +
        '<div class="more">Á Master: ' + S.rows.filter(isFree).length + ' mál · þar af ' + S.rows.filter(r => normW(r.assigned_to) === AI_WORKER).length + ' í bunka Charlize · smelltu á nafn til að sjá borðið</div>';
      return modPanel(k, folk().length + ' starfsmenn · ' + S.rows.filter(r => !isFree(r)).length + ' mál á borðum', body);
    }
    if (k === 'vinnublod') {
      const g = isOpen(k) ? gogn('skyrslur', saekjaSkyrslur) : null, c0 = S.counts.sara, sia = S.vbSia || 'allt';
      let body;
      if (!g || (!g.data && !g.villa)) body = emptyHtml('Sæki vinnublöðin…');
      else if (g.villa) body = '<p class="err">Náði ekki í vinnublöðin: ' + esc(g.villa) + '</p>';
      else {
        const listi = vbListi(g.data), passar = (x, f) => f === 'allt' || (f === 'buid' ? x.buid : x.b.stada === f);
        const synd = listi.filter(x => passar(x, sia)).sort((a, b) => (b.buid - a.buid) || ((b.b.stada === 'samthykkt') - (a.b.stada === 'samthykkt')) || String(a.b.fyrirtaeki || '').localeCompare(String(b.b.fyrirtaeki || ''), 'is'));
        body = '<div class="vbsia"><div class="seg sm" role="group" aria-label="Sía vinnublaða">' + [['allt', 'Öll'], ['bidur', 'Bíða'], ['samthykkt', 'Samþykkt'], ['buid', 'Líklega búin']].map(f =>
            '<button type="button" data-t5="vb-sia" data-v="' + f[0] + '" aria-pressed="' + (sia === f[0]) + '">' + f[1] + '<span class="c">' + listi.filter(x => passar(x, f[0])).length + '</span></button>').join('') + '</div></div>' +
          (synd.length ? synd.map(vbRow).join('') : emptyHtml('Ekkert vinnublað í þessari síu.'));
      }
      const sum = g && g.data ? g.data.blod.filter(b => b.stada === 'bidur').length + ' bíða · ' + g.data.blod.filter(b => b.stada === 'samthykkt').length + ' samþykkt · ' + vbListi(g.data).filter(x => x.buid).length + ' líklega búin'
        : c0 ? (c0.bidur || 0) + ' bíða yfirferðar · ' + (c0.samthykkt || 0) + ' samþykkt' : 'vinnublöð';
      return modPanel(k, sum, body, uppfTakki('skyrslur'));
    }
    if (k === 'ivinnslu') {
      const g = isOpen(k) ? gogn('skyrslur', saekjaSkyrslur) : null, mal = S.rows.filter(r => r.status === 'i_vinnslu').sort(rodun);
      let body = '<div class="sect">Mál merkt í vinnslu (' + mal.length + ')</div>' +
        (mal.length ? mal.map(r => lrowHtml(r, virkniEftir(r) ? '<span class="tag ok">Líklega búið</span>' : '<span class="tag">' + ageDays(r) + ' dagar</span>')).join('') : '<div class="more">Ekkert mál er merkt í vinnslu.</div>');
      if (!g || !g.data) {
        body += g && g.villa ? '<p class="err">' + esc(g.villa) + '</p>' : '<div class="more">Sæki vinnublöð og Ársskoðun…</div>';
        return modPanel(k, mal.length + ' mál í vinnslu', body, uppfTakki('skyrslur'));
      }
      const D = g.data, buin = vbListi(D).filter(x => x.buid);
      body += '<div class="sect">Vinnublöð með bæði skýrslu og reikningi — líklega búin (' + buin.length + ')</div>' +
        (buin.length ? buin.map(vbRow).join('') : '<div class="more">Ekkert vinnublað með bæði skýrslu og reikningi.</div>');
      const ars = D.iVinnslu.map(fid => Object.assign({ fid }, sonnun(fid, new Date(D.AR, 0, 1).getTime(), D))).sort((a, b) => (!!(b.sk || b.rk)) - (!!(a.sk || a.rk)));
      const arsMed = ars.filter(x => x.sk || x.rk).length;
      body += '<div class="sect">Ársskoðun merkt í vinnslu (' + ars.length + ' · ' + arsMed + ' með skýrslu eða reikningi ' + D.AR + ')</div>' +
        (ars.length ? '<div class="aklist">' + ars.slice(0, 12).map(x => '<div class="akrow"><span class="aknr">' + (x.sk && x.rk ? '✓' : x.sk || x.rk ? '½' : '·') + '</span><div class="akinfo">' +
            '<a class="clink" href="#company/' + x.fid + '" data-t5="fyr-id" data-fid="' + x.fid + '">' + esc(x.nafn || '#' + x.fid) + '</a>' +
            '<span class="s">' + (x.sk ? '📄 skýrsla ' + D.AR : 'engin skýrsla ' + D.AR) + ' · ' + (x.rk ? '🧾 ' + esc(x.rk.num || 'sala') + ' ' + esc(fmtD(x.rk.created_at)) : 'enginn reikningur ' + D.AR) + '</span></div></div>').join('') + '</div>' +
          (ars.length > 12 ? '<div class="more">+ ' + (ars.length - 12) + ' til viðbótar — sjá Ársskoðun</div>' : '') : '<div class="more">Ekkert merkt í vinnslu í Ársskoðun.</div>');
      return modPanel(k, mal.length + ' mál · ' + buin.length + ' vinnublöð líklega búin · ' + ars.length + ' í Ársskoðun', body,
        uppfTakki('skyrslur') + '<button type="button" class="btn iv sm" data-t5="go" data-view="arsskodun">Ársskoðun ›</button>');
    }
    if (k === 'postsvor') {
      const rows = S.rows.filter(r => isPost(r) && !r.svarad_at).sort(rodun);
      return modPanel(k, rows.length + ' bíða svars', rows.length
        ? rows.slice(0, 8).map(r => lrowHtml(r, isFree(r) ? '<button type="button" class="btn iv sm" data-t5="take" data-id="' + r.id + '"' + dis(r.id) + '>Taka ›</button>' : '')).join('') +
          (rows.length > 8 ? '<div class="more">+ ' + (rows.length - 8) + ' til viðbótar</div>' : '')
        : emptyHtml('Enginn póstur bíður svars.'),
        '<button type="button" class="btn gold sm" data-t5="go" data-view="thjonustuver-postar">Opna pósthólfið ›</button>');
    }
    if (k === 'akstur') {
      const listar = aksturslistar(), valinn = S.akListi || 1, ids = listar[valinn];
      const g = ids.length && isOpen(k) ? gogn('akstur:' + ids.join(','), () => saekjaStopp(ids)) : null;
      let body;
      if (!ids.length) body = emptyHtml('Enginn á lista ' + valinn + '. Opnaðu mál og veldu „🚗 Akstur" — eða settu kerfi á lista úr Brunakerfi.');
      else if (!g || (!g.data && !g.villa)) body = emptyHtml('Sæki stoppin…');
      else if (g.villa) body = '<p class="err">Náði ekki í stoppin: ' + esc(g.villa) + '</p>';
      else body = '<div class="aklist">' + g.data.map((f, i) => {
          const mal = S.rows.filter(r => r.fyrirtaeki_id === f.id), t = f.taeki;
          return '<div class="akrow"><span class="aknr">' + (i + 1) + '</span><div class="akinfo">' +
              '<a class="clink" href="#company/' + f.id + '" data-t5="fyr-id" data-fid="' + f.id + '">' + esc(f.nafn || '(ónefnt)') + '</a>' +
              '<span class="s">' + esc([f.heimilisfang, f.postnumer].filter(Boolean).join(', ') || 'Vantar heimilisfang') + (simiAf(f) ? ' · ' + esc(simiAf(f)) : '') + '</span>' +
              (t && t.units ? '<span class="s">Tæki ' + t.units + ' · SLT ' + (t.slt || 0) + ' · BSL ' + (t.bsl || 0) + ' · RS ' + (t.rs || 0) + '</span>' : '') +
              (mal.length ? '<span class="s">' + mal.map(r => '<button type="button" class="clink" data-t5="skoda" data-id="' + r.id + '">' + esc(String(r.title || '(ónefnt mál)').slice(0, 60)) + '</button>').join(' · ') + '</span>' : '') +
            '</div><div class="akacts">' +
              [1, 2, 3].filter(x => x !== valinn).map(x => '<button type="button" class="skb" data-t5="ak-setja" data-fid="' + f.id + '" data-v="' + x + '" title="Færa á lista ' + x + '">→ ' + x + '</button>').join('') +
              '<button type="button" class="skb skx" data-t5="ak-setja" data-fid="' + f.id + '" data-v="0" title="Taka af lista" aria-label="Taka af lista">✕</button></div></div>';
        }).join('') + '</div>';
      const tabs = '<div class="seg sm" role="group" aria-label="Aksturslisti">' + [1, 2, 3].map(x => '<button type="button" data-t5="ak-listi" data-v="' + x + '" aria-pressed="' + (valinn === x) + '">Listi ' + x + '<span class="c">' + listar[x].length + '</span></button>').join('') + '</div>';
      const action = tabs +
        (ids.length ? '<button type="button" class="btn gold sm" data-t5="ak-prenta" data-v="' + valinn + '">🖨 Prenta fyrir bílstjóra</button>' : '') +
        (g && g.data && g.data.some(f => f.heimilisfang) ? '<a class="btn iv sm" href="' + esc(mapsSlod(g.data)) + '" target="_blank" rel="noopener">🗺 Leið</a>' : '') +
        uppfTakki('akstur:') + '<button type="button" class="btn iv sm" data-t5="go" data-view="aksturslisti">Vaktin ›</button>';
      return modPanel(k, 'Listi 1 · ' + listar[1].length + '  ·  Listi 2 · ' + listar[2].length + '  ·  Listi 3 · ' + listar[3].length, body, action);
    }
    if (k === 'krofur') {
      const g = isOpen(k) ? gogn('krofur', saekjaKrofur) : null, nuna = Date.now();
      let body, sum;
      if (!g || (!g.data && !g.villa)) { body = emptyHtml('Sæki kröfurnar…'); sum = S.counts.krofur == null ? 'Kröfur' : S.counts.krofur + ' í talningu'; }
      else if (g.villa) { body = '<p class="err">Náði ekki í kröfurnar: ' + esc(g.villa) + '</p>'; sum = 'Kröfur'; }
      else {
        const d = g.data;
        const yfir = d.filter(x => x.gjald && x.gjald.due_date && tStamp(x.gjald.due_date) < nuna).sort((a, b) => tStamp(a.gjald.due_date) - tStamp(b.gjald.due_date));
        const osendar = d.filter(x => !x.send);
        const kb = (l, listi) => '<div class="kbox"><div class="lbl">' + l + '</div><div class="v">' + listi.length + '</div><div class="km">' + kr(summa(listi)) + '</div></div>';
        body = '<div class="kboxes">' + kb('Útistandandi', d) + kb('Yfir gjalddaga', yfir) + kb('Ósendar', osendar) + '</div>' +
          (yfir.length ? '<div class="sect">Yfir gjalddaga — elstu fyrst (' + yfir.length + ')</div>' + yfir.slice(0, 10).map(x => soluLina(x, '<span class="tag hot">' + daga(x.gjald.due_date) + ' d. yfir</span>')).join('') : '') +
          (osendar.length ? '<div class="sect">Ósendar kröfur (' + osendar.length + ')</div>' + osendar.slice(0, 8).map(x => soluLina(x, '<span class="tag">' + daga(x.created_at) + ' d.</span>')).join('') : '');
        sum = d.length + ' útistandandi · ' + kr(summa(d)) + ' · ' + yfir.length + ' yfir gjalddaga';
      }
      return modPanel(k, sum, body, uppfTakki('krofur') + '<button type="button" class="btn gold sm" data-t5="go" data-view="krofu-yfirlit">Kröfu yfirlit ›</button>');
    }
    if (k === 'gleymt') {
      const g = isOpen(k) ? gogn('gleymt', saekjaGleymt) : null, AR = new Date().getFullYear();
      let body, sum = 'Gleymst að rukka?';
      if (!g || (!g.data && !g.villa)) body = emptyHtml('Ber saman skýrslur, sölur og drög…');
      else if (g.villa) body = '<p class="err">Náði ekki í samanburðinn: ' + esc(g.villa) + '</p>';
      else {
        const d = g.data;
        body = '<div class="sect">Úttekt ' + AR + ' án reiknings (' + d.uttekt.length + ')</div>' +
          (d.uttekt.length ? '<div class="aklist">' + d.uttekt.slice(0, 15).map(x => '<div class="akrow"><span class="aknr">' + esc(x.skyrsla_dags && !/-01-01$/.test(x.skyrsla_dags) ? fmtD(x.skyrsla_dags) : String(AR)) + '</span><div class="akinfo">' +
              '<a class="clink" href="#company/' + x.fyrirtaeki_id + '" data-t5="fyr-id" data-fid="' + x.fyrirtaeki_id + '">' + esc(x.nafn || '(ónefnt)') + '</a>' +
              '<span class="s">' + esc([x.heimilisfang, x.postnumer].filter(Boolean).join(', ')) + ' · ' + x.skyrslur + (x.skyrslur === 1 ? ' skýrsla' : ' skýrslur') + ', enginn reikningur á stað, kúnna né systurstað</span></div></div>').join('') + '</div>' +
            (d.uttekt.length > 15 ? '<div class="more">+ ' + (d.uttekt.length - 15) + ' til viðbótar</div>' : '') : '<div class="more">Engin úttekt án reiknings.</div>') +
          '<div class="sect">Greitt síðar — drög eldri en 14 daga (' + d.sidar.length + ' · ' + kr(summa(d.sidar)) + ')</div>' +
          (d.sidar.length ? d.sidar.slice(0, 8).map(x => soluLina(x, '<span class="tag">' + daga(x.created_at) + ' d.</span>')).join('') : '<div class="more">Engin gömul drög.</div>') +
          '<div class="sect">Kort eða reiðufé — aldrei merkt greitt (' + d.kort.length + ' · ' + kr(summa(d.kort)) + ')</div>' +
          (d.kort.length ? d.kort.slice(0, 8).map(x => soluLina(x, '<span class="tag">' + esc(x.greitt_med === 'kort' ? 'Kort' : 'Reiðufé') + '</span>')).join('') : '<div class="more">Allt merkt greitt.</div>');
        sum = d.uttekt.length + ' úttektir án reiknings · ' + d.sidar.length + ' greitt síðar · ' + d.kort.length + ' ómerkt greitt';
      }
      return modPanel(k, sum, body, uppfTakki('gleymt') + '<button type="button" class="btn iv sm" data-t5="go" data-view="krofu-yfirlit">Kröfu yfirlit ›</button>');
    }
    if (k === 'bakfaersla') {
      const g = isOpen(k) ? gogn('bakf', saekjaBakfaerslur, 600000) : null;
      const ORD = new RegExp(BAKF_ORD.join('|'), 'i'), mal = S.rows.filter(r => ORD.test([r.title, r.notes, r.summary].join(' ')));
      let body = '<div class="sect">Opin mál (' + mal.length + ')</div>' + (mal.length ? mal.map(r => lrowHtml(r, '')).join('') : '<div class="more">Ekkert opið mál nefnir bakfærslu eða breyttan reikning.</div>');
      let sum = mal.length + ' mál';
      if (g && g.data) {
        const d = g.data;
        body += '<div class="sect">Póstar síðustu 60 daga (' + d.postar.length + ')</div>' +
          (d.postar.length ? d.postar.slice(0, 10).map(m => {
            const r = S.rows.find(x => x.channel_ref === 'email:' + m.id);
            return '<div class="lrow"><span class="age">' + esc(fmtD(m.received_at)) + '</span><div>' +
              (r ? '<button type="button" class="lpick" data-t5="skoda" data-id="' + r.id + '"><b>' + esc(m.subject || '(ekkert efni)') + '</b></button>' : '<b>' + esc(m.subject || '(ekkert efni)') + '</b>') +
              '<span class="s">' + esc(m.sender_name || m.sender_email || '') + ' · ' + (r ? esc(eigandaTexti(r, nu())) : 'ekki á borðinu') + '</span></div><span></span></div>';
          }).join('') : '<div class="more">Enginn póstur með þessum orðum.</div>') +
          '<div class="sect">Kreditreikningar gerðir síðustu 60 daga (' + d.kredit.length + ' · ' + kr(summa(d.kredit)) + ')</div>' +
          d.kredit.slice(0, 6).map(x => soluLina(x, '')).join('');
        sum = mal.length + ' mál · ' + d.postar.length + ' póstar · ' + d.kredit.length + ' kreditreikningar';
      } else body += g && g.villa ? '<p class="err">Náði ekki í póstinn: ' + esc(g.villa) + '</p>' : '<div class="more">Les póstinn…</div>';
      return modPanel(k, sum, body, uppfTakki('bakf') + '<button type="button" class="btn iv sm" data-t5="go" data-view="thjonustuver-postar">Pósthólfið ›</button>');
    }
    if (k === 'afgreidsla') {
      const g = isOpen(k) ? gogn('afgr', saekjaAfgreidslu) : null;
      let body, sum = 'Kassinn';
      if (!g || (!g.data && !g.villa)) body = emptyHtml('Sæki stöðuna á kassanum…');
      else if (g.villa) body = '<p class="err">Náði ekki í kassann: ' + esc(g.villa) + '</p>';
      else {
        const d = g.data, idag = d.vika.filter(s => tStamp(s.created_at) >= d.dagur);
        const drog = d.opin.filter(s => s.status === 'drog').sort((a, b) => tStamp(a.created_at) - tStamp(b.created_at));
        const ogreitt = d.opin.filter(s => s.greitt_med === 'reikningur' && s.status !== 'drog');
        const omerkt = d.opin.filter(s => (s.greitt_med === 'kort' || s.greitt_med === 'reidufe') && s.status === 'final');
        const kb = (l, listi) => '<div class="kbox"><div class="lbl">' + l + '</div><div class="v">' + listi.length + '</div><div class="km">' + kr(summa(listi)) + '</div></div>';
        body = '<div class="kboxes">' + kb('Í dag', idag) + kb('Þessi vika', d.vika) + kb('Opin drög', drog) + kb('Ógreiddir reikningar', ogreitt) + kb('Kort/reiðufé ómerkt', omerkt) + '</div>' +
          (drog.length ? '<div class="sect">Elstu opnu drögin</div>' + drog.slice(0, 6).map(x => soluLina(x, '<span class="tag">' + daga(x.created_at) + ' d.</span>')).join('') : '');
        sum = idag.length + ' sölur í dag · ' + drog.length + ' opin drög · ' + ogreitt.length + ' ógreiddir reikningar';
      }
      return modPanel(k, sum, body, uppfTakki('afgr') + '<button type="button" class="btn iv sm" data-t5="go" data-view="sala">Sala ›</button>');
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
    const mitt = card('Mitt borð', mine.length, 'mál á þínu borði');
    const heitt = card('Áríðandi', hot, 'opin áríðandi mál', true);
    if (mode === 'krofur') return card('Útistandandi kröfur', G.krofur && G.krofur.data ? G.krofur.data.length : S.counts.krofur == null ? '—' : S.counts.krofur, 'ógreiddir reikningar') + card('Á Master', master.length, 'opin mál án starfsmanns') + mitt + heitt;
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
        (Array.isArray(l.modes) && l.modes.length && M(l.modes[0]) ? '<span class="lk-m">' + esc(M(l.modes[0]).l) + '</span>' : '');
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
      '<label class="lk-ham"><input type="checkbox" data-k="lm"> Aðeins í hamnum „' + esc((M(mode) || MODES.thjonusta).l) + '“</label>' +
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
      I_VOLDU.map(k => '<div class="cfgrow">' + plate(MODS[k].n) + '<div class="cfgt"><b>' + MODS[k].t + '</b><span>' + MODS[k].d + '</span></div><span class="lock">Í völdu máli</span>' +
        '<button type="button" class="sw" role="switch" aria-checked="' + !!c.mods[k][0] + '" data-t5="cfg-on" data-m="' + k + '" aria-label="' + MODS[k].t + '"></button></div>').join('') +
      '<div class="cfgrow"><span class="plate">—</span><div class="cfgt"><b>Spjall</b><span>Slökkt í bili fyrir alla.</span></div><span></span><span class="lock">Slökkt</span></div>' +
      '<div class="cfgfoot">Breytingar vistast strax og fylgja þér á milli tölva og í appið. Hver hamur er sín opna: einingar hamsins fara efst — á breiðum skjá í dálkinn vinstra megin.</div>';
  }

  /* ── leit: fyrirtæki og opin mál ── */
  // Fyrirtækjalistinn er þegar í minni (Companies.list — fyrirtaeki án eyddra, 114 endurnýjar á 60 s).
  // Sé hann ekki kominn er spurt beint í fyrirtaeki.
  const fold = s => String(s || '').toLocaleLowerCase('is').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae');
  let _leitT = 0, _leitNr = 0;
  async function finnaFyrirtaeki(q) {
    const f = fold(q), tolur = q.replace(/\D/g, '');
    let listi = [];
    try { listi = window.Companies && Array.isArray(Companies.list) ? Companies.list : []; } catch (_) {}
    let nidur = [];
    if (listi.length) {
      nidur = listi.filter(x => x && !x.deleted_at && (fold(x.nafn).indexOf(f) >= 0 || fold(x.heimilisfang).indexOf(f) >= 0 ||
        (tolur.length >= 4 && String(x.kennitala || '').replace(/\D/g, '').indexOf(tolur) >= 0)));
    } else if (sb()) {
      const h = q.replace(/[,()"%*\\]/g, ' ').trim();
      try {
        const r = await sb().from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,postnumer').is('deleted_at', null)
          .or('nafn.ilike."%' + h + '%",heimilisfang.ilike."%' + h + '%"' + (tolur.length >= 4 ? ',kennitala.ilike."%' + tolur + '%"' : '')).limit(40);
        nidur = r.data || [];
      } catch (_) {}
    }
    const byrjar = x => (fold(x.nafn).indexOf(f) === 0 ? 0 : 1);
    return nidur.sort((a, b) => byrjar(a) - byrjar(b) || String(a.nafn || '').length - String(b.nafn || '').length).slice(0, 12)
      .map(x => ({ id: x.id, nafn: x.nafn || '', kt: x.kennitala || '', heim: [x.heimilisfang, x.postnumer].filter(Boolean).join(' ') }));
  }
  function leita(k, q) {
    const st = k === 'nc' ? S.ny : S.leit, nr = ++_leitNr;
    st.q = q;
    st.idx = -1;
    if (k === 'nc') st.fyr = null;                         // nýr innsláttur = ekkert fyrirtæki valið
    clearTimeout(_leitT);
    if (String(q || '').trim().length < 2) { if (k === 'nc') st.tillogur = []; else st.fyr = []; st.opid = false; render(); return; }
    _leitT = setTimeout(async () => {
      const nidur = await finnaFyrirtaeki(String(q).trim());
      if (nr !== _leitNr) return;
      if (k === 'nc') S.ny.tillogur = nidur; else S.leit.fyr = nidur;
      st.opid = true;
      render();
    }, 160);
  }
  const malLeit = q => { const f = fold(q); return f.length < 2 ? [] : S.rows.filter(r => fold([r.title, whereOf(r), r.summary].join(' ')).indexOf(f) >= 0).sort(rodun).slice(0, 8); };
  function leitHtml() {
    const L = S.leit, q = String(L.q || '').trim();
    let pop = '';
    if (L.opid && q.length >= 2) {
      const opin = fid => S.rows.filter(r => String(r.fyrirtaeki_id) === String(fid)).length;
      const fyr = L.fyr.map((x, i) => '<div class="pitem' + (L.idx === i ? ' on' : '') + '">' +
          '<a class="pmain" href="#company/' + x.id + '" data-t5="fyr-id" data-fid="' + x.id + '"><b>' + esc(x.nafn) + '</b><span>' + esc([x.heim, x.kt].filter(Boolean).join(' · ')) + '</span></a>' +
          (opin(x.id) ? '<button type="button" class="btn iv sm" data-t5="filter" data-f="f:' + x.id + '">' + opin(x.id) + ' opin mál ›</button>' : '') + '</div>').join('');
      const mal = malLeit(q).map(r => '<button type="button" class="pitem pmal" data-t5="skoda" data-id="' + r.id + '"><b>' + esc(r.title || '(ónefnt mál)') + '</b>' +
          '<span>' + esc([whereOf(r), eigandaTexti(r, nu())].filter(Boolean).join(' · ')) + '</span></button>').join('');
      pop = '<div class="pop"><div class="plbl">Fyrirtæki</div>' + (fyr || '<div class="pnone">Ekkert fyrirtæki fannst.</div>') +
        (mal ? '<div class="plbl">Opin mál</div>' + mal : '') + '</div>';
    }
    return (S.tengjaVid ? tfBanner() : '') + '<div class="leit"><input type="search" data-k="lq" value="' + esc(L.q) + '" placeholder="Leita að fyrirtæki, kennitölu eða máli…" aria-label="Leita að fyrirtæki eða máli" autocomplete="off">' + pop + '</div>';
  }
  function composerHtml() {
    const n = nu(), ppl = folk(), N = S.ny, q = String(N.q || '').trim();
    const pop = !N.opid || q.length < 2 ? '' : '<div class="pop">' + (N.tillogur.length
      ? N.tillogur.map((x, i) => '<button type="button" class="pitem pmal' + (N.idx === i ? ' on' : '') + '" data-t5="ny-fyr" data-i="' + i + '"><b>' + esc(x.nafn) + '</b><span>' + esc([x.heim, x.kt].filter(Boolean).join(' · ')) + '</span></button>').join('')
      : '<div class="pnone">Ekkert fyrirtæki fannst — málið vistast með nafninu eins og það er skrifað.</div>') + '</div>';
    return '<section class="panel" aria-label="Nýtt mál"><div class="composer ny">' +
      '<input type="text" data-k="nt" placeholder="Hvað þarf að gera?" aria-label="Titill máls">' +
      '<div class="nyfyr"><input type="text" data-k="nc" value="' + esc(N.q) + '" placeholder="Fyrirtæki — byrjaðu að skrifa" aria-label="Fyrirtæki" autocomplete="off">' +
        (N.fyr ? '<span class="valid">✓ ' + esc(N.fyr.nafn) + '</span>' : '') + pop + '</div>' +
      '<label class="nylbl"><span class="lbl">Setja á</span><select data-k="ne" aria-label="Setja málið á">' +
        (ppl.indexOf(n) >= 0 ? '<option value="' + esc(n) + '" selected>Mitt borð (' + esc(n) + ')</option>' : '') +
        '<option value="">Master</option>' + ppl.filter(x => x !== n).map(x => '<option value="' + esc(x) + '">' + esc(x) + '</option>').join('') + '</select></label>' +
      '<label class="nylbl"><span class="lbl">Hamur</span><select data-k="nh" aria-label="Hamur">' +
        hamaListi().map(k => '<option value="' + esc(k) + '"' + (k === cfg().mode ? ' selected' : '') + '>' + esc(M(k).l) + '</option>').join('') + '</select></label>' +
      '<textarea data-k="nl" rows="2" placeholder="Lýsing (valfrjálst)" aria-label="Lýsing"></textarea>' +
      '<label class="nylbl"><span class="lbl">Frestur</span><input type="date" data-k="nd" aria-label="Frestur"></label>' +
      '<label class="nychk"><input type="checkbox" data-k="ni"> Áríðandi</label>' +
      '<div class="nybtn"><button type="button" class="btn gold sm" data-t5="composer-save">Vista mál</button>' +
        '<button type="button" class="btn iv sm" data-t5="composer">Hætta við</button></div>' +
    '</div></section>';
  }
  function veljaNyFyr(i) {
    const x = S.ny.tillogur[i], root = rot();
    if (!x) return;
    const f = root && root.querySelector('[data-k="nc"]');
    if (f) f.value = x.nafn;                               // áður en teiknað er — drögin taka gildið með sér
    S.ny.fyr = x; S.ny.q = x.nafn; S.ny.opid = false; S.ny.idx = -1;
    render();
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
    // Opinn fellilisti lokast og texti í ritun á skipulagsborði truflast ef teiknað er undir — bíða.
    // Skráarval opið: teikning myndi skipta út <input type="file"> og skrárnar tapast.
    if (S.skjalVal || (ae && (ae.tagName === 'SELECT' || (ae.dataset && (ae.dataset.sk || ae.dataset.bm))))) { clearTimeout(_frestad); _frestad = setTimeout(render, 1200); return; }
    const n = nu(), c = cfg(), mode = M(c.mode) || MODES.thjonusta;
    const master = masterRows(), mine = mineRows(), baraMitt = !!c.baraMitt;
    // Hvaða opið mál sem er má skoða — ekki aðeins þau á mínu borði. 0 = lokað viljandi (✕).
    let selId = S.sel[n];
    if (selId !== 0 && !S.rows.some(r => r.id === selId)) selId = S.sel[n] = mine.length ? mine[0].id : null;
    const selRow = selId ? S.rows.find(r => r.id === selId) || null : null;
    const selMinn = !!(selRow && onBoardOf(selRow, n));
    const visible = feedRows(master);
    const feedFalinn = baraMitt && !serSia(S.filter);      // síað á fyrirtæki/starfsmann/öll sýnir listann líka í „bara mitt"
    const now = new Date();
    const hot = S.rows.filter(r => r.important).length;
    const ppl = folk();

    const top = mode.first.slice();
    if (isOn('dagskra') && top.indexOf('dagskra') < 0) top.unshift('dagskra');
    const topHtml = top.map(k => (k === 'dagskra' ? dagskraHtml() : bottomHtml(k))).join('');
    const bottom = BOTTOM.filter(k => isOn(k) && top.indexOf(k) < 0).map(bottomHtml).join('');

    const selMarkup = selHtml(selRow);
    const nyleg = master.filter(r => ageDays(r) <= 30).length;
    const bunki = master.filter(r => normW(r.assigned_to) === AI_WORKER).length;
    const fjoldi = f => f === 'oll' ? S.rows.length : master.filter(r => matchFilter(r, f)).length;

    const feed = !S.loaded && (S.loading || _dbBid) ? emptyHtml('Sæki mál…')
      : visible.length
        ? visible.slice(0, S.synd).map(r => feedRow(r, r.id === selId) + (r.id === selId && !selMinn ? '<div class="sel inline">' + selMarkup + '</div>' : '')).join('') +
          (visible.length > S.synd ? '<div class="pager"><button type="button" class="btn iv sm" data-t5="more">Sýna fleiri · ' + (visible.length - S.synd) + ' eftir</button></div>' : '')
        : emptyHtml(master.length ? 'Ekkert í þessari síu.' : (S.loaded ? 'Master borðið er tómt.' : 'Engin mál sótt enn.'));

    const siuHeiti = S.filter === 'oll' ? 'Öll opin mál' : /^p:/.test(S.filter) ? 'Borð · ' + S.filter.slice(2)
      : /^f:/.test(S.filter) ? 'Fyrirtæki · ' + (whereOf(S.rows.find(r => String(r.fyrirtaeki_id) === S.filter.slice(2)) || {}) || 'mál') : c.mode === 'thjonusta' ? 'Master borð' : 'Master · ' + mode.l;
    // Á síma: mál til skoðunar sem er ekki í sýnilega listanum (t.d. opnað úr leit) birtist efst.
    const selUtan = selRow && !selMinn && !visible.slice(0, S.synd).some(r => r.id === selId) ? '<div class="sel inline">' + selMarkup + '</div>' : '';
    const mineHtml = '<section class="panel colmine" aria-label="Mitt borð">' +
        '<header class="phead">' + plate('03') + '<h2 class="ptitle">Mitt borð</h2><span class="sum">' + mine.length + ' mál</span>' +
          (S.rows.filter(r => onBoardOf(r, n)).length > mine.length ? '<button type="button" class="pchip" data-t5="filter" data-f="p:' + esc(n) + '" title="Sýna öll þín mál, í öllum hömum">+ ' + (S.rows.filter(r => onBoardOf(r, n)).length - mine.length) + ' í öðrum hömum</button>' : '') +
          '<span class="grow"></span><button type="button" class="btn iv sm" data-t5="take-next">Taka næsta ›</button></header>' +
        (feedFalinn ? selUtan : '') +
        (mine.length
          ? mine.map(r => mineRow(r, r.id === selId) + (r.id === selId ? '<div class="sel inline">' + selMarkup + '</div>' : '')).join('')
          : emptyHtml('Borðið þitt er autt. Taktu mál af Master eða skráðu nýtt mál á þig.')) +
      '</section>';
    const board = mode.board
      ? '<div class="board' + (feedFalinn ? ' bara' : '') + '" data-view="' + (feedFalinn ? 'mitt' : S.view) + '">' +
          (feedFalinn ? '' : '<div class="seg phone-seg" role="group" aria-label="Borð">' +
            '<button type="button" data-t5="view" data-v="master" aria-pressed="' + (S.view === 'master') + '">' + esc(siuHeiti) + '<span class="c">' + visible.length + '</span></button>' +
            '<button type="button" data-t5="view" data-v="mitt" aria-pressed="' + (S.view === 'mitt') + '">Mitt borð<span class="c">' + mine.length + '</span></button></div>' +
          '<section class="panel colmaster" aria-label="' + esc(siuHeiti) + '">' +
            '<header class="phead">' + plate('02') + '<h2 class="ptitle">' + esc(siuHeiti) + '</h2><span class="sum">' + visible.length + ' mál</span><span class="grow"></span>' +
              (/^[pf]:/.test(S.filter) ? '<button type="button" class="btn iv sm" data-t5="filter" data-f="allt">✕ Aftur á Master</button>' : '') +
              '<div class="seg" role="group" aria-label="Sía">' + [['allt', 'Allt'], ['post', 'Póstar'], ['beidni', 'Beiðnir'], ['hot', 'Áríðandi'], ['buid', 'Líklega búin'], ['oll', 'Öll opin']].map(f =>
                '<button type="button" data-t5="filter" data-f="' + f[0] + '" aria-pressed="' + (S.filter === f[0]) + '">' + f[1] + '<span class="c">' + fjoldi(f[0]) + '</span></button>').join('') + '</div>' +
              '<button type="button" class="btn iv sm" data-t5="hr-opna" aria-pressed="' + !!S.hreinsa + '" title="Fara yfir Master: tvítekið, líklega búið, vantar fyrirtæki, gamalt">🧹 Hreinsa</button>' +
              '<button type="button" class="btn gold sm" data-t5="take-next">Taka næsta ›</button></header>' +
            '<div class="psub">' + nyleg + ' síðustu 30 daga · ' + bunki + ' í bunka Charlize · Á borðum:' +
              ppl.map(x => '<button type="button" class="pchip" data-t5="filter" data-f="p:' + esc(x) + '" aria-pressed="' + (S.filter === 'p:' + x) + '">' + esc(x) + ' ' + S.rows.filter(r => onBoardOf(r, x)).length + '</button>').join('') + '</div>' +
            selUtan + feed +
          '</section>') +
          mineHtml +
          '<section class="sel side colsel" aria-live="polite">' + selMarkup + '</section>' +
        '</div>'
      : '<button type="button" class="boardstrip" data-t5="mode" data-mode="thjonusta">' + plate('02') + '<b>Master borð</b><span class="v">' + master.length + ' mál</span>' +
          plate('03') + '<b>Mitt borð</b><span class="v">' + mine.length + ' mál</span><span class="grow"></span><span class="v">Aftur í Þjónustu ›</span></button>';

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
          '' +
        '</div><div class="acts">' +
          '<label class="who"><span class="lbl">Ég er</span><select data-t5="who" aria-label="Starfsmaður">' +
            (ppl.indexOf(n) < 0 ? '<option value="" selected disabled>Veldu nafn…</option>' : '') +
            ppl.map(x => '<option' + (x === n ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></label>' +
          '<button type="button" class="btn iv" data-t5="cfg" aria-expanded="' + S.cfgOpen + '">⚙ Mitt vinnuborð</button>' +
          '<button type="button" class="btn iv" data-t5="composer" aria-expanded="' + S.composer + '">+ Nýtt mál</button>' +
        '</div></div>' +
        leitHtml() +
        (S.composer ? composerHtml() : '') +
        '<div class="modes"><span class="lbl">Hamur</span><div class="seg modeseg" role="group" aria-label="Hamur">' +
          hamaListi().map(k => '<button type="button" data-t5="mode" data-mode="' + esc(k) + '" aria-pressed="' + (c.mode === k) + '">' + esc(M(k).l) +
            '<span class="c">' + S.rows.filter(r => iHam(r, k)).length + '</span></button>').join('') +
        '</div><button type="button" class="btn iv sm" data-t5="ham-ny" aria-expanded="' + !!(S.hamForm && !S.hamForm.id) + '">+ Hamur</button>' +
        (mode.ser ? '<button type="button" class="btn iv sm" data-t5="ham-breyta" data-mode="' + esc(c.mode) + '">✎ Breyta ham</button>' : '') +
        '<span class="grow"></span><div class="seg" role="group" aria-label="Borðið">' +
          '<button type="button" data-t5="bara-mitt" data-v="0" aria-pressed="' + !baraMitt + '">Master + mitt borð</button>' +
          '<button type="button" data-t5="bara-mitt" data-v="1" aria-pressed="' + baraMitt + '">Bara mitt borð</button></div></div>' +
        hamFormHtml() + hreinsunHtml() +
        linksHtml(c.mode) +
        (ppl.indexOf(n) < 0 ? '<p class="err">„' + esc(n) + '“ er ekki starfsmaður á þessu borði' + (n === AI_WORKER ? ' — Charlize er bunkinn á Master' : '') + '. Veldu þitt nafn í „Ég er“.</p>' : '') +
        (S.cfgOpen ? '<section class="panel" aria-label="Mitt vinnuborð">' + cfgHtml() + '</section>' : '') +
        (S.err ? '<p class="err">Náði ekki í málin: ' + esc(S.err) + ' <button type="button" class="btn iv sm" data-t5="reload">Reyna aftur</button></p>' : '') +
        '<div class="kpis">' + kpiHtml(master, mine) + '</div>' +
        layout +
      '</div></div>';

    // Hálfskrifaður texti (nýtt mál, flýtileið) og fókus lifa endurteikningu af.
    const fokus = ae && ae.dataset ? ae.dataset.k : null;
    const bendill = ae && typeof ae.selectionStart === 'number' ? [ae.selectionStart, ae.selectionEnd] : null;
    const drog = {};
    root.querySelectorAll('input[data-k], textarea[data-k], select[data-k]').forEach(i => { drog[i.dataset.k] = i.type === 'checkbox' ? i.checked : i.value; });
    // Skrun innan pósts og vikunnar heldur sér ef sama mál er enn valið.
    const SKRUN = '.well p, .week, .seg.modeseg';
    const skrunSel = v.dataset.t5sel === String(selId);
    const skrun = [...root.querySelectorAll(SKRUN)].map(x => [x.scrollTop, x.scrollLeft]);
    mount.innerHTML = html;
    v.dataset.t5sel = String(selId);
    if (skrunSel) root.querySelectorAll(SKRUN).forEach((x, i) => { if (skrun[i]) { x.scrollTop = skrun[i][0]; x.scrollLeft = skrun[i][1]; } });
    root.querySelectorAll('input[data-k], textarea[data-k], select[data-k]').forEach(i => {
      const k = i.dataset.k;
      if (k in drog) { if (i.type === 'checkbox') i.checked = drog[k]; else i.value = drog[k]; }
    });
    if (fokus) { const f = root.querySelector('[data-k="' + fokus + '"]'); if (f) { f.focus(); try { if (bendill && f.setSelectionRange) f.setSelectionRange(bendill[0], bendill[1]); } catch (_) {} } }
  }

  // Eftir smell á mál: tryggja að valið mál sjáist (hliðarspjaldið á tölvu, spjaldið undir línunni í síma).
  function synaVal() {
    const v = document.getElementById(VIEW_ID), root = v && v.shadowRoot;
    if (!root) return;
    const el = [...root.querySelectorAll('.sel.side, .sel.inline')].find(x => x.offsetParent !== null);
    if (!el) return;
    const b = el.getBoundingClientRect();
    if (b.top < 0 || b.top > window.innerHeight - 140) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  // Fyrirtæki máls: beint ef málið er tengt fyrirtæki, annars eftir viðskiptavini (customers_base);
  // annars opnast leitin með nafninu svo hægt sé að velja rétta fyrirtækið.
  async function opnaFyrirtaekiMals(r) {
    if (!r) return;
    if (r.fyrirtaeki_id) { openCompany(r.fyrirtaeki_id); return; }
    const c = sb();
    if (c && r.customer_base_id) {
      try {
        const q = await c.from('fyrirtaeki').select('id').eq('customer_base_id', r.customer_base_id).is('deleted_at', null).limit(2);
        if (q.data && q.data.length === 1) { openCompany(q.data[0].id); return; }
      } catch (_) {}
    }
    const nafn = whereOf(r);
    if (!nafn) { toast('Þetta mál er ekki tengt fyrirtæki.', true); return; }
    S.leit.q = nafn;
    leita('lq', nafn);
    const root = rot(), f = root && root.querySelector('[data-k="lq"]');
    if (f) { f.focus(); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }

  /* ── skipulagsborð: vistun ── */
  // Spjöldin eru skrifuð sem heilt fylki, svo hver breyting er reiknuð á NÝJASTA lista stillinganna og vistanir
  // fara í röð. Texti í ritun lifir í S.skDrog þar til þjónninn hefur tekið við honum og fer með í hverja vistun.
  const nyttSkId = () => 'sb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const naestaSlot = l => l.reduce((m, x) => Math.max(m, Number(x.slot) || 0), -1) + 1;
  let _skRod = Promise.resolve();
  function vistaSpjold(breyta, skilabod) {
    const verk = _skRod.then(async () => {
      if (!stillingarTilbunar()) { toast('Stillingarnar eru enn að hlaðast — reyndu aftur eftir augnablik.', true); return false; }
      const n = nu();
      const nyr = breyta(cardsFor(n).map(x => Object.assign({}, x, S.skDrog[x.id] || {})));
      _vistar++;
      S.skStada = 'Vista…';
      stimplaSk();
      let ok = false;
      try { ok = !!(await AppSettings.save({ skipulagsbord: { by_staff: { [n]: { cards: nyr } } } })); } catch (_) {}
      _vistar--;
      S.skStada = ok ? 'Vistað kl. ' + klukka(new Date()) : '⚠ Vistaðist ekki — textinn er enn á skjánum og reynt verður aftur.';
      stimplaSk();
      if (!ok) toast('Skipulagsborðið vistaðist ekki. Afritaðu textann ef þú ert að loka.', true);
      else if (skilabod) toast(skilabod);
      return ok;
    });
    _skRod = verk.catch(() => false);
    return verk;
  }
  function stimplaSk() { const root = rot(), el = root && root.querySelector('.skstada'); if (el) el.textContent = S.skStada || ''; }
  const _skT = {}, _skBid = {};
  function bida(lykill, fn) { clearTimeout(_skT[lykill]); _skBid[lykill] = fn; _skT[lykill] = setTimeout(() => { delete _skBid[lykill]; fn(); }, 700); }
  function skola(lykill) { if (!_skBid[lykill]) return; clearTimeout(_skT[lykill]); const fn = _skBid[lykill]; delete _skBid[lykill]; fn(); }
  const skolaAllt = () => Object.keys(_skBid).forEach(skola);
  function skrifaSk(el) {
    const n = nu(), reitur = el.dataset.sk, id = el.dataset.skid;
    if (reitur === 'krass') {
      S.skDrog.__krass = el.value;
      bida('__krass', async () => {
        const texti = S.skDrog.__krass;
        if (texti == null) return;
        _vistar++;
        let ok = false;
        try { ok = !!(await AppSettings.save({ skipulagsbord: { by_staff: { [n]: { krass: texti } } } })); } catch (_) {}
        _vistar--;
        if (ok && S.skDrog.__krass === texti) delete S.skDrog.__krass;
        S.skStada = ok ? 'Vistað kl. ' + klukka(new Date()) : '⚠ Krassblaðið vistaðist ekki — reynt verður aftur.';
        stimplaSk();
      });
      return;
    }
    if (!id) return;
    (S.skDrog[id] = S.skDrog[id] || {})[reitur] = el.value;
    bida(id, async () => {
      const drog = Object.assign({}, S.skDrog[id]);
      const ok = await vistaSpjold(l => {
        const cd = l.find(x => x.id === id);
        // Eytt á annarri vél á meðan skrifað var: textinn lifir sem nýtt spjald.
        if (!cd) l.push(Object.assign({ id, slot: naestaSlot(l), verkbord_id: null, name: '', title: '', type: null, minnispunktur: true }, drog));
        return l;
      });
      const nuna = S.skDrog[id];
      if (ok && nuna && Object.keys(drog).every(kk => nuna[kk] === drog[kk])) delete S.skDrog[id];
    });
  }
  function faeraSpjald(l, fraId, tilId) {
    const rod = l.slice().sort((x, y) => (+x.slot || 0) - (+y.slot || 0));
    const i = rod.findIndex(x => x.id === fraId), j = rod.findIndex(x => x.id === tilId);
    if (i < 0 || j < 0) return l;
    const raufar = rod.map(x => +x.slot || 0);
    for (let q = 1; q < raufar.length; q++) if (raufar[q] <= raufar[q - 1]) raufar[q] = raufar[q - 1] + 1;
    rod.splice(j, 0, rod.splice(i, 1)[0]);
    rod.forEach((x, q) => { x.slot = raufar[q]; });
    return l;
  }
  function onDrag(e) {
    const t = e.target, root = rot();
    if (e.type === 'dragstart') {
      const g = t && t.closest ? t.closest('[data-skdrag]') : null;
      if (!g) return;
      S.skDrag = g.dataset.skdrag;
      try { e.dataTransfer.setData('text/plain', S.skDrag); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setDragImage(g.closest('.skc'), 16, 16); } catch (_) {}
      return;
    }
    if (!S.skDrag || !root) return;
    const kort = t && t.closest ? t.closest('.skc') : null;
    if (e.type === 'dragover') {
      if (!kort) return;
      e.preventDefault();
      root.querySelectorAll('.skc.yfir').forEach(x => { if (x !== kort) x.classList.remove('yfir'); });
      kort.classList.add('yfir');
    } else if (e.type === 'drop') {
      e.preventDefault();
      const fra = S.skDrag, til = kort && kort.dataset.skid;
      S.skDrag = null;
      if (til && til !== fra) vistaSpjold(l => faeraSpjald(l, fra, til)).then(render); else render();
    } else if (e.type === 'dragend') {
      S.skDrag = null;
      root.querySelectorAll('.skc.yfir').forEach(x => x.classList.remove('yfir'));
    }
  }
  async function onPaste(e) {
    const el = e.target, sid = el && el.dataset ? el.dataset.skid : null;
    if (!sid) return;
    let f = null;
    try { for (const it of (e.clipboardData && e.clipboardData.items) || []) if (it.kind === 'file' && /^image\//.test(it.type || '')) { f = it.getAsFile(); break; } } catch (_) {}
    if (!f) return;                                        // venjuleg líming á texta: ósnert
    e.preventDefault();
    if (f.size > 10 * 1024 * 1024) { toast('Myndin er of stór (hámark 10 MB).', true); return; }
    const c = sb();
    if (!c) { toast('Engin tenging — myndin vistaðist ekki.', true); return; }
    const slod = 'skipulag/' + sid + '-' + Date.now() + '.' + ((((f.type || '').split('/')[1]) || 'png').replace(/[^a-z0-9]/gi, '') || 'png');
    toast('Hleð upp mynd…');
    try {
      const up = await c.storage.from('verkbord-files').upload(slod, f, { contentType: f.type || 'image/png', upsert: false });
      if (up.error) throw up.error;
      const url = ((c.storage.from('verkbord-files').getPublicUrl(slod) || {}).data || {}).publicUrl;
      if (!url) throw new Error('engin slóð');
      await vistaSpjold(l => { const cd = l.find(x => x.id === sid); if (cd) cd.mynd = url; return l; }, 'Myndin er komin á spjaldið');
      render();
    } catch (err) { toast('Myndin vistaðist ekki: ' + ((err && err.message) || err), true); }
  }

  /* ── hamir: stofna, breyta, eyða (samstillt) og tengja mál ── */
  async function vistaHamir(breyta, skilabod) {
    if (!stillingarTilbunar()) { toast('Stillingarnar eru enn að hlaðast — reyndu aftur eftir augnablik.', true); return false; }
    const nyr = breyta(serHamir().map(h => Object.assign({}, h)));
    _vistar++;
    let ok = false;
    try { ok = !!(await AppSettings.save({ [CFG_KEY]: { hamir: nyr } })); } catch (_) {}
    _vistar--;
    if (!ok) toast('Hamurinn vistaðist ekki. Reyndu aftur.', true);
    else if (skilabod) toast(skilabod);
    render();
    return ok;
  }
  function hamFormHtml() {
    const F = S.hamForm;
    if (!F) return '';
    const h = F.id ? M(F.id) : null;
    const hak = (pre, k, lbl, on) => '<label class="hchk"><input type="checkbox" data-k="' + pre + k + '"' + (on ? ' checked' : '') + '> ' + esc(lbl) + '</label>';
    return '<section class="panel hamform" aria-label="' + (h ? 'Breyta ham' : 'Nýr hamur') + '">' +
      '<header class="phead"><span class="plate">' + (h ? '✎' : '+') + '</span><h2 class="ptitle">' + (h ? 'Breyta ham · ' + esc(h.l) : 'Nýr hamur') + '</h2><span class="grow"></span>' +
        '<button type="button" class="btn iv sm" data-t5="ham-loka">Hætta við</button></header>' +
      '<div class="hf">' +
        '<label class="nylbl"><span class="lbl">Nafn hamsins</span><input type="text" data-k="hn" value="' + esc(h ? h.l : '') + '" placeholder="t.d. Brunakerfi, Tilboð, Uppsetningar" maxlength="30"></label>' +
        '<div class="hgrp"><span class="lbl">Einingar sem opnast með hamnum</span>' + Object.keys(MODS).map(k => hak('hm_', k, MODS[k].t, h && h.first.indexOf(k) >= 0)).join('') + '</div>' +
        '<div class="hgrp"><span class="lbl">Taka sjálfkrafa með mál í flokki</span>' + Object.keys(FLOKKAR).map(k => hak('hf_', k, FLOKKAR[k], h && h.flokkar.indexOf(k) >= 0)).join('') + '</div>' +
        '<div class="hgrp"><span class="lbl">… eða með merki</span>' + Object.keys(MERKI).map(k => hak('hg_', k, MERKI[k], h && h.merki.indexOf(k) >= 0)).join('') + '</div>' +
        '<p class="hnote">Mál tengjast líka beint: opnaðu mál og smelltu á haminn undir „Hamir". Beint tengt mál fer af Þjónustu.</p>' +
        '<div class="nybtn">' + (h ? '<button type="button" class="btn iv sm" data-t5="ham-eyda" data-mode="' + esc(F.id) + '">🗑 Eyða ham</button><span class="grow"></span>' : '') +
          '<button type="button" class="btn gold sm" data-t5="ham-vista">' + (h ? 'Vista breytingar' : 'Stofna ham') + '</button></div>' +
      '</div></section>';
  }
  function hamirHtml(r) {
    const tags = tagList(r);
    return '<div class="hchips"><span class="slabel">Hamir</span>' + hamaListi().map(k => {
      const h = M(k), beint = tags.indexOf(HAM_MERKI + k) >= 0, inni = iHam(r, k);
      const skyring = beint ? 'Tengt beint — smelltu til að aftengja'
        : inni ? (k === 'thjonusta' ? 'Sjálfgefið: ekki tengt öðrum ham — smelltu til að tengja beint' : 'Sjálfkrafa (flokkur, merki eða póstur) — smelltu til að tengja beint')
        : 'Smelltu til að tengja málið við haminn';
      return '<button type="button" class="hchip' + (beint ? ' on' : inni ? ' auto' : '') + '" data-t5="ham-tengja" data-id="' + r.id + '" data-mode="' + esc(k) + '"' + dis(r.id) + ' title="' + esc(skyring) + '">' + esc(h.l) + '</button>';
    }).join('') + '</div>';
  }
  // Tengja/aftengja = merkið ham:<id> í tags. Fylkið lesið nýtt og skrifað skilyrt á updated_at, svo merki sem
  // gamla borðið eða önnur vél setti á sama augnabliki étist ekki.
  function tengjaHam(id, hamId) {
    const c = sb();
    if (!c || !M(hamId)) return;
    return act(id, async () => {
      for (let tilraun = 0; tilraun < 3; tilraun++) {
        const cur = await c.from('thjonustubeidni').select('tags,updated_at').eq('id', id).single();
        if (cur.error) throw cur.error;
        const tags = (Array.isArray(cur.data.tags) ? cur.data.tags : []).filter(t => typeof t === 'string');
        const merki = HAM_MERKI + hamId, var_ = tags.indexOf(merki) >= 0;
        const nyr = var_ ? tags.filter(t => t !== merki) : tags.concat([merki]);
        const r = await c.from('thjonustubeidni').update({ tags: nyr, updated_at: new Date().toISOString() }).eq('id', id).eq('updated_at', cur.data.updated_at).select('id,tags');
        if (r.error) throw r.error;
        if (r.data && r.data.length) {
          const row = S.rows.find(x => x.id === id);
          if (row) row.tags = r.data[0].tags;
          toast((var_ ? 'Tekið úr hamnum ' : 'Tengt við haminn ') + M(hamId).l);
          return;
        }
      }
      throw new Error('málið breyttist á meðan — reyndu aftur');
    });
  }

  /* ── skilaboð ── */
  let _toastT = 0;
  function toast(msg, warn, afturkalla) {
    const host = rot() || document.body;
    let t = host.querySelector('.t5toast');
    if (!t) { t = document.createElement('div'); t.className = 't5toast'; t.setAttribute('role', 'status'); host.appendChild(t); }
    t.textContent = msg;
    S.undo = typeof afturkalla === 'function' ? afturkalla : null;
    if (S.undo) { const b = document.createElement('button'); b.type = 'button'; b.className = 'undo'; b.dataset.t5 = 'undo'; b.textContent = 'Afturkalla'; t.appendChild(b); }
    t.className = 't5toast' + (warn ? ' warn' : '');
    t.hidden = false;
    clearTimeout(_toastT);
    _toastT = setTimeout(() => { t.hidden = true; S.undo = null; }, S.undo ? 7000 : warn ? 4200 : 2600);
  }

  /* ── atburðir (hlustað á skuggarótinni) ── */
  function onClick(e) {
    const v = document.getElementById(VIEW_ID), root = v && v.shadowRoot;
    if (!root || !v.classList.contains('active')) return;
    const el = e.target && e.target.closest ? e.target.closest('[data-t5]') : null;
    // Leitarniðurstöður lokast við smell utan leitarinnar.
    if ((S.leit.opid || S.ny.opid) && !(e.target.closest && e.target.closest('.leit, .nyfyr'))) {
      S.leit.opid = false;
      S.ny.opid = false;
      if (!el) { render(); return; }
    }
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
      case 'select': S.sel[nu()] = id; if (!c.baraMitt) S.view = 'mitt'; render(); synaVal(); return;
      case 'skoda': {
        S.sel[nu()] = id;
        const sr = S.rows.find(x => x.id === id);
        if (sr && !c.baraMitt) S.view = onBoardOf(sr, nu()) ? 'mitt' : 'master';
        S.leit.opid = false;
        render();
        synaVal();
        return;
      }
      case 'sel-close': S.sel[nu()] = 0; render(); return;
      case 'fyr':
      case 'fyr-id':
        // Tengill með Ctrl/Shift/Cmd opnast í nýjum flipa (#company/<id>) — vafrinn sér um það.
        if (el.tagName === 'A' && (e.ctrlKey || e.metaKey || e.shiftKey)) return;
        e.preventDefault();
        S.leit.opid = false;
        if (a === 'fyr-id' && S.tengjaVid) tengjaFyrirtaeki(S.tengjaVid, +el.dataset.fid);
        else if (a === 'fyr-id') openCompany(el.dataset.fid); else opnaFyrirtaekiMals(S.rows.find(x => x.id === id));
        return;
      case 'bara-mitt':
        if (!krefstStillinga()) return;
        c.baraMitt = el.dataset.v === '1';
        S.view = c.baraMitt ? 'mitt' : 'master';
        render();
        vistaCfg({ bara_mitt: c.baraMitt }, c.baraMitt ? 'Bara þitt borð — Master falinn' : 'Master borð sýnt aftur');
        return;
      case 'done': done(id); return;
      case 'giveback': giveBack(id); return;
      case 'reply': reply(id); return;
      case 'company': openCompany(el.dataset.fid); return;
      case 'filter': S.filter = el.dataset.f; S.synd = PAGE; S.leit.opid = false; if (!c.baraMitt) S.view = 'master'; render(); return;
      case 'more': S.synd += PAGE; render(); return;
      case 'view': S.view = el.dataset.v; render(); return;
      case 'mode':
        if (!krefstStillinga()) return;
        c.mode = el.dataset.mode;
        S.filter = (M(c.mode) || MODES.thjonusta).filter || 'allt';
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
        if (!S.composer) S.ny = { q: '', fyr: null, tillogur: [], opid: false, idx: -1 };
        render();
        if (S.composer) { const f = root.querySelector('[data-k="nt"]'); if (f) f.focus(); }
        return;
      case 'composer-save': {
        const gildi = kk => { const x = root.querySelector('[data-k="' + kk + '"]'); return x ? (x.type === 'checkbox' ? x.checked : x.value) : ''; };
        const title = String(gildi('nt')).trim();
        if (!title) { toast('Skrifaðu hvað þarf að gera.', true); const t = root.querySelector('[data-k="nt"]'); if (t) t.focus(); return; }
        const cust = String(gildi('nc')).trim();
        el.disabled = true;
        createCase({ title, cust, fyr: S.ny.fyr && S.ny.fyr.nafn === cust ? S.ny.fyr : null, eigandi: String(gildi('ne')),
          lysing: String(gildi('nl')).trim(), frestur: String(gildi('nd')), aridandi: !!gildi('ni'), ham: String(gildi('nh')) }).then(ok => {
          if (!ok) { el.disabled = false; return; }
          root.querySelectorAll('.composer [data-k]').forEach(x => { if (x.type === 'checkbox') x.checked = false; else if (x.tagName !== 'SELECT') x.value = ''; });
          S.composer = false;
          S.ny = { q: '', fyr: null, tillogur: [], opid: false, idx: -1 };
          render();
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
      case 'sk-ny': {
        const nid = nyttSkId();
        S.open[openKey('skipulag')] = true;
        vistaSpjold(l => l.concat([{ id: nid, slot: naestaSlot(l), verkbord_id: null, name: '', title: '', type: null, minnispunktur: true }])).then(() => {
          render();
          const f = rot() && rot().querySelector('[data-sk="name"][data-skid="' + nid + '"]');
          if (f) { f.focus(); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        });
        return;
      }
      case 'sk-del': {
        const sid = el.dataset.skid, gamalt = cardsFor(nu()).find(x => x.id === sid);
        const afrit = gamalt ? Object.assign({}, gamalt, S.skDrog[sid] || {}) : null;
        clearTimeout(_skT[sid]); delete _skBid[sid]; delete S.skDrog[sid];
        vistaSpjold(l => l.filter(x => x.id !== sid)).then(ok => {
          render();
          if (ok && afrit) toast('Spjaldinu var eytt', false, () => vistaSpjold(l => l.some(x => x.id === afrit.id) ? l : l.concat([afrit]), 'Spjaldið er komið aftur').then(render));
        });
        return;
      }
      case 'sk-type': {
        const sid = el.dataset.skid, ti = Number(el.dataset.i);
        vistaSpjold(l => { const cd = l.find(x => x.id === sid); if (cd) cd.type = cd.type === ti ? null : ti; return l; }).then(render);
        return;
      }
      case 'sk-faera': {
        const sid = el.dataset.skid, rod = spjold(nu()), i = rod.findIndex(x => x.id === sid), til = rod[i + Number(el.dataset.v)];
        if (til) vistaSpjold(l => faeraSpjald(l, sid, til.id)).then(render);
        return;
      }
      case 'sk-mynd-x': {
        const sid = el.dataset.skid;
        vistaSpjold(l => { const cd = l.find(x => x.id === sid); if (cd) delete cd.mynd; return l; }, 'Myndin var tekin af spjaldinu').then(render);
        return;
      }
      case 'sk-add': {
        const r = S.rows.find(x => x.id === id);
        if (!r) return;
        if (cardsFor(nu()).some(x => String(x.verkbord_id) === String(r.id))) { toast('Þetta mál er þegar á skipulagsborðinu þínu.'); return; }
        if (!isOn('skipulag') && stillingarTilbunar()) { c.mods.skipulag[0] = 1; vistaCfg({ mods: { skipulag: c.mods.skipulag.slice() } }); }
        vistaSpjold(l => l.concat([{ id: nyttSkId(), slot: naestaSlot(l), verkbord_id: r.id, name: whereOf(r), title: r.title || '', type: null }]), '📋 Komið á skipulagsborðið').then(render);
        return;
      }
      case 'undo': {
        const f = S.undo, t = root.querySelector('.t5toast');
        S.undo = null;
        if (t) t.hidden = true;
        if (f) f();
        return;
      }
      case 'ham-ny':
        S.hamForm = S.hamForm && !S.hamForm.id ? null : { id: null };
        render();
        if (S.hamForm) { const f = root.querySelector('[data-k="hn"]'); if (f) f.focus(); }
        return;
      case 'ham-breyta': S.hamForm = { id: el.dataset.mode }; render(); return;
      case 'ham-loka': S.hamForm = null; render(); return;
      case 'ham-vista': {
        const nafn = String((root.querySelector('[data-k="hn"]') || {}).value || '').trim().slice(0, 30);
        if (!nafn) { toast('Gefðu hamnum nafn.', true); const f = root.querySelector('[data-k="hn"]'); if (f) f.focus(); return; }
        const F = S.hamForm || {}, hid = F.id || ('h' + Date.now().toString(36));
        if (hamaListi().some(k => k !== hid && lagt(M(k).l) === lagt(nafn))) { toast('Hamur með þessu nafni er þegar til.', true); return; }
        const valin = pre => [...root.querySelectorAll('.hamform input[data-k^="' + pre + '"]')].filter(x => x.checked).map(x => x.dataset.k.slice(pre.length));
        const gildi = { id: hid, l: nafn, first: valin('hm_'), flokkar: valin('hf_'), merki: valin('hg_') };
        el.disabled = true;
        vistaHamir(l => { const i = l.findIndex(x => x.id === hid); if (i >= 0) l[i] = gildi; else l.push(gildi); return l; },
          F.id ? 'Hamurinn uppfærður' : 'Hamurinn „' + nafn + '" stofnaður').then(ok => {
          if (!ok) { el.disabled = false; return; }
          S.hamForm = null;
          c.mode = hid; S.filter = 'allt'; S.synd = PAGE; S.view = 'master';
          render();
          vistaCfg({ mode: hid });
        });
        return;
      }
      case 'ham-eyda': {
        const hid = el.dataset.mode, h = M(hid);
        if (!h || !h.ser || !window.confirm('Eyða hamnum „' + h.l + '"? Málin haldast — þau sem voru aðeins í honum birtast aftur undir Þjónustu.')) return;
        vistaHamir(l => l.filter(x => x.id !== hid), 'Hamnum var eytt').then(ok => {
          if (!ok) return;
          S.hamForm = null;
          if (c.mode === hid) { c.mode = 'thjonusta'; S.filter = 'allt'; vistaCfg({ mode: 'thjonusta' }); }
          render();
        });
        return;
      }
      case 'ham-tengja': tengjaHam(id, el.dataset.mode); return;
      case 'g-uppf': gleyma(el.dataset.g); render(); return;
      case 'skjal-velja': S.skjalVal = true; window.addEventListener('focus', () => setTimeout(() => { S.skjalVal = false; }, 1500), { once: true }); return;
      case 'skjal-eyda': eydaSkjali(+el.dataset.id, +el.dataset.fid); return;
      case 'hr-opna':
        S.hreinsa = !S.hreinsa;
        render();
        if (S.hreinsa) { const p = root.querySelector('.hreinsun'); if (p) p.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
        return;
      case 'hr-sia': S.hrSia = el.dataset.v; render(); return;
      case 'hr-val': S.hrVal = S.hrVal || {}; S.hrVal[id] = !S.hrVal[id]; render(); return;
      case 'hr-allir': {
        const kveikja = el.dataset.v === '1', sia = S.hrSia || 'tvitekid';
        S.hrVal = S.hrVal || {};
        flokkaMaster().filter(x => x.fl === sia).forEach(x => { S.hrVal[x.r.id] = kveikja; });
        render();
        return;
      }
      case 'hr-loka': lokaVoldum(); return;
      case 'tf-tengja': tengjaFyrirtaeki(id, +el.dataset.fid); return;
      case 'tf-leita': {
        const r = S.rows.find(x => x.id === id);
        if (!r) return;
        S.tengjaVid = id;
        const q = whereOf(r) || String(r.title || '').slice(0, 40), f0 = root.querySelector('[data-k="lq"]');
        if (f0) f0.value = q;                                  // áður en teiknað er — drögin taka gildið með sér
        leita('lq', q);
        const f = root.querySelector('[data-k="lq"]');
        if (f) { f.focus(); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        return;
      }
      case 'tf-haetta': S.tengjaVid = null; render(); return;
      case 'vb-sia': S.vbSia = el.dataset.v; render(); return;
      case 'vb-opna': S.vbOpin = S.vbOpin || {}; S.vbOpin[el.dataset.vb] = !S.vbOpin[el.dataset.vb]; render(); return;
      case 'vb-stada': vbStada(+el.dataset.vb, el.dataset.v); return;
      case 'ak-listi': S.akListi = +el.dataset.v || 1; render(); return;
      case 'ak-setja': el.disabled = true; setjaAkstur(+el.dataset.fid, +el.dataset.v); return;
      case 'ak-prenta': prentaAksturslista(+el.dataset.v || 1); return;
      case 'ai-tillaga': aiTillaga(id); return;
      case 'virkni-uppf': uppfaeraVirkni(); return;
      case 'bm-opna': S.bmOpid[id] = !S.bmOpid[id]; render(); return;
      case 'bm-vista': {
        const r = S.rows.find(x => x.id === id), d = S.bmDrog[id] || {};
        if (!r) return;
        const patch = {};
        if (d.title != null && d.title.trim() && d.title.trim() !== (r.title || '')) patch.title = d.title.trim();
        if (d.notes != null && d.notes !== (r.notes || '')) patch.notes = d.notes;
        if (d.due != null && d.due !== (r.due_at ? ymd(new Date(r.due_at)) : '')) patch.due_at = /^\d{4}-\d{2}-\d{2}$/.test(d.due) ? new Date(d.due + 'T12:00:00').toISOString() : null;
        if (d.important != null && !!d.important !== !!r.important) patch.important = !!d.important;
        if (d.status != null && d.status !== (r.status || 'nytt')) patch.status = d.status;
        if (!Object.keys(patch).length) { toast('Engin breyting til að vista.'); return; }
        act(id, async () => {
          const rows = await patchRow(id, patch);
          if (!rows.length) throw new Error('málið fannst ekki');
          if (patch.status && rows[0].status !== patch.status) throw new Error('las til baka stöðuna „' + rows[0].status + '“');
          delete S.bmDrog[id];
          S.bmOpid[id] = false;
          toast(patch.status === 'lokad' ? 'Breytingar vistaðar · málið er lokað' : 'Breytingar vistaðar');
        });
        return;
      }
      case 'bm-eyda': {
        const r = S.rows.find(x => x.id === id);
        if (!r || !window.confirm('Eyða málinu „' + (r.title || '(ónefnt mál)') + '“? Það hverfur af öllum borðum.')) return;
        act(id, async () => {
          const rows = await patchRow(id, { deleted_at: new Date().toISOString() });
          if (!rows.length) throw new Error('málið fannst ekki');
          delete S.bmDrog[id];
          S.bmOpid[id] = false;
          toast('Málinu var eytt', false, () => act(id, async () => { await patchRow(id, { deleted_at: null }); toast('Málið er komið aftur'); }));
        });
        return;
      }
      case 'ny-fyr': veljaNyFyr(Number(el.dataset.i)); return;
      case 'vd-add': {
        // Sama samningur og gamla borðið: 303 hlerar st-skra-verk og opnar dagskrárgluggann forútfylltan.
        const r = S.rows.find(x => x.id === id);
        if (!r) return;
        try { window.dispatchEvent(new CustomEvent('st-skra-verk', { detail: { name: whereOf(r) || r.title || '', note: [r.title, aiLine(r)].filter(Boolean).join(' — '), id: r.id } })); }
        catch (_) { toast('Dagskrárglugginn opnaðist ekki.', true); }
        return;
      }
      case 'go': goView(el.dataset.view, el.dataset.anchor); return;
      case 'reload': load(); return;
    }
  }
  function onChange(e) {
    const el = e.target, v = document.getElementById(VIEW_ID);
    if (!v || !el || !el.dataset) return;
    if (el.dataset.t5Skjal) { const files = [...(el.files || [])]; el.value = ''; S.skjalVal = false; hladaSkjolum(+el.dataset.t5Skjal, files); return; }
    if (el.dataset.t5 === 'assign') { el.blur(); setjaA(Number(el.dataset.id), el.value); return; }
    if (el.dataset.bm) { bmSkra(el); return; }
    if (el.dataset.t5 === 'ak-mal') { el.blur(); setjaAkstur(+el.dataset.fid, +el.value); return; }
    if (el.dataset.t5 !== 'who' || !el.value) return;
    el.blur();
    skolaAllt();                                           // texti í ritun vistast á réttan starfsmann
    S.view = 'master';
    S.synd = PAGE;
    try { if (window.BordStarfsmadur && BordStarfsmadur.set) BordStarfsmadur.set(el.value); } catch (_) {}
    render();
  }
  function onInput(e) {
    const el = e.target, k = el && el.dataset ? el.dataset.k : null;
    if (k === 'lq' || k === 'nc') leita(k, el.value);
    else if (el && el.dataset && el.dataset.sk) skrifaSk(el);
    else if (el && el.dataset && el.dataset.bm) bmSkra(el);
  }
  function onKey(e) {
    const v = document.getElementById(VIEW_ID), root = v && v.shadowRoot;
    if (!root || !v.classList.contains('active')) return;
    const k = e.target && e.target.dataset ? e.target.dataset.k : null;
    // Örvar og Enter í niðurstöðum (leitin í hausnum og fyrirtæki í nýju máli).
    if ((k === 'lq' || k === 'nc') && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      const st = k === 'lq' ? S.leit : S.ny, listi = k === 'lq' ? S.leit.fyr : S.ny.tillogur;
      if (st.opid && listi.length) {
        if (e.key !== 'Enter') { e.preventDefault(); st.idx = (st.idx + (e.key === 'ArrowDown' ? 1 : -1) + listi.length) % listi.length; render(); return; }
        e.preventDefault();
        const i = st.idx >= 0 ? st.idx : 0;
        if (k === 'nc') veljaNyFyr(i);
        else if (st.idx >= 0 || listi.length === 1) { S.leit.opid = false; if (S.tengjaVid) tengjaFyrirtaeki(S.tengjaVid, listi[i].id); else openCompany(listi[i].id); }
        return;
      }
      if (k === 'lq') { if (e.key === 'Enter') e.preventDefault(); return; }
    }
    if (e.key === 'Enter' && (k === 'nt' || k === 'nc')) { e.preventDefault(); const b = root.querySelector('[data-t5="composer-save"]'); if (b && !b.disabled) b.click(); }
    if (e.key === 'Enter' && k === 'hn') { e.preventDefault(); const b = root.querySelector('[data-t5="ham-vista"]'); if (b && !b.disabled) b.click(); }
    if (e.key === 'Enter' && (k === 'ln' || k === 'lu')) { e.preventDefault(); const b = root.querySelector('[data-t5="link-save"]'); if (b && !b.disabled) b.click(); }
    if (e.key === 'Escape' && S.tengjaVid && !S.leit.opid) { S.tengjaVid = null; render(); return; }
    if (e.key === 'Escape' && (S.leit.opid || S.ny.opid)) { S.leit.opid = false; S.ny.opid = false; render(); return; }
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
    S.filter = (M(cfg().mode) || MODES.thjonusta).filter || 'allt';
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
      if (view === NAV_KEY || view === 'verkbord' || view === 'verkefni') { show(); return; }
      const mine = document.getElementById(VIEW_ID);
      if (mine) { mine.style.display = 'none'; mine.classList.remove('active'); }
      clearInterval(_poll);
      return orig.apply(this, arguments);
    };
    window.App._t5SwitchPatched = true;
  }
  function openFromHash() {
    if (['bord', 'verkbord', 'verkefni'].indexOf((location.hash || '').replace(/^#/, '')) < 0) return;
    const v = document.getElementById(VIEW_ID);
    if (v && v.classList.contains('active')) return;
    if (window.App && App.switchView) App.switchView(NAV_KEY); else show();
  }
  // Hliðarstikuhnappurinn „🔧 Þjónustuborð" — áður í 231 (injectNav), sem er farið. data-view er VILJANDI 'verkbord':
  // röðun (sidebar_order) og faldir hnappar (sidebar_hidden) í 68 eru vistuð eftir data-view á öllum vélum, og
  // 261 navTo smellir á .vnav-btn[data-view=lykill].
  let _hnappTilraunir = 0;
  function festaHnapp() {
    const nav = document.querySelector('nav.view-nav, .view-nav'), tpl = nav && nav.querySelector('.vnav-btn');
    if (!nav || !tpl) { if (++_hnappTilraunir < 60) setTimeout(festaHnapp, 500); return; }
    if (nav.querySelector('[data-view="verkbord"]')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', 'verkbord');
    btn.style.cssText += ';position:relative;z-index:5;display:flex;align-items:center';
    btn.innerHTML = '<span style="margin-right:6px">🔧</span>Þjónustuborð';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); });
    nav.insertBefore(btn, nav.firstChild);
    const v = document.getElementById(VIEW_ID);
    if (v && v.classList.contains('active')) btn.classList.add('active');
  }
  let _stSig = '';
  const stillingaSig = () => { const n = nu(); try { return JSON.stringify([n, P(CFG_KEY + '.by_staff.' + n), jobsFor(n), cardsFor(n), folk(), P(CFG_KEY + '.hamir')]); } catch (_) { return String(Date.now()); } };
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
    festaHnapp();
    openFromHash();
    setTimeout(() => { patchSwitchView(); ensureView(); festaHnapp(); openFromHash(); }, 1600);
    window.Thjonustubord5 = { show, load, render, version: '368p' };
    console.log('[368-thjonustubord5] installed (#bord)');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
/* === END ÞJÓNUSTUBORÐ 5 === */
