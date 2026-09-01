#!/usr/bin/env node
/* Lagar `last_insp` í árinu 40xx á FC-tækjum → 20xx.
 *
 * FUNDIÐ 01.09.2026 þegar Agnar sendi reikning fyrir Austurberg 2-4-6 og
 * tækin þar báru `last_insp = 4026-03-01` — árið fjögur þúsund tuttugu og sex.
 *
 * MÆLT UMFANG: 1.271 raðir af 5.597 (122 fyrirtæki). ALLAR bera serial með
 * `FC`-forskeyti — þ.e. þær urðu til í factcheck-keyrslu, ekki í appinu.
 * `4026` × 954 · `4025` × 317.
 *
 * AF HVERJU ÞETTA ER ÓTVÍRÆTT og þarf enga dómgreind:
 *   • `next_insp` er ALDREI skemmt (0 af 1.271).
 *   • `40xx → 20xx` gefur nákvæmlega ár á undan `next_insp` í ÖLLUM 1.271.
 *   • Ekkert annað serial-forskeyti kemur við sögu.
 * Þrjú sjálfstæð einkenni sem öll benda á sama innslátt. Þetta er innsláttar-
 * villa í einni keyrslu, ekki gagnaflækja.
 *
 * AFLEIÐING ÓLAGAÐ: hvaðeina sem les „hvenær var þetta síðast skoðað" fær
 * ártal 2000 árum í framtíðinni. `next_insp` er rétt, svo útrunna-mælirinn
 * sleppur — en sagan, skýrslur og hvers kyns „síðast" er röng.
 *
 *   node tools/laga-fc-dagsetningar.cjs            # SÝNIR bara, breytir engu
 *   node tools/laga-fc-dagsetningar.cjs --keyra    # framkvæmir
 *   node tools/laga-fc-dagsetningar.cjs --bakka <skra.json>
 *
 * Afrit er ALLTAF skrifað áður en nokkru er breytt.
 * Vörður: tools/audit-dagsetningar.cjs
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'content-type': 'application/json' };

const KEYRA = process.argv.includes('--keyra');
const BAKKA = (() => { const i = process.argv.indexOf('--bakka'); return i > -1 ? process.argv[i + 1] : null; })();

const omogulegt = x => { const y = +String(x || '').slice(0, 4); return !!y && (y < 1990 || y > 2100); };

async function allar(q) {
  let out = [], from = 0;
  for (;;) {
    const r = await fetch(`${URL_}/rest/v1/${q}&offset=${from}&limit=1000`, { headers: H });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
    const d = await r.json();
    if (!d.length) break;
    out = out.concat(d);
    if (d.length < 1000) break;
    from += 1000;
  }
  return out;
}

(async () => {
  if (BAKKA) {
    const gomul = JSON.parse(fs.readFileSync(BAKKA, 'utf8'));
    console.log(`Skila ${gomul.length} röðum í fyrri stöðu úr ${BAKKA}`);
    let n = 0;
    for (const u of gomul) {
      const r = await fetch(`${URL_}/rest/v1/uttaeki?id=eq.${u.id}`, {
        method: 'PATCH', headers: H, body: JSON.stringify({ last_insp: u.last_insp }),
      });
      if (r.ok) n++;
      process.stdout.write(`\r  ${n}/${gomul.length}`);
    }
    console.log(`\nSkilað: ${n}`);
    return;
  }

  const ut = await allar('uttaeki?select=id,serial,fyrirtaeki_id,last_insp,next_insp&order=id');
  const val = ut.filter(u => omogulegt(u.last_insp));

  /* ÖRYGGISSKORÐUR — allar þrjár verða að halda, annars er þetta ekki sama
     villan og var mæld og þá á ekki að keyra blint. */
  const ekkiFC = val.filter(u => !/^FC/.test(String(u.serial || '')));
  const nextIllt = val.filter(u => omogulegt(u.next_insp));
  const passarEkki = val.filter(u => {
    const lagad = String(u.last_insp).replace(/^40/, '20');
    const d = new Date(lagad + 'T00:00:00Z');
    if (isNaN(d)) return true;
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    return d.toISOString().slice(0, 10) !== String(u.next_insp);
  });

  console.log(`Tæki alls:                 ${ut.length}`);
  console.log(`Með ómögulegt last_insp:   ${val.length}`);
  console.log(`  ...serial ekki FC-:      ${ekkiFC.length}`);
  console.log(`  ...next_insp líka illt:  ${nextIllt.length}`);
  console.log(`  ...40xx→20xx passar EKKI ári á undan next_insp: ${passarEkki.length}`);

  if (ekkiFC.length || nextIllt.length || passarEkki.length) {
    console.error('\nSTOPP — þetta er ekki sama villan og var mæld 01.09.2026.');
    console.error('Skoðaðu frávikin áður en nokkru er breytt.');
    [...ekkiFC, ...nextIllt, ...passarEkki].slice(0, 8).forEach(u =>
      console.error(`  ${u.id} ${u.serial} ${u.last_insp} -> ${u.next_insp}`));
    process.exit(1);
  }

  const eftirAri = {};
  val.forEach(u => { const k = String(u.last_insp).slice(0, 4); eftirAri[k] = (eftirAri[k] || 0) + 1; });
  console.log(`\nÁr sem lagast: ${Object.entries(eftirAri).map(([k, v]) => `${k}→${k.replace(/^40/, '20')} (${v})`).join(' · ')}`);
  console.log(`Fyrirtæki sem snerta: ${new Set(val.map(u => u.fyrirtaeki_id)).size}`);
  console.log('\nFimm fyrstu:');
  val.slice(0, 5).forEach(u => console.log(
    `  ${String(u.id).padEnd(7)}${String(u.serial).padEnd(20)}${u.last_insp} → ${String(u.last_insp).replace(/^40/, '20')}`));

  if (!KEYRA) {
    console.log('\nEkkert var breytt. Bættu við --keyra til að framkvæma.');
    return;
  }

  const bakk = path.join(__dirname, `bakk-fc-dagsetningar-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(bakk, JSON.stringify(val.map(u => ({ id: u.id, last_insp: u.last_insp })), null, 1));
  console.log(`\nAfrit: ${bakk}`);

  // Hópað eftir dagsetningu svo þetta séu tugir kalla en ekki 1.271.
  const hopar = new Map();
  val.forEach(u => {
    const nytt = String(u.last_insp).replace(/^40/, '20');
    if (!hopar.has(nytt)) hopar.set(nytt, []);
    hopar.get(nytt).push(u.id);
  });

  let n = 0;
  for (const [nytt, ids] of hopar) {
    for (let i = 0; i < ids.length; i += 100) {
      const c = ids.slice(i, i + 100);
      const r = await fetch(`${URL_}/rest/v1/uttaeki?id=in.(${c.join(',')})`, {
        method: 'PATCH', headers: { ...H, Prefer: 'return=representation' },
        body: JSON.stringify({ last_insp: nytt }),
      });
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
      n += (await r.json()).length;
      process.stdout.write(`\r  ${n}/${val.length}`);
    }
  }
  console.log(`\nLagað: ${n}`);

  // Lesa til baka — „vistað" án lesturs er ekki sannreynt.
  const eftir = (await allar('uttaeki?select=id,last_insp&order=id')).filter(u => omogulegt(u.last_insp));
  console.log(`Eftir stendur með ómögulega dagsetningu: ${eftir.length}`);
  console.log(`Til baka:  node tools/laga-fc-dagsetningar.cjs --bakka "${bakk}"`);
})().catch(e => { console.error('VILLA:', e.message); process.exit(1); });
