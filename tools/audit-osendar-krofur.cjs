#!/usr/bin/env node
/* VÖRÐUR: unnin vinna má ekki liggja óinnheimt í mánuð (09.09.2026).
 *
 * Agnar: „Það þarf virkilega að laga allllllt svona" — eftir að Blikksmiðurinn hf.
 * (R-000781, 52.669 kr) fannst fyrir tilviljun, þrjár vikur ósend. Mæling sama dag:
 * 694.353 kr af vinnu sat óafgreitt, og STÆRSTI hlutinn gat ALDREI birst í Kröfu
 * yfirlitinu því það síar hart á `greitt_med = 'reikningur'` (166:614).
 *
 * Tveir aðskildir mælikvarðar, báðir með grunnlínu mælda 09.09.2026:
 *
 *   1. GAMLAR ÓSENDAR — `greitt_med='reikningur'`, ógreitt, aldrei sent, eldri en
 *      MORK_DAGAR. Þessar SJÁST í „Ósendar"-sýninni; að þær liggi svo lengi er
 *      verklag, ekki villa — en fjöldinn má ekki vaxa óséður.
 *
 *   2. FÉLÖG SEM SJÁST HVERGI — `greitt_med ≠ 'reikningur'`, ógreitt, aldrei sent.
 *      Þessar eru ÓSÝNILEGAR í yfirlitinu. Ný slík sala er raunveruleg áhætta:
 *      enginn rekst á hana því ekkert borð sýnir hana. (Ný „Sést hvergi"-sýn í 166
 *      birtir þær núna — vörðurinn er belti með þeim axlaböndum.)
 *
 * Kreditfærslur, mæður þeirra, `status='void'` og 0-kr sölur teljast ALDREI með.
 * Lesandi, opinber lykill. Prentar alltaf listann með SÖLUAUÐKENNI (Agnar bað um það).
 */
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

const MORK_DAGAR = 30;
const GRUNNLINA = { gamlarOsendar: 3, felogOsynileg: 12 };

const FELAG = /(ehf|hf|slf|sf|ses|ohf|húsfélag|husfelag|samtök|félag|verktakar|stofa)\b/i;
const kr = n => new Intl.NumberFormat('is-IS').format(Math.round(n));

async function pageAll(pq) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(SUPA + '/rest/v1/' + pq, {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Range: from + '-' + (from + 999) }
    });
    if (!r.ok) throw new Error(pq + ' → ' + r.status + ' ' + (await r.text()).slice(0, 120));
    const d = await r.json();
    out.push(...d);
    if (d.length < 1000) return out;
  }
}

(async () => {
  const all = await pageAll('solur?select=id,num,customer_nafn,customer_id,samtals,greitt_med,status,paid_at,krafa_sent_at,invoiced_at,dk_invoice_id,is_credit,credit_of,created_at&order=id');

  const kreditud = new Set(all.filter(s => s.is_credit && s.credit_of != null).map(s => String(s.credit_of)));
  const lifandi = all.filter(s => !s.is_credit && !kreditud.has(String(s.id)) && s.status !== 'void' && (+s.samtals) > 0);
  const osent = s => !s.paid_at && !s.krafa_sent_at && !s.invoiced_at && !s.dk_invoice_id;
  const aldur = s => Math.floor((Date.now() - new Date(s.created_at)) / 86400000);

  const gamlar = lifandi.filter(s => s.greitt_med === 'reikningur' && osent(s) && aldur(s) > MORK_DAGAR);
  const osyn = lifandi.filter(s => s.greitt_med !== 'reikningur' && osent(s) && FELAG.test(s.customer_nafn || ''));

  const lina = s => '   id ' + String(s.id).padEnd(6) + String(s.num || '—').padEnd(11) +
    String(s.created_at).slice(0, 10) + '  ' + String(s.customer_nafn || '—').slice(0, 28).padEnd(28) +
    String(s.samtals).padStart(9) + ' kr  ' + String(aldur(s)).padStart(3) + ' daga  ' +
    String(s.greitt_med || '—').padEnd(13) + (s.status || '');

  if (gamlar.length) {
    console.log('ÓSENDAR REIKNINGSKRÖFUR eldri en ' + MORK_DAGAR + ' daga (' + gamlar.length + ', ' + kr(gamlar.reduce((a, b) => a + +b.samtals, 0)) + ' kr):');
    gamlar.sort((a, b) => b.samtals - a.samtals).forEach(s => console.log(lina(s)));
  }
  if (osyn.length) {
    console.log('\nFÉLAGASÖLUR SEM SJÁST HVERGI Í KRÖFU YFIRLITI (' + osyn.length + ', ' + kr(osyn.reduce((a, b) => a + +b.samtals, 0)) + ' kr):');
    osyn.sort((a, b) => b.samtals - a.samtals).forEach(s => console.log(lina(s)));
  }

  const brot = [];
  if (gamlar.length > GRUNNLINA.gamlarOsendar) brot.push('gamlar ósendar ' + gamlar.length + ' > grunnlína ' + GRUNNLINA.gamlarOsendar);
  if (osyn.length > GRUNNLINA.felogOsynileg) brot.push('félög sem sjást hvergi ' + osyn.length + ' > grunnlína ' + GRUNNLINA.felogOsynileg);

  if (brot.length) {
    console.log('\n❌ ÓINNHEIMT VEX: ' + brot.join('; ') + '.');
    console.log('   Afgreiddu í „🔍 Sést hvergi"/„Ósendar" í Kröfu yfirliti, eða lækkaðu grunnlínuna hér með rökstuðningi í commit.');
    process.exit(1);
  }
  console.log('\n✅ GRÆNT óinnheimt: ' + gamlar.length + ' gamlar ósendar (grunnlína ' + GRUNNLINA.gamlarOsendar +
    '), ' + osyn.length + ' félög sjást hvergi (grunnlína ' + GRUNNLINA.felogOsynileg + ') — hvorugt vex.');
})().catch(e => { console.error('❌ audit-osendar-krofur villa: ' + e.message); process.exit(1); });
