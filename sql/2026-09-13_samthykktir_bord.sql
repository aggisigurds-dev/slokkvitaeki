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
