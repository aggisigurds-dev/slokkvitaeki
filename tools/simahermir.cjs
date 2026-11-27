#!/usr/bin/env node
/* === SÍMAHERMIR — sjá síðuna eins og síminn teiknar hana, áður en Agnar þarf að opna hana ======================
 *
 * Agnar 27.11.2026: „make some artifact or similar so it will be easier for claude and me to see how it will look
 * like in the mobile, when designing the mobile view … or make some emulator, we can use."
 *
 * TVEIR HAMIR, EITT TÓL
 *   skot   Tekur mynd af síðunni í hverju tæki (alvöru tækjahermun Chromium: breidd, snerting, UA, screen) og setur
 *          þær hlið við hlið á EINA samanburðarmynd. Lotan les myndina og sendir hana í síma Agnars.
 *   opna   Opnar síðuna í alvöru glugga á ÞESSARI tölvu í símastærð, með snertingu. Agnar smellir og skrunar sjálfur.
 *          Innskráningin geymist í eigin prófíl hermisins, svo hann skráir sig inn einu sinni.
 *
 * HVERS VEGNA EKKI BARA MJÓR GLUGGI EÐA IFRAME
 *   - Slökkvitæki-appið velur símaútlit af sýnarham (`data-viewmode`), ekki af breidd. Tólið les haminn til baka og
 *     þvingar hann með `?devframe=simi` (sami farvegur og 📱-ramminn í Stílstjóra, patch 320) ef appið valdi annað.
 *   - Rammi í artifact getur ekki hlaðið lifandi síðunum (Claude-rammar loka á ytri vefi) og iframe á öðru léni
 *     fær ekki innskráningarkökuna.
 *   - Headless Chrome með --window-size lýgur undir ~500 px. Hér er útsýnið stillt með tækjahermun og `innerWidth`
 *     er mælt og prentað fyrir hvert tæki, svo sést ef hermunin náði ekki breiddinni.
 *
 * NOTKUN
 *   node tools/simahermir.cjs skot <mark> [<mark> …] [valkostir]
 *   node tools/simahermir.cjs opna [<mark>] [valkostir]
 *
 *   <mark>   #sýn (t.d. "#bord") · /slóð · full slóð (http…, líka localhost) · skrá á diski (mockup.html)
 *
 *   --vefur slokk|bh|kjarni|<url>   grunnur fyrir #sýn og /slóð (sjálfgefið slokk)
 *   --taeki 360,390,412             tæki, sjá TAEKI hér að neðan (skot: sjálfgefið 360,390,412 · opna: 390)
 *   --heil                          öll síðan niður úr, ekki aðeins fyrsti skjárinn
 *   --bid 7000                      bið eftir teikningu í ms
 *   --js "<kóði>"                   keyrt í síðunni fyrir myndatöku (opna flipa, skruna, smella á prófunartakka)
 *   --hamur sjalf|simi|enginn       sýnarhamur Slökkvitækis: sjalf = þvinga aðeins ef appið valdi ekki síma (sjálfgefið)
 *   --ut <mappa>                    hvert myndirnar fara (sjálfgefið tímastimpluð mappa í TEMP)
 *   --kaka <gildi>                  lotu-kaka (uid 10). Betra: umhverfisbreytan HERMIR_KAKA. Aldrei skrifuð í skrá.
 *
 * ÞAÐ SEM TÓLIÐ SEGIR EKKI
 *   Hermir er ekki síminn hans Agnars. Tækið „tolvu" hermir síma sem teiknar síðuna í tölvuútgáfu (~1.230 px,
 *   mælt af raunskjáskoti 13.11.2026), en hvort HANS vafri er í þeim ham á tiltekinni síðu sést aðeins á
 *   raunskjáskoti frá honum. Segðu „prófað í hermi", ekki „virkar í símanum þínum".
 *   Djúp mæling (of smátt letur, kreistir dálkar) er tools/simasopur.cjs — þetta tól SÝNIR, hitt TELUR.
 * ============================================================================================================== */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');

