/* === BRUNAKERFI ÞJÓNUSTUSÍÐA FYRIRTÆKIS (2026-07-21) ===
 *
 * Ósk Agnars (skjámyndir m/ rauðum hring): smellur á fyrirtækjaröð í
 * Brunakerfi yfirlit (272) á að opna SÉRSTAKA brunakerfis-síðu fyrirtækisins —
 * hliðstæðu slökkvitækja-vinnusíðunnar — í stað almenna fyrirtækjaspjaldsins.
 *
 * Á síðunni (allt valið í spurningu 2026-07-21):
 *   • Haus: nafn/kt/aðsetur + tengiliðir & samskipti (hringja/senda) +
 *     minnispunktur sem vistast miðlægt (app_settings.brunakerfi_co_notes[id])
 *     — NB: EKKI `brunakerfi_notes` (patch 147 á þann lykil sem STRING-glósu;
 *     tveir ólíkt-týpaðir skrifarar á sama lykli => deepMerge no-op => „vistast ekki")
 *   • Skýrslur: skoðunarskýrslur úr appinu (drög/lokið → opna/PDF/eyða) OG
 *     eldri söfnuð skjöl úr customer_documents (Drive/storage) eftir árum
 *     + „＋ Ný skoðunarskýrsla"
 *   • Búnaðarskrá kerfisins: sjálfkrafa úr nýjustu skýrslu (teljarar + aðalstöð)
 *   • Verð / reikningsyfirlit: kostnaður úr verð-línum skýrslanna (VSK 24%)
 *     + 🏷 verðlistinn
 *
 * Röð-smellur er gripinn í CAPTURE-fasa á view-inu svo 272-hegðunin (almenna
 * spjaldið) víki; ár-hlekkir og 📋/🏷 hnappar virka óbreytt. Almenna spjaldið
 * er áfram aðgengilegt gegnum „Fyrirtækjaspjald →" hlekkinn.
 *
 * Notar window.BrunakerfiSkyrsla (patch 273): openForm + openPriceEditor.
 * Public: window.BrunakerfiFyrirtaeki = { open, reload }
 */
