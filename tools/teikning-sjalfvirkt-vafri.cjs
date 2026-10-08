#!/usr/bin/env node
/**
 * Vafrapróf frá enda til enda: „Sjálfvirkt" í Teikning-glugganum (383) → TurboPaint ?sjalfvirkt=1 → aftur í Teikningu
 * („· sjálfvirkt" á hæðaflipanum, vinnumyndin smíðuð upp á nýtt — 445). Agnar 08.10.2026.
 *
 *   node tools/teikning-sjalfvirkt-vafri.cjs [--tp http://localhost:4127] [--ut <mappa>]
 *
 * AÐEINS prófunarfélagið 1404 („Test fyrirtæki", hæðir t1404h1 / t1404h2 = afrit Álfaborgar) fær raunveruleg skrif:
 * teikning_bord (company_id 1404), vinnumynd/1404/ í geymslu og veggjavel-beiðni fyrir 1404. ÖLL önnur skrif í Supabase og
 * Netlify-föll eru GRIPIN og svarað 200 — talið og staðfest í lokin. Lifandi TurboPaint (kjarni.vercel.app) er aldrei
 * opnað: slóðin sem takkinn opnar er lesin og sama fyrirspurn keyrð á staðbundna TurboPaint (--tp).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
let chromium;
try { ({ chromium } = require('playwright')); } catch (_) { ({ chromium } = require(path.join(__dirname, '../../luna-bridge/node_modules/playwright'))); }
const ROT = path.join(__dirname, '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i >= 0 ? process.argv[i + 1] : d; };
const TP = arg('tp', 'http://localhost:4127');
const OUT = arg('ut', path.join(process.cwd(), 'teikning-sjalfvirkt-myndir'));
const CID = 1404, NAFN = 'Test fyrirtæki';
const NR = Number(arg('nr', '0')); // hvaða hæð (0 = 1. hæð)
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(TP)) throw new Error('TurboPaint aðeins á localhost');
fs.mkdirSync(OUT, { recursive: true });
const ok = [], bad = [];
const check = (n, c, x) => { (c ? ok : bad).push(n); console.log((c ? '  ✓ ' : '  ✗ ') + n + (c ? '' : '   ← ' + x)); };
const TEG = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.jpg': 'image/jpeg' };
function thjonn() {
  return new Promise((res) => {
    const s = http.createServer((req, svar) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      const f = path.join(ROT, p);
      if (!f.startsWith(ROT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { svar.writeHead(404); svar.end(); return; }
      svar.writeHead(200, { 'content-type': TEG[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(svar);
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

/** Skrif sem MEGA fara út: aðeins 1404. Allt annað gripið. */
function leyft(req) {
  const u = req.url();
  let body = null;
  try { body = JSON.parse(req.postData() || 'null'); } catch (_) { body = null; }
  const radir = Array.isArray(body) ? body : body ? [body] : [];
  if (/\/rest\/v1\/teikning_bord/.test(u)) return new RegExp('company_id=eq\\.' + CID + '\\b').test(u) || (radir.length && radir.every((r) => r && r.company_id === CID));
  if (/\/storage\/v1\/object\/turbopaint\/vinnumynd\/1404\//.test(u)) return true;
  if (/\/rest\/v1\/automation_triggers/.test(u) && req.method() === 'POST') return radir.length === 1 && radir[0].workflow === 'veggjavel' && radir[0].gogn && radir[0].gogn.company_id === CID;
  return false;
}

async function vordur(ctx, nafn, skra) {
  const grip = (route) => {
    const req = route.request();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method())) return route.fallback();
    if (leyft(req)) { skra.ut.push(nafn + ' ' + req.method() + ' ' + req.url().replace(/\?.*$/, '').replace(/^.*\/(rest|storage)\/v1\//, '')); return route.continue(); }
    skra.gripid.push(nafn + ' ' + req.method() + ' ' + req.url().replace(/\?.*$/, '').replace(/^.*\/(rest|storage)\/v1\//, ''));
    const geymsla = /\/storage\/v1\//.test(req.url());
    return route.fulfill({ status: 200, contentType: 'application/json', body: geymsla ? JSON.stringify({ Key: 'turbopaint/profun', Id: 'profun' }) : '[]' });
  };
  await ctx.route(/supabase\.co\/(rest|storage)\/v1\//, grip);
}

(async () => {
  const srv = await thjonn();
  const BASE = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch({ headless: true });
  const skra = { ut: [], gripid: [] };
  const ctx = await b.newContext({ viewport: { width: 1600, height: 950 } });
  await vordur(ctx, 'teikning', skra);
  await ctx.route(/\/\.netlify\/functions\//, async (route) => {
    const req = route.request();
    if (!['GET', 'HEAD'].includes(req.method())) { skra.gripid.push('teikning ' + req.method() + ' ' + req.url().replace(/\?.*$/, '')); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    const u = new URL(req.url());
    return route.fulfill({ response: await route.fetch({ url: 'https://slokkvitaeki.netlify.app' + u.pathname + u.search }) });
  });
  // Lifandi TurboPaint er ALDREI opnað: slóðin er lesin úr nýja flipanum og honum svarað með tómri síðu.
  const tpSlodir = [];
  await ctx.route(/kjarni\.vercel\.app/, (route) => { tpSlodir.push(route.request().url()); return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>TurboPaint (próf)</title>' }); });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.split('\n')[0]));
  await page.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.FloorPlan && typeof FloorPlan.open === 'function' && window.DB && DB.sb && window.TeiknBord && window.TeiknVinnumynd, null, { timeout: 120000 });
  await page.waitForTimeout(3000);
  await page.evaluate(async ([cid, nafn]) => {
    const r = await DB.sb.from('uttaeki').select('*').eq('fyrirtaeki_id', cid);
    const u = (r.data || []).map((x) => Object.assign({ client: nafn }, x));
    FloorPlan.load(cid);
    FloorPlan.open(cid, nafn, u);
  }, [CID, NAFN]);
  await page.waitForFunction((cid) => { const p = FloorPlan.plans && FloorPlan.plans[cid]; return p && Array.isArray(p.haedir) && p.haedir.length && FloorPlan.bgImage; }, CID, { timeout: 120000 });
  await page.waitForTimeout(5000);
  if (NR > 0) { await page.click('#fp-haedir button[data-h="' + NR + '"]'); await page.waitForTimeout(4000); }
  const haedir0 = await page.evaluate(() => TeiknBord.haedir().map((h) => ({ id: h.id, nafn: h.nafn, leidrett: h.leidrett || null, vm: h.vinnumynd ? h.vinnumynd.t : null, skurdur: h.skurdur || null })));
  console.log('hæðir fyrir:', JSON.stringify(haedir0));
  await page.screenshot({ path: path.join(OUT, '01_teikning_fyrir.png'), timeout: 90000 }).catch((e) => console.log('   (skjámynd 01_teikning_fyrir tókst ekki: ' + String(e.message).slice(0, 80) + ')'));

  // ── 1. takkinn ──
  const takki = await page.evaluate(() => {
    const a = document.querySelector('#modal-floorplan .fp-tp-btn'), s = document.querySelector('#modal-floorplan .fp-tp-sjalf-btn');
    if (!s) return null;
    const st = getComputedStyle(s);
    return { texti: s.textContent, titill: s.title, klasi: s.className, naestur: a && a.nextElementSibling === s, synilegur: s.getBoundingClientRect().width > 0, bak: st.backgroundImage + ' ' + st.backgroundColor };
  });
  console.log('takkinn:', JSON.stringify(takki));
  check('„Sjálfvirkt" stendur við hlið „Opna í TurboPaint"', !!takki && takki.naestur && takki.synilegur, JSON.stringify(takki));
  check('textinn er „Sjálfvirkt" án emoji, sami takkaklasi og hinir (Brunastál)', !!takki && takki.texti === 'Sjálfvirkt' && /btn btn-outline btn-sm/.test(takki.klasi), JSON.stringify(takki));
  const hid = haedir0[NR].id;
  const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 30000 }), page.click('#modal-floorplan .fp-tp-sjalf-btn')]);
  for (let i = 0; i < 60 && !tpSlodir.some((s) => /sjalfvirkt=1/.test(s)); i++) await page.waitForTimeout(250);
  const slod = tpSlodir.find((s) => /uttekt=/.test(s)) || '';
  console.log('TurboPaint-slóð:', slod);
  check('takkinn opnar TurboPaint með &sjalfvirkt=1 (og uttekt, haed, ham=teikning)', /sjalfvirkt=1/.test(slod) && new RegExp('uttekt=' + CID).test(slod) && new RegExp('haed=' + hid).test(slod) && /ham=teikning/.test(slod), slod);
  await popup.close().catch(() => {});
  await page.screenshot({ path: path.join(OUT, '02_teikning_takkinn.png'), timeout: 90000 }).catch((e) => console.log('   (skjámynd 02_teikning_takkinn tókst ekki: ' + String(e.message).slice(0, 80) + ')'));

  // ── 2. verkferlið í staðbundnu TurboPaint (sama fyrirspurn) ──
  const ctx2 = await b.newContext({ viewport: { width: 1600, height: 950 } });
  await vordur(ctx2, 'turbopaint', skra);
  const tp = await ctx2.newPage();
  tp.on('pageerror', (e) => errs.push('TP: ' + e.message.split('\n')[0]));
  const q = new URL(slod).search;
  const t0 = Date.now();
  await tp.goto(TP + '/kjarni/turbopaint' + q, { waitUntil: 'domcontentloaded' });
  await tp.locator('[data-sjalfvirkt]').waitFor({ timeout: 400000 });
  let sidast = '';
  for (;;) {
    const s = await tp.evaluate(() => { const st = window.__tpSjalfvirkt.getState(); return { keyrir: st.keyrir, spurning: !!st.spurning, k: st.skref.filter((x) => x.stada === 'keyrir').map((x) => x.id + ': ' + x.texti).join(' | ') }; });
    if (s.k && s.k !== sidast) { console.log('   ', Math.round((Date.now() - t0) / 1000) + ' s', s.k.slice(0, 160)); sidast = s.k; }
    if (!s.keyrir || s.spurning) break;
    if (Date.now() - t0 > 20 * 60000) throw new Error('verkferlið kláraði ekki');
    await tp.waitForTimeout(1000);
  }
  const st = await tp.evaluate(() => { const s = window.__tpSjalfvirkt.getState(); return { skref: s.skref, yfirlit: s.yfirlit, vistun: s.vistun, vistunTexti: s.vistunTexti }; });
  console.log(st.skref.map((k) => `    ${k.id.padEnd(9)} ${k.stada.padEnd(7)} ${k.texti}`).join('\n'));
  console.log('    ' + st.yfirlit);
  await tp.screenshot({ path: path.join(OUT, '03_turbopaint_lokid.png') });
  check('TurboPaint: verkferlið vistaði óleiðréttu hæðina sjálfkrafa', st.vistun === 'vistad', st.vistun + ' ' + st.vistunTexti);
  const skurdurSkref = st.skref.find((k) => k.id === 'skurdur');
  const hafdiSkurd = !!haedir0[NR].skurdur;
  if (!hafdiSkurd) check('skurður: hæðin hafði engan — húsið fundið', skurdurSkref && skurdurSkref.stada === 'lokid' && /Húsið fundið/.test(skurdurSkref.texti), JSON.stringify(skurdurSkref));
  else check('skurður hæðarinnar hélt sér', skurdurSkref && skurdurSkref.stada === 'sleppt', JSON.stringify(skurdurSkref));
  const rod = await page.evaluate(async (cid) => (await DB.sb.from('teikning_bord').select('haedir,updated_by').eq('company_id', cid).limit(1)).data[0], CID);
  const hNy = rod.haedir.find((h) => h.id === hid);
  check('teikning_bord (1404): leidrett {af:"sjalfvirkt"}, veggjaLinur, ' + (hafdiSkurd ? 'skurður óbreyttur' : 'skurður hússins (sjalf:false, skurdurAf:"sjalfvirkt")'),
    hNy && hNy.leidrett && hNy.leidrett.af === 'sjalfvirkt' && (hNy.veggjaLinur || []).length > 20 && hNy.skurdur &&
      (hafdiSkurd ? JSON.stringify(hNy.skurdur) === JSON.stringify(haedir0[NR].skurdur) : hNy.sjalf === false && hNy.skurdurAf === 'sjalfvirkt'),
    JSON.stringify({ leidrett: hNy && hNy.leidrett, vl: hNy && (hNy.veggjaLinur || []).length, sk: hNy && hNy.skurdur, sjalf: hNy && hNy.sjalf, af: hNy && hNy.skurdurAf }));
  console.log('    hæðin eftir:', JSON.stringify({ veggjaLinur: (hNy.veggjaLinur || []).length, hurdir: (hNy.veggjaLinur || []).filter((v) => v.tegund === 'hurd').length, gler: (hNy.veggjaLinur || []).filter((v) => v.tegund === 'gler').length, eld: (hNy.veggjaLinur || []).filter((v) => v.eld).length, skurdur: hNy.skurdur, merki: (hNy.markers || []).length }));

  // ── 3. aftur í Teikningu: endurlesið sjálfkrafa, „· sjálfvirkt", vinnumyndin smíðuð upp á nýtt ──
  await page.bringToFront();
  await page.evaluate(() => { window.dispatchEvent(new Event('focus')); });
  await page.waitForFunction((hid) => { const h = TeiknBord.haedir().find((x) => x.id === hid); return h && h.leidrett && h.leidrett.af === 'sjalfvirkt'; }, hid, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const flipi = await page.evaluate(() => [...document.querySelectorAll('#fp-haedir button[data-h]')].map((b) => b.textContent.replace(/\s+/g, ' ').trim()).join(' | '));
  console.log('hæðaflipar:', flipi);
  const flipiHaedar = (flipi.split(' | ')[NR] || '');
  check('Teikning endurlas hæðina sjálf (fókus) — flipinn segir „· sjálfvirkt" (ekki „· leiðrétt")', /· sjálfvirkt/.test(flipiHaedar) && !/· leiðrétt/.test(flipiHaedar), flipi);
  // 445: vinnumyndin smíðast upp á nýtt (hulið 3D) og festist — ný vm.t
  const vm0 = haedir0[NR].vm;
  const tv = Date.now();
  let vmNy = null;
  for (; Date.now() - tv < 240000; ) {
    vmNy = await page.evaluate((hid) => { const h = TeiknBord.haedir().find((x) => x.id === hid); const s = TeiknVinnumynd.stada(); return { t: h && h.vinnumynd ? h.vinnumynd.t : null, fest: h && h.vinnumynd ? h.vinnumynd.fest : null, smidar: s.smidar, urelt: s.urelt, ham: s.ham, tilbuin: s.tilbuin }; }, hid);
    if (vmNy.t && vmNy.t !== vm0 && !vmNy.smidar) break;
    await page.waitForTimeout(2000);
  }
  console.log('vinnumynd:', JSON.stringify({ fyrir: vm0, eftir: vmNy }), Math.round((Date.now() - tv) / 1000) + ' s');
  check('vinnumyndin smíðaðist upp á nýtt sjálfkrafa (ný föst mynd, „sjalfvirkt")', !!vmNy && vmNy.t && vmNy.t !== vm0 && vmNy.fest === 'sjalfvirkt', JSON.stringify({ vm0, vmNy }));
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(OUT, '04_teikning_eftir.png'), timeout: 90000 }).catch((e) => console.log('   (skjámynd 04_teikning_eftir tókst ekki: ' + String(e.message).slice(0, 80) + ')'));

  // ── vörður ──
  console.log('út fór (aðeins 1404):', [...new Set(skra.ut)].join(', '));
  console.log('gripið:', [...new Set(skra.gripid)].join(', '));
  check('aðeins skrif á 1404 fóru út — allt annað gripið', skra.ut.every((s) => /teikning_bord|vinnumynd\/1404|automation_triggers/.test(s)), JSON.stringify(skra.ut));
  const villur = errs.filter((e) => !/ResizeObserver|Failed to fetch|NetworkError|Load failed/.test(e));
  check('engar villur á síðunum', villur.length === 0, villur.slice(0, 5).join(' | '));
  fs.writeFileSync(path.join(OUT, 'nidurstada.json'), JSON.stringify({ slod, skref: st.skref, yfirlit: st.yfirlit, flipi, vm0, vmNy, ut: skra.ut, gripid: [...new Set(skra.gripid)] }, null, 1));
  console.log('\n' + ok.length + ' í lagi, ' + bad.length + ' brást');
  await b.close();
  srv.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('VILLA', e); process.exit(2); });
