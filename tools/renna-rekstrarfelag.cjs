#!/usr/bin/env node
// Rennir rekstrarfélagi í gegnum „⚖ Para eftir magni" á LIFANDI brunahólfi (netlify/functions/para-rekstrarfelag.js):
//   GET → [les ALLAR ólesnar skýrslur (POST lesa)] → GET → [parar það sem ma_para (POST para)] → GET → prentar töfluna.
//
//   node tools/renna-rekstrarfelag.cjs 540994-2269 [510117-0690 …]      # LESAÐEINS — ekkert skrifað
//   node tools/renna-rekstrarfelag.cjs 540994-2269 --skrifa              # les PDF inn í söguna + facts og parar örugg pör
//   node tools/renna-rekstrarfelag.cjs 540994-2269 --skrifa --force      # lesa yfirskrifar færslu sem stöðvar sig (sjá SKILL)
//
// Sjá .claude/skills/rekstrarfelog-parun/SKILL.md — einn reikningur ein skýrsla, vegna-lína, tvíræð, tvær geymslur.
// Skrifin fara í document_pairs (matched_by 'magn_station') og arsskodun_customers[fid].history + arsskodun_report_facts.
// Afritaðu töflurnar áður en --skrifa er keyrt á félag sem ekki hefur verið rennt áður.
const fs = require('fs');
const path = require('path');
const U = process.env.RF_URL || 'https://brunaholf.netlify.app/api/para-rekstrarfelag';
const args = process.argv.slice(2);
const SKRIFA = args.includes('--skrifa');
const FORCE = args.includes('--force');
const kts = args.filter(a => /^[0-9]{6}-[0-9]{4}$/.test(a));
if (!kts.length) { console.error('Notkun: node tools/renna-rekstrarfelag.cjs <kt> [<kt> …] [--skrifa] [--force]'); process.exit(2); }
const MAN = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'];
const get = async (kt) => { const r = await fetch(U + '?kt=' + encodeURIComponent(kt)); if (!r.ok) throw new Error('GET ' + r.status); return r.json(); };
const post = async (b) => { const r = await fetch(U, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }); const t = await r.text(); try { return JSON.parse(t); } catch (_) { return { ok: false, reason: 'HTTP ' + r.status + ' ' + t.slice(0, 120) }; } };
const pad = (s, n) => String(s == null ? '' : s).slice(0, n).padEnd(n);
(async () => {
  console.log(SKRIFA ? '⚠ SKRIFA-HAMUR: les PDF inn í söguna og parar örugg pör' : 'lesaðeins (bættu við --skrifa til að lesa PDF og para)');
  for (const kt of kts) {
    const t0 = Date.now();
    const g0 = await get(kt);
    const nafn = (g0.stadir[0] || {}).nafn || kt;
    console.log('\n' + '='.repeat(100) + '\n' + kt + ' · staðir ' + g0.stadir.length + ' · skýrslur með talningu ' + g0.skyrslur.length + ' · ólesnar ' + g0.olesnar.length + ' · reikningar án skýrslu ' + g0.reikningar_an_skyrslu.length);
    const lesid = [];
    for (const d of g0.olesnar) {
      const j = SKRIFA ? await post({ action: 'lesa', doc_id: d.doc, force: FORCE }) : await post({ action: 'lesa', doc_id: d.doc, dry: true });
      lesid.push({ doc: d.doc, fid: d.fid, nafn: d.nafn, skra: d.skra, ...j });
      console.log('  lesa ' + pad(d.doc, 6) + pad(d.nafn, 34) + pad(d.ar, 5) + (j.ok ? '✓ ' + pad((j.man ? MAN[j.man - 1] : '?') + ' ' + j.ar, 9) + pad(j.vigur, 44) + ' „' + (j.hja || '') + '“' + (j.dry ? ' (þurrt)' : '') + (j.vidvorun ? '\n         ⚠ ' + j.vidvorun : '') : '✗ ' + (j.reason || j.error)));
    }
    const g1 = lesid.length && SKRIFA ? await get(kt) : g0;
    const parad = [];
    for (let i = 0; i < g1.skyrslur.length; i++) {
      const s = g1.skyrslur[i];
      if (!s.ma_para || !s.reikningur) continue;
      const b = { action: 'para', par_id: s.par && s.par.id, fid: s.fid, base: s.base, year: s.ar, report_doc_id: s.doc, invoice_doc_id: s.reikningur.doc, solur_id: s.reikningur.solur_id, reikn: s.reikningur.nr, fravik: s.reikningur.fravik, dry: !SKRIFA };
      const j = await post(b);
      parad.push({ ...b, ...j });
      console.log('  para ' + pad(s.nafn, 34) + pad(s.ar, 5) + pad(s.reikningur.nr, 10) + 'frávik ' + pad(s.reikningur.fravik, 5) + (j.ok ? '✓ ' + (j.adgerd || '') + (j.dry ? ' (þurrt)' : '') : '✗ ' + (j.reason || j.error)));
    }
    const g2 = parad.length && SKRIFA ? await get(kt) : g1;
    console.log('\n  ' + pad('Skýrsla', 34) + pad('ár-mán', 9) + pad('tæki í skýrslu', 36) + pad('reikningur', 12) + pad('frv', 5) + pad('staður eftir tækjum', 24) + 'par');
    for (const s of g2.skyrslur) {
      const r = s.reikningur || {}, st = s.stadur || {};
      console.log('  ' + pad(s.nafn, 34) + pad(s.ar + '-' + (s.man ? MAN[s.man - 1] : '?') + (s.eldri ? '⚠' : ''), 9) + pad(s.skyrsla_txt, 36) + pad(r.nr || '—', 12) + pad(r.nr ? r.fravik : '', 5) + pad((st.nafn || '—') + (st.sammala === false ? ' ≠' : ''), 24) + s.par_stada + (s.ma_para ? ' · MÁ PARA' : '')
        + (s.hja ? '\n      „' + s.hja + '“' : '') + ((s.ath || []).length ? '\n      ⚑ ' + s.ath.join('\n      ⚑ ') : ''));
    }
    if (g2.reikningar_an_skyrslu.length) { console.log('\n  reikningar án skýrslu:'); g2.reikningar_an_skyrslu.forEach(r => console.log('    ' + pad(r.nr, 10) + pad(r.dags, 12) + pad(r.nafn || r.fid, 34) + pad(r.skodud_txt || '', 40) + (r.ny_txt && r.ny_txt !== '—' ? ' ný: ' + r.ny_txt : '') + (r.vegna ? ' · vegna „' + r.vegna + '“' : ''))); }
    if (g2.olesnar.length) { console.log('\n  enn ólesnar: ' + g2.olesnar.map(d => d.doc + ' ' + (d.nafn || '') + ' ' + (d.ar || '')).join(' | ')); }
    console.log('\n  hleðslusaga (hlaðin/ný á ári):');
    g2.hledsla.forEach(h => console.log('    ' + pad(h.nafn, 34) + pad(h.taeki + ' tæki', 10) + h.saga.map(s => s.ar + ': ' + s.hladin + '/' + s.ny).join('  ') + (h.texti && h.texti.annad ? '\n      ' + h.texti.ar + ': ' + h.texti.annad.slice(0, 150) : '')));
    const ut = path.join(__dirname, '..', 'ut'); fs.mkdirSync(ut, { recursive: true });
    const skra = path.join(ut, 'renna-' + kt + '.json');
    fs.writeFileSync(skra, JSON.stringify({ kt, nafn, skrifa: SKRIFA, lesid, parad, lok: g2 }, null, 1));
    console.log('\n  → ' + skra + ' · ' + Math.round((Date.now() - t0) / 1000) + ' s');
  }
})().catch(e => { console.error('BILUN', e); process.exit(1); });
