// Skráir vörpun blaða greiningarinnar á ramma Teikningar (borðsins) í bunadargreining.teikningar[].varpa = {fx:{k,c}, fy:{k,c}}  (blað → borð: borð = k·blað + c)
// Skútuvogur 4 (661): b1/b2 = aðaluppdráttur 2025 (aðhvarf á atriðum sem eiga bæði hnitin), bk1 = Voltorka 2020 (skra.json: bk1 → b1, svo b1 → borð).
const fs = require('fs');
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const U = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], K = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json', Prefer: 'return=representation' };
const R = JSON.parse(fs.readFileSync(__dirname + '/greining661.json', 'utf8')), SK = JSON.parse(fs.readFileSync(__dirname + '/skra.json', 'utf8'));
const lin = (a, c) => { const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mc = c.reduce((s, v) => s + v, 0) / n; let sxx = 0, sxy = 0; a.forEach((v, i) => { sxx += (v - ma) ** 2; sxy += (v - ma) * (c[i] - mc); }); const k = sxy / sxx; return { k: +k.toFixed(6), c: +(mc - k * ma).toFixed(2) }; };
const fit = (blad) => { const P = R.tki.filter((t) => t.blad === blad && t.x != null && t.bx != null); if (P.length < 3) return null; return { fx: lin(P.map((t) => +t.bx), P.map((t) => +t.x)), fy: lin(P.map((t) => +t.by), P.map((t) => +t.y)), n: P.length }; };
(async () => {
  const f1 = fit('b1'), f2 = fit('b2');
  console.log('b1', JSON.stringify(f1), 'b2', JSON.stringify(f2));
  const bk = f1 && { fx: { k: +(f1.fx.k * SK.k).toFixed(6), c: +(f1.fx.k * SK.ox + f1.fx.c).toFixed(2) }, fy: { k: +(f1.fy.k * SK.k).toFixed(6), c: +(f1.fy.k * SK.oy + f1.fy.c).toFixed(2) } };
  console.log('bk1', JSON.stringify(bk));
  const T = R.teikningar.map((t) => {
    const o = Object.assign({}, t);
    if (t.id === 'b1' && f1) o.varpa = { fx: f1.fx, fy: f1.fy, af: 'aðhvarf á ' + f1.n + ' atriðum' };
    if (t.id === 'b2' && f2) o.varpa = { fx: f2.fx, fy: f2.fy, af: 'aðhvarf á ' + f2.n + ' atriðum' };
    if (t.id === 'bk1' && bk) o.varpa = Object.assign({}, bk, { af: 'krosssamsvörun á línumyndum (FFT) á b1, svo b1 → borð' });
    return o;
  });
  const r = await fetch(U + '/rest/v1/bunadargreining?id=eq.' + R.id + '&fjarlaegt_at=is.null', { method: 'PATCH', headers: H, body: JSON.stringify({ teikningar: T }) });
  const j = await r.json(); console.log(r.status, r.ok ? j[0].teikningar.map((t) => t.id + ':' + (t.varpa ? 'varpa' : '—')).join(' ') : JSON.stringify(j).slice(0, 200));
})();
