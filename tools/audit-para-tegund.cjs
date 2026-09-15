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
 * `tools/laga-para-tegund.cjs`. Báðar keyrðar 02.09.2026 — sjá GRUNNLINA hér að neðan.
 *
 *   node tools/audit-para-tegund.cjs
 */
const fs = require('fs');
const path = require('path');

// Mælt 01.09.2026: 51 uttekt←bud · 1 uttekt←brunakerfi · 1 brunakerfi←uttekt.
// Lækkar þegar lagfæringin er keyrð; þá á að lækka þessa tölu með.
// 02.09.2026: LAGFÆRT — grunnlínan fór úr 53 í 0. Triggerinn `auto_pair_customer_document()`
// hafnar nú búðarsölu og röngum þjónustuflokki, og 56 rangar tengingar voru losaðar
// (afrit: backup_20260902_document_pairs). Þær má EKKI koma aftur — hver ný er villa,
// ekki rek. Sannreynt: búðar-reikningur parast ekki, úttektar-reikningur parast.
const GRUNNLINA = 0;

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

// 15.09.2026 — BLINDI BLETTURINN. Vörðurinn las aðeins tegund SKJALSINS. uttekt-upload
// (reikningur úr appinu) vistaði skjalið ÁN tegundar; triggerinn las það sem „óvisst",
// paraði búðarsöluna sem úttekt og tegundin kom síðar — eða aldrei. Vörðurinn sá 2 pör;
// þau voru 7, þar af 2 merkt `klarad` (Pitstop, Colas-Gullhella). Losuð með UPDATE
// (afrit í audit_vernd, matched_by '+teg_hreinsun_20260915'). Nú tvær mælingar:
//   T1  par af rangri tegund — tegund skjalsins, annars tegund SÖLUNNAR með sama númeri
//   T2  óstimpluð reikningsskjöl sem eiga sölu (rótin) — trg_customer_documents_erfa_tegund
//       heldur henni í 0; mæld 34 fyrir lagfæringu
// Lagfæringin: sql/2026-09-15_para_tegund_erfd.sql.
const GRUNNLINA_OSTIMPLUD = 0;

(async () => {
  const pairs = await allar('document_pairs?select=id,year,service_type,invoice_doc_id,status,matched_by&order=id');
  const docs = await allar('customer_documents?select=id,vidskiptategund,invoice_number,fyrirtaeki_id&doc_type=eq.reikningur&order=id');
  const solur = await allar('solur?select=id,num,vidskiptategund,customer_id,created_at&num=not.is.null&order=id');
  const byId = new Map(docs.map(d => [d.id, d]));

  // Tegund sölunnar með sama númeri — sama val og trg_customer_documents_erfa_tegund:
  // sala sama staðar fyrst, svo nýjasta.
  const solurByNum = new Map();
  for (const s of solur) {
    const k = String(s.num).trim();
    if (!solurByNum.has(k)) solurByNum.set(k, []);
    solurByNum.get(k).push(s);
  }
  const salaTeg = d => {
    const l = (solurByNum.get(String(d.invoice_number || '').trim()) || []).filter(s => s.vidskiptategund);
    l.sort((a, b) => ((b.customer_id === d.fyrirtaeki_id) - (a.customer_id === d.fyrirtaeki_id))
      || String(b.created_at).localeCompare(String(a.created_at)));
    return l.length ? l[0].vidskiptategund : null;
  };
  const tegund = d => String(d.vidskiptategund || salaTeg(d) || '').toLowerCase();

  const rangt = pairs.filter(p => {
    if (p.invoice_doc_id == null) return false;
    const d = byId.get(p.invoice_doc_id);
    if (!d) return false;
    const t = tegund(d);
    // Óflokkað (null/ovisst) er EKKI talið rangt — 77 reikningar eru óvissir og
    // sama undanþága gildir í patch 187, annars slokknaði á Hamraborg 7 o.fl.
    if (p.service_type === 'uttekt') return t === 'bud' || t === 'brunakerfi';
    if (p.service_type === 'brunakerfi') return t === 'bud' || t === 'uttekt';
    return false;
  });

  const klarad = rangt.filter(p => p.status === 'klarad').length;
  const ostimplud = docs.filter(d => !d.vidskiptategund && d.invoice_number && salaTeg(d));
  let rautt = false;

  if (rangt.length > GRUNNLINA) {
    rautt = true;
    console.log(`❌ T1 Pörun með rangri reikningategund: ${rangt.length} (grunnlína ${GRUNNLINA}), þar af ${klarad} merkt "klarad"\n`);
    console.log('   Tegund = tegund skjalsins, annars tegund sölunnar með sama númeri.');
    console.log('   Triggerinn hafnar búðarsölu og losar reikning þegar tegundin breytist');
    console.log('   (sql/2026-09-15_para_tegund_erfd.sql). Nýtt tilvik = par sem varð til framhjá');
    console.log('   triggernum (cowork, handvirk pörun) eða triggerinn hefur verið tekinn af.\n');
    rangt.slice(-8).forEach(p => {
      const d = byId.get(p.invoice_doc_id);
      console.log(`   par ${String(p.id).padEnd(6)}${p.service_type.padEnd(11)}${p.year}  `
        + `${String(d.invoice_number || '—').padEnd(12)}teg=${tegund(d).padEnd(11)}${d.vidskiptategund ? '' : '(úr sölu) '}${p.status}`);
    });
  }

  if (ostimplud.length > GRUNNLINA_OSTIMPLUD) {
    rautt = true;
    console.log(`❌ T2 Óstimpluð reikningsskjöl sem eiga sölu: ${ostimplud.length} (grunnlína ${GRUNNLINA_OSTIMPLUD})\n`);
    console.log('   trg_customer_documents_erfa_tegund á að láta skjalið erfa tegund sölunnar við vistun.');
    console.log('   Er triggerinn á sínum stað? Óstimplað skjal parast sem úttekt þótt salan sé búðarsala.\n');
    ostimplud.slice(-8).forEach(d => console.log(`   skjal ${String(d.id).padEnd(7)}${String(d.invoice_number).padEnd(12)}sala=${salaTeg(d)}`));
  }

  if (rautt) process.exit(1);
  console.log(`✅ Pörun-tegund heldur — T1 ${rangt.length}/${GRUNNLINA} röng pör (${klarad} "klarad") · T2 ${ostimplud.length}/${GRUNNLINA_OSTIMPLUD} óstimpluð skjöl með sölu.`);
  process.exit(0);
})().catch(e => { console.log('❌ Vörðurinn keyrði ekki: ' + e.message); process.exit(1); });
