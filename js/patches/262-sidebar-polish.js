/* === SIDEBAR POLISH v2 ===
 *
 * Agnar 2026-07-05: (1) stækka letrið í hliðarstikunni svo hún sé læsilegri,
 * (2) taka „gula" Þjónustuver-hnappinn og gera hann að venjulegum lið, og
 * (3) gera notenda-skilin (patch 171 „+ Lína") að SÝNILEGRI daufri línu.
 *
 * v2: selectorarnir voru scope-aðir á `nav.view-nav` — en á síma lifir hnappurinn
 * líka í MOBILE-valmyndinni (öðru íláti), svo gula override-ið náði ekki þangað.
 * Nú eru reglurnar ílát-óháðar (`.vnav-btn…`) OG lítill JS-þvingari sem núllar
 * gula stílinn beint á hnappinn (inline !important) hvar sem hann er — óháð
 * sértækni, klónun eða skinni.
 */
(() => {
  if (!document.getElementById('sidebar-polish-style')) {
    const s = document.createElement('style');
    s.id = 'sidebar-polish-style';
    s.textContent = `
      /* 1 — stærra, læsilegra letur (var 13px) — í hvaða valmynd sem er */
      .vnav-btn{ font-size:14.5px !important; padding-top:9.5px !important; padding-bottom:9.5px !important; letter-spacing:.005em; }
      .vnav-btn svg{ width:17px !important; height:17px !important; }
      .vnav-btn .badge,.vnav-btn .count,.vnav-btn [class*="badge"],.vnav-btn [class*="count"]{ font-size:11.5px !important; }
      .vnav-btn._sc-launcher{ font-size:12px !important; }

      /* 2 — Þjónustuver aldrei gulur pilla, hvar sem hann er */
      .vnav-btn[data-view="thjonustuver"]{
        background:transparent !important; background-image:none !important; color:var(--sidebar-text,rgba(255,255,255,.6)) !important;
        border:none !important; box-shadow:none !important; font-weight:500 !important;
        text-align:left !important; justify-content:flex-start !important;
        border-radius:var(--radius-sm,8px) !important;
      }
      .vnav-btn[data-view="thjonustuver"]:hover{ background:var(--sidebar-hover,rgba(255,255,255,.07)) !important; color:rgba(255,255,255,.85) !important; }
      .vnav-btn[data-view="thjonustuver"].active{ background:var(--sidebar-active,rgba(201,60,29,.2)) !important; color:var(--sidebar-text-active,#fff) !important; }

      /* 1b — allur texti í hliðarstikunni hvítur */
      nav.view-nav .vnav-btn, .brand-name, .brand-sub, .nav-section-label,
      .sidebar-user-name, .sidebar-user-role{ color:#fff !important; }
      nav.view-nav .vnav-btn svg{ opacity:.95 !important; }

      /* 3 — notenda-skil sem SÝNILEG dauf lína ofan við hópinn */
      .vnav-btn.nav-grp-start{ margin-top:16px !important; padding-top:15px !important; border-top:1px solid rgba(255,255,255,.16) !important; }
      @media (max-width:900px){ .vnav-btn.nav-grp-start{ margin-top:11px !important; padding-top:11px !important; } }
    `;
    document.head.appendChild(s);
  }

  // JS-þvingari: núlla gula stílinn beint á hnappinn (inline !important slær allt).
  // Nauðsynlegt því einhver eldri regla/skinn litar hann gulan með hærri sértækni
  // eða í klónaðri mobile-valmynd sem CSS-selectorinn nær ekki alltaf.
  function neutralize() {
    document.querySelectorAll('.vnav-btn[data-view="thjonustuver"]').forEach(btn => {
      if (btn.dataset._sbpFixed) return;
      const S = btn.style;
      S.setProperty('background', 'transparent', 'important');
      S.setProperty('background-image', 'none', 'important');
      S.setProperty('border', 'none', 'important');
      S.setProperty('box-shadow', 'none', 'important');
      S.setProperty('justify-content', 'flex-start', 'important');
      S.setProperty('text-align', 'left', 'important');
      S.setProperty('font-weight', '500', 'important');
      btn.dataset._sbpFixed = '1';
    });
  }
  neutralize();
  // re-run as nav buttons stream in / the mobile drawer is (re)built
  [300, 900, 2000, 4000].forEach(t => setTimeout(neutralize, t));
  try {
    const mo = new MutationObserver(() => neutralize());
    mo.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { try { mo.disconnect(); } catch (_) {} }, 12000);
  } catch (_) {}
  console.log('[patch-262 v2] sidebar polish (font + Þjónustuver normalize + skil-lína)');
})();
/* === END SIDEBAR POLISH === */
