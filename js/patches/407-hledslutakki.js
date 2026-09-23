/* === HLEÐSLUTAKKI Í BORÐANN (407, 23.09.2026) ================================
 *
 * Agnar 17.09.2026: „Alveg spurning að setja vinnutölvu stillingu. Að það sé takki sem lætur tölvuna sækja flest af
 * síðunni. Ultra catch mode sem sækir flest og sé alveg með flest ready." — og 23.09.2026: „setja kannski lítinn takka
 * í Banner sem myndi bara sækja allt cache sem þyrfti til að lágmarka allan biðtíma í vinnutölvunum."
 *
 * HVAÐ VAR ÞEGAR TIL OG HVAÐ VANTAÐI:
 *   Patch 378 (Vinnutölva) smíðaði SKYNDIMINNIÐ — það man hvert svar eftir slóð og sýnir það strax næst. En það er
 *   HLUTLAUST: það man aðeins þau gögn sem þú ert þegar búinn að sækja. Fyrsta heimsóknin á hverja síðu kostar því
 *   alveg jafn mikið og áður, og það er einmitt biðin sem Agnar var að lýsa. Seinni helming óskarinnar — takkinn sem
 *   SÆKIR fyrirfram — vantaði. Hann er hér.
 *
 * MÆLT 23.09.2026 ÁÐUR EN ÞETTA VAR SKRIFAÐ — hvað kostar að opna fyrirtækjaprófíl (REST-köll):
 *
 *                       Vinnutölva SLÖKKT   Vinnutölva KVEIKT
 *     618 (fyrsta)              25                32
 *     193                       21                30
 *     233                       20                28
 *     AFTUR á 618               28                 0      ← þetta er vinningurinn
 *
 * Lesið úr þessu, og það er mikilvægt: SKYNDIMINNIÐ VIRKAR, en það virkar á ENDURKOMU. Fyrsta heimsókn á hvert
 * fyrirtæki kostar jafn mikið eftir sem áður, því fyrirspurnirnar á prófílnum eru síaðar á fyrirtaeki_id — hver
 * þeirra á sína eigin slóð og ekkert magn-forsókn getur hitað þær upp fyrirfram. Þessi takki getur því EKKI
 * flýtt fyrstu heimsókn á fyrirtæki, og lofar því ekki.
 *
 * ÞAÐ SEM HANN GERIR RAUNVERULEGA:
 *   1. Kveikir á Vinnutölvu (378) í einum smelli. Hún er SLÖKKT sjálfgefið — og það er langstærsta atriðið hér:
 *      án hennar kostar hver endurkoma á fyrirtæki 28 köll, með henni 0.
 *   2. Hitar sameiginlegu mengin (stillingar · fyrirtækjalisti · tæki og verk · Ársskoðun) svo þau séu klár.
 *      Á venjulega ræstri síðu eru þau reyndar þegar komin — þetta skiptir helst máli eftir að minnið hefur
 *      verið hreinsað eða þegar ræsingin hefur ekki klárast.
 *
 * AÐFERÐIN — appsins eigin hleðslarar, engar nýjar fyrirspurnir:
 *   Skyndiminni 378 lyklast á SLÓÐ. Ef þessi takki byggi til sínar eigin fyrirspurnir (aðrir dálkar, önnur röðun) yrði
 *   slóðin önnur og síðurnar fengju EKKERT úr minninu — við hefðum þá sótt 15.000 raðir til einskis. Þess vegna kallar
 *   hann á nákvæmlega sömu föll og síðurnar sjálfar nota. Þá er slóðin sú sama og hitnunin raunveruleg.
 *
 *   Öll köllin eru LESTUR (GET). Enginn þeirra skrifar neitt.
 *
 * ÖRYGGI:
 *   • Kveikir á Vinnutölvu ef slökkt er — annars væri ekkert geymt og takkinn gagnslaus. Það er tækjaval (localStorage),
 *     sama og 378 gerir, og notandinn sér ⚡-merkið neðst í hægra horni eftir á.
 *   • Hvert skref er sér try/catch: eitt fall sem bregst stöðvar ekki hin.
 *   • Takkinn læsist á meðan svo tvísmellur ræsi ekki tvær umferðir.
 *   • Ferskleikavarnirnar í 378 standa óbreyttar: hvert SKRIF hreinsar sína töflu, svo ekkert hér getur sýnt gamalt
 *     gildi eftir vistun.
 * ========================================================================== */
