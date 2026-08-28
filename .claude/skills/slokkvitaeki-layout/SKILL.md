---
name: slokkvitaeki-layout
description: Layout, CSS and responsive rules specific to the Slokkvitaeki app. Use BEFORE writing any CSS, media query, or layout change in this repo - including mobile/desktop adjustments, sidebar/nav work, table layout, spacing, or theming. Explains why stylesheet !important silently fails here and what to use instead.
---

# Slokkvitaeki layout rules

Read this before touching any CSS or layout in this repo. The app has a
non-obvious override architecture; generic responsive advice produces changes
that appear correct in the file and do nothing in the browser.

## 1. The override hierarchy (most important section)

CSS in `css/*.css` is the WEAKEST layer, even with `!important`.

Load order in `index.html`:

1. `css/app.css`        (3688 lines - the bulk)
2. `css/mobile.css`     (224 lines - `max-width:900px` overrides)
3. `css/theme-scoped.css`
4. Two inline `<style>` blocks
5. **325 `<script>` tags**, ~286 of them in `js/patches/`

Several patches set styles at runtime with:

```js
el.style.setProperty('padding-top', '86px', 'important');
```

An inline style with `!important` beats ANY stylesheet rule, including a
stylesheet rule marked `!important`. There are **33 such call sites across 8
files**. This is the real reason `!important` "doesn't work" in this repo -
it is not a specificity problem, it is a cascade-origin problem.

Files that set inline `!important`:

- `js/mobilenav.js`
- `js/patches/212-langbtn-dock.js`
- `js/patches/231-verkbord.js`
- `js/patches/262-sidebar-polish.js`
- `js/patches/281-nytt-badge.js`
- `js/patches/313-contrast-clarity.js`
- `js/patches/314-simi-compact-layer.js`
- `js/patches/323-stilla-utlit-kort.js`

### Viewmode is a user setting, NOT a media query

`<html data-viewmode="...">` drives most layout. Three values, matching the
user-facing toggle **Simi / Tafla / Skjar**:

| value | toggle | meaning |
| --- | --- | --- |
| `mobile` | Simi | phone layout (51 rule sites - by far the most) |
| `table` | Tafla | dense table layout (9 sites) |
| `desktop` | Skjar | wide layout (1 site) |

Resolved by `getViewMode()` (defined in patches 147, 166, 167):

```js
if (inAppMode()) return 'mobile';                 // installed app: ALWAYS mobile
const m = document.documentElement.dataset.viewmode;
return VM_MODES.indexOf(m) >= 0 ? m : 'desktop';  // else saved choice, default desktop
```

Consequences:

- **Viewport width does not decide the layout - this attribute does.** A 1280px
  desktop browser can be showing the phone layout, and regularly is.
- In **installed app mode the value is forced to `mobile`**, ignoring both screen
  size and the saved preference.
- Otherwise it comes from `localStorage`. A past bug: Chrome "desktop site" saved
  `desktop` on a phone, producing white nav text and clipped columns.
- **Test all three modes**, not just narrow/wide viewport. Resizing the browser
  alone does not exercise `table` or `desktop`.

Set it directly when testing:

```js
document.documentElement.dataset.viewmode = 'table';
```

**These rules live in JS-injected stylesheets, not in `css/*.css`** -
`data-viewmode` appears 0 times in all three CSS files. Grep `js/` for it.

### Specificity: the fake-id idiom

Where CSS *can* win, plain `!important` still often loses, because the compact
layers carry an extra id/attribute/class, e.g.:

```css
html[data-viewmode="mobile"] #bstal-banner { ... }
body.appmode #view-arsskodun ._ars-statgrid > div { ... }
```

A plain `#id` rule loses to those. `css/mobile.css` deliberately pads
specificity with fake ids:

```css
.thing:not(#_a):not(#_b):not(#_c):not(#_d) { ... }   /* = 4 ids */
```

**This is the house style, not a hack.** Doubling an id (`#view-x#view-x`) or
adding `:not(#_pN)` is the accepted way to out-specify. Match the idiom.

