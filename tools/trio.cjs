#!/usr/bin/env node
/* TRÍÓ-MÆLITÆKIÐ — þrjár óháðar heimildir um sama hlut: hvað á staðurinn mörg tæki?
 *
 * Agnar 01.09.2026: „hversu mörg fyrirtæki eru með tækjamagn sjáanlegt á prófíl
 * sem passar við invoicea tækjamagn og úttektarskýrslu magn … hún er svolítið
 * ultimate fact check."
 *
 *   PRÓFÍLL     `uttaeki`-raðir á fyrirtaeki_id — það sem sést á spjaldinu og
 *               ræður kostnaðarreikningi.
 *   SKÝRSLA     `arsskodun_report_facts.total_devices` — talið upp úr
 *               úttektarskýrslunni sjálfri (636 fyrirtæki, eitt ár hvert).
 *   REIKNINGUR  magn á tækjalínum síðustu sölu — sala + yfirferð + hleðsla
 *               leggjast SAMAN (regla Agnars, staðfest 01.09.2026).
 *
 * Þrennt sem gerir þetta að fact-checki en ekki talningu: heimildirnar þrjár eru
 * skrifaðar af ÓLÍKUM aðilum á ólíkum tíma — tæknimaður á staðnum (skýrsla),
 * afgreiðsla (reikningur) og skráin sjálf (prófíll). Stemmi þær allar er talan
 * sönnuð. Stemmi tvær og ein víki, þá veit maður HVER víkur.
 *
 * ÞETTA SKRIFAR EKKERT. Les og telur.
 *
 *   node tools/trio.cjs            samantekt
 *   node tools/trio.cjs --listi    hvert fyrirtæki sem víkur
 *   node tools/trio.cjs --fid 443  eitt fyrirtæki í smáatriðum
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

const LISTI = process.argv.includes('--listi');
const EITT = (() => { const i = process.argv.indexOf('--fid'); return i > -1 ? +process.argv[i + 1] : null; })();

async function allar(q) {
  let out = [], from = 0;
  for (;;) {
    const r = await fetch(`${URL_}/rest/v1/${q}&offset=${from}&limit=1000`, { headers: H });
    // Kastar. Tómt safn liti út eins og „ekkert misræmi", sem er hættulegasta svarið.
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
    const d = await r.json();
    if (!d.length) break;
    out = out.concat(d);
    if (d.length < 1000) break;
    from += 1000;
  }
  return out;
}

/* Tækjalína eða gjaldlína? Ræðst af því hvort lýsingin nefnir TÆKJATEGUND.
   Gjöld (Vinna, Akstur, Skýrslugerð, Skoðunargjald, byrjunargjald) og
   fylgihlutir (Skilti, límmiði, O-hringur, Úðastútur, rafhlaða) nefna enga
   tegund og detta því út af sjálfu sér — engin svartlisti sem gleymist að
   uppfæra. Sannreynt á reikningsorðaforða beggja kerfa 01.09.2026. */
function taekiAfLinu(desc) {
  const t = String(desc || '').toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i')
    .replace(/[óò]/g, 'o').replace(/[úù]/g, 'u').replace(/ý/g, 'y')
    .replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/ð/g, 'd').replace(/ö/g, 'o');
  // O-hringur má ALDREI lesast sem tæki þótt hann fylgi hverri hleðslu.
  if (/o-?hring|udastut|limmid|skilti|rafhlod|sjukra/.test(t)) return null;
  if (/lettv|abf|frod/.test(t)) return 'lettvatn';
  if (/duft|abc|pfc/.test(t)) return 'duft';
  if (/co2|co₂|kolsyr/.test(t)) return 'co2';
  if (/brunaslang|slongu/.test(t)) return 'brunaslongur';
  if (/reykskynj/.test(t)) return 'reykskynjarar';
  if (/teppi|eldvarn/.test(t)) return 'eldvarnarteppi';
  return null;
}

function linurAf(s) {
  let L = s.linur;
  if (typeof L === 'string') { try { L = JSON.parse(L); } catch (_) { L = []; } }
  return Array.isArray(L) ? L : [];
}

