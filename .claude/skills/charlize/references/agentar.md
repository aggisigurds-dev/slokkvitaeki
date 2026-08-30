# Hver gerir hvað

| Agent | Svæði | Keyrir |
|---|---|---|
| **Claude Code** | Slökkvitæki-appið (kóði, patches, deploy) | alltaf-á PC-inn |
| **Cowork** | Brunahólfs-rekstur: Sheets, Apps Script, Tímavera, Ajour | alltaf-á PC-inn |
| **Spjall** (þetta) | greining, hönnun, SQL-yfirferð, textagerð, ákvarðanir | hvar sem er, líka úr S26 |
| **Sara** | úttektarskráning af vinnublöðum + skýrslutexti | spjall/Code |
| **Charlize** | þekkingin sjálf — allir lesa, allir skrifa | Supabase |

Charlize er ekki agent sem framkvæmir. Hún er sameiginlega minnið sem hinir fjórir deila.

## Hvernig verk eru afhent

Kóðaverk fara á **`verkefnalisti`** í Supabase (dálkar: `title`, `description`, `status`
sjálfgefið `beidni`, `priority`, `category`, `assigned_agent`, `claude_notes`), sýnilegt á
https://brunaholf.netlify.app/verkefnalisti.html. Settu `assigned_agent='claude-code'` til að
beina verki þangað.

**Verkefni fara á verkefnalistann. Lærdómur fer í Charlize.** Ekki blanda: verkefni klárast og
verða úrelt, þekking gerir það ekki. „Laga sidebar-flash" er verkefni. „Sidebar-flash stafar
af því að X" er Charlize-færsla.

## Fjarstýring

Alltaf-á PC-inn nást um **Tailscale + Windows RDP** (valið fram yfir Chrome Remote Desktop),
**Claude Desktop SSH mode** fyrir fjarlægar Claude Code-lotur, og **Claude Android-appið** á
Samsung S26 til að stýra Cowork. `luna-bridge` sér um sjálfvirkni sem þarf lifandi vafra
(Ajour-útflutning, Thunderbird-digest) og er ræsanleg fjarrænt gegnum `automation_triggers`
(watcher pollar á mínútu).

## Hvernig lota á að enda

Áður en lotu er lokað, spurðu þig einnar spurningar: **hvað veit ég núna sem næsta lota veit
ekki?** Það sem stenst hana fer í `charlize_knowledge` — 1–5 færslur er eðlilegt, tuttugu er
merki um að dagbók sé að laumast inn.

Ef ekkert nýtt kom í ljós, skrifaðu ekkert. Tóm lota er líka svar.

---

# Hvar hlutirnir liggja (uppfært 28.08.2026)

Taflan efst lýsir HLUTVERKUM. Þessi kafli lýsir STÖÐUM — það var þar sem
ruglingurinn lá.

## Tvö aðskilin kerfi. Þetta er uppspretta glundroðans.

| | Repo (`.claude/` í slokkvitaeki) | claude.ai-reikningurinn |
|---|---|---|
| Fylgir með í Git | ✅ | ❌ |
| Berst á hinar vélarnar | ✅ sjálfkrafa | ❌ handvirkt per vél |
| Sést í `git ls-files .claude/` | ✅ | ❌ |

Sama nafn getur verið til á BÁÐUM stöðum og verið sitthvor hluturinn.
`sara` er t.d. bæði repo-agent (`sara-coworker`) og claude.ai-skill.

**Reglan:** allt sem á að virka á öllum fjórum vélunum verður að vera í
repo-inu. Skill sem liggur bara á reikningnum er ekki til fyrir hinar vélarnar.

## Agentar í repo-inu (12)

`adstod` · `bord-flettur` · `elon-musk` · `joker` · `kort` · `kunnaskra` ·
**`natalie`** · `netvordur` · `prentun` · `sala-reikningar` · `sara-coworker` ·
`thema`

## Roster-nafn → skrá (Jarvis-síðan sýnir persónunöfn, skrárnar heita eftir sviði)

Þetta kort vantaði. Jarvis-síðan (`jarvis.html:324`) sýnir **persónunöfn** en
agent-skrárnar heita eftir **sviði**, svo verk merkt „Samantha" fann ekkert.
`slokk` = slokkvitaeki-repo, `bh` = brunaholf, `kj` = kjarni (samsteypan).

