/* === 469 — TAKKARNIR Í HAUS VÖRUR OG ÞJÓNUSTA Í MÁLMLITUM ÞJÓNUSTANNA (14.10.2026) ============================
 *
 * Agnar 14.10.2026 12:20 (skjáskot með hringjum): „Gera slökkvitækja verðlistann dark metal blue, brunakerfi dark
 * metal [rauður hringur], slökkvikerfis dark gul/gull metal, ný vara green dark metal — og taka verðlistann, því hann
 * er kominn inn í brunakerfi."
 *
 * Sömu málmar og þjónustuskiptirinn á fyrirtækjasíðunni (402 #_sks-tabs: slökkvitæki dökkblár, brunakerfi dökkrauður)
 * og gullplatan (402 GULL) fyrir slökkvikerfi; Ný vara/þjónusta fær Sækja-grænan (grad-saekja). Takkarnir sjálfir eru
 * vorur.js (tengiTakki + #vorur-new); þessi pappi á aðeins útlitið. Fyrri útgáfa þessa pappa (469-vorur-verdlisti) setti
 * „🏷 Verðlisti" í röðina — hann fór út sama dag: ritillinn er nú inni í Brunak. verð-glugganum (410 ✎ Breyta verðlista).
 */
(() => {
  'use strict';
  if (document.getElementById('vorur-takkar-469')) return;
  const SANS = '"IBM Plex Sans",system-ui,sans-serif';
  const BLAR = 'linear-gradient(145deg,#02060f 0%,#0a1a3a 22%,#183363 45%,#2a4c8f 53%,#0e2147 74%,#03070f 100%)';
  const RAUDUR = 'linear-gradient(145deg,#080001 0%,#260304 22%,#4a0809 45%,#6c0d10 53%,#2a0304 74%,#080001 100%)';
  const GULL = 'linear-gradient(145deg,#171001 0%,#3d2b05 20%,#8a6410 43%,#d3ab4e 53%,#5a3f07 74%,#171001 100%)';   // ekki í notkun eftir 12:30 — geymt ef gullið á að koma aftur
  const LJOSBLAR = 'linear-gradient(145deg,#02090f 0%,#0a2a3e 22%,#155a7d 45%,#2a86b5 53%,#0f3d57 74%,#03090f 100%)';
  const GRAENN = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
  // hærri sértækni en 398 (`… .page-title__tools button:first-child`) með gervi-auðkennum, og !important á hverja eigind
  const S = 'html body #view-vorur .page-title__tools:not(#_v469a):not(#_v469b):not(#_v469c) ';
  const takki = (bg, rond) => 'background:' + bg + '!important;background-image:' + bg + '!important;border:1px solid ' + rond + '!important;border-radius:9px!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.6)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 8px rgba(0,0,0,.45)!important;font-family:' + SANS + '!important;font-weight:700!important;font-size:12.5px!important;padding:9px 14px!important;cursor:pointer;transition:filter .15s';
  const st = document.createElement('style'); st.id = 'vorur-takkar-469';
  st.textContent = [
    S + '.vorur-teng[data-teng="slokkvitaeki"]{' + takki(BLAR, '#020611') + '}',
    S + '.vorur-teng[data-teng="brunakerfi"]{' + takki(RAUDUR, '#0a0102') + '}',
    // 12:30 (Agnar): slökkvikerfi í dökkan ljósbláan málm (var gull — gullið fór á Vinnuliði)
    S + '.vorur-teng[data-teng="slokkvikerfi"]{' + takki(LJOSBLAR, '#02111a') + '}',
    S + '#vorur-new{' + takki(GRAENN, 'rgba(52,168,98,.45)') + '}',
    S + '.vorur-teng:hover,' + S + '#vorur-new:hover{filter:brightness(1.18)}',
    S + '.vorur-teng:active,' + S + '#vorur-new:active{transform:translateY(1px)}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);

  // 14.10.2026 12:25 (Agnar): „setja verðlista fyrir verkstæði varahlutirnir í dökk metal gráu" — fjórði takkinn,
  // grafít-málmur, fyrir framan Ný vara. vorur.js bindur smelli aðeins á sína þrjá takka við teikningu, svo þessi
  // ber sinn eigin; glugginn er 410 (FLOKKAR.verkstaedi). Settur inn aftur þegar vorur.js endurteiknar röðina.
  const GRAFIT = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  st.textContent += '\n' + S + '.vorur-teng[data-teng="verkstaedi"]{' + takki(GRAFIT, '#000') + '}';
  // 12:29: fimmti takkinn, Vinnuliðir (410 FLOKKAR.vinnulidir), dökkgull — dekkri en slökkvikerfis-gullið svo þeir þekkist í sundur
  const DOKKGULL = 'linear-gradient(145deg,#0f0a02 0%,#2e2004 22%,#6b4a0c 45%,#9c7420 53%,#3a2806 74%,#0f0a02 100%)';
  st.textContent += '\n' + S + '.vorur-teng[data-teng="vinnulidir"]{' + takki(DOKKGULL, '#120c02') + '}';
  const AUKA = [
    ['verkstaedi', '🔧 Verkstæði verð', 'Varahlutirnir sem verkstæðið notar — verð, birgðir og ✎ beint á vöruna'],
    ['vinnulidir', '🛠 Vinnuliðir', 'Vinna sem er ekki vara: uppsetning á slökkvitæki, á skilti … — verð ákveðin hér, tengingar síðar']
  ];
  function setja() {
    const rod = document.querySelector('#view-vorur .page-title__tools'); if (!rod) return;
    const ny = rod.querySelector('#vorur-new');
    AUKA.forEach(([teng, texti, titill]) => {
      if (rod.querySelector('.vorur-teng[data-teng="' + teng + '"]')) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'vorur-teng'; b.setAttribute('data-teng', teng);
      b.textContent = texti; b.title = titill;
      b.addEventListener('click', () => { if (window.ThjonustuTengingar && ThjonustuTengingar.opna) ThjonustuTengingar.opna(teng); });
      if (ny) rod.insertBefore(b, ny); else rod.appendChild(b);
    });
  }
  function schedule() { if (schedule.q) return; schedule.q = true; requestAnimationFrame(() => { schedule.q = false; try { setja(); } catch (e) { console.error('[469]', e); } }); }
  (function watch() {
    if (!document.body) { setTimeout(watch, 200); return; }
    new MutationObserver(ms => { for (const m of ms) { const t = m.target; if (t && t.closest && t.closest('.vorur-teng[data-teng="verkstaedi"],.vorur-teng[data-teng="vinnulidir"]')) continue; schedule(); return; } }).observe(document.body, { childList: true, subtree: true });
    setja();
  })();
  setInterval(() => { if (!document.hidden) { try { setja(); } catch (_) {} } }, 1500);
})();
