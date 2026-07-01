# Slökkvitæki + Brunahólf-þemi — Kickoff fyrir nýtt Claude Code session

Þetta skjal er handoff á milli session-a. Lesið **fyrst** af Claude þegar nýtt session ræst upp. Framar öllu: staðfestu að egress + tólin virki áður en byrjað er að breyta kóða.

---

## 0. Copy-paste opnunar-prompt

Notaðu þennan streng sem fyrsta skilaboð þegar þú stofnar nýtt session:

```
Þú átt að vinna á aggisigurds-dev/slokkvitaeki (branch claude/greeting-2eyc1w).
Lestu docs/NEW-SESSION-KICKOFF.md alveg í gegn fyrst.
Keyrðu Section 1 (Prerequisite check) og segðu mér niðurstöðurnar áður en þú
byrjar á neinni breytingu. Ef eitthvað fellur — HÆTTIÐ og láttu mig vita hvað
þarf að opna.
```

---

## 1. Prerequisite check — KEYRA FYRST

Ef eitthvað af þessu fellur → stoppaðu og segðu Agnar. Ekki reyna að fara framhjá.

| Prófun | Skipun | Væntanleg niðurstaða |
|---|---|---|
| Egress → Netlify | `curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://slokkvitaeki.netlify.app/` | `HTTP 200` (ekki 403) |
| Egress → deploy preview | `curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://deploy-preview-251--slokkvitaeki.netlify.app/` | `HTTP 200` |
| Egress → Google Fonts | `curl -sS -o /dev/null -w "HTTP %{http_code}\n" https://fonts.googleapis.com/css2?family=Space+Grotesk` | `HTTP 200` |
| Supabase MCP | keyra `mcp__Supabase__list_projects` | listi með `osfdzskyvisifcwyjkuk` |
| Google Drive MCP | opna theme-möppuna (§4) | listi með THEME-SPEC.md |
| Chromium til staðar | `ls /opt/pw-browsers/chromium-1194/chrome-linux/chrome` | skráin til |
| Playwright installað | `ls /opt/node22/lib/node_modules/playwright/package.json` | skráin til |