const VEFIR = {
  slokk: 'https://slokkvitaeki.netlify.app/',
  bh: 'https://brunaholf.netlify.app/',
  kjarni: 'https://kjarni.vercel.app/',
};

const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 15; SM-S931B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UA_TOLVA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/* simi = á síminn að teikna símaútlit hér (þá er sýnarhamur Slökkvitækis sannreyndur). */
const TAEKI = {
  '360':   { heiti: 'Android 360', w: 360, h: 780, dsf: 2, ua: UA_ANDROID, snerting: true, farsimi: true, simi: true },
  '390':   { heiti: 'iPhone 390', w: 390, h: 844, dsf: 2, ua: UA_IPHONE, snerting: true, farsimi: true, simi: true },
  '412':   { heiti: 'Android 412', w: 412, h: 915, dsf: 2, ua: UA_ANDROID, snerting: true, farsimi: true, simi: true },
  '430':   { heiti: 'Stór sími 430', w: 430, h: 860, dsf: 2, ua: UA_ANDROID, snerting: true, farsimi: true, simi: true },
  'tafla': { heiti: 'Spjaldtölva 834', w: 834, h: 1112, dsf: 1, ua: UA_ANDROID.replace(' Mobile', ''), snerting: true, farsimi: true, simi: false },
  'tolvu': { heiti: 'Sími í tölvuútgáfu 1230', w: 1230, h: 2732, dsf: 1, ua: UA_TOLVA, snerting: true, farsimi: false, simi: false, skjar: { width: 412, height: 915 } },
  'tolva': { heiti: 'Tölva 1440', w: 1440, h: 900, dsf: 1, ua: null, snerting: false, farsimi: false, simi: false },
};

function rokin(argv) {
  const o = { skipun: argv[2], mork: [], vefur: 'slokk', taeki: null, heil: false, bid: 7000, js: null, hamur: 'sjalf', ut: null, kaka: process.env.HERMIR_KAKA || null };
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--vefur') o.vefur = argv[++i];
    else if (a === '--taeki') o.taeki = argv[++i];
    else if (a === '--heil') o.heil = true;
    else if (a === '--bid') o.bid = +argv[++i];
    else if (a === '--js') o.js = argv[++i];
    else if (a === '--hamur') o.hamur = argv[++i];
    else if (a === '--ut') o.ut = argv[++i];
    else if (a === '--kaka') o.kaka = argv[++i];
    else o.mork.push(a.replace(/^[A-Za-z]:[\/]Program Files[\/]Git[\/]?/, '/'));   // Git Bash breytir "/slod" í Windows-slóð
  }
  if (!o.mork.length && (o.skipun === 'opna' || process.argv.includes('--vefur'))) o.mork.push('/');
  return o;
}

function saekjaPlaywright() {
  const stadir = ['playwright', path.join(os.homedir(), 'luna-bridge', 'node_modules', 'playwright'), path.join(__dirname, '..', 'node_modules', 'playwright')];
  for (const s of stadir) { try { return require(s); } catch (_) {} }
  console.error('playwright finnst ekki. Reynt: ' + stadir.join(' · '));
  process.exit(2);
}

function grunnur(o) { return VEFIR[o.vefur] || o.vefur; }

