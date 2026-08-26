#!/usr/bin/env node
/* Regression net — Rekstrarfélög sites stay independent (2026-08-25).
 *
 * Agnar: one kennitala can own many properties; each is its own unit for
 * inspections, dating, and Payday. NEVER merge rekstrarfélög sites.
 *
 * 175 used to drop fyrirtaeki.id on live load and rematch by name/kt, so
 * siblings collapsed (Hotel Grandi, 🧾 on every Heimaleiga row, Ármúli 13/13A).
 *
 * This audit proves:
 *   (1) SOURCE: live load selects id and pins co_id; companyForBld never
 *       `return hits[0]`; document_pairs query includes fyrirtaeki_id.
 *   (2) DATA: known multi-site kennitölur still have many fyrirtaeki rows
 *       (Heimaleiga ehf, Center Hótel) and Midtown ≠ Máni; Ármúli 13A is its
 *       own kt (S30), not folded into Heimaleiga ehf.
 *
 * Read-only, publishable key.
 */
const fs = require('fs');
const path = require('path');

const SUPA = 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY  = 'sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f';

const SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'patches', '175-rekstrarfelog.js'), 'utf8');

function fail(msg) {
  console.log('RED: ' + msg);
  process.exit(1);
}

// ── (1) source guards ──────────────────────────────────────────────────────
if (!/'id,nafn,kennitala,heimilisfang/.test(SRC)) {
  fail('175 live fyrirtaeki select no longer includes id — sites would rematch by name/kt.');
}
if (!/co_id:\s*f\.id/.test(SRC)) {
  fail('175 live buildings are not pinned with co_id: f.id — companyForBld would guess.');
}
if (/if\s*\(hits\.length\s*>\s*1\)[\s\S]{0,500}return hits\[0\]/.test(SRC)) {
  fail('175 companyForBld still returns hits[0] on ambiguous names — opens the wrong house.');
}
if (/kh\.length\s*>=\s*1\)\s*return kh\[0\]/.test(SRC)) {
  fail('175 companyForBld still picks kh[0] when several names share a kt.');
}
const pairsChunk = SRC.split("from('document_pairs')")[1] || '';
if (!/fyrirtaeki_id/.test(pairsChunk.slice(0, 400))) {
  fail('175 document_pairs select dropped fyrirtaeki_id — 🧾 would leak across a shared kt.');
}
if (!/pdByCo/.test(SRC) || !/solur/.test(SRC)) {
  fail('175 no longer loads Payday/R-númer per solur.customer_id.');
}
if (!/is\('deleted_at',\s*null\)/.test(SRC)) {
  fail('175 live fyrirtaeki load no longer filters deleted_at — closed sites would crowd the list.');
}
if (!/ktToRek/.test(SRC)) {
  fail('175 lost kennitala recovery — unlinked Heimaleiga sites would be dropped.');
}
if (!/liveKtN\[d\] >= 1/.test(SRC)) {
  fail('175 no longer drops seed aliases (Aegina / Urðarhvarf 4) when the kt already has a live site.');
}
if (!/_rf-styles-v6/.test(SRC)) {
  fail('175 styles id is not v6 — old accordion CSS would keep Heimaleiga rows tall.');
}
if (!/rf-nameid/.test(SRC)) {
  fail('175 name cell is no longer a flex row (rf-nameid) — toggle would stack above the name and inflate Heimaleiga rows.');
}
if (!/white-space:nowrap;overflow:hidden;text-overflow:ellipsis/.test(SRC)) {
  fail('175 building names wrap again — Heimaleiga rows would be too tall.');
}
if (!/max-height:none/.test(SRC) && !/max-height:200000px/.test(SRC)) {
  fail('175 accordion max-height is back to a small cap — last Heimaleiga rows would clip.');
}
if (!/fetchAllIn/.test(SRC)) {
  fail('175 live .in() is no longer chunked — a long base-id list would 414 and drop Heimaleiga sites.');
}

