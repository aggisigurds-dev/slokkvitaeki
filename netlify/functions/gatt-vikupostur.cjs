// gatt-vikupostur.cjs — Þjónustugátt: vikuleg samantekt í pósti (12.10.2026, Agnar: „Hljómar bara allt mjög vel").
//
// Keyrir á mánudagsmorgnum 07:00 UTC (netlify.toml schedule) fyrir hvert VIRKT félag sem hefur rofann „vikupostur"
// kveiktan á gatt-admin (sjálfgefið SLÖKKT — sjá _gatt-verkfaeri.cjs) og hefur ekki falið tólið sjálft.
// Viðtakendur: netfang aðgangsins (portal_users.email) + notendur félagsins með hlutverk stjórnandi/eldvarnarfulltrúi.
// Efni: skoðanir á eftir og á næstu 60 dögum · opin verk til okkar og eigin verkefni · viðhald á eftir / næstu 30 daga ·
// skírteini sem renna út á 60 dögum. Ekkert sent þegar allt er tómt og ekkert er á eftir.
// „Senda núna" á gatt-admin (action vikupostur-senda) kallar sendaFelagi() með thvinga:true (sendir þótt allt sé tómt).
// Skrifar ekkert í gagnagrunninn.
const P = require('./_portal.cjs');
const VF = require('./_gatt-verkfaeri.cjs');
const MAIL_FROM = process.env.PORTAL_MAIL_FROM || 'Slökkvitæki ehf <noreply@slokkvitaeki.is>';
const MAN = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dags = (d) => { if (!d) return ''; const x = new Date(d); return isNaN(x) ? String(d) : x.getDate() + '. ' + MAN[x.getMonth()] + ' ' + x.getFullYear(); };
const ymd = (d) => new Date(d).toISOString().slice(0, 10);
const ERINDI_FILT = 'or=(source.eq.gatt,tags.cs.' + encodeURIComponent('["gatt"]') + ')';
const STADA = { nytt: 'Móttekið', i_vinnslu: 'Í vinnslu', bidur: 'Bíður', klarad: 'Lokið', lokad: 'Lokið' };

async function rows(q) { const r = await P.sbGet(q); return r.ok ? await r.json() : []; }

// Næsta skoðun — SAMI reikningur og naestaSkodun() í gatt/portal.js: mánuður (1–12, smallint í v_next_inspection /
// v_stadir_skyrslu_stada) + ár síðustu skýrslu → næsta ár; „á eftir" ef sá mánuður er liðinn.
function naestaSkodun(month, last, nu) {
  month = Number(month); if (!month || month < 1 || month > 12) return null;
  const cy = nu.getFullYear(), cm = nu.getMonth() + 1;
  const yr = last ? Number(last) + 1 : (month >= cm ? cy : cy + 1);
  return { m: month, y: yr, idx: yr * 12 + month, seint: (yr * 12 + month) < (cy * 12 + cm) };
}

