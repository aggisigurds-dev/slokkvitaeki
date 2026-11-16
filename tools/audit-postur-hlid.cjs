#!/usr/bin/env node
/* audit-postur-hlid — póstsending appsins fer ALLTAF um /api/postur-senda, sem krefst innskráningar (15.11.2026).
 *
 * Póstþjónninn er brunaholf /api/gmail-send. Hann svaraði öllum án innskráningar: hver sem er gat sent póst sem
 * eldklar@/bokhald@ og látið senda sér skrár úr Drive-inu. Agnar 15.11.2026: „Já, smíða" — „aðeins innskráðir geti
 * sent". gmail-send krefst nú innskráningar á Brunahólfi eða tíma-tóka (x-postur-toki). Þessi vörður sér um
 * Slökkvitæki-hliðina, bæði með lestri og HEGÐUN (föllin keyrð á stubbum — netvörður 15.11.: textaleit ein og sér
 * stóðst stökkbreytingar sem slökktu á hliðinu):
 *   1. enginn vafrakóði kallar beint á brunaholf.netlify.app/api/gmail-send;
 *   2. postur-senda.cjs: án innskráningar → 401 og EKKERT áframsent; innskráður → áfram til gmail-send með gildum tóka;
 *   3. 254 (AppMail) og Rýmingaráætlun nota /api/postur-senda;
 *   4. brúin í 254: skeyti frá öðrum uppruna eða glugga sem er ekki iframe í appinu → hunsað; úr Brunahólfs-iframe →
 *      sent á /api/postur-senda og svarað á brunaholf-uppruna;
 *   5. hvert fall sem kallar á gmail-send sendir tókann, og tókinn er AÐEINS myntaður í hub-adgangar.cjs (session_secret
 *      úr sameiginlega grunninum). 16.11.2026: tóki úr SUPABASE_SERVICE_ROLE_KEY var hafnað í loftinu — lykillinn er
 *      ólíkur á vefjunum — og lokunin var afturkölluð.
 * Systurhliðin (brunaholf/gmail-send.js) er skoðuð ef repo-ið er við höndina — ⚠ en ekki rautt (mappan getur verið
 * á eftir origin); brunaholf prófar hliðið sjálft í tools/test-gmail-send-hlid.cjs (keyrt í CI þar).
 * Ekkert net, engir lyklar — keyrir líka í `audit-all --static`.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROT = path.join(__dirname, '..');
const les = (r) => fs.readFileSync(path.join(ROT, r), 'utf8');
// Athugasemdir burt: /* … */, heilar //-línur OG //-hali á línu (utan strengja, svo https:// í streng lifir).
function anHala(lina) {
  let q = null;
  for (let i = 0; i < lina.length; i++) {
    const c = lina[i];
    if (q) { if (c === '\\') i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === '/' && lina[i + 1] === '/') return lina.slice(0, i);
  }
  return lina;
}
const anAths = (t) => t.replace(/\/\*[\s\S]*?\*\//g, (b) => b.replace(/[^\n]/g, ' ')).split('\n').map(anHala).join('\n');
const villur = [];
const vidvaranir = [];

// 1. enginn vafrakóði á beina slóð
function ganga(dir, ut) {
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '_attic', 'docs', 'tools', 'netlify', '.claude', 'graphify-out'].includes(n.name)) continue;
    const p = path.join(dir, n.name);
    if (n.isDirectory()) ganga(p, ut);
    else if (/\.(js|html|mjs)$/.test(n.name)) ut.push(p);
  }
  return ut;
}
const BEIN = /brunaholf\.netlify\.app\/api\/gmail-send/;
for (const f of ganga(ROT, [])) {
  const t = anAths(fs.readFileSync(f, 'utf8'));
  if (BEIN.test(t)) villur.push(`${path.relative(ROT, f)}: kallar beint á brunaholf /api/gmail-send — notaðu /api/postur-senda (eða AppMail.send)`);
}

// 2. millifallið — lestur + hegðun
const ps = anAths(les('netlify/functions/postur-senda.cjs'));
if (!/const\s+g\s*=\s*await\s+H\.krefjastStarfsmanns\(\s*event\s*\)\s*;\s*\n\s*if\s*\(\s*g\s*\)\s*return\s+g\s*;/.test(ps)) {
  villur.push('postur-senda.cjs: `const g = await H.krefjastStarfsmanns(event); if (g) return g;` vantar — hver sem er gæti sent póst');
}

// 3. kallendur
const s254 = anAths(les('js/patches/254-receipt-sender.js'));
if (!/const\s+GMAIL_SEND_API\s*=\s*'\/api\/postur-senda'/.test(s254)) villur.push('254: GMAIL_SEND_API er ekki /api/postur-senda');
const ryming = anAths(les('rymingaraetlun/index.html'));
if (!/const\s+GMAIL_SEND_API\s*=\s*'\/api\/postur-senda'/.test(ryming)) villur.push('rymingaraetlun: GMAIL_SEND_API er ekki /api/postur-senda');

