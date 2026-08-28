# Kúnnaminni — fyrirtæki í þjónustu

Þekking sem á við **eitt tiltekið fyrirtæki**, ekki kerfin almennt. Þetta er hlutinn sem
sparar mesta tímann í raun: það sem sá sem fór síðast veit og enginn annar.

Aðeins fyrir fyrirtæki **í þjónustu**. Fyrirtæki sem er hætt eða aldrei komist á fer ekki hér
inn — kúnnaminni sem enginn heimsækir er bara rusl sem þarf að lesa.

## Hvernig það tengist

Sömu töflu, `charlize_knowledge`, með `scope='kunni'` og tengingu á fyrirtækið:

| Dálkur | Hvað |
|---|---|
| `scope` | alltaf `kunni` |
| `kennitala` | kt fyrirtækisins — aðal-lykillinn, virkar þvert á bæði öppin |
| `customer_base_id` | `customers_base.id` þegar hann er þekktur |
| `fyrirtaeki_id` | `fyrirtaeki.id` þegar við á |
| `topic` | `adgengi` · `tengilidur` · `taeki` · `reikningur` · `saga` · `sertharfir` |
| `fact` | ein setning |

Kennitalan er lykillinn af því hún lifir af nafnabreytingar, sameiningar og part-dups — og
part-dups eru þegar 17+ talsins. Skrifaðu hana alltaf, líka þótt `customer_base_id` sé til.

## Hvað á heima hér

- **Aðgengi:** hvar á að leggja, hvaða inngangur, hvenær er opið, þarf að boða komu, hverjum
  á að hringja í til að komast inn.
- **Tengiliður:** hver tekur á móti, hver skrifar upp á, hver borgar. Hlutverk, ekki einkalíf.
- **Tæki og staðsetning:** tækin eru í þremur byggingum, kjallarinn er læstur, brunaslöngurnar
  eru í bílakjallara — það sem kemur á óvart þegar komið er á staðinn.
- **Reikningsvenjur:** vill reikning á tiltekið netfang, þarf innkaupanúmer/beiðni, greiðir
  gegnum rekstrarfélag, vill sundurliðun per stað.
- **Saga:** hvað fór úrskeiðis síðast og hvernig var það leyst. Kvartanir, endurgerðir
  reikningar, bilanir sem koma alltaf aftur.
- **Sérþarfir:** húsreglur, öryggisnámskeið, þarf fylgd, má ekki koma á opnunartíma.

## Hvað á EKKI heima hér

- **Aðgangskóðar, lyklaboxkóðar, lykilorð.** RLS er slökkt á töflunum — anon-lykillinn les
  allt. Kóði sem opnar hús fer ekki í töflu sem vefurinn getur lesið. Skrifaðu „lyklabox við
  bakdyr, kóði hjá Agnari", ekki kóðann.
- **Kennitölur eða símanúmer einstaklinga.** Fyrirtækjakennitala já, persónukennitala nei.
  Tengiliður er „rekstrarstjóri", ekki nafn + númer + heimilisfang.
- **Skoðanir á fólki.** „Erfiður kúnni" hjálpar engum og les illa ef það birtist á skjá hjá
  kúnnanum sjálfum. Skrifaðu hegðunina sem skiptir máli: „vill staðfestingu í tölvupósti
  fyrir heimsókn".
- **Tækjalistinn sjálfur.** Hann er í `uttaeki`. Charlize geymir það sem listinn segir ekki.
- **Verð og upphæðir dagsins.** Verðskrá er í `sara/references/verd.md`, staða í `solur`.

## Að lesa fyrir heimsókn eða svar

```sql
select topic, fact, detail, confidence, created_at
from v_charlize_kunni
where kennitala = '4203932269'
order by topic, created_at desc;
```

Finnist ekkert: fyrirtækið á sér ekkert kúnnaminni enn. Það er eðlilegt í byrjun — segðu það
og skrifaðu fyrstu færsluna eftir heimsóknina.

## Að skrifa

Besti tíminn er strax eftir heimsókn eða eftir samskipti sem komu á óvart:

```sql
insert into charlize_knowledge (scope, topic, kennitala, fact, detail, source, agent)
values ('kunni','adgengi','4203932269',
        'Komast þarf um bakdyr — aðalinngangur er læstur utan opnunartíma',
        'Móttakan hleypir inn ef hringt er á undan.',
        'agnar','chat');
```

Ein færsla per staðreynd, eins og annars staðar. Supersede-aðu gamla færslu þegar hlutir
breytast (nýr tengiliður, ný húsnæði) — ekki eyða, því breytingin sjálf er stundum ástæðan
fyrir að eitthvað fór úrskeiðis.

## „Í þjónustu" — hálf-staðfest

Listinn heitir **„Fyrirtæki í Þjónustu · Búið 2026"** í appinu (~297 félög, fluttur út sem PDF).
Nákvæmi DÁLKURINN sem markar hann í grunninum er enn **ekki staðfestur**.

Athugaðu líka að listinn er ekki hreinn: kerfisvilla hleypti búðarkúnnum inn á hann, og 40 félög
eiga hvorki virk tæki né skýrslu. Kúnnaminni á ekki að skrifast á þau fyrr en yfirferð liggur fyrir.
Áður en `v_charlize_kunni` er tekin í notkun, keyrðu:

```sql
select column_name, data_type from information_schema.columns
where table_name in ('customers_base','fyrirtaeki')
  and (column_name ilike '%virk%' or column_name ilike '%stada%'
    or column_name ilike '%thjonust%' or column_name ilike '%active%');
```

Stilltu svo `where`-skilyrðið í viewinu eftir því sem finnst og skráðu niðurstöðuna í
Charlize (`scope='kerfi'`, `topic='kunnar'`) svo næsti agent þurfi ekki að leita aftur.
