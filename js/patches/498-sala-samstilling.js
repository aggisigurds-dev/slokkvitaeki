/* === SÖLUBORÐ · SAMSTILLING OG VISTUN VALA (498) — 05.11.2026 ===
 *
 * Agnar 05.11.2026: „söluborðið heldur ekki röðuninni" og „afhverju þarf ég að biðja um þetta í hvert einasta skipti
 * sem ég breyti einhverju að láta helvítist kerfið savast" (regla 15.10.2026: hvert val á þjóninn, eins á öllum vélum).
 *
 *   1. RÖÐIN Á OPNUM SÍÐUM. pos.js les vorur einu sinni og aldrei aftur á opinni síðu (refreshCatalogIfStale gerir ekkert
 *      eftir fyrstu hleðslu; afgreiðsluvél sem situr á Sölu allan daginn sá því aldrei röð sem var vistuð á annarri vél).
 *      Hér er röðin (vorur.rodun) lesin af þjóninum — létt sókn, id + rodun + tveir fánar, aðeins `virkt` — þegar Sala
 *      verður virk (view-shown), eftir hverja teikningu pos.js (sala-catalog-rendered: kemur eftir hverja sölu),
 *      þegar flipinn/glugginn fær fókus og á 120 s fresti meðan Sala er sýnileg. Inngjöf ≥ 20 s. Svarið er sett í
 *      POS.getState() (rodun) og flísunum raðað á sínum stað með sama samanburði og pos.js sortTiles
 *      (SalaRodun.radaEftirRodun, 496) — aðeins ef röðin er röng, ekkert endurbyggt.
 *      Aldrei beitt á meðan „Raða" er á, dregið er eða vistun er á lofti, og sókn sem hófst áður en notandi byrjaði að raða
 *      er hent (SalaRodun.gen/upptekid) — fersk röð notandans má aldrei hverfa fyrir gömlu svari. Tómt svar eða villa er
 *      ekki staðreynd: þá gerist ekkert. Breytist mengið (ný/horfin vara, forsida/aðrar-fáni) er POS.invalidateVorur()
 *      kallað og pos.js sækir og teiknar sjálft. Skrifar ekkert.
 *   2. VAL FRÁ ÖÐRUM VÉLUM. Vidmot (472) sendir `vidmot-breytt` aðeins þegar AppSettings hleðst, og ekkert endurhleður
 *      það á opinni síðu. Sama sókn sækir því (létt) `settings->vidmot` og kallar AppSettings.load() AÐEINS ef eitt af
 *      Söluborðs-völunum hér að neðan er nýrra á þjóni en á þessari vél.
 *   3. „SJÁ AÐRAR VÖRUR" (pos.js _adrarOpen) var aðeins til í minni — opið/lokað valið tapaðist við hverja hleðslu.
 *      Nú Vidmot 'sala.adrarOpid', skrifað AÐEINS við raunverulegan smell (e.isTrusted; forritaðir smellir 443 skrifa
 *      ekkert), endurheimt með forrituðum smelli þegar fyrsta teikning hefur aðrar vörur, og tekið af þjóni þegar önnur vél
 *      breytir því.
 *
 * pos.js ÓSNERT (vörðuð leið): aðeins lesið úr POS.getState(), POS.invalidateVorur() kallað, flísahnútar færðir.
 * Engin MutationObserver; engin skrif nema Vidmot.setja við raunverulegan smell.
 */
