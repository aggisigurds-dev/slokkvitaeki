#!/usr/bin/env node
/* === SÍMASÓPUR — hvað er of smátt og hvað raðast illa á síma ====================================================
 *
 * Agnar 18.11.2026: „En geturðu rennt yfir símann og síðurnar. Þær eru svo oft til vandræða. Sumt alllt of smátt,
 * og raðast leiðinlega."
 *
 * HVERS VEGNA SÉRSTAKT TÓL. Síðurnar í þessu appi velja símaútlit af `data-viewmode` á <html>, EKKI af
 * gluggabreidd (sjá 153: „Útlitið ræðst af viewmode, EKKI gluggabreidd"). Mjór gluggi einn og sér sýnir því
 * ekki það sem Agnar sér í símanum — tólið setur hamminn sjálft og sendir `slokk-viewmode`, eins og rofinn gerir.
 *
 * HVAÐ ER MÆLT (fjögur atriði, hvert með tölu svo hægt sé að forgangsraða):
 *   1. OF SMÁTT — letur undir gólfi. Hönnunarkerfið (Brunahólf V2) setur gólfið 11,5 px og það aðeins fyrir
 *      hástafamerki; lesmál fer ekki undir 12. Tólið telur allt undir 11 sem fall og 11–12 sem aðvörun.
 *   2. FLÆÐIR ÚT — síðan skrunar lárétt, eða stakur hlutur nær út fyrir gluggann. Á síma er lárétt skrun
 *      nánast alltaf villa, ekki val.
 *   3. KREISTIR DÁLKAR — hlutur mjórri en 90 px sem ber þrjár línur eða fleiri. Þannig lítur „raðast leiðinlega"
 *      út í tölum: textinn fær ekki breidd og brotnar í stafla af stuttum bútum.
 *   4. SNERTIFLETIR — takkar, tenglar og reitir undir 36 px á hæð.
 *
 * NOTKUN
 *   NODE_PATH=C:\Users\Slokkvitaeki\luna-bridge\node_modules node tools/simasopur.cjs <slóð|#sýn[,#sýn…]> [valkostir]
 *     --kaka <gildi>   lotu-kaka (uid 10, sjá CLAUDE.md). Aldrei skrifuð í skrá.
 *     --breidd 390     gluggabreidd (sjálfgefið 390 — S26 er breiðari en 390 er þrengsta raunhæfa)
 *     --bid 12000      bið eftir teikningu
 *     --grunnur <url>  grunnslóð þegar #sýnir eru taldar upp (sjálfgefið lifandi síðan)
 *     --allt           telja líka aðvaranir (11–12 px)
 *
 * ÞAÐ SEM TÓLIÐ SEGIR EKKI. Það mælir ekki hvort sími Agnars teikni síðuna í tölvuútgáfu — það gerist þegar
 * JS-klasinn velur annað en hermirinn (skráð í minni 18.11.2026). Finnist ekkert hér en hann sér samt vandræði
 * er næsta skref að lesa `data-viewmode` í HANS tæki, ekki að herma eftir breiddinni.
 * ============================================================================================================== */
'use strict';

const LIFANDI = 'https://slokkvitaeki.netlify.app/';

function rokin(argv) {
  const o = { synir: [], kaka: null, breidd: 390, bid: 12000, grunnur: LIFANDI, allt: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--kaka') o.kaka = argv[++i];
    else if (a === '--breidd') o.breidd = +argv[++i];
    else if (a === '--bid') o.bid = +argv[++i];
    else if (a === '--grunnur') o.grunnur = argv[++i];
    else if (a === '--allt') o.allt = true;
    else if (!o.synir.length) o.synir = a.split(',').map(x => x.trim()).filter(Boolean);
  }
  return o;
}

/* Keyrt í síðunni. Skuggarætur fylgja með (Þjónustuborðið teiknar allt í shadowRoot) og hlutir sem
 * skrunkassi klippir eru felldir út — hvort tveggja lærdómur úr birtumaeling.cjs sama dag. */
