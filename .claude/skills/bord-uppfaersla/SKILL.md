---
name: bord-uppfaersla
description: Verkferlið „Uppfæra Þjónustuborðið" — fara yfir öll opin mál á Þjónustuborðinu og færa borðið til samræmis við raunveruleikann: vinna úr því sem Agnar hefur svarað (✓ ▶ ✕ 💬), finna mál sem eru þegar leyst (reikningur sendur, krafa greidd, kreditfært, pósti svarað) og loka þeim með sönnun, og skila stuttum lista yfir það sem raunverulega bíður. Forráðamaður er `samthykktir` (regluverkið er í `.claude/agents/samthykktir.md`); peningahliðin er `rukkari` / `sala-reikningar`. Kveikjuorð: uppfæra þjónustuborðið, uppfæra borðið, hverju er búið að svara, hvað er búið að svara, klára svörin, yfirfara svör, hvaða reikningar eru sendir, er búið að senda reikning, er búið að rukka, hreinsa borðið, borðið úrelt, loka því sem er búið, hvað bíður í raun.
---

# Uppfæra Þjónustuborðið

Skráð 11.11.2026. Agnar: „bara það að uppfæra þjónustuborðið, sjá hverju er búið að svara, eða senda reikninga
fyrir, hefur gengið mjög illa." Þetta ferli er nákvæma leiðin. Regluverkið á bak við það er
`.claude/agents/samthykktir.md` — **lestu kaflana „Biðröðin", „Rútínan" og „Reglurnar sem kostuðu eitthvað" þar áður
en skref 1 hefst.** Standi eitthvað þar öðruvísi en hér, ræður agent-skráin og þú segir frá muninum.

## Svona er þetta keyrt (gildir fyrir hvaða módel sem er)
1. Lestu ALLA þessa skrá og kaflana þrjá í `samthykktir.md` áður en fyrsta fyrirspurn er keyrð.
2. Farðu skrefin Í RÖÐ, eitt mál í einu. Slepptu engu skrefi og bættu engu við.
3. Hver fullyrðing á sér fyrirspurn sem þú keyrðir Í ÞESSARI LOTU. Texti máls, minni og eldri skjöl eru EKKI mæling.
4. Máli er aðeins lokað með sönnun úr gögnunum sem stendur í nótunni. „Lítur út fyrir að vera búið" lokar engu.
5. STOPPAÐU og spyrðu ef: ✓ lofar aðgerð sem fer út (krafa, kredit, póstur) og forsendan stenst ekki endurmælingu;
   tvær heimildir stangast á; eða þú ert ekki viss hvaða mál þú ert að loka.
6. Þú sendir aldrei póst og aldrei kröfu sem ✓ nefndi ekki orðrétt. Þú stofnar ekki ný mál (samþykkisþakið) —
   ný atriði fara á Verkefnalistann eða sem lína á mál sem er til.

## Skref 0 — grunnmæling (skrifuð niður áður en nokkru er breytt)
```sql
-- dálkarnir sem til eru (ekki giska á heiti)
select column_name from information_schema.columns where table_name='thjonustubeidni' order by ordinal_position;
-- staðan núna
select coalesce(status,'(null)') status,
       count(*) alls,
       count(*) filter (where tags::text like '%samthykki%') bida_svars,
       count(*) filter (where tags::text like '%svar:%')     svarad
from thjonustubeidni where deleted_at is null and archived_at is null group by 1 order by 2 desc;
```
Skrifaðu tölurnar í svarið sem „FYRIR". Stemmi þær ekki við það sem Agnar sér á borðinu (Mál á borðinu / Bíður
samþykkis hjá þér / Hjá Claude eftir samþykki í Vinnusamantekt): stoppaðu og finndu muninn fyrst.

## Skref 1 — það sem Agnar hefur svarað
Svar KEMUR Í STAÐ merkisins `samthykki`. Leitaðu því að `svar:`-tagi eða línunni „— Samþykkt: Agnar" í `notes`,
aldrei að `samthykki` (það finnur aðeins ósvöruð mál).
```sql
select id, title, (select x from jsonb_array_elements_text(tags) x where x like 'svar:%' limit 1) svar,
       status, updated_at, fyrirtaeki_id, notes
from thjonustubeidni
where tags::text like '%svar:%' and coalesce(status,'') <> 'lokad' and deleted_at is null
order by updated_at;
```
Fyrir HVERT mál, í röðinni peningar → gagnaleiðréttingar → kóði:

