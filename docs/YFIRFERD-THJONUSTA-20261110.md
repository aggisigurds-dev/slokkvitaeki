# Yfirferð á fyrirtækjum í þjónustu — 10.11.2026

Beiðni Agnars: „góða yfirferð fyrir fyrirtækin í þjónustu hvort allt sé rétt, hvort einhverjir viðskiptavinir hafa
óvart dottið úr þjónustu, tengja tölvupósta, finna nýjar þjónustubeiðnir, hvort það séu einhver false facts".

Aðferð: rannsóknarhamur (skill `rannsoknarhamur`). Fimm lesaðeins-lotur samtímis, hver á einu sviði; síðan
sannprófun á fundunum (SQL + PDF-lestur) og skrif frá einum aðila. Grunnur: 653 félög í þjónustu, 631 utan.

## Tölur

| Lota | Mælt | Fundið | Stóðst sannprófun |
|---|---|---|---|
| 1 Dottið úr þjónustu | 631 félag | 2 | 1 nýtt (Suðurvangur 8), 1 þegar á borði (Hraungata) |
| 2 Í þjónustu án tilefnis | 653 félög | 4 draugar + 4 stöðumisræmi | 3 draugar staðfestir, 4 stöður leiðréttar, 1 ómælt (Árakur 5) |
| 3 False facts | 84 pör, 584 facts-raðir, 446 „skoðað 2026" | 45 pör, 13 „skoðað án gagna", 35 heimildir | 45 pör ÓMÆLANLEG (skráarlaus), 13 → 1 (AFL), 35 skráð |
| 4 Pósttengingar | 401 netfang, 923 tengingar, 653 félög | 9 sterkar, 20 vafasamar | 11 tengingar skrifaðar |
| 5 Nýjar beiðnir í pósti | 1.134 póstar frá 10.09 | 6 | 2 á borðið (leiga, 4 póstar), 1 þegar svarað (Barónsstígur 18) |

## Leiðrétt strax (afrit: `audit_vernd`, `backup_20261110_yfirferd_contacts`)

- **Staða óvirkur → virkur** á fjórum félögum í þjónustu með viðskipti 2026: Garðyrkjufélag Íslands (1198),
  THG Arkitektar (1245), Þemasnyrting (1262), Stefanía Unnarsdóttir (1235). Merkið kom úr innflutningi 02.06.2026
  (`Samningar.xlsx`) og var aldrei sett af manni (audit_vernd sýnir „óvirkur" frá fyrstu færslu).
- **11 netföng tengd félagi** í `charlize_contacts` (source „Yfirferð 10.11.2026"), öll með kt eða nafn félagsins í
  póstinum sjálfum eða sendingu úr appinu: Fastus, Thai Lindin, Prentun ehf, Sveitahótelið Brú, Garðyrkjufélagið (2),
  BF17, Háholt 12, Bifreiðaverkstæðið Lyngási 12, Félag skipstjórnarmanna, Afltak.
- **Háholt 12 (402):** netfang leiðrétt úr `olavur@vso.is` í `olafur@vso.is`.

## Á borðinu (bíða Agnars)

| Mál | Efni |
|---|---|
| #1589 | Þakefnasala Íslands (1260): draugur, 4 tæki afrituð úr skýrslu Heimilisiðnaðarfélagsins |
| #1590 | Flétturimi 10, húsfélag (784): 13 tæki eru þau sömu og hjá Flétturima 10-16 (skýrsla opnuð) |
| #1591 | Soffía Jónsdóttir (637): 16 tæki og skýrsla eru Ferðafélags Íslands (skýrsla opnuð) |
| #1592 | Suðurvangur 8, húsfélag (1803): hlaðið og rukkað 10.09.2026 en ekki í þjónustu |
| #1593 | AFL Starfsgreinafélag (901): Farið + Á verkstæði 2026, engin skýrsla né reikningur (~100.000 kr fyrri ár) |
| #1594 | Stóreldhúsið 3.–6.11: leiga til sýnenda órukkuð |
| #1595 | Fjórir póstar 08.–10.11 án máls og svars: Hótel Múli, ÍAV, Allverk, Bryggjuvör 1d |
| #1584, #1585 | Míla og K Apartments (frá fyrr í dag) |

## Það sem sannprófunin felldi

- **„Skoðað 2026 án gagna" (13 félög):** níu eiga Stólpa-reikning jan–apríl 2026 (reikningsflæði appsins byrjaði
  29.05.2026). Bæjarlind 12 og Zsazsa eiga vinnublað (mál #901, #1032). Suðurvangur 19 er þekkt tvítak. Eftir: AFL.
- **45 pör á röngu skjali:** afritsraðirnar eru skráarlausar, svo innihald verður ekki borið saman. Ekki leiðrétt;
  flokkunin er í Verkefnalista (verk a23bf402).
- **Blástur og málun (1173):** tekin út 11.09.2026 með `removed_from_service_at`; plan_note „ATH kerfisvillu líklega
  villa". Engin ákvörðun sést. Ekki hreyft.

## ÓMÆLT

- Póstur úr `slokkvitaeki@brunaholf.is` er ekki í SENT-möppu `email_digest`; „ósvarað" er því aldrei sterk sönnun.
- `body_preview` er ~200 stafir; 11 póstar höfðu tóman texta.
- 165 af 174 félögum í þjónustu án netfangs: enginn póstur fannst.
- Húsfélag Árakur 5 (145): tæki „endurbyggð úr skýrslu 4026" sem er ekki á félaginu; skjöl heita Klapparstígur 5 og
  Víðivangur 5. Ekki opnað.
- 20 vafasamar pósttengingar (umsýslufélög bundin við eitt húsfélag, fridrik@thg.is á Rekstrarfélag Kringlunnar).
- 50 félög með fleiri en eitt netfang í `fyrirtaeki.netfang` falla úr póstsýnunum (`v_kunni_netfong`).
