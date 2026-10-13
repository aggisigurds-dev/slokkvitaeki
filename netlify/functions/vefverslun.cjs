// vefverslun.cjs — bakendi vefverslunar Brunahólfs (/vefverslun/) með prufuham og breytingakerfi.
//
//   GET  /api/vefverslun                  → { stada, efni, drog_uppfaert, utgafa, vorur[] }
//          ?drog=1                        → efni = drögin (breytingahamur); annars virka útgáfan ef verslunin er virk
//   GET  /api/vefverslun?allar=1          → { vorur[] } allar virkar söluvörur án mynda (vöruval í ritlinum)
//   GET  /api/vefverslun?mynd=<id>        → vörumyndin sjálf (data-URL úr `vorur.mynd` afkóðuð, löng skyndiminni)
//   GET  /api/vefverslun?saga=1           → { saga[] } síðustu virkjanir
//   POST { adgerd:'vista', efni, grunnur } → vistar drögin; 409 ef önnur vél vistaði á eftir `grunnur`
//   POST { adgerd:'virkja' }               → drögin verða virka útgáfan, stada = 'virk', afrit í vefverslun_saga
//   POST { adgerd:'afvirkja' }             → stada = 'prufa' (verslunin úr loftinu, drögin standa)
//   POST { adgerd:'afturkalla' }           → drögin = virka útgáfan (hendir óvirkjuðum breytingum)
//   POST { adgerd:'endurheimta', id }      → drögin = útgáfa úr sögunni
//   POST { adgerd:'mynd', gogn }           → hleður mynd (data-URL, ≤ 6 MB) í opna bucketið `vefverslun` → { url }
//
// Vörur, verð og lagerstaða koma ALLTAF lifandi úr `vorur` — verslunin skrifar aldrei þangað. Sjálfgefið úrval er
// forsíða söluborðsins án þjónustuliða (forsida = true, flokkur ≠ Þjónusta, krefst_verkbeidni = false); ritillinn
// getur bætt öðrum við (efni.vorur.aukalega) eða falið (efni.vorur.falid).
//
// Skrif fara um P.requireStaff: opið meðan HUB_STAFF_PASSWORD er ekki sett (eins og gatt-admin), lokast sjálfkrafa
// fyrir öðrum en innskráðu starfsfólki um leið og það er sett.

const crypto = require('crypto');
const P = require('./_portal.cjs');

const HAMARK_EFNI = 600 * 1024;
const MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const SOLUVORUR = 'virkt=is.true&flokkur=not.in.(%22%C3%9Ej%C3%B3nusta%22,%22Leiga%22,%22Vinna%20og%20akstur%22)';
const VORU_DALKAR = 'id,nafn,lysing,description,flokkur,verd_an_vsk,vsk_prosenta,birgdir,forsida,rodun,listaverd,image_url,krefst_verkbeidni';

function kr(verdAnVsk, vsk) {
  const v = Number(verdAnVsk) || 0, p = vsk == null ? 24 : Number(vsk);
  return { verd: Math.round(v * (1 + p / 100)), an: Math.round(v) };
}

async function lesaRod() {
  const r = await P.sbGet('vefverslun?id=eq.1&select=stada,drog,virk,drog_uppfaert,virkjad,utgafa&limit=1');
  if (!r.ok) throw new Error('vefverslun ' + r.status);
  return (await r.json())[0] || null;
}

