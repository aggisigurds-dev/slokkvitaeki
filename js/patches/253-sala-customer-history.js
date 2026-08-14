/* === SALA CUSTOMER HISTORY v2 ===
 *
 * Adds a "🧾 Fyrri kaup" button to the selected-customer card in Sala (POS,
 * patch 114's #_ups-selected card). Clicking opens a modal listing that
 * customer's previous receipts + invoices (from `solur`), each viewable /
 * printable / re-sendable — so when a customer asks "what did I buy last time"
 * or "send me the receipt from last week" you can answer without leaving Sala
 * (the karfa is untouched). The modal header also carries a shareable
 * deep-link `#hreyfingarlisti/<kt>` (open in new tab · copy) whose handler
 * lives in patch 167 (Hreyfingarlisti) and runs the same name/kt lookup.
 *
 * Self-contained: reads the card's identity (data-id / data-source / data-kt +
 * the shown name) — it does NOT touch patch 114's sale flow. Sales are matched
 * by customer_kt (the reliable link after the 2026-07-01 always-kt work) OR the
 * company customer_id OR the exact name, mirroring Hreyfingarlisti's lookup.
 *
 * Send (📧) uses window.ReceiptSender.send(saleId) when the email connector is
 * wired; until then it opens the invoice so the operator can print / save PDF.
 */
