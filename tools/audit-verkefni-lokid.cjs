#!/usr/bin/env node
'use strict';
/* Öryggisnet — VERK SEM ER LOKIÐ MÁ EKKI STANDA OPIÐ (07.11.2026).
 *
 * MÆLT 07.11.2026: af 117 opnum verkum voru SEX þegar kláruð. Fjögur þeirra fundust á einn
 * og sama háttinn — `git log --all --grep=<verk-id>`. Commit-skilaboðin nefndu verk-id-ið
 * orðrétt (337e95a3, 839dcda7, 614e99a5, 76d710c6), en ekkert ferli lokaði verkinu á
 * listanum. Þrjú af þeim fjórum voru meira að segja merkt „ENNÞÁ OPIД í yfirferðinni
 * 03.11 — hún leitaði í KÓÐANUM en ekki í commit-SÖGUNNI eftir id-inu.
 *
 * 664205fc stóð opið í 41 dag eftir að því var lokið. Kostnaðurinn er ekki villa heldur
 * endurtekin vinna: næsti maður les verkið, mælir það upp á nýtt og kemst að því sama.
 * Agnar: „Búinn að þurfa að greina svo margt oft sama hlutinn."
 *
 * Vörðurinn keyrir þessa einu grep yfir alla söguna fyrir hvert opið verk. Hann SKRIFAR
 * EKKERT — hann segir aðeins hvaða verk ber commit sem nefnir það.
 *
 * ÞAÐ SEM VÖRÐURINN GETUR EKKI: commit sem nefnir verkið ER EKKI sönnun þess að verkinu
 * sé lokið — það gæti verið hálfnað, eða commitið gæti aðeins vitnað í það. Þess vegna er
 * útkoman LISTI TIL YFIRFERÐAR, ekki sjálfvirk lokun. Grunnlínan geymir þau sem hafa verið
 * skoðuð og standa réttilega opin.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

/* HVAÐ GETUR BLINDAÐ VÖRÐINN (mælt 08.11.2026): commit-skilaboð sem VITNA í opin verk-id
 * í mælingarsamhengi. Commit e64c7f59 („Verkefnalistinn flokkadur") skráði hvaða mælingar
 * breyta forsendu hvers verks og nefndi ellefu OPIN id orðrétt. Vörðurinn gat ekki greint
 * tilvitnun frá verklokum — eins og hausinn hér að ofan segir sjálfur — og fór rauður á
 * öllum ellefu. Enginn þeirra var búinn.
 *
 * LÆRDÓMUR FYRIR NÆSTA COMMIT: mælingin á að fara í `claude_notes` á verkinu, ekki í
 * commit-skilaboðin. Þar les næsta lota hana hvort sem er, og þá heldur þetta merki gildi
 * sínu. Nefndu opið verk-id í commiti AÐEINS þegar commitið vinnur verkið. */

// Verk sem BERA commit en standa réttilega opin (skoðuð í höndunum). id → hvers vegna.
const GRUNNLINA = {
  // Ellefu úr commit e64c7f59 (08.11.2026) — tilvitnun, ekki verklok. Mælingin sjálf er
  // komin í claude_notes á hverju verki; commitið endurtók hana aðeins í skilaboðunum.
  'a56fdd5f': 'e64c7f59 vitnaði í mælingu (2 af 29 fötum í afriti); backup-verkið er ógert',
  'b130b92a': 'e64c7f59 vitnaði í leiðréttingu (drive-download er lifandi); 7 dauð föll eftir',
  '51bfbc07': 'e64c7f59 sagði að tillögu um flokk væri hafnað; heimsóknirnar eru ógerðar',
  '13d91414': 'e64c7f59 vitnaði í mælingu (13 = 10 + 3 ranglega skráðar skýrslur); ógert',
  '44d2bdb3': 'e64c7f59 sagði að tillögu um flokk væri hafnað; grænu hökin eru ógerð',
  'e3d85beb': 'e64c7f59 vitnaði í T=S eftir tegund (20 félög víkja); samræmingin er ógerð',
  '074f0228': 'e64c7f59 vitnaði í að forsendan væri fallin; 6 skrifleiðir skrifa enn ok',
  'd79997c1': 'e64c7f59 vitnaði í 15 afrit með 197.407 kr mun; endurgerðin er ógerð',
  'fad496c9': 'e64c7f59 vitnaði í að föllin séu 10, ekki 5; gáttin er enn default-open',
  '03b364f7': 'e64c7f59 vitnaði í 142 faldar raðir (ekki 51); yfirferðin er ógerð',
  '244bdb0f': 'e64c7f59 vitnaði í að þáttarinn lesi Athugasemdir þegar; dálkarnir vantar',
};

