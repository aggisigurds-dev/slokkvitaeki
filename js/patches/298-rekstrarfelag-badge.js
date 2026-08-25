/* === REKSTRARFÉLAG BADGE v1 ===
 * Small shared lookup: given a company's kennitala, which rekstrarfélag
 * (property-management firm — Eignaumsjón, Rekstrarumsjón, …) manages it, if
 * any? Reuses the SAME data patch 175 (Rekstrarfélög tab) already maintains
 * in AppSettings.rekstrarfelog — no new table, just a badge surfacing data
 * that already exists but wasn't visible outside that one dedicated tab.
 *
 * Beiðni: verkefnalisti 6e390bfc — "Add in fyrirtæki í þjónustu small label
 * marking for the Rekstrarfélög. and a label inside the company profile".
 */
(() => {
  if (window.RekstrarfelagBadge) return;

  function digits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }

  let _ktMap = null; // digits(kt) -> firm name
  // 2026-08-25: byggja kortið úr SAMEINUÐU gögnunum (window.RekstrarfelagData.getMerged),
  // sem fléttar lifandi `customers_base.rekstrarfelag` (DB — kanóníska aðildin) OFAN Á
  // handvirku AppSettings-listann. Áður las badge-inn AÐEINS AppSettings, svo
  // rekstrarfélög sem voru sett í gagnagrunni (t.d. gegnum Bakenda/sameiningu) en ekki
  // handskráð í AppSettings fengu EKKERT merki í ársskoðun/prófíl — sama villa og 184
  // var lagað út af 2026-07-12. Fallback á AppSettings ef 175 (RekstrarfelagData) er
  // ekki komið.
  function readData() {
    try {
      if (window.RekstrarfelagData && typeof window.RekstrarfelagData.getMerged === 'function') {
        return window.RekstrarfelagData.getMerged() || {};
      }
    } catch (_) {}
    try {
      if (window.AppSettings && typeof AppSettings.path === 'function') return AppSettings.path('rekstrarfelog') || {};
    } catch (_) {}
    return {};
  }
  function ktMap() {
    if (_ktMap) return _ktMap;
    _ktMap = {};
    try {
      const data = readData();
      Object.keys(data).forEach(firm => {
        (data[firm].buildings || []).forEach(b => {
          const k = digits(b.kt);
          if (k) _ktMap[k] = firm;
        });
      });
    } catch (_) {}
    return _ktMap;
  }
  // AppSettings + lifandi DB hlaðast async á ræsingu — ekki festa hugsanlega tómt/úrelt kort.
  function forKt(kt) {
    const k = digits(kt);
    if (!k) return null;
    let m = ktMap();
    if (!Object.keys(m).length) { _ktMap = null; m = ktMap(); } // one retry, cheap
    return m[k] || null;
  }

  // 2026-08-25 (Charlize/kunnaskra yfirferð): KANÓNÍSKA leiðin er base_id → félag beint
  // úr `customers_base.rekstrarfelag` — nákvæmlega eins og Fyrirtæki-yfirferð (patch 198).
  // Kt-lyklun (forKt) hefur tvö raunveruleg vandamál vegna handskráða SEED-listans í 175:
  //   (a) 4 kennitölur skráðar undir TVEIMUR félögum → badge valdi handahófskennt;
  //   (b) 9 fyrirtæki sem eru EKKI tengd rekstrarfélagi fengu samt merki af því kt rakst
  //       á SEED-byggingu (t.d. Distica). Base_id-lyklun eyðir báðum.
  // Þess vegna: þegar kallandinn hefur customer_base_id → notum base_id (ótvírætt úr DB),
  // annars föllum við aftur á kt (eldri kallendur án base_id).
  let _baseMap = null; // customer_base_id -> firm name (úr customers_base.rekstrarfelag)
  function loadBaseMap() {
    try {
      const SB = window.__vdaSB || (window.DB && window.DB.sb);
      if (!SB) return;
      const build = (rows) => {
        const m = {};
        (rows || []).forEach(r => { if (r && r.rekstrarfelag) m[r.id] = r.rekstrarfelag; });
        _baseMap = m;
      };
      if (window.DB && typeof window.DB.fetchAll === 'function') {
        window.DB.fetchAll((from, to) => SB.from('customers_base').select('id,rekstrarfelag').not('rekstrarfelag', 'is', null).range(from, to))
          .then(build).catch(() => {});
      } else {
        SB.from('customers_base').select('id,rekstrarfelag').not('rekstrarfelag', 'is', null)
          .then(r => build(r && r.data)).catch(() => {});
      }
    } catch (_) {}
  }
  function forBase(baseId) {
    if (baseId == null || _baseMap == null) return null;
    return _baseMap[baseId] || null;
  }
  // Forhlaða lifandi rekstrarfélaga-listanum (DB) svo DB-sett rekstrarfélög fái merkið
  // strax og notandi opnar ársskoðun/prófíl, og ógilda kt-kortið þegar hann kemur.
  // MIKILVÆGT: bíða þar til Supabase-klientinn (DB.sb) er tilbúinn. Ef ensureLive er
  // kallað of snemma (án SB) frystir 175 TÓMAN lista (_liveRF={}) fyrir ALLA lotuna —
  // þá skilar getMerged aðeins AppSettings og DB-sett rekstrarfélög týnast (og það
  // bryti líka Rekstrarfélög-flipann/viðskiptavina-merkið). Þess vegna pollum við eftir SB.
  (function warm(tries) {
    try {
      const RD = window.RekstrarfelagData;
      const sbReady = window.__vdaSB || (window.DB && window.DB.sb);
      if (sbReady) {
        loadBaseMap();                                              // kanóníska base_id → félag varpan
        if (RD && typeof RD.ensureLive === 'function') RD.ensureLive().then(() => { _ktMap = null; }).catch(() => {}); // fyrir kt-fallback + Rekstrarfélög flipa
        return;
      }
    } catch (_) {}
    if ((tries || 0) < 60) setTimeout(() => warm((tries || 0) + 1), 500);
  })(0);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  // Small pill, consistent wherever it's dropped in (table row, card, profile banner).
  // html(kt, baseId): ef base_id fylgir er það notað (kanónískt, engin fölsk merki),
  // annars fallback á kt fyrir eldri kallendur.
  function html(kt, baseId) {
    const firm = (baseId != null) ? forBase(baseId) : forKt(kt);
    if (!firm) return '';
    return '<span title="Rekstrarfélag — sér um margar byggingar" style="display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-weight:700;background:#ede9fe;color:#6d28d9;padding:1px 7px;border-radius:99px;border:1px solid #ddd6fe;white-space:nowrap">🏢 ' + esc(firm) + '</span>';
  }

  window.RekstrarfelagBadge = { forKt, forBase, html };
  console.log('[patch-298] rekstrarfelag-badge installed — RekstrarfelagBadge.html(kt, baseId)');
})();
/* === END REKSTRARFÉLAG BADGE === */
