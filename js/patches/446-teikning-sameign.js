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
  const UTGAFA = 2;               // 2: hringstigar, skástigar, ályktun milli hæða, kvarðaleiðrétting (08.10.2026)

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
      // Endar þrepanna í beinni línu ÞVERT á þrepin (veggur / kjálki): skástrikun í rými á öðru horni „rekur" — hver
      // lína byrjar einu bili utar en sú á undan (halli ±1). Stigi hefur halla ~0 báðum megin (Bríetartún 08.10.2026:
      // skástrikun gangsins á 45° hefði annars orðið skástigi).
      const halli = k => { const n = hop.length, ma = hop.reduce((s, h) => s + h[0], 0) / n, mk = hop.reduce((s, h) => s + h[k], 0) / n;
        let sxy = 0, sxx = 0; hop.forEach(h => { sxy += (h[0] - ma) * (h[k] - mk); sxx += (h[0] - ma) * (h[0] - ma); }); return sxx ? sxy / sxx : 0; };
      if (Math.abs(halli(1)) > 0.4 && Math.abs(halli(2)) > 0.4) continue;
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
  // Dæmigerð þykkt láréttra lína (reitir): miðgildi stuttra lóðréttra blekkeyrslna (1–11) í 3. hverjum dálki. Snúnir
  // og ljósir rastar erfa töluna frá upprunanum (R._linuthykkt).
  function linuthykkt(R) {
    if (R._linuthykkt) return R._linuthykkt;
    const W = R.W, H = R.H, gildi = hist(R).svarthvitt ? 150 : throskuldur(R, 0.75, 150), tal = new Uint32Array(12);
    for (let x = 0; x < W; x += 3) { let r = 0; for (let y = 0; y < H; y++) { if (R.g[y * W + x] < gildi) r++; else { if (r > 0 && r < 12) tal[r]++; r = 0; } } }
    let s = 0; for (let k = 1; k < 12; k++) s += tal[k];
    let a = 0, med = 2; for (let k = 1; k < 12; k++) { a += tal[k]; if (a >= s / 2) { med = k; break; } }
    R._linuthykkt = med;
    return med;
  }
  function snua(m, W, H) { const t = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) t[x * H + y] = m[y * W + x]; return t; }
  // Skilar { stigar, rist } í reitum greiningarinnar: stigar = kambar sem eru ekki í rist (flísar)
  // o.gildi: einn þröskuldur · o.medStuttum: líka 0,6–0,75 m þrep (mjór stigi, Asparfell nr. 8) í sér lista „stutt" —
  // sömu blekgrímur, venjulega niðurstaðan óbreytt. Stuttir teljast aðeins með sterkri samsvörun (SAMS_STUTT).
  function kambar(R, o) {
    o = o || {};
    const W = R.W, H = R.H, pxm = PXM;
    // Grátt: þrír þröskuldar og sameinað — þrepin eru oft ljósari en veggirnir (Laugavegur 18: 140–175 á ~232) og
    // kamburinn er svo reglulegt mynstur að hærri þröskuldur gefur ekki falska kamba.
    const gildin = o.gildi ? [o.gildi] : hist(R).svarthvitt ? [150] : [0.6, 0.75, 0.85].map(q => throskuldur(R, q, 150));
    // þykkasta þrep: 0,09 m — eða 1,25 × dæmigerð línuþykkt blaðsins ef skönnunin er óskýr (Þverholt 24: línur 5 reitir,
    // þrepin féllu á 4 reita þakinu; Vegamótastígur 3 reitir — óbreytt þar, annars urðu flísar baðherbergja að stigum)
    const maxTh = Math.max(2, Math.round(0.09 * pxm), Math.round(1.25 * linuthykkt(R))), maxL = 4.0 * pxm;
    const saman = (lst, nyir) => nyir.forEach(k => {          // sami kambur á fleiri en einum þröskuldi: fleiri þrep standa
      const i = lst.findIndex(q => q.ass === k.ass && Math.min(q.x1, k.x1) - Math.max(q.x0, k.x0) > 0 && Math.min(q.y1, k.y1) - Math.max(q.y0, k.y0) > 0);
      if (i < 0) lst.push(k); else if (k.n > lst[i].n) lst[i] = k;
    });
    const umferd = (blek, blekT, minL) => {
      const nyir = [];
      kambarAs(butar(blek, W, H, minL, maxTh).filter(b => b[2] - b[1] <= maxL), pxm, 'x')
        .forEach(k => nyir.push(Object.assign(k, { x0: k.b0, x1: k.b1, y0: k.a0, y1: k.a1 })));
      kambarAs(butar(blekT, H, W, minL, maxTh).filter(b => b[2] - b[1] <= maxL), pxm, 'z')
        .forEach(k => nyir.push(Object.assign(k, { x0: k.a0, x1: k.a1, y0: k.b0, y1: k.b1 })));
      return nyir;
    };
    const ut = [], utS = [];
    gildin.forEach(gildi => {
      const blek = blekMaski(R, gildi), blekT = snua(blek, W, H);
      saman(ut, umferd(blek, blekT, Math.round(0.75 * pxm)));
      if (o.medStuttum) saman(utS, umferd(blek, blekT, Math.round(0.6 * pxm)));
    });
    const fl = k => Math.max(1e-6, (k.x1 - k.x0) * (k.y1 - k.y0)), rist = new Set();
    for (let i = 0; i < ut.length; i++) for (let j = 0; j < ut.length; j++) {
      const a = ut[i], b = ut[j]; if (a.ass === b.ass) continue;
      const sx = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), sy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (sx > 0 && sy > 0 && sx * sy > 0.4 * Math.min(fl(a), fl(b))) { rist.add(i); rist.add(j); }
    }
    const hreint = k => ({ ass: k.ass, x0: k.x0, y0: k.y0, x1: k.x1, y1: k.y1, n: k.n, bil_m: +k.bil_m.toFixed(3), lengd_m: +k.lengd_m.toFixed(2) });
    const res = { stigar: ut.filter((k, i) => !rist.has(i)).map(hreint), rist: ut.filter((k, i) => rist.has(i)).map(hreint) };
    if (o.medStuttum) {
      // stuttu: aðeins þeir sem skarast hvorki við venjulegan kamb sömu stefnu, rist né stuttan kamb hinnar stefnunnar (flísar)
      const skarast = (k, q) => Math.min(q.x1, k.x1) > Math.max(q.x0, k.x0) && Math.min(q.y1, k.y1) > Math.max(q.y0, k.y0);
      res.stutt = utS.filter(k => !ut.some(q => q.ass === k.ass && skarast(k, q)) && !res.rist.some(q => skarast(k, q)) && !utS.some(q => q !== k && q.ass !== k.ass && skarast(k, q))).map(hreint);
    }
    return res;
  }
  /* ── 2b. SKÁSTIGAR: kambar á snúnum rasta (Bríetartún 1487: stigahús 00-42 á 45°) ── */
  // Ríkjandi horn veggja utan 0/90°: blek í 0,2 m reitum, samfelldar keyrslur ≥ 4 m eftir stefnu θ (og θ + 90°) bornar
  // saman við 0°. Skástrikun (stuttar línur) og texti ná ekki 4 m; langur skáveggur gerir það. Skilar gráðum (≤ 2).
  function rikjandiHorn(R) {
    if (R._horn) return R._horn;
    const c = Math.round(0.2 * PXM), W = Math.ceil(R.W / c), H = Math.ceil(R.H / c), m = new Uint8Array(W * H);
    const gildi = hist(R).svarthvitt ? 150 : throskuldur(R, 0.75, 150);
    for (let y = 0; y < R.H; y++) { const r = y * R.W, ry = (y / c | 0) * W; for (let x = 0; x < R.W; x++) if (R.g[r + x] < gildi) m[ry + (x / c | 0)] = 1; }
    const L = 20;
    // keyrslur eftir línum í stefnu d (og þvert á, d + 90°), ein lína á hvern reit þvert á stefnuna — beint á gríminni
    const linur = (dx, dy) => {
      const nx = -dy, ny = dx, horn4 = [[0, 0], [W, 0], [0, H], [W, H]];
      const on = horn4.map(p => p[0] * nx + p[1] * ny), ud = horn4.map(p => p[0] * dx + p[1] * dy);
      const o0 = Math.floor(Math.min(...on)), o1 = Math.ceil(Math.max(...on)), u0 = Math.floor(Math.min(...ud)), u1 = Math.ceil(Math.max(...ud));
      let s = 0;
      for (let o = o0; o <= o1; o++) {
        let run = 0;
        for (let u = u0; u <= u1; u++) {
          const x = Math.round(o * nx + u * dx), y = Math.round(o * ny + u * dy);
          if (x >= 0 && y >= 0 && x < W && y < H && m[y * W + x]) run++; else { if (run >= L) s += run - L; run = 0; }
        }
        if (run >= L) s += run - L;
      }
      return s;
    };
    const skor = t => { const a = t * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a); return linur(cs, sn) + linur(-sn, cs); };
    // aðeins 15–75°: nær ásunum lekur þykkur skástrikaður útveggur inn í keyrslurnar (Berjavellir: 10° gaf 0,2)
    const s0 = skor(0) || 1, gr = []; R._hornGr = gr;
    for (let t = 15; t <= 75; t += 5) gr.push([t, skor(t) / s0]);
    const ut = [];
    gr.forEach(([t, v], i) => {
      if (v < 0.4 || i === 0 || i === gr.length - 1 || gr[i - 1][1] > v || gr[i + 1][1] >= v) {
        // jaðarhorn (15/75°) aðeins ef það er skýrt hærra en nágranninn
        if (!(v >= 0.4 && (i === 0 || i === gr.length - 1) && v > 1.5 * gr[i === 0 ? 1 : i - 1][1])) return;
      }
      let bt = t, bv = v;                     // fínstilla á 1° innan 15–75°
      for (let d = -3; d <= 3; d++) { if (!d || t + d < 15 || t + d > 75) continue; const q = skor(t + d) / s0; if (q > bv) { bv = q; bt = t + d; } }
      ut.push([bt, bv]);
    });
    R._hornSkor = ut; R._horn = ut.sort((p, q) => q[1] - p[1]).slice(0, 2).map(q => q[0]);
    return R._horn;
  }
  // Rasti snúinn um −horn (línur á stefnu horn verða láréttar). Hver reitur = dekksti af fjórum nágrönnum upprunans
  // (þunnar línur slitna ekki). fra(x, y) → hnit upprunalega rastans.
  function snuinnRasti(R, horn) {
    const a = horn * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), W = R.W, H = R.H;
    const W2 = Math.ceil(Math.abs(W * cs) + Math.abs(H * sn)), H2 = Math.ceil(Math.abs(W * sn) + Math.abs(H * cs));
    const cx = W / 2, cy = H / 2, cx2 = W2 / 2, cy2 = H2 / 2, g = new Uint8Array(W2 * H2).fill(255);
    const fra = (x2, y2) => [cx + (x2 - cx2) * cs - (y2 - cy2) * sn, cy + (x2 - cx2) * sn + (y2 - cy2) * cs];
    for (let y2 = 0; y2 < H2; y2++) for (let x2 = 0; x2 < W2; x2++) {
      const x = cx + (x2 - cx2) * cs - (y2 - cy2) * sn, y = cy + (x2 - cx2) * sn + (y2 - cy2) * cs;
      const x0 = Math.floor(x), y0 = Math.floor(y);
      if (x0 < 0 || y0 < 0 || x0 + 1 >= W || y0 + 1 >= H) continue;
      const i = y0 * W + x0;
      g[y2 * W2 + x2] = Math.min(R.g[i], R.g[i + 1], R.g[i + W], R.g[i + W + 1]);
    }
    return { g, W: W2, H: H2, s: R.s, _hist: hist(R), _linuthykkt: linuthykkt(R), fra };
  }
  // Kambar á ríkjandi skáhornum: kassinn í snúna rammanum → fjögur horn í upprunalegum hnitum (hornpunktar), stefna
  // þrepanna (trodur: 'x' = þrepin samsíða p0→p1, 'z' = samsíða p0→p3), ass = 's' + horn þrepanna (heilar gráður).
  function skakambar(R) {
    const ut = [];
    rikjandiHorn(R).forEach(horn => {
      const R2 = snuinnRasti(R, horn), kb = kambar(R2);
      kb.stigar.forEach(k => {
        const hp = [[k.x0, k.y0], [k.x1, k.y0], [k.x1, k.y1], [k.x0, k.y1]].map(p => R2.fra(p[0], p[1]).map(v => +v.toFixed(1)));
        const xs = hp.map(p => p[0]), ys = hp.map(p => p[1]);
        const th = Math.round(((k.ass === 'x' ? horn : horn + 90) % 180 + 180) % 180);
        ut.push({ ass: 's' + th, horn: th, trodur: k.ass, hornpunktar: hp, x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys), n: k.n, bil_m: k.bil_m, lengd_m: k.lengd_m });
      });
    });
    return ut;
  }

  /* ── 2c. HRINGSTIGAR: geislar út frá miðju innan hrings (Laugavegur 18: stigahús 03-08 … 06-10) ── */
  // Þrepin í hringstiga (og hálfhring vinkilstiga) eru geislar sem stefna á miðjuna (súluna). Þrjú stig:
  //  1. forsía á 0,1 m rúðu: hringir r = 0,6 og 0,95 m skornir af MJÓUM línum (1–3 reitir) — geisli sker báða á sama
  //     horni (±6°). ≥ 6 slíkar samsvaranir.
  //  2. geislar á 2° fresti, 0,45–1,1 m frá miðju (blek án víkkunar): lína = ≥ 55 % blek OG ≥ 0,3 meira en grannar
  //     ±6–10° (mjó lína, ekki klessa). Miðjan fínstillt ±0,3 m.
  //  3. REGLULEG RÖÐ: ≥ 7 línur í röð með bili 8–40° og hvert bil innan ±40 % af miðgildinu (Laugavegur: 18° × 8).
  // Tígull, lyftukross, skástrikun og hurðarbogar standast ekki 3.
  function hringstigar(R) {
    const W = R.W, H = R.H, pxm = PXM;
    const gildi = hist(R).svarthvitt ? 150 : throskuldur(R, 0.65, 150);
    const M = blekMaski(R, gildi);
    // heildarmynd bleks: auð svæði (spássíur, bil milli álma) og þétt (veggjaklessur) sleppa forsíunni
    const I = new Int32Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) { let rs = 0; for (let x = 0; x < W; x++) { rs += M[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + rs; } }
    const kassaSumma = (x0, y0, x1, y1) => I[y1 * (W + 1) + x1] - I[y0 * (W + 1) + x1] - I[y1 * (W + 1) + x0] + I[y0 * (W + 1) + x0];
    const r0 = Math.round(0.45 * pxm), r1 = Math.round(1.1 * pxm), NH = 180;
    const cs = new Float32Array(NH), sn = new Float32Array(NH);
    for (let t = 0; t < NH; t++) { cs[t] = Math.cos(t * 2 * Math.PI / NH); sn[t] = Math.sin(t * 2 * Math.PI / NH); }
    // 1. forsía
    const hringur = r => { const n = Math.round(2 * Math.PI * r), dx = new Int32Array(n), dy = new Int32Array(n); for (let k = 0; k < n; k++) { dx[k] = Math.round(r * Math.cos(k * 2 * Math.PI / n)); dy[k] = Math.round(r * Math.sin(k * 2 * Math.PI / n)); } return { n, dx, dy }; };
    const HA = hringur(0.6 * pxm), HB = hringur(0.95 * pxm);
    const skurdir = (cx, cy, Hh) => {        // horn (gráður) mjórra skurða
      const ut = [], n = Hh.n, v = k => M[(cy + Hh.dy[k % n]) * W + cx + Hh.dx[k % n]];
      let k0 = 0;
      while (k0 < n && v(k0)) k0++;
      if (k0 === n) return ut;
      for (let k = 1; k < n;) {
        if (!v(k0 + k)) { k++; continue; }
        let b = 0; while (k + b < n && v(k0 + k + b)) b++;
        if (b <= 3) ut.push(((k0 + k + (b - 1) / 2) % n) * 360 / n);
        k += b;
      }
      return ut;
    };
    // 2.–3. geislar og regluleg röð
    // geislahliðranir reiknaðar einu sinni (dx, dy fyrir hvern geisla og radíus)
    const NR = r1 - r0 + 1, gdx = new Int16Array(NH * NR), gdy = new Int16Array(NH * NR);
    for (let t = 0; t < NH; t++) for (let r = r0; r <= r1; r++) { gdx[t * NR + r - r0] = Math.round(r * cs[t]); gdy[t * NR + r - r0] = Math.round(r * sn[t]); }
    const f = new Float32Array(NH), b6 = new Float32Array(6);
    const meta = (cx, cy) => {
      let mf = 0;
      for (let t = 0; t < NH; t++) {
        let c = 0; const o = t * NR;
        for (let k = 0; k < NR; k++) if (M[(cy + gdy[o + k]) * W + cx + gdx[o + k]]) c++;
        f[t] = c / NR; mf += f[t];
      }
      if (mf / NH > 0.5) return { L: 0, bil: 0, thett: mf / NH };       // klessa / þétt svæði
      const tind = [];
      for (let t = 0; t < NH; t++) {
        const v = f[t]; if (v < 0.55 || v < f[(t + 1) % NH] || v < f[(t + NH - 1) % NH]) continue;
        if (tind.length && tind[tind.length - 1] === (t - 1) * 360 / NH) continue;          // flatur toppur: einu sinni
        let j = 0; for (const d of [-5, -4, -3, 3, 4, 5]) b6[j++] = f[(t + d + NH) % NH];
        b6.sort();
        if (v - (b6[2] + b6[3]) / 2 < 0.3) continue;
        tind.push(t * 360 / NH);
      }
      // lengsta reglulega röð (hringinn í kring): hvert bil 8–40° og innan ±40 % af meðalbili raðarinnar
      let best = 0, bestBil = 0;
      const n = tind.length;
      if (n >= 7 && n <= 45) for (let s0 = 0; s0 < n; s0++) {
        let sum = 0, cnt = 0;
        for (let k = 1; k < n; k++) {
          const g = ((tind[(s0 + k) % n] - tind[(s0 + k - 1) % n]) + 360) % 360;
          if (g < 8 || g > 40 || (cnt && Math.abs(g - sum / cnt) > 0.4 * sum / cnt)) break;
          sum += g; cnt++;
        }
        if (cnt + 1 > best) { best = cnt + 1; bestBil = cnt ? sum / cnt : 0; }
      }
      return { L: best, bil: bestBil, thett: mf / NH };
    };
    const fundir = [], st = Math.round(0.1 * pxm), fi = Math.round(0.3 * pxm), sp = r1 + fi + 6, merki = new Uint8Array(360);
    const hk = r1, hkF = (2 * hk) * (2 * hk);
    for (let cy = sp; cy < H - sp; cy += st) for (let cx = sp; cx < W - sp; cx += st) {
      const tt = kassaSumma(cx - hk, cy - hk, cx + hk, cy + hk) / hkF;
      if (tt < 0.03 || tt > 0.5) continue;
      const a = skurdir(cx, cy, HA); if (a.length < 7 || a.length > 60) continue;
      const b = skurdir(cx, cy, HB); if (b.length < 7 || b.length > 90) continue;
      for (const q of b) { const k = Math.round(q); for (let d = -6; d <= 6; d++) merki[(k + d + 360) % 360] = 1; }
      let par = 0; for (const p of a) if (merki[Math.round(p) % 360]) par++;
      for (const q of b) { const k = Math.round(q); for (let d = -6; d <= 6; d++) merki[(k + d + 360) % 360] = 0; }
      if (par < 7) continue;
      fundir.push({ cx, cy, par });
    }
    // bæling á forsíunni (einn frambjóðandi á hverja 0,5 m), svo fínstilling
    fundir.sort((p, q) => q.par - p.par);
    const valdir = [], tekid = new Set(), rc = Math.round(0.5 * pxm);
    fundir.forEach(f => {
      const gx = Math.floor(f.cx / rc), gy = Math.floor(f.cy / rc);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (tekid.has((gx + dx) + ',' + (gy + dy))) return;
      tekid.add(gx + ',' + gy); valdir.push(f);
    });
    const ut = [];
    valdir.slice(0, 150).forEach(v => {
      // gróft (6 reitir) svo fínt (2) um það besta
      let q = null, bx = v.cx, by = v.cy;
      for (let dy = -fi; dy <= fi; dy += 6) for (let dx = -fi; dx <= fi; dx += 6) {
        const q2 = meta(v.cx + dx, v.cy + dy);
        if (!q || q2.L > q.L) { q = q2; bx = v.cx + dx; by = v.cy + dy; }
      }
      if (q.L < 4) return;
      const gx = bx, gy = by;
      for (let dy = -4; dy <= 4; dy += 2) for (let dx = -4; dx <= 4; dx += 2) {
        if (!dx && !dy) continue;
        const q2 = meta(gx + dx, gy + dy);
        if (q2.L > q.L) { q = q2; bx = gx + dx; by = gy + dy; }
      }
      if (!q || q.L < 7 || q.thett > 0.5) return;
      if (ut.some(u => Math.hypot(u.cx - bx, u.cy - by) < 1.2 * pxm)) return;
      const r = 1.2 * pxm;
      ut.push({ hringur: true, ass: 'h', cx: bx, cy: by, x0: bx - r, y0: by - r, x1: bx + r, y1: by + r, n: q.L, bil_m: +(0.8 * q.bil * Math.PI / 180).toFixed(3), lengd_m: 2.4 });
    });
    return ut;
  }

  /* ── 2d. STAÐBUNDIN SAMSVÖRUN milli blaða ── */
  // Blekþéttleiki í 0,2 m reitum. Samsvörun = NCC þéttleikans í 3,6 m radíus um stigann á blaði A við sama glugga um
  // stigann (eða spáða staðinn) á blaði B, besta hliðrun innan ±leit m. Reitir stigans sjálfs (kassi + 0,2 m) eru
  // utan reiknings svo flísar baðherbergis „líkist" ekki stiga — það eru VEGGIRNIR í kring sem endurtaka sig.
  function thettleiki(R) {
    if (R._D) return R._D;
    const c = Math.round(0.2 * PXM), Wd = Math.ceil(R.W / c), Hd = Math.ceil(R.H / c), D = new Float32Array(Wd * Hd);
    // veggir einir (herbergi(): tvöfaldar línur / þykkt blek) ef til — húsgögn, texti og málsetningar eru ólík milli hæða
    const V = R._veggur, gildi = hist(R).svarthvitt ? 150 : throskuldur(R, 0.75, 150);
    for (let y = 0; y < R.H; y++) { const r = y * R.W, ry = (y / c | 0) * Wd; for (let x = 0; x < R.W; x++) if (V ? V[r + x] : R.g[r + x] < gildi) D[ry + (x / c | 0)]++; }
    for (let i = 0; i < D.length; i++) D[i] /= c * c;
    R._D = { D, Wd, Hd, c };
    return R._D;
  }
  // a = { cx, cy, kassi: [x0, y0, x1, y1] } (reitir rasta A), b = { cx, cy } (reitir rasta B). Skilar { r, dx, dy } —
  // dx, dy = hliðrun miðju B (reitir rasta B) sem gaf besta r.
  function samsvorun(RA, a, RB, b, leit, rad) {
    const A = thettleiki(RA), B = thettleiki(RB), c = A.c, rd = Math.round((rad || 3.6) / 0.2), L = Math.round((leit == null ? 1.2 : leit) / 0.2);
    const ax = Math.round(a.cx / c), ay = Math.round(a.cy / c), bx = Math.round(b.cx / c), by = Math.round(b.cy / c);
    // undanskildir reitir: kassi stigans (a.kassi) og allra stiga blaðsins í kring (a.kassar) — hinn armur stigans sést á
    // blaði A en ekki B (vantar) og drægi samsvörunina niður (gervihús: 0,14 í stað ~1)
    const kss = (a.kassar || []).concat(a.kassi ? [a.kassi] : []).map(k => [Math.floor(k[0] / c) - 1, Math.floor(k[1] / c) - 1, Math.ceil(k[2] / c) + 1, Math.ceil(k[3] / c) + 1]);
    const offx = [], offy = [], va = [];
    for (let dy = -rd; dy <= rd; dy++) for (let dx = -rd; dx <= rd; dx++) {
      if (dx * dx + dy * dy > rd * rd) continue;
      const x = ax + dx, y = ay + dy;
      if (x < 0 || y < 0 || x >= A.Wd || y >= A.Hd) continue;
      if (kss.some(q => x >= q[0] && x <= q[2] && y >= q[1] && y <= q[3])) continue;
      offx.push(dx); offy.push(dy); va.push(A.D[y * A.Wd + x]);
    }
    let best = { r: -1, dx: 0, dy: 0 };
    if (va.length < 50) return best;
    const ncc = (sx, sy) => {
      let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
      for (let i = 0; i < va.length; i++) {
        const x = bx + sx + offx[i], y = by + sy + offy[i];
        if (x < 0 || y < 0 || x >= B.Wd || y >= B.Hd) continue;
        const p = va[i], q = B.D[y * B.Wd + x];
        n++; sa += p; sb += q; saa += p * p; sbb += q * q; sab += p * q;
      }
      if (n < 0.7 * va.length) return -1;
      const vA = saa - sa * sa / n, vB = sbb - sb * sb / n;
      if (vA <= 1e-6 || vB <= 1e-6) return -1;
      return (sab - sa * sb / n) / Math.sqrt(vA * vB);
    };
    // gróft (annar hver reitur) svo fínt um það besta
    let gx = 0, gy = 0;
    // sléttar hliðranir — 0 alltaf með (oddatala L sleppti 0 áður: gervihús 0,52 í stað 1,0)
    for (let sy = -L + (L % 2); sy <= L; sy += 2) for (let sx = -L + (L % 2); sx <= L; sx += 2) { const r = ncc(sx, sy); if (r > best.r) { best = { r, dx: sx * c, dy: sy * c }; gx = sx; gy = sy; } }
    for (let sy = gy - 1; sy <= gy + 1; sy++) for (let sx = gx - 1; sx <= gx + 1; sx++) {
      if ((sx === gx && sy === gy) || Math.abs(sx) > L || Math.abs(sy) > L) continue;
      const r = ncc(sx, sy); if (r > best.r) best = { r, dx: sx * c, dy: sy * c };
    }
    return best;
  }

  /* ── 3. herbergi úr rasta ── */
  function herbergi(R, kb, o) {
    o = o || {};
    const W = R.W, H = R.H, N = W * H, pxm = PXM, gildi = o.gildi || throskuldur(R, 0.8, 175), veggur = new Uint8Array(N);
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
    // (aðeins láréttir/lóðréttir kambar — skástigar og hringstigar eru ekki í hM/vM hvort eð er)
    (kb.stigar || []).concat(kb.rist || []).forEach(k => { if (k.ass === 'x' || k.ass === 'z') strok(k, k.ass); });
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
      for (let i = 0; i < N; i++) veggur[i] = hM[i] | vM[i];
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
    return { W, H, lab, n, flat, kassi, jadar, midja: sumx.map((v, i) => [v, sumy[i]]), hurdir: [...hurdir.values()], lyftur, bryr: bryr.length, brM, hus, radius, veggur };
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
  // kamb] (úr greinaHus), kb?: stigar blaðsins (endurnýttir), hb?: herbergi (endurnýtt), alyktadir?: [stigar ályktaðir
  // af öðrum hæðum — sama snið, reitir rastans] }. Skilar niðurstöðu í dílum skornu myndarinnar.
  function greinaHaed(inn) {
    const R = inn.R, s = R.s || 1, pxm = PXM, W = R.W, H = R.H;
    const kb = inn.kb || kambar(R);
    const hb = inn.hb || herbergi(R, kb);
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
    // stigar: herbergi stigans = algengasta herbergi reitanna INNAN stigans (kassi; skástigi: ferningur hornpunktanna;
    // hringstigi: 0,9 m frá miðju). Fylltu þrepin kassann allan (Þverholt: þétt þrep á 40 díl/m — enginn laus reitur)
    // er leitað 0,5 m út fyrir. Utan húss = miðjan utan grunnflatar, eða herbergið á jaðri / > 150 m² (lóð).
    const herbStiga = k => {
      const inni = k.hornpunktar ? (x, y) => innanMarghyrnings(k.hornpunktar, x, y) : k.hringur ? (x, y) => Math.hypot(x - k.cx, y - k.cy) <= 0.9 * pxm : null;
      const telja = sp => {
        const tal = new Map();
        for (let y = Math.max(0, Math.floor(k.y0 - sp)); y <= Math.min(H - 1, Math.ceil(k.y1 + sp)); y++) for (let x = Math.max(0, Math.floor(k.x0 - sp)); x <= Math.min(W - 1, Math.ceil(k.x1 + sp)); x++) {
          if (!sp && inni && !inni(x, y)) continue;
          const l = hb.lab[y * W + x]; if (l && (!sp || (!hb.jadar[l] && hb.flat[l] >= 0.3))) tal.set(l, (tal.get(l) || 0) + 1);
        }
        let l = 0, bt = 0; tal.forEach((c, q) => { if (c > bt) { bt = c; l = q; } });
        return l;
      };
      return telja(0) || telja(Math.round(0.5 * pxm));
    };
    const metaStiga = (k, stadfest) => {
      const l = herbStiga(k), c = midjaStiga(k), cx = Math.round(c[0]), cy = Math.round(c[1]);
      const iHusi = cx >= 0 && cy >= 0 && cx < W && cy < H && !!hb.hus[cy * W + cx];
      const uti = !iHusi || (!!l && (hb.jadar[l] || hb.flat[l] > 150));     // > 150 m²: lóð/garður innan girðingar
      return Object.assign({}, k, { herb: l, uti, stadfest });
    };
    const stigar = kb.stigar.map((k, i) => metaStiga(k, inn.stadfest ? !!inn.stadfest[i] : true));
    const alyktadir = (inn.alyktadir || []).map(k => Object.assign(metaStiga(k, false), { alyktad: true }));
    const tegL = new Map();           // herbergi → tegund sameignar ('stigahusA' = ályktað stigahús)
    const merkja = (l, teg) => { if (l && !hb.jadar[l] && !tegL.has(l)) tegL.set(l, teg); };
    const erStigah = t => t === 'stigahus' || t === 'stigahusA';
    // stigahús: staðfestir stigar inni í húsinu; herbergi > 70 m² er leki (og ekkert herbergi = þrepin fylltu allt)
    // — þá kassinn sjálfur
    const kassar = [];
    stigar.forEach(k => {
      if (k.uti || !k.stadfest) return;
      // < 1 m²: þrepaskák, svæðið félli út · hringstigi: geislarnir brjóta herbergið í sneiðar — átthyrningurinn gildir
      if (!k.herb || k.hringur || hb.flat[k.herb] > 70 || hb.flat[k.herb] < 1) { kassar.push(k); return; }
      merkja(k.herb, 'stigahus');
    });
    alyktadir.forEach(k => {
      if (k.uti) return;
      if (!k.herb || k.hringur || hb.flat[k.herb] > 70 || hb.flat[k.herb] < 1 || tegL.has(k.herb)) { if (!tegL.has(k.herb)) kassar.push(k); return; }
      merkja(k.herb, 'stigahusA');
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
    const stigaH = [...tegL.entries()].filter(e => erStigah(e[1])).map(e => e[0]);
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
          if (naer) { inStiga[l] = 1; tegL.set(l, tegL.get(naer)); baett++; }
        }
        // skák sem tengist annarri skák sem er komin inn
        if (!baett) {
          let b2 = 0;
          for (let y = YA; y < YB; y++) for (let x = XA; x < XB; x++) {
            const l = hb.lab[y * W + x]; if (!l || inStiga[l] || hb.jadar[l] || hb.flat[l] >= 0.8) continue;
            for (let d = 1; d <= 3; d++) {
              const v = hb.lab[y * W + x - d] || hb.lab[y * W + x + d] || hb.lab[(y - d) * W + x] || hb.lab[(y + d) * W + x];
              if (v && inStiga[v] && v !== l) { inStiga[l] = 1; tegL.set(l, tegL.get(v)); b2++; break; }
            }
          }
          if (!b2) break;
        }
      }
      // gangur: herbergi með hurð að stigahúsi sem dreifir (≥ 3 hurðir) eða liggur að lyftu; lyfta við gang fylgir
      const stigahusin = [...tegL.entries()].filter(e => erStigah(e[1]) && hb.flat[e[0]] >= 0.8).map(e => e[0]);
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
    tegL.forEach((teg, l) => { if (!hopar.has(teg)) hopar.set(teg, []); hopar.get(teg).push(l); });
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
        if (poly.length >= 3) svaedi.push(Object.assign({ teg: teg === 'stigahusA' ? 'stigahus' : teg, poly, flatarmal: +fl.toFixed(1), x: +(cx / c * s).toFixed(1), y: +(cy / c * s).toFixed(1) }, teg === 'stigahusA' ? { alyktad: true } : {}));
      }
    });
    kassar.forEach(k => {
      const sp = 0.3 * pxm, c = midjaStiga(k);
      let poly;
      if (k.hringur) {                              // hringstigi: átthyrningur um miðjuna (1,3 m)
        const r = 1.3 * pxm; poly = []; for (let a = 0; a < 8; a++) poly.push([c[0] + r * Math.cos(a * Math.PI / 4 + Math.PI / 8), c[1] + r * Math.sin(a * Math.PI / 4 + Math.PI / 8)]);
      } else if (k.hornpunktar) {                   // skástigi: ferningurinn víkkaður um 0,3 m frá miðju
        poly = k.hornpunktar.map(p => { const dx = p[0] - c[0], dy = p[1] - c[1], L = Math.hypot(dx, dy) || 1; return [p[0] + dx / L * sp * 1.41, p[1] + dy / L * sp * 1.41]; });
      } else poly = [[k.x0 - sp, k.y0 - sp], [k.x1 + sp, k.y0 - sp], [k.x1 + sp, k.y1 + sp], [k.x0 - sp, k.y1 + sp]];
      let fl = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) fl += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
      svaedi.push(Object.assign({ teg: 'stigahus', kassi: true, poly: poly.map(p => [+(p[0] * s).toFixed(1), +(p[1] * s).toFixed(1)]), flatarmal: +(Math.abs(fl / 2) / (pxm * pxm)).toFixed(1), x: +(c[0] * s).toFixed(1), y: +(c[1] * s).toFixed(1) }, k.alyktad ? { alyktad: true } : {}));
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
    const r1 = v => +(v * s).toFixed(1);
    const stigarUt = stigar.concat(alyktadir).map(k => Object.assign({ x0: r1(k.x0), y0: r1(k.y0), x1: r1(k.x1), y1: r1(k.y1), ass: k.ass, n: k.n, bil_m: k.bil_m, lengd_m: k.lengd_m, uti: k.uti, stadfest: k.stadfest },
      k.hringur ? { hringur: true, cx: r1(k.cx), cy: r1(k.cy) } : {},
      k.hornpunktar ? { horn: k.horn, trodur: k.trodur, hornpunktar: k.hornpunktar.map(p => [r1(p[0]), r1(p[1])]) } : {},
      k.alyktad ? { alyktad: true, alyktR: k.alyktR, fra: k.fra } : {}));
    return {
      utgafa: UTGAFA, kjallari, heil: !!heil, heildarsvaedi: heil, svaedi, stigar: stigarUt, herbergi: herb,
      talning: { kambar: kb.stigar.length, rist: kb.rist.length, herbergi: hb.n, hurdir: hb.hurdir.length, lyftur: hb.lyftur.length, svaedi: svaedi.length,
        stigahus: svaedi.filter(v => v.teg === 'stigahus').length, alyktad: svaedi.filter(v => v.alyktad).length, gangar: svaedi.filter(v => v.teg === 'gangur').length,
        hringstigar: kb.stigar.filter(k => k.hringur).length, skastigar: kb.stigar.filter(k => k.hornpunktar).length }
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
  // haedir: [{ lykill (blað + skurður), pxmSrc (dílar skornu myndarinnar á metra), R, nafn, textar, endurRasti? }].
  // endurRasti(pxm) → nýr rasti sömu myndar með öðrum kvarða (383: TS.rasti(stig1, pxm)) — notað ef kvarði blaðs stenst
  // ekki hin blöðin. Hæðir með sama lykil deila greiningunni (dæmigerð hæð: „2.–4. hæð").
  //
  // 1. STIGAR hvers blaðs: kambar (0/90°) + skástigar (ríkjandi skáhorn) + hringstigar.
  // 2. KVARÐI: grunnflötur blaðs (lengsta hlið hússins) borinn saman við hin blöðin. Ef ≥ 2 önnur blöð eru sammála og
  //    þetta er < 0,62 eða > 1,6 af þeim (Þverholt 24: kjallarinn í 1:200 á blaði sem var lesið sem 1:100) er blaðið
  //    lesið aftur á leiðréttum kvarða — og leiðréttingin heldur aðeins ef stigi blaðsins finnur samsvörun annars staðar.
  // 3. STAÐFESTING: stigi á blaði A og samræmanlegur stigi á blaði B (sama stefna / báðir hringstigar, svipuð breidd)
  //    þar sem VEGGIRNIR Í KRING (3,6 m, stiginn sjálfur undanskilinn) passa saman — samsvorun() ≥ SAMS. Eitt annað blað
  //    dugar. Staðbundið, svo álmur sem liggja ólíkt á tveimur blöðum (Asparfell) staðfestast hver fyrir sig.
  // 4. ÁLYKTUN: stigahús = keðja staðfestra stiga sem hliðrast eins og blöðin í heild. Finnist það á fleiri en helmingi
  //    hæðanna er það lagt til á hinum — á spáðum stað, aðeins ef veggirnir þar passa og staðurinn er innan hússins —
  //    merkt „ályktað" (ekki staðfest: 383 staflar ekki eftir því).
  const SAMS = 0.36, SAMS_STUTT = 0.5;   // kvarðað 08.10.2026 á 7 húsum: falskt par hæst 0,347 (stuttir 0,48)
  function midjaStiga(k) { return k.hringur ? [k.cx, k.cy] : k.hornpunktar ? [k.hornpunktar.reduce((v, p) => v + p[0], 0) / 4, k.hornpunktar.reduce((v, p) => v + p[1], 0) / 4] : [(k.x0 + k.x1) / 2, (k.y0 + k.y1) / 2]; }
  function innanMarghyrnings(poly, x, y) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if (((yi > y) !== (yj > y)) && x < (xj - xi) * (y - yi) / (yj - yi || 1e-9) + xi) c = !c; } return c; }
  // LJÓSAR LÍNUR (Bríetartún: þrepin ljósgrá ~205 á 240, veggir svartir; Þverholt-kjallari 200 á 213): staðbundinn
  // bakgrunnur = hámark í 0,25 m glugga, lína = díll sem er ≥ max(12, 3 × miðgildi) dekkri en bakgrunnurinn hjá sér.
  // Óháð heildarbirtu blaðsins, svo ljós lína á hvítu og dauf lína á gráu finnast eins.
  function ljosRasti(R) {
    if (R._ljos !== undefined) return R._ljos;
    const W = R.W, H = R.H, g = R.g, r = 5, t = new Uint8Array(W * H), B = new Uint8Array(W * H);
    // hámark í glugga 2r+1 eftir línu (van Herk / Gil-Werman: forskeyti og viðskeyti í blokkum — 3 aðgerðir á díl)
    const k = 2 * r + 1, L = Math.max(W, H) + 2 * k, f = new Uint8Array(L), b = new Uint8Array(L), v = new Uint8Array(L);
    // ein lína: inn[o + i·skref] → ut[o + i·skref], i < n (engin föll á díl — 3× hraðara en með les/skrifa-föllum)
    const hamark = (inn, ut, o, skref, n) => {
      const m = n + 2 * r;
      for (let i = 0; i < m; i++) v[i] = (i < r || i >= n + r) ? 0 : inn[o + (i - r) * skref];
      for (let i = 0; i < m; i++) f[i] = i % k === 0 ? v[i] : (f[i - 1] > v[i] ? f[i - 1] : v[i]);
      for (let i = m - 1; i >= 0; i--) b[i] = (i === m - 1 || (i + 1) % k === 0) ? v[i] : (b[i + 1] > v[i] ? b[i + 1] : v[i]);
      for (let i = 0; i < n; i++) { const p = b[i], q = f[i + 2 * r]; ut[o + i * skref] = p > q ? p : q; }
    };
    for (let y = 0; y < H; y++) hamark(g, t, y * W, 1, W);
    for (let x = 0; x < W; x++) hamark(t, B, x, W, H);
    const h = new Uint32Array(256); let n = 0;
    for (let i = 0; i < W * H; i += 3) { h[B[i] - g[i]]++; n++; }
    let c = 0, med = 0; for (let v = 0; v < 256; v++) { c += h[v]; if (c >= n / 2) { med = v; break; } }
    const mork = Math.max(12, 3 * med), ut = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) ut[i] = B[i] - g[i] >= mork ? 0 : 255;
    R._ljos = { g: ut, W, H, s: R.s, _hist: { blek: 0, bak: 255, svarthvitt: true }, _linuthykkt: linuthykkt(R) };
    return R._ljos;
  }
  function stigarBlads(R) {
    const kb = kambar(R, { medStuttum: true });
    const baeta = k => { if (!kb.stigar.some(q => q.ass === k.ass && Math.min(q.x1, k.x1) > Math.max(q.x0, k.x0) && Math.min(q.y1, k.y1) > Math.max(q.y0, k.y0))) kb.stigar.push(k); };
    try { if (!hist(R).svarthvitt) kambar(ljosRasti(R), { gildi: 128 }).stigar.forEach(baeta); } catch (_) {}
    // mjóir stigar (0,6–0,75 m þrep) úr sömu blekgrímum — bætast við síðast, merktir stutt
    (kb.stutt || []).forEach(k => baeta(Object.assign(k, { stutt: true })));
    let ska = [], hr = [];
    try { ska = skakambar(R); } catch (_) {}
    try { hr = hringstigar(R); } catch (_) {}
    return { stigar: kb.stigar.concat(ska, hr), rist: kb.rist };
  }
  function samraemanleg(a, b) {
    if (!!a.hringur !== !!b.hringur) return false;
    if (a.hringur) return true;
    if (a.ass !== b.ass) {
      if (a.horn == null || b.horn == null) return false;
      const d = Math.abs(a.horn - b.horn) % 180; if (Math.min(d, 180 - d) > 6) return false;
    }
    return Math.min(a.lengd_m, b.lengd_m) >= 0.5 * Math.max(a.lengd_m, b.lengd_m);   // önnur hæðin mælir oft báða arma (Vegamótastígur 2,35 / 1,4 m)
  }
  // lengsta hlið grunnflatar hússins (metrar)
  function lengdHuss(b) {
    const hb = b.hb, W = hb.W, H = hb.H; let x0 = W, x1 = -1, y0 = H, y1 = -1;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (hb.hus[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? 0 : Math.max(x1 - x0, y1 - y0) * b.R.s / b.pxm;
  }
  // Rafall: skilar framvindutexta á milli þrepa (greinaHusBid leyfir vafranum að anda á milli), lokagildið = niðurstaðan.
  function* greinaHusSkref(haedir) {
    const blod = [], blI = new Map();
    haedir.forEach((h, i) => {
      if (!blI.has(h.lykill)) { blI.set(h.lykill, blod.length); blod.push({ lykill: h.lykill, R: h.R, pxm: h.pxmSrc, pxm0: h.pxmSrc, endurRasti: h.endurRasti, haedir: [] }); }
      blod[blI.get(h.lykill)].haedir.push(i);
    });
    const lesaBlad = b => { b.kb = stigarBlads(b.R); b.hb = herbergi(b.R, b.kb); b.R._D = null; };
    for (let i = 0; i < blod.length; i++) {
      yield 'Greini stiga — blað ' + (i + 1) + '/' + blod.length + '…';
      const b = blod[i]; b.kb = stigarBlads(b.R);
      yield 'Greini herbergi — blað ' + (i + 1) + '/' + blod.length + '…';
      b.hb = herbergi(b.R, b.kb); b.R._D = null;
    }
    const mR = b => b.R.s / b.pxm;                        // metrar á reit rastans
    // gluggi stigans k á blaði b: miðja + kassar allra stiga blaðsins innan 5 m (þeir eru undanskildir í samsvorun)
    const ass = (b, k) => { const c = midjaStiga(k), r = 5 * PXM; return { cx: c[0], cy: c[1], kassi: [k.x0, k.y0, k.x1, k.y1], kassar: b.kb.stigar.filter(q => q !== k && q.x1 > c[0] - r && q.x0 < c[0] + r && q.y1 > c[1] - r && q.y0 < c[1] + r).map(q => [q.x0, q.y0, q.x1, q.y1]) }; };
    // samsvaranir stiga milli tveggja blaða
    const paraBlod = (i, j) => {
      const A = blod[i], B = blod[j], ut = [];
      A.kb.stigar.forEach((a, ka) => B.kb.stigar.forEach((b, kb2) => {
        if (!samraemanleg(a, b)) return;
        const pa = ass(A, a), pb = ass(B, b);
        const q = samsvorun(A.R, pa, B.R, pb, 1.2);
        if (q.r < ((a.stutt || b.stutt) ? SAMS_STUTT : SAMS)) return;
        ut.push({ i, ka, j, kb: kb2, r: q.r, t: [(pb.cx + q.dx) * mR(B) - pa.cx * mR(A), (pb.cy + q.dy) * mR(B) - pa.cy * mR(A)] });
      }));
      return ut;
    };
    // 2. samsvaranir allra blaðapara
    const paraM = new Map();
    const paraAllt = () => { const ut = []; paraM.forEach(v => ut.push(...v)); return ut; };
    for (let i = 0; i < blod.length; i++) { for (let j = i + 1; j < blod.length; j++) paraM.set(i + ',' + j, paraBlod(i, j)); yield 'Stigar bornir saman milli hæða…'; }
    const einBlad = blod.length < 2;
    let stf, sfB;
    const stadfesta = () => {
      stf = blod.map(b => b.kb.stigar.map(() => new Set()));
      paraAllt().forEach(p => { stf[p.i][p.ka].add(p.j); stf[p.j][p.kb].add(p.i); });
      sfB = blod.map((b, i) => b.kb.stigar.map((k, q) => einBlad ? (k.hringur ? k.n >= 8 : k.n >= 6 && !k.stutt) : stf[i][q].size >= 1));
    };
    stadfesta();
    const ansvorun = i => sfB[i].some(v => v);
    // 3. KVARÐI: blað sem fékk ENGA samsvörun og sker sig úr grunnflatarmáli hinna er lesið aftur á kvarða sem passar —
    //    Þverholt 24: kjallarinn í 1:200 lesinn sem 1:100 (húsið hálft); Bríetartún: 1. hæð smækkuð PDF-prentun (A4 í stað
    //    A1, húsið þriðjungur). Grunnflöturinn gefur kvarðann aðeins gróft (byggingarnar eru ekki eins á öllum hæðum), svo
    //    reynt er ×1, ×1,12 og ×1,25 af hlutfallinu; leiðréttingin heldur aðeins ef blaðið finnur þá samsvörun (besta Σr).
    //    Tvö blöð: það með minni grunnflöt er grunað (smækkuð prentun er algengari en stækkuð).
    const L = blod.map(lengdHuss);
    const reynaKvarda = (i, r0) => {
      const b = blod[i];
      if (!b.endurRasti) return;
      const gamalt = { R: b.R, pxm: b.pxm, kb: b.kb, hb: b.hb }, gomulPor = new Map(paraM);
      let best = null;
      for (const f of [1, 1.12, 1.25]) {
        const r = r0 < 1 ? r0 / f : r0 * f;
        let R2 = null;
        try { R2 = b.endurRasti(gamalt.pxm * r); } catch (_) { R2 = null; }
        if (!R2 || !R2.g) continue;
        Object.assign(b, { R: R2, pxm: gamalt.pxm * r });
        b.kb = stigarBlads(b.R); b.R._D = null;          // herbergi aðeins fyrir þann kvarða sem vinnur (dýrt á stækkuðum rasta)
        const nyju = new Map(); let sr = 0;
        blod.forEach((c, j) => { if (j === i) return; const k = Math.min(i, j) + ',' + Math.max(i, j), v = paraBlod(Math.min(i, j), Math.max(i, j)); nyju.set(k, v); v.forEach(p => { sr += p.r; }); });
        if (sr > 0 && (!best || sr > best.sr)) best = { sr, r, R: b.R, pxm: b.pxm, kb: b.kb, nyju };
      }
      if (best) { Object.assign(b, { R: best.R, pxm: best.pxm, kb: best.kb, kvardi: +(1 / best.r).toFixed(3) }); b.hb = herbergi(b.R, b.kb); best.nyju.forEach((v, k) => paraM.set(k, v)); }
      else { Object.assign(b, gamalt, { kvardiHafnad: +(1 / r0).toFixed(3) }); paraM.clear(); gomulPor.forEach((v, k) => paraM.set(k, v)); }
      stadfesta();
    };
    if (blod.length >= 3) {
      blod.forEach((b, i) => {
        if (!L[i] || ansvorun(i)) return;
        const adrir = L.filter((v, j) => j !== i && v > 0).sort((p, q) => p - q);
        if (adrir.length < 2) return;
        const med = adrir[adrir.length >> 1];
        if (!adrir.every(v => Math.abs(v / med - 1) <= 0.25)) return;
        const r = L[i] / med;
        if (r < 0.62 || r > 1.6) reynaKvarda(i, r);
      });
    } else if (blod.length === 2 && L[0] && L[1] && !ansvorun(0) && !ansvorun(1)) {
      const i = L[0] < L[1] ? 0 : 1, r = L[i] / L[1 - i];
      if (r < 0.62) reynaKvarda(i, r);
    }
    // 4. staðfesting
    const para = paraAllt();
    // hliðrun milli blaða: stærsti klasi (1 m) staðfestra para; jafnt → styst
    const T = new Map();
    for (let i = 0; i < blod.length; i++) for (let j = i + 1; j < blod.length; j++) {
      const pp = para.filter(p => p.i === i && p.j === j);
      let best = null;
      pp.forEach(p => {
        const kl = pp.filter(q => Math.hypot(q.t[0] - p.t[0], q.t[1] - p.t[1]) <= 1.0);
        const n = new Set(kl.map(q => q.ka)).size, L = Math.hypot(p.t[0], p.t[1]);
        if (!best || n > best.n || (n === best.n && L < best.L)) best = { n, L, t: [kl.reduce((v, q) => v + q.t[0], 0) / kl.length, kl.reduce((v, q) => v + q.t[1], 0) / kl.length] };
      });
      if (best) { T.set(i + ',' + j, { n: best.n, t: best.t }); T.set(j + ',' + i, { n: best.n, t: [-best.t[0], -best.t[1]] }); }
    }
    // 5. ályktun: keðjur staðfestra stiga sem fylgja hliðrun blaðanna (±1,5 m). Staðurinn á hinni hæðinni verður að
    //    passa (veggir í kring, r ≥ SAMS_A) og vera innan hússins.
    const SAMS_A = 0.45;
    const alyktadir = blod.map(() => []);
    if (blod.length >= 2 && haedir.length >= 3) {
      const lykS = (i, k) => i + ':' + k, fadir = new Map();
      const finna = x => { while (fadir.has(x) && fadir.get(x) !== x) x = fadir.get(x); return x; };
      const sam = (a, b) => { const ra = finna(a), rb = finna(b); if (ra !== rb) fadir.set(ra, rb); };
      blod.forEach((b, i) => b.kb.stigar.forEach((k, q) => { if (sfB[i][q]) fadir.set(lykS(i, q), lykS(i, q)); }));
      para.forEach(p => {
        if (p.r < SAMS_A) return;                 // keðjan aðeins úr sterkum pörum — veikt falskt par má ekki dreifa sér
        const tt = T.get(p.i + ',' + p.j); if (!tt) return;
        if (Math.hypot(p.t[0] - tt.t[0], p.t[1] - tt.t[1]) > 1.5) return;
        sam(lykS(p.i, p.ka), lykS(p.j, p.kb));
      });
      const kedjur = new Map();
      fadir.forEach((v, x) => { const r = finna(x); if (!kedjur.has(r)) kedjur.set(r, []); kedjur.get(r).push(x.split(':').map(Number)); });
      kedjur.forEach(medl => {
        const bS = new Set(medl.map(m => m[0])), haedaF = [...bS].reduce((v, i) => v + blod[i].haedir.length, 0);
        if (bS.size < 2) return;
        // flestar hæðir — eða hæð MILLI tveggja hæða þar sem stigahúsið fannst (stigi sleppir ekki hæð: Þverholt 24,
        // stigahús 32 fannst á 2. og 4. hæð, ekki 3.)
        const hI = [...bS].reduce((v, i) => v.concat(blod[i].haedir), []), lagst = Math.min(...hI), haest = Math.max(...hI);
        const meirihluti = haedaF * 2 > haedir.length;
        blod.forEach((K, k) => {
          if (bS.has(k)) return;
          if (!meirihluti && !K.haedir.some(h => h > lagst && h < haest)) return;
          // besta uppspretta: meðlimur með hliðrun að þessu blaði (flest pör)
          let upp = null;
          medl.forEach(([i, q]) => { const tt = T.get(i + ',' + k); if (tt && (!upp || tt.n > upp.tt.n)) upp = { i, q, tt }; });
          // engin hliðrun að þessu blaði (enginn annar stigi parast við það): sama staðsetning á blaðinu, víðari leit (±2,5 m)
          if (!upp) upp = { i: medl[0][0], q: medl[0][1], tt: { n: 0, t: [0, 0], giskud: true } };
          const A = blod[upp.i], a = A.kb.stigar[upp.q], pa = ass(A, a), mA = mR(A), mK = mR(K);
          const px = (pa.cx * mA + upp.tt.t[0]) / mK, py = (pa.cy * mA + upp.tt.t[1]) / mK;
          if (px < 0 || py < 0 || px >= K.R.W || py >= K.R.H) return;
          // óstaðfestur stigi sömu gerðar á spáða staðnum (≤ 2 m): keðjan staðfestir hann (Þverholt 24, 3. hæð — ljósari
          // prentun, veggirnir í kring mældust ekki nógu líkir en þrepin fundust)
          const ostadf = K.kb.stigar.findIndex((s2, q2) => !sfB[k][q2] && !s2.stutt && samraemanleg(a, s2) && Math.hypot(midjaStiga(s2)[0] - px, midjaStiga(s2)[1] - py) * mK <= 2.0);
          if (ostadf >= 0) { sfB[k][ostadf] = true; (K.afKedju = K.afKedju || new Set()).add(ostadf); return; }
          const q = samsvorun(A.R, pa, K.R, { cx: px, cy: py }, upp.tt.giskud ? 2.5 : 1.0);
          if (q.r < SAMS_A) return;
          const nx = px + q.dx, ny = py + q.dy;
          if (!K.hb.hus[Math.round(ny) * K.R.W + Math.round(nx)]) return;
          // stigi (staðfestur) þegar á staðnum → ekkert ályktað
          if (K.kb.stigar.some((s2, q2) => sfB[k][q2] && Math.hypot(midjaStiga(s2)[0] - nx, midjaStiga(s2)[1] - ny) * mK < 2.5)) return;
          if (alyktadir[k].some(s2 => Math.hypot(midjaStiga(s2)[0] - nx, midjaStiga(s2)[1] - ny) * mK < 2.5)) return;
          const f = mA / mK, dx = nx - pa.cx * f, dy = ny - pa.cy * f, fl = (x, y) => [x * f + dx, y * f + dy];
          const n = Object.assign({}, a, { x0: a.x0 * f + dx, y0: a.y0 * f + dy, x1: a.x1 * f + dx, y1: a.y1 * f + dy, alyktad: true, fra: blod[upp.i].haedir[0], alyktR: +q.r.toFixed(3) });
          if (a.hringur) { n.cx = a.cx * f + dx; n.cy = a.cy * f + dy; }
          if (a.hornpunktar) n.hornpunktar = a.hornpunktar.map(p => fl(p[0], p[1]));
          alyktadir[k].push(n);
        });
      });
    }
    // 5. hæðirnar
    const nidur = new Map(), ut = [];
    for (const h of haedir) {
      const bi = blI.get(h.lykill), b = blod[bi];
      const lyk = h.lykill + '|' + (h.nafn || '');
      if (!nidur.has(lyk)) { yield 'Sameign — ' + (h.nafn || 'hæð') + '…'; nidur.set(lyk, greinaHaed({ R: b.R, nafn: h.nafn, textar: h.textar, stadfest: sfB[bi], kb: b.kb, hb: b.hb, alyktadir: alyktadir[bi] })); }
      ut.push(Object.assign({}, nidur.get(lyk), { stadfestingar: stf[bi].map(st => st.size), pxm: b.pxm }, b.kvardi ? { kvardi: b.kvardi } : {}));
    }
    // hliðranir milli aðliggjandi hæða (metrar skornu myndanna) — fyrir 383 og prófin
    const hlidranir = [];
    for (let i = 0; i + 1 < haedir.length; i++) {
      const a = blI.get(haedir[i].lykill), c = blI.get(haedir[i + 1].lykill);
      const tt = a === c ? { n: blod[a].kb.stigar.length, t: [0, 0] } : (T.get(a + ',' + c) || { n: 0, t: [0, 0] });
      hlidranir.push({ fra: i, til: i + 1, n: tt.n, t: [+tt.t[0].toFixed(3), +tt.t[1].toFixed(3)], samaBlad: a === c });
    }
    return { haedir: ut, hlidranir, blod: blod.length, lengdir: L.map(v => +v.toFixed(1)), kvardar: blod.map(b => b.kvardi || (b.kvardiHafnad ? -b.kvardiHafnad : 1)) };
  }
  function greinaHus(haedir) { const g = greinaHusSkref(haedir); let r = g.next(); while (!r.done) r = g.next(); return r.value; }
  // Sama og greinaHus en gefur vafranum færi á milli þrepa (stórt hús: tugir sekúndna í einni lotu frysti síðuna)
  async function greinaHusBid(haedir, framvinda) {
    const g = greinaHusSkref(haedir); let r = g.next();
    while (!r.done) { if (framvinda && r.value) { try { framvinda(r.value); } catch (_) {} } await new Promise(f => setTimeout(f, 0)); r = g.next(); }
    return r.value;
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
      // ályktað stigahús (fannst á öðrum hæðum, ekki þessari): strikalína
      ctx.lineWidth = 2; ctx.strokeStyle = LITUR.brun; ctx.setLineDash(v.teg === 'kjallari' ? [8, 6] : v.alyktad ? [5, 4] : []); ctx.stroke(); ctx.setLineDash([]);
    });
    // stigar: þrepin undirstrikuð (hringstigi: hringur um súluna · skástigi: þrep samsíða hornpunktunum)
    (res.stigar || []).forEach(k => {
      if (k.uti || !k.stadfest) return;
      const n = Math.max(2, k.n);
      ctx.strokeStyle = 'rgba(150,100,10,.85)'; ctx.lineWidth = 1.6; ctx.beginPath();
      if (k.hringur) {
        const c = P(k.cx, k.cy), e = P(k.cx + (k.x1 - k.x0) * 0.42, k.cy), r = Math.hypot(e[0] - c[0], e[1] - c[1]);
        ctx.arc(c[0], c[1], r, 0, 2 * Math.PI); ctx.moveTo(c[0] + r * 0.35, c[1]); ctx.arc(c[0], c[1], r * 0.35, 0, 2 * Math.PI);
        ctx.stroke(); return;
      }
      if (k.hornpunktar) {
        const h = k.hornpunktar, A = k.trodur === 'x' ? [h[0], h[1], h[3], h[2]] : [h[0], h[3], h[1], h[2]];
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1), a = P(A[0][0] + (A[2][0] - A[0][0]) * t, A[0][1] + (A[2][1] - A[0][1]) * t), b = P(A[1][0] + (A[3][0] - A[1][0]) * t, A[1][1] + (A[3][1] - A[1][1]) * t);
          ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        }
        ctx.stroke(); return;
      }
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
      const t = (HEITI[v.teg] || 'Sameign') + (v.alyktad ? ' (ályktað)' : '');
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

  W0.TeiknSameign = { PXM, UTGAFA, flokkur, rasti, smaekka, vikkaM, lokaM, butar, kambarAs, kambar, rikjandiHorn, snuinnRasti, skakambar, hringstigar, stigarBlads, ljosRasti, midjaStiga, samraemanleg, thettleiki, samsvorun, herbergi, utlina, hlidrun, greinaHaed, greinaHus, greinaHusBid, teikna, iSameign, LITUR: LITUR0 };
})();