async function safnaEfni(baseId) {
  const nu = new Date(), i30 = new Date(nu.getTime() + 30 * 864e5), i60 = new Date(nu.getTime() + 60 * 864e5);
  const [sites, nxt, st, erindi, vidhald] = await Promise.all([
    rows(`fyrirtaeki?customer_base_id=eq.${baseId}&deleted_at=is.null&select=id,nafn,heimilisfang,er_i_thjonustu,status&order=nafn`),
    rows(`v_next_inspection?base_id=eq.${baseId}&select=site_id,inspect_month`),
    rows(`v_stadir_skyrslu_stada?base_id=eq.${baseId}&select=site_id,report_year,inspect_month`),
    rows(`thjonustubeidni?${ERINDI_FILT}&customer_base_id=eq.${baseId}&deleted_at=is.null&status=not.in.(lokad,klarad)&select=id,fyrirtaeki_id,title,status,abyrgd,due_at,created_at&order=created_at.asc&limit=200`),
    rows(`portal_vidhald?base_id=eq.${baseId}&select=id,fyrirtaeki_id,heiti,naest,abyrgd,gildir_til,skirteini_heiti&order=naest.asc.nullslast&limit=600`),
  ]);
  const nafn = {}; sites.forEach((s) => { nafn[s.id] = s.nafn || s.heimilisfang || ('Eign ' + s.id); });
  const skodanir = { aEftir: [], naestu: [] };
  const nxtById = {}; nxt.forEach((r) => { if (r.inspect_month != null) nxtById[r.site_id] = r.inspect_month; });
  const stById = {}; st.forEach((r) => { stById[r.site_id] = r; });
  const i2 = nu.getFullYear() * 12 + nu.getMonth() + 1 + 2;   // næstu tveir mánuðir
  sites.forEach((s) => {
    if (s.er_i_thjonustu === false || /^(óvirkur|ovirkur|inactive)$/i.test(String(s.status || ''))) return;
    const r = stById[s.id] || {};
    const n = naestaSkodun(nxtById[s.id] != null ? nxtById[s.id] : r.inspect_month, r.report_year, nu);
    if (!n) return;
    const x = { eign: nafn[s.id], man: MAN[n.m - 1] + ' ' + n.y };
    if (n.seint) skodanir.aEftir.push(x); else if (n.idx <= i2) skodanir.naestu.push(x);
  });
  const verk = { okkar: [], eigin: [], frestur: [] };
  erindi.forEach((e) => {
    const x = { eign: nafn[e.fyrirtaeki_id] || '', titill: String(e.title || '').replace(/^\[[^\]]*\]\s*/, ''), stada: STADA[e.status] || 'Móttekið', dags: e.created_at, frestur: e.due_at };
    ((e.abyrgd || 'okkar') === 'okkar' ? verk.okkar : verk.eigin).push(x);
    if (e.due_at && new Date(e.due_at) <= i30) verk.frestur.push(x);
  });
  const vh = { aEftir: [], naestu: [], skirteini: [] };
  vidhald.forEach((r) => {
    const x = { eign: nafn[r.fyrirtaeki_id] || '', heiti: r.heiti, dags: r.naest, abyrgd: r.abyrgd };
    if (r.naest) { const d = new Date(r.naest); if (d < nu) vh.aEftir.push(x); else if (d <= i30) vh.naestu.push(x); }
    if (r.gildir_til && new Date(r.gildir_til) <= i60) vh.skirteini.push({ eign: x.eign, heiti: r.skirteini_heiti || r.heiti, dags: r.gildir_til, utrunnid: new Date(r.gildir_til) < nu });
  });
  const n = skodanir.aEftir.length + skodanir.naestu.length + verk.okkar.length + verk.eigin.length + vh.aEftir.length + vh.naestu.length + vh.skirteini.length;
  return { sites: sites.length, skodanir, verk, vh, n, brynt: skodanir.aEftir.length + vh.aEftir.length + vh.skirteini.filter((s) => s.utrunnid).length };
}

