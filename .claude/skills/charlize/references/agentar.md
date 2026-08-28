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
