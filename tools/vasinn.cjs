#!/usr/bin/env node
/* Vasinn — lestrartól Claude (01.11.2026). Les það sem Agnar stakk í vasann (app-síðan 491, tafla `vasinn`,
 * fata `vasinn`) og sækir skrárnar á disk svo Claude geti skoðað myndir/PDF/hljóð.
 *
 *   node tools/vasinn.cjs                 ólesnir hlutir (listi + skrár sóttar í <mappa>)
 *   node tools/vasinn.cjs --allt          líka lesnir (síðustu 30 dagar)
 *   node tools/vasinn.cjs --id 12         einn hlutur
 *   node tools/vasinn.cjs --mappa <slóð>  hvert skrárnar fara (sjálfgefið: %TEMP%/vasinn)
 *   node tools/vasinn.cjs --lesid 12,13 --svar "Reikningur frá Byko settur í kostnað"
 *                                         stimplar lesid_at + svar Claude (eitt svar á alla sem taldir eru)
 *   node tools/vasinn.cjs --json          vélrænt úttak
 *
 * Skilar JSON-línum líka (--json) svo skill-ið geti lesið. Anon-lykillinn úr js/config.js dugar (RLS: anon all). */
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.resolve(__dirname, '..');
const cfg = fs.readFileSync(path.join(ROOT, 'js', 'config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/) || [])[1] || 'https://osfdzskyvisifcwyjkuk.supabase.co';
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/) || [])[1];
if (!KEY) { console.error('Fann ekki SUPABASE_KEY í js/config.js'); process.exit(2); }
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? (process.argv[i + 1] || '') : d; };
const has = n => process.argv.includes(n);
const mappa = arg('--mappa', path.join(os.tmpdir(), 'vasinn'));
const json = has('--json');

async function rest(p, init) {
  const r = await fetch(URL_ + '/rest/v1/' + p, Object.assign({ headers: H }, init || {}));
  const t = await r.text();
  if (!r.ok) throw new Error('REST ' + r.status + ' ' + p + ': ' + t.slice(0, 300));
  return t ? JSON.parse(t) : null;
}
const fmt = iso => { const d = new Date(iso); const p = n => String(n).padStart(2, '0'); return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); };

(async () => {
  if (has('--lesid')) {
    const ids = arg('--lesid', '').split(',').map(s => +s.trim()).filter(Boolean);
    if (!ids.length) { console.error('--lesid þarf id (t.d. --lesid 12,13)'); process.exit(2); }
    const svar = arg('--svar', '') || null;
    await rest('vasinn?id=in.(' + ids.join(',') + ')', { method: 'PATCH', headers: Object.assign({ Prefer: 'return=minimal' }, H), body: JSON.stringify({ lesid_at: new Date().toISOString(), lesid_af: 'Claude', svar }) });
    console.log('✓ Merkt lesið: ' + ids.join(', ') + (svar ? ' — „' + svar + '“' : ''));
    return;
  }
  let q = 'vasinn?select=*&deleted_at=is.null&order=created_at.desc';
  if (has('--id')) q += '&id=eq.' + (+arg('--id', 0));
  else if (has('--allt')) q += '&created_at=gte.' + new Date(Date.now() - 30 * 864e5).toISOString() + '&limit=200';
  else q += '&lesid_at=is.null&limit=200';
  const rows = await rest(q);
  if (!rows.length) { console.log(json ? '[]' : 'Vasinn er tómur' + (has('--allt') || has('--id') ? '' : ' (ekkert ólesið — prófaðu --allt)') + '.'); return; }
  fs.mkdirSync(mappa, { recursive: true });
  const ut = [];
  for (const r of rows) {
    let skra = null;
    if (r.storage_path) {
      const ext = path.extname(r.file_name || r.storage_path) || '';
      skra = path.join(mappa, 'vasi-' + r.id + ext);
      if (!fs.existsSync(skra)) {
        const res = await fetch(URL_ + '/storage/v1/object/public/vasinn/' + r.storage_path);
        if (res.ok) fs.writeFileSync(skra, Buffer.from(await res.arrayBuffer())); else { skra = null; }
      }
    }
    ut.push(Object.assign({}, r, { skra }));
  }
  if (json) { console.log(JSON.stringify(ut, null, 1)); return; }
  console.log('👝 Vasinn — ' + ut.length + ' hlut' + (ut.length === 1 ? 'ur' : 'ir') + (has('--allt') ? ' (síðustu 30 d.)' : ' ólesn' + (ut.length === 1 ? 'ir' : 'ir')) + '\n');
  for (const r of ut) {
    console.log('#' + r.id + ' · ' + fmt(r.created_at) + ' · ' + r.tegund + (r.file_name ? ' · ' + r.file_name + (r.size ? ' (' + Math.round(r.size / 1024) + ' KB)' : '') : '') + ' · ' + (r.hofundur || '') + ' · ' + (r.taeki || '') + (r.lesid_at ? ' · ✓ lesið ' + fmt(r.lesid_at) : ''));
    if (r.skyring) console.log('   Skýring: ' + r.skyring.replace(/\n/g, '\n            '));
    if (r.afrit) console.log('   Afrit:   ' + r.afrit.replace(/\n/g, '\n            '));
    if (r.svar) console.log('   Claude:  ' + r.svar);
    if (r.skra) console.log('   Skrá:    ' + r.skra);
    else if (r.storage_path) console.log('   Skrá:    (náðist ekki) ' + URL_ + '/storage/v1/object/public/vasinn/' + r.storage_path);
    console.log('');
  }
  console.log('Myndir/PDF: opnaðu skrána með Read. Hljóð: afritið að ofan er sjálfvirk talgreining — hlustaðu ekki, treystu afritinu og spurðu Agnar ef það er óskýrt.');
  console.log('Þegar búið: node tools/vasinn.cjs --lesid ' + ut.map(r => r.id).join(',') + ' --svar "<hvað var gert>"');
})().catch(e => { console.error('✗ ' + (e && e.message || e)); process.exit(1); });
