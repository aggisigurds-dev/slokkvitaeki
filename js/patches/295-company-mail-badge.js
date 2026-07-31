/* === PÓST-MERKI Á FYRIRTÆKI Í ÞJÓNUSTU v1 (2026-07-31) ===
 *
 * Ósk Agnars: við förum bara einu sinni á ári til hvers kúnna, svo póstur eða
 * skilaboð frá því fyrir marga mánuði GLEYMAST. Tengjum nýjasta póstsamskiptið
 * við hvert fyrirtæki og sýnum RAUTT umslag á „Fyrirtæki í þjónustu"-listanum
 * þegar við höfum EKKI svarað síðasta pósti frá kúnnanum — með möguleika á að
 * slökkva á merkinu per fyrirtæki (sum póst-samskipti kalla ekki á svar).
 *
 * Gögn: Brunahólfs-endapunktur /api/company-mail (þjónar báðum öppunum) skilar,
 *   per fyrirtaeki_id, nýjasta INN-póstinum + hvort honum hafi verið svarað.
 *   Tenging er VARFÆRIN (nákvæmt netfang, aldrei giskað) svo rautt umslag sé
 *   aldrei rangt. Sjá netlify/functions/company-mail.js í Brunahólf.
 *
 * Slökkva-merki: AppSettings.arsskodun_customers[<id>].mail_off — sama blob og
 *   akstur/urgent/nytt_manual lifa í (samstillist milli tækja, deep-merge). Sama
 *   mynstur og patch 281 (NÝTT-merki). false/true, aldrei delete.
 *
 * Merkið er DEKORERAÐ á raðirnar (MutationObserver) svo patch 153 sé ósnert og
 * async-gögnin birtist um leið og þau berast. Smellur á umslagið opnar litla
 * spjaldið með efnislínu/dagsetningu + „Svara" (mailto) + „Slökkva á merki".
 *
 * Public: window.CompanyMail = { show, data, setMuted, refresh }
 */
