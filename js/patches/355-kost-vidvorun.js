/* === KOSTNAÐARREIKNINGAR BÍÐA — BORÐI Í SÖLU + VIÐVÖRUN Í BRUNAKERFISSKÝRSLU (355) ===
 *
 * Agnar 06.09.2026: „þegar ég fer að gera reikning í sölu eða brunakerfisúttektarskýrslu, mun þetta
 * þá koma inn eða einhvers konar viðvörun?" — „jú, láta birtast á báðum stöðum".
 *
 * Kostnaðarreikningar (birgjareikningar sem eru endurrukkaðir) búa í Drög-stöð hubbsins
 * (reikningspunktar.karfa.kostnadur). Hookurinn á endurrukkunaraðilann:
 *   1. SALA: þegar kúnni er valinn (kt / nafn) er spurt GET /api/reikningspunktar?op=bidur&kt=&kunni=
 *      og borði birtist í kúnnakassanum: hvað bíður, upphæð án vsk, „🛒 Sækja í körfu" (POST
 *      kost_til_korfu {sent:true} → línurnar á söluverði hlaðast í POS-körfuna með 352 hlada())
 *      og „Opna í Drög-stöð ↗".
 *   2. BRUNAKERFISSKÝRSLA (273): sama fyrirspurn þegar formið opnast fyrir fyrirtæki — viðvörunar-
 *      borði efst í forminu með hlekk. Skýrslan sjálf breytist ekki; reikningurinn verður til í Sölu.
 *
 * Engin gögn í vafra — allt lesið úr hubbnum í hvert sinn (skyndiminni 60 s per kúnna).
 * 153/187-reikningur ÓSNERTUR. Vörðuð leið POS (121/pos.js) er ekki snert — við hlöðum aðeins körfuna
 * gegnum 352 eins og „Senda í körfu" úr Drög-stöð gerir.
 * ========================================================================== */
