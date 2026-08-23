// gatt.js — gögn Þjónustuvefsins fyrir INNSKRÁÐAN viðskiptavin.
//
//   GET  /api/gatt   → { account, stats, buildings[], reports[], invoices[], messages[] }
//   POST /api/gatt   { body }  → viðskiptavinur sendir fyrirspurn (skilaboð)
//
// base_id kemur úr session-tokeninu (aldrei úr slóð) → einangrun. UNDANTEKNING:
// „opinn forsýnar-aðgangur" — ef ?c=<slug> vísar á félag sem er virkt, MEÐ EKKERT
// lykilorð OG open_preview=true, þá er base_id lesið úr slug-inu og gögn þjónuð án
// innskráningar. Um leið og lykilorð (pass_hash) er sett slokknar á þessu sjálfkrafa.
// Les beint úr Supabase (service-role) og skilar AÐEINS hvítlistuðum, kúnna-
// öruggum reitum. Skjöl sótt gegnum /api/gatt-doc (eignarhaldsprófað).

const P = require('./_portal');

const REPORT_TYPES = ['uttektarskyrsla', 'brunakerfi'];

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return P.json(405, { error: 'GET/POST only' });
  if (!P.dbReady()) return P.json(503, { error: 'Þjónustuvefur ekki uppsettur' });

  // Auðkenning: annaðhvort innskráð session, EÐA opinn forsýnar-aðgangur um slug.
  // Opna leiðin þjónar AÐEINS þegar félagið er virkt, ekkert lykilorð sett OG
  // open_preview=true — annars 401. (Krefst ekki JWT; þess vegna dbReady, ekki envReady.)
  const session = P.getSession(event);
  let baseId, openMode = false, openAcct = null;
  if (session) {
    baseId = session.base_id;
  } else {
    const slug = String((event.queryStringParameters || {}).c || '').trim();
    if (slug) {
      try {
        const ur = await P.sbGet(`portal_users?slug=eq.${encodeURIComponent(slug)}&select=base_id,active,pass_hash,open_preview,display_name,theme&limit=1`);
        const u = (ur.ok ? await ur.json() : [])[0];
        if (u && u.active && !u.pass_hash && u.open_preview) { baseId = u.base_id; openMode = true; openAcct = u; }
      } catch (_) {}
    }
    if (!openMode) return P.json(401, { error: 'Ekki innskráð(ur)' });
  }

  // POST → viðskiptavinur sendir fyrirspurn
  if (event.httpMethod === 'POST') {
    let b; try { b = JSON.parse(event.body || '{}'); } catch { return P.json(400, { error: 'Ógilt JSON' }); }
    const text = String(b.body || '').trim();
    if (!text) return P.json(400, { error: 'Tómt skeyti' });
    if (text.length > 4000) return P.json(400, { error: 'Skeyti of langt' });
    try {
      const ins = await P.sbPost('portal_messages', { base_id: baseId, sender: 'kunni', body: text, author_name: (session ? session.name : (openAcct && openAcct.display_name)) || '' });
      if (!ins.ok) return P.json(ins.status, { error: 'Villa', detail: await ins.text() });
      return P.json(200, { ok: true, row: (await ins.json())[0] });
    } catch (e) { return P.json(500, { error: String((e && e.message) || e) }); }
  }

  try {
    // 1) Byggingar félagsins (í þjónustu) beint úr fyrirtaeki
    const fr = await P.sbGet(`fyrirtaeki?customer_base_id=eq.${baseId}&deleted_at=is.null&select=id,nafn,heimilisfang,er_i_thjonustu&order=nafn`);
    const sites = fr.ok ? await fr.json() : [];
    const siteIds = sites.map((s) => s.id);
    const nafnById = {}; sites.forEach((s) => { nafnById[s.id] = s.nafn; });

    // 2) Skoðanastaða per byggingu (view)
    const stById = {};
    try {
      const sr = await P.sbGet(`v_stadir_skyrslu_stada?base_id=eq.${baseId}&select=site_id,report_year,stada,total_devices`);
      if (sr.ok) (await sr.json()).forEach((r) => { stById[r.site_id] = r; });
    } catch (_) {}

    // 3) Skjöl (skýrslur + reikningar) — bundin base_id EÐA byggingu félagsins
    let docs = [];
    try {
      const filt = siteIds.length
        ? `or=(customer_base_id.eq.${baseId},fyrirtaeki_id.in.(${siteIds.join(',')}))`
        : `customer_base_id=eq.${baseId}`;
      const dr = await P.sbGet(`customer_documents?${filt}&select=id,doc_type,year,doc_date,amount,invoice_number,fyrirtaeki_id,customer_base_id,is_duplicate`);
      if (dr.ok) docs = await dr.json();
    } catch (_) {}

    const buildings = sites.map((s) => {
      const st = stById[s.id] || {};
      return {
        id: s.id, nafn: s.nafn, heimilisfang: s.heimilisfang || '',
        i_thjonustu: s.er_i_thjonustu !== false,
        stada: st.stada || (s.er_i_thjonustu === false ? 'ekki_i_thjonustu' : 'engin_skyrsla'),
        sidasta_ar: st.report_year || null,
        taeki: st.total_devices != null ? st.total_devices : null,
      };
    });

    const reports = docs
      .filter((d) => REPORT_TYPES.includes(d.doc_type) && !d.is_duplicate)
      .map((d) => ({ docId: d.id, dags: d.doc_date || null, ar: d.year || null, tegund: d.doc_type,
        bygging: nafnById[d.fyrirtaeki_id] || '', magn: d.amount != null ? d.amount : null }))
      .sort((a, b) => String(b.dags || b.ar || '').localeCompare(String(a.dags || a.ar || '')));

    const invoices = docs
      .filter((d) => d.doc_type === 'reikningur' && !d.is_duplicate)
      .map((d) => ({ docId: d.id, nr: d.invoice_number || null, dags: d.doc_date || null, ar: d.year || null,
        bygging: nafnById[d.fyrirtaeki_id] || '', upphaed: d.amount != null ? d.amount : null }))
      .sort((a, b) => String(b.dags || b.ar || '').localeCompare(String(a.dags || a.ar || '')));

    const stats = {
      byggingar: buildings.filter((b) => b.i_thjonustu).length,
      i_lagi: buildings.filter((b) => b.stada === 'ok').length,
      vantar: buildings.filter((b) => b.stada === 'engin_skyrsla').length,
      taeki_alls: buildings.reduce((n, b) => n + (b.taeki || 0), 0),
    };

    // 4) Skilaboð + merkja starfs-skilaboð lesin
    let messages = [];
    try {
      const mr = await P.sbGet(`portal_messages?base_id=eq.${baseId}&select=sender,body,author_name,created_at&order=created_at.asc`);
      if (mr.ok) messages = await mr.json();
      await P.sbPatch(`portal_messages?base_id=eq.${baseId}&sender=eq.starf`, { read_by_customer: true });
    } catch (_) {}

    // heiti félags úr customers_base (fyrir hausinn) ef ekki í tokeni/opnum aðgangi
    let name = session ? session.name : (openAcct && openAcct.display_name);
    if (!name) { try { const br = await P.sbGet(`customers_base?id=eq.${baseId}&select=nafn&limit=1`); if (br.ok) name = ((await br.json())[0] || {}).nafn || ''; } catch (_) {} }
    const theme = session ? (session.theme || 'steel') : ((openAcct && openAcct.theme) || 'steel');

    return P.json(200, {
      account: { name: name || '', theme: theme, open: openMode },
      stats, buildings, reports, invoices, messages,
    });
  } catch (e) {
    return P.json(500, { error: String((e && e.message) || e) });
  }
};
