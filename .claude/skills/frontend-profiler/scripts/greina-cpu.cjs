// Les .cpuprofile: innbyggð föll (querySelectorAll, getBoundingClientRect…) lögð á næsta JS-kallanda.
const fs = require('fs'); const f = process.argv[2];
const p = JSON.parse(fs.readFileSync(f)); const byId = new Map(p.nodes.map((n) => [n.id, n])); const parent = new Map();
for (const n of p.nodes) for (const c of (n.children || [])) parent.set(c, n.id);
const self = new Map(); for (let i = 0; i < p.samples.length; i++) self.set(p.samples[i], (self.get(p.samples[i]) || 0) + (p.timeDeltas[i] || 0) / 1000);
const sk = (u) => (u || '').replace(/^https?:\/\/[^/]+\//, '').replace(/\?.*$/, '');
const lykill = (n) => sk(n.callFrame.url) + ' ' + (n.callFrame.functionName || '(nafnl.)') + ':' + (n.callFrame.lineNumber + 1);
const folded = {}, natByCaller = {}, gegnum252 = {}; let alls = 0, idle = 0;
for (const [nid, ms] of self) {
  alls += ms; let n = byId.get(nid);
  if (/^\((idle|program|garbage collector|root)\)$/.test(n.callFrame.functionName)) { folded[n.callFrame.functionName] = (folded[n.callFrame.functionName] || 0) + ms; continue; }
  let p2 = nid, nat = n.callFrame.url ? null : n.callFrame.functionName;
  while (p2 != null && !byId.get(p2).callFrame.url) p2 = parent.get(p2);
  const k = p2 != null ? lykill(byId.get(p2)) : '(ekkert JS) ' + n.callFrame.functionName;
  folded[k] = (folded[k] || 0) + ms;
  if (nat) natByCaller[nat + ' ← ' + k] = (natByCaller[nat + ' ← ' + k] || 0) + ms;
  // Hvaða vakt-kall (barn 252) ber tímann
  let q = nid, barn = null; while (q != null) { const qn = byId.get(q); if (/252-mo-throttle/.test(qn.callFrame.url)) break; if (qn.callFrame.url) barn = qn; q = parent.get(q); }
  if (q != null && barn) { const kk = lykill(barn); gegnum252[kk] = (gegnum252[kk] || 0) + ms; }
}
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => String(Math.round(v)).padStart(6) + ' ms  ' + k).join('\n');
console.log('Sýni samtals', Math.round(alls), 'ms\n-- Sjálfstími, innbyggð föll lögð á JS-kallanda --\n' + top(folded, 28));
console.log('-- Innbyggð föll eftir kallanda --\n' + top(natByCaller, 16));
console.log('-- Tími undir 252-mo-throttle, eftir vaktar-fallinu sem það kallaði --\n' + top(gegnum252, 16));
