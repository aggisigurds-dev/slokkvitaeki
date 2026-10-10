---
name: slokkvitaeki-layout
description: Layout, CSS and responsive rules specific to the Slokkvitaeki app. Use BEFORE writing any CSS, media query, or layout change in this repo - including mobile/desktop adjustments, sidebar/nav work, table layout, spacing, or theming. Explains why stylesheet !important silently fails here and what to use instead. Kveikjuorð: layout, CSS, media query, sími, mobile, grind, !important, sidebar. Útlit án grindar → joker.
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

**But none of these fire on Agnar's phone** (980 px desktop-site layout) - for
the phone/app use `data-viewmode` (§1) or a container query (§9).

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

## 6. Scroll containers - one per axis

Fixed 2026-08-28 by `js/patches/325-table-single-scroller.js`. Read this before
touching any `overflow` in this repo.

### The wildcard ("joker") hazard

`css/mobile.css:66` reads:

```css
.view table, .view .tbl, .view [class*="table"]{ overflow-x:auto !important; }
```

`[class*="table"]` is a **substring wildcard**. It was meant for the `<table>`,
but it also matches every wrapper whose class contains the letters `table`:

- `.data-table-scroll`
- `.data-table-wrap`
- `._ars-tblscroll` (via its second class `data-table-scroll`)

So three nested elements all became scroll containers where one was intended.

**Never write `[class*="..."]` here.** The class vocabulary in this repo is full
of compound names (`data-table-wrap`, `data-table-scroll`, `_ars-tblscroll`),
so a substring match nearly always catches more than you mean. Name the
elements explicitly.

### The symptom to recognise

Nested horizontal scrollers feel like this to the user: *"it scrolls, stops at
the same spot, and I have to swipe again to keep going."* The inner box consumes
the gesture, hits its end, and momentum dies; the outer box needs a fresh touch.

Measured on the arsskodun table at 980px before the fix:

| element | scrolls |
| --- | --- |
| `table.data-table` | 117px - gesture dies here |
| `div._ars-tblscroll` | 390px - needs a new gesture |

By viewmode: `mobile` 0 scrollers, `table` 1, `desktop` **2**. Only Skjar broke.

### The rule

**The wrapper scrolls. The `<table>` never does.** A `<table>` is content, not
a viewport. When you need a wide table to scroll, put `overflow-x:auto` on the
wrapper and leave the table `display:table; overflow:visible`.

To check any view for this:

```js
let el = document.querySelector('YOUR_TABLE'), n = 0;
while (el && el !== document.documentElement) {
  const cs = getComputedStyle(el);
  if (/auto|scroll/.test(cs.overflowX) && el.scrollWidth - el.clientWidth > 1) n++;
  el = el.parentElement;
}
n; // must be 0 or 1. 2+ is the bug.
```

Also verify nothing is unreachable: `wrapper.scrollWidth >= table.scrollWidth`.
Before the fix, at 412px in Simi mode the table was 653px but only 338px was
reachable through the wrapper - content that could never be read. Same class of
bug as 2026-07-30 (see `245-brunastal-content-skin.js:145`).

### `overflow-x:visible` does not do what you think

Per the CSS spec, if `overflow-y` is anything other than `visible`, then
`overflow-x:visible` **computes to `auto`** - silently creating the very scroll
container you were trying to remove.

The wrappers here carry `overflow-y:hidden` (patch 245 keeps the rounded
corners), so `overflow-x:visible` is a no-op on them. Verified by probe.

**Use `overflow-x:clip`** to un-make a scroll container while `overflow-y`
stays `hidden`. It coexists with `hidden` and never creates a scroll box.
Browsers without `clip` drop the declaration and keep the previous behaviour -
a safe degradation, so no `@supports` guard is needed.

### `:has()` belongs in its own rule block

An unparseable selector invalidates the **entire** selector list it appears in.
Patch 325 therefore keeps its `:has()` de-nesting rule in a separate `<style>`
element from the core rules, so an old browser loses only the defensive rule.
`:has()` is otherwise unused in this repo - it is a new pattern here, so flag it
if you add more.

## 7. Constraints

- **No build step.** No React, Vite, Tailwind, or PostCSS. Plain HTML/CSS/JS.
- No `@layer`. **`@container` IS in use since 2026-10** (419, 356, 402, 167,
  143) - it is the only way to get a narrow layout on the real phone, see §9.
- Cache-busting is manual: bump `?v=` in `index.html` when changing a CSS file.

## 8. Verify before claiming done

A CSS edit here is not proof of anything. Confirm in the browser:

1. `preview_start` with `slokkvitaeki-dev` (`.claude/launch.json`, port 5599)
2. `resize_window` to mobile (375) and desktop
3. Read computed styles with `javascript_tool` - `getComputedStyle` - to confirm
   the value actually applied and was not stamped over by a patch.

If a change does not take effect, re-read section 1 before adding `!important`.

## 9. The phone is 980 px wide - use container queries, not media queries

Measured 2026-10-04/05 on Agnar's Samsung S26:

