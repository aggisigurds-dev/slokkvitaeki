-- 2026-09-11 — fyrirtaeki_virkni v2 (migration fyrirtaeki_virkni_skyrsludagsetning_v2)
--
-- customer_documents.created_at er INNLESTRARTÍMI, ekki dagsetning skýrslu: aðeins 137 af 1.402 skýrslum eiga doc_date,
-- og 1.069 eiga eldra `year` en innlestrarárið (mælt 11.09.2026). v1 féll aftur á created_at og gat því sagt
-- „skýrsla eftir að málið varð til" um gamla skýrslu sem var lesin inn nýlega. „Líklega búin" á Master fór úr 16 í 13.
-- Nú: doc_date, annars 1. janúar skýrsluársins, annars er skýrslan ekki talin. `dags_nakvaem` segir hvort dagsetningin er raunveruleg.

create or replace function public.bh_fyrirtaeki_virkni_uppfaera()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if exists (select 1 from public.fyrirtaeki_virkni where reiknad_at > now() - interval '60 seconds') then
    return -1;
  end if;
  with sala as (
    select distinct on (customer_base_id) customer_base_id,
      jsonb_build_object('id', id, 'num', num, 'dags', created_at, 'invoiced_at', invoiced_at, 'samtals', samtals,
                         'greitt_med', greitt_med, 'paid_at', paid_at, 'krafa_sent_at', krafa_sent_at) as j
    from public.solur
    where customer_base_id is not null and status = 'final'
      and not coalesce(is_credit, false) and not coalesce(hidden, false)
    order by customer_base_id, created_at desc, id desc
  ), reikn as (
    select distinct on (customer_base_id) customer_base_id,
      jsonb_build_object('id', id, 'num', num, 'dags', created_at, 'invoiced_at', invoiced_at, 'samtals', samtals,
                         'greitt_med', greitt_med, 'paid_at', paid_at, 'krafa_sent_at', krafa_sent_at) as j
    from public.solur
    where customer_base_id is not null and status = 'final' and greitt_med in ('reikningur', 'greitt_sidar')
      and not coalesce(is_credit, false) and not coalesce(hidden, false)
    order by customer_base_id, created_at desc, id desc
  ), skjol as (
    select d.*, coalesce(d.doc_date, case when d.year between 2000 and 2100 then make_date(d.year, 1, 1) end) as raun_dags
    from public.customer_documents d
    where d.customer_base_id is not null and d.doc_type in ('uttektarskyrsla', 'brunakerfi') and not coalesce(d.is_duplicate, false)
  ), skyrsla as (
    select distinct on (customer_base_id) customer_base_id,
      jsonb_build_object('id', id, 'doc_type', doc_type, 'dags', raun_dags, 'dags_nakvaem', doc_date is not null, 'year', year,
                         'file_name', file_name, 'drive_file_id', drive_file_id, 'storage_path', storage_path) as j
    from skjol
    where raun_dags is not null
    order by customer_base_id, raun_dags desc, id desc
  ), ids as (
    select customer_base_id from sala
    union
    select customer_base_id from skyrsla
  )
  insert into public.fyrirtaeki_virkni (customer_base_id, fyrirtaeki_id, sidasta_sala, sidasti_reikningur, sidasta_skyrsla, reiknad_at)
  select ids.customer_base_id,
         (select f.id from public.fyrirtaeki f where f.customer_base_id = ids.customer_base_id and f.deleted_at is null order by f.id limit 1),
         sala.j, reikn.j, skyrsla.j, now()
  from ids
  left join sala using (customer_base_id)
  left join reikn using (customer_base_id)
  left join skyrsla using (customer_base_id)
  on conflict (customer_base_id) do update
    set fyrirtaeki_id = excluded.fyrirtaeki_id,
        sidasta_sala = excluded.sidasta_sala,
        sidasti_reikningur = excluded.sidasti_reikningur,
        sidasta_skyrsla = excluded.sidasta_skyrsla,
        reiknad_at = excluded.reiknad_at;
  get diagnostics n = row_count;
  delete from public.fyrirtaeki_virkni where reiknad_at < now();
  return n;
end;
$$;
revoke all on function public.bh_fyrirtaeki_virkni_uppfaera() from public;
grant execute on function public.bh_fyrirtaeki_virkni_uppfaera() to anon, authenticated;
