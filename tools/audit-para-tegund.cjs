#!/usr/bin/env node
/* VÖRÐUR — reikningur af rangri þjónustutegund í pari.
 *
 * VILLAN, fundin 01.09.2026 þegar Agnar sá „Úttekt 2026 · reikn. R-108161 ✓"
 * á NR5 ehf — en R-108161 er staðgreidd BÚÐARSALA (3 léttvatn + 1 CO₂, engin
 * yfirferð, enginn akstur, engin skýrslugerð).
 *
 * Reglan „búð og brunakerfi eru ekki slökkvitækjaþjónusta" var sett í
 * VIÐMÓTINU 26.08.2026 — patch 187 `isUttektInvoiceTeg()` og patch 199
 * `pushInvByService()`. Hún barst aldrei niður í gagnagrunninn: triggerinn
 * `auto_pair_customer_document()` (brunahólf, sjá .claude/agents/
 * sara-organizer.md) parar eftir `customer_base_id` + ári og skoðar EKKI
 * `vidskiptategund`. Handvirk pörun og cowork-pörunin gera það ekki heldur.
 *
 * AFLEIÐINGIN er ekki bara útlit: pörin eru merkt `klarad`, svo búðarsala
 * telst kláruð úttekt. Það hækkar `veidin_bundle_por` og lætur staði líta út
 * fyrir að vera afgreidda sem hafa aldrei fengið þjónustuheimsókn.
 *
 * ÞESSI VÖRÐUR fellur rautt ef talan fer YFIR grunnlínuna. Hann lagar ekkert —
 * lagfæringin er `sql/2026-09-01_auto_pair_vidskiptategund.sql` (trigger) og
 * `tools/laga-para-tegund.cjs` (þau 53 sem þegar eru til). Báðar bíða Agnars.
 *
 *   node tools/audit-para-tegund.cjs
 */
const fs = require('fs');
const path = require('path');

// Mælt 01.09.2026: 51 uttekt←bud · 1 uttekt←brunakerfi · 1 brunakerfi←uttekt.
// Lækkar þegar lagfæringin er keyrð; þá á að lækka þessa tölu með.
const GRUNNLINA = 53;

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

async function allar(q) {
  let out = [], from = 0;
  for (;;) {
    const r = await fetch(`${URL_}/rest/v1/${q}&offset=${from}&limit=1000`, { headers: H });
    // Kastar — tómt safn liti út eins og „engin vandamál".
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
  const pairs = await allar('document_pairs?select=id,year,service_type,invoice_doc_id,status,matched_by&order=id');
  const docs = await allar('customer_documents?select=id,vidskiptategund,invoice_number&doc_type=eq.reikningur&order=id');
  const byId = new Map(docs.map(d => [d.id, d]));

  const rangt = pairs.filter(p => {
    if (p.invoice_doc_id == null) return false;
    const d = byId.get(p.invoice_doc_id);
    if (!d) return false;
    const t = String(d.vidskiptategund || '').toLowerCase();
    // Óflokkað (null/ovisst) er EKKI talið rangt — 77 reikningar eru óvissir og
    // sama undanþága gildir í patch 187, annars slokknaði á Hamraborg 7 o.fl.
    if (p.service_type === 'uttekt') return t === 'bud' || t === 'brunakerfi';
    if (p.service_type === 'brunakerfi') return t === 'bud' || t === 'uttekt';
    return false;
  });

  const klarad = rangt.filter(p => p.status === 'klarad').length;

  if (rangt.length > GRUNNLINA) {
    console.log(`❌ Pörun með rangri reikningategund: ${rangt.length} (grunnlína ${GRUNNLINA})\n`);
    console.log(`   ${rangt.length - GRUNNLINA} NÝ tilvik síðan grunnlínan var mæld 01.09.2026.`);
    console.log('   Triggerinn auto_pair_customer_document() skoðar ekki vidskiptategund.');
    console.log('   Lagfæring: sql/2026-09-01_auto_pair_vidskiptategund.sql\n');
    rangt.slice(-8).forEach(p => {
      const d = byId.get(p.invoice_doc_id);
      console.log(`   par ${String(p.id).padEnd(6)}${p.service_type.padEnd(11)}${p.year}  `
        + `${String(d.invoice_number || '—').padEnd(12)}teg=${String(d.vidskiptategund).padEnd(11)}${p.status}`);
    });
    process.exit(1);
  }

  console.log(`✅ Pörun-tegund heldur — ${rangt.length}/${GRUNNLINA} (${klarad} merkt "klarad").`);
  if (rangt.length) {
    console.log('   Þetta eru ÞEKKT tilvik sem bíða lagfæringar, ekki ný.');
    console.log('   Búðarsala telst kláruð úttekt í ' + klarad + ' pörum — sjá tools/laga-para-tegund.cjs.');
  }
  process.exit(0);
})().catch(e => { console.log('❌ Vörðurinn keyrði ekki: ' + e.message); process.exit(1); });