// 4. brúin — lestur
const bru = (/window\.addEventListener\('message'[\s\S]*?postur-senda-svar[\s\S]*?\}\);/.exec(s254) || [''])[0];
if (!bru) villur.push('254: brúin fyrir innfelldar Brunahólfs-síður fannst ekki (postur-senda-svar)');
else {
  if (!/if\s*\(\s*e\.origin\s*!==\s*BH_ORIGIN\s*\)\s*return\s*;/.test(bru)) villur.push('254 brú: uppruni skeytis ekki athugaður (if (e.origin !== BH_ORIGIN) return;)');
  if (!/const\s+fraIframe\s*=[^;]*contentWindow\s*===\s*e\.source/.test(bru) || !/if\s*\(\s*!\s*fraIframe\s*\)\s*return\s*;/.test(bru)) villur.push('254 brú: ekki athugað að skeytið komi úr iframe í appinu (if (!fraIframe) return;)');
  if (!/BH_ORIGIN\s*=\s*'https:\/\/brunaholf\.netlify\.app'/.test(s254)) villur.push('254 brú: BH_ORIGIN er ekki brunaholf.netlify.app');
}

// 5. þjónn sem kallar á gmail-send — HVERT fall sem nefnir slóðina verður að senda tókann (hub-adgangar, afgreidsla,
//    postur-senda …); annars svarar gmail-send 401 og pósturinn fer hljóðlaust ekki.
const FDIR = path.join(ROT, 'netlify', 'functions');
for (const f of fs.readdirSync(FDIR).filter((n) => /\.(c?js|mjs)$/.test(n))) {
  const t = anAths(fs.readFileSync(path.join(FDIR, f), 'utf8'));
  if (!/\/api\/gmail-send/.test(t)) continue;
  if (!/x-postur-toki|POSTUR_HAUS/.test(t) || !/posturToki\(/.test(t)) villur.push(`${f}: kallar á gmail-send án tíma-tókans (x-postur-toki + posturToki()) — svarar 401`);
}
for (const f of fs.readdirSync(FDIR).filter((n) => /\.(c?js|mjs)$/.test(n) && n !== 'hub-adgangar.cjs')) {
  const t = anAths(fs.readFileSync(path.join(FDIR, f), 'utf8'));
  if (/postur-senda\|/.test(t)) villur.push(`${f}: myntar póst-tóka sjálft — notaðu HUB.posturToki() (þjónustulyklarnir eru ólíkir á vefjunum; 16.11.2026)`);
}
const hub = anAths(les('netlify/functions/hub-adgangar.cjs'));
const kall = (/fetch\(MAIL_ORIGIN \+ '\/api\/gmail-send'[\s\S]{0,200}/.exec(hub) || [''])[0];
if (!kall) vidvaranir.push('hub-adgangar.cjs: fann ekki gmail-send kallið — uppfærðu vörðinn');
else if (!/\[POSTUR_HAUS\]\s*:\s*await\s+posturToki\(stilling\)/.test(kall)) villur.push('hub-adgangar.cjs: aðgangspóstur fer án tóka — gmail-send svarar 401');

// systurhliðin
const sib = path.join(ROT, '..', 'brunaholf', 'netlify', 'functions', 'gmail-send.js');
if (fs.existsSync(sib)) {
  const g = anAths(fs.readFileSync(sib, 'utf8'));
  const iG = g.search(/const\s+g\s*=\s*await\s+hlid\(event\)/), iGet = g.search(/httpMethod\s*===\s*'GET'/);
  if (iG < 0 || !/erGildurToki/.test(g)) vidvaranir.push('brunaholf/gmail-send.js: hliðið sést ekki — opið, eða brunaholf-mappan á eftir origin (git pull)');
  else if (iGet >= 0 && iGet < iG) vidvaranir.push('brunaholf/gmail-send.js: GET svarað áður en hliðið er spurt');
}

// ── HEGÐUN ─────────────────────────────────────────────────────────────────────────────────────────────────────
(async () => {
  const LYKILL = 'audit-lykill';
  process.env.SUPABASE_SERVICE_ROLE_KEY = LYKILL;
  const rett = (tok) => tok === 'audit-toki';
  const hubPath = require.resolve(path.join(ROT, 'netlify', 'functions', 'hub-adgangar.cjs'));
  require.cache[hubPath] = { id: hubPath, filename: hubPath, loaded: true, exports: { POSTUR_HAUS: 'x-postur-toki', posturToki: async () => 'audit-toki', handler: async () => ({ statusCode: 200, body: '{}' }) } };

  // 2. postur-senda.cjs á stubbuðu hliði og neti
  const FN = path.join(ROT, 'netlify', 'functions');
  const shPath = require.resolve(path.join(FN, '_starfshlid.cjs'));
  let innskradur = false;
  require.cache[shPath] = { id: shPath, filename: shPath, loaded: true, exports: {
    krefjastStarfsmanns: async () => (innskradur ? null : { statusCode: 401, headers: {}, body: '{"need_login":true}' }) } };
  const kallad = [];
  const fetchAdur = global.fetch;
  global.fetch = async (url, opt = {}) => { kallad.push({ url: String(url), opt }); return { status: 200, text: async () => '{"ok":true}' }; };
  try {
    const PS = require(path.join(FN, 'postur-senda.cjs'));
    const ev = (m) => ({ httpMethod: m, headers: { host: 'slokkvitaeki.netlify.app', cookie: 'hub_user=x' }, body: '{"to":["a@b.is"]}', queryStringParameters: {} });
    let r = await PS.handler(ev('POST'));
    if (r.statusCode !== 401 || kallad.length) villur.push(`postur-senda (hegðun): óinnskráður fékk ${r.statusCode} og ${kallad.length} köll fóru áfram — á að vera 401 og 0`);
    r = await PS.handler(ev('GET'));
    if (r.statusCode !== 401 || kallad.length) villur.push(`postur-senda (hegðun): óinnskráður GET fékk ${r.statusCode} og ${kallad.length} köll fóru áfram — á að vera 401 og 0`);
    innskradur = true;
    r = await PS.handler(ev('POST'));
    const k = kallad[0] || { opt: {} };
    const h = k.opt.headers || {};
    if (r.statusCode !== 200 || k.url !== 'https://brunaholf.netlify.app/api/gmail-send' || !rett(h['x-postur-toki']) || k.opt.body !== '{"to":["a@b.is"]}') {
      villur.push('postur-senda (hegðun): innskráð sending fór ekki óbreytt til brunaholf gmail-send með gildum tóka');
    }
    if (h.cookie || h.Cookie) villur.push('postur-senda (hegðun): kaka notandans fór áfram til brunaholf');
  } catch (e) { villur.push('postur-senda (hegðun): hrundi — ' + String((e && e.message) || e)); }
  global.fetch = fetchAdur;

  // 4. brúin í 254 í gervi-glugga
  try {
    const BHO = 'https://brunaholf.netlify.app';
    const L = [], svor = [], postad = [];
    const barn = { postMessage: (d, o) => svor.push({ d, o }) };
    const okunnur = { postMessage: (d, o) => svor.push({ d, o, okunnur: true }) };
    const w = { addEventListener: (t, f) => { if (t === 'message') L.push(f); }, console: { log() {}, warn() {} },
      document: { querySelectorAll: (s) => (s === 'iframe' ? [{ contentWindow: barn }] : []), addEventListener() {}, getElementById: () => null },
      localStorage: { getItem: () => null, setItem() {} }, logProblem() {}, setTimeout, clearTimeout, JSON, Promise, String, Array, Object, Number, Date, RegExp, Math,
      fetch: async (url, opt) => { postad.push({ url, body: opt && opt.body }); return { status: 200, json: async () => ({ ok: true }) }; } };
    w.window = w;
    vm.runInNewContext(les('js/patches/254-receipt-sender.js'), w);
    const senda = (ev) => Promise.all(L.map((f) => f(ev)));
    const P = { type: 'postur-senda', id: 'a1', payload: { prufa: true } };
    await senda({ origin: 'https://vondur.example', source: barn, data: P });
    await senda({ origin: BHO, source: okunnur, data: P });
    if (postad.length || svor.length) villur.push('254 brú (hegðun): skeyti frá öðrum uppruna eða glugga utan appsins var sent áfram');
    await senda({ origin: BHO, source: barn, data: P });
    if (postad.length !== 1 || postad[0].url !== '/api/postur-senda' || postad[0].body !== '{"prufa":true}' || svor.length !== 1 || svor[0].o !== BHO || svor[0].d.type !== 'postur-senda-svar' || svor[0].d.id !== 'a1') {
      villur.push('254 brú (hegðun): skeyti úr Brunahólfs-iframe fór ekki óbreytt á /api/postur-senda eða svarið kom ekki til baka á brunaholf-uppruna');
    }
  } catch (e) { villur.push('254 brú (hegðun): hrundi — ' + String((e && e.message) || e)); }

  for (const v of vidvaranir) console.log('   ⚠ ' + v);
  if (villur.length) {
    console.log(`RED: ${villur.length} brot á póstleið appsins`);
    for (const v of villur) console.log('   • ' + v);
    process.exit(1);
  }
  console.log('✅ GRÆNT póstleið: allur póstur appsins fer um /api/postur-senda (innskráning + tóki, prófað á hegðun); brúin tekur aðeins við úr Brunahólfs-iframe.');
})();
