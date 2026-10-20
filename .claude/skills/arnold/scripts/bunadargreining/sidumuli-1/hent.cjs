// Sækir valin Reykjavíkur-skjöl (aðaluppdrætti úr listi.json) um teikn-pdf og vistar í pdf/ — aðeins lestur
const fs = require('fs');
fs.mkdirSync('pdf', { recursive: true });
const j = JSON.parse(fs.readFileSync('listi.json', 'utf8'));
const vil = process.argv.slice(2);
(async () => {
  for (const f of vil) {
    const t = j.results.find((x) => x.filename === f);
    if (!t) { console.log('fannst ekki', f); continue; }
    const r = await fetch('https://slokkvitaeki.netlify.app/.netlify/functions/teikn-pdf?url=' + encodeURIComponent(t.infoUrl));
    const b = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync('pdf/' + f, b);
    console.log(f, r.status, r.headers.get('content-type'), b.length, t.tegund, t.dags, t.lysing);
  }
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
