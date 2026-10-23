/* === TEIKNING: „HLAÐA UPP" VISTAST Á ÞJÓNINN (480) ==================================
 *
 * Agnar 23.10.2026 („er hægt að opna á það að setja inn teikningar" · „ég setti inn en það virðist hafa bara verið í tab"). Hlaða upp (scanner.js
 * handleUpload) bjó til blob:-slóð sem lifir aðeins í flipanum; 375/383 smækkuðu hana í 1600 px dataURL við „Vista" (óskörp, bólgið borð, og
 * TurboPaint / 3D geta ekki opnað data:/blob:). Sveitarfélög sem eiga engar rafrænar teikningar (Borgarbyggð) áttu enga leið inn.
 *
 * NÚ: skráin (JPG/PNG/PDF fyrsta síða) er afkóðuð, smækkuð í mest 6000 px á lengri hlið og hlaðið STRAX upp í Supabase Storage
 * (turbopaint/teikning-upp/<félag>/…jpg, opinber slóð). Hæðin fær slóðina sem image_url og borðið vistast sjálfkrafa (TeiknVistun.skrifa — sama leið og
 * „Opna í TurboPaint"), svo teikningin er komin á staðinn og á allar vélar áður en glugganum er lokað. Skrár sem vafrinn getur ekki afkóðað
 * (TIFF) fara gömlu leiðina.
 * ============================================================================== */
