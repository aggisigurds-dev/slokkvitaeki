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
    // VIÐMIÐ (05.10.2026): þröskuldarnir hér voru allir hlutfall af breidd vinnumyndarinnar. Sama hús gaf því aðra veggi
    // eftir því hve þröngt var skorið og hvaða gæði voru valin (Arnarhvoll: 172 veggir með lausum skurði, 380 með þröngum —
    // mállínur og húsgögn urðu veggir). 3D-greiningin sendir `vidmid` og vinnur í föstum kvarða (greiningarkvardi).
    const Wv = o.vidmid || W;
    const r = Math.max(1, o.thykkt || Math.round(Wv / 1000));
    let blek = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) blek[i] = gra[i] < dokkt ? 1 : 0;
    // Tvöfaldir veggir: loka rifunni Á MILLI línanna áður en þunnt er þurrkað út.
    if (o.fylla) { const f = r + 2; blek = erode(dilate(blek, W, H, f), W, H, f); }
    let v = dilate(erode(blek, W, H, r), W, H, r);                         // opnun: þunnt hverfur
    v = erode(dilate(v, W, H, r + 1), W, H, r + 1);                        // lokun: göt í veggjum gróa
    // Heilir flekkir lifa af risa-opnun; alvöru veggir gera það aldrei.
    const R = Math.max(r + 4, Math.round(Wv / 140));
    const flekkir = dilate(dilate(erode(v, W, H, R), W, H, R), W, H, 4);
    for (let i = 0; i < W * H; i++) if (flekkir[i]) v[i] = 0;
    // Smáagnir (stafir sem lifðu af, punktar, örvar).
    const sv = svaedi(v, W, H), lagm = Math.round(Wv / 54), lagmFlat = Math.round((Wv / 170) * (Wv / 170));
    const halda = new Uint8Array(sv.listi.length + 1);
    sv.listi.forEach(s => { if (s.flat >= lagmFlat && Math.max(s.b, s.h) >= lagm) halda[s.n] = 1; });
    let fjoldi = 0;
    for (let i = 0; i < W * H; i++) { if (v[i] && !halda[sv.merki[i]]) v[i] = 0; if (v[i]) fjoldi++; }
    // Fótspor: loka veggjanetinu gróft, flóðfylla utan frá; það sem næst ekki í er inni í húsinu.
    const Rf = Math.max(6, Math.round(Wv / 70));
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
    const kvardi = o.kvardi ? Math.min(1, o.kvardi) : Math.min(1, vinnuPx / Math.max(iw, ih));
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
      const g2 = hreinsaGogn(gra, W, H, { dokkt: 210, thykkt: 1, fylla: true, vidmid: o.vidmid });
      let fot = 0;
      for (let i = 0; i < g2.fotspor.length; i++) fot += g2.fotspor[i];
      const hluti = fot / (W * H);
      if (g2.thekja >= 0.04 && hluti >= 0.08 && hluti <= 0.88) g = g2;
    }
    // 3D og húsleitin lesa aðeins grímurnar — þá er stóri striginn (allt að 25 MP á heilu blaði) ekki smíðaður.
    if (o.anStriga) return { strigi: null, vinnu, veggir: g.veggir, thykkir, gra, fotspor: g.fotspor, W, H, kvardi, thekja: g.thekja, thykkt: g.thykkt };
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
      const k = [v[0] + dx * t0 - x0, v[1] + dy * t0 - y0, v[0] + dx * t1 - x0, v[1] + dy * t1 - y0, v[4] || 0];
      if (v[5]) k.push(v[5]);          // eldflokkur TurboPaint-eldveggjar fylgir
      ut.push(k);
    }
    return ut;
  }

  /* ── HOLIR VEGGIR (tvær mjóar samsíða línur með hvítu á milli) ──
   * Léttir milliveggir eru á mörgum uppdráttum teiknaðir sem TVÆR þunnar línur — þykkt bleksins segir þá ekkert
   * (Miðgarður efri álma, Skútuvogur 4). Að loka grímunni (fylla) dugar ekki: þá verða áslínur, málsetning og skástrikun
   * líka að „veggjum" (prófað á Fiskislóð 04.10.2026: 545 veggir, ónothæft).
   * Hér er leitað að HVÍTA bilinu sjálfu: hvítur díll sem á blek skammt frá sér báðum megin þvert (bil g0–g1) en langt
   * hvítt hlaup eftir endilöngu er INNI í holum vegg. Sú gríma er lesin sem borðar (veggirUrGrimu), og síðan síað:
   *   · greiða (≥ 2 samsíða grannar þétt við) = stigi eða skástrikun, ekki veggur;
   *   · stuttur borði einn á sinni línu = hurðarblað, baðkar, húsgagn; stuttir bútar lifa aðeins á línu sem á langan vegg. */
  // Stefna og staða veggjar á línu sinni: { th, rho, t0, t1 }.
  function linuhnit(v) {
    let th = Math.atan2(v[3] - v[1], v[2] - v[0]);
    if (th < 0) th += Math.PI;
    if (th >= Math.PI - 0.01) th -= Math.PI;
    const c = Math.cos(th), s = Math.sin(th), t0 = c * v[0] + s * v[1], t1 = c * v[2] + s * v[3];
    return { th, rho: (-s * v[0] + c * v[1] - s * v[2] + c * v[3]) / 2, t0: Math.min(t0, t1), t1: Math.max(t0, t1) };
  }
  /* GREIÐA: þrír eða fleiri samsíða borðar þétt saman (innan 3,5 veggþykkta, skarast að hálfu) eru stigaþrep, skástrikun
   * eða textalínur í nafnreit — ekki veggir. Sá sem á ≥ 2 slíka granna fellur, og líka jaðarborðar greiðunnar (þeir eiga
   * aðeins einn granna, en hann er í greiðu). Skilar true/false á hvern borða. */
  function greidusia(V) {
    const lina = V.map(linuhnit), lengd = v => Math.hypot(v[2] - v[0], v[3] - v[1]);
    const grannar = V.map((v, i) => {
      const ut = [];
      for (let j = 0; j < V.length; j++) {
        if (j === i || Math.abs(lina[j].th - lina[i].th) > 0.05) continue;
        const d = Math.abs(lina[j].rho - lina[i].rho);
        if (d < 1 || d > Math.max(v[4], V[j][4]) * 3.5) continue;
        const skor = Math.min(lina[i].t1, lina[j].t1) - Math.max(lina[i].t0, lina[j].t0);
        if (skor >= Math.min(lengd(v), lengd(V[j])) * 0.5) ut.push(j);
      }
      return ut;
    });
    const greida = grannar.map(g => g.length >= 2);
    return V.map((v, i) => !greida[i] && !grannar[i].some(j => greida[j]));
  }
  function holirVeggir(gra, W, H, kvardi, k) {
    const N = W * H, pt = k * kvardi;                     // vinnudílar á pt
    const g0 = Math.max(2, Math.round(1.6 * pt)), g1 = Math.max(g0 + 2, Math.round(9 * pt));   // bil 1,6–9 pt (≈ 6–32 cm í 1:100)
    const blek = new Uint8Array(N);
    for (let i = 0; i < N; i++) blek[i] = gra[i] < 205 ? 1 : 0;
    const hw = new Uint16Array(N), vw = new Uint16Array(N);
    for (let y = 0; y < H; y++) {
      const r = y * W;
      for (let x = 0; x < W;) {
        if (blek[r + x]) { x++; continue; }
        let x1 = x; while (x1 < W && !blek[r + x1]) x1++;
        const L = (x === 0 || x1 === W) ? 65535 : Math.min(65535, x1 - x);     // hlaup út í jaðar er ekki afmarkað
        for (let i = x; i < x1; i++) hw[r + i] = L;
        x = x1;
      }
    }
    for (let x = 0; x < W; x++) for (let y = 0; y < H;) {
      if (blek[y * W + x]) { y++; continue; }
      let y1 = y; while (y1 < H && !blek[y1 * W + x]) y1++;
      const L = (y === 0 || y1 === H) ? 65535 : Math.min(65535, y1 - y);
      for (let i = y; i < y1; i++) vw[i * W + x] = L;
      y = y1;
    }
    const m = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (blek[i]) continue;
      const a = hw[i], b = vw[i];
      if ((a >= g0 && a <= g1 && b >= a * 4) || (b >= g0 && b <= g1 && a >= b * 4)) m[i] = 1;
    }
    const r = veggirUrGrimu(m, W, H);
    if (!r) return [];
    // veggþykkt = hvíta bilið + línurnar tvær
    let V = r.butar.map(v => [v[0], v[1], v[2], v[3], v[4] + 2]);
    const lengd = v => Math.hypot(v[2] - v[0], v[3] - v[1]);
    const halda = greidusia(V), lina = V.map(linuhnit);
    // stuttir bútar lifa aðeins á línu sem á langan vegg
    const langt = 34 * pt, stutt = 11 * pt;                 // ≈ 1,2 m og 0,4 m í 1:100
    const ut = [];
    for (let i = 0; i < V.length; i++) {
      if (!halda[i]) continue;
      const L = lengd(V[i]);
      if (L >= langt) { ut.push(V[i]); continue; }
      if (L < stutt) continue;
      let studd = false;
      for (let j = 0; j < V.length && !studd; j++) {
        if (j === i || !halda[j] || lengd(V[j]) < langt) continue;
        if (Math.abs(lina[j].th - lina[i].th) < 0.02 && Math.abs(lina[j].rho - lina[i].rho) < 2.5) studd = true;
      }
      if (studd) ut.push(V[i]);
    }
    return ut;
  }
  /* ── VEGGUR NÆR ALLA LÍNUNA ──
   * Agnar 04.10.2026: „Veggirnir stoppa oft á miðri leið. Eins og með EI-60 og EI-30 veggi — þá ná þeir alla línuna þar
   * til hún endar á annarri eða endar." Greiningin slítur vegg þar sem texti, málsetning eða þverlína liggur yfir hann,
   * þótt línan á teikningunni haldi áfram. Hér er línunni FYLGT á myndinni frá hvorum enda: haldið er áfram meðan
   * þversniðið lítur út eins og veggurinn sjálfur (þykkur: dökkt þvert yfir · holur: tvær línur, ein hvoru megin), yfir
   * stutt rof, og numið staðar þegar línan endar (hurðargat, gluggi í þykkum vegg) eða komið er Á ANNAN VEGG.
   * butar: [ax,ay,bx,by,t] í dílum skornu myndarinnar; gra: grátónar vinnumyndar; kvardi = vinnudílar á díl. */
  function lengjaVeggi(butar, gra, W, H, kvardi) {
    const N = W * H, dokkt = (x, y) => x >= 0 && y >= 0 && x < W && y < H && gra[y * W + x] < 205;
    // hvar standa veggirnir nú þegar (númer veggjar + 1)
    const fyrir = new Int32Array(N);
    const V = butar.map(v => {
      const ax = v[0] * kvardi, ay = v[1] * kvardi, bx = v[2] * kvardi, by = v[3] * kvardi, L = Math.hypot(bx - ax, by - ay) || 1;
      return { ax, ay, bx, by, L, ux: (bx - ax) / L, uy: (by - ay) / L, half: Math.max(1, (v[4] || 0) * kvardi / 2) };
    });
    V.forEach((w, i) => {
      for (let s = 0; s <= w.L; s += 0.5) for (let d = -w.half; d <= w.half; d += 0.5) {
        const x = Math.round(w.ax + w.ux * s - w.uy * d), y = Math.round(w.ay + w.uy * s + w.ux * d);
        if (x >= 0 && y >= 0 && x < W && y < H) fyrir[y * W + x] = i + 1;
      }
    });
    // þversnið í punkti: [hlutfall dökkra innan þykktar, dökkt við báða jaðra?]
    const snid = (w, px, py) => {
      const h = Math.round(w.half);
      let d = 0, n = 0, vinstri = false, haegri = false;
      for (let q = -h - 2; q <= h + 2; q++) {
        const dk = dokkt(Math.round(px - w.uy * q), Math.round(py + w.ux * q));
        if (q >= -h && q <= h) { n++; if (dk) d++; }
        if (dk && q <= -h + 2) vinstri = true;
        if (dk && q >= h - 2) haegri = true;
      }
      return { fyllt: d / n, jadrar: vinstri && haegri };
    };
    return butar.map((v, i) => {
      const w = V[i];
      if (!v[4] || w.L < 6) return v;
      // tegund veggjar lesin af honum sjálfum
      let f = 0, m = 0;
      for (let s = w.L * 0.15; s <= w.L * 0.85; s += Math.max(1, w.L / 24)) { f += snid(w, w.ax + w.ux * s, w.ay + w.uy * s).fyllt; m++; }
      const thykkur = m && f / m >= 0.6;
      const likt = (px, py) => { const o = snid(w, px, py); return thykkur ? o.fyllt >= 0.6 : (o.jadrar && o.fyllt < 0.75); };
      const rof = Math.max(5, Math.round(w.half * 2.5)), hamark = Math.max(W, H);
      const ganga = (x0, y0, sx, sy) => {
        let sidast = 0;
        for (let s = 1; s < hamark; s++) {
          const px = x0 + sx * s, py = y0 + sy * s, gx = Math.round(px), gy = Math.round(py);
          if (gx < 0 || gy < 0 || gx >= W || gy >= H) break;
          const hver = fyrir[gy * W + gx];
          if (hver && hver !== i + 1) { if (s - sidast <= rof) sidast = s; break; }      // komið á annan vegg
          if (likt(px, py)) sidast = s;
          else if (s - sidast > rof) break;
        }
        return sidast;
      };
      const fram = ganga(w.bx, w.by, w.ux, w.uy), aftur = ganga(w.ax, w.ay, -w.ux, -w.uy);
      if (fram < 3 && aftur < 3) return v;
      return [(w.ax - w.ux * (aftur >= 3 ? aftur : 0)) / kvardi, (w.ay - w.uy * (aftur >= 3 ? aftur : 0)) / kvardi, (w.bx + w.ux * (fram >= 3 ? fram : 0)) / kvardi, (w.by + w.uy * (fram >= 3 ? fram : 0)) / kvardi, v[4]];
    });
  }
  /* ── LÍNUBÖND: veggur teiknaður sem 3–4 örþunnar línur þétt saman (klæddir útveggir, Skútuvogur 4) ──
   * Agnar 04.10.2026: „Vantar oft aðal útveggina." Slíkur veggur er hvorki dökkur og þykkur (þykka gríman) né tvær línur
   * með hvítu á milli (holur): í vinnuupplausn rennur hann saman í GRÁAN borða. Vægur þröskuldur + opnun (stakar línur
   * hverfa) → borðar; aðeins þeir sem eru breiðari en stök lína og LANGIR (≥ 2 m í 1:100) teljast — þá kemst ekkert rusl inn. */
  function linubond(gra, W, H, kvardi, k) {
    const N = W * H, pt = k * kvardi;
    let b = new Uint8Array(N);
    for (let i = 0; i < N; i++) b[i] = gra[i] < 215 ? 1 : 0;
    b = dilate(erode(b, W, H, 1), W, H, 1);
    const r = veggirUrGrimu(b, W, H);
    if (!r) return [];
    const B = r.butar.filter(v => v[4] >= 3.5 && v[4] <= 14 * pt && Math.hypot(v[2] - v[0], v[3] - v[1]) >= 56 * pt);
    const halda = greidusia(B);        // textalínur í nafnreit og skýringum eru greiða, ekki veggir
    return B.filter((v, i) => halda[i]);
  }
  // Hve stór hluti MINNI skurðarins liggur innan hins (0–1). Notað til að ákveða hvort tvær hæðir standi á sama stað á blaði.
  function skorunSkurda(a, b) {
    if (!a || !b) return 0;
    const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    return (ix * iy) / Math.max(1, Math.min(a.w * a.h, b.w * b.h));
  }

  /* ── KLASAR: hvaða bútar hanga saman (snertast, skerast eða standa innan við `tengibil` hver frá öðrum) ──
   * Skilar fylki með klasanúmeri hvers bútar (0, 1, 2 …). */
  function klasaButa(butar, tengibil) {
    const n = butar.length, rot = Array.from({ length: n }, (_, i) => i);
    const finna = i => { while (rot[i] !== i) { rot[i] = rot[rot[i]]; i = rot[i]; } return i; };
    const pkt = (px, py, v) => { const dx = v[2] - v[0], dy = v[3] - v[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - v[0]) * dx + (py - v[1]) * dy) / L2)); return Math.hypot(px - (v[0] + dx * t), py - (v[1] + dy * t)); };
    const skerast = (a, b) => {
      const d = (b[3] - b[1]) * (a[2] - a[0]) - (b[2] - b[0]) * (a[3] - a[1]);
      if (Math.abs(d) < 1e-9) return false;
      const ua = ((b[2] - b[0]) * (a[1] - b[1]) - (b[3] - b[1]) * (a[0] - b[0])) / d, ub = ((a[2] - a[0]) * (a[1] - b[1]) - (a[3] - a[1]) * (a[0] - b[0])) / d;
      return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    };
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = butar[i], b = butar[j], bil = tengibil + ((a[4] || 0) + (b[4] || 0)) / 2;
      if (Math.min(a[0], a[2]) - bil > Math.max(b[0], b[2]) || Math.min(b[0], b[2]) - bil > Math.max(a[0], a[2]) || Math.min(a[1], a[3]) - bil > Math.max(b[1], b[3]) || Math.min(b[1], b[3]) - bil > Math.max(a[1], a[3])) continue;
      if (skerast(a, b) || Math.min(pkt(a[0], a[1], b), pkt(a[2], a[3], b), pkt(b[0], b[1], a), pkt(b[2], b[3], a)) <= bil) rot[finna(i)] = finna(j);
    }
    const nr = new Map();
    return butar.map((_, i) => { const r = finna(i); if (!nr.has(r)) nr.set(r, nr.size); return nr.get(r); });
  }

  /* ── HÚSIÐ SJÁLFT: veggjanetið sem hangir saman ──
   * Agnar 04.10.2026 (Arnarhvoll, óskorið blað): textalínur í nafnreit og tákn á lóðinni urðu að veggjum — „smá mesh þarna".
   * Veggir húss mynda NET: þeir snertast eða standa innan við hurðarbreidd hver frá öðrum. Nafnreitur, norðurör og
   * skýringar eru stakir smáklasar utan við það. Haldið er stærsta klasanum (að lengd), öðrum klösum sem eru a.m.k.
   * fjórðungur af honum (annað hús á blaðinu), öllu sem stendur INNAN umgjarðar aðalklasans (stakir innveggir) og
   * ÁLMUM: klasa sem er sjálfur drjúgur (≥ `alma` að lengd) og stendur innan við `naerri` frá því sem þegar er haldið
   * (Miðgarður: hægri álman hangir ekki saman við hitt nema um ganginn). Annað fellur.
   * butar: [ax,ay,bx,by,t]; tengibil, naerri og alma í sömu dílum. */
  function husklasi(butar, tengibil, naerri, alma) {
    const n = butar.length;
    if (n < 4) return butar;
    const rot = Array.from({ length: n }, (_, i) => i);
    const finna = i => { while (rot[i] !== i) { rot[i] = rot[rot[i]]; i = rot[i]; } return i; };
    const pkt = (px, py, v) => { const dx = v[2] - v[0], dy = v[3] - v[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - v[0]) * dx + (py - v[1]) * dy) / L2)); return Math.hypot(px - (v[0] + dx * t), py - (v[1] + dy * t)); };
    const skerast = (a, b) => {
      const d = (b[3] - b[1]) * (a[2] - a[0]) - (b[2] - b[0]) * (a[3] - a[1]);
      if (Math.abs(d) < 1e-9) return false;
      const ua = ((b[2] - b[0]) * (a[1] - b[1]) - (b[3] - b[1]) * (a[0] - b[0])) / d, ub = ((a[2] - a[0]) * (a[1] - b[1]) - (a[3] - a[1]) * (a[0] - b[0])) / d;
      return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    };
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = butar[i], b = butar[j], bil = tengibil + ((a[4] || 0) + (b[4] || 0)) / 2;
      if (Math.min(a[0], a[2]) - bil > Math.max(b[0], b[2]) || Math.min(b[0], b[2]) - bil > Math.max(a[0], a[2]) || Math.min(a[1], a[3]) - bil > Math.max(b[1], b[3]) || Math.min(b[1], b[3]) - bil > Math.max(a[1], a[3])) continue;
      if (skerast(a, b) || Math.min(pkt(a[0], a[1], b), pkt(a[2], a[3], b), pkt(b[0], b[1], a), pkt(b[2], b[3], a)) <= bil) rot[finna(i)] = finna(j);
    }
    const lengd = new Map();
    butar.forEach((v, i) => { const r = finna(i); lengd.set(r, (lengd.get(r) || 0) + Math.hypot(v[2] - v[0], v[3] - v[1])); });
    let adal = -1, mest = 0;
    lengd.forEach((l, r) => { if (l > mest) { mest = l; adal = r; } });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    butar.forEach((v, i) => { if (finna(i) !== adal) return; x0 = Math.min(x0, v[0], v[2]); x1 = Math.max(x1, v[0], v[2]); y0 = Math.min(y0, v[1], v[3]); y1 = Math.max(y1, v[1], v[3]); });
    const sp = Math.max(x1 - x0, y1 - y0) * 0.03;
    x0 -= sp; y0 -= sp; x1 += sp; y1 += sp;
    const haldid = butar.map((v, i) => {
      const r = finna(i);
      if (r === adal || lengd.get(r) >= mest * 0.25) return true;
      const mx = (v[0] + v[2]) / 2, my = (v[1] + v[3]) / 2;
      return mx >= x0 && mx <= x1 && my >= y0 && my <= y1;
    });
    // álmur: drjúgur klasi skammt frá því sem þegar er haldið — endurtekið þar til ekkert bætist við
    if (naerri > 0) {
      const bilMilli = (a, b) => skerast(a, b) ? 0 : Math.min(pkt(a[0], a[1], b), pkt(a[2], a[3], b), pkt(b[0], b[1], a), pkt(b[2], b[3], a));
      for (let breytt = true; breytt;) {
        breytt = false;
        lengd.forEach((l, r) => {
          if (l < (alma || 0)) return;
          const felagar = [];
          for (let i = 0; i < n; i++) if (finna(i) === r) felagar.push(i);
          if (!felagar.length || haldid[felagar[0]]) return;
          let naer = false;
          for (let j = 0; j < n && !naer; j++) { if (!haldid[j]) continue; for (const i of felagar) if (bilMilli(butar[i], butar[j]) <= naerri) { naer = true; break; } }
          if (naer) { felagar.forEach(i => { haldid[i] = true; }); breytt = true; }
        });
      }
    }
    return butar.filter((v, i) => haldid[i]);
  }
  // Liggur v á línu u (samsíða, miðja v innan u og innan veggþykktar)? Notað til að fella holan vegg sem er í raun
  // útlína þykks veggjar eða gluggi í honum.
  const aSomuLinu = (v, u) => {
    const ux = u[2] - u[0], uy = u[3] - u[1], L = Math.hypot(ux, uy) || 1, vx = v[2] - v[0], vy = v[3] - v[1], Lv = Math.hypot(vx, vy) || 1;
    if (Math.abs(ux * vy - uy * vx) / (L * Lv) > 0.08) return false;
    const mx = (v[0] + v[2]) / 2 - u[0], my = (v[1] + v[3]) / 2 - u[1];
    return Math.abs(mx * uy - my * ux) / L <= (u[4] + v[4]) / 2 + 3 && (mx * ux + my * uy) / L >= -2 && (mx * ux + my * uy) / L <= L + 2;
  };

  /* ── HURÐARGÖT: rými lokast ──
   * Agnar 04.10.2026: „setja reglu að veggir reyna alltaf að tengjast í rými — að allir veggirnir tengjast, hvort það sé
   * gluggi eða hurð sem tengir þá." Gluggar eru gler (glerIBilum). Hér er hitt: STUTT bil (≤ `mest`, tvöföld hurð) sem er
   * ekki gler er hurðargat og fær dyrakarm yfir sig, svo veggurinn heldur áfram ofan við hurðina og rýmið lokast:
   *   a) bil milli tveggja veggbúta á SÖMU LÍNU;
   *   b) laus veggendi sem á annan vegg beint fram undan sér á línu sinni (hurð í horni, við þvervegg).
   * Lengra bil stendur opið — það er op, ekki hurð. butar/gler: [ax,ay,bx,by,t]; k = dílar á pt. Skilar bilunum sjálfum.
   *
   * 08.10.2026 (Agnar, Sléttuvegur 7 / 1532 í 3D: „kemur svolítið út í mesh" — tugir hurðarkarma út um allt, á ská og í
   * kross). Mælt: 89 hurðir, þar af 82 úr (b). Þrennt var að (b):
   *   1. Hver STUBBUR sem greiningin fann (feitletrað herbergisheiti „01.07 Sjúkraþjálfun 109,0 m²", málsetning, húsgagn)
   *      er „veggur" með tvo lausa enda og skaut hurð allt að 2,75 m yfir herbergið að næsta vegg. Hurð úr (b) kemur nú
   *      aðeins úr FESTUM vegg: hann snertir annan vegg, er brúaður samlínu (a), er langur (≥ `langur`), eða annar endinn
   *      stendur innan við `framhald` (≈ 0,6 m á A1 í 1:100 — mjórra en hurð) frá vegg fram undan. Stakur veggur sem festur
   *      veggur vísar á fær áfram hurðina (Þingholt kjallari: þykki geymsluveggurinn).
   *      Veggirnir sjálfir haldast eins og áður: stakra-veggja-sían (tengdirVeggir) les ÖLL bilin (ut.tengi), líka þau sem
   *      fá enga hurð hér. Að fella stubbana líka var mælt og hafnað: á Arnarhvoli féllu þá tveir raunverulegir
   *      gangveggjabútar sem héngu aðeins á slíkum bilum (greiningin rofnaði við samskeytin).
   *   2. Geislinn sá ekki veggi sem liggja innan við ~17° frá stefnu hans (samsíða-reglan) og fór beint í gegnum þá:
   *      í skakkri álmu (Sléttuvegur: ~12°) lentu hurðir á skáveggjum og þvert í gegnum þá. Hurð sem sker vegg eða gler fellur.
   *   3. Tveir geislar gátu skorist („+" í fundarherbergi). Hurðir skerast aldrei: (b)-hurð sem sker samlínuhurð fellur,
   *      og af tveimur (b)-hurðum sem skerast lifir sú styttri. */
  function hurdagot(butar, gler, k, o) {
    o = o || {};
    const minnst = 8 * k, mest = 78 * k, vik = 2 * k, ut = [], n = butar.length;
    const L = butar.map(linuhnit), sjalfg = 3 * k;
    const erGler = (ax, ay, bx, by) => (gler || []).some(g => aSomuLinu([ax, ay, bx, by, sjalfg], g));
    const bruad = new Uint8Array(n * 2);          // endi veggjar (a = 2i, b = 2i+1) sem þegar tengist yfir bil
    // a) samlínu bútar
    const rad = butar.map((v, i) => i).sort((p, q) => L[p].th - L[q].th);
    for (let a = 0; a < n;) {
      let b = a + 1;
      while (b < n && L[rad[b]].th - L[rad[b - 1]].th < 0.01) b++;
      const hopur = rad.slice(a, b); a = b;
      const th = hopur.reduce((s0, i) => s0 + L[i].th, 0) / hopur.length, c = Math.cos(th), sn = Math.sin(th);
      const ln = hopur.map(i => { const v = butar[i], t0 = c * v[0] + sn * v[1], t1 = c * v[2] + sn * v[3]; return { i, rho: (-sn * v[0] + c * v[1] - sn * v[2] + c * v[3]) / 2, t0: Math.min(t0, t1), t1: Math.max(t0, t1), snuid: t0 > t1 }; }).sort((p, q) => p.rho - q.rho);
      for (let x = 0; x < ln.length;) {
        let y = x + 1;
        while (y < ln.length && ln[y].rho - ln[y - 1].rho < vik) y++;
        const rod = ln.slice(x, y).sort((p, q) => p.t0 - q.t0); x = y;
        let fyrri = rod[0];
        for (let z = 1; z < rod.length; z++) {
          const nu = rod[z], bil = nu.t0 - fyrri.t1;
          if (bil >= minnst && bil <= mest) {
            const rho = (fyrri.rho + nu.rho) / 2, ax = c * fyrri.t1 - sn * rho, ay = sn * fyrri.t1 + c * rho, bx = c * nu.t0 - sn * rho, by = sn * nu.t0 + c * rho;
            bruad[fyrri.i * 2 + (fyrri.snuid ? 0 : 1)] = 1; bruad[nu.i * 2 + (nu.snuid ? 1 : 0)] = 1;
            if (!erGler(ax, ay, bx, by)) ut.push([ax, ay, bx, by, Math.max(butar[fyrri.i][4] || 0, butar[nu.i][4] || 0) || sjalfg]);
          } else if (bil < minnst) { bruad[fyrri.i * 2 + (fyrri.snuid ? 0 : 1)] = 1; bruad[nu.i * 2 + (nu.snuid ? 1 : 0)] = 1; }
          if (nu.t1 > fyrri.t1) fyrri = nu;
        }
      }
    }
    const samlina = ut.length;
    // b) laus endi FESTS veggjar → næsti veggur beint fram undan
    const pkt = (px, py, v) => { const dx = v[2] - v[0], dy = v[3] - v[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - v[0]) * dx + (py - v[1]) * dy) / L2)); return Math.hypot(px - (v[0] + dx * t), py - (v[1] + dy * t)); };
    const lengd = v => Math.hypot(v[2] - v[0], v[3] - v[1]);
    // Skerast strikin í raun? Endar a (innan `jadar` af lengd hennar) teljast ekki — hurð snertir veggina sem hún liggur á milli.
    const skera = (a, q, jadar) => {
      const d = (q[3] - q[1]) * (a[2] - a[0]) - (q[2] - q[0]) * (a[3] - a[1]);
      if (Math.abs(d) < 1e-9) return false;
      const ua = ((q[2] - q[0]) * (a[1] - q[1]) - (q[3] - q[1]) * (a[0] - q[0])) / d, ub = ((a[2] - a[0]) * (a[1] - q[1]) - (a[3] - a[1]) * (a[0] - q[0])) / d;
      return ua > jadar && ua < 1 - jadar && ub >= 0 && ub <= 1;
    };
    const kassi = (a, q, m) => !(Math.min(a[0], a[2]) - m > Math.max(q[0], q[2]) || Math.min(q[0], q[2]) - m > Math.max(a[0], a[2]) || Math.min(a[1], a[3]) - m > Math.max(q[1], q[3]) || Math.min(q[1], q[3]) - m > Math.max(a[1], a[3]));
    // geislar allra lausra enda: snertir endinn vegg, og hvaða vegg hittir hann fyrst fram undan (innan `mest`)?
    const geislar = [];
    for (let i = 0; i < n; i++) for (const e of [0, 1]) {
      if (bruad[i * 2 + e]) continue;
      const v = butar[i], px = e ? v[2] : v[0], py = e ? v[3] : v[1], Lv = Math.hypot(v[2] - v[0], v[3] - v[1]) || 1;
      const ux = (e ? 1 : -1) * (v[2] - v[0]) / Lv, uy = (e ? 1 : -1) * (v[3] - v[1]) / Lv;
      let snertir = false, naest = mest + 1, hitt = null;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const w = butar[j];
        if (pkt(px, py, w) <= ((w[4] || 0) + (v[4] || 0)) / 2 + 3 * k) { snertir = true; break; }
        const wx = w[2] - w[0], wy = w[3] - w[1], d = ux * wy - uy * wx;
        if (Math.abs(d) < 0.3 * Math.hypot(wx, wy)) continue;                       // samsíða — (a) sér um þá
        const tt = ((w[0] - px) * wy - (w[1] - py) * wx) / d, uu = ((w[0] - px) * uy - (w[1] - py) * ux) / d;
        if (tt > minnst && tt < naest && uu >= -0.02 && uu <= 1.02) { naest = tt; hitt = j; }
      }
      geislar.push({ i, px, py, ux, uy, snertir, naest, hitt });
    }
    // FESTUR veggur (sjá 1. hér að ofan)
    const langur = o.langur || 170 * k, framhald = 17 * k;
    const festur = butar.map((v, i) => {
      if (bruad[i * 2] || bruad[i * 2 + 1] || lengd(v) >= langur) return true;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const w = butar[j], bil = ((v[4] || 0) + (w[4] || 0)) / 2 + 3 * k;
        if (kassi(v, w, bil) && (skera(v, w, 0) || Math.min(pkt(v[0], v[1], w), pkt(v[2], v[3], w), pkt(w[0], w[1], v), pkt(w[2], w[3], v)) <= bil)) return true;
      }
      return false;
    });
    geislar.forEach(g => { if (g.snertir || (g.hitt != null && g.naest <= framhald)) festur[g.i] = true; });
    const endar = [], fellt = { laus: 0, gegnum: 0, kross: 0 }, tengi = ut.slice();
    for (const g of geislar) {
      if (g.snertir || g.hitt == null) continue;
      const v = butar[g.i], bx = g.px + g.ux * g.naest, by = g.py + g.uy * g.naest, D = [g.px, g.py, bx, by];
      if (erGler(g.px, g.py, bx, by)) continue;
      tengi.push([g.px, g.py, bx, by, v[4] || sjalfg]);          // tenging fyrir stakra-veggja-síuna, eins og áður
      if (!festur[g.i]) { fellt.laus++; continue; }
      // í gegnum vegg (líka þá sem liggja nær samsíða og geislinn sá ekki) eða gler → engin hurð. Skurður innan veggþykktar
      // frá endunum telst ekki: veggurinn sem hurðin lendir á er stundum tveir samsíða bútar (þykk gríma + holur veggur).
      let gegnum = false;
      const LD = Math.max(1e-6, g.naest);
      for (let j = 0; j < n && !gegnum; j++) if (j !== g.i && j !== g.hitt && kassi(D, butar[j], 0) && skera(D, butar[j], Math.min(0.45, Math.max(0.02, (((butar[j][4] || 0) + (butar[g.hitt][4] || 0)) / 2 + 4 * k) / LD)))) gegnum = true;
      for (let j = 0; gler && j < gler.length && !gegnum; j++) if (kassi(D, gler[j], 0) && skera(D, gler[j], Math.min(0.45, Math.max(0.02, (((gler[j][4] || 0) + (butar[g.hitt][4] || 0)) / 2 + 4 * k) / LD)))) gegnum = true;
      if (gegnum) { fellt.gegnum++; continue; }
      endar.push([g.px, g.py, bx, by, v[4] || sjalfg]);
    }
    // hurðir skerast ekki: samlínuhurð gengur fyrir, svo styttri endahurð
    endar.sort((p, q) => lengd(p) - lengd(q));
    for (const D of endar) {
      const jad = (a, q) => Math.min(0.45, Math.max(0.02, (((a[4] || 0) + (q[4] || 0)) / 2 + 4 * k) / Math.max(1e-6, lengd(a))));
      if (ut.some(q => kassi(D, q, 0) && skera(D, q, jad(D, q)) && skera(q, D, jad(q, D)))) { fellt.kross++; continue; }
      ut.push(D);
    }
    ut.uppruni = { samlina, endi: ut.length - samlina, fellt };
    ut.tengi = tengi;
    return ut;
  }
  /* ── STAKIR VEGGIR úti á gólfi ──
   * Agnar 04.10.2026: reglan um að veggir tengist í rými „hindrar þá kannski að stakir veggir úti á gólfi myndast".
   * Veggur sem snertir engan annan vegg og tengist engu um glugga eða hurð er ekki hluti af neinu rými — húsgagn,
   * borðplata, texti. Hann fellur, nema hann sé langur (≥ `langur`): frístandandi langveggur er til.
   * Skilar true/false á hvern vegg. */
  function tengdirVeggir(butar, gler, hurdir, k, langur) {
    const n = butar.length, tengi = (gler || []).concat(hurdir || []);
    const pkt = (px, py, v) => { const dx = v[2] - v[0], dy = v[3] - v[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - v[0]) * dx + (py - v[1]) * dy) / L2)); return Math.hypot(px - (v[0] + dx * t), py - (v[1] + dy * t)); };
    const skerast = (a, b) => {
      const d = (b[3] - b[1]) * (a[2] - a[0]) - (b[2] - b[0]) * (a[3] - a[1]);
      if (Math.abs(d) < 1e-9) return false;
      const ua = ((b[2] - b[0]) * (a[1] - b[1]) - (b[3] - b[1]) * (a[0] - b[0])) / d, ub = ((a[2] - a[0]) * (a[1] - b[1]) - (a[3] - a[1]) * (a[0] - b[0])) / d;
      return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    };
    const snertast = (a, b, bil) => skerast(a, b) || Math.min(pkt(a[0], a[1], b), pkt(a[2], a[3], b), pkt(b[0], b[1], a), pkt(b[2], b[3], a)) <= bil;
    return butar.map((v, i) => {
      if (Math.hypot(v[2] - v[0], v[3] - v[1]) >= langur) return true;
      for (let j = 0; j < n; j++) if (j !== i && snertast(v, butar[j], ((v[4] || 0) + (butar[j][4] || 0)) / 2 + 4 * k)) return true;
      for (const g of tengi) if (snertast(v, g, (v[4] || 0) / 2 + 4 * k)) return true;
      return false;
    });
  }
  /* ── ELDVEGGIR: EI-merkið gildir um ALLAN vegginn sem það stendur við, út í enda línunnar ──
   * Agnar 03.10.2026: merkið fylgir veggnum í báðar áttir, í gegnum T-mót, og stoppar aðeins þar sem línan sjálf endar.
   * 04.10.2026: „yrði hægt að notast við EI-60 og þær merkingar … en þau geta snúið allavega."
   * hintar: [{x, y, label, minutes}] í sömu dílum og butar. Merki með CS (EI-CS-30, EI30-CS) eru HURÐIR og lita ekki vegg.
   * Skilar mínútum á hvern vegg (0 / 30 / 60). */
  function merkjaEldveggi(butar, hintar, k) {
    const eld = new Uint8Array(butar.length);
    if (!hintar || !hintar.length || !butar.length) return eld;
    const naerri = 30 * k, bil = 80 * k, vik = 2.5 * k;       // merki innan ≈ 1 m frá vegg · lína slitnar við > ≈ 2,8 m gat
    for (const hn of hintar) {
      const min = +hn.minutes === 30 ? 30 : +hn.minutes === 60 ? 60 : 0;
      if (!min || /CS/i.test(hn.label || '')) continue;
      let best = -1, bd = naerri;
      for (let i = 0; i < butar.length; i++) {
        const v = butar[i], dx = v[2] - v[0], dy = v[3] - v[1], L2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((hn.x - v[0]) * dx + (hn.y - v[1]) * dy) / L2));
        const d = Math.hypot(hn.x - (v[0] + dx * t), hn.y - (v[1] + dy * t)) - (v[4] || 0) / 2;
        if (d < bd) { bd = d; best = i; }
      }
      if (best < 0) continue;
      const o = butar[best], oL = Math.hypot(o[2] - o[0], o[3] - o[1]) || 1, c = (o[2] - o[0]) / oL, sn = (o[3] - o[1]) / oL;
      const rho0 = -sn * o[0] + c * o[1], rod = [];
      for (let i = 0; i < butar.length; i++) {
        const v = butar[i], L = Math.hypot(v[2] - v[0], v[3] - v[1]) || 1;
        if (Math.abs(((v[2] - v[0]) * sn - (v[3] - v[1]) * c) / L) > 0.03) continue;
        const rho = -sn * (v[0] + v[2]) / 2 + c * (v[1] + v[3]) / 2;
        if (Math.abs(rho - rho0) > vik + ((v[4] || 0) + (o[4] || 0)) / 4) continue;
        const a = c * v[0] + sn * v[1], b = c * v[2] + sn * v[3];
        rod.push({ i, t0: Math.min(a, b), t1: Math.max(a, b) });
      }
      rod.sort((a, b) => a.t0 - b.t0);
      const p = rod.findIndex(r => r.i === best);
      const setja = r => { if (eld[r.i] < min) eld[r.i] = min; };
      setja(rod[p]);
      for (let q = p + 1, endi = rod[p].t1; q < rod.length && rod[q].t0 - endi <= bil; q++) { setja(rod[q]); endi = Math.max(endi, rod[q].t1); }
      for (let q = p - 1, byrjun = rod[p].t0; q >= 0 && byrjun - rod[q].t1 <= bil; q--) { setja(rod[q]); byrjun = Math.min(byrjun, rod[q].t0); }
    }
    return eld;
  }

  /* Hurð í brunavegg: veggurinn heldur áfram OFAN við hurðina og er því brunaveggur þar líka (Agnar 04.10.2026: „bilið
   * fyrir ofan hurð á brunavegg ætti þá að vera brunaveggur líka og þá rauður"). Hurðin erfir flokk veggjarins sem hún
   * situr í: samsíða veggur sem snertir annan hvorn enda hennar. Skilar mínútum á hverja hurð (0 / 30 / 60). */
  function eldurHurda(hurdir, butar, eld, k) {
    const ut = new Uint8Array(hurdir.length);
    if (!eld) return ut;
    const pkt = (px, py, v) => { const dx = v[2] - v[0], dy = v[3] - v[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - v[0]) * dx + (py - v[1]) * dy) / L2)); return Math.hypot(px - (v[0] + dx * t), py - (v[1] + dy * t)); };
    hurdir.forEach((hd, i) => {
      const hx = hd[2] - hd[0], hy = hd[3] - hd[1], hL = Math.hypot(hx, hy) || 1;
      for (let j = 0; j < butar.length; j++) {
        if (!eld[j] || eld[j] <= ut[i]) continue;
        const v = butar[j], vL = Math.hypot(v[2] - v[0], v[3] - v[1]) || 1;
        if (Math.abs((hx * (v[3] - v[1]) - hy * (v[2] - v[0])) / (hL * vL)) > 0.1) continue;      // ekki samsíða
        const bil = (v[4] || 0) / 2 + 4 * k;
        if (pkt(hd[0], hd[1], v) <= bil || pkt(hd[2], hd[3], v) <= bil) ut[i] = eld[j];
      }
    });
    return ut;
  }

  /* ── BRUNAHÓLF ──
   * Agnar 04.10.2026: „Brunaveggir mynda alltaf lokað öruggt rými svo eldur haldist innan þess rýmis. Sem kallast
   * brunahólf. Eru þá allan hringinn kringum ákveðið rými með eldveggjum og útveggjum." · „Svo brunaveggir geta ekki
   * verið stakir. Þeir þurfa alltaf að mynda rými."
   * Þrjú skref, öll á grófri rist yfir skornu myndina (b × h dílar, k = dílar á pt):
   *   1. ÚTVEGGIR: allir veggir, gler og hurðir eru þanin (≈ 0,6 m) svo smágöt lokist, flætt er utan frá, og útisvæðið svo
   *      látið ganga að veggjunum. Veggur sem á útisvæði öðru megin eftir mestallri lengd sinni er útveggur.
   *   2. LOKUN: endi brunaveggjar sem snertir hvorki annan brunavegg, útvegg né útisvæði hangir í lausu lofti — það getur
   *      ekki verið. Stysta leið eftir öðrum veggjum (um hurðir og gler líka) að næsta brunavegg eða útvegg, mest ≈ 15 m,
   *      er ÁLYKTUÐ brunaveggur (sýnd í ljósari lit: þetta er ályktun, ekki merking á teikningunni).
   *   3. HÓLFIN: brunaveggir (merktir og ályktaðir), hurðir í þeim, útveggir og gler/hurðir í þeim eru hindranir; hvert
   *      samhangandi svæði innan húss sem þær afmarka er eitt brunahólf.
   * Skilar { ytri, alyktad, gw, gh, svaedi (númer hólfs á hvern reit, 0 = ekkert), fjoldi, fermetrar[] } eða null. */
  function brunaholf(butar, gler, hurdir, eld, hurdEld, b, h, k, bannad) {
    const n = butar.length;
    if (!n || !eld || !eld.some(e => e)) return null;
    const c = Math.max(b, h) / 480, gw = Math.max(2, Math.ceil(b / c)), gh = Math.max(2, Math.ceil(h / c)), N = gw * gh;
    const tengi = (gler || []).concat(hurdir || []);
    const strika = (g, v, auka) => {
      const L = Math.hypot(v[2] - v[0], v[3] - v[1]) || 1, ux = (v[2] - v[0]) / L, uy = (v[3] - v[1]) / L, half = (v[4] || 0) / 2 + auka;
      for (let t = -half; t <= L + half; t += c * 0.5) for (let d = -half; d <= half; d += c * 0.5) {
        const x = Math.floor((v[0] + ux * t - uy * d) / c), y = Math.floor((v[1] + uy * t + ux * d) / c);
        if (x >= 0 && y >= 0 && x < gw && y < gh) g[y * gw + x] = 1;
      }
    };
    const pkt = (px, py, v) => { const dx = v[2] - v[0], dy = v[3] - v[1], L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - v[0]) * dx + (py - v[1]) * dy) / L2)); return Math.hypot(px - (v[0] + dx * t), py - (v[1] + dy * t)); };
    const skerast = (a, q) => {
      const d = (q[3] - q[1]) * (a[2] - a[0]) - (q[2] - q[0]) * (a[3] - a[1]);
      if (Math.abs(d) < 1e-9) return false;
      const ua = ((q[2] - q[0]) * (a[1] - q[1]) - (q[3] - q[1]) * (a[0] - q[0])) / d, ub = ((a[2] - a[0]) * (a[1] - q[1]) - (a[3] - a[1]) * (a[0] - q[0])) / d;
      return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    };
    const fjarl = (a, q) => skerast(a, q) ? 0 : Math.min(pkt(a[0], a[1], q), pkt(a[2], a[3], q), pkt(q[0], q[1], a), pkt(q[2], q[3], a));
    const lengd = v => Math.hypot(v[2] - v[0], v[3] - v[1]);

    // 1 · útisvæði og útveggir
    const allt = new Uint8Array(N);
    butar.forEach(v => strika(allt, v, c * 0.5)); tengi.forEach(v => strika(allt, v, c * 0.5));
    // Tvær umferðir. FYRRI er gróf: veggirnir þandir um ≈ 5 m svo stór göt á útvegg (aksturshurð, veggur sem fannst ekki)
    // hleypi útisvæðinu ekki inn; þá sést hvaða veggir standa yst (útveggjaefni). Bil ≤ 15 m milli slíkra veggja Á SÖMU
    // LÍNU er lokað með sýndarvegg — húsið heldur þá vatni. SEINNI umferðin er nákvæm (≈ 0,6 m) á lokaðri umgjörðinni.
    const st = new Int32Array(N);
    let top = 0;
    const flaeda = (hindr, rr) => {
      const thanid = dilate(hindr, gw, gh, rr), u = new Uint8Array(N);
      top = 0;
      const yta = q => { if (!thanid[q] && !u[q]) { u[q] = 1; st[top++] = q; } };
      for (let x = 0; x < gw; x++) { yta(x); yta((gh - 1) * gw + x); }
      for (let y = 0; y < gh; y++) { yta(y * gw); yta(y * gw + gw - 1); }
      while (top) { const q = st[--top], x = q % gw, y = (q - x) / gw; if (x > 0) yta(q - 1); if (x < gw - 1) yta(q + 1); if (y > 0) yta(q - gw); if (y < gh - 1) yta(q + gw); }
      // útisvæðið gengur að veggjunum (mest þensluna + 2 reiti)
      let fremst = [];
      for (let q = 0; q < N; q++) if (u[q]) fremst.push(q);
      for (let d = 0; d < rr + 2 && fremst.length; d++) {
        const naest = [];
        for (const q of fremst) {
          const x = q % gw, y = (q - x) / gw;
          for (const w of [x > 0 ? q - 1 : -1, x < gw - 1 ? q + 1 : -1, y > 0 ? q - gw : -1, y < gh - 1 ? q + gw : -1]) if (w >= 0 && !u[w] && !hindr[w]) { u[w] = 1; naest.push(w); }
        }
        fremst = naest;
      }
      return u;
    };
    const yst = u => {
      const er = (x, y) => { const gx = Math.floor(x / c), gy = Math.floor(y / c); return gx < 0 || gy < 0 || gx >= gw || gy >= gh || u[gy * gw + gx] === 1; };
      return butar.map(v => {
        const L = lengd(v) || 1, nx = -(v[3] - v[1]) / L, ny = (v[2] - v[0]) / L, d = (v[4] || 0) / 2 + 2.5 * c;
        let p1 = 0, p2 = 0;
        for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) { const px = v[0] + (v[2] - v[0]) * t, py = v[1] + (v[3] - v[1]) * t; if (er(px + nx * d, py + ny * d)) p1++; if (er(px - nx * d, py - ny * d)) p2++; }
        return Math.max(p1, p2) >= 3;
      });
    };
    const efni = yst(flaeda(allt, Math.max(4, Math.round(150 * k / c))));
    const syndar = [], Ln = butar.map(linuhnit), rad = [];
    for (let i = 0; i < n; i++) if (efni[i]) rad.push(i);
    rad.sort((p1, p2) => Ln[p1].th - Ln[p2].th);
    for (let x = 0; x < rad.length;) {
      let y = x + 1;
      while (y < rad.length && Ln[rad[y]].th - Ln[rad[y - 1]].th < 0.01) y++;
      const hopur = rad.slice(x, y); x = y;
      const th = hopur.reduce((s0, i) => s0 + Ln[i].th, 0) / hopur.length, cs = Math.cos(th), sn = Math.sin(th);
      const ln = hopur.map(i => { const v = butar[i], t0 = cs * v[0] + sn * v[1], t1 = cs * v[2] + sn * v[3]; return { rho: (-sn * v[0] + cs * v[1] - sn * v[2] + cs * v[3]) / 2, t0: Math.min(t0, t1), t1: Math.max(t0, t1), t: v[4] || 0 }; }).sort((p1, p2) => p1.rho - p2.rho);
      for (let q = 0; q < ln.length;) {
        let w = q + 1;
        while (w < ln.length && ln[w].rho - ln[w - 1].rho < 3 * k) w++;
        const rod = ln.slice(q, w).sort((p1, p2) => p1.t0 - p2.t0); q = w;
        let fyrri = rod[0];
        for (let z = 1; z < rod.length; z++) {
          const nu = rod[z], bil = nu.t0 - fyrri.t1;
          if (bil > 0 && bil <= 425 * k) { const rho = (fyrri.rho + nu.rho) / 2; syndar.push([cs * fyrri.t1 - sn * rho, sn * fyrri.t1 + cs * rho, cs * nu.t0 - sn * rho, sn * nu.t0 + cs * rho, Math.max(fyrri.t, nu.t)]); }
          if (nu.t1 > fyrri.t1) fyrri = nu;
        }
      }
    }
    const lokad = allt.slice();
    syndar.forEach(v => strika(lokad, v, c * 0.5));
    const r = Math.max(3, Math.round(17 * k / c)), uti = flaeda(lokad, r);
    const erUti = (x, y) => { const gx = Math.floor(x / c), gy = Math.floor(y / c); return gx < 0 || gy < 0 || gx >= gw || gy >= gh || uti[gy * gw + gx] === 1; };
    const ytri = yst(uti);

    // 2 · lokun: lausir endar brunaveggja
    const grannar = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (fjarl(butar[i], butar[j]) <= ((butar[i][4] || 0) + (butar[j][4] || 0)) / 2 + 4 * k) { grannar[i].push(j); grannar[j].push(i); }
    const vidTengi = tengi.map(g => { const ut = []; for (let i = 0; i < n; i++) if (fjarl(g, butar[i]) <= (butar[i][4] || 0) / 2 + 4 * k) ut.push(i); return ut; });
    vidTengi.forEach(l => { for (const i of l) for (const j of l) if (i !== j && grannar[i].indexOf(j) < 0) grannar[i].push(j); });
    const alyktad = new Uint8Array(n), fastur = i => eld[i] || alyktad[i] || ytri[i];
    const naerUti = (px, py) => { const R = (r + 3) * c; for (let a = 0; a < 8; a++) if (erUti(px + Math.cos(a * Math.PI / 4) * R, py + Math.sin(a * Math.PI / 4) * R)) return true; return erUti(px, py); };
    const mestLeid = 425 * k;
    for (let i = 0; i < n; i++) {
      if (!eld[i]) continue;
      for (const e of [0, 1]) {
        const px = e ? butar[i][2] : butar[i][0], py = e ? butar[i][3] : butar[i][1];
        const vidEnda = j => pkt(px, py, butar[j]) <= ((butar[j][4] || 0) + (butar[i][4] || 0)) / 2 + 6 * k;
        const umTengi = [];
        tengi.forEach((g, t) => { if (pkt(px, py, g) <= (butar[i][4] || 0) / 2 + 6 * k) for (const j of vidTengi[t]) if (j !== i) umTengi.push(j); });
        const naestu = grannar[i].filter(j => vidEnda(j) || umTengi.indexOf(j) >= 0);
        if (naerUti(px, py) || naestu.some(j => fastur(j))) continue;          // endinn er þegar lokaður
        // Dijkstra yfir veggi sem eru ekki brunaveggir/útveggir, frá þeim sem standa við lausa endann
        const kostn = new Float64Array(n).fill(Infinity), fra = new Int32Array(n).fill(-1), buid = new Uint8Array(n);
        naestu.forEach(j => { if (!bannad || !bannad[j]) kostn[j] = lengd(butar[j]); });
        let mark = -1;
        for (;;) {
          let u = -1, best = Infinity;
          for (let j = 0; j < n; j++) if (!buid[j] && kostn[j] < best) { best = kostn[j]; u = j; }
          if (u < 0 || best > mestLeid) break;
          buid[u] = 1;
          if (grannar[u].some(j => j !== i && fastur(j))) { mark = u; break; }
          for (const j of grannar[u]) { if (j === i || buid[j] || fastur(j) || (bannad && bannad[j])) continue; const nk = best + lengd(butar[j]); if (nk < kostn[j]) { kostn[j] = nk; fra[j] = u; } }
        }
        for (let u = mark; u >= 0; u = fra[u]) alyktad[u] = eld[i];
      }
    }

    // 3 · hólfin
    const hindrun = new Uint8Array(N);
    butar.forEach((v, i) => { if (fastur(i)) strika(hindrun, v, c * 0.75); });
    syndar.forEach(v => strika(hindrun, v, c * 0.75));          // lokuð göt á útvegg eru hluti umgjarðarinnar
    tengi.forEach((g, t) => {
      const gx = g[2] - g[0], gy = g[3] - g[1], gL = Math.hypot(gx, gy) || 1;
      if (vidTengi[t].some(i => { const v = butar[i]; return fastur(i) && Math.abs((gx * (v[3] - v[1]) - gy * (v[2] - v[0])) / (gL * (lengd(v) || 1))) < 0.1; })) strika(hindrun, g, c * 0.75);
    });
    const svaedi = new Uint16Array(N), fermetrar = [0], reitM = c / (28.35 * k);       // metrar á reit EF 1:100 á A1
    let fjoldi = 0;
    for (let q0 = 0; q0 < N; q0++) {
      if (uti[q0] || hindrun[q0] || svaedi[q0]) continue;
      const nr = fermetrar.length; let flat = 0; top = 0; st[top++] = q0; svaedi[q0] = nr;
      while (top) {
        const q = st[--top], x = q % gw, y = (q - x) / gw; flat++;
        for (const w of [x > 0 ? q - 1 : -1, x < gw - 1 ? q + 1 : -1, y > 0 ? q - gw : -1, y < gh - 1 ? q + gw : -1]) if (w >= 0 && !uti[w] && !hindrun[w] && !svaedi[w]) { svaedi[w] = nr; st[top++] = w; }
      }
      fermetrar.push(flat * reitM * reitM);
    }
    // smásvæði (< 6 m²: bil milli tvöfaldra veggja, afgangar við jaðar) eru ekki hólf
    const nytt = new Uint16Array(fermetrar.length), fm = [0];
    for (let i = 1; i < fermetrar.length; i++) if (fermetrar[i] >= 6) { nytt[i] = fm.length; fm.push(Math.round(fermetrar[i])); fjoldi++; }
    for (let q = 0; q < N; q++) svaedi[q] = nytt[svaedi[q]];
    return { ytri, alyktad, gw, gh, svaedi, fjoldi, fermetrar: fm };
  }

  /* ── LÍKÖN TÆKJA Í 3D ──
   * Agnar 04.10.2026: „Svo yrði frábært að fá slökkvitæki. Brunaslöngu. Reykskynjara. Og ef möguleiki er á að fá
   * rafmagnstöflu og skilti á vegg."
   * gerdTaekis: tegund tækis (uttaeki.type) eða auðkenni stimpils → hvaða líkan er teiknað. */
  function gerdTaekis(tegund, stimpill) {
    if (stimpill) {
      if (stimpill === 'rafmagn') return 'rafmagn';
      if (stimpill === 'hose' || stimpill === 'slanga') return 'slanga';
      if (/segul|magnet/.test(stimpill)) return 'segull';
      if (/hita|heat/.test(stimpill)) return 'hitaskynjari';
      if (/bjall|alarm/.test(stimpill)) return 'bjalla';
      if (/reyk|detector/.test(stimpill)) return 'reykskynjari';
      if (stimpill === 'ut' || /tgang/.test(stimpill)) return 'skilti-ut';
      if (/^skilti/.test(stimpill)) return 'skilti';
      if (stimpill === 'lettvatn' || stimpill === 'duft') return 'slokkvitaeki';
      return 'skilti';
    }
    const t = String(tegund || '').toLowerCase();
    if (/segul/.test(t)) return 'segull';
    if (/hitaskynj|hitanem/.test(t)) return 'hitaskynjari';
    if (/bjall|viðvörun|vidvorun|brunabo|sírenu|sirenu/.test(t)) return 'bjalla';
    if (/reyk/.test(t)) return 'reykskynjari';
    if (/slang|slöngu/.test(t)) return 'slanga';
    if (/teppi/.test(t)) return 'teppi';
    if (/co2|co₂|kols/.test(t)) return 'co2';
    return 'slokkvitaeki';
  }
  /* TÁKN TÆKIS á miðanum — Agnar 04.10.2026 sendi 🧯, 🔔 og mynd af rauðu slöngukefli með stút: tákn í þeim stíl, í
   * lit, svo tegundin sjáist án þess að lesa. Teiknað í 48 × 48 reit með upphaf efst til vinstri. */
  function teiknaTaekistakn(c, gerd) {
    const fy = l => { c.fillStyle = l; c.fill(); };
    const st = (l, w) => { c.strokeStyle = l; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); };
    const rr = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
    const RAUTT = '#e53935', DOKKT = '#263238';
    if (gerd === 'slanga') {                           // slöngukefli: rauð spóla, hvít nöf með slá, slanga niður og stútur
      c.beginPath(); c.moveTo(10.5, 21); c.lineTo(10.5, 35); st(RAUTT, 6);
      c.beginPath(); c.arc(27, 21, 16.5, 0, Math.PI * 2); st(RAUTT, 6);
      c.beginPath(); c.arc(27, 21, 9.5, 0, Math.PI * 2); st(RAUTT, 5);
      c.beginPath(); c.arc(27, 21, 5, 0, Math.PI * 2); fy('#ffffff'); st(DOKKT, 1.4);
      rr(20.5, 19.4, 13, 3.2, 1.5); fy('#cfd8dc'); st(DOKKT, 1);
      rr(6.5, 34.5, 8, 3.2, 1); fy('#eceff1'); st(DOKKT, 1);
      c.beginPath(); c.moveTo(7.6, 38); c.lineTo(13.4, 38); c.lineTo(12, 46); c.lineTo(9, 46); c.closePath(); fy('#37474f');
    } else if (gerd === 'reykskynjari') {              // reykskynjari: rauð skífa við loft, reykur undir (myndin sem Agnar sendi)
      c.beginPath(); c.moveTo(5, 19); c.lineTo(5, 14); c.quadraticCurveTo(24, 2, 43, 14); c.lineTo(43, 19); c.quadraticCurveTo(24, 10, 5, 19); c.closePath(); fy(RAUTT);
      c.beginPath(); c.moveTo(6.5, 21.5); c.quadraticCurveTo(24, 12.5, 41.5, 21.5); c.lineTo(37, 27); c.quadraticCurveTo(24, 20, 11, 27); c.closePath(); fy(RAUTT);
      c.beginPath(); c.ellipse(24, 28.5, 11.5, 5.2, 0, 0, Math.PI * 2); fy(RAUTT);
      c.beginPath(); c.ellipse(24, 28.5, 5, 2, 0, 0, Math.PI * 2); st('#ffffff', 1.2);
      for (const dx of [-5.5, 0, 5.5]) { c.beginPath(); c.moveTo(24 + dx, dx ? 37.5 : 36); c.quadraticCurveTo(21 + dx, 39.5, 24 + dx, 41.5); c.quadraticCurveTo(27 + dx, 43.5, 24 + dx, 47); st(RAUTT, 2); }
    } else if (gerd === 'hitaskynjari') {              // hitaskynjari: grár skynjari við loft, hitastjarna, hitamælir og bylgjur
      rr(11, 3.5, 26, 6, 3); fy('#9e9e9e');
      rr(11, 7, 26, 5, 1.5); fy('#333333');
      c.beginPath(); c.moveTo(12, 12); c.lineTo(36, 12); c.lineTo(32, 19); c.lineTo(16, 19); c.closePath(); fy('#9e9e9e');
      c.beginPath(); c.ellipse(24, 19.5, 6.5, 3.6, 0, 0, Math.PI * 2); fy('#333333');
      c.beginPath(); for (let i = 0; i < 16; i++) { const r0 = i % 2 ? 3.4 : 9, h0 = i * Math.PI / 8 - Math.PI / 2, x = 21 + Math.cos(h0) * r0, y = 35.5 + Math.sin(h0) * r0; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); fy('#f9d976');
      c.beginPath(); c.arc(22, 35.5, 12.2, Math.PI * 0.78, Math.PI * 1.22); st('#757575', 1.5);
      c.beginPath(); c.arc(27, 35.5, 12.2, -Math.PI * 0.22, Math.PI * 0.22); st('#757575', 1.5);
      rr(29, 26.5, 4.4, 15, 2.2); fy('#b0bec5'); st('#78909c', 0.8);
      c.beginPath(); c.arc(31.2, 42.2, 3.6, 0, Math.PI * 2); fy('#b0bec5'); st('#78909c', 0.8);
      c.beginPath(); c.rect(30.5, 31.5, 1.4, 9.5); fy('#d32f2f');
      c.beginPath(); c.arc(31.2, 42.2, 2.2, 0, Math.PI * 2); fy('#d32f2f');
    } else if (gerd === 'segull') {                    // segulloki á eldvarnarhurð: skeifusegull á ská, ljósir pólar, tvær eldingar
      c.save(); c.translate(24, 22); c.rotate(-Math.PI / 4); c.translate(-24, -22);
      c.beginPath(); c.moveTo(14.5, 33); c.lineTo(14.5, 19); c.arc(24, 19, 9.5, Math.PI, 0); c.lineTo(33.5, 33); c.strokeStyle = RAUTT; c.lineWidth = 8.5; c.lineCap = 'butt'; c.lineJoin = 'round'; c.stroke();
      c.beginPath(); c.rect(10.2, 28.5, 8.6, 5.5); fy('#eceff1'); c.strokeStyle = DOKKT; c.lineWidth = 1; c.stroke();
      c.beginPath(); c.rect(29.2, 28.5, 8.6, 5.5); fy('#eceff1'); c.strokeStyle = DOKKT; c.lineWidth = 1; c.stroke();
      c.restore();
      for (const o of [[25, 33], [35.5, 22.5]]) { c.beginPath(); c.moveTo(o[0], o[1]); c.lineTo(o[0] + 4.6, o[1] + 5.2); c.lineTo(o[0] + 2.6, o[1] + 6); c.lineTo(o[0] + 7.4, o[1] + 12); c.lineTo(o[0] + 0.8, o[1] + 7.6); c.lineTo(o[0] + 2.8, o[1] + 6.6); c.closePath(); fy('#f6c431'); }
    } else if (gerd === 'bjalla') {                    // viðvörunarbjalla: rauð bjalla á fæti með kólfi (myndin sem Agnar sendi)
      c.beginPath(); c.moveTo(33, 38); c.quadraticCurveTo(43.5, 33, 43.5, 23); st('#b71c1c', 2);
      c.beginPath(); c.arc(43.5, 20.5, 3.4, 0, Math.PI * 2); fy(RAUTT);
      c.beginPath(); c.rect(19, 29, 10, 8); fy(DOKKT);
      c.beginPath(); c.arc(24, 18, 15, 0, Math.PI * 2); fy('#d32f2f'); st('#b71c1c', 1.6);
      c.beginPath(); c.arc(24, 18, 8.5, 0, Math.PI * 2); fy('#ef5350');
      c.beginPath(); c.arc(24, 18, 11.6, Math.PI * 1.05, Math.PI * 1.45); st('rgba(255,255,255,.75)', 1.8);
      c.beginPath(); c.arc(24, 18, 3.2, 0, Math.PI * 2); fy('#cfd8dc'); st('#b71c1c', 1);
      rr(11, 35.5, 26, 7, 2.5); fy('#c62828');
      rr(9, 42, 30, 4, 2); fy(DOKKT);
    } else if (gerd === 'rafmagn') {                   // rafmagnstafla: grár skápur með lömum, gul elding, lás, miði og strengir
      for (const x of [14, 19, 24, 33]) { c.beginPath(); c.rect(x, 40, 2.6, 6.5); fy('#424242'); }
      rr(8, 5, 32, 36, 4); fy('#8e8e8e');
      rr(10.5, 7.5, 27, 31, 2.5); fy('#bdbdbd');
      rr(6.2, 12, 3.2, 7, 1.2); fy('#7a7a7a'); rr(6.2, 27, 3.2, 7, 1.2); fy('#7a7a7a');
      c.beginPath(); c.moveTo(27.5, 12); c.lineTo(18.5, 23.5); c.lineTo(23.6, 23.5); c.lineTo(19.5, 33.5); c.lineTo(30, 20.5); c.lineTo(24.6, 20.5); c.closePath(); fy('#f6c431');
      c.beginPath(); c.arc(34, 23, 1.6, 0, Math.PI * 2); fy('#7a7a7a');
      rr(29, 32.5, 7, 4, 0.6); fy('#f5f5f5');
    } else if (gerd === 'skilti-ut') {                 // útgönguskilti: grænt með ör
      rr(7, 11, 34, 26, 4); fy('#2e7d32');
      c.beginPath(); c.moveTo(14, 24); c.lineTo(32, 24); c.moveTo(26, 17.5); c.lineTo(33, 24); c.lineTo(26, 30.5); st('#ffffff', 3);
    } else if (gerd === 'skilti') {                    // skilti: rauð plata með hvítum ramma
      rr(9, 9, 30, 30, 4); fy(RAUTT);
      rr(13, 13, 22, 22, 2); st('#ffffff', 2.2);
      rr(21, 19, 6, 11, 1.5); fy('#ffffff');
    } else if (gerd === 'teppi') {                     // eldvarnarteppi: rauður kassi með tveimur flipum
      rr(12, 7, 24, 30, 3); fy(RAUTT);
      rr(15, 37, 5, 8, 1); fy(DOKKT); rr(28, 37, 5, 8, 1); fy(DOKKT);
      rr(15, 12, 18, 4, 1); fy('#ffffff');
    } else {                                           // handslökkvitæki: rauður kútur, svartur haus, handfang og slanga
      c.beginPath(); c.moveTo(29, 12); c.quadraticCurveTo(39, 11, 39, 20); c.lineTo(39, 30); st(DOKKT, 2.6);
      rr(16, 15, 16, 30, 5); fy(RAUTT);
      c.beginPath(); c.rect(16, 26, 16, 7); fy('#ffffff');
      rr(20.5, 8.5, 7, 7.5, 1.2); fy(DOKKT);
      c.beginPath(); c.moveTo(19, 8); c.lineTo(32, 5); st(DOKKT, 3);
      if (gerd === 'co2') { c.beginPath(); c.moveTo(36, 29); c.lineTo(42, 29); c.lineTo(44.5, 40); c.lineTo(33.5, 40); c.closePath(); fy(DOKKT); }
      else { c.beginPath(); c.moveTo(36.6, 30); c.lineTo(41.4, 30); c.lineTo(39, 35.5); c.closePath(); fy(DOKKT); }
    }
  }
  /* Hvar á veggnum hangir tækið? Næsti veggur innan `seiling` frá merkinu: tækið fer á yfirborð hans, þeim megin sem
   * merkið stendur, og snýr út frá veggnum. Skilar { x, y, nx, ny, aVegg } í sömu dílum; án veggjar stendur það þar
   * sem merkið er (aVegg = false). */
  function festaAVegg(butar, x, y, seiling) {
    let best = null;
    for (const v of butar || []) {
      const dx = v[2] - v[0], dy = v[3] - v[1], L2 = dx * dx + dy * dy || 1, L = Math.sqrt(L2);
      const t = Math.max(0, Math.min(1, ((x - v[0]) * dx + (y - v[1]) * dy) / L2));
      const px = v[0] + dx * t, py = v[1] + dy * t, d = Math.hypot(x - px, y - py);
      if (d - (v[4] || 0) / 2 > seiling || (best && d >= best.d)) continue;
      let nx = -dy / L, ny = dx / L;
      if ((x - px) * nx + (y - py) * ny < 0) { nx = -nx; ny = -ny; }
      best = { d, x: px + nx * (v[4] || 0) / 2, y: py + ny * (v[4] || 0) / 2, nx, ny, aVegg: true };
    }
    return best || { x, y, nx: 0, ny: 1, aVegg: false };
  }
  // Veggurinn sem á mest sameiginlegt með línubút o = [ax, ay, bx, by]: samsíða, á sömu línu, mest skörun. −1 ef enginn.
  // (Miðjupunktur dygði ekki: við T-mót liggur miðja veggjar líka inni í þverveggnum.)
  function veggurVid(butar, o, k) {
    const ox = o[2] - o[0], oy = o[3] - o[1], oL = Math.hypot(ox, oy) || 1, c = ox / oL, sn = oy / oL;
    let best = -1, mest = 0;
    for (let i = 0; i < butar.length; i++) {
      const v = butar[i], vL = Math.hypot(v[2] - v[0], v[3] - v[1]) || 1;
      if (Math.abs(((v[2] - v[0]) * sn - (v[3] - v[1]) * c) / vL) > 0.1) continue;
      const mx = (v[0] + v[2]) / 2 - o[0], my = (v[1] + v[3]) / 2 - o[1];
      if (Math.abs(mx * sn - my * c) > (v[4] || 0) / 2 + 6 * k) continue;
      const t0 = (v[0] - o[0]) * c + (v[1] - o[1]) * sn, t1 = (v[2] - o[0]) * c + (v[3] - o[1]) * sn;
      const skor = Math.min(oL, Math.max(t0, t1)) - Math.max(0, Math.min(t0, t1));
      if (skor > mest) { mest = skor; best = i; }
    }
    return mest >= Math.min(oL, 20 * k) * 0.5 ? best : -1;
  }
  /* ── ELDFLOKKUR VEGGJA = sjálfvirk merking + HANDVAL notandans ──
   * Agnar 04.10.2026: „gott að ég gæti tengt eða aftengt brunavegg ef um einhver mistök hafa orðið og savað síðan réttu
   * útgáfuna." eldVal = [[ax, ay, bx, by, mín], …]: veggurinn sem var valinn (dílar FRUMMYNDAR) og flokkurinn sem
   * notandinn gaf honum — 60, 30 eða 0 = EKKI brunaveggur. Handvalið gengur fyrir EI-merkjunum, og veggur sem notandinn
   * aftengdi verður heldur ekki ályktaður brunaveggur. Geymt með hæðinni (haedir[].eldVal) → eins á öllum vélum.
   * u: { butar, gler, hurdir, sk, frumB, frumH } → fær eld, eldSjalf, handval (−1 = ekki valið), hurdEld, holf. */
  function reiknaEld(u, eiHintar, eldVal) {
    const butar = u.butar, k = Math.max(u.frumB, u.frumH) / 2384;
    u.eld = u.eldSjalf = u.handval = u.hurdEld = u.holf = u.tpEld = null;
    if (!butar || !butar.length) return u;
    let eld = null;
    if (eiHintar && eiHintar.length) eld = merkjaEldveggi(butar, eiHintar.map(t => ({ x: t.x - u.sk.x, y: t.y - u.sk.y, label: t.label, minutes: t.minutes })), k);
    u.eldSjalf = eld ? eld.slice() : null;
    // Eldveggir úr TurboPaint (bútur[5] = 60 / 30): veggurinn ber flokkinn sjálfur.
    butar.forEach((v, i) => {
      const m = +v[5] === 60 ? 60 : +v[5] === 30 ? 30 : 0;
      if (!m) return;
      if (!eld) eld = new Uint8Array(butar.length);
      if (!u.tpEld) u.tpEld = new Uint8Array(butar.length);
      eld[i] = m; u.tpEld[i] = m;
    });
    const hand = new Int8Array(butar.length).fill(-1), bannad = new Uint8Array(butar.length);
    (Array.isArray(eldVal) ? eldVal : []).forEach(o => {
      if (!o || o.length < 5) return;
      const i = veggurVid(butar, [o[0] - u.sk.x, o[1] - u.sk.y, o[2] - u.sk.x, o[3] - u.sk.y], k);
      if (i < 0) return;
      const min = +o[4] === 60 ? 60 : +o[4] === 30 ? 30 : 0;
      if (!eld) eld = new Uint8Array(butar.length);
      eld[i] = min; hand[i] = min; bannad[i] = min ? 0 : 1;
    });
    u.eld = eld; u.handval = hand;
    if (!eld) return u;
    if (u.hurdir) u.hurdEld = eldurHurda(u.hurdir, butar, eld, k);
    if (eld.some(e => e)) {
      u.holf = brunaholf(butar, u.gler, u.hurdir, eld, u.hurdEld, u.sk.w, u.sk.h, k, bannad);
      // hurð í ályktuðum brunavegg er líka brunahurð
      if (u.holf && u.hurdir && u.holf.alyktad.some(e => e)) u.hurdEld = eldurHurda(u.hurdir, butar, eld.map((e, i) => e || u.holf.alyktad[i]), k);
    }
    return u;
  }

  // Litir: EI-60 rauður, EI-30 ljósrauður (veggir). Hurðir sjást ofan frá á litaðri rönd: brunahurð appelsínugul, önnur brún.
  // TOPPLITUR_3D: dökk efri brún veggja svo grunnmyndin lesist ofan frá (Agnar 06.10.2026, úr samanburði þrívíddarteiknara).
  const TOPPLITUR_3D = 0x5c574f;
  // GRÁTT ÚTLIT (Agnar 06.10.2026, eftir Blender-myndina: „use the grey one in slökkvitæki company profile layout,
  // easier to see the fire extinguishers"): ljósgráir veggir, sól og mjúkir skuggar, daufur grunnur, engir eldlitir á
  // veggjum og engin lituð brunahólf — rauðu tækin standa út. „Brunahólf" skiptir í litaða útlitið (eldveggir, hólf).
  // Engin SSAO/korn — Agnar hafnaði því. Val vafrans: localStorage (útlitsval, ekki gögn).
  const UTLIT_LS = 'teikn3d_utlit';
  const GRATT_3D = { bakgrunnur: 0xe6e9ec, veggur: 0xf3f2ef, toppur: 0x2b2e33, skuggi: 0.34, himinn: [0xf4f7fb, 0xbfbab1, 0.95], sol: 0.85, daufur: 0.74, golf: '#b4b8bd' };
  const lesaUtlit = () => { try { return localStorage.getItem(UTLIT_LS) === 'eld' ? 'eld' : 'gratt'; } catch (_) { return 'gratt'; } };
  const BAKGRUNNUR_3D = 0xdcd9d2, VEGGLITUR_3D = 0xf2eee6, ELDLITIR_3D = { 60: 0xd32f2f, 30: 0xe57373 }, HURDALITUR_3D = 0x8d6e63, ELDHURD_3D = 0xf57c00, ALYKTAD_3D = 0xf2a9a9, VALINN_3D = 0xd9b45a;
  // Ljósir, vel aðgreindir litir á gólf brunahólfa (RGB).
  const HOLFALITIR_3D = [[66, 133, 244], [52, 168, 83], [251, 188, 5], [171, 71, 188], [0, 172, 193], [255, 112, 67], [124, 179, 66], [92, 107, 192]];

  /** gamur: element sem sýnin fyllir. haedir: [{ veggir, W, H, golf:<canvas>, kvardi, merki:[{x,y,litur,texti}], butar? }]
   *  (merki í punktum SKORNU myndarinnar). butar = heilir veggir [ax,ay,bx,by,þykkt] í sömu punktum — einn kassi á vegg;
   *  gler = glerfletir í sömu mynd (aðeins teiknaðir með heilum veggjum); hurdir = hurðargöt (dyrakarmur yfir);
   *  án þeirra er gríman (`veggir`) lyft í ristarreitum eins og áður. */
  // RAUNHÆÐ VEGGJA (Agnar 06.10.2026, samanburður þrívíddarteiknara á Fiskislóð: veggirnir voru ~1,9 m í raunkvarða —
  // 4,5 % af lengstu hlið hæðarinnar — svo í augnhæð sást yfir þá). Nú 3,0 m í kvarða teikningarinnar:
  // dílar á metra = langhlið frummyndar ÷ langhlið blaðsins í mm × 10 (1:100, kvarði grunnmynda aðaluppdrátta).
  // Blaðstærðin kemur úr teikn-blad (FotoWeb-upplausn fyrir skannanir, MediaBox fyrir PDF). Án hennar, eða ef húsið
  // yrði ótrúverðugt (< 4 m eða > 300 m), gildir gamla hlutfallið.
  const _bladStaerd = {};
  function innriSlod(url) {
    try { const u = new URL(url, location.href); return /teikn-mynd/.test(u.pathname) ? (u.searchParams.get('url') || '') : ''; } catch (_) { return ''; }
  }
  async function dilarAMetra(h, fb, fh) {
    const inn = innriSlod(h && h.image_url);
    if (!inn || !(fb > 0) || !(fh > 0)) return 0;
    if (!_bladStaerd[inn]) {
      _bladStaerd[inn] = fetch('/.netlify/functions/teikn-blad?url=' + encodeURIComponent(inn), { signal: AbortSignal.timeout(15000) })
        .then(r => r.ok ? r.json() : null).catch(() => null);
    }
    const bl = await _bladStaerd[inn];
    if (!bl || !(bl.b_mm > 50) || !(bl.h_mm > 50)) { delete _bladStaerd[inn]; return 0; }
    return Math.max(fb, fh) / Math.max(bl.b_mm, bl.h_mm) * 10;
  }
  function vegghaed(hd, k) {
    const gamalt = Math.max(k.gw, k.gh) * 0.045;
    const punktar = k.c / hd.kvardi;                 // frummyndardílar á ristarreit
    if (!(hd.dilarAMetra > 0) || !(punktar > 0)) return gamalt;
    const husM = Math.max(k.gw, k.gh) * punktar / hd.dilarAMetra;
    if (husM < 4 || husM > 300) return gamalt;
    return 3.0 * hd.dilarAMetra / punktar;
  }

  async function syna3d(gamur, gogn) {
    await saekjaThree();
    const T = window.THREE, haedir = (gogn && gogn.haedir) || [];
    if (!haedir.length) throw new Error('Engin hæð til að sýna');
    const b = gamur.clientWidth || 800, h = gamur.clientHeight || 500;
    const teiknari = new T.WebGLRenderer({ antialias: true, alpha: false });
    teiknari.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    teiknari.setSize(b, h); teiknari.setClearColor(BAKGRUNNUR_3D);
    // Skuggakort sólarinnar er AFTENGT (06.10.2026): hæðirnar standa í sundur og veggir efri hæðar vörpuðu skuggum niður
    // á hæðina fyrir neðan. Skuggarnir eru bakaðir á hverja hæð fyrir sig (bakaSkugga hér neðar).
    teiknari.shadowMap.enabled = false;
    teiknari.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
    gamur.appendChild(teiknari.domElement);
    const svid = new T.Scene();
    const himinn = new T.HemisphereLight(0xffffff, 0xbdb8ae, 0.8); svid.add(himinn);
    const sol = new T.DirectionalLight(0xffffff, 0.6); svid.add(sol); svid.add(sol.target);
    let utlit = (gogn && gogn.utlit) || lesaUtlit();
    const daufLog = [], skuggaEfni = [], hurdaEfni = [];
    const losa = [], veggEfni = [], sporEfni = [], lag = [], midar = [];
    const taekiHlutir = [];     // líkön, stangir, kúlur og miðar tækjanna — falin þegar föst vinnumynd er tekin (fastMynd)
    let staerst = 1, haedY = 0, vidmid = null, heilir = 0;
    const lg0StigaHlidrun = [];
    // LÍKAN TÆKIS: hópur með upphaf á gólfi við yfirborð veggjar, +z snýr út frá veggnum. e = vegghæðin (mælieining
    // líkansins — stærðirnar eru ýktar um það bil tvöfalt svo tækin sjáist í yfirliti yfir heilt hús).
    const efniL = {}, efni = (lykill, litur, grunn) => efniL[lykill] || (efniL[lykill] = (losa.push(grunn ? new T.MeshBasicMaterial({ color: litur }) : new T.MeshLambertMaterial({ color: litur })), losa[losa.length - 1]));
    const hlutur = (hopurL, geo, e2, x, y, z, rx) => { const ms = new T.Mesh(geo, e2); ms.position.set(x, y, z); if (rx) ms.rotation.x = rx; ms.castShadow = true; hopurL.add(ms); losa.push(geo); return ms; };
    const taekjalikan = (gerd, e, litur) => {
      const g = new T.Group(), RAUTT = efni('rautt', 0xd0281f), SVART = efni('svart', 0x1d1d1d), HVITT = efni('hvitt', 0xf6f5f0), GRATT = efni('gratt', 0x8d939c);
      if (gerd === 'slanga') {                       // slöngukefli eins og táknið: spóla úr hringjum, nöf með slá, slanga niður og stútur
        hlutur(g, new T.CylinderGeometry(0.3 * e, 0.3 * e, 0.012 * e, 30), HVITT, 0, 0.56 * e, 0.008 * e, Math.PI / 2);   // bakplata: keflið sést líka á rauðum vegg
        for (const hr of [[0.245, 0.036], [0.168, 0.034], [0.096, 0.03]]) hlutur(g, new T.TorusGeometry(hr[0] * e, hr[1] * e, 10, 40), RAUTT, 0, 0.56 * e, 0.055 * e);
        hlutur(g, new T.CylinderGeometry(0.058 * e, 0.058 * e, 0.075 * e, 18), HVITT, 0, 0.56 * e, 0.055 * e, Math.PI / 2);
        hlutur(g, new T.BoxGeometry(0.2 * e, 0.03 * e, 0.03 * e), efni('stal', 0xcfd8dc), 0, 0.56 * e, 0.1 * e);
        hlutur(g, new T.CylinderGeometry(0.034 * e, 0.034 * e, 0.24 * e, 10), RAUTT, -0.245 * e, 0.44 * e, 0.055 * e);
        hlutur(g, new T.CylinderGeometry(0.042 * e, 0.042 * e, 0.03 * e, 10), HVITT, -0.245 * e, 0.31 * e, 0.055 * e);
        hlutur(g, new T.CylinderGeometry(0.034 * e, 0.018 * e, 0.11 * e, 10), efni('stutur', 0x37474f), -0.245 * e, 0.24 * e, 0.055 * e);
      } else if (gerd === 'reykskynjari') {          // hvít skífa uppi við loft, rautt ljós
        hlutur(g, new T.CylinderGeometry(0.11 * e, 0.125 * e, 0.045 * e, 24), HVITT, 0, 0.98 * e, 0.15 * e);
        hlutur(g, new T.SphereGeometry(0.02 * e, 8, 6), efni('ljos', 0xff2d1f, true), 0.065 * e, 0.955 * e, 0.15 * e);
      } else if (gerd === 'hitaskynjari') {          // hitaskynjari: grár skynjari við loft, dökk rönd og dökk kúpa niður úr
        hlutur(g, new T.CylinderGeometry(0.115 * e, 0.115 * e, 0.03 * e, 24), GRATT, 0, 0.985 * e, 0.15 * e);
        hlutur(g, new T.CylinderGeometry(0.118 * e, 0.118 * e, 0.022 * e, 24), SVART, 0, 0.96 * e, 0.15 * e);
        hlutur(g, new T.CylinderGeometry(0.11 * e, 0.075 * e, 0.045 * e, 24), GRATT, 0, 0.927 * e, 0.15 * e);
        hlutur(g, new T.SphereGeometry(0.055 * e, 14, 10), SVART, 0, 0.905 * e, 0.15 * e);
      } else if (gerd === 'segull') {                // segulloki: grá veggplata, dökkur segull með rauðri skífu fremst
        hlutur(g, new T.BoxGeometry(0.16 * e, 0.16 * e, 0.03 * e), GRATT, 0, 0.42 * e, 0.016 * e);
        hlutur(g, new T.CylinderGeometry(0.06 * e, 0.06 * e, 0.1 * e, 18), SVART, 0, 0.42 * e, 0.08 * e, Math.PI / 2);
        hlutur(g, new T.CylinderGeometry(0.045 * e, 0.045 * e, 0.012 * e, 18), RAUTT, 0, 0.42 * e, 0.135 * e, Math.PI / 2);
      } else if (gerd === 'bjalla') {                // viðvörunarbjalla: rauð skál á dökkum hálsi, rauður fótur, kólfur til hliðar
        hlutur(g, new T.BoxGeometry(0.24 * e, 0.03 * e, 0.07 * e), SVART, 0, 0.575 * e, 0.036 * e);
        hlutur(g, new T.BoxGeometry(0.2 * e, 0.07 * e, 0.06 * e), efni('dokkrautt', 0xc62828), 0, 0.625 * e, 0.031 * e);
        hlutur(g, new T.BoxGeometry(0.07 * e, 0.06 * e, 0.04 * e), SVART, 0, 0.69 * e, 0.03 * e);
        hlutur(g, new T.CylinderGeometry(0.15 * e, 0.15 * e, 0.06 * e, 28), RAUTT, 0, 0.84 * e, 0.045 * e, Math.PI / 2);
        hlutur(g, new T.CylinderGeometry(0.085 * e, 0.085 * e, 0.07 * e, 22), efni('ljosrautt', 0xef5350), 0, 0.84 * e, 0.047 * e, Math.PI / 2);
        hlutur(g, new T.SphereGeometry(0.03 * e, 12, 8), efni('stal', 0xcfd8dc), 0, 0.84 * e, 0.09 * e);
        hlutur(g, new T.BoxGeometry(0.012 * e, 0.17 * e, 0.012 * e), efni('dokkrautt', 0xc62828), 0.2 * e, 0.73 * e, 0.045 * e);
        hlutur(g, new T.SphereGeometry(0.032 * e, 12, 8), RAUTT, 0.2 * e, 0.83 * e, 0.045 * e);
      } else if (gerd === 'rafmagn') {               // rafmagnstafla: grár skápur með ljósari hurð, gul elding, lamir, lás og strengir niður
        hlutur(g, new T.BoxGeometry(0.36 * e, 0.5 * e, 0.075 * e), efni('skapur', 0x8e8e8e), 0, 0.62 * e, 0.038 * e);
        hlutur(g, new T.BoxGeometry(0.31 * e, 0.44 * e, 0.012 * e), efni('hurd', 0xbdbdbd), 0, 0.62 * e, 0.08 * e);
        const eld3 = new T.Shape();
        [[0.035, 0.17], [-0.075, 0.0], [-0.012, 0.0], [-0.06, -0.15], [0.07, 0.04], [0.002, 0.04]].forEach((pt, i) => { if (i) eld3.lineTo(pt[0] * e, pt[1] * e); else eld3.moveTo(pt[0] * e, pt[1] * e); });
        hlutur(g, new T.ShapeGeometry(eld3), efni('elding', 0xf6c431, true), -0.02 * e, 0.63 * e, 0.088 * e);
        hlutur(g, new T.BoxGeometry(0.03 * e, 0.09 * e, 0.03 * e), efni('lamir', 0x7a7a7a), -0.185 * e, 0.74 * e, 0.06 * e);
        hlutur(g, new T.BoxGeometry(0.03 * e, 0.09 * e, 0.03 * e), efni('lamir', 0x7a7a7a), -0.185 * e, 0.5 * e, 0.06 * e);
        hlutur(g, new T.CylinderGeometry(0.016 * e, 0.016 * e, 0.012 * e, 12), efni('lamir', 0x7a7a7a), 0.115 * e, 0.62 * e, 0.09 * e, Math.PI / 2);
        hlutur(g, new T.BoxGeometry(0.08 * e, 0.045 * e, 0.006 * e), HVITT, 0.085 * e, 0.45 * e, 0.088 * e);
        for (const x of [-0.11, -0.05, 0.01, 0.11]) hlutur(g, new T.BoxGeometry(0.028 * e, 0.09 * e, 0.028 * e), SVART, x * e, 0.33 * e, 0.04 * e);
      } else if (gerd === 'skilti' || gerd === 'skilti-ut') {   // skilti á vegg: lituð plata með hvítum ramma
        hlutur(g, new T.BoxGeometry(0.3 * e, 0.3 * e, 0.012 * e), HVITT, 0, 0.8 * e, 0.008 * e);
        hlutur(g, new T.BoxGeometry(0.25 * e, 0.25 * e, 0.014 * e), efni('skilti' + litur.getHexString(), litur.getHex()), 0, 0.8 * e, 0.012 * e);
      } else if (gerd === 'teppi') {                 // eldvarnarteppi: rauður kassi á vegg
        hlutur(g, new T.BoxGeometry(0.2 * e, 0.28 * e, 0.06 * e), RAUTT, 0, 0.6 * e, 0.031 * e);
      } else {                                       // handslökkvitæki: rauður kútur, svartur haus og handfang
        hlutur(g, new T.CylinderGeometry(0.085 * e, 0.085 * e, 0.42 * e, 20), RAUTT, 0, 0.37 * e, 0.1 * e);
        hlutur(g, new T.SphereGeometry(0.085 * e, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), RAUTT, 0, 0.58 * e, 0.1 * e);
        hlutur(g, new T.CylinderGeometry(0.03 * e, 0.04 * e, 0.07 * e, 12), SVART, 0, 0.69 * e, 0.1 * e);
        hlutur(g, new T.BoxGeometry(0.15 * e, 0.024 * e, 0.04 * e), SVART, 0.04 * e, 0.735 * e, 0.1 * e);
        if (gerd === 'co2') hlutur(g, new T.CylinderGeometry(0.028 * e, 0.07 * e, 0.2 * e, 14), SVART, 0.14 * e, 0.46 * e, 0.1 * e);   // kolsýrutrekt
        else hlutur(g, new T.CylinderGeometry(0.016 * e, 0.016 * e, 0.26 * e, 8), SVART, 0.105 * e, 0.5 * e, 0.1 * e);                  // slanga
      }
      return g;
    };
    // Litun eftir eldflokki — kölluð við smíði og aftur þegar notandinn breytir flokki veggjar (uppfaera / merkja).
    const lit = new T.Color();
    let samOn = !!(gogn && gogn.sameign);
    const SAMEIGN_DAUFT_3D = 0xe9e6df;
    // SAMEIGN (446): ljós gulleitur flötur á sameign og stigum ofan á gólfinu, íbúðir undir hvítri slæðu (aðeins innan
    // hússins — gólfmyndin ræður alfanum). Smíðað þegar sýnt fyrst.
    const smidaSameign = lg => {
      const hd = lg.hd, res = hd.sameign;
      if (lg.samM) { lg.hopur.remove(lg.samM); lg.samM = null; }
      lg.samV = null;
      if (!res || !window.TeiknSameign) return;
      const sk = Math.min(1, 1600 / Math.max(hd.W, hd.H)), cw = Math.max(2, Math.round(hd.W * sk)), ch = Math.max(2, Math.round(hd.H * sk));
      const c = document.createElement('canvas'); c.width = cw; c.height = ch;
      const x = c.getContext('2d'), kk = sk * hd.kvardi;           // dílar skornu myndarinnar → strigi
      // í 3D sterkari litir (grá gólfslæða undir) og engin heiti — þau sjást í 2D
      TeiknSameign.teikna(x, res, (px, py) => [px * kk, py * kk], [[0, 0], [cw, 0], [cw, ch], [0, ch]],
        { deyfa: 'rgba(250,250,247,.5)', sameign: 'rgba(255,196,60,.62)', stigi: 'rgba(240,160,20,.82)', heiti: false });
      // aðeins innan hússins (gólfmyndin er gegnsæ utan þess)
      x.globalCompositeOperation = 'destination-in'; x.drawImage(hd.golf, 0, 0, cw, ch); x.globalCompositeOperation = 'source-over';
      const tex = new T.CanvasTexture(c); tex.anisotropy = 4;
      const e = new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
      lg.samM = new T.Mesh(lg.golfG, e); lg.samM.rotation.x = -Math.PI / 2; lg.samM.position.y = 0.35; lg.samM.renderOrder = 2; lg.hopur.add(lg.samM);
      losa.push(tex, e);
      // veggir sem liggja að sameign (innan 0,6 m) halda lit
      if (hd.butar && hd.butar.length) {
        const sp = 0.6 * (res.pxm || 70);
        lg.samV = new Uint8Array(hd.butar.length);
        hd.butar.forEach((v, i) => { for (const t of [0.15, 0.5, 0.85]) if (TeiknSameign.iSameign(res, v[0] + (v[2] - v[0]) * t, v[1] + (v[3] - v[1]) * t, sp)) { lg.samV[i] = 1; break; } });
      }
    };
    // Íbúðaveggir LÆGRI í sameignarsýn (35 % af hæð) — í húsi á mörgum hæðum hverfur gult gólf annars á bak við veggi
    const samHaed = (lg, lagur) => {
      if (!lg.veggir || !lg.samV || !lg.veggir.isInstancedMesh) return;
      const mm = new T.Matrix4(), p = new T.Vector3(), q = new T.Quaternion(), sc = new T.Vector3();
      if (!lg.samUpph) { lg.samUpph = []; for (let i = 0; i < lg.samV.length; i++) { lg.veggir.getMatrixAt(i, mm); lg.samUpph.push(mm.clone()); } }
      for (let i = 0; i < lg.samV.length; i++) {
        if (lg.samV[i]) continue;
        mm.copy(lg.samUpph[i]);
        if (lagur) { mm.decompose(p, q, sc); const h0 = sc.y; sc.y = h0 * 0.35; p.y = p.y - h0 / 2 + sc.y / 2; mm.compose(p, q, sc); }
        lg.veggir.setMatrixAt(i, mm);
      }
      lg.veggir.instanceMatrix.needsUpdate = true;
    };
    const synaSameign = on => {
      samOn = !!on;
      lag.forEach(lg => {
        if (samOn && lg.hd.sameign && !lg.samM) { try { smidaSameign(lg); } catch (e) { console.warn('[383] sameign 3D', e); } }
        if (lg.samM) lg.samM.visible = samOn;
        try { samHaed(lg, samOn); } catch (e) { console.warn('[383] sameign veggir', e); }
        litaVeggi(lg);
      });
    };
    const litaVeggi = lg => {
      const hd = lg.hd;
      if (!lg.heilir) return;
      const grtt = utlit === 'gratt';
      const samV = samOn && lg.samV;      // sameignarsýn: veggir íbúða ljósir og daufir, veggir sameignar halda lit sínum
      for (let i = 0; i < hd.butar.length; i++) lg.veggir.setColorAt(i, lit.setHex(lg.valinn === i ? VALINN_3D : samV && !samV[i] ? SAMEIGN_DAUFT_3D : grtt ? GRATT_3D.veggur : (hd.eld && ELDLITIR_3D[hd.eld[i]]) || (hd.holf && hd.holf.alyktad[i] ? ALYKTAD_3D : VEGGLITUR_3D)));
      lg.veggir.instanceColor.needsUpdate = true;
      if (lg.karmar) {
        for (let i = 0; i < hd.hurdir.length; i++) {
          lg.karmar.setColorAt(i, lit.setHex(grtt ? GRATT_3D.veggur : (hd.hurdEld && ELDLITIR_3D[hd.hurdEld[i]]) || VEGGLITUR_3D));
          lg.rendur.setColorAt(i, lit.setHex(hd.hurdEld && hd.hurdEld[i] ? ELDHURD_3D : HURDALITUR_3D));   // hurðir sjást líka í gráu útliti
        }
        lg.karmar.instanceColor.needsUpdate = true; lg.rendur.instanceColor.needsUpdate = true;
      }
    };
    // Brunahólf: hvert hólf fær sinn ljósa lit á gólfið (aðeins þegar þau eru fleiri en eitt — annars segir liturinn ekkert).
    const litaHolf = lg => {
      const holf = lg.hd.holf;
      if (!holf || holf.fjoldi < 2 || utlit === 'gratt') { if (lg.holfM) lg.holfM.visible = false; return; }
      if (!lg.holfM || lg.holfStr.width !== holf.gw || lg.holfStr.height !== holf.gh) {
        if (lg.holfM) lg.hopur.remove(lg.holfM);
        lg.holfStr = document.createElement('canvas'); lg.holfStr.width = holf.gw; lg.holfStr.height = holf.gh;
        lg.holfA = new T.CanvasTexture(lg.holfStr); lg.holfA.magFilter = T.NearestFilter; lg.holfA.minFilter = T.LinearFilter;
        const hE = new T.MeshBasicMaterial({ map: lg.holfA, transparent: true, opacity: 0.34, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
        lg.holfM = new T.Mesh(lg.golfG, hE); lg.holfM.rotation.x = -Math.PI / 2; lg.holfM.position.y = 0.3; lg.holfM.renderOrder = 1; lg.hopur.add(lg.holfM);
        losa.push(lg.holfA, hE);
      }
      const hx = lg.holfStr.getContext('2d'), hm = hx.createImageData(holf.gw, holf.gh), sv = holf.svaedi;
      for (let i = 0; i < sv.length; i++) if (sv[i]) { const l = HOLFALITIR_3D[(sv[i] - 1) % HOLFALITIR_3D.length]; hm.data[i * 4] = l[0]; hm.data[i * 4 + 1] = l[1]; hm.data[i * 4 + 2] = l[2]; hm.data[i * 4 + 3] = 255; }
      hx.putImageData(hm, 0, 0); lg.holfA.needsUpdate = true; lg.holfM.visible = true;
    };
    // MIÐJA HÚSSINS (veggjanna) í staðbundnum ristarhnitum hæðar: 2.–98. hundraðshluti endapunkta, svo stakt strik
    // úti á blaði dragi ekki miðjuna. null ef engir heilir veggir.
    const veggjaMidja = (hd, k) => {
      const b = hd.butar; if (!b || b.length < 3) return null;
      const f = hd.kvardi / k.c, xs = [], zs = [];
      b.forEach(v => { xs.push(v[0], v[2]); zs.push(v[1], v[3]); });
      xs.sort((a, c) => a - c); zs.sort((a, c) => a - c);
      const q = (l, p) => l[Math.min(l.length - 1, Math.max(0, Math.round(p * (l.length - 1))))];
      const x0 = q(xs, 0.02) * f - k.gw / 2, x1 = q(xs, 0.98) * f - k.gw / 2, z0 = q(zs, 0.02) * f - k.gh / 2, z1 = q(zs, 0.98) * f - k.gh / 2;
      return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, b: x1 - x0, d: z1 - z0 };
    };
    // Skörun grunnflata tveggja hæða (umgjörð veggjanna, heimshnit): skörun ÷ minni flötur (1 = önnur innan hinnar).
    const skorunHusa = (a, b) => {
      const ix = Math.max(0, Math.min(a.x + a.b / 2, b.x + b.b / 2) - Math.max(a.x - a.b / 2, b.x - b.b / 2));
      const iz = Math.max(0, Math.min(a.z + a.d / 2, b.z + b.d / 2) - Math.max(a.z - a.d / 2, b.z - b.d / 2));
      return (ix * iz) / Math.max(1e-6, Math.min(a.b * a.d, b.b * b.d));
    };
    haedir.forEach((hd, nr) => {
      const k = kassarUrGrimu(hd.veggir, hd.W, hd.H);
      staerst = Math.max(staerst, k.gw, k.gh);
      const veggH = vegghaed(hd, k), bil = veggH * 3.2;
      const hopur = new T.Group(); hopur.position.y = haedY; svid.add(hopur);
      // Hæðir úr SAMA teikningasetti (sama blaðstærð) raðast eftir stöðu sinni á blaðinu og í sama kvarða — annars
      // sveif álma á 2. hæð yfir miðju 1. hæðar og varð stærri en hún er (skurðirnir eru misstórir). `punktar` =
      // frummyndarpunktar á ristarreit. Ólík blöð: hæðin er miðjuð eins og áður.
      if (!hd.sk) hd.sk = { x: 0, y: 0, w: hd.W / hd.kvardi, h: hd.H / hd.kvardi };
      const punktar = k.c / hd.kvardi;
      if (nr === 0) vidmid = { punktar, mx: hd.sk.x + hd.sk.w / 2, my: hd.sk.y + hd.sk.h / 2, b: hd.frumB, h: hd.frumH, sk: hd.sk, vm: veggjaMidja(hd, k) };
      else if (vidmid && hd.frumB && Math.abs(hd.frumB - vidmid.b) < vidmid.b * 0.03 && Math.abs(hd.frumH - vidmid.h) < vidmid.h * 0.03) {
        const kv = punktar / vidmid.punktar;
        hopur.scale.set(kv, 1, kv);
        // 06.10.2026 (Agnar: 1–3 hæðir á EINU blaði, t.d. Ægisgata 4): hæðir skornar af ólíkum stöðum blaðsins staflast
        // eftir MIÐJU VEGGJANNA (hússins), ekki miðju skurðarins — skurðirnir eru misjafnlega rúmir um hverja grunnmynd.
        const vm = veggjaMidja(hd, k);
        if (vm && vidmid.vm && skorunSkurda(hd.sk, vidmid.sk) < 0.7) {
          hopur.position.x = vidmid.vm.x - vm.x * kv;
          hopur.position.z = vidmid.vm.z - vm.z * kv;
        }
        // 05.10.2026: staða á blaðinu ræður AÐEINS þegar skurðirnir skarast greinilega (hæðir teiknaðar á sama stað á hvoru
        // blaði). Hæðir klipptar af ólíkum stöðum — tvær grunnmyndir hlið við hlið á einu blaði (Hótel Klöpp: kjallari og
        // 1. hæð), eða blöð með húsið á öðrum stað — röðuðust annars hlið við hlið í stað þess að staflast. Þær eru miðjaðar.
        if (skorunSkurda(hd.sk, vidmid.sk) >= 0.7) {
          hopur.position.x = (hd.sk.x + hd.sk.w / 2 - vidmid.mx) / vidmid.punktar;
          hopur.position.z = (hd.sk.y + hd.sk.h / 2 - vidmid.my) / vidmid.punktar;
          // 07.10.2026 (lifandi próf, Norðurhella 17 / 1626): tvö SÉR blöð (…_004.pdf og …_003.pdf) af sömu stærð, húsið
          // á ólíkum stað á hvoru — staðan á blaðinu setti 2. hæð ~5 m út fyrir 1. hæð þótt grunnflöturinn sé sá sami
          // (26 × 18 m). Ef grunnfletirnir eru jafnstórir (±25 % á hvorn veg) en skarast illa eftir stöðu á blaðinu
          // (< 75 %), og miðja veggjanna gefur greinilega betri skörun, ræður miðja veggjanna. Minni álma ofan á stærri
          // hæð (Klöpp, Þingholt) er ekki jafnstór og heldur stöðu sinni á blaðinu.
          if (vm && vidmid.vm && vm.b > 0 && vm.d > 0) {
            const efri = { b: vm.b * kv, d: vm.d * kv }, ned = vidmid.vm;
            const jafnstor = Math.min(efri.b, ned.b) / Math.max(efri.b, ned.b) >= 0.75 && Math.min(efri.d, ned.d) / Math.max(efri.d, ned.d) >= 0.75;
            const aBladi = skorunHusa(ned, { x: hopur.position.x + vm.x * kv, z: hopur.position.z + vm.z * kv, b: efri.b, d: efri.d });
            const aMidju = skorunHusa(ned, { x: ned.x, z: ned.z, b: efri.b, d: efri.d });
            if (jafnstor && aBladi < 0.75 && aMidju > aBladi + 0.15) {
              hopur.position.x = ned.x - vm.x * kv;
              hopur.position.z = ned.z - vm.z * kv;
              console.info('[383] stafli: ' + (hd.nafn || 'hæð ' + (nr + 1)) + ' miðjuð á veggi 1. hæðar (skörun eftir blaði ' + aBladi.toFixed(2) + ' → ' + aMidju.toFixed(2) + ')');
            }
          }
        }
      }
      // STIGAR STAFLA (fjölbýli, 3+ hæðir — Agnar 08.10.2026): stigahúsið stendur á sama stað á hverri hæð. Hliðrunin
      // sem parar staðfesta stiga þessarar hæðar (446) við næstu hæð fyrir neðan sem á stiga ræður, sé hún ≥ 0,4 m frá
      // því sem reglurnar að ofan gáfu (Berjavellir 6: kjallarinn 5,8 m frá 1. hæð eftir miðju veggja).
      if (gogn && gogn.stigaStafli && nr > 0 && window.TeiknSameign && hd.sameign && lag[0]) {
        try {
          const u0 = lag[0].veggH / 3 || 1;
          const pkt = (h2, P, f2, kv2, gw2, gh2) => ((h2.sameign && h2.sameign.stigar) || []).filter(q => q.stadfest && !q.uti)
            .map(q => ({ ass: q.ass, x: (P.x + (((q.x0 + q.x1) / 2) * f2 - gw2 / 2) * kv2) / u0, y: (P.z + (((q.y0 + q.y1) / 2) * f2 - gh2 / 2) * kv2) / u0 }));
          const mine = pkt(hd, hopur.position, hd.kvardi / k.c, hopur.scale.x || 1, k.gw, k.gh);
          let ned = null;
          for (let j = lag.length - 1; j >= 0 && !ned; j--) { const q = lag[j], pq = pkt(q.hd, q.hopur.position, q.hd.kvardi / q.k.c, q.hopur.scale.x || 1, q.gw, q.gh); if (pq.length) ned = pq; }
          if (mine.length && ned) {
            const b = TeiknSameign.hlidrun(mine, ned), L = Math.hypot(b.t[0], b.t[1]);
            if (b.n >= 1 && L >= 0.4 && L <= 12) {
              hopur.position.x += b.t[0] * u0; hopur.position.z += b.t[1] * u0;
              lg0StigaHlidrun.push((hd.nafn || 'hæð ' + (nr + 1)) + ': ' + b.t.map(v => v.toFixed(2)).join(', ') + ' m');
              console.info('[383] stafli eftir stigum: ' + (hd.nafn || 'hæð ' + (nr + 1)) + ' færð ' + b.t.map(v => v.toFixed(2)).join(', ') + ' m (' + b.n + (b.n === 1 ? ' stigi' : ' stigar') + ')');
            }
          }
        } catch (e) { console.warn('[383] stigastafli', e); }
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
      const lg = { hopur, golfE, golfG, nr, hd, valinn: null, veggH, gw: k.gw, gh: k.gh, k };
      losa.push(golfG, golfE, aferd); lag.push(lg);
      litaHolf(lg);
      // Grátt útlit: grá steypuslæða yfir teikningunni (Agnar 07.10: „make the floor greyish" — áður hvít). Aðeins INNAN
      // húss: slæðan ber sama alfa og gólfið (source-in), svo utan húss helst gegnsætt. Teikningin sést dauft undir, tækin
      // standa út. Skuggar veggjanna koma á eigin plötu ofan við hana (bakaSkugga, eftir að sólin er komin á sinn stað).
      const graStr = document.createElement('canvas'); graStr.width = golfStr.width; graStr.height = golfStr.height;
      const grx = graStr.getContext('2d'); grx.drawImage(golfStr, 0, 0);
      grx.globalCompositeOperation = 'source-in'; grx.fillStyle = GRATT_3D.golf; grx.fillRect(0, 0, graStr.width, graStr.height);
      const graAf = new T.CanvasTexture(graStr); losa.push(graAf);
      const dE = new T.MeshBasicMaterial({ map: graAf, transparent: true, opacity: nr > 0 ? GRATT_3D.daufur * 0.5 : GRATT_3D.daufur, alphaTest: 0.02, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      const dauf = new T.Mesh(golfG, dE); dauf.rotation.x = -Math.PI / 2; dauf.position.y = 0.2; dauf.renderOrder = 1; hopur.add(dauf);
      losa.push(dE); daufLog.push(dauf);
      // Veggir: eitt InstancedMesh — eitt teiknikall fyrir alla kassana.
      const f = hd.kvardi / k.c;   // punktar skornu myndarinnar → ristarreitir
      lg.f = f;
      const kG = new T.BoxGeometry(1, 1, 1), kE = new T.MeshLambertMaterial({ color: VEGGLITUR_3D });
      const kTopp = new T.MeshLambertMaterial({ color: utlit === 'gratt' ? GRATT_3D.toppur : TOPPLITUR_3D }); kTopp.userData.toppur = true;
      const kEfni = [kE, kE, kTopp, kE, kE, kE];
      const m = new T.Matrix4();
      let veggir;
      if (hd.butar && hd.butar.length) {
        // HEILIR VEGGIR: einn kassi á vegg, lengdur um hálfa þykkt í hvorn enda svo hornin fyllist.
        const sjalfg = Math.max(k.gw, k.gh) * 0.004, q = new T.Quaternion(), ofan = new T.Vector3(0, 1, 0), st = new T.Vector3(), kv3 = new T.Vector3();
        lg.sjalfg = sjalfg;
        veggir = new T.InstancedMesh(kG, kEfni, hd.butar.length);
        hd.butar.forEach((v, i) => {
          const ax = v[0] * f - k.gw / 2, az = v[1] * f - k.gh / 2, bx = v[2] * f - k.gw / 2, bz = v[3] * f - k.gh / 2;
          // minnst 24 cm (veggH = 3 m): línur úr TurboPaint eru oft 6–8 cm og dökku topparnir hurfu ofan frá (07.10.2026)
          const th = Math.max(0.8, veggH * 0.08, (v[4] || 0) * f || sjalfg);
          q.setFromAxisAngle(ofan, -Math.atan2(bz - az, bx - ax));
          m.compose(st.set((ax + bx) / 2, veggH / 2, (az + bz) / 2), q, kv3.set(Math.hypot(bx - ax, bz - az) + th, veggH, th));
          veggir.setMatrixAt(i, m);
        });
        veggir.count = hd.butar.length; heilir += hd.butar.length;
        // Litur á hvert eintak (eldflokkur, ályktun, val notanda); efnið sjálft er þá hvítt svo liturinn margfaldist ekki niður.
        kE.color.setHex(0xffffff); kE.userData.litad = true; lg.veggir = veggir; lg.heilir = true;
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
        // Hurðargöt: veggurinn heldur áfram OFAN við hurðina (dyrakarmur, efsti fjórðungur vegghæðar) — rýmið lokast en
        // gengt er undir.
        if (hd.hurdir && hd.hurdir.length) {
          const karmH = veggH * 0.26, karmar = new T.InstancedMesh(kG, kEfni, hd.hurdir.length);
          hd.hurdir.forEach((v, i) => {
            const ax = v[0] * f - k.gw / 2, az = v[1] * f - k.gh / 2, bx = v[2] * f - k.gw / 2, bz = v[3] * f - k.gh / 2;
            q.setFromAxisAngle(ofan, -Math.atan2(bz - az, bx - ax));
            m.compose(st.set((ax + bx) / 2, veggH - karmH / 2, (az + bz) / 2), q, kv3.set(Math.hypot(bx - ax, bz - az), karmH, Math.max(0.8, veggH * 0.08, (v[4] || 0) * f || sjalfg)));
            karmar.setMatrixAt(i, m);
          });
          karmar.instanceMatrix.needsUpdate = true; karmar.castShadow = true; hopur.add(karmar);
          // Lituð rönd ofan á karminum: hurðirnar sjást þá líka beint ofan frá (grunnmyndarsýn) og þegar veggir eru gegnsæir.
          const rE = new T.MeshBasicMaterial({ color: 0xffffff }), rendur = new T.InstancedMesh(kG, rE, hd.hurdir.length);
          hd.hurdir.forEach((v, i) => {
            const ax = v[0] * f - k.gw / 2, az = v[1] * f - k.gh / 2, bx = v[2] * f - k.gw / 2, bz = v[3] * f - k.gh / 2;
            q.setFromAxisAngle(ofan, -Math.atan2(bz - az, bx - ax));
            m.compose(st.set((ax + bx) / 2, veggH + veggH * 0.012, (az + bz) / 2), q, kv3.set(Math.hypot(bx - ax, bz - az), veggH * 0.024, Math.max(0.8, veggH * 0.08, (v[4] || 0) * f || sjalfg) * 1.25));
            rendur.setMatrixAt(i, m);
          });
          rendur.instanceMatrix.needsUpdate = true; hopur.add(rendur);
          losa.push(rE); lg.karmar = karmar; lg.rendur = rendur;
          // HURÐABLÖÐ (Agnar 07.10.2026: „bílahurðir og venjulegar hurðir sjást ekki á 3D" — opið var tómt). Venjuleg hurð:
          // blað á hjörum, hálfopið (55°) svo gengt sé um og inn sjáist. Bílahurð (op > 2,4 m): lokuð flekahurð með láréttum
          // rákum. Brunahurð fær appelsínugulan blæ í Brunahólf-útliti.
          const metri = veggH / 3, blH = veggH - karmH, blD = Math.max(0.6, 0.05 * metri);
          // Bílahurð eins og á myndunum sem Agnar sendi 07.10 („change the garage doors"): iðnaðar-flekahurð — láréttir
          // flekar (~55 cm) með skuggarák, gluggaröð í næstefsta fleka, dökkur rammi. Áferðin teiknuð í hlutföllum hurðarinnar.
          const flekahurd = (bM, hM) => {
            const W = 256, H = Math.max(96, Math.min(512, Math.round(W * hM / Math.max(0.5, bM))));
            const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
            x.fillStyle = '#a4aab2'; x.fillRect(0, 0, W, H);
            const n = Math.max(3, Math.round(hM / 0.55)), ph = H / n;
            for (let p = 0; p < n; p++) {
              const y = Math.round(p * ph);
              x.fillStyle = '#5f656d'; x.fillRect(0, y, W, 2);                              // fleka-samskeyti
              x.fillStyle = '#b6bcc3'; x.fillRect(0, y + 2, W, Math.max(1, ph * 0.16));     // ljós efri brún flekans
            }
            const gr = n >= 4 ? 1 : 0, m = Math.max(2, Math.round(bM / 0.9)), jadar = W * 0.08, gb = (W - jadar * 2) / m;
            for (let j = 0; j < m; j++) {
              const gx = jadar + j * gb + gb * 0.12, gy = gr * ph + ph * 0.28, gw = gb * 0.76, gh = ph * 0.44;
              x.fillStyle = '#4f565e'; x.fillRect(gx - 2, gy - 2, gw + 4, gh + 4);
              x.fillStyle = '#cfe0ea'; x.fillRect(gx, gy, gw, gh);
            }
            x.strokeStyle = '#4b5159'; x.lineWidth = 6; x.strokeRect(3, 3, W - 6, H - 6);
            const t = new T.CanvasTexture(c); t.anisotropy = 4; losa.push(t); return t;
          };
          const hjor = new T.Vector3(0, 1, 0);
          hd.hurdir.forEach((v, i) => {
            const ax = v[0] * f - k.gw / 2, az = v[1] * f - k.gh / 2, bx = v[2] * f - k.gw / 2, bz = v[3] * f - k.gh / 2;
            const breidd = Math.hypot(bx - ax, bz - az); if (breidd < 0.3 * metri) return;
            const horn = Math.atan2(bz - az, bx - ax), eld = !!(hd.hurdEld && hd.hurdEld[i]);
            const bil = breidd / metri > 2.4;
            let blad;
            if (bil) {
              // grá flekahurð (ekki hvít eins og veggurinn — 07.10 sást hún ekki), sett inn í opið miðja vegu
              const e = new T.MeshLambertMaterial({ color: 0xffffff, map: flekahurd(breidd / metri, blH / metri) }); e.userData.hurd = 'bil';
              const g = new T.BoxGeometry(breidd, blH, Math.max(blD, ((v[4] || 0) * f || sjalfg) * 0.5)); losa.push(g, e); hurdaEfni.push(e);
              blad = new T.Mesh(g, e);
              blad.position.set((ax + bx) / 2, blH / 2, (az + bz) / 2); blad.rotation.y = -horn;
            } else {
              const e = new T.MeshLambertMaterial({ color: eld && utlit === 'eld' ? 0xe08a3c : 0xa58a6a }); e.userData.hurd = eld ? 'eld' : 'venjuleg';
              const g = new T.BoxGeometry(breidd * 0.96, blH * 0.98, blD); g.translate(breidd * 0.48, blH * 0.49, 0); losa.push(g, e); hurdaEfni.push(e);
              blad = new T.Mesh(g, e);
              blad.position.set(ax, 0, az); blad.quaternion.setFromAxisAngle(hjor, -horn - 0.96);   // 55° opin
            }
            blad.castShadow = false; hopur.add(blad);
          });
        }
        litaVeggi(lg);
      } else {
        veggir = new T.InstancedMesh(kG, kEfni, Math.max(1, k.kassar.length));
        k.kassar.forEach((r, i) => {
          m.makeScale(r.b, veggH, r.h);
          m.setPosition(r.x + r.b / 2 - k.gw / 2, veggH / 2, r.y + r.h / 2 - k.gh / 2);
          veggir.setMatrixAt(i, m);
        });
        veggir.count = k.kassar.length;
      }
      veggir.instanceMatrix.needsUpdate = true; veggir.castShadow = true; veggir.receiveShadow = true; hopur.add(veggir);
      losa.push(kG, kE, kTopp); veggEfni.push(kE, kTopp);
      // Merki: stöng + kúla + miði. Miðinn heldur stærð sinni á skjánum (læsilegur í hvaða aðdrætti sem er) og tæki sem
      // standa þétt fá misháar stangir svo miðarnir leggist ekki hver ofan á annan.
      const merki = hd.merki || [], naerri = Math.max(k.gw, k.gh) * 0.07;
      merki.forEach((mk, nrM) => {
        // Tækið hangir á næsta vegg (innan ≈ 1,6 m) og snýr út frá honum; án veggjar stendur það þar sem merkið er.
        const fest = hd.butar ? festaAVegg(hd.butar, mk.x, mk.y, 45 * (Math.max(hd.frumB || 0, hd.frumH || 0) / 2384 || 2.5)) : { x: mk.x, y: mk.y, nx: 0, ny: 1, aVegg: false };
        const gx = fest.x * f - k.gw / 2, gz = fest.y * f - k.gh / 2;
        const litur = new T.Color(mk.litur || '#c93c1d'), rad = Math.max(k.gw, k.gh) * 0.012;
        if (mk.gerd) {
          const lk = taekjalikan(mk.gerd, veggH, litur);
          lk.position.set(gx, 0, gz); lk.rotation.y = Math.atan2(fest.nx, fest.ny); hopur.add(lk); taekiHlutir.push(lk);
        }
        let grannar = 0;
        for (let j = 0; j < nrM; j++) if (Math.hypot(merki[j].x - mk.x, merki[j].y - mk.y) * f < naerri) grannar++;
        const toppur = veggH * (1.55 + grannar * 0.85);
        const sG = new T.CylinderGeometry(rad * 0.1, rad * 0.1, toppur, 8), sE = new T.MeshLambertMaterial({ color: litur });
        const stong = new T.Mesh(sG, sE); stong.position.set(gx, toppur / 2, gz); hopur.add(stong); taekiHlutir.push(stong);
        const kG2 = new T.SphereGeometry(rad * 0.7, 18, 12), kE2 = new T.MeshLambertMaterial({ color: litur, emissive: litur, emissiveIntensity: 0.35 });
        const kula = new T.Mesh(kG2, kE2); kula.position.set(gx, toppur + rad, gz); kula.castShadow = true; hopur.add(kula); taekiHlutir.push(kula);
        losa.push(sG, sE, kG2, kE2);
        if (mk.texti) {
          const txt = String(mk.texti).slice(0, 18), letur = '700 34px system-ui,sans-serif';
          const ms = document.createElement('canvas');
          let mc = ms.getContext('2d'); mc.font = letur;
          const tAkn = mk.gerd ? 54 : 0;                 // rými fyrir táknið (hvítur hringur) vinstra megin
          ms.width = Math.ceil(mc.measureText(txt).width) + 46 + tAkn; ms.height = 64;
          mc = ms.getContext('2d');
          const bw = ms.width - 4, bh = 60, rr = 16;
          mc.beginPath(); mc.moveTo(2 + rr, 2); mc.arcTo(2 + bw, 2, 2 + bw, 2 + bh, rr); mc.arcTo(2 + bw, 2 + bh, 2, 2 + bh, rr); mc.arcTo(2, 2 + bh, 2, 2, rr); mc.arcTo(2, 2, 2 + bw, 2, rr); mc.closePath();
          mc.fillStyle = '#' + litur.getHexString(); mc.fill();
          mc.lineWidth = 3; mc.strokeStyle = 'rgba(255,255,255,.9)'; mc.stroke();
          mc.fillStyle = (litur.r * 0.299 + litur.g * 0.587 + litur.b * 0.114) > 0.62 ? '#14120f' : '#fff';
          mc.font = letur; mc.textAlign = 'center'; mc.textBaseline = 'middle'; mc.fillText(txt, (ms.width + tAkn) / 2 - (tAkn ? 4 : 0), 34);
          if (tAkn) {
            mc.beginPath(); mc.arc(33, 32, 25.5, 0, Math.PI * 2); mc.fillStyle = '#ffffff'; mc.fill();
            mc.save(); mc.translate(33 - 24 * 0.9, 32 - 24 * 0.9); mc.scale(0.9, 0.9);
            try { teiknaTaekistakn(mc, mk.gerd); } catch (_) {}
            mc.restore();
          }
          const mA = new T.CanvasTexture(ms), mE = new T.SpriteMaterial({ map: mA, depthTest: false, sizeAttenuation: false });
          const midi = new T.Sprite(mE);
          midi.center.set(0.5, -0.2); midi.renderOrder = 10;
          midi.position.set(gx, toppur + rad * 2, gz); hopur.add(midi); taekiHlutir.push(midi);
          losa.push(mA, mE); midar.push({ midi, hlutfall: ms.width / ms.height });
        }
      });
      haedY += bil;
    });
    // Sól: ein ljóslind yfir allt húsið (skyggir fleti veggjanna; skuggarnir sjálfir eru bakaðir hér á eftir).
    const R = staerst * 0.78;
    sol.position.set(-R * 0.8, haedY + R * 1.5, R * 0.65); sol.target.position.set(0, 0, 0);
    /* BAKAÐIR SKUGGAR — hver hæð á sína skugga (Agnar 06.10.2026). Hæðirnar standa í sundur (bil = 3,2 × vegghæð) og
     * skuggakort sólarinnar varpaði veggjum efri hæðar niður á gólf hæðarinnar fyrir neðan — dökkir flekkir sem áttu
     * ekki heima þar. Nú eru skuggar hverrar hæðar teiknaðir á striga sem liggur á gólfi HENNAR (sama vörpun og
     * teikningin á gólfinu: x = (wx + gw/2)/gw·B, y = (wz + gh/2)/gh·H). Veggur AB með hæð h varpar ferhyrningnum
     * A, B, B+d, A+d þar sem d = lárétt stefna sólarljóssins × h / tan(hæðarhorn sólar); veggurinn hefur þykkt svo
     * hvert horn grunnflatarins er dregið (kúpt hula hans og hliðraða flatarins). Dyrakarmur (efsti 26 %) varpar
     * bandinu 0,74·d … d. Brúnir mýktar með móðu. Gríman er ógagnsæ, dýpt skuggans = ógegnsæi efnisins
     * (0,34 grátt útlit / 0,2 Brunahólf, beitaUtliti) — skarist tveir skuggar dökknar ekkert tvöfalt. */
    const solAtt = new T.Vector3().subVectors(sol.target.position, sol.position);
    const solLarett = Math.hypot(solAtt.x, solAtt.z) || 1, solTan = Math.max(0.15, -solAtt.y / solLarett);
    const bakaSkugga = lg => {
      const kvH = lg.hopur.scale.x || 1, lengd = lg.veggH / solTan / kvH;                   // skuggalengd í einingum hæðarinnar
      const dx = solAtt.x / solLarett * lengd, dz = solAtt.z / solLarett * lengd;
      const s = 2048 / Math.max(lg.gw, lg.gh), B = Math.max(2, Math.round(lg.gw * s)), H = Math.max(2, Math.round(lg.gh * s));
      const grima = document.createElement('canvas'); grima.width = B; grima.height = H;
      const g = grima.getContext('2d'); g.fillStyle = '#fff';           // hvít gríma × litur efnisins = skuggaliturinn
      const px = (x, z) => [(x + lg.gw / 2) * s, (z + lg.gh / 2) * s];
      const marg = pts => { g.beginPath(); pts.forEach((p, i) => { const q = px(p[0], p[1]); if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.fill(); };
      // Kassi á gólfinu (4 horn) varpar skugga frá hliðrun a·d til b·d: hliðraðir fletir + böndin sem tengja þá.
      const varpa = (horn, a, b) => {
        const A = horn.map(p => [p[0] + dx * a, p[1] + dz * a]), Bh = horn.map(p => [p[0] + dx * b, p[1] + dz * b]);
        marg(A); marg(Bh);
        for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; marg([A[i], A[j], Bh[j], Bh[i]]); }
      };
      const hornAB = (ax, az, bx, bz, lengja, th) => {
        const L = Math.hypot(bx - ax, bz - az) || 1, ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz * th / 2, nz = ux * th / 2;
        const ex = ux * lengja, ez = uz * lengja;
        return [[ax - ex + nx, az - ez + nz], [bx + ex + nx, bz + ez + nz], [bx + ex - nx, bz + ez - nz], [ax - ex - nx, az - ez - nz]];
      };
      const hd = lg.hd, f = lg.f, gw2 = lg.gw / 2, gh2 = lg.gh / 2, sj = lg.sjalfg || Math.max(lg.gw, lg.gh) * 0.004;
      if (lg.heilir) {
        hd.butar.forEach(v => { const th = Math.max(0.8, lg.veggH * 0.08, (v[4] || 0) * f || sj); varpa(hornAB(v[0] * f - gw2, v[1] * f - gh2, v[2] * f - gw2, v[3] * f - gh2, th / 2, th), 0, 1); });
        (hd.hurdir || []).forEach(v => { const th = Math.max(0.8, lg.veggH * 0.08, (v[4] || 0) * f || sj); varpa(hornAB(v[0] * f - gw2, v[1] * f - gh2, v[2] * f - gw2, v[3] * f - gh2, 0, th), 0.74, 1); });
      } else {
        (lg.k.kassar || []).forEach(r => { const x0 = r.x - gw2, z0 = r.y - gh2; varpa([[x0, z0], [x0 + r.b, z0], [x0 + r.b, z0 + r.h], [x0, z0 + r.h]], 0, 1); });
      }
      const str = document.createElement('canvas'); str.width = B; str.height = H;
      const c = str.getContext('2d');
      c.filter = 'blur(' + Math.max(1.5, Math.min(5, 0.12 * lg.veggH / 3 * s)).toFixed(1) + 'px)';    // ≈ 12 cm mýkt
      c.drawImage(grima, 0, 0);
      const aferd = new T.CanvasTexture(str); aferd.anisotropy = 4;
      const skE = new T.MeshBasicMaterial({ map: aferd, color: 0x26221d, transparent: true, opacity: utlit === 'gratt' ? GRATT_3D.skuggi : 0.2, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const skuggi = new T.Mesh(lg.golfG, skE);
      skuggi.rotation.x = -Math.PI / 2; skuggi.position.y = 0.55; skuggi.renderOrder = 2; lg.hopur.add(skuggi);
      skuggaEfni.push(skE); losa.push(aferd, skE); lg.skuggi = skuggi; lg.skuggaStr = str;
    };
    lag.forEach(lg => { try { bakaSkugga(lg); } catch (e) { console.warn('[383] bakaSkugga', e); } });
    // Myndavél á braut um miðjuna: draga = snúa · hjól/klípa = aðdráttur · hægri/shift-draga eða tveir fingur = færa.
    const vel = new T.PerspectiveCamera(42, b / h, 0.1, staerst * 20 + haedY * 6);
    const mid = new T.Vector3(0, haedY * 0.4, 0);
    // Hár og mjór strigi (sími): sjónsviðið lárétt er þrengra en lóðrétt — bakka svo allt húsið sjáist (05.10.2026).
    // 07.10.2026 (Agnar, með mynd af „2D → 3D"-grunnmynd: „bara mappið eins og ég fæ það og rétt að halla því"): opnast
    // OFAN FRÁ, beint á teikninguna eins og hún snýr í 2D, aðeins hallað svo veggirnir rísi. „Á ská" = gamla sjónarhornið.
    const fjarlSka = Math.max(staerst * 1.25, haedY * 2.3) * (b < h * 1.5 ? Math.min(2.6, 1.5 * h / Math.max(1, b)) : 1);
    // ofan frá: allt húsið (og efri hæðir) innan rammans — sjónsviðið nær styttra á gólfinu þegar horft er beint niður
    const SJONARHORN = { ofan: { theta: 0, phi: 0.42, fjarl: fjarlSka * 1.3 }, ska: { theta: -0.6, phi: 0.95, fjarl: fjarlSka } };
    let theta = SJONARHORN.ofan.theta, phi = SJONARHORN.ofan.phi, fjarl = SJONARHORN.ofan.fjarl;
    let flug = null;     // mjúk færsla á milli sjónarhorna (kallað í hverjum ramma)
    const fljuga = (t, p, fj) => {
      let d = (t - theta) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
      const t0 = theta, p0 = phi, f0 = fjarl, s = performance.now();
      flug = () => { const a = Math.min(1, (performance.now() - s) / 450), e = a * (2 - a); theta = t0 + d * e; phi = p0 + (p - p0) * e; fjarl = f0 + (fj - f0) * e; stillaVel(); if (a >= 1) flug = null; };
    };
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
      // „fram" = frá myndavélinni eftir gólfinu. Draga niður → miðjan fram → teikningin fylgir músinni niður, eins og
      // hægri/vinstri fylgir henni (Agnar 05.10.2026: „upp og niður eiginlega í vitlausa átt miðað við hægri og vinstri").
      mid.addScaledVector(haegri, -dx * kv).addScaledVector(fram, dy * kv);
    };
    // Smellur (ekki dráttur, ekki klípa) á vegg: handfangið fær hæð og vegg undir bendlinum (aSmell) — notað í handvali eldveggja.
    const geisli = new T.Raycaster(), ndc = new T.Vector2();
    let fjolsnert = false, handfang = null;
    const veggurUndir = (cx, cy) => {
      const r = el.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      geisli.setFromCamera(ndc, vel);
      let best = null;
      lag.forEach(lg => {
        if (!lg.heilir || !lg.hopur.visible) return;
        const hit = geisli.intersectObject(lg.veggir, false)[0];
        if (hit && hit.instanceId != null && (!best || hit.distance < best.d)) best = { d: hit.distance, haed: lg.nr, veggur: hit.instanceId };
      });
      return best;
    };
    const nidur = e => { el.setPointerCapture(e.pointerId); bendlar.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now(), faera: e.button === 2 || e.shiftKey }); if (bendlar.size >= 2) fjolsnert = true; el.style.cursor = 'grabbing'; };
    const hreyfa = e => {
      const p = bendlar.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (ganga) {
        if (bendlar.size >= 2) {
          const [a2, c2] = [...bendlar.values()], nuna = Math.hypot(a2.x - c2.x, a2.y - c2.y);
          if (klipa) gangaFaera((nuna - klipa) * ganga.metri * 0.03, 0);
          klipa = nuna;
        } else { ganga.yaw += dx * 0.004; ganga.pitch = Math.max(-1.2, Math.min(1.2, ganga.pitch + dy * 0.004)); }
        gangaVel(); return;
      }
      if (bendlar.size >= 2) {
        const [a, c2] = [...bendlar.values()], nuna = Math.hypot(a.x - c2.x, a.y - c2.y);
        if (klipa) fjarl *= klipa / Math.max(1, nuna);
        klipa = nuna; faera(dx / 2, dy / 2);
      } else if (p.faera) faera(dx, dy);
      else { theta -= dx * 0.006; phi -= dy * 0.006; }
      stillaVel();
    };
    const upp = e => {
      const p = bendlar.get(e.pointerId);
      bendlar.delete(e.pointerId); klipa = 0; el.style.cursor = 'grab';
      const smellur = p && !fjolsnert && e.type === 'pointerup' && !p.faera && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 7 && performance.now() - p.t0 < 600;
      if (!bendlar.size) fjolsnert = false;
      if (smellur && handfang && handfang.aSmell) { try { handfang.aSmell(veggurUndir(e.clientX, e.clientY), e.clientX, e.clientY); } catch (err) { console.warn('[383] aSmell', err); } }
    };
    const hjol = e => { e.preventDefault(); if (ganga) { gangaFaera((e.deltaY < 0 ? 1 : -1) * 0.8 * ganga.metri, 0); gangaVel(); return; } fjarl *= e.deltaY > 0 ? 1.12 : 0.89; stillaVel(); };
    const samhengi = e => e.preventDefault();
    // GÖNGUHAMUR (Agnar 06.10.2026, úr samanburði þrívíddarteiknara — floorplan-3d): augu í 1,6 m hæð á einni hæð.
    // Draga = líta í kring (gripið um heiminn, eins og snúningurinn) · hjól / W S / ↑ ↓ = ganga · A D / ← → = til hliðar ·
    // shift = hraðar · tvísmella á gólf = fara þangað · Esc = hætta. Engin árekstrarvörn: gengið er í gegnum veggi.
    let ganga = null;
    const takkar = {};
    const gangaVel = () => {
      const g = ganga, cp = Math.cos(g.pitch);
      vel.position.copy(g.pos);
      vel.lookAt(g.pos.x + Math.sin(g.yaw) * cp, g.pos.y + Math.sin(g.pitch), g.pos.z + Math.cos(g.yaw) * cp);
    };
    const gangaFaera = (fram, hlid) => {
      const g = ganga, sy = Math.sin(g.yaw), cy = Math.cos(g.yaw);
      g.pos.x += sy * fram - cy * hlid; g.pos.z += cy * fram + sy * hlid;    // hægri = fram × upp = (−cos, 0, sin)
      g.pos.x = Math.min(g.mork.x1, Math.max(g.mork.x0, g.pos.x)); g.pos.z = Math.min(g.mork.z1, Math.max(g.mork.z0, g.pos.z));
    };
    const gangaByrja = nr => {
      const lg = lag[nr] || lag[0]; if (!lg) return false;
      const hp = lg.hopur.position, sx = lg.hopur.scale.x, sz = lg.hopur.scale.z, metri = lg.veggH / 3.0;   // ristarreitir á metra
      ganga = {
        nr: lg.nr, metri, pos: new T.Vector3(hp.x, hp.y + 1.6 * metri, hp.z), pitch: 0,
        yaw: lg.gw * sx >= lg.gh * sz ? Math.PI / 2 : 0,                                                       // eftir lengri ásnum
        mork: { x0: hp.x - lg.gw / 2 * sx, x1: hp.x + lg.gw / 2 * sx, z0: hp.z - lg.gh / 2 * sz, z1: hp.z + lg.gh / 2 * sz }
      };
      lag.forEach(o => { const ein = o.nr === lg.nr; o.hopur.visible = ein; if (ein) { o.golfE.opacity = 1; o.golfE.depthWrite = true; o.golfE.needsUpdate = true; } });
      vel.fov = 70; vel.near = Math.max(0.01, metri * 0.05); vel.updateProjectionMatrix();
      gangaVel(); return true;
    };
    const gangaHaetta = () => { if (!ganga) return; ganga = null; vel.fov = 42; vel.near = 0.1; vel.updateProjectionMatrix(); stillaVel(); };
    const ATT = { w: ['fram', 1], arrowup: ['fram', 1], s: ['fram', -1], arrowdown: ['fram', -1], d: ['hlid', 1], arrowright: ['hlid', 1], a: ['hlid', -1], arrowleft: ['hlid', -1] };
    const lykill = (e, nidri) => {
      if (!ganga) return;
      const t = e.target, tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      const k2 = String(e.key || '').toLowerCase();
      // Esc stöðvast hér (gripið fremst, capture) — annars lokaði það líka öllum teikningaglugganum
      if (k2 === 'escape') { e.preventDefault(); e.stopImmediatePropagation(); if (nidri && handfang && handfang.aGangaLok) handfang.aGangaLok(); return; }
      if (k2 === 'shift') { takkar.hratt = nidri; return; }
      const a = ATT[k2]; if (!a) return;
      e.preventDefault();
      takkar[k2] = nidri;
      takkar.fram = (takkar.w || takkar.arrowup ? 1 : 0) - (takkar.s || takkar.arrowdown ? 1 : 0);
      takkar.hlid = (takkar.d || takkar.arrowright ? 1 : 0) - (takkar.a || takkar.arrowleft ? 1 : 0);
    };
    const lykNidur = e => lykill(e, true), lykUpp = e => lykill(e, false);
    window.addEventListener('keydown', lykNidur, true); window.addEventListener('keyup', lykUpp, true);
    el.addEventListener('dblclick', e => {
      if (!ganga) return;
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      geisli.setFromCamera(ndc, vel);
      const golfY = ganga.pos.y - 1.6 * ganga.metri, pt = new T.Vector3();
      if (geisli.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -golfY), pt)) { ganga.pos.x = pt.x; ganga.pos.z = pt.z; gangaFaera(0, 0); gangaVel(); }
    });
    el.addEventListener('pointerdown', nidur); el.addEventListener('pointermove', hreyfa);
    el.addEventListener('pointerup', upp); el.addEventListener('pointercancel', upp);
    el.addEventListener('wheel', hjol, { passive: false }); el.addEventListener('contextmenu', samhengi);
    // Miðar eru 29 px háir á skjánum óháð aðdrætti og gluggastærð (sizeAttenuation:false → hæð = kvarði × 1,302 × gluggahæð við 42° sjónhorn).
    const stillaMida = hh => { const mh = 29 / (1.302 * Math.max(200, hh)); midar.forEach(o => o.midi.scale.set(mh * o.hlutfall, mh, 1)); };
    const staerd = () => { const w = gamur.clientWidth || 800, hh = gamur.clientHeight || 500; teiknari.setSize(w, hh); vel.aspect = w / hh; vel.updateProjectionMatrix(); stillaMida(hh); };
    window.addEventListener('resize', staerd);
    stillaMida(h);
    stillaVel();
    let lifir = true, raf = 0;
    let sidast = performance.now();
    const lykkja = () => {
      if (!lifir) return;
      if (flug) flug();
      const nu = performance.now(), dt = Math.min(0.1, (nu - sidast) / 1000); sidast = nu;
      if (ganga) {
        if (takkar.fram || takkar.hlid) { const v = 1.6 * ganga.metri * dt * (takkar.hratt ? 2.5 : 1); gangaFaera((takkar.fram || 0) * v, (takkar.hlid || 0) * v); }
        gangaVel();
      }
      teiknari.render(svid, vel); raf = requestAnimationFrame(lykkja);
    };
    lykkja();
    const beitaUtliti = () => {
      const g = utlit === 'gratt';
      teiknari.setClearColor(g ? GRATT_3D.bakgrunnur : BAKGRUNNUR_3D);
      himinn.color.setHex(g ? GRATT_3D.himinn[0] : 0xffffff); himinn.groundColor.setHex(g ? GRATT_3D.himinn[1] : 0xbdb8ae); himinn.intensity = g ? GRATT_3D.himinn[2] : 0.8;
      sol.intensity = g ? GRATT_3D.sol : 0.6;
      daufLog.forEach(m => { m.visible = g; });
      skuggaEfni.forEach(e => { e.opacity = g ? GRATT_3D.skuggi : 0.2; });
      veggEfni.forEach(e => { if (e.userData.toppur && !e.transparent) e.color.setHex(g ? GRATT_3D.toppur : TOPPLITUR_3D); });
      lag.forEach(lg => { litaVeggi(lg); litaHolf(lg); });
      hurdaEfni.forEach(e => { if (e.userData.hurd === 'eld') e.color.setHex(g ? 0xa58a6a : 0xe08a3c); });
    };
    beitaUtliti();
    handfang = {
      kassar: haedir.length,
      // auðkenni hæðanna í sviðinu, í röð (445: hvaða hæð „Festa" á við)
      haedIds: () => lag.map(q => q.hd.haedId || null),
      synilegar: () => lag.filter(q => q.hopur.visible).map(q => q.hd.haedId || null),
      // Grátt (sjálfgefið á prófílnum) eða litað útlit eldveggja og brunahólfa.
      utlit(v) { if (v !== 'gratt' && v !== 'eld') return utlit; utlit = v; try { localStorage.setItem(UTLIT_LS, v); } catch (_) {} beitaUtliti(); return utlit; },
      // MYND AF SÝNINNI (Agnar 07.10.2026: „This view would be absolutely perfect as the image we put the fire extinguisher
      // in its places"): sviðið teiknað k-falt skarpar (sömu CSS-stærð, svo miðar og tæki halda hlutföllum) → PNG.
      mynd(k) {
        k = Math.max(1, Math.min(4, k || 2));
        const w = el.clientWidth || 800, hh = el.clientHeight || 500, pr = teiknari.getPixelRatio();
        try {
          teiknari.setPixelRatio(pr * k); teiknari.setSize(w, hh, false); teiknari.render(svid, vel);
          return teiknari.domElement.toDataURL('image/png');
        } finally { teiknari.setPixelRatio(pr); teiknari.setSize(w, hh, false); teiknari.render(svid, vel); }
      },
      /* FÖST VINNUMYND (Agnar 07.10.2026: „ætti þá í raun ekki að vera léttara að opna svona mynd tilbúna í stað þess að
       * vera láta kerfið sækja og setja veggina … þegar hún er orðinn bara föst mynd"). Fyrsta hæðin í sviðinu, ofan frá
       * (sama horn og 'ofan'), römmuð þétt að veggjunum og teiknuð `hamark` dílar á lengri hlið, skorin að innihaldinu.
       * Skilar striganum og því sem 445 þarf til að varpa á milli myndar og heims ÁN WebGL:
       *   cam   = projectionMatrix · matrixWorldInverse (16 tölur, dálkaröð three.js) — heimur → klippihnit heildarinnar
       *   heild = [B, H] teikningarinnar · rammi = [x, y, b, h] skurðurinn úr henni (= myndin sem vistast)
       *   kort  = teikning → heimur: x = (u − sx)·f − gw/2, z = (v − sy)·f − gh/2 (u, v í dílum frummyndar), y = 0 gólf. */
      fastMynd(o) {
        o = o || {};
        // hæðin: eftir auðkenni (o.haedId), annars sú sem er sýnd ein, annars sú neðsta
        const lg = (o.haedId && lag.find(q => q.hd.haedId === o.haedId)) || (lag.filter(q => q.hopur.visible).length === 1 && lag.find(q => q.hopur.visible)) || lag[0];
        if (!lg) return null;
        if (ganga) gangaHaetta();
        flug = null;
        const hamark = Math.max(600, Math.min(4096, Math.round(o.hamark || 2400)));
        const hd = lg.hd, f = lg.f, gw2 = lg.gw / 2, gh2 = lg.gh / 2;
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
        if (lg.heilir) hd.butar.forEach(v => { for (let j = 0; j < 4; j += 2) { const wx = v[j] * f - gw2, wz = v[j + 1] * f - gh2; if (wx < x0) x0 = wx; if (wx > x1) x1 = wx; if (wz < z0) z0 = wz; if (wz > z1) z1 = wz; } });
        if (!(x1 > x0) || !(z1 > z0)) { x0 = -gw2; x1 = gw2; z0 = -gh2; z1 = gh2; }
        const sp = Math.max(x1 - x0, z1 - z0) * 0.03 + lg.veggH * 0.1;
        x0 -= sp; x1 += sp; z0 -= sp; z1 += sp;
        const horn = [];
        lg.hopur.updateMatrixWorld(true);
        for (const x of [x0, x1]) for (const y of [0, lg.veggH]) for (const z of [z0, z1]) horn.push(new T.Vector3(x, y, z).applyMatrix4(lg.hopur.matrixWorld));
        // aðeins þessi hæð, og án tækja, merkja og pinna (o.anTaekja !== false)
        const sjonir = lag.map(q => q.hopur.visible), taekiSjon = taekiHlutir.map(q => q.visible);
        lag.forEach(q => { q.hopur.visible = q === lg; });
        if (o.anTaekja !== false) taekiHlutir.forEach(q => { q.visible = false; });
        const geymt = { theta, phi, fjarl, mid: mid.clone(), aspect: vel.aspect, pr: teiknari.getPixelRatio(), w: el.clientWidth || b, h: el.clientHeight || h };
        const pv = new T.Vector3(), haegri = new T.Vector3(), upp = new T.Vector3();
        theta = SJONARHORN.ofan.theta; phi = SJONARHORN.ofan.phi;
        mid.set(0, 0, 0); horn.forEach(p => mid.add(p)); mid.multiplyScalar(1 / horn.length);
        let asp = Math.max(0.5, Math.min(2.2, (x1 - x0) / (z1 - z0)));
        fjarl = Math.max(x1 - x0, z1 - z0) * 1.6;
        const still = () => { vel.aspect = asp; vel.updateProjectionMatrix(); stillaVel(); vel.updateMatrixWorld(true); };
        // Rammað í skrefum: miðja færð að miðju umgjarðarinnar á skjánum, hlutföll myndar að hlutföllum hennar, fjarlægð þar
        // til hún fyllir 96 % — sjónarhornið sjálft (θ, φ) er óbreytt.
        for (let i = 0; i < 8; i++) {
          still();
          let a = Infinity, a2 = -Infinity, c = Infinity, c2 = -Infinity;
          horn.forEach(p => { pv.copy(p).project(vel); if (pv.x < a) a = pv.x; if (pv.x > a2) a2 = pv.x; if (pv.y < c) c = pv.y; if (pv.y > c2) c2 = pv.y; });
          const ex = (a2 - a) / 2, ey = (c2 - c) / 2, hH = fjarl * Math.tan(vel.fov * Math.PI / 360);
          haegri.setFromMatrixColumn(vel.matrixWorld, 0); upp.setFromMatrixColumn(vel.matrixWorld, 1);
          mid.addScaledVector(haegri, (a2 + a) / 2 * hH * asp).addScaledVector(upp, (c2 + c) / 2 * hH);
          const nytt = Math.max(0.5, Math.min(2.2, asp * ex / Math.max(1e-6, ey)));
          const ex2 = ex * asp / nytt;
          asp = nytt;
          fjarl *= Math.max(ex2, ey) / 0.96;
        }
        still();
        const W = asp >= 1 ? hamark : Math.round(hamark * asp), H = asp >= 1 ? Math.round(hamark / asp) : hamark;
        try {
          teiknari.setPixelRatio(1); teiknari.setSize(W, H, false);
          vel.aspect = W / H; vel.updateProjectionMatrix(); vel.updateMatrixWorld(true);
          teiknari.render(svid, vel);
          const heil = document.createElement('canvas'); heil.width = W; heil.height = H;
          const hx = heil.getContext('2d', { willReadFrequently: true });
          hx.drawImage(teiknari.domElement, 0, 0, W, H);
          // Skorið að innihaldinu: allt sem víkur frá bakgrunnslitnum (horndíllinn — umgjörðin á spássíu þar).
          const dd = hx.getImageData(0, 0, W, H).data, r0 = dd[0], g0 = dd[1], b0 = dd[2];
          let rx0 = W, rx1 = -1, ry0 = H, ry1 = -1;
          for (let y = 0; y < H; y++) {
            for (let x = 0, i = y * W * 4; x < W; x++, i += 4) {
              if (Math.abs(dd[i] - r0) + Math.abs(dd[i + 1] - g0) + Math.abs(dd[i + 2] - b0) > 12) { if (x < rx0) rx0 = x; if (x > rx1) rx1 = x; if (y < ry0) ry0 = y; ry1 = y; }
            }
          }
          const sp2 = Math.round(Math.max(W, H) * 0.015);
          const rammi = rx1 < rx0 ? [0, 0, W, H] : [Math.max(0, rx0 - sp2), Math.max(0, ry0 - sp2), 0, 0];
          if (rx1 >= rx0) { rammi[2] = Math.min(W, rx1 + 1 + sp2) - rammi[0]; rammi[3] = Math.min(H, ry1 + 1 + sp2) - rammi[1]; }
          const ut = document.createElement('canvas'); ut.width = rammi[2]; ut.height = rammi[3];
          ut.getContext('2d').drawImage(heil, -rammi[0], -rammi[1]);
          // P · V · M(hæðar): fylkið varpar STAÐBUNDNUM hnitum hæðarinnar (kortið hér á eftir) — líka efri hæð sem er hliðrað og kvörðuð
          const cam = new T.Matrix4().multiplyMatrices(vel.projectionMatrix, vel.matrixWorldInverse).multiply(lg.hopur.matrixWorld).elements.map(n => +n.toPrecision(10));
          return {
            strigi: ut, cam, heild: [W, H], rammi, b: rammi[2], h: rammi[3],
            kort: { f: +f.toPrecision(10), gw: +lg.gw.toPrecision(10), gh: +lg.gh.toPrecision(10), sx: hd.sk.x, sy: hd.sk.y, sw: hd.sk.w, sh: hd.sk.h },
            veggH: +lg.veggH.toPrecision(8), sjalfg: +(lg.sjalfg || Math.max(lg.gw, lg.gh) * 0.004).toPrecision(8),
            bakgrunnur: [r0, g0, b0]
          };
        } finally {
          teiknari.setPixelRatio(geymt.pr); teiknari.setSize(geymt.w, geymt.h, false);
          lag.forEach((q, i) => { q.hopur.visible = sjonir[i]; }); taekiHlutir.forEach((q, i) => { q.visible = taekiSjon[i]; });
          theta = geymt.theta; phi = geymt.phi; fjarl = geymt.fjarl; mid.copy(geymt.mid);
          vel.aspect = geymt.aspect; vel.updateProjectionMatrix(); stillaVel();
        }
      },
      // Sjónarhorn: 'ofan' (beint ofan á teikninguna, aðeins hallað) eða 'ska'. Án gildis: hvort er nær núna.
      sjonarhorn(n) {
        if (SJONARHORN[n]) { if (ganga) gangaHaetta(); const s = SJONARHORN[n]; mid.set(0, mid.y, 0); fljuga(s.theta, s.phi, s.fjarl); return n; }
        return phi < 0.72 ? 'ofan' : 'ska';
      },
      heilir,
      aSmell: null,     // fall(hit | null, clientX, clientY) — kallað við smell á sviðið
      // Gönguhamur á hæð nr (true) eða aftur í snúning (false). aGangaLok: kallað þegar notandinn ýtir á Esc.
      ganga(a, nr) { if (a) return gangaByrja(nr == null ? 0 : nr); gangaHaetta(); return false; },
      aGangaLok: null,
      // Nýr eldflokkur á hæð (eftir handval): veggir, karmar, hurðarendur og brunahólf litast aftur án þess að smíða sviðið.
      uppfaera(nr, d) { const lg = lag[nr]; if (!lg) return; if (d) Object.assign(lg.hd, d); litaVeggi(lg); litaHolf(lg); },
      // Veggurinn sem notandinn er að velja flokk á (gylltur); merkja(null) tekur merkinguna af.
      merkja(nr, i) { lag.forEach(lg => { const v = lg.nr === nr ? i : null; if (lg.valinn !== v) { lg.valinn = v; litaVeggi(lg); } }); },
      // SAMEIGN (446): sýna / fela gulleitu sameignina og deyfðar íbúðir · setjaSameign(fall(haedId) → niðurstaða)
      sameign(on) { synaSameign(on); return samOn; },
      setjaSameign(fn) { lag.forEach(lg => { try { samHaed(lg, false); } catch (_) {} lg.hd.sameign = fn(lg.hd.haedId) || null; if (lg.samM) { lg.hopur.remove(lg.samM); lg.samM = null; } lg.samV = null; lg.samUpph = null; }); synaSameign(samOn); },
      stigaStafli: () => lg0StigaHlidrun.slice(),
      // Bakaðir skuggar hverrar hæðar (prófanir): hlutfall skyggðra díla á striganum, ógegnsæi, sýnileiki.
      skuggar(mynd) {
        // sýnimynd: dökkir skuggar á hvítu (gríman sjálf er hvít á gegnsæju)
        const skuggaSyni = s => { const c = document.createElement('canvas'); c.width = s.width; c.height = s.height; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.filter = 'invert(1)'; x.drawImage(s, 0, 0); return c.toDataURL('image/png'); };
        return lag.map(lg => {
          let hlutf = 0;
          try { const s = lg.skuggaStr, d = s.getContext('2d').getImageData(0, 0, s.width, s.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 64) n++; hlutf = +(n / (s.width * s.height)).toFixed(4); } catch (_) {}
          return { nr: lg.nr, til: !!lg.skuggi, synilegt: !!(lg.skuggi && lg.skuggi.visible && lg.hopur.visible), ogegnsaei: lg.skuggi ? lg.skuggi.material.opacity : null, hlutfall: hlutf, mynd: mynd && lg.skuggaStr ? skuggaSyni(lg.skuggaStr) : undefined };
        });
      },
      // Stafli hæðanna (prófanir): miðja veggjanna í heimshnitum og stærð hússins á hverri hæð.
      stafli() {
        const mm = new T.Matrix4(), pv = new T.Vector3();
        return lag.map(lg => {
          if (!lg.heilir) return { nr: lg.nr, heilir: false };
          lg.hopur.updateMatrixWorld(true);
          const xs = [], zs = [];
          for (let i = 0; i < lg.veggir.count; i++) { lg.veggir.getMatrixAt(i, mm); pv.setFromMatrixPosition(mm).applyMatrix4(lg.hopur.matrixWorld); xs.push(pv.x); zs.push(pv.z); }
          xs.sort((a, b) => a - b); zs.sort((a, b) => a - b);
          const q = (l, p) => l[Math.min(l.length - 1, Math.max(0, Math.round(p * (l.length - 1))))];
          const m = 1 / (lg.veggH / 3);   // metrar á ristarreit
          return { nr: lg.nr, x: +((q(xs, .02) + q(xs, .98)) / 2 * m).toFixed(2), z: +((q(zs, .02) + q(zs, .98)) / 2 * m).toFixed(2), b: +((q(xs, .98) - q(xs, .02)) * m).toFixed(1), d: +((q(zs, .98) - q(zs, .02)) * m).toFixed(1) };
        });
      },
      // Skjáhnit miðju veggjar (prófanir).
      skjar(nr, i) {
        const lg = lag[nr]; if (!lg || !lg.heilir) return null;
        const mm = new T.Matrix4(); lg.veggir.getMatrixAt(i, mm);
        const pt = new T.Vector3().setFromMatrixPosition(mm).applyMatrix4(lg.hopur.matrixWorld).project(vel), r = el.getBoundingClientRect();
        return { x: r.left + (pt.x + 1) / 2 * r.width, y: r.top + (1 - pt.y) / 2 * r.height };
      },
      // Gegnsæir veggir: tækin og teikningin sjást í gegnum húsið.
      gegnsaett(a) {
        veggEfni.forEach(e => { e.transparent = !!a; e.opacity = a ? 0.4 : 1; e.depthWrite = !a; e.color.setHex(e.userData.toppur ? (a ? 0x8a847a : utlit === 'gratt' ? GRATT_3D.toppur : TOPPLITUR_3D) : e.userData.litad ? (a ? 0xb4b0a8 : 0xffffff) : (a ? 0x9d978c : VEGGLITUR_3D)); e.needsUpdate = true; });
        sporEfni.forEach(o => { o.visible = !!a; });
        hurdaEfni.forEach(e => { e.transparent = !!a; e.opacity = a ? 0.35 : 1; e.depthWrite = !a; e.needsUpdate = true; });
      },
      // Ein hæð í einu (nr) eða allar (null). Stök efri hæð fær heilt gólf — hún hylur þá ekkert.
      syna(nr) {
        lag.forEach(o => { const ein = nr === o.nr; o.hopur.visible = nr == null || ein; o.golfE.opacity = (o.nr > 0 && !ein) ? 0.42 : 1; o.golfE.depthWrite = o.nr === 0 || ein; o.golfE.needsUpdate = true; });
        mid.y = nr == null ? haedY * 0.4 : lag[nr] ? lag[nr].hopur.position.y : 0;
        fjarl = (nr == null ? Math.max(staerst * 1.25, haedY * 2.3) : staerst * 1.25) * (phi < 0.72 ? 1.3 : 1); stillaVel();   // ofan frá: lengra frá
      },
      /* BLENDER-MYND (Agnar 06.10.2026: gráa Blender-útlitið af húsinu sem hann er að skoða, t.d. í tilboð). Senan sem sést,
       * í METRUM, fyrir brúartölvuna (luna-bridge blender-mynd.js → blender/sena.py). Hnit eins og í sviðinu: x til hægri,
       * y upp, z „niður" blaðið; upphaf = miðja 1. hæðar. Metrar = heimseiningar ÷ (vegghæð 1. hæðar / 3) — sami kvarði og
       * gönguhamurinn. Aðeins sýnilegar hæðir (val „1. hæð / 2. hæð" og gönguhamur virt); hæðirnar halda stöðu sinni.
       * veggir/gler/hurdir: [x1, z1, x2, z2, þykkt] — miðlína; Blender lengir veggi um hálfa þykkt í hvorn enda eins og
       * þrívíddin hér. taeki: festipunktur á veggfleti + normall út frá vegg. Myndavélar: „Sjónarhorn" = vélin eins og hún
       * stendur núna, „Yfirlit" = 3/4 loftmynd af öllu sem sést (passa: Blender stillir fjarlægðina svo allt komist fyrir). */
      // RAUNSÆTT (o.utlit = 'raunsaett', 07.10.2026 → blender/raunsaett.py): engin gólfmynd (teikningin sést ekki á gólfinu
      // þar) en herbergi / golflinur / stigar úr o.pdf[haedId] (raunUrSidu) á hverja hæð, og — sjáist ein hæð — vinnumynd:
      // það sem þarf til að hreina vinnuskjalið verði föst vinnumynd hæðarinnar (445): S = staðbundin hnit hæðarinnar →
      // metrar senunnar (dálkaröð), svo cam = varpa (metrar → mynd, úr Blender) · S, og kortið eins og fastMynd skilar.
      blenderSena(o) {
        o = o || {};
        const raun = o.utlit === 'raunsaett';
        const u0 = (lag[0] && lag[0].veggH / 3) || 1, M = n => Math.round(n / u0 * 1000) / 1000;
        const ut = [], mork = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity, y1: 0 };
        const myndHamark = raun ? 0 : o.myndHamark == null ? 260000 : o.myndHamark;
        // sneiðmynd (3+ sýnilegar hæðir): aðeins þá fylgir sameignin — einnar og tveggja hæða myndir haldast óbreyttar
        const snid = raun && (o.snid || lag.filter(lg => lg.hopur.visible).length >= 3) ? (o.snid || 'snidmynd') : '';
        lag.forEach(lg => {
          if (!lg.hopur.visible) return;
          const hd = lg.hd, f = lg.f, kv = lg.hopur.scale.x || 1, P = lg.hopur.position, gw2 = lg.gw / 2, gh2 = lg.gh / 2;
          const sj = lg.sjalfg || Math.max(lg.gw, lg.gh) * 0.004;
          const X = x => M(P.x + x * kv), Z = z => M(P.z + z * kv), L = v => M(v * kv);
          const butur = (v, minTh) => [X(v[0] * f - gw2), Z(v[1] * f - gh2), X(v[2] * f - gw2), Z(v[3] * f - gh2), L(Math.max(minTh, (v[4] || 0) * f || sj))];
          let veggir = [];
          if (lg.heilir) veggir = hd.butar.map(v => butur(v, 0.8));
          else (lg.k.kassar || []).forEach(r => {
            // ristarkassi → veggbutur eftir lengri ásnum, styttur um hálfa þykkt í hvorn enda (Blender lengir aftur)
            const x0 = r.x - gw2, z0 = r.y - gh2;
            if (r.b >= r.h) veggir.push([X(x0 + r.h / 2), Z(z0 + r.h / 2), X(x0 + r.b - r.h / 2), Z(z0 + r.h / 2), L(r.h)]);
            else veggir.push([X(x0 + r.b / 2), Z(z0 + r.b / 2), X(x0 + r.b / 2), Z(z0 + r.h - r.b / 2), L(r.b)]);
          });
          const gler = lg.heilir ? (hd.gler || []).map(v => butur(v, 0)) : [];
          const hurdir = lg.heilir ? (hd.hurdir || []).map(v => butur(v, 0.8)) : [];
          const taeki = (hd.merki || []).map(mk => {
            const fest = hd.butar ? festaAVegg(hd.butar, mk.x, mk.y, 45 * (Math.max(hd.frumB || 0, hd.frumH || 0) / 2384 || 2.5)) : { x: mk.x, y: mk.y, nx: 0, ny: 1, aVegg: false };
            return { x: X(fest.x * f - gw2), z: Z(fest.y * f - gh2), nx: +fest.nx.toFixed(4), nz: +fest.ny.toFixed(4), aVegg: !!fest.aVegg, gerd: mk.gerd || 'slokkvitaeki', stimpill: mk.stimpill || undefined, litur: mk.litur || '', tegund: String(mk.texti || '').slice(0, 40) };
          });
          // Gólfið: teikningin á hvítu (gegnsæ lóð verður hvít), smækkuð í JPEG — aðeins ef hún er lítil.
          const golf = { x: M(P.x), z: M(P.z), w: L(lg.gw), h: L(lg.gh) };
          if (myndHamark > 0 && hd.golf && hd.golf.width) {
            try {
              for (const [hl, gaedi] of [[1600, 0.72], [1200, 0.62], [900, 0.55]]) {
                const sk = Math.min(1, hl / Math.max(hd.golf.width, hd.golf.height)), c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(hd.golf.width * sk)); c.height = Math.max(1, Math.round(hd.golf.height * sk));
                const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(hd.golf, 0, 0, c.width, c.height);
                const d = c.toDataURL('image/jpeg', gaedi);
                if (d.length <= myndHamark) { golf.mynd = d; break; }
              }
            } catch (e) { console.warn('[383] blenderSena gólfmynd', e); }
          }
          const y = M(P.y);
          const haed = { nr: lg.nr, nafn: hd.nafn || (lg.nr + 1) + '. hæð', 'hæð': y, veggH: 3.0, golf, veggir, gler, hurdir, taeki };
          if (hd.haedId) haed.haedId = hd.haedId;        // raunsaett.py skilar því aftur með vinnuskjali hæðarinnar
          const pg = raun && o.pdf && hd.haedId && o.pdf[hd.haedId];
          if (pg && hd.frumB > 0 && hd.frumH > 0 && hd.sk) {
            // hlutföll síðunnar → dílar frummyndar − skurður → heimur → metrar: sama leið og veggirnir (butur)
            const sk = hd.sk;
            const tilM = (fu, fv, an) => {
              const u = fu * hd.frumB - sk.x, v = fv * hd.frumH - sk.y;
              if (!an && !(u >= 0 && v >= 0 && u <= sk.w && v <= sk.h)) return null;
              return [X(u * f - gw2), Z(v * f - gh2)];
            };
            try { Object.assign(haed, raunAukagogn(pg, tilM, veggir, gler, hurdir, golf)); } catch (e) { console.warn('[383] Designer-3D herbergi', e); }
          }
          // SAMEIGN (446, fjölbýli — Agnar 08.10.2026): útlínur sameignar, stigar úr rasta (líka á skönnunum) og heiti
          if (snid && hd.sameign && o.sameign !== false && window.TeiknSameign) {
            try { Object.assign(haed, sameignIMetrum(hd.sameign, (px, py) => [X(px * f - gw2), Z(py * f - gh2)], v => L(v * f), haed)); } catch (e) { console.warn('[383] Designer-3D sameign', e); }
          }
          ut.push(haed);
          mork.x0 = Math.min(mork.x0, golf.x - golf.w / 2); mork.x1 = Math.max(mork.x1, golf.x + golf.w / 2);
          mork.z0 = Math.min(mork.z0, golf.z - golf.h / 2); mork.z1 = Math.max(mork.z1, golf.z + golf.h / 2); mork.y1 = Math.max(mork.y1, y + 3.0);
        });
        if (!ut.length) return null;
        const rnd = v => Math.round(v * 1000) / 1000;
        // Sjónarhorn: vélin eins og hún stendur (í gönguham: augun + það sem horft er á).
        const stefna = new T.Vector3(); vel.getWorldDirection(stefna);
        const markP = ganga ? vel.position.clone().addScaledVector(stefna, 10 * u0) : mid.clone();
        const vM = v => [M(v.x), M(v.y), M(v.z)];
        const sjonarhorn = { heiti: 'Sjónarhorn', stada: vM(vel.position), mid: vM(markP), fov: rnd(vel.fov), hlutfall: rnd(vel.aspect) };
        // Yfirlit: 3/4 loftmynd úr sömu átt og þrívíddin opnast í (θ = −0,6, φ = 0,95), allt sem sést í mynd.
        const cx = (mork.x0 + mork.x1) / 2, cz = (mork.z0 + mork.z1) / 2, cy = mork.y1 * 0.35;
        const rad = Math.hypot(mork.x1 - mork.x0, mork.z1 - mork.z0, mork.y1) / 2, fj = rad / Math.sin(40 / 2 * Math.PI / 180) * 1.05;
        const th0 = -0.6, ph0 = 0.95;
        const yfirlit = { heiti: 'Yfirlit', stada: [rnd(cx + fj * Math.sin(ph0) * Math.sin(th0)), rnd(cy + fj * Math.cos(ph0)), rnd(cz + fj * Math.sin(ph0) * Math.cos(th0))], mid: [rnd(cx), rnd(cy), rnd(cz)], fov: 40, hlutfall: 16 / 9, passa: true };
        // Sól úr vestsuðvestri (blaðið: vinstri, örlítið niður) í 40° — skuggarnir falla frá henni til hægri svo þeir sjáist
        // úr báðum vélum, eins og í gráu Blender-myndinni af Fiskislóð (blender_v2).
        const sena = { utgafa: 1, einingar: 'm', haedir: ut, myndavelar: [sjonarhorn, yfirlit], sol: { att: [-0.94, 0.34], haed: 40 } };
        if (raun) {
          sena.utlit = 'raunsaett';
          const syn = lag.filter(lg => lg.hopur.visible);
          // SNEIÐMYND (Agnar 08.10.2026: „heildstæð rendering á svona mörgum hæðum með gegnsærri framhlið"): 3+ hæðir
          // staflast í réttri hæð með opna framhlið (blender/raunsaett.py). 1–2 hæðir halda sprengdu myndinni.
          if (snid) sena.snid = snid;
          // vinnumynd hverrar sýnilegrar hæðar (08.10.2026: líka í fjölhæða-beiðni — eitt vinnuskjal á hverja hæð): S =
          // staðbundin hnit hæðarinnar → metrar senunnar, eins og ein hæð áður. Ein hæð: líka sena.vinnumynd (eldri lesendur).
          const vmHaedar = lg => {
            const hd = lg.hd;
            lg.hopur.updateMatrixWorld(true);
            const S = Array.from(lg.hopur.matrixWorld.elements, (v, i) => +(i % 4 < 3 ? v / u0 : v).toPrecision(10));
            return {
              haedId: hd.haedId, nafn: hd.nafn || (lg.nr + 1) + '. hæð', S,
              kort: { f: +lg.f.toPrecision(10), gw: +lg.gw.toPrecision(10), gh: +lg.gh.toPrecision(10), sx: hd.sk.x, sy: hd.sk.y, sw: hd.sk.w, sh: hd.sk.h },
              veggH: +lg.veggH.toPrecision(8), sjalfg: +(lg.sjalfg || Math.max(lg.gw, lg.gh) * 0.004).toPrecision(8),
              frum: hd.frumB > 0 ? { b: hd.frumB, h: hd.frumH } : null
            };
          };
          const vms = syn.filter(lg => lg.hd.haedId && lg.hd.sk).map(vmHaedar);
          if (vms.length) sena.vinnumyndir = vms;
          if (syn.length === 1 && vms.length === 1) sena.vinnumynd = vms[0];
        }
        return sena;
      },
      loka() {
        lifir = false; cancelAnimationFrame(raf); window.removeEventListener('resize', staerd);
        window.removeEventListener('keydown', lykNidur, true); window.removeEventListener('keyup', lykUpp, true);
        losa.forEach(x => { try { x.dispose(); } catch (_) {} });
        try { teiknari.dispose(); teiknari.forceContextLoss && teiknari.forceContextLoss(); } catch (_) {}
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    };
    if (samOn) { try { synaSameign(true); } catch (e) { console.warn('[383] sameign 3D', e); } }
    return handfang;
  }

  /* ── RAUNSÆTT DESIGNER-3D: herbergi, gólflínur og stigar úr PDF-uppdrættinum (Agnar 07.10.2026) ──
   * blender/raunsaett.py (luna-bridge) setur staðlaðar innréttingar í herbergin eftir HEITI þeirra, málar línur á gólfið
   * og smíðar stiga. Allt valkvætt: án þessara gagna kemur myndin samt, bara án innréttinga, lína og stiga.
   * Viðmið í Python (pymupdf): teikning-greining/thrividd/raunsaett/greina_herbergi.py + greina_stiga.py → herbergi_1612.json.
   *   raunUrSidu    textalag + vigur síðunnar → herbergjaheiti (nafn með flatarmáli „… m²" rétt hjá, númer 0xxx ef það
   *                 stendur við), reitir dregnir utan um „umfelgun" og bein lárétt/lóðrétt strik — í HLUTFÖLLUM síðu (0–1)
   *   raunAukagogn  sömu gögn í metrum senunnar, sömu leið og veggirnir (dílar frummyndar − skurður → heimur → metrar);
   *                 stigar = ≥ 4 samsíða jafnlöng þrep (0,7–1,6 m, bil 0,20–0,34 m) inni í herbergi sem heitir stigi
   *   rymiRist      herbergi = flóðfylling milli veggja, glers og hurða á 0,1 m reitum (sama regla og blender/rymi.py) */
  function raunUrSidu(tc, ops, vp) {
    const vt = vp.transform, B = vp.width, H = vp.height, kv = Math.hypot(vt[0], vt[1]) || 1;
    const ap = (x, y) => [vt[0] * x + vt[2] * y + vt[4], vt[1] * x + vt[3] * y + vt[5]];
    // orð: miðja textans í hnitum síðunnar (pt, efra-vinstra horn) — líka snúinn texti (Fiskislóð: allur 90°)
    const ord = [];
    ((tc && tc.items) || []).forEach(it => {
      const t = String(it.str || '').replace(/\s+/g, ' ').trim(); if (!t) return;
      // grunnlína + hálf breidd eftir lesstefnu (m0, m1) + ~⅓ leturhæðar upp (m2, m3 = leturhæð á lengd)
      const m = it.transform || [1, 0, 0, 1, 0, 0], dl = Math.hypot(m[0], m[1]) || 1, fs = Math.hypot(m[2], m[3]) || 1, w = +it.width || 0;
      const p = ap(m[4] + m[0] / dl * w / 2 + m[2] * 0.32, m[5] + m[1] / dl * w / 2 + m[3] * 0.32);
      ord.push({ t, x: p[0], y: p[1], fs: fs * kv });
    });
    const FLAT = /^\d{1,5},\d{1,2}(\s*m[²2])?$/i, NR = /^0\d{3}$/, M2 = /^m[²2]$/i, STAF = /[A-Za-zÀ-ſ]{2,}/;
    const flat = [], nofn = [], nr = [], m2 = ord.filter(o => M2.test(o.t));
    ord.forEach(o => {
      let t = o.t, mm;
      if ((mm = t.match(/^(0\d{3})\s+(.+)$/))) { nr.push(Object.assign({}, o, { t: mm[1] })); t = mm[2]; }
      if ((mm = t.match(/^(.*?\S)\s+\d{1,5},\d{1,2}\s*m[²2]$/)) && STAF.test(mm[1])) { flat.push(o); nofn.push(Object.assign({}, o, { t: mm[1] })); return; }
      const f = t.match(FLAT);
      // flatarmál án „m²" í sama bút telst aðeins ef „m²" stendur rétt hjá (annars getur það verið málsetning)
      if (f) { if (f[1] || m2.some(q => Math.hypot(q.x - o.x, q.y - o.y) < o.fs * 4)) flat.push(o); }
      else if (NR.test(t)) nr.push(o);
      else if (STAF.test(t) && !M2.test(t)) nofn.push(Object.assign({}, o, { t }));
    });
    // næsti bútur í SÖMU leturstærð (±15 %) — tákn á teikningunni („LR", „VLR" við Dekkjaverkstæði og Föt á Fiskislóð)
    // eru í minna letri og eru ekki hluti af heiti herbergisins
    const naest = (o, listi, r) => { let b = null, bd = r; listi.forEach(q => { const d = Math.hypot(q.x - o.x, q.y - o.y); if (d <= bd && Math.abs(q.fs / o.fs - 1) < 0.15) { bd = d; b = q; } }); return b; };
    const hopar = new Map();      // flatarmál → nöfnin sem standa næst því (eitt herbergi)
    nofn.forEach(n => { const f = naest(n, flat, n.fs * 2.6); if (f) { if (!hopar.has(f)) hopar.set(f, []); hopar.get(f).push(n); } });
    const herbergi = [];
    hopar.forEach((nn, f) => {
      // tvítekinn texti (feitletrun með tveimur lögum) einu sinni; lesröð = fjærst flatarmálinu fyrst (það stendur neðst)
      nn = nn.filter((n, i) => !nn.slice(0, i).some(q => q.t === n.t && Math.abs(q.x - n.x) < 1 && Math.abs(q.y - n.y) < 1));
      nn.sort((a, b) => Math.hypot(b.x - f.x, b.y - f.y) - Math.hypot(a.x - f.x, a.y - f.y));
      const n0 = nn[0], numer = naest(n0, nr, n0.fs * 2.6);
      herbergi.push(Object.assign({ texti: nn.map(n => n.t).join(' ').slice(0, 60) }, numer ? { nr: numer.t } : {}, { u: n0.x / B, v: n0.y / H }));
    });
    // bein lárétt/lóðrétt strik (öll þykkt): reitir utan um „umfelgun" og stigaþrep
    const fl = ops && window.pdfjsLib ? flokkaPdfLinur(window.pdfjsLib.OPS, ops.fnArray, ops.argsArray, vt) : {};
    const lod = [], lar = [], linur = [];
    Object.keys(fl).forEach(k => fl[k].forEach(v => {
      const dx = Math.abs(v[2] - v[0]), dy = Math.abs(v[3] - v[1]), L = Math.hypot(dx, dy);
      if (dx < 0.3) lod.push([v[0], Math.min(v[1], v[3]), Math.max(v[1], v[3])]);
      else if (dy < 0.3) lar.push([v[1], Math.min(v[0], v[2]), Math.max(v[0], v[2])]);
      if ((dx < 1 || dy < 1) && L >= 4 && L <= 200) linur.push([v[0] / B, v[1] / H, v[2] / B, v[3] / H]);
    }));
    const golflinur = [];
    ord.forEach(o => {
      if (!/^umfelgun$/i.test(o.t)) return;
      const cx = o.x, cy = o.y;
      const vin = lod.filter(l => l[0] < cx && l[1] <= cy && cy <= l[2] && cx - l[0] < 60 && l[2] - l[1] > 40);
      const hae = lod.filter(l => l[0] > cx && l[1] <= cy && cy <= l[2] && l[0] - cx < 60 && l[2] - l[1] > 40);
      if (!vin.length || !hae.length) return;
      const xl = Math.max(...vin.map(l => l[0])), xr = Math.min(...hae.map(l => l[0]));
      const upp = lar.filter(l => l[0] < cy && l[1] <= xl + 0.5 && l[2] >= xr - 0.5 && cy - l[0] < 120);
      const nid = lar.filter(l => l[0] > cy && l[1] <= xl + 0.5 && l[2] >= xr - 0.5 && l[0] - cy < 120);
      if (!upp.length || !nid.length) return;
      const yt = Math.max(...upp.map(l => l[0])), yb = Math.min(...nid.map(l => l[0]));
      [[xl, yt, xr, yt], [xr, yt, xr, yb], [xr, yb, xl, yb], [xl, yb, xl, yt]].forEach(q => golflinur.push([q[0] / B, q[1] / H, q[2] / B, q[3] / H]));
    });
    return { herbergi, golflinur, linur };
  }
  // Herbergisflokkur úr heiti — sama röð og blender/rymi.py flokkur() (aðeins „stigi" er notaður hér)
  function flokkurHerb(texti) {
    const t = String(texti || '').toLowerCase().replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/ö/g, 'o').replace(/á/g, 'a')
      .replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ý/g, 'y');
    if (/stur/.test(t)) return 'sturta';
    if (/(^|[^a-z])(wc|vs|snyrt|salerni|klosett)/.test(t)) return 'salerni';
    if (/bunings|fatahe|fataher|(^|[^a-z])fot($|[^a-z])|skiptikl/.test(t)) return 'fot';
    if (/eldhus|kaffi|matsal|motuneyti|kaffist/.test(t)) return 'kaffi';
    if (/stigahus|stigi/.test(t)) return 'stigi';
    if (/vatnsud|urdakerfi|sprinkl/.test(t)) return 'udi';
    return '';
  }
  function rymiRist(veggir, gler, hurdir, golf, rs) {
    rs = rs || 0.1;
    const W = Math.max(1, golf.w), H = Math.max(1, golf.h), x0 = golf.x - W / 2 - 1, z0 = golf.z - H / 2 - 1;
    const nx = Math.ceil((W + 2) / rs), nz = Math.ceil((H + 2) / rs), lok = new Uint8Array(nx * nz);
    const rasta = (linur, minth) => linur.forEach(v => {
      const x1 = v[0], z1 = v[1], x2 = v[2], z2 = v[3], th = Math.max(minth, +v[4] || 0);
      const L = Math.hypot(x2 - x1, z2 - z1) || 1e-6, ux = (x2 - x1) / L, uz = (z2 - z1) / L, ext = th / 2;
      const i0 = Math.max(0, Math.trunc((Math.min(x1, x2) - th - x0) / rs) - 1), i1 = Math.min(nx, Math.trunc((Math.max(x1, x2) + th - x0) / rs) + 2);
      const j0 = Math.max(0, Math.trunc((Math.min(z1, z2) - th - z0) / rs) - 1), j1 = Math.min(nz, Math.trunc((Math.max(z1, z2) + th - z0) / rs) + 2);
      for (let j = j0; j < j1; j++) {
        const cz = z0 + (j + 0.5) * rs - z1;
        for (let i = i0; i < i1; i++) {
          const cx = x0 + (i + 0.5) * rs - x1, u = cx * ux + cz * uz, w = -cx * uz + cz * ux;
          if (Math.abs(w) <= th / 2 + rs * 0.55 && u >= -ext - rs * 0.5 && u <= L + ext + rs * 0.5) lok[j * nx + i] = 1;
        }
      }
    });
    rasta(veggir, 0); rasta(gler, 0.1); rasta(hurdir, 0);
    const reitur = (x, z) => { const i = Math.trunc((x - x0) / rs), j = Math.trunc((z - z0) / rs); return x >= x0 && z >= z0 && i < nx && j < nz ? j * nx + i : -1; };
    return {
      // reitir herbergisins sem (x, z) stendur í; lendi nafnið á vegg: næsti lausi reitur innan 0,6 m. null = lekur út / of stórt
      herbergi(x, z, hamark) {
        let p = reitur(x, z); if (p < 0) return null;
        if (lok[p]) {
          const r = Math.round(0.6 / rs), j = Math.floor(p / nx), i = p % nx; let b = -1, bd = Infinity;
          for (let jj = Math.max(0, j - r); jj <= Math.min(nz - 1, j + r); jj++) for (let ii = Math.max(0, i - r); ii <= Math.min(nx - 1, i + r); ii++) {
            const d = (jj - j) * (jj - j) + (ii - i) * (ii - i); if (!lok[jj * nx + ii] && d < bd) { bd = d; b = jj * nx + ii; }
          }
          if (b < 0) return null; p = b;
        }
        const m = new Uint8Array(nx * nz), st = [p]; m[p] = 1; let n = 1, jadar = false;
        while (st.length) {
          const q = st.pop(), i = q % nx, j = (q - i) / nx;
          if (i === 0 || j === 0 || i === nx - 1 || j === nz - 1) jadar = true;
          if (i > 0 && !lok[q - 1] && !m[q - 1]) { m[q - 1] = 1; n++; st.push(q - 1); }
          if (i < nx - 1 && !lok[q + 1] && !m[q + 1]) { m[q + 1] = 1; n++; st.push(q + 1); }
          if (j > 0 && !lok[q - nx] && !m[q - nx]) { m[q - nx] = 1; n++; st.push(q - nx); }
          if (j < nz - 1 && !lok[q + nx] && !m[q + nx]) { m[q + nx] = 1; n++; st.push(q + nx); }
        }
        if (jadar || n * rs * rs > (hamark || 900)) return null;
        return m;
      },
      inni(m, x, z) { const p = reitur(x, z); return p >= 0 && !!m[p]; },
      nx, nz, rs
    };
  }
  // Sameign hæðar (446, dílar skornu myndarinnar) → metrar senunnar fyrir blender/raunsaett.py: sameign = [{ teg, poly }],
  // sameignHeil (kjallarinn allur), stigar úr rasta (sama snið og PDF-stigarnir: miðlína a → b, breidd, threp) ef PDF gaf
  // enga, og heiti — PDF-heiti fá sameign-merki, greind stigahús/gangar/lyftur bætast við sem nöfn.
  function sameignIMetrum(sm, pm, Lm, haed) {
    const r3 = n => Math.round(n * 1000) / 1000, ut = {};
    const sv = (sm.heil && sm.heildarsvaedi ? [sm.heildarsvaedi] : []).concat(sm.svaedi || []);
    if (sv.length) ut.sameign = sv.map(v => ({ teg: v.teg, flatarmal: v.flatarmal, poly: v.poly.map(p => pm(p[0], p[1]).map(r3)) }));
    if (sm.heil) ut.sameignHeil = true;
    if (!(haed.stigar && haed.stigar.length)) {
      const st = (sm.stigar || []).filter(k => k.stadfest && !k.uti).map(k => {
        const cx = (k.x0 + k.x1) / 2, cy = (k.y0 + k.y1) / 2;
        const a = k.ass === 'x' ? pm(cx, k.y0) : pm(k.x0, cy), b = k.ass === 'x' ? pm(cx, k.y1) : pm(k.x1, cy);
        return { a: a.map(r3), b: b.map(r3), breidd: r3(Lm(k.ass === 'x' ? k.x1 - k.x0 : k.y1 - k.y0)), threp: k.n, uppruni: 'rasti' };
      });
      if (st.length) ut.stigar = st;
    }
    const herb = (haed.herbergi || []).map(r => Object.assign({}, r, { sameign: window.TeiknSameign.flokkur(r.texti).hopur === 'sameign' }));
    const HEITI = { stigahus: 'Stigahús', gangur: 'Gangur', anddyri: 'Anddyri', lyfta: 'Lyfta' };
    (sm.svaedi || []).forEach(v => { if (HEITI[v.teg] && !v.kassi) { const p = pm(v.x, v.y); herb.push({ texti: HEITI[v.teg], x: r3(p[0]), z: r3(p[1]), sameign: true, flatarmal: v.flatarmal, uppruni: 'greining' }); } });
    if (herb.length) ut.herbergi = herb;
    return ut;
  }
  function raunAukagogn(pg, tilM, veggir, gler, hurdir, golf) {
    // tilM(u, v[, an]): hlutföll síðu → [x, z] metrar senunnar; null utan skurðar hæðarinnar (nema an = án athugunar)
    const r3 = n => Math.round(n * 1000) / 1000, ut = {};
    const herbergi = [];
    (pg.herbergi || []).forEach(r => { const p = tilM(r.u, r.v); if (p) herbergi.push(Object.assign({ texti: r.texti }, r.nr ? { nr: r.nr } : {}, { x: r3(p[0]), z: r3(p[1]) })); });
    if (herbergi.length) ut.herbergi = herbergi;
    const golflinur = [];
    (pg.golflinur || []).forEach(l => {
      if (!tilM((l[0] + l[2]) / 2, (l[1] + l[3]) / 2)) return;
      const a = tilM(l[0], l[1], true), b = tilM(l[2], l[3], true);
      golflinur.push([r3(a[0]), r3(a[1]), r3(b[0]), r3(b[1])]);
    });
    if (golflinur.length) ut.golflinur = golflinur;
    // stigar (greina_stiga.py): þrepalínur lárétt eða lóðrétt, 0,7–1,6 m, báðir endar inni í stigaherberginu
    const stigaHerb = herbergi.filter(r => flokkurHerb(r.texti) === 'stigi');
    if (stigaHerb.length && (pg.linur || []).length && veggir.length) {
      const VM = 0.24, R = rymiRist(veggir.map(v => [v[0], v[1], v[2], v[3], Math.max(VM, +v[4] || 0)]), gler, hurdir.map(v => [v[0], v[1], v[2], v[3], Math.max(VM, +v[4] || 0)]), golf);
      const linurM = pg.linur.map(l => { const a = tilM(l[0], l[1], true), b = tilM(l[2], l[3], true); return [a[0], a[1], b[0], b[1]]; });
      const stigar = [];
      stigaHerb.forEach(r => {
        const m = R.herbergi(r.x, r.z); if (!m) return;
        ['x', 'z'].forEach(ax => {
          const hop = new Map();
          linurM.forEach(([x1, z1, x2, z2]) => {
            const L = Math.hypot(x2 - x1, z2 - z1);
            if (!(L >= 0.7 && L <= 1.6)) return;
            if (ax === 'x' ? Math.abs(z1 - z2) > 0.02 : Math.abs(x1 - x2) > 0.02) return;
            if (!(R.inni(m, x1 + (x2 - x1) * 0.1, z1 + (z2 - z1) * 0.1) && R.inni(m, x2 - (x2 - x1) * 0.1, z2 - (z2 - z1) * 0.1))) return;
            const q = ax === 'x' ? [r3(z1), Math.min(x1, x2), Math.max(x1, x2)] : [r3(x1), Math.min(z1, z2), Math.max(z1, z2)];
            hop.set(q.join('|'), q);
          });
          const ql = [...hop.values()].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]), hh = [];
          ql.forEach(q => {
            const H_ = hh.find(g => { const s = g[g.length - 1]; return Math.abs(s[1] - q[1]) < 0.06 && Math.abs(s[2] - q[2]) < 0.06 && q[0] - s[0] >= 0.2 && q[0] - s[0] <= 0.34; });
            if (H_) H_.push(q); else hh.push([q]);
          });
          hh.filter(g => g.length >= 4).forEach(g => {
            const s0 = g.reduce((s, q) => s + q[1], 0) / g.length, s1 = g.reduce((s, q) => s + q[2], 0) / g.length, mid = (s0 + s1) / 2;
            const a = ax === 'x' ? [mid, g[0][0]] : [g[0][0], mid], b = ax === 'x' ? [mid, g[g.length - 1][0]] : [g[g.length - 1][0], mid];
            stigar.push({ a: a.map(r3), b: b.map(r3), breidd: r3(s1 - s0), threp: g.length });
          });
        });
      });
      if (stigar.length) ut.stigar = stigar;
    }
    return ut;
  }

  window.Teikn3D = { syna: syna3d, kassarUrGrimu, heilirVeggir, husRammi, greiningarkvardi, eldveggjaLinur, reiknaEld, klippaButa, festaAVegg, raun: { urSidu: raunUrSidu, aukagogn: raunAukagogn, rist: rymiRist, flokkur: flokkurHerb } };

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
  const STILLINGAR = ['skurdur', 'sjalf', 'thett', 'syn', 'veggir', 'pdfVeggir', 'pdfFlokkar', 'eldVal'];
  let _sjalfvistBid = 0;
  function vistaSjalfkrafa(astaeda) {
    clearTimeout(_sjalfvistBid);
    _sjalfvistBid = setTimeout(async () => {
      try {
        const FP = FPx(), cid = FP && FP.companyId;
        if (!cid || !modalSynnilegt() || G.rodKomin !== cid || !window.DB || !DB.sb) { console.info('[383] sjálfvistun sleppt (' + (astaeda || '') + '): röð þjónsins ekki komin eða glugginn lokaður'); return; }
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
        const uppf = new Date().toISOString();
        const u = await DB.sb.from('teikning_bord').update({ haedir: nyjar, updated_at: uppf }).eq('company_id', cid).select('company_id');
        if (u.error || !u.data || !u.data.length) throw new Error((u.error && u.error.message) || 'ekkert skrifað');
        // 375 þarf að vita að ÞESSI vafri skrifaði röðina — annars teldi næsta merkjavistun að önnur vél hefði gert það.
        try { if (window.TeiknVistun && TeiknVistun.sja) TeiknVistun.sja(cid, uppf, nyjar); } catch (_) {}
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
        leidrett: n.leidrett || g.leidrett,
        eldVal: n.eldVal || g.eldVal,
        syn: n.syn || g.syn,
        pdfFlokkar: n.pdfFlokkar || g.pdfFlokkar,
        skurdur: n.skurdur || g.skurdur,
        sjalf: n.sjalf != null ? n.sjalf : g.sjalf,
        thett: n.thett || g.thett,
        pdfReynt: g.pdfReynt,
        stimpilStaerd: n.stimpilStaerd || g.stimpilStaerd,
        // vinnumynd (445): sú nýrri gildir — hún gæti verið nýsmíðuð hér og ekki enn komin á þjóninn
        vinnumynd: (g.vinnumynd && (!n.vinnumynd || String(g.vinnumynd.t || '') > String(n.vinnumynd.t || ''))) ? g.vinnumynd : n.vinnumynd
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
  // VIGURVEGGIR HÆÐAR SEM ER EKKI VIRK (Agnar 06.10.2026, Fiskislóð 2. hæð í 3D: „the walls are a bit meshed up").
  // Sjálfvirki PDF-lesturinn (lesaPdfVeggi) keyrir aðeins á VIRKU hæðinni og aldrei þegar útlitið er fest — „Útlit fest"
  // á 1. hæð gildir um allt húsið, svo 2. hæð fékk aldrei vigurveggi og 3D greindi veggina úr myndinni (stigar og
  // innréttingar urðu að veggjum). Hér eru veggirnir lesnir úr vigrinum fyrir hvaða hæð sem er, sömu reglur og þar.
  async function pdfVeggirHaedar(h, fb, fh) {
    const slod = pdfSlod(h); if (!slod || !(fb > 0) || !(fh > 0)) return null;
    await saekjaPdfJs();
    const r = await fetch(slod); if (!r.ok) return null;
    const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await r.arrayBuffer()) }).promise;
    const sida = await doc.getPage(1), vp = sida.getViewport({ scale: 1 }), ol = await sida.getOperatorList();
    const fl = flokkaPdfLinur(window.pdfjsLib.OPS, ol.fnArray, ol.argsArray, vp.transform), val = veljaVeggjaflokk(fl, vp.width, vp.height);
    const kx = fb / vp.width, ky = fh / vp.height;
    if (!val.valinn || Math.abs(kx / ky - 1) > 0.02) return null;
    const linur = (fl[val.valinn] || []).map(v => [Math.round(v[0] * kx), Math.round(v[1] * ky), Math.round(v[2] * kx), Math.round(v[3] * ky)]);
    return linur.length > 30 ? { linur, flokkur: val.valinn } : null;
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

  // SKORIÐ AÐ HÚSINU eftir veggjanetinu (husRammi). sjalfkrafa = einu sinni eftir fyrstu opnun (þéttir lausan sjálfskurð);
  // annars takkinn „Að húsinu". Kassinn er víkkaður svo öll merki sem þegar eru til lendi innan hans — sjálfvirkni má
  // aldrei fela staðsetningu. `thett` segir að þéttingin hafi verið reynd, svo hún er ekki endurtekin við hverja opnun.
  function skeraAdHusi(sjalfkrafa) {
    const h = virkHaed(); if (!h || !G.frum) return false;
    const iw = G.frum.naturalWidth || G.frum.width, ih = G.frum.naturalHeight || G.frum.height;
    if (h.pdfVeggir.length > 30) {
      // Vigur-PDF: veggirnir eru þegar þekktir — þétti skurðurinn sem fyrir er.
      h.sjalf = true; delete h.thett;
      const ok = thetturSkurdur(h, iw, ih);
      if (ok) vistaSjalfkrafa('skorið að húsinu'); else if (!sjalfkrafa) segja('Fann ekki húsið í vigurlínunum — dragðu kassann sjálfur með ✂ Skera.');
      return ok;
    }
    let hus = null;
    try { hus = husRammi(G.frum); } catch (e) { console.warn('[383] husRammi', e); }
    if (!hus) {
      if (sjalfkrafa) { h.thett = true; vistaSjalfkrafa('húsleit reynd'); }
      else segja('Fann ekki veggjanet hússins á blaðinu — dragðu kassann sjálfur með ✂ Skera.');
      return false;
    }
    let x0 = hus.x, y0 = hus.y, x1 = hus.x + hus.w, y1 = hus.y + hus.h;
    const sp = Math.max(iw, ih) * 0.012;
    plan().markers.forEach(m => { if (erPx(m)) { const mx = m.x + G.rymi.x, my = m.y + G.rymi.y; x0 = Math.min(x0, mx - sp); y0 = Math.min(y0, my - sp); x1 = Math.max(x1, mx + sp); y1 = Math.max(y1, my + sp); } });
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(iw, x1); y1 = Math.min(ih, y1);
    const nw = x1 - x0, nh = y1 - y0, gamall = h.skurdur;
    h.thett = true;
    if (sjalfkrafa && gamall && nw * nh > gamall.w * gamall.h * 0.92) { vistaSjalfkrafa('húsleit reynd'); return false; }
    // Sjálfvirk þétting sem skilur eftir innan við fimmtung af fyrri skurði hefur líklega gripið einn klasa af mörgum
    // (álma, annað hús á blaðinu) — þá er ekki skorið sjálfkrafa; takkinn „Að húsinu" stendur til boða.
    if (sjalfkrafa && gamall && nw * nh < gamall.w * gamall.h * 0.2) { vistaSjalfkrafa('húsleit reynd'); return false; }
    h.skurdur = { x: Math.round(x0), y: Math.round(y0), w: Math.round(nw), h: Math.round(nh) }; h.sjalf = true; zNullstilla();
    vistaSjalfkrafa('skorið að húsinu');
    return true;
  }
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
        if (h.image_url) { h.skurdur = null; h.veggir = []; h.pdfVeggir = []; delete h.veggjaLinur; delete h.eldVal; delete h.pdfFlokkar; delete h.sjalf; G.pdf = null; }
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
    // ÞÉTTING EFTIR VEGGJANETINU (05.10.2026): blekleitin hér að ofan tekur nafnreit og skýringar með þegar þær standa
    // þétt við húsið (Arnarhvoll). Skönnuð hæð með sjálfvirkan skurð er því skorin EINU SINNI að veggjanetinu — þung
    // greining, þess vegna eftir fyrstu teikningu en ekki í henni. Handvalinn skurður og fest útlit eru ósnert.
    if (!val.fest && h.sjalf !== false && !h.thett && !pdfSlod(h) && !h.pdfVeggir.length && G.husReynt !== G.frum) {
      G.husReynt = G.frum; const mynd = G.frum, hid = h.id;
      setTimeout(() => {
        try { if (G.frum === mynd && virkHaed() && virkHaed().id === hid && !lesaVal(FPx().companyId).fest && modalSynnilegt() && skeraAdHusi(true)) beita(); }
        catch (e) { console.warn('[383] húsleit', e); }
      }, 250);
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
    stika(skilabod); flipar(); hnappar(); merkiUtiStika();
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

  /* ── MERKI UTAN TEIKNINGAR ──
   * Merki sem lendir utan myndarinnar (utan skurðar, eða utan blaðsins eftir gamla stærðargallann í símanum) sést hvergi:
   * ekki í 2D, og í 3D sveif það við hlið hússins (Agnar 05.10.2026: „Tækin eru fyrir utan húsið"). Rétti staðurinn verður
   * ekki reiknaður til baka — hliðrunin réðst af því hvar striginn stóð á skjánum — svo hér er ekki giskað: stikan segir
   * hve mörg þau eru og „Sækja inn" leggur þau í efra hornið með gulum hring, þaðan sem þau eru dregin á sinn stað.
   * Hringurinn (m.uti, frummyndarhnit hornsins) fer um leið og merkið er fært. Ekkert vistast fyrr en ýtt er á Vista. */
  function merkiUtan() {
    const st = G.stig1; if (!st) return [];
    const iw = st.naturalWidth || st.width, ih = st.naturalHeight || st.height;
    return (plan().markers || []).filter(m => m && erPx(m) && (m.x < 0 || m.y < 0 || m.x > iw || m.y > ih));
  }
  function saekjaMerkiInn() {
    const st = G.stig1, ut = merkiUtan(); if (!st || !ut.length) return;
    const iw = st.naturalWidth || st.width, ih = st.naturalHeight || st.height, bil = Math.max(40, Math.min(iw, ih) * 0.07), d = Math.max(1, Math.floor((iw - bil) / bil));
    ut.forEach((m, i) => { m.x = Math.round(bil * (0.8 + (i % d))); m.y = Math.round(bil * (0.8 + Math.floor(i / d))); m.uti = [m.x + G.rymi.x, m.y + G.rymi.y]; });
    try { FPx()._renderCanvas(); FPx()._renderPanel(); } catch (_) {}
    merkiUtiStika();
    segja('⚠ ' + ut.length + ' merki sótt inn í efra hornið — dragðu hvert á sinn stað, það vistast þegar þú sleppir.');
  }
  function merkiUtiStika() {
    const main = fpEl('fp-main'); if (!main) return;
    let s = main.querySelector('#fp-merki-uti');
    const ut = G.hamur ? [] : merkiUtan(), bida = (plan().markers || []).filter(m => m && m.uti).length;
    const html = ut.length ? '<span>⚠ ' + ut.length + ' merki ' + (ut.length === 1 ? 'er' : 'eru') + ' utan teikningar</span><button type="button" data-a="inn" style="' + TK + ';' + GULL + '" title="Leggur merkin í efra hornið svo hægt sé að draga þau á sinn stað">Sækja inn</button>'
      : (bida ? '<span>⚠ ' + bida + ' merki ' + (bida === 1 ? 'bíður' : 'bíða') + ' í horninu — dragðu ' + (bida === 1 ? 'það' : 'þau') + ' á sinn stað</span>' : '');
    if (!s) {
      if (!html) return;
      s = document.createElement('div'); s.id = 'fp-merki-uti';
      s.style.cssText = 'position:absolute;left:50%;transform:translateX(-50%);top:54px;z-index:7;display:none;align-items:center;gap:8px;max-width:calc(100% - 20px);' +
        'padding:7px 10px;border-radius:10px;background:rgba(20,18,15,.92);color:#ffd27a;font:600 12.5px system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.45)';
      main.appendChild(s);
      s.addEventListener('click', e => { if (!e.target.closest('[data-a="inn"]')) return; e.stopPropagation(); saekjaMerkiInn(); });
    }
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
        esc(h.nafn || (i + 1) + '. hæð') + ' <span style="opacity:.65;font-weight:500">' + (i === G.virk ? plan().markers.length : h.markers.length) + '</span>' +
        // „· sjálfvirkt" (08.10.2026): sjálfvirka verkferlið vistaði veggina og enginn hefur skoðað þá — Agnar sér hvað er eftir.
        (h.leidrett ? (h.leidrett.af === 'sjalfvirkt'
          ? ' <span title="Veggir úr sjálfvirka verkferlinu — ekki enn skoðaðir. Opnaðu í TurboPaint og „Vista í úttekt" þegar þeir eru réttir." style="opacity:.8;font-weight:600;font-size:.85em">· sjálfvirkt</span>'
          : ' <span title="Veggir leiðréttir í TurboPaint — sjálfvirk greining skrifar ekki yfir þá" style="opacity:.8;font-weight:600;font-size:.85em">· leiðrétt</span>') : '') + '</button>').join('') +
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
      G.hamur, JSON.stringify(h.veggir), h.pdfVeggir.length + ':' + (h.pdfFlokkar || []).join(','), eldveggjaLinur(h).map(v => v.e + ':' + v.p.slice(0, 2).join(',')).join(';'), JSON.stringify(G.kedja), JSON.stringify(G.bendill), JSON.stringify(G.drag), mr.width, mr.height, stimpil, takn, ei,
      (plan().markers || []).filter(m => m && m.uti).map(m => Math.round(m.x) + ':' + Math.round(m.y)).join(','),
      SAM.syn ? 's' + (sameignHaedar(h.id) ? 1 : 0) + (SAM.hus ? SAM.hus.lykill.length : 0) : ''].join('|');
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
    // SAMEIGN (446): íbúðir deyfðar, sameign og stigar gulleit — undir veggjum, merkjum og stimplum
    if (SAM.syn && window.TeiknSameign) {
      const sr = sameignHaedar(h.id);
      if (sr) { try { TeiknSameign.teikna(x, sr, (px, py) => [sx(px + G.rymi.x), sy(py + G.rymi.y)], [[ox, oy], [ox + cr.width, oy], [ox + cr.width, oy + cr.height], [ox, oy + cr.height]]); } catch (e) { console.warn('[383] sameign 2D', e); } }
    }
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
    // Eldveggir úr TurboPaint (veggjaLinur[].eld): EI-60 rauður, EI-30 ljósrauður — hálfgegnsæir svo teikningin sjáist.
    const eldL = eldveggjaLinur(h);
    if (eldL.length) {
      x.save(); x.globalAlpha = 0.72; x.lineCap = 'butt'; x.lineJoin = 'miter';
      eldL.forEach(v => {
        x.strokeStyle = v.e === 60 ? '#d32f2f' : '#ef5350'; x.lineWidth = Math.max(3, v.t * k);
        x.beginPath();
        for (let i = 0; i + 1 < v.p.length; i += 2) { const px = sx(v.p[i]), py = sy(v.p[i + 1]); if (i) x.lineTo(px, py); else x.moveTo(px, py); }
        x.stroke();
      });
      x.restore();
    }
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
    // Merki sem „Sækja inn" lagði í hornið: gulur brotinn hringur þar til það hefur verið fært.
    let faert = false;
    (plan().markers || []).forEach(m => {
      if (!m || !m.uti) return;
      if (Math.abs(m.x + G.rymi.x - m.uti[0]) > 2 || Math.abs(m.y + G.rymi.y - m.uti[1]) > 2) { delete m.uti; faert = true; return; }
      x.strokeStyle = '#f59e0b'; x.lineWidth = 3; x.setLineDash([7, 5]); x.beginPath(); x.arc(ox + m.x * k, oy + m.y * k, 30, 0, 6.3); x.stroke(); x.setLineDash([]);
    });
    if (faert) setTimeout(merkiUtiStika, 0);
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
  const Z = { s: 1, x: 0, y: 0, sjalf: true, gs: 1 };
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
    // Prósentan miðast við grunnstöðuna (síma: smækkuð í svæðið undir flipunum) — „Passa" sýnir 100 %
    const m = document.getElementById('fp-zoom-pct'); if (m) m.textContent = Math.round(Z.s / (Z.gs || 1) * 100) + '%';
  }
  function zThysja(f, cx, cy) {
    const main = fpEl('fp-main'); if (!main) return;
    const r = main.getBoundingClientRect(), zk = zKv(main);
    const mx = (cx == null ? r.width / 2 : cx - r.left) / zk, my = (cy == null ? r.height / 2 : cy - r.top) / zk;
    const ns = Math.min(12, Math.max(0.2, Z.s * f));
    Z.x = mx - (mx - Z.x) * (ns / Z.s); Z.y = my - (my - Z.y) * (ns / Z.s); Z.s = ns; Z.sjalf = false; zBeita();
  }
  /* Grunnstaða teikningarinnar. SÍMI: í svæðinu MILLI flipalínunnar + þysjunarinnar efst og sýnarvalsins neðst
   * (442 TeiknSimastjorn.rymi) — lifandi prófun 07.10.2026: hæðaflipar huldu horn teikningarinnar. Strigi FloorPlan
   * fyllir #fp-main (newfeatures/floorplanfix), svo hann er smækkaður og færður hér með sömu umbreytingu og þysjunin;
   * merkin, yfirlagið og smellir fylgja henni þegar. Tölva: óbreytt (1, 0, 0). */
  function zGrunnur() {
    const S = window.TeiknSimastjorn, main = fpEl('fp-main'), c = fpEl('fp-canvas');
    const ry = S && S.rymi && main ? S.rymi(main) : null;
    if (!ry || !c || !(ry.efst || ry.nedst)) return { s: 1, x: 0, y: 0 };
    const W = main.clientWidth, H = main.clientHeight, cw = c.offsetWidth, ch = c.offsetHeight;
    if (cw < 2 || ch < 2 || W < 2) return { s: 1, x: 0, y: 0 };
    const h0 = Math.max(10, H - ry.efst - ry.nedst), s = Math.min(1, (W - 10) / cw, h0 / ch);
    // offsetLeft/Top = staða strigans án umbreytingar (flex-miðjaður í #fp-main)
    return { s, x: (W - cw * s) / 2 - c.offsetLeft, y: ry.efst + (h0 - ch * s) / 2 - c.offsetTop };
  }
  // Z.sjalf = teikningin er í grunnstöðu (enginn hefur þysjað/fært) — þá fylgir hún rýminu (flipar koma inn, snúningur).
  function zNullstilla() { const g = zGrunnur(); Z.s = g.s; Z.x = g.x; Z.y = g.y; Z.gs = g.s; Z.sjalf = true; zBeita(); }
  function zFylgjaRymi() {
    if (!Z.sjalf || document.getElementById('fp-3d')) return;
    const g = zGrunnur();
    if (Math.abs(g.s - Z.s) > 0.002 || Math.abs(g.x - Z.x) > 0.5 || Math.abs(g.y - Z.y) > 0.5) { Z.s = g.s; Z.x = g.x; Z.y = g.y; Z.gs = g.s; zBeita(); }
  }
  // Vinnumyndin (445) liggur yfir 2D-striganum: hjól og „fara að merki" eiga þá við hana.
  const vinnumyndSynd = () => !!(window.TeiknVinnumynd && TeiknVinnumynd.synd && TeiknVinnumynd.synd());
  function zFaraAd(imgX, imgY) {
    if (vinnumyndSynd() && TeiknVinnumynd.faraAd) { TeiknVinnumynd.faraAd(imgX, imgY); return; }
    const c = fpEl('fp-canvas'), main = fpEl('fp-main');
    if (!c || !main || imgX == null) return;
    const cw = c.offsetWidth || c.width, ch = c.offsetHeight || c.height;
    if (cw < 2 || ch < 2) return;
    const mx = ((imgX > 1 || imgY > 1) ? imgX : imgX * c.width) - G.rymi.x;
    const my = ((imgX > 1 || imgY > 1) ? imgY : imgY * c.height) - G.rymi.y;
    const px = mx * (cw / c.width), py = my * (ch / c.height);
    if (Z.s < 1.6) Z.s = 1.8;
    Z.sjalf = false;
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
    main.addEventListener('wheel', e => { if (document.getElementById('fp-3d') || vinnumyndSynd()) return; e.stopPropagation(); e.preventDefault(); zThysja(e.deltaY < 0 ? 1.15 : 0.87, e.clientX, e.clientY); }, { capture: true, passive: false });
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
        if (midja) { const zk = zKv(main); Z.x += (mx - midja[0]) / zk; Z.y += (my - midja[1]) / zk; Z.sjalf = false; zBeita(); }
        klipa = fj; midja = [mx, my]; hreyft = 99;
      } else if (G.hamur !== 'skera') {
        hreyft += Math.abs(dx) + Math.abs(dy);
        if (hreyft > 6) { const zk = zKv(main); Z.x += dx / zk; Z.y += dy / zk; Z.sjalf = false; zBeita(); main.style.cursor = 'grabbing'; }
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
  // Veggir SKÖNNUNAR sem heilir bútar [ax,ay,bx,by,t] í dílum myndarinnar sem hreinsa() fékk (skurðurinn eða blaðið allt).
  // Sama leið fyrir 3D (undirbua) og húsleitina (husRammi). null = ekkert veggjanet fannst.
  function veggirUrMynd(r, fb, fh, talning, anKlasa) {
    let butar = null;
    const kpt = Math.max(fb, fh) / 2384, deila = V => V.map(v => v.map(n => n / r.kvardi));
    const ipt = V => V.map(v => ({ a: [v[0] / kpt, v[1] / kpt], b: [v[2] / kpt, v[3] / kpt], t: v[4] / kpt }));
    // 1) þykkir fylltir veggir úr grímunni
    let thykk = null;
    const kostir = r.thykkir && r.thykkir !== r.veggir ? [r.thykkir, r.veggir] : [r.veggir];
    for (const gr of kostir) {
      try { thykk = heilirUrGrimu(gr, r.W, r.H, r.kvardi, fb, fh); } catch (e) { console.warn('[383] heilirUrGrimu', e); }
      if (thykk) break;
    }
    // 2) línubönd (útveggir teiknaðir sem nokkrar örþunnar línur) — það sem þykka gríman á ekki þegar
    let grunnur = thykk || [];
    try { grunnur = grunnur.concat(deila(linubond(r.gra, r.W, r.H, r.kvardi, kpt)).filter(v => !grunnur.some(u => aSomuLinu(v, u)))); } catch (e) { console.warn('[383] linubond', e); }
    // 3) holir veggir (tvær mjóar línur). Sá sem er útlína veggjar sem þegar er kominn, eða gluggi í honum, er ekki talinn aftur.
    let hol = [];
    try { hol = deila(holirVeggir(r.gra, r.W, r.H, r.kvardi, kpt)); } catch (e) { console.warn('[383] holirVeggir', e); }
    if (hol.length && grunnur.length) {
      let gl0 = [];
      try { gl0 = glerIBilum(grunnur, r.gra, r.W, r.H, r.kvardi, kpt); } catch (_) {}
      const fyrir = grunnur.concat(gl0);
      hol = hol.filter(v => !fyrir.some(u => aSomuLinu(v, u)));
    }
    const allir = grunnur.concat(hol);
    talning.thykkir = thykk ? thykk.length : 0; talning.bond = grunnur.length - talning.thykkir; talning.holir = hol.length;
    let lengd = 0;
    for (const v of allir) lengd += Math.hypot(v[2] - v[0], v[3] - v[1]);
    if (lengd * r.kvardi >= Math.max(r.W, r.H) * 2) {
      butar = fragaVeggi(ipt(allir), kpt, 2);
      // 4) hver veggur nær alla línuna þar til hún endar eða rekst á annan vegg
      talning.fyrirLengingu = butar.length;
      try { butar = fragaVeggi(ipt(lengjaVeggi(butar, r.gra, r.W, r.H, r.kvardi)), kpt, 2); } catch (e) { console.warn('[383] lengjaVeggi', e); }
      // 5) aðeins húsið sjálft — nafnreitur, norðurör og lóðartákn eru stakir klasar utan við veggjanetið
      const fyrirKlasa = butar.length;
      if (!anKlasa) try { butar = husklasi(butar, 30 * kpt, 115 * kpt, 115 * kpt); } catch (e) { console.warn('[383] husklasi', e); }
      talning.utanHuss = fyrirKlasa - butar.length;
      talning.veggir = butar.length;
    }
    return butar;
  }

  // KVARÐI 3D-GREININGARINNAR — fastur eftir stærð BLAÐSINS (allt blaðið ≈ 2800 dílar), óháður skurði og gæðavali.
  // Mælt 05.10.2026 á viðmiðunarhúsunum: Miðgarður og Álfaborg gefa sömu veggi við 0,48 og þau gáfu áður við 0,52–0,59
  // (sem réðst af skurðinum), Arnarhvoll er hreinn við 0,42–0,48 en fer í rugl við 0,68 og ofar. Að mæla veggþykktina
  // og stilla eftir henni var reynt og reyndist óstöðugt (Arnarhvoll: 13–16 dílar eftir því hvernig skorið var).
  const VIDMID_3D = 2200, BLAD_3D = 2800;
  function greiningarkvardi(fb, fh) { return Math.min(1, (window.Teikn3D && Teikn3D.profKvardi) || BLAD_3D / Math.max(fb, fh, 1)); }   // profKvardi: aðeins prófanir

  /** HÚSIÐ á blaðinu eftir VEGGJANETINU (sama greining og 3D): umgjörð veggjanna sem hanga saman + ~1,5 m spássía.
   * finnaHus/blekRammi mæla blek og taka nafnreit og skýringar með þegar þær standa þétt við húsið (Arnarhvoll,
   * Agnar 05.10.2026: „næ ekki að losna við teikningaupplýsingaruglið á hægri hliðinni"). Skilar { x, y, w, h } í dílum
   * myndarinnar eða null ef ekkert veggjanet finnst. */
  function husRammi(mynd, kemb) {
    const iw = mynd.naturalWidth || mynd.width, ih = mynd.naturalHeight || mynd.height, kpt = Math.max(iw, ih) / 2384;
    const r = hreinsa(mynd, { kvardi: greiningarkvardi(iw, ih), vidmid: VIDMID_3D, anStriga: true });
    const butar = veggirUrMynd(r, iw, ih, {}, true);
    if (!butar || butar.length < 8) return null;
    // Klasar veggjanetsins, vegnir með FLATARMÁLI (lengd × þykkt): hús er úr þykkum veggjum, nafnreitur úr línum.
    const nr = klasaButa(butar, 30 * kpt), K = [];
    butar.forEach((v, i) => {
      const q = K[nr[i]] || (K[nr[i]] = { n: 0, lengd: 0, flat: 0, x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity, i: [] });
      const l = Math.hypot(v[2] - v[0], v[3] - v[1]);
      q.n++; q.lengd += l; q.flat += l * Math.max(1, v[4] || 0); q.i.push(i);
      q.x0 = Math.min(q.x0, v[0], v[2]); q.y0 = Math.min(q.y0, v[1], v[3]); q.x1 = Math.max(q.x1, v[0], v[2]); q.y1 = Math.max(q.y1, v[1], v[3]);
    });
    const adal = K.reduce((a, q) => (!a || q.flat > a.flat ? q : a), null);
    adal.med = true;
    // Álma: drjúgur klasi (≥ fimmtungur aðalklasans) sem stendur innan við ~4 m frá því sem þegar er með.
    const naerri = 115 * kpt, bil = (a, b) => Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1), Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1));
    for (let breytt = true; breytt;) { breytt = false; K.forEach(q => { if (!q.med && q.flat >= adal.flat * 0.2 && K.some(o => o.med && bil(o, q) <= naerri)) { q.med = true; breytt = true; } }); }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    K.forEach(q => { if (q.med) { x0 = Math.min(x0, q.x0); y0 = Math.min(y0, q.y0); x1 = Math.max(x1, q.x1); y1 = Math.max(y1, q.y1); } });
    const sp = 42 * kpt;
    x0 = Math.max(0, x0 - sp); y0 = Math.max(0, y0 - sp); x1 = Math.min(iw, x1 + sp); y1 = Math.min(ih, y1 + sp);
    const ut = { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0), veggir: butar.length };
    if (kemb) ut.klasar = K.map(q => ({ n: q.n, lengd: Math.round(q.lengd), flat: Math.round(q.flat), med: !!q.med, kassi: [q.x0, q.y0, q.x1, q.y1].map(Math.round) })).sort((a, b) => b.flat - a.flat).slice(0, 8);
    if (ut.w < iw * 0.08 || ut.h < ih * 0.08) return null;
    return ut;
  }

  /* ── ELDVEGGIR ÚR TURBOPAINT (Agnar 07.10.2026: „Eldveggur er veggur með tegund") ──
   * TurboPaint vistar eldvegg í veggjaLinur sem { p, t, tegund: 'veggur', eld: 60 | 30 } (eldri útgáfa þessa glugga sér
   * venjulegan vegg — ekkert hverfur) og les líka tegund 'ei60' / 'ei30'. Veggurinn ber flokkinn sjálfur: rauður í 2D og
   * 3D og brunahólfandi, eins og handval („Breyta eldveggjum" gengur samt fyrir — það er síðasta orð notandans hér). */
  function eldflokkurVeggs(v) {
    if (!v) return 0;
    if (v.tegund === 'ei60') return 60;
    if (v.tegund === 'ei30') return 30;
    const e = +v.eld;
    return (!v.tegund || v.tegund === 'veggur') && (e === 60 || e === 30) ? e : 0;
  }
  function eldveggjaLinur(h) {
    return Array.isArray(h && h.veggjaLinur)
      ? h.veggjaLinur.filter(v => v && Array.isArray(v.p) && v.p.length >= 4 && eldflokkurVeggs(v)).map(v => ({ p: v.p, t: Number(v.t) || 0, e: eldflokkurVeggs(v) }))
      : [];
  }

  function undirbua(h, stig1, merkiFrum, val, einingar, frum, eiHintar) {
    const fb = frum.naturalWidth || frum.width, fh = frum.naturalHeight || frum.height;
    const sk = h.skurdur || { x: 0, y: 0, w: fb, h: fh };
    // SKÖNNUN (hvorki vigurveggir né TurboPaint-veggir): greint í FÖSTUM kvarða eftir stærð blaðsins, óháð skurði og
    // gæðavali — annars breytist húsið í 3D við það eitt að skera þrengra eða velja „Full gæði" (Agnar 05.10.2026:
    // „3D er fucked á Arnarhóli" — þá var kvarðinn 1,0 í stað 0,45 og mállínur, húsgögn og hurðablöð urðu veggir).
    const skonnun = !h.pdfVeggir.length && !(Array.isArray(h.veggjaLinur) && h.veggjaLinur.some(v => v && Array.isArray(v.p) && v.p.length >= 4));
    const r = hreinsa(stig1, skonnun
      ? { thykkt: val.thykkt || 0, fylla: !!val.fylla, kvardi: greiningarkvardi(fb, fh), vidmid: VIDMID_3D, anStriga: true }
      : { thykkt: val.thykkt || 0, fylla: !!val.fylla, anStriga: true });
    // Veggir sem TurboPaint greindi (miðlína + þykkt, punktar frummyndar — „Vista í úttekt" þar) ganga fyrir:
    // TurboPaint er vélin, þessi gluggi sýnir niðurstöðuna (Agnar 03.10.2026). Þá eru veggirnir heilir — engin
    // „girðing" úr stökum PDF-strikum og engin sjálfvirk gríma.
    const tp = Array.isArray(h.veggjaLinur) ? h.veggjaLinur.filter(v => v && Array.isArray(v.p) && v.p.length >= 4) : [];
    // TEGUND (06.10.2026, áfangi 1: TurboPaint sem leiðréttingarbekkur): hver lína ber veggur / gler / hurð. Gler og
    // hurðir eru EKKI veggir í grímunni — þau fara beint í 3D sem glerfletir og hurðargöt, eins og notandinn merkti þau.
    const tpVeggir = tp.filter(v => !v.tegund || v.tegund === 'veggur' || v.tegund === 'ei60' || v.tegund === 'ei30');
    const tpGler = tp.filter(v => v.tegund === 'gler'), tpHurdir = tp.filter(v => v.tegund === 'hurd');
    // [ax, ay, bx, by, þykkt, eldflokkur?] — eldflokkurinn (60/30) fylgir aðeins eldveggjum TurboPaint
    const tpButar = listi => { const ut = []; listi.forEach(v => { const t = Number(v.t) || 0, e = eldflokkurVeggs(v); for (let i = 0; i + 3 < v.p.length; i += 2) ut.push(e ? [v.p[i], v.p[i + 1], v.p[i + 2], v.p[i + 3], t, e] : [v.p[i], v.p[i + 1], v.p[i + 2], v.p[i + 3], t]); }); return ut; };
    const veggir = r.thekja >= NOTHAEF_THEKJA && !h.pdfVeggir.length && !tp.length ? r.veggir : new Uint8Array(r.W * r.H);
    if (h.veggir.length || h.pdfVeggir.length || tp.length) {
      const c = document.createElement('canvas'); c.width = r.W; c.height = r.H;
      const x = c.getContext('2d'); x.strokeStyle = '#000'; x.lineCap = 'square'; x.lineWidth = Math.max(3, Math.round(r.W / 240));
      h.veggir.forEach(v => { x.beginPath(); x.moveTo((v[0] - sk.x) * r.kvardi, (v[1] - sk.y) * r.kvardi); x.lineTo((v[2] - sk.x) * r.kvardi, (v[3] - sk.y) * r.kvardi); x.stroke(); });
      if (tp.length) {
        x.lineJoin = 'miter';
        tpVeggir.forEach(v => {
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
      butar = tpButar(tpVeggir);
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
    const talning = { leid: tp.length ? 'turbopaint' : (butar ? 'pdf' : 'mynd'), veggir: butar ? butar.length : 0 };
    if (!butar) {
      butar = veggirUrMynd(r, fb, fh, talning);
      talning.kvardi = +r.kvardi.toFixed(3);
      if (butar) { urGrimu = true; h.veggir.forEach(v => butar.push([v[0] - sk.x, v[1] - sk.y, v[2] - sk.x, v[3] - sk.y, 0])); }
    }
    const iw = stig1.naturalWidth || stig1.width, ih = stig1.naturalHeight || stig1.height;
    const merkiOll = merkiFrum.map(mk => {
      const px = erPx(mk) ? mk.x - sk.x : mk.x * iw, py = erPx(mk) ? mk.y - sk.y : mk.y * ih;
      if (mk.kind === 'sign' || (typeof mk.unitId === 'string' && String(mk.unitId).indexOf('s:') === 0)) {
        const def = window.TeiknMerking && TeiknMerking.stimplar && TeiknMerking.stimplar.find(s => s.id === mk.sign);
        const txt = (def && (def.nafn || def.stutt)) || 'Merki';
        return { x: px, y: py, litur: mk.color || (def && def.litur) || '#c93c1d', texti: txt, gerd: gerdTaekis(null, mk.sign || 'skilti'), stimpill: mk.sign || 'skilti' };
      }
      // „Nýtt"-tæki (TurboPaint: tillaga sem bíður samþykkis eiganda, ekkert skráð tæki): hlutlaus indígó-miði
      // „Nýtt · <tegund>" — aldrei grænn (tengt) né rauður (komið fram yfir).
      if (mk.nytt === true || (typeof mk.unitId === 'string' && String(mk.unitId).indexOf('n:') === 0)) {
        return { x: px, y: py, litur: '#4f46e5', texti: 'Nýtt · ' + (mk.tegund || 'tæki'), gerd: gerdTaekis(mk.tegund), nytt: true };
      }
      const u = einingar.find(q => q.id === mk.unitId);
      // Á miðanum stendur TEGUNDIN (Léttvatn, Brunaslanga …) — Agnar 04.10.2026: „mjög flott … grænu pinnarnir sýndu
      // slökkvitæki eða brunaslöngur". Raðnúmerið sést í 2D-glugganum; það stendur hér aðeins ef tegund vantar.
      const radnr = u ? String(u.serial || '') : '';
      return { x: px, y: py, litur: u && u.status === 'overdue' ? '#c93c1d' : '#2f9e55', texti: u ? (u.type ? String(u.type) : radnr.slice(-6)) : '', gerd: gerdTaekis(u && u.type) };
    });
    // Merki sem lendir UTAN myndarinnar (utan skurðar eða utan blaðsins — gömul staðsetning úr síma með rangri stærð)
    // sveif í lausu lofti við hlið hússins (Agnar 05.10.2026: „Tækin eru fyrir utan húsið"). Þau eru ekki teiknuð í 3D;
    // skýringin segir hve mörg þau eru svo þau gleymist ekki.
    const merki = merkiOll.filter((m, i) => !(merkiFrum[i] && merkiFrum[i].uti) && m.x >= 0 && m.y >= 0 && m.x <= iw && m.y <= ih), merkiUti = merkiOll.length - merki.length;
    let golf;
    try { golf = golfMedUti(stig1, r.W, r.H); }
    catch (e) { console.warn('[383] golfMedUti', e); golf = r.vinnu; }
    // HÚSIÐ EITT (Agnar 07.10.2026: „ef þú getur gert þessa útgáfu eitthvað flottari"): á leiðréttri hæð ráða línur
    // TurboPaint útlínunum — veggir, hurðir og gler loka húsinu; flóðfylling utan frá gerir blaðið UTAN hússins gegnsætt,
    // svo húsið stendur eitt á bakgrunninum eins og á grunnmyndum. Leki flóðið inn (op í útvegg) helst blaðið eins og var.
    if (tp.length && golf && golf.getContext) {
      try {
        const W = r.W, H = r.H, kv = r.kvardi;
        const hc = document.createElement('canvas'); hc.width = W; hc.height = H;
        const hx = hc.getContext('2d', { willReadFrequently: true });
        hx.strokeStyle = '#000'; hx.lineCap = 'square'; hx.lineJoin = 'miter';
        let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
        tp.forEach(v => {
          hx.lineWidth = Math.max(3, (Number(v.t) || 0) * kv) + 4;
          hx.beginPath();
          for (let i = 0; i + 1 < v.p.length; i += 2) {
            const px = (v.p[i] - sk.x) * kv, py = (v.p[i + 1] - sk.y) * kv;
            if (i) hx.lineTo(px, py); else hx.moveTo(px, py);
            bx0 = Math.min(bx0, px); by0 = Math.min(by0, py); bx1 = Math.max(bx1, px); by1 = Math.max(by1, py);
          }
          hx.stroke();
        });
        const lok = hx.getImageData(0, 0, W, H).data, uti = new Uint8Array(W * H), st = new Int32Array(W * H);
        let top = 0;
        const yta = p => { if (!uti[p] && lok[p * 4 + 3] < 128) { uti[p] = 1; st[top++] = p; } };
        for (let x = 0; x < W; x++) { yta(x); yta((H - 1) * W + x); }
        for (let y = 0; y < H; y++) { yta(y * W); yta(y * W + W - 1); }
        while (top) { const p = st[--top], px = p % W, py = (p - px) / W; if (px > 0) yta(p - 1); if (px < W - 1) yta(p + 1); if (py > 0) yta(p - W); if (py < H - 1) yta(p + W); }
        let inni = 0; for (let i = 0; i < W * H; i++) if (!uti[i]) inni++;
        const kassi = Math.max(1, (bx1 - bx0) * (by1 - by0));
        if (inni > kassi * 0.5) {      // húsið lokað: að minnsta kosti helmingur útlínukassans er inni
          const gx = golf.getContext('2d', { willReadFrequently: true }), gdat = gx.getImageData(0, 0, W, H), gp = gdat.data;
          for (let i = 0; i < W * H; i++) if (uti[i]) gp[i * 4 + 3] = 0;
          gx.putImageData(gdat, 0, 0);
        }
      } catch (e) { console.warn('[383] hús úr línum', e); }
    }
    try {
      const gd = golf.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, r.W, r.H).data;
      for (let i = 0; i < r.W * r.H; i++) if (gd[i * 4 + 3] < 16) veggir[i] = 0;
      // Sama regla fyrir veggi úr grímu: það sem stendur allt UTAN húss (norðurör, lóðarmörk, nágrannahús) er ekki veggur.
      if (urGrimu && butar) {
        const inni = (x, y) => { const px = Math.round(x * r.kvardi), py = Math.round(y * r.kvardi); return px >= 0 && py >= 0 && px < r.W && py < r.H && gd[(py * r.W + px) * 4 + 3] >= 16; };
        // ÚTVEGGUR stendur á mörkunum: flóðfyllingin utan frá nær oft inn í sjálfan vegginn, svo miðlína hans telst „úti".
        // Veggur er því aðeins felldur ef ekkert er INNI heldur skammt til hliðar við hann (≈ 0,5 m hvoru megin).
        const hlid = 14 * (Math.max(fb, fh) / 2384);
        const sia = butar.filter(v => {
          const L = Math.hypot(v[2] - v[0], v[3] - v[1]) || 1, nx = -(v[3] - v[1]) / L, ny = (v[2] - v[0]) / L, d = (v[4] || 0) / 2 + hlid;
          return [0.2, 0.5, 0.8].some(q => [0, d, -d].some(o => inni(v[0] + (v[2] - v[0]) * q + nx * o, v[1] + (v[3] - v[1]) * q + ny * o)));
        });
        talning.utiSia = butar.length - sia.length;
        if (sia.length >= butar.length * 0.5) butar = sia;
      }
    } catch (_) {}
    let n = 0; for (let i = 0; i < veggir.length; i++) n += veggir[i];
    // LEIÐRÉTT Í TURBOPAINT (h.leidrett): merkt gler ræður eitt (engin sjálfvirk glerleit ofan á það sem notandinn
    // lagaði); merktar hurðir ráða þegar þær eru til, annars finnast hurðargötin sjálfkrafa. Óleiðrétt: hvort tveggja.
    const leidrett = !!(h.leidrett && tp.length);
    const merktGler = tpGler.length ? klippaButa(tpButar(tpGler), sk) : null;
    const merktarHurdir = tpHurdir.length ? klippaButa(tpButar(tpHurdir), sk) : null;
    let gler = null;
    if (leidrett) gler = merktGler || [];
    else {
      if (butar && r.gra) { try { gler = glerIBilum(butar, r.gra, r.W, r.H, r.kvardi, Math.max(fb, fh) / 2384); } catch (e) { console.warn('[383] glerIBilum', e); } }
      if (merktGler) gler = (gler || []).concat(merktGler);
    }
    let hurdir = null;
    if (butar) {
      const kE2 = Math.max(fb, fh) / 2384;
      let tengi = null;          // öll bil sem tengja veggi — líka þau sem fá ekki hurð (hurdagot, 08.10.2026)
      if (leidrett && merktarHurdir) hurdir = merktarHurdir;
      else {
        try {
          hurdir = hurdagot(butar, gler, kE2);
          if (hurdir) tengi = hurdir.tengi || null;
          if (hurdir && hurdir.uppruni) { talning.hurdSamlina = hurdir.uppruni.samlina; talning.hurdEnda = hurdir.uppruni.endi; talning.hurdFelldar = hurdir.uppruni.fellt; }
        } catch (e) { console.warn('[383] hurdagot', e); }
        if (merktarHurdir) { hurdir = (hurdir || []).concat(merktarHurdir); if (tengi) tengi = tengi.concat(merktarHurdir); }
      }
      // stakir veggir úti á gólfi (tengjast engu) falla — aðeins á skönnunum; vigurveggir eru nákvæmir fyrir.
      // Metið á ÖLLUM bilum (tengi), líka þeim sem fá ekki hurð — veggirnir eru þeir sömu og fyrir 08.10.2026.
      if (urGrimu) {
        try {
          const tengdir = tengdirVeggir(butar, gler, tengi || hurdir, kE2, 170 * kE2), fyrir = butar.length;
          butar = butar.filter((v, i) => tengdir[i]);
          talning.stakir = fyrir - butar.length;
        } catch (e) { console.warn('[383] tengdirVeggir', e); }
      }
    }
    // Eldflokkur veggja: EI-merkin + handval notandans (haedir[].eldVal) → eldveggir, brunahurðir, brunahólf.
    const uE = { butar, gler, hurdir, sk, frumB: fb, frumH: fh };
    try { reiknaEld(uE, eiHintar, h.eldVal); } catch (e) { console.warn('[383] reiknaEld', e); }
    const eld = uE.eld, hurdEld = uE.hurdEld, holf = uE.holf;
    if (eld) {
      talning.eiMerki = (eiHintar || []).length; talning.eldveggir = eld.reduce((s0, e) => s0 + (e ? 1 : 0), 0);
      talning.handval = uE.handval.reduce((s0, e) => s0 + (e >= 0 ? 1 : 0), 0);
    }
    if (holf) { talning.brunaholf = holf.fjoldi; talning.alyktadir = holf.alyktad.reduce((s0, e) => s0 + (e ? 1 : 0), 0); talning.utveggir = holf.ytri.reduce((s0, e) => s0 + (e ? 1 : 0), 0); }
    if (butar) {
      const mpx = (0.0254 / 72) * 100 / (Math.max(fb, fh) / 2384);   // metrar á díl EF blaðið er A1 í 1:100
      talning.veggir = butar.length; talning.gler = gler ? gler.length : 0; talning.hurdir = hurdir ? hurdir.length : 0;
      talning.metrar = Math.round(butar.reduce((s0, v) => s0 + Math.hypot(v[2] - v[0], v[3] - v[1]), 0) * mpx);
    }
    try { console.info('[383] 3D ' + (h.nafn || '') + ': ' + JSON.stringify(talning)); } catch (_) {}
    return { veggir, W: r.W, H: r.H, golf, kvardi: r.kvardi, merki, merkiUti, veggjaPx: butar ? butar.length : n, butar, gler, hurdir, hurdEld, eld, holf, eldSjalf: uE.eldSjalf, handval: uE.handval, eiHintar: eiHintar || [], talning, sk, frumB: fb, frumH: fh };
  }
  // EI-merki fyrir 3D: það sem teikningin geymir, annars TEXTALAG vigur-PDF-sins (ódýrt, engin myndgreining). Aðeins í
  // minni — ekkert er skrifað í teikninguna og 2D-glugginn sýnir merkin ekki (Agnar 03.10.2026: sú sýn býr í TurboPaint).
  const eiSkyndi = new Map();
  async function eiHintarFyrir3d(h, fb, fh) {
    if ((h.eiHintar || []).length) return h.eiHintar;
    const slod = pdfSlod(h);
    if (!slod || !window.TeiknEi || !TeiknEi.lesaUrPdf) return [];
    if (eiSkyndi.has(slod)) return eiSkyndi.get(slod);
    let ut = [];
    try {
      await saekjaPdfJs();
      const r = await fetch(slod);
      if (!r.ok) throw new Error('Svar ' + r.status);
      const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await r.arrayBuffer()) }).promise;
      const sida = await doc.getPage(1), vp = sida.getViewport({ scale: 1 });
      ut = (await TeiknEi.lesaUrPdf(sida, vp, fb / vp.width, fh / vp.height, { frum: { b: fb, h: fh } })) || [];
    } catch (e) { console.warn('[383] EI úr PDF', e); }
    eiSkyndi.set(slod, ut);
    return ut;
  }
  /* ── VINNUMYND (Agnar 07.10.2026) — sýnin sjálf býr í 445-teikning-vinnumynd.js ──
   * smidaVinnumynd: föst mynd EINNAR hæðar ofan frá, smíðuð EINU SINNI í huldum 3D-gámi utan skjás og lokuð strax:
   * gráa útlitið, engin tæki, merki né pinnar (merkiFrum = []), aðeins gólf, veggir, hurðir og gler. Sama leið og 3D
   * (undirbua → syna3d), svo myndin og lifandi þrívíddin sýna sama hús. */
  async function smidaVinnumynd(hid, o) {
    const FP = FPx(), hs = haedir(), h = hs.find(x => x && x.id === hid);
    if (!FP || !h || !h.image_url) throw new Error('hæðin á enga teikningu');
    const virk = hs[G.virk], tima = {}, t = () => performance.now();
    let t0 = t();
    let frum = virk && virk.id === h.id && G.frum && G.frum.complete !== false && (virk.image_url || null) === (h.image_url || null) ? G.frum : null;
    // blaðstærðin (vegghæð í metrum) er sótt samhliða myndinni og greiningunni
    const metrar = dilarAMetra(h, (h.frum && h.frum.b) || 0, (h.frum && h.frum.h) || 0);
    if (!frum) frum = await hladaMynd(h.image_url);
    tima.mynd = Math.round(t() - t0); t0 = t();
    const fb = frum.naturalWidth || frum.width, fh = frum.naturalHeight || frum.height;
    const stig1 = h.skurdur ? skera(frum, h.skurdur) : frum;
    const u = undirbua(h, stig1, [], lesaVal(FP.companyId), [], frum, []);
    if (!u.veggjaPx) throw new Error('engir veggir á hæðinni');
    tima.undirbua = Math.round(t() - t0); t0 = t();
    u.nafn = h.nafn; u.haedId = h.id;
    u.dilarAMetra = (await metrar) || await dilarAMetra(h, fb, fh);
    tima.metrar = Math.round(t() - t0); t0 = t();
    const gamur = document.createElement('div');
    gamur.style.cssText = 'position:fixed;left:-30000px;top:0;width:1200px;height:900px;pointer-events:none;opacity:0';
    document.body.appendChild(gamur);
    let syn = null;
    try {
      syn = await syna3d(gamur, { haedir: [u], utlit: 'gratt' });
      tima.svid = Math.round(t() - t0); t0 = t();
      const r = syn.fastMynd(o);
      if (!r) throw new Error('myndin teiknaðist ekki');
      tima.mynd3d = Math.round(t() - t0);
      r.frum = { b: fb, h: fh }; r.tima = tima;
      return r;
    } finally { try { if (syn) syn.loka(); } catch (_) {} gamur.remove(); }
  }
  // Veggir hæðarinnar fyrir smelli á vinnumyndina (445) — sömu og 3D fær: TurboPaint-veggir, annars PDF-strikin pöruð
  // (heilirVeggir), + handdregnir; klipptir við skurð MYNDARINNAR (sk = kort vistuðu myndarinnar, sem getur verið eldri
  // en skurður hæðarinnar) og í hnitum hennar. Ódýrt, ekkert WebGL. Skönnun án veggja → [] (aðeins gólf).
  function vinnuButar(h, sk) {
    const tp = Array.isArray(h && h.veggjaLinur) ? h.veggjaLinur.filter(v => v && Array.isArray(v.p) && v.p.length >= 4) : [];
    const fr = (h && h.frum) || {};
    let ut = [];
    tp.filter(v => !v.tegund || v.tegund === 'veggur' || v.tegund === 'ei60' || v.tegund === 'ei30').forEach(v => {
      const t = Number(v.t) || 0;
      for (let i = 0; i + 3 < v.p.length; i += 2) ut.push([v.p[i], v.p[i + 1], v.p[i + 2], v.p[i + 3], t]);
    });
    if (!ut.length && Array.isArray(h && h.pdfVeggir) && h.pdfVeggir.length > 30 && fr.b > 0 && fr.h > 0) {
      try { ut = heilirVeggir(h.pdfVeggir, fr.b, fr.h) || []; } catch (_) { ut = []; }
    }
    if (!ut.length) return [];
    (Array.isArray(h.veggir) ? h.veggir : []).forEach(v => ut.push([v[0], v[1], v[2], v[3], 0]));
    return klippaButa(ut, sk || h.skurdur || { x: 0, y: 0, w: fr.b || 1e9, h: fr.h || 1e9 });
  }
  /* ── DESIGNER-3D / BLENDER-MYND (Agnar 06.10.2026; „Raunsætt" 07.10.2026) ──
   * Senan sem sést (blenderSena, metrar) fer í automation_triggers (workflow 'blender', gogn = senan). Brúartölvan
   * (luna-bridge watcher.js, á mínútu fresti) tekur beiðnina, teiknar í Blender (Cycles) og hleður PNG í
   * turbopaint/blender/<félag>/<beiðni>-<mynd>.png; framvindan stendur í `result` meðan unnið er og að lokum JSON
   * { myndir: [{ heiti, url, hrein?, varpa?, upplausn? }], sek }. Yfirlagið spyr á 3 sek fresti (mest 20 mín).
   * TVÖ ÚTLIT (Agnar 07.10.2026, „Jubb" við „Á ég að bæta „Raunsætt" við Designer-3D-takkann?"):
   *   Raunsætt (sjálfgefið) — gogn.utlit = 'raunsaett' → blender/raunsaett.py: „Yfirlit" á ská og „Vinnuskjal" ofan frá
   *     með táknum appsins. Herbergjaheiti, umfelgunarreitir og stigar eru lesin úr PDF-uppdrættinum (raunUrSidu) svo
   *     innréttingarnar lendi í réttum herbergjum. Hreina vinnuskjalið (án tákna) má nota sem fasta vinnumynd (445).
   *   QA-stíll (08.10.2026, Agnar: QA Graphics-myndin) — gogn.utlit = 'qa' → blender/qa.py: sama smíði og raunsætt
   *     (herbergi, stigar, sameign úr sneiðmyndarleiðinni) en hvítir mattir veggir, ljóst gólf og rými lituð eftir heiti
   *     (gogn.qa_litir). Fleiri hæðir koma sprengdar. Hreina vinnuskjalið má líka nota sem vinnumynd.
   *   Einfalt — gamla gráa útlitið (blender/sena.py): sjónarhornið þitt og yfirlit.
   * Valið er útlitsval ÞESSA vafra (localStorage), ekki staða gagna. Hvort útlit á SÍNA síðustu mynd á þjóninum
   * (gogn->>utlit) og sína stöðu hér (BLU), svo verk í gangi týnist ekki þó skipt sé á milli eða 3D lokað og opnað.
   * Brunastál: stálplata með málmhaus og hnoðum, silfur- og grafíttakkar, engir bláir, engin emoji. */
  const BL_BIL = 3000, BL_HAMARK = 20 * 60000, BL_BRU_VIDVORUN = 2 * 60000;
  const BL_SILFUR = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)', BL_GRAFIT = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  const BL_MALMUR = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const blTakki = (bakgr, litur) => 'display:inline-flex!important;align-items:center;justify-content:center;height:32px!important;padding:0 14px!important;border-radius:8px!important;border:1px solid ' + (litur === '#fff' ? '#000' : 'rgba(20,24,34,.28)') + '!important;background:' + bakgr + '!important;color:' + litur + '!important;font:700 12.5px system-ui,sans-serif!important;text-decoration:none!important;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,' + (litur === '#fff' ? '.12' : '.85') + '),0 1px 2px rgba(0,0,0,.18)!important';
  const blHnod = h => '<span style="position:absolute;top:7px;' + h + ':7px;width:7px;height:7px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7)"></span>';
  const blTimi = ms => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const BL_UTLIT_LS = 'teikn_designer_utlit';
  const BL_UTLIT = {
    raunsaett: { heiti: 'Raunsætt', lysing: 'Yfirlit á ská og vinnuskjal ofan frá með táknum', timi: 'um 10 mín (2 myndir)', ekkert: 'Engin raunsæ mynd til af þessu húsi enn.' },
    qa: { heiti: 'QA-stíll', lysing: 'Hvítt og hreint, rými lituð eftir gerð', timi: 'um 5 mín á hæð', ekkert: 'Engin QA-mynd til af þessu húsi enn.' },
    einfalt: { heiti: 'Einfalt', lysing: 'Gráa útlitið: sjónarhornið þitt og yfirlit', timi: 'um 4 mín', ekkert: 'Engin einföld mynd til af þessu húsi enn.' }
  };
  const blUtlit = () => { try { const v = localStorage.getItem(BL_UTLIT_LS); return v === 'einfalt' || v === 'qa' ? v : 'raunsaett'; } catch (_) { return 'raunsaett'; } };
  const blMedHerbergjum = ul => ul === 'raunsaett' || ul === 'qa';   // lesa herbergi og stiga úr PDF, vinnuskjal ofan frá
  const BLU = {};          // útlit → staða síðustu / yfirstandandi myndar þess; G.blender = sú sem er sýnd
  const blLokid = B => !!B && (B.stada === 'done' || B.stada === 'error' || B.stada === 'timi' || B.stada === 'tomt');
  // hlutföll myndar: upplausnin sem Blender skilaði („1800x1290"), annars myndavél beiðninnar, annars 16:9
  const blHlutfall = (B, m) => { const u = String(m.upplausn || '').match(/^(\d+)x(\d+)$/); return Math.max(0.5, Math.min(3, u ? +u[1] / +u[2] : (B.hlutfoll && B.hlutfoll[m.heiti]) || 16 / 9)); };
  // Vörpun hæðarinnar sem vinnuskjalið m sýnir: ein hæð → B.vm; fjölhæða-beiðni (B.vms, 08.10.2026) → hæðin sem brúin
  // merkti myndina með (m.haedId; eldri brú: m.haed = heiti hæðar, eða „Vinnuskjal <heiti>").
  const blVmFyrir = (B, m) => {
    if (!B || !m) return null;
    const vms = Array.isArray(B.vms) ? B.vms : [];
    if (vms.length > 1 || (vms.length === 1 && !B.vm)) {
      const nafn = String(m.haed || String(m.heiti || '').replace(/^Vinnuskjal\s*/i, '')).trim();
      return vms.find(v => m.haedId && v.haedId === m.haedId) || vms.find(v => nafn && String(v.nafn || '').trim() === nafn) || null;
    }
    return B.vm || vms[0] || null;
  };
  const blMaVinnumynd = (B, m) => { const vi = blVmFyrir(B, m); return !!(B && blMedHerbergjum(B.utlit) && vi && vi.haedId && vi.lykill && m && m.hrein && Array.isArray(m.varpa) && m.varpa.length === 16 &&
    /^\d+x\d+$/.test(String(m.upplausn || '')) && window.TeiknVinnumynd && TeiknVinnumynd.festaMynd && FPx() && B.felag === FPx().companyId); };
  function blValHtml(ul) {
    return '<div role="radiogroup" aria-label="Útlit myndarinnar" style="flex:none;display:flex;border:1px solid #000;border-radius:9px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.25)">' +
      ['raunsaett', 'qa', 'einfalt'].map((k, i) => {
        const a = k === ul;
        return '<a data-bl="utlit" data-utlit="' + k + '" role="radio" aria-checked="' + a + '" tabindex="0" style="flex:1 1 0;display:flex!important;align-items:center;justify-content:center;height:30px!important;' + (i ? 'border-left:1px solid #000!important;' : '') +
          'background:' + (a ? BL_SILFUR : BL_GRAFIT) + '!important;color:' + (a ? '#11141c' : '#c9ced6') + '!important;font:700 12.5px system-ui,sans-serif!important;letter-spacing:.02em;text-decoration:none!important;cursor:' + (a ? 'default' : 'pointer') + ';' +
          'box-shadow:inset 0 1px 0 rgba(255,255,255,' + (a ? '.85' : '.1') + ')!important">' + BL_UTLIT[k].heiti + '</a>';
      }).join('') + '</div>' +
      '<div style="opacity:.75;line-height:1.35;margin-top:-3px">' + esc(BL_UTLIT[ul].lysing) + ' — ' + esc(BL_UTLIT[ul].timi) + ' á skrifstofutölvunni.</div>';
  }
  function blYfirlag(syna) {
    const gamur = document.getElementById('fp-3d'); if (!gamur) return null;
    let o = document.getElementById('fp-3d-bl');
    if (!o && syna) {
      o = document.createElement('div'); o.id = 'fp-3d-bl';
      // neðri brún ofan við sýnarvalið „Vinnumynd · 2D · 3D" (445, neðst til hægri) — tvær myndir náðu annars undir það
      o.style.cssText = 'position:absolute;right:10px;top:96px;z-index:6;width:360px;max-width:calc(100% - 20px);max-height:calc(100% - 156px);display:flex;flex-direction:column;' +
        'background:#e2e6ec;background-image:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%);' +
        'border:1px solid #000;border-radius:12px;box-shadow:0 18px 40px -14px rgba(0,0,0,.65),0 2px 6px rgba(0,0,0,.3);overflow:hidden;font:500 12.5px system-ui,sans-serif;color:#1f2530';
      o.innerHTML = '<div style="position:relative;flex:none;display:flex;align-items:center;gap:10px;padding:11px 22px 10px;background:' + BL_MALMUR + ';border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);color:#eef1f4">' +
        blHnod('left') + blHnod('right') +
        '<span style="font:700 17px \'Playfair Display\',Georgia,serif;letter-spacing:.01em">Designer-3D</span>' +
        '<span id="fp-3d-bl-timi" style="margin-left:auto;font:700 11px ui-monospace,Consolas,monospace;letter-spacing:.08em;color:#c9ced6"></span></div>' +
        '<div id="fp-3d-bl-meg" style="flex:1 1 auto;min-height:0;overflow:auto;padding:12px 14px 14px;display:flex;flex-direction:column;gap:10px"></div>';
      gamur.appendChild(o);
      o.addEventListener('click', e => {
        const t = e.target.closest('[data-bl]'); if (!t) return;
        const bl = t.dataset.bl, villa = err => { console.warn('[383] Designer-3D', err); };
        if (bl === 'loka') { if (G.blender) G.blender.opid = false; o.remove(); }
        else if (bl === 'aftur') blBidja(true, G.blender && G.blender.utlit).catch(villa);
        else if (bl === 'utlit') {
          const u = t.dataset.utlit;
          if (!BL_UTLIT[u] || (G.blender && G.blender.utlit === u)) return;
          try { localStorage.setItem(BL_UTLIT_LS, u); } catch (_) {}
          blBidja(false, u, true).catch(villa);
        } else if (bl === 'vinnumynd') blNotaVinnumynd(G.blender, +t.dataset.i).catch(villa);
      });
      // lyklaborð: Enter / bil á takka panelsins (Sækja er venjulegur hlekkur og sér um sig sjálfur)
      o.addEventListener('keydown', e => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const t = e.target.closest('[data-bl]'); if (!t || t.dataset.bl === 'saekja') return;
        e.preventDefault(); t.click();
      });
    }
    return o;
  }
  function blTeikna() {
    const B = G.blender; if (!B || !B.opid) return;
    const o = blYfirlag(true); if (!o) return;
    const meg = o.querySelector('#fp-3d-bl-meg'), klukka = o.querySelector('#fp-3d-bl-timi');
    const ul = BL_UTLIT[B.utlit] ? B.utlit : 'einfalt', U = BL_UTLIT[ul], lokid = blLokid(B);
    if (klukka) klukka.textContent = B.stada === 'tomt' || B.stada === 'saeki' ? '' : blTimi((B.lauk || Date.now()) - B.byrjad);
    let html = blValHtml(ul);
    if (B.stada === 'tomt') {
      html += '<div style="font-weight:600;line-height:1.35">' + esc(U.ekkert) + ' Ýttu á Teikna til að búa hana til.</div>';
    } else if (B.stada === 'saeki') {
      html += '<div style="font-weight:600;line-height:1.35">Sæki síðustu mynd…</div>';
    } else if (B.stada === 'done') {
      html += B.vistud
        ? '<div style="font-weight:600;line-height:1.35">Síðasta mynd — teiknuð ' + esc(blDags(B.vistud)) + '.</div>' +
          (B.urelt ? '<div style="padding:8px 10px;border-radius:8px;background:#fbeac6;border:1px solid #7a4f06;color:#5a3a04;font-weight:600;line-height:1.35">Teikningunni hefur verið breytt síðan. Ýttu á Teikna aftur til að fá nýja mynd.</div>' : '')
        : '<div style="font-weight:600">Tilbúið' + (B.sek ? ' — teiknað á ' + blTimi(B.sek * 1000) + ' mín' : '') + '.</div>';
      (B.myndir || []).forEach((m, i) => {
        const skra = 'blender-' + (B.felag || 'hus') + '-' + String(m.heiti || 'mynd').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').toLowerCase() + '.png';
        const vmS = (B.vmS || {})[i] || '', vinn = vmS === 'vinn';
        html += '<figure style="margin:0;display:flex;flex-direction:column;gap:6px">' +
          '<a href="' + esc(m.url) + '" target="_blank" rel="noopener" title="Opna í fullri stærð" style="display:block;line-height:0"><img src="' + esc(m.url) + '" alt="' + esc(m.heiti) + '" style="width:100%;aspect-ratio:' + blHlutfall(B, m).toFixed(3) + ';object-fit:contain;background:#cfd4db;border:1px solid #000;border-radius:7px"></a>' +
          '<figcaption style="display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px"><b style="font:700 12px ui-monospace,Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;color:#525b6b">' + esc(m.heiti) + '</b>' +
          '<span style="margin-left:auto;display:flex;gap:6px">' +
          (blMaVinnumynd(B, m) ? '<a data-bl="vinnumynd" data-i="' + i + '" role="button" tabindex="0" aria-disabled="' + vinn + '" title="Hreina myndin (án tákna) verður föst vinnumynd hæðarinnar — tækin eru teiknuð ofan á hana, eins og eftir Festa" style="' + blTakki(BL_GRAFIT, '#fff') + (vinn ? ';opacity:.6!important;pointer-events:none' : '') + '">' + (vinn ? 'Festi…' : vmS === 'fest' ? 'Orðin vinnumynd' : 'Nota sem vinnumynd') + '</a>' : '') +
          '<a data-bl="saekja" href="' + esc(m.url + (m.url.indexOf('?') < 0 ? '?' : '&') + 'download=' + encodeURIComponent(skra)) + '" download="' + esc(skra) + '" style="' + blTakki(BL_SILFUR, '#11141c') + '">Sækja</a></span></figcaption></figure>';
      });
    } else if (B.stada === 'error' || B.stada === 'timi') {
      html += '<div style="padding:9px 11px;border-radius:8px;background:#fde3e0;border:1px solid #b42318;color:#7a1610;font-weight:600;line-height:1.35">' +
        esc(B.stada === 'timi' ? 'Ekkert svar frá brúartölvunni í 20 mínútur. Reyndu aftur síðar.' : 'Myndin tókst ekki: ' + (B.texti || 'óþekkt villa')) + '</div>';
    } else {
      const pros = (String(B.texti || '').match(/(\d{1,3})\s*%/) || [])[1];
      const texti = B.stada === 'sendi' ? (B.texti || 'Sendi beiðni…') : B.stada === 'bida' ? 'Í biðröð — bíð eftir brúartölvunni…' : (B.texti || 'Brúartölvan er byrjuð…');
      html += '<div style="font-weight:600;line-height:1.35">' + esc(texti) + '</div>' +
        '<div style="height:7px;border-radius:4px;background:#c3c9d2;box-shadow:inset 0 1px 2px rgba(0,0,0,.25);overflow:hidden"><div style="height:100%;width:' + (pros ? Math.min(100, +pros) : B.stada === 'running' ? 8 : 3) + '%;background:linear-gradient(180deg,#e6c56f 0%,#b8902f 100%);transition:width .6s"></div></div>' +
        '<div style="opacity:.75;line-height:1.35">Óhætt að loka þessu; smelltu aftur á Designer-3D til að sjá stöðuna.</div>' +
        (B.stada === 'bida' && Date.now() - B.byrjad > BL_BRU_VIDVORUN ? '<div style="padding:8px 10px;border-radius:8px;background:#fbeac6;border:1px solid #7a4f06;color:#5a3a04;font-weight:600;line-height:1.35">Brúartölvan þarf að vera í gangi (skrifstofutölvan, luna-bridge). Beiðnin bíður þar til hún tekur við henni.</div>' : '');
    }
    html += '<div style="display:flex;justify-content:flex-end;gap:8px">' +
      (lokid ? '<a data-bl="aftur" role="button" tabindex="0" title="Senda nýja beiðni — ' + esc(U.heiti) + ', ' + esc(U.timi) + ' á skrifstofutölvunni" style="' + blTakki(BL_SILFUR, '#11141c') + '">' + (B.stada === 'tomt' ? 'Teikna' : 'Teikna aftur') + '</a>' : '') +
      '<a data-bl="loka" role="button" tabindex="0" style="' + blTakki(BL_GRAFIT, '#fff') + '">Loka</a></div>';
    if (meg && meg._html !== html) { meg.innerHTML = html; meg._html = html; }
    if (lokid && klukka && B.lauk && B.stada !== 'tomt') klukka.textContent = blTimi(B.lauk - B.byrjad);
  }
  async function blKanna(B) {
    B = B || G.blender;
    if (!B || !B.id || blLokid(B) || BLU[B.utlit] !== B) return;
    clearTimeout(B.timer);
    const syna = () => { if (G.blender === B) blTeikna(); };
    if (Date.now() - B.byrjad > BL_HAMARK) { B.stada = 'timi'; B.lauk = Date.now(); syna(); return; }
    try {
      const r = await DB.sb.from('automation_triggers').select('status,result').eq('id', B.id).limit(1);
      const row = r && r.data && r.data[0];
      if (BLU[B.utlit] !== B) return;
      if (row) {
        const st = row.status === 'pending' ? 'bida' : row.status;
        if (st === 'done') {
          const j = blLesa(row.result);
          if (j) { B.stada = 'done'; B.myndir = j.myndir; B.sek = j.sek; }
          else { B.stada = 'error'; B.texti = row.result || 'engin mynd kom til baka'; }
          B.lauk = Date.now();
        } else if (st === 'error' && /^Unknown workflow/i.test(String(row.result || '')) && Date.now() - (B.hafnad || (B.hafnad = Date.now())) < 3 * 60000) {
          // Brúartölva ÁN Blender-verksins (eldri luna-bridge, t.d. heimavélin) náði beiðninni á undan og hafnaði henni.
          // Skrifstofuvélin tekur slíka beiðni yfir á næsta mínútuhöggi (luna-bridge watcher.js, getHafnad) — beðið áfram.
          B.stada = 'bida'; B.texti = '';
        } else if (st === 'error') { B.stada = 'error'; B.texti = /^Unknown workflow/i.test(String(row.result || '')) ? 'engin brúartölva með Blender tók beiðnina — skrifstofutölvan þarf að vera í gangi' : row.result; B.lauk = Date.now(); }
        else { B.stada = st === 'running' ? 'running' : 'bida'; B.texti = st === 'running' ? row.result : ''; }
      }
    } catch (e) { console.warn('[383] Blender-staða', e); }
    syna();
    if (!blLokid(B)) B.timer = setTimeout(() => blKanna(B), BL_BIL);
  }
  const blDags = ms => { const d = new Date(ms), t = n => String(n).padStart(2, '0'); return t(d.getDate()) + '/' + t(d.getMonth() + 1) + '/' + d.getFullYear() + ' kl. ' + t(d.getHours()) + ':' + t(d.getMinutes()); };
  // SÍÐASTA MYND FÉLAGSINS Í ÞESSU ÚTLITI (Agnar 06.10.2026: „vista blender útgáfuna svo hún opnist fljótar eins og hún
  // var síðast, síðan bara láta endurteikna hana ef þess þarf"). Myndirnar liggja þegar í turbopaint/blender/<félag>/ og
  // slóðirnar í automation_triggers.result — smellur sýnir þá síðustu strax; „Teikna aftur" sendir nýja beiðni. Sé verk í
  // gangi fyrir félagið (líka úr öðrum vafra) er það sýnt í stað nýrrar beiðni. Eldri beiðnir (fyrir 07.10.2026) bera
  // ekkert gogn.utlit og eru Einfalt. vm = gogn.vinnumynd (aðeins það, ekki öll senan): vörpun fyrir „Nota sem vinnumynd".
  async function blSidasta(cid, ul) {
    let q = DB.sb.from('automation_triggers').select('id,status,result,requested_at,finished_at,vm:gogn->vinnumynd,vms:gogn->vinnumyndir')
      .eq('workflow', 'blender').eq('gogn->>company_id', String(cid));
    q = blMedHerbergjum(ul) ? q.eq('gogn->>utlit', ul) : q.or('gogn->>utlit.is.null,gogn->>utlit.not.in.(raunsaett,qa)');
    const r = await q.order('id', { ascending: false }).limit(6);
    if (!r || r.error) throw (r && r.error) || new Error('engin svör');   // brostinn lestur er EKKI „engin mynd til"
    return r.data || [];
  }
  const blLesa = t => { try { t = String(t || ''); const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); return j && Array.isArray(j.myndir) && j.myndir.length ? j : null; } catch (_) { return null; } };
  // Herbergi, gólflínur og strik PDF-uppdráttar hæðar (raunUrSidu) — einu sinni á hverja skrá í lotunni
  const raunSkyndi = new Map(), raunLokid = new Map();   // raunLokid: lesin textalög (samstillt — takkinn Sameign les þaðan)
  async function raunGognUrPdf(h) {
    const slod = pdfSlod(h); if (!slod) return null;
    if (!raunSkyndi.has(slod)) {
      raunSkyndi.set(slod, (async () => {
        await saekjaPdfJs();
        const r = await fetch(slod);
        if (!r.ok) throw new Error('Svar ' + r.status);
        const doc = await window.pdfjsLib.getDocument({ data: new Uint8Array(await r.arrayBuffer()) }).promise;
        const sida = await doc.getPage(1), vp = sida.getViewport({ scale: 1 });
        const [tc, ops] = await Promise.all([sida.getTextContent(), sida.getOperatorList()]);
        return raunUrSidu(tc, ops, vp);
      })());
    }
    try { const r = await raunSkyndi.get(slod); raunLokid.set(slod, r); return r; } catch (e) { raunSkyndi.delete(slod); throw e; }
  }
  async function blBidja(nytt, utlit, skipta) {
    const ul = BL_UTLIT[utlit] ? utlit : blUtlit(), cid0 = FPx() && FPx().companyId, B0 = BLU[ul];
    const synaB = B => {
      if (G.blender && G.blender !== B) G.blender.opid = false;
      G.blender = B; B.opid = true;
      const m = document.getElementById('fp-3d-bl-meg'); if (m) m._html = '';
      blTeikna();
    };
    // Verk þessa útlits í gangi fyrir félagið: sýna það aftur (og spyrja strax) í stað þess að senda aðra beiðni.
    if (B0 && B0.felag === cid0 && !blLokid(B0)) { synaB(B0); if (B0.id) { clearTimeout(B0.timer); B0.timer = setTimeout(() => blKanna(B0), 50); } return; }
    // Mynd þessa útlits og félags þegar sótt í þessari lotu: sýna hana aftur.
    if (!nytt && B0 && (B0.stada === 'done' || B0.stada === 'tomt') && B0.felag === cid0) { synaB(B0); return; }
    if (!nytt && cid0 && window.DB && DB.sb) {
      const Bs = BLU[ul] = { stada: 'saeki', utlit: ul, felag: cid0, byrjad: Date.now(), hlutfoll: {} };
      synaB(Bs);
      const taka = B => { BLU[ul] = B; if (G.blender === Bs) synaB(B); };
      try {
        const radir = await blSidasta(cid0, ul);
        if (BLU[ul] !== Bs) return;
        const iGangi = radir.find(x => x.status === 'bida' || x.status === 'pending' || x.status === 'running');
        if (iGangi) {
          const B = { id: iGangi.id, stada: 'bida', byrjad: Date.parse(iGangi.requested_at) || Date.now(), felag: cid0, utlit: ul, hlutfoll: {}, vm: iGangi.vm || null, vms: iGangi.vms || null };
          taka(B); B.timer = setTimeout(() => blKanna(B), 50); return;
        }
        for (const x of radir) {
          if (x.status !== 'done') continue;
          const j = blLesa(x.result); if (!j) continue;
          const lauk = Date.parse(x.finished_at) || Date.now();
          const B = { id: x.id, stada: 'done', myndir: j.myndir, sek: j.sek, byrjad: Date.parse(x.requested_at) || lauk, lauk, vistud: lauk, felag: cid0, utlit: ul, hlutfoll: {}, vm: x.vm || null, vms: x.vms || null };
          taka(B);
          try {
            const t = await DB.sb.from('teikning_bord').select('updated_at').eq('company_id', cid0).limit(1);
            if (!t || t.error) throw (t && t.error) || new Error('engin svör');
            const u = t && t.data && t.data[0] && Date.parse(t.data[0].updated_at);
            if (u && u > lauk + 60000 && BLU[ul] === B) { B.urelt = true; if (G.blender === B) { const o = document.getElementById('fp-3d-bl-meg'); if (o) o._html = ''; blTeikna(); } }
          } catch (_) {}
          return;
        }
        // Engin mynd í þessu útliti: skipti á milli útlita sendir EKKI beiðni sjálfkrafa (8 mín verk) — Teikna gerir það.
        if (skipta) { taka({ stada: 'tomt', utlit: ul, felag: cid0, byrjad: Date.now(), hlutfoll: {} }); return; }
      } catch (e) {
        // Náðist ekki að lesa fyrri myndir: EKKI senda nýja beiðni í blindni (gæti tvöfaldað 8 mín teikningu).
        console.warn('[383] Designer-3D síðasta mynd', e);
        if (BLU[ul] === Bs) taka({ stada: 'error', texti: 'náði ekki sambandi til að sækja síðustu mynd — reyndu aftur', byrjad: Date.now(), lauk: Date.now(), felag: cid0, utlit: ul });
        return;
      }
    }
    const FP = FPx();
    if (!G.syn3d || !G.syn3d.blenderSena) { segja('3D-sýnin er ekki tilbúin'); return; }
    if (!window.DB || !DB.sb) { segja('Engin tenging við gagnagrunninn'); return; }
    const B = BLU[ul] = { stada: 'sendi', utlit: ul, byrjad: Date.now(), felag: FP && FP.companyId, hlutfoll: {} };
    if (!G.blender || G.blender.utlit === ul || !G.blender.opid) synaB(B);
    const syna = () => { if (G.blender === B) blTeikna(); };
    const villa = t => { B.stada = 'error'; B.texti = t; B.lauk = Date.now(); syna(); };
    // Raunsætt og QA: herbergjaheiti, reitir og stigar úr PDF-uppdrætti hverrar sýnilegrar hæðar (án þeirra kemur myndin samt)
    let pdf = null;
    if (blMedHerbergjum(ul)) {
      pdf = {};
      B.texti = 'Les herbergi og stiga úr teikningunni…'; syna();
      for (const hid of (G.syn3d.synilegar ? G.syn3d.synilegar() : [])) {
        const h = (haedir() || []).find(x => x && x.id === hid);
        if (!h || !pdfSlod(h)) continue;
        try { const pg = await raunGognUrPdf(h); if (pg) pdf[hid] = pg; } catch (e) { console.warn('[383] Designer-3D: herbergi úr PDF', e); }
        if (BLU[ul] !== B) return;
      }
      B.texti = '';
      if (!G.syn3d || !G.syn3d.blenderSena) { villa('3D var lokað áður en beiðnin fór — opnaðu 3D og reyndu aftur'); return; }
    }
    // QA byggir senuna eins og raunsætt; snid fylgir alltaf svo sameign komi líka á 1–2 hæða húsum (qa.py hunsar snid sjálft)
    const raunO = p => Object.assign({ utlit: 'raunsaett', pdf: p }, ul === 'qa' ? { snid: 'snidmynd' } : {});
    let sena = G.syn3d.blenderSena(pdf ? raunO(pdf) : undefined);
    if (!sena) { villa('engin hæð sýnileg í 3D'); return; }
    // of stórt (sama þak og áður, 1,4 MB): án gólfmynda — raunsætt ber engar, þá án herbergja og stiga
    if (JSON.stringify(sena).length > 1400000) sena = G.syn3d.blenderSena(pdf ? raunO({}) : { myndHamark: 0 });
    if (ul === 'qa') { sena.utlit = 'qa'; sena.qa_litir = true; }
    // „Nota sem vinnumynd": lykill hæðarinnar (445) eins og hún er NÚNA — sé veggjum breytt síðar er myndin úrelt
    const lykillHaedar = hid => { const h = (haedir() || []).find(x => x && x.id === hid); return h && window.TeiknVinnumynd && TeiknVinnumynd.lykill ? TeiknVinnumynd.lykill(h) : ''; };
    if (sena.vinnumynd) {
      const lyk = lykillHaedar(sena.vinnumynd.haedId);
      if (lyk) sena.vinnumynd.lykill = lyk; else delete sena.vinnumynd;
    }
    // fjölhæða-beiðni: lykill á hverja hæð (08.10.2026 — „Nota sem vinnumynd" á vinnuskjali hverrar hæðar)
    if (Array.isArray(sena.vinnumyndir)) {
      sena.vinnumyndir = sena.vinnumyndir.filter(v => { const lyk = lykillHaedar(v.haedId); if (lyk) v.lykill = lyk; return !!lyk; });
      if (!sena.vinnumyndir.length) delete sena.vinnumyndir;
    }
    B.vm = sena.vinnumynd || null;
    B.vms = sena.vinnumyndir || null;
    // hlutföll myndanna (sama klemma og sena.py, 0,5–3) — myndareiturinn fær rétta stærð áður en myndin berst
    (sena.myndavelar || []).forEach(m => { B.hlutfoll[m.heiti] = Math.max(0.5, Math.min(3, +m.hlutfall || 16 / 9)); });
    const gogn = Object.assign({ company_id: FP && FP.companyId }, sena);
    const r = await DB.sb.from('automation_triggers').insert({ workflow: 'blender', status: 'bida', requested_by: 'teikning-3d', gogn }).select('id');
    if (BLU[ul] !== B) return;
    const id = r && r.data && r.data[0] && r.data[0].id;
    if (r.error || !id) { villa('beiðnin vistaðist ekki (' + ((r.error && r.error.message) || 'ekkert auðkenni') + ')'); return; }
    B.id = id; B.stada = 'bida'; syna();
    B.timer = setTimeout(() => blKanna(B), BL_BIL);
  }
  // „NOTA SEM VINNUMYND" (raunsætt vinnuskjal, ein hæð í beiðninni): hreina myndin + vörpun hennar verða föst vinnumynd
  // hæðarinnar í 445 — sama snið og Festa (haedir[].vinnumynd). cam = varpa (metrar senunnar → mynd, úr Blender) · S
  // (staðbundin hnit hæðarinnar → metrar, úr blenderSena), kortið eins og fastMynd skilar. Veggjum breytt síðan beiðnin
  // fór (lykillinn annar) → myndin er ekki notuð; þá þarf að teikna aftur.
  const blMarg4 = (a, b) => { const c = new Array(16); for (let k = 0; k < 4; k++) for (let r = 0; r < 4; r++) { let s = 0; for (let j = 0; j < 4; j++) s += a[j * 4 + r] * b[k * 4 + j]; c[k * 4 + r] = +s.toPrecision(10); } return c; };
  async function blNotaVinnumynd(B, i) {
    const m = B && B.myndir && B.myndir[i], vi = blVmFyrir(B, m), TV = window.TeiknVinnumynd;
    B.vmS = B.vmS || {};
    if (!m || !blMaVinnumynd(B, m) || B.vmS[i] === 'vinn') return;
    const h = (haedir() || []).find(x => x && x.id === vi.haedId);
    if (!h) { segja('Hæðin sem myndin sýnir er ekki í þessari teikningu'); return; }
    if (TV.lykill(h) !== vi.lykill) { segja('Veggjum, skurði eða teikningu ' + (vi.nafn ? '(' + vi.nafn + ') ' : '') + 'hefur verið breytt síðan myndin var teiknuð. Ýttu á Teikna aftur og notaðu nýju myndina.'); return; }
    const u = String(m.upplausn).match(/^(\d+)x(\d+)$/), W = +u[1], H = +u[2];
    B.vmS[i] = 'vinn'; B.vmStada = 'vinn'; if (G.blender === B) blTeikna();
    try {
      const img = await new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => rej(new Error('hreina myndin fannst ekki')); im.src = m.hrein; });
      const c = document.createElement('canvas'); c.width = W; c.height = H; c.getContext('2d').drawImage(img, 0, 0, W, H);
      // fjölhæða: 3D og spjaldið haldast opin svo hin vinnuskjölin megi líka festa
      const fleiri = Array.isArray(B.vms) && B.vms.length > 1;
      const ok = await TV.festaMynd(h.id, { strigi: c, cam: blMarg4(m.varpa, vi.S), heild: [W, H], rammi: [0, 0, W, H], b: W, h: H, kort: vi.kort, veggH: vi.veggH, sjalfg: vi.sjalfg, frum: vi.frum || null }, B.utlit === 'qa' ? 'qa' : 'raunsaett', fleiri ? { halda3d: true } : undefined);
      B.vmS[i] = ok ? 'fest' : ''; B.vmStada = B.vmS[i];
      if (ok && vi.nafn && B.vms && B.vms.length > 1) segja('Vinnuskjalið er orðið föst vinnumynd ' + vi.nafn + '.');
    } catch (e) { B.vmS[i] = ''; B.vmStada = ''; segja('Gat ekki notað myndina sem vinnumynd: ' + ((e && e.message) || e)); }
    if (G.blender === B) blTeikna();
  }
  // Klukkan í hausnum og biðviðvörunin hreyfast á milli fyrirspurna.
  setInterval(() => { const B = G.blender; if (B && B.opid && !blLokid(B) && document.getElementById('fp-3d')) blTeikna(); }, 1000);

  /* ── SAMEIGN Í FJÖLBÝLI (Agnar 08.10.2026) — greiningin sjálf býr í 446 (window.TeiknSameign) ──
   * „mörg húsfélögin með íbúðir í fjölbýli … tækin oftast bara í sameign sem er þá bara stigagangurinn upp og
   * kjallari ef slíkur er." Hér: myndir hæðanna sóttar (þær sem 3D hefur þegar eru endurnýttar), dílar á metra eins og
   * 3D (dilarAMetra, annars A1 1:100), heiti úr textalagi vigur-PDF (raunGognUrPdf) og TeiknSameign.greinaHus.
   * Niðurstaðan býr AÐEINS í minni (SAM) — ekkert vistað. Takkinn „Sameign" (2D, vinnumynd, 3D) sýnir hana.
   * Hæðir af sama blaði og skurði (dæmigerð hæð: „2.–4. hæð") eru greindar einu sinni. */
  const SAM = { syn: false, hus: null, bid: null };
  const samLykill = h => String((h && h.image_url) || '').replace(/^https?:\/\/[^/]+/i, '') + '|' + JSON.stringify((h && h.skurdur) || null);
  const samHusLykill = hs => (hs || []).filter(h => h && h.image_url).map(h => h.id + '=' + samLykill(h)).join(';');
  async function samDilar(h, fb, fh) {
    const sk = h.skurdur || { w: fb, h: fh };
    let d = 0; try { d = await dilarAMetra(h, fb, fh); } catch (_) {}
    if (d > 0 && sk.w / d >= 4 && sk.w / d <= 300) return d;
    return Math.max(fb, fh) / 841 * 10;          // A1 í 1:100 (sama forsenda og 3D án blaðstærðar)
  }
  // hlutir (valkvætt): [{ h, frum, stig1 }] úr 3D svo myndirnar sækist ekki aftur. Skilar SAM.hus.
  async function greinaSameign(hlutir, framvinda) {
    const TS = window.TeiknSameign; if (!TS) throw new Error('Sameignargreiningin (446) er ekki hlaðin');
    const hs = (haedir() || []).filter(h => h && h.image_url), lyk = samHusLykill(hs);
    if (SAM.hus && SAM.hus.lykill === lyk) return SAM.hus;
    if (SAM.bid && SAM.bid.lykill === lyk) return SAM.bid.p;
    const p = (async () => {
      const t0 = performance.now(), inn = [], afBladi = new Map();
      for (let i = 0; i < hs.length; i++) {
        const h = hs[i], kl = samLykill(h);
        if (framvinda) framvinda('Greini sameign — ' + (h.nafn || (i + 1) + '. hæð') + ' (' + (i + 1) + '/' + hs.length + ')…');
        let R = afBladi.get(kl), pxm = 0, textar = [];
        const til = (hlutir || []).find(x => x && x.h && x.h.id === h.id);
        let frum = til && til.frum, stig1 = til && til.stig1;
        if (!frum) {
          const virk = haedir()[G.virk];
          frum = virk && virk.id === h.id && G.frum && G.frum.complete !== false ? G.frum : await hladaMynd(h.image_url);
        }
        const fb = frum.naturalWidth || frum.width, fh = frum.naturalHeight || frum.height, sk = h.skurdur || { x: 0, y: 0, w: fb, h: fh };
        pxm = await samDilar(h, fb, fh);
        if (!R) {
          if (!stig1) stig1 = h.skurdur ? skera(frum, h.skurdur) : frum;
          R = TS.rasti(stig1, pxm);
          // 446 les blaðið aftur á öðrum kvarða ef grunnflötur þess stenst ekki hin blöðin (1:200-kjallari, smækkuð PDF)
          const mynd = stig1; R.endurRasti = p => TS.rasti(mynd, p);
          afBladi.set(kl, R);
        }
        // heiti úr textalagi vigur-PDF (Fiskislóð-leiðin): hlutföll síðu → dílar skornu myndarinnar
        if (pdfSlod(h)) {
          try {
            const pg = await raunGognUrPdf(h);
            (pg && pg.herbergi || []).forEach(r => { const x = r.u * fb - sk.x, y = r.v * fh - sk.y; if (x >= 0 && y >= 0 && x <= sk.w && y <= sk.h) textar.push(Object.assign({ texti: r.texti, x, y }, r.nr ? { nr: r.nr } : {})); });
          } catch (e) { console.warn('[383] sameign: textar', e); }
        }
        inn.push({ lykill: kl, pxmSrc: pxm, R, endurRasti: R.endurRasti, nafn: h.nafn || '', textar, hid: h.id, skx: sk.x || 0, sky: sk.y || 0 });
        await new Promise(r => setTimeout(r, 0));     // vafrinn andar á milli hæða
      }
      if (framvinda) framvinda('Greini sameign — stigar staðfestir milli hæða…');
      await new Promise(r => setTimeout(r, 0));
      // greinaHusBid: sama greining en vafrinn andar á milli þrepa (Asparfell / Þverholt: 15–25 s í einni lotu annars)
      const r = TS.greinaHusBid ? await TS.greinaHusBid(inn, t => { if (framvinda) framvinda(t); }) : TS.greinaHus(inn), haedirM = new Map();
      // pxm: leiðréttur kvarði blaðsins ef 446 las það aftur (kvardi), annars kvarði 3D
      inn.forEach((x, i) => haedirM.set(x.hid, Object.assign({}, r.haedir[i], { lykill: x.lykill, pxm: r.haedir[i].pxm || x.pxmSrc, skx: x.skx, sky: x.sky })));
      const fjolbyli = hs.length >= 3 || r.haedir.some(q => (q.herbergi || []).filter(t => t.hopur === 'ibud').length >= 2);
      const hus = { lykill: lyk, haedir: haedirM, hlidranir: r.hlidranir, blod: r.blod, fjolbyli, ms: Math.round(performance.now() - t0) };
      try { console.info('[383] sameign: ' + JSON.stringify({ ms: hus.ms, blod: r.blod, haedir: r.haedir.map((q, i) => (hs[i].nafn || i) + ': ' + q.talning.stigahus + ' stigah., ' + q.talning.gangar + ' gangar' + (q.heil ? ', allt' : '')) })); } catch (_) {}
      SAM.hus = hus;
      return hus;
    })();
    SAM.bid = { lykill: lyk, p };
    try { return await p; } finally { if (SAM.bid && SAM.bid.p === p) SAM.bid = null; }
  }
  // Niðurstaða hæðar (ef greind og hæðin óbreytt síðan)
  function sameignHaedar(hid) {
    const hus = SAM.hus; if (!hus) return null;
    const r = hus.haedir.get(hid), h = (haedir() || []).find(x => x && x.id === hid);
    return r && h && r.lykill === samLykill(h) ? r : null;
  }
  // Takkinn „Sameign" á aðeins við í fjölbýli (Agnar 08.10.2026: á atvinnuhúsnæði eins og Fiskislóð 1612 og Álfaborg 661
  // á hann ekki að trufla). Sést ef: sameignarsýnin er virk · greining liggur fyrir og fann sameign í fjölbýli · eða, meðan
  // ógreint, ≥ 2 hæðir og merki um fjölbýli: ≥ 3 hæðir, húsfélag í nafni, íbúð/sameign í hæðaheiti, eða ≥ 2 íbúðir í
  // textalagi PDF sem þegar hefur verið lesið (ekkert sótt hér).
  const SAM_NAFN = /h[úu]sf[ée]lag|h[úu]sf\.|fj[öo]lb[ýy]li/i;
  function samAvid() {
    if (SAM.syn) return true;
    const hs = (haedir() || []).filter(h => h && h.image_url);
    if (hs.length < 2) return false;
    const hus = SAM.hus && SAM.hus.lykill === samHusLykill(haedir()) ? SAM.hus : null;
    if (hus) return !!hus.fjolbyli && [...hus.haedir.values()].some(q => (q.svaedi || []).length || q.heil);
    if (hs.length >= 3) return true;
    const FP = FPx();
    if (SAM_NAFN.test(String((FP && FP.companyName) || ''))) return true;
    if (hs.some(h => /[íi]b[úu]ð|sameign|stigah/i.test(h.nafn || ''))) return true;
    const TS = window.TeiknSameign;
    return !!TS && hs.some(h => { const sl = pdfSlod(h), r = sl && raunLokid.get(sl); return !!r && (r.herbergi || []).filter(t => TS.flokkur(t.texti).hopur === 'ibud').length >= 2; });
  }
  function samTakki3d(b3) { b3 = b3 || document.getElementById('fp-3d-sameign'); if (!b3) return; if (samAvid()) b3.style.removeProperty('display'); else b3.style.setProperty('display', 'none', 'important'); }
  function samTeiknaAllt() {
    G.teiknad = '';
    try { yfirlag(); } catch (_) {}
    try { if (G.syn3d && G.syn3d.sameign) G.syn3d.sameign(SAM.syn); } catch (e) { console.warn('[383] sameign 3D', e); }
    const lit = b => { if (!b) return; b.setAttribute('aria-pressed', SAM.syn ? 'true' : 'false'); b.style.background = SAM.syn ? '#d9b45a' : ''; b.style.color = SAM.syn ? '#14120f' : ''; };
    lit(document.querySelector('#modal-floorplan .fp-sameign-btn'));
    const b3 = document.getElementById('fp-3d-sameign');
    if (b3) { b3.setAttribute('aria-pressed', SAM.syn ? 'true' : 'false'); b3.style.background = SAM.syn ? '#d9b45a' : 'rgba(20,18,15,.85)'; b3.style.color = SAM.syn ? '#14120f' : '#fff'; samTakki3d(b3); }
  }
  // Hógvær athugasemd (433 setjaTaeki): tæki sett UTAN sameignar í fjölbýli — aðeins ef sameignin hefur verið greind
  // („Sameign" eða 3D með 3+ hæðum), aldrei oftar en á 20 sek fresti, ekkert stöðvað. x, y = hnit ritilsins (skorin mynd).
  let samAthT = 0;
  function sameignAthuga(x, y) {
    if (!SAM.hus || !SAM.hus.fjolbyli || !window.TeiknSameign) return false;
    const h = virkHaed(), r = h && sameignHaedar(h.id);
    if (!r || (!(r.svaedi || []).length && !r.heil)) return false;
    if (TeiknSameign.iSameign(r, x, y, 0.8 * (r.pxm || 70))) return false;
    if (Date.now() - samAthT < 20000) return true;
    samAthT = Date.now();
    segja('Athugaðu: tækið er utan sameignar. Í fjölbýli eru tækin yfirleitt í stigagangi, göngum eða kjallara.');
    return true;
  }
  async function samSkipta() {
    if (SAM.syn) { SAM.syn = false; samTeiknaAllt(); return; }
    if (!(haedir() || []).some(h => h && h.image_url)) { segja('Sæktu teikningu fyrst.'); return; }
    SAM.syn = true; samTeiknaAllt();
    if (SAM.hus && SAM.hus.lykill === samHusLykill(haedir())) return;
    try {
      const hus = await greinaSameign(null, t => { try { const s = document.getElementById('fp-3d-skyr'); if (s) { s.style.display = ''; s.textContent = t; } } catch (_) {} });
      // 3D opið: niðurstaðan fer á hæðir 3D (sama auðkenni) svo yfirlagið þar teiknist
      if (G.syn3d && G.syn3d.setjaSameign) G.syn3d.setjaSameign(hid => sameignHaedar(hid));
      const allar = [...hus.haedir.values()], meðStiga = allar.filter(q => q.talning.stigahus > 0).length;
      segja(meðStiga ? 'Sameign: stigahús fannst á ' + meðStiga + ' af ' + allar.length + (allar.length === 1 ? ' hæð' : ' hæðum') + ' — íbúðir deyfðar.' : 'Fann ekkert stigahús á teikningunni — sameign óviss.' + (allar.some(q => q.heil) ? ' Kjallarinn er sýndur sem sameign.' : ''));
    } catch (e) { console.warn('[383] sameign', e); segja('Sameignargreining tókst ekki: ' + ((e && e.message) || e)); SAM.syn = false; }
    samTeiknaAllt();
  }


  /* ── FINNA ALLT HÚSIÐ (Agnar 08.10.2026: „Held kerfið lesi þær ekki inn. Bara hæðir og kjallara. Spurning að bæta því
   * inn og látið finna úr teikningum allt húsið") ──
   * Öll gildandi grunnmyndablöð staðarins (374 TeiknSaekja.finna, aðaluppdrættir fyrst) → hæðir: Kjallari, 1., 2. … Ris.
   *   · blað fyrir EINA hæð: skorið að húsinu (husRammar → stærsta grunnmyndin á blaðinu);
   *   · DÆMIGERÐ hæð („Grunnmynd 2.–7. hæð"): sama blað og sami skurður á allar hæðirnar sem það nær yfir;
   *   · SAMSETT blað („Grunnmynd 3. hæð, 4. hæð"): grunnmyndirnar fundnar á blaðinu og raðað í lesröð (efst → neðst,
   *     vinstri → hægri) á hæðirnar í hækkandi röð — finnist færri en hæðirnar er blaðið notað sem dæmigerð hæð.
   *     Röðin á blöðum er ekki alltaf eins (Vegamótastígur: neðri hæðir NEÐST), því sýnir tillagan hverja mynd.
   * Snið og útlit eru aldrei hæðir; nýju hæðirnar geyma þau sem viðmið (haedir[].snidBlod — hæðahæðir síðar).
   * TILLAGA: ekkert fer á hæðirnar fyrr en „Bæta X hæðum við", hæð sem er til (sama heiti, eða sama blað og skurður)
   * er aldrei snert, og ekkert vistast fyrr en ýtt er á Vista. */
  const fahLykill = nafn => {
    const t = String(nafn || '').toLowerCase();
    if (/kjall/.test(t)) return 'K';
    if (/(^|[^a-zþæöðáéíóúý])ris/.test(t)) return 'R';
    const m = t.match(/(\d+)\.?\s*h(æ|ae)ð/) || t.match(/^(\d+)/);
    return m ? String(+m[1]) : t;
  };
  const fahNafn = k => k === 'K' ? 'Kjallari' : k === 'R' ? 'Ris' : k + '. hæð';
  const fahRod = k => k === 'K' ? -1 : k === 'R' ? 999 : (isFinite(+k) ? +k : 500);
  const fahUrl = u => String(u || '').replace(/^https?:\/\/[^/]+/i, '');
  // Grunnmyndir á blaði: klasar veggjanetsins (husRammi kemb) — drjúgir klasar (≥ 25 % af þeim stærsta) sem standa
  // > ~4 m frá hver öðrum eru sér grunnmyndir. Lesröð: raðir efst → neðst, innan raðar vinstri → hægri.
  function husRammar(mynd) {
    const iw = mynd.naturalWidth || mynd.width, ih = mynd.naturalHeight || mynd.height, kpt = Math.max(iw, ih) / 2384;
    const hus = husRammi(mynd, true);
    if (!hus || !hus.klasar || !hus.klasar.length) return hus ? [{ x: hus.x, y: hus.y, w: hus.w, h: hus.h }] : [];
    const st = hus.klasar[0].flat, naer = 115 * kpt, sp = 42 * kpt;
    const stor = hus.klasar.filter(q => q.flat >= st * 0.25).map(q => ({ k: q.kassi.slice() }));
    const bil = (a, b) => Math.max(0, Math.max(a[0], b[0]) - Math.min(a[2], b[2]), Math.max(a[1], b[1]) - Math.min(a[3], b[3]));
    for (let breytt = true; breytt;) {
      breytt = false;
      for (let i = 0; i < stor.length && !breytt; i++) for (let j = i + 1; j < stor.length && !breytt; j++) {
        if (bil(stor[i].k, stor[j].k) <= naer) {
          const a = stor[i].k, b = stor[j].k;
          stor[i].k = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
          stor.splice(j, 1); breytt = true;
        }
      }
    }
    const ut = stor.map(q => {
      const x0 = Math.max(0, q.k[0] - sp), y0 = Math.max(0, q.k[1] - sp), x1 = Math.min(iw, q.k[2] + sp), y1 = Math.min(ih, q.k[3] + sp);
      return { x: Math.round(x0), y: Math.round(y0), w: Math.round(x1 - x0), h: Math.round(y1 - y0) };
    }).filter(r => r.w > iw * 0.08 && r.h > ih * 0.06);
    const hh = ut.length ? Math.min(...ut.map(r => r.h)) : 1;
    ut.sort((a, b) => (Math.abs(a.y + a.h / 2 - (b.y + b.h / 2)) > hh * 0.5 ? (a.y + a.h / 2) - (b.y + b.h / 2) : a.x - b.x));
    return ut;
  }
  function fahYfirlag() {
    const bd = document.querySelector('#modal-floorplan .modal-bd'); if (!bd) return null;
    let o = document.getElementById('fp-fah');
    if (!o) {
      o = document.createElement('div'); o.id = 'fp-fah';
      o.style.cssText = 'position:absolute;inset:0;z-index:21;background:rgba(20,18,14,.975);display:flex;flex-direction:column;color:#eee;font:500 13px system-ui,sans-serif';
      bd.appendChild(o);
    }
    o.style.display = 'flex';
    return o;
  }
  const fahLoka = () => { const o = document.getElementById('fp-fah'); if (o) o.style.display = 'none'; };
  const fahTexti = (o, t) => { if (o) o.innerHTML = '<div style="margin:auto;text-align:center;color:rgba(255,255,255,.75);max-width:520px;line-height:1.5">' + esc(t) + '</div>'; };
  function fahVilla(o, t) {
    if (!o) return;
    o.innerHTML = '<div style="margin:auto;text-align:center;max-width:480px;color:rgba(255,255,255,.85);line-height:1.5;padding:20px">' + esc(t) +
      '<div style="margin-top:16px"><button type="button" class="btn btn-outline btn-sm" data-fah="loka" style="color:rgba(255,255,255,.7);border-color:rgba(255,255,255,.25)">Loka</button></div></div>';
    o.querySelector('[data-fah="loka"]').onclick = fahLoka;
  }
  // Tillagan fyrir staðinn — reiknuð en ekki beitt (prófanir: TeiknBord.finnaAlltHusid({ anYfirlags: true }))
  async function fahTillaga(framvinda) {
    const FP = FPx(); if (!FP || !FP.companyId) throw new Error('Enginn staður opinn');
    if (!window.TeiknSaekja || !TeiknSaekja.finna) throw new Error('Teikningaskráin (374) er ekki hlaðin');
    framvinda('Leita að teikningum hússins…');
    const r = await TeiknSaekja.finna(FP.companyId);
    if (!r || !r.dr) throw new Error((r && r.villa) || 'Engar teikningar fundust');
    const adal = d => /aðalupp|bygginga?nefnd/i.test(String(d.tegund || ''));
    let gild = r.dr.filter(d => d && d.infoUrl && !d.urelt);
    if (gild.some(adal)) gild = gild.filter(adal);
    const fl = gild.map(d => ({ d, f: TeiknSaekja.flokka(d) }));
    const grunn = fl.filter(x => x.f.grunn);
    const snid = fl.filter(x => x.f.snid || x.f.utlit).sort((a, b) => String(b.d.dags || '').localeCompare(String(a.d.dags || '')));
    grunn.forEach(x => { x.lyklar = [].concat(x.f.kjallari ? ['K'] : [], x.f.haed.map(n => String(n)), x.f.ris ? ['R'] : []); });
    // besta blað hverrar hæðar: sem fæstar hæðir á blaðinu (nákvæmast), svo nýjast
    const val = new Map();
    grunn.filter(x => x.lyklar.length).forEach(x => x.lyklar.forEach(k => {
      const b = val.get(k);
      if (!b || x.lyklar.length < b.lyklar.length || (x.lyklar.length === b.lyklar.length && String(x.d.dags || '') > String(b.d.dags || ''))) val.set(k, x);
    }));
    const blod = new Map(); val.forEach((x, k) => { if (!blod.has(x)) blod.set(x, []); blod.get(x).push(k); });
    const tillaga = [];
    let i = 0;
    for (const [x, lyklar] of blod) {
      i++;
      framvinda('Les blað ' + i + ' af ' + blod.size + ': ' + (x.d.lysing || x.d.tegund || '') + '…');
      const url = '/.netlify/functions/teikn-mynd?url=' + encodeURIComponent(x.d.infoUrl);
      let mynd = null, rammar = [];
      try { mynd = await hladaMynd(url); } catch (_) {}
      if (mynd) { try { rammar = husRammar(mynd); } catch (e) { console.warn('[383] húsrammar', e); } }
      lyklar.sort((a, b) => fahRod(a) - fahRod(b));
      // skipting miðast við ALLAR hæðir blaðsins, líka þær sem fengu nákvæmara blað (Laugavegur 18: „Grunnmynd 1. hæð,
      // 2. hæð" þegar 2. hæð á sitt eigið blað — 1. hæð er samt fyrsta grunnmyndin á blaðinu, ekki sú stærsta)
      const allir = x.lyklar.slice().sort((a, b) => fahRod(a) - fahRod(b));
      const samsett = !x.f.bil && allir.length > 1 && rammar.length >= allir.length;
      const staerst = rammar.slice().sort((a, b) => b.w * b.h - a.w * a.h)[0] || null;
      lyklar.forEach(k => tillaga.push({
        k, nafn: fahNafn(k), image_url: url, skurdur: samsett ? rammar[allir.indexOf(k)] : staerst,
        leid: samsett ? 'samsett' : allir.length > 1 ? 'daemigerd' : 'eitt', blad: { lysing: x.d.lysing || x.d.tegund || '', dags: x.d.dags || '', tegund: x.d.tegund || '' }, mynd
      }));
      await new Promise(rr => setTimeout(rr, 0));
    }
    tillaga.sort((a, b) => fahRod(a.k) - fahRod(b.k));
    const hs = haedir();
    tillaga.forEach(t => {
      t.til = hs.some(h => h && ((h.nafn && fahLykill(h.nafn) === t.k) || (h.image_url && fahUrl(h.image_url) === fahUrl(t.image_url) && (!t.skurdur || !h.skurdur || skorunSkurda(h.skurdur, t.skurdur) > 0.6))));
    });
    return { tillaga, snid: snid.map(x => ({ image_url: '/.netlify/functions/teikn-mynd?url=' + encodeURIComponent(x.d.infoUrl), lysing: x.d.lysing || '', dags: x.d.dags || '', snid: !!x.f.snid, utlit: !!x.f.utlit })), grunnBlod: grunn.length };
  }
  function fahBeita(tl, valdar) {
    const hs = haedir(), nyjar = [];
    const virkId = virkHaed() && virkHaed().id;
    samstillaVirka();
    const snidBlod = tl.snid.filter(x => x.snid).slice(0, 4).map(x => ({ image_url: x.image_url, lysing: x.lysing, dags: x.dags }));
    tl.tillaga.forEach((t, i) => {
      if (t.til || !valdar[i]) return;
      const h = { id: nyttId(), nafn: t.nafn, image_url: t.image_url, markers: [], skurdur: t.skurdur ? { x: t.skurdur.x, y: t.skurdur.y, w: t.skurdur.w, h: t.skurdur.h } : null, veggir: [], pdfVeggir: [], uppruni: { af: 'finna-allt-husid', leid: t.leid, blad: t.blad.lysing, dags: t.blad.dags } };
      if (h.skurdur) h.sjalf = true;
      if (snidBlod.length) h.snidBlod = snidBlod;
      hs.push(h); nyjar.push(h);
    });
    if (!nyjar.length) return 0;
    // röð: Kjallari, 1., 2. … Ris — stöðug (hæðir með óþekkt heiti halda sínum stað innbyrðis)
    const rod = hs.map((h, i) => ({ h, i, k: fahRod(fahLykill(h.nafn)) }));
    rod.sort((a, b) => (a.k - b.k) || (a.i - b.i));
    hs.splice(0, hs.length, ...rod.map(r => r.h));
    const vi = hs.findIndex(h => h.id === virkId);
    G.virk = -1; virkja(vi >= 0 ? vi : 0, true);
    flipar();
    return nyjar.length;
  }
  async function finnaAlltHusid(o) {
    o = o || {};
    const y = o.anYfirlags ? null : fahYfirlag();
    let tl;
    try { tl = await fahTillaga(t => fahTexti(y, t)); }
    catch (e) { if (y) fahVilla(y, (e && e.message) || String(e)); throw e; }
    if (o.anYfirlags) return tl;
    const nyjar = tl.tillaga.filter(t => !t.til).length;
    if (!tl.tillaga.length) {
      fahVilla(y, 'Fann engar grunnmyndir með hæðum í titli (' + tl.grunnBlod + ' grunnmyndablöð, ' + tl.snid.length + ' snið og útlit). Notaðu „Sækja teikningu" og veldu blað fyrir hverja hæð.');
      return tl;
    }
    const valdar = tl.tillaga.map(t => !t.til);
    const LEID = { eitt: 'eitt blað', daemigerd: 'dæmigerð hæð — sama blað', samsett: 'samsett blað — athugaðu röðina' };
    const mynd = (t, i) => {
      if (!t.mynd) return '<div style="width:150px;height:96px;background:#000"></div>';
      return '<canvas data-th="' + i + '" width="150" height="96" style="width:150px;height:96px;background:#fff;border-radius:6px"></canvas>';
    };
    y.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.1)">' +
      '<div style="font-weight:700;color:#fff">Finna allt húsið — tillaga</div><div style="font-size:12px;color:rgba(255,255,255,.5)">' + tl.tillaga.length + ' hæðir á teikningum · ' + nyjar + ' nýjar · ekkert vistast fyrr en þú ýtir á Vista</div><div style="flex:1"></div></div>' +
      '<div style="flex:1;overflow-y:auto;padding:14px 16px;display:flex;flex-direction:column;gap:10px">' +
      tl.tillaga.map((t, i) => '<label style="display:flex;align-items:center;gap:12px;padding:8px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:rgba(255,255,255,.04);' + (t.til ? 'opacity:.55' : 'cursor:pointer') + '">' +
        '<input type="checkbox" data-val="' + i + '"' + (t.til ? ' disabled' : ' checked') + ' style="width:18px;height:18px">' + mynd(t, i) +
        '<div style="flex:1;min-width:0"><div style="font-weight:700;color:#fff;font-size:14px">' + esc(t.nafn) + (t.til ? ' <span style="font-weight:600;color:#9ad29a;font-size:12px">· er til — óbreytt</span>' : ' <span style="font-weight:600;color:#f0d48a;font-size:12px">· ný</span>') + '</div>' +
        '<div style="color:rgba(255,255,255,.6);font-size:12px">' + esc(t.blad.lysing) + (t.blad.dags ? ' · ' + esc(t.blad.dags) : '') + '</div>' +
        '<div style="color:rgba(255,255,255,.45);font-size:11.5px">' + esc(LEID[t.leid] || '') + (t.skurdur ? '' : ' · allt blaðið (fann ekki húsið)') + '</div></div></label>').join('') +
      (tl.snid.length ? '<div style="margin-top:6px;color:rgba(255,255,255,.6);font-size:12px">Snið og útlit (viðmið, ekki hæðir): ' + tl.snid.slice(0, 6).map(x => esc(x.lysing)).join(' · ') + (tl.snid.length > 6 ? ' …' : '') + '</div>' : '') +
      '</div>' +
      '<div style="display:flex;gap:10px;justify-content:flex-end;padding:12px 16px;border-top:1px solid rgba(255,255,255,.1)">' +
      '<button type="button" data-fah="haetta" class="btn btn-outline btn-sm" style="color:rgba(255,255,255,.75);border-color:rgba(255,255,255,.25)">Hætta við</button>' +
      '<button type="button" data-fah="baeta" style="height:34px;padding:0 16px;border-radius:9px;border:1px solid rgba(20,24,34,.28);background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);color:#11141c;font:700 13px system-ui;cursor:pointer"></button></div>';
    tl.tillaga.forEach((t, i) => {
      const c = y.querySelector('canvas[data-th="' + i + '"]'); if (!c || !t.mynd) return;
      const iw = t.mynd.naturalWidth || t.mynd.width, ih = t.mynd.naturalHeight || t.mynd.height, sk = t.skurdur || { x: 0, y: 0, w: iw, h: ih };
      const x = c.getContext('2d'), k = Math.min(150 / sk.w, 96 / sk.h);
      x.fillStyle = '#fff'; x.fillRect(0, 0, 150, 96);
      try { x.drawImage(t.mynd, sk.x, sk.y, sk.w, sk.h, (150 - sk.w * k) / 2, (96 - sk.h * k) / 2, sk.w * k, sk.h * k); } catch (_) {}
    });
    const takki = y.querySelector('[data-fah="baeta"]');
    const lita = () => { const n = valdar.filter((v, i) => v && !tl.tillaga[i].til).length; takki.textContent = n ? 'Bæta ' + n + (n === 1 ? ' hæð' : ' hæðum') + ' við' : 'Engin ný hæð valin'; takki.disabled = !n; takki.style.opacity = n ? '1' : '.5'; };
    lita();
    y.querySelectorAll('input[data-val]').forEach(b => b.addEventListener('change', () => { valdar[+b.dataset.val] = b.checked; lita(); }));
    y.querySelector('[data-fah="haetta"]').onclick = fahLoka;
    takki.onclick = () => {
      const n = fahBeita(tl, valdar);
      fahLoka();
      segja(n ? n + (n === 1 ? ' hæð bætt við' : ' hæðum bætt við') + ' — ýttu á Vista til að geyma þær.' : 'Engu bætt við.');
    };
    return tl;
  }

  // SJÁLFGEFIN SÝN TILBÚINNAR HÆÐAR (Agnar 07.10.2026: „Geturðu látið hana opnast hérna þegar ég vel Fiskislóð 41"):
  // það er nú FASTA VINNUMYNDIN (445) — vistuð mynd ofan frá sem opnast strax, og 3D er aðeins smíðað ef hún vantar.
  // sjalfgefid3d() (opna lifandi 3D við hverja opnun, 2b4e0134) er farið svo bæði keyri ekki.
  // o.haedId (445, takkinn „3D" í sýnarvalinu): aðeins SÚ hæð er smíðuð og sýnd — hinar kostuðu sína myndhleðslu,
  // greiningu og EI-lestur þótt þær sæjust ekki (Álfaborg: „Undirbý hæðir…" í margar sekúndur). 🧊 3D í hausnum sýnir allar.
  async function opna3d(o) {
    const FP = FPx(), main = fpEl('fp-main'); if (!FP || !main) return;
    if (document.getElementById('fp-3d')) { loka3d(); return; }
    samstillaVirka();
    const hs = haedir(), val = lesaVal(FP.companyId), einingar = FP.units || [];
    const gamur = document.createElement('div'); gamur.id = 'fp-3d';
    gamur.style.cssText = 'position:absolute;inset:0;z-index:8;background:#dcd9d2';
    // Takkar efst (brotna í línur á mjóum skjá), hæðatakkar undir þeim; skýring lita og leiðsögn neðst til vinstri.
    gamur.innerHTML = '<div style="position:absolute;left:10px;right:10px;top:10px;z-index:2;display:flex;flex-direction:column;align-items:flex-end;gap:6px;pointer-events:none">' +
      '<div style="display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;pointer-events:auto">' +
      // FESTA (Agnar 07.10.2026: „fínt að geta ýtt á festa,,, og síðan bara endurteikna"): sýnin ofan frá, án tækja, verður
      // föst vinnumynd hæðarinnar (445) — Teikning opnast eftir það strax á henni. Silfurtakki Brunastáls: aðalaðgerðin.
      '<button type="button" id="fp-3d-festa" title="Festa: hæðin ofan frá, án tækja, verður föst vinnumynd — Teikning opnast strax á henni og tækin eru sett ofan á" style="height:36px;padding:0 16px;border-radius:9px;border:1px solid rgba(20,24,34,.28);background:linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%);color:#11141c;font:700 13px system-ui;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.18)">Festa</button>' +
      '<button type="button" id="fp-3d-breyta" aria-pressed="false" title="Tengja eða aftengja brunavegg: kveiktu á þessu og smelltu á vegg" style="display:none;height:36px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.85);color:#fff;font:700 13px system-ui;cursor:pointer">Breyta eldveggjum</button>' +
      '<button type="button" id="fp-3d-ganga" aria-pressed="false" title="Ganga um hæðina í augnhæð (1,6 m) — draga = líta í kring, hjól / W S = ganga, Esc = hætta" style="height:36px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.85);color:#fff;font:700 13px system-ui;cursor:pointer">Ganga</button>' +
      '<button type="button" id="fp-3d-mynd" title="Vista sýnina eins og hún er — með tækjum og merkjum — sem skarpa PNG-mynd, t.d. í tilboð" style="height:36px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.85);color:#fff;font:700 13px system-ui;cursor:pointer">Vista mynd</button>' +
      '<button type="button" id="fp-3d-sjon" title="Skipta á milli sjónarhorns ofan frá (eins og teikningin) og á ská" style="height:36px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.85);color:#fff;font:700 13px system-ui;cursor:pointer">Á ská</button>' +
      '<button type="button" id="fp-3d-utlit" aria-pressed="false" title="Sýna eldveggi og brunahólf í lit — annars grátt útlit þar sem tækin standa út" style="height:36px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.85);color:#fff;font:700 13px system-ui;cursor:pointer">Brunahólf</button>' +
      '<button type="button" id="fp-3d-sameign" aria-pressed="' + (SAM.syn ? 'true' : 'false') + '" title="Sameign í fjölbýli: stigahús, gangar og kjallari í ljósum gulleitum lit, íbúðir deyfðar — greint úr teikningunni (stigar endurtaka sig milli hæða)" style="height:36px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:' + (SAM.syn ? '#d9b45a' : 'rgba(20,18,15,.85)') + ';color:' + (SAM.syn ? '#14120f' : '#fff') + ';font:700 13px system-ui;cursor:pointer">Sameign</button>' +
      '<button type="button" id="fp-3d-blender" title="Designer-3D: Raunsætt (yfirlit á ská og vinnuskjal ofan frá) eða Einfalt (gráa útlitið), teiknað í Blender á skrifstofutölvunni. Síðasta mynd opnast strax; Teikna aftur býr til nýja." style="height:36px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.85);color:#fff;font:700 13px system-ui;cursor:pointer">Designer-3D</button>' +
      '<button type="button" id="fp-3d-gegn" aria-pressed="false" title="Gera veggina gegnsæja svo tækin og teikningin sjáist í gegnum húsið" style="height:36px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.85);color:#fff;font:700 13px system-ui;cursor:pointer">Gegnsætt</button>' +
      '<button type="button" id="fp-3d-x" style="height:36px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.85);color:#fff;font:700 13px system-ui;cursor:pointer">✕ Loka 3D</button></div>' +
      '<div id="fp-3d-haedir" style="display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;pointer-events:auto"></div></div>' +
      '<div style="position:absolute;left:10px;bottom:10px;z-index:2;display:flex;flex-direction:column;align-items:flex-start;gap:6px;max-width:calc(100% - 20px);pointer-events:none">' +
      '<div id="fp-3d-eld" style="display:none;gap:10px;align-items:center;padding:6px 10px;border-radius:9px;background:rgba(20,18,15,.85);color:#f1ede4;font:500 12px system-ui,sans-serif;pointer-events:none;font-weight:600"></div>' +
      '<div id="fp-3d-skyr" style="padding:6px 10px;border-radius:9px;background:rgba(20,18,15,.85);color:#f1ede4;font:500 12px system-ui,sans-serif;pointer-events:none">Undirbý hæðir…</div></div>' +
      '<div id="fp-3d-val" style="position:absolute;z-index:4;display:none;flex-direction:column;gap:6px;width:190px;padding:9px;border-radius:11px;background:rgba(20,18,15,.94);box-shadow:0 6px 22px rgba(0,0,0,.4);font:600 12px system-ui,sans-serif;color:#f1ede4"></div>';
    main.appendChild(gamur);
    gamur.querySelector('#fp-3d-gegn').addEventListener('click', e => {
      const t = e.currentTarget, a = t.getAttribute('aria-pressed') !== 'true';
      t.setAttribute('aria-pressed', a ? 'true' : 'false');
      t.style.background = a ? '#d9b45a' : 'rgba(20,18,15,.85)'; t.style.color = a ? '#14120f' : '#fff';
      if (G.syn3d && G.syn3d.gegnsaett) G.syn3d.gegnsaett(a);
    });
    gamur.querySelector('#fp-3d-x').addEventListener('click', loka3d);
    gamur.querySelector('#fp-3d-festa').addEventListener('click', () => {
      if (!G.syn3d || !G.syn3d.fastMynd) { segja('3D-sýnin er ekki tilbúin'); return; }
      if (window.TeiknVinnumynd && TeiknVinnumynd.festa) TeiknVinnumynd.festa(G.syn3d.valinHaedId ? G.syn3d.valinHaedId() : null);
    });
    gamur.querySelector('#fp-3d-blender').addEventListener('click', () => { blBidja().catch(e => { console.warn('[383] Blender-mynd', e); }); });
    gamur.querySelector('#fp-3d-sameign').addEventListener('click', () => { samSkipta().catch(e => console.warn('[383] sameign', e)); });
    samTakki3d();
    const skyr = gamur.querySelector('#fp-3d-skyr'), ut = [], sleppt = [], nyirPdf = [], samHlutir = [];
    for (let i = 0; i < hs.length; i++) {
      const h = hs[i];
      if (o && o.haedId && h.id !== o.haedId) continue;
      try {
        let stig1 = i === G.virk ? G.stig1 : null, frum = i === G.virk ? G.frum : null;
        if (!stig1) { if (!h.image_url) { sleppt.push(h.nafn + ' (engin teikning)'); continue; } frum = await hladaMynd(h.image_url); stig1 = h.skurdur ? skera(frum, h.skurdur) : frum; }
        if (!document.getElementById('fp-3d')) return;
        const fbE = frum.naturalWidth || frum.width, fhE = frum.naturalHeight || frum.height;
        // Vigur-PDF án lesinna veggja (og ekki leiðrétt í TurboPaint): lesa veggina úr vigrinum, geyma á hæðinni.
        if (pdfSlod(h) && !h.pdfVeggir.length && !(Array.isArray(h.veggjaLinur) && h.veggjaLinur.length) && !h.pdfReynt3d) {
          h.pdfReynt3d = 1;
          skyr.textContent = 'Les veggi ' + (h.nafn || 'hæðar') + ' úr PDF…';
          try {
            const pv = await pdfVeggirHaedar(h, fbE, fhE);
            if (pv) { h.pdfVeggir = pv.linur; h.pdfFlokkar = [pv.flokkur]; nyirPdf.push(h.nafn || (i + 1) + '. hæð'); }
          } catch (e) { console.warn('[383] PDF-veggir í 3D', e); }
          if (!document.getElementById('fp-3d')) return;
        }
        const ei = await eiHintarFyrir3d(h, fbE, fhE);
        if (!document.getElementById('fp-3d')) return;
        const u = undirbua(h, stig1, h.markers, val, einingar, frum, ei);
        if (!u.veggjaPx) { sleppt.push(h.nafn + ' (engir veggir — greindu þá í TurboPaint og „Vista í úttekt“, lestu úr PDF eða dragðu með ✏)'); continue; }
        u.nafn = h.nafn; u.haedId = h.id;
        u.dilarAMetra = await dilarAMetra(h, fbE, fhE);
        samHlutir.push({ h, frum, stig1 });
        if (!document.getElementById('fp-3d')) return;
        ut.push(u);
      } catch (e) { console.warn('[383] 3D: ' + h.nafn, e); sleppt.push(h.nafn + ' (náði ekki í teikningu)'); }
    }
    if (nyirPdf.length) { try { vistaSjalfkrafa('veggir úr PDF (' + nyirPdf.join(', ') + ')'); } catch (_) {} }
    // FJÖLBÝLI (3+ hæðir) eða „Sameign" virkt: stigahús og sameign greind strax — 3D staflar hæðunum eftir stigunum
    // (stigahúsið er á sama stað á hverri hæð; Berjavellir 6: kjallarinn sat 5,8 m frá 1. hæð eftir miðju veggja)
    if (window.TeiknSameign && ut.length && (ut.length >= 3 || SAM.syn)) {
      try {
        await greinaSameign(samHlutir, t => { skyr.textContent = t; });
        ut.forEach(u => { u.sameign = sameignHaedar(u.haedId); });
      } catch (e) { console.warn('[383] sameign í 3D', e); }
      if (!document.getElementById('fp-3d')) return;
    }
    if (!ut.length) { loka3d(); segja('Sjálfvirk veggagreining náði ekki. ' + sleppt.join(' · ') + '.' + (hs.some(x => pdfSlod(x)) ? ' Engir vigrar í PDF.' : '') + ' Fyrir 3D: teiknaðu með Veggir.'); return; }
    try {
      G.syn3d = await syna3d(gamur, { haedir: ut, stigaStafli: ut.length >= 3, sameign: SAM.syn });
      skyr.textContent = 'Draga = snúa · hjól / klípa = aðdráttur · shift-draga eða tveir fingur = færa' + (ut.length > 1 ? ' · ' + ut.length + ' hæðir' : '') + (sleppt.length ? ' · sleppt: ' + sleppt.join(', ') : '');
      const b = document.querySelector('#modal-floorplan .fp-3d-btn'); if (b) b.setAttribute('aria-pressed', 'true');
      // Skýring lita — fylgir því sem er á skjánum: valin hæð ein, eða allar. Litirnir byggja á EI-merkjum sem voru lesin
      // sjálfvirkt af teikningunni, svo skýringin segir það (þetta er hjálpartæki, ekki staðfest brunahönnun).
      const eb = gamur.querySelector('#fp-3d-eld');
      let valin = null;     // hæðin sem er sýnd ein (null = allar)
      const skyring = valin => {
        if (!eb) return;
        const hl = (valin == null ? ut : [ut[valin]]).filter(Boolean);
        let e60 = 0, e30 = 0, nAl = 0, nH = 0, nEH = 0, nHolf = 0, nHand = 0, nUti = 0, nTp = 0;
        hl.forEach(u => {
          (u.eld || []).forEach(e => { if (e === 60) e60++; else if (e === 30) e30++; });
          (u.tpEld || []).forEach(e => { if (e) nTp++; });
          (u.handval || []).forEach(e => { if (e >= 0) nHand++; }); nUti += u.merkiUti || 0;
          if (u.holf) { nHolf += u.holf.fjoldi; u.holf.alyktad.forEach(e => { if (e) nAl++; }); }
          nH += (u.hurdir || []).length; (u.hurdEld || []).forEach(e => { if (e) nEH++; });
        });
        const kubbur = (l, t) => '<span style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap"><i style="width:12px;height:12px;border-radius:3px;background:' + l + ';display:inline-block"></i>' + t + '</span>';
        const html = (e60 ? kubbur('#d32f2f', 'EI-60') : '') + (e30 ? kubbur('#e57373', 'EI-30') : '') + (nAl ? kubbur('#f2a9a9', 'ályktað (lokar hólfi)') : '') +
          (nEH ? kubbur('#f57c00', 'Brunahurð') : '') + (nH > nEH ? kubbur('#8d6e63', 'Hurð') : '') +
          (nHolf > 1 ? '<span style="white-space:nowrap">' + nHolf + ' brunahólf' + (hl.length > 1 ? ' alls' : '') + '</span>' : '') +
          (nHand ? '<span style="white-space:nowrap">' + nHand + (nHand === 1 ? ' veggur handvalinn' : ' veggir handvaldir') + '</span>' : '') +
          (nUti ? '<span style="white-space:nowrap;color:#ffd27a">' + nUti + (nUti === 1 ? ' tæki staðsett' : ' tæki staðsett') + ' utan teikningar — færðu ' + (nUti === 1 ? 'það' : 'þau') + ' inn í 2D</span>' : '') +
          (e60 || e30 ? '<span style="flex-basis:100%;font-weight:500;opacity:.75">' + (nTp >= e60 + e30 ? 'Eldveggir merktir í TurboPaint. Leiðrétt þar eða með „Breyta eldveggjum".' : 'EI-merki lesin sjálfvirkt — sannreyndu á teikningu. Leiðrétt með „Breyta eldveggjum".') + '</span>' : '');
        const graUtlit = G.syn3d && G.syn3d.utlit && G.syn3d.utlit() === 'gratt';
        eb.innerHTML = html; eb.style.display = html && !graUtlit ? 'flex' : 'none'; eb.style.flexWrap = 'wrap'; eb.style.maxWidth = 'calc(100% - 20px)'; eb.style.rowGap = '4px';
      };
      // Útlitshnappurinn: Brunahólf (litað) ↔ grátt.
      const ub = gamur.querySelector('#fp-3d-utlit');
      const utlitLit = () => { if (!ub || !G.syn3d || !G.syn3d.utlit) return; const a = G.syn3d.utlit() === 'eld'; ub.setAttribute('aria-pressed', a ? 'true' : 'false'); ub.style.background = a ? '#d9b45a' : 'rgba(20,18,15,.85)'; ub.style.color = a ? '#14120f' : '#fff'; };
      if (ub) ub.addEventListener('click', () => { if (!G.syn3d || !G.syn3d.utlit) return; G.syn3d.utlit(G.syn3d.utlit() === 'eld' ? 'gratt' : 'eld'); utlitLit(); skyring(valin); });
      // Vista mynd: skrá „Teikning <staður> <hæð> DD-MM-YYYY.png" (ekkert / í skráarnafni).
      const myb = gamur.querySelector('#fp-3d-mynd');
      if (myb) myb.addEventListener('click', () => {
        if (!G.syn3d || !G.syn3d.mynd) return;
        try {
          const url = G.syn3d.mynd(2);
          const haus = document.querySelector('#modal-floorplan h1, #modal-floorplan h2, #modal-floorplan h3');
          const stadur = String((haus && haus.textContent) || '').replace(/^\s*Teikning\s*[—–-]\s*/, '').trim();
          const id3 = G.syn3d.valinHaedId ? G.syn3d.valinHaedId() : null, hv = id3 ? (haedir() || []).find(x => x && x.id === id3) : null;
          const d = new Date(), dags = String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();
          const nafn = ['Teikning', stadur, hv ? hv.nafn : (ut.length > 1 ? 'allar hæðir' : ''), dags].filter(Boolean).join(' ').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + '.png';
          const a = document.createElement('a'); a.href = url; a.download = nafn; document.body.appendChild(a); a.click(); a.remove();
          segja('Myndin vistaðist: ' + nafn);
        } catch (e) { segja('⚠ Gat ekki vistað mynd: ' + ((e && e.message) || e)); }
      });
      // Sjónarhornshnappurinn sýnir hitt sjónarhornið: „Á ská" þegar horft er ofan frá, „Ofan frá" annars.
      const sjb = gamur.querySelector('#fp-3d-sjon');
      if (sjb) sjb.addEventListener('click', () => {
        if (!G.syn3d || !G.syn3d.sjonarhorn) return;
        const nytt = G.syn3d.sjonarhorn() === 'ofan' ? 'ska' : 'ofan';
        G.syn3d.sjonarhorn(nytt); sjb.textContent = nytt === 'ofan' ? 'Á ská' : 'Ofan frá';
      });
      utlitLit();
      skyring(null);
      // HANDVAL ELDVEGGJA (Agnar 04.10.2026: „tengt eða aftengt brunavegg ef um einhver mistök hafa orðið og savað síðan
      // réttu útgáfuna"): ✏ Eldveggir → smellur á vegg → EI-60 / EI-30 / ekki brunaveggur. Valið fer í haedir[].eldVal
      // og vistast sjálfkrafa (aðeins sú stilling — tæki og hæðalisti eru ekki snert).
      const bb = gamur.querySelector('#fp-3d-breyta'), sprettur = gamur.querySelector('#fp-3d-val'), leidsogn = skyr.textContent;
      let breyta = false;
      setTimeout(() => { if (!breyta && skyr.isConnected) skyr.style.display = 'none'; }, 7000);    // bendingarnar: aðeins fyrst
      const lokaVali = () => { if (sprettur) sprettur.style.display = 'none'; if (G.syn3d && G.syn3d.merkja) G.syn3d.merkja(null, null); };
      if (bb && sprettur && ut.some(u => u.butar)) {
        bb.style.display = '';
        bb.addEventListener('click', () => {
          breyta = !breyta;
          if (breyta && G.syn3d && G.syn3d.utlit && G.syn3d.utlit() !== 'eld') { G.syn3d.utlit('eld'); utlitLit(); skyring(valin); }
          bb.setAttribute('aria-pressed', breyta ? 'true' : 'false');
          bb.style.background = breyta ? '#d9b45a' : 'rgba(20,18,15,.85)'; bb.style.color = breyta ? '#14120f' : '#fff';
          skyr.textContent = breyta ? 'Smelltu á vegg til að tengja hann sem brunavegg eða aftengja. Breytingin vistast sjálfkrafa.' : leidsogn;
          skyr.style.display = breyta ? '' : 'none';
          lokaVali();
        });
        G.syn3d.aSmell = (hit, cx, cy) => {
          if (!breyta) return;
          const u = hit && ut[hit.haed];
          if (!u || !u.butar) { lokaVali(); return; }
          G.syn3d.merkja(hit.haed, hit.veggur);
          const nu = u.eld ? u.eld[hit.veggur] : 0, al = !!(u.holf && u.holf.alyktad[hit.veggur]), hand = !!(u.handval && u.handval[hit.veggur] >= 0);
          const tpv = !!(u.tpEld && u.tpEld[hit.veggur]);
          const stada = nu ? 'EI-' + nu + (hand ? ' — handvalið' : tpv ? ' — merkt í TurboPaint' : ' — eftir merki á teikningu') : al ? 'Ályktaður brunaveggur (lokar hólfi)' : hand ? 'Ekki brunaveggur — handvalið' : 'Ekki brunaveggur';
          const tk = (m, t, l, virkt) => '<button type="button" data-m="' + m + '" style="height:40px;border-radius:9px;border:' + (virkt ? '2px solid #fff' : '1px solid rgba(255,255,255,.22)') + ';background:' + l + ';color:#fff;font:700 13px system-ui;cursor:pointer">' + t + '</button>';
          sprettur.innerHTML = '<div style="opacity:.8;font-weight:500;line-height:1.3">' + esc(u.nafn || '') + ' · ' + stada + '</div>' +
            tk(60, 'EI-60', '#d32f2f', nu === 60) + tk(30, 'EI-30', '#c2605f', nu === 30) + tk(0, 'Ekki brunaveggur', '#5c574f', !nu && hand) + (hand ? tk(-1, '↺ Sjálfvirkt aftur', 'transparent', false) : '');
          sprettur.dataset.h = hit.haed; sprettur.dataset.v = hit.veggur;
          const r = gamur.getBoundingClientRect();
          sprettur.style.display = 'flex';
          sprettur.style.left = Math.max(8, Math.min(r.width - 198, cx - r.left - 95)) + 'px';
          sprettur.style.top = Math.max(96, Math.min(r.height - sprettur.offsetHeight - 8, cy - r.top + 16)) + 'px';
        };
        sprettur.addEventListener('click', e => {
          const t = e.target.closest('button[data-m]'); if (!t) return;
          // Hæðin er fundin EFTIR AUÐKENNI á því augnabliki sem valið er: þegar röð þjónsins berst (__eftirSokn) er hæðahlutunum
          // skipt út, og tilvísun frá því 3D opnaðist benti þá á gamalt eintak sem sjálfvistunin sér ekki (fannst í alvöru
          // vistunarprófi á lifandi síðunni 05.10.2026: valið sást í 3D en fór aldrei á þjóninn).
          const nr = +sprettur.dataset.h, vi = +sprettur.dataset.v, u = ut[nr], hRef = u && haedir().find(x => x && x.id === u.haedId), min = +t.dataset.m;
          if (!u || !hRef || !u.butar[vi]) { lokaVali(); return; }
          const v = u.butar[vi], kE3 = Math.max(u.frumB, u.frumH) / 2384;
          // fyrra handval á SAMA vegg víkur
          const fyrri = (Array.isArray(hRef.eldVal) ? hRef.eldVal : []).filter(o => o && o.length >= 5 && veggurVid(u.butar, [o[0] - u.sk.x, o[1] - u.sk.y, o[2] - u.sk.x, o[3] - u.sk.y], kE3) !== vi);
          if (min >= 0) fyrri.push([Math.round(v[0] + u.sk.x), Math.round(v[1] + u.sk.y), Math.round(v[2] + u.sk.x), Math.round(v[3] + u.sk.y), min]);
          hRef.eldVal = fyrri;
          try { reiknaEld(u, u.eiHintar, hRef.eldVal); } catch (err) { console.warn('[383] reiknaEld', err); }
          if (G.syn3d && G.syn3d.uppfaera) G.syn3d.uppfaera(nr);
          lokaVali(); skyring(valin);
          vistaSjalfkrafa('eldveggir');
        });
      }
      // Gönguhamur: valin hæð (eða sú neðsta). Annar smellur, Esc eða hæðaskipti → aftur í snúning.
      const gb = gamur.querySelector('#fp-3d-ganga'), skyrTexti = skyr.textContent;
      const gangaLit = a => { if (!gb) return; gb.setAttribute('aria-pressed', a ? 'true' : 'false'); gb.style.background = a ? '#d9b45a' : 'rgba(20,18,15,.85)'; gb.style.color = a ? '#14120f' : '#fff'; };
      const gangaAf = () => { gangaLit(false); skyr.textContent = skyrTexti; if (G.syn3d && G.syn3d.ganga) { G.syn3d.ganga(false); if (G.syn3d.syna) G.syn3d.syna(valin); } };
      if (gb) gb.addEventListener('click', () => {
        if (!G.syn3d || !G.syn3d.ganga) return;
        if (gb.getAttribute('aria-pressed') === 'true') { gangaAf(); return; }
        if (!G.syn3d.ganga(true, valin == null ? 0 : valin)) return;
        gangaLit(true);
        skyr.textContent = 'Ganga: draga = líta í kring · hjól / W S / ↑ ↓ = áfram og aftur · A D / ← → = til hliðar · shift = hraðar · tvísmella á gólf = fara þangað · Esc = hætta';
      });
      if (G.syn3d) G.syn3d.aGangaLok = gangaAf;
      // „Opna í TurboPaint" meðan 3D er opið: hæðin sem er sýnd EIN í 3D ræður, ekki flipinn undir (Agnar 07.10.2026).
      if (G.syn3d) G.syn3d.valinHaedId = () => (valin != null && ut[valin] ? ut[valin].haedId : null);
      // Hæðatakkar: smellur sýnir þá hæð EINA, annar smellur á sömu hæð sýnir allar aftur.
      const hb = gamur.querySelector('#fp-3d-haedir');
      if (hb && ut.length > 1) {
        const TKH = 'height:32px;padding:0 11px;border-radius:9px;border:1px solid rgba(255,255,255,.25);font:700 12px system-ui;cursor:pointer;';
        const mala = () => { hb.innerHTML = ut.map((u, i) => '<button type="button" data-h="' + i + '" aria-pressed="' + (valin === i) + '" title="Sýna aðeins þessa hæð — smelltu aftur til að sjá allar" style="' + TKH + (valin === i ? 'background:#d9b45a;color:#14120f' : 'background:rgba(20,18,15,.85);color:#fff') + '">' + esc(u.nafn || (i + 1) + '. hæð') + '</button>').join(''); };
        hb.addEventListener('click', e => {
          const t = e.target.closest('button[data-h]'); if (!t) return;
          const nr = +t.dataset.h; valin = valin === nr ? null : nr;
          if (gb && gb.getAttribute('aria-pressed') === 'true') { gangaLit(false); skyr.textContent = skyrTexti; if (G.syn3d && G.syn3d.ganga) G.syn3d.ganga(false); }
          if (G.syn3d && G.syn3d.syna) G.syn3d.syna(valin);
          mala(); skyring(valin); lokaVali();
        });
        const fyrst = o && o.haedId ? ut.findIndex(u => u.haedId === o.haedId) : -1;
        if (fyrst >= 0 && G.syn3d && G.syn3d.syna) { valin = fyrst; G.syn3d.syna(valin); skyring(valin); }
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
  async function vistaHaedirFyrirTurboPaint(nr) {
    const FP = FPx(), cid = FP && FP.companyId;
    if (!cid || !window.DB || !DB.sb) throw new Error('engin tenging');
    samstillaVirka();
    const hs = haedir();
    if (hs.some(x => String(x.image_url || '').indexOf('blob:') === 0)) {
      throw new Error('Ein hæðin er með nýupphlaðna mynd — ýttu fyrst á 💾 Vista, opnaðu gluggann aftur og svo TurboPaint.');
    }
    const gogn = JSON.parse(JSON.stringify(hs)); gogn.forEach(x => { delete x.pdfReynt; });
    // 05.10.2026: um TeiknVistun.skrifa (375) — sameinað við ferska röð hafi önnur vél skrifað á meðan.
    const rodin = { company_id: cid, markers: gogn[0].markers, image_url: gogn[0].image_url || null, haedir: gogn, updated_at: new Date().toISOString() };
    const r = window.TeiknVistun && TeiknVistun.skrifa
      ? await TeiknVistun.skrifa(cid, rodin)
      : await DB.sb.from('teikning_bord').upsert(rodin, { onConflict: 'company_id' }).select('company_id').then(q => ({ error: q.error || (!q.data || !q.data.length ? new Error('ekkert skrifað') : null) }));
    if (r.error) throw new Error(r.error.message || 'ekkert skrifað');
    return { cid, h: hs[nr >= 0 ? nr : G.virk], hs };
  }
  function turboPaintSlod(cid, h, planUrl, sjalfvirkt) {
    const q = ['uttekt=' + encodeURIComponent(cid)];
    if (h && h.id) q.push('haed=' + encodeURIComponent(h.id));
    if (h && h.frum) q.push('b=' + h.frum.b, 'h=' + h.frum.h);
    if (planUrl) q.push('plan=' + encodeURIComponent(planUrl));
    // 06.10.2026 (áfangi 1): opnast í „Teikning og greining" — þar er veggjastikan (Veggur/Gler/Hurð/Tengja/Eyða)
    q.push('ham=teikning');
    // 08.10.2026 „Sjálfvirkt": TurboPaint keyrir verkferlið (gæði, skurður, veggir, hreinsun, hurðir, EI, tæki) og vistar
    if (sjalfvirkt) q.push('sjalfvirkt=1');
    return TURBOPAINT + '?' + q.join('&');
  }
  async function opnaITurboPaint(auka) {
    const FP = FPx(), cid = FP && FP.companyId;
    if (!cid) { segja('Opnaðu teikninguna fyrst.'); return; }
    if (!FP.bgImage && !(auka && auka.plan)) { segja('Sæktu eða hlaðu upp teikningu fyrst.'); return; }
    // 07.10.2026 (Agnar: „var óvart inn í 3D, þess vegna virkaði það ekki" — 2. hæð opnaðist þótt 1. hæð væri valin í
    // 3D): sé ein hæð sýnd í 3D opnast HÚN; annars virki flipinn eins og áður.
    const hs0 = haedir() || [];
    const id3d = G.syn3d && G.syn3d.valinHaedId ? G.syn3d.valinHaedId() : null;
    const i3d = id3d ? hs0.findIndex(x => x && x.id === id3d) : -1;
    const nr = i3d >= 0 ? i3d : G.virk;
    const h = hs0[nr];
    if (h && !haedOpnastITurboPaint(h) && !(auka && auka.plan)) {
      segja('Aðeins teikningar úr skjalasafninu opnast sjálfkrafa í TurboPaint — upphlaðna mynd þarf að flytja þar inn handvirkt.');
      return;
    }
    const flipi = window.open('about:blank', '_blank');
    try {
      const v = await vistaHaedirFyrirTurboPaint(nr);
      const sjalf = !!(auka && auka.sjalfvirkt === true);
      const slod = turboPaintSlod(v.cid, v.h, auka && auka.plan, sjalf);
      if (flipi) flipi.location.href = slod; else location.href = slod;
      _tpOpnad = Date.now();
      vaktAfturkomu();
      segja((v.h && v.h.nafn ? '„' + v.h.nafn + '"' : 'Hæðin') + (sjalf
        ? ' opnast í TurboPaint og sjálfvirka verkferlið keyrir (2–4 mín). Hæðin sækist hér þegar þú kemur til baka — merkt „· sjálfvirkt".'
        : ' opnast í TurboPaint. Þegar þú ert búinn þar: „💾 Vista í úttekt" — merkin koma til baka hér.'));
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
        gera('fp-hus-btn', '⌂ Að húsinu', 'Skera sjálfkrafa að húsinu sjálfu — nafnreitur, skýringar og lóð falla burt. Fínstilltu með ✂ ef þarf.', tharfMynd(() => {
          loka3d(); G.hamur = null; G.drag = null; G.kedja = null;
          if (skeraAdHusi(false)) segja('✂ Skorið að húsinu — vistast sjálfkrafa.');
        })),
        gera('fp-veggir-btn', '✏ Veggir', 'Draga veggina sjálfur — virkar á hvaða teikningu sem er og gefur rétt 3D', tharfMynd(() => { loka3d(); G.hamur = G.hamur === 'veggir' ? null : 'veggir'; G.kedja = null; G.drag = null; })),
        gera('fp-hreinsa-btn', '✨ Skýrari veggir', '2D grunnmyndin helst ósnert. 3D sýnir húsið — grá lóð utan veggja er ekki gólfplata.', tharfMynd(() => { const v = lesaVal(FP.companyId); v.a = !v.a; vistaVal(FP.companyId, v); })),
        gera('fp-3d-btn', '🧊 3D', 'Lyfta veggjunum upp og sjá tækin í þrívídd — allar hæðir', () => { G.hamur = null; opna3d(); }),
        // 08.10.2026 (Agnar: fjölbýli — tækin í sameign, stigagangi og kjallara): greind sameign gulleit, íbúðir deyfðar
        // 08.10.2026 (Agnar: „látið finna úr teikningum allt húsið"): öll grunnmyndablöð → tillaga að hæðum
        gera('fp-fah-btn', 'Finna allt húsið', 'Sækir öll gildandi grunnmyndablöð staðarins og raðar þeim í hæðir (kjallari, 1., 2. …). Samsett blöð skiptast, dæmigerð hæð gildir fyrir allar hæðirnar sem hún nær yfir, snið eru geymd sem viðmið. Tillaga — hæðir sem eru til eru aldrei snertar og ekkert vistast fyrr en þú ýtir á Vista.', () => { finnaAlltHusid().catch(e => console.warn('[383] finna allt húsið', e)); }),
        gera('fp-sameign-btn', 'Sameign', 'Sameign í fjölbýli: stigahús, gangar og kjallari í ljósum gulleitum lit, íbúðir deyfðar — greint úr teikningunni (stigar endurtaka sig milli hæða). Ekkert vistast.', () => { samSkipta().catch(e => console.warn('[383] sameign', e)); }),
        gera('fp-fest-btn', '📌 Festa útlit', 'Sáttur við teikninguna? Festir skurð, Skýrari veggi og hæðir á þjóninum — opnast alltaf svona, ekkert greint upp á nýtt. Smelltu aftur til að breyta.', tharfMynd(() => {
          const v = lesaVal(FP.companyId); v.fest = !v.fest; G.hamur = null; G.drag = null; G.kedja = null;
          vistaVal(FP.companyId, v);
          segja(v.fest ? '📌 Útlitið er fest og vistað — teikningin opnast alltaf svona.' : '🔓 Útlitið er laust — skerðu og stilltu, svo „Festa útlit“ aftur.');
        })),
        gera('fp-tp-btn', 'Opna í TurboPaint', 'Opna hæðina í TurboPaint: teikna á hana, færa tækin og vista staðsetningarnar til baka', opnaITurboPaint),
        // 08.10.2026 (Agnar): „takka sem setur í gang eitthvað automatic verkferli" — TurboPaint ?sjalfvirkt=1
        gera('fp-tp-sjalf-btn', 'Sjálfvirkt', 'Sjálfvirkt verkferli í TurboPaint: hæstu gæði, skorið að húsinu, veggir greindir og hreinsaðir, hurðir, eldveggir og tæki — vistast sjálft (hæð sem þú hefur leiðrétt er aldrei yfirskrifuð) og birtist hér aftur', () => opnaITurboPaint({ sjalfvirkt: true }))
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
    lita('.fp-sameign-btn', SAM.syn);
    { const b = grp.querySelector('.fp-sameign-btn'); if (b) b.classList.toggle('fp-ekki', !samAvid()); }
    lita('.fp-fest-btn', val.fest, val.fest ? '📌 Útlit fest' : '📌 Festa útlit');
    const mg = fpGluggi(); if (mg) mg.classList.toggle('fp-fest', !!val.fest);
    if (!document.getElementById('fp-fest-css')) {
      // Veggjatalning (✏ Veggir · N) og EI-merki eru greining — hún býr í TurboPaint; glugginn er sýn fyrir þjónustuna
      // (Agnar 03.10.2026: „tekið út veggjatalningu, EI“). Fest útlit felur skurðinn — EKKI Skýrari veggi (04.10: faldi
      // takkinn gerði að verkum að „næ henni ekki aftur").
      const st = document.createElement('style'); st.id = 'fp-fest-css';
      st.textContent = '#modal-floorplan .fp-veggir-btn,#modal-floorplan .fp-ei-btn,#modal-floorplan .fp-sameign-btn.fp-ekki{display:none!important}' +
        '#modal-floorplan.fp-fest .fp-skera-btn,#modal-floorplan.fp-fest .fp-hus-btn{display:none!important}' +
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
      Z.s = 1; Z.x = 0; Z.y = 0; Z.sjalf = true; Z.gs = 1;
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
        // „Vista" = vista OG loka (scanner.js kallar Modal.close). Modal.close tekur aðeins .open af, en FloorPlan.open og
        // 437 setja display:flex beint á gluggann — hann sat eftir hálflokaður (z-index 1000, engin yfirbreiðsla) og,
        // eftir G.virk = 0 hér að ofan, sýndi hann teikningu 2. hæðar með merkjum 1. hæðar (lifandi próf 07.10.2026, 1404).
        // closeFP lokar honum í alvöru; næsta opnun les hæðirnar upp á nýtt.
        try { const m = document.getElementById('modal-floorplan'); if (m && !m.classList.contains('open') && m.style.display !== 'none' && typeof window.closeFP === 'function') window.closeFP(); } catch (_) {}
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
    try { zFylgjaRymi(); } catch (_) {}
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
    nyMynd,
    syn3d: () => G.syn3d,     // opna þrívíddin (prófanir: skuggar(), blenderSena())
    // Vinnumyndin (445): röð þjónsins komin? · smíða fasta mynd hæðar · veggir hennar · lifandi 3D opnað/lokað
    rodKomin: () => G.rodKomin,
    smidaVinnumynd,
    vinnuButar,
    opna3d: o => { if (!document.getElementById('fp-3d')) { G.hamur = null; return opna3d(o); } },
    loka3d,
    // Designer-3D (prófanir): staðan sem er sýnd · PDF-gögn hæðar fyrir raunsætt útlit
    designer: () => (G.blender ? { utlit: G.blender.utlit, stada: G.blender.stada, id: G.blender.id || null, myndir: G.blender.myndir || null, vm: G.blender.vm || null, vms: G.blender.vms || null, vmS: G.blender.vmS || {}, vmStada: G.blender.vmStada || '' } : null),
    raunPdf: h => raunGognUrPdf(h),
    // Sameign í fjölbýli (446): niðurstaða hæðar þegar „Sameign" er virkt (445 teiknar hana á vinnumyndina) · greining
    sameign: hid => (SAM.syn ? sameignHaedar(hid) : null),
    sameignSyn: () => SAM.syn,
    sameignHus: () => SAM.hus,
    greinaSameign: () => greinaSameign(),
    sameignSkipta: () => samSkipta(),
    sameignAthuga,
    // Finna allt húsið (prófanir): tillagan án yfirlags · húsrammar blaðs
    finnaAlltHusid: o => finnaAlltHusid(o),
    husRammar
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
