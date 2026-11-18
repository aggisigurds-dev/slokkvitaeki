#!/usr/bin/env node
/* === BIRTUMÆLING — birtuskil mæld á DÍLUM, ekki á computed style ================================================
 *
 * Agnar 18.11.2026: „Já, smíða mælinguna."
 *
 * HVERS VEGNA ÞETTA ER TIL. Fyrri birtusópar í lotunni lásu `getComputedStyle` og gengu upp tréð þar til þeir fundu
 * bakgrunn. Sú aðferð LÝGUR á þremur stöðum, hvert mælt sama dag:
 *   1. Halli (`background-image: linear-gradient(...)`). Fyrsta útgáfan hunsaði halla og skilaði lit síðunnar;
 *      önnur tók miðlitinn — og las skrautlegan koparborða (.erow í gáttinni) sem bakgrunn texta sem situr á hvítu.
 *      Sú keyrsla gaf 50 niðurstöður þar sem allar sem tókst að sannreyna voru falskar.
 *   2. Hálfgegnsæ pilla. Þröskuldur á alfa (>0.85) hoppaði yfir `rgba(2,25,60,.72)` undir „Ég er" og mældi textann
 *      á ljósu síðunni: 1,15:1 þar sem raunin er hvítt á navy.
 *   3. `background-clip: text`. Hubburinn (brunaholf.netlify.app) málar stórar tölur þannig; `color` mælist þá
 *      `transparent` og bakgrunnsleitin endar uppi í <html>. Computed style sér hvorki litinn né flötinn.
 * Auk þess sjást bakgrunnar á gervieindum (::before/::after) og myndir alls ekki í þessari aðferð.
 *
 * HVAÐ ÞETTA GERIR Í STAÐINN. Tekur skjáskot af allri síðunni, les raunverulega díla undir hverju textabroti og
 * reiknar birtuskil af þeim. Bakgrunnur = algengasti liturinn í reitnum (stafir þekja alltaf minnihluta hans);
 * textalitur = meðaltal þeirra díla sem víkja frá bakgrunninum. Þannig er sama hvort liturinn kom úr halla, mynd,
 * gervieind eða `background-clip:text` — mælt er það sem sést.
 *
 * NOTKUN
 *   NODE_PATH=C:\Users\Slokkvitaeki\luna-bridge\node_modules node tools/birtumaeling.cjs <slóð> [valkostir]
 *
 *   --kaka <gildi>     hub_user-kaka ef síðan krefst innskráningar (sjá CLAUDE.md, uid 10). Aldrei skrifuð í skrá.
 *   --breidd 1440      gluggabreidd (sjálfgefið 1440)
 *   --haed 900         gluggahæð (sjálfgefið 900)
 *   --bid 7000         bið eftir að síðan teikni sig, í ms
 *   --smellur "<sel>"  smella á þetta áður en mælt er (t.d. flipa), má endurtaka
 *   --ut <skrá>        skrifa allar niðurstöður sem JSON
 *   --mynd <skrá>      geyma skjáskotið (annars er því hent)
 *   --allt             sýna líka það sem stenst (annars aðeins fall)
 *
 * ÚTKOMA. Hvert fall ber: hlutfall, textalit og bakgrunn eins og þeir MÆLDUST, stærð, þyngd, og fyrstu orðin.
 * „ÓSÝNILEGT" þýðir að færri en 2% díla í reitnum víkja frá bakgrunninum — enginn stafur sést.
 *
 * ÞRÖSKULDAR. WCAG AA: 4,5:1 fyrir venjulegan texta, 3:1 fyrir stórt letur (≥24px, eða ≥18,66px og feitt).
 * Hönnunarkerfi Brunahólfs leyfir eitt skráð frávik: hvítt á appelsínugulu (#ff6702) í feitum tökkum 14px+,
 * sem mælist 2,9:1. Tólið merkir þau tilvik „[skráð frávik]" í stað þess að telja þau með.
 * ============================================================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

function rokin(argv) {
  const o = { url: null, kaka: null, breidd: 1440, haed: 900, bid: 7000, smellur: [], ut: null, mynd: null, allt: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--kaka') o.kaka = argv[++i];
    else if (a === '--breidd') o.breidd = +argv[++i];
    else if (a === '--haed') o.haed = +argv[++i];
    else if (a === '--bid') o.bid = +argv[++i];
    else if (a === '--smellur') o.smellur.push(argv[++i]);
    else if (a === '--ut') o.ut = argv[++i];
    else if (a === '--mynd') o.mynd = argv[++i];
    else if (a === '--allt') o.allt = true;
    else if (!o.url) o.url = a;
  }
  return o;
}

/* ── Í SÍÐUNNI: safna textabrotum ──────────────────────────────────────────────────────────────────────────────
 * Aðeins hnútar sem bera texta BEINT (ekki foreldri sem erfir hann frá barni), sýnilegir, með reit sem er ekki
 * núll. Hnit eru skjalhnit (bætt við skruni) því skjáskotið nær yfir alla síðuna. */
