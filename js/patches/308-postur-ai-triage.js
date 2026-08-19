/* === AI-FLOKKUN INNHÓLFS — 🤖 Þjónustuver póst-triage (2026-08-19) ===
 *
 * Innkominn tölvupóstur verður að „máli" á Þjónustuborðinu (patch 182 ingestEmail)
 * EN aðeins með grófri leitarorða-tegund — engan flokk, engin merki, enga samantekt.
 * Þessi patch lætur gervigreind lesa hvert óflokkað email-mál og LEGGJA TIL réttan
 * flokk + merki + samantekt + „áríðandi", í ORÐAFORÐA borðsins (patch 231).
 *
 * ÖRYGGI — tillögur, ekki yfirskrift:
 *  • AI skrifar ALDREI beint á málið. Tillögur geymast í `postur_ai_flokkun`.
 *  • Þú samþykkir (✓ Nota) → þá fyrst er skrifað á `thjonustubeidni`, og AÐEINS
 *    í tóma reiti (flokkur/samantekt fyllt ef vantar, merki sameinuð, „áríðandi"
 *    aðeins hækkað) — ekkert sem þú hefur sett handvirkt er yfirskrifað.
 *  • „✓ Samþykkja allar" og „✕ Hafna" fyrir hraða yfirferð.
 *
 * Kall á /api/postur-triage (Haiku, server-hlið; lykill aldrei á client). Sjálf-
 * innihaldið, engin snerting á 231/182 render — fljótandi 🤖-takki opnar gluggann.
 *
 * API: window.PosturAiTriage.open()
 */
