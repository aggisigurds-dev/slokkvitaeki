/* === 📇 TENGILIÐIR — netfanga-/tengiliðaskrá úr pósti (2026-08-20) ===
 *
 * Sjálfstæð síða (view `view-tengilidir`, slug `#tengilidir`) sem birtir Charlize
 * tengiliðaskrána (charlize_contacts) — hvert netfang sem sést hefur í eldklar-pósti,
 * tengt fyrirtæki þar sem það er hægt. „Ein tengiliða-heimild, mörg sjónarhorn":
 * hér er heildar-listinn með tengingu + yfirferð; sama gögn og póst-merkin nota.
 *
 * Gögn: brunaholf /api/tengilidir (service-lykill — taflan er RLS-varin, vefurinn
 * kemst ekki beint í hana). GET skilar { contacts, stats }; POST tekur
 * link / unlink / approve / reject. Fyllt af /api/tengilidir-build (eldklar ONLY).
 *
 * ✓ = tengt fyrirtæki (kennitala). Otengt = á eftir að para. Pending = bíður
 * samþykktar. Smellt á fyrirtæki → opnar prófílinn (Companies.openDetail).
 */
(() => {
  if (window.__tengilidirPage) return;
  window.__tengilidirPage = true;

  const API = 'https://brunaholf.netlify.app/api/tengilidir';
  const VIEW_ID = 'view-tengilidir';
  const NAV_KEY = 'tengilidir';
  const NAV_LABEL = '📇 Tengiliðir';
  const ROLE = { bokhald: '💰 Bókhald', husvordur: '🔧 Húsvörður', pantanir: '📦 Pantanir', onnur: '🏢 Skrifstofa' };

  const STATE = { contacts: [], stats: null, filter: 'otengd', search: '', loading: false, loaded: false };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = (iso) => { if (!iso) return ''; try { return new Date(iso).toLocaleDateString('is-IS'); } catch (_) { return ''; } };
  const coByKt = (kt) => { if (!kt) return null; const L = (window.Companies && Companies.list) || []; return L.find((c) => String(c.kennitala || '').replace('-', '') === String(kt).replace('-', '')) || null; };

  function injectCSS() {
    if (document.getElementById('tgl-css')) return;
    const s = document.createElement('style'); s.id = 'tgl-css';
    s.textContent =
      '.tgl-wrap{max-width:1000px;margin:0 auto;padding:14px 16px 70px}' +
      '.tgl-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:10px}' +
      '.tgl-title{font-weight:800;font-size:20px;color:var(--ink,#0f172a)}' +
      '.tgl-sub{font-size:12.5px;color:var(--ink3,#64748b);margin-top:2px}' +
      '.tgl-tools{display:flex;gap:7px;align-items:center;flex-wrap:wrap}' +
      '.tgl-seg{display:inline-flex;border:1px solid var(--brd,#e2e8f0);border-radius:9px;overflow:hidden}' +
      '.tgl-seg button{border:0;background:var(--surface,#fff);color:var(--ink2,#334155);padding:7px 11px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}' +
      '.tgl-seg button.on{background:#4f46e5;color:#fff}' +
      '.tgl-search{border:1px solid var(--brd,#e2e8f0);border-radius:9px;padding:7px 11px;font:inherit;font-size:13px;min-width:190px;background:var(--surface,#fff);color:var(--ink,#0f172a)}' +
      '.tgl-btn{border:1px solid var(--brd,#e2e8f0);background:var(--surface,#fff);color:var(--ink2,#334155);border-radius:9px;padding:7px 12px;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}' +
      '.tgl-row{display:flex;gap:11px;align-items:flex-start;padding:10px 12px;border:1px solid var(--brd,#e2e8f0);border-radius:11px;background:var(--surface,#fff);margin-bottom:7px}' +
      '.tgl-chk{flex:0 0 auto;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;margin-top:1px}' +
      '.tgl-chk.on{background:#dcfce7;color:#16a34a}.tgl-chk.off{background:#f1f5f9;color:#94a3b8}' +
      '.tgl-mid{flex:1;min-width:0}' +
      '.tgl-addr{font-weight:700;font-size:13.5px;color:var(--ink,#0f172a);word-break:break-all}' +
      '.tgl-meta{font-size:12px;color:var(--ink3,#64748b);margin-top:2px}' +
      '.tgl-co{color:#4f46e5;font-weight:700;text-decoration:none;cursor:pointer}.tgl-co:hover{text-decoration:underline}' +
      '.tgl-otengd{color:#b45309;font-weight:700}' +
      '.tgl-pill{display:inline-block;font-size:10.5px;font-weight:800;border-radius:99px;padding:1px 8px;margin-left:6px}' +
      '.tgl-pill.role{background:#eef2ff;color:#4338ca}.tgl-pill.pend{background:#fef3c7;color:#92400e}.tgl-pill.appr{background:#dcfce7;color:#166534}' +
      '.tgl-acts{display:flex;flex-direction:column;gap:5px;flex:0 0 auto}' +
      '.tgl-a{border:1px solid var(--brd,#e2e8f0);background:var(--surface,#fff);border-radius:8px;padding:5px 9px;font:inherit;font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap}' +
      '.tgl-a.link{background:#eef2ff;border-color:#c7d2fe;color:#4338ca}.tgl-a.ok{background:#dcfce7;border-color:#bbf7d0;color:#166534}.tgl-a.no{color:#b91c1c}' +
      '.tgl-empty{text-align:center;color:#94a3b8;padding:34px;font-size:13px}' +
      '.tgl-pick{position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.tgl-pick-box{background:var(--surface,#fff);border-radius:13px;max-width:460px;width:100%;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)}' +
      '.tgl-pick-res{overflow-y:auto;padding:4px}' +
      '.tgl-pick-item{padding:9px 11px;border-radius:8px;cursor:pointer;font-size:13px}.tgl-pick-item:hover{background:#eef2ff}';
    document.head.appendChild(s);
  }

  function counts() {
    const c = STATE.contacts;
    return { all: c.length, otengd: c.filter((x) => !x.kennitala).length, pending: c.filter((x) => x.status === 'pending').length, linked: c.filter((x) => x.kennitala).length };
  }
  function filtered() {
    let arr = STATE.contacts.slice();
    if (STATE.filter === 'otengd') arr = arr.filter((x) => !x.kennitala);
    else if (STATE.filter === 'pending') arr = arr.filter((x) => x.status === 'pending');
    else if (STATE.filter === 'linked') arr = arr.filter((x) => x.kennitala);
    const q = STATE.search.trim().toLowerCase();
    if (q) arr = arr.filter((x) => (x.netfang || '').toLowerCase().includes(q) || (x.len || '').toLowerCase().includes(q) || (x.fyrirtaeki || '').toLowerCase().includes(q));
    return arr;
  }

  function rowHtml(x) {
    const linked = !!x.kennitala;
    const co = coByKt(x.kennitala);
    const coHtml = linked
      ? (co ? '<span class="tgl-co" data-open="' + co.id + '">' + esc(co.nafn) + '</span>' : '<b>' + esc(x.fyrirtaeki || x.kennitala) + '</b>')
      : '<span class="tgl-otengd">otengt</span>';
    const role = x.hlutverk && ROLE[x.hlutverk] ? '<span class="tgl-pill role">' + ROLE[x.hlutverk] + '</span>' : '';
    const st = x.status === 'pending' ? '<span class="tgl-pill pend">bíður</span>' : (x.status === 'approved' ? '<span class="tgl-pill appr">✓ samþykkt</span>' : '');
    const acts = [];
    acts.push('<button class="tgl-a link" data-act="link" data-id="' + x.id + '">🔗 ' + (linked ? 'Breyta' : 'Tengja') + '</button>');
    if (x.status === 'pending') acts.push('<button class="tgl-a ok" data-act="approve" data-id="' + x.id + '">✓ Samþykkja</button>');
    acts.push('<button class="tgl-a no" data-act="reject" data-id="' + x.id + '">✕</button>');
    return '<div class="tgl-row">' +
      '<div class="tgl-chk ' + (linked ? 'on' : 'off') + '">' + (linked ? '✓' : '○') + '</div>' +
      '<div class="tgl-mid">' +
        '<div class="tgl-addr">' + esc(x.netfang) + role + st + '</div>' +
        '<div class="tgl-meta">' + coHtml + ' · ' + esc(x.len || '') + ' · ' + (x.faerslur || 0) + ' póstar' + (x.sidast_sest ? ' · síðast ' + fmtDate(x.sidast_sest) : '') + '</div>' +
      '</div>' +
      '<div class="tgl-acts">' + acts.join('') + '</div>' +
    '</div>';
  }

  function render() {
    const host = document.getElementById('tgl-list'); if (!host) return;
    const c = counts();
    const seg = document.getElementById('tgl-seg'); if (seg) seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.f === STATE.filter));
    const sub = document.getElementById('tgl-subline');
    if (sub) sub.textContent = STATE.stats ? (STATE.stats.total + ' tengiliðir · ' + STATE.stats.linked + ' tengdir · ' + STATE.stats.otengd + ' otengt · ' + STATE.stats.domains + ' lén') : '';
    if (STATE.loading) { host.innerHTML = '<div class="tgl-empty">⏳ Sæki tengiliði…</div>'; return; }
    const arr = filtered();
    if (!arr.length) { host.innerHTML = '<div class="tgl-empty">Engir tengiliðir í þessu sjónarhorni.</div>'; return; }
    host.innerHTML = arr.map(rowHtml).join('');
    host.querySelectorAll('[data-open]').forEach((el) => el.addEventListener('click', () => { try { Companies.openDetail(+el.dataset.open); } catch (_) {} }));
    host.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); onAct(b.dataset.act, +b.dataset.id); }));
  }

  async function post(body) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status));
    return j;
  }
  function apply(updated) { if (!updated) return; const i = STATE.contacts.findIndex((x) => x.id === updated.id); if (i >= 0) STATE.contacts[i] = updated; STATE.stats = null; render(); }

  async function onAct(act, id) {
    const x = STATE.contacts.find((c) => c.id === id); if (!x) return;
    if (act === 'link') return openPicker(x);
    if (act === 'approve') { try { const j = await post({ action: 'approve', id }); apply(j.contact); toast('✓ Samþykkt'); } catch (e) { toast('⚠ ' + e.message); } return; }
    if (act === 'reject') {
      if (!confirm('Hafna tengiliðnum „' + x.netfang + '"? (hann hverfur af listanum)')) return;
      try { await post({ action: 'reject', id }); STATE.contacts = STATE.contacts.filter((c) => c.id !== id); STATE.stats = null; render(); toast('Hafnað'); } catch (e) { toast('⚠ ' + e.message); }
    }
  }

  function openPicker(x) {
    const wrap = document.createElement('div'); wrap.className = 'tgl-pick';
    wrap.innerHTML = '<div class="tgl-pick-box">' +
      '<div style="padding:12px 14px;border-bottom:1px solid var(--brd,#eef2f7)"><div style="font-weight:800;font-size:14px">Tengja ' + esc(x.netfang) + ' við fyrirtæki</div>' +
      '<input class="tgl-search" id="tgl-pick-q" style="width:100%;margin-top:8px;box-sizing:border-box" placeholder="Leita að fyrirtæki (nafn/kt)…" autofocus></div>' +
      '<div class="tgl-pick-res" id="tgl-pick-res"></div>' +
      '<div style="padding:10px 14px;border-top:1px solid var(--brd,#eef2f7);display:flex;justify-content:space-between;gap:8px">' +
        (x.kennitala ? '<button class="tgl-a no" id="tgl-pick-unlink">Aftengja</button>' : '<span></span>') +
        '<button class="tgl-btn" id="tgl-pick-x">Loka</button></div>' +
    '</div>';
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
    wrap.querySelector('#tgl-pick-x').addEventListener('click', close);
    const un = wrap.querySelector('#tgl-pick-unlink');
    if (un) un.addEventListener('click', async () => { try { const j = await post({ action: 'unlink', id: x.id }); apply(j.contact); close(); toast('Aftengt'); } catch (e) { toast('⚠ ' + e.message); } });
    const q = wrap.querySelector('#tgl-pick-q'); const res = wrap.querySelector('#tgl-pick-res');
    const draw = () => {
      const term = q.value.trim().toLowerCase(); const L = (window.Companies && Companies.list) || [];
      let list = L;
      if (term) list = L.filter((c) => (c.nafn || '').toLowerCase().includes(term) || String(c.kennitala || '').replace('-', '').includes(term.replace('-', '')));
      else list = L.filter((c) => (c.len || (c.netfang || '').split('@')[1] || '') === x.len);   // suggest same-domain companies first
      res.innerHTML = list.slice(0, 40).map((c) => '<div class="tgl-pick-item" data-kt="' + esc(c.kennitala || '') + '" data-nm="' + esc(c.nafn || '') + '">' + esc(c.nafn) + (c.kennitala ? ' <span style="color:#94a3b8">' + esc(c.kennitala) + '</span>' : '') + '</div>').join('') || '<div class="tgl-empty">Ekkert fannst</div>';
      res.querySelectorAll('[data-kt]').forEach((it) => it.addEventListener('click', async () => {
        const kt = it.dataset.kt; if (!kt) { toast('⚠ Fyrirtæki vantar kennitölu'); return; }
        try { const j = await post({ action: 'link', id: x.id, kennitala: kt, fyrirtaeki: it.dataset.nm }); apply(j.contact); close(); toast('🔗 Tengt: ' + it.dataset.nm); } catch (e) { toast('⚠ ' + e.message); }
      }));
    };
    q.addEventListener('input', draw); draw(); setTimeout(() => q.focus(), 30);
  }

  function toast(m) { try { if (window.Toast && Toast.show) return Toast.show(m); } catch (_) {} const d = document.createElement('div'); d.textContent = m; d.style.cssText = 'position:fixed;bottom:22px;left:50%;transform:translateX(-50%);z-index:100001;background:#0f172a;color:#fff;padding:9px 15px;border-radius:9px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.3)'; document.body.appendChild(d); setTimeout(() => d.remove(), 2200); }

  async function load() {
    STATE.loading = true; render();
    try {
      const r = await fetch(API, { cache: 'no-store' }); const j = await r.json();
      if (j.error) throw new Error(j.error);
      STATE.contacts = j.contacts || []; STATE.stats = j.stats || null; STATE.loaded = true;
    } catch (e) { const h = document.getElementById('tgl-list'); if (h) h.innerHTML = '<div class="tgl-empty" style="color:#b91c1c"><b>Villa við að sækja tengiliði:</b><br>' + esc(e.message || e) + '</div>'; }
    STATE.loading = false; render();
  }

  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala') || document.querySelector('.view');
    if (!sample || !sample.parentElement) return;
    injectCSS();
    const v = document.createElement('div'); v.id = VIEW_ID; v.className = (sample.className || 'view').replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<div class="tgl-wrap">' +
      '<div class="tgl-head"><div><div class="tgl-title">📇 Tengiliðir</div><div class="tgl-sub" id="tgl-subline"></div></div>' +
        '<div class="tgl-tools">' +
          '<div class="tgl-seg" id="tgl-seg"><button data-f="otengd">Otengt</button><button data-f="pending">Bíður</button><button data-f="linked">Tengt</button><button data-f="all">Allir</button></div>' +
          '<input class="tgl-search" id="tgl-q" type="search" placeholder="Leita (netfang · lén · fyrirtæki)…">' +
          '<button class="tgl-btn" id="tgl-refresh">🔄</button>' +
        '</div></div>' +
      '<div id="tgl-list"><div class="tgl-empty">⏳ Sæki tengiliði…</div></div></div>';
    sample.parentElement.appendChild(v);
    v.querySelector('#tgl-seg').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { STATE.filter = b.dataset.f; render(); }));
    const si = v.querySelector('#tgl-q'); si.addEventListener('input', () => { STATE.search = si.value; render(); });
    v.querySelector('#tgl-refresh').addEventListener('click', () => { STATE.loaded = false; load(); });
  }
  function show() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach((v) => { v.style.display = 'none'; v.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === NAV_KEY));
    try { if (location.hash !== '#' + NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    render();
    if (!STATE.loaded && !STATE.loading) load();
  }
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 600); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const tpl = nav.querySelector('.vnav-btn'); if (!tpl) { setTimeout(injectNav, 600); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY); btn.innerHTML = NAV_LABEL;
    btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); });
    nav.appendChild(btn);
  }
  function patchSwitchView() {
    if (!window.App || window.App._tglSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      const mine = document.getElementById(VIEW_ID); if (mine) { mine.style.display = 'none'; mine.classList.remove('active'); }
      return orig.apply(this, arguments);
    };
    window.App._tglSwitchPatched = true;
  }
  function openFromHash() { const slug = (location.hash || '').replace(/^#/, ''); if (slug === NAV_KEY) { if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); } }
  function boot() {
    injectNav(); patchSwitchView(); ensureView(); openFromHash();
    window.addEventListener('hashchange', openFromHash);
    setTimeout(() => { injectNav(); patchSwitchView(); }, 1600);
    console.log('[tengilidir] page installed (#tengilidir)');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
