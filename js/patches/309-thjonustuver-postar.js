/* === ÞJÓNUSTUVER PÓSTAR — kúnnaþjónusta í gegnum póst v1 (2026-08-19) ==========
 *
 * Sjálfstæð síða (view `view-thjonustuver-postar`, slug `#thjonustuver-postar`)
 * fyrir þjónustu við viðskiptavini Í GEGNUM PÓST — aðskilin frá Þjónustuborðinu
 * (patch 231), sem verður áfram innra skipulagsborð.
 *
 * Bein svör við því sem vantaði á gamla borðið (ósk Agnars):
 *   1. „badly summarized"      → ✨ AI-yfirlit sem segir NÁKVÆMLEGA hvað kúnninn
 *                                 vill, með tölum (mode:'thjonustuver' á
 *                                 /api/postur-triage).
 *   2. „important data skipped" → structured „details" (magn, upphæð, staðsetning,
 *                                 frestur, tæki, reikningsnr., tengiliður) +
 *                                 ALLTAF fullur útdráttur, engin 3-lína stytting.
 *   3. „yfirfara hverju er í raun búið að svara" → raunveruleg ✅/⚠️ svarstaða.
 *
 * SVARSTAÐA — heiðarleg, ekki „cry wolf" (staðfest á lifandi gögnum 2026-08-19):
 *   • Grunnrök = patch 286 cutOf: kúnninn á opna spurningu ef hann sendi spurningu
 *     (is_question && !fra_okkur) NÝRRI en (síðasta svar OKKAR / handvirkt „svarað").
 *   • Sendur póstur (fra_okkur) er lesinn inn með töf → EIGIN aðgerðir haldast í
 *     localStorage (svar sent héðan EÐA „✓ Merkti svarað") svo þær lifa endurhleðslu
 *     óháð innsognstöf. Freskleiki sends pósts er sýndur heiðarlega efst.
 *   • is_question ofmetur stundum (t.d. „takk fyrir") → AI `needs_action` þaggar
 *     niður ekki-aðgerðir. Gamlar spurningar (> RECENCY_DAYS) og sjálfvirkir
 *     sendendur (payday/noreply) teljast ekki „vantar svar".
 *
 * ÖRYGGI: les EINGÖNGU vinnupósthólf (felag_samskipti ⇐ email_digest eldklar@/
 * bokhald@), aldrei einkapóst. AI skrifar aldrei sjálfkrafa; póstur er ALLTAF
 * yfirfarinn fyrir sendingu.
 *
 * Public API: window.ThjonustuverPostar = { open, reload }.
 * ========================================================================== */
