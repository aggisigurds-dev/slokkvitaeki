# Afhakað — vinnsla 06.09.2026 (kvöld, fram á nótt 07.09)

Lota Agnars + Claude Code. ☑ = komið út OG sannreynt (hvernig stendur við hvert). ☐ = opið.
Charlize-færslur 415–425. Commit-númer vísa í `slokkvitaeki` nema annað sé tekið fram (`bh:` = brunaholf).

## 1. Sími / öpp (fyrri hluti dags)
- ☑ **Króm-zoom á síma (353)** — S26 í Tölvusíðu-ham leggur út ~980 px; AppKrom skalar fasta krómið (haus, ☰, 📱▦🖥, 🎨, zoom-stika). Borðinn þrengdur svo allt komist fyrir á 360–411 dp (`4c4356d`, `009a710`, `ff61726`). Mælt í 980×1940-hermingu.
- ☑ **Öpp-stýriborð (354)** á Öpp-síðunni: tæki/útgáfa, króm-stærð, uppsettar öpp, árekstrar-athugun, endurhlaða/hreinsa SW.
- ☑ **Manifest per app** (`/api/app-manifest`) svo öppin stangist ekki á við uppsetningu.
- ☑ **Ársgrind á síma (356)** — tveir dálkar hlið við hlið, fast form á röðum (`b9a6112`, `93ef906`, `fb222ba`). Agnar: „snyrtilegra" → „hlið við hlið" → „óreglulegt" → fast form.
- ☑ Prófíl-spjöld 111/199/307/311 löguð (338 `[data-co-id]`-reglan, `cb27774`).

