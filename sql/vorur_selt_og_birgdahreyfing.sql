-- Selt magn hverrar vöru + sjálfvirk birgðahreyfing við sölu (05.10.2026)
--
-- Agnar: „já yrði fínt ef dregst frá, erum að fara að telja birgðirnar … geturðu séð og skráð líka hvað er búið
-- að seljast mikið af hverju síðan kerfið opnaði".
--
-- EIN regla segir hvaða vöru sölulína á við (solulina_vara) — bæði yfirlitið og hreyfingin nota hana:
--   1. POS-lína ber product_id = vorur.id (1.242 af 1.283 línum með id).
--   2. Úttektarlína ber enga id en lýsingu: „Nýtt · Léttvatn 6 kg. AB Slökkvitæki · −20% afsl." eða
--      „Vara · Eldvarnateppi 1,2m x 1,2m" — forskeyti og afsláttarhali tekin af og nafnið borið við vorur.nafn.
--   „Yfirferð · …" / „Hleðsla · …" eru þjónusta og para ekki við vöru á lager.
--
-- Aðeins status='final' telst sala. Kreditreikningar bera neikvætt magn og núllast sjálfir út.
-- Birgðir hreyfast AÐEINS fyrir sölur stofnaðar eftir BYRJUN (talningin sem Agnar er að gera) — annars hreyfði
-- ógilding gamallar sölu nýju talninguna. Vara með birgdir = null (ótalið) hreyfist ekki. Þjónusta, vinna og leiga
-- eiga engar birgðir. Triggerinn kastar ALDREI: sala má aldrei falla vegna birgða (sama regla og
-- trg_customer_documents_erfa_tegund, docs/ORYGGISNET.md).

create or replace function public.solulina_magn(l jsonb) returns numeric
language sql immutable as $$
  select case when coalesce(l->>'qty', '') ~ '^\s*-?\d+(\.\d+)?\s*$' then (l->>'qty')::numeric else 0 end
$$;

create or replace function public.solulina_vara(l jsonb) returns bigint
language sql stable as $$
  select coalesce(
    (select v.id from public.vorur v
      where coalesce(l->>'product_id', '') ~ '^\d+$' and v.id = (l->>'product_id')::bigint),
    (select v.id from public.vorur v
      where coalesce(l->>'product_id', '') = ''
        and lower(btrim(v.nafn)) = lower(btrim(
              regexp_replace(
                regexp_replace(coalesce(l->>'desc', ''), '^\s*(Nýtt|Vara)\s*·\s*', '', 'i'),
                '\s*·\s*[−-]\s*\d+([.,]\d+)?\s*%.*$', '')))
      order by v.virkt desc, v.id
      limit 1)
  )
$$;

-- Selt frá upphafi (maí 2026), síðustu 30 daga og hvenær síðast — nettó eftir kreditreikninga.
create or replace view public.v_vorur_selt with (security_invoker = on) as
select x.vara_id,
       sum(x.q)                                                        as selt,
       sum(x.q) filter (where s.created_at >= now() - interval '30 days') as selt_30d,
       max(s.created_at) filter (where x.q > 0)                         as sidast_selt
from public.solur s
cross join lateral jsonb_array_elements(coalesce(s.linur, '[]'::jsonb)) l
cross join lateral (select public.solulina_vara(l) as vara_id, public.solulina_magn(l) as q) x
where s.status = 'final' and x.vara_id is not null
group by x.vara_id;

grant select on public.v_vorur_selt to anon, authenticated;

create or replace function public.solur_birgdahreyfing() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  byrjun constant timestamptz := '2026-10-05 08:35:00+00';
  d record;
begin
  begin
    for d in
      with gamalt as (
        select public.solulina_vara(l) as v, -public.solulina_magn(l) as q
        from jsonb_array_elements(case when tg_op <> 'INSERT' and old.status = 'final' and old.created_at >= byrjun
                                       then coalesce(old.linur, '[]'::jsonb) else '[]'::jsonb end) l),
      nytt as (
        select public.solulina_vara(l) as v, public.solulina_magn(l) as q
        from jsonb_array_elements(case when tg_op <> 'DELETE' and new.status = 'final' and new.created_at >= byrjun
                                       then coalesce(new.linur, '[]'::jsonb) else '[]'::jsonb end) l)
      select v, sum(q) as dq
      from (select * from nytt union all select * from gamalt) z
      where v is not null
      group by v
      having sum(q) <> 0
    loop
      update public.vorur
         set birgdir = birgdir - round(d.dq)::int
       where id = d.v
         and birgdir is not null
         and coalesce(flokkur, '') not in ('Þjónusta', 'Vinna og akstur', 'Leiga');
    end loop;
  exception when others then
    raise warning 'solur_birgdahreyfing (sala %): %', coalesce(new.id, old.id), sqlerrm;
  end;
  return coalesce(new, old);
end
$$;

drop trigger if exists trg_solur_birgdahreyfing on public.solur;
create trigger trg_solur_birgdahreyfing
  after insert or update of status, linur or delete on public.solur
  for each row execute function public.solur_birgdahreyfing();
