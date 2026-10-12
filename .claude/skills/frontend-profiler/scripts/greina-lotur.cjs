// Telur hve oft fall keyrir (samfelldar lotur í sýnaröðinni) og hve lengi hver lota er.
const fs = require('fs'); const [, , f, ...nofn] = process.argv;
const p = JSON.parse(fs.readFileSync(f)); const byId = new Map(p.nodes.map((n) => [n.id, n])); const parent = new Map();
for (const n of p.nodes) for (const c of (n.children || [])) parent.set(c, n.id);
const cache = new Map();
function inni(nid, nafn) { const k = nid + '|' + nafn; if (cache.has(k)) return cache.get(k); let q = nid, r = false; while (q != null) { const cf = byId.get(q).callFrame; if ((cf.url || '').includes(nafn.split(':')[0]) && cf.functionName === nafn.split(':')[1]) { r = true; break; } q = parent.get(q); } cache.set(k, r); return r; }
for (const nafn of nofn) {
  const lotur = []; let cur = null, t = p.startTime;
  for (let i = 0; i < p.samples.length; i++) { t += p.timeDeltas[i]; const d = (p.timeDeltas[i + 1] || 0) / 1000; const a = inni(p.samples[i], nafn);
    if (a) { if (!cur) { cur = { s: (t - p.startTime) / 1000, ms: 0 }; lotur.push(cur); } cur.ms += d; } else cur = null; }
  const ms = lotur.map((l) => l.ms).sort((a, b) => b - a);
  console.log(nafn, '— lotur', lotur.length, '· samtals', Math.round(ms.reduce((a, b) => a + b, 0)), 'ms · miðgildi', Math.round(ms[ms.length >> 1] || 0), 'ms · lengsta', Math.round(ms[0] || 0), 'ms · síðasta lota hófst', Math.round((lotur[lotur.length - 1] || {}).s || 0), 'ms eftir opnun');
}
