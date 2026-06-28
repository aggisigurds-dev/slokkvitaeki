/* === 229-theme-bridge.js — app-wide theme bridge (content views) ============
 *
 * Makes theme-switching ACTUALLY re-skin the app. The app pre-dates the theme
 * system and hardcodes the same house "slate" palette inline across nearly every
 * page (#fff panels, #f1f5f9 areas, #0f172a/#64748b text, #e2e8f0/#cbd5e1
 * borders…), so patch 220 only re-skinned the few token-based bits — themes felt
 * like "a few buttons here and there".
 *
 * This maps those NEUTRAL house colours → the theme tokens (--thm-bg/-card/-ink/
 * -muted/-line) for everything inside `.view` (the main content pages), via
 * inline-style attribute selectors with !important. So pick a dark theme and the
 * whole content area goes dark, readable (bg→card pairs with text→ink/muted).
 *
 * Deliberately untouched:
 *   • ACCENT / STATUS colours (greens, reds, brand orange, blues) — kept so the
 *     UI still has colour pops on the themed surface.
 *   • The sidebar (`nav.view-nav` — not `.view`) — has its own treatment.
 *   • Modals + the print receipt — position:fixed on <body>, outside `.view`,
 *     so they stay white/fixed (receipt must print white).
 *
 * In the default LIGHT theme the tokens ≈ the originals, so the app looks the
 * same; the difference shows when you pick a darker/other theme. CSS-only,
 * layout-safe (no reflow), fully reversible: delete this file + its <script>.
 * =========================================================================== */
