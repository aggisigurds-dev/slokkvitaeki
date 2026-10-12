const fs = require('fs'); const t = JSON.parse(fs.readFileSync(process.argv[2])); const ev = t.traceEvents || t;
const s = {}, dsamp = [];
for (const e of ev) {
  if (e.name !== 'ScheduleStyleInvalidationTracking') continue; const d = (e.args && e.args.data) || {};
  const st = d.stackTrace && d.stackTrace[0]; const hver = st ? (st.url || '').replace(/^https?:\/\/[^/]+\//, '').replace(/\?.*/, '') + ':' + (st.lineNumber + 1) + ' ' + st.functionName : '(án stakks)';
  const k = (d.changedClass ? 'klasi .' + d.changedClass : d.changedAttribute ? 'eigind [' + d.changedAttribute + ']' : d.changedId ? 'id #' + d.changedId : d.changedPseudo ? 'gervi :' + d.changedPseudo : (d.reason || '?')) + ' á ' + (d.nodeName || '').slice(0, 50) + '  ←  ' + hver;
  s[k] = (s[k] || 0) + 1; if (dsamp.length < 3 && /has/.test(d.reason || '')) dsamp.push(d);
}
Object.entries(s).sort((a, b) => b[1] - a[1]).slice(0, 35).forEach(([k, v]) => console.log(String(v).padStart(5), k));
console.log(JSON.stringify(dsamp).slice(0, 600));
