/* === BRUNAKERFI REIKNINGSDRÖG VIÐ LOKIÐ + STÖÐULÍNA (2026-07-30) ===
 *
 * Verkefnalisti (Agnar svaraði „Both"): „Brunakerfi: stofna reikning sjálfkrafa
 * við LOKIÐ + stöðulína á prófíl".
 *
 * 1) SJÁLFVIRK REIKNINGSDRÖG: þegar skoðunarskýrsla brunakerfis er kláruð
 *    („✅ Ljúka & vista PDF" → finalize() í patch 273, S.status='final') kallar
 *    273 í BrunakerfiReikningur.onFinal(ctx) — fire-and-forget, stöðvar ALDREI
 *    lokunina. Hér er stofnuð DRÖG-röð í `solur`:
 *      status='draft' · greitt_med='reikningur' · source='brunakerfi'
 *    Verðið kemur úr verð-línum skýrslunnar (S.data.verd.linur); ef þær eru
 *    tómar er reynt autoVerdLines() (búnaðarteljarar × tengdir verðlista-liðir,
 *    reiknað í 273 og sent með í ctx.autoLinur); finnist ekkert verð eru drögin
 *    samt stofnuð með EINNI 0-kr línu „Ársskoðun brunaviðvörunarkerfis <ár>" og
 *    athugasemdinni „verð vantar — stilla fyrir útgáfu" (ALLTAF LEYFA VISTUN).
 *
 *    TALNAVENJAN er sú EINA studda (CLAUDE.md „Afsláttar-samræming" / 273
 *    createInvoice): línur bera FULLT einingaverð án vsk, `afslattur` = kr sem
 *    dregst af HEILDINNI m. vsk, samtals = brúttó − afslattur, án-vsk/vsk
 *    skalast (VSK tekur afrúnun svo ex+vsk === samtals). Aldrei bæði bakað í
 *    línur OG afslattur.
 *
 *    IDEMPOTENT: lykillinn er non-void `solur`-röð með source='brunakerfi' +
 *    customer_id = fyrirtækið + árið (sale_id sem skýrslan geymir í
 *    data.verd.sale_id, EÐA created_at innan ársins, EÐA „úttekt YY-" í
 *    athugasemd). Finnist slík röð eru ENGIN ný drög stofnuð — hún er tengd
 *    við skýrsluna og tilkynnt í staðinn.
 *
 * 2) STÖÐULÍNA Á PRÓFÍL: brunakerfis-síða fyrirtækisins (patch 274) kallar
 *    decorateProfile(C, wrap) í lok render() → lítil rönd fyrir ofan gridið:
 *    „🧾 Brunakerfi <ár>: LOKIÐ ✓ · Reikningur: R-… (drög) [Opna]" eða
 *    „… enginn [＋ Stofna drög]" (sami ferill og við LOKIÐ, idempotent).
 *
 * Engar schema-breytingar; num-ið kemur úr DB-triggernum solur_set_num.
 * Public: window.BrunakerfiReikningur = { onFinal, decorateProfile, findInvoice }
 */
