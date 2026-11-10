export const meta = {
  name: 'allsherjar-audit',
  description: 'Allsherjar úttekt á Slökkvitæki + Brunahólfi: 7 svið lesa og mæla, eitt sannreynir alvarlegar niðurstöður',
  phases: [
    { title: 'Úttekt', detail: '7 svið, aðeins lestur, hver niðurstaða með sönnun' },
    { title: 'Sannreyning', detail: 'alvarlegar niðurstöður endurmældar og bornar við Verkefnalistann' },
  ],
}

// ALLSHERJAR ÚTTEKT — workflow-skrifta (Workflow-tólið í Claude Code). Sjá .claude/skills/allsherjar-uttekt/SKILL.md.
//
// Sjö svið lesa og mæla (AÐEINS LESTUR), einn efasemdarmaður reynir að hrekja allt sem er krítískt/hátt.
// Fyrst keyrt 31.10.2026: 8 agentar, ~2,4 m undirtokena, 74 mín á 4 kjörnum (aðeins 2 agentar í einu:
// samhliða þak = min(16, kjarnar − 2)). 18 alvarlegar niðurstöður, allar stóðust sannreyningu (5 vægari).
//
// Keyrsla:  Workflow({ scriptPath: '<þessi skrá>', args: { S: '<scratch-mappa>', sidan: 'YYYY-MM-DD', bord: N } })
//   S      = mappa með FERSKUM eintökum: S/sl (slokkvitaeki origin/master), S/bh (brunaholf origin/main),
//            S/brunaholf → symlink á bh (annars er audit-agentar falskt rautt), S/bord.json (opnar beiðnir af
//            /api/verkefnalisti). Skillið lýsir undirbúningnum.
//   sidan  = frá hvaða degi kóðayfirferðin les commit (sjálfgefið: tvær vikur — settu dagsetningu síðustu úttektar)
//   bord   = fjöldi opinna beiðna í bord.json (aðeins til upplýsingar í fyrirmælunum)
//
// Tölurnar í ÖRYGGI-sviðinu (RLS-lausar töflur o.s.frv.) eru úr ráðgjafa Supabase daginn sem skriftan var skrifuð —
// uppfærðu þær úr get_advisors (security) áður en þú keyrir, eða láttu sviðið mæla þær sjálft.

const A = (typeof args === 'object' && args) || {}
if (!A.S) throw new Error('args.S vantar — scratch-mappa með sl/, bh/ og bord.json (sjá skill allsherjar-uttekt)')
const S = A.S
const SIDAN = A.sidan || 'two weeks ago'
const BORD = A.bord || '?'
const SAMEIGINLEGT = `
SAMHENGI: Slökkvitæki ehf (app: slokkvitaeki.netlify.app, repo-eintak á nýjasta master: ${S}/sl) og móðurfélagið Brunahólf
(hub: brunaholf.netlify.app, eintak á nýjasta main: ${S}/bh). Sami Supabase: osfdzskyvisifcwyjkuk. Lestu CLAUDE.md í báðum
eintökum og docs/ORYGGISNET.md + docs/MAELINGAR.md í ${S}/sl áður en þú mælir. Sérfræðingaskrár eru í .claude/agents/ í báðum.

HÖRÐ SKILYRÐI — brot á þeim er verra en engin úttekt:
- AÐEINS LESTUR. Supabase: aðeins SELECT (mcp__Supabase__execute_sql); aldrei apply_migration, INSERT/UPDATE/DELETE/DDL.
  Engar git-ýtingar, engin PR, engar GitHub-athugasemdir, enginn póstur, engin skrif á Verkefnalistann, engin POST á /api/*.
- Breyttu ekki skrám í ${S}/sl eða ${S}/bh. Hjálparskriftur fara í ${S}/agent-<sviðið>/.
- Vafrapróf: Playwright með executablePath '/opt/pw-browsers/chromium', proxy { server: process.env.HTTPS_PROXY }, ignoreHTTPSErrors,
  NODE_PATH=/opt/node22/lib/node_modules. context.route('**/*') svarar ÖLLU sem er ekki GET/HEAD/OPTIONS með fölsuðu 200 '[]',
  OG context.addInitScript sem gerir navigator.sendBeacon að no-op og falsar fetch með keepalive (MAELINGAR kafli 17 — route
  eitt sér lekur skrifum við lokun). Láttu Node sækja GET með route.fetch (3 tilraunir).
- Lestu aldrei pósthólfið aggisigurds@gmail.com (email_digest.account) — síaðu það alltaf út.
- Prentaðu aldrei lykla/tokens í heild; nefndu skrá:línu og fyrstu 4 stafi.
- Mældu, ekki giska (CLAUDE.md regla 3): hver niðurstaða ber skipunina/fyrirspurnina sem sannar hana og hvað kom út.
  Óviss = segðu það og settu alvarleika lægra. Ekkert „gæti verið" án mælingar.
- Opnar beiðnir á Verkefnalistanum (${BORD} stk.) eru í ${S}/bord.json. Sé niðurstaða þegar á listanum: settu titilinn í
  a_verkefnalista og segðu hvort staðan hafi breyst (versnað/batnað/óbreytt) — ekki selja hana sem nýja.
- Skilaðu líka því sem þú fannst GRÆNT (mælt og í lagi) — það er hluti af úttektinni.
- Skrifaðu á íslensku. Hámark ~12 niðurstöður; forgangsraðaðu eftir raunverulegu tjóni (peningar, gögn, öryggi, Agnar sér rangt).`