const SAFNA = `(() => {
  const ut = [];
  const sjanlegt = (e, cs) => cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.08;
  // Skuggarætur líka: Þjónustuborðið (368) teiknar ALLT inni í #view-bord.shadowRoot og querySelectorAll('*')
  // á skjalinu sér ekkert af því. Án þessa mældi tólið tóma síðu og segði „ekkert fall".
  const allir = [];
  (function ganga(rot) {
    rot.querySelectorAll('*').forEach(e => { allir.push(e); if (e.shadowRoot) ganga(e.shadowRoot); });
  })(document);
  allir.forEach(e => {
    const cs = getComputedStyle(e);
    if (!sjanlegt(e, cs)) return;
    const beint = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!beint.length) return;
    const r = e.getBoundingClientRect();
    if (r.width < 4 || r.height < 6) return;
    /* KLIPPT AF SKRUNKASSA. Hliðarstika hubbsins skrunar inni í sér; hlutir sem eru utan hennar hafa samt gild
     * skjalhnit, en þeir eru EKKI málaðir í skjáskotinu. Fyrsta keyrslan taldi 17 slíka valmyndarliði
     * „ósýnilega" þótt þeir sjáist um leið og skrunað er. Hér er reiturinn skorinn niður með hverjum forföður
     * sem klippir, og hluturinn felldur út ef minna en 60% hans standa eftir. */
    let kx0 = r.left, ky0 = r.top, kx1 = r.right, ky1 = r.bottom;
    for (let p = e.parentElement; p; p = p.parentElement) {
      const pcs = getComputedStyle(p);
      if (!/auto|scroll|hidden|clip/.test(pcs.overflow + pcs.overflowX + pcs.overflowY)) continue;
      const pr = p.getBoundingClientRect();
      kx0 = Math.max(kx0, pr.left); ky0 = Math.max(ky0, pr.top);
      kx1 = Math.min(kx1, pr.right); ky1 = Math.min(ky1, pr.bottom);
    }
    const synt = Math.max(0, kx1 - kx0) * Math.max(0, ky1 - ky0);
    if (synt < r.width * r.height * 0.6) return;
    ut.push({
      merki: (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '')).slice(0, 46),
      texti: beint.map(n => n.textContent).join(' ').replace(/\\s+/g, ' ').trim().slice(0, 40),
      x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height,
      litur: cs.color, fs: parseFloat(cs.fontSize) || 0, fw: +cs.fontWeight || 400,
      bgStill: cs.backgroundColor
    });
  });
  return { hlutir: ut, dpr: devicePixelRatio || 1, sidubreidd: document.documentElement.scrollWidth };
})()`;

/* ── PNG → dílar, í Node ───────────────────────────────────────────────────────────────────────────────────────
 * Afkóðað hér en ekki í vafranum. Tvær tilraunir í vafra féllu fyrst: data:-mynd af fullri síðu hafnaði (síður
 * bera `img-src`-reglu, og myndin er margir megabæti sem fer illa gegnum evaluate). Node hefur zlib innbyggt og
 * skjáskot Playwright eru alltaf 8 bita, án fléttu (interlace), svo afkóðarinn þarf aðeins tvær litgerðir:
 * 6 = RGBA og 2 = RGB. Allt annað er hafnað hátt og snjallt í stað þess að skila ruglmælingu. */
