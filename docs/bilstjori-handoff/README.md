# Bílstjóri — standalone handoff (this app only)

Self-contained package for the **Bílstjóri** (driver route + company detail) app. Nothing here depends on the rest of the site.

## Files
- `theme.css` — the whole design as reusable classes. Self-contained (Google-font `@import` inlined, no JS). Link it once.
- `bilstjori-list.html` — **route list** skeleton (class-only, `{{placeholders}}`). Repeat the `.stop` block per stop.
- `bilstjori-company.html` — **company detail** skeleton (opens when a stop/company is tapped). Repeat the `.dev` block per device.
- `preview-list.png` / `preview-company.png` — what each should look like.

## How to use
1. Drop `theme.css` in and `<link>` it.
2. Replace your markup with the skeleton; swap `{{...}}` for data.
3. State classes to toggle at runtime:
   - stop finished → add `is-done` to `.act--done` (label → "✓ Búið") and `is-done` to `.stop`; set rail/badge/pin to the `--done` variant; recompute progress bar + "n af total".
   - device checked → add `is-done` to `.chk` (label → "✓ Skoðað"); update "Yfirfarin n/total".
   - aksturslisti choice → move `is-active` between `.seg__btn`.

## Tokens (already in theme.css `:root`)
page `--page` dark-grey gradient · `--metb` dark metal (bars/dark buttons) · `--btn-grad` red accent · `--green` done · pills overdue/pending/done · fonts Space Grotesk (UI) + Space Mono (kt/serial/counts).

## Behaviour to wire (dev)
Tap stop → open detail · ✓/◍ toggles done + live counters/progress · map pin number ⇄ list badge in sync, color follows state · ↗ Maps deep-link, 📞 tel:, route CTA orders stops.

That's the full app — no other pages needed.
