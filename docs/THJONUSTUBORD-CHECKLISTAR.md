# Þjónustuborð: checklistar, skiptilínur, Stjörnumerkt (10.11.2026)

Allt í `js/patches/368-thjonustubord5.js` (einingakerfið), nema Hunter (68 + 493).

## Checklistar (eining 23 og 26)
- Gögn: `skipulagsbord.by_staff.<nafn>.checklisti` og `.checklisti2` = `[{ id, t, done, star }]` (fylki skrifað heilt).
- Titill hvors lista: `<svæði>_titill` (strengur, breytanlegur í haus). Samanbrot: `chk_opid.<einingarlykill>` = bool. Bæði á þjóni.
- Kóðinn er EINN: `chkLesa(n, f)`, `chkBreyta(n, f, fn)`, `chkVista`, `skrifaChk`, `chkDragNidur` — `f` = svæði = lykill einingarinnar.
- `SERVER_OPID` (= checklistar + `stjornumerkt`) segir hvaða einingar geyma samanbrot á þjóni í stað `S.open`.
- Titilreiturinn (`data-chktitill`) er í render-biðlistanum (línan með `ae.dataset.chk`) — annars rifnar hann í miðri ritun.

## Breidd og skiptilínur
- Breidd einingar: þrep 1–5 (⅓ ⅖ ½ ⅗ 1/1) EÐA spönn 10–60 dálkar (`erSponn`). Vistað í `mitt.breidd` (Mitt vinnuborð) eða `hamir[].breidd` (sérsniðinn hamur).
- Skiptilína `.mspl` við hverja einingu (aðeins mitt/sérsniðnir hamir); `skiptiMerkja()` sýnir hana þegar nágranninn er í sömu röð, annars sem hægri brún síðustu einingar raðarinnar. Dregið með pointer-atburðum, lágmark 16 dálkar, laust pláss í röðinni nýtist.
- ATH: ritillinn/vistun síaði áður burt breidd 4 og 5 (`b === 1||2||3`) — nú `gildBreidd`.

## Stjörnumerkt (eining 27)
- Les úr upprunanum í hvert sinn, geymir ekkert: checklistar (star>0, ókláruð), `merktAMig(n)` (spjöld), áríðandi mál á mínu borði (5 efstu + „+ N til viðbótar“).
- Merkið er tekið af með SÖMU aðgerðum og á upprunastaðnum: `star-af` (checklisti), `sk-merki-af`, `mal-ari`.
- `star-opna` opnar í hamnum sem geymir eininguna (`stjHamFyrir`).

## Spjald → checklisti
- `sk-chk` (hnappur á spjaldi) → val 1/2 → `sk-chk-fara` býr til atriði `nafn — texti` (líka óvistuð drög). Spjaldið helst nema Agnar svari „Eyða spjaldinu líka?“ játandi (Confirm.show), þá með afturköllun.

## Hunter
- `68-sidebar-reorder.js` festir Hunter á order 0 (ofan við Vefverslun, order 1) óháð vistaðri röð; takki í röðinni á Þjónustuborðinu (493, aðeins Agnar).

## Próf (hvernig)
Playwright með `context.route` sem stöðvar `app_settings_merge` (engin skrif í skýið) og endurspilar vistaðar breytingar í `app_settings` GET við endurhleðslu. Dragið/smellt með raunverulegri mús — handfangið er hátt; mús utan við haus síðunnar (`.bb-face` liggur yfir efstu pixlunum).
