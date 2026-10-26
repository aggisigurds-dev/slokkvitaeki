#!/usr/bin/env node
/*
 * audit-afslattur-hopur.cjs — afslátturinn fylgir FÉLAGINU, ekki stakum stað.  26.10.2026
 *
 * Agnar: „sami afslátturinn á að koma sjálfvirkt á alla í sama félagi í 100asta sinn".
 * Hann hafði sagt það áður; villan kom samt aftur af því að ekkert mældi hana.
 *
 * HVERS VEGNA ÞETTA SLEPPUR ÞEGJANDI: `fyrirtaeki.afslattur_pct` er lesinn af sex leiðum
 * (pos.js lookupKt · 114 POS-spjaldið · 129 CtcDiscount.companyPct → 165 reikningurinn ·
 * 142 söluritillinn · 03 Breyta-glugginn · discount-engine) og hver þeirra les EINA röð.
 * Staður sem gleymdist að merkja fer því út á fullu verði og ekkert í viðmótinu segir frá —
 * reikningurinn lítur eðlilega út, bara hærri.
 *
 * MÆLT ÁÐUR EN ÞETTA VAR LAGAÐ (26.10.2026): 8 félög af 24 fjölstaða-félögum báru misjafnan
 * afslátt, 19 staðir á 0 % þótt systurstaður bæri samningsprósentu. Steypustöðin (25 % skv.
 * undirrituðum þjónustusamningi 06.05.2021) hafði Hólabrú, Íshellu og Selfoss á 0 %, og
 * R-001132 (Selfoss, 12.10.2026) fór út án afsláttar — 15.448 kr. án vsk. Heimaleiga var með
 * 9 staði af 10 á núlli.
 *
 * VÖRNIN SJÁLF er í gagnagrunninum (migration `afslattur_fylgir_felaginu`): trigger
 * `fyrirtaeki_afslattur_erfa` (nýr staður erfir) og `fyrirtaeki_afslattur_dreifa` (breyting
 * dreifist). Þessi vörður mælir ÚTKOMUNA, ekki tilvist triggeranna — væru þeir felldir niður
 * myndi rekið byrja aftur og sjást hér.
 *
 * GRUNNLÍNA 0: ekkert fjölstaða-félag ber fleiri en eitt afsláttargildi.
 *
 * Gildran „tómt svar úr RLS" (MAELINGAR.md): lesist engin fjölstaða-félög er það RAUTT, ekki
 * grænt — 24 voru til 26.10.2026.
 *
 * Keyrsla:  node tools/audit-afslattur-hopur.cjs
 * Read-only. Publishable-lykill (sama og audit-uttekt-afslattarhopur-gogn).
 */
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

// 1000-RAÐA ÞAKIÐ: PostgREST skilar aldrei fleiri en 1000 röðum, sama hvað `limit` segir.
// Mælt 26.10.2026 á þessum sama verði: `limit=5000` skilaði 1000 af 1225 fyrirtækjum og
// hann sagði GRÆNT á meðan 225 raðir voru ómældar. Þess vegna er blaðað með Range þar til
// síða kemur hálftóm — og fjöldinn borinn saman við haus þjónsins svo þögult tap sjáist.
async function getAllar(slod) {
  const SIDA = 1000;
  const ut = [];
  for (let fra = 0; ; fra += SIDA) {
    const r = await fetch(`${SUPA}/rest/v1/${slod}`, {
      headers: {
        apikey: KEY, Authorization: `Bearer ${KEY}`,
        Range: `${fra}-${fra + SIDA - 1}`, Prefer: 'count=exact',
      },
    });
    if (!r.ok && r.status !== 206) throw new Error(slod.split('?')[0] + ' HTTP ' + r.status);
    const hluti = await r.json();
    ut.push(...hluti);
    const alls = Number(String(r.headers.get('content-range') || '').split('/')[1]);
    if (hluti.length < SIDA) {
      if (Number.isFinite(alls) && alls !== ut.length) {
        throw new Error(`þjónninn segir ${alls} raðir en ${ut.length} skiluðu sér`);
      }
      return ut;
    }
  }
}

