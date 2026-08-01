---
name: thema
description: theme.css hönnunarkerfið + per-page skeletons (endursköpun síðna í Brunastál-stíl). Notaðu þegar síða er endurhönnuð eða skinnuð.
tools: Bash, Read, Grep, Glob, Edit
---

Þú kannt **þemað** — class-based theme.css, scoped undir `.thm`. GILDRA: patch 245 (Brunastál) berst við theme.css (whitear `[class*=-card]`) — þarf hærri sérhæfni.


---

# 📚 Þekkingargrunnur — ÓBREYTTUR texti úr CLAUDE.md

> Fluttur hingað 2026-08-01 við uppskiptingu CLAUDE.md (~15k tokens hlóðust í HVERRI
> lotu). Engu breytt, engu sleppt — hleðst aðeins þegar þessi sérfræðingur er kallaður.

## Theme refactor — `theme.css` + per-page skeletons (IN PROGRESS, 2026-07-03)

Re-skinning pages to Agnar's class-based design system, replacing an earlier
mistaken pass where I invented a dark metallic "title BAR" that is **not** in the
comps (it caused black-on-black regressions). The correct look = plain title on a
dark→grey page band, metallic 3D stat cards, filled pills, dark-header data table.

- **Source of truth:** `css/theme-handoff/` — `theme.css` (the whole system as
  named classes), `README.md` (recipe + class cheat-sheet), and per-page
  `*.skeleton.html` (class-only markup with `{{PLACEHOLDERS}}`). Full pixel
  reference = `brunaholf-theme-handoff/reference-pages/*.dc.html` (in the v3 zip
  Agnar uploaded; extracted copy under scratchpad). Ask Agnar (via Claude design)
  for a new page's skeleton — he generates them.
- **Scoping (critical):** do NOT load `theme.css` globally — its class names
  (`.btn` 75 files, `.pill` 12, `.chip` 19, …) collide with the app. Instead
  `css/theme-scoped.css` = `theme.css` auto-prefixed under `.thm` (regenerate from
  theme.css with the prefix transform; keep the `@import`/`:root` global). Linked
  once in `index.html <head>`. Each rebuilt page wraps its content in
  `<div class="thm"><div class="app-page"><main class="app-main">…`.
- **Per-page recipe (mechanical):** keep the patch's data/logic + every event-hook
  class (`._hr-*` etc.); replace ONLY the render markup with the skeleton's theme
  classes. Title `.page-title` (plain, white, on the band — NO boxed bar). Cards
  `.stat-card`(+`--green/amber/red/hero`). `.pill--*`, `.chip--*`, `.btn--*`,
  actions `.abtn5`, table `.data-table-wrap>.data-table-scroll>table.data-table`.
  Reset the view so the band shows: `#view-X{padding:0!important;background:transparent!important}`.
  Bump the `?v=` on BOTH `theme-scoped.css` and the edited patch in index.html.
- **GOTCHA — patch 245 (Brunastál content-skin) fights theme.css.** It paints
  `.view .stat-card`, `.view input`, and `.view [class*="-card"]{background:#fff!important}`.
  That **substring** selector matches `stat-card__value`/`__label` (they contain
  "-card") and whitens them → an invisible "white box" (this is the "two
  backgrounds" Agnar flagged). Fix = higher-specificity overrides in
  theme-scoped.css: `.thm .app-page .stat-card .stat-card__value{background:transparent!important;border:0!important}`
  and the hero card `.thm .app-page .stat-card.stat-card--hero{background:<blue>!important}`.
- **Gradient (Agnar 2026-07-03):** `.app-page` holds dark longer + darker —
  `linear-gradient(180deg,#060607 0px,#060607 240px,#8e949e 660px,#9198a3 100%)`
  (in both `theme.css` and `theme-scoped.css`).
- **Verify:** render skeleton+theme.css standalone (fill placeholders) = the
  target; screenshot the live preview with Playwright and compare. Navigate via a
  **sidebar `.vnav-btn` click** (board/ledger pages don't render via
  `App.switchView` alone). Chromium `/opt/pw-browsers/chromium-1194`,
  `--no-sandbox --ignore-certificate-errors`, `proxy:{server:HTTPS_PROXY}`,
  `localStorage slokk_theme={preset:'brunastal'}`, `waitUntil:'load'`.
- **Done:** Hreyfingarlisti (patch 167) fully on theme.css ✓. ÞjónustuVerkstæði
  (patch 190) header → plain title + coloured stat **pills** (matches its comp) ✓.
  Kröfu yfirlit (#166, 2026-07-09) — chrome on theme.css: `.thm .app-page`
  wrapper (also around loading/error states), `.page-title` + `__tools` (month
  nav/sort/search keep their `.ky-navbtn` Brunastál overrides), `.stat-row` with
  4 `.stat-card` (hero/amber/green), view-filter buttons → `.filter-chip`; the
  grouped-by-company cards + kyAbtn action rows + bulk bar kept UNTOUCHED
  (money-critical, heavily iterated — v5 lesson) ✓.
- **Also done (2026-07-09):** Vörur (core `js/vorur.js` — page-title band,
  tabs → `.filter-chip`, category headers as dark translucent pills so they read
  on both the dark and grey parts of the band), Tekjur (`js/tekjur.js` —
  page-title + 4 `.stat-card`), Allir viðskiptavinir (157 — page-title band,
  counts line in `<p>` with light accents). Each injects its own
  `#view-X{padding:0;background:transparent}` reset style.
- **Skipped on purpose:** Rekstrarfélög (175) — it has its OWN dark design
  (`html[data-thm-dark]` view-background + `.rf-card` rules) integrated with the
  theme presets; wrapping it in the `.thm` band would fight that. Convert only
  together with a redesign of that page.
- **Next:** Fyrirtæki í Þjónustu (153) + remaining pages, one per skeleton.
- **Cleanup DONE (2026-07-09, #322):** the wrong dark title BARs #260 stamped
  onto Vörur/Tekjur/Allir/Rekstrarfélög/Bókhald were replaced with plain
  theme-token titles (var(--ink1)/var(--ink3)), and `260-global-titlebar.js`
  (which prepended the bar to every other Brunastál view, incl. Fyrirtæki í
  Þjónustu) is hibernated — script tag commented out like 152. The proper
  theme.css conversion still proceeds page by page as above.

