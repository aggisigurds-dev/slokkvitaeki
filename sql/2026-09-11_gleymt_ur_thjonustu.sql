-- 2026-09-11 (síðdegis, 2) — „Gleymst að rukka?": sleppa stöðum úr þjónustu sem hafa enga skýrslu með skrá
--
-- Agnar 11.09.2026 um K-50 ehf. (kt. 551217-1830): „ég var búinn að taka þetta úr þjónustu því það hefur aldrei
--   verið farið þangað, það hafði einhverntíma verið röng skýrsla sem er ekki lengur í drive, svo það er helling af
--   svona … röngum skýrslum á mörg búðarsölu sem gerðu sig af í þjónustufyrirtækjum en var bara bull"
--
-- Mælt 11.09.2026:
--   • K-50 (fid 847): er_i_thjonustu = false, 0 tæki, 0 sölur. Skýrsla 2026 (customer_documents 389): hvorki
--     drive_file_id né storage_path; „uttekt-master review 86: K.Rickter.pdf · dauður Drive-hlekkur fjarlægður".
--   • Fasteignasalan Garður (fid 1191): sama mynstur (úr þjónustu, 0 tæki, skýrsla án skrár).
--   • Á öllum árum: 13 úttektarskýrslur án skrár á stöðum úr þjónustu án tækja — allar sjálfvirkar samsvaranir
--     („Staðgreitt", einstaklingar, bílaverkstæði). 69 án skrár eru á stöðum Í þjónustu MEÐ tæki (líklega raunverulegar
--     skýrslur sem týndust) — þær eru EKKI snertar hér.
--
-- Breytingin (aðeins birtingarregla — engu skjali breytt, afturkræft):
--   1. v_uttekt_an_reiknings_grunnur fær tvo dálka aftast: er_i_thjonustu og skyrslur_med_skra (skýrslur ársins
--      sem hafa drive_file_id eða storage_path).
--   2. v_gleymt_ad_rukka_uttekt sleppir stöðum sem eru úr þjónustu (er_i_thjonustu = false) OG hafa enga skýrslu
--      með skrá; fær skyrslur_med_skra aftast svo 368 geti merkt „skýrslan finnst ekki" á stöðum í þjónustu.
--   Staður úr þjónustu MEÐ skýrslu sem finnst stendur áfram á listanum — hann gæti verið raunverulega órukkaður.
-- Fyrri útgáfa: sql/2026-09-11_gleymt_uttekt_stolpi.sql (sama rökfræði að öðru leyti, orðrétt hér að neðan).

