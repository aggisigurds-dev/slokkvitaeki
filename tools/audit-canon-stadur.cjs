#!/usr/bin/env node
/* Regression net — canonical skoðunarmánuður (v_stadur_yfirlit / patch 312, 2026-08-24).
 *
 * Öll fyrirtækja-flötin (175 Rekstrarfélög, 185 Í þjónustu, companieslist, 89 mánaðar-
 * röð, 77 gjaldfallið) lesa NÚ skoðunarmánuðinn úr EINNI uppsprettu: DB-viewinu
 * v_stadur_yfirlit gegnum window.CanonStadur. Guide rule: mánuður kemur AÐEINS úr
 * skýrslu/reikningi; enginn slíkur → óþekkt, og fyrirtækið dettur úr mánaðar-röðinni (89)
 * og birtist sem gloppa í Ársskoðun (153) í staðinn.
 *
 * ÁHÆTTAN sem netvörðurinn flaggaði: ef viewið brotnar (skilar 0 röðum) eða hættir að
 * bera fram mánuð sem skýrsla/reikningur VEIT — þá hverfur það fyrirtæki úr áætlaða
 * mánaðar-listanum ÞÖGULT og skoðun getur gleymst (brunahætta).
 *
 * Þessi audit sannar að sú áhætta rætist ekki:
 *   (1) v_stadur_yfirlit skilar raðir (> 0)  — annars er allt tómt → RED strax.
 *   (2) BASELINE = 0: ekkert fyrirtæki sem Á skýrslu-/reikningsmánuð (1-12) má hafa
 *       NULL inspect_month í viewinu. (Viewið coalesce-ar blob>skýrsla>reikningur, svo
 *       þekktur mánuður getur aðeins tapast ef afleiðslan/þekjan brotnar.)
 * Handvirk yfirskrift (blob) MÁ breyta mánuðinum — því er jafngildi EKKI krafist, aðeins
 * að hann sé ekki NULL þegar heimild er til.
 *
 * Read-only, publishable key.
 */
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY  = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

async function pageAll(pathAndQuery) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${SUPA}/rest/v1/${pathAndQuery}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, Range: `${from}-${from + 999}` }
    });
    const b = await r.json();
    if (!Array.isArray(b) || !b.length) break;
    out.push(...b);
    if (b.length < 1000) break;
  }
  return out;
}
const inRange = m => Number.isInteger(+m) && +m >= 1 && +m <= 12;

(async () => {
  const view    = await pageAll('v_stadur_yfirlit?select=fyrirtaeki_id,inspect_month,er_i_thjonustu&order=fyrirtaeki_id.asc');
  const reports = await pageAll('arsskodun_report_facts?select=fyrirtaeki_id,inspect_month&order=fyrirtaeki_id.asc');
  const invs    = await pageAll('uttekt_reikningur_facts?select=fyrirtaeki_id,inspect_month&order=fyrirtaeki_id.asc');

  // (1) view-health: an empty view = the whole canonical schedule is blank.
  if (!view.length) {
    console.log('RED: v_stadur_yfirlit returned 0 rows — the canonical month source is broken; every month view would be blank.');
    console.log('Fix: confirm the view exists and anon has SELECT (grant), then re-run.');
    process.exit(1);
  }

  const viewMonth = new Map();   // fid -> inspect_month (may be null)
  const inService = new Map();   // fid -> er_i_thjonustu
  view.forEach(v => { viewMonth.set(v.fyrirtaeki_id, v.inspect_month); inService.set(v.fyrirtaeki_id, v.er_i_thjonustu === true); });

  // fids that have a KNOWN (1-12) month from a report or an invoice.
  const known = new Map();       // fid -> {report?:m, invoice?:m}
  const slot = fid => { let o = known.get(fid); if (!o) { o = {}; known.set(fid, o); } return o; };
  reports.forEach(r => { if (inRange(r.inspect_month)) slot(r.fyrirtaeki_id).report = +r.inspect_month; });
  invs.forEach(r => { if (inRange(r.inspect_month)) slot(r.fyrirtaeki_id).invoice = +r.inspect_month; });

  // (2) violations: a fid with a known source month but NULL month in the view.
  const violations = [];
  for (const [fid, src] of known) {
    if (!viewMonth.has(fid)) continue;                 // company not in view (deleted) — not a schedule drop
    const vm = viewMonth.get(fid);
    if (vm == null) violations.push({ fid, src });
  }

  const inSvc = [...inService.values()].filter(Boolean).length;
  const inSvcWithMonth = [...viewMonth.entries()].filter(([fid, m]) => inService.get(fid) && m != null).length;
  console.log(`v_stadur_yfirlit rows: ${view.length} · report-months: ${reports.filter(r => inRange(r.inspect_month)).length} · invoice-months: ${invs.filter(r => inRange(r.inspect_month)).length}`);
  console.log(`in-service: ${inSvc} · in-service with canonical month (appear in 89): ${inSvcWithMonth} · without (fall to Ársskoðun gaps): ${inSvc - inSvcWithMonth}`);
  console.log(`companies with a known report/invoice month but NULL canonical month: ${violations.length}`);
  violations.slice(0, 30).forEach(v => console.log(`    #${v.fid}  report=${v.src.report ?? '—'} invoice=${v.src.invoice ?? '—'}  → view month NULL`));

  const BASELINE = 0;   // a known source month must never be lost by the canonical view
  if (violations.length > BASELINE) {
    console.log(`\nRED: ${violations.length} compan${violations.length === 1 ? 'y' : 'ies'} > baseline ${BASELINE} — a report/invoice month is not surfaced by v_stadur_yfirlit, so the company would silently drop from the month schedule (89) with no month.`);
    console.log(`Fix: repair the v_stadur_yfirlit month coalesce (blob>skýrsla>reikningur, 1-12 filter) so every known month is surfaced — before pushing.`);
    process.exit(1);
  }
  console.log(`OK — ${violations.length} lost months (<= baseline ${BASELINE}); every known report/invoice month is surfaced, so no in-service company drops from the schedule silently.`);
})();
