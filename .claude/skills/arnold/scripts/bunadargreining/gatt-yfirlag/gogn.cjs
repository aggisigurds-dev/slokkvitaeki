// Gátt-yfirlag (22.10.2026): sækir blöðin eins og Gáttin les þau (bunadargreining.teikningar + tki.bx/by [+ tillogur]) → blod.json + blod/<hash>.jpg
//   node gogn.cjs <cid,cid,…>        (keyrt í vinnumöppu — scratchpad; blod/ og blod.json verða til þar)
// Kópavogs-blöð (gagnasja.kopavogur.is) sækir teikn-mynd EKKI (403) — þau eru merkt „vantar" og sleppt; sjá README.
const fs = require('fs'), crypto = require('crypto');
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const url = (cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/) || [])[1], key = (cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/) || [])[1];
const H = { apikey: key, Authorization: 'Bearer ' + key };
const g = async (q) => { const r = await fetch(url + '/rest/v1/' + q, { headers: H }); if (!r.ok) throw new Error(q.slice(0, 50) + ' ' + r.status); return r.json(); };
const ids = String(process.argv[2] || '').split(',').map((x) => +x).filter(Boolean);
if (!ids.length) { console.error('notkun: node gogn.cjs <cid,cid,…>'); process.exit(1); }
fs.mkdirSync('blod', { recursive: true });
(async () => {
  const f = await g(`fyrirtaeki?select=id,nafn&id=in.(${ids.join(',')})`);
  const bg = await g(`bunadargreining?select=company_id,teikningar,tki,tillogur,stadsetningar&fjarlaegt_at=is.null&company_id=in.(${ids.join(',')})`);
  const lysing = [], verk = new Map();
  for (const b of bg) {
    const c = f.find((x) => x.id === b.company_id);
    const tl = b.tillogur && Array.isArray(b.tillogur.tki) ? b.tillogur : null;
    const sk = b.stadsetningar && Array.isArray(b.stadsetningar.tki) ? b.stadsetningar : null;   // raunstaðir úr vinnublöðum
    for (const t of (b.teikningar || [])) {
      if (!t || !t.id || !t.mynd) continue;
      const tk = (b.tki || []).filter((x) => (x.blad || x.haed_id) === t.id);
      const nt = {}; tk.forEach((x) => { if (x.haed) nt[x.haed] = (nt[x.haed] || 0) + 1; });
      const haed = Object.keys(nt).sort((a, b2) => nt[b2] - nt[a])[0] || String(t.nafn || '').split(' — ')[0];
      const hash = crypto.createHash('sha1').update(t.mynd).digest('hex').slice(0, 12);
      const fn = `blod/${hash}.jpg`;
      const till = tl ? tl.tki.filter((x) => x.blad === t.id && isFinite(+x.bx) && isFinite(+x.by) && (x.flokkur === 'sl' || x.flokkur === 'bs')).map((x) => ({ bx: +x.bx, by: +x.by, flokkur: x.flokkur })) : [];
      lysing.push({ cid: c.id, bygging: c.nafn.replace(/^(Center Hótel|Heimaleiga) - /, ''), id: t.id, haed, label: String(t.nafn || haed).split(' — ')[0], mynd: t.mynd, sk: t.skurdur || null, f: fn,
        skrad: sk ? sk.tki.filter((x) => x.blad === t.id && isFinite(+x.bx) && isFinite(+x.by)).map((x) => ({ bx: +x.bx, by: +x.by })) : [],
        tki: tk.filter((x) => x.bx != null && x.by != null && isFinite(+x.bx) && isFinite(+x.by)).map((x) => ({ bx: +x.bx, by: +x.by, flokkur: x.flokkur, bunadur: x.bunadur })), alls: tk.length, till });
      if (!fs.existsSync(fn)) verk.set(fn, t.mynd);
    }
  }
  fs.writeFileSync('blod.json', JSON.stringify(lysing, null, 1));
  console.log('blöð', lysing.length, 'á eftir að sækja', verk.size);
  const q = [...verk.entries()]; let i = 0;
  const vinna = async () => { while (i < q.length) { const [fn, m] = q[i++];
    try { const u = /^http/.test(m) ? m : 'https://slokkvitaeki.netlify.app' + m; const r = await fetch(u, { signal: AbortSignal.timeout(170000) }); if (!r.ok) throw new Error(r.status); fs.writeFileSync(fn, Buffer.from(await r.arrayBuffer())); process.stdout.write('.'); }
    catch (e) { process.stdout.write('x'); console.log('\nvilla', fn, e.message, '— blaðið vantar'); } } };
  await Promise.all([vinna(), vinna(), vinna()]);
  console.log('\nlokið');
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
