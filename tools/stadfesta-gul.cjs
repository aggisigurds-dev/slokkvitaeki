#!/usr/bin/env node
/* Reynir að staðfesta „gulu" staðina — þá sem eru í þjónustu en bera enga
 * skýrslutölu — úr ÖÐRUM heimildum en úttektarskýrslunni:
 *   · þjónustusamningur (customer_documents doc_type='samningur')
 *   · reikningar á staðnum (línur/upphæð segja oft tækjafjöldann)
 *   · arsskodun_customers-blobbinn (önnur tækjatalning en report_facts)
 *   · email_digest — leitað á nafni OG heimilisfangi
 *
 * ⚠️ email_digest ber AÐEINS eldklar@eldklar.is (5.576 raðir, mælt 01.09.2026).
 * Fjögur önnur pósthólf sem skjölin lýsa eru ekki lengur í töflunni, svo tómt
 * póstsvar hér sannar EKKERT — sbr. STADREYNDIR §7.15.
 */
const fs = require('fs');
const path = require('path');
const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

async function sb(q) {
  const r = await fetch(`${URL_}/rest/v1/${q}`, { headers: H });
  if (!r.ok) throw new Error(`${q.slice(0, 60)} → ${r.status} ${(await r.text()).slice(0, 150)}`);
  return r.json();
}
async function allar(q) {
  let ut = [], f = 0;
  for (;;) { const d = await sb(`${q}&offset=${f}&limit=1000`); if (!d.length) break; ut = ut.concat(d); if (d.length < 1000) break; f += 1000; }
  return ut;
}
const ordhlutar = s => String(s || '').toLowerCase()
  .replace(/[^\wáðéíóúýþæö\s-]/gi, ' ').split(/\s+/)
  .filter(w => w.length > 3 && !['ehf', 'hfs', 'húsfélag', 'husfelag', 'slf'].includes(w));

(async () => {
  const FID = process.argv.slice(2).filter(x => /^\d+$/.test(x)).map(Number);
  if (!FID.length) { console.log('Notkun: node tools/stadfesta-gul.cjs <fid> [fid...]'); return; }

  const [co, docs, post, as] = await Promise.all([
    allar(`fyrirtaeki?select=id,nafn,kennitala,heimilisfang,customer_base_id&id=in.(${FID.join(',')})`),
    allar(`customer_documents?select=*&fyrirtaeki_id=in.(${FID.join(',')})&order=id`),
    allar('email_digest?select=subject,sender_email,sender_name,received_at,snippet,folder&order=id'),
    sb('app_settings?select=settings&id=eq.1'),
  ]);
  const blob = (as[0] && as[0].settings && as[0].settings.arsskodun_customers) || {};

  for (const c of co) {
    console.log('\n' + '═'.repeat(74));
    console.log(`fid ${c.id}  ${c.nafn}`);
    console.log(`   kt ${c.kennitala || '—'}   ${c.heimilisfang || 'ekkert heimilisfang'}`);

    const d = docs.filter(x => x.fyrirtaeki_id === c.id);
    const samn = d.filter(x => x.doc_type === 'samningur');
    console.log(`\n   SAMNINGUR: ${samn.length ? samn.length : 'enginn'}`);
    samn.forEach(x => console.log(`      ${x.year || '—'}  ${String(x.file_name || '').slice(0, 62)}`
      + (x.drive_file_id ? `  drive=${x.drive_file_id.slice(0, 12)}` : '')));

    const reik = d.filter(x => x.doc_type === 'reikningur');
    console.log(`   REIKNINGAR: ${reik.length ? reik.length : 'engir'}`);
    reik.forEach(x => console.log(`      ${x.year || '—'}  ${String(x.invoice_number || '—').padEnd(11)}`
      + `${x.amount == null ? 'engin upphæð' : x.amount + ' kr'}   ${String(x.file_name || '').slice(0, 44)}`));

    const skyr = d.filter(x => x.doc_type === 'uttektarskyrsla');
    console.log(`   ÚTTEKTARSKÝRSLUR: ${skyr.length ? skyr.length : 'engar'}`);
    skyr.forEach(x => console.log(`      ${x.year || '—'}  ${String(x.file_name || '(ekkert skráarheiti)').slice(0, 62)}`));

    const b = blob[String(c.id)];
    if (b && b.equipment) {
      const summa = Object.values(b.equipment).reduce((a, v) => a + (+v || 0), 0);
      console.log(`   BLOBBINN: ${summa} tæki  ${JSON.stringify(b.equipment)}`);
    } else console.log('   BLOBBINN: engin færsla');

    // póstleit — nafn og heimilisfang
    const leit = [...new Set([...ordhlutar(c.nafn), ...ordhlutar(c.heimilisfang)])];
    const hits = post.filter(p => {
      const hay = ((p.subject || '') + ' ' + (p.snippet || '') + ' ' + (p.sender_name || '') + ' ' + (p.sender_email || '')).toLowerCase();
      return leit.some(w => hay.includes(w));
    });
    console.log(`   PÓSTAR (leitarorð: ${leit.join(', ') || '—'}): ${hits.length}`);
    hits.slice(0, 6).forEach(p => console.log(`      ${String(p.received_at || '').slice(0, 10)}  ${String(p.folder || '')}`
      + `  ${String(p.sender_email || '').slice(0, 28).padEnd(29)}${String(p.subject || '').slice(0, 46)}`));
    if (hits.length > 6) console.log(`      … og ${hits.length - 6} til viðbótar`);
  }
  console.log('\n' + '═'.repeat(74));
  console.log(`email_digest: ${post.length} raðir, hólf: ${[...new Set(post.map(p => p.sender_email && 0))].length ? '' : ''}`
    + [...new Set(post.map(p => p.folder))].join(', '));
  console.log('⚠️ Aðeins eitt pósthólf er í töflunni — tómt svar sannar ekkert (§7.15).');
})().catch(e => { console.log('❌ ' + e.message); process.exitCode = 1; });
