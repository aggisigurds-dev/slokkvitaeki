const fs = require('fs');
const base = 'https://skjalasafn.reykjavik.is/fotoweb/archives/5000-A%C3%B0aluppdr%C3%A6ttir/A%C3%B0aluppdr%C3%A6ttir/2018/06/';
(async () => {
  for (const f of ['2018-04-2401574', '2018-04-2401575']) {
    const u = '/.netlify/functions/teikn-mynd?url=' + encodeURIComponent(base + f + '.tif.info');
    const r = await fetch('https://slokkvitaeki.netlify.app' + u);
    const b = Buffer.from(await r.arrayBuffer()); fs.writeFileSync(f + '.jpg', b);
    console.log(f, r.status, r.headers.get('content-type'), b.length);
  }
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
