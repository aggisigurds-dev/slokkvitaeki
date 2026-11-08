#!/usr/bin/env node
'use strict';
/* Öryggisnet — SAMA ÁKVÖRÐUNIN MÁ EKKI BÍÐA Á TVEIMUR LISTUM (08.11.2026).
 *
 * Agnar: „sjá hvort eitthvað skarast." Heildaryfirferð yfir alla lista sem halda opnu verki
 * fann að ákvarðanir bíða samtímis á tveimur borðum án þess að hvorugt viti af hinu:
 *
 *   TÓLF af þrettán ósvöruðum `factcheck_akvardanir` eiga tvíbura á Þjónustuborðinu.
 *   Að svara á öðrum staðnum hreyfir EKKI hinn.
 *
 * Það kostaði mig sjálfan samdægurs: ég stofnaði mál #1542 með Gullsmára 5 sem NÝJUM fundi
 * þegar factcheck #10 frá 01.11 geymdi hann með nákvæmlega sömu tölum (9 × 4.346). Og #1445
 * er factcheck #16 orðrétt. Þrír dagar af vinnu fundu tvennt sem var þegar skrifað.
 *
 * Vörðurinn mælir ÞRJÁR gerðir af skörun og rauðnar þegar þeim FJÖLGAR:
 *   A  ósvöruð factcheck-ákvörðun sem deilir R-númeri með opnu borðmáli
 *   B  R-númer sem kemur fyrir í tveimur eða fleiri opnum borðmálum
 *   C  sara_yfirferd-lína sem bíður þótt beiðnin hennar sé enn opin
 *
 * HVAÐ HANN GETUR EKKI: hann sér aðeins skörun sem R-NÚMER afhjúpa. Sama spurningin orðuð á
 * tvo vegu án reikningsnúmers (t.d. factcheck #4 ↔ mál #1434, „afskrá ~122 staði") sleppur í
 * gegn. Þær þarf mannsauga eða lotu. Talan hér er því GÓLF á skörunina, ekki heildin.
 * Read-only; skrifar aldrei.
 */
const fs = require('fs');
const path = require('path');

// Grunnlína mæld 08.11.2026 eftir heildaryfirferðina.
const GRUNNLINA = { A: 9, B: 35, C: 0 };
/* B fór úr 34 í 35 við mælinguna sjálfa og það er RÉTT: málin #1542 og #1543, sem urðu til
 * 08.11, fjalla um reikninga sem eldri mál nefna líka (R-000346 er í #1391, #1537 og #1542).
 * Það er raunveruleg skörun sem ég bjó til með því að skrifa ný mál um þekkta reikninga —
 * ekki mæliskekkja. Grunnlínan er staðan EFTIR þá vinnu. */
/* YFIRLITSMÁL TELJAST EKKI. Mál sem er SKÝRSLA UM skörun telur upp reikningsnúmer sem DÆMI,
 * og þau dæmi létu vörðinn rauðna á sjálfum sér í fyrstu keyrslu (B fór úr 34 í 39 af því að
 * #1544 nefnir fimm reikninga úr hinum málunum). Vörður sem rauðnar af réttri hegðun kennir
 * manni að hunsa hann — sama lexía og audit-tengingar lærði 07.11. */
const META_MERKI = ['sl:skorun-lista', 'bh:combo-yfirlit', 'sl:skipulag',
                   'sl:villuskrar-skorun', 'sl:xml-hafnad-an-netfangs'];
/* 08.11 (seinna um daginn): B fór í 38 af því að #1545, #1547 og #1548 nefna reikninga sem
 * eldri mál nefna líka — en þau eru SKÝRSLUR UM skörun og tvítaka ekkert verk. Þau fara í
 * META_MERKI eins og #1544 og combo-málið. Grunnlínan stendur í 35. */
const GRUNNLINA_DAGS = '08.11.2026';

