-- Úttektarplan í Leiðsögn (js/patches/373-leidsogn-uttektarplan.js) — núgildandi skilgreining.
--
-- Agnar 12.09.2026 „Mátt gera nr 1": skipuleggja úttektir ársins í Leiðsögn — sannreyna hvað er
-- raunverulega ógert, lánstæki og aðkoma við hvern stað.
--
-- Migrations í Supabase (sama dag, í þessari röð):
--   uttektarplan_yfirlit             fyrsta útgáfa v_uttektarplan
--   uttektarplan_stolpabok_kt        Stólpa-bókin í reikn_kt — 💰-merkið sá hana ekki og 24 af 76 merkjum voru röng
--                                    (Stólpi rukkaði á árinu, en reikningurinn er ekki til sem PDF í Drive)
--   uttektarplan_taeki_ekki_framtid  tækjadagur í framtíðinni telst ekki skoðun (Kirkjulundur 12-14: 01.11.2026)
--
-- Tvennt sem lítur út fyrir að vanta en er viljandi:
--   * stolpi_reikningar er með RLS án policy. Yfirlitið er security_invoker, svo anon fengi 0 raðir úr töflunni.
--     Þess vegna kemur Stólpa-bókin gegnum security definer-fall sem skilar AÐEINS kennitölum, ekki upphæðum né
--     nöfnum. Supabase-ráðgjafinn varar við því (anon má keyra security definer); það er viljandi.
--   * Engin tímaregla (reikningur eftir síðustu skoðun). Mælt 12.09: hún hefði gert 6 af 7 merkjum röng, af því
--     uttaeki.last_insp ber dagsetningar úr gagnavinnu (01.02/01.03 innflutningur, 07.–09.09 tæki úr prófíl og
--     skýrslur eftir á), ekki raunverulegan skoðunardag.
--
-- Mælt eftir síðustu migration: 748 staðir, 3.096 lánstæki, 23 staðir sem Ársskoðun segir ógerða með sönnun um
-- úttekt á árinu, 42 staðir í áskrift skoðaðir eða teknir út án nokkurs reiknings (≈1,07 m.kr. áætluð ársvelta).

