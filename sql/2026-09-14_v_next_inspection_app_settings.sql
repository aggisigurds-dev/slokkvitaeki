-- v_next_inspection — handvirkur skoðunarmánuður úr app_settings, ekki app_kv.   ÓBEITT 14.09.2026.
--
-- VILLAN. Viewið las handvirka/blob-mánuðinn úr app_kv (key 'arsskodun_customers'), en appið
-- vistar hann ekki þar: 153-arsskodun.js (📅-takkinn, „⬇ Úr þjónustu") skrifar gegnum
-- AppSettings (85-app-settings.js) í app_settings.settings -> 'arsskodun_customers' (id = 1).
-- Ekkert í kóðanum skrifar lykilinn í app_kv. Gáttin (netlify/functions/gatt.js:99 og :178)
-- les v_next_inspection og sýndi því viðskiptavinum annan „næsta skoðunarmánuð" en
-- starfsfólk sér á Ársskoðun.
--
-- MÆLT 14.09.2026 (publishable-lykill, lestur eingöngu): 613 staðir eiga mánuð í
-- app_settings. Gáttin sýndi ANNAN mánuð á 33 þeirra og ENGAN á 30. Dæmi: Norðurbrú 1
-- (1733) handvirkt ágúst → gátt maí; Húnar ehf. (1734) ágúst → júní; Berjarimi 14 (1732)
-- apríl → september. Hermun á þessu viewi yfir alla 1.180 staði gáttarinnar: 63 breytast
-- (30 fá mánuð þar sem enginn var, 33 fá mánuð starfsfólksins), 0 missa mánuð, 1.117 óbreyttir.
--
-- VÖRN. Gamla viewið steypti textanum beint í ::int — eitt ógilt gildi (t.d. 'ágú') hefði
-- fellt viewið í heild og þar með gáttina. Nú telst aðeins heiltala 1–12 mánuður; annað
-- fellur í næsta þrep eins og í 153 (+manual.inspect_month >= 1 && <= 12). Mælt: 0 ógild
-- gildi í dag, 3 tóm.
--
-- FORGANGUR óbreyttur og sá sami og í 153: handvirkt/blob > skýrslu-mánuður
-- (arsskodun_report_facts) > skýrsla+reikningur (v_skodunar_manudur). next_insp-ágiskunin í
-- 153 er enn aðeins í appinu.

create or replace view v_next_inspection as
with blob as (
  select settings -> 'arsskodun_customers' as ac
  from app_settings
  where id = 1
)
select
  f.id               as site_id,
  f.customer_base_id as base_id,
  coalesce(
    (select case
              when (b.ac -> f.id::text ->> 'inspect_month') ~ '^[0-9]{1,2}$'
               and (b.ac -> f.id::text ->> 'inspect_month')::int between 1 and 12
              then (b.ac -> f.id::text ->> 'inspect_month')::int
            end
       from blob b),
    af.inspect_month,
    vm.inspect_month
  )::smallint        as inspect_month
from fyrirtaeki f
left join arsskodun_report_facts af on af.fyrirtaeki_id = f.id
left join v_skodunar_manudur    vm on vm.fyrirtaeki_id = f.id
where f.deleted_at is null;

-- STAÐFESTING eftir beitingu (á að skila 0 röðum):
--   select f.id, (s.settings -> 'arsskodun_customers' -> f.id::text ->> 'inspect_month') as starfsfolk, n.inspect_month as gatt
--   from fyrirtaeki f
--   join v_next_inspection n on n.site_id = f.id
--   cross join (select settings from app_settings where id = 1) s
--   where (s.settings -> 'arsskodun_customers' -> f.id::text ->> 'inspect_month') ~ '^([1-9]|1[0-2])$'
--     and n.inspect_month is distinct from (s.settings -> 'arsskodun_customers' -> f.id::text ->> 'inspect_month')::int;
