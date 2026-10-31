#!/usr/bin/env node
/*
 * audit-uttekt-afslattarhopur-gogn.cjs — úttektarreikningar félaga í afsláttarhópi bera afsláttinn (gagnahlutinn).
 *
 * 14.10.2026: systurvörður audit-uttekt-afslattarhopur.cjs (kóðinn í vm). Hér er útkoman lesin:
 * hver `solur` með source='uttekt', status='final', frá 17.08.2026 (fyrsta úttekt eftir að hópar
 * komu inn), á félagi (`customer_id` = fyrirtaeki.id) sem ber VIRKAN `discount_tier_id`, verður að
 * hafa „afsl." í hverri Hleðslu-, Yfirferðar- og Nýtt-línu.
 * GRUNNLÍNA 0: R-000800/803/804/849/852 bera allar „afsl." í 23 af 23 slíkum línum (mælt 14.10.2026).
 *
 * Gildran „tómt svar úr RLS" (MAELINGAR.md): fáist engin félög með hóp er það RAUTT, ekki grænt —
 * 10 félög bera hópinn í dag (192, 193, 195–201, 1627).
 * Read-only. Notar publishable-lykilinn (sama og audit-eyddar-vorur).
 *
 * B-HLUTI (31.10.2026, allsherjar úttekt): vörðurinn þagði um þrjá nýja staði sem fóru á fullu verði af því hann las
 * AÐEINS discount_tier_id (10 félög) — en afsláttur flestra fjölstaða-félaga býr í fyrirtaeki.afslattur_pct (81 félag).
 * Nýr staður var stofnaður með afslattur_pct=0 meðan eldri staðir á sömu kennitölu voru með 15–25 %; rótin var lagfærð
 * 26.10 (19 staðir hækkaðir í einni færslu) en reikningarnir á undan stóðu. B-hlutinn les afslattur_pct og ber hvern
 * stað saman við systurstaði á SÖMU kennitölu:
 *   B1  lifandi staður með 0 % þar sem lifandi systurstaður hefur > 0 %  → RAUTT (stillingin sjálf er röng, grunnlína 0)
 *   B2  úttektarsala (source=uttekt, final, ekki kredit) án afsláttar (afslattur=0 og engin „afsl."-lína) á kt þar sem
 *       systurstaður fékk afslátt á reikningi (hvaða source sem er) sama dag eða fyrr → RAUTT ef ekki á grunnlínu.
 * GRUNNLÍNA B2 = þekktu tilvikin 31.10.2026. Hún má AÐEINS lækka (þegar Agnar hefur leyst tilvik með kredit/úrskurði) —
 * aldrei bæta númeri á hana til að fá grænt.
 */
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const FRA = '2026-08-17';
const FRA_B = '2026-06-01';
// B2-grunnlína (31.10.2026). Hver lína: númer → hvers vegna það stendur. Má aðeins styttast.
const GRUNNLINA_B2 = {
  'R-001132': 'Steypustöðin Selfossi, 25 % (19.156 kr) — greiddur 22.10 (Payday 404), bíður úrskurðar Agnars',
  'R-001071': 'Hertz Flugvellir 11, 15 % (17.108 kr) — ógreiddur (Payday 369), má leiðrétta fyrir greiðslu',
  'R-000996': 'Pitstop Suðurhella, 15 % (6.843 kr) — greiddur 30.09 (Payday 334), bíður úrskurðar Agnars',
  'R-000670': 'Center Hótel Skjaldbreið 03.08 — systurreikningur R-000668 sama dag bar „afsl."; ómetið (fannst 31.10)',
};

