/* === PÓST-STÖÐUMERKI Á FYRIRTÆKI Í ÞJÓNUSTU v2 (2026-08-20) ===
 *
 * Umferðarljós fyrir póstsamskipti á „Fyrirtæki í þjónustu"-listanum (mánaðar-
 * yfirlitið sem við notum mikið). Ósk Agnars: við förum bara einu sinni á ári
 * til hvers kúnna, svo póstur frá því fyrir marga mánuði GLEYMIST — sérstaklega
 * ef kúnninn sagði upp, flutti, skipti um eiganda eða varð gjaldþrota. Merkið:
 *
 *   🔴 RAUTT   = síðasta póstsamskipti frá kúnna er ÓSVARAÐ (kallar á svar).
 *   🟡 GULT    = mikilvægt / möguleg breyting í póstsögunni (uppsögn, flutt,
 *                eigendaskipti, gjaldþrot, kvörtun, bilun, áríðandi) EÐA handvirkt
 *                merkt mikilvægt af þér. Smelltu til að sjá hvað og hvenær.
 *   🟢 GRÆNT   = við eigum póstsögu og henni er svarað (í sambandi, allt í lagi).
 *   (ekkert)   = engin póstsamskipti fundust við kúnnann.
 *
 * Röð: rautt (ósvarað) > gult (mikilvægt/breyting) > grænt (saga). Slökkt
 * ósvarað-merki (mail_off) fellur niður í gult/grænt; handvirkt „mikilvægt"
 * (mail_important) lyftir í gult.
 *
 * Gögn: Brunahólfs-endapunktur /api/company-mail skilar, per fyrirtaeki_id,
 *   nýjasta INN-póstinum + `unreplied` + `important` + `signals[]` ({type,
 *   subject, received_at}) þar sem viewið skannar ALLA innkomna pósta ársins
 *   eftir breytinga-/athygli-merkjum. Tenging er VARFÆRIN (nákvæmt netfang).
 *
 * Flögg per fyrirtæki í AppSettings.arsskodun_customers[<id>]: `mail_off`
 *   (slökkva ósvarað-merki) og `mail_important` (handvirkt gult). Sama blob og
 *   akstur/urgent/nytt_manual (deep-merge, samstillist milli tækja).
 *
 * Public: window.CompanyMail = { show, status, data, setMuted, setImportant, refresh }
 */
