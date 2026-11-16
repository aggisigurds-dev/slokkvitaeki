# Tengiliðir — að tengja póst við fyrirtæki

Markmiðið er eitt: þegar póstur berst á eldklar@eldklar.is á að vera hægt að segja strax
**hvaða fyrirtæki þetta er, hver þetta er þar, og hvað við vitum um þau.** Ekkert meira.

## Þrjú þrep

1. **Lénið** (`gara.is` -> Gára ehf) er sterkasti lykillinn og eldist best. Fólk hættir, lén
   lifa. Skráðu lénið alltaf, líka þegar netfangið er skráð.
2. **Netfangið** (`bokhald@gara.is`) segir hlutverkið. Hlutverk er verðmætara en nafn — það
   heldur þegar starfsmaðurinn hættir.
3. **Kennitalan** tengir svo við allt hitt: skýrslur, sölur, kúnnaminni.

Lén sem tengist mörgum félögum (rekstrarfélög, `eignaumsjon.is` fyrir tugi húsfélaga) er
ekki villa — það er raunveruleikinn. Þá þarf heimilisfang eða efni póstsins til að skera úr,
og félagið sem lénið tilheyrir á að vera skráð sem umsjónaraðili, ekki sem félagið sjálft.

## Að keyra

```bash
python scripts/mail_contacts.py \
  --mbox "...\ImapMail\imap.gmail-2.com\INBOX" \
  --mbox "...\ImapMail\imap.gmail-2.com\Sent" \
  --felog fyrirtaeki.csv --out tengilidir.sql
```

**Keyrðu Sent-möppuna líka.** Sá sem ÞIÐ skrifið er oftar réttur tengiliður en sá sem sendi
síðast — síðasti sendandi er stundum bara sá sem framsendi.

Síað burt sjálfkrafa: eigin lén (eldklar/brunaholf/slokkvitaeki), kerfispóstur
(no-reply, notifications), birgja- og kerfislén (github, payday, barki, veldix, stolpi, teya)
og markaðspóstur. Bættu við í `JUNK_DOMAINS` þegar nýtt slíkt lén birtist.

Pörunin er **ágiskun á léni** og allt kemur inn sem `pending`. Yfirferð:

```sql
select * from v_charlize_contacts_pending;           -- pöruð, bíða staðfestingar
select * from v_charlize_contacts_otengd;            -- lén sem enginn kannaðist við
update charlize_contacts set status='approved', confidence='confirmed' where id in (...);
```

## Hvað má skrá

| Já | Nei |
|---|---|
| netfang fyrirtækis og lén | einkanetföng og farsímar starfsfólks |
| hlutverk (bókhald, húsvörður, rekstur) | persónukennitölur |
| „vill reikning á X, staðfestingu á Y" | skoðanir á fólki |
| hvenær síðast heyrðist | efni póstanna sjálfra |

Nafn tengiliðar er valfrjálst og oft óþarft. Sé það skráð, þá bara nafnið — ekki
símanúmer, ekki heimilisfang.

**RLS er kveikt á `charlize_contacts`** (`setup-tengilidir.sql`). Það er viljandi: taflan
geymir netföng viðskiptavina og anon-lykillinn les annars allar 66 töflurnar. Vefurinn þarf
þessa töflu ekki — aðeins agentar með service-lykil.

## Yfirlitið

```sql
select charlize_yfirlit('<kt>');
```

Skilar einni textablokk: heiti félags, tengiliðir með hlutverki og fjölda pósta, og allt
kúnnaminnið flokkað eftir efni. Þetta er það sem á að lesa **áður** en pósti er svarað eða
farið í heimsókn — ekki fletta upp í fjórum kerfum.

Sé blokkin tóm er það líka svar: félagið á sér ekkert minni enn. Skrifaðu fyrstu færsluna
eftir næstu heimsókn.

## Aðgangur að pósthólfinu