(() => {
  if (window.KostVidvorun) return;
  const HUB = 'https://brunaholf.netlify.app';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(Number(n) || 0).toLocaleString('is-IS').replace(/,/g, '.');
  const digits = s => String(s || '').replace(/\D/g, '');
  const toast = t => { try { if (window.Toast && Toast.show) Toast.show(t); } catch (_) {} };
  const cache = {};   // sig → { at, data }

  async function bidur(kt, nafn) {
    const sig = digits(kt) + '|' + String(nafn || '').trim().toLowerCase();
    if (sig === '|') return null;
    const c = cache[sig]; if (c && Date.now() - c.at < 60000) return c.data;
    const qs = new URLSearchParams(); if (digits(kt).length >= 10) qs.set('kt', digits(kt)); if (nafn) qs.set('kunni', String(nafn).trim());
    if (![...qs.keys()].length) return null;
    const r = await fetch(HUB + '/api/reikningspunktar?op=bidur&' + qs.toString(), { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
    cache[sig] = { at: Date.now(), data: j };
    return j;
  }
  function gleyma() { for (const k in cache) delete cache[k]; }

  function lysing(j) {
    const rows = j.rows || []; const n = j.samtals ? j.samtals.n : 0;
    const birgjar = [...new Set(rows.flatMap(r => r.entries.map(e => e.birgir)).filter(Boolean))];
    const nr = rows.flatMap(r => r.entries.map(e => (e.kredit ? '↩ ' : '') + (e.nr || ''))).filter(Boolean);
    return n + ' kostnaðarreikning' + (n === 1 ? 'ur bíður' : 'ar bíða') + ' endurrukkunar'
      + (birgjar.length ? ' — ' + birgjar.join(', ') : '') + (nr.length ? ' (' + nr.slice(0, 4).join(', ') + (nr.length > 4 ? ' …' : '') + ')' : '')
      + ' · endurkrafa ' + fmt(j.samtals.endurkrafa_an_vsk) + ' kr án vsk';
  }

  /* ── 1. SALA ─────────────────────────────────────────────────────────── */
  const CSS = [
    '#_kost-banner{margin-top:10px;padding:10px 12px;background:#fff7ed;border:1px solid #fdba74;border-left:4px solid #ea580c;border-radius:8px;font-size:13px;color:#7c2d12;line-height:1.45}',
    '#_kost-banner b{color:#9a3412}#_kost-banner .kb-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}',
    '#_kost-banner button,#_kost-banner a.kb-btn{font:inherit;font-size:13px;font-weight:700;min-height:40px;padding:0 12px;border-radius:8px;border:1px solid #fdba74;background:#fff;color:#7c2d12;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px}',
    '#_kost-banner button.prim{background:#ea580c;border-color:#ea580c;color:#fff}',
    '._bks-kost{margin:0 0 12px;padding:10px 12px;background:#fff7ed;border:1px solid #fdba74;border-left:4px solid #ea580c;border-radius:8px;font-size:13px;color:#7c2d12;line-height:1.45;display:flex;gap:10px;flex-wrap:wrap;align-items:center}',
    '._bks-kost a{font-weight:700;color:#9a3412}',
  ].join('\n');
  function css() { if (document.getElementById('kost-vidvorun-355')) return; const s = document.createElement('style'); s.id = 'kost-vidvorun-355'; s.textContent = CSS; document.head.appendChild(s); }

  let lastSig = '', lastData = null, busy = false;
  function posCustomer() {
    try { const st = window.POS && POS.getState && POS.getState(); const c = st && st.customer; if (!c) return null; return { kt: c.kt || '', nafn: c.nafn || '', co_id: c.co_id || null }; } catch (_) { return null; }
  }
  function posHost() {
    const memo = document.getElementById('pos-customer-memo'); if (memo && memo.parentNode) return memo.parentNode;
    const kb = document.getElementById('pos-kt-box'); return kb ? kb.parentNode : null;
  }
  function renderPos(j) {
    const host = posHost(); if (!host) return;
    let b = document.getElementById('_kost-banner');
    if (!j || !(j.rows || []).length) { if (b) b.remove(); return; }
    css();
    if (!b) { b = document.createElement('div'); b.id = '_kost-banner'; host.appendChild(b); }
    const first = j.rows[0]; const fleiri = j.rows.length - 1;
    b.innerHTML = '🧾 <b>' + esc(lysing(j)) + '</b>'
      + (first.kunni ? '<div style="font-size:12px;margin-top:2px">Á punkti #' + esc(first.punktur) + ' · ' + esc(first.kunni) + (fleiri > 0 ? ' · +' + fleiri + ' punkt' + (fleiri === 1 ? 'ur' : 'ar') + ' til viðbótar' : '') + '</div>' : '')
      + '<div class="kb-acts"><button type="button" class="prim" data-kb="saekja" data-id="' + esc(first.punktur) + '" title="Setur línurnar á fullu listaverði í körfuna hér — kreditnótur sleppa">🛒 Sækja í körfu</button>'
      + '<a class="kb-btn" href="' + HUB + '/?punktur=' + esc(first.punktur) + '#drogstod" target="_blank" rel="noopener">Opna í Drög-stöð ↗</a></div>';
    if (!b.dataset.wired) {
      b.dataset.wired = '1';
      b.addEventListener('click', async e => {
        const btn = e.target.closest('[data-kb="saekja"]'); if (!btn) return;
        e.preventDefault(); await saekja(Number(btn.dataset.id), { sent: true }, btn);
      });
    }
  }
  async function saekja(id, opts, btn) {
    opts = opts || {};
    if (!(window.KarfaUrDrogstod && KarfaUrDrogstod.hlada)) { alert('Söluborðið er ekki tilbúið (352 vantar)'); return false; }
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sæki…'; }
    try {
      const r = await fetch(HUB + '/api/reikningspunktar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'kost_til_korfu', id, sent: opts.sent !== false, by: 'soluborð' }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.row) throw new Error(j.error || ('HTTP ' + r.status));
      const ok = await KarfaUrDrogstod.hlada(j.row);
      if (ok) { toast('🧾 ' + j.linur + ' lín' + (j.linur === 1 ? 'a' : 'ur') + ' úr kostnaðarreikningum komnar í körfuna'); gleyma(); lastSig = ''; setTimeout(athuga, 300); }
      else if (btn) { btn.disabled = false; btn.textContent = '🛒 Sækja í körfu'; }
      return ok;
    } catch (e) { alert('Tókst ekki að sækja: ' + (e.message || e)); if (btn) { btn.disabled = false; btn.textContent = '🛒 Sækja í körfu'; } return false; }
  }
  async function athuga() {
    const v = document.getElementById('view-sala'); if (!v || !v.classList.contains('active')) return;
    const c = posCustomer(); if (!c) return;
    const sig = digits(c.kt) + '|' + String(c.nafn || '').trim().toLowerCase() + '|' + (c.co_id || '');
    if (sig === lastSig) { if (lastData && !document.getElementById('_kost-banner')) renderPos(lastData); return; }   // endur-teikning POS þurrkaði borðann
    if (busy) return; busy = true;
    try {
      lastSig = sig;
      const nothing = digits(c.kt).length < 10 && !(c.nafn && c.nafn !== 'Staðgreitt');
      lastData = nothing ? null : await bidur(c.kt, c.co_id ? c.nafn : c.nafn);
      renderPos(lastData);
    } catch (_) { lastData = null; renderPos(null); }
    finally { busy = false; }
  }
  setInterval(athuga, 1500);

  /* ── 2. BRUNAKERFISSKÝRSLA ──────────────────────────────────────────── */
  let bkData = null, bkSig = '';
  async function bkAthuga(co) {
    if (!co) return;
    const sig = digits(co.kennitala) + '|' + String(co.nafn || '').toLowerCase();
    try { bkData = await bidur(co.kennitala, co.nafn); bkSig = sig; } catch (_) { bkData = null; }
    bkRender();
  }
  function bkRender() {
    const wrap = document.querySelector('._bks-wrap'); if (!wrap) return;
    let b = wrap.querySelector('._bks-kost');
    if (!bkData || !(bkData.rows || []).length) { if (b) b.remove(); return; }
    css();
    if (!b) { b = document.createElement('div'); b.className = '_bks-kost'; wrap.insertAdjacentElement('afterbegin', b); }
    const first = bkData.rows[0];
    b.innerHTML = '<span>⚠ 🧾 <b>' + esc(lysing(bkData)) + '</b> — þeir fara á reikninginn í <b>Sölu</b> (borðinn þar sækir línurnar), ekki á skýrsluna.</span>'
      + '<a href="' + HUB + '/?punktur=' + esc(first.punktur) + '#drogstod" target="_blank" rel="noopener">Opna í Drög-stöð ↗</a>';
  }
  function wrapBk() {
    try {
      const B = window.BrunakerfiSkyrsla; if (!B || typeof B.openForm !== 'function' || B.openForm.__kost355) return false;
      const orig = B.openForm;
      B.openForm = function (co, existing) { const r = orig.apply(this, arguments); bkData = null; bkSig = ''; bkAthuga(co); return r; };
      B.openForm.__kost355 = true;
      return true;
    } catch (_) { return false; }
  }
  wrapBk(); [500, 1500, 4000].forEach(ms => setTimeout(wrapBk, ms));
  // formið endurteiknar sig (renderWork) — borðinn settur inn aftur meðan það er opið
  setInterval(() => { try { const wrap = document.querySelector('._bks-wrap'); if (wrap && bkData && !wrap.querySelector('._bks-kost')) bkRender(); } catch (_) {} }, 1500);

  window.KostVidvorun = { bidur, saekja, athuga, gleyma, version: '355' };
  console.log('[patch-355] kostnaðarreikningar: borði í Sölu + viðvörun í brunakerfisskýrslu');
})();
/* === END KOSTNAÐARREIKNINGAR BÍÐA === */