const FINN = {
  type: 'object',
  properties: {
    svid: { type: 'string' },
    graent: { type: 'array', items: { type: 'string' }, description: 'Það sem var mælt og er í lagi, ein lína hvert, með tölu' },
    nidurstodur: { type: 'array', items: { type: 'object', properties: {
      titill: { type: 'string' },
      alvarleiki: { type: 'string', enum: ['krítískt', 'hátt', 'miðlungs', 'lágt'] },
      lysing: { type: 'string', description: 'Hvað er að og hverju það veldur, með tölum' },
      sonnun: { type: 'string', description: 'Skipun/fyrirspurn + útkoma sem sannar þetta' },
      stadur: { type: 'string', description: 'skrá:lína, tafla, slóð eða fall' },
      a_verkefnalista: { type: 'string', description: 'Titill á Verkefnalista ef þegar þar + hvort breyst, annars tómt' },
      tillaga: { type: 'string' },
    }, required: ['titill', 'alvarleiki', 'lysing', 'sonnun', 'stadur', 'a_verkefnalista', 'tillaga'] } },
    ekki_maelt: { type: 'string', description: 'Hvað náðist ekki að mæla og af hverju' },
  },
  required: ['svid', 'graent', 'nidurstodur', 'ekki_maelt'],
}

const SVID = [
  { key: 'gogn-rukkun', p: `SVIÐ: GÖGN OG RUKKUN (peningar). Mældu á lifandi gögnum: sölur án kúnnatengingar sem eiga eftir að rukkast;
tvítekna reikninga/kröfur; úttektir félaga í afsláttarhópi án afsláttar; T=S=I (prófíll/skýrsla/reikningur) nýbrot síðustu 2 vikur;
kröfur í krofur_yfirlit_meta sem segjast sendar en finnast ekki í Payday-speglinum (eða öfugt); reikninga með samtals sem stemmir ekki
við línur (upphaed_an_vsk + vsk_upphaed = samtals, afsláttur); tæki á prófílum án fyrirtækis; vörur á legsteinalista sem eru til.
Notaðu gagnaverðina í ${S}/sl/tools/audit-*.cjs sem upphafspunkt (keyrðu þá sem lesa gögn) og farðu dýpra þar sem þeir eru rauðir eða
þöglir. Sérfræðingar: sala-reikningar, rukkari, bokari, natalie (lestu skrárnar). Nefndu R-númer og upphæðir.` },
  { key: 'oryggi', p: `SVIÐ: ÖRYGGI. Supabase-ráðgjafinn sagði 31.10.2026 (endurmældu með get_advisors/SQL): 232 töflur án RLS (m.a. app_settings, charlize_knowledge, krofur_yfirlit_meta,
uttaeki, solur-tengdar), 5 með policies en RLS slökkt (sala_transactions, solur, verkdagbok, vidskiptavinir, vorur), 77 security-definer
view, 38 SECURITY DEFINER föll keyranleg af anon. Ekki endurtaka þetta sem lista — metið RAUNVERULEGA hættu: hvað getur hver sem
hefur birta anon-lykilinn (hann er í js/config.js) LESIÐ og SKRIFAÐ sem skaðar (kennitölur, netföng, reikningar, eyðing)? Prófaðu
LESTUR með anon-lyklinum (curl GET, aldrei skrif). Farðu yfir öll Netlify-föll í ${S}/sl/netlify/functions og ${S}/bh/netlify/functions:
hver tekur á móti POST án auðkenningar og gerir eitthvað hættulegt (senda póst, skrifa í Payday, eyða, kalla á Claude/kostnað)?
Leitaðu að lyklum/tokens í repóunum (git grep á mynstur: sk_, eyJ, AIza, ghp_, xox, service_role, NETLIFY_TOKEN gildi) og public
storage-buckets. Sérfræðingur: oryggi (lestu .claude/agents/oryggi.md í bh). Raðaðu eftir raunverulegri hættu.` },
  { key: 'vafri-slokkvitaeki', p: `SVIÐ: SLÖKKVITÆKI Í VAFRA (lifandi síða, tölva 1600px og sími 412px). Ræstu á #verkbord, bíddu eftir kyrrstöðu
(ekki fastan biðtíma — MAELINGAR kafli 1), og opnaðu helstu borðin: Sala, Afgreiðsla (counter), Ársskoðun, Fyrirtæki (opnaðu 3 prófíla:
192, 227, 269), Kröfu yfirlit, Rekstrarfélög, Bílstjóri, Vörur. Mældu per borð: JS-villur (pageerror + console.error), CLS
(layout-shift), lengsta verk (long task), fjölda REST-kalla og tvítekin köll, DOM-breytingar á sekúndu í kyrrstöðu (>30/s = galli),
og hvort eitthvað sýnir villu/tómt/„Sæki…" sem hangir. Berðu saman við fyrri mælingar í ${S}/sl/docs/ORYGGISNET.md session log
(t.d. ræsing, Yfirferð 96–126 ms, CLS prófíla). Sérfræðingar: hradi, joker, frontend-profiler skill (${S}/sl/.claude/skills/frontend-profiler).` },
  { key: 'hub-leidslur', p: `SVIÐ: BRUNAHÓLFS-HUB OG GAGNALEIÐSLUR. Mældu ferskleika og heilsu: automation_runs (hvaða störf hafa brugðist eða ekki
keyrt — síðasta keyrsla, villur síðustu 14 daga), email_digest innsog (nýjasti póstur per pósthólf — aldrei innihald aggisigurds@gmail.com),
Tímavera, Ajour, Payday-speglarnir (nýjasta röð, payday-pull), postfang_tengsl/umsjonarpostur_tengsl (cron), app_problems (algengustu
villur síðustu 7 daga eftir kind og síðu — eru nýjar villur að hlaðast upp?). Kallaðu á GET-endapunkta hubbins sem eru read-only
(/api/verkefnalisti, /api/tengilidir?kennitala=…, aðra GET sem kóðinn sýnir að lesa aðeins) og mældu svartíma/villur. Opnaðu
brunaholf.netlify.app og jarvis.html í vafra (sömu skilyrði: skrif fölsuð, beacon óvirkt) og skráðu JS-villur. Sérfræðingar:
kerfisheilsa, gagnaleidslur, tengingar (í ${S}/bh/.claude/agents/).` },
  { key: 'kodi-slokkvitaeki', p: `SVIÐ: KÓÐAYFIRFERÐ SLÖKKVITÆKIS — breytingar síðustu 2 vikna. Í ${S}/sl: git log --since="${SIDAN}".
Leitaðu að RAUNVERULEGUM villum (ekki stíl): röng gögn skrifuð, skrif sem þurrka reiti (mjór Companies.list — sbr. #921/#923),
gleypt villuboð (supabase-js kastar ekki — .error hunsað), staða sem lifir aðeins í localStorage (bannað skv. reglu 15.10.2026),
lykkjur í MutationObserver, innerHTML-endurteikning á meðan skrifað er, og breytingar á vörðum leiðum (10/233/254, 121/pos.js,
payday-push, 153/187, 114, 309) án þess að ORYGGISNET.md hafi verið uppfært. Fyrir hverja villu: rekja raunverulega leið frá
notanda til tjóns og sýna hana (helst í Node vm eða vafra með fölsuðum skrifum). Settu líka fram hvort audit-* verðir ná yfir
nýju virknina. Sérfræðingur: netvordur (lestu .claude/agents/netvordur.md).` },
  { key: 'kodi-brunaholf', p: `SVIÐ: KÓÐAYFIRFERÐ BRUNAHÓLFS — breytingar síðustu 2 vikna. Í ${S}/bh: git log --since="${SIDAN}", aðallega
index.html (risastór — grep, aldrei lesa í heild) og netlify/functions. Leitaðu að raunverulegum villum: föll sem hrynja á jaðartilvikum
(tómt svar, vantar env), rangar upphæðir í reikninga-/efnislista-útreikningum (bokari), staða í localStorage/state.ui sem á að vera á
þjóni (regla 15.10.2026 — eina undantekningin er skyndiminni, tímabundin staða og bh_me), Supabase-lestrar án Range-síðuskiptingar sem
klippa við 1000 raðir, og CORS/aðferðavillur. Rekja hverja villu til tjóns með sönnun. Sérfræðingar: framendi, bokari.` },
  { key: 'deploy-ci', p: `SVIÐ: DEPLOY, CI OG INNVIÐIR. Mældu: GitHub Actions í aggisigurds-dev/slokkvitaeki og aggisigurds-dev/brunaholf (gh api — read
only): misheppnaðar keyrslur síðustu 14 daga og hvers vegna (deploy.yml, morning-deploy, audit/verdir); Netlify deploy-preview-villur
(vitað 31.10.2026: secret-scan felldi preview síðan Google Maps-lykillinn kom í js/config.js 15.10 — er það enn svo, og fellir það líka
framleiðslusmíðar Netlify Git-tengingarinnar?); fjölda framleiðslu-deploya síðustu 14 daga (regla: aðeins [deploy] — er kostnaðurinn í böndum?);
hvort lifandi build.json beggja síðna = nýjasta [deploy]-commit; opin PR sem hanga (gh api pulls state=open) og hvort þau eru
á eftir master. Notaðu mcp__Netlify__* read-tól ef þau hjálpa (site d22039b2-75f2-4206-b543-7c6176f2d181 fyrir Slökkvitæki).` },
]

