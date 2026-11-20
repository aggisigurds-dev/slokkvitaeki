// markmid.cjs — Markmið (16.11.2026, Agnar: „setja allt þetta saman í markmiðslista … mælieiningu, gauge … starting línu,
// expanda … klárað hvert fyrir sig, bæta við gögnum, attachments, screenshots").
//
//   GET  /api/markmid                                   → { markmid[], flokkar[] }  (saga mælinga + undirritaðar slóðir viðhengja)
//   POST { action:'skref', id, skref_id, done }          → { markmid }   haka / taka hak af skrefi
//   POST { action:'skref_nytt', id, texti }              → { markmid }
//   POST { action:'athugasemd', id, texti }              → { markmid }   gögn / athugasemd með tíma og nafni
//   POST { action:'stada', id, stada }                   → { markmid }   opid | i_vinnu | lokid
//   POST { action:'nu', id, gildi }                      → { markmid }   aðeins handvirk markmið
//   POST { action:'maela', id? }                         → { maelt }     mælir eitt eða öll mælanleg markmið
//   POST { action:'vidhengi', id, nafn, tegund, b64 }    → { markmid }   skrá eða skjáskot (mest 4 MB)
//   POST { action:'vidhengi_eyda', id, vid_id }          → { markmid }
//
// Töflurnar markmid / markmid_maelingar (sql/markmid.sql) eru með RLS og engar reglur; mælingarnar eru SQL-fallið
// markmid_maela(lykill), sem aðeins þjónustulykillinn má keyra. Viðhengi í private bucket `markmid`.
// Hver breyting les röðina, breytir og skrifar skilyrt á updated_at; hafi önnur vél skrifað á milli er reynt aftur á
// nýjustu útgáfunni (aðgerðirnar eru „setja X" eða „bæta við", svo endurtekning er örugg).
// Kostnaður: eitt kall per opnun síðunnar og per smell; morgunmælingin (markmid-cron.cjs) einu sinni á dag.

require('./_bh-toki.cjs'); // lota 13: köll á föll Brunahólfs fá tíma-tóka (x-hub-toki)
const P = require('./_portal.cjs');
const H = require('./_starfshlid.cjs');
const R = require('./_markmid-reikna.cjs');

const BUCKET = 'markmid';
const MAX_BAETI = 4 * 1024 * 1024;   // Netlify-fall tekur ~6 MB búk; base64 bætir þriðjungi við
const LEYFDAR = /^(image\/(png|jpe?g|webp|gif)|application\/pdf|text\/(plain|csv)|application\/(vnd\.openxmlformats-officedocument\.(spreadsheetml\.sheet|wordprocessingml\.document)|vnd\.ms-excel|msword))$/;