Gmail-tengingin í spjallinu er á **aggisigurds@gmail.com** (persónulega hólfið), ekki á
eldklar@eldklar.is. Kúnnapósturinn næst því ekki þaðan. Tvær leiðir:

- **Thunderbird-mbox á alltaf-á vélinni** — sama leið og `redder.js` notar nú þegar og
  virkar án nettengingar við Gmail. Þetta er leiðin sem `mail_contacts.py` gerir ráð fyrir.
- **Tengja eldklar@eldklar.is sem Gmail-connector** ef á að vinna þetta beint úr spjalli.

Mundu að Redder-mappan þurfti að vera SUBSCRIBED í Thunderbird til að sjást — sama gildir um
allar möppur sem á að lesa.

## Samþykktarlistinn og pörun við félög (16.11.2026)

**Hvar:** Tengiliðir-síðan (`js/patches/310-tengilidir.js`). Listinn er `charlize_contacts` með `status='pending'`;
`approved` tengir netfangið við félag í `v_kunni_netfong` og póstur birtist í Samskiptum prófílsins
(`286`, les `v_kunni_postur`). Skrif fara um brunaholf `/api/tengilidir` (`approve`, `add` = viðbótarnetfang,
`link`, `aftengja`) — aldrei `charlize_contacts` beint úr vafra (RLS).

**Mælt 16.11.2026:** 531 bíðandi með kt + 1.252 án. Agnar veitti umboð („tengja eins marga og þú getur"):
387 samþykktir. Tengdir póstar 2.262 → 2.436, 0 tengingar töpuðust (borið saman par fyrir par).

**Örugg sía (má magnsamþykkja):** kt er í `customers_base` · netfangið er ekki samþykkt á ÖÐRU félagi ·
ekki okkar lén · og flokkurinn er einn af: netfang þegar skráð á félagið · sama lén og skráð/samþykkt netfang
félagsins (lénið hjá EINU félagi) · deilt lén rekstrarfélags · kt í netfangi · „lén líkist heiti" eftir að
efnislínur voru lesnar. Eftir 6 prófanir fyrst (eitt tilvik af hverri gerð), svo magn.

**Gildrur sem bitu eða hefðu bitið:**
1. Netfang sem er samþykkt á tveimur félögum slítur tengingu BEGGJA (`HAVING count(distinct bid)=1`).
2. Reitur með fleiri en einu netfangi (`a@x, b@y`) tengir ekkert — skráðu þau um `add`, ekki í aðalreitinn.
3. Umsjónarlén (`umsjonar_len`) tengir aldrei á netfang, aðeins á hús sem er nefnt í efni pósts
   (`bh_umsjonarpostur_endurreikna`); „Álftamýri 48" finnur ekki skráð „Álftamýri 46-52".
4. Birgi sem er líka kúnni: tengt birgjanetfang sýnir falskt „Ósvarað" (reikningar TIL okkar).
5. CC á verkfundum byggingarverktaka er ekki samskipti við kúnna — lestu efnislínur áður en lén er samþykkt.
6. „Lén líkist heiti" er ágiskun: gardabaer.is ≠ Efnalaug Garðabæjar, nordural.is ≠ ferðaskrifstofa.
7. `samskipti_tengd` (`samskipti_tengd_reikna()`) telur EKKI sögu sem kemur um samþykkt viðbótarnetfang eða kt-merki —
   mældu „engin saga" á öllum þremur leiðum (samskipti_tengd + v_kunni_postur + fyrirtaeki_samskipti_kt).
8. Bein SQL-uppfærsla á `status` stöðvast af öryggisvörn nema Agnar hafi sagt það skýrt; notaðu API fyrir fá, SQL fyrir magn með umboði.
9. Kt í pósti (efnislína/texti) er sterkasta sönnunin fyrir ÓTENGDAN sendanda — leitaðu í `email_digest` á kt með og án bandstriks.