// ── (2) live data: do not merge ────────────────────────────────────────────
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
  const heim = await pageAll('fyrirtaeki?kennitala=eq.510117-0690&deleted_at=is.null&select=id,nafn,heimilisfang,stadur_nr');
  const center = await pageAll('fyrirtaeki?kennitala=eq.450905-1430&deleted_at=is.null&select=id,nafn,stadur_nr');
  const s30 = await pageAll('fyrirtaeki?kennitala=eq.711096-2059&deleted_at=is.null&select=id,nafn');

  const HEIM_MIN = 8;     // 10 sites as of 2026-08-25; floor leaves room for a closed site
  const CENTER_MIN = 8;   // 11 hotels as of 2026-08-25
  if (heim.length < HEIM_MIN) {
    fail(`Heimaleiga ehf (510117-0690) has ${heim.length} sites — expected ≥${HEIM_MIN}. Sites were merged or deleted.`);
  }
  if (center.length < CENTER_MIN) {
    fail(`Center Hótel (450905-1430) has ${center.length} sites — expected ≥${CENTER_MIN}. Sites were merged.`);
  }
  const ids = new Set(heim.map(x => x.id));
  if (ids.size !== heim.length) fail('Heimaleiga ehf has duplicate fyrirtaeki.id — impossible PK, check query.');

  const fold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const hasMani = heim.some(x => /mani/.test(fold(x.nafn)));
  const hasMidtown = heim.some(x => /midtown/.test(fold(x.nafn)));
  if (!hasMani || !hasMidtown) {
    fail('Laugavegur 18 missing Máni or Midtown as separate Heimaleiga sites — do not merge the floors.');
  }
  const mani = heim.find(x => /mani/.test(fold(x.nafn)));
  const mid = heim.find(x => /midtown/.test(fold(x.nafn)));
  if (mani && mid && mani.id === mid.id) {
    fail('Máni and Midtown share a fyrirtaeki.id — the two jobs were merged.');
  }

  if (!s30.length) {
    fail('S30 ehf / Ármúli 13A (711096-2059) missing — that property is its own kennitala, not Heimaleiga ehf.');
  }

  const rfBases = await pageAll('customers_base?rekstrarfelag=eq.Heimaleiga&select=id,kennitala,nafn');
  const rfIds = rfBases.map(x => x.id).join(',');
  const group = rfIds
    ? await pageAll('fyrirtaeki?customer_base_id=in.(' + rfIds + ')&deleted_at=is.null&select=id,nafn,kennitala,stadur_nr,heimilisfang')
    : [];
  const GROUP_MIN = 15; // 10 on 510117-0690 + S30, S&H, Mannheimar, EA Law, Aegina/Icelandic
  if (group.length < GROUP_MIN) {
    fail('Heimaleiga rekstrarfélag list has ' + group.length + ' sites — expected ≥' + GROUP_MIN + '. Query/join dropped properties.');
  }
  const gfold = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const gneed = [
    ['mani', 'Máni Apartments'],
    ['midtown', 'Midtown Hotel'],
    ['bilskur', 'Dalbrekka bílskúr'],
    ['s30', 'S30 / Ármúli 13A'],
    ['mannheimar', 'Mannheimar'],
    ['icelandic', 'Icelandic Apartments (Aegina)'],
    ['comfort', 'Iceland Comfort / Hamraborg 7'],
    ['blue mountain', 'Blue Mountain / Urðarhvarf 2']
  ];
  gneed.forEach(function (pair) {
    if (!group.some(x => gfold(x.nafn).indexOf(pair[0]) >= 0)) {
      fail('Heimaleiga list missing ' + pair[1] + ' — page would drop that site.');
    }
  });

  console.log(`Heimaleiga ehf sites: ${heim.length} (ids ${heim.map(x => x.id).sort((a,b)=>a-b).join(',')})`);
  console.log(`Heimaleiga GROUP (rekstrarfelag): ${group.length} sites across ${rfBases.length} bases`);
  console.log(`Center Hótel sites: ${center.length}`);
  console.log(`S30 / Ármúli 13A: #${s30[0].id} ${s30[0].nafn}`);
  console.log(`Máni #${mani && mani.id} · Midtown #${mid && mid.id} — separate`);
  console.log('source: co_id pin + no hits[0] + pairs keyed on fyrirtaeki_id + Payday per solur.customer_id + deleted_at + kt recover');
  console.log(`GREEN: rekstrarfélög sites stay independent (${heim.length}+${center.length} rows, not folded on kt; Heimaleiga group ${group.length}).`);
})().catch(e => fail(String(e && e.message || e)));
