-- Charlize — lærdómur úr yfirferð á 40 félögum án skýrslu (07.08.2026)
-- Keyra EFTIR setup.sql. Mynstrið er skráð, ekki listinn sjálfur — hann er verkefni.

insert into charlize_knowledge (scope, topic, fact, detail, source, confidence, agent) values

('slokkvitaeki','thjonustulisti',
 'Félag án skýrslu er sjaldnast gleymd skoðun — átta ólíkar orsakir liggja að baki og hver þeirra hefur sitt úrræði',
 'Flokkarnir: vantar kt · vantar heimilisfang · umsjónar-/pósthólfsfang · skrifstofa rekstrarfélags · keðja með sameiginlega kt · virkur kúnni án skýrslu · nýskráð (of nýtt) · óútskýrt. Notaðu þessa flokkun áður en nokkuð er fjarlægt af þjónustulistanum.',
 'greining','confirmed','chat'),

('slokkvitaeki','thjonustulisti',
 'Húsfélög eru oft skráð á pósthólf eða skrifstofu umsjónaraðila í stað fasteignarinnar — þá er ekki hægt að para skýrslu við stað',
 'Dæmi 7.8.2026: þrjú húsfélög öll á "Pósthólf 8940, 128 Reykjavík", eitt á "Suðurlandsbraut 30" (skrifstofa umsjónaraðila). Rétt götuheimilisfang þarf að sækja til umsjónaraðilans.',
 'greining','confirmed','chat'),

('slokkvitaeki','thjonustulisti',
 'Rekstrarfélag sem sér um eignir annarra á sjálft ekki endilega úttekt — merkja á sem umsjónaraðila, ekki þjónustustað',
 'Annars situr skrifstofan að eilífu á listanum yfir "vantar skýrslu". Sama gildir um pósthólfs-færslur keðja.',
 'agnar','confirmed','chat'),

('slokkvitaeki','thjonustulisti',
 'Hópstofnanir (mörg félög stofnuð sama dag) benda til sjálfvirkrar innsetningar, ekki raunverulegra nýrra samninga',
 'Mælt 7.8.2026: 17.05 (5 félög), 01.06 (8), 02.06 (9), 28.07 (5), 29.07 (7). Félög sem verða til hvert af öðru úr sölu dreifast yfir daga. Notaðu stofndaginn sem vísbendingu þegar grunur er um ranga skráningu.',
 'greining','likely','chat'),

('slokkvitaeki','thjonustulisti',
 'Félag stofnað síðustu vikurnar á ekki að teljast vantandi skýrslu — úttekt væri ekki komin þótt allt væri í lagi',
 'Af 40 félögum án skýrslu voru 8 stofnuð innan mánaðar. Sía á stofndegi áður en listinn er túlkaður.',
 'greining','confirmed','chat'),

('slokkvitaeki','thjonustulisti',
 'Kennitölu-mynstur skilur einstakling frá félagi — fæðingardagur fremst (dagur 01-31, mánuður 01-12) þýðir persóna, ekki fyrirtæki',
 'Einstaklingar á þjónustulistanum eru nær alltaf búðarkúnnar sem lentu þar fyrir mistök.',
 'greining','confirmed','chat'),

('brunaholf','skjol',
 'Þegar félag á enga skrá á kt OG ekkert nafn-match í möppunni er skýrslan ekki "týnd í möppunni" — hún er utan hennar eða var aldrei gerð',
 'Prófað 7.8.2026: 40 félög borin saman við 260 skrár frá 2026, 56 án ártals og 35 tvítök. Aðeins eitt fann samsvörun, og það var vegna sameiginlegrar keðju-kennitölu. Sparar tíma að útiloka þessa leið strax.',
 'greining','confirmed','chat'),

('slokkvitaeki','postur',
 'Pósturinn sker úr um hvort félag án skýrslu sé nýr samningur eða ranglega stofnað — leitaðu á nafni OG kennitölu',
 'Finnist þjónustusamningur eða tilboð er félagið réttilega á listanum og bíður úttektar; finnist ekkert nema stök sala er það líklega búðarkúnni sem lenti á þjónustulistanum.',
 'agnar','confirmed','chat');
