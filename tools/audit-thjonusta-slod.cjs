#!/usr/bin/env node
'use strict';
/* Öryggisnet — „Í ÞJÓNUSTU" MÁ EKKI BREYTAST FRAMHJÁ YFIRFERÐARSLÓÐINNI (08.11.2026).
 *
 * `fyrirtaeki.er_i_thjonustu` ræður því hvort staður birtist á skoðunarlista, hvort hans er
 * vænst í Ársskoðun og hvort hann telst rukkanlegur. Breyting á honum á að skilja eftir sig
 * röð í `override_log` (field='er_i_thjonustu') — þannig varð slóðin til.
 *
 * MÆLT 08.11.2026: af 131 félögum sem EIGA slíka röð bera 45 núna gildi sem stangast á við
 * NÝJUSTU skráðu breytinguna. Þriðjungur. Það þýðir að til er önnur skrifleið sem skilur
 * ekkert eftir sig.
 *
 * Þetta fannst á einu dæmi og reyndist kerfislægt: JM Veitingar (#585) og Laugavegur 11
 * (#1631) voru teknir úr þjónustu 11.09.2026 kl. 19:51 í máli #907 — sú breyting ER skráð —
 * og settir aftur inn 06.11.2026 á sömu sekúndu, án nokkurrar færslu. Af 13 stöðum í #907
 * eru 11 enn úti. Mál #1449 á borðinu spyr „bóka eða afskrá?" um stað sem er ÞEGAR kominn
 * aftur í þjónustu, af því að enginn sá breytinguna.
 *
 * HVAÐ VÖRÐURINN GETUR EKKI: hann veit ekki hvort ósamræmið er rangt. Breyting getur verið
 * réttmæt og bara óskráð. Hann mælir hvort talan HÆKKI — ný ósamræmi þýða að leiðin er enn
 * opin. Read-only; skrifar aldrei.
 */
const fs = require('fs');
const path = require('path');

const GRUNNLINA = 45;            // mælt 08.11.2026
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
    const r = await fetch(URL_ + '/rest/v1/' + slod + '&limit=1000&offset=' + fra, { headers: H });
    if (!r.ok) throw new Error(slod.split('?')[0] + ' -> ' + r.status);
    const b = await r.json();
    ut.push(...b);
    if (b.length < 1000) return ut;
  }
}

(async () => {
  const log = await allar('override_log?select=co_id,co_nafn,new_value,created_at,page'
    + '&field=eq.er_i_thjonustu&order=created_at.asc');
  if (!log.length) {
    console.log('RED: engin override_log-röð fyrir er_i_thjonustu lásst — tómt svar er ekki staðreynd.');
    process.exit(1);
  }
  // Nýjasta skráða breytingin per félag
  const sidasta = new Map();
  log.forEach((r) => sidasta.set(r.co_id, r));

  const fy = await allar('fyrirtaeki?select=id,nafn,er_i_thjonustu&deleted_at=is.null&order=id');
  const eftirId = new Map(fy.map((f) => [f.id, f]));

  const osam = [];
  sidasta.forEach((r, id) => {
    const f = eftirId.get(id);
    if (!f) return;                                  // eytt félag telst ekki
    const skrad = String(r.new_value) === 'true';
    if (skrad !== !!f.er_i_thjonustu) {
      osam.push({ id, nafn: f.nafn, skrad, nuna: !!f.er_i_thjonustu,
        dags: String(r.created_at).slice(0, 10), page: r.page || '' });
    }
  });

  const ny = osam.length - GRUNNLINA;
  osam.sort((a, b) => (a.dags < b.dags ? 1 : -1));
  osam.slice(0, 12).forEach((o) => console.log('   · #' + o.id + ' ' + String(o.nafn).slice(0, 34)
    + ' — skráð ' + (o.skrad ? 'í þjónustu' : 'úr þjónustu') + ' ' + o.dags
    + ' (' + o.page + '), er núna ' + (o.nuna ? 'í þjónustu' : 'úr þjónustu')));
  if (osam.length > 12) console.log('   … og ' + (osam.length - 12) + ' til viðbótar.');

  if (ny > 0) {
    console.log('RED: ' + osam.length + ' félög bera „í þjónustu" sem stangast á við nýjustu skráðu '
      + 'breytinguna — ' + ny + ' FLEIRI en ' + GRUNNLINA + ' á grunnlínu ' + GRUNNLINA_DAGS + '.');
    console.log('HVAÐ ÞAÐ ÞÝÐIR: einhver skrifleið breytir er_i_thjonustu án þess að skilja eftir sig '
      + 'röð í override_log. Staður sem fer aftur í þjónustu án færslu birtist aftur á skoðunarlista '
      + 'og í Ársskoðun án þess að nokkur sjái hvenær eða hvers vegna.');
    console.log('Ekki hækka grunnlínuna til að þagga niður í verðinum — finndu leiðina.');
    process.exitCode = 1;
  } else {
    console.log('✅ GRÆNT þjónustuslóð: ' + osam.length + ' ósamræmi (grunnlína ' + GRUNNLINA
      + ' frá ' + GRUNNLINA_DAGS + ')' + (ny < 0 ? ' — ' + (-ny) + ' færri en á grunnlínu.' : '.'));
    console.log('   ATH: grunnlínan sjálf er skuld. 45 félög af 131 sem eiga skráða breytingu bera '
      + 'gildi sem stangast á við hana; vörðurinn ver aðeins gegn NÝJUM tilvikum.');
  }
})().catch((e) => { console.log('RED: audit-thjonusta-slod sprakk: ' + e.message); process.exitCode = 1; });