function html(felag, efni, slod) {
  const H = (t, n) => '<h3 style="margin:22px 0 6px;font:700 14px/1.3 Georgia,serif;color:#2b2b2b">' + esc(t) + (n != null ? ' <span style="color:#888;font-weight:400">· ' + n + '</span>' : '') + '</h3>';
  const UL = (L, f) => L.length ? '<ul style="margin:0;padding-left:18px;color:#333;font-size:13px;line-height:1.55">' + L.map((x) => '<li>' + f(x) + '</li>').join('') + '</ul>' : '<p style="margin:0;color:#888;font-size:13px">Ekkert.</p>';
  const E = (x) => '<b>' + esc(x.eign) + '</b>';
  const sk = efni.skodanir, vk = efni.verk, vh = efni.vh;
  let b = '<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:620px;margin:0 auto;color:#222">' +
    '<div style="background:#1d1f22;color:#f3e7c9;padding:16px 20px;border-radius:8px 8px 0 0"><div style="font:700 11px/1 ui-monospace,monospace;letter-spacing:.14em;opacity:.8">BRUNAHÓLF · SLÖKKVITÆKI EHF.</div>' +
    '<div style="font:700 20px/1.2 Georgia,serif;margin-top:6px">Vikuleg samantekt — ' + esc(felag) + '</div><div style="font-size:12px;opacity:.8;margin-top:4px">' + esc(dags(new Date())) + ' · ' + efni.sites + ' eignir</div></div>' +
    '<div style="border:1px solid #ddd;border-top:0;padding:4px 20px 18px;border-radius:0 0 8px 8px;background:#fff">';
  if (efni.brynt) b += '<div style="margin-top:14px;padding:10px 12px;background:#fbeeea;border-left:4px solid #b3261e;font-size:13px;color:#5a1a14"><b>' + efni.brynt + ' atriði á eftir</b> — skoðanir sem eru liðnar, viðhald sem er komið fram yfir eða útrunnin skírteini.</div>';
  else if (!efni.n) b += '<p style="margin-top:14px;font-size:13px;color:#333">Allt er á áætlun — engar skoðanir á eftir, engin opin verk og ekkert viðhald komið fram yfir.</p>';
  b += H('Skoðanir á eftir', sk.aEftir.length) + UL(sk.aEftir, (x) => E(x) + ' — áætluð ' + esc(x.man));
  b += H('Næstu skoðanir (2 mánuðir)', sk.naestu.length) + UL(sk.naestu, (x) => E(x) + ' — ' + esc(x.man));
  b += H('Opin verk hjá Slökkvitækjum ehf.', vk.okkar.length) + UL(vk.okkar, (x) => E(x) + ' — ' + esc(x.titill) + ' <span style="color:#888">(' + esc(x.stada) + ', ' + esc(dags(x.dags)) + ')</span>');
  b += H('Eigin verkefni opin', vk.eigin.length) + UL(vk.eigin, (x) => E(x) + ' — ' + esc(x.titill) + (x.frestur ? ' <span style="color:#b3261e">frestur ' + esc(dags(x.frestur)) + '</span>' : ''));
  b += H('Viðhald komið fram yfir', vh.aEftir.length) + UL(vh.aEftir, (x) => E(x) + ' — ' + esc(x.heiti) + ' <span style="color:#b3261e">(' + esc(dags(x.dags)) + ')</span>');
  b += H('Viðhald næstu 30 daga', vh.naestu.length) + UL(vh.naestu, (x) => E(x) + ' — ' + esc(x.heiti) + ' (' + esc(dags(x.dags)) + ')');
  b += H('Skírteini sem renna út (60 dagar)', vh.skirteini.length) + UL(vh.skirteini, (x) => E(x) + ' — ' + esc(x.heiti) + ' <span style="color:' + (x.utrunnid ? '#b3261e' : '#8a6d1f') + '">' + (x.utrunnid ? 'rann út ' : 'gildir til ') + esc(dags(x.dags)) + '</span>');
  b += '<p style="margin:24px 0 0;font-size:12px;color:#666">Allt í samhengi á þjónustugáttinni: <a href="' + esc(slod) + '" style="color:#1d4ed8">' + esc(slod) + '</a><br>Þessi póstur fer á mánudagsmorgnum meðan tólið „Vikuleg samantekt" er kveikt. Slökkvitæki ehf. slekkur á því eftir beiðni.</p>';
  return b + '</div></div>';
}

async function vidtakendur(u, einn) {
  if (einn) return [einn];
  const set = new Set();
  if (u.email && /@/.test(u.email)) set.add(String(u.email).trim().toLowerCase());
  const nr = await rows(`portal_notendur?base_id=eq.${u.base_id}&active=eq.true&hlutverk=in.(stjornandi,eldvarnarfulltrui)&select=email`);
  nr.forEach((n) => { if (n.email && /@/.test(n.email)) set.add(String(n.email).trim().toLowerCase()); });
  return [...set];
}

