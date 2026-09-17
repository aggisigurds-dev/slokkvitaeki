#!/usr/bin/env node
/**
 * audit-vinnublad-an-solu — SAMÞYKKT VINNUBLAÐ VERÐUR AÐ ENDA Í SÖLU.
 *
 * Af hverju þessi vörður er til (17.09.2026):
 *   Agnar spurði af hverju Grasnytjar ehf Hjarðarbóli hefði ekki farið í kröfu.
 *   Vinnublaðið var samþykkt af honum sjálfum 13.09 kl. 16:01 og merkt klárað —
 *   en ENGIN sala var nokkurn tímann stofnuð. Sama átti við um tvö önnur blöð,
 *   öll samþykkt sama dag. Samtals 270.654 kr án vsk sem enginn rukkaði.
 *
 *   Orsökin er ekki gleymska heldur að takkinn gerir ekki það sem hann virðist
 *   gera: „✓ Samþykkja" skrifar aðeins stöðu og tímastimpil á `sara_yfirferd`
 *   (368:2412) og tilkynningin segir „Sara MÁ klára skýrslu og reikning".
 *   Samþykktin er leyfi, ekki aðgerð. Ekkert býr til sölu og ekkert minnti á það.
 *
 * Reglan sem vörðurinn ver:
 *   Vinnublað sem er samþykkt eða merkt klárað á að eiga sölu. Eigi það enga
 *   sölu eftir samþykktina er það peningur sem situr fastur — og hann á að
 *   heyrast í, ekki bíða þangað til einhver rekst á hann mánuði síðar.
 *
 * Aðferð: fyrir hvert blað með `samthykkt_at` er leitað að sölu á sama
 * viðskiptavini (customer_base_id fyrirtækisins) frá 30 dögum FYRIR samþykktina.
 * Glugginn er rúmur viljandi — salan er stundum stofnuð á undan samþykktinni.
 *
 * GRUNNLÍNA = 0. Hún má aldrei hækka: hvert tilvik er ógreiddur reikningur.
 * Finnist tilvik sem á EKKI að rukka (t.d. blað sem var fellt) á að setja
 * `stada='hafnad'` á blaðið — ekki hækka töluna hér.
 */
const fs = require('fs');
const path = require('path');

const ROT = path.resolve(__dirname, '..');
const GRUNNLINA = 0;

const cfg = fs.readFileSync(path.join(ROT, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

async function saekja(q) {
  const r = await fetch(`${URL_}/rest/v1/${q}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 140)}`);
  return r.json();
}

const kr = (n) => Math.round(n).toLocaleString('is-IS').replace(/,/g, '.') + ' kr';

(async () => {
  let blod, fyrirtaeki, solur;
  try {
    blod = await saekja('sara_yfirferd?select=id,fyrirtaeki,fyrirtaeki_id,stada,samthykkt_at,samthykkt_by,linur,akstur,akstur_verd,skyrslugerd&samthykkt_at=not.is.null&limit=1000');
    fyrirtaeki = await saekja('fyrirtaeki?select=id,customer_base_id&limit=2000');
    solur = await saekja('solur?select=id,num,customer_base_id,created_at,samtals&limit=1000&order=created_at.desc');
  } catch (e) {
    console.log('⚠️  audit-vinnublad-an-solu: náði ekki í gögn — ' + e.message);
    process.exit(0);                       // net-bilun fellir ekki ýtingu
  }

  const baseAf = new Map(fyrirtaeki.map((f) => [f.id, f.customer_base_id]));
  const solurEftirBase = new Map();
  for (const s of solur) {
    if (s.customer_base_id == null) continue;
    (solurEftirBase.get(s.customer_base_id) || solurEftirBase.set(s.customer_base_id, []).get(s.customer_base_id)).push(s);
  }

  const upphaed = (b) => {
    const linur = Array.isArray(b.linur) ? b.linur : [];
    const l = linur.reduce((s, x) => s + (Number(x.n) || 0) * (Number(x.v) || 0), 0);
    return l + (Number(b.akstur) || 0) * (Number(b.akstur_verd) || 0) + (Number(b.skyrslugerd) || 0);
  };

  const vantar = [];
  for (const b of blod) {
    if (b.stada === 'hafnad') continue;                       // fellt viljandi
    const base = baseAf.get(b.fyrirtaeki_id);
    const t = Date.parse(b.samthykkt_at);
    const mork = t - 30 * 864e5;
    const s = (base == null ? [] : (solurEftirBase.get(base) || []))
      .filter((x) => Date.parse(x.created_at) >= mork);
    if (s.length) continue;
    vantar.push({ b, kr: upphaed(b) });
  }

  if (vantar.length > GRUNNLINA) {
    const alls = vantar.reduce((s, x) => s + x.kr, 0);
    console.log(`❌ RAUTT vinnublöð án sölu: ${vantar.length} samþykkt vinnublöð eiga enga sölu (grunnlína ${GRUNNLINA}).`);
    console.log(`   Samtals ${kr(alls)} án vsk · ${kr(alls * 1.24)} með vsk sem enginn hefur rukkað.`);
    console.log('   „✓ Samþykkja" skrifar aðeins stöðu — hún býr ENGA sölu til (368:2412).\n');
    vantar.sort((a, b) => b.kr - a.kr).forEach(({ b, kr: v }) => {
      console.log(`   ${kr(v).padStart(12)} · ${String(b.fyrirtaeki || '#' + b.fyrirtaeki_id).slice(0, 44).padEnd(46)} samþ. ${String(b.samthykkt_at).slice(0, 10)} af ${b.samthykkt_by || '—'}`);
    });
    process.exit(1);
  }
  console.log(`✅ GRÆNT vinnublöð án sölu: öll ${blod.length} samþykkt vinnublöð eiga sölu.`);
})();
