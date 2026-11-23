/* === EINN VIRKUR HNAPPUR Í HLIÐARSTIKUNNI (526) — 23.11.2026 ===
 *
 * Agnar 23.11.2026: „Raudu linurnar" — rauði málmurinn málaði FLEIRI en einn hnapp
 * í einu. Mælt á slokkvitaeki.netlify.app (build efb1262, 1440px, innskráð):
 *
 *   5 hnappar báru .active  ·  1 sýn var sýnileg (view-arsskodun)
 *   arsskodun (rétt) · maelabord · allir-vidsk · Reikningar · Kreditreikningur
 *
 * Tveir þeir síðustu eru faldir (181 tók þá úr stikunni) svo þeir sáust ekki, en
 * maelabord og allir-vidsk stóðu rauð við hliðina á réttu síðunni.
 *
 * RÓT: 77 staðir í 30+ patchum gera `querySelectorAll('.vnav-btn').remove('active')`
 * og setja svo sinn eigin. Hver þeirra er réttur einn og sér, en sá sem merkir sig
 * við RÆSINGU (þegar sýnin hans er búin til) keyrir áður en nokkur annar hreinsar —
 * og situr eftir þar til notandinn fer inn á hann. Það er ekki hægt að laga í 77
 * köllum án þess að brjóta leiðsögn sem virkar; þess vegna samræming hér á eftir.
 *
 * AÐFERÐIN: ekkert kall er vafið og engum hnapp er smellt. Eftir að sýn birtist
 * (view-shown úr 16) er talið: sé TIL hnappur sem svarar sýnilegu sýninni
 * (data-view === id án "view-"), á hann einn .active og hinir missa hann. Finnist
 * enginn slíkur hnappur — sýnir sem 175/190/221 opna sjálfar og eiga hnapp án
 * data-view — er EKKERT snert. Við slökkvum ekki á merkingu sem við skiljum ekki.
 *
 * Enginn MutationObserver (patch 87). Engin vöktun á body. Aðeins atburðir.
 */
(() => {
  if (window.__einnVirkur526) return;
  window.__einnVirkur526 = true;

  // Sýnin sem er raunverulega á skjánum. `.view.active` er merkingin sem App
  // notar; display er lesið með af því að nokkrir patchar sýna sínar sýnir beint.
  function synilegSyn() {
    const allar = document.querySelectorAll('[id^="view-"]');
    for (const v of allar) {
      if (!v.id) continue;
      const synileg = v.classList.contains('active') || (v.style.display === 'block');
      if (synileg && getComputedStyle(v).display !== 'none') return v.id.slice(5);
    }
    return null;
  }

  function samraema() {
    const nav = document.querySelector('.topbar nav.view-nav');
    if (!nav) return;
    const virkir = nav.querySelectorAll('.vnav-btn.active');
    if (virkir.length < 2) return;            // einn eða enginn: ekkert að gera

    const syn = synilegSyn();
    if (!syn) return;

    // Hnappurinn sem svarar sýnilegu sýninni. Sé hann ekki til á sýnin sinn hnapp
    // án data-view (175/190/221) — þá er merkingin þeirra og við snertum ekkert.
    const rettur = nav.querySelector('.vnav-btn[data-view="' + CSS.escape(syn) + '"]');
    if (!rettur) return;

    let teknir = 0;
    virkir.forEach(b => { if (b !== rettur) { b.classList.remove('active'); teknir++; } });
    if (!rettur.classList.contains('active')) rettur.classList.add('active');
    if (teknir && window.__einnVirkur526Log !== false) {
      console.log('[526] einn virkur hnappur: tók .active af ' + teknir + ' (sýn: ' + syn + ')');
    }
  }

  document.addEventListener('view-shown', () => setTimeout(samraema, 0));

  // Ræsingin: patchar merkja sig þegar sýnin þeirra verður til, sem gerist á
  // ýmsum tímum. Þrjár keyrslur ná þeim án þess að vakta nokkuð.
  const start = () => { samraema(); setTimeout(samraema, 1200); setTimeout(samraema, 4000); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