/* #sýn, /slóð, full slóð eða skrá á diski → slóð sem vafrinn opnar. */
function slodFyrir(mark, o) {
  if (/^https?:\/\//i.test(mark) || /^file:/i.test(mark)) return mark;
  if (!mark.startsWith('#') && fs.existsSync(mark)) return pathToFileURL(path.resolve(mark)).href;
  return new URL(mark, grunnur(o)).href;
}

function erSlokk(slod) {
  try { return /(^|\.)slokkvitaeki\.netlify\.app$/.test(new URL(slod).hostname); } catch (_) { return false; }
}

function medDevframe(slod) {
  const u = new URL(slod);
  u.searchParams.set('devframe', 'simi');
  return u.href;
}

function nafnFyrir(mark) {
  if (!/^https?:/i.test(mark) && !mark.startsWith('#') && fs.existsSync(mark)) mark = path.basename(mark).replace(/.html?$/i, '');
  const n = mark.replace(/^https?:\/\//i, '').replace(/^file:\/+/i, '').replace(/[^a-zA-Z0-9áðéíóúýþæöÁÐÉÍÓÚÝÞÆÖ]+/g, '-').replace(/^-+|-+$/g, '');
  return (n || 'forsida').slice(-48);
}

function samhengi(t) {
  const c = { viewport: { width: t.w, height: t.h }, deviceScaleFactor: t.dsf, isMobile: t.farsimi, hasTouch: t.snerting, locale: 'is-IS' };
  if (t.ua) c.userAgent = t.ua;
  if (t.skjar) c.screen = t.skjar;
  return c;
}

async function setjaKoku(ctx, slod, kaka) {
  if (!kaka || !/^https?:/i.test(slod)) return;
  const u = new URL(slod);
  await ctx.addCookies([{ name: 'hub_user', value: kaka, domain: u.hostname, path: '/', secure: u.protocol === 'https:', sameSite: 'Lax' }]);
}

/* Keyrt í síðunni: mælir það sem mynd ein segir ekki. Skuggarætur fylgja með. */
const MAELA = `(() => {
  const allir = [];
  (function ganga(rot) { rot.querySelectorAll('*').forEach(e => { allir.push(e); if (e.shadowRoot) ganga(e.shadowRoot); }); })(document);
  const W = innerWidth, H = innerHeight;
  let smairReitir = 0, smairTakkar = 0;
  allir.forEach(e => {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) return;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.08) return;
    const tag = e.tagName;
    if ((tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') && !/checkbox|radio|range|hidden|file/.test(e.type || '') && parseFloat(cs.fontSize) < 16) smairReitir++;
    if ((tag === 'BUTTON' || tag === 'A' || e.getAttribute('role') === 'button') && r.height < 36) smairTakkar++;
  });
  const de = document.documentElement;
  return { iw: W, ih: H, sw: de.scrollWidth, hamur: de.dataset.viewmode || '', smairReitir, smairTakkar, skjar: screen.width + 'x' + screen.height, vp: !!document.querySelector('meta[name=viewport]'), titill: document.title.slice(0, 60) };
})()`;

async function einMynd(vafri, lykill, mark, o, ut) {
  const t = TAEKI[lykill];
  let slod = slodFyrir(mark, o);
  const ctx = await vafri.newContext(samhengi(t));
  await setjaKoku(ctx, slod, o.kaka);
  const page = await ctx.newPage();
  const hlada = async (s) => {
    await page.goto(s, { waitUntil: 'load', timeout: 90000 }).catch(e => { throw new Error(lykill + ': ' + e.message.split('\n')[0]); });
    await page.waitForTimeout(o.bid);
  };
  let thvingad = false;
  if (o.hamur === 'simi' && t.simi && /^https?:/i.test(slod)) { slod = medDevframe(slod); thvingad = true; }
  await hlada(slod);
  let m = await page.evaluate(MAELA);
  // Slökkvitæki velur símaútlit af sýnarham, ekki breidd: valdi appið annað á símatæki → sami farvegur og 📱-ramminn.
  if (o.hamur === 'sjalf' && t.simi && erSlokk(slod) && m.hamur && m.hamur !== 'mobile') {
    slod = medDevframe(slod); thvingad = true;
    await hlada(slod);
    m = await page.evaluate(MAELA);
  }
  if (o.js) { await page.evaluate(o.js).catch(e => console.error('  --js villa (' + lykill + '): ' + e.message.split('\n')[0])); await page.waitForTimeout(1200); m = await page.evaluate(MAELA); }
  const skra = path.join(ut, nafnFyrir(mark) + '-' + lykill + '.png');
  await page.screenshot({ path: skra, fullPage: o.heil });
  await ctx.close();
  return { lykill, t, skra, m, thvingad, slod };
}

/* Allar myndir eins marks hlið við hlið, hver í sínum ramma með mælingunni undir. */
async function samanburdur(vafri, mark, nidurstodur, ut, o) {
  const SYND = 300;   // sýnd breidd hvers síma á samanburðarmyndinni
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const spjold = nidurstodur.map(r => {
    const flaedir = r.m.sw > r.m.iw + 1;
    const linur = [
      r.m.iw + ' px breitt' + (r.m.iw !== r.t.w ? (r.m.vp ? ' (bað um ' + r.t.w + '!)' : ' <b class="v">vantar viewport-merki</b>') : ''),
      flaedir ? '<b class="v">skrunar lárétt: ' + r.m.sw + ' px</b>' : 'ekkert lárétt skrun',
      r.m.smairReitir ? '<b class="v">' + r.m.smairReitir + ' reitir undir 16 px</b>' : null,
      r.m.smairTakkar ? r.m.smairTakkar + ' takkar undir 36 px' : null,
      r.m.hamur ? 'hamur: ' + esc(r.m.hamur) + (r.thvingad ? ' (þvingaður)' : '') : null,
    ].filter(Boolean).join('<br>');
    return '<figure><figcaption>' + esc(r.t.heiti) + '</figcaption><div class="simi' + (r.t.simi ? '' : ' flatt') + '"><img src="' + pathToFileURL(r.skra).href + '"></div><p>' + linur + '</p></figure>';
  }).join('');
  const html = '<!doctype html><meta charset="utf-8"><style>' +
    'body{margin:0;padding:22px 24px 26px;background:#e9ebef;font:13px/1.45 "Segoe UI",system-ui,sans-serif;color:#1c1f26;display:inline-block}' +
    'h1{font-size:15px;margin:0 0 4px;font-weight:700}small{color:#5d6470}' +
    '.rod{display:flex;gap:22px;align-items:flex-start;margin-top:16px}' +
    'figure{margin:0;width:' + (SYND + 16) + 'px}figcaption{font-weight:700;margin:0 0 6px 4px;font-size:13px}' +
    '.simi{background:#101216;padding:8px;border-radius:26px;box-shadow:0 8px 22px rgba(0,0,0,.22)}.simi img{display:block;width:' + SYND + 'px;border-radius:19px}' +
    '.simi.flatt{border-radius:10px}.simi.flatt img{border-radius:3px}' +
    'p{margin:8px 4px 0;font-size:12px;color:#4b515c}.v{color:#b3261e}' +
    '</style><h1>' + esc(mark) + '</h1><small>Símahermir · ' + new Date().toLocaleString('sv-SE').slice(0, 16) + (o.heil ? ' · öll síðan' : ' · fyrsti skjár') + ' · prófað í hermi, ekki í raunsíma</small><div class="rod">' + spjold + '</div>';
  const skra = path.join(ut, nafnFyrir(mark) + '-samanburdur.html');
  fs.writeFileSync(skra, html, 'utf8');
  const ctx = await vafri.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(skra).href, { waitUntil: 'load' });
  const kassi = await page.evaluate(() => { const b = document.body.getBoundingClientRect(); return { w: Math.ceil(b.width), h: Math.ceil(b.height) }; });
  await page.setViewportSize({ width: Math.max(400, kassi.w), height: Math.max(300, Math.min(kassi.h, 16000)) });
  const png = skra.replace(/\.html$/, '.png');
  await page.screenshot({ path: png, fullPage: true });
  await ctx.close();
  fs.unlinkSync(skra);
  return png;
}

async function skot(o) {
  if (!o.mork.length) { console.error('Notkun: node tools/simahermir.cjs skot "#bord" [--vefur slokk|bh|kjarni] [--taeki 360,390,412] [--heil]'); process.exit(2); }
  const lyklar = (o.taeki || '360,390,412').split(',').map(x => x.trim()).filter(Boolean);
  const othekkt = lyklar.filter(l => !TAEKI[l]);
  if (othekkt.length) { console.error('Óþekkt tæki: ' + othekkt.join(', ') + '. Til: ' + Object.keys(TAEKI).join(', ')); process.exit(2); }
  const ut = o.ut ? path.resolve(o.ut) : path.join(os.tmpdir(), 'simahermir', new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19));
  fs.mkdirSync(ut, { recursive: true });
  const { chromium } = saekjaPlaywright();
  const vafri = await chromium.launch();
  let villur = 0;
  console.log('SÍMAHERMIR · skot · ' + lyklar.join(', ') + (o.kaka ? ' · innskráð lota' : ' · án innskráningar'));
  for (const mark of o.mork) {
    const svor = await Promise.all(lyklar.map(l => einMynd(vafri, l, mark, o, ut).catch(e => ({ villa: e.message, lykill: l }))));
    const god = svor.filter(r => !r.villa);
    console.log('\n═══ ' + mark + (god[0] ? '  →  ' + god[0].slod : ''));
    svor.forEach(r => {
      if (r.villa) { villur++; console.log('  ✗ ' + r.villa); return; }
      const m = r.m;
      console.log('  ' + r.t.heiti.padEnd(26) + 'innerWidth ' + m.iw + (m.iw !== r.t.w ? ' ≠ ' + r.t.w + (m.vp ? ' (HERMUN NÁÐI EKKI BREIDD)' : ' (SÍÐUNA VANTAR <meta name=viewport> — alvöru sími teiknar hana líka svona breiða og smækkar)') : '') +
        ' · ' + (m.sw > m.iw + 1 ? 'SKRUNAR LÁRÉTT ' + m.sw : 'ekkert lárétt skrun') +
        ' · reitir <16px: ' + m.smairReitir + ' · takkar <36px: ' + m.smairTakkar +
        (m.hamur ? ' · hamur=' + m.hamur + (r.thvingad ? ' (þvingaður með devframe)' : '') : '') + ' · screen ' + m.skjar);
      console.log('    ' + r.skra);
    });
    if (god.length) console.log('  SAMANBURÐUR: ' + await samanburdur(vafri, mark, god, ut, o));
  }
  await vafri.close();
  console.log('\nMappa: ' + ut);
  process.exit(villur ? 1 : 0);
}

