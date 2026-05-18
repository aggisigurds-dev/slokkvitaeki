# Morning Status — 2026-05-18

Last update: ~04:30 AM, just before sleep. Wake-up check scheduled for 07:03.

## What shipped overnight (10 commits, all pushed to origin/master)

**Foundation work:**
- 👥 **Allir Viðskiptavinir** master list — every company in one place with service badges, filter chips, search, sort (5 options), card/list toggle
- 📋 **Unified customer detail page** — opens when you click a card. Shows base info + Fyrirtækjaþjónustu card + Brunakerfi card + unit table + Athugasemdir. One place for everything per customer.
- 🔥/🚨 **Subscribe / unsubscribe toggles** — both on cards and inside detail page. Writes to AppSettings. Customer flows into the right service workspace immediately.
- ✓ **Klára heimsókn one-click button** on contract-customer detail pages. Bulk-updates all units' inspection dates +12 months, opens Úttektarskýrsla pre-filled. The main UX win to show drivers tomorrow.

**Data infrastructure:**
- 🗄️ **Shared Supabase geocode cache** — server-side table all PCs read/write. Fresh browsers now fill 100+ pins in ~10 seconds (no more 7-min wait).
- 🗺️ **Map only shows contract holders** — non-contract walk-in records no longer pollute the map.
- 📍 **Pre-warm runs in background** at 1.5s per address, priority by current-month.

**Polish & fixes:**
- 🧯 Last-view memory (refresh lands where you left off, not Sala)
- 🚨 Brunakerfi count fix (header now shows 22, not 23 — was counting null-set entries)
- 🔍 Search fixed (was matching everything when no digits in query)
- 🧹 Null entries cleaned from arsskodun/brunakerfi maps (id 501 leftover)
- ⚠️ **Data quality banner** — Ársskoðun and Allir Viðskiptavinir show "8 samningshafar without address" with click-through to fix each one

## What to watch for this morning

1. **Drivers using the system on real customers** — show them the green `✓ Klára heimsókn` button. If they hate one specific thing, we polish that piece next.

2. **The 8 contracts with no address** — fix them today if you can; data-quality banner will guide you to each one in <30 seconds.

3. **Map pin count** — should be visibly more than yesterday because shared cache filled overnight. Open Fyrirtæki í Þjónustu → Sýna kort to confirm.

4. **The 41 orphan unit-clients in `uttaeki`** — known issue, not fixed. If a driver says "I can't find customer X", that may be why. Document orphan names as you encounter them.

## Suggested first action

Open https://slokkvitaeki.netlify.app/ → click **👥 Allir Viðskiptavinir** in the sidebar → take a tour of the new layout. Click into Center Hótel Plaza (or any customer). See the green Klára heimsókn button. That's the new daily workflow surface.

Show one driver this flow before they leave. If they nod, you've won the paper-vs-system argument.

## Memory updates

- New: `memory/qa_checklist.md` — 15-min sweep + stress points to watch
- Updated: `memory/MEMORY.md` index

---

*This file regenerates each session — feel free to delete after reading.*