(() => {
  if (document.getElementById('theme-bridge')) return;
  // #view-sala is created/managed by pos.js; make sure it carries `.view` so the
  // scope below reaches it too.
  (function tag(t){ const v=document.getElementById('view-sala'); if(v) v.classList.add('view'); else if((t||0)<40) setTimeout(()=>tag((t||0)+1),300); })(0);

  const V = '.view ';
  const css = [
    // page background of the active content view
    '.view{background:var(--thm-bg)!important}',
    // white panels / cards → themed surface
    V+'[style*="background:#fff"],'+V+'[style*="background: #fff"],'+V+'[style*="background:#ffffff"]{background:var(--thm-card)!important}',
    // light-grey surfaces → page bg
    V+'[style*="background:#f8fafc"],'+V+'[style*="background:#f1f5f9"],'+V+'[style*="background:#f8f9fa"],'+V+'[style*="background:#f9fafb"],'+V+'[style*="background:#f3f4f6"],'+V+'[style*="background:#f5f5f7"],'+V+'[style*="background:#f5f6f7"]{background:var(--thm-bg)!important}',
    // primary text
    V+'[style*="color:#0f172a"],'+V+'[style*="color:#1e293b"],'+V+'[style*="color:#111827"],'+V+'[style*="color:#1a1a1f"],'+V+'[style*="color:#16181d"],'+V+'[style*="color:#111"],'+V+'[style*="color:#334155"]{color:var(--thm-ink)!important}',
    // muted / secondary text
    V+'[style*="color:#475569"],'+V+'[style*="color:#64748b"],'+V+'[style*="color:#6b7280"],'+V+'[style*="color:#9ca3af"],'+V+'[style*="color:#94a3b8"],'+V+'[style*="color:#666"],'+V+'[style*="color:#888"],'+V+'[style*="color:#999"]{color:var(--thm-muted)!important}',
    // neutral borders → themed line
    V+'[style*="#e2e8f0"],'+V+'[style*="#cbd5e1"],'+V+'[style*="#e5e7eb"],'+V+'[style*="#e6eaf0"],'+V+'[style*="#eef2f7"],'+V+'[style*="solid #ccc"],'+V+'[style*="solid #ddd"],'+V+'[style*="solid #eee"]{border-color:var(--thm-line)!important}',

    // 2026-06-28 round 4: STATUS-TINTED cards (patch 78 Counter/Afgreiðsla and
    // similar) use very light status pastels — green #f0fdf4 for Tilbúin,
    // amber #fffbeb / #fef9c3 for Í vinnslu, blue #eff6ff for queued,
    // red #fef2f2 for danger. Under dark themes the inner text gets remapped
    // to light by the rule above, but the bg stays a light pastel → white
    // text on light pastel = invisible (the audit r3 caught "Jón Sigurðsson"
    // and "Bryndís H…" failing in Dökkt at ratio ~1.1). Map the pastels to
    // a darker, more saturated tint of the same hue that still reads the
    // status colour but accepts the light text. Light themes are unaffected.
    'html[data-thm-dark="1"] '+V+'[style*="background:#f0fdf4"]{background:rgba(34,197,94,.18)!important;border-color:rgba(34,197,94,.35)!important}',
    'html[data-thm-dark="1"] '+V+'[style*="background:#fffbeb"],'+
      'html[data-thm-dark="1"] '+V+'[style*="background:#fef9c3"]{background:rgba(245,158,11,.18)!important;border-color:rgba(245,158,11,.35)!important}',
    'html[data-thm-dark="1"] '+V+'[style*="background:#eff6ff"]{background:rgba(59,130,246,.18)!important;border-color:rgba(59,130,246,.35)!important}',
    'html[data-thm-dark="1"] '+V+'[style*="background:#fef2f2"],'+
      'html[data-thm-dark="1"] '+V+'[style*="background:#fee2e2"]{background:rgba(239,68,68,.18)!important;border-color:rgba(239,68,68,.35)!important}',
    // 2026-06-19: under any DARK theme give EVERY content page the premium look
    // from Rekstrarfélög — a black → brand gradient backdrop (Grafít/Miðnætti =
    // svart+dökkblár, Glóð = svart+glóð, o.s.frv.) + dark buttons / white text.
    'html[data-thm-dark="1"] .view{background:radial-gradient(900px 520px at 85% -8%,color-mix(in srgb,var(--thm-brand) 42%,transparent),transparent 62%),linear-gradient(168deg,#05070d 0%,color-mix(in srgb,var(--thm-brand) 26%,#05070d) 125%)!important}',
    // metallic buttons — brushed gunmetal, brand-tinted (blued steel / bronze / brass per theme)
    'html[data-thm-dark="1"] .view .btn:not(.btn-primary):not(.btn-success),html[data-thm-dark="1"] .view button:not(.btn-primary):not(.btn-success),html[data-thm-dark="1"] .view a[download]{background:linear-gradient(180deg,color-mix(in srgb,var(--thm-brand) 18%,#363b45) 0%,color-mix(in srgb,var(--thm-brand) 9%,#21252c) 49%,#181b21 51%,color-mix(in srgb,var(--thm-brand) 13%,#262b33) 100%)!important;border:1px solid color-mix(in srgb,var(--thm-brand) 24%,#3a404a)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 -1px 0 rgba(0,0,0,.45),0 2px 5px rgba(0,0,0,.4)!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)!important}',
    // metallic primary / accent button (polished)
    'html[data-thm-dark="1"] .view .btn-primary,html[data-thm-dark="1"] .view [style*="background:var(--brand)"]{background:linear-gradient(180deg,color-mix(in srgb,var(--thm-primary) 78%,#fff) 0%,var(--thm-primary) 49%,color-mix(in srgb,var(--thm-primary) 75%,#000) 51%,var(--thm-primary) 100%)!important;border:1px solid color-mix(in srgb,var(--thm-primary) 55%,#000)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 3px 8px rgba(0,0,0,.45)!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.45)!important}',
    // sheen on hover, pressed on active
    'html[data-thm-dark="1"] .view .btn:hover,html[data-thm-dark="1"] .view button:hover,html[data-thm-dark="1"] .view a[download]:hover{filter:brightness(1.13)}',
    'html[data-thm-dark="1"] .view .btn:active,html[data-thm-dark="1"] .view button:active{box-shadow:inset 0 2px 5px rgba(0,0,0,.6)!important;filter:brightness(.96)}'
  ].join('');
  const st = document.createElement('style');
  st.id = 'theme-bridge';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);
  console.log('[patch-229] app-wide theme bridge installed');
})();
/* === END THEME BRIDGE === */
