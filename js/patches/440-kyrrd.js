/* === KYRRÐ (440, HT-3.10, 03.10.2026) — skrif á SAMA gildi er engin skrif ============================================
 *
 * Agnar 03.10.2026: „við þurfum að fara svo mikið fram og til baka inn á prófíla."
 *
 * MÆLT á lifandi síðu (Chrome, 1600 px, hreinn prófíll) — síðan sat í KYRRSTÖÐU, enginn snerti neitt:
 *     Fyrirtæki í þjónustu, 8 sek gluggi      3.427 ms í löngum verkum   (43% af aðalþræðinum)
 *     sama síða nýhlaðin (49.000 hnútar)      aðalþráðurinn 100% upptekinn, samfellt
 *
 * ORSÖK: púlsar sem skrifa SAMA gildið aftur og aftur. Klukkan í borðanum setur `textContent = "21:12"` einu sinni á
 * sekúndu, 378 skrifar sömu stöðulínu á 4 sek fresti, 00-legacy setur `data-zero="1"` á reit sem ber það þegar, 405/411
 * kalla `classList.add` á klasa sem er þar fyrir. Vafrinn skráir hvert þeirra sem DOM-breytingu þótt ekkert breytist:
 *   – `textContent =` hendir textahnútnum og býr til nýjan → childList-færsla → ALLAR ~150 vaktir sem horfa á
 *     document.body (252) vakna og skanna síðuna, og `:has()`-reglur stílblaðanna endurreikna stíl á þúsundum staka
 *     (mælt: 14 stílumferðir á 6 sek, ~100 ms hver);
 *   – `setAttribute` / `classList.add` með sama gildi → eigindafærsla sem vekur eigindavaktirnar.
 *
 * LAUSN: skrif sem breyta engu eru stöðvuð ÁÐUR en þau ná DOM-inu. Aðeins þegar útkoman er sannanlega sú sama:
 *     el.textContent = s        stakið á nákvæmlega EINN textahnút með sama streng (eða er tómt og s er '')
 *     el.setAttribute(n, v)     eigindin ber þegar nákvæmlega þetta gildi   (src/href/data/srcdoc undanskilin — þar
 *                               ENDURHLEÐUR sama gildi iframe/mynd og einhver gæti reitt sig á það; value/checked/
 *                               selected líka, formstaða á sér sérreglur)
 *     el.id = v, el.className = v, el.title = v      sama regla
 *     classList.add(a, b…)      allir klasarnir eru þar fyrir
 *     classList.remove(a, b…)   enginn þeirra er þar
 * Öll önnur skrif fara óbreytt í gegn. Ekkert er geymt, engu er frestað og engin röð breytist.
 *
 * SLÖKKVA: localStorage.setItem('kyrrd_off','1') og endurhlaða.  LESA: window.Kyrrd.sleppt — hve mörgum skrifum var sleppt.
 * ================================================================================================================== */
