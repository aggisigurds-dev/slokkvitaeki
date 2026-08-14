/* === BRUNAKERFI SKOÐUNARSKÝRSLA v2 — eyðublað + A4 skýrsla + PDF + verð (2026-07-21) ===
 *
 * Byggt NÁKVÆMLEGA eftir hönnunarpakka Agnars:
 *   Documents/--Design síður--/…/design_handoff_brunakerfi/ (README.md = spec,
 *   „Brunakerfi Úttekt.dc.html" = frumgerð, reference/original-skodunarskyrsla.pdf).
 *
 * Opnast innan úr Brunakerfi yfirlit (patch 272): „📋 Skýrsla"-hnappur á röð.
 * Vinnusvæði ↔ Skýrsla (A4). Reiknireglur úr README (verða að stemma):
 *   samtals = iLagi + ekki (vantar EKKI með) · mældAh = rýmd × % / 100
 *   áætluðEnding = mældAh / (i1/1000) · lágmarksRýmd = 1.25×(i1/1000)×ending + 0.5×(i2/1000)
 *
 * V2 viðbætur (ósk Agnars 2026-07-21):
 *   • „✅ Ljúka & vista PDF" teiknar skýrsluna sem ALVÖRU PDF (jsPDF vektor,
 *     sama leið og patch 233 — EKKI html2canvas) → samningar-bucket +
 *     customer_documents (doc_type=brunakerfi) → græni árpunkturinn og skjölin
 *     á fyrirtækjaspjaldinu.
 *   • VERÐ-spjald: línur úr verðlista (magn × einingaverð → samtals + VSK 24%),
 *     verðlistinn er breytanlegur (🏷 ritill) og geymist í app_settings
 *     (`brunakerfi_verdlisti`) — grunnlisti úr verdlisti.pdf / patch 150.
 *     Verðin fara EKKI á prentuðu skýrsluna.
 *   • Sjálfvirk vistun (2,5s debounce) í brunakerfi_skyrslur + localStorage
 *     spegill sem öryggisnet í netlausum kjöllurum.
 *
 * Gögn: tafla `brunakerfi_skyrslur` (data jsonb = handoff-líkanið; eldri v1-drög
 * eru færð sjálfkrafa yfir). Public: window.BrunakerfiSkyrsla = { openFlow, openForm }
 */