const SKANNA = `(() => {
  const ut = { ofSmatt: [], advorun: [], utfyrir: [], kreist: [], snerti: [] };
  const allir = [];
  (function ganga(rot) { rot.querySelectorAll('*').forEach(e => { allir.push(e); if (e.shadowRoot) ganga(e.shadowRoot); }); })(document);
  const W = innerWidth;
  const merki = e => (e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '')).slice(0, 40);
  const klippt = e => {
    for (let p = e.parentElement; p; p = p.parentElement) {
      const cs = getComputedStyle(p);
      if (!/auto|scroll|hidden|clip/.test(cs.overflow + cs.overflowX + cs.overflowY)) continue;
      const pr = p.getBoundingClientRect(), r = e.getBoundingClientRect();
      if (r.right < pr.left + 1 || r.left > pr.right - 1 || r.bottom < pr.top + 1 || r.top > pr.bottom - 1) return true;
    }
    return false;
  };
  allir.forEach(e => {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || +cs.opacity < 0.08) return;
    if (klippt(e)) return;
    const texti = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    const fs = parseFloat(cs.fontSize) || 0;
    // 1 + 2: letur
    if (texti && fs) {
      const t = (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 34);
      if (fs < 11) ut.ofSmatt.push({ k: merki(e), fs: +fs.toFixed(1), fw: +cs.fontWeight || 400, t });
      else if (fs < 12) ut.advorun.push({ k: merki(e), fs: +fs.toFixed(1), fw: +cs.fontWeight || 400, t });
    }
    // 3: út fyrir gluggann — aðeins ysta lagið, ekki hvert barn þess
    if (r.right > W + 2 && r.width < W * 3 && e.parentElement && e.parentElement.getBoundingClientRect().right <= W + 2) {
      ut.utfyrir.push({ k: merki(e), haegri: Math.round(r.right), breidd: Math.round(r.width), t: (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30) });
    }
    /* 4: kreistur dálkur — mjór kassi þar sem TEXTINN brotnar í margar línur.
     * Fyrsta útgáfan deildi hæð kassans með línuhæð og taldi 44 px háan takka með 12 px letri „þrjár línur".
     * Mælt á Birgðum: sex slíkir „fundust", allir með white-space:nowrap, 44 px háir af INNRA BILI — réttir
     * snertifletir, ekki brotinn texti. Nú er línufjöldinn lesinn af textanum sjálfum (Range skilar einum
     * ramma á hverja teiknaða línu) og aðeins skoðaður þar sem textinn MÁ brotna. */
    if (texti && fs && r.width < 120 && !/nowrap|pre$/.test(cs.whiteSpace)) {
      let linur = 0;
      try {
        const rng = document.createRange();
        [...e.childNodes].forEach(nn => { if (nn.nodeType === 3 && nn.textContent.trim()) { rng.selectNodeContents(nn); linur = Math.max(linur, rng.getClientRects().length); } });
      } catch (_) {}
      if (linur >= 3) ut.kreist.push({ k: merki(e), w: Math.round(r.width), h: Math.round(r.height), linur, t: (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 30) });
    }
    /* 5: snertifletir. Hlutur sem situr INNI í öðrum smellanlegum hlut er ekki sjálfstætt skotmark —
     * fingurinn hittir ytri hlutinn. Án þessa taldi tólið hvert merki og hverja ör inni í röð sem fall. */
    if (/^(button|a|select|summary)$/.test(e.tagName.toLowerCase()) || (e.tagName === 'INPUT' && !/hidden/.test(e.type))) {
      const ytri = e.parentElement && e.parentElement.closest('button,a[href],summary,label');
      if (!ytri && r.height > 0 && r.height < 36 && r.width > 8) ut.snerti.push({ k: merki(e), h: Math.round(r.height), w: Math.round(r.width), t: (e.textContent || e.value || '').replace(/\\s+/g, ' ').trim().slice(0, 24) });
    }
  });
  return { ut, sidaUtfyrir: document.documentElement.scrollWidth > W + 2,
    sw: document.documentElement.scrollWidth, w: W, viewmode: document.documentElement.getAttribute('data-viewmode') };
})()`;