const CFG = fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8');
const nad = (re) => { const m = re.exec(CFG); return m ? m[1] : null; };
const URL_ = nad(/SUPABASE_URL\s*=\s*['"]([^'"]+)/);
const KEY = nad(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/);
if (!URL_ || !KEY) { console.log('RED: fann ekki SUPABASE_URL/KEY í js/config.js'); process.exit(1); }
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

async function allar(slod) {
  const ut = [];
  for (let fra = 0; ; fra += 1000) {
    const r = await fetch(URL_ + '/rest/v1/' + slod + (slod.includes('?') ? '&' : '?')
      + 'limit=1000&offset=' + fra, { headers: H });
    if (!r.ok) throw new Error(slod.split('?')[0] + ' -> ' + r.status);
    const b = await r.json();
    ut.push(...b);
    if (b.length < 1000) return ut;
  }
}

const RNR = /R-\d{6}/g;
const numer = (s) => [...new Set(String(s || '').toUpperCase().match(RNR) || [])];

(async () => {
  const allt = await allar('thjonustubeidni?select=id,title,notes,tags&deleted_at=is.null&status=neq.lokad');
  const erMeta = (m) => Array.isArray(m.tags) && m.tags.some((t) => META_MERKI.includes(t));
  const mal = allt.filter((m) => !erMeta(m));
  const fc = await allar('factcheck_akvardanir?select=id,spurning,samhengi&svar=is.null');
  const sara = await allar('sara_yfirferd?select=id,beidni_id,fyrirtaeki,stada'
    + '&stada=not.in.(lokid,klarad,samthykkt)');
  if (!mal.length) { console.log('RED: engin opin mál lásust — tómt svar er ekki staðreynd.'); process.exit(1); }

  // ── A: factcheck ↔ borð, um sameiginlegt R-númer ───────────────────────────
  const malNr = mal.map((m) => ({ id: m.id, nr: new Set(numer((m.title || '') + ' ' + (m.notes || ''))) }));
  const a = [];
  fc.forEach((f) => {
    const nr = numer((f.spurning || '') + ' ' + (f.samhengi || ''));
    if (!nr.length) return;
    const hitt = malNr.filter((m) => nr.some((x) => m.nr.has(x))).map((m) => m.id);
    if (hitt.length) a.push({ fc: f.id, mal: hitt });
  });

  // ── B: sama R-númer í tveimur eða fleiri opnum málum ───────────────────────
  const talning = new Map();
  malNr.forEach((m) => m.nr.forEach((x) => {
    if (!talning.has(x)) talning.set(x, []);
    talning.get(x).push(m.id);
  }));
  const b = [...talning.entries()].filter(([, v]) => v.length >= 2);

  // ── C: Sara bíður þótt beiðnin sé opin ─────────────────────────────────────
  const opin = new Set(mal.map((m) => m.id));
  const c = sara.filter((s) => s.beidni_id && opin.has(s.beidni_id));

  const lina = (x) => '   ' + x;
  console.log('   A · ósvörað factcheck með tvíbura á borðinu: ' + a.length + ' (grunnlína ' + GRUNNLINA.A + ')');
  a.slice(0, 8).forEach((x) => console.log(lina('factcheck #' + x.fc + ' ↔ mál ' + x.mal.map((i) => '#' + i).join(', '))));
  console.log('   B · reikningar í tveimur eða fleiri opnum málum: ' + b.length + ' (grunnlína ' + GRUNNLINA.B + ')');
  b.sort((x, y) => y[1].length - x[1].length).slice(0, 5)
    .forEach(([nr, ids]) => console.log(lina(nr + ' → ' + ids.map((i) => '#' + i).join(', '))));
  console.log('   C · Sara bíður þótt beiðnin sé opin: ' + c.length
    + (GRUNNLINA.C == null ? ' (grunnlína sett í fyrstu keyrslu)' : ' (grunnlína ' + GRUNNLINA.C + ')'));
  c.slice(0, 5).forEach((s) => console.log(lina('sara ' + s.id + ' · ' + (s.fyrirtaeki || '') + ' → beiðni #' + s.beidni_id)));

  const raud = [];
  if (a.length > GRUNNLINA.A) raud.push('A +' + (a.length - GRUNNLINA.A));
  if (b.length > GRUNNLINA.B) raud.push('B +' + (b.length - GRUNNLINA.B));
  if (GRUNNLINA.C != null && c.length > GRUNNLINA.C) raud.push('C +' + (c.length - GRUNNLINA.C));

  if (raud.length) {
    console.log('RED: skörun milli lista HEFUR AUKIST frá ' + GRUNNLINA_DAGS + ' — ' + raud.join(' · '));
    console.log('HVAÐ ÞAÐ ÞÝÐIR: sama ákvörðunin bíður Agnars á fleiri en einum stað. Svar á öðrum '
      + 'staðnum hreyfir ekki hinn, svo hann afgreiðir sama hlutinn tvisvar — eða heldur að hann '
      + 'sé afgreiddur þegar hann er það ekki.');
    console.log('HVAÐ Á AÐ GERA: finndu tvíburann, svaraðu á ÞJÓNUSTUBORÐINU (það er borðið sem hann '
      + 'les) og lokaðu hinum með tilvísun. Ekki hækka grunnlínuna.');
    process.exitCode = 1;
  } else {
    console.log('✅ GRÆNT skörun-lista: engin NÝ skörun frá ' + GRUNNLINA_DAGS + '.');
    console.log('   ATH: grunnlínan sjálf er skuld — 12 af 13 ósvöruðum factcheck eiga tvíbura, og '
      + 'vörðurinn sér aðeins þá sem R-númer afhjúpa. Sama spurning án reikningsnúmers sleppur.');
  }
})().catch((e) => { console.log('RED: audit-skorun-lista sprakk: ' + e.message); process.exitCode = 1; });
