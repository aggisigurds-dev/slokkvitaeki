#!/usr/bin/env node
/* VÖRÐUR — ómöguleg dagsetning á tæki.
 *
 * VILLAN: 01.09.2026 báru 1.271 tæki af 5.597 `last_insp` í árinu 4025 eða
 * 4026 — tvö þúsund árum í framtíðinni. Öll með `FC`-serial, þ.e. mynduð í
 * factcheck-keyrslu en ekki í appinu. `next_insp` var aldrei skemmt, svo
 * útrunna-mælirinn slapp — en allt sem les „hvenær var þetta síðast skoðað"
 * fékk vitleysu, og enginn sá það því talan birtist hvergi.
 *
 * Það fannst aðeins af því Agnar sendi einn reikning og bað um tæki fyrir
 * hann. Slík villa á ekki að þurfa tilviljun til að finnast.
 *
 * Lagað sama dag (tools/laga-fc-dagsetningar.cjs, afrit
 * tools/bakk-fc-dagsetningar-2026-09-01.json). Þessi vörður fellur rautt ef
 * EIN einasta röð fær ómögulega dagsetningu aftur.
 *
 * Mörkin eru rúm viljandi: 1990–2100. Slökkvitæki frá 1995 er raunverulegt;
 * 4026 er innsláttarvilla. Vörðurinn á að grípa vitleysu, ekki gömul tæki.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

const LAGMARK = 1990, HAMARK = 2100;
const omogulegt = x => { const y = +String(x || '').slice(0, 4); return !!y && (y < LAGMARK || y > HAMARK); };

(async () => {
  let ut = [], from = 0;
  for (;;) {
    const r = await fetch(`${URL_}/rest/v1/uttaeki?select=id,serial,fyrirtaeki_id,last_insp,next_insp&order=id&offset=${from}&limit=1000`, { headers: H });
    // Kastar — tómt safn liti út eins og „engin vandamál".
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
    const d = await r.json();
    if (!d.length) break;
    ut = ut.concat(d);
    if (d.length < 1000) break;
    from += 1000;
  }

  const vond = ut.filter(u => omogulegt(u.last_insp) || omogulegt(u.next_insp));

  if (vond.length) {
    console.log(`❌ ${vond.length} tæki með ómögulega skoðunardagsetningu (${LAGMARK}–${HAMARK} er leyfilegt)\n`);
    const fyr = new Set(vond.map(u => u.fyrirtaeki_id));
    console.log(`   ${fyr.size} fyrirtæki snerta. Fyrstu átta raðirnar:`);
    vond.slice(0, 8).forEach(u => console.log(
      `     ${String(u.id).padEnd(7)}${String(u.serial || '—').padEnd(20)}${u.last_insp} → ${u.next_insp}`));
    console.log('\n   Lagfæring: node tools/laga-fc-dagsetningar.cjs   (sýnir fyrst, --keyra framkvæmir)');
    process.exit(1);
  }

  console.log(`✅ Skoðunardagsetningar heilar — 0 af ${ut.length} tækjum utan ${LAGMARK}–${HAMARK}.`);
  process.exit(0);
})().catch(e => { console.log('❌ Vörðurinn keyrði ekki: ' + e.message); process.exit(1); });
