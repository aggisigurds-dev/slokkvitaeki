/* === TEIKNING: HÆÐIR · SKURÐUR · VEGGIR · SKÝRARI VEGGIR · 3D (383) ==========
 *
 * Agnar 20.09.2026: „wanted to get more usable floorplans for teikningar but register the
 * fire extinguishers" · „nota skýrari veggja pælinguna og 3d view" · „plana hvernig sé best að
 * gera þetta svo þetta sé nokkuð fjölbreytilega nothæft".
 *
 * TVÆR SJÁLFSTÆÐAR EININGAR (vita ekkert um gluggann — nýtanlegar annars staðar síðar):
 *
 *   TeiknHreinsun.hreinsaGogn(gra, W, H, o)  → { veggir, fotspor, thekja }      HREIN gagnavinnsla
 *   TeiknHreinsun.hreinsa(mynd, o)           → { strigi, vinnu, veggir, W, H, kvardi, thekja }
 *   Teikn3D.syna(gamur, { haedir:[{ veggir, W, H, golf, merki }] })  → { loka() }
 *
 * AÐFERÐIN (engin gervigreind, keyrir í vafranum á ~1 sek):
 *   veggur = DÖKKT og ÞYKKT. Blek-gríma (grátt < `dokkt`) er OPNUÐ með ferningi (radíus `thykkt`) —
 *   það þurrkar út allt sem er mjórra en veggur: málsetningar, texta, skástrikun, hurðaboga.
 *   Stórir heilir flekkir (nágrannahús, fylltir fletir) eru fjarlægðir, og smáagnir líka.
 *   Fótspor hússins = allt sem flóðfylling utan frá nær EKKI í eftir að veggjanetinu er lokað.
 *   `fylla` lokar fyrst mjóum rifum svo veggir teiknaðir sem TVÆR línur verði heilir.
 *
 * MERKIN HALDA SÉR: hreina myndin er teiknuð í SÖMU punktastærð og frummyndin, og merki eru geymd
 * í punktum frummyndar (375). Frummyndin er ALDREI yfirskrifuð — plan.imageUrl er ósnert, svo
 * Vista geymir áfram upprunalegu slóðina. Hvort hreinsun er á, og stillingar hennar, er útlitsval
 * vafrans per fyrirtæki (localStorage `teikn_hreinsun_<id>`) — ekki staða gagna.
 *
 * Skoðað og EKKI notað: Yytsi/floorplan-to-3d (ResNet-UNet á CubiCasa5K) — keyrir á 512×512 og
 * tekur hreinar SVG-íbúðateikningar; A0-uppdráttur á 6000 px verður þar að graut, og gagnasafnið
 * er CC BY-NC. Hugmyndin um að lyfta grímunni upp í three.js er sú sama og þar.
 * ========================================================================== */
