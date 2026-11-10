/* === VERÐLISTAR v1 (10.11.2026) ===
 *
 * Agnar 10.11.2026: „Mér vantar auka feature að búa til nýja verðlista fyrir nýjar ársskoðunarþjónustur sem við erum að fara byrja á —
 * Sprinklerkerfi, Neyðarljós, síðan síðar Eldvarnareftirlit, Reyklosun, Hávakerfi, Stigleiðsla. Nýtt verðlagskerfi í svipuðum anda og
 * brunakerfis-verð, en með meiri customize features." (rauðir kassar á skjáskoti: þrír nýir takkar vinstra megin við „Slökkvit. verð").
 *
 * Almennt kerfi — EINN verðlisti = ein færsla í `app_settings.verdlistar[<id>]`, svo bæta má við nýjum lista án nýs kóða:
 *   { id, nafn, takn, litur, lysing, vsk (sjálfgefið 24/11/0), rod, hopar:[{id,heiti}],
 *     lidir:[{id,nafn,verd (án vsk | null),eining,vsk (null = sjálfgefið listans),hopur,ath,virkt,tegund (fast|fra|tilbod)}], u, eytt }
 * `app_settings` er sá staður sem SAMSTILLIR vélarnar (regla 05.09.2026) — aldrei localStorage. Vistun er atómísk (`app_settings_merge`
 * sameinar aðeins lykilinn `verdlistar.<id>`), skrifin í sama lista fara í RÖÐ (ein biðröð á lista) og úreldingarvörður (`u`) neitar að
 * yfirskrifa lista sem önnur vél breytti á meðan glugginn var opinn — listinn er þá endurlesinn og villan sögð (aldrei þögult tap).
 *
 * Customize: heiti · tákn · málmlitur · lýsing · sjálfgefinn vsk · afrit/eyða(mjúk)/endurheimta · röð takka; HÓPAR (bæta við, endurnefna, raða, eyða);
 * LIÐIR: heiti · verð (fast / frá / samkv. tilboði) · eining · vsk á lið · hópur · athugasemd · virkur/óvirkur · röðun ▲▼;
 * VERKFÆRI: % breyting á verðum (+ rúnnun) · líma inn úr Excel · CSV út · síun · sýna óvirka;
 * TILBOÐ: magn + afsláttur á línu → prenta tilboð eða setja línurnar í körfu í Sölu (disc_pct, aldrei bæði baked og afslattur).
 *
 * Takkarnir bætast vinstra megin í „Vörur og þjónusta" (vorur.js á röðina, 469 á útlit hinna). Þessi pappi á aðeins sína takka og gluggana.
 * API: window.Verdlistar = { opna(id), listi(), get(id), lidir(id, {adeinsVirka}), nyr() }  ·  event `verdlistar-breytt` á document.
 * Seinna: úttektir (Sprinkler/Neyðarljós) lesa verðin úr Verdlistar.lidir(id).
 */
