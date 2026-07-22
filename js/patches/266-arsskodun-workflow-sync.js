/* === ÁRSSKOÐUN ↔ ÞJÓNUSTUVERKSTÆÐI WORKFLOW SYNC v1 ===
 *
 * Tengir Ársskoðunar-aðgerðir við 4-þrepa stöðu-vélina sem ÞjónustuVerkstæði
 * (190) teiknar og Fyrirtæki í þjónustu (153) sýnir. Ein sameiginleg staða per
 * fyrirtæki lifir í AppSettings → arsskodun_customers[<id>] (cross-device):
 *   - field_inspected_year === curYear  → blátt „Í vinnslu" (á borðinu + listanum)
 *   - last_year_inspected  === curYear  → grænt „Lokið / Skoðað <ár>"
 *   - steps_<ár> = { uttekt, skyrsla, send, reikningur }  → 4 grænu þrepin á borðinu
 *
 * Þrjár tengingar (áður var ENGIN tenging úr Ársskoðun í borðið):
 *   1. Blái „💾 Vista / í Vinnslu" takkinn (patch 165)  → markInVinnsla
 *   2. Skýrsla vistuð (patch 168 _cirSaveReport)         → markReport
 *   3. Reikningur gerður (patch 165 finalizeVisit)       → markInvoice → auto „Lokið"
 *
 * GILDRA (sama og 190): AppSettings.save() DEEP-MERGES — að eyða lykli berst
 * EKKI á server. Því er ALLTAF sett á 0 (lesarar lesa `|| 0`), aldrei `delete`.
 */
(() => {
  const KEY = 'arsskodun_customers';
  const curYear = new Date().getFullYear();
  const STEPS_KEY = 'steps_' + curYear;
  // NB: borðið (190) sýnir FIMM skref síðan 2026-07-22 — „farid" (Farið á
  // verkstað) er fremst. Það er viljandi EKKI hér: það er undanfari úttektar
  // sem 190 leiðir sjálft af `uttekt`, og má ekki blokka árs-lokun héðan.
  const STEP_KEYS = ['uttekt', 'skyrsla', 'send', 'reikningur'];

  function ready() { return !!(window.AppSettings && AppSettings.path && AppSettings.save); }

  // Deep-merge-safe write into arsskodun_customers[coId].
  //  stepPatch : { skyrsla:true, … } merged into steps_<ár>
  //  extra     : top-level fields (field_inspected_year / last_year_inspected …)
  // When all four steps are on, auto-completes the year (green „Lokið").
  async function write(coId, stepPatch, extra) {
    if (!ready() || coId == null) return false;
    try {
      const map = AppSettings.path(KEY) || {};
      const cur = map[String(coId)] || {};
      const e = Object.assign({}, cur, extra || {});
      if (stepPatch) {
        const s = Object.assign({}, cur[STEPS_KEY] || {}, stepPatch);
        e[STEPS_KEY] = s;
        if (STEP_KEYS.every(k => !!s[k])) {          // öll 4 þrep græn → Lokið
          e.last_year_inspected = curYear;
          e.field_inspected_year = 0;
        }
      }
      await AppSettings.save({ [KEY]: Object.assign({}, map, { [String(coId)]: e }) });
      return true;
    } catch (err) { console.warn('[ars-workflow] write failed', err); return false; }
  }

  // Þrep 1 — blár „Vista / í Vinnslu": birtist á borðinu + blátt á listanum.
  // Úttektin er búin (kom af heimsókn); skýrsla/reikningur er það sem eftir er.
  function markInVinnsla(coId) {
    return write(coId, { uttekt: true }, { field_inspected_year: curYear, last_year_inspected: 0 });
  }

  // Þrep 2 — skýrsla vistuð: „Skýrsla tilbúin" + „Skýrsla send" græn. Heldur
  // kortinu í vinnslu (nema það sé þegar fullklárað — þá ekki draga það til baka).
  function markReport(coId) {
    if (!ready() || coId == null) return Promise.resolve(false);
    const cur = (AppSettings.path(KEY) || {})[String(coId)] || {};
    const extra = cur.last_year_inspected === curYear ? {} : { field_inspected_year: curYear };
    return write(coId, { skyrsla: true, send: true }, extra);
  }

  // Þrep 3 — reikningur gerður: „Reikningur sendur" grænt. Þegar öll 4 eru græn
  // (skýrsla var vistuð fyrst) færist kortið sjálfkrafa í „Lokið".
  function markInvoice(coId) {
    // field_inspected_year=curYear heldur kortinu sýnilegu á borðinu ef skýrsla
    // er óunnin (reikningur búinn en vantar skýrslu); write() núllar það sjálft
    // þegar öll 4 þrepin eru græn → „Lokið".
    return write(coId, { uttekt: true, reikningur: true }, { field_inspected_year: curYear });
  }

  window.ArsWorkflow = { markInVinnsla, markReport, markInvoice, curYear, _write: write };
  console.log('[ars-workflow] installed');
})();
/* === END ÁRSSKOÐUN WORKFLOW SYNC === */