(() => {
  if (window.__teiknHreinsa3d) return;
  window.__teiknHreinsa3d = true;

  /* ───────────────────────── 1) HREINSUN — hrein gagnavinnsla ───────────────────────── */

  // Summutafla (integral image) yfir 0/1-grímu: kassasumma í O(1) → formfræði (erode/dilate) í O(W·H)
  // óháð radíus. Án þessa tæki 31×31 opnun á 2200 px mynd margar sekúndur.
  function summutafla(b, W, H) {
    const S = new Int32Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) {
      let rod = 0;
      const o = (y + 1) * (W + 1), u = y * (W + 1), r = y * W;
      for (let x = 0; x < W; x++) { rod += b[r + x]; S[o + x + 1] = S[u + x + 1] + rod; }
    }
    return S;
  }
  // fullt=true → erode (allur glugginn þarf að vera 1) · fullt=false → dilate (eitthvað í glugganum).
  function kassi(b, W, H, r, fullt) {
    if (r <= 0) return b;
    const S = summutafla(b, W, H), ut = new Uint8Array(W * H), W1 = W + 1;
    for (let y = 0; y < H; y++) {
      const y0 = Math.max(0, y - r), y1 = Math.min(H, y + r + 1);
      for (let x = 0; x < W; x++) {
        const x0 = Math.max(0, x - r), x1 = Math.min(W, x + r + 1);
        const s = S[y1 * W1 + x1] - S[y0 * W1 + x1] - S[y1 * W1 + x0] + S[y0 * W1 + x0];
        // Við brún er glugginn klipptur: erode miðar við ÓKLIPPTAN glugga, svo brúnin étst (rammar hverfa).
        ut[y * W + x] = fullt ? (s === (2 * r + 1) * (2 * r + 1) ? 1 : 0) : (s > 0 ? 1 : 0);
      }
    }
    return ut;
  }
  const erode = (b, W, H, r) => kassi(b, W, H, r, true);
  const dilate = (b, W, H, r) => kassi(b, W, H, r, false);

  // Samhangandi svæði (8-tengd) með stafla — skilar merkjum og kössum. Engin endurkvæmni (staflinn springur).
  function svaedi(b, W, H) {
    const merki = new Int32Array(W * H), listi = [];
    const stafli = new Int32Array(W * H);
    let n = 0;
    for (let i = 0; i < W * H; i++) {
      if (!b[i] || merki[i]) continue;
      n++;
      let top = 0, flat = 0, x0 = W, x1 = 0, y0 = H, y1 = 0;
      stafli[top++] = i; merki[i] = n;
      while (top) {
        const p = stafli[--top], px = p % W, py = (p - px) / W;
        flat++;
        if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = py + dy; if (ny < 0 || ny >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx; if (nx < 0 || nx >= W) continue;
            const q = ny * W + nx;
            if (b[q] && !merki[q]) { merki[q] = n; stafli[top++] = q; }
          }
        }
      }
      listi.push({ n, flat, b: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
    return { merki, listi };
  }

  /** gra: Uint8Array grátóna (0 svart – 255 hvítt), W×H. Skilar grímum í sömu stærð. */
  function hreinsaGogn(gra, W, H, o) {
    o = o || {};
    const dokkt = o.dokkt || 185;
    const r = Math.max(1, o.thykkt || Math.round(W / 1000));
    let blek = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) blek[i] = gra[i] < dokkt ? 1 : 0;
    // Tvöfaldir veggir: loka rifunni Á MILLI línanna áður en þunnt er þurrkað út.
    if (o.fylla) { const f = r + 2; blek = erode(dilate(blek, W, H, f), W, H, f); }
    let v = dilate(erode(blek, W, H, r), W, H, r);                         // opnun: þunnt hverfur
    v = erode(dilate(v, W, H, r + 1), W, H, r + 1);                        // lokun: göt í veggjum gróa
    // Heilir flekkir lifa af risa-opnun; alvöru veggir gera það aldrei.
    const R = Math.max(r + 4, Math.round(W / 140));
    const flekkir = dilate(dilate(erode(v, W, H, R), W, H, R), W, H, 4);
    for (let i = 0; i < W * H; i++) if (flekkir[i]) v[i] = 0;
    // Smáagnir (stafir sem lifðu af, punktar, örvar).
    const sv = svaedi(v, W, H), lagm = Math.round(W / 54), lagmFlat = Math.round((W / 170) * (W / 170));
    const halda = new Uint8Array(sv.listi.length + 1);
    sv.listi.forEach(s => { if (s.flat >= lagmFlat && Math.max(s.b, s.h) >= lagm) halda[s.n] = 1; });
    let fjoldi = 0;
    for (let i = 0; i < W * H; i++) { if (v[i] && !halda[sv.merki[i]]) v[i] = 0; if (v[i]) fjoldi++; }
    // Fótspor: loka veggjanetinu gróft, flóðfylla utan frá; það sem næst ekki í er inni í húsinu.
    const Rf = Math.max(6, Math.round(W / 70));
    const lokad = erode(dilate(v, W, H, Rf), W, H, Rf);
    const uti = new Uint8Array(W * H), st = new Int32Array(W * H);
    let top = 0;
    const yta = p => { if (!lokad[p] && !uti[p]) { uti[p] = 1; st[top++] = p; } };
    for (let x = 0; x < W; x++) { yta(x); yta((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { yta(y * W); yta(y * W + W - 1); }
    while (top) {
      const p = st[--top], px = p % W, py = (p - px) / W;
      if (px > 0) yta(p - 1); if (px < W - 1) yta(p + 1); if (py > 0) yta(p - W); if (py < H - 1) yta(p + W);
    }
    const fotspor = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) fotspor[i] = uti[i] ? 0 : 1;
    return { veggir: v, fotspor, thekja: fjoldi / (W * H), thykkt: r };
  }

  /** mynd: <img> eða <canvas>. Skilar striga í SÖMU punktastærð og myndin (merkin halda hnitum). */
  function hreinsa(mynd, o) {
    o = o || {};
    const iw = mynd.naturalWidth || mynd.width, ih = mynd.naturalHeight || mynd.height;
    const kvardi = Math.min(1, (o.vinnuPx || 2200) / Math.max(iw, ih));
    const W = Math.max(1, Math.round(iw * kvardi)), H = Math.max(1, Math.round(ih * kvardi));
    const vinnu = document.createElement('canvas'); vinnu.width = W; vinnu.height = H;
    const vc = vinnu.getContext('2d', { willReadFrequently: true });
    vc.fillStyle = '#fff'; vc.fillRect(0, 0, W, H);
    vc.imageSmoothingEnabled = true; vc.imageSmoothingQuality = 'high';
    vc.drawImage(mynd, 0, 0, W, H);
    const d = vc.getImageData(0, 0, W, H), px = d.data, gra = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < W * H; i++, j += 4) gra[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8;
    const g = hreinsaGogn(gra, W, H, o);
    // Of lítið fannst → ekki þykjast: kallarinn fær að vita og sýnir frummyndina áfram.
    const naerVegg = dilate(g.veggir, W, H, 2);
    // Fá veggir fundust (þunnlínu-CAD): fótsporið er þá götótt og „bara veggir" skildi eftir nær auða mynd.
    // Þá er frummyndin DEYFÐ í stað þess að hverfa, og veggirnir sem fundust dregnir fram ofan á henni.
    const mjukt = g.thekja < 0.02;
    for (let i = 0, j = 0; i < W * H; i++, j += 4) {
      if (mjukt) {
        const l = g.veggir[i] ? 34 : 255 - Math.round((255 - gra[i]) * 0.5);
        px[j] = l; px[j + 1] = l; px[j + 2] = l; px[j + 3] = 255;
        continue;
      }
      let R = 255, G = 255, B = 255;
      if (g.fotspor[i]) { R = 246; G = 243; B = 237; }
      if (g.fotspor[i] && !naerVegg[i] && gra[i] < 150) { R = 178; G = 172; B = 162; }   // hurðir, stigar, heiti — dauft
      if (g.veggir[i]) { R = 38; G = 34; B = 30; }
      px[j] = R; px[j + 1] = G; px[j + 2] = B; px[j + 3] = 255;
    }
    vc.putImageData(d, 0, 0);
    const strigi = document.createElement('canvas'); strigi.width = iw; strigi.height = ih;
    const sc = strigi.getContext('2d');
    sc.imageSmoothingEnabled = true; sc.imageSmoothingQuality = 'high';
    sc.drawImage(vinnu, 0, 0, iw, ih);
    return { strigi, vinnu, veggir: g.veggir, fotspor: g.fotspor, W, H, kvardi, thekja: g.thekja, thykkt: g.thykkt };
  }

  /** Hvar er HÚSIÐ á blaðinu? Skilar { x, y, w, h } í hlutföllum (0–1) eða null.
   * Blaðið er oft margfalt stærra en grunnmyndin (rammi, nafnreitur, skýringar, afstöðumynd). Aðferð, á ~640 px smækkun
   * (lágmark í hverjum reit svo þunnar línur lifi): blek → rammalínur (raðir/dálkar sem eru blek að >55%) teknar út →
   * blekið þanið saman í klasa → stærsti klasinn að FLATARMÁLI BLEKS er húsið. Nafnreitur og skýringar eru minni klasar. */
  function finnaHus(gra, W, H) {
    const k = Math.max(1, Math.ceil(Math.max(W, H) / 640)), w = Math.ceil(W / k), h = Math.ceil(H / k);
    const b = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let m = 255;
      for (let yy = y * k; yy < Math.min(H, (y + 1) * k); yy++) for (let xx = x * k; xx < Math.min(W, (x + 1) * k); xx++) { const v = gra[yy * W + xx]; if (v < m) m = v; }
      b[y * w + x] = m < 150 ? 1 : 0;
    }
    for (let y = 0; y < h; y++) { let n = 0; for (let x = 0; x < w; x++) n += b[y * w + x]; if (n > w * 0.55) for (let x = 0; x < w; x++) b[y * w + x] = 0; }
    for (let x = 0; x < w; x++) { let n = 0; for (let y = 0; y < h; y++) n += b[y * w + x]; if (n > h * 0.55) for (let y = 0; y < h; y++) b[y * w + x] = 0; }
    const r = Math.max(3, Math.round(w / 55)), th = dilate(b, w, h, r), sv = svaedi(th, w, h);
    if (!sv.listi.length) return null;
    const blek = new Int32Array(sv.listi.length + 1), kassi = {};
    for (let i = 0; i < w * h; i++) {
      const n = sv.merki[i]; if (!n) continue;
      if (b[i]) blek[n]++;
      const x = i % w, y = (i - x) / w, q = kassi[n] || (kassi[n] = [x, y, x, y]);
      if (x < q[0]) q[0] = x; if (y < q[1]) q[1] = y; if (x > q[2]) q[2] = x; if (y > q[3]) q[3] = y;
    }
    let best = 0, bn = 0; for (let n = 1; n < blek.length; n++) if (blek[n] > bn) { bn = blek[n]; best = n; }
    if (!best) return null;
    const q = kassi[best], sp = Math.round(w * 0.015);
    const x0 = Math.max(0, q[0] + r - sp), y0 = Math.max(0, q[1] + r - sp), x1 = Math.min(w, q[2] - r + sp + 1), y1 = Math.min(h, q[3] - r + sp + 1);
    const ut = { x: x0 / w, y: y0 / h, w: (x1 - x0) / w, h: (y1 - y0) / h };
    // Nær allt blaðið, eða örlítill biti: þá er ekkert unnið með skurði — skila null frekar en að skera vitlaust.
    if (ut.w * ut.h > 0.8 || ut.w < 0.12 || ut.h < 0.12) return null;
    return ut;
  }

  /* ── veggir úr VIGUR-PDF ──
   * CAD-uppdráttur geymir hverja línu með þykkt. Mælt á Fiskislóð 41 (1. hæð, 22.000 slóðir): 0,24 pt = málsetning,
   * skástrikun og húsgögn · 0,48 pt = VEGGIR (allt netið, líka milliveggir) · 0,66 = málstrik · 0,96 = hnitakrossar ·
   * 1,38 = lóðarmörk (strikuð). Myndgreiningin fann 0,3% á sömu teikningu.
   * Skilar línuflokkum eftir þykkt, í hnitum síðunnar (pt, efra-vinstra horn = 0,0), og giskar á veggjaflokkinn:
   * mest samanlögð lengd LANGRA beinna strika (strikuð lína er mörg stutt strik og telst því ekki), með lágmarksfjölda
   * svo tvær rammalínur vinni ekki. Notandinn getur alltaf valið aðra flokka — þykktir eru ekki staðlaðar milli stofa.
   * Skilur bæði pdf.js 3.x (constructPath = [aðgerðir, hnit] + málun sér) og 5.x (málun inni í constructPath). */
  function flokkaPdfLinur(OPS, fnArray, argsArray, grunnur) {
    const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
    const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    const STROK = {}; ['stroke', 'closeStroke', 'fillStroke', 'eoFillStroke', 'closeFillStroke', 'closeEOFillStroke'].forEach(n => { if (OPS[n] != null) STROK[OPS[n]] = 1; });
    const MALUN = {}; ['stroke', 'closeStroke', 'fill', 'eoFill', 'fillStroke', 'eoFillStroke', 'closeFillStroke', 'closeEOFillStroke', 'endPath'].forEach(n => { if (OPS[n] != null) MALUN[OPS[n]] = 1; });
    let ctm = grunnur.slice(), lw = 1, bid = [];
    const stafli = [], flokkar = {};
    const skra = (b, strik) => { const l = b.toFixed(2); (flokkar[l] || (flokkar[l] = [])).push(...strik); };
    for (let i = 0; i < fnArray.length; i++) {
      const fn = fnArray[i], a = argsArray[i];
      if (fn === OPS.save) stafli.push([ctm.slice(), lw]);
      else if (fn === OPS.restore) { const t = stafli.pop(); if (t) { ctm = t[0]; lw = t[1]; } }
      else if (fn === OPS.transform) ctm = mul(ctm, a);
      else if (fn === OPS.setLineWidth) lw = a[0];
      else if (fn === OPS.constructPath) {
        const strik = []; let p = null, byrjun = null;
        const lina = (x, y) => { const q = ap(ctm, x, y); if (p) strik.push([p[0], p[1], q[0], q[1]]); p = q; };
        if (typeof a[0] === 'number') {                       // pdf.js 5.x
          const d = a[1] && a[1][0]; if (!d) continue;
          for (let j = 0; j < d.length;) {
            const op = d[j++];
            if (op === 0) { p = ap(ctm, d[j], d[j + 1]); byrjun = p; j += 2; }
            else if (op === 1) { lina(d[j], d[j + 1]); j += 2; }
            else if (op === 2) { p = ap(ctm, d[j + 4], d[j + 5]); j += 6; }
            else if (op === 3) { p = ap(ctm, d[j + 2], d[j + 3]); j += 4; }
            else if (op === 4) { if (p && byrjun) strik.push([p[0], p[1], byrjun[0], byrjun[1]]); p = byrjun; }
            else break;
          }
          if (STROK[a[0]]) { const kv = Math.sqrt(Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2])); skra(lw * kv, strik); }
        } else {                                              // pdf.js 3.x
          const ops = a[0], d = a[1]; let j = 0;
          for (let k = 0; k < ops.length; k++) {
            const op = ops[k];
            if (op === OPS.moveTo) { p = ap(ctm, d[j], d[j + 1]); byrjun = p; j += 2; }
            else if (op === OPS.lineTo) { lina(d[j], d[j + 1]); j += 2; }
            else if (op === OPS.curveTo) { p = ap(ctm, d[j + 4], d[j + 5]); j += 6; }
            else if (op === OPS.curveTo2 || op === OPS.curveTo3) { p = ap(ctm, d[j + 2], d[j + 3]); j += 4; }
            else if (op === OPS.closePath) { if (p && byrjun) strik.push([p[0], p[1], byrjun[0], byrjun[1]]); p = byrjun; }
            else if (op === OPS.rectangle) {
              const x = d[j], y = d[j + 1], w = d[j + 2], h = d[j + 3]; j += 4;
              const A = ap(ctm, x, y), B = ap(ctm, x + w, y), C = ap(ctm, x + w, y + h), D = ap(ctm, x, y + h);
              strik.push([A[0], A[1], B[0], B[1]], [B[0], B[1], C[0], C[1]], [C[0], C[1], D[0], D[1]], [D[0], D[1], A[0], A[1]]); p = A; byrjun = A;
            }
          }
          bid = bid.concat(strik);
        }
      } else if (MALUN[fn]) {                                 // 3.x: málunin kemur á eftir slóðinni
        if (bid.length && STROK[fn]) { const kv = Math.sqrt(Math.abs(ctm[0] * ctm[3] - ctm[1] * ctm[2])); skra(lw * kv, bid); }
        bid = [];
      }
    }
    return flokkar;
  }
  function veljaVeggjaflokk(flokkar, bladB, bladH) {
    const lagm = Math.max(bladB, bladH) * 0.004;                   // ~8 pt á A1: strikuð lína og örvar detta út
    let best = null, bestS = 0; const yfirlit = [];
    Object.keys(flokkar).forEach(l => {
      const b = +l, strik = flokkar[l]; let n = 0, lengd = 0;
      strik.forEach(v => { const d = Math.hypot(v[2] - v[0], v[3] - v[1]); if (d >= lagm) { n++; lengd += d; } });
      yfirlit.push({ breidd: l, strik: strik.length, long: n, lengd: Math.round(lengd) });
      if (b < 0.3 || n < 40) return;                               // hárlínur eru aldrei veggir; fá strik = rammi
      if (lengd > bestS) { bestS = lengd; best = l; }
    });
    yfirlit.sort((a, c) => c.lengd - a.lengd);
    return { valinn: best, yfirlit };
  }

  window.TeiknHreinsun = { hreinsaGogn, hreinsa, finnaHus, flokkaPdfLinur, veljaVeggjaflokk };

  /* ───────────────────────── 2) 3D-SÝN ───────────────────────── */

  const THREE_SLOD = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  let _threeBid = null;
  function saekjaThree() {
    if (window.THREE) return Promise.resolve();
    if (_threeBid) return _threeBid;
    _threeBid = new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = THREE_SLOD; s.onload = () => res();
      s.onerror = () => { _threeBid = null; rej(new Error('Náði ekki í three.js')); };
      document.head.appendChild(s);
    });
    return _threeBid;
  }

  // Gríma → fáir kassar: rist með ~420 reitum á lengri kant, samfelldar raðir sameinaðar lóðrétt.
  // 2200×1600 gríma gefur annars milljónir punkta; þetta gefur nokkur hundruð til fá þúsund kassa.
  function kassarUrGrimu(veggir, W, H) {
    const c = Math.max(1, Math.ceil(Math.max(W, H) / 420)), gw = Math.ceil(W / c), gh = Math.ceil(H / c);
    const rist = new Uint8Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) {
      let n = 0, t = 0;
      for (let y = gy * c; y < Math.min(H, (gy + 1) * c); y++) for (let x = gx * c; x < Math.min(W, (gx + 1) * c); x++) { t++; n += veggir[y * W + x]; }
      rist[gy * gw + gx] = n >= t * 0.35 ? 1 : 0;
    }
    const kassar = [], opnir = new Map();
    for (let gy = 0; gy <= gh; gy++) {
      const nu = new Map();
      if (gy < gh) for (let gx = 0; gx < gw;) {
        if (!rist[gy * gw + gx]) { gx++; continue; }
        let x1 = gx; while (x1 < gw && rist[gy * gw + x1]) x1++;
        const lykill = gx + ':' + x1, fyrri = opnir.get(lykill);
        if (fyrri) { fyrri.h++; nu.set(lykill, fyrri); opnir.delete(lykill); } else nu.set(lykill, { x: gx, y: gy, b: x1 - gx, h: 1 });
        gx = x1;
      }
      opnir.forEach(k => kassar.push(k));
      opnir.clear(); nu.forEach((k, l) => opnir.set(l, k));
    }
    return { kassar, c, gw, gh };
  }

  /** gamur: element sem sýnin fyllir. haedir: [{ veggir, W, H, golf:<canvas>, kvardi, merki:[{x,y,litur,texti}] }] (merki í punktum FRUMMYNDAR). */
  async function syna3d(gamur, gogn) {
    await saekjaThree();
    const T = window.THREE, haedir = (gogn && gogn.haedir) || [];
    if (!haedir.length) throw new Error('Engin hæð til að sýna');
    const b = gamur.clientWidth || 800, h = gamur.clientHeight || 500;
    const teiknari = new T.WebGLRenderer({ antialias: true, alpha: false });
    teiknari.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    teiknari.setSize(b, h); teiknari.setClearColor(0x14120f);
    teiknari.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
    gamur.appendChild(teiknari.domElement);
    const svid = new T.Scene();
    svid.add(new T.AmbientLight(0xffffff, 0.72));
    const sol = new T.DirectionalLight(0xffffff, 0.75); sol.position.set(0.6, 1.4, 0.9); svid.add(sol);
    const losa = [];
    let staerst = 1, haedY = 0, vidmid = null;
    haedir.forEach((hd, nr) => {
      const k = kassarUrGrimu(hd.veggir, hd.W, hd.H);
      staerst = Math.max(staerst, k.gw, k.gh);
      const veggH = Math.max(k.gw, k.gh) * 0.045, bil = veggH * 3.2;
      const hopur = new T.Group(); hopur.position.y = haedY; svid.add(hopur);
      // Hæðir úr SAMA teikningasetti (sama blaðstærð) raðast eftir stöðu sinni á blaðinu og í sama kvarða — annars
      // sveif álma á 2. hæð yfir miðju 1. hæðar og varð stærri en hún er (skurðirnir eru misstórir). `punktar` =
      // frummyndarpunktar á ristarreit. Ólík blöð: hæðin er miðjuð eins og áður.
      if (!hd.sk) hd.sk = { x: 0, y: 0, w: hd.W / hd.kvardi, h: hd.H / hd.kvardi };
      const punktar = k.c / hd.kvardi;
      if (nr === 0) vidmid = { punktar, mx: hd.sk.x + hd.sk.w / 2, my: hd.sk.y + hd.sk.h / 2, b: hd.frumB, h: hd.frumH };
      else if (vidmid && hd.frumB && Math.abs(hd.frumB - vidmid.b) < vidmid.b * 0.03 && Math.abs(hd.frumH - vidmid.h) < vidmid.h * 0.03) {
        const kv = punktar / vidmid.punktar;
        hopur.scale.set(kv, 1, kv);
        hopur.position.x = (hd.sk.x + hd.sk.w / 2 - vidmid.mx) / vidmid.punktar;
        hopur.position.z = (hd.sk.y + hd.sk.h / 2 - vidmid.my) / vidmid.punktar;
      }
      // Gólf: hreina myndin sem áferð, svo herbergjaskipan og heiti sjáist undir veggjunum.
      const golfStr = document.createElement('canvas');
      const gs = Math.min(1, 2048 / Math.max(hd.golf.width, hd.golf.height));
      golfStr.width = Math.max(1, Math.round(hd.golf.width * gs)); golfStr.height = Math.max(1, Math.round(hd.golf.height * gs));
      golfStr.getContext('2d').drawImage(hd.golf, 0, 0, golfStr.width, golfStr.height);
      const aferd = new T.CanvasTexture(golfStr); aferd.anisotropy = 4;
      // Efri hæðir fá hálfgagnsætt gólf — annars hylur efsta hæðin allar hinar þegar horft er ofan frá.
      const golfG = new T.PlaneGeometry(k.gw, k.gh), golfE = new T.MeshBasicMaterial({ map: aferd, side: T.DoubleSide, transparent: nr > 0, opacity: nr > 0 ? 0.42 : 1, depthWrite: nr === 0 });
      const golf = new T.Mesh(golfG, golfE); golf.rotation.x = -Math.PI / 2; hopur.add(golf);
      losa.push(golfG, golfE, aferd);
      // Veggir: eitt InstancedMesh — ein teiknikall fyrir alla kassana.
      const kG = new T.BoxGeometry(1, 1, 1), kE = new T.MeshLambertMaterial({ color: 0x4a443c });
      const veggir = new T.InstancedMesh(kG, kE, Math.max(1, k.kassar.length)), m = new T.Matrix4();
      k.kassar.forEach((r, i) => {
        m.makeScale(r.b, veggH, r.h);
        m.setPosition(r.x + r.b / 2 - k.gw / 2, veggH / 2, r.y + r.h / 2 - k.gh / 2);
        veggir.setMatrixAt(i, m);
      });
      veggir.count = k.kassar.length; veggir.instanceMatrix.needsUpdate = true; hopur.add(veggir);
      losa.push(kG, kE);
      // Merki: stöng + kúla + miði. Hnit merkja eru í punktum frummyndar → vinnupunktar (kvardi) → ristarreitir (c).
      (hd.merki || []).forEach(mk => {
        const gx = (mk.x * hd.kvardi) / k.c - k.gw / 2, gz = (mk.y * hd.kvardi) / k.c - k.gh / 2;
        const litur = new T.Color(mk.litur || '#c93c1d'), rad = Math.max(k.gw, k.gh) * 0.012;
        const sG = new T.CylinderGeometry(rad * 0.18, rad * 0.18, veggH * 1.5, 8), sE = new T.MeshLambertMaterial({ color: 0xf1ede4 });
        const stong = new T.Mesh(sG, sE); stong.position.set(gx, veggH * 0.75, gz); hopur.add(stong);
        const kG2 = new T.SphereGeometry(rad, 20, 14), kE2 = new T.MeshLambertMaterial({ color: litur, emissive: litur, emissiveIntensity: 0.35 });
        const kula = new T.Mesh(kG2, kE2); kula.position.set(gx, veggH * 1.5 + rad, gz); hopur.add(kula);
        losa.push(sG, sE, kG2, kE2);
        if (mk.texti) {
          const ms = document.createElement('canvas'); ms.width = 256; ms.height = 64;
          const mc = ms.getContext('2d'); mc.fillStyle = 'rgba(20,18,15,.88)'; mc.fillRect(0, 0, 256, 64);
          mc.fillStyle = '#fff'; mc.font = '600 30px system-ui,sans-serif'; mc.textAlign = 'center'; mc.textBaseline = 'middle';
          mc.fillText(String(mk.texti).slice(0, 14), 128, 33);
          const mA = new T.CanvasTexture(ms), mE = new T.SpriteMaterial({ map: mA, depthTest: false });
          const midi = new T.Sprite(mE); midi.scale.set(rad * 7, rad * 1.75, 1); midi.position.set(gx, veggH * 1.5 + rad * 3.4, gz); hopur.add(midi);
          losa.push(mA, mE);
        }
      });
      haedY += bil;
    });
    // Myndavél á braut um miðjuna: draga = snúa · hjól/klípa = aðdráttur · hægri/shift-draga eða tveir fingur = færa.
    const vel = new T.PerspectiveCamera(42, b / h, 0.1, staerst * 20);
    const mid = new T.Vector3(0, haedY / 3, 0);
    let theta = -0.6, phi = 0.95, fjarl = staerst * 1.25;
    function stillaVel() {
      phi = Math.min(1.5, Math.max(0.12, phi)); fjarl = Math.min(staerst * 6, Math.max(staerst * 0.12, fjarl));
      vel.position.set(mid.x + fjarl * Math.sin(phi) * Math.sin(theta), mid.y + fjarl * Math.cos(phi), mid.z + fjarl * Math.sin(phi) * Math.cos(theta));
      vel.lookAt(mid);
    }
    const el = teiknari.domElement, bendlar = new Map();
    let klipa = 0;
    const faera = (dx, dy) => {
      const haegri = new T.Vector3().setFromMatrixColumn(vel.matrix, 0), fram = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), haegri);
      const kv = fjarl / (el.clientHeight || 500) * 1.1;
      mid.addScaledVector(haegri, -dx * kv).addScaledVector(fram, -dy * kv);
    };
    const nidur = e => { el.setPointerCapture(e.pointerId); bendlar.set(e.pointerId, { x: e.clientX, y: e.clientY, faera: e.button === 2 || e.shiftKey }); el.style.cursor = 'grabbing'; };
    const hreyfa = e => {
      const p = bendlar.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (bendlar.size >= 2) {
        const [a, c2] = [...bendlar.values()], nuna = Math.hypot(a.x - c2.x, a.y - c2.y);
        if (klipa) fjarl *= klipa / Math.max(1, nuna);
        klipa = nuna; faera(dx / 2, dy / 2);
      } else if (p.faera) faera(dx, dy);
      else { theta -= dx * 0.006; phi -= dy * 0.006; }
      stillaVel();
    };
    const upp = e => { bendlar.delete(e.pointerId); klipa = 0; el.style.cursor = 'grab'; };
    const hjol = e => { e.preventDefault(); fjarl *= e.deltaY > 0 ? 1.12 : 0.89; stillaVel(); };
    const samhengi = e => e.preventDefault();
    el.addEventListener('pointerdown', nidur); el.addEventListener('pointermove', hreyfa);
    el.addEventListener('pointerup', upp); el.addEventListener('pointercancel', upp);
    el.addEventListener('wheel', hjol, { passive: false }); el.addEventListener('contextmenu', samhengi);
    const staerd = () => { const w = gamur.clientWidth || 800, hh = gamur.clientHeight || 500; teiknari.setSize(w, hh); vel.aspect = w / hh; vel.updateProjectionMatrix(); };
    window.addEventListener('resize', staerd);
    stillaVel();
    let lifir = true, raf = 0;
    const lykkja = () => { if (!lifir) return; teiknari.render(svid, vel); raf = requestAnimationFrame(lykkja); };
    lykkja();
    return {
      kassar: haedir.length,
      loka() {
        lifir = false; cancelAnimationFrame(raf); window.removeEventListener('resize', staerd);
        losa.forEach(x => { try { x.dispose(); } catch (_) {} });
        try { teiknari.dispose(); teiknari.forceContextLoss && teiknari.forceContextLoss(); } catch (_) {}
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    };
  }

  window.Teikn3D = { syna: syna3d, kassarUrGrimu };

  /* ───────────────────────── 3) TENGING VIÐ TEIKNINGAGLUGGANN (FloorPlan) ─────────────────────────
   *
   * 20.09.2026 (Agnar: „Af þá báðum hæðunum" · „Já gerðu það"): HÆÐIR, SKURÐUR og HANDDREGNIR VEGGIR.
   *
   * GÖGN: teikning_bord.haedir = [{ id, nafn, image_url, markers, skurdur:{x,y,w,h}|null, veggir:[[x1,y1,x2,y2]] }].
   *   ÖLL hnit eru í punktum FRUMMYNDAR hæðarinnar — líka þegar teikningin er skorin. markers/image_url í töflunni
   *   spegla fyrstu hæð svo eldri biðlarar og 109-borðinn á prófílnum virka óbreyttir.
   *
   * RITILLINN (FloorPlan í scanner.js) kann eina mynd og eina merkjaröð. Hann fær því VIRKU hæðina í
   *   plan.markers / plan.imageUrl og bgImage = leiðslan:   frummynd → skurður → skýrari veggir.
   *   Sé skorið eru plan.markers í hnitum SKORNU myndarinnar (frummynd − G.rymi) á meðan glugginn er opinn;
   *   samstillaVirka() færir þau aftur í frummyndarhnit áður en nokkuð er vistað eða skipt um hæð.
   *   Handdregnir veggir eru teiknaðir á YFIRLAG ofan á strigann — þeir fara aldrei inn í myndina sjálfa.
   */

  const LYKILL = cid => 'teikn_hreinsun_' + cid;
  const lesaVal = cid => { try { return JSON.parse(localStorage.getItem(LYKILL(cid)) || 'null') || {}; } catch (_) { return {}; } };
  const vistaVal = (cid, v) => { try { localStorage.setItem(LYKILL(cid), JSON.stringify(v)); } catch (_) {} };
  const segja = t => { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nyttId = () => 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  const G = {
    frum: null,            // frummynd virku hæðarinnar (það sem FloorPlan hlóð)
    stig1: null,           // frummynd eða skorinn strigi
    synd: null,            // það sem við settum í FloorPlan.bgImage (null = frummyndin sjálf)
    lykill: '',            // hvað `synd` var reiknað úr
    hrein: null, hreinLykill: '',
    rymi: { x: 0, y: 0 },  // hliðrunin sem plan.markers bera NÚNA miðað við frummynd
    virk: 0,
    hamur: null,           // null | 'skera' | 'veggir'
    kedja: null,           // síðasti punktur veggjakeðju (frummyndarhnit)
    bendill: null,         // músarstaða í veggjaham (frummyndarhnit) — fyrir forskoðunarlínu
    drag: null,            // skurðarkassi í smíðum (frummyndarhnit)
    syn3d: null, vakt: 0, raf: 0, teiknad: ''
  };

  const FPx = () => window.FloorPlan;
  function plan() { const FP = FPx(); if (!FP.plans[FP.companyId]) FP.plans[FP.companyId] = { markers: [] }; return FP.plans[FP.companyId]; }
  function haedir() {
    const p = plan();
    if (!Array.isArray(p.haedir) || !p.haedir.length) {
      p.haedir = [{ id: nyttId(), nafn: '1. hæð', image_url: typeof p.imageUrl === 'string' ? p.imageUrl : null, markers: [], skurdur: null, veggir: [] }];
    }
    p.haedir.forEach(h => { if (!Array.isArray(h.markers)) h.markers = []; if (!Array.isArray(h.veggir)) h.veggir = []; if (!Array.isArray(h.pdfVeggir)) h.pdfVeggir = []; if (!h.id) h.id = nyttId(); });
    if (G.virk >= p.haedir.length) G.virk = 0;
    return p.haedir;
  }
  const virkHaed = () => haedir()[G.virk];
  const erPx = m => (m.x > 1 || m.y > 1);

  // plan.markers bera hliðrunina G.rymi; færa þau yfir í nýja hliðrun (0,0 = frummyndarhnit).
  function faeraMerki(nx, ny) {
    const dx = G.rymi.x - nx, dy = G.rymi.y - ny;
    if (dx || dy) plan().markers.forEach(m => { if (erPx(m)) { m.x += dx; m.y += dy; } });
    G.rymi = { x: nx, y: ny };
  }
  // Ritill → gögn: virka hæðin fær merkin í FRUMMYNDARHNITUM og slóð frummyndar. Tæki er aðeins á EINNI hæð — sú virka vinnur.
  function samstillaVirka() {
    const p = plan(), hs = haedir(), h = hs[G.virk];
    h.markers = (p.markers || []).map(m => Object.assign({}, m, erPx(m) ? { x: m.x + G.rymi.x, y: m.y + G.rymi.y } : {}));
    if (typeof p.imageUrl === 'string') h.image_url = p.imageUrl;
    // Stærð FRUMMYNDAR fylgir hæðinni: TurboPaint teiknar sama blað í annarri stærð og þarf hana til að varpa
    // staðsetningum fram og til baka án þess að giska (kjarni: lib/board/uttekt.ts).
    if (G.frum) h.frum = { b: G.frum.naturalWidth || G.frum.width, h: G.frum.naturalHeight || G.frum.height };
    const her = {}; h.markers.forEach(m => { her[m.unitId] = 1; });
    hs.forEach((o, i) => { if (i !== G.virk) o.markers = o.markers.filter(m => !her[m.unitId]); });
  }

  /* ── veggir úr vigur-PDF hæðarinnar ── */
  const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';   // sama útgáfa og FloorPlan._loadPDF hleður
  function saekjaPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    return new Promise((res, rej) => {
      const sk = document.createElement('script'); sk.src = PDFJS + 'pdf.min.js';
      sk.onload = () => { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; } catch (_) {} res(); };
      sk.onerror = () => rej(new Error('Náði ekki í pdf.js')); document.head.appendChild(sk);
    });
  }
  // image_url hæðar er '/.netlify/functions/teikn-mynd?url=<permalink>' — permalinkurinn segir hvort frumritið er PDF.
  function pdfSlod(h) {
    try {
      const u = new URL(h.image_url, location.href), inn = u.searchParams.get('url') || '';
      return /\.pdf\.info$/i.test(new URL(inn).pathname) ? '/.netlify/functions/teikn-pdf?url=' + encodeURIComponent(inn) : '';
    } catch (_) { return ''; }
  }
  function beitaPdfFlokkum(h) {
    const valid = Array.isArray(h.pdfFlokkar) ? h.pdfFlokkar : [];
    h.pdfVeggir = G.pdf && G.pdf.haed === h.id ? [].concat(...valid.map(l => G.pdf.flokkar[l] || [])) : h.pdfVeggir;
  }
  async function lesaPdfVeggi(sjalfkrafa) {
    const h = virkHaed(), slod = pdfSlod(h);
    if (!slod) { if (!sjalfkrafa) segja('Þessi teikning er ekki PDF úr skjalasafninu — þar er enginn vigur að lesa. Notaðu ✏ til að draga veggina.'); return false; }
    if (!G.frum || G.pdfBid) return false;
    G.pdfBid = true; stika();
    try {
      await saekjaPdfJs();
      const r = await fetch(slod);
      if (!r.ok) { const v = await r.json().catch(() => null); throw new Error((v && v.error) || ('Svar ' + r.status)); }
      const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await r.arrayBuffer()) }).promise;
      const sida = await doc.getPage(1), vp = sida.getViewport({ scale: 1 }), ol = await sida.getOperatorList();
      const fl = flokkaPdfLinur(window.pdfjsLib.OPS, ol.fnArray, ol.argsArray, vp.transform), val = veljaVeggjaflokk(fl, vp.width, vp.height);
      const iw = G.frum.naturalWidth || G.frum.width, ih = G.frum.naturalHeight || G.frum.height, kx = iw / vp.width, ky = ih / vp.height;
      if (!val.valinn) throw new Error(val.yfirlit.length ? 'Fann engan línuflokk sem líkist veggjum.' : 'PDF-ið er skönnuð mynd — þar er enginn vigur. Dragðu veggina með ✏.');
      // Myndin er mynd af SÖMU síðu: hlutföllin verða að stemma, annars lenda veggirnir á skjön (snúið blað / önnur síða).
      if (Math.abs(kx / ky - 1) > 0.02) throw new Error('Blaðið í PDF-inu hefur önnur hlutföll en myndin — veggirnir myndu lenda á skjön.');
      const px = {}; Object.keys(fl).forEach(l => { if (+l >= 0.3) px[l] = fl[l].map(v => [Math.round(v[0] * kx), Math.round(v[1] * ky), Math.round(v[2] * kx), Math.round(v[3] * ky)]); });
      G.pdf = { haed: h.id, flokkar: px, yfirlit: val.yfirlit.filter(y => +y.breidd >= 0.3 && y.strik >= 8).slice(0, 5), ptIPx: kx };
      h.pdfFlokkar = [val.valinn]; beitaPdfFlokkum(h);
      segja('✓ ' + h.pdfVeggir.length + ' veggjastrik lesin úr PDF-inu (línuþykkt ' + val.valinn.replace('.', ',') + ' pt).');
      return true;
    } catch (e) {
      if (!sjalfkrafa) segja('⚠ Las ekki veggi úr PDF: ' + ((e && e.message) || e));
      h.pdfReynt = String((e && e.message) || e);
      return false;
    } finally { G.pdfBid = false; G.lykill = ''; stika(); }
  }

  /* ── leiðslan: frummynd → skurður → skýrari veggir ── */
  function skera(mynd, sk) {
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(sk.w)); c.height = Math.max(1, Math.round(sk.h));
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(mynd, -Math.round(sk.x), -Math.round(sk.y));
    return c;
  }
  function reikna(stig1, l, val) {
    const hl = l + '|' + (val.thykkt || 0) + '|' + (val.fylla ? 1 : 0);
    if (G.hrein && G.hreinLykill === hl) return G.hrein;
    const t0 = performance.now(), r = hreinsa(stig1, { thykkt: val.thykkt || 0, fylla: !!val.fylla });
    r.ms = Math.round(performance.now() - t0);
    G.hrein = r; G.hreinLykill = hl;
    return r;
  }
  // Undir þessu er niðurstaða myndgreiningarinnar slitrur, ekki veggjanet — þá er hún ekki sýnd og fer ekki í 3D.
  const NOTHAEF_THEKJA = 0.04;
  const okkar = m => !!m && (m === G.synd);

  function beita() {
    const FP = FPx(); if (!FP || !FP.companyId) return;
    const p = plan(), h = virkHaed(), val = lesaVal(FP.companyId), nu = FP.bgImage;
    if (nu && !okkar(nu) && nu !== G.frum) {
      // NÝ frummynd (fyrsta hleðsla, svar þjóns, „Sækja teikningu", „Hlaða upp" eða skipt um hæð).
      if (nu.complete === false) return;
      faeraMerki(0, 0);
      G.frum = nu; G.stig1 = null; G.synd = null; G.lykill = ''; G.hrein = null; G.hreinLykill = '';
      if (typeof p.imageUrl === 'string' && h.image_url !== p.imageUrl) {
        // Önnur teikning en hæðin átti: skurður og veggir áttu við gömlu myndina.
        if (h.image_url) { h.skurdur = null; h.veggir = []; h.pdfVeggir = []; delete h.pdfFlokkar; delete h.sjalf; G.pdf = null; }
        h.image_url = p.imageUrl;
      }
    }
    if (!G.frum || !nu) { stika(); flipar(); return; }
    // SJÁLFGEFINN SKURÐUR AÐ BYGGINGUNNI (Agnar 20.09.2026: „reyna að default croppa að byggingunni"). Aðeins þegar hæðin
    // á engan skurð og notandinn hefur ekki valið „Sýna allt blaðið" (sjalf === false). Kassinn er víkkaður svo öll
    // merki sem þegar eru til lendi innan hans — sjálfvirkni má aldrei fela staðsetningu.
    if (!h.skurdur && h.sjalf !== false && G.sjalfReynt !== G.frum) {
      G.sjalfReynt = G.frum;
      try {
        const iw = G.frum.naturalWidth || G.frum.width, ih = G.frum.naturalHeight || G.frum.height;
        const kv = Math.min(1, 1300 / Math.max(iw, ih)), W = Math.round(iw * kv), H = Math.round(ih * kv);
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(G.frum, 0, 0, W, H);
        const d = x.getImageData(0, 0, W, H).data, gra = new Uint8Array(W * H);
        for (let i = 0, j = 0; i < W * H; i++, j += 4) gra[i] = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8;
        const hus = finnaHus(gra, W, H);
        if (hus) {
          let x0 = hus.x * iw, y0 = hus.y * ih, x1 = (hus.x + hus.w) * iw, y1 = (hus.y + hus.h) * ih;
          const sp = Math.max(iw, ih) * 0.02;
          p.markers.forEach(m => { if (erPx(m)) { const mx = m.x + G.rymi.x, my = m.y + G.rymi.y; x0 = Math.min(x0, mx - sp); y0 = Math.min(y0, my - sp); x1 = Math.max(x1, mx + sp); y1 = Math.max(y1, my + sp); } });
          x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(iw, x1); y1 = Math.min(ih, y1);
          if ((x1 - x0) * (y1 - y0) < iw * ih * 0.85) { h.skurdur = { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) }; h.sjalf = true; zNullstilla(); }
        }
      } catch (e) { console.warn('[383] sjálfskurður', e); }
    }
    const sk = h.skurdur && h.skurdur.w > 8 && h.skurdur.h > 8 ? h.skurdur : null;
    const l1 = (G.frum.src || G.frum.width + 'x') + '|' + (sk ? [sk.x, sk.y, sk.w, sk.h].map(Math.round).join(',') : '-');
    if (!G.stig1 || G.stig1Lykill !== l1) { G.stig1 = sk ? skera(G.frum, sk) : G.frum; G.stig1Lykill = l1; G.hrein = null; G.hreinLykill = ''; }
    let ut = G.stig1, skilabod = '';
    if (val.a && h.pdfVeggir.length) {
      // Vigurveggir eru til: þeir eru teiknaðir hnífskarpir á yfirlagið — undir þeim er blaðið aðeins DEYFT.
      if (!G.dauft || G.dauftLykill !== l1) {
        const c = document.createElement('canvas'); c.width = G.stig1.naturalWidth || G.stig1.width; c.height = G.stig1.naturalHeight || G.stig1.height;
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.globalAlpha = 0.3; x.drawImage(G.stig1, 0, 0);
        G.dauft = c; G.dauftLykill = l1;
      }
      ut = G.dauft;
    } else if (val.a) {
      // 20.09.2026 seint (Agnar, skjáskot af 2. hæð Fiskislóðar: „Þessi er alls ekki að virka. Spurning bara croppa
      // original við húsið"): myndgreiningin fann 2,5% „veggi" á þunnlínu-CAD og teiknaði BARA þá — slitrur í stað
      // teikningar. Reglan núna: UPPRUNALEGA teikningin, skorin að húsinu, er alltaf grunnurinn. Myndgreiningin fær
      // aðeins að skipta henni út þegar hún nær heilu veggjaneti (fylltir veggir gáfu 5,5%; CAD 0,3–2,5%).
      // PDF-hæð: veggirnir eru lesnir úr VIGRINUM — alltaf reynt, óháð því hvað myndgreiningin fann.
      if (pdfSlod(h) && !h.pdfReynt && !G.pdfBid) { h.pdfReynt = 'sjálfvirkt'; lesaPdfVeggi(true).then(beita); }
      let r = null;
      try { r = reikna(G.stig1, l1, val); } catch (e) { segja('⚠ Gat ekki unnið teikninguna: ' + ((e && e.message) || e)); val.a = false; vistaVal(FP.companyId, val); }
      if (r && r.thekja >= NOTHAEF_THEKJA) ut = r.strigi;
      else if (r && !G.pdfBid) {
        skilabod = 'Sjálfvirk veggjagreining nær ekki þessari teikningu (' + (r.thekja * 100).toFixed(1) + '% veggir) — sýni upprunalegu teikninguna, skorna að húsinu.' +
          (pdfSlod(h) ? ' Enginn vigur lásist úr PDF-inu.' : '') + ' Fyrir 3D: dragðu veggina með ✏ Veggir.';
      }
    }
    const lyk = l1 + '|' + (ut === G.stig1 ? 'frum' : ut === G.dauft ? 'dauft' : G.hreinLykill);
    if (G.lykill !== lyk || FP.bgImage !== ut) {
      faeraMerki(sk ? Math.round(sk.x) : 0, sk ? Math.round(sk.y) : 0);
      G.synd = ut === G.frum ? null : ut; G.lykill = lyk;
      FP.bgImage = ut;
      try { FP._renderCanvas(); FP._renderPanel(); } catch (_) {}
    }
    stika(skilabod); flipar(); hnappar();
  }

  /* ── stikur og takkar ── */
  const TK = 'min-width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;font:700 13px system-ui;cursor:pointer;padding:0 9px';
  const GULL = 'background:#c9a54a;color:#14120f;border-color:#c9a54a';
  function stikuEl() {
    const main = document.getElementById('fp-main'); if (!main) return null;
    let s = document.getElementById('fp-hreinsa-stika');
    if (!s) {
      s = document.createElement('div'); s.id = 'fp-hreinsa-stika';
      s.style.cssText = 'position:absolute;left:10px;bottom:10px;z-index:6;display:none;flex-wrap:wrap;align-items:center;gap:8px;max-width:calc(100% - 20px);' +
        'padding:7px 10px;border-radius:10px;background:rgba(20,18,15,.92);color:#f1ede4;font:600 12.5px system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.45)';
      main.appendChild(s);
      s.addEventListener('click', e => {
        const t = e.target.closest('[data-hr]'); if (!t) return;
        const FP = FPx(), v = lesaVal(FP.companyId), nuna = (G.hrein && G.hrein.thykkt) || 2, h = virkHaed(), a = t.dataset.hr;
        if (a === 'minna') v.thykkt = Math.max(1, (v.thykkt || nuna) - 1);
        if (a === 'meira') v.thykkt = Math.min(9, (v.thykkt || nuna) + 1);
        if (a === 'fylla') v.fylla = !v.fylla;
        if (a === 'v-aftur') { h.veggir.pop(); G.kedja = h.veggir.length ? h.veggir[h.veggir.length - 1].slice(2) : null; }
        if (a === 'v-ny') G.kedja = null;
        if (a === 'v-eyda' && window.confirm('Eyða öllum handdregnum veggjum á þessari hæð?')) { h.veggir = []; G.kedja = null; }
        if (a === 'v-buid' || a === 's-haetta') { G.hamur = null; G.kedja = null; G.drag = null; }
        if (a === 'pdf-lesa') { lesaPdfVeggi(false).then(beita); return; }
        if (a === 'pdf-eyda') { h.pdfVeggir = []; h.pdfFlokkar = []; G.lykill = ''; }
        if (a === 'pdf-flokkur') {
          const l = t.dataset.l, nu = Array.isArray(h.pdfFlokkar) ? h.pdfFlokkar.slice() : [], i = nu.indexOf(l);
          if (i >= 0) nu.splice(i, 1); else nu.push(l);
          h.pdfFlokkar = nu; beitaPdfFlokkum(h); G.lykill = '';
        }
        if (a === 's-stadfesta' && G.drag) { stadfestaSkurd(); }
        vistaVal(FP.companyId, v); beita();
      });
    }
    return s;
  }
  function stika(skilabod) {
    const s = stikuEl(); if (!s) return;
    const FP = FPx(), val = lesaVal(FP.companyId), h = virkHaed();
    let html = '';
    if (G.hamur === 'veggir') {
      const pdfTil = !!pdfSlod(h), flk = G.pdf && G.pdf.haed === h.id ? G.pdf.yfirlit : [];
      html = (pdfTil ? '<button type="button" data-hr="pdf-lesa" style="' + TK + '"' + (G.pdfBid ? ' disabled' : '') + ' title="Lesa veggina beint úr vigur-PDF skjalasafnsins">' + (G.pdfBid ? '⏳ Les PDF…' : '📄 Veggir úr PDF' + (h.pdfVeggir.length ? ' · ' + h.pdfVeggir.length : '')) + '</button>' : '') +
        flk.map(y => '<button type="button" data-hr="pdf-flokkur" data-l="' + y.breidd + '" aria-pressed="' + ((h.pdfFlokkar || []).indexOf(y.breidd) >= 0) + '" title="Línuþykkt ' + y.breidd + ' pt — ' + y.strik + ' strik" style="' + TK + ';' + ((h.pdfFlokkar || []).indexOf(y.breidd) >= 0 ? GULL : '') + '">' + y.breidd.replace('.', ',') + ' pt</button>').join('') +
        (h.pdfVeggir.length ? '<button type="button" data-hr="pdf-eyda" style="' + TK + '" title="Taka PDF-veggina af">✕ PDF</button>' : '') +
        '<span style="flex-basis:100%;height:0"></span>' +
        '<span>✏ Smelltu á horn veggjanna — línan réttir sig sjálf lárétt/lóðrétt</span>' +
        '<button type="button" data-hr="v-ny" style="' + TK + '" title="Byrja nýja línu annars staðar (líka tvísmellur eða Esc)">Ný lína</button>' +
        '<button type="button" data-hr="v-aftur" style="' + TK + '"' + (h.veggir.length ? '' : ' disabled') + '>↶ Til baka</button>' +
        '<button type="button" data-hr="v-eyda" style="' + TK + '"' + (h.veggir.length ? '' : ' disabled') + '>🗑 Eyða öllum</button>' +
        '<button type="button" data-hr="v-buid" style="' + TK + ';' + GULL + '">✓ Búið · ' + h.veggir.length + ' veggir</button>';
    } else if (G.hamur === 'skera') {
      html = '<span>✂ Dragðu kassa utan um húsið</span>' +
        (G.drag && G.drag.buid ? '<button type="button" data-hr="s-stadfesta" style="' + TK + ';' + GULL + '">✓ Skera hér</button>' : '') +
        '<button type="button" data-hr="s-haetta" style="' + TK + '">Hætta við</button>';
    } else if (val.a && h.pdfVeggir.length) {
      html = '<span>📄 ' + h.pdfVeggir.length + ' veggjastrik úr PDF-inu</span><span style="opacity:.6;font-weight:500">Aðrar línuþykktir og handdregnir veggir: ✏ Veggir</span>';
    } else if (val.a && G.hrein && G.hrein.thekja < NOTHAEF_THEKJA && !val.thykkt && !val.fylla) {
      html = '';                                  // upprunalega teikningin er sýnd — engar stillingar sem breyta engu
    } else if (val.a) {
      const th = (G.hrein && G.hrein.thykkt) || val.thykkt || 2;
      html = '<span>Veggþykkt</span><button type="button" data-hr="minna" style="' + TK + '" title="Halda líka þynnri veggjum">−</button><span style="min-width:14px;text-align:center">' + th +
        '</span><button type="button" data-hr="meira" style="' + TK + '" title="Aðeins þykkustu veggir">+</button>' +
        '<button type="button" data-hr="fylla" aria-pressed="' + !!val.fylla + '" style="' + TK + ';' + (val.fylla ? GULL : '') + '">Fylla tvöfalda veggi</button>' +
        (skilabod ? '' : (G.hrein ? '<span style="opacity:.6;font-weight:500">' + (G.hrein.thekja * 100).toFixed(1) + '% veggir · ' + G.hrein.ms + ' ms</span>' : ''));
    }
    if (G.pdfBid && G.hamur !== 'veggir') html += '<span style="flex-basis:100%;color:#ffd27a;font-weight:500">⏳ Les veggi úr PDF-skjalinu…</span>';
    else if (skilabod && !G.hamur && !h.pdfVeggir.length) html += '<span style="flex-basis:100%;color:#ffd27a;font-weight:500">' + esc(skilabod) + '</span>';
    if (s._html !== html) { s.innerHTML = html; s._html = html; }
    s.style.display = html ? 'flex' : 'none';
  }

  // Hæðaflipar efst til vinstri.
  function flipar() {
    const main = document.getElementById('fp-main'); if (!main) return;
    let f = document.getElementById('fp-haedir');
    if (!f) {
      f = document.createElement('div'); f.id = 'fp-haedir';
      f.style.cssText = 'position:absolute;left:10px;top:10px;z-index:6;display:flex;flex-wrap:wrap;gap:6px;max-width:calc(100% - 215px);font:700 12.5px system-ui,sans-serif';
      main.appendChild(f);
      f.addEventListener('click', e => {
        const t = e.target.closest('[data-h]'); if (!t) return;
        const a = t.dataset.h, hs = haedir();
        if (a === 'ny') {
          samstillaVirka();
          hs.push({ id: nyttId(), nafn: (hs.length + 1) + '. hæð', image_url: null, markers: [], skurdur: null, veggir: [] });
          virkja(hs.length - 1);
          segja('Ný hæð — sæktu eða hlaðu upp teikningu fyrir hana.');
        } else if (a === 'saekja') { endurlesa();
        } else if (a === 'nafn') {
          const n = window.prompt('Heiti hæðar', virkHaed().nafn || ''); if (n != null && n.trim()) virkHaed().nafn = n.trim().slice(0, 24);
          flipar();
        } else if (a === 'eyda') {
          const h = virkHaed();
          if (hs.length < 2 || !window.confirm('Eyða „' + h.nafn + '" með ' + plan().markers.length + ' staðsetningum? Breytingin vistast þegar þú ýtir á Vista.')) return;
          hs.splice(G.virk, 1); plan().markers = []; G.rymi = { x: 0, y: 0 };
          const i = Math.max(0, G.virk - 1); G.virk = -1; virkja(i, true);
        } else virkja(+a);
      });
    }
    const hs = haedir(), FL = 'height:30px;padding:0 11px;border-radius:9px;border:1px solid rgba(255,255,255,.22);cursor:pointer;font:inherit;';
    const html = hs.map((h, i) => '<button type="button" data-h="' + i + '" aria-pressed="' + (i === G.virk) + '" style="' + FL + (i === G.virk ? GULL : 'background:rgba(20,18,15,.88);color:#f1ede4') + '">' +
        esc(h.nafn || (i + 1) + '. hæð') + ' <span style="opacity:.65;font-weight:500">' + (i === G.virk ? plan().markers.length : h.markers.length) + '</span></button>').join('') +
      '<button type="button" data-h="saekja" title="Sækja staðsetningar af þjóni — t.d. eftir „Vista í úttekt" í TurboPaint" style="' + FL + 'background:rgba(20,18,15,.88);color:#f1ede4">↻</button>' +
      '<button type="button" data-h="nafn" title="Endurnefna virku hæðina" style="' + FL + 'background:rgba(20,18,15,.88);color:#f1ede4">✎</button>' +
      (hs.length > 1 ? '<button type="button" data-h="eyda" title="Eyða virku hæðinni" style="' + FL + 'background:rgba(20,18,15,.88);color:#f1ede4">🗑</button>' : '') +
      '<button type="button" data-h="ny" style="' + FL + 'background:rgba(20,18,15,.88);color:#f1ede4">+ Hæð</button>';
    if (f._html !== html) { f.innerHTML = html; f._html = html; }
  }

  function virkja(i, anSamstillingar) {
    const FP = FPx(), p = plan(), hs = haedir();
    if (i === G.virk || i < 0 || i >= hs.length) return;
    if (!anSamstillingar) samstillaVirka();
    loka3d(); G.hamur = null; G.kedja = null; G.drag = null;
    G.virk = i;
    const h = hs[i];
    p.markers = h.markers.map(m => Object.assign({}, m)); G.rymi = { x: 0, y: 0 };
    p.imageUrl = h.image_url || null;
    G.frum = null; G.stig1 = null; G.synd = null; G.lykill = ''; G.hrein = null; G.hreinLykill = '';
    FP.bgImage = null; FP._selectedUnitId = null; zNullstilla();
    const c = document.getElementById('fp-canvas'), dm = document.getElementById('fp-drop-msg');
    if (h.image_url) {
      const img = new Image();
      img.onload = () => {
        if (FPx().companyId !== FP.companyId || haedir()[G.virk] !== h) return;
        FP.bgImage = img; if (c) c.style.display = 'block'; if (dm) dm.style.display = 'none';
        beita(); try { FP._renderCanvas(); FP._renderPanel(); } catch (_) {}
      };
      img.onerror = () => segja('⚠ Náði ekki í teikningu hæðarinnar „' + h.nafn + '".');
      img.src = h.image_url;
    } else {
      if (c) c.style.display = 'none'; if (dm) dm.style.display = '';
    }
    try { FP._renderPanel(); } catch (_) {}
    flipar(); stika(); hnappar();
  }

  /* ── yfirlag: handdregnir veggir, forskoðunarlína, skurðarkassi ── */
  function yfirlag() {
    const main = document.getElementById('fp-main'), c = document.getElementById('fp-canvas'); if (!main || !c) return;
    let y = document.getElementById('fp-yfirlag');
    if (!y) {
      y = document.createElement('canvas'); y.id = 'fp-yfirlag';
      y.style.cssText = 'position:absolute;left:0;top:0;z-index:5;pointer-events:none';
      main.appendChild(y);
    }
    const FP = FPx(), h = virkHaed(), mr = main.getBoundingClientRect(), cr = c.getBoundingClientRect();
    const synilegt = c.style.display !== 'none' && cr.width > 2 && FP.bgImage;
    const merki = [synilegt ? 1 : 0, Math.round(cr.left - mr.left), Math.round(cr.top - mr.top), Math.round(cr.width), Math.round(cr.height), c.width, G.rymi.x, G.rymi.y,
      G.hamur, JSON.stringify(h.veggir), h.pdfVeggir.length + ':' + (h.pdfFlokkar || []).join(','), JSON.stringify(G.kedja), JSON.stringify(G.bendill), JSON.stringify(G.drag), mr.width, mr.height].join('|');
    if (merki === G.teiknad) return;
    G.teiknad = merki;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    y.width = Math.round(mr.width * dpr); y.height = Math.round(mr.height * dpr); y.style.width = mr.width + 'px'; y.style.height = mr.height + 'px';
    const x = y.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, mr.width, mr.height);
    if (!synilegt) return;
    const k = cr.width / c.width, ox = cr.left - mr.left, oy = cr.top - mr.top;
    const sx = X => ox + (X - G.rymi.x) * k, sy = Y => oy + (Y - G.rymi.y) * k;
    x.save(); x.beginPath(); x.rect(ox, oy, cr.width, cr.height); x.clip();
    const bt = Math.max(3, Math.min(9, c.width * k / 170));
    x.lineCap = 'round'; x.lineJoin = 'round';
    if (h.pdfVeggir.length) {
      // Aðeins strik sem snerta sýnilega svæðið — 800+ strik á hverjum ramma væri sóun þegar þysjað er inn.
      x.strokeStyle = '#14120f'; x.lineWidth = Math.max(1.25, Math.min(4, k * 3.2)); x.beginPath();
      const L = ox - 4, R = ox + cr.width + 4, Tp = oy - 4, B = oy + cr.height + 4;
      for (let i = 0; i < h.pdfVeggir.length; i++) {
        const v = h.pdfVeggir[i], ax = sx(v[0]), ay = sy(v[1]), bx = sx(v[2]), by = sy(v[3]);
        if ((ax < L && bx < L) || (ax > R && bx > R) || (ay < Tp && by < Tp) || (ay > B && by > B)) continue;
        x.moveTo(ax, ay); x.lineTo(bx, by);
      }
      x.stroke();
    }
    x.strokeStyle = G.hamur === 'veggir' ? '#1d4ed8' : '#26221e'; x.lineWidth = bt;
    h.veggir.forEach(v => { x.beginPath(); x.moveTo(sx(v[0]), sy(v[1])); x.lineTo(sx(v[2]), sy(v[3])); x.stroke(); });
    if (G.hamur === 'veggir' && G.kedja) {
      if (G.bendill) { x.strokeStyle = 'rgba(29,78,216,.55)'; x.setLineDash([8, 6]); x.beginPath(); x.moveTo(sx(G.kedja[0]), sy(G.kedja[1])); x.lineTo(sx(G.bendill[0]), sy(G.bendill[1])); x.stroke(); x.setLineDash([]); }
      x.fillStyle = '#1d4ed8'; x.beginPath(); x.arc(sx(G.kedja[0]), sy(G.kedja[1]), bt * 0.9, 0, 6.3); x.fill();
    }
    if (G.hamur === 'skera' && G.drag) {
      const d = G.drag, X0 = sx(Math.min(d.x0, d.x1)), Y0 = sy(Math.min(d.y0, d.y1)), Wd = Math.abs(d.x1 - d.x0) * k, Hd = Math.abs(d.y1 - d.y0) * k;
      x.fillStyle = 'rgba(20,18,15,.5)'; x.beginPath(); x.rect(ox, oy, cr.width, cr.height); x.rect(X0, Y0, Wd, Hd); x.fill('evenodd');
      x.strokeStyle = '#c9a54a'; x.lineWidth = 2; x.setLineDash([7, 5]); x.strokeRect(X0, Y0, Wd, Hd);
    }
    x.restore();
  }

  // Skjáhnit → frummyndarhnit virku hæðarinnar.
  function hnit(e) {
    const c = document.getElementById('fp-canvas'), r = c.getBoundingClientRect();
    return [(e.clientX - r.left) * (c.width / r.width) + G.rymi.x, (e.clientY - r.top) * (c.height / r.height) + G.rymi.y];
  }
  function smella(p) {
    // Rétta lárétt/lóðrétt (innan ~7°) og grípa í enda sem þegar eru til — þannig lokast herbergi hreint.
    const c = document.getElementById('fp-canvas'), r = c.getBoundingClientRect(), grip = 12 * (c.width / r.width);
    let [X, Y] = p;
    if (G.kedja) { const dx = X - G.kedja[0], dy = Y - G.kedja[1]; if (Math.abs(dx) < Math.abs(dy) * 0.12) X = G.kedja[0]; else if (Math.abs(dy) < Math.abs(dx) * 0.12) Y = G.kedja[1]; }
    let best = null, bd = grip;
    virkHaed().veggir.forEach(v => [[v[0], v[1]], [v[2], v[3]]].forEach(q => { const d = Math.hypot(q[0] - X, q[1] - Y); if (d < bd) { bd = d; best = q; } }));
    return best ? [best[0], best[1]] : [Math.round(X), Math.round(Y)];
  }
  function stadfestaSkurd() {
    const d = G.drag, h = virkHaed(); if (!d || !G.frum) return;
    const iw = G.frum.naturalWidth || G.frum.width, ih = G.frum.naturalHeight || G.frum.height;
    const x = Math.max(0, Math.min(d.x0, d.x1)), y = Math.max(0, Math.min(d.y0, d.y1));
    const w = Math.min(iw, Math.max(d.x0, d.x1)) - x, hh = Math.min(ih, Math.max(d.y0, d.y1)) - y;
    G.drag = null; G.hamur = null;
    if (w < 40 || hh < 40) { segja('Kassinn var of lítill — reyndu aftur.'); return; }
    const uti = plan().markers.filter(m => erPx(m) && (m.x + G.rymi.x < x || m.x + G.rymi.x > x + w || m.y + G.rymi.y < y || m.y + G.rymi.y > y + hh)).length;
    h.skurdur = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hh) }; h.sjalf = false; zNullstilla();
    if (uti) segja('⚠ ' + uti + ' staðsetning' + (uti === 1 ? '' : 'ar') + ' lend' + (uti === 1 ? 'ir' : 'a') + ' utan við skurðinn — þær haldast, en sjást ekki fyrr en „Sýna allt blaðið" er valið.');
  }
  /* ── þysjun og færsla: EIN stýring fyrir mús, hjól, fingur og takka ──
   * Agnar 20.09.2026: „Má kannski setja zoom takka og leyfa pinch zoom". newfeatures.js átti þysjun með hjóli og
   * mousedown-færslu, með stöðuna lokaða inni í sér — engin snerting, engin klípa, og 30 px takkar. Hér er hún
   * tekin yfir: atburðir hennar eru stöðvaðir í capture og takkarnir hennar faldir. */
  const Z = { s: 1, x: 0, y: 0 };
  function zBeita() {
    const c = document.getElementById('fp-canvas'); if (!c) return;
    c.style.transformOrigin = '0 0'; c.style.transform = 'translate(' + Z.x + 'px,' + Z.y + 'px) scale(' + Z.s + ')';
    const m = document.getElementById('fp-zoom-pct'); if (m) m.textContent = Math.round(Z.s * 100) + '%';
  }
  function zThysja(f, cx, cy) {
    const main = document.getElementById('fp-main'); if (!main) return;
    const r = main.getBoundingClientRect(), mx = cx == null ? r.width / 2 : cx - r.left, my = cy == null ? r.height / 2 : cy - r.top;
    const ns = Math.min(12, Math.max(0.2, Z.s * f));
    Z.x = mx - (mx - Z.x) * (ns / Z.s); Z.y = my - (my - Z.y) * (ns / Z.s); Z.s = ns; zBeita();
  }
  function zNullstilla() { Z.s = 1; Z.x = 0; Z.y = 0; zBeita(); }
  function zTakkar() {
    const main = document.getElementById('fp-main'); if (!main) return;
    const gamalt = document.getElementById('_fzb'); if (gamalt && gamalt.parentNode && gamalt.parentNode.style.display !== 'none') gamalt.parentNode.style.display = 'none';
    if (document.getElementById('fp-zoom')) return;
    const d = document.createElement('div'); d.id = 'fp-zoom';
    // Efst til hægri (Agnar 20.09.2026 bað um að færa takkana upp) — neðst rákust þeir á þysjunarstiku appsins
    // á síma (353) og á tækjaræmuna.
    d.style.cssText = 'position:absolute;right:10px;top:10px;z-index:7;display:flex;align-items:center;gap:5px;font:700 13px system-ui,sans-serif';
    const tk = 'width:42px;height:42px;border-radius:11px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.88);color:#fff;font:700 20px system-ui;cursor:pointer;display:flex;align-items:center;justify-content:center';
    d.innerHTML = '<button type="button" data-z="ut" style="' + tk + '" aria-label="Minnka" title="Minnka">−</button>' +
      '<span id="fp-zoom-pct" style="min-width:52px;text-align:center;padding:0 4px;height:42px;line-height:42px;border-radius:11px;background:rgba(20,18,15,.88);color:#f1ede4">100%</span>' +
      '<button type="button" data-z="inn" style="' + tk + '" aria-label="Stækka" title="Stækka">+</button>' +
      '<button type="button" data-z="passa" style="' + tk + ';font-size:16px" aria-label="Passa í glugga" title="Passa í glugga">⤢</button>';
    main.appendChild(d);
    d.addEventListener('click', e => { const t = e.target.closest('[data-z]'); if (!t) return; e.stopPropagation(); if (t.dataset.z === 'passa') zNullstilla(); else zThysja(t.dataset.z === 'inn' ? 1.35 : 1 / 1.35); });
  }
  function tengjaStriga() {
    const main = document.getElementById('fp-main'); if (!main || main._t383) return;
    main._t383 = 1;
    // CAPTURE: á undan merkja-smelli FloorPlan og draga/þysja annarra plástra — aðeins þegar hamur er virkur.
    const stodva = e => { e.stopPropagation(); e.preventDefault(); };
    main.addEventListener('click', e => {
      if (!G.hamur || e.target.id !== 'fp-canvas') return;
      stodva(e);
      if (G.hamur === 'veggir') {
        const p = smella(hnit(e));
        if (G.kedja && (G.kedja[0] !== p[0] || G.kedja[1] !== p[1])) virkHaed().veggir.push([G.kedja[0], G.kedja[1], p[0], p[1]]);
        G.kedja = p; stika();
      }
    }, true);
    main.addEventListener('dblclick', e => { if (G.hamur === 'veggir' && e.target.id === 'fp-canvas') { stodva(e); G.kedja = null; } }, true);
    // newfeatures.js færir teikninguna til með `mousedown` á fp-main (ekki pointerdown) — án þessa færði skurðar-
    // drátturinn myndina út af skjánum í stað þess að teikna kassa (fannst á lifandi síðu 20.09.2026). Hjólið þysjar áfram.
    // Gamla stýringin er ALLTAF stöðvuð (mousedown + wheel) — annars toga tvær stýringar í sama strigann.
    const aStriga = e => e.target === main || e.target.id === 'fp-canvas' || e.target.id === 'fp-drop-msg';
    main.addEventListener('mousedown', e => { if (aStriga(e)) e.stopPropagation(); }, true);
    main.addEventListener('wheel', e => { if (document.getElementById('fp-3d')) return; e.stopPropagation(); e.preventDefault(); zThysja(e.deltaY < 0 ? 1.15 : 0.87, e.clientX, e.clientY); }, { capture: true, passive: false });
    main.style.touchAction = 'none';
    const fingur = new Map(); let klipa = 0, midja = null, hreyft = 0;
    main.addEventListener('pointerdown', e => {
      if (!aStriga(e) || document.getElementById('fp-3d')) return;
      fingur.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (fingur.size === 1) hreyft = 0;
      klipa = 0; midja = null;
    }, true);
    main.addEventListener('pointermove', e => {
      const f = fingur.get(e.pointerId); if (!f) return;
      const dx = e.clientX - f.x, dy = e.clientY - f.y; f.x = e.clientX; f.y = e.clientY;
      if (fingur.size >= 2) {
        // Klípa: þysja um miðjuna milli fingranna og færa með henni. Skurðarkassi í smíðum víkur.
        const [a, b] = [...fingur.values()], fj = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (G.drag && !G.drag.buid) G.drag = null;
        if (klipa) zThysja(fj / klipa, mx, my);
        if (midja) { Z.x += mx - midja[0]; Z.y += my - midja[1]; zBeita(); }
        klipa = fj; midja = [mx, my]; hreyft = 99;
      } else if (G.hamur !== 'skera') {
        hreyft += Math.abs(dx) + Math.abs(dy);
        if (hreyft > 6) { Z.x += dx; Z.y += dy; zBeita(); main.style.cursor = 'grabbing'; }
      }
    }, true);
    const sleppa = e => { fingur.delete(e.pointerId); klipa = 0; midja = null; main.style.cursor = ''; };
    main.addEventListener('pointerup', sleppa, true); main.addEventListener('pointercancel', sleppa, true);
    // Dráttur er ekki smellur: án þessa setti færsla teikningarinnar niður merki (eða vegg) þar sem sleppt var.
    main.addEventListener('click', e => { if (hreyft > 6 && e.target.id === 'fp-canvas') { e.stopPropagation(); e.preventDefault(); hreyft = 0; } }, true);
    main.addEventListener('pointerdown', e => {
      if (G.hamur !== 'skera' || e.target.id !== 'fp-canvas') return;
      stodva(e); const p = hnit(e); G.drag = { x0: p[0], y0: p[1], x1: p[0], y1: p[1], buid: false };
      try { e.target.setPointerCapture(e.pointerId); } catch (_) {}
    }, true);
    main.addEventListener('pointermove', e => {
      if (G.hamur === 'veggir' && e.target.id === 'fp-canvas') G.bendill = smella(hnit(e));
      if (G.hamur === 'skera' && G.drag && !G.drag.buid) { stodva(e); const p = hnit(e); G.drag.x1 = p[0]; G.drag.y1 = p[1]; }
    }, true);
    main.addEventListener('pointerup', e => {
      if (G.hamur !== 'skera' || !G.drag || G.drag.buid) return;
      stodva(e); G.drag.buid = true; stika();
    }, true);
    main.addEventListener('pointerleave', () => { G.bendill = null; });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape' || !G.hamur) return;
      const m = document.getElementById('modal-floorplan'); if (!m || m.style.display === 'none') return;
      e.stopPropagation(); e.preventDefault();
      if (G.hamur === 'veggir' && G.kedja) G.kedja = null; else { G.hamur = null; G.drag = null; G.kedja = null; }
      stika();
    }, true);
  }

  /* ── 3D yfir allar hæðir ── */
  function loka3d() {
    if (G.syn3d) { try { G.syn3d.loka(); } catch (_) {} G.syn3d = null; }
    const g = document.getElementById('fp-3d'); if (g) g.remove();
    const b = document.querySelector('#modal-floorplan .fp-3d-btn'); if (b) b.setAttribute('aria-pressed', 'false');
  }
  const hladaMynd = slod => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('mynd')); i.src = slod; });
  // Hæð → { veggir, W, H, golf, kvardi, merki } í hnitum SKORNU myndarinnar (stig1).
  function undirbua(h, stig1, merkiFrum, val, einingar, frum) {
    const fb = frum.naturalWidth || frum.width, fh = frum.naturalHeight || frum.height;
    const sk = h.skurdur || { x: 0, y: 0, w: fb, h: fh };
    const r = hreinsa(stig1, { thykkt: val.thykkt || 0, fylla: !!val.fylla });
    const veggir = r.thekja >= NOTHAEF_THEKJA && !h.pdfVeggir.length ? r.veggir : new Uint8Array(r.W * r.H);
    if (h.veggir.length || h.pdfVeggir.length) {
      const c = document.createElement('canvas'); c.width = r.W; c.height = r.H;
      const x = c.getContext('2d'); x.strokeStyle = '#000'; x.lineCap = 'square'; x.lineWidth = Math.max(3, Math.round(r.W / 240));
      h.veggir.forEach(v => { x.beginPath(); x.moveTo((v[0] - sk.x) * r.kvardi, (v[1] - sk.y) * r.kvardi); x.lineTo((v[2] - sk.x) * r.kvardi, (v[3] - sk.y) * r.kvardi); x.stroke(); });
      // Vigurveggir eru TVÆR línur með veggþykkt á milli: nógu breitt strik til að parið renni saman í einn heilan vegg.
      x.lineWidth = Math.max(3, Math.round(r.W / 380)); x.beginPath();
      h.pdfVeggir.forEach(v => { x.moveTo((v[0] - sk.x) * r.kvardi, (v[1] - sk.y) * r.kvardi); x.lineTo((v[2] - sk.x) * r.kvardi, (v[3] - sk.y) * r.kvardi); });
      x.stroke();
      const d = x.getImageData(0, 0, r.W, r.H).data;
      for (let i = 0; i < r.W * r.H; i++) if (d[i * 4 + 3] > 96) veggir[i] = 1;
    }
    let n = 0; for (let i = 0; i < veggir.length; i++) n += veggir[i];
    const iw = stig1.naturalWidth || stig1.width, ih = stig1.naturalHeight || stig1.height;
    const merki = merkiFrum.map(mk => {
      const u = einingar.find(q => q.id === mk.unitId);
      const px = erPx(mk) ? mk.x - sk.x : mk.x * iw, py = erPx(mk) ? mk.y - sk.y : mk.y * ih;
      return { x: px, y: py, litur: u && u.status === 'overdue' ? '#c93c1d' : '#2f9e55', texti: u ? String(u.serial || '').slice(-6) : '' };
    });
    return { veggir, W: r.W, H: r.H, golf: r.vinnu, kvardi: r.kvardi, merki, veggjaPx: n, sk, frumB: fb, frumH: fh };
  }
  async function opna3d() {
    const FP = FPx(), main = document.getElementById('fp-main'); if (!FP || !main) return;
    if (document.getElementById('fp-3d')) { loka3d(); return; }
    samstillaVirka();
    const hs = haedir(), val = lesaVal(FP.companyId), einingar = FP.units || [];
    const gamur = document.createElement('div'); gamur.id = 'fp-3d';
    gamur.style.cssText = 'position:absolute;inset:0;z-index:8;background:#14120f';
    gamur.innerHTML = '<div id="fp-3d-skyr" style="position:absolute;left:10px;top:10px;z-index:2;max-width:calc(100% - 140px);padding:6px 10px;border-radius:9px;background:rgba(20,18,15,.85);color:#f1ede4;font:500 12px system-ui,sans-serif;pointer-events:none">Undirbý hæðir…</div>' +
      '<button type="button" id="fp-3d-x" style="position:absolute;right:10px;top:10px;z-index:2;height:36px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.85);color:#fff;font:700 13px system-ui;cursor:pointer">✕ Loka 3D</button>';
    main.appendChild(gamur);
    gamur.querySelector('#fp-3d-x').addEventListener('click', loka3d);
    const skyr = gamur.querySelector('#fp-3d-skyr'), ut = [], sleppt = [];
    for (let i = 0; i < hs.length; i++) {
      const h = hs[i];
      try {
        let stig1 = i === G.virk ? G.stig1 : null, frum = i === G.virk ? G.frum : null;
        if (!stig1) { if (!h.image_url) { sleppt.push(h.nafn + ' (engin teikning)'); continue; } frum = await hladaMynd(h.image_url); stig1 = h.skurdur ? skera(frum, h.skurdur) : frum; }
        if (!document.getElementById('fp-3d')) return;
        const u = undirbua(h, stig1, h.markers, val, einingar, frum);
        if (!u.veggjaPx) { sleppt.push(h.nafn + ' (engir veggir — lestu þá úr PDF eða dragðu með ✏)'); continue; }
        ut.push(u);
      } catch (_) { sleppt.push(h.nafn + ' (náði ekki í teikningu)'); }
    }
    if (!ut.length) { loka3d(); segja('Engir veggir til að lyfta upp: ' + sleppt.join(' · ') + '.'); return; }
    try {
      G.syn3d = await syna3d(gamur, { haedir: ut });
      skyr.textContent = 'Draga = snúa · hjól / klípa = aðdráttur · shift-draga eða tveir fingur = færa' + (ut.length > 1 ? ' · ' + ut.length + ' hæðir' : '') + (sleppt.length ? ' · sleppt: ' + sleppt.join(', ') : '');
      const b = document.querySelector('#modal-floorplan .fp-3d-btn'); if (b) b.setAttribute('aria-pressed', 'true');
    } catch (e) { loka3d(); segja('⚠ 3D-sýnin opnaðist ekki: ' + ((e && e.message) || e)); }
  }

  /* ── símaútlit ──
   * Agnar 20.09.2026 (skjáskot af S26): tækjalistinn stóð sem 220 px dálkur við hliðina og tók þriðjung skjásins;
   * teikningin fékk mjóa rein og tveir þriðju hennar stóðu auðir. Á mjóum skjá fer listinn NIÐUR sem lárétt ræma,
   * glugginn fyllir skjáinn og takkaröðin í hausnum skrunar til hliðar í stað þess að brotna í tvær línur. */
  function simaStill() {
    if (document.getElementById('fp-simi-css')) return;
    const st = document.createElement('style'); st.id = 'fp-simi-css';
    st.textContent =
      '#modal-floorplan .fp-hd-grp{flex-wrap:wrap;justify-content:flex-end}' +
      '@media (max-width:760px){' +
        '#modal-floorplan{width:100vw!important;max-width:100vw!important;height:100dvh!important;max-height:100dvh!important;border-radius:0!important;margin:0!important}' +
        '#modal-floorplan .modal-hd{flex-direction:column;align-items:stretch;gap:6px;padding:8px 10px 8px 64px}' +
        '#modal-floorplan .modal-hd h2{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '#modal-floorplan .modal-hd h2+div{display:none}' +
        '#modal-floorplan .fp-hd-grp{flex-wrap:nowrap!important;justify-content:flex-start!important;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;margin-left:-54px}' +
        '#modal-floorplan .fp-hd-grp>*{flex:none}' +
        '#modal-floorplan .modal-bd{flex-direction:column!important}' +
        '#modal-floorplan #fp-main{min-height:0}' +
        '#modal-floorplan #fp-panel{width:auto!important;flex:none!important;border-left:0!important;border-top:1px solid rgba(255,255,255,.12);padding:8px 10px!important;overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch}' +
        '#modal-floorplan #fp-panel>div:first-child{display:none}' +
        '#modal-floorplan #fp-unit-list{display:flex;gap:7px}' +
        '#modal-floorplan #fp-unit-list>div{flex:0 0 128px;margin-bottom:0!important}' +
        '#modal-floorplan .modal-ft{padding:8px 10px}' +
        '#modal-floorplan #fp-info{font-size:12px}' +
        '#fp-hreinsa-stika{max-width:calc(100% - 20px)!important}' +
        '#fp-zoom button{width:36px!important;height:36px!important}#fp-zoom span{height:36px!important;line-height:36px!important;min-width:46px!important}' +
      '}';
    document.head.appendChild(st);
  }

  /* ── TurboPaint-hringferð (Agnar 20.09.2026: „Edit í TurboPaint. Og save-að til baka") ──
   * TurboPaint les hæðina úr teikning_bord — hún verður því að vera VISTUÐ og eins og hún stendur á skjánum. Óvistaðar
   * breytingar eru vistaðar fyrst (án þess að loka glugganum), svo er hæðin opnuð í nýjum flipa. „Vista í úttekt" þar
   * skrifar staðsetningar tækjanna aftur í sömu röð; ↻ í hæðaflipunum hér sækir þær. */
  const TURBOPAINT = 'https://slokkvitaeki.vercel.app/kjarni/turbopaint';
  async function opnaITurboPaint() {
    const FP = FPx(), cid = FP.companyId;
    if (!FP.bgImage || !window.DB || !DB.sb) { segja('Sæktu eða hlaðu upp teikningu fyrst.'); return; }
    samstillaVirka();
    const hs = haedir(), h = hs[G.virk];
    if (!/teikn-mynd\?/.test(String(h.image_url || ''))) { segja('Aðeins teikningar úr skjalasafninu opnast sjálfkrafa í TurboPaint — upphlaðna mynd þarf að flytja þar inn handvirkt.'); return; }
    // Upphlaðin mynd á ANNARRI hæð er enn blob: — hún má ekki fara þannig í grunninn. Vista-takkinn breytir henni fyrst.
    if (hs.some(x => String(x.image_url || '').indexOf('blob:') === 0)) { segja('Ein hæðin er með nýupphlaðna mynd — ýttu fyrst á 💾 Vista, opnaðu gluggann aftur og svo TurboPaint.'); return; }
    const flipi = window.open('about:blank', '_blank');               // opnað í smellinum sjálfum, annars lokar vafrinn á það
    try {
      const gogn = JSON.parse(JSON.stringify(hs)); gogn.forEach(x => { delete x.pdfReynt; });
      const r = await DB.sb.from('teikning_bord').upsert({ company_id: cid, markers: gogn[0].markers, image_url: gogn[0].image_url || null, haedir: gogn, updated_at: new Date().toISOString() }, { onConflict: 'company_id' }).select('company_id');
      if (r.error || !r.data || !r.data.length) throw new Error((r.error && r.error.message) || 'ekkert skrifað');
      const slod = TURBOPAINT + '?uttekt=' + encodeURIComponent(cid) + '&haed=' + encodeURIComponent(h.id) + (h.frum ? '&b=' + h.frum.b + '&h=' + h.frum.h : '');
      if (flipi) flipi.location.href = slod; else location.href = slod;
      segja('Hæðin er vistuð og opnast í TurboPaint. Þegar þú ert búinn þar: „💾 Vista í úttekt", og svo ↻ hér.');
    } catch (e) {
      if (flipi) try { flipi.close(); } catch (_) {}
      segja('⚠ Gat ekki vistað hæðina fyrir TurboPaint: ' + ((e && e.message) || e));
    }
  }
  // Sækja staðsetningar sem TurboPaint (eða önnur vél) vistaði á meðan glugginn stóð opinn.
  async function endurlesa() {
    const FP = FPx(), cid = FP.companyId;
    try {
      const r = await DB.sb.from('teikning_bord').select('markers,image_url,haedir,updated_at,updated_by').eq('company_id', cid).limit(1);
      if (r.error || !r.data || !r.data.length) throw new Error((r.error && r.error.message) || 'engin röð');
      const row = r.data[0], virkId = virkHaed().id;
      faeraMerki(0, 0);
      FP.__eftirSokn(cid, row);
      const i = Math.max(0, haedir().findIndex(x => x.id === virkId));
      const p = plan(), h = haedir()[i];
      G.virk = i; p.markers = h.markers.map(m => Object.assign({}, m)); G.rymi = { x: 0, y: 0 }; G.lykill = '';
      beita(); try { FP._renderCanvas(); FP._renderPanel(); } catch (_) {}
      segja('↻ Sótt af þjóni' + (row.updated_by ? ' (síðast vistað af ' + row.updated_by + ')' : '') + ' — ' + p.markers.length + ' staðsetningar á þessari hæð.');
    } catch (e) { segja('⚠ Náði ekki að sækja: ' + ((e && e.message) || e)); }
  }

  /* ── takkar í haus gluggans ── */
  function hnappar() {
    const hd = document.querySelector('#modal-floorplan .modal-hd'); if (!hd) return;
    const grp = hd.lastElementChild; if (!grp) return;
    const FP = FPx();
    if (!grp.querySelector('.fp-hreinsa-btn')) {
      const gera = (kl, texti, titill, fn) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-outline btn-sm ' + kl;
        b.style.cssText = 'cursor:pointer'; b.textContent = texti; b.title = titill; b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', fn); return b;
      };
      const tharfMynd = fn => () => { if (!FPx().bgImage) { segja('Sæktu eða hlaðu upp teikningu fyrst.'); return; } fn(); beita(); };
      const takkar = [
        gera('fp-skera-btn', '✂ Skera', 'Skera teikninguna að húsinu — blaðið er oft margfalt stærra en grunnmyndin', tharfMynd(() => {
          const h = virkHaed(); loka3d();
          if (h.skurdur) { h.skurdur = null; h.sjalf = false; G.hamur = null; zNullstilla(); } else { G.hamur = G.hamur === 'skera' ? null : 'skera'; G.drag = null; G.kedja = null; }
        })),
        gera('fp-veggir-btn', '✏ Veggir', 'Draga veggina sjálfur — virkar á hvaða teikningu sem er og gefur rétt 3D', tharfMynd(() => { loka3d(); G.hamur = G.hamur === 'veggir' ? null : 'veggir'; G.kedja = null; G.drag = null; })),
        gera('fp-hreinsa-btn', '✨ Skýrari veggir', 'Sýna aðeins veggina — málsetningar og texti dofna. Frummyndin geymist óbreytt.', tharfMynd(() => { const v = lesaVal(FP.companyId); v.a = !v.a; vistaVal(FP.companyId, v); })),
        gera('fp-3d-btn', '🧊 3D', 'Lyfta veggjunum upp og sjá tækin í þrívídd — allar hæðir', () => { G.hamur = null; opna3d(); }),
        gera('fp-tp-btn', '🖌 TurboPaint', 'Opna hæðina í TurboPaint: teikna á hana, færa tækin og vista staðsetningarnar til baka', opnaITurboPaint)
      ];
      const upp = grp.querySelector('label') || grp.firstChild;
      takkar.forEach(b => grp.insertBefore(b, upp));
      grp.classList.add('fp-hd-grp'); simaStill();
    }
    const val = lesaVal(FP.companyId), h = virkHaed();
    const lita = (kl, a, texti) => { const b = grp.querySelector(kl); if (!b) return; b.setAttribute('aria-pressed', String(!!a)); b.style.background = a ? '#c9a54a' : ''; b.style.color = a ? '#14120f' : ''; if (texti) b.textContent = texti; };
    lita('.fp-hreinsa-btn', val.a);
    lita('.fp-veggir-btn', G.hamur === 'veggir', '✏ Veggir' + (h.veggir.length + h.pdfVeggir.length ? ' · ' + (h.veggir.length + h.pdfVeggir.length) : ''));
    lita('.fp-skera-btn', G.hamur === 'skera' || !!h.skurdur, h.skurdur ? '✂ Sýna allt blaðið' : '✂ Skera');
    const c = document.getElementById('fp-canvas'); if (c) c.style.cursor = G.hamur ? 'crosshair' : '';
  }

  // Tækjalistinn þekkir aðeins virku hæðina: segja á hvaða hæð tækið er annars.
  function listaVisbending() {
    const el = document.getElementById('fp-unit-list'), FP = FPx(); if (!el || !FP.units) return;
    if (FP._selectedUnitId !== G.valid) { G.valid = FP._selectedUnitId; const i = FP.units.findIndex(u => u.id === G.valid); if (i >= 0 && el.children[i] && window.innerWidth <= 760) { try { el.children[i].scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (_) {} } }
    const hs = haedir();
    [...el.children].forEach((rod, i) => {
      const u = FP.units[i]; if (!u) return;
      const annars = hs.find((h, j) => j !== G.virk && h.markers.some(m => m.unitId === u.id));
      const sidast = rod.lastElementChild; if (!sidast) return;
      if (annars && !plan().markers.some(m => m.unitId === u.id)) { const t = '↗ á ' + annars.nafn; if (sidast.textContent !== t) { sidast.textContent = t; sidast.style.color = '#c9a54a'; } }
    });
  }

  /* ── skreyta FloorPlan ── */
  async function blobIDataUrl(slod) {
    const img = await hladaMynd(slod), cv = document.createElement('canvas');
    const w = Math.min(img.naturalWidth, 1600), hh = Math.round(img.naturalHeight * w / img.naturalWidth);
    cv.width = w; cv.height = hh; cv.getContext('2d').drawImage(img, 0, 0, w, hh);
    return { slod: cv.toDataURL('image/jpeg', 0.75), kvardi: w / img.naturalWidth };
  }

  function skreyta() {
    const FP = FPx();
    if (!FP) return false;
    if (FP.__hreinsaSkreytt) return true;
    // Á EFTIR 375 (vistun á þjón): save-vefjan okkar verður að vera YST svo gögnin séu samstillt áður en 375 les þau.
    if (typeof FP.open !== 'function' || typeof FP.save !== 'function' || !FP.__vistunSkreytt) return false;
    const opna = FP.open, vista = FP.save;

    FP.open = function () {
      loka3d(); cancelAnimationFrame(G.raf); clearInterval(G.vakt);
      Object.assign(G, { frum: null, stig1: null, stig1Lykill: '', synd: null, lykill: '', hrein: null, hreinLykill: '', rymi: { x: 0, y: 0 }, virk: 0, hamur: null, kedja: null, bendill: null, drag: null, teiknad: '' });
      const r = opna.apply(this, arguments);
      Z.s = 1; Z.x = 0; Z.y = 0;
      const tikk = () => {
        const m = document.getElementById('modal-floorplan');
        if (!m || m.style.display === 'none' || !document.body.contains(m)) { clearInterval(G.vakt); cancelAnimationFrame(G.raf); loka3d(); return false; }
        try { tengjaStriga(); zTakkar(); hnappar(); beita(); listaVisbending(); } catch (e) { console.warn('[383]', e); }
        return true;
      };
      setTimeout(tikk, 60);
      G.vakt = setInterval(tikk, 500);
      const lykkja = () => { const m = document.getElementById('modal-floorplan'); if (!m || !document.body.contains(m)) return; try { yfirlag(); } catch (_) {} G.raf = requestAnimationFrame(lykkja); };
      G.raf = requestAnimationFrame(lykkja);
      return r;
    };

    // 375 kallar þetta þegar röð þjónsins er komin: merkin eru þá í FRUMMYNDARHNITUM og hæðirnar fylgja.
    FP.__eftirSokn = function (cid, row) {
      if (FP.companyId !== cid) return;
      const p = plan();
      p.haedir = Array.isArray(row.haedir) && row.haedir.length ? JSON.parse(JSON.stringify(row.haedir)) : null;
      G.rymi = { x: 0, y: 0 }; G.virk = 0; G.lykill = ''; G.synd = null;
      const hs = haedir();
      if (Array.isArray(row.haedir) && row.haedir.length) { p.markers = hs[0].markers.map(m => Object.assign({}, m)); if (hs[0].image_url) p.imageUrl = hs[0].image_url; }
      else { hs[0].markers = (p.markers || []).map(m => Object.assign({}, m)); hs[0].image_url = p.imageUrl || null; }
      if (G.frum && FP.bgImage !== G.frum) { FP.bgImage = G.frum; G.frum = null; }
    };

    FP.save = function () {
      const self = this, p = plan();
      loka3d(); G.hamur = null;
      samstillaVirka();
      const hs = haedir(); hs.forEach(h => { delete h.pdfReynt; });
      (async () => {
        // Upphlaðnar myndir eru blob: — þær deyja við endurhleðslu. Sama smækkun og 375 notar; hnit hæðarinnar skalast með.
        for (const h of hs) {
          if (typeof h.image_url === 'string' && h.image_url.indexOf('blob:') === 0) {
            try {
              const b = await blobIDataUrl(h.image_url), k = b.kvardi;
              h.image_url = b.slod;
              if (k !== 1) {
                h.markers.forEach(m => { if (erPx(m)) { m.x *= k; m.y *= k; } });
                h.veggir = h.veggir.map(v => v.map(n => Math.round(n * k))); h.pdfVeggir = h.pdfVeggir.map(v => v.map(n => Math.round(n * k)));
                if (h.skurdur) h.skurdur = { x: Math.round(h.skurdur.x * k), y: Math.round(h.skurdur.y * k), w: Math.round(h.skurdur.w * k), h: Math.round(h.skurdur.h * k) };
              }
            } catch (_) { segja('⚠ Náði ekki að geyma upphlaðna mynd hæðarinnar „' + h.nafn + '".'); }
          }
        }
        // Gömlu reitirnir (og localStorage) spegla FYRSTU hæð í frummyndarhnitum.
        p.markers = hs[0].markers.map(m => Object.assign({}, m)); p.imageUrl = hs[0].image_url || null;
        G.rymi = { x: 0, y: 0 }; G.virk = 0;
        vista.call(self);
      })();
    };
    FP.__hreinsaSkreytt = true;
    return true;
  }

  if (!skreyta()) { let n = 0; const i = setInterval(() => { if (skreyta() || ++n > 80) clearInterval(i); }, 150); }
})();
