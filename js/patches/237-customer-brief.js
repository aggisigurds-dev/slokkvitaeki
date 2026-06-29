/* === CUSTOMER BRIEF — quick "Síðasta úttekt X · Y tæki · Z útrunnin · greitt upp" v1 (237)
 *
 * Þetta er Fasi 1A af „Aðstoðarmaður"-vísíón Agnars (2026-06-29):
 *   - Customer-brief á hover/tap → reglu-byggt fyrst (engin AI-kostnaður)
 *   - Síðar (Fasi 2): AI-augmented summary með Claude
 *
 * Hver brief inniheldur:
 *   - Síðasta úttekt (mánuðir frá last_insp)
 *   - Heildar úttækjafjöldi
 *   - Útrunnin (next_insp <= í dag)
 *   - Greiðslustaða (síðasta sala — paid/unpaid/none)
 *   - 🚨 Áríðandi skilaboð frá AppSettings.arsskodun_customers
 *   - 📍 Margar staðsettningar flagg ef rekstrarfélag á 2+ fyrirtæki
 *
 * Aðgengi:
 *   - Bilstjóri/Companies/Verkborð raða allir [data-co-id="..."]
 *   - MutationObserver decorerar þá með ℹ️ takka (32×32 tap-target)
 *   - Smella → brief popup birtist nálægt
 *   - Long-press á alla röðina virkar líka (mobile shortcut)
 *
 * Reglu-byggt → engin Claude-call → engin kostnaður → keyrir á S26 án nets ef gögnin
 * eru í minninu. Cache 5 mín per coId.
 *
 * Banner-toggle 👁/🙈 í topbar fær öll briefar til að birtast eða fela (sá hluti
 * fer í patch 238 Aðstoðarmiðstöð).
 *
 * Public API: window.CustomerBrief = { compute(coId), show(coId, anchor), invalidate(coId) }
 * ========================================================================== */
