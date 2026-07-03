/* === REIKNINGA-PÓSTUR — invoice email helper v1 =============================
 *
 * Sjálfstæð síða (view `view-reikninga-postur`, slug `#reikninga-postur`/`#postur`)
 * sem les póst-hólfið eldklar@eldklar.is (+ bokhald@eldklar.is) BEINT úr `email_digest`
 * (sama Supabase og appið notar — engin ný tenging) og TENGIR hvern póst við
 * kúnna/reikning svo hægt sé að finna „hver spurði um hvaða reikning" á einum stað.
 *
 * Tenging (áreiðanlegust fyrst):
 *   1) R-númer í efni/texta → sala (solur.num) → kúnninn hennar.
 *   2) sendandi-netfang → kúnni (fyrirtaeki/customers_base/vidskiptavinir.netfang).
 *   3) kennitala í texta → kúnni.
 *
 * Flokkun:
 *   • „📥 Til að svara"  = innhólf (ekki frá Payday/kerfispóstum) — það sem þarf svar.
 *   • „🧾 Sendir reikningar" = afrit reikninga sem VIÐ sendum (delivery@payday.is).
 *   • „Allt" = allt.
 *
 * Aðgerðir per póst:
 *   • Opna / Saga           — opna kúnna eða hreyfingarlista (read).
 *   • ✉️ Senda              — velja reikning kúnnans, teikna PDF (patch 233
 *                             UttektInvoicePdf) og senda gegnum /api/email-send
 *                             (Resend) á hvaða netfang sem er.
 *   • ✏️ Breyta             — opna reikninginn í sölu-ritli (patch 142 SaleEditor).
 *   • 🤖 Svar               — Claude semur íslenskt uppkast að svari
 *                             (/api/postur-reply, Haiku) sem má yfirfara + senda.
 * Public API: window.ReikningaPostur = { open, reload }.
 * ========================================================================== */
