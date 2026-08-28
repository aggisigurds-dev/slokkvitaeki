# Kerfin — ID, töflur, möppur

## Samhengið fyrst

**Brunahólf keypti Slökkvitæki ehf í maí 2026.** Appið sem hér er lýst var byggt frá grunni
eftir þá yfirtöku. Fyrri eigendur héldu takmarkað skipulag og gleymdu 50–60 heimsóknum 2025 og
svipuðum fjölda 2024; bókhaldið var í Stólpa.

Þetta breytir því hvernig gögnin eru lesin: **gloppa í sögunni fyrir maí 2026 er arfur, ekki
gagnagrunnsvilla**, og „Stofnað"-dagsetning í appinu er innsláttardagur en ekki samningsdagur.
Það sem gerðist fyrir yfirtöku er aðeins til í Stólpa, í pósti eða á pappír.

Stöðugi kjarninn. Breytist eitthvað hér, skrifaðu leiðréttinguna í `charlize_knowledge`
(scope `kerfi`) samdægurs og láttu Agnar vita að skráin þurfi uppfærslu.

**Engir lyklar í þessari skrá.** Aðeins hvar þeir fást.

## Yfirlit

| Kerfi | Hvað | Hvar lykill fæst |
|---|---|---|
| Supabase | `osfdzskyvisifcwyjkuk` — sameiginlegur grunnur beggja appa | Supabase dashboard → Project settings → API |
| Netlify | slokkvitaeki.netlify.app (site `d22039b2-75f2-4206-b543-7c6176f2d181`), brunaholf.netlify.app | Netlify → User settings → Applications → Personal access tokens (rennur út milli lota) |
| Apps Script | „Brunahólf verkfæri" `1nXtojzoJGnMdkbCgHzTXZ5jnRg3ewnDE-RUBd9Rb42_0fFC-IGajenL9` — mæting/veikindi + hub | clasp login |
| Payday | reikningagerð; API tengt Slökkvitæki, aðeins hálft fyrir Brunahólf | Payday-stillingar |
| Teya | kortagreiðslur (POS frá ~1. júlí 2026), daglegt uppgjör í tölvupósti | — |
| Tímavera | tímaskráning, bein API-tenging síðan 17. júlí 2026 (ekki lengur um luna-bridge) | — |
| Redder | efnisreikningar í pósti á bokhald@brunaholf.is | — |
| Drive | úttektarskýrslur + reikningar | Google-aðgangur |

## Supabase — töflur eftir fyrirtæki

**Slökkvitæki:** `uttaeki` (tæki), `lanstaeki`, `verkbeidnir`, `vidskiptavinir`, `solur`,
`sala_transactions`, `vorur`, `payday_invoices_slokk`, `verkdagbok` (= þjónustuborð).
`service_visits` er TÓM og ónotuð.

**Brunahólf:** `customers_base` (þar á meðal `rekstrarfelag`), `fyrirtaeki`,
`customer_documents`, `skjalaheiti_log`, `invoices`, `timavera_meta`.

**Sameiginlegt:** `app_kv` (stakar stillingar, t.d. `master_doc_sheet_id`, `allt_folder_id`),
`verkefnalisti` (verkefnaborð), `automation_triggers` (luna-bridge watcher, pollar á mínútu),
`charlize_knowledge` (þessi skill).

Öryggisathugasemd sem stendur: **RLS er slökkt á 66 töflum** — anon-lykillinn getur lesið og
skrifað allt. Skráð sem áhætta, ekki leyst.

## Deploy — Slökkvitæki

Container-útgangur á `api.netlify.com` er lokaður. Deploy fer fram í vafra-flipa á
slokkvitaeki.netlify.app með `fetch()`:

1. sækja manifest `/api/v1/sites/{id}/files`
2. `POST /deploys` með SHA-1 hash-korti
3. `PUT /deploys/{id}/files/{path}` — aðeins skrárnar í `deploy.required`
4. `/restore` til að birta

Kóðinn er **modular patch-skrár undir `/js/patches/`** (t.d. `240-reikninga-postur.js`) —
`patch-master.js` er úrelt tilvísun. ~240 stakar JS-skrár hlaðast per load; bundling er á
verkefnalistanum.

## Drive-möppur

| Mappa | ID |
|---|---|
| Allt (skýrslur, flat) | `11Gf4yUeR6tQ2HcFxWk-50IFQl2xBUQOg` |
| MASTER úttektarskýrslur | `1VSRRw6O8U6lU8WzZxA8CkLtrAmiU07mg` |
| MASTER reikningar | `1FHHX99LRB_9w_LqwHIY57T4l9mLMID7p` |
| Reikningar — Redder | `1GXs9fVXfl_nU2L8xBy_aDIKdiev8lgIt` |
| Cowork/Apps Script bootstrap | `13qboszs2EtaKZ46CmrNzmmiqaz1KU_be` |

Skjala-masterinn er **eitt Sheet**: `12hFAjgiKMOGpgjaargAtFTE5otny6SMSUYPL51z5sg8`, læst í
`app_kv.master_doc_sheet_id`. **Reglan: verkfæri UPPFÆRA það ID, búa aldrei til nýtt.**
Þess vegna margfölduðust „master-skjölin" áður. Placeholder-sheetið
`1Jy_BGoWhBpJbiz2bPXOU8WRgdSs5gfBso6DLxbDDCUk` er ónotað og má henda.

## Póstföng og flæði

| Netfang | Hlutverk |
|---|---|
| eldklar@eldklar.is | aðal-kúnnapóstur (Gmail /u/2) |
| bokhald@eldklar.is | bókhald + Teya-uppgjör (Gmail /u/3) |
| bokhald@brunaholf.is | Redder efnisreikningar (Outlook/365) |

Allt syncar í Thunderbird yfir IMAP, svo Gmail-label birtast sem möppur. Redder-mappan
`INBOX.sbd\Redder ehf` **verður að vera SUBSCRIBED** — annars keyrir `redder.js` án þess að
sjá neitt (það gerðist í tvær vikur).

## Vélar og skráasafn

Alltaf-á PC, aðgengileg um Tailscale + RDP eða SSH. Verkefni undir `C:\projects\`
(`slokkvitaeki`, `brunaholf`, `luna-bridge`) **og** í `%USERPROFILE%\Desktop\Claude workshop\`
á vél með Windows-reikninginn `Slokkvitaeki` (hinn heitir `Notandi`).

Gildra sem hefur bitið: sama branch-nafn í þremur repo-um, og grunnt (shallow) clone sem
„sér ekki" gamla commit-ið og tilkynnir það horfið. Mappunafn segir ekki hvaða repo þetta er —
`git remote -v` gerir það.
