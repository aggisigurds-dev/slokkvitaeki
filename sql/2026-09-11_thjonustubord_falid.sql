-- 2026-09-11 — thjonustubord_falid: „Fela" á línum í listum Þjónustuborðs (patch 368)
--
-- Beiðni Agnars 11.09.2026: „Geturðu sett daufa textalínu allstaðar sem safnast, og ég geti ýtt á hide".
--
-- Hvað taflan geymir: EINA röð á falið atriði í EINUM lista.
--   • lykill   <eining>:<hluti>:<auðkenni>[:<fingrafar>], t.d.
--                gleymt:uttekt:fyr:1175:2026 · gleymt:kort:solur:812 · krofur:yfir:solur:640
--                frestir:mal:456:2026-09-12 (fresturinn er fingrafar — nýr frestur → atriðið birtist aftur)
--   • falid    true = falið úr listanum á ÖLLUM vélum (SAMSTILLT-reglan). „Sýna aftur" setur false —
--              röðin lifir svo sagan haldist; ekkert er nokkurn tíma eytt.
--   • lysing   hvað var falið (nafn / númer) — birt í „Sýna falin" án þess að sækja gögnin aftur.
--   • saga     [{kl, falid, af}] skrifað af gikknum — viðmótið getur ekki endurskrifað hana.
-- Að fela breytir ENGU öðru: salan, málið, skýrslan og krafan eru óhreyfð. Þetta er vinnulisti, ekki staða gagna.
--
-- Aðgangur: sama mynstur og krofu_verkferli — RLS KVEIKT, opnar reglur fyrir anon/authenticated (appið notar
--   opinbera lykilinn), ENGIN delete-regla og hvorki DELETE né TRUNCATE leyft.

-- ── 1. Taflan ────────────────────────────────────────────────────────────────────────────
create table if not exists public.thjonustubord_falid (
  lykill      text primary key check (lykill ~ '^[a-z_]+:[a-z_]+:[^[:space:]]+$'),
  eining      text not null,
  falid       boolean not null default true,
  lysing      text,
  falid_af    text,
  saga        jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists thjonustubord_falid_falid_idx on public.thjonustubord_falid (eining) where falid;

comment on table public.thjonustubord_falid is 'Falin atriði í listum Þjónustuborðs (368): eitt atriði í einum lista á röð. Breytir engu öðru en listanum.';
comment on column public.thjonustubord_falid.lykill is '<eining>:<hluti>:<auðkenni>[:<fingrafar>], t.d. gleymt:uttekt:fyr:1175:2026';
comment on column public.thjonustubord_falid.saga is 'Breytingar [{kl, falid, af}] — skrifað af gikknum thjonustubord_falid_stimpill, aldrei af viðmótinu';

-- ── 2. Gikkur: updated_at + saga (viðbót, aldrei endurskrifuð) ───────────────────────────
create or replace function public.thjonustubord_falid_stimpill()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  if tg_op = 'INSERT' then
    new.saga := pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'kl', pg_catalog.now(), 'falid', new.falid, 'af', new.falid_af));
  else
    new.created_at := old.created_at;
    new.saga := coalesce(old.saga, '[]'::jsonb);
    if new.falid is distinct from old.falid then
      new.saga := new.saga || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'kl', pg_catalog.now(), 'falid', new.falid, 'af', new.falid_af));
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists thjonustubord_falid_stimpill on public.thjonustubord_falid;
create trigger thjonustubord_falid_stimpill
  before insert or update on public.thjonustubord_falid
  for each row execute function public.thjonustubord_falid_stimpill();

-- ── 3. Aðgangur ──────────────────────────────────────────────────────────────────────────
alter table public.thjonustubord_falid enable row level security;
revoke all on public.thjonustubord_falid from anon, authenticated;
grant select, insert, update on public.thjonustubord_falid to anon, authenticated;

drop policy if exists thjonustubord_falid_lesa on public.thjonustubord_falid;
create policy thjonustubord_falid_lesa on public.thjonustubord_falid for select to anon, authenticated using (true);
drop policy if exists thjonustubord_falid_stofna on public.thjonustubord_falid;
create policy thjonustubord_falid_stofna on public.thjonustubord_falid for insert to anon, authenticated with check (true);
drop policy if exists thjonustubord_falid_uppfaera on public.thjonustubord_falid;
create policy thjonustubord_falid_uppfaera on public.thjonustubord_falid for update to anon, authenticated using (true) with check (true);
-- Viljandi engin delete-regla.

-- ── 4. Staðfesting eftir beitingu (lesið) ────────────────────────────────────────────────
-- select relrowsecurity from pg_class where oid = 'public.thjonustubord_falid'::regclass;                   → true
-- select string_agg(privilege_type, ',' order by privilege_type) from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'thjonustubord_falid' and grantee = 'anon';            → INSERT,SELECT,UPDATE

-- ── Afturköllun (aðeins ef hætta á við) ──────────────────────────────────────────────────
-- drop table if exists public.thjonustubord_falid;
-- drop function if exists public.thjonustubord_falid_stimpill();
