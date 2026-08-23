// gatt-doc.js — eignarhaldsprófuð skjala-afhending fyrir Þjónustuvefinn.
//
//   GET /api/gatt-doc?doc=<customer_documents.id>
//
// 1) Les session → base_id (úr tokeni) EÐA opinn aðgangur um ?c=<slug> (félag
//    virkt MEÐ EKKERT lykilorð).  2) Sækir skjalið.  3) SANNREYNIR að skjalið
//    tilheyri base_id (annars 403 — IDOR-vörn, líka í opnum ham).  4) Skilar
// skammlífum signed-URL (Supabase Storage) eða beinir á /api/skjal (Drive).
// Vafrinn fær ALDREI hráan/opinberan bucket-hlekk né skjal annars félags.

const P = require('./_portal');

const SIGN_TTL = 120; // sekúndur — mínútur, aldrei langt (leka-vörn)

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET') return P.json(405, { error: 'GET only' });
  if (!P.dbReady()) return P.json(503, { error: 'Þjónustuvefur ekki uppsettur' });

  // Auðkenning: innskráð session EÐA opinn aðgangur um ?c=<slug> (félag virkt
  // MEÐ EKKERT lykilorð). Skjöl læsast sjálfkrafa um leið og lykilorð er sett.
  const session = P.getSession(event);
  let baseId = null;
  if (session) {
    baseId = session.base_id;
  } else {
    const slug = String((event.queryStringParameters || {}).c || '').trim();
    if (slug) {
      try {
        const ur = await P.sbGet(`portal_users?slug=eq.${encodeURIComponent(slug)}&select=base_id,active,pass_hash&limit=1`);
        const u = (ur.ok ? await ur.json() : [])[0];
        if (u && u.active && !u.pass_hash) baseId = u.base_id;
      } catch (_) {}
    }
    if (baseId == null) return P.json(401, { error: 'Ekki innskráð(ur)' });
  }

  const docId = parseInt((event.queryStringParameters || {}).doc, 10);
  if (!docId) return P.json(400, { error: 'doc vantar' });

  try {
    const r = await P.sbGet(`customer_documents?id=eq.${docId}&select=id,customer_base_id,fyrirtaeki_id,storage_path,drive_file_id&limit=1`);
    const rows = r.ok ? await r.json() : [];
    const doc = rows[0];
    if (!doc) return P.json(404, { error: 'Skjal finnst ekki' });

    // ── Eignarhald: skjalið verður að tilheyra base_id (session eða opnum aðgangi) ──
    let owns = doc.customer_base_id != null && Number(doc.customer_base_id) === Number(baseId);
    if (!owns && doc.fyrirtaeki_id != null) {
      const fr = await P.sbGet(`fyrirtaeki?id=eq.${doc.fyrirtaeki_id}&select=customer_base_id&limit=1`);
      const frows = fr.ok ? await fr.json() : [];
      owns = frows[0] && Number(frows[0].customer_base_id) === Number(baseId);
    }
    if (!owns) return P.json(403, { error: 'Óheimill aðgangur' });

    // ── Afhending ──
    // (a) Supabase Storage → skammlífur signed URL (líka fyrir opinbera fatið,
    //     svo við réttum ALDREI út beina/ágiskanlega slóð).
    if (doc.storage_path) {
      const sp = String(doc.storage_path);
      const slash = sp.indexOf('/');
      const bucket = slash > -1 ? sp.slice(0, slash) : sp;
      const objectPath = slash > -1 ? sp.slice(slash + 1) : '';
      const sign = await fetch(`${P.SUPABASE_URL}/storage/v1/object/sign/${bucket}/${encodeURI(objectPath)}`, {
        method: 'POST',
        headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresIn: SIGN_TTL }),
      });
      if (sign.ok) {
        const s = await sign.json();
        const signed = s.signedURL || s.signedUrl;
        if (signed) {
          return { statusCode: 302, headers: { Location: `${P.SUPABASE_URL}/storage/v1${signed}`, 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' }, body: '' };
        }
      }
      // fall-through ef signun bregst
    }

    // (b) Drive → beina á núverandi auðkennda Drive-proxy
    if (doc.drive_file_id && !String(doc.drive_file_id).startsWith('sb:')) {
      return { statusCode: 302, headers: { Location: `/api/skjal?id=${encodeURIComponent(doc.drive_file_id)}`, 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' }, body: '' };
    }

    return P.json(404, { error: 'Engin skrá tengd þessu skjali' });
  } catch (e) {
    return P.json(500, { error: String((e && e.message) || e) });
  }
};
