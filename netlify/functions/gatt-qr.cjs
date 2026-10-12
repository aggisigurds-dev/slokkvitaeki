// gatt-qr.cjs — tilkynning leigutaka/starfsmanns um QR-merki eignar, ÁN innskráningar (12.10.2026).
//
//   GET  /api/gatt-qr?t=<token>  → { eign:{id,nafn,heimilisfang}, felag, haedir:[nafn] }   (aðeins heiti — engin gögn kúnnans)
//   POST /api/gatt-qr { t, nafn, simi, lysing, haed, mynd, mynd_w, mynd_h }
//        → mál á Þjónustuborði (thjonustubeidni, source 'qr', tags gatt/verkbeidni/qr, abyrgd okkar) + lína í skilaboðaþráð
//          félagsins; mest 10 tilkynningar á klst. per eign og 3 per IP á 10 mín.
//
// Tokenið er HMAC yfir fyrirtaeki_id með PORTAL_JWT_SECRET (sjá _portal.cjs signQr) — engin tafla, verður aldrei útrunnið
// nema leyndarmálinu sé skipt. QR-merkið prentar kúnninn sjálfur úr Verkbeiðnir-flipanum (eða við úr gatt-admin).

const P = require('./_portal.cjs');
const M = require('./_gatt-myndir.cjs');

const ip = {};  // einföld IP-takmörkun innan sama fallsins (Netlify endurnýtir ferlið milli kalla)

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (!P.envReady()) return P.json(503, { error: 'Ekki uppsett' });
  const q = event.queryStringParameters || {};
  let b = {};
  if (event.httpMethod === 'POST') { try { b = JSON.parse(event.body || '{}'); } catch { return P.json(400, { error: 'Ógilt JSON' }); } }
  const fid = P.verifyQr(String(b.t || q.t || ''));
  if (!fid) return P.json(404, { error: 'Ógilt eða úrelt QR-merki' });
  const fr = await P.sbGet(`fyrirtaeki?id=eq.${fid}&deleted_at=is.null&select=id,nafn,heimilisfang,customer_base_id&limit=1`);
  const f = fr.ok ? (await fr.json())[0] : null;
  if (!f) return P.json(404, { error: 'Eignin fannst ekki' });
  let felag = '';
  try { const br = await P.sbGet(`customers_base?id=eq.${f.customer_base_id}&select=nafn&limit=1`); if (br.ok) felag = ((await br.json())[0] || {}).nafn || ''; } catch (_) {}
  // „Reitir - Dalshraun 1" → „Dalshraun 1": félagsforskeytið er fyrsta orð félagsnafnsins (eins og afskeyta() í gáttinni)
  const fyrsta = (felag.split(/[\s,.]+/)[0] || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nafnEignar = fyrsta ? String(f.nafn || '').replace(new RegExp('^' + fyrsta + '[^-]*-\\s*', 'i'), '') : String(f.nafn || '');

  if (event.httpMethod === 'GET') {
    let haedir = [];
    try {
      const tr = await P.sbGet(`teikning_bord?company_id=eq.${fid}&select=haedir,image_url&limit=1`);
      const t = tr.ok ? (await tr.json())[0] : null;
      if (t) haedir = (Array.isArray(t.haedir) && t.haedir.length ? t.haedir : (t.image_url ? [{ nafn: 'Teikning' }] : [])).map((h, i) => String(h.nafn || ('Hæð ' + (i + 1))).slice(0, 60));
    } catch (_) {}
    return P.json(200, { eign: { id: f.id, nafn: nafnEignar, heimilisfang: f.heimilisfang || '' }, felag, haedir });
  }

  // POST — tilkynning
  const addr = String((event.headers && (event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || '')) || '').split(',')[0].trim() || 'x';
  const nu = Date.now();
  ip[addr] = (ip[addr] || []).filter((t) => nu - t < 600e3);
  if (ip[addr].length >= 3) return P.json(429, { error: 'Of margar tilkynningar — reyndu aftur eftir smá stund' });
  const lysing = String(b.lysing || '').trim().slice(0, 2000);
  if (!lysing) return P.json(400, { error: 'Lýstu því sem er að' });
  const nafn = String(b.nafn || '').trim().slice(0, 80), simi = String(b.simi || '').trim().slice(0, 30), haed = String(b.haed || '').trim().slice(0, 60);
  const since = new Date(nu - 3600e3).toISOString();
  const cr = await P.sbGet(`thjonustubeidni?source=eq.qr&fyrirtaeki_id=eq.${fid}&created_at=gte.${encodeURIComponent(since)}&select=id`);
  if (cr.ok && (await cr.json()).length >= 10) return P.json(429, { error: 'Of margar tilkynningar á þessa eign á klukkustund' });
  const myndir = [];
  if (b.mynd) {
    const m = M.lesaDataUrl(b.mynd, 6 * 1024 * 1024);
    if (!m || !/^image\//.test(m.mime)) return P.json(400, { error: 'Myndin er ekki á studdu sniði' });
    const path = `verkbeidnir/${f.customer_base_id || 0}/${fid}/${nu}-qr-${Math.random().toString(36).slice(2, 8)}.${m.ext}`;
    if (await M.hlada(path, m.buf, m.mime)) myndir.push({ path, w: +b.mynd_w || null, h: +b.mynd_h || null, at: new Date(nu).toISOString() });
  }
  const titill = lysing.split('\n')[0].slice(0, 70);
  const mr = await P.sbPost('thjonustubeidni', {
    customer_base_id: f.customer_base_id, customer_nafn: nafn || 'Tilkynning um QR', fyrirtaeki_id: fid,
    title: titill + ' — tilkynning um QR — ' + nafnEignar, summary: lysing + (haed ? '\nStaðsetning: ' + haed : ''),
    notes: lysing + '\n' + (haed ? 'Staðsetning: ' + haed + '\n' : '') + 'Tilkynnt um QR-merki eignar' + (nafn ? ' af ' + nafn : '') + (simi ? ' · sími ' + simi : '') + (myndir.length ? '\nMynd fylgir (sjá spjald).' : ''),
    source: 'qr', type: 'annad', flokkur: 'thjonusta', status: 'nytt', priority: 'venjulegur', created_by: 'qr-merki',
    tags: ['gatt', 'verkbeidni', 'qr'], abyrgd: 'okkar', myndir,
  });
  if (!mr.ok) return P.json(mr.status, { error: 'Vistun mistókst', detail: (await mr.text()).slice(0, 200) });
  ip[addr].push(nu);
  try { await P.sbPost('portal_messages', { base_id: f.customer_base_id, sender: 'kunni', author_name: nafn ? nafn + ' (QR)' : 'Tilkynning um QR', body: 'Tilkynning um QR-merki — ' + nafnEignar + (haed ? ' (' + haed + ')' : '') + '\n' + lysing }); } catch (_) {}
  return P.json(200, { ok: true });
};