(() => {
  'use strict';
  if (window.__salaSamstilling498) return;
  window.__salaSamstilling498 = true;

  const INNGJOF_MS = 20000;      // lágmarksbil milli sókna
  const TIMI_MS = 120000;        // endurlestur meðan Sala er sýnileg
  const ADRAR_VM = 'sala.adrarOpid';
  const VAL_LYKLAR = ['sala.flokkur', ADRAR_VM, 'sala.listiOpnir'];

  const virk = () => { const v = document.getElementById('view-sala'); return !!(v && v.classList.contains('active')); };
  let sidast = Date.now();       // fyrsta sókn ≥ 20 s eftir hleðslu — pos.js var að enda við að lesa vorur
  let a_floti = false;

  // ── 1+2. samstilla röðina og vistuð val ─────────────────────────────────────
  async function samstilla(krafist) {
    if (a_floti || !virk() || document.hidden) return;
    const nu = Date.now();
    if (!krafist && nu - sidast < INNGJOF_MS) return;
    if (!window.DB || !DB.sb || !window.POS || !POS.getState) return;
    const R = window.SalaRodun;
    if (R && R.upptekid()) return;               // „Raða" á, dregið eða vistun á lofti — ekkert hreyft
    const gen0 = R ? R.gen() : 0;
    a_floti = true; sidast = nu;
    try {
      const r = await DB.sb.from('vorur').select('id,rodun,forsida,sja_adrar_vorur').eq('virkt', true);
      if (r && !r.error && Array.isArray(r.data) && r.data.length) {   // tómt svar/villa ≠ staðreynd
        if (!(R && (R.upptekid() || R.gen() !== gen0))) beitaRod(r.data);
      }
      await athugaVal();
    } catch (_) { /* lestur — engin villa má trufla afgreiðslu */ } finally { a_floti = false; }
  }

  function beitaRod(rows) {
    const st = POS.getState();
    const lidir = (st.services || []).concat(st.products || []);
    const m = new Map(rows.map(x => [+x.id, x]));
    let mengiBreytt = rows.length !== lidir.length;
    lidir.forEach(p => {
      const x = m.get(+p.id);
      if (!x) { mengiBreytt = true; return; }
      if ((x.forsida === true) !== (p.forsida === true) || (x.sja_adrar_vorur === true) !== (p.sja_adrar_vorur === true)) mengiBreytt = true;
      p.rodun = x.rodun;
    });
    if (mengiBreytt) { try { POS.invalidateVorur(); } catch (_) {} }   // ný/horfin vara eða fáni breyttist: pos.js sækir og teiknar sjálft
    try { if (window.SalaRodun) SalaRodun.radaEftirRodun(); } catch (_) {}
  }

  async function athugaVal() {
    if (!window.AppSettings || !AppSettings.path || !AppSettings.load) return;
    const r = await DB.sb.from('app_settings').select('v:settings->vidmot').eq('id', 1);
    const fj = r && !r.error && Array.isArray(r.data) && r.data[0] && r.data[0].v;
    if (!fj || typeof fj !== 'object') return;
    const stad = AppSettings.path('vidmot') || {};
    const nyrra = VAL_LYKLAR.some(k => {
      const fr = fj[k] && +fj[k].ts, st = stad[k] && +stad[k].ts;
      return fr && (!st || fr > st);
    });
    if (nyrra) { try { await AppSettings.load(); } catch (_) {} }   // → onChange → Vidmot samraema → vidmot-breytt (497 les sjálft)
  }

  // ── 3. „Sjá aðrar vörur": vistað á þjóninn ─────────────────────────────────
  const adrarOpid = () => { const w = document.getElementById('pos-adrar-wrap'); return !!(w && w.style.display !== 'none'); };
  document.addEventListener('click', e => {
    if (!e.isTrusted) return;                                    // forritaðir smellir (443 opnar/lokar í leit) skrifa ekkert
    const b = e.target && e.target.closest && e.target.closest('#pos-adrar-toggle');
    if (!b) return;
    setTimeout(() => { try { if (window.Vidmot) Vidmot.setja(ADRAR_VM, adrarOpid()); } catch (_) {} }, 60);   // pos.js er búið að skipta
  }, true);

  let adrarJafnad = false;
  function jafnaAdrar() {
    try {
      const leit = document.getElementById('_sl-leit');
      if (leit && String(leit.value || '').trim()) return false;         // leit hefur opnað „aðrar vörur" tímabundið (443) — ekki hrófla
      const btn = document.getElementById('pos-adrar-toggle');
      if (!btn || btn.style.display === 'none') return false;            // engar aðrar vörur enn — reyna við næstu teikningu
      const vil = window.Vidmot ? Vidmot.lesa(ADRAR_VM, false) === true : false;
      if (vil !== adrarOpid()) btn.click();                              // forritaður smellur: skrifar ekkert
      return true;
    } catch (_) { return false; }
  }

  // ── triggerar ───────────────────────────────────────────────────────────────
  document.addEventListener('view-shown', e => { if (e && e.detail && e.detail.name === 'sala') samstilla(false); });
  document.addEventListener('sala-catalog-rendered', () => {
    if (!adrarJafnad && jafnaAdrar()) adrarJafnad = true;
    samstilla(false);
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') samstilla(false); });
  window.addEventListener('focus', () => samstilla(false));
  document.addEventListener('vidmot-breytt', e => {
    const d = e && e.detail;
    if (d && d.lykill === ADRAR_VM && !d.heima) jafnaAdrar();           // önnur vél opnaði/lokaði „aðrar vörur"
  });
  setInterval(() => { if (virk() && !document.hidden) samstilla(false); }, TIMI_MS);

  window.SalaSamstilling = { samstilla: () => samstilla(true), jafnaAdrar, floti: () => a_floti };
})();
