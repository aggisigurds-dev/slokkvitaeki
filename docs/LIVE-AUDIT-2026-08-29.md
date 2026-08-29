# Full audit of slokkvitaeki.netlify.app

_Read-only. Measured 2026-08-29 against live production (`b460807`, deployed 18:07 UTC) and Supabase project `osfdzskyvisifcwyjkuk`. Nothing was patched. Do not treat this as a license to enable RLS in bulk or to set `EDGE_SHARED_KEY` without a preview._

## Verdict

The site is up. The safety net holds. The database is still wide open.

| Layer | Status | One-line |
|---|---|---|
| Live HTML + POS + Ársskoðun | GREEN | HTTP 200, TTFB ~0.19s, title and tiles render, DB badge "Tengt" |
| GitHub deploy | GREEN | Latest success `b460807` (#777) at 18:07 UTC; last failure 6 Aug |
| Payday / Tímavera / Gmail ingest | GREEN | Live probes and today's `automation_runs` succeeded |
| Safety net (`tools/audit-all.cjs`) | GREEN | 15/15 at or below BASELINE |
| 2026 inspection counts | YELLOW | 82 fully aligned; 19 quantity mismatches; 17 unbilled since late May |
| Connections board | YELLOW | Live handshakes OK; `EDGE_SHARED_KEY` unset; `bokhald@eldklar.is` stale since 15 Aug |
| Security | RED | Publishable key can read/write accounting tables; most `/api/*` functions have no shared-secret gate |

Open Verkefnalisti already tracks the two hardening jobs: `5395ea5a` (RLS + token rotation) and `58c92238` (rotate `NETLIFY_TOKEN`). This audit does not start those.

A matching 2026 count checklist is in `docs/SAMRAEMI-2026.md`.

## 1. Live site

Measured against `https://slokkvitaeki.netlify.app/`:

- `/` and `/index.html` → HTTP 200, 55 580 bytes, HSTS `max-age=31536000; includeSubDomains; preload`
- Hash routes `#sala` and `#arsskodun` both render with a live Supabase session
- Sidebar version chip: `b460807 · 2026-08-29 18:07`
- Ársskoðun HUD (live UI, not the count-audit): 605 in-service, 511 with an inspection year, 305 done 2026, 258 overdue 2026, expected 2026 value 24.877.105 kr
- POS: 26 open Þjónustuborð, 105 Afgreiðsla, 38 Drög, 72 Kröfu yfirlit, 33 of 118 products on the star list
- Browser console: 0 warnings / 0 errors on the homepage after load
- `/CLAUDE.md`, `/deploy.js`, `/docs/*` → 404 (redirect rules holding)

Missing on `/`: Content-Security-Policy, X-Frame-Options, Referrer-Policy, Permissions-Policy, X-Content-Type-Options.

Supabase status page was reporting API Gateway degraded performance the same afternoon. This project's Data API still answered in ~210 ms. Do not restart the project because the vendor page is yellow.

## 2. Security (P0 first)

Supabase security advisors: **456** findings (was 373 on 2026-08-19).

| Advisor | 19 Aug | **29 Aug** |
|---|---|---|
| `rls_disabled_in_public` | 226 | **289** |
| `security_definer_view` | 37 | 45 |
| `rls_enabled_no_policy` | 29 | 32 |
| `policy_exists_rls_disabled` | 5 | 5 (`solur`, `vidskiptavinir`, `sala_transactions`, `verkdagbok`, `vorur`) |
| Public tables | — | 365 (289 RLS off, 76 RLS on) |
| Public buckets | 15/16 | **16/17** (new: `turbopaint`) |

Performance advisors (298): 227 tables with no primary key (mostly backup_*), 53 unused indexes. Not the fire.

### P0 — a stranger can do this today

1. **Read and write the accounting database** with the publishable key from live `/js/config.js`. REST counts with that key: `solur` 745, `uttaeki` 5 514, `fyrirtaeki` 1 420, `vidskiptavinir` 450, `customers_base` 1 119, `customer_documents` 3 731, `payday_invoices_slokk` 229, `charlize_knowledge` 268. CORS is `*`. Do not enable RLS on those tables without policies in the same migration; the four machines and the PWA talk to Supabase with this key only.
2. **Public storage.** `samningar` (1 682 files, contracts) and `skjalarinn` (invoice PDFs) are public. Anon policies allow SELECT+INSERT+UPDATE+DELETE. Do not flip those buckets private until `docViewUrl` / `openUrl` / `skyrsla-proxy` use signed URLs.
3. **Send mail as the company.** This repo has no `gmail-send`. The live app posts to `https://brunaholf.netlify.app/api/gmail-send`. Unauthenticated GET lists sendable mailboxes. Unauthenticated POST with empty JSON returns `Missing account`, not 401.
4. **Payday.** `GET /api/payday-push?probe=1` returned `token_obtained: true` with no shared-secret header. POST is the commit path and is likewise ungated because `EDGE_SHARED_KEY` is unset (confirmed in Charlize 28 Aug, still true today).
5. **Staff portal admin.** `GET /api/gatt-admin` returned access rows and messages. Customer-facing `/api/gatt` correctly returns 401 without a session. The hole is `gatt-admin`, not `gatt`.
6. **`NETLIFY_TOKEN` still sits in `CLAUDE.md` in git.** Live `/CLAUDE.md` is 404, which only hides the current deploy. Rotate the PAT; do not treat the 404 as a completed rotation. Open task: `58c92238`.

`google_oauth`, `app_kv` (Payday token cache, Tímavera key), `gmail_oauth`, `invoices`, `portal_users`, and `vefryni_pages` are the right pattern: RLS on, no anon policy, functions use the service role. Keep that.

### P1

- `email_digest` has RLS on, but policy `beidnir_anon_read_eldklar` lets anon SELECT 5 572 of 32 232 eldklar inbox rows.
- Unauthenticated AI spend: `postur-reply`, `ocr-scan`, `postur-triage`, `tv-summary`, `verkefnalisti-vision` (POST / GET 202 starts a background job).
- Secret-key rotation still open (Charlize 28 Aug: leaked screenshot of a Supabase secret named brunaholf2). Not in this frontend.
- New tables keep being born with RLS off: 99 (9 Jul) → 226 (19 Aug) → 287 (28 Aug) → **289** (29 Aug).

### What not to "fix"

- Do not `ENABLE ROW LEVEL SECURITY` on `solur` / `uttaeki` / `fyrirtaeki` / `vidskiptavinir` / `customers_base` / `customer_documents` without policies + a deploy preview.
- Do not set `EDGE_SHARED_KEY` in Netlify until every browser can send `x-eldklar-key`. Patch 290 looks in `localStorage` then `app_kv`, and `app_kv` is already locked to anon, so discovery will fail and Payday/email from the app will 401.
- Do not make `samningar` or `eydublod` private before signed URLs exist.
- Do not remove the publishable key from `js/config.js`. It is supposed to be public. RLS is the control.

### Hardening order

1. Rotate `NETLIFY_TOKEN` and scrub the literal from `CLAUDE.md`. Confirm the GitHub Actions secret is not the published string.
2. Gate `gmail-send` (Brunahólf), `payday-push`, `email-send`, and `gatt-admin`. Test on a deploy preview so the four machines do not lose send/push.
3. RLS on the ~185 `backup_*` / cowork-backup tables, no policies. Nothing in the app reads them.
4. Function-only tables using the `vefryni_pages` pattern.
5. Read-only anon policies on tables the UI only reads, then drop INSERT/UPDATE/DELETE grants.
6. Write tables last (`solur`, `uttaeki`, …), per table, preview first.
7. Signed URLs for `samningar` / `skjalarinn` / `eydublod`, then private buckets.
8. Tighten `email_digest`.
9. CSP + `X-Frame-Options` on the app origin. Do not ship a strict CSP that breaks the inline/patch script soup without a preview.
10. Stop creating new tables with RLS off.

## 3. Safety net

`node tools/audit-all.cjs` on live data, 2026-08-29, exit 0, ~10.6s. **SAFE. The net holds at baseline.**

| Audit | Result | Count vs BASELINE |
|---|---|---|
| invoice-guard | GREEN | 40 / 40 blank emailable sales |
| kt-trap | GREEN | 10 / 10 |
| pagination | GREEN | 4 / 4 known unpaginated queries |
| fk-join | GREEN | 0 live drop-outs (50 null-FK active devices, none hidden) |
| canon-stadur | GREEN | 0 lost months |
| arsskodun-inv-dot | GREEN | 19 Drive-only invoices, none confirmed in `v_uttekt_ar` |
| attachment-forms | GREEN | `content` / `driveId` / `url` all valid |
| brunakerfi-stada | GREEN | "Skoðað YYYY" requires a real report file |
| payday-get | GREEN | GET cannot write the Payday mirror |
| pos-kt-discount | GREEN | hyphenated kt + `afslattur_pct` into cart |
| rekstrarfelog-sites | GREEN | sites stay independent |
| stadur-nr | GREEN | identity is kennitala + `stadur_nr` |
| ars-column-shift | GREEN | 0 / 0 |
| rf-column-shift | GREEN | 0 / 0 |
| rf-month-notes | GREEN | source/UI hold |

Still unwired (from `docs/ORYGGISNET.md`, not a new break): Payday per-line discount audit; email-token watch. The 40 blank sales and 10 kt-trap rows are inventory. Guards still block send. Backfill + lower BASELINE is how the net tightens.

## 4. Connections

| Connection | Status | Evidence today |
|---|---|---|
| Google Drive (`aggisigurds@gmail.com`) | GREEN | `google_oauth` refreshed 13:31 UTC |
| Gmail `eldklar@eldklar.is` | GREEN | refreshed 16:35, same minute as `gmail-ingest` (14 upserted) |
| Gmail `bokhald@eldklar.is` | YELLOW | last grant 15 Aug; Teya settlements live here; Friday 28 Aug had no Teya mail |
| Payday Slökkvitæki | GREEN | `payday_oauth_slokk` updated 10:00; mirror 229 rows updated 15:00; GET probe authenticated |
| Tímavera | GREEN | `timavera-pull` success 18:15, 23 rows |
| Redder / luna-bridge IMAP | YELLOW | last import 28 Aug; luna-bridge errors from ~15:29 about frozen mailboxes (desktop, not this site) |
| Anthropic | YELLOW | key present, functions unauthenticated |
| `EDGE_SHARED_KEY` | YELLOW | unset, so the gate is default-open |
| `VEL_HEARTBEAT_TOKEN` | YELLOW | machines 401; not the public app |
| Netlify PAT | YELLOW | git-only deploy is healthy; literal PAT still in `CLAUDE.md` |

Payday GET is dry on `payday-pull-slokk` and `payday-sync-paid`. `payday-push` GET is probe-only, not a dry payload. Cron for `payday-sync-cron` does not write `automation_runs` (monitoring hole, not an outage).

## 5. Runtime problems (7 days)

From `app_problems` / `v_app_problems_open`:

| Kind | Open | Last seen | Meaning |
|---|---|---|---|
| `uttaeki_null_fid` | 2 638 | 18:29 | 50 live devices with no `fyrirtaeki_id`; the FK-join audit still hides nobody |
| `canon_stadur_empty` | 223 | 18:26 | `v_stadur_yfirlit` returned 0 rows on some loads. Canon-stadur audit is still 0 lost months, so this is a load/empty-view signal, not a silent month drop |
| `promise_rejection` | 18 | 18:02 | `Cannot set properties of null (setting 'onclick')` on `#tekjur` |
| `js_error` | 1 | 17:23 | `appendChild` SyntaxError on a `devframe=simi` Ársskoðun URL |
| `blank_invoice_blocked` | 1 | 27 Aug | send guard doing its job |

No statement timeouts in Postgres logs in the last 24h.

## 6. 2026 inspection counts

Re-ran the three-source rule from `.claude/skills/uttekt-audit/SKILL.md`. Full checklist: `docs/SAMRAEMI-2026.md`.

| | 17 Aug | **29 Aug** |
|---|---|---|
| Inspected 2026 | 309 | **284** |
| With parsed report | 266 | **273** |
| Fully aligned (kerfi = skýrsla = reikningur) | 45 | **82** |
| List A (all three present, disagree) | 34 | **19** |
| List C (no úttekt sale on company or kt since late May) | 18 | **17** |

Largest remaining A-rows: Þangbakki 8-10 fully credited to net 0; Grillvagninn 21 vs 58 (rekstrarfélag parent invoice); Vélsmiðja 6 vs 35 (same pattern); Miðleiti 2-6 system 30 vs report/invoice 15.

New on list E: customer_documents **611** (Sléttahraun 19-21) still carries Vélrás kennitala `491209-1270`. Pitstop 656 and Galtalind 6068 are unchanged from 17 Aug.

Unmatched `uttaeki.client` names (no `fyrirtaeki` row): Bríetartún 9-11 húsfélag (48 devices), Húsfélag Skaftahlíð 4-10 (27), plus a test row `sdfasdf`.

## 7. Things that would fail tomorrow

1. Supabase JWT / API Gateway flap (vendor incident was still "identified" during this run). Symptom: Netlify still serves 200 HTML, Data API hangs.
2. Someone runs `deploy.js` or a static-only deploy. Functions vanish until the next `git push`.
3. Payday cron stops silently (no `automation_runs` row).
4. `bokhald@eldklar.is` refresh token dies. Teya + that mailbox go dark; the SPA still loads.
5. Dual production pipelines (Actions + Netlify Git) drift again. Both now run `build-dist.js`, so this is a historical wound, not today's.

## Evidence

- Live UI: POS `#sala` and Ársskoðun `#arsskodun` on deploy `b460807`
- `get_advisors` security (456) + performance (298), 2026-08-29
- SQL: RLS on/off counts, buckets, `app_problems`, 2026 samræmi
- `node tools/audit-all.cjs` 15/15 green
- HTTP: `/`, `/api/payday-push?probe=1`, `/api/gatt-admin`, `/js/config.js`, `/CLAUDE.md`
- Charlize rows 277 (oryggi) and 278 (samraemi) written after this run