(() => {
  if (window.__thjonustuverPostarInstalled) return;
  window.__thjonustuverPostarInstalled = true;

  const VIEW_ID = 'view-thjonustuver-postar';
  const NAV_KEY = 'thjonustuver-postar';           // === data-view === #slug === PAGES.k
  const NAV_LABEL = '📨 Þjónustuver póstar';
  const HKEY = 'tvp_handled_v1';                    // { base_id: iso } — eigin „svarað"-merki
  const RECENCY_DAYS = 150;                         // eldri opnar spurningar teljast ekki
  const AUTO_RE = /payday|noreply|no-reply|donotreply|do-not-reply|delivery@|mailer-daemon|postmaster|notification/i;

  // ── helpers ───────────────────────────────────────────────────────────────
  const getSB = () => (window.DB && window.DB.sb) || null;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const me = () => { try { return localStorage.getItem('bh_me') || localStorage.getItem('me') || localStorage.getItem('slokk_me') || 'Slökkvitæki'; } catch (_) { return 'Slökkvitæki'; } };
  const emailFrom = () => { try { return localStorage.getItem('email_from') || 'Brunahólf Slökkvitæki ehf <reikningar@eldklar.is>'; } catch (_) { return 'Brunahólf Slökkvitæki ehf <reikningar@eldklar.is>'; } };
  const nowIso = () => new Date().toISOString();
  const dt = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; };
  const dtime = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/); return m ? (m[3] + '.' + m[2] + '. ' + m[4] + ':' + m[5]) : dt(s); };
  const daysAgo = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return null; const then = Date.parse(m[1] + '-' + m[2] + '-' + m[3]); if (isNaN(then)) return null; return Math.floor((Date.now() - then) / 86400000); };
  const isAuto = (m) => AUTO_RE.test(m.sender_email || '');
  const loadHandled = () => { try { return JSON.parse(localStorage.getItem(HKEY) || '{}') || {}; } catch (_) { return {}; } };
  const saveHandled = (h) => { try { localStorage.setItem(HKEY, JSON.stringify(h)); } catch (_) {} };
  function toast(msg, bad) {
    let host = document.getElementById('tvp-toast');
    if (!host) { host = document.createElement('div'); host.id = 'tvp-toast'; document.body.appendChild(host); }
    host.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:100093;background:' + (bad ? '#7f1d1d' : '#0f172a') +
      ';color:#fff;padding:11px 18px;border-radius:11px;font:600 13px system-ui;box-shadow:0 14px 34px rgba(0,0,0,.4);max-width:min(460px,92vw)';
    host.textContent = msg;
    clearTimeout(host._t); host._t = setTimeout(() => { host.remove(); }, bad ? 6500 : 3400);
  }

  // Gróf-flokkar (spegla patch 231 / 308) — aðeins til að lita „flokkur"-merkið.
  const FLOKKAR = {
    tilbod:     { label: 'Tilboð',     emoji: '💰', color: '#1d4ed8' },
    thjonusta:  { label: 'Þjónusta',   emoji: '🔧', color: '#0d9488' },
    brunakerfi: { label: 'Brunakerfi', emoji: '🔥', color: '#ea580c' },
    rukkun:     { label: 'Rukkun',     emoji: '💸', color: '#be123c' },
    samskipti:  { label: 'Samskipti',  emoji: '📞', color: '#d97706' },
  };

  // ── state ─────────────────────────────────────────────────────────────────
  // groups: [{ base_id, nafn, mails:[Mail], last_in, last_out, cut, open:[Mail], needs_reply, _open }]
  // Mail (normalized): { id, subject, sender_name, sender_email, snippet, received_at, fra_okkur, is_question, via }
  const STATE = {
    groups: [],
    briefs: new Map(),    // mail id -> AI brief {summary,ask,details,contact,important,needs_action,urgency,reply_hint,flokkur}
    promoted: new Set(),  // channel_ref already on Þjónustuborð
    freshestOut: '',      // nýjasti fra_okkur póstur (til að meta innsognstöf)
    filter: 'need',       // 'need' | 'all'
    search: '',
    loading: false,
    loaded: false,
  };

  // ── CSS ─────────────────────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('tvp-css')) return;
    const s = document.createElement('style');
    s.id = 'tvp-css';
    s.textContent = `
      #${VIEW_ID}{ --tvp-ink:#16181d; --tvp-mut:#64748b; }
      .tvp-wrap{ max-width:1100px; margin:0 auto; padding:16px 18px 90px; font:14px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif; color:var(--tvp-ink); }
      .tvp-head{ display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:12px; }
      .tvp-title{ font-size:21px; font-weight:900; letter-spacing:-.01em; display:flex; align-items:center; gap:9px; }
      .tvp-sub{ color:var(--tvp-mut); font-size:12.5px; margin-top:1px; }
      .tvp-tools{ display:flex; gap:8px; align-items:center; margin-left:auto; flex-wrap:wrap; }
      .tvp-search{ border:1px solid #d7dde8; border-radius:9px; padding:8px 12px; font-size:13px; min-width:210px; background:#fff; }
      .tvp-seg{ display:inline-flex; background:#eef1f6; border-radius:9px; padding:3px; }
      .tvp-seg button{ border:0; background:transparent; padding:6px 13px; border-radius:7px; font:700 12.5px system-ui; color:#475569; cursor:pointer; }
      .tvp-seg button.on{ background:#fff; color:#0f172a; box-shadow:0 1px 3px rgba(15,23,42,.16); }
      .tvp-btn{ border:1px solid #d0d7e2; background:#fff; color:#1f2937; border-radius:9px; padding:8px 13px; font:700 12.5px system-ui; cursor:pointer; white-space:nowrap; display:inline-flex; align-items:center; gap:6px; }
      .tvp-btn:hover{ background:#f6f8fc; }
      .tvp-btn.dark{ background:linear-gradient(180deg,#2f333b,#191b20); color:#f1f5f9; border-color:#0a0b0d; box-shadow:inset 0 1px 0 rgba(255,255,255,.1); }
      .tvp-btn.prim{ background:#1d4ed8; border-color:#1d4ed8; color:#fff; }
      .tvp-btn:disabled{ opacity:.5; cursor:default; }
      .tvp-note{ background:#fffbeb; border:1px solid #fde68a; color:#92400e; border-radius:10px; padding:8px 12px; font-size:12px; margin-bottom:12px; display:flex; gap:8px; align-items:flex-start; }
      .tvp-card{ background:#fff; border:1px solid #e6eaf1; border-radius:14px; margin-bottom:12px; box-shadow:0 2px 12px -6px rgba(15,23,42,.22); overflow:hidden; }
      .tvp-chead{ display:flex; align-items:center; gap:11px; padding:13px 15px; cursor:pointer; border-left:5px solid transparent; }
      .tvp-card.need .tvp-chead{ border-left-color:#f59e0b; }
      .tvp-card.done .tvp-chead{ border-left-color:#10b981; }
      .tvp-cbadge{ width:34px; height:34px; border-radius:9px; background:#eef2ff; color:#3730a3; font-weight:800; font-size:15px; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
      .tvp-cname{ font-weight:800; font-size:15.5px; }
      .tvp-cmeta{ color:var(--tvp-mut); font-size:11.5px; margin-top:1px; display:flex; gap:8px; flex-wrap:wrap; }
      .tvp-state{ margin-left:auto; font-weight:800; font-size:12px; padding:5px 11px; border-radius:99px; white-space:nowrap; flex:0 0 auto; }
      .tvp-state.need{ background:#fff7ed; color:#b45309; border:1px solid #fed7aa; }
      .tvp-state.done{ background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; }
      .tvp-caret{ color:#94a3b8; font-size:13px; transition:transform .15s; }
      .tvp-card.open .tvp-caret{ transform:rotate(90deg); }
      .tvp-body{ display:none; padding:2px 15px 14px; }
      .tvp-card.open .tvp-body{ display:block; }
      .tvp-mail{ border:1px solid #eef1f6; border-radius:11px; padding:10px 12px; margin-top:9px; background:#fcfdff; }
      .tvp-mail.out{ background:#f5f7fb; border-style:dashed; }
      .tvp-mrow{ display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
      .tvp-dir{ font-size:11px; font-weight:800; padding:1px 7px; border-radius:6px; }
      .tvp-dir.in{ background:#eff6ff; color:#1d4ed8; }
      .tvp-dir.out{ background:#f1f5f9; color:#475569; }
      .tvp-msubj{ font-weight:800; font-size:13.5px; }
      .tvp-when{ color:var(--tvp-mut); font-size:11.5px; margin-left:auto; white-space:nowrap; }
      .tvp-open{ font-size:10px; font-weight:800; color:#b45309; background:#fff7ed; border:1px solid #fed7aa; padding:1px 6px; border-radius:6px; }
      .tvp-snip{ white-space:pre-wrap; color:#334155; font-size:12.5px; margin:6px 0 0; background:#fff; border-left:3px solid #dbe2ec; padding:6px 10px; border-radius:0 7px 7px 0; }
      .tvp-brief{ border:1.5px solid #c7d2fe; background:linear-gradient(180deg,#f5f7ff,#eef2ff); border-radius:11px; padding:9px 11px; margin-top:8px; }
      .tvp-brief .lead{ font-size:10.5px; font-weight:900; color:#4338ca; letter-spacing:.05em; margin-bottom:4px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
      .tvp-briefsum{ font-size:13.5px; font-weight:700; color:#1e293b; }
      .tvp-ask{ font-size:12.5px; color:#334155; margin-top:3px; }
      .tvp-details{ display:flex; flex-wrap:wrap; gap:6px; margin-top:7px; }
      .tvp-kv{ display:inline-flex; align-items:baseline; gap:5px; background:#fff; border:1px solid #dbe2f2; border-radius:8px; padding:3px 9px; font-size:11.5px; }
      .tvp-kv b{ color:#475569; font-weight:800; }
      .tvp-kv span{ color:#0f172a; font-weight:700; }
      .tvp-contact{ margin-top:7px; font-size:12px; color:#334155; display:flex; gap:12px; flex-wrap:wrap; }
      .tvp-contact a{ color:#0d9488; font-weight:700; text-decoration:none; }
      .tvp-hint{ font-size:12px; color:#3730a3; margin-top:6px; }
      .tvp-hint b{ font-weight:800; }
      .tvp-chip{ display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:800; padding:2px 9px; border-radius:99px; white-space:nowrap; }
      .tvp-imp{ background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }
      .tvp-noact{ background:#f1f5f9; color:#64748b; border:1px solid #e2e8f0; }
      .tvp-acts{ display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
      .tvp-empty{ text-align:center; color:#94a3b8; padding:52px 16px; font-size:14px; }
      .tvp-empty b{ color:#64748b; }
      .tvp-load{ text-align:center; color:#64748b; padding:44px 16px; }
      /* reply modal */
      #tvp-backdrop{ position:fixed; inset:0; background:rgba(10,12,18,.55); z-index:100086; }
      #tvp-modal{ position:fixed; top:4vh; left:50%; transform:translateX(-50%); width:min(680px,95vw); max-height:92vh; display:flex; flex-direction:column; z-index:100087; background:#fff; border-radius:14px; box-shadow:0 30px 80px rgba(0,0,0,.5); overflow:hidden; font:13px/1.5 system-ui; }
      #tvp-modal .mhead{ display:flex; align-items:center; gap:9px; background:linear-gradient(180deg,#2e3037,#17181c); color:#e2e8f0; padding:12px 15px; }
      #tvp-modal .mhead h3{ margin:0; font-size:14px; }
      #tvp-modal .mhead .sub{ color:#94a3b8; font-size:11.5px; }
      #tvp-modal .mbody{ padding:13px 15px; overflow-y:auto; }
      #tvp-modal label{ display:block; font-size:11px; font-weight:800; color:#475569; text-transform:uppercase; letter-spacing:.05em; margin:9px 0 4px; }
      #tvp-modal input, #tvp-modal textarea{ width:100%; border:1px solid #d7dde8; border-radius:9px; padding:9px 11px; font:13px system-ui; box-sizing:border-box; }
      #tvp-modal textarea{ min-height:190px; resize:vertical; line-height:1.55; }
      #tvp-modal .mfoot{ display:flex; align-items:center; gap:9px; padding:11px 15px; border-top:1px solid #eef1f6; flex-wrap:wrap; }
      #tvp-modal .mmsg{ font-size:12px; font-weight:700; }
      #tvp-modal .mmsg.ok{ color:#047857; } #tvp-modal .mmsg.bad{ color:#b91c1c; }
      #tvp-modal .mx{ margin-left:auto; }
      @media (max-width:640px){ .tvp-wrap{ padding:12px 11px 90px; } .tvp-state{ margin-left:0; } #tvp-modal{ top:0; width:100vw; max-height:100vh; border-radius:0; } }
    `;
    document.head.appendChild(s);
  }

  // ── per-group compute (patch 286 cutOf + eigin merki + recency + auto-sendendur) ─
  function computeGroup(g, handled) {
    g.mails.sort((a, b) => String(b.received_at).localeCompare(String(a.received_at)));
    const realIn = g.mails.filter((m) => !m.fra_okkur && !isAuto(m));
    const outs = g.mails.filter((m) => m.fra_okkur);
    g.last_in = realIn.length ? realIn[0].received_at : '';
    g.last_out = outs.length ? outs[0].received_at : '';
    const hm = (handled && handled[g.base_id]) || '';
    g.cut = [g.last_out, hm].filter(Boolean).sort().pop() || '';   // seinni af: svar okkar / handvirkt merki
    g.open = realIn.filter((m) => m.is_question && String(m.received_at) > String(g.cut) && (daysAgo(m.received_at) == null || daysAgo(m.received_at) <= RECENCY_DAYS));
    g.needs_reply = actionableOpen(g).length > 0;
  }
  // Opnar spurningar sem AI hefur EKKI merkt „þarf ekkert svar" (default: telst með).
  function actionableOpen(g) { return (g.open || []).filter((m) => { const b = STATE.briefs.get(m.id); return !b || b.needs_action !== false; }); }

  // ── DATA LAYER (felag_samskipti VIEW ⇐ email_digest; staðfest 2026-08-19) ─────
  async function loadData() {
    const sb = getSB(); if (!sb) throw new Error('DB.sb vantar');
    STATE.loading = true;

    // 1) Fyrirtæki í þjónustu → sett af customer_base_id (grúppun + sía). Base telst
    //    „í þjónustu" ef EITTHVERT hús þess er í þjónustu (er_i_thjonustu á húsi).
    const inService = new Set();
    try {
      const { data } = await sb.from('fyrirtaeki')
        .select('customer_base_id').eq('er_i_thjonustu', true).is('deleted_at', null).not('customer_base_id', 'is', null).limit(6000);
      (data || []).forEach((f) => { if (f.customer_base_id != null) inService.add(f.customer_base_id); });
    } catch (_) {}

    // 2) Nýleg samskipti (báðar áttir). Nafn kúnnans = felag_nafn (customers_base.nafn).
    let rows = [];
    try {
      const { data, error } = await sb.from('felag_samskipti')
        .select('email_id,customer_base_id,felag_nafn,fyrirtaeki_nafn,sender_name,sender_email,subject,snippet,is_question,fra_okkur,received_at,via')
        .not('customer_base_id', 'is', null)
        .order('received_at', { ascending: false }).limit(3000);
      if (error) throw error;
      rows = data || [];
    } catch (e) { STATE.loading = false; throw e; }

    // 3) Hvað er þegar á Þjónustuborðinu (channel_ref='email:<id>') → forðast tvítak.
    STATE.promoted = new Set();
    try {
      const { data } = await sb.from('thjonustubeidni').select('channel_ref').eq('source', 'email').is('deleted_at', null).limit(5000);
      (data || []).forEach((r) => { if (r.channel_ref) STATE.promoted.add(r.channel_ref); });
    } catch (_) {}

    // 4) Grúppa per kúnna (aðeins fyrirtæki í þjónustu).
    const byId = new Map();
    let freshestOut = '';
    for (const r of rows) {
      const id = r.customer_base_id;
      if (!inService.has(id)) continue;
      let g = byId.get(id);
      if (!g) { g = { base_id: id, nafn: r.felag_nafn || r.fyrirtaeki_nafn || 'Óþekkt fyrirtæki', mails: [], _open: false }; byId.set(id, g); }
      const mail = {
        id: r.email_id, subject: r.subject || '(ekkert efni)',
        sender_name: r.sender_name || '', sender_email: r.sender_email || '',
        snippet: r.snippet || '', is_question: r.is_question === true,
        fra_okkur: r.fra_okkur === true, received_at: r.received_at || '', via: r.via || '',
      };
      g.mails.push(mail);
      if (mail.fra_okkur && String(mail.received_at) > freshestOut) freshestOut = mail.received_at;
    }
    STATE.freshestOut = freshestOut;

    // 5) Reikna svarstöðu per kúnna.
    const handled = loadHandled();
    const groups = [];
    for (const g of byId.values()) { computeGroup(g, handled); groups.push(g); }
    groups.sort((a, b) => (Number(b.needs_reply) - Number(a.needs_reply)) || String(b.last_in).localeCompare(String(a.last_in)));
    STATE.groups = groups;
    STATE.loading = false; STATE.loaded = true;
  }

  const visibleGroups = () => {
    const q = STATE.search.trim().toLowerCase();
    return STATE.groups.filter((g) => {
      if (STATE.filter === 'need' && !g.needs_reply) return false;
      if (q) {
        const hay = (g.nafn + ' ' + g.mails.map((m) => m.subject + ' ' + m.snippet + ' ' + m.sender_email).join(' ')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  };

  // ── AI-yfirlit (batch, mode:'thjonustuver') ──────────────────────────────────
  async function analyzeGroup(g, btn) {
    const targets = (g.open.length ? g.open : g.mails.filter((m) => !m.fra_okkur && !isAuto(m))).filter((m) => !STATE.briefs.has(m.id)).slice(0, 12);
    if (!targets.length) { render(); return; }
    if (btn) { btn.disabled = true; btn.textContent = '✨ Greini…'; }
    try {
      const r = await fetch('/api/postur-triage', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'thjonustuver',
          items: targets.map((m) => ({ id: m.id, title: m.subject, notes: m.snippet, customer_nafn: g.nafn })),
        }),
      });
      const out = await r.json();
      if (!r.ok) { toast('AI-villa: ' + (out.error || r.status), true); return; }
      const results = out.results || {};
      Object.keys(results).forEach((id) => STATE.briefs.set(id, results[id]));
      computeGroup(g, loadHandled());   // needs_action gæti hafa þaggað niður opna spurningu
    } catch (e) { toast('Netvilla: ' + (e.message || e), true); return; }
    finally { if (btn) btn.disabled = false; }
    render();
  }

  // ── Merkja svarað (eigin merki — lifir endurhleðslu, óháð innsognstöf) ────────
  function markHandled(g) {
    const h = loadHandled(); h[g.base_id] = nowIso(); saveHandled(h);
    computeGroup(g, h);
    toast('✓ Merkt svarað: ' + g.nafn);
    render();
  }

  // ── Flytja á Þjónustuborð ────────────────────────────────────────────────────
  async function promote(g) {
    const sb = getSB(); if (!sb) return;
    const m = g.open[0] || g.mails.filter((x) => !x.fra_okkur && !isAuto(x))[0] || g.mails[0];
    if (!m) return;
    const ref = 'email:' + m.id;
    if (STATE.promoted.has(ref)) { toast('Þegar á Þjónustuborði'); return; }
    const brief = STATE.briefs.get(m.id) || {};
    const row = {
      title: m.subject || ('Póstur frá ' + g.nafn),
      notes: m.snippet || '',
      customer_base_id: g.base_id, customer_nafn: g.nafn,
      source: 'email', created_by: 'thjonustuver-postar', channel_ref: ref,
      status: 'nytt', created_at: nowIso(),
    };
    if (brief.summary) row.summary = brief.summary;
    if (brief.flokkur && FLOKKAR[brief.flokkur]) row.flokkur = brief.flokkur;
    if (brief.important === true) row.important = true;
    try {
      const r = await sb.from('thjonustubeidni').insert(row); if (r.error) throw r.error;
      STATE.promoted.add(ref);
      toast('→ Flutt á Þjónustuborð: ' + g.nafn);
    } catch (e) { toast('Villa: ' + (e.message || e), true); return; }
    render();
  }

  // ── Svara (uppkast → yfirferð → sending) ─────────────────────────────────────
  let MODAL = null;
  function closeModal() { ['tvp-backdrop', 'tvp-modal'].forEach((id) => { const e = document.getElementById(id); if (e) e.remove(); }); MODAL = null; document.removeEventListener('keydown', onModalKey); }
  function onModalKey(e) { if (e.key === 'Escape') closeModal(); }
  function openReply(g) {
    const m = g.open[0] || g.mails.filter((x) => !x.fra_okkur && !isAuto(x))[0];
    if (!m) { toast('Enginn póstur frá kúnna til að svara'); return; }
    injectCSS(); closeModal();
    const bd = document.createElement('div'); bd.id = 'tvp-backdrop'; bd.addEventListener('click', closeModal);
    const md = document.createElement('div'); md.id = 'tvp-modal';
    md.innerHTML =
      '<div class="mhead"><div><h3>✍️ Svara — ' + esc(g.nafn) + '</h3>' +
        '<div class="sub">Til: ' + esc(m.sender_email || m.sender_name || '—') + '</div></div>' +
        '<button class="tvp-btn mx" id="tvp-mx" style="background:#23252c;color:#e2e8f0;border-color:#3a3d45">✕</button></div>' +
      '<div class="mbody">' +
        '<div style="background:#f8fafc;border:1px solid #eef1f6;border-radius:9px;padding:8px 11px;font-size:12px;color:#334155">' +
          '<b>' + esc(m.subject || '') + '</b><div style="white-space:pre-wrap;margin-top:4px;max-height:120px;overflow:auto">' + esc(m.snippet || '') + '</div></div>' +
        '<label>Efni</label><input id="tvp-subj" value="' + esc('Re: ' + (m.subject || '')) + '">' +
        '<label>Leiðbeining til AI (valfrjálst)</label><input id="tvp-instr" placeholder="t.d. „staðfestu að við sendum reikning á morgun"">' +
        '<label>Svar</label><textarea id="tvp-reply" placeholder="Skrifaðu svar — eða ýttu á ✨ Semja uppkast"></textarea>' +
      '</div>' +
      '<div class="mfoot">' +
        '<button class="tvp-btn dark" id="tvp-gen">✨ Semja uppkast</button>' +
        '<span class="mmsg" id="tvp-mmsg"></span>' +
        '<button class="tvp-btn mx" id="tvp-cancel">Hætta við</button>' +
        '<button class="tvp-btn prim" id="tvp-send">📤 Senda svar</button>' +
      '</div>';
    document.body.appendChild(bd); document.body.appendChild(md);
    MODAL = { g, m };
    document.addEventListener('keydown', onModalKey);
    document.getElementById('tvp-mx').addEventListener('click', closeModal);
    document.getElementById('tvp-cancel').addEventListener('click', closeModal);
    document.getElementById('tvp-gen').addEventListener('click', genReply);
    document.getElementById('tvp-send').addEventListener('click', sendReply);
  }
  const mSet = (t, cls) => { const el = document.getElementById('tvp-mmsg'); if (el) { el.textContent = t; el.className = 'mmsg ' + (cls || ''); } };
  async function genReply() {
    if (!MODAL) return;
    const { g, m } = MODAL;
    const gen = document.getElementById('tvp-gen'); const ta = document.getElementById('tvp-reply'); const subj = document.getElementById('tvp-subj');
    gen.disabled = true; mSet('Semur uppkast…');
    try {
      const r = await fetch('/api/postur-reply', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: { sender_name: m.sender_name, sender_email: m.sender_email, subject: m.subject, body: m.snippet || '' },
          customer: { name: g.nafn, kt: '' },
          instruction: (document.getElementById('tvp-instr').value || '').trim(),
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
      if (d.body) ta.value = d.body;
      if (d.subject && subj) subj.value = d.subject;
      mSet('✓ Uppkast tilbúið — yfirfarðu það', 'ok');
    } catch (e) { mSet('Villa: ' + (e.message || e), 'bad'); }
    finally { gen.disabled = false; }
  }
  async function sendReply() {
    if (!MODAL) return;
    const { g, m } = MODAL;
    const to = (m.sender_email || '').trim();
    const subject = (document.getElementById('tvp-subj').value || '').trim() || ('Re: ' + (m.subject || ''));
    const bodyTxt = (document.getElementById('tvp-reply').value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { mSet('Netfang kúnnans er ógilt', 'bad'); return; }
    if (!bodyTxt) { mSet('Svarið er tómt', 'bad'); return; }
    if (!window.confirm('Senda svar á ' + to + '?')) return;
    const btn = document.getElementById('tvp-send'); btn.disabled = true; mSet('Sendi…');
    const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#0f172a;white-space:pre-wrap;line-height:1.6">' + esc(bodyTxt) + '</div>';
    try {
      const payload = { from: emailFrom(), to: [to], subject, html };
      const r = await (window.AppMail ? window.AppMail.send(payload)
        : fetch('/api/email-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || e.error || ('HTTP ' + r.status)); }
      mSet('✓ Svar sent á ' + to, 'ok');
      toast('✓ Svar sent á ' + to);
      markHandled(g);   // eigin merki → helst svarað þótt sendur póstur sé ólesinn inn
      setTimeout(() => { closeModal(); render(); }, 1000);
    } catch (e) { mSet('Villa: ' + (e.message || e), 'bad'); btn.disabled = false; }
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  function briefHtml(m) {
    const b = STATE.briefs.get(m.id);
    if (!b) return '';
    const det = (b.details || []).map((d) => '<span class="tvp-kv"><b>' + esc(d.label) + '</b><span>' + esc(d.value) + '</span></span>').join('');
    const c = b.contact || null;
    const contact = c ? '<div class="tvp-contact">' +
      (c.name ? '<span>👤 ' + esc(c.name) + '</span>' : '') +
      (c.phone ? '<span>📞 <a href="tel:' + esc(c.phone) + '">' + esc(c.phone) + '</a></span>' : '') +
      (c.email ? '<span>✉️ <a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a></span>' : '') + '</div>' : '';
    const fl = (b.flokkur && FLOKKAR[b.flokkur]) ? '<span class="tvp-chip" style="background:' + FLOKKAR[b.flokkur].color + '18;color:' + FLOKKAR[b.flokkur].color + ';border:1px solid ' + FLOKKAR[b.flokkur].color + '44">' + FLOKKAR[b.flokkur].emoji + ' ' + esc(FLOKKAR[b.flokkur].label) + '</span>' : '';
    return '<div class="tvp-brief">' +
      '<div class="lead">✨ AI-YFIRLIT' + (b.important ? ' <span class="tvp-chip tvp-imp">❗ ÁRÍÐANDI</span>' : '') + (b.needs_action === false ? ' <span class="tvp-chip tvp-noact">✓ Þarf ekkert svar</span>' : '') + ' ' + fl + '</div>' +
      (b.summary ? '<div class="tvp-briefsum">' + esc(b.summary) + '</div>' : '') +
      (b.ask ? '<div class="tvp-ask">' + esc(b.ask) + '</div>' : '') +
      (det ? '<div class="tvp-details">' + det + '</div>' : '') +
      contact +
      (b.reply_hint ? '<div class="tvp-hint"><b>Næsta skref:</b> ' + esc(b.reply_hint) + '</div>' : '') +
    '</div>';
  }
  function mailHtml(g, m) {
    const isOpen = g.open.some((x) => x.id === m.id);
    return '<div class="tvp-mail' + (m.fra_okkur ? ' out' : '') + '">' +
      '<div class="tvp-mrow">' +
        '<span class="tvp-dir ' + (m.fra_okkur ? 'out' : 'in') + '">' + (m.fra_okkur ? '← Frá okkur' : '→ Frá kúnna') + '</span>' +
        '<span class="tvp-msubj">' + esc(m.subject) + '</span>' +
        (isOpen ? '<span class="tvp-open">OPIN SPURNING</span>' : '') +
        '<span class="tvp-when">' + dtime(m.received_at) + '</span>' +
      '</div>' +
      (m.snippet ? '<div class="tvp-snip">' + esc(m.snippet) + '</div>' : '') +
      (m.fra_okkur ? '' : briefHtml(m)) +
    '</div>';
  }
  function groupHtml(g) {
    const open = g._open === true;
    const initials = (g.nafn || '?').trim().slice(0, 2).toUpperCase();
    const dgo = daysAgo(g.last_in);
    const meta = [];
    if (g.last_in) meta.push('Síðast frá kúnna: ' + dt(g.last_in) + (dgo != null ? ' (' + (dgo === 0 ? 'í dag' : dgo + ' d.') + ')' : ''));
    meta.push(g.mails.length + ' póstar');
    const actN = actionableOpen(g).length;
    const shown = open ? g.mails : g.mails.slice(0, Math.max(g.open.length, 1));
    const promoteId = 'email:' + ((g.open[0] || g.mails[0] || {}).id);
    return '<div class="tvp-card ' + (g.needs_reply ? 'need' : 'done') + (open ? ' open' : '') + '" data-base="' + esc(g.base_id) + '">' +
      '<div class="tvp-chead" data-toggle="' + esc(g.base_id) + '">' +
        '<div class="tvp-cbadge">' + esc(initials) + '</div>' +
        '<div style="min-width:0"><div class="tvp-cname">🏢 ' + esc(g.nafn) + '</div><div class="tvp-cmeta">' + esc(meta.join(' · ')) + '</div></div>' +
        '<span class="tvp-state ' + (g.needs_reply ? 'need' : 'done') + '">' + (g.needs_reply ? '⚠️ Vantar svar' + (actN > 1 ? ' (' + actN + ')' : '') : '✅ Svarað') + '</span>' +
        '<span class="tvp-caret">▶</span>' +
      '</div>' +
      '<div class="tvp-body">' +
        shown.map((m) => mailHtml(g, m)).join('') +
        '<div class="tvp-acts">' +
          '<button class="tvp-btn prim" data-act="reply" data-base="' + esc(g.base_id) + '">✍️ Svara</button>' +
          '<button class="tvp-btn dark" data-act="ai" data-base="' + esc(g.base_id) + '">✨ AI-yfirlit</button>' +
          (g.needs_reply ? '<button class="tvp-btn" data-act="mark" data-base="' + esc(g.base_id) + '">✓ Merki svarað</button>' : '') +
          (STATE.promoted.has(promoteId) ?
            '<button class="tvp-btn" disabled>✓ Á Þjónustuborði</button>' :
            '<button class="tvp-btn" data-act="promote" data-base="' + esc(g.base_id) + '">→ Flytja á Þjónustuborð</button>') +
        '</div>' +
      '</div>' +
    '</div>';
  }
  function freshnessNote() {
    const host = document.getElementById('tvp-note'); if (!host) return;
    const d = daysAgo(STATE.freshestOut);
    if (STATE.loaded && d != null && d >= 3) {
      host.style.display = 'flex';
      host.innerHTML = '<span>ℹ️</span><span>Sendur póstur okkar hefur ekki lesist inn síðan <b>' + esc(dt(STATE.freshestOut)) + '</b> (' + d + ' d.). ' +
        'Svör sem send eru eftir það sjást ekki sjálfkrafa — svör send héðan og „✓ Merki svarað" haldast samt. AI merkir „takk"-pósta sem þarfnast einskis.</span>';
    } else { host.style.display = 'none'; }
  }
  function render() {
    const host = document.getElementById('tvp-list');
    if (!host) return;
    freshnessNote();
    const groups = visibleGroups();
    const needN = STATE.groups.filter((g) => g.needs_reply).length;
    const sub = document.getElementById('tvp-subline');
    if (sub) sub.textContent = STATE.loaded ? (STATE.groups.length + ' fyrirtæki í þjónustu með póstsamskipti · ' + needN + ' vantar svar') : '';
    const segNeed = document.getElementById('tvp-seg-need'), segAll = document.getElementById('tvp-seg-all');
    if (segNeed) { segNeed.textContent = '⚠️ Vantar svar (' + needN + ')'; segNeed.classList.toggle('on', STATE.filter === 'need'); }
    if (segAll) { segAll.textContent = 'Allir (' + STATE.groups.length + ')'; segAll.classList.toggle('on', STATE.filter === 'all'); }
    if (STATE.loading && !STATE.loaded) { host.innerHTML = '<div class="tvp-load">Sæki póstsamskipti…</div>'; return; }
    if (!groups.length) {
      host.innerHTML = '<div class="tvp-empty">' + (STATE.filter === 'need'
        ? '<b>✅ Öllum póstum svarað.</b><br>Engin fyrirtæki í þjónustu bíða eftir svari.'
        : (STATE.search ? 'Ekkert fannst fyrir „' + esc(STATE.search) + '".' : 'Engin póstsamskipti fundust.')) + '</div>';
      return;
    }
    host.innerHTML = groups.map(groupHtml).join('');
    const byBase = (el) => STATE.groups.find((x) => String(x.base_id) === el.getAttribute('data-base'));
    host.querySelectorAll('[data-toggle]').forEach((el) => el.addEventListener('click', () => { const g = STATE.groups.find((x) => String(x.base_id) === el.getAttribute('data-toggle')); if (g) { g._open = !g._open; render(); } }));
    host.querySelectorAll('[data-act="reply"]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const g = byBase(b); if (g) openReply(g); }));
    host.querySelectorAll('[data-act="ai"]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const g = byBase(b); if (g) analyzeGroup(g, b); }));
    host.querySelectorAll('[data-act="mark"]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const g = byBase(b); if (g) markHandled(g); }));
    host.querySelectorAll('[data-act="promote"]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); const g = byBase(b); if (g) promote(g); }));
  }

  // ── page shell (Pattern A — sbr. patch 231) ──────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala') || document.querySelector('.view');
    if (!sample || !sample.parentElement) return;
    injectCSS();
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = (sample.className || 'view').replace(/\bactive\b/g, '').trim();
    v.innerHTML =
      '<div class="tvp-wrap">' +
        '<div class="tvp-head">' +
          '<div><div class="tvp-title">📨 Þjónustuver póstar</div><div class="tvp-sub" id="tvp-subline"></div></div>' +
          '<div class="tvp-tools">' +
            '<div class="tvp-seg"><button id="tvp-seg-need">⚠️ Vantar svar</button><button id="tvp-seg-all">Allir</button></div>' +
            '<input class="tvp-search" id="tvp-search" type="search" placeholder="Leita (kúnni · efni · netfang)…">' +
            '<button class="tvp-btn" id="tvp-refresh">🔄 Uppfæra</button>' +
          '</div>' +
        '</div>' +
        '<div class="tvp-note" id="tvp-note" style="display:none"></div>' +
        '<div id="tvp-list"><div class="tvp-load">Sæki póstsamskipti…</div></div>' +
      '</div>';
    sample.parentElement.appendChild(v);
    v.querySelector('#tvp-seg-need').addEventListener('click', () => { STATE.filter = 'need'; render(); });
    v.querySelector('#tvp-seg-all').addEventListener('click', () => { STATE.filter = 'all'; render(); });
    v.querySelector('#tvp-refresh').addEventListener('click', () => reload());
    const si = v.querySelector('#tvp-search');
    si.addEventListener('input', () => { STATE.search = si.value; render(); });
  }
  function show() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach((v) => { v.style.display = 'none'; v.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    if (v) { v.style.display = 'block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === NAV_KEY));
    try { if (location.hash !== '#' + NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    render();
    if (!STATE.loaded && !STATE.loading) load();
  }
  async function load() {
    try { STATE.loading = true; render(); await loadData(); render(); autoAnalyze(); }
    catch (e) { const h = document.getElementById('tvp-list'); if (h) h.innerHTML = '<div class="tvp-empty" style="color:#b91c1c"><b>Villa við að sækja gögn:</b><br>' + esc(e.message || e) + '</div>'; STATE.loading = false; }
  }
  function reload() { STATE.loaded = false; STATE.loading = false; STATE.groups = []; STATE.briefs = new Map(); load(); }
  // Sjálfvirkt AI-yfirlit fyrir efstu „vantar svar" kúnnana svo góð samantekt
  // birtist strax þar sem hún skiptir máli (bundið til að spara kostnað).
  async function autoAnalyze() {
    const need = STATE.groups.filter((g) => g.needs_reply).slice(0, 6);
    for (const g of need) { try { await analyzeGroup(g, null); } catch (_) {} }
  }

  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 600); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const tpl = nav.querySelector('.vnav-btn');
    if (!tpl) { setTimeout(injectNav, 600); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = NAV_LABEL;
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); });
    nav.appendChild(btn);
  }
  function patchSwitchView() {
    if (!window.App || window.App._tvpSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      const mine = document.getElementById(VIEW_ID); if (mine) { mine.style.display = 'none'; mine.classList.remove('active'); }
      return orig.apply(this, arguments);
    };
    window.App._tvpSwitchPatched = true;
  }
  function openFromHash() {
    const slug = (location.hash || '').replace(/^#/, '');
    if (slug === NAV_KEY) { if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); }
  }
  function boot() {
    injectNav();
    patchSwitchView();
    ensureView();               // svo patch 218 geti leyst #thjonustuver-postar strax
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
    setTimeout(() => { injectNav(); patchSwitchView(); }, 1600);   // lifa af sidebar-endursmíði
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.ThjonustuverPostar = { open: show, reload };
  console.log('[patch-309] Þjónustuver póstar installed');
})();
