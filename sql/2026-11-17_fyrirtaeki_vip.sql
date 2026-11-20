-- 17.11.2026 (lota 8, VIP-vaktlisti): fyrirtæki sem Agnar vill svara innan klukkustundar.
-- Keyrt í Supabase 17.11.2026 sem migration `fyrirtaeki_vip`. Merkingin sjálf (hvaða raðir) er gögn, ekki hér.
alter table public.fyrirtaeki add column if not exists vip boolean not null default false;
alter table public.fyrirtaeki add column if not exists vip_svartimi_min integer not null default 60;
alter table public.fyrirtaeki add column if not exists vip_merkt_af text;
alter table public.fyrirtaeki add column if not exists vip_merkt_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'fyrirtaeki_vip_svartimi_chk') then
    alter table public.fyrirtaeki add constraint fyrirtaeki_vip_svartimi_chk check (vip_svartimi_min between 5 and 1440);
  end if;
end $$;
create index if not exists fyrirtaeki_vip_idx on public.fyrirtaeki (id) where vip;