create or replace view public.v_uttekt_an_reiknings_grunnur as
with ar as (
  select extract(year from now())::integer as y
), skyrslur as (
  select d.fyrirtaeki_id, count(*) as fjoldi,
         max(coalesce(d.doc_date, make_date(d.year, 1, 1))) as dags,
         max(d.doc_date) as doc_dags,
         count(*) filter (where d.drive_file_id is not null or d.storage_path is not null) as med_skra
  from public.customer_documents d, ar
  where d.doc_type = 'uttektarskyrsla' and d.year = ar.y and not coalesce(d.is_duplicate, false) and d.fyrirtaeki_id is not null
  group by d.fyrirtaeki_id
), reikn_skjal as (
  select distinct d.fyrirtaeki_id
  from public.customer_documents d, ar
  where d.doc_type = 'reikningur' and d.year = ar.y and d.fyrirtaeki_id is not null
), sala_ar as (
  select s.customer_base_id, s.customer_id
  from public.solur s, ar
  where extract(year from s.created_at) = ar.y::numeric and coalesce(s.status, '') <> 'void' and not coalesce(s.is_credit, false)
), rukkad as (
  select f_1.id
  from public.fyrirtaeki f_1
  where exists (select 1 from reikn_skjal r where r.fyrirtaeki_id = f_1.id)
     or exists (select 1 from sala_ar s where s.customer_id = f_1.id or (f_1.customer_base_id is not null and s.customer_base_id = f_1.customer_base_id))
), skodun as (
  select u.fyrirtaeki_id, max(u.last_insp) as dags
  from public.uttaeki u, ar
  where u.fyrirtaeki_id is not null and u.last_insp >= make_date(ar.y, 1, 1) and u.last_insp < make_date(ar.y + 1, 1, 1)
  group by u.fyrirtaeki_id
), stolpi as (
  select s.kt10, s.reikn_nr, s.dags, s.stada, s.upphaed
  from public.stolpi_reikningar s
  where s.tegund = 'reikningur' and s.stada in ('greitt', 'opid_vid_yfirtoku') and s.kt10 is not null
), grunnur as (
  select f.id as fyrirtaeki_id, f.nafn, f.kennitala, f.heimilisfang, f.postnumer, f.customer_base_id,
         sk.fjoldi as skyrslur, sk.dags as skyrsla_dags,
         coalesce(sk.doc_dags, so.dags) as skodun_dags,
         case when sk.doc_dags is not null then 'skyrsla' when so.dags is not null then 'taeki' end as skodun_heimild,
         nullif(regexp_replace(coalesce(f.kennitala, ''), '\D', '', 'g'), '') as kt_stadar,
         nullif(regexp_replace(coalesce(cb.kennitala, ''), '\D', '', 'g'), '') as kt_kunna,
         f.er_i_thjonustu, sk.med_skra as skyrslur_med_skra
  from skyrslur sk
  join public.fyrirtaeki f on f.id = sk.fyrirtaeki_id and f.deleted_at is null
  left join public.customers_base cb on cb.id = f.customer_base_id
  left join skodun so on so.fyrirtaeki_id = f.id
  where not (f.id in (select rukkad.id from rukkad))
    and not exists (
      select 1 from public.fyrirtaeki f2
      where f2.id <> f.id and f2.deleted_at is null
        and nullif(regexp_replace(coalesce(f2.kennitala, ''), '\D', '', 'g'), '') = nullif(regexp_replace(coalesce(f.kennitala, ''), '\D', '', 'g'), '')
        and f2.id in (select rukkad.id from rukkad))
)
select g.fyrirtaeki_id, g.nafn, g.kennitala, g.heimilisfang, g.postnumer, g.customer_base_id, g.skyrslur, g.skyrsla_dags,
       g.skodun_dags, g.skodun_heimild,
       vb.id as vinnublad_id, vb.manudur as vinnublad_manudur, vb.dagsetning as vinnublad_dags, vb.stada as vinnublad_stada,
       sp.reikn_nr as stolpi_nr, sp.dags as stolpi_dags, sp.stada as stolpi_stada, sp.upphaed as stolpi_upphaed,
       sl.reikn_nr as stolpi_sidast_nr, sl.dags as stolpi_sidast_dags, sl.stada as stolpi_sidast_stada, sl.upphaed as stolpi_sidast_upphaed,
       g.er_i_thjonustu, g.skyrslur_med_skra
from grunnur g
cross join ar
left join lateral (
  select v.id, v.manudur, v.dagsetning, v.stada
  from public.sara_yfirferd v
  where v.fyrirtaeki_id = g.fyrirtaeki_id
     or (g.kt_stadar is not null and nullif(regexp_replace(coalesce(v.kennitala, ''), '\D', '', 'g'), '') = g.kt_stadar)
  order by v.created_at desc
  limit 1
) vb on true
left join lateral (
  select s.reikn_nr, s.dags, s.stada, s.upphaed
  from stolpi s
  where s.kt10 in (g.kt_stadar, g.kt_kunna)
    and s.dags >= make_date(ar.y, 1, 1)
    and (g.skodun_dags is null or s.dags >= g.skodun_dags - 14)
  order by s.dags desc
  limit 1
) sp on true
left join lateral (
  select s.reikn_nr, s.dags, s.stada, s.upphaed
  from stolpi s
  where s.kt10 in (g.kt_stadar, g.kt_kunna)
  order by s.dags desc
  limit 1
) sl on true;

create or replace view public.v_gleymt_ad_rukka_uttekt as
select fyrirtaeki_id, nafn, kennitala, heimilisfang, postnumer, customer_base_id, skyrslur, skyrsla_dags,
       skodun_dags, skodun_heimild, vinnublad_id, vinnublad_manudur, vinnublad_dags, vinnublad_stada,
       stolpi_sidast_nr, stolpi_sidast_dags, stolpi_sidast_stada, stolpi_sidast_upphaed,
       skyrslur_med_skra
from public.v_uttekt_an_reiknings_grunnur
where stolpi_nr is null
  and not (er_i_thjonustu is false and skyrslur_med_skra = 0);

-- ── Staðfesting (lesið) ──────────────────────────────────────────────────────────────────
-- select count(*) from public.v_gleymt_ad_rukka_uttekt;      → 17 (var 19: K-50 og Fasteignasalan Garður út)
-- select count(*) from public.v_gleymt_uttekt_stolpi;        → 20 (óbreytt)
--
-- ── Afturköllun ──────────────────────────────────────────────────────────────────────────
-- Keyra sql/2026-09-11_gleymt_uttekt_stolpi.sql aftur fyrir v_gleymt_ad_rukka_uttekt eftir
--   drop view public.v_gleymt_ad_rukka_uttekt; (CREATE OR REPLACE fjarlægir ekki dálka).
