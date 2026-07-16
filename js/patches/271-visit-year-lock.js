/* === VISIT YEAR LOCK v1 (2026-07-16) ===
 *
 * Lokun á REIKNINGUR-hluta heimsóknar-ritilsins (patch 129 #_ctc-section +
 * 165 „✓ Klára heimsókn" takkarnir sem búa inni í honum) þegar ári félagsins
 * er LOKIÐ — úttektarskýrsla ársins OG reikningur ársins eru bæði til (sama
 * mat og ReportFactsSync.hasComplete, patch 270). Ósk Agnars: „svo það sé
 * ekki verið að óvart rekast í og breyta einhverju, og það sjáist að þetta er
 * BÚIÐ og þurfi ekki að fikta í þessu meira fyrr en á næsta ári."
 *
 *   - Grænn borði YFIR hlutanum: „✅ Búið <ár> — skýrsla og reikningur
 *     frágengin · 🔒 smelltu til að opna" — sama samspil og „Listi
 *     staðfestur" borðinn í patch 224.
 *   - EINN smellur opnar (ALLTAF LEYFA VISTUN — aldrei harðlæst). Opnunin er
 *     AÐEINS fyrir þessa setu (ekki geymd) — næsta heimsókn á síðuna sýnir
 *     læst aftur, þar til á næsta ári.
 *   - Ár-skorðað: í janúar á nýtt ár enga skýrslu/reikning → ritillinn er
 *     náttúrulega opinn aftur. Afleidd staða — EKKERT skrifað í override_log.
 *
 * Endurteiknun 129 þurrkar yfirlagið út → MutationObserver (sama mynstur og
 * 165 injectButtons) setur það aftur á. window.VisitYearLock = {apply, isComplete}.
 */
(() => {
  if (window.__visitYearLockInstalled) return;
  window.__visitYearLockInstalled = true;

  const unlocked = {}; // coId -> true — AÐEINS þessi seta, aldrei geymt.

  // Sama coId-uppfletting og patch 165.
  function getCompanyId() {
    const main = document.getElementById('companies-main');
    if (!main) return null;
    const idEl = main.querySelector('[data-co-id]:not(._cat-section)');
    if (idEl) { const v = idEl.getAttribute('data-co-id'); if (v && /^\d+$/.test(v)) return +v; }
    const editBtn = main.querySelector('button._co-edit-anchor[onclick*="Companies.openEdit"]') ||
      main.querySelector('button[onclick*="Companies.openEdit"]');
    if (!editBtn) return null;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)/);
    return m ? +m[1] : null;
  }

  // Samhliða (engin DB-köll í hverri endurteiknun): steps_<ár> úr
  // arsskodun_customers (270 maybeComplete málar þau græn) + ársmerkt viðhengi
  // (233 sjálfvirka PDF-vistunin) gegnum sömu hasComplete-regluna og 270.
  function isComplete(coId, year) {
    try {
      if (!(window.ReportFactsSync && ReportFactsSync.hasComplete)) return false;
      const rec = ((window.AppSettings && AppSettings.path &&
        AppSettings.path('arsskodun_customers')) || {})[String(coId)] || {};
      let atts = [];
      try {
        atts = (window.CompanyAttachments && CompanyAttachments.list &&
          CompanyAttachments.list(coId)) || [];
      } catch (_) {}
      return !!ReportFactsSync.hasComplete(rec, atts, year, {}).both;
    } catch (_) { return false; }
  }

  // Útlit: sami græni gradienta-borði og .ut-listlock.on (patch 224) — ≥44px snertimark.
  (function css() {
    if (document.getElementById('sk-vyl-css')) return;
    const s = document.createElement('style');
    s.id = 'sk-vyl-css';
    s.textContent =
      '._vyl-overlay{position:absolute;inset:0;z-index:6;display:flex;align-items:flex-start;justify-content:center;' +
        'padding:16px;background:rgba(230,250,238,.78);backdrop-filter:blur(1.5px);border-radius:12px;cursor:pointer}' +
      '._vyl-banner{display:block;width:100%;min-height:44px;position:sticky;top:12px;padding:13px 16px;border-radius:12px;cursor:pointer;' +
        'font:inherit;font-weight:800;font-size:15px;line-height:1.35;text-align:center;color:#daffe8;' +
        'background:linear-gradient(180deg,#2f5d3f,#173524);border:1px solid #0e2417;' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 6px rgba(0,0,0,.25)}' +
      '._vyl-banner small{display:block;margin-top:3px;font-size:12px;font-weight:700;color:#a7e8c2}';
    document.head.appendChild(s);
  })();

  function apply() {
    const section = document.getElementById('_ctc-section');
    if (!section) return;
    const coId = getCompanyId();
    if (!coId) return;
    const year = new Date().getFullYear();
    const existing = section.querySelector('._vyl-overlay');
    if (unlocked[coId] || !isComplete(coId, year)) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return; // þegar læst
    if (getComputedStyle(section).position === 'static') section.style.position = 'relative';
    const ov = document.createElement('div');
    ov.className = '_vyl-overlay';
    ov.innerHTML =
      '<button type="button" class="_vyl-banner">✅ Búið ' + year +
      ' — skýrsla og reikningur frágengin' +
      '<small>🔒 smelltu til að opna</small></button>';
    // Einn smellur opnar — aðeins fyrir þessa setu (aldrei geymt).
    ov.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      unlocked[coId] = true;
      ov.remove();
    });
    section.appendChild(ov);
  }

  // Sama tengi-mynstur og 165: MutationObserver á companies-main, debounce.
  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(apply, 400);
    }).observe(main, { childList: true, subtree: true });
    apply();
  }
  attach();

  window.VisitYearLock = { apply, isComplete };
  console.log('[patch-271] visit year lock installed');
})();
/* === END VISIT YEAR LOCK v1 === */