(() => {
  if (window.__kyrrd440) return;
  window.__kyrrd440 = true;

  const sleppt = { texti: 0, eigind: 0, klasi: 0 };
  window.Kyrrd = { sleppt };

  // ── :has() á rótinni → klasi á <html> ──────────────────────────────────────────────────────────────────────────────
  // Fjórar reglur héngu á <html>/<body> með :has(): 327 og 344 (`html:has(#view-sala.active) …`), 391
  // (`body:has(#cg-sk-trigger) .topbar`) og 410 (`html:is(…,:has(>body.appmode))`). Akkeri á rótinni þýðir að HVER DOM-breyting hvar sem er á síðunni ógildir það,
  // og vafrinn endurreiknar þá stíl á öllum stökum sem einhver :has()-regla í skjalinu nefnir. Mælt við endurhleðslu á
  // Fyrirtæki í þjónustu (03.10.2026): 160 stílumferðir = 17.183 ms, ~2.650 stök í hverri; „Affected by :has()" á HTML
  // 4.588 sinnum. Sömu skilyrði eru nú klasar sem þessi litla vakt heldur réttum:
  //     html.syn-sala   ⇔  #view-sala.active er til      (327, 344)
  //     html.hefur-cg   ⇔  #cg-sk-trigger er til         (391)
  //     html.likami-app ⇔  body.appmode                  (410, 402 — var html:is(…,:has(>body.appmode)))
  //     #companies-main.co-opid ⇔ .co-banner er í því    (338, 402, 411, 412, 413 — var #companies-main:has(.co-banner))
  //     #companies-main.smx-hysill ⇔ ._samskipti-host[data-fid] er í því   (359)
  // Vaktin er ÓINNGJÖFUÐ (ekki 252) og keyrir því í sama verki og breytingin, fyrir málun — enginn rammi sést rangur.
  try {
    const html = document.documentElement;
    const NMO = window.__NativeMutationObserver || window.MutationObserver;
    const setja = (klasi, a) => { if (html.classList.contains(klasi) !== a) html.classList.toggle(klasi, a); };
    let salaVakt = null;
    const samstilla = () => {
      const sala = document.getElementById('view-sala');
      setja('syn-sala', !!(sala && sala.classList.contains('active')));
      setja('hefur-cg', !!document.getElementById('cg-sk-trigger'));
      setja('likami-app', !!(document.body && document.body.classList.contains('appmode')));
      if (sala && salaVakt !== sala) {            // sýnin er smíðuð af sala.js eftir ræsingu → vakta klasann á HENNI
        salaVakt = sala;
        try { new NMO(samstilla).observe(sala, { attributes: true, attributeFilter: ['class'] }); } catch (_) {}
      }
    };
    const byrja = () => {
      if (!document.body) return false;
      // bein börn (sýnir og fljótandi takkar) + klasi á <body> sjálfu (appmode) — ekki subtree
      try { new NMO(samstilla).observe(document.body, { childList: true, attributes: true, attributeFilter: ['class'] }); } catch (_) {}
      samstilla();
      return true;
    };
    if (!byrja()) document.addEventListener('DOMContentLoaded', byrja);
    // Prófíllinn: klasar í stað #companies-main:has(…). Vaktin sér allt undirtréð en gerir aðeins tvær
    // querySelector-leitir og klasasamanburð — og snertir DOM aðeins þegar svarið breytist.
    const profill = () => {
      const m = document.getElementById('companies-main'); if (!m) return false;
      const eitt = (klasi, a) => { if (m.classList.contains(klasi) !== a) m.classList.toggle(klasi, a); };
      const stilla = () => { eitt('co-opid', !!m.querySelector('.co-banner')); eitt('smx-hysill', !!m.querySelector('._samskipti-host[data-fid]')); };
      try { new NMO(stilla).observe(m, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-fid'] }); } catch (_) {}
      stilla();
      return true;
    };
    if (!profill()) document.addEventListener('DOMContentLoaded', profill);
    // Belti og axlabönd: sé sýnin smíðuð annars staðar en beint undir <body> nær barnavaktin henni ekki.
    document.addEventListener('DOMContentLoaded', samstilla);
    window.addEventListener('hashchange', samstilla);
    window.Kyrrd.samstilla = samstilla;
  } catch (_) {}

  // Rofinn slekkur AÐEINS á skrifvörninni hér fyrir neðan — klasarnir að ofan eru forsenda reglna í 327/338/344/359/391/402/410–413.
  try { if (localStorage.getItem('kyrrd_off') === '1') return; } catch (_) {}

  // ── textContent ────────────────────────────────────────────────────────────────────────────────────────────────────
  try {
    const d = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
    if (d && d.set && d.configurable) {
      Object.defineProperty(Node.prototype, 'textContent', {
        configurable: true, enumerable: d.enumerable, get: d.get,
        set(v) {
          const t = this.nodeType;
          if (t === 1) {
            const f = this.firstChild, s = v == null ? '' : String(v);
            if (f === null ? s === '' : (f === this.lastChild && f.nodeType === 3 && f.data === s)) { sleppt.texti++; return; }
          } else if (t === 3) {
            if (this.data === (v == null ? '' : String(v))) { sleppt.texti++; return; }
          }
          d.set.call(this, v);
        },
      });
    }
  } catch (_) {}

  // ── setAttribute ───────────────────────────────────────────────────────────────────────────────────────────────────
  // Undanskilið: eigindir þar sem SAMA gildi hefur áhrif (endurhleðsla). Allt annað er hrein stöðulýsing.
  const UNDANSKILID = { src: 1, href: 1, data: 1, srcdoc: 1, srcset: 1, poster: 1, action: 1, value: 1, checked: 1, selected: 1 };
  try {
    const sa = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (n, v) {
      if (arguments.length === 2 && typeof n === 'string' && typeof v !== 'symbol' && !UNDANSKILID[n.toLowerCase()]) {
        const nu = this.getAttribute(n);
        if (nu !== null && nu === String(v)) { sleppt.eigind++; return; }
      }
      return sa.apply(this, arguments);
    };
  } catch (_) {}

  // ── id / className / title — speglaðar eigindir ────────────────────────────────────────────────────────────────────
  const spegill = (proto, prop, eigind) => {
    try {
      const d = Object.getOwnPropertyDescriptor(proto, prop);
      if (!d || !d.set || !d.configurable) return;
      Object.defineProperty(proto, prop, {
        configurable: true, enumerable: d.enumerable, get: d.get,
        set(v) {
          const nu = this.getAttribute(eigind);
          if (nu !== null && typeof v !== 'symbol' && nu === String(v)) { sleppt.eigind++; return; }
          d.set.call(this, v);
        },
      });
    } catch (_) {}
  };
  spegill(Element.prototype, 'id', 'id');
  spegill(Element.prototype, 'className', 'class');
  if (window.HTMLElement) spegill(HTMLElement.prototype, 'title', 'title');

  // ── classList.add / remove ─────────────────────────────────────────────────────────────────────────────────────────
  // (toggle er þegar hljóðlátt þegar ekkert breytist — staðallinn keyrir þá engin uppfærsluskref.)
  try {
    const TL = DOMTokenList.prototype, add = TL.add, rem = TL.remove;
    TL.add = function () {
      const n = arguments.length;
      if (!n) return add.apply(this, arguments);
      for (let i = 0; i < n; i++) if (!this.contains(arguments[i])) return add.apply(this, arguments);
      sleppt.klasi++;
    };
    TL.remove = function () {
      const n = arguments.length;
      if (!n) return rem.apply(this, arguments);
      for (let i = 0; i < n; i++) if (this.contains(arguments[i])) return rem.apply(this, arguments);
      sleppt.klasi++;
    };
  } catch (_) {}

  console.log('[patch-440] kyrrð — skrif á sama gildi ná ekki DOM-inu');
})();
/* === END KYRRÐ === */
