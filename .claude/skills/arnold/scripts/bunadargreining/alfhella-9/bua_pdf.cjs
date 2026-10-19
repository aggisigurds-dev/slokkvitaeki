// Álfhella 9 (Kvarnir ehf., 1871): útprentanlegt blað — búnaðartafla, merktar teikningar, brunavarnatexti mhl 01 + mhl 02.
const fs = require('fs'), path = require('path');
const { chromium } = require('C:/Users/Slokkvitaeki/luna-bridge/node_modules/playwright');
const H = __dirname;
const B = JSON.parse(fs.readFileSync(path.join(H, 'bunadur.json'), 'utf8'));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const img = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(H, f)).toString('base64');
const texti = (f) => fs.readFileSync(path.join(H, f), 'utf8').trim().split(/\r?\n/).map((l) =>
  l.startsWith('## ') ? '<h3>' + esc(l.slice(3)) + '</h3>' : l.startsWith('!') ? '<p class="lykill">' + esc(l.slice(1)) + '</p>' : '<p>' + esc(l) + '</p>').join('\n');

const TEG = { Slökkvitæki: 'Handslökkvitæki', Brunaslanga: 'Slöngukefli (ÍST EN 671-1)', Brunaviðvörunarkerfi: 'Stjórnstöð brunaviðvörunarkerfis' };
const tegund = (t) => t.tegund === 'Brunaslanga' ? 'Slöngukefli' : t.tegund === 'Brunaviðvörunarkerfi' ? '—' : t.blad === 'mhl02' ? '6 L léttvatn' : '6 L léttvatn *';
const rod = (t, i) => `<tr class="${t.tegund === 'Brunaviðvörunarkerfi' ? 'upplys' : ''}"><td class="nr">${i}</td><td class="aud a-${t.tegund === 'Brunaslanga' ? 'bs' : t.tegund === 'Brunaviðvörunarkerfi' ? 'bv' : 's'}">${esc(t.id)}</td>
  <td>${esc(TEG[t.tegund])}</td><td>${esc(t.stadur)}</td><td>${tegund(t)}</td><td class="hak">${t.tegund === 'Brunaviðvörunarkerfi' ? '' : '☐'}</td><td class="ath"></td></tr>`;
let n = 0;
const hluti = (blad, haed, fyrirsogn) => `<tr class="hluti"><td colspan="7">${fyrirsogn}</td></tr>` +
  B.tki.filter((t) => t.blad === blad && t.haed === haed).map((t) => rod(t, t.tegund === 'Brunaviðvörunarkerfi' ? '' : ++n)).join('');
const tafla = hluti('mhl01', '1. hæð', 'Matshluti 01 — 1. hæð') + hluti('mhl01', '2. hæð', 'Matshluti 01 — 2. hæð (milliloft)') +
  hluti('mhl02', 'Mhl. 02', 'Matshluti 02 — smiðja, verkstæði, þvottur') +
  `<tr><td class="nr">${++n}</td><td class="aud a-s">CO2</td><td>Handslökkvitæki</td><td>Við aðalrafmagnstöflu mhl 02 — taflan er ekki merkt á teikningu; staðsetja á staðnum</td><td>5 kg kolsýra</td><td class="hak">☐</td><td class="ath"></td></tr>`;
const fjS = B.tki.filter((t) => t.tegund === 'Slökkvitæki').length, fjBS = B.tki.filter((t) => t.tegund === 'Brunaslanga').length;

const haus = (undir) => `<div class="haus"><div><div class="yfir">Brunavarnir · staðsetning búnaðar</div><div class="titill">Álfhella 9, 221 Hafnarfjörður</div></div>
  <div class="hægri">Kvarnir ehf.<br>${undir}</div></div>`;
const skyring = `<div class="skyr"><span><i class="h s"></i>Slökkvitæki (S / SLT)</span><span><i class="h bs"></i>Brunaslanga / slöngukefli (BS)</span><span><i class="h bv"></i>Stjórnstöð brunaviðvörunarkerfis (BV)</span></div>`;

