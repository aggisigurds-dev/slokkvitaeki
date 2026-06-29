/* === AÐSTOÐARMIÐSTÖÐ — central tip-hub v1 (239) ============================
 *
 * Fasi 1B af „Aðstoðarmaður" vísíóninni (Agnar 2026-06-29).
 *
 * Sjálfstæð síða (view `view-adstodarmidstod`, slug `#adstod`) sem safnar
 * öllum ábendingum á einn stað:
 *
 *   🚨 Áríðandi — kt-flagged kúnnar (priority + urgent message)
 *   🔄 Duplicates — líklegir tvítekningar (sölur sömu daginn + svipuð upphæð)
 *   📋 Óloknar — sölur með status='draft' eldri en 7 daga
 *   🤖 Mín watchlist — punktar frá patch 238 (forwarder)
 *
 * Reglu-byggt fyrst. Þegar Fasi 2 (AI daglegt yfirferð) kemur, þá bætast
 * AI-tips í toppinn sem aukin section.
 *
 * Aðgengi: hliðarstiku-hnappur „🤖 Aðstoðarmiðstöð" + deep-link #adstod.
 * Frá 🤖 spjaldinu (patch 238) er line „Opna fulla miðstöð →" undirst foot.
 *
 * Engin DB-skrifa — bara lestir + sýnir + linkar í rétta gamla skjái.
 * Public API: window.Adstod = { open(), reload() }
 * ========================================================================== */
