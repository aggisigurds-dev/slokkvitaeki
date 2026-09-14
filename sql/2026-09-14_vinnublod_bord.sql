-- 2026-09-14 · Þjónustuborð og Vinnublöð (Claude). SKRÁNING á því sem var gert — ekki til endurkeyrslu.
-- Öll skrif voru skilyrt (guard + raise exception) og eldri raðir afritaðar í audit_vernd
-- (table_name thjonustubeidni / sara_yfirferd, op 'UPDATE', changed_at 14.09.2026 00:22–01:20).

-- 1) Skýringar Agnars 14.09. kl. 00:00–00:03 endurmetnar (svar:endurmeta → samthykki, status nytt):
--    #986  Þangbakki 8-10: engin ný krafa. Tillaga: taka „tekið út 2026“ af í Ársskoðun, merkja skýrsluna
--          frá 07.08. ógilda og taka „greidd 10.08.“ af R-000716 (núlluð með R-000723).
--    #1009 Leir og postulín: þegar rukkað á R-000917 (Hákon 10.09.). Á hana vantar 1 dufthleðslu og 1 akstur,
--          sem eru ekki rukkuð eftir á. Tillaga: loka og bæta 2. dufttækinu í tækjalistann.
--    #1020 Suðurlandsbraut 30: sameina #1280 (án kt, 8 tvítekin tæki → urelt) við #463 og rukka
--          júní-heimsóknina eftir blaði 009, um 41.000 kr án vsk. Kennitala 531180-0709 staðfest hjá Skattinum.
--    #1011 Gullsmári 11: „Sleppa stútnum“ → loka án reiknings.
--    sara_yfirferd 19, 41, 49: kerfi / spurning / linur uppfært til samræmis.

-- 2) Línur af blöðum sem Agnar myndaði 14.09. og vantaði í Vinnublöð (sara 58–63 · mál #1030–#1035):
--    58 / #1030  Cornelli (Hamraborg 7)            — „Vantar tæki · 1x nýtt léttvatnstæki“
--    59 / #1031  MOMO (Hamraborg 7)                — „Vantar tæki · 1x nýtt léttvatnstæki“
--    60 / #1032  Zsazsa Hár 23 (á blaði „Hár 27“)   — X í h-dálki dufts, án hrings
--    61 / #1033  Aðalskoðun Skeifunni               — „Brunaslanga lekur, þarf að láta laga hana“
--    62 / #1034  Polo sjoppan (Hraunbæ 121)         — léttvatn nr. 4617 yfirfarið 11.05.
--    63 / #1035  Hamborgarabúllan                   — strikuð út, engin skoðun né reikningur 2026
--    Úrklippur: verkbord-files/thjonustubeidni/<mál>/vinnublad.jpg — hlaðið upp og lesnar til baka (bæti stemma).

-- 3) #965 Megin lögmannsstofa: „skipt um haus“ (blað Júlí 2026) bætt í tillöguna + úrklippa
--    thjonustubeidni/965/vinnublad.jpg og röð í thjonustubeidni_files.

-- 4) #971 Suðurlandsbraut 30 lokað ÓUNNIÐ. Samþykkt 13.09. var að taka „tekið út 2026“ af af því engin
--    heimsókn sást — en blað 009 (júní) sýnir heimsóknina, sem rukkast gegnum #1020.
update thjonustubeidni set
  notes = notes || E'\n— Ekki unnið 14.09. (Claude): vinnublaðið frá júní (blað 009) sýnir að farið var á Suðurlandsbraut 30, svo „tekið út 2026“ stendur. Heimsóknin er rukkuð gegnum #1020.',
  status = 'lokad', updated_at = now()
where id = 971 and deleted_at is null and status = 'tilbuid' and tags ? 'svar:samthykkt'
  and title like 'Húsfélagið Suðurlandsbraut 30:%';

-- 5) Kröfuyfirlit „📤 Ósendar kröfur“ mælt 14.09. kl. ~01:10 með reglu appsins (166: sölur með kreditreikningi út):
--    21 sala, 1.592.099 kr. Án kredit-reglunnar teljast 30 sölur / 3.233.603 kr.
with r as (select * from solur where greitt_med = 'reikningur' and paid_at is null),
     cids as (select distinct credit_of from r where coalesce(is_credit,false) and credit_of is not null)
select count(*), sum(samtals) from r
where not coalesce(r.is_credit,false) and r.id not in (select credit_of from cids)
  and coalesce(r.status,'') <> 'void' and r.krafa_sent_at is null and r.invoiced_at is null and r.dk_invoice_id is null;

-- Sannprófun
select id, title, status, tags from thjonustubeidni
where id in (965, 971, 986, 1009, 1011, 1020, 1030, 1031, 1032, 1033, 1034, 1035) order by id;
select id, fyrirtaeki, stada, rod, mynd_url from sara_yfirferd where id in (19, 41, 49, 58, 59, 60, 61, 62, 63) order by id;
