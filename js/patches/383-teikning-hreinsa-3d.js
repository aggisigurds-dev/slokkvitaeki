/* === TEIKNING: HÆÐIR · SKURÐUR · VEGGIR · SKÝRARI VEGGIR · 3D (383) ==========
 *
 * Agnar 20.09.2026: „wanted to get more usable floorplans for teikningar but register the
 * fire extinguishers" · „nota skýrari veggja pælinguna og 3d view" · „plana hvernig sé best að
 * gera þetta svo þetta sé nokkuð fjölbreytilega nothæft".
 *
 * Agnar 02.10.2026: 2D má ALDREI skipta grunnmynd út fyrir veggjabitmap né hvíta
 * hana. 3D-gólf stingur AÐEINS gráa lóð (draugaplata) — ekki endurbyggja veggi.
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
 * teikningarinnar á þjóninum (haedir[].syn, 03.10.2026) og vistast sjálfkrafa ásamt skurði og PDF-veggjum.
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
    const vinnuPx = o.vinnuPx || (window.TeiknGaedi && TeiknGaedi.vinnuPx && TeiknGaedi.vinnuPx()) || 2200;
    const kvardi = Math.min(1, vinnuPx / Math.max(iw, ih));
    const W = Math.max(1, Math.round(iw * kvardi)), H = Math.max(1, Math.round(ih * kvardi));
    const vinnu = document.createElement('canvas'); vinnu.width = W; vinnu.height = H;
    const vc = vinnu.getContext('2d', { willReadFrequently: true });
    vc.fillStyle = '#fff'; vc.fillRect(0, 0, W, H);
    vc.imageSmoothingEnabled = true; vc.imageSmoothingQuality = 'high';
    vc.drawImage(mynd, 0, 0, W, H);
    const d = vc.getImageData(0, 0, W, H), px = d.data, gra = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < W * H; i++, j += 4) gra[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8;
    let g = hreinsaGogn(gra, W, H, o);
    const thykkir = g.veggir;   // fyrsta gríman (dökkt OG þykkt) — 3D les veggi úr henni þótt þekjan sé lág (veggirUrGrimu)
    // Þunnlínu-CAD (Skútuvogur / Fiskislóð): sjálfgefin opnun étur 1–2 px veggi og
    // þekjan lendir í ~1%. Reynum ljósara blek + fyllingu tvöfaldra veggja AÐEINS
    // þegar fótspor hússins lítur út eins og hús — annars slitrur, ekki 3D.
    if (g.thekja < 0.04 && !o.thykkt && !o.fylla) {
      const g2 = hreinsaGogn(gra, W, H, { dokkt: 210, thykkt: 1, fylla: true });
      let fot = 0;
      for (let i = 0; i < g2.fotspor.length; i++) fot += g2.fotspor[i];
      const hluti = fot / (W * H);
      if (g2.thekja >= 0.04 && hluti >= 0.08 && hluti <= 0.88) g = g2;
    }
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
    return { strigi, vinnu, veggir: g.veggir, thykkir, gra, fotspor: g.fotspor, W, H, kvardi, thekja: g.thekja, thykkt: g.thykkt };
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
      b[y * w + x] = m < 205 ? 1 : 0;
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
    // 0,92 (var 0,80): A0-grunnmynd með ~10% spássíu átti áður að lenda hér og fór ósokkin.
    if (ut.w * ut.h > 0.92 || ut.w < 0.08 || ut.h < 0.08) return null;
    return ut;
  }

  /** Minnsti rammi um blek. Þegar finnaHus skilar null (þunnar grálínur, stórt hvítt blað)
   * skerum við samt auða spássíu svo húsið fylli rammann — þekjan er þá mæld á húsinu, ekki á A0. */
  function blekRammi(gra, W, H, dokkt) {
    dokkt = dokkt == null ? 210 : dokkt;
    let x0 = W, y0 = H, x1 = -1, y1 = -1, n = 0;
    for (let y = 0; y < H; y++) {
      const rod = y * W;
      for (let x = 0; x < W; x++) {
        if (gra[rod + x] < dokkt) {
          n++;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (n < Math.max(40, W * H * 0.0004) || x1 < x0) return null;
    const pad = Math.max(6, Math.round(Math.max(W, H) * 0.018));
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
    x1 = Math.min(W, x1 + pad + 1); y1 = Math.min(H, y1 + pad + 1);
    const ut = { x: x0 / W, y: y0 / H, w: (x1 - x0) / W, h: (y1 - y0) / H };
    if (ut.w * ut.h > 0.94 || ut.w < 0.08 || ut.h < 0.08) return null;
    return ut;
  }

  // Dökkt blek = veggir. Grá lóð (oft 150–200) er EKKI veggur — annars verður lóðin
  // gólfplata í 3D og efri hæðin fyllir gluggann („draugur").
  const DOKKT_HUS = 130;
  const GRA_MIN = 135;
  const GRA_MAX = 215;
  const erGraLod = l => l >= GRA_MIN && l <= GRA_MAX;

  /** Flóðfylling utan frá: 1 = UTAN hússins. Aðeins DÖKKT blek lokar; grá lóð er opin. */
  function utiMaska(gra, W, H) {
    const dokkt = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) dokkt[i] = gra[i] < DOKKT_HUS ? 1 : 0;
    // Lítil lokun: loka 1–2 px rifum í veggjum. r≈max/80 innsiglaði strikuð
    // lóðarmörk og hélt gráa fletinum inni sem „hús" (draugaplatan).
    const r = Math.max(2, Math.round(Math.max(W, H) / 220));
    const lokad = erode(dilate(dokkt, W, H, r), W, H, r);
    const uti = new Uint8Array(W * H), st = new Int32Array(W * H);
    let top = 0;
    const yta = p => { if (!lokad[p] && !uti[p]) { uti[p] = 1; st[top++] = p; } };
    for (let x = 0; x < W; x++) { yta(x); yta((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { yta(y * W); yta(y * W + W - 1); }
    while (top) {
      const p = st[--top], px = p % W, py = (p - px) / W;
      if (px > 0) yta(p - 1); if (px < W - 1) yta(p + 1); if (py > 0) yta(p - W); if (py < H - 1) yta(p + W);
    }
    return uti;
  }

  /** 3D-gólf: upprunalega teikningin með GÖTUM á gráu lóðarflatarmáli.
   * Ekki hússkilgreining — það át CAD og herbergi. Aðeins grátt (150–200) hverfur. */
  function husMaska(gra, W, H) {
    const hus = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) if (!erGraLod(gra[i])) hus[i] = 1;
    return hus;
  }

  /** 3D-gólf: upprunalega teikningin, grá lóð með alpha=0 svo hún sé ekki draugaplata. */
  function golfMedUti(mynd, W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(mynd, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H), px = d.data;
    const gra = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < W * H; i++, j += 4) gra[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8;
    const hus = husMaska(gra, W, H);
    for (let i = 0, j = 0; i < W * H; i++, j += 4) if (!hus[i]) px[j + 3] = 0;
    x.putImageData(d, 0, 0);
    return c;
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

  window.TeiknHreinsun = { hreinsaGogn, hreinsa, finnaHus, blekRammi, utiMaska, husMaska, golfMedUti, flokkaPdfLinur, veljaVeggjaflokk };

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

  /* ── HEILIR VEGGIR úr vigurstrikum ──
   * Agnar 04.10.2026 (skjáskot af Fiskislóð 41 í 3D: veggirnir stóðu eins og girðing): „pæla hvort það sé hægt að ná
   * betri niðurstöðu heldur en við berum með núna."
   *
   * ORSÖKIN var ekki teiknarinn heldur GÖGNIN: CAD teiknar hvern vegg sem TVÆR samsíða línur með endastrikum, brotnar
   * við hverja súlu og hurð — Fiskislóð 41 er 777 strik, helmingur þeirra 7 díla endastrik. Gamla leiðin málaði strikin
   * í grímu og lyfti grímunni í ristarreitum; þaðan kom girðingin.
   * Hér eru strikin PÖRUÐ í veggi (miðlína + þykkt; sama aðferð og TurboPaint lib/board/pdf-veggir.ts), samlínu bútar
   * sameinaðir yfir stutt bil (súlur, ekki hurðir) og endar smelltir á þverveggi svo hornin lokist.
   * Mælt á Fiskislóð 41 (A1, 1:100): 777 strik → 98 pör → 49 veggir, 246 m, húsið 32,9 × 41,2 m.
   * Vikmörkin eru í PUNKTUM blaðsins (pt) eins og í TurboPaint; dílar á pt eru áætlaðir út frá A1 (lengri kantur
   * 2384 pt) — A0 og A2 lenda innan vikmarkanna. */
  const sameinaBil = (bil, vik) => {
    const r = bil.slice().sort((x, y) => x[0] - y[0]), ut = [];
    for (const [a, b] of r) { const s = ut[ut.length - 1]; if (s && a <= s[1] + vik) s[1] = Math.max(s[1], b); else ut.push([a, b]); }
    return ut;
  };
  const dragaFra = (bil, burt) => {
    let ut = bil;
    for (const [c, d] of burt) {
      const n = [];
      for (const [a, b] of ut) { if (d <= a || c >= b) { n.push([a, b]); continue; } if (c > a) n.push([a, c]); if (d < b) n.push([d, b]); }
      ut = n;
    }
    return ut;
  };
  const snidBil = (x, y) => {
    const ut = [];
    for (const [a, b] of x) for (const [c, d] of y) { const s = Math.max(a, c), e = Math.min(b, d); if (e > s) ut.push([s, e]); }
    return ut;
  };
  // Hver hluti línu parast við NÆSTU samsíða línu innan [minT, maxT] og tilheyrir aðeins EINUM vegg.
  function paraVeggi(strik, minT, maxT, minLengd) {
    const hrar = [];
    for (const [x0, y0, x1, y1] of strik) {
      const dx = x1 - x0, dy = y1 - y0;
      if (Math.hypot(dx, dy) < 1) continue;
      let th = Math.atan2(dy, dx);
      if (th < 0) th += Math.PI;
      if (th >= Math.PI - 1e-9) th -= Math.PI;
      const c = Math.cos(th), s = Math.sin(th), t0 = c * x0 + s * y0, t1 = c * x1 + s * y1;
      hrar.push({ th, rho: -s * x0 + c * y0, bil: [[Math.min(t0, t1), Math.max(t0, t1)]] });
    }
    hrar.sort((p, q) => p.th - q.th || p.rho - q.rho);
    const STEFNA = 0.01, hopar = [];
    for (const l of hrar) { const hp = hopar[hopar.length - 1]; if (hp && l.th - hp[hp.length - 1].th < STEFNA) hp.push(l); else hopar.push([l]); }
    // stefna nálægt π er sama og nálægt 0
    if (hopar.length > 1 && Math.PI - hopar[hopar.length - 1][0].th + hopar[0][hopar[0].length - 1].th < STEFNA) {
      const sidast = hopar.pop();
      for (const l of sidast) { l.th -= Math.PI; l.rho = -l.rho; l.bil = l.bil.map(([a, b]) => [-b, -a]); }
      hopar[0].unshift(...sidast);
    }
    const veggir = [];
    for (const hopur of hopar) {
      const th = hopur.reduce((s0, l) => s0 + l.th, 0) / hopur.length, c = Math.cos(th), s = Math.sin(th);
      hopur.sort((p, q) => p.rho - q.rho);
      const linur = [];
      for (const l of hopur) { const f = linur[linur.length - 1]; if (f && l.rho - f.rho < 0.3) f.bil.push(...l.bil); else linur.push({ rho: l.rho, bil: l.bil.slice() }); }
      for (const l of linur) l.bil = sameinaBil(l.bil, 0.5).filter(([a, b]) => b - a >= minLengd * 0.5);
      const por = [];
      for (let i = 0; i < linur.length; i++) for (let j = i + 1; j < linur.length; j++) {
        const d = linur[j].rho - linur[i].rho;
        if (d > maxT) break;
        if (d >= minT) por.push([d, i, j]);
      }
      por.sort((x, y) => x[0] - y[0]);
      const notad = linur.map(() => []);
      for (const [d, i, j] of por) {
        const sam = snidBil(dragaFra(linur[i].bil, notad[i]), dragaFra(linur[j].bil, notad[j])).filter(([a, b]) => b - a >= minLengd);
        if (!sam.length) continue;
        const rho = (linur[i].rho + linur[j].rho) / 2;
        for (const [a, b] of sam) veggir.push({ a: [c * a - s * rho, s * a + c * rho], b: [c * b - s * rho, s * b + c * rho], t: d });
        notad[i].push(...sam); notad[j].push(...sam);
      }
    }
    return veggir;
  }
  // Samlínu bútar verða einn veggur þegar bilið milli þeirra er ≤ `bil` (súla); breiðara bil er hurð og helst opið.
  function sameinaSamlinu(V, bil, vik) {
    const L = [];
    for (const v of V) {
      const dx = v.b[0] - v.a[0], dy = v.b[1] - v.a[1];
      if (Math.hypot(dx, dy) < 0.5) continue;
      let th = Math.atan2(dy, dx);
      if (th < 0) th += Math.PI;
      if (th >= Math.PI - 0.01) th -= Math.PI;
      L.push({ th, a: v.a, b: v.b, t: v.t });
    }
    L.sort((p, q) => p.th - q.th);
    const ut = [];
    for (let i = 0; i < L.length;) {
      let j = i + 1;
      while (j < L.length && L[j].th - L[j - 1].th < 0.01) j++;
      const hopur = L.slice(i, j); i = j;
      const th = hopur.reduce((s0, l) => s0 + l.th, 0) / hopur.length, c = Math.cos(th), s = Math.sin(th);
      const ln = hopur.map(l => {
        const t0 = c * l.a[0] + s * l.a[1], t1 = c * l.b[0] + s * l.b[1];
        return { rho: (-s * l.a[0] + c * l.a[1] - s * l.b[0] + c * l.b[1]) / 2, t0: Math.min(t0, t1), t1: Math.max(t0, t1), t: l.t };
      }).sort((p, q) => p.rho - q.rho);
      for (let a = 0; a < ln.length;) {
        let b = a + 1;
        while (b < ln.length && ln[b].rho - ln[b - 1].rho < vik) b++;
        const rod = ln.slice(a, b).sort((p, q) => p.t0 - q.t0); a = b;
        let nu = null;
        const loka = () => { if (!nu) return; const rho = nu.rs / nu.w; ut.push({ a: [c * nu.t0 - s * rho, s * nu.t0 + c * rho], b: [c * nu.t1 - s * rho, s * nu.t1 + c * rho], t: nu.t }); };
        for (const l of rod) {
          const w = Math.max(1e-6, l.t1 - l.t0);
          if (nu && l.t0 - nu.t1 <= bil) { nu.t1 = Math.max(nu.t1, l.t1); nu.t = Math.max(nu.t, l.t); nu.rs += l.rho * w; nu.w += w; }
          else { loka(); nu = { t0: l.t0, t1: l.t1, t: l.t, rs: l.rho * w, w }; }
        }
        loka();
      }
    }
    return ut;
  }
  // Endi sem stendur innan `vik` frá miðlínu þverveggjar er færður Á hana — þá mætast veggirnir í horninu.
  function smellaHornum(V, vik) {
    if (V.length > 1500) return;
    const lengd = v => Math.hypot(v.b[0] - v.a[0], v.b[1] - v.a[1]);
    const stefna = v => { const Lg = lengd(v) || 1; return [(v.b[0] - v.a[0]) / Lg, (v.b[1] - v.a[1]) / Lg]; };
    for (const A of V) for (const k of ['a', 'b']) {
      const P = A[k], d = stefna(A);
      let best = null;
      for (const B of V) {
        if (B === A) continue;
        const e = stefna(B), kross = d[0] * e[1] - d[1] * e[0];
        if (Math.abs(kross) < 0.3) continue;
        const wx = B.a[0] - A.a[0], wy = B.a[1] - A.a[1], sA = (wx * e[1] - wy * e[0]) / kross;
        const X = [A.a[0] + d[0] * sA, A.a[1] + d[1] * sA];
        const u = (X[0] - B.a[0]) * e[0] + (X[1] - B.a[1]) * e[1];
        if (u < -vik || u > lengd(B) + vik) continue;
        const fj = Math.hypot(X[0] - P[0], X[1] - P[1]);
        if (fj <= vik && (!best || fj < best.fj)) best = { fj, X };
      }
      if (best) A[k] = best.X;
    }
  }
  /** Strik [x0,y0,x1,y1] (punktar FRUMMYNDAR) → heilir veggir [ax, ay, bx, by, þykkt] í sömu einingu. */
  function heilirVeggir(strik, frumB, frumH) {
    const k = Math.max(frumB, frumH) / 2384;                 // dílar á pt (A1-forsenda)
    if (!(k > 0) || !strik || !strik.length) return [];
    const pt = strik.map(v => [v[0] / k, v[1] / k, v[2] / k, v[3] / k]);
    const lengd = v => Math.hypot(v.b[0] - v.a[0], v.b[1] - v.a[1]);
    let V = paraVeggi(pt, 1.5, 20, 6);
    // Séu strikin EINFALDAR línur (ekki tvær hliðar veggjar) parast fátt — þá er hvert langt strik veggur.
    let langt = 0, parad = 0;
    for (const s of pt) { const Lg = Math.hypot(s[2] - s[0], s[3] - s[1]); if (Lg >= 6) langt += Lg; }
    for (const v of V) parad += lengd(v);
    if (parad * 2 < langt * 0.4) V = pt.filter(s => Math.hypot(s[2] - s[0], s[3] - s[1]) >= 6).map(s => ({ a: [s[0], s[1]], b: [s[2], s[3]], t: 0 }));
    return fragaVeggi(V, k, 1.2);
  }
  // Sameiginlegur frágangur (einingar: pt): samlínu bútar sameinaðir, horn smellt saman, stubbar felldir → aftur í díla.
  function fragaVeggi(V, k, vik) {
    V = sameinaSamlinu(V, 18, vik);
    smellaHornum(V, 13);
    return V.filter(v => Math.hypot(v.b[0] - v.a[0], v.b[1] - v.a[1]) >= 7).map(v => [v.a[0] * k, v.a[1] * k, v.b[0] * k, v.b[1] * k, v.t * k]);
  }
  /* ── HEILIR VEGGIR úr veggjagrímu (SKANNAÐAR teikningar: Miðgarður, Skútuvogur 4, Norðurhella) ──
   * Skönnun er ein mynd — engin vigurstrik til að para. Veggjagríman (dökkt OG þykkt, hreinsaGogn) var áður lyft beint í
   * ~420 reita rist: veggirnir urðu kubbóttir og hver stafaklessa sem lifði opnunina varð að súlu.
   * Hér er gríman lesin sem það sem hún er — LANGIR, jafnþykkir borðar:
   *   · hver veggjadíll fær lengd lárétta og lóðrétta hlaupsins sem hann situr í; lengra hlaupið segir í hvora áttina
   *     veggurinn liggur (lárétt-legur / lóðrétt-legur) — skáveggir falla í annan hvorn flokkinn eftir halla;
   *   · dæmigerð veggþykkt = miðgildi STYTTRA hlaupsins yfir alla veggjadíla;
   *   · hvert samhangandi svæði í flokki er skannað ÞVERT á stefnu sína: þykkt og miðja í hverjum dálki. Dálkar sem
   *     bólgna (klessa hangir á veggnum) eru teknir út; það sem eftir stendur verður brotalína (Douglas–Peucker) og
   *     hver leggur hennar EINN veggur með miðlínu og þykkt. Beinn veggur verður einn leggur, skáveggur líka, bogi fáir.
   *   · svæði sem er styttra en Lmin eða þykkara en þrjár veggþykktir er ekki veggur: stafir, örvar, húsgögn, flekkir. */
  function veggirUrGrimu(v, W, H) {
    const N = W * H, hl = new Uint16Array(N), vl = new Uint16Array(N);
    for (let y = 0; y < H; y++) {
      const r = y * W;
      for (let x = 0; x < W;) {
        if (!v[r + x]) { x++; continue; }
        let x1 = x; while (x1 < W && v[r + x1]) x1++;
        const L = Math.min(65535, x1 - x);
        for (let i = x; i < x1; i++) hl[r + i] = L;
        x = x1;
      }
    }
    for (let x = 0; x < W; x++) for (let y = 0; y < H;) {
      if (!v[y * W + x]) { y++; continue; }
      let y1 = y; while (y1 < H && v[y1 * W + x]) y1++;
      const L = Math.min(65535, y1 - y);
      for (let i = y; i < y1; i++) vl[i * W + x] = L;
      y = y1;
    }
    const sulur = new Uint32Array(256);
    let fj = 0;
    for (let i = 0; i < N; i++) if (v[i]) { sulur[Math.min(255, Math.min(hl[i], vl[i]))]++; fj++; }
    if (!fj) return null;
    let t = 1, s = 0;
    for (; t < 255; t++) { s += sulur[t]; if (s >= fj / 2) break; }
    const Lmin = Math.max(Math.round(t * 2), Math.round(Math.max(W, H) * 0.008)), tMax = t * 3 + 2;
    const butar = [];
    let tekid = 0;
    const lesa = larett => {
      const m = new Uint8Array(N);
      for (let i = 0; i < N; i++) if (v[i] && (larett ? hl[i] >= vl[i] : vl[i] > hl[i])) m[i] = 1;
      const sv = svaedi(m, W, H), n = sv.listi.length;
      if (!n) return;
      // a = hnit EFTIR veggnum, b = hnit ÞVERT á hann
      const a0 = new Int32Array(n + 1).fill(1e9), a1 = new Int32Array(n + 1).fill(-1);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = sv.merki[y * W + x]; if (!k) continue;
        const a = larett ? x : y;
        if (a < a0[k]) a0[k] = a; if (a > a1[k]) a1[k] = a;
      }
      const byrjun = new Int32Array(n + 2);
      let alls = 0;
      for (let k = 1; k <= n; k++) { byrjun[k] = alls; if (a1[k] - a0[k] + 1 >= Lmin) alls += a1[k] - a0[k] + 1; else a1[k] = -1; }
      byrjun[n + 1] = alls;
      const fjoldi = new Uint16Array(alls), summa = new Float64Array(alls);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = sv.merki[y * W + x]; if (!k || a1[k] < 0) continue;
        const o = byrjun[k] + (larett ? x : y) - a0[k];
        fjoldi[o]++; summa[o] += larett ? y : x;
      }
      for (let k = 1; k <= n; k++) {
        if (a1[k] < 0) continue;
        const o0 = byrjun[k], len = a1[k] - a0[k] + 1;
        const rad = Array.from(fjoldi.subarray(o0, o0 + len)).filter(c => c > 0).sort((p, q) => p - q);
        const mid = rad[rad.length >> 1];
        if (!mid || mid > tMax * 1.45) continue;                       // flekkur, ekki veggur
        const hamark = Math.max(mid * 1.7, mid + 2);
        for (let i = 0; i < len;) {
          if (!fjoldi[o0 + i] || fjoldi[o0 + i] > hamark) { i++; continue; }
          let j = i; while (j < len && fjoldi[o0 + j] && fjoldi[o0 + j] <= hamark) j++;
          if (j - i >= Lmin && j - i >= mid * 2) {
            // miðjur dálkanna → brotalína
            const P = [];
            const skref = Math.max(2, Math.round(mid / 2));
            for (let q = i; q < j; q += skref) {
              const e = Math.min(j, q + skref); let sb = 0, sc = 0;
              for (let z = q; z < e; z++) { sb += summa[o0 + z]; sc += fjoldi[o0 + z]; }
              P.push([(q + e) / 2, sb / sc + 0.5, sc / (e - q)]);
            }
            P[0][0] = i; P[P.length - 1][0] = j;
            const vik = 1.2 + mid * 0.12, halda = new Uint8Array(P.length); halda[0] = halda[P.length - 1] = 1;
            const st = [[0, P.length - 1]];
            while (st.length) {
              const [p, q] = st.pop(); let mest = 0, hvar = -1;
              const dx = P[q][0] - P[p][0], dy = P[q][1] - P[p][1], L = Math.hypot(dx, dy) || 1;
              for (let z = p + 1; z < q; z++) { const d = Math.abs((P[z][0] - P[p][0]) * dy - (P[z][1] - P[p][1]) * dx) / L; if (d > mest) { mest = d; hvar = z; } }
              if (mest > vik) { halda[hvar] = 1; st.push([p, hvar], [hvar, q]); }
            }
            let fyrri = 0;
            for (let z = 1; z < P.length; z++) {
              if (!halda[z]) continue;
              const A = P[fyrri], B = P[z], halli = (B[1] - A[1]) / Math.max(1e-6, B[0] - A[0]);
              let th = 0; for (let w = fyrri; w <= z; w++) th += P[w][2];
              th = (th / (z - fyrri + 1)) / Math.sqrt(1 + halli * halli);
              if (Math.hypot(B[0] - A[0], B[1] - A[1]) >= Lmin * 0.6) butar.push(larett ? [a0[k] + A[0], A[1], a0[k] + B[0], B[1], th] : [A[1], a0[k] + A[0], B[1], a0[k] + B[0], th]);
              fyrri = z;
            }
            for (let z = i; z < j; z++) tekid += fjoldi[o0 + z];
          }
          i = j;
        }
      }
    };
    lesa(true); lesa(false);
    return { butar, thykkt: t, lmin: Lmin, hlutfall: tekid / fj };
  }
  /** Veggjagríma (vinnudílar, kvarði = vinnudílar á díl skornu myndarinnar) → heilir veggir í dílum SKORNU myndarinnar,
   *  eða null ef gríman er ekki veggjanet (of fátt fannst — kallarinn heldur þá gömlu leiðinni). */
  function heilirUrGrimu(grima, W, H, kvardi, frumB, frumH) {
    const g = veggirUrGrimu(grima, W, H);
    if (!g || g.butar.length < 6 || g.hlutfall < 0.5) return null;
    const k = Math.max(frumB, frumH) / 2384, f = 1 / kvardi / k;
    const V = fragaVeggi(g.butar.map(v => ({ a: [v[0] * f, v[1] * f], b: [v[2] * f, v[3] * f], t: v[4] * f })), k, 2);
    let lengd = 0;
    for (const v of V) lengd += Math.hypot(v[2] - v[0], v[3] - v[1]);
    return lengd * kvardi >= Math.max(W, H) * 2 ? V : null;
  }
  /* ── GLER: gluggar og glerveggir í bilum milli veggbúta ──
   * Agnar 04.10.2026 (Fiskislóð 41 í 3D): „Some walls still missing". Steyptu veggirnir voru allir komnir — það sem
   * vantaði var GLERIÐ: framhliðin er stoðir með glerjun á milli, og glerjun er teiknuð sem tvær eða fleiri þunnar
   * samsíða línur í veggjalínunni (í sama línuflokki og húsgögn og málsetning, svo hún finnst ekki sem veggur).
   * Reglan er lesin af MYNDINNI og gildir því líka um skannanir: bil milli tveggja veggbúta Á SÖMU LÍNU er gler ef
   * þversnið veggjarins sýnir ≥ 2 aðskildar dökkar línur eftir mestallri lengd bilsins. Hurðargat er autt (hurðin
   * stendur opin til hliðar) og áslína sem liggur í gegnum gat er aðeins EIN lína — hvorugt verður gler. */
  function glerIBilum(butar, gra, W, H, kvardi, k) {
    const minBil = 8 * k, maxBil = 260 * k, vik = 2 * k, ut = [], L = [];
    for (const v of butar) {
      const dx = v[2] - v[0], dy = v[3] - v[1];
      if (Math.hypot(dx, dy) < 1) continue;
      let th = Math.atan2(dy, dx);
      if (th < 0) th += Math.PI;
      if (th >= Math.PI - 0.01) th -= Math.PI;
      L.push({ th, v });
    }
    L.sort((p, q) => p.th - q.th);
    const sjalfg = 3 * k;
    for (let i = 0; i < L.length;) {
      let j = i + 1;
      while (j < L.length && L[j].th - L[j - 1].th < 0.01) j++;
      const hopur = L.slice(i, j); i = j;
      const th = hopur.reduce((s0, o) => s0 + o.th, 0) / hopur.length, c = Math.cos(th), s = Math.sin(th);
      const ln = hopur.map(o => {
        const v = o.v, t0 = c * v[0] + s * v[1], t1 = c * v[2] + s * v[3];
        return { rho: (-s * v[0] + c * v[1] - s * v[2] + c * v[3]) / 2, t0: Math.min(t0, t1), t1: Math.max(t0, t1), t: v[4] || sjalfg };
      }).sort((p, q) => p.rho - q.rho);
      for (let a = 0; a < ln.length;) {
        let b = a + 1;
        while (b < ln.length && ln[b].rho - ln[b - 1].rho < vik) b++;
        const rod = ln.slice(a, b).sort((p, q) => p.t0 - q.t0); a = b;
        let fyrri = rod[0];
        for (let z = 1; z < rod.length; z++) {
          const nu = rod[z], bil = nu.t0 - fyrri.t1;
          if (bil >= minBil && bil <= maxBil) {
            const rho = (fyrri.rho + nu.rho) / 2, t = Math.max(fyrri.t, nu.t), half = Math.ceil(t * kvardi / 2) + 2;
            let n = 0, tvo = 0;
            for (let u = fyrri.t1 + 2 / kvardi; u < nu.t0 - 2 / kvardi; u += 1 / kvardi) {
              const mx = (c * u - s * rho) * kvardi, my = (s * u + c * rho) * kvardi;
              let hlaup = 0, inni = false;
              for (let w = -half; w <= half; w++) {
                const gx = Math.round(mx - s * w), gy = Math.round(my + c * w);
                const d = gx >= 0 && gy >= 0 && gx < W && gy < H && gra[gy * W + gx] < 205;
                if (d && !inni) hlaup++;
                inni = d;
              }
              n++; if (hlaup >= 2) tvo++;
            }
            if (n >= 3 && tvo >= n * 0.6) ut.push([c * fyrri.t1 - s * rho, s * fyrri.t1 + c * rho, c * nu.t0 - s * rho, s * nu.t0 + c * rho, t]);
          }
          if (nu.t1 > fyrri.t1) fyrri = nu;
        }
      }
    }
    return ut;
  }
  // Bútar klipptir við skurðinn og færðir í hnit SKORNU myndarinnar.
  function klippaButa(butar, sk) {
    const ut = [], x0 = sk.x, y0 = sk.y, x1 = sk.x + sk.w, y1 = sk.y + sk.h;
    for (const v of butar) {
      const dx = v[2] - v[0], dy = v[3] - v[1];
      let t0 = 0, t1 = 1, inni = true;
      for (const [p, q] of [[-dx, v[0] - x0], [dx, x1 - v[0]], [-dy, v[1] - y0], [dy, y1 - v[1]]]) {
        if (p === 0) { if (q < 0) { inni = false; break; } continue; }
        const r = q / p;
        if (p < 0) { if (r > t1) { inni = false; break; } if (r > t0) t0 = r; }
        else { if (r < t0) { inni = false; break; } if (r < t1) t1 = r; }
      }
      if (!inni || (t1 - t0) * Math.hypot(dx, dy) < 2) continue;
      ut.push([v[0] + dx * t0 - x0, v[1] + dy * t0 - y0, v[0] + dx * t1 - x0, v[1] + dy * t1 - y0, v[4] || 0]);
    }
    return ut;
  }

  const BAKGRUNNUR_3D = 0xdcd9d2, VEGGLITUR_3D = 0xf2eee6;

  /** gamur: element sem sýnin fyllir. haedir: [{ veggir, W, H, golf:<canvas>, kvardi, merki:[{x,y,litur,texti}], butar? }]
   *  (merki í punktum SKORNU myndarinnar). butar = heilir veggir [ax,ay,bx,by,þykkt] í sömu punktum — einn kassi á vegg;
   *  gler = glerfletir í sömu mynd (aðeins teiknaðir með heilum veggjum);
   *  án þeirra er gríman (`veggir`) lyft í ristarreitum eins og áður. */
  async function syna3d(gamur, gogn) {
    await saekjaThree();
    const T = window.THREE, haedir = (gogn && gogn.haedir) || [];
    if (!haedir.length) throw new Error('Engin hæð til að sýna');
    const b = gamur.clientWidth || 800, h = gamur.clientHeight || 500;
    const teiknari = new T.WebGLRenderer({ antialias: true, alpha: false });
    teiknari.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    teiknari.setSize(b, h); teiknari.setClearColor(BAKGRUNNUR_3D);
    teiknari.shadowMap.enabled = true; teiknari.shadowMap.type = T.PCFSoftShadowMap;
    teiknari.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
    gamur.appendChild(teiknari.domElement);
    const svid = new T.Scene();
    svid.add(new T.HemisphereLight(0xffffff, 0xbdb8ae, 0.8));
    const sol = new T.DirectionalLight(0xffffff, 0.6); svid.add(sol); svid.add(sol.target);
    const losa = [], veggEfni = [], sporEfni = [], lag = [], midar = [];
    let staerst = 1, haedY = 0, vidmid = null, heilir = 0;
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
      // Gegnsætt UTAN húss (golfMedUti) + alphaTest svo grá lóð sé ekki draugaplata.
      // Efri hæðir fá hálfgagnsætt gólf INNI — annars hylur efsta hæðin allar hinar ofan frá.
      const golfG = new T.PlaneGeometry(k.gw, k.gh), golfE = new T.MeshBasicMaterial({ map: aferd, side: T.DoubleSide, transparent: true, opacity: nr > 0 ? 0.42 : 1, depthWrite: nr === 0, alphaTest: 0.05 });
      const golf = new T.Mesh(golfG, golfE); golf.rotation.x = -Math.PI / 2; hopur.add(golf);
      losa.push(golfG, golfE, aferd); lag.push({ hopur, golfE, nr });
      // Skuggafangari rétt ofan við gólfið: gólfið er ólýst mynd (skýr teikning) og tekur því ekki skugga sjálft.
      const skE = new T.ShadowMaterial({ opacity: 0.2 }), skuggi = new T.Mesh(golfG, skE);
      skuggi.rotation.x = -Math.PI / 2; skuggi.position.y = 0.2; skuggi.receiveShadow = true; hopur.add(skuggi);
      losa.push(skE);
      // Veggir: eitt InstancedMesh — eitt teiknikall fyrir alla kassana.
      const f = hd.kvardi / k.c;   // punktar skornu myndarinnar → ristarreitir
      const kG = new T.BoxGeometry(1, 1, 1), kE = new T.MeshLambertMaterial({ color: VEGGLITUR_3D });
      const m = new T.Matrix4();
      let veggir;
      if (hd.butar && hd.butar.length) {
        // HEILIR VEGGIR: einn kassi á vegg, lengdur um hálfa þykkt í hvorn enda svo hornin fyllist.
        const sjalfg = Math.max(k.gw, k.gh) * 0.004, q = new T.Quaternion(), ofan = new T.Vector3(0, 1, 0), st = new T.Vector3(), kv3 = new T.Vector3();
        veggir = new T.InstancedMesh(kG, kE, hd.butar.length);
        hd.butar.forEach((v, i) => {
          const ax = v[0] * f - k.gw / 2, az = v[1] * f - k.gh / 2, bx = v[2] * f - k.gw / 2, bz = v[3] * f - k.gh / 2;
          const th = Math.max(0.8, (v[4] || 0) * f || sjalfg);
          q.setFromAxisAngle(ofan, -Math.atan2(bz - az, bx - ax));
          m.compose(st.set((ax + bx) / 2, veggH / 2, (az + bz) / 2), q, kv3.set(Math.hypot(bx - ax, bz - az) + th, veggH, th));
          veggir.setMatrixAt(i, m);
        });
        veggir.count = hd.butar.length; heilir += hd.butar.length;
        // Spor veggjanna á gólfinu: dökk rönd sem sést aðeins þegar veggirnir eru gegnsæir — annars hverfa þeir alveg.
        const spE = new T.MeshBasicMaterial({ color: 0x4a443c }), spor = new T.InstancedMesh(kG, spE, hd.butar.length), flatt = new T.Matrix4().makeScale(1, 0.012, 1);
        for (let i = 0; i < hd.butar.length; i++) { veggir.getMatrixAt(i, m); m.premultiply(flatt); m.elements[13] = 0.3; spor.setMatrixAt(i, m); }
        spor.instanceMatrix.needsUpdate = true; spor.visible = false; hopur.add(spor);
        losa.push(spE); sporEfni.push(spor);
        // Gler (gluggar, glerveggir): hálfgagnsæir bláleitir fletir í bilunum — húsið lokast en sést í gegn.
        if (hd.gler && hd.gler.length) {
          const gE = new T.MeshLambertMaterial({ color: 0x8fc3e8, transparent: true, opacity: 0.42, depthWrite: false });
          const glerM = new T.InstancedMesh(kG, gE, hd.gler.length);
          hd.gler.forEach((v, i) => {
            const ax = v[0] * f - k.gw / 2, az = v[1] * f - k.gh / 2, bx = v[2] * f - k.gw / 2, bz = v[3] * f - k.gh / 2;
            q.setFromAxisAngle(ofan, -Math.atan2(bz - az, bx - ax));
            m.compose(st.set((ax + bx) / 2, veggH / 2, (az + bz) / 2), q, kv3.set(Math.hypot(bx - ax, bz - az), veggH, Math.max(0.5, ((v[4] || 0) * f || sjalfg) * 0.45)));
            glerM.setMatrixAt(i, m);
          });
          glerM.instanceMatrix.needsUpdate = true; glerM.renderOrder = 2; hopur.add(glerM);
          losa.push(gE);
        }
      } else {
        veggir = new T.InstancedMesh(kG, kE, Math.max(1, k.kassar.length));
        k.kassar.forEach((r, i) => {
          m.makeScale(r.b, veggH, r.h);
          m.setPosition(r.x + r.b / 2 - k.gw / 2, veggH / 2, r.y + r.h / 2 - k.gh / 2);
          veggir.setMatrixAt(i, m);
        });
        veggir.count = k.kassar.length;
      }
      veggir.instanceMatrix.needsUpdate = true; veggir.castShadow = true; veggir.receiveShadow = true; hopur.add(veggir);
      losa.push(kG, kE); veggEfni.push(kE);
      // Merki: stöng + kúla + miði. Miðinn heldur stærð sinni á skjánum (læsilegur í hvaða aðdrætti sem er) og tæki sem
      // standa þétt fá misháar stangir svo miðarnir leggist ekki hver ofan á annan.
      const merki = hd.merki || [], naerri = Math.max(k.gw, k.gh) * 0.07;
      merki.forEach((mk, nrM) => {
        const gx = mk.x * f - k.gw / 2, gz = mk.y * f - k.gh / 2;
        const litur = new T.Color(mk.litur || '#c93c1d'), rad = Math.max(k.gw, k.gh) * 0.012;
        let grannar = 0;
        for (let j = 0; j < nrM; j++) if (Math.hypot(merki[j].x - mk.x, merki[j].y - mk.y) * f < naerri) grannar++;
        const toppur = veggH * (1.55 + grannar * 0.85);
        const sG = new T.CylinderGeometry(rad * 0.16, rad * 0.16, toppur, 8), sE = new T.MeshLambertMaterial({ color: litur });
        const stong = new T.Mesh(sG, sE); stong.position.set(gx, toppur / 2, gz); hopur.add(stong);
        const kG2 = new T.SphereGeometry(rad, 20, 14), kE2 = new T.MeshLambertMaterial({ color: litur, emissive: litur, emissiveIntensity: 0.35 });
        const kula = new T.Mesh(kG2, kE2); kula.position.set(gx, toppur + rad, gz); kula.castShadow = true; hopur.add(kula);
        losa.push(sG, sE, kG2, kE2);
        if (mk.texti) {
          const txt = String(mk.texti).slice(0, 18), letur = '700 34px system-ui,sans-serif';
          const ms = document.createElement('canvas');
          let mc = ms.getContext('2d'); mc.font = letur;
          ms.width = Math.ceil(mc.measureText(txt).width) + 46; ms.height = 64;
          mc = ms.getContext('2d');
          const bw = ms.width - 4, bh = 60, rr = 16;
          mc.beginPath(); mc.moveTo(2 + rr, 2); mc.arcTo(2 + bw, 2, 2 + bw, 2 + bh, rr); mc.arcTo(2 + bw, 2 + bh, 2, 2 + bh, rr); mc.arcTo(2, 2 + bh, 2, 2, rr); mc.arcTo(2, 2, 2 + bw, 2, rr); mc.closePath();
          mc.fillStyle = '#' + litur.getHexString(); mc.fill();
          mc.lineWidth = 3; mc.strokeStyle = 'rgba(255,255,255,.9)'; mc.stroke();
          mc.fillStyle = (litur.r * 0.299 + litur.g * 0.587 + litur.b * 0.114) > 0.62 ? '#14120f' : '#fff';
          mc.font = letur; mc.textAlign = 'center'; mc.textBaseline = 'middle'; mc.fillText(txt, ms.width / 2, 34);
          const mA = new T.CanvasTexture(ms), mE = new T.SpriteMaterial({ map: mA, depthTest: false, sizeAttenuation: false });
          const midi = new T.Sprite(mE);
          midi.center.set(0.5, -0.2); midi.renderOrder = 10;
          midi.position.set(gx, toppur + rad * 2, gz); hopur.add(midi);
          losa.push(mA, mE); midar.push({ midi, hlutfall: ms.width / ms.height });
        }
      });
      haedY += bil;
    });
    // Sól: ein skuggavarpandi ljóslind yfir allt húsið.
    const R = staerst * 0.78;
    sol.position.set(-R * 0.8, haedY + R * 1.5, R * 0.65); sol.target.position.set(0, 0, 0);
    sol.castShadow = true; sol.shadow.mapSize.set(2048, 2048); sol.shadow.bias = -0.0006; sol.shadow.radius = 3;
    const sc = sol.shadow.camera; sc.left = -R * 1.1; sc.right = R * 1.1; sc.top = R * 1.1; sc.bottom = -R * 1.1; sc.near = 1; sc.far = R * 5 + haedY * 2; sc.updateProjectionMatrix();
    // Myndavél á braut um miðjuna: draga = snúa · hjól/klípa = aðdráttur · hægri/shift-draga eða tveir fingur = færa.
    const vel = new T.PerspectiveCamera(42, b / h, 0.1, staerst * 20 + haedY * 6);
    const mid = new T.Vector3(0, haedY * 0.4, 0);
    let theta = -0.6, phi = 0.95, fjarl = Math.max(staerst * 1.25, haedY * 2.3);
    function stillaVel() {
      phi = Math.min(1.5, Math.max(0.12, phi)); fjarl = Math.min(staerst * 6 + haedY * 2, Math.max(staerst * 0.12, fjarl));
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
    // Miðar eru 26 px háir á skjánum óháð aðdrætti og gluggastærð (sizeAttenuation:false → hæð = kvarði × 1,302 × gluggahæð við 42° sjónhorn).
    const stillaMida = hh => { const mh = 26 / (1.302 * Math.max(200, hh)); midar.forEach(o => o.midi.scale.set(mh * o.hlutfall, mh, 1)); };
    const staerd = () => { const w = gamur.clientWidth || 800, hh = gamur.clientHeight || 500; teiknari.setSize(w, hh); vel.aspect = w / hh; vel.updateProjectionMatrix(); stillaMida(hh); };
    window.addEventListener('resize', staerd);
    stillaMida(h);
    stillaVel();
    let lifir = true, raf = 0;
    const lykkja = () => { if (!lifir) return; teiknari.render(svid, vel); raf = requestAnimationFrame(lykkja); };
    lykkja();
    return {
      kassar: haedir.length,
      heilir,
      // Gegnsæir veggir: tækin og teikningin sjást í gegnum húsið.
      gegnsaett(a) {
        veggEfni.forEach(e => { e.transparent = !!a; e.opacity = a ? 0.4 : 1; e.depthWrite = !a; e.color.setHex(a ? 0x9d978c : VEGGLITUR_3D); e.needsUpdate = true; });
        sporEfni.forEach(o => { o.visible = !!a; });
      },
      // Ein hæð í einu (nr) eða allar (null). Stök efri hæð fær heilt gólf — hún hylur þá ekkert.
      syna(nr) {
        lag.forEach(o => { const ein = nr === o.nr; o.hopur.visible = nr == null || ein; o.golfE.opacity = (o.nr > 0 && !ein) ? 0.42 : 1; o.golfE.depthWrite = o.nr === 0 || ein; o.golfE.needsUpdate = true; });
        mid.y = nr == null ? haedY * 0.4 : lag[nr] ? lag[nr].hopur.position.y : 0;
        fjarl = nr == null ? Math.max(staerst * 1.25, haedY * 2.3) : staerst * 1.25; stillaVel();
      },
      loka() {
        lifir = false; cancelAnimationFrame(raf); window.removeEventListener('resize', staerd);
        losa.forEach(x => { try { x.dispose(); } catch (_) {} });
        try { teiknari.dispose(); teiknari.forceContextLoss && teiknari.forceContextLoss(); } catch (_) {}
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    };
  }

  window.Teikn3D = { syna: syna3d, kassarUrGrimu, heilirVeggir };

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

  // „Skýrari veggir" og stillingar hennar fylgja TEIKNINGUNNI á þjóninum (haedir[].syn), ekki vafranum — Agnar 03.10.2026:
  // „að ég geti bara ýtt á skýrari veggir, cutt utan húsnæðis og það sé bara þannig". localStorage er aðeins varaleið
  // fyrir teikningar sem voru stilltar áður en stillingin fór á þjóninn.
  const LYKILL = cid => 'teikn_hreinsun_' + cid;
  const lesaVal = cid => {
    try {
      const hs = FPx() && FPx().plans && FPx().plans[cid] && FPx().plans[cid].haedir;
      const m = Array.isArray(hs) && hs.find(h => h && h.syn && typeof h.syn === 'object');
      if (m) return Object.assign({}, m.syn);
    } catch (_) {}
    try { return JSON.parse(localStorage.getItem(LYKILL(cid)) || 'null') || {}; } catch (_) { return {}; }
  };
  const vistaVal = (cid, v) => {
    try { localStorage.setItem(LYKILL(cid), JSON.stringify(v)); } catch (_) {}
    try {
      const hs = FPx().plans[cid] && FPx().plans[cid].haedir, nytt = JSON.stringify(v || {});
      let breytt = false;
      if (Array.isArray(hs)) hs.forEach(h => { if (JSON.stringify(h.syn || {}) !== nytt) { h.syn = JSON.parse(nytt); breytt = true; } });
      if (breytt) vistaSjalfkrafa('stillingin geymist');
    } catch (_) {}
  };
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
    syn3d: null, vakt: 0, raf: 0, teiknad: '',
    minni: {},             // unnin Skýrari-mynd per hæð — svo skipti endurreikni ekki
    skipti: 0              // kynslóð hæðaflips — gamlar PDF-sóknið deyja
  };

  const FPx = () => window.FloorPlan;

  // SJÁLFVISTUN: skurður, „Skýrari veggir", veggir lesnir úr PDF og handdregnir veggir fara á þjóninn um leið — annars
  // var allt reiknað og lesið upp á nýtt við hverja opnun og á hverri vél („gríðarlega mikið af endurtekinni vinnu").
  // Sama skrif og fyrir TurboPaint (vistaHaedirFyrirTurboPaint): öll hæðin eins og hún stendur á skjánum.
  // ÖRYGGI (04.10.2026): sjálfvistun snertir ALDREI tækin né hæðalistann — aðeins stillingar hverrar hæðar (skurður,
  // Skýrari/fest, veggir) eru skrifaðar inn í FERSKA röð þjónsins. Tæki vistast áfram aðeins með 💾 Vista. Og ekkert er
  // vistað fyrr en röð þjónsins hefur borist glugganum, svo gamalt staðbundið eintak getur aldrei skrifað yfir hana.
  const STILLINGAR = ['skurdur', 'sjalf', 'thett', 'syn', 'veggir', 'pdfVeggir', 'pdfFlokkar'];
  let _sjalfvistBid = 0;
  function vistaSjalfkrafa(astaeda) {
    clearTimeout(_sjalfvistBid);
    _sjalfvistBid = setTimeout(async () => {
      try {
        const FP = FPx(), cid = FP && FP.companyId;
        if (!cid || !modalSynnilegt() || G.rodKomin !== cid || !window.DB || !DB.sb) return;
        const r = await DB.sb.from('teikning_bord').select('haedir').eq('company_id', cid).limit(1);
        if (r.error || !r.data || !r.data.length || !Array.isArray(r.data[0].haedir) || !r.data[0].haedir.length) return;
        const minar = {}; haedir().forEach(h => { if (h && h.id) minar[h.id] = h; });
        let breytt = 0;
        const nyjar = r.data[0].haedir.map(sh => {
          const m = sh && minar[sh.id];
          if (!m || (m.image_url || null) !== (sh.image_url || null)) return sh;
          const n = Object.assign({}, sh);
          STILLINGAR.forEach(k => {
            if (m[k] === undefined) return;
            if (JSON.stringify(m[k]) !== JSON.stringify(sh[k])) { n[k] = JSON.parse(JSON.stringify(m[k])); breytt++; }
          });
          return n;
        });
        if (!breytt) return;
        const u = await DB.sb.from('teikning_bord').update({ haedir: nyjar, updated_at: new Date().toISOString() }).eq('company_id', cid).select('company_id');
        if (u.error || !u.data || !u.data.length) throw new Error((u.error && u.error.message) || 'ekkert skrifað');
        segja('✓ Vistað' + (astaeda ? ' — ' + astaeda : ''));
      } catch (e) { console.warn('[383] sjálfvistun', e); }
    }, 1200);
  }
  function fpGluggi() { return document.getElementById('modal-floorplan'); }
  function fpEl(id) {
    const m = fpGluggi();
    const i = m && m.querySelector('#' + id);
    return i || document.getElementById(id);
  }
  // cab96432 festi aðeins þegar companyId breyttist. FloorPlan.open rífur
  // gluggann ALLTAF (old.remove + nýtt #modal-floorplan) — líka fyrir SAMA
  // félag. Þá sat _festCid eftir og hnappar/flipar lentu á dauðum hnútum
  // eða komust aldrei inn í nýja hausinn. Nú ræður HNÚTURINN.
  function endurfestaEfNyttFelag() {
    const m = fpGluggi();
    const FP = FPx();
    const cid = FP && FP.companyId;
    if (!m) return;
    if (G._festModal === m && G._festCid === cid) return;
    G._festModal = m;
    G._festCid = cid;
    G.soknKom = 0;
    // ATH: main._t383 er EKKI hreinsað hér lengur. Sami #fp-main lifir milli opnana; hreinsunin lét tengjaStriga
    // bæta við nýju setti af pointer-hlustum við hverja opnun — fingurinn dró teikninguna 2×, 3×… hraðar
    // (mælt 04.10.2026: 11 pointermove → 20 færslur). Nýr hnútur (remount) ber ekki merkið og tengist sjálfur.
    const f = document.getElementById('fp-haedir');
    if (f && !m.contains(f)) { f._html = ''; f.remove(); }
    const z = document.getElementById('fp-zoom');
    if (z && !m.contains(z)) z.remove();
  }
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
  function sameinaHaedir(gamlar, nyjar) {
    if (!Array.isArray(nyjar) || !nyjar.length) return gamlar || null;
    const byId = {};
    (gamlar || []).forEach(h => { if (h && h.id) byId[h.id] = h; });
    return nyjar.map(n => {
      const g = n && n.id && byId[n.id];
      if (!g) return n;
      if ((g.image_url || null) !== (n.image_url || null)) return n;
      return Object.assign({}, n, {
        veggir: (n.veggir && n.veggir.length) ? n.veggir : g.veggir,
        pdfVeggir: (n.pdfVeggir && n.pdfVeggir.length) ? n.pdfVeggir : g.pdfVeggir,
        veggjaLinur: (n.veggjaLinur && n.veggjaLinur.length) ? n.veggjaLinur : g.veggjaLinur,
        syn: n.syn || g.syn,
        pdfFlokkar: n.pdfFlokkar || g.pdfFlokkar,
        skurdur: n.skurdur || g.skurdur,
        sjalf: n.sjalf != null ? n.sjalf : g.sjalf,
        thett: n.thett || g.thett,
        pdfReynt: g.pdfReynt,
        stimpilStaerd: n.stimpilStaerd || g.stimpilStaerd
      });
    });
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
    const erTaeki = m => m && m.kind !== 'sign' && m.unitId != null && String(m.unitId).indexOf('s:') !== 0;
    const her = {}; h.markers.forEach(m => { if (erTaeki(m)) her[m.unitId] = 1; });
    hs.forEach((o, i) => { if (i !== G.virk) o.markers = o.markers.filter(m => !erTaeki(m) || !her[m.unitId]); });
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
      return /\.pdf(\.info)?$/i.test(new URL(inn).pathname) ? '/.netlify/functions/teikn-pdf?url=' + encodeURIComponent(inn) : '';
    } catch (_) { return ''; }
  }
  function beitaPdfFlokkum(h) {
    const valid = Array.isArray(h.pdfFlokkar) ? h.pdfFlokkar : [];
    h.pdfVeggir = G.pdf && G.pdf.haed === h.id ? [].concat(...valid.map(l => G.pdf.flokkar[l] || [])) : h.pdfVeggir;
  }
  function thetturSkurdur(h, iw, ih) {
    if (h.sjalf === false || h.thett || h.pdfVeggir.length <= 30) return false;
    const xs = [], ys = []; h.pdfVeggir.forEach(v => { xs.push(v[0], v[2]); ys.push(v[1], v[3]); });
    xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
    const q = (l, f) => l[Math.min(l.length - 1, Math.max(0, Math.round(f * (l.length - 1))))];
    let x0 = q(xs, 0.02), x1 = q(xs, 0.98), y0 = q(ys, 0.02), y1 = q(ys, 0.98);
    const sp = Math.max(x1 - x0, y1 - y0) * 0.07;
    x0 -= sp; y0 -= sp; x1 += sp; y1 += sp;
    plan().markers.forEach(m => { if (erPx(m)) { const mx = m.x + G.rymi.x, my = m.y + G.rymi.y, s2 = sp * 0.5; x0 = Math.min(x0, mx - s2); y0 = Math.min(y0, my - s2); x1 = Math.max(x1, mx + s2); y1 = Math.max(y1, my + s2); } });
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(iw, x1); y1 = Math.min(ih, y1);
    if (x1 - x0 < 200 || y1 - y0 < 200) return false;
    h.skurdur = { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) }; h.sjalf = true; h.thett = true; zNullstilla();
    return true;
  }
  async function lesaPdfVeggi(sjalfkrafa) {
    const h = virkHaed(), slod = pdfSlod(h), skipti = G.skipti, frum = G.frum;
    if (!slod) { if (!sjalfkrafa) segja('Þessi teikning er ekki PDF úr skjalasafninu — þar er enginn vigur að lesa. Notaðu ✏ til að draga veggina.'); return false; }
    if (!frum || (G.pdfBid && G.pdfBid !== skipti)) return false;
    if (G.pdfBid) return false;
    G.pdfBid = true; stika();
    try {
      await saekjaPdfJs();
      if (G.skipti !== skipti) return false;
      const r = await fetch(slod);
      if (G.skipti !== skipti) return false;
      if (!r.ok) { const v = await r.json().catch(() => null); throw new Error((v && v.error) || ('Svar ' + r.status)); }
      const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await r.arrayBuffer()) }).promise;
      if (G.skipti !== skipti) return false;
      const sida = await doc.getPage(1), vp = sida.getViewport({ scale: 1 }), ol = await sida.getOperatorList();
      const fl = flokkaPdfLinur(window.pdfjsLib.OPS, ol.fnArray, ol.argsArray, vp.transform), val = veljaVeggjaflokk(fl, vp.width, vp.height);
      const iw = frum.naturalWidth || frum.width, ih = frum.naturalHeight || frum.height, kx = iw / vp.width, ky = ih / vp.height;
      if (!val.valinn) throw new Error(val.yfirlit.length ? 'Fann engan línuflokk sem líkist veggjum.' : 'PDF-ið er skönnuð mynd — þar er enginn vigur. Dragðu veggina með ✏.');
      // Myndin er mynd af SÖMU síðu: hlutföllin verða að stemma, annars lenda veggirnir á skjön (snúið blað / önnur síða).
      if (Math.abs(kx / ky - 1) > 0.02) throw new Error('Blaðið í PDF-inu hefur önnur hlutföll en myndin — veggirnir myndu lenda á skjön.');
      if (G.skipti !== skipti) return false;
      const px = {}; Object.keys(fl).forEach(l => { if (+l >= 0.3) px[l] = fl[l].map(v => [Math.round(v[0] * kx), Math.round(v[1] * ky), Math.round(v[2] * kx), Math.round(v[3] * ky)]); });
      G.pdf = { haed: h.id, flokkar: px, yfirlit: val.yfirlit.filter(y => +y.breidd >= 0.3 && y.strik >= 8).slice(0, 5), ptIPx: kx };
      h.pdfFlokkar = [val.valinn]; beitaPdfFlokkum(h);
      if (G.skipti !== skipti) return false;
      // ÞÉTTUR SKURÐUR (Agnar: „croppa kringum byggingu"): blek-klasinn (finnaHus) tekur lóðina og skástrikuð bílastæði
      // með. Veggirnir úr vigrinum segja nákvæmlega hvar húsið er. Aðeins þegar skurðurinn var sjálfvirkur eða enginn —
      // handvalinn skurður notandans stendur. 2.–98. hundraðshluti svo stakt strik úti á lóð dragi kassann ekki út.
      thetturSkurdur(h, iw, ih);
      vistaSjalfkrafa('veggir úr PDF og skurður að húsinu');
      // EI-ábendingar eru ekki lesnar hér lengur — sú greining býr í TurboPaint (vélinni), Agnar 03.10.2026.
      if (!sjalfkrafa) segja('✓ ' + h.pdfVeggir.length + ' veggjastrik lesin úr PDF-inu (línuþykkt ' + val.valinn.replace('.', ',') + ' pt).');
      return true;
    } catch (e) {
      if (!sjalfkrafa) segja('⚠ Las ekki veggi úr PDF: ' + ((e && e.message) || e));
      h.pdfReynt = String((e && e.message) || e);
      return false;
    } finally { if (G.skipti === skipti) { G.pdfBid = false; stika(); } }
  }

  /* ── leiðslan: frummynd → skurður → skýrari veggir ── */
  function skera(mynd, sk) {
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(sk.w)); c.height = Math.max(1, Math.round(sk.h));
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(mynd, -Math.round(sk.x), -Math.round(sk.y));
    return c;
  }
  function reikna(stig1, l, val) {
    const vp = (window.TeiknGaedi && TeiknGaedi.vinnuPx) ? TeiknGaedi.vinnuPx() : 2200;
    const hl = l + '|' + (val.thykkt || 0) + '|' + (val.fylla ? 1 : 0) + '|' + vp;
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
      G.dauft = null; G.dauftLykill = '';
      if (typeof p.imageUrl === 'string' && h.image_url !== p.imageUrl) {
        // Önnur teikning en hæðin átti: skurður og veggir áttu við gömlu myndina.
        if (h.image_url) { h.skurdur = null; h.veggir = []; h.pdfVeggir = []; delete h.veggjaLinur; delete h.pdfFlokkar; delete h.sjalf; G.pdf = null; }
        h.image_url = p.imageUrl;
      }
    }
    if (!G.frum || !nu) { stika(); flipar(); return; }
    // Hæð sem á þegar vigurveggi en ber enn LAUSA sjálfvirka skurðinn (vistuð fyrir þétta skurðinn): þétta einu sinni.
    if (!val.fest && h.pdfVeggir.length > 30 && h.sjalf === true && !h.thett) thetturSkurdur(h, G.frum.naturalWidth || G.frum.width, G.frum.naturalHeight || G.frum.height);
    // SJÁLFGEFINN SKURÐUR AÐ BYGGINGUNNI. Lausari vistaður sjálfskurður má þéttast.
    // Handvalinn skurður (sjalf === false) er ósnertur. Kassinn er víkkaður svo öll
    // merki sem þegar eru til lendi innan hans — sjálfvirkni má aldrei fela staðsetningu.
    // FEST ÚTLIT (Agnar 03.10.2026: „vista takka þegar ég er orðinn sáttur … og það haldist bara“): engin sjálfvirk
    // skurðarleit, enginn PDF-lestur, engin greining — teikningin opnast nákvæmlega eins og hún var fest.
    if (!val.fest && h.sjalf !== false && G.sjalfReynt !== G.frum) {
      G.sjalfReynt = G.frum;
      try {
        const iw = G.frum.naturalWidth || G.frum.width, ih = G.frum.naturalHeight || G.frum.height;
        const kv = Math.min(1, 1300 / Math.max(iw, ih)), W = Math.round(iw * kv), H = Math.round(ih * kv);
        const c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(G.frum, 0, 0, W, H);
        const d = x.getImageData(0, 0, W, H).data, gra = new Uint8Array(W * H);
        for (let i = 0, j = 0; i < W * H; i++, j += 4) gra[i] = (d[j] * 77 + d[j + 1] * 150 + d[j + 2] * 29) >> 8;
        let hus = finnaHus(gra, W, H);
        const rammi = blekRammi(gra, W, H);
        if (!hus) hus = rammi;
        if (hus) {
          let x0 = hus.x * iw, y0 = hus.y * ih, x1 = (hus.x + hus.w) * iw, y1 = (hus.y + hus.h) * ih;
          const sp = Math.max(iw, ih) * 0.02;
          p.markers.forEach(m => { if (erPx(m)) { const mx = m.x + G.rymi.x, my = m.y + G.rymi.y; x0 = Math.min(x0, mx - sp); y0 = Math.min(y0, my - sp); x1 = Math.max(x1, mx + sp); y1 = Math.max(y1, my + sp); } });
          x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(iw, x1); y1 = Math.min(ih, y1);
          const nw = x1 - x0, nh = y1 - y0, gamall = h.skurdur;
          const minni = !gamall || (nw * nh < gamall.w * gamall.h * 0.92);
          if (minni && nw * nh < iw * ih * 0.94 && nw > iw * 0.08 && nh > ih * 0.08) {
            h.skurdur = { x: Math.round(x0), y: Math.round(y0), w: Math.round(nw), h: Math.round(nh) };
            h.sjalf = true; zNullstilla();
            vistaSjalfkrafa('skorið að húsinu');
          }
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
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.globalAlpha = 0.85; x.drawImage(G.stig1, 0, 0);
        G.dauft = c; G.dauftLykill = l1;
      }
      ut = G.dauft;
    } else if (val.a) {
      // 2D sýnir ALLTAF grunnmyndina. r.strigi er slitrur (CAD-snið, nafnreitur) og má
      // ekki skipta teikningunni út. reikna() er aðeins fyrir 3D (G.hrein / veggþykkt).
      if (!val.fest) {
        if (pdfSlod(h) && !h.pdfReynt && !G.pdfBid) { h.pdfReynt = 'sjálfvirkt'; lesaPdfVeggi(true).then(beita); }
        try { reikna(G.stig1, l1, val); } catch (e) { console.warn('[383] reikna', e); }
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
    const main = fpEl('fp-main'); if (!main) return null;
    let s = main.querySelector('#fp-hreinsa-stika') || document.getElementById('fp-hreinsa-stika');
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
        if (a === 'v-buid' || a === 'pdf-eyda' || a === 'pdf-flokkur' || (a === 'v-eyda' && !h.veggir.length)) vistaSjalfkrafa('veggirnir geymast');
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
    else if (skilabod && !G.hamur && !h.pdfVeggir.length) html += '<span style="flex-basis:100%;color:#ffd27a;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(skilabod) + '</span>';
    if (s._html !== html) { s.innerHTML = html; s._html = html; }
    s.style.display = html ? 'flex' : 'none';
  }

  // Hæðaflipar efst til vinstri.
  function flipar() {
    const main = fpEl('fp-main'); if (!main) return;
    let f = main.querySelector('#fp-haedir');
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

  function haedMinniLykill(h) { return String((h && h.id) || '') + '|' + String((h && h.image_url) || ''); }
  function vistaHaedMinni(h) {
    if (!h || !h.id) return;
    G.minni = G.minni || {};
    G.minni[haedMinniLykill(h)] = {
      url: h.image_url || null,
      frum: G.frum, stig1: G.stig1, stig1Lykill: G.stig1Lykill,
      hrein: G.hrein, hreinLykill: G.hreinLykill,
      dauft: G.dauft, dauftLykill: G.dauftLykill,
      lykill: G.lykill, synd: G.synd,
      rymi: { x: G.rymi.x, y: G.rymi.y }
    };
  }
  function saekjaHaedMinni(h) {
    const m = G.minni && G.minni[haedMinniLykill(h)];
    if (!m || (m.url || null) !== (h.image_url || null) || !m.frum) return false;
    G.frum = m.frum; G.stig1 = m.stig1; G.stig1Lykill = m.stig1Lykill;
    G.hrein = m.hrein; G.hreinLykill = m.hreinLykill;
    G.dauft = m.dauft; G.dauftLykill = m.dauftLykill;
    G.lykill = m.lykill; G.synd = m.synd;
    // plan.markers eru nýkomin í FRUMMYNDARHNITUM (G.rymi = 0) — færa þau inn í vistaða skurðinn, ekki bara merkja
    // hliðrunina (þá hoppuðu tækin um skurð hæðarinnar þegar skipt var fram og til baka).
    faeraMerki(m.rymi ? m.rymi.x : 0, m.rymi ? m.rymi.y : 0);
    G.sjalfReynt = G.frum;
    return true;
  }
  function hreinsaStrigaStrax() {
    const c = fpEl('fp-canvas');
    if (c) {
      try { const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); } catch (_) {}
    }
    const y = document.getElementById('fp-yfirlag');
    if (y) {
      try { y.getContext('2d').clearRect(0, 0, y.width, y.height); } catch (_) {}
    }
    G.teiknad = '';
  }

  function virkja(i, anSamstillingar) {
    const FP = FPx(), p = plan(), hs = haedir();
    if (i === G.virk || i < 0 || i >= hs.length) return;
    if (!anSamstillingar) samstillaVirka();
    vistaHaedMinni(hs[G.virk]);
    loka3d(); G.hamur = null; G.kedja = null; G.drag = null;
    G.skipti = (G.skipti || 0) + 1;
    G.pdfBid = false;
    G.virk = i;
    const h = hs[i];
    p.markers = h.markers.map(m => Object.assign({}, m));
    // Merki nýju hæðarinnar eru í FRUMMYNDARHNITUM. G.rymi bar enn skurð FYRRI hæðar; beita() reiknaði þá nýja
    // skurðinn út frá röngum grunni og tækin á 2. hæð lentu (861, 1590) frá sínum stað (mælt á Fiskislóð 04.10.2026).
    G.rymi = { x: 0, y: 0 };
    p.imageUrl = h.image_url || null;
    FP._selectedUnitId = null; zNullstilla();
    hreinsaStrigaStrax();
    const c = fpEl('fp-canvas'), dm = fpEl('fp-drop-msg');
    const minni = saekjaHaedMinni(h);
    if (minni && G.frum) {
      const ut = G.synd || G.stig1 || G.frum;
      FP.bgImage = ut;
      if (c) c.style.display = 'block'; if (dm) dm.style.display = 'none';
      try { beita(); FP._renderCanvas(); FP._renderPanel(); } catch (_) {}
    } else {
      G.frum = null; G.stig1 = null; G.synd = null; G.lykill = ''; G.hrein = null; G.hreinLykill = '';
      G.dauft = null; G.dauftLykill = ''; G.sjalfReynt = null;
      FP.bgImage = null;
      if (h.image_url) {
        const img = new Image();
        const skipti = G.skipti;
            img.onload = () => {
          const nu = haedir()[G.virk];
          if (G.skipti !== skipti || FPx().companyId !== FP.companyId || !nu || nu.id !== h.id) return;
          FP.bgImage = img; if (c) c.style.display = 'block'; if (dm) dm.style.display = 'none';
          beita(); try { FP._renderCanvas(); FP._renderPanel(); } catch (_) {}
        };
        img.onerror = () => segja('⚠ Náði ekki í teikningu hæðarinnar „' + h.nafn + '".');
        if (window.TeiknGaedi && TeiknGaedi.bindSrc) TeiknGaedi.bindSrc(img, h.image_url);
        else if (window.TeiknSja && TeiknSja.bindSrc) TeiknSja.bindSrc(img, h.image_url);
        else img.src = h.image_url;
      } else {
        if (c) c.style.display = 'none'; if (dm) dm.style.display = '';
      }
    }
    try { FP._renderPanel(); } catch (_) {}
    flipar(); stika(); hnappar();
  }

  /* ── yfirlag: handdregnir veggir, forskoðunarlína, skurðarkassi ── */
  function yfirlag() {
    const main = fpEl('fp-main'), c = fpEl('fp-canvas'); if (!main || !c) return;
    let y = main.querySelector('#fp-yfirlag');
    if (!y) {
      y = document.createElement('canvas'); y.id = 'fp-yfirlag';
      y.style.cssText = 'position:absolute;left:0;top:0;z-index:5;pointer-events:none';
      main.appendChild(y);
    }
    const FP = FPx(), h = virkHaed(), mr = main.getBoundingClientRect(), cr = c.getBoundingClientRect();
    const synilegt = c.style.display !== 'none' && cr.width > 2 && FP.bgImage;
    const stimpil = (plan().markers || []).filter(m => m && m.kind === 'sign').map(m => m.unitId + ':' + Math.round(m.x) + ':' + Math.round(m.y) + ':' + (m.sign || '') + ':' + (m.rot || 0) + ':' + (m.staerd || '')).join(',') + '|s' + ((plan().stimpilStaerd) || '') + '|z' + Z.s;
    const takn = window.TeiknTakn && TeiknTakn.fingrafar ? TeiknTakn.fingrafar() : '';
    const ei = window.TeiknEi && TeiknEi.fingrafar ? TeiknEi.fingrafar(h) : '';
    const merki = [synilegt ? 1 : 0, Math.round(cr.left - mr.left), Math.round(cr.top - mr.top), Math.round(cr.width), Math.round(cr.height), c.width, G.rymi.x, G.rymi.y,
      G.hamur, JSON.stringify(h.veggir), h.pdfVeggir.length + ':' + (h.pdfFlokkar || []).join(','), JSON.stringify(G.kedja), JSON.stringify(G.bendill), JSON.stringify(G.drag), mr.width, mr.height, stimpil, takn, ei].join('|');
    if (merki === G.teiknad) return;
    G.teiknad = merki;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // stærð striga í tækja-px úr skjá-px; CSS-stærðin í staðbundnum px (án zoom síðunnar — sjá zKv)
    const zk = zKv(main);
    y.width = Math.round(mr.width * dpr); y.height = Math.round(mr.height * dpr); y.style.width = (mr.width / zk) + 'px'; y.style.height = (mr.height / zk) + 'px';
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
    const units = (FP && FP.units) || [];
    (plan().markers || []).forEach(m => {
      if (!m || m.kind !== 'sign') return;
      const mx = ox + ((m.x > 1 || m.y > 1) ? m.x : m.x * c.width) * k;
      const my = oy + ((m.x > 1 || m.y > 1) ? m.y : m.y * c.height) * k;
      const s = (window.TeiknMerking && TeiknMerking.skjaStaerd)
        ? TeiknMerking.skjaStaerd(m, cr.width)
        : ((window.TeiknMerking && TeiknMerking.stimpilPx)
          ? TeiknMerking.stimpilPx(m, cr.width) * (Z.s || 1)
          : ((window.TeiknSja && TeiknSja.stimpilPx) ? TeiknSja.stimpilPx(cr.width) : Math.max(32, Math.min(56, cr.width / 12))) * (Z.s || 1));
      if (window.TeiknTakn && TeiknTakn.teiknaMerki) { TeiknTakn.teiknaMerki(x, m, mx, my, s, units); return; }
      const def = window.TeiknMerking && TeiknMerking.stimplar && TeiknMerking.stimplar.find(s0 => s0.id === m.sign);
      x.fillStyle = m.color || (def && def.litur) || '#c93c1d';
      x.beginPath();
      if (x.roundRect) x.roundRect(mx - s / 2, my - s / 2, s, s, 3);
      else x.rect(mx - s / 2, my - s / 2, s, s);
      x.fill();
      x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 1.25; x.stroke();
      x.fillStyle = (m.sign === 'rafmagn') ? '#1c1917' : '#fff';
      x.font = '700 ' + Math.round(s * 0.36) + 'px system-ui,sans-serif';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText((def && def.stutt) || 'MER', mx, my + 0.5);
    });
    try { if (window.TeiknEi && TeiknEi.teikna) TeiknEi.teikna(x, sx, sy, k, h); } catch (_) {}
    x.restore();
  }

  // Skjáhnit → frummyndarhnit virku hæðarinnar.
  function hnit(e) {
    const c = fpEl('fp-canvas'), r = c.getBoundingClientRect();
    return [(e.clientX - r.left) * (c.width / r.width) + G.rymi.x, (e.clientY - r.top) * (c.height / r.height) + G.rymi.y];
  }
  function smella(p) {
    // Rétta lárétt/lóðrétt (innan ~7°) og grípa í enda sem þegar eru til — þannig lokast herbergi hreint.
    const c = fpEl('fp-canvas'), r = c.getBoundingClientRect(), grip = 12 * (c.width / r.width);
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
    h.skurdur = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(hh) }; h.sjalf = false; delete h.thett; zNullstilla();
    vistaSjalfkrafa('skurðurinn geymist');
    if (uti) segja('⚠ ' + uti + ' staðsetning' + (uti === 1 ? '' : 'ar') + ' lend' + (uti === 1 ? 'ir' : 'a') + ' utan við skurðinn — þær haldast, en sjást ekki fyrr en „Sýna allt blaðið" er valið.');
  }
  /* ── þysjun og færsla: EIN stýring fyrir mús, hjól, fingur og takka ──
   * Agnar 20.09.2026: „Má kannski setja zoom takka og leyfa pinch zoom". newfeatures.js átti þysjun með hjóli og
   * mousedown-færslu, með stöðuna lokaða inni í sér — engin snerting, engin klípa, og 30 px takkar. Hér er hún
   * tekin yfir: atburðir hennar eru stöðvaðir í capture og takkarnir hennar faldir. */
  const Z = { s: 1, x: 0, y: 0 };
  // CSS-zoom síðunnar (sími: 333/353 setja zoom ≈ 2,4 á gluggann). getBoundingClientRect og clientX eru í SKJÁ-px
  // (með zoom), en translate/width í stílnum eru í STAÐBUNDNUM px (án zoom). Án þessarar deilingar dró fingurinn
  // teikninguna 2,4× hraðar en hann hreyfðist og yfirlagið (veggir, skilti) teygðist út fyrir teikninguna
  // (Agnar 04.10.2026, S26: „Þetta dregst allt til og frá").
  function zKv(el) {
    el = el || fpEl('fp-main'); if (!el || !el.offsetWidth) return 1;
    const k = el.getBoundingClientRect().width / el.offsetWidth;
    return k > 0.05 && isFinite(k) ? k : 1;
  }
  function zBeita() {
    const c = fpEl('fp-canvas'); if (!c) return;
    c.style.transformOrigin = '0 0'; c.style.transform = 'translate(' + Z.x + 'px,' + Z.y + 'px) scale(' + Z.s + ')';
    const m = document.getElementById('fp-zoom-pct'); if (m) m.textContent = Math.round(Z.s * 100) + '%';
  }
  function zThysja(f, cx, cy) {
    const main = fpEl('fp-main'); if (!main) return;
    const r = main.getBoundingClientRect(), zk = zKv(main);
    const mx = (cx == null ? r.width / 2 : cx - r.left) / zk, my = (cy == null ? r.height / 2 : cy - r.top) / zk;
    const ns = Math.min(12, Math.max(0.2, Z.s * f));
    Z.x = mx - (mx - Z.x) * (ns / Z.s); Z.y = my - (my - Z.y) * (ns / Z.s); Z.s = ns; zBeita();
  }
  function zNullstilla() { Z.s = 1; Z.x = 0; Z.y = 0; zBeita(); }
  function zFaraAd(imgX, imgY) {
    const c = fpEl('fp-canvas'), main = fpEl('fp-main');
    if (!c || !main || imgX == null) return;
    const cw = c.offsetWidth || c.width, ch = c.offsetHeight || c.height;
    if (cw < 2 || ch < 2) return;
    const mx = ((imgX > 1 || imgY > 1) ? imgX : imgX * c.width) - G.rymi.x;
    const my = ((imgX > 1 || imgY > 1) ? imgY : imgY * c.height) - G.rymi.y;
    const px = mx * (cw / c.width), py = my * (ch / c.height);
    if (Z.s < 1.6) Z.s = 1.8;
    Z.x = (main.clientWidth / 2) - px * Z.s;
    Z.y = (main.clientHeight / 2) - py * Z.s;
    zBeita();
  }
  function nyMynd() {
    G.frum = null; G.stig1 = null; G.stig1Lykill = ''; G.synd = null; G.lykill = '';
    G.hrein = null; G.hreinLykill = ''; G.dauft = null; G.dauftLykill = '';
    G.sjalfReynt = null;
    beita();
    try { const F = FPx(); if (F && F._renderCanvas) F._renderCanvas(); } catch (_) {}
  }
  function zTakkar() {
    const main = fpEl('fp-main'); if (!main) return;
    const gamalt = document.getElementById('_fzb'); if (gamalt && gamalt.parentNode && gamalt.parentNode.style.display !== 'none') gamalt.parentNode.style.display = 'none';
    if (main.querySelector('#fp-zoom')) return;
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
    const main = fpEl('fp-main'); if (!main || main._t383) return;
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
      // Núllstilla áður en grip tekur yfir — annars át fyrri pönnun (hreyft>6) næsta smell,
      // t.d. að setja stimpil eða velja merki eftir að teikningin var færð.
      if (fingur.size === 0) hreyft = 0;
      if (window.TeiknMerking && TeiknMerking.grip && TeiknMerking.grip(e)) return;
      fingur.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (fingur.size === 1) hreyft = 0;
      klipa = 0; midja = null;
    }, true);
    main.addEventListener('pointermove', e => {
      if (window.TeiknMerking && TeiknMerking.iDragi && TeiknMerking.iDragi()) return;
      const f = fingur.get(e.pointerId); if (!f) return;
      const dx = e.clientX - f.x, dy = e.clientY - f.y; f.x = e.clientX; f.y = e.clientY;
      if (fingur.size >= 2) {
        // Klípa: þysja um miðjuna milli fingranna og færa með henni. Skurðarkassi í smíðum víkur.
        const [a, b] = [...fingur.values()], fj = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (G.drag && !G.drag.buid) G.drag = null;
        if (klipa) zThysja(fj / klipa, mx, my);
        if (midja) { const zk = zKv(main); Z.x += (mx - midja[0]) / zk; Z.y += (my - midja[1]) / zk; zBeita(); }
        klipa = fj; midja = [mx, my]; hreyft = 99;
      } else if (G.hamur !== 'skera') {
        hreyft += Math.abs(dx) + Math.abs(dy);
        if (hreyft > 6) { const zk = zKv(main); Z.x += dx / zk; Z.y += dy / zk; zBeita(); main.style.cursor = 'grabbing'; }
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
  const hladaMynd = slod => new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('mynd'));
    if (window.TeiknGaedi && TeiknGaedi.bindSrc) TeiknGaedi.bindSrc(i, slod);
    else if (window.TeiknSja && TeiknSja.bindSrc) TeiknSja.bindSrc(i, slod);
    else i.src = slod;
  });
  // Hæð → { veggir, W, H, golf, kvardi, merki } í hnitum SKORNU myndarinnar (stig1).
  function undirbua(h, stig1, merkiFrum, val, einingar, frum) {
    const fb = frum.naturalWidth || frum.width, fh = frum.naturalHeight || frum.height;
    const sk = h.skurdur || { x: 0, y: 0, w: fb, h: fh };
    const r = hreinsa(stig1, { thykkt: val.thykkt || 0, fylla: !!val.fylla });
    // Veggir sem TurboPaint greindi (miðlína + þykkt, punktar frummyndar — „Vista í úttekt" þar) ganga fyrir:
    // TurboPaint er vélin, þessi gluggi sýnir niðurstöðuna (Agnar 03.10.2026). Þá eru veggirnir heilir — engin
    // „girðing" úr stökum PDF-strikum og engin sjálfvirk gríma.
    const tp = Array.isArray(h.veggjaLinur) ? h.veggjaLinur.filter(v => v && Array.isArray(v.p) && v.p.length >= 4) : [];
    const veggir = r.thekja >= NOTHAEF_THEKJA && !h.pdfVeggir.length && !tp.length ? r.veggir : new Uint8Array(r.W * r.H);
    if (h.veggir.length || h.pdfVeggir.length || tp.length) {
      const c = document.createElement('canvas'); c.width = r.W; c.height = r.H;
      const x = c.getContext('2d'); x.strokeStyle = '#000'; x.lineCap = 'square'; x.lineWidth = Math.max(3, Math.round(r.W / 240));
      h.veggir.forEach(v => { x.beginPath(); x.moveTo((v[0] - sk.x) * r.kvardi, (v[1] - sk.y) * r.kvardi); x.lineTo((v[2] - sk.x) * r.kvardi, (v[3] - sk.y) * r.kvardi); x.stroke(); });
      if (tp.length) {
        x.lineJoin = 'miter';
        tp.forEach(v => {
          x.lineWidth = Math.max(2, (Number(v.t) || 1) * r.kvardi);
          x.beginPath();
          for (let i = 0; i + 1 < v.p.length; i += 2) {
            const px = (v.p[i] - sk.x) * r.kvardi, py = (v.p[i + 1] - sk.y) * r.kvardi;
            if (i) x.lineTo(px, py); else x.moveTo(px, py);
          }
          x.stroke();
        });
      } else {
        // Vigurveggir eru TVÆR línur með veggþykkt á milli: nógu breitt strik til að parið renni saman í einn heilan vegg.
        x.lineWidth = Math.max(3, Math.round(r.W / 380)); x.beginPath();
        h.pdfVeggir.forEach(v => { x.moveTo((v[0] - sk.x) * r.kvardi, (v[1] - sk.y) * r.kvardi); x.lineTo((v[2] - sk.x) * r.kvardi, (v[3] - sk.y) * r.kvardi); });
        x.stroke();
      }
      const d = x.getImageData(0, 0, r.W, r.H).data;
      for (let i = 0; i < r.W * r.H; i++) if (d[i * 4 + 3] > 96) veggir[i] = 1;
    }
    // HEILIR VEGGIR fyrir 3D (miðlína + þykkt, einn kassi á vegg) í stað grímunnar: TurboPaint-veggirnir eins og þeir
    // eru, annars PDF-strikin pöruð hér (heilirVeggir). Handdregnir veggir fylgja með. Gríman hér að ofan stendur
    // áfram fyrir teikningar sem hafa hvorugt (myndgreindir veggir).
    let butar = null;
    if (tp.length) {
      butar = [];
      tp.forEach(v => { const t = Number(v.t) || 0; for (let i = 0; i + 3 < v.p.length; i += 2) butar.push([v.p[i], v.p[i + 1], v.p[i + 2], v.p[i + 3], t]); });
    } else if (h.pdfVeggir.length) {
      try { butar = heilirVeggir(h.pdfVeggir, fb, fh); } catch (e) { console.warn('[383] heilirVeggir', e); butar = null; }
    }
    if (butar && butar.length) {
      h.veggir.forEach(v => butar.push([v[0], v[1], v[2], v[3], 0]));
      butar = klippaButa(butar, sk);
    }
    if (butar && !butar.length) butar = null;
    // SKÖNNUN (engin vigurstrik): veggirnir lesnir úr grímunni sem langir borðar — fyrst úr þykku grímunni, annars úr
    // þeirri sem „Skýrari veggir" endaði á. Finnist ekki veggjanet stendur gamla ristarleiðin.
    let urGrimu = false;
    if (!butar) {
      const kostir = r.thykkir && r.thykkir !== r.veggir ? [r.thykkir, r.veggir] : [r.veggir];
      for (const gr of kostir) {
        let fundid = null;
        try { fundid = heilirUrGrimu(gr, r.W, r.H, r.kvardi, fb, fh); } catch (e) { console.warn('[383] heilirUrGrimu', e); }
        if (fundid) { butar = fundid; urGrimu = true; break; }
      }
      if (butar) h.veggir.forEach(v => butar.push([v[0] - sk.x, v[1] - sk.y, v[2] - sk.x, v[3] - sk.y, 0]));
    }
    const iw = stig1.naturalWidth || stig1.width, ih = stig1.naturalHeight || stig1.height;
    const merki = merkiFrum.map(mk => {
      const px = erPx(mk) ? mk.x - sk.x : mk.x * iw, py = erPx(mk) ? mk.y - sk.y : mk.y * ih;
      if (mk.kind === 'sign' || (typeof mk.unitId === 'string' && String(mk.unitId).indexOf('s:') === 0)) {
        const def = window.TeiknMerking && TeiknMerking.stimplar && TeiknMerking.stimplar.find(s => s.id === mk.sign);
        const txt = (def && def.stutt) || 'MER';
        return { x: px, y: py, litur: mk.color || (def && def.litur) || '#c93c1d', texti: txt };
      }
      const u = einingar.find(q => q.id === mk.unitId);
      // Bráðabirgðanúmer (TMP-…) segir engum neitt á miðanum — þá stendur tegundin (Léttvatn, Brunaslanga …).
      const radnr = u ? String(u.serial || '') : '';
      return { x: px, y: py, litur: u && u.status === 'overdue' ? '#c93c1d' : '#2f9e55', texti: u ? ((/^TMP-/i.test(radnr) || !radnr) && u.type ? String(u.type) : radnr.slice(-6)) : '' };
    });
    let golf;
    try { golf = golfMedUti(stig1, r.W, r.H); }
    catch (e) { console.warn('[383] golfMedUti', e); golf = r.vinnu; }
    try {
      const gd = golf.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, r.W, r.H).data;
      for (let i = 0; i < r.W * r.H; i++) if (gd[i * 4 + 3] < 16) veggir[i] = 0;
      // Sama regla fyrir veggi úr grímu: það sem stendur allt UTAN húss (norðurör, lóðarmörk, nágrannahús) er ekki veggur.
      if (urGrimu && butar) {
        const inni = (x, y) => { const px = Math.round(x * r.kvardi), py = Math.round(y * r.kvardi); return px >= 0 && py >= 0 && px < r.W && py < r.H && gd[(py * r.W + px) * 4 + 3] >= 16; };
        const sia = butar.filter(v => [0.2, 0.5, 0.8].some(q => inni(v[0] + (v[2] - v[0]) * q, v[1] + (v[3] - v[1]) * q)));
        if (sia.length >= butar.length * 0.5) butar = sia;
      }
    } catch (_) {}
    let n = 0; for (let i = 0; i < veggir.length; i++) n += veggir[i];
    let gler = null;
    if (butar && r.gra) { try { gler = glerIBilum(butar, r.gra, r.W, r.H, r.kvardi, Math.max(fb, fh) / 2384); } catch (e) { console.warn('[383] glerIBilum', e); } }
    return { veggir, W: r.W, H: r.H, golf, kvardi: r.kvardi, merki, veggjaPx: butar ? butar.length : n, butar, gler, sk, frumB: fb, frumH: fh };
  }
  async function opna3d() {
    const FP = FPx(), main = fpEl('fp-main'); if (!FP || !main) return;
    if (document.getElementById('fp-3d')) { loka3d(); return; }
    samstillaVirka();
    const hs = haedir(), val = lesaVal(FP.companyId), einingar = FP.units || [];
    const gamur = document.createElement('div'); gamur.id = 'fp-3d';
    gamur.style.cssText = 'position:absolute;inset:0;z-index:8;background:#dcd9d2';
    gamur.innerHTML = '<div id="fp-3d-skyr" style="position:absolute;left:10px;top:10px;z-index:2;max-width:calc(100% - 250px);padding:6px 10px;border-radius:9px;background:rgba(20,18,15,.85);color:#f1ede4;font:500 12px system-ui,sans-serif;pointer-events:none">Undirbý hæðir…</div>' +
      '<div id="fp-3d-haedir" style="position:absolute;right:10px;top:52px;z-index:2;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;max-width:70%"></div>' +
      '<div style="position:absolute;right:10px;top:10px;z-index:2;display:flex;gap:6px">' +
      '<button type="button" id="fp-3d-gegn" aria-pressed="false" title="Gera veggina gegnsæja svo tækin og teikningin sjáist í gegnum húsið" style="height:36px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.85);color:#fff;font:700 13px system-ui;cursor:pointer">Gegnsætt</button>' +
      '<button type="button" id="fp-3d-x" style="height:36px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.85);color:#fff;font:700 13px system-ui;cursor:pointer">✕ Loka 3D</button></div>';
    main.appendChild(gamur);
    gamur.querySelector('#fp-3d-gegn').addEventListener('click', e => {
      const t = e.currentTarget, a = t.getAttribute('aria-pressed') !== 'true';
      t.setAttribute('aria-pressed', a ? 'true' : 'false');
      t.style.background = a ? '#d9b45a' : 'rgba(20,18,15,.85)'; t.style.color = a ? '#14120f' : '#fff';
      if (G.syn3d && G.syn3d.gegnsaett) G.syn3d.gegnsaett(a);
    });
    gamur.querySelector('#fp-3d-x').addEventListener('click', loka3d);
    const skyr = gamur.querySelector('#fp-3d-skyr'), ut = [], sleppt = [];
    for (let i = 0; i < hs.length; i++) {
      const h = hs[i];
      try {
        let stig1 = i === G.virk ? G.stig1 : null, frum = i === G.virk ? G.frum : null;
        if (!stig1) { if (!h.image_url) { sleppt.push(h.nafn + ' (engin teikning)'); continue; } frum = await hladaMynd(h.image_url); stig1 = h.skurdur ? skera(frum, h.skurdur) : frum; }
        if (!document.getElementById('fp-3d')) return;
        const u = undirbua(h, stig1, h.markers, val, einingar, frum);
        if (!u.veggjaPx) { sleppt.push(h.nafn + ' (engir veggir — greindu þá í TurboPaint og „Vista í úttekt“, lestu úr PDF eða dragðu með ✏)'); continue; }
        u.nafn = h.nafn; ut.push(u);
      } catch (e) { console.warn('[383] 3D: ' + h.nafn, e); sleppt.push(h.nafn + ' (náði ekki í teikningu)'); }
    }
    if (!ut.length) { loka3d(); segja('Sjálfvirk veggagreining náði ekki. ' + sleppt.join(' · ') + '.' + (hs.some(x => pdfSlod(x)) ? ' Engir vigrar í PDF.' : '') + ' Fyrir 3D: teiknaðu með Veggir.'); return; }
    try {
      G.syn3d = await syna3d(gamur, { haedir: ut });
      skyr.textContent = 'Draga = snúa · hjól / klípa = aðdráttur · shift-draga eða tveir fingur = færa' + (ut.length > 1 ? ' · ' + ut.length + ' hæðir' : '') + (sleppt.length ? ' · sleppt: ' + sleppt.join(', ') : '');
      const b = document.querySelector('#modal-floorplan .fp-3d-btn'); if (b) b.setAttribute('aria-pressed', 'true');
      // Hæðatakkar: smellur sýnir þá hæð EINA, annar smellur á sömu hæð sýnir allar aftur.
      const hb = gamur.querySelector('#fp-3d-haedir');
      if (hb && ut.length > 1) {
        let valin = null;
        const TKH = 'height:32px;padding:0 11px;border-radius:9px;border:1px solid rgba(255,255,255,.25);font:700 12px system-ui;cursor:pointer;';
        const mala = () => { hb.innerHTML = ut.map((u, i) => '<button type="button" data-h="' + i + '" aria-pressed="' + (valin === i) + '" title="Sýna aðeins þessa hæð — smelltu aftur til að sjá allar" style="' + TKH + (valin === i ? 'background:#d9b45a;color:#14120f' : 'background:rgba(20,18,15,.85);color:#fff') + '">' + esc(u.nafn || (i + 1) + '. hæð') + '</button>').join(''); };
        hb.addEventListener('click', e => {
          const t = e.target.closest('button[data-h]'); if (!t) return;
          const nr = +t.dataset.h; valin = valin === nr ? null : nr;
          if (G.syn3d && G.syn3d.syna) G.syn3d.syna(valin);
          mala();
        });
        mala();
      }
    } catch (e) { loka3d(); segja('⚠ 3D-sýnin opnaðist ekki: ' + ((e && e.message) || e)); }
  }

  /* ── símaútlit ──
   * Agnar 20.09.2026 (skjáskot af S26): tækjalistinn stóð sem 220 px dálkur við hliðina og tók þriðjung skjásins;
   * teikningin fékk mjóa rein og tveir þriðju hennar stóðu auðir. Á mjóum skjá fer listinn NIÐUR sem lárétt ræma,
   * glugginn fyllir skjáinn og takkaröðin í hausnum skrunar til hliðar í stað þess að brotna í tvær línur.
   * 20.09.2026 seint: reglan var @media (max-width:760px) og kviknaði ALDREI á síma Agnars — appið þysjar sig á síma
   * (353, „115%") svo útlitsbreiddin er yfir 760 px. Nú ræður klasi sem settur er þegar skjárinn er Á HÆÐINA
   * (eða mjór): það er það sem skiptir máli fyrir þetta útlit, ekki punktafjöldinn. */
  function simaKlasi() {
    const m = document.getElementById('modal-floorplan'); if (!m) return;
    const simi = window.innerWidth <= 760 || window.innerHeight > window.innerWidth * 1.1;
    if (m.classList.contains('fp-simi') !== simi) { m.classList.toggle('fp-simi', simi); G.teiknad = ''; try { FPx()._renderCanvas(); } catch (_) {} }
  }
  function simaStill() {
    let st = document.getElementById('fp-simi-css');
    if (!st) { st = document.createElement('style'); st.id = 'fp-simi-css'; document.head.appendChild(st); }
    if (st.dataset.stjorn === '1') return;
    st.dataset.stjorn = '1';
    st.textContent =
      // Hausinn er nowrap. Þegar Skýrari veggir, 3D og hinir takkarnir bætast við
      // Sækja / Hlaða upp / Hreinsa brotnar röðin í stað þess að fara út fyrir gluggann.
      // app.css .modal.open>.modal-hd er 560px — án width:auto hverfa aukahnappanir.
      '#modal-floorplan>.modal-hd,#modal-floorplan.modal.open>.modal-hd{height:auto!important;overflow:visible!important;align-items:flex-start!important;flex-wrap:wrap!important;width:auto!important;max-width:none!important;row-gap:8px!important}' +
      '#modal-floorplan>.modal-bd,#modal-floorplan.modal.open>.modal-bd{width:auto!important;max-width:none!important;max-height:none!important}' +
      '#modal-floorplan>.modal-ft,#modal-floorplan.modal.open>.modal-ft{width:auto!important;max-width:none!important}' +
      '#modal-floorplan .modal-hd>div:last-child{flex-wrap:wrap!important;justify-content:flex-end!important;row-gap:6px!important;max-width:100%!important}' +
      '#modal-floorplan #fp-haedir{z-index:8!important}' +
      '#modal-floorplan .fp-hd-grp{flex-wrap:wrap;justify-content:flex-end}' +
        '#modal-floorplan.fp-simi{width:100vw!important;max-width:100vw!important;height:100dvh!important;max-height:100dvh!important;border-radius:0!important;margin:0!important}' +
        '#modal-floorplan.fp-simi .modal-hd{flex-direction:column;align-items:stretch;gap:6px;padding:8px 10px 8px 64px}' +
        '#modal-floorplan.fp-simi .modal-hd h2{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
        '#modal-floorplan.fp-simi .modal-hd h2+div{display:none}' +
        '#modal-floorplan.fp-simi .fp-hd-grp{flex-wrap:nowrap!important;justify-content:flex-start!important;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;margin-left:-54px}' +
        '#modal-floorplan.fp-simi .fp-hd-grp>*{flex:none}' +
        // ✕ er AFTAST í röð sem skrunar til hliðar — á síma var hann utan skjás og engin sýnileg leið út. Festur hægra megin.
        '#modal-floorplan.fp-simi .fp-hd-grp .modal-x{position:sticky;right:0;z-index:3;width:40px;height:40px;border-radius:10px;background:#14120f;color:#fff;border:1px solid rgba(255,255,255,.3);box-shadow:-10px 0 12px 4px #fff}' +
        '#modal-floorplan.fp-simi .modal-bd{flex-direction:column!important}' +
        '#modal-floorplan.fp-simi #fp-main{min-height:0}' +
        '#modal-floorplan.fp-simi #fp-panel{width:auto!important;flex:none!important;border-left:0!important;border-top:1px solid rgba(255,255,255,.12);padding:8px 10px!important;overflow-x:auto!important;overflow-y:hidden!important;-webkit-overflow-scrolling:touch}' +
        '#modal-floorplan.fp-simi #fp-panel>div:first-child{display:none}' +
        '#modal-floorplan.fp-simi #fp-stimpil{display:flex;gap:6px;margin:0 0 6px;flex:none}' +
        '#modal-floorplan.fp-simi #fp-unit-list{display:flex;gap:7px}' +
        '#modal-floorplan.fp-simi #fp-unit-list>div{flex:0 0 128px;margin-bottom:0!important}' +
        '#modal-floorplan.fp-simi .modal-ft{padding:8px 10px}' +
        '#modal-floorplan.fp-simi #fp-info{font-size:12px}' +
        '.fp-simi #fp-hreinsa-stika{max-width:calc(100% - 20px)!important}' +
        '.fp-simi #fp-zoom button{width:36px!important;height:36px!important}.fp-simi #fp-zoom span{height:36px!important;line-height:36px!important;min-width:46px!important}' +
      '';
  }

  /* ── TurboPaint-hringferð (Agnar 02.10.2026: taka blaðið, opna í TurboPaint, vista til baka — án nýs borðs á spjaldinu) ──
   * TurboPaint les hæðina úr teikning_bord — hún verður því að vera VISTUÐ og eins og hún stendur á skjánum. Óvistaðar
   * breytingar eru vistaðar fyrst (án þess að loka glugganum), svo er hæðin opnuð í nýjum flipa. „Vista í úttekt" þar
   * skrifar staðsetningar tækjanna aftur í sömu röð; glugginn hér sækir þær sjálfur þegar fókus kemur til baka. */
  const TURBOPAINT = 'https://kjarni.vercel.app/kjarni/turbopaint';
  let _tpOpnad = 0, _tpVakt = false, _tpBid = 0;
  function vaktAfturkomu() {
    if (_tpVakt) return;
    _tpVakt = true;
    const lesa = () => {
      if (!_tpOpnad || Date.now() - _tpOpnad > 2 * 60 * 60 * 1000) return;
      if (!fpGluggi() || !FPx() || !FPx().companyId) return;
      if (document.visibilityState === 'hidden') return;
      endurlesa(true);
    };
    window.addEventListener('focus', () => { clearTimeout(_tpBid); _tpBid = setTimeout(lesa, 500); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') { clearTimeout(_tpBid); _tpBid = setTimeout(lesa, 500); }
    });
  }
  function haedOpnastITurboPaint(h) {
    const u = String((h && h.image_url) || '');
    if (!u || u.indexOf('blob:') === 0 || u.indexOf('data:') === 0) return false;
    return /teikn-mynd\?/.test(u) || /^https?:/i.test(u);
  }
  async function vistaHaedirFyrirTurboPaint() {
    const FP = FPx(), cid = FP && FP.companyId;
    if (!cid || !window.DB || !DB.sb) throw new Error('engin tenging');
    samstillaVirka();
    const hs = haedir();
    if (hs.some(x => String(x.image_url || '').indexOf('blob:') === 0)) {
      throw new Error('Ein hæðin er með nýupphlaðna mynd — ýttu fyrst á 💾 Vista, opnaðu gluggann aftur og svo TurboPaint.');
    }
    const gogn = JSON.parse(JSON.stringify(hs)); gogn.forEach(x => { delete x.pdfReynt; });
    const r = await DB.sb.from('teikning_bord').upsert({
      company_id: cid, markers: gogn[0].markers, image_url: gogn[0].image_url || null, haedir: gogn,
      updated_at: new Date().toISOString()
    }, { onConflict: 'company_id' }).select('company_id');
    if (r.error || !r.data || !r.data.length) throw new Error((r.error && r.error.message) || 'ekkert skrifað');
    return { cid, h: hs[G.virk], hs };
  }
  function turboPaintSlod(cid, h, planUrl) {
    const q = ['uttekt=' + encodeURIComponent(cid)];
    if (h && h.id) q.push('haed=' + encodeURIComponent(h.id));
    if (h && h.frum) q.push('b=' + h.frum.b, 'h=' + h.frum.h);
    if (planUrl) q.push('plan=' + encodeURIComponent(planUrl));
    return TURBOPAINT + '?' + q.join('&');
  }
  async function opnaITurboPaint(auka) {
    const FP = FPx(), cid = FP && FP.companyId;
    if (!cid) { segja('Opnaðu teikninguna fyrst.'); return; }
    if (!FP.bgImage && !(auka && auka.plan)) { segja('Sæktu eða hlaðu upp teikningu fyrst.'); return; }
    const h = (haedir() || [])[G.virk];
    if (h && !haedOpnastITurboPaint(h) && !(auka && auka.plan)) {
      segja('Aðeins teikningar úr skjalasafninu opnast sjálfkrafa í TurboPaint — upphlaðna mynd þarf að flytja þar inn handvirkt.');
      return;
    }
    const flipi = window.open('about:blank', '_blank');
    try {
      const v = await vistaHaedirFyrirTurboPaint();
      const slod = turboPaintSlod(v.cid, v.h, auka && auka.plan);
      if (flipi) flipi.location.href = slod; else location.href = slod;
      _tpOpnad = Date.now();
      vaktAfturkomu();
      segja('Hæðin er vistuð og opnast í TurboPaint. Þegar þú ert búinn þar: „💾 Vista í úttekt" — merkin koma til baka hér.');
    } catch (e) {
      if (flipi) try { flipi.close(); } catch (_) {}
      segja('⚠ Gat ekki vistað hæðina fyrir TurboPaint: ' + ((e && e.message) || e));
    }
  }
  // Sækja staðsetningar sem TurboPaint (eða önnur vél) vistaði á meðan glugginn stóð opinn.
  async function endurlesa(hljodlatt) {
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
      if (!hljodlatt || row.updated_by === 'TurboPaint') {
        segja('↻ Sótt af þjóni' + (row.updated_by ? ' (síðast vistað af ' + row.updated_by + ')' : '') + ' — ' + p.markers.length + ' staðsetningar á þessari hæð.');
      }
    } catch (e) { if (!hljodlatt) segja('⚠ Náði ekki að sækja: ' + ((e && e.message) || e)); }
  }

  /* ── takkar í haus gluggans ── */
  function hnappar() {
    const m = fpGluggi(); if (!m) return;
    const hd = m.querySelector('.modal-hd'); if (!hd) return;
    // Ekki treysta lastElementChild: nýr barn-hnútur (276/405) getur ýtt hnappa-
    // hópnum innar. Label „Hlaða upp" og Sækja-hnappur 374 eru í réttum hópi.
    const lbl = hd.querySelector('label');
    const saek = hd.querySelector('.fp-saekja-btn');
    const grp = (lbl && lbl.parentElement) || (saek && saek.parentElement) || hd.lastElementChild;
    if (!grp) return;
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
          if (h.skurdur) { h.skurdur = null; h.sjalf = false; G.hamur = null; zNullstilla(); vistaSjalfkrafa('allt blaðið sýnt'); } else { G.hamur = G.hamur === 'skera' ? null : 'skera'; G.drag = null; G.kedja = null; }
        })),
        gera('fp-veggir-btn', '✏ Veggir', 'Draga veggina sjálfur — virkar á hvaða teikningu sem er og gefur rétt 3D', tharfMynd(() => { loka3d(); G.hamur = G.hamur === 'veggir' ? null : 'veggir'; G.kedja = null; G.drag = null; })),
        gera('fp-hreinsa-btn', '✨ Skýrari veggir', '2D grunnmyndin helst ósnert. 3D sýnir húsið — grá lóð utan veggja er ekki gólfplata.', tharfMynd(() => { const v = lesaVal(FP.companyId); v.a = !v.a; vistaVal(FP.companyId, v); })),
        gera('fp-3d-btn', '🧊 3D', 'Lyfta veggjunum upp og sjá tækin í þrívídd — allar hæðir', () => { G.hamur = null; opna3d(); }),
        gera('fp-fest-btn', '📌 Festa útlit', 'Sáttur við teikninguna? Festir skurð, Skýrari veggi og hæðir á þjóninum — opnast alltaf svona, ekkert greint upp á nýtt. Smelltu aftur til að breyta.', tharfMynd(() => {
          const v = lesaVal(FP.companyId); v.fest = !v.fest; G.hamur = null; G.drag = null; G.kedja = null;
          vistaVal(FP.companyId, v);
          segja(v.fest ? '📌 Útlitið er fest og vistað — teikningin opnast alltaf svona.' : '🔓 Útlitið er laust — skerðu og stilltu, svo „Festa útlit“ aftur.');
        })),
        gera('fp-tp-btn', 'Opna í TurboPaint', 'Opna hæðina í TurboPaint: teikna á hana, færa tækin og vista staðsetningarnar til baka', opnaITurboPaint)
      ];
      const upp = grp.querySelector('label') || grp.querySelector('.fp-saekja-btn') || grp.firstChild;
      takkar.forEach(b => {
        try { grp.insertBefore(b, upp && upp.parentNode === grp ? upp : null); } catch (_) { grp.appendChild(b); }
      });
      grp.classList.add('fp-hd-grp'); simaStill();
    }
    const val = lesaVal(FP.companyId), h = virkHaed();
    const lita = (kl, a, texti) => { const b = grp.querySelector(kl); if (!b) return; b.setAttribute('aria-pressed', String(!!a)); b.style.background = a ? '#c9a54a' : ''; b.style.color = a ? '#14120f' : ''; if (texti) b.textContent = texti; };
    lita('.fp-hreinsa-btn', val.a);
    lita('.fp-fest-btn', val.fest, val.fest ? '📌 Útlit fest' : '📌 Festa útlit');
    const mg = fpGluggi(); if (mg) mg.classList.toggle('fp-fest', !!val.fest);
    if (!document.getElementById('fp-fest-css')) {
      // Veggjatalning (✏ Veggir · N) og EI-merki eru greining — hún býr í TurboPaint; glugginn er sýn fyrir þjónustuna
      // (Agnar 03.10.2026: „tekið út veggjatalningu, EI“). Fest útlit felur skurðinn — EKKI Skýrari veggi (04.10: faldi
      // takkinn gerði að verkum að „næ henni ekki aftur").
      const st = document.createElement('style'); st.id = 'fp-fest-css';
      st.textContent = '#modal-floorplan .fp-veggir-btn,#modal-floorplan .fp-ei-btn{display:none!important}' +
        '#modal-floorplan.fp-fest .fp-skera-btn{display:none!important}' +
        // Brunastál-þemað setur !important stálhalla á alla takka í gluggum — virkt ástand (Skýrari veggir, Útlit fest)
        // sást ekki (04.10.2026: Agnar hélt Skýrari væri af). ID-valið vinnur.
        'html #modal-floorplan .fp-hd-grp .btn[aria-pressed="true"]{background:#c9a54a!important;color:#14120f!important;border-color:#c9a54a!important}';
      document.head.appendChild(st);
    }
    lita('.fp-veggir-btn', G.hamur === 'veggir', '✏ Veggir' + (h.veggir.length + h.pdfVeggir.length ? ' · ' + (h.veggir.length + h.pdfVeggir.length) : ''));
    lita('.fp-skera-btn', G.hamur === 'skera' || !!h.skurdur, h.skurdur ? '✂ Sýna allt blaðið' : '✂ Skera');
    const c = fpEl('fp-canvas'); if (c) c.style.cursor = G.hamur ? 'crosshair' : '';
  }

  // Tækjalistinn þekkir aðeins virku hæðina: segja á hvaða hæð tækið er annars.
  function listaVisbending() {
    const el = fpEl('fp-unit-list'), FP = FPx(); if (!el || !FP.units) return;
    if (FP._selectedUnitId !== G.valid) { G.valid = FP._selectedUnitId; const i = FP.units.findIndex(u => u.id === G.valid); if (i >= 0 && el.children[i] && document.querySelector('#modal-floorplan.fp-simi')) { try { el.children[i].scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (_) {} } }
    const hs = haedir();
    [...el.children].forEach((rod, i) => {
      const u = FP.units[i]; if (!u) return;
      const annars = hs.find((h, j) => j !== G.virk && h.markers.some(m => m.unitId === u.id));
      const sidast = rod.lastElementChild; if (!sidast) return;
      if (annars && !plan().markers.some(m => m.unitId === u.id)) { const t = '↗ á ' + annars.nafn; if (sidast.textContent !== t) { sidast.textContent = t; sidast.style.color = '#c9a54a'; } }
    });
  }

  // Bakk-takkinn lokar glugganum (og 3D-sýninni fyrst): skráð sem lög í almennu reglunni, patch 276.
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
      loka3d(); cancelAnimationFrame(G.raf);
      Object.assign(G, { frum: null, stig1: null, stig1Lykill: '', synd: null, lykill: '', hrein: null, hreinLykill: '', rymi: { x: 0, y: 0 }, virk: 0, hamur: null, kedja: null, bendill: null, drag: null, teiknad: '', soknKom: 0, rodKomin: 0, _haedirCid: 0, _haedirBid: 0, _festCid: 0, _festModal: null, minni: {}, skipti: (G.skipti || 0) + 1, pdfBid: false });
      const r = opna.apply(this, arguments);
      Z.s = 1; Z.x = 0; Z.y = 0;
      try { tikk(); } catch (_) {}
      setTimeout(tikk, 0);
      setTimeout(tikk, 60);
      setTimeout(tikk, 200);
      const lykkja = () => { const m = document.getElementById('modal-floorplan'); if (!m || !document.body.contains(m) || !modalSynnilegt()) return; try { yfirlag(); } catch (_) {} G.raf = requestAnimationFrame(lykkja); };
      G.raf = requestAnimationFrame(lykkja);
      return r;
    };

    // 375 kallar þetta þegar röð þjónsins er komin: merkin eru þá í FRUMMYNDARHNITUM og hæðirnar fylgja.
    FP.__eftirSokn = function (cid, row) {
      G.soknKom = cid;
      G.rodKomin = cid;   // röð þjónsins RAUNVERULEGA komin (soknKom er líka sett þegar sókn er aðeins hafin)
      if (FP.companyId !== cid) return;
      const p = plan();
      const virkAdur = haedir()[G.virk];
      const idVirk = (virkAdur && virkAdur.id) || null;
      const urlAdur = (virkAdur && virkAdur.image_url) || null;
      const nyjar = Array.isArray(row.haedir) && row.haedir.length ? JSON.parse(JSON.stringify(row.haedir)) : null;
      p.haedir = sameinaHaedir(p.haedir, nyjar);
      const hs = haedir();
      let i = idVirk ? hs.findIndex(h => h.id === idVirk) : 0;
      if (i < 0) i = 0;
      G.virk = i;
      p.markers = hs[i].markers.map(m => Object.assign({}, m));
      if (hs[i].image_url) p.imageUrl = hs[i].image_url;
      else if (Array.isArray(row.haedir) && row.haedir.length && hs[0].image_url) { /* virk hæð án slóðar */ }
      else { hs[0].markers = (p.markers || []).map(m => Object.assign({}, m)); hs[0].image_url = p.imageUrl || null; }
      const urlNu = (hs[i] && hs[i].image_url) || null;
      if (urlNu !== urlAdur) { G.lykill = ''; G.synd = null; }
      // Merkin eru nú í FRUMMYNDARHNITUM — hliðrunin verður að fylgja (0,0), og beita() setur skurðinn á aftur.
      // Án þessa hélt G.rymi gamla skurðinum: næsta faeraMerki dró hann frá frummyndarhnitum og tækin hoppuðu
      // þegar aðeins byggingin sást (Agnar 04.10.2026: „tækin haldast á fullu korti en hoppa þegar sést bara byggingin").
      G.rymi = { x: 0, y: 0 }; G.lykill = '';
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

  // Glugginn er sýnilegur þegar hann ber .open. inline display:none má ekki drepa vaktina:
  // .modal.open { display:flex !important } heldur honum uppi, og eldri vakt hreinsaði sig þá
  // áður en hnapparnir náðu að festast. Sama ef open() var kallað áður en skreytingin náðist.
  function modalSynnilegt() {
    const m = document.getElementById('modal-floorplan');
    if (!m || !m.isConnected) return null;
    if (m.classList.contains('open')) return m;
    if (m.style.display && m.style.display !== 'none') return m;
    try { if (getComputedStyle(m).display !== 'none') return m; } catch (_) {}
    return null;
  }
  function tikk() {
    if (!modalSynnilegt()) return false;
    try { endurfestaEfNyttFelag(); } catch (_) {}
    try { if (!FPx() || !FPx().__hreinsaSkreytt) skreyta(); } catch (_) {}
    try { simaKlasi(); } catch (_) {}
    try { tengjaStriga(); } catch (_) {}
    try { zTakkar(); } catch (_) {}
    try { hnappar(); } catch (e) { console.warn('[383]', e); }
    try { flipar(); } catch (e) { console.warn('[383]', e); }
    try { beita(); } catch (e) { console.warn('[383]', e); }
    try { listaVisbending(); } catch (_) {}
    try { tryggjaHaedir(); } catch (_) {}
    return true;
  }
  // 375 sækir hæðirnar áður en __eftirSokn er til ef glugginn opnast snemma. Þá verður aðeins
  // til ein gervihæð. Eftir ~1,5 s, ef tvær hæðir eru ekki komnar, er sótt aftur.
  function tryggjaHaedir() {
    const FP = FPx();
    if (!FP || !FP.__hreinsaSkreytt || !FP.companyId || !modalSynnilegt()) return;
    if (G.soknKom === FP.companyId) return;
    const p = FP.plans[FP.companyId];
    if (p && Array.isArray(p.haedir) && p.haedir.length > 1) { G.soknKom = FP.companyId; return; }
    // Agnar 04.10.2026: glugginn birtist með eina hæð og tóman flöt þangað til biðin rann út („mjög misjafnt hvað kemur
    // þegar ég opna"). Sótt strax — ein sókn í hverri opnun.
    if (G._haedirCid === FP.companyId) return;
    G._haedirCid = FP.companyId;
    G.soknKom = FP.companyId;
    try { FP.load(FP.companyId); } catch (_) {}
  }

  window.TeiknBord = {
    samstilla: samstillaVirka,
    hamur: () => G.hamur,
    rymi: () => G.rymi,
    virk: () => G.virk,
    thysjun: () => Z.s,
    soknKom: () => G.soknKom,
    haedir,
    plan,
    erPx,
    faraAd: zFaraAd,
    nyMynd
  };
  window.TeiknTurboPaint = { opna: opnaITurboPaint, slod: turboPaintSlod, vistaHaedir: vistaHaedirFyrirTurboPaint };

  function vaktGlugga() {
    if (document.documentElement._t383obs) return;
    document.documentElement._t383obs = 1;
    const kveikja = () => {
      G._festModal = null;
      try { tikk(); } catch (_) {}
      setTimeout(() => { try { tikk(); } catch (_) {} }, 80);
    };
    new MutationObserver(muts => {
      for (let i = 0; i < muts.length; i++) {
        const ns = muts[i].addedNodes;
        for (let j = 0; j < ns.length; j++) {
          const n = ns[j];
          if (!n || n.nodeType !== 1) continue;
          if (n.id === 'modal-floorplan' || (n.querySelector && n.querySelector('#modal-floorplan'))) kveikja();
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  try { simaStill(); } catch (_) {}
  try { vaktGlugga(); } catch (_) {}
  if (!skreyta()) { let n = 0; const i = setInterval(() => { if (skreyta() || ++n > 200) clearInterval(i); }, 150); }
  setInterval(() => { try { tikk(); } catch (e) { console.warn('[383]', e); } }, 400);
})();
