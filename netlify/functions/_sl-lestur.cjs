// _sl-lestur.cjs — sameiginlegur lestur sölugagna Slökkvitækis fyrir „Hvernig gengur reksturinn?“ (rekstur-yfirlit.cjs) og Tekjuliði
// (tekjulidir.cjs). Eitt lesmengi = sömu tölur á báðum stöðum. Kastar Error með ástæðu þegar lestur bregst eða skilar engu (tómur lestur er
// EKKI 0: kallandinn skilar þá „ómælt“ með ástæðunni). Tímamörk: sameiginlegur AbortSignal (7 s) á öllum lestrunum.
'use strict';
const P = require('./_portal.cjs');
const T = require('./_tekjur.cjs');

async function sb(slod, init = {}) {
  const r = await fetch(`${P.SUPABASE_URL}/rest/v1/${slod}`, {
    ...init,
    headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${slod.split('?')[0]}: ${t.slice(0, 160)}`);
  return t ? JSON.parse(t) : null;
}
async function sbOll(slod, init) {
  const ut = [];
  for (let off = 0; off < 50000; off += 1000) {
    const r = await sb(`${slod}&limit=1000&offset=${off}`, init);
    ut.push(...r);
    if (r.length < 1000) break;
  }
  return ut;
}
const timeoutInit = (ms) => { const s = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(ms || 7000) : undefined; return s ? { signal: s } : undefined; };

// opts: { payday, osent, vorur } — hvað er sótt til viðbótar við sölur, skýrslur og verkstæði
async function lesaSolugogn(opts = {}, init) {
  init = init || timeoutInit(7000);
  const fra = T.SL_FRA + '-01';
  const [solur, voidIds, skyrslur, verkbeidnir, verklidir, payday, osentRadir, vorur] = await Promise.all([
    sbOll(`solur?select=id,num,status,credit_of,is_credit,vidskiptategund,upphaed_an_vsk,created_at,paid_at,greitt_med,customer_base_id,customer_id,linur&status=eq.final&created_at=gte.${fra}&order=id.asc`, init),
    sbOll('solur?select=id&status=eq.void&order=id.asc', init).then((r) => r.map((x) => x.id)),
    sbOll('customer_documents?select=id,doc_type,doc_date,customer_base_id,fyrirtaeki_id,is_duplicate,skodun_ar_man,notes&doc_type=in.(uttektarskyrsla,brunakerfi,slokkvikerfi)&source=eq.app&is_duplicate=not.is.true&doc_date=gte.2026-02-01&order=id.asc', init),
    sbOll(`verkbeidnir?select=id,num,status,verd,klart_at,eytt_at&eytt_at=is.null&created_at=gte.${fra}&order=id.asc`, init),
    sbOll(`verklidur?select=job_id,service,status,eytt_at&eytt_at=is.null&created_at=gte.${fra}&order=id.asc`, init),
    opts.payday ? sbOll(`payday_invoices_slokk?select=status,amount_ex,amount_total,created_date,due_date,paid_date,updated_at&created_date=gte.${opts.paydayFra || '2026-06-30'}&order=id.asc`, init) : Promise.resolve(null),
    // ósent núna = sama mengi og „ósent“ í yfirsyn.cjs (v_krafa_ekki_send_adgerd, m. VSK)
    opts.osent ? sbOll('v_krafa_ekki_send_adgerd?select=num,samtals&order=num.asc', init).catch(() => null) : Promise.resolve(null),
    opts.vorur ? sbOll('vorur?select=id,nafn,flokkur,virkt&order=id.asc', init).catch((e) => { if (opts.vorurValfrjalst) return null; throw e; }) : Promise.resolve(null),
  ]);
  if (!solur.length) throw new Error('sölulesturinn skilaði engu');
  if (!skyrslur.length) throw new Error('skýrslulesturinn skilaði engu — án hans yrði allt „án skýrslu“');
  if (!verkbeidnir.length || !verklidir.length) throw new Error('verkstæðislesturinn skilaði engu');
  if (opts.vorur && !opts.vorurValfrjalst && !(vorur || []).length) throw new Error('vörulistalesturinn skilaði engu — án hans yrðu allar línur „án vörutengingar“');
  // frumsölur kreditnótna sem vantar í lesturinn (nóta fylgir frumsölu — Agnar 22.11.2026)
  const hef = new Set(solur.map((r) => String(r.id))), voidSet = new Set(voidIds.map(String));
  const vantar = [...new Set(solur.filter((r) => r.credit_of != null && !hef.has(String(r.credit_of)) && !voidSet.has(String(r.credit_of))).map((r) => Number(r.credit_of)).filter((n) => Number.isInteger(n) && n > 0))];
  let frumsolur = [];
  try { for (let i = 0; i < vantar.length; i += 150) frumsolur.push(...await sbOll(`solur?select=id,created_at,paid_at,greitt_med&id=in.(${vantar.slice(i, i + 150).join(',')})&order=id.asc`, init)); } catch (e) { frumsolur = []; }
  return { solur, voidIds, skyrslur, verkbeidnir, verklidir, frumsolur, payday, osentRadir, vorur };
}

module.exports = { sb, sbOll, timeoutInit, lesaSolugogn };
