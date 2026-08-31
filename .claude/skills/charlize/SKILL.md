---
name: charlize
description: Charlize er sameiginlegi þekkingar- og minnisgrunnur Agnars fyrir Slökkvitæki ehf. og Brunahólf — ein Supabase-tafla (charlize_knowledge) sem öll AI-verkfærin (Claude Code, Cowork, spjall, Sara) lesa úr og skrifa í. Use this skill whenever work touches Slökkvitæki or Brunahólf systems, data or history — before changing anything in Supabase, Netlify, Apps Script, Payday, Teya, Tímavera, Redder or Drive; when asking or answering „hvernig var þetta aftur", „af hverju gerðum við þetta svona", „hvaða tafla eða mappa eða ID er þetta", „hvað lærðum við", „muna þetta", „skrá þetta hjá Charlize"; when a session ends with something worth remembering; or when two sources contradict each other. Also use it whenever Agnar says remember, muna, skrá, þekkingargrunnur, minnisgrunnur or knowledge base — and use it proactively at the start of any multi-step work on either business, even if he does not name it. Kveikjuorð: muna, skrá, Charlize, hvernig var þetta, þekkingargrunnur. Villuleit-mynstur skráist hér (topic villuleit / variant).
---

# Charlize — þekkingargrunnurinn

Sara skráir úttektir. **Charlize man.**

Agnar keyrir tvö fyrirtæki, þrjú til fjögur AI-verkfæri og hátt í hundrað töflur. Sama
uppgötvunin hefur verið gerð þrisvar af því hún lifði bara í einu spjalli. Charlize er staðurinn
þar sem lærdómurinn lifir af lotuna — ein tafla, læsileg öllum verkfærunum.

**Grunnreglan: lestu áður en þú breytir, skrifaðu áður en þú lokar.**

## Hvar gögnin liggja

Supabase `osfdzskyvisifcwyjkuk`, tafla **`charlize_knowledge`**, virkt view **`v_charlize_active`**.
Ef taflan er ekki til: keyrðu `scripts/setup.sql` í SQL Editor (býr líka til view og index).

| Dálkur | Hlutverk |
|---|---|
| `scope` | `slokkvitaeki` · `brunaholf` · `baedi` · `kerfi` · `folk` · `kunni` |
| `topic` | stutt slug: `solur`, `payday`, `drive`, `teya`, `postur`, `deploy` |
| `fact` | **ein setning, ein staðreynd.** Þetta er það sem lesið er. |
| `detail` | valfrjálst — dæmi, SQL, hvernig þetta uppgötvaðist |
| `source` | hvaðan: `agnar`, `sql`, `skjámynd`, `kóði`, `spjall 22.7` |
| `confidence` | `confirmed` · `likely` · `unverified` |
| `status` | `active` · `superseded` · `wrong` |
| `superseded_by` | id-ið sem tók við |
| `agent` | `chat` · `claude-code` · `cowork` · `sara` |

## Að lesa — alltaf fyrst

Áður en þú snertir gagnagrunn, deploy, Drive-möppu eða reikning:

```sql
select topic, fact, detail, confidence, created_at
from v_charlize_active
where scope in ('slokkvitaeki','baedi')      -- eða brunaholf
  and (fact ilike '%payday%' or topic = 'payday')
order by created_at desc;
```

Alltaf `v_charlize_active`, aldrei `charlize_knowledge` beint í lestri — annars koma
úreltar færslur með. Finnist ekkert: **segðu það**, ekki giska. Óskráð er óvitað.

## Að skrifa — í lok lotu, ekki jafnóðum

Ein færsla per staðreynd:

```sql
insert into charlize_knowledge (scope, topic, fact, detail, source, confidence, agent)
values ('slokkvitaeki','solur',
        'solur.athugasemdir prentast beint á reikninginn sem "vegna"-texti undir kt',
        'Innri vinnslunótur eiga heima í krafa_note. Uppgötvað 22.7 þegar status-texti lenti á kúnna.',
        'sql','confirmed','chat');
```