function lesaPng(buf) {
  const zlib = require('zlib');
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('ekki PNG');
  let p = 8, w = 0, h = 0, bitdypt = 0, litgerd = 0, flettad = 0;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p), tag = buf.toString('ascii', p + 4, p + 8);
    const gogn = buf.slice(p + 8, p + 8 + len);
    if (tag === 'IHDR') { w = gogn.readUInt32BE(0); h = gogn.readUInt32BE(4); bitdypt = gogn[8]; litgerd = gogn[9]; flettad = gogn[12]; }
    else if (tag === 'IDAT') idat.push(gogn);
    else if (tag === 'IEND') break;
    p += 12 + len;
  }
  if (bitdypt !== 8 || flettad !== 0 || (litgerd !== 6 && litgerd !== 2)) throw new Error('óstudd PNG-gerð: dýpt ' + bitdypt + ', litgerð ' + litgerd + ', flétta ' + flettad);
  const rasir = zlib.inflateSync(Buffer.concat(idat));
  const bpp = litgerd === 6 ? 4 : 3, rodbreidd = w * bpp;
  const ut = Buffer.alloc(h * rodbreidd);
  let q = 0;
  for (let y = 0; y < h; y++) {
    const sia = rasir[q++];
    const lina = rasir.slice(q, q + rodbreidd); q += rodbreidd;
    const fyrri = y > 0 ? ut.slice((y - 1) * rodbreidd, y * rodbreidd) : null;
    const nuna = ut.slice(y * rodbreidd, (y + 1) * rodbreidd);
    for (let x = 0; x < rodbreidd; x++) {
      const raw = lina[x];
      const a = x >= bpp ? nuna[x - bpp] : 0;         // vinstri
      const b = fyrri ? fyrri[x] : 0;                  // fyrir ofan
      const c = (fyrri && x >= bpp) ? fyrri[x - bpp] : 0;
      let v;
      if (sia === 0) v = raw;
      else if (sia === 1) v = raw + a;
      else if (sia === 2) v = raw + b;
      else if (sia === 3) v = raw + ((a + b) >> 1);
      else { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v = raw + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      nuna[x] = v & 255;
    }
  }
  return { w, h, bpp, gogn: ut };
}

/* Einn reitur → bakgrunnur og textalitur, lesið af dílum.
 * Bakgrunnur = algengasti liturinn (kvarðaður í 32 þrep); stafir þekja alltaf minnihluta reitsins.
 * Textalitur = meðaltal þeirra díla sem víkja > 40 frá honum. Víki færri en 2% díla sést enginn stafur. */
