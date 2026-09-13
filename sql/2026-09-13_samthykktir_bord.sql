-- Samþykktir Agnars á Þjónustuborði, unnar 13.09.2026 (Claude).
-- Hvert skref var skilyrt á mælda stöðu (updated_at / status) og lesið til baka.
-- audit_vernd-gikkir á solur, fyrirtaeki, uttaeki og app_settings geyma fyrri gildi.

-- #924 (samþykkt 13.09. kl. 08:44): R-000698 „berfara" tvískráð sama tæki og R-000699 → ógilda.
update solur set status = 'void',
  athugasemdir = coalesce(athugasemdir, '') || E'\n[2026-09-13] Ógilt (mál #924, samþykkt Agnar 13.09.): tvískráð — sama tæki og R-000699 (Berghamar), sem var greidd með korti 19.08.'
where id = 745 and num = 'R-000698' and status = 'final' and paid_at is null and krafa_sent_at is null and dk_invoice_id is null
  and updated_at = '2026-09-08 23:26:42.234296+00';

-- #957 (samþykkt 13.09. kl. 08:43): R-000216 Áróra ehf. skráð „kort" en engin kortagreiðsla í Teya → krafa.
update solur set greitt_med = 'reikningur', greitt_med_prev = 'kort',
  athugasemdir = coalesce(athugasemdir, '') || E'\n[2026-09-13] Færð í kröfu (mál #957, samþykkt Agnar 13.09.): skráð greidd með korti 29.05. en engin kortagreiðsla finnst í Teya.'
where id = 269 and num = 'R-000216' and greitt_med = 'kort' and paid_at is null and krafa_sent_at is null and dk_invoice_id is null
  and updated_at = '2026-08-14 16:14:15.688373+00';

-- #983 (samþykkt 13.09. kl. 00:23): K-50 ehf. aftur í þjónustu; prófíll eftir Stólpa R-107430; Ársskoðun síðast 2025, október.
update fyrirtaeki set er_i_thjonustu = true where id = 847 and er_i_thjonustu = false;
update app_settings
set settings = jsonb_set(settings, '{arsskodun_customers,847}',
  ((settings->'arsskodun_customers'->'847') - 'steps_2026' - 'removed_from_service_at')
  || jsonb_build_object('subscribed', true, 'last_year_inspected', 2025, 'inspect_month', 10,
       'equipment', jsonb_build_object('lettvatn', 3, 'reykskynjarar', 4, 'eldvarnarteppi', 3),
       '_leidrett', '13.09.2026 mál #983 (samþykkt Agnar): aftur í þjónustu; tæki eftir Stólpa-reikningi R-107430'))
where id = 1 and settings->'arsskodun_customers' ? '847';
insert into uttaeki (fyrirtaeki_id, client, type, size, status, serial, location, last_insp, next_insp, notes)
select 847, 'K-50 ehf.', t.type, t.size, 'active',
  'AE20260913-' || lpad((coalesce((select max(substring(u.serial from 12)::int) from uttaeki u where u.serial ~ '^AE20260913-\d{4}$'), 0) + row_number() over (order by t.rod))::text, 4, '0'),
  'Vesturvör 32a, 201 Kópavogi', date '2025-10-20', date '2026-10-20',
  'Stofnað 13.09.2026 úr Stólpa-reikningi R-107430 (20.10.2025: ' || t.lysing || ') — mál #983'
from (values (1, 'Léttvatn', '6 L', '3 ný léttvatnstæki'), (2, 'Léttvatn', '6 L', '3 ný léttvatnstæki'), (3, 'Léttvatn', '6 L', '3 ný léttvatnstæki'),
             (4, 'Reykskynjari', '10 ára', '4 reykskynjarar MINI optískir 10 ára'), (5, 'Reykskynjari', '10 ára', '4 reykskynjarar MINI optískir 10 ára'),
             (6, 'Reykskynjari', '10 ára', '4 reykskynjarar MINI optískir 10 ára'), (7, 'Reykskynjari', '10 ára', '4 reykskynjarar MINI optískir 10 ára'),
             (8, 'Eldvarnarteppi', '100x100', '3 eldvarnarteppi 100x100'), (9, 'Eldvarnarteppi', '100x100', '3 eldvarnarteppi 100x100'),
             (10, 'Eldvarnarteppi', '100x100', '3 eldvarnarteppi 100x100')) t(rod, type, size, lysing)