**Það sem á heima hér:** hvernig kerfin hegða sér í raun, reglur sem bíta, af hverju eitthvað var
valið, ID sem eru föst, orðalag sem er rétt, gildrur sem hafa kostað tíma.

**Það sem á EKKI heima hér:**
- Verkefni og staða — þau eiga heima á `verkefnalisti` (assigned_agent).
- Tölur dagsins, upphæðir, hvað var gert í þessari lotu. Charlize geymir reglur, ekki dagbók.
- **Lyklar, tokens, lykilorð, kennitölur einstaklinga.** Skráðu *hvar* lykillinn er
  („Netlify PAT sæktu í User Settings → Applications"), aldrei gildið. Netlify-token hefur
  þegar lekið inn í nótur einu sinni — það endurtekur sig ekki hér.
- Ágiskanir merktar sem staðreyndir. Notaðu `confidence='unverified'` og segðu hvað vantar.

## Þegar eitthvað reynist rangt

Aldrei `delete`. Gamla færslan á að sjást hafa verið röng — það er hluti af lærdómnum:

```sql
update charlize_knowledge set status='superseded', superseded_by = <nýtt_id>
where id = <gamla_id>;
```

`status='wrong'` þegar ekkert kemur í staðinn (t.d. falskt vandamál sem var aldrei til).
Fals-lærdómur er verðmætur: 29. júlí fór klukkutími í viðvörun um „röngu repo" sem var
ekki til. Sú færsla á að standa svo næsti agent eyði ekki sama tíma.

## Kúnnaminni — fyrirtæki í þjónustu

`scope='kunni'` er fyrir þekkingu um **eitt tiltekið fyrirtæki í þjónustu**: hvar á að leggja,
hver hleypir inn, hvar tækin eru falin, á hvaða netfang reikningurinn á að fara, hvað fór
úrskeiðis síðast. Þetta er hlutinn sem sparar mesta tímann — það sem sá sem fór síðast veit og
enginn annar.

Tengt á **kennitölu fyrirtækisins** (skylda), auk `customer_base_id`/`fyrirtaeki_id` þegar þau
eru þekkt. Kennitalan er lykillinn af því hún lifir af nafnabreytingar og part-dups.

Fyrir heimsókn eða póstsvar:

```sql
select topic, fact, detail from v_charlize_kunni where kennitala = '<kt>';
```

**Aldrei hér inni:** aðgangskóðar og lyklaboxkóðar (RLS er slökkt — vefurinn les þessa töflu),
persónukennitölur eða einkanúmer, skoðanir á fólki, tækjalistinn sjálfur (hann er í `uttaeki`).

Uppsetning: `scripts/setup-kunnar.sql`. Fullar reglur: `references/kunnaminni.md` — **lestu
hana áður en þú skrifar fyrstu kúnnafærsluna.**

## Uppskera úr artifacts

Það liggja hundruð skráa eftir í Cowork og á PC-num — patches, Apps Script, HTML-frumgerðir,
SQL, brúr. `scripts/harvest.py` skannar möppu og skilar tvennu: **artifact-skrá**
(`charlize_artifacts` — hvað er til, hvað það gerir, hvað er tvítekið) og **kandídata**
(`charlize_inbox` — línur sem líta út eins og lærdómur).

```bash
python scripts/harvest.py "C:\projects\brunaholf" --system brunaholf --out uppskera.sql
```

**Uppskera fer aldrei beint í `charlize_knowledge`.** Hún lendir í biðstofu og Agnar hleypir
henni inn með `charlize_approve(id)`. Sjálfvirk innsetning myndi fylla grunninn af óstaðfestum
kóðaathugasemdum — og grunnur sem enginn treystir er verri en enginn grunnur. Búast má við að
hafna meirihlutanum; 10 góðar færslur úr 200 kandídötum er góð uppskera.

Ein mappa í einu. Skrár sem innihalda lykla eru merktar og **engir kandídatar teknir úr þeim**.
Uppsetning: `scripts/setup-artifacts.sql`. Verkferlið: `references/uppskera.md`.

## Tengiliðir og netföng

`charlize_contacts` tengir netföng og lén við kennitölu fyrirtækis, svo hægt sé að svara
spurningunni „hvaða fyrirtæki er þetta?" þegar póstur berst. `scripts/mail_contacts.py` les
Thunderbird-mbox (INBOX **og** Sent) og parar sendendur við fyrirtækjalista eftir léni:

```bash
python scripts/mail_contacts.py --mbox "<...>\ImapMail\imap.gmail-2.com\INBOX" \
                                --mbox "<...>\ImapMail\imap.gmail-2.com\Sent" \
                                --felog fyrirtaeki.csv --out tengilidir.sql
```

Kerfispóstur (github, payday, barki, teya, markaðspóstur) og eigin lén eru síuð burt.
Hlutverk er lesið af netfanginu sjálfu (`bokhald@` -> bókhald, `husvordur@` -> húsvörður).
Allt lendir sem `status='pending'` — lén-pörun er ágiskun og þarf yfirferð.

**Yfirlit fyrir eitt fyrirtæki**, áður en þú svarar pósti eða ferð í heimsókn:

```sql
select charlize_yfirlit('<kt>');
```

Skilar textablokk: heiti, tengiliðir með hlutverki, og allt kúnnaminnið flokkað eftir efni.

Uppsetning: `scripts/setup-tengilidir.sql` — **kveikir á RLS** á tengiliðatöflunni, því hún
geymir netföng viðskiptavina og anon-lykillinn les annars allt.

## Tvö fyrirtæki, ekki eitt

Slökkvitæki og Brunahólf eru **aðskilin fyrirtæki**, ekki tvö vörumerki. `customers_base`,
`fyrirtaeki`, `customer_documents` og Drive-mappan „Brunakerfi" tilheyra **Brunahólfi**.
`uttaeki`, `solur`, `verkbeidnir`, `vidskiptavinir` tilheyra **Slökkvitæki**. Þau deila
Supabase-verkefni — það gerir þau ekki að sama fyrirtækinu. Merktu `scope` rétt; `baedi`
aðeins þegar staðreyndin á sannarlega við bæði.

## Þegar heimildir stangast á

Röðin er föst: **gagnagrunnurinn > skjámynd frá Agnari > kóði í repo > eldri Charlize-færsla
> minni úr spjalli.** Rekist tvennt á, keyrðu fyrirspurnina og láttu grunninn skera úr — skrifaðu
svo niðurstöðuna inn og supersede-aðu það sem var rangt. Gamlar færslur eru ekki heilagar.

## Reference-skrár

Lesnar eftir þörf, ekki allar í einu:

- `references/kerfi.md` — kerfin, ID, töflur, möppur, hver tengist hverju. **Lestu áður en þú
  leitar að ID eða giskar á töflunafn.**
- `references/reglur.md` — reglurnar sem bíta: reikningaflæðið, kröfuyfirlit, deploy, sync.
  **Lestu áður en þú skrifar í `solur`, deployar eða snertir Payday/Teya.**
- `references/kunnaminni.md` — kúnnaminni fyrir fyrirtæki í þjónustu: hvað má skrá, hvað ekki,
  hvernig það tengist kennitölu. **Lestu áður en þú skrifar `scope='kunni'`.**
- `references/tengilidir.md` — hvernig netföng eru tengd, hvað má skrá um tengiliði.
- `references/uppskera.md` — hvernig artifacts eru skannaðir, yfirfarnir og samþykktir.
  **Lestu áður en þú keyrir harvest.py.**
- `references/agentar.md` — verkaskipting Claude Code / Cowork / spjall / Sara og hvernig verk
  eru afhent. Lestu þegar spurt er hver á að gera hvað.
- `references/ordabok.md` — íslensku hugtökin og hvað þau þýða í gögnunum.

Reference-skrárnar eru **stöðugi kjarninn** (breytist sjaldan). Taflan er **lifandi hlutinn**.
Sé eitthvað í reference-skrá orðið rangt: skrifaðu leiðréttinguna í töfluna strax, og segðu
Agnari að skráin þurfi uppfærslu — ekki treysta á að þú munir það síðar.
