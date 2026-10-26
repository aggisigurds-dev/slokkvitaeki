// _portal.js — öryggiskjarni Þjónustuvefsins (kúndavefur /gatt/).
//
// Sameiginleg hjálparföll fyrir gatt-login / gatt / gatt-doc:
//   • JWT (HS256) undirritað með node:crypto — engir aukapakkar.
//   • Lykilorð hashað með scrypt (salt per notanda), timing-safe samanburður.
//   • Session í HttpOnly + Secure + SameSite=Lax cookie (ekki localStorage).
//   • base_id kemur ALLTAF úr tokeninu — ALDREI úr slóð/beiðni (IDOR-vörn).
//
// Env sem þarf (Netlify): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// PORTAL_JWT_SECRET (langur tilviljanakenndur strengur — sett í Netlify, ALDREI
// committað). Ef PORTAL_JWT_SECRET vantar hafna föllin öllu (fail-closed).

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const JWT_SECRET   = process.env.PORTAL_JWT_SECRET || '';

const COOKIE = 'gatt_session';
const TTL_SECONDS = 60 * 60 * 8; // 8 klst session

// ── base64url ────────────────────────────────────────────────────────────────
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlJson(obj) { return b64url(JSON.stringify(obj)); }
function fromB64url(str) {
  str = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

// ── JWT (HS256) ──────────────────────────────────────────────────────────────
function signToken(payload, ttl = TTL_SECONDS) {
  if (!JWT_SECRET) throw new Error('PORTAL_JWT_SECRET vantar');
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttl };
  const head = { alg: 'HS256', typ: 'JWT' };
  const data = b64urlJson(head) + '.' + b64urlJson(body);
  const sig = b64url(crypto.createHmac('sha256', JWT_SECRET).update(data).digest());
  return data + '.' + sig;
}
function verifyToken(token) {
  if (!JWT_SECRET || !token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const data = parts[0] + '.' + parts[1];
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(data).digest();
  let given;
  try { given = fromB64url(parts[2]); } catch { return null; }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  let payload;
  try { payload = JSON.parse(fromB64url(parts[1]).toString('utf8')); } catch { return null; }
  if (!payload || typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

// ── Lykilorð (scrypt) ────────────────────────────────────────────────────────
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(pw), salt, 32);
  return 'scrypt$' + salt.toString('hex') + '$' + hash.toString('hex');
}
function verifyPassword(pw, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  let salt, expected;
  try { salt = Buffer.from(parts[1], 'hex'); expected = Buffer.from(parts[2], 'hex'); } catch { return false; }
  let got;
  try { got = crypto.scryptSync(String(pw), salt, expected.length); } catch { return false; }
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

// ── Cookies ──────────────────────────────────────────────────────────────────
function parseCookies(event) {
  const raw = (event.headers && (event.headers.cookie || event.headers.Cookie)) || '';
  const out = {};
  raw.split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function sessionCookie(token) {
  return `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${TTL_SECONDS}`;
}
function clearCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// Les session úr beiðni → { base_id, email, theme, name } eða null.
function getSession(event) {
  const token = parseCookies(event)[COOKIE];
  const p = verifyToken(token);
  if (!p || !p.base_id) return null;
  return { base_id: p.base_id, email: p.email, theme: p.theme || 'steel', name: p.name || '', uid: p.uid || null,
    hlutverk: ['stjornandi', 'eldvarnarfulltrui', 'skodandi', 'leigutaki'].includes(p.hlutverk) ? p.hlutverk : 'stjornandi',
    eignir: Array.isArray(p.eignir) ? p.eignir.map(Number).filter(Boolean) : null, staff: !!p.staff };
}

// ── Supabase (service-role — aðeins server-megin) ────────────────────────────
function sbGet(qs) {
  return fetch(`${SUPABASE_URL}/rest/v1/${qs}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
}
function sbPatch(qs, body) {
  return fetch(`${SUPABASE_URL}/rest/v1/${qs}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
}
function sbPost(table, body) {
  return fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
}

// ── HTTP svör ────────────────────────────────────────────────────────────────
// Kúndavefurinn og /api/* eru SAMA uppruni (brunaholf.netlify.app) svo við
// þurfum EKKI opið CORS. Referrer-Policy:no-referrer ver signed-URL leka.
function secHeaders(extra) {
  return { 'Content-Type': 'application/json', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store', ...(extra || {}) };
}
function json(code, body, extraHeaders) {
  return { statusCode: code, headers: secHeaders(extraHeaders), body: JSON.stringify(body) };
}

// ── QR-merki eignar (12.10.2026): token = "<fid>.<hmac>" yfir fyrirtaeki_id með JWT-leyndarmálinu — engin tafla ──
function signQr(fid) {
  if (!JWT_SECRET) return null;
  const sig = b64url(crypto.createHmac('sha256', JWT_SECRET).update('qr:' + String(fid)).digest()).slice(0, 22);
  return String(fid) + '.' + sig;
}
function verifyQr(t) {
  const m = /^(\d{1,10})\.([A-Za-z0-9_-]{22})$/.exec(String(t || ''));
  if (!m || !JWT_SECRET) return null;
  const expected = b64url(crypto.createHmac('sha256', JWT_SECRET).update('qr:' + m[1]).digest()).slice(0, 22);
  const a = Buffer.from(m[2]), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? parseInt(m[1], 10) : null;
}
function envReady() { return !!(SUPABASE_URL && SUPABASE_KEY && JWT_SECRET); } // login/session (þarf JWT)
function dbReady() { return !!(SUPABASE_URL && SUPABASE_KEY); }                 // stjórnsíða/status (aðeins DB)

// ── Starfsmanna-hlið (hub) — EIN sameiginleg innskráning fyrir innri tólin ────
// Virkjast AÐEINS þegar HUB_STAFF_PASSWORD er sett í Netlify-env. Meðan hún er
// ekki sett skilar requireStaff null (hleypir öllu í gegn) svo EKKERT brotni —
// staðuppsetning fyrir áfanga-útrás (Agnar 02.09.2026: „viðbótar auth á öllum
// stöðum"). Cookie-lykillinn ER lykilorðið sjálft: að skipta um
// HUB_STAFF_PASSWORD ógildir öll starfsmanna-session sjálfkrafa.
const HUB_PW = process.env.HUB_STAFF_PASSWORD || '';
const STAFF_COOKIE = 'hub_session';
const STAFF_TTL = 60 * 60 * 10; // 10 klst

function hubConfigured() { return !!HUB_PW; }
function signStaff(ttl = STAFF_TTL) {
  const now = Math.floor(Date.now() / 1000);
  const data = b64urlJson({ alg: 'HS256', typ: 'JWT' }) + '.' + b64urlJson({ role: 'staff', iat: now, exp: now + ttl });
  const sig = b64url(crypto.createHmac('sha256', HUB_PW).update(data).digest());
  return data + '.' + sig;
}
function verifyStaff(token) {
  if (!HUB_PW || !token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const data = parts[0] + '.' + parts[1];
  const expected = crypto.createHmac('sha256', HUB_PW).update(data).digest();
  let given;
  try { given = fromB64url(parts[2]); } catch { return null; }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  let p;
  try { p = JSON.parse(fromB64url(parts[1]).toString('utf8')); } catch { return null; }
  if (!p || p.role !== 'staff' || typeof p.exp !== 'number' || p.exp < Math.floor(Date.now() / 1000)) return null;
  return p;
}
function staffFromEvent(event) { return verifyStaff(parseCookies(event)[STAFF_COOKIE]); }
function staffCookie(token) {
  return `${STAFF_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${STAFF_TTL}`;
}
function clearStaffCookie() {
  return `${STAFF_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
function checkStaffPassword(pw) {
  if (!HUB_PW) return false;
  const a = crypto.createHash('sha256').update(String(pw)).digest();
  const b = crypto.createHash('sha256').update(HUB_PW).digest();
  return crypto.timingSafeEqual(a, b);
}
// Setjið FREMST í handler (á eftir OPTIONS): const g = P.requireStaff(event); if (g) return g;
function requireStaff(event) {
  if (!HUB_PW) return null;                 // óvirkt þar til lykilorð er sett — brýtur ekkert
  if (staffFromEvent(event)) return null;   // gilt starfsmanna-session
  return json(401, { error: 'Innskráning starfsmanns vantar', need_login: true });
}

// ── Rekstrarfélag = hópur félaga (26.10.2026, Agnar: „settu allar eignir tengt Heimaleigu inn í þeirra gátt … ath
//    rekstrarfélög"). Heimildin er merkið customers_base.rekstrarfelag — SAMA merki og Rekstrarfélög-flipinn í appinu
//    (175) les; enginn sér-listi í gáttinni. Gáttin á base_id sínu sér því líka staði systkinafélaganna (Heimaleiga ehf
//    → S30, S&H Invest, G14, húsfélag Bríetartúns, Mannheimar, EA Law, Aegina, Eldsalir). Skilar alltaf baseId sjálfu.
async function baseHopur(baseId) {
  const ut = { ids: [Number(baseId)], nofn: {}, kt: [], merki: null };
  try {
    const r0 = await sbGet(`customers_base?id=eq.${Number(baseId)}&select=id,nafn,kennitala,rekstrarfelag&limit=1`);
    const b0 = r0.ok ? (await r0.json())[0] : null;
    if (!b0) return ut;
    ut.nofn[b0.id] = b0.nafn || ''; if (b0.kennitala) ut.kt.push(String(b0.kennitala));
    const merki = String(b0.rekstrarfelag || '').trim();
    if (!merki) return ut;
    ut.merki = merki;
    // AÐEINS höfuðfélagið sér hópinn — félagið sem BER nafn merkisins („Heimaleiga ehf" fyrir merkið „Heimaleiga").
    // S&H Invest og S30 eru líka merkt Heimaleiga og eiga eigin gáttir; þær sýna áfram aðeins sitt (sjálfstæðir lögaðilar
    // mega ekki sjá reikninga hvor annars). Hópur án höfuðfélags (Eignaumsjón: 66 húsfélög) víkkar ekkert.
    const fold = (x) => String(x || '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (fold(b0.nafn).indexOf(fold(merki)) !== 0) return ut;
    const baeta = (b) => {
      const id = Number(b.id); if (!id || ut.ids.includes(id)) return;
      ut.ids.push(id); ut.nofn[id] = b.nafn || ''; if (b.kennitala) ut.kt.push(String(b.kennitala));
    };
    const r1 = await sbGet(`customers_base?rekstrarfelag=eq.${encodeURIComponent(merki)}&select=id,nafn,kennitala&order=id`);
    if (r1.ok) (await r1.json()).forEach(baeta);
    // Seinni helmingur Rekstrarfélags-skrárinnar (Agnar 26.10.2026: „Laugavegur 42 inn hjá Heimaleigu"): handskráðu
    // byggingarnar í AppSettings.rekstrarfelog[merki].buildings (kennitölur) — félag sem ber ANNAÐ lifandi merki
    // (húsfélagið Laugavegi 42 er Eignaumsjónar) kemur samt inn þegar það er skráð á rekstrarfélagið.
    try {
      const r2 = await sbGet('app_settings?id=eq.1&select=settings->rekstrarfelog');
      const rf = r2.ok ? ((await r2.json())[0] || {}).rekstrarfelog : null;
      const blds = rf && rf[merki] && Array.isArray(rf[merki].buildings) ? rf[merki].buildings : [];
      const kts = [...new Set(blds.map((b) => String((b && b.kt) || '').replace(/\D/g, '')).filter((k) => k.length === 10))];
      const til = new Set(ut.kt.map((k) => String(k).replace(/\D/g, '')));
      const ny = kts.filter((k) => !til.has(k));
      if (ny.length) {
        const q = ny.map((k) => '"' + k.slice(0, 6) + '-' + k.slice(6) + '","' + k + '"').join(',');
        const r3 = await sbGet(`customers_base?kennitala=in.(${q})&select=id,nafn,kennitala&order=id`);
        if (r3.ok) (await r3.json()).forEach(baeta);
      }
    } catch (_) {}
  } catch (_) {}
  return ut;
}

module.exports = {
  hubConfigured, signStaff, verifyStaff, staffFromEvent, staffCookie, clearStaffCookie, checkStaffPassword, requireStaff, STAFF_COOKIE,
  COOKIE, TTL_SECONDS,
  signToken, verifyToken, hashPassword, verifyPassword,
  parseCookies, sessionCookie, clearCookie, getSession,
  sbGet, sbPatch, sbPost, json, secHeaders, envReady, dbReady, baseHopur,
  signQr, verifyQr,
  SUPABASE_URL, SUPABASE_KEY,
};
