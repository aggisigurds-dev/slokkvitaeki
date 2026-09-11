-- 2026-09-11 (síðdegis) — „Gleymst að rukka?": skoðunarmánuður, vinnublað og Stólpi (fyrri eigendur)
--
-- Beiðni Agnars 11.09.2026 (skjámynd af listanum, 39 úttektir án reiknings, allar merktar „2026"):
--   „vantar svoldið að sýna eitthvað... hvaða mánuð skýrslan var gerð, er hún á vinnublaði,
--    eða kanski greitt gegnum fyrri eigendur"
-- og fyrri regla hans: „ef það hefur verið sent frá stólpa [má gera ráð fyrir] að það sé merkt greitt til fyrri eiganda".
--
-- Mælt 11.09.2026 á þeim 39 línum sem sýnin skilaði:
--   • 20 eiga Stólpa-reikning (tegund reikningur, greitt eða opið við yfirtöku) á SÖMU kennitölu,
--     dagsettan eftir skoðunina — 14 × 26.–27.02 (febrúarskoðanir), 6 × 19.03–08.04 (marsskoðanir).
--     Þær voru rukkaðar af fyrri eigendum; sýnin sá það ekki því Stólpa-bókin er ekki í customer_documents.
--   • Skýrslurnar bera nær aldrei doc_date (Drive-sóp 06.–08.06 skráði aðeins árið) → allar sýndust „2026".
--     uttaeki.last_insp (mánaðar-nákvæm) gefur skoðunarmánuð fyrir 32 af 39.
--   • Aðeins 1 af 39 er á vinnublaði (Berjarimi 1-7, blað „Júní", bíður).
--
-- Breytingin (fyrri útgáfa: sql/2026-09-11_v_gleymt_ad_rukka_uttekt.sql — sama rökfræði, orðrétt, í grunninum):
--   1. v_uttekt_an_reiknings_grunnur — allar úttektir ársins án reiknings/sölu á stað, kúnna né systurstað
--      (óbreytt regla) + skodun_dags/skodun_heimild, síðasta vinnublað, og Stólpa-reikningurinn sem nær yfir
--      skoðunina (stolpi_*) ásamt síðasta Stólpa-reikningi á kennitölunni (stolpi_sidast_*).
--   2. v_gleymt_ad_rukka_uttekt — SÖMU 8 fyrstu dálkar og áður (368 og 369 lesa þá) + nýju dálkarnir,
--      en AÐEINS línur sem enginn Stólpa-reikningur nær yfir.
--   3. v_gleymt_uttekt_stolpi — hinar: rukkaðar gegnum Stólpa (fyrri eigendur). Aldrei rukka þær aftur.
--
-- „Nær yfir": Stólpa-reikningur á kt staðar EÐA kúnna, dagsettur á árinu, og ekki fyrr en 14 dögum fyrir
--   þekkta skoðun (reikningur í febrúar nær ekki yfir skoðun í júlí). Kreditfærðir reikningar teljast ekki.
-- Sýnirnar keyra sem eigandi (postgres, engin security_invoker) eins og aðrar v_-sýnir, svo appið sér
--   Stólpa-dálkana þótt stolpi_reikningar sé læst (RLS án reglna).

create or replace view public.v_uttekt_an_reiknings_grunnur as
with ar as (
  select extract(year from now())::integer as y
), skyrslur as (
  select d.fyrirtaeki_id, count(*) as fjoldi,
         max(coalesce(d.doc_date, make_date(d.year, 1, 1))) as dags,
         max(d.doc_date) as doc_dags
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
         nullif(regexp_replace(coalesce(cb.kennitala, ''), '\D', '', 'g'), '') as kt_kunna
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
       sl.reikn_nr as stolpi_sidast_nr, sl.dags as stolpi_sidast_dags, sl.stada as stolpi_sidast_stada, sl.upphaed as stolpi_sidast_upphaed
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

comment on view public.v_uttekt_an_reiknings_grunnur is 'Úttektir ársins án reiknings/sölu (stað, kúnni, systurstaður) + skoðunarmánuður, vinnublað og Stólpa-reikningur. Grunnur fyrir v_gleymt_ad_rukka_uttekt og v_gleymt_uttekt_stolpi.';

create or replace view public.v_gleymt_ad_rukka_uttekt as
select fyrirtaeki_id, nafn, kennitala, heimilisfang, postnumer, customer_base_id, skyrslur, skyrsla_dags,
       skodun_dags, skodun_heimild, vinnublad_id, vinnublad_manudur, vinnublad_dags, vinnublad_stada,
       stolpi_sidast_nr, stolpi_sidast_dags, stolpi_sidast_stada, stolpi_sidast_upphaed
from public.v_uttekt_an_reiknings_grunnur
where stolpi_nr is null;

comment on view public.v_gleymt_ad_rukka_uttekt is 'Úttektir ársins sem enginn hefur rukkað — hvorki appið, skjal né Stólpi (fyrri eigendur). 368 „Gleymst að rukka?" og 369 gleymt-mál.';

create or replace view public.v_gleymt_uttekt_stolpi as
select fyrirtaeki_id, nafn, kennitala, heimilisfang, postnumer, customer_base_id, skodun_dags, skodun_heimild,
       stolpi_nr, stolpi_dags, stolpi_stada, stolpi_upphaed
from public.v_uttekt_an_reiknings_grunnur
where stolpi_nr is not null;

comment on view public.v_gleymt_uttekt_stolpi is 'Úttektir ársins sem voru rukkaðar gegnum Stólpa (fyrri eigendur) — teljast greiddar fyrri eigendum, aldrei rukka aftur (Agnar 11.09.2026).';

-- ── Staðfesting (lesið) ──────────────────────────────────────────────────────────────────
-- select count(*) from public.v_gleymt_ad_rukka_uttekt;   → 19 (var 39)
-- select count(*) from public.v_gleymt_uttekt_stolpi;     → 20
-- select count(*) from public.v_uttekt_an_reiknings_grunnur; → 39
--
-- ── Afturköllun ──────────────────────────────────────────────────────────────────────────
-- Keyra sql/2026-09-11_v_gleymt_ad_rukka_uttekt.sql aftur (CREATE OR REPLACE nær ekki að fjarlægja dálka:
--   fyrst drop view public.v_gleymt_ad_rukka_uttekt; svo þá skrá), og
--   drop view if exists public.v_gleymt_uttekt_stolpi; drop view if exists public.v_uttekt_an_reiknings_grunnur;