(() => {
  'use strict';
  if (window.Verdlistar) return;

  const P = 'vl5';
  const KEY = 'verdlistar';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  const SILFUR = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const GRAENN = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';

  // málmarnir eru þeir sömu og á hinum takkunum (469) + þrír nýir
  const LITIR = {
    blar:      ['Blár',        'linear-gradient(145deg,#02060f 0%,#0a1a3a 22%,#183363 45%,#2a4c8f 53%,#0e2147 74%,#03070f 100%)', '#020611'],
    ljosblar:  ['Ljósblár',    'linear-gradient(145deg,#02090f 0%,#0a2a3e 22%,#155a7d 45%,#2a86b5 53%,#0f3d57 74%,#03090f 100%)', '#02111a'],
    teal:      ['Blágrænn',    'linear-gradient(145deg,#010b0b 0%,#04302f 22%,#0a5b58 45%,#14817c 53%,#06403d 74%,#010b0b 100%)', '#010808'],
    graenn:    ['Grænn',       GRAENN, 'rgba(52,168,98,.45)'],
    raudur:    ['Rauður',      'linear-gradient(145deg,#080001 0%,#260304 22%,#4a0809 45%,#6c0d10 53%,#2a0304 74%,#080001 100%)', '#0a0102'],
    appelsina: ['Gulbrúnn',    'linear-gradient(145deg,#120700 0%,#40200a 22%,#8a4510 45%,#c9701c 53%,#5a2c08 74%,#120700 100%)', '#120700'],
    gull:      ['Gull',        'linear-gradient(145deg,#0f0a02 0%,#2e2004 22%,#6b4a0c 45%,#9c7420 53%,#3a2806 74%,#0f0a02 100%)', '#120c02'],
    fjola:     ['Fjólublár',   'linear-gradient(145deg,#0b0414 0%,#2a0f45 22%,#4d1f80 45%,#6c33ad 53%,#31145a 74%,#0b0414 100%)', '#080310'],
    grafit:    ['Grafít',      'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)', '#000']
  };
  const EININGAR = ['stk', 'klst', 'm', 'fm', 'm²', 'kerfi', 'ferð', 'skoðun', 'mán.', 'ár', '%'];
  const TEGUNDIR = [['fast', 'fast'], ['fra', 'frá'], ['tilbod', 'tilboð']];
  const VSK_VAL = [24, 11, 0];
  const TAKN_VAL = ['💦', '💡', '🔥', '🧯', '🚨', '🛠', '📋', '🏢', '⚡', '🔔', '🧪', '🪜', '💨', '📢'];
  const HOPAR_STOFN = () => [{ id: 'skodun', heiti: 'Skoðun' }, { id: 'vinna', heiti: 'Vinna og akstur' }, { id: 'efni', heiti: 'Varahlutir og efni' }];
  // Listar sem eru til frá byrjun (Agnar 10.11.2026). Þeir bíða í kóðanum þar til fyrsta breyting vistar þá á þjóninn — ekkert skrifað við hleðslu.
  const STOFN = [
    { id: 'sprinkler',  nafn: 'Sprinklerkerfi', takn: '💦', litur: 'teal',      lysing: 'Árleg skoðun og þjónusta sprinklerkerfa', vsk: 24, rod: 10 },
    { id: 'neydarljos', nafn: 'Neyðarljós',     takn: '💡', litur: 'appelsina', lysing: 'Skoðun og þjónusta neyðarlýsingar og útljósa', vsk: 24, rod: 20 }
  ];

  // ── hjálparföll ─────────────────────────────────────────────────────────────────────────────────────────────
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tala = v => { const s = String(v == null ? '' : v).replace(/\s/g, '').replace(/\.(?=\d{3}(?:[.,]|$))/g, '').replace(',', '.'); if (s === '') return null; const n = parseFloat(s); return isFinite(n) ? n : null; };
  const pun = n => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');   // toLocaleString('is-IS') fellur stundum í en-US
  const verdInn = n => n == null ? '' : (Number.isInteger(n) ? pun(n) : String(n).replace('.', ','));
  const kr = n => pun(n) + ' kr';
  const krN = n => verdInn(Math.round((Number(n) || 0) * 100) / 100) + ' kr';   // einingaverð með tugabroti (52.500,5), ekki rúnnað
  const klona = o => JSON.parse(JSON.stringify(o));
  const nyId = pf => pf + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const sl = ms => new Promise(r => setTimeout(r, ms));
  const toast = t => { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };
  const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/ö/g, 'o');
  async function spyrja(texti, opts) {
    if (window.Confirm && Confirm.show) return await Confirm.show(texti, opts);
    return window.confirm(texti);
  }
  const mvskTala = (an, vsk) => (Number(an) || 0) * (1 + (Number(vsk) || 0) / 100);

  // ── gögn ────────────────────────────────────────────────────────────────────────────────────────────────────
  function normLid(x, hopaIdar) {
    const o = x || {};
    const v = o.verd == null || o.verd === '' ? null : Number(o.verd);
    return {
      id: String(o.id || nyId('i')),
      nafn: String(o.nafn || ''),
      verd: v != null && isFinite(v) ? v : null,
      eining: EININGAR.indexOf(o.eining) >= 0 ? o.eining : 'stk',
      vsk: o.vsk == null || o.vsk === '' ? null : (VSK_VAL.indexOf(Number(o.vsk)) >= 0 ? Number(o.vsk) : null),
      hopur: hopaIdar.indexOf(o.hopur) >= 0 ? o.hopur : hopaIdar[0],
      ath: String(o.ath || ''),
      virkt: o.virkt !== false,
      tegund: ['fast', 'fra', 'tilbod'].indexOf(o.tegund) >= 0 ? o.tegund : 'fast'
    };
  }
  function normListi(l, id) {
    const hopar = (Array.isArray(l.hopar) && l.hopar.length ? l.hopar : HOPAR_STOFN()).map(h => ({ id: String(h.id || nyId('h')), heiti: String(h.heiti || '') }));
    const idar = hopar.map(h => h.id);
    return {
      id: String(id || l.id),
      nafn: String(l.nafn || 'Nýr verðlisti'),
      takn: String(l.takn || '📋'),
      litur: LITIR[l.litur] ? l.litur : 'grafit',
      lysing: String(l.lysing || ''),
      vsk: VSK_VAL.indexOf(Number(l.vsk)) >= 0 ? Number(l.vsk) : 24,
      rod: Number(l.rod) || 1000,
      hopar: hopar,
      lidir: (Array.isArray(l.lidir) ? l.lidir : []).map(x => normLid(x, idar)),
      eytt: !!l.eytt,
      u: String(l.u || '')
    };
  }
  const thjonn = () => (window.AppSettings && AppSettings.path && AppSettings.path(KEY)) || {};
  function allir(medEyddum) {
    const srv = thjonn(), m = {};
    STOFN.forEach(d => { m[d.id] = normListi(Object.assign({ hopar: HOPAR_STOFN(), lidir: [] }, d), d.id); });
    Object.keys(srv).forEach(id => { if (srv[id] && typeof srv[id] === 'object') m[id] = normListi(srv[id], id); });
    return Object.keys(m).map(k => m[k]).filter(l => medEyddum || !l.eytt).sort((a, b) => (a.rod - b.rod) || a.nafn.localeCompare(b.nafn, 'is'));
  }
  const lista = id => allir(true).filter(l => l.id === id)[0] || null;

  let _virkur = null;                 // opinn listi
  const _grunn = {};                  // id → u eins og glugginn las hann (úreldingarvörður)
  const _ko = {};                     // id → loforð: skrif í sama lista fara í RÖÐ (annars glatast fyrra skrifið)
  let _sia = '', _synaOvirk = false, _tilbod = false, _tb = {}, _tbTil = '', _tbAth = '';

  function atburdur() { try { document.dispatchEvent(new CustomEvent('verdlistar-breytt')); } catch (_) {} schedule(); }

  // Eitt skrif: lesa ferskt → bera `u` saman við það sem glugginn las → breyta afriti → vista. Úrelt = ekkert vistað, villan sögð.
  async function vistaEitt(id, mut) {
    try { if (window.AppSettings && AppSettings.load) await AppSettings.load(); } catch (_) {}
    const cur = lista(id);
    if (!cur) return { ok: false, villa: 'Listinn fannst ekki' };
    if (_grunn[id] && cur.u && cur.u !== _grunn[id]) return { ok: false, utrelt: true };
    const nytt = klona(cur);
    const r = mut(nytt);
    if (r === false) return { ok: false, villa: 'Engin breyting' };
    nytt.u = new Date().toISOString();
    if (!window.AppSettings || !AppSettings.save) return { ok: false, villa: 'Vistun er ekki tiltæk' };
    const ok = await AppSettings.save({ [KEY]: { [id]: nytt } });
    if (!ok) return { ok: false, villa: 'Vistun mistókst — geymt og reynt aftur' };
    _grunn[id] = nytt.u;
    atburdur();
    return { ok: true, listi: nytt };
  }
  function vista(id, mut) {
    const p = (_ko[id] || Promise.resolve()).then(() => vistaEitt(id, mut));
    _ko[id] = p.catch(() => {});
    return p;
  }
  async function vistaNyjan(l) {   // nýr listi: ekkert til að bera saman við
    l.u = new Date().toISOString();
    if (!window.AppSettings || !AppSettings.save) return false;
    const ok = await AppSettings.save({ [KEY]: { [l.id]: l } });
    if (ok) { _grunn[l.id] = l.u; atburdur(); }
    return ok;
  }

  // ── útlit ──────────────────────────────────────────────────────────────────────────────────────────────────
  function stilar() {
    if (document.getElementById(P + '-stil')) return;
    const st = document.createElement('style'); st.id = P + '-stil';
    const mt = (b, r) => 'background:' + b + '!important;background-image:' + b + '!important;border:1px solid ' + r + '!important;border-radius:9px!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.6)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 8px rgba(0,0,0,.45)!important;font-family:' + SANS + '!important;font-weight:700!important;font-size:12.5px!important;padding:9px 14px!important;cursor:pointer;display:inline-flex;align-items:center;gap:6px';
    const SEL = 'html body #view-vorur .page-title__tools:not(#_vl5a):not(#_vl5b):not(#_vl5c) ';
    const inp = 'height:30px;box-sizing:border-box;padding:0 9px;font-family:' + SANS + ';font-size:13px;color:#141822;background:#eef1f6;border:1px solid rgba(20,24,34,.14);border-radius:6px;box-shadow:inset 0 2px 5px rgba(0,0,0,.12)';
    const takki = 'height:30px;padding:0 12px;border-radius:5px;border:1px solid rgba(20,24,34,.16);background:' + SILFUR + ';color:#1f2530;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);font-family:' + SANS + ';font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap';
    st.textContent = [
      // takkarnir í röðinni (þrír vinstra megin við Slökkvit. verð)
      SEL + '.' + P + '-takki{' + mt('var(--vl5-bg)', 'var(--vl5-rond)') + '}',
      SEL + '.' + P + '-takki:hover{filter:brightness(1.18)}',
      SEL + '.' + P + '-takki:active{transform:translateY(1px)}',
      SEL + '.' + P + '-ny{' + mt('linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)', 'rgba(20,24,34,.3)') + ';color:#1f2530!important;text-shadow:none!important}',
      // glugginn
      '#' + P + '-bak{position:fixed;inset:0;z-index:12000;background:rgba(8,10,14,.66);display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;overflow:auto;font-family:' + SANS + '}',
      '#' + P + '-gluggi{width:min(1180px,100%);background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 30px 60px -20px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3);overflow:hidden;overflow:clip;font:inherit}',
      '#' + P + '-haus{position:sticky;top:-28px;z-index:3;display:flex;align-items:center;flex-wrap:wrap;gap:8px 12px;padding:12px 26px;background:var(--vl5-bg,#26262c);color:#fff;border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}',
      '#' + P + '-haus::before,#' + P + '-haus::after{content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7);pointer-events:none}',
      '#' + P + '-haus::before{left:9px}#' + P + '-haus::after{right:9px}',
      'html body #' + P + '-haus h2{margin:0;font-family:"Playfair Display",Georgia,serif;font-size:19px;font-weight:800;letter-spacing:-.01em;color:#fff!important;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)}',
      '#' + P + '-haus p{margin:3px 0 0;font-family:' + MONO + ';font-size:11px;letter-spacing:.04em;color:#d5dbe6}',
      '#' + P + '-haus .' + P + '-hn{margin-left:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '#' + P + '-haus .' + P + '-hn button{' + takki + '}',
      '#' + P + '-haus .' + P + '-hn button.on{box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 0 0 2px rgba(31,157,87,.55)}',
      '#' + P + '-haus .' + P + '-hn button:hover{box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 0 0 1px rgba(201,42,42,.35),0 2px 6px rgba(0,0,0,.25)}',
      '#' + P + '-haus .' + P + '-hn #' + P + '-loka{width:32px;padding:0;background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);color:#eef1f4;border:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14)}',
      '#' + P + '-stada{padding:8px 26px;font-size:12.5px;font-weight:700;display:none;font-family:' + MONO + '}',
      '#' + P + '-efni{padding:16px 22px 22px;max-height:calc(100vh - 150px);overflow:auto;background:#f4f6f9}',
      '.' + P + '-verk{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0 0 10px}',
      '.' + P + '-sia{flex:1 1 240px;max-width:340px;' + inp + ';height:32px;border-radius:8px}',
      '.' + P + '-sia:focus{outline:none;border-color:rgba(201,42,42,.55);box-shadow:inset 0 2px 5px rgba(0,0,0,.12),0 0 0 2px rgba(201,42,42,.18);background:#fff}',
      '.' + P + '-fj{font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#3a4250;height:24px;padding:0 9px;display:inline-flex;align-items:center;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILFUR + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12);white-space:nowrap}',
      '.' + P + '-chk{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#3a4250;cursor:pointer;user-select:none}',
      '.' + P + '-t{' + takki + '}',
      '.' + P + '-t:hover{box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 0 0 1px rgba(201,42,42,.35),0 2px 6px rgba(0,0,0,.14)}',
      '.' + P + '-t.graenn{background:' + GRAENN + ';border-color:rgba(52,168,98,.55);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.55)}',
      '.' + P + '-t.haetta{color:#b42318}',
      '.' + P + '-t[disabled]{opacity:.45;pointer-events:none}',
      '.' + P + '-sp{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}',
      '.' + P + '-hopar{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}',
      '.' + P + '-hb{height:24px;padding:0 9px;border-radius:3px;border:1px solid rgba(20,24,34,.16);background:' + SILFUR + ';color:#1f2530;box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12);font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;white-space:nowrap}',
      '.' + P + '-hb span{margin-left:5px;font-weight:500;color:#6b7483}',
      // taflan
      '.' + P + '-tafla{width:100%;border-collapse:separate;border-spacing:0;font-size:13px;background:#fff;border-radius:6px;overflow:hidden;overflow:clip;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)}',
      '.' + P + '-tafla th{position:sticky;top:-16px;z-index:2;text-align:left;font-family:' + MONO + ';font-size:10px;text-transform:uppercase;letter-spacing:.14em;color:#eef1f4;padding:8px 8px;background:linear-gradient(180deg,#2b2f37,#15171c);border-bottom:1px solid #000;font-weight:700;text-shadow:0 1px 1px rgba(0,0,0,.5);white-space:nowrap}',
      '.' + P + '-tafla td{padding:5px 8px;border-bottom:1px solid rgba(20,24,34,.08);vertical-align:middle;color:#1f2530}',
      '.' + P + '-tafla tr.rad:hover td{background:#f7f8fb}',
      '.' + P + '-tafla tr.ovirk td{opacity:.5}',
      '.' + P + '-tafla tr.ovirk:hover td{opacity:.85}',
      '.' + P + '-tafla tr.hopur td{padding:14px 8px 5px;background:#fff;border-bottom:1px solid rgba(20,24,34,.38)}',
      '.' + P + '-tafla tbody tr.hopur:first-child td{padding-top:8px}',
      '.' + P + '-tafla tr.hopur .hh{display:flex;align-items:center;gap:6px}',
      '.' + P + '-tafla tr.tomt td{padding:10px 8px;color:#8f98a8;font-style:italic;font-size:12px}',
      '.' + P + '-r{text-align:right;white-space:nowrap}',
      '.' + P + '-n,.' + P + '-hn2{width:100%;min-width:0;' + inp + ';background:transparent!important;border-color:transparent!important;box-shadow:none!important;font-weight:600;margin-left:-4px}',
      '.' + P + '-hn2{width:auto;flex:0 1 280px;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#3a4250}',
      '.' + P + '-n:hover,.' + P + '-hn2:hover{background:#f4f6f9!important;border-color:rgba(20,24,34,.14)!important}',
      '.' + P + '-n:focus,.' + P + '-hn2:focus{outline:none;background:#fff!important;border-color:rgba(201,42,42,.55)!important;box-shadow:0 0 0 2px rgba(201,42,42,.18)!important}',
      '.' + P + '-verd{width:92px;' + inp + ';text-align:right;font-family:' + MONO + ';font-size:12.5px}',
      '.' + P + '-fl{' + inp + ';height:30px;width:100%;min-width:0;font-size:12.5px}',
      '.' + P + '-ath{width:100%;min-width:0;' + inp + ';background:transparent!important;border-color:transparent!important;box-shadow:none!important;font-size:12px;color:#5b6573}',
      '.' + P + '-ath:hover{background:#f4f6f9!important;border-color:rgba(20,24,34,.14)!important}',
      '.' + P + '-ath:focus{outline:none;background:#fff!important;border-color:rgba(201,42,42,.55)!important;box-shadow:0 0 0 2px rgba(201,42,42,.18)!important}',
      '.' + P + '-n.ok,.' + P + '-verd.ok,.' + P + '-fl.ok,.' + P + '-ath.ok,.' + P + '-hn2.ok{background:#fff!important;border-color:#1f9d57!important;box-shadow:0 0 0 2px rgba(31,157,87,.25)!important}',
      '.' + P + '-n.villa,.' + P + '-verd.villa,.' + P + '-fl.villa,.' + P + '-ath.villa,.' + P + '-hn2.villa{background:#fff!important;border-color:#e0453c!important;box-shadow:0 0 0 2px rgba(224,69,60,.25)!important}',
      '.' + P + '-vc{display:flex;align-items:center;gap:5px;justify-content:flex-end}',
      '.' + P + '-vc .' + P + '-fl{width:64px;padding:0 4px}',
      '.' + P + '-tilb{font-family:' + MONO + ';font-size:11px;color:#6b7483;white-space:nowrap}',
      '.' + P + '-mv{font-family:' + MONO + ';font-size:12px;color:#3a4250;white-space:nowrap;text-align:right}',
      '.' + P + '-kr{font-family:' + MONO + ';font-size:11.5px;color:#6b7483}',
      '.' + P + '-ad{display:flex;align-items:center;gap:4px;justify-content:flex-end;white-space:nowrap}',
      '.' + P + '-ib{width:24px;height:24px;padding:0;border-radius:4px;border:1px solid rgba(20,24,34,.16);background:' + SILFUR + ';color:#1f2530;font-size:11px;line-height:1;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)}',
      '.' + P + '-ib:hover{box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 0 0 1px rgba(201,42,42,.35)}',
      '.' + P + '-ib.rautt{color:#b42318}',
      '.' + P + '-ib[disabled]{opacity:.3;pointer-events:none}',
      '.' + P + '-nyr{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px;padding:10px 12px;background:#fff;border-radius:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)}',
      '.' + P + '-nyr input[type=text]{' + inp + ';flex:1 1 220px;min-width:0}',
      '.' + P + '-nyr input.' + P + '-verd{flex:0 0 92px;width:92px}',
      '.' + P + '-nyr select{' + inp + ';font-size:12.5px}',
      '.' + P + '-tomur{padding:26px;text-align:center;color:#5b6573;font-size:13px;background:#fff;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12);line-height:1.6}',
      '.' + P + '-tomur b{color:#141822}',
      '.' + P + '-tb{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin-top:10px;padding:12px 14px;background:#fff;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);position:sticky;bottom:-22px;z-index:2}',
      '.' + P + '-tb input[type=text]{' + inp + ';flex:1 1 180px;min-width:0}',
      '.' + P + '-sum{margin-left:auto;font-family:' + MONO + ';font-size:12px;color:#3a4250;text-align:right;line-height:1.5}',
      '.' + P + '-sum b{display:block;font-size:15px;color:#141822}',
      '.' + P + '-mg{width:64px;' + inp + ';text-align:right;font-family:' + MONO + ';font-size:12.5px}',
      // aukagluggar (form)
      '#' + P + '-f{position:fixed;inset:0;z-index:12600;background:rgba(8,10,14,.5);display:flex;align-items:flex-start;justify-content:center;padding:60px 14px 20px;overflow:auto;font-family:' + SANS + '}',
      '.' + P + '-fkort{width:min(560px,100%);background:#fff;border:1px solid #000;border-radius:10px;box-shadow:0 24px 50px -16px rgba(0,0,0,.7);overflow:hidden}',
      '.' + P + '-fhaus{display:flex;align-items:center;justify-content:space-between;padding:11px 16px;background:linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%);color:#fff;font-family:"Playfair Display",Georgia,serif;font-size:16px;font-weight:800}',
      '.' + P + '-fx{width:28px;height:28px;border-radius:4px;border:1px solid #000;background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);color:#eef1f4;cursor:pointer}',
      '.' + P + '-fbody{padding:14px 16px;background:#f4f6f9;max-height:calc(100vh - 220px);overflow:auto;font-size:13px;color:#1f2530}',
      '.' + P + '-ffot{display:flex;align-items:center;gap:8px;justify-content:flex-end;flex-wrap:wrap;padding:10px 16px;background:#fff;border-top:1px solid rgba(20,24,34,.12)}',
      '.' + P + '-fstada{margin-right:auto;font-size:12px;font-weight:700;color:#b42318}',
      '.' + P + '-fg{margin:0 0 10px}',
      '.' + P + '-fg label{display:block;font-family:' + MONO + ';font-size:9.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6b7483;margin-bottom:4px}',
      '.' + P + '-fg input[type=text],.' + P + '-fg select,.' + P + '-fg textarea{' + inp + ';width:100%}',
      '.' + P + '-fg textarea{height:150px;padding:8px 9px;font-family:' + MONO + ';font-size:12px;resize:vertical}',
      '.' + P + '-fg .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
      '.' + P + '-lit{display:flex;gap:6px;flex-wrap:wrap}',
      '.' + P + '-lit button{width:34px;height:26px;border-radius:5px;border:2px solid transparent;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,.4)}',
      '.' + P + '-lit button.on{border-color:#c92a2a;box-shadow:0 0 0 2px #fff,0 0 0 4px #c92a2a}',
      '.' + P + '-tk{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}',
      '.' + P + '-tk button{width:30px;height:28px;border-radius:5px;border:1px solid rgba(20,24,34,.16);background:' + SILFUR + ';cursor:pointer;font-size:15px;line-height:1}',
      '.' + P + '-tk button.on{border-color:#c92a2a;box-shadow:0 0 0 2px rgba(201,42,42,.3)}',
      '.' + P + '-hint{font-size:11.5px;color:#6b7483;line-height:1.5}',
      '.' + P + '-pre{margin-top:8px;padding:8px 10px;background:#fff;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12);font-size:12px;color:#3a4250;line-height:1.5}',
      '@media(max-width:760px){',
      '  #' + P + '-efni{padding:12px}',
      '  .' + P + '-tafla thead{display:none}',
      '  .' + P + '-tafla td{display:block;border:0;padding:3px 0}',
      '  .' + P + '-tafla tr.rad{display:block;padding:10px 0;border-bottom:1px solid #e2e8f0}',
      '  .' + P + '-tafla tr.hopur,.' + P + '-tafla tr.tomt{display:block}',
      '  .' + P + '-verd{width:110px}.' + P + '-vc,.' + P + '-ad{justify-content:flex-start}.' + P + '-mv{text-align:left}',
      '}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ── takkarnir í Vörur og þjónusta (vinstra megin; Agnar: rauðu kassarnir) ────────────────────────────────
  let _takkiQ = false;
  function schedule() { if (_takkiQ) return; _takkiQ = true; requestAnimationFrame(() => { _takkiQ = false; try { settaTakka(); } catch (e) { console.error('[502]', e); } }); }
  function takkiHtml(l) { return esc(l.takn) + ' ' + esc(l.nafn); }
  function settaTakka() {
    const rod = document.querySelector('#view-vorur .page-title__tools'); if (!rod) return;
    const ls = allir(false);
    const sig = ls.map(l => l.id + '|' + l.nafn + '|' + l.takn + '|' + l.litur + '|' + l.lysing).join(';');
    if (rod.dataset.vl5Sig === sig && rod.querySelector('[data-vl5-takki]')) return;
    stilar();
    rod.querySelectorAll('[data-vl5-takki]').forEach(b => b.remove());
    const fyrst = rod.firstElementChild;
    const bua = (l) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = P + '-takki'; b.setAttribute('data-vl5-takki', l.id);
      b.style.setProperty('--vl5-bg', LITIR[l.litur][1]); b.style.setProperty('--vl5-rond', LITIR[l.litur][2]);
      b.title = l.lysing || ('Verðlisti — ' + l.nafn); b.innerHTML = takkiHtml(l);
      b.addEventListener('click', () => opna(l.id));
      return b;
    };
    ls.forEach(l => rod.insertBefore(bua(l), fyrst));
    const ny = document.createElement('button'); ny.type = 'button'; ny.className = P + '-ny'; ny.setAttribute('data-vl5-takki', '_ny');
    ny.title = 'Búa til nýjan verðlista — t.d. Eldvarnareftirlit, Reyklosun, Hávakerfi, Stigleiðsla'; ny.textContent = '＋ Nýr verðlisti';
    ny.addEventListener('click', () => nyr());
    rod.insertBefore(ny, fyrst);
    rod.dataset.vl5Sig = sig;
  }
  (function vakta() {
    if (!document.body) { setTimeout(vakta, 200); return; }
    new MutationObserver(ms => { for (const m of ms) { const t = m.target; if (t && t.closest && t.closest('[data-vl5-takki],#' + P + '-bak,#' + P + '-f')) continue; schedule(); return; } }).observe(document.body, { childList: true, subtree: true });
    if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => schedule());
    schedule();
  })();
  setInterval(() => { if (!document.hidden) schedule(); }, 1500);

  // ── glugginn ───────────────────────────────────────────────────────────────────────────────────────────────
  const bakEl = () => document.getElementById(P + '-bak');
  const efniEl = () => document.getElementById(P + '-efni');
  function segja(texti, villa) {
    const s = document.getElementById(P + '-stada'); if (!s) return;
    s.style.display = texti ? 'block' : 'none'; s.textContent = texti || '';
    s.style.background = villa ? '#fef2f2' : '#ecfdf5'; s.style.color = villa ? '#991b1b' : '#065f46';
    clearTimeout(segja._t); if (texti && !villa) segja._t = setTimeout(() => segja(''), 6000);
  }
  function merkja(el, ok) {
    if (!el) return;
    el.classList.remove('ok', 'villa'); el.classList.add(ok ? 'ok' : 'villa');
    if (ok) setTimeout(() => el.classList.remove('ok'), 1600);
  }
  function loka() {
    const b = bakEl(); if (b) b.remove();
    const f = document.getElementById(P + '-f'); if (f) f.remove();
    document.removeEventListener('keydown', escLoka);
    _virkur = null;
    if (b && window.AppPageZoom && AppPageZoom.endurmeta) AppPageZoom.endurmeta();
  }
  function escLoka(e) {
    if (e.key !== 'Escape') return;
    const f = document.getElementById(P + '-f');
    if (f) f.remove(); else loka();
  }

  async function opna(id) {
    stilar();
    try { if (window.AppSettings && AppSettings.load) await AppSettings.load(); } catch (_) {}
    const L = lista(id);
    if (!L) { toast('Verðlistinn fannst ekki'); return; }
    if (_virkur !== id) { _sia = ''; _synaOvirk = false; _tilbod = false; _tb = {}; _tbTil = ''; _tbAth = ''; }
    loka();
    _virkur = id; _grunn[id] = L.u;
    const bak = document.createElement('div'); bak.id = P + '-bak';
    bak.innerHTML = '<div id="' + P + '-gluggi" role="dialog" aria-modal="true"><div id="' + P + '-haus"></div><div id="' + P + '-stada"></div><div id="' + P + '-efni"></div></div>';
    document.body.appendChild(bak);
    if (window.AppPageZoom && AppPageZoom.endurmeta) AppPageZoom.endurmeta();
    bak.addEventListener('click', e => { if (e.target === bak) loka(); });
    document.addEventListener('keydown', escLoka);
    tengja(bak);
    teiknaHaus(); teikna();
  }

  function teiknaHaus() {
    const L = lista(_virkur), h = document.getElementById(P + '-haus'); if (!L || !h) return;
    h.style.setProperty('--vl5-bg', LITIR[L.litur][1]);
    h.innerHTML = '<span style="font-size:24px;line-height:1">' + esc(L.takn) + '</span>' +
      '<div><h2>' + esc(L.nafn) + ' — verð</h2><p>' + esc(L.lysing || 'Verðlisti — verð, einingar og vsk') + '</p></div>' +
      '<div class="' + P + '-hn">' +
        '<button type="button" id="' + P + '-stillingar" title="Heiti, tákn, litur, sjálfgefinn vsk, afrita eða eyða listanum">⚙ Stillingar</button>' +
        '<button type="button" id="' + P + '-tilbod" class="' + (_tilbod ? 'on' : '') + '" title="Magn og afsláttur á línu — prenta tilboð eða setja línurnar í körfu í Sölu">' + (_tilbod ? '✓ Tilboðsham' : 'Búa til tilboð') + '</button>' +
        '<button type="button" id="' + P + '-prenta" title="Prenta verðlistann á A4 með haus Slökkvitækis — verð án og með vsk">Prenta verðlista</button>' +
        '<button type="button" id="' + P + '-loka" aria-label="Loka">✕</button>' +
      '</div>';
  }

  // Teiknar töfluna. Skrunstaða og fókus haldast (Stöðugt viðmót, 388) — nema notandinn sé að skrifa, þá er beðið (focusout).
  function teikna() {
    const L = lista(_virkur), ef = efniEl(); if (!L || !ef) return;
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(ef) : null;
    const q = norm(_sia);
    const synd = x => (_synaOvirk || x.virkt) && (!q || norm(x.nafn + ' ' + x.ath).indexOf(q) >= 0);
    const fjoldiVirkir = L.lidir.filter(x => x.virkt).length;
    const dalkar = _tilbod ? 11 : 8;
    let h = '<div class="' + P + '-verk">' +
      '<input class="' + P + '-sia" type="search" id="' + P + '-sia" placeholder="Sía listann…" value="' + esc(_sia) + '" aria-label="Sía listann">' +
      '<span class="' + P + '-fj">' + L.lidir.length + ' ' + (L.lidir.length === 1 ? 'liður' : 'liðir') + (fjoldiVirkir !== L.lidir.length ? ' · ' + fjoldiVirkir + ' virkir' : '') + '</span>' +
      '<label class="' + P + '-chk"><input type="checkbox" id="' + P + '-ovirk"' + (_synaOvirk ? ' checked' : '') + '> Sýna óvirka</label>' +
      '<span class="' + P + '-sp">' +
        '<button type="button" class="' + P + '-t" data-a="nyr-hopur" title="Bæta við hóp (t.d. Skoðun, Vinna og akstur)">＋ Hópur</button>' +
        '<button type="button" class="' + P + '-t" data-a="prosenta" title="Hækka eða lækka öll verð í einu, með rúnnun">% Verð</button>' +
        '<button type="button" class="' + P + '-t" data-a="lima" title="Líma inn lista úr Excel: heiti ; verð ; eining ; hópur">Líma inn</button>' +
        '<button type="button" class="' + P + '-t" data-a="csv" title="Sækja listann sem CSV (Excel)">CSV</button>' +
      '</span></div>';
    const hopHtml = [];
    const chips = [];
    L.hopar.forEach((hp, hi) => {
      const radir = L.lidir.filter(x => x.hopur === hp.id);
      const sy = radir.filter(synd);
      if (q && !sy.length) return;
      chips.push('<button type="button" class="' + P + '-hb" data-hopur-id="' + esc(hp.id) + '">' + esc(hp.heiti) + '<span>' + radir.length + '</span></button>');
      hopHtml.push('<tr class="hopur" data-h="' + esc(hp.id) + '"><td colspan="' + dalkar + '"><div class="hh">' +
        '<input class="' + P + '-hn2" data-hf="heiti" value="' + esc(hp.heiti) + '" aria-label="Heiti hóps" title="Heiti hóps — breyta beint">' +
        '<span class="' + P + '-fj">' + radir.length + '</span>' +
        '<span style="margin-left:auto;display:flex;gap:4px">' +
          '<button type="button" class="' + P + '-ib" data-a="hopur-upp" title="Færa hóp upp"' + (hi === 0 ? ' disabled' : '') + '>▲</button>' +
          '<button type="button" class="' + P + '-ib" data-a="hopur-nidur" title="Færa hóp niður"' + (hi === L.hopar.length - 1 ? ' disabled' : '') + '>▼</button>' +
          '<button type="button" class="' + P + '-ib rautt" data-a="hopur-eyda" title="Eyða hóp (liðirnir færast í næsta hóp)"' + (L.hopar.length < 2 ? ' disabled' : '') + '>✕</button>' +
        '</span></div></td></tr>' +
        (sy.length ? sy.map(x => radHtml(L, x)).join('') : '<tr class="tomt"><td colspan="' + dalkar + '">' + (radir.length ? 'Engir liðir passa við síuna' : 'Engir liðir í þessum hóp — bættu við neðst') + '</td></tr>'));
    });
    if (chips.length > 1) h += '<div class="' + P + '-hopar">' + chips.join('') + '</div>';
    if (!L.lidir.length) {
      h += '<div class="' + P + '-tomur"><b>' + esc(L.nafn) + ' á enn engan lið.</b><br>Bættu við fyrsta liðnum neðst, eða límdu inn lista úr Excel (<b>Líma inn</b>).<br>' +
        'Hverjum lið má stilla verð (fast, frá eða samkvæmt tilboði), einingu, vsk og hóp.</div>';
    }
    h += '<table class="' + P + '-tafla" id="' + P + '-tafla"><thead><tr><th>Liður</th><th class="' + P + '-r">Verð án vsk</th><th>Eining</th><th>Vsk</th><th class="' + P + '-r">Verð m/vsk</th><th>Hópur</th><th>Athugasemd</th><th></th>' +
      (_tilbod ? '<th class="' + P + '-r">Magn</th><th class="' + P + '-r">Afsl. %</th><th class="' + P + '-r">Samtals m/vsk</th>' : '') + '</tr></thead><tbody>' + hopHtml.join('') + '</tbody></table>';
    h += '<div class="' + P + '-nyr" id="' + P + '-nyr">' +
      '<input type="text" id="' + P + '-nyr-nafn" placeholder="Nýr liður, t.d. Árleg skoðun sprinklerkerfis" aria-label="Heiti nýs liðar">' +
      '<input class="' + P + '-verd" id="' + P + '-nyr-verd" type="text" inputmode="decimal" placeholder="14.500" aria-label="Verð án vsk"> <span class="' + P + '-kr">kr án vsk</span>' +
      '<select id="' + P + '-nyr-ein" aria-label="Eining">' + EININGAR.map(e => '<option value="' + esc(e) + '">' + esc(e) + '</option>').join('') + '</select>' +
      '<select id="' + P + '-nyr-hopur" aria-label="Hópur">' + L.hopar.map(hp => '<option value="' + esc(hp.id) + '">' + esc(hp.heiti) + '</option>').join('') + '</select>' +
      '<button type="button" class="' + P + '-t graenn" data-a="nyr-lidur">＋ Bæta við</button></div>';
    if (_tilbod) {
      h += '<div class="' + P + '-tb" id="' + P + '-tb">' +
        '<input type="text" id="' + P + '-tb-til" placeholder="Tilboð til (viðskiptavinur, valkvætt)" value="' + esc(_tbTil) + '" aria-label="Tilboð til">' +
        '<input type="text" id="' + P + '-tb-ath" placeholder="Athugasemd á tilboð (valkvætt)" value="' + esc(_tbAth) + '" aria-label="Athugasemd á tilboð">' +
        '<span class="' + P + '-sum" id="' + P + '-sum"></span>' +
        '<button type="button" class="' + P + '-t" data-a="tb-hreinsa">Núllstilla magn</button>' +
        '<button type="button" class="' + P + '-t" data-a="tb-prenta">Prenta tilboð</button>' +
        '<button type="button" class="' + P + '-t graenn" data-a="tb-korfu" title="Línurnar fara í körfuna á Sölu — afsláttur sem línuafsláttur">Setja í körfu í Sölu</button></div>';
    }
    ef.innerHTML = h;
    if (aftur) aftur();
    if (_tilbod) uppfaeraSummu();
  }

  function radHtml(L, x) {
    const vsk = x.vsk == null ? L.vsk : x.vsk;
    const tb = _tb[x.id] || {};
    const verdReitur = x.tegund === 'tilbod'
      ? '<span class="' + P + '-tilb">samkv. tilboði</span>'
      : '<input class="' + P + '-verd" data-f="verd" type="text" inputmode="decimal" value="' + esc(verdInn(x.verd)) + '" placeholder="—" aria-label="Verð án vsk: ' + esc(x.nafn) + '"> <span class="' + P + '-kr">kr</span>';
    const opt = (v, t, val) => '<option value="' + esc(v) + '"' + (String(v) === String(val) ? ' selected' : '') + '>' + esc(t) + '</option>';
    return '<tr class="rad' + (x.virkt ? '' : ' ovirk') + '" data-id="' + esc(x.id) + '">' +
      '<td style="min-width:200px"><input class="' + P + '-n" data-f="nafn" value="' + esc(x.nafn) + '" aria-label="Heiti liðar"></td>' +
      '<td class="' + P + '-r"><div class="' + P + '-vc"><select class="' + P + '-fl" data-f="tegund" aria-label="Tegund verðs" title="Fast verð · Verð frá · Samkvæmt tilboði">' + TEGUNDIR.map(t => opt(t[0], t[1], x.tegund)).join('') + '</select>' + verdReitur + '</div></td>' +
      '<td><select class="' + P + '-fl" data-f="eining" aria-label="Eining" style="width:76px">' + EININGAR.map(e => opt(e, e, x.eining)).join('') + '</select></td>' +
      '<td><select class="' + P + '-fl" data-f="vsk" aria-label="Vsk" style="width:84px" title="Sjálfgefinn vsk listans er ' + L.vsk + ' %">' + opt('', 'lista ' + L.vsk + '%', x.vsk == null ? '' : x.vsk) + VSK_VAL.map(v => opt(v, v + ' %', x.vsk)).join('') + '</select></td>' +
      '<td class="' + P + '-mv" data-mv>' + mvskTexti(x, vsk) + '</td>' +
      '<td><select class="' + P + '-fl" data-f="hopur" aria-label="Hópur" style="width:112px">' + L.hopar.map(hp => opt(hp.id, hp.heiti, x.hopur)).join('') + '</select></td>' +
      '<td style="min-width:140px"><input class="' + P + '-ath" data-f="ath" value="' + esc(x.ath) + '" placeholder="athugasemd…" aria-label="Athugasemd"></td>' +
      '<td><div class="' + P + '-ad">' +
        '<label class="' + P + '-chk" title="Virkur — óvirkir liðir birtast ekki á prentun eða í tilboði"><input type="checkbox" data-f="virkt"' + (x.virkt ? ' checked' : '') + '></label>' +
        '<button type="button" class="' + P + '-ib" data-a="lid-upp" title="Færa upp">▲</button>' +
        '<button type="button" class="' + P + '-ib" data-a="lid-nidur" title="Færa niður">▼</button>' +
        '<button type="button" class="' + P + '-ib rautt" data-a="lid-eyda" title="Eyða lið">✕</button></div></td>' +
      (_tilbod ? '<td class="' + P + '-r"><input class="' + P + '-mg" data-tb="magn" type="text" inputmode="decimal" value="' + esc(tb.magn || '') + '" aria-label="Magn" placeholder="0"></td>' +
        '<td class="' + P + '-r"><input class="' + P + '-mg" data-tb="afsl" type="text" inputmode="decimal" value="' + esc(tb.afsl || '') + '" aria-label="Afsláttur %" placeholder="0"></td>' +
        '<td class="' + P + '-mv" data-lt>' + linuSumma(L, x) + '</td>' : '') +
      '</tr>';
  }
  function mvskTexti(x, vsk) {
    if (x.tegund === 'tilbod') return '—';
    if (x.verd == null) return '—';
    return pun(mvskTala(x.verd, vsk)) + (x.tegund === 'fra' ? ' (frá)' : '') + ' kr';
  }
  function linuSumma(L, x) {
    const t = _tb[x.id]; const magn = t ? tala(t.magn) : null;
    if (!magn || magn <= 0 || x.tegund === 'tilbod' || x.verd == null) return '';
    const afsl = Math.max(0, Math.min(100, t ? (tala(t.afsl) || 0) : 0));
    const vsk = x.vsk == null ? L.vsk : x.vsk;
    return pun(mvskTala(x.verd * magn * (1 - afsl / 100), vsk)) + ' kr';
  }

  // ── tilboð ─────────────────────────────────────────────────────────────────────────────────────────────────
  function tilbodLinur(L) {
    const out = [];
    L.lidir.forEach(x => {
      const t = _tb[x.id]; const magn = t ? tala(t.magn) : null;
      if (!magn || magn <= 0) return;
      out.push({ x, magn, afsl: Math.max(0, Math.min(100, t ? (tala(t.afsl) || 0) : 0)), vsk: x.vsk == null ? L.vsk : x.vsk, verd: x.tegund === 'tilbod' ? null : x.verd });
    });
    return out;
  }
  function summa(linur) {
    let an = 0, mv = 0;
    linur.forEach(l => { if (l.verd == null) return; const a = l.verd * l.magn * (1 - l.afsl / 100); an += a; mv += mvskTala(a, l.vsk); });
    return { an, vsk: mv - an, mvsk: mv };
  }
  function uppfaeraSummu() {
    const L = lista(_virkur), el = document.getElementById(P + '-sum'); if (!L || !el) return;
    const ls = tilbodLinur(L), s = summa(ls), vantar = ls.filter(l => l.verd == null).length;
    el.innerHTML = ls.length ? ('Án vsk ' + kr(s.an) + ' · vsk ' + kr(s.vsk) + '<b>' + kr(s.mvsk) + ' m/vsk</b>' + (vantar ? '<span style="color:#b42318">' + vantar + ' lína án verðs er ekki talin með</span>' : '')) : 'Settu magn á þá liði sem fara á tilboðið';
  }

  // ── atburðir ───────────────────────────────────────────────────────────────────────────────────────────────
  function tengja(bak) {
    bak.addEventListener('input', e => {
      const t = e.target;
      if (t.id === P + '-sia') { _sia = t.value; teikna(); const n = document.getElementById(P + '-sia'); if (n) { n.focus(); try { n.setSelectionRange(n.value.length, n.value.length); } catch (_) {} } return; }
      if (t.id === P + '-tb-til') { _tbTil = t.value; return; }
      if (t.id === P + '-tb-ath') { _tbAth = t.value; return; }
      if (t.dataset && t.dataset.tb) {
        const tr = t.closest('tr'), id = tr && tr.dataset.id; if (!id) return;
        _tb[id] = Object.assign(_tb[id] || {}, { [t.dataset.tb]: t.value });
        const L = lista(_virkur), x = L && L.lidir.filter(y => y.id === id)[0];
        const c = tr.querySelector('[data-lt]'); if (c && x) c.textContent = linuSumma(L, x);
        uppfaeraSummu();
      }
    });
    bak.addEventListener('change', e => {
      const t = e.target; if (!t || !t.dataset) return;
      if (t.id === P + '-ovirk') { _synaOvirk = t.checked; teikna(); return; }
      if (t.dataset.hf) { breytaHop(t); return; }
      if (t.dataset.f) breytaLid(t);
    });
    bak.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const t = e.target; if (!t || !t.classList) return;
      if (t.closest && t.closest('#' + P + '-nyr')) { e.preventDefault(); baetaLid(); return; }
      if (t.tagName === 'INPUT' && (t.dataset.f || t.dataset.hf)) { e.preventDefault(); t.blur(); }
    });
    bak.addEventListener('click', e => {
      const hb = e.target.closest('[data-hopur-id]');
      if (hb) { const tr = bak.querySelector('tr.hopur[data-h="' + hb.getAttribute('data-hopur-id') + '"]'); if (tr) tr.scrollIntoView({ block: 'start' }); return; }
      const id = e.target.id;
      if (id === P + '-loka') { loka(); return; }
      if (id === P + '-stillingar') { stillingar(_virkur); return; }
      if (id === P + '-prenta') { prentaVerdlista(); return; }
      if (id === P + '-tilbod') { _tilbod = !_tilbod; teiknaHaus(); teikna(); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      const tr = a.closest('tr'), lid = tr && tr.dataset.id, hop = tr && tr.dataset.h;
      switch (a.dataset.a) {
        case 'nyr-lidur': baetaLid(); break;
        case 'nyr-hopur': nyrHopur(); break;
        case 'lid-upp': faeraLid(lid, -1); break;
        case 'lid-nidur': faeraLid(lid, 1); break;
        case 'lid-eyda': eydaLid(lid); break;
        case 'hopur-upp': faeraHop(hop, -1); break;
        case 'hopur-nidur': faeraHop(hop, 1); break;
        case 'hopur-eyda': eydaHop(hop); break;
        case 'prosenta': prosenta(); break;
        case 'lima': lima(); break;
        case 'csv': csv(); break;
        case 'tb-hreinsa': _tb = {}; teikna(); break;
        case 'tb-prenta': prentaTilbod(); break;
        case 'tb-korfu': setjaIKorfu(); break;
      }
    });
  }

  function utrelt() {
    const L = lista(_virkur);
    if (L) _grunn[_virkur] = L.u;
    teiknaHaus(); teikna();
    segja('Annar notandi breytti þessum lista á meðan glugginn var opinn — hann er endurlesinn og síðasta breytingin þín vistaðist EKKI. Gerðu hana aftur.', true);
  }
  // sameiginleg niðurstaða skrifs: reitur grænn/rauður, villur sagðar, úrelt meðhöndlað
  function afleidingar(r, el) {
    if (r.utrelt) { utrelt(); return false; }
    if (!r.ok) { merkja(el, false); segja('EKKI vistað: ' + (r.villa || 'óþekkt villa'), true); return false; }
    merkja(el, true); segja('');
    return true;
  }

  async function breytaLid(el) {
    const tr = el.closest('tr'), id = tr && tr.dataset.id, f = el.dataset.f; if (!id) return;
    const v = el.type === 'checkbox' ? el.checked : el.value;
    let villa = '';
    const r = await vista(_virkur, L => {
      const x = L.lidir.filter(y => y.id === id)[0]; if (!x) { villa = 'Liðurinn fannst ekki'; return false; }
      if (f === 'nafn') { const s = String(v).trim(); if (!s) { villa = 'Heiti má ekki vera tómt'; return false; } x.nafn = s; }
      else if (f === 'verd') { const n = tala(v); if (String(v).trim() !== '' && n == null) { villa = 'Verðið er ekki tala'; return false; } if (n != null && n < 0) { villa = 'Verð má ekki vera neikvætt'; return false; } x.verd = n; }
      else if (f === 'tegund') { if (['fast', 'fra', 'tilbod'].indexOf(v) < 0) return false; x.tegund = v; }
      else if (f === 'eining') { if (EININGAR.indexOf(v) < 0) return false; x.eining = v; }
      else if (f === 'vsk') { x.vsk = v === '' ? null : Number(v); if (x.vsk != null && VSK_VAL.indexOf(x.vsk) < 0) return false; }
      else if (f === 'hopur') { if (!L.hopar.some(h => h.id === v)) return false; x.hopur = v; }
      else if (f === 'ath') x.ath = String(v).trim().slice(0, 200);
      else if (f === 'virkt') x.virkt = !!v;
      else return false;
    });
    if (!r.ok && villa) r.villa = villa;
    if (!afleidingar(r, el)) { if (r.villa && !r.utrelt) { /* gildið stendur áfram í reitnum svo hægt sé að laga það */ } return; }
    // afleidd gildi: m/vsk, samtals — og uppbygging þegar eitthvað breytir uppröðun/formi raðarinnar
    if (f === 'tegund' || f === 'hopur' || f === 'virkt') { teikna(); return; }
    const L = r.listi, x = L.lidir.filter(y => y.id === id)[0];
    if (x && f === 'verd') el.value = verdInn(x.verd);
    const c = tr.querySelector('[data-mv]'); if (c && x) c.textContent = mvskTexti(x, x.vsk == null ? L.vsk : x.vsk);
    if (_tilbod) { const lt = tr.querySelector('[data-lt]'); if (lt && x) lt.textContent = linuSumma(L, x); uppfaeraSummu(); }
  }
  async function breytaHop(el) {
    const tr = el.closest('tr'), hid = tr && tr.dataset.h; if (!hid) return;
    const s = String(el.value).trim();
    let villa = '';
    const r = await vista(_virkur, L => {
      const h = L.hopar.filter(y => y.id === hid)[0]; if (!h) return false;
      if (!s) { villa = 'Heiti hóps má ekki vera tómt'; return false; }
      h.heiti = s;
    });
    if (!r.ok && villa) r.villa = villa;
    if (afleidingar(r, el)) teikna();
  }

  async function baetaLid() {
    const nafn = document.getElementById(P + '-nyr-nafn'), verd = document.getElementById(P + '-nyr-verd');
    const ein = document.getElementById(P + '-nyr-ein'), hop = document.getElementById(P + '-nyr-hopur');
    if (!nafn || !String(nafn.value).trim()) { if (nafn) { merkja(nafn, false); nafn.focus(); } return; }
    const n = tala(verd.value);
    if (String(verd.value).trim() !== '' && n == null) { merkja(verd, false); verd.focus(); return; }
    const r = await vista(_virkur, L => {
      L.lidir.push(normLid({ id: nyId('i'), nafn: String(nafn.value).trim(), verd: n, eining: ein.value, hopur: hop.value, virkt: true, tegund: 'fast' }, L.hopar.map(h => h.id)));
    });
    if (!afleidingar(r, nafn)) return;
    teikna();
    const nn = document.getElementById(P + '-nyr-nafn'); if (nn) nn.focus();
  }
  async function faeraLid(id, att) {
    const r = await vista(_virkur, L => {
      const i = L.lidir.findIndex(x => x.id === id); if (i < 0) return false;
      let j = i + att; while (j >= 0 && j < L.lidir.length && L.lidir[j].hopur !== L.lidir[i].hopur) j += att;
      if (j < 0 || j >= L.lidir.length) return false;
      const t = L.lidir[i]; L.lidir[i] = L.lidir[j]; L.lidir[j] = t;
    });
    if (r.utrelt) { utrelt(); return; }
    if (r.ok) teikna();
  }
  async function eydaLid(id) {
    const L0 = lista(_virkur), x0 = L0 && L0.lidir.filter(x => x.id === id)[0]; if (!x0) return;
    if (!(await spyrja('Eyða liðnum „' + x0.nafn + '"?\n\nHann hverfur úr listanum. (Vilji menn halda honum en fela hann: taktu hakið úr „virkur".)', { okText: 'Eyða', cancelText: 'Hætta við' }))) return;
    const r = await vista(_virkur, L => { const n = L.lidir.length; L.lidir = L.lidir.filter(x => x.id !== id); if (L.lidir.length === n) return false; });
    if (r.utrelt) { utrelt(); return; }
    if (r.ok) { delete _tb[id]; teikna(); segja('Liðnum „' + x0.nafn + '" eytt'); } else segja('EKKI vistað: ' + (r.villa || ''), true);
  }
  function nyrHopur() {
    gluggi2({
      titill: 'Nýr hópur', okText: 'Bæta við',
      html: '<div class="' + P + '-fg"><label>Heiti hóps</label><input type="text" id="' + P + '-g-heiti" placeholder="t.d. Skoðun, Prófanir, Akstur" maxlength="60"></div>',
      init: rot => setTimeout(() => { const i = rot.querySelector('#' + P + '-g-heiti'); if (i) i.focus(); }, 30),
      ok: async rot => {
        const s = String(rot.querySelector('#' + P + '-g-heiti').value).trim();
        if (!s) { fsegja(rot, 'Settu inn heiti'); return false; }
        const r = await vista(_virkur, L => { L.hopar.push({ id: nyId('h'), heiti: s }); });
        if (r.utrelt) { utrelt(); return; }
        if (!r.ok) { fsegja(rot, 'EKKI vistað: ' + (r.villa || '')); return false; }
        teikna();
      }
    });
  }
  async function faeraHop(id, att) {
    const r = await vista(_virkur, L => { const i = L.hopar.findIndex(h => h.id === id), j = i + att; if (i < 0 || j < 0 || j >= L.hopar.length) return false; const t = L.hopar[i]; L.hopar[i] = L.hopar[j]; L.hopar[j] = t; });
    if (r.utrelt) { utrelt(); return; }
    if (r.ok) teikna();
  }
  async function eydaHop(id) {
    const L0 = lista(_virkur); if (!L0 || L0.hopar.length < 2) { segja('Listinn þarf að hafa að minnsta kosti einn hóp', true); return; }
    const h0 = L0.hopar.filter(h => h.id === id)[0]; if (!h0) return;
    const fj = L0.lidir.filter(x => x.hopur === id).length;
    const i0 = L0.hopar.findIndex(h => h.id === id), vidtak = L0.hopar[i0 === 0 ? 1 : i0 - 1];
    if (!(await spyrja('Eyða hópnum „' + h0.heiti + '"?' + (fj ? '\n\n' + fj + ' ' + (fj === 1 ? 'liður færist' : 'liðir færast') + ' í „' + vidtak.heiti + '".' : ''), { okText: 'Eyða hóp', cancelText: 'Hætta við' }))) return;
    const r = await vista(_virkur, L => {
      const i = L.hopar.findIndex(h => h.id === id); if (i < 0 || L.hopar.length < 2) return false;
      const til = L.hopar[i === 0 ? 1 : i - 1].id;
      L.lidir.forEach(x => { if (x.hopur === id) x.hopur = til; });
      L.hopar.splice(i, 1);
    });
    if (r.utrelt) { utrelt(); return; }
    if (r.ok) teikna(); else segja('EKKI vistað: ' + (r.villa || ''), true);
  }

  // ── aukagluggar ────────────────────────────────────────────────────────────────────────────────────────────
  function fsegja(rot, t) { const s = rot.querySelector('.' + P + '-fstada'); if (s) s.textContent = t || ''; }
  function gluggi2(o) {
    const gamall = document.getElementById(P + '-f'); if (gamall) gamall.remove();
    const bak = document.createElement('div'); bak.id = P + '-f';
    bak.innerHTML = '<div class="' + P + '-fkort" role="dialog" aria-modal="true"><div class="' + P + '-fhaus"><span>' + esc(o.titill) + '</span><button type="button" class="' + P + '-fx" aria-label="Loka">✕</button></div>' +
      '<div class="' + P + '-fbody">' + o.html + '</div>' +
      '<div class="' + P + '-ffot"><span class="' + P + '-fstada"></span>' + (o.aukaTakkar || '') + '<button type="button" class="' + P + '-t" data-fx>Hætta við</button><button type="button" class="' + P + '-t graenn" data-fok>' + esc(o.okText || 'Vista') + '</button></div></div>';
    document.body.appendChild(bak);
    bak.addEventListener('click', e => { if (e.target === bak || e.target.closest('[data-fx]') || e.target.closest('.' + P + '-fx')) bak.remove(); });
    const ok = bak.querySelector('[data-fok]');
    ok.addEventListener('click', async () => {
      ok.disabled = true; let r;
      try { r = await o.ok(bak); } catch (e) { console.error('[502]', e); fsegja(bak, 'Villa: ' + (e && e.message || e)); r = false; }
      if (r === false) ok.disabled = false; else bak.remove();
    });
    if (o.init) o.init(bak);
    return bak;
  }

  // Nýr listi / stillingar lista (sama form)
  function nyr() { stilar(); stillingar(null); }
  function stillingar(id) {
    const L = id ? lista(id) : null;
    const nytt = !L;
    const g = L || { nafn: '', takn: '📋', litur: 'grafit', lysing: '', vsk: 24 };
    const eyddir = nytt ? allir(true).filter(l => l.eytt) : [];
    const grunnir = nytt ? allir(false) : [];
    const html =
      '<div class="' + P + '-fg"><label>Heiti verðlista</label><input type="text" id="' + P + '-s-nafn" value="' + esc(g.nafn) + '" placeholder="t.d. Eldvarnareftirlit" maxlength="50"></div>' +
      '<div class="' + P + '-fg"><label>Tákn</label><input type="text" id="' + P + '-s-takn" value="' + esc(g.takn) + '" maxlength="4" style="width:80px"><div class="' + P + '-tk">' + TAKN_VAL.map(t => '<button type="button" data-takn="' + t + '" class="' + (t === g.takn ? 'on' : '') + '">' + t + '</button>').join('') + '</div></div>' +
      '<div class="' + P + '-fg"><label>Litur takka</label><div class="' + P + '-lit" id="' + P + '-s-litur">' + Object.keys(LITIR).map(k => '<button type="button" data-litur="' + k + '" title="' + esc(LITIR[k][0]) + '" class="' + (k === g.litur ? 'on' : '') + '" style="background:' + LITIR[k][1] + '"></button>').join('') + '</div></div>' +
      '<div class="' + P + '-fg"><label>Lýsing (undir fyrirsögn)</label><input type="text" id="' + P + '-s-lysing" value="' + esc(g.lysing) + '" placeholder="Hvað er í þessum lista?" maxlength="120"></div>' +
      '<div class="' + P + '-fg"><label>Sjálfgefinn vsk á liði</label><select id="' + P + '-s-vsk">' + VSK_VAL.map(v => '<option value="' + v + '"' + (v === g.vsk ? ' selected' : '') + '>' + v + ' %</option>').join('') + '</select><div class="' + P + '-hint" style="margin-top:4px">Hver liður getur haft eigin vsk. 24 % er almennt, 11 % t.d. á mat og bækur.</div></div>' +
      (nytt ? '<div class="' + P + '-fg"><label>Byrja á</label><select id="' + P + '-s-grunnur"><option value="">Tómur listi (hópar: Skoðun · Vinna og akstur · Varahlutir og efni)</option>' + grunnir.map(l => '<option value="' + esc(l.id) + '">Afrit af „' + esc(l.nafn) + '" (' + l.lidir.length + ' liðir)</option>').join('') + '</select></div>' +
        (eyddir.length ? '<div class="' + P + '-fg"><label>Eyddir verðlistar</label><div class="row">' + eyddir.map(l => '<button type="button" class="' + P + '-t" data-endurheimta="' + esc(l.id) + '">Endurheimta „' + esc(l.nafn) + '"</button>').join('') + '</div></div>' : '') : '');
    const auka = nytt ? '' :
      '<button type="button" class="' + P + '-t" data-s="fram" title="Færa takkann framar í röðinni">◀ Framar</button>' +
      '<button type="button" class="' + P + '-t" data-s="aftar" title="Færa takkann aftar í röðinni">Aftar ▶</button>' +
      '<button type="button" class="' + P + '-t" data-s="afrita">Afrita lista</button>' +
      '<button type="button" class="' + P + '-t haetta" data-s="eyda">Eyða lista</button>';
    const rot = gluggi2({
      titill: nytt ? 'Nýr verðlisti' : 'Stillingar — ' + L.nafn, okText: nytt ? 'Búa til lista' : 'Vista stillingar', html, aukaTakkar: auka,
      init: r => {
        setTimeout(() => { const i = r.querySelector('#' + P + '-s-nafn'); if (i) i.focus(); }, 30);
        r.addEventListener('click', async e => {
          const tk = e.target.closest('[data-takn]'); if (tk) { r.querySelector('#' + P + '-s-takn').value = tk.dataset.takn; r.querySelectorAll('[data-takn]').forEach(b => b.classList.toggle('on', b === tk)); return; }
          const li = e.target.closest('[data-litur]'); if (li) { r.querySelectorAll('[data-litur]').forEach(b => b.classList.toggle('on', b === li)); return; }
          const en = e.target.closest('[data-endurheimta]'); if (en) { const eid = en.dataset.endurheimta; const rr = await vista(eid, l => { l.eytt = false; }); if (rr.ok) { r.remove(); toast('Verðlisti endurheimtur'); opna(eid); } else fsegja(r, 'EKKI vistað: ' + (rr.villa || '')); return; }
          const s = e.target.closest('[data-s]'); if (s) adgerdListi(s.dataset.s, id, r);
        });
      },
      ok: async r => {
        const nafn = String(r.querySelector('#' + P + '-s-nafn').value).trim();
        if (!nafn) { fsegja(r, 'Settu inn heiti á listann'); return false; }
        const takn = String(r.querySelector('#' + P + '-s-takn').value).trim() || '📋';
        const litEl = r.querySelector('#' + P + '-s-litur .on'); const litur = litEl ? litEl.dataset.litur : 'grafit';
        const lysing = String(r.querySelector('#' + P + '-s-lysing').value).trim();
        const vsk = Number(r.querySelector('#' + P + '-s-vsk').value);
        if (nytt) {
          const grId = r.querySelector('#' + P + '-s-grunnur').value;
          const grunnur = grId ? lista(grId) : null;
          const ls = allir(true);
          const nyL = normListi({ id: nyId('l'), nafn, takn, litur, lysing, vsk, rod: Math.max.apply(null, ls.map(l => l.rod).concat([0])) + 10, hopar: grunnur ? klona(grunnur.hopar) : HOPAR_STOFN(), lidir: grunnur ? klona(grunnur.lidir) : [] });
          if (grunnur) nyL.lidir.forEach(x => { x.id = nyId('i'); });
          if (!(await vistaNyjan(nyL))) { fsegja(r, 'EKKI vistað — reyndu aftur'); return false; }
          toast('Verðlisti „' + nafn + '" búinn til');
          setTimeout(() => opna(nyL.id), 60);
          return;
        }
        const rr = await vista(id, l => { l.nafn = nafn; l.takn = takn; l.litur = litur; l.lysing = lysing; l.vsk = vsk; });
        if (rr.utrelt) { if (_virkur === id) utrelt(); return; }
        if (!rr.ok) { fsegja(r, 'EKKI vistað: ' + (rr.villa || '')); return false; }
        if (_virkur === id) { teiknaHaus(); teikna(); }
      }
    });
    return rot;
  }
  async function adgerdListi(a, id, rot) {
    const L = lista(id); if (!L) return;
    if (a === 'fram' || a === 'aftar') {
      const ls = allir(false), i = ls.findIndex(l => l.id === id), j = i + (a === 'fram' ? -1 : 1);
      if (j < 0 || j >= ls.length) { fsegja(rot, 'Listinn er þegar ' + (a === 'fram' ? 'fremstur' : 'aftastur')); return; }
      const rodA = ls[i].rod, rodB = ls[j].rod;
      const nyA = rodA === rodB ? rodB + (a === 'fram' ? -1 : 1) : rodB;
      const r1 = await vista(id, l => { l.rod = nyA; });
      if (r1.ok && rodA !== rodB) await vista(ls[j].id, l => { l.rod = rodA; });
      fsegja(rot, r1.ok ? '' : 'EKKI vistað: ' + (r1.villa || '')); if (r1.ok) toast('Takkinn færður'); return;
    }
    if (a === 'afrita') {
      const ls = allir(true);
      const afrit = normListi({ id: nyId('l'), nafn: L.nafn + ' (afrit)', takn: L.takn, litur: L.litur, lysing: L.lysing, vsk: L.vsk, rod: Math.max.apply(null, ls.map(l => l.rod).concat([0])) + 10, hopar: klona(L.hopar), lidir: klona(L.lidir) });
      afrit.lidir.forEach(x => { x.id = nyId('i'); });
      if (!(await vistaNyjan(afrit))) { fsegja(rot, 'EKKI vistað — reyndu aftur'); return; }
      rot.remove(); toast('Afrit búið til'); opna(afrit.id); return;
    }
    if (a === 'eyda') {
      if (!(await spyrja('Eyða verðlistanum „' + L.nafn + '"?\n\nTakkinn og glugginn hverfa. Gögnin eru geymd og hægt er að endurheimta listann í „＋ Nýr verðlisti".', { okText: 'Eyða lista', cancelText: 'Hætta við' }))) return;
      const r = await vista(id, l => { l.eytt = true; });
      if (!r.ok) { fsegja(rot, 'EKKI vistað: ' + (r.villa || '')); return; }
      rot.remove(); loka(); toast('Verðlista eytt — hægt að endurheimta í „＋ Nýr verðlisti"');
    }
  }

  // % breyting á verðum
  function prosenta() {
    const L = lista(_virkur); if (!L) return;
    const html =
      '<div class="' + P + '-fg"><label>Hvaða liðir</label><select id="' + P + '-p-hvar"><option value="">Allir liðir með verð (' + L.lidir.filter(x => x.verd != null && x.tegund !== 'tilbod').length + ')</option>' + L.hopar.map(h => '<option value="' + esc(h.id) + '">Aðeins hópurinn „' + esc(h.heiti) + '"</option>').join('') + '</select></div>' +
      '<div class="' + P + '-fg"><label>Breyting á verði (%) — mínus lækkar</label><input type="text" id="' + P + '-p-pr" inputmode="decimal" placeholder="t.d. 5 eða -3,5"></div>' +
      '<div class="' + P + '-fg"><label>Rúnna verð án vsk að næsta</label><select id="' + P + '-p-run"><option value="0">Ekki rúnna (2 aukastafir)</option><option value="1">1 kr</option><option value="10">10 kr</option><option value="50">50 kr</option><option value="100">100 kr</option></select></div>' +
      '<div class="' + P + '-pre" id="' + P + '-p-pre">Sláðu inn prósentu til að sjá dæmi.</div>';
    const reikna = r => {
      const hv = r.querySelector('#' + P + '-p-hvar').value, pr = tala(r.querySelector('#' + P + '-p-pr').value), run = Number(r.querySelector('#' + P + '-p-run').value);
      return { hv, pr, run, nyttVerd: v => { let n = v * (1 + (pr || 0) / 100); n = run > 0 ? Math.round(n / run) * run : Math.round(n * 100) / 100; return n; } };
    };
    gluggi2({
      titill: 'Breyta verðum — ' + L.nafn, okText: 'Breyta verðum', html,
      init: r => {
        const uppf = () => {
          const c = reikna(r), pre = r.querySelector('#' + P + '-p-pre'), cur = lista(_virkur);
          const mengi = cur.lidir.filter(x => x.verd != null && x.tegund !== 'tilbod' && (!c.hv || x.hopur === c.hv));
          if (c.pr == null || !mengi.length) { pre.textContent = c.pr == null ? 'Sláðu inn prósentu til að sjá dæmi.' : 'Engir liðir með verð í þessu vali.'; return; }
          const d = mengi[0];
          pre.innerHTML = '<b>' + mengi.length + '</b> ' + (mengi.length === 1 ? 'liður breytist' : 'liðir breytast') + '. Dæmi: „' + esc(d.nafn) + '" ' + verdInn(d.verd) + ' kr → <b>' + verdInn(c.nyttVerd(d.verd)) + ' kr</b> (án vsk).';
        };
        r.addEventListener('input', uppf); r.addEventListener('change', uppf);
      },
      ok: async r => {
        const c = reikna(r);
        if (c.pr == null || c.pr === 0 && c.run === 0) { fsegja(r, 'Sláðu inn prósentu (eða veldu rúnnun)'); return false; }
        if (c.pr <= -100) { fsegja(r, 'Prósentan er of lág'); return false; }
        let fj = 0;
        const rr = await vista(_virkur, l => { l.lidir.forEach(x => { if (x.verd != null && x.tegund !== 'tilbod' && (!c.hv || x.hopur === c.hv)) { x.verd = c.nyttVerd(x.verd); fj++; } }); if (!fj) return false; });
        if (rr.utrelt) { utrelt(); return; }
        if (!rr.ok) { fsegja(r, 'EKKI vistað: ' + (rr.villa || 'engir liðir í valinu')); return false; }
        teikna(); segja('✓ Verð ' + fj + ' ' + (fj === 1 ? 'liðar' : 'liða') + ' breytt um ' + String(c.pr).replace('.', ',') + ' %');
      }
    });
  }

  // líma inn úr Excel
  function lesaLimt(texti) {
    const linur = String(texti || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const out = [];
    linur.forEach((ln, i) => {
      const p = (ln.indexOf('\t') >= 0 ? ln.split('\t') : ln.split(';')).map(s => s.trim());
      const nafn = p[0]; if (!nafn) return;
      const verd = tala(p[1]);
      if (i === 0 && verd == null && /^(lidur|vara|heiti|nafn|thjonusta)/.test(norm(nafn))) return;   // hausalína
      const ein = p[2] ? (EININGAR.indexOf(p[2]) >= 0 ? p[2] : (EININGAR.filter(e => norm(e) === norm(p[2]))[0] || 'stk')) : 'stk';
      out.push({ nafn, verd, eining: ein, hopur: p[3] || '' });
    });
    return out;
  }
  function lima() {
    const L = lista(_virkur); if (!L) return;
    gluggi2({
      titill: 'Líma inn lista — ' + L.nafn, okText: 'Bæta liðunum við',
      html: '<div class="' + P + '-hint" style="margin-bottom:8px">Afritaðu raðir úr Excel (eða skrifaðu eina línu á hvern lið) og límdu hér. Dálkar: <b>heiti ; verð án vsk ; eining ; hópur</b> (tab eða semíkomma á milli). Eining og hópur eru valkvæð — nýr hópur verður til ef hann er ekki til.</div>' +
        '<div class="' + P + '-fg"><textarea id="' + P + '-l-texti" placeholder="Árleg skoðun sprinklerkerfis;48000;kerfi;Skoðun&#10;Akstur;3600;ferð;Vinna og akstur"></textarea></div>' +
        '<div class="' + P + '-pre" id="' + P + '-l-pre">Ekkert límt enn.</div>',
      init: r => {
        const ta = r.querySelector('#' + P + '-l-texti');
        ta.addEventListener('input', () => {
          const l = lesaLimt(ta.value), an = l.filter(x => x.verd == null).length;
          r.querySelector('#' + P + '-l-pre').innerHTML = l.length ? '<b>' + l.length + '</b> ' + (l.length === 1 ? 'liður' : 'liðir') + ' tilbúnir til að bætast við' + (an ? ' — <span style="color:#b42318">' + an + ' án verðs</span> (bætast við með tómu verði)' : '') + '.' : 'Ekkert límt enn.';
        });
        setTimeout(() => ta.focus(), 30);
      },
      ok: async r => {
        const l = lesaLimt(r.querySelector('#' + P + '-l-texti').value);
        if (!l.length) { fsegja(r, 'Ekkert til að bæta við'); return false; }
        const rr = await vista(_virkur, cur => {
          l.forEach(x => {
            let hop = null;
            if (x.hopur) { hop = cur.hopar.filter(h => norm(h.heiti) === norm(x.hopur))[0]; if (!hop) { hop = { id: nyId('h'), heiti: x.hopur }; cur.hopar.push(hop); } }
            cur.lidir.push(normLid({ id: nyId('i'), nafn: x.nafn, verd: x.verd, eining: x.eining, hopur: hop ? hop.id : cur.hopar[0].id, virkt: true, tegund: 'fast' }, cur.hopar.map(h => h.id)));
          });
        });
        if (rr.utrelt) { utrelt(); return; }
        if (!rr.ok) { fsegja(r, 'EKKI vistað: ' + (rr.villa || '')); return false; }
        teikna(); segja('✓ ' + l.length + ' ' + (l.length === 1 ? 'liður' : 'liðir') + ' bætt við');
      }
    });
  }

  // CSV (UTF-8 BOM, semíkomma, tugakomma — íslenskt Excel)
  function csv() {
    const L = lista(_virkur); if (!L) return;
    const rod = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
    const num = n => n == null ? '' : String(n).replace('.', ',');
    const linur = [['Hópur', 'Liður', 'Verð án vsk', 'Tegund verðs', 'Eining', 'Vsk %', 'Verð m/vsk', 'Athugasemd', 'Virkur'].map(rod).join(';')];
    L.hopar.forEach(h => L.lidir.filter(x => x.hopur === h.id).forEach(x => {
      const vsk = x.vsk == null ? L.vsk : x.vsk;
      linur.push([rod(h.heiti), rod(x.nafn), num(x.verd), rod(x.tegund === 'fra' ? 'frá' : x.tegund === 'tilbod' ? 'samkv. tilboði' : 'fast'), rod(x.eining), vsk, x.verd == null ? '' : num(Math.round(mvskTala(x.verd, vsk) * 100) / 100), rod(x.ath), x.virkt ? 'já' : 'nei'].join(';'));
    }));
    const blob = new Blob(['﻿' + linur.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    const d = new Date(); a.download = 'verdlisti-' + L.id + '-' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    segja('✓ CSV sótt (' + L.lidir.length + ' liðir)');
  }

  // ── prentun ────────────────────────────────────────────────────────────────────────────────────────────────
  function prentSkjal(titill, undirtitill, meginmal, aths) {
    const logo = (window.SlokkLogo && SlokkLogo.imgHtml) ? SlokkLogo.imgHtml({ heightPx: 80, absoluteUrl: true })
      : '<img src="' + window.location.origin + '/img/logo.png?v=20260520b" alt="Slökkvitæki" style="height:80px;width:240px;object-fit:contain" onerror="this.style.display=\'none\'">';
    const nu = new Date(), dags = nu.getDate() + '.' + (nu.getMonth() + 1) + '.' + nu.getFullYear();
    return '<!DOCTYPE html><html lang="is"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(titill) + ' — Slökkvitæki ehf</title><style>' +
      '@page{size:A4;margin:16mm 14mm}body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:0;padding:0;font-size:12.5px;line-height:1.45;background:#fff}' +
      '.wrap{max-width:780px;margin:0 auto;padding:18px 24px}.head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;padding-bottom:14px;border-bottom:2px solid #0f172a}' +
      '.logo{display:flex;gap:12px;align-items:center}.logo img{max-height:54px}.co-info{font-size:11px;color:#475569;line-height:1.45}.co-info b{color:#0f172a;font-size:14px}' +
      '.doc-title{text-align:right}.doc-title h1{margin:0;font-size:22px;letter-spacing:.5px}.doc-title .sub{color:#dc2626;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-top:2px}.doc-title .meta{font-size:11px;color:#475569;margin-top:8px}' +
      'table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12px}th{background:#f1f5f9;color:#475569;text-transform:uppercase;font-size:10px;letter-spacing:.04em;padding:8px 10px;text-align:left;border-bottom:2px solid #e2e8f0}' +
      'th.r,td.r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}td{padding:7px 10px;border-bottom:1px solid #e5e7eb;vertical-align:top}td.b{font-weight:700}td small{display:block;color:#64748b;font-size:10.5px;margin-top:1px}' +
      'tr{break-inside:avoid}thead{display:table-header-group}tr.hopur td{padding:9px 10px;background:#fef2f2;color:#991b1b;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.05em}' +
      'tr.sum td{border-top:2px solid #0f172a;font-weight:700;background:#f8fafc}.ath{margin-top:14px;font-size:11px;color:#475569;white-space:pre-wrap}.til{margin-top:12px;font-size:13px}' +
      '.foot{margin-top:28px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:10.5px;color:#64748b}' +
      '.stika{position:sticky;top:0;display:flex;justify-content:flex-end;gap:8px;padding:10px 24px;background:#f1f5f9;border-bottom:1px solid #e2e8f0}.stika button{padding:8px 16px;border:1px solid #0f172a;border-radius:6px;background:#0f172a;color:#fff;font:700 12.5px Arial,sans-serif;cursor:pointer}' +
      '@media print{.stika{display:none}}</style></head><body><div class="stika"><button type="button" onclick="window.print()">Prenta / Vista PDF</button></div>' +
      '<div class="wrap"><div class="head"><div class="logo">' + logo + '<div class="co-info"><b>Slökkvitæki ehf</b><br>Helluhraun 10, 220 Hafnarfirði<br>kt. 600508-0400 · vsknr. 98107<br>Sími 565-4080 · eldklar@eldklar.is</div></div>' +
      '<div class="doc-title"><h1>' + esc(titill) + '</h1><div class="sub">' + esc(undirtitill) + '</div><div class="meta">Dags.: <strong>' + esc(dags) + '</strong></div></div></div>' +
      meginmal + (aths ? '<div class="ath">' + esc(aths) + '</div>' : '') +
      '<div class="foot">Slökkvitæki ehf · Helluhraun 10, 220 Hafnarfirði · kt. 600508-0400 · Sími 565-4080</div></div>' +
      '<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},200)})<\/script></body></html>';
  }
  function opnaPrent(htmlFall) {
    const w = window.open('', '_blank');   // strax í smellinum — annars blokkar vafrinn gluggann
    if (!w) { segja('Vafrinn blokkaði nýjan glugga — leyfðu sprettiglugga fyrir þessa síðu.', true); return; }
    w.document.open(); w.document.write(htmlFall()); w.document.close();
  }
  function verdUtsyn(x, vsk) {
    if (x.tegund === 'tilbod') return ['samkv. tilboði', 'samkv. tilboði'];
    if (x.verd == null) return ['—', '—'];
    const f = x.tegund === 'fra' ? 'frá ' : '';
    return [f + krN(x.verd), f + kr(mvskTala(x.verd, vsk))];
  }
  function prentaVerdlista() {
    const L = lista(_virkur); if (!L) return;
    opnaPrent(() => {
      const radir = L.hopar.map(h => {
        const ls = L.lidir.filter(x => x.hopur === h.id && x.virkt);
        if (!ls.length) return '';
        return '<tr class="hopur"><td colspan="4">' + esc(h.heiti) + '</td></tr>' + ls.map(x => {
          const vsk = x.vsk == null ? L.vsk : x.vsk, v = verdUtsyn(x, vsk);
          return '<tr><td>' + esc(x.nafn) + (x.ath ? '<small>' + esc(x.ath) + '</small>' : '') + '</td><td>' + esc(x.eining) + '</td><td class="r">' + esc(v[0]) + '</td><td class="r b">' + esc(v[1]) + '</td></tr>';
        }).join('');
      }).join('');
      return prentSkjal('Verðskrá', L.nafn,
        '<table><thead><tr><th>Liður</th><th style="width:70px">Eining</th><th class="r" style="width:120px">Verð án VSK</th><th class="r" style="width:120px">Verð m/VSK</th></tr></thead><tbody>' +
        (radir || '<tr><td colspan="4" style="padding:14px;color:#94a3b8;font-style:italic;text-align:center">Engir virkir liðir í listanum</td></tr>') + '</tbody></table>',
        'Öll verð eru í íslenskum krónum. VSK ' + L.vsk + ' % nema annað sé tekið fram.');
    });
  }
  function prentaTilbod() {
    const L = lista(_virkur); if (!L) return;
    const ls = tilbodLinur(L);
    if (!ls.length) { segja('Settu magn á að minnsta kosti einn lið', true); return; }
    const til = _tbTil, ath = _tbAth;
    opnaPrent(() => {
      const s = summa(ls);
      const radir = L.hopar.map(h => {
        const l2 = ls.filter(l => l.x.hopur === h.id); if (!l2.length) return '';
        return '<tr class="hopur"><td colspan="6">' + esc(h.heiti) + '</td></tr>' + l2.map(l => {
          const v = l.verd == null ? 'samkv. tilboði' : krN(l.verd), lt = l.verd == null ? '—' : kr(mvskTala(l.verd * l.magn * (1 - l.afsl / 100), l.vsk));
          return '<tr><td>' + esc(l.x.nafn) + (l.x.ath ? '<small>' + esc(l.x.ath) + '</small>' : '') + '</td><td class="r">' + esc(String(l.magn).replace('.', ',')) + ' ' + esc(l.x.eining) + '</td><td class="r">' + esc(v) + '</td><td class="r">' + (l.afsl ? esc(String(l.afsl).replace('.', ',')) + ' %' : '') + '</td><td class="r">' + l.vsk + ' %</td><td class="r b">' + esc(lt) + '</td></tr>';
        }).join('');
      }).join('');
      return prentSkjal('Tilboð', L.nafn,
        (til ? '<div class="til">Til: <b>' + esc(til) + '</b></div>' : '') +
        '<table><thead><tr><th>Liður</th><th class="r">Magn</th><th class="r">Verð án VSK</th><th class="r">Afsl.</th><th class="r">VSK</th><th class="r">Samtals m/VSK</th></tr></thead><tbody>' + radir +
        '<tr class="sum"><td colspan="5" style="text-align:right">Samtals án VSK</td><td class="r">' + esc(kr(s.an)) + '</td></tr>' +
        '<tr class="sum"><td colspan="5" style="text-align:right">VSK</td><td class="r">' + esc(kr(s.vsk)) + '</td></tr>' +
        '<tr class="sum"><td colspan="5" style="text-align:right">Samtals með VSK</td><td class="r">' + esc(kr(s.mvsk)) + '</td></tr></tbody></table>',
        ath || 'Öll verð eru í íslenskum krónum.');
    });
  }

  // ── tilboð → karfa í Sölu (afsláttur sem línuafsláttur disc_pct — aldrei bæði baked og afslattur) ──────────
  async function setjaIKorfu() {
    const L = lista(_virkur); if (!L) return;
    const ls = tilbodLinur(L).filter(l => l.verd != null);
    if (!ls.length) { segja('Settu magn á að minnsta kosti einn lið með verði', true); return; }
    const linur = ls.map(l => {
      const o = { type: 'service', desc: l.x.nafn, qty: l.magn, unit_price_ex_vat: l.verd, vsk_pct: l.vsk, ref: '', krefst_verkbeidni: false };
      if (l.afsl > 0) o.disc_pct = l.afsl;
      return o;
    });
    loka();
    try { if (window.App && App.switchView) App.switchView('sala'); else location.hash = '#sala'; } catch (_) { location.hash = '#sala'; }
    const t0 = Date.now();
    while (!(window.POS && POS.getState && document.getElementById('pos-checkout')) && Date.now() - t0 < 20000) await sl(250);
    if (!(window.POS && POS.getState)) { toast('Söluborðið hlóðst ekki — opnaðu Sala og reyndu aftur'); return; }
    await sl(300);
    const st = POS.getState();
    const fyrir = st.lines.length;
    linur.forEach(l => st.lines.push(l));
    POS.rerenderDynamic();
    toast('✓ ' + linur.length + ' ' + (linur.length === 1 ? 'lína' : 'línur') + ' úr „' + L.nafn + '" komnar í körfuna' + (fyrir ? ' (bætt við þær sem voru fyrir)' : ''));
  }

  // ── opinbert API ───────────────────────────────────────────────────────────────────────────────────────────
  window.Verdlistar = {
    opna: opna,
    nyr: nyr,
    listi: () => allir(false).map(l => ({ id: l.id, nafn: l.nafn, takn: l.takn, litur: l.litur, lidir: l.lidir.length })),
    get: id => { const l = lista(id); return l ? klona(l) : null; },
    // Fyrir úttektir/tilboð: virkir liðir listans með verði án og með vsk (null ef verð vantar eða „samkv. tilboði")
    lidir: (id, o) => {
      const l = lista(id); if (!l) return [];
      return l.lidir.filter(x => !(o && o.adeinsVirka === false) ? x.virkt : true).map(x => {
        const vsk = x.vsk == null ? l.vsk : x.vsk, hp = l.hopar.filter(h => h.id === x.hopur)[0];
        const hv = x.tegund !== 'tilbod' && x.verd != null;
        return { id: x.id, nafn: x.nafn, hopur: hp ? hp.heiti : '', eining: x.eining, tegund: x.tegund, vsk: vsk, ath: x.ath, verd_an_vsk: hv ? x.verd : null, verd_m_vsk: hv ? mvskTala(x.verd, vsk) : null };
      });
    },
    version: 'v1'
  };
})();
