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
  let _noteT = null, _notePending = null;

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function num(v) { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
  function fmtKr(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr'; }
  function fmtKt(kt) { const d = String(kt || '').replace(/\D/g, ''); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : (kt || ''); }
  function fmtDags(iso) { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '.' + m[2] + '.' + m[1] : String(iso || ''); }

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
    try { const m = (window.AppSettings && AppSettings.path && AppSettings.path('bk_inv_adal')) || {}; server = m[k] != null ? +m[k] : null; } catch (_) {}
    if (_adalNy.has(k)) { const o = _adalNy.get(k); if (server === o) _adalNy.delete(k); else return o; }
    return server;
  }
  async function setAdalReikn(coId, y, docId) {
    _adalNy.set(coId + '_' + y, docId);
    try { if (window.AppSettings && AppSettings.save) await AppSettings.save({ bk_inv_adal: { [coId + '_' + y]: docId } }); } catch (_) {}
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
  function verdOf(r) {
    const linur = (r.data && r.data.verd && r.data.verd.linur) || [];
    const sum = linur.reduce((a, l) => a + (num(l.qty) || 0) * (num(l.price) || 0), 0);
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

  // 🧾 Opnar reikning (solur) skýrslunnar sem prent/PDF-forskoðun (SalaInvoice,
  // patch 10). Glugginn opnaður STRAX (án await) svo popup-vörn stöðvi hann ekki.
  async function openInvoicePdf(inv) {
    if (!inv || !inv.id) return;
    const w = window.open('', '_blank', 'width=900,height=1100');
    try {
      const sb = SB(); if (!sb) { if (w) w.close(); return; }
      const r = await sb.from('solur').select('*').eq('id', inv.id).single();
      if (r.error || !r.data) { if (w) w.close(); alert('Reikningurinn fannst ekki.'); return; }
      if (window.SalaInvoice && SalaInvoice.renderFromSale) {
        SalaInvoice.renderFromSale(w, r.data, { kennitala: (C.co && C.co.kennitala) || r.data.customer_kt || '', heimilisfang: (C.co && C.co.heimilisfang) || '' });
      } else if (w) { w.close(); alert('Reikningsmótið er ekki tiltækt.'); }
    } catch (e) { if (w) w.close(); alert('Villa: ' + (e.message || e)); }
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
      '#_bkc-overlay table._bkc-tbl{width:100%;border-collapse:collapse}' +
      '#_bkc-overlay ._bkc-tbl th{font-size:10px;font-weight:800;color:#7a8290;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:5px 8px;border-bottom:1px solid #eef0f3}' +
      '#_bkc-overlay ._bkc-tbl td{padding:6px 8px;border-bottom:1px solid #eef0f3;font-size:12.5px}' +
      '#_bkc-overlay ._bkc-empty{font-size:12.5px;color:#8b93a1;font-style:italic;padding:8px 0}' +
      '#_bkc-overlay ._bkc-legend{font-size:11px;color:#8b93a1;display:flex;align-items:center;gap:6px;margin:0 0 4px}' +
      '#_bkc-overlay ._bkc-yr{border-top:1px solid #eef0f3;padding:9px 0 7px}#_bkc-overlay ._bkc-yr:first-of-type{border-top:0}' +
      '#_bkc-overlay ._bkc-yrhd{display:flex;align-items:center;gap:8px;margin-bottom:5px}#_bkc-overlay ._bkc-yrhd small{color:#8b93a1;font-size:11px}' +
      '#_bkc-overlay ._bkc-yrlbl{font-weight:800;font-size:15px;color:#1f2937}#_bkc-overlay ._bkc-yrlbl._ok{color:#166b3a}#_bkc-overlay ._bkc-yrlbl._warn{color:#8a6100}#_bkc-overlay ._bkc-yrlbl._miss{color:#b45309}' +
      '#_bkc-overlay ._bkc-pill._ok{background:#dcf1e4;color:#166b3a}#_bkc-overlay ._bkc-pill._warn{background:#fdf3d7;color:#8a6100}#_bkc-overlay ._bkc-pill._doc{background:#e8ecf3;color:#3b4653}#_bkc-overlay ._bkc-pill._miss{background:#fff7ed;color:#b45309;border:1px dashed #f59e0b}' +
      '#_bkc-overlay ._bkc-yrrow{display:grid;grid-template-columns:10px 84px minmax(0,1fr);align-items:center;column-gap:8px;padding:3px 0}' +
      '#_bkc-overlay ._bkc-dot{width:9px;height:9px;border-radius:50%;display:inline-block}#_bkc-overlay ._bkc-dot.ok{background:#22c55e}#_bkc-overlay ._bkc-dot.miss{width:7px;height:7px;background:transparent;border:2px dashed #f59e0b}' +
      '#_bkc-overlay ._bkc-tag{font-size:9px;font-weight:800;color:#6b7280;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:99px;padding:1px 7px;text-align:center;letter-spacing:.04em}' +
      '#_bkc-overlay ._bkc-yrbody{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:12.5px;min-width:0}' +
      '#_bkc-overlay ._bkc-yrtxt{color:#334155}#_bkc-overlay ._bkc-yrmiss{color:#b45309;font-style:italic;font-size:12px}' +
      '#_bkc-overlay ._bkc-invst{font-weight:800;font-size:10.5px;text-transform:uppercase;padding:1px 7px;border-radius:99px;background:#e8ecf3;color:#3b4653}#_bkc-overlay ._bkc-invst._greiddur{background:#dcf1e4;color:#166b3a}#_bkc-overlay ._bkc-invst._sendur{background:#dbeafe;color:#1e40af}#_bkc-overlay ._bkc-invst._stofnaður{background:#fdf3d7;color:#8a6100}' +
      '@media (max-width:600px){#_bkc-overlay ._bkc-yrrow{grid-template-columns:10px 70px minmax(0,1fr)}}' +
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
        if (f.style.display === 'none' && C && document.getElementById('_bkc-overlay').style.display === 'block') reload();
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
      sb.from('customer_documents').select('id,year,doc_type,invoice_number,drive_file_id,storage_path,doc_date,source,notes,is_duplicate').in('doc_type', ['brunakerfi', 'reikningur']).eq('fyrirtaeki_id', coId).order('year', { ascending: false }),
      sb.from('customer_documents').select('id,fyrirtaeki_id,drive_file_id,storage_path,doc_date,customer_name,notes,is_duplicate').eq('doc_type', 'samningur').or(samOr).order('id', { ascending: false })
    ]);
    let note = '';
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
    const invDocs = allirDocs.filter(d => d.doc_type === 'reikningur');
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

  // ── teikning ────────────────────────────────────────────────────────────────
  function render() {
    const ov = ensureOverlay();
    const w = document.getElementById('_bkc-wrap');
    const co = C.co;
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
    const dot = ok => '<span class="_bkc-dot ' + (ok ? 'ok' : 'miss') + '"></span>';
    const tag = t => '<span class="_bkc-tag">' + t + '</span>';
    const yearRows = yrs.map(y => {
      const reps = C.reports.filter(r => +r.year === y);
      const docs = oldDocs.filter(d => +d.year === y);
      const invSkjol = (C.invDocs || []).filter(d => +d.year === y);
      const fin = reps.find(r => r.status === 'final') || null;
      const draft = reps.find(r => r.status !== 'final') || null;
      const inv = (fin && fin._inv) || (draft && draft._inv) || null;
      const hasRep = !!fin || docs.length > 0;
      let pill, pc;
      if (fin && inv && inv.paid_at) { pill = 'LOKIÐ · GREITT'; pc = 'ok'; }
      else if (fin && inv) { pill = 'LOKIÐ ✓'; pc = 'ok'; }
      else if (fin) { pill = 'SKÝRSLA LOKIÐ · VANTAR REIKNING'; pc = 'warn'; }
      else if (draft) { pill = 'Í VINNSLU'; pc = 'warn'; }
      else if (docs.length) { pill = 'SKÝRSLA (PDF)'; pc = 'doc'; }
      else if (y === NOW) { pill = 'VANTAR'; pc = 'miss'; }
      else { pill = 'EKKERT SKRÁÐ'; pc = 'miss'; }
      // skýrsla-lína
      let rep = '';
      if (fin) {
        const doc = fin.doc_id ? C.docs.find(d => d.id === fin.doc_id) : null;
        const url = doc ? (driveUrl(doc.drive_file_id) || storageUrl(doc.storage_path)) : '';
        const v = verdOf(fin);
        rep += '<span class="_bkc-yrtxt"><b>Brunakerfisskýrsla ' + esc(fin.year || y) + '</b> · úttekt ' + esc(fin.uttekt_nr || '—') + ' · breytt ' + esc(String(fin.updated_at || '').slice(0, 10)) + (v.lines ? ' · ' + v.lines + ' verðlínur' : '') + '</span>' +
          (url ? '<a class="_bkc-act _ghost" href="' + esc(url) + '" target="_blank" rel="noopener" title="Opna skýrsluna (PDF)">📄 Skýrsla</a>' : '') +
          '<button type="button" class="_bkc-act" data-send="' + fin.id + '" style="background:#0f766e" title="Senda skýrslu og/eða reikning í tölvupósti">📧 Senda</button>' +
          '<button type="button" class="_bkc-act _ghost" data-open="' + fin.id + '">✏️ Breyta</button>';
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
        rep += (rep ? '<br>' : '') + '<span class="_bkc-yrtxt"><b>Brunakerfisskýrsla ' + esc(d.year || y) + '</b> (PDF) · ' + esc(d.doc_date ? fmtDags(d.doc_date) : 'mánuð vantar') + (d.source ? ' · ' + esc(d.source) : '') + '</span>' + monSel +
          (url ? '<a class="_bkc-act _ghost" href="' + esc(url) + '" target="_blank" rel="noopener">Opna</a>' : '') +
          (url ? '<button type="button" class="_bkc-act" data-docsend="' + d.id + '" data-sendkind="brunakerfi" style="background:#0f766e" title="Senda í tölvupósti">📧 Senda</button>' : '') +
          '<button type="button" class="_bkc-act _x" data-docdel="' + d.id + '" title="Aftengja þetta skjal (röng skrá) — skráin sjálf helst í Drive">×</button>';
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
          (handtengt ? '<button type="button" class="_bkc-act _x" data-invunlink="' + y + '" title="Aftengja handtengda reikninginn — reikningurinn sjálfur helst óbreyttur">×</button>' : ''));
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
        invBitar.push('<span class="_bkc-yrtxt">' + heiti + ' (PDF)' + (d.doc_date ? ' · ' + esc(fmtDags(d.doc_date)) : '') + '</span>' +
          (u ? '<a class="_bkc-act _ghost" href="' + esc(u) + '" target="_blank" rel="noopener">Opna</a>' : '') +
          (u ? '<button type="button" class="_bkc-act" data-docsend="' + d.id + '" data-sendkind="reikningur" style="background:#0f766e" title="Senda í tölvupósti">📧 Senda</button>' : '') +
          '<button type="button" class="_bkc-act _x" data-docdel="' + d.id + '" title="Aftengja þetta skjal — skráin sjálf helst í Drive">×</button>');
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
      return '<div class="_bkc-yr">' +
        '<div class="_bkc-yrhd"><span class="_bkc-yrlbl _' + pc + '">' + y + '</span><span class="_bkc-st _bkc-pill _' + pc + '">' + pill + '</span>' + (reps.length + docs.length > 1 ? '<small>' + (reps.length + docs.length) + ' færslur</small>' : '') + '</div>' +
        '<div class="_bkc-yrrow">' + dot(hasRep) + tag('SKÝRSLA') + '<div class="_bkc-yrbody">' + rep + '</div></div>' +
        '<div class="_bkc-yrrow">' + dot(!!inv) + tag('REIKNINGUR') + '<div class="_bkc-yrbody">' + invHtml + '</div></div>' +
      '</div>';
    }).join('');
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

    // verð / reikningsyfirlit
    const verds = C.reports.map(r => ({ r, v: verdOf(r) })).filter(x => x.v.lines > 0);
    const verdSum = verds.reduce((a, x) => a + x.v.total, 0);
    const verdHtml = verds.length ?
      '<table class="_bkc-tbl"><thead><tr><th>Úttekt</th><th style="text-align:right">Án vsk</th><th style="text-align:right">M. vsk</th></tr></thead><tbody>' +
      verds.map(x => '<tr><td>' + esc(x.r.uttekt_nr || '—') + ' · ' + esc(x.r.year || '') +
        (x.r.status === 'final' ? '' : ' <span style="color:#8a6100;font-size:10.5px;font-weight:800">(drög)</span>') + '</td>' +
        '<td style="text-align:right">' + fmtKr(x.v.sum) + '</td>' +
        '<td style="text-align:right;font-weight:700">' + fmtKr(x.v.total) + '</td></tr>').join('') +
      '<tr><td style="font-weight:800;border-bottom:0">Samtals</td><td style="border-bottom:0"></td><td style="text-align:right;font-weight:800;border-bottom:0">' + fmtKr(verdSum) + '</td></tr>' +
      '</tbody></table>'
      : '<div class="_bkc-empty">Engar verðlínur enn — þær bætast við í Verð-hluta skoðunarskýrslunnar.</div>';

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
        '<div class="_bkc-custR">' +
          '<div class="_bkc-lbl">✍️ Minnispunktur (vistast sjálfkrafa, sést á öllum tækjum)</div>' +
          '<textarea class="_bkc-note" id="_bkc-note" placeholder="t.d. Lykill í hólfi hjá húsverði · hringja á undan…">' + esc(C.note) + '</textarea>' +
        '</div>' +
      '</div>' +
      '<div class="_bkc-grid">' +
        '<div>' +
          '<div class="_bkc-card"><div class="_bkc-ch">🔥 Brunakerfi — staða eftir ári<small>' + C.reports.length + ' í appinu · ' + oldDocs.length + ' eldri skjöl</small></div><div class="_bkc-body">' +
            '<div class="_bkc-legend"><span class="_bkc-dot ok"></span> til &nbsp; <span class="_bkc-dot miss"></span> vantar</div>' +
            yearRows +
            '<button type="button" class="_bkc-new" id="_bkc-new">＋ Ný skoðunarskýrsla</button>' +
            addFileStrip +
          '</div></div>' +
        '</div>' +
        '<div>' +
          '<div class="_bkc-card"><div class="_bkc-ch">Þjónustusamningur<small>' + (C.samningar.length || 'enginn skráður') + '</small></div><div class="_bkc-body">' +
            (C.samningar.length ? C.samningar.map(s => {
              const url = driveUrl(s.drive_file_id) || storageUrl(s.storage_path);
              const chain = !s.fyrirtaeki_id;
              const title = (s.customer_name && s.customer_name.length < 70 ? s.customer_name : 'Þjónustusamningur');
              return '<div class="_bkc-row">' +
                '<span class="_bkc-st" style="background:#e7e2f7;color:#4c1d95">📜</span>' +
                '<div style="flex:1;min-width:130px"><div style="font-weight:600;font-size:13px">' + esc(title) + '</div>' +
                '<div style="font-size:11px;color:#8b93a1">' + (chain ? 'sameiginlegur (öll keðjan)' : 'þessi staður') + (s.doc_date ? ' · ' + esc(fmtDags(s.doc_date)) : '') + '</div></div>' +
                (url ? '<a class="_bkc-act _ghost" href="' + esc(url) + '" target="_blank" rel="noopener">Opna</a>' : '') +
                (url ? '<button type="button" class="_bkc-act" data-docsend="' + s.id + '" data-sendkind="samningur" style="background:#0f766e" title="Senda samning í tölvupósti">📧 Senda</button>' : '') +
                '<button type="button" class="_bkc-act _x" data-docdel="' + s.id + '" title="Aftengja samninginn — skráin helst í Drive">×</button>' +
              '</div>';
            }).join('') : '<div class="_bkc-empty">Enginn þjónustusamningur skráður á fyrirtækið.</div>') +
            '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:10px;padding-top:8px;border-top:1px dashed #d7dade;font-size:12.5px;color:#59606c">' +
              '＋ Bæta við samningi:' +
              '<label class="_bkc-act _ghost" style="cursor:pointer">📎 Velja PDF<input type="file" id="_bkc-addsamn" accept="application/pdf" style="display:none"></label>' +
              '<span id="_bkc-samnstatus" style="color:#8b93a1"></span>' +
            '</div>' +
          '</div></div>' +
          '<div class="_bkc-card"><div class="_bkc-ch">Búnaðarskrá kerfisins' +
            (newest ? '<small>úr skýrslu ' + esc(newest.uttekt_nr || '') + '</small>' : '') + '</div><div class="_bkc-body">' + bunHtml + '</div></div>' +
          '<div class="_bkc-card"><div class="_bkc-ch">Verð / reikningsyfirlit<small>VSK ' + VAT_PCT + '%</small></div><div class="_bkc-body">' +
            verdHtml +
            '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
              '<button type="button" class="_bkc-act _ghost" id="_bkc-vlist">🏷 Verðlisti</button>' +
            '</div>' +
          '</div></div>' +
        '</div>' +
      '</div>';

    // víring
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
    w.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
      const r = C.reports.find(x => x.id === b.dataset.open);
      if (r && window.BrunakerfiSkyrsla) BrunakerfiSkyrsla.openForm(co, r);
    }));
    w.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Eyða þessum drögum?')) return;
      try { await SB().from('brunakerfi_skyrslur').delete().eq('id', b.dataset.del); } catch (_) {}
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
        const dags = String(nu.getDate()).padStart(2, '0') + '.' + String(nu.getMonth() + 1).padStart(2, '0') + '.' + nu.getFullYear();
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

  window.BrunakerfiFyrirtaeki = { open, reload };
  console.log('[patch-274] Brunakerfi þjónustusíða fyrirtækis installed');
})();
/* === END BRUNAKERFI ÞJÓNUSTUSÍÐA === */