create or replace function public.uttektarplan_stolpi_kt(p_fra date)
returns table (kt10 text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct sr.kt10
  from stolpi_reikningar sr
  where sr.dags >= p_fra
    and coalesce(sr.tegund, '') <> 'kredit'
    and coalesce(sr.kt10, '') <> ''
$$;

revoke all on function public.uttektarplan_stolpi_kt(date) from public;
grant execute on function public.uttektarplan_stolpi_kt(date) to anon, authenticated, service_role;

create or replace view public.v_uttektarplan with (security_invoker = on) as
with fastar as (
  select extract(year from now())::integer as iar,
         extract(month from now())::integer as iman,
         make_date(extract(year from now())::integer, 1, 1) as arsbyrjun
), ars as materialized (
  -- Ársskoðun ræður: ein röð per samningsstað
  select e.key::bigint as fid, e.value as v
  from app_settings s
  cross join lateral jsonb_each(s.settings -> 'arsskodun_customers') e(key, value)
  where s.id = 1 and e.key ~ '^\d+$'
), bu as materialized (
  -- aðkomuskrá staðarins (363)
  select e.key::bigint as fid, e.value as v
  from app_settings s
  cross join lateral jsonb_each(coalesce(s.settings -> 'banner_upplysingar', '{}'::jsonb)) e(key, value)
  where s.id = 1 and e.key ~ '^\d+$'
), hlsum as materialized (
  -- hlaðin eða ný tæki per hleðsluhóp: 4 ár aftur fyrir úttekt í ár, 3 ár fyrir úttekt á næsta ári
  select h.fid, h.hopur,
    sum(h.magn) filter (where h.ar >= (f.iar - 4) and h.ar <= f.iar) as nyleg_i_ar,
    sum(h.magn) filter (where h.ar >= (f.iar - 3) and h.ar <= f.iar) as nyleg_naesta_ar
  from (
    select v.fyrirtaeki_id as fid, v.ar, v.magn,
      case v.tegund
        when 'lettvatn' then 'lettvatn' when 'lettvatn2' then 'lettvatn' when 'abf' then 'lettvatn'
        when 'duft6' then 'duft6_12' when 'duft9' then 'duft6_12' when 'duft12' then 'duft6_12'
        when 'duft2' then 'duft2' when 'duft1' then 'duft2'
        when 'co2_5' then 'co2_5' when 'co2_2' then 'co2_2' when 'co2_1' then 'co2_2'
        else null
      end as hopur
    from v_hledslur_stadur_ar v
  ) h, fastar f
  where h.hopur is not null
  group by h.fid, h.hopur
), sala_ev as materialized (
  -- sönnun: sala appsins með yfirferð/skýrslugerð á árinu
  select distinct on (s.customer_id) s.customer_id as fid,
    'sala ' || s.num || ' ' || to_char(s.created_at, 'DD.MM.') as txt
  from solur s
  cross join lateral jsonb_array_elements(case when jsonb_typeof(s.linur) = 'array' then s.linur else '[]'::jsonb end) e(value)
  cross join fastar
  where s.status = any (array['final', 'sott']) and not coalesce(s.is_credit, false)
    and s.created_at >= fastar.arsbyrjun and s.customer_id is not null
    and (e.value ->> 'desc') ~* 'skýrslugerð|yfirferð|yfirferd'
  order by s.customer_id, s.created_at desc
), stolpi_ev as materialized (
  -- sönnun: lesinn Stólpa-reikningur með skýrslugerð (060) eða yfirferð á árinu
  select distinct on (coalesce(cd.fyrirtaeki_id, rl.fyrirtaeki_id)) coalesce(cd.fyrirtaeki_id, rl.fyrirtaeki_id) as fid,
    'reikningur ' || rl.reikningur_nr || ' ' || to_char(rl.dags::timestamptz, 'DD.MM.') as txt
  from reikningslestur rl
  join reikningslinur l on l.reikningur_nr = rl.reikningur_nr
  left join customer_documents cd on cd.id = rl.doc_id
  cross join fastar
  where rl.ar = fastar.iar and rl.stemmir is true and not rl.kredit
    and (l.vorunumer = '060' or l.thjonusta = 'yfirferd')
    and coalesce(cd.fyrirtaeki_id, rl.fyrirtaeki_id) is not null
  order by coalesce(cd.fyrirtaeki_id, rl.fyrirtaeki_id), rl.dags desc
), skyrsla_ev as materialized (
  -- sönnun: úttektarskýrsla ársins
  select distinct on (d.fyrirtaeki_id) d.fyrirtaeki_id as fid,
    'skýrsla ' || coalesce(to_char(d.doc_date::timestamptz, 'DD.MM.'), d.year::text) as txt
  from customer_documents d
  cross join fastar
  where d.doc_type = 'uttektarskyrsla' and d.year = fastar.iar and not coalesce(d.is_duplicate, false) and d.fyrirtaeki_id is not null
  order by d.fyrirtaeki_id, d.doc_date desc nulls last
), taeki_ev as materialized (
  select u.fyrirtaeki_id as fid, max(u.last_insp) as dags
  from uttaeki u
  cross join fastar
  where u.last_insp >= fastar.arsbyrjun and u.last_insp <= current_date and u.fyrirtaeki_id is not null
  group by u.fyrirtaeki_id
), reikn_fid as materialized (
  select s.customer_id as fid
  from solur s
  cross join fastar
  where s.status = any (array['final', 'sott']) and not coalesce(s.is_credit, false)
    and s.created_at >= fastar.arsbyrjun and s.customer_id is not null
  union
  select coalesce(cd.fyrirtaeki_id, rl.fyrirtaeki_id)
  from reikningslestur rl
  left join customer_documents cd on cd.id = rl.doc_id
  cross join fastar
  where rl.ar = fastar.iar and not rl.kredit and coalesce(cd.fyrirtaeki_id, rl.fyrirtaeki_id) is not null
  union
  select d.fyrirtaeki_id
  from customer_documents d
  cross join fastar
  where d.doc_type = 'reikningur' and d.year = fastar.iar and not coalesce(d.is_duplicate, false) and d.fyrirtaeki_id is not null
), reikn_kt as materialized (
  select regexp_replace(s.customer_kt, '\D', '', 'g') as kt10
  from solur s
  cross join fastar
  where s.status = any (array['final', 'sott']) and not coalesce(s.is_credit, false)
    and s.created_at >= fastar.arsbyrjun
    and (coalesce(s.customer_kt, '') <> all (array['', '999999-9999']))
  union
  select rl.kennitala
  from reikningslestur rl
  cross join fastar
  where rl.ar = fastar.iar and not rl.kredit and rl.kennitala is not null
  union
  -- Stólpa-bókin: allir Stólpa-reikningar ársins, líka þeir sem eru ekki til sem PDF í Drive
  select k.kt10
  from fastar
  cross join lateral public.uttektarplan_stolpi_kt(fastar.arsbyrjun) k(kt10)
), grunn as (
  select a.fid, f.nafn, f.heimilisfang, f.postnumer,
    regexp_replace(coalesce(f.kennitala, ''), '\D', '', 'g') as kt10,
    coalesce(a.v ->> 'subscribed', 'true') <> 'false' as askrift,
    case when (a.v ->> 'inspect_month') ~ '^\d{1,2}$' then (a.v ->> 'inspect_month')::integer else 0 end as man,
    case when (a.v ->> 'last_year_inspected') ~ '^\d{4}$' then (a.v ->> 'last_year_inspected')::integer else 0 end as sidast,
    case when (a.v ->> 'field_inspected_year') ~ '^\d{4}$' then (a.v ->> 'field_inspected_year')::integer else 0 end as field_ar,
    case when (a.v ->> 'estimated_yearly') ~ '^\d+(\.\d+)?$' then round((a.v ->> 'estimated_yearly')::numeric)::integer else 0 end as velta,
    case when (a.v ->> 'akstur') ~ '^[0-3]$' then (a.v ->> 'akstur')::integer else 0 end as akstur,
    a.v -> 'equipment' as eq,
    fastar.iar, fastar.iman
  from ars a
  join fyrirtaeki f on f.id = a.fid and f.deleted_at is null
  cross join fastar
), g as (
  select grunn.fid, grunn.nafn, grunn.heimilisfang, grunn.postnumer, grunn.kt10, grunn.askrift, grunn.man,
    grunn.sidast, grunn.field_ar, grunn.velta, grunn.akstur, grunn.eq, grunn.iar, grunn.iman,
    case
      when grunn.sidast >= grunn.iar then 'merkt_buid'
      when grunn.field_ar >= grunn.iar then 'tekid_ut'
      when grunn.man < 1 or grunn.man > 12 then 'engin_dags'
      when grunn.man < grunn.iman then 'utrunnid'
      when grunn.man = grunn.iman then 'thessi_manudur'
      else 'framundan'
    end as stada,
    case when greatest(grunn.sidast, grunn.field_ar) >= grunn.iar then grunn.iar + 1 else grunn.iar end as naesta_ar
  from grunn
)
select g.fid, g.nafn, g.heimilisfang, g.postnumer, g.askrift, g.man, g.sidast, g.field_ar, g.velta, g.akstur,
  g.stada, g.naesta_ar,
  coalesce(st.txt, sa.txt, sk.txt) as sonnun,
  te.dags as taeki_skodud,
  rf.fid is not null or g.kt10 <> '' and rk.kt10 is not null as reikningur_a_arinu,
  hh.hledsluhaef, hh.lanstaeki,
  bu.v ->> 'adkoma' as adkoma,
  bu.v ->> 'hringja' as tengilidur,
  bu.v ->> 'adkoma_ath' as adkoma_ath
from g
left join stolpi_ev st on st.fid = g.fid
left join sala_ev sa on sa.fid = g.fid
left join skyrsla_ev sk on sk.fid = g.fid
left join taeki_ev te on te.fid = g.fid
left join (select distinct reikn_fid.fid from reikn_fid) rf on rf.fid = g.fid
left join (select distinct reikn_kt.kt10 from reikn_kt) rk on rk.kt10 = g.kt10
left join bu on bu.fid = g.fid
cross join lateral (
  -- lánstæki = hleðsluhæf tæki í Ársskoðun − tæki hlaðin eða ný innan hleðsluhringsins
  select coalesce(sum(q.n), 0::bigint)::integer as hledsluhaef,
         coalesce(sum(greatest(0::numeric, q.n::numeric - greatest(0::numeric, q.nyleg))), 0::numeric)::integer as lanstaeki
  from (
    select t.hopur,
      case when t.x ~ '^\d+$' then t.x::integer else 0 end as n,
      coalesce(case when g.naesta_ar = g.iar then hs.nyleg_i_ar else hs.nyleg_naesta_ar end, 0::numeric) as nyleg
    from (values ('lettvatn', g.eq ->> 'lettvatn'), ('duft6_12', g.eq ->> 'duft6_12'), ('duft2', g.eq ->> 'duft2'),
                 ('co2_5', g.eq ->> 'co2_5'), ('co2_2', g.eq ->> 'co2_2')) t(hopur, x)
    left join hlsum hs on hs.fid = g.fid and hs.hopur = t.hopur
  ) q
) hh;
