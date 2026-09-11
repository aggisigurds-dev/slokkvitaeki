-- 2026-09-11 — Saga fyrirtækis á hverju máli, uppfærð á hverjum morgni (migration fyrirtaeki_virkni_morgun_v1)
--
-- Agnar: „eins og þetta erum við búnir að fara setja upp. senda reikning og skýrslu og fá greitt" ·
-- „getur heldur ekkert ýtt á fyrirtæki til að athuga. þarna gæti kannski einhver bara farið af stað" ·
-- „öll samskiptasagan fær refresh á hverjum morgni.. síðan bara manual refresh ef maður þarf að double checka".
--
-- Dæmið: Húsfélagið Engjasel 31 (fyrirtaeki 1619, customers_base 1046). Tilboð samþykkt 23.07, sett upp,
-- úttektarskýrsla og reikningur R-000703 (65.171 kr.) 05.08, krafa 06.08, greitt 14.08 — en málið
-- „Uppsetning — Engjasel 31 (samþykkt tilboð)" (thjonustubeidni 698) stóð enn opið á Master og
-- Pósthólfið (309) sagði „Vantar svar". Ekkert á málinu sýndi að verkið var búið.
--
-- fyrirtaeki_virkni: ein röð á viðskiptavin — síðasta sala, síðasti reikningur, síðasta skýrsla.
-- Reiknað úr solur og customer_documents; ekkert annað er snert. pg_cron kl. 05:30 UTC og „↻ Uppfæra"
-- í appinu (í mesta lagi á 60 s fresti — fallið skilar -1 ef nýbúið er að reikna).
--
-- Slökkva á morgunkeyrslunni: select cron.unschedule('fyrirtaeki-virkni-morgun');

create table if not exists public.fyrirtaeki_virkni (
  customer_base_id bigint primary key,
  fyrirtaeki_id bigint,
  sidasta_sala jsonb,
  sidasti_reikningur jsonb,
  sidasta_skyrsla jsonb,
  reiknad_at timestamptz not null default now()
);
comment on table public.fyrirtaeki_virkni is 'Síðasta sala/reikningur/skýrsla á viðskiptavin. Reiknað af bh_fyrirtaeki_virkni_uppfaera() kl. 05:30 UTC og við „↻ Uppfæra" (Þjónustuborð 368, Pósthólf 309).';
create index if not exists fyrirtaeki_virkni_fid on public.fyrirtaeki_virkni (fyrirtaeki_id);
alter table public.fyrirtaeki_virkni enable row level security;
revoke all on public.fyrirtaeki_virkni from anon, authenticated;
grant select on public.fyrirtaeki_virkni to anon, authenticated;
drop policy if exists fyrirtaeki_virkni_lesa on public.fyrirtaeki_virkni;
create policy fyrirtaeki_virkni_lesa on public.fyrirtaeki_virkni for select to anon, authenticated using (true);

create or replace function public.bh_fyrirtaeki_virkni_uppfaera()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  -- Handvirka keyrslan úr appinu má ekki hamra á grunninum: í mesta lagi á 60 s fresti.
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
  ), skyrsla as (
    select distinct on (customer_base_id) customer_base_id,
      jsonb_build_object('id', id, 'doc_type', doc_type, 'dags', coalesce(doc_date, created_at::date), 'file_name', file_name,
                         'drive_file_id', drive_file_id, 'storage_path', storage_path) as j
    from public.customer_documents
    where customer_base_id is not null and doc_type in ('uttektarskyrsla', 'brunakerfi') and not coalesce(is_duplicate, false)
    order by customer_base_id, coalesce(doc_date, created_at::date) desc, id desc
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
  -- Viðskiptavinur sem á ekki lengur sölu né skýrslu (t.d. ógilt) fer út.
  delete from public.fyrirtaeki_virkni where reiknad_at < now();
  return n;
end;
$$;
revoke all on function public.bh_fyrirtaeki_virkni_uppfaera() from public;
grant execute on function public.bh_fyrirtaeki_virkni_uppfaera() to anon, authenticated;

select cron.schedule('fyrirtaeki-virkni-morgun', '30 5 * * *', 'select public.bh_fyrirtaeki_virkni_uppfaera()');
