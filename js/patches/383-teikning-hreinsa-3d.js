/* === TEIKNING: HREINSA VEGGI + 3D-SÝN (383) ================================
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

  window.TeiknHreinsun = { hreinsaGogn, hreinsa };

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
    let staerst = 1, haedY = 0;
    haedir.forEach((hd, nr) => {
      const k = kassarUrGrimu(hd.veggir, hd.W, hd.H);
      staerst = Math.max(staerst, k.gw, k.gh);
      const veggH = Math.max(k.gw, k.gh) * 0.045, bil = veggH * 2.4;
      const hopur = new T.Group(); hopur.position.y = haedY; svid.add(hopur);
      // Gólf: hreina myndin sem áferð, svo herbergjaskipan og heiti sjáist undir veggjunum.
      const golfStr = document.createElement('canvas');
      const gs = Math.min(1, 2048 / Math.max(hd.golf.width, hd.golf.height));
      golfStr.width = Math.max(1, Math.round(hd.golf.width * gs)); golfStr.height = Math.max(1, Math.round(hd.golf.height * gs));
      golfStr.getContext('2d').drawImage(hd.golf, 0, 0, golfStr.width, golfStr.height);
      const aferd = new T.CanvasTexture(golfStr); aferd.anisotropy = 4;
      const golfG = new T.PlaneGeometry(k.gw, k.gh), golfE = new T.MeshBasicMaterial({ map: aferd, side: T.DoubleSide });
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

  /* ───────────────────────── 3) TENGING VIÐ TEIKNINGAGLUGGANN (FloorPlan) ───────────────────────── */

  const LYKILL = cid => 'teikn_hreinsun_' + cid;
  const lesaVal = cid => { try { return JSON.parse(localStorage.getItem(LYKILL(cid)) || 'null') || {}; } catch (_) { return {}; } };
  const vistaVal = (cid, v) => { try { localStorage.setItem(LYKILL(cid), JSON.stringify(v)); } catch (_) {} };
  const segja = t => { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };

  // Staða gluggans. `frum` = frummyndin sem FloorPlan hlóð; `hrein` = niðurstaða hreinsunar fyrir ÞÁ mynd og ÞÆR stillingar.
  const G = { frum: null, hrein: null, lykill: '', syn3d: null, vakt: 0 };
  const erOkkarStrigi = m => !!(G.hrein && m === G.hrein.strigi);
  const myndLykill = (m, v) => (m.src || m.width + 'x' + m.height) + '|' + (v.thykkt || 0) + '|' + (v.fylla ? 1 : 0);

  function reikna(frum, val) {
    const l = myndLykill(frum, val);
    if (G.hrein && G.lykill === l) return G.hrein;
    const t0 = performance.now();
    const r = hreinsa(frum, { thykkt: val.thykkt || 0, fylla: !!val.fylla });
    r.ms = Math.round(performance.now() - t0);
    G.hrein = r; G.lykill = l;
    return r;
  }

  function beita() {
    const FP = window.FloorPlan; if (!FP || !FP.companyId) return;
    const val = lesaVal(FP.companyId), nu = FP.bgImage;
    if (!nu) return;
    if (!erOkkarStrigi(nu)) G.frum = nu;                       // FloorPlan (eða 375) setti inn nýja frummynd
    if (!G.frum || (G.frum.complete === false)) return;
    if (val.a) {
      let r;
      try { r = reikna(G.frum, val); } catch (e) { segja('⚠ Gat ekki hreinsað teikninguna: ' + ((e && e.message) || e)); val.a = false; vistaVal(FP.companyId, val); stika(); return; }
      if (r.thekja < 0.004) {
        // Engir þykkir veggir fundust — sýna frummyndina frekar en auðan flöt, og segja hvers vegna.
        if (erOkkarStrigi(FP.bgImage)) { FP.bgImage = G.frum; try { FP._renderCanvas(); } catch (_) {} }
        stika('Fann nær enga þykka veggi (' + (r.thekja * 100).toFixed(1) + '%). Prófaðu minni veggþykkt eða „Fylla tvöfalda veggi".');
        return;
      }
      if (FP.bgImage !== r.strigi) { FP.bgImage = r.strigi; try { FP._renderCanvas(); } catch (_) {} }
      // Mælt 20.09.2026: skannaður uppdráttur með FYLLTUM veggjum gaf 5,5% þekju og heilt veggjanet; þunnlínu-CAD
      // (Skútuvogur 4, Fiskislóð 41) 0,3–0,7% — þar nást aðeins þykkustu línurnar, oft brunaveggir (EI-60). Segja það.
      stika(r.thekja < 0.02 ? 'Fann aðeins þykkustu veggina (' + (r.thekja * 100).toFixed(1) + '%). Á CAD-teikningum með þunnum línum eru það oft brunaveggirnir — milliveggir nást ekki sjálfvirkt.' : '');
    } else if (erOkkarStrigi(FP.bgImage)) {
      FP.bgImage = G.frum; try { FP._renderCanvas(); } catch (_) {}
      stika();
    }
  }

  function stika(skilabod) {
    const main = document.getElementById('fp-main'); if (!main) return;
    const FP = window.FloorPlan, val = lesaVal(FP.companyId);
    let s = document.getElementById('fp-hreinsa-stika');
    if (!val.a) { if (s) s.remove(); return; }
    if (!s) {
      s = document.createElement('div'); s.id = 'fp-hreinsa-stika';
      s.style.cssText = 'position:absolute;left:10px;bottom:10px;z-index:6;display:flex;flex-wrap:wrap;align-items:center;gap:8px;max-width:calc(100% - 150px);' +
        'padding:7px 10px;border-radius:10px;background:rgba(20,18,15,.9);color:#f1ede4;font:600 12.5px system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.45)';
      main.appendChild(s);
      s.addEventListener('click', e => {
        const t = e.target.closest('[data-hr]'); if (!t) return;
        const v = lesaVal(FP.companyId), nuna = (G.hrein && G.hrein.thykkt) || 2;
        if (t.dataset.hr === 'minna') v.thykkt = Math.max(1, (v.thykkt || nuna) - 1);
        if (t.dataset.hr === 'meira') v.thykkt = Math.min(9, (v.thykkt || nuna) + 1);
        if (t.dataset.hr === 'fylla') v.fylla = !v.fylla;
        vistaVal(FP.companyId, v); beita();
      });
    }
    const th = (G.hrein && G.hrein.thykkt) || val.thykkt || 2, tk = 'min-width:30px;height:30px;border-radius:8px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#fff;font:700 15px system-ui;cursor:pointer';
    s.innerHTML = '<span>Veggþykkt</span><button type="button" data-hr="minna" style="' + tk + '" title="Halda líka þynnri veggjum">−</button><span style="min-width:14px;text-align:center">' + th +
      '</span><button type="button" data-hr="meira" style="' + tk + '" title="Aðeins þykkustu veggir">+</button>' +
      '<button type="button" data-hr="fylla" aria-pressed="' + !!val.fylla + '" style="' + tk + ';padding:0 10px;font-size:12.5px;' + (val.fylla ? 'background:#c9a54a;color:#14120f;border-color:#c9a54a' : '') + '">Fylla tvöfalda veggi</button>' +
      (skilabod ? '<span style="flex-basis:100%;color:#ffd27a;font-weight:500">' + skilabod + '</span>'
        : (G.hrein ? '<span style="opacity:.6;font-weight:500">' + (G.hrein.thekja * 100).toFixed(1) + '% veggir · ' + G.hrein.ms + ' ms</span>' : ''));
  }

  function loka3d() {
    if (G.syn3d) { try { G.syn3d.loka(); } catch (_) {} G.syn3d = null; }
    const g = document.getElementById('fp-3d'); if (g) g.remove();
    const b = document.querySelector('#modal-floorplan .fp-3d-btn'); if (b) b.setAttribute('aria-pressed', 'false');
  }

  async function opna3d() {
    const FP = window.FloorPlan, main = document.getElementById('fp-main');
    if (!FP || !main) return;
    if (document.getElementById('fp-3d')) { loka3d(); return; }
    const frum = erOkkarStrigi(FP.bgImage) ? G.frum : FP.bgImage;
    if (!frum) { segja('Sæktu eða hlaðu upp teikningu fyrst.'); return; }
    const val = lesaVal(FP.companyId);
    let r;
    try { r = reikna(frum, val); } catch (e) { segja('⚠ Gat ekki lesið teikninguna: ' + ((e && e.message) || e)); return; }
    if (r.thekja < 0.004) { segja('Fann enga þykka veggi til að lyfta upp — kveiktu á ✨ Skýrari veggir og stilltu veggþykktina fyrst.'); return; }
    const gamur = document.createElement('div'); gamur.id = 'fp-3d';
    gamur.style.cssText = 'position:absolute;inset:0;z-index:8;background:#14120f';
    gamur.innerHTML = '<div style="position:absolute;left:10px;top:10px;z-index:2;padding:6px 10px;border-radius:9px;background:rgba(20,18,15,.85);color:#f1ede4;font:500 12px system-ui,sans-serif;pointer-events:none">' +
      'Draga = snúa · hjól / klípa = aðdráttur · shift-draga eða tveir fingur = færa</div>' +
      '<button type="button" id="fp-3d-x" style="position:absolute;right:10px;top:10px;z-index:2;height:36px;padding:0 14px;border-radius:9px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.85);color:#fff;font:700 13px system-ui;cursor:pointer">✕ Loka 3D</button>';
    main.appendChild(gamur);
    gamur.querySelector('#fp-3d-x').addEventListener('click', loka3d);
    const plan = (FP.plans && FP.plans[FP.companyId]) || {}, einingar = FP.units || [];
    const iw = frum.naturalWidth || frum.width;
    const merki = (plan.markers || []).map(mk => {
      const u = einingar.find(x => x.id === mk.unitId);
      const px = (mk.x > 1 || mk.y > 1) ? mk.x : mk.x * iw, py = (mk.x > 1 || mk.y > 1) ? mk.y : mk.y * (frum.naturalHeight || frum.height);
      return { x: px, y: py, litur: u && u.status === 'overdue' ? '#c93c1d' : '#2f9e55', texti: u ? String(u.serial || '').slice(-6) : '' };
    });
    try {
      G.syn3d = await syna3d(gamur, { haedir: [{ veggir: r.veggir, W: r.W, H: r.H, golf: r.vinnu, kvardi: r.kvardi, merki }] });
      const b = document.querySelector('#modal-floorplan .fp-3d-btn'); if (b) b.setAttribute('aria-pressed', 'true');
    } catch (e) {
      loka3d(); segja('⚠ 3D-sýnin opnaðist ekki: ' + ((e && e.message) || e));
    }
  }

  function baetaHnoppum() {
    const hd = document.querySelector('#modal-floorplan .modal-hd'); if (!hd) return;
    const grp = hd.lastElementChild; if (!grp || grp.querySelector('.fp-hreinsa-btn')) return;
    const FP = window.FloorPlan;
    const gera = (kl, texti, titill, fn) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-outline btn-sm ' + kl;
      b.style.cssText = 'cursor:pointer'; b.textContent = texti; b.title = titill; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', fn); return b;
    };
    const h = gera('fp-hreinsa-btn', '✨ Skýrari veggir', 'Sýna aðeins veggina — málsetningar og texti dofna. Frummyndin geymist óbreytt.', () => {
      const v = lesaVal(FP.companyId); v.a = !v.a; vistaVal(FP.companyId, v);
      h.setAttribute('aria-pressed', String(!!v.a)); h.style.background = v.a ? '#c9a54a' : ''; h.style.color = v.a ? '#14120f' : '';
      beita();
    });
    const d = gera('fp-3d-btn', '🧊 3D', 'Lyfta veggjunum upp og sjá tækin í þrívídd', opna3d);
    const upp = grp.querySelector('label') || grp.firstChild;
    grp.insertBefore(d, upp); grp.insertBefore(h, d);
    const v = lesaVal(FP.companyId);
    if (v.a) { h.setAttribute('aria-pressed', 'true'); h.style.background = '#c9a54a'; h.style.color = '#14120f'; }
  }

  function skreyta() {
    const FP = window.FloorPlan;
    if (!FP) return false;
    if (FP.__hreinsaSkreytt) return true;
    const uppruni = FP.open;
    if (typeof uppruni !== 'function') return false;
    FP.open = function () {
      loka3d(); G.frum = null; G.hrein = null; G.lykill = '';
      const r = uppruni.apply(this, arguments);
      try { baetaHnoppum(); } catch (_) {}
      // Frummyndin kemur ósamstillt (localStorage, svo þjónn í 375, svo „Sækja teikningu"): vakta meðan glugginn er
      // opinn og hreinsa hverja NÝJA frummynd ef valið er á. Ódýrt — reikna() geymir niðurstöðuna per mynd+stillingar.
      clearInterval(G.vakt);
      G.vakt = setInterval(() => {
        const m = document.getElementById('modal-floorplan');
        if (!m || m.style.display === 'none') { clearInterval(G.vakt); loka3d(); return; }
        try { baetaHnoppum(); beita(); } catch (_) {}
      }, 600);
      return r;
    };
    // Vista má ALDREI sjá strigann okkar sem mynd: plan.imageUrl er slóð frummyndar og er ósnert hér — þetta er
    // aðeins varnagli ef annar kóði les bgImage við vistun.
    FP.__hreinsaSkreytt = true;
    return true;
  }

  if (!skreyta()) { let n = 0; const i = setInterval(() => { if (skreyta() || ++n > 40) clearInterval(i); }, 150); }
})();
