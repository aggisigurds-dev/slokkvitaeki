// gatt.js — gögn Þjónustuvefsins fyrir INNSKRÁÐAN viðskiptavin.
//
//   GET  /api/gatt   → { account, stats, buildings[], reports[], invoices[], messages[] }
//                      account.details = portal_users.show_details → buildings[].equipment
//   POST /api/gatt   { body }  → viðskiptavinur sendir fyrirspurn (skilaboð)
//
// base_id kemur úr session-tokeninu (aldrei úr slóð) → einangrun. UNDANTEKNING:
// „opinn aðgangur" — ef ?c=<slug> vísar á félag sem er virkt MEÐ EKKERT lykilorð,
// þá er base_id lesið úr slug-inu og gögn þjónuð án innskráningar. Um leið og
// lykilorð (pass_hash) er sett slokknar á þessu sjálfkrafa (→ krefst innskráningar).
// Les beint úr Supabase (service-role) og skilar AÐEINS hvítlistuðum, kúnna-
// öruggum reitum. Skjöl sótt gegnum /api/gatt-doc (eignarhaldsprófað).

const P = require('./_portal.cjs');
const { pickHose, slokkMinusHose } = require('./_gatt-eq.cjs');
const GY = require('./_gatt-years.cjs');

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
// ── Eignasíða (portal_users.show_details + syn) ─────────────────────────────
// syn = hvaða hlutar sjást; vantar lykil = sjálfgefið (allt nema það sem er slökkt á gatt-admin).
const SYN_DEF = { teikningar: true, threed: true, nidurhal: true, greining: true, taeki: true, skjol: true, verkbeidni: true };
function lesaSyn(acct) {
  const syn = Object.assign({}, SYN_DEF);
  const s = acct && acct.syn && typeof acct.syn === 'object' ? acct.syn : {};
  Object.keys(SYN_DEF).forEach((k) => { if (typeof s[k] === 'boolean') syn[k] = s[k]; });
  return syn;
}
// Merki á teikningu → heiti + litur (sömu kóðar og 434-teikning-takn). Tæki = tegund úr tækjaskrá.
const MERKI = {
  neydarutgangur: ['Neyðarútgangur', '#15803d'], ut: ['Útgangsmerki', '#15803d'], hose: ['Slöngumerki', '#be123c'],
  rafmagn: ['Rafmagnstafla', '#ca8a04'], skilti_slt: ['Skilti slökkvitæki', '#e11d2e'], skilti_slanga: ['Skilti brunaslanga', '#e11d2e'],
  reykskynjari: ['Reykskynjari', '#e11d2e'], hitaskynjari: ['Hitaskynjari', '#e11d2e'], bjalla: ['Viðvörunarbjalla', '#e11d2e'], segull: ['Segulloki', '#64748b'],
};
function merkiLysing(m) {
  const erMerki = m.kind === 'sign' || (typeof m.unitId === 'string' && m.unitId.indexOf('s:') === 0);
  if (erMerki) {
    const d = MERKI[String(m.sign || '').toLowerCase()];
    return { l: d ? d[0] : 'Merki', c: d ? d[1] : (m.color || '#64748b'), merki: true };
  }
  const t = String(m.tegund || '').trim() || 'Slökkvitæki';
  const tl = t.toLowerCase();
  const c = /l[ée]tt/.test(tl) ? '#0f9488' : /duft/.test(tl) ? '#2563eb' : /co2|kols/.test(tl) ? '#111827' : /slang/.test(tl) ? '#be123c' : '#e11d2e';
  return { l: t, c: c, merki: false };
}
// Ein hæð úr teikning_bord.haedir → aðeins kúnna-örugg gögn (ekki veggir/pdfVeggir/stillingar).
function grisjaHaed(h, syn) {
  if (!h || typeof h !== 'object') return null;
  const vm = h.vinnumynd && h.vinnumynd.url ? h.vinnumynd : null;
  const mk = Array.isArray(h.markers) ? h.markers : [];
  const out = { nafn: h.nafn || '', fjoldi: mk.length };
  if (syn.teikningar && h.image_url) {
    out.mynd = h.image_url;
    out.frum = h.frum && h.frum.b > 0 ? { b: h.frum.b, h: h.frum.h } : null;
    out.skurdur = h.skurdur && h.skurdur.w > 8 && h.skurdur.h > 8 ? { x: h.skurdur.x, y: h.skurdur.y, w: h.skurdur.w, h: h.skurdur.h } : null;
    out.merki = mk.filter((m) => m && isFinite(+m.x) && isFinite(+m.y)).map((m) => [+m.x, +m.y, merkiLysing(m).c]);
  }
  if (syn.threed && vm) out.threed = { url: vm.url, b: vm.b || null, h: vm.h || null };
  if (syn.greining) {
    const taeki = {}, merki = {};
    mk.forEach((m) => { const d = merkiLysing(m); const box = d.merki ? merki : taeki; box[d.l] = box[d.l] || { n: 0, c: d.c }; box[d.l].n++; });
    let ei60 = 0, ei30 = 0;
    (Array.isArray(h.eldVal) ? h.eldVal : []).forEach((e) => { const mn = Array.isArray(e) ? +e[4] : 0; if (mn >= 60) ei60++; else if (mn >= 30) ei30++; });
    out.greining = { taeki, merki, ei60, ei30 };
  }
  return out;
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
        const ur = await P.sbGet(`portal_users?slug=eq.${encodeURIComponent(slug)}&select=base_id,active,pass_hash,display_name,theme,show_details,syn&limit=1`);
        const u = (ur.ok ? await ur.json() : [])[0];
        if (u && u.active && !u.pass_hash) { baseId = u.base_id; openMode = true; openAcct = u; }
      } catch (_) {}
    }
    if (!openMode) return P.json(401, { error: 'Ekki innskráð(ur)' });
  }

  // Stillingar aðgangsins lesnar LIFANDI (þema, eignasíða, syn) — tokenið geymir þemað frá
  // innskráningu, svo breyting á stjórnsíðunni gildir strax.
  let acct = openAcct;
  if (!acct) {
    try {
      const ar0 = await P.sbGet(`portal_users?base_id=eq.${baseId}&active=eq.true&select=theme,show_details,display_name,syn&order=show_details.desc,created_at.asc&limit=1`);
      if (ar0.ok) acct = (await ar0.json())[0] || null;
    } catch (_) {}
  }
  const showDetails = !!(acct && acct.show_details);
  const syn = lesaSyn(acct);

  // POST → viðskiptavinur sendir fyrirspurn
  if (event.httpMethod === 'POST') {
    let b; try { b = JSON.parse(event.body || '{}'); } catch { return P.json(400, { error: 'Ógilt JSON' }); }
    const text = String(b.body || '').trim();
    if (!text) return P.json(400, { error: 'Tómt skeyti' });
    if (text.length > 4000) return P.json(400, { error: 'Skeyti of langt' });
    const hofundur = (session ? session.name : (openAcct && openAcct.display_name)) || '';
    const kind = ['verkbeidni', 'thjonusta'].includes(b.kind) ? b.kind : 'fyrirspurn';
    try {
      const ins = await P.sbPost('portal_messages', { base_id: baseId, sender: 'kunni', body: text, author_name: hofundur });
      if (!ins.ok) return P.json(ins.status, { error: 'Villa', detail: await ins.text() });
      const row = (await ins.json())[0];
      // Verkbeiðni og „bæta við þjónustu" verða líka mál á Þjónustuborðinu (source 'gatt').
      // Eignin er staðfest sem eign félagsins; í mesta lagi 25 mál á klst. per félag (opinn aðgangur
      // er án lykilorðs — skilaboðin fara samt alltaf).
      let mal = null;
      if (kind === 'thjonusta' || (kind === 'verkbeidni' && syn.verkbeidni)) {
        try {
          let fyId = null, fyNafn = '';
          const sid = parseInt(b.site_id, 10);
          if (sid) {
            const fr0 = await P.sbGet(`fyrirtaeki?id=eq.${sid}&customer_base_id=eq.${baseId}&select=id,nafn&limit=1`);
            const f0 = fr0.ok ? (await fr0.json())[0] : null;
            if (f0) { fyId = f0.id; fyNafn = f0.nafn || ''; }
          }
          const since = new Date(Date.now() - 3600e3).toISOString();
          const cr = await P.sbGet(`thjonustubeidni?source=eq.gatt&customer_base_id=eq.${baseId}&created_at=gte.${encodeURIComponent(since)}&select=id`);
          const nyleg = cr.ok ? (await cr.json()).length : 0;
          if (nyleg < 25) {
            const vb = kind === 'verkbeidni';
            const mr0 = await P.sbPost('thjonustubeidni', {
              customer_base_id: baseId, customer_nafn: hofundur || null, fyrirtaeki_id: fyId,
              title: (vb ? 'Verkbeiðni' : 'Beiðni um þjónustu') + ' af þjónustuvef' + (fyNafn ? ' — ' + fyNafn : ''),
              notes: text, source: 'gatt', type: vb ? 'annad' : 'skodun_tilbod', flokkur: vb ? 'thjonusta' : 'tilbod',
              status: 'nytt', priority: 'venjulegur', created_by: 'þjónustuvefur', tags: ['gatt', kind],
            });
            if (mr0.ok) mal = ((await mr0.json())[0] || {}).id || null;
          }
        } catch (_) {}
      }
      return P.json(200, { ok: true, row, mal });
    } catch (e) { return P.json(500, { error: String((e && e.message) || e) }); }
  }

  try {
    // 1) Byggingar félagsins (í þjónustu) beint úr fyrirtaeki
    const fr = await P.sbGet(`fyrirtaeki?customer_base_id=eq.${baseId}&deleted_at=is.null&select=id,nafn,heimilisfang,er_i_thjonustu,eign,stadur_nr&order=nafn`);
    const sites = fr.ok ? await fr.json() : [];
    const siteIds = sites.map((s) => s.id);
    const nafnById = {}, nrById = {}; sites.forEach((s) => { nafnById[s.id] = s.nafn; nrById[s.id] = s.stadur_nr; });

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

    // Ár per byggingu úr RAUNVERULEGUM skjölum á ÞESSU fyrirtaeki_id.
    // Slökk og brunakerfi eru tvær þjónustur — aldrei spegla aðra í hina
    // (Center Hótel er í báðum; Hlaðvarpinn er aðeins í slökk).
    const bruYearsByFy = {};
    const slokkYearsByFy = {};
    docs.forEach((d) => {
      if (d.is_duplicate || d.fyrirtaeki_id == null || d.year == null) return;
      if (d.doc_type === 'brunakerfi') {
        (bruYearsByFy[d.fyrirtaeki_id] = bruYearsByFy[d.fyrirtaeki_id] || new Set()).add(String(d.year));
      } else if (d.doc_type === 'uttektarskyrsla') {
        (slokkYearsByFy[d.fyrirtaeki_id] = slokkYearsByFy[d.fyrirtaeki_id] || new Set()).add(String(d.year));
      }
    });

    // Brunakerfisþjónusta = AppSettings.brunakerfi_customers[fid], EKKI slökk
    // er_i_thjonustu (það málaði „Brunak. Já" á Hlaðvarpinn).
    let bruMap = {};
    try {
      const ar = await P.sbGet('app_settings?id=eq.1&select=settings');
      if (ar.ok) {
        const row = (await ar.json())[0];
        bruMap = (row && row.settings && row.settings.brunakerfi_customers) || {};
      }
    } catch (_) {}

    // 2c) Brunaslöngur per byggingu. Sýnishornið (Center Hótel) sýnir slöngur
    //     sem eigin dálk; total_devices inniheldur þær. Skýrsla fyrst, tækjaskrá
    //     sem vara (óvirkar slöngur á Arnarhvoll eru samt á skýrslunni).
    const factSloById = {};
    const liveBslById = {};
    try {
      if (siteIds.length) {
        const ids = siteIds.join(',');
        const ar = await P.sbGet(`arsskodun_report_facts?fyrirtaeki_id=in.(${ids})&select=fyrirtaeki_id,report_year,equipment&order=report_year.desc`);
        if (ar.ok) {
          (await ar.json()).forEach((r) => {
            if (factSloById[r.fyrirtaeki_id] !== undefined) return;
            let eq = r.equipment || {};
            if (typeof eq === 'string') { try { eq = JSON.parse(eq); } catch (_) { eq = {}; } }
            factSloById[r.fyrirtaeki_id] = eq.brunaslongur != null ? Number(eq.brunaslongur) : null;
          });
        }
        const rr = await P.sbGet(`v_uttaeki_fid_rollup?fyrirtaeki_id=in.(${ids})&select=fyrirtaeki_id,bsl`);
        if (rr.ok) {
          (await rr.json()).forEach((r) => { liveBslById[r.fyrirtaeki_id] = Number(r.bsl) || 0; });
        }
      }
    } catch (_) {}

    // 2d) Tækjaskrá per byggingu — AÐEINS þegar „nánari upplýsingar" er hakað.
    //     Kúnna-öruggir reitir: tegund, stærð, staðsetning, raðnúmer (ekki TMP-),
    //     skoðunardagar. Aldrei notes/phone/client/custody. Úrelt tæki sleppt.
    const eqById = {};
    if (showDetails && syn.taeki && siteIds.length) {
      try {
        const er = await P.sbGet(`uttaeki?fyrirtaeki_id=in.(${siteIds.join(',')})&status=neq.urelt&select=fyrirtaeki_id,type,size,location,serial,last_insp,next_insp,status&order=type.asc,size.asc,location.asc&limit=5000`);
        if (er.ok) {
          const norm = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9áéíóúýþæöð]+/g, '');
          const addrById = {}; sites.forEach((s) => { addrById[s.id] = norm(s.heimilisfang); });
          (await er.json()).forEach((u) => {
            const loc = u.location && norm(u.location) !== addrById[u.fyrirtaeki_id] ? u.location : null;
            const nr = u.serial && !/^TMP-/i.test(u.serial) ? u.serial : null;
            (eqById[u.fyrirtaeki_id] = eqById[u.fyrirtaeki_id] || []).push({
              tegund: u.type || '', staerd: u.size || '', stadsetning: loc, nr: nr,
              sidast: u.last_insp || null, naest: u.next_insp || null, lan: u.status === 'loaned' });
          });
        }
      } catch (_) {}
    }

    // 2e) Teikningar per byggingu (teikning_bord.company_id = fyrirtaeki.id) — grisjaðar
    const tkById = {};
    if (showDetails && (syn.teikningar || syn.threed || syn.greining) && siteIds.length) {
      try {
        const tr = await P.sbGet(`teikning_bord?company_id=in.(${siteIds.join(',')})&select=company_id,haedir,image_url,markers`);
        if (tr.ok) {
          (await tr.json()).forEach((t) => {
            const hs = Array.isArray(t.haedir) && t.haedir.length ? t.haedir : (t.image_url ? [{ nafn: 'Teikning', image_url: t.image_url, markers: t.markers || [] }] : []);
            const haedir = hs.map((h) => grisjaHaed(h, syn)).filter(Boolean);
            if (haedir.length) tkById[t.company_id] = haedir;
          });
        }
      } catch (_) {}
    }

    // 2f) Opnar beiðnir af þjónustuvef per eign (Þjónustuborð, source 'gatt') → „Beiðni í vinnslu"
    const beidniById = {};
    try {
      const br0 = await P.sbGet(`thjonustubeidni?source=eq.gatt&customer_base_id=eq.${baseId}&status=in.(nytt,i_vinnslu)&deleted_at=is.null&select=fyrirtaeki_id`);
      if (br0.ok) (await br0.json()).forEach((r) => { if (r.fyrirtaeki_id != null) beidniById[r.fyrirtaeki_id] = true; });
    } catch (_) {}

    const buildings = sites.map((s) => {
      const st = stById[s.id] || {};
      const slo = pickHose(factSloById[s.id], liveBslById[s.id]);
      const rawTotal = st.total_devices != null ? st.total_devices : null;
      const arSlokk = [...(slokkYearsByFy[s.id] || [])].sort();
      const arBru = [...(bruYearsByFy[s.id] || [])].sort();
      const bruEntry = bruMap[s.id] || bruMap[String(s.id)] || null;
      const bruOn = GY.bruInService(bruMap, s.id);
      return {
        id: s.id, nafn: s.nafn, heimilisfang: s.heimilisfang || '',
        i_thjonustu: s.er_i_thjonustu !== false,
        bru_i_thjonustu: bruOn,
        stada: st.stada || (s.er_i_thjonustu === false ? 'ekki_i_thjonustu' : 'engin_skyrsla'),
        sidasta_ar: GY.lastYear(arSlokk) || st.report_year || null,
        ar_slokk: arSlokk,
        ar_bru: arBru,
        // skoðunarmánuður úr v_next_inspection (eins og „📅"-takkinn); fallback á skýrslu-mánuð
        skodun_manudur: imById[s.id] != null ? imById[s.id] : (st.inspect_month != null ? st.inspect_month : null),
        bru_skodun_manudur: bruEntry && bruEntry.inspect_month != null ? Number(bruEntry.inspect_month) : null,
        taeki: slokkMinusHose(rawTotal, slo),
        slo: slo,
        // Upplýsingar um fasteignina (mynd, stærð, ár, tegund, lýsing) — opinberar upplýsingar
        eign: s.eign && typeof s.eign === 'object' ? s.eign : null,
        beidni: !!beidniById[s.id],
        ...(showDetails && syn.taeki ? { equipment: eqById[s.id] || [] } : {}),
        ...(showDetails && tkById[s.id] ? { teikning: tkById[s.id] } : {}),
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
        lysing: '', tegund: d.vidskiptategund || null }))
      .sort((a, b) => String(b.dags || b.ar || '').localeCompare(String(a.dags || a.ar || '')));

    // Drive-einn Stolpi-class docs often have PDF + year but no kr / full date.
    // Fill from solur when the R-númer matches — never invent amounts.
    try {
      const need = invoices.filter((i) => i.nr && (i.upphaed == null || !i.dags || !i.lysing));
      if (need.length) {
        const quoted = [...new Set(need.map((i) => String(i.nr).replace(/"/g, '')))]
          .map((n) => `"${n}"`).join(',');
        const sr = await P.sbGet(`solur?num=in.(${quoted})&select=num,samtals,created_at,source`);
        if (sr.ok) {
          const byNr = {};
          (await sr.json()).forEach((s) => { if (s && s.num) byNr[normNr(s.num)] = s; });
          const SRC = { uttekt: 'Úttekt', brunakerfi: 'Brunakerfi', pos: 'Sala' };
          invoices.forEach((i) => {
            const s = byNr[normNr(i.nr)];
            if (!s) return;
            if (i.upphaed == null && s.samtals != null && s.samtals !== '') i.upphaed = Number(s.samtals);
            if (!i.dags && s.created_at) i.dags = String(s.created_at).slice(0, 10);
            // AÐEINS örugg þjónustu-merki (Úttekt/Brunakerfi/Sala) — aldrei
            // athugasemdir úr solur: sá reitur getur borið innri nótur
            // (t.d. afritaðar af kúnnaspjaldi í POS) og gáttin er kúnna-sýnileg,
            // líka í opna hamnum án lykilorðs.
            if (!i.lysing) i.lysing = SRC[s.source] || '';
          });
        }
      }
    } catch (_) {}

    // Yfirlit: aðeins staðir í annarri hvorri þjónustunni. Þverholt 14 er
    // lögheimili/samningur, ekki hótel á slökk- eða brunakerfisborði.
    const onBoard = buildings.filter((b) => b.i_thjonustu || b.bru_i_thjonustu);
    // Eignasafn: eignir félagsins UTAN þjónustu sem bera eign-upplýsingar (skráðar viljandi sem
    // fasteignir, t.d. Reitir 11.10.2026) — kúnninn getur skráð þær í þjónustu í gáttinni.
    // Lögheimilis-/samningsstaðir án eign-gildis (Þverholt 14) birtast ekki.
    const eignirUtan = buildings.filter((b) => !(b.i_thjonustu || b.bru_i_thjonustu) && b.eign)
      .map((b) => ({ id: b.id, nafn: b.nafn, heimilisfang: b.heimilisfang, eign: b.eign, beidni: b.beidni }))
      .sort((a, c) => (nrById[a.id] || 999) - (nrById[c.id] || 999));   // röð eins og staðirnir voru skráðir
    const inService = onBoard.filter((b) => b.i_thjonustu);
    const stats = {
      byggingar: inService.length,
      i_lagi: onBoard.filter((b) => b.stada === 'ok').length,
      vantar: onBoard.filter((b) => b.i_thjonustu && b.stada === 'engin_skyrsla').length,
      taeki_alls: inService.reduce((n, b) => n + (b.taeki || 0), 0),
      brunaslongur_alls: inService.reduce((n, b) => n + (b.slo || 0), 0),
      brunakerfi_stk: onBoard.filter((b) => b.bru_i_thjonustu).length,
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
    const theme = (acct && acct.theme) || (session && session.theme) || 'steel';

    return P.json(200, {
      account: { name: name || '', theme: theme, open: openMode, details: showDetails, syn: syn },
      stats, buildings: onBoard, eignir_utan: eignirUtan, reports, invoices, messages,
    });
  } catch (e) {
    return P.json(500, { error: String((e && e.message) || e) });
  }
};
