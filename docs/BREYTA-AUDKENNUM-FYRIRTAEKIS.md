# Að breyta nafni, heimilisfangi eða kennitölu fyrirtækis — leiðarvísir

Agnar 23.11.2026: „Þetta má ekki vera svona flókið fyrir okkur starfsfólkið … þetta á líka við heimilisfang og nafn fyrirtækis …
þá má ekkert fara í rugl við það, settu einhverskonar viðvörun, varnir svo það gerist aldrei.“

**Starfsfólk gerir eitt: breytir reitnum á fyrirtækjaspjaldinu og vistar.** Grunnurinn færir allt sem má færa sjálfkrafa og
spjaldið sýnir gula viðvörun um það eina sem þarf mannshönd. Vistun er aldrei stöðvuð.

## 1. Auðkennin þrjú (þetta er allt sem þarf að skilja)

| Auðkenni | Hvað það er | Breytist þegar kt/nafn/heimilisfang breytist? |
|---|---|---|
| `customer_id` = `fyrirtaeki.id` | Staðurinn (spjaldið). Tæki, skjöl, skýrslur, mál og saga hanga á honum. | **Aldrei.** |
| `customer_base_id` | Greiðandinn (`customers_base`) — sá sem fær reikninginn. | Aðeins þegar **kt** breytist og staðurinn er sinn eigin greiðandi (sjálfvirkt). |
| kt / nafn / heimilisfang | Texti sem prentast á reikning og skýrslu. | Já — og PDF sem þegar eru teiknuð bera gamla textann (sjá 3). |

## 2. Hvað kerfið gerir sjálft (gagnagrunnskeðjan)

Kveikjur á `fyrirtaeki` (SQL: `sql/2026-11-23_kt_breyting_faerist.sql` og `sql/2026-11-23_audkenni_vidvorun.sql`):

| Breytt | Fært sjálfkrafa | Ekki fært (viðvörun) |
|---|---|---|
| **Kennitala** | greiðandi (finnur eða stofnar `customers_base`), `uttaeki`, `customer_documents`, `document_pairs`, `umsjonarpostur_tengsl`, `fyrirtaeki_virkni`, `krofu_verkferli`, `thjonustubeidni`, `crm_cache`, `uttekt_skyrsla_lines` | sölur, sendir reikningar, saga (Stólpi, Payday-spegill), deildur greiðandi |
| **Nafn** | `customer_documents.customer_name`, `thjonustubeidni.customer_nafn`, `crm_cache.nafn`, `uttaeki.client`, nafn greiðandans (aðeins ef staðurinn er eigin greiðandi) | sölur, PDF |
| **Heimilisfang** | heimilisfang greiðandans (aðeins ef staðurinn er eigin greiðandi og greiðandinn ber enn GAMLA heimilisfangið) | sölur, PDF |

**Greiðandi er aðeins færður** þegar kt greiðandans = kt staðarins OG enginn annar staður deilir honum. Rekstrarfélög,
deildir greiðendur og „annar greiðandi“ (t.d. verkstaður → móðurfélag) eru látin í friði — þar ákveður Agnar.

**Sölur eru aldrei breyttar af grunninum.** kt-breyting í grunni sendir ekki `sale-edited`, svo reiknings-PDF og skýrsla yrðu
úrelt (16.11.2026). Því er ósendur reikningur leiðréttur með „Leiðrétta“ og sendur reikningur með verkferli H (regla 50).

## 3. Viðvörunin (guli kassinn eftir vistun)

Texti hennar kemur úr `audkenni_afleidingar` og getur verið:

- **Ósendur reikningur ber enn gamla …** → opnaðu hann í Kröfuyfirliti, „Leiðrétta“ (ný drög með nýju gildunum).
- **Sendur, ógreiddur reikningur ber gömlu auðkennin** → regla 50: ⊘ Afturkalla → ↩ Bakfæra → ný sala + ný skýrsla.
- **Úttektarskýrsla ársins ber gamla …** → „Búa til úttektarskýrslu“ (`SkyrslaSolu.endurnyja`), nýja skýrslan fylgir nýja reikningnum.
- **Greiðandinn deilist / er annar aðili** → kunnaskrá; Agnar ákveður. Engin sameining félaga án hans.

Engin viðvörun = ekkert ósent ber gömlu auðkennin. Sama texti er skráður í `kt_breyting_log.vidvorun` og sést á
`v_audkenni_vidvaranir` (aðeins þjónustulykill; agentar lesa þar).

## 4. Forskoðun án þess að breyta (agentar og lotur)

```sql
-- Hvað gerist EF nafni/heimilisfangi/kt er breytt? (engu breytt)
select audkenni_afleidingar(<fyrirtaeki.id>, p_nytt_nafn => '…', p_nytt_kt => '…', p_nytt_heimilisfang => '…');
-- Þurrkeyrsla á kt-færslunni sjálfri:
select kt_breyting_faera(<id>, <gamall base>, '<gamalt nafn>', '<gamalt kt>', true);
-- Viðvaranir sem enginn hefur kvittað fyrir:
select * from v_audkenni_vidvaranir;
```

Prófun á breytingu: keyrðu hana í `do $$ … raise exception 'NIÐURSTAÐA: %', res::text; end $$` — allt rúllast til baka og
niðurstaðan kemur í villuboðunum.

## 5. Rofi og öryggi

- Slökkva á keðjunni: `update app_kv set value = '{"virkt": false}' where key = 'kt_breyting_sjalfvirk';` (eða `set local app.kt_breyting_af = '1'`).
  Þá hætta færslur OG viðvaranir; vistun á fyrirtækinu er óbreytt.
- Villa í keðjunni fellir **aldrei** breytinguna á fyrirtækinu (kveikjurnar fanga villu og skrifa `warning`).
- Allt er skráð í `kt_breyting_log` (hver, hvað, talningar, viðvörun).

## 6. Hver gerir hvað

| Verk | Agent / regla |
|---|---|
| Breyta kt, greiðanda, tvítök, sameining | `kunnaskra` (Agnar staðfestir kt-breytingu) |
| Opna málið um fyrirtækið, vísa áfram, skrá kúnnaminni | `fyrirtaeki` (M) |
| Ósendur/sendur reikningur, afturkalla, bakfæra, ný sala | `sala-reikningar` (verkferli H, Óðinn regla 50) |
| Ný úttektarskýrsla með réttu nafni/kt/heimilisfangi | `sara-coworker` (skýrslan) → `sala-reikningar` klárar söluna |
| Pör skýrsla ↔ reikningur (`document_pairs`) á réttum greiðanda | `sara-organizer` |
| Móttaka og úrskurður („breyta nafni/kt/heimilisfangi“) | `odin` — reglur 50 (sendur reikningur) og 51 (nafn/heimilisfang/kt) |
| Svar til kúnna | `postur` semur drög; Agnar sendir (slokkvitaeki@ hefur enga sendileið) |

## 7. Þekktar gildrur

- Ritillinn vistar ekki `customer_base_id` — hann færist af kveikjunni, ekki af spjaldinu.
- `document_pairs` á lykilinn (greiðandi, ár, tegund, staður): rekist pör á situr eldra parið eftir hjá gamla greiðandanum (saga).
- Spjald sem er endurnefnt stöðvar gömlu skýrsluna í `skyrsla_athugun` (kt OG nafn önnur) þar til ný er gerð — það er rétt hegðun.
- Mældu á lifandi síðu eftir breytingu (spjald, Ársskoðun, Kröfuyfirlit); ekki gefa þér að það hafi tekist.
