#!/usr/bin/env node
/* Loka gömlum þjónustumálum — Agnar 2026-08-31.
 *
 * VANDINN, mældur: Þjónustuborðið er ekki verkefnalisti heldur PÓSTHÓLF.
 *   523 opin mál · 418 þeirra koma úr tölvupósti · 191 eru „Re:"-þræðir
 *   273 eru eldri en 6 mánaða · EKKERT þeirra er merkt áríðandi
 *   `svarad_at` er TÓMT á öllum 523 — reiturinn sem á að skrá „þessu var
 *   svarað" er til og ekkert skrifar nokkurn tíma í hann. Þess vegna stendur
 *   póstur sem þú svaraðir í febrúar áfram sem „nytt".
 *
 * ÞETTA SKJAL lokar málum sem eru eldri en N mánaða og EKKI merkt áríðandi.
 * Það eyðir engu: status fer í 'lokad', færslan stendur og sést undir „lokað".
 *
 *   node tools/loka-gomlum-thjonustumalum.cjs            # SÝNIR bara, breytir engu
 *   node tools/loka-gomlum-thjonustumalum.cjs --keyra    # framkvæmir
 *   node tools/loka-gomlum-thjonustumalum.cjs --manudir 12 --keyra
 *   node tools/loka-gomlum-thjonustumalum.cjs --bakka <bakkskra.json>
 *
 * Bakkskrá er ALLTAF skrifuð áður en nokkru er breytt (tools/bakk-*.json).
 * --bakka skilar öllu í fyrri stöðu úr þeirri skrá.
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const cfg = fs.readFileSync(path.join(rot, 'js/config.js'), 'utf8');
const URL_ = (cfg.match(/SUPABASE_URL\s*=\s*["']([^"']+)/) || [])[1];
const KEY = (cfg.match(/SUPABASE_KEY\s*=\s*["']([^"']+)/) || [])[1];
if (!URL_ || !KEY) { console.error('Fann ekki SUPABASE_URL/KEY í js/config.js'); process.exit(1); }

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const KEYRA = process.argv.includes('--keyra');
const MANUDIR = +arg('--manudir', 6);
const BAKKA = arg('--bakka', null);

const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'content-type': 'application/json' };

async function allar(q) {
  let out = [], from = 0;
  for (;;) {
    const r = await fetch(`${URL_}/rest/v1/${q}&offset=${from}&limit=1000`, { headers: H });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
    const d = await r.json();
    if (!d.length) break;
    out = out.concat(d);
    if (d.length < 1000) break;
    from += 1000;
  }
  return out;
}

async function patch(ids, body) {
  let n = 0;
  for (let i = 0; i < ids.length; i += 100) {
    const c = ids.slice(i, i + 100);
    const r = await fetch(`${URL_}/rest/v1/thjonustubeidni?id=in.(${c.join(',')})`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(body),
    });
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
    n += (await r.json()).length;
    process.stdout.write(`\r  ${n}/${ids.length}`);
  }
  process.stdout.write('\n');
  return n;
}

(async () => {
  // ── BAKKA ───────────────────────────────────────────────────────────────
  if (BAKKA) {
    const gomul = JSON.parse(fs.readFileSync(BAKKA, 'utf8'));
    console.log(`Skila ${gomul.length} málum í fyrri stöðu úr ${BAKKA}`);
    // Hvert mál fær sína EIGIN fyrri stöðu og sínar eigin notes til baka.
    let n = 0;
    for (const m of gomul) {
      const r = await fetch(`${URL_}/rest/v1/thjonustubeidni?id=eq.${m.id}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ status: m.status, notes: m.notes }),
      });
      if (r.ok) n++;
      process.stdout.write(`\r  ${n}/${gomul.length}`);
    }
    console.log(`\nSkilað: ${n}`);
    return;
  }

  // ── SKOÐA ───────────────────────────────────────────────────────────────
  const opin = await allar(
    'thjonustubeidni?select=id,title,customer_nafn,status,notes,created_at,important,source'
    + '&status=eq.nytt&deleted_at=is.null&order=id'
  );
  const nu = Date.now(), d30 = 30 * 864e5;
  const aldur = x => (nu - new Date(x.created_at)) / d30;
  const val = opin.filter(x => !x.important && aldur(x) >= MANUDIR);

  console.log(`Opin mál:            ${opin.length}`);
  console.log(`Eldri en ${MANUDIR} mán:      ${opin.filter(x => aldur(x) >= MANUDIR).length}`);
  console.log(`  ...og EKKI áríðandi: ${val.length}   ← þessum yrði lokað`);
  console.log(`Opin eftir á:        ${opin.length - val.length}`);
  console.log('\nElstu fimm sem yrði lokað:');
  val.slice(0, 5).forEach(x =>
    console.log(`  ${String(x.id).padEnd(6)}${String(x.created_at).slice(0, 10)}  ${(x.customer_nafn || '—').slice(0, 24).padEnd(25)}${String(x.title || '').slice(0, 46)}`));

  if (!KEYRA) {
    console.log('\nEkkert var breytt. Bættu við --keyra til að framkvæma.');
    return;
  }

  const bakk = path.join(__dirname, `bakk-thjonustubord-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(bakk, JSON.stringify(val, null, 1));
  console.log(`\nBakkskrá: ${bakk}`);

  const n = await patch(val.map(x => x.id), {
    status: 'lokad',
    updated_at: new Date().toISOString(),
    notes: `Lokað sjálfvirkt ${new Date().toISOString().slice(0, 10)} — eldra en ${MANUDIR} mánaða og ekki merkt áríðandi. Bakkskrá: ${path.basename(bakk)}`,
  });
  console.log(`Lokað: ${n}`);
  console.log(`Til baka:  node tools/loka-gomlum-thjonustumalum.cjs --bakka "${bakk}"`);
})().catch(e => { console.error('VILLA:', e.message); process.exit(1); });
