#!/usr/bin/env node
/* VÖRÐUR — endurnefning sem skilar sér ekki niður í tækin.
 *
 * REGLAN: `uttaeki.client` og `lanstaeki.client` eiga að bera NÚVERANDI
 * `fyrirtaeki.nafn`. Fjöldi skjáa síar tæki á nafni frekar en á FK — t.d.
 * `mapfix.js:66`, `158:71`, `155:72`, `00-legacy:1637`, `89:43`. Reki nafnið
 * í sundur sýna þeir skjáir NÚLL tæki þótt tækin séu til og rétt tengd.
 *
 * VILLAN, mæld 01.09.2026: samfellan ER til í kóða — `14-companies-openedit.js`
 * :209, `157:922` og `00-legacy:2655` keyra öll
 * `.update({client: nafn}).eq('client', oldNafn)` þegar nafni er breytt. En hún
 * hangir á UI-flæðinu. Endurnefningar sem fara BEINT í gagnagrunninn (REST,
 * MCP, SQL) sniðganga hana algjörlega, og það er einmitt leiðin sem notuð er
 * þegar unnið er í lotu með Claude.
 *
 * Bríetartún 9-11 var endurnefnt í „Heimaleiga - Bríetartún 9-11 (húsfélag)"
 * beint í gagnagrunninum 01.09.2026. Tækin 48 báru áfram gamla nafnið og
 * fyrirtækið sýndi NÚLL tæki á nafn-síuðu skjáunum — sama einkenni og
 * status-sían olli, en allt önnur orsök. Þau voru samræmd sama dag.
 *
 * BASELINE 3: þrjú fyrirtæki bera eldra misræmi sem er EKKI frá þessari lotu
 * og þarfnast ákvörðunar Agnars um hvort nafnið sé rétt — sjá listann sem
 * vörðurinn prentar. Þau eru þolin, ekki samþykkt.
 *
 * Vörðurinn horfir á GÖGNIN, ekki kóðann, því hann þarf að grípa endurnefningu
 * hvaðan sem hún kemur — líka þá sem fer aldrei í gegnum appið.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

const LANS_BASELINE = 0;   // 12 lanstaeki, oll med gilt nafn (01.09.2026)
const BASELINE = 3;   // mælt 01.09.2026, eftir að Bríetartún var samræmt

async function allar(q) {
  let ut = [], f = 0;
  for (;;) {
    const r = await fetch(`${URL_}/rest/v1/${q}&offset=${f}&limit=1000`, { headers: H });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
    const d = await r.json();
    if (!d.length) break;
    ut = ut.concat(d);
    if (d.length < 1000) break;
    f += 1000;
  }
  return ut;
}

(async () => {
  const co = await allar('fyrirtaeki?select=id,nafn&deleted_at=is.null&order=id');
  const nafn = new Map(co.map(c => [String(c.id), c.nafn]));

  const rek = new Map();   // fid -> { nafn, brot: Map(client -> fjoldi) }
  const skoda = (radir, tafla) => radir.forEach(u => {
    if (u.fyrirtaeki_id == null) return;
    // Úrelt tæki mega bera gamalt nafn — þau eru söguleg skráning.
    if (u.status === 'urelt') return;
    const n = nafn.get(String(u.fyrirtaeki_id));
    if (!n) return;                       // FK á eytt fyrirtæki — annar vörður
    if ((u.client || '') === n) return;
    if (!rek.has(u.fyrirtaeki_id)) rek.set(u.fyrirtaeki_id, { nafn: n, brot: new Map() });
    const b = rek.get(u.fyrirtaeki_id).brot;
    const lykill = (u.client || '(tómt)') + '  [' + tafla + ']';
    b.set(lykill, (b.get(lykill) || 0) + 1);
  });

  skoda(await allar('uttaeki?select=fyrirtaeki_id,client,status&order=id'), 'uttaeki');

  // `lanstaeki` ber ENGAN fyrirtaeki_id — aðeins nafn-streng (mælt 01.09.2026:
  // id, serial, type, size, status, client, location, loaned_at, notes,
  // created_at). Endurnefning slítur það því alveg, ekki bara sjónrænt, og það
  // er ekki hægt að athuga á FK. Eina prófið sem stendur til boða er hvort
  // nafnið eigi sér enn fyrirtæki. Mælt: 12 lánstæki, öll með gilt nafn → 0.
  const lans = await allar('lanstaeki?select=client,status&order=id');
  const nofn = new Set(co.map(c => c.nafn));
  const munadarlaus = lans.filter(x => x.status !== 'urelt' && x.client && !nofn.has(x.client));

  const n = rek.size;
  const taeki = [...rek.values()].reduce((s, r) => s + [...r.brot.values()].reduce((a, b) => a + b, 0), 0);

  const listi = () => [...rek.entries()]
    .sort((a, b) => [...b[1].brot.values()].reduce((x, y) => x + y, 0) - [...a[1].brot.values()].reduce((x, y) => x + y, 0))
    .forEach(([fid, r]) => {
      console.log(`   fid ${fid} — ${r.nafn}`);
      [...r.brot.entries()].forEach(([c, k]) => console.log(`       ${k} tæki bera enn: ${c}`));
    });

  if (munadarlaus.length > LANS_BASELINE) {
    console.log(`❌ MUNAÐARLAUS LÁNSTÆKI — ${munadarlaus.length} (baseline ${LANS_BASELINE})\n`);
    const t = new Map();
    munadarlaus.forEach(x => t.set(x.client, (t.get(x.client) || 0) + 1));
    [...t.entries()].sort((a, b) => b[1] - a[1]).forEach(([c, k]) => console.log(`   ${k} lánstæki bera nafn sem ekkert fyrirtæki ber lengur: ${c}`));
    console.log('\n   lanstaeki hefur engan fyrirtaeki_id — nafnið er eina tengingin.');
    console.log('   Sé fyrirtæki endurnefnt VERÐUR lanstaeki.client að fylgja með.');
    process.exitCode = 1;
    return;
  }

  if (n > BASELINE) {
    console.log(`❌ ENDURNEFNING SKILAÐI SÉR EKKI — ${n} fyrirtæki (baseline ${BASELINE}), ${taeki} tæki\n`);
    listi();
    console.log('\n   Skjáir sem sía tæki á NAFNI (mapfix.js:66, 158:71, 155:72, 00-legacy:1637,');
    console.log('   89:43) sýna þessi fyrirtæki með NÚLL tæki þótt tækin séu til.');
    console.log('   Samfellan í 14:209 / 157:922 / 00-legacy:2655 keyrir aðeins um appið —');
    console.log('   endurnefning beint í gagnagrunninum sniðgengur hana. Keyrðu þá');
    console.log("   uttaeki.client := fyrirtaeki.nafn fyrir viðkomandi fyrirtaeki_id.");
    process.exitCode = 1;
    return;
  }

  console.log(`✅ Endurnefningar heilar (${lans.length} lanstaeki, ${munadarlaus.length} munadarlaus) — ${n} fyrirtæki með nafn-rek (<= baseline ${BASELINE}), ${taeki} tæki.`);
  if (n) { console.log('   Þolin, ekki samþykkt — bíða ákvörðunar um hvort nafnið sé rétt:'); listi(); }
})().catch(e => { console.log('❌ Vörðurinn keyrði ekki: ' + e.message); process.exitCode = 1; });