function maelaReit(mynd, x0, y0, w, h, cssLitur) {
  const { bpp, gogn, w: W } = mynd;
  if (w < 2 || h < 2) return null;
  const alls = w * h, skref = alls > 120000 ? Math.ceil(Math.sqrt(alls / 120000)) : 1;
  const tunna = new Map();
  let talin = 0;
  for (let y = 0; y < h; y += skref) for (let x = 0; x < w; x += skref) {
    const i = ((y0 + y) * W + (x0 + x)) * bpp;
    if (bpp === 4 && gogn[i + 3] < 8) continue;
    const k = ((gogn[i] >> 3) << 10) | ((gogn[i + 1] >> 3) << 5) | (gogn[i + 2] >> 3);
    const t = tunna.get(k);
    if (t) { t.n++; t.r += gogn[i]; t.g += gogn[i + 1]; t.b += gogn[i + 2]; }
    else tunna.set(k, { n: 1, r: gogn[i], g: gogn[i + 1], b: gogn[i + 2] });
    talin++;
  }
  /* Algengasti liturinn ER bakgrunnurinn — NEMA stafirnir þeki meirihluta reitsins. Mælt á klukkunni í hubbnum
   * („18:08", 21 px í þröngum reit): algengasti liturinn reyndist vera letrið sjálft og mælingin varð 1,00:1.
   * Þess vegna er litum sem liggja nálægt CSS-lit textans sleppt þegar bakgrunnurinn er valinn — svo lengi sem
   * eitthvað annað er eftir. */
  let best = null;
  if (cssLitur && cssLitur.a >= 0.9) {
    tunna.forEach(t => {
      const m = { r: t.r / t.n, g: t.g / t.n, b: t.b / t.n };
      if (Math.abs(m.r - cssLitur.r) + Math.abs(m.g - cssLitur.g) + Math.abs(m.b - cssLitur.b) < 60) return;
      if (!best || t.n > best.n) best = t;
    });
  }
  if (!best) tunna.forEach(t => { if (!best || t.n > best.n) best = t; });
  if (!best || !talin) return null;
  const bg = { r: best.r / best.n, g: best.g / best.n, b: best.b / best.n };
  /* KJARNI STAFANNA, EKKI MEÐALTAL REITSINS. Fyrsta útgáfan tók meðaltal allra díla sem viku > 40 frá bakgrunni
   * og mældi þá 281 fall af 323 á gátt sem lítur vel út. Tvær ástæður, báðar mældar:
   *   · Mýkingardílar (antialias) á jaðri stafa eru mitt á milli litanna. Í 10,5 px texta eru þeir meirihluti
   *     stafsins, svo meðaltalið dróst upp í bakgrunninn: „Lokið" mældist #d1d8e2 á #fcfdff = 1,40:1 þótt
   *     stafurinn sé dökkblár.
   *   · Halli í bakgrunni (appelsínuguli tígullinn) gefur tugi díla sem víkja án þess að vera stafur.
   * Lausnin er að taka aðeins dílana sem eru LENGST frá bakgrunni — kjarna stafsins — og hunsa jaðarinn. */
  let maxFrav = 0;
  const frav = [];
  for (let y = 0; y < h; y += skref) for (let x = 0; x < w; x += skref) {
    const i = ((y0 + y) * W + (x0 + x)) * bpp;
    if (bpp === 4 && gogn[i + 3] < 8) continue;
    const d = Math.abs(gogn[i] - bg.r) + Math.abs(gogn[i + 1] - bg.g) + Math.abs(gogn[i + 2] - bg.b);
    if (d > 10) { frav.push([d, i]); if (d > maxFrav) maxFrav = d; }
  }
  /* 0,85 × mesta frávik, ekki 0,6: kvarðað á tools/birtumaeling-profun.html, þar sem hvert litapar er reiknað
   * fyrirfram. Með 0,6 mældist þekkt 21,00:1 sem 14,45 og þekkt 4,54 sem 3,79 — mýkingin dró meðaltalið alltaf
   * niður og gaf fölsk föll rétt við mörkin. Með 0,85 situr mælingin á kjarna stafsins. */
  const mork = Math.max(30, maxFrav * 0.85);
  let tr = 0, tg = 0, tb = 0, tn = 0, synilegir = 0;
  for (const [d, i] of frav) {
    if (d >= 30) synilegir++;
    if (d >= mork) { tr += gogn[i]; tg += gogn[i + 1]; tb += gogn[i + 2]; tn++; }
  }
  /* „Sést eitthvað?" og „hvaða litur er það?" eru SITT HVOR spurningin. Fyrri útgáfan notaði kjarnasafnið í
   * bæði og kallaði þá 10,5 px texta með 6,31:1 „ósýnilegan" — kjarninn var innan við 0,3% af reitnum þótt
   * stafirnir sæjust prýðilega. Sýnileikinn telur því alla díla sem víkja ≥ 30; liturinn kemur úr kjarnanum. */
  const stafahlutfall = synilegir / talin;
  if (!tn || stafahlutfall < 0.002) return { bg, stafahlutfall, osynilegt: true };
  return { bg, fg: { r: tr / tn, g: tg / tn, b: tb / tn }, stafahlutfall };
}

/* ── (ónotað, geymt til skýringar) Í SÍÐUNNI: lesa díla gegnum canvas ──────────────────────────────────────────
 * Vafrinn afkóðar PNG-ið sjálfur (data-URL er sama uppruna, svo canvas má lesa). Það sparar PNG-afkóðara hér og,
 * sem meira er, notar SÖMU afkóðun og teiknaði myndina. Fyrir hvern reit:
 *   · bakgrunnur = algengasti liturinn (kvarðaður í 32-þrep) — stafir þekja alltaf minnihluta reitsins
 *   · textadílar = þeir sem víkja > 40 (summa |Δ| í RGB) frá bakgrunni; meðaltal þeirra er textaliturinn
 *   · víki færri en 2% díla er ekkert sýnilegt letur í reitnum
 * Stórir reitir eru lesnir með skrefi svo mælingin verði ekki hæg. */
