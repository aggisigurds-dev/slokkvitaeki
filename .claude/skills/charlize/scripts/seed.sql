-- Charlize — upphafsfærslur
-- Keyra EFTIR setup.sql. Þetta er það sem þegar er vitað og hefur kostað tíma.
-- Yfirfarðu áður en þú keyrir: allt hér er merkt 'confirmed' nema annað sé tekið fram.

insert into charlize_knowledge (scope, topic, fact, detail, source, confidence, agent) values

-- ── Fyrirtækin ────────────────────────────────────────────────────────────────
('baedi','uppbygging',
 'Slökkvitæki ehf og Brunahólf eru aðskilin fyrirtæki, ekki tvö vörumerki',
 'Þau deila Supabase-verkefni osfdzskyvisifcwyjkuk. customers_base/fyrirtaeki/customer_documents = Brunahólf; uttaeki/solur/verkbeidnir/vidskiptavinir = Slökkvitæki.',
 'agnar','confirmed','chat'),

-- ── Sölur og reikningar ───────────────────────────────────────────────────────
('slokkvitaeki','solur',
 'solur.athugasemdir prentast beint á reikninginn sem "vegna"-texti undir kennitölu',
 'Innri vinnslunótur og status eiga heima í krafa_note. Uppgötvað 22.7.2026.',
 'sql','confirmed','chat'),

('slokkvitaeki','solur',
 'Sala birtist ekki í kröfuyfirliti nema greitt_med, customer_base_id, upphaed_an_vsk OG vsk_upphaed séu öll sett',
 'greitt_med=''reikningur''. POS-leiðin setur þetta sjálfkrafa, bein SQL-innsetning ekki. Algengasta orsök "salan er til en sést hvergi".',
 'sql','confirmed','chat'),

('slokkvitaeki','solur',
 'Tvítektir eru bakfærðar með status=void + faldar, aldrei eytt',
 'Sölunúmer hafa endurnýtst — þekkt villa, ekki merki um mistök notanda.',
 'agnar','confirmed','chat'),

('baedi','gagnaoryggi',
 'Hver eyðileggjandi DB-aðgerð fær afritstöflu backup_YYYYMMDD_<hvað> áður en hún keyrir',
 'Dæmi: backup_20260711_* (vorur dups, rekstrarfelag, nafnasamruni), backup_20260722_solur_*.',
 'agnar','confirmed','chat'),

-- ── Sync og framendi ──────────────────────────────────────────────────────────
('baedi','sync',
 'Endurnýta timavera_meta-mynstrið fyrir alla sync-tímastimpla — ekki búa til ný afbrigði',
 'Bein fyrirmæli Agnars 25.7.2026: nota það sem virkar, alls staðar. Ein lína, upsert per import: last_import, source_file, row_count.',
 'agnar','confirmed','chat'),

('baedi','sync',
 '"Sync virkar ekki" er oftast framendavilla — staðfestu í grunninum fyrst',
 'Payday-sync 25.7 keyrði rétt (352 raðir) en mælaborðið sýndi harðkóðaða dagsetningu og endurspurði ekki.',
 'sql','confirmed','chat'),

('brunaholf','framendi',
 'Rekstrarfélög og úttektarskýrslur birtast rangt í appinu vegna framenda, ekki gagna',
 'index.html frá 22. maí les ekki grunninn live. Backend-view v_bakendi_rekstrarfelog skilar öllum hópum rétt.',
 'sql','confirmed','chat'),

-- ── Gögn sem má ekki treysta ──────────────────────────────────────────────────
('brunaholf','taeki',
 'uttaeki-gögnin Brunahólfsmegin eru auto-generaður placeholder, ekki raunfjöldi',
 'Má henda og generata upp á nýtt per stað svo það stemmi við síðustu skoðun.',
 'agnar','confirmed','chat'),

('brunaholf','skjol',
 'Úttektarskýrslur eru sóttar live úr Drive við hvert load, ekki vistaðar í Supabase eins og reikningar',
 'Þess vegna endurtóku tvítektir sig. content_hash í skjalaheiti_log er áreiðanlegi lykillinn.',
 'kodi','confirmed','chat'),

('brunaholf','skjol',
 'Skjala-masterinn er EITT Sheet, læst í app_kv.master_doc_sheet_id — verkfæri uppfæra það ID, búa aldrei til nýtt',
 'Sheet 12hFAjgiKMOGpgjaargAtFTE5otny6SMSUYPL51z5sg8. Tveir writers voru að skrifa ofan í hvorn annan; eldri grid-writer á enn eftir að benda annað.',
 'skjamynd','confirmed','chat'),

('brunaholf','kunnar',
 '221 virk fyrirtæki eru ótengd customers_base og 17+ nafna-part-dups eru til með kt-stafavíxli',
 'Leitaðu bæði á kennitölu og nafnbroti áður en nýr kúnni er stofnaður.',
 'sql','confirmed','chat'),