(() => {
  if (window.__bkSkyrslaInstalled) return;
  window.__bkSkyrslaInstalled = true;

  const BUCKET = 'samningar', FOLDER = 'brunakerfi-skyrslur';
  const LOGO_PATH = '/img/brunaholf-logo.png';
  const FOOT_1 = 'Afrit af skoðunarskýrslunni verður sent eldvarnareftirliti slökkviliðs ef kallað er eftir því.';
  const FOOT_2 = 'Skoðað er samkvæmt nýjustu leiðbeiningum um sjálfvirka brunaviðvörun útg. af HMS 6.038.';
  const FOOT_CO = 'Brunahólf slökkvitæki ehf. · Helluhrauni 10, 220 Hafnarfjörður · kt. 600508-0400 · Sími 565 4080';
  const HMS_HINT = 'Viðmið HMS: lágmark 65 dB í almennum rýmum, 75 dB í svefnherbergjum.';

  const BUN_LABELS = ['Stjórnstöð', 'Boðbúnaður', 'Reykskynjarar', 'Hitaskynjarar', 'Handboðar', 'Bjöllur / Sírenur', 'Rafhlöður'];
  const HLJOD_LABELS = ['Mesti hljóðst. 1M frá hljóðgjöfum', 'Mesti umhverfishávaði', 'Hljóðst. bjöllu með umhverfishávaða', 'Minnsti hljóðst. bjöllu í húsi', 'Hljóðst. í svefnherbergi'];
  const CHECK_LABELS = ['Spenna: 24V', 'Spenna: 230V', 'Staða rása í stöð', 'Staða bjöllurása/slaufu', 'Brunaboð frá öllum rásum', 'Lampaprófun', 'Innri væla í stöð'];
  // röðun í skýrslu + lista (README); fellivalið sýnir algengasta fyrst (frumgerð)
  const FL_ORDER = ['Stjórnstöð', 'Boðbúnaður', 'Reykskynjarar', 'Hitaskynjarar', 'Handboðar', 'Bjöllur / Sírenur', 'Rafhlöður', 'Annað', 'Hljóðstyrksmælingar', 'Yfirlitsmynd'];
  const FL_SELECT = ['Reykskynjarar', 'Hitaskynjarar', 'Handboðar', 'Bjöllur / Sírenur', 'Stjórnstöð', 'Boðbúnaður', 'Rafhlöður', 'Hljóðstyrksmælingar', 'Yfirlitsmynd', 'Annað'];
  const TEG_LIST = ['Vantar', 'Er ekki til staðar', 'Laus frá lofti', 'Of nálægt loftræstingu', 'Virkar ekki', 'Díóða virkar ekki', 'Skemmdur / óhreinn', 'Rangt staðsettur', 'Hulinn', 'Vantar á yfirlitsmynd', 'Hljóðstyrksmæling', 'Annað'];

  const VAT_PCT = 24;
  // Grunnverðlisti (verdlisti.pdf 2026-07-21 = sami og patch 150) — notaður þegar
  // enginn breyttur listi er til í app_settings.brunakerfi_verdlisti.
  const BASE_PRICES = [
    ['Samantekt og gerð skoðunarskýrslu', 16670], ['Skoðun á aðalafli og varaafli', 1210],
    ['Skoðun á aðalstöð brunaviðvörunarkerfis', 10080], ['Skoðun á bjöllum / sírenum', 1210],
    ['Skoðun á boðbúnaði / úthringibúnaði', 4040], ['Skoðun á gaumljósi', 1210],
    ['Skoðun á geislaskynjara', 15190], ['Skoðun á handboðum', 1210],
    ['Skoðun á hitaskynjunarstreng', 9810], ['Skoðun á inngangsstýringu fyrir úðakerfi', 2020],
    ['Skoðun á logaskynjurum', 1750], ['Skoðun á NH3 (ammóníak) skynjara', 15190],
    ['Skoðun á prentarabúnaði', 950], ['Skoðun á rakaþéttum handboðum', 1480],
    ['Skoðun á reyk- hitaskynjurum að 6m hæð', 1210], ['Skoðun á reyk- hitaskynjurum 6-9m hæð', 2020],
    ['Skoðun á reyk- hitaskynjurum yfir 9m hæð', 4040], ['Skoðun á reyklosunarstöð', 10080],
    ['Skoðun á reyksogsop í reyksogskerfi', 4040], ['Skoðun á reyksogsstöð', 10080],
    ['Skoðun á segullæsingu', 1210], ['Skoðun á skynjara ofan lofts', 4040],
    ['Skoðun á stjórnstöð slökkvikerfis', 10080], ['Skoðun á stokkaskynjara', 8740],
    ['Skoðun á stýrieiningum fyrir inn- og útgangsmerki', 2020],
    ['Skoðun á útgangsstýringu fyrir glugga', 2020], ['Skoðun á útgangsstýringu fyrir hurðaaflæsingar', 2020],
    ['Skoðun á útgangsstýringu fyrir loftræsingu', 2020], ['Skoðun á útgangsstýringu fyrir reyklúgur', 2020],
    ['Skoðun á útgangsstýringu fyrir reyksog', 2020], ['Skoðun á útstöð brunaviðvörunakerfis', 2420],
    ['Skoðun á viðvörunarsökkli með sírenu', 680], ['Skoðun á yfirlitsmynd og þjónustubók', 1750]
  ];

  // „Tengist skýrslu" — lyklarnir sem verðlista-lína getur fylgt (ósk Agnars
  // 2026-07-21, örvarnar á skjámyndinni): magnið kemur þá sjálfkrafa úr
  // búnaðaryfirliti skýrslunnar (samtals = í lagi + ekki í lagi).
  const LINK_OPTS = [
    ['', '— ekki tengt —'], ['fast', 'Föst lína (alltaf 1×)'],
    ['stjornstod', 'Stjórnstöð'], ['bodbunadur', 'Boðbúnaður'],
    ['reykskynjarar', 'Reykskynjarar'], ['hitaskynjarar', 'Hitaskynjarar'],
    ['reykhita', 'Reyk+hitaskynjarar (samtals)'], ['handbodar', 'Handboðar'],
    ['bjollur', 'Bjöllur / Sírenur'], ['rafhlodur', 'Rafhlöður']];
  const LINK_IX = { stjornstod: 0, bodbunadur: 1, reykskynjarar: 2, hitaskynjarar: 3, handbodar: 4, bjollur: 5, rafhlodur: 6 };
  const DEFAULT_LINKS = {
    'Samantekt og gerð skoðunarskýrslu': 'fast',
    'Skoðun á aðalafli og varaafli': 'fast',
    'Skoðun á aðalstöð brunaviðvörunarkerfis': 'stjornstod',
    'Skoðun á bjöllum / sírenum': 'bjollur',
    'Skoðun á boðbúnaði / úthringibúnaði': 'bodbunadur',
    'Skoðun á handboðum': 'handbodar',
    'Skoðun á reyk- hitaskynjurum að 6m hæð': 'reykhita'
  };

  let S = null, _dirty = false, _autoT = null, _pricelist = null;
  let _reports = null, _repAt = 0, _logoData = null;

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function num(v) { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
  function fmt(n, d) { return (n === null || !isFinite(n)) ? '—' : (Math.round(n * 100) / 100).toFixed(d); }
  function fmtKr(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr'; }
  function fmtKt(kt) { const d = String(kt || '').replace(/\D/g, ''); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : (kt || ''); }
  function fmtDags(iso) { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; }
  function toast(msg, bad) {
    let t = document.getElementById('_bks-toast');
    if (!t) { t = document.createElement('div'); t.id = '_bks-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:12000;padding:11px 20px;border-radius:99px;font-weight:800;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.35);transition:opacity .3s;opacity:1;background:' + (bad ? '#b91c1c' : '#14532d') + ';color:#fff';
    clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = '0'; }, 2600);
  }

  // ── líkan (handoff README) ──────────────────────────────────────────────────
  function blank(co, nr) {
    return {
      meta: { nr: nr || '', dags: new Date().toISOString().slice(0, 10), stadur: 'Hafnarfjörður',
        madur: (function () { try { return localStorage.getItem('bs_employee') || 'Elías'; } catch (_) { return 'Elías'; } })() },
      customer: { nafn: co.nafn || '', kt: fmtKt(co.kennitala), heimili: co.heimilisfang || '',
        umbedid: '', tengi: co['tengiliður'] || co.tengilidur || '' },
      bunadur: BUN_LABELS.map(label => ({ label, iLagi: 0, ekki: 0, vantar: 0 })).concat(defaultBunadurRows()),
      hljod: HLJOD_LABELS.map(label => ({ label, db: '', st: '' })),
      stod: { gerd: 'Rása', fjoldi: '', fjargaesla: '', tegund: '', teiknud: '',
        checks: CHECK_LABELS.map(label => ({ label, st: '' })) },
      raf: { staerd: '', rymd: '', pct: '100', argerd: '', spenna: '', i1: '', i2: '', ending: '12' },
      aths: [],
      cNew: { fl: 'Reykskynjarar', numer: '', svaedi: '', teg: 'Vantar', lysing: '' },
      abend: '',
      verd: { linur: [] }
    };
  }

  // v1-drög (fyrsta útgáfa 273, 2026-07-21 fyrr um daginn) → v2-líkan
  function migrate(d, co) {
    if (!d || !d.info) return d;
    const b = blank(co || { nafn: '' }, (d.info && d.info.uttekt_nr) || '');
    const i = d.info || {};
    b.meta = { nr: i.uttekt_nr || '', dags: i.dags || b.meta.dags, stadur: i.stadur || 'Hafnarfjörður', madur: i.skodunarmadur || b.meta.madur };
    b.customer = { nafn: i.vidskiptavinur || '', kt: i.kennitala || '', heimili: i.adsetur || '', umbedid: i.umbedid_af || '', tengi: i.tengilidur || '' };
    const KEYS = ['stjornstod', 'bodbunadur', 'reykskynjarar', 'hitaskynjarar', 'handbodar', 'bjollur', 'rafhlodur'];
    KEYS.forEach((k, ix) => { const o = (d.bunadur || {})[k] || {}; b.bunadur[ix] = { label: BUN_LABELS[ix], iLagi: o.ok || 0, ekki: o.bad || 0, vantar: o.missing || 0 }; });
    (d.hljod || []).forEach((h, ix) => { if (b.hljod[ix]) { b.hljod[ix].db = h.db || ''; b.hljod[ix].st = h.status === true ? 'ok' : h.status === false ? 'fail' : ''; } });
    const a = d.adalstod || {};
    b.stod.gerd = a.kerfisgerd === 'slaufa' ? 'Slaufu' : 'Rása';
    b.stod.fjoldi = a.fjoldi || ''; b.stod.fjargaesla = a.fjargaesla || ''; b.stod.tegund = a.tegund || ''; b.stod.teiknud = a.teiknud_af || '';
    const CK = ['spenna24', 'spenna230', 'stada_rasa', 'stada_bjollu', 'brunabod', 'lampaprofun', 'innri_vaela'];
    CK.forEach((k, ix) => { const v = (a.checks || {})[k]; if (b.stod.checks[ix]) b.stod.checks[ix].st = v === true ? 'ok' : v === false ? 'fail' : ''; });
    const r = d.rafhl || {};
    b.raf = { staerd: r.staerd || '', rymd: String(num(r.astimplud) || ''), pct: '100', argerd: r.argerd || '',
      spenna: String(num(r.spenna_eftir) || ''), i1: r.i1 || '', i2: r.i2 || '', ending: String(num(r.lagm_ending) || '12') };
    b.aths = (d.aths || []).map(x => ({ fl: x.bunadur || 'Annað', numer: x.numer || '', svaedi: x.svaedi || '', teg: x.athugasemd || 'Annað', lysing: x.lysing || '' }));
    b.abend = (d.abendingar || []).join('\n');
    return b;
  }

  // Allar afleiddar stærðir á EINUM stað — vinnusvæði, HTML-skýrsla og PDF nota
  // sama líkanið svo tölurnar geti aldrei orðið ósamhljóða.
  function model() {
    const s = S.data;
    // bunRows helst INDEX-samhliða s.bunadur (LINK_IX + data-sam/data-sv reiða sig
    // á það); faldir liðir (r.hidden) eru áfram með en teljast ekki í heildir.
    const bunRows = s.bunadur.map(r => ({ ...r, samtals: (+r.iLagi || 0) + (+r.ekki || 0) }));
    const taeki = bunRows.reduce((a, r) => a + (r.hidden ? 0 : r.samtals), 0);
    const issues = bunRows.reduce((a, r) => a + (r.hidden ? 0 : (+r.ekki || 0) + (+r.vantar || 0)), 0);
    const rymd = num(s.raf.rymd), pct = num(s.raf.pct), i1 = num(s.raf.i1), i2 = num(s.raf.i2), ending = num(s.raf.ending);
    const maeld = rymd !== null && pct !== null ? rymd * pct / 100 : null;
    const aaetlud = maeld !== null && i1 ? maeld / (i1 / 1000) : null;
    const lagRymd = i1 !== null && i2 !== null && ending !== null ? 1.25 * (i1 / 1000) * ending + 0.5 * (i2 / 1000) : null;
    const rafOk = maeld !== null && lagRymd !== null ? maeld >= lagRymd : null;
    const argerd = num(s.raf.argerd);
    const aldur = argerd ? new Date().getFullYear() - argerd : null;
    const athGroups = FL_ORDER.filter(fl => s.aths.some(a => a.fl === fl))
      .map(fl => ({ fl, isHljod: fl === 'Hljóðstyrksmælingar', rows: s.aths.filter(a => a.fl === fl) }));
    const abendList = (s.abend || '').split('\n').map(t => t.trim()).filter(Boolean);
    const linur = (s.verd.linur || []).map(l => ({ ...l, samtals: (num(l.qty) || 0) * (num(l.price) || 0) }));
    const verdSum = linur.reduce((a, l) => a + l.samtals, 0);
    // Afsláttur = kr DREGIÐ AF heildinni m. vsk (sama venja og POS: afsláttur er
    // brúttó-króna, verdTotal er upphæðin sem er raunverulega rukkuð).
    const verdGross = verdSum * (1 + VAT_PCT / 100);
    let verdAfsl = num(s.verd.afslattur) || 0;
    if (verdAfsl < 0) verdAfsl = 0;
    if (verdAfsl > verdGross) verdAfsl = verdGross;
    return {
      bunRows, taeki, issues,
      statusLine: taeki + ' tæki · ' + issues + ' frávik · ' + s.aths.length + ' athugasemdir',
      rafShow: {
        rymd: rymd !== null ? fmt(rymd, 0) + ' Ah' : '—',
        maeld: maeld !== null ? fmt(pct, 0) + ' % — ' + fmt(maeld, 1) + ' Ah' : '—',
        argerd: argerd ? (aldur + ' ára — ' + fmt(argerd, 0)) : '—',
        spenna: s.raf.spenna ? s.raf.spenna + ' Volt' : '—',
        i1: s.raf.i1 ? s.raf.i1 + ' mA' : '—', i2: s.raf.i2 ? s.raf.i2 + ' mA' : '—',
        ending: s.raf.ending ? s.raf.ending + ' klst' : '—',
        aaetlud: aaetlud !== null ? fmt(aaetlud, 2) + ' klst' : '—',
        lag: lagRymd !== null ? fmt(lagRymd, 2) + ' Ah' : '—',
        maeldN: maeld !== null ? fmt(maeld, 1) : '—', aaetludN: fmt(aaetlud, 2), lagN: fmt(lagRymd, 2)
      },
      rafOk,
      rafOkText: rafOk === null ? 'Vantar mælingar' : rafOk ? '✓ Rafhlöður uppfylla lágmarks rýmd' : '✗ Rafhlöður undir lágmarks rýmd',
      athGroups, abendList,
      hasNextPage: s.aths.length > 0 || abendList.length > 0,
      custLine: s.customer.nafn + (s.customer.kt ? ' — kt. ' + s.customer.kt : ''),
      gerdUpper: (s.stod.gerd || 'Rása').toUpperCase(),
      dagsFmt: fmtDags(s.meta.dags),
      linur, verdSum, verdVsk: verdSum * VAT_PCT / 100,
      verdGross, verdAfsl, verdTotal: verdGross - verdAfsl
    };
  }
  function tegBad(teg) { return /vantar|ekki|virkar/i.test(teg); }

  // ── sérsniðinn búnaður (ósk Agnars: „add fields to the report and give it a
  // key so we can connect new price to it") — lyklarnir geymast miðlægt í
  // brunakerfi_verdlisti.custom_bunadur svo verðlistinn geti tengst þeim ──────
  function slugKey(label) {
    return 'c_' + String(label || '').toLowerCase().trim()
      .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i').replace(/[óò]/g, 'o')
      .replace(/[úù]/g, 'u').replace(/ý/g, 'y').replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/ö/g, 'o')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }
  function customBunadurList() {
    let saved = null;
    try { saved = window.AppSettings && AppSettings.path && AppSettings.path('brunakerfi_verdlisti'); } catch (_) {}
    if (!saved) { try { saved = JSON.parse(localStorage.getItem('brunakerfi_verdlisti') || 'null'); } catch (_) {} }
    // AFRIT (ekki lifandi tilvísun í _settings) svo hægt sé að breyta+vista óhætt
    return (saved && Array.isArray(saved.custom_bunadur)) ? saved.custom_bunadur.map(c => ({ ...c })) : [];
  }
  async function saveCustomBunadur(next) {
    try { const raw = JSON.parse(localStorage.getItem('brunakerfi_verdlisti') || '{}'); raw.custom_bunadur = next; localStorage.setItem('brunakerfi_verdlisti', JSON.stringify(raw)); } catch (_) {}
    // deepMerge í patch 85 skiptir ÖLLUM fylkjum út (ekki index-merge) → eyðing virkar
    try { if (window.AppSettings && AppSettings.save) await AppSettings.save({ brunakerfi_verdlisti: { custom_bunadur: next } }); } catch (_) {}
  }
  // Skráir sérsniðinn búnaðarlið (fær eigin lykil svo verðlista-lína geti tengst
  // honum). dflt=true → hann birtist SJÁLFGEFIÐ í búnaðaryfirliti nýrra skýrslna.
  async function addCustomBunadur(label, dflt) {
    const key = slugKey(label);
    const list = customBunadurList();
    const ex = list.find(c => c.key === key);
    if (ex) {
      if (dflt && !ex.dflt) { ex.dflt = true; await saveCustomBunadur(list); }
    } else {
      await saveCustomBunadur(list.concat([{ key, label, dflt: !!dflt }]));
    }
    return key;
  }
  // búnaðarraðir sem eiga að birtast sjálfgefið í hverri nýrri skýrslu (dflt)
  function defaultBunadurRows() {
    return customBunadurList().filter(c => c && c.dflt)
      .map(c => ({ label: c.label, iLagi: 0, ekki: 0, vantar: 0, custom: true, key: c.key }));
  }
  function linkOpts() {
    return LINK_OPTS.concat(customBunadurList().map(c => [c.key, c.label]));
  }

  // ── verðlisti (app_settings.brunakerfi_verdlisti, grunnur = BASE_PRICES) ────
  function priceItems() {
    if (_pricelist) return _pricelist;
    let saved = null;
    try { saved = window.AppSettings && AppSettings.path && AppSettings.path('brunakerfi_verdlisti'); } catch (_) {}
    if (!saved) { try { saved = JSON.parse(localStorage.getItem('brunakerfi_verdlisti') || 'null'); } catch (_) {} }
    _pricelist = (saved && Array.isArray(saved.items) && saved.items.length)
      ? saved.items.map(x => ({ name: x.name || '', price: +x.price || 0,
          // eldri vistaðir listar án tenginga fá sjálfgefnu tengingarnar; tóm
          // tenging sem notandinn valdi sjálfur ('') er virt
          link: x.link != null ? x.link : (DEFAULT_LINKS[x.name] || '') }))
      : BASE_PRICES.map(p => ({ name: p[0], price: p[1], link: DEFAULT_LINKS[p[0]] || '' }));
    return _pricelist;
  }
  async function savePriceItems(items) {
    _pricelist = items;
    const payload = { items, custom_bunadur: customBunadurList(), updated_at: new Date().toISOString() };
    try { localStorage.setItem('brunakerfi_verdlisti', JSON.stringify(payload)); } catch (_) {}
    try { if (window.AppSettings && AppSettings.save) await AppSettings.save({ brunakerfi_verdlisti: payload }); } catch (e) { console.warn('[bks] verðlisti save', e); }
  }

  // ── yfirbygging ─────────────────────────────────────────────────────────────
  function ensureOverlay() {
    let ov = document.getElementById('_bks-overlay'); if (ov) return ov;
    ov = document.createElement('div'); ov.id = '_bks-overlay';
    ov.innerHTML = '<style>' +
      '#_bks-overlay{position:fixed;inset:0;z-index:9500;background:#e8eaee;overflow-y:auto;display:none;font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;-webkit-overflow-scrolling:touch;color:#16181c}' +
      '#_bks-overlay *{box-sizing:border-box}' +
      '#_bks-overlay ._bks-top{position:sticky;top:0;z-index:30;background:linear-gradient(180deg,#101216,#191c22);border-bottom:1px solid #2a2e36;color:#fff;display:flex;align-items:center;gap:12px;padding:10px 18px;flex-wrap:wrap}' +
      '#_bks-overlay ._bks-logo{background:#fff;border-radius:8px;padding:3px 10px;display:flex;align-items:center}' +
      '#_bks-overlay ._bks-logo img{height:30px;display:block}' +
      '#_bks-overlay ._bks-ttl{font-size:14.5px;font-weight:700;line-height:1.2}' +
      '#_bks-overlay ._bks-sub{font-size:11px;color:#8b93a1}' +
      '#_bks-overlay ._bks-tbtns{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
      '#_bks-overlay ._bks-hb{padding:7px 12px;border-radius:8px;border:1px solid #33383f;background:#17191d;color:#c9cfda;font:inherit;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;min-height:36px}' +
      '#_bks-overlay ._bks-hb:hover{background:#22262c}' +
      '#_bks-overlay ._bks-hb._on{background:#2a78d6;border-color:#2a78d6;color:#fff;font-weight:700}' +
      '#_bks-overlay ._bks-hb._grn{background:#1f8a4c;border-color:#1f8a4c;color:#fff;font-weight:700}' +
      '#_bks-overlay ._bks-hb._grn:hover{background:#187a41}' +
      '#_bks-overlay input,#_bks-overlay select,#_bks-overlay textarea{font:inherit}' +
      '#_bks-overlay input:focus,#_bks-overlay select:focus,#_bks-overlay textarea:focus{outline:2px solid #2a78d6}' +
      '#_bks-overlay ._bks-wrap{max-width:1340px;margin:0 auto;padding:16px 16px 70px}' +
      // kúnnaspjald (dökkblátt)
      '#_bks-overlay ._bks-cust{background:linear-gradient(135deg,#152740,#1e3a5f);border-radius:14px;padding:16px 18px;margin-bottom:14px;box-shadow:0 2px 8px rgba(10,20,40,.25);display:grid;grid-template-columns:repeat(6,1fr);gap:12px}' +
      '#_bks-overlay ._bks-f label{display:block;font-size:10.5px;font-weight:700;letter-spacing:.05em;color:#9fb4d0;text-transform:uppercase;margin-bottom:4px}' +
      '#_bks-overlay ._bks-f input{width:100%;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.25);border-radius:8px;color:#fff;padding:8px 11px;font-size:13.5px;min-height:38px}' +
      '#_bks-overlay ._bks-f input[type=date]{color-scheme:dark}' +
      '#_bks-overlay ._bks-f._big input{font-size:15px;font-weight:700}' +
      // spjöld
      '#_bks-overlay ._bks-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(480px,1fr));gap:14px;align-items:start}' +
      '#_bks-overlay ._bks-card{background:#fff;border:1px solid #d7dade;border-radius:12px;box-shadow:0 1px 2px rgba(16,20,28,.06);overflow:hidden;margin-bottom:0}' +
      '#_bks-overlay ._bks-ch{background:#141619;color:#fff;font-size:12.5px;font-weight:800;letter-spacing:.04em;padding:9px 14px;display:flex;align-items:center;justify-content:space-between;text-transform:uppercase}' +
      '#_bks-overlay ._bks-ch small{color:#8b93a1;font-weight:700;text-transform:none;letter-spacing:0}' +
      '#_bks-overlay ._bks-body{padding:12px 14px}' +
      '#_bks-overlay ._bks-lbl{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#7a8290;margin-bottom:3px}' +
      '#_bks-overlay ._bks-in{border:1px solid #d0d4da;border-radius:8px;background:#fff;color:#16181c;padding:7px 10px;font-size:13.5px;min-height:37px;width:100%}' +
      // búnaðaryfirlit
      '#_bks-overlay ._bks-eqhead,#_bks-overlay ._bks-eqrow{display:grid;grid-template-columns:1fr 92px 92px 92px 70px;gap:6px;align-items:center}' +
      '#_bks-overlay ._bks-eqhead{font-size:10px;font-weight:800;color:#7a8290;text-transform:uppercase;letter-spacing:.04em;padding:2px 0 6px;border-bottom:1px solid #eef0f3}' +
      '#_bks-overlay ._bks-eqrow{padding:6px 0;border-bottom:1px solid #eef0f3}' +
      '#_bks-overlay ._bks-eqrow>span:first-child{font-size:13px;font-weight:700}' +
      '#_bks-overlay ._bks-step{display:inline-flex;align-items:center;gap:5px;justify-content:center}' +
      '#_bks-overlay ._bks-step button{width:24px;height:26px;border-radius:6px;border:1px solid #d0d4da;background:#f6f7f9;color:#334155;font-size:14px;font-weight:800;cursor:pointer;line-height:1;padding:0}' +
      '#_bks-overlay ._bks-step b{min-width:22px;text-align:center;font-size:13px;font-weight:700}' +
      '#_bks-overlay ._bks-sam{display:inline-block;min-width:34px;padding:3px 8px;border-radius:7px;background:#141619;color:#fff;font-weight:800;font-size:12.5px;text-align:center}' +
      // athugasemdir
      '#_bks-overlay ._bks-athform{background:#f8f9fb;border:1px solid #eef0f3;border-radius:10px;padding:10px}' +
      '#_bks-overlay ._bks-athrow1{display:grid;grid-template-columns:minmax(140px,1fr) 70px 64px minmax(150px,1fr);gap:8px;margin-bottom:8px}' +
      '#_bks-overlay ._bks-athrow1._hljod{grid-template-columns:minmax(140px,1fr) 138px minmax(150px,1fr)}' +
      '#_bks-overlay ._bks-athrow2{display:flex;gap:8px}' +
      '#_bks-overlay ._bks-add{padding:8px 14px;border-radius:8px;border:0;background:#2a78d6;color:#fff;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;min-height:37px}' +
      '#_bks-overlay ._bks-add:hover{background:#1f63b8}' +
      '#_bks-overlay ._bks-ath{display:flex;align-items:flex-start;gap:8px;padding:7px 9px;border:1px solid #eef0f3;border-radius:9px;margin-top:8px;background:#fff}' +
      '#_bks-overlay ._bks-flchip{padding:3px 8px;border-radius:5px;font-size:10px;font-weight:800;white-space:nowrap;background:#141619;color:#fff;margin-top:1px}' +
      '#_bks-overlay ._bks-del{margin-left:auto;width:24px;height:24px;border-radius:6px;border:1px solid #efb9ab;background:#fff;color:#c93c1d;font-weight:800;cursor:pointer;flex:none;font-size:12px;padding:0}' +
      // aðalstöð + hljóð
      '#_bks-overlay ._bks-chk{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid #eef0f3}' +
      '#_bks-overlay ._bks-chk>span:first-child{font-size:13px;font-weight:600}' +
      '#_bks-overlay ._bks-okbtn,#_bks-overlay ._bks-badbtn{padding:5px 11px;border-radius:7px;font-size:11.5px;font-weight:700;cursor:pointer;border:1px solid #d0d4da;background:#fff;color:#59606c;white-space:nowrap;min-height:32px}' +
      '#_bks-overlay ._bks-okbtn._on{background:#1f8a4c;border-color:#1f8a4c;color:#fff}' +
      '#_bks-overlay ._bks-badbtn._on{background:#c93c1d;border-color:#c93c1d;color:#fff}' +
      '#_bks-overlay ._bks-seg button{background:#fff;color:#59606c;border:1px solid #d0d4da;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer}' +
      '#_bks-overlay ._bks-seg button:first-child{border-radius:7px 0 0 7px}' +
      '#_bks-overlay ._bks-seg button:last-child{border-radius:0 7px 7px 0}' +
      '#_bks-overlay ._bks-seg button._on{background:#16283f;border-color:#16283f;color:#fff}' +
      '#_bks-overlay ._bks-hint{font-size:11px;color:#8b93a1;margin-top:8px}' +
      // rafhlöður
      '#_bks-overlay ._bks-rafgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}' +
      '#_bks-overlay ._bks-rafstrip{background:#f2f4f7;border-radius:10px;padding:10px 12px;margin-top:12px;display:flex;gap:14px;flex-wrap:wrap;align-items:center;font-size:12px}' +
      '#_bks-overlay ._bks-rafstrip b{font-size:13px}' +
      '#_bks-overlay ._bks-rafchip{font-size:12px;font-weight:800;border-radius:8px;padding:5px 12px;border:1px solid #d0d4da;background:#e4e7ec;color:#59606c}' +
      '#_bks-overlay ._bks-rafchip._ok{background:#dcf1e4;color:#166b3a;border-color:#a9dcbd}' +
      '#_bks-overlay ._bks-rafchip._bad{background:#fbe3dd;color:#b3341a;border-color:#efb9ab}' +
      // verð
      '#_bks-overlay ._bks-vrow{display:grid;grid-template-columns:1fr 74px 110px 110px 30px;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid #eef0f3}' +
      '#_bks-overlay ._bks-vhead{display:grid;grid-template-columns:1fr 74px 110px 110px 30px;gap:8px;font-size:10px;font-weight:800;color:#7a8290;text-transform:uppercase;letter-spacing:.04em;padding-bottom:5px;border-bottom:1px solid #eef0f3}' +
      '#_bks-overlay ._bks-vtot{margin-top:10px;margin-left:auto;max-width:320px;font-size:13px}' +
      '#_bks-overlay ._bks-vtot>div{display:flex;justify-content:space-between;padding:3px 0}' +
      '#_bks-overlay ._bks-vtot ._big{font-size:15.5px;font-weight:800;border-top:2px solid #141619;padding-top:6px;margin-top:3px}' +
      '#_bks-overlay textarea._bks-in{min-height:86px;resize:vertical;line-height:1.5}' +
      '#_bks-overlay ._bks-note{background:#eef2f7;border-bottom:1px solid #d7dade;color:#59606c;font-size:12.5px;padding:9px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}' +
      '#_bks-overlay ._bks-backbtn{padding:7px 13px;border-radius:8px;border:1px solid #141619;background:#141619;color:#fff;font-size:12.5px;font-weight:700;cursor:pointer}' +
      '#_bks-overlay ._bks-sheetwrap{padding:18px 8px 60px;display:none}' +
      '#_bks-overlay ._bks-sheet{background:#fff;max-width:815px;margin:0 auto;box-shadow:0 10px 34px -12px rgba(15,23,42,.45);padding:34px 38px;color:#16181c}' +
      '@media (max-width:1000px){#_bks-overlay ._bks-cust{grid-template-columns:1fr 1fr}#_bks-overlay ._bks-grid{grid-template-columns:1fr}#_bks-overlay ._bks-athrow1,#_bks-overlay ._bks-athrow1._hljod{grid-template-columns:1fr 1fr}#_bks-overlay ._bks-sheet{padding:20px 12px}#_bks-overlay ._bks-vrow,#_bks-overlay ._bks-vhead{grid-template-columns:1fr 60px 92px 92px 26px}}' +
      '@media print{body>*{display:none!important}body>#_bks-overlay{display:block!important;position:static;background:#fff;overflow:visible}' +
      '#_bks-overlay ._bks-top,#_bks-overlay ._bks-wrap,#_bks-overlay ._bks-note{display:none!important}' +
      '#_bks-overlay ._bks-sheetwrap{display:block!important;padding:0}' +
      // @page margin:0 (ekkert Chrome-URL/dags-haus) → blaðið sjálft ber 13mm
      // hliðar-spássíur; efri/neðri koma frá thead/tfoot í R_CSS (endurtaka sig)
      '#_bks-overlay ._bks-sheet{box-shadow:none;max-width:none;padding:0 13mm;margin:0}}' +
      '</style>' +
      '<style>' + R_CSS + '</style>' +
      '<div class="_bks-top"></div>' +
      '<div class="_bks-note" style="display:none"><button type="button" class="_bks-backbtn">← Til baka í vinnusvæði</button><span>Skýrslan skiptist sjálfkrafa á A4 síður við prentun — haus og fótur endurtaka sig á hverri síðu.</span></div>' +
      '<div class="_bks-wrap"></div>' +
      '<div class="_bks-sheetwrap"><div class="_bks-sheet"></div></div>';
    document.body.appendChild(ov);
    ov.querySelector('._bks-backbtn').addEventListener('click', () => setMode('work'));
    ov.querySelector('._bks-top').addEventListener('click', async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const act = b.dataset.act;
      if (act === 'close') return closeOverlay();
      if (act === 'work') return setMode('work');
      if (act === 'report') return setMode('report');
      if (act === 'print') { setMode('report'); setTimeout(() => window.print(), 500); return; }
      if (act === 'save') { try { await saveDraft(); toast('Drög vistuð ✓'); } catch (err) { toast('Villa við vistun: ' + (err.message || err), true); } return; }
      if (act === 'final') { await finalize(b); return; }
    });
    window.addEventListener('beforeunload', e => { if (_dirty && S) { e.preventDefault(); e.returnValue = ''; } });
    return ov;
  }

  function setMode(m) {
    const ov = ensureOverlay();
    const work = m !== 'report';
    ov.querySelector('._bks-wrap').style.display = work ? 'block' : 'none';
    ov.querySelector('._bks-note').style.display = work ? 'none' : 'flex';
    ov.querySelector('._bks-sheetwrap').style.display = work ? 'none' : 'block';
    const bW = ov.querySelector('[data-act="work"]'), bR = ov.querySelector('[data-act="report"]');
    if (bW) bW.classList.toggle('_on', work);
    if (bR) bR.classList.toggle('_on', !work);
    if (!work) ov.querySelector('._bks-sheet').innerHTML = reportInner();
    ov.scrollTop = 0;
  }

  function renderTop() {
    const ov = ensureOverlay();
    ov.querySelector('._bks-top').innerHTML =
      '<div class="_bks-logo"><img src="' + LOGO_PATH + '" alt="Brunahólf" onerror="this.parentNode.style.display=\'none\'"></div>' +
      '<div><div class="_bks-ttl">Brunakerfi — Skoðunarskýrsla</div>' +
      '<div class="_bks-sub"><span id="_bks-stats"></span> <span id="_bks-savenote" style="color:#5f6b7d"></span></div></div>' +
      '<div class="_bks-tbtns">' +
        '<button type="button" class="_bks-hb" data-act="close">← Til baka</button>' +
        '<button type="button" class="_bks-hb _on" data-act="work">Vinnusvæði</button>' +
        '<button type="button" class="_bks-hb" data-act="report">Skýrsla</button>' +
        '<button type="button" class="_bks-hb" data-act="save">💾 Vista drög</button>' +
        '<button type="button" class="_bks-hb _grn" data-act="print">🖨 Prenta / Vista PDF</button>' +
        '<button type="button" class="_bks-hb _grn" data-act="final">✅ Ljúka &amp; vista PDF</button>' +
      '</div>';
    updStats();
  }
  function updStats() {
    const el = document.getElementById('_bks-stats');
    if (el && S) el.textContent = model().statusLine;
  }
  function savedNote(txt) {
    const el = document.getElementById('_bks-savenote');
    if (el) el.textContent = txt || '';
  }

  // ── vinnusvæði ──────────────────────────────────────────────────────────────
  function setPath(path, val) {
    const ks = path.split('.'); let o = S.data;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
    o[ks[ks.length - 1]] = val;
  }
  function markDirty() { _dirty = true; savedNote('· óvistað…'); scheduleAutosave(); }

  function custField(k, label, ph, type, big, span) {
    const v = k.split('.').reduce((o, p) => o[p], S.data);
    return '<div class="_bks-f' + (big ? ' _big' : '') + '" style="grid-column:span ' + (span || 2) + '"><label>' + esc(label) + '</label>' +
      '<input data-k="' + k + '" type="' + (type || 'text') + '" value="' + esc(v || '') + '" placeholder="' + esc(ph || '') + '"></div>';
  }

  function athFormHtml() {
    const c = S.data.cNew;
    const isHljod = c.fl === 'Hljóðstyrksmælingar';
    return '<div class="_bks-athrow1' + (isHljod ? ' _hljod' : '') + '">' +
      '<div><div class="_bks-lbl">Búnaður</div><select class="_bks-in" id="_bks-a-fl">' + FL_SELECT.map(x => '<option' + (x === c.fl ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></div>' +
      (isHljod
        ? '<div><div class="_bks-lbl">Hljóðst. (dB)</div><input class="_bks-in" id="_bks-a-num" inputmode="decimal" value="' + esc(c.numer) + '"></div>'
        : '<div><div class="_bks-lbl">Númer</div><input class="_bks-in" id="_bks-a-num" placeholder="t.d. 1.55" value="' + esc(c.numer) + '"></div>' +
          '<div><div class="_bks-lbl">Svæði</div><input class="_bks-in" id="_bks-a-sv" placeholder="t.d. 6" value="' + esc(c.svaedi) + '"></div>') +
      '<div><div class="_bks-lbl">Athugasemd</div><select class="_bks-in" id="_bks-a-teg">' + TEG_LIST.map(x => '<option' + (x === c.teg ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select></div>' +
    '</div>' +
    '<div class="_bks-lbl">Lýsing</div>' +
    '<div class="_bks-athrow2"><input class="_bks-in" id="_bks-a-lys" placeholder="t.d. Engin vöktun í ruslageymslu í kjallara á svæði 6" value="' + esc(c.lysing) + '">' +
    '<button type="button" class="_bks-add" id="_bks-a-add">+ Bæta við</button></div>';
  }

  function verdBodyHtml() {
    const m = model();
    const items = priceItems();
    return '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">' +
      '<button type="button" class="_bks-add" id="_bks-v-auto" title="Reiknar verðlínur úr búnaðaryfirlitinu: tengdir liðir í verðlistanum × talinn búnaður" style="background:#1f8a4c">⚡ Reikna út frá skýrslunni</button>' +
      '<select class="_bks-in" id="_bks-v-pick" style="flex:1;min-width:200px"><option value="">— Bæta við línu úr verðlista —</option>' +
        items.map((it, i) => '<option value="' + i + '">' + esc(it.name) + ' · ' + fmtKr(it.price) + '</option>').join('') + '</select>' +
      '<button type="button" class="_bks-add" id="_bks-v-blank" style="background:#17191d">＋ Auð lína</button>' +
      '<button type="button" class="_bks-hb" id="_bks-v-edit" style="background:#fff;border:1px solid #d0d4da;color:#334155;min-height:37px;border-radius:8px;padding:8px 12px;font-size:12.5px;font-weight:700;cursor:pointer">🏷 Breyta verðlista</button>' +
    '</div>' +
    (m.linur.length ?
      '<div class="_bks-vhead"><span>Liður</span><span style="text-align:center">Magn</span><span style="text-align:right">Einingaverð</span><span style="text-align:right">Samtals án vsk</span><span></span></div>' +
      m.linur.map((l, i) =>
        '<div class="_bks-vrow">' +
          '<input class="_bks-in" data-vk="name" data-vi="' + i + '" value="' + esc(l.name) + '" placeholder="Lýsing línu">' +
          '<input class="_bks-in" data-vk="qty" data-vi="' + i + '" inputmode="numeric" value="' + esc(l.qty) + '" style="text-align:center">' +
          '<input class="_bks-in" data-vk="price" data-vi="' + i + '" inputmode="decimal" value="' + esc(l.price) + '" style="text-align:right">' +
          '<span style="text-align:right;font-weight:800;font-size:13px">' + fmtKr(l.samtals) + '</span>' +
          '<button type="button" class="_bks-del" data-vdel="' + i + '">✕</button>' +
        '</div>').join('') +
      '<div class="_bks-vtot">' +
        '<div><span>Samtals án vsk</span><b>' + fmtKr(m.verdSum) + '</b></div>' +
        '<div><span>VSK ' + VAT_PCT + '%</span><b>' + fmtKr(m.verdVsk) + '</b></div>' +
        '<div><span>Afsláttur (kr m. vsk)</span><b><input id="_bks-v-afsl" class="_bks-in" inputmode="numeric" value="' + esc(S.data.verd.afslattur || '') + '" placeholder="0" style="width:100px;text-align:right;padding:4px 8px;font-size:13px;color:#b3341a;font-weight:800"></b></div>' +
        '<div class="_big"><span>Samtals m. vsk</span><span>' + fmtKr(m.verdTotal) + '</span></div>' +
      '</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;align-items:center;justify-content:flex-end">' +
        (S.data.verd.sale_num ? '<span style="font-size:12px;font-weight:800;color:#166b3a;background:#dcf1e4;border:1px solid #a9dcbd;border-radius:99px;padding:4px 11px">🧾 Reikningur ' + esc(S.data.verd.sale_num) + ' stofnaður ✓</span>' : '') +
        '<button type="button" class="_bks-add" id="_bks-v-invoice" style="background:#141619">🧾 ' + (S.data.verd.sale_num ? 'Búa til annan reikning' : 'Búa til reikning → Kröfu yfirlit') + '</button>' +
      '</div>'
      : '<div style="font-size:12.5px;color:#8b93a1;font-style:italic;padding:6px 0">Engar línur — veldu liði úr verðlistanum að ofan. Verðin fara ekki á prentuðu skýrsluna.</div>');
  }

  function renderWork() {
    const ov = ensureOverlay(), w = ov.querySelector('._bks-wrap');
    const s = S.data, m = model();
    w.innerHTML =
      '<div class="_bks-cust">' +
        custField('customer.nafn', 'Viðskiptavinur', '', 'text', true, 3) +
        custField('customer.kt', 'Kennitala', '000000-0000', 'text', false, 1) +
        custField('customer.heimili', 'Aðsetur', '', 'text', false, 2) +
        custField('customer.umbedid', 'Umbeðið af', '', 'text', false, 2) +
        custField('customer.tengi', 'Tengiliður á verkstað', '', 'text', false, 2) +
        custField('meta.nr', 'Úttekt nr.', '', 'text', false, 1) +
        custField('meta.dags', 'Dags. skoðunar', '', 'date', false, 1) +
        custField('meta.stadur', 'Staður', '', 'text', false, 3) +
        custField('meta.madur', 'Skoðunarmaður', '', 'text', false, 3) +
      '</div>' +
      '<div class="_bks-grid">' +
        '<div style="display:flex;flex-direction:column;gap:14px">' +
          '<div class="_bks-card"><div class="_bks-ch">Búnaðaryfirlit<small id="_bks-eqsum">' + m.taeki + ' tæki samtals</small></div><div class="_bks-body">' +
            '<div class="_bks-eqhead"><span>Búnaður</span><span style="text-align:center">Í lagi</span><span style="text-align:center">Ekki í lagi</span><span style="text-align:center">Vantar</span><span style="text-align:center">Samtals</span></div>' +
            s.bunadur.map((r, i) => {
              const step = (k, col) => '<span class="_bks-step">' +
                '<button type="button" data-si="' + i + '" data-sk="' + k + '" data-sd="-1">−</button>' +
                '<b style="color:' + col + '" data-sv="' + i + ':' + k + '">' + r[k] + '</b>' +
                '<button type="button" data-si="' + i + '" data-sk="' + k + '" data-sd="1">+</button></span>';
              // fela/sýna þennan lið í ÞESSARI skýrslu (birtist ekki í prentun/PDF)
              const hideBtn = '<button type="button" data-eqhide="' + i + '" title="' + (r.hidden ? 'Sýna þennan lið aftur í skýrslunni' : 'Fela þennan lið úr þessari skýrslu') + '" style="border:0;background:none;color:' + (r.hidden ? '#1f8a4c' : '#9aa1ac') + ';font-weight:800;cursor:pointer;font-size:12px;padding:2px 4px;vertical-align:middle">' + (r.hidden ? '↩' : '🚫') + '</button>';
              const delBtn = r.custom ? '<button type="button" data-eqdel="' + i + '" title="Fjarlægja þennan búnað alveg úr skýrslunni" style="border:0;background:none;color:#c93c1d;font-weight:800;cursor:pointer;font-size:11px;padding:2px 4px;vertical-align:middle">✕</button>' : '';
              if (r.hidden) {
                return '<div class="_bks-eqrow" style="opacity:.55">' +
                  '<span style="color:#8b93a1"><span style="text-decoration:line-through">' + esc(r.label) + '</span> ' + hideBtn + delBtn + '</span>' +
                  '<span style="grid-column:2 / span 3;text-align:center;font-size:11px;color:#8b93a1;font-style:italic">falið — birtist ekki í skýrslu</span>' +
                  '<span></span></div>';
              }
              return '<div class="_bks-eqrow"><span>' + esc(r.label) + ' ' + hideBtn + delBtn + '</span>' +
                '<span style="text-align:center">' + step('iLagi', '#1f8a4c') + '</span>' +
                '<span style="text-align:center">' + step('ekki', '#c93c1d') + '</span>' +
                '<span style="text-align:center">' + step('vantar', '#b07a10') + '</span>' +
                '<span style="text-align:center"><span class="_bks-sam" data-sam="' + i + '">' + m.bunRows[i].samtals + '</span></span></div>';
            }).join('') +
            '<button type="button" id="_bks-eq-add" style="margin-top:10px;padding:7px 14px;border-radius:8px;border:1px dashed #a8b0bb;background:#f8f9fb;color:#334155;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer">＋ Bæta við búnaði úr verðlista</button>' +
            '</div></div>' +
          '<div class="_bks-card"><div class="_bks-ch">Athugasemdir<small id="_bks-athsum">' + s.aths.length + ' skráðar</small></div><div class="_bks-body">' +
            '<div class="_bks-athform" id="_bks-athform">' + athFormHtml() + '</div>' +
            '<div id="_bks-athlist"></div>' +
          '</div></div>' +
          '<div class="_bks-card"><div class="_bks-ch">Ábendingar</div><div class="_bks-body">' +
            '<textarea class="_bks-in" data-k="abend" placeholder="Ein ábending í hverja línu, t.d.: Mælt er með að skipta út gömlum reykskynjurum">' + esc(s.abend) + '</textarea>' +
          '</div></div>' +
        '</div>' +
        '<div style="display:flex;flex-direction:column;gap:14px">' +
          '<div class="_bks-card"><div class="_bks-ch">Aðalstöð</div><div class="_bks-body">' +
            '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:10px;align-items:flex-end">' +
              '<div><div class="_bks-lbl">Kerfisgerð</div><span class="_bks-seg">' +
                '<button type="button" data-gerd="Rása" class="' + (s.stod.gerd === 'Rása' ? '_on' : '') + '">Rása</button>' +
                '<button type="button" data-gerd="Slaufu" class="' + (s.stod.gerd === 'Slaufu' ? '_on' : '') + '">Slaufu</button></span></div>' +
              '<div style="width:120px"><div class="_bks-lbl">Fjöldi rása/slaufa</div><input class="_bks-in" data-k="stod.fjoldi" value="' + esc(s.stod.fjoldi) + '"></div>' +
              '<div style="flex:1;min-width:150px"><div class="_bks-lbl">Tegund búnaðar</div><input class="_bks-in" data-k="stod.tegund" value="' + esc(s.stod.tegund) + '" placeholder="t.d. Junior"></div>' +
            '</div>' +
            s.stod.checks.map((c, i) =>
              '<div class="_bks-chk"><span>' + esc(c.label) + '</span><span style="display:flex;gap:6px">' +
              '<button type="button" class="_bks-okbtn' + (c.st === 'ok' ? ' _on' : '') + '" data-tgp="checks" data-tgi="' + i + '" data-tgv="ok">✓ Í lagi</button>' +
              '<button type="button" class="_bks-badbtn' + (c.st === 'fail' ? ' _on' : '') + '" data-tgp="checks" data-tgi="' + i + '" data-tgv="fail">✗ Ekki í lagi</button></span></div>').join('') +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">' +
              '<div><div class="_bks-lbl">Heiti fjargæsluaðila</div><input class="_bks-in" data-k="stod.fjargaesla" value="' + esc(s.stod.fjargaesla) + '" placeholder="t.d. Öryggismiðstöðin"></div>' +
              '<div><div class="_bks-lbl">Yfirlitsmynd teiknuð af</div><input class="_bks-in" data-k="stod.teiknud" value="' + esc(s.stod.teiknud) + '"></div>' +
            '</div>' +
          '</div></div>' +
          '<div class="_bks-card"><div class="_bks-ch">Hljóðstyrksmælingar</div><div class="_bks-body">' +
            s.hljod.map((h, i) =>
              '<div class="_bks-chk"><span>' + esc(h.label) + '</span><span style="display:flex;gap:6px;align-items:center">' +
              '<input class="_bks-in" data-k="hljod.' + i + '.db" inputmode="decimal" value="' + esc(h.db) + '" placeholder="dB" style="width:66px;text-align:center">' +
              '<button type="button" class="_bks-okbtn' + (h.st === 'ok' ? ' _on' : '') + '" data-tgp="hljod" data-tgi="' + i + '" data-tgv="ok" style="min-width:32px">✓</button>' +
              '<button type="button" class="_bks-badbtn' + (h.st === 'fail' ? ' _on' : '') + '" data-tgp="hljod" data-tgi="' + i + '" data-tgv="fail" style="min-width:32px">✗</button></span></div>').join('') +
            '<div class="_bks-hint">' + esc(HMS_HINT) + '</div>' +
          '</div></div>' +
          '<div class="_bks-card"><div class="_bks-ch">Rafhlöðumælingar</div><div class="_bks-body">' +
            '<div class="_bks-rafgrid">' +
              [['staerd', 'Stærð rafhlaðna', 't.d. 2x12 Volt'], ['rymd', 'Ástimpluð rýmd (Ah)', 't.d. 7'], ['pct', 'Mæld rýmd (%)', '100'],
               ['argerd', 'Árgerð rafhlaðna', 't.d. 2026'], ['spenna', 'Spenna eftir prófun (V)', 't.d. 27'], ['i1', 'Straumur í rafmagnsleysi i₁ (mA)', 't.d. 325'],
               ['i2', 'Straumur í útkalli i₂ (mA)', 't.d. 630'], ['ending', 'Lágmarks ending (klst)', '12']]
              .map(f => '<div><div class="_bks-lbl">' + esc(f[1]) + '</div><input class="_bks-in" data-k="raf.' + f[0] + '" inputmode="decimal" value="' + esc(s.raf[f[0]]) + '" placeholder="' + esc(f[2]) + '"></div>').join('') +
            '</div>' +
            '<div class="_bks-rafstrip" id="_bks-rafstrip"></div>' +
          '</div></div>' +
          '<div class="_bks-card"><div class="_bks-ch">Verð / kostnaðaráætlun<small>fer ekki á prentuðu skýrsluna</small></div><div class="_bks-body" id="_bks-verd">' +
            verdBodyHtml() +
          '</div></div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;justify-content:flex-end;align-items:center;gap:14px;margin-top:16px;flex-wrap:wrap">' +
        '<span class="_bks-hint" style="margin:0">Vistast sjálfkrafa á meðan unnið er.</span>' +
        '<button type="button" class="_bks-add" id="_bks-toreport" style="font-size:14.5px;padding:11px 20px">Skoða skýrslu →</button>' +
      '</div>';
    wireWork(w);
    renderAthList(); updRafStrip();
  }

  function updRafStrip() {
    const el = document.getElementById('_bks-rafstrip'); if (!el || !S) return;
    const m = model();
    el.innerHTML =
      '<span>MÆLD RÝMD <b>' + esc(m.rafShow.maeldN) + '</b> Ah</span>' +
      '<span>ÁÆTLUÐ ENDING <b>' + esc(m.rafShow.aaetludN) + '</b> klst</span>' +
      '<span>LÁGMARKS RÝMD ÞARF <b>' + esc(m.rafShow.lagN) + '</b> Ah</span>' +
      '<span class="_bks-rafchip' + (m.rafOk === null ? '' : m.rafOk ? ' _ok' : ' _bad') + '">' + esc(m.rafOkText) + '</span>';
  }

  function renderAthList() {
    const el = document.getElementById('_bks-athlist'); if (!el || !S) return;
    const sum = document.getElementById('_bks-athsum'); if (sum) sum.textContent = S.data.aths.length + ' skráðar';
    const list = S.data.aths.map((a, i) => ({ ...a, i }))
      .sort((x, y) => FL_ORDER.indexOf(x.fl) - FL_ORDER.indexOf(y.fl) || x.i - y.i);
    el.innerHTML = list.length ? list.map(a => {
      const bad = tegBad(a.teg);
      const hvar = [a.numer && ('nr. ' + a.numer), a.svaedi && ('svæði ' + a.svaedi)].filter(Boolean).join(' · ');
      return '<div class="_bks-ath">' +
        '<span class="_bks-flchip">' + esc(a.fl) + '</span>' +
        '<span style="padding:3px 7px;border-radius:5px;font-size:10px;font-weight:800;white-space:nowrap;margin-top:1px;background:' + (bad ? '#fbe3dd' : '#fdf3d7') + ';color:' + (bad ? '#b3341a' : '#8a6100') + ';border:1px solid ' + (bad ? '#efb9ab' : '#eed9a0') + '">' + esc(a.teg) + '</span>' +
        (hvar ? '<span style="font-size:11px;color:#7a8290;font-weight:700;white-space:nowrap;margin-top:2px">' + esc(hvar) + '</span>' : '') +
        '<span style="font-size:12.5px;line-height:1.4">' + esc(a.lysing || '') + '</span>' +
        '<button type="button" class="_bks-del" data-adel="' + a.i + '">✕</button>' +
      '</div>';
    }).join('') : '<div style="margin-top:10px;font-size:12.5px;color:#8b93a1;font-style:italic">Engar athugasemdir skráðar — bættu við hér að ofan. Þær raðast sjálfkrafa eftir búnaði í skýrslunni.</div>';
    el.querySelectorAll('[data-adel]').forEach(b => b.addEventListener('click', () => {
      S.data.aths.splice(+b.dataset.adel, 1); markDirty(); renderAthList(); updStats();
    }));
  }

  function wireAthForm(w) {
    const form = w.querySelector('#_bks-athform');
    const flSel = form.querySelector('#_bks-a-fl');
    flSel.addEventListener('change', () => {
      S.data.cNew.fl = flSel.value;
      form.innerHTML = athFormHtml(); wireAthForm(w);
      form.querySelector('#_bks-a-num').focus();
    });
    const tegSel = form.querySelector('#_bks-a-teg');
    tegSel.addEventListener('change', () => { S.data.cNew.teg = tegSel.value; });
    ['num', 'sv', 'lys'].forEach(k => {
      const inp = form.querySelector('#_bks-a-' + k);
      if (inp) inp.addEventListener('input', () => { S.data.cNew[k === 'num' ? 'numer' : k === 'sv' ? 'svaedi' : 'lysing'] = inp.value; });
    });
    const add = form.querySelector('#_bks-a-add');
    add.addEventListener('click', () => {
      const c = S.data.cNew;
      if (!c.lysing.trim() && !c.numer.trim()) return;
      S.data.aths.push({ fl: c.fl, numer: c.numer.trim(), svaedi: c.svaedi.trim(), teg: c.teg, lysing: c.lysing.trim() });
      S.data.cNew = { ...c, numer: '', svaedi: '', lysing: '' };
      markDirty(); form.innerHTML = athFormHtml(); wireAthForm(w);
      renderAthList(); updStats();
      form.querySelector('#_bks-a-lys').focus();
    });
    const lys = form.querySelector('#_bks-a-lys');
    if (lys) lys.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add.click(); } });
  }

  // ⚡ verðlínur úr búnaðaryfirlitinu: tengdir verðlista-liðir × talinn búnaður
  function autoVerdLines() {
    const m = model();
    const qtyFor = link => {
      const q = r => (r && !r.hidden) ? r.samtals : 0; // faldir liðir gefa 0
      if (link === 'fast') return 1;
      if (link === 'reykhita') return q(m.bunRows[LINK_IX.reykskynjarar]) + q(m.bunRows[LINK_IX.hitaskynjarar]);
      if (LINK_IX[link] != null) return q(m.bunRows[LINK_IX[link]]);
      // sérsniðinn búnaður: passa á key EÐA slug af heiti raðarinnar
      return q(m.bunRows.find(r => r.key === link || slugKey(r.label) === link));
    };
    return priceItems()
      .filter(it => it.link)
      .map(it => ({ name: it.name, qty: String(qtyFor(it.link)), price: String(it.price) }))
      .filter(l => +l.qty > 0);
  }

  // 🧾 reikningur úr verðlínunum → solur (greitt_med=reikningur) → Kröfu yfirlit;
  // PDF-ið fer sjálfkrafa í reikningsdálk ársins gegnum patch 233. Sama talna-
  // regla og annars staðar: samtals = án-vsk + vsk, vsk tekur afrúnun.
  async function createInvoice(rerender) {
    const sb = SB(); if (!sb) return toast('Engin gagnabankatenging', true);
    const m = model();
    if (!m.linur.length) { toast('Engar verðlínur — reiknaðu (⚡) eða bættu við línum fyrst.', true); return; }
    const prev = S.data.verd.sale_num;
    if (!confirm((prev ? 'Reikningur ' + prev + ' er þegar til fyrir þessa skýrslu.\nBúa til ANNAN reikning?\n\n' : '') +
      'Búa til reikning upp á ' + fmtKr(m.verdTotal) + ' m. vsk fyrir ' + (S.co.nafn || '') + ' og setja í Kröfu yfirlit?')) return;
    const linur = m.linur.map(l => ({ type: 'service', desc: l.name, qty: num(l.qty) || 0, unit_price_ex_vat: num(l.price) || 0, vsk_pct: VAT_PCT, ref: '' }));
    // POS-venjan: línur bera FULLT verð, afslattur = kr m.vsk af heild, samtals er
    // nettó m.vsk og án-vsk/vsk skalast (VSK tekur afrúnun) — svo PDF (233) og
    // Kröfu yfirlit reikna rétt.
    const to = Math.round(m.verdTotal), se = Math.round(to / (1 + VAT_PCT / 100)), vs = to - se;
    const afsl = Math.max(0, Math.round(m.verdGross) - to);
    const ktd = String(S.co.kennitala || '').replace(/\D/g, '');
    const ins = await sb.from('solur').insert({
      customer_nafn: S.co.nafn || '', customer_id: S.co.id, customer_kt: ktd || null,
      starfsmadur: S.data.meta.madur || 'Kassi', linur,
      upphaed_an_vsk: se, vsk_upphaed: vs, samtals: to, afslattur: afsl,
      greitt_med: 'reikningur', status: 'final', source: 'brunakerfi',
      athugasemdir: 'Brunakerfisskoðun — úttekt ' + (S.data.meta.nr || '') + ' · ' + fmtDags(S.data.meta.dags)
    }).select('num,id').single();
    if (ins.error) { toast('Reikningur vistaðist ekki: ' + ins.error.message, true); return; }
    S.data.verd.sale_num = ins.data.num; S.data.verd.sale_id = ins.data.id;
    markDirty(); try { await saveDraft(); } catch (_) {}
    try {
      const r = await sb.from('solur').select('*').eq('id', ins.data.id).single();
      if (r.data && window.UttektInvoicePdf && UttektInvoicePdf.saveForSale) await UttektInvoicePdf.saveForSale(S.co.id, r.data);
    } catch (e) { console.warn('[bks] invoice pdf', e); }
    toast('🧾 Reikningur ' + ins.data.num + ' stofnaður — kominn í Kröfu yfirlit ✓');
    rerender();
  }

  function wireVerd(w) {
    const box = w.querySelector('#_bks-verd'); if (!box) return;
    const rerender = () => { box.innerHTML = verdBodyHtml(); wireVerd(w); };
    const inv = box.querySelector('#_bks-v-invoice');
    if (inv) inv.addEventListener('click', () => { inv.disabled = true; createInvoice(rerender).finally(() => { inv.disabled = false; }); });
    const auto = box.querySelector('#_bks-v-auto');
    if (auto) auto.addEventListener('click', () => {
      const lines = autoVerdLines();
      if (!lines.length) { toast('Enginn búnaður talinn enn — eða engir liðir tengdir í verðlistanum (🏷).', true); return; }
      if (S.data.verd.linur.length && !confirm('Skipta út núverandi verðlínum fyrir reiknaðar línur úr skýrslunni?')) return;
      S.data.verd.linur = lines; markDirty(); rerender();
      toast('⚡ ' + lines.length + ' línur reiknaðar úr búnaðaryfirlitinu');
    });
    const pick = box.querySelector('#_bks-v-pick');
    if (pick) pick.addEventListener('change', () => {
      const it = priceItems()[+pick.value];
      if (it) { S.data.verd.linur.push({ name: it.name, qty: '1', price: String(it.price) }); markDirty(); rerender(); }
    });
    const blankB = box.querySelector('#_bks-v-blank');
    if (blankB) blankB.addEventListener('click', () => { S.data.verd.linur.push({ name: '', qty: '1', price: '' }); markDirty(); rerender(); });
    const afsl = box.querySelector('#_bks-v-afsl');
    if (afsl) afsl.addEventListener('input', () => {
      S.data.verd.afslattur = afsl.value; markDirty();
      const m = model();
      const tot = box.querySelector('._bks-vtot ._big span:last-child');
      if (tot) tot.textContent = fmtKr(m.verdTotal);
    });
    const edit = box.querySelector('#_bks-v-edit');
    if (edit) edit.addEventListener('click', () => openPriceEditor(rerender));
    box.querySelectorAll('[data-vdel]').forEach(b => b.addEventListener('click', () => {
      S.data.verd.linur.splice(+b.dataset.vdel, 1); markDirty(); rerender();
    }));
    box.querySelectorAll('[data-vk]').forEach(inp => inp.addEventListener('input', () => {
      const l = S.data.verd.linur[+inp.dataset.vi]; if (!l) return;
      l[inp.dataset.vk] = inp.value; markDirty();
      // uppfæra línusamtölu + heildartölur án þess að endurteikna (halda fókus)
      const m = model();
      const row = inp.closest('._bks-vrow');
      if (row) { const sp = row.querySelector('span'); if (sp) sp.textContent = fmtKr(m.linur[+inp.dataset.vi].samtals); }
      // uppfæra tölugildin á staðnum (ekki innerHTML) svo Afsláttur-reiturinn +
      // hlustari hans haldist óbreytt meðan verið er að slá inn línu
      const tot = box.querySelector('._bks-vtot');
      if (tot) {
        const kids = tot.children;
        if (kids[0]) { const b = kids[0].querySelector('b'); if (b) b.textContent = fmtKr(m.verdSum); }
        if (kids[1]) { const b = kids[1].querySelector('b'); if (b) b.textContent = fmtKr(m.verdVsk); }
        const big = tot.querySelector('._big span:last-child'); if (big) big.textContent = fmtKr(m.verdTotal);
      }
    }));
  }

  // Bætir verðlista-lið í ÞESSA skýrslu: búnaðarröð í yfirlitið (ef ekki fastur/
  // innbyggður liður) + verðlína í reikningsboxið. Verðlista-liðurinn er tengdur
  // sínum búnaðarlykli svo ⚡ útreikningur virki líka.
  async function addBunadurFromItem(idx) {
    const items = priceItems();
    const it = items[idx]; if (!it) return;
    const label = (it.name || '').trim(); if (!label) return;
    const builtinLink = it.link === 'fast' || it.link === 'reykhita' || LINK_IX[it.link] != null;
    if (!builtinLink) {
      const key = await addCustomBunadur(label, false);
      if (it.link !== key) { it.link = key; await savePriceItems(items); }
      const ex = S.data.bunadur.find(r => r.key === key);
      if (ex) ex.hidden = false;
      else S.data.bunadur.push({ label, iLagi: 0, ekki: 0, vantar: 0, custom: true, key });
    }
    if (!(S.data.verd.linur || []).some(l => (l.name || '') === it.name)) {
      (S.data.verd.linur = S.data.verd.linur || []).push({ name: it.name, qty: '1', price: String(it.price) });
    }
    markDirty(); renderWork(); updStats();
  }

  // Veljari sem opnast af „＋ Bæta við búnaði" — allur verðlistinn með leit; velja
  // lið → í búnaðaryfirlit + reikningsbox. ★ merkir lið sem sjálfgefinn í nýjum
  // skýrslum. „＋ Nýr liður" býr til nýja verðlínu (t.d. +6m hæð · 800 kr).
  function openBunadurPicker() {
    let p = document.getElementById('_bks-bpick'); if (p) p.remove();
    p = document.createElement('div'); p.id = '_bks-bpick';
    p.style.cssText = 'position:fixed;inset:0;z-index:9800;background:rgba(8,12,20,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    let q = '';
    const render = () => {
      const items = priceItems();
      const inReport = new Set(S.data.bunadur.map(r => r.key).filter(Boolean));
      const inLinur = new Set((S.data.verd.linur || []).map(l => (l.name || '')));
      const dfltKeys = new Set(customBunadurList().filter(c => c.dflt).map(c => c.key));
      const ql = q.trim().toLowerCase();
      const rows = items.map((it, i) => ({ it, i })).filter(x => !ql || (x.it.name || '').toLowerCase().includes(ql));
      p.innerHTML =
        '<div style="background:#fff;border-radius:14px;max-width:560px;width:100%;max-height:86vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4);font-family:-apple-system,\'Segoe UI\',Helvetica,Arial,sans-serif">' +
          '<div style="background:#141619;color:#fff;padding:13px 16px;border-radius:14px 14px 0 0;display:flex;justify-content:space-between;align-items:center">' +
            '<div><div style="font-weight:800;font-size:14.5px">＋ Bæta við búnaði úr verðlista</div>' +
            '<div style="font-size:11px;color:#8b93a1">Veldu lið → bætist í búnaðaryfirlitið og verðið fer í reikningsboxið. ★ = birtist sjálfgefið í nýjum skýrslum.</div></div>' +
            '<button type="button" id="_bks-bp-x" style="background:none;border:0;color:#8b93a1;font-size:20px;cursor:pointer;padding:4px 8px">✕</button></div>' +
          '<div style="padding:10px 16px 4px"><input id="_bks-bp-q" placeholder="🔍 Leita í verðlista…" value="' + esc(q) + '" style="width:100%;border:1px solid #d0d4da;border-radius:8px;padding:8px 11px;font-size:13.5px"></div>' +
          '<div style="padding:4px 16px 8px;overflow-y:auto;flex:1">' +
            (rows.length ? rows.map(({ it, i }) => {
              const key = slugKey(it.name);
              const has = inReport.has(key) || (it.link && inReport.has(it.link)) || inLinur.has(it.name);
              const isDflt = dfltKeys.has(key);
              return '<div style="display:flex;align-items:center;gap:8px;padding:7px 2px;border-bottom:1px solid #eef0f3">' +
                '<button type="button" data-star="' + i + '" title="Sýna sjálfgefið í nýjum skýrslum" style="border:0;background:none;cursor:pointer;font-size:16px;line-height:1;color:' + (isDflt ? '#e0a400' : '#c9ced6') + '">' + (isDflt ? '★' : '☆') + '</button>' +
                '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(it.name) + '</div>' +
                '<div style="font-size:11px;color:#8b93a1">' + fmtKr(it.price) + ' án vsk</div></div>' +
                (has ? '<span style="font-size:11px;font-weight:800;color:#166b3a;background:#dcf1e4;border:1px solid #a9dcbd;border-radius:99px;padding:3px 9px">í skýrslu ✓</span>'
                     : '<button type="button" data-add="' + i + '" style="padding:6px 13px;border-radius:8px;border:0;background:#1f8a4c;color:#fff;font-size:12.5px;font-weight:800;cursor:pointer">Bæta við</button>') +
              '</div>';
            }).join('') : '<div style="font-size:12.5px;color:#8b93a1;font-style:italic;padding:12px 2px">Ekkert fannst — prófaðu „＋ Nýr liður".</div>') +
          '</div>' +
          '<div style="padding:11px 16px;border-top:1px solid #eef0f3;display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
            '<button type="button" id="_bks-bp-new" style="padding:8px 13px;border-radius:8px;border:1px dashed #a8b0bb;background:#f8f9fb;color:#334155;font-size:12.5px;font-weight:700;cursor:pointer">＋ Nýr liður í verðlista</button>' +
            '<button type="button" id="_bks-bp-edit" style="padding:8px 13px;border-radius:8px;border:1px solid #d0d4da;background:#fff;color:#334155;font-size:12.5px;font-weight:700;cursor:pointer">🏷 Breyta verðlista</button>' +
            '<button type="button" id="_bks-bp-done" style="margin-left:auto;padding:8px 16px;border-radius:8px;border:0;background:#141619;color:#fff;font-size:13px;font-weight:800;cursor:pointer">Loka</button>' +
          '</div>' +
        '</div>';
      const qi = p.querySelector('#_bks-bp-q');
      qi.addEventListener('input', () => { q = qi.value; const pos = qi.selectionStart; render(); const nq = p.querySelector('#_bks-bp-q'); if (nq) { nq.focus(); try { nq.setSelectionRange(pos, pos); } catch (_) {} } });
      p.querySelector('#_bks-bp-x').addEventListener('click', () => p.remove());
      p.querySelector('#_bks-bp-done').addEventListener('click', () => p.remove());
      p.querySelector('#_bks-bp-edit').addEventListener('click', () => { p.remove(); openPriceEditor(() => renderWork()); });
      p.querySelector('#_bks-bp-new').addEventListener('click', async () => {
        const name = (prompt('Heiti nýs liðar (t.d. „Skoðun á reyk- hitaskynjurum +6m hæð"):') || '').trim();
        if (!name) return;
        const price = num(prompt('Verð án VSK (kr), t.d. 800:', '')) || 0;
        const items2 = priceItems();
        if (!items2.some(x => (x.name || '').toLowerCase() === name.toLowerCase())) {
          items2.push({ name, price, link: slugKey(name) });
          await addCustomBunadur(name, true); // nýr liður úr þessum glugga = sjálfgefinn
          await savePriceItems(items2);
        }
        render();
      });
      p.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', async () => { await addBunadurFromItem(+b.dataset.add); render(); }));
      p.querySelectorAll('[data-star]').forEach(b => b.addEventListener('click', async () => {
        const it = priceItems()[+b.dataset.star]; if (!it) return;
        const key = slugKey(it.name); const list = customBunadurList(); const ex = list.find(c => c.key === key);
        if (ex) { ex.dflt = !ex.dflt; await saveCustomBunadur(list); } else { await addCustomBunadur(it.name, true); }
        render();
      }));
    };
    render();
    p.addEventListener('click', e => { if (e.target === p) p.remove(); });
    document.body.appendChild(p);
  }

  function openPriceEditor(onDone) {
    let p = document.getElementById('_bks-pedit'); if (p) p.remove();
    p = document.createElement('div'); p.id = '_bks-pedit';
    p.style.cssText = 'position:fixed;inset:0;z-index:9700;background:rgba(8,12,20,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    const items = priceItems().map(x => ({ ...x }));
    const row = (it, i) =>
      '<div style="display:flex;gap:8px;padding:4px 0;align-items:center;flex-wrap:wrap">' +
        '<input class="_bks-in" data-pk="name" data-pi="' + i + '" value="' + esc(it.name) + '" style="flex:1;min-width:170px;border:1px solid #d0d4da;border-radius:8px;padding:7px 10px;font-size:13px">' +
        '<input class="_bks-in" data-pk="price" data-pi="' + i + '" inputmode="numeric" value="' + esc(it.price) + '" style="width:88px;text-align:right;border:1px solid #d0d4da;border-radius:8px;padding:7px 10px;font-size:13px">' +
        '<select class="_bks-in" data-pk="link" data-pi="' + i + '" title="Tengist skýrslu — magnið kemur sjálfkrafa úr búnaðaryfirlitinu" style="width:168px;border:1px solid ' + (it.link ? '#1f8a4c' : '#d0d4da') + ';border-radius:8px;padding:7px 8px;font-size:12px;background:' + (it.link ? '#f2faf5' : '#fff') + '">' +
          linkOpts().map(o => '<option value="' + o[0] + '"' + (o[0] === (it.link || '') ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') +
        '</select>' +
        '<button type="button" data-pdel="' + i + '" style="width:28px;height:28px;border-radius:7px;border:1px solid #efb9ab;background:#fff;color:#c93c1d;font-weight:800;cursor:pointer;flex:none">✕</button>' +
      '</div>';
    const render = () => {
      p.innerHTML =
        '<div style="background:#fff;border-radius:14px;max-width:640px;width:100%;max-height:84vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4);font-family:-apple-system,\'Segoe UI\',Helvetica,Arial,sans-serif">' +
          '<div style="background:#141619;color:#fff;padding:13px 16px;border-radius:14px 14px 0 0;display:flex;justify-content:space-between;align-items:center">' +
            '<div><div style="font-weight:800;font-size:14.5px">🏷 Verðlisti — brunakerfis-skoðun</div>' +
            '<div style="font-size:11px;color:#8b93a1">Verð án VSK. Breytingar gilda alls staðar í appinu.</div></div>' +
            '<button type="button" id="_bks-p-x" style="background:none;border:0;color:#8b93a1;font-size:20px;cursor:pointer;padding:4px 8px">✕</button></div>' +
          '<div style="padding:12px 16px;overflow-y:auto;flex:1" id="_bks-p-rows">' +
            '<div style="display:flex;gap:8px;font-size:10px;font-weight:800;color:#7a8290;text-transform:uppercase;letter-spacing:.04em;padding-bottom:4px"><span style="flex:1;min-width:170px">Liður</span><span style="width:88px;text-align:right">Verð án vsk</span><span style="width:168px">Tengist skýrslu</span><span style="width:28px"></span></div>' +
            items.map(row).join('') +
            '<button type="button" id="_bks-p-add" style="margin-top:10px;padding:8px 14px;border-radius:8px;border:1px dashed #a8b0bb;background:#f8f9fb;color:#334155;font-size:12.5px;font-weight:700;cursor:pointer">＋ Ný lína</button>' +
          '</div>' +
          '<div style="padding:12px 16px;border-top:1px solid #eef0f3;display:flex;justify-content:flex-end;gap:8px">' +
            '<button type="button" id="_bks-p-cancel" style="padding:9px 16px;border-radius:8px;border:1px solid #d0d4da;background:#fff;color:#334155;font-size:13px;font-weight:700;cursor:pointer">Hætta við</button>' +
            '<button type="button" id="_bks-p-save" style="padding:9px 18px;border-radius:8px;border:0;background:#1f8a4c;color:#fff;font-size:13px;font-weight:800;cursor:pointer">💾 Vista verðlista</button>' +
          '</div></div>';
      p.querySelector('#_bks-p-x').addEventListener('click', () => p.remove());
      p.querySelector('#_bks-p-cancel').addEventListener('click', () => p.remove());
      p.querySelector('#_bks-p-add').addEventListener('click', () => { items.push({ name: '', price: 0, link: '' }); render(); });
      p.querySelectorAll('[data-pdel]').forEach(b => b.addEventListener('click', () => { items.splice(+b.dataset.pdel, 1); render(); }));
      p.querySelectorAll('[data-pk]').forEach(inp => {
        const apply = () => {
          const it = items[+inp.dataset.pi]; if (!it) return;
          if (inp.dataset.pk === 'name') it.name = inp.value;
          else if (inp.dataset.pk === 'link') it.link = inp.value;
          else it.price = num(inp.value) || 0;
        };
        inp.addEventListener('input', apply);
        inp.addEventListener('change', apply);
      });
      p.querySelector('#_bks-p-save').addEventListener('click', async () => {
        await savePriceItems(items.filter(x => x.name.trim()));
        toast('Verðlisti vistaður ✓'); p.remove();
        if (onDone) onDone();
      });
    };
    render();
    p.addEventListener('click', e => { if (e.target === p) p.remove(); });
    document.body.appendChild(p);
  }

  function wireWork(w) {
    // textareitir (delegated — heldur fókus; AÐEINS einu sinni á wrap-ið,
    // annars safnast listeners upp við endur-opnun)
    if (!w.__bksInputWired) {
      w.__bksInputWired = true;
      w.addEventListener('input', e => {
        const k = e.target.dataset && e.target.dataset.k; if (!k || !S) return;
        setPath(k, e.target.value); markDirty();
        if (k.indexOf('raf.') === 0) updRafStrip();
        updStats();
      });
    }
    // teljarar
    w.querySelectorAll('[data-si]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.si, k = b.dataset.sk, d = +b.dataset.sd;
      const r = S.data.bunadur[i]; r[k] = Math.max(0, (+r[k] || 0) + d); markDirty();
      const v = w.querySelector('[data-sv="' + i + ':' + k + '"]'); if (v) v.textContent = r[k];
      const sam = w.querySelector('[data-sam="' + i + '"]'); if (sam) sam.textContent = (+r.iLagi || 0) + (+r.ekki || 0);
      const eq = document.getElementById('_bks-eqsum'); if (eq) eq.textContent = model().taeki + ' tæki samtals';
      updStats();
    }));
    // 3-stöðu togglar (aðalstöð + hljóð)
    w.querySelectorAll('[data-tgp]').forEach(b => b.addEventListener('click', () => {
      const list = b.dataset.tgp === 'hljod' ? S.data.hljod : S.data.stod.checks;
      const i = +b.dataset.tgi, v = b.dataset.tgv;
      list[i].st = list[i].st === v ? '' : v; markDirty();
      const row = b.closest('._bks-chk');
      row.querySelector('._bks-okbtn').classList.toggle('_on', list[i].st === 'ok');
      row.querySelector('._bks-badbtn').classList.toggle('_on', list[i].st === 'fail');
    }));
    // kerfisgerð
    w.querySelectorAll('[data-gerd]').forEach(b => b.addEventListener('click', () => {
      S.data.stod.gerd = b.dataset.gerd; markDirty();
      w.querySelectorAll('[data-gerd]').forEach(x => x.classList.toggle('_on', x === b));
    }));
    // sérsniðinn búnaður: bæta við (velja úr verðlistanum) / fela / fjarlægja
    const eqAdd = w.querySelector('#_bks-eq-add');
    if (eqAdd) eqAdd.addEventListener('click', () => openBunadurPicker());
    // fela/sýna lið í þessari skýrslu
    w.querySelectorAll('[data-eqhide]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.eqhide, r = S.data.bunadur[i]; if (!r) return;
      r.hidden = !r.hidden; markDirty(); renderWork(); updStats();
    }));
    // fjarlægja sérsniðinn lið alveg
    w.querySelectorAll('[data-eqdel]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.eqdel;
      if (!confirm('Fjarlægja „' + (S.data.bunadur[i] || {}).label + '" úr skýrslunni?')) return;
      S.data.bunadur.splice(i, 1); markDirty(); renderWork(); updStats();
    }));
    wireAthForm(w);
    wireVerd(w);
    const rep = w.querySelector('#_bks-toreport');
    if (rep) rep.addEventListener('click', () => setMode('report'));
  }

  // ── A4 skýrsla (HTML) ───────────────────────────────────────────────────────
  const R_CSS =
    '._bksr{font-family:Helvetica,Arial,sans-serif;color:#16181c;font-size:11.5px;line-height:1.45}' +
    '._bksr table{border-collapse:collapse;width:100%}' +
    '._bksr ._sec{break-inside:avoid;page-break-inside:avoid}' +
    '._bksr ._hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px solid #16181c;padding-bottom:8px}' +
    '._bksr ._hd img{height:44px}' +
    '._bksr ._hd ._t1{font-size:9px;text-align:right}._bksr ._hd ._t1 b{font-weight:700}' +
    '._bksr ._hd ._t2{font-size:15px;font-weight:800;text-align:right;letter-spacing:.02em}' +
    '._bksr ._hd ._t3{font-size:11.5px;font-weight:700;text-align:right;color:#c93c1d;letter-spacing:.03em}' +
    '._bksr ._cust td{padding:2px 0;font-size:12px;border:0}' +
    '._bksr ._cust td:first-child{color:#555;width:150px}._bksr ._cust td:last-child{font-weight:700}' +
    '._bksr ._rt th{background:#16181c;color:#fff;font-size:10px;font-weight:700;text-align:left;padding:4px 8px;border:1px solid #16181c}' +
    '._bksr ._rt td{border:1px solid #c9ccd2;padding:4px 8px;font-size:11.5px}' +
    '._bksr ._lt th{background:#eef0f3;color:#16181c;font-size:9px;font-weight:700;text-align:left;padding:4px 6px;border:1px solid #c9ccd2}' +
    '._bksr ._lt td{border:1px solid #c9ccd2;padding:3.5px 6px;font-size:10.5px}' +
    '._bksr ._num{text-align:center}' +
    '._bksr h3{font-size:11px;font-weight:800;letter-spacing:.03em;margin:14px 0 5px;text-transform:uppercase}' +
    '._bksr h4{font-size:11.5px;font-weight:800;margin:0 0 3px}' +
    '._bksr ._sig{display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:26px;margin-top:8px}' +
    '._bksr ._sig ._ln{border-top:1px solid #444;padding-top:3px;font-size:8px;color:#666}' +
    '._bksr ._sig ._v{font-size:10.5px;font-weight:700;padding-bottom:3px;min-height:15px}' +
    '._bksr ._legal{font-size:7.5px;color:#666;margin-top:7px}' +
    '._bksr ._costrip{border-top:1px solid #c9ccd2;margin-top:6px;padding-top:4px;font-size:8px;font-weight:600;text-align:center;color:#16181c}' +
    '@page{size:A4;margin:0}' +
    // efri/neðri spássíur á HVERRI síðu: ytri thead/tfoot endurtaka sig í prentun
    '@media print{._bksr>table>thead td{padding-top:9mm!important}._bksr>table>tfoot td{padding-bottom:8mm!important}}';

  function xm(v, want) { return v === want ? '<span style="font-weight:800">x</span>' : ''; }

  function reportInner() {
    const s = S.data, m = model();
    const custRow = (l, v) => v ? '<tr><td>' + esc(l) + ':</td><td>' + esc(v) + '</td></tr>' : '';
    const headerHtml =
      '<div class="_hd">' +
        '<img src="' + LOGO_PATH + '" alt="Brunahólf — Slökkvitæki ehf" onerror="this.style.display=\'none\'">' +
        '<div><div class="_t1">ÚTTEKT NR. <b>' + esc(s.meta.nr || '—') + '</b></div>' +
        '<div class="_t2">SKOÐUNARSKÝRSLA</div><div class="_t3">BRUNAVIÐVÖRUNARKERFIS</div></div>' +
      '</div>';
    const footerHtml =
      '<div class="_sig">' +
        '<div><div class="_v">' + esc(s.meta.stadur || '') + '</div><div class="_ln">Staður</div></div>' +
        '<div><div class="_v">' + esc(m.dagsFmt) + '</div><div class="_ln">Dags.</div></div>' +
        '<div><div class="_v">' + esc(s.meta.madur || '') + '</div><div class="_ln">F.h. Brunahólf slökkvitæki ehf.</div></div>' +
      '</div>' +
      '<div class="_legal">' + esc(FOOT_1) + '<br>' + esc(FOOT_2) + '</div>' +
      '<div class="_costrip">' + esc(FOOT_CO) + '</div>';

    const athTable = g => {
      if (g.isHljod) {
        return '<table class="_lt" style="width:100%"><thead><tr><th style="width:22%">TEGUND MÆLINGAR</th><th style="width:12%;text-align:center">HLJÓÐST. (dB)</th><th>LÝSING</th></tr></thead><tbody>' +
          g.rows.map(a => '<tr><td>' + esc(a.teg) + '</td><td class="_num" style="font-weight:700">' + esc(a.numer) + '</td><td>' + esc(a.lysing) + '</td></tr>').join('') + '</tbody></table>';
      }
      return '<table class="_lt" style="width:100%"><thead><tr><th style="width:9%">NÚMER</th><th style="width:9%">SVÆÐI</th><th style="width:22%">ATHUGASEMD</th><th>LÝSING</th></tr></thead><tbody>' +
        g.rows.map(a => '<tr><td class="_num">' + esc(a.numer) + '</td><td class="_num">' + esc(a.svaedi) + '</td><td style="font-weight:600">' + esc(a.teg) + '</td><td>' + esc(a.lysing) + '</td></tr>').join('') + '</tbody></table>';
    };

    // haus/fótur í thead/tfoot → endurtaka sig á hverri prentsíðu (Chrome)
    return '<div class="_bksr"><table><thead><tr><td style="border:0;padding:0 0 8px">' + headerHtml + '</td></tr></thead>' +
      '<tfoot><tr><td style="border:0;padding:10px 0 0">' + footerHtml + '</td></tr></tfoot>' +
      '<tbody><tr><td style="border:0;padding:0">' +

      '<table class="_cust _sec" style="margin:8px 0 10px"><tbody>' +
        custRow('Viðskiptavinur', m.custLine) + custRow('Umbeðið af', s.customer.umbedid) +
        custRow('Tengiliður á verkstað', s.customer.tengi) + custRow('Aðsetur', s.customer.heimili) +
        custRow('Dags. skoðunar', m.dagsFmt) +
      '</tbody></table>' +

      '<div class="_sec"><table class="_rt"><thead><tr><th>BÚNAÐUR</th><th style="width:70px;text-align:center">SAMTALS</th><th style="width:70px;text-align:center">Í LAGI</th><th style="width:80px;text-align:center">EKKI Í LAGI</th><th style="width:70px;text-align:center">VANTAR</th></tr></thead><tbody>' +
        m.bunRows.filter(r => !r.hidden).map(r =>
          '<tr><td style="font-weight:700">' + esc(r.label) + '</td><td class="_num" style="font-weight:700">' + r.samtals + '</td>' +
          '<td class="_num" style="color:#1f7a44">' + r.iLagi + '</td>' +
          '<td class="_num" style="color:' + (r.ekki > 0 ? '#b3341a' : '#16181c') + ';font-weight:' + (r.ekki > 0 ? 700 : 400) + '">' + r.ekki + '</td>' +
          '<td class="_num" style="color:' + (r.vantar > 0 ? '#a06c00' : '#16181c') + ';font-weight:' + (r.vantar > 0 ? 700 : 400) + '">' + r.vantar + '</td></tr>').join('') +
      '</tbody></table></div>' +

      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:4px">' +
        '<div>' +
          '<div class="_sec"><h3 style="margin-top:10px">Hljóðstyrksmælingar</h3>' +
          '<table class="_lt"><thead><tr><th>MÆLING</th><th style="width:62px;text-align:center">HLJÓÐST. (dB)</th><th style="width:44px;text-align:center">Í LAGI</th><th style="width:56px;text-align:center">EKKI Í LAGI</th></tr></thead><tbody>' +
          s.hljod.map(h => '<tr><td>' + esc(h.label) + '</td><td class="_num">' + (h.db === '' ? '—' : esc(h.db)) + '</td>' +
            '<td class="_num">' + xm(h.st, 'ok') + '</td><td class="_num" style="color:#b3341a">' + xm(h.st, 'fail') + '</td></tr>').join('') +
          '</tbody></table></div>' +
          '<div class="_sec"><h3>Rafhlöðumælingar</h3><table class="_lt"><tbody>' +
            [['Stærð rafhlaðna', s.raf.staerd || '—'], ['Ástimpluð rýmd rafhlaðna', m.rafShow.rymd], ['Mæld rýmd rafhlaðna', m.rafShow.maeld],
             ['Árgerð rafhlaðna', m.rafShow.argerd], ['Spenna eftir prófun', m.rafShow.spenna], ['Straumdráttur í rafmagnsleysi (i₁)', m.rafShow.i1],
             ['Straumdráttur í útkalli (i₂)', m.rafShow.i2], ['Lágmarks ending', m.rafShow.ending], ['Áætluð ending', m.rafShow.aaetlud]]
            .map(r => '<tr><td style="color:#444;width:60%">' + esc(r[0]) + '</td><td style="text-align:right;font-weight:700">' + esc(r[1]) + '</td></tr>').join('') +
            '<tr><td style="color:#444">Lágmarks rýmd rafhlaðna</td><td style="text-align:right;font-weight:700;color:' + (m.rafOk === false ? '#b3341a' : '#16181c') + '">' + esc(m.rafShow.lag) + '</td></tr>' +
          '</tbody></table></div>' +
        '</div>' +
        '<div>' +
          '<div class="_sec"><h3 style="margin-top:10px">Aðalstöð: ' + esc(m.gerdUpper) + '</h3>' +
          '<table class="_lt"><tbody>' +
            '<tr><td style="color:#444;width:60%">Fjöldi rása/slaufa</td><td colspan="2" class="_num" style="font-weight:700">' + esc(s.stod.fjoldi || '—') + '</td></tr>' +
            '<tr><td style="background:#eef0f3;font-size:9px;font-weight:700"></td><td style="background:#eef0f3;font-size:9px;font-weight:700;text-align:center;width:20%">Í LAGI</td><td style="background:#eef0f3;font-size:9px;font-weight:700;text-align:center;width:20%">EKKI Í LAGI</td></tr>' +
            s.stod.checks.map(c => '<tr><td>' + esc(c.label) + '</td><td class="_num">' + xm(c.st, 'ok') + '</td><td class="_num" style="color:#b3341a;font-weight:700">' + xm(c.st, 'fail') + '</td></tr>').join('') +
          '</tbody></table>' +
          '<table class="_lt" style="margin-top:12px"><tbody>' +
            '<tr><td style="color:#444;width:50%">Heiti fjargæsluaðila</td><td style="font-weight:700">' + esc(s.stod.fjargaesla || '—') + '</td></tr>' +
            '<tr><td style="color:#444">Tegund búnaðar</td><td style="font-weight:700">' + esc(s.stod.tegund || '—') + '</td></tr>' +
            '<tr><td style="color:#444">Yfirlitsmynd teiknuð af</td><td style="font-weight:700">' + esc(s.stod.teiknud || '—') + '</td></tr>' +
          '</tbody></table></div>' +
        '</div>' +
      '</div>' +

      (m.hasNextPage ?
        '<div style="font-size:10.5px;font-style:italic;color:#555;margin-top:12px">Athugasemdir og ábendingar á næstu síðu</div>' +
        '<div style="break-before:page;page-break-before:always">' +
          '<div style="font-size:13px;font-weight:800;letter-spacing:.03em;margin:2px 0 10px">ATHUGASEMDIR OG ÁBENDINGAR</div>' +
          m.athGroups.map(g => '<div class="_sec" style="margin-bottom:14px"><h4>' + esc(g.fl) + '</h4>' + athTable(g) + '</div>').join('') +
          (m.abendList.length ?
            '<div class="_sec"><h4>Ábendingar</h4>' +
            m.abendList.map(t => '<div style="display:flex;gap:7px;font-size:10.5px;padding:3px 0;border-bottom:1px solid #eef0f3"><span style="color:#c93c1d;font-weight:800">•</span><span>' + esc(t) + '</span></div>').join('') +
            '</div>' : '') +
        '</div>' : '') +

      '</td></tr></tbody></table></div>';
  }

  // ── PDF (jsPDF vektor — EKKI html2canvas, sjá patch 168/233) ────────────────
  function ensureJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = () => (window.jspdf && window.jspdf.jsPDF) ? res() : rej(new Error('jsPDF hlóðst ekki.'));
      s.onerror = () => rej(new Error('jsPDF hlóðst ekki.'));
      document.head.appendChild(s);
    });
  }
  function logoData() {
    if (_logoData) return Promise.resolve(_logoData);
    return fetch(LOGO_PATH).then(r => { if (!r.ok) throw new Error('logo'); return r.blob(); })
      .then(b => new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => { const im = new Image(); im.onload = () => { _logoData = { url: fr.result, w: im.width, h: im.height }; res(_logoData); }; im.onerror = rej; im.src = fr.result; };
        fr.onerror = rej; fr.readAsDataURL(b);
      })).catch(() => null);
  }

  async function buildPdfBlob() {
    await ensureJsPdf();
    const logo = await logoData();
    const jsPDF = window.jspdf.jsPDF;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const s = S.data, m = model();
    const W = 595.28, H = 841.89, ML = 37, MR = W - 37, CW = MR - ML;
    const INK = [22, 24, 28], GRAY = [85, 85, 85], BORDER = [201, 204, 210], LIGHT = [238, 240, 243],
      RED = [179, 52, 26], BRAND = [201, 60, 29], GREEN = [31, 122, 68], AMBER = [160, 108, 0];
    let y = 0;

    function header() {
      let hy = 30;
      if (logo) { const lh = 33, lw = lh * logo.w / logo.h; doc.addImage(logo.url, 'PNG', ML, hy, lw, lh); }
      doc.setTextColor.apply(doc, INK);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      doc.text('ÚTTEKT NR. ' + (s.meta.nr || '—'), MR, hy + 8, { align: 'right' });
      doc.setFontSize(13); doc.text('SKOÐUNARSKÝRSLA', MR, hy + 22, { align: 'right' });
      doc.setTextColor.apply(doc, BRAND); doc.setFontSize(9.5);
      doc.text('BRUNAVIÐVÖRUNARKERFIS', MR, hy + 33, { align: 'right' });
      doc.setDrawColor.apply(doc, INK); doc.setLineWidth(2);
      doc.line(ML, hy + 41, MR, hy + 41);
      y = hy + 52;
    }
    const FOOT_TOP = H - 108;
    function footer() {
      doc.setTextColor.apply(doc, INK);
      const cols = [[ML, 140, s.meta.stadur || ''], [ML + 166, 140, m.dagsFmt], [ML + 332, CW - 332, s.meta.madur || '']];
      const labs = ['Staður', 'Dags.', 'F.h. Brunahólf slökkvitæki ehf.'];
      cols.forEach((c, i) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
        doc.text(String(c[2]), c[0] + c[1] / 2, FOOT_TOP + 10, { align: 'center' });
        doc.setDrawColor(68, 68, 68); doc.setLineWidth(0.7);
        doc.line(c[0], FOOT_TOP + 15, c[0] + c[1], FOOT_TOP + 15);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor.apply(doc, GRAY);
        doc.text(labs[i], c[0] + c[1] / 2, FOOT_TOP + 23, { align: 'center' });
        doc.setTextColor.apply(doc, INK);
      });
      doc.setFontSize(6.5); doc.setTextColor.apply(doc, GRAY); doc.setFont('helvetica', 'normal');
      doc.text(FOOT_1, W / 2, FOOT_TOP + 37, { align: 'center' });
      doc.text(FOOT_2, W / 2, FOOT_TOP + 45, { align: 'center' });
      doc.setDrawColor.apply(doc, BORDER); doc.setLineWidth(0.7);
      doc.line(ML, FOOT_TOP + 52, MR, FOOT_TOP + 52);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor.apply(doc, INK);
      doc.text(FOOT_CO, W / 2, FOOT_TOP + 61, { align: 'center' });
    }
    const LIMIT = FOOT_TOP - 14;
    function newPage() { doc.addPage(); header(); }
    function ensure(h) { if (y + h > LIMIT) newPage(); }

    // tafla-hjálpari: cols=[{w,align}], cells=[{t,bold,color,bg,size}]
    function row(x, cols, cells, opts) {
      opts = opts || {};
      const size = opts.size || 8.6, pad = 4.5, lh = size + 2.6;
      let maxLines = 1;
      const wrapped = cells.map((c, i) => {
        doc.setFont('helvetica', c.bold ? 'bold' : 'normal'); doc.setFontSize(c.size || size);
        const lines = doc.splitTextToSize(String(c.t == null ? '' : c.t), cols[i].w - pad * 2);
        if (lines.length > maxLines) maxLines = lines.length;
        return lines;
      });
      const h = maxLines * lh + pad * 1.6;
      ensure(h); if (opts.keep && y + h > LIMIT) newPage();
      let cx = x;
      cells.forEach((c, i) => {
        const cw = cols[i].w;
        if (c.bg) { doc.setFillColor.apply(doc, c.bg); doc.rect(cx, y, cw, h, 'F'); }
        doc.setDrawColor.apply(doc, BORDER); doc.setLineWidth(0.7);
        doc.rect(cx, y, cw, h, 'S');
        doc.setFont('helvetica', c.bold ? 'bold' : 'normal'); doc.setFontSize(c.size || size);
        doc.setTextColor.apply(doc, c.color || (c.bg && c.bg === INK ? [255, 255, 255] : INK));
        const align = cols[i].align || 'left';
        const tx = align === 'center' ? cx + cw / 2 : align === 'right' ? cx + cw - pad : cx + pad;
        wrapped[i].forEach((ln, li) => doc.text(ln, tx, y + pad + size * 0.85 + li * lh, { align }));
        cx += cw;
      });
      y += h;
      return h;
    }
    function title(t, topGap) {
      ensure(24); y += (topGap == null ? 12 : topGap);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor.apply(doc, INK);
      doc.text(t.toUpperCase(), ML, y + 8); y += 12;
    }

    header();

    // kúnnablokk
    doc.setFontSize(9.5);
    [['Viðskiptavinur', m.custLine], ['Umbeðið af', s.customer.umbedid], ['Tengiliður á verkstað', s.customer.tengi],
     ['Aðsetur', s.customer.heimili], ['Dags. skoðunar', m.dagsFmt]].forEach(r => {
      if (!r[1]) return;
      doc.setFont('helvetica', 'normal'); doc.setTextColor.apply(doc, GRAY);
      doc.text(r[0] + ':', ML, y + 8);
      doc.setFont('helvetica', 'bold'); doc.setTextColor.apply(doc, INK);
      doc.text(String(r[1]), ML + 118, y + 8); y += 13;
    });
    y += 8;

    // búnaðartafla
    const bunCols = [{ w: CW - 290 }, { w: 70, align: 'center' }, { w: 70, align: 'center' }, { w: 80, align: 'center' }, { w: 70, align: 'center' }];
    row(ML, bunCols, [{ t: 'BÚNAÐUR', bold: true, bg: INK, color: [255, 255, 255], size: 8 },
      { t: 'SAMTALS', bold: true, bg: INK, color: [255, 255, 255], size: 8 }, { t: 'Í LAGI', bold: true, bg: INK, color: [255, 255, 255], size: 8 },
      { t: 'EKKI Í LAGI', bold: true, bg: INK, color: [255, 255, 255], size: 8 }, { t: 'VANTAR', bold: true, bg: INK, color: [255, 255, 255], size: 8 }]);
    m.bunRows.filter(r => !r.hidden).forEach(r => row(ML, bunCols, [
      { t: r.label, bold: true }, { t: r.samtals, bold: true },
      { t: r.iLagi, color: GREEN }, { t: r.ekki, bold: r.ekki > 0, color: r.ekki > 0 ? RED : INK },
      { t: r.vantar, bold: r.vantar > 0, color: r.vantar > 0 ? AMBER : INK }]));

    // tveir dálkar: hljóð+rafhl vinstri, aðalstöð hægri — teiknum í röð með eigin y
    const yTop = y + 6;
    const colW = (CW - 16) / 2, LX = ML, RX = ML + colW + 16;

    // vinstri
    y = yTop;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor.apply(doc, INK);
    doc.text('HLJÓÐSTYRKSMÆLINGAR', LX, y + 8); y += 12;
    const hlCols = [{ w: colW - 128 }, { w: 46, align: 'center' }, { w: 36, align: 'center' }, { w: 46, align: 'center' }];
    row(LX, hlCols, [{ t: 'MÆLING', bold: true, bg: LIGHT, size: 7.5 }, { t: 'HLJÓÐST. (dB)', bold: true, bg: LIGHT, size: 7.5 },
      { t: 'Í LAGI', bold: true, bg: LIGHT, size: 7.5 }, { t: 'EKKI Í LAGI', bold: true, bg: LIGHT, size: 7.5 }], { size: 7.5 });
    s.hljod.forEach(h => row(LX, hlCols, [{ t: h.label, size: 8 }, { t: h.db === '' ? '—' : h.db, size: 8 },
      { t: h.st === 'ok' ? 'x' : '', bold: true, size: 8 }, { t: h.st === 'fail' ? 'x' : '', bold: true, color: RED, size: 8 }], { size: 8 }));
    y += 10;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text('RAFHLÖÐUMÆLINGAR', LX, y + 8); y += 12;
    const rfCols = [{ w: colW * 0.62 }, { w: colW * 0.38, align: 'right' }];
    [['Stærð rafhlaðna', s.raf.staerd || '—'], ['Ástimpluð rýmd rafhlaðna', m.rafShow.rymd], ['Mæld rýmd rafhlaðna', m.rafShow.maeld],
     ['Árgerð rafhlaðna', m.rafShow.argerd], ['Spenna eftir prófun', m.rafShow.spenna], ['Straumdráttur í rafmagnsleysi (i1)', m.rafShow.i1],
     ['Straumdráttur í útkalli (i2)', m.rafShow.i2], ['Lágmarks ending', m.rafShow.ending], ['Áætluð ending', m.rafShow.aaetlud],
     ['Lágmarks rýmd rafhlaðna', m.rafShow.lag]].forEach((r, ix, arr) =>
      row(LX, rfCols, [{ t: r[0], color: GRAY, size: 8 }, { t: r[1], bold: true, size: 8, color: (ix === arr.length - 1 && m.rafOk === false) ? RED : INK }], { size: 8 }));
    const leftEnd = y;

    // hægri
    y = yTop;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor.apply(doc, INK);
    doc.text('AÐALSTÖÐ: ' + m.gerdUpper, RX, y + 8); y += 12;
    const stCols = [{ w: colW * 0.6 }, { w: colW * 0.2, align: 'center' }, { w: colW * 0.2, align: 'center' }];
    row(RX, [{ w: colW * 0.6 }, { w: colW * 0.4, align: 'center' }], [{ t: 'Fjöldi rása/slaufa', color: GRAY, size: 8 }, { t: s.stod.fjoldi || '—', bold: true, size: 8 }], { size: 8 });
    row(RX, stCols, [{ t: '', bg: LIGHT, size: 7.5 }, { t: 'Í LAGI', bold: true, bg: LIGHT, size: 7.5 }, { t: 'EKKI Í LAGI', bold: true, bg: LIGHT, size: 7.5 }], { size: 7.5 });
    s.stod.checks.forEach(c => row(RX, stCols, [{ t: c.label, size: 8 },
      { t: c.st === 'ok' ? 'x' : '', bold: true, size: 8 }, { t: c.st === 'fail' ? 'x' : '', bold: true, color: RED, size: 8 }], { size: 8 }));
    y += 8;
    [['Heiti fjargæsluaðila', s.stod.fjargaesla || '—'], ['Tegund búnaðar', s.stod.tegund || '—'], ['Yfirlitsmynd teiknuð af', s.stod.teiknud || '—']]
      .forEach(r => row(RX, [{ w: colW * 0.5 }, { w: colW * 0.5 }], [{ t: r[0], color: GRAY, size: 8 }, { t: r[1], bold: true, size: 8 }], { size: 8 }));
    y = Math.max(leftEnd, y);

    // athugasemdir + ábendingar á nýrri síðu (eins og skýrslan)
    if (m.hasNextPage) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor.apply(doc, GRAY);
      ensure(16); doc.text('Athugasemdir og ábendingar á næstu síðu', ML, y + 12);
      newPage();
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor.apply(doc, INK);
      doc.text('ATHUGASEMDIR OG ÁBENDINGAR', ML, y + 10); y += 20;
      m.athGroups.forEach(g => {
        ensure(38);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor.apply(doc, INK);
        doc.text(g.fl, ML, y + 8); y += 11;
        if (g.isHljod) {
          const cols = [{ w: CW * 0.22 }, { w: CW * 0.12, align: 'center' }, { w: CW * 0.66 }];
          row(ML, cols, [{ t: 'TEGUND MÆLINGAR', bold: true, bg: LIGHT, size: 7.5 }, { t: 'HLJÓÐST. (dB)', bold: true, bg: LIGHT, size: 7.5 }, { t: 'LÝSING', bold: true, bg: LIGHT, size: 7.5 }], { size: 7.5 });
          g.rows.forEach(a => row(ML, cols, [{ t: a.teg, size: 8 }, { t: a.numer, bold: true, size: 8 }, { t: a.lysing, size: 8 }], { size: 8 }));
        } else {
          const cols = [{ w: CW * 0.09, align: 'center' }, { w: CW * 0.09, align: 'center' }, { w: CW * 0.22 }, { w: CW * 0.6 }];
          row(ML, cols, [{ t: 'NÚMER', bold: true, bg: LIGHT, size: 7.5 }, { t: 'SVÆÐI', bold: true, bg: LIGHT, size: 7.5 }, { t: 'ATHUGASEMD', bold: true, bg: LIGHT, size: 7.5 }, { t: 'LÝSING', bold: true, bg: LIGHT, size: 7.5 }], { size: 7.5 });
          g.rows.forEach(a => row(ML, cols, [{ t: a.numer, size: 8 }, { t: a.svaedi, size: 8 }, { t: a.teg, bold: true, size: 8 }, { t: a.lysing, size: 8 }], { size: 8 }));
        }
        y += 8;
      });
      if (m.abendList.length) {
        ensure(26);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor.apply(doc, INK);
        doc.text('Ábendingar', ML, y + 8); y += 12;
        m.abendList.forEach(t => {
          doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
          const lines = doc.splitTextToSize(t, CW - 14);
          const h = lines.length * 11 + 4; ensure(h);
          doc.setTextColor.apply(doc, BRAND); doc.setFont('helvetica', 'bold');
          doc.text('•', ML, y + 8);
          doc.setTextColor.apply(doc, INK); doc.setFont('helvetica', 'normal');
          lines.forEach((ln, li) => doc.text(ln, ML + 12, y + 8 + li * 11));
          y += h;
          doc.setDrawColor.apply(doc, LIGHT); doc.setLineWidth(0.5);
          doc.line(ML, y, MR, y); y += 2;
        });
      }
    }

    // fótur á allar síður
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) { doc.setPage(p); footer(); }
    return doc.output('blob');
  }

  // ── vistun ──────────────────────────────────────────────────────────────────
  function yearOf() { const m = String(S.data.meta.dags || '').match(/^(\d{4})/); return m ? +m[1] : new Date().getFullYear(); }

  function scheduleAutosave() {
    clearTimeout(_autoT);
    // localStorage-spegill strax (netlausir kjallarar) …
    try { localStorage.setItem('bks_mirror', JSON.stringify({ coId: S.co.id, id: S.id, t: Date.now(), data: S.data })); } catch (_) {}
    // … og Supabase eftir 2,5s ró
    _autoT = setTimeout(async () => {
      try { await saveDraft(); savedNote('· vistað ✓'); } catch (e) { savedNote('· vistun mistókst (reynt aftur)'); }
    }, 2500);
  }

  async function saveDraft() {
    const sb = SB(); if (!sb) throw new Error('engin gagnabankatenging');
    const rec = { fyrirtaeki_id: S.co.id, year: yearOf(), uttekt_nr: S.data.meta.nr || null,
      status: S.status || 'draft', data: S.data, updated_at: new Date().toISOString() };
    if (S.id) {
      const r = await sb.from('brunakerfi_skyrslur').update(rec).eq('id', S.id);
      if (r.error) throw r.error;
    } else {
      const r = await sb.from('brunakerfi_skyrslur').insert(rec).select('id').single();
      if (r.error) throw r.error;
      S.id = r.data.id;
    }
    _dirty = false; _reports = null;
    try { localStorage.removeItem('bks_mirror'); } catch (_) {}
  }

  async function finalize(btn) {
    const sb = SB(); if (!sb) return toast('Engin gagnabankatenging', true);
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Bý til PDF…'; }
    try {
      S.status = 'final';
      await saveDraft();
      const pdf = await buildPdfBlob();
      const ktd = String(S.data.customer.kt || '').replace(/\D/g, '');
      const fname = [S.co.nafn, ktd, yearOf(), 'brunakerfi-skoðunarskýrsla'].filter(Boolean).join(' - ') + '.pdf';
      const safe = String(S.data.meta.nr || 'skyrsla').replace(/[^\w\-]+/g, '_');
      const path = FOLDER + '/' + S.co.id + '/' + yearOf() + '_' + safe + '_' + Date.now() + '.pdf';
      const up = await sb.storage.from(BUCKET).upload(path, pdf, { contentType: 'application/pdf', upsert: true });
      if (up.error) throw up.error;
      const docRec = { doc_type: 'brunakerfi', fyrirtaeki_id: S.co.id, year: yearOf(),
        storage_path: BUCKET + '/' + path, doc_date: S.data.meta.dags || null,
        customer_name: S.co.nafn || null, source: 'app', found_by: 'skyrsla-form',
        notes: 'Skoðunarskýrsla ' + (S.data.meta.nr || '') + ' — ' + fname };
      const firstFinal = !S.docId;
      if (S.docId) {
        const r = await sb.from('customer_documents').update(docRec).eq('id', S.docId);
        if (r.error) throw r.error;
      } else {
        const r = await sb.from('customer_documents').insert(docRec).select('id').single();
        if (r.error) throw r.error;
        S.docId = r.data.id;
        await sb.from('brunakerfi_skyrslur').update({ doc_id: S.docId }).eq('id', S.id);
      }
      // Skjalaspjaldið (199) endurteiknar sig strax (2026-08-09).
      document.dispatchEvent(new CustomEvent('customer-doc-written'));
      // Skýrslan LÍKA í skýrsludálk ársins (Skjöl & viðhengi / Kröfu yfirlit,
      // patch 111/199) — noMark: EKKI merkja slökkvitækja-ársskoðunina.
      // Aðeins við fyrstu lokun (annars tvítekningar í dálknum).
      if (firstFinal && window.CompanyAttachments && CompanyAttachments.upload) {
        try {
          // 2026-07-29: kind var 'skyrsla' — SAMA tegund og slökkvitækja-
          // úttektarskýrslan notar — svo brunaskýrslan lenti í úttektarskýrslu-
          // reit ársins á skjalaspjaldinu (patch 199) og leit út eins og
          // slökkvitækjaskoðun ársins væri frágengin. Eigin tegund heldur
          // þjónustunum tveimur aðskildum. `noMark` stendur áfram: brunaskoðun
          // má aldrei merkja slökkvitækja-ársskoðunina búna.
          await CompanyAttachments.upload(S.co.id, new File([pdf], fname, { type: 'application/pdf' }),
            { year: yearOf(), kind: 'brunakerfi', noMark: true });
        } catch (e) { console.warn('[bks] grid attach', e); }
      }
      // 🧾 Sjálfvirk reikningsdrög við LOKIÐ (patch 291) — fire-and-forget:
      // stöðvar ALDREI lokunina þótt reikningsstofnun mistakist. Idempotent
      // (291 finnur fyrirliggjandi brunakerfi-reikning félagsins fyrir árið).
      try {
        if (window.BrunakerfiReikningur && BrunakerfiReikningur.onFinal) {
          const mInv = model();
          BrunakerfiReikningur.onFinal({
            co: S.co, year: yearOf(),
            nr: (S.data.meta && S.data.meta.nr) || '',
            dags: (S.data.meta && S.data.meta.dags) || '',
            madur: (S.data.meta && S.data.meta.madur) || '',
            linur: mInv.linur, autoLinur: autoVerdLines(),
            verdTotal: mInv.verdTotal, verdGross: mInv.verdGross,
            saleId: (S.data.verd && S.data.verd.sale_id) || null,
            saleNum: (S.data.verd && S.data.verd.sale_num) || null,
            linkSale: async row => {
              if (!S || !S.data) return;
              S.data.verd = S.data.verd || { linur: [] };
              S.data.verd.sale_id = row.id; S.data.verd.sale_num = row.num;
              markDirty(); try { await saveDraft(); } catch (_) {}
            }
          });
        }
      } catch (e) { console.warn('[bks] auto-reikningsdrög', e); }
      toast('PDF vistað á fyrirtækið — græni punkturinn kviknar í yfirlitinu ✓');
      setMode('report');
      try { if (window.BrunakerfiYfirlit && BrunakerfiYfirlit.reload) BrunakerfiYfirlit.reload(); } catch (_) {}
    } catch (e) {
      console.warn('[bks] finalize', e);
      S.status = 'draft';
      toast('Villa við vistun: ' + (e.message || e), true);
    }
    if (btn) { btn.disabled = false; btn.textContent = '✅ Ljúka & vista PDF'; }
  }

  async function closeOverlay() {
    clearTimeout(_autoT);
    if (_dirty && S) { try { await saveDraft(); toast('Drög vistuð sjálfkrafa ✓'); } catch (e) { console.warn('[bks] autosave', e); } }
    const ov = document.getElementById('_bks-overlay'); if (ov) ov.style.display = 'none';
    document.body.style.overflow = '';
    try { if (window.BrunakerfiYfirlit && BrunakerfiYfirlit.reload) BrunakerfiYfirlit.reload(); } catch (_) {}
  }

  // ── opnun ───────────────────────────────────────────────────────────────────
  async function nextNr() {
    try {
      const r = await SB().from('brunakerfi_skyrslur').select('id', { count: 'exact', head: true });
      return String(new Date().getFullYear()).slice(-2) + '-' + String(1 + (r.count || 0)).padStart(4, '0');
    } catch (_) { return String(new Date().getFullYear()).slice(-2) + '-' + String(Date.now()).slice(-4); }
  }
  async function fetchCo(coId) {
    const sb = SB(); if (!sb) return null;
    const r = await sb.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,simi,farsimi,netfang,"tengiliður"').eq('id', coId).single();
    return (r && r.data) || null;
  }

  function openForm(co, existing) {
    let data = existing ? migrate(existing.data, co) : null;
    if (data && !data.meta) data = null;
    if (data && !data.verd) data.verd = { linur: [] };
    if (data && !data.cNew) data.cNew = { fl: 'Reykskynjarar', numer: '', svaedi: '', teg: 'Vantar', lysing: '' };
    S = { id: existing ? existing.id : null, docId: existing ? (existing.doc_id || null) : null,
      co, status: existing ? existing.status : 'draft', data };
    _dirty = false;
    const ov = ensureOverlay();
    ov.style.display = 'block';
    document.body.style.overflow = 'hidden';
    const go = () => { renderTop(); renderWork(); setMode('work'); savedNote(''); };
    if (S.data) go();
    else nextNr().then(nr => { S.data = blank(co, nr); go(); });
  }

  async function openFlow(coId) {
    const sb = SB(); if (!sb) return;
    let co = null, reports = [];
    try {
      const [c, r] = await Promise.all([
        fetchCo(coId),
        sb.from('brunakerfi_skyrslur').select('id,year,uttekt_nr,status,doc_id,data,updated_at').eq('fyrirtaeki_id', coId).order('updated_at', { ascending: false })
      ]);
      co = c; reports = (r && r.data) || [];
    } catch (e) { console.warn('[bks] openFlow', e); }
    if (!co) { toast('Fann ekki fyrirtækið', true); return; }
    // netlaus spegill nýrri en gagnagrunnurinn? bjóða endurheimt
    try {
      const mir = JSON.parse(localStorage.getItem('bks_mirror') || 'null');
      if (mir && mir.coId === coId && mir.data) {
        const dbRow = mir.id ? reports.find(x => x.id === mir.id) : null;
        const dbT = dbRow ? new Date(dbRow.updated_at).getTime() : 0;
        if (mir.t > dbT + 5000 && confirm('Ókláruð drög fundust á þessu tæki (vistuðust ekki á netið). Halda áfram með þau?')) {
          openForm(co, { id: mir.id, doc_id: dbRow ? dbRow.doc_id : null, status: 'draft', data: mir.data });
          _dirty = true; scheduleAutosave();
          return;
        }
      }
    } catch (_) {}
    if (!reports.length) { openForm(co, null); return; }
    picker(co, reports);
  }

  function picker(co, reports) {
    let p = document.getElementById('_bks-picker'); if (p) p.remove();
    p = document.createElement('div'); p.id = '_bks-picker';
    p.style.cssText = 'position:fixed;inset:0;z-index:9400;background:rgba(8,12,20,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    const st = s => s === 'final'
      ? '<span style="padding:2px 9px;border-radius:99px;background:#dcf1e4;color:#166b3a;font-size:10.5px;font-weight:800">LOKIÐ</span>'
      : '<span style="padding:2px 9px;border-radius:99px;background:#fdf3d7;color:#8a6100;font-size:10.5px;font-weight:800">DRÖG</span>';
    p.innerHTML =
      '<div style="background:#fff;border-radius:14px;max-width:520px;width:100%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.4);font-family:-apple-system,\'Segoe UI\',Helvetica,Arial,sans-serif">' +
        '<div style="background:#141619;color:#fff;padding:13px 16px;border-radius:14px 14px 0 0;display:flex;justify-content:space-between;align-items:center">' +
          '<div><div style="font-weight:800;font-size:14.5px">' + esc(co.nafn) + '</div>' +
          '<div style="font-size:11px;color:#8b93a1">Skoðunarskýrslur brunakerfis</div></div>' +
          '<button type="button" id="_bks-p-x" style="background:none;border:0;color:#8b93a1;font-size:20px;cursor:pointer;padding:4px 8px">✕</button></div>' +
        '<div style="padding:14px 16px">' +
          reports.map(r =>
            '<div style="display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid #eef0f3">' +
              st(r.status) +
              '<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:13.5px">Úttekt ' + esc(r.uttekt_nr || '—') + ' · ' + esc(r.year || '') + '</div>' +
              '<div style="font-size:11px;color:#8b93a1">breytt ' + esc(String(r.updated_at || '').slice(0, 10)) + '</div></div>' +
              '<button type="button" data-open="' + r.id + '" style="padding:7px 14px;border-radius:8px;border:0;background:#2a78d6;color:#fff;font-size:12.5px;font-weight:700;cursor:pointer">Opna</button>' +
              (r.status !== 'final' ? '<button type="button" data-del="' + r.id + '" style="width:32px;height:32px;border-radius:8px;border:1px solid #efb9ab;background:#fff;color:#c93c1d;font-weight:800;cursor:pointer">🗑</button>' : '') +
            '</div>').join('') +
          '<button type="button" id="_bks-p-new" style="margin-top:14px;width:100%;padding:12px;border-radius:10px;border:0;background:#1f8a4c;color:#fff;font-size:14px;font-weight:800;cursor:pointer">＋ Ný skoðunarskýrsla</button>' +
        '</div></div>';
    document.body.appendChild(p);
    const close = () => p.remove();
    p.addEventListener('click', e => { if (e.target === p) close(); });
    p.querySelector('#_bks-p-x').addEventListener('click', close);
    p.querySelector('#_bks-p-new').addEventListener('click', () => { close(); openForm(co, null); });
    p.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
      const r = reports.find(x => x.id === b.dataset.open); close(); openForm(co, r);
    }));
    p.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Eyða þessum drögum?')) return;
      try { await SB().from('brunakerfi_skyrslur').delete().eq('id', b.dataset.del); } catch (_) {}
      _reports = null; close(); openFlow(co.id);
    }));
  }

  // ── „📋 Skýrsla"-hnappur + hlekkja-lagfæring á yfirlitið (272) ─────────────
  async function loadReportIndex() {
    if (_reports && Date.now() - _repAt < 60000) return _reports;
    try {
      const sb = SB(); if (!sb) return {};
      const r = await sb.from('brunakerfi_skyrslur').select('fyrirtaeki_id,status');
      const m = {};
      ((r && r.data) || []).forEach(x => {
        const o = m[x.fyrirtaeki_id] || (m[x.fyrirtaeki_id] = { draft: 0, final: 0 });
        o[x.status === 'final' ? 'final' : 'draft']++;
      });
      _reports = m; _repAt = Date.now();
    } catch (_) { _reports = _reports || {}; }
    return _reports;
  }

  // „🏷 Verðlisti"-hnappur í síu-röð yfirlitsins — sami ritill og í forminu;
  // skýrslurnar sækja sjálfgefin verð í ÞENNAN lista (app_settings).
  function injectListButton(root) {
    if (root.querySelector('#_bks-vl-btn')) return;
    const chips = root.querySelectorAll('._bky-filter');
    const last = chips[chips.length - 1];
    if (!last || !last.parentNode) return;
    const b = document.createElement('button');
    b.id = '_bks-vl-btn'; b.type = 'button';
    b.textContent = '🏷 Verðlisti';
    b.title = 'Verðlisti brunakerfis-skoðana — skýrslurnar sækja sjálfgefin verð hingað';
    b.style.cssText = 'padding:6px 12px;border-radius:99px;border:1px solid #cbd5e1;background:#fff;color:#334155;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer';
    b.addEventListener('click', () => openPriceEditor(null));
    last.parentNode.insertBefore(b, last.nextSibling);
  }

  function decorate() {
    const root = document.getElementById('_bky-root'); if (!root) return;
    injectListButton(root);
    // 2026-08-14 (ósk Agnars, skjáskot): „📋 Skýrsla"-hnappurinn af listaröðunum
    // — röðin sjálf opnar fyrirtækjasíðuna þar sem skýrsluflæðið er áfram
    // aðgengilegt (og Verðlisti-hnappurinn í hausnum stendur). Hreinsum líka
    // hnappa sem eldri render skildi eftir.
    root.querySelectorAll('tr._bky-row ._bks-btn').forEach(b => b.remove());
    // Eldri HTML-skýrslur í storage þjónast sem text/plain hjá Supabase →
    // beina þeim í /api/skyrsla-proxy. PDF-skjöl opnast beint (engin umskrift).
    root.querySelectorAll('a[href*="/samningar/brunakerfi-skyrslur/"]').forEach(a => {
      const part = (a.getAttribute('href') || '').split('/samningar/')[1];
      if (!part || !/\.html?(\?|$)/i.test(part)) return;
      try { a.href = '/api/skyrsla-proxy?p=' + encodeURIComponent(decodeURIComponent(part)); } catch (_) {}
    });
    // Drive-hlekkir spyrja „Select an account" í hvert sinn í símum með marga
    // Google-reikninga (kvörtun Agnars) → beina á brunahólf /api/skjal sem
    // streymir PDF-inu með server-OAuth, engin innskráning.
    root.querySelectorAll('a[href^="https://drive.google.com/file/d/"]').forEach(a => {
      const m = (a.getAttribute('href') || '').match(/\/file\/d\/([^/?#]+)/);
      if (m) a.href = 'https://brunaholf.netlify.app/api/skjal?id=' + m[1];
    });
  }

  function watch() {
    const v = document.getElementById('view-brunakerfi-yfirlit');
    if (!v) { setTimeout(watch, 900); return; }
    if (v.__bksWatched) return;
    v.__bksWatched = true;
    new MutationObserver(() => decorate()).observe(v, { childList: true, subtree: true });
    decorate();
  }
  function boot() { watch(); setTimeout(watch, 2500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.BrunakerfiSkyrsla = { openFlow, openForm, openPriceEditor };
  console.log('[patch-273] Brunakerfi skoðunarskýrsla v2 (PDF + verð) installed');
})();
/* === END BRUNAKERFI SKOÐUNARSKÝRSLA === */