where not exists (select 1 from uttaeki u where u.fyrirtaeki_id = 847 and u.notes like '%mál #983%');

-- #988 (samþykkt 13.09. kl. 08:48): Strandasel 9-11 sagði upp 18.08. (Eignaumsjón f.h. stjórnar) → úr áskrift og þjónustu, líka Strandasel 9.
update app_settings
set settings = jsonb_set(jsonb_set(settings, '{arsskodun_customers,1410}',
    (settings->'arsskodun_customers'->'1410') || jsonb_build_object('subscribed', false, 'removed_from_service_at', '2026-09-13',
      '_sagt_upp', '18.08.2026 Eignaumsjón f.h. stjórnar — mál #988')),
  '{arsskodun_customers,372}',
    (settings->'arsskodun_customers'->'372') || jsonb_build_object('subscribed', false, 'removed_from_service_at', '2026-09-13',
      '_sagt_upp', '18.08.2026 (rukkað með Strandaseli 9-11) — mál #988'))
where id = 1 and settings->'arsskodun_customers' ? '1410' and settings->'arsskodun_customers' ? '372';
update fyrirtaeki set er_i_thjonustu = false where id in (1410, 372) and er_i_thjonustu = true;

-- Ekki unnið, bíður staðfestingar í spjalli (óafturkræft í Payday): #980 R-000356 (Payday nr. 73), #982 R-000357 (nr. 72).

-- #991–#994 (samþykkt í spjalli 13.09.: „mátt merkja greitt"): fjórar kortasölur greiddar á Teya-posanum en aldrei merktar greiddar.
-- paid_at = tími kortafærslunnar (Teya-færsluskrá 05.01.–11.09.2026); paid_method = 'kort'.
with v(num, mal, greitt, kr_txt, tima_txt, uppf) as (values
  ('R-000192', 991, timestamptz '2026-05-27 14:16:22+00', '8.500', '27.05. kl. 14:16', timestamptz '2026-08-14 16:14:15.688373+00'),
  ('R-000167', 992, timestamptz '2026-05-21 11:09:49+00', '12.325', '21.05. kl. 11:09', timestamptz '2026-08-14 16:14:15.688373+00'),
  ('R-000218', 993, timestamptz '2026-05-29 14:54:41+00', '9.360', '29.05. kl. 14:54', timestamptz '2026-08-14 16:14:15.688373+00'),
  ('R-000202', 994, timestamptz '2026-05-28 14:31:32+00', '11.662', '28.05. kl. 14:31', timestamptz '2026-09-08 23:26:42.234296+00')
)
update solur so set paid_at = v.greitt, paid_method = 'kort',
  athugasemdir = coalesce(so.athugasemdir, '') || E'\n[2026-09-13] Merkt greidd með korti (mál #' || v.mal || ', samþykkt Agnar í spjalli 13.09.): Teya-posinn ' || v.tima_txt || ', ' || v.kr_txt || ' kr.'
from v
where so.num = v.num and so.greitt_med = 'kort' and so.status = 'final' and so.paid_at is null and so.updated_at = v.uppf;

