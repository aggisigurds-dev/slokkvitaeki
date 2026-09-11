#!/usr/bin/env node
'use strict';
/* EYDD SKJALASKRÁNING MÁ EKKI SKRÁST AFTUR ÞEGJANDI.
 *
 * Af hverju þessi vörður er til (11.09.2026): skráningu Stólpa-reiknings R-107802 (Center Hótel) var eytt þrisvar
 * (12.08., 23.08., 26.08.). Tvær eyðinganna voru handvirkar — röðin hafði lent á RÖNGUM stað (Plaza) af því að
 * heimilisfangsreglur giska á stað þegar reikninginn vantar „vegna"-línu. Drive-sóparnir (drive-multitool,
 * cowork-doc-sweep) athuga aðeins hvort drive_file_id sé skráð, svo eydd skráning kom aftur í næsta sópi og
 * sama sagan endurtók sig. Rannsókn og tillögur: Verkefnalisti ae9f9b45.
 *
 * Mælir — úr audit_vernd, sem gikkurinn fyllir við HVERJA eyðingu á customer_documents:
 *   A  Drive-skrár sem skráningu hefur verið eytt fyrir 2+ sinnum
 *   B  lifandi skráningar sem urðu til EFTIR að skráningu sömu Drive-skrár var eytt („komu aftur")
 *
 * GRÆNT á/undir grunnlínu, RAUTT ef talan hækkar: þá hefur eydd skráning komið aftur, og einhver þarf að skoða
 * hvort eyðingin var rétt (og þá stöðva sópinn) eða skráningin (og þá skrá hvers vegna).
 * Grunnlínur mældar 11.09.2026 kl. ~20:50 og staðfestar af tveimur óháðum mælingum (agent + SQL): A = 3, B = 16.
 * Lækkaðu grunnlínuna þegar tilvik eru leyst — aldrei hækka hana til að fá grænt.
 *
 * Keyrsla:  node tools/audit-skjal-endurkoma.cjs          (--listi sýnir dæmin)
 */
const fs = require('fs');
const path = require('path');

const GRUNNLINA_A = 3;
const GRUNNLINA_B = 16;

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
const LISTI = process.argv.includes('--listi');

async function allar(q) {
  let out = [], from = 0;
  for (;;) {
    const r = await fetch(`${URL_}/rest/v1/${q}&offset=${from}&limit=1000`, { headers: H });
    // Kastar. Tómt safn liti út eins og „ekkert komið aftur", sem er hættulegasta svarið.
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 160)}`);
    const d = await r.json();
    if (!d.length) break;
    out = out.concat(d);
    if (d.length < 1000) break;
    from += 1000;
  }
  return out;
}

(async () => {
  const eyd = await allar('audit_vernd?select=id,changed_at,drive_file_id:old_row->>drive_file_id,nr:old_row->>invoice_number' +
    '&table_name=eq.customer_documents&op=eq.DELETE&order=id');
  const perSkra = new Map();
  for (const e of eyd) {
    if (!e.drive_file_id) continue;
    const t = Date.parse(e.changed_at);
    const x = perSkra.get(e.drive_file_id) || { n: 0, fyrsta: t, nr: e.nr };
    x.n++; if (t < x.fyrsta) x.fyrsta = t;
    perSkra.set(e.drive_file_id, x);
  }
  const A = [...perSkra.entries()].filter(([, x]) => x.n >= 2);

  // Lifandi raðir fyrir eyddar Drive-skrár, sóttar í hópum svo slóðin verði ekki of löng.
  const ids = [...perSkra.keys()];
  const lifandi = [];
  for (let i = 0; i < ids.length; i += 80) {
    const hopur = ids.slice(i, i + 80).map(s => '"' + s.replace(/"/g, '') + '"').join(',');
    lifandi.push(...await allar('customer_documents?select=id,drive_file_id,invoice_number,created_at&drive_file_id=in.(' + encodeURIComponent(hopur) + ')&order=id'));
  }
  const B = lifandi.filter(c => {
    const x = perSkra.get(c.drive_file_id);
    return x && Date.parse(c.created_at) > x.fyrsta;
  });

  if (LISTI) {
    console.log('A — Drive-skrár eytt 2+ sinnum:');
    A.forEach(([d, x]) => console.log('   ' + d + '  ' + (x.nr || '—') + '  ×' + x.n));
    console.log('B — skráningar sem komu aftur eftir eyðingu:');
    B.forEach(c => console.log('   #' + c.id + '  ' + (c.invoice_number || '—') + '  ' + String(c.created_at).slice(0, 10)));
  }

  const rautt = [];
  if (A.length > GRUNNLINA_A) rautt.push('A: ' + A.length + ' Drive-skrár eytt 2+ sinnum (grunnlína ' + GRUNNLINA_A + ')');
  if (B.length > GRUNNLINA_B) rautt.push('B: ' + B.length + ' skráningar komu aftur eftir eyðingu (grunnlína ' + GRUNNLINA_B + ')');
  if (rautt.length) {
    console.log('RED: ' + rautt.join(' · ') + ' — eydd skráning kom aftur. `--listi` sýnir hverjar; sjá Verkefnalisti ae9f9b45.');
    process.exit(1);
  }
  console.log('✅ GRÆNT skjal-endurkoma: A ' + A.length + '/' + GRUNNLINA_A + ' · B ' + B.length + '/' + GRUNNLINA_B + ' (' + eyd.length + ' eyðingar lesnar)');
})().catch(e => { console.log('RED: gat ekki lesið — ' + e.message); process.exit(1); });
