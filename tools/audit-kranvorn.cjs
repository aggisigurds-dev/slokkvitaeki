#!/usr/bin/env node
/* Vörður — KRANVÖRNIN má ekki slakna (21.11.2026, Áfangi 4 í hreinsun Þjónustuborðsins).
 *
 * Hvers vegna vörnin er til: mælt 20.11.2026 að ~310 ný mál komu á borðið á 21 degi og
 * aðeins 2 af þeim frá manni. Hreinsun borðsins (166 -> 158) er horfin eftir þrjár vikur
 * án þessa. Vörnin liggur í GRUNNINUM (sql/kranvorn.sql) af því að stærsti kraninn,
 * `ai-uppfaerslur`, keyrir á annarri vél og er ekki í þessu repói.
 *
 * RAUTT ef: einhver af fimm reglunum (a–e) er horfin úr sql/kranvorn.sql, rofinn
 * (kranvorn_af/kranvorn_a) er farinn, höfnun á Verkefnalistanum er orðin `raise exception`
 * aftur (þá rúllar hún eigin annálsfærslu til baka og textinn sem lotan vildi skrá tapast —
 * mælt: 5 log-færslur af 6), eða [AGNAR]-merkið er fallið úr netlify/functions/afgreidsla.cjs
 * (þá hætta takkarnir í Afgreiðslu að geta sett verk á Verkefnalistann).
 *
 * Kyrrstæður vörður: les skrár, nær hvorki í net né grunn. Sjá sql/kranvorn-prof.sql
 * fyrir prófið sem var keyrt á raungrunninum (17 mælingar, allar grænar).
 */
const fs = require('fs');
const path = require('path');

const ROT = path.join(__dirname, '..');
const brot = [];

const les = (p) => { try { return fs.readFileSync(path.join(ROT, p), 'utf8').replace(/\r\n/g, '\n'); } catch (e) { brot.push('fann ekki ' + p); return ''; } };
const sql = les('sql/kranvorn.sql');
const afg = les('netlify/functions/afgreidsla.cjs');

// Reglurnar fimm, hver með merki sem má ekki hverfa.
const REGLUR = [
  ['(a1) sami channel_ref', /where channel_ref = new\.channel_ref/],
  ['(a2) sami ai:lykill', /x like 'ai:lykill:%'/],
  ['(a3) sama félag með sama erindi', /kranvorn_erindi\(title\) = v_erindi/],
  ['(b) verkefnalistaþak', /create trigger kranvorn_verkefnalisti_trg before insert on public\.verkefnalisti/],
  ['(c) vakt -> heilsuspjald', /insert into public\.heilsuspjald\(uppruni, flokkur, titill, texti\)/],
  ['(d) þrisvar mælt -> fyrir Agnar', /kranvorn:fyrir-agnar/],
  ['(e) aldursmörk', /create trigger kranvorn_aldur_trg before insert on public\.thjonustubeidni/],
];
for (const [nafn, re] of REGLUR) if (!re.test(sql)) brot.push('reglan er horfin úr sql/kranvorn.sql: ' + nafn);

// Kveikjan á borðinu sjálf.
if (!/create trigger kranvorn_bord_trg before insert on public\.thjonustubeidni/.test(sql)) brot.push('kranvorn_bord_trg er ekki lengur BEFORE INSERT á thjonustubeidni');

// Aldurs-kveikjan verður að keyra á undan borðs-kveikjunni. Postgres raðar BEFORE-kveikjum
// í stafrófsröð, svo nöfnin verða að halda röðinni aldur < bord.
if (!(/kranvorn_aldur_trg/.test(sql) && 'kranvorn_aldur_trg' < 'kranvorn_bord_trg')) brot.push('nafnaröð kveikjanna heldur ekki aldur fyrir bord');

// Rofinn: Agnar (eða lota) verður að geta slökkt á þessu í einu kalli.
for (const f of ['kranvorn_af', 'kranvorn_a', 'kranvorn_rofi', 'kranvorn_tala']) {
  if (!new RegExp('function public\\.' + f + '\\(').test(sql)) brot.push('rofinn/stillingin vantar: ' + f + '()');
}
if (!/if not public\.kranvorn_rofi\('bord'\) then return new/.test(sql)) brot.push('kranvorn_bord/aldur hlýðir ekki rofanum');
if (!/if not public\.kranvorn_rofi\('verkefnalisti'\) then return new/.test(sql)) brot.push('kranvorn_verkefnalisti hlýðir ekki rofanum');

// Maður sem skrifar sjálfur má ALDREI vera stöðvaður.
const velVardir = (sql.match(/if not v_vel then return new; end if;/g) || []).length;
if (velVardir < 2) brot.push('v_vel-hliðið (maður sleppur alltaf inn) er ekki í bæði kranvorn_aldur og kranvorn_bord');

// Höfnunin má ekki vera raise exception — þá tapast textinn.
const iVerk = sql.indexOf('function public.kranvorn_verkefnalisti()');
const verkFall = iVerk > -1 ? sql.slice(iVerk, sql.indexOf('$function$;', iVerk)) : '';
if (!verkFall) brot.push('fann ekki kranvorn_verkefnalisti() í sql/kranvorn.sql');
if (/raise exception/i.test(verkFall)) brot.push('kranvorn_verkefnalisti kastar villu — þá rúllar höfnunin eigin kranvorn_log-færslu til baka og textinn tapast');
if (!/insert into public\.kranvorn_log/.test(verkFall)) brot.push('kranvorn_verkefnalisti skráir ekki höfnunina í kranvorn_log');

// Ekkert er hafnað þegjandi: hver stöðvun fer í annálinn.
const logFaerslur = (sql.match(/insert into public\.kranvorn_log/g) || []).length;
if (logFaerslur < 4) brot.push('aðeins ' + logFaerslur + ' annálsfærslur í sql/kranvorn.sql — hver fjögurra stöðvunarleiða (aldur, vakt, tvítak, þak) á að skrá sig');

// [AGNAR]-merkið: takkarnir í Afgreiðslu verða að komast framhjá þakinu.
if (!/position\('\[AGNAR\]' in/.test(sql)) brot.push('kranvorn_verkefnalisti hleypir ekki [AGNAR]-merktum verkum inn');
const agnarMerki = (afg.match(/'\[AGNAR\] '/g) || []).length;
if (agnarMerki < 2) brot.push('afgreidsla.cjs setur [AGNAR] á ' + agnarMerki + ' af 2 stöðum (verkefnalistiStofna og „verk"-aðgerðina)');

if (brot.length) {
  console.log('❌ audit-kranvorn: ' + brot.length + ' brot');
  brot.forEach(b => console.log('   • ' + b));
  process.exit(1);
}
console.log('✅ audit-kranvorn: allar 7 reglurnar, rofinn, mannshliðið og [AGNAR]-merkið á sínum stað');