(() => {
  if (window.Hledslutakki) return;

  const AUÐK = '_hl-takki';

  // Hleðslararnir sem síðurnar sjálfar nota. Röðin er viljandi: stillingar fyrst (allt annað les þær), svo
  // fyrirtækjalistinn (þyngstur og flestir lesa hann), svo tækin, svo Ársskoðunar-mengið.
  const SKREF = [
    { nafn: 'Stillingar',    keyra: () => window.AppSettings && AppSettings.load && AppSettings.load() },
    { nafn: 'Fyrirtæki',     keyra: () => window.Companies   && Companies.load   && Companies.load() },
    { nafn: 'Tæki og verk',  keyra: () => window.DB          && DB.loadAll       && DB.loadAll() },
    { nafn: 'Ársskoðun',     keyra: () => window.Arsskodun   && Arsskodun.loadAll && Arsskodun.loadAll() },
  ];

  let ígangi = false;

  function takki() { return document.getElementById(AUÐK); }

  function mála(texti, litur) {
    const b = takki();
    if (!b) return;
    b.textContent = texti;
    b.style.borderColor = litur || 'rgba(255,255,255,.22)';
  }

  async function sækja() {
    if (ígangi) return;
    ígangi = true;
    const b = takki();
    if (b) b.disabled = true;

    try {
      // Án skyndiminnis er ekkert geymt og takkinn skilar engu næst.
      if (window.Vinnutolva && !Vinnutolva.a()) Vinnutolva.kveikja(true);

      for (let i = 0; i < SKREF.length; i++) {
        mála('⚡ ' + SKREF[i].nafn + ' … ' + (i + 1) + '/' + SKREF.length, '#f6b545');
        try { await Promise.resolve(SKREF[i].keyra()); }
        catch (e) { try { console.warn('[406] ' + SKREF[i].nafn, e); } catch (_) {} }
      }

      const n = (window.Vinnutolva && Vinnutolva.stada().svor) || 0;
      mála('✓ Tilbúið · ' + n + ' svör', '#16a34a');
      try { if (window.Toast && Toast.show) Toast.show('⚡ Vinnutölvan er hlaðin — ' + n + ' svör í minni'); } catch (_) {}
    } finally {
      ígangi = false;
      if (takki()) takki().disabled = false;
      setTimeout(() => { if (!ígangi) mála('⚡ Hlaða', null); }, 6000);
    }
  }

  // ── takkinn sjálfur ───────────────────────────────────────────────────────
  // Hann sest í `.bb-face`, RÉTT Á UNDAN klukku-umgjörðinni — sem sagt í hópinn Sími/Tafla/Skjár · 🎨 · ⚡ · klukka.
  //
  // EKKI í `.bb-rightwrap`: patch 405 (borði-hnappar, sami dagur) mældi þá leið og hafnaði henni — 314 og mobile.css
  // fela þá umgjörð í Síma-ham, svo allt sem fer þangað inn hverfur á síma. 166:451 og 262:2141 segja hið sama.
  // Hinir borða-hnapparnir (#_ky-vm-toggle úr 166, #_pe-btn úr 262) eru settir inn EFTIR að þessi patch keyrir, og
  // patch 405 gefur þeim `margin-left:auto` svo þeir hópast við klukkuna. Væri okkar hnappur skilinn eftir þar sem
  // hann lenti fyrst sæti hann einn úti á miðjum borða. Þess vegna er sætið leiðrétt þar til röðin er komin — með
  // ÞAKI, því 405 mældi að endalaus færsla á hnútum í borðanum varð að slag (156 DOM-breytingar á 4 sek).
  // Á síma er hnappurinn FALINN. Tvær ástæður, báðar mældar:
  //   • hann stóð út fyrir skjáinn á 375 px (hægri brún 392) — borðinn hefur ekkert pláss aflögu þar;
  //   • þetta er vinnutölvu-fítus. 378 segir það sjálfur: „ekki í síma á 4G, þetta heldur ~14 MB í minni."
  function stíll() {
    if (document.getElementById('hledslutakki-css')) return;
    const st = document.createElement('style');
    st.id = 'hledslutakki-css';
    // 23.09.2026 — SÆTIÐ ER RÁÐIÐ MEÐ `order`, EKKI MEÐ ÞVÍ AÐ FÆRA HNÚTINN.
    //
    // Fyrsta útgáfa leiðrétti sætið með `insertBefore` á 1,5 sek. fresti. Það varð að slag: 262 skilar sínum hnappi
    // aftast í `.bb-face` jafnóðum, svo okkar hnappur var aftur og aftur ekki lengur á undan klukkunni og við
    // færðum hann til baka. Agnar sá hann hoppa fram og til baka í borðanum. Þetta er NÁKVÆMLEGA gildran sem
    // patch 405 lýsir og mældi (156 DOM-breytingar á 4 sek) — ég gekk í hana þrátt fyrir að hafa lesið hana.
    //
    // `.bb-face` er flex og öll börnin bera order:0. Með því að gefa okkar hnappi order:1 og klukkunni order:2
    // lendir hann alltaf á eftir hinum hnöppunum og á undan klukkunni — án þess að nokkur hnútur sé hreyfður.
    // Enginn getur því togað á móti.
    const B = '#bstal-banner .bb-face';
    st.textContent = B + ' > #' + AUÐK + '{order:1}\n'
                   + B + ' > .bb-rightwrap{order:2}\n'
                   + '@media (max-width:900px){#' + AUÐK + '{display:none!important}}\n'
                   + 'html[data-viewmode="mobile"] #' + AUÐK + '{display:none!important}';
    (document.head || document.documentElement).appendChild(st);
  }

  function setja() {
    stíll();
    if (takki()) return;
    const face = document.querySelector('#bstal-banner .bb-face');
    if (!face) return;
    const hýsill = face;
    const b = document.createElement('button');
    b.id = AUÐK;
    b.type = 'button';
    b.title = 'Gerir þessa tölvu að vinnutölvu:\n'
            + '• kveikir á skyndiminninu — endurkoma á fyrirtæki kostar þá 0 netköll í stað 28 (mælt)\n'
            + '• hitar stillingar, fyrirtækjalistann, tæki og verk og Ársskoðun\n\n'
            + 'FYRSTA heimsókn á hvert fyrirtæki verður EKKI hraðari — þær fyrirspurnir eru síaðar á fyrirtækið '
            + 'og ekkert forsókn nær þeim.\n\n'
            + 'Aðeins lestur; ekkert er skrifað. Valið gildir fyrir þessa tölvu.';
    b.style.cssText = 'margin-right:8px;padding:5px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.22);'
      + 'background:rgba(255,255,255,.08);color:#fff;font:600 11.5px/1 system-ui,sans-serif;cursor:pointer;'
      + 'white-space:nowrap;transition:border-color .15s ease-out,background-color .15s ease-out';
    b.onmouseover = () => { b.style.background = 'rgba(255,255,255,.16)'; };
    b.onmouseout  = () => { b.style.background = 'rgba(255,255,255,.08)'; };
    b.textContent = '⚡ Hlaða';
    b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); sækja(); });
    hýsill.appendChild(b);   // sætið ræðst af `order` í stílnum — hnúturinn er aldrei hreyfður eftir þetta
  }

  setInterval(setja, 1500);
  if (document.readyState !== 'loading') setja();
  else document.addEventListener('DOMContentLoaded', setja);

  window.Hledslutakki = { saekja: sækja, skref: () => SKREF.map(s => s.nafn) };
})();
/* === LOK HLEÐSLUTAKKA === */