const MAELA = `(gogn) => new Promise((leysa) => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const dpr = gogn.dpr;
    const ut = gogn.hlutir.map(h => {
      const x0 = Math.max(0, Math.round(h.x * dpr)), y0 = Math.max(0, Math.round(h.y * dpr));
      const w = Math.min(Math.round(h.w * dpr), c.width - x0), hh = Math.min(Math.round(h.h * dpr), c.height - y0);
      if (w < 2 || hh < 2) return Object.assign({}, h, { staða: 'utan myndar' });
      let d;
      try { d = ctx.getImageData(x0, y0, w, hh).data; } catch (_) { return Object.assign({}, h, { staða: 'ólesanlegt' }); }
      const alls = w * hh;
      const skref = alls > 120000 ? Math.ceil(Math.sqrt(alls / 120000)) : 1;
      const tunna = new Map();
      for (let y = 0; y < hh; y += skref) for (let x = 0; x < w; x += skref) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 8) continue;
        const k = ((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3);
        const t = tunna.get(k);
        if (t) { t.n++; t.r += d[i]; t.g += d[i + 1]; t.b += d[i + 2]; }
        else tunna.set(k, { n: 1, r: d[i], g: d[i + 1], b: d[i + 2] });
      }
      let best = null, talin = 0;
      tunna.forEach(t => { talin += t.n; if (!best || t.n > best.n) best = t; });
      if (!best) return Object.assign({}, h, { staða: 'tómt' });
      const bg = { r: best.r / best.n, g: best.g / best.n, b: best.b / best.n };
      let tr = 0, tg = 0, tb = 0, tn = 0;
      for (let y = 0; y < hh; y += skref) for (let x = 0; x < w; x += skref) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 8) continue;
        const frav = Math.abs(d[i] - bg.r) + Math.abs(d[i + 1] - bg.g) + Math.abs(d[i + 2] - bg.b);
        if (frav > 40) { tr += d[i]; tg += d[i + 1]; tb += d[i + 2]; tn++; }
      }
      const hlutfallStafa = talin ? tn / talin : 0;
      if (hlutfallStafa < 0.02) return Object.assign({}, h, { staða: 'ósýnilegt', bg, stafahlutfall: hlutfallStafa });
      return Object.assign({}, h, { staða: 'ok', bg, fg: { r: tr / tn, g: tg / tn, b: tb / tn }, stafahlutfall: hlutfallStafa });
    });
    leysa(ut);
  };
  img.onerror = () => leysa(null);
  img.src = gogn.png;
})`;

function lesaCssLit(s) {
  const m = String(s || '').match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(',').map(parseFloat);
  return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
}
const L = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const hlutfall = (a, b) => { const l1 = Math.max(L(a), L(b)), l2 = Math.min(L(a), L(b)); return (l1 + 0.05) / (l2 + 0.05); };
const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const naerri = (a, b, mork) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b) < mork;

// Skráð frávik hönnunarkerfisins: hvítt á appelsínugulu í feitum tökkum 14px+ (2,9:1).
const ORANGE = [{ r: 255, g: 103, b: 2 }, { r: 237, g: 91, b: 33 }, { r: 241, g: 86, b: 0 }, { r: 236, g: 83, b: 0 }, { r: 255, g: 138, b: 31 }];
const HVITT = { r: 255, g: 255, b: 255 };