(() => {
  if (window.__reikningaPosturInstalled) return;
  window.__reikningaPosturInstalled = true;

  const VIEW_ID = 'view-reikninga-postur';
  const NAV_KEY = 'reikninga-postur';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function ktDigits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function ktDashed(d) { d = ktDigits(d); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : d; }
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'];
  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return '';
    return d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function relDay(iso) {
    if (!iso) return '';
    const d = new Date(iso); if (isNaN(d)) return '';
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 0) return 'Í dag';
    if (days === 1) return 'Í gær';
    if (days < 7) return days + ' d.';
    return fmtDate(iso);
  }

  const state = {
    emails: [], loaded: false, loading: false, err: null,
    filter: 'inbox', search: '',
    custByEmail: {}, custByKt: {}, saleByNum: {},
    hidden: new Set(),   // message_ids the user has deleted/hidden (Supabase-synced)
  };

  const PAYDAY_RE = /payday\.is/i;
  const NOREPLY_RE = /no[-_.]?reply|do[-_.]?not[-_.]?reply|noreply|donotreply|automated|mailer-daemon/i;
  const SYSTEM_RE = /(rsk\.is|microsoft\.com|accountprotection|google\.com|cloudflare|unimaze\.com|facebook|linkedin|apple\.com|paypal|stripe)/i;

  // ── data ──────────────────────────────────────────────────────────────────
  async function load(retry) {
    const SB = getSB();
    if (!SB) {
      // DB client may not be ready yet on a cold deep-link — wait + retry
      // (up to ~10s) instead of showing a bogus "no connection" empty state.
      if ((retry || 0) < 20) { state.loading = true; render(); setTimeout(() => load((retry || 0) + 1), 500); return; }
      state.err = 'Engin gagnabankatenging.'; render(); return;
    }
    state.loading = true; render();
    try {
      const [em, fy, cb, vd, sl, hd] = await Promise.all([
        SB.from('email_digest')
          .select('message_id,account,sender_name,sender_email,to_addresses,subject,snippet,body_preview,is_question,has_attachment,attachment_names,received_at')
          .in('account', ['eldklar@eldklar.is', 'bokhald@eldklar.is'])
          .order('received_at', { ascending: false })
          .limit(600),
        SB.from('fyrirtaeki').select('id,nafn,kennitala,netfang').not('netfang', 'is', null),
        SB.from('customers_base').select('id,nafn,kennitala,netfang').not('netfang', 'is', null),
        SB.from('vidskiptavinir').select('id,nafn,kennitala,netfang').not('netfang', 'is', null),
        SB.from('solur').select('id,num,customer_nafn,customer_kt,samtals,created_at,greitt_med,paid_at').order('created_at', { ascending: false }).limit(2500),
        SB.from('reikninga_postur_hidden').select('message_id'),
      ]);
      if (em.error) throw em.error;
      state.hidden = new Set(((hd && hd.data) || []).map(r => r.message_id));

      const emailMap = {}, byKt = {};
      const addCust = (res, isCompany) => (res && res.data || []).forEach(r => {
        const rec = { name: r.nafn, kt: r.kennitala, coId: isCompany ? r.id : null };
        const e = String(r.netfang || '').trim().toLowerCase();
        if (e) (emailMap[e] = emailMap[e] || []).push(rec);
        const k = ktDigits(r.kennitala);
        if (k.length === 10 && !byKt[k]) byKt[k] = rec;   // kt er einkvæmt
      });
      // fyrirtaeki first so coId (openable company page) wins.
      addCust(fy, true); addCust(cb, false); addCust(vd, false);
      // Netfang telst aðeins gild tenging ef það vísar á EINN kúnna. Deildar
      // umboðsmanna-tölvupóstar (t.d. gjaldkeri@eignaumsjon.is fyrir mörg
      // húsfélög) eru margræðir → sleppt (kt í efni ræður þá).
      const byEmail = {};
      Object.keys(emailMap).forEach(e => {
        const kts = new Set(emailMap[e].map(r => ktDigits(r.kt)).filter(Boolean));
        if (kts.size <= 1) byEmail[e] = emailMap[e][0];
      });
      state.custByEmail = byEmail; state.custByKt = byKt;

      const saleByNum = {};
      (sl.data || []).forEach(s => { if (s.num) saleByNum[String(s.num).toUpperCase()] = s; });
      state.saleByNum = saleByNum;

      state.emails = (em.data || []).map(classify);
      state.loaded = true; state.err = null;
    } catch (e) { state.err = String((e && e.message) || e); }
    state.loading = false; render();
  }

  function classify(m) {
    const from = String(m.sender_email || '').toLowerCase();
    const hay = ((m.subject || '') + ' ' + (m.body_preview || '') + ' ' + (m.snippet || '')).toUpperCase();
    const isPayday = PAYDAY_RE.test(from);
    const isSystem = NOREPLY_RE.test(from) || SYSTEM_RE.test(from);

    // Tengja — áreiðanlegast fyrst. NB R-númer er SÍÐAST því flökku-R-númer í
    // texta/undirskrift getur bent á rangan kúnna; sendandi-netfang og kt í efni
    // eru miklu áreiðanlegri. kt/netfang tengja aðeins við RAUNverulega kúnna.
    let cust = null, matchBy = null, sale = null;
    // 1) kennitala í efni/texta → kúnni (sértækasta merki; slær deildum umboðs-
    //    netföngum við, t.d. Eignaumsjón sem sendir fyrir mörg húsfélög).
    {
      const km = hay.match(/\b(\d{6})-?(\d{4})\b/);
      if (km) { const k = km[1] + km[2]; if (state.custByKt[k]) { cust = state.custByKt[k]; matchBy = 'kennitala'; } }
    }
    // 2) sendandi-netfang → kúnni (aðeins einkvæm netföng, sjá byEmail-síuna)
    if (!cust && state.custByEmail[from]) { cust = state.custByEmail[from]; matchBy = 'netfang'; }
    // 3) R-númer → sala → kúnni (fallback)
    if (!cust) {
      const rm = hay.match(/R-0\d{5}/);
      if (rm) {
        const s = state.saleByNum[rm[0]];
        if (s) {
          sale = s;
          const k = ktDigits(s.customer_kt);
          cust = (k && state.custByKt[k]) || { name: s.customer_nafn, kt: s.customer_kt, coId: null };
          matchBy = 'reikningur';
        }
      }
    }

    const category = isPayday ? 'sent' : 'inbox';
    return { ...m, from, isPayday, isSystem, sale, cust, matchBy, category };
  }

  // ── styles (self-contained, #view-scoped so patch-245 can't override) ──────
  function styles() {
    if (document.getElementById('_rp-styles')) return;
    const V = '#' + VIEW_ID + ' ';
    const css = [
      V + '{padding:0 !important;max-width:none !important;background:linear-gradient(180deg,#060607 0px,#060607 220px,#8e949e 640px,#9198a3 100%) !important;min-height:100vh;font-family:"Space Grotesk",system-ui,sans-serif}',
      V + '.rp-main{max-width:none;margin:0;padding:16px 22px 48px;box-sizing:border-box}',
      V + '.rp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:14px}',
      V + '.rp-title h1{margin:0;font-size:26px;font-weight:700;color:#fff;letter-spacing:-.01em}',
      V + '.rp-title p{margin:3px 0 0;font-size:12.5px;color:rgba(255,255,255,.6)}',
      V + '.rp-reload{height:38px;padding:0 14px;border:1px solid rgba(255,255,255,.18);border-radius:10px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font:inherit;font-size:13px}',
      V + '.rp-tools{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px}',
      V + '.rp-chip{font:inherit;font-size:12.5px;font-weight:600;padding:7px 14px;border-radius:20px;border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fdfdfe,#e3e7ee);color:#3a4250;cursor:pointer}',
      V + '.rp-chip.on{border-color:#0a0b0d;background:linear-gradient(145deg,#08080a,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709);color:#fff}',
      V + '.rp-chip .n{opacity:.65;font-weight:500;margin-left:2px}',
      V + '.rp-search{position:relative;margin-left:auto;min-width:240px;flex:1;max-width:420px}',
      V + '.rp-search input{width:100%;height:38px;padding:0 12px 0 34px;border-radius:11px;border:1px solid rgba(255,255,255,.28) !important;background:rgba(255,255,255,.12) !important;color:#fff !important;font:inherit;font-size:13.5px;outline:none;box-sizing:border-box}',
      V + '.rp-search input::placeholder{color:rgba(255,255,255,.6)}',
      V + '.rp-search svg{position:absolute;left:11px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:rgba(255,255,255,.7)}',
      V + '.rp-list{display:flex;flex-direction:column;gap:9px}',
      V + '.rp-card{background:#fff !important;border:1px solid rgba(20,24,34,.08) !important;border-left:3px solid #cbd5e1 !important;border-radius:13px;box-shadow:0 8px 22px -16px rgba(25,35,60,.22);padding:11px 15px;display:flex;align-items:center;gap:14px}',
      V + '.rp-card.q{border-left-color:#f59e0b !important}',
      V + '.rp-card.matched{border-left-color:#2f5fe0 !important}',
      V + '.rp-when{flex:none;width:70px;text-align:center;color:#64748b;font-size:11.5px;font-family:"Space Mono",monospace}',
      V + '.rp-when b{display:block;color:#11141c;font-size:12.5px}',
      V + '.rp-mid{flex:1;min-width:0}',
      V + '.rp-from{font-size:13.5px;font-weight:700;color:#11141c;display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      V + '.rp-from .em{font-weight:400;color:#94a3b8;font-family:"Space Mono",monospace;font-size:11.5px}',
      V + '.rp-subj{font-size:12.5px;color:#3a4250;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      V + '.rp-snip{font-size:11.5px;color:#94a3b8;margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      V + '.rp-badge{font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:6px;white-space:nowrap}',
      V + '.rp-badge.q{color:#b45309;background:#fffbeb;border:1px solid #fde68a}',
      V + '.rp-badge.att{color:#475569;background:#f1f5f9;border:1px solid #e2e8f0}',
      V + '.rp-badge.pay{color:#2f5fe0;background:#eef3ff;border:1px solid #c6d6ff}',
      V + '.rp-right{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:6px;min-width:150px}',
      V + '.rp-cust{max-width:230px;text-align:right;font-size:12.5px;font-weight:700;color:#1d4ed8;text-decoration:none;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block}',
      V + '.rp-cust .by{display:block;font-weight:500;color:#94a3b8;font-size:10.5px}',
      V + '.rp-nomatch{font-size:11.5px;color:#cbd2dc;font-style:italic}',
      V + '.rp-acts{display:flex;gap:6px}',
      V + '.rp-btn{font:inherit;font-size:11.5px;font-weight:600;padding:5px 11px;border-radius:8px;border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fff,#eef1f6);color:#3a4250;cursor:pointer;white-space:nowrap}',
      V + '.rp-btn:hover{background:#eef3ff;color:#1d4ed8;border-color:#c6d6ff}',
      V + '.rp-btn.del{padding:5px 9px}',
      V + '.rp-btn.del:hover{background:#fef2f2;color:#dc2626;border-color:#fecaca}',
      V + '.rp-empty{padding:44px;text-align:center;color:#64748b;background:rgba(255,255,255,.75);border-radius:14px}',
      V + '.rp-err{padding:20px;color:#fecaca;background:#450a0a;border:1px solid #7f1d1d;border-radius:12px}',
      V + '.rp-btn.prim{background:linear-gradient(180deg,#3b82f6,#1d4ed8);color:#fff;border-color:#1d4ed8}',
      V + '.rp-btn.prim:hover{background:linear-gradient(180deg,#2563eb,#1e40af);color:#fff}',
      V + '.rp-btn.ai{background:linear-gradient(180deg,#fff,#f3e8ff);color:#7c3aed;border-color:#ddd6fe}',
      V + '.rp-btn.ai:hover{background:#f5f0ff;color:#6d28d9;border-color:#c4b5fd}',
      // ── modal (appended to body — outside .view so patch-245 can't touch it) ──
      '#_rp-modal{position:fixed;inset:0;z-index:100050;display:flex;align-items:center;justify-content:center;font-family:"Space Grotesk",system-ui,sans-serif}',
      '#_rp-modal .rpm-back{position:absolute;inset:0;background:rgba(6,7,10,.62);backdrop-filter:blur(2px)}',
      '#_rp-modal .rpm-card{position:relative;background:#fff;border-radius:16px;box-shadow:0 30px 80px -20px rgba(0,0,0,.6);width:min(560px,calc(100vw - 24px));max-height:calc(100vh - 40px);display:flex;flex-direction:column;overflow:hidden}',
      '#_rp-modal .rpm-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 20px;border-bottom:1px solid #eef1f6}',
      '#_rp-modal .rpm-head h3{margin:0;font-size:16px;font-weight:700;color:#11141c}',
      '#_rp-modal .rpm-head .sub{font-size:11.5px;color:#94a3b8;font-weight:500;margin-top:1px}',
      '#_rp-modal .rpm-x{background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer;padding:2px 8px;border-radius:8px;line-height:1}',
      '#_rp-modal .rpm-x:hover{background:#f1f5f9;color:#334155}',
      '#_rp-modal .rpm-body{padding:18px 20px;overflow:auto}',
      '#_rp-modal .rpm-lbl{display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin:0 0 5px}',
      '#_rp-modal .rpm-row{margin-bottom:14px}',
      '#_rp-modal input[type=email],#_rp-modal input[type=text],#_rp-modal textarea{width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:9px;font:inherit;font-size:13.5px;color:#11141c;box-sizing:border-box;background:#fff}',
      '#_rp-modal input:focus,#_rp-modal textarea:focus{outline:none;border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12)}',
      '#_rp-modal textarea{resize:vertical;min-height:150px;line-height:1.5}',
      '#_rp-modal textarea.reply{min-height:230px;font-size:13.5px}',
      '#_rp-modal .rpm-invs{display:flex;flex-direction:column;gap:6px;max-height:210px;overflow:auto;border:1px solid #eef1f6;border-radius:10px;padding:7px}',
      '#_rp-modal .rpm-inv{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer;border:1px solid transparent}',
      '#_rp-modal .rpm-inv:hover{background:#f8fafc}',
      '#_rp-modal .rpm-inv.sel{background:#eef3ff;border-color:#c6d6ff}',
      '#_rp-modal .rpm-inv input{width:auto;flex:none}',
      '#_rp-modal .rpm-inv .n{font-weight:700;color:#11141c;font-size:13px}',
      '#_rp-modal .rpm-inv .meta{font-size:11.5px;color:#64748b;margin-left:auto;text-align:right}',
      '#_rp-modal .rpm-inv .paid{color:#059669;font-weight:700}',
      '#_rp-modal .rpm-src{font-size:11.5px;color:#475569;background:#f8fafc;border:1px solid #eef1f6;border-radius:9px;padding:10px 12px;line-height:1.5;max-height:120px;overflow:auto}',
      '#_rp-modal .rpm-summary{font-size:13px;color:#11141c;background:#eff6ff;border:1px solid #bfdbfe;border-radius:9px;padding:9px 12px;line-height:1.45}',
      '#_rp-modal .rpm-docs{display:flex;flex-direction:column;gap:6px}',
      '#_rp-modal .rpm-doc{display:flex;align-items:center;gap:10px;padding:7px 10px;border:1px solid #eef1f6;border-radius:9px;background:#fff}',
      '#_rp-modal .rpm-doc.match{background:#fffbeb;border-color:#fde68a}',
      '#_rp-modal .rpm-doc .n{font-weight:700;color:#11141c;font-size:13px}',
      '#_rp-modal .rpm-doc .meta{font-size:11.5px;color:#64748b;margin-left:auto}',
      '#_rp-modal .rpm-doc-send{font:inherit;font-size:11.5px;font-weight:600;padding:5px 10px;border-radius:8px;border:1px solid #c6d6ff;background:linear-gradient(180deg,#eff3ff,#dbe6ff);color:#1d4ed8;cursor:pointer;white-space:nowrap}',
      '#_rp-modal .rpm-doc-send:hover{background:#dbe6ff}',
      '#_rp-modal .rpm-doc-send.sent{background:#ecfdf5;border-color:#a7f3d0;color:#059669}',
      '#_rp-modal .rpm-src b{color:#11141c}',
      '#_rp-modal .rpm-note{font-size:12px;color:#94a3b8;margin:-6px 0 12px}',
      '#_rp-modal .rpm-ai-tip{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}',
      '#_rp-modal .rpm-ai-tip button{font:inherit;font-size:11.5px;padding:5px 10px;border-radius:16px;border:1px solid #ddd6fe;background:#f5f0ff;color:#7c3aed;cursor:pointer}',
      '#_rp-modal .rpm-ai-tip button:hover{background:#ede4ff}',
      '#_rp-modal .rpm-foot{display:flex;align-items:center;gap:9px;justify-content:flex-end;padding:13px 20px;border-top:1px solid #eef1f6;flex-wrap:wrap}',
      '#_rp-modal .rpm-foot .spacer{margin-right:auto}',
      '#_rp-modal .rpm-btn{font:inherit;font-size:13px;font-weight:600;padding:9px 16px;border-radius:9px;border:1px solid #cbd5e1;background:#fff;color:#475569;cursor:pointer}',
      '#_rp-modal .rpm-btn:hover{background:#f8fafc}',
      '#_rp-modal .rpm-btn.prim{background:linear-gradient(180deg,#3b82f6,#1d4ed8);color:#fff;border:none}',
      '#_rp-modal .rpm-btn.prim:hover{background:linear-gradient(180deg,#2563eb,#1e40af)}',
      '#_rp-modal .rpm-btn.ai{background:linear-gradient(180deg,#8b5cf6,#6d28d9);color:#fff;border:none}',
      '#_rp-modal .rpm-btn.ai:hover{background:linear-gradient(180deg,#7c3aed,#5b21b6)}',
      '#_rp-modal .rpm-btn:disabled{opacity:.55;cursor:not-allowed}',
      '#_rp-modal .rpm-msg{font-size:12.5px;font-weight:600}',
      '#_rp-modal .rpm-msg.ok{color:#059669}',
      '#_rp-modal .rpm-msg.bad{color:#dc2626}',
      '#_rp-modal .rpm-load{padding:34px;text-align:center;color:#64748b;font-size:13px}',
    ].join('');
    const tag = document.createElement('style');
    tag.id = '_rp-styles'; tag.textContent = css;
    document.head.appendChild(tag);
  }

  // ── render ──────────────────────────────────────────────────────────────
  function viewEl() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div');
    v.id = VIEW_ID; v.className = 'view';
    document.body.appendChild(v);
    return v;
  }

  function isHidden(m) { return state.hidden.has(m.message_id); }
  function counts() {
    const live = state.emails.filter(m => !isHidden(m));
    const inbox = live.filter(m => m.category === 'inbox' && !m.isSystem).length;
    const sent = live.filter(m => m.category === 'sent').length;
    return { inbox, sent, all: live.length, hidden: state.emails.filter(isHidden).length };
  }

  function currentRows() {
    let rows = state.emails;
    if (state.filter === 'hidden') {
      rows = rows.filter(isHidden);
    } else {
      rows = rows.filter(m => !isHidden(m));
      if (state.filter === 'inbox') rows = rows.filter(m => m.category === 'inbox' && !m.isSystem);
      else if (state.filter === 'sent') rows = rows.filter(m => m.category === 'sent');
    }
    const q = state.search.trim().toLowerCase();
    if (q) rows = rows.filter(m =>
      (m.sender_name || '').toLowerCase().includes(q) ||
      (m.from || '').includes(q) ||
      (m.subject || '').toLowerCase().includes(q) ||
      (m.cust && (m.cust.name || '').toLowerCase().includes(q)));
    // Í „Til að svara": spurningar efst, svo nýjast. Annars nýjast.
    if (state.filter === 'inbox') rows = rows.slice().sort((a, b) => (b.is_question ? 1 : 0) - (a.is_question ? 1 : 0) || (b.received_at || '').localeCompare(a.received_at || ''));
    return rows;
  }

  function rowHTML(m, i) {
    const cls = 'rp-card' + (m.is_question ? ' q' : (m.cust ? ' matched' : ''));
    const badges = [];
    if (m.is_question) badges.push('<span class="rp-badge q">❓ Spurning</span>');
    if (m.has_attachment) badges.push('<span class="rp-badge att">📎</span>');
    if (m.isPayday) badges.push('<span class="rp-badge pay">🧾 Payday-afrit</span>');
    const subj = m.subject || '(ekkert efni)';
    const snip = (m.snippet || m.body_preview || '').replace(/\s+/g, ' ').trim();
    const custHTML = m.cust
      ? '<a class="rp-cust" ' + (m.cust.coId ? 'data-co="' + esc(String(m.cust.coId)) + '" ' : '') + (m.cust.kt ? 'data-kt="' + esc(ktDigits(m.cust.kt)) + '" ' : '') + 'title="Opna kúnna">' + esc(m.cust.name || '—') + '<span class="by">tengt: ' + esc(m.matchBy || '') + (m.sale ? ' · ' + esc(m.sale.num) : '') + '</span></a>'
      : '<span class="rp-nomatch">enginn kúnni fannst</span>';
    const acts = [];
    const di = ' data-i="' + i + '"';
    // Delete / restore — hide a handled email (synced across devices via Supabase).
    if (isHidden(m)) acts.push('<button class="rp-btn _rp-restore"' + di + ' type="button" title="Endurheimta póst">↩︎ Endurheimta</button>');
    // Tier 3 — draft a reply to anything that landed in the inbox (real people).
    if (m.category === 'inbox' && !m.isSystem && !isHidden(m)) acts.push('<button class="rp-btn ai _rp-reply"' + di + ' type="button" title="Semja svar með Claude">🤖 Svar</button>');
    // Tier 2 — resend an invoice PDF (needs a customer to list invoices, or a matched sale).
    if (m.cust || m.sale) acts.push('<button class="rp-btn prim _rp-send"' + di + ' type="button" title="Senda reikning sem PDF">✉️ Senda</button>');
    // Tier 2 — jump straight into the matched invoice to change it.
    if (m.sale) acts.push('<button class="rp-btn _rp-edit"' + di + ' type="button" title="Breyta reikningi">✏️ Breyta</button>');
    if (m.cust && (m.cust.coId || m.cust.kt)) {
      acts.push('<button class="rp-btn _rp-open" ' + (m.cust.coId ? 'data-co="' + esc(String(m.cust.coId)) + '" ' : '') + (m.cust.kt ? 'data-kt="' + esc(ktDigits(m.cust.kt)) + '" ' : '') + 'type="button">Opna</button>');
      if (m.cust.kt) acts.push('<button class="rp-btn _rp-saga" data-kt="' + esc(ktDigits(m.cust.kt)) + '" type="button">Saga</button>');
    }
    if (!isHidden(m)) acts.push('<button class="rp-btn del _rp-del"' + di + ' type="button" title="Eyða / fela þessum pósti">🗑</button>');
    return '<div class="' + cls + '">' +
      '<div class="rp-when"><b>' + esc(relDay(m.received_at)) + '</b>' + esc(fmtDate(m.received_at)) + '</div>' +
      '<div class="rp-mid">' +
        '<div class="rp-from">' + esc(m.sender_name || m.from) + ' <span class="em">' + esc(m.from) + '</span> ' + badges.join(' ') + '</div>' +
        '<div class="rp-subj">' + esc(subj) + '</div>' +
        (snip ? '<div class="rp-snip">' + esc(snip.slice(0, 150)) + '</div>' : '') +
      '</div>' +
      '<div class="rp-right">' + custHTML + (acts.length ? '<div class="rp-acts">' + acts.join('') + '</div>' : '') + '</div>' +
    '</div>';
  }

  function render() {
    styles();
    const v = viewEl();
    const c = counts();
    const chip = (k, label, n) => '<button class="rp-chip' + (state.filter === k ? ' on' : '') + '" data-f="' + k + '" type="button">' + label + ' <span class="n">' + n + '</span></button>';

    let body;
    if (state.err) body = '<div class="rp-err">⚠️ ' + esc(state.err) + '</div>';
    else if (state.loading && !state.loaded) body = '<div class="rp-empty">Sæki pósta…</div>';
    else {
      const rows = currentRows();
      state._rows = rows;   // handlers below look up the message by data-i
      body = rows.length ? '<div class="rp-list">' + rows.map((m, i) => rowHTML(m, i)).join('') + '</div>'
        : '<div class="rp-empty">' + (state.search ? 'Enginn póstur passar við leitina.' : 'Engir póstar í þessum flokki.') + '</div>';
    }

    v.innerHTML =
      '<div class="rp-main">' +
        '<div class="rp-head">' +
          '<div class="rp-title"><h1>📧 Reikninga-póstur</h1><p>Póstar til eldklar@eldklar.is tengdir við kúnna — svaraðu, sendu reikning eða breyttu honum beint héðan.</p></div>' +
          '<button class="rp-reload" id="_rp-reload" type="button">↻ Endurhlaða</button>' +
        '</div>' +
        '<div class="rp-tools">' +
          chip('inbox', '📥 Til að svara', c.inbox) +
          chip('sent', '🧾 Sendir reikningar', c.sent) +
          chip('all', 'Allt', c.all) +
          (c.hidden ? chip('hidden', '🗑 Falin', c.hidden) : '') +
          '<div class="rp-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg>' +
            '<input id="_rp-search" type="search" placeholder="Leita (sendandi · efni · kúnni)…" value="' + esc(state.search) + '"></div>' +
        '</div>' +
        body +
      '</div>';

    v.querySelector('#_rp-reload').addEventListener('click', load);
    v.querySelectorAll('.rp-chip').forEach(b => b.addEventListener('click', () => { state.filter = b.dataset.f; render(); }));
    const si = v.querySelector('#_rp-search');
    if (si) si.addEventListener('input', () => {
      state.search = si.value; render();
      const el = document.querySelector('#' + VIEW_ID + ' #_rp-search');
      if (el) { el.focus(); try { const n = el.value.length; el.setSelectionRange(n, n); } catch (_) {} }
    });
    v.querySelectorAll('.rp-cust[data-co],.rp-cust[data-kt],._rp-open').forEach(a => a.addEventListener('click', () => openCustomer(a.dataset.co, a.dataset.kt)));
    v.querySelectorAll('._rp-saga').forEach(b => b.addEventListener('click', () => openSaga(b.dataset.kt)));
    const rowFor = el => (state._rows || [])[+el.dataset.i];
    v.querySelectorAll('._rp-send').forEach(b => b.addEventListener('click', () => { const m = rowFor(b); if (m) openSendModal(m); }));
    v.querySelectorAll('._rp-edit').forEach(b => b.addEventListener('click', () => { const m = rowFor(b); if (m) editSale(m); }));
    v.querySelectorAll('._rp-reply').forEach(b => b.addEventListener('click', () => { const m = rowFor(b); if (m) openReplyModal(m); }));
    v.querySelectorAll('._rp-del').forEach(b => b.addEventListener('click', () => { const m = rowFor(b); if (m) hideEmail(m); }));
    v.querySelectorAll('._rp-restore').forEach(b => b.addEventListener('click', () => { const m = rowFor(b); if (m) restoreEmail(m); }));
  }

  // ── delete / hide a handled email (Supabase-synced across devices) ─────────
  async function hideEmail(m) {
    if (!m || !m.message_id) return;
    state.hidden.add(m.message_id); render();
    const SB = getSB();
    try { if (SB) await SB.from('reikninga_postur_hidden').upsert({ message_id: m.message_id }, { onConflict: 'message_id' }); } catch (_) {}
    if (window.Toast && Toast.show) Toast.show('🗑 Póstur falinn');
  }
  async function restoreEmail(m) {
    if (!m || !m.message_id) return;
    state.hidden.delete(m.message_id); render();
    const SB = getSB();
    try { if (SB) await SB.from('reikninga_postur_hidden').delete().eq('message_id', m.message_id); } catch (_) {}
  }

  function openCustomer(coId, kt) {
    if (coId && window.Companies && Companies.openDetail) {
      if (window.App && App.switchView) App.switchView('companies');
      setTimeout(() => { try { Companies.openDetail(+coId); } catch (_) {} }, 60);
      return;
    }
    openSaga(kt);
  }
  function openSaga(kt) {
    kt = ktDigits(kt);
    try { if (window.App && App.switchView) App.switchView('hreyfingarlisti'); } catch (_) {}
    if (kt) setTimeout(() => { try { location.hash = '#hreyfingarlisti/' + kt; } catch (_) {} }, 80);
  }

  // ── Tier 2: ✏️ Breyta reikningi → open the sale in the sale editor (patch 142)
  function editSale(m) {
    try {
      if (m.sale && window.SaleEditor) {
        if (m.sale.id != null && SaleEditor.openById) return void SaleEditor.openById(m.sale.id);
        if (m.sale.num && SaleEditor.openByNum) return void SaleEditor.openByNum(m.sale.num);
      }
    } catch (_) {}
    // no specific invoice matched → drop the office on the customer so they pick it
    openCustomer(m.cust && m.cust.coId, m.cust && m.cust.kt);
  }

  // ── shared modal shell ────────────────────────────────────────────────────
  function modalEl() {
    let el = document.getElementById('_rp-modal');
    if (el) return el;
    el = document.createElement('div');
    el.id = '_rp-modal'; el.style.display = 'none';
    el.innerHTML = '<div class="rpm-back"></div><div class="rpm-card"></div>';
    document.body.appendChild(el);
    el.querySelector('.rpm-back').addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    return el;
  }
  function openModal(html) { const el = modalEl(); el.querySelector('.rpm-card').innerHTML = html; el.style.display = 'flex'; return el.querySelector('.rpm-card'); }
  function closeModal() { const el = document.getElementById('_rp-modal'); if (el) el.style.display = 'none'; }

  function blobToB64(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => { const s = String(fr.result || ''); const i = s.indexOf(','); res(i >= 0 ? s.slice(i + 1) : s); };
      fr.onerror = rej; fr.readAsDataURL(blob);
    });
  }
  function emailFrom() { return localStorage.getItem('email_from') || 'Slökkvitæki ehf <reikningar@eldklar.is>'; }
  function fmtKr(n) { return (Math.round(Number(n) || 0)).toLocaleString('is-IS') + ' kr'; }

  async function getFullSale(id) {
    const SB = getSB(); if (!SB || id == null) return null;
    try { const r = await SB.from('solur').select('*').eq('id', id).maybeSingle(); return (r && r.data) || null; } catch (_) { return null; }
  }
  async function getCustomerInvoices(kt) {
    const SB = getSB(); const k = ktDigits(kt); if (!SB || !k) return [];
    try {
      const r = await SB.from('solur').select('*').eq('customer_kt', k).order('created_at', { ascending: false }).limit(40);
      return (r && r.data) || [];
    } catch (_) { return []; }
  }
  async function coForSale(sale, m) {
    const SB = getSB();
    const coId = m && m.cust && m.cust.coId;
    if (SB && coId != null) {
      try { const r = await SB.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang').eq('id', coId).maybeSingle(); if (r && r.data) return r.data; } catch (_) {}
    }
    return { nafn: (sale && sale.customer_nafn) || (m && m.cust && m.cust.name) || '', kennitala: (m && m.cust && m.cust.kt) || (sale && sale.customer_kt) || '', heimilisfang: '' };
  }

  // ── Tier 2: ✉️ Senda reikning — resend an invoice PDF to any address ────────
  async function openSendModal(m) {
    openModal('<div class="rpm-load">Sæki reikninga…</div>');
    let invs = [];
    const kt = m.cust && ktDigits(m.cust.kt);
    if (kt) invs = await getCustomerInvoices(kt);
    if (m.sale && !invs.some(s => String(s.id) === String(m.sale.id))) invs.unshift(m.sale);
    // fyrst ógreiddir reikningur-sölur, svo eftir dagsetningu (nýjast fyrst)
    invs = invs.filter(s => s && s.num);
    const preId = m.sale ? String(m.sale.id) : (invs[0] ? String(invs[0].id) : '');
    renderSendModal(m, invs, preId);
  }
  function renderSendModal(m, invs, selId) {
    const to = m.from || '';
    const invRows = invs.length ? invs.map(s =>
      '<label class="rpm-inv' + (String(s.id) === selId ? ' sel' : '') + '" data-id="' + esc(String(s.id)) + '">' +
        '<input type="radio" name="rpinv" value="' + esc(String(s.id)) + '"' + (String(s.id) === selId ? ' checked' : '') + '>' +
        '<span class="n">' + esc(s.num || '—') + '</span>' +
        '<span class="meta">' + fmtKr(s.samtals) + '<br>' + esc(fmtDate(s.created_at)) + (s.paid_at ? ' · <span class="paid">greitt</span>' : '') + '</span>' +
      '</label>'
    ).join('') : '<div class="rpm-note" style="margin:0">Engir reikningar fundust á þennan viðskiptavin.</div>';

    openModal(
      '<div class="rpm-head"><div><h3>✉️ Senda reikning</h3><div class="sub">' + esc((m.cust && m.cust.name) || m.sender_name || '') + '</div></div><button class="rpm-x" type="button">✕</button></div>' +
      '<div class="rpm-body">' +
        '<div class="rpm-row"><label class="rpm-lbl">Senda á netfang</label><input id="_rpm-to" type="email" value="' + esc(to) + '" placeholder="netfang@daemi.is"></div>' +
        '<div class="rpm-row"><label class="rpm-lbl">Hvaða reikning?</label><div class="rpm-invs">' + invRows + '</div></div>' +
        '<div class="rpm-row"><label class="rpm-lbl">Skilaboð (valkvæmt)</label><textarea id="_rpm-note" placeholder="Stutt skilaboð sem fylgja með…"></textarea></div>' +
      '</div>' +
      '<div class="rpm-foot"><span class="rpm-msg" id="_rpm-msg"></span><button class="rpm-btn" type="button" id="_rpm-cancel">Hætta við</button><button class="rpm-btn prim" type="button" id="_rpm-send">📤 Senda reikning</button></div>'
    );
    const card = modalEl();
    card.querySelector('.rpm-x').onclick = closeModal;
    card.querySelector('#_rpm-cancel').onclick = closeModal;
    card.querySelectorAll('.rpm-inv').forEach(l => l.addEventListener('click', () => {
      card.querySelectorAll('.rpm-inv').forEach(x => x.classList.remove('sel'));
      l.classList.add('sel'); const r = l.querySelector('input'); if (r) r.checked = true;
    }));
    card.querySelector('#_rpm-send').onclick = () => doSend(m, invs);
    setTimeout(() => { const t = card.querySelector('#_rpm-to'); if (t && !t.value) t.focus(); }, 80);
  }
  function buildEmailHtml(sale, co, note) {
    const noteHtml = note ? '<p style="color:#334155;font-size:13.5px;white-space:pre-wrap;margin:0 0 14px">' + esc(note) + '</p>' : '';
    return '<!DOCTYPE html><html><head><meta charset="utf-8"></head>' +
      '<body style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:22px;color:#0f172a">' +
      '<div style="background:#C93C1D;padding:16px 20px;border-radius:10px 10px 0 0"><h1 style="margin:0;color:#fff;font-size:18px">Slökkvitæki ehf</h1>' +
      '<p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:13px">Reikningur ' + esc(sale.num || '') + '</p></div>' +
      '<div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:20px;border-radius:0 0 10px 10px">' +
        '<p style="color:#334155;font-size:13.5px;margin:0 0 14px">Sæl/l,</p>' +
        noteHtml +
        '<p style="color:#334155;font-size:13.5px;margin:0 0 14px">Meðfylgjandi er reikningur <strong>' + esc(sale.num || '') + '</strong>' +
          (co && co.nafn ? ' fyrir ' + esc(co.nafn) : '') + ', að upphæð <strong>' + fmtKr(sale.samtals) + '</strong>.</p>' +
        '<p style="color:#64748b;font-size:12.5px;margin:18px 0 0">Kær kveðja,<br><strong>Slökkvitæki ehf</strong><br>eldklar@eldklar.is</p>' +
      '</div></body></html>';
  }
  async function doSend(m, invs) {
    const card = modalEl();
    const msg = card.querySelector('#_rpm-msg');
    const btn = card.querySelector('#_rpm-send');
    const to = (card.querySelector('#_rpm-to').value || '').trim();
    const note = (card.querySelector('#_rpm-note').value || '').trim();
    const sel = card.querySelector('input[name=rpinv]:checked');
    const setMsg = (t, cls) => { msg.textContent = t; msg.className = 'rpm-msg ' + (cls || ''); };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { setMsg('Skráðu gilt netfang', 'bad'); return; }
    if (!sel) { setMsg('Veldu reikning', 'bad'); return; }
    if (!window.UttektInvoicePdf || !UttektInvoicePdf.buildInvoiceBlob) { setMsg('PDF-teiknari ekki tiltækur', 'bad'); return; }
    btn.disabled = true; setMsg('Teikna PDF…', '');
    try {
      let sale = invs.find(s => String(s.id) === sel.value);
      const full = await getFullSale(sel.value);
      if (full) sale = full;
      const co = await coForSale(sale, m);
      const blob = await UttektInvoicePdf.buildInvoiceBlob(sale, co);
      const b64 = await blobToB64(blob);
      const fname = [(co.nafn || 'reikningur').replace(/\s+/g, ' ').trim(), sale.num || ''].filter(Boolean).join(' - ') + '.pdf';
      setMsg('Sendi…', '');
      const payload = {
        from: emailFrom(), to: [to],
        subject: 'Reikningur ' + (sale.num || '') + ' frá Slökkvitæki ehf',
        html: buildEmailHtml(sale, co, note),
        attachments: [{ filename: fname, content: b64 }],
        apiKey: localStorage.getItem('resend_api_key') || undefined,
      };
      const r = await fetch('/api/email-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        let mm = e.message || e.error || ('HTTP ' + r.status);
        if (e.error === 'API_KEY_MISSING') mm = 'Resend API lykill ekki stilltur (RESEND_API_KEY í Netlify).';
        else if (/domain|not verified|verify/i.test(mm)) mm = 'Sendandalén ekki staðfest í Resend (' + emailFrom() + ').';
        throw new Error(mm);
      }
      setMsg('✓ Reikningur sendur á ' + to, 'ok');
      if (window.Toast && Toast.show) Toast.show('✓ Reikningur ' + (sale.num || '') + ' sendur á ' + to);
      setTimeout(closeModal, 1100);
    } catch (e) {
      setMsg('Villa: ' + String((e && e.message) || e), 'bad');
      btn.disabled = false;
    }
  }

  // Send ONE specific invoice PDF straight to an address (used by the assistant's
  // „umbeðin skjöl" list). Confirms first; reuses the same PDF + email path.
  async function quickSendInvoice(m, sale, toEmail) {
    const to = (toEmail || (m && m.from) || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { alert('Ógilt netfang: ' + to); return false; }
    if (!window.UttektInvoicePdf || !UttektInvoicePdf.buildInvoiceBlob) { alert('PDF-teiknari ekki tiltækur'); return false; }
    if (!confirm('Senda ' + (sale.num || 'reikning') + ' (' + fmtKr(sale.samtals) + ') á ' + to + '?')) return false;
    try {
      const full = (await getFullSale(sale.id)) || sale;
      const co = await coForSale(full, m);
      const blob = await UttektInvoicePdf.buildInvoiceBlob(full, co);
      const b64 = await blobToB64(blob);
      const fname = [(co.nafn || 'reikningur').replace(/\s+/g, ' ').trim(), full.num || ''].filter(Boolean).join(' - ') + '.pdf';
      const r = await fetch('/api/email-send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: emailFrom(), to: [to],
          subject: 'Reikningur ' + (full.num || '') + ' frá Slökkvitæki ehf',
          html: buildEmailHtml(full, co, ''),
          attachments: [{ filename: fname, content: b64 }],
          apiKey: localStorage.getItem('resend_api_key') || undefined,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        let mm = e.message || e.error || ('HTTP ' + r.status);
        if (e.error === 'API_KEY_MISSING') mm = 'Resend API lykill ekki stilltur (RESEND_API_KEY í Netlify).';
        else if (/domain|not verified|verify/i.test(mm)) mm = 'Sendandalén ekki staðfest í Resend.';
        throw new Error(mm);
      }
      if (window.Toast && Toast.show) Toast.show('✓ ' + (full.num || 'Reikningur') + ' sendur á ' + to);
      return true;
    } catch (e) { alert('Villa: ' + String((e && e.message) || e)); return false; }
  }

  // „Find requested documents": list the customer's invoices, star the one the
  // email asks for (AI invoice_ref or an R-number in the text), one-tap send.
  async function renderRequestedDocs(m, requested) {
    const card = modalEl();
    const row = card.querySelector('#_rpm-docs-row');
    const box = card.querySelector('#_rpm-docs');
    if (!row || !box) return;
    const kt = m.cust && ktDigits(m.cust.kt);
    const kind = (requested && requested.kind) || 'ekkert';
    const hayRef = (((m.subject || '') + ' ' + (m.body_preview || m.snippet || '')).toUpperCase().match(/R-0\d{5}/) || [])[0] || null;
    const ref = (requested && requested.invoice_ref) || hayRef;
    if (!kt || (kind === 'ekkert' && !ref)) { row.style.display = 'none'; return; }
    row.style.display = '';
    box.innerHTML = '<div class="rpm-note" style="margin:0">Sæki reikninga…</div>';
    const invs = (await getCustomerInvoices(kt)).filter(s => s && s.num);
    if (!invs.length) { box.innerHTML = '<div class="rpm-note" style="margin:0">Engir reikningar fundust á þennan viðskiptavin.</div>'; return; }
    const norm = s => String(s || '').toUpperCase().replace(/\s/g, '');
    box.innerHTML = invs.slice(0, 8).map((s, i) => {
      const match = ref && norm(s.num) === norm(ref);
      return '<div class="rpm-doc' + (match ? ' match' : '') + '">' +
        '<span class="n">' + esc(s.num || '—') + (match ? ' ★' : '') + '</span>' +
        '<span class="meta">' + fmtKr(s.samtals) + ' · ' + esc(fmtDate(s.created_at)) + (s.paid_at ? ' · greitt' : '') + '</span>' +
        '<button class="rpm-doc-send" data-i="' + i + '" type="button">✉️ Senda</button></div>';
    }).join('');
    box.querySelectorAll('.rpm-doc-send').forEach(b => b.addEventListener('click', async () => {
      const s = invs[+b.dataset.i]; if (!s) return;
      b.disabled = true; const ok = await quickSendInvoice(m, s, m.from); b.disabled = false;
      if (ok) { b.textContent = '✓ Sent'; b.classList.add('sent'); }
    }));
  }

  // ── Tier 3: 🤖 Semja svar — AI-drafted reply (office reviews before sending) ─
  async function openReplyModal(m) {
    openModal(
      '<div class="rpm-head"><div><h3>🤖 Aðstoð — yfirlit, svar & skjöl</h3><div class="sub">' + esc(m.sender_name || m.from) + ' · ' + esc(m.from) + '</div></div><button class="rpm-x" type="button">✕</button></div>' +
      '<div class="rpm-body">' +
        '<div class="rpm-row"><label class="rpm-lbl">Upprunalegur póstur</label>' +
          '<div class="rpm-src"><b>' + esc(m.subject || '(ekkert efni)') + '</b><br>' + esc((m.body_preview || m.snippet || '').replace(/\s+/g, ' ').slice(0, 400)) + '</div></div>' +
        '<div class="rpm-row" id="_rpm-summary-row" style="display:none"><label class="rpm-lbl">📋 Yfirlit</label><div class="rpm-summary" id="_rpm-summary"></div></div>' +
        '<div class="rpm-row" id="_rpm-docs-row" style="display:none"><label class="rpm-lbl">📎 Umbeðin skjöl — smelltu til að senda</label><div class="rpm-docs" id="_rpm-docs"></div></div>' +
        '<div class="rpm-ai-tip" id="_rpm-tips">' +
          '<button type="button" data-t="Staðfestu að við sendum reikninginn sem viðhengi.">Sendi reikning</button>' +
          '<button type="button" data-t="Biddu um netfang eða kt til að finna réttan reikning.">Bið um uppl.</button>' +
          '<button type="button" data-t="Segðu að við lögum reikninginn og sendum leiðréttan.">Leiðrétti reikning</button>' +
          '<button type="button" data-t="Þakkaðu fyrir greiðsluna og staðfestu að hún sé móttekin.">Staðfesti greiðslu</button>' +
        '</div>' +
        '<div class="rpm-row"><label class="rpm-lbl">Efni</label><input id="_rpm-subj" type="text" value="Re: ' + esc(m.subject || '') + '"></div>' +
        '<div class="rpm-row"><label class="rpm-lbl">Svar (yfirfarðu áður en þú sendir)</label><textarea id="_rpm-reply" class="reply" placeholder="Smelltu á ✨ Semja svar…"></textarea></div>' +
      '</div>' +
      '<div class="rpm-foot"><span class="rpm-msg" id="_rpm-msg"></span>' +
        '<button class="rpm-btn ai" type="button" id="_rpm-gen">✨ Semja svar</button>' +
        '<span class="spacer"></span>' +
        '<button class="rpm-btn" type="button" id="_rpm-copy">📋 Afrita</button>' +
        '<button class="rpm-btn prim" type="button" id="_rpm-reply-send">📤 Senda svar</button></div>'
    );
    const card = modalEl();
    let instruction = '';
    card.querySelector('.rpm-x').onclick = closeModal;
    card.querySelectorAll('#_rpm-tips button').forEach(b => b.addEventListener('click', () => { instruction = b.dataset.t; genReply(m, () => instruction); }));
    card.querySelector('#_rpm-gen').onclick = () => genReply(m, () => instruction);
    card.querySelector('#_rpm-copy').onclick = () => {
      const ta = card.querySelector('#_rpm-reply');
      try { navigator.clipboard.writeText(ta.value); if (window.Toast && Toast.show) Toast.show('✓ Afritað'); } catch (_) { ta.select(); document.execCommand('copy'); }
    };
    card.querySelector('#_rpm-reply-send').onclick = () => sendReply(m);
    // auto-draft on open
    genReply(m, () => '');
  }
  async function customerInvContext(m) {
    const kt = m.cust && ktDigits(m.cust.kt);
    if (!kt) return [];
    const rows = await getCustomerInvoices(kt);
    return rows.slice(0, 12).map(s => ({ num: s.num, date: fmtDate(s.created_at), samtals: s.samtals, paid: !!s.paid_at }));
  }
  async function genReply(m, getInstruction) {
    const card = modalEl();
    const ta = card.querySelector('#_rpm-reply');
    const subj = card.querySelector('#_rpm-subj');
    const msg = card.querySelector('#_rpm-msg');
    const gen = card.querySelector('#_rpm-gen');
    if (!ta) return;
    const setMsg = (t, cls) => { if (msg) { msg.textContent = t; msg.className = 'rpm-msg ' + (cls || ''); } };
    gen.disabled = true; setMsg('Claude semur svar…', '');
    try {
      const invoices = await customerInvContext(m);
      const r = await fetch('/api/postur-reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: { sender_name: m.sender_name, sender_email: m.from, subject: m.subject, body: m.body_preview || m.snippet || '' },
          customer: m.cust ? { name: m.cust.name, kt: ktDashed(m.cust.kt) } : null,
          invoices,
          instruction: (getInstruction && getInstruction()) || '',
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
      if (d.body) ta.value = d.body;
      if (d.subject && subj) subj.value = d.subject;
      // 📋 summary of what the sender wants
      const sumRow = card.querySelector('#_rpm-summary-row'), sumEl = card.querySelector('#_rpm-summary');
      if (sumEl && d.summary) { sumEl.textContent = d.summary; sumRow.style.display = ''; }
      // 📎 requested documents (invoices) — surface + one-tap send
      try { await renderRequestedDocs(m, d.requested); } catch (_) {}
      setMsg('✓ Uppkast tilbúið — yfirfarðu það', 'ok');
    } catch (e) {
      setMsg('Villa: ' + String((e && e.message) || e), 'bad');
    } finally { gen.disabled = false; }
  }
  async function sendReply(m) {
    const card = modalEl();
    const msg = card.querySelector('#_rpm-msg');
    const btn = card.querySelector('#_rpm-reply-send');
    const to = m.from;
    const subject = (card.querySelector('#_rpm-subj').value || '').trim() || ('Re: ' + (m.subject || ''));
    const bodyTxt = (card.querySelector('#_rpm-reply').value || '').trim();
    const setMsg = (t, cls) => { msg.textContent = t; msg.className = 'rpm-msg ' + (cls || ''); };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to || '')) { setMsg('Sendandanetfang ógilt', 'bad'); return; }
    if (!bodyTxt) { setMsg('Svarið er tómt', 'bad'); return; }
    btn.disabled = true; setMsg('Sendi…', '');
    const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a;white-space:pre-wrap;line-height:1.6">' + esc(bodyTxt) + '</div>';
    try {
      const payload = { from: emailFrom(), to: [to], subject, html, apiKey: localStorage.getItem('resend_api_key') || undefined };
      const r = await fetch('/api/email-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        let mm = e.message || e.error || ('HTTP ' + r.status);
        if (e.error === 'API_KEY_MISSING') mm = 'Resend API lykill ekki stilltur (RESEND_API_KEY í Netlify).';
        else if (/domain|not verified|verify/i.test(mm)) mm = 'Sendandalén ekki staðfest í Resend.';
        throw new Error(mm);
      }
      setMsg('✓ Svar sent á ' + to, 'ok');
      if (window.Toast && Toast.show) Toast.show('✓ Svar sent á ' + to);
      setTimeout(closeModal, 1100);
    } catch (e) { setMsg('Villa: ' + String((e && e.message) || e), 'bad'); btn.disabled = false; }
  }

  // ── wiring (mirrors patch 239) ──────────────────────────────────────────
  const NAV_LABEL = '📧 Reikninga-póstur';
  function ensureSidebarButton() {
    const existing = document.querySelector('[data-view="' + NAV_KEY + '"]');
    if (existing) {
      // A sidebar rebuild (patch 68/180/244) can revert the label to the clone
      // source's text — re-assert it every tick so it never reads "Kröfu yfirlit".
      if ((existing.textContent || '').indexOf('Reikninga-póstur') === -1) existing.textContent = NAV_LABEL;
      return true;
    }
    // Clone a SIMPLE text-label button (Hreyfingarlisti/Bakendi) — NOT Kröfu
    // yfirlit (patch 166), whose icon-span + text-node + badge markup made the
    // old piecemeal relabel leave a stray "Kröfu yfirlit" text → a duplicate nav.
    const sib = document.querySelector('[data-view="hreyfingarlisti"]')
      || document.querySelector('[data-view="bakendi"]')
      || document.querySelector('[data-view="krofu-yfirlit"]')
      || document.querySelector('[data-view]');
    if (!sib) return false;
    const btn = sib.cloneNode(true);
    btn.dataset.view = NAV_KEY;
    // Rebuild the label from scratch: one clean text node, no leftover markup.
    btn.textContent = NAV_LABEL;
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); });
    sib.parentNode.insertBefore(btn, sib.nextSibling);
    return true;
  }
  function hookSwitch() {
    if (!window.App || !App.switchView) return false;
    if (App.__rpPatched) return true;
    const orig = App.switchView.bind(App);
    App.switchView = function (k) {
      if (k === NAV_KEY) {
        document.querySelectorAll('.view').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
        const v = viewEl();
        v.style.display = 'block'; v.classList.add('active');
        render();
        if (!state.loaded && !state.loading) load();
        try { history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
        return;
      }
      const me = document.getElementById(VIEW_ID);
      if (me) { me.style.display = 'none'; me.classList.remove('active'); }
      return orig(k);
    };
    App.__rpPatched = true;
    return true;
  }
  function init() {
    viewEl();
    let sw = hookSwitch(), sb = ensureSidebarButton();
    [200, 600, 1500, 3500, 7000].forEach(ms => setTimeout(() => {
      if (!sw) sw = hookSwitch();
      if (!sb) sb = ensureSidebarButton();
    }, ms));
    const slug = (location.hash || '').replace(/^#/, '');
    if (slug === NAV_KEY || slug === 'postur') setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); }, 250);
    window.addEventListener('hashchange', () => {
      const s = (location.hash || '').replace(/^#/, '');
      if (s === NAV_KEY || s === 'postur') { if (window.App && App.switchView) App.switchView(NAV_KEY); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.ReikningaPostur = {
    open: () => { if (window.App && App.switchView) App.switchView(NAV_KEY); },
    reload: load,
  };
  console.log('[patch-240] Reikninga-póstur installed');
})();
/* === END REIKNINGA-PÓSTUR === */
