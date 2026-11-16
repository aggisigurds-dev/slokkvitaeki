// _markmid-reikna.cjs — framvinda markmiða (16.11.2026, Markmið í Slökkvitæki-appinu). Hreint: engin net- eða
// gagnagrunnsköll, svo síðan og fallið sýna sömu tölu. Próf: node --test test/markmid.test.cjs
//
// Þrjár tegundir markmiða:
//   mælt     — `maeling` er lykill í SQL-fallinu markmid_maela; grunnlína (upphaf) mæld einu sinni, `nu` nýjasta mæling,
//              `mark` er markgildið. Framvinda = hve stór hluti leiðarinnar frá grunnlínu að marki er farinn.
//   handvirkt — sama, en `nu` er slegið inn (t.d. „gluggar prófaðir" af 27).
//   skref     — engin tala: framvinda = kláruð skref / öll skref.
// Lokið markmið er alltaf 100 %. Sé grunnlína ekki til (ómælt) er framvinda null — aldrei 0, því 0 væri ósatt.

const STODUR = ['opid', 'i_vinnu', 'lokid'];

function tala(x) {
  if (x === null || x === undefined || x === '') return null;
  const n = Number(typeof x === 'string' ? x.replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.') : x);
  return Number.isFinite(n) ? n : null;
}

function tegund(m) {
  if (m.maeling) return 'maelt';
  if (m.handvirkt) return 'handvirkt';
  return 'skref';
}

// 0–1, eða null ef ekki er hægt að segja (engin grunnlína og engin skref).
function framvinda(m) {
  if (m.stada === 'lokid') return 1;
  const t = tegund(m);
  if (t !== 'skref') {
    const upphaf = tala(m.upphaf), nu = tala(m.nu), mark = tala(m.mark);
    if (upphaf == null || nu == null || mark == null) return skrefFramvinda(m);
    if (upphaf === mark) return nu === mark ? 1 : 0;
    const p = m.stefna === 'upp' ? (nu - upphaf) / (mark - upphaf) : (upphaf - nu) / (upphaf - mark);
    return Math.max(0, Math.min(1, p));
  }
  return skrefFramvinda(m);
}

function skrefFramvinda(m) {
  const s = Array.isArray(m.skref) ? m.skref : [];
  if (!s.length) return m.stada === 'i_vinnu' ? 0 : null;
  return s.filter((x) => x && x.done).length / s.length;
}

// Hefur talan versnað frá grunnlínu? (t.d. fleiri villur en í upphafi)
function versnad(m) {
  const upphaf = tala(m.upphaf), nu = tala(m.nu);
  if (upphaf == null || nu == null) return false;
  return m.stefna === 'upp' ? nu < upphaf : nu > upphaf;
}

function flokkar(listi) {
  const rod = [];
  const eftir = new Map();
  for (const m of listi) {
    if (!eftir.has(m.flokkur)) { eftir.set(m.flokkur, []); rod.push(m.flokkur); }
    eftir.get(m.flokkur).push(m);
  }
  return rod.map((heiti) => {
    const mm = eftir.get(heiti);
    const f = mm.map(framvinda).filter((x) => x != null);
    return {
      heiti,
      fjoldi: mm.length,
      lokid: mm.filter((m) => m.stada === 'lokid').length,
      framvinda: f.length ? f.reduce((a, b) => a + b, 0) / mm.length : null,   // ómæld telja sem 0 í meðaltali flokks
      omaeld: mm.length - f.length,
    };
  });
}

const texti = (v, max) => (v == null ? '' : String(v).replace(/\u0000/g, '').trim().slice(0, max));

module.exports = { framvinda, skrefFramvinda, versnad, flokkar, tegund, tala, texti, STODUR };