(() => {
  if (window.__teiknHladaUpp) return;
  window.__teiknHladaUpp = true;
  const MAX = 6000, HAMARK_MB = 40, FATA = 'turbopaint';
  const segja = (t, villa) => { try { if (window.showToast) showToast(t, !!villa); else if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };
  const slug = n => String(n || 'teikning').replace(/\.[a-z0-9]+$/i, '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'teikning';
  const bida = ms => new Promise(r => setTimeout(r, ms));

  function pdfjs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = () => { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; } catch (_) {} res(window.pdfjsLib); };
      s.onerror = () => rej(new Error('pdf.js náðist ekki'));
      document.head.appendChild(s);
    });
  }

  // skrá → canvas (≤ MAX px á lengri hlið, hvítur grunnur)
  async function iCanvas(file) {
    const erPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (erPdf) {
      const lib = await pdfjs(), pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise, sida = await pdf.getPage(1);
      const v1 = sida.getViewport({ scale: 1 }), k = Math.min(MAX / Math.max(v1.width, v1.height), 8), vp = sida.getViewport({ scale: k });
      const c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height);
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      await sida.render({ canvasContext: x, viewport: vp }).promise;
      return c;
    }
    const bm = await createImageBitmap(file);
    const k = Math.min(1, MAX / Math.max(bm.width, bm.height));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bm.width * k)); c.height = Math.max(1, Math.round(bm.height * k));
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(bm, 0, 0, c.width, c.height);
    try { bm.close(); } catch (_) {}
    return c;
  }

  const hladaMynd = url => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('myndin hlóðst ekki')); i.src = url; });

  async function vistaBord(cid) {
    const TB = window.TeiknBord, TV = window.TeiknVistun;
    if (!TB || !TB.samstilla || !TB.haedir || !TV || !TV.skrifa) return false;
    TB.samstilla();
    const hs = TB.haedir();
    if (!hs || !hs.length || hs.some(h => /^(blob|data):/.test(String(h.image_url || '')))) return false;
    const gogn = JSON.parse(JSON.stringify(hs)); gogn.forEach(h => { delete h.pdfReynt; });
    const r = await TV.skrifa(cid, { company_id: cid, markers: gogn[0].markers, image_url: gogn[0].image_url || null, haedir: gogn, updated_at: new Date().toISOString() });
    return !(r && r.error);
  }

  async function hladaUpp(inp, gamla) {
    const FP = window.FloorPlan, f = inp && inp.files && inp.files[0];
    if (!f) return;
    const cid = FP && FP.companyId;
    if (!cid || !window.DB || !DB.sb) return gamla(inp);
    if (f.size > HAMARK_MB * 1024 * 1024) { segja('Hámark skráarstærðar er ' + HAMARK_MB + ' MB', true); return; }
    if (/\.tiff?$/i.test(f.name) || /tiff/i.test(f.type)) return gamla(inp);            // vafrinn les ekki TIFF — gamla leiðin
    segja('Hleð upp teikningunni… (stór skrá getur tekið smástund)');
    try {
      // glugginn er enn að hlaða gömlu myndinni hæðarinnar (stór skönnun): sú mynd kæmi annars á eftir okkar og yfirskrifaði hana
      for (let i = 0; i < 60 && !FP.bgImage; i++) {
        const h0 = window.TeiknBord && TeiknBord.haedir && TeiknBord.haedir()[TeiknBord.virk ? TeiknBord.virk() : 0];
        if (!h0 || !h0.image_url) break;
        await bida(500);
      }
      const c = await iCanvas(f);
      const blob = await new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('myndin varð ekki til'))), 'image/jpeg', 0.9));
      const slod = 'teikning-upp/' + cid + '/' + Date.now().toString(36) + '-' + slug(f.name) + '.jpg';
      const up = await DB.sb.storage.from(FATA).upload(slod, blob, { contentType: 'image/jpeg', upsert: true, cacheControl: '31536000' });
      if (up && up.error) throw new Error(up.error.message || 'upphleðsla mistókst');
      const pub = DB.sb.storage.from(FATA).getPublicUrl(slod), url = pub && pub.data && pub.data.publicUrl;
      if (!url) throw new Error('engin slóð á myndina');
      const img = await hladaMynd(url);
      const dm = document.getElementById('fp-drop-msg'); if (dm) dm.style.display = 'none';
      if (!FP.plans[cid]) FP.plans[cid] = { markers: [], imageUrl: url }; else FP.plans[cid].imageUrl = url;
      FP.bgImage = img;
      const cv = document.getElementById('fp-canvas'); if (cv) cv.style.display = 'block';
      try { FP._renderCanvas(); FP._renderPanel(); } catch (_) {}
      // 383 (beita) setur h.image_url = slóðin á næsta ramma — bíða eftir því áður en borðið vistast
      for (let i = 0; i < 12; i++) { await bida(250); const h = window.TeiknBord && TeiknBord.haedir && TeiknBord.haedir()[TeiknBord.virk ? TeiknBord.virk() : 0]; if (h && h.image_url === url) break; }
      // ný teikning á hæð sem átti aðra: fasta vinnumyndin (og „leiðrétt“-merkið) áttu við gömlu myndina — annars sést gamla teikningin áfram
      try { const hh = window.TeiknBord && TeiknBord.haedir()[TeiknBord.virk ? TeiknBord.virk() : 0]; if (hh && (hh.vinnumynd || hh.leidrett)) { delete hh.vinnumynd; delete hh.leidrett; } } catch (_) {}
      const vistad = await vistaBord(cid).catch(() => false);
      segja(vistad ? '✓ Teikningin er vistuð á staðinn (' + c.width + '×' + c.height + ' px) — komin á allar vélar.' : '✓ Teikningin er í geymslu — ýttu á „Vista" til að festa hana á staðinn.');
    } catch (e) {
      console.warn('[480] upphleðsla', e);
      segja('Náði ekki að hlaða upp: ' + ((e && e.message) || e), true);
    } finally { try { inp.value = ''; } catch (_) {} }
  }

  function tengja() {
    const FP = window.FloorPlan;
    if (!FP || typeof FP.handleUpload !== 'function' || FP.handleUpload.__480) return !!(FP && FP.handleUpload && FP.handleUpload.__480);
    const gamla = FP.handleUpload.bind(FP);
    const ny = function (inp) { return hladaUpp(inp, gamla); };
    ny.__480 = true;
    FP.handleUpload = ny;
    return true;
  }
  if (!tengja()) { const t = setInterval(() => { if (tengja()) clearInterval(t); }, 500); setTimeout(() => clearInterval(t), 60000); }
  window.TeiknHladaUpp = { hladaUpp, vistaBord };
})();
