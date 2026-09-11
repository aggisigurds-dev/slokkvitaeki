-- 2026-09-11 — Gleymst að rukka? (migration v_gleymt_ad_rukka_uttekt_v1)
--
-- Staðir með úttektarskýrslu á árinu en ENGAN reikning. Notað í Kröfur-ham Þjónustuborðs 2 (368).
-- Einfalda reglan (343: skýrsla ársins vs úttektarreikningur) gaf 175 staði, flest falskt jákvætt (mælt 11.09.2026):
--   124 áttu reikningsskjal ársins á sama stað (84 frá jan.–miðjan maí), 27 pössuðu við kassasölu (pos/bud/Kassi),
--   16 áttu aðra sölu á árinu, 15 áttu rukkaðan systurstað á sömu kennitölu.
-- Þessi sýn útilokar allt þetta og skilaði 39 stöðum 11.09.2026 — sama tala og handtalningin.
-- Aðeins lesið; ekkert skrifað. Center Hótel (11 staðir): borið saman á fyrirtaeki_id, kennitala aðeins til að útiloka systurstaði.

create or replace view public.v_gleymt_ad_rukka_uttekt as
with ar as (
  select extract(year from now())::int as y
), skyrslur as (
  select d.fyrirtaeki_id, count(*) as fjoldi, max(coalesce(d.doc_date, make_date(d.year, 1, 1))) as dags
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
  where extract(year from s.created_at) = ar.y and coalesce(s.status, '') <> 'void' and not coalesce(s.is_credit, false)
), rukkad as (
  select f.id
  from public.fyrirtaeki f
  where exists (select 1 from reikn_skjal r where r.fyrirtaeki_id = f.id)
     or exists (select 1 from sala_ar s where s.customer_id = f.id or (f.customer_base_id is not null and s.customer_base_id = f.customer_base_id))
)
select f.id as fyrirtaeki_id, f.nafn, f.kennitala, f.heimilisfang, f.postnumer, f.customer_base_id,
       sk.fjoldi as skyrslur, sk.dags as skyrsla_dags
from skyrslur sk
join public.fyrirtaeki f on f.id = sk.fyrirtaeki_id and f.deleted_at is null
where f.id not in (select id from rukkad)
  and not exists (
    select 1 from public.fyrirtaeki f2
    where f2.id <> f.id and f2.deleted_at is null
      and nullif(regexp_replace(coalesce(f2.kennitala, ''), '\D', '', 'g'), '') = nullif(regexp_replace(coalesce(f.kennitala, ''), '\D', '', 'g'), '')
      and f2.id in (select id from rukkad)
  );
comment on view public.v_gleymt_ad_rukka_uttekt is 'Staðir með úttektarskýrslu á árinu en engan reikning, sölu né rukkaðan systurstað. Kröfur-hamur í 368.';
grant select on public.v_gleymt_ad_rukka_uttekt to anon, authenticated;