// Myndarslóð vöru: vefslóð beint, data-URL um ?mynd=<id> (útgáfa = lengd strengsins, svo ný mynd = ný slóð)
function myndarslod(v, mynd) {
  const m = String(mynd || v.image_url || '');
  if (/^https?:\/\//i.test(m)) return m;
  if (/^data:image\//i.test(m)) return `/api/vefverslun?mynd=${v.id}&v=${m.length}`;
  return '';
}

async function lesaVorur(efni) {
  const auka = ((efni && efni.vorur && efni.vorur.aukalega) || []).map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 200);
  const sia = auka.length
    ? `or=(and(forsida.is.true,krefst_verkbeidni.not.is.true),id.in.(${auka.join(',')}))`
    : 'forsida=is.true&krefst_verkbeidni=not.is.true';
  const r = await P.sbGet(`vorur?${SOLUVORUR}&${sia}&select=${VORU_DALKAR},mynd&order=rodun.asc.nullslast,id.asc`);
  if (!r.ok) throw new Error('vorur ' + r.status);
  const rows = await r.json();
  return rows.map((v) => ({
    id: v.id,
    nafn: v.nafn || '',
    flokkur: v.flokkur || 'Annað',
    lysing: v.lysing || v.description || '',
    ...kr(v.verd_an_vsk, v.vsk_prosenta),
    birgdir: v.birgdir == null ? null : Number(v.birgdir),
    rodun: v.rodun,
    forsida: !!v.forsida,
    mynd: myndarslod(v, v.mynd),
  }));
}

async function sendaMynd(id) {
  const r = await P.sbGet(`vorur?id=eq.${id}&select=mynd,image_url&limit=1`);
  const v = r.ok ? (await r.json())[0] : null;
  const m = v && String(v.mynd || '');
  if (m && /^https?:\/\//i.test(m)) return { statusCode: 302, headers: { Location: m, 'Cache-Control': 'public, max-age=3600' }, body: '' };
  const d = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(m || '');
  if (!d) return { statusCode: 404, headers: { 'Content-Type': 'text/plain' }, body: 'engin mynd' };
  return {
    statusCode: 200,
    headers: { 'Content-Type': d[1], 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800', 'X-Content-Type-Options': 'nosniff' },
    body: d[2].replace(/\s+/g, ''),
    isBase64Encoded: true,
  };
}

async function hladaMynd(gogn) {
  const m = /^data:([a-z0-9.+\/-]+);base64,([A-Za-z0-9+\/=\s]+)$/i.exec(String(gogn || ''));
  if (!m || !MIME[m[1].toLowerCase()]) return { villa: 'Aðeins JPEG, PNG eða WebP' };
  const buf = Buffer.from(m[2].replace(/\s+/g, ''), 'base64');
  if (!buf.length || buf.length > 6 * 1024 * 1024) return { villa: 'Myndin er of stór (mest 6 MB)' };
  const d = new Date();
  const slod = `upp/${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomBytes(9).toString('hex')}.${MIME[m[1].toLowerCase()]}`;
  const r = await fetch(`${P.SUPABASE_URL}/storage/v1/object/vefverslun/${slod}`, {
    method: 'POST',
    headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}`, 'Content-Type': m[1].toLowerCase(), 'x-upsert': 'false', 'Cache-Control': 'max-age=31536000' },
    body: buf,
  });
  if (!r.ok) return { villa: 'Upphleðsla mistókst (' + r.status + ')' };
  return { url: `${P.SUPABASE_URL}/storage/v1/object/public/vefverslun/${slod}` };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (!P.dbReady()) return P.json(503, { error: 'Gagnagrunnur ekki tengdur' });
  const q = event.queryStringParameters || {};

  try {
    if (event.httpMethod === 'GET') {
      if (q.mynd) {
        const id = Number(q.mynd);
        if (!Number.isInteger(id) || id <= 0) return P.json(400, { error: 'Ógilt auðkenni' });
        return await sendaMynd(id);
      }
      if (q.allar) {
        const r = await P.sbGet(`vorur?${SOLUVORUR}&select=id,nafn,flokkur,verd_an_vsk,vsk_prosenta,forsida,krefst_verkbeidni&order=flokkur.asc,nafn.asc`);
        const rows = r.ok ? await r.json() : [];
        return P.json(200, { vorur: rows.map((v) => ({ id: v.id, nafn: v.nafn, flokkur: v.flokkur, forsida: !!v.forsida && !v.krefst_verkbeidni, ...kr(v.verd_an_vsk, v.vsk_prosenta) })) });
      }
      if (q.saga) {
        const r = await P.sbGet('vefverslun_saga?select=id,utgafa,created_at&order=id.desc&limit=20');
        return P.json(200, { saga: r.ok ? await r.json() : [] });
      }
      const rod = await lesaRod();
      if (!rod) return P.json(500, { error: 'Vefverslunar-röð vantar' });
      const efni = q.drog || rod.stada !== 'virk' ? rod.drog || {} : rod.virk || rod.drog || {};
      const vorur = await lesaVorur(efni);
      return P.json(200, { stada: rod.stada, efni, drog_uppfaert: rod.drog_uppfaert, virkjad: rod.virkjad, utgafa: rod.utgafa, vorur });
    }

    if (event.httpMethod !== 'POST') return P.json(405, { error: 'GET eða POST' });
    const lok = P.requireStaff(event); if (lok) return lok;
    if ((event.body || '').length > HAMARK_EFNI + 7 * 1024 * 1024) return P.json(413, { error: 'Of stórt' });
    let b;
    try { b = JSON.parse(event.body || '{}'); } catch { return P.json(400, { error: 'Ógilt JSON' }); }

    if (b.adgerd === 'mynd') {
      const u = await hladaMynd(b.gogn);
      return u.villa ? P.json(400, { error: u.villa }) : P.json(200, u);
    }

    if (b.adgerd === 'vista') {
      if (!b.efni || typeof b.efni !== 'object' || Array.isArray(b.efni)) return P.json(400, { error: 'efni vantar' });
      if (JSON.stringify(b.efni).length > HAMARK_EFNI) return P.json(413, { error: 'Drögin eru of stór' });
      const nu = new Date().toISOString();
      // Bjartsýn læsing: aðeins ef enginn annar hefur vistað síðan þessi vél sótti drögin
      const sia = b.grunnur ? `&drog_uppfaert=eq.${encodeURIComponent(b.grunnur)}` : '';
      const r = await P.sbPatch(`vefverslun?id=eq.1${sia}`, { drog: b.efni, drog_uppfaert: nu });
      const rows = r.ok ? await r.json() : [];
      if (!rows.length) {
        const rod = await lesaRod();
        return P.json(409, { error: 'Önnur vél vistaði drögin á undan', drog: rod && rod.drog, drog_uppfaert: rod && rod.drog_uppfaert });
      }
      return P.json(200, { ok: true, drog_uppfaert: rows[0].drog_uppfaert });
    }

    const rod = await lesaRod();
    if (!rod) return P.json(500, { error: 'Vefverslunar-röð vantar' });

    if (b.adgerd === 'virkja') {
      const utgafa = (rod.utgafa || 0) + 1;
      const nu = new Date().toISOString();
      const r = await P.sbPatch('vefverslun?id=eq.1', { virk: rod.drog || {}, stada: 'virk', virkjad: nu, utgafa });
      if (!r.ok) return P.json(500, { error: 'Virkjun mistókst' });
      await P.sbPost('vefverslun_saga', { utgafa, efni: rod.drog || {} });
      return P.json(200, { ok: true, stada: 'virk', utgafa, virkjad: nu });
    }
    if (b.adgerd === 'afvirkja') {
      const r = await P.sbPatch('vefverslun?id=eq.1', { stada: 'prufa' });
      return r.ok ? P.json(200, { ok: true, stada: 'prufa' }) : P.json(500, { error: 'Mistókst' });
    }
    if (b.adgerd === 'afturkalla' || b.adgerd === 'endurheimta') {
      let efni = rod.virk || {};
      if (b.adgerd === 'endurheimta') {
        const id = Number(b.id);
        const s = await P.sbGet(`vefverslun_saga?id=eq.${Number.isInteger(id) ? id : 0}&select=efni&limit=1`);
        const row = s.ok ? (await s.json())[0] : null;
        if (!row) return P.json(404, { error: 'Útgáfa fannst ekki' });
        efni = row.efni || {};
      }
      const nu = new Date().toISOString();
      const r = await P.sbPatch('vefverslun?id=eq.1', { drog: efni, drog_uppfaert: nu });
      return r.ok ? P.json(200, { ok: true, efni, drog_uppfaert: nu }) : P.json(500, { error: 'Mistókst' });
    }
    return P.json(400, { error: 'Óþekkt aðgerð' });
  } catch (e) {
    return P.json(500, { error: String((e && e.message) || e) });
  }
};