const CFG = fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8');
const nad = (re) => { const m = re.exec(CFG); return m ? m[1] : null; };
const URL_ = nad(/SUPABASE_URL\s*=\s*['"]([^'"]+)/);
const KEY = nad(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/);
if (!URL_ || !KEY) { console.log('RED: fann ekki SUPABASE_URL/KEY í js/config.js'); process.exit(1); }

const REPO = path.join(__dirname, '..');

function commitSemNefnir(id) {
  try {
    const ut = execFileSync('git', ['log', '--all', '--oneline', '--grep=' + id, '-i', '--max-count=3'],
      { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return ut ? ut.split('\n') : [];
  } catch (_) { return null; }   // null = ÓMÆLT (git svaraði ekki), aldrei tómur listi
}

(async () => {
  const r = await fetch(URL_ + '/rest/v1/verkefnalisti?select=id,title,status,created_at'
    + '&status=in.(beidni,i_yfirferd)&order=created_at', {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY } });
  if (!r.ok) { console.log('RED: verkefnalisti svaraði ekki (HTTP ' + r.status + ') — ÓMÆLT, ekki grænt.'); process.exit(1); }
  const verk = await r.json();
  if (!Array.isArray(verk) || !verk.length) {
    console.log('RED: engin opin verk lásust — tómt svar er ekki staðreynd. Athugaðu lykilinn.');
    process.exit(1);
  }

  const fundin = [];
  let omaelt = 0;
  for (const v of verk) {
    const id8 = String(v.id).slice(0, 8);
    if (GRUNNLINA[id8]) continue;
    const c = commitSemNefnir(id8);
    if (c === null) { omaelt++; continue; }
    if (c.length) fundin.push({ v, id8, c });
  }

  if (omaelt) console.log('   ⚠ ÓMÆLT: ' + omaelt + ' verk — git svaraði ekki fyrir þau.');

  if (fundin.length) {
    fundin.forEach(({ v, id8, c }) => {
      console.log('  ✗ ' + id8 + ' „' + String(v.title || '').slice(0, 58) + '"');
      c.forEach((l) => console.log('        ' + l));
    });
    console.log('RED: ' + fundin.length + ' opið verk ber commit sem nefnir það — líklega búið en aldrei lokað.');
    console.log('HVAÐ Á AÐ GERA: lestu commitið. Sé verkinu lokið, settu status=klarad með sönnunarlínu í '
      + 'claude_notes („— Lokað <dags> (Claude): commit <hash> …"). Standi það réttilega opið (commitið '
      + 'var hálfnað eða vitnaði bara í verkið), settu id-ið í GRUNNLINA hér með ástæðu.');
    console.log('Ekki loka verki án þess að lesa commitið — commit sem nefnir verk er vísbending, ekki sönnun.');
    process.exitCode = 1;
  } else {
    console.log('✅ GRÆNT verkefni-lokið: ekkert af ' + (verk.length - omaelt) + ' opnum verkum ber commit sem nefnir það'
      + (omaelt ? ' (' + omaelt + ' ÓMÆLT)' : '') + '.');
  }
})().catch((e) => { console.log('RED: audit-verkefni-lokid sprakk: ' + e.message); process.exitCode = 1; });
