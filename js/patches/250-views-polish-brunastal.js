/* === 250-views-polish-brunastal.js — extra Brunastál polish for content views
 *
 * Patch 245 (`brunastal-content-skin.js`) already covers the GENERIC content
 * recipes — `.tcard`, `.dtbl`, `.btn-*`, status chips, etc.  But many of the
 * older / heavier views (Sala, Vörur, Tekjur, Bókhalds yfirlit, Verkdagbók,
 * Tækni, Verkstæði, Lánstæki) build their layout from raw `style="…"` inline
 * attributes — so the generic class-based recipes never reach them.  The result
 * is that those pages look noticeably worse than the hand-polished
 * **Fyrirtæki í Þjónustu** (the visual benchmark, patch 153 / `companieslist.js`):
 * flatter cards, sharper corners, no body-text wrappers around content, weaker
 * borders, wrong header typography, and amounts rendered in the UI font.
 *
 * This file lifts those views to the benchmark by scoping a high-specificity
 * sheet — `html[data-thm-preset="brunastal"] #view-XXX …` — that:
 *
 *   • turns every inline `background:#fff;border-radius:12px;border:1px solid #f1f5f9`
 *     card into the Brunastál panel (radius 16, brushed-steel border, depth shadow)
 *   • re-types every page H1/H2 in **Space Grotesk** at the benchmark size
 *   • re-types every kr / amount / number column in **Space Mono**
 *   • normalises section sub-titles to the muted-grey 12px style used in the
 *     benchmark `._cl_subtitle`
 *   • makes the inline-flat-coloured CSV/Excel/utility buttons feel like real
 *     metal buttons (light pill + tonal hover — they are NOT brand CTAs)
 *
 * Everything is wrapped in `html[data-thm-preset="brunastal"]`, so the other
 * Útlit presets are unaffected.  `!important` is used because each view paints
 * inline styles into `style="…"` attributes that beat normal class selectors.
 *
 * Scope picked (the 3-4 worst offenders identified in the audit):
 *
 *   1. `#view-vorur`           — Vörur og þjónusta
 *   2. `#view-income`          — Tekjur og sölur
 *   3. `#view-sala`            — POS (catalog band — patch 230 already styles
 *                                 .pos-cart + pos-tiles; we polish the rest)
 *   4. `#view-bokhalds-yfirlit`— Bókhalds yfirlit
 *   5. `#view-verkdagbok`      — Verkdagbók
 *   6. `#view-taeknimenn`      — Tækni / starfsmenn
 *   7. `#view-workshop`        — Verkstæði (header + chrome only;
 *                                 the bespoke flex columns already match)
 *   8. `#view-lanstaeki`       — Lánstæki
 *
 * The `vnav-btn` text labels stay unchanged — only visual.
 * ========================================================================== */