(async () => {
  const [co, ut, facts, sol] = await Promise.all([
    allar('fyrirtaeki?select=id,nafn,er_i_thjonustu&deleted_at=is.null&order=id'),
    allar('uttaeki?select=id,fyrirtaeki_id&status=eq.active&order=id'),
    allar('arsskodun_report_facts?select=fyrirtaeki_id,report_year,total_devices,parse_ok&order=fyrirtaeki_id'),
    allar('solur?select=customer_id,created_at,linur,is_credit,status&order=created_at.desc'),
  ]);

  const profill = new Map();
  ut.forEach(u => { if (u.fyrirtaeki_id == null) return; const k = String(u.fyrirtaeki_id); profill.set(k, (profill.get(k) || 0) + 1); });

  const skyrsla = new Map();
  facts.forEach(f => { if (f.total_devices != null) skyrsla.set(String(f.fyrirtaeki_id), { n: +f.total_devices, ar: f.report_year, ok: f.parse_ok }); });

  // Síðasta gilda sala per fyrirtæki (ekki kredit, ekki void/drög).
  const reikn = new Map();
  sol.forEach(s => {
    if (s.is_credit || s.status === 'void' || s.status === 'drog') return;
    const k = String(s.customer_id);
    if (reikn.has(k)) return;                      // listinn er nýjast-fyrst
    const L = linurAf(s);
    if (!L.length) return;
    let n = 0, aTaeki = false;
    L.forEach(l => { if (taekiAfLinu(l.desc)) { n += (+l.qty || 0); aTaeki = true; } });
    if (aTaeki) reikn.set(k, { n, dags: String(s.created_at).slice(0, 10) });
  });

  if (EITT != null) {
    const k = String(EITT);
    const c = co.find(x => x.id === EITT);
    console.log('\nfid ' + EITT + '  ' + (c ? c.nafn : '(ekki til)'));
    console.log('  PRÓFÍLL     ' + (profill.get(k) ?? '—') + ' tæki');
    const sk = skyrsla.get(k);
    console.log('  SKÝRSLA     ' + (sk ? sk.n + ' tæki  (' + sk.ar + (sk.ok ? '' : ', parse_ok=false') + ')' : '— engin skýrslutala'));
    const re = reikn.get(k);
    console.log('  REIKNINGUR  ' + (re ? re.n + ' tæki  (' + re.dags + ')' : '— engin sala með tækjalínum'));
    return;
  }

  // Aðeins fyrirtæki í þjónustu — hin eiga ekki að bera þessa kröfu.
  const iThj = co.filter(c => c.er_i_thjonustu);
  let allar3 = 0, tvaer = 0, ein = 0, engin = 0;
  const stemmir = [], vikur = [];

  iThj.forEach(c => {
    const k = String(c.id);
    const p = profill.get(k), s = skyrsla.has(k) ? skyrsla.get(k).n : null, r = reikn.has(k) ? reikn.get(k).n : null;
    const til = [p, s, r].filter(x => x != null && x > 0).length;
    if (til === 3) allar3++; else if (til === 2) tvaer++; else if (til === 1) ein++; else engin++;
    if (til < 3) return;
    if (p === s && s === r) stemmir.push({ c, p, s, r });
    else vikur.push({ c, p, s, r });
  });

  console.log('TRÍÓ-MÆLITÆKIÐ — fyrirtæki í þjónustu: ' + iThj.length + '\n');
  console.log('  Allar ÞRJÁR heimildir til:        ' + allar3);
  console.log('    ...og allar SAMMÁLA:            ' + stemmir.length
    + (allar3 ? '   (' + Math.round(stemmir.length / allar3 * 100) + '%)' : ''));
  console.log('    ...ein eða fleiri VÍKUR:        ' + vikur.length);
  console.log('  Tvær heimildir til:               ' + tvaer);
  console.log('  Ein heimild:                      ' + ein);
  console.log('  Engin heimild:                    ' + engin);

  /* PRÓFÍLL vs SKÝRSLA — sterkari mælirinn og hann á fleiri fyrirtæki.
     Mælt 01.09.2026: af 45 sem víkja í tríóinu eru 36 „reikningur víkur" og
     prófíll+skýrsla sammála. Það er EÐLILEGT: reikningur nær yfir það sem var
     þjónustað þann daginn, ekki allt sem stendur í húsinu. Tækjatalan sjálf
     stendur og fellur með hinum tveimur, svo þær eiga sinn eigin mæli. */
  let ps = 0, psStemmir = 0, psVikur = [];
  iThj.forEach(c => {
    const k = String(c.id);
    const p = profill.get(k), s = skyrsla.has(k) ? skyrsla.get(k).n : null;
    if (p == null || s == null || p === 0 || s === 0) return;
    ps++;
    if (p === s) psStemmir++; else psVikur.push({ c, p, s });
  });
  console.log('');
  console.log('  PRÓFÍLL vs SKÝRSLA (báðar til):     ' + ps);
  console.log('    ...sammála:                     ' + psStemmir
    + (ps ? '   (' + Math.round(psStemmir / ps * 100) + '%)' : ''));
  console.log('    ...víkja:                       ' + psVikur.length);
  if (psVikur.length) {
    const stort = psVikur.filter(v => Math.abs(v.p - v.s) >= 5).length;
    console.log('       þar af 5+ tækja munur:       ' + stort);
  }

  if (vikur.length) {
    const mynstur = { 'prófíll víkur': 0, 'skýrsla víkur': 0, 'reikningur víkur': 0, 'allar ólíkar': 0 };
    vikur.forEach(v => {
      if (v.s === v.r && v.p !== v.s) mynstur['prófíll víkur']++;
      else if (v.p === v.r && v.s !== v.p) mynstur['skýrsla víkur']++;
      else if (v.p === v.s && v.r !== v.p) mynstur['reikningur víkur']++;
      else mynstur['allar ólíkar']++;
    });
    console.log('\n  HVER VÍKUR (af ' + vikur.length + '):');
    Object.entries(mynstur).forEach(([k, v]) => console.log('    ' + String(v).padStart(5) + '  ' + k));
  }

  if (LISTI && vikur.length) {
    console.log('\n  prófíll  skýrsla  reikn.  fyrirtæki');
    console.log('  ───────  ───────  ──────  ─────────────────────────────────────');
    vikur.sort((a, b) => Math.abs(b.p - b.s) - Math.abs(a.p - a.s)).forEach(v =>
      console.log('  ' + String(v.p).padStart(7) + String(v.s).padStart(9) + String(v.r).padStart(8)
        + '  ' + String(v.c.nafn).slice(0, 40) + '  (fid ' + v.c.id + ')'));
  } else if (vikur.length) {
    console.log('\n  `--listi` sýnir hvert þeirra.');
  }
})().catch(e => { console.error('VILLA:', e.message); process.exitCode = 1; });
