---
name: verkefnalisti
description: >
  The Verkefnalisti task board workflow (Agnar's Claude task board) — how to pick
  up work at the start of a session, move a task through beidni → i_vinnu →
  i_yfirferd → klarad, attach the required result screenshot, and read the feedback
  column when a task bounces back from review. Use at the start of any work session
  to check open work, and whenever moving a task through the board.
  Kveikjuorð: verkefnalisti, beiðni, beidni, i_vinnu, i_yfirferd, klarad, settu á borðið, athuga opin verk.
---

> Charlize: `select topic, fact from v_charlize_active where topic = 'vinnulag' or fact ilike '%verkefnalisti%';` — vinnulag Agnars. Verkefnin sjálf eru á verkefnalistanum; lærdómur fer í skill `charlize`.

# Verkefnalisti — Claude task board

Agnar queues work for Claude on a shared board. **Standing instruction (2026-07-30):
at the start of a work session, look at open work before starting anything new.**

- **Read the board:** `GET https://brunaholf.netlify.app/api/verkefnalisti` — returns
  everything; the ones that matter are `status` in `beidni` (requested) and `i_vinnu`
  (in progress).
- **States:** `beidni` → `i_vinnu` → `i_yfirferd` (Agnar approves) → `klarad`.
- **Move a task:** `POST /api/verkefnalisti { action:'update', id, status, … }`.
  ⚠️ The field is `status` (English), NOT `stada` — and the API **silently
  ignores unknown fields**, so a `stada` update returns ok:true while the
  status stays put (bit for real 2026-08-19).
- **`claude_notes`** is Claude's reply text on the task.

## A screenshot of the result is part of finishing
When a task goes to `i_yfirferd`, include a screenshot of the change so Agnar can
review from his phone without opening the app — pass it as `result_image_b64` in the
**same** update call:
```
POST /api/verkefnalisti
{ "action":"update", "id":<id>, "status":"i_yfirferd",
  "result_image_b64":"<base64 png>", "claude_notes":"hvað var gert" }
```
In a Claude Code web/remote session, take that screenshot with `tools/bh-browser.cjs`
(plain Playwright fails there) — see the **screenshot-verify** skill.

## Read `feedback` when a task comes back
"↶ Aftur í vinnu" from review opens a comment box for Agnar; the text is appended,
timestamped, to the `feedback` column (shows as 📣 on the page). **The newest line
says what to change — take it over the original description if they conflict.**

## Request images
- `request_image_urls` (jsonb array) is the primary field; `request_image_url` is
  always the first image (older readers).
- `add` takes `request_images_b64` (array); `update` takes `add_request_images_b64`
  (append) and `request_image_urls` (removal).

Board UI: `verkefnalisti.html`; table `verkefnalisti`; images in the public
`verkefnalisti` bucket.

## Yfirferð og lokun — reglur Agnars (uppgjör lota 16.10.2026)
- Staðan `sleppt` er til (auk beidni → i_vinnu → i_yfirferd → klarad); reitirnir `category`, `flag` og `priority` eru á verkinu.
- **Agnar samþykkir áður en verk fer i_yfirferd → klarad** („those thre yes" 22.08.2026); prófa EINA uppfærslu fyrst — `stada` er hunsað hljóðlaust, reiturinn heitir `status`.
- **Lesa titilinn** áður en verki er lokað (`returning title`) — id eitt og sér hefur lokað röngu verki (minni feedback_loka_verki_titill).
- Yfirferð („verkefnalist reviewing"): mæla LIFANDI, ekki strengjaleit í bundle; `git pull` á báðum repóum áður en verk er sagt „ógert" (22.08: patch „vantaði" af því leitað var í röngum möppu og brunaholf var 26 commits á eftir).
- Verkefni og staða eiga heima hér, ekki í Charlize (hún geymir reglur).

## Tæknilegt og staða 02.11.2026 (yfirferð allra sessions)
- `GET /api/verkefnalisti` skilar `{tasks:[…]}`. Reitir: id (uuid), title, description, status, priority, category, assigned_agent, flag, claude_notes, feedback, result_image_url, request_image_urls, vefur, created_at/updated_at/completed_at. `add` tekur title, description, priority (tala), category, vefur — status verður alltaf `beidni`. `update` tekur id, status, title, description, claude_notes, feedback, priority, flag (0–3), category, vefur, assigned_agent, result_image_b64, add_request_images_b64. ⚠️ **`claude_notes` er YFIRSKRIFAÐ** (lestu fyrri texta fyrst og hengdu dagsetta línu aftan við); `feedback` er rás Agnars og BÆTIST við sjálfkrafa með tímastimpli — Claude skrifar þar ekki.
- Mælt 02.11: 419 verk — 73 beidni, 2 i_yfirferd, 284 klarad, 60 sleppt. **Meirihluti beidni-verkanna (60+) hefur ekki verið snert síðan uppgjörið 21.10.2026**; claude_notes/feedback þeirra lýsa stöðu þess dags. Áður en verk er sagt opið eða búið: endurmæla (SQL/skrá/kóði), setja dagsetta línu „[dd.mm.áááá Claude, mælt] …" í claude_notes. Lokun (klarad/sleppt) aðeins eftir já Agnars.
- **Verkefnalisti ≠ Þjónustuborð.** Þjónustuborðsmál (`thjonustubeidni`, #1xxx, samþykkismál) eru annað kerfi; Heimaleigu/Center-ákvarðanir og kúnnamál eiga heima þar. Verkefnalistinn geymir kóða-/kerfis-/uppsetningarverk og tímabundin verkefni með frest (t.d. fundur 5.11).
- Þegar tvö verk eru tvítök (Borgarferðir: 84244b1c og e6d1d920 á móti c370a0f3 í yfirferð) er athugasemd sett á þau en staða ekki breytt án Agnars.
