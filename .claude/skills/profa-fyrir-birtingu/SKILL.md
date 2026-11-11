---
name: profa-fyrir-birtingu
description: Verkferlið „Prófa fyrir birtingu" — skylduhlið áður en nokkur breyting á Slökkvitæki-appinu er sögð búin eða birt með [deploy]: málfræði allra skráa, verðir, breytingin keyrð í raun (án skrifa í lifandi gögn), afgreiðsla og skýrslugerð reyktar, og lifandi síðan lesin eftir birtingu. Til þess gert að lota skili aldrei „smíðað en óprófað — láttu vita ef eitthvað brotnar". Forráðamaður er `netvordur`. Kveikjuorð: prófa fyrir birtingu, er þetta prófað, prófaðu þetta, virkar þetta, áður en þú birtir, má birta, tilbúið í deploy, sannprófa breytinguna, reykpróf, brotnaði eitthvað, skemmdi afgreiðsluna, skemmdi skýrslugerðina.
---

# Prófa fyrir birtingu

Skráð 11.11.2026. Agnar: „fæ svo oft: búinn að smíða, ekki búinn að athuga hvort þetta muni virka, lætur mig vita ef
allt fer í klessu — þá er skaðinn skeður og ég þarf hálfan dag í að laga það sem skemmdist í afgreiðslum eða
skýrslugerð." Þetta ferli er skilyrði, ekki tillaga: **breyting sem fór ekki í gegnum það er ekki birt.**

## Svona er þetta keyrt (gildir fyrir hvaða módel sem er)
1. Lestu ALLA skrána fyrst. Farðu skrefin í röð; slepptu engu.
2. Hvert skref endar á niðurstöðu sem þú LAST (EXIT-kóði, tala, texti á skjá) — ekki á því að skipunin „fór af stað".
3. Falli skref: laga og byrja aftur á skrefi 1. Ekki halda áfram „því hitt er ótengt".
4. Geturðu ekki prófað eitthvað (innskráning, vantar tól): það stendur ÓPRÓFAÐ í skilunum og **þá er ekki birt** nema
   Agnar segi já vitandi það.

## Skref — ÁÐUR en birt er
1. **Hvað breyttist:** `git status -sb` og `git diff --stat`. Skrár sem þú breyttir ekki sjálf(ur) (önnur lota,
   auto-sync) eru nefndar og EKKI birtar með — ókláruð skrá annarrar lotu drap heilt búnt 10.11.2026.
2. **Málfræði ALLRA skráa**, ekki aðeins þinnar:
   `fail=0; for f in js/patches/*.js js/*.js; do node --check "$f" || fail=1; done; echo CHECK_EXIT=$fail` → verður 0.
3. **Verðir:** `node tools/audit-all.cjs --static`, og EXIT lesið í sér skipun (aldrei `| tail && push`). Rauður
   vörður er lesinn og annaðhvort lagaður eða nefndur orðrétt í skilunum.
4. **Vörðuð leið?** Snertir breytingin reikning út (`10/233/254`), kennitölu (`121`, `pos.js`), `payday-push.cjs`
   eða talninguna (`153/187`): lestu `docs/ORYGGISNET.md` og farðu um `netvordur` áður en lengra er haldið.
5. **Keyra breytinguna sjálfa** — einhver af þessum, í þessari forgangsröð:
   a. Í vafra á dev-þjóninum (`preview_start`, aldrei Bash-þjónn) með skrifum lokað:
      `(0, eval)(await fetch('/tools/prof-uppgerd-skrif.js').then(r => r.text()))` og svo `Uppgerd.sala()` /
      `Uppgerd.stillingar()` — dev-þjónninn talar við LIFANDI gögn, svo án þessa skrifar hver smellur í raun.
      Smelltu í gegnum raunverulega takkann (ekki kalla á fallið beint), lestu skjáinn og `read_console_messages`.
   b. Node-harness sem keyrir NÁKVÆMLEGA kóðann úr skránni með raungögnum og jaðartilvikum (tómt, vantar, tvö
      tilvik, rusl). Dugar fyrir hreina útreikninga og teikniföll; segðu þá að viðmótið sjálft sé óséð.
   c. Hvorugt hægt → ÓPRÓFAÐ, sjá reglu 4 að ofan.
   Aldrei: opna úttektarskýrslu (168) á lifandi félagi í prófi (skrifar skoðunarmánuð), smella á takka fundinn með
   mynstri, eða prófa á `localhost` TurboPaint (skrifar á lifandi borð).