async function get(slod) {
  const r = await fetch(`${SUPA}/rest/v1/${slod}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(slod.split('?')[0] + ' HTTP ' + r.status);
  return r.json();
}
async function allar(slod) {
  let out = [];
  for (let fra = 0; ; fra += 1000) {
    const d = await get(slod + '&offset=' + fra + '&limit=1000');
    if (!Array.isArray(d)) throw new Error(slod.split('?')[0] + ' skilaði ekki fylki');
    out = out.concat(d);
    if (d.length < 1000) break;
  }
  return out;
}

// B-hlutinn: afslattur_pct á móti systurstöðum á sömu kennitölu. Skilar { b1, b2, b2thekkt, studlar }.
async function systurstadir() {
  const fy = await allar('fyrirtaeki?select=id,nafn,kennitala,afslattur_pct,deleted_at&order=id');
  if (!fy.length) throw new Error('engin fyrirtaeki lásust — RLS eða lykill?');
  const kt = x => { const d = String(x || '').replace(/\D/g, ''); return d.length === 10 && d !== '9999999999' ? d : null; };
  const byId = new Map(fy.map(f => [f.id, f]));
  const hopar = new Map();
  for (const f of fy) { const k = kt(f.kennitala); if (!k) continue; if (!hopar.has(k)) hopar.set(k, []); hopar.get(k).push(f); }
  const pct = f => Number(f && f.afslattur_pct) || 0;

  const b1 = [];
  let studlar = 0;
  for (const [k, g] of hopar) {
    const lif = g.filter(f => !f.deleted_at);
    if (lif.length < 2) continue;
    const mx = Math.max(...lif.map(pct));
    if (mx > 0) studlar++;
    if (mx > 0) for (const f of lif) if (pct(f) === 0) b1.push('fyrirtaeki ' + f.id + ' „' + String(f.nafn || '').slice(0, 50) + '" 0 % — systurstaður á kt ' + k + ' hefur ' + mx + ' %');
  }

  const solur = await allar('solur?select=num,customer_id,customer_kt,afslattur,linur,is_credit,source,created_at&status=eq.final&created_at=gte.' + FRA_B + '&order=num');
  const afsl = x => (Number(x.afslattur) || 0) > 0 || (Array.isArray(x.linur) && x.linur.some(l => /afsl\./.test(String((l && l.desc) || ''))));
  const ktS = x => kt((byId.get(x.customer_id) || {}).kennitala) || kt(x.customer_kt);
  const medAfsl = solur.filter(x => !x.is_credit && afsl(x));
  const b2 = [], b2thekkt = [];
  for (const x of solur) {
    if (x.source !== 'uttekt' || x.is_credit || afsl(x)) continue;
    const k = ktS(x);
    if (!k) continue;
    const sys = medAfsl.filter(y => y.customer_id !== x.customer_id && ktS(y) === k && y.created_at <= x.created_at);
    if (!sys.length) continue;
    const lina = x.num + ' (fyrirtaeki ' + x.customer_id + ' „' + String((byId.get(x.customer_id) || {}).nafn || '').slice(0, 45) + '", '
      + String(x.created_at).slice(0, 10) + ') án afsláttar — systurreikningur ' + sys.slice(0, 3).map(y => y.num).join(', ') + ' bar afslátt';
    (GRUNNLINA_B2[x.num] ? b2thekkt : b2).push(lina);
  }
  return { b1, b2, b2thekkt, studlar };
}

(async () => {
  const felog = await get('fyrirtaeki?select=id,discount_tier_id&discount_tier_id=not.is.null');
  if (!Array.isArray(felog) || !felog.length) {
    console.log('RED: engin félög með discount_tier_id lásust — RLS eða lykill? (10 voru 14.10.2026). Vörðurinn getur ekki dæmt.');
    process.exit(1);
  }
  const hopar = await get('discount_tiers?select=id,virkt&id=in.(' + [...new Set(felog.map(f => f.discount_tier_id))].join(',') + ')');
  const virkir = new Set(hopar.filter(h => h.virkt !== false).map(h => h.id));
  const ids = felog.filter(f => virkir.has(f.discount_tier_id)).map(f => f.id);
  const B = await systurstadir();
  const skyrslaB = () => {
    B.b1.forEach(b => console.log('  ✗ B1 ' + b));
    B.b2.forEach(b => console.log('  ✗ B2 ' + b));
    if (process.argv.includes('--listi')) B.b2thekkt.forEach(b => console.log('  · B2 á grunnlínu: ' + b));
  };
  const rauttB = () => {
    if (B.b1.length) console.log('RED: ' + B.b1.length + ' lifandi staður/staðir með 0 % afslátt þar sem systurstaður á sömu kt hefur afslátt — næsti reikningur fer á fullu verði.');
    if (B.b2.length) console.log('RED: ' + B.b2.length + ' NÝ úttektarsala/-sölur án afsláttar þar sem systurstaður á sömu kt fékk afslátt (grunnlína ' + Object.keys(GRUNNLINA_B2).length + ' þekkt).');
  };
  const graentB = '· systurstaðir: ' + B.studlar + ' fjölstaða-kt með afslátt, 0 staðir á 0 %, ' + B.b2thekkt.length + '/' + Object.keys(GRUNNLINA_B2).length + ' þekktar sölur á grunnlínu (--listi)';

  if (!ids.length) {
    if (B.b1.length || B.b2.length) { skyrslaB(); rauttB(); process.exit(1); }
    console.log('✅ GRÆNT: enginn virkur afsláttarhópur ' + graentB); return;
  }

  const reikn = await get('solur?select=num,customer_id,linur,is_credit&source=eq.uttekt&status=eq.final'
    + '&created_at=gte.' + FRA + '&customer_id=in.(' + ids.join(',') + ')&order=num');
  const brot = [];
  let linur = 0;
  for (const s of reikn) {
    if (s.is_credit) continue;
    for (const l of (Array.isArray(s.linur) ? s.linur : [])) {
      const d = String((l && l.desc) || '');
      if (!/^(Hleðsla|Yfirferð|Nýtt) ·/.test(d)) continue;
      linur++;
      if (!/afsl\./.test(d)) brot.push(s.num + ' (fyrirtaeki ' + s.customer_id + '): „' + d.slice(0, 70) + '"');
    }
  }
  if (brot.length || B.b1.length || B.b2.length) {
    brot.forEach(b => console.log('  ✗ ' + b));
    skyrslaB();
    if (brot.length) console.log('RED: ' + brot.length + ' úttektarlína/-línur hjá félagi í afsláttarhópi án „afsl." — reikningur fór út á fullu verði.');
    rauttB();
    process.exit(1);
  }
  if (process.argv.includes('--listi')) skyrslaB();
  console.log('✅ GRÆNT úttekt-afsláttarhópur (gögn): ' + reikn.length + ' úttektir hjá ' + ids.length + ' félögum í hópi, ' + linur + ' af ' + linur + ' línum bera „afsl." ' + graentB + '.');
})().catch(e => { console.log('RED: vörðurinn hrundi — ' + (e && e.message || e)); process.exit(1); });
