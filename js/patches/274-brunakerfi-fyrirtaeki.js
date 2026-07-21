/* === BRUNAKERFI ÞJÓNUSTUSÍÐA FYRIRTÆKIS (2026-07-21) ===
 *
 * Ósk Agnars (skjámyndir m/ rauðum hring): smellur á fyrirtækjaröð í
 * Brunakerfi yfirlit (272) á að opna SÉRSTAKA brunakerfis-síðu fyrirtækisins —
 * hliðstæðu slökkvitækja-vinnusíðunnar — í stað almenna fyrirtækjaspjaldsins.
 *
 * Á síðunni (allt valið í spurningu 2026-07-21):
 *   • Haus: nafn/kt/aðsetur + tengiliðir & samskipti (hringja/senda) +
 *     minnispunktur sem vistast miðlægt (app_settings.brunakerfi_notes[id])
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
  let _noteT = null;

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function num(v) { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
  function fmtKr(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr'; }
  function fmtKt(kt) { const d = String(kt || '').replace(/\D/g, ''); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : (kt || ''); }
  function fmtDags(iso) { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '.' + m[2] + '.' + m[1] : String(iso || ''); }
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
      '#_bkc-overlay ._bkc-new{width:100%;padding:12px;border-radius:10px;border:0;background:#1f8a4c;color:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer;margin-top:12px}' +
      '#_bkc-overlay ._bkc-new:hover{background:#187a41}' +
      '#_bkc-overlay table._bkc-tbl{width:100%;border-collapse:collapse}' +
      '#_bkc-overlay ._bkc-tbl th{font-size:10px;font-weight:800;color:#7a8290;text-transform:uppercase;letter-spacing:.04em;text-align:left;padding:5px 8px;border-bottom:1px solid #eef0f3}' +
      '#_bkc-overlay ._bkc-tbl td{padding:6px 8px;border-bottom:1px solid #eef0f3;font-size:12.5px}' +
      '#_bkc-overlay ._bkc-empty{font-size:12.5px;color:#8b93a1;font-style:italic;padding:8px 0}' +
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
    const ov = document.getElementById('_bkc-overlay'); if (ov) ov.style.display = 'none';
    document.body.style.overflow = '';
    try { if (window.BrunakerfiYfirlit && BrunakerfiYfirlit.reload) BrunakerfiYfirlit.reload(); } catch (_) {}
  }

  // ── gögn ────────────────────────────────────────────────────────────────────
  async function load(coId) {
    const sb = SB(); if (!sb) return null;
    const [coR, repR, docR] = await Promise.all([
      sb.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,simi,farsimi,netfang,"tengiliður"').eq('id', coId).single(),
      sb.from('brunakerfi_skyrslur').select('id,year,uttekt_nr,status,doc_id,data,updated_at').eq('fyrirtaeki_id', coId).order('updated_at', { ascending: false }),
      sb.from('customer_documents').select('id,year,drive_file_id,storage_path,doc_date,source,notes').eq('doc_type', 'brunakerfi').eq('fyrirtaeki_id', coId).order('year', { ascending: false })
    ]);
    let note = '';
    try { const m = (window.AppSettings && AppSettings.path && AppSettings.path('brunakerfi_notes')) || {}; note = (m[String(coId)] && m[String(coId)].text) || ''; } catch (_) {}
    return { co: (coR && coR.data) || { id: coId, nafn: '?' }, reports: (repR && repR.data) || [], docs: (docR && docR.data) || [], note };
  }

  function saveNote(text) {
    clearTimeout(_noteT);
    _noteT = setTimeout(async () => {
      try {
        if (window.AppSettings && AppSettings.save) {
          await AppSettings.save({ brunakerfi_notes: { [String(C.co.id)]: { text, t: new Date().toISOString() } } });
        }
      } catch (e) { console.warn('[bkc] note save', e); }
    }, 1200);
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

    // skýrslu-raðir (appsins)
    const repRows = C.reports.map(r => {
      const fin = r.status === 'final';
      const doc = fin && r.doc_id ? C.docs.find(d => d.id === r.doc_id) : null;
      const url = doc ? (driveUrl(doc.drive_file_id) || storageUrl(doc.storage_path)) : '';
      const v = verdOf(r);
      return '<div class="_bkc-row">' +
        '<span class="_bkc-st" style="' + (fin ? 'background:#dcf1e4;color:#166b3a' : 'background:#fdf3d7;color:#8a6100') + '">' + (fin ? 'LOKIÐ' : 'DRÖG') + '</span>' +
        '<div style="flex:1;min-width:150px"><div style="font-weight:700;font-size:13.5px">Úttekt ' + esc(r.uttekt_nr || '—') + ' · ' + esc(r.year || '') + '</div>' +
        '<div style="font-size:11px;color:#8b93a1">breytt ' + esc(String(r.updated_at || '').slice(0, 10)) + (v.lines ? ' · ' + v.lines + ' verðlínur' : '') + '</div></div>' +
        '<button type="button" class="_bkc-act" data-open="' + r.id + '">' + (fin ? 'Skoða / breyta' : 'Halda áfram') + '</button>' +
        (url ? '<a class="_bkc-act _ghost" href="' + esc(url) + '" target="_blank" rel="noopener">📄 PDF</a>' : '') +
        (!fin ? '<button type="button" class="_bkc-act _del" data-del="' + r.id + '">🗑</button>' : '') +
      '</div>';
    }).join('');

    // eldri söfnuð skjöl
    const oldRows = oldDocs.map(d => {
      const url = driveUrl(d.drive_file_id) || storageUrl(d.storage_path);
      return '<div class="_bkc-row">' +
        '<span class="_bkc-st" style="background:#e8ecf3;color:#3b4653">' + esc(d.year || '—') + '</span>' +
        '<div style="flex:1;min-width:150px"><div style="font-weight:600;font-size:13px">Úttektarskýrsla ' + esc(d.year || '') + '</div>' +
        '<div style="font-size:11px;color:#8b93a1">' + esc(d.doc_date ? fmtDags(d.doc_date) : '') + (d.source ? ' · ' + esc(d.source) : '') + '</div></div>' +
        (url ? '<a class="_bkc-act _ghost" href="' + esc(url) + '" target="_blank" rel="noopener">Opna</a>' : '') +
      '</div>';
    }).join('');

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
          '<div class="_bkc-card"><div class="_bkc-ch">Skoðunarskýrslur<small>' + C.reports.length + ' í appinu · ' + oldDocs.length + ' eldri skjöl</small></div><div class="_bkc-body">' +
            (repRows || '<div class="_bkc-empty">Engin skýrsla í appinu enn.</div>') +
            '<button type="button" class="_bkc-new" id="_bkc-new">＋ Ný skoðunarskýrsla</button>' +
          '</div></div>' +
          (oldDocs.length ? '<div class="_bkc-card"><div class="_bkc-ch">Eldri skýrslur &amp; skjöl<small>söfnuð úr Drive/tölvum</small></div><div class="_bkc-body">' + oldRows + '</div></div>' : '') +
        '</div>' +
        '<div>' +
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
  }

  async function open(coId) {
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