-- ── Payday og Teya ────────────────────────────────────────────────────────────
('slokkvitaeki','payday',
 'Payday er API-tengt Slökkvitæki (payday_invoices_slokk); reference-reiturinn geymir innra sölunúmer R-xxx',
 'Gefur nákvæma vörpun Payday-númer <-> sala. Pull-hlið aðeins, push var sleppt.',
 'kodi','confirmed','chat'),

('brunaholf','payday',
 'Brunahólfsmegin er engin payday_invoices tafla — aðeins eldri invoices-feed án Payday-númera',
 'Tengingin er "hálf". Verkkaupar-mælaborðið sýndi útistandandi upphæðir fyrir reikninga sem Payday taldi greidda (25.7).',
 'sql','likely','chat'),

('slokkvitaeki','teya',
 'Teya-uppgjör koma frá reporting@teya.com — matcha á sendanda, ekki möppu',
 'Efni: "Uppgjörsskýrslan þín frá Teya" með viðhengi, á bokhald@eldklar.is. noreply/info/hjalp eru markaðspóstur; "Reikningur frá Teya" er Teya að rukka, ekki uppgjör.',
 'agnar','confirmed','chat'),

-- ── Póstur ────────────────────────────────────────────────────────────────────
('slokkvitaeki','postur',
 'Tvö triage-label: 📘 Bókhald óafgreitt = vantar bara skjal (hópsvar); 🔴 Óafgreitt = þarf mann eða ákvörðun',
 'Raunverulegi svarabunkinn er 20–30 póstar, ekki hundruð. Reikningar (barki.is/payday.is/veldix/stolpi) síast beint úr innhólfi og þurfa ekkert svar.',
 'agnar','confirmed','chat'),

('slokkvitaeki','postur',
 'Hrár póststraumur og unninn verklisti eiga að vera aðskildir, með "flytja yfir"-aðgerð á milli',
 'Annars flæðir innhólfið yfir aðalskjáinn. Svarstöð á að vera VIEW inni í appinu, ekki standalone síða.',
 'agnar','confirmed','chat'),

-- ── Kóði og deploy ────────────────────────────────────────────────────────────
('slokkvitaeki','deploy',
 'Kóðinn er modular patch-skrár undir /js/patches/ — patch-master.js er úrelt tilvísun',
 'Um 240 stakar JS-skrár hlaðast per load (250 skrár alls); bundling er á verkefnalistanum.',
 'kodi','confirmed','chat'),

('slokkvitaeki','deploy',
 'Container-útgangur á api.netlify.com er lokaður; deploy fer fram með fetch() í vafra-flipa á síðunni sjálfri',
 'manifest -> POST /deploys með SHA-1 korti -> PUT aðeins skrárnar í deploy.required -> /restore.',
 'kodi','confirmed','chat'),

('baedi','oryggi',
 'Engir lyklar eða tokens í nótum, skjölum eða þekkingargrunni — aðeins hvar þeir fást',
 'Netlify PAT rennur út milli lota og sækist í User Settings -> Applications -> Personal access tokens. Netlify-token lak einu sinni inn í nótur.',
 'agnar','confirmed','chat'),

('baedi','oryggi',
 'RLS er slökkt á 66 töflum í Supabase-verkefninu — anon-lykill getur lesið og skrifað allt',
 'Skráð áhætta, ekki leyst.',
 'sql','confirmed','chat'),

('slokkvitaeki','kodi',
 'Base64-kóðað JavaScript í spjalli hefur læst heilli lotu — sendu kóða sem kóða',
 null,
 'agnar','confirmed','chat'),

('baedi','git',
 'Möppunafn segir ekki hvaða repo er í henni — git remote -v gerir það',
 'Sama branch-nafn var notað í þremur repo-um. 29.7 fór klukkutími í viðvörun um "rangt repo" sem var aldrei til: shallow clone (53 commits) sá ekki gamla commit-ið og tilkynnti það horfið, og gamlar remote-tracking refs létu mánaða gamalt checkout segjast í sync.',
 'agnar','confirmed','chat'),

-- ── Vinnulag ──────────────────────────────────────────────────────────────────
('baedi','vinnulag',
 'Verkefni fara á verkefnalista-töfluna (assigned_agent), lærdómur fer í charlize_knowledge',
 'Verkefni klárast og verða úrelt; þekking gerir það ekki.',
 'agnar','confirmed','chat'),

('baedi','vinnulag',
 'Verkaskipting: Claude Code = Slökkvitæki-appið, Cowork = Brunahólfs-rekstur, Sara = úttektarskráning',
 'Cowork sér um Sheets, Apps Script, Tímavera og Ajour.',
 'agnar','confirmed','chat'),

('slokkvitaeki','uttekt',
 'Vinnublaðið er heimildin um hvað var unnið — tækjalistinn í kerfinu er það ekki',
 'Tækjafjöldi í árskoðun hefur verið rangur árum saman. Sjá sara-skillinn fyrir allt verkferlið og húsmálið.',
 'agnar','confirmed','chat');
