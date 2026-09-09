# Gildrur í viðmótinu

Hvert atriði hér hefur raunverulega bitið og kostað leiðréttingu. Lestu áður en þú byrjar
að smella.

## Viðmótið endurraðast við hverja breytingu

Hægri dálkurinn (reikningurinn) breytir hæð um leið og staða tækis breytist, og þá færist
allt sem er fyrir neðan. **Keðja aldrei marga smelli í hægri dálknum í einni lotu** — annar
smellurinn lendir á röngum reit.

Þetta hefur sett „2" í dagsetningarreitinn og í athugasemdareitinn í stað akstursreitsins.

Réttu vinnubrögðin: einn smellur → skjámynd → næsti smellur. Eða `read_page` +
`form_input` með `ref`, sem er ónæmt fyrir hnikun. Athugið að `read_page` á þessari síðu
getur farið yfir samhengismörk — takmarkaðu með `ref_id` eða `depth`.

## Tilkynningagluggar gleypa smelli

Grænn borði („Sett í vinnslu — komið á ÞjónustuVerkstæði") birtist neðarlega og liggur yfir
tækjaröðunum. Smellir á hann fara í tómið.

Á Bæjarholti 9 varð þetta til þess að hleðslu-stillingin komst aldrei inn og listinn læstist
með þrjú tæki ranglega á yfirferð. **Staðfestu alltaf með skjámynd að stöður séu réttar áður
en þú ýtir á „Staðfesta lista".**

## Að opna staðfestan lista hreinsar öll hökin

Smellur á „🔒 Listi staðfestur — smelltu til að opna" opnar listann **og tekur hakið af öllum
tækjum**. Sá sem opnar til að laga eitt tæki þarf að endurhaka allt.

Gerðu ráð fyrir því: eftir opnun, hakaðu við allt aftur áður en þú staðfestir.

## Tæki sem á ekki að rukka — leyst: eyddu þeim

Vinnublaðið ræður hvað rukkast. Tæki í kerfinu sem er ekki á blaðinu **á einfaldlega að eyða**.

Agnar 01.08: *„maður getur valið tæki og síðan bara eyða — tækjanúmerin skipta engu máli,
maður gerir síðan bara nýtt."*

Raðnúmerin (`AE…`, `TMP…`) eru sjálfgerð fylliorð, ekki áletruð á tækin. Það er engin saga í
þeim að vernda og árskoðunar-tækjafjöldinn er hvort eð er ómarktækur. Listinn er endurbyggður
eftir vinnublaðinu, ekki varðveittur.

Þetta sem ég reyndi fyrst og virkar EKKI — ekki eyða tíma í það aftur:

- smellur á virkan „Yfirferð"-hnapp slekkur ekki á honum
- ✓-hakið stýrir ekki reikningnum (tækið rukkast áfram þótt hakið sé af)
- ☰ er QR-miðaprentun, ekki valmynd
- ⊘ „Merkja ónýtt" fjarlægir línuna **en lýgur um ástand tækisins** — ekki nota það til að
  taka tæki úr ferð, bara þegar tæki er raunverulega ónýtt

## Ný tæki koma inn á „Hleðsla"

„Bæta við tæki"-glugginn spyr um **áætlaða næstu þjónustu**, ekki stöðu þessarar úttektar.
Sjálfgefið er „🟢 Hleðsla — full áfylling". Ný tæki koma því inn á hleðslu og þarf að stilla
á yfirferð eftir á.

Magn-reiturinn er sjálfgefið **20** — mundu að breyta honum.

## „Merkja skoðun" gerir meira en að haka

Fjöldaaðgerðin efst („Merkja öll tæki sem skoðuð í dag") setur líka *síðasta skoðun = í dag*
og *næsta skoðun = eftir ár* á öll tækin. Var heimsóknin í öðrum mánuði er þetta rangt.

Hakaðu handvirkt nema dagsetningin sé rétt hvort eð er. **Óleyst spurning til Agnars:** má
nota hann samt á stórum fyrirtækjum þar sem handvirk hökun er tímafrek?

## Sjálfvirki textinn endurnýjast ekki sjálfur

`294-uttektartexti.js` skrifar textann þegar listi er staðfestur. Sé stöðu breytt eftir á
stendur gamli textinn óbreyttur og verður rangur — „Fjögur tæki fengu hleðslu" eftir að
duftið var fært á yfirferð.

Hnappurinn **„✨ Búa til texta"** endurgerir hann. Notaðu hann eftir hverja leiðréttingu.
Hann skrifar ekki yfir texta sem er þegar í reitnum — tæmdu reitinn fyrst.

## Ekki vinna í sama fyrirtæki og Agnar samtímis

Við skrifuðum báðir í sömu reiti á sama tíma og innslættir stukku á milli. Sé Agnar að fikta
í sama fyrirtæki, bíddu eða taktu annað.

## Chrome-tólin lesa ekki `file://`

Vinnublöðin eru staðbundin HTML-skjöl. `read_page` og `get_page_text` neita þeim.
Notaðu `device_request_folder_access` → `device_stage_files` → `Read`.