### How to actually override something

Before writing CSS, check whether a patch already owns the property:

```bash
grep -rn "setProperty('<property>'" js/
```

- **If no patch owns it** - normal CSS works. Put it in the right file (see 2).
- **If a patch owns it** - CSS cannot win. Either edit that patch, or add a new
  patch that runs later (higher number = later in `index.html`).

### Designated hooks - prefer these over fighting the cascade

- `window.__peBannerPad` - top padding for `.view`. `mobilenav.js` stamps
  `padding-top` inline with `!important`; the value comes from this global
  (unset = `86px`). `314-simi-compact-layer.js` uses `48px` in app mode.
  `pinPad()` in patch 314 and `mobilenav.js` **re-assert it on mutation**, so
  `padding-top` on `.view` cannot be won from CSS at all. Set the global; do NOT
  write a `.view{padding-top:...}` rule.

## 2. Which file to edit

| Change | File |
| --- | --- |
| Desktop / base styles | `css/app.css` |
| Mobile-only (<=900px) | `css/mobile.css` |
| Theme-scoped colors | `css/theme-scoped.css` |
| Anything a patch owns | the patch in `js/patches/` |

`dist/js/` is a **stale mirror** of `js/` (both 286 files). `index.html` loads
`/js/`, never `/dist/`. Never edit `dist/` - the change will not take effect.

## 3. Breakpoints

Existing usage, by frequency:

- **900px** (5 uses) - **the primary breakpoint.** Sidebar becomes a slide-in
  drawer, `.view` goes full-width. `css/mobile.css` is built entirely around it.
- 768px (3 uses) - tablet adjustments
- 480px / 481px (1 each) - a min/max pair
- 420px - small phone

**Use 900px unless there is a specific reason.** Do not introduce new
breakpoints; add to an existing block instead. If a new one is genuinely
needed, say so explicitly rather than adding it silently.

## 4. The theme is FROZEN

Brunastal + red is the only supported look. The theme switcher was deliberately
removed. Do not add theme toggles, alternate palettes, or a dark mode.

Always use tokens, never raw hex:

```
--brand: #C93C1D    --brand-dk: #a83018   --brand-lt: #fff0ed
--sidebar-bg: #1a1f2e
--bg: #f5f5f7       --bg2/#--surface: #ffffff
--ink1: #0f1117     --ink2: #404550   --ink3: #525b6b   --ink4: #626b7a
--brd: #e4e6ea      --brd2: #d0d4da   --hairline: #bcc3cc
--grn: #1a7f4b      --amb: #b45309    --blu: #1d4ed8
```

There is a known past incident: a div-chain rule in the style editor produced
white-on-white text. A safety valve exists in AppSettings. Be careful with
inherited `color` on nested containers.

## 5. Mobile nav mechanics

- `.mobile-nav-toggle` is `display:none` on desktop, `flex` below 900px.
- `.topbar` becomes `position:fixed`, 260px wide, `translateX(-100%)`.
- `body.mobile-nav-open` slides it in and adds a `::before` backdrop.
- Below 900px `app.css` centres `.vnav-btn` for an icon rail; `mobile.css`
  re-left-aligns them when the drawer is open. If you touch `.vnav-btn`,
  check BOTH rules or labels will scatter.

## 6. Constraints

- **No build step.** No React, Vite, Tailwind, or PostCSS. Plain HTML/CSS/JS.
- Modern CSS is available but currently unused: **no `@layer`, no
  `@container`.** Introducing them is fine but is a new pattern - flag it.
- Cache-busting is manual: bump `?v=` in `index.html` when changing a CSS file.

## 7. Verify before claiming done

A CSS edit here is not proof of anything. Confirm in the browser:

1. `preview_start` with `slokkvitaeki-dev` (`.claude/launch.json`, port 5599)
2. `resize_window` to mobile (375) and desktop
3. Read computed styles with `javascript_tool` - `getComputedStyle` - to confirm
   the value actually applied and was not stamped over by a patch.

If a change does not take effect, re-read section 1 before adding `!important`.
