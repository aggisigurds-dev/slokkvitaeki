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
 * READ-ONLY: engin sending/skrif í þessari útgáfu. Aðgerðir opna kúnna / sögu.
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
  };

  const PAYDAY_RE = /payday\.is/i;
  const NOREPLY_RE = /no[-_.]?reply|do[-_.]?not[-_.]?reply|noreply|donotreply|automated|mailer-daemon/i;
  const SYSTEM_RE = /(rsk\.is|microsoft\.com|accountprotection|google\.com|cloudflare|unimaze\.com|facebook|linkedin|apple\.com|paypal|stripe)/i;

  // ── data ──────────────────────────────────────────────────────────────────
  async function load() {
    const SB = getSB();
    if (!SB) { state.err = 'Engin gagnabankatenging.'; render(); return; }
    state.loading = true; render();
    try {
      const [em, fy, cb, vd, sl] = await Promise.all([
        SB.from('email_digest')
          .select('message_id,account,sender_name,sender_email,to_addresses,subject,snippet,body_preview,is_question,has_attachment,attachment_names,received_at')
          .in('account', ['eldklar@eldklar.is', 'bokhald@eldklar.is'])
          .order('received_at', { ascending: false })
          .limit(600),
        SB.from('fyrirtaeki').select('id,nafn,kennitala,netfang').not('netfang', 'is', null),
        SB.from('customers_base').select('id,nafn,kennitala,netfang').not('netfang', 'is', null),
        SB.from('vidskiptavinir').select('id,nafn,kennitala,netfang').not('netfang', 'is', null),
        SB.from('solur').select('id,num,customer_nafn,customer_kt,samtals,created_at,greitt_med,paid_at').order('created_at', { ascending: false }).limit(2500),
      ]);
      if (em.error) throw em.error;

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
      V + '.rp-empty{padding:44px;text-align:center;color:#64748b;background:rgba(255,255,255,.75);border-radius:14px}',
      V + '.rp-err{padding:20px;color:#fecaca;background:#450a0a;border:1px solid #7f1d1d;border-radius:12px}',
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

  function counts() {
    const inbox = state.emails.filter(m => m.category === 'inbox' && !m.isSystem).length;
    const sent = state.emails.filter(m => m.category === 'sent').length;
    return { inbox, sent, all: state.emails.length };
  }

  function currentRows() {
    let rows = state.emails;
    if (state.filter === 'inbox') rows = rows.filter(m => m.category === 'inbox' && !m.isSystem);
    else if (state.filter === 'sent') rows = rows.filter(m => m.category === 'sent');
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

  function rowHTML(m) {
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
    if (m.cust && (m.cust.coId || m.cust.kt)) {
      acts.push('<button class="rp-btn _rp-open" ' + (m.cust.coId ? 'data-co="' + esc(String(m.cust.coId)) + '" ' : '') + (m.cust.kt ? 'data-kt="' + esc(ktDigits(m.cust.kt)) + '" ' : '') + 'type="button">Opna</button>');
      if (m.cust.kt) acts.push('<button class="rp-btn _rp-saga" data-kt="' + esc(ktDigits(m.cust.kt)) + '" type="button">Saga</button>');
    }
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
      body = rows.length ? '<div class="rp-list">' + rows.map(rowHTML).join('') + '</div>'
        : '<div class="rp-empty">' + (state.search ? 'Enginn póstur passar við leitina.' : 'Engir póstar í þessum flokki.') + '</div>';
    }

    v.innerHTML =
      '<div class="rp-main">' +
        '<div class="rp-head">' +
          '<div class="rp-title"><h1>📧 Reikninga-póstur</h1><p>Póstar til eldklar@eldklar.is tengdir við kúnna og reikninga — það sem þarf svar efst.</p></div>' +
          '<button class="rp-reload" id="_rp-reload" type="button">↻ Endurhlaða</button>' +
        '</div>' +
        '<div class="rp-tools">' +
          chip('inbox', '📥 Til að svara', c.inbox) +
          chip('sent', '🧾 Sendir reikningar', c.sent) +
          chip('all', 'Allt', c.all) +
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

  // ── wiring (mirrors patch 239) ──────────────────────────────────────────
  function ensureSidebarButton() {
    if (document.querySelector('[data-view="' + NAV_KEY + '"]')) return true;
    const sib = document.querySelector('[data-view="krofu-yfirlit"]')
      || document.querySelector('[data-view="hreyfingarlisti"]')
      || document.querySelector('[data-view="bakendi"]')
      || document.querySelector('[data-view]');
    if (!sib) return false;
    const btn = sib.cloneNode(true);
    btn.dataset.view = NAV_KEY;
    const txtSpan = btn.querySelector('span:not([class*="icon"]):not([class*="badge"])');
    if (txtSpan) txtSpan.textContent = '📧 Reikninga-póstur';
    else for (const c of btn.childNodes) if (c.nodeType === 3 && c.nodeValue.trim()) { c.nodeValue = ' 📧 Reikninga-póstur'; break; }
    btn.querySelectorAll('.count, .badge, [class*="badge"], [class*="count"]').forEach(n => n.remove());
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