(() => {
  if (window.__bkCompanyInstalled) return;
  window.__bkCompanyInstalled = true;

  const VAT_PCT = 24;
  const LOGO_PATH = '/img/brunaholf-logo.png';
  const BUN_LABELS = ['Stjórnstöð', 'Boðbúnaður', 'Reykskynjarar', 'Hitaskynjarar', 'Handboðar', 'Bjöllur / Sírenur', 'Rafhlöður'];

  let C = null;          // { co, reports, docs, note }
  // 21.09.2026: útlitsval árs-blokkanna (opið/lokað, ⋯ opið) — lifir yfir endurteikningar, núllast þegar skipt er um félag.
  let _arOpid = {}, _arMeira = {}, _arFelag = null, _foldVal = {}, _addOpid = false;
  let _noteT = null, _notePending = null;

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function num(v) { const s = String(v == null ? '' : v).replace(/\s/g, '').replace(/\.(?=\d{3}(?:[.,]|$))/g, '').replace(',', '.'); const n = parseFloat(s); return isFinite(n) ? n : null; }   // 30.09.2026: 16.670 = 16670 (þúsundapunktur), 1,5 = 1.5
  // Birting í reit: heiltala með þúsundapunkti (16.670), tugabrot með kommu; ótölulegt óbreytt.
  function fmtInn(v) { const n = num(v); if (n == null) return String(v == null ? '' : v); return Number.isInteger(n) ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') : String(n).replace('.', ','); }
  function fmtKr(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr'; }
  // 30.09.2026: ritillinn (vistaVerdlinur) kallaði í toast() sem var hvergi til í þessari skrá — ReferenceError eftir hverja vistun.
  function toast(msg, bad) {
    let t = document.getElementById('_bkc-toast');
    if (!t) { t = document.createElement('div'); t.id = '_bkc-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:12000;padding:11px 20px;border-radius:99px;font-weight:800;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.35);transition:opacity .3s;opacity:1;background:' + (bad ? '#b91c1c' : '#14532d') + ';color:#fff';
    clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = '0'; }, 2600);
  }
  function fmtKt(kt) { const d = String(kt || '').replace(/\D/g, ''); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : (kt || ''); }
  function fmtDags(iso) { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(iso || ''); }

  // ── Aðal-reikningur ársins (2026-09-10) ──────────────────────────────────
  // Agnar: „það þarf ekki 2 reikninga tengda, og 2 sendu takka,, leyfðu mér
  // bara að velja hver er aðal". Ár með fleiri en eitt reikningsskjal sýndi
  // hvert þeirra í sinni röð, hvert með eigin Opna/Senda — tvöfaldir takkar
  // sem gerðu nákvæmlega það sama. Nú er EITT sýnt og hin valin úr lista.
  //
  // Valið er gagnastaða (hvaða reikningur fer út), ekki útlit — það skrifast
  // því á þjóninn í AppSettings `bk_inv_adal`, ekki í localStorage, svo allar
  // fjórar tölvurnar sendi sama reikninginn. `_adalNy` lokar ósamstillta
  // gatinu: AppSettings.save er async og AppSettings.path skilar gamla
  // gildinu þar til RPC-ið svarar (sama gildra og 261 og 291).
  const _adalNy = new Map();
  function adalReikn(coId, y) {
    const k = coId + '_' + y;
    let server = null;
    // Þögnin hér er rétt (17.09.2026): hreinn LESTUR úr hlöðnum stillingum.
    // Bregðist hann er server=null (= ekkert valið) og skrifleiðin
    // setAdalReikn segir frá ef vistun mistekst.
    try { const m = (window.AppSettings && AppSettings.path && AppSettings.path('bk_inv_adal')) || {}; server = m[k] != null ? +m[k] : null; } catch (_) {}
    if (_adalNy.has(k)) { const o = _adalNy.get(k); if (server === o) _adalNy.delete(k); else return o; }
    return server;
  }
  // 17.09.2026: AppSettings.save kastar ekki — hún skilar satt/ósatt, svo gamla
  // try/catch-ið gat aldrei séð bilun og þetta val (HVAÐA reikningur fer út)
  // gat setið ósamstillt milli vélanna fjögurra án þess að nokkuð væri skráð.
  // ATH: AppSettings.save ER saveVordud (patch 85) — misheppnað skrif fer í
  // biðröð, er reynt á 20 sek fresti og NOTANDINN FÆR AÐVÖRUN þaðan. Þess vegna
  // engin alert hér og `_adalNy` er EKKI tekið til baka: biðröðin skilar
  // gildinu inn og sticky-gildið á að sýna það sem er á leiðinni þangað til.
  async function setAdalReikn(coId, y, docId) {
    const k = coId + '_' + y;
    _adalNy.set(k, docId);
    try {
      if (!(window.AppSettings && AppSettings.save)) throw new Error('AppSettings ekki tiltækt');
      const ok = await AppSettings.save({ bk_inv_adal: { [k]: docId } });
      if (!ok) throw new Error('AppSettings.save skilaði ósatt');
      return true;
    } catch (e) {
      console.warn('[bkc] aðalreikningur save', e);
      try { if (window.logProblem) window.logProblem('bkc_adalreikn_save_failed', k + ': ' + String((e && e.message) || e).slice(0, 160)); } catch (_) {}
      return false;
    }
  }
  // Gegnum brunahólf /api/skjal (server-OAuth) — enginn „Select an account"
  function driveUrl(id) { return id && String(id).indexOf('sb:') !== 0 ? 'https://brunaholf.netlify.app/api/skjal?id=' + encodeURIComponent(id) : ''; }
  function storageUrl(p) {
    if (!p) return '';
    const base = String(window.SUPABASE_URL || '').replace(/\/+$/, ''); if (!base) return '';
    const s = String(p).replace(/^\/+/, ''); const i = s.indexOf('/'); if (i < 1) return '';
    if (/\.html?$/i.test(s)) return '/api/skyrsla-proxy?p=' + encodeURIComponent(s.slice(i + 1));
    return base + '/storage/v1/object/public/' + s.slice(0, i) + '/' + s.slice(i + 1).split('/').map(encodeURIComponent).join('/');
  }
  // Línu-afsláttur (30.09.2026). Uppsprettan er 273 (BrunakerfiVerd); afritið hér
  // er ÖRYGGISNET ef 273 hefur ekki hlaðist, og það VERÐUR að vera sama formúla —
  // annars segja skýrslan, spjaldið og reikningurinn sitt hvað um sömu vinnuna.
  function vLina(l) {
    const V = window.BrunakerfiVerd;
    if (V && V.lina) return V.lina(l);
    const a = num(l && l.afsl); const p = a > 0 ? Math.min(a, 100) : 0;
    return (num(l && l.qty) || 0) * (num(l && l.price) || 0) * (1 - p / 100);
  }
  // ── RITILL Á VERÐLÍNUM (30.09.2026) ───────────────────────────────────────
  // Agnar, fjórum sinnum: „ég þarf að geta sett inn fleirri kostnaðarliði þarna"
  // … „verð að geta breytt. bætt við nýjum liðum. afslatt a hverja linu" …
  // „en eg þarf að andskotanst geta breytt verðunum". Spjaldið SÝNDI verðin en
  // eina leiðin til að breyta þeim var að opna skýrsluformið. Nú er ritillinn hér.
  //
  // Skrifin lesa gögnin FERSK af þjóni og plástra aðeins verd.linur áður en þau
  // fara til baka (sama mynstur og linkSaleToReport í 291). Formið í 273 vistar
  // ALLT data-blobbið; skrifaði ég blobbið sem ég las við teikningu myndi ég
  // henda því sem einhver annar sló inn á meðan.
  let _vistT = null, _vistBid = {};
  async function vistaVerdlinur(rep) {
    const sb = SB(); if (!sb || !rep) return;
    try {
      const fersk = await sb.from('brunakerfi_skyrslur').select('data').eq('id', rep.id).limit(1);
      if (fersk.error || !fersk.data || !fersk.data[0]) { toast('Verðlínur vistuðust EKKI — reyndu aftur', true); return; }
      const d = fersk.data[0].data || {};
      d.verd = d.verd || {};
      d.verd.linur = (rep.data && rep.data.verd && rep.data.verd.linur) || [];
      const r = await sb.from('brunakerfi_skyrslur').update({ data: d, updated_at: new Date().toISOString() }).eq('id', rep.id);
      if (r.error) { toast('Verðlínur vistuðust EKKI: ' + r.error.message, true); return; }
      toast('Verðlínur vistaðar ✓');
    } catch (e) { toast('Verðlínur vistuðust EKKI: ' + ((e && e.message) || e), true); }
  }
  function vistaSidar(rep) {
    _vistBid[rep.id] = rep;
    if (_vistT) clearTimeout(_vistT);
    _vistT = setTimeout(() => { const b = _vistBid; _vistBid = {}; Object.keys(b).forEach(k => vistaVerdlinur(b[k])); }, 900);
  }

  function verdOf(r) {
    const linur = (r.data && r.data.verd && r.data.verd.linur) || [];
    const sum = linur.reduce((a, l) => a + vLina(l), 0);
    return { lines: linur.length, sum, total: sum * (1 + VAT_PCT / 100) };
  }

  // ── skjal → póst-viðhengi ({driveId} eða undirrituð {url}) fyrir 📧 Senda ─────
  async function docAttachment(d, filename) {
    if (!d) return null;
    const drv = d.drive_file_id && String(d.drive_file_id).indexOf('sb:') !== 0 ? d.drive_file_id : '';
    if (drv) return { filename: filename, driveId: drv };   // gmail-send sækir Drive-skrána server-megin
    if (d.storage_path) {
      // storage_path er bucket-prefixed ('samningar/…'); getPublicUrl (patch 111)
      // væntir bucket-relative slóðar og skilar undirritaðri slóð sem gmail-send nær í.
      const sp = String(d.storage_path).replace(/^samningar\//, '');
      try {
        if (window.CompanyAttachments && CompanyAttachments.getPublicUrl) {
          const u = await CompanyAttachments.getPublicUrl(sp);
          if (u) return { filename: filename, url: u };
        }
      } catch (_) {}
      const su = storageUrl(d.storage_path);
      if (su) return { filename: filename, url: su };
    }
    return null;
  }

  // 📧 Senda brunakerfisúttekt: hakað val um 🔥 skýrslu + 🧾 reikning → venjulegi
  // póst-glugginn (patch 254). Reikningurinn (solur) kemur úr patch 291.
  async function sendReport(r) {
    if (!(window.ReceiptSender && ReceiptSender.compose)) { alert('Póst-ritillinn hlóðst ekki — endurhladdu síðunni.'); return; }
    const co = C.co, yr = r.year || '';
    const doc = r.doc_id ? C.docs.find(d => d.id === r.doc_id) : null;
    const choices = [];
    const bruAtt = await docAttachment(doc, [co.nafn, yr, 'brunakerfisskýrsla'].filter(Boolean).join(' - ') + '.pdf');
    if (bruAtt) choices.push({ label: '🔥 Brunakerfisskýrsla ' + yr, checked: true, build: () => bruAtt });
    else choices.push({ label: '🔥 Brunakerfisskýrsla ' + yr + ' — ljúktu skýrslunni fyrst', checked: false, disabled: true });
    let inv = null;
    try {
      if (window.BrunakerfiReikningur && BrunakerfiReikningur.findInvoice) {
        const saleId = (r.data && r.data.verd && r.data.verd.sale_id) || null;
        inv = await BrunakerfiReikningur.findInvoice(co.id, yr, saleId);
      }
    } catch (_) {}
    if (inv && inv.id && window.ReceiptSender.invoiceAttachment) {
      choices.push({ label: '🧾 Reikningur ' + (inv.num || '') + (inv.status !== 'final' ? ' (drög)' : ''), checked: true,
        build: () => ReceiptSender.invoiceAttachment(inv.id) });
    }
    ReceiptSender.compose({
      title: 'Senda brunakerfisúttekt' + (yr ? ' ' + yr : ''),
      to: co.netfang || '',
      subject: 'Brunakerfisskýrsla' + (yr ? ' ' + yr : '') + ' — Slökkvitæki ehf',
      bodyText: ReceiptSender.standardText('brunakerfi', { nafn: co.nafn || '', ar: yr, stadur: co.nafn || '' }),
      attachmentChoices: choices,
    });
  }

  // ⤢ SKJALAGLUGGI — sama mót og Ársskoðun notar (199 openInvoiceOverlay), að
  // ósk Agnars 30.09.2026 („replicate the function in arsskodun report/invoice").
  // Áður var window.open notað hér. Á síma opnast skjalið þá í SÖMU flipa-sögu og
  // „til baka" fer ÚT úr appinu — nákvæmlega það sem 199 var látið hætta við
  // 21.07.2026. Glugginn hefur eigin ✕ Loka + 🖨 Prenta og snertir enga vafra-sögu.
  // Fest á <body>, utan #_bkc-overlay, svo hann liggi ofan á spjaldinu.
  //   src    → skjal sem vafrinn teiknar sjálfur (PDF um /api/skjal eða Storage)
  //   render → fall sem fær iframe.contentWindow (SalaInvoice skrifar í .document)
  function openDocViewer(opts) {
    const o = opts || {};
    const fyrri = document.getElementById('_bkc-docview'); if (fyrri) { try { fyrri.remove(); } catch (_) {} }
    const ov = document.createElement('div');
    ov.id = '_bkc-docview';
    ov.style.cssText = 'position:fixed;inset:0;z-index:100050;background:rgba(15,23,42,.6);display:flex;flex-direction:column';
    const bar = document.createElement('div');
    bar.style.cssText = 'flex:0 0 auto;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:10px 14px;background:#0f172a;color:#fff';
    bar.innerHTML = '<b style="font-size:15px">' + esc(o.title || 'Skjal') + '</b>';
    const btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:8px';
    const pr = document.createElement('button'); pr.type = 'button'; pr.textContent = '🖨 Prenta';
    pr.style.cssText = 'padding:9px 16px;background:#166534;color:#fff;border:none;border-radius:9px;font-size:15px;cursor:pointer';
    const cl = document.createElement('button'); cl.type = 'button'; cl.textContent = '✕ Loka';
    cl.style.cssText = 'padding:9px 16px;background:#334155;color:#fff;border:none;border-radius:9px;font-size:15px;cursor:pointer';
    btns.appendChild(pr); btns.appendChild(cl); bar.appendChild(btns);
    const frame = document.createElement('iframe');
    frame.style.cssText = 'flex:1 1 auto;width:100%;border:0;background:#fff';
    ov.appendChild(bar); ov.appendChild(frame);
    document.body.appendChild(ov);
    function loka() { try { ov.remove(); } catch (_) {} document.removeEventListener('keydown', aLykli); }
    function aLykli(ev) { if (ev.key === 'Escape') loka(); }
    cl.onclick = loka;
    ov.addEventListener('click', ev => { if (ev.target === ov) loka(); });
    document.addEventListener('keydown', aLykli);
    if (o.src) frame.src = o.src;
    else if (o.render) {
      try { o.render(frame.contentWindow); }
      catch (e) { loka(); alert('Villa við að teikna skjalið: ' + ((e && e.message) || e)); return; }
    }
    // Prentun á src-skjali fer gegnum iframe-gluggann; sé hann annars origin
    // (Storage) kastar .print() og við föllum á vafrans eigin prentun.
    pr.onclick = () => { try { frame.contentWindow.focus(); frame.contentWindow.print(); } catch (_) { try { window.print(); } catch (__) {} } };
  }

  // 🧾 Opnar reikning (solur) skýrslunnar sem prent/PDF-forskoðun (SalaInvoice,
  // patch 10) — núna í skjalaglugganum hér að ofan, ekki nýjum vafraglugga.
  async function openInvoicePdf(inv) {
    if (!inv || !inv.id) return;
    try {
      const sb = SB(); if (!sb) return;
      const r = await sb.from('solur').select('*').eq('id', inv.id).single();
      if (r.error || !r.data) { alert('Reikningurinn fannst ekki.'); return; }
      if (!(window.SalaInvoice && SalaInvoice.renderFromSale)) { alert('Reikningsmótið er ekki tiltækt.'); return; }
      openDocViewer({
        title: 'Reikningur ' + (r.data.num || ''),
        render: iwin => SalaInvoice.renderFromSale(iwin, r.data, {
          kennitala: (C.co && C.co.kennitala) || r.data.customer_kt || '',
          heimilisfang: (C.co && C.co.heimilisfang) || ''
        })
      });
    } catch (e) { alert('Villa: ' + (e.message || e)); }
  }

  // ── yfirbygging ─────────────────────────────────────────────────────────────
  function ensureOverlay() {
    let ov = document.getElementById('_bkc-overlay'); if (ov) return ov;
    ov = document.createElement('div'); ov.id = '_bkc-overlay';
    ov.innerHTML = '<style>' +
      '#_bkc-overlay{position:fixed;inset:0;z-index:9300;background:#e8eaee;overflow-y:auto;display:none;font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;-webkit-overflow-scrolling:touch;color:#16181c}' +
      '#_bkc-overlay *{box-sizing:border-box}' +
      '#_bkc-overlay ._bkc-top{position:sticky;top:0;z-index:20;background:linear-gradient(180deg,#101216,#191c22);border-bottom:1px solid #2a2e36;color:#fff;display:flex;align-items:center;gap:12px;padding:10px 18px;flex-wrap:wrap}' +
      '#_bkc-overlay ._bkc-logo{background:#fff;border-radius:8px;padding:3px 10px;display:flex;align-items:center}' +
      '#_bkc-overlay ._bkc-logo img{height:26px;display:block}' +
      '#_bkc-overlay ._bkc-hb{padding:7px 12px;border-radius:8px;border:1px solid #33383f;background:#17191d;color:#c9cfda;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;min-height:36px}' +
      '#_bkc-overlay ._bkc-hb:hover{background:#22262c}' +
      '#_bkc-overlay ._bkc-wrap{max-width:1240px;margin:0 auto;padding:16px 16px 70px}' +
      '#_bkc-overlay ._bkc-cust{background:linear-gradient(135deg,#152740,#1e3a5f);border-radius:14px;padding:16px 18px;margin-bottom:14px;box-shadow:0 2px 8px rgba(10,20,40,.25);display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}' +
      '#_bkc-overlay ._bkc-custL{flex:1.4;min-width:260px}' +
      '#_bkc-overlay ._bkc-custR{flex:1;min-width:240px}' +
      '#_bkc-overlay ._bkc-nafn{font-size:19px;font-weight:800;color:#fff}' +
      '#_bkc-overlay ._bkc-sub{font-size:12.5px;color:#9fb4d0;margin-top:3px}' +
      '#_bkc-overlay ._bkc-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:9px;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.25);color:#fff;font-size:12.5px;font-weight:700;text-decoration:none;cursor:pointer;min-height:36px}' +
      '#_bkc-overlay ._bkc-chip:hover{background:rgba(255,255,255,.16)}' +
      '#_bkc-overlay ._bkc-note{width:100%;background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.25);border-radius:10px;color:#fff;padding:9px 11px;font:inherit;font-size:13.5px;min-height:74px;resize:vertical;line-height:1.45}' +
      '#_bkc-overlay ._bkc-note::placeholder{color:#7d8aa3}' +
      '#_bkc-overlay ._bkc-lbl{font-size:10.5px;font-weight:800;letter-spacing:.05em;color:#9fb4d0;text-transform:uppercase;margin-bottom:5px}' +
      '#_bkc-overlay ._bkc-grid{display:grid;grid-template-columns:1.25fr 1fr;gap:14px;align-items:start}' +
      '#_bkc-overlay ._bkc-card{background:#fff;border:1px solid #d7dade;border-radius:12px;box-shadow:0 1px 2px rgba(16,20,28,.06);overflow:hidden;margin-bottom:14px}' +
      '#_bkc-overlay ._bkc-ch{background:#141619;color:#fff;font-size:12.5px;font-weight:800;letter-spacing:.04em;padding:9px 14px;display:flex;align-items:center;justify-content:space-between;text-transform:uppercase}' +
      '#_bkc-overlay ._bkc-ch small{color:#8b93a1;font-weight:700;text-transform:none;letter-spacing:0}' +
      '#_bkc-overlay ._bkc-body{padding:12px 14px}' +
      '#_bkc-overlay ._bkc-row{display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid #eef0f3;flex-wrap:wrap}' +
      '#_bkc-overlay ._bkc-st{padding:2px 9px;border-radius:99px;font-size:10.5px;font-weight:800;white-space:nowrap}' +
      '#_bkc-overlay ._bkc-act{padding:7px 13px;border-radius:8px;border:0;background:#2a78d6;color:#fff;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap;min-height:34px;text-decoration:none;display:inline-flex;align-items:center}' +
      '#_bkc-overlay ._bkc-act._ghost{background:#fff;border:1px solid #d0d4da;color:#334155}' +
      '#_bkc-overlay ._bkc-act._del{background:#fff;border:1px solid #efb9ab;color:#c93c1d;padding:7px 10px}' +
      // 2026-09-10 (Agnar: „taktu þessa ruslatunnu burt óþarfi að láta hana fá
      // svona mikið pláss" / „lítið x er nóg"). 🗑 var jafn stór og Opna og Senda
      // og bar rauðan ramma — eyðingin hrópaði hærra en aðgerðirnar sem eru
      // notaðar daglega. Nú dauft × sem verður rautt við hover. Sami hnappur,
      // sama aðgerð, sama staðfesting — bara ekki lengur aðalatriðið á línunni.
      '#_bkc-overlay ._bkc-act._x{background:transparent;border:0;color:#b9c0c9;padding:0 5px;min-height:0;font-size:16px;line-height:1;font-weight:600}' +
      '#_bkc-overlay ._bkc-act._x:hover{color:#c93c1d;background:#fdeeee;border-radius:6px}' +
      '#_bkc-overlay ._bkc-new{width:100%;padding:12px;border-radius:10px;border:0;background:#1f8a4c;color:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer;margin-top:12px}' +
      '#_bkc-overlay ._bkc-new:hover{background:#187a41}' +
      // 21.09.2026: hetjuspjald (skoðun ársins) · samanbrjótanleg hliðarspjöld · prófílhaus falinn þegar flipinn býr Í fyrirtækjaspjaldinu
      '#_bkc-overlay ._bkc-new._litid{background:transparent;color:#64748b;border:1px dashed #cbd5e1;font-size:12.5px;font-weight:700;padding:8px;margin-top:10px}#_bkc-overlay ._bkc-new._litid:hover{background:#f8fafc}' +
      '#_bkc-overlay ._bkc-hero{border-color:#0f172a}#_bkc-overlay ._bkc-herohd{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#0f172a;color:#fff;padding:12px 14px}' +
      '#_bkc-overlay ._bkc-herot{font-size:15.5px;font-weight:800;flex:1;min-width:0}' +
      '#_bkc-overlay ._bkc-hero ._bkc-yr{border-top:0;padding-top:2px}#_bkc-overlay ._bkc-hero ._bkc-yrlbl,#_bkc-overlay ._bkc-hero ._bkc-yrhd ._bkc-pill,#_bkc-overlay ._bkc-hero ._bkc-ork{display:none}' +
      '#_bkc-overlay ._bkc-hero ._bkc-yrhd{cursor:default;margin-bottom:0;min-height:0}#_bkc-overlay ._bkc-hero ._bkc-yrrow{padding:7px 0;font-size:13.5px}' +
      '#_bkc-overlay #_bkc-heroinv #_bkr-status{border:0;box-shadow:none;border-top:1px dashed #d7dade;border-radius:0;padding:10px 0 0;margin:8px 0 0;background:transparent}' +
      '#_bkc-overlay ._bkc-fold ._bkc-ch{cursor:pointer;user-select:none}#_bkc-overlay ._bkc-fold._saman ._bkc-body{display:none}#_bkc-overlay ._bkc-fold._saman ._bkc-ork{display:inline-block;transform:rotate(-90deg)}' +
      '#_sks-bru #_bkc-overlay ._bkc-custL{display:none}#_sks-bru #_bkc-overlay ._bkc-cust{display:block;padding:10px 12px}#_sks-bru #_bkc-overlay ._bkc-note{min-height:44px}' +
      '#_bkc-overlay table._bkc-tbl{width:100%;border-collapse:collapse}' +
      '#_bkc-overlay ._bkc-tbl th{font-size:10px;font-weight:800;color:#7a8290;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:5px 8px;border-bottom:1px solid #eef0f3}' +
      '#_bkc-overlay ._bkc-tbl td{padding:6px 8px;border-bottom:1px solid #eef0f3;font-size:12.5px}' +
      '#_bkc-overlay ._bkc-vr{display:grid;grid-template-columns:1fr 54px 88px 52px 92px 26px;gap:7px;align-items:center;padding:7px 0;border-bottom:1px solid #eef0f3}' +
      '#_bkc-overlay ._bkc-vh{display:grid;grid-template-columns:1fr 54px 88px 52px 92px 26px;gap:7px;font-size:9.5px;font-weight:800;color:#7a8290;text-transform:uppercase;letter-spacing:.04em;padding-bottom:6px;border-bottom:1px solid #eef0f3}' +
      '#_bkc-overlay ._bkc-vin{border:1px solid #d0d4da;border-radius:7px;padding:6px 8px;font:inherit;font-size:12px;width:100%;min-width:0;background:#fff;color:#16181c}' +
      '#_bkc-overlay ._bkc-vin:focus{outline:0;border-color:#141619;box-shadow:0 0 0 2px rgba(20,22,25,.08)}' +
      '#_bkc-overlay ._bkc-vx{width:22px;height:22px;border-radius:6px;border:1px solid #efb9ab;background:#fff;color:#c93c1d;font-weight:800;cursor:pointer;padding:0;font-size:11px}' +
      '#_bkc-overlay ._bkc-vsum{text-align:right;font-weight:800;font-size:12.5px}' +
      '#_bkc-overlay ._bkc-reikn{margin-top:12px;margin-left:auto;max-width:320px;font-size:13px}' +
      '#_bkc-overlay ._bkc-reikn>div{display:flex;justify-content:space-between;padding:3px 0}' +
      '#_bkc-overlay ._bkc-reikn ._big{font-size:15.5px;font-weight:800;border-top:2px solid #141619;padding-top:6px;margin-top:3px}' +
      '#_bkc-overlay ._bkc-vlina>td{padding:2px 8px 2px 18px;border-bottom:0;font-size:11.5px;color:#6b7280}' +
      '#_bkc-overlay ._bkc-vlina:first-of-type>td{padding-top:5px}' +
      '#_bkc-overlay ._bkc-vlina._vantar>td{color:#8a6100;font-weight:700;padding-bottom:6px}' +
      '#_bkc-overlay ._bkc-vedit{background:none!important;border:0!important;padding:0 0 0 4px!important;margin:0!important;font-size:11.5px!important;line-height:1!important;cursor:pointer;opacity:.5;box-shadow:none!important;min-height:0!important;color:inherit!important}' +
      '#_bkc-overlay ._bkc-vedit:hover{opacity:1}' +
      '#_bkc-overlay ._bkc-empty{font-size:12.5px;color:#8b93a1;font-style:italic;padding:8px 0}' +
      '#_bkc-overlay ._bkc-legend{font-size:11px;color:#8b93a1;display:flex;align-items:center;gap:6px;margin:0 0 4px}' +
      '#_bkc-overlay ._bkc-yr{border-top:1px solid #eef0f3;padding:9px 0 7px}#_bkc-overlay ._bkc-yr:first-of-type{border-top:0}' +
      '#_bkc-overlay ._bkc-yrhd{display:flex;align-items:center;gap:8px;margin-bottom:5px}#_bkc-overlay ._bkc-yrhd small{color:#8b93a1;font-size:11px}' +
      '#_bkc-overlay ._bkc-yrlbl{font-weight:800;font-size:15px;color:#1f2937}#_bkc-overlay ._bkc-yrlbl._ok{color:#166b3a}#_bkc-overlay ._bkc-yrlbl._warn{color:#8a6100}#_bkc-overlay ._bkc-yrlbl._miss{color:#b45309}' +
      '#_bkc-overlay ._bkc-pill._ok{background:#dcf1e4;color:#166b3a}#_bkc-overlay ._bkc-pill._warn{background:#fdf3d7;color:#8a6100}#_bkc-overlay ._bkc-pill._doc{background:#e8ecf3;color:#3b4653}#_bkc-overlay ._bkc-pill._miss{background:#fff7ed;color:#b45309;border:1px dashed #f59e0b}' +
      '#_bkc-overlay ._bkc-yrrow{display:grid;grid-template-columns:10px 22px minmax(0,1fr);align-items:center;column-gap:8px;padding:5px 0}' +
      // 21.09.2026: árshaus er takki (fella/opna) · ⋯ sýnir sjaldgæfu aðgerðirnar · merkið er tákn í stað orðs
      '#_bkc-overlay ._bkc-yrhd{cursor:pointer;user-select:none}#_bkc-overlay ._bkc-yrsp{flex:1}' +
      '#_bkc-overlay ._bkc-ork{color:#9aa2ae;font-size:12px;transition:transform .15s}#_bkc-overlay ._bkc-yr._lokad ._bkc-ork{transform:rotate(-90deg)}' +
      '#_bkc-overlay ._bkc-yr._lokad ._bkc-yrrow,#_bkc-overlay ._bkc-yr._lokad ._bkc-meira{display:none}#_bkc-overlay ._bkc-yr._lokad ._bkc-yrhd{margin-bottom:0}' +
      '#_bkc-overlay ._bkc-meira{border:1px solid #e2e6ea;background:#fff;color:#64748b;border-radius:8px;min-width:34px;min-height:30px;font-size:16px;line-height:1;cursor:pointer}' +
      '#_bkc-overlay ._bkc-yr._meira ._bkc-meira{background:#0f172a;color:#fff;border-color:#0f172a}' +
      '#_bkc-overlay ._bkc-sj{display:none}#_bkc-overlay ._bkc-yr._meira ._bkc-sj{display:inline-flex;align-items:center;gap:6px}' +
      '#_bkc-overlay ._bkc-yr._meira ._bkc-act._x{color:#c93c1d;font-size:12px;font-weight:700;border:1px solid #efb9ab;border-radius:8px;padding:6px 9px;min-height:30px}' +
      '#_bkc-overlay ._bkc-dot{width:9px;height:9px;border-radius:50%;display:inline-block}#_bkc-overlay ._bkc-dot.ok{background:#22c55e}#_bkc-overlay ._bkc-dot.miss{width:7px;height:7px;background:transparent;border:2px dashed #f59e0b}' +
      '#_bkc-overlay ._bkc-tag{font-size:15px;line-height:1;text-align:center}' +
      '#_bkc-overlay ._bkc-yrbody{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:12.5px;min-width:0}' +
      '#_bkc-overlay ._bkc-yrtxt{color:#334155}#_bkc-overlay ._bkc-yrmiss{color:#b45309;font-style:italic;font-size:12px}' +
      '#_bkc-overlay ._bkc-invst{font-weight:800;font-size:10.5px;text-transform:uppercase;padding:1px 7px;border-radius:99px;background:#e8ecf3;color:#3b4653}#_bkc-overlay ._bkc-invst._greiddur{background:#dcf1e4;color:#166b3a}#_bkc-overlay ._bkc-invst._sendur{background:#dbeafe;color:#1e40af}#_bkc-overlay ._bkc-invst._stofnaður{background:#fdf3d7;color:#8a6100}' +

      '@media (max-width:960px){#_bkc-overlay ._bkc-grid{grid-template-columns:1fr}}' +
      '</style>' +
      '<div class="_bkc-top">' +
        '<button type="button" class="_bkc-hb" data-a="back">← Brunakerfi yfirlit</button>' +
        '<div class="_bkc-logo"><img src="' + LOGO_PATH + '" alt="" onerror="this.parentNode.style.display=\'none\'"></div>' +
        '<div style="font-size:14.5px;font-weight:700" id="_bkc-topname"></div>' +
      '</div>' +
      '<div class="_bkc-wrap" id="_bkc-wrap"></div>';
    document.body.appendChild(ov);
    ov.querySelector('[data-a="back"]').addEventListener('click', close);
    // þegar skýrslu-forminu (273) er lokað ofan á síðunni → endurhlaða gögn
    const watchForm = () => {
      const f = document.getElementById('_bks-overlay');
      if (!f) { setTimeout(watchForm, 1200); return; }
      new MutationObserver(() => {
        // 23.09.2026: yfirlagið er hýst inni í prófílnum (386) og hverfur með honum við hash-skipti — formið lokast þá
        // (273) og þessi vakt las .style af null (TypeError í mo-throttle252). Vantar stakið → ekkert að endurhlaða.
        const bk = document.getElementById('_bkc-overlay');
        if (f.style.display === 'none' && C && bk && bk.style.display === 'block') reload();
      }).observe(f, { attributes: true, attributeFilter: ['style'] });
    };
    watchForm();
    return ov;
  }

  function close() {
    flushNote();
    const ov = document.getElementById('_bkc-overlay'); if (ov) ov.style.display = 'none';
    document.body.style.overflow = '';
    try { if (window.BrunakerfiYfirlit && BrunakerfiYfirlit.reload) BrunakerfiYfirlit.reload(); } catch (_) {}
  }

  // ── gögn ────────────────────────────────────────────────────────────────────
  async function load(coId) {
    const sb = SB(); if (!sb) return null;
    const coR = await sb.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,simi,farsimi,netfang,customer_base_id,"tengiliður"').eq('id', coId).single();
    const co = (coR && coR.data) || { id: coId, nafn: '?' };
    // samningar: bæði á STAÐINN og á keðjuna (customer_base — t.d. Center Hótel
    // á einn samning fyrir öll hótelin)
    const samOr = 'fyrirtaeki_id.eq.' + coId + (co.customer_base_id ? ',customer_base_id.eq.' + co.customer_base_id : '');
    const [repR, docR, samR] = await Promise.all([
      sb.from('brunakerfi_skyrslur').select('id,year,uttekt_nr,status,doc_id,data,updated_at').eq('fyrirtaeki_id', coId).order('updated_at', { ascending: false }),
      sb.from('customer_documents').select('id,year,doc_type,invoice_number,vidskiptategund,drive_file_id,storage_path,doc_date,source,notes,is_duplicate').in('doc_type', ['brunakerfi', 'reikningur']).eq('fyrirtaeki_id', coId).order('year', { ascending: false }),
      sb.from('customer_documents').select('id,fyrirtaeki_id,drive_file_id,storage_path,doc_date,customer_name,notes,is_duplicate').eq('doc_type', 'samningur').or(samOr).order('id', { ascending: false })
    ]);
    let note = '';
    // Þögnin hér er rétt (17.09.2026): LESTUR á ársnótu úr hlöðnum stillingum;
    // bregðist hann er nótan tóm og ekkert er skrifað yfir hana héðan.
    try { let m = (window.AppSettings && AppSettings.path && AppSettings.path('brunakerfi_co_notes')) || {}; if (!m || typeof m !== 'object' || Array.isArray(m)) m = {}; note = (m[String(coId)] && m[String(coId)].text) || ''; } catch (_) {}
    // 2026-08-05 (sama "chaos in center" fund og patch 199): tvítök flöguð af
    // eldri hreinsunar-sópun (`is_duplicate`) voru samt teiknuð hér — fellum
    // þau burt, halda þeim gögnum sem aldrei fóru gegnum sópunina (NULL).
    const dropDupes = arr => (arr || []).filter(d => !d.is_duplicate);
    // 2026-09-10 (Agnar: „kanski bara bæta við vali á skýrslu eða reikning").
    // Fyrirspurnin sótti AÐEINS `brunakerfi`, svo reikningur sem var hlaðinn
    // upp handvirkt hvarf sjónum — hann fór í töfluna en ekkert spjald sýndi
    // hann. Nú koma báðar gerðir og eru flokkaðar hér.
    const allirDocs = dropDupes((docR && docR.data) || []);
    const docs = allirDocs.filter(d => (d.doc_type || 'brunakerfi') === 'brunakerfi');
    // 21.09.2026 (Agnar sendi skjámynd af G14 ehf): hér komu ALLIR reikningar félagsins, líka slökkvitækja-úttektin, og
    // „nýjasta skjalið" (dags, svo id) varð sjálfgefið aðal. G14 átti R-107992 (brunakerfi, 80.487 kr) og R-107993 (úttekt,
    // 50.362 kr) sama dag → kaflinn sýndi R-107993 sem BRUNAKERFISREIKNING 2026, og R-106013 fyrir 2024. Nú: reikningur
    // sem er merktur ANNARRI þjónustu (uttekt · bud · slokkvikerfi …) á ekki heima hér. Ómerktir (eldri gögn) fá að fljóta
    // með eins og áður, því annars hyrfu handupphlaðnir reikningar sem aldrei fengu tegund.
    const invDocs = allirDocs.filter(d => d.doc_type === 'reikningur' && (!d.vidskiptategund || d.vidskiptategund === 'brunakerfi'));
    const samningar = dropDupes((samR && samR.data) || []);
    const reports = (repR && repR.data) || [];
    // Reikningur (solur) hverrar skýrslu (patch 291) — svo hann sjáist Í SÖMU LÍNU
    // og skýrslan (📄 Skýrsla · 🧾 Reikningur · 📧 Senda). Best-effort, stöðvar aldrei teikningu.
    if (window.BrunakerfiReikningur && BrunakerfiReikningur.findInvoice) {
      await Promise.all(reports.map(async r => {
        try {
          const saleId = (r.data && r.data.verd && r.data.verd.sale_id) || null;
          r._inv = await BrunakerfiReikningur.findInvoice(coId, r.year, saleId);
        } catch (_) { r._inv = null; }
      }));
    }
    return { co, reports, docs, invDocs, samningar, note };
  }

  // Persist the pending note to the company it was TYPED on. Called from the
  // debounce, from close(), and on pagehide so a note typed <1.2s before leaving
  // is never lost — and never lands on the wrong profile.
  function flushNote() {
    clearTimeout(_noteT); _noteT = null;
    const p = _notePending; _notePending = null;
    if (!p || !p.coId) return;
    try {
      if (window.AppSettings && AppSettings.save) {
        AppSettings.save({ brunakerfi_co_notes: { [p.coId]: { text: p.text, t: new Date().toISOString() } } });
      }
    } catch (e) { console.warn('[bkc] note save', e); }
  }
  function saveNote(text) {
    // Capture the company id NOW, at edit time. Reading C.co.id when the timer
    // fired wrote the note to whatever company was open THEN — switching company
    // within 1.2s corrupted the note onto the wrong profile (fix 2026-08-22, S3).
    const coId = (C && C.co) ? String(C.co.id) : null;
    if (!coId) return;
    _notePending = { coId, text };
    clearTimeout(_noteT);
    _noteT = setTimeout(flushNote, 1200);
  }


  // ── Brunastál C: stílblað miðjunnar (30.09.2026) — sömu áferðir og 402/404 ────────────────────────────────
  function injectB274() {
    if (document.getElementById('_bkc-b274')) return;
    const MONO = '"JetBrains Mono",ui-monospace,monospace', SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif', DISPLAY = '"Playfair Display",Georgia,serif';
    const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
    const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
    const PLATE = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
    const RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
    const LINE = 'background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)';
    const P = '#_bkc-overlay .b274 ';
    const r = (sel, css) => sel.split(',').map(x => P + x.trim()).join(',') + '{' + css + '}';
    const st = document.createElement('style'); st.id = '_bkc-b274';
    st.textContent = [
      '#_bkc-overlay ._bkc-grid.b274{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,.8fr);gap:16px;align-items:start;font-family:' + SANS + '}',
      r('.b274-k', 'background:#fff;border:1px solid #000;border-radius:14px;overflow:hidden;box-shadow:0 30px 60px -20px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3);display:flex;flex-direction:column;margin:0'),
      r('.b274-hd', 'position:relative;background:' + METAL + ';color:#fff;border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);padding:14px 18px 12px;display:flex;align-items:center;gap:14px;flex-wrap:wrap'),
      r('.b274-hd::before,.b274-hd::after', 'content:"";position:absolute;width:7px;height:7px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7);top:8px'),
      r('.b274-hd::before', 'left:8px'), r('.b274-hd::after', 'right:8px'),
      r('.b274-hl', 'display:flex;flex-direction:column;gap:6px;min-width:0'),
      r('.b274-t', 'font-family:' + MONO + ';font-size:11.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#d9dee6;display:flex;align-items:center;gap:9px;white-space:nowrap'),
      r('.b274-led', 'width:8px;height:8px;border-radius:50%;display:inline-block;flex:none'),
      r('.b274-led.g', 'background:#3cc47c;box-shadow:0 0 0 3px rgba(60,196,124,.16),0 0 12px rgba(60,196,124,.8)'),
      r('.b274-led.y', 'background:#f6b545;box-shadow:0 0 0 3px rgba(246,181,69,.18),0 0 12px rgba(246,181,69,.85)'),
      r('.b274-led.r', 'background:#f0584c;box-shadow:0 0 0 3px rgba(240,88,76,.18),0 0 12px rgba(240,88,76,.85)'),
      r('.b274-tala', 'display:flex;align-items:baseline;gap:10px;white-space:nowrap'),
      r('.b274-tala .n', 'font-family:' + DISPLAY + ';font-size:38px;font-weight:800;line-height:1;letter-spacing:-.02em;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)'),
      r('.b274-tala .l', 'font-family:' + DISPLAY + ';font-size:16px;font-weight:700;color:#d9dee6'),
      r('.b274-hm', 'display:flex;flex-direction:column;gap:6px;margin-left:8px;min-width:0'),
      r('.b274-stika', 'display:flex;gap:3px;height:8px;width:280px;max-width:100%'),
      r('.b274-stika i', 'display:block;border-radius:4px;box-shadow:inset 0 1px 0 rgba(255,255,255,.4);min-width:4px'),
      r('.b274-legend', 'font-family:' + MONO + ';font-size:11px;font-weight:500;color:#d5dbe6;display:flex;gap:10px;flex-wrap:wrap;align-items:center'),
      r('.b274-legend b', 'font-weight:700;color:#fff'),
      r('.b274-legend i', 'width:6px;height:6px;border-radius:50%;display:inline-block;margin-right:5px'),
      r('.b274-plotur', 'align-items:flex-start;font-family:' + MONO),
      r('.b274-hr', 'margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:6px'),
      r('.b274-hb', 'display:flex;gap:8px'),
      r('.b274-plata', 'display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12);color:#11141c;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;flex:none'),
      r('.b274-plata i', 'width:5px;height:5px;border-radius:50%;display:inline-block;background:#8f98a8'),
      r('.b274-plata.ok i', 'background:#1f9d57'), r('.b274-plata.vinnsla i', 'background:#4f74dc'), r('.b274-plata.vantar i', 'background:#e25555'), r('.b274-plata.vantar', 'color:#b42318'),
      r('.b274-plata.dokk', 'height:30px;font-size:12px;background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border-color:#000;color:#eef1f4;box-shadow:inset 0 1px 0 rgba(255,255,255,.14)'),
      r('.b274-silfur,.b274-malmur', 'height:36px!important;min-height:0!important;padding:0 14px!important;border-radius:9px!important;font-family:' + SANS + '!important;font-size:13px!important;font-weight:600!important;display:inline-flex;align-items:center;gap:7px'),
      r('.b274-silfur', 'background:' + SILVER + '!important;border:1px solid rgba(20,24,34,.16)!important;color:#1f2530!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)!important;text-shadow:none'),
      r('.b274-malmur', 'background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)!important;border:1px solid #000!important;color:#eef1f4!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45)!important'),
      r('.b274-stal', 'background:#e2e6ec;background-image:' + PLATE + ';padding:10px 10px 16px;display:flex;flex-direction:column;gap:10px'),
      r('.b274-rod', 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:0 4px'),
      r('.b274-sp', 'flex:1'),
      r('.b274-merki', 'font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#3a4250'),
      r('.b274-hint', 'font-size:12px;color:#525b6b'),
      r('.b274-rammi', 'background:#fff;border-radius:8px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)'),
      r('.b274-tomt', LINE + ';padding:34px 18px;text-align:center;font-size:13px;color:#59606c;display:flex;flex-direction:column;gap:14px;align-items:center'),
      r('.b274-ar', LINE + ';padding:4px 12px'),
      r('.b274-lina', LINE + ';display:flex;align-items:center;gap:8px;min-height:38px;padding:4px 8px 4px 12px;font-size:12.5px;color:#3a4250;flex-wrap:wrap'),
      r('.b274-ll', 'font-weight:600;color:#2b313c;flex:none'),
      r('.b274-lv', 'flex:1;min-width:120px;color:#1f2530;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'),
      r('.b274-thri', 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px'),
      r('.b274-rl', 'font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#3a4250;margin-bottom:6px;display:flex;align-items:center;gap:8px;padding:0 2px'),
      r('.b274-rl small', 'font-family:' + SANS + ';font-weight:400;letter-spacing:0;text-transform:none;color:#6b7483;font-size:11.5px'),
      r('.b274-reitur', 'background:#eef1f6;border:1px solid rgba(20,24,34,.14);border-radius:8px;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);padding:10px 12px;font-size:13px;color:#141822;min-height:40px'),
      r('.b274-reitur.mono', 'font-family:' + MONO), r('.b274-reitur.tomt', 'color:#6b7483'),
      r('.b274-note', 'background:#eef1f6!important;border:1px solid rgba(20,24,34,.14)!important;border-radius:8px!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)!important;color:#141822!important;font-family:' + SANS + '!important;font-size:13px!important;min-height:56px!important;width:100%;padding:10px 12px!important;resize:vertical'),
      r('.b274-hero', LINE + ';padding:4px 12px 10px'),
      r('.b274-hero ._bkc-new', 'margin-top:8px'),
      // línur reiknings: ritillinn sem tafla með málmhaus
      r('.b274-linur', 'background:#fff;border-radius:8px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);display:flex;flex-direction:column'),
      r('.b274-linur > div', 'display:flex;flex-direction:column'),
      r('.b274-linur > div > div:first-child', 'font-family:' + MONO + '!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.12em;text-transform:uppercase;color:#525b6b!important;padding:8px 12px 4px!important'),
      r('.b274-linur ._bkc-vh', 'grid-template-columns:minmax(0,1fr) 56px 90px 56px 96px 26px;gap:8px;background:linear-gradient(180deg,#2b2f37,#15171c);color:#eef1f4;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:0 12px;height:34px;align-items:center;border-bottom:1px solid #000'),
      r('.b274-linur ._bkc-vr', 'grid-template-columns:minmax(0,1fr) 56px 90px 56px 96px 26px;gap:8px;padding:6px 12px;border-bottom:1px solid #edf0f4'),
      r('.b274-linur ._bkc-vin', 'height:28px;border:1px solid rgba(20,24,34,.14);border-radius:6px;background:#eef1f6;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);font-family:' + MONO + ';font-size:12px;padding:0 8px'),
      r('.b274-linur ._bkc-vin[data-vk="name"]', 'font-family:' + SANS + ';font-weight:600;font-size:12.5px;background:#fff;box-shadow:none;border-color:transparent'),
      r('.b274-linur ._bkc-vin[data-vk="name"]:focus', 'border-color:rgba(20,24,34,.3);background:#fff'),
      r('.b274-linur ._bkc-vsum', 'font-family:' + MONO + ';font-size:12px;font-weight:700;color:#11141c'),
      r('.b274-linur ._bkc-vx', 'border:0;background:transparent;color:#b9c0c9;font-size:13px'), r('.b274-linur ._bkc-vx:hover', 'color:#b42318;background:#fdeeee'),
      r('.b274-linur [data-vadd]', 'margin:8px 12px 10px!important;align-self:flex-start'),
      r('.b274-linur ._bkc-empty', 'padding:14px 12px;text-align:center'),
      r('.b274-linur > div > div[style*="8a6100"]', 'padding:6px 12px 0!important;font-family:' + MONO + ';font-size:11px!important'),
      // samtölur: undirlína + málmstöng
      r('.b274-reikn', 'margin:0!important;max-width:none!important;display:flex;flex-direction:column;gap:6px'),
      r('.b274-reikn > div', 'display:flex;justify-content:flex-end!important;gap:10px;padding:0 4px!important;font-family:' + MONO + ';font-size:11.5px;color:#5b6472'),
      r('.b274-reikn > div b', 'color:#1f2530;font-weight:700'),
      r('.b274-reikn ._big', 'justify-content:space-between!important;align-items:center;background:' + METAL + ';border:1px solid #000!important;border-radius:8px;padding:10px 18px!important;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);margin-top:4px;font-size:11px!important;font-weight:700;letter-spacing:.14em;text-transform:uppercase'),
      r('.b274-reikn ._big span:last-child', 'font-family:' + DISPLAY + ';font-size:30px;font-weight:800;letter-spacing:0;text-transform:none;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)'),
      r('.b274-inv', LINE + ';padding:8px 12px;font-size:13px'),
      '#_bkc-overlay .b274 .b274-inv #_bkr-status{border:0!important;padding:0!important;margin:0!important;box-shadow:none!important;background:transparent!important}',
      '#_bkc-overlay .b274 .b274-inv:not(:has(#_bkr-status)),#_bkc-overlay .b274 .b274-inv:has(#_bkr-inv:empty){display:none!important}',
      r('.b274-ny', 'width:auto!important;margin:0!important;padding:0 12px!important;height:32px;font-size:12.5px!important;border-radius:7px!important'),
      r('.b274-graenn', 'height:36px!important;min-height:0!important;padding:0 14px!important;border-radius:9px!important;font-family:' + SANS + '!important;font-size:13px!important;font-weight:700!important;display:inline-flex;align-items:center;gap:7px;background:linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)!important;border:1px solid rgba(52,168,98,.55)!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3)!important;text-shadow:0 1px 1px rgba(0,0,0,.55)'),
      // mjórra (sími / þröngt): einn dálkur
      '@media (max-width:1100px){#_bkc-overlay ._bkc-grid.b274{grid-template-columns:1fr}' + P + '.b274-thri{grid-template-columns:1fr 1fr}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ── teikning ────────────────────────────────────────────────────────────────
  function render() {
    const ov = ensureOverlay();
    const w = document.getElementById('_bkc-wrap');
    const co = C.co;
    if (_arFelag !== co.id) { _arFelag = co.id; _arOpid = {}; _arMeira = {}; _foldVal = {}; _addOpid = false; }
    document.getElementById('_bkc-topname').textContent = co.nafn || '';
    const simi = co.simi || co.farsimi || '';
    const docIds = new Set(C.reports.map(r => r.doc_id).filter(Boolean));
    const oldDocs = C.docs.filter(d => !docIds.has(d.id));
    const newest = C.reports[0] || null;

    // ── STAÐA EFTIR ÁRI (07.09.2026) — eins og Ársskoðun: eitt ár = ein blokk, skýrsla-lína + reikningur-lína,
    //    grænn punktur = til, brotinn gulur = vantar. Skýrslur úr appinu og eldri Drive-skjöl í SÖMU röð, nýjast efst.
    const MONS = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'];
    const NOW = new Date().getFullYear();
    const yrSet = new Set([NOW]);
    C.reports.forEach(r => { if (+r.year) yrSet.add(+r.year); });
    oldDocs.forEach(d => { if (+d.year) yrSet.add(+d.year); });
    const yrs = [...yrSet].sort((a, b) => b - a);
    const invLabel = inv => !inv ? '' : inv.paid_at ? 'greiddur' : inv.krafa_sent_at ? 'sendur' : (inv.invoiced_at || inv.status === 'final') ? 'stofnaður' : 'drög';
    // 21.09.2026 (Agnar: „damn ugly and confusing" — skjámynd af síma): hver lína bar fullt heiti + dagsetningu + uppruna +
    // mánaðarval + Opna + Senda + × í einni bendu, og öll ár stóðu opin. Nú: stutt heiti (fullt heiti í title), það sem er
    // notað daglega (Opna · Senda · Halda áfram) sést, það sjaldgæfa (mánuður · aftengja · breyta) er bak við ⋯ á árinu, og
    // eldri ár eru samanfelld í eina línu. ENGINN takki hvarf og engin virkni breyttist — sömu data-eigindi, sömu hlustarar.
    const sj = html => '<span class="_bkc-sj">' + html + '</span>';   // sjaldgæft: sést aðeins þegar ⋯ ársins er opið
    const dot = ok => '<span class="_bkc-dot ' + (ok ? 'ok' : 'miss') + '"></span>';
    const tag = t => '<span class="_bkc-tag" title="' + t + '">' + (t === 'SKÝRSLA' ? '📄' : '🧾') + '</span>';
    const hetjaHefurGogn = C.reports.some(r => +r.year === NOW) || oldDocs.some(d => +d.year === NOW);
    const yearBlocks = yrs.map(y => {
      const reps = C.reports.filter(r => +r.year === y);
      const docs = oldDocs.filter(d => +d.year === y);
      const invSkjol = (C.invDocs || []).filter(d => +d.year === y);
      const fin = reps.find(r => r.status === 'final') || null;
      const draft = reps.find(r => r.status !== 'final') || null;
      const inv = (fin && fin._inv) || (draft && draft._inv) || null;
      const hasRep = !!fin || docs.length > 0;
      let pill, pc;
      const hasInv = !!inv || invSkjol.length > 0;   // tengt reikningsskjal ER reikningur — punkturinn sagði áður „vantar" við hliðina á því
      if (fin && inv && inv.paid_at) { pill = 'Lokið · greitt'; pc = 'ok'; }
      else if (fin && hasInv) { pill = 'Lokið'; pc = 'ok'; }
      else if (fin) { pill = 'Vantar reikning'; pc = 'warn'; }
      else if (draft) { pill = 'Í vinnslu'; pc = 'warn'; }
      else if (docs.length && hasInv) { pill = 'Skýrsla og reikningur'; pc = 'ok'; }
      else if (docs.length) { pill = 'Vantar reikning'; pc = 'warn'; }
      else if (y === NOW) { pill = 'Óskoðað'; pc = 'miss'; }
      else { pill = 'Ekkert skráð'; pc = 'miss'; }
      // skýrsla-lína
      let rep = '';
      if (fin) {
        const doc = fin.doc_id ? C.docs.find(d => d.id === fin.doc_id) : null;
        const url = doc ? (driveUrl(doc.drive_file_id) || storageUrl(doc.storage_path)) : '';
        const v = verdOf(fin);
        rep += '<span class="_bkc-yrtxt" title="Brunakerfisskýrsla ' + esc(fin.year || y) + ' · úttekt ' + esc(fin.uttekt_nr || '—') + ' · breytt ' + esc(String(fin.updated_at || '').slice(0, 10)) + (v.lines ? ' · ' + v.lines + ' verðlínur' : '') + '"><b>Skýrsla</b> · úttekt ' + esc(fin.uttekt_nr || '—') + '</span>' +
          // 30.09.2026: opnast í skjalaglugganum (sama mót og Ársskoðun), ekki nýjum
          // flipa. Innfelldur rammi í vinstri dálknum var prófaður sama dag og
          // tekinn út aftur — Agnar: „hrædilegt". Vafrinn límir SITT PDF-viðmót
          // (tækjastika, smámyndadálkur, 56% aðdráttur) inn í hannað spjald og
          // #toolbar=0 er hunsað í Chrome, svo útlitið verður aldrei okkar.
          // Í fullum glugga er sama viðmót í lagi — þar er skjalið erindið.
          (url ? '<button type="button" class="_bkc-act _ghost" data-repview="' + esc(url) + '" data-repname="úttekt ' + esc(fin.uttekt_nr || '') + '" title="Opna skýrsluna">📄 Skýrsla</button>' : '') +
          '<button type="button" class="_bkc-act" data-send="' + fin.id + '" style="background:#0f766e" title="Senda skýrslu og/eða reikning í tölvupósti">📧 Senda</button>' +
          sj('<button type="button" class="_bkc-act _ghost" data-open="' + fin.id + '">✏️ Breyta</button>');
      }
      if (draft) {
        rep += (rep ? '<br>' : '') + '<span class="_bkc-yrtxt"><b>Drög</b> · úttekt ' + esc(draft.uttekt_nr || '—') + ' · breytt ' + esc(String(draft.updated_at || '').slice(0, 10)) + '</span>' +
          '<button type="button" class="_bkc-act _ghost" data-open="' + draft.id + '">Halda áfram</button>' +
          '<button type="button" class="_bkc-act _x" data-del="' + draft.id + '" title="Eyða drögunum">×</button>';
      }
      docs.forEach(d => {
        const url = driveUrl(d.drive_file_id) || storageUrl(d.storage_path);
        const curMon = d.doc_date ? +String(d.doc_date).slice(5, 7) : 0;
        const monSel = '<select class="_bkc-monsel" data-doc="' + d.id + '" data-year="' + esc(d.year) + '" title="Mánuður skoðunar — vistast strax" ' +
          'style="border:1px solid ' + (curMon ? '#a9dcbd' : '#d0d4da') + ';border-radius:8px;padding:5px 6px;font:inherit;font-size:12px;background:' + (curMon ? '#f2faf5' : '#fff') + '">' +
          '<option value="">mán?</option>' + MONS.map((m, i) => '<option value="' + (i + 1) + '"' + (curMon === i + 1 ? ' selected' : '') + '>' + m + '</option>').join('') + '</select>';
        rep += (rep ? '<br>' : '') + '<span class="_bkc-yrtxt" title="Brunakerfisskýrsla ' + esc(d.year || y) + ' (PDF) · ' + esc(d.doc_date ? fmtDags(d.doc_date) : 'mánuð vantar') + (d.source ? ' · ' + esc(d.source) : '') + '"><b>Skýrsla</b>' + (curMon ? ' · ' + MONS[curMon - 1] + '.' : '') + '</span>' + (curMon ? sj(monSel) : monSel) +
          (url ? '<a class="_bkc-act _ghost" href="' + esc(url) + '" target="_blank" rel="noopener">Opna</a>' : '') +
          (url ? '<button type="button" class="_bkc-act" data-docsend="' + d.id + '" data-sendkind="brunakerfi" style="background:#0f766e" title="Senda í tölvupósti">📧 Senda</button>' : '') +
          sj('<button type="button" class="_bkc-act _x" data-docdel="' + d.id + '" title="Aftengja þetta skjal (röng skrá) — skráin sjálf helst í Drive">× aftengja</button>');
      });
      if (!rep) rep = '<span class="_bkc-yrmiss">' + (y === NOW ? 'engin skoðunarskýrsla enn — ＋ Ný skoðunarskýrsla hér að neðan' : 'vantar skýrslu') + '</span>';
      // ── reikningur-lína ────────────────────────────────────────────────
      // 2026-09-10 (Agnar: „reyna að hafa þetta eins stílhreint og skýrt og
      // hægt er"). Fyrri útgáfa límdi saman texta og skjöl og gat sagt
      // „enginn reikningur skráður í appinu" og talið upp reikning Í SÖMU
      // LÍNU. Nú er byggt upp úr bitum: vanti-textinn birtist AÐEINS þegar
      // ekkert er til. Ein staðhæfing per línu.
      const invBitar = [];
      if (inv) {
        const lab = invLabel(inv);
        const owner = (fin && fin._inv === inv) ? fin : draft;
        // Handtengdur reikningur má alltaf vera aftengjanlegur — annars situr
        // röng tenging föst og eina leiðin til baka er að láta forrita hana burt.
        const handtengt = !!(window.BrunakerfiReikningur && BrunakerfiReikningur.getInvLink && BrunakerfiReikningur.getInvLink(C.co.id, y));
        invBitar.push('<span class="_bkc-yrtxt"><b>' + esc(inv.num || 'reikningur') + '</b>' + (inv.samtals ? ' · ' + fmtKr(+inv.samtals) : '') + ' · <span class="_bkc-invst _' + lab + '">' + lab + '</span></span>' +
          (owner ? '<button type="button" class="_bkc-act _ghost" data-invpdf="' + owner.id + '" title="Opna reikninginn (PDF)">🧾 Reikningur</button>' : '') +
          (handtengt ? sj('<button type="button" class="_bkc-act _x" data-invunlink="' + y + '" title="Aftengja handtengda reikninginn — reikningurinn sjálfur helst óbreyttur">× aftengja</button>') : ''));
      }
      if (invSkjol.length) {
        const nafnA = d => d.invoice_number || ('Reikningur ' + (d.year || y));
        // Aðal = það sem Agnar valdi; annars nýjasta skjalið (dags, svo id).
        const valid = adalReikn(C.co.id, y);
        const radad = invSkjol.slice().sort((a, b) => String(b.doc_date || '').localeCompare(String(a.doc_date || '')) || b.id - a.id);
        const d = radad.find(x => x.id === valid) || radad[0];
        const u = driveUrl(d.drive_file_id) || storageUrl(d.storage_path);
        // Eitt skjal: nafnið feitletrað. Fleiri: nafnið ER valið — listi í
        // stað auka-raða, svo línan sé alltaf ein og takkarnir einir.
        const heiti = invSkjol.length > 1
          ? '<select class="_bkc-adalsel" data-year="' + y + '" title="' + invSkjol.length + ' reikningsskjöl á árinu — veldu aðal" style="border:1px solid #d0d4da;border-radius:8px;padding:5px 7px;font:inherit;font-size:12.5px;font-weight:700;background:#fff">' +
              radad.map(x => '<option value="' + x.id + '"' + (x.id === d.id ? ' selected' : '') + '>' + esc(nafnA(x)) + '</option>').join('') + '</select>'
          : '<b>' + esc(nafnA(d)) + '</b>';
        invBitar.push('<span class="_bkc-yrtxt" title="' + esc(nafnA(d)) + ' (PDF)' + (d.doc_date ? ' · ' + esc(fmtDags(d.doc_date)) : '') + '">' + heiti + '</span>' +
          (u ? '<a class="_bkc-act _ghost" href="' + esc(u) + '" target="_blank" rel="noopener">Opna</a>' : '') +
          (u ? '<button type="button" class="_bkc-act _ghost" data-docsend="' + d.id + '" data-sendkind="reikningur" title="Senda reikninginn í tölvupósti">📧 Senda</button>' : '') +
          sj('<button type="button" class="_bkc-act _x" data-docdel="' + d.id + '" title="Aftengja þetta skjal — skráin sjálf helst í Drive">× aftengja</button>'));
      }
      // Vanti-textinn er VARASVAR — hann á aldrei að standa við hliðina á
      // reikningi sem er til.
      if (!invBitar.length) {
        invBitar.push('<span class="_bkc-yrmiss">' + (fin ? 'vantar reikning — stofnast með „Stofna drög" í stöðulínunni efst' : draft ? 'kemur þegar skýrslan er kláruð' : 'enginn reikningur skráður') + '</span>');
      }
      // `<br>` gerir EKKERT inni í _bkc-yrbody — hún er flex-kassi, svo tveir
      // reikningar sama árs runnu saman í eina línu sem vafðist í miðju
      // („R-107260 … R-107337 … Senda ×"). Hver færsla fær sína eigin röð.
      const invHtml = invBitar.length > 1
        ? invBitar.map(x => '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;width:100%">' + x + '</div>').join('')
        : invBitar.join('');
      {
      }
      // Opið sjálfgefið: líðandi ár og nýjasta árið með gögnum. Val notandans (smellur á hausinn) lifir yfir endurteikningar.
      const nyjastMedGogn = yrs.find(a => C.reports.some(r => +r.year === a) || oldDocs.some(d => +d.year === a));
      const opid = y === NOW ? true : ((y in _arOpid) ? _arOpid[y] : (y === nyjastMedGogn && !hetjaHefurGogn));
      const _html = '<div class="_bkc-yr' + (opid ? '' : ' _lokad') + (_arMeira[y] ? ' _meira' : '') + '" data-ar="' + y + '">' +
        '<div class="_bkc-yrhd" data-arhaus="' + y + '" title="Smelltu til að ' + (opid ? 'fella saman' : 'opna') + '"><span class="_bkc-yrlbl _' + pc + '">' + y + '</span><span class="_bkc-st _bkc-pill _' + pc + '">' + pill + '</span>' + (reps.length + docs.length > 1 ? '<small>' + (reps.length + docs.length) + ' skýrslur</small>' : '') +
          '<span class="_bkc-yrsp"></span><button type="button" class="_bkc-meira" data-armeira="' + y + '" title="Sjaldgæfar aðgerðir: breyta mánuði · aftengja skjal · breyta skýrslu">⋯</button><span class="_bkc-ork">▾</span></div>' +
        '<div class="_bkc-yrrow">' + dot(hasRep) + tag('SKÝRSLA') + '<div class="_bkc-yrbody">' + rep + '</div></div>' +
        '<div class="_bkc-yrrow">' + dot(hasInv) + tag('REIKNINGUR') + '<div class="_bkc-yrbody">' + invHtml + '</div></div>' +
      '</div>';
      // hasInv: hetjan teiknaði reikningsröð sjálf (invBitar). 291 les þetta og
      // sleppir sinni eigin röð — sjá athugasemdina við #_bkc-heroinv hér að neðan.
      return { y, html: _html, pill, pc, fin, draft, hasInv: !!inv, hefur: !!(fin || draft || docs.length) };
    });
    // 21.09.2026 (Agnar: „similar approach as slökkvikerfi"): skoðun ÁRSINS er aðalatriðið efst — eitt spjald með stöðu,
    // skýrslu, reikningi og EINNI aðalaðgerð (sama mynstur og 🍳 í 386). Sagan er aukaatriði fyrir neðan, samanfelld.
    const hetja = yearBlocks.find(b => b.y === NOW) || null;
    const fyrriAr = yearBlocks.filter(b => b.y !== NOW);
    const yearRows = fyrriAr.map(b => b.html).join('');
    const addFileStrip =
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px dashed #d7dade;font-size:12.5px;color:#59606c">' +
        '＋ Bæta við:' +
        '<select id="_bkc-addkind" style="border:1px solid #d0d4da;border-radius:8px;padding:6px 8px;font:inherit;font-size:12.5px">' +
          '<option value="brunakerfi">Skýrslu</option><option value="reikningur">Reikningi</option>' +
        '</select>' +
        '<select id="_bkc-addyear" style="border:1px solid #d0d4da;border-radius:8px;padding:6px 8px;font:inherit;font-size:12.5px">' +
          (function () { const y = new Date().getFullYear(); let o = ''; for (let i = y; i >= y - 6; i--) o += '<option' + (i === y ? ' selected' : '') + '>' + i + '</option>'; return o; })() +
        '</select>' +
        '<label class="_bkc-act _ghost" style="cursor:pointer">📎 Velja PDF<input type="file" id="_bkc-addfile" accept="application/pdf" style="display:none"></label>' +
        // Reikningur sem er ÞEGAR til í appinu þarf enga skrá — bara númer.
        // Reiturinn birtist aðeins þegar „Reikningi" er valið, svo röndin sé
        // jafn stutt og áður í daglegri notkun.
        '<span id="_bkc-linkwrap" style="display:none;align-items:center;gap:6px">' +
          '<span style="color:#9aa2ae">eða tengja nr.</span>' +
          '<input id="_bkc-linknum" type="text" placeholder="R-000651" style="width:104px;border:1px solid #d0d4da;border-radius:8px;padding:6px 8px;font:inherit;font-size:12.5px">' +
          '<button type="button" class="_bkc-act _ghost" id="_bkc-linkgo">🔗 Tengja</button>' +
        '</span>' +
        '<span id="_bkc-addstatus" style="color:#8b93a1"></span>' +
      '</div>';

    // Skýrslan sem liggur efst í vinstri dálknum: LOKIÐ-skýrsla ársins fyrst,
    // annars nýjasta skjalið sem á sér slóð.
    let skyrslaSrc = '', skyrslaNafn = '';
    (function () {
      const finNow = C.reports.find(r => +r.year === NOW && r.status === 'final') || C.reports.find(r => r.status === 'final');
      const doc = finNow && finNow.doc_id ? C.docs.find(d => d.id === finNow.doc_id) : null;
      if (doc) { skyrslaSrc = driveUrl(doc.drive_file_id) || storageUrl(doc.storage_path); skyrslaNafn = 'úttekt ' + (finNow.uttekt_nr || finNow.year || ''); }
      // 30.09.2026 (Agnar: „tharft ekkert ad syna gomlu tegundina · bara nyja toma
      // fyrir naestu skodun"). Hér var áður varaleið sem greip nýjasta INNFLUTTA
      // skjalið úr Drive. Þau eru gömul, skönnuð og bera hvorki verð né reiti —
      // spjaldið sýndi þau samt og hausinn bar bara ártal. Þau eru ekki lengur
      // dregin hingað; sé engin app-skýrsla til stendur reiturinn tilbúinn fyrir
      // NÆSTU skoðun í staðinn. Gömlu skjölin eru áfram öll undir „Fyrri ár".
    })();

    // verð / reikningsyfirlit
    const verds = C.reports.map(r => ({ r, v: verdOf(r) })).filter(x => x.v.lines > 0);
    const verdSum = verds.reduce((a, x) => a + x.v.total, 0);
    // 30.09.2026 (Agnar: „þetta er hræðileg samantektar reikningagerð"). Spjaldið
    // sýndi EINA tölu per úttekt og ekkert annað — hvorki hvað var rukkað né hvað
    // vantaði, og engin leið héðan til að bæta við lið. Nú fylgja línurnar með og
    // ritillinn er einum smelli í burtu. Taflan heldur sér óbreytt að öðru leyti
    // svo breiddin haggist ekki (Stöðugt viðmót).
    const linurOf = (r) => ((r.data && r.data.verd && r.data.verd.linur) || []);
    // Akstur gleymdist kerfisbundið af því að liðurinn var ekki til í verðlistanum
    // (lagað í 273 sama dag). Merkjum þær skýrslur sem hann vantar enn á — það er
    // eina leiðin til að sjá gömlu skýrslurnar sem fóru út án hans.
    const vantarAkstur = (r) => !linurOf(r).some(l => /akstur/i.test(String(l.name || '')));
    // Ritill, ekki tafla: hver lína er reitir sem má breyta beint hér.
    const verdHtml = verds.length ?
      verds.map(x =>
        '<div data-vrep="' + esc(x.r.id) + '">' +
        '<div style="font-size:11.5px;font-weight:800;color:#59606c;padding:2px 0 8px">' +
          esc(x.r.uttekt_nr || '—') + ' · ' + esc(x.r.year || '') +
          (x.r.status === 'final' ? '' : ' <span style="color:#8a6100">(drög)</span>') +
        '</div>' +
        '<div class="_bkc-vh"><span>Liður</span><span style="text-align:center">Magn</span><span style="text-align:right">Verð</span><span style="text-align:center">Afsl.%</span><span style="text-align:right">Samtals</span><span></span></div>' +
        linurOf(x.r).map((l, i) =>
          '<div class="_bkc-vr">' +
            '<input class="_bkc-vin" data-vk="name" data-vi="' + i + '" value="' + esc(l.name || '') + '" placeholder="Lýsing">' +
            '<input class="_bkc-vin" data-vk="qty" data-vi="' + i + '" inputmode="numeric" value="' + esc(l.qty == null ? '' : l.qty) + '" style="text-align:center">' +
            '<input class="_bkc-vin" data-vk="price" data-vi="' + i + '" inputmode="decimal" value="' + esc(l.price == null ? '' : fmtInn(l.price)) + '" style="text-align:right">' +
            '<input class="_bkc-vin" data-vk="afsl" data-vi="' + i + '" inputmode="decimal" placeholder="0" value="' + esc(l.afsl == null ? '' : l.afsl) + '" style="text-align:center;color:#b3341a;font-weight:700">' +
            '<span class="_bkc-vsum" data-vsum="' + i + '">' + fmtKr(vLina(l)) + '</span>' +
            '<button type="button" class="_bkc-vx" data-vdel="' + i + '" title="Eyða línunni">✕</button>' +
          '</div>').join('') +
        (vantarAkstur(x.r) ? '<div style="font-size:11.5px;color:#8a6100;font-weight:700;padding:7px 0">⚠️ Enginn akstur á þessari skýrslu</div>' : '') +
        '<button type="button" class="_bkc-act _ghost" data-vadd="1" style="margin-top:9px">＋ Auð lína</button>' +
        '</div>').join('')
      // 30.09.2026 (Agnar: „skil ekki alveg hvað er í gangi þarna"). Textinn sagði
      // ALLTAF „smelltu á ✏️ Kostnaðarliðir" — en sá takki er aðeins teiknaður þegar
      // app-skýrsla er til (newest). Á félagi sem á bara innflutt PDF úr Drive vísaði
      // hann því á takka sem var hvergi á skjánum. Verðlínur búa inni í app-skýrslu;
      // skannað skjal ber engar. Textinn segir það núna í stað þess að gefa fyrirmæli
      // sem ekki er hægt að fylgja.
      : (newest
          ? '<div class="_bkc-empty">Engar verðlínur enn — smelltu á „✏️ Kostnaðarliðir" hér fyrir neðan.</div>'
          : '<div class="_bkc-empty">Útreikningarnir bíða í skoðunarskýrslunni.<br><button type="button" class="_bkc-act" id="_bkc-verdny" style="background:#141619;margin-top:9px">＋ Byrja skoðun ' + NOW + '</button></div>');

    // búnaðarskrá úr nýjustu skýrslu
    let bunHtml = '<div class="_bkc-empty">Engin skýrsla enn — búnaðarskráin fyllist sjálfkrafa úr fyrstu skoðunarskýrslu.</div>';
    if (newest && newest.data && newest.data.bunadur) {
      const s = newest.data;
      const rows = (s.bunadur || []).map((b, i) => {
        const sam = (+b.iLagi || 0) + (+b.ekki || 0);
        if (!sam && !(+b.vantar || 0)) return '';
        return '<tr><td style="font-weight:600">' + esc(b.label || BUN_LABELS[i] || '') + '</td>' +
          '<td style="text-align:center;font-weight:700">' + sam + '</td>' +
          '<td style="text-align:center;color:#1f8a4c">' + (b.iLagi || 0) + '</td>' +
          '<td style="text-align:center;color:' + ((+b.ekki || 0) > 0 ? '#c93c1d;font-weight:700' : '#16181c') + '">' + (b.ekki || 0) + '</td>' +
          '<td style="text-align:center;color:' + ((+b.vantar || 0) > 0 ? '#b07a10;font-weight:700' : '#16181c') + '">' + (b.vantar || 0) + '</td></tr>';
      }).join('');
      const st = s.stod || {};
      bunHtml =
        '<table class="_bkc-tbl"><thead><tr><th>Búnaður</th><th style="text-align:center">Samtals</th><th style="text-align:center">Í lagi</th><th style="text-align:center">Ekki</th><th style="text-align:center">Vantar</th></tr></thead><tbody>' +
        (rows || '<tr><td colspan="5" class="_bkc-empty">Engir teljarar skráðir í skýrslunni.</td></tr>') + '</tbody></table>' +
        '<div style="font-size:12px;color:#59606c;margin-top:8px;line-height:1.6">' +
          (st.gerd ? '<b>Kerfisgerð:</b> ' + esc(st.gerd) + (st.fjoldi ? ' · ' + esc(st.fjoldi) + ' rásir/slaufur' : '') + '<br>' : '') +
          (st.tegund ? '<b>Tegund búnaðar:</b> ' + esc(st.tegund) + '<br>' : '') +
          (st.fjargaesla ? '<b>Fjargæsla:</b> ' + esc(st.fjargaesla) : '') +
        '</div>';
    }

    // ── MIÐJAN Í BRUNASTÁLI C (30.09.2026, Agnar: „hannað þessa síðu betur, verðútreikningarnir kjánalegir og hrátt …
    // svipuðum gír og ársskoðun úttekt · efri og neðri eiga að vera eins, miðjan mismunandi eftir tegund úttektar")
    // Sama umgjörð og slökkvitækja-úttektin (403/404): tvö stálspjöld hlið við hlið — vinstra = skoðunin og blaðið
    // sjálft (ramminn ÓSNERTUR, Agnar: „ekki breyta skjalinu sjálfu sem er innan í rammanum"), hægra = skýrsla og
    // reikningur með reitum og línum reiknings sem tafla. SÖMU auðkenni og hlustanir og áður (#_bkc-note, #_bkc-new,
    // #_bkc-heroinv, [data-vrep], ._bkc-reikn, #_bkc-vlist, #_bkc-repbig, #_bkc-addtog …) — aðeins umgjörðin er ný.
    // Mockup: Design-strigi spjald K (scratchpad k/mockup-K-brunakerfi.html).
    const repNow = C.reports.find(r => +r.year === NOW && r.status === 'final') || C.reports.find(r => +r.year === NOW) || null;
    const meta = (repNow && repNow.data && repNow.data.meta) || {};
    const bun = ((repNow && repNow.data && repNow.data.bunadur) || []).map((x, i) => ({ label: x.label || BUN_LABELS[i] || '', n: (+x.iLagi || 0) + (+x.ekki || 0) })).filter(x => x.n > 0);
    const einingar = bun.reduce((t, x) => t + x.n, 0);
    const litur = l => /reyk/i.test(l) ? '#38bdf8' : /hita/i.test(l) ? '#f97316' : /handbo/i.test(l) ? '#2563eb' : /bj[öo]ll|s[íi]ren/i.test(l) ? '#dc2626' : /rafhl/i.test(l) ? '#f6b545' : '#9ca3af';
    const stika = bun.length
      ? '<div class="b274-stika" role="img" aria-label="' + esc(bun.map(x => x.label + ' ' + x.n).join(', ')) + '">' + bun.map(x => '<i style="flex:' + x.n + ';background:' + litur(x.label) + '"></i>').join('') + '</div>' +
        '<div class="b274-legend">' + bun.map(x => '<span><i style="background:' + litur(x.label) + '"></i>' + esc(x.label) + ' <b>' + x.n + '</b></span>').join('') + '</div>'
      : '';
    const pc = hetja ? hetja.pc : 'miss';
    const pillTxt = hetja ? hetja.pill : 'Óskoðað';
    const led = pc === 'ok' ? 'g' : pc === 'warn' ? 'y' : 'r';
    const repUrl = (function () { const d = repNow && repNow.doc_id ? C.docs.find(x => x.id === repNow.doc_id) : null; return d ? (driveUrl(d.drive_file_id) || storageUrl(d.storage_path)) : ''; })();
    const hasVerd = verds.length > 0;
    const anVsk = verds.reduce((t, x) => t + x.v.sum, 0);
    const reikn = repNow && repNow._inv ? repNow._inv : null;
    const reiknTxt = reikn ? (reikn.num || 'reikningur') + ' · ' + invLabel(reikn) : (hetja && hetja.hasInv ? 'reikningsskjal tengt' : 'enginn reikningur');
    const reiknPc = reikn ? (reikn.paid_at || reikn.krafa_sent_at ? 'ok' : 'vinnsla') : (hetja && hetja.hasInv ? 'ok' : 'vantar');
    const skyrslaPc = repNow ? (repNow.status === 'final' ? 'ok' : 'vinnsla') : 'vantar';
    const skyrslaTxt = repNow ? ('Skýrsla ' + (repNow.uttekt_nr || NOW) + (repNow.status === 'final' ? ' lokið' : ' drög')) : 'Skýrsla ' + NOW + ' vantar';
    const reitur = (lbl, val, mono, tomt) => '<div><div class="b274-rl">' + lbl + '</div><div class="b274-reitur' + (mono ? ' mono' : '') + (tomt ? ' tomt' : '') + '">' + val + '</div></div>';
    w.innerHTML =
      '<div class="_bkc-cust">' +
        '<div class="_bkc-custL">' +
          '<div class="_bkc-nafn">' + esc(co.nafn || '') + '</div>' +
          '<div class="_bkc-sub">' + (co.kennitala ? 'kt. ' + esc(fmtKt(co.kennitala)) + ' · ' : '') + esc(co.heimilisfang || '') + '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
            (simi ? '<a class="_bkc-chip" href="tel:' + esc(String(simi).replace(/\s+/g, '')) + '">📞 ' + esc(simi) + '</a>' : '') +
            (co.netfang ? '<a class="_bkc-chip" href="mailto:' + esc(co.netfang) + '">✉️ ' + esc(co.netfang) + '</a>' : '') +
            (co['tengiliður'] ? '<span class="_bkc-chip" style="cursor:default">👤 ' + esc(co['tengiliður']) + '</span>' : '') +
            '<span class="_bkc-chip" id="_bkc-openco">🏢 Fyrirtækjaspjald →</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="_bkc-grid b274">' +
        // ── VINSTRA: skoðunin og blaðið ──
        '<section class="b274-k">' +
          '<header class="b274-hd">' +
            '<div class="b274-hl">' +
              '<div class="b274-t"><i class="b274-led ' + led + '"></i>Brunakerfis skoðun ' + NOW + ' · ' + esc(pillTxt) + '</div>' +
              '<div class="b274-tala"><span class="n">' + (einingar || '—') + '</span><span class="l">' + (einingar ? 'einingar í kerfinu' : 'engin skoðun enn') + '</span></div>' +
            '</div>' +
            '<div class="b274-hm">' + stika + '</div>' +
            '<div class="b274-hr">' +
              (meta.dags ? '<span class="b274-plata dokk">📅 Skoðað ' + esc(fmtDags(meta.dags)) + '</span>' : '') +
              '<div class="b274-hb">' +
                (skyrslaSrc ? '<button type="button" class="_bkc-hb b274-silfur" id="_bkc-repbig" title="Opna skýrsluna í fullum skjá">⤢ Stækka</button>' : '') +
                (repUrl ? '<button type="button" class="_bkc-act b274-malmur" data-repview="' + esc(repUrl) + '" data-repname="úttekt ' + esc((repNow && repNow.uttekt_nr) || '') + '" title="Opna skýrsluna">📄 Opna skýrsluna</button>' : '') +
              '</div>' +
            '</div>' +
          '</header>' +
          '<div class="b274-stal">' +
            '<div class="b274-rod"><span class="b274-merki">Skýrslan' + (skyrslaNafn ? ' · ' + esc(skyrslaNafn) : '') + '</span>' +
              (repNow ? '<span class="b274-plata ' + skyrslaPc + '"><i></i>' + (repNow.status === 'final' ? 'Lokið' : 'Drög') + '</span>' : '') +
              '<span class="b274-sp"></span><span class="b274-hint">Blaðið er vinnuformið — reitirnir fyllast í skýrslunni sjálfri</span></div>' +
            // ramminn: ÓBREYTTUR (sama iframe, sömu breytur) — eða tómt blað sem býður í næstu skoðun
            (skyrslaSrc ?
              '<div class="b274-rammi">' +
                '<iframe id="_bkc-repframe" src="' + esc(skyrslaSrc) + '#toolbar=0&navpanes=0&scrollbar=0&view=FitH" title="Brunakerfisskýrsla" ' +
                  'style="width:100%;height:78vh;min-height:520px;border:0;background:#fff;display:block"></iframe>' +
              '</div>'
            : '<div class="b274-tomt">' +
                '<div>Tóm skoðunarskýrsla bíður — búnaðaryfirlit, mælingar og kostnaðarliðir.</div>' +
                '<button type="button" class="_bkc-act b274-malmur" id="_bkc-repny">＋ Byrja skoðun ' + NOW + '</button>' +
              '</div>') +
            // 30.09.2026 (Agnar: „ekki setja skýrslurnar þarna, bara fyrir neðan"): fyrri ár, skjöl og samningar búa í
            // „Skjöl og viðhengi" neðar á síðunni (199/403) — hér er aðeins skoðun ársins og ein aðgerð: ný skýrsla.
            '<div class="b274-rod" style="margin-top:2px"><span class="b274-hint">Fyrri ár, skjöl og samningar eru í „Skjöl og viðhengi“ hér fyrir neðan.</span><span class="b274-sp"></span>' +
              '<button type="button" class="_bkc-new b274-ny' + (hetja && hetja.hefur ? ' _litid' : '') + '" id="_bkc-new">' + (hetja && hetja.hefur ? '＋ Önnur skoðunarskýrsla' : '＋ Ný skoðunarskýrsla ' + NOW) + '</button>' +
            '</div>' +
          '</div>' +
        '</section>' +
        // ── HÆGRA: skýrsla og reikningur ──
        '<section class="b274-k">' +
          '<header class="b274-hd">' +
            '<div class="b274-hl">' +
              '<div class="b274-t"><i class="b274-led y"></i>Skýrsla og reikningur ' + NOW + '</div>' +
              '<div class="b274-tala"><span class="n">' + (hasVerd ? fmtKr(verdSum).replace(/ kr$/, '') : '—') + '</span><span class="l">kr með vsk</span></div>' +
            '</div>' +
            '<div class="b274-hm b274-plotur">' +
              '<span class="b274-plata ' + skyrslaPc + '"><i></i>' + esc(skyrslaTxt) + '</span>' +
              '<span class="b274-plata ' + reiknPc + '"><i></i>' + esc(reiknTxt) + '</span>' +
              '<span class="b274-hint">' + (hasVerd ? verds.reduce((t, x) => t + x.v.lines, 0) + ' línur' : 'engar verðlínur') + (einingar ? ' · ' + einingar + ' einingar' : '') + '</span>' +
            '</div>' +
            // aðgerðir ársins — sömu data-eigindi og hetju-raðirnar báru (data-send · data-invpdf · data-open), víringin óbreytt
            '<div class="b274-hr"><div class="b274-hb">' +
              (repNow && repNow.status === 'final' ? '<button type="button" class="_bkc-act b274-graenn" data-send="' + repNow.id + '" title="Senda skýrslu og/eða reikning í tölvupósti">📧 Senda</button>' : '') +
              (repNow && repNow._inv ? '<button type="button" class="_bkc-act b274-silfur" data-invpdf="' + repNow.id + '" title="Opna reikninginn (PDF)">🧾 Reikningur</button>' : '') +
              (repNow && repNow.status !== 'final' ? '<button type="button" class="_bkc-act b274-malmur" data-open="' + repNow.id + '">Halda áfram</button>' : '') +
            '</div></div>' +
          '</header>' +
          '<div class="b274-stal">' +
            '<div class="b274-thri">' +
              reitur('Skoðunaraðili', meta.madur ? esc(meta.madur) : 'skráð í skýrslunni', false, !meta.madur) +
              reitur('Framkvæmd', meta.dags ? esc(fmtDags(meta.dags)) : '—', true, !meta.dags) +
              reitur('Úttekt nr.', meta.nr ? esc(meta.nr) : ((repNow && repNow.uttekt_nr) ? esc(repNow.uttekt_nr) : '—'), true, !(meta.nr || (repNow && repNow.uttekt_nr))) +
            '</div>' +
            '<div><div class="b274-rl">Minnispunktur <small>vistast sjálfkrafa, sést á öllum tækjum</small></div>' +
              '<textarea class="_bkc-note b274-note" id="_bkc-note" placeholder="t.d. Lykill í hólfi hjá húsverði · hringja á undan…">' + esc(C.note) + '</textarea></div>' +
            // línur reiknings — ritillinn (sömu [data-vrep]-blokkir) sem tafla
            '<div class="b274-rod" style="margin-top:2px"><span class="b274-merki">Línur reiknings</span>' +
              (verds.some(x => vantarAkstur(x.r)) ? '<span class="b274-plata vantar"><i></i>Akstur vantar</span>' : '') +
              '<span class="b274-sp"></span>' +
              '<button type="button" class="_bkc-act _ghost" id="_bkc-vlist">🏷 Verðlisti</button>' +
              (newest ? '<button type="button" class="_bkc-act _ghost" data-open="' + esc(newest.id) + '" title="Opna skýrsluna — þar eru verðlistaval og efni úr innkaupum">✏️ Í skýrslu</button>' : '') +
            '</div>' +
            '<div class="b274-linur">' + verdHtml + '</div>' +
            (hasVerd ? '<div class="_bkc-reikn b274-reikn">' +
              '<div><span>Án vsk</span><b>' + fmtKr(anVsk) + '</b></div>' +
              '<div><span>Vsk ' + VAT_PCT + '%</span><b>' + fmtKr(verdSum - anVsk) + '</b></div>' +
              '<div class="_big"><span>Samtals með vsk</span><span>' + fmtKr(verdSum) + '</span></div>' +
            '</div>' : '') +
            '<div class="b274-inv"><div id="_bkc-heroinv" data-hasinv="' + (hetja && hetja.hasInv ? '1' : '') + '"></div></div>' +
          '</div>' +
        '</section>' +
      '</div>';
    injectB274();

    // víring
    // Ritillinn: innsláttur uppfærir línuna og heildartölurnar Á STAÐNUM (enginn
    // endurteikning meðan skrifað er — Stöðugt viðmót), og vistast 0,9 sek síðar.
    w.querySelectorAll('[data-vrep]').forEach(blokk => {
      const rep = C.reports.find(r => String(r.id) === blokk.dataset.vrep); if (!rep) return;
      const linur = () => ((rep.data && rep.data.verd && rep.data.verd.linur) || []);
      const uppfaeraTolur = () => {
        blokk.querySelectorAll('[data-vsum]').forEach(sp => {
          const l = linur()[+sp.dataset.vsum]; if (l) sp.textContent = fmtKr(vLina(l));
        });
        const heild = C.reports.map(r => verdOf(r)).filter(v => v.lines > 0);
        const box = w.querySelector('._bkc-reikn');
        if (box) {
          const an = heild.reduce((a, v) => a + v.sum, 0), med = heild.reduce((a, v) => a + v.total, 0);
          const b = box.querySelectorAll('b'), big = box.querySelector('._big span:last-child');
          if (b[0]) b[0].textContent = fmtKr(an);
          if (b[1]) b[1].textContent = fmtKr(med - an);
          if (big) big.textContent = fmtKr(med);
        }
      };
      blokk.querySelectorAll('[data-vk]').forEach(inp => inp.addEventListener('input', () => {
        const l = linur()[+inp.dataset.vi]; if (!l) return;
        l[inp.dataset.vk] = (inp.dataset.vk === 'name' || num(inp.value) == null) ? inp.value : String(num(inp.value));   // geymt hreint, birt með punkti
        uppfaeraTolur(); vistaSidar(rep);
      }));
      blokk.querySelectorAll('[data-vk="price"]').forEach(inp => inp.addEventListener('change', () => { if (num(inp.value) != null) inp.value = fmtInn(inp.value); }));
      blokk.querySelectorAll('[data-vdel]').forEach(b => b.addEventListener('click', async () => {
        const l = linur()[+b.dataset.vdel]; if (!l) return;
        if (!confirm('Eyða línunni „' + (l.name || '') + '"?')) return;
        linur().splice(+b.dataset.vdel, 1);
        render(); vistaSidar(rep);
      }));
      const add = blokk.querySelector('[data-vadd]');
      if (add) add.addEventListener('click', async () => {
        rep.data = rep.data || {}; rep.data.verd = rep.data.verd || {};
        rep.data.verd.linur = rep.data.verd.linur || [];
        rep.data.verd.linur.push({ name: '', qty: '1', price: '', afsl: '' });
        render(); vistaSidar(rep);
      });
    });
    const repNy = w.querySelector('#_bkc-repny');
    if (repNy) repNy.addEventListener('click', () => { const b = w.querySelector('#_bkc-new'); if (b) b.click(); });
    const verdNy = w.querySelector('#_bkc-verdny');
    if (verdNy) verdNy.addEventListener('click', () => { const b = w.querySelector('#_bkc-new'); if (b) b.click(); });
    const repBig = w.querySelector('#_bkc-repbig');
    if (repBig) repBig.addEventListener('click', () => openDocViewer({ title: 'Brunakerfisskýrsla ' + skyrslaNafn, src: skyrslaSrc }));
    w.querySelectorAll('[data-repview]').forEach(b => b.addEventListener('click', () => {
      openDocViewer({ title: 'Brunakerfisskýrsla ' + (b.dataset.repname || ''), src: b.dataset.repview });
    }));
    w.querySelector('#_bkc-note').addEventListener('input', e => { C.note = e.target.value; saveNote(e.target.value); });
    w.querySelector('#_bkc-openco').addEventListener('click', () => {
      close();
      if (window._openCompanySafe) window._openCompanySafe(+co.id);
      else if (window.App && App.switchView) App.switchView('companies');
    });
    w.querySelector('#_bkc-new').addEventListener('click', () => {
      if (window.BrunakerfiSkyrsla && BrunakerfiSkyrsla.openForm) BrunakerfiSkyrsla.openForm(co, null);
    });
    const vl = w.querySelector('#_bkc-vlist');
    if (vl) vl.addEventListener('click', () => {
      if (window.BrunakerfiSkyrsla && BrunakerfiSkyrsla.openPriceEditor) BrunakerfiSkyrsla.openPriceEditor(null);
    });
    // hliðarspjöld (samningur · búnaðarskrá · verð): smellur á haus fellir saman / opnar. Val notandans lifir yfir endurteikningar.
    w.querySelectorAll('._bkc-fold').forEach((k, i) => {
      if (i in _foldVal) k.classList.toggle('_saman', _foldVal[i]);
      const h = k.querySelector('[data-fold]'); if (h) h.addEventListener('click', () => { _foldVal[i] = !k.classList.contains('_saman'); k.classList.toggle('_saman', _foldVal[i]); });
    });
    const at = w.querySelector('#_bkc-addtog'), aw = w.querySelector('#_bkc-addwrap');
    if (at && aw) { if (_addOpid) { aw.style.display = ''; at.style.display = 'none'; } at.addEventListener('click', () => { _addOpid = true; aw.style.display = ''; at.style.display = 'none'; }); }
    // árshaus: fella saman / opna · ⋯: sýna sjaldgæfu aðgerðirnar. Hreint útlit — flettir klasa, engin endurteikning, engin skrif.
    w.querySelectorAll('[data-arhaus]').forEach(h => h.addEventListener('click', e => {
      if (e.target.closest('[data-armeira]')) return;
      const y = +h.dataset.arhaus, yr = h.closest('._bkc-yr'); if (!yr || yr.closest('._bkc-hero')) return;
      const lokast = !yr.classList.contains('_lokad');
      yr.classList.toggle('_lokad', lokast); _arOpid[y] = !lokast;
    }));
    w.querySelectorAll('[data-armeira]').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      const y = +b.dataset.armeira, yr = b.closest('._bkc-yr'); if (!yr) return;
      _arMeira[y] = !yr.classList.contains('_meira'); yr.classList.toggle('_meira', _arMeira[y]);
    }));
    w.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
      const r = C.reports.find(x => x.id === b.dataset.open);
      if (r && window.BrunakerfiSkyrsla) BrunakerfiSkyrsla.openForm(co, r);
    }));
    w.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Eyða þessum drögum?')) return;
      // 17.09.2026: .delete() kastar ekki — catch-ið keyrði aldrei. Áður hlóðst
      // spjaldið bara upp á nýtt með drögin enn á sínum stað og enga skýringu.
      const del = await SB().from('brunakerfi_skyrslur').delete().eq('id', b.dataset.del);
      if (del && del.error) {
        console.warn('[bkc] eyða drögum', del.error);
        alert('Drögin eyddust EKKI — þau eru enn í listanum.\n\n' + (del.error.message || ''));
        try { if (window.logProblem) window.logProblem('bkc_drog_delete_failed', String(del.error.message || del.error).slice(0, 160)); } catch (_) {}
        return;
      }
      reload();
    }));
    // 📧 Senda — brunakerfisskýrsla (+ reikningur) ársins gegnum póst-ritilinn (254).
    w.querySelectorAll('[data-send]').forEach(b => b.addEventListener('click', () => {
      const r = C.reports.find(x => x.id === b.dataset.send);
      if (r) sendReport(r);
    }));
    // 🧾 Reikningur — opnar reikning skýrslunnar sem PDF/prent (sama lína og skýrslan).
    w.querySelectorAll('[data-invpdf]').forEach(b => b.addEventListener('click', () => {
      const r = C.reports.find(x => x.id === b.dataset.invpdf);
      if (r && r._inv) openInvoicePdf(r._inv);
    }));
    // 📧 Senda — stakt eldra skjal / samningur.
    w.querySelectorAll('[data-docsend]').forEach(b => b.addEventListener('click', async () => {
      const id = +b.dataset.docsend, kind = b.dataset.sendkind || 'brunakerfi';
      const d = C.docs.find(x => x.id === id) || C.samningar.find(x => x.id === id);
      if (!d) return;
      const fbase = kind === 'samningur' ? 'Þjónustusamningur' : ('Brunakerfisskýrsla' + (d.year ? ' ' + d.year : ''));
      const att = await docAttachment(d, fbase + '.pdf');
      if (!att) { alert('Engin skrá fylgir þessu skjali — ekkert að senda.'); return; }
      if (window.ReceiptSender && ReceiptSender.sendDoc) {
        ReceiptSender.sendDoc(Object.assign({ kind: kind, to: co.netfang || '', nafn: co.nafn || '', ar: d.year || '', stadur: co.nafn || '' }, att));
      }
    }));
    // mánuður skoðunar á eldra skjali → doc_date (vistast strax)
    w.querySelectorAll('._bkc-monsel').forEach(sel => sel.addEventListener('change', async () => {
      const mo = +sel.value, yr = +sel.dataset.year;
      if (!mo || !yr) return;
      try {
        const r = await SB().from('customer_documents').update({ doc_date: yr + '-' + String(mo).padStart(2, '0') + '-01' }).eq('id', +sel.dataset.doc);
        if (r.error) throw r.error;
        reload();
        try { if (window.BrunakerfiYfirlit && BrunakerfiYfirlit.reload) BrunakerfiYfirlit.reload(); } catch (_) {}
      } catch (e) { alert('Vistun mistókst: ' + (e.message || e)); }
    }));
    // 🗑 aftengja rangt skjal (röðin fer, skráin sjálf helst í Drive)
    // 🔗 Tengja / aftengja reikning á ársnótu. Geymslan er 291 — EITT fall,
    // ekki afrit, svo stöðulínan efst og ársblokkin segi alltaf það sama.
    w.querySelectorAll('._bkc-adalsel').forEach(sel => sel.addEventListener('change', async () => {
      await setAdalReikn(C.co.id, +sel.dataset.year, +sel.value);
      reload();
    }));
    // Gerðin ræður því hvað röndin býður: skrá (PDF) eða númer.
    const kindSel = w.querySelector('#_bkc-addkind');
    const linkWrap = w.querySelector('#_bkc-linkwrap');
    if (kindSel && linkWrap) {
      const syncKind = () => { linkWrap.style.display = kindSel.value === 'reikningur' ? 'inline-flex' : 'none'; };
      kindSel.addEventListener('change', syncKind); syncKind();
    }
    const linkGo = w.querySelector('#_bkc-linkgo');
    if (linkGo) linkGo.addEventListener('click', async () => {
      const BR = window.BrunakerfiReikningur;
      const st = w.querySelector('#_bkc-addstatus');
      if (!BR || !BR.setInvLink || !BR.findSaleByNum) { if (st) st.textContent = 'Reikningstengingin er ekki tiltæk.'; return; }
      const y = +(w.querySelector('#_bkc-addyear') || {}).value || new Date().getFullYear();
      const raw = (w.querySelector('#_bkc-linknum') || {}).value || '';
      if (!String(raw).trim()) { if (st) st.textContent = 'Sláðu inn reikningsnúmer.'; return; }
      if (st) st.textContent = 'Leita…';
      const sale = await BR.findSaleByNum(raw);
      if (!sale) { if (st) st.textContent = 'Reikningur „' + String(raw).trim() + '" fannst ekki.'; return; }
      await BR.setInvLink(C.co.id, y, { id: sale.id, num: sale.num });
      if (st) st.textContent = '🔗 ' + (sale.num || '') + ' tengdur við ' + y;
      reload();
    });
    w.querySelectorAll('[data-invunlink]').forEach(b => b.addEventListener('click', async () => {
      const BR = window.BrunakerfiReikningur; if (!BR || !BR.setInvLink) return;
      const y = +b.dataset.invunlink;
      if (!confirm('Aftengja reikninginn af brunakerfi ' + y + '?\n(Reikningurinn sjálfur helst óbreyttur — bara tengingin fer.)')) return;
      await BR.setInvLink(C.co.id, y, null);
      reload();
    }));
    w.querySelectorAll('[data-docdel]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Aftengja þetta skjal af fyrirtækinu?\n(Skráin sjálf helst óbreytt í Drive — bara tengingin fer.)')) return;
      // 11.09.2026: „Aftengja" EYDDI skráningunni (customer_documents.delete) þótt textinn lofaði að aðeins
      // tengingin færi — og eydd röð skráðist svo aftur í næsta Drive-sópi (sbr. R-107802). Nú er röðin
      // AFTENGD: pör sem vísa í hana losuð eins og í 199 (tómt par fer, annars hafnar FK-in), staður og
      // kúnni tekin af, needs_site = true svo hún birtist í „Tengja stað"-biðröðinni, og lesið til baka.
      // Vörður: tools/audit-aftengja-eydir.cjs.
      try {
        const sb = SB(), did = +b.dataset.docdel;
        const pr = await sb.from('document_pairs').select('id,report_doc_id,invoice_doc_id')
          .or('report_doc_id.eq.' + did + ',invoice_doc_id.eq.' + did);
        if (pr.error) throw pr.error;
        for (const p of (pr.data || [])) {
          const keepRep = String(p.report_doc_id) === String(did) ? null : p.report_doc_id;
          const keepInv = String(p.invoice_doc_id) === String(did) ? null : p.invoice_doc_id;
          const res = (keepRep == null && keepInv == null)
            ? await sb.from('document_pairs').delete().eq('id', p.id)
            : await sb.from('document_pairs').update({ report_doc_id: keepRep, invoice_doc_id: keepInv,
                status: keepInv == null ? 'vantar_reikning' : 'vantar_skyrslu', matched_by: 'manual_unlink' }).eq('id', p.id);
          if (res.error) throw res.error;
        }
        const cur = await sb.from('customer_documents').select('notes').eq('id', did).maybeSingle();
        if (cur.error) throw cur.error;
        const nu = new Date();
        const dags = String(nu.getDate()).padStart(2, '0') + '/' + String(nu.getMonth() + 1).padStart(2, '0') + '/' + nu.getFullYear();
        const r = await sb.from('customer_documents').update({
          fyrirtaeki_id: null, customer_base_id: null, needs_site: true,
          notes: ((cur.data && cur.data.notes) ? cur.data.notes + ' · ' : '') + 'Aftengt af ' + (co.nafn || ('#' + co.id)) + ' ' + dags
        }).eq('id', did).select('id,fyrirtaeki_id');
        if (r.error) throw r.error;
        if (!r.data || !r.data.length || r.data[0].fyrirtaeki_id != null) throw new Error('las til baka — tengingin fór ekki af');
        reload();
        try { if (window.BrunakerfiYfirlit && BrunakerfiYfirlit.reload) BrunakerfiYfirlit.reload(); } catch (_) {}
      } catch (e) { alert('Tókst ekki: ' + (e.message || e)); }
    }));
    // ＋ bæta við samningi: PDF → storage + customer_documents (doc_type samningur)
    const addSamn = w.querySelector('#_bkc-addsamn');
    if (addSamn) addSamn.addEventListener('change', async () => {
      const f = addSamn.files && addSamn.files[0]; if (!f) return;
      const st = w.querySelector('#_bkc-samnstatus');
      if (st) st.textContent = 'Hleð upp…';
      try {
        const sb = SB();
        const safe = f.name.replace(/[^\w.\-]+/g, '_');
        const path = 'brunakerfi-skyrslur/' + co.id + '/samningar/' + Date.now() + '_' + safe;
        const up = await sb.storage.from('samningar').upload(path, f, { contentType: f.type || 'application/pdf', upsert: false });
        if (up.error) throw up.error;
        const ins = await sb.from('customer_documents').insert({
          doc_type: 'samningur', fyrirtaeki_id: co.id, year: null,
          storage_path: 'samningar/' + path, customer_name: (co.nafn || '') + ' — þjónustusamningur',
          source: 'app', found_by: 'manual-upload', notes: 'Handvirkt viðhengt: ' + f.name
        });
        if (ins.error) throw ins.error;
        document.dispatchEvent(new CustomEvent('customer-doc-written'));
        if (st) st.textContent = '';
        reload();
      } catch (e) {
        if (st) st.textContent = '';
        alert('Upphleðsla mistókst: ' + (e.message || e));
      }
    });
    // ＋ bæta við skjali: PDF af tækinu → storage + customer_documents röð
    const addFile = w.querySelector('#_bkc-addfile');
    if (addFile) addFile.addEventListener('change', async () => {
      const f = addFile.files && addFile.files[0]; if (!f) return;
      const yr = +(w.querySelector('#_bkc-addyear') || {}).value || new Date().getFullYear();
      const st = w.querySelector('#_bkc-addstatus');
      if (st) st.textContent = 'Hleð upp…';
      try {
        const sb = SB();
        const safe = f.name.replace(/[^\w.\-]+/g, '_');
        const path = 'brunakerfi-skyrslur/' + co.id + '/uploads/' + Date.now() + '_' + safe;
        const up = await sb.storage.from('samningar').upload(path, f, { contentType: f.type || 'application/pdf', upsert: false });
        if (up.error) throw up.error;
        const ins = await sb.from('customer_documents').insert({
          // Gerðin er VALIN, ekki gefin. Áður var allt skráð sem `brunakerfi`,
          // svo reikningur sem var hengdur á lenti í skýrslu-línunni.
          doc_type: ((w.querySelector('#_bkc-addkind') || {}).value === 'reikningur' ? 'reikningur' : 'brunakerfi'),
          fyrirtaeki_id: co.id, year: yr,
          storage_path: 'samningar/' + path, customer_name: co.nafn || null,
          source: 'app', found_by: 'manual-upload', notes: 'Handvirkt viðhengt: ' + f.name
        });
        if (ins.error) throw ins.error;
        document.dispatchEvent(new CustomEvent('customer-doc-written'));
        if (st) st.textContent = '';
        reload();
        try { if (window.BrunakerfiYfirlit && BrunakerfiYfirlit.reload) BrunakerfiYfirlit.reload(); } catch (_) {}
      } catch (e) {
        if (st) st.textContent = '';
        alert('Upphleðsla mistókst: ' + (e.message || e));
      }
    });

    // 🧾 stöðulína: „Brunakerfi <ár>: LOKIÐ ✓ · Reikningur: …" (patch 291) —
    // fire-and-forget, síðan teiknast óbreytt þótt 291 vanti/mistakist.
    try { if (window.BrunakerfiReikningur && BrunakerfiReikningur.decorateProfile) BrunakerfiReikningur.decorateProfile(C, w); } catch (_) {}
  }

  try {
    window.addEventListener('pagehide', flushNote);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushNote(); });
  } catch (_) {}

  async function open(coId) {
    flushNote();
    const ov = ensureOverlay();
    ov.style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('_bkc-wrap').innerHTML = '<div style="padding:50px;text-align:center;color:#8b93a1">Hleð…</div>';
    try { C = await load(coId); } catch (e) { console.warn('[bkc] load', e); C = null; }
    if (!C) { document.getElementById('_bkc-wrap').innerHTML = '<div style="padding:50px;text-align:center;color:#c93c1d">Náði ekki í gögn.</div>'; return; }
    render();
    ov.scrollTop = 0;
  }
  async function reload() { if (C && C.co) open(C.co.id); }

  // ── röð-smellur á yfirlitinu (capture → víkur 272-hegðuninni) ──────────────
  function watch() {
    const v = document.getElementById('view-brunakerfi-yfirlit');
    if (!v) { setTimeout(watch, 900); return; }
    if (v.__bkcWatched) return;
    v.__bkcWatched = true;
    v.addEventListener('click', e => {
      const tr = e.target.closest('tr._bky-row');
      if (!tr) return;
      // hlekkir (ár-punktar) og hnappar (📋/🏷 o.fl.) halda sinni hegðun
      if (e.target.closest('a,button')) return;
      e.preventDefault(); e.stopPropagation();
      open(+tr.dataset.id);
    }, true);
  }
  function boot() { watch(); setTimeout(watch, 2500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  // openDocViewer er fluttur út svo 291 (reikningslínan) noti SAMA glugga —
  // annars yrðu tvö ólík mót fyrir sama verk í sama spjaldi.
  window.BrunakerfiFyrirtaeki = { open, reload, openDocViewer };
  console.log('[patch-274] Brunakerfi þjónustusíða fyrirtækis installed');
})();
/* === END BRUNAKERFI ÞJÓNUSTUSÍÐA === */
