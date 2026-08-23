#!/usr/bin/env node
/* Regression net — the tæki→starfsstöð FK join (Factcheck Task 1, 2026-08-23).
 *
 * 153-arsskodun.js used to decide "has active equipment?" (readiness / in-service
 * membership) by matching uttaeki.client to fyrirtaeki.nafn (folded). That name
 * join double-counted multi-site rekstrarfélög, so it was switched to the direct
 * FK uttaeki.fyrirtaeki_id. The RISK the netvörður flagged: a LIVE company whose
 * in-service membership rested ONLY on name-matched units could silently vanish
 * if those units have a null / mismatched FK.
 *
 * This audit proves that risk is not realised: it counts LIVE (deleted_at IS NULL)
 * companies that are NOT er_i_thjonustu, have active units BY NAME, but 0 active
 * units BY FK. Those — and only those — would drop from the list purely because of
 * the join swap. BASELINE = 0: any such company is a real regression (or new
 * FK-drift) and must be linked (uttaeki.fyrirtaeki_id) before it appears here.
 *
 * Note: er_i_thjonustu=true companies never drop (hasArs keeps them); soft-deleted
 * companies are excluded by 153 itself (.is('deleted_at', null)). So this upper
 * bound is exactly the wire the netvörður cares about.
 *
 * Read-only, publishable key. Also prints the null-FK active-device backlog
 * (Cowork entry 13) for visibility — informational, does not fail the audit.
 */
const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY  = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

// Diacritic/case fold — MUST mirror foldName in js/patches/153-arsskodun.js.
function foldName(s) {
  return String(s || '').toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/æ/g, 'ae').replace(/ö/g, 'o')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ').trim();
}

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

(async () => {
  const companies = await pageAll('fyrirtaeki?select=id,nafn,er_i_thjonustu,deleted_at&order=id.asc');
  const units = await pageAll('uttaeki?select=client,status,fyrirtaeki_id&status=eq.active&order=id.asc');

  const byFid = new Map();          // fyrirtaeki_id -> active-unit count
  const byFoldClient = new Map();   // foldName(client) -> active-unit count
  let nullFk = 0;
  const nullFkClients = new Set();
  for (const u of units) {
    if (u.fyrirtaeki_id != null) byFid.set(u.fyrirtaeki_id, (byFid.get(u.fyrirtaeki_id) || 0) + 1);
    else { nullFk++; nullFkClients.add(foldName(u.client)); }
    const k = foldName(u.client);
    if (k) byFoldClient.set(k, (byFoldClient.get(k) || 0) + 1);
  }

  const live = companies.filter(c => c.deleted_at == null);
  // Would drop: live, not er_i_thjonustu, active-by-name > 0, active-by-fid == 0.
  const drops = live.filter(c => c.er_i_thjonustu !== true
    && (byFoldClient.get(foldName(c.nafn)) || 0) > 0
    && (byFid.get(c.id) || 0) === 0);

  console.log(`companies: ${companies.length} (live ${live.length}) · active units: ${units.length}`);
  console.log(`null-FK active devices (Cowork entry 13 backlog): ${nullFk} across ${nullFkClients.size} client(s) — shown at no location until linked`);
  console.log(`live in-service-by-units-only companies that would drop from the FK join: ${drops.length}`);
  drops.slice(0, 30).forEach(c => console.log(`    #${c.id} ${String(c.nafn).slice(0, 48)}  (by-name ${byFoldClient.get(foldName(c.nafn)) || 0}, by-fid 0)`));

  const BASELINE = 0;   // no live company may drop purely from the join swap
  if (drops.length > BASELINE) {
    console.log(`\nRED: ${drops.length} live compan${drops.length === 1 ? 'y' : 'ies'} > baseline ${BASELINE} — the FK join would hide a real in-service customer.`);
    console.log(`Fix: set uttaeki.fyrirtaeki_id on that company's active devices (or confirm it is truly out of service) before pushing.`);
    process.exit(1);
  }
  console.log(`OK — ${drops.length} live drop-outs (<= baseline ${BASELINE}); the FK join hides no live in-service customer.`);
})();
