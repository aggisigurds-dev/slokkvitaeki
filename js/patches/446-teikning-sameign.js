/* === TEIKNING: SAMEIGN OG STIGAHÚS Í FJÖLBÝLI (446) =========================================================
 *
 * Agnar 08.10.2026: „mörg húsfélögin með íbúðir í fjölbýli. Þá eru slökkvitækin oftast bara með slökkvitæki og
 * reykskynjara í sameign sem er þá bara stigagangurinn upp og kjallari ef slíkur er. Hvort þú getur reynt að læra
 * betur á að greina sameignina og stigagangana."
 *
 * SAMEIGN = stigahús/stigagangar, anddyri, gangar, kjallarinn (geymslugangur, hjóla- og vagnageymsla, þvottahús,
 * þurrkherbergi, tæknirými/inntak, sorp). Íbúðir eru ekki sameign. Hér er greiningin sjálf — hrein föll án DOM nema
 * `rasti()` (mynd → grátóna) og teiknihjálpin. 383 kallar á þau (2D, 3D, Designer-3D) og 445 (vinnumyndin).
 *
 * LEIÐIRNAR (í þessari röð):
 *   1. TEXTI (vigur-PDF með textalagi, 383 raunUrSidu): herbergisheiti flokkuð — flokkur(texti).
 *   2. STIGAR ÚR RASTA (líka skannaðar teikningar): margar stuttar SAMSÍÐA línur jafnt dreifðar í rétthyrningi
 *      (þrep 0,17–0,36 m bil, ≥ 5 línur) — kambar(). Hornréttur kambur á sama stað = flísar, ekki stigi.
 *   3. HERBERGI ÚR RASTA: aðeins línur sem liggja lárétt/lóðrétt (skástrikun, parket, hurðabogar og texti falla),
 *      kambar þurrkaðir út, hurðagöt brúuð (≤ 1,05 m í línustefnu) → laus svæði = herbergi; brýrnar = hurðir milli
 *      herbergja. Lyftustokkur = lítið herbergi með krossi (báðar hornalínur blekaðar).
 *   4. STAÐFESTING MILLI HÆÐA: stigahúsið endurtekur sig á sama stað á hverri hæð. Hliðrunin sem parar flesta kamba
 *      tveggja ÓLÍKRA blaða (sama blað fyrir 2.–4. hæð telst ekki staðfesting) staðfestir stigann — og segir líka
 *      hvernig hæðirnar eiga að standast á (383 staflar 3+ hæðum eftir stigunum).
 *   5. SVÆÐI: stigahús = herbergið sem staðfestur stigi er í (+ þrepaskákir sem línurnar skildu frá); gangur =
 *      herbergi með hurð að stigahúsi sem er dreifigangur (≥ 3 hurðir) eða liggur að lyftu; anddyri = lítið herbergi
 *      með hurð út úr gangi; kjallari = öll hæðin. Útlína hvers svæðis = marghyrningur í dílum frummyndar.
 *
 * Úttak hæðar (greinaHaed): { utgafa, heil, svaedi: [{ teg, poly: [[x, y]…], flatarmal, x, y }], stigar: [{ x0, y0,
 *   x1, y1, ass, n, bil_m, lengd_m }], herbergi: [{ texti, nr?, x, y, sameign, flokkur }], lyftur, talning } —
 *   ÖLL hnit í dílum SKORNU myndarinnar (stig1); 383 bætir skurðinum við þar sem frummyndarhnit þarf.
 * Ekkert er vistað: niðurstaðan býr í minni (383 G.sameign), engin skrif í gagnagrunn.
 * ====================================================================================================== */
