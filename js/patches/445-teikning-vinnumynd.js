/* === TEIKNING: VINNUMYNDIN — FÖST 3D-MYND OFAN FRÁ SEM VINNUSÝN (445) =======
 *
 * Agnar 07.10.2026, um 3D-sýnina ofan frá: „This view would be absolutely perfect as the image we put the fire
 * extinguisher in its places" · „it could really just be the picture we use as our work sheet" · „kanski fínt að geta
 * skipt á milli en hafa hina sem default myndina þegar hún er orðin tilbúin". Og svo: „ætti þá í raun ekki að vera
 * léttara að opna svona mynd tilbúna í stað þess að vera láta kerfið sækja og setja veggina … þegar hún er orðinn bara
 * föst mynd".
 *
 * ÞVÍ: hæðin fær FASTA mynd ofan frá — hæðin ein, án tækja og merkja. Hún fer í fötuna `turbopaint`
 * (vinnumynd/<félag>/<hæð>-<lykill>.jpg) og á hæðina sem haedir[].vinnumynd = { url, lykill, cam, heild, rammi, kort, … }
 * um TeiknVistun.skrifa (375), svo allar vélar opni hana STRAX — ekkert WebGL, engin veggjasmíði.
 *
 * AGNAR STÝRIR (07.10.2026: „mjög lengi að loadast,, fínt að geta ýtt á festa,,, og síðan bara endurteikna"):
 *   · „Festa" í 3D-sýninni: hæðin þaðan, ofan frá og án tækja (383 fastMynd), verður fasta myndin.
 *   · „Endurteikna" á myndinni: opnar lifandi 3D af hæðinni; ný mynd vistast þegar ýtt er á „Festa" þar.
 *   · Úrelt mynd (veggjum, skurði eða teikningu breytt síðan hún var fest — lykillinn segir það): myndin sést SAMT strax
 *     og lína segir „Veggjum breytt síðan myndin var fest — Endurteikna". Ekkert endurbyggt sjálfkrafa.
 *   · Fyrsta mynd TILBÚINNAR hæðar (leiðrétt í TurboPaint / veggjaLinur) sem á enga er smíðuð og fest sjálfkrafa einu
 *     sinni (383 smidaVinnumynd, hulið 3D) — svo hann þurfi ekki að muna það.
 *
 * TÆKIN eru teiknuð OFAN Á myndina (strigi), með sömu táknum og stærðarstillingu og 2D. Staða merkis (dílar frummyndar)
 * → heimur (kortið, sama vörpun og 3D) → mynd með vistaða fylkinu cam = P·V. Smellur → öfugt: geisli úr myndavélinni,
 * sker vegg (kassar eins og í 3D) eða gólf (y = 0) → dílar frummyndar. Á vegg fer tækið á flöt veggjarins þeim megin sem
 * smellt var (eins og festaAVegg). Allt fer um 433 (setjaTaeki / setjaEitt / faert / vistaAdThjoni) — SÖMU gögn og 2D.
 *
 * SÝNIN: „Vinnumynd · 2D · 3D" neðst til hægri. Vinnumyndin er sjálfgefin á hæð sem á fasta mynd (eða er tilbúin);
 * valið gildir aðeins í glugganum (ekki vistað). Hæðaflipar skipta um hæð. ✂ Skera / ✏ Veggir sýna 2D meðan þau eru virk.
 * ========================================================================== */
