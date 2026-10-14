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
 */
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';
const FRA = '2026-08-17';

async function get(slod) {
  const r = await fetch(`${SUPA}/rest/v1/${slod}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
  if (!r.ok) throw new Error(slod.split('?')[0] + ' HTTP ' + r.status);
  return r.json();
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
  if (!ids.length) { console.log('✅ GRÆNT: enginn virkur afsláttarhópur — ekkert að dæma.'); return; }

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
  if (brot.length) {
    brot.forEach(b => console.log('  ✗ ' + b));
    console.log('RED: ' + brot.length + ' úttektarlína/-línur hjá félagi í afsláttarhópi án „afsl." — reikningur fór út á fullu verði.');
    process.exit(1);
  }
  console.log('✅ GRÆNT úttekt-afsláttarhópur (gögn): ' + reikn.length + ' úttektir hjá ' + ids.length + ' félögum í hópi, ' + linur + ' af ' + linur + ' línum bera „afsl.".');
})().catch(e => { console.log('RED: vörðurinn hrundi — ' + (e && e.message || e)); process.exit(1); });