// Eitt félag: skilar {ok, sent_to, n} eða {ok:false, error}. opts: {origin, thvinga, vidtakandi}
async function sendaFelagi(u, opts) {
  opts = opts || {};
  const syn = VF.lesaSyn(u);
  const falid = u.stillingar && u.stillingar.verkfaeri && u.stillingar.verkfaeri.vikupostur === false;
  if (!opts.thvinga && (!u.active || !syn.vikupostur || falid)) return { ok: false, error: 'Vikupóstur ekki kveiktur á þessu félagi', skipped: true };
  if (opts.thvinga && !syn.vikupostur) return { ok: false, error: 'Kveiktu á rofanum „Vikuleg samantekt" fyrst' };
  const to = await vidtakendur(u, opts.vidtakandi);
  if (!to.length) return { ok: false, error: 'Ekkert netfang — settu netfang á aðganginn eða stjórnanda í Notendur' };
  const br = await rows(`customers_base?id=eq.${u.base_id}&select=id,nafn&limit=1`);
  const felag = u.display_name || (br[0] && br[0].nafn) || ('Félag ' + u.base_id);
  const efni = await safnaEfni(u.base_id);
  if (!opts.thvinga && !efni.n) return { ok: true, sent_to: [], n: 0, skipped: true, error: 'Allt tómt — ekkert sent' };
  const origin = opts.origin || 'https://slokkvitaeki.netlify.app';
  const slod = origin + '/gatt/' + (u.slug ? '?c=' + encodeURIComponent(u.slug) : '');
  const subject = 'Vikuleg samantekt — ' + felag + (efni.brynt ? ' · ' + efni.brynt + ' á eftir' : efni.n ? ' · ' + efni.n + ' atriði' : ' · allt á áætlun');
  const hdrs = { 'Content-Type': 'application/json' };
  if (process.env.EDGE_SHARED_KEY) hdrs['x-eldklar-key'] = process.env.EDGE_SHARED_KEY;
  let mres;
  try { mres = await fetch(origin + '/api/email-send', { method: 'POST', headers: hdrs, body: JSON.stringify({ from: MAIL_FROM, to, subject, html: html(felag, efni, slod) }) }); }
  catch (e) { return { ok: false, error: 'Póstur sendist ekki', detail: String((e && e.message) || e) }; }
  if (!mres.ok) { const t = await mres.text().catch(() => ''); return { ok: false, error: 'Póstur sendist ekki', detail: t.slice(0, 300) }; }
  return { ok: true, sent_to: to, n: efni.n, brynt: efni.brynt };
}

// Mánudagskeyrslan: öll virk félög með rofann kveiktan
exports.handler = async () => {
  if (!P.dbReady()) return { statusCode: 503, body: 'db' };
  const t0 = Date.now();
  const L = await rows('portal_users?active=eq.true&select=id,base_id,slug,email,display_name,syn,stillingar,active');
  const ut = [];
  for (const u of L) {
    const syn = VF.lesaSyn(u);
    if (!syn.vikupostur) continue;
    try { const r = await sendaFelagi(u, {}); ut.push({ base_id: u.base_id, ok: r.ok, n: r.n, to: (r.sent_to || []).length, skipped: !!r.skipped, error: r.error }); }
    catch (e) { ut.push({ base_id: u.base_id, ok: false, error: String((e && e.message) || e) }); }
  }
  console.log('[gatt-vikupostur] ' + ut.length + ' félög, ' + ut.filter((x) => x.ok && !x.skipped).length + ' send, ' + (Date.now() - t0) + ' ms', JSON.stringify(ut));
  return { statusCode: 200, body: JSON.stringify({ ok: true, felog: ut }) };
};
exports.sendaFelagi = sendaFelagi;
exports.safnaEfni = safnaEfni;