-- #747 (samþykkt í spjalli 13.09.: „mátt gera á réttu kennitöluna"): Breiðvangur 9.
-- Staðurinn #366 bar kt Víðivangs 5 (511281-0409) og R-000415 fór á hana; Payday afturkallaði (nr. 43 + kredit nr. 120).
-- Skatturinn: 640376-0319 = Breiðvangur 9,húsfélag; 511281-0409 = Víðivangur 5,húsfélag. #600 var tvítekinn staður með réttu kt.
-- Niðurstaða (lesið til baka): ný sala R-000938 (35.320 kr, kt 640376-0319, grunnur 659), kredit R-000939 á R-000415,
-- #366 kt 640376-0319 / grunnur 659, #600 sameinaður (eyddur, stadur_nr null), kúnni #319 = Víðivangur 5.
insert into audit_vernd (table_name, op, row_id, old_row, changed_at)
select 'document_pairs', 'UPDATE', p.id::text, to_jsonb(p), now() from document_pairs p where p.id in (1392, 608, 1014);
insert into audit_vernd (table_name, op, row_id, old_row, changed_at)
select 'reikningslestur', 'UPDATE', r.reikningur_nr, to_jsonb(r), now() from reikningslestur r where r.fyrirtaeki_id = 600;
insert into audit_vernd (table_name, op, row_id, old_row, changed_at)
select 'uttekt_reikningur_facts', 'UPDATE', u.id::text, to_jsonb(u), now() from uttekt_reikningur_facts u where u.id = 109;
update fyrirtaeki set stadur_nr = null, deleted_at = now(), er_i_thjonustu = false,
  athugasemdir = coalesce(athugasemdir, '') || E'\n13.09.2026 (mál #747): sameinað í #366 Breiðvangur 9. Netfang hér: sigurrossig@gmail.com.'
where id = 600 and deleted_at is null;
update fyrirtaeki set kennitala = '640376-0319', customer_base_id = 659,
  athugasemdir = coalesce(athugasemdir, '') || E'\n13.09.2026 (mál #747): rétt kennitala 640376-0319 (Breiðvangur 9, húsfélag skv. Skattinum) — var ranglega 511281-0409, sem er Víðivangur 5. Sameinað við #600. Annað netfang: sigurrossig@gmail.com.'
where id = 366 and kennitala = '511281-0409';
update uttaeki set status = 'urelt',
  notes = coalesce(notes, '') || ' · 13.09.2026 úrelt: tvítak — sami staður og #366 Breiðvangur 9, sem heldur 2026-tækjalistanum (mál #747)'
where fyrirtaeki_id = 600 and status <> 'urelt';
update uttaeki set customer_base_id = 659 where fyrirtaeki_id = 366 and status <> 'urelt';
update customer_documents set fyrirtaeki_id = 366 where id in (478, 1881, 3539) and fyrirtaeki_id = 600;
update customer_documents set customer_base_id = 659 where id in (5942, 1875) and fyrirtaeki_id = 366;
update document_pairs set fyrirtaeki_id = 366, updated_at = now() where id in (1392, 608) and fyrirtaeki_id = 600;
update document_pairs set customer_base_id = 659, updated_at = now() where id = 1014 and customer_base_id = 319;
update reikningslestur set fyrirtaeki_id = 366 where fyrirtaeki_id = 600;
update uttekt_reikningur_facts set fyrirtaeki_id = 366 where id = 109 and fyrirtaeki_id = 600;
update app_settings
set settings = jsonb_set(settings, '{arsskodun_customers,600}',
  (settings->'arsskodun_customers'->'600') || jsonb_build_object('subscribed', false, '_sameinad_i', 366, '_sameinad', '13.09.2026 mál #747'))
where id = 1 and settings->'arsskodun_customers' ? '600';
update customers_base set nafn = 'Víðivangur 5,húsfélag', heimilisfang = 'Víðivangi 5, 220 Hafnarfjörður',
  general_notes = coalesce(general_notes, '') || E'\n13.09.2026 (mál #747): kennitalan 511281-0409 er Víðivangur 5, húsfélag skv. Skattinum. Breiðvangur 9 (#366) var ranglega á þessum kúnna og er nú á #659. Hér standa eftir afturkallaður reikningur R-000415 og skjöl Víðivangs 5 — sjá mál #990.'
