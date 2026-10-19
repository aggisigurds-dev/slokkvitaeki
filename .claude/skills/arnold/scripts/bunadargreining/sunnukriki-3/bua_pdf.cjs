// Sunnukriki 3 — Búnaðargreining (prufa, ekkert félag í kerfinu): PDF með töflum, merktum blöðum og brunavarnatexta.
const fs = require('fs'), path = require('path');
const { chromium } = require('C:/Users/Slokkvitaeki/luna-bridge/node_modules/playwright');
const H = __dirname;
const G = JSON.parse(fs.readFileSync(path.join(H, 'greining_sunnukriki.json'), 'utf8'));
const BV = JSON.parse(fs.readFileSync(path.join(H, 'brunavarnir_eining.json'), 'utf8'));
// „Brunaviðvörun" var klofin í haus + meginmál (snúinn texti) — sameina
const kaflar = [];
for (const k of BV.kaflar) {
  const fyrri = kaflar[kaflar.length - 1];
  if (fyrri && fyrri.fyrirsogn === k.fyrirsogn && !fyrri.texti) { fyrri.texti = k.fyrirsogn + ' ' + k.texti; fyrri.lykill = fyrri.lykill || k.lykill; } else kaflar.push(Object.assign({}, k));
}
fs.writeFileSync(path.join(H, 'brunavarnir_hreint.json'), JSON.stringify(kaflar, null, 1));
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const img = (f) => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(H, f)).toString('base64');
const T = G.tki, fl = (t) => t.flokkur || 'slokkvi';
const lit = (t) => ({ slokkvi: '#c62828', flotti: '#2e7d32', brunakerfi: '#8e24aa' })[fl(t)];
const rad = (L) => L.map((t) => `<tr><td class="aud" style="color:${lit(t)}">${esc(t.audkenni)}</td><td>${esc(t.bunadur)}</td><td>${esc(t.stadur)}</td><td>${esc(t.tegund)}</td><td class="hak">${t.upplysingar ? '' : '☐'}</td></tr>`).join('');
const haus = '<table><thead><tr><th>Merki</th><th>Búnaður</th><th>Staðsetning</th><th>Tegund</th><th>Uppsett</th></tr></thead><tbody>';
const e1 = T.filter((t) => t.blad === 'e1');
const n = (b) => T.filter((t) => t.blad === b).length;
const ath = [
  'Sunnukriki 3 er stórt hús (kjallari og 1.–6. hæð, margar notkunareiningar). Nýjustu samþykktu gögnin (innsigluð 2026) ná aðeins yfir Hóptíma stúdíó (líkamsrækt, um 190 m², notkunarflokkur 2) á 1. hæð og brunakerfi tveggja rýma á 1. hæð. Aðrar hæðir eru á teikningum frá 2019–2021 og eru EKKI greindar hér.',
  'Hóptíma stúdíó: hönnunin krefst 2 handslökkvitækja (6 L léttvatn, ÍST EN 3) — teikningin sýnir 2 SLT (S1 í afgreiðslu við inngang, S2 í sal við útgang að útistiga). Engin brunaslanga í einingunni.',
  'Brunaviðvörun: sambyggt bruna- og innbrotakerfi (firmakerfi); aðaluppdráttur sýnir 6 reykskynjara (RS), brunakerfisteikning raflagna (Líkamsrækt, 09.07.2026) sýnir 7.',
  'Útgangar: tvær óháðar flóttaleiðir — um aðalinngang (anddyri) og um útistiga úr sal. ÚT-merki: ÚT1 afgreiðsla, ÚT2 salur að afgreiðslu, ÚT3 salur að útistiga. Biðsvæði á stigapalli útistiga er ekki til staðar (fatlaðir þurfa aðstoð við rýmingu).',
  'Þjónustusamningur er skylt um brunaviðvörunarkerfi og handslökkvibúnað, og um neyðarlýsingu (skv. brunavörnum).',
  `Annað rými á 1. hæð (Verkhönnun, brunakerfi 1. hæð, br. 09.06.2026): ${n('e3')} reykskynjarar á teikningu — leigutaki ekki tilgreindur á blaðinu; slökkvibúnaður þess er ekki á því blaði.`,
  'Ekkert félag á Sunnukrika 3 er skráð hjá okkur — greiningin er því ekki vistuð á prófíl. Gögnin eru tilbúin og vistast um leið og staðurinn er stofnaður.',
];
const blodHtml = G.blod.map((b) => `<section class="sida"><div class="haus"><div><div class="yfir">Teikning greiningarinnar</div><div class="titill">${esc(b.nafn)}</div></div><div class="haegri">Sunnukriki 3</div></div><div class="mynd"><img src="${img('merkt_' + b.id + '.jpg')}"></div><div class="skyr"><i style="color:#c62828">● S</i> slökkvitæki · <i style="color:#2e7d32">● ÚT</i> útgangur · <i style="color:#8e24aa">● R</i> reykskynjari</div><div class="heimild">${esc(b.heimild)}</div></section>`).join('');
const html = `<!doctype html><html lang="is"><head><meta charset="utf-8"><title>Sunnukriki 3 — búnaðargreining</title><style>
@page { size: A4 portrait; margin: 13mm 13mm 15mm; } * { box-sizing: border-box; }
body { margin: 0; font: 9.6pt/1.38 'Segoe UI', Arial, sans-serif; color: #1a1a1a; } .sida { break-after: page; } .sida:last-child { break-after: auto; }
.haus { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #b71c1c; padding-bottom: 6px; margin-bottom: 9px; }
.yfir { font-size: 8.5pt; letter-spacing: .08em; text-transform: uppercase; color: #b71c1c; font-weight: 600; } .titill { font: 700 19pt/1.15 Georgia, serif; } .haegri { text-align: right; font-size: 9pt; color: #444; }
h2 { font: 700 12.5pt/1.2 Georgia, serif; margin: 10px 0 5px; } h3 { font-size: 9.8pt; margin: 8px 0 2px; color: #7f0000; break-after: avoid; } p { margin: 0 0 3px; } p.lykill { background: #fff3e0; border-left: 3px solid #e65100; padding: 3px 7px; }
.samt { display: flex; gap: 7px; margin: 5px 0; flex-wrap: wrap; } .samt div { flex: 1; min-width: 120px; border: 1px solid #ddd; border-radius: 4px; padding: 5px 8px; } .samt b { display: block; font-size: 16pt; line-height: 1.1; } .samt span { font-size: 8.3pt; color: #555; }
table { width: 100%; border-collapse: collapse; font-size: 8.2pt; } th { text-align: left; background: #263238; color: #fff; padding: 3px 4px; } td { border-bottom: 1px solid #ddd; padding: 2px 4px; vertical-align: top; } td.aud { font-weight: 700; width: 34px; } td.hak { width: 40px; text-align: center; font-size: 11pt; }
ul.ath { font-size: 8.3pt; color: #333; margin: 6px 0 0; padding-left: 16px; } .mynd { text-align: center; } .mynd img { max-width: 100%; max-height: 225mm; border: 1px solid #ccc; } .heimild { font-size: 7.8pt; color: #666; margin-top: 4px; }
.dalkar { column-count: 2; column-gap: 7mm; font-size: 9pt; } .dalkar p { break-inside: avoid-column; } .skyr { font-size: 8.3pt; text-align: center; margin: 4px 0; } .skyr i { font-style: normal; font-weight: 700; }
</style></head><body>
<section class="sida"><div class="haus"><div><div class="yfir">Búnaðargreining · brunavarnir og staðsetning búnaðar</div><div class="titill">Sunnukriki 3, 270 Mosfellsbær</div></div><div class="haegri">Hóptíma stúdíó (líkamsrækt) · 1. hæð<br>Prufa · 19/10/2026 · Claude (Arnold)</div></div>
<div class="samt"><div><b>2</b><span>handslökkvitæki (6 L léttvatn) — Hóptíma stúdíó</span></div><div><b>6</b><span>reykskynjarar á aðaluppdrætti (7 á brunakerfisteikningu)</span></div><div><b>3</b><span>ÚT-merki · 2 óháðar flóttaleiðir</span></div><div><b>${n('e3')}</b><span>reykskynjarar í öðru rými á 1. hæð (Verkhönnun)</span></div></div>
<h2>Hóptíma stúdíó — slökkvibúnaður</h2>${haus}${rad(e1.filter((t) => fl(t) === 'slokkvi'))}</tbody></table>
<h2>Útgangar (ÚT)</h2>${haus}${rad(e1.filter((t) => fl(t) === 'flotti'))}</tbody></table>
<h2>Reykskynjarar (aðaluppdráttur)</h2>${haus}${rad(e1.filter((t) => fl(t) === 'brunakerfi'))}</tbody></table>
<ul class="ath">${ath.map((a) => '<li>' + esc(a) + '</li>').join('')}</ul>
<div class="heimild">Heimildir: Kortasjá Mosfellsbæjar, landnr. 205123 — aðaluppdrættir „Sunnukriki 3_hæð1" innsiglaðir 01.10.2026 (Arkform, Hóptíma stúdíó); raflagnauppdrættir innsiglaðir 09.07.2026 (Líkamsrækt) og 24.08.2026 (Verkhönnun). Staðsetningar leiðbeinandi; endanlegt samþykki brunavarna er hjá hönnuði og slökkviliði.</div></section>
${blodHtml}
<section class="sida"><div class="haus"><div><div class="yfir">Brunavarnir — orðrétt</div><div class="titill">Hóptíma stúdíó</div></div><div class="haegri">Aðaluppdr. 01.10.2026</div></div><div class="dalkar">${kaflar.map((k) => '<h3>' + esc(k.fyrirsogn) + '</h3><p' + (k.lykill ? ' class="lykill"' : '') + '>' + esc(k.texti) + '</p>').join('')}</div>
<div class="heimild">Úr brunavarnatexta á aðaluppdrætti (bls. 1, „Brunavarnir"), Sunnukriki 3, Hóptíma stúdíó.</div></section>
</body></html>`;
(async () => {
  const b = await chromium.launch({ headless: true }); const p = await b.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  const ut = path.join(H, 'Sunnukriki 3 - bunadargreining.pdf');
  await p.pdf({ path: ut, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font:7pt Segoe UI,Arial;color:#888;width:100%;padding:0 12mm;display:flex;justify-content:space-between"><span>Slökkvitæki ehf · Sunnukriki 3 · búnaðargreining (prufa)</span><span>bls. <span class="pageNumber"></span>/<span class="totalPages"></span></span></div>' });
  await b.close(); console.log('ok', fs.statSync(ut).size);
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
