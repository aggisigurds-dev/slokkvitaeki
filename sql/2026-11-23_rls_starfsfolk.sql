-- 2026-11-23 — Læsa töflum sem eru enn án RLS.
--
-- EKKI KEYRA ÞETTA FYRR EN skrefin í SECURITY-NEXT-STEPS á PR-inu eru búin:
--   1. Slökkva á opinni nýskráningu í Supabase Auth.
--   2. SUPABASE_JWT_SECRET í Netlify = JWT Secret verkefnisins.
--   3. Kóðinn sem gefur innskráðum starfsmanni tákn er kominn í loftið.
--
-- Hvað þetta gerir, og hvað það gerir ekki:
--   • Kveikir á RLS á hverri public-töflu sem er enn án þess.
--   • Afritstöflur (backup*, *_backup*, cowork*backup*) og aðgangstafllarnar
--     hub_adgangar / hub_adgangar_stilling fá ENGAR reglur. anon og authenticated
--     sjá engar raðir. service_role kemst áfram (BYPASSRLS) og föllin nota hann.
--   • Aðrar töflur fá eina reglu, starfsfolk_all, fyrir hlutverkið authenticated.
--     Hún hleypir aðeins inn JWT sem ber rola = Admin, Starfsmaður eða Afgreiðsla.
--     Þetta er eitt innra starfsmannakerfi, ekki skipting eftir félagi: starfsmaður
--     sér sömu rekstrargögn og áður. Tilviljanakennd Supabase-aðgangur án þess
--     claims kemst ekki inn.
--   • anon missir GRANT á þessum töflum. Töflur sem þegar höfðu RLS eru ósnertar
--     (gáttin og aðrar viljandi reglur standa).
--   • Sýn sem les þessar töflur: anon missir SELECT. authenticated heldur SELECT.
--     security_invoker er ekki breytt, svo sýn sem á að lesa fram hjá eldri RLS
--     heldur því fyrir starfsmann.
--
-- Afturköllun: drop policy starfsfolk_all on public.<tafla>;
--   alter table public.<tafla> disable row level security;
--   grant select, insert, update, delete on public.<tafla> to anon;

begin;

update public.hub_adgangar_stilling
   set krefjast_slokk = true
 where id = 1;

do $$
declare
  r record;
  afrit boolean;
  leynileg boolean;
  las text[] := '{}';
  staff text := 'coalesce(auth.jwt() ->> ''rola'', '''') in (''Admin'', ''Starfsmaður'', ''Afgreiðsla'')';
begin
  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and not c.relrowsecurity
     order by c.relname
  loop
    execute format('alter table public.%I enable row level security', r.relname);
    execute format('revoke all on table public.%I from anon, public', r.relname);
    las := las || r.relname;
    afrit := r.relname like 'backup%'
          or r.relname like '%\_backup%' escape '\'
          or r.relname like 'cowork%backup%';
    leynileg := r.relname in ('hub_adgangar', 'hub_adgangar_stilling');
    if afrit or leynileg then
      continue;
    end if;
    execute format('grant select, insert, update, delete on table public.%I to authenticated', r.relname);
    if not exists (
      select 1 from pg_policies
       where schemaname = 'public' and tablename = r.relname and policyname = 'starfsfolk_all'
    ) then
      execute format(
        'create policy starfsfolk_all on public.%I for all to authenticated using (%s) with check (%s)',
        r.relname, staff, staff
      );
    end if;
  end loop;

  -- Sýn sem lesa töflu sem þessi keyrsla læsti: anon kemst ekki lengur í gegnum sýnina.
  for r in
    select distinct v.view_name
      from information_schema.view_table_usage v
     where v.view_schema = 'public'
       and v.table_schema = 'public'
       and v.table_name = any(las)
  loop
    execute format('revoke all on table public.%I from anon, public', r.view_name);
    execute format('grant select on table public.%I to authenticated', r.view_name);
  end loop;
end $$;

commit;