async function opna(o) {
  const lykill = (o.taeki || '390').split(',')[0].trim();
  const t = TAEKI[lykill];
  if (!t) { console.error('Óþekkt tæki: ' + lykill + '. Til: ' + Object.keys(TAEKI).join(', ')); process.exit(2); }
  let slod = slodFyrir(o.mork[0] || '/', o);
  if (o.hamur !== 'enginn' && t.simi && erSlokk(slod)) slod = medDevframe(slod);
  const { chromium } = saekjaPlaywright();
  const profill = path.join(process.env.LOCALAPPDATA || os.homedir(), 'simahermir-profill');
  const h = Math.min(t.h, 900);
  const stillingar = Object.assign(samhengi(Object.assign({}, t, { h, dsf: 1 })), {
    headless: false,
    args: ['--window-size=' + (t.w + 16) + ',' + (h + 90), '--window-position=60,20'],
  });
  // Uppsettur Chrome eða Edge fyrst: Smart App Control á skrifstofuvélinni lokar á Chromium-eintak Playwright í sýnilegum ham.
  let ctx = null, sidasta = null;
  for (const ras of ['chrome', 'msedge', null]) {
    try { ctx = await chromium.launchPersistentContext(profill, ras ? Object.assign({ channel: ras }, stillingar) : stillingar); break; }
    catch (e) { sidasta = e; }
  }
  if (!ctx) throw new Error('Enginn vafri opnaðist: ' + sidasta.message.split('
')[0]);
  await setjaKoku(ctx, slod, o.kaka);
  const page = ctx.pages()[0] || await ctx.newPage();
  await page.goto(slod, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(e => console.error(e.message.split('\n')[0]));
  console.log('SÍMAHERMIR · opinn gluggi · ' + t.heiti + ' · ' + slod);
  console.log('Lokaðu glugganum til að hætta. Innskráning geymist í ' + profill);
  ctx.on('close', () => process.exit(0));
}

const o = rokin(process.argv);
(o.skipun === 'skot' ? skot(o) : o.skipun === 'opna' ? opna(o) : Promise.reject(new Error('Notkun: node tools/simahermir.cjs skot|opna <mark> [valkostir] — sjá haus skrárinnar')))
  .catch(e => { console.error(e && e.message ? e.message : e); process.exit(1); });