(() => {
  if (window.__salaCustHistoryInstalled) return;
  window.__salaCustHistoryInstalled = true;

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function ktDigits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function ktDashed(d) { return d && d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : d; }
  function orSafe(s) { return String(s == null ? '' : s).replace(/["(),*]/g, ' ').trim(); }
  function fmtKr(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS').replace(/,/g, '.') + ' kr'; }
  function fmtDate(iso) { if (!iso) return '—'; const d = new Date(iso); return isNaN(d) ? '—' : (String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear()); }
  function methodLabel(m) {
    if (m === 'kort') return '💳 Kort'; if (m === 'reidufe' || m === 'peningar') return '💵 Reiðufé';
    if (m === 'reikningur') return '📋 Reikningur'; if (m === 'greitt_sidar') return '⏳ Greitt síðar';
    return esc(m || '—');
  }

  // Shareable deep-link — kt when real (unambiguous), else the name.
  function queryFor(kt, nafn) { const d = ktDigits(kt); return (d.length === 10 && d !== '9999999999') ? d : (nafn || '').trim(); }
  function urlFor(kt, nafn) { const q = queryFor(kt, nafn); return q ? (location.origin + '/#hreyfingarlisti/' + encodeURIComponent(q)) : ''; }

  // ── Inject the button + keep its visibility synced to "Sjá →" ─────────────
  function ensureButton() {
    const openBtn = document.getElementById('_ups-sel-open');
    if (!openBtn || !openBtn.parentElement) return;
    let btn = document.getElementById('_ups-sel-history');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = '_ups-sel-history';
      btn.type = 'button';
      btn.title = 'Sjá fyrri kvittanir og reikninga þessa viðskiptavinar';
      btn.textContent = '🧾 Fyrri viðskipti';
      btn.style.cssText = 'background:#0f766e;border:1px solid #0d5b54;color:#fff;font-size:11px;font-weight:600;padding:4px 9px;border-radius:5px;cursor:pointer;line-height:1.2;white-space:nowrap';
      btn.addEventListener('click', onClick);
      openBtn.parentElement.insertBefore(btn, openBtn.nextSibling);
    }
    btn.style.display = openBtn.style.display === 'none' ? 'none' : '';
  }

  function onClick() {
    const card = document.getElementById('_ups-selected');
    if (!card) return;
    const nafn = ((document.getElementById('_ups-sel-nafn') || {}).textContent || '').trim();
    open({ id: card.dataset.id || '', source: card.dataset.source || '', kt: card.dataset.kt || '', nafn: nafn });
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function close() { document.getElementById('_sch-modal')?.remove(); }

  async function open(idty) {
    close();
    const link = urlFor(idty.kt, idty.nafn);
    const dlg = document.createElement('div');
    dlg.id = '_sch-modal';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100085;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.35);width:min(760px,calc(100vw - 24px));max-height:calc(100vh - 48px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 20px;background:linear-gradient(135deg,#0f766e,#0d5b54);color:#fff;display:flex;justify-content:space-between;align-items:center;gap:10px">' +
          '<div style="min-width:0">' +
            '<div style="font-size:15px;font-weight:700">🧾 Fyrri viðskipti — ' + esc(idty.nafn || 'Viðskiptavinur') + '</div>' +
            '<div style="font-size:11px;color:#99f6e4;margin-top:2px">' + (ktDigits(idty.kt).length === 10 && ktDigits(idty.kt) !== '9999999999' ? 'kt. ' + esc(ktDashed(ktDigits(idty.kt))) : 'án kennitölu') + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:6px;align-items:center">' +
            (link ? '<button id="_sch-opentab" type="button" title="Opna í Hreyfingarlista í nýjum flipa" style="background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.4);color:#fff;font-size:11px;font-weight:600;padding:5px 9px;border-radius:6px;cursor:pointer;white-space:nowrap">🔗 Opna flipa</button>' +
                    '<button id="_sch-copy" type="button" title="Afrita hlekk á sögu kúnnans" style="background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.4);color:#fff;font-size:11px;font-weight:600;padding:5px 9px;border-radius:6px;cursor:pointer;white-space:nowrap">📋 Afrita hlekk</button>' : '') +
            '<button id="_sch-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,0.4);color:#fff;width:32px;height:32px;border-radius:7px;cursor:pointer;font-size:16px;line-height:1">✕</button>' +
          '</div>' +
        '</div>' +
        '<div id="_sch-body" style="flex:1;overflow:auto;padding:14px 18px;background:#f8fafc"><div style="padding:30px;text-align:center;color:#94a3b8">Hleður sögu…</div></div>' +
      '</div>';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_sch-x').addEventListener('click', close);
    document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } });
    if (link) {
      dlg.querySelector('#_sch-opentab')?.addEventListener('click', () => window.open(link, '_blank'));
      dlg.querySelector('#_sch-copy')?.addEventListener('click', () => {
        try { navigator.clipboard.writeText(link); if (window.Toast && Toast.show) Toast.show('🔗 Hlekkur afritaður'); }
        catch (_) { window.prompt('Afritaðu hlekkinn:', link); }
      });
    }

    const sb = SB();
    const body = dlg.querySelector('#_sch-body');
    if (!sb) { body.innerHTML = '<div style="padding:30px;text-align:center;color:#dc2626">Engin gagnabankatenging.</div>'; return; }

    const ktd = ktDigits(idty.kt);
    const parts = [];
    if (idty.id && idty.source === 'fyrirtaeki') parts.push('customer_id.eq.' + idty.id);
    if (ktd.length === 10 && ktd !== '9999999999') { parts.push('customer_kt.eq.' + ktd); const d = ktDashed(ktd); if (d !== ktd) parts.push('customer_kt.eq.' + d); }
    if (idty.nafn) parts.push('customer_nafn.eq."' + orSafe(idty.nafn) + '"');
    if (!parts.length) { body.innerHTML = '<div style="padding:30px;text-align:center;color:#94a3b8">Ekki hægt að fletta upp þessum viðskiptavini.</div>'; return; }

    const r = await sb.from('solur')
      .select('id,num,customer_nafn,customer_id,customer_kt,samtals,greitt_med,created_at,paid_at,is_credit,dk_invoice_id,vidskiptategund,status,kredit_a')
      .or(parts.join(','))
      .order('created_at', { ascending: false })
      .limit(500);
    if (r.error) { body.innerHTML = '<div style="padding:30px;text-align:center;color:#dc2626">Villa: ' + esc(r.error.message) + '</div>'; return; }
    const rows = r.data || [];

    // ── Payday-kröfur (2026-07-10, ósk Agnars): reikningar stofnaðir BEINT í
    // Payday (mánaðaruppgjör, bókari) eiga enga solur-röð — kúnnar hringja og
    // nefna PAYDAY-númerið og ekkert fannst. Spegillinn payday_invoices_slokk
    // (fylltur af /api/payday-pull-slokk, uppfærður daglega í payday-sync-cron)
    // gerir þá leitanlega hér. Sölur sem fóru gegnum payday-push (dk_invoice_id
    // = Payday id/númer) fá PD-númerið Á SÍNA röð í stað þess að tvíbirtast.
    let pdRows = [];
    const PD_SEL = 'payday_id,number,customer_name,amount_total,created_date,due_date,paid_date,status,reference,description';
    if (ktd.length === 10 && ktd !== '9999999999') {
      try {
        const pr = await sb.from('payday_invoices_slokk')
          .select(PD_SEL)
          .eq('kt', ktd)
          .order('created_date', { ascending: false })
          .limit(300);
        if (!pr.error) pdRows = pr.data || [];
      } catch (_) {}
    }
    // Fallback fyrir kt-lausa Payday-kúnna (t.d. walk-in-ísh): sækja líka PD-raðir
    // þar sem reference = R-númer sölanna sem fundust (5/121 raðir án kt í speglinum).
    try {
      const nums = rows.map(s => String(s.num || '').trim()).filter(Boolean).slice(0, 200);
      if (nums.length) {
        const pr2 = await sb.from('payday_invoices_slokk').select(PD_SEL).in('reference', nums).limit(300);
        if (!pr2.error && pr2.data) {
          const seen = new Set(pdRows.map(p => p.payday_id));
          pr2.data.forEach(p => { if (!seen.has(p.payday_id)) pdRows.push(p); });
        }
      }
    } catch (_) {}
    // Tengja PD-númer við sölur sem eiga þau: payday-push skrifar dk_invoice_id,
    // og Payday-`reference` ber R-númerið (sannreynt live 2026-07-10 — t.d.
    // PD 118 með reference "R-000454") svo num↔reference tengir líka kröfur
    // sem bókarinn stofnaði með R-númeri í tilvísun.
    const pdByKey = new Map(), pdByRef = new Map();
    pdRows.forEach(p => {
      if (p.payday_id) pdByKey.set(String(p.payday_id).trim(), p);
      if (p.number) pdByKey.set(String(p.number).trim(), p);
      const ref = String(p.reference || '').trim().toUpperCase();
      if (ref) pdByRef.set(ref, p);
    });
    const linkedPd = new Set();
    rows.forEach(s => {
      const k = s.dk_invoice_id != null ? String(s.dk_invoice_id).trim() : '';
      let p = (k && pdByKey.get(k)) || null;
      if (!p && s.num) p = pdByRef.get(String(s.num).trim().toUpperCase()) || null;
      if (p) { s._pd_number = p.number || p.payday_id; linkedPd.add(p); }
    });
    const pdOnly = pdRows.filter(p => !linkedPd.has(p));

    // 2026-07-20: ÁÐUR skrifaði þetta „Engin fyrri kaup" yfir ALLT bodyið og hætti.
    // Þar með hvarf líka #_sch-docs-hólfið, svo loadDocs() fann ekkert að fylla og
    // SKJÖLIN hlóðust aldrei. Kúnnar sem eru rukkaðir í dkPlus/Stólpa (t.d. Center
    // Hótel: 0 POS-sölur en 33 úttektarskýrslur + 22 reikningar) litu því út fyrir
    // að eiga enga sögu. Nú höldum við hólfinu og segjum satt: engar POS-sölur,
    // en skjölin fá að hlaðast fyrir neðan.
    if (!rows.length && !pdOnly.length) {
      body.innerHTML =
        '<div style="padding:18px 4px 6px;text-align:center;color:#94a3b8;font-style:italic">' +
          'Engar sölur skráðar í kassakerfinu hjá þessum viðskiptavini.' +
        '</div>' +
        '<div id="_sch-docs"><div style="padding:16px 4px;color:#94a3b8;font-size:12px">Sæki skjöl…</div></div>';
      loadDocs(idty, body).catch(() => { const h = body.querySelector('#_sch-docs'); if (h) h.innerHTML = ''; });
      return;
    }

    // Kredit-pörun (2026-08-14): kredit með kredit_a birtist sem PAR beint
    // undir reikningnum sem það bakfærir — ekki tvær ótengdar línur.
    const byNum = new Map();
    rows.forEach(s => { const n = String(s.num || '').trim().toUpperCase(); if (n) byNum.set(n, s); });
    const pairedIds = new Set();
    rows.forEach(s => {
      if (s.is_credit && s.kredit_a) {
        const o = byNum.get(String(s.kredit_a).trim().toUpperCase());
        if (o && o !== s) { (o._credits = o._credits || []).push(s); pairedIds.add(s.id); }
      }
    });
    // Fléttað í eina tímaröð (nýjast efst); pöruð kredit fylgja sínum reikningi.
    const merged = rows.filter(s => !pairedIds.has(s.id))
      .map(s => ({ t: s.created_at || '', h: rowHtml(s) + (s._credits || []).map(c => rowHtml(c, true)).join('') }))
      .concat(pdOnly.map(p => ({ t: (p.created_date || '') + 'T00:00:00', h: pdRowHtml(p) })));
    merged.sort((a, b) => String(b.t).localeCompare(String(a.t)));

    const total = rows.filter(s => !s.is_credit).reduce((a, s) => a + (+s.samtals || 0), 0);
    const pdTotal = pdOnly.filter(p => !/credit|cancel/i.test(p.status || '')).reduce((a, p) => a + (+p.amount_total || 0), 0);
    // Viðskiptategunda-sían (Pakki 7): leitin sjálf síar ALDREI neitt burt —
    // hér sést allt sem kúnninn hefur nokkru sinni keypt. Chipparnir þrengja
    // aðeins sýnina eftir á (sjálfgefið Allt) og fela/sýna raðir í DOM-inu.
    const nUt = rows.filter(s => s.vidskiptategund === 'uttekt').length;
    const nBud = rows.filter(s => s.vidskiptategund === 'bud').length;
    const nOv = rows.length - nUt - nBud;
    const CHIP = 'font:inherit;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;border:1px solid #cbd5e1;background:#fff;color:#475569;cursor:pointer';
    const tegChips = '<div id="_sch-teg" style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">' +
      '<button data-teg="allt" style="' + CHIP + ';background:#0f172a;color:#fff;border-color:#0f172a">Allt (' + rows.length + ')</button>' +
      '<button data-teg="uttekt" style="' + CHIP + '">🧯 Úttektir (' + nUt + ')</button>' +
      '<button data-teg="bud" style="' + CHIP + '">🛒 Búð (' + nBud + ')</button>' +
      (nOv ? '<button data-teg="ovisst" style="' + CHIP + '">❓ Óvíst (' + nOv + ')</button>' : '') +
    '</div>';
    body.innerHTML =
      '<div style="font-size:12px;color:#475569;margin-bottom:6px">' + rows.length + ' færslur · samtals ' + esc(fmtKr(total)) +
        (pdOnly.length ? ' &nbsp;·&nbsp; <span style="color:#6d28d9;font-weight:600">+ ' + pdOnly.length + ' Payday-kröfur · ' + esc(fmtKr(pdTotal)) + '</span>' : '') +
      '</div>' + tegChips +
      '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
          '<thead><tr style="background:#f1f5f9;border-bottom:1px solid #e2e8f0">' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Dags</th>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Skjal</th>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Greiðsla</th>' +
            '<th style="padding:8px 10px;text-align:left;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Staða</th>' +
            '<th style="padding:8px 10px;text-align:right;font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Upphæð</th>' +
            '<th style="padding:8px 10px"></th>' +
          '</tr></thead><tbody>' +
          merged.map(x => x.h).join('') +
        '</tbody></table>' +
      '</div>' +
      '<div id="_sch-docs"><div style="padding:16px 4px;color:#94a3b8;font-size:12px">Sæki skjöl…</div></div>';
    body.querySelectorAll('._sch-view').forEach(b => b.addEventListener('click', () => openInvoice(b.dataset.id)));
    body.querySelectorAll('._sch-send').forEach(b => b.addEventListener('click', () => sendReceipt(b.dataset.id)));
    // Tegunda-chipparnir: fela/sýna raðir (Payday-raðir án tegundar sjást undir Allt)
    const tegBox = body.querySelector('#_sch-teg');
    if (tegBox) tegBox.querySelectorAll('button[data-teg]').forEach(btn => btn.addEventListener('click', () => {
      const f = btn.dataset.teg;
      tegBox.querySelectorAll('button[data-teg]').forEach(b2 => {
        const on = b2 === btn;
        b2.style.background = on ? '#0f172a' : '#fff';
        b2.style.color = on ? '#fff' : '#475569';
        b2.style.borderColor = on ? '#0f172a' : '#cbd5e1';
      });
      body.querySelectorAll('tr[data-vt]').forEach(tr => {
        tr.style.display = (f === 'allt' || tr.dataset.vt === f) ? '' : 'none';
      });
    }));
    loadDocs(idty, body).catch(() => { const h = body.querySelector('#_sch-docs'); if (h) h.innerHTML = ''; });
  }

  // ── Skjöl (úttektarskýrslur + reikninga-PDF) — 2026-07-09 (ósk Agnars):
  // þegar kúnninn er valinn í Sölu á að sjást ÖLL sagan hans, líka skjölin.
  // Tveir brunnar: customer_documents (Drive-skráin, per staðsetningu/kt) og
  // CompanyAttachments (viðhengin í Supabase, patch 111/233 sjálfvirku PDF-in).
  // Skjöl lifa á tveimur stöðum: Drive (drive_file_id) og Supabase Storage
  // (storage_path, með bucket-nafninu fremst). Bucket-arnir eru public svo bein
  // slóð dugar. Skilar '' þegar hvorugt er til → engin „Opna"-hnappur.
  function driveUrl(id) { return id ? 'https://drive.google.com/file/d/' + encodeURIComponent(id) + '/view' : ''; }

  // Netfang kúnnans til að forfylla ritilinn — má alltaf breyta í glugganum.
  const _emailCache = {};
  async function custEmail(idty) {
    const kt = String((idty && idty.kt) || '').replace(/\D/g, '');
    if (!kt || kt.length !== 10 || kt === '9999999999' || !DB.sb) return '';
    if (_emailCache[kt] !== undefined) return _emailCache[kt];
    let out = '';
    try {
      const ktd = kt.slice(0, 6) + '-' + kt.slice(6);
      for (const t of ['fyrirtaeki', 'vidskiptavinir']) {
        const r = await DB.sb.from(t).select('netfang')
          .or('kennitala.eq.' + kt + ',kennitala.eq.' + ktd)
          .not('netfang', 'is', null).limit(1).maybeSingle();
        if (r && r.data && r.data.netfang) { out = String(r.data.netfang).trim(); break; }
      }
    } catch (_) {}
    _emailCache[kt] = out;
    return out;
  }
  function storageUrl(p) {
    if (!p) return '';
    const base = String(window.SUPABASE_URL || '').replace(/\/+$/, '');
    if (!base) return '';
    const s = String(p).replace(/^\/+/, '');
    const i = s.indexOf('/'); if (i < 1) return '';
    return base + '/storage/v1/object/public/' + s.slice(0, i) + '/' +
           s.slice(i + 1).split('/').map(encodeURIComponent).join('/');
  }

  // Skjalategundir — samræmd tákn þvert á appið: 🧯 slökkvitæki · 🔥 brunakerfi ·
  // 🧾 reikningur · 📜 samningur (sama og fyrirtækja-prófíllinn, patch 199).
  function typeMeta(t) {
    if (t === 'uttektarskyrsla') return { kind: 'skyrsla',    icon: '🧯', label: 'Úttektarskýrsla',   sort: '0' };
    if (t === 'brunakerfi')      return { kind: 'brunakerfi', icon: '🔥', label: 'Brunakerfisskýrsla', sort: '1' };
    if (t === 'reikningur')      return { kind: 'reikningur', icon: '🧾', label: 'Reikningur',         sort: '2' };
    if (t === 'samningur')       return { kind: 'samningur',  icon: '📜', label: 'Þjónustusamningur',  sort: '3' };
    return { kind: 'reikningur', icon: '📎', label: 'Skjal', sort: '4' };
  }

  async function loadDocs(idty, body) {
    const sb = SB();
    const holder = body.querySelector('#_sch-docs');
    if (!sb || !holder) return;
    const curYear = new Date().getFullYear();
    const ktd = ktDigits(idty.kt);

    // Finna allar fyrirtækja-raðir kúnnans (kt getur átt margar staðsettningar).
    const coIds = [];
    const baseIds = [];
    if (idty.id && idty.source === 'fyrirtaeki') coIds.push(+idty.id);
    if (ktd.length === 10 && ktd !== '9999999999') {
      const d = ktDashed(ktd);
      const f = await sb.from('fyrirtaeki').select('id,customer_base_id')
        .in('kennitala', d !== ktd ? [ktd, d] : [ktd]).is('deleted_at', null);
      (f.data || []).forEach(r => {
        if (!coIds.includes(+r.id)) coIds.push(+r.id);
        if (r.customer_base_id != null && !baseIds.includes(r.customer_base_id)) baseIds.push(r.customer_base_id);
      });
    }
    if (!coIds.length && !baseIds.length) { holder.innerHTML = ''; return; }

    // 1) Drive-skráin (customer_documents)
    let docs = [];
    try {
      const ors = [];
      if (coIds.length) ors.push('fyrirtaeki_id.in.(' + coIds.join(',') + ')');
      if (baseIds.length) ors.push('customer_base_id.in.(' + baseIds.join(',') + ')');
      const r = await sb.from('customer_documents')
        .select('id,doc_type,year,drive_file_id,storage_path,invoice_number,doc_date,amount,fyrirtaeki_id')
        .or(ors.join(','))
        .in('doc_type', ['uttektarskyrsla', 'brunakerfi', 'reikningur', 'samningur']);
      // 2026-07-20: ÁÐUR var krafist `drive_file_id`, svo skjöl í Supabase Storage
      // OG reikningar sem eru aðeins skráning (nr./dags./upphæð úr kröfuyfirliti,
      // engin PDF-skrá) duttu alveg út. Hjá Center Hótel þýddi það að 21 af 22
      // reikningum sást ekki. Nú fylgja allir með; `_url` er tómt þegar engin skrá
      // er til og röðin birtist þá án „opna"-hnapps í stað þess að hverfa.
      docs = (r.data || []).map(x => {
        const drv = x.drive_file_id && String(x.drive_file_id).indexOf('sb:') !== 0 ? x.drive_file_id : null;
        return Object.assign({}, x, { _url: drv ? driveUrl(drv) : storageUrl(x.storage_path) });
      });
    } catch (_) {}

    // 2) Viðhengin (CompanyAttachments — sjálfvirku PDF-in úr patch 233 o.fl.)
    const atts = [];
    try {
      if (window.CompanyAttachments && CompanyAttachments.list) {
        coIds.forEach(id => (CompanyAttachments.list(id) || []).forEach(f => atts.push({ coId: id, f })));
      }
    } catch (_) {}

    // 3) Útfyllt skjöl úr Samningum (patch 94 „Vista í kerfi" → skjalasnidmat_filled)
    //    — samningar, prófunarskýrslur o.fl. matched á kt eða nafn (2026-07-10).
    let filled = [];
    try {
      const all = (window.DocTemplates && DocTemplates.listFilled && DocTemplates.listFilled()) || [];
      const nn = String(idty.nafn || '').trim().toLowerCase();
      filled = all.filter(r => {
        const rk = ktDigits(r.kennitala);
        if (ktd.length === 10 && ktd !== '9999999999' && rk === ktd) return true;
        return nn && String(r.customer || '').trim().toLowerCase() === nn;
      });
    } catch (_) {}
    const fillYear = r => { const d = new Date(r.created_at || r.updated_at || 0); return isNaN(d) ? '' : String(d.getFullYear()); };

    const attYear = a => { const y = a.f && a.f.year; if (y && y !== '0') return String(y); const m = String((a.f && a.f.name) || '').match(/\b(20[2-3][0-9])\b/); return m ? m[1] : ''; };
    const docKind = a => {
      const k = a.f && a.f.kind;
      if (k === 'brunakerfi') return 'brunakerfi';
      if (k === 'skyrsla' || k === 'reikningur' || k === 'samningur') return k;
      const n = String((a.f && a.f.name) || '').toLowerCase();
      if (/brunakerfi|brunaviðvörun|brunavidvorun/.test(n)) return 'brunakerfi';
      if (/samning/.test(n)) return 'samningur';
      if (/reikning|\br-?\d/.test(n)) return 'reikningur';
      if (/úttekt|uttekt|skýrsl|skyrsl/.test(n)) return 'skyrsla';
      return 'annad';
    };

    // Brunakerfis-skýrslan er vistuð TVISVAR (customer_documents + viðhengi, sjá
    // patch 273/199). Fellum viðhengis-afritið burt fyrir ár sem á kanóníska
    // customer_documents-röð svo skýrslan tvíbirtist ekki í listanum.
    const bkDocYears = new Set(docs.filter(x => x.doc_type === 'brunakerfi' && x._url).map(x => String(x.year || '')).filter(Boolean));
    const attsDedup = atts.filter(a => !(docKind(a) === 'brunakerfi' && bkDocYears.has(String(attYear(a) || ''))));

    // ── 📦 Bundle-pörun (skýrsla + reikningur per ár) ──────────────────────────
    // Sjálf-matcha lykillinn er `solur.source` (staðfest live): 'uttekt' → slökkvitæki-
    // úttektarskýrsla, 'brunakerfi' → brunakerfisskýrsla. Best-effort — stöðvar aldrei
    // skjala-listann þótt solur-lesturinn falli.
    const solBySrc = {}; // 'uttekt|2026' -> {id,num,samtals}
    try {
      const ktb = ktDigits(idty.kt);
      if (ktb.length === 10 && ktb !== '9999999999') {
        const sr = await sb.from('solur').select('id,num,source,samtals,created_at')
          .or('customer_kt.eq.' + ktb + ',customer_kt.eq.' + ktDashed(ktb))
          .in('source', ['uttekt', 'brunakerfi']).limit(400);
        (sr.data || []).forEach(s => {
          const y = String(s.created_at || '').slice(0, 4);
          const k = (s.source || '') + '|' + y;
          if (!solBySrc[k]) solBySrc[k] = s; // nýjasti/fyrsti per source|ár
        });
      }
    } catch (_) {}
    // Per ár: 🧯 (úttektarskýrsla + uttekt-reikningur) · 🔥 (brunakerfisskýrsla + brunakerfi-reikningur).
    const bundlesByYear = {};
    docs.forEach(d => {
      const y = String(d.year || ''); if (!y) return;
      if (d.doc_type === 'uttektarskyrsla') { (bundlesByYear[y] = bundlesByYear[y] || {}).skyrsla = { rep: d }; }
      else if (d.doc_type === 'brunakerfi') { (bundlesByYear[y] = bundlesByYear[y] || {}).brunakerfi = { rep: d }; }
    });
    // A kind can have an invoice but NO doc_type row of its own — e.g. one
    // physical úttektarskýrsla that covers both Úttekt AND Brunakerfi in the
    // same year (only ever filed once, as 'uttektarskyrsla'). Without this,
    // the whole brunakerfi row for that year never even appears in the band.
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
    // 2026-08-05 (verkefnalisti 94295522): fill in a still-missing report from
    // document_pairs — a persisted table that (among other things) records
    // when one physical report already satisfies BOTH kinds for the same year
    // (matched_by='shared_report'), which this purely doc_type-based grouping
    // can't know on its own. Best-effort: never blocks the rest of the modal.
    try {
      if (baseIds.length) {
        const dp = await sb.from('document_pairs')
          .select('year,service_type,report_doc_id,invoice_doc_id')
          .in('customer_base_id', baseIds)
          .or('report_doc_id.not.is.null,invoice_doc_id.not.is.null');
        (dp.data || []).forEach(row => {
          const key = row.service_type === 'brunakerfi' ? 'brunakerfi' : 'skyrsla';
          const y = String(row.year);
          const slot = (bundlesByYear[y] = bundlesByYear[y] || {})[key];
          if (!slot) return;
          if (!slot.rep && row.report_doc_id) {
            const repDoc = docs.find(d => d.id === row.report_doc_id);
            if (repDoc) slot.rep = repDoc;
          }
          // 2026-08-05 (Húsfélagið Engjasel 31 — R-000703 til staðar en bandið
          // sagði "vantar reikning"): solur-lyklunin (solBySrc, hér að ofan)
          // saknar sölu sem vantar customer_kt (sjá 165-visit-workflow.js fix
          // sama dag). document_pairs geymir invoice_doc_id beint á
          // customer_documents-röðina óháð solur — notum það sem varaleið
          // þegar solur-matchið brást. _fromDoc merkir uppruna svo render/
          // sendBundle viti að opna/senda beint úr skjalinu, ekki úr solur.
          if (!slot.inv && row.invoice_doc_id) {
            const invDoc = docs.find(d => d.id === row.invoice_doc_id);
            if (invDoc) slot.inv = { id: invDoc.id, num: invDoc.invoice_number, samtals: invDoc.amount, _url: invDoc._url, drive_file_id: invDoc.drive_file_id, _fromDoc: true };
          }
        });
      }
    } catch (_) {}
    // Combined-send: hakað val (skýrsla + reikningur) → venjulegi póst-glugginn (254).
    async function sendBundle(kind, year, b) {
      if (!(window.ReceiptSender && ReceiptSender.compose)) { if (window.Toast && Toast.show) Toast.show('Póstsending ekki tilbúin — endurhladdu síðunni.'); return; }
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
        // document_pairs fallback — no solur row, attach the file directly.
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
      if (!choices.length) { if (window.Toast && Toast.show) Toast.show('Engin skrá til að senda fyrir þetta par.'); return; }
      ReceiptSender.compose({
        title: 'Senda ' + (isBk ? 'brunakerfi' : 'úttekt') + ' ' + year + (idty.nafn ? ' — ' + idty.nafn : ''),
        to: await custEmail(idty),
        subject: (isBk ? 'Brunakerfisskýrsla' : 'Úttektarskýrsla') + ' + reikningur ' + year + ' — Slökkvitæki ehf',
        bodyText: ReceiptSender.standardText(isBk ? 'brunakerfi' : 'skyrsla', { nafn: idty.nafn || '', ar: year }),
        attachmentChoices: choices,
      });
    }

    // 2026-07-20: sýnum ÖLL ár strax. Sagan er megintilgangur gluggans og kúnnar
    // eins og Center Hótel eiga 55 skjöl frá 2022-2026 — árs-sían faldi þau öll
    // nema þess árs. „Sýna bara <ár>" er áfram til að þrengja.
    let showAll = true;
    function render() {
      const yStr = String(curYear);
      const d2 = showAll ? docs : docs.filter(x => String(x.year || '') === yStr);
      const a2 = showAll ? attsDedup : attsDedup.filter(a => attYear(a) === yStr);
      const f2 = showAll ? filled : filled.filter(r => fillYear(r) === yStr);
      const otherCount = (docs.length - docs.filter(x => String(x.year || '') === yStr).length)
                       + (attsDedup.length - attsDedup.filter(a => attYear(a) === yStr).length)
                       + (filled.length - filled.filter(r => fillYear(r) === yStr).length);
      const items = [];
      d2.forEach(x => {
        const tm = typeMeta(x.doc_type);
        const label = x.doc_type === 'reikningur'
          ? (x.invoice_number ? 'Reikningur ' + esc(x.invoice_number) : 'Reikningur')
          : tm.label;
        const fname = (x.doc_type === 'reikningur'
          ? 'Reikningur' + (x.invoice_number ? ' ' + x.invoice_number : '')
          : tm.label) + (x.year ? ' ' + x.year : '') + '.pdf';
        items.push({
          sort: tm.sort + (x.year || ''),
          html: docRow(tm.icon, label,
            (x.year || '') + (x.doc_date ? ' · ' + esc(fmtDate(x.doc_date)) : '') + (x.amount ? ' · ' + esc(fmtKr(x.amount)) : '') + (x._url ? '' : ' · aðeins skráning'),
            x._url ? '_sch-open' : '', x._url || '',
            x._url ? {
              kind: tm.kind,
              // Drive-skjöl fara sem driveId — /api/email-send sækir þau server-megin
              // (Drive-skrár eru aðgangsstýrðar; Resend kemst ekki í þær af slóð einni).
              driveId: (x.drive_file_id && String(x.drive_file_id).indexOf('sb:') !== 0) ? x.drive_file_id : '',
              url: (x.drive_file_id && String(x.drive_file_id).indexOf('sb:') !== 0) ? '' : x._url,
              filename: fname,
              ar: x.year || '', nr: x.invoice_number || '',
            } : null)
        });
      });
      a2.forEach(a => {
        const dk = docKind(a);
        const ICON = { skyrsla: '🧯', brunakerfi: '🔥', reikningur: '🧾', samningur: '📜' };
        const SORT = { skyrsla: '0', brunakerfi: '1', reikningur: '2', samningur: '3' };
        items.push({
          sort: (SORT[dk] || '4') + attYear(a),
          html: docRow(ICON[dk] || '📎',
            esc((a.f && a.f.name) || 'Skjal'), (attYear(a) || '') + ' · Viðhengi', '_sch-att', a.coId + '|' + ((a.f && a.f.path) || ''),
            {
              kind: (dk === 'annad') ? 'skyrsla' : dk,
              // Viðhengi liggja í `samningar`-bucketinu — slóðin er leyst við smell
              // gegnum CompanyAttachments.getPublicUrl (getur verið undirrituð slóð).
              att: (a.f && a.f.path) || '',
              filename: (a.f && a.f.name) || 'skjal.pdf', ar: attYear(a) || '',
            })
        });
      });
      f2.forEach(r => items.push({
        sort: '3' + fillYear(r),
        html: docRow('📑', esc(r.name || r.template_name || 'Skjal'),
          fillYear(r) + ' · Útfyllt skjal (Samningar)', '_sch-fill', r.id)
      }));
      items.sort((x, y) => x.sort.localeCompare(y.sort));

      // 📦 Bundle-band — skýrsla + reikningur per ári með einum „📧 Senda"-hnappi
      // (sendir BÆÐI í einu). Sjálf-matchar á solur.source ('uttekt'/'brunakerfi');
      // nýjasta ár efst svo það sem kúnnar spyrja um sé fremst.
      let bundleBandHtml = '';
      {
        const byYs = Object.keys(bundlesByYear).filter(y => showAll || y === yStr).sort((a, b) => b.localeCompare(a));
        const brows = [];
        byYs.forEach(y => {
          [['skyrsla', '🧯', 'Úttekt'], ['brunakerfi', '🔥', 'Brunakerfi']].forEach(pair => {
            const k = pair[0], b = bundlesByYear[y][k]; if (!b) return;
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
            if (hasRep) bt += btn('_scb-rep', 'data-v="' + esc(b.rep._url) + '"', '#fff', '#bfdbfe', '#1d4ed8', '📄 Skýrsla');
            // 2026-08-05: fallback-invoice úr document_pairs (_fromDoc) hefur enga
            // solur-röð til að opna með openInvoice() — opna skjalið sjálft í
            // staðinn (sama leið og _scb-rep), og bara ef það á sér skrá í raun.
            if (inv && inv._fromDoc && inv._url) bt += btn('_scb-inv-doc', 'data-v="' + esc(inv._url) + '"', '#fff', '#ddd6fe', '#7c3aed', '🧾 Reikningur');
            else if (inv && !inv._fromDoc) bt += btn('_scb-inv', 'data-v="' + esc(String(inv.id)) + '"', '#fff', '#ddd6fe', '#7c3aed', '🧾 Reikningur');
            if (hasRep || inv) bt += btn('_scb-send', 'data-kind="' + k + '" data-year="' + y + '"', 'linear-gradient(180deg,#16a34a,#15803d)', '#15803d', '#fff', '📧 Senda');
            brows.push('<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-bottom:1px solid #f1f5f9">' +
              '<span style="font-size:17px">' + pair[1] + '</span>' +
              '<div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:700;color:#0f172a">' + pair[2] + ' ' + y + '</div>' +
              '<div style="font-size:10.5px;color:#94a3b8">' + st + '</div></div>' + bt + '</div>');
          });
        });
        if (brows.length) bundleBandHtml =
          '<div style="font-size:12px;font-weight:700;color:#0f172a;margin:16px 0 8px">📦 Pör — skýrsla + reikningur ' +
            '<span style="font-weight:500;color:#94a3b8">(sendu bæði í einu)</span></div>' +
          '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">' + brows.join('') + '</div>';
      }

      holder.innerHTML =
        bundleBandHtml +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin:16px 0 8px">' +
          '<div style="font-size:12px;font-weight:700;color:#0f172a">📄 Skjöl ' + (showAll ? '(öll ár)' : yStr) + ' — úttektarskýrslur & reikningar</div>' +
          (otherCount > 0 || showAll ? '<button id="_sch-yrs" type="button" style="background:none;border:none;color:#1d4ed8;font-size:11.5px;cursor:pointer;text-decoration:underline;padding:0">' + (showAll ? 'Sýna bara ' + yStr : 'Sýna öll ár (+' + otherCount + ')') + '</button>' : '') +
        '</div>' +
        (items.length
          ? '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden">' + items.map(i => i.html).join('') + '</div>'
          : '<div style="background:#fff;border:1px dashed #e2e8f0;border-radius:10px;padding:16px;text-align:center;color:#94a3b8;font-size:12px;font-style:italic">Engin skjöl skráð fyrir ' + yStr + '.</div>');
      holder.querySelector('#_sch-yrs')?.addEventListener('click', () => { showAll = !showAll; render(); });
      // 📦 Bundle-band aðgerðir: 📄 Skýrsla (opna) · 🧾 Reikningur (opna) · 📧 Senda (bæði).
      holder.querySelectorAll('._scb-rep').forEach(b => b.addEventListener('click', () => {
        const u = b.dataset.v; if (!u) return;
        const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
      }));
      holder.querySelectorAll('._scb-inv').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.v) openInvoice(b.dataset.v);
      }));
      // _fromDoc fallback invoice — no solur row to render from, open the
      // linked file directly (same as _scb-rep).
      holder.querySelectorAll('._scb-inv-doc').forEach(b => b.addEventListener('click', () => {
        const u = b.dataset.v; if (!u) return;
        const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
      }));
      holder.querySelectorAll('._scb-send').forEach(b => b.addEventListener('click', () => {
        const yb = bundlesByYear[b.dataset.year];
        if (yb && yb[b.dataset.kind]) sendBundle(b.dataset.kind, b.dataset.year, yb[b.dataset.kind]);
      }));
      // data-v ber nú FULLA slóð (Drive eða Supabase Storage) — sjá _url hér að ofan.
      // Anchor-smellur í stað window.open: window.open('noopener') er stundum
      // þöglað niður af popup-vörnum (þá „gerðist ekkert" við Opna-smell).
      holder.querySelectorAll('._sch-open').forEach(b => b.addEventListener('click', () => {
        const u = b.dataset.v; if (!u) return;
        const a = document.createElement('a');
        a.href = u; a.target = '_blank'; a.rel = 'noopener';
        document.body.appendChild(a); a.click(); a.remove();
      }));
      holder.querySelectorAll('._sch-att').forEach(b => b.addEventListener('click', () => {
        const [coId, path] = String(b.dataset.v).split('|');
        const f = ((window.CompanyAttachments && CompanyAttachments.list && CompanyAttachments.list(coId)) || []).find(x => x.path === path);
        if (f && window.CompanyAttachments.openPreview) CompanyAttachments.openPreview(f);
      }));
      holder.querySelectorAll('._sch-fill').forEach(b => b.addEventListener('click', () => {
        if (window.DocTemplates && DocTemplates.openFilled) DocTemplates.openFilled(b.dataset.v);
      }));
      // 📧 Senda skjal — opnar ritilinn (patch 254) með stöðluðum texta sem má breyta.
      holder.querySelectorAll('._sch-mail').forEach(b => b.addEventListener('click', async () => {
        if (!window.ReceiptSender || !ReceiptSender.sendDoc) {
          if (window.Toast && Toast.show) Toast.show('Póstsending ekki tilbúin — endurhladdu síðunni.');
          return;
        }
        let m; try { m = JSON.parse(b.dataset.m || '{}'); } catch (_) { return; }
        b.disabled = true;
        try {
          // Viðhengi úr `samningar`-bucketinu: slóðin er leyst hér (getur verið
          // undirrituð og því tímabundin — sótt rétt fyrir sendingu).
          if (m.att && !m.url) {
            m.url = (window.CompanyAttachments && CompanyAttachments.getPublicUrl)
              ? await CompanyAttachments.getPublicUrl(m.att) : '';
          }
          await ReceiptSender.sendDoc(Object.assign({}, m, {
            nafn: idty.nafn || '', to: await custEmail(idty),
          }));
        } finally { b.disabled = false; }
      }));
    }
    // `mail` = JSON-lýsing á viðhenginu fyrir 📧-takkann (sjá _sch-mail hér að ofan).
    // Sleppt þegar engin skrá er að baki — þá er ekkert að senda.
    function docRow(icon, label, sub, cls, val, mail) {
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #f1f5f9">' +
        '<span style="font-size:16px">' + icon + '</span>' +
        '<div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + label + '</div>' +
        '<div style="font-size:10.5px;color:#94a3b8">' + sub + '</div></div>' +
        // Enginn „Opna"-hnappur þegar engin skrá er að baki (t.d. reikningur sem er
        // aðeins skráning úr kröfuyfirliti) — betra en hnappur sem gerir ekkert.
        (cls
          ? '<button class="' + cls + '" data-v="' + esc(String(val)) + '" type="button" style="padding:4px 10px;background:#fff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;white-space:nowrap">Opna</button>' +
            (mail ? '<button class="_sch-mail" data-m="' + esc(JSON.stringify(mail)) + '" type="button" title="Senda í tölvupósti" style="padding:4px 9px;background:#fff;color:#0f766e;border:1px solid #99f6e4;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;white-space:nowrap">📧 Senda</button>' : '')
          : '<span style="font-size:10.5px;color:#cbd5e1;white-space:nowrap">engin skrá</span>') +
      '</div>';
    }
    render();
  }

  function rowHtml(s, paired) {
    const isCredit = !!s.is_credit;
    const isInvoice = (s.greitt_med === 'greitt_sidar' || s.greitt_med === 'reikningur');
    // 4-þrepa staða (2026-08-14, staðfest villa R-000232): paid_at EITT dugar
    // ekki — void/drog sala sýndist „Ógreitt" og taldist með í skuld.
    // Röðin: Greitt → Bakfært (void) → Drög → Ógreitt.
    const isVoid = String(s.status || '') === 'void';
    const isDrog = String(s.status || '') === 'drog';
    const status = isCredit
      ? '<span style="color:#991b1b;font-size:11px">↩ Kredit' + (s.kredit_a ? ' á ' + esc(s.kredit_a) : '') + '</span>'
      : s.paid_at ? '<span style="font-size:10px;font-weight:700;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:99px">✓ Greitt</span>'
      : isVoid ? '<span style="font-size:10px;font-weight:700;background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:99px">↩ Bakfært</span>'
      : isDrog ? '<span style="font-size:10px;font-weight:700;background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:99px">✎ Drög</span>'
      : isInvoice ? '<span style="font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px">⚠ Ógreitt</span>'
      : '<span style="color:#94a3b8;font-size:11px">—</span>';
    const amt = isCredit ? '-' + fmtKr(Math.abs(+s.samtals || 0)) : fmtKr(+s.samtals || 0);
    const amtExtra = (isVoid && !s.paid_at && !isCredit) ? ';text-decoration:line-through;color:#94a3b8' : '';
    // Viðskiptategund (Pakki 7): 🧯 úttekt · 🛒 búð · ❓ óvíst — merkið sýnir
    // strax hvort færslan tilheyrir árlegu úttektinni eða lausasölu.
    const vt = s.vidskiptategund === 'uttekt' ? 'uttekt' : (s.vidskiptategund === 'bud' ? 'bud' : 'ovisst');
    const vtBadge = vt === 'uttekt' ? '<span title="Árleg úttekt" style="margin-left:5px">🧯</span>'
      : vt === 'bud' ? '<span title="Búðarsala / lausasala" style="margin-left:5px">🛒</span>'
      : '<span title="Óvíst — hvorki greint sem úttekt né búð (þarf yfirferð)" style="margin-left:5px">❓</span>';
    return '<tr data-vt="' + vt + '" style="border-bottom:1px solid #f1f5f9' +
      (((isVoid && !s.paid_at) || isDrog) ? ';opacity:.6' : '') + (paired ? ';background:#fafbfc' : '') + '">' +
      '<td style="padding:8px 10px;color:#475569;white-space:nowrap">' + (paired ? '<span style="color:#cbd5e1;margin-right:3px">↳</span>' : '') + esc(fmtDate(s.created_at)) + '</td>' +
      '<td style="padding:8px 10px;font-family:monospace;font-size:11.5px;font-weight:600;color:#0f172a">' + esc(s.num || '') + vtBadge +
        (s._pd_number ? '<span title="Payday-númerið sem kúnninn sér á kröfunni" style="display:inline-block;margin-left:6px;padding:1px 6px;background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;border-radius:99px;font-size:10px;font-weight:700">PD ' + esc(s._pd_number) + '</span>' : '') +
      '</td>' +
      '<td style="padding:8px 10px;font-size:11.5px;color:#475569">' + methodLabel(s.greitt_med) + '</td>' +
      '<td style="padding:8px 10px">' + status + '</td>' +
      '<td style="padding:8px 10px;text-align:right;font-weight:700;color:' + (isCredit ? '#dc2626' : '#0f172a') + ';font-variant-numeric:tabular-nums' + amtExtra + '">' + esc(amt) + '</td>' +
      '<td style="padding:8px 10px;text-align:right;white-space:nowrap">' +
        '<button class="_sch-send" data-id="' + s.id + '" type="button" title="Senda kvittun í tölvupósti" style="padding:4px 8px;background:#fff;color:#0f766e;border:1px solid #99f6e4;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;margin-right:4px">📧</button>' +
        '<button class="_sch-view" data-id="' + s.id + '" type="button" title="Skoða / prenta / vista PDF" style="padding:4px 8px;background:#fff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;font:inherit;font-size:11px">🖨</button>' +
      '</td>' +
    '</tr>';
  }

  // Payday-krafa án solur-raðar (stofnuð beint í Payday) — sýnd með PAYDAY-
  // númerinu sem kúnninn nefnir í síma. Engin PDF-aðgerð hér (skjalið býr í
  // Payday); tooltip ber tilvísun/lýsingu ef til.
  function pdRowHtml(p) {
    const st = String(p.status || '').toUpperCase();
    const status = /PAID/.test(st) || p.paid_date
        ? '<span style="font-size:10px;font-weight:700;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:99px">✓ Greitt</span>'
      : /CREDIT/.test(st) ? '<span style="color:#991b1b;font-size:11px">↩ Kredit</span>'
      : /CANCEL/.test(st) ? '<span style="font-size:10px;font-weight:700;background:#f1f5f9;color:#64748b;padding:2px 8px;border-radius:99px">Ógilt</span>'
      : /DRAFT|DRÖG/.test(st) ? '<span style="font-size:10px;font-weight:700;background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:99px">Drög</span>'
      : '<span style="font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:99px">⚠ Ógreitt</span>';
    const amt = +p.amount_total || 0;
    const tip = [p.reference, p.description].filter(Boolean).join(' · ');
    return '<tr style="border-bottom:1px solid #f1f5f9;background:#fdfcff"' + (tip ? ' title="' + esc(tip) + '"' : '') + '>' +
      '<td style="padding:8px 10px;color:#475569;white-space:nowrap">' + esc(fmtDate(p.created_date)) + '</td>' +
      '<td style="padding:8px 10px;font-family:monospace;font-size:11.5px;font-weight:600;color:#6d28d9">PD ' + esc(p.number || p.payday_id || '') +
        '<span style="display:inline-block;margin-left:6px;padding:1px 6px;background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;border-radius:99px;font-size:10px;font-weight:700">Payday</span></td>' +
      '<td style="padding:8px 10px;font-size:11.5px;color:#475569">🏦 Payday-krafa' + (p.due_date ? ' · gjd. ' + esc(fmtDate(p.due_date)) : '') + '</td>' +
      '<td style="padding:8px 10px">' + status + '</td>' +
      '<td style="padding:8px 10px;text-align:right;font-weight:700;color:' + (amt < 0 ? '#dc2626' : '#0f172a') + ';font-variant-numeric:tabular-nums">' + esc(fmtKr(amt)) + '</td>' +
      '<td style="padding:8px 10px"></td>' +
    '</tr>';
  }

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

  // 2026-07-20: `catch (_) {}` hér faldi ÖLL vandamál — sendingin datt þegjandi í
  // gegn og notandinn fékk „ekki tengt enn"-skilaboð þótt hún hefði bara klikkað.
  // Villan er nú sýnd; reikningurinn opnast aðeins þegar ritillinn er alls ekki til.
  async function sendReceipt(saleId) {
    if (window.ReceiptSender && typeof window.ReceiptSender.send === 'function') {
      try { await window.ReceiptSender.send(saleId); }
      catch (e) { if (window.Toast && Toast.show) Toast.show('Póstsending mistókst: ' + ((e && e.message) || e)); }
      return;
    }
    if (window.Toast && Toast.show) Toast.show('📧 Póst-ritillinn hlóðst ekki — opna reikninginn til að prenta eða vista sem PDF.');
    openInvoice(saleId);
  }

  setInterval(ensureButton, 700);
  setTimeout(ensureButton, 800);
  window.SalaCustomerHistory = { open, urlFor, queryFor };
  console.log('[patch-253] Sala customer-history v2 installed');
})();
/* === END SALA CUSTOMER HISTORY === */