(() => {
  if (window.__bkReiknInstalled) return;
  window.__bkReiknInstalled = true;

  const VAT_PCT = 24;

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function num(v) { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : null; }
  function fmtKr(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr'; }
  function fmtDags(iso) { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; }
  function toast(msg, bad) {
    let t = document.getElementById('_bkr-toast');
    if (!t) { t = document.createElement('div'); t.id = '_bkr-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:12000;padding:11px 20px;border-radius:99px;font-weight:800;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,.35);transition:opacity .3s;opacity:1;background:' + (bad ? '#b91c1c' : '#14532d') + ';color:#fff';
    clearTimeout(t._h); t._h = setTimeout(() => { t.style.opacity = '0'; }, 3400);
  }

  // ── idempotency: finna reikning skýrslu-árs fyrirtækisins ──────────────────
  // Lykill: non-void solur-röð, source='brunakerfi', customer_id=coId og
  // (saleId úr data.verd EÐA created_at innan ársins EÐA „úttekt YY-" í aths).
  async function findInvoice(coId, year, saleId) {
    const sb = SB(); if (!sb) return null;
    if (saleId) {
      try {
        const r = await sb.from('solur').select('id,num,status,samtals').eq('id', saleId).limit(1);
        const row = r && r.data && r.data[0];
        if (row && row.status !== 'void') return row;
      } catch (_) {}
    }
    try {
      const q = await sb.from('solur').select('id,num,status,samtals,created_at,athugasemdir')
        .eq('source', 'brunakerfi').eq('customer_id', coId).neq('status', 'void')
        .order('created_at', { ascending: false }).limit(50);
      const rows = (q && q.data) || [];
      const yy = String(year).slice(-2);
      const re = new RegExp('úttekt\\s+' + yy + '-');
      return rows.find(x => String(x.created_at || '').slice(0, 4) === String(year) || re.test(x.athugasemdir || '')) || null;
    } catch (e) { console.warn('[bkr] findInvoice', e); return null; }
  }

  // ── sölulíkami úr ctx (SAMA stærðfræði og 273 createInvoice) ───────────────
  function buildDraftBody(co, year, ctx) {
    let linur = [], to = 0, afsl = 0, missingPrice = false;
    const lin = (ctx.linur || []);
    const auto = (ctx.autoLinur || []);
    if (lin.length && Math.round(ctx.verdTotal || 0) > 0) {
      // verð-línur skýrslunnar: fullt verð í línum, afsláttur sem brúttó-króna
      linur = lin.map(l => ({ type: 'service', desc: l.name || '', qty: num(l.qty) || 0, unit_price_ex_vat: num(l.price) || 0, vsk_pct: VAT_PCT, ref: '' }));
      to = Math.round(ctx.verdTotal);
      afsl = Math.max(0, Math.round(ctx.verdGross != null ? ctx.verdGross : ctx.verdTotal) - to);
    } else if (auto.some(l => (num(l.qty) || 0) > 0 && (num(l.price) || 0) > 0)) {
      // fallback: reiknaðar línur úr búnaðaryfirlitinu (enginn afsláttur)
      const al = auto.filter(l => (num(l.qty) || 0) > 0);
      linur = al.map(l => ({ type: 'service', desc: l.name || '', qty: num(l.qty) || 0, unit_price_ex_vat: num(l.price) || 0, vsk_pct: VAT_PCT, ref: '' }));
      const sum = al.reduce((a, l) => a + (num(l.qty) || 0) * (num(l.price) || 0), 0);
      to = Math.round(sum * (1 + VAT_PCT / 100));
    }
    if (!linur.length || !(to > 0)) {
      // ekkert verð finnanlegt → drögin stofnast SAMT (ALLTAF LEYFA VISTUN)
      missingPrice = true;
      linur = [{ type: 'service', desc: 'Ársskoðun brunaviðvörunarkerfis ' + year, qty: 1, unit_price_ex_vat: 0, vsk_pct: VAT_PCT, ref: '' }];
      to = 0; afsl = 0;
    }
    const se = Math.round(to / (1 + VAT_PCT / 100)), vs = to - se;
    const ktd = String(co.kennitala || '').replace(/\D/g, '');
    return {
      missingPrice,
      row: {
        customer_nafn: co.nafn || '', customer_id: co.id, customer_kt: ktd || null,
        starfsmadur: ctx.madur || 'Kassi', linur,
        upphaed_an_vsk: se, vsk_upphaed: vs, samtals: to, afslattur: afsl,
        greitt_med: 'reikningur', status: 'draft', source: 'brunakerfi',
        athugasemdir: 'Brunakerfisskoðun — úttekt ' + (ctx.nr || '') +
          (ctx.dags ? ' · ' + fmtDags(ctx.dags) : '') +
          ' · sjálfvirk drög við LOKIÐ' +
          (missingPrice ? ' · verð vantar — stilla fyrir útgáfu' : '')
      }
    };
  }

  // ── aðal-ferillinn: finna-eða-stofna drög (kallað úr 273 finalize + prófíl) ─
  // ctx: { co:{id,nafn,kennitala}, year, nr, dags, madur, linur:[{name,qty,price}],
  //        autoLinur:[{name,qty,price}], verdTotal, verdGross, saleId, saleNum,
  //        linkSale: async(row)=>… (skrifar sale_id/num aftur á skýrsluna) }
  async function onFinal(ctx) {
    try {
      const sb = SB(); if (!sb || !ctx || !ctx.co || !ctx.co.id) return null;
      const ex = await findInvoice(ctx.co.id, ctx.year, ctx.saleId || null);
      if (ex) {
        // þegar til → tengja við skýrsluna (ef ótengt) og ENGIN ný drög
        if (!ctx.saleId && ctx.linkSale) { try { await ctx.linkSale(ex); } catch (_) {} }
        if (!ctx.quiet) toast('🧾 Reikningur ' + (ex.num || '') + ' er þegar til fyrir ' + ctx.year + ' — engin ný drög stofnuð.');
        return ex;
      }
      const b = buildDraftBody(ctx.co, ctx.year, ctx);
      const ins = await sb.from('solur').insert(b.row).select('id,num,status,samtals').single();
      if (ins.error) {
        console.warn('[bkr] draft insert', ins.error);
        toast('Reikningsdrög vistuðust ekki: ' + ins.error.message, true);
        return null;
      }
      if (ctx.linkSale) { try { await ctx.linkSale(ins.data); } catch (e) { console.warn('[bkr] linkSale', e); } }
      toast('🧾 Reikningsdrög ' + ins.data.num + ' stofnuð sjálfkrafa' +
        (b.missingPrice ? ' — verð vantar, stilla fyrir útgáfu' : ' · ' + fmtKr(b.row.samtals) + ' m. vsk'));
      return ins.data;
    } catch (e) { console.warn('[bkr] onFinal', e); return null; }
  }

  // ── prófíl-hjálparar ────────────────────────────────────────────────────────
  function optsFromReport(co, rep) {
    const d = (rep && rep.data) || {};
    const verd = d.verd || {};
    const lin = (verd.linur || []).map(l => ({ name: l.name, qty: l.qty, price: l.price }));
    const sum = lin.reduce((a, l) => a + (num(l.qty) || 0) * (num(l.price) || 0), 0);
    const gross = sum * (1 + VAT_PCT / 100);
    let af = num(verd.afslattur) || 0; if (af < 0) af = 0; if (af > gross) af = gross;
    return {
      co, year: +rep.year || new Date().getFullYear(),
      nr: (d.meta && d.meta.nr) || rep.uttekt_nr || '', dags: (d.meta && d.meta.dags) || '',
      madur: (d.meta && d.meta.madur) || '',
      linur: lin, autoLinur: [], verdTotal: gross - af, verdGross: gross,
      saleId: verd.sale_id || null, saleNum: verd.sale_num || null
    };
  }

  // skrifar sale_id/sale_num aftur inn í brunakerfi_skyrslur.data.verd (prófíl-leiðin;
  // 273-leiðin notar sitt eigið linkSale sem fer gegnum saveDraft á opna forminu)
  async function linkSaleToReport(rep, row) {
    try {
      const sb = SB(); if (!sb) return;
      let d = rep.data || {};
      try {
        const fresh = await sb.from('brunakerfi_skyrslur').select('id,data').eq('id', rep.id).limit(1);
        if (fresh && fresh.data && fresh.data[0] && fresh.data[0].data) d = fresh.data[0].data;
      } catch (_) {}
      d.verd = d.verd || { linur: [] };
      d.verd.sale_id = row.id; d.verd.sale_num = row.num;
      await sb.from('brunakerfi_skyrslur').update({ data: d, updated_at: new Date().toISOString() }).eq('id', rep.id);
      rep.data = d;
    } catch (e) { console.warn('[bkr] linkSaleToReport', e); }
  }

  function openSale(inv) {
    try {
      if (window.SaleEditor && SaleEditor.openById) return SaleEditor.openById(inv.id);
      if (window.SaleEditor && SaleEditor.openByNum && inv.num) return SaleEditor.openByNum(inv.num);
      if (window.location) window.location.hash = '#sale/' + (inv.num || inv.id); // patch 235 deep-link
    } catch (e) { console.warn('[bkr] openSale', e); }
  }

  // ── stöðulínan á brunakerfis-prófílnum (kallað úr 274 render) ──────────────
  async function decorateProfile(C, w) {
    try {
      if (!C || !C.co || !w || !w.isConnected) return;
      const old = w.querySelector('#_bkr-status'); if (old) old.remove();
      const reports = C.reports || [];
      const years = Array.from(new Set(reports.map(r => +r.year).filter(Boolean))).sort((a, b) => b - a);
      const yr = years[0] || new Date().getFullYear();
      const yrReps = reports.filter(r => +r.year === yr);
      const finalRep = yrReps.find(r => r.status === 'final') || null;
      const anyRep = yrReps[0] || null;

      const el = document.createElement('div');
      el.id = '_bkr-status';
      el.style.cssText = 'background:#fff;border:1px solid #d7dade;border-radius:12px;box-shadow:0 1px 2px rgba(16,20,28,.06);padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:13px';
      const badge = finalRep
        ? '<span style="padding:2px 9px;border-radius:99px;background:#dcf1e4;color:#166b3a;font-weight:800;font-size:10.5px">LOKIÐ ✓</span>'
        : anyRep
          ? '<span style="padding:2px 9px;border-radius:99px;background:#fdf3d7;color:#8a6100;font-weight:800;font-size:10.5px">DRÖG</span>'
          : '<span style="padding:2px 9px;border-radius:99px;background:#e8ecf3;color:#3b4653;font-weight:800;font-size:10.5px">ENGIN SKOÐUN</span>';
      el.innerHTML = '<b style="font-size:13px">🧾 Brunakerfi ' + yr + ':</b> ' + badge +
        ' <span id="_bkr-inv" style="color:#59606c;display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap">· Reikningur: leita…</span>';
      const grid = w.querySelector('._bkc-grid');
      if (grid) w.insertBefore(el, grid); else w.appendChild(el);

      // reikningsstaðan — sale_id sem einhver skýrsla ársins geymir er sterkasta sönnunin
      const linkedId = yrReps.map(r => r.data && r.data.verd && r.data.verd.sale_id).find(Boolean) || null;
      const inv = await findInvoice(C.co.id, yr, linkedId);
      const span = el.querySelector('#_bkr-inv'); if (!span || !span.isConnected) return;

      if (inv) {
        const stTxt = inv.status === 'draft' ? 'drög' : inv.status === 'final' ? 'stofnaður' : (inv.status || '');
        span.innerHTML = '· Reikningur: <b style="color:#16181c">' + esc(inv.num || '') + '</b>' +
          ' <span style="padding:2px 8px;border-radius:99px;font-size:10.5px;font-weight:800;background:' +
          (inv.status === 'final' ? '#dcf1e4;color:#166b3a' : '#fdf3d7;color:#8a6100') + '">' + esc(stTxt) + '</span>' +
          ' ' + fmtKr(+inv.samtals || 0) +
          ' <button type="button" id="_bkr-open" style="padding:5px 12px;border-radius:8px;border:1px solid #c6d4e8;background:#eaf1fe;color:#1f63b8;font:inherit;font-size:12px;font-weight:700;cursor:pointer">Opna</button>';
        const b = span.querySelector('#_bkr-open');
        if (b) b.addEventListener('click', () => openSale(inv));
      } else if (finalRep) {
        span.innerHTML = '· Reikningur: <b style="color:#c93c1d">enginn</b> ' +
          '<button type="button" id="_bkr-make" style="padding:5px 12px;border-radius:8px;border:0;background:#1f8a4c;color:#fff;font:inherit;font-size:12px;font-weight:700;cursor:pointer">＋ Stofna drög</button>';
        const b = span.querySelector('#_bkr-make');
        if (b) b.addEventListener('click', async () => {
          b.disabled = true; b.textContent = '⏳ Stofna…';
          const ctx = optsFromReport(C.co, finalRep);
          ctx.linkSale = row => linkSaleToReport(finalRep, row);
          const row = await onFinal(ctx);
          if (row) decorateProfile(C, w);
          else { b.disabled = false; b.textContent = '＋ Stofna drög'; }
        });
      } else {
        span.innerHTML = '· Reikningur: — <span style="color:#8b93a1">(stofnast sjálfkrafa þegar skýrslu er LOKIÐ)</span>';
      }
    } catch (e) { console.warn('[bkr] decorateProfile', e); }
  }

  window.BrunakerfiReikningur = { onFinal, decorateProfile, findInvoice };
  console.log('[patch-291] Brunakerfi reikningsdrög við LOKIÐ + stöðulína installed');
})();
/* === END BRUNAKERFI REIKNINGSDRÖG === */
