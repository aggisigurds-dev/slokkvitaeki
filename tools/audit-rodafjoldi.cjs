#!/usr/bin/env node
'use strict';
/* RAÐAFJÖLDI VIÐ 1000-ÞAKIÐ — vörðurinn sem static-vörður getur ekki verið.
 *
 * Af hverju hann er til (10.09.2026): `.range(0, 2999)` skilaði 1000 röðum af
 * 1.460 á `fyrirtaeki` — HTTP 200, engin villa. 460 fyrirtæki voru ósýnileg og
 * „✏️ Tengja" á Þjónustuborðinu skrifaði null fyrir hvert þeirra án þess að
 * nokkur tæki eftir því.
 *
 * tools/audit-pagination.cjs ver kóðahliðina en les aðeins KÓÐA — hann veit ekki
 * hvað töflurnar eru stórar. Þrjár töflur voru mældar undir þakinu sama dag og
 * eiga ópagaðar fyrirspurnir í kóðanum:
 *     thjonustubeidni 854 · solur 806 · arsskodun_report_facts 649
 * Daginn sem ein þeirra fer yfir 1000 byrja þær fyrirspurnir að sleppa röðum
 * ÞÖGULT. Ég setti þær ekki í BIG-listann í audit-pagination — það hefði kallað
 * á að hækka BASELINE úr 4 í 22, þ.e. að þagga jafn mörg tilvik og reglan
 * afhjúpaði. Þessi vörður MÆLIR í staðinn og verður RAUÐUR þegar það gerist.
 *
 * UNDANÞÁGA SEM VEX (bætt við sama dag). audit-pagination fór úr BASELINE 4 í 0
 * þegar hver af fjórum þekktum fyrirspurnum fékk MÆLDA ALLOW-ástæðu. Þrjár eru
 * afmarkaðar af einni einingu og vaxa ekki að ráði: ein kennitala (mest 11 raðir)
 * og eitt rekstrarfélag (mest 65). Sú fjórða — „samningar, 360 raðir ALLS" — vex
 * með hverjum nýjum samningi. Ástæða sem var sönn 10.09 yrði ósönn ÞÖGULT daginn
 * sem samningar fara yfir þakið, og ALLOW myndi áfram hleypa fyrirspurninni í
 * gegn. Þess vegna er talan mæld hér í hverri keyrslu í stað þess að henni sé treyst.
 *
 * Talið með publishable-lyklinum (RLS): það er sama sýn og appið hefur, og þar
 * með talan sem skiptir máli fyrir þakið. 0 raðir telst ÓGILD mæling (RLS eða
 * röng sía), aldrei grænt.
 *
 * Keyrsla:  node tools/audit-rodafjoldi.cjs
 *           GRENS=500 node tools/audit-rodafjoldi.cjs     (vöktuðu töflurnar rauðar)
 *           GRENS=300 node tools/audit-rodafjoldi.cjs     (undanþágan líka rauð)
 * Read-only. Þarf net — keyrir í netkeyrslu audit-all, ekki --static.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

const GRENS = Number(process.env.GRENS) || 1000;
const VIDVORUN = Math.round(GRENS * 0.9);

// Töflur UNDIR þakinu sem eiga ópagaðar fyrirspurnir í kóðanum (mælt 10.09.2026).
// Fari tafla yfir: færðu hana í BIG í tools/audit-pagination.cjs og lagaðu það sem
// hann flaggar (DB.fetchAll). Taktu hana þá út héðan.
const VAKTA = ['thjonustubeidni', 'solur', 'arsskodun_report_facts'];

// ALLOW-færslur í tools/audit-pagination.cjs sem hvíla á tölu sem VEX. `slod` er
// nákvæmlega sú afmörkun sem undanþágan lofar að haldist undir þakinu.
const UNDANTHAGUR = [
  { nafn: 'ALLOW samningar (274)', slod: 'customer_documents?select=id&doc_type=eq.samningur' },
];

async function fjoldi(slod) {
  const r = await fetch(`${URL_}/rest/v1/${slod}`, {
    method: 'HEAD',
    headers: { ...H, Prefer: 'count=exact', Range: '0-0' },
  });
  const cr = r.headers.get('content-range') || '';
  const n = parseInt(cr.split('/')[1], 10);
  if (!Number.isFinite(n)) {
    throw new Error(`${slod}: fékk enga talningu (HTTP ${r.status}, content-range „${cr}")`);
  }
  if (n === 0) {
    throw new Error(`${slod}: 0 raðir sjást — RLS felur töfluna eða sían er röng. Mælingin er ógild, ekki græn.`);
  }
  return n;
}

(async () => {
  const yfir = [], brostnar = [], nalaegt = [], stodust = [];
  const lina = (nafn, n) => {
    const eftir = GRENS - n;
    console.log(`   ${nafn.padEnd(24)} ${String(n).padStart(6)}   ` +
      (eftir > 0 ? `${eftir} raðir eftir` : `YFIR um ${-eftir}`));
  };
  for (const t of VAKTA) {
    const n = await fjoldi(`${t}?select=*`);
    lina(t, n);
    if (n >= GRENS) yfir.push(`${t} (${n})`);
    else if (n >= VIDVORUN) nalaegt.push(`${t} (${n})`);
  }
  for (const u of UNDANTHAGUR) {
    const n = await fjoldi(u.slod);
    lina(u.nafn, n);
    if (n >= GRENS) { brostnar.push(`${u.nafn} (${n})`); continue; }
    stodust.push(`${u.nafn.replace(/^ALLOW /, '')} ${n}`);
    if (n >= VIDVORUN) nalaegt.push(`${u.nafn} (${n})`);
  }
  if (yfir.length) {
    console.log(`RED: ${yfir.join(' · ')} komin YFIR ${GRENS}-raða þakið. Ópagaðar fyrirspurnir á ` +
      'þær sleppa nú röðum ÞÖGULT — HTTP 200, engin villa. Færðu töfluna í BIG í ' +
      'tools/audit-pagination.cjs og lagaðu það sem hann flaggar (DB.fetchAll).');
  }
  if (brostnar.length) {
    console.log(`RED: ${brostnar.join(' · ')} komin YFIR ${GRENS}-raða þakið — ALLOW-ástæðan í ` +
      'tools/audit-pagination.cjs er ekki lengur sönn og fyrirspurnin sleppir röðum ÞÖGULT. ' +
      'Taktu færsluna úr ALLOW og blaðsíðuflettu fyrirspurnina (DB.fetchAll).');
  }
  if (yfir.length || brostnar.length) process.exit(1);
  const vid = nalaegt.length ? ` · ⚠ nálægt þakinu: ${nalaegt.join(', ')}` : '';
  console.log(`✅ GRÆNT raðafjöldi: allar vaktaðar töflur undir ${GRENS}-raða þakinu · ` +
    `vaxandi ALLOW-undanþága stenst (${stodust.join(', ')})${vid}`);
})().catch((e) => { console.log('RED: ' + e.message); process.exit(1); });
