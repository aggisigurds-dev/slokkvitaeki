# BACKLOG

Open issues observed during the patch-master.js split + first clean deploy
(2026-05-03). Listed roughly low-to-high effort.

---

## 1. Phantom JS files in `/js/` returning 3.4 KB HTML 404 stubs ✅ FIXED

`print.js`, `counter.js`, `workshop.js`, `field.js`, `app.js` were
referenced in the old index.html. The project's current `index.html` does
not reference any of these files — already removed.

## 2. `_markers is not defined` in `newfeatures.js` ✅ FIXED

`js/newfeatures.js:40` now uses
`if(typeof window._slokk_markers==='function')window._slokk_markers();`
— bare `_markers` fallback removed.

## 3. `manifest.json` and `favicon.ico` return 404 on the live site ✅ FIXED

`manifest.json` exists in the project root with inline SVG icons.
`index.html` has an inline `<link rel="icon" href="data:image/svg+xml,…">` —
no external favicon file needed.

## 4. Malformed SVG path in `pos.js` ✅ FIXED

`js/pos.js:18` cart icon path corrected to
`d="M3 4h2l2.5 11h11l2.5-7H6"`.

## 5. Hardcoded Netlify token in `deploy.js` ✅ FIXED

`deploy.js` requires `NETLIFY_TOKEN` env var and exits with a clear error
if missing. Only `NETLIFY_SITE` (non-secret site ID) has a default.

## 6. Supabase `GoTrueClient` double-init warning ✅ FIXED

`js/patches/03-vidsk-revamp.js` and `js/patches/04-verkdagbok.js` were
evaluating `supabase.createClient()` eagerly at script-load time (before
`DB.init()` runs). Converted to a lazy `getSB()` arrow function so the
canonical `window.DB.sb` is always used at call-time. All `SB.from()`
calls updated to `getSB().from()`.

## 7. Deprecated `apple-mobile-web-app-capable` meta tag ✅ FIXED

Removed from `index.html`. The standard `mobile-web-app-capable` remains.

## 8. `.claude/` leak from earlier deploy ✅ FIXED (recorded only)

`.claude` added to `SKIP_DIRS` in `deploy.js`. Follow-up deploy removed
the file from the active Netlify manifest.

---

All known backlog items resolved as of 2026-05-03.

---

# Open requests (2026-05-09)

User-reported items, to be addressed after Phase B (solur drög/final). Listed
in roughly increasing effort.

## F-1. CO₂ 100gr — +/− buttons overlap price slightly

POS product card for CO₂ 100gr: the qty +/− buttons sit on top of the price
text. CSS-only fix in the product card layout.

## F-5. Show discount amount visibly in cart

Currently the cart shows the post-discount total but doesn't surface the
discount amount itself. User wants to see the kr-value of the discount on
the cart so they can sanity-check before finalizing.

## F-7. „Tilboðsverð" window in company profile — recolor yellow → blueish

In a company's detail page, the new Tilboðsverð (price-list) window is
yellow. User wants it blue/blueish to match the rest of the UI.

## F-3. „Bókhald" button on Sala page — lower half stuck on „Hleður…"

Clicking the Bókhald button in the Sala (POS) page opens a panel whose
lower half never finishes loading. Needs investigation — likely a query
failure or render-after-empty bug.

## F-4. Reikningar tab on front page only shows one reikningur

The Reikningar tab on the front page is showing only a single invoice
when there should be many more. Likely a broken filter, broken query, or
a regression. Needs investigation.

## F-2. Wire up Kreditreikningur (credit invoice) feature properly

Patch 26 (`26-credit-invoice.js`) exists but isn't reachable from the
right place. User wants the Kredit action to be invocable from either
the Bókhalds yfirlit page OR the Sala (POS) page. Bigger task — needs
UI placement decision + wiring.

---

# Open requests (2026-05-29) — batch H8jvj

User-reported items collected in one session. Being addressed together on
branch `claude/determined-pasteur-H8jvj`.

- [ ] **1. Sala — rename "+ Eigin" → "+ Annað".** Cart "add custom line"
  button (`js/pos.js:331`, id `pos-add-service`). Pure label change.