Ef **egress fellur á 403** → sá blokk er á Claude Code umhverfis-proxynum. Farðu á [claude.ai/code](https://claude.ai/code) → environment settings → **Network policy** → skiptu í opnari eða bættu `*.netlify.app` og `*.supabase.co` við allowlist. Nýtt session þarf til.

---

## 2. Verkefni (staða þegar þetta er skrifað — 2026-07-01)

### 2a. Klárað í síðasta session (PR #251, branch `claude/greeting-2eyc1w`)
- ✅ `📎 Skýrsla` takki nettari + blár í Kröfu yfirliti (patch 166)
- ✅ Bulk Payday push — fjölval með tickbox + neðsta sticky stika (patch 166)
- ✅ Fasi 0 af Brunahólf-þemanu var upphaflega ýtt en **revertaði** (5e64ebb, b4266b3 → f0c5069, 3f534ea). Ástæða: session gat ekki verifierað visualt (egress blokkið), útlitið var brotið. Endurgerum þegar egress virkar.
- ✅ Spec-skjölin sótt úr Google Drive og vistuð í `docs/theme/brunaholf/` (voru líka revertuð — verður sótt aftur í nýja session-inu)

### 2b. Beint áfram næst (raðað eftir forgangi)

**A. Klára Payday-sendingar** (backend, virkar hvort sem egress er í lagi eða ekki)
- [ ] R-000243 → Colas
- [ ] R-000260 → SAFÍR byggingar
- [ ] R-000369 → SAFÍR byggingar
- [ ] R-000462 → Hagvagnar

Aðgerð: `POST /api/payday-push {sale_id: <id>}`. Fyrst verifiera afslátt (þessar sölur eru fyrir 2026-06-12 → ex-VAT afsláttur) með SQL:
```sql
SELECT id, num, customer_nafn, upphaed_an_vsk, vsk_upphaed, samtals, afslattur, linur
FROM solur WHERE num IN ('R-000243','R-000260','R-000369','R-000462');
```

**B. Brunahólf-þemi — endurgerð (þarf virkt egress fyrir Playwright-verifikation)**
1. Sækja **THEME-SPEC.md** + **SIDEBAR-SPEC.md** aftur úr Drive → `docs/theme/brunaholf/`
2. Sækja **`Fyrirtaeki-i-Thjonustu v2.dc.html`** (id `1ScbaAD84y-JIuH9bnrhfVuLQY8yzKu4L`) sem nákvæmasta reference fyrir Kröfu yfirlit → `docs/theme/brunaholf/reference-pages/`
3. Bæta Space Grotesk + Space Mono við Google Fonts hlekkinn í `index.html`
4. Búa til `css/theme-brunaholf.css` með `.bh-*` uppskriftum (spec §1-§5) — **frá fyrra reverti er tiltæk copy: sjá commit `5e64ebb` diff**
5. **Sameiginlegt vandamál sem lagfærist strax**: bæta `.bh-host` classanum á `#ky-main` main-element (patch 166 line 75). Í fyrri revert var þetta lagað í commit `b4266b3`.
6. Byrja á **Kröfu yfirliti** sem sannreyni. Playwright skjáskot fyrir/eftir.
7. Aðeins ef Agnar staðfestir grænt ljós → færa yfir næstu síðu.

**Röð pípulagningar (§6 í THEME-SPEC.md — „Still to theme"):**
Kröfu yfirlit → Bókhalds yfirlit → Hreyfingar → Verkborð → Efniskostnaður → Verðsamanburður → Móttaka → Tilboð → Samningar → Eftirfylgni → Drög → Verkdagbók → Beiðnir → Stjórnstöð → Tímavera → Útlit → Kerfi

**REGLA**: hver síða = eigin commit + eigin skjáskot. Aldrei fjölda-restyle í einum PR.

**C. Backend-verkefni sem virka óháð egress-i:**
- [ ] Task #34: MBOX-extract resume klárun (luna-bridge)
- [ ] Task #36: Indexa endurnefndar PDF í `customer_documents` (brunahólf)
- [ ] Task #43: dkPlus phase 2 — push invoices úr POS sala
- [ ] Task #46: `pricing_guide` tafla — schema + seed úr Tekjur-sheet
- [ ] Task #47: `material_prices` tafla — seed úr Verðskrá
- [ ] Task #49: RLS á 19 töflur — hanna policies per töflu
- [ ] Task #51: Fylla missing kt/heimilisfang fyrir 5 kúnna

---

## 3. Repo-leiðbeiningar

- **Repo**: `aggisigurds-dev/slokkvitaeki`
- **Branch**: `claude/greeting-2eyc1w` (default fyrir öll ný breyting í þessari session-röð)
- **Opni PR**: #251 (draft) — hægt að ýta beint á branch-inn, eða opna nýja PR ef nýtt session tekur við
- **Deploy**: `git push origin master` (GitHub Actions þjónar dist + functions atomically)
  ⚠️ ALDREI `node deploy.js` — hann eyðir netlify functions
- **Path**: `/home/user/slokkvitaeki`

### Systers-repo (sömu allow-list, sömu conventions)
- `aggisigurds-dev/brunaholf` — /home/user/brunaholf (Brunahólf hub, Netlify + Supabase)
- `aggisigurds-dev/luna-bridge` — desktop scripts

---

## 4. Gögn + hlekkir

### Google Drive — Brunahólf theme handoff
Root: `https://drive.google.com/drive/folders/1UfzJSFt6PwenERQVCRqF-fDfJ1oUZcrE`

Nýjasta undirmappa (07:26 var authoritative):
- `brunaholf-theme-handoff/` → id `1tDpNh6zd6Ylb-qzE8oYQ2IFk-I3qOwqA`
  - `THEME-SPEC.md` → `1tivcOyf6fBEI-MnIt5bDjB1_zx1Pit5c` (10 KB, spec §1–§7)
  - `SIDEBAR-SPEC.md` → `11RRuBjUvcNmNym-9gP7_T0-vXJqobVR4` (6 KB)
  - `reference-pages/` → `1uf3i3r_J3Qu_ltzsXlviNL-R26jNRj-n`
  - `assets/` → `1nm7CNMeJh0IYRybzlA5I1zW25u6swAkj` (fire-flames.png, logo, ic3-*.png)

### Reference pages (14 stk. fyrir hverja síðu-týpu)
| Route | Skrá | ID |
|---|---|---|
| Sala (POS) | `Sala v2.dc.html` | `1Xxy886kKLO99xmtyCDSlE5LWC26ZKD7z` |
| Afgreiðsla | `Afgreidsla.dc.html` | `1zHZwYtVpKYGT-xYJyGsvchnxKB4CwDPe` |
| Verkstæði | `Verkstaedi.dc.html` | `12b3OdF9J788934NadePBdKkc3LksB9W9` |
| Allir Viðskiptavinir | `Allir-Vidskiptavinir.dc.html` | `1RZcpujsvK26jmdj5JDEpvVLrc3bzt5og` |
| **Fyrirtæki í Þjónustu** (Kröfu-yfirlit sniðmát) | `Fyrirtaeki-i-Thjonustu v2.dc.html` | `1ScbaAD84y-JIuH9bnrhfVuLQY8yzKu4L` |
| Rekstrarfélög (detail) | `Rekstrarfelag-detail.dc.html` | `1bAFrMQc9lDtlv4In-uYIzjZpSOrGlIuH` |
| Þjónustuverk | `Thjonustuverk.dc.html` | `1296W3GIpnDKWnF9uXvRJvgDmhKGf30fk` |
| Þjónustuver | `Thjonustuver.dc.html` | `1Z2EMy4cXbZVeSYrb9VHS7vlInuhsr_22` |
| ÞjónustuVerkstæði | `ThjonustuVerkstaedi-board.dc.html` | `1xHkiorkghkz0wZt32CqMML9RTcMPQZBh` |
| Vertíð | `Vertid.dc.html` | `1PPfH_fGZZi4I3wWe15u0Qw1-Xlu-z7Df` |
| Brunakerfisþjónusta | `Brunakerfisthjonusta.dc.html` | `10OmoIHbubJrtI7fagQ9Bklt5GzswUGcE` |
| Vörur og þjónusta | `Vorur-og-thjonusta.dc.html` | `1yk8UEkmHZ-V7TMUbLb3Y1ngg73SxPQ_Q` |
| Bakendi | `Bakendi.dc.html` | `1NPsxV9-zzSem1kNsPvB72sukYwZ_sBJ-` |
| Úttekt | `Uttekt.dc.html` | `1eS5UShjpRHpH8vVbKCv2H12jOC77526F` |

Notkun: `mcp__Google_Drive__download_file_content({fileId: '<id>'})` skilar base64 sem er einfalt að decode. Skjal er HTML — les nákvæma markup + inline stíl fyrir hverja síðu.

### Þjónustur
| Nafn | Info |
|---|---|
| Netlify site | `d22039b2-75f2-4206-b543-7c6176f2d181` (slokkvitaeki.netlify.app) |
| Supabase project | `osfdzskyvisifcwyjkuk` (eu-west-1) |
| Payday API | OAuth2 client_credentials í Netlify env vars |
| dkPlus | GUID `606cc74e-…` (Slökkvitæki ehf), swagger á `api.dkplus.is/swagger` |
| Bókhald mailbox | `bokhald@brunaholf.is` (fyrir Redder + reikninga PDF) |
| eldklar.is mail | `eldklar@eldklar.is` (95% af Slökkvitæki innboxi) |

---

## 5. Tólin — MCP servers til að nota

Þessir MCP-þjónustur eiga að vera tiltækar (staðfesta með `ToolSearch`):

| MCP | Notkun |
|---|---|
| `Supabase` | SQL, migrations, storage, edge functions, advisors |
| `Google_Drive` | sækja spec + reference pages |
| `Netlify` | project services (env vars, deploy status) |
| `github` | PR create, review, merge, checks, comments |
| `Gmail` | labeling, drafts, search (fyrir bokhald@ vinnu) |
| `Miro` | (ef þarf mynd-workflow) |
| `Spotify` | (ef Agnar biður) |
| `Todoist` | (þarf OAuth) — ekki nauðsyn |

Native tools sem virka alltaf: Read, Write, Edit, Grep, Glob, Bash, TaskCreate/Update/List, Agent, Workflow, Monitor, SendUserFile.

---

## 6. Verifikations-loop (skjáskot-drifið)

Þegar egress virkar → Playwright hittir deploy-preview beint. Þegar ekki → serve lokal + inject.

### 6a. Nákvæmasti bakgrunnur (þegar egress virkar):
```bash
cat > /tmp/shot.js <<'EOF'
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
(async () => {
  const url = process.argv[2];
  const out = process.argv[3] || 'shot.png';
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    proxy: { server: process.env.HTTPS_PROXY || 'http://127.0.0.1:45387' },
    args: ['--no-sandbox'],
  });
  const ctx = await b.newContext({ viewport: {width:1440,height:900}, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(3000);
  await p.screenshot({ path: out, fullPage: false });
  await b.close();
})();
EOF
node /tmp/shot.js "https://deploy-preview-251--slokkvitaeki.netlify.app/#krofu-yfirlit" krofu.png
```

### 6b. Lokal render (ef egress ennþá blokkuð):
```bash
cd /home/user/slokkvitaeki && python3 -m http.server 8765 --bind 127.0.0.1 > /tmp/httpd.log 2>&1 &
# Í Playwright: opna http://127.0.0.1:8765/#krofu-yfirlit
# Supabase-köll fara í 403, en CSS/layout renderast eðlilega
# Inject-a mock innhaldi til að sjá theme-uppsetningu (dæmi í eldri session-i, scratchpad/shot-injected.js)
```

### 6c. Skjáskotið sent til Agnar
```bash
# Native tool: SendUserFile með caption
```

**Regla**: aldrei push-a UI-breytingu án þess að taka skjáskot fyrst. Ef skjáskot brotið → laga fyrst, ekki pusha broken output.

---

## 7. Þematgerð — nákvæm áætlun

Þegar Fasi 0 er endurgerð (sjá §2b B):

### 7a. Grunnur
1. Sækja bæði spec-skjölin úr Drive (`mcp__Google_Drive__download_file_content`)
2. Vista í `docs/theme/brunaholf/THEME-SPEC.md` og `SIDEBAR-SPEC.md`
3. Sækja Fyrirtaeki-i-Thjonustu v2.dc.html sem reference-page → `docs/theme/brunaholf/reference-pages/`

### 7b. Fontar
Bæta við eftir núverandi Google Fonts hlekk í `index.html`:
```
&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700
```

### 7c. `css/theme-brunaholf.css`
Copy úr commit-diff `5e64ebb` (revertuð útgáfa hafði réttar reglur). Grunnhlutir sem verður að hafa:
- `:root { --bh-accent, --bh-ring, --bh-glow, --bh-btn-grad, --bh-ink1..5 }`
- `.bh-page` + `.bh-host` (edge-to-edge gradient — ekki gleyma `.bh-host` klasanum!)
- `.bh-title-band` (hvítur haus á dökka bandi)
- `.bh-container`, `.bh-card`
- `.bh-stats/.bh-stat` + `--hero/--green/--amber/--red` variants
- `.bh-chip` × 7 (done/progress/pending/overdue/neutral/fire/samningur)
- `.bh-table-wrap` + `.bh-table` (**sticky headers + responsive overflow**)
- `.bh-btn` × 4 (metal/accent/green/light) + sm/xs sizes
- `.bh-input`, `.bh-select`
- `.bh-group` + `-head/-name/-meta/-total` (fyrirtækjaspjald)
- `.bh-empty`, `.bh-bulkbar` (sticky bottom bar)
- `.bh-mono` helper

### 7d. Innihald síðu (Kröfu yfirlit fyrst)
Wrap allt í:
```html
<div class="bh-page">
  <div class="bh-title-band">
    <div class="bh-container">... titill + toolbar ...</div>
  </div>
  <div class="bh-container">... stats grid, group cards, table ...</div>
</div>
<div class="bh-bulkbar">...</div>
```
Og bæta `bh-host` klasa á `#ky-main` main tag (patch 166 line 75).

### 7e. Verifikasjón
- Playwright skjáskot: sjá að body-bg peekar ekki (fyrra vandamál var 1200px kassi + 28px padding á main-panel — `.bh-host` reset-ar bæði)
- Space Grotesk / Space Mono greinilega
- Sticky bulk-bar er ekki tvöfalt bakgrunnur
- Sticky table header skýrist við scroll

---

## 8. Öryggis-reglur (mundu)

- **ALDREI** committa credentials (Netlify env vars eingöngu)
- **ALDREI** run `node deploy.js` (eyðir functions)
- **ALLTAF** allow save í öllum formum (Kröfu yfirlit, Skoða, tilboð) — engin validation-hindrun
- **ALDREI** eyða/sameina staðsettningar rekstrarfélaga (bara setja sama `customer_base_id`)
- **Walk-in kt**: `999999-9999` (formaðið með striki)
- **Payday**: hver salan sitt eigið drag — aldrei sjálfvirkt sent á kúnna
- **RLS**: 19 töflur án RLS enn — snerta ekki þar til Task #49 er tekið upp meðvitandi

---

## 9. Task-list í session-inu

Þegar nýtt session hefst → keyra `TaskList` til að sjá lifandi lista. Núverandi staða:
- #34, #36, #38, #42, #43, #45-49, #51 = pending (sjá §2c)
- #54, #55 = completed (📎 blár + bulk Payday)
- #56 = completed (Fasi 0 revert-að — endur-gera í nýja session-inu)

Ef þessi listi virkar ekki (fresh workspace) → keyra `TaskCreate` fyrir hvert af §2 verkefnunum.

---

## 10. Ef eitthvað fer úrskeiðis

- **Egress fellur á 403** → §1 sagt hvað þarf. STOPP, láttu Agnar vita.
- **Supabase 500/522** → líklega platform-overload (kom fyrir 2026-06-30). Bíða 10 mín, ekki reyna að laga með kóðabreytingum.
- **Deploy CI failure** → skoða logs, ekki merge fyrr en lagað
- **Vinnur á CSS án Playwright** → ekki ýta, taka skjáskot fyrst

---

## 11. Framtíðar-áætlun (nice-to-have þegar meginverk er í lagi)

- **Bæta þessu skjali við** hver session sem klárar hluta af Þematgerð
- Færa spec-skjölin úr Drive → repo undir `docs/theme/brunaholf/` (endanlega, þau eru afrit í dag)
- **Skill hugmynd**: `/theme-view <slug>` sem gerir 1-2-3 fyrir hverja síðu: sækir reference, býr til migration draft, tekur skjáskot fyrir/eftir.
- Reference pages settar sem static skrár í `public/theme-reference/` svo hægt er að hita þær á localhost + bera saman á iframe

---

_Skrifað 2026-07-01 í session sem lauk með revert af Fasi 0 (egress blokk kom í veg fyrir visual verification). Næsta session tekur við þegar network policy er opnuð fyrir `*.netlify.app` og `*.supabase.co`._
