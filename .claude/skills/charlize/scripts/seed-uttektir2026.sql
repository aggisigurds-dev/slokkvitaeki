-- Charlize — lærdómur úr Uttektarskyrslur2026samanburdur.xlsx (07.08.2026)
-- Keyra EFTIR setup.sql (og setup-artifacts.sql fyrir artifact-línuna neðst).
--
-- Tölurnar sjálfar (297/236/61) eru staða dagsins og eiga ekki heima hér til frambúðar —
-- það sem er skráð er MYNSTRIÐ og AÐFERÐIN. Tölurnar fylgja aðeins með sem dæmi í detail.

insert into charlize_knowledge (scope, topic, fact, detail, source, confidence, agent) values

-- ── Hvað gloppan er í raun ────────────────────────────────────────────────────
('brunaholf','skjol',
 'Félag "án úttektarskýrslu" þýðir næstum aldrei að skoðun hafi gleymst — skjalið er yfirleitt til, bara ekki í Drive-möppunni',
 'Samanburður 7.8.2026: af 297 félögum á skoðunarlistanum áttu 236 skrá í möppunni. Af hinum 61 voru 38 með skýrsluna í Supabase en ekki í Drive, 8 draugaraðir (röð í skjalaskrá án skrár að baki), 7 með drive_file_id sem bendir út fyrir möppuna, og aðeins 8 áttu ekkert skjal neins staðar. Flokkaðu ALLTAF gloppuna í þessa fjóra flokka áður en þú ályktar að skoðun vanti.',
 'greining','confirmed','chat'),

('brunaholf','skjol',
 'Fjórir flokkar gloppunnar: aðeins í Supabase · draugaröð · drive_file_id út fyrir möppu · ekkert skjal neins staðar',
 'Aðeins síðasti flokkurinn er raunveruleg vöntun á skoðun. Hinir þrír eru afritunar- eða hlekkjavandamál.',
 'greining','confirmed','chat'),

-- ── Þrjár uppsprettur falskra flagga ──────────────────────────────────────────
('baedi','falskflogg',
 'Rekstrarfélög deila kennitölu — uppfletting á kt lætur eina skýrslu líta út fyrir að duga öllum stöðum félagsins',
 'Aðalskoðun er fjórir staðir á 540994-2269. 34 af 297 línum á listanum eru kt-tvítök af þessari ástæðu. Staðfestu á HEIMILISFANGI þegar kt á fleiri en einn stað.',
 'greining','confirmed','chat'),

('baedi','falskflogg',
 'Tækjatalning byggir á nafna-mátun (uttaeki.client á móti heiti félags) — örlítið önnur stafsetning gerir félag "tækjalaust"',
 'Sama aðferð og appið notar, svo villan birtist eins báðum megin. Þetta er ekki merki um að tækin vanti.',
 'greining','confirmed','chat'),

('slokkvitaeki','falskflogg',
 '🧾-merkin í appinu eru ekki áreiðanleg — ekki byggja greiningu á þeim',
 'Staðfest 7.8.2026. Byggðu á skráarheitum í Drive og röðum í customer_documents í staðinn.',
 'agnar','confirmed','chat'),

-- ── Skráarheiti og ártals-lesarinn ────────────────────────────────────────────
('brunaholf','skjol',
 'Nafnaskipan úttektarskýrslu er: Fyrirtæki - Heimilisfang - kennitala - ár - mánuður - #nr.pdf',
 'Dæmi: "Húsfélagið Engjasel 31 - Engjaseli 31, 109 Reykjavík - 480486-4129 - 2026 - ágúst - #1619.pdf". Skrár sem víkja frá þessu detta út úr öllum uppflettingum.',
 'greining','confirmed','chat'),

('brunaholf','skjol',
 'Ártals-lesarinn missir af skrám af þremur ástæðum: undirstrik í stað bila, ekkert ártal í nafni, og nöfn sem hafa verið klippt af',
 'Af 56 skrám án lesanlegs ártals: 31 með undirstriks-nafni (t.d. 1779732213493_A_alsko_un_Hjallahrauni_4_2026.pdf — upphlaðið með auto-nafni), 16 með ekkert ártal, 9 klipptar. Undirstriks-nöfnin eru stærsti flokkurinn og auðveldast að laga í lesaranum.',
 'greining','confirmed','chat'),

('brunaholf','skjol',
 '5 af 260 skrám 2026 bera ekkert kt í nafninu og eru því ótengjanlegar við félag',
 'Sami hópur og undirstriks-nöfnin að stórum hluta.',
 'greining','likely','chat'),

-- ── Þjónustulistinn ───────────────────────────────────────────────────────────
('slokkvitaeki','thjonustulisti',
 'Skoðunarlistinn "Fyrirtæki í Þjónustu · Búið 2026" telur um 297 félög og er PDF-útflutningur úr appinu',
 'Þetta er listinn sem "í þjónustu" vísar til í daglegu tali. Dálkurinn sem markar þetta í grunninum er enn óstaðfestur.',
 'agnar','likely','chat'),

('slokkvitaeki','thjonustulisti',
 'Kerfisvilla hleypti búðarkúnnum inn á þjónustulistann — 40 félög eiga hvorki virk tæki né skýrslu og öll voru stofnuð 2026',
 'Stofnuð 27.4–31.7.2026. Sum þeirra eru þó raunverulega nýkomin í þjónustu (5 eiga sölur), svo þetta er YFIRFERÐARLISTI en ekki hreinsunarlisti — ekkert má fjarlægja án þess að Agnar líti á það.',
 'greining','confirmed','chat'),

('slokkvitaeki','thjonustulisti',
 'Félög án kennitölu geta aldrei tengst skýrslu eða reikningi — kt fyrst, allt annað á eftir',
 'Þrjú slík á þjónustulistanum 7.8.2026 (húsfélög og tannlæknastofa). Sama vandamál og "Grillvagninn ×2 + Brynja" í kröfuyfirferðinni í júlí.',
 'greining','confirmed','chat'),

-- ── Tvítök ────────────────────────────────────────────────────────────────────
('brunaholf','skjol',
 'Tvítök í skýrslumöppunni eru samnefndar skrár í 33 hópum (35 aukaeintök) — nafn dugar sem lykill þegar hash vantar',
 'Center Hótel og Heimaleiga eru fyrirferðarmest. Fyrsta eintak heldur sér, hin fá slóð í eyðingarlista. content_hash í skjalaheiti_log er áfram réttari lykillinn þegar hann er til.',
 'greining','confirmed','chat');


-- ── Artifact-skráning (þarf setup-artifacts.sql) ──────────────────────────────
insert into charlize_artifacts (path, filename, kind, system, purpose, status, notes)
values ('<slóð>/Uttektarskyrslur2026samanburdur.xlsx',
        'Uttektarskyrslur2026samanburdur.xlsx', 'sheet', 'brunaholf',
        'Samanburður þjónustulistans (297 félög) við Drive-möppuna Úttektarskýrslur (1.282 skrár, 260 frá 2026); lifandi COUNTIF/INDEX+MATCH uppfletting milli blaða',
        'active',
        'Blöð: Lestu mig, Búið 2026, Vantar tengingu, Til yfirferðar, Drive 2026, Tvítök, Án ártals. Búið til 7.8.2026. Tölurnar eldast — mynstrin eru skráð í charlize_knowledge.')
on conflict (path) do nothing;