- [ ] **2. `/api/*` functions return 404.** `/api/geocode`, `/api/kt-lookup`,
  `/api/email-send` all 404 on the live site (console flooded with geocode
  404s from `156-geocode-prewarm.js`). Functions exist under
  `netlify/functions/` but there is no `_redirects` / `netlify.toml` mapping
  `/api/*` → `/.netlify/functions/:splat`. Add the redirect.

- [ ] **3. Search/cache drift across computers.** Scripts are cache-busted
  with hand-written `?v=` strings; when a file changes without a bump, browsers
  serve stale copies → pages differ per machine. Move to automatic
  cache-busting (and/or a `_headers`/`netlify.toml` cache policy).

- [ ] **4. Checkout — remove "🏷️ Prenta strikamerki fyrir tæki".** Delete the
  `scd-barcodes` checkbox (`js/patches/07-sala-checkout-dialog.js:253-254`);
  the 54×17 mm format doesn't work. Keep the QR-merki (24×100 mm) option.

- [ ] **5. Create-customer dialog — add RSK kennitala lookup/auto-fill.** Wire
  the existing `19-kennitala-lookup.js` logic into the shared new-customer
  dialog (`114-unified-pos-search.js` `openNewCustomerDialog`) so nafn /
  heimilisfang / sími auto-fill from the kennitala. Test kt: `440169-4659`.

- [ ] **6. "Mörg tæki" — Stærð should be a dropdown.** Bulk-add dialog
  (`js/patches/73-bulk-add-units.js:48`, `_ba_size`) uses a free-text input;
  switch to a `<select>` matching the main view's size options
  (`js/scanmode.js`: 6kg / 9kg / 5kg / 12kg / 3kg / 9L).

- [ ] **7. Fyrirtækjaþjónusta — "Ónýtt" can't be reverted to Virkt.** Patch 103
  `toggleScrap` decides direction from possibly-stale cached status; the
  existing `176-fix-onytt-revert.js` is a brittle workaround (timed repaints +
  a `window.unscrap()` console-only escape hatch). Fix properly: read truth
  from DB before toggling so revert works first time, in the UI.

- [ ] **8. Allir viðskiptavinir — add "+ Nýr viðskiptavinur" button.** The
  master list (`157-allir-vidskiptavinir.js`) has no create entry point. Add a
  toolbar button that opens the shared (RSK-enabled, #5) create dialog.

- [ ] **9. Search term persists across hard refresh.** Search box keeps its
  value because it's saved to localStorage and restored on load — in
  `157-allir-vidskiptavinir.js` (key `allir_vidsk_search`) and
  `153-arsskodun.js` (key `arsskodun_search`). Stop persisting/restoring the
  search term (init empty per view entry) and clear the stale keys.

- [ ] **10. Tilboðsverð / Sérkjör — restyle into one cohesive card.** Currently
  renders as two separate boxes (list + dashed input form), confusing. Unify
  into a single styled card with the input **above** the summary/list. Apply to
  both `113-company-pricing.js` (💰 Tilboðsverð, fyrirtæki) and
  `116-vidsk-pricing.js` (💎 Sérkjör, viðskiptavinir) for consistency.

- [ ] **11. Kreditreikningur print preview empty on first print.** Crediting in
  Bókhaldsyfirlit opens a blank print preview the first time; reprinting from
  the row works. Root cause: `printCreditNote` (`26-credit-invoice.js:255`)
  calls `SalaInvoice.render(win, opts)`, but `render()` reads line items from
  the live `POS.getState()` cart (empty here) and ignores `opts.lines` — it
  even logs "no lines in POS state" and bails. Fix: use
  `SalaInvoice.renderFromSale(win, creditSale, …)` (the path the working
  reprint uses) so the credit note renders from its own data.

**Deploy note:** this sandbox can't reach `api.netlify.com` directly (network
allowlist) and the Netlify MCP is intermittently 502-ing, so changes ship via
git/PR; deploy to Netlify happens separately after merge.