phase('Úttekt')
const nidurstodur = await parallel(SVID.map(s => () =>
  agent(SAMEIGINLEGT + '\n\n' + s.p, { label: 'úttekt:' + s.key, phase: 'Úttekt', schema: FINN })
    .then(r => r ? Object.assign({ key: s.key }, r) : null)))
const allar = nidurstodur.filter(Boolean)
const alvarlegar = []
allar.forEach(r => (r.nidurstodur || []).forEach(f => { if (f.alvarleiki === 'krítískt' || f.alvarleiki === 'hátt') alvarlegar.push(Object.assign({ svid: r.key }, f)) }))
log(allar.length + ' svið skiluðu; ' + alvarlegar.length + ' krítískar/háar niðurstöður fara í sannreyningu')

phase('Sannreyning')
const SANN = {
  type: 'object',
  properties: {
    domar: { type: 'array', items: { type: 'object', properties: {
      titill: { type: 'string' },
      domur: { type: 'string', enum: ['staðfest', 'staðfest-en-vægara', 'hrakið', 'ómælanlegt'] },
      rok: { type: 'string', description: 'Óháð mæling: skipun + útkoma' },
      nyr_alvarleiki: { type: 'string' },
      tvitak_af: { type: 'string', description: 'Ef sama mál og önnur niðurstaða, titill hennar' },
    }, required: ['titill', 'domur', 'rok', 'nyr_alvarleiki', 'tvitak_af'] } },
  },
  required: ['domar'],
}
const domur = alvarlegar.length ? await agent(SAMEIGINLEGT + `

HLUTVERK: EFASEMDARMAÐUR. Hér eru ${alvarlegar.length} niðurstöður sem úttektar-agentar mátu krítískar eða háar. Reyndu að HRAKJA hverja
með ÓHÁÐRI mælingu (ekki endurtaka sömu skipun — finndu aðra leið að sama sannleika). Sjálfgefið: ef sönnunin stenst ekki eða tjónið
er ekki raunverulegt, dæmdu hrakið eða vægara. Merktu tvítök (sama rót í tveimur sviðum). Berðu hverja við ${S}/bord.json.

NIÐURSTÖÐURNAR:
` + JSON.stringify(alvarlegar, null, 1), { label: 'sannreyning', phase: 'Sannreyning', schema: SANN, effort: 'high' }) : { domar: [] }

return { svid: allar, domar: (domur && domur.domar) || [] }