(() => {
  const W0 = typeof window !== 'undefined' ? window : globalThis;
  if (W0.TeiknSameign) return;

  const PXM = 40;                 // dílar á metra í greiningunni
  const UTGAFA = 1;

  /* ── 1. herbergisheiti → flokkur ── */
  const afbroddar = s => String(s || '').toLowerCase().replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/ö/g, 'o')
    .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ý/g, 'y');
  // { hópur: 'sameign' | 'ibud' | 'annad', teg } — teg = stigahus, gangur, anddyri, hjol, thvottur, thurrk, taekni, sorp,
  // lyfta, geymslugangur, sameign · ibud, stofa, svefn, eldhus, bad, herb, svalir · geymsla, '' (annað)
  function flokkur(texti) {
    const t = afbroddar(texti).replace(/[.,;:]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return { hopur: 'annad', teg: '' };
    const s = (re, teg) => re.test(t) ? { hopur: 'sameign', teg } : null;
    const r =
      s(/stigah|stigag|stigagangur|stigapallur|pallur ?- ?stig|(^| )stigi( |$)/, 'stigahus') ||
      s(/geymslugang/, 'geymslugangur') ||
      s(/hjola|vagna|hjolag|vagnag/, 'hjol') ||
      s(/thvottah|thvottaher|(^| )thvottur/, 'thvottur') ||
      s(/thurrk/, 'thurrk') ||
      s(/taeknir|taekniher|inntak|lagnar|lagnah|rafmagnst|toflu|tafla( |$)|hitakl|grindar/, 'taekni') ||
      s(/(^| )sorp|sorpg|sorpk|rusl/, 'sorp') ||
      s(/anddyri|forstofa sam|inngangur|aðkoma|adkoma/, 'anddyri') ||
      s(/(^| )gangur|(^| )gangar|gangur ?- ?lyfta|lyftugang/, 'gangur') ||
      s(/(^| )lyfta|lyftuh|lyftustok/, 'lyfta') ||
      s(/sameign/, 'sameign');
    if (r) return r;
    // „Íbúð", „Íb." og íbúðarrými — EKKI „Íbúðagangur" (fangað að ofan sem gangur)
    if (/(^| )ib(ud)?( |$|\d|-)|(^| )ibud|ibudar/.test(t)) return { hopur: 'ibud', teg: 'ibud' };
    if (/(^| )stofa|(^| )stofur|(^| )bordst|(^| )setust/.test(t)) return { hopur: 'ibud', teg: 'stofa' };
    if (/svefnh|(^| )hjon|(^| )herb( |$)|(^| )herbergi( |$)|barnah/.test(t)) return { hopur: 'ibud', teg: 'svefn' };
    if (/(^| )eldh|(^| )eldhus|(^| )eldunar/.test(t)) return { hopur: 'ibud', teg: 'eldhus' };
    if (/(^| )bad( |$)|badh|badher|(^| )wc( |$)|snyrting|(^| )thvo( |$)/.test(t)) return { hopur: 'ibud', teg: 'bad' };
    if (/svalir|(^| )sval( |$)|ser ?gardur|sergard/.test(t)) return { hopur: 'ibud', teg: 'svalir' };
    if (/(^| )forst( |$)|forstofa|(^| )hol( |$)|(^| )skali/.test(t)) return { hopur: 'ibud', teg: 'forstofa' };
    // „Geymsla" í kjallara er oft séreign á sameignargangi — gangurinn er sameign, geymslan ekki
    if (/geymsl/.test(t)) return { hopur: 'annad', teg: 'geymsla' };
    return { hopur: 'annad', teg: '' };
  }

  /* ── raster: mynd → grátóna í PXM dílum á metra ── */
  // src: <img>/<canvas> (skornu myndina), pxmSrc: dílar myndarinnar á metra. Skilar { g, W, H, s } — s = dílar
  // myndarinnar á reit greiningarinnar.
  // Minnkað með LÁGMARKI (dekksta díl hvers reits), ekki meðaltali: þunn lína (0,8 reitur) sem lendir á milli tveggja
  // reita varð ljósgrá (~150) í meðaltalinu og datt út eða ekki eftir því hvar hún lenti (mælt 08.10.2026: þrep 02-10
  // fundust í tveggja þrepa minnkun en ekki eins þreps). Lágmarkið heldur hverri línu jafndökkri óháð stöðu.
  function smaekka(g0, sw, sh, s) {
    const W = Math.max(8, Math.round(sw / s)), H = Math.max(8, Math.round(sh / s)), g = new Uint8Array(W * H).fill(255);
    const kx = sw / W, ky = sh / H;
    const xa = new Int32Array(W + 1); for (let x = 0; x <= W; x++) xa[x] = Math.min(sw, Math.round(x * kx));
    for (let y = 0; y < H; y++) {
      const ya = Math.round(y * ky), yb = Math.max(ya + 1, Math.min(sh, Math.round((y + 1) * ky)));
      for (let yy = ya; yy < yb; yy++) {
        const r = yy * sw;
        for (let x = 0; x < W; x++) {
          let m = g[y * W + x];
          for (let xx = xa[x], xe = Math.max(xa[x] + 1, xa[x + 1]); xx < xe; xx++) { const v = g0[r + xx]; if (v < m) m = v; }
          g[y * W + x] = m;
        }
      }
    }
    return { g, W, H, s: sw / W };
  }
  function rasti(src, pxmSrc) {
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    // í mesta lagi ~2,5× marklausnin lesin úr myndinni (stórar skannanir minnkaðar fyrst með drawImage)
    const s0 = Math.max(1, pxmSrc / (PXM * 2.5)), cw = Math.max(8, Math.round(sw / s0)), ch = Math.max(8, Math.round(sh / s0));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.fillRect(0, 0, cw, ch);
    x.imageSmoothingEnabled = s0 > 1; x.imageSmoothingQuality = 'high';
    x.drawImage(src, 0, 0, cw, ch);
    const d = x.getImageData(0, 0, cw, ch).data, g0 = new Uint8Array(cw * ch);
    for (let i = 0; i < cw * ch; i++) g0[i] = (d[i * 4] * 77 + d[i * 4 + 1] * 150 + d[i * 4 + 2] * 29) >> 8;
    c.width = 0; c.height = 0;
    const R = smaekka(g0, cw, ch, Math.max(1, (pxmSrc / s0) / PXM));
    R.s = R.s * s0;            // dílar upprunalegu myndarinnar á reit
    return R;
  }
  // Ferningsvíkkun (r reitir) á 0/1-grímu, aðskiljanleg: lárétt svo lóðrétt með rennandi talningu — O(W·H).
  function vikkaM(m, W, H, r) {
    if (r <= 0) return m.slice();
    const t = new Uint8Array(W * H), o = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      const b = y * W; let c = 0;
      for (let x = 0; x < Math.min(W, r); x++) c += m[b + x];
      for (let x = 0; x < W; x++) { if (x + r < W) c += m[b + x + r]; if (x - r - 1 >= 0) c -= m[b + x - r - 1]; t[b + x] = c > 0 ? 1 : 0; }
    }
    for (let x = 0; x < W; x++) {
      let c = 0;
      for (let y = 0; y < Math.min(H, r); y++) c += t[y * W + x];
      for (let y = 0; y < H; y++) { if (y + r < H) c += t[(y + r) * W + x]; if (y - r - 1 >= 0) c -= t[(y - r - 1) * W + x]; o[y * W + x] = c > 0 ? 1 : 0; }
    }
    return o;
  }
  function lokaM(m, W, H, r) {        // lokun: víkka svo þrengja (þrenging = víkkun andhverfunnar)
    const v = vikkaM(m, W, H, r);
    for (let i = 0; i < v.length; i++) v[i] = v[i] ? 0 : 1;
    const e = vikkaM(v, W, H, r);
    for (let i = 0; i < e.length; i++) e[i] = e[i] ? 0 : 1;
    return e;
  }

  /* ── 2. stigar: kambar samsíða þunnra lína ── */
  // Láréttir bútar: [y miðja, x0, x1, þykkt] — blekraðir ≥ minL (0,75 m: stigi er ≥ 0,8 m breiður, skápahurðir ~0,5) á einni línu, samliggjandi línur sem skarast mikið
  // sameinaðar. Þykkir bútar (> maxTh) eru veggir / fyllingar og falla.
  function butar(blek, W, H, minL, maxTh) {
    let opnir = [], ut = [];
    for (let y = 0; y < H; y++) {
      const nyir = [], r = y * W;
      let x = 0;
      while (x < W) {
        if (!blek[r + x]) { x++; continue; }
        const a = x; while (x < W && blek[r + x]) x++;
        const b = x;
        if (b - a < minL) continue;
        let k = -1;
        for (let i = 0; i < opnir.length; i++) {
          const v = opnir[i];
          if (v && v[1] === y - 1 && Math.min(b, v[3]) - Math.max(a, v[2]) > 0.7 * Math.min(b - a, v[3] - v[2])) { k = i; break; }
        }
        if (k >= 0) { const v = opnir[k]; opnir[k] = null; v[1] = y; v[2] = Math.min(v[2], a); v[3] = Math.max(v[3], b); nyir.push(v); }
        else nyir.push([y, y, a, b]);
      }
      for (const v of opnir) if (v) ut.push(v);
      opnir = nyir;
    }
    for (const v of opnir) ut.push(v);
    return ut.filter(v => v[1] - v[0] + 1 <= maxTh).map(v => [(v[0] + v[1]) / 2, v[2], v[3], v[1] - v[0] + 1]);
  }
  function kambarAs(bu, pxm, ass) {
    const bmin = 0.21 * pxm, bmax = 0.35 * pxm;     // þrep 0,22–0,34 m (reglugerð: framstig ≥ 0,25)
    bu.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const notad = new Uint8Array(bu.length), ut = [];
    for (let i = 0; i < bu.length; i++) {
      if (notad[i]) continue;
      const hop = [bu[i]]; notad[i] = 1; let cur = bu[i];
      for (let j = i + 1; j < bu.length; j++) {
        const q = bu[j], dy = q[0] - cur[0];
        if (dy > bmax) break;
        if (notad[j] || dy < bmin) continue;
        const sk = Math.min(cur[2], q[2]) - Math.max(cur[1], q[1]), Lm = Math.min(cur[2] - cur[1], q[2] - q[1]);
        if (sk >= 0.65 * Lm && Math.max(cur[2] - cur[1], q[2] - q[1]) <= 1.6 * Lm) { hop.push(q); notad[j] = 1; cur = q; }
      }
      if (hop.length < 5 || hop.length > 24) continue;
      const bil = []; for (let k = 1; k < hop.length; k++) bil.push(hop[k][0] - hop[k - 1][0]);
      const mb = bil.reduce((s, v) => s + v, 0) / bil.length, sd = Math.sqrt(bil.reduce((s, v) => s + (v - mb) * (v - mb), 0) / bil.length);
      if (sd > 0.22 * mb) continue;
      const med = a => { const s = a.slice().sort((p, q) => p - q); return s[s.length >> 1]; };
      const b0 = med(hop.map(h => h[1])), b1 = med(hop.map(h => h[2]));
      ut.push({ ass, a0: hop[0][0], a1: hop[hop.length - 1][0], b0, b1, n: hop.length, bil_m: mb / pxm, lengd_m: (b1 - b0) / pxm });
    }
    return ut;
  }
  function blekMaski(R, gildi) { const m = new Uint8Array(R.W * R.H); for (let i = 0; i < m.length; i++) m[i] = R.g[i] < gildi ? 1 : 0; return m; }
  // Þröskuldur bleks eftir myndinni: skannanir Skjalasafnsins eru gráar (bakgrunnur ~235, línur 60–160, Þverholt-
  // kjallari 157–183 á 213) en Hafnarfjarðar-PDF svarthvít (0 / 255). Blek = 2. hundraðshluti, bakgrunnur = 80.;
  // þröskuldurinn hlutfall q á milli. Svarthvítt: 0 + 0,5·255 ≈ 128 (kambar) og 153 (herbergi).
  function hist(R) {
    if (!R._hist) {
      const h = new Uint32Array(256), st = Math.max(1, Math.floor(R.g.length / 400000));
      for (let i = 0; i < R.g.length; i += st) h[R.g[i]]++;
      let n = 0; for (let v = 0; v < 256; v++) n += h[v];
      const pct = p => { let c = 0; for (let v = 0; v < 256; v++) { c += h[v]; if (c >= p * n) return v; } return 255; };
      // blek = dekksti 0,3 % (strjál teikning: undir 2 % bleks gaf 2. hundraðshlutinn hvítt og allt varð blek)
      const blek = pct(0.003), bak = pct(0.8), mid = pct(0.5);
      // svarthvítt (Hafnarfjarðar-PDF, 1 bita skönnun): miðgildið hvítt og blekið svart — föstu gildin 150 / 175 reyndust best
      R._hist = { blek, bak, svarthvitt: mid >= 250 && blek <= 10 };
    }
    return R._hist;
  }
  // Þröskuldur bleks eftir myndinni: skannanir Skjalasafnsins eru gráar (bakgrunnur ~235, þrep 140–175 á Laugavegi 18,
  // veggir ~60) en Hafnarfjarðar-PDF svarthvít. Grátt: hlutfall q milli bleks (2. hundraðshluta) og bakgrunns (80.).
  function throskuldur(R, q, sv) {
    const { blek, bak, svarthvitt } = hist(R);
    if (svarthvitt) return sv;
    if (bak - blek < 25) return blek + 1;          // auð mynd / ein litur — ekkert að greina
    return Math.round(blek + q * (bak - blek));
  }
  function snua(m, W, H) { const t = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) t[x * H + y] = m[y * W + x]; return t; }
  // Skilar { stigar, rist } í reitum greiningarinnar: stigar = kambar sem eru ekki í rist (flísar)
  function kambar(R, o) {
    o = o || {};
    const W = R.W, H = R.H, pxm = PXM;
    // Grátt: þrír þröskuldar og sameinað — þrepin eru oft ljósari en veggirnir (Laugavegur 18: 140–175 á ~232) og
    // kamburinn er svo reglulegt mynstur að hærri þröskuldur gefur ekki falska kamba.
    const gildin = o.gildi ? [o.gildi] : hist(R).svarthvitt ? [150] : [0.6, 0.75, 0.85].map(q => throskuldur(R, q, 150));
    const minL = Math.round(0.75 * pxm), maxTh = Math.max(2, Math.round(0.09 * pxm)), maxL = 3.2 * pxm;
    let ut = [];
    gildin.forEach(gildi => {
      const blek = blekMaski(R, gildi), nyir = [];
      kambarAs(butar(blek, W, H, minL, maxTh).filter(b => b[2] - b[1] <= maxL), pxm, 'x')
        .forEach(k => nyir.push(Object.assign(k, { x0: k.b0, x1: k.b1, y0: k.a0, y1: k.a1 })));
      kambarAs(butar(snua(blek, W, H), H, W, minL, maxTh).filter(b => b[2] - b[1] <= maxL), pxm, 'z')
        .forEach(k => nyir.push(Object.assign(k, { x0: k.a0, x1: k.a1, y0: k.b0, y1: k.b1 })));
      // sami kambur á fleiri en einum þröskuldi: sá með fleiri þrepum stendur
      nyir.forEach(k => {
        const i = ut.findIndex(q => q.ass === k.ass && Math.min(q.x1, k.x1) - Math.max(q.x0, k.x0) > 0 && Math.min(q.y1, k.y1) - Math.max(q.y0, k.y0) > 0);
        if (i < 0) ut.push(k); else if (k.n > ut[i].n) ut[i] = k;
      });
    });
    const fl = k => Math.max(1e-6, (k.x1 - k.x0) * (k.y1 - k.y0)), rist = new Set();
    for (let i = 0; i < ut.length; i++) for (let j = 0; j < ut.length; j++) {
      const a = ut[i], b = ut[j]; if (a.ass === b.ass) continue;
      const sx = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), sy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (sx > 0 && sy > 0 && sx * sy > 0.4 * Math.min(fl(a), fl(b))) { rist.add(i); rist.add(j); }
    }
    const hreint = k => ({ ass: k.ass, x0: k.x0, y0: k.y0, x1: k.x1, y1: k.y1, n: k.n, bil_m: +k.bil_m.toFixed(3), lengd_m: +k.lengd_m.toFixed(2) });
    return { stigar: ut.filter((k, i) => !rist.has(i)).map(hreint), rist: ut.filter((k, i) => rist.has(i)).map(hreint) };
  }

  /* ── 3. herbergi úr rasta ── */
  function herbergi(R, kb, o) {
    o = o || {};
    const W = R.W, H = R.H, N = W * H, pxm = PXM, gildi = o.gildi || throskuldur(R, 0.8, 175);
    const blek = blekMaski(R, gildi);
    // a) aðeins lárétt / lóðrétt blek (keyrslur ≥ 0,3 m): skástrikun, parket, bogar og texti falla
    const lmin = Math.round(0.3 * pxm), hM = new Uint8Array(N), vM = new Uint8Array(N);
    for (let y = 0; y < H; y++) { let x = 0; const r = y * W; while (x < W) { if (!blek[r + x]) { x++; continue; } const a = x; while (x < W && blek[r + x]) x++; if (x - a >= lmin) hM.fill(1, r + a, r + x); } }
    for (let x = 0; x < W; x++) { let y = 0; while (y < H) { if (!blek[y * W + x]) { y++; continue; } const a = y; while (y < H && blek[y * W + x]) y++; if (y - a >= lmin) for (let q = a; q < y; q++) vM[q * W + x] = 1; } }
    // b) kambar (þrep og flísar) þurrkaðir út — kassinn styttur um 0,1 m í línustefnu svo veggirnir við endana standi
    const strok = (k, ass) => {
      const st = Math.round(0.1 * pxm), sp = Math.round(0.06 * pxm);
      let x0 = Math.floor(k.x0), x1 = Math.ceil(k.x1), y0 = Math.floor(k.y0), y1 = Math.ceil(k.y1);
      if (ass === 'x') { x0 += st; x1 -= st; y0 -= sp; y1 += sp; } else { y0 += st; y1 -= st; x0 -= sp; x1 += sp; }
      x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W - 1, x1); y1 = Math.min(H - 1, y1);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { hM[y * W + x] = 0; vM[y * W + x] = 0; }
    };
    (kb.stigar || []).concat(kb.rist || []).forEach(k => strok(k, k.ass));
    // b2) aðeins VEGGIR standa: tvær samsíða línur 0,05–0,22 m í sundur (veggflötur báðum megin) eða þykkt blek
    //     (≥ 3 reitir). Stakar línur — handrið, þrepabrúnir, húsgögn, málsetningar — skipta ekki herbergi (2.–4. hæð
    //     Berjavalla: stigahúsið brotnaði í tugi bita á stökum línum). Lyftukassi, baðkar o.þ.h. eru tvöfaldir og standa.
    const veggPor = (M, lar) => {
      const ut = new Uint8Array(N), L1 = lar ? W : H, L2 = lar ? H : W, idx = (f, q) => lar ? q * W + f : f * W + q;
      const dmin = 2, dmax = Math.round(0.22 * pxm);
      for (let f = 0; f < L1; f++) {
        let fyrri = null, q = 0;
        while (q < L2) {
          if (!M[idx(f, q)]) { q++; continue; }
          const a = q; while (q < L2 && M[idx(f, q)]) q++;
          const b = q - 1;                                 // strik [a, b] þvert á línuna
          if (b - a + 1 >= 3) for (let t = a; t <= b; t++) ut[idx(f, t)] = 1;
          if (fyrri && a - fyrri[1] - 1 >= dmin - 1 && a - fyrri[1] - 1 <= dmax) for (let t = fyrri[0]; t <= b; t++) ut[idx(f, t)] = 1;
          fyrri = [a, b];
        }
      }
      return ut;
    };
    {
      const wH = veggPor(hM, true), wV = veggPor(vM, false);
      // stuttir veggbútar (< 0,3 m í línustefnu) eftir pörun falla — tvær samsíða línur í texta eða húsgögnum
      const hreinsa = (wm, lar) => {
        const L1 = lar ? H : W, L2 = lar ? W : H, idx = (f, q) => lar ? f * W + q : q * W + f;
        for (let f = 0; f < L1; f++) { let q = 0; while (q < L2) { if (!wm[idx(f, q)]) { q++; continue; } const a = q; while (q < L2 && wm[idx(f, q)]) q++; if (q - a < lmin) for (let t = a; t < q; t++) wm[idx(f, t)] = 0; } }
      };
      hreinsa(wH, true); hreinsa(wV, false);
      hM.set(wH); vM.set(wV);
    }
    // b3) GRUNNFLÖTUR HÚSSINS: veggirnir lokaðir um 1,5 m (op í útvegg, glerveggir) og holur fylltar — kjallarinn allur
    //     er sameign og stigi utan grunnflatar (tröppur niður í kjallara, útistigi) er ekki stigahús
    const hus = (() => {
      const v = new Uint8Array(N); for (let i = 0; i < N; i++) v[i] = hM[i] | vM[i];
      const L = lokaM(v, W, H, Math.round(1.5 * pxm));
      const uti = new Uint8Array(N), st = new Int32Array(N); let top = 0;
      const yta = p => { if (!uti[p] && !L[p]) { uti[p] = 1; st[top++] = p; } };
      for (let x = 0; x < W; x++) { yta(x); yta((H - 1) * W + x); }
      for (let y = 0; y < H; y++) { yta(y * W); yta(y * W + W - 1); }
      while (top) { const p = st[--top], px = p % W; if (px > 0) yta(p - 1); if (px < W - 1) yta(p + 1); if (p >= W) yta(p - W); if (p < N - W) yta(p + W); }
      // stærsta samfellan
      const lab = new Int32Array(N); let n = 0, best = 0, bestN = 0;
      for (let s0 = 0; s0 < N; s0++) {
        if (uti[s0] || lab[s0]) continue;
        n++; let c = 0; top = 0; st[top++] = s0; lab[s0] = n;
        while (top) { const p = st[--top], px = p % W; c++;
          const q4 = [px > 0 ? p - 1 : -1, px < W - 1 ? p + 1 : -1, p >= W ? p - W : -1, p < N - W ? p + W : -1];
          for (const q of q4) if (q >= 0 && !uti[q] && !lab[q]) { lab[q] = n; st[top++] = q; } }
        if (c > bestN) { bestN = c; best = n; }
      }
      const m = new Uint8Array(N); for (let i = 0; i < N; i++) m[i] = lab[i] === best ? 1 : 0;
      return m;
    })();
    // c) hurðagöt brúuð í línustefnu (≤ 1,05 m): frá enda hverrar línu (≥ 0,25 m) að næsta bleki í sömu stefnu — líka
    //    að hornréttum vegg (hurð við horn: stubburinn handan opsins var of stuttur til að teljast lína, 2.–4. hæð
    //    Berjavalla 08.10.2026). Brýrnar (≥ 0,55 m) eru hurðirnar milli herbergja.
    const brL = Math.round(1.05 * pxm), brMin = Math.round(0.55 * pxm), brVidd = Math.round(0.25 * pxm);
    const hindrun = new Uint8Array(N), brM = new Uint8Array(N), bryr = [], brLyk = new Set();
    for (let i = 0; i < N; i++) hindrun[i] = hM[i] | vM[i];
    const bru = (lar, fasti, a, b) => {      // fyllir [a, b) í línu fasti
      if (b - a < 2) return;
      for (let q = a; q < b; q++) { const i = lar ? fasti * W + q : q * W + fasti; hindrun[i] = 1; brM[i] = 1; }
      const k = (lar ? 'h' : 'v') + fasti + ':' + a + ':' + b;
      if (b - a >= brMin && !brLyk.has(k)) { brLyk.add(k); bryr.push(lar ? [a, fasti, b, fasti] : [fasti, a, fasti, b]); }
    };
    const axis = (lar, fasti, q) => { const i = lar ? fasti * W + q : q * W + fasti; return hM[i] | vM[i]; };
    for (const lar of [true, false]) {
      const M = lar ? hM : vM, L1 = lar ? H : W, L2 = lar ? W : H;
      for (let f = 0; f < L1; f++) {
        let q = 0;
        while (q < L2) {
          const i0 = lar ? f * W + q : q * W + f;
          if (!M[i0]) { q++; continue; }
          const a = q; while (q < L2 && M[lar ? f * W + q : q * W + f]) q++;
          const b = q;
          if (b - a < brVidd) continue;
          // áfram frá enda
          for (let t = b; t < Math.min(L2, b + brL + 1); t++) if (axis(lar, f, t)) { bru(lar, f, b, t); break; }
          // aftur frá upphafi
          for (let t = a - 1; t >= Math.max(0, a - brL - 1); t--) if (axis(lar, f, t)) { bru(lar, f, t + 1, a); break; }
        }
      }
    }
    // d) víkkað um einn reit (lokar örsmáum götum) → laus svæði = herbergi (4-tengd)
    const lok = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      lok[i] = hindrun[i] || (x > 0 && hindrun[i - 1]) || (x < W - 1 && hindrun[i + 1]) || (y > 0 && hindrun[i - W]) || (y < H - 1 && hindrun[i + W]) ? 1 : 0;
    }
    const lab = new Int32Array(N), st = new Int32Array(N);
    const flat = [0], kassi = [null], jadar = [false], sumx = [0], sumy = [0];
    let n = 0;
    for (let s0 = 0; s0 < N; s0++) {
      if (lok[s0] || lab[s0]) continue;
      n++; let top = 0; st[top++] = s0; lab[s0] = n;
      let c = 0, jd = false, x0 = W, y0 = H, x1 = 0, y1 = 0, sx = 0, sy = 0;
      while (top) {
        const p = st[--top], px = p % W, py = (p - px) / W;
        c++; sx += px; sy += py;
        if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
        if (px === 0 || py === 0 || px === W - 1 || py === H - 1) jd = true;
        if (px > 0 && !lok[p - 1] && !lab[p - 1]) { lab[p - 1] = n; st[top++] = p - 1; }
        if (px < W - 1 && !lok[p + 1] && !lab[p + 1]) { lab[p + 1] = n; st[top++] = p + 1; }
        if (py > 0 && !lok[p - W] && !lab[p - W]) { lab[p - W] = n; st[top++] = p - W; }
        if (py < H - 1 && !lok[p + W] && !lab[p + W]) { lab[p + W] = n; st[top++] = p + W; }
      }
      flat.push(c / (pxm * pxm)); kassi.push([x0, y0, x1, y1]); jadar.push(jd); sumx.push(sx / c); sumy.push(sy / c);
    }
    // d2) innritaður radíus hvers herbergis (borgarfjarlægð að næsta lokaða reit, tvær umferðir)
    const fj = new Int32Array(N), STORT = 1 << 20;
    for (let i = 0; i < N; i++) fj[i] = lab[i] ? STORT : 0;
    for (let y = 0; y < H; y++) {
      const r = y * W;
      for (let x = 0; x < W; x++) {
        const i = r + x; if (fj[i] === 0) continue;
        let v = x > 0 ? fj[i - 1] + 1 : 1; const u = y > 0 ? fj[i - W] + 1 : 1;
        if (u < v) v = u; if (v < fj[i]) fj[i] = v;
      }
    }
    for (let y = H - 1; y >= 0; y--) {
      const r = y * W;
      for (let x = W - 1; x >= 0; x--) {
        const i = r + x; if (fj[i] === 0) continue;
        let v = x < W - 1 ? fj[i + 1] + 1 : 1; const u = y < H - 1 ? fj[i + W] + 1 : 1;
        if (u < v) v = u; if (v < fj[i]) fj[i] = v;
      }
    }
    const radius = new Float32Array(n + 1);
    for (let i = 0; i < N; i++) { const l = lab[i]; if (l && fj[i] > radius[l]) radius[l] = fj[i]; }
    // e) hurðir milli herbergja: hvoru megin við brú (0,3–0,7 m), fyrsta herbergi sem er ekki vasi (< 0,4 m²)
    const naestaHerb = (x, y, dx, dy) => {
      for (let d = Math.round(0.12 * pxm); d <= Math.round(1.2 * pxm); d++) {
        const px = Math.round(x + dx * d), py = Math.round(y + dy * d);
        if (px < 0 || py < 0 || px >= W || py >= H) return 0;
        const l = lab[py * W + px];
        if (l && flat[l] >= 0.3) return l;
      }
      return 0;
    };
    const hurdir = new Map();
    bryr.forEach(([ax, ay, bx, by]) => {
      const mx = (ax + bx) / 2, my = (ay + by) / 2, lar = ay === by;
      const a = lar ? naestaHerb(mx, my, 0, -1) : naestaHerb(mx, my, -1, 0), b = lar ? naestaHerb(mx, my, 0, 1) : naestaHerb(mx, my, 1, 0);
      if (!a || !b || a === b) return;
      const k = a < b ? a + ',' + b : b + ',' + a;
      if (!hurdir.has(k)) hurdir.set(k, { a: Math.min(a, b), b: Math.max(a, b), x: mx, y: my });
    });
    // f) lyftustokkar: lítið herbergi (1,0–9 m²) með blek eftir BÁÐUM hornalínum kassans (krossinn) — en EKKI eftir
    //    línum samsíða hornalínunum (skástrikaður skápur / geymsla er líka blekuð á hornalínunni)
    const lyftur = [];
    for (let l = 1; l <= n; l++) {
      if (jadar[l] || flat[l] < 1.0 || flat[l] > 9) continue;
      const [x0, y0, x1, y1] = kassi[l], b = x1 - x0, h = y1 - y0;
      if (b < 0.8 * pxm || h < 0.8 * pxm || Math.max(b, h) / Math.min(b, h) > 2.3) continue;
      if (flat[l] * pxm * pxm < 0.3 * b * h) continue;
      const hornalina = (ax, ay, bx2, by2, ox, oy) => {
        let hit = 0, alls = 0;
        for (let t = 0.15; t <= 0.85; t += 0.02) {
          const px = Math.round(ax + (bx2 - ax) * t + (ox || 0)), py = Math.round(ay + (by2 - ay) * t + (oy || 0));
          alls++;
          let f = false;
          for (let dy = -1; dy <= 1 && !f; dy++) for (let dx = -1; dx <= 1 && !f; dx++) { const q = (py + dy) * W + px + dx; if (q >= 0 && q < N && blek[q]) f = true; }
          if (f) hit++;
        }
        return hit / alls;
      };
      // krossinn er oft dreginn yfir lyftukörfuna, ögn innan við stokkinn: hornalínur frá kassanum þrengdum um 0–15 %
      let best = null;
      for (const f of [0, 0.05, 0.1, 0.15]) {
        const ax = x0 + b * f, ay = y0 + h * f, bx = x1 - b * f, by = y1 - h * f;
        const d1 = hornalina(ax, ay, bx, by), d2 = hornalina(bx, ay, ax, by);
        if (d1 >= 0.6 && d2 >= 0.6 && (!best || d1 + d2 > best.d)) best = { d: d1 + d2, ax, ay, bx, by };
      }
      if (!best) continue;
      // samsíða línur 20 % til hliðar: krossinn er auður þar, skástrikun ekki
      const bb = best.bx - best.ax, hh2 = best.by - best.ay;
      const o = 0.2 * Math.min(bb, hh2), L = Math.hypot(bb, hh2) || 1, nx1 = -hh2 / L, ny1 = bb / L, nx2 = hh2 / L, ny2 = bb / L;
      const hlid = Math.max(hornalina(best.ax, best.ay, best.bx, best.by, nx1 * o, ny1 * o), hornalina(best.ax, best.ay, best.bx, best.by, -nx1 * o, -ny1 * o),
        hornalina(best.bx, best.ay, best.ax, best.by, nx2 * o, ny2 * o), hornalina(best.bx, best.ay, best.ax, best.by, -nx2 * o, -ny2 * o));
      if (hlid <= 0.4) lyftur.push(l);
    }
    return { W, H, lab, n, flat, kassi, jadar, midja: sumx.map((v, i) => [v, sumy[i]]), hurdir: [...hurdir.values()], lyftur, bryr: bryr.length, brM, hus, radius };
  }

  /* ── útlína svæðis (marghyrningur) ── */
  // Gríma → lokuð (r reitir) → ytri jaðar rakinn (Moore) → einfaldaður (Douglas-Peucker, eps reitir). Reitahnit.
  function utlina(maski, W0g, H0g, r, eps) {
    r = r == null ? 3 : r; eps = eps == null ? 2 : eps;
    // aðeins kassinn utan um grímuna (+ spássía) — lokun á allri hæðinni fyrir hvert svæði var of dýr
    let bx0 = W0g, by0 = H0g, bx1 = -1, by1 = -1;
    for (let y = 0; y < H0g; y++) for (let x = 0; x < W0g; x++) if (maski[y * W0g + x]) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
    if (bx1 < 0) return [];
    const sp = r + 2, ox = bx0 - sp, oy = by0 - sp, W = bx1 - bx0 + 1 + 2 * sp, H = by1 - by0 + 1 + 2 * sp;
    let m = new Uint8Array(W * H);
    for (let y = by0; y <= by1; y++) for (let x = bx0; x <= bx1; x++) if (maski[y * W0g + x]) m[(y - oy) * W + (x - ox)] = 1;
    if (r > 0) m = lokaM(m, W, H, r);
    // stærsta samfellan ein (8-tengd)
    {
      const lab = new Int32Array(W * H), st = new Int32Array(W * H); let n = 0, best = 0, bestN = 0;
      for (let s0 = 0; s0 < W * H; s0++) {
        if (!m[s0] || lab[s0]) continue;
        n++; let top = 0, c = 0; st[top++] = s0; lab[s0] = n;
        while (top) { const p = st[--top], px = p % W, py = (p - px) / W; c++;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= W || qy >= H) continue; const q = qy * W + qx; if (m[q] && !lab[q]) { lab[q] = n; st[top++] = q; } } }
        if (c > bestN) { bestN = c; best = n; }
      }
      for (let i = 0; i < W * H; i++) m[i] = lab[i] === best ? 1 : 0;
    }
    // fyrsti reitur (efst til vinstri)
    let s0 = -1;
    for (let i = 0; i < W * H; i++) if (m[i]) { s0 = i; break; }
    if (s0 < 0) return [];
    const inn = (x, y) => x >= 0 && y >= 0 && x < W && y < H && !!m[y * W + x];
    // Moore-rakning á reitahornum: gengið eftir jaðri reitanna
    const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1];
    let x = s0 % W, y = (s0 - x) / W, dir = 7;
    const pkt = [[x, y]], sx = x, sy = y;
    for (let it = 0; it < 4 * W * H; it++) {
      let fann = false;
      for (let k = 0; k < 8; k++) {
        const d = (dir + 6 + k) % 8, nx = x + DX[d], ny = y + DY[d];
        if (inn(nx, ny)) { x = nx; y = ny; dir = d; fann = true; break; }
      }
      if (!fann || (x === sx && y === sy)) break;
      pkt.push([x, y]);
    }
    // Douglas-Peucker
    const dp = (pts, e) => {
      if (pts.length < 3) return pts;
      const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
      let mx = -1, mi = 0;
      const L = Math.hypot(bx - ax, by - ay) || 1e-9;
      for (let i = 1; i < pts.length - 1; i++) {
        const d = Math.abs((bx - ax) * (ay - pts[i][1]) - (ax - pts[i][0]) * (by - ay)) / L;
        if (d > mx) { mx = d; mi = i; }
      }
      if (mx <= e) return [pts[0], pts[pts.length - 1]];
      return dp(pts.slice(0, mi + 1), e).slice(0, -1).concat(dp(pts.slice(mi), e));
    };
    // lokaður ferill: skipta í tvennt við fjarlægasta punktinn
    let fj = 0, fi = 0;
    pkt.forEach((p, i) => { const d = Math.hypot(p[0] - pkt[0][0], p[1] - pkt[0][1]); if (d > fj) { fj = d; fi = i; } });
    const a = dp(pkt.slice(0, fi + 1), eps), b = dp(pkt.slice(fi).concat([pkt[0]]), eps);
    return a.slice(0, -1).concat(b.slice(0, -1)).map(p => [p[0] + 0.5 + ox, p[1] + 0.5 + oy]);
  }

  /* ── 4. staðfesting milli hæða ── */
  // A, B: [{ ass, x, y (metrar) }]. Hliðrun t (≤ hamark m) sem parar flesta kamba sömu stefnu innan tol.
  function hlidrun(A, B, hamark, tol) {
    // Hliðrun ≤ hamark (9 m) dugar með einu pari; lengra (sama hús teiknað annars staðar á öðru blaði — Asparfell:
    // stigahús 2–12 á mörgum blöðum) þarf tvö pör eða fleiri, annars getur hvaða kambur sem er parast við hvern sem er.
    hamark = hamark || 9; tol = tol || 1.6;
    let best = { n: 0, t: [0, 0] };
    const para = t => A.reduce((s, a) => s + (B.some(b => a.ass === b.ass && Math.hypot(a.x + t[0] - b.x, a.y + t[1] - b.y) < tol) ? 1 : 0), 0);
    A.forEach(a => B.forEach(b => {
      if (a.ass !== b.ass) return;
      const t = [b.x - a.x, b.y - a.y], L = Math.hypot(t[0], t[1]);
      if (L > 60) return;
      const s = para(t);
      if (L > hamark && s < 2) return;
      if (s > best.n || (s === best.n && s > 0 && L < Math.hypot(best.t[0], best.t[1]))) best = { n: s, t };
    }));
    // fínstilla: meðaltal paraðra mismuna
    if (best.n) {
      let sx = 0, sy = 0, c = 0;
      A.forEach(a => { let bb = null, bd = tol; B.forEach(b => { if (a.ass !== b.ass) return; const d = Math.hypot(a.x + best.t[0] - b.x, a.y + best.t[1] - b.y); if (d < bd) { bd = d; bb = b; } }); if (bb) { sx += bb.x - a.x; sy += bb.y - a.y; c++; } });
      if (c) best.t = [sx / c, sy / c];
    }
    return best;
  }

  /* ── 5. ein hæð ── */
  // inn: { R: rasti (g, W, H, s), nafn, textar: [{ texti, nr?, x, y }] (dílar skornu myndarinnar), stadfest?: [bool per
  // kamb] (úr samraemaHus), kb?: kambar (endurnýttir) }. Skilar niðurstöðu í dílum skornu myndarinnar.
  function greinaHaed(inn) {
    const R = inn.R, s = R.s || 1, pxm = PXM, W = R.W, H = R.H;
    const kb = inn.kb || kambar(R);
    const hb = herbergi(R, kb);
    const kjallari = /kjall/i.test(afbroddar(inn.nafn || ''));
    const nafnLab = (x, y) => {      // reitur herbergis við (x, y) — næsta lausa herbergi innan 0,6 m
      const cx = Math.round(x / s), cy = Math.round(y / s), r = Math.round(0.6 * pxm);
      let b = 0, bd = Infinity;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        const px = cx + dx, py = cy + dy; if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const l = hb.lab[py * W + px]; if (!l || hb.jadar[l] || hb.flat[l] < 0.5) continue;
        const d = dx * dx + dy * dy; if (d < bd) { bd = d; b = l; }
      }
      return b;
    };
    // stigar: herbergi kambsins (meirihluti lausra reita innan kassans)
    const stigar = kb.stigar.map((k, i) => {
      const tal = new Map();
      for (let y = Math.max(0, Math.floor(k.y0)); y <= Math.min(H - 1, Math.ceil(k.y1)); y++) for (let x = Math.max(0, Math.floor(k.x0)); x <= Math.min(W - 1, Math.ceil(k.x1)); x++) {
        const l = hb.lab[y * W + x]; if (l) tal.set(l, (tal.get(l) || 0) + 1);
      }
      let l = 0, bt = 0; tal.forEach((c, q) => { if (c > bt) { bt = c; l = q; } });
      const cx = Math.round((k.x0 + k.x1) / 2), cy = Math.round((k.y0 + k.y1) / 2);
      const iHusi = cx >= 0 && cy >= 0 && cx < W && cy < H && !!hb.hus[cy * W + cx];
      const uti = !l || hb.jadar[l] || hb.flat[l] > 150 || !iHusi;     // > 150 m²: lóð/garður innan girðingar
      return Object.assign({}, k, { herb: l, uti, stadfest: inn.stadfest ? !!inn.stadfest[i] : true });
    });
    const tegL = new Map();           // herbergi → tegund sameignar
    const merkja = (l, teg) => { if (l && !hb.jadar[l] && !tegL.has(l)) tegL.set(l, teg); };
    // stigahús: staðfestir stigar inni í húsinu; herbergi > 70 m² er leki — þá kassinn sjálfur
    const kassar = [];
    stigar.forEach(k => {
      if (k.uti || !k.stadfest) return;
      if (hb.flat[k.herb] > 70) { kassar.push(k); return; }
      merkja(k.herb, 'stigahus');
    });
    // nöfn úr textalagi
    const herb = (inn.textar || []).map(t => {
      const f = flokkur(t.texti), l = nafnLab(t.x, t.y);
      if (f.hopur === 'sameign' && l && hb.flat[l] <= 400) merkja(l, f.teg === 'lyfta' ? 'lyfta' : f.teg);
      return Object.assign({ texti: t.texti }, t.nr ? { nr: t.nr } : {}, { x: t.x, y: t.y, sameign: f.hopur === 'sameign', flokkur: f.teg, hopur: f.hopur, herb: l });
    });
    const nagr = l => hb.hurdir.filter(d => d.a === l || d.b === l).map(d => d.a === l ? d.b : d.a).filter(q => !hb.jadar[q] && hb.flat[q] >= 0.6);
    const lyftuSet = new Set(hb.lyftur);
    // þrepaskákir: smá herbergi (< 0,8 m²) sem liggja þétt að stigahúsi (gegnum þunna línu) bætast við
    const stigaH = [...tegL.entries()].filter(e => e[1] === 'stigahus').map(e => e[0]);
    if (stigaH.length) {
      const inStiga = new Uint8Array(hb.n + 1); stigaH.forEach(l => { inStiga[l] = 1; });
      // leitað aðeins í kringum stigahúsin (kassi + 3 m) — ekki á allri hæðinni í hverri umferð
      let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
      stigaH.forEach(l => { const k = hb.kassi[l]; bx0 = Math.min(bx0, k[0]); by0 = Math.min(by0, k[1]); bx1 = Math.max(bx1, k[2]); by1 = Math.max(by1, k[3]); });
      const sp3 = 3 * pxm, YA = Math.max(2, by0 - sp3), YB = Math.min(H - 2, by1 + sp3), XA = Math.max(2, bx0 - sp3), XB = Math.min(W - 2, bx1 + sp3);
      for (let umf = 0; umf < 40; umf++) {
        let baett = 0;
        for (let y = YA; y < YB; y++) for (let x = XA; x < XB; x++) {
          const l = hb.lab[y * W + x]; if (!l || inStiga[l] || hb.jadar[l] || hb.flat[l] >= 0.8) continue;
          let naer = 0;
          for (let d = 1; d <= 3 && !naer; d++) {
            const q = [hb.lab[y * W + x - d], hb.lab[y * W + x + d], hb.lab[(y - d) * W + x], hb.lab[(y + d) * W + x]];
            for (const v of q) if (v && inStiga[v] && v !== l && hb.flat[v] >= 0.8) { naer = v; break; }
          }
          if (naer) { inStiga[l] = 1; tegL.set(l, 'stigahus'); baett++; }
        }
        // skák sem tengist annarri skák sem er komin inn
        if (!baett) {
          let b2 = 0;
          for (let y = YA; y < YB; y++) for (let x = XA; x < XB; x++) {
            const l = hb.lab[y * W + x]; if (!l || inStiga[l] || hb.jadar[l] || hb.flat[l] >= 0.8) continue;
            for (let d = 1; d <= 3; d++) {
              const v = hb.lab[y * W + x - d] || hb.lab[y * W + x + d] || hb.lab[(y - d) * W + x] || hb.lab[(y + d) * W + x];
              if (v && inStiga[v] && v !== l) { inStiga[l] = 1; tegL.set(l, 'stigahus'); b2++; break; }
            }
          }
          if (!b2) break;
        }
      }
      // gangur: herbergi með hurð að stigahúsi sem dreifir (≥ 3 hurðir) eða liggur að lyftu; lyfta við gang fylgir
      const stigahusin = [...tegL.entries()].filter(e => e[1] === 'stigahus' && hb.flat[e[0]] >= 0.8).map(e => e[0]);
      const gangar = [];
      // frambjóðendur: hurð að stigahúsi, eða handan veggjar (≤ 0,45 m) — hurðin finnst ekki alltaf (hurð við horn)
      stigahusin.forEach(l => {
        const hurd = new Set(nagr(l));
        const handan = [];
        for (let q = 1; q <= hb.n; q++) if (q !== l && !hb.jadar[q] && !hurd.has(q) && hb.flat[q] >= 2 && hb.flat[q] <= 60 && nalaegt(hb, l, q, 0.45 * pxm)) handan.push(q);
        [...hurd].concat(handan).forEach(q => {
          if (tegL.has(q) || lyftuSet.has(q) || hb.flat[q] < 2 || hb.flat[q] > 60) return;
          const nq = nagr(q), aLyftu = nq.some(v => lyftuSet.has(v)) || hb.lyftur.some(v => nalaegt(hb, q, v, 0.6 * pxm));
          // dreifigangur er mjór (innritaður hringur ≤ 1,6 m í radíus) — íbúð við stigann með mörgum hurðum er það
          // ekki (Laugavegur 18, 6. hæð: íbúð 06-01, 4,5 m breið, taldist gangur)
          const mjor = (hb.radius[q] || 0) / pxm <= 1.1;
          if (aLyftu || (hurd.has(q) && nq.length >= 4 && mjor)) { tegL.set(q, 'gangur'); gangar.push(q); }
        });
      });
      gangar.forEach(q => {
        hb.lyftur.forEach(v => { if (!tegL.has(v) && nalaegt(hb, q, v, 0.6 * pxm)) tegL.set(v, 'lyfta'); });
        nagr(q).forEach(v => {
          if (tegL.has(v) || hb.flat[v] > 15 || hb.flat[v] < 2) return;
          // anddyri: hurð út (herbergi á jaðri / utan húss handan hurðar)
          const ut = hb.hurdir.some(d => { if (d.a !== v && d.b !== v) return false; const q = d.a === v ? d.b : d.a; return hb.jadar[q] || hb.flat[q] > 150; });
          if (ut) tegL.set(v, 'anddyri');
        });
      });
    }
    // svæði: eitt á hverja tegund-samfellu (herbergi sömu tegundar sem snertast sameinuð)
    const svaedi = [];
    const reitM = new Uint8Array(W * H);
    const hopar = new Map();
    tegL.forEach((teg, l) => { const k = teg === 'stigahus' ? 'stigahus' : teg; if (!hopar.has(k)) hopar.set(k, []); hopar.get(k).push(l); });
    hopar.forEach((ls, teg) => {
      // samfellur innan tegundar (fjarlægð ≤ 0,3 m)
      const eftir = new Set(ls);
      while (eftir.size) {
        const f = eftir.values().next().value; eftir.delete(f);
        const hop = [f], q = [f];
        while (q.length) { const a = q.pop(); [...eftir].forEach(b => { if (nalaegt(hb, a, b, 0.3 * pxm)) { eftir.delete(b); hop.push(b); q.push(b); } }); }
        reitM.fill(0);
        let fl = 0, cx = 0, cy = 0, c = 0;
        const hs = new Set(hop);
        for (let i = 0; i < W * H; i++) { const l = hb.lab[i]; if (l && hs.has(l)) { reitM[i] = 1; c++; cx += i % W; cy += (i - i % W) / W; } }
        hop.forEach(l => { fl += hb.flat[l]; });
        if (fl < 0.8 && teg !== 'lyfta') continue;
        const poly = utlina(reitM, W, H, Math.round(0.08 * pxm), 0.06 * pxm).map(p => [+(p[0] * s).toFixed(1), +(p[1] * s).toFixed(1)]);
        if (poly.length >= 3) svaedi.push({ teg, poly, flatarmal: +fl.toFixed(1), x: +(cx / c * s).toFixed(1), y: +(cy / c * s).toFixed(1) });
      }
    });
    kassar.forEach(k => {
      const sp = 0.3 * pxm;
      svaedi.push({ teg: 'stigahus', kassi: true, poly: [[k.x0 - sp, k.y0 - sp], [k.x1 + sp, k.y0 - sp], [k.x1 + sp, k.y1 + sp], [k.x0 - sp, k.y1 + sp]].map(p => [+(p[0] * s).toFixed(1), +(p[1] * s).toFixed(1)]), flatarmal: +(((k.x1 - k.x0 + 2 * sp) * (k.y1 - k.y0 + 2 * sp)) / (pxm * pxm)).toFixed(1), x: +((k.x0 + k.x1) / 2 * s).toFixed(1), y: +((k.y0 + k.y1) / 2 * s).toFixed(1) });
    });
    // kjallari: öll hæðin (innan hússins) er sameign — útlína hússins = allt sem er ekki á jaðri
    let heil = null;
    if (kjallari) {
      let c = 0;
      for (let i = 0; i < W * H; i++) c += hb.hus[i];
      if (c) {
        const poly = utlina(hb.hus, W, H, 0, 0.1 * pxm).map(p => [+(p[0] * s).toFixed(1), +(p[1] * s).toFixed(1)]);
        if (poly.length >= 3) heil = { teg: 'kjallari', poly, flatarmal: +(c / (pxm * pxm)).toFixed(1) };
      }
    }
    const stigarUt = stigar.map(k => ({ x0: +(k.x0 * s).toFixed(1), y0: +(k.y0 * s).toFixed(1), x1: +(k.x1 * s).toFixed(1), y1: +(k.y1 * s).toFixed(1), ass: k.ass, n: k.n, bil_m: k.bil_m, lengd_m: k.lengd_m, uti: k.uti, stadfest: k.stadfest }));
    return {
      utgafa: UTGAFA, kjallari, heil: !!heil, heildarsvaedi: heil, svaedi, stigar: stigarUt, herbergi: herb,
      talning: { kambar: kb.stigar.length, rist: kb.rist.length, herbergi: hb.n, hurdir: hb.hurdir.length, lyftur: hb.lyftur.length, svaedi: svaedi.length,
        stigahus: svaedi.filter(v => v.teg === 'stigahus').length, gangar: svaedi.filter(v => v.teg === 'gangur').length }
    };
  }
  // Liggja herbergi a og b innan d reita hvort frá öðru? (kassi fyrst, svo reitir á jaðri a)
  function nalaegt(hb, a, b, d) {
    const A = hb.kassi[a], B = hb.kassi[b]; if (!A || !B) return false;
    if (A[0] - d > B[2] || B[0] - d > A[2] || A[1] - d > B[3] || B[1] - d > A[3]) return false;
    const W = hb.W, H = hb.H, lab = hb.lab, dd = Math.ceil(d);
    for (let y = Math.max(0, A[1]); y <= Math.min(H - 1, A[3]); y += 2) for (let x = Math.max(0, A[0]); x <= Math.min(W - 1, A[2]); x += 2) {
      if (lab[y * W + x] !== a) continue;
      for (let k = 1; k <= dd; k += 2) {
        if ((x + k < W && lab[y * W + x + k] === b) || (x - k >= 0 && lab[y * W + x - k] === b) || (y + k < H && lab[(y + k) * W + x] === b) || (y - k >= 0 && lab[(y - k) * W + x] === b)) return true;
      }
    }
    return false;
  }

  /* ── 4b. allt húsið ── */
  // haedir: [{ lykill (blað + skurður), pxmSrc (dílar skornu myndarinnar á metra), R, nafn, textar }]. Kambar hverrar
  // hæðar → staðfesting gegn öðrum blöðum → greinaHaed. Hæðir með sama lykil deila greiningunni (dæmigerð hæð).
  // Skilar { haedir: [niðurstaða], hlidranir: [{ fra, til, t: [dx, dy] m, n }] } — hliðrun milli aðliggjandi hæða í
  // METRUM skornu myndanna (staðbundið: x til hægri, y niður blaðið).
  function greinaHus(haedir) {
    const kb = new Map();
    const kH = haedir.map(h => {
      if (!kb.has(h.lykill)) kb.set(h.lykill, kambar(h.R));
      return kb.get(h.lykill);
    });
    const metrar = haedir.map((h, i) => kH[i].stigar.map(k => ({ ass: k.ass, x: (k.x0 + k.x1) / 2 * h.R.s / h.pxmSrc, y: (k.y0 + k.y1) / 2 * h.R.s / h.pxmSrc })));
    const lyklar = [...new Set(haedir.map(h => h.lykill))];
    const stadfest = haedir.map((h, i) => kH[i].stigar.map(() => 0));
    haedir.forEach((h, i) => haedir.forEach((g, j) => {
      if (i === j || h.lykill === g.lykill) return;
      const b = hlidrun(metrar[i], metrar[j]);
      if (!b.n) return;
      metrar[i].forEach((a, k) => { if (metrar[j].some(q => q.ass === a.ass && Math.hypot(a.x + b.t[0] - q.x, a.y + b.t[1] - q.y) < 1.6)) stadfest[i][k]++; });
    }));
    // eitt blað (eða allar hæðir af sama blaði): ekkert til að bera saman — sterkur kambur (≥ 6 þrep) dugar
    const einBlad = lyklar.length < 2;
    const nidur = new Map();
    const ut = haedir.map((h, i) => {
      // Fjögur eða fleiri ólík blöð: stiginn verður að finnast á tveimur öðrum (stigahúsið nær frá kjallara upp á efstu
      // hæð; tröppur utan húss niður í kjallara sjást aðeins á kjallara + 1. hæð). Færri blöð: einu (kjallari án stiga á
      // þriggja blaða húsi má ekki fella stigann). Tröppur utan grunnflatar falla líka á „uti".
      const krafa = lyklar.length >= 4 ? 2 : 1;
      const sf = kH[i].stigar.map((k, q) => einBlad ? k.n >= 6 : stadfest[i][q] >= krafa);
      const lyk = h.lykill + '|' + (h.nafn || '') + '|' + sf.join('');
      if (!nidur.has(lyk)) nidur.set(lyk, greinaHaed({ R: h.R, nafn: h.nafn, textar: h.textar, stadfest: sf, kb: kH[i] }));
      const r = nidur.get(lyk);
      return Object.assign({}, r, { stadfestingar: stadfest[i] });
    });
    const hlidranir = [];
    for (let i = 0; i + 1 < haedir.length; i++) {
      const b = haedir[i].lykill === haedir[i + 1].lykill ? { n: metrar[i].length, t: [0, 0], samaBlad: true } : hlidrun(metrar[i], metrar[i + 1]);
      hlidranir.push({ fra: i, til: i + 1, n: b.n, t: [+b.t[0].toFixed(3), +b.t[1].toFixed(3)], samaBlad: !!b.samaBlad });
    }
    return { haedir: ut, hlidranir, blod: lyklar.length };
  }

  /* ── teikning: deyfa allt nema sameign, gulleitur flötur á sameign og stigum ── */
  const LITUR0 = { deyfa: 'rgba(236,238,241,.62)', sameign: 'rgba(255,214,102,.34)', stigi: 'rgba(240,180,40,.5)', brun: 'rgba(196,140,20,.95)', heiti: true };
  // ctx: 2D-samhengi, res: niðurstaða hæðar, P(x, y): dílar SKORNU myndarinnar → skjár, rammi: [[x, y]…] útlína
  // myndarinnar á skjá (það sem er deyft).
  function teikna(ctx, res, P, rammi, litir) {
    if (!res) return;
    const LITUR = Object.assign({}, LITUR0, litir || {});
    const svaedi = (res.heil && res.heildarsvaedi ? [res.heildarsvaedi] : []).concat(res.svaedi || []);
    const leid = poly => { poly.forEach((p, i) => { const q = P(p[0], p[1]); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); ctx.closePath(); };
    ctx.save();
    // íbúðir deyfðar: allt innan rammans NEMA sameignin (evenodd)
    ctx.beginPath();
    rammi.forEach((p, i) => { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.closePath();
    svaedi.forEach(v => leid(v.poly));
    ctx.fillStyle = LITUR.deyfa; ctx.fill('evenodd');
    // sameign: ljós gulleitur flötur, mjó brún
    svaedi.forEach(v => {
      ctx.beginPath(); leid(v.poly);
      ctx.fillStyle = v.teg === 'stigahus' ? LITUR.stigi : LITUR.sameign; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = LITUR.brun; ctx.setLineDash(v.teg === 'kjallari' ? [8, 6] : []); ctx.stroke(); ctx.setLineDash([]);
    });
    // stigar: þrepin undirstrikuð
    (res.stigar || []).forEach(k => {
      if (k.uti || !k.stadfest) return;
      const n = Math.max(2, k.n);
      ctx.strokeStyle = 'rgba(150,100,10,.85)'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const a = k.ass === 'x' ? P(k.x0, k.y0 + (k.y1 - k.y0) * t) : P(k.x0 + (k.x1 - k.x0) * t, k.y0);
        const b = k.ass === 'x' ? P(k.x1, k.y0 + (k.y1 - k.y0) * t) : P(k.x0 + (k.x1 - k.x0) * t, k.y1);
        ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      }
      ctx.stroke();
    });
    // heiti svæða (lítið, aðeins ef pláss)
    if (LITUR.heiti === false) { ctx.restore(); return; }
    const HEITI = { stigahus: 'Stigahús', gangur: 'Gangur', anddyri: 'Anddyri', lyfta: 'Lyfta', kjallari: 'Kjallari — sameign', hjol: 'Hjól/vagnar', thvottur: 'Þvottahús', thurrk: 'Þurrkherb.', taekni: 'Tæknirými', sorp: 'Sorp', geymslugangur: 'Geymslugangur', sameign: 'Sameign' };
    ctx.font = '700 12px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    svaedi.forEach(v => {
      const t = HEITI[v.teg] || 'Sameign';
      const q = v.teg === 'kjallari' ? P(v.poly[0][0], v.poly[0][1]) : P(v.x, v.y);
      const xx = v.teg === 'kjallari' ? q[0] + 70 : q[0], yy = v.teg === 'kjallari' ? q[1] + 14 : q[1];
      const b = ctx.measureText(t).width + 10;
      ctx.fillStyle = 'rgba(20,18,15,.78)'; ctx.fillRect(xx - b / 2, yy - 9, b, 18);
      ctx.fillStyle = '#ffe08a'; ctx.fillText(t, xx, yy + 0.5);
    });
    ctx.restore();
  }
  // Er staður (dílar skornu myndarinnar) innan sameignar hæðarinnar?
  function iSameign(res, x, y, spass) {
    if (!res) return true;
    spass = spass || 0;
    const inni = poly => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i], [xj, yj] = poly[j];
        if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi || 1e-9) + xi) c = !c;
      }
      return c;
    };
    const fjarl = poly => { let b = Infinity; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [ax, ay] = poly[j], [bx, by] = poly[i], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); b = Math.min(b, Math.hypot(x - ax - dx * t, y - ay - dy * t)); } return b; };
    const allt = (res.heil && res.heildarsvaedi ? [res.heildarsvaedi] : []).concat(res.svaedi || []);
    return allt.some(v => inni(v.poly) || (spass > 0 && fjarl(v.poly) <= spass));
  }

  W0.TeiknSameign = { PXM, UTGAFA, flokkur, rasti, smaekka, vikkaM, lokaM, kambar, herbergi, utlina, hlidrun, greinaHaed, greinaHus, teikna, iSameign, LITUR: LITUR0 };
})();
