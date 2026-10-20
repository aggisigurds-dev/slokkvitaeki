const fs = require('fs');
const allt = JSON.parse(fs.readFileSync('ser_allt.json', 'utf8'));
const B = 'https://skjalasafn.reykjavik.is';
const vil = process.argv.slice(2);
(async () => {
  for (const a of allt) {
    if (!vil.some((v) => a.filename.startsWith(v))) continue;
    const p = a.previews.find((x) => x.size === 1600) || a.previews.find((x) => x.size === 1200);
    const r = await fetch(B + p.href); const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync('pv/' + a.filename.replace('.pdf', '') + '.jpg', buf);
    console.log(a.filename, p.size, p.width + 'x' + p.height, buf.length, a.href);
  }
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
