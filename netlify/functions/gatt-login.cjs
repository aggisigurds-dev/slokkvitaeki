// gatt-login.js — innskráning viðskiptavinar á Þjónustuvefinn (/gatt/).
//
//   POST /api/gatt-login { email, password }   → setur session-cookie
//   POST /api/gatt-login { action:'logout' }    → hreinsar cookie
//
// Netfang + lykilorð (stofnað af starfsfólki á stjórnsíðunni). base_id úr
// portal_users fer í undirritað JWT → einangrun. Læsing eftir of margar
// tilraunir. Almenn villuskilaboð (ljóstra ekki upp hvort netfang er til).

const P = require('./_portal.cjs');

const MAX_FAILS = 8;
const LOCK_MINUTES = 15;
// dummy-hash svo timing sé svipað þegar netfang finnst EKKI (enumeration-vörn)
const DUMMY = 'scrypt$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: P.secHeaders(), body: '' };
  // 09.10.2026 — starfsmaður opnar vef kúnna: einnota 2-mín hlekkur úr gatt-admin `impersonate`.
  if (event.httpMethod === 'GET') {
    const imp = (event.queryStringParameters || {}).imp;
    const fail = (msg) => ({ statusCode: 403, headers: P.secHeaders({ 'Content-Type': 'text/html; charset=utf-8' }),
      body: '<meta charset="utf-8"><p style="font:16px system-ui;padding:24px">' + msg + '</p>' });
    if (!imp || !P.envReady()) return fail('Ógildur hlekkur.');
    const t = P.verifyToken(imp);
    if (!t || !t.imp || t.base_id) return fail('Hlekkurinn er útrunninn — opnaðu aftur af stjórnborðinu.');
    const r = await P.sbGet(`portal_users?id=eq.${encodeURIComponent(String(t.imp))}&select=*&limit=1`);
    const u = r.ok ? (await r.json())[0] : null;
    if (!u || !u.active) return fail('Aðgangur fannst ekki eða er afvirkjaður.');
    const token = P.signToken({ base_id: u.base_id, email: u.email || '', theme: u.theme || 'steel', name: u.display_name || '', staff: true });
    return { statusCode: 302, headers: P.secHeaders({ 'Set-Cookie': P.sessionCookie(token), Location: '/gatt/?c=' + encodeURIComponent(u.slug || '') }), body: '' };
  }
  if (event.httpMethod !== 'POST') return P.json(405, { error: 'POST only' });
  if (!P.envReady()) return P.json(503, { error: 'Þjónustuvefur ekki uppsettur (env vantar)' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return P.json(400, { error: 'Ógilt JSON' }); }

  // ── Útskráning ──
  if (body.action === 'logout') {
    return P.json(200, { ok: true }, { 'Set-Cookie': P.clearCookie() });
  }

  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) return P.json(400, { error: 'Netfang og lykilorð vantar' });

  try {
    // 12.10.2026 — notendur félags (portal_notendur: hlutverk + eignir) ganga fyrir; gamli félagsaðgangurinn
    // (portal_users.email) er áfram til sem stjórnandi.
    const nr = await P.sbGet(`portal_notendur?email=eq.${encodeURIComponent(email)}&select=*&limit=1`);
    const notandi = nr.ok ? ((await nr.json())[0] || null) : null;
    const tafla = notandi ? 'portal_notendur' : 'portal_users';
    let user = notandi;
    if (!user) {
      const r = await P.sbGet(`portal_users?email=eq.${encodeURIComponent(email)}&select=*&limit=1`);
      const rows = r.ok ? await r.json() : [];
      user = rows[0] || null;
    }

    // Læst? (raunverulegur notandi þarf að vita það)
    if (user && user.locked_until && new Date(user.locked_until) > new Date()) {
      return P.json(429, { error: 'Of margar tilraunir. Reyndu aftur eftir smá stund.' });
    }

    // Staðfesta lykilorð (keyrum líka dummy þegar notandi finnst ekki → svipað timing)
    const ok = user && user.active && user.pass_hash
      ? P.verifyPassword(password, user.pass_hash)
      : (P.verifyPassword(password, DUMMY) && false);

    if (!ok) {
      if (user) {
        const fails = (user.failed_attempts || 0) + 1;
        const patch = { failed_attempts: fails };
        if (fails >= MAX_FAILS) patch.locked_until = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
        try { await P.sbPatch(`${tafla}?id=eq.${user.id}`, patch); } catch (_) {}
      }
      return P.json(401, { error: 'Rangt netfang eða lykilorð' });
    }

    // Tókst → núllstilla teljara, stimpla innskráningu, mint token
    try {
      await P.sbPatch(`${tafla}?id=eq.${user.id}`, {
        failed_attempts: 0, locked_until: null, last_login: new Date().toISOString(),
      });
    } catch (_) {}

    let token, nafn, theme;
    if (notandi) {
      // þema og heiti félagsins úr félagsaðganginum
      let felag = null;
      try { const fr = await P.sbGet(`portal_users?base_id=eq.${notandi.base_id}&active=eq.true&select=theme,display_name&limit=1`); felag = fr.ok ? ((await fr.json())[0] || null) : null; } catch (_) {}
      theme = (felag && felag.theme) || 'steel'; nafn = notandi.nafn || (felag && felag.display_name) || '';
      token = P.signToken({ base_id: notandi.base_id, email: notandi.email, theme, name: nafn, uid: notandi.id, hlutverk: notandi.hlutverk,
        eignir: Array.isArray(notandi.eignir) && notandi.eignir.length ? notandi.eignir : null });
    } else {
      theme = user.theme || 'steel'; nafn = user.display_name || '';
      token = P.signToken({ base_id: user.base_id, email: user.email, theme, name: nafn, hlutverk: 'stjornandi' });
    }
    return P.json(200, { ok: true, name: nafn, theme }, { 'Set-Cookie': P.sessionCookie(token) });
  } catch (e) {
    return P.json(500, { error: String((e && e.message) || e) });
  }
};
