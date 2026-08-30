/* === DOC PAIRS BAND v1 (patch 311-doc-pairs-band) ===
 *
 * The reusable "📦 Pör" bundle band — a report+invoice pair per (year ×
 * þjónusta), each row carrying 📄 Skýrsla / 🧾 Reikningur / 📧 Senda — lifted
 * out of patch 253's "🧾 Fyrri viðskipti" dialog so the SAME block can be shown
 * in more than one place. Verkefnalisti 688f153b (ósk Agnars): birta þetta par-
 * band líka á (1) fyrirtækjasíðunni („Skjöl & viðhengi") og (2) Sölu-síðunni.
 *
 * Patch 253 is LEFT UNTOUCHED — its dialog keeps its own inline copy. This file
 * re-implements the same markup + behaviour behind a small public API so the
 * two new mount points share one code path.
 *
 * Public API:
 *   window.DocPairs.renderInto(container, { coId, baseId, kt, nafn }) -> Promise<boolean>
 *     Renders the pör-band into `container` (replacing its contents). Any of the
 *     identity fields may be omitted — the rest are derived from Supabase.
 *     Resolves to true when at least one pair row was drawn, false otherwise
 *     (e.g. walk-in / no kt / no data). Best-effort: never throws.
 *
 * Data model (unchanged, read directly via DB.sb like patch 253 — no new
 * endpoint): pairs grouped by year × service_type; per (year, service) a slot
 * with { rep, inv }. rep = úttektarskýrsla/brunakerfisskýrsla úr
 * customer_documents; inv = reikningur úr solur (source 'uttekt'/'brunakerfi')
 * eða — sem varaleið — invoice_doc_id úr document_pairs (_fromDoc). Sjálf-matcha
 * lykillinn er solur.source; document_pairs (Brunahólf's durable bundle table)
 * fyllir í eyður OG býr til par sem Agnar tengdi handvirkt (report/invoice_doc_id)
 * fyrir fyrirtæki sem sjálf-matchið réð ekki við.
 *
 * Reuses existing globals rather than reinventing them:
 *   • window.DB.sb              — Supabase client (document_pairs / customer_documents / solur)
 *   • window.CompanyAttachments — getPublicUrl (leyst slóð fyrir viðhengi)
 *   • window.ReceiptSender      — compose / standardText / invoiceAttachment (📧 Senda)
 *   • window.SalaInvoice        — renderFromSale (🧾 opna reikning úr sölu)
 */
