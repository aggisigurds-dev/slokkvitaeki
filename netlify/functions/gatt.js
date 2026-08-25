// gatt.js — gögn Þjónustuvefsins fyrir INNSKRÁÐAN viðskiptavin.
//
//   GET  /api/gatt   → { account, stats, buildings[], reports[], invoices[], messages[] }
//   POST /api/gatt   { body }  → viðskiptavinur sendir fyrirspurn (skilaboð)
//
// base_id kemur úr session-tokeninu (aldrei úr slóð) → einangrun. UNDANTEKNING:
// „opinn aðgangur" — ef ?c=<slug> vísar á félag sem er virkt MEÐ EKKERT lykilorð,
// þá er base_id lesið úr slug-inu og gögn þjónuð án innskráningar. Um leið og
// lykilorð (pass_hash) er sett slokknar á þessu sjálfkrafa (→ krefst innskráningar).
// Les beint úr Supabase (service-role) og skilar AÐEINS hvítlistuðum, kúnna-
// öruggum reitum. Skjöl sótt gegnum /api/gatt-doc (eignarhaldsprófað).

const P = require('./_portal');

const REPORT_TYPES = ['uttektarskyrsla', 'brunakerfi'];

// ── Afmörkun skjala ─────────────────────────────────────────────────────────
// customer_documents inniheldur oft FLEIRI raðir fyrir sömu skoðun (t.d.
// Drive-indexuð skýrsla + handvirk skráning) sem eru EKKI merktar is_duplicate.
// Aðal-yfirlitin (brunakerfisyfirlit 272, rekstrarfélög 175) sýna EINA reit per
// (bygging, tegund, ár); gáttin sýndi hverja röð → falskar auka-skoðanir. Hér
// veljum við bestu röðina per lykli: skjal með sótt-hæfa skrá vinnur, svo
// ódauðkennt, svo nýrri dagsetning, svo lægra id (stöðugt val).
function docScore(d) {
  return (d.storage_path || d.drive_file_id ? 2 : 0) + (d.is_duplicate ? 0 : 1);
}
function betterDoc(a, b) {
  if (!a) return b;
  const sa = docScore(a), sb = docScore(b);
  if (sb !== sa) return sb > sa ? b : a;
  const da = String(a.doc_date || ''), db = String(b.doc_date || '');
  if (db !== da) return db > da ? b : a;
  return (b.id < a.id) ? b : a;
}
function dedupeDocs(rows, keyFn) {
  const m = new Map();
  for (const d of rows) m.set(keyFn(d), betterDoc(m.get(keyFn(d)), d));
  return [...m.values()];
}
function normNr(s) { return String(s == null ? '' : s).replace(/\s+/g, '').replace(/^R-?/i, '').replace(/^0+/, '').toUpperCase(); }

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return P.json(405, { error: 'GET/POST only' });
  if (!P.dbReady()) return P.json(503, { error: 'Þjónustuvefur ekki uppsettur' });

  // Auðkenning: annaðhvort innskráð session, EÐA opinn aðgangur um slug.
  // Opna leiðin þjónar AÐEINS þegar félagið er virkt OG ekkert lykilorð sett —
  // annars 401. (Krefst ekki JWT; þess vegna dbReady, ekki envReady.)
  const session = P.getSession(event);
  let baseId, openMode = false, openAcct = null;
  if (session) {
    baseId = session.base_id;
  } else {
    const slug = String((event.queryStringParameters || {}).c || '').trim();
    if (slug) {
      try {
        const ur = await P.sbGet(`portal_users?slug=eq.${encodeURIComponent(slug)}&select=base_id,active,pass_hash,display_name,theme&limit=1`);
        const u = (ur.ok ? await ur.json() : [])[0];
        if (u && u.active && !u.pass_hash) { baseId = u.base_id; openMode = true; openAcct = u; }
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
      const sr = await P.sbGet(`v_stadir_skyrslu_stada?base_id=eq.${baseId}&select=site_id,report_year,inspect_month,stada,total_devices`);
      if (sr.ok) (await sr.json()).forEach((r) => { stById[r.site_id] = r; });
    } catch (_) {}

    // 2b) Virkur skoðunarmánuður per stað — SAMA forgangsregla og „📅"-takkinn í
    //     appinu (v_next_inspection: handvirkt/blob > skýrsla > reikningur).
    const imById = {};
    try {
      const nr = await P.sbGet(`v_next_inspection?base_id=eq.${baseId}&select=site_id,inspect_month`);
      if (nr.ok) (await nr.json()).forEach((r) => { imById[r.site_id] = r.inspect_month; });
    } catch (_) {}

    // 3) Skjöl (skýrslur + reikningar) — bundin base_id EÐA byggingu félagsins
    let docs = [];
    try {
      const filt = siteIds.length
        ? `or=(customer_base_id.eq.${baseId},fyrirtaeki_id.in.(${siteIds.join(',')}))`
        : `customer_base_id=eq.${baseId}`;
      const dr = await P.sbGet(`customer_documents?${filt}&select=id,doc_type,year,doc_date,amount,invoice_number,fyrirtaeki_id,customer_base_id,is_duplicate,storage_path,drive_file_id,vidskiptategund`);
      if (dr.ok) docs = await dr.json();
    } catch (_) {}

    // Brunakerfis-ár per byggingu (raunveruleg brunakerfis-skjöl) — svo yfirlitið
    // merki brunakerfi AÐEINS þar sem raunverulegt brunakerfis-skjal er til, í stað
    // þess að spegla slökkvitækja-stöðuna (sem gaf falskar brunakerfis-skoðanir).
    const bruYearsByFy = {};
    docs.forEach((d) => {
      if (d.doc_type === 'brunakerfi' && !d.is_duplicate && d.fyrirtaeki_id != null && d.year != null) {
        (bruYearsByFy[d.fyrirtaeki_id] = bruYearsByFy[d.fyrirtaeki_id] || new Set()).add(String(d.year));
      }
    });

    const buildings = sites.map((s) => {
      const st = stById[s.id] || {};
      return {
        id: s.id, nafn: s.nafn, heimilisfang: s.heimilisfang || '',
        i_thjonustu: s.er_i_thjonustu !== false,
        stada: st.stada || (s.er_i_thjonustu === false ? 'ekki_i_thjonustu' : 'engin_skyrsla'),
        sidasta_ar: st.report_year || null,
        ar_bru: [...(bruYearsByFy[s.id] || [])].sort(),
        // skoðunarmánuður úr v_next_inspection (eins og „📅"-takkinn); fallback á skýrslu-mánuð
        skodun_manudur: imById[s.id] != null ? imById[s.id] : (st.inspect_month != null ? st.inspect_month : null),
        taeki: st.total_devices != null ? st.total_devices : null,
      };
    });

    // Ein skýrsla per (bygging, tegund, ár) — sama regla og aðal-yfirlitin.
    const reports = dedupeDocs(
      docs.filter((d) => REPORT_TYPES.includes(d.doc_type) && !d.is_duplicate),
      (d) => `${d.fyrirtaeki_id == null ? '' : d.fyrirtaeki_id}|${d.doc_type}|${d.year == null ? '' : d.year}`,
    )
      .map((d) => ({ docId: d.id, dags: d.doc_date || null, ar: d.year || null, tegund: d.doc_type,
        bygging: nafnById[d.fyrirtaeki_id] || '', magn: d.amount != null ? d.amount : null }))
      .sort((a, b) => String(b.dags || b.ar || '').localeCompare(String(a.dags || a.ar || '')));

    // Einn reikningur per reikningsnúmer (ver gegn tvítekningum úr fleiri heimildum).
    const invoices = dedupeDocs(
      docs.filter((d) => d.doc_type === 'reikningur' && !d.is_duplicate),
      (d) => normNr(d.invoice_number) || ('id:' + d.id),
    )
      .map((d) => ({ docId: d.id, nr: d.invoice_number || null, dags: d.doc_date || null, ar: d.year || null,
        bygging: nafnById[d.fyrirtaeki_id] || '', upphaed: d.amount != null ? d.amount : null,
        tegund: d.vidskiptategund || null }))
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