(() => {
  if (window.__adstodMidstodInstalled) return;
  window.__adstodMidstodInstalled = true;

  // NB: VIEW_ID must be `view-{NAV_KEY}` so patch 218 URL router can find it
  // via the slug → view-id convention when no ALIAS entry rewrites the slug.
  const VIEW_ID = 'view-adstod';
  const NAV_KEY = 'adstod';

  function getSB() { return (window.DB && window.DB.sb) || window.__vdaSB || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function fmtNum(n) { return (Number(n) || 0).toLocaleString('is-IS'); }
  function fmtKr(n) {
    if (n == null) return '—';
    return Math.round(n).toLocaleString('is-IS') + ' kr';
  }
  function fmtDate(d) {
    if (!d) return '—';
    const s = String(d).slice(0, 10), p = s.split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : s;
  }
  function relTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso); if (isNaN(d)) return iso;
    const m = Math.floor((Date.now() - d.getTime()) / 60000);
    if (m < 60) return m + ' mín';
    const h = Math.floor(m / 60); if (h < 24) return h + ' klst';
    const dd = Math.floor(h / 24); if (dd === 1) return 'gær';
    if (dd < 7) return dd + ' dagar';
    return d.toLocaleDateString('is-IS');
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function daysAgoISO(n) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10); }

  const state = {
    loading: false, loaded: false, err: null,
    urgent: [],
    dupSales: [],
    staleDrafts: [],
    overdueEq: [],
    workshop: [],
    emails: [],
    watch: [],
    snoozed: new Set(),
  };
  const SNOOZE_KEY = 'adstod_snoozed_v1';

  function loadSnoozed() {
    try {
      const raw = JSON.parse(localStorage.getItem(SNOOZE_KEY) || '{}');
      const now = Date.now();
      const next = {};
      for (const k in raw) if (raw[k] > now) next[k] = raw[k];
      localStorage.setItem(SNOOZE_KEY, JSON.stringify(next));
      state.snoozed = new Set(Object.keys(next));
    } catch (_) { state.snoozed = new Set(); }
  }
  function snooze(id, hours) {
    try {
      const raw = JSON.parse(localStorage.getItem(SNOOZE_KEY) || '{}');
      raw[id] = Date.now() + hours * 3600000;
      localStorage.setItem(SNOOZE_KEY, JSON.stringify(raw));
      state.snoozed.add(id);
      render();
    } catch (_) {}
  }
  function isSnoozed(id) { return state.snoozed.has(id); }

  // ── Domain analyzers ────────────────────────────────────────────────────
  async function findUrgent() {
    // Customers with urgent message or priority >= 3 in AppSettings
    try {
      const ars = (window.AppSettings && AppSettings.path && AppSettings.path('arsskodun_customers')) || {};
      const cos = (window.Companies && Companies.list) || [];
      const map = new Map(cos.map(c => [String(c.id), c]));
      const out = [];
      for (const id in ars) {
        const a = ars[id] || {};
        const co = map.get(String(id));
        if (!co || co.deleted_at) continue;
        if ((a.urgent || '').trim()) {
          out.push({ kind: 'urgent', id: 'urg_' + id, co_id: id, co_nafn: co.nafn || '?',
                     title: '🚨 ' + co.nafn + ': ' + (a.urgent || '').trim(),
                     sub: 'Áríðandi skilaboð frá vettvangi' });
        } else if ((+a.priority || 0) >= 3) {
          out.push({ kind: 'urgent', id: 'pri_' + id, co_id: id, co_nafn: co.nafn || '?',
                     title: '🚩 ' + co.nafn + ' — forgangur ' + a.priority,
                     sub: 'Háforgangur skráður' });
        }
      }
      return out;
    } catch (e) { console.warn('findUrgent', e); return []; }
  }

  async function findDuplicateSales() {
    // Sales for the same customer + same day + total within 5%
    const SB = getSB(); if (!SB) return [];
    try {
      const since = daysAgoISO(60);
      const r = await SB.from('solur').select('id,num,customer_id,customer_nafn,samtals,created_at,status')
        .gte('created_at', since).eq('status', 'final').limit(2000);
      if (r.error) throw r.error;
      const rows = r.data || [];
      const byKey = new Map(); // "coId|YYYY-MM-DD" → list
      for (const s of rows) {
        if (!s.customer_id) continue;
        const day = (s.created_at || '').slice(0, 10);
        const key = s.customer_id + '|' + day;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push(s);
      }
      const out = [];
      for (const [key, group] of byKey) {
        if (group.length < 2) continue;
        // Within group, check pairwise total-similarity
        for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
          const a = group[i], b = group[j];
          const ta = +a.samtals || 0, tb = +b.samtals || 0;
          if (!ta || !tb) continue;
          const diff = Math.abs(ta - tb) / Math.max(ta, tb);
          if (diff <= 0.05) {
            out.push({
              kind: 'dup', id: 'dup_' + a.id + '_' + b.id,
              co_id: a.customer_id, co_nafn: a.customer_nafn || '?',
              title: 'Möguleg tvítekning · ' + (a.customer_nafn || '?'),
              sub: 'R-' + (a.num || '?') + ' (' + fmtKr(ta) + ') og R-' + (b.num || '?') + ' (' + fmtKr(tb) + ') sama dag ' + fmtDate(a.created_at),
              extra: { a, b },
            });
          }
        }
      }
      return out;
    } catch (e) { console.warn('findDuplicateSales', e); return []; }
  }

  async function findStaleDrafts() {
    // Sales with status='draft' older than 7 days
    const SB = getSB(); if (!SB) return [];
    try {
      const cutoff = daysAgoISO(7);
      const r = await SB.from('solur').select('id,num,customer_nafn,samtals,created_at,status')
        .eq('status', 'draft').lt('created_at', cutoff).order('created_at', { ascending: true }).limit(50);
      if (r.error) throw r.error;
      return (r.data || []).map(s => ({
        kind: 'stale', id: 'stale_' + s.id,
        title: 'Drög í bið · ' + (s.customer_nafn || '?'),
        sub: 'R-' + (s.num || '?') + ' frá ' + relTime(s.created_at) + ' · ' + fmtKr(s.samtals),
        sale_id: s.id,
      }));
    } catch (e) { console.warn('findStaleDrafts', e); return []; }
  }

  async function findStaleWorkshop() {
    // Equipment on the bench (status='loaned' = á verkstæði) loaned > 14 daga.
    const SB = getSB(); if (!SB) return [];
    try {
      const cutoff = daysAgoISO(14);
      const r = await SB.from('uttaeki').select('id,serial,type,client,loaned_at,custody_status,status')
        .or('status.eq.loaned,custody_status.eq.workshop').lt('loaned_at', cutoff).is('deleted_at', null).limit(100);
      if (r.error) throw r.error;
      const out = (r.data || []).map(u => ({
        kind: 'workshop', id: 'ws_' + u.id,
        title: '🔧 ' + (u.serial || '?') + ' · ' + (u.type || '') + ' í verkstæði',
        sub: (u.client || '?') + ' · síðan ' + relTime(u.loaned_at),
      }));
      return out.sort((a, b) => a.sub.localeCompare(b.sub));
    } catch (e) { console.warn('findStaleWorkshop', e); return []; }
  }

  async function findPriorityEmails() {
    // Fetch from brunaholf — recent_emails filtered to priority accounts.
    try {
      const r = await fetch('https://brunaholf.netlify.app/api/data-sources-status');
      if (!r.ok) return [];
      const d = await r.json();
      const PRI = new Set(['eldklar@eldklar.is', 'brunaholf@brunaholf.is']);
      const rows = (d.recent_emails || [])
        .filter(e => PRI.has((e.account || '').toLowerCase()))
        .slice(0, 8);
      return rows.map((e, i) => ({
        kind: 'email', id: 'eml_' + (e.received_at || i) + '_' + (e.account || ''),
        title: '📧 ' + (e.from || e.sender_email || '?') + ' · ' + (e.subject || '(án efnis)').slice(0, 80),
        sub: (e.account || '') + ' · ' + relTime(e.received_at),
      }));
    } catch (e) { console.warn('findPriorityEmails', e); return []; }
  }

  async function findOverdueEquipment() {
    // Customers with overdue uttaeki count > 3 (only flag a heavy load)
    const SB = getSB(); if (!SB) return [];
    try {
      const today = todayISO();
      const r = await SB.from('uttaeki').select('fyrirtaeki_id,client').lte('next_insp', today)
        .is('deleted_at', null).limit(5000);
      if (r.error) throw r.error;
      const cnt = new Map();
      for (const u of r.data || []) {
        const k = String(u.fyrirtaeki_id || u.client || '?');
        cnt.set(k, (cnt.get(k) || 0) + 1);
      }
      const cos = (window.Companies && Companies.list) || [];
      const coMap = new Map(cos.map(c => [String(c.id), c]));
      const out = [];
      for (const [k, n] of cnt) {
        if (n < 4) continue;
        const co = coMap.get(k);
        const nafn = co ? co.nafn : k;
        out.push({
          kind: 'overdue', id: 'ovd_' + k,
          co_id: co ? co.id : null,
          co_nafn: nafn,
          title: '🧯 ' + nafn + ': ' + n + ' útrunnin tæki',
          sub: 'Bíða eftir bílstjóra',
        });
      }
      out.sort((a, b) => parseInt(b.title.match(/(\d+) útrunnin/)?.[1] || 0) - parseInt(a.title.match(/(\d+) útrunnin/)?.[1] || 0));
      return out.slice(0, 30);
    } catch (e) { console.warn('findOverdueEquipment', e); return []; }
  }

  function loadWatch() {
    try {
      const raw = JSON.parse(localStorage.getItem('adstod_watchlist_v1') || '[]');
      return (raw || []).filter(w => w.status === 'open');
    } catch (_) { return []; }
  }

  // ── load + render ───────────────────────────────────────────────────────
  async function load() {
    state.loading = true; state.err = null; render();
    loadSnoozed();
    try {
      const [u, d, s, o, w, em] = await Promise.all([
        findUrgent(),
        findDuplicateSales(),
        findStaleDrafts(),
        findOverdueEquipment(),
        findStaleWorkshop(),
        findPriorityEmails(),
      ]);
      state.urgent = u;
      state.dupSales = d;
      state.staleDrafts = s;
      state.overdueEq = o;
      state.workshop = w;
      state.emails = em;
      state.watch = loadWatch();
    } catch (e) {
      state.err = (e && e.message) || String(e);
    }
    state.loading = false; state.loaded = true;
    render();
  }

  function styles() {
    if (document.getElementById('_am-styles')) return;
    const css = `
.am-wrap{padding:14px 16px 60px;max-width:1100px;margin:0 auto;color:var(--ink1,#0f172a)}
.am-h{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;margin-bottom:14px;flex-wrap:wrap}
.am-h h1{margin:0;font-size:22px;font-weight:800;letter-spacing:-.01em}
.am-h .sub{font-size:13px;color:var(--ink3,#94a3b8);margin-top:2px}
.am-counts{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
.am-count{padding:6px 11px;background:var(--surface,#fff);border:1px solid var(--brd,#e6eaf0);border-radius:99px;font-size:12.5px;color:var(--ink2,#475569);font-weight:600}
.am-count b{color:var(--ink1,#0f172a)}
.am-count.warn{border-color:#fde68a;background:#fffbeb;color:#92400e}
.am-count.bad{border-color:#fecaca;background:#fef2f2;color:#991b1b}
.am-sec{background:var(--surface,#fff);border:1px solid var(--brd,#e6eaf0);border-radius:12px;overflow:hidden;margin-bottom:14px}
.am-sec-h{padding:11px 14px;background:var(--surface2,#f8fafc);border-bottom:1px solid var(--brd,#e6eaf0);font-size:13px;font-weight:800;display:flex;justify-content:space-between;align-items:center}
.am-sec-h .cnt{font-size:11px;background:rgba(0,0,0,.06);color:var(--ink2,#475569);padding:2px 8px;border-radius:99px;font-weight:700}
.am-row{display:flex;align-items:center;gap:11px;padding:10px 14px;border-bottom:1px solid var(--brd,#eef1f5)}
.am-row:last-child{border-bottom:0}
.am-row .am-body{flex:1;min-width:0}
.am-row .am-title{font-size:13.5px;font-weight:600;color:var(--ink1,#0f172a);line-height:1.3}
.am-row .am-sub{font-size:11.5px;color:var(--ink3,#94a3b8);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.am-act{display:flex;gap:5px;flex-shrink:0}
.am-btn{padding:5px 10px;border:none;border-radius:7px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer}
.am-btn.alt{background:var(--surface2,#eef1f5);color:var(--ink2,#475569)}
.am-btn.alt:hover{background:var(--brd,#e6eaf0)}
.am-btn.go{background:var(--brand,#0d6efd);color:#fff}
.am-btn.go:hover{filter:brightness(1.07)}
.am-empty{padding:24px;text-align:center;color:var(--ink3,#94a3b8);font-size:13px;font-style:italic}
.am-err{padding:14px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:9px}
.am-spin{display:inline-block;width:12px;height:12px;border:2px solid #cbd5e1;border-top-color:var(--brand,#0d6efd);border-radius:50%;animation:am-rot .7s linear infinite;vertical-align:middle;margin-right:6px}
@keyframes am-rot{to{transform:rotate(360deg)}}
`;
    const tag = document.createElement('style');
    tag.id = '_am-styles'; tag.textContent = css;
    document.head.appendChild(tag);
  }

  function viewEl() {
    let v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = 'view';
    // NB: CSS sets `.view{display:none}` and only `.view.active{display:block}`
    // shows it. Don't set inline display — toggle .active class instead.
    document.body.appendChild(v);
    return v;
  }

  function sectionHTML(title, rows, emptyMsg) {
    const visible = rows.filter(r => !isSnoozed(r.id));
    const body = visible.length === 0
      ? '<div class="am-empty">' + esc(emptyMsg) + '</div>'
      : visible.map(r => {
          const acts = [];
          if (r.co_id) acts.push('<button class="am-btn alt" type="button" data-open-co="' + esc(String(r.co_id)) + '" title="Opna fyrirtæki">Opna</button>');
          if (r.sale_id) acts.push('<button class="am-btn alt" type="button" data-open-sale="' + esc(String(r.sale_id)) + '" title="Opna sölu">Opna</button>');
          acts.push('<button class="am-btn alt" type="button" data-snooze="' + esc(r.id) + '" title="Fela í 24 klst">😴</button>');
          return '<div class="am-row"><div class="am-body">' +
            '<div class="am-title">' + esc(r.title) + '</div>' +
            (r.sub ? '<div class="am-sub">' + esc(r.sub) + '</div>' : '') +
            '</div><div class="am-act">' + acts.join('') + '</div></div>';
        }).join('');
    return '<div class="am-sec"><div class="am-sec-h"><span>' + title + '</span><span class="cnt">' + visible.length + (rows.length > visible.length ? ' / ' + rows.length : '') + '</span></div>' + body + '</div>';
  }

  function watchSectionHTML(rows) {
    if (!rows.length) return '<div class="am-sec"><div class="am-sec-h"><span>🤖 Mín watchlist</span><span class="cnt">0</span></div><div class="am-empty">Bættu við punkti gegnum 🤖 takkann í banneri.</div></div>';
    const CAT_ICO = { remind: '🔔', pattern: '🎯', rule: '⚖️', bug: '🐛' };
    return '<div class="am-sec"><div class="am-sec-h"><span>🤖 Mín watchlist</span><span class="cnt">' + rows.length + '</span></div>' +
      rows.map(w => '<div class="am-row"><div class="am-body">' +
        '<div class="am-title">' + (CAT_ICO[w.category] || '📌') + ' ' + esc(w.title) + '</div>' +
        '<div class="am-sub">' + (w.target_name ? '📍 ' + esc(w.target_name) + ' · ' : '') + (w.body ? esc(w.body).slice(0, 80) : '') + '</div>' +
        '</div><div class="am-act"><button class="am-btn alt" type="button" data-open-hub="1">🤖 Spjald</button></div></div>').join('') +
      '</div>';
  }

  function render() {
    styles();
    const v = viewEl();
    if (state.err) {
      v.innerHTML = '<div class="am-wrap"><h1>🤖 Aðstoðarmiðstöð</h1><div class="am-err">⚠️ ' + esc(state.err) + '</div></div>';
      return;
    }
    if (state.loading && !state.loaded) {
      v.innerHTML = '<div class="am-wrap"><h1>🤖 Aðstoðarmiðstöð</h1><div class="am-empty"><span class="am-spin"></span>Greina gögn…</div></div>';
      return;
    }
    const tu = state.urgent.filter(r => !isSnoozed(r.id)).length;
    const td = state.dupSales.filter(r => !isSnoozed(r.id)).length;
    const ts = state.staleDrafts.filter(r => !isSnoozed(r.id)).length;
    const to = state.overdueEq.filter(r => !isSnoozed(r.id)).length;
    const tws = state.workshop.filter(r => !isSnoozed(r.id)).length;
    const tem = state.emails.filter(r => !isSnoozed(r.id)).length;
    const tw = state.watch.length;
    const total = tu + td + ts + to + tws + tem + tw;

    const countsHTML = '<div class="am-counts">' +
      '<span class="am-count ' + (tu ? 'bad' : '') + '">🚨 Áríðandi: <b>' + tu + '</b></span>' +
      '<span class="am-count ' + (td ? 'warn' : '') + '">🔄 Tvítekningar: <b>' + td + '</b></span>' +
      '<span class="am-count ' + (ts ? 'warn' : '') + '">📋 Óloknar: <b>' + ts + '</b></span>' +
      '<span class="am-count ' + (to ? 'warn' : '') + '">🧯 Útrunnin: <b>' + to + '</b></span>' +
      '<span class="am-count ' + (tws ? 'warn' : '') + '">🔧 Verkstæði: <b>' + tws + '</b></span>' +
      '<span class="am-count">📧 Póstar: <b>' + tem + '</b></span>' +
      '<span class="am-count">🤖 Watchlist: <b>' + tw + '</b></span>' +
      '<span class="am-count" style="margin-left:auto;font-weight:800">Samtals: <b>' + total + '</b></span>' +
      '</div>';

    const sections = [
      sectionHTML('🚨 Áríðandi', state.urgent, 'Allt rólegt í dag. ✨'),
      sectionHTML('📧 Mikilvægir póstar (eldklar/brunaholf)', state.emails, 'Engar nýjar póstrispur frá forgangs-reikningum.'),
      sectionHTML('🔄 Líklegir tvítekningar (sölur sömu daginn)', state.dupSales, 'Engin tvítekning fundin í síðustu 60 dögum.'),
      sectionHTML('📋 Sölu-drög > 7 daga gömul', state.staleDrafts, 'Engin gömul drög.'),
      sectionHTML('🔧 Tæki á verkstæði > 14 daga', state.workshop, 'Allt í gegn.'),
      sectionHTML('🧯 Fyrirtæki með ≥4 útrunnin tæki', state.overdueEq, 'Engir kúnnar með háa útrunna talningu.'),
      watchSectionHTML(state.watch),
    ].join('');

    v.innerHTML =
      '<div class="am-wrap">' +
        '<div class="am-h">' +
          '<div><h1>🤖 Aðstoðarmiðstöð</h1><div class="sub">Reglu-byggðar ábendingar yfir DB-gögn. Fasi 2 (Claude daglegt yfirferð) bætist í toppinn.</div></div>' +
          '<button class="am-btn alt" id="_am-reload">↻ Endurhlaða</button>' +
        '</div>' +
        countsHTML +
        sections +
      '</div>';

    v.querySelector('#_am-reload').addEventListener('click', load);
    v.querySelectorAll('[data-snooze]').forEach(b => b.addEventListener('click', () => snooze(b.dataset.snooze, 24)));
    v.querySelectorAll('[data-open-co]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.openCo;
      if (window.App && App.switchView) App.switchView('companies');
      setTimeout(() => { try { if (window.Companies && Companies.openDetail) Companies.openDetail(+id); } catch (_) {} }, 60);
    }));
    v.querySelectorAll('[data-open-sale]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.openSale;
      if (window.App && App.switchView) App.switchView('bokhalds-yfirlit');
      // bokhalds yfirlit doesn't have a direct openSale yet — surface the num in URL
      setTimeout(() => location.hash = '#bokhald?sale=' + id, 60);
    }));
    v.querySelectorAll('[data-open-hub]').forEach(b => b.addEventListener('click', () => {
      if (window.AdstodHub && AdstodHub.open) AdstodHub.open();
    }));
  }

  // ── wiring ──────────────────────────────────────────────────────────────
  function ensureSidebarButton() {
    if (document.querySelector('[data-view="' + NAV_KEY + '"]')) return true;
    // Try a few anchor candidates — Bakendi, then Sameining, then any sidebar entry
    const sib = document.querySelector('[data-view="bakendi"]')
             || document.querySelector('[data-view="sameining"]')
             || document.querySelector('[data-view="settings"]')
             || document.querySelector('[data-view]');
    if (!sib) return false;
    const btn = sib.cloneNode(true);
    btn.dataset.view = NAV_KEY;
    // Replace text content — find the inner text node/element
    const txtSpan = btn.querySelector('span:not([class*="icon"]):not([class*="badge"])');
    if (txtSpan) txtSpan.textContent = '🤖 Aðstoðarmiðstöð';
    else {
      // Walk to text node
      for (const c of btn.childNodes) if (c.nodeType === 3 && c.nodeValue.trim()) { c.nodeValue = ' 🤖 Aðstoðarmiðstöð'; break; }
    }
    // Strip any badge spans (count/notification chips inherited from clone)
    btn.querySelectorAll('.count, .badge, [class*="badge"], [class*="count"]').forEach(n => n.remove());
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); });
    sib.parentNode.insertBefore(btn, sib.nextSibling);
    return true;
  }
  function hookSwitch() {
    if (!window.App || !App.switchView) return false;
    if (App.__amPatched) return true;
    const orig = App.switchView.bind(App);
    App.switchView = function (k) {
      if (k === NAV_KEY) {
        document.querySelectorAll('.view').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
        const v = viewEl();
        v.style.display = 'block';
        v.classList.add('active');
        render();
        if (!state.loaded && !state.loading) load();
        try { history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
        return;
      }
      // Returning to a different view — make sure ours is hidden again
      const me = document.getElementById(VIEW_ID);
      if (me) { me.style.display = 'none'; me.classList.remove('active'); }
      return orig(k);
    };
    App.__amPatched = true;
    return true;
  }
  function init() {
    viewEl();
    let sw = hookSwitch();
    let sb = ensureSidebarButton();
    // Patches load after sidebar/App init — keep trying for a bit
    const tries = [200, 600, 1500, 3500, 7000];
    tries.forEach(ms => setTimeout(() => {
      if (!sw) sw = hookSwitch();
      if (!sb) sb = ensureSidebarButton();
    }, ms));
    // Boot deep-link
    if ((location.hash || '').replace(/^#/, '') === NAV_KEY) {
      setTimeout(() => { if (window.App && App.switchView) App.switchView(NAV_KEY); }, 250);
    }
    // Listen to hashchange in case URL router beats us
    window.addEventListener('hashchange', () => {
      if ((location.hash || '').replace(/^#/, '') === NAV_KEY) {
        if (window.App && App.switchView) App.switchView(NAV_KEY);
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // public API
  window.Adstod = {
    open: () => { if (window.App && App.switchView) App.switchView(NAV_KEY); },
    reload: load,
  };
})();