(() => {
  if (window.__bstalViewsPolish250) return;
  window.__bstalViewsPolish250 = true;

  const ID = 'bstal-views-polish-250-css';
  if (document.getElementById(ID)) return;

  // Scope prefix — every selector starts here so non-brunastal themes pass through.
  const P = 'html[data-thm-preset="brunastal"] ';

  // The 8 view ids we target.  Listed once so the rules below stay compact and
  // it's obvious which pages this patch covers.
  const VIEWS = [
    '#view-vorur',
    '#view-income',
    '#view-sala',
    '#view-bokhalds-yfirlit',
    '#view-verkdagbok',
    '#view-taeknimenn',
    '#view-workshop',
    '#view-lanstaeki'
  ];

  // Generate one selector per view: html[data-thm-preset="brunastal"] #view-X <inner>
  const all = (inner) => VIEWS.map(v => P + v + ' ' + inner).join(',\n');

  // ── stylesheet ────────────────────────────────────────────────────────────
  const css = `
/* ============================================================
   §1 — H1 / H2 typography upgrade (Space Grotesk + benchmark size)
   The hand-styled benchmark (Fyrirtæki í Þjónustu) uses Space Grotesk
   600 at ~20px with a muted '._cl_subtitle' below it.  Inline H1s on
   most views use plain system-ui 22px #0f172a.  Match the benchmark.
   ============================================================ */
${all('h1[style]')},
${all('h2[style]')}{
  font-family: 'Playfair Display', Georgia, serif !important;
  font-weight: 700 !important;
  letter-spacing: -.01em !important;
  color: #11141c !important;
  text-shadow: none !important;
}
${all('h1[style]')}{
  font-size: 22px !important;
  line-height: 1.18 !important;
  margin: 0 0 4px 0 !important;
}
${all('h2[style]')}{
  font-size: 17px !important;
  line-height: 1.2 !important;
}

/* The 230 banner already paints a steel-grey backdrop with a dark band
 * at the top; on those views the inline h1 colour (#0f172a) is fine
 * because it lives below the band.  The white-h1 override from 230
 * ("${P}.view h1{color:#fff}") explicitly targets pure h1 elements, but
 * polished views use h1[style] inline.  Re-assert a dark colour here so
 * the title is readable against the light content card. */

/* ============================================================
   §2 — INLINE CARD UPGRADE
   Catches every "background:#fff;border-radius:12px;border:1px solid #f1f5f9"
   style attribute used by sala.js / vorur.js / tekjur.js / 04-verkdagbok.js
   /	11-bokhalds-yfirlit.js etc.  Lifts to the benchmark (radius 16,
   sturdier border, deeper shadow) — without rewriting the markup.
   ============================================================ */
${all('[style*="border-radius:12px"][style*="background:#fff"]')},
${all('[style*="border-radius: 12px"][style*="background:#fff"]')},
${all('[style*="border-radius:12px"][style*="background: #fff"]')},
${all('[style*="border-radius:10px"][style*="background:#fff"]')}{
  border-radius: 16px !important;
  border: 1px solid rgba(20,24,34,.08) !important;
  box-shadow: 0 10px 28px -16px rgba(25,35,60,.18) !important;
}

/* generic "card-ish" wrapper detection — any inline-styled white surface */
${all('div[style*="background:#fff"][style*="box-shadow"]')}{
  background: #fff !important;
  border: 1px solid rgba(20,24,34,.08) !important;
  box-shadow: 0 10px 28px -16px rgba(25,35,60,.18) !important;
}

/* ============================================================
   §3 — KR / NUMBER columns → Space Mono with tabular numerals
   Hits the inline-styled <div>s holding amounts (price, samtals,
   total, "kr") in tekjur.js / sala.js / 11-bokhalds-yfirlit.js.
   ============================================================ */
${all('[class*="kr"]')},
${all('[class*="amount"]')},
${all('[class*="total"]')},
${all('[class*="price"]')},
${all('.mono')}{
  font-family: 'JetBrains Mono', ui-monospace, monospace !important;
  font-variant-numeric: tabular-nums !important;
}

/* table right-aligned cells (amounts column convention) */
${all('table td[align="right"]')},
${all('table td[style*="text-align:right"]')},
${all('table td[style*="text-align: right"]')}{
  font-family: 'JetBrains Mono', ui-monospace, monospace !important;
  font-variant-numeric: tabular-nums !important;
}

/* ============================================================
   §4 — UTILITY BUTTONS (CSV / Excel / Hreinsa / refresh) — flat
   grey rectangles in the source markup → light pill, dark text.
   Catches the patterns in tekjur.js ('background:#f1f5f9;color:#334155')
   and vorur.js / verkdagbok.js.
   ============================================================ */
${all('button[style*="background:#f1f5f9"]')},
${all('button[style*="background: #f1f5f9"]')},
${all('button[style*="background:#f3f4f6"]')},
${all('button[style*="background: #f3f4f6"]')}{
  background: linear-gradient(180deg,#fdfdfe,#e3e7ee) !important;
  color: #11141c !important;
  border: 1px solid rgba(20,24,34,.14) !important;
  border-radius: 11px !important;
  padding: 8px 14px !important;
  font-family: 'IBM Plex Sans', -apple-system, 'Segoe UI', sans-serif !important;
  font-weight: 600 !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.85), 0 1px 2px rgba(20,30,60,.08) !important;
  transition: filter .12s ease, box-shadow .12s ease !important;
}
${all('button[style*="background:#f1f5f9"]:hover')},
${all('button[style*="background: #f1f5f9"]:hover')},
${all('button[style*="background:#f3f4f6"]:hover')},
${all('button[style*="background: #f3f4f6"]:hover')}{
  filter: brightness(.97) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.85), 0 4px 10px -4px rgba(20,30,60,.18) !important;
}

/* Inline-green "+ Ný vara" CTA from vorur.js / tekjur.js / sala.js — keep it
 * a CTA but recolour to the Brunastál accent gradient so it reads as the
 * primary action on the page (matches the benchmark #_ars-new rule in 230). */
${all('button[style*="background:#1a7f4b"]')},
${all('button[style*="background: #1a7f4b"]')},
${all('button[style*="background:#16a34a"]')},
${all('button[style*="background: #16a34a"]')}{
  background: var(--bstal-grad) !important;
  border: 1px solid var(--bstal-ring) !important;
  color: #fff !important;
  border-radius: 11px !important;
  box-shadow: 0 0 16px -4px var(--bstal-glow),
              inset 0 1px 0 rgba(255,255,255,.16) !important;
  text-shadow: 0 1px 1px rgba(0,0,0,.4) !important;
}

/* ============================================================
   §5 — Search box: lift the slim flat input to the benchmark style
   Hits sala.js / vorur.js / tekjur.js / 11-bokhalds-yfirlit.js search
   fields (typed inline as #cbd5e1 borders).

   2026-08-10: the selector below is far broader than "the search box" —
   practically every dynamically-rendered input in this codebase
   carries an inline style attribute, so this rule was also matching the
   POS cart's hand-sized price/discount inputs (.pos-price-edit /
   .pos-disc-edit), ballooning them to a 42px/14px-padded box and clipping
   their digits (verkefnalisti: "numbers don't fit the box", months-old).
   This file's own header already says Sala's cart is patch 230's territory
   ("patch 230 already styles .pos-cart... we polish the rest") — the
   selector just didn't actually honour that. Those two classes are now
   excluded explicitly so this rule can't silently re-claim them again.
   ============================================================ */
${all('input[type="text"][style]:not(.pos-price-edit):not(.pos-disc-edit)')},
${all('input[type="search"][style]')},
${all('input[placeholder*="Leita"]')},
${all('input[placeholder*="🔎"]')}{
  background: #fff !important;
  border: 1.5px solid rgba(20,24,34,.14) !important;
  border-radius: 11px !important;
  padding: 10px 14px !important;
  font: 14px/1.3 'IBM Plex Sans', -apple-system, 'Segoe UI', sans-serif !important;
  color: #11141c !important;
  box-shadow: inset 0 1px 2px rgba(20,30,60,.05) !important;
  outline: none !important;
}
${all('input[type="text"][style]:focus')},
${all('input[type="search"][style]:focus')},
${all('input[placeholder*="Leita"]:focus')},
${all('input[placeholder*="🔎"]:focus')}{
  border-color: var(--bstal-accent) !important;
  box-shadow: 0 0 0 3px var(--bstal-ring) !important;
}

/* ============================================================
   §6 — Tab strips with inline border-bottom underlines
   (vorur.js + bokhalds-yfirlit.js use a bottom-border underline tab)
   ============================================================ */
${all('.vorur-tab')},
${all('[class*="-tab"][style*="border-bottom"]')}{
  font-family: 'IBM Plex Sans', -apple-system, 'Segoe UI', sans-serif !important;
  font-weight: 600 !important;
  color: #5b6573 !important;
}
${all('.vorur-tab[style*="font-weight:700"]')},
${all('.vorur-tab[style*="font-weight: 700"]')}{
  color: #11141c !important;
  border-bottom-color: var(--bstal-accent) !important;
}

/* ============================================================
   §7 — Per-view tiny calibrations
   Things that only need a one-line nudge once the recipes above
   are in place.
   ============================================================ */

/* Vörur — product card border bumped to match benchmark */
${P}#view-vorur .vorur-card{
  border-radius: 14px !important;
  border: 1px solid rgba(20,24,34,.10) !important;
  box-shadow: 0 4px 12px -6px rgba(25,35,60,.10) !important;
  transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease !important;
}
${P}#view-vorur .vorur-card:hover{
  border-color: var(--bstal-ring) !important;
  box-shadow: 0 14px 32px -16px var(--bstal-glow) !important;
  transform: translateY(-2px) !important;
}

/* Vörur — section category headers: cleaner uppercase tracker */
${P}#view-vorur [style*="text-transform:uppercase"][style*="font-weight:800"],
${P}#view-vorur [style*="text-transform: uppercase"][style*="font-weight: 800"]{
  font-family: 'IBM Plex Sans', -apple-system, 'Segoe UI', sans-serif !important;
  font-weight: 700 !important;
  letter-spacing: .06em !important;
  font-size: 12.5px !important;
  color: #5b6573 !important;
}

/* Tekjur — the kr stat in the hero panel needs Space Mono */
${P}#view-income [style*="font-size:22px"][style*="font-weight:700"],
${P}#view-income [style*="font-size: 22px"][style*="font-weight: 700"]{
  font-family: 'JetBrains Mono', ui-monospace, monospace !important;
  font-variant-numeric: tabular-nums !important;
  color: #11141c !important;
}

/* Bókhalds yfirlit — title row & filter strip get the same lift */
${P}#view-bokhalds-yfirlit h1,
${P}#view-bokhalds-yfirlit h2{
  font-family: 'Playfair Display', Georgia, serif !important;
  font-weight: 700 !important;
  color: #11141c !important;
  text-shadow: none !important;
}

/* Verkdagbók — the column headers / labels often have grey 12px inline */
${P}#view-verkdagbok [style*="color:#64748b"],
${P}#view-verkdagbok [style*="color: #64748b"]{
  color: #5b6573 !important;
}

/* Tækni — clamp tech-row card to the benchmark radius */
${P}#view-taeknimenn [style*="border-radius:10px"],
${P}#view-taeknimenn [style*="border-radius: 10px"]{
  border-radius: 14px !important;
}

/* Verkstæði — chrome already metallic via 230; ensure the page-header sub
 * (".bw-page-sub") sits in the right type even when inline-styled */
${P}#view-workshop .bw-page-h1{
  font-family: 'Playfair Display', Georgia, serif !important;
}

/* Lánstæki — its bottom-of-row util buttons share the flat-grey pattern;
 * already caught by §4.  Bump the row hover to match table recipe. */
${P}#view-lanstaeki tr[style*="border-bottom"]:hover{
  background: #f3f6fc !important;
}

/* ============================================================
   §8 — Generic sub-title rule (Listi · 25 / 56 fyrirtæki)
   Bench: 12px muted grey.  Apply to common patterns.
   ============================================================ */
${all('[style*="color:#64748b"][style*="font-size:12px"]')},
${all('[style*="color: #64748b"][style*="font-size: 12px"]')},
${all('[style*="color:#6b7280"][style*="font-size:12px"]')},
${all('[style*="color: #6b7280"][style*="font-size: 12px"]')}{
  color: #5b6573 !important;
  font-family: 'IBM Plex Sans', -apple-system, 'Segoe UI', sans-serif !important;
  font-weight: 500 !important;
  letter-spacing: .01em !important;
}
`;

  const s = document.createElement('style');
  s.id = ID;
  s.textContent = css;
  (document.head || document.documentElement).appendChild(s);

  console.log('[patch-250] views polish (Brunastál) ready — Sala/Vörur/Tekjur/Bókhald/Verkdagbók/Tækni/Verkstæði/Lánstæki');
})();