(() => {
  if (window.PosturAiTriage) return;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const getSB = () => (window.DB && window.DB.sb) || null;
  const nowIso = () => new Date().toISOString();
  const me = () => {
    try { return localStorage.getItem('bh_me') || localStorage.getItem('me') || localStorage.getItem('slokk_me') || 'Slökkvitæki'; }
    catch (_) { return 'Slökkvitæki'; }
  };
  const dt = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '.' + m[2] + '.' + m[1] : ''; };

  // Orðaforði borðsins — verður að stemma við js/patches/231-verkbord.js.
  const FLOKKAR = {
    tilbod:     { label: 'Tilboð',     emoji: '💰', color: '#1d4ed8' },
    thjonusta:  { label: 'Þjónusta',   emoji: '🔧', color: '#0d9488' },
    brunakerfi: { label: 'Brunakerfi', emoji: '🔥', color: '#ea580c' },
    rukkun:     { label: 'Rukkun',     emoji: '💸', color: '#be123c' },
    samskipti:  { label: 'Samskipti',  emoji: '📞', color: '#d97706' },
  };
  const TAGS = {
    gera_tilbod:        { label: 'Gera tilboð',       emoji: '📄', color: '#7c3aed' },
    thjonustusamningur: { label: 'Þjónustusamningur', emoji: '📝', color: '#16a34a' },
    bokhald:            { label: 'Bókhald',           emoji: '📊', color: '#1d4ed8' },
    kvortun:            { label: 'Kvörtun',           emoji: '😠', color: '#dc2626' },
    hringja:            { label: 'Hringja',           emoji: '📞', color: '#d97706' },
    brunakerfi:         { label: 'Brunakerfi',        emoji: '🔥', color: '#ea580c' },
    eftir_ad_rukka:     { label: 'Eftir að rukka',    emoji: '💰', color: '#be123c' },
    thjonusta:          { label: 'Þjónusta',          emoji: '🔧', color: '#0d9488' },
    senda_tolvupost:    { label: 'Senda tölvupóst',   emoji: '✉️', color: '#0369a1' },
    senda_skyrslur:     { label: 'Senda skýrslur',    emoji: '📑', color: '#4338ca' },
    uppsetning:         { label: 'Uppsetning',        emoji: '🔩', color: '#6b7280' },
  };
  const TAGKEYS = new Set(Object.keys(TAGS));
  const parseTags = (t) => {
    if (typeof t === 'string') { try { t = JSON.parse(t); } catch (_) { t = []; } }
    return Array.isArray(t) ? t.filter((x) => TAGKEYS.has(x)) : [];
  };

  function toast(msg, bad) {
    let host = document.getElementById('pat-toast');
    if (!host) { host = document.createElement('div'); host.id = 'pat-toast'; document.body.appendChild(host); }
    host.style.cssText = 'position:fixed;bottom:84px;right:18px;z-index:100092;background:' + (bad ? '#7f1d1d' : '#0f172a') +
      ';color:#fff;padding:10px 15px;border-radius:10px;font:600 13px system-ui;box-shadow:0 12px 30px rgba(0,0,0,.35);max-width:340px';
    host.textContent = msg;
    clearTimeout(host._t); host._t = setTimeout(() => { host.remove(); }, bad ? 6000 : 3200);
  }

  // ── CSS ─────────────────────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('pat-css')) return;
    const s = document.createElement('style');
    s.id = 'pat-css';
    s.textContent = `
      #pat-launch { position:fixed; right:18px; bottom:18px; z-index:100070;
        background:linear-gradient(180deg,#3b3f47,#191b20); color:#f1f5f9; border:1px solid #0a0b0d;
        border-radius:12px; padding:10px 14px; font:700 13px system-ui; cursor:pointer;
        box-shadow:0 10px 26px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.12); display:flex; align-items:center; gap:7px; }
      #pat-launch .pat-badge { background:#dc2626; color:#fff; border-radius:99px; min-width:19px; height:19px;
        display:inline-flex; align-items:center; justify-content:center; font-size:11px; padding:0 5px; }
      #pat-backdrop { position:fixed; inset:0; background:rgba(10,12,18,.55); z-index:100080; }
      #pat-panel { position:fixed; top:3vh; left:50%; transform:translateX(-50%); width:min(880px,95vw);
        max-height:94vh; display:flex; flex-direction:column; z-index:100081; background:#f5f7fb; color:#16181d;
        border-radius:14px; box-shadow:0 30px 80px rgba(0,0,0,.5); overflow:hidden; font:13px/1.5 system-ui; }
      #pat-bar { display:flex; gap:8px; align-items:center; background:linear-gradient(180deg,#2e3037,#17181c);
        color:#e2e8f0; padding:11px 15px; }
      #pat-bar b { letter-spacing:.5px; font-size:13px; }
      .pat-btn { border:1px solid #3a3d45; background:#23252c; color:#e2e8f0; border-radius:8px;
        padding:6px 12px; font:700 12px system-ui; cursor:pointer; white-space:nowrap; }
      .pat-btn.go { background:#1d4ed8; border-color:#1d4ed8; }
      .pat-btn:disabled { opacity:.5; cursor:default; }
      #pat-body { overflow-y:auto; padding:12px 14px 20px; }
      .pat-sec { font-size:11px; text-transform:uppercase; letter-spacing:.07em; color:#64748b; margin:10px 2px 6px; font-weight:800; }
      .pat-card { background:#fff; border:1px solid #e6eaf1; border-radius:12px; padding:11px 12px; margin-bottom:9px;
        box-shadow:0 2px 8px -4px rgba(15,23,42,.2); }
      .pat-title { font-weight:800; font-size:14px; }
      .pat-meta { color:#64748b; font-size:11.5px; margin:2px 0 6px; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
      .pat-link { color:#0d9488; font-weight:700; }
      .pat-notes { white-space:pre-wrap; color:#334155; font-size:12px; background:#f8fafc; border-left:3px solid #cbd5e1;
        padding:5px 9px; border-radius:0 6px 6px 0; margin:5px 0; max-height:78px; overflow:auto; }
      .pat-ai { border:1.5px solid #c7d2fe; background:#eef2ff; border-radius:10px; padding:9px 10px; margin-top:7px; }
      .pat-ai .lead { font-size:11px; font-weight:800; color:#4338ca; letter-spacing:.04em; margin-bottom:5px; }
      .pat-chip { display:inline-flex; align-items:center; gap:4px; font-size:11px; font-weight:700; padding:2px 9px;
        border-radius:99px; white-space:nowrap; }
      .pat-sum { font-size:12.5px; color:#1e293b; margin:5px 0 2px; }
      .pat-sum b { color:#334155; }
      .pat-imp { color:#b91c1c; font-weight:800; }
      .pat-acts { display:flex; gap:7px; margin-top:8px; flex-wrap:wrap; }
      .pat-cur { font-size:11px; color:#475569; }
      .pat-empty { color:#94a3b8; text-align:center; padding:26px 10px; }
      @media (max-width:560px){ #pat-panel{ width:100vw; top:0; max-height:100vh; border-radius:0; } }
    `;
    document.head.appendChild(s);
  }

  const chip = (def, key) => '<span class="pat-chip" style="color:' + def.color + ';background:' + def.color + '18;border:1px solid ' + def.color + '44">' + def.emoji + ' ' + esc(def.label) + '</span>';

  // ── Gögn ────────────────────────────────────────────────────────────────────
  let STATE = { mals: [], sugg: new Map() };

  async function loadData() {
    const sb = getSB(); if (!sb) throw new Error('DB.sb vantar');
    const { data: mals, error } = await sb.from('thjonustubeidni')
      .select('id,title,notes,customer_nafn,customer_base_id,flokkur,tags,summary,important,status,channel_ref,created_at')
      .eq('source', 'email').is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(120);
    if (error) throw error;
    const list = mals || [];
    const ids = list.map((m) => m.id);
    let sugg = [];
    if (ids.length) {
      try { const r = await sb.from('postur_ai_flokkun').select('*').in('beidni_id', ids); sugg = r.data || []; } catch (_) {}
    }
    STATE.mals = list;
    STATE.sugg = new Map(sugg.map((s) => [String(s.beidni_id), s]));
  }

  const isUnclassified = (m) => !m.flokkur && parseTags(m.tags).length === 0;
  const pendingSugg = (m) => { const s = STATE.sugg.get(String(m.id)); return s && s.status === 'tillaga' ? s : null; };
  const toAnalyze = () => STATE.mals.filter((m) => isUnclassified(m) && !STATE.sugg.has(String(m.id)));
  const toReview = () => STATE.mals.filter((m) => pendingSugg(m));

  // ── AI-kall ─────────────────────────────────────────────────────────────────
  async function analyze(mals, btn) {
    const sb = getSB(); if (!sb) return;
    const chunkSize = 15;
    let done = 0;
    for (let i = 0; i < mals.length; i += chunkSize) {
      const batch = mals.slice(i, i + chunkSize);
      if (btn) btn.textContent = '🔎 Greini ' + (done) + '/' + mals.length + '…';
      let out;
      try {
        const r = await fetch('/api/postur-triage', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: batch.map((m) => ({ id: m.id, title: m.title, notes: m.notes, customer_nafn: m.customer_nafn })) }),
        });
        out = await r.json();
        if (!r.ok) { toast('AI-villa: ' + (out.error || r.status), true); break; }
      } catch (e) { toast('Netvilla: ' + (e.message || e), true); break; }
      const results = out.results || {};
      const rows = Object.keys(results).map((bid) => {
        const g = results[bid];
        return { beidni_id: Number(bid), flokkur: g.flokkur, tags: g.tags || [], important: !!g.important,
          summary: g.summary || null, urgency: g.urgency || null, action: g.action || null,
          customer_hint: g.customer_hint || null, model: g.model || out.model || null, status: 'tillaga', created_at: nowIso() };
      });
      if (rows.length) {
        try { await sb.from('postur_ai_flokkun').upsert(rows, { onConflict: 'beidni_id' }); rows.forEach((r) => STATE.sugg.set(String(r.beidni_id), r)); }
        catch (e) { toast('Vistun mistókst: ' + (e.message || e), true); break; }
      }
      done += batch.length;
    }
    toast('🤖 Greindi ' + done + ' mál');
    render();
  }

  // ── Samþykkja / hafna ─────────────────────────────────────────────────────────
  async function apply(id) {
    const sb = getSB(); if (!sb) return;
    const m = STATE.mals.find((x) => String(x.id) === String(id));
    const s = STATE.sugg.get(String(id));
    if (!m || !s) return;
    const patch = { updated_at: nowIso() };
    if (s.flokkur && FLOKKAR[s.flokkur] && !m.flokkur) patch.flokkur = s.flokkur;   // fill-if-empty
    const cur = parseTags(m.tags);
    const merged = [...new Set(cur.concat(parseTags(s.tags)))];
    if (merged.length !== cur.length) patch.tags = merged;                          // union
    if (s.summary && !(m.summary && String(m.summary).trim())) patch.summary = s.summary;  // fill-if-empty
    if (s.important === true && m.important !== true) patch.important = true;        // upgrade-only
    try {
      if (Object.keys(patch).length > 1) { const r = await sb.from('thjonustubeidni').update(patch).eq('id', m.id); if (r.error) throw r.error; Object.assign(m, patch); }
      await sb.from('postur_ai_flokkun').update({ status: 'samthykkt', decided_at: nowIso(), decided_by: me() }).eq('beidni_id', m.id);
      s.status = 'samthykkt';
    } catch (e) { toast('Villa við að nota: ' + (e.message || e), true); return; }
    render();
  }

  async function reject(id) {
    const sb = getSB(); if (!sb) return;
    const s = STATE.sugg.get(String(id)); if (!s) return;
    try { await sb.from('postur_ai_flokkun').update({ status: 'hafnad', decided_at: nowIso(), decided_by: me() }).eq('beidni_id', Number(id)); s.status = 'hafnad'; }
    catch (e) { toast('Villa: ' + (e.message || e), true); return; }
    render();
  }

  async function applyAll() {
    const list = toReview();
    if (!list.length) return;
    if (!window.confirm('Nota allar ' + list.length + ' AI-tillögur? (fyllir aðeins tóma reiti — yfirskrifar ekkert handvirkt)')) return;
    for (const m of list) { await apply(m.id); }  // eslint gott: sequential á tilgangi (fá köll, forðast DB-þrýsting)
    toast('✓ Samþykkti ' + list.length + ' tillögur');
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  function suggCard(m) {
    const s = STATE.sugg.get(String(m.id));
    const cur = parseTags(m.tags);
    const curBits = [];
    if (m.flokkur && FLOKKAR[m.flokkur]) curBits.push('flokkur: ' + FLOKKAR[m.flokkur].label);
    if (cur.length) curBits.push('merki: ' + cur.map((t) => TAGS[t] ? TAGS[t].label : t).join(', '));
    const aiFlokk = s.flokkur && FLOKKAR[s.flokkur] ? chip(FLOKKAR[s.flokkur], s.flokkur) : '<span class="pat-cur">enginn flokkur lagður til</span>';
    const aiTags = parseTags(s.tags).map((t) => chip(TAGS[t], t)).join(' ');
    return '<div class="pat-card" data-card="' + esc(m.id) + '">' +
      '<div class="pat-title">' + esc(m.title || '(án titils)') + '</div>' +
      '<div class="pat-meta">' +
        '<span>' + dt(m.created_at) + '</span>' +
        (m.customer_nafn ? '<span>👤 ' + esc(m.customer_nafn) + (m.customer_base_id ? '' : ' <span style="color:#b45309">(ótengt)</span>') + '</span>' : '') +
        (m.channel_ref ? '<span class="pat-link" title="Tengt tölvupósti">🔗 ' + esc(m.channel_ref) + '</span>' : '') +
      '</div>' +
      (m.notes ? '<div class="pat-notes">' + esc(String(m.notes).slice(0, 600)) + '</div>' : '') +
      (curBits.length ? '<div class="pat-cur">Núverandi → ' + esc(curBits.join(' · ')) + '</div>' : '') +
      '<div class="pat-ai">' +
        '<div class="lead">🤖 GERVIGREIND LEGGUR TIL' + (s.important ? ' · <span class="pat-imp">❗ ÁRÍÐANDI</span>' : '') + '</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">' + aiFlokk + ' ' + aiTags + '</div>' +
        (s.summary ? '<div class="pat-sum"><b>Samantekt:</b> ' + esc(s.summary) + '</div>' : '') +
        (s.action ? '<div class="pat-sum"><b>Næsta skref:</b> ' + esc(s.action) + '</div>' : '') +
        (s.customer_hint && !m.customer_base_id ? '<div class="pat-sum"><b>Mögulegur kúnni:</b> ' + esc(s.customer_hint) + ' <span class="pat-cur">(ekki sjálfkrafa tengt)</span></div>' : '') +
        '<div class="pat-acts">' +
          '<button class="pat-btn go" data-act="apply" data-id="' + esc(m.id) + '">✓ Nota</button>' +
          '<button class="pat-btn" data-act="reject" data-id="' + esc(m.id) + '">✕ Hafna</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function render() {
    const body = document.getElementById('pat-body');
    const bar = document.getElementById('pat-actionbar');
    if (!body) return;
    const review = toReview();
    const pend = toAnalyze();
    if (bar) {
      bar.innerHTML =
        (pend.length ? '<button class="pat-btn go" id="pat-analyze">🔎 Greina ' + pend.length + ' óflokkuð</button>' : '') +
        (review.length ? '<button class="pat-btn" id="pat-applyall">✓ Samþykkja allar (' + review.length + ')</button>' : '');
      const ab = document.getElementById('pat-analyze');
      if (ab) ab.addEventListener('click', () => { ab.disabled = true; analyze(pend, ab); });
      const aa = document.getElementById('pat-applyall');
      if (aa) aa.addEventListener('click', applyAll);
    }
    let html = '';
    if (review.length) {
      html += '<div class="pat-sec">Tillögur til yfirferðar (' + review.length + ')</div>' + review.map(suggCard).join('');
    }
    if (!review.length && pend.length) {
      html += '<div class="pat-empty">' + pend.length + ' óflokkuð email-mál.<br>Ýttu á „🔎 Greina" til að láta gervigreind stinga upp á flokkun.</div>';
    }
    if (!review.length && !pend.length) {
      html += '<div class="pat-empty">✓ Ekkert óflokkað email-mál.<br>Öll email-mál eru flokkuð eða afgreidd.</div>';
    }
    body.innerHTML = html;
    body.querySelectorAll('[data-act="apply"]').forEach((b) => b.addEventListener('click', () => apply(b.getAttribute('data-id'))));
    body.querySelectorAll('[data-act="reject"]').forEach((b) => b.addEventListener('click', () => reject(b.getAttribute('data-id'))));
    updateBadge();
  }

  // ── Gluggi ────────────────────────────────────────────────────────────────────
  function close() { ['pat-backdrop', 'pat-panel'].forEach((id) => { const e = document.getElementById(id); if (e) e.remove(); }); document.removeEventListener('keydown', onKey); }
  function onKey(e) { if (e.key === 'Escape') close(); }

  async function open() {
    injectCSS(); close();
    const bd = document.createElement('div'); bd.id = 'pat-backdrop'; bd.addEventListener('click', close);
    const p = document.createElement('div'); p.id = 'pat-panel';
    p.innerHTML =
      '<div id="pat-bar"><b>🤖 AI-FLOKKUN INNHÓLFS</b>' +
        '<div id="pat-actionbar" style="display:flex;gap:7px;margin-left:auto"></div>' +
        '<button class="pat-btn" id="pat-close">✕</button></div>' +
      '<div id="pat-body"><div class="pat-empty">Sæki email-mál…</div></div>';
    document.body.appendChild(bd); document.body.appendChild(p);
    document.addEventListener('keydown', onKey);
    document.getElementById('pat-close').addEventListener('click', close);
    try { await loadData(); render(); }
    catch (e) { const b = document.getElementById('pat-body'); if (b) b.innerHTML = '<div class="pat-empty" style="color:#b91c1c">Villa: ' + esc(e.message || e) + '</div>'; }
  }

  // ── Fljótandi takki + merki ────────────────────────────────────────────────────
  function ensureLauncher() {
    if (document.getElementById('pat-launch')) return;
    injectCSS();
    const b = document.createElement('button');
    b.id = 'pat-launch';
    b.innerHTML = '🤖 <span>AI-flokka póst</span><span class="pat-badge" id="pat-launch-badge" style="display:none">0</span>';
    b.addEventListener('click', open);
    document.body.appendChild(b);
  }
  function updateBadge() {
    const el = document.getElementById('pat-launch-badge'); if (!el) return;
    const n = toReview().length;
    el.textContent = n; el.style.display = n ? 'inline-flex' : 'none';
  }
  async function badgeOnLoad() {
    // Ódýr talning einu sinni: hversu margar bíðandi tillögur eru til.
    const sb = getSB(); if (!sb) return;
    try {
      const r = await sb.from('postur_ai_flokkun').select('beidni_id', { count: 'exact', head: true }).eq('status', 'tillaga');
      const el = document.getElementById('pat-launch-badge');
      if (el && r.count) { el.textContent = r.count; el.style.display = 'inline-flex'; }
    } catch (_) {}
  }

  function boot() { ensureLauncher(); setTimeout(badgeOnLoad, 2500); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.PosturAiTriage = { open, close };
  console.log('[postur-ai-triage] installed');
})();