async function sb(slod, init = {}) {
  const r = await fetch(`${P.SUPABASE_URL}/${slod}`, {
    ...init,
    headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${slod.split('?')[0]}: ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : null;
}
const rest = (s, i) => sb('rest/v1/' + s, i);
const skila = { Prefer: 'return=representation' };
const idOk = (x) => Number.isInteger(Number(x)) && Number(x) > 0;
const nyttId = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function saekjaEina(id) {
  const rows = await rest(`markmid?id=eq.${Number(id)}&select=*`);
  return rows && rows[0];
}

// Les, breytir með `fn(röð) → plástur | {villa}`, skrifar skilyrt. Allt að þrjár tilraunir ef önnur vél skrifaði á milli.
async function breyta(id, nafn, fn) {
  for (let i = 0; i < 3; i++) {
    const row = await saekjaEina(id);
    if (!row) return { status: 404, villa: 'Markmiðið fannst ekki' };
    const p = fn(row);
    if (p && p.villa) return { status: p.status || 400, villa: p.villa };
    const nu = new Date().toISOString();
    const rows = await rest(`markmid?id=eq.${row.id}&updated_at=eq.${encodeURIComponent(row.updated_at)}`,
      { method: 'PATCH', headers: skila, body: JSON.stringify({ ...p, breytt_af: nafn, updated_at: nu }) });
    if (rows && rows.length) return { row: rows[0] };
  }
  return { status: 409, villa: 'Markmiðinu var breytt á annarri vél á meðan. Hladdu síðunni aftur.' };
}

// Ytri mælingar (16.11.2026, Agnar sendi skjáskot af J.A.R.V.I.S.): markmið sem J.A.R.V.I.S. mælir þegar fá SÖMU tölu
// þaðan, ekki nýja útgáfu. `ytra:<heimild>:<lykill>`; hver heimild sótt einu sinni per keyrslu.
const BH = (process.env.BRUNAHOLF_URL || 'https://brunaholf.netlify.app').replace(/\/$/, '');
const YTRA = {
  veidin: { slod: '/api/veidin?tolur=1', les: (d, k) => (d && d.nuna ? d.nuna[k] : null) },   // Meginmarkmið + skotmörk veiðinnar
  oryggisnet: { slod: '/api/oryggisnet', les: (d, k) => (k === 'brotnir' && d && d.talning ? (d.talning.rautt || 0) + (d.talning.villa || 0) : null) },
  verkefnalisti: { slod: '/api/verkefnalisti?tolur=1', les: (d, k) => (k === 'opin' && d ? d.opin : null) },
  'service-gaps': { slod: '/api/service-gaps?tolur=1', les: (d, k) => (d && d.counts ? d.counts[k] : null) },
  charlize: { slod: '/api/charlize-stada', les: (d, k) => (!d ? null : k === 'bidstofa' ? (d.inbox || {}).pending : k === 'rangar' ? (d.knowledge || {}).wrong : null) },
};
async function maelaEina(lykill, cache) {
  if (!String(lykill).startsWith('ytra:')) return rest('rpc/markmid_maela', { method: 'POST', body: JSON.stringify({ p_lykill: lykill }) });
  const [, heimild, k] = String(lykill).split(':');
  const h = YTRA[heimild];
  if (!h) return null;
  if (!(heimild in cache)) {
    cache[heimild] = (async () => {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 15000);
      try { const r = await fetch(BH + h.slod, { signal: ctl.signal }); return r.ok ? await r.json() : null; } catch (_) { return null; } finally { clearTimeout(t); }
    })();
  }
  const g = h.les(await cache[heimild], k);
  return R.tala(g);
}

async function maela(rows) {
  const ut = [];
  const cache = {};
  for (const m of rows) {
    if (!m.maeling) continue;
    let gildi = null;
    try { gildi = await maelaEina(m.maeling, cache); } catch (_) { gildi = null; }
    if (gildi == null) { ut.push({ id: m.id, villa: 'Mælingin skilaði engu' }); continue; }
    const nu = new Date().toISOString();
    await rest(`markmid?id=eq.${m.id}`, { method: 'PATCH', body: JSON.stringify({ nu: gildi, nu_at: nu,
      ...(m.upphaf == null ? { upphaf: gildi, upphaf_at: nu } : {}) }) });
    await rest('markmid_maelingar', { method: 'POST', body: JSON.stringify({ markmid_id: m.id, gildi, at: nu }) });
    ut.push({ id: m.id, gildi: Number(gildi) });
  }
  return ut;
}
async function maelaAllt() {
  const rows = await rest('markmid?select=id,maeling,upphaf&maeling=not.is.null&stada=neq.lokid');
  return maela(rows || []);
}

async function undirrita(slodir) {
  if (!slodir.length) return {};
  const r = await sb(`storage/v1/object/sign/${BUCKET}`, { method: 'POST', body: JSON.stringify({ expiresIn: 3600, paths: slodir }) });
  const ut = {};
  (r || []).forEach((x) => { if (x && x.path && x.signedURL) ut[x.path] = `${P.SUPABASE_URL}/storage/v1${x.signedURL}`; });
  return ut;
}

async function lesa() {
  const [rows, saga] = await Promise.all([
    rest('markmid?select=*&order=rod.asc,id.asc&limit=500'),
    rest('markmid_maelingar?select=markmid_id,gildi,at&order=at.desc&limit=3000'),
  ]);
  const eftir = {};
  (saga || []).forEach((s) => { (eftir[s.markmid_id] = eftir[s.markmid_id] || []).push({ gildi: Number(s.gildi), at: s.at }); });
  const slodir = [];
  (rows || []).forEach((m) => (m.vidhengi || []).forEach((v) => v && v.slod && slodir.push(v.slod)));
  let undirritad = {};
  try { undirritad = await undirrita(slodir); } catch (_) { undirritad = {}; }
  const markmid = (rows || []).map((m) => ({
    ...m,
    tegund: R.tegund(m),
    framvinda: R.framvinda(m),
    versnad: R.versnad(m),
    saga: (eftir[m.id] || []).slice(0, 60).reverse(),
    vidhengi: (m.vidhengi || []).map((v) => ({ ...v, url: undirritad[v.slod] || null })),
  }));
  return { markmid, flokkar: R.flokkar(markmid) };
}

async function utEina(id) {
  const all = await lesa();
  return all.markmid.find((m) => m.id === Number(id));
}

function oruggtNafn(n) {
  return String(n || 'skra').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'skra';
}

async function adgerd(b, nafn) {
  if (b.action === 'maela') {
    if (b.id != null && !idOk(b.id)) return P.json(400, { error: 'Ógilt auðkenni' });
    const rows = b.id ? [await saekjaEina(b.id)].filter(Boolean) : await rest('markmid?select=id,maeling,upphaf&maeling=not.is.null&stada=neq.lokid');
    const maelt = await maela(rows || []);
    return P.json(200, { maelt });
  }
  if (!idOk(b.id)) return P.json(400, { error: 'Ógilt auðkenni' });
  const nu = new Date().toISOString();
  let r;
  if (b.action === 'skref') {
    r = await breyta(b.id, nafn, (row) => {
      const s = (row.skref || []).map((x) => ({ ...x }));
      const x = s.find((y) => y && y.id === b.skref_id);
      if (!x) return { villa: 'Skrefið fannst ekki', status: 404 };
      x.done = b.done === true;
      x.at = x.done ? nu : null;
      x.af = x.done ? nafn : null;
      return { skref: s, ...(row.stada === 'opid' && x.done ? { stada: 'i_vinnu' } : {}) };
    });
  } else if (b.action === 'skref_nytt') {
    const t = R.texti(b.texti, 300);
    if (!t) return P.json(400, { error: 'Skrefið vantar texta' });
    r = await breyta(b.id, nafn, (row) => ({ skref: (row.skref || []).concat([{ id: nyttId(), t, done: false }]) }));
  } else if (b.action === 'athugasemd') {
    const t = R.texti(b.texti, 4000);
    if (!t) return P.json(400, { error: 'Athugasemdin er tóm' });
    r = await breyta(b.id, nafn, (row) => ({ athugasemdir: (row.athugasemdir || []).concat([{ id: nyttId(), at: nu, af: nafn, texti: t }]) }));
  } else if (b.action === 'stada') {
    if (!R.STODUR.includes(b.stada)) return P.json(400, { error: 'Ógild staða' });
    r = await breyta(b.id, nafn, () => ({ stada: b.stada, lokid_at: b.stada === 'lokid' ? nu : null, lokid_af: b.stada === 'lokid' ? nafn : null }));
  } else if (b.action === 'nu') {
    const g = R.tala(b.gildi);
    if (g == null) return P.json(400, { error: 'Ógild tala' });
    r = await breyta(b.id, nafn, (row) => (row.handvirkt ? { nu: g, nu_at: nu, ...(row.upphaf == null ? { upphaf: g, upphaf_at: nu } : {}) }
      : { villa: 'Þetta markmið er mælt sjálfkrafa — ýttu á „Mæla núna"' }));
    if (r.row) await rest('markmid_maelingar', { method: 'POST', body: JSON.stringify({ markmid_id: r.row.id, gildi: g, at: nu }) });
  } else if (b.action === 'vidhengi') {
    const tegund = String(b.tegund || '').toLowerCase();
    if (!LEYFDAR.test(tegund)) return P.json(400, { error: 'Þessi skráartegund er ekki leyfð (myndir, PDF, texti, Excel, Word)' });
    const buf = Buffer.from(String(b.b64 || '').replace(/^data:[^,]*,/, ''), 'base64');
    if (!buf.length) return P.json(400, { error: 'Skráin er tóm' });
    if (buf.length > MAX_BAETI) return P.json(413, { error: 'Skráin er of stór (mest 4 MB)' });
    const row = await saekjaEina(b.id);
    if (!row) return P.json(404, { error: 'Markmiðið fannst ekki' });
    const nafnSkrar = R.texti(b.nafn, 160) || 'skra';
    const slod = `${row.id}/${Date.now()}-${oruggtNafn(nafnSkrar)}`;
    const up = await fetch(`${P.SUPABASE_URL}/storage/v1/object/${BUCKET}/${slod}`, {
      method: 'POST', headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}`, 'Content-Type': tegund, 'x-upsert': 'false' }, body: buf });
    if (!up.ok) return P.json(502, { error: 'Vistaðist ekki í geymslu: ' + (await up.text()).slice(0, 160) });
    r = await breyta(b.id, nafn, (rr) => ({ vidhengi: (rr.vidhengi || []).concat([{ id: nyttId(), nafn: nafnSkrar, tegund, staerd: buf.length, slod, at: nu, af: nafn }]) }));
  } else if (b.action === 'vidhengi_eyda') {
    let slod = null;
    r = await breyta(b.id, nafn, (row) => {
      const v = (row.vidhengi || []).find((x) => x && x.id === b.vid_id);
      if (!v) return { villa: 'Viðhengið fannst ekki', status: 404 };
      slod = v.slod;
      return { vidhengi: (row.vidhengi || []).filter((x) => x && x.id !== b.vid_id) };
    });
    if (r.row && slod) { try { await sb(`storage/v1/object/${BUCKET}`, { method: 'DELETE', body: JSON.stringify({ prefixes: [slod] }) }); } catch (_) {} }
  } else {
    return P.json(400, { error: 'Óþekkt aðgerð' });
  }
  if (r.villa) return P.json(r.status || 400, { error: r.villa });
  return P.json(200, { markmid: await utEina(r.row.id) });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (!P.dbReady()) return P.json(503, { error: 'Supabase env vantar' });
  const hver = await H.starfsmadur(event);
  if (hver.villa) return hver.villa;
  try {
    if (event.httpMethod === 'GET') return P.json(200, await lesa());
    if (event.httpMethod !== 'POST') return P.json(405, { error: 'Aðeins GET og POST' });
    let b;
    try { b = JSON.parse(event.body || '{}'); } catch (_) { return P.json(400, { error: 'Ógilt JSON' }); }
    return await adgerd(b, hver.nafn);
  } catch (e) {
    console.error('[markmid]', e);
    return P.json(502, { error: 'Náði ekki í gögn: ' + (e && e.message ? e.message : String(e)) });
  }
};

exports.maelaAllt = maelaAllt;
