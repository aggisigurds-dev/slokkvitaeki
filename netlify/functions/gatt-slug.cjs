// /api/gatt-slug?site=<fyrirtaeki.id>  →  { slug, open, nafn, base_id }  eða  { slug: null }
//
// 26.10.2026 (Agnar: „lítill gluggi á fyrirtækjasíðunni sem maður kemst beint inn á þjónustugátt — opinn aðgang þaðan inn
// á tiltekna eign og félag"). Finnur OPNA gátt (active, ekkert lykilorð) fyrir staðinn: fyrst gátt félagsins sjálfs, annars
// gátt höfuðfélags rekstrarfélagsins (sama regla og P.baseHopur: Heimaleiga ehf sér systkinafélögin og handskráðu
// kennitölurnar). Skilar aðeins slug-i gáttar sem er hvort eð er opin — ekkert um læstar gáttir.
const P = require('./_portal.cjs');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET') return P.json(405, { error: 'GET only' });
  if (!P.dbReady()) return P.json(503, { error: 'Þjónustuvefur ekki uppsettur' });
  const site = parseInt((event.queryStringParameters || {}).site, 10);
  if (!site) return P.json(400, { error: 'site vantar' });
  try {
    const fr = await P.sbGet(`fyrirtaeki?id=eq.${site}&select=id,nafn,customer_base_id&limit=1`);
    const f = fr.ok ? (await fr.json())[0] : null;
    if (!f || f.customer_base_id == null) return P.json(200, { slug: null });
    const baseId = Number(f.customer_base_id);
    const opin = async (ids) => {
      if (!ids.length) return null;
      const r = await P.sbGet(`portal_users?base_id=in.(${ids.join(',')})&active=eq.true&pass_hash=is.null&select=slug,base_id,display_name&order=created_at.asc`);
      const L = r.ok ? await r.json() : [];
      // félagið sjálft fyrst, annars fyrsta höfuðfélagið í röðinni sem gefin var
      for (const id of ids) { const u = L.find((x) => Number(x.base_id) === id); if (u) return u; }
      return null;
    };
    let u = await opin([baseId]);
    if (!u) {
      // Höfuðfélög sem sjá þetta base_id í sínum hópi: lifandi merki + handskráðar kennitölur (sbr. baseHopur)
      const br = await P.sbGet(`customers_base?id=eq.${baseId}&select=id,kennitala,rekstrarfelag&limit=1`);
      const b = br.ok ? (await br.json())[0] : null;
      const kt = String((b && b.kennitala) || '').replace(/\D/g, '');
      const merki = new Set(); if (b && b.rekstrarfelag) merki.add(String(b.rekstrarfelag).trim());
      try {
        const ar = await P.sbGet('app_settings?id=eq.1&select=settings->rekstrarfelog');
        const rf = ar.ok ? ((await ar.json())[0] || {}).rekstrarfelog : null;
        if (rf && kt.length === 10) Object.keys(rf).forEach((m) => { const bl = Array.isArray(rf[m] && rf[m].buildings) ? rf[m].buildings : []; if (bl.some((x) => String((x && x.kt) || '').replace(/\D/g, '') === kt)) merki.add(m); });
      } catch (_) {}
      const heads = [];
      for (const m of merki) {
        const hr = await P.sbGet(`customers_base?rekstrarfelag=eq.${encodeURIComponent(m)}&select=id,nafn&order=id`);
        if (hr.ok) (await hr.json()).forEach((h) => { if (String(h.nafn || '').toLowerCase().trim().indexOf(m.toLowerCase()) === 0) heads.push(Number(h.id)); });
      }
      u = await opin([...new Set(heads)]);
    }
    if (!u) return P.json(200, { slug: null });
    return P.json(200, { slug: u.slug, open: true, nafn: u.display_name || null, base_id: u.base_id, site: f.id });
  } catch (e) { return P.json(500, { error: String((e && e.message) || e) }); }
};