function hopa(listi, lykill) {
  const m = new Map();
  listi.forEach(x => { const k = lykill(x); const t = m.get(k); if (t) t.n++; else m.set(k, { n: 1, d: x }); });
  return [...m.entries()].map(([k, v]) => ({ k, n: v.n, d: v.d })).sort((a, b) => b.n - a.n);
}

async function keyra() {
  const o = rokin(process.argv);
  if (!o.synir.length) { console.error('Notkun: node tools/simasopur.cjs "#bord,#sala" [--kaka …] [--breidd 390]'); process.exit(2); }
  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (_) { console.error('playwright finnst ekki — keyrðu með NODE_PATH=C:\\Users\\Slokkvitaeki\\luna-bridge\\node_modules'); process.exit(2); }

  const vafri = await chromium.launch();
  const ctx = await vafri.newContext({ viewport: { width: o.breidd, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  if (o.kaka) {
    const u = new URL(o.grunnur);
    await ctx.addCookies([{ name: 'hub_user', value: o.kaka, domain: u.hostname, path: '/', secure: u.protocol === 'https:', sameSite: 'Lax' }]);
  }
  const page = await ctx.newPage();
  const allt = {};
  for (const syn of o.synir) {
    const slod = syn.startsWith('http') ? syn : new URL(syn, o.grunnur).href;
    await page.goto(slod, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Síðurnar velja símaútlit af data-viewmode, ekki af breidd — setja hann eins og rofinn gerir.
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-viewmode', 'mobile');
      document.dispatchEvent(new CustomEvent('slokk-viewmode', { detail: { vm: 'mobile' } }));
    });
    await page.waitForTimeout(o.bid);
    allt[syn] = await page.evaluate(SKANNA);
  }
  await vafri.close();

  console.log('SÍMASÓPUR · ' + o.breidd + ' px · viewmode=mobile');
  console.log('Gólf: fall undir 11 px, aðvörun 11–12 px. Kreistur dálkur = mjórri en 90 px með 3+ línum.');
  for (const [syn, r] of Object.entries(allt)) {
    if (!r || !r.ut) { console.log('\n— ' + syn + ': ekkert mælt'); continue; }
    const u = r.ut;
    console.log('\n═══ ' + syn + ' ' + (r.viewmode === 'mobile' ? '' : '(viewmode=' + r.viewmode + '!) ') +
      '· of smátt ' + u.ofSmatt.length + ' · aðvörun ' + u.advorun.length + ' · út fyrir ' + u.utfyrir.length +
      ' · kreist ' + u.kreist.length + ' · snertifletir ' + u.snerti.length + (r.sidaUtfyrir ? ' · SÍÐAN SKRUNAR LÁRÉTT (' + r.sw + '/' + r.w + ')' : ''));
    const syna = (titill, listi, lykill, lina) => {
      if (!listi.length) return;
      const h = hopa(listi, lykill);
      console.log('  ' + titill + ' (' + listi.length + ' tilvik, ' + h.length + ' hópar)');
      h.slice(0, 6).forEach(x => console.log('    ' + String(x.n).padStart(3) + ' × ' + lina(x.d)));
    };
    syna('OF SMÁTT', u.ofSmatt, x => x.k + '|' + x.fs, x => x.fs + 'px/' + x.fw + '  ' + x.k + '  „' + x.t + '"');
    if (o.allt) syna('AÐVÖRUN 11–12 px', u.advorun, x => x.k + '|' + x.fs, x => x.fs + 'px  ' + x.k + '  „' + x.t + '"');
    syna('ÚT FYRIR GLUGGANN', u.utfyrir, x => x.k, x => x.k + '  hægri ' + x.haegri + ' px (gluggi ' + r.w + ')  „' + x.t + '"');
    syna('KREISTUR DÁLKUR', u.kreist, x => x.k + '|' + x.w, x => x.w + 'px breiður, ' + x.linur + ' línur  ' + x.k + '  „' + x.t + '"');
    syna('SNERTIFLÖTUR < 36 px', u.snerti, x => x.k + '|' + x.h, x => x.h + 'px hár  ' + x.k + '  „' + x.t + '"');
  }
}

keyra().catch(e => { console.error(e && e.message ? e.message : e); process.exit(1); });
