-- Charlize — bakgrunnur: yfirtakan og þjónustuyfirferðin (skráð 07.08.2026)
-- Keyra EFTIR setup.sql.
--
-- Þetta er SAMHENGIÐ sem allt hitt hvílir á. Án þess les næsti agent gögnin rangt:
-- gloppurnar í 2024/2025 eru ekki gagnagrunnsvilla, þær eru arfur.

insert into charlize_knowledge (scope, topic, fact, detail, source, confidence, agent) values

-- ── Yfirtakan ─────────────────────────────────────────────────────────────────
('baedi','saga',
 'Brunahólf keypti Slökkvitæki ehf í maí 2026 — fyrirtækin eru enn aðskilin, en Brunahólf er kaupandinn',
 'Um það bil þremur mánuðum fyrir ágúst 2026. Þetta skýrir af hverju gögnin eru tvískipt og af hverju sagan fyrir maí 2026 er ekki á ábyrgð núverandi kerfis.',
 'agnar','confirmed','chat'),

('slokkvitaeki','saga',
 'Fyrri eigendur héldu mjög takmarkað skipulag — engin áreiðanleg skrá yfir hvert var farið eða hvað var eftir',
 'Bókhaldið var í Stólpa. Núverandi app var byggt frá grunni til að leysa þetta af hólmi.',
 'agnar','confirmed','chat'),

('slokkvitaeki','saga',
 'Fyrri eigendur gleymdu 50–60 heimsóknum árið 2025 og svipuðum fjölda 2024',
 'Þess vegna er gloppa í skoðunarsögunni sem er ARFUR en ekki gagnagrunnsvilla. Ekki eyða félagi af listanum þótt engin skoðun finnist 2024/2025 — það er einmitt hópurinn sem á að endurheimta.',
 'agnar','confirmed','chat'),

-- ── Markmiðið ─────────────────────────────────────────────────────────────────
('slokkvitaeki','thjonustulisti',
 'Meginverkefnið er að ná utan um hverja þeir raunverulega þjónusta, hvert á eftir að fara í skoðun, og hvort allir séu komnir á skrá',
 'Allar greiningar á skoðunarlistanum eiga að þjóna þessu. Markmiðið er endurheimt + fast skipulag til framtíðar, ekki hreinsun.',
 'agnar','confirmed','chat'),

('slokkvitaeki','thjonustulisti',
 'Þrír aðskildir hópar á listanum sem má ekki rugla saman',
 '(1) Félög sem skráðust ÓVART inn í fyrirtæki í þjónustu — eiga ekki heima þar. (2) Félög sem fengu þjónustusamning rétt FYRIR yfirtökuna — eiga heima þar en fundust ekki. (3) Gleymdar heimsóknir 2024/2025 — eiga heima þar og á að endurheimta. Sama einkenni (engin saga) hjá öllum þremur, þrjár gjörólíkar aðgerðir.',
 'agnar','confirmed','chat'),

('slokkvitaeki','thjonustulisti',
 'Samningar sem gerðir voru rétt fyrir yfirtökuna eru ekki í nýja kerfinu og finnast ekki í því',
 'Nýja appið var byggt eftir yfirtöku, svo "Stofnað"-dagsetning þar er innsláttardagur, ekki samningsdagur. Þessir samningar liggja í Stólpa, í pósti eða á pappír hjá fyrri eigendum — leitin verður að byrja þar.',
 'greining','likely','chat'),

('slokkvitaeki','stolpi',
 'Stólpi var bókhaldskerfi fyrri eigenda og er eina heimildin um sumt fyrir maí 2026',
 'Reikningar liggja þar (og í Payday eftir yfirtöku). Þótt kerfið sé óþjált er það sögulega heimildin þegar spurt er hverjum var þjónustað fyrir yfirtöku.',
 'agnar','confirmed','chat');