| Svar | Hvað þú gerir |
|---|---|
| `svar:samthykkt` | a) Lestu nótuna til enda; efsta útgáfan gildir. b) ENDURMÆLDU forsenduna í dag (reikningurinn, talan, staðan). c) Standist hún: gerðu NÁKVÆMLEGA það sem ✓ lofaði, ekki meira; afrit fyrst (`backup_<ÁÁÁÁMMDD>_<efni>`). d) Lestu til baka og, ef það sést á skjá, athugaðu birtinguna. e) Lokaðu (sjá „Að loka máli"). Standist hún EKKI: ekkert framkvæmt, leiðréttingin skrifuð í nótuna, málið aftur í bið með `samthykki`. |
| `svar:endurmeta` | Skýring Agnars TROMPAR tillöguna. Lestu hana, endurmældu, skrifaðu nýja tillögu efst í nótuna („Endurmetið <dags>") og settu málið aftur í bið. Ekkert framkvæmt nema skýringin segi berum orðum hvað á að gera. |
| `svar:vinnsla` | Hann vill millispor — lestu hvað ▶ sagði, vinndu það eitt, skrifaðu niðurstöðuna í nótuna. Málið lokast ekki. |
| `svar:hafnad` | Ekkert gert. Staðfestu að staðan sé `lokad`; sé hún það ekki, lokaðu með línunni „Hafnað af Agnari <dags>". |

## Skref 2 — opin mál sem eru þegar leyst („er búið að senda reikning?")
Fyrir hvert opið mál sem EKKI er með `svar:` — lestu titil og nótu og finndu auðkennin: R-númer, kt,
`fyrirtaeki_id`, netfang/þráð. Mældu svo, eftir því um hvað málið snýst:

**Reikningur / krafa** — heimildin er `solur` og Payday, ekki texti málsins:
```sql
select id, num, customer_nafn, customer_kt, samtals, status, is_credit, credit_of,
       created_at::date stofnad, krafa_sent_at, dk_invoice_id, paid_at, hidden
from solur where num = '<R-númer>' or credit_of = (select id from solur where num = '<R-númer>');
```
| Það sem sést | Úrskurður |
|---|---|
| `krafa_sent_at` OG `dk_invoice_id` sett, enginn kredit | SENT. Mál sem spurði „á að senda?" er leyst. |
| `paid_at` sett | GREITT. Mál um ógreitt er leyst. |
| Kreditröð til (`credit_of`) og ný röð á sama kúnna á eftir | KREDIT + ENDURGERÐ. Lestu nýju röðina áður en nokkuð er sagt órukkað. |
| Kreditröð til, engin ný | KREDITFÆRT — það er hvorki greiðsla né sending. Málið er OPIÐ nema það hafi snúist um að kreditfæra. |
| `krafa_sent_at` sett en `dk_invoice_id` tómt, eða öfugt | ÓLJÓST. Payday-spegillinn getur verið úreltur (uppfærist um kl. 10 og 15 UTC): keyrðu `payday-pull` fyrst, mældu aftur, annars ÓMÆLT. Ekki lokað. |
| Fyrir 07.05.2026 | Lestu líka `stolpi_reikningar` á `kt10`; opið við yfirtöku telst greitt fyrri eigendum. |

Einstaklingar staðgreiða (engar kröfur). „Merkt sent í kerfinu" sannar ekki að krafa sé í Payday.

**Póstur / svar til kúnna:**
```sql
select received_at, folder, sender_email, left(to_addresses::text,80) til, subject
from email_digest where thread_id = '<þráður>' or subject ilike '%<efni>%' order by received_at;
```
SVARAÐ aðeins ef SENT-póstur er í þræðinum EFTIR síðasta bréf kúnnans, eða þriðji aðili svaraði (lestu
`to_addresses` og allan þráðinn). Drög eru ekki svar.

**Gagnaleiðrétting / skoðun / skýrsla:** mældu gagnið sjálft (röðin í `fyrirtaeki`, `uttaeki`, `customer_documents`,
`arsskodun_report_facts`). Er það komið í það horf sem málið bað um?

Úrskurður per mál, einn af: **LEYST** (sönnun) · **OPIÐ** (hvað vantar) · **ÚRELT** (forsendan á ekki lengur við —
sönnun) · **TVÍTAK AF #N** · **ÓMÆLT** (hvað vantar til að mæla).

## Að loka máli (gildir um skref 1 og 2)
Aðeins LEYST, ÚRELT og TVÍTAK lokast. Lestu titilinn úr grunninum í sömu skipun og þú lokar — aldrei loka á `id` einu:
```sql
update thjonustubeidni
set status='lokad', svarad_at=now(),
    notes = coalesce(notes,'') || E'\n\n— UNNIÐ <dd.mm.áááá> (Claude). <hvað var gert / hvað mældist> Staðfest: <fyrirspurnin og talan>.'
where id = <id> and deleted_at is null
returning id, title, status;
```
Berðu `title` sem kemur til baka saman við málið sem þú ætlaðir að loka. TVÍTAK: lína í BÆÐI málin sem vísar á hitt;
það eldra/fyllra heldur. Engu máli er eytt.

## Skref 3 — birtingin og eftirmæling
1. Keyrðu grunnmælinguna úr skrefi 0 aftur → „EFTIR". FYRIR − lokað = EFTIR; stemmi það ekki, finndu hvers vegna.
2. Skrif lesið til baka er ekki birting: athugaðu á borðinu (eða `node tools/combo-yfirlit.cjs`) að teljararnir hafi
   hreyfst. Geymd mál og falin mál teljast ekki opin.
3. `node tools/audit-skorun-lista.cjs` — EXIT lesið sér.

## Skil til Agnars (hann skimar)
```
FYRIR → EFTIR:  opin N → M · bíða svars N → M · svöruð óunnin N → 0
UNNIÐ ÚR SVÖRUM:  #id titill · hvað gert · mælingin
LOKAÐ SEM LEYST:  #id titill · sönnunin (R-númer, dags sendingar/greiðslu, dags svars)
STENDUR EFTIR:    #id titill · hvað stoppar · hvað þarf frá Agnari (eitt atriði)
ÓMÆLT:            #id · hvað vantar
```
Mest fimm línur í „STENDUR EFTIR" sem þurfa hann; hitt er talið.

## Lokagátlisti — verkið er EKKI búið fyrr en hvert hak er merkt
Skilaðu listanum í lokasvarinu með ✔ eða ✘ og einni línu um HVERNIG. ✘ er leyfilegt svar; að sleppa lið er það ekki.
Klárist lotan ekki: segðu á hvaða máli (#id) var hætt, svo næsta lota haldi áfram þar.
- [ ] FYRIR-tölur skráðar áður en nokkru var breytt
- [ ] Hvert `svar:`-mál er unnið, sett aftur í bið með skýringu, eða talið upp sem óunnið með ástæðu
- [ ] Forsenda hvers ✓ var endurmæld í dag áður en framkvæmt var
- [ ] Hvert opið mál án svars á úrskurð (LEYST / OPIÐ / ÚRELT / TVÍTAK / ÓMÆLT)
- [ ] Hvert lokað mál ber „— UNNIÐ"-línu með mælingunni og titillinn var lesinn til baka
- [ ] Ekkert sent (póstur, krafa) sem ✓ nefndi ekki; ekkert nýtt mál stofnað
- [ ] EFTIR-tölur stemma við FYRIR − lokað, og teljararnir á borðinu hreyfðust
- [ ] `app_settings.verkferli_keyrslur.bord-uppfaersla` uppfært (sjá „Skrá keyrslu" í `jarvis.md`)
- [ ] Keyrslan skráð: `select app_settings_merge('{"verkferli_keyrslur":{"bord-uppfaersla":{"sidast":"ÁÁÁÁ-MM-DD","lota":"<módel>"}}}'::jsonb);` — aðeins ef ferlinu er LOKIÐ; boxið „Verkferli tilbúin til keyrslu" les þetta