| Roster | Agent-skrá | Er til í |
|---|---|---|
| 🎩 Jarvis | `jarvis` | bh · kj |
| 💰 Samantha | `bokari` | bh · kj |
| 🗂️ Sara | `sara-coworker` (skýrslur) · `sara-organizer` (pörun) | slokk/kj · bh/kj |
| ❄️ Charlize | `kunnaskra` + skill `charlize` | öll |
| 🎙️ Freeman | `skjol` | bh · kj |
| 🥊 Statham | `gagnaleidslur` | bh · kj |
| 💥 Willis | `hradi` | bh · kj |
| 🤬 Samuel L. J. | `tengingar` | bh · kj |
| 🩺 Dr. House | `kerfisheilsa` | bh · kj |
| 🇺🇸 Trump | `hype` | bh · kj |
| 💪 Arnold | skill `arnold` (brunavarnir + TurboPaint) · agent `oryggi` (RLS/lyklar) | slokk · bh/kj |
| 🏷️ DeVito | `prentun` | slokk · kj |
| 🗺️ Ramsay | `kort` | slokk · kj |
| ⚡ Elon Musk | `elon-musk` (agent + skill) | slokk · kj |
| 🌸 Natalie | `natalie` | **slokk (nýtt 30.08.2026)** |
| 🃏 Joker | `joker` | öll |

Agentar sem eiga **ekkert roster-sæti** og eru samt notaðir: `adstod`,
`bord-flettur`, `netvordur`, `sala-reikningar`, `thema`, `framendi`.
Þeir eru ekki týndir — þeir eru bara ekki raddir í Jarvis.

## Skills í repo-inu

Verkfæri: `add-feature`, `deploy`, `verkefnalisti`, `uttekt-audit`,
`villuleit`, `ajour-endpoint-capture`, `screenshot-verify`, `grill-me`,
`cowork-doc-sweep`, `brief-to-tasks`, **`variant-analysis`** · Hönnun:
`design-*`, `frontend-design`, `graphic-design`, `information-architecture`,
`mobile-*`, `slokkvitaeki-layout` · Þekking: **`charlize`**, **`arnold`**,
`elon-musk`

**Hvernig Agnar sendir villuleit:** opna rétt repo, segja
`villuleit: sama mynstur og X`. `villuleit` er sendi-leikreglan (grep-gátlisti
systkini-kt / röng join / falskt grænt). `variant-analysis` er fimm-skrefa
aðferðin. Skil í Charlize + einn lista (`SAMRAEMI` eða eitt verkefni), ekki
nýtt app. Falskt grænt / tala-á-skjá → **`natalie`**. Vörðu vírar →
**`netvordur`**. GitHub er sync á 4 vélar + síma.

`variant-analysis` kom inn 30.08.2026 eftir að draugavélin fannst á fimm
stöðum þegar hún hafði verið "löguð" á þremur. Hún er gátlisti fyrir spurninguna
"er þetta víðar?" — sem á að spyrja ÁÐUR en sagt er lagað.

`charlize` og `arnold` voru fluttar inn 28.08.2026. Fram að því lágu þær
aðeins á reikningnum — á meðan `kunnaskra`, `netvordur` og `sara-coworker`
vísuðu allar í charlize sem var ekki til á vélinni.

**`natalie` var ekki til fram að 30.08.2026** — hvorki agent né skill, þótt hún
væri á roster og ætti rödd. Verk merkt henni fór í tómið. Nú er
`.claude/agents/natalie.md` til: staðreyndayfirferð, borðið `factcheck_bord`
(44 færslur), vinnur með charlize og söru. Hún LES og MÆLIR — leiðréttir aldrei
gögn sjálf.

## Fjórar vélar + sími — hvernig þær haldast í takt

`heartbeat.js` (luna-bridge) sendir lífsmark á 30 mín fresti á
`brunaholf.netlify.app/kerfisheilsa.html`: hvaða vél, hvaða repo, hvaða grein,
síðasta commit og hvort eitthvað sé óvistað. GIT_PULL-takkinn í símanum keyrir
`git pull --ff-only` á öllum repo-um sem vélin FINNUR.

Gildrur, báðar staðfestar 28.08.2026:

1. **`git status` lýgur þar til `git fetch` er keyrt.** Vinnutré getur sagst
   „in sync" og verið mánuðum á eftir. Þessi vél var 1518 commit og þrjá
   mánuði á eftir án þess að nokkuð segði frá því.
2. **GIT_PULL sleppir repo-um með óvistuðum breytingum** (`--ff-only`).
   Kerfisheilsa merkir þau `ÓVISTAГ — það er merkið um að vél þurfi hendur.

## Breytingar 28.08.2026 sem hafa áhrif á verkaskiptinguna

- **Tímavera er ekki lengur verk luna-bridge.** API-tengd beint
  (`timavera-pull.js`). Scheduled task fjarlægt, `timavera-bridge.js` læst
  nema `TIMAVERA_BRIDGE_FORCE=1`.
- **Redder þarf ekki lengur Thunderbird opinn.** `redder.js` les pósthólfið
  beint um IMAP ef `IMAP_BOKHALD_*` er í `.env`; annars gamla mbox-leiðin.
- **Ajour er enn háð vafra** og setu-köku sem rennur út. `--capture` tekur upp
  beiðnina svo hægt sé að skipta yfir í hreint JSON-kall síðar.
