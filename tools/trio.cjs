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
 *   node tools/trio.cjs --skra     SKRÁIR breytingar í trio_saga + kveikir alarm
 *   node tools/trio.cjs --saga 443 hvað hefur gerst hjá þessu ID
 *
 * LOG-REGISTERIÐ (Agnar 01.09.2026: „tengja alarm ef það breytist á hverju ID
 * sem skráist niður í log register.. svo þú getir síðar komið og greint hvað
 * gerðist"): `--skra` ber hverja tölu saman við SÍÐUSTU skráðu og skrifar röð
 * í `trio_saga` AÐEINS þegar eitthvað hreyfðist. Keyrsla sem finnur ekkert
 * skrifar ekkert — annars drukknaði sagan í eins röðum.
 *
 * ALARMIÐ er `tegund='rofnadi'`: staður sem VAR sammála (prófíll = skýrsla) og
 * er það ekki lengur. Það er eina breytingin sem þýðir alltaf að eitthvað fór
 * úrskeiðis; hinar geta verið eðlileg vinna (ný tæki, ný skýrsla).
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

const LISTI = process.argv.includes('--listi');
const SKRA = process.argv.includes('--skra');
const SAGA = (() => { const i = process.argv.indexOf('--saga'); return i > -1 ? +process.argv[i + 1] : null; })();
const HW = { ...H, 'content-type': 'application/json' };
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
  if (SAGA != null) {
    const r = await fetch(URL_ + '/rest/v1/trio_saga?select=*&fyrirtaeki_id=eq.' + SAGA + '&order=dags.desc', { headers: H });
    if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 160));
    const rows = await r.json();
    const c = await (await fetch(URL_ + '/rest/v1/fyrirtaeki?select=nafn&id=eq.' + SAGA, { headers: H })).json();
    console.log('\nSAGA — fid ' + SAGA + '  ' + ((c[0] && c[0].nafn) || '(ekki til)'));
    if (!rows.length) { console.log('  Engin skráð breyting.'); return; }
    rows.forEach(x => {
      console.log('\n  ' + String(x.dags).slice(0, 16).replace('T', ' ') + '   [' + x.tegund + ']');
      // Sýna aðeins það sem HREYFÐIST — óbreytt tala í sögu er hávaði, og
      // „null" á skjá er ekki svar heldur gloppa. Tómt gildi er —.
      const t = v => (v == null ? '—' : String(v));
      const lidur = (heiti, f, n) => (f === n ? heiti + ' ' + t(n) : heiti + ' ' + t(f) + ' → ' + t(n));
      console.log('    ' + [
        lidur('prófíll', x.fyrri_profill, x.profill),
        lidur('skýrsla', x.fyrri_skyrsla, x.skyrsla),
        lidur('reikningur', x.fyrri_reikningur, x.reikningur),
      ].join('   '));
      if (x.vidvorun) console.log('    ' + x.vidvorun);
    });
    return;
  }

  const [co, ut, facts, sol] = await Promise.all([
    allar('fyrirtaeki?select=id,nafn,er_i_thjonustu&deleted_at=is.null&order=id'),
    /* Í NOTKUN = allt NEMA 'urelt'. Ekki .eq('status','active').
       Mælt 01.09.2026: status ber FJÖGUR gildi — active 4891, urelt 482,
       'Í lagi' 154, 'ok' 74. Sían á 'active' faldi 228 tæki á 17 fyrirtækjum,
       og FJÓRTÁN þeirra eiga ekkert 'active' — þau litu út fyrir að vera
       alveg tóm. Bríetartún (48), Dalbrekka (48) og bílskúrinn (16) eru þar á
       meðal. Patch 129 ber athugasemd um sömu villu: „server-side
       .eq('status','active'), which silently dropped any unit." */
    allar('uttaeki?select=id,fyrirtaeki_id&status=neq.urelt&order=id'),
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

  /* ── LOG-REGISTERIÐ ────────────────────────────────────────────────────────
     Ber hverja tölu saman við SÍÐUSTU skráðu og skrifar röð AÐEINS þegar
     eitthvað hreyfðist. Keyrsla sem finnur ekkert skrifar ekkert — annars
     drukknaði sagan í eins röðum og „hvað gerðist" yrði ólæsilegt.

     ALARMIÐ er `rofnadi`: staður sem VAR sammála og er það ekki lengur. Það er
     eina breytingin sem þýðir alltaf að eitthvað fór úrskeiðis. Hinar geta
     verið eðlileg vinna — ný tæki skráð, ný skýrsla lesin. */
  if (SKRA) {
    const sidustu = new Map();
    let sag = [], from = 0;
    for (;;) {
      const r = await fetch(URL_ + '/rest/v1/trio_saga?select=*&order=dags.desc&offset=' + from + '&limit=1000', { headers: H });
      if (!r.ok) throw new Error('trio_saga ' + r.status + ' ' + (await r.text()).slice(0, 160));
      const d = await r.json();
      if (!d.length) break;
      sag = sag.concat(d);
      if (d.length < 1000) break;
      from += 1000;
    }
    sag.forEach(x => { const k = String(x.fyrirtaeki_id); if (!sidustu.has(k)) sidustu.set(k, x); });

    const nyjar = [];
    iThj.forEach(c => {
      const k = String(c.id);
      const p = profill.get(k) ?? null;
      const sk = skyrsla.has(k) ? skyrsla.get(k).n : null;
      const re = reikn.has(k) ? reikn.get(k).n : null;
      if (p == null && sk == null && re == null) return;   // ekkert að skrá

      const f = sidustu.get(k);
      const stemmirNu = (p != null && sk != null) ? (p === sk) : null;

      if (!f) {
        nyjar.push({
          fyrirtaeki_id: c.id, profill: p, skyrsla: sk, reikningur: re,
          stemmir: stemmirNu, tegund: 'nytt',
          vidvorun: 'Fyrsta mæling: prófíll ' + (p ?? '—') + ' · skýrsla ' + (sk ?? '—') + ' · reikningur ' + (re ?? '—'),
        });
        return;
      }
      if (f.profill === p && f.skyrsla === sk && f.reikningur === re) return;  // óbreytt

      const breyt = [];
      if (f.profill !== p) breyt.push('prófíll ' + (f.profill ?? '—') + ' → ' + (p ?? '—'));
      if (f.skyrsla !== sk) breyt.push('skýrsla ' + (f.skyrsla ?? '—') + ' → ' + (sk ?? '—'));
      if (f.reikningur !== re) breyt.push('reikningur ' + (f.reikningur ?? '—') + ' → ' + (re ?? '—'));

      let teg = 'breyting';
      if (f.stemmir === true && stemmirNu === false) teg = 'rofnadi';
      else if (f.stemmir === false && stemmirNu === true) teg = 'lagadist';

      nyjar.push({
        fyrirtaeki_id: c.id, profill: p, skyrsla: sk, reikningur: re, stemmir: stemmirNu,
        fyrri_profill: f.profill, fyrri_skyrsla: f.skyrsla, fyrri_reikningur: f.reikningur,
        fyrri_dags: f.dags, tegund: teg, vidvorun: breyt.join(' · '),
      });
    });

    console.log('');
    if (!nyjar.length) {
      console.log('  LOG-REGISTER: engin breyting síðan síðast. Ekkert skráð.');
    } else {
      for (let i = 0; i < nyjar.length; i += 100) {
        const r = await fetch(URL_ + '/rest/v1/trio_saga', {
          method: 'POST', headers: HW, body: JSON.stringify(nyjar.slice(i, i + 100)),
        });
        if (!r.ok) throw new Error('skrif ' + r.status + ' ' + (await r.text()).slice(0, 200));
      }
      const eftirTeg = {};
      nyjar.forEach(x => { eftirTeg[x.tegund] = (eftirTeg[x.tegund] || 0) + 1; });
      console.log('  LOG-REGISTER: ' + nyjar.length + ' færslur skráðar í trio_saga');
      Object.entries(eftirTeg).forEach(([t, n]) => console.log('     ' + String(n).padStart(5) + '  ' + t));

      const alarm = nyjar.filter(x => x.tegund === 'rofnadi');
      if (alarm.length) {
        console.log('');
        console.log('  ⚠ ALARM — ' + alarm.length + ' staður/staðir ROFNUÐU (voru sammála, eru ekki lengur):');
        const nafn = new Map(co.map(c => [c.id, c.nafn]));
        alarm.slice(0, 20).forEach(x => console.log('     fid ' + String(x.fyrirtaeki_id).padEnd(6)
          + String(nafn.get(x.fyrirtaeki_id) || '').slice(0, 34).padEnd(36) + x.vidvorun));
        console.log('');
        console.log('     Greina: node tools/trio.cjs --saga <fid>');
        process.exitCode = 1;      // alarm á að sjást í keyrslu, ekki bara í texta
      }
    }
  }
})().catch(e => { console.error('VILLA:', e.message); process.exitCode = 1; });
