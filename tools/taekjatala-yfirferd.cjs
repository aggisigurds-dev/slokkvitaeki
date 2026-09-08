#!/usr/bin/env node
'use strict';
/* TÆKJATALAN — sýnir prófíllinn rétta tölu, og er eitthvað draugabull?
 *
 * Agnar 08.09.2026: „geturðu rennt yfir hvort að öll fyrirtækin inn á ársskoðun
 * sýni rétta tækjatölu, inn í prófíl, miðað við skýrslur, og ekkert draugabull."
 *
 * SEX PRÓF, öll á öllum félögum í þjónustu. Ekkert er skrifað.
 *
 *   1. PRÓFÍLL vs SKÝRSLA — talan sem VIÐMÓTIÐ sýnir á móti
 *      `arsskodun_report_facts`. Talan er reiknuð eins og patch 153 gerir það:
 *      lifandi tæki → skýrslu-búnaður → blob-búnaður. (Fyrsta útgáfa taldi aðeins
 *      `uttaeki` og sagði því 13 félög „tóm" sem sýna réttar tölur úr skýrslunni.)
 *      Skýrslan ræður — tæknimaðurinn taldi á staðnum.
 *   2. MUNAÐARLAUS TÆKI — `fyrirtaeki_id IS NULL`. Þau hverfa úr hverri talningu
 *      sem telur á auðkenni (audit-fk-join ver þessa tölu).
 *   3. STAÐNAÐ NAFN — `uttaeki.client` stemmir ekki við `fyrirtaeki.nafn`.
 *      Þetta er draugurinn frá 08.09: tækið er rétt tengt en var ósýnilegt hverri
 *      leið sem síaði á nafni.
 *   4. TÆKI Á EYDDU FÉLAGI — mjúk-eytt félag sem ber enn lifandi tæki.
 *   5. UPPBLÁSIN TALA — prófíllinn HÆRRI en skýrslan. Fyrsta útgáfa leitaði í
 *      staðinn að tveimur tækjum af sömu tegund innan fimm mínútna og fann 4.245
 *      „tvítök": fjöldainnflutningur skráir tugi tækja á sömu sekúndu, svo það
 *      mynstur mælir ekkert. Talan sem er of há er raunhæfa merkið.
 *   6. VIÐMÓTIÐ SÝNIR NÚLL þótt skýrsla segi tæki.
 *
 *   node tools/taekjatala-yfirferd.cjs           (samantekt)
 *   node tools/taekjatala-yfirferd.cjs --allt    (öll tilvik, ekki bara 15 fyrstu)
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const ALLT = process.argv.includes('--allt');
const TAK = ALLT ? 9999 : 15;

async function sb(q) {
  const r = await fetch(URL_ + '/rest/v1/' + q, { headers: H });
  if (!r.ok) throw new Error(q.slice(0, 60) + ' -> ' + r.status);
  return r.json();
}
async function allar(q) {
  let ut = [], f = 0;
  for (;;) {
    const d = await sb(q + (q.indexOf('?') >= 0 ? '&' : '?') + 'offset=' + f + '&limit=1000');
    if (!d.length) break;
    ut = ut.concat(d);
    if (d.length < 1000) break;
    f += 1000;
  }
  return ut;
}
const p = (x, n) => String(x == null ? '-' : x).padStart(n);
const s = (x, n) => String(x == null ? '-' : x).slice(0, n).padEnd(n);

(async () => {
  const [co, ut, facts, stillingar] = await Promise.all([
    allar('fyrirtaeki?select=id,nafn,kennitala,er_i_thjonustu,ovisst,deleted_at,customer_base_id'),
    allar('uttaeki?select=id,serial,type,size,status,client,fyrirtaeki_id,created_at,notes'),
    allar('arsskodun_report_facts?select=fyrirtaeki_id,report_year,total_devices,equipment'),
    sb('app_settings?select=settings&id=eq.1'),
  ]);
  const ars = (stillingar[0] && stillingar[0].settings && stillingar[0].settings.arsskodun_customers) || {};
  const N = new Map(co.map(c => [c.id, c]));
  const F = new Map(facts.map(f => [f.fyrirtaeki_id, f]));
  const lifandi = ut.filter(u => String(u.status) !== 'urelt');

  // Prófíl-talan EINS OG VIÐMÓTIÐ REIKNAR HANA (sbr. DB.unitsFor og 153):
  // auðkennið ræður, nafnið sækir aðeins munaðarlausar raðir.
  const medFid = new Map();
  const munadarlausEftirNafni = new Map();
  lifandi.forEach(u => {
    if (u.fyrirtaeki_id != null) {
      medFid.set(u.fyrirtaeki_id, (medFid.get(u.fyrirtaeki_id) || 0) + 1);
    } else if (u.client) {
      const k = String(u.client).trim().toLowerCase();
      munadarlausEftirNafni.set(k, (munadarlausEftirNafni.get(k) || 0) + 1);
    }
  });
  // Talan sem VIÐMÓTIÐ sýnir — ekki bara uttaeki-talning. Patch 153 fellur í
  // þrepum: lifandi tæki → skýrslu-búnaður (ferskur, EÐA hvaða ár sem er þegar
  // félagið á engin tæki — reglan frá 08.09) → blob-búnaður. Fyrsta útgáfa
  // þessa tóls taldi aðeins uttaeki og sagði því 13 félög „tóm" sem sýna
  // réttar tölur úr skýrslunni sinni.
  const taekiUrUttaeki = (c) => (medFid.get(c.id) || 0)
    + (munadarlausEftirNafni.get(String(c.nafn || '').trim().toLowerCase()) || 0);
  const summa = (o) => (o && typeof o === 'object')
    ? Object.values(o).reduce((a, v) => a + (+v || 0), 0) : 0;
  const profilTala = (c) => {
    const u = taekiUrUttaeki(c);
    if (u > 0) return u;
    const blob = ars[String(c.id)] || {};
    if (blob.equipment_manual) return summa(blob.equipment);
    const f = F.get(c.id);
    const fEq = f ? summa(f.equipment) : 0;
    if (fEq > 0) return fEq;                 // fersk EÐA eina heimildin
    return summa(blob.equipment);
  };

  const iThjonustu = co.filter(c => !c.deleted_at && (
    c.er_i_thjonustu === true ||
    (ars[String(c.id)] && (ars[String(c.id)].subscribed === true ||
      (ars[String(c.id)].equipment && Object.values(ars[String(c.id)].equipment).some(v => +v > 0)))) ||
    (medFid.get(c.id) || 0) > 0));

  console.log('TÆKJATALAN — ' + iThjonustu.length + ' félög í þjónustu\n');

  // ── 1. Prófíll vs skýrsla ────────────────────────────────────────────────
  const vikja = [];
  iThjonustu.forEach(c => {
    const f = F.get(c.id);
    if (!f || f.total_devices == null) return;
    const skyrsla = +f.total_devices || 0;
    if (!skyrsla) return;                       // 0-skýrsla segir ekkert
    const pr = profilTala(c);
    if (pr !== skyrsla) vikja.push({ c, pr, skyrsla, ar: f.report_year, mismunur: pr - skyrsla });
  });
  vikja.sort((a, b) => Math.abs(b.mismunur) - Math.abs(a.mismunur));
  console.log('1. PRÓFÍLL vs SKÝRSLA — víkja: ' + vikja.length);
  if (vikja.length) {
    console.log('   prófíll  skýrsla   ár   munur  félag');
    vikja.slice(0, TAK).forEach(x => console.log('   ' + p(x.pr, 7) + p(x.skyrsla, 9) + p(x.ar, 5)
      + p((x.mismunur > 0 ? '+' : '') + x.mismunur, 7) + '  ' + s(x.c.nafn, 40) + ' (fid ' + x.c.id + ')'));
    if (vikja.length > TAK) console.log('   … og ' + (vikja.length - TAK) + ' til viðbótar (--allt)');
  }

  // ── 2. Munaðarlaus tæki ──────────────────────────────────────────────────
  const munadarlaus = lifandi.filter(u => u.fyrirtaeki_id == null);
  console.log('\n2. MUNAÐARLAUS TÆKI (fyrirtaeki_id NULL): ' + munadarlaus.length);
  munadarlaus.slice(0, TAK).forEach(u => console.log('   #' + p(u.id, 6) + '  ' + s(u.type, 16)
    + '  client: ' + s(u.client, 38)));

  // ── 3. Staðnað nafn ──────────────────────────────────────────────────────
  const stadnad = [];
  lifandi.forEach(u => {
    if (u.fyrirtaeki_id == null) return;
    const c = N.get(u.fyrirtaeki_id);
    if (!c) return;
    if (String(u.client || '').trim() !== String(c.nafn || '').trim()) {
      stadnad.push({ u, c });
    }
  });
  const stadnadFelog = new Set(stadnad.map(x => x.c.id));
  console.log('\n3. STAÐNAÐ NAFN (uttaeki.client != fyrirtaeki.nafn): '
    + stadnad.length + ' tæki á ' + stadnadFelog.size + ' félögum');
  const eftirFelagi = new Map();
  stadnad.forEach(x => {
    const a = eftirFelagi.get(x.c.id) || { c: x.c, n: 0, daemi: x.u.client };
    a.n++; eftirFelagi.set(x.c.id, a);
  });
  [...eftirFelagi.values()].sort((a, b) => b.n - a.n).slice(0, TAK).forEach(a =>
    console.log('   ' + p(a.n, 4) + ' tæki  fid ' + p(a.c.id, 5) + '  ' + s(a.c.nafn, 34)
      + '  bera: ' + s(a.daemi, 34)));

  // ── 4. Tæki á eyddu félagi ───────────────────────────────────────────────
  const aEyddu = lifandi.filter(u => {
    const c = u.fyrirtaeki_id != null ? N.get(u.fyrirtaeki_id) : null;
    return c && c.deleted_at;
  });
  const eyddFelog = new Set(aEyddu.map(u => u.fyrirtaeki_id));
  console.log('\n4. LIFANDI TÆKI Á MJÚK-EYDDU FÉLAGI: ' + aEyddu.length + ' tæki á ' + eyddFelog.size + ' félögum');
  [...eyddFelog].slice(0, TAK).forEach(id => {
    const c = N.get(id);
    console.log('   fid ' + p(id, 5) + '  ' + s(c && c.nafn, 40) + '  ' + aEyddu.filter(u => u.fyrirtaeki_id === id).length + ' tæki');
  });

  // ── 5. Uppblásin tala — prófíll HÆRRI en skýrsla ────────────────────────
  // Fyrsta útgáfa leitaði að tveimur tækjum af sömu tegund innan 5 mínútna og
  // fann 4.245 „tvítök" — fjöldainnflutningur skráir tugi tækja á sömu sekúndu,
  // svo það mynstur mælir ekkert. Raunhæfa merkið um draugafærslu er að talan
  // sé HÆRRI en tæknimaðurinn taldi.
  const uppblasid = vikja.filter(x => x.mismunur > 0);
  console.log('\n5. UPPBLÁSIN TALA (prófíll > skýrsla): ' + uppblasid.length);
  uppblasid.slice(0, TAK).forEach(x => {
    const raddar = lifandi.filter(u => u.fyrirtaeki_id === x.c.id)
      .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    const sidast = raddar.length ? String(raddar[raddar.length - 1].created_at).slice(0, 10) : null;
    console.log('   fid ' + p(x.c.id, 5) + '  ' + s(x.c.nafn, 36) + '  prófíll ' + p(x.pr, 3)
      + '  skýrsla ' + p(x.skyrsla, 3) + ' (' + x.ar + ')  síðasta tæki skráð ' + sidast);
  });
  // ── 6. Tómur prófíll þótt skýrsla segi tæki ──────────────────────────────
  const tomirMedSkyrslu = iThjonustu.filter(c => {
    const f = F.get(c.id);
    return f && +f.total_devices > 0 && profilTala(c) === 0;
  });
  console.log('\n6. VIÐMÓTIÐ SÝNIR NÚLL ÞÓTT SKÝRSLA SEGI TÆKI: ' + tomirMedSkyrslu.length);
  tomirMedSkyrslu.slice(0, TAK).forEach(c => {
    const f = F.get(c.id);
    console.log('   fid ' + p(c.id, 5) + '  ' + s(c.nafn, 40) + '  skýrsla ' + f.report_year + ': ' + f.total_devices + ' tæki');
  });

  const draugar = munadarlaus.length + stadnad.length + aEyddu.length + uppblasid.length + tomirMedSkyrslu.length;
  console.log('\n' + '─'.repeat(64));
  console.log('SAMANTEKT: ' + vikja.length + ' félög víkja frá skýrslu · ' + draugar + ' draugatilvik alls');
})().catch(e => { console.error('VILLA: ' + e.message); process.exit(1); });
