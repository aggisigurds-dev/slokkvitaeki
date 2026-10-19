// Reykjanesbær (SVFNR 2000, map.is/reykjanesbaer, teikningar.rnb.is) í teikningaleitina — sama mynstur og Mosfellsbær (9b4eb923).
const fs = require('fs');
const ROT = 'C:/Users/Slokkvitaeki/slokkvitaeki/';
function R(f, a, b) {
  let s = fs.readFileSync(ROT + f, 'utf8'); const crlf = s.includes('\r\n'); if (crlf) s = s.replace(/\r\n/g, '\n');
  const n = s.split(a).length - 1; if (n !== 1) throw new Error(f + ': ' + n + '× ' + a.slice(0, 70));
  s = s.replace(a, b); if (crlf) s = s.replace(/\n/g, '\r\n'); fs.writeFileSync(ROT + f, s); console.log('ok', f);
}
R('netlify/functions/teikn-listi.js',
  "  1604: { slug: 'moso', nafn: 'Mosfellsbær', kort: 'Kortasjá Mosfellsbæjar', postnr: [270, 271], bein: true },\n};",
  "  1604: { slug: 'moso', nafn: 'Mosfellsbær', kort: 'Kortasjá Mosfellsbæjar', postnr: [270, 271], bein: true },\n" +
  "  // 19.10.2026 (Agnar: „Keilisbraut 745, 262 … tengja við kortakerfið í Keflavík líka\"): Reykjanesbær (SVFNR 2000,\n" +
  "  // map.is/reykjanesbaer). PDF-in á teikningar.rnb.is; húsateikningar á heitinr hússins (Keilisbraut 745: 7, lóðin: 0).\n" +
  "  2000: { slug: 'reykjanesbaer', nafn: 'Reykjanesbær', kort: 'Kortasjá Reykjanesbæjar', postnr: [230, 232, 233, 260, 262], bein: true },\n};");
R('netlify/functions/teikn-listi.js', "'luks.seltjarnarnes.is', 'luks.mos.is'];", "'luks.seltjarnarnes.is', 'luks.mos.is', 'teikningar.rnb.is'];");
R('netlify/functions/hus-upplysingar.js',
  "  { svf: 1604, nafn: 'Mosfellsbær', kort: 'Kortasjá Mosfellsbæjar', postnr: [270, 271], slug: 'moso', bein: true },\n];",
  "  { svf: 1604, nafn: 'Mosfellsbær', kort: 'Kortasjá Mosfellsbæjar', postnr: [270, 271], slug: 'moso', bein: true },\n" +
  "  // 19.10.2026: Reykjanesbær (SVFNR 2000; 230/232/233/260/262 — Keflavík, Hafnir, Njarðvík, Ásbrú). PDF á teikningar.rnb.is.\n" +
  "  { svf: 2000, nafn: 'Reykjanesbær', kort: 'Kortasjá Reykjanesbæjar', postnr: [230, 232, 233, 260, 262], slug: 'reykjanesbaer', bein: true },\n];");
R('netlify/functions/hus-upplysingar.js', "const UTGAFA = '2026-10-19';", "const UTGAFA = '2026-10-19b';");
R('netlify/functions/hus-upplysingar.js', " *   luks.seltjarnarnes.is og luks.mos.is (Mosfellsbær: nær allt .tif).", " *   luks.seltjarnarnes.is, luks.mos.is (Mosfellsbær: nær allt .tif) og teikningar.rnb.is (Reykjanesbær).");
for (const f of ['netlify/functions/teikn-pdf.js', 'netlify/functions/teikn-blad.js', 'netlify/functions/fasteign-opin.js'])
  R(f, "'luks.seltjarnarnes.is', 'luks.mos.is']);", "'luks.seltjarnarnes.is', 'luks.mos.is', 'teikningar.rnb.is']);");
R('js/patches/451-greining-fasteignar.js', "1400: 'Hafnarfjörður', 1604: 'Mosfellsbær' })[e.svf]", "1400: 'Hafnarfjörður', 1604: 'Mosfellsbær', 2000: 'Reykjanesbær' })[e.svf]");
R('js/patches/363-banner-upplysingar.js', "170 (Seltjarnarnes), 270/271 (Mosfellsbær, 19.10.2026) og Reykjavík", "170 (Seltjarnarnes), 270/271 (Mosfellsbær), 230/260/262 (Reykjanesbær, 19.10.2026) og Reykjavík");
R('js/data/greining-heimildir.json', "Seltjarnarnes, Mosfellsbær um map.is)", "Seltjarnarnes, Mosfellsbær, Reykjanesbær um map.is)");
R('js/data/greining-heimildir.json', "\"map.is queryTeiknigrunn (Kópavogur, Garðabær, Hafnarfjörður, Seltjarnarnes, Mosfellsbær)\"", "\"map.is queryTeiknigrunn (Kópavogur, Garðabær, Hafnarfjörður, Seltjarnarnes, Mosfellsbær, Reykjanesbær)\"");
R('js/data/greining-heimildir.json', "Mosfellsbær — luks.mos.is, nær allt .tif → niðurhal)", "Mosfellsbær — luks.mos.is, nær allt .tif → niðurhal; Reykjanesbær — teikningar.rnb.is, PDF)");
