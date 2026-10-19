// Kvarnir ehf., Álfhella 9 (1871): Teikning með þremur hæðum + „Nýtt"-merki (tæki af teikningu, í bið) — ný röð,
// ekkert yfirskrifað (hætt ef röð er þegar til). Sama snið og Norðurhella 17 (1626) og 433 Nýtt-merki.
const fs = require('fs');
const cfg = fs.readFileSync('C:/Users/Slokkvitaeki/slokkvitaeki/js/config.js', 'utf8');
const U = cfg.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)/)[1], K = cfg.match(/SUPABASE_KEY\s*=\s*['"]([^'"]+)/)[1];
const h = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' };
const B = JSON.parse(fs.readFileSync(__dirname + '/bunadur.json', 'utf8'));
const HF = 'https://teikningar.hafnarfjordur.is/data/';
const mynd = (pdf) => '/.netlify/functions/teikn-mynd?url=' + encodeURIComponent(HF + pdf);
const P01 = mynd('B20200527_Alfhella_9_002.pdf');
const P02 = mynd('[INNSIGLAÐ] Álfhella 9, aðaluppdráttur mhl 02.pdf');
let n = 0;
const nytt = (t) => {
  const def = t.tegund === 'Brunaslanga' ? ['slanga', 'Brunaslanga'] : ['lettvatn', 'Léttvatn'];
  return { unitId: 'n:' + def[0] + ':' + (Date.now() + n++).toString(36) + Math.random().toString(36).slice(2, 6), x: t.x, y: t.y, nytt: true, tegund: def[1], stada: 'bid' };
};
const af = (blad, haed) => B.tki.filter((t) => t.blad === blad && t.haed === haed && t.tegund !== 'Brunaviðvörunarkerfi').map(nytt);
const haedir = [
  { id: 'hc1871x1h01', nafn: '1. hæð', image_url: P01, markers: af('mhl01', '1. hæð'), veggir: [], pdfVeggir: [], frum: B.frum01,
    skurdur: { x: 540, y: 2290, w: 2960, h: 1270 }, sjalf: false, thett: true, syn: { a: false, fest: true } },
  { id: 'hc1871x2h01', nafn: '2. hæð', image_url: P01, markers: af('mhl01', '2. hæð'), veggir: [], pdfVeggir: [], frum: B.frum01,
    skurdur: { x: 540, y: 330, w: 2960, h: 1280 }, sjalf: false, thett: true, syn: { a: false, fest: true } },
  { id: 'hc1871x1h02', nafn: 'Mhl. 02 — smiðja, verkstæði, þvottur', image_url: P02, markers: af('mhl02', 'Mhl. 02'), veggir: [], pdfVeggir: [], frum: B.frum02,
    skurdur: { x: 270, y: 820, w: 1300, h: 2440 }, sjalf: false, thett: true, syn: { a: true, fest: true } },
];
(async () => {
  const til = await (await fetch(U + '/rest/v1/teikning_bord?company_id=eq.1871&select=company_id', { headers: h })).json();
  if (til.length) throw new Error('röð er þegar til fyrir 1871 — ekkert skrifað');
  const r = await fetch(U + '/rest/v1/teikning_bord', { method: 'POST', headers: Object.assign({ Prefer: 'return=representation' }, h),
    body: JSON.stringify({ company_id: 1871, haedir, image_url: P01, markers: haedir[0].markers, updated_by: 'Claude', updated_at: new Date().toISOString() }) });
  const j = await r.json();
  if (!r.ok) throw new Error(r.status + ' ' + JSON.stringify(j).slice(0, 300));
  console.log('vistað', j[0].company_id, j[0].haedir.map((x) => x.nafn + ': ' + x.markers.length + ' merki').join(' · '));
})().catch((e) => { console.error('VILLA ' + e.message); process.exit(1); });
