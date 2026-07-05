/* === SIDEBAR POLISH v1 ===
 *
 * Agnar 2026-07-05: (1) stækka letrið í hliðarstikunni svo hún sé læsilegri,
 * (2) taka „gula" Þjónustuver-hnappinn og gera hann að venjulegum lið, og
 * (3) gera notenda-skilin (patch 171 „+ Skil") að SÝNILEGRI daufri línu svo
 * hægt sé að flokka valmyndina betur.
 *
 * Root-cause á gula hnappnum: patch 182 afritaði `firstBtn.className` yfir á
 * Þjónustuver-hnappinn (fékk þar með stöku auka-klasa sem skinnið litaði). Það
 * er lagað í patch 182; hér er líka há-sértækt öryggis-override.
 */
(() => {
  if (document.getElementById('sidebar-polish-style')) return;
  const s = document.createElement('style');
  s.id = 'sidebar-polish-style';
  s.textContent = `
    /* 1 — stærra, læsilegra letur (var 13px) */
    nav.view-nav .vnav-btn{ font-size:14.5px !important; padding-top:9.5px !important; padding-bottom:9.5px !important; letter-spacing:.005em; }
    nav.view-nav .vnav-btn svg{ width:17px !important; height:17px !important; }
    nav.view-nav .vnav-btn .badge,nav.view-nav .vnav-btn .count,nav.view-nav .vnav-btn [class*="badge"],nav.view-nav .vnav-btn [class*="count"]{ font-size:11.5px !important; }
    /* the customizer launcher stays small + quiet */
    nav.view-nav .vnav-btn._sc-launcher{ font-size:12px !important; }

    /* 2 — Þjónustuver aftur í venjulegt horf (aldrei gulur pilla) */
    nav.view-nav .vnav-btn[data-view="thjonustuver"]{
      background:transparent !important; color:var(--sidebar-text) !important;
      border:none !important; box-shadow:none !important; font-weight:500 !important;
      text-align:left !important; justify-content:flex-start !important;
      border-radius:var(--radius-sm) !important;
    }
    nav.view-nav .vnav-btn[data-view="thjonustuver"]:hover{ background:var(--sidebar-hover) !important; color:rgba(255,255,255,.85) !important; }
    nav.view-nav .vnav-btn[data-view="thjonustuver"].active{ background:var(--sidebar-active) !important; color:var(--sidebar-text-active) !important; }

    /* 3 — notenda-skil (patch 171/68) sem SÝNILEG dauf lína ofan við hópinn */
    nav.view-nav .vnav-btn.nav-grp-start{
      margin-top:16px !important; padding-top:15px !important;
      border-top:1px solid rgba(255,255,255,.16) !important;
    }
    @media (max-width:900px){ nav.view-nav .vnav-btn.nav-grp-start{ margin-top:11px !important; padding-top:11px !important; } }
  `;
  document.head.appendChild(s);
  console.log('[patch-262] sidebar polish (font + Þjónustuver + skil-lína)');
})();
/* === END SIDEBAR POLISH === */