- The S26 runs Chrome in **desktop-site mode**, and since 2026-10-05 the app
  asks for it itself (inline `<head>` script in `index.html` sets viewport
  `width=980` + `window.__HUB_VP` on touch phones in app mode). The layout
  viewport is therefore ~980 px: **`@media (max-width: 900px)` - and every
  other breakpoint in §3 - NEVER fires on the real phone.** `data-viewmode`
  still resolves to `mobile` in app mode, so §1's viewmode rules do apply.
- For a narrow layout inside a page, make the page root a container and
  query it:

  ```css
  #view-x .x-root { container-type: inline-size; container-name: x; }
  @container x (max-width: 640px) { #view-x .x-kpi { grid-template-columns: repeat(2, 1fr); } }
  ```

  In use: `js/patches/419-kostnadur.js`, `js/patches/356-arsgrind-simi.js`,
  `js/patches/402-brunastal-fyrirtaekjasida.js`,
  `js/patches/167-hreyfingarlisti.js` (`hl2`), `js/patches/143-drog-list.js` (`dr2`).
  A container cannot style itself - put the rule on its descendants.
- App mode zooms the page: `.view.active { zoom: var(--app-page-zoom) }`
  (`js/patches/333-app-page-zoom.js`, per-page sizes). Anything appended to
  `<body>` is **not** zoomed - see §10.4.
- Simulate in the preview: viewport 980x1900 +
  `/?app=fjarmal&simikrom=2.38`, then `App.switchView('<page>')`. Deep links
  in app mode land on the app's start page, and pages that are not in the app
  (e.g. `drog` outside Fjármál) are refused - test those at 980 px without
  `?app=`.

## 10. Building a new page in Brunastál C - five traps (measured 2026-10-05)

Hreyfingarlisti (167) and Drög (143) were rebuilt on 2026-10-05; every one of
these cost a round trip. Read them before writing the CSS.
Wiring a brand-new page (create `view-<key>` at boot, sidebar group and
`sidebar_order`, app page list, audits that guard flags and localStorage) is a
separate checklist: agent `bord-flettur`, entry 08.10.2026.

1. **The 313 contrast scanner writes inline `color:#fff !important`** (marked
   `data-cc313`) on text it believes sits on a dark surface. It misread silver
   chips as dark and whitened their counters - and inline `!important` beats
   every stylesheet. A page that owns its contrast goes into `SKIP_CLOSEST` in
   `js/patches/313-contrast-clarity.js` (now `#view-hreyfingarlisti .hl2,
   #view-drog .dr2`). Symptom check:
   `document.querySelectorAll('#view-x [data-cc313]').length` must be 0.
2. **`small { color: #3a4250 !important }`** (bstal-polish stylesheet) beats
   any `<small>` badge colour that lacks `!important` - the red "Útrunnið"
   chip in `js/patches/122-samningshafar-receive.js` showed dark text on red.
   Every coloured `<small>` badge carries `color: ... !important`.
3. **App-mode inflation**: `js/patches/261-app-profiles.js` +
   `js/patches/314-simi-compact-layer.js` stamp buttons to ~50 px and
   inputs/selects to 52 px / 16-18 px with `!important`. Every button/input/
   select rule of a new page carries a four-id chain
   `:not(#_xA):not(#_xB):not(#_xC):not(#_xD)` (§1 idiom) **and** `!important`
   on height, min-height, min-width, width, margin, padding and font.
4. **Popovers belong in `<body>`** (`position: fixed`) so the table's scroll
   box does not clip them - but then they are not page-zoomed. Give them
   `body.appmode .pop, html[data-viewmode="mobile"] .pop { zoom: var(--app-krom-zoom, 1) }`
   and divide the computed viewport position by the popover's own zoom:
   `el.style.left = left / (parseFloat(getComputedStyle(el).zoom) || 1) + 'px'`.
   Close on outside `mousedown`/`touchstart` (capture), `scroll` (capture),
   `resize` and Escape (return focus to the opener); every re-render of the
   list closes it first. Reference: `opnaValmynd()` in 167, `opnaVal()` in 143.
5. **Legacy selectors follow old class names.** 313, 315 and 337 style
   `.page-title`, `.stat-card`, `.filter-chip`, `.filter-row`, `.hl-mcard`,
   `.abtn5` under `#view-...` (337 turns `.filter-chip` into 46x42 columns).
   Give the new look a fresh prefix (`hl2-`, `dr2-`) and keep only the *hook*
   classes and ids the JS binds to (`_hr-*`, `#_drog-q`, `data-act`) - grep
   that no stylesheet targets them before reusing.

Also: re-render lists through `Stodugt.vernda(rot)`
(`js/patches/388-stodugt-vidmot.js`) so scroll, focus and selection survive;
draw icons as inline stroke SVG - the arrows `▲ ▼ ↕` render as emoji on
Android; and measure the DOM: 962 rows in the new markup were 42,040
elements, so long lists draw 150 at a time ("Sýna fleiri").

**Testing clicks without writing to PROD** (the preview talks to the live
database): temporarily replace the write entry points with recorders, click
everything, then restore -

```js
const calls = [], o1 = SaleEditor.openById, o2 = Confirm.show;
SaleEditor.openById = id => calls.push('open:' + id);
Confirm.show = async () => { calls.push('confirm'); return false; };
try { /* click ticket, Klára, menu items ... */ } finally { SaleEditor.openById = o1; Confirm.show = o2; }
```