where id = 319 and kennitala = '511281-0409';
-- Endurútgáfa (R-000938), kreditfærsla (R-000939) og „greitt"-merki af R-000415 í einni CTE-setningu, skilyrt á updated_at R-000415
-- (sjá lotuna í samtali 13.09.; númerin koma úr reikningur_seq gegnum gikkinn solur_set_num).
-- Sannreynt í sömu færslu með DO-blokk sem hefði afturkallað allt ef eitthvert skilyrði brást.
-- Viðbót eftir yfirferð: greiðandinn #659 bar heimilisfang tvítaksins #600 („200 Kópavogur").
-- Skatturinn (/api/kt-lookup?kt=6403760319): Breiðvangi 9, 220 Hafnarfjörður. payday-push sendir customers_base.heimilisfang á kröfuna.
with afrit as (
  insert into audit_vernd (table_name, op, row_id, old_row, changed_at)
  select 'customers_base', 'UPDATE', c.id::text, to_jsonb(c), now()
  from customers_base c where c.id = 659 and c.heimilisfang = 'Breiðvangi 9, 200 Kópavogur'
  returning row_id
)
update customers_base c set heimilisfang = 'Breiðvangi 9, 220 Hafnarfjörður',
  general_notes = coalesce(c.general_notes, '') || E'\n13.09.2026 (mál #747): heimilisfang leiðrétt eftir Skattinum — var „200 Kópavogur“ úr tvítekna staðnum #600.'
from afrit
where c.id = 659 and afrit.row_id = '659';

-- Kvöld 13.09.: samþykkt vinnublöð unnin í appinu (#1008 Hjarðarból, #1014 Ölfusborgir, #1023 Hraunbær 64).
-- Tækjaval, hök, akstur, lás og „Vista / í Vinnslu“ fóru gegnum viðmótið (sara-skill); aðeins gagnabreytingarnar hér.

-- Ölfusborgir (#482): Agnar í spjalli — „ölfus eyða umfram tækjum“ og „Henda öllu … tækjum sem eiga ekki að vera þarna“.
-- Blaðið: 39 léttvatn; kerfið hafði 41 léttvatn + 1 duft. Hörð eyðing er Agnars, svo umframtækin eru merkt úrelt (224 felur þau).
update uttaeki set status = 'urelt'
where fyrirtaeki_id = 482 and status = 'active' and id in (24716, 24717, 24718);

-- Hjarðarból (#697): nýtt 2 L léttvatnstæki af blaðinu („1x 2L léttvatns“, Agnar 10.09.: nýtt tæki).
-- Stærð „2L“ (ekki „2 L“) svo findReplacementProduct (129) pari það við vöruna „Léttvatn 2L slökkvitæki“ (5.000 kr).
insert into uttaeki (serial, type, size, client, location, status, fyrirtaeki_id, customer_base_id)
select 'AE20260913-0011', 'Léttvatn', '2L', 'Grasnytjar ehf Hjarðarbóli', 'Hjarðarbóli, 816 Ölfus', 'active', 697, 674
where not exists (select 1 from uttaeki where serial = 'AE20260913-0011')
  and not exists (select 1 from uttaeki where fyrirtaeki_id = 697 and status = 'active' and type = 'Léttvatn' and size ilike '2%');

-- Hraunbær 64 (#130 / grunnur 227): Agnar í spjalli — „Hraunbær 64 er í 110 Reykjavík“. Tækin báru þegar 110 Reykjavík.
-- payday-push sendir customers_base.heimilisfang á kröfuna. Staðfest á fyrirtækissíðunni eftir breytingu.
with afrit as (
  insert into audit_vernd (table_name, op, row_id, old_row, changed_at)
  select 'customers_base', 'UPDATE', c.id::text, to_jsonb(c), now()
  from customers_base c where c.id = 227 and c.heimilisfang = 'Hraunbær 64, 220 Hafnarfjörður'
  returning row_id
), cb as (
  update customers_base c set heimilisfang = 'Hraunbær 64, 110 Reykjavík',
    general_notes = coalesce(c.general_notes, '') || E'\n13.09.2026: heimilisfang leiðrétt í 110 Reykjavík (Agnar staðfesti) — var „220 Hafnarfjörður“.'
  from afrit where c.id = 227 and afrit.row_id = '227'
  returning c.id
)
update fyrirtaeki f set heimilisfang = 'Hraunbær 64, 110 Reykjavík',
  athugasemdir = coalesce(f.athugasemdir, '') || E'\n13.09.2026: heimilisfang leiðrétt í 110 Reykjavík (Agnar staðfesti) — var „220 Hafnarfjörður“.'
where f.id = 130 and f.heimilisfang = 'Hraunbær 64, 220 Hafnarfjörður';
