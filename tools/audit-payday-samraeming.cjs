#!/usr/bin/env node
/* VÖRÐUR: appið og Payday segja sömu sögu um hverja kröfu (13.09.2026, verk 2c9942a5).
 *
 * Cowork 30.08: vörn sem stöðvar kröfu á vartölu greip 0 af 7 raunvillum. Þetta eru
 * prófin sem hefðu fundið þær — keyrð á sölur (solur) á móti Payday-speglinum
 * (payday_invoices_slokk, sem stemmdi upp á krónu við Payday 13.09.2026):
 *
 *   T1 rangur greiðandi    — kt á virkum Payday-reikningi ≠ kt sölunnar
 *   T2 fór aldrei          — sala merkt send og ógreidd, en enginn sendur/greiddur Payday-reikningur
 *   T3 greidd án greiðslu  — sala merkt greidd en enginn Payday-reikningur hennar greiddur
 *                            (rót 13.09: kreditreikningur taldist greiðsla — _payday-greidsla.cjs)
 *   T4 upphæð víkur        — sendur/greiddur Payday-reikningur ≠ samtala sölunnar (> 5 kr og > 0,1 %)
 *   T5 bakfært, enginn nýr — bakfærð sala ≥ 20.000 kr og engin önnur sala á sama viðskiptavin
 *
 * Þekkt frávik standa í KVITTAD með ástæðu sem Agnar getur flett upp (mál á borði eða
 * regla hans). Vörðurinn verður RAUÐUR á NÝJU fráviki. Prentar alltaf öll frávik.
 * Lesandi, opinber lykill.
 */
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

const KVITTAD = {
  'T3:R-000363': 'endurrukkað á ProLan ehf. á sama stað (R-000401, 93.464 kr, greitt 10.07) — sameining staða í máli á borði',
  'T3:R-000407': 'mál #987 — Herbergjaleiga Flatahrauni: nýr reikningur á FF7 eða BJB',
  'T3:R-000415': 'mál #747 — nýr reikningur á Breiðvang 9, húsfélag (640376-0319)',
  'T3:R-000418': 'endurrukkað sem R-000717 (Strandasel 9-11, greitt 18.08) — mál #821',
  'T3:R-000778': 'mál #955 — tvítak R-000740, afturkallað 04.09, ekkert að endurgreiða',
  'T3:R-000017': 'endurgerður sem R-000528 og greiddur (Payday nr. 159)',
  'T3:R-000466': 'prufa 104 kr (Agnar Sigurðsson)',
  'T3:R-000328': 'tvískráning R-000377 (sama hleðsla, greidd í Payday nr. 10)',
  'T4:R-000603': 'mál #891 — Agnar hafnaði endurgreiðslu 11.09',
  'T4:R-000647': 'viðbót eftir að reikningur fór — aldrei rukka mismun eftir á (Agnar 11.09)',
  'T4:R-000690': 'viðbót eftir að reikningur fór — aldrei rukka mismun eftir á (Agnar 11.09)',
  'T4:R-000476': 'viðbót eftir að reikningur fór — aldrei rukka mismun eftir á (Agnar 11.09)',
  'T5:R-000728': 'mál #984 — Eclipse: kemur nýr reikningur?',
  'T5:R-000716': 'mál #986 — Þangbakki 8-10: ný bankakrafa (Eignaumsjón greiðir)',
  'T5:R-000310': 'mál #771 — Prinsinn Mjódd: rétt kennitala óþekkt',
  'T5:R-000866': 'í staðinn kom minni reikningur R-000873 (23.391 kr, sendur í Payday nr. 251) — „þurfti einungis að yfirfara tæki"',
};

const kr = n => new Intl.NumberFormat('is-IS').format(Math.round(n));
const kt10 = v => String(v == null ? '' : v).replace(/\D/g, '');
const VIRK = new Set(['SENT', 'PAID', 'DRAFT']);