const html = `<!doctype html><html lang="is"><head><meta charset="utf-8"><title>Álfhella 9 — brunavarnir</title><style>
@page { size: A4 portrait; margin: 14mm 14mm 16mm; }
@page land { size: A4 landscape; margin: 12mm 12mm 14mm; }
* { box-sizing: border-box; }
body { margin: 0; font: 10pt/1.4 'Segoe UI', Arial, sans-serif; color: #1a1a1a; }
.sida { break-after: page; }
.sida:last-child { break-after: auto; }
.land { page: land; }
.haus { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #b71c1c; padding-bottom: 6px; margin-bottom: 10px; }
.yfir { font-size: 8.5pt; letter-spacing: .08em; text-transform: uppercase; color: #b71c1c; font-weight: 600; }
.titill { font: 700 19pt/1.15 Georgia, 'Times New Roman', serif; }
.hægri { text-align: right; font-size: 9pt; color: #444; }
h2 { font: 700 13pt/1.2 Georgia, serif; margin: 12px 0 6px; }
h3 { font-size: 10pt; margin: 9px 0 2px; color: #7f0000; }
p { margin: 0 0 4px; }
p.lykill { background: #fff3e0; border-left: 3px solid #e65100; padding: 4px 7px; }
.samt { display: flex; gap: 8px; margin: 6px 0 6px; }
.samt div { flex: 1; border: 1px solid #ddd; border-radius: 4px; padding: 6px 8px; }
.samt b { display: block; font-size: 17pt; line-height: 1.1; }
.samt span { font-size: 8.5pt; color: #555; }
table { width: 100%; border-collapse: collapse; font-size: 8.8pt; }
th { text-align: left; background: #263238; color: #fff; padding: 4px 5px; font-weight: 600; }
td { border-bottom: 1px solid #ddd; padding: 3px 5px; vertical-align: top; }
td:nth-child(5) { white-space: nowrap; }
tr.hluti td { background: #eceff1; font-weight: 700; border-bottom: 1px solid #b0bec5; }
tr.upplys td { color: #777; font-style: italic; }
td.nr { width: 18px; color: #888; }
td.aud { font-weight: 700; width: 38px; }
.a-s { color: #c62828; } .a-bs { color: #1565c0; } .a-bv { color: #8e24aa; }
td.hak { width: 46px; text-align: center; font-size: 12pt; }
td.ath { width: 90px; }
.nota { font-size: 8.5pt; color: #444; margin-top: 8px; }
.nota li { margin-bottom: 2px; }
.mynd { text-align: center; }
.land .mynd img { max-width: 100%; max-height: 158mm; }
.port .mynd img { max-height: 228mm; max-width: 100%; }
.mynd img { border: 1px solid #ccc; }
.skyr { display: flex; gap: 16px; justify-content: center; font-size: 8.5pt; margin: 6px 0 2px; }
.skyr .h { display: inline-block; width: 11px; height: 11px; border-radius: 50%; border: 2.5px solid; margin-right: 5px; vertical-align: -2px; }
.h.s { border-color: #d21e1e; } .h.bs { border-color: #145ac8; } .h.bv { border-color: #8c1e8c; }
.heimild { font-size: 8pt; color: #666; margin-top: 4px; }
.dalkar { column-count: 2; column-gap: 7mm; font-size: 9.2pt; line-height: 1.36; }
.dalkar h3 { break-after: avoid; }
.dalkar p { break-inside: avoid-column; }
</style></head><body>

<section class="sida">
${haus('Fyrirtæki 1871 · kt. 630309-0500<br>19/10/2026')}
<div class="samt">
  <div><b>${fjS + 1}</b><span>handslökkvitæki (${fjS} á teikningum + 5 kg CO2 við aðalrafmagnstöflu mhl 02)</span></div>
  <div><b>${fjBS}</b><span>slöngukefli — bæði í mhl 01 („tvö slöngukefli sem ná um allt húsið“)</span></div>
  <div><b>2</b><span>matshlutar · mhl 01 ≈ 733 m² (1. hæð + milliloft) · mhl 02 ≈ 420 m²</span></div>
</div>
<h2>Búnaður og staðsetning</h2>
<table><thead><tr><th>#</th><th>Merki</th><th>Búnaður</th><th>Staðsetning (skv. teikningu)</th><th>Tegund</th><th>Uppsett</th><th>Athugasemd</th></tr></thead>
<tbody>${tafla}</tbody></table>
<ul class="nota">
  <li>Merkin (S1, BS1, SLT1 …) eru þau sömu og á teikningunum á næstu síðum og á Teikningu fyrirtækisins í appinu („Nýtt“-merki, í bið).</li>
  <li>* Mhl 01 tilgreinir ekki tegund handslökkvitækja (aðeins gr. 9.4.4, 165.BR1 og ÍST EN 3) — 6 L léttvatn er tillaga. Mhl 02 segir „t.d. 6 L léttvatn en 5 kg kolsýra við aðalrafmagnstöflu“.</li>
  <li>Mhl 02 skal felldur undir þjónustusamning mhl 01 um handslökkvitæki, reykskynjara og leiðar- og neyðarlýsingu. Reykskynjarar í mhl 02: a.m.k. einn á hverja 80 m² (6 sýndir á teikningu: 2 í smiðju, 2 í verkstæði, 2 í þvotti).</li>
  <li>Staðsetningar eru lesnar af samþykktum aðaluppdráttum og eru leiðbeinandi; endanlegt samþykki brunavarna er hjá hönnuði og slökkviliði.</li>
</ul>
<div class="heimild">Heimildir: Aðaluppdráttur mhl 01, Grunnmynd 1. og 2. hæðar og byggingarlýsing (PPVERK), samþ. 27/05/2020 · Aðaluppdráttur mhl 02 [innsiglaður], 15/07/2026, brunavarnir: Brunahönnun slf, mál 26-116.</div>
</section>

<section class="sida land">
${haus('Matshluti 01 — 1. hæð')}
<div class="mynd"><img src="${img('merkt_h1.png')}"></div>
${skyring}
<div class="heimild">Aðaluppdráttur mhl 01, Grunnmynd 1. hæðar, samþ. 27/05/2020. Merki: S = slökkvitæki, BS = brunaslanga, BV = brunaviðvörunarkerfi.</div>
</section>

<section class="sida land">
${haus('Matshluti 01 — 2. hæð (milliloft)')}
<div class="mynd"><img src="${img('merkt_h2.png')}"></div>
${skyring}
<div class="heimild">Aðaluppdráttur mhl 01, Grunnmynd 2. hæðar, samþ. 27/05/2020.</div>
</section>

<section class="sida">
${haus('Matshluti 01 — samantekt á brunavörnum hússins')}
<div class="dalkar">${texti('brunavarnir_mhl01.txt')}</div>
<div class="heimild">Orðrétt úr byggingarlýsingu á aðaluppdrætti mhl 01 (samþ. 27/05/2020).</div>
</section>

<section class="sida port">
${haus('Matshluti 02 — smiðja, verkstæði, þvottur')}
<div class="mynd"><img src="${img('merkt_m2.png')}"></div>
${skyring}
<div class="heimild">Aðaluppdráttur mhl 02 [innsiglaður], 15/07/2026. SLT = slökkvitæki; CO2 við aðalrafmagnstöflu er ekki merkt á teikningu.</div>
</section>

<section class="sida">
${haus('Matshluti 02 — brunavarnir')}
<div class="dalkar">${texti('brunavarnir_mhl02_hreint.txt')}</div>
<div class="heimild">Orðrétt úr greinargerð brunavarna á aðaluppdrætti mhl 02 (Brunahönnun slf, mál 26-116, júlí 2026).</div>
</section>
</body></html>`;

(async () => {
  fs.writeFileSync(path.join(H, 'Alfhella9_brunavarnir.html'), html);
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  const ut = path.join(H, 'Alfhella 9 - brunavarnir og slokkvitaeki.pdf');
  await p.pdf({ path: ut, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font:7pt Segoe UI,Arial;color:#888;width:100%;padding:0 12mm;display:flex;justify-content:space-between"><span>Slökkvitæki ehf · Álfhella 9 · Kvarnir ehf.</span><span>bls. <span class="pageNumber"></span>/<span class="totalPages"></span></span></div>' });
  await b.close();
  console.log('ok', ut, fs.statSync(ut).size);
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
