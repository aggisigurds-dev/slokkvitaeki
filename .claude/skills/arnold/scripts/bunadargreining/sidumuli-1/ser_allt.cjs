const fs = require('fs');
(async () => {
  const B = 'https://skjalasafn.reykjavik.is';
  let url = '/fotoweb/archives/5004-S%C3%A9ruppdr%C3%A6ttir/?q=103784', allt = [];
  for (let i = 0; i < 8 && url; i++) {
    const r = await fetch(B + url, { headers: { Accept: 'application/json' } }); const j = await r.json();
    const o = j.assets || j; allt = allt.concat(o.data); const nx = o.paging && o.paging.next; url = nx && nx !== url ? nx : '';
  }
  fs.writeFileSync('ser_allt.json', JSON.stringify(allt));
  const per = {};
  for (const a of allt) { const m = a.metadata || {}; const t = (m['205'] || {}).value || '?'; (per[t] = per[t] || []).push(a); }
  console.log('samtals', allt.length, Object.keys(per).map((k) => k + ':' + per[k].length).join(' · '));
  for (const k of Object.keys(per)) { console.log('== ' + k); for (const a of per[k].slice(0, 60)) { const m = a.metadata; console.log('  ', a.filename, Math.round(a.filesize / 1024) + 'KB', a.modified.slice(0, 10), JSON.stringify(Object.fromEntries(Object.entries(m).filter(([n]) => !['2', '202', '203', '204', '205', '210'].includes(n)).map(([n, v]) => [n, v.value]))).slice(0, 120)); } }
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