async function pageAll(pq) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(SUPA + '/rest/v1/' + pq, {
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, Range: from + '-' + (from + 999) }
    });
    if (!r.ok) throw new Error(pq.split('?')[0] + ' → ' + r.status + ' ' + (await r.text()).slice(0, 120));
    const d = await r.json();
    out.push(...d);
    if (d.length < 1000) return out;
  }
}

(async () => {
  const [solur, payday] = await Promise.all([
    pageAll('solur?select=id,num,customer_nafn,customer_kt,customer_id,customer_base_id,samtals,greitt_med,status,paid_at,krafa_sent_at,dk_invoice_id,is_credit,credit_of,created_at&order=id'),
    pageAll('payday_invoices_slokk?select=payday_id,number,kt,status,amount_total,reference,paid_date,created_date,updated_at&order=payday_id'),
  ]);

  const stada = p => String(p.status || '').toUpperCase();
  const byRef = new Map(), byId = new Map();
  for (const p of payday) {
    if (p.reference) (byRef.get(p.reference) || byRef.set(p.reference, []).get(p.reference)).push(p);
    byId.set(String(p.payday_id), p);
  }
  const radir = s => {
    const m = new Map();
    for (const p of byRef.get(s.num) || []) m.set(String(p.payday_id), p);
    if (s.dk_invoice_id && byId.has(String(s.dk_invoice_id))) m.set(String(s.dk_invoice_id), byId.get(String(s.dk_invoice_id)));
    return [...m.values()];
  };

  const kredit = solur.filter(s => s.is_credit && s.credit_of != null);
  const bakfaerdar = new Map(kredit.map(k => [String(k.credit_of), k]));
  const lifandi = solur.filter(s => !s.is_credit && s.status !== 'void' && (+s.samtals) > 0);
  const reikn = lifandi.filter(s => s.greitt_med === 'reikningur' && !bakfaerdar.has(String(s.id)));

  const fravik = [];
  const skra = (t, s, texti) => fravik.push({ t, s, texti, lykill: t + ':' + s.num });

  // T1 — rangur greiðandi
  for (const s of lifandi) {
    for (const p of radir(s)) {
      if (!VIRK.has(stada(p))) continue;
      const a = kt10(s.customer_kt), b = kt10(p.kt);
      if (a && b && a !== b) skra('T1', s, 'kt sölu ' + a + ' ≠ kt í Payday ' + b + ' (nr. ' + (p.number || p.payday_id) + ')');
    }
  }
  // T2 — merkt send en fór aldrei
  for (const s of reikn) {
    if (!s.krafa_sent_at || s.paid_at) continue;
    const r = radir(s);
    if (!r.some(p => ['SENT', 'PAID'].includes(stada(p)))) skra('T2', s, r.length ? 'Payday: ' + r.map(stada).join(', ') : 'engin Payday-röð');
  }
  // T3 — merkt greidd en engin greiðsla í Payday
  for (const s of reikn) {
    if (!s.paid_at) continue;
    const r = radir(s);
    if (!r.some(p => stada(p) === 'PAID')) skra('T3', s, r.length ? 'Payday: ' + r.map(p => stada(p) + ' nr. ' + (p.number || '?')).join(', ') : 'engin Payday-röð');
  }
  // T4 — upphæð víkur (paraður reikningur: dk_invoice_id, annars eina virka röðin á R-númerinu)
  for (const s of lifandi) {
    let p = s.dk_invoice_id ? byId.get(String(s.dk_invoice_id)) : null;
    if (!p) { const v = (byRef.get(s.num) || []).filter(x => ['SENT', 'PAID'].includes(stada(x))); if (v.length === 1) p = v[0]; }
    if (!p || !['SENT', 'PAID'].includes(stada(p))) continue;
    const mun = Math.abs((+p.amount_total) - (+s.samtals));
    if (mun > 5 && mun > 0.001 * Math.abs(+s.samtals)) skra('T4', s, 'sala ' + kr(s.samtals) + ' kr ≠ Payday ' + kr(p.amount_total) + ' kr (' + stada(p) + ' nr. ' + (p.number || '?') + ')');
  }
  // T5 — bakfært án nýrrar sölu á sama viðskiptavin (aðeins nýjasta bakfærða salan hvers)
  const sami = (a, b) => (a.customer_base_id && a.customer_base_id === b.customer_base_id) ||
    (a.customer_id && a.customer_id === b.customer_id) || (kt10(a.customer_kt) && kt10(a.customer_kt) === kt10(b.customer_kt));
  const maedur = solur.filter(s => bakfaerdar.has(String(s.id)) && s.greitt_med === 'reikningur' && s.status === 'final' && (+s.samtals) >= 20000);
  for (const m of maedur) {
    if (maedur.some(o => o.id !== m.id && sami(o, m) && o.created_at > m.created_at)) continue;
    const fra = new Date(m.created_at).getTime() - 30 * 86400000;
    const nyr = lifandi.find(n => n.id !== m.id && !bakfaerdar.has(String(n.id)) && sami(n, m) &&
      new Date(n.created_at).getTime() >= fra && (+n.samtals) >= 0.5 * (+m.samtals));
    if (!nyr) skra('T5', m, 'bakfærð með ' + bakfaerdar.get(String(m.id)).num + ', engin önnur sala á viðskiptavininn');
  }

  const HEITI = { T1: 'Rangur greiðandi', T2: 'Merkt send en fór aldrei', T3: 'Merkt greidd en engin greiðsla í Payday', T4: 'Upphæð víkur frá Payday', T5: 'Bakfært og enginn nýr reikningur' };
  const nyju = fravik.filter(f => !KVITTAD[f.lykill]);
  for (const t of Object.keys(HEITI)) {
    const l = fravik.filter(f => f.t === t);
    if (!l.length) continue;
    console.log(t + ' ' + HEITI[t] + ' (' + l.length + ', ' + kr(l.reduce((a, f) => a + (+f.s.samtals), 0)) + ' kr):');
    for (const f of l) {
      console.log('   ' + (KVITTAD[f.lykill] ? '·' : '❗') + ' ' + String(f.s.num).padEnd(10) + String(f.s.customer_nafn || '—').slice(0, 26).padEnd(26) +
        String(kr(f.s.samtals)).padStart(11) + ' kr  ' + f.texti + (KVITTAD[f.lykill] ? '  — ' + KVITTAD[f.lykill] : ''));
    }
  }
  const ferskt = payday.reduce((a, p) => (p.updated_at > a ? p.updated_at : a), '');
  const aldur = ferskt ? Math.floor((Date.now() - new Date(ferskt)) / 86400000) : null;
  if (aldur == null || aldur > 2) console.log('\n⚠️  Payday-spegillinn var síðast uppfærður ' + (ferskt ? ferskt.slice(0, 10) + ' (' + aldur + ' daga)' : 'aldrei') + ' — prófin eru jafn gömul og hann.');
  const ekki = Object.keys(KVITTAD).filter(k => !fravik.some(f => f.lykill === k));
  if (ekki.length) console.log('\nℹ️  Kvittað en finnst ekki lengur (má taka úr KVITTAD): ' + ekki.join(', '));

  const talning = Object.keys(HEITI).map(t => t + ' ' + fravik.filter(f => f.t === t).length).join(' · ');
  if (nyju.length) {
    console.log('\n❌ RED: ' + nyju.length + ' ný frávik milli appsins og Payday (' + nyju.map(f => f.lykill).join(', ') + ') — ' + talning + '. Rannsaka, setja á borðið og kvitta hér með ástæðu.');
    process.exit(1);
  }
  console.log('\n✅ GRÆNT Payday-samræming: ' + talning + ' — ' + fravik.length + ' þekkt frávik, öll með ástæðu, ekkert nýtt.');
})().catch(e => { console.error('❌ audit-payday-samraeming villa: ' + e.message); process.exit(1); });