const pct = (r) => Math.max(0, Math.min(100, Number(r.afslattur_pct) || 0));

// Dómurinn sjálfur, aðskilinn frá sókninni svo hægt sé að sanna að RAUÐA greinin virki
// án þess að skrifa á lifandi gögn. Vörður sem hefur aldrei orðið rauður er ósannaður.
function daema(radir) {
  const hopar = new Map();
  for (const r of radir) {
    const b = String(r.customer_base_id);
    if (!hopar.has(b)) hopar.set(b, []);
    hopar.get(b).push(r);
  }
  const fjolstada = [...hopar.values()].filter((g) => g.length > 1);
  const brot = fjolstada
    .filter((g) => new Set(g.map(pct)).size > 1)
    .map((g) => {
      const haesti = Math.max(...g.map(pct));
      const rangir = g.filter((r) => pct(r) !== haesti);
      return '  • ' + (g[0].nafn || '').replace(/ -.*$/, '') + ' (félag ' + g[0].customer_base_id + '): '
        + haesti + '% á ' + (g.length - rangir.length) + ' stöðum en '
        + rangir.map((r) => r.nafn + ' = ' + pct(r) + '%').join(', ');
    });
  return { fjolstada, brot };
}

// --profa: sjálfspróf. Sprautar tilbúnu reki inn í dóminn og krefst þess að hann falli.
if (process.argv.includes('--profa')) {
  const hreint = [{ id: 1, nafn: 'A - einn', customer_base_id: 9, afslattur_pct: 25 },
                  { id: 2, nafn: 'A - tveir', customer_base_id: 9, afslattur_pct: 25 }];
  const rekid = hreint.concat([{ id: 3, nafn: 'A - þrír', customer_base_id: 9, afslattur_pct: 0 }]);
  const a = daema(hreint), b = daema(rekid);
  if (a.brot.length !== 0) { console.log('RED sjálfspróf: hreint mengi dæmdist brotið.'); process.exit(1); }
  if (b.brot.length !== 1 || !/A - þrír = 0%/.test(b.brot[0])) {
    console.log('RED sjálfspróf: rekið mengi fann ekki brotið — RAUÐA greinin er dauð.');
    console.log(JSON.stringify(b.brot)); process.exit(1);
  }
  console.log('✅ sjálfspróf: hreint → 0 brot, einn staður á 0% í 25%-félagi → 1 brot með nafni og prósentu.');
  process.exit(0);
}

(async () => {
  let radir;
  try {
    radir = await getAllar('fyrirtaeki?select=id,nafn,customer_base_id,afslattur_pct'
      + '&deleted_at=is.null&customer_base_id=not.is.null&order=id');
  } catch (e) {
    console.log('RED: náði ekki í fyrirtaeki (' + String((e && e.message) || e).slice(0, 60) + ') — vörðurinn getur ekki dæmt.');
    process.exit(1);
  }

  const { fjolstada, brot } = daema(radir);

  if (fjolstada.length < 20) {
    console.log('RED: aðeins ' + fjolstada.length + ' fjölstaða-félög lásust (24 voru 26.10.2026) — RLS, þak eða lykill? Vörðurinn getur ekki dæmt.');
    process.exit(1);
  }

  if (brot.length) {
    console.log('RED: ' + brot.length + ' félag/félög bera misjafnan afslátt milli staða. Þessir staðir fara út á '
      + 'fullu verði þótt félagið sé með samning — og ekkert í viðmótinu segir frá því:');
    brot.forEach((b) => console.log(b));
    console.log('  Lagfæring: settu rétta prósentu á EINN stað félagsins — triggerinn dreifir henni á hina.');
    process.exit(1);
  }

  console.log('✅ GRÆNT afsláttur-hópur: ' + fjolstada.length + ' fjölstaða-félög, hvert með eitt afsláttargildi á öllum stöðum sínum.');
})();