(() => {
  if (window.__companyMailBadge) return;
  window.__companyMailBadge = true;

  const API = 'https://brunaholf.netlify.app/api/company-mail';
  const STORAGE_KEY = 'arsskodun_customers';
  const MUTE_FLAG = 'mail_off';
  const IMP_FLAG = 'mail_important';
  const CACHE_KEY = 'company_mail_cache_v2';
  const TTL = 20 * 60 * 1000; // 20 mín

  let MAIL = {};  // { <fyrirtaeki_id>: {from,subject,snippet,received_at,is_question,unreplied,important,signals[]} }

  const DOT = { red: '#dc2626', yellow: '#d97706', green: '#16a34a' };
  const ST_LABEL = { red: 'Ósvarað', yellow: 'Mikilvægt / breyting?', green: 'Í sambandi' };
  // Merki úr póstsögunni — lífsferils-merkin (life:true) eru þau sem má ekki gleyma.
  const SIG = {
    uppsogn:    { t: 'Sagði upp þjónustu',          ic: '🚪', life: true },
    flutt:      { t: 'Flutt / nýtt heimilisfang',   ic: '📦', life: true },
    eigandi:    { t: 'Eigendaskipti / nýr rekstur', ic: '🔑', life: true },
    gjaldthrot: { t: 'Gjaldþrot / þrotabú',         ic: '🏚️', life: true },
    kvortun:    { t: 'Kvörtun / óánægja',           ic: '😠', life: false },
    bilun:      { t: 'Bilun / öryggismál',          ic: '🔧', life: false },
    aridandi:   { t: 'Áríðandi',                    ic: '⏰', life: false },
  };

  // ── flögg (per fyrirtæki) ────────────────────────────────────────────────
  function flagOn(coId, key) {
    try {
      const map = (window.AppSettings && AppSettings.path && AppSettings.path(STORAGE_KEY)) || {};
      const e = map[String(coId)];
      return !!(e && e[key] === true);
    } catch (_) { return false; }
  }
  const muted = (coId) => flagOn(coId, MUTE_FLAG);
  const manualImp = (coId) => flagOn(coId, IMP_FLAG);
  async function saveFlag(coId, key, on) {
    if (!window.AppSettings || !AppSettings.save) return false;
    try { const ok = await AppSettings.save({ [STORAGE_KEY]: { [String(coId)]: { [key]: !!on } } }); return ok !== false; }
    catch (_) { return false; }
  }
  const setMuted = (coId, on) => saveFlag(coId, MUTE_FLAG, on);
  const setImportant = (coId, on) => saveFlag(coId, IMP_FLAG, on);

  function data(coId) { return MAIL[String(coId)] || null; }
  // 'red' | 'yellow' | 'green' | null
  function status(coId) {
    const d = data(coId);
    if (d && d.unreplied && !muted(coId)) return 'red';
    if (manualImp(coId) || (d && d.important)) return 'yellow';
    if (d) return 'green';
    return null;
  }
  function show(coId) { return status(coId) !== null; }

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

  // ── dagsetningar ──────────────────────────────────────────────────────────
  function fmtDate(iso) { if (!iso) return ''; try { return new Date(iso).toLocaleDateString('is-IS'); } catch (_) { return ''; } }
  function monYr(iso) { if (!iso) return ''; try { return new Date(iso).toLocaleDateString('is-IS', { month: 'short', year: 'numeric' }); } catch (_) { return ''; } }
  function relDay(iso) {
    if (!iso) return '';
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d <= 0 ? 'í dag' : d === 1 ? 'í gær' : d < 30 ? d + ' dagar síðan' : Math.round(d / 30) + ' mán. síðan';
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // ── umslags-/dobbu-merkið á listanum ──────────────────────────────────────
  function tipFor(coId, st, d) {
    const parts = [];
    parts.push(ST_LABEL[st] || '');
    const sig = (d && d.signals) || [];
    if (sig.length) parts.push('Merki: ' + sig.map(s => (SIG[s.type] ? SIG[s.type].t : s.type) + (s.received_at ? ' (' + monYr(s.received_at) + ')' : '')).join(', '));
    if (d && d.subject) parts.push('Nýjast: „' + d.subject + '" — ' + fmtDate(d.received_at) + ' (' + relDay(d.received_at) + ')');
    return parts.filter(Boolean).join(' · ') + '. Smelltu til að sjá.';
  }
  function badgeEl(coId) {
    const st = status(coId);
    const d = data(coId);
    const span = document.createElement('span');
    span.className = '_mail-badge';
    span.dataset.mailCo = coId;
    span.dataset.mailSt = st || '';
    span.title = tipFor(coId, st, d);
    span.style.cssText = 'display:inline-flex;align-items:center;margin-right:6px;cursor:pointer;vertical-align:middle';
    const color = DOT[st] || '#94a3b8';
    if (st === 'green') {
      // rólegt grænt punktamerki (saga, allt í lagi) — ekkert umslag
      span.innerHTML = '<span style="width:9px;height:9px;border-radius:50%;background:' + color + ';display:inline-block;box-shadow:0 0 0 1.5px var(--surface,#fff)"></span>';
    } else {
      // rautt/gult: umslag með lituðum punkti (það er póstur að skoða)
      span.innerHTML = '<span style="position:relative;display:inline-flex;font-size:13px;line-height:1">✉️' +
        '<span style="position:absolute;top:-3px;right:-4px;width:8px;height:8px;border-radius:50%;background:' + color + ';box-shadow:0 0 0 1.5px var(--surface,#fff)"></span></span>';
    }
    span.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); openPopover(coId, span); });
    return span;
  }

  function stampInto(nameEl, coId) {
    if (!nameEl) return;
    const existing = nameEl.querySelector(':scope > ._mail-badge');
    const st = status(coId);
    if (st) {
      if (!existing) nameEl.insertBefore(badgeEl(coId), nameEl.firstChild);
      else if (existing.dataset.mailSt !== st) { existing.replaceWith(badgeEl(coId)); } // litur breyttist
    } else if (existing) existing.remove();
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

  // ── smá-spjald þegar smellt er á merkið ──────────────────────────────────
  function closePopover() { const p = document.getElementById('_mail-pop'); if (p) p.remove(); }
  function signalsHtml(d) {
    const sig = (d && d.signals) || [];
    if (!sig.length) return '';
    const rows = sig.map(s => {
      const m = SIG[s.type] || { t: s.type, ic: '•', life: false };
      const bg = m.life ? '#fef3c7' : '#f1f5f9', bd = m.life ? '#fde68a' : '#e2e8f0', fg = m.life ? '#92400e' : '#334155';
      return '<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 9px;border-radius:8px;margin-top:5px;background:' + bg + ';border:1px solid ' + bd + '">' +
        '<span style="font-size:14px;line-height:1.2">' + m.ic + '</span>' +
        '<div style="min-width:0"><div style="font-weight:800;font-size:12.5px;color:' + fg + '">' + esc(m.t) + (m.life ? ' — athugaðu áður en þú ferð' : '') + '</div>' +
        '<div style="font-size:11px;color:#64748b">' + esc(monYr(s.received_at)) + (s.subject ? ' · „' + esc(String(s.subject).slice(0, 64)) + '"' : '') + '</div></div></div>';
    }).join('');
    return '<div style="margin:6px 0 2px"><div style="font-size:10.5px;font-weight:800;letter-spacing:.05em;color:#b45309;text-transform:uppercase">⚠️ Merki í póstsögu</div>' + rows + '</div>';
  }
  function openPopover(coId, anchor) {
    closePopover();
    const d = data(coId);
    const st = status(coId);
    const co = ((window.Companies && Companies.list) || []).find(c => String(c.id) === String(coId));
    const nafn = (co && co.nafn) || ('#' + coId);
    const r = anchor.getBoundingClientRect();
    const pop = document.createElement('div');
    pop.id = '_mail-pop';
    pop.style.cssText = 'position:fixed;z-index:99999;width:340px;max-width:94vw;background:#fff;border:1px solid #e5e7eb;border-radius:12px;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.22);padding:13px 15px;font:inherit;color:#0f172a';
    const top = Math.min(r.bottom + 6, window.innerHeight - 300);
    const left = Math.min(Math.max(8, r.left - 20), window.innerWidth - 350);
    pop.style.top = Math.max(8, top) + 'px'; pop.style.left = left + 'px';
    const mailto = d ? 'mailto:' + encodeURIComponent(d.from || '') + '?subject=' + encodeURIComponent('Re: ' + (d.subject || '')) : '';
    const stColor = DOT[st] || '#94a3b8';
    const isImp = manualImp(coId);
    pop.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px">' +
        '<div style="display:flex;align-items:center;gap:7px;min-width:0">' +
          '<span style="width:11px;height:11px;border-radius:50%;background:' + stColor + ';flex:0 0 auto"></span>' +
          '<div style="min-width:0"><div style="font-weight:800;font-size:13.5px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(nafn) + '</div>' +
          '<div style="font-size:11px;color:' + stColor + ';font-weight:700">' + esc(ST_LABEL[st] || '') + '</div></div>' +
        '</div>' +
        '<button id="_mp-x" style="background:none;border:none;font-size:16px;cursor:pointer;color:#94a3b8;line-height:1">✕</button>' +
      '</div>' +
      signalsHtml(d) +
      (d ?
        '<div style="margin-top:8px;padding-top:8px;border-top:1px solid #f1f5f9">' +
          '<div style="font-size:11px;color:#475569;margin-bottom:2px">Nýjasti póstur · ' + esc(d.from || '') + '</div>' +
          '<div style="font-size:12px;color:#334155"><b>' + esc(fmtDate(d.received_at)) + '</b> · ' + esc(relDay(d.received_at)) + (d.unreplied ? ' · <span style="color:#dc2626;font-weight:800">ósvarað</span>' : ' · svarað') + '</div>' +
          '<div style="font-weight:700;font-size:13px;margin:5px 0 3px">' + esc(d.subject || '(engin efnislína)') + '</div>' +
          (d.snippet ? '<div style="font-size:12px;color:#64748b;line-height:1.4;max-height:80px;overflow:auto">' + esc(d.snippet) + '</div>' : '') +
        '</div>' : '<div style="font-size:12px;color:#94a3b8;margin-top:6px">Engin póstsamskipti fundust.</div>') +
      '<div style="display:flex;gap:7px;margin-top:12px;flex-wrap:wrap">' +
        (d ? '<a href="' + mailto + '" id="_mp-reply" style="flex:1 1 auto;text-align:center;background:#1a7f4b;color:#fff;text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12.5px;font-weight:700">↩️ Svara</a>' : '') +
        '<button id="_mp-imp" style="flex:1 1 auto;background:' + (isImp ? '#fef3c7' : '#f1f5f9') + ';border:1px solid ' + (isImp ? '#fde68a' : '#e2e8f0') + ';color:#334155;padding:8px 10px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer">' + (isImp ? '☆ Afmerkja' : '⭐ Mikilvægt') + '</button>' +
        (d && d.unreplied ? '<button id="_mp-mute" style="flex:1 1 auto;background:#f1f5f9;border:1px solid #e2e8f0;color:#334155;padding:8px 10px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer">' + (muted(coId) ? '🔔 Kveikja' : '🔕 Slökkva rautt') + '</button>' : '') +
      '</div>';
    document.body.appendChild(pop);
    pop.addEventListener('click', e => e.stopPropagation());
    pop.querySelector('#_mp-x').addEventListener('click', closePopover);
    const rep = pop.querySelector('#_mp-reply'); if (rep) rep.addEventListener('click', closePopover);
    pop.querySelector('#_mp-imp').addEventListener('click', async () => {
      const next = !manualImp(coId);
      const ok = await setImportant(coId, next);
      if (window.Toast && Toast.show) Toast.show(ok ? (next ? '⭐ Merkt mikilvægt: ' + nafn : '☆ Afmerkt: ' + nafn) : '⚠ Vistun mistókst');
      closePopover(); stampAll(); reinjectProfile();
    });
    const mb = pop.querySelector('#_mp-mute');
    if (mb) mb.addEventListener('click', async () => {
      const ok = await setMuted(coId, !muted(coId));
      if (window.Toast && Toast.show) Toast.show(ok ? '🔕 Uppfært: ' + nafn : '⚠ Vistun mistókst');
      closePopover(); stampAll(); reinjectProfile();
    });
    setTimeout(() => document.addEventListener('click', onDocClick), 0);
  }
  function onDocClick(e) {
    const p = document.getElementById('_mail-pop');
    if (p && !p.contains(e.target)) { closePopover(); document.removeEventListener('click', onDocClick); }
  }

  // ── takki á fyrirtækjaprófílnum (kveikja/slökkva ósvarað-merki) ───────────
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
      (off ? 'Rauða ósvarað-merkið er SLÖKKT — smelltu til að kveikja.' : 'Rautt umslag birtist á listanum þegar ósvarað. Smelltu til að slökkva.');
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
  if (!fresh) refresh(); else { stampAll(); refresh(); }
  [800, 2500, 6000].forEach(t => setTimeout(() => { stampAll(); injectProfile(); }, t));

  window.CompanyMail = { show, status, data, setMuted, setImportant, refresh };
  console.log('[company-mail-badge] v2 installed');
})();
/* === END PÓST-STÖÐUMERKI Á FYRIRTÆKI Í ÞJÓNUSTU === */
