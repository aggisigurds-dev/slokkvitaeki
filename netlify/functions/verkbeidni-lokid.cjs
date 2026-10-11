// verkbeidni-lokid.cjs — starfsmannahlið verkbeiðnapunkta (Þjónustuborð, patch 459).
//
//   GET  /api/verkbeidni-lokid?id=<mál>      → { ok, mal:{id,title,status,abyrgd,punktur,myndir[{url,…}],eftirmyndir[…],lokid_at}, netfang }
//                                              (myndir úr einkamáls-bucketinu `gatt` undirritaðar í 10 mín fyrir starfsmanninn)
//   POST /api/verkbeidni-lokid { id, lysing, mynd (dataURL), mynd_w, mynd_h, af }
//                                            → lokar málinu (status 'lokad' = ✓ Lokið á borðinu), vistar eftirmynd, skrifar
//                                              tilkynningu í skilaboðaþráð kúnnans (portal_messages, sender 'starf') og
//                                              skilar netfangi kúnnans svo vafrinn sendi póst um AppMail (Gmail) — Resend-
//                                              leiðin (/api/email-send) er dauð fyrir eldklar.is skv. 240/254.
//
// Aðgangur: P.requireStaff — virkt þegar HUB_STAFF_PASSWORD er sett í Netlify (annars opið eins og gatt-admin;
// sjá athugasemd í _portal.cjs). Málið verður að vera til, ekki eytt og ekki þegar lokað.

const P = require('./_portal.cjs');
const M = require('./_gatt-myndir.cjs');

const SEL = 'id,customer_base_id,fyrirtaeki_id,title,summary,status,abyrgd,punktur,myndir,eftirmyndir,lokid_at,lokid_af,lokid_lysing,tilkynnt_at,tags';

function mynd(L, slod) {
  return (Array.isArray(L) ? L : []).map((m) => m && m.path && slod[m.path] ? { url: slod[m.path], w: m.w || null, h: m.h || null, at: m.at || null, af: m.af || null } : null).filter(Boolean);
}
async function netfangFelags(baseId) {
  try {
    const r = await P.sbGet(`portal_users?base_id=eq.${baseId}&active=eq.true&select=email,display_name&order=created_at.asc&limit=1`);
    const u = r.ok ? (await r.json())[0] : null;
    return u && u.email ? { email: u.email, nafn: u.display_name || '' } : null;
  } catch (_) { return null; }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (!P.dbReady()) return P.json(503, { error: 'Ekki uppsett' });
  const g = P.requireStaff(event); if (g) return g;

  if (event.httpMethod === 'GET') {
    const id = parseInt((event.queryStringParameters || {}).id, 10);
    if (!id) return P.json(400, { error: 'id vantar' });
    const r = await P.sbGet(`thjonustubeidni?id=eq.${id}&deleted_at=is.null&select=${SEL}&limit=1`);
    const m = r.ok ? (await r.json())[0] : null;
    if (!m) return P.json(404, { error: 'Mál fannst ekki' });
    const paths = [].concat(m.myndir || [], m.eftirmyndir || []).map((x) => x && x.path).filter(Boolean);
    const slod = await M.undirrita(paths, 600);
    const nf = await netfangFelags(m.customer_base_id);
    return P.json(200, { ok: true, mal: { id: m.id, title: m.title, summary: m.summary, status: m.status, abyrgd: m.abyrgd, punktur: m.punktur, fid: m.fyrirtaeki_id,
      myndir: mynd(m.myndir, slod), eftirmyndir: mynd(m.eftirmyndir, slod), lokid_at: m.lokid_at, lokid_af: m.lokid_af, lokid_lysing: m.lokid_lysing, tilkynnt_at: m.tilkynnt_at }, netfang: nf });
  }
  if (event.httpMethod !== 'POST') return P.json(405, { error: 'GET/POST only' });

  let b; try { b = JSON.parse(event.body || '{}'); } catch { return P.json(400, { error: 'Ógilt JSON' }); }
  const id = parseInt(b.id, 10);
  if (!id) return P.json(400, { error: 'id vantar' });
  const r0 = await P.sbGet(`thjonustubeidni?id=eq.${id}&deleted_at=is.null&select=${SEL}&limit=1`);
  const m0 = r0.ok ? (await r0.json())[0] : null;
  if (!m0) return P.json(404, { error: 'Mál fannst ekki' });
  const af = String(b.af || 'Slökkvitæki ehf.').trim().slice(0, 80);
  const lysing = String(b.lysing || '').trim().slice(0, 1000);
  const eftir = Array.isArray(m0.eftirmyndir) ? m0.eftirmyndir.slice() : [];
  if (b.mynd) {
    const mm = M.lesaDataUrl(b.mynd, 6 * 1024 * 1024);
    if (!mm || !/^image\//.test(mm.mime)) return P.json(400, { error: 'Myndin er ekki á studdu sniði (JPEG/PNG/WebP, mest 6 MB)' });
    const path = `verkbeidnir/${m0.customer_base_id || 0}/${m0.fyrirtaeki_id || 0}/${Date.now()}-eftir-${Math.random().toString(36).slice(2, 8)}.${mm.ext}`;
    if (!(await M.hlada(path, mm.buf, mm.mime))) return P.json(502, { error: 'Myndin vistaðist ekki' });
    eftir.push({ path, w: +b.mynd_w || null, h: +b.mynd_h || null, at: new Date().toISOString(), af });
  }
  const nu = new Date().toISOString();
  const patch = { eftirmyndir: eftir, updated_at: nu };
  const lokar = b.loka !== false;
  if (lokar) Object.assign(patch, { status: 'lokad', lokid_at: nu, lokid_af: af, lokid_lysing: lysing || m0.lokid_lysing || null });
  const pr = await P.sbPatch(`thjonustubeidni?id=eq.${id}&select=${SEL}`, patch);
  if (!pr.ok) return P.json(pr.status, { error: 'Vistun mistókst', detail: (await pr.text()).slice(0, 300) });
  const m = (await pr.json())[0] || m0;

  // Tilkynning í skilaboðaþráð kúnnans — birtist undir Skilaboð og sem merki á flipanum
  let nf = null;
  if (lokar && m.customer_base_id) {
    const titill = String(m.title || 'Verkbeiðni').replace(/\s+af þjónustuvef/i, '');
    const texti = 'Lokið: ' + titill + (lysing ? '\n' + lysing : '') + (eftir.length ? '\nEftirmynd er á eigninni í gáttinni' + (m.punktur ? ' — punkturinn á teikningunni er orðinn grænn.' : '.') : '');
    try { await P.sbPost('portal_messages', { base_id: m.customer_base_id, sender: 'starf', body: texti, author_name: af, read_by_staff: true }); } catch (_) {}
    nf = await netfangFelags(m.customer_base_id);
    try { await P.sbPatch(`thjonustubeidni?id=eq.${id}`, { tilkynnt_at: nu }); } catch (_) {}
  }
  const slod = await M.undirrita([].concat(m.myndir || [], m.eftirmyndir || []).map((x) => x && x.path).filter(Boolean), 600);
  return P.json(200, { ok: true, mal: { id: m.id, title: m.title, status: m.status, abyrgd: m.abyrgd, punktur: m.punktur, myndir: mynd(m.myndir, slod), eftirmyndir: mynd(m.eftirmyndir, slod), lokid_at: m.lokid_at }, netfang: nf });
};
