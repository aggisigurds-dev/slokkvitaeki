// _fake-postgrest.cjs — lítill gervi-PostgREST í minni fyrir próf (Merkja og keyra, 17.11.2026).
// Kemur í stað P.sbGet / P.sbPost / P.sbPatch (_portal.cjs) svo föllin keyri ÓBREYTT án gagnagrunns. Skilur aðeins
// þau síuform sem föllin nota: eq, neq, in, gte, gt, lt, lte, is, or=(…) (eitt lag + and(…)), claude->>x, order, limit.
// Ekkert fer á netið. Allar skrifaðgerðir skráðar í `skrif` svo próf geti sannað hvað var (og var ekki) skrifað.
'use strict';

function skipta(s) { const ut = []; let d = 0, b = ''; for (const c of s) { if (c === '(') d++; if (c === ')') d--; if (c === ',' && d === 0) { ut.push(b); b = ''; } else b += c; } if (b) ut.push(b); return ut; }
const ohnudd = (v) => String(v).replace(/^"|"$/g, '');
function gildi(rod, dalkur) {
  const m = dalkur.match(/^(\w+)->>(\w+)$/);
  if (m) { const o = rod[m[1]]; return o && o[m[2]] != null ? String(o[m[2]]) : null; }
  const m2 = dalkur.match(/^(\w+)->(\w+)->>(\w+)$/);
  if (m2) { const o = rod[m2[1]] && rod[m2[1]][m2[2]]; return o && o[m2[3]] != null ? String(o[m2[3]]) : null; }
  return rod[dalkur];
}
const bera = (a, b) => { const na = Number(a), nb = Number(b); if (a != null && b != null && a !== '' && b !== '' && !isNaN(na) && !isNaN(nb) && !/T/.test(String(a))) return na - nb; return String(a).localeCompare(String(b)); };
function ein(rod, dalkur, tj) {
  let neit = false, t = tj;
  if (t.startsWith('not.')) { neit = true; t = t.slice(4); }
  const i = t.indexOf('.'); const op = t.slice(0, i), v = ohnudd(t.slice(i + 1));
  const r = gildi(rod, dalkur);
  let s;
  switch (op) {
    case 'eq': s = r != null && String(r) === v; break;
    case 'neq': s = r == null || String(r) !== v; break;
    case 'is': s = v === 'null' ? r == null : String(r) === v; break;
    case 'in': s = skipta(v.replace(/^\(|\)$/g, '')).map(ohnudd).some((x) => r != null && String(r) === x); break;
    case 'gte': s = r != null && bera(r, v) >= 0; break;
    case 'gt': s = r != null && bera(r, v) > 0; break;
    case 'lt': s = r != null && bera(r, v) < 0; break;
    case 'lte': s = r != null && bera(r, v) <= 0; break;
    default: throw new Error('Óþekktur virki í gervi-PostgREST: ' + op);
  }
  return neit ? !s : s;
}
function eda(rod, innan, ogV) {
  const l = skipta(innan).map((x) => {
    const m = x.match(/^(and|or)\((.*)\)$/);
    if (m) return eda(rod, m[2], m[1] === 'and');
    const k = x.indexOf('.'); return ein(rod, x.slice(0, k), x.slice(k + 1));
  });
  return ogV ? l.every(Boolean) : l.some(Boolean);
}
function greina(qs) {
  const [tafla, q = ''] = qs.split('?');
  const sia = [], ut = { tafla, sia, order: null, limit: null };
  for (const hluti of q.split('&').filter(Boolean)) {
    const k = hluti.indexOf('='); const lykill = decodeURIComponent(hluti.slice(0, k)), v = decodeURIComponent(hluti.slice(k + 1));
    if (lykill === 'select') continue;
    if (lykill === 'order') ut.order = v.split(',').map((x) => { const [c, d] = x.split('.'); return [c, d === 'desc' ? -1 : 1]; });
    else if (lykill === 'limit') ut.limit = Number(v);
    else if (lykill === 'or') sia.push((r) => eda(r, v.replace(/^\(|\)$/g, ''), false));
    else sia.push((r) => ein(r, lykill, v));
  }
  return ut;
}
const svar = (status, body) => ({ ok: status < 300, status, json: async () => body, text: async () => JSON.stringify(body) });

function bua(fraeVid = {}) {
  const T = {}, skrif = [];
  let nid = 1000;
  for (const [k, v] of Object.entries(fraeVid)) T[k] = v.map((x) => Object.assign({}, x));
  const tafla = (n) => (T[n] = T[n] || []);
  const velja = (qs) => {
    const g = greina(qs);
    let l = tafla(g.tafla).filter((r) => g.sia.every((f) => f(r)));
    if (g.order) l = l.slice().sort((a, b) => { for (const [c, d] of g.order) { const x = bera(a[c], b[c]); if (x) return x * d; } return 0; });
    if (g.limit != null) l = l.slice(0, g.limit);
    return { g, l };
  };
  const EINKV = { afgreidsla: ['lykill'] };
  return {
    T, skrif,
    sbGet: async (qs) => svar(200, velja(qs).l.map((r) => JSON.parse(JSON.stringify(r)))),
    sbPost: async (t, body) => {
      const rows = (Array.isArray(body) ? body : [body]).map((b) => Object.assign({ id: ++nid, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, JSON.parse(JSON.stringify(b))));
      for (const r of rows) for (const k of EINKV[t] || []) if (tafla(t).some((x) => x[k] === r[k])) return svar(409, { message: 'duplicate key' });
      if (t === 'bord_merkingar') for (const r of rows) {
        if (r.merki === 'snooze' && !r.due_at) return svar(400, { message: 'bord_merkingar_snooze_dags' });
        if (['merkt', 'i_keyrslu', 'blundar'].includes(r.stada || 'merkt') && tafla(t).some((x) => x.lina === r.lina && x.merkt_af === r.merkt_af && ['merkt', 'i_keyrslu', 'blundar'].includes(x.stada))) return svar(409, { message: 'bord_merkingar_ein_virk' });
        r.stada = r.stada || 'merkt';
      }
      tafla(t).push(...rows); skrif.push({ m: 'POST', t, body: rows });
      return svar(201, rows.map((r) => JSON.parse(JSON.stringify(r))));
    },
    sbPatch: async (qs, body) => {
      const { g, l } = velja(qs);
      for (const r of l) Object.assign(r, JSON.parse(JSON.stringify(body)));
      skrif.push({ m: 'PATCH', t: g.tafla, qs, n: l.length });
      return svar(200, l.map((r) => JSON.parse(JSON.stringify(r))));
    },
  };
}
// Setur gervið í stað _portal-fallanna (sama hlutur og allar skrár halda í). Skilar endurstillingu.
function tengja(P, fake) {
  const fyrri = { sbGet: P.sbGet, sbPost: P.sbPost, sbPatch: P.sbPatch, dbReady: P.dbReady };
  P.sbGet = fake.sbGet; P.sbPost = fake.sbPost; P.sbPatch = fake.sbPatch; P.dbReady = () => true;
  return () => Object.assign(P, fyrri);
}
module.exports = { bua, tengja, greina };