(() => {
  if (window.__customerBriefInstalled) return;
  window.__customerBriefInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || window.__vdaSB || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function monthsSince(iso) {
    if (!iso) return null;
    const d = new Date(iso); if (isNaN(d)) return null;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
  }
  function nf(n) { return (Number(n) || 0).toLocaleString('is-IS'); }

  // 5-min cache per coId
  const CACHE = new Map(); // coId -> { ts, brief }
  const CACHE_TTL = 5 * 60 * 1000;

  async function compute(coId) {
    coId = String(coId);
    const cached = CACHE.get(coId);
    if (cached && (Date.now() - cached.ts) < CACHE_TTL) return cached.brief;

    const SB = getSB();
    if (!SB) return { line: '— gagnagrunnur ótengdur —', parts: {}, warnings: [] };

    // Pull: fyrirtæki + customer_base + úttæki (count + min next_insp + max last_insp) + síðasta sala
    const today = todayISO();
    const [coRes, ucountRes, ulastRes, uoverdueRes, salesRes] = await Promise.all([
      SB.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang,customer_base_id,deleted_at').eq('id', coId).maybeSingle(),
      SB.from('uttaeki').select('id', { count: 'exact', head: true }).eq('fyrirtaeki_id', coId).is('deleted_at', null),
      SB.from('uttaeki').select('last_insp,next_insp').eq('fyrirtaeki_id', coId).is('deleted_at', null).order('last_insp', { ascending: false, nullsFirst: false }).limit(1),
      SB.from('uttaeki').select('id', { count: 'exact', head: true }).eq('fyrirtaeki_id', coId).lte('next_insp', today).is('deleted_at', null),
      SB.from('solur').select('id,num,created_at,samtals,status,greitt_med').eq('customer_id', coId).order('created_at', { ascending: false }).limit(1),
    ]);

    const co = coRes && coRes.data || null;
    if (!co) {
      const empty = { line: '(fannst ekki)', parts: {}, warnings: [] };
      CACHE.set(coId, { ts: Date.now(), brief: empty });
      return empty;
    }

    const total = ucountRes && ucountRes.count != null ? ucountRes.count : 0;
    const lastInspISO = ulastRes && ulastRes.data && ulastRes.data[0] && ulastRes.data[0].last_insp;
    const overdue = uoverdueRes && uoverdueRes.count != null ? uoverdueRes.count : 0;
    const lastSale = salesRes && salesRes.data && salesRes.data[0];

    // AppSettings — urgent + priority
    let urgent = '', priority = 0;
    try {
      const ars = (window.AppSettings && AppSettings.path && AppSettings.path('arsskodun_customers')) || {};
      const a = ars[coId] || {};
      urgent = (a.urgent || '').trim();
      priority = +a.priority || 0;
    } catch (_) {}

    // Build parts
    const months = monthsSince(lastInspISO);
    const lastInspText = lastInspISO
      ? (months === 0 ? '< 1 mán' : months === 1 ? '1 mán' : months + ' mán')
      : 'engin';

    let paymentText = '';
    if (lastSale) {
      const s = (lastSale.status || '').toLowerCase();
      if (s.includes('paid') || s.includes('greitt')) paymentText = '✓ greitt upp';
      else if (lastSale.greitt_med === 'reikningur') paymentText = '🧾 reikningur';
      else if (s.includes('void')) paymentText = '— riftað';
      else paymentText = '💳 ' + (lastSale.greitt_med || 'staðgreitt');
    } else paymentText = '— engin sala';

    const warnings = [];
    if (overdue > 0) warnings.push(`${overdue} útrunnin tæki`);
    if (months !== null && months >= 13) warnings.push(`úttekt ${months} mán síðan`);
    if (priority >= 3) warnings.push('forgangur 🚩');
    if (urgent) warnings.push('🚨 áríðandi skilaboð');

    // Headline line
    const parts = [];
    parts.push(`Síðasta úttekt: ${lastInspText}`);
    parts.push(`${nf(total)} tæki`);
    if (overdue > 0) parts.push(`${overdue} útrunnin`);
    parts.push(paymentText);
    if (urgent) parts.push('🚨');

    const brief = {
      line: parts.join(' · '),
      parts: { co, lastInspISO, months, total, overdue, lastSale, urgent, priority },
      warnings,
    };
    CACHE.set(coId, { ts: Date.now(), brief });
    return brief;
  }

  function invalidate(coId) {
    if (coId == null) CACHE.clear();
    else CACHE.delete(String(coId));
  }

  // ── popup ───────────────────────────────────────────────────────────────
  let _activePopup = null;
  function closePopup() {
    if (_activePopup) { _activePopup.remove(); _activePopup = null; }
  }
  function styles() {
    const id = '_cb-styles';
    if (document.getElementById(id)) return;
    const css = `
.cb-popover{position:fixed;z-index:100050;background:var(--surface,#fff);border:1px solid var(--brd,#e6eaf0);border-radius:12px;box-shadow:0 12px 40px rgba(15,23,42,.18);min-width:260px;max-width:340px;padding:12px 14px;font-size:13px;color:var(--ink1,#0f172a);animation:cb-pop .12s ease-out}
@keyframes cb-pop{from{transform:translateY(4px);opacity:0}to{transform:translateY(0);opacity:1}}
.cb-popover h4{margin:0 0 6px;font-size:14px;font-weight:800;letter-spacing:-.01em;line-height:1.25;display:flex;justify-content:space-between;align-items:center;gap:8px}
.cb-popover h4 .cb-x{background:none;border:none;font-size:16px;cursor:pointer;color:var(--ink3,#94a3b8);line-height:1;padding:2px 4px}
.cb-popover .cb-line{font-family:var(--mono,monospace);font-size:12.5px;line-height:1.5;color:var(--ink2,#475569);margin-bottom:8px}
.cb-popover .cb-warn{font-size:12px;background:#fef3c7;border:1px solid #fde68a;color:#92400e;border-radius:7px;padding:5px 9px;margin-top:6px;font-weight:600}
.cb-popover .cb-urgent{background:#fee2e2;border-color:#fecaca;color:#991b1b}
.cb-popover .cb-foot{margin-top:10px;display:flex;gap:6px;justify-content:flex-end}
.cb-popover .cb-foot a{font-size:12px;color:var(--brand,#0d6efd);text-decoration:none;font-weight:600;padding:4px 10px;border-radius:99px;background:rgba(13,110,253,.08)}
.cb-popover .cb-foot a:hover{background:rgba(13,110,253,.15)}
.cb-icon{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(15,23,42,.06);color:var(--ink2,#475569);font-size:12px;border:none;cursor:pointer;margin-left:6px;vertical-align:middle;flex-shrink:0;line-height:1;padding:0}
.cb-icon:hover{background:rgba(13,110,253,.15);color:var(--brand,#0d6efd)}
@media (max-width:520px){.cb-icon{width:28px;height:28px;font-size:13px}}
html[data-cb-hidden="1"] .cb-icon{display:none}
.cb-spin{display:inline-block;width:11px;height:11px;border:2px solid #cbd5e1;border-top-color:var(--brand,#0d6efd);border-radius:50%;animation:cb-rot .7s linear infinite;vertical-align:middle}
@keyframes cb-rot{to{transform:rotate(360deg)}}
`;
    const tag = document.createElement('style');
    tag.id = id; tag.textContent = css;
    document.head.appendChild(tag);
  }

  function placePopover(pop, anchor) {
    const ar = anchor.getBoundingClientRect();
    const pr = pop.getBoundingClientRect();
    const margin = 10;
    let top = ar.bottom + 6;
    let left = ar.left;
    // Off the right edge?
    if (left + pr.width > window.innerWidth - margin) left = window.innerWidth - pr.width - margin;
    if (left < margin) left = margin;
    // Off the bottom? Flip above.
    if (top + pr.height > window.innerHeight - margin) {
      top = Math.max(margin, ar.top - pr.height - 6);
    }
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';
  }

  async function show(coId, anchor) {
    if (!coId) return;
    closePopup();
    styles();
    const pop = document.createElement('div');
    pop.className = 'cb-popover';
    pop.innerHTML = '<h4><span><span class="cb-spin"></span> Sæki brief…</span><button class="cb-x" type="button" aria-label="Loka">✕</button></h4>';
    document.body.appendChild(pop);
    _activePopup = pop;
    placePopover(pop, anchor || document.body);
    pop.querySelector('.cb-x').addEventListener('click', closePopup);
    setTimeout(() => {
      document.addEventListener('click', _outside, true);
      document.addEventListener('keydown', _esc, true);
    }, 30);

    let brief;
    try { brief = await compute(coId); }
    catch (e) { brief = { line: '⚠️ Villa: ' + ((e && e.message) || e), parts: {}, warnings: [] }; }
    if (pop !== _activePopup) return; // popup was closed during fetch

    const co = (brief.parts && brief.parts.co) || {};
    const warns = (brief.warnings || []).map(w => {
      const isUrg = w.indexOf('🚨') === 0;
      return '<div class="cb-warn' + (isUrg ? ' cb-urgent' : '') + '">' + esc(w) + '</div>';
    }).join('');
    const urgentMsg = (brief.parts && brief.parts.urgent)
      ? '<div class="cb-warn cb-urgent">🚨 ' + esc(brief.parts.urgent) + '</div>'
      : '';
    pop.innerHTML =
      '<h4><span>' + esc(co.nafn || '(fannst ekki)') + '</span><button class="cb-x" type="button" aria-label="Loka">✕</button></h4>' +
      '<div class="cb-line">' + esc(brief.line) + '</div>' +
      urgentMsg + warns +
      '<div class="cb-foot">' +
        '<a href="#" data-co-open="' + esc(String(coId)) + '">Opna fyrirtæki →</a>' +
      '</div>';
    pop.querySelector('.cb-x').addEventListener('click', closePopup);
    pop.querySelector('[data-co-open]').addEventListener('click', e => {
      e.preventDefault();
      closePopup();
      if (window.App && App.switchView) App.switchView('companies');
      setTimeout(() => { try { if (window.Companies && Companies.openDetail) Companies.openDetail(+coId); } catch (_) {} }, 60);
    });
    placePopover(pop, anchor || document.body);
  }

  function _outside(e) {
    if (!_activePopup) return;
    if (_activePopup.contains(e.target)) return;
    if (e.target.closest && e.target.closest('.cb-icon')) return;
    closePopup();
  }
  function _esc(e) {
    if (e.key === 'Escape') { closePopup(); }
  }
  document.addEventListener('click', e => {
    // Cleanup listeners when popup is gone
    if (!_activePopup) {
      document.removeEventListener('click', _outside, true);
      document.removeEventListener('keydown', _esc, true);
    }
  }, true);

  // ── auto-decorate [data-co-id] elements with an ℹ️ button ─────────────────
  function decorate(el) {
    if (!el || el.dataset.cbDecorated) return;
    const coId = el.getAttribute('data-co-id');
    if (!coId || !/^\d+$/.test(coId)) return;
    // Avoid decorating action buttons (data-co-id on a button = it does something)
    if (el.tagName === 'BUTTON' || el.tagName === 'A') return;
    el.dataset.cbDecorated = '1';

    // Find a good place to put the icon: prefer a heading/strong within the row
    let host = el.querySelector('h1,h2,h3,h4,h5,strong,.nm,.title,._cb-host');
    if (!host) host = el; // fallback: hang off the row itself

    // Don't double-add
    if (host.querySelector(':scope > .cb-icon')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cb-icon';
    btn.title = 'Sýna brief (ℹ︎)';
    btn.setAttribute('aria-label', 'Brief');
    btn.textContent = 'ℹ︎';
    btn.addEventListener('click', e => {
      e.stopPropagation(); e.preventDefault();
      show(coId, btn);
    });
    host.appendChild(btn);
  }

  function scan(root) {
    (root || document).querySelectorAll('[data-co-id]:not([data-cb-decorated])').forEach(decorate);
  }

  let _scanTimer = 0;
  function scheduleScans() {
    clearTimeout(_scanTimer);
    _scanTimer = setTimeout(() => scan(document), 100);
  }

  function bootMutationObserver() {
    styles();
    scan(document);
    const obs = new MutationObserver(muts => {
      for (const m of muts) {
        if (m.addedNodes && m.addedNodes.length) { scheduleScans(); return; }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // Banner toggle in topbar — 👁 sýnir öll briefar, 🙈 felur þau
  const TOGGLE_KEY = 'cb_hidden_v1';
  function applyToggleState() {
    const hidden = localStorage.getItem(TOGGLE_KEY) === '1';
    document.documentElement.setAttribute('data-cb-hidden', hidden ? '1' : '0');
    const btn = document.getElementById('_cb-toggle');
    if (btn) {
      btn.textContent = hidden ? '🙈' : '👁';
      btn.title = hidden ? 'Sýna briefar' : 'Fela briefar';
    }
  }
  function ensureToggle() {
    if (document.getElementById('_cb-toggle')) return;
    // Find topbar / header — try multiple selectors
    const host = document.querySelector('.topbar, header.topbar, #topbar, .top-bar, header');
    if (!host) return;
    const btn = document.createElement('button');
    btn.id = '_cb-toggle';
    btn.type = 'button';
    btn.className = 'cb-toggle';
    btn.style.cssText = 'background:transparent;border:1px solid rgba(255,255,255,.15);color:inherit;width:30px;height:30px;border-radius:8px;font-size:14px;cursor:pointer;margin:0 4px;padding:0;display:inline-flex;align-items:center;justify-content:center';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      const cur = localStorage.getItem(TOGGLE_KEY) === '1';
      localStorage.setItem(TOGGLE_KEY, cur ? '0' : '1');
      applyToggleState();
    });
    host.appendChild(btn);
    applyToggleState();
  }

  // boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { bootMutationObserver(); ensureToggle(); });
  } else {
    bootMutationObserver();
    ensureToggle();
  }
  // Re-attempt toggle insertion after topbar may have been built by another patch
  setTimeout(ensureToggle, 1500);

  // public API
  window.CustomerBrief = { compute, show, invalidate, close: closePopup };
})();
