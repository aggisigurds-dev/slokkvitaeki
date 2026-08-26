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
 *   ⚪ GRÁTT   = eldri póstsaga TIL (nýlega EÐA fyrir löngu) en ekkert nýlegt merki —
 *                hol grá hringur svo ~100 kúnnar með eldri sögu hætti að vera ósýnilegir.
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
 * Public: window.CompanyMail = { show, status, data, hasHistory, setMuted, setImportant, refresh, onListRender }
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
  let HIST = new Set();  // fyrirtaeki_id sem við eigum EINHVERJA póstsögu við (nýlega EÐA eldri) — /api/company-mail histIds

  const DOT = { red: '#dc2626', yellow: '#d97706', green: '#16a34a', hist: '#94a3b8' };
  const ST_LABEL = { red: 'Ósvarað', yellow: 'Mikilvægt / breyting?', green: 'Í sambandi', hist: 'Eldri póstsaga' };
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
  // 'red' | 'yellow' | 'green' | 'hist' | null
  function status(coId) {
    const d = data(coId);
    if (d && d.unreplied && !muted(coId)) return 'red';
    if (manualImp(coId) || (d && d.important)) return 'yellow';
    if (d) return 'green';
    if (HIST.has(+coId)) return 'hist';   // eldri póstsaga til — ekkert nýlegt merki
    return null;
  }
  // Eigum við EINHVERJA póstsögu við þennan kúnna (nýlega eða eldri)? — fyrir röðun/síu.
  function hasHistory(coId) { return HIST.has(+coId) || !!data(coId); }
  function show(coId) { return status(coId) !== null; }

  // ── sækja gögn (cache-first svo merki birtist strax) ─────────────────────
  function loadCache() {
    try {
      const o = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (o && o.byId) { MAIL = o.byId; HIST = new Set((o.histIds || []).map(Number)); return !!o.t && (Date.now() - o.t) < TTL; }
    } catch (_) {}
    return false;
  }
  async function refresh() {
    try {
      const r = await fetch(API, { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      MAIL = (j && j.byId) || {};
      HIST = new Set(((j && j.histIds) || []).map(Number));
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), byId: MAIL, histIds: [...HIST] })); } catch (_) {}
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
    if (st === 'yellow') {
      // gult = mikilvægt / möguleg breyting → ljósapera (ósk Agnars: 💡 fyrir
      // mikilvæg samskipti). Glóandi amber-skuggi svo hún „kviknar" á listanum.
      span.innerHTML = '<span style="display:inline-flex;font-size:15px;line-height:1;filter:drop-shadow(0 0 3px rgba(217,119,6,.6))">💡</span>';
    } else if (st === 'green' || st === 'hist') {
      // grænt = fyllt (í sambandi nýlega) · eldri saga = hol grá hringur (til, en ekkert nýlegt) — ekkert umslag
      const solid = st === 'green';
      span.innerHTML = '<span style="width:9px;height:9px;border-radius:50%;box-sizing:border-box;' +
        (solid ? 'background:' + color : 'background:transparent;border:1.5px solid ' + color) +
        ';display:inline-block;box-shadow:0 0 0 1.5px var(--surface,#fff)"></span>';
    } else {
      // rautt: umslag með rauðum punkti (ósvarað — kallar á svar)
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
      // Nýr sér-dálkur fremst (patch 153) — stimpla merkið í hann. Fallback =
      // nafna-reiturinn (eldri/aðrar töflur sem endurnýta ._ars-row án póst-dálks).
      const mailTd = tr.querySelector('td._ars-mailcol');
      if (mailTd) { stampInto(mailTd, +tr.dataset.coId); return; }
      const td = tr.querySelector('td');
      stampInto((td && td.querySelector('div')) || td, +tr.dataset.coId);
    });
    document.querySelectorAll('._ars-card[data-co-id]').forEach(card => {
      stampInto(card.querySelector('._ars-cn'), +card.dataset.coId);
    });
    // Hópaða/grunsemda-listinn (patch 153, ~l.2170): nafnið er BER `._ars-open`
    // hlekkur í flex-div — hvorki tr._ars-row né ._ars-card — svo hann fékk aldrei
    // merki. Stimpla depilinn sem systkini FRAMAN við hlekkinn.
    document.querySelectorAll('._ars-open[data-co-id]').forEach(a => {
      if (a.closest('tr._ars-row') || a.closest('._ars-card')) return; // þegar meðhöndlað að ofan
      const coId = +a.dataset.coId, st = status(coId);
      const prev = a.previousElementSibling;
      const has = prev && prev.classList && prev.classList.contains('_mail-badge');
      if (st) {
        if (!has) a.parentNode.insertBefore(badgeEl(coId), a);
        else if (prev.dataset.mailSt !== st) prev.replaceWith(badgeEl(coId));
      } else if (has) prev.remove();
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
        '</div>' : '<div style="font-size:12px;color:#94a3b8;margin-top:6px">' + (st === 'hist' ? 'Eldri póstsaga skráð — smelltu „📜 Sjá alla póstsöguna" til að opna hana.' : 'Engin póstsamskipti fundust.') + '</div>') +
      '<div style="display:flex;gap:7px;margin-top:12px;flex-wrap:wrap">' +
        (d ? '<a href="' + mailto + '" id="_mp-reply" style="flex:1 1 auto;text-align:center;background:#1a7f4b;color:#fff;text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12.5px;font-weight:700">↩️ Svara</a>' : '') +
        '<button id="_mp-imp" style="flex:1 1 auto;background:' + (isImp ? '#fef3c7' : '#f1f5f9') + ';border:1px solid ' + (isImp ? '#fde68a' : '#e2e8f0') + ';color:#334155;padding:8px 10px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer">' + (isImp ? '☆ Afmerkja' : '⭐ Mikilvægt') + '</button>' +
        (d && d.unreplied ? '<button id="_mp-mute" style="flex:1 1 auto;background:#f1f5f9;border:1px solid #e2e8f0;color:#334155;padding:8px 10px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer">' + (muted(coId) ? '🔔 Kveikja' : '🔕 Slökkva rautt') + '</button>' : '') +
      '</div>' +
      '<button id="_mp-hist" style="width:100%;margin-top:8px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155;padding:9px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📜 Sjá alla póstsöguna</button>';
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
    const hb = pop.querySelector('#_mp-hist');
    if (hb) hb.addEventListener('click', () => openHistory(coId, nafn));
    setTimeout(() => document.addEventListener('click', onDocClick), 0);
  }
  function onDocClick(e) {
    const p = document.getElementById('_mail-pop');
    if (p && !p.contains(e.target)) { closePopover(); document.removeEventListener('click', onDocClick); }
  }

  // ── ÖLL póstsaga (full communication history, on-demand) ──────────────────
  // Fetches the whole thread for one company from the hub
  // (/api/company-mail?co=<id> → felag_samskipti via tv_company_history) and
  // shows it as a scrollable modal — in/out direction, date, subject, snippet.
  function histRow(m) {
    const out = !!m.fra_okkur;
    const dir = out
      ? { ic: '📤', t: 'Frá okkur', c: '#0369a1' }
      : { ic: '📥', t: 'Frá kúnna', c: '#166534' };
    const who = out ? 'Slökkvitæki ehf' : (m.sender_name || m.sender_email || '');
    return '<div style="display:flex;gap:10px;padding:9px 4px;border-bottom:1px solid #f4f6f9">' +
      '<div style="flex:0 0 auto;text-align:center;width:56px">' +
        '<div style="font-size:15px;line-height:1.1">' + dir.ic + '</div>' +
        '<div style="font-size:9px;font-weight:800;color:' + dir.c + ';margin-top:1px">' + dir.t + '</div>' +
        '<div style="font-size:10px;color:#94a3b8;margin-top:3px">' + esc(fmtDate(m.received_at)) + '</div>' +
      '</div>' +
      '<div style="min-width:0;flex:1">' +
        '<div style="font-weight:700;font-size:12.5px;color:#0f172a;line-height:1.3">' + esc(m.subject || '(engin efnislína)') + (m.is_question && !out ? ' <span title="Spurning" style="color:#b45309">❓</span>' : '') + '</div>' +
        (m.snippet ? '<div style="font-size:11.5px;color:#64748b;line-height:1.4;margin-top:2px;max-height:56px;overflow:hidden">' + esc(String(m.snippet).slice(0, 240)) + '</div>' : '') +
        '<div style="font-size:10px;color:#94a3b8;margin-top:3px">' + esc(who) + ' · ' + esc(relDay(m.received_at)) + '</div>' +
      '</div>' +
    '</div>';
  }
  async function openHistory(coId, nafn) {
    closePopover();
    const old = document.getElementById('_mail-hist'); if (old) old.remove();
    const wrap = document.createElement('div');
    wrap.id = '_mail-hist';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    wrap.innerHTML =
      '<div style="background:#fff;border-radius:14px;max-width:560px;width:100%;max-height:82vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35)">' +
        '<div style="padding:14px 16px;border-bottom:1px solid #eef2f7;display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex:0 0 auto">' +
          '<div style="min-width:0"><div style="font-weight:800;font-size:15px;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(nafn) + '</div>' +
          '<div id="_mh-sub" style="font-size:12px;color:#64748b;margin-top:2px">Sæki alla póstsögu…</div></div>' +
          '<button id="_mh-x" style="background:none;border:none;font-size:18px;cursor:pointer;color:#94a3b8;line-height:1">✕</button>' +
        '</div>' +
        '<div id="_mh-body" style="overflow-y:auto;padding:6px 12px 14px"><div style="text-align:center;color:#94a3b8;padding:34px;font-size:13px">⏳ Hleð póstsögu…</div></div>' +
      '</div>';
    document.body.appendChild(wrap);
    const close = () => { wrap.remove(); document.removeEventListener('keydown', onEsc); };
    function onEsc(e) { if (e.key === 'Escape') close(); }
    wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    wrap.querySelector('#_mh-x').addEventListener('click', close);
    document.addEventListener('keydown', onEsc);
    try {
      const r = await fetch(API + '?co=' + encodeURIComponent(coId), { cache: 'no-store' });
      const j = await r.json();
      const mails = (j && j.mails) || [];
      const sub = wrap.querySelector('#_mh-sub');
      if (sub) sub.textContent = mails.length ? ('Öll póstsaga · ' + mails.length + (mails.length === 1 ? ' póstur' : ' póstar')) : 'Engin póstsaga fannst';
      const body = wrap.querySelector('#_mh-body');
      if (body) body.innerHTML = mails.length
        ? mails.map(histRow).join('')
        : '<div style="text-align:center;color:#94a3b8;padding:30px;font-size:13px">Engin póstsamskipti fundust.</div>';
    } catch (_) {
      try { window.logProblem && logProblem('mail_history_fetch_failed', String(coId)); } catch (e) {}
      const body = wrap.querySelector('#_mh-body');
      if (body) body.innerHTML = '<div style="text-align:center;color:#dc2626;padding:26px;font-size:13px">Villa við að sækja póstsögu. Reyndu aftur.</div>';
    }
  }

  // ── PÓST-SAMSKIPTABOX Á FYRIRTÆKJAPRÓFÍLNUM ──────────────────────────────
  // Ósk Agnars 2026-08-20: „sé engar upplýsingar" á prófílnum — sömu póst-
  // upplýsingar og umferðarljósið á listanum eiga að BLASA VIÐ inni á hverju
  // fyrirtæki. Áður setti þetta aðeins pínulítinn „📩 Póstmerki"-takka í
  // hnapparöðina OG hætti alveg (`return`) ef enginn nýlegur póstur fannst —
  // svo langflest fyrirtæki sýndu ekkert. Núna: alvöru kort sem sýnir stöðu,
  // nýjasta póst, lífsferils-merki og hnapp á ALLA póstsöguna (?co=… sækir
  // öll samskipti base-ins, líka eldri en glugginn sem listinn notar), OG er
  // ALLTAF sýnilegt — líka „engin nýleg merki, smelltu á Öll póstsaga".
  //
  // Stöðu-undirskrift (dataset.sig) ver gegn endurteikni-lykkju: MutationObserver
  // (watch) kallar injectProfile við hverja DOM-breytingu, og box-innsetning er
  // sjálf DOM-breyting — án sig-varnar teiknaðist kortið upp á 150 ms fresti að
  // eilífu. Nú er aðeins teiknað þegar staðan raunverulega breytist.
  function boxSig(coId) {
    const d = data(coId);
    return [status(coId) || '-', muted(coId) ? 1 : 0, manualImp(coId) ? 1 : 0,
      d ? (d.received_at || '') : '', d ? (d.unreplied ? 1 : 0) : '',
      d && d.signals ? d.signals.length : 0].join('|');
  }
  function injectProfile() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const editBtn = main.querySelector('button[onclick^="Companies.openEdit"]');
    if (!editBtn) return;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/);
    if (!m) return;
    const coId = +m[1];
    let box = main.querySelector('._co-mail-box');
    if (box) {
      if (+box.dataset.co === coId && box.dataset.sig === boxSig(coId)) return; // óbreytt — engin endurteikning
      if (+box.dataset.co !== coId) { box.remove(); box = null; }              // skiptum um fyrirtæki
    }
    if (!box) {
      box = document.createElement('div');
      box.className = 'card pad _co-mail-box';
      box.dataset.co = String(coId);
      box.style.cssText = 'margin:10px 0;border:1px solid var(--brd,#e2e8f0);border-left:4px solid #6366f1;border-radius:12px;padding:12px 15px;font-size:13.5px;background:var(--surface,#fff)';
      // Akkeri: helst hnapparöðin með „Merkja mikilvægt" (sama og samskipti-
      // spjaldið 286 notar) svo kortið lendir beint undir aðgerðahnöppunum;
      // annars röðin með Breyta-takkanum.
      let anchor = null;
      const mk = [...main.querySelectorAll('button')].find(b => /Merkja mikilv[aæ]g/i.test(b.textContent || ''));
      if (mk) anchor = mk.parentElement;
      if (!anchor) anchor = editBtn.parentElement;
      (anchor.parentElement || main).insertBefore(box, anchor.nextSibling);
    }
    paintBox(box, coId);
  }
  function paintBox(box, coId) {
    const d = data(coId);
    const st = status(coId);
    const off = muted(coId);
    const isImp = manualImp(coId);
    const stColor = DOT[st] || '#94a3b8';
    const stTxt = st ? (ST_LABEL[st] || '') : 'Engin nýleg merki';
    const co = ((window.Companies && Companies.list) || []).find(c => String(c.id) === String(coId));
    const nafn = (co && co.nafn) || ('#' + coId);
    const mailto = d ? 'mailto:' + encodeURIComponent(d.from || '') + '?subject=' + encodeURIComponent('Re: ' + (d.subject || '')) : '';
    box.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<span style="width:11px;height:11px;border-radius:50%;background:' + stColor + ';flex:0 0 auto;box-shadow:0 0 0 2px var(--surface,#fff)"></span>' +
        '<div style="font-weight:800;font-size:11.5px;letter-spacing:.06em;color:#4f46e5">📬 PÓSTSTAÐA &amp; SAMSKIPTI</div>' +
        '<div style="margin-left:auto;font-size:11.5px;font-weight:700;color:' + stColor + '">' + esc(stTxt) + '</div>' +
      '</div>' +
      signalsHtml(d) +
      (d ?
        '<div style="margin-top:8px">' +
          '<div style="font-size:11.5px;color:#64748b">Nýjasti póstur · ' + esc(d.from || '') + '</div>' +
          '<div style="font-size:12.5px;color:#334155"><b>' + esc(fmtDate(d.received_at)) + '</b> · ' + esc(relDay(d.received_at)) + (d.unreplied ? ' · <span style="color:#dc2626;font-weight:800">ósvarað</span>' : ' · svarað') + '</div>' +
          '<div style="font-weight:700;font-size:13px;margin:4px 0 3px">' + esc(d.subject || '(engin efnislína)') + '</div>' +
          (d.snippet ? '<div style="font-size:12px;color:#64748b;line-height:1.4;max-height:66px;overflow:auto">' + esc(d.snippet) + '</div>' : '') +
        '</div>'
        : '<div style="margin-top:7px;font-size:12.5px;color:#94a3b8;line-height:1.45">' + (st === 'hist' ? 'Eldri póstsaga er til við þennan kúnna (ekkert nýlegt merki). Smelltu á <b>📜 Öll póstsaga</b> til að opna hana.' : 'Engin nýleg póstmerki á þessum kúnna. Smelltu á <b>📜 Öll póstsaga</b> til að sjá hvort einhver samskipti eru skráð.') + '</div>') +
      '<div style="display:flex;gap:7px;margin-top:12px;flex-wrap:wrap">' +
        (d ? '<a href="' + mailto + '" class="_cmb-reply" style="flex:1 1 auto;text-align:center;background:#1a7f4b;color:#fff;text-decoration:none;padding:8px 10px;border-radius:8px;font-size:12.5px;font-weight:700">↩️ Svara</a>' : '') +
        '<button type="button" class="_cmb-imp" style="flex:1 1 auto;background:' + (isImp ? '#fef3c7' : '#f1f5f9') + ';border:1px solid ' + (isImp ? '#fde68a' : '#e2e8f0') + ';color:#334155;padding:8px 10px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer">' + (isImp ? '☆ Afmerkja' : '⭐ Mikilvægt') + '</button>' +
        (d && d.unreplied ? '<button type="button" class="_cmb-mute" style="flex:1 1 auto;background:#f1f5f9;border:1px solid #e2e8f0;color:#334155;padding:8px 10px;border-radius:8px;font-size:12.5px;font-weight:700;cursor:pointer">' + (off ? '🔔 Kveikja rautt' : '🔕 Slökkva rautt') + '</button>' : '') +
      '</div>' +
      '<button type="button" class="_cmb-hist" style="width:100%;margin-top:8px;background:#f8fafc;border:1px solid #e2e8f0;color:#334155;padding:9px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer">📜 Öll póstsaga</button>';
    box.dataset.sig = boxSig(coId);
    const impB = box.querySelector('._cmb-imp');
    if (impB) impB.addEventListener('click', async () => {
      impB.disabled = true;
      const next = !manualImp(coId);
      const ok = await setImportant(coId, next);
      impB.disabled = false;
      if (window.Toast && Toast.show) Toast.show(ok ? (next ? '⭐ Merkt mikilvægt: ' + nafn : '☆ Afmerkt: ' + nafn) : '⚠ Vistun mistókst');
      paintBox(box, coId); stampAll();
    });
    const muteB = box.querySelector('._cmb-mute');
    if (muteB) muteB.addEventListener('click', async () => {
      muteB.disabled = true;
      const ok = await setMuted(coId, !muted(coId));
      muteB.disabled = false;
      if (window.Toast && Toast.show) Toast.show(ok ? '🔕 Uppfært: ' + nafn : '⚠ Vistun mistókst');
      paintBox(box, coId); stampAll();
    });
    const histB = box.querySelector('._cmb-hist');
    if (histB) histB.addEventListener('click', () => openHistory(coId, nafn));
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

  // onListRender: called by patch 153 at the END of its render() so the badges
  // are re-stamped deterministically after every filter/month/sort re-render
  // (the MutationObserver alone raced the re-render and the dots vanished).
  window.CompanyMail = { show, status, data, hasHistory, setMuted, setImportant, refresh, onListRender: () => { try { stampAll(); } catch (_) {} } };
  console.log('[company-mail-badge] v4 installed (prófíl-box + umferðarljós + hópalisti)');
})();
/* === END PÓST-STÖÐUMERKI Á FYRIRTÆKI Í ÞJÓNUSTU === */
