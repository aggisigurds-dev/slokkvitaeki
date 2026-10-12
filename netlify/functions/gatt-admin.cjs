// gatt-admin.js — stjórnsíðan „Viðskiptavinavefir" (innri, starfsfólk).
//
//   GET  /api/gatt-admin              → { access[], messages[] }
//   GET  /api/gatt-admin?q=<leit>     → { companies[] }  (fyrirtækja-leit fyrir „velja fyrirtæki")
//   POST /api/gatt-admin { action, ... }
//     create        {base_id}                 → stofna aðgang (slug + URL, tómt netfang/lykilorð)
//     save          {id, email, password?}    → vista aðgangsorð (netfang) + lykilorð (hashað ef sett)
//     gen-password  {id}                       → búa til sterkt lykilorð, skila því EINU SINNI
//     clear-password{id}                       → hreinsa lykilorð (slekkur á innskráningu)
//     toggle        {id, active}               → virkja/afvirkja
//     delete        {id}                        → aftengja vef (eyða aðgangi)
//     send          {id, password?}            → senda kúnna URL + notandanafn (+ lykilorð) í pósti
//     reply-msg     {base_id, body}            → starfsmaður svarar fyrirspurn
//     mark-read     {base_id}                   → merkja fyrirspurnir félags lesnar
//
// ⚠️ Innri síða — arfar (skort á) auðkenningu hub-sins; á að vera á bak við
// væntanlega hub-innskráningu. Öll skrif nota service-role (aldrei í vafra).

const P = require('./_portal.cjs');
const crypto = require('crypto');
// Póstur fer gegnum slokkvitaeki /api/email-send (Resend). „from" verður að vera
// staðfest lén í Resend — stillanlegt með PORTAL_MAIL_FROM env.
const MAIL_FROM = process.env.PORTAL_MAIL_FROM || 'Slökkvitæki ehf <noreply@slokkvitaeki.is>';