(() => {
  if (window.DocPairs) return;

  // ── small helpers (mirrors patch 253) ──────────────────────────────────────
  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function ktDigits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function ktDashed(d) { return d && d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : d; }
  function fmtKr(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS').replace(/,/g, '.') + ' kr'; }
  function toast(m) { try { if (window.Toast && Toast.show) Toast.show(m); } catch (_) {} }

  // Drive-skjöl fara gegnum /api/skjal á Brunahólfi (server-OAuth streymir PDF —
  // óskráðar/aðgangsstýrðar Drive-skrár opnast ekki með hráum hlekk). 'sb:'-
  // forskeytt drive_file_id er storage-vísun, EKKI Drive-auðkenni.
  function driveUrl(id) { return id ? 'https://brunaholf.netlify.app/api/skjal?id=' + encodeURIComponent(id) : ''; }
  function storageUrl(p) {
    if (!p) return '';
    const base = String(window.SUPABASE_URL || '').replace(/\/+$/, '');
    if (!base) return '';
    const s = String(p).replace(/^\/+/, '');
    const i = s.indexOf('/'); if (i < 1) return '';
    return base + '/storage/v1/object/public/' + s.slice(0, i) + '/' +
           s.slice(i + 1).split('/').map(encodeURIComponent).join('/');
  }
  // customer_documents-röð → { ..., _url }. Storage FYRST (stöðug opinber slóð),
  // svo Drive gegnum proxy. Tómt _url = engin skrá að baki → engin opna-hnappur.
  function mapDocUrl(x) {
    const drv = x.drive_file_id && String(x.drive_file_id).indexOf('sb:') !== 0 ? x.drive_file_id : null;
    return Object.assign({}, x, { _url: storageUrl(x.storage_path) || (drv ? driveUrl(drv) : '') });
  }

  // Netfang kúnnans til að forfylla póst-ritilinn — má alltaf breyta í glugganum.
  const _emailCache = {};
  async function custEmail(kt) {
    const d = ktDigits(kt);
    if (!d || d.length !== 10 || d === '9999999999') return '';
    const sb = SB(); if (!sb) return '';
    if (_emailCache[d] !== undefined) return _emailCache[d];
    let out = '';
    try {
      const dash = ktDashed(d);
      for (const t of ['fyrirtaeki', 'vidskiptavinir']) {
        const r = await sb.from(t).select('netfang')
          .or('kennitala.eq.' + d + ',kennitala.eq.' + dash)
          .not('netfang', 'is', null).limit(1).maybeSingle();
        if (r && r.data && r.data.netfang) { out = String(r.data.netfang).trim(); break; }
      }
    } catch (_) {}
    _emailCache[d] = out;
    return out;
  }

  // ── identity resolution ─────────────────────────────────────────────────────
  // When the caller has a site id (company profile / Sala pick of a fyrirtaeki)
  // we stay on THAT fyrirtaeki_id. Expanding to every sibling of the kt painted
  // Center/Pizzan/Heimaleiga reports onto the wrong hotel (Arnarhvoll inherited
  // Skjaldbreið). kt-víð útvíkkun er AÐEINS þegar enginn staður er gefinn.
  async function resolveIdentity(opts) {
    const sb = SB();
    let coId = opts.coId, baseId = opts.baseId, kt = opts.kt, nafn = opts.nafn;
    const coIds = [];
    if (coId != null && /^\d+$/.test(String(coId))) coIds.push(+coId);
    const baseIds = [];
    if (baseId != null && baseId !== '') baseIds.push(baseId);
    const siteLocked = coIds.length === 1;

    // kt / nafn from the in-memory company list (cheap) then fyrirtaeki row.
    if ((!kt || !nafn) && coId != null) {
      try { const c = (window.Companies && Companies.list || []).find(x => +x.id === +coId); if (c) { kt = kt || c.kennitala; nafn = nafn || c.nafn; } } catch (_) {}
    }
    if ((!kt || !nafn || (siteLocked && !baseIds.length)) && coId != null && sb) {
      try {
        const r = await sb.from('fyrirtaeki').select('kennitala,nafn,customer_base_id').eq('id', +coId).maybeSingle();
        if (r && r.data) {
          kt = kt || r.data.kennitala; nafn = nafn || r.data.nafn;
          if (r.data.customer_base_id != null && !baseIds.includes(r.data.customer_base_id)) baseIds.push(r.data.customer_base_id);
        }
      } catch (_) {}
    }
    if (!kt && baseIds.length && sb) {
      try { const r = await sb.from('customers_base').select('kennitala').eq('id', baseIds[0]).maybeSingle(); if (r && r.data) kt = r.data.kennitala; } catch (_) {}
    }

    const ktd = ktDigits(kt);
    if (!siteLocked && ktd.length === 10 && ktd !== '9999999999' && sb) {
      try {
        const d = ktDashed(ktd);
        const f = await sb.from('fyrirtaeki').select('id,customer_base_id')
          .in('kennitala', d !== ktd ? [ktd, d] : [ktd]).is('deleted_at', null);
        (f.data || []).forEach(r => {
          if (!coIds.includes(+r.id)) coIds.push(+r.id);
          if (r.customer_base_id != null && !baseIds.includes(r.customer_base_id)) baseIds.push(r.customer_base_id);
        });
      } catch (_) {}
      if (!baseIds.length) {
        try {
          const d = ktDashed(ktd);
          const r = await sb.from('customers_base').select('id').or('kennitala.eq.' + d + ',kennitala.eq.' + ktd).limit(1);
          if (r.data && r.data[0]) baseIds.push(r.data[0].id);
        } catch (_) {}
      }
    }
    return { coIds, baseIds, kt: kt || '', ktd, nafn: nafn || '', siteLocked };
  }

  // ── open helpers ────────────────────────────────────────────────────────────
  // Anchor-smellur í stað window.open: popup-vörnin þaggar stundum window.open
  // ('noopener') niður svo „ekkert gerðist" — þetta opnar alltaf.
  function openUrl(u) {
    if (!u) return;
    const a = document.createElement('a');
    a.href = u; a.target = '_blank'; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  }
  // Opna reikning úr sölu-röð (solur → SalaInvoice.renderFromSale) — sama mót og
  // „Prenta aftur"/patch 253. Notað af 🧾 Reikningur þegar parið á solur-röð.
  async function openInvoice(saleId) {
    const sb = SB();
    if (!sb || !window.SalaInvoice || typeof SalaInvoice.renderFromSale !== 'function') { alert('Reikningsmótið er ekki tiltækt.'); return; }
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) { alert('Vinsamlegast leyfðu sprettiglugga til að prenta.'); return; }
    const r = await sb.from('solur').select('*').eq('id', saleId).single();
    if (r.error || !r.data) { w.close(); alert('Salan fannst ekki.'); return; }
    const sale = r.data;
    let cust = null;
    if (sale.customer_id) {
      const [f, v] = await Promise.all([
        sb.from('fyrirtaeki').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
        sb.from('vidskiptavinir').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle(),
      ]);
      const norm = s => String(s || '').trim().toLowerCase();
      const sn = norm(sale.customer_nafn);
      if (f.data && norm(f.data.nafn) === sn) cust = f.data;
      else if (v.data && norm(v.data.nafn) === sn) cust = v.data;
      if (!cust) cust = f.data || v.data || null;
    }
    try { SalaInvoice.renderFromSale(w, sale, cust); } catch (e) { alert('Villa: ' + (e.message || e)); }
  }

  // Combined-send: hakað val (skýrsla + reikningur) → venjulegi póst-glugginn (254).
  async function sendBundle(kind, year, b, idty) {
    if (!(window.ReceiptSender && ReceiptSender.compose)) { toast('Póstsending ekki tilbúin — endurhladdu síðunni.'); return; }
    const isBk = kind === 'brunakerfi';
    const choices = [];
    const rep = b && b.rep;
    if (rep && rep._url) {
      const drv = (rep.drive_file_id && String(rep.drive_file_id).indexOf('sb:') !== 0) ? rep.drive_file_id : '';
      const repName = (isBk ? 'Brunakerfisskýrsla ' : 'Úttektarskýrsla ') + year + '.pdf';
      choices.push({ label: (isBk ? '🔥 Brunakerfisskýrsla ' : '🧯 Úttektarskýrsla ') + year, checked: true,
        build: () => drv ? { filename: repName, driveId: drv } : { filename: repName, url: rep._url } });
    }
    if (b && b.inv && b.inv._fromDoc) {
      // document_pairs fallback — engin solur-röð, hengjum skrána beint við.
      const idrv = b.inv.drive_file_id && String(b.inv.drive_file_id).indexOf('sb:') !== 0 ? b.inv.drive_file_id : '';
      const invName = 'Reikningur ' + (b.inv.num || year) + '.pdf';
      if (idrv || b.inv._url) {
        choices.push({ label: '🧾 Reikningur ' + (b.inv.num || ''), checked: true,
          build: () => idrv ? { filename: invName, driveId: idrv } : { filename: invName, url: b.inv._url } });
      }
    } else if (b && b.inv && b.inv.id && ReceiptSender.invoiceAttachment) {
      choices.push({ label: '🧾 Reikningur ' + (b.inv.num || ''), checked: true,
        build: () => ReceiptSender.invoiceAttachment(b.inv.id) });
    }
    if (!choices.length) { toast('Engin skrá til að senda fyrir þetta par.'); return; }
    ReceiptSender.compose({
      title: 'Senda ' + (isBk ? 'brunakerfi' : 'úttekt') + ' ' + year + (idty.nafn ? ' — ' + idty.nafn : ''),
      to: await custEmail(idty.kt),
      subject: (isBk ? 'Brunakerfisskýrsla' : 'Úttektarskýrsla') + ' + reikningur ' + year + ' — Slökkvitæki ehf',
      bodyText: ReceiptSender.standardText(isBk ? 'brunakerfi' : 'skyrsla', { nafn: idty.nafn || '', ar: year }),
      attachmentChoices: choices,
    });
  }

  // ── the band ────────────────────────────────────────────────────────────────
  function bandRowHtml(k, icon, label, y, b) {
    const hasRep = !!(b.rep && b.rep._url), inv = b.inv;
    const st = [
      hasRep ? '<span style="color:#166534">skýrsla ✓</span>'
             : '<span style="color:#b45309">skýrsla skráð</span>',
      inv ? '<span style="color:#166534">reikn. ' + esc(inv.num || '') + ' ✓</span>'
          : '<span style="color:#b91c1c">vantar reikning</span>',
    ].join(' · ');
    const btn = (cls, extra, bg, bd, col, txt) =>
      '<button class="' + cls + '" ' + extra + ' type="button" style="padding:4px 9px;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;white-space:nowrap;background:' + bg + ';border:1px solid ' + bd + ';color:' + col + '">' + txt + '</button>';
    let bt = '';
    if (hasRep) bt += btn('_dpb-rep', 'data-v="' + esc(b.rep._url) + '"', '#fff', '#bfdbfe', '#1d4ed8', '📄 Skýrsla');
    // _fromDoc reikningur á enga solur-röð til að opna með openInvoice() — opnum
    // skjalið sjálft (sama leið og _dpb-rep), og aðeins ef það á sér skrá í raun.
    if (inv && inv._fromDoc && inv._url) bt += btn('_dpb-inv-doc', 'data-v="' + esc(inv._url) + '"', '#fff', '#ddd6fe', '#7c3aed', '🧾 Reikningur');
    else if (inv && !inv._fromDoc) bt += btn('_dpb-inv', 'data-v="' + esc(String(inv.id)) + '"', '#fff', '#ddd6fe', '#7c3aed', '🧾 Reikningur');
    if (hasRep || inv) bt += btn('_dpb-send', 'data-kind="' + k + '" data-year="' + y + '"', 'linear-gradient(180deg,#16a34a,#15803d)', '#15803d', '#fff', '📧 Senda');
    return '<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid #f1f5f9">' +
      '<span style="font-size:17px">' + icon + '</span>' +
      '<div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:700;color:#0f172a">' + label + ' ' + y + '</div>' +
      '<div style="font-size:10.5px;color:#94a3b8">' + st + '</div></div>' + bt + '</div>';
  }

  function wireBand(holder, bundlesByYear, idty) {
    holder.querySelectorAll('._dpb-rep').forEach(b => b.addEventListener('click', () => openUrl(b.dataset.v)));
    holder.querySelectorAll('._dpb-inv-doc').forEach(b => b.addEventListener('click', () => openUrl(b.dataset.v)));
    holder.querySelectorAll('._dpb-inv').forEach(b => b.addEventListener('click', () => { if (b.dataset.v) openInvoice(b.dataset.v); }));
    holder.querySelectorAll('._dpb-send').forEach(b => b.addEventListener('click', () => {
      const yb = bundlesByYear[b.dataset.year];
      if (yb && yb[b.dataset.kind]) sendBundle(b.dataset.kind, b.dataset.year, yb[b.dataset.kind], idty);
    }));
  }

  // ── public: renderInto ───────────────────────────────────────────────────────
  async function renderInto(container, opts) {
    opts = opts || {};
    if (!container) return false;
    // Generation token: fast customer switches must not let a stale async render
    // overwrite a newer one.
    const gen = (container.__dpbGen = (container.__dpbGen || 0) + 1);
    const stale = () => container.__dpbGen !== gen;
    const clearFalse = () => { if (!stale()) container.innerHTML = ''; return false; };

    const sb = SB();
    if (!sb) return clearFalse();

    let idty;
    try { idty = await resolveIdentity(opts); } catch (_) { idty = { coIds: [], baseIds: [], kt: '', ktd: '', nafn: opts.nafn || '', siteLocked: false }; }
    if (stale()) return false;
    const { coIds, baseIds, ktd, siteLocked } = idty;
    if (!coIds.length && !baseIds.length) return clearFalse();

    // 1) customer_documents — site-locked: AÐEINS fyrirtaeki_id. Base-join
    //    málaði fyrsta systkini-skjalið á alla hótel Center/Pizzan.
    let docs = [];
    try {
      const ors = [];
      if (coIds.length) ors.push('fyrirtaeki_id.in.(' + coIds.join(',') + ')');
      if (!siteLocked && baseIds.length) ors.push('customer_base_id.in.(' + baseIds.join(',') + ')');
      if (ors.length) {
        const r = await sb.from('customer_documents')
          .select('id,doc_type,year,drive_file_id,storage_path,invoice_number,doc_date,amount,fyrirtaeki_id,customer_base_id')
          .or(ors.join(','))
          .in('doc_type', ['uttektarskyrsla', 'brunakerfi', 'reikningur', 'samningur']);
        docs = (r.data || []).map(mapDocUrl);
      }
    } catch (_) {}
    if (stale()) return false;

    // 2) solur: site-locked → customer_id (staðurinn). Annars kt (lögaðili).
    const solBySrc = {};
    try {
      let sr = null;
      if (siteLocked && coIds.length) {
        sr = await sb.from('solur').select('id,num,source,samtals,created_at,customer_id')
          .in('customer_id', coIds)
          .in('source', ['uttekt', 'brunakerfi']).limit(400);
      } else if (ktd.length === 10 && ktd !== '9999999999') {
        sr = await sb.from('solur').select('id,num,source,samtals,created_at')
          .or('customer_kt.eq.' + ktd + ',customer_kt.eq.' + ktDashed(ktd))
          .in('source', ['uttekt', 'brunakerfi']).limit(400);
      }
      (sr && sr.data || []).forEach(s => {
        const y = String(s.created_at || '').slice(0, 4);
        const k = (s.source || '') + '|' + y;
        if (!solBySrc[k]) solBySrc[k] = s;
      });
    } catch (_) {}
    if (stale()) return false;

    // 3) build bundlesByYear[year] = { skyrsla:{rep,inv}, brunakerfi:{rep,inv} }
    const bundlesByYear = {};
    const docById = {};
    docs.forEach(d => { docById[d.id] = d; });
    docs.forEach(d => {
      const y = String(d.year || ''); if (!y) return;
      if (d.doc_type === 'uttektarskyrsla') { (bundlesByYear[y] = bundlesByYear[y] || {}).skyrsla = { rep: d }; }
      else if (d.doc_type === 'brunakerfi') { (bundlesByYear[y] = bundlesByYear[y] || {}).brunakerfi = { rep: d }; }
    });
    // A kind can have an invoice (solur) but NO doc_type row of its own — make
    // the slot so the row still appears.
    ['uttekt', 'brunakerfi'].forEach(src => {
      Object.keys(solBySrc).forEach(k => {
        if (!k.startsWith(src + '|')) return;
        const y = k.slice(src.length + 1);
        const key = src === 'uttekt' ? 'skyrsla' : 'brunakerfi';
        if (!(bundlesByYear[y] = bundlesByYear[y] || {})[key]) bundlesByYear[y][key] = { rep: null };
      });
    });
    Object.keys(bundlesByYear).forEach(y => {
      if (bundlesByYear[y].skyrsla) bundlesByYear[y].skyrsla.inv = solBySrc['uttekt|' + y] || null;
      if (bundlesByYear[y].brunakerfi) bundlesByYear[y].brunakerfi.inv = solBySrc['brunakerfi|' + y] || null;
    });

    // 4) document_pairs (Brunahólf's durable bundle table). Fills gaps the
    //    doc_type/solur grouping can't know (shared_report, invoice_doc_id) AND —
    //    the point of verkefnalisti 688f153b — CREATES a slot for a pair that
    //    Agnar linked by hand for a company the auto-matcher couldn't connect, so
    //    pairs show for ALL companies (t.d. BGT ehf → sitt eigið „Úttekt <ár>").
    try {
      const scope = [];
      if (coIds.length) scope.push('fyrirtaeki_id.in.(' + coIds.join(',') + ')');
      if (!siteLocked && baseIds.length) scope.push('customer_base_id.in.(' + baseIds.join(',') + ')');
      if (scope.length) {
        const dp = await sb.from('document_pairs')
          .select('year,service_type,report_doc_id,invoice_doc_id,fyrirtaeki_id,customer_base_id')
          .or(scope.join(','));
        const pairs = (dp.data || []).filter(row => row.report_doc_id || row.invoice_doc_id);
        // Fetch any referenced customer_documents rows not already loaded (a pair
        // can point at a doc outside the coId/baseId doc fetch).
        const need = new Set();
        pairs.forEach(row => {
          if (row.report_doc_id && !docById[row.report_doc_id]) need.add(row.report_doc_id);
          if (row.invoice_doc_id && !docById[row.invoice_doc_id]) need.add(row.invoice_doc_id);
        });
        if (need.size) {
          try {
            const er = await sb.from('customer_documents')
              .select('id,doc_type,year,drive_file_id,storage_path,invoice_number,doc_date,amount,fyrirtaeki_id,customer_base_id')
              .in('id', Array.from(need));
            (er.data || []).map(mapDocUrl).forEach(d => { docById[d.id] = d; });
          } catch (_) {}
        }
        if (stale()) return false;
        pairs.forEach(row => {
          if (siteLocked && row.fyrirtaeki_id != null && !coIds.includes(+row.fyrirtaeki_id)) return;
          const key = row.service_type === 'brunakerfi' ? 'brunakerfi' : 'skyrsla';
          const y = String(row.year);
          const yb = (bundlesByYear[y] = bundlesByYear[y] || {});
          let slot = yb[key];
          if (!slot) slot = yb[key] = { rep: null, inv: null };
          if (!slot.rep && row.report_doc_id) { const rd = docById[row.report_doc_id]; if (rd) slot.rep = rd; }
          if (!slot.inv && row.invoice_doc_id) {
            const invd = docById[row.invoice_doc_id];
            if (invd) slot.inv = { id: invd.id, num: invd.invoice_number, samtals: invd.amount, _url: invd._url, drive_file_id: invd.drive_file_id, _fromDoc: true };
          }
        });
      }
    } catch (_) {}
    if (stale()) return false;

    // 5) render — newest year first; 🧯 Úttekt · 🔥 Brunakerfi (exactly patch 253).
    const brows = [];
    Object.keys(bundlesByYear).sort((a, b) => b.localeCompare(a)).forEach(y => {
      [['skyrsla', '🧯', 'Úttekt'], ['brunakerfi', '🔥', 'Brunakerfi']].forEach(pair => {
        const b = bundlesByYear[y][pair[0]]; if (!b) return;
        brows.push(bandRowHtml(pair[0], pair[1], pair[2], y, b));
      });
    });
    if (stale()) return false;
    if (!brows.length) return clearFalse();

    container.innerHTML =
      '<div style="font-size:12px;font-weight:700;color:#0f172a;margin:0 0 8px">📦 Pör — skýrsla + reikningur ' +
        '<span style="font-weight:500;color:#94a3b8">(sendu bæði í einu)</span></div>' +
      '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">' + brows.join('') + '</div>';
    wireBand(container, bundlesByYear, idty);
    return true;
  }

  window.DocPairs = { renderInto };

  // ── Mount (a): company detail „Skjöl & viðhengi" (#companies-main) ───────────
  // Self-mounting so patch 111/158/199 stay untouched — a sibling section right
  // after patch 199's „📁 Skjöl & viðhengi" card (._dyg-section). Same coId
  // discovery as patch 199 (getCompanyId).
  function getCompanyId() {
    const main = document.getElementById('companies-main'); if (!main) return null;
    const el = main.querySelector('[data-co-id]:not(._cat-section):not(._dyg-section):not(._cpr-section):not(._dpb-company)');
    if (el) { const v = el.getAttribute('data-co-id'); if (v && /^\d+$/.test(v)) return +v; }
    return null;
  }
  function placeCompanySection(sec, main) {
    const dyg = main.querySelector('._dyg-section');
    if (dyg) { if (dyg.nextSibling) main.insertBefore(sec, dyg.nextSibling); else main.appendChild(sec); return; }
    const cat = main.querySelector('._cat-section');
    if (cat) main.insertBefore(sec, cat); else main.appendChild(sec);
  }
  function mountCompany() {
    const main = document.getElementById('companies-main'); if (!main) return;
    const coId = getCompanyId();
    let sec = main.querySelector('._dpb-company');
    if (!coId) { if (sec) sec.remove(); return; }
    if (sec && String(sec.dataset.coId) === String(coId) && !sec.dataset.dirty) return;   // up to date
    if (!sec) {
      sec = document.createElement('div');
      sec.className = '_dpb-company';
      sec.style.cssText = 'margin:14px 0;display:none';
      placeCompanySection(sec, main);
    }
    sec.dataset.coId = String(coId);
    delete sec.dataset.dirty;
    renderInto(sec, { coId: +coId }).then(had => { if (String(sec.dataset.coId) === String(coId)) sec.style.display = had ? '' : 'none'; })
      .catch(() => { sec.style.display = 'none'; });
  }
  function markCompanyDirty() { const s = document.querySelector('._dpb-company'); if (s) { s.dataset.dirty = '1'; mountCompany(); } }

  (function startCompany() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(startCompany, 800); return; }
    let t = 0;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(mountCompany, 500); }).observe(main, { childList: true });
    mountCompany();
  })();
  // A new skýrsla/reikningur was written (168/233/273/274 dispatch these) or the
  // user navigated back to the same company → re-pull.
  document.addEventListener('customer-doc-written', markCompanyDirty);
  document.addEventListener('attachment-year-changed', markCompanyDirty);
  window.addEventListener('hashchange', () => setTimeout(mountCompany, 250));

  // ── Mount (b): Sölu selected-customer card (#_ups-selected, patch 114) ───────
  // Appended inside the card (below notes). Re-renders only when the selected
  // customer changes (key = source|id|kt); polled like patch 253's ensureButton
  // since patch 114 shows/updates the card without an event.
  function mountSala() {
    const card = document.getElementById('_ups-selected'); if (!card) return;
    let sec = card.querySelector('._dpb-sala');
    const hidden = card.style.display === 'none';
    if (hidden) { if (sec) sec.style.display = 'none'; return; }
    const source = card.dataset.source || '', id = card.dataset.id || '', kt = card.dataset.kt || '';
    const key = source + '|' + id + '|' + kt;
    if (sec && sec.dataset.key === key) { if (sec.dataset.had === '1') sec.style.display = ''; return; }
    if (!sec) {
      sec = document.createElement('div');
      sec.className = '_dpb-sala';
      sec.style.cssText = 'margin-top:8px;display:none';
      card.appendChild(sec);
    }
    sec.dataset.key = key;
    sec.dataset.had = '';
    const o = {};
    if (source === 'fyrirtaeki' && /^\d+$/.test(id)) o.coId = +id;
    if (kt) o.kt = kt;
    const nm = ((document.getElementById('_ups-sel-nafn') || {}).textContent || '').trim();
    if (nm) o.nafn = nm;
    renderInto(sec, o).then(had => {
      if (sec.dataset.key !== key) return;   // customer changed mid-flight
      sec.dataset.had = had ? '1' : '';
      sec.style.display = had ? '' : 'none';
    }).catch(() => { sec.style.display = 'none'; });
  }
  setInterval(mountSala, 700);
  setTimeout(mountSala, 900);

  console.log('[patch-311] DocPairs pör-band installed (company detail + Sala)');
})();
/* === END DOC PAIRS BAND === */