## 2. Kostnaðarreikningar (Borealis / Securitas)
- ☑ **Efniskostnaður**: droppsvæði + 📷 Mynda reikning fyrir símann (`bh:b89b602`, `bh:6d39a9c`), app-síða `br-efniskostnadur` í Fjármál + Boss (`0a4db50`).
- ☑ **op=bidur + kost_til_korfu** (`bh:481473b`), **bordi í Sölu (355)** þegar kúnni með 🧾 er valinn + viðvörun í brunakerfisskýrslu (`a488b79`). Sannreynt á kt 690425-0920.
- ☑ 🧺 → 🛒 alls staðar (`ce90df8`, `bh:6bd7917`).
- ☑ **Helluhraun 10 (ÞR+26157242)** er í Borealis-körfunni (punktur #27, línan „G-one brunastöð ×1 · 70.904"). „Setja í körfu" tvítekur ekki (kost_ref-sía í appi og þjóni). Færslurnar fjórar bera enn `sent_at: null` — Agnar merkir.

## 3. Prófíl-hlekkir hub ↔ app
- ☑ 🏢 Prófíll-flaga í Drög-stöð (02-spjöld, 03-haus, punktaspjöld) og Efniskostnaði → `#company/<id>` (`bh:bd4480d`, `bh:470c432`). `op=stada.kunnaIds`.
- ☑ **357 djúptenging** ræsingarþolin — 235 dugði ekki: ferskt `#company/202` endaði á `#sala` (218 speglar hashið, sala-lending t≈1500 ms, Companies.load endurteiknar). Grípa við hleðslu + tikk sem staðfestir Breyta-takkann (`3e3a3d5`…`4253ab2`). Sannreynt: ferskt `#company/1101` → Ask Arkitektar.
- ☑ **Inni í Boss/Fjármál**: hub-iframe má ekki setja `top.location.hash` (SecurityError, „ekkert gerir neitt") → postMessage + ack, `#_app-frame` falinn (`eb3bb3a`, `bh:f2505cd`). Sannreynt: smellur á Dynsalir í Boss opnaði prófílinn.
- ☑ **Kúnna-spjöld Drög-stöðvar** sýna punktana sjálfa + 🗑 eyða / ✎ opna / 🔗 Tengja kt; sími skrunar að Valið (`bh:312eeaf`). Sannreynt á 375 með tilraunapunkti (tengdur, svo eytt; raungögn ósnert).
- ☑ 357f: djúptengdur prófíll bíður eftir `DB.online` (annars „Slökkvitæki (0)") (`0fbbee0`).

## 4. Supabase-stífla (kvöld)
- ☑ Rót: 1.337 statement timeouts + 183 pool timeouts (30 tengingar) 19:40–20:45 → 504 á allt. `company-mail` (5–6 s, 7.670 póstar, 2× `tv_history_sites`) kallað við HVERJA hleðslu appsins (295 refresh líka með ferskt cache), 98 RPC/mín í toppi.
- ☑ Lagað: app_kv-cache á lista-svarið, 15 mín, stampede-lás, gamalt svar við villu, `?fresh=1` (`bh:f22f390`); 295 kallar aðeins þegar cache > 20 mín (`4f36d90`). Mælt: 0 köll með ferskt cache, 1 kall/1,2 s með tómt (áður 5,6 s).

## 5. Þjónustuborð (Verkefnalisti e3e61225 + 43661b9b)
- ☑ **358** reitur undir fyrirtækinu á VALIÐ MÁL: Opna fyrirtæki, Fyrri viðskipti, lifandi tækjalisti, „telst hvergi" (Í lagi/ok), úrelt dauf, síðasta úttektarsala (`08e4d41`…`3c3adfa`). Tillagan úr Cowork-lotu (350 var tekið); urelt leiðrétt.
- ☑ **358e skynjarar + hooks**: 🧾 kostnaðarreikningar bíða, 💳 ógreiddar sölur, ✉️ ósvaraður póstur, 📅 næsta skoðun/fram yfir, 📝 punktar í Drög-stöð, rauður punktur; Nýr reikningur í Sölu (kúnni valinn), Punktur í Drög-stöð, Senda póst (`bd96d4a`). Sannreynt á Borealis: 4 🧾 + 1 punktur.
- ☑ **fyrirtaeki_id á málin**: migration + index, 142 mál bakfyllt (nákvæmt nafn, 0 tvíræð; 631 einstaklingar/frjáls texti), ✏️ Tengja og nýtt mál skrifa id, 358f les id fyrst (🔗 fest / 📌 Festa) (`79b1ff2`). Sannreynt: mál #20 → Festa → SQL fyrirtaeki_id=916. Fundið: #916 hét „S\&H Invest ehf." með bakstriki — lagað.
- ☑ (í kóða, **ekki komið út**) **358g Vísbendingar um afgreiðslu** — sölur eftir stofndag málsins með TEGUND + línum, skráð skjöl; sönnunargögn, ALDREI sjálfvirk lokun (`d1a42bf`). Ástæða: „sala eftir á" var false fact (Hlíðasmári 15: R-000836 = reykskynjari/útkall, ekki úttektin).
- ☐ Opin mál á borðinu eru **99** (753 lokuð/geymd/eytt): 42 Cowork-verklistar, 18 póstar, 31 handskráð, 4 sími, 3 í vinnslu. Engu lokað — Agnar ákveður mál fyrir mál með vísbendingunum.

## 6. Eitt samskiptabox á prófílnum
- ☑ **359**: 295-boxið falið meðan 286-kortið er á skjánum; umferðarljós + merki + ⭐/🔕 sem ræma í 286; „⬇ Eldri póstar" í stað „Öll póstsaga" (`39bf257`, 359b í `0010809`). 286 fékk 20 s ventil á `_running` (`ade35d7`). Sannreynt á Skeljungi (3 póstar, eldri: engir).

## 7. Frontend-profiler (Agnar: „öflugt skill … yfirfarið allt svona")
- ☑ Mælt ~2.500 DOM-breytingar/s í kyrrstöðu. Rætur: 01-sala-suite vs 06-pos-fixes um `.sm-toolbtn` (170/s, `8b10344`); 244-sidebar-svg-icons `<path/>` ≠ `<path></path>` (1.170/s, `ec4af77`, nafn-samanburður `104288a`); 353/332/230 skrifuðu attribute í hverri umferð (`3d7efce`). Eftir: ~25/s.
- ☑ Skill `.claude/skills/frontend-profiler/SKILL.md` (aðferð A/B + reglur). Eftirstöðvar á Verkefnalista d9024a61.
- ☑ Aukafundur: debounce-vaktir hlupu ALDREI á síðunni (286 skjalfesti það 30.07) → throttle í 358/359.

## 8. Ræsihleðsla + útlit
- ☑ **360 ræsi-skyndiminni**: síðasta loadAll + Companies.list í IndexedDB, vökvað við ræsingu, ferskt í bakgrunni (`eb8c14f`, `3c0a25c`). Mælt: gögn 1,2 s (áður ~4,3 s), Örkin 57 tæki á 3,4 s.
- ☑ **224**: tækjadálkarnir vefja — fasti 780 px hægri dálkurinn kreisti töfluna í ~100 px á síma í Tölvusíðu-ham (skjáskot Agnars, Örkin) (`0fbbee0`).
- ☑ CO2 samræmt: 5 tæki CO₂ → CO2 (Agnar já), valgildi í modal.js/176, merkimiði 00-legacy (`25aeaff`). Vöruheiti enn blönduð (ekki snert).
- ☑ Textavillur: „Beindu myndavélinni að QR-kóðanum", „sjálfkrafa merkt til förgunar" (`39bf257`).

## 9. Verkefnalisti + minni
- ☑ e3e61225 (Þjónustuborð → fyrirtæki) → í yfirferð. d9024a61 (profiler-eftirstöðvar) nýtt. Sex verk úr betrumbóta-listanum: b6a4bc81 (RLS/anon), 4a578011 (ein sókn per töflu), 80e8e089 (company-mail scheduled), 43661b9b (fyrirtaeki_id — í yfirferð), 2afaab7d (einn prófíl-teiknari), c6ea8ea6 (gagnahreinsun).
- ☑ Charlize 415–425, MINNISBOK, minnisskrár: djúptenging, Supabase-stífla, profiler, ræsi-skyndiminni, Netlify.

## ☐ OPIÐ — LOKAR ÖLLU
- ☐ **Netlify „Usage exceeded" frá ~01:19 07.09**: BÆÐI `slokkvitaeki.netlify.app` og `brunaholf.netlify.app` niðri (503, líka static). Team Brunaholf (Pro) yfir kvóta. Aðeins Agnar getur opnað: app.netlify.com/teams/aggisigurds → Billing/Usage. Orsök að stórum hluta þessi lota: 32 + 7 ýtingar (hver = 2 byggingar), 60–80 prófunarhleðslur × 5 MB, fallastormar.
- ☐ Þegar opnast: `d1a42bf` (358g) fer út með næstu ýtingu; síðan (a) ein byggingarleið í stað tveggja, (b) `immutable` cache á `/js/_bundle-*.js` (nú 1 klst) og hubbinn `/js/*` (nú 0), (c) sjaldnar deploy, (d) `timavera-maeting` `*/10` → `*/30`.
- ☐ Samskiptabox: 295-umferðarljósið þekkir ekki Skeljung (netfang ekki í listanum) þótt 286 sjái ósvaraða spurningu — sama rót og villuleit-reglan um nafna-/netfangs-samsvörun.

## Lærdómar kvöldsins (fyrir næstu lotur)
1. Mæla fyrst („allt hægt" var pottstífla, ekki UI; „gerist ekkert" var SecurityError).
2. Sala eftir á ≠ mál afgreitt. Tólin sýna sönnunargögn, Agnar lokar.
3. Auto-sync `[skip ci]` gleypir deploy: committa strax eða tómt commit.
4. Tugir deploy-a + prófunarhleðslur á einu kvöldi tæma Netlify-kvótann — og lokunin tekur ALLT niður.
