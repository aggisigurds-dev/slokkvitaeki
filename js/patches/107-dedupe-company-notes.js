/* === DEDUPE COMPANY NOTES v1 ===
 *
 * Vandamál: Athugasemdir á fyrirtækisspjaldi birtast á 3 stöðum:
 *   1. Bláum „_pm_notes_display" reit (úr 00-legacy.js — equipment count
 *      + notes)
 *   2. Gulum „_fyr_notes" reit (úr 75-fyrirtaeki-detail-enrich.js — bara
 *      Athugasemdir með yfirskrift)
 *   3. „MINNÓ / ATHUGASEMDIR" textareiti (úr 00-legacy.js — eini editable
 *      reiturinn, vistar í Supabase)
 *
 * Þetta lítur út fyrir að vera mistök — sami textinn endurtekinn 3 sinnum.
 *
 * Lausn: Eingöngu MINNÓ textareiti er editable og kanóníska geymsla.
 * Hin tvö sýna bara það sama. Þessi patch fjarlægir redundant displays:
 *   • Heldur „_pm_notes_display" en strippar út athugasemdunum (skilur
 *     eftir Slökkvitæki:N | Slöngur:N | Reyksk:N)
 *   • Fjarlægir „_fyr_notes" gula reitinn alveg
 *   • Heldur MINNÓ textareit (eini editable)
 *
 * Höfundur: Augljóst rugl, lagast héðan í frá.
 */
(() => {
  if (window.__dedupeCompanyNotesInstalled) return;
  window.__dedupeCompanyNotesInstalled = true;

  function dedupe() {
    const main = document.getElementById('companies-main');
    if (!main) return;

    // 1. Remove the yellow _fyr_notes box entirely
    main.querySelectorAll('._fyr_notes').forEach(el => el.remove());

    // 2. Strip the athugasemdir text out of the blue _pm_notes_display
    //    (keep just the equipment counts) — find any inner div whose text
    //    looks like notes (no „Slökkvitæki:" / „Reyksk:" / „Slöngur:" prefix)
    main.querySelectorAll('._pm_notes_display').forEach(el => {
      // Remove any child div that doesn't look like a counts line
      Array.from(el.children).forEach(child => {
        const t = (child.textContent || '').trim();
        if (!t) return;
        // Counts line example: „🧯 Slökkvitæki: 22  |  🚒 Slöngur: 9"
        // Anything else is a notes string — strip it.
        if (!/(Slökkvitæki|Slokkv|Slöngur|Reyksk|Engin tæki)/.test(t)) {
          child.remove();
        }
      });
      // Also strip note text from the main element's first text node if any
      // (e.g. the textContent appended after the parts.join)
      // Cleanest: rewrite to keep only counts text
      const counts = (el.textContent || '').match(/(?:🧯|⏳)\s*[^|]+(?:\s*\|\s*[^|]+)*/);
      if (counts) {
        // Remove any trailing notes content after counts
        const cleaned = counts[0].trim();
        // Replace child text nodes only if they contain the original notes
        Array.from(el.childNodes).forEach(n => {
          if (n.nodeType === 3) {
            n.textContent = cleaned;
          }
        });
      }
    });
  }

  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(dedupe, 200);
    }).observe(main, { childList: true, subtree: true });
  }
  attach();
  setTimeout(dedupe, 1500);
  setTimeout(dedupe, 3000);
  // Periodic — patches re-add the boxes on Companies.openDetail
  setInterval(() => {
    const main = document.getElementById('companies-main');
    if (main && (main.querySelector('._fyr_notes'))) dedupe();
  }, 1500);

  console.log('[dedupe-company-notes] installed — cleans duplicate athugasemdir on company detail');
})();
/* === END DEDUPE COMPANY NOTES v1 === */
