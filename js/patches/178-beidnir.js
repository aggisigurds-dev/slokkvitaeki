/* === BEIÐNIR — eldklar request inbox v1 ===
 *
 * One tab inside the app that reads the eldklar@eldklar.is mail already sitting
 * in `email_digest` (synced by the bridge) — so you never open Outlook /
 * Thunderbird. It auto-sorts incoming mail into:
 *
 *   • Skýrslubeiðnir  — "send me the report" → one-click resend of the
 *                        úttektarskýrsla (reuses patch 168 + 176).
 *   • Tilboðsbeiðnir  — price/offer requests → opens a tilboð (patch 27)
 *                        pre-drafted from store prices (vorur) with Agnar's
 *                        volume discount: ≥10 tæki −10%, ≥20 −20%, ≥30 −30%.
 *
 * Handled state is stored in `email_actions` (status='done').
 */
(() => {
  if (window.__beidnirInstalled) return;
  window.__beidnirInstalled = true;

  const VIEW_ID = 'view-beidnir';
  const NAV_KEY = 'beidnir';
  const ACCOUNT = 'eldklar@eldklar.is';

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr'; }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[beidnir]', m); }

  // Pull the actual request out of the email body instead of just the opening
  // line: drop greetings + signatures/quoted replies, then prefer the
  // sentence(s) that carry the ask (skýrsla / tilboð / verð / senda …).
  function summarize(row) {
    let text = String(row.body_preview || row.snippet || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').trim();
    if (!text) return '';
    text = text.split(/\b(?:Bestu kveðjur|Kær(?:ar)? kveðj|Kveðja|Með kveðju|Virðingarfyllst|Best Regards|Kind regards|Regards|Thanks|Sent from|On .{0,40}wrote:|From:|Sent:)\b/i)[0];
    text = text.split(/\n?[_-]{3,}\n?/)[0];
    const parts = text.split(/(?<=[.?!])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 4);
    const isGreeting = s => /^(s[æa]l[lt]?|hæ+|halló|góðan|dear\b|hello|\bhi\b|hæhæ|komd[uð]|takk fyrir)/i.test(s) && s.length < 40;
    const body = parts.filter(s => !isGreeting(s));
    const KW = /skýrsl|skyrsl|tilboð|tilbod|verð|verd|senda|sent|áfyll|afyll|hægt að|getið þið|bjóð|boðið|vant|ósk|hvað kostar|kostnað|yfirfer|reikning|report|quotation|quote|\bprice\b|invoice|please|could you|need/i;
    const hits = body.filter(s => KW.test(s));
    const pick = (hits.length ? hits : body).slice(0, 2).join(' ').replace(/\s+/g, ' ').trim();
    return (pick || text).slice(0, 260);
  }

  // Deep-link to the real message in the eldklar Gmail (via its RFC822 id).
  function gmailUrl(row) {
    const id = String(row.message_id || '').replace(/^<|>$/g, '').trim();
    if (!id) return '';
    return 'https://mail.google.com/mail/?authuser=eldklar@eldklar.is#search/rfc822msgid:' + encodeURIComponent(id);
  }

  const state = { items: [], prices: {}, handled: new Set(), notes: {}, expanded: new Set(), filter: 'skyrsla', showDone: false, loading: false };

  // ── Categories ────────────────────────────────────────────────────────────
  const CATS = [
    { k: 'skyrsla',    label: '📄 Skýrslubeiðnir' },
    { k: 'tilbod',     label: '💰 Tilboðsbeiðnir' },
    { k: 'verk',       label: '🔧 Verkbeiðnir' },
    { k: 'reikningur', label: '🧾 Reikningar' },
  ];

  const RE_SKYRSLA = /(skýrsl|skyrsl|\breport\b|yfirlýsing\s+um\s+yfirferð|vottor|certificate|staðfesting.*yfirfer)/i;
  const RE_TILBOD  = /(tilboð|tilbod|verðtilboð|\bverð\b|\bverd\b|bjóð|boðið|hvað\s+kostar|kostnað|\bprice\b|\bquote\b|\boffer\b|áfyllin|refill|von\s+á\s+tilboði)/i;
  const RE_VERK    = /(verknúmer|yfirfara\s+brunavarnir|óskað\s+eftir.*yfirferð|þjónustubeiðni|panta.*yfirferð|bóka.*yfirferð)/i;
  const RE_REIKN   = /(\breikning|gjalddag|greiðslu|innheimt|\bkröfu|gjaldþrot|afrit\s+af\s+reikning)/i;
  const RE_NOISE_SENDER = /(google\.com|accounts\.google|no-?reply@google|postmaster|mailer-daemon)/i;
  const RE_NOISE_SUBJ   = /(security alert|new sign-in|google data|takeout|\bpassword\b|critical security)/i;

  function classify(row) {
    const subj = String(row.subject || '');
    const txt = subj + ' ' + String(row.snippet || '') + ' ' + String(row.body_preview || '');
    if (RE_NOISE_SENDER.test(row.sender_email || '') || RE_NOISE_SUBJ.test(subj)) return null;
    // Priority: report deliverable > explicit price ask > work order > invoice.
    if (RE_SKYRSLA.test(txt)) return 'skyrsla';
    if (RE_TILBOD.test(txt))  return 'tilbod';
    if (RE_VERK.test(txt))    return 'verk';
    if (RE_REIKN.test(txt))   return 'reikningur';
    return null;
  }

  // ── Quote drafting ────────────────────────────────────────────────────────
  const PRODUCT_RULES = [
    { type: 'Duft',     kw: /duft|abc|dufttæk/i,        sizes: { '1':'Duft 1 kg. ABC Hleðsla', '2':'Duft 2 kg. ABC Slökkvitæki', '6':'Duft 6 kg. ABC Slökkvitæki', '12':'Duft 12 kg. ABC hleðsla' }, def: '6' },
    { type: 'Léttvatn', kw: /léttv|lettv/i,             sizes: { '2':'Léttvatn 2 kg. AB Slökkvitæki', '6':'Léttvatn 6 kg. AB Slökkvitæki' }, def: '6' },
    { type: 'CO₂',      kw: /co2|co₂|kolsýr|kolsyr/i,   sizes: { '2':'CO₂ 2 kg. Slökkvitæki', '5':'CO₂ 5 kg. Slökkvitæki' }, def: '2' },
    { type: 'ABF',      kw: /abf|froð|frod/i,           sizes: { '6':'ABF 6 l. Slökkvitæki' }, def: '6' },
    { type: 'Teppi',    kw: /teppi|eldvarnatepp/i,      sizes: { '_':'Eldvarnateppi 1,2m x 1,2m' }, def: '_' },
  ];

  function discountFor(qty) { return qty >= 30 ? 0.30 : qty >= 20 ? 0.20 : qty >= 10 ? 0.10 : 0; }
  function priceOf(nafn) { const p = state.prices[nafn]; return p != null ? p : 0; }

  // Best-effort parse of "20 stk af 6 kg slökkvitækjum" → a draft line.
  function parseQuote(row) {
    const text = [row.subject, row.snippet, row.body_preview].filter(Boolean).join(' ');
    let qty = 0;
    let m = text.match(/(\d{1,3})\s*(?:stk|stykki|x|×)\b/i) || text.match(/(\d{1,3})\s*(?:slökkvitæk|slokkvitaek|tæki|hólk|holk|flösk)/i);
    if (m) qty = parseInt(m[1], 10);
    let size = '';
    const sm = text.match(/(\d{1,2})\s*(?:kg|kg\.|l\b|ltr|lítra)/i);
    if (sm) size = sm[1];
    let rule = PRODUCT_RULES.find(r => r.kw.test(text));
    if (!rule && (size || qty)) rule = PRODUCT_RULES[0]; // default to Duft
    if (!rule) return null;
    if (!qty) qty = 1;
    const sizeKey = (size && rule.sizes[size]) ? size : rule.def;
    const nafn = rule.sizes[sizeKey] || rule.sizes[rule.def];
    const base = priceOf(nafn);
    const disc = discountFor(qty);
    const unit = Math.round(base * (1 - disc));
    return {
      qty, nafn, base, disc, unit,
      lineTotal: unit * qty,
      line: { desc: nafn, qty: qty, unit_price_ex_vat: unit, vsk_pct: 24 }
    };
  }

  // ── Company matching (requester → fyrirtaeki) ─────────────────────────────
  function fold(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function matchCompany(row) {
    const cos = (window.Companies && Companies.list) || [];
    if (!cos.length) return null;
    const dom = (String(row.sender_email || '').split('@')[1] || '').toLowerCase();
    if (dom && !/gmail|hotmail|outlook|live|me\.com|icloud|yahoo/.test(dom)) {
      const byDom = cos.find(c => (c.netfang || '').toLowerCase().includes('@' + dom));
      if (byDom) return byDom.id;
    }
    const hay = fold([row.sender_name, row.subject, row.snippet, row.body_preview].filter(Boolean).join(' '));
    let best = null;
    for (const c of cos) {
      const n = fold(c.nafn);
      if (n && n.length >= 4 && hay.includes(n)) { best = c; break; }
    }
    return best ? best.id : null;
  }

  // ── Data load ─────────────────────────────────────────────────────────────
  async function loadPrices() {
    const SB = getSB(); if (!SB) return;
    try {
      const { data } = await SB.from('vorur').select('nafn,verd_an_vsk').eq('virkt', true);
      const map = {};
      (data || []).forEach(v => { if (v.nafn) map[v.nafn] = Number(v.verd_an_vsk) || 0; });
      state.prices = map;
    } catch (e) { console.warn('[beidnir] prices', e); }
  }

  async function loadActions() {
    const SB = getSB(); if (!SB) return;
    try {
      const { data } = await SB.from('email_actions').select('email_id,status,notes');
      state.handled = new Set();
      state.notes = {};
      (data || []).forEach(r => {
        if (r.status === 'done') state.handled.add(String(r.email_id));
        if (r.notes) state.notes[String(r.email_id)] = r.notes;
      });
    } catch (e) { /* table may be locked */ }
  }

  async function saveNote(key, text) {
    const SB = getSB(); if (!SB) return;
    state.notes[key] = text;   // keep local copy so re-renders show it
    try {
      await SB.from('email_actions').upsert(
        { email_id: Number(key), notes: text, updated_at: new Date().toISOString() },
        { onConflict: 'email_id' });
    } catch (e) { toast('Náði ekki að vista minnispunkt: ' + (e.message || e)); }
  }

  async function load() {
    const SB = getSB(); if (!SB) return;
    state.loading = true; render();
    await Promise.all([loadPrices(), loadActions()]);
    try {
      const { data, error } = await SB.from('email_digest')
        .select('id,message_id,sender_name,sender_email,subject,snippet,body_preview,has_attachment,received_at,folder')
        .eq('account', ACCOUNT)
        .ilike('folder', '%inbox%')
        .order('received_at', { ascending: false })
        .range(0, 199);
      if (error) throw error;
      state.items = (data || [])
        .filter(r => !/eldklar/i.test(r.sender_email || ''))
        .map(r => ({ ...r, kind: classify(r) }))
        .filter(r => r.kind);
    } catch (e) {
      console.warn('[beidnir] load', e);
      state.items = [];
    }
    state.loading = false;
    render();
  }

  // ── Actions ───────────────────────────────────────────────────────────────
  async function markDone(row, done) {
    const SB = getSB(); if (!SB) return;
    const key = String(row.id);
    try {
      await SB.from('email_actions').upsert(
        { email_id: row.id, status: done ? 'done' : 'open', updated_at: new Date().toISOString() },
        { onConflict: 'email_id' });
      if (done) state.handled.add(key); else state.handled.delete(key);
      render();
    } catch (e) { toast('Náði ekki að vista stöðu: ' + (e.message || e)); }
  }

  function sendReport(row, coIdOverride) {
    const coId = coIdOverride || matchCompany(row);
    if (!coId) { toast('Veldu fyrirtæki fyrst'); return; }
    if (window.CompanyInspectionReport && CompanyInspectionReport.open) {
      CompanyInspectionReport.open(+coId, { emailTo: row.sender_email || '' });
    } else { toast('Skýrslueiningin er ekki tiltæk'); }
  }

  function openTilbod(row, coIdOverride) {
    const q = parseQuote(row);
    const coId = coIdOverride || matchCompany(row);
    const lines = (q && q.line) ? [q.line] : [{ desc: '', qty: 1, unit_price_ex_vat: 0, vsk_pct: 24 }];
    const noteBits = ['Beiðni frá ' + (row.sender_name || row.sender_email || '')];
    if (q && q.disc > 0) noteBits.push('Magnafsláttur ' + Math.round(q.disc * 100) + '% (' + q.qty + ' tæki)');
    if (row.snippet) noteBits.push('„' + String(row.snippet).slice(0, 120).trim() + '…"');
    const prefill = { company_id: coId || null, linur: lines, notes: noteBits.join(' · ') };
    if (window.Tilbod && Tilbod.openQuote) Tilbod.openQuote(prefill);
    else toast('Tilboðseiningin er ekki tiltæk');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function companySelect(row) {
    const cos = (window.Companies && Companies.list) || [];
    const match = matchCompany(row);
    const opts = ['<option value="">— veldu fyrirtæki —</option>'].concat(
      cos.slice().sort((a, b) => String(a.nafn || '').localeCompare(String(b.nafn || ''), 'is'))
        .map(c => `<option value="${esc(c.id)}" ${match == c.id ? 'selected' : ''}>${esc(c.nafn || '')}</option>`)
    ).join('');
    return `<select class="_bd-co" style="max-width:230px;padding:5px 8px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:12px">${opts}</select>`;
  }

  function card(row) {
    const key = String(row.id);
    const done = state.handled.has(key);
    const when = row.received_at ? new Date(row.received_at).toLocaleDateString('is-IS') : '';
    const att = row.has_attachment ? ' 📎' : '';
    let actionHtml = '';
    if (row.kind === 'skyrsla') {
      actionHtml = `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px">${companySelect(row)}
        <button class="_bd-report" style="padding:7px 13px;background:#0d6efd;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700">📄 Senda skýrslu</button></div>`;
    } else if (row.kind === 'tilbod' || row.kind === 'verk') {
      const q = (row.kind === 'tilbod') ? parseQuote(row) : null;
      const draft = q
        ? `<div style="margin:8px 0;padding:8px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:12.5px;color:#166534">
             Uppkast: <strong>${q.qty}×</strong> ${esc(q.nafn)} — ${fmtKr(q.unit)}/stk${q.disc ? ' <span style="color:#b91c1c">(−' + Math.round(q.disc * 100) + '%)</span>' : ''} = <strong>${fmtKr(q.lineTotal)}</strong> án vsk</div>`
        : (row.kind === 'verk'
            ? `<div style="margin:8px 0;font-size:12px;color:#64748b">Verkbeiðni — opnaðu tilboð til að verðleggja yfirferðina.</div>`
            : `<div style="margin:8px 0;font-size:12px;color:#94a3b8">Næ ekki að lesa magn — opnaðu tilboð og fylltu út.</div>`);
      actionHtml = draft + `<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">${companySelect(row)}
        <button class="_bd-tilbod" style="padding:7px 13px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700">💰 Opna tilboð</button></div>`;
    } else if (row.kind === 'reikningur') {
      actionHtml = `<div style="margin-top:8px;font-size:12px;color:#92400e;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:7px 10px">🧾 Bókhald / greiðsla — skoðaðu og merktu búið þegar afgreitt.</div>`;
    }
    // Full email + per-request notes (notes persist in email_actions.notes).
    const full = String(row.body_preview || row.snippet || '');
    const isOpen = state.expanded.has(key);
    const fullBodyHtml = full.length > 180
      ? '<button class="_bd-expand" type="button" style="margin-top:5px;background:none;border:none;color:#2563eb;cursor:pointer;font:inherit;font-size:12px;padding:0;font-weight:600">' + (isOpen ? 'Fela ↑' : 'Lesa allt ↓') + '</button>'
        + '<div class="_bd-full" style="display:' + (isOpen ? 'block' : 'none') + ';white-space:pre-wrap;font-size:12.5px;color:#334155;line-height:1.55;margin-top:6px;padding:9px 11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;max-height:340px;overflow:auto">' + esc(full) + '</div>'
      : '';
    const notesHtml = '<textarea class="_bd-note" rows="2" placeholder="✍️ Minnispunktur áður en þú svarar… (vistast sjálfkrafa)" style="width:100%;box-sizing:border-box;margin-top:10px;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:12.5px;resize:vertical;background:#fffbeb">' + esc(state.notes[key] || '') + '</textarea>';
    const gUrl = gmailUrl(row);
    const linkHtml = gUrl ? '<div style="margin-top:5px"><a href="' + gUrl + '" target="_blank" rel="noopener" style="color:#0d6efd;font-size:12px;font-weight:600;text-decoration:none">↗ Opna póstinn í Gmail</a></div>' : '';
    return `<div class="_bd-card" data-key="${esc(key)}" style="border:1px solid #e2e8f0;border-radius:12px;padding:13px 15px;margin-bottom:10px;background:${done ? '#f8fafc' : '#fff'};${done ? 'opacity:.6' : ''}">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
        <div style="min-width:0">
          <div style="font-size:13.5px;font-weight:700;color:#0f172a">${esc(row.sender_name || row.sender_email || '—')}${att}</div>
          <div style="font-size:11.5px;color:#64748b">${esc(row.sender_email || '')} · ${esc(when)}</div>
        </div>
        <button class="_bd-done" style="padding:5px 11px;background:${done ? '#dcfce7' : '#fff'};color:${done ? '#166534' : '#475569'};border:1px solid ${done ? '#86efac' : '#cbd5e1'};border-radius:7px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:600;white-space:nowrap">${done ? '✓ Afgreidd' : 'Merkja búið'}</button>
      </div>
      <div style="font-size:13px;font-weight:600;color:#0f172a;margin-top:7px">${esc(row.subject || '(efnislaust)')}</div>
      <div style="font-size:12.5px;color:#334155;margin-top:4px;line-height:1.5">${esc(summarize(row))}</div>
      ${fullBodyHtml}
      ${linkHtml}
      ${actionHtml}
      ${notesHtml}
    </div>`;
  }

  function render() {
    const main = document.getElementById('_bd-main');
    if (!main) return;
    const live = r => state.showDone || !state.handled.has(String(r.id));
    const countFor = k => state.items.filter(r => r.kind === k && live(r)).length;
    const visible = state.items.filter(r => r.kind === state.filter && live(r));
    const chip = (k, label, n) => `<button class="_bd-chip" data-k="${k}" style="padding:7px 14px;border-radius:99px;border:1px solid ${state.filter === k ? '#0f172a' : '#cbd5e1'};background:${state.filter === k ? '#0f172a' : '#fff'};color:${state.filter === k ? '#fff' : '#334155'};cursor:pointer;font:inherit;font-size:12.5px;font-weight:600">${label} (${n})</button>`;
    main.innerHTML = `<div style="max-width:880px;margin:0 auto;padding:18px 20px 60px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:10px;flex-wrap:wrap">
        <div style="font-size:20px;font-weight:800;color:#0f172a">📨 Beiðnir <span style="font-size:12px;font-weight:500;color:#94a3b8">eldklar@eldklar.is</span></div>
        <button id="_bd-refresh" style="padding:7px 13px;background:#fff;border:1px solid #cbd5e1;border-radius:8px;cursor:pointer;font:inherit;font-size:12.5px;font-weight:600;color:#475569">↻ Sækja</button>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
        ${CATS.map(c => chip(c.k, c.label, countFor(c.k))).join('')}
        <label style="margin-left:auto;font-size:12px;color:#64748b;display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="_bd-showdone" ${state.showDone ? 'checked' : ''}> Sýna afgreiddar</label>
      </div>
      ${state.loading ? '<div style="opacity:.6;padding:20px">Hleður…</div>'
        : visible.length ? visible.map(card).join('')
        : '<div style="padding:30px;text-align:center;color:#94a3b8;font-size:13px">Engar beiðnir hér. 🎉</div>'}
    </div>`;

    main.querySelector('#_bd-refresh')?.addEventListener('click', load);
    main.querySelector('#_bd-showdone')?.addEventListener('change', e => { state.showDone = e.target.checked; render(); });
    main.querySelectorAll('._bd-chip').forEach(b => b.addEventListener('click', () => { state.filter = b.dataset.k; render(); }));
    main.querySelectorAll('._bd-card').forEach(cardEl => {
      const key = cardEl.dataset.key;
      const row = state.items.find(r => String(r.id) === key);
      if (!row) return;
      const coSel = cardEl.querySelector('._bd-co');
      cardEl.querySelector('._bd-report')?.addEventListener('click', () => sendReport(row, coSel && coSel.value));
      cardEl.querySelector('._bd-tilbod')?.addEventListener('click', () => openTilbod(row, coSel && coSel.value));
      cardEl.querySelector('._bd-done')?.addEventListener('click', () => markDone(row, !state.handled.has(key)));
      cardEl.querySelector('._bd-expand')?.addEventListener('click', () => {
        if (state.expanded.has(key)) state.expanded.delete(key); else state.expanded.add(key);
        const open = state.expanded.has(key);
        const f = cardEl.querySelector('._bd-full'); if (f) f.style.display = open ? 'block' : 'none';
        const eb = cardEl.querySelector('._bd-expand'); if (eb) eb.textContent = open ? 'Fela ↑' : 'Lesa allt ↓';
      });
      const noteEl = cardEl.querySelector('._bd-note');
      if (noteEl) noteEl.addEventListener('change', () => saveNote(key, noteEl.value.trim()));
    });
  }

  // ── View + sidebar wiring (mirrors patch 157) ─────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-arsskodun') || document.getElementById('view-allir-vidsk') ||
                   document.getElementById('view-counter') || document.getElementById('view-companies');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="_bd-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
  }

  function show() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    if (v) { v.style.display = 'block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY));
    render();
    if (!state.items.length && !state.loading) load();
  }

  function patchSwitchView() {
    if (!window.App || window.App._beidnirPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      return orig.apply(this, arguments);
    };
    window.App._beidnirPatched = true;
  }

  function injectSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectSidebar, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    const ref = allBtns.find(b => /viðskiptavinir/i.test(b.textContent)) ||
                allBtns.find(b => b.getAttribute('data-view') === 'arsskodun') ||
                allBtns[allBtns.length - 1];
    const btn = document.createElement('button');
    btn.className = (ref && ref.className) || 'vnav-btn';
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">' +
      '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>' +
      '<span>Beiðnir</span></span>';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY); else show();
    });
    if (ref && ref.parentNode) ref.parentNode.insertBefore(btn, ref.nextSibling); else nav.appendChild(btn);
  }

  function boot() {
    injectSidebar();
    ensureView();
    patchSwitchView();
    [600, 1500, 3000].forEach(t => setTimeout(injectSidebar, t));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.Beidnir = { open: show, reload: load };
  console.log('[patch-178] Beiðnir (eldklar request inbox) installed');
})();
/* === END BEIÐNIR === */