(() => {
  if (window.__companyMailBadge) return;
  window.__companyMailBadge = true;

  const API = 'https://brunaholf.netlify.app/api/company-mail';
  const STORAGE_KEY = 'arsskodun_customers';
  const MUTE_FLAG = 'mail_off';
  const CACHE_KEY = 'company_mail_cache_v1';
  const TTL = 20 * 60 * 1000; // 20 mín

  let MAIL = {};        // { <fyrirtaeki_id>: {from, subject, snippet, received_at, is_question, unreplied} }

  // ── mute-flag (per fyrirtæki) ────────────────────────────────────────────
  function muted(coId) {
    try {
      const map = (window.AppSettings && AppSettings.path && AppSettings.path(STORAGE_KEY)) || {};
      const e = map[String(coId)];
      return !!(e && e[MUTE_FLAG] === true);
    } catch (_) { return false; }
  }
  async function setMuted(coId, on) {
    if (!window.AppSettings || !AppSettings.save) return false;
    // AÐEINS þessi eini lykill — AppSettings djúp-merge-ar (sama race-vörn og 281/153).
    try {
      const ok = await AppSettings.save({ [STORAGE_KEY]: { [String(coId)]: { [MUTE_FLAG]: !!on } } });
      return ok !== false;
    } catch (_) { return false; }
  }

  function data(coId) { return MAIL[String(coId)] || null; }
  function show(coId) { const d = data(coId); return !!(d && d.unreplied) && !muted(coId); }

  // ── sækja gögn (cache-first svo merki birtist strax) ─────────────────────
  function loadCache() {
    try {
      const o = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (o && o.byId) { MAIL = o.byId; return !!o.t && (Date.now() - o.t) < TTL; }
    } catch (_) {}
    return false;
  }
  async function refresh() {
    try {
      const r = await fetch(API, { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      MAIL = (j && j.byId) || {};
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), byId: MAIL })); } catch (_) {}
      stampAll();
      reinjectProfile();
    } catch (_) { /* aldrei brjóta síðuna */ }
  }

  // ── umslags-merkið ────────────────────────────────────────────────────────
  function fmtDate(iso) { if (!iso) return ''; try { return new Date(iso).toLocaleDateString('is-IS'); } catch (_) { return ''; } }
  function relDay(iso) {
    if (!iso) return '';
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d <= 0 ? 'í dag' : d === 1 ? 'í gær' : d < 30 ? d + ' dagar síðan' : Math.round(d / 30) + ' mán. síðan';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function badgeEl(coId) {
    const d = data(coId);
    const span = document.createElement('span');
    span.className = '_mail-badge';
    span.dataset.mailCo = coId;
    span.title = 'Ósvarað póstsamskipti: „' + (d && d.subject || '(engin efnislína)') + '" — ' +
      fmtDate(d && d.received_at) + ' (' + relDay(d && d.received_at) + '). Smelltu til að sjá / slökkva.';
    span.style.cssText = 'display:inline-flex;align-items:center;margin-right:6px;cursor:pointer;vertical-align:middle';
    span.innerHTML = '<span style="position:relative;display:inline-flex;font-size:13px;line-height:1">✉️' +
      '<span style="position:absolute;top:-3px;right:-4px;width:8px;height:8px;border-radius:50%;background:#dc2626;box-shadow:0 0 0 1.5px var(--surface,#fff)"></span></span>';
    span.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); openPopover(coId, span); });
    return span;
  }

  function stampInto(nameEl, coId) {
    if (!nameEl) return;
    const existing = nameEl.querySelector(':scope > ._mail-badge');
    if (show(coId)) { if (!existing) nameEl.insertBefore(badgeEl(coId), nameEl.firstChild); }
    else if (existing) existing.remove();
  }
  function stampAll() {
    document.querySelectorAll('tr._ars-row[data-co-id]').forEach(tr => {
      const td = tr.querySelector('td');
      stampInto((td && td.querySelector('div')) || td, +tr.dataset.coId);
    });
    document.querySelectorAll('._ars-card[data-co-id]').forEach(card => {
      stampInto(card.querySelector('._ars-cn'), +card.dataset.coId);
    });
  }

  // ── smá-spjald þegar smellt er á umslagið ────────────────────────────────
  function closePopover() { const p = document.getElementById('_mail-pop'); if (p) p.remove(); }
  function openPopover(coId, anchor) {
    closePopover();
    const d = data(coId);
    if (!d) return;
    const co = ((window.Companies && Companies.list) || []).find(c => String(c.id) === String(coId));
    const nafn = (co && co.nafn) || ('#' + coId);
    const r = anchor.getBoundingClientRect();
    const pop = document.createElement('div');
    pop.id = '_mail-pop';
    pop.style.cssText = 'position:fixed;z-index:99999;max-width:340px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.22);padding:14px 15px;font:inherit;color:#0f172a';
    const top = Math.min(r.bottom + 6, window.innerHeight - 220);
    const left = Math.min(Math.max(8, r.left), window.innerWidth - 356);
    pop.style.top = top + 'px'; pop.style.left = left + 'px';
    const mailto = 'mailto:' + encodeURIComponent(d.from || '') +
      '?subject=' + encodeURIComponent('Re: ' + (d.subject || ''));
    pop.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px">' +
        '<div style="font-weight:800;font-size:13.5px;line-height:1.25">✉️ Ósvarað — ' + esc(nafn) + '</div>' +
        '<button id="_mp-x" style="background:none;border:none;font-size:16px;cursor:pointer;color:#94a3b8;line-height:1">✕</button>' +
      '</div>' +
      '<div style="font-size:12px;color:#475569;margin-bottom:3px">' + esc(d.from || '') +
        ' · <b>' + esc(fmtDate(d.received_at)) + '</b> · ' + esc(relDay(d.received_at)) + '</div>' +
      '<div style="font-weight:700;font-size:13px;margin:6px 0 3px">' + esc(d.subject || '(engin efnislína)') + '</div>' +
      (d.snippet ? '<div style="font-size:12px;color:#64748b;line-height:1.4;max-height:96px;overflow:auto">' + esc(d.snippet) + '</div>' : '') +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">' +
        '<a href="' + mailto + '" id="_mp-reply" style="flex:1;text-align:center;background:#1a7f4b;color:#fff;text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12.5px;font-weight:700">↩️ Svara</a>' +
        '<button id="_mp-mute" style="flex:1;background:#f1f5f9;border:1px solid #e2e8f0;color:#334155;padding:8px 10px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer">🔕 Slökkva á merki</button>' +
      '</div>' +
      '<div style="font-size:10.5px;color:#94a3b8;margin-top:8px">Merkið birtist á meðan síðasta póstsamskipti er ósvarað. Slökktu ef það kallar ekki á svar.</div>';
    document.body.appendChild(pop);
    const stop = e => e.stopPropagation();
    pop.addEventListener('click', stop);
    pop.querySelector('#_mp-x').addEventListener('click', closePopover);
    pop.querySelector('#_mp-reply').addEventListener('click', closePopover);
    pop.querySelector('#_mp-mute').addEventListener('click', async () => {
      const ok = await setMuted(coId, true);
      if (window.Toast && Toast.show) Toast.show(ok ? '🔕 Póst-merki tekið af ' + nafn : '⚠ Vistun mistókst');
      closePopover();
      stampAll();
      reinjectProfile();
    });
    setTimeout(() => document.addEventListener('click', onDocClick), 0);
  }
  function onDocClick(e) {
    const p = document.getElementById('_mail-pop');
    if (p && !p.contains(e.target)) { closePopover(); document.removeEventListener('click', onDocClick); }
  }

  // ── takki á fyrirtækjaprófílnum (kveikja/slökkva merki) ───────────────────
  function injectProfile() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const editBtn = main.querySelector('button[onclick^="Companies.openEdit"]');
    if (!editBtn) return;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/);
    if (!m) return;
    const coId = +m[1];
    const d = data(coId);
    const row = editBtn.parentElement;
    const old = row.querySelector('._co-mail-toggle');
    // Aðeins þegar við eigum matchað póstsamskipti við kúnnann.
    if (!d) { if (old) old.remove(); return; }
    if (old) { paintProfile(old, coId); return; }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = (editBtn.className || 'btn btn-outline btn-sm') + ' _co-mail-toggle';
    const es = editBtn.getAttribute('style');
    if (es) btn.setAttribute('style', es);
    paintProfile(btn, coId);
    btn.addEventListener('click', async e => {
      e.preventDefault(); e.stopPropagation();
      const next = !muted(coId);
      btn.disabled = true;
      const ok = await setMuted(coId, next);
      btn.disabled = false;
      if (!ok) { if (window.Toast && Toast.show) Toast.show('⚠ Vistun mistókst'); return; }
      paintProfile(btn, coId);
      stampAll();
    });
    const svcBtn = row.querySelector('._co-nytt-toggle') || row.querySelector('._co-svc-toggle');
    row.insertBefore(btn, svcBtn || editBtn);
  }
  function paintProfile(btn, coId) {
    const d = data(coId);
    const off = muted(coId);
    btn.textContent = off ? '🔕 Póstmerki (slökkt)' : '📩 Póstmerki';
    btn.title = (d ? 'Nýjasti póstur: ' + fmtDate(d.received_at) + ' — „' + (d.subject || '') + '"' + (d.unreplied ? ' (ósvarað)' : ' (svarað)') + '. ' : '') +
      (off ? 'Merkið er SLÖKKT fyrir þetta fyrirtæki — smelltu til að kveikja.'
           : 'Rautt umslag birtist á listanum þegar ósvarað. Smelltu til að slökkva.');
    if (off) { btn.style.setProperty('color', '#a78bfa', 'important'); btn.style.setProperty('font-weight', '800', 'important'); }
    else { btn.style.removeProperty('color'); btn.style.removeProperty('font-weight'); }
  }
  function reinjectProfile() { try { injectProfile(); } catch (_) {} }

  // ── vöktun: dekorera raðir + prófíl-takka við hverja endurteikningu ───────
  function watch() {
    let t = 0;
    const obs = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => { stampAll(); injectProfile(); }, 150);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // init
  const fresh = loadCache();
  stampAll();
  watch();
  if (!fresh) refresh(); else { stampAll(); refresh(); } // sýna cache strax, uppfæra í bakgrunni
  // AppSettings gæti hlaðist eftir á (mute-flögg) → endurmála nokkrum sinnum.
  [800, 2500, 6000].forEach(t => setTimeout(() => { stampAll(); injectProfile(); }, t));

  window.CompanyMail = { show, data, setMuted, refresh };
  console.log('[company-mail-badge] installed');
})();
/* === END PÓST-MERKI Á FYRIRTÆKI Í ÞJÓNUSTU === */