(() => {
  if (window.TeiknVinnumynd) return;

  const UTGAFA = 1, HAMARK = 2400, FATA = 'turbopaint', GAEDI = 0.9;
  const GULL = '#d9b45a', DOKKT = 'rgba(20,18,15,.85)';
  const V = {
    modal: null, gamur: null, strigi: null, val: null,
    hRef: null, sig: null, haedId: null, lykill: '', tilbuin: false,
    myndir: {}, sokn: {}, smidar: {}, villa: {}, brotin: {}, veggir: {}, nyjar: {}, sjalfReynt: {}, urelt: false, festir: false,
    mynd: null, synilegur: false, stadaTexti: '',
    s: 1, x: 0, y: 0, teiknad: '', p: null, fingur: new Map(), klipa: 0, midja: null,
    opnad: 0, synt: 0, smidadMs: 0, raf: 0, hint: 0
  };
  const FP = () => window.FloorPlan;
  const TB = () => window.TeiknBord;
  const TM = () => window.TeiknMerking;
  const segja = t => { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const erStimpil = m => !!(m && (m.kind === 'sign' || (typeof m.unitId === 'string' && String(m.unitId).indexOf('s:') === 0)));

  /* ── lykill: hvenær er myndin úrelt ── */
  // TILBÚIN = veggir leiðréttir í TurboPaint (eða veggjaLinur) — aðeins slík hæð fær fyrstu myndina sjálfkrafa.
  function tilbuin(h) { return !!(h && h.image_url && (h.leidrett || (Array.isArray(h.veggjaLinur) && h.veggjaLinur.length > 0))); }
  function hash(s) {
    let a = 0x811c9dc5, b = 0x9747b28c;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 16777619); b = Math.imul(b ^ c, 0x5bd1e995); b ^= b >>> 15; }
    return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
  }
  // Slóð án uppruna (sama teikning hvort sem hún er vistuð með https://slokkvitaeki.netlify.app eða afstætt) og tölur
  // og lyklaröð staðlaðar — JSONB þjónsins raðar lyklum öðruvísi en vafrinn.
  function lykillHaedar(h) {
    const sk = h.skurdur ? [h.skurdur.x, h.skurdur.y, h.skurdur.w, h.skurdur.h].map(n => Math.round(+n || 0)) : null;
    const vl = (Array.isArray(h.veggjaLinur) ? h.veggjaLinur : []).map(v => v ? [String(v.tegund || ''), +v.eld || 0, Math.round((+v.t || 0) * 10) / 10, (Array.isArray(v.p) ? v.p : []).map(n => Math.round(+n * 10) / 10)] : null);
    const hv = (Array.isArray(h.veggir) ? h.veggir : []).map(v => (Array.isArray(v) ? v : []).map(n => Math.round(+n || 0)));
    const pdf = Array.isArray(h.pdfVeggir) && h.pdfVeggir.length ? h.pdfVeggir.length + ':' + hash(JSON.stringify(h.pdfVeggir)) + ':' + (h.pdfFlokkar || []).join(',') : '';
    const url = String(h.image_url || '').replace(/^https?:\/\/[^/]+/i, '');
    return 'v' + UTGAFA + '-' + hash(JSON.stringify([url, sk, vl, hv, (h.leidrett && h.leidrett.kl) || '', pdf]));
  }
  const gildVm = vm => !!(vm && Array.isArray(vm.cam) && vm.cam.length === 16 && Array.isArray(vm.rammi) && Array.isArray(vm.heild) && vm.kort && vm.b > 0 && vm.h > 0);
  const vmLykill = vm => String(vm.lykill || '') + '@' + String(vm.t || '');
  // Fasta mynd hæðarinnar: sú nýjasta af þeirri sem hæðin ber (af þjóninum) og þeirri sem var fest HÉR rétt í þessu
  // (V.nyjar — hún er sýnd úr striganum strax, áður en upphleðslunni lýkur).
  function vmFyrir(h) {
    if (!h) return null;
    const a = h.vinnumynd && gildVm(h.vinnumynd) && h.vinnumynd.url ? h.vinnumynd : null, b = V.nyjar[h.id];
    if (b && (!a || String(b.t || '') >= String(a.t || ''))) return b;
    return a;
  }

  /* ── vörpun: frummynd ↔ heimur ↔ mynd (engin WebGL) ── */
  function heimur(vm, u, v) { const k = vm.kort; return [(u - k.sx) * k.f - k.gw / 2, (v - k.sy) * k.f - k.gh / 2]; }
  function varpa(vm, u, v) {
    const w = heimur(vm, u, v), e = vm.cam;
    const cx = e[0] * w[0] + e[8] * w[1] + e[12], cy = e[1] * w[0] + e[9] * w[1] + e[13], cw = e[3] * w[0] + e[11] * w[1] + e[15];
    return [(cx / cw + 1) / 2 * vm.heild[0] - vm.rammi[0], (1 - cy / cw) / 2 * vm.heild[1] - vm.rammi[1]];
  }
  // 4×4 andhverfa (dálkaröð — sama formúla og gl-matrix mat4.invert)
  function andhverfa(a) {
    const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = a;
    const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10, b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12, b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30, b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32;
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
    if (!det) return null;
    det = 1 / det;
    return [
      (a11 * b11 - a12 * b10 + a13 * b09) * det, (a02 * b10 - a01 * b11 - a03 * b09) * det, (a31 * b05 - a32 * b04 + a33 * b03) * det, (a22 * b04 - a21 * b05 - a23 * b03) * det,
      (a12 * b08 - a10 * b11 - a13 * b07) * det, (a00 * b11 - a02 * b08 + a03 * b07) * det, (a32 * b02 - a30 * b05 - a33 * b01) * det, (a20 * b05 - a22 * b02 + a23 * b01) * det,
      (a10 * b10 - a11 * b08 + a13 * b06) * det, (a01 * b08 - a00 * b10 - a03 * b06) * det, (a30 * b04 - a31 * b02 + a33 * b00) * det, (a21 * b02 - a20 * b04 - a23 * b00) * det,
      (a11 * b07 - a10 * b09 - a12 * b06) * det, (a00 * b09 - a01 * b07 + a02 * b06) * det, (a31 * b01 - a30 * b03 - a32 * b00) * det, (a20 * b03 - a21 * b01 + a22 * b00) * det
    ];
  }
  const margf = (m, x, y, z) => { const w = m[3] * x + m[7] * y + m[11] * z + m[15]; return [(m[0] * x + m[4] * y + m[8] * z + m[12]) / w, (m[1] * x + m[5] * y + m[9] * z + m[13]) / w, (m[2] * x + m[6] * y + m[10] * z + m[14]) / w]; };
  // Veggir hæðarinnar sem kassar í heiminum — sömu mál og 3D teiknar (lengdir um hálfa þykkt, minnst 24 cm á þykkt).
  function veggjaGogn(lyk, vm) {
    const k = vm.kort, H = vm.veggH, lykV = lyk + '|' + V.lykill;     // veggir hæðarinnar NÚNA, í hnitum myndarinnar
    if (V.veggir[lykV]) return V.veggir[lykV];
    const T = TB(), hs = T && T.haedir ? T.haedir() : [], h = hs.find(x => x && x.id === V.haedId);
    const butar = h && T.vinnuButar ? T.vinnuButar(h, { x: k.sx, y: k.sy, w: k.sw || 1e9, h: k.sh || 1e9 }) : [];
    const kassar = butar.map((v, i) => {
      const ax = v[0] * k.f - k.gw / 2, az = v[1] * k.f - k.gh / 2, bx = v[2] * k.f - k.gw / 2, bz = v[3] * k.f - k.gh / 2;
      const L = Math.hypot(bx - ax, bz - az) || 1e-6, th = Math.max(0.8, H * 0.08, (v[4] || 0) * k.f || vm.sjalfg);
      return { i, cx: (ax + bx) / 2, cz: (az + bz) / 2, ux: (bx - ax) / L, uz: (bz - az) / L, hl: (L + th) / 2, ht: th / 2 };
    });
    return (V.veggir[lykV] = { butar, kassar, inv: andhverfa(vm.cam) });
  }
  /* Dílar myndarinnar → staður í dílum FRUMMYNDAR. Geislinn sker fyrst vegg (kassi) eða gólfið (y = 0). Á vegg: tækið
   * fer á flöt hans þeim megin sem smellt var — sama regla og festaAVegg í 3D (fjarlægð = hálf þykkt + 1,5 díll). */
  function afvarpa(lyk, vm, px, py) {
    const G = veggjaGogn(lyk, vm); if (!G.inv) return null;
    const nx = (px + vm.rammi[0]) / vm.heild[0] * 2 - 1, ny = 1 - (py + vm.rammi[1]) / vm.heild[1] * 2;
    const o = margf(G.inv, nx, ny, -1), b = margf(G.inv, nx, ny, 1), d = [b[0] - o[0], b[1] - o[1], b[2] - o[2]];
    if (!(d[1] < -1e-12)) return null;
    let t = -o[1] / d[1], vegg = -1;
    const hH = vm.veggH / 2;
    for (const q of G.kassar) {
      const ox = o[0] - q.cx, oz = o[2] - q.cz;
      const lo = [ox * q.ux + oz * q.uz, o[1] - hH, -ox * q.uz + oz * q.ux], ld = [d[0] * q.ux + d[2] * q.uz, d[1], -d[0] * q.uz + d[2] * q.ux];
      const ext = [q.hl, hH, q.ht];
      let t0 = -Infinity, t1 = Infinity, sker = true;
      for (let j = 0; j < 3; j++) {
        if (Math.abs(ld[j]) < 1e-12) { if (Math.abs(lo[j]) > ext[j]) { sker = false; break; } continue; }
        const ta = (-ext[j] - lo[j]) / ld[j], tb = (ext[j] - lo[j]) / ld[j];
        t0 = Math.max(t0, Math.min(ta, tb)); t1 = Math.min(t1, Math.max(ta, tb));
        if (t0 > t1) { sker = false; break; }
      }
      if (sker && t0 > 0 && t0 < t) { t = t0; vegg = q.i; }
    }
    const k = vm.kort, wx = o[0] + d[0] * t, wz = o[2] + d[2] * t;
    let su = (wx + k.gw / 2) / k.f, sv = (wz + k.gh / 2) / k.f;          // dílar skornu myndarinnar
    if (vegg >= 0) {
      const v = G.butar[vegg], dx = v[2] - v[0], dy = v[3] - v[1], L2 = dx * dx + dy * dy || 1, L = Math.sqrt(L2);
      const tt = Math.max(0, Math.min(1, ((su - v[0]) * dx + (sv - v[1]) * dy) / L2)), qx = v[0] + dx * tt, qy = v[1] + dy * tt;
      let mx = -dy / L, my = dx / L;
      if ((su - qx) * mx + (sv - qy) * my < 0) { mx = -mx; my = -my; }
      const fj = (v[4] || 0) / 2 + 1.5;
      su = qx + mx * fj; sv = qy + my * fj;
    }
    return { u: su + k.sx, v: sv + k.sy, vegg };
  }

  /* ── gámurinn og stýringar ── */
  const takki = (virkt, auka) => 'height:34px!important;padding:0 13px!important;border:0!important;border-radius:0!important;margin:0!important;' +
    'background:' + (virkt ? GULL : DOKKT) + '!important;color:' + (virkt ? '#14120f' : '#fff') + '!important;font:700 12.5px system-ui,sans-serif!important;cursor:pointer;box-shadow:none!important;' + (auka || '');
  const ZK = 'width:42px;height:42px;border-radius:11px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.88);color:#fff;font:700 20px system-ui;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0';
  function still() {
    if (document.getElementById('t445-css')) return;
    const st = document.createElement('style'); st.id = 't445-css';
    st.textContent =
      // 2D-stýringar undir myndinni sjást ekki á meðan (þysjun 2D, stika skurðar, merki utan teikningar)
      '#fp-main.fp-vm-virk>#fp-zoom,#fp-main.fp-vm-virk>#fp-hreinsa-stika,#fp-main.fp-vm-virk>#fp-merki-uti{visibility:hidden!important}' +
      '.fp-simi #fp-vm-zoom button{width:36px!important;height:36px!important}.fp-simi #fp-vm-zoom span{height:36px!important;line-height:36px!important;min-width:46px!important}' +
      // Endurteikna vinstra megin við þysjunina; á síma í næstu línu undir henni (rekst ekki á hæðaflipana)
      '#fp-vm-zoom .fp-vm-endur{order:-1}.fp-simi #fp-vm-zoom{max-width:210px}.fp-simi #fp-vm-zoom .fp-vm-endur{order:1;width:auto!important;padding:0 13px!important}' +
      '#fp-synval button:focus-visible,#fp-vm-zoom button:focus-visible{outline:2px solid ' + GULL + ';outline-offset:-2px}';
    document.head.appendChild(st);
  }
  function tryggjaDom(main) {
    still();
    let g = main.querySelector('#fp-vinnusyn');
    if (!g) {
      g = document.createElement('div'); g.id = 'fp-vinnusyn';
      g.style.cssText = 'position:absolute;inset:0;z-index:7;display:none;background:#e6e9ec;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none';
      g.innerHTML = '<canvas id="fp-vm-strigi" style="position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none"></canvas>' +
        '<div id="fp-vm-stada" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:calc(100% - 40px);padding:11px 15px;border-radius:10px;background:rgba(20,18,15,.88);color:#f1ede4;font:600 13px system-ui,sans-serif;text-align:center;line-height:1.35;display:none;pointer-events:none"></div>' +
        '<div id="fp-vm-zoom" style="position:absolute;right:10px;top:10px;z-index:2;display:flex;flex-wrap:wrap;justify-content:flex-end;align-items:center;gap:5px;font:700 13px system-ui,sans-serif">' +
          '<button type="button" data-z="ut" style="' + ZK + '" aria-label="Minnka" title="Minnka">−</button>' +
          '<span id="fp-vm-pct" style="min-width:52px;text-align:center;padding:0 4px;height:42px;line-height:42px;border-radius:11px;background:rgba(20,18,15,.88);color:#f1ede4">100%</span>' +
          '<button type="button" data-z="inn" style="' + ZK + '" aria-label="Stækka" title="Stækka">+</button>' +
          '<button type="button" data-z="passa" style="' + ZK + ';font-size:16px" aria-label="Passa í glugga" title="Passa í glugga">⤢</button>' +
          '<button type="button" data-a="endurteikna" class="fp-vm-endur" title="Endurteikna: lifandi 3D af hæðinni — ýttu á „Festa“ þar og nýja myndin verður vinnumyndin" style="height:42px;padding:0 15px;border-radius:11px;border:1px solid rgba(255,255,255,.25);background:rgba(20,18,15,.88);color:#fff;font:700 13px system-ui;cursor:pointer;white-space:nowrap">Endurteikna</button></div>' +
        // ÚRELT: veggjum / skurði / teikningu breytt síðan myndin var fest — myndin sést samt, ekkert endurbyggt sjálfkrafa
        '<div id="fp-vm-urelt" role="status" style="position:absolute;left:50%;transform:translateX(-50%);top:60px;z-index:3;display:none;align-items:center;gap:10px;max-width:calc(100% - 20px);padding:6px 6px 6px 12px;border-radius:10px;background:rgba(20,18,15,.9);color:#ffd27a;font:600 12.5px system-ui,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.35)">' +
          '<span>Veggjum breytt síðan myndin var fest</span>' +
          '<button type="button" data-a="endurteikna" style="height:30px;padding:0 12px;border-radius:8px;border:1px solid ' + GULL + ';background:' + GULL + ';color:#14120f;font:700 12.5px system-ui,sans-serif;cursor:pointer;white-space:nowrap">Endurteikna</button></div>' +
        '<div id="fp-vm-hint" style="position:absolute;left:10px;bottom:10px;z-index:2;max-width:calc(100% - 330px);min-width:180px;padding:6px 10px;border-radius:9px;background:rgba(20,18,15,.85);color:#f1ede4;font:500 12px system-ui,sans-serif;line-height:1.35;pointer-events:none;display:none"></div>';
      main.appendChild(g);
      tengja(g);
    }
    V.gamur = g; V.strigi = g.querySelector('#fp-vm-strigi');
    let s = main.querySelector('#fp-synval');
    if (!s) {
      s = document.createElement('div'); s.id = 'fp-synval';
      s.style.cssText = 'position:absolute;right:10px;bottom:10px;z-index:9;display:none;align-items:center;gap:6px';
      s.innerHTML = '<button type="button" id="fp-vm-vista" title="Vista vinnumyndina með tækjunum sem PNG — vinnuskjal" style="' + takki(false, 'border-radius:10px!important;border:1px solid rgba(255,255,255,.25)!important;display:none') + '">Vista mynd</button>' +
        '<div role="group" aria-label="Sýn" style="display:flex;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.25);box-shadow:0 4px 14px rgba(0,0,0,.35)">' +
        '<button type="button" data-syn="mynd" aria-pressed="false" title="Föst mynd ofan frá — settu tækin á hana" style="' + takki(false) + '">Vinnumynd</button>' +
        '<button type="button" data-syn="2d" aria-pressed="false" title="Upprunalega teikningin" style="' + takki(false, 'border-left:1px solid rgba(255,255,255,.18)!important') + '">2D</button>' +
        '<button type="button" data-syn="3d" aria-pressed="false" title="Lifandi þrívídd — snúa, ganga, Designer-3D" style="' + takki(false, 'border-left:1px solid rgba(255,255,255,.18)!important') + '">3D</button></div>';
      main.appendChild(s);
      s.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        e.stopPropagation();
        if (b.id === 'fp-vm-vista') { vistaVinnuskjal(); return; }
        const a = b.dataset.syn, T = TB(), opid3d = !!document.getElementById('fp-3d');
        if (a === '3d') { if (!opid3d && T && T.opna3d) T.opna3d({ haedId: V.haedId }); return; }
        V.val = a === '2d' ? '2d' : null;
        if (a === 'mynd') { delete V.villa[V.haedId + '|' + V.lykill]; const h0 = virkHaed(), vm0 = vmFyrir(h0); if (vm0) delete V.brotin[vmLykill(vm0)]; if (h0) delete V.sjalfReynt[h0.id + '|' + V.lykill]; }
        if (opid3d && T && T.loka3d) T.loka3d();
        stilla(V.modal, true);
      });
    }
    V.synval = s;
  }

  /* ── staðsetning á skjánum ── */
  function skjaHnit(e) {
    const g = V.gamur, r = g.getBoundingClientRect(), zk = g.offsetWidth ? r.width / g.offsetWidth : 1;
    return { x: (e.clientX - r.left) / zk, y: (e.clientY - r.top) / zk, zk, inni: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom };
  }
  function grunnur() {
    const M = V.mynd, g = V.gamur, cw = g.offsetWidth, ch = g.offsetHeight;
    const bs = Math.max(1e-6, Math.min((cw - 20) / M.b, (ch - 20) / M.h));
    return { bs, ox: (cw - M.b * bs) / 2, oy: (ch - M.h * bs) / 2, cw, ch };
  }
  const aSkja = (gr, px, py) => [V.x + (gr.ox + px * gr.bs) * V.s, V.y + (gr.oy + py * gr.bs) * V.s];
  const aMynd = (gr, sx, sy) => [((sx - V.x) / V.s - gr.ox) / gr.bs, ((sy - V.y) / V.s - gr.oy) / gr.bs];
  // Merki (hnit ritilsins = frummynd − hliðrun skurðar) → dílar frummyndar
  function frumHnit(m, M, rymi) {
    if (m.x > 1 || m.y > 1) return [m.x + rymi.x, m.y + rymi.y];
    const k = M.vm.kort; return [k.sx + m.x * (k.sw || 0), k.sy + m.y * (k.sh || 0)];
  }
  // Stærð tákns í skjápunktum við 100 % — sama regla og 2D (eigin stærð merkis, annars stilling hæðar/teikningar).
  function staerd100(m, grunnBreidd) {
    const eigin = Math.round(Number(m && m.staerd));
    if (eigin && isFinite(eigin)) return Math.max(10, Math.min(160, eigin));
    const T = TM();
    if (T && T.sjalfStaerd) return T.sjalfStaerd(grunnBreidd);
    return Math.max(32, Math.min(56, Math.round(grunnBreidd / 12) || 32));
  }
  function plan() { const F = FP(); return F && F.companyId ? F.plans[F.companyId] : null; }
  function teiknaMerkin(x, M, aStad, staerd, valid) {
    const F = FP(), p = plan(), rymi = TB().rymi ? TB().rymi() : { x: 0, y: 0 }, units = (F && F.units) || [];
    const grunnBreidd = V.gamur ? grunnur().bs * M.b : 600;
    ((p && p.markers) || []).forEach(m => {
      if (!m) return;
      const fr = frumHnit(m, M, rymi), sp = aStad(fr[0], fr[1]), s = staerd(staerd100(m, grunnBreidd));
      if (!isFinite(sp[0]) || !isFinite(sp[1])) return;
      if (window.TeiknTakn && TeiknTakn.teiknaMerki) {
        try { TeiknTakn.teiknaMerki(x, m, sp[0], sp[1], s, units); } catch (_) {}
        // „Nýtt · <tegund>"-miðinn (tæki í bið, 434) líka á vinnumyndinni og í vinnuskjalinu
        try { if (TeiknTakn.erNytt && TeiknTakn.erNytt(m) && TeiknTakn.nyttMidi) TeiknTakn.nyttMidi(x, m, sp[0], sp[1], s); } catch (_) {}
      }
      else { x.beginPath(); x.arc(sp[0], sp[1], s / 2, 0, Math.PI * 2); x.fillStyle = m.color || '#c93c1d'; x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke(); }
      if (valid && (m === valid || (!erStimpil(m) && m.unitId === F._selectedUnitId && !(TM() && TM().valid && TM().valid())))) {
        x.beginPath(); x.arc(sp[0], sp[1], s * 0.62 + 4, 0, Math.PI * 2); x.strokeStyle = '#c9a54a'; x.lineWidth = 3; x.stroke();
      }
    });
  }
  function teikna(force) {
    const c = V.strigi, g = V.gamur; if (!c || !g || !V.synilegur) return;
    const cw = g.offsetWidth, ch = g.offsetHeight; if (cw < 2 || ch < 2) return;
    const M = V.mynd, F = FP(), p = plan(), T = TB(), rymi = T && T.rymi ? T.rymi() : { x: 0, y: 0 };
    const r = g.getBoundingClientRect(), dpr = Math.min(3, (window.devicePixelRatio || 1) * (r.width / cw || 1));
    const valid = TM() && TM().valid ? TM().valid() : null;
    const fingur = [cw, ch, dpr, V.s, V.x, V.y, M ? vmLykill(M.vm) : '-', rymi.x, rymi.y, F && F._selectedUnitId, valid && valid.unitId,
      M ? staerd100({}, grunnur().bs * M.b) : 0, window.TeiknTakn && TeiknTakn.fingrafar ? TeiknTakn.fingrafar() : '',
      ((p && p.markers) || []).map(m => m ? [m.unitId, m.x, m.y, m.rot || 0, m.staerd || '', m.sign || '', m.takn || '', m.color || ''].join(':') : '').join('|')].join(';');
    if (!force && fingur === V.teiknad) return;
    V.teiknad = fingur;
    const W = Math.round(cw * dpr), H = Math.round(ch * dpr);
    if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = '#e6e9ec'; x.fillRect(0, 0, cw, ch);
    if (!M) return;
    const gr = grunnur();
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(M.img, V.x + gr.ox * V.s, V.y + gr.oy * V.s, M.b * gr.bs * V.s, M.h * gr.bs * V.s);
    teiknaMerkin(x, M, (u, v) => { const q = varpa(M.vm, u, v); return aSkja(gr, q[0], q[1]); }, s => s * V.s, valid || (F && F._selectedUnitId != null ? {} : null));
    const pct = V.gamur.querySelector('#fp-vm-pct'), t = Math.round(V.s * 100) + '%'; if (pct && pct.textContent !== t) pct.textContent = t;
    if (!V.synt) V.synt = performance.now();
  }
  function thysja(f, mx, my) {
    const g = V.gamur; if (!g) return;
    if (mx == null) { mx = g.offsetWidth / 2; my = g.offsetHeight / 2; }
    const ns = Math.min(12, Math.max(0.5, V.s * f));
    V.x = mx - (mx - V.x) * (ns / V.s); V.y = my - (my - V.y) * (ns / V.s); V.s = ns;
  }
  function finna(e) {
    const M = V.mynd; if (!M) return null;
    const p = skjaHnit(e), gr = grunnur(), pl = plan(), rymi = TB().rymi ? TB().rymi() : { x: 0, y: 0 };
    let best = null, bd = 1e9;
    ((pl && pl.markers) || []).forEach(m => {
      if (!m) return;
      const fr = frumHnit(m, M, rymi), q = varpa(M.vm, fr[0], fr[1]), s = aSkja(gr, q[0], q[1]);
      const d = Math.hypot(p.x - s[0], p.y - s[1]), hit = staerd100(m, gr.bs * M.b) * V.s / 2 + 8;
      if (d <= hit && d <= bd) { bd = d; best = m; }
    });
    return best;
  }
  // Pointer → hnit ritilsins (dílar frummyndar − hliðrun skurðar), eða null utan myndar.
  function hnitUr(e) {
    const M = V.mynd; if (!M || !V.gamur) return null;
    const p = skjaHnit(e); if (!p.inni) return null;
    const gr = grunnur(), q = aMynd(gr, p.x, p.y);
    if (q[0] < -2 || q[1] < -2 || q[0] > M.b + 2 || q[1] > M.h + 2) return null;
    const a = afvarpa(vmLykill(M.vm), M.vm, q[0], q[1]); if (!a || !isFinite(a.u) || !isFinite(a.v)) return null;
    const r = TB().rymi ? TB().rymi() : { x: 0, y: 0 };
    return { x: Math.round(a.u - r.x), y: Math.round(a.v - r.y), vegg: a.vegg };
  }

  /* ── atburðir á myndinni ── */
  function tengja(g) {
    const c = g.querySelector('#fp-vm-strigi');
    // newfeatures færir 2D-strigann með mousedown á #fp-main — ekki undir myndinni
    g.addEventListener('mousedown', e => e.stopPropagation());
    g.addEventListener('click', e => { const b = e.target.closest('[data-a="endurteikna"]'); if (!b) return; e.stopPropagation(); endurteikna(); });
    g.querySelector('#fp-vm-zoom').addEventListener('click', e => {
      const b = e.target.closest('[data-z]'); if (!b) return; e.stopPropagation();
      if (b.dataset.z === 'passa') { V.s = 1; V.x = 0; V.y = 0; } else thysja(b.dataset.z === 'inn' ? 1.35 : 1 / 1.35);
    });
    c.addEventListener('wheel', e => { e.preventDefault(); e.stopPropagation(); const p = skjaHnit(e); thysja(e.deltaY < 0 ? 1.15 : 0.87, p.x, p.y); }, { passive: false });
    c.addEventListener('contextmenu', e => {
      e.preventDefault(); e.stopPropagation();
      const hit = finna(e), T = TM();
      if (T && T.opnaValmynd) T.opnaValmynd(e, hit);
    });
    c.addEventListener('pointerdown', e => {
      if (e.button === 2 || !V.mynd) return;
      e.preventDefault();
      try { c.setPointerCapture(e.pointerId); } catch (_) {}
      V.fingur.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (V.fingur.size >= 2) {
        const q = V.p; if (q) { clearTimeout(q.lp); if (q.hit && q.dregid) { q.hit.x = q.fraX; q.hit.y = q.fraY; } }
        V.p = null; V.klipa = 0; V.midja = null; return;
      }
      const hit = finna(e);
      V.p = { id: e.pointerId, x0: e.clientX, y0: e.clientY, hit, fraX: hit ? hit.x : 0, fraY: hit ? hit.y : 0, dregid: false, lp: 0 };
      // löng ýting á tæki = valmyndin (Snúa · Breyta í · Fjarlægja), eins og í 2D
      if (hit) V.p.lp = setTimeout(() => { const q = V.p; if (!q || q.dregid || q.hit !== hit) return; V.p = null; const T = TM(); if (T && T.opnaValmynd) T.opnaValmynd({ clientX: q.x0, clientY: q.y0 }, hit); }, 480);
      c.style.cursor = 'grabbing';
    });
    c.addEventListener('pointermove', e => {
      const f = V.fingur.get(e.pointerId);
      if (!f) { if (V.mynd && e.pointerType === 'mouse') { const h = finna(e), T = TM(); c.style.cursor = h ? 'grab' : ((T && T.vopn && T.vopn()) || FP()._selectedUnitId != null ? 'crosshair' : 'default'); } return; }
      const zk = skjaHnit(e).zk, dx = (e.clientX - f.x) / zk, dy = (e.clientY - f.y) / zk;
      f.x = e.clientX; f.y = e.clientY;
      if (V.fingur.size >= 2) {
        const [a, b] = [...V.fingur.values()], fj = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const p = skjaHnit({ clientX: mx, clientY: my });
        if (V.klipa) thysja(fj / V.klipa, p.x, p.y);
        if (V.midja) { V.x += (mx - V.midja[0]) / zk; V.y += (my - V.midja[1]) / zk; }
        V.klipa = fj; V.midja = [mx, my]; return;
      }
      const q = V.p; if (!q || q.id !== e.pointerId) return;
      if (!q.dregid && Math.hypot(e.clientX - q.x0, e.clientY - q.y0) > 5) { q.dregid = true; clearTimeout(q.lp); }
      if (!q.dregid) return;
      if (q.hit) { const t = hnitUr(e); if (t) { q.hit.x = t.x; q.hit.y = t.y; } }
      else { V.x += dx; V.y += dy; }
    });
    const upp = e => {
      V.fingur.delete(e.pointerId); if (V.fingur.size < 2) { V.klipa = 0; V.midja = null; }
      c.style.cursor = '';
      const q = V.p; if (!q || q.id !== e.pointerId) return;
      V.p = null; clearTimeout(q.lp);
      if (e.type === 'pointercancel') { if (q.hit && q.dregid) { q.hit.x = q.fraX; q.hit.y = q.fraY; } return; }
      if (q.dregid) {
        if (!q.hit) return;
        const t = hnitUr(e); if (t) { q.hit.x = t.x; q.hit.y = t.y; }
        const T = TM();
        if (T && T.faert) T.faert(q.hit, q.fraX, q.fraY);
        else if (T) { try { TB().samstilla(); } catch (_) {} T.vistaAdThjoni(); }
        return;
      }
      smellur(e, q.hit);
    };
    c.addEventListener('pointerup', upp); c.addEventListener('pointercancel', upp);
  }
  // Smellur á myndina — sama röð og smellur á 2D-strigann (433 onCanvasClick): merki → velja það; vopnaður stimpill →
  // setja hann; valið tæki í listanum → setja / færa það hingað.
  function smellur(e, hit) {
    const T = TM(), F = FP(); if (!T || !F) return;
    if (hit) { T.velja(hit); return; }
    const p = hnitUr(e); if (!p) return;
    const vopn = T.vopn && T.vopn();
    if (vopn) { T.setjaEitt(vopn, p.x, p.y); T.vistaAdThjoni(); return; }
    if (T.valid && T.valid()) T.velja(null);
    const uid = F._selectedUnitId;
    if (uid == null) return;
    T.setjaTaeki(uid, p.x, p.y);
    T.vistaAdThjoni();
    segja('Staðsetning merkt ✓' + (p.vegg >= 0 ? ' — á vegg' : ''));
  }

  /* ── myndin: sækja vistaða, annars smíða einu sinni ── */
  // Minni lotunnar: strigi í fullri stærð er ~20 MB — aðeins sex nýjustu myndirnar geymast (sú sýnda alltaf).
  function geymaIMinni(lyk, M) {
    delete V.myndir[lyk]; V.myndir[lyk] = M;
    const lyklar = Object.keys(V.myndir);
    if (lyklar.length > 6) lyklar.slice(0, lyklar.length - 6).forEach(k => { if (k !== V.lykill) delete V.myndir[k]; });
  }
  function saekja(key, vm) {
    V.sokn[key] = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { delete V.sokn[key]; geymaIMinni(key, { img, vm, b: vm.b, h: vm.h }); };
    img.onerror = () => { delete V.sokn[key]; V.brotin[key] = true; console.warn('[445] vistuð vinnumynd fannst ekki', vm.url); };
    img.src = vm.url;
  }
  // Ný föst mynd úr 3D (fyrsta mynd sjálfkrafa, eða „Festa"): sýnd STRAX úr striganum, svo í fötuna og á þjóninn.
  async function nyFestMynd(h, r, hvernig) {
    const cid = FP().companyId, hid = h.id, url0 = h.image_url, lyk = lykillHaedar(h);
    const vm = { utgafa: UTGAFA, lykill: lyk, cam: r.cam, heild: r.heild, rammi: r.rammi, b: r.b, h: r.h, kort: r.kort, veggH: r.veggH, sjalfg: r.sjalfg,
      frum: r.frum || h.frum || null, fest: hvernig, t: new Date().toISOString() };
    geymaIMinni(vmLykill(vm), { img: r.strigi, vm, b: r.b, h: r.h });
    V.nyjar[hid] = vm;
    try { await geyma(cid, hid, url0, lyk, r.strigi, vm); return true; }
    catch (e) { console.warn('[445] vinnumyndin vistaðist ekki á þjóninn', e); segja('Vinnumyndin sést hér en vistaðist ekki á þjóninn (' + ((e && e.message) || e) + ')'); return false; }
  }
  // FYRSTA mynd tilbúinnar hæðar: smíðuð í huldu 3D (383) og fest sjálfkrafa — einu sinni á hvern lykil í lotunni.
  async function smida(h) {
    const hid = h.id, lyk = V.lykill, t0 = performance.now();
    V.smidar[hid] = true; V.sjalfReynt[hid + '|' + lyk] = true;
    try {
      const r = await TB().smidaVinnumynd(hid, { hamark: HAMARK });
      V.smidadMs = Math.round(performance.now() - t0); V.tima = r.tima || null;
      delete V.smidar[hid];
      const hNu = (TB().haedir() || []).find(x => x && x.id === hid) || h;
      await nyFestMynd(hNu, r, 'sjalfvirkt');
    } catch (e) {
      delete V.smidar[hid];
      if (!V.nyjar[hid]) { V.villa[hid + '|' + lyk] = (e && e.message) || String(e); console.warn('[445] vinnumynd', e); segja('Vinnumyndin tókst ekki (' + V.villa[hid + '|' + lyk] + ') — 2D sýnd.'); }
    }
  }
  // „FESTA" í 3D-sýninni: hæðin sem er sýnd (ein), annars virka hæðin, annars sú neðsta — ofan frá, án tækja.
  async function festa(hid) {
    const T = TB(), syn = T && T.syn3d ? T.syn3d() : null;
    if (!syn || !syn.fastMynd) { segja('3D-sýnin er ekki tilbúin'); return false; }
    if (V.festir) return false;
    const ids = syn.haedIds ? syn.haedIds() : [], synd = syn.synilegar ? syn.synilegar() : ids, virk = virkHaed();
    hid = hid || (synd.length === 1 ? synd[0] : (virk && ids.indexOf(virk.id) >= 0 ? virk.id : ids[0]));
    const h = (T.haedir() || []).find(x => x && x.id === hid);
    if (!h) { segja('Fann ekki hæðina sem á að festa'); return false; }
    V.festir = true;
    try {
      let r = null;
      try { r = syn.fastMynd({ haedId: hid, hamark: HAMARK, anTaekja: true }); } catch (e) { console.warn('[445] festa', e); }
      if (!r) { segja('Gat ekki fest myndina — reyndu aftur'); return false; }
      V.val = null;
      Object.keys(V.villa).forEach(k => { if (k.indexOf(hid + '|') === 0) delete V.villa[k]; });
      if (T.loka3d) T.loka3d();
      segja('Vinnumynd fest' + (h.nafn ? ' — ' + h.nafn : '') + '. Teikningin opnast nú strax á henni.');
      return await nyFestMynd(h, r, 'festa');
    } finally { V.festir = false; }
  }
  function endurteikna() {
    const T = TB(); if (!T || !T.opna3d) return;
    T.opna3d({ haedId: V.haedId });
    segja('Ýttu á „Festa" þegar sýnin er eins og þú vilt — þá verður hún vinnumynd hæðarinnar.');
  }
  // Myndin í fötuna, og vinnumynd hæðarinnar í FERSKA röð þjónsins um TeiknVistun.skrifa — aðeins hún breytist.
  async function geyma(cid, hid, url0, lyk, strigi, vm) {
    if (!window.DB || !DB.sb) throw new Error('engin tenging');
    const blob = await new Promise((res, rej) => { try { strigi.toBlob(b => (b ? res(b) : rej(new Error('myndin varð ekki til'))), 'image/jpeg', GAEDI); } catch (e) { rej(e); } });
    const slod = 'vinnumynd/' + cid + '/' + hid + '-' + lyk + '.jpg';
    const up = await DB.sb.storage.from(FATA).upload(slod, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' });
    if (up && up.error) throw new Error('upphleðsla: ' + (up.error.message || up.error));
    const pub = DB.sb.storage.from(FATA).getPublicUrl(slod);
    vm.url = pub && pub.data && pub.data.publicUrl;
    if (!vm.url) throw new Error('engin slóð á myndina');
    // Sama slóð þegar hæðin er fest aftur án breytinga á veggjum (Endurteikna → Festa): skráin er yfirskrifuð en
    // vafrar geyma hana í ár (cacheControl) — aðrar vélar sæju gömlu myndina. Útgáfan í slóðinni = tími festingar.
    vm.url += (vm.url.indexOf('?') < 0 ? '?' : '&') + 'v=' + (Date.parse(vm.t) || Date.now()).toString(36);
    vm.kb = Math.round(blob.size / 1024);
    const sama = x => x && x.id === hid && (x.image_url || null) === (url0 || null) && lykillHaedar(x) === lyk;
    const T = TB(), heima = T && T.haedir && FP() && FP().companyId === cid ? T.haedir().find(sama) : null;
    if (heima) heima.vinnumynd = vm;                                      // næstu skrif héðan (433, Vista) bera hana með
    const r = await DB.sb.from('teikning_bord').select('company_id,markers,image_url,haedir,updated_at').eq('company_id', cid).limit(1);
    const row = r && !r.error && r.data && r.data[0];
    if (!row || !Array.isArray(row.haedir) || !row.haedir.some(sama)) return false;   // hæðin ekki á þjóninum enn — fer með næstu vistun
    const haedir = row.haedir.map(x => (sama(x) ? Object.assign({}, x, { vinnumynd: vm }) : x));
    const nyr = { company_id: cid, markers: (haedir[0] && haedir[0].markers) || row.markers || [], image_url: (haedir[0] && haedir[0].image_url) || row.image_url || null, haedir, updated_at: new Date().toISOString() };
    const s = window.TeiknVistun && TeiknVistun.skrifa ? await TeiknVistun.skrifa(cid, nyr) : { error: new Error('vistunarleiðin (375) vantar') };
    if (s && s.error) throw new Error(s.error.message || String(s.error));
    return true;
  }
  const SMIDA_TXT = 'Smíða vinnumynd hæðarinnar úr veggjunum — aðeins í þetta eina skipti, svo opnast hún strax.';
  function tryggjaMynd(h) {
    const vm = vmFyrir(h);
    if (vm) {
      const key = vmLykill(vm);
      V.urelt = vm.lykill !== V.lykill;        // veggjum, skurði eða teikningu breytt síðan hún var fest
      const til = V.myndir[key]; if (til) return til;
      if (!V.brotin[key]) {
        if (V.sokn[key]) { V.stadaTexti = 'Opna vinnumynd…'; return null; }
        if (vm.url) { V.stadaTexti = 'Opna vinnumynd…'; saekja(key, vm); return null; }
      }
      // myndin fannst ekki í fötunni: eins og engin mynd væri — fyrsta smíði ef hæðin er tilbúin, annars 2D
      if (!tilbuin(h)) { V.villa[h.id + '|' + V.lykill] = 'vistaða myndin fannst ekki'; return null; }
    }
    V.urelt = false;
    if (V.smidar[h.id]) { V.stadaTexti = SMIDA_TXT; return null; }
    if (!tilbuin(h) || V.sjalfReynt[h.id + '|' + V.lykill]) return null;
    // Engin mynd: smíða og festa — en ekki fyrr en röð þjónsins er komin (önnur vél gæti átt hana), mest 6 s bið.
    const T = TB(), cid = FP().companyId;
    if (T.rodKomin && T.rodKomin() !== cid && performance.now() - V.opnad < 6000) { V.stadaTexti = 'Sæki teikninguna…'; return null; }
    V.stadaTexti = SMIDA_TXT;
    smida(h);
    return null;
  }

  /* ── stýring: hvaða sýn, á hvaða hæð ── */
  function modalOpid() {
    const m = document.getElementById('modal-floorplan');
    if (!m || !m.isConnected) return null;
    if (m.classList.contains('open')) return m;
    if (m.style.display && m.style.display !== 'none') return m;
    return null;
  }
  function virkHaed() {
    const T = TB(), F = FP(); if (!T || !T.haedir || !F || !F.companyId) return null;
    const hs = T.haedir(); return (hs && hs[T.virk ? T.virk() : 0]) || null;
  }
  function hamur() {
    if (!V.tilbuin || V.val === '2d' || V.villa[V.haedId + '|' + V.lykill]) return '2d';
    const T = TB(); if (T && T.hamur && T.hamur()) return '2d';
    return 'mynd';
  }
  function stilla(m, strax) {
    const F = FP(), T = TB();
    if (!m || !F || !F.companyId || !T || !T.haedir) return;
    const main = m.querySelector('#fp-main'); if (!main) return;
    if (V.modal !== m) {
      // nýr gluggi: sýnin sjálfgefin aftur (valið er ekki vistað), og myndavalið hreint
      V.modal = m; V.val = null; V.hRef = null; V.sig = null; V.haedId = null; V.s = 1; V.x = 0; V.y = 0; V.p = null; V.fingur.clear();
      V.villa = {}; V.brotin = {}; V.sjalfReynt = {}; V.teiknad = ''; V.opnad = performance.now(); V.synt = 0; V.hint = 0; V.gamur = null; V.synval = null;
    }
    tryggjaDom(main);
    const h = virkHaed();
    const sig = h ? [h, h.image_url, h.skurdur, h.veggjaLinur, (h.veggir || []).length, h.leidrett, h.vinnumynd, h.pdfVeggir, h.pdfFlokkar] : [null];
    if (!V.sig || sig.length !== V.sig.length || sig.some((x, i) => x !== V.sig[i])) {
      const hid = h && h.id;
      if (hid !== V.haedId) { V.s = 1; V.x = 0; V.y = 0; V.p = null; }
      V.sig = sig; V.hRef = h; V.haedId = hid; V.lykill = h ? lykillHaedar(h) : '';
    }
    // sýnd á mynd: hæð sem á fasta mynd (líka handfesta á skönnun), eða tilbúin hæð sem fær hana sjálfkrafa
    V.tilbuin = !!h && (tilbuin(h) || !!vmFyrir(h));
    const ham = hamur(), opid3d = !!document.getElementById('fp-3d');
    V.mynd = ham === 'mynd' ? tryggjaMynd(h) : null;
    const synilegur = ham === 'mynd';
    if (V.synilegur !== synilegur || strax) {
      V.synilegur = synilegur; V.teiknad = '';
      V.gamur.style.display = synilegur ? 'block' : 'none';
      main.classList.toggle('fp-vm-virk', synilegur);
    }
    // stöðutexti meðan myndin er sótt eða smíðuð
    const st = V.gamur.querySelector('#fp-vm-stada'), stTxt = synilegur && !V.mynd ? V.stadaTexti : '';
    if (st._t !== stTxt) { st._t = stTxt; st.textContent = stTxt; st.style.display = stTxt ? 'block' : 'none'; }
    // úrelt mynd: lína efst, undir hæðaflipunum
    const ur = V.gamur.querySelector('#fp-vm-urelt'), urSyn = synilegur && V.mynd && V.urelt && !opid3d ? 'flex' : 'none';
    if (ur.style.display !== urSyn) {
      ur.style.display = urSyn;
      if (urSyn === 'flex') { const fl = main.querySelector('#fp-haedir'), mr = main.getBoundingClientRect(), zk = main.offsetWidth ? mr.width / main.offsetWidth : 1; ur.style.top = Math.max(60, fl ? (fl.getBoundingClientRect().bottom - mr.top) / zk + 8 : 60) + 'px'; }
    }
    // leiðsögn í 8 s þegar myndin sést fyrst í glugganum
    const hint = V.gamur.querySelector('#fp-vm-hint');
    if (synilegur && V.mynd && !V.hint) {
      // mjór gluggi (sími): leiðsögnin fer upp fyrir sýnarvalið í stað þess að liggja undir „Vista mynd"
      const mjor = main.offsetWidth < 640;
      hint.style.bottom = mjor ? '58px' : '10px'; hint.style.maxWidth = mjor ? 'calc(100% - 20px)' : 'calc(100% - 330px)'; hint.style.minWidth = mjor ? '0' : '180px';
      V.hint = performance.now(); hint.textContent = 'Veldu tæki eða merki á ræmunni og smelltu á myndina · dragðu tæki til að færa · smelltu á tæki til að snúa, breyta eða fjarlægja'; hint.style.display = 'block'; }
    if (V.hint && hint.style.display !== 'none' && performance.now() - V.hint > 8000) hint.style.display = 'none';
    // sýnarvalið: aðeins á tilbúinni hæð
    const sv = V.synval, virkt = opid3d ? '3d' : ham;
    const svSyn = V.tilbuin ? 'flex' : 'none';
    if (sv.style.display !== svSyn) sv.style.display = svSyn;
    sv.querySelectorAll('[data-syn]').forEach(b => {
      const a = b.dataset.syn === virkt;
      if (b.getAttribute('aria-pressed') !== String(a)) {
        b.setAttribute('aria-pressed', String(a));
        b.style.setProperty('background', a ? GULL : DOKKT, 'important'); b.style.setProperty('color', a ? '#14120f' : '#fff', 'important');
      }
    });
    const vb = sv.querySelector('#fp-vm-vista'), vbSyn = synilegur && V.mynd && !opid3d ? 'inline-flex' : 'none';
    if (vb.style.display !== vbSyn) { vb.style.setProperty('display', vbSyn); vb.style.setProperty('align-items', 'center'); }
    if (synilegur) teikna(strax);
  }
  function ramma() {
    V.raf = 0;
    const m = modalOpid();
    if (!m) { V.modal = null; return; }
    try { stilla(m); } catch (e) { console.warn('[445]', e); }
    V.raf = requestAnimationFrame(ramma);
  }
  function vekja() { if (!V.raf && modalOpid()) V.raf = requestAnimationFrame(ramma); }

  /* ── vinnuskjal: myndin og tækin í einni PNG ── */
  function vistaVinnuskjal() {
    const M = V.mynd; if (!M) return;
    try {
      const c = document.createElement('canvas'); c.width = M.b; c.height = M.h;
      const x = c.getContext('2d');
      x.drawImage(M.img, 0, 0, M.b, M.h);
      // tákn í sömu stærð miðað við húsið og á skjánum við 100 %
      const gr = grunnur();
      teiknaMerkin(x, M, (u, v) => varpa(M.vm, u, v), s => s / gr.bs, null);
      const haus = document.querySelector('#modal-floorplan h1, #modal-floorplan h2, #modal-floorplan h3');
      const stadur = String((haus && haus.textContent) || '').replace(/^\s*Teikning\s*[—–-]\s*/, '').trim();
      const h = virkHaed(), d = new Date();
      const dags = String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();
      const nafn = ['Vinnuskjal', stadur, h && h.nafn, dags].filter(Boolean).join(' ').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + '.png';
      c.toBlob(b => {
        if (!b) { segja('Gat ekki vistað mynd'); return; }
        const url = URL.createObjectURL(b), a = document.createElement('a');
        a.href = url; a.download = nafn; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        segja('Myndin vistaðist: ' + nafn);
      }, 'image/png');
    } catch (e) { segja('Gat ekki vistað mynd: ' + ((e && e.message) || e)); }
  }

  /* ── fara að merki (smellur á tæki í listanum) ── */
  function faraAd(px, py) {
    const M = V.mynd; if (!M || px == null) return;
    const rymi = TB().rymi ? TB().rymi() : { x: 0, y: 0 }, fr = frumHnit({ x: px, y: py }, M, rymi), q = varpa(M.vm, fr[0], fr[1]), gr = grunnur();
    if (V.s < 1.6) V.s = 1.8;
    V.x = gr.cw / 2 - (gr.ox + q[0] * gr.bs) * V.s; V.y = gr.ch / 2 - (gr.oy + q[1] * gr.bs) * V.s;
  }

  window.TeiknVinnumynd = {
    // 433 strigaHnit: undefined = myndin ekki sýnd (2D ræður) · null = utan myndar · { x, y } = hnit ritilsins
    hnit: e => (synd() ? hnitUr(e) : undefined),
    synd,
    faraAd,
    varpa: (vm, u, v) => varpa(vm, u, v),
    afvarpa: (vm, px, py) => afvarpa(vmLykill(vm), vm, px, py),
    festa,
    endurteikna,
    lykill: h => lykillHaedar(h),
    tilbuin,
    // prófanir: staðan eins og hún er
    stada: () => ({
      ham: V.modal ? hamur() : null, opid3d: !!document.getElementById('fp-3d'), haedId: V.haedId, lykill: V.lykill, tilbuin: V.tilbuin,
      mynd: !!V.mynd, synd: synd(), urelt: !!(V.mynd && V.urelt), villa: V.villa[V.haedId + '|' + V.lykill] || null, smidar: !!V.smidar[V.haedId], opnad: V.opnad, synt: V.synt, smidadMs: V.smidadMs, tima: V.tima || null,
      vm: V.mynd ? V.mynd.vm : null, skjar: V.mynd && V.gamur ? (() => { const r = V.gamur.getBoundingClientRect(), gr = grunnur(), zk = r.width / V.gamur.offsetWidth; return { left: r.left, top: r.top, zk, bs: gr.bs, ox: gr.ox, oy: gr.oy, s: V.s, x: V.x, y: V.y }; })() : null
    })
  };
  function synd() { return !!(V.gamur && V.gamur.isConnected && V.synilegur && !document.getElementById('fp-3d')); }

  setInterval(vekja, 250);
  const vakt = () => { try { new MutationObserver(vekja).observe(document.body, { childList: true }); } catch (_) {} };
  if (document.body) vakt(); else document.addEventListener('DOMContentLoaded', vakt);
})();
