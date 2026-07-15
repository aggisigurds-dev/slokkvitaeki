# Rekstrarfélög (v3, accordion) — handoff for Claude Code

> **Result spec, not edit steps.** Open `reference-pages/Rekstrarfelag-detail-v3.dc.html` and mirror it — source of truth. Inline styles; keep data/logic, re-skin markup. Standalone: nothing here depends on other pages.

## What it is
A **collapsible accordion** of rekstrarfélög (operating companies) on one page. Each company = a card: a clickable dark→blue **hero header** that expands to reveal a **buildings table** (one row per húsfélag with a 4-year inspection matrix).

## Layout (top → bottom)
1. **Page header row** — ‹ Til baka (dark-metal), title "Rekstrarfélög" + mono count subtitle, right-aligned search "Leita að félagi…".
2. **Accordion list** — repeat per company:
   - **Hero header** (clickable, toggles open): `linear-gradient(110deg,#0c1018,#13203f 45%,#274a9e)`, building icon tile, company name (19px/700) + mono sub (kt · email), right side: "🏢 N byggingar" pill, red overdue pill if any, and a ⌄ chevron that rotates 180° when open.
   - **Collapsible body** (`max-height` + `opacity` transition): summary chips row (✓ með úttekt / ⚠ vantar / 🔴 liðin — all **dark-metal**) + the buildings table.

## Buildings table (per company)
Dark-metal header `linear-gradient(180deg,#2f333b,#1b1e24 60%,#111318)`, white uppercase labels. Columns: **BYGGING** (name + 📍addr, with colored left rail) · **KENNITALA** (mono) · **TÆKI** (mono, grey if 0) · **2023 · 2024 · 2025 · 2026** (status pills) · **NÆSTA SKOÐUN**.
- **Year pill** = dark-metal by state: done `linear-gradient(145deg,#2f9d63,#0f6e3a 60%,#062815)` w/ green dot `#4fd08a` · hist(blue) `#3a6ae8→#0a1a3a` dot `#8fb0ff` · todo(grey) `#3a3e46→#111318` dot `#cdd4de` · none = faint "·". White text, inset highlight + text-shadow.
- **Row rail** (4px left): red `#e23232` if next-inspection overdue, green `#1f9d57` if any year done, else `#dbe0e9`; brightens blue on hover. Zebra `:nth-child(even) #fbfcfe`.
- **Næsta skoðun**: overdue = red metallic pill "⚠ date", upcoming = mono `#3a4250`, none = "—".

## Tokens
page bg `linear-gradient(180deg,#060607 0,#060607 95px,#aeb4be 360px,#9ba1ad)` · `--metb` dark metal · `--btn-grad` red accent · fonts Space Grotesk (UI) / Space Mono (kt·counts·dates) · cards radius 18px, shadow `0 16px 40px -22px rgba(10,20,50,.65)`.

## Behaviour wired
- Click hero → toggle that company open/closed (accordion; multiple can be open). Chevron rotates, body animates height+opacity.
- Buildings table + year pills are built in the logic class (`buildTable()` via React.createElement) because the runtime's nested `<sc-for>` over a parent-loop item property does **not** bind — flatten or prebuild per-company instead of nesting loops. (This was the v3 fix.)

## Data shape (per building row array)
`[name, addr, kt, taeki, y2025, y2026, nextDate, isOverdue, y2023, y2024]` where each year = `['done'|'hist'|'todo'|'none', count]`.