function slugify(s) {
  return String(s || '').toLowerCase()
    .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ý/g, 'y')
    .replace(/þ/g, 'th').replace(/ð/g, 'd').replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'felag';
}
function genPassword() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const b = crypto.randomBytes(14); let o = '';
  for (let i = 0; i < 12; i++) o += a[b[i] % a.length];
  return o;
}
function origin(event) {
  const host = (event.headers && (event.headers.host || event.headers.Host)) || 'brunaholf.netlify.app';
  return 'https://' + host;
}
// Þemu Þjónustuvefsins (gatt/index.html :root[data-theme=…]). Annað gildi er hunsað.
const THEMES = ['steel', 'cream', 'boss', 'grafit', 'blar'];
const M = require('./_gatt-myndir.cjs');
const VF = require('./_gatt-verkfaeri.cjs');
async function verkListi() {
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const sel = 'id,customer_base_id,fyrirtaeki_id,title,summary,status,created_at,updated_at,tags,punktur,myndir,eftirmyndir,abyrgd,lokid_at,lokid_af,lokid_lysing,tilkynnt_at,einkunn,einkunn_ath,einkunn_at';
  const filt = 'and=(or(source.eq.gatt,tags.cs.' + encodeURIComponent('["gatt"]') + '),or(status.not.in.(lokad,klarad),updated_at.gte.' + encodeURIComponent(since) + '))';
  const r = await P.sbGet(`thjonustubeidni?${filt}&deleted_at=is.null&select=${sel}&order=created_at.desc&limit=150`);
  if (!r.ok) return [];
  const rows = await r.json();
  const paths = [];
  rows.forEach((x) => [].concat(x.myndir || [], x.eftirmyndir || []).forEach((m) => { if (m && m.path) paths.push(m.path); }));
  const slod = await M.undirrita(paths, 900);
  const fids = [...new Set(rows.map((x) => x.fyrirtaeki_id).filter(Boolean))];
  const fnafn = {}, haedir = {};
  if (fids.length) {
    const fr = await P.sbGet(`fyrirtaeki?id=in.(${fids.join(',')})&select=id,nafn,heimilisfang`);
    if (fr.ok) (await fr.json()).forEach((f) => { fnafn[f.id] = f; });
    const pf = [...new Set(rows.filter((x) => x.punktur && x.fyrirtaeki_id).map((x) => x.fyrirtaeki_id))];
    if (pf.length) {
      const tr = await P.sbGet(`teikning_bord?company_id=in.(${pf.join(',')})&select=company_id,haedir,image_url`);
      if (tr.ok) (await tr.json()).forEach((t) => {
        const hs = Array.isArray(t.haedir) && t.haedir.length ? t.haedir : (t.image_url ? [{ nafn: 'Teikning', image_url: t.image_url }] : []);
        haedir[t.company_id] = hs.map((h) => ({ nafn: h.nafn || '', mynd: h.image_url || null, frum: h.frum && h.frum.b > 0 ? { b: h.frum.b, h: h.frum.h } : null,
          skurdur: h.skurdur && h.skurdur.w > 8 ? { x: h.skurdur.x, y: h.skurdur.y, w: h.skurdur.w, h: h.skurdur.h } : null }));
      });
    }
  }
  const mynd = (L) => (Array.isArray(L) ? L : []).map((m) => m && m.path && slod[m.path] ? { url: slod[m.path], at: m.at || null, af: m.af || null } : null).filter(Boolean);
  return rows.map((x) => {
    const f = fnafn[x.fyrirtaeki_id] || {}, hs = haedir[x.fyrirtaeki_id] || [];
    const haed = x.punktur && hs[x.punktur.haed] ? hs[x.punktur.haed] : null;
    return { id: x.id, base_id: x.customer_base_id, fid: x.fyrirtaeki_id, eign: f.nafn || '', heimilisfang: f.heimilisfang || '', title: x.title, summary: x.summary || '',
      status: x.status, abyrgd: x.abyrgd || 'okkar', tags: Array.isArray(x.tags) ? x.tags : [], created_at: x.created_at, updated_at: x.updated_at,
      punktur: x.punktur || null, haed, myndir: mynd(x.myndir), eftirmyndir: mynd(x.eftirmyndir), lokid_at: x.lokid_at, lokid_af: x.lokid_af, lokid_lysing: x.lokid_lysing, tilkynnt_at: x.tilkynnt_at,
      einkunn: x.einkunn || null, einkunn_ath: x.einkunn_ath || null, einkunn_at: x.einkunn_at || null };
  });
}
function pubRow(r) { // aldrei skila pass_hash í vafra
  return { id: r.id, base_id: r.base_id, slug: r.slug, email: r.email || '', hasPassword: !!r.pass_hash,
    active: r.active, theme: r.theme, display_name: r.display_name, last_login: r.last_login, created_at: r.created_at,
    show_details: !!r.show_details, syn: (r.syn && typeof r.syn === 'object') ? r.syn : {} };
}
async function baseNames(ids) {
  const uniq = [...new Set(ids.filter((x) => x != null))];
  if (!uniq.length) return {};
  const r = await P.sbGet(`customers_base?id=in.(${uniq.join(',')})&select=id,nafn,kennitala`);
  const map = {};
  if (r.ok) (await r.json()).forEach((b) => { map[b.id] = b; });
  return map;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  if (!P.dbReady()) return P.json(503, { error: 'Supabase env vantar' });
  const _g = P.requireStaff(event); if (_g) return _g;

  try {
    // ── GET ──
    if (event.httpMethod === 'GET') {
      const q = (event.queryStringParameters || {}).q;
      if (q != null && String(q).trim()) {
        const enc = encodeURIComponent(String(q).trim());
        const r = await P.sbGet(`customers_base?or=(nafn.ilike.*${enc}*,kennitala.ilike.*${enc}*)&select=id,nafn,kennitala,rekstrarfelag&order=nafn&limit=40`);
        const companies = r.ok ? await r.json() : [];
        return P.json(200, { companies });
      }
      const ar = await P.sbGet('portal_users?select=*&order=created_at.desc');
      const access = ar.ok ? await ar.json() : [];
      const mr = await P.sbGet('portal_messages?select=*&order=created_at.desc&limit=100');
      const messages = mr.ok ? await mr.json() : [];
      // Verkbeiðnir og verkefni af þjónustuvef (11.10.2026): opin mál + þau sem lokað var síðustu 30 daga, með myndum
      // (undirritaðar úr einkamáls-bucketinu gatt) og hæðinni sem punkturinn situr á, svo starfsmaður sjái staðinn.
      const verk = await verkListi();
      // Notendur félaga (12.10.2026) + staðir hvers félags (til að afmarka notanda við eignir)
      const nr = await P.sbGet('portal_notendur?select=id,base_id,email,nafn,hlutverk,eignir,active,last_login,created_at,pass_hash&order=created_at.asc');
      const notendur = (nr.ok ? await nr.json() : []).map((n) => ({ id: n.id, base_id: n.base_id, email: n.email, nafn: n.nafn || '', hlutverk: n.hlutverk, eignir: n.eignir || null, active: n.active, last_login: n.last_login, hasPassword: !!n.pass_hash }));
      const bases = [...new Set(access.map((a) => a.base_id))];
      let stadir = [];
      if (bases.length) { const sr = await P.sbGet(`fyrirtaeki?customer_base_id=in.(${bases.join(',')})&deleted_at=is.null&select=id,customer_base_id,nafn,heimilisfang,er_i_thjonustu&order=nafn`); if (sr.ok) stadir = await sr.json(); }
      const names = await baseNames([...access.map((a) => a.base_id), ...messages.map((m) => m.base_id), ...verk.map((v) => v.base_id)]);
      verk.forEach((v) => { v.base_nafn = (names[v.base_id] || {}).nafn || ('#' + v.base_id); });
      return P.json(200, {
        access: access.map((a) => Object.assign(pubRow(a), { base_nafn: (names[a.base_id] || {}).nafn || ('#' + a.base_id) })),
        messages: messages.map((m) => ({ id: m.id, base_id: m.base_id, base_nafn: (names[m.base_id] || {}).nafn || ('#' + m.base_id),
          sender: m.sender, body: m.body, author_name: m.author_name, created_at: m.created_at, read_by_staff: m.read_by_staff })),
        verk, notendur, stadir,
      });
    }

    if (event.httpMethod !== 'POST') return P.json(405, { error: 'GET eða POST only' });
    let body; try { body = JSON.parse(event.body || '{}'); } catch { return P.json(400, { error: 'Ógilt JSON' }); }
    const action = body.action;

    if (action === 'create') {
      const baseId = parseInt(body.base_id, 10);
      if (!baseId) return P.json(400, { error: 'base_id vantar' });
      // Einn aðgangur per félag (einkvæmur lykill portal_users_base_id_key). Tvísmellur
      // bjó áður til -2 raðir (S&H Invest, S30 — eytt 10.10.2026).
      const dup = await P.sbGet(`portal_users?base_id=eq.${baseId}&select=id&limit=1`);
      if (dup.ok && (await dup.json()).length) return P.json(409, { error: 'Vefur er þegar til fyrir þetta félag' });
      const names = await baseNames([baseId]);
      const name = (names[baseId] || {}).nafn || ('Félag ' + baseId);
      // einkvæmt slug
      let slug = slugify(name);
      const ex = await P.sbGet(`portal_users?slug=like.${encodeURIComponent(slug)}*&select=slug`);
      const taken = new Set((ex.ok ? await ex.json() : []).map((x) => x.slug));
      if (taken.has(slug)) { let n = 2; while (taken.has(slug + '-' + n)) n++; slug = slug + '-' + n; }
      const ins = await P.sbPost('portal_users', { base_id: baseId, slug: slug, active: true, display_name: name });
      if (ins.status === 409) return P.json(409, { error: 'Vefur er þegar til fyrir þetta félag' });
      if (!ins.ok) return P.json(ins.status, { error: 'Gat ekki stofnað', detail: await ins.text() });
      const row = (await ins.json())[0];
      return P.json(200, { ok: true, row: pubRow(row), url: origin(event) + '/gatt/?c=' + slug });
    }

    if (action === 'save') {
      const id = String(body.id || '');
      if (!id) return P.json(400, { error: 'id vantar' });
      const patch = {};
      if (typeof body.email === 'string') patch.email = body.email.trim().toLowerCase() || null;
      if (typeof body.password === 'string' && body.password) patch.pass_hash = P.hashPassword(body.password);
      if (typeof body.display_name === 'string') patch.display_name = body.display_name.trim();
      if (typeof body.theme === 'string' && THEMES.includes(body.theme.trim())) patch.theme = body.theme.trim();
      // Hak: kúnni sér nánari upplýsingar um eign (tækjaskrá) þegar hann smellir á hana
      if (typeof body.show_details === 'boolean') patch.show_details = body.show_details;
      // Hvaða hlutar eignasíðunnar sjást — aðeins þekktir lyklar, aðeins true/false
      if (body.syn && typeof body.syn === 'object') {
        const s = {};
        VF.LYKLAR.forEach((k) => { if (typeof body.syn[k] === 'boolean') s[k] = body.syn[k]; });   // skráin: _gatt-verkfaeri.cjs
        patch.syn = s;
      }
      if (!Object.keys(patch).length) return P.json(400, { error: 'Ekkert til að vista' });
      const r = await P.sbPatch(`portal_users?id=eq.${id}&select=*`, patch);
      if (!r.ok) return P.json(r.status, { error: 'Villa', detail: await r.text() });
      return P.json(200, { ok: true, row: pubRow((await r.json())[0]) });
    }

    if (action === 'gen-password') {
      const id = String(body.id || '');
      if (!id) return P.json(400, { error: 'id vantar' });
      const pw = genPassword();
      const r = await P.sbPatch(`portal_users?id=eq.${id}&select=*`, { pass_hash: P.hashPassword(pw) });
      if (!r.ok) return P.json(r.status, { error: 'Villa', detail: await r.text() });
      return P.json(200, { ok: true, password: pw, row: pubRow((await r.json())[0]) });
    }

    // 09.10.2026 (Agnar: „komast inn á fyrirtækin" án lykilorðs kúnnans): starfsmaður opnar vef kúnna.
    // Einnota 2-mín hlekkur → gatt-login GET setur session og vísar á /gatt/. Sama hlið og restin af
    // stjórnsíðunni (requireStaff efst). Hver opnun skráð í agent_logs (sýnilegt spor).
    if (action === 'impersonate') {
      if (!P.envReady()) return P.json(503, { error: 'PORTAL_JWT_SECRET vantar' });
      const id = String(body.id || '');
      if (!id) return P.json(400, { error: 'id vantar' });
      const r = await P.sbGet(`portal_users?id=eq.${encodeURIComponent(id)}&select=id,base_id,slug,active,display_name&limit=1`);
      const u = r.ok ? (await r.json())[0] : null;
      if (!u) return P.json(404, { error: 'Aðgangur fannst ekki' });
      if (!u.active) return P.json(400, { error: 'Vefurinn er afvirkjaður — virkjaðu hann fyrst' });
      const t = P.signToken({ imp: u.id }, 120);
      try { await P.sbPost('agent_logs', { agent: 'gatt-admin', action: 'opna-sem-kunni', felag: String(u.base_id), target: String(u.display_name || u.slug).slice(0, 200), status: 'ok', by_who: 'starfsmadur' }); } catch (_) {}
      return P.json(200, { ok: true, url: origin(event) + '/api/gatt-login?imp=' + encodeURIComponent(t) });
    }

    if (action === 'clear-password') {
      const id = String(body.id || '');
      const r = await P.sbPatch(`portal_users?id=eq.${id}&select=*`, { pass_hash: null });
      if (!r.ok) return P.json(r.status, { error: 'Villa', detail: await r.text() });
      return P.json(200, { ok: true, row: pubRow((await r.json())[0]) });
    }

    if (action === 'toggle') {
      const id = String(body.id || '');
      const r = await P.sbPatch(`portal_users?id=eq.${id}&select=*`, { active: !!body.active });
      if (!r.ok) return P.json(r.status, { error: 'Villa', detail: await r.text() });
      return P.json(200, { ok: true, row: pubRow((await r.json())[0]) });
    }

    if (action === 'delete') {
      const id = String(body.id || '');
      const r = await fetch(`${P.SUPABASE_URL}/rest/v1/portal_users?id=eq.${id}`, {
        method: 'DELETE', headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}` },
      });
      if (!r.ok) return P.json(r.status, { error: 'Villa', detail: await r.text() });
      return P.json(200, { ok: true });
    }

    if (action === 'send') {
      const id = String(body.id || '');
      const gr = await P.sbGet(`portal_users?id=eq.${id}&select=*&limit=1`);
      const u = (gr.ok ? await gr.json() : [])[0];
      if (!u) return P.json(404, { error: 'Aðgangur finnst ekki' });
      const to = (body.to || u.email || '').trim();
      if (!to) return P.json(400, { error: 'Ekkert netfang til að senda á' });
      const url = origin(event) + '/gatt/?c=' + u.slug;
      const pw = (typeof body.password === 'string' && body.password) ? body.password : null;
      const html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222">' +
        '<p>Sæl/l,</p>' +
        '<p>Hér er aðgangur að þjónustuvef Slökkvitækja ehf. þar sem þú sérð stöðu brunavarna, úttektarskýrslur og reikninga fyrir ' + esc(u.display_name || 'félagið') + '.</p>' +
        '<p><b>Vefslóð:</b> <a href="' + esc(url) + '">' + esc(url) + '</a><br>' +
        '<b>Notandanafn:</b> ' + esc(u.email || '') + (pw ? '<br><b>Lykilorð:</b> ' + esc(pw) : '') + '</p>' +
        '<p style="color:#666;font-size:12px">Kveðja,<br>Slökkvitæki ehf.</p></div>';
      const hdrs = { 'Content-Type': 'application/json' };
      if (process.env.EDGE_SHARED_KEY) hdrs['x-eldklar-key'] = process.env.EDGE_SHARED_KEY;
      let mres;
      try {
        mres = await fetch(origin(event) + '/api/email-send', { method: 'POST', headers: hdrs,
          body: JSON.stringify({ from: MAIL_FROM, to: [to], subject: 'Aðgangur að þjónustuvef Slökkvitækja ehf.', html: html }) });
      } catch (e) { return P.json(502, { error: 'Póstur sendist ekki', detail: String((e && e.message) || e) }); }
      if (!mres.ok) { const t = await mres.text().catch(() => ''); return P.json(502, { error: 'Póstur sendist ekki', detail: t.slice(0, 300) }); }
      return P.json(200, { ok: true, sent_to: to });
    }

    // ── Notendur félags (portal_notendur) ──
    const HLUTVERK = ['stjornandi', 'eldvarnarfulltrui', 'skodandi', 'leigutaki'];
    const eignirInn = (x) => Array.isArray(x) ? [...new Set(x.map((v) => parseInt(v, 10)).filter(Boolean))].slice(0, 500) : null;
    if (action === 'notandi-add') {
      const baseId = parseInt(body.base_id, 10), email = String(body.email || '').trim().toLowerCase();
      if (!baseId || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return P.json(400, { error: 'Félag og gilt netfang vantar' });
      const dup = await P.sbGet(`portal_notendur?email=eq.${encodeURIComponent(email)}&select=id&limit=1`);
      if (dup.ok && (await dup.json()).length) return P.json(409, { error: 'Netfangið er þegar í notkun' });
      const pw = (typeof body.password === 'string' && body.password.length >= 8) ? body.password : genPassword();
      const eig = eignirInn(body.eignir);
      const ins = await P.sbPost('portal_notendur', { base_id: baseId, email, nafn: String(body.nafn || '').trim().slice(0, 120) || null, hlutverk: HLUTVERK.includes(body.hlutverk) ? body.hlutverk : 'stjornandi',
        eignir: eig && eig.length ? eig : null, pass_hash: P.hashPassword(pw), created_by: 'gatt-admin' });
      if (!ins.ok) return P.json(ins.status, { error: 'Gat ekki stofnað', detail: await ins.text() });
      return P.json(200, { ok: true, id: ((await ins.json())[0] || {}).id, password: pw });
    }
    if (action === 'notandi-save') {
      const id = String(body.id || ''); if (!id) return P.json(400, { error: 'id vantar' });
      const patch = {};
      if (typeof body.nafn === 'string') patch.nafn = body.nafn.trim().slice(0, 120) || null;
      if (HLUTVERK.includes(body.hlutverk)) patch.hlutverk = body.hlutverk;
      if (body.eignir !== undefined) { const eig = eignirInn(body.eignir); patch.eignir = eig && eig.length ? eig : null; }
      if (typeof body.active === 'boolean') patch.active = body.active;
      if (typeof body.email === 'string' && body.email.trim()) patch.email = body.email.trim().toLowerCase();
      if (typeof body.password === 'string' && body.password.length >= 8) patch.pass_hash = P.hashPassword(body.password);
      if (!Object.keys(patch).length) return P.json(400, { error: 'Ekkert til að vista' });
      const r = await P.sbPatch(`portal_notendur?id=eq.${encodeURIComponent(id)}&select=id`, patch);
      if (!r.ok) return P.json(r.status, { error: 'Villa', detail: await r.text() });
      return P.json(200, { ok: true });
    }
    if (action === 'notandi-pw') {
      const id = String(body.id || ''); if (!id) return P.json(400, { error: 'id vantar' });
      const pw = genPassword();
      const r = await P.sbPatch(`portal_notendur?id=eq.${encodeURIComponent(id)}&select=id`, { pass_hash: P.hashPassword(pw), failed_attempts: 0, locked_until: null });
      if (!r.ok) return P.json(r.status, { error: 'Villa' });
      return P.json(200, { ok: true, password: pw });
    }
    if (action === 'notandi-del') {
      const id = String(body.id || ''); if (!id) return P.json(400, { error: 'id vantar' });
      await fetch(`${P.SUPABASE_URL}/rest/v1/portal_notendur?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE', headers: { apikey: P.SUPABASE_KEY, Authorization: `Bearer ${P.SUPABASE_KEY}` } });
      return P.json(200, { ok: true });
    }
    if (action === 'notandi-send') {
      const id = String(body.id || ''); if (!id) return P.json(400, { error: 'id vantar' });
      const nr0 = await P.sbGet(`portal_notendur?id=eq.${encodeURIComponent(id)}&select=email,nafn,base_id&limit=1`);
      const n = nr0.ok ? (await nr0.json())[0] : null; if (!n) return P.json(404, { error: 'Notandi fannst ekki' });
      const ur = await P.sbGet(`portal_users?base_id=eq.${n.base_id}&select=slug,display_name&limit=1`);
      const u = ur.ok ? (await ur.json())[0] : null;
      const url = origin(event) + '/gatt/?c=' + ((u && u.slug) || '');
      const pw = (typeof body.password === 'string' && body.password) ? body.password : null;
      const html = '<div style="font-family:Arial,sans-serif;font-size:14px;color:#222"><p>Sæl/l' + (n.nafn ? ' ' + esc(n.nafn) : '') + ',</p>' +
        '<p>Hér er aðgangur þinn að þjónustugátt Slökkvitækja ehf. fyrir ' + esc((u && u.display_name) || 'félagið') + '.</p>' +
        '<p><b>Vefslóð:</b> <a href="' + esc(url) + '">' + esc(url) + '</a><br><b>Notandanafn:</b> ' + esc(n.email) + (pw ? '<br><b>Lykilorð:</b> ' + esc(pw) : '') + '</p>' +
        '<p style="color:#666;font-size:12px">Kveðja,<br>Slökkvitæki ehf.</p></div>';
      const hdrs = { 'Content-Type': 'application/json' }; if (process.env.EDGE_SHARED_KEY) hdrs['x-eldklar-key'] = process.env.EDGE_SHARED_KEY;
      let mres; try { mres = await fetch(origin(event) + '/api/email-send', { method: 'POST', headers: hdrs, body: JSON.stringify({ from: MAIL_FROM, to: [n.email], subject: 'Aðgangur að þjónustugátt Slökkvitækja ehf.', html }) }); } catch (e) { return P.json(502, { error: 'Póstur sendist ekki' }); }
      if (!mres.ok) return P.json(502, { error: 'Póstur sendist ekki', detail: (await mres.text().catch(() => '')).slice(0, 200) });
      return P.json(200, { ok: true, sent_to: n.email });
    }

    // Staða verkbeiðnar af vef (nytt → i_vinnslu). Lokun með eftirmynd fer um /api/verkbeidni-lokid.
    // Vikuleg samantekt „núna" fyrir eitt félag (sama fall og mánudagskeyrslan gatt-vikupostur.cjs) — krefst rofans vikupostur
    if (action === 'vikupostur-senda') {
      const id = parseInt(body.id, 10);
      if (!id) return P.json(400, { error: 'id vantar' });
      const ur = await P.sbGet(`portal_users?id=eq.${id}&select=id,base_id,email,syn,stillingar,active&limit=1`);
      const u = ur.ok ? (await ur.json())[0] : null;
      if (!u) return P.json(404, { error: 'Aðgangur fannst ekki' });
      const VP = require('./gatt-vikupostur.cjs');
      const res = await VP.sendaFelagi(u, { origin: origin(event), thvinga: true, vidtakandi: String(body.to || '').trim().toLowerCase() || null });
      return P.json(res.ok ? 200 : 502, res);
    }

    // Greining fasteignar: lesa skráningartöflur/byggingarlýsingar eignar ÁÐUR en opnað er fyrir kúnnann (Agnar 12.10.2026:
    // „að ég geti lesið þetta áður en ég opna á fyrir hann"). Sama beiðni og „Lesa skjölin" í appinu (451): röð í
    // automation_triggers (workflow bygging-ocr) sem brúin á skrifstofutölvunni les. Vafrinn sendir eign + ólesin skjöl
    // sem hann fékk úr bygging-uppl; hér er aðeins hreinsað, tvítekning varin og skrifað.
    if (action === 'ocr-bidja') {
      const sid = parseInt(body.site_id, 10);
      const fr = sid ? await P.sbGet(`fyrirtaeki?id=eq.${sid}&deleted_at=is.null&select=id,nafn,heimilisfang,customer_base_id&limit=1`) : null;
      const f = fr && fr.ok ? (await fr.json())[0] : null;
      if (!f) return P.json(404, { error: 'Eign fannst ekki' });
      const e = body.eign && typeof body.eign === 'object' ? body.eign : {};
      const landnr = String(e.landnr || '').replace(/\D/g, '').slice(0, 10);
      if (!landnr) return P.json(400, { error: 'Landnúmer vantar — bygging-uppl fann ekki eignina' });
      const skjol = (Array.isArray(body.skjol) ? body.skjol : []).slice(0, 6).map((x) => ({
        slod: String((x && x.slod) || '').slice(0, 500), tegund: String((x && x.tegund) || '').slice(0, 40), dags: String((x && x.dags) || '').slice(0, 20), lysing: String((x && x.lysing) || '').slice(0, 200),
      })).filter((x) => /^https:\/\//.test(x.slod));
      if (!skjol.length) return P.json(400, { error: 'Engin ólesin skjöl í beiðninni' });
      const fra = new Date(Date.now() - 30 * 60000).toISOString();
      const q = await P.sbGet(`automation_triggers?workflow=eq.bygging-ocr&gogn->>landnr=eq.${landnr}&status=in.(bida,pending,running)&requested_at=gt.${encodeURIComponent(fra)}&select=id,status&order=id.desc&limit=1`);
      const til = q.ok ? (await q.json())[0] : null;
      if (til) return P.json(200, { ok: true, id: til.id, i_gangi: true, n: skjol.length });
      const heimilisfang = String(body.heimilisfang || f.heimilisfang || '').slice(0, 200);
      const ins = await P.sbPost('automation_triggers', { workflow: 'bygging-ocr', status: 'bida', requested_by: 'gatt-admin',
        gogn: { landnr, heitinr: e.heitinr != null ? String(e.heitinr).slice(0, 10) : null, svf: e.svf != null ? String(e.svf).slice(0, 10) : null, heimilisfang, skjol, fyrirtaeki_id: f.id, base_id: f.customer_base_id } });
      if (!ins.ok) return P.json(ins.status, { error: 'Beiðnin vistaðist ekki', detail: (await ins.text().catch(() => '')).slice(0, 200) });
      let id = null; try { const r = await ins.json(); id = Array.isArray(r) && r[0] ? r[0].id : null; } catch (_) {}
      return P.json(200, { ok: true, id, n: skjol.length });
    }

    if (action === 'verk-stada') {
      const id = parseInt(body.id, 10), status = ['nytt', 'i_vinnslu'].includes(body.status) ? body.status : null;
      if (!id || !status) return P.json(400, { error: 'id/status vantar' });
      const r = await P.sbPatch(`thjonustubeidni?id=eq.${id}&select=id,status`, { status, updated_at: new Date().toISOString() });
      if (!r.ok) return P.json(r.status, { error: 'Villa', detail: await r.text() });
      return P.json(200, { ok: true });
    }

    if (action === 'reply-msg') {
      const baseId = parseInt(body.base_id, 10);
      const text = String(body.body || '').trim();
      if (!baseId || !text) return P.json(400, { error: 'base_id/body vantar' });
      const ins = await P.sbPost('portal_messages', { base_id: baseId, sender: 'starf', body: text, author_name: body.author_name || 'Slökkvitæki', read_by_staff: true });
      if (!ins.ok) return P.json(ins.status, { error: 'Villa', detail: await ins.text() });
      return P.json(200, { ok: true, row: (await ins.json())[0] });
    }

    if (action === 'mark-read') {
      const baseId = parseInt(body.base_id, 10);
      if (!baseId) return P.json(400, { error: 'base_id vantar' });
      await P.sbPatch(`portal_messages?base_id=eq.${baseId}&sender=eq.kunni`, { read_by_staff: true });
      return P.json(200, { ok: true });
    }

    return P.json(400, { error: 'Óþekkt aðgerð', action });
  } catch (e) {
    return P.json(500, { error: String((e && e.message) || e) });
  }
};

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
