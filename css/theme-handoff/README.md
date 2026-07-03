# Refactor handoff — theme.css + page skeletons

Goal: stop re-interpreting the design. **One CSS file of named classes** + **one plain-HTML skeleton per page** that uses only those classes. Same visuals as the current comps, just refactored.

## Files
- `theme.css` — the whole design system as classes (self-contained: it `@import`s the Google fonts; no JS). Drop it in `<head>` once: `<link rel="stylesheet" href="theme.css">`.
- `pages/krofu-yfirlit.skeleton.html` — the first page as class-only markup with `{{PLACEHOLDERS}}`.

## How to use (per page — mechanical)
1. Link `theme.css`.
2. Paste the page skeleton.
3. Replace `{{PLACEHOLDERS}}` with data; repeat the sample `<tr>` per row.
4. Pick the right modifier per cell (see class list below).
5. Wire two behaviours (JS): **click-to-sort** on `th[data-sort]` (copy the script from `reference-pages/Hreyfingarlisti-v2.dc.html`), and **toggle** `.abtn5[data-on]` 0↔1 on click.

## Class cheat-sheet
- Title: `.page-title` (`.page-title__icon`, `h1`, `p`).
- Stat cards: `.stat-card` + `--green | --amber | --red | --hero`.
- Status/tag pills (filled metallic, white text): `.pill` + `--dark-blue | --blue | --green | --dark-green | --gold | --purple`.
  - Convention used in comps: Sala = `--dark-blue`, Kort/Greitt = `--dark-green`, Reikningur = `--blue`, Greitt síðar/Ógreitt = `--gold`, Kredit = `--purple`.
- Soft chips (light tint): `.chip` + `--done | --pending | --overdue | --neutral`.
- Buttons: `.btn` + `--accent | --green | --dark | --light`.
- Action column: `.abtn5` + colour (`--blue --slate --orange --red --green`); `--wide` for the Krafa-send toggle; `data-on="1"` = lit green.
- Controls: `.seg` (view toggle), `.filter-chip` (`.is-active`).
- Table: `.data-table-wrap > .data-table-scroll > table.data-table` (sticky dark header + horizontal scroll already baked in). Header cells `th[data-sort]`; numeric columns get `.num`.
- Dark filter input on the page band: `.field-dark`.

## Start with ONE page
Do `krofu-yfirlit` first. If it lands identical to the comp, every other page is the same recipe — I'll (or you can) generate the remaining skeletons from their reference `.dc.html` the same way.

> Source of truth for exact pixels: `reference-pages/*.dc.html`. `theme.css` is those values pulled into classes — if anything looks off, diff against the reference page.
