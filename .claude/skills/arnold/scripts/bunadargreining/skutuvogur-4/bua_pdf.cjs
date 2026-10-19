// Skútuvogur 4 (Álfaborg, 661): Búnaðargreining — PDF (tafla + samanburður, merktar hæðir 2025, brunavarnir MHL 2 orðrétt)
// og gögnin fyrir bunadargreining-röðina (gogn.json).
const fs = require('fs'), path = require('path');
const { chromium } = require('C:/Users/Slokkvitaeki/luna-bridge/node_modules/playwright');
const H = __dirname;
const U = JSON.parse(fs.readFileSync(path.join(H, 'hannad.json'), 'utf8'));
const BV = JSON.parse(fs.readFileSync(path.join(H, 'brunavarnir_2025.json'), 'utf8'));
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const SU = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], SK = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const hd = { apikey: SK, Authorization: 'Bearer ' + SK };
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const img = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(H, f)).toString('base64');
const nr = (a) => [a[0] === 'B' ? 1 : 0, +a.replace(/\D/g, '')];

(async () => {
  const taeki = await (await fetch(SU + '/rest/v1/uttaeki?fyrirtaeki_id=eq.661&select=id,type,size,serial,status,location', { headers: hd })).json();
  const T = Object.fromEntries(taeki.map((t) => [String(t.id), t]));
  const rodud = U.slice().sort((a, b) => { const x = nr(a.audkenni), y = nr(b.audkenni); return x[0] - y[0] || x[1] - y[1]; });
  const aTeikn = (u) => { const t = u.unitId && T[String(u.unitId)]; return u.unitId ? '✓ ' + (t ? t.type + ' ' + (t.size || '') + ' #' + t.serial : 'merki ' + u.unitId) + ' (' + u.fjarl_m + ' m)' : '—'; };
  const rad = rodud.map((u) => `<tr><td class="aud ${u.t === 'BRSL' ? 'a-bs' : 'a-s'}">${esc(u.audkenni)}</td><td class="hd">${esc(u.haed)}</td><td>${esc(u.stadur)}</td><td>${esc(u.tegund)}</td><td class="tk">${esc(aTeikn(u))}</td><td class="hak">☐</td></tr>`).join('');
  const fj = (f) => taeki.filter(f).length;
  const skrSl = fj((t) => !/slang/i.test(t.type)), skrBs = fj((t) => /slang/i.test(t.type));
  const skrTeg = Object.entries(taeki.filter((t) => !/slang/i.test(t.type)).reduce((a, t) => { const k = (t.type + ' ' + (t.size || '')).trim(); a[k] = (a[k] || 0) + 1; return a; }, {})).map(([k, v]) => v + '× ' + k).join(', ');
  const hS = U.filter((u) => u.t !== 'BRSL').length, hB = U.filter((u) => u.t === 'BRSL').length;
  const ath = [
    'Gildandi aðaluppdrættir eru teikningasett samþykkt 9. desember 2025 (USK25050395) — breytt notkun MHL 2 í verslun (Álfaborg). Teikning staðarins í appinu notar enn blöðin frá 11.10.2022 (fyrri notkun: verkstæði, þrif á bílum, útileigubúnaður); hönnunarstaðirnir hér eru varpaðir á þau blöð.',
    `Hönnun 2025: ${hS} handslökkvitæki (12 „L" = léttvatn, 3 „HST" = handslökkvitæki) og ${hB} brunaslöngur. Skráð hjá okkur: ${skrSl} slökkvitæki (${skrTeg}) og ${skrBs} brunaslöngur — ${hS - skrSl > 0 ? (hS - skrSl) + ' slökkvitæki vantar miðað við hönnun' : 'stemmir'}; brunaslöngurnar stemma (${skrBs}/${hB}) en engin þeirra er staðsett á teikningu.`,
    'Brunahönnun: „6 L léttvatn og 5 kg kolsýra við aðalrafmagnstöflu" — S8 (HST við inntök/rafmagnstöflu) er kolsýrutækið. 2 kg kolsýrutækin tvö eru ekki í hönnuninni.',
    'Á Teikningu eru 7 tæki: 3 standa á hönnunarstað (S6, S8, S11); 4 standa eftir eldri teikningunni (8212 í miðjum lager, 8216 við kæli/frysti, 8217 og 8218 á 2. hæð) — 5–15 m frá næsta hönnunarstað.',
    'Tækin eru skráð með staðsetningu „Skútuvogi 6" í tækjaskrá, en fyrirtækið er á Skútuvogi 4 — staðfesta að þau séu í þessu húsi. 4 léttvatnstæki eru merkt í láni.',
    'HST er ekki í skýringum blaðsins; lesið sem handslökkvitæki (Agnar 19.10.2026: „sama og ST").',
  ];
  const kaflar = BV.map((k) => (k.fyrirsogn ? `<h3>${esc(k.fyrirsogn)}</h3>` : '') + k.texti.split('\n').map((p) => `<p${k.lykill ? ' class="lykill"' : ''}>${esc(p)}</p>`).join('')).join('');
  const haus = (undir) => `<div class="haus"><div><div class="yfir">Búnaðargreining · brunavarnir og staðsetning búnaðar</div><div class="titill">Skútuvogur 4, 104 Reykjavík</div></div><div class="haegri">Álfaborg · MHL 2<br>${undir}</div></div>`;
  const skyr = `<div class="skyr"><span><i class="h s"></i>Handslökkvitæki (L / HST)</span><span><i class="h bs"></i>Brunaslanga (BRSL)</span></div>`;
  const html = `<!doctype html><html lang="is"><head><meta charset="utf-8"><title>Skútuvogur 4 — búnaðargreining</title><style>
@page { size: A4 portrait; margin: 13mm 13mm 15mm; }
* { box-sizing: border-box; } body { margin: 0; font: 9.6pt/1.38 'Segoe UI', Arial, sans-serif; color: #1a1a1a; }
.sida { break-after: page; } .sida:last-child { break-after: auto; }
.haus { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #b71c1c; padding-bottom: 6px; margin-bottom: 9px; }
.yfir { font-size: 8.5pt; letter-spacing: .08em; text-transform: uppercase; color: #b71c1c; font-weight: 600; }
.titill { font: 700 19pt/1.15 Georgia, serif; } .haegri { text-align: right; font-size: 9pt; color: #444; }
h2 { font: 700 12.5pt/1.2 Georgia, serif; margin: 10px 0 5px; } h3 { font-size: 9.8pt; margin: 8px 0 2px; color: #7f0000; break-after: avoid; }
p { margin: 0 0 3px; } p.lykill { background: #fff3e0; border-left: 3px solid #e65100; padding: 3px 7px; }
.samt { display: flex; gap: 7px; margin: 4px 0; } .samt div { flex: 1; border: 1px solid #ddd; border-radius: 4px; padding: 5px 8px; }
.samt b { display: block; font-size: 16pt; line-height: 1.1; } .samt span { font-size: 8.3pt; color: #555; }
table { width: 100%; border-collapse: collapse; font-size: 8pt; } th { text-align: left; background: #263238; color: #fff; padding: 3px 4px; font-weight: 600; }
td { border-bottom: 1px solid #ddd; padding: 1.6px 4px; vertical-align: top; } td.aud { font-weight: 700; width: 30px; } td.hd { white-space: nowrap; }
.a-s { color: #c62828; } .a-bs { color: #1565c0; } td.hak { width: 34px; text-align: center; font-size: 11pt; } td.tk { width: 150px; color: #2e6b34; font-size: 7.8pt; }
ul.ath { font-size: 7.9pt; color: #333; margin: 6px 0 0; padding-left: 16px; } ul.ath li { margin-bottom: 2px; }
.mynd { text-align: center; } .mynd img { max-width: 100%; max-height: 235mm; border: 1px solid #ccc; }
.skyr { display: flex; gap: 16px; justify-content: center; font-size: 8.5pt; margin: 5px 0 2px; }
.skyr .h { display: inline-block; width: 11px; height: 11px; border-radius: 50%; border: 2.5px solid; margin-right: 5px; vertical-align: -2px; }
.h.s { border-color: #d21e1e; } .h.bs { border-color: #145ac8; } .heimild { font-size: 7.8pt; color: #666; margin-top: 4px; }
.dalkar { column-count: 2; column-gap: 7mm; font-size: 9pt; } .dalkar p { break-inside: avoid-column; }
</style></head><body>
<section class="sida">${haus('Fyrirtæki 661 · 19/10/2026')}
<div class="samt"><div><b>${hS}</b><span>handslökkvitæki skv. hönnun 2025 (skráð: ${skrSl})</span></div><div><b>${hB}</b><span>brunaslöngur skv. hönnun (skráð: ${skrBs}, engin á teikningu)</span></div><div><b>3 / 7</b><span>tæki á Teikningu sem standa á hönnunarstað</span></div></div>
<h2>Búnaður samkvæmt gildandi aðaluppdráttum (samþ. 09/12/2025)</h2>
<table><thead><tr><th>Merki</th><th>Hæð</th><th>Staðsetning</th><th>Tegund</th><th>Á Teikningu í dag</th><th>Uppsett</th></tr></thead><tbody>${rad}</tbody></table>
<ul class="ath">${ath.map((a) => '<li>' + esc(a) + '</li>').join('')}</ul>
<div class="heimild">Heimildir: Skútuvogur 4, aðaluppdrættir — teikningasett 6 blöð, samþ. byggingarfulltrúa 9. desember 2025 (USK25050395): 10-02 Grunnmynd 1. hæð, 10-03 Grunnmynd 2. hæð, 10-00 byggingarlýsing (brunavarnir: Brunahönnun slf, mál 14-111). Staðsetningar leiðbeinandi; endanlegt samþykki brunavarna er hjá hönnuði og slökkviliði.</div>
</section>
<section class="sida">${haus('1. hæð — gildandi teikning 2025')}<div class="mynd"><img src="${img('merkt_h1.png')}"></div>${skyr}<div class="heimild">Blað 10-02 Grunnmynd 1. hæð, samþ. 09/12/2025. Vestan: lagerar (MHL 2), austan: verslun 01-01. „Mhl. 01 tilheyrir ekki þessum breytingum".</div></section>
<section class="sida">${haus('2. hæð — gildandi teikning 2025')}<div class="mynd"><img src="${img('merkt_h2.png')}"></div>${skyr}<div class="heimild">Blað 10-03 Grunnmynd 2. hæð, samþ. 09/12/2025.</div></section>
<section class="sida">${haus('Brunavarnir MHL 2 — orðrétt')}<div class="dalkar">${kaflar}</div><div class="heimild">Úr byggingarlýsingu á blaði 10-00 (Brunahönnun slf, mál 14-111, desember 2025; nánar í greinargerð 14-111-Skútuvogur 4-grg02).</div></section>
</body></html>`;
  fs.writeFileSync(path.join(H, 'skutuvogur4.html'), html);
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  const ut = path.join(H, 'Skutuvogur 4 - brunavarnir og slokkvitaeki.pdf');
  await p.pdf({ path: ut, preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: '<div style="font:7pt Segoe UI,Arial;color:#888;width:100%;padding:0 12mm;display:flex;justify-content:space-between"><span>Slökkvitæki ehf · Skútuvogur 4 · Álfaborg</span><span>bls. <span class="pageNumber"></span>/<span class="totalPages"></span></span></div>' });
  await b.close();
  // gögn fyrir bunadargreining-röðina
  fs.writeFileSync(path.join(H, 'gogn.json'), JSON.stringify({ ath, rodud: rodud.map((u) => ({ audkenni: u.audkenni, bunadur: u.t === 'BRSL' ? 'Slöngukefli' : 'Handslökkvitæki', tegund: u.tegund, stadur: u.stadur, mhl: '02', haed: u.haed, haed_id: u.haed_id, x: u.x, y: u.y, unitId: u.unitId || null, heimild: 'Aðaluppdr. 2025, blað ' + (u.pg === 3 ? '10-02' : '10-03') + ' („' + (u.t === 'L' ? 'L' : u.t) + '")' + (u.unitId ? ' · á Teikningu (' + u.fjarl_m + ' m frá)' : ' · ekki á Teikningu') })), hS, hB, skrSl, skrBs }, null, 1));
  console.log('ok', ut, fs.statSync(ut).size);
})().catch((e) => { console.error('VILLA', e.message); process.exit(1); });
