-- 23.11.2026 (Agnar: „svo þetta geti virkað og vistast allstaðar“).
-- Mælt: vél sem átti `__co__:<id>` í localStorage fékk ALDREI nýja pinnann — 173 (AppSettings-blobbinn) og 156 `syncSharedToLocal`
-- láta staðbundið gildi vinna og sækja aðeins lykla sem vantar. Þegar heimilisfang félags breytist og pinninn er færður
-- (431 „Uppfæra eftir heimilisfangi“ / 178 „Laga staðsetningu“) hélt hver önnur tölva og sími áfram að sýna gamla staðinn.
-- Lagfæringin þarf tímastimpil á breytingu: `updated_at` hækkar AÐEINS þegar lat/lng breytast (sami skrifstraumur með óbreytt
-- hnit — t.d. forhitun — veldur engum ónauðsynlegum niðurhölum). Hver vél geymir `_slokk_gc_stamp` og sækir raðir nýrri en það.
-- Bætir aðeins við dálki + kveikju; engin gögn breytast (updated_at := created_at fyrir eldri raðir).

alter table public.geocode_cache add column if not exists updated_at timestamptz;
update public.geocode_cache set updated_at = created_at where updated_at is null;
alter table public.geocode_cache alter column updated_at set default now();
alter table public.geocode_cache alter column updated_at set not null;

create or replace function public.geocode_cache_stimpill() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.updated_at := coalesce(new.updated_at, now());
  elsif new.lat is distinct from old.lat or new.lng is distinct from old.lng then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end
$$;

drop trigger if exists trg_geocode_cache_stimpill on public.geocode_cache;
create trigger trg_geocode_cache_stimpill
  before insert or update on public.geocode_cache
  for each row execute function public.geocode_cache_stimpill();

create index if not exists geocode_cache_updated_at_idx on public.geocode_cache (updated_at);