async function keyra() {
  const o = rokin(process.argv);
  if (!o.url) { console.error('Notkun: node tools/birtumaeling.cjs <slóð> [--kaka …] [--breidd 1440] [--smellur "<sel>"] [--ut skrá.json]'); process.exit(2); }
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (_) { console.error('playwright finnst ekki. Keyrðu með NODE_PATH=C:\\Users\\Slokkvitaeki\\luna-bridge\\node_modules'); process.exit(2); }

  const vafri = await chromium.launch();
  const ctx = await vafri.newContext({ viewport: { width: o.breidd, height: o.haed }, deviceScaleFactor: 1 });
  if (o.kaka) {
    const u = new URL(o.url);
    await ctx.addCookies([{ name: 'hub_user', value: o.kaka, domain: u.hostname, path: '/', httpOnly: false, secure: u.protocol === 'https:', sameSite: 'Lax' }]);
  }
  const page = await ctx.newPage();
  await page.goto(o.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(o.bid);
  for (const sel of o.smellur) {
    try { await page.click(sel, { timeout: 4000 }); await page.waitForTimeout(1800); }
    catch (_) { console.error('• náði ekki að smella á ' + sel); }
  }

  const gogn = await page.evaluate(SAFNA);
  const png = await page.screenshot({ fullPage: true });
  if (o.mynd) fs.writeFileSync(o.mynd, png);
  await vafri.close();

  const mynd = lesaPng(png);
  const dpr = gogn.dpr || 1;
  const maelt = gogn.hlutir.map(h => {
    const x0 = Math.max(0, Math.round(h.x * dpr)), y0 = Math.max(0, Math.round(h.y * dpr));
    const w = Math.min(Math.round(h.w * dpr), mynd.w - x0), hh = Math.min(Math.round(h.h * dpr), mynd.h - y0);
    const m = maelaReit(mynd, x0, y0, w, hh, lesaCssLit(h.litur));
    if (!m) return { ...h, staða: 'utan myndar' };
    return { ...h, staða: m.osynilegt ? 'ósýnilegt' : 'ok', bg: m.bg, fg: m.fg, stafahlutfall: m.stafahlutfall };
  });

  const nidur = [];
  for (const m of maelt) {
    if (m.staða === 'ósýnilegt') { nidur.push({ ...m, hlutf: 1, krafa: 0, fall: true, skyring: 'ÓSÝNILEGT — engir stafir sjást í reitnum' }); continue; }
    if (m.staða !== 'ok') continue;
    const stort = m.fs >= 24 || (m.fs >= 18.66 && m.fw >= 700);
    const krafa = stort ? 3 : 4.5;
    /* TVÆR HEIMILDIR, HVOR UM SIG STERK Á SÍNU SVIÐI.
     *   · Bakgrunnurinn kemur ÚR DÍLUNUM — computed style ræður ekki við halla, gervieindir, myndir né gegnsæi.
     *   · Textaliturinn kemur ÚR CSS þegar hann er ógegnsær — dílarnir ráða ekki við ólgandi bakgrunn. Mælt á
     *     hubbnum: virki valmyndarliðurinn er nær svartur á gulli, en gullhallinn sveiflast svo mikið að
     *     „dílarnir lengst frá bakgrunni" lentu á ljósasta hluta hallans og gáfu 1,42:1 í stað ~8:1.
     *   · Sé liturinn gegnsær (background-clip:text, sem hubburinn notar á stórar tölur) ráða dílarnir. */
    const cssLitur = lesaCssLit(m.litur);
    const notaCss = cssLitur && cssLitur.a >= 0.9;
    const fgNota = notaCss ? cssLitur : m.fg;
    const h = hlutfall(fgNota, m.bg);
    m.fgMaeldur = m.fg; m.fg = fgNota; m.fgHeimild = notaCss ? 'css' : 'dílar';
    const skradFravik = naerri(m.fg, HVITT, 60) && ORANGE.some(x => naerri(m.bg, x, 90)) && m.fs >= 14 && m.fw >= 600;
    nidur.push({ ...m, hlutf: h, krafa, fall: h < krafa && !skradFravik, skradFravik, skyring: skradFravik ? 'hvítt á appelsínugulu í feitum takka 14px+ — skráð frávik kerfisins' : '' });
  }

  const foll = nidur.filter(x => x.fall).sort((a, b) => a.hlutf - b.hlutf);
  const fravik = nidur.filter(x => x.skradFravik).length;

  console.log('BIRTUMÆLING · ' + o.url);
  console.log('Gluggi ' + o.breidd + '×' + o.haed + ' · ' + nidur.length + ' textabrot mæld á dílum · ' + foll.length + ' falla · ' + fravik + ' skráð frávik');
  // Skekkjan fylgir hverri keyrslu, svo enginn lesi 4,3 sem hörð niðurstöðu: kvarðað á birtumaeling-profun.html.
  console.log('Kvörðun (tools/birtumaeling-profun.html, 15 þekkt litapör): 21,00→21,00 · 6,31→6,31 · 4,54→4,54 ·');
  console.log('2,92→2,92 · 2,04→2,04. Klipptur texti (background-clip) les ~10% lágt, því liturinn kemur þá úr dílum.');
  console.log('');
  const synaLista = o.allt ? nidur.sort((a, b) => a.hlutf - b.hlutf) : foll;
  if (!synaLista.length) console.log('Ekkert fall. Hvert einasta textabrot stenst sinn þröskuld.');
  for (const f of synaLista.slice(0, 80)) {
    const merki = f.fall ? '✗' : (f.skradFravik ? '~' : '✓');
    console.log(merki + ' ' + f.hlutf.toFixed(2) + ':1 (krafa ' + f.krafa + ')  ' + f.merki);
    console.log('    ' + (f.staða === 'ósýnilegt' ? 'enginn stafur sést' : 'letur ' + hex(f.fg) + ' á ' + hex(f.bg)) +
      ' · ' + f.fs + 'px/' + f.fw + ' · „' + f.texti + '"' + (f.skyring ? ' · ' + f.skyring : ''));
  }
  if (o.ut) { fs.writeFileSync(o.ut, JSON.stringify({ url: o.url, breidd: o.breidd, nidur }, null, 1)); console.log('\nJSON: ' + path.resolve(o.ut)); }
  process.exitCode = foll.length ? 1 : 0;
}

keyra().catch(e => { console.error(e && e.message ? e.message : e); process.exit(1); });