6. **Reykpróf á því sem má ekki brotna** — líka þótt breytingin „komi því ekki við", því búntin eru sameiginleg:
   - Afgreiðsla (Sala): síðan opnast, vara fer í körfu, samtala rétt, kvittun opnast — með `Uppgerd.sala()`.
   - Skýrslugerð: úttektargluggi opnast á prófunarfélagi (`Test fyrirtæki` 1404) og PDF-forskoðun teiknast.
   - Þjónustuborð og Ársskoðun opnast án villu í console.
   Tvær eða fleiri mælingar; ein mæling er ekki mæling.

## Skref — birting og EFTIR hana
7. Birta: eitt commit með `[deploy]` (aldrei orðin „skip ci" í skilaboðum), aðeins þínar skrár í `git add`.
8. **Bíða eftir réttri útgáfu:** `curl -s https://slokkvitaeki.netlify.app/build.json` þar til `commit` er þitt
   commit. Falli build-ið (málfræðivörður) stendur síðan á fyrri útgáfu — lestu Actions-villuna, laga, aftur skref 1.
9. **Lesa lifandi síðuna:** breytingin sést (texti/tala á réttum stað) og reykprófin úr skrefi 6 endurtekin á
   lifandi síðu með `?t=<tími>` til að þvinga endurhleðslu. Console án nýrra villna.
10. **Brotni eitthvað á lifandi síðu:** bakka STRAX, laga svo —
    `git revert <commit> && git commit --allow-empty -m "[deploy] bakka <commit>" && git push`, eða Netlify
    `…/deploys/<id>/restore` (CLAUDE.md, „Recent deploy history"). Segðu Agnari um leið hvað brotnaði og frá hvaða
    klukkustund, svo hann viti hvaða afgreiðslur/skýrslur þarf að yfirfara.

## Skil — orðalagið
Bannað: „á að virka", „ætti að vera komið", „láttu mig vita ef eitthvað er að". Skilin eru tafla:
`hvað var prófað · hvernig (skipun / smellur) · hvað kom út`, og sér lína **ÓPRÓFAÐ:** með öllu sem ekki var keyrt.

## Lokagátlisti — verkið er EKKI búið fyrr en hvert hak er merkt
Skilaðu listanum í lokasvarinu með ✔ eða ✘ og einni línu um HVERNIG. ✘ er leyfilegt svar; að sleppa lið er það ekki.
- [ ] `CHECK_EXIT=0` á öllum js-skrám
- [ ] `audit-all --static` keyrt, EXIT lesið sér
- [ ] Breytingin keyrð í raun (5a eða 5b) — sagt hvort
- [ ] Engin skrif fóru í lifandi gögn í prófinu (eða talin upp og hreinsuð)
- [ ] Afgreiðsla og skýrslugerð reyktar fyrir birtingu
- [ ] `build.json` sýnir rétt commit
- [ ] Breytingin og reykprófin lesin á lifandi síðu
- [ ] ÓPRÓFAÐ-línan er í skilunum (má vera „ekkert")
- [ ] Keyrslan skráð: `select app_settings_merge('{"verkferli_keyrslur":{"profa-fyrir-birtingu":{"sidast":"ÁÁÁÁ-MM-DD","lota":"<módel>"}}}'::jsonb);` — aðeins ef ferlinu er LOKIÐ; boxið „Verkferli tilbúin til keyrslu" les þetta
