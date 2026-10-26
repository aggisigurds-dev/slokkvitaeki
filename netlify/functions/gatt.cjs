// gatt.js — gögn Þjónustuvefsins fyrir INNSKRÁÐAN viðskiptavin.
//
//   GET  /api/gatt   → { account, stats, buildings[], reports[], invoices[], messages[] }
//                      account.details = portal_users.show_details → buildings[].equipment
//   POST /api/gatt   { body }  → viðskiptavinur sendir fyrirspurn (skilaboð)
//   POST /api/gatt   { action:'eldvarnabok', site_id, manudur:'YYYY-MM', svor, stada, undirritad_af, fravik[] }
//                    → eldvarnabók mánaðarins vistuð (drög) eða undirrituð; nei-svör verða erindi á Þjónustuborði
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
const M = require('./_gatt-myndir.cjs');
const VF = require('./_gatt-verkfaeri.cjs');
const BGR = require('./_gatt-bgr.cjs');

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
// ── Eignasíða: syn = hvaða verkfæri eru kveikt (gatt-admin) — skráin er í _gatt-verkfaeri.cjs / gatt/verkfaeri.js ──
const lesaSyn = VF.lesaSyn;
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
// Staða máls á Þjónustuborði → skref sem kúnninn sér (Móttekið → Í vinnslu → Lokið).
const ERINDI_SKREF = { nytt: 'mottekid', i_vinnslu: 'i_vinnslu', klarad: 'lokid', lokad: 'lokid' };
// „Verkbeiðni af þjónustuvef — Reitir - Hilton“ → „Verkbeiðni“ (eignin stendur við hliðina í viðmótinu).
function erindiTitill(t) { return String(t || '').replace(/\s+af þjónustuvef/i, '').replace(/\s+—\s+[^—]*$/, '').trim() || 'Erindi'; }
const MAN_IS = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
function normNr(s) { return String(s == null ? '' : s).replace(/\s+/g, '').replace(/^R-?/i, '').replace(/^0+/, '').toUpperCase(); }
const ABYRGD = ['okkar', 'eigandi', 'annar'];
// Síun erinda: mál af þjónustuvef (source gatt) EÐA mál sem starfsfólk merkti kúnnanum (tags ∋ 'gatt', t.d. verkefni
// með abyrgd 'eigandi' stofnuð á Þjónustuborðinu).
const ERINDI_FILT = 'or=(source.eq.gatt,tags.cs.' + encodeURIComponent('["gatt"]') + ')';
const ERINDI_SEL = 'id,fyrirtaeki_id,title,summary,status,created_at,updated_at,tags,punktur,myndir,eftirmyndir,abyrgd,lokid_at,lokid_lysing,due_at,einkunn,einkunn_ath,einkunn_at,svar,svarad_at,visun';
// Ein röð erindis eins og kúnninn má sjá hana: titill, staða, punktur, myndir (undirritaðar), ábyrgð — aldrei innri nótur.
const VISUN_T = ['reikningur', 'skyrsla', 'samningur'];
function visunHreint(v) {
  return (Array.isArray(v) ? v : []).filter((x) => x && VISUN_T.includes(x.t)).slice(0, 6).map((x) => ({
    t: x.t, nr: x.nr != null ? String(x.nr).slice(0, 24) : null, docId: Number.isFinite(+x.docId) && +x.docId > 0 ? +x.docId : null, txt: x.txt != null ? String(x.txt).slice(0, 90) : null }));
}
// Viðbótarupplýsingar skýrslu (22.10.2026): tæki í skýrslu, það sem var unnið (úr reikningi) og athugasemdir af vinnublaði.
// Aðeins hvítlistaðir reitir og stuttir strengir — gáttin er kúnna-sýnileg.
function vidbotHreint(v) {
  if (!v || typeof v !== 'object') return null;
  const par = (L) => (Array.isArray(L) ? L : []).filter((x) => Array.isArray(x) && typeof x[0] === 'string' && Number.isFinite(+x[1])).slice(0, 14).map((x) => [String(x[0]).slice(0, 80), Math.round(+x[1])]);
  const txt = (L) => (Array.isArray(L) ? L : []).filter((x) => typeof x === 'string').slice(0, 6).map((x) => x.slice(0, 400));
  // munur: hvað var öðruvísi en í síðustu skoðun (skýrir verðmun milli ára)
  const out = { reikn: typeof v.reikn === 'string' ? v.reikn.slice(0, 24) : null, taeki: par(v.taeki), unnid: par(v.unnid),
    vinnublad: txt(v.vinnublad), munur: txt(v.munur) };
  return (out.taeki.length || out.unnid.length || out.vinnublad.length || out.munur.length) ? out : null;
}
function erindiRod(r, slod) {
  const tags = Array.isArray(r.tags) ? r.tags : [];
  const mynd = (L) => (Array.isArray(L) ? L : []).map((m) => m && m.path && slod[m.path] ? { url: slod[m.path], w: m.w || null, h: m.h || null, at: m.at || null } : null).filter(Boolean);
  // Skref sem kúnninn sér: Móttekið → Í vinnslu → Svarað → Lokið. „Svarað" = starfsmaður hefur svarað en málið er ekki lokað.
  const lokad = ERINDI_SKREF[r.status] === 'lokid';
  const stada = lokad ? 'lokid' : (r.svarad_at ? 'svarad' : (ERINDI_SKREF[r.status] || 'mottekid'));
  const tegund = tags.includes('eldvarnabok') ? 'eldvarnabok' : tags.includes('verkbeidni') ? 'verkbeidni' : tags.includes('verkefni') ? 'verkefni'
    : tags.includes('thjonusta') ? 'thjonusta' : tags.includes('gogn') ? 'gogn' : tags.includes('reikningur') ? 'reikningur' : tags.includes('annad') ? 'annad' : 'fyrirspurn';
  return { id: r.id, fid: r.fyrirtaeki_id, titill: erindiTitill(r.title), lysing: r.summary || null, stada, rstada: r.status, tegund,
    dags: r.created_at, uppf: r.updated_at, frestur: r.due_at || null,
    abyrgd: ABYRGD.includes(r.abyrgd) ? r.abyrgd : 'okkar', punktur: r.punktur && typeof r.punktur === 'object' ? r.punktur : null,
    myndir: mynd(r.myndir), eftirmyndir: mynd(r.eftirmyndir), lokid: r.lokid_at || null, lokid_lysing: r.lokid_lysing || null,
    svar: r.svar || null, svarad: r.svarad_at || null, visun: visunHreint(r.visun),
    einkunn: r.einkunn || null, einkunn_ath: r.einkunn_at ? (r.einkunn_ath || null) : (r.einkunn_ath || null) };
}
function myndaSlodir(rows) {
  const p = [];
  rows.forEach((r) => { [].concat(r.myndir || [], r.eftirmyndir || []).forEach((m) => { if (m && m.path) p.push(m.path); }); });
  return p;
}
function innanIslands(lat, lng) { return isFinite(lat) && isFinite(lng) && lat > 62.5 && lat < 67.5 && lng > -25.5 && lng < -12.5; }
function origin(event) {
  const host = (event.headers && (event.headers.host || event.headers.Host)) || 'slokkvitaeki.netlify.app';
  return 'https://' + host;
}

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
        const ur = await P.sbGet(`portal_users?slug=eq.${encodeURIComponent(slug)}&select=base_id,active,pass_hash,display_name,theme,show_details,syn,stillingar&limit=1`);
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
      const ar0 = await P.sbGet(`portal_users?base_id=eq.${baseId}&active=eq.true&select=theme,show_details,display_name,syn,stillingar&order=show_details.desc,created_at.asc&limit=1`);
      if (ar0.ok) acct = (await ar0.json())[0] || null;
    } catch (_) {}
  }
  // 22.10.2026 (Agnar: „mátt setja hann default allstaðar“): eignasíðan er opin öllum aðgöngum nema stjórnsíðan slökkvi á henni (show_details = false)
  const showDetails = !!(acct && acct.show_details !== false);
  const syn = lesaSyn(acct);
  // ── Hlutverk og eignir notanda (12.10.2026): stjórnandi sér allt; eldvarnarfulltrúi sér sínar eignir og skrifar;
  //    skoðandi les allt en skrifar ekkert; leigutaki sér sínar eignir, sendir verkbeiðnir, sér hvorki skilaboð
  //    félagsins, reikninga, vinnusvæði né eldvarnabók. Opinn hamur = stjórnandi.
  const hlutverk = (session && session.hlutverk) || 'stjornandi';
  const leyfd = session && Array.isArray(session.eignir) && session.eignir.length ? new Set(session.eignir.map(Number)) : null;
  const lesEingongu = hlutverk === 'skodandi', leigutaki = hlutverk === 'leigutaki';
  if (leigutaki) { syn.vinnusvaedi = false; syn.eldvarnabok = false; syn.baeta_eign = false; }
  // ── Rekstrarfélag (26.10.2026): félögin sem bera sama rekstrarfélags-merki og þetta base_id — eignir þeirra,
  //    skjöl, erindi, reikningar og eldvarnabók birtast í SÖMU gátt. BF(dálkur) = in.(öll base_id hópsins).
  const hopur = await P.baseHopur(baseId);
  const baseIds = hopur.ids;
  const BF = (col) => `${col}=in.(${baseIds.join(',')})`;

  // ── Eldvarnabók: vista drög eða undirrita mánuð ───────────────────────────
  // Eignin verður að vera eign félagsins; mánuðurinn í mesta lagi 12 mánuðum aftur og ekki fram í tímann;
  // undirritaður mánuður er læstur. Nei-svör við undirritun → eitt mál á Þjónustuborði (source 'gatt').
  async function vistaEldvarnabok(b) {
    if (!syn.eldvarnabok) return P.json(403, { error: 'Eldvarnabók er ekki opin á þessum aðgangi' });
    const sid = parseInt(b.site_id, 10);
    const m = /^(\d{4})-(\d{2})$/.exec(String(b.manudur || ''));
    if (!sid || !m) return P.json(400, { error: 'Eign eða mánuð vantar' });
    const ar = +m[1], mn = +m[2];
    const nu = new Date(), idx = ar * 12 + mn - 1, nuIdx = nu.getUTCFullYear() * 12 + nu.getUTCMonth();
    if (mn < 1 || mn > 12 || idx > nuIdx || idx < nuIdx - 12) return P.json(400, { error: 'Mánuður utan leyfilegs bils' });
    const manudur = m[1] + '-' + m[2] + '-01';
    const fr0 = await P.sbGet(`fyrirtaeki?id=eq.${sid}&${BF('customer_base_id')}&deleted_at=is.null&select=id,nafn&limit=1`);
    const f0 = fr0.ok ? (await fr0.json())[0] : null;
    if (!f0) return P.json(404, { error: 'Eign fannst ekki' });
    const svor = {};
    Object.keys(b.svor && typeof b.svor === 'object' ? b.svor : {}).slice(0, 30).forEach((k) => {
      if (!/^\d{1,2}$/.test(k)) return;
      const v = b.svor[k] || {};
      const n = ['ja', 'nei', 'na'].includes(v.n) ? v.n : null;
      const a = String(v.a || '').trim().slice(0, 500);
      if (n || a) svor[k] = { n: n, a: a };
    });
    const undirrita = b.stada === 'undirritad';
    const nafn = String(b.undirritad_af || '').trim().slice(0, 120);
    if (undirrita && !nafn) return P.json(400, { error: 'Nafn þess sem undirritar vantar' });
    const hofundur = (session ? session.name : (openAcct && openAcct.display_name)) || 'þjónustuvefur';
    try {
      const er0 = await P.sbGet(`eldvarnabok?fyrirtaeki_id=eq.${sid}&manudur=eq.${manudur}&select=id,stada&limit=1`);
      if (!er0.ok) return P.json(503, { error: 'Eldvarnabók ekki tiltæk' });
      const til = (await er0.json())[0] || null;
      if (til && til.stada === 'undirritad') return P.json(409, { error: 'Mánuðurinn er þegar undirritaður' });
      const nuIso = new Date().toISOString();
      const rod = { svor, stada: undirrita ? 'undirritad' : 'drog', updated_at: nuIso, updated_by: hofundur };
      if (undirrita) { rod.undirritad_af = nafn; rod.undirritad_at = nuIso; }
      const w = til
        ? await P.sbPatch(`eldvarnabok?id=eq.${til.id}&stada=eq.drog`, rod)
        : await P.sbPost('eldvarnabok', Object.assign({ fyrirtaeki_id: sid, customer_base_id: baseId, manudur }, rod));
      if (!w.ok) return P.json(w.status, { error: 'Vistun mistókst', detail: (await w.text()).slice(0, 300) });
      let row = (await w.json())[0] || null;
      if (!row) return P.json(409, { error: 'Mánuðurinn var undirritaður á meðan — opnaðu hann aftur' });
      // Frávik → mál á Þjónustuborði (eitt per undirritun), sama 25/klst. þak og önnur erindi.
      let mal = null;
      const nei = Object.keys(svor).filter((k) => svor[k].n === 'nei');
      if (undirrita && nei.length) {
        try {
          const since = new Date(Date.now() - 3600e3).toISOString();
          const cr = await P.sbGet(`thjonustubeidni?source=eq.gatt&customer_base_id=eq.${baseId}&created_at=gte.${encodeURIComponent(since)}&select=id`);
          if ((cr.ok ? (await cr.json()).length : 0) < 25) {
            const lidir = Array.isArray(b.fravik) ? b.fravik : [];
            const lina = (k) => {
              const l = lidir.find((x) => String(x && x.nr) === k) || {};
              return '• Liður ' + k + (l.lidur ? ' — ' + String(l.lidur).slice(0, 160) : '') + (svor[k].a ? ': ' + svor[k].a : '');
            };
            const man = MAN_IS[mn - 1] + ' ' + ar;
            const mr0 = await P.sbPost('thjonustubeidni', {
              customer_base_id: baseId, customer_nafn: nafn || hofundur, fyrirtaeki_id: sid,
              title: 'Eldvarnabók — frávik í ' + man + ' af þjónustuvef — ' + (f0.nafn || ''),
              notes: 'Eigið eftirlit (eldvarnabók) undirritað af ' + nafn + '. Frávik:\n' + nei.map(lina).join('\n'),
              source: 'gatt', type: 'annad', flokkur: 'thjonusta', status: 'nytt', priority: 'venjulegur',
              created_by: 'þjónustuvefur', tags: ['gatt', 'eldvarnabok'],
            });
            if (mr0.ok) {
              mal = ((await mr0.json())[0] || {}).id || null;
              if (mal) { const p2 = await P.sbPatch(`eldvarnabok?id=eq.${row.id}`, { erindi_id: mal }); if (p2.ok) row = (await p2.json())[0] || row; }
            }
          }
        } catch (_) {}
      }
      return P.json(200, { ok: true, mal, rod: { fid: row.fyrirtaeki_id, manudur: String(row.manudur).slice(0, 7), svor: row.svor || {}, stada: row.stada,
        undirritad_af: row.undirritad_af || null, undirritad_at: row.undirritad_at || null, uppf: row.updated_at, erindi: row.erindi_id || null } });
    } catch (e) { return P.json(500, { error: String((e && e.message) || e) }); }
  }

  const hofundurNafn = () => (session ? session.name : (openAcct && openAcct.display_name)) || 'þjónustuvefur';
  // Eign félagsins (fyrirtaeki-röð undir base_id) — eða null. Allar skrif-aðgerðir byrja hér.
  async function eignFelags(sid, sel) {
    if (!sid) return null;
    if (leyfd && !leyfd.has(Number(sid))) return null;
    const r = await P.sbGet(`fyrirtaeki?id=eq.${sid}&${BF('customer_base_id')}&deleted_at=is.null&select=${sel || 'id,nafn,heimilisfang'}&limit=1`);
    return r.ok ? ((await r.json())[0] || null) : null;
  }
  async function malAKlst() {
    const since = new Date(Date.now() - 3600e3).toISOString();
    const cr = await P.sbGet(`thjonustubeidni?source=eq.gatt&customer_base_id=eq.${baseId}&created_at=gte.${encodeURIComponent(since)}&select=id`);
    return cr.ok ? (await cr.json()).length : 99;
  }

  // ── Verkbeiðni sem punktur á teikningu (eða án punkts) með mynd ───────────
  // Kúnninn velur hæð, smellir á teikninguna og lýsir verkinu. Punkturinn er í frumdílum myndarinnar (sama
  // hnitakerfi og merkin). abyrgd segir hver gerir: okkar (Slökkvitæki), eigandi (hann sjálfur) eða annar.
  async function vistaPunkt(b) {
    if (!syn.verkbeidni && !syn.punktar) return P.json(403, { error: 'Verkbeiðnir eru ekki opnar á þessum aðgangi' });
    const sid = parseInt(b.site_id, 10);
    const f0 = await eignFelags(sid);
    if (!f0) return P.json(404, { error: 'Eign fannst ekki' });
    const titill = String(b.titill || '').trim().slice(0, 120);
    const lysing = String(b.lysing || '').trim().slice(0, 2000);
    if (!titill && !lysing) return P.json(400, { error: 'Lýstu verkinu' });
    const abyrgd = ABYRGD.includes(b.abyrgd) ? b.abyrgd : 'okkar';
    let punktur = null;
    if (b.punktur && typeof b.punktur === 'object' && isFinite(+b.punktur.x) && isFinite(+b.punktur.y)) {
      const haed = parseInt(b.punktur.haed, 10);
      const tr = await P.sbGet(`teikning_bord?company_id=eq.${sid}&select=haedir,image_url&limit=1`);
      const t = tr.ok ? (await tr.json())[0] : null;
      const hs = t ? (Array.isArray(t.haedir) && t.haedir.length ? t.haedir : (t.image_url ? [{ nafn: 'Teikning' }] : [])) : [];
      if (!(haed >= 0 && haed < hs.length)) return P.json(400, { error: 'Hæð fannst ekki á teikningu' });
      punktur = { haed, nafn: String((hs[haed] && hs[haed].nafn) || ('Hæð ' + (haed + 1))).slice(0, 60), x: Math.round(+b.punktur.x), y: Math.round(+b.punktur.y) };
    }
    if ((await malAKlst()) >= 25) return P.json(429, { error: 'Of margar beiðnir á klukkustund — reyndu aftur síðar' });
    const myndir = [];
    if (b.mynd) {
      const m = M.lesaDataUrl(b.mynd, 6 * 1024 * 1024);
      if (!m || !/^image\//.test(m.mime)) return P.json(400, { error: 'Myndin er ekki á studdu sniði (JPEG/PNG/WebP, mest 6 MB)' });
      const path = `verkbeidnir/${baseId}/${sid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${m.ext}`;
      if (!(await M.hlada(path, m.buf, m.mime))) return P.json(502, { error: 'Myndin vistaðist ekki' });
      myndir.push({ path, w: +b.mynd_w || null, h: +b.mynd_h || null, at: new Date().toISOString() });
    }
    const hofundur = hofundurNafn();
    const stad = punktur ? punktur.nafn + ' — merkt á teikningu' : (String(b.stadsetning || '').trim().slice(0, 200) || '');
    const ABL = { okkar: 'Slökkvitæki ehf. lagar', eigandi: 'Eigandi sér um sjálfur (verkefni á borði kúnna)', annar: 'Annar verktaki sér um' };
    const notes = (lysing ? lysing + '\n' : '') + (stad ? 'Staðsetning: ' + stad + '\n' : '') + 'Ábyrgð: ' + ABL[abyrgd] + (myndir.length ? '\nMynd fylgir (sjá spjald).' : '');
    const tags = ['gatt', abyrgd === 'okkar' ? 'verkbeidni' : 'verkefni'];
    if (punktur) tags.push('punktur');
    const mr = await P.sbPost('thjonustubeidni', {
      customer_base_id: baseId, customer_nafn: hofundur, fyrirtaeki_id: sid,
      title: (titill || 'Verkbeiðni') + ' af þjónustuvef — ' + (f0.nafn || ''), summary: lysing || titill, notes,
      source: 'gatt', type: 'annad', flokkur: 'thjonusta', status: 'nytt', priority: 'venjulegur', created_by: 'þjónustuvefur',
      tags, punktur, myndir, abyrgd,
    });
    if (!mr.ok) return P.json(mr.status, { error: 'Vistun mistókst', detail: (await mr.text()).slice(0, 300) });
    const row = (await mr.json())[0];
    // Skilaboðaþráðurinn fær eina línu svo starfsfólk sjái það líka undir Skilaboð
    try { await P.sbPost('portal_messages', { base_id: baseId, sender: 'kunni', author_name: hofundur, body: (abyrgd === 'okkar' ? 'Verkbeiðni' : 'Verkefni') + ' — ' + (f0.nafn || '') + (punktur ? ' (' + punktur.nafn + ', merkt á teikningu)' : '') + '\n' + (titill ? titill + '\n' : '') + (lysing || '') }); } catch (_) {}
    const slod = await M.undirrita(myndaSlodir([row]), 600);
    return P.json(200, { ok: true, erindi: erindiRod(row, slod) });
  }

  // ── Kúnni klárar eigið verkefni (abyrgd eigandi/annar) með eftirmynd ──────
  async function lokaVerki(b) {
    const id = parseInt(b.id, 10);
    if (!id) return P.json(400, { error: 'id vantar' });
    const r0 = await P.sbGet(`thjonustubeidni?id=eq.${id}&${BF('customer_base_id')}&deleted_at=is.null&select=${ERINDI_SEL}&limit=1`);
    const row0 = r0.ok ? (await r0.json())[0] : null;
    if (!row0) return P.json(404, { error: 'Verkið fannst ekki' });
    if (row0.abyrgd === 'okkar') return P.json(403, { error: 'Þetta verk lokar Slökkvitæki ehf. þegar því er lokið' });
    if (['klarad', 'lokad'].includes(row0.status)) return P.json(409, { error: 'Verkinu er þegar lokið' });
    const eftir = Array.isArray(row0.eftirmyndir) ? row0.eftirmyndir.slice() : [];
    if (b.mynd) {
      const m = M.lesaDataUrl(b.mynd, 6 * 1024 * 1024);
      if (!m || !/^image\//.test(m.mime)) return P.json(400, { error: 'Myndin er ekki á studdu sniði' });
      const path = `verkbeidnir/${baseId}/${row0.fyrirtaeki_id || 0}/${Date.now()}-eftir-${Math.random().toString(36).slice(2, 8)}.${m.ext}`;
      if (!(await M.hlada(path, m.buf, m.mime))) return P.json(502, { error: 'Myndin vistaðist ekki' });
      eftir.push({ path, w: +b.mynd_w || null, h: +b.mynd_h || null, at: new Date().toISOString(), af: hofundurNafn() });
    }
    const nu = new Date().toISOString();
    const pr = await P.sbPatch(`thjonustubeidni?id=eq.${id}&select=${ERINDI_SEL}`, {
      // 'lokad' = sama gildi og ✓ Lokið á Þjónustuborðinu (368 done()) — þá dettur málið af borðinu
      status: 'lokad', lokid_at: nu, lokid_af: hofundurNafn(), lokid_lysing: String(b.lysing || '').trim().slice(0, 1000) || null, eftirmyndir: eftir, updated_at: nu });
    if (!pr.ok) return P.json(pr.status, { error: 'Vistun mistókst' });
    const row = (await pr.json())[0];
    const slod = await M.undirrita(myndaSlodir([row]), 600);
    return P.json(200, { ok: true, erindi: erindiRod(row, slod) });
  }

  // ── Ánægjukönnun (12.10.2026): kúnni gefur okkar verki stjörnur 1–5 þegar því er lokið — má breyta, ein athugasemd ──
  async function gefaEinkunn(b) {
    if (!syn.einkunn) return P.json(403, { error: 'Ánægjukönnun er ekki opin á þessum aðgangi' });
    const id = parseInt(b.id, 10), st = parseInt(b.stjornur, 10);
    if (!id || !(st >= 1 && st <= 5)) return P.json(400, { error: 'Stjörnur 1–5 vantar' });
    const r0 = await P.sbGet(`thjonustubeidni?id=eq.${id}&${BF('customer_base_id')}&deleted_at=is.null&select=${ERINDI_SEL}&limit=1`);
    const row0 = r0.ok ? (await r0.json())[0] : null;
    if (!row0) return P.json(404, { error: 'Verkið fannst ekki' });
    if ((row0.abyrgd || 'okkar') !== 'okkar') return P.json(403, { error: 'Einkunn er aðeins gefin fyrir verk Slökkvitækja ehf.' });
    if (!['klarad', 'lokad'].includes(row0.status)) return P.json(409, { error: 'Verkinu er ekki lokið enn' });
    const ath = String(b.ath || '').trim().slice(0, 300) || (b.ath === undefined ? row0.einkunn_ath : null);
    const pr = await P.sbPatch(`thjonustubeidni?id=eq.${id}&select=${ERINDI_SEL}`, { einkunn: st, einkunn_ath: ath || null, einkunn_at: new Date().toISOString() });
    if (!pr.ok) return P.json(pr.status, { error: 'Vistun mistókst' });
    const row = (await pr.json())[0];
    const slod = await M.undirrita(myndaSlodir([row]), 600);
    return P.json(200, { ok: true, erindi: erindiRod(row, slod) });
  }

  // ── Hnit eignar (kortið): vistuð í fyrirtaeki.eign.hnit — aðeins innan Íslands ──
  async function vistaHnit(b) {
    const sid = parseInt(b.site_id, 10), lat = +b.lat, lng = +b.lng;
    if (!innanIslands(lat, lng)) return P.json(400, { error: 'Hnit utan Íslands' });
    const f0 = await eignFelags(sid, 'id,eign');
    if (!f0) return P.json(404, { error: 'Eign fannst ekki' });
    const eign = Object.assign({}, f0.eign && typeof f0.eign === 'object' ? f0.eign : {}, { hnit: { lat: +lat.toFixed(6), lng: +lng.toFixed(6), uppruni: String(b.uppruni || 'gatt').slice(0, 30) } });
    const pr = await P.sbPatch(`fyrirtaeki?id=eq.${sid}&select=id`, { eign });
    return pr.ok ? P.json(200, { ok: true, hnit: eign.hnit }) : P.json(pr.status, { error: 'Vistun mistókst' });
  }

  // ── Bæta við eign úr Landeignaskrá HMS (landnr.js hefur þegar leitað) ──────
  // Nýr staður félagsins UTAN þjónustu með eign-upplýsingum (landnr/heitinr/hnit) — sama leið og Reitis-eignirnar
  // 11.10.2026. Engin tvítekning á (félag, landnr) eða sama heimilisfangi; hámark 30 á klukkustund.
  async function nyEign(b) {
    if (!syn.baeta_eign) return P.json(403, { error: 'Ekki opið á þessum aðgangi' });
    const landnr = parseInt(b.landnr, 10), heitinr = parseInt(b.heitinr, 10) || null;
    const label = String(b.label || '').trim().slice(0, 160);
    if (!landnr || !label) return P.json(400, { error: 'Veldu heimilisfang úr listanum' });
    // „Skútuvogur 4  (104) - L 105166" → heiti + póstnúmer
    const lm = /^(.*?)\s*\((\d{3})\)/.exec(label);
    const heiti = (lm ? lm[1] : label.replace(/\s*-\s*L\s*\d+$/, '')).trim();
    const postnr = lm ? lm[2] : (String(b.postnr || '').match(/^\d{3}$/) || [])[0] || null;
    const allir = await P.sbGet(`fyrirtaeki?${BF('customer_base_id')}&deleted_at=is.null&select=id,nafn,heimilisfang,stadur_nr,eign`);
    const L = allir.ok ? await allir.json() : [];
    const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const tvi = L.find((f) => (f.eign && +f.eign.landnr === landnr) || norm(f.heimilisfang).indexOf(norm(heiti)) === 0);
    if (tvi) return P.json(409, { error: 'Eignin er þegar á listanum: ' + (tvi.nafn || tvi.heimilisfang), id: tvi.id });
    const since = new Date(Date.now() - 3600e3).toISOString();
    if (L.filter((f) => f.eign && f.eign.uppruni === 'gatt' && f.eign.skrad_at > since).length >= 30) return P.json(429, { error: 'Of margar eignir á klukkustund' });
    // Hnit, póstnúmer og sveitarfélag úr Staðfangaskrá (fasteign-opin) — fellur þegjandi ef þjónustan svarar ekki
    let hnit = null, svf = '', pn = postnr;
    try {
      const q = heitinr ? 'heitinr=' + heitinr : 'heimilisfang=' + encodeURIComponent(heiti + (postnr ? ', ' + postnr : ''));
      const fo = await fetch(origin(event) + '/.netlify/functions/fasteign-opin?' + q, { signal: AbortSignal.timeout(9000) });
      if (fo.ok) {
        const j = await fo.json();
        if (j && j.eign && innanIslands(+j.eign.lat, +j.eign.lon)) hnit = { lat: +(+j.eign.lat).toFixed(6), lng: +(+j.eign.lon).toFixed(6), uppruni: 'stadfangaskra' };
        if (j && j.eign && j.eign.postnr) pn = pn || String(j.eign.postnr);
        if (j && j.eign && j.eign.svfnr) svf = String(j.eign.svfnr);
      }
    } catch (_) {}
    const POST = { '101': 'Reykjavík', '102': 'Reykjavík', '103': 'Reykjavík', '104': 'Reykjavík', '105': 'Reykjavík', '107': 'Reykjavík', '108': 'Reykjavík', '109': 'Reykjavík', '110': 'Reykjavík', '111': 'Reykjavík', '112': 'Reykjavík', '113': 'Reykjavík', '116': 'Reykjavík',
      '170': 'Seltjarnarnes', '200': 'Kópavogur', '201': 'Kópavogur', '202': 'Kópavogur', '203': 'Kópavogur', '210': 'Garðabær', '220': 'Hafnarfjörður', '221': 'Hafnarfjörður', '225': 'Garðabær', '270': 'Mosfellsbær', '600': 'Akureyri', '603': 'Akureyri' };
    const stadur = pn ? pn + (POST[pn] ? ' ' + POST[pn] : '') : '';
    const nr = L.reduce((m, f) => Math.max(m, +f.stadur_nr || 0), 0) + 1;
    const ins = await P.sbPost('fyrirtaeki', {
      customer_base_id: baseId, nafn: heiti, heimilisfang: heiti + (stadur ? ', ' + stadur : ''), postnumer: pn || null, stadur_nr: nr,
      er_i_thjonustu: false, status: 'virkur',
      eign: { landnr, heitinr, hnit, svfnr: svf || null, uppruni: 'gatt', skrad_at: new Date().toISOString(), skrad_af: hofundurNafn(), heimild: 'Landeignaskrá HMS' },
    });
    if (!ins.ok) return P.json(ins.status, { error: 'Vistun mistókst', detail: (await ins.text()).slice(0, 300) });
    const row = (await ins.json())[0];
    return P.json(200, { ok: true, eign: { id: row.id, nafn: row.nafn, heimilisfang: row.heimilisfang, eign: row.eign, beidni: false, kerfi: [], flokkun: null, teikning: null } });
  }

  // ── Vinnusvæði: skjöl og hlekkir á borði kúnnans (portal_items) ───────────
  async function itemsFelags() {
    const r = await P.sbGet(`portal_items?base_id=eq.${baseId}&select=id,tegund,heiti,url,path,staerd,mime,rod,created_at&order=rod.asc,created_at.asc`);
    const L = r.ok ? await r.json() : [];
    const slod = await M.undirrita(L.map((x) => x.path), 600);
    return L.map((x) => ({ id: x.id, tegund: x.tegund, heiti: x.heiti, url: x.tegund === 'hlekkur' ? x.url : (slod[x.path] || null), staerd: x.staerd, mime: x.mime, rod: x.rod, dags: x.created_at }));
  }
  async function vistaItem(b) {
    if (!syn.vinnusvaedi) return P.json(403, { error: 'Vinnusvæðið er ekki opið á þessum aðgangi' });
    const cnt = await P.sbGet(`portal_items?base_id=eq.${baseId}&select=id`);
    if (cnt.ok && (await cnt.json()).length >= 200) return P.json(429, { error: 'Borðið er fullt (200 atriði)' });
    const heiti = M.nafnOruggt(b.heiti);
    let rod = Date.now();
    if (b.tegund === 'hlekkur') {
      let u; try { u = new URL(String(b.url || '').trim()); } catch (_) { return P.json(400, { error: 'Ógild slóð' }); }
      if (!/^https?:$/.test(u.protocol)) return P.json(400, { error: 'Aðeins http(s)-slóðir' });
      const ins = await P.sbPost('portal_items', { base_id: baseId, tegund: 'hlekkur', heiti: heiti === 'skjal' ? u.hostname : heiti, url: u.href.slice(0, 1000), rod, created_by: hofundurNafn() });
      if (!ins.ok) return P.json(ins.status, { error: 'Vistun mistókst' });
    } else {
      const m = M.lesaDataUrl(b.gogn, 12 * 1024 * 1024);
      if (!m) return P.json(400, { error: 'Skráin er ekki á studdu sniði (PDF, mynd, Word, Excel, texti — mest 12 MB)' });
      const path = `skjol/${baseId}/${Date.now()}-${heiti.replace(/[^A-Za-z0-9._-]+/g, '_')}` + (new RegExp('\\.' + m.ext + '$', 'i').test(heiti) ? '' : '.' + m.ext);
      if (!(await M.hlada(path, m.buf, m.mime))) return P.json(502, { error: 'Skráin vistaðist ekki' });
      const ins = await P.sbPost('portal_items', { base_id: baseId, tegund: 'skjal', heiti, path, staerd: m.buf.length, mime: m.mime, rod, created_by: hofundurNafn() });
      if (!ins.ok) return P.json(ins.status, { error: 'Vistun mistókst' });
    }
    return P.json(200, { ok: true, items: await itemsFelags() });
  }
  async function eydaItem(b) {
    const id = parseInt(b.id, 10);
    const r0 = await P.sbGet(`portal_items?id=eq.${id}&base_id=eq.${baseId}&select=id,path&limit=1`);
    const x = r0.ok ? (await r0.json())[0] : null;
    if (!x) return P.json(404, { error: 'Fannst ekki' });
    await fetch(`${P.SUPABASE_URL}/rest/v1/portal_items?id=eq.${id}&base_id=eq.${baseId}`, { method: 'DELETE', headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}` } });
    if (x.path) { try { await M.eyda([x.path]); } catch (_) {} }
    return P.json(200, { ok: true, items: await itemsFelags() });
  }
  async function radaItems(b) {
    const ids = (Array.isArray(b.ids) ? b.ids : []).map((x) => parseInt(x, 10)).filter(Boolean).slice(0, 200);
    for (let i = 0; i < ids.length; i++) await P.sbPatch(`portal_items?id=eq.${ids[i]}&base_id=eq.${baseId}`, { rod: i + 1 });
    return P.json(200, { ok: true, items: await itemsFelags() });
  }

  // ── Checklisti kúnnans (portal_checklist) — Mitt vinnusvæði, 11.10.2026 ──
  async function checklistFelags() {
    const r = await P.sbGet(`portal_checklist?base_id=eq.${baseId}&select=id,texti,stjarna,lokid_at,rod,created_at&order=rod.asc,created_at.asc&limit=400`);
    return r.ok ? (await r.json()).map((x) => ({ id: x.id, texti: x.texti, stjarna: !!x.stjarna, lokid: x.lokid_at || null, rod: x.rod, dags: x.created_at })) : [];
  }
  async function checklist(b) {
    if (!syn.vinnusvaedi) return P.json(403, { error: 'Vinnusvæðið er ekki opið á þessum aðgangi' });
    const id = parseInt(b.id, 10), hd = { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}` };
    const eigin = `base_id=eq.${baseId}`;
    if (b.action === 'chk_add') {
      const texti = String(b.texti || '').trim().slice(0, 500);
      if (!texti) return P.json(400, { error: 'Tómt atriði' });
      const cnt = await P.sbGet(`portal_checklist?${eigin}&select=id`);
      if (cnt.ok && (await cnt.json()).length >= 400) return P.json(429, { error: 'Listinn er fullur (400 atriði)' });
      // 12.10.2026: `rod` er INTEGER (int4, hámark 2.147.483.647) — Date.now() er ~1,79e12 og
      // Postgres hafnaði hverju einasta atriði (22003) → „Vistun mistókst" á öllum listum.
      // Sekúndur frá 1970 (~1,79e9) raðast eins og passa til 2038.
      const ins = await P.sbPost('portal_checklist', { base_id: baseId, texti, rod: Math.floor(Date.now() / 1000), created_by: hofundurNafn() });
      if (!ins.ok) { const t = await ins.text().catch(() => ''); console.error('[gatt] chk_add mistókst', ins.status, t.slice(0, 300)); return P.json(ins.status, { error: 'Vistun mistókst' }); }
    } else if (b.action === 'chk_toggle' && id) {
      await P.sbPatch(`portal_checklist?id=eq.${id}&${eigin}`, { lokid_at: b.lokid ? new Date().toISOString() : null });
    } else if (b.action === 'chk_stjarna' && id) {
      await P.sbPatch(`portal_checklist?id=eq.${id}&${eigin}`, { stjarna: !!b.stjarna });
    } else if (b.action === 'chk_texti' && id) {
      const texti = String(b.texti || '').trim().slice(0, 500);
      if (texti) await P.sbPatch(`portal_checklist?id=eq.${id}&${eigin}`, { texti });
    } else if (b.action === 'chk_eyda' && id) {
      await fetch(`${P.SUPABASE_URL}/rest/v1/portal_checklist?id=eq.${id}&${eigin}`, { method: 'DELETE', headers: hd });
    } else if (b.action === 'chk_hreinsa') {
      await fetch(`${P.SUPABASE_URL}/rest/v1/portal_checklist?${eigin}&lokid_at=not.is.null`, { method: 'DELETE', headers: hd });
    } else if (b.action === 'chk_roda') {
      const ids = (Array.isArray(b.ids) ? b.ids : []).map((x) => parseInt(x, 10)).filter(Boolean).slice(0, 400);
      for (let i = 0; i < ids.length; i++) await P.sbPatch(`portal_checklist?id=eq.${ids[i]}&${eigin}`, { rod: i + 1 });
    } else return P.json(400, { error: 'Óþekkt aðgerð' });
    return P.json(200, { ok: true, checklist: await checklistFelags() });
  }

  // ── Kerfi skráð af kúnna (stadur_kerfi) — 12.10.2026 (Agnar: „opna á það að maður geti skráð þær upplýsingar þarna") ──
  //    Kúnninn segir hvort kerfi er til staðar, hver þjónustar það og athugasemd. Skrifað í SÖMU töflu og spjaldið
  //    „Kerfi og þjónusta" í appinu les (450) — röðin verður handvirk (gikkur), skrad_af = Þjónustuvefur · notandi.
  //    Aldrei verð/visbending/tækifæri: þeir dálkar eru ekki snertir. ÓVITAÐ-tækifærið (c) hverfur um leið og kúnninn svarar.
  const KERFI_LEYFD = ['slokkvitaeki', 'slongukefli', 'reykskynjarar', 'brunavidvorunarkerfi', 'vatnsudakerfi', 'neydarlysing', 'utljos',
    'reyklosun', 'eldvarnarteppi', 'brunathettingar', 'eldvarnaeftirlit', 'slokkvikerfi_eldhus', 'rymingaruppdrattur', 'fjoldaskilti'];
  async function skraKerfi(b) {
    if (!syn.kerfi) return P.json(403, { error: 'Kerfin eru ekki opin á þessum aðgangi' });
    const sid = parseInt(b.site_id, 10), f0 = await eignFelags(sid, 'id,nafn');
    if (!f0) return P.json(404, { error: 'Eign fannst ekki' });
    const kerfi = String(b.kerfi || '');
    if (!KERFI_LEYFD.includes(kerfi)) return P.json(400, { error: 'Óþekkt kerfi' });
    const til = ['ja', 'nei', 'ovitad'].includes(b.til) ? b.til : null;
    const adili = ['okkar', 'annar', 'enginn'].includes(b.adili) ? b.adili : null;
    const nafn = String(b.adili_nafn || '').trim().slice(0, 80);
    const ath = String(b.ath || '').trim().slice(0, 300);
    if (!til && !adili && !ath) return P.json(400, { error: 'Ekkert til að skrá' });
    const hver = hofundurNafn(), dags = new Date().toISOString().slice(0, 10);
    const ex0 = await P.sbGet(`stadur_kerfi?fyrirtaeki_id=eq.${sid}&kerfi=eq.${kerfi}&select=fyrirtaeki_id,athugasemd,thjonustuadili,til_stadar`);
    const ex = ex0.ok ? (await ex0.json())[0] || null : null;
    const patch = { skrad_af: 'Þjónustuvefur · ' + hver, heimild: 'thjonustuvefur', uppruni: 'handvirkt' };
    if (til) patch.til_stadar = til;
    if (adili === 'okkar') patch.thjonustuadili = 'okkar — skráð á þjónustuvef';
    else if (adili === 'annar') patch.thjonustuadili = nafn || 'Annar aðili (skráð á þjónustuvef)';
    else if (adili === 'enginn') patch.thjonustuadili = null;
    if (ath) patch.athugasemd = ((ex && ex.athugasemd) ? ex.athugasemd + '\n' : '') + 'Þjónustuvefur ' + dags + ' (' + hver + '): ' + ath;
    const w = ex
      ? await P.sbPatch(`stadur_kerfi?fyrirtaeki_id=eq.${sid}&kerfi=eq.${kerfi}`, patch)
      : await P.sbPost('stadur_kerfi', Object.assign({ fyrirtaeki_id: sid, kerfi, til_stadar: til || 'ovitad' }, patch));
    if (!w.ok) { const t = await w.text().catch(() => ''); console.error('[gatt] kerfi_skra mistókst', w.status, t.slice(0, 300)); return P.json(w.status, { error: 'Vistun mistókst' }); }
    const ta = patch.thjonustuadili !== undefined ? patch.thjonustuadili : (ex ? ex.thjonustuadili : null);
    return P.json(200, { ok: true, kerfi: { k: kerfi, til: patch.til_stadar || (ex ? ex.til_stadar : 'ovitad'), adili: /^okkar/i.test(String(ta || '')) ? 'okkar' : (ta ? 'annar' : null) } });
  }

  // ── Viðbótartól (portal_skrar) — 12.10.2026: verktakar, rými/leigutakar, lyklar, orkumælar + álestrar, kostnaðarfærslur ──
  // Ein tafla, tegund + gogn jsonb; hver tegund hlýðir sínum rofa í verkfæraskránni. Þjónninn geymir aðeins hreinsuð gögn
  // (strengir ≤ 400, tölur, já/nei, ≤ 30 lyklar) — hvað lyklarnir þýða ræður gatt/vidbot.js.
  const SKRAR_TEG = { verktaki: 'verktakar', rymi: 'rymi', lykill: 'lyklar', maelir: 'orkumaelar', alestur: 'orkumaelar', kostnadur: 'kostnadur' };
  function hreinsaGogn(inn) {
    const out = {}; if (!inn || typeof inn !== 'object') return out;
    Object.keys(inn).slice(0, 30).forEach((k) => {
      if (!/^[a-z_0-9]{1,30}$/.test(k)) return;
      const v = inn[k];
      if (typeof v === 'string') { const t = v.trim().slice(0, 400); if (t) out[k] = t; }
      else if (typeof v === 'number' && isFinite(v)) out[k] = v;
      else if (typeof v === 'boolean') out[k] = v;
    });
    return out;
  }
  async function skrarFelags() {
    const r = await P.sbGet(`portal_skrar?base_id=eq.${baseId}&select=id,tegund,fyrirtaeki_id,foreldri_id,gogn,mynd_path,rod,created_at,updated_at&order=created_at.asc&limit=3000`);
    const L = (r.ok ? await r.json() : []).filter((x) => syn[SKRAR_TEG[x.tegund]]);
    const slod = await M.undirrita(L.map((x) => x.mynd_path), 600);
    return L.map((x) => ({ id: x.id, tegund: x.tegund, fid: x.fyrirtaeki_id, foreldri: x.foreldri_id, gogn: x.gogn && typeof x.gogn === 'object' ? x.gogn : {},
      mynd: x.mynd_path ? (slod[x.mynd_path] || null) : null, rod: x.rod, dags: x.created_at, uppf: x.updated_at }));
  }
  // Takmarkaður notandi (eignir[]) sér aðeins raðir sinna eigna; álestur fylgir mælinum
  function skrarSia(L) {
    if (!leyfd) return L;
    const ok = new Set(L.filter((x) => x.fid == null || leyfd.has(Number(x.fid))).map((x) => x.id));
    return L.filter((x) => ok.has(x.id) && (x.foreldri == null || ok.has(x.foreldri)));
  }
  async function skrar(b) {
    const hd = { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}` }, eigin = `base_id=eq.${baseId}`, nu = new Date().toISOString();
    const teg = String(b.tegund || ''), id = parseInt(b.id, 10);
    const svar = async () => P.json(200, { ok: true, skrar: skrarSia(await skrarFelags()) });
    const lesaMynd = async (tegund) => {
      if (!b.mynd) return null;
      const m = M.lesaDataUrl(b.mynd, 6 * 1024 * 1024);
      if (!m || !/^image\//.test(m.mime)) throw new Error('Myndin er ekki á studdu sniði');
      const path = `skrar/${baseId}/${tegund}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${m.ext}`;
      if (!(await M.hlada(path, m.buf, m.mime))) throw new Error('Myndin vistaðist ekki');
      return path;
    };
    if (b.action === 'skra_add') {
      if (!SKRAR_TEG[teg]) return P.json(400, { error: 'Óþekkt tegund' });
      if (!syn[SKRAR_TEG[teg]]) return P.json(403, { error: 'Tólið er ekki opið á þessum aðgangi' });
      let sid = parseInt(b.site_id, 10) || null, foreldri = parseInt(b.foreldri_id, 10) || null;
      if (sid && !(await eignFelags(sid, 'id'))) return P.json(404, { error: 'Eign fannst ekki' });
      if (teg === 'alestur') {
        if (!foreldri) return P.json(400, { error: 'Mæli vantar' });
        const pr0 = await P.sbGet(`portal_skrar?id=eq.${foreldri}&${eigin}&tegund=eq.maelir&select=id,fyrirtaeki_id&limit=1`);
        const p0 = pr0.ok ? (await pr0.json())[0] : null; if (!p0) return P.json(404, { error: 'Mælirinn fannst ekki' });
        sid = p0.fyrirtaeki_id;
      } else foreldri = null;
      const cnt = await P.sbGet(`portal_skrar?${eigin}&select=id&limit=3001`);
      if (cnt.ok && (await cnt.json()).length >= 3000) return P.json(429, { error: 'Skráin er full (3000 línur)' });
      let mynd = null; try { mynd = (teg === 'alestur' || teg === 'maelir') ? await lesaMynd(teg) : null; } catch (e) { return P.json(400, { error: e.message }); }
      const ins = await P.sbPost('portal_skrar', { base_id: baseId, tegund: teg, fyrirtaeki_id: sid, foreldri_id: foreldri, gogn: hreinsaGogn(b.gogn), mynd_path: mynd, created_at: nu, updated_at: nu });
      if (!ins.ok) return P.json(ins.status, { error: 'Vistun mistókst' });
      return svar();
    }
    if (!id) return P.json(400, { error: 'id vantar' });
    const r0 = await P.sbGet(`portal_skrar?id=eq.${id}&${eigin}&select=id,tegund,fyrirtaeki_id,mynd_path&limit=1`);
    const x = r0.ok ? (await r0.json())[0] : null;
    if (!x) return P.json(404, { error: 'Línan fannst ekki' });
    if (!syn[SKRAR_TEG[x.tegund]]) return P.json(403, { error: 'Tólið er ekki opið á þessum aðgangi' });
    if (leyfd && x.fyrirtaeki_id != null && !leyfd.has(Number(x.fyrirtaeki_id))) return P.json(403, { error: 'Ekki þín eign' });
    if (b.action === 'skra_edit') {
      const patch = { updated_at: nu };
      if (b.gogn && typeof b.gogn === 'object') patch.gogn = hreinsaGogn(b.gogn);
      if (b.site_id !== undefined && x.tegund !== 'alestur') { const sid = parseInt(b.site_id, 10) || null; if (sid && !(await eignFelags(sid, 'id'))) return P.json(404, { error: 'Eign fannst ekki' }); patch.fyrirtaeki_id = sid; }
      if (b.mynd) { try { patch.mynd_path = await lesaMynd(x.tegund); } catch (e) { return P.json(400, { error: e.message }); } if (x.mynd_path) { try { await M.eyda([x.mynd_path]); } catch (_) {} } }
      const pr = await P.sbPatch(`portal_skrar?id=eq.${id}&${eigin}&select=id`, patch);
      if (!pr.ok) return P.json(pr.status, { error: 'Vistun mistókst' });
      return svar();
    }
    if (b.action === 'skra_eyda') {
      const cr = await P.sbGet(`portal_skrar?foreldri_id=eq.${id}&${eigin}&select=mynd_path`);
      const paths = [x.mynd_path].concat(cr.ok ? (await cr.json()).map((c) => c.mynd_path) : []).filter(Boolean);
      await fetch(`${P.SUPABASE_URL}/rest/v1/portal_skrar?id=eq.${id}&${eigin}`, { method: 'DELETE', headers: hd });
      if (paths.length) { try { await M.eyda(paths); } catch (_) {} }
      return svar();
    }
    return P.json(400, { error: 'Óþekkt aðgerð' });
  }

  // ── Viðhaldsáætlun og skírteini (portal_vidhald) — 12.10.2026 ──
  function dagsPlus(d, man) { const x = new Date(d + 'T00:00:00Z'); if (isNaN(x)) return null; x.setUTCMonth(x.getUTCMonth() + man); return x.toISOString().slice(0, 10); }
  function dagsOk(d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) ? String(d) : null; }
  async function vidhaldFelags() {
    const r = await P.sbGet(`portal_vidhald?base_id=eq.${baseId}&select=id,fyrirtaeki_id,kerfi,heiti,tidni_manudir,sidast,naest,abyrgd,skirteini_path,skirteini_heiti,gildir_til,minning_dagar,athugasemd,updated_at&order=naest.asc.nullslast,heiti.asc&limit=600`);
    const L = r.ok ? await r.json() : [];
    const slod = await M.undirrita(L.map((x) => x.skirteini_path), 600);
    return L.map((x) => ({ id: x.id, fid: x.fyrirtaeki_id, kerfi: x.kerfi, heiti: x.heiti, tidni: x.tidni_manudir, sidast: x.sidast, naest: x.naest, abyrgd: x.abyrgd,
      skirteini: x.skirteini_path ? { url: slod[x.skirteini_path] || null, heiti: x.skirteini_heiti || 'Skírteini' } : null, gildir_til: x.gildir_til, minning: x.minning_dagar, ath: x.athugasemd || '', uppf: x.updated_at }));
  }
  async function vidhald(b) {
    if (!syn.vinnusvaedi) return P.json(403, { error: 'Vinnusvæðið er ekki opið á þessum aðgangi' });
    const id = parseInt(b.id, 10), hd = { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}` }, eigin = `base_id=eq.${baseId}`, nu = new Date().toISOString();
    if (b.action === 'vh_add') {
      const rows = (Array.isArray(b.rows) ? b.rows : [b]).slice(0, 40);
      const cnt = await P.sbGet(`portal_vidhald?${eigin}&select=id`);
      if (cnt.ok && (await cnt.json()).length + rows.length > 600) return P.json(429, { error: 'Áætlunin er full' });
      for (const r of rows) {
        const sid = parseInt(r.site_id, 10); if (!sid || !(await eignFelags(sid, 'id'))) continue;
        const heiti = String(r.heiti || '').trim().slice(0, 120); if (!heiti) continue;
        const tidni = Math.min(120, Math.max(1, parseInt(r.tidni, 10) || 12)), sidast = dagsOk(r.sidast);
        const naest = sidast ? dagsPlus(sidast, tidni) : dagsOk(r.naest);
        await P.sbPost('portal_vidhald', { base_id: baseId, fyrirtaeki_id: sid, kerfi: String(r.kerfi || '').slice(0, 40) || null, heiti, tidni_manudir: tidni, sidast, naest,
          abyrgd: ABYRGD.includes(r.abyrgd) ? r.abyrgd : 'okkar', minning_dagar: Math.min(365, Math.max(0, parseInt(r.minning, 10) || 30)), athugasemd: String(r.ath || '').slice(0, 500) || null, created_by: hofundurNafn() });
      }
    } else if (b.action === 'vh_edit' && id) {
      const r0 = await P.sbGet(`portal_vidhald?id=eq.${id}&${eigin}&select=id,sidast,tidni_manudir&limit=1`);
      const x = r0.ok ? (await r0.json())[0] : null; if (!x) return P.json(404, { error: 'Fannst ekki' });
      const patch = { updated_at: nu };
      if (typeof b.heiti === 'string' && b.heiti.trim()) patch.heiti = b.heiti.trim().slice(0, 120);
      if (b.tidni != null) patch.tidni_manudir = Math.min(120, Math.max(1, parseInt(b.tidni, 10) || 12));
      if (b.sidast !== undefined) patch.sidast = dagsOk(b.sidast);
      if (ABYRGD.includes(b.abyrgd)) patch.abyrgd = b.abyrgd;
      if (b.minning != null) patch.minning_dagar = Math.min(365, Math.max(0, parseInt(b.minning, 10) || 0));
      if (typeof b.ath === 'string') patch.athugasemd = b.ath.slice(0, 500) || null;
      if (b.gildir_til !== undefined) patch.gildir_til = dagsOk(b.gildir_til);
      const sid2 = patch.sidast !== undefined ? patch.sidast : x.sidast, tid2 = patch.tidni_manudir || x.tidni_manudir;
      if (sid2) patch.naest = dagsPlus(sid2, tid2); else if (b.naest !== undefined) patch.naest = dagsOk(b.naest);
      await P.sbPatch(`portal_vidhald?id=eq.${id}&${eigin}`, patch);
    } else if (b.action === 'vh_gert' && id) {
      const r0 = await P.sbGet(`portal_vidhald?id=eq.${id}&${eigin}&select=id,tidni_manudir&limit=1`);
      const x = r0.ok ? (await r0.json())[0] : null; if (!x) return P.json(404, { error: 'Fannst ekki' });
      const d = dagsOk(b.dags) || new Date().toISOString().slice(0, 10);
      await P.sbPatch(`portal_vidhald?id=eq.${id}&${eigin}`, { sidast: d, naest: dagsPlus(d, x.tidni_manudir), updated_at: nu });
    } else if (b.action === 'vh_skirteini' && id) {
      const r0 = await P.sbGet(`portal_vidhald?id=eq.${id}&${eigin}&select=id,skirteini_path&limit=1`);
      const x = r0.ok ? (await r0.json())[0] : null; if (!x) return P.json(404, { error: 'Fannst ekki' });
      const patch = { updated_at: nu, gildir_til: dagsOk(b.gildir_til) };
      if (b.gogn) {
        const m = M.lesaDataUrl(b.gogn, 12 * 1024 * 1024);
        if (!m) return P.json(400, { error: 'Skráin er ekki á studdu sniði (PDF eða mynd, mest 12 MB)' });
        const heiti = M.nafnOruggt(b.heiti);
        const path = `skirteini/${baseId}/${Date.now()}-${heiti.replace(/[^A-Za-z0-9._-]+/g, '_')}` + (new RegExp('\\.' + m.ext + '$', 'i').test(heiti) ? '' : '.' + m.ext);
        if (!(await M.hlada(path, m.buf, m.mime))) return P.json(502, { error: 'Skráin vistaðist ekki' });
        patch.skirteini_path = path; patch.skirteini_heiti = heiti;
        if (x.skirteini_path) { try { await M.eyda([x.skirteini_path]); } catch (_) {} }
      }
      await P.sbPatch(`portal_vidhald?id=eq.${id}&${eigin}`, patch);
    } else if (b.action === 'vh_eyda' && id) {
      const r0 = await P.sbGet(`portal_vidhald?id=eq.${id}&${eigin}&select=id,skirteini_path&limit=1`);
      const x = r0.ok ? (await r0.json())[0] : null;
      if (x) { await fetch(`${P.SUPABASE_URL}/rest/v1/portal_vidhald?id=eq.${id}&${eigin}`, { method: 'DELETE', headers: hd }); if (x.skirteini_path) { try { await M.eyda([x.skirteini_path]); } catch (_) {} } }
    } else return P.json(400, { error: 'Óþekkt aðgerð' });
    return P.json(200, { ok: true, vidhald: await vidhaldFelags() });
  }

  // POST → viðskiptavinur sendir fyrirspurn / aðgerð
  if (event.httpMethod === 'POST') {
    let b; try { b = JSON.parse(event.body || '{}'); } catch { return P.json(400, { error: 'Ógilt JSON' }); }
    if (lesEingongu) return P.json(403, { error: 'Aðgangurinn er lesaðgangur — engar breytingar' });
    if (leigutaki && !['punktur', 'lokid', 'qr', undefined, ''].includes(b.action)) return P.json(403, { error: 'Ekki í boði fyrir leigutaka' });
    if (b.action === 'eldvarnabok') return vistaEldvarnabok(b);
    try {
      if (b.action === 'kerfi_skra') return await skraKerfi(b);
      if (b.action === 'punktur') return await vistaPunkt(b);
      if (b.action === 'lokid') return await lokaVerki(b);
      if (b.action === 'einkunn') return await gefaEinkunn(b);
      if (b.action === 'hnit') return await vistaHnit(b);
      if (b.action === 'ny_eign') return await nyEign(b);
      if (b.action === 'item') return await vistaItem(b);
      if (b.action === 'item_eyda') return await eydaItem(b);
      if (b.action === 'item_roda') return await radaItems(b);
      if (/^chk_/.test(String(b.action || ''))) return await checklist(b);
      if (/^vh_/.test(String(b.action || ''))) return await vidhald(b);
      if (/^skra_/.test(String(b.action || ''))) return await skrar(b);
      // Val kúnnans sjálfs (hvað sést í greiningu eignar o.þ.h.) → portal_users.stillingar (sameinað)
      if (b.action === 'stillingar') {
        const inn = b.stillingar && typeof b.stillingar === 'object' ? b.stillingar : {};
        const ny = Object.assign({}, acct && acct.stillingar && typeof acct.stillingar === 'object' ? acct.stillingar : {});
        if (inn.greining && typeof inn.greining === 'object') { const g = {}; ['eignin', 'bygging', 'brunavarnir', 'krofur', 'skjalasafn'].forEach((k) => { if (typeof inn.greining[k] === 'boolean') g[k] = inn.greining[k]; }); ny.greining = Object.assign({}, ny.greining || {}, g); }
        // 12.10.2026: tenglastika kúnnans á vinnusvæðinu — allt fylkið sent í hvert sinn (≤ 20, aðeins http/https)
        if (Array.isArray(inn.hlekkir)) {
          ny.hlekkir = inn.hlekkir.slice(0, 20).map((x) => ({ h: String((x && x.h) || '').trim().slice(0, 40), u: String((x && x.u) || '').trim().slice(0, 300) }))
            .filter((x) => x.h && /^https?:\/\/[^\s]+$/i.test(x.u));
        }
        // kúnninn felur sjálfur verkfæri sem hann notar ekki (aðeins þau sem við höfum kveikt á birtast til vals)
        if (inn.verkfaeri && typeof inn.verkfaeri === 'object') { const v = {}; VF.LYKLAR.forEach((k) => { if (typeof inn.verkfaeri[k] === 'boolean') v[k] = inn.verkfaeri[k]; }); ny.verkfaeri = Object.assign({}, ny.verkfaeri || {}, v); }
        const pr = await P.sbPatch(`portal_users?base_id=eq.${baseId}&active=eq.true&select=id`, { stillingar: ny });
        return pr.ok ? P.json(200, { ok: true, stillingar: ny }) : P.json(pr.status, { error: 'Vistun mistókst' });
      }
      if (b.action === 'qr') {
        const sid = parseInt(b.site_id, 10), f0 = await eignFelags(sid);
        if (!f0) return P.json(404, { error: 'Eign fannst ekki' });
        const tok = P.signQr(sid); if (!tok) return P.json(503, { error: 'QR-merki ekki uppsett' });
        return P.json(200, { ok: true, url: origin(event) + '/gatt/q/?t=' + tok, eign: { id: f0.id, nafn: f0.nafn, heimilisfang: f0.heimilisfang } });
      }
    } catch (e) { return P.json(500, { error: String((e && e.message) || e) }); }
    const text = String(b.body || '').trim();
    if (!text) return P.json(400, { error: 'Tómt skeyti' });
    if (text.length > 4000) return P.json(400, { error: 'Skeyti of langt' });
    const hofundur = (session ? session.name : (openAcct && openAcct.display_name)) || '';
    const kind = ['verkbeidni', 'thjonusta', 'gogn', 'reikningur', 'annad', 'pontun'].includes(b.kind) ? b.kind : 'fyrirspurn';
    try {
      const ins = await P.sbPost('portal_messages', { base_id: baseId, sender: 'kunni', body: text, author_name: hofundur });
      if (!ins.ok) return P.json(ins.status, { error: 'Villa', detail: await ins.text() });
      const row = (await ins.json())[0];
      // 22.10.2026 (generalprufa Center Hótel): fyrirspurnir og gagnabeiðnir urðu aldrei mál — engin staða, ekkert svar-merki,
      // engin flokkun. Nú verður HVERT erindi mál á Þjónustuborðinu (source 'gatt') með flokk (tags), eign, lýsingu og vísun í
      // reikning/skýrslu. Eignin er staðfest sem eign félagsins; í mesta lagi 25 mál á klst. per félag (opinn aðgangur er
      // án lykilorðs — skilaboðin fara samt alltaf).
      let mal = null, erindi = null;
      if (kind !== 'verkbeidni' || syn.verkbeidni) {
        try {
          let fyId = null, fyNafn = '';
          const sid = parseInt(b.site_id, 10);
          if (sid) {
            const fr0 = await P.sbGet(`fyrirtaeki?id=eq.${sid}&${BF('customer_base_id')}&select=id,nafn&limit=1`);
            const f0 = fr0.ok ? (await fr0.json())[0] : null;
            if (f0 && (!leyfd || leyfd.has(Number(f0.id)))) { fyId = f0.id; fyNafn = f0.nafn || ''; }
          }
          if ((await malAKlst()) < 25) {
            const KT = { fyrirspurn: 'Fyrirspurn', gogn: 'Gagnabeiðni', reikningur: 'Reikningur', annad: 'Annað', verkbeidni: 'Verkbeiðni', thjonusta: 'Beiðni um þjónustu', pontun: 'Pöntun' };
            const titillIn = String(b.titill || '').replace(/[\u2014\n]/g, ' ').trim().slice(0, 90);
            const lysing = String(b.lysing || '').trim().slice(0, 1500);
            const visun = visunHreint(b.visun);
            const mr0 = await P.sbPost('thjonustubeidni', {
              customer_base_id: baseId, customer_nafn: hofundur || null, fyrirtaeki_id: fyId,
              title: KT[kind] + (titillIn ? ' — ' + titillIn : '') + ' af þjónustuvef — ' + (fyNafn || 'almennt erindi'),
              summary: lysing || titillIn || null, notes: text, source: 'gatt',
              type: kind === 'gogn' ? 'skjalabeidni' : kind === 'thjonusta' ? 'skodun_tilbod' : 'annad',
              flokkur: kind === 'thjonusta' ? 'tilbod' : kind === 'reikningur' ? 'rukkun' : 'thjonusta',
              status: 'nytt', priority: 'venjulegur', created_by: 'þjónustuvefur', tags: ['gatt', kind], visun: visun.length ? visun : null,
            });
            if (mr0.ok) { const mrow = (await mr0.json())[0] || {}; mal = mrow.id || null; if (mal) erindi = erindiRod(mrow, {}); }
          }
        } catch (_) {}
      }
      return P.json(200, { ok: true, row, mal, erindi });
    } catch (e) { return P.json(500, { error: String((e && e.message) || e) }); }
  }

  try {
    // 1) Byggingar félagsins (í þjónustu) beint úr fyrirtaeki
    const fr = await P.sbGet(`fyrirtaeki?${BF('customer_base_id')}&deleted_at=is.null&select=id,nafn,heimilisfang,er_i_thjonustu,status,eign,stadur_nr,customer_base_id&order=nafn`);
    const sites = (fr.ok ? await fr.json() : []).filter((s) => !leyfd || leyfd.has(Number(s.id)));
    const siteIds = sites.map((s) => s.id);
    // ── 26.10.2026 (Agnar: „gáttin er leiðinlega lengi að opnast"): mælt 28 raðbundnar fyrirspurnir, 3,2 s af 4,0 s, þótt
    //    22 þeirra þurfi aðeins base/sites. Þær fara nú af stað SAMHLIÐA hér og hver kafli bíður síns loforðs (Q.*).
    //    Strengirnir eru óbreyttir — aðeins tímasetningin. Ekkert loforð er lesið tvisvar.
    const Q = (() => {
      const idsQ = siteIds.join(',');
      const filtQ = siteIds.length ? `or=(customer_base_id.in.(${baseIds.join(',')}),fyrirtaeki_id.in.(${siteIds.join(',')}))` : `${BF('customer_base_id')}`;
      const sinceQ = new Date(Date.now() - 4 * 365 * 864e5).toISOString();
      const d0q = new Date(); d0q.setUTCDate(1); d0q.setUTCMonth(d0q.getUTCMonth() - 12);
      const fraQ = d0q.toISOString().slice(0, 8) + '01';
      const fra3Q = new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 10);
      const ktsQ = hopur.kt.map((k) => String(k).replace(/\D/g, '')).filter((k) => k.length === 10).map((k) => k.slice(0, 6) + '-' + k.slice(6));
      const g = (qs) => P.sbGet(qs).catch((e) => ({ ok: false, _err: e }));
      return {
        stada: g(`v_stadir_skyrslu_stada?${BF('base_id')}&select=site_id,report_year,inspect_month,stada,total_devices`),
        naest: g(`v_next_inspection?${BF('base_id')}&select=site_id,inspect_month`),
        docs: g(`customer_documents?${filtQ}&select=id,doc_type,year,doc_date,amount,invoice_number,fyrirtaeki_id,customer_base_id,is_duplicate,storage_path,drive_file_id,vidskiptategund,skodun_ar_man,skyrsla_taeki_alls,skyrsla_texti,skyrsla_vidbot,notes`),
        app: g('app_settings?id=eq.1&select=settings'),
        bru: siteIds.length ? g(`brunakerfi_skyrslur?fyrirtaeki_id=in.(${siteIds.join(',')})&select=fyrirtaeki_id,year,status,bunadur:data->bunadur&order=year.desc`) : null,
        facts: siteIds.length ? g(`arsskodun_report_facts?fyrirtaeki_id=in.(${idsQ})&select=fyrirtaeki_id,report_year,equipment,total_devices&order=report_year.desc`) : null,
        rollup: siteIds.length ? g(`v_uttaeki_fid_rollup?fyrirtaeki_id=in.(${idsQ})&select=fyrirtaeki_id,bsl`) : null,
        taeki: siteIds.length ? g(`uttaeki?fyrirtaeki_id=in.(${siteIds.join(',')})&status=neq.urelt&select=fyrirtaeki_id,type,size,location,serial,last_insp,next_insp,status&order=type.asc,size.asc,location.asc&limit=5000`) : null,
        teikn: siteIds.length ? g(`teikning_bord?company_id=in.(${siteIds.join(',')})&select=company_id,haedir,image_url,markers`) : null,
        beidni: g(`thjonustubeidni?source=eq.gatt&${BF('customer_base_id')}&status=in.(nytt,i_vinnslu)&deleted_at=is.null&select=fyrirtaeki_id`),
        kerfi: siteIds.length ? g(`v_stadur_kerfi?fyrirtaeki_id=in.(${idsQ})&select=fyrirtaeki_id,kerfi,til_stadar,skylt,krafa_heimild,krafa_url,skilyrdi,thjonustuadili`) : null,
        flokkun: siteIds.length ? g(`v_stadur_flokkun?fyrirtaeki_id=in.(${idsQ})&select=fyrirtaeki_id,tegund_heiti,notkunarflokkur,m2,haedir`) : null,
        erindi: g(`thjonustubeidni?${ERINDI_FILT}&${BF('customer_base_id')}&deleted_at=is.null&created_at=gte.${encodeURIComponent(sinceQ)}&select=${ERINDI_SEL}&order=created_at.desc&limit=300`),
        eb: siteIds.length ? g(`eldvarnabok?fyrirtaeki_id=in.(${siteIds.join(',')})&manudur=gte.${fraQ}&select=fyrirtaeki_id,manudur,svor,stada,undirritad_af,undirritad_at,updated_at,erindi_id&order=manudur.desc`) : null,
        solur: g(`solur?${BF('customer_base_id')}&status=eq.final&greitt_med=eq.reikningur&select=num,samtals,created_at,paid_at,krafa_sent_at,customer_id,customer_nafn,is_credit,source&order=created_at.desc&limit=600`),
        stolpi: ktsQ.length ? g(`stolpi_reikningar?kt=in.(${ktsQ.map((k) => '"' + k + '"').join(',')})&tegund=eq.reikningur&dags=gte.${fra3Q}&select=reikn_nr,dags,upphaed,stada,greitt_dags&order=dags.desc&limit=300`) : null,
        messages: g(`portal_messages?base_id=eq.${baseId}&select=sender,body,author_name,created_at&order=created_at.asc`),
        vorur: (syn.serkjor && acct && acct.stillingar && acct.stillingar.serkjor) ? g(`vorur?or=(virkt.is.true,virkt.is.null)&flokkur=in.(${['Þjónusta', 'Slökkvitæki', 'Vinna og akstur'].map((x) => '"' + encodeURIComponent(x) + '"').join(',')})&select=id,nafn,verd_an_vsk,vsk_prosenta,flokkur,rodun,forsida&order=flokkur.asc,rodun.asc.nullslast,nafn.asc`) : null,
        items: syn.vinnusvaedi ? itemsFelags().catch(() => null) : null,
        checklist: syn.vinnusvaedi ? checklistFelags().catch(() => null) : null,
        vidhald: syn.vinnusvaedi ? vidhaldFelags().catch(() => null) : null,
        skrar: ['verktakar', 'rymi', 'lyklar', 'orkumaelar', 'kostnadur'].some((k) => syn[k]) ? skrarFelags().catch(() => null) : null,
        bgr: (showDetails && syn.bunadargreining && siteIds.length) ? Promise.all([
          P.sbGet(`bunadargreining?company_id=in.(${siteIds.join(',')})&fjarlaegt_at=is.null&select=company_id,created_at,stada,tki,texti,heimildir,teikningar,yfirlag,tillogur,stadsetningar&order=created_at.desc`),
          P.sbGet(`teikning_bord?company_id=in.(${siteIds.join(',')})&select=company_id,haedir`),
        ]).catch(() => null) : null,
      };
    })();
    const nafnById = {}, nrById = {}, adrById = {}; sites.forEach((s) => { nafnById[s.id] = s.nafn; nrById[s.id] = s.stadur_nr; adrById[s.id] = s.heimilisfang || ''; });

    // 2) Skoðanastaða per byggingu (view)
    const stById = {};
    try {
      const sr = await Q.stada;
      if (sr.ok) (await sr.json()).forEach((r) => { stById[r.site_id] = r; });
    } catch (_) {}

    // 2b) Virkur skoðunarmánuður per stað — SAMA forgangsregla og „📅"-takkinn í
    //     appinu (v_next_inspection: handvirkt/blob > skýrsla > reikningur).
    const imById = {};
    try {
      const nr = await Q.naest;
      if (nr.ok) (await nr.json()).forEach((r) => { imById[r.site_id] = r.inspect_month; });
    } catch (_) {}

    // 3) Skjöl (skýrslur + reikningar) — bundin base_id EÐA byggingu félagsins
    let docs = [];
    try {
      const dr = await Q.docs;
      if (dr.ok) docs = (await dr.json()).filter((d) => !leyfd || (d.fyrirtaeki_id != null && leyfd.has(Number(d.fyrirtaeki_id))));
    } catch (_) {}
    // 26.10.2026 (rekstrarfélög): skjal félagsins getur vísað á stað sem er EKKI í gáttinni (R-107909: Heimaleiga greiddi
    //    úttekt á Laugavegi 42, stað húsfélags undir Eignaumsjón). Nafnið fylgir reikningnum — staðurinn kemur ekki inn.
    try {
      const vantar = [...new Set(docs.map((d) => d.fyrirtaeki_id).filter((f) => f != null && nafnById[f] === undefined))];
      if (vantar.length) {
        const nr0 = await P.sbGet(`fyrirtaeki?id=in.(${vantar.join(',')})&select=id,nafn,heimilisfang`);
        if (nr0.ok) (await nr0.json()).forEach((f) => { nafnById[f.id] = f.nafn || ''; if (adrById[f.id] === undefined) adrById[f.id] = f.heimilisfang || ''; });
      }
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
    // 23.10.2026 (Agnar: „myndirnar eru ekki að synca saman, vantar myndir 2 á Þjónustugátt"): húsmynd appsins
    // (AppSettings co_bygging_mynd — sama mynd og bannerinn á fyrirtækjasíðunni, Verkstæði, Ársskoðun, Rekstrarfélög)
    // er varaleið gáttarinnar þegar eign.mynd vantar. Ein heimild báðum megin: gáttarmyndirnar fara í co_bygging_mynd.
    let bmMap = {};
    try {
      const ar = await Q.app;
      if (ar.ok) {
        const row = (await ar.json())[0];
        bruMap = (row && row.settings && row.settings.brunakerfi_customers) || {};
        bmMap = (row && row.settings && row.settings.co_bygging_mynd) || {};
      }
    } catch (_) {}
    // 23.10.2026 (Agnar: „þjónustugáttin og rekstrarfélög eru ekki að sýna heildar einingafjöldann í brunakerfisþjónustunni"):
    // einingafjöldi brunakerfis = SKÝRSLAN (brunakerfi_skyrslur, nýjasta ár, final fremur en drög — sama summa og
    // „196 einingar í kerfinu" í 274: iLagi + ekki per búnaðarlínu), annars unit_count áskriftarkortsins. Arnarhvoll:
    // kortið sagði 0, skýrslan 196 — gáttin sýndi aðeins „Já".
    const bruEinById = {};
    const bruEinByIdAr = {};   // fid → { ár → einingar } fyrir skýrslulistann (Agnar 23.10: „tækjafjöldi og einingafjöldi má koma hérna")
    try {
      if (siteIds.length) {
        const br = await Q.bru;
        if (br.ok) {
          const best = {};
          (await br.json()).forEach((r) => {
            if (r.fyrirtaeki_id == null || !r.year) return;
            const bun = Array.isArray(r.bunadur) ? r.bunadur : [];
            const nAr = bun.reduce((t, x) => t + (+(x && x.iLagi) || 0) + (+(x && x.ekki) || 0), 0);
            const fin = r.status === 'final';
            if (nAr > 0) {
              const m = bruEinByIdAr[r.fyrirtaeki_id] = bruEinByIdAr[r.fyrirtaeki_id] || {};
              if (m[+r.year] == null || (fin && !m[+r.year].fin)) m[+r.year] = { n: nAr, fin };
            }
            const cur = best[r.fyrirtaeki_id];
            if (cur && (cur.fin && !fin || cur.year > +r.year && cur.fin === fin)) return;
            if (cur && cur.year === +r.year && cur.fin && !fin) return;
            best[r.fyrirtaeki_id] = { year: +r.year, fin, bunadur: bun };
          });
          Object.keys(best).forEach((id) => {
            const n = best[id].bunadur.reduce((t, x) => t + (+(x && x.iLagi) || 0) + (+(x && x.ekki) || 0), 0);
            if (n > 0) bruEinById[id] = { n, ar: best[id].year };
          });
        }
      }
    } catch (_) {}
    const bruEiningar = (id) => {
      const r = bruEinById[String(id)];
      if (r) return { n: r.n, heimild: 'skyrsla', ar: r.ar };
      const bm = bruMap[id] || bruMap[String(id)];
      const n = bm && typeof bm === 'object' ? (+bm.unit_count || 0) : 0;
      return n > 0 ? { n, heimild: 'askrift', ar: null } : null;
    };
    const husmyndUr = (s) => {
      const e = s.eign && typeof s.eign === 'object' ? s.eign : null;
      if (e && e.mynd) return e;
      const bm = bmMap[String(s.id)];
      const url = bm && !bm.engin && bm.url && /^https:\/\//.test(String(bm.url)) ? String(bm.url) : '';
      // aðeins bætt við eign sem er til eða stað í þjónustu — eignirUtan-listinn (b.eign) má ekki fyllast af húsmyndum einum
      if (!url || (!e && s.er_i_thjonustu === false)) return e;
      return Object.assign({}, e || {}, { mynd: url, mynd_heimild: 'app' });
    };

    // 2c) Brunaslöngur per byggingu. Sýnishornið (Center Hótel) sýnir slöngur
    //     sem eigin dálk; total_devices inniheldur þær. Skýrsla fyrst, tækjaskrá
    //     sem vara (óvirkar slöngur á Arnarhvoll eru samt á skýrslunni).
    const factSloById = {};
    const factTotById = {};
    const liveBslById = {};
    try {
      if (siteIds.length) {
        const ids = siteIds.join(',');
        const ar = await Q.facts;
        if (ar.ok) {
          (await ar.json()).forEach((r) => {
            if (factSloById[r.fyrirtaeki_id] !== undefined) return;
            // 23.10.2026: tækjafjöldi nýjustu skýrslu (appið uppfærir röðina við hverja vistun, patch 270) — Skýrslur → Tæki
            if (r.total_devices != null && r.report_year != null) factTotById[r.fyrirtaeki_id] = { y: Number(r.report_year), n: Number(r.total_devices) };
            let eq = r.equipment || {};
            if (typeof eq === 'string') { try { eq = JSON.parse(eq); } catch (_) { eq = {}; } }
            factSloById[r.fyrirtaeki_id] = eq.brunaslongur != null ? Number(eq.brunaslongur) : null;
          });
        }
        const rr = await Q.rollup;
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
        const er = await Q.taeki;
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
        const tr = await Q.teikn;
        if (tr.ok) {
          (await tr.json()).forEach((t) => {
            const hs = Array.isArray(t.haedir) && t.haedir.length ? t.haedir : (t.image_url ? [{ nafn: 'Teikning', image_url: t.image_url, markers: t.markers || [] }] : []);
            const haedir = hs.map((h) => grisjaHaed(h, syn)).filter(Boolean);
            if (haedir.length) tkById[t.company_id] = haedir;
          });
        }
      } catch (_) {}
    }

    // 2e2) Búnaðargreining per byggingu (bunadargreining, virk röð) — aðeins kúnna-örugg snið (_gatt-bgr.cjs), aldrei athugasemdir
    const bgrById = {};
    if (showDetails && syn.bunadargreining && siteIds.length) {
      try {
        const [gr, br] = (await Q.bgr) || [{ ok: false }, { ok: false }];
        const bord = {};
        if (br.ok) (await br.json()).forEach((t) => { bord[t.company_id] = Array.isArray(t.haedir) ? t.haedir : []; });
        if (gr.ok) (await gr.json()).forEach((r) => { if (!bgrById[r.company_id]) { const o = BGR.bgrSnid(r, bord[r.company_id]); if (o) bgrById[r.company_id] = o; } });
      } catch (_) {}
    }

    // 2f) Opnar beiðnir af þjónustuvef per eign (Þjónustuborð, source 'gatt') → „Beiðni í vinnslu"
    const beidniById = {};
    try {
      const br0 = await Q.beidni;
      if (br0.ok) (await br0.json()).forEach((r) => { if (r.fyrirtaeki_id != null) beidniById[r.fyrirtaeki_id] = true; });
    } catch (_) {}

    // 2g) Kerfi og flokkun per eign (v_stadur_kerfi / v_stadur_flokkun). Aðeins kúnna-öruggir reitir — ALDREI
    //     verð, athugasemdir, vísbendingar, tækifæri eða heiti annarra þjónustuaðila (innri sölugögn).
    const kerfiById = {}, flokkunById = {};
    if (syn.kerfi && siteIds.length) {
      try {
        const ids = siteIds.join(',');
        const kr = await Q.kerfi;
        if (kr.ok) (await kr.json()).forEach((k) => {
          if (k.skylt === 'nei' && k.til_stadar !== 'ja') return;
          const ta = String(k.thjonustuadili || '');
          (kerfiById[k.fyrirtaeki_id] = kerfiById[k.fyrirtaeki_id] || []).push({
            k: k.kerfi, skylt: k.skylt || null, til: k.til_stadar || 'ovitad',
            adili: /^okkar/i.test(ta) ? 'okkar' : (ta ? 'annar' : null), heimild: k.krafa_heimild || null, skilyrdi: k.skilyrdi || null, url: k.krafa_url || null });
        });
        const fl = await Q.flokkun;
        if (fl.ok) (await fl.json()).forEach((f) => { flokkunById[f.fyrirtaeki_id] = { tegund: f.tegund_heiti || null, flokkur: f.notkunarflokkur || null, m2: f.m2 != null ? Number(f.m2) : null, haedir: f.haedir || null }; });
      } catch (_) {}
    }

    // 2h) Erindi síðustu 4 ár: af þjónustuvef (source gatt) eða merkt kúnnanum (tags ∋ gatt) — titill, staða,
    //     punktur, myndir (undirritaðar 10 mín), ábyrgð. Aldrei innri nótur (notes); summary er texti kúnnans.
    //     4 ár (22.10.2026): eldri samskipti úr pósti eru skráð eftir á sem lokuð erindi (tag saga-eftir-a).
    let erindi = [];
    if (syn.erindi) {
      try {
        const since = new Date(Date.now() - 4 * 365 * 864e5).toISOString();
        let er = await Q.erindi;
        // Varaleið þar til migration 2026-10-11_verkbeidnapunktar.sql er beitt (nýju dálkarnir vantar → 400): gamla valið
        if (!er.ok) er = await P.sbGet(`thjonustubeidni?source=eq.gatt&${BF('customer_base_id')}&deleted_at=is.null&created_at=gte.${encodeURIComponent(since)}&select=id,fyrirtaeki_id,title,status,created_at,updated_at,tags&order=created_at.desc&limit=200`);
        if (er.ok) {
          const rows = (await er.json()).filter((r) => !leyfd || (r.fyrirtaeki_id != null && leyfd.has(Number(r.fyrirtaeki_id))));
          const slod = await M.undirrita(myndaSlodir(rows), 600);
          erindi = rows.map((r) => erindiRod(r, slod));
        }
      } catch (_) {}
    }
    // 2j) Vinnusvæði: skjöl og hlekkir félagsins
    let items = [], checklist = [], vidhald = [], skrar = [];
    if (syn.vinnusvaedi) { try { items = (await Q.items) || []; checklist = (await Q.checklist) || []; vidhald = ((await Q.vidhald) || []).filter((x) => !leyfd || leyfd.has(Number(x.fid))); } catch (_) {} }
    if (Q.skrar) { try { skrar = skrarSia((await Q.skrar) || []); } catch (_) {} }

    // 2i) Eldvarnabók síðustu 13 mánuði per eign
    const ebById = {};
    if (syn.eldvarnabok && siteIds.length) {
      try {
        const d0 = new Date(); d0.setUTCDate(1); d0.setUTCMonth(d0.getUTCMonth() - 12);
        const fra = d0.toISOString().slice(0, 8) + '01';
        const eb = Q.eb ? await Q.eb : { ok: false };
        if (eb.ok) (await eb.json()).forEach((r) => {
          (ebById[r.fyrirtaeki_id] = ebById[r.fyrirtaeki_id] || []).push({ manudur: String(r.manudur).slice(0, 7), svor: r.svor || {}, stada: r.stada,
            undirritad_af: r.undirritad_af || null, undirritad_at: r.undirritad_at || null, uppf: r.updated_at, erindi: r.erindi_id || null });
        });
      } catch (_) {}
    }

    // Skoðanasaga: mánuður hverrar skýrslu eins og hann stendur í skýrslunni sjálfri (customer_documents.skodun_ar_man, YYYY-MM).
    // 23.10.2026: annars mánuður skjalsins (doc_date) — brunakerfisskýrslur bera hann þar.
    const skMan = (d) => { const m = String(d.skodun_ar_man || '') || (d.doc_date ? String(d.doc_date).slice(0, 7) : ''); return /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : null; };
    const sagaById = {};
    docs.forEach((d) => {
      if (d.is_duplicate || d.fyrirtaeki_id == null || !skMan(d)) return;
      if (d.doc_type !== 'uttektarskyrsla' && d.doc_type !== 'brunakerfi') return;
      (sagaById[d.fyrirtaeki_id] = sagaById[d.fyrirtaeki_id] || []).push({ t: d.doc_type === 'brunakerfi' ? 'bru' : 'slokk', m: skMan(d), docId: d.id, x: d.skyrsla_texti ? String(d.skyrsla_texti).slice(0, 420) : null });
    });
    Object.keys(sagaById).forEach((k) => sagaById[k].sort((a, b) => String(b.m).localeCompare(String(a.m))));
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
        // Eign systkinafélags í rekstrarfélaginu (annað base_id) → nafn eiganda/greiðanda; null fyrir eigin eignir
        eigandi: s.customer_base_id != null && Number(s.customer_base_id) !== Number(baseId) ? (hopur.nofn[s.customer_base_id] || null) : null,
        // Óvirkur staður (status 'óvirkur', t.d. Reitir 11.10.2026: skráðir í þjónustu en óvirkir svo
        // allt kerfið nái til þeirra) telst EKKI í þjónustu í gáttinni.
        i_thjonustu: s.er_i_thjonustu !== false && !/^(óvirkur|ovirkur|inactive)$/i.test(String(s.status || '')),
        bru_i_thjonustu: bruOn,
        stada: st.stada || (s.er_i_thjonustu === false ? 'ekki_i_thjonustu' : 'engin_skyrsla'),
        sidasta_ar: GY.lastYear(arSlokk) || st.report_year || null,
        ar_slokk: arSlokk,
        ar_bru: arBru,
        saga: sagaById[s.id] || [],
        // skoðunarmánuður úr v_next_inspection (eins og „📅"-takkinn); fallback á skýrslu-mánuð
        skodun_manudur: imById[s.id] != null ? imById[s.id] : (st.inspect_month != null ? st.inspect_month : null),
        bru_skodun_manudur: bruEntry && bruEntry.inspect_month != null ? Number(bruEntry.inspect_month) : null,
        bru_einingar: (() => { const e = bruOn ? bruEiningar(s.id) : null; return e ? e.n : null; })(),
        bru_einingar_heimild: (() => { const e = bruOn ? bruEiningar(s.id) : null; return e ? e.heimild : null; })(),
        taeki: slokkMinusHose(rawTotal, slo),
        slo: slo,
        // Upplýsingar um fasteignina (mynd, stærð, ár, tegund, lýsing) — opinberar upplýsingar
        eign: husmyndUr(s),
        beidni: !!beidniById[s.id],
        kerfi: kerfiById[s.id] || [],
        flokkun: flokkunById[s.id] || null,
        eldvarnabok: syn.eldvarnabok ? (ebById[s.id] || []) : null,
        ...(showDetails && syn.taeki ? { equipment: eqById[s.id] || [] } : {}),
        ...(showDetails && tkById[s.id] ? { teikning: tkById[s.id] } : {}),
        ...(showDetails && bgrById[s.id] ? { bgr: bgrById[s.id] } : {}),
      };
    });

    // ── Prufuhamur (11.10.2026, Agnar): eign.prufa = {lettvatn, duft, co2, slongur, brunakerfi:{einingar, reykskynjarar}}
    //    sýnir kerfið með sýnishornstölum án þess að snerta tækjaskrána (uttaeki). Fjarlægt með: update fyrirtaeki
    //    set eign = eign - 'prufa' where id = …  — búnaðarkaflinn ber merkið „sýnishorn".
    const nuAr = new Date().getFullYear();
    buildings.forEach((b) => {
      const p = b.eign && b.eign.prufa && typeof b.eign.prufa === 'object' ? b.eign.prufa : null;
      if (!p) return;
      const teg = [['Léttvatn', '6 L', +p.lettvatn || 0], ['Duft ABC', '6 kg', +p.duft || 0], ['CO₂', '5 kg', +p.co2 || 0]].filter((t) => t[2] > 0);
      const slong = +p.slongur || 0, bk = p.brunakerfi && typeof p.brunakerfi === 'object' ? p.brunakerfi : null;
      const haedir = (b.flokkun && +b.flokkun.haedir) || (b.teikning && b.teikning.length) || 3;
      b.taeki = teg.reduce((n, t) => n + t[2], 0); b.slo = slong; b.stada = 'ok'; b.sidasta_ar = nuAr;
      if (b.ar_slokk.indexOf(String(nuAr)) < 0) b.ar_slokk = b.ar_slokk.concat([String(nuAr)]);
      if (bk) { b.bru_i_thjonustu = true; b.bru_lysing = [bk.einingar ? bk.einingar + ' einingar' : '', bk.reykskynjarar ? bk.reykskynjarar + ' reykskynjarar' : ''].filter(Boolean).join(' · '); if (b.ar_bru.indexOf(String(nuAr)) < 0) b.ar_bru = b.ar_bru.concat([String(nuAr)]); }
      b.prufa = true;
      const setja = (k, extra) => { const i = b.kerfi.findIndex((x) => x.k === k); const row = Object.assign({ k, skylt: 'ja', til: 'ja', adili: 'okkar', heimild: null }, extra || {}); if (i > -1) b.kerfi[i] = Object.assign({}, b.kerfi[i], row); else b.kerfi.push(row); };
      if (b.taeki) setja('slokkvitaeki'); if (slong) setja('slongukefli', { skylt: 'skilyrt' });
      if (bk) { setja('brunavidvorunarkerfi'); if (bk.reykskynjarar) setja('reykskynjarar'); }
      if (showDetails && syn.taeki) {
        const sid = String(nuAr) + '-' + String(((b.skodun_manudur || 6) + 100)).slice(-2) + '-12', nae = String(nuAr + 1) + sid.slice(4);
        const eq = []; let n = 0;
        teg.forEach((t) => { for (let i = 0; i < t[2]; i++, n++) eq.push({ tegund: t[0], staerd: t[1], stadsetning: (1 + (n % haedir)) + '. hæð, ' + ['gangur', 'við stiga', 'við útgang', 'eldhús', 'lager', 'móttaka'][Math.floor(n / haedir) % 6] + (n >= haedir * 6 ? ' ' + (Math.floor(n / (haedir * 6)) + 1) : ''), nr: null, sidast: sid, naest: nae, lan: false }); });
        for (let i = 0; i < slong; i++) eq.push({ tegund: 'Brunaslanga', staerd: '25 m', stadsetning: (1 + (i % haedir)) + '. hæð, slönguskápur', nr: null, sidast: sid, naest: nae, lan: false });
        b.equipment = eq;
      }
    });

    // 23.10.2026 (Agnar: „Tækjafjöldi og einingafjöldi má koma hérna" — dálkurinn „Tæki í skýrslunni" stóð „—"):
    // slökkvitækjaskýrsla = skyrsla_taeki_alls, annars summa „Tæki í skýrslunni" úr skyrsla_vidbot; brunakerfisskýrsla =
    // einingar skoðunar sama árs (brunakerfi_skyrslur, iLagi+ekki — sama tala og í appinu). Aldrei upphæð reiknings.
    const skyrsluMagn = (d) => {
      if (d.doc_type === 'brunakerfi') { const m = bruEinByIdAr[d.fyrirtaeki_id]; const e = m && d.year != null ? m[+d.year] : null; return e ? e.n : null; }
      if (d.skyrsla_taeki_alls != null) return d.skyrsla_taeki_alls;
      const v = d.skyrsla_vidbot && typeof d.skyrsla_vidbot === 'object' ? d.skyrsla_vidbot : null;
      const t = v && Array.isArray(v.taeki) ? v.taeki : null;
      if (t && t.length) { const n = t.reduce((s, x) => s + (Array.isArray(x) ? (+x[1] || 0) : (+(x && x.fj) || 0)), 0); if (n > 0) return n; }
      // ný skýrsla úr appinu: fjöldinn í staðreyndaröð staðarins ef hún á við sama ár (patch 270 uppfærir hana við hverja vistun;
      // source_doc_id þar er ekki uppfært, svo það er ekki notað til pörunar)
      const ft = factTotById[d.fyrirtaeki_id]; if (ft && ft.y === Number(d.year)) return ft.n;
      return null;
    };
    // Ein skýrsla per (bygging, tegund, ár) — sama regla og aðal-yfirlitin.
    const reports = dedupeDocs(
      docs.filter((d) => REPORT_TYPES.includes(d.doc_type) && !d.is_duplicate),
      // 23.10.2026 (samræmingarpróf gáttar ↔ apps): lykillinn var ár, svo tvær raunverulegar skýrslur sama árs
      // (Arnarhvoll brunakerfi maí + okt 2026) runnu í eina. Nú mánuður skoðunar (skodun_ar_man / doc_date), ár til vara.
      (d) => `${d.fyrirtaeki_id == null ? '' : d.fyrirtaeki_id}|${d.doc_type}|${skMan(d) || (d.year == null ? '' : d.year)}`,
    )
      // 23.10.2026 (Agnar: „sýna … heimilisfang, heildarfjölda tækja, mánuð skoðunar"): heimilisfang staðarins og tækjafjöldi úr skýrslunni
      // 25.10.2026 (Heimaleiga-greining): röð án skrár (hvorki Storage né Drive, t.d. 859) fékk PDF-hlekk sem svaraði 404 → docId null
      .map((d) => ({ docId: (d.storage_path || d.drive_file_id) ? d.id : null, dags: d.doc_date || null, ar: d.year || null, tegund: d.doc_type, skodun: skMan(d), heimilisfang: adrById[d.fyrirtaeki_id] || '', texti: d.skyrsla_texti ? String(d.skyrsla_texti).slice(0, 420) : null, vidbot: vidbotHreint(d.skyrsla_vidbot),
        bygging: nafnById[d.fyrirtaeki_id] || '', magn: skyrsluMagn(d), eining: d.doc_type === 'brunakerfi' ? 'einingar' : 'tæki' }))
      .sort((a, b) => String(b.dags || b.ar || '').localeCompare(String(a.dags || a.ar || '')));

    // Einn reikningur per reikningsnúmer (ver gegn tvítekningum úr fleiri heimildum).
    const invoices = dedupeDocs(
      // 26.10.2026 (rekstrarfélög — Bríetartún-húsfélag/Aegina komu inn): kreditreikningar í skjalaskránni (R-107757 −193.600,
      // R-107299 −236.889, þrjár númerslausar raðir merktar KREDITREIKNINGUR) eru ekki reikningar kúnnans í gáttinni.
      docs.filter((d) => d.doc_type === 'reikningur' && !d.is_duplicate && !(d.amount != null && Number(d.amount) < 0)
        && !(/kreditreikn/i.test(String(d.notes || '')) && (!d.invoice_number || d.amount == null || Number(d.amount) < 0))),
      (d) => normNr(d.invoice_number) || ('id:' + d.id),
    )
      .map((d) => ({ docId: (d.storage_path || d.drive_file_id) ? d.id : null, nr: d.invoice_number || null, dags: d.doc_date || null, ar: d.year || null,
        bygging: nafnById[d.fyrirtaeki_id] || '', upphaed: d.amount != null ? d.amount : null,
        lysing: '', tegund: d.vidskiptategund || null }))
      .sort((a, b) => String(b.dags || b.ar || '').localeCompare(String(a.dags || a.ar || '')));

    // 23.10.2026 (Agnar: „skrá lýsingu"): skjal úr Stólpa-tímanum á enga solur-röð, svo Lýsing stóð auð þótt
    // þjónustutegundin (vidskiptategund) væri þekkt. Lýsing = tegundin (Úttekt / Brunakerfi / Búð); vanti hana,
    // „Vegna"-línan úr reikningslestri. Eign úr reikningslestri þegar skjalið sjálft er ekki tengt byggingu.
    const TEG_L = { uttekt: 'Úttekt', brunakerfi: 'Brunakerfi', bud: 'Búð' };
    invoices.forEach((i) => { if (!i.lysing && i.tegund && TEG_L[i.tegund]) i.lysing = TEG_L[i.tegund]; });
    // 26.10.2026 (hraði): solur-fyllingin hér að neðan fer af stað NÚNA, samhliða reikningslestrinum. Mengið er
    //    yfirmengi þess sem stæði eftir (lesturinn fyllir aðeins lýsingu/byggingu, fyllingin aðeins tóma reiti) → sama svar.
    const needP = (() => {
      const need0 = invoices.filter((i) => i.nr && (i.upphaed == null || !i.dags || !i.lysing));
      if (!need0.length) return null;
      const quoted = [...new Set(need0.map((i) => String(i.nr).replace(/"/g, '')))].map((n) => `"${n}"`).join(',');
      return P.sbGet(`solur?num=in.(${quoted})&select=num,samtals,created_at,source`).catch(() => ({ ok: false }));
    })();
    try {
      const vant = invoices.filter((i) => i.nr && (!i.lysing || !i.bygging));
      if (vant.length) {
        const lst = [...new Set(vant.map((i) => '"' + String(i.nr).replace(/"/g, '') + '"'))].join(',');
        const rr = await P.sbGet(`reikningslestur?reikningur_nr=in.(${lst})&select=reikningur_nr,fyrirtaeki_id,vegna`);
        if (rr.ok) {
          const rl = {};
          (await rr.json()).forEach((x) => { rl[normNr(x.reikningur_nr)] = x; });
          vant.forEach((i) => {
            const y = rl[normNr(i.nr)];
            if (!y) return;
            if (!i.bygging && y.fyrirtaeki_id != null && nafnById[y.fyrirtaeki_id]) i.bygging = nafnById[y.fyrirtaeki_id];
            if (!i.lysing && y.vegna) i.lysing = String(y.vegna).slice(0, 90);
          });
        }
      }
    } catch (_) {}

    // Drive-einn Stolpi-class docs often have PDF + year but no kr / full date.
    // Fill from solur when the R-númer matches — never invent amounts.
    try {
      if (needP) {
        const sr = await needP;
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

    // 19.10.2026 (Center Hótel gjaldkeri bað þrisvar um færslu á eindaga af því krafan „kom ekki" og var ekki til
    // samþykktar): reikningur sem er FINAL í sölukerfinu en á ekkert skjal (PDF) átti sér engan stað hér, og enginn
    // reikningur sýndi stöðu. Nú bætast þeir við (án PDF-hlekks) og hver reikningur ber stöðuna úr solur:
    //   greitt = paid_at er til · ogreitt = krafa send fyrir ≤ 75 dögum og engin greiðsla skráð.
    // Eldri ógreiddir fá EKKERT merki — paid_at dregst á eftir raunveruleikanum (Payday-afstemming), og rangt
    // „ógreitt" gagnvart kúnna er verra en autt merki.
    const voidQuery = (nrsIn) => {
      const nrs = [...new Set(nrsIn.map((n) => n && String(n).replace(/"/g, '')).filter(Boolean))];
      if (!nrs.length) return null;
      const quoted = nrs.map((n) => `"${n}"`).join(',');
      return P.sbGet(`solur?num=in.(${quoted})&select=id,num,status,is_credit,credit_of`).catch(() => ({ ok: false }));
    };
    let voidP = null;
    try {
      const sr2 = await Q.solur;
      if (sr2.ok) {
        const rows2 = await sr2.json();
        const nuMs = Date.now(), kraftur = 75 * 864e5, fra = nuMs - 730 * 864e5;
        const stadaAf = (s) => (s.paid_at ? 'greitt' : (s.krafa_sent_at && nuMs - Date.parse(s.krafa_sent_at) <= kraftur ? 'ogreitt' : null));
        const byNr2 = {};
        rows2.forEach((s) => { if (s && s.num) byNr2[normNr(s.num)] = s; });
        invoices.forEach((i) => { const s = i.nr && byNr2[normNr(i.nr)]; i.stada = s ? stadaAf(s) : null; });
        const til = new Set(invoices.map((i) => normNr(i.nr)).filter(Boolean));
        rows2.forEach((s) => {
          const n = normNr(s.num);
          if (!n || til.has(n) || s.is_credit) return;
          if (leyfd && !(s.customer_id != null && leyfd.has(Number(s.customer_id)))) return;
          if (Date.parse(s.created_at) < fra) return;
          invoices.push({ docId: null, nr: s.num, dags: String(s.created_at).slice(0, 10), ar: null,
            bygging: nafnById[s.customer_id] || s.customer_nafn || '', upphaed: s.samtals != null && s.samtals !== '' ? Number(s.samtals) : null,
            lysing: ({ uttekt: 'Úttekt', brunakerfi: 'Brunakerfi', pos: 'Sala' })[s.source] || '', tegund: ({ uttekt: 'uttekt', brunakerfi: 'brunakerfi' })[s.source] || null, stada: stadaAf(s) });
        });
        invoices.sort((a, b) => String(b.dags || b.ar || '').localeCompare(String(a.dags || a.ar || '')));
      }
    } catch (_) {}

    // 22.10.2026 (generalprufa Center Hótel): reikningar úr gamla kerfinu (Stólpi, til apríl 2026) sem eiga ekkert skjal í gáttinni
    // (R-107606, R-107802, R-108001, R-108134) sáust ekki og eldri reikningar sýndu enga stöðu. Nú bætast þeir við (án PDF-hlekks)
    // með stöðu úr Stólpa; eignin kemur úr reikningslestri þar sem hann er til. Aðeins reikningar félagsins (kennitala), aldrei kredit.
    // Staðan „greitt" er sönn í Stólpa; „ógreitt" er EKKI sýnt úr gamla kerfinu (sama regla og hér að ofan).
    try {
      if (!leigutaki) {
        // Rekstrarfélag: kennitölur ALLRA félaga hópsins (Heimaleiga + S30 + Aegina …), ekki aðeins þessa base_id
        const kts = hopur.kt.map((k) => String(k).replace(/\D/g, '')).filter((k) => k.length === 10).map((k) => k.slice(0, 6) + '-' + k.slice(6));
        if (kts.length) {
          const fra3 = new Date(Date.now() - 730 * 864e5).toISOString().slice(0, 10);
          const sr3 = Q.stolpi ? await Q.stolpi : { ok: false };
          if (sr3.ok) {
            const rows3 = await sr3.json();
            voidP = voidQuery(invoices.map((i) => i.nr).concat(rows3.map((x) => 'R-' + String(x.reikn_nr))));
            const byNr3 = {}; invoices.forEach((i) => { const n = normNr(i.nr); if (n) byNr3[n] = i; });
            const nyjar = rows3.filter((x) => !byNr3[normNr(x.reikn_nr)]);
            const rl = {};
            if (nyjar.length) {
              const lst = nyjar.map((x) => '"R-' + String(x.reikn_nr).replace(/"/g, '') + '"').join(',');
              const rr = await P.sbGet(`reikningslestur?reikningur_nr=in.(${lst})&select=reikningur_nr,fyrirtaeki_id,vegna`);
              if (rr.ok) (await rr.json()).forEach((x) => { rl[normNr(x.reikningur_nr)] = x; });
            }
            rows3.forEach((x) => {
              const n = normNr(x.reikn_nr), ex = byNr3[n], greitt = x.stada === 'greitt' || !!x.greitt_dags, dags = String(x.dags).slice(0, 10);
              // 25.10.2026 (Heimaleiga: R-107254 og R-107758 „kreditfært" í Stólpa sáust sem reikningar): kreditfærður
              // reikningur er ekki krafa — hvorki sýndur úr Stólpa né úr skjalaröð sem ber sama númer.
              const kredit = /kredit/i.test(String(x.stada || ''));
              if (ex) { if (kredit) ex._kredit = true; if (!ex.stada && greitt) ex.stada = 'greitt'; if (dags && ex.dags !== dags) ex.dags = dags; return; }
              if (kredit) return;
              const y = rl[n];
              if (leyfd && !(y && y.fyrirtaeki_id != null && leyfd.has(Number(y.fyrirtaeki_id)))) return;
              invoices.push({ docId: null, nr: 'R-' + x.reikn_nr, dags, ar: null, bygging: (y && nafnById[y.fyrirtaeki_id]) || '',
                upphaed: x.upphaed != null ? Number(x.upphaed) : null, lysing: y && y.vegna ? String(y.vegna).slice(0, 90) : '', tegund: null, stada: greitt ? 'greitt' : null });
            });
            invoices.sort((a, b) => String(b.dags || b.ar || '').localeCompare(String(a.dags || a.ar || '')));
          }
        }
      }
    } catch (_) {}

    // 25.10.2026 (Heimaleiga-greining: R-001029 var ógiltur (void) í sölukerfinu en sást í gáttinni af því skjalaröðin
    // lifði; kreditnótan R-001108 núllaði hann): reikningur sem er void, er kreditnóta, eða á kreditnótu sem vísar á
    // hann (credit_of) er ekki krafa og á ekki heima fyrir augum kúnnans. Stólpa-kreditfærslur merktar hér að ofan.
    try {
      const svP = voidP || voidQuery(invoices.map((i) => i.nr));
      if (svP) {
        const sv = await svP;
        if (sv.ok) {
          const rows = await sv.json();
          const ut = new Set(), idByNr = {};
          rows.forEach((s) => { idByNr[normNr(s.num)] = s.id; if (s.status === 'void' || s.is_credit) ut.add(normNr(s.num)); });
          const kreditud = new Set(rows.filter((s) => s.credit_of != null).map((s) => s.credit_of));
          Object.keys(idByNr).forEach((n) => { if (kreditud.has(idByNr[n])) ut.add(n); });
          for (let i = invoices.length - 1; i >= 0; i--) { if (invoices[i]._kredit || ut.has(normNr(invoices[i].nr))) invoices.splice(i, 1); }
        }
      }
    } catch (_) {}
    invoices.forEach((i) => { delete i._kredit; });

    // Yfirlit: aðeins staðir í annarri hvorri þjónustunni. Þverholt 14 er
    // lögheimili/samningur, ekki hótel á slökk- eða brunakerfisborði.
    const onBoard = buildings.filter((b) => b.i_thjonustu || b.bru_i_thjonustu);
    // 26.10.2026 (Agnar: „láttu það ekki sjást á gáttinni í bili"): reikningar sem stjórnsíðan/stillingar fela —
    //    portal_users.stillingar.falin_reikningar = ["R-107909", …]. Ekkert eytt; takist listinn úr sést reikningurinn aftur.
    try {
      const falin = new Set(((acct && acct.stillingar && Array.isArray(acct.stillingar.falin_reikningar)) ? acct.stillingar.falin_reikningar : []).map((x) => normNr(x)).filter(Boolean));
      if (falin.size) for (let i = invoices.length - 1; i >= 0; i--) { if (falin.has(normNr(invoices[i].nr))) invoices.splice(i, 1); }
    } catch (_) {}
    // Eignasafn: eignir félagsins UTAN þjónustu sem bera eign-upplýsingar (skráðar viljandi sem
    // fasteignir, t.d. Reitir 11.10.2026) — kúnninn getur skráð þær í þjónustu í gáttinni.
    // Lögheimilis-/samningsstaðir án eign-gildis (Þverholt 14) birtast ekki.
    const eignirUtan = buildings.filter((b) => !(b.i_thjonustu || b.bru_i_thjonustu) && b.eign)
      .map((b) => ({ id: b.id, nafn: b.nafn, heimilisfang: b.heimilisfang, eign: b.eign, beidni: b.beidni, teikning: b.teikning || null, kerfi: b.kerfi, flokkun: b.flokkun }))
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
    if (!leigutaki) try {
      const mr = await Q.messages;
      if (mr.ok) messages = await mr.json();
      await P.sbPatch(`portal_messages?base_id=eq.${baseId}&sender=eq.starf`, { read_by_customer: true });
    } catch (_) {}

    // heiti félags úr customers_base (fyrir hausinn) ef ekki í tokeni/opnum aðgangi
    let name = session ? session.name : (openAcct && openAcct.display_name);
    if (!name) { try { const br = await P.sbGet(`customers_base?id=eq.${baseId}&select=nafn&limit=1`); if (br.ok) name = ((await br.json())[0] || {}).nafn || ''; } catch (_) {} }
    const theme = (acct && acct.theme) || (session && session.theme) || 'boss';

    // ── Sérkjör (26.10.2026, Agnar: „tab/page um sérkjör … fullt verð með vsk, fullt án vsk, afsláttarkjör og verð án vsk, og
    //    hvað slökkvitækin koma út"): kjörin búa í portal_users.stillingar.serkjor — yfirferd/hledsla/slanga/skyrsla/akstur eru
    //    föst samningsverð án vsk (null = listaverð), ny_taeki_pct afsláttur af nýjum tækjum. Listaverðin koma úr vorur, svo
    //    breytist verðskráin breytist „fullt verð" hér um leið. Aðeins kúnna-sýnilegir textar (heimild, ath) fara út.
    let serkjor = null;
    try {
      const cfg = acct && acct.stillingar && acct.stillingar.serkjor;
      if (syn.serkjor && cfg && typeof cfg === 'object') {
        const vr = Q.vorur ? await Q.vorur : { ok: false };
        const vorur = vr.ok ? await vr.json() : [];
        const med = (an, vsk) => Math.round(Number(an) * (1 + (Number(vsk) || 24) / 100));
        const fast = (v) => (v == null || v === '' || isNaN(Number(v)) ? null : Number(v));
        const lidir = [];
        const baeta = (v, flokkur, verdAn, kjor) => {
          const fulltAn = Math.round(Number(v.verd_an_vsk) || 0); if (!fulltAn) return;
          // Kúnninn borgar aldrei meira en listaverð: fast samningsverð (t.d. hleðsla 4.400) gildir aðeins þar sem það er lægra
          // en listaverð tegundarinnar (CO₂ 2 kg hleðsla er 3.400 á lista → listaverð ræður).
          const va = verdAn == null ? fulltAn : Math.min(fulltAn, Math.round(verdAn));
          lidir.push({ vara_id: v.id, heiti: String(v.nafn).replace(/yfirferd$/i, 'yfirferð'), flokkur, fullt_an: fulltAn, fullt_med: med(fulltAn, v.vsk_prosenta),
            afsl_pct: Math.max(0, Math.round((1 - va / fulltAn) * 100)), verd_an: va, verd_med: med(va, v.vsk_prosenta),
            kjor: (verdAn == null || va >= fulltAn) ? 'listaverd' : (kjor || 'samningsverd') });
        };
        const ROD = { yfirferd: 1, hledsla: 2, slanga: 3, skyrsla: 4, akstur: 5, taeki: 6 };
        const THJ = /^(Duft \d+ kg\. ABC (yfirferð|hleðsla)|Léttvatnstækis? \d+L\. (yfirferð|hleðsla)|CO₂ [25] kg\. (yfirferð|yfirferd|hleðsla)|Slökkvitæki 9L léttvatn yfirferð)$/i;
        vorur.forEach((v) => {
          const n = String(v.nafn || '').trim();
          if (v.flokkur === 'Þjónusta' && THJ.test(n)) { const hl = /hleðsla/i.test(n); baeta(v, hl ? 'hledsla' : 'yfirferd', fast(hl ? cfg.hledsla : cfg.yfirferd)); }
          else if (v.flokkur === 'Þjónusta' && /^Yfirferð Brunaslanga$/i.test(n)) baeta(v, 'slanga', fast(cfg.slanga));
          else if (v.flokkur === 'Vinna og akstur' && /^Skýrslugerð/i.test(n)) baeta(v, 'skyrsla', fast(cfg.skyrsla));
          else if (v.flokkur === 'Vinna og akstur' && /^Akstur$/i.test(n)) baeta(v, 'akstur', fast(cfg.akstur));
          else if (v.flokkur === 'Slökkvitæki' && (v.forsida === true || Number(v.id) === 24)) { const p = fast(cfg.ny_taeki_pct); baeta(v, 'taeki', p ? Number(v.verd_an_vsk) * (1 - p / 100) : null, p ? 'afslattur' : 'listaverd'); }
        });
        // Röð innan skoðunar/hleðslu: léttvatn → duft → CO₂, svo eftir stærð; tækin halda vörulistaröðinni (rodun)
        const teg = (h) => (/léttvatn/i.test(h) ? 1 : /duft/i.test(h) ? 2 : /co₂|co2/i.test(h) ? 3 : 4);
        const st = (h) => { const m = /(\d+(?:[.,]\d+)?)\s*(kg|l)/i.exec(h); return m ? Number(m[1].replace(',', '.')) : 99; };
        lidir.sort((a, b) => (ROD[a.flokkur] - ROD[b.flokkur]) || (a.flokkur === 'taeki' ? 0 : (teg(a.heiti) - teg(b.heiti)) || (st(a.heiti) - st(b.heiti))));
        serkjor = { heimild: String(cfg.heimild || ''), ath: String(cfg.ath || ''), ny_taeki_pct: fast(cfg.ny_taeki_pct), lidir };
      }
    } catch (_) {}

    return P.json(200, {
      serkjor,
      account: { name: name || '', theme: theme, open: openMode, details: showDetails, syn: syn, stillingar: (acct && acct.stillingar && typeof acct.stillingar === 'object') ? acct.stillingar : {},
        notandi: session ? { nafn: session.name || '', hlutverk, eignir: leyfd ? [...leyfd] : null, staff: !!session.staff } : null },
      stats, buildings: onBoard, eignir_utan: eignirUtan, reports, invoices: leigutaki ? [] : invoices, messages, erindi, items, checklist, vidhald, skrar,
      // teikningar fylgja líka eignum utan þjónustu (eignirUtan.teikning) svo punktar virki þar
    });
  } catch (e) {
    return P.json(500, { error: String((e && e.message) || e) });
  }
};
