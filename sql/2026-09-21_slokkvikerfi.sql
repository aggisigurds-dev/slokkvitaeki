-- Slökkvikerfis skoðun — þriðji þjónustuflokkurinn (við hlið Ársskoðunar og Brunakerfis skoðunar).
--
-- Agnar 21.09.2026: „skrá eins og í Ársskoðun, en á sér síðu". Útlitið er afritað úr 153,
-- GEYMSLAN EKKI: Ársskoðun býr í jsonb-blobbi í app_settings (arsskodun_customers) með
-- `steps_<ár>` sem lyklanöfn og fjórar heimildir fyrir „í þjónustu". Hér er ein röð per kerfi,
-- ein röð per skoðun, skrefin eru DÁLKAR og `i_thjonustu` er EINA heimildin.
--
-- Skoðun er ALLTAF einu sinni á ári → engin tíðni. Verð lá ekki fyrir → verd_an_vsk má vera
-- null („verð vantar"), aldrei gisk.
--
-- Notað af js/patches/385-slokkvikerfi.js (yfirlit) og 386-slokkvikerfi-skyrsla.js (blaðið).
-- Beitt á Supabase 21.09.2026 gegnum MCP-migration `create_slokkvikerfi`.
-- Anon-opið eins og teikning_bord (appið skrifar með anon-lykli). Engin delete-stefna:
-- kerfi fer ÚR ÞJÓNUSTU, því er aldrei eytt.

create table if not exists public.slokkvikerfi (
  id                bigint generated always as identity primary key,
  fyrirtaeki_id     bigint not null references public.fyrirtaeki(id),   -- aldrei nafn/kt sem lykill
  heiti             text   not null default 'Eldhús',                   -- hótel getur átt fleiri en eitt eldhús
  tegund            text,                                               -- t.d. „Amerex vökvakerfi"
  samn_nr           text,
  thjonustuadili    text,
  fjargaesluadili   text,
  uppsetningaradili text,
  skodunarmanudur   smallint check (skodunarmanudur between 1 and 12),
  verd_an_vsk       numeric,                                            -- null = verð vantar
  nota              text,                                               -- nótan á forsíðu flokksins
  i_thjonustu       boolean not null default true,                      -- EINA heimildin
  ur_thjonustu_at   timestamptz,
  fyrri_adili       text,                                               -- hver skoðaði áður en við tókum við
  fyrri_skodun      date,                                               -- síðasta skoðun fyrri aðila (telst EKKI okkar skýrsla)
  bunadur           jsonb  not null default '[]'::jsonb,                -- grunnlína: [{teg, stk}] per búnaðarlínu, erfist í næstu skoðun
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  updated_by        text
);
create index if not exists slokkvikerfi_fid_idx on public.slokkvikerfi (fyrirtaeki_id);

create sequence if not exists public.slokkvikerfi_skodun_nr_seq;

create table if not exists public.slokkvikerfi_skodanir (
  id             bigint generated always as identity primary key,
  kerfi_id       bigint not null references public.slokkvikerfi(id),
  fyrirtaeki_id  bigint not null references public.fyrirtaeki(id),
  ar             integer not null check (ar between 2000 and 2100),
  numer          bigint not null default nextval('public.slokkvikerfi_skodun_nr_seq'),  -- sequence, ekki count(*)+1
  dags_skodunar  date,
  dags_urbota    date,
  skodunarmadur  text,
  status         text not null default 'draft' check (status in ('draft','final')),
  data           jsonb not null default '{}'::jsonb,   -- {haus, bun[], auk[], vok[], eld[], annad} — blaðið 1:1
  kostnadur      jsonb not null default '{}'::jsonb,   -- {skodun, akstur, skyrsla, vinna, annad[]} — fer á reikning, ekki skýrslu
  skodad_at      timestamptz,                          -- skrefin fjögur sem dálkar
  skyrsla_at     timestamptz,
  send_at        timestamptz,
  reikningur_at  timestamptz,
  doc_id         bigint,                               -- customer_documents.id
  sala_id        bigint,                               -- solur.id
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),   -- vörður: update … where updated_at = það sem lesið var
  updated_by     text,
  unique (kerfi_id, ar)                                -- ein skoðun per kerfi per ár; tvær vélar geta ekki stofnað tvenn drög
);
create index if not exists slokkvikerfi_skodanir_fid_idx on public.slokkvikerfi_skodanir (fyrirtaeki_id, ar);

create or replace function public.slokkvikerfi_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists slokkvikerfi_touch on public.slokkvikerfi;
create trigger slokkvikerfi_touch before update on public.slokkvikerfi
  for each row execute function public.slokkvikerfi_touch();
drop trigger if exists slokkvikerfi_skodanir_touch on public.slokkvikerfi_skodanir;
create trigger slokkvikerfi_skodanir_touch before update on public.slokkvikerfi_skodanir
  for each row execute function public.slokkvikerfi_touch();

alter table public.slokkvikerfi          enable row level security;
alter table public.slokkvikerfi_skodanir enable row level security;

drop policy if exists "slokkvikerfi_read"   on public.slokkvikerfi;
drop policy if exists "slokkvikerfi_insert" on public.slokkvikerfi;
drop policy if exists "slokkvikerfi_update" on public.slokkvikerfi;
create policy "slokkvikerfi_read"   on public.slokkvikerfi for select using (true);
create policy "slokkvikerfi_insert" on public.slokkvikerfi for insert with check (true);
create policy "slokkvikerfi_update" on public.slokkvikerfi for update using (true) with check (true);

drop policy if exists "slokkvikerfi_skodanir_read"   on public.slokkvikerfi_skodanir;
drop policy if exists "slokkvikerfi_skodanir_insert" on public.slokkvikerfi_skodanir;
drop policy if exists "slokkvikerfi_skodanir_update" on public.slokkvikerfi_skodanir;
create policy "slokkvikerfi_skodanir_read"   on public.slokkvikerfi_skodanir for select using (true);
create policy "slokkvikerfi_skodanir_insert" on public.slokkvikerfi_skodanir for insert with check (true);
create policy "slokkvikerfi_skodanir_update" on public.slokkvikerfi_skodanir for update using (true) with check (true);

grant usage on sequence public.slokkvikerfi_skodun_nr_seq to anon, authenticated;

-- Yfirlitið: eitt kerfi per röð + skoðun ársins + síðasta OKKAR skoðun + árin sem skýrsla er til.
-- Ártalið er reiknað, aldrei bakað inn (sbr. buid_2026 í v_thjonustu_tolur sem brotnar 01.01.2027).
create or replace view public.v_slokkvikerfi_yfirlit
with (security_invoker = true) as
select
  k.id as kerfi_id, k.fyrirtaeki_id, f.nafn, f.kennitala, f.heimilisfang, f.postnumer,
  k.heiti, k.tegund, k.skodunarmanudur, k.verd_an_vsk, k.nota, k.i_thjonustu, k.ur_thjonustu_at,
  k.fyrri_adili, k.fyrri_skodun, k.updated_at,
  coalesce(f.er_i_thjonustu, false) as i_arsskodun,
  extract(year from now())::int as ar_nu,
  s.id as skodun_id, s.status as skodun_status, s.dags_skodunar,
  s.skodad_at, s.skyrsla_at, s.send_at, s.reikningur_at, s.kostnadur,
  (select max(x.dags_skodunar) from public.slokkvikerfi_skodanir x
     where x.kerfi_id = k.id and x.status = 'final') as sidast_okkar,
  (select coalesce(array_agg(x.ar order by x.ar), '{}') from public.slokkvikerfi_skodanir x
     where x.kerfi_id = k.id and x.status = 'final') as ar_med_skyrslu
from public.slokkvikerfi k
join public.fyrirtaeki f on f.id = k.fyrirtaeki_id
left join public.slokkvikerfi_skodanir s
  on s.kerfi_id = k.id and s.ar = extract(year from now())::int;

grant select on public.v_slokkvikerfi_yfirlit to anon, authenticated;

-- „Gleymst að rukka?" fyrir þennan flokk: skoðun lokið, enginn reikningur.
create or replace view public.v_gleymt_slokkvikerfi
with (security_invoker = true) as
select s.id as skodun_id, s.kerfi_id, s.fyrirtaeki_id, f.nafn, k.heiti, s.ar, s.dags_skodunar, s.skyrsla_at, s.kostnadur
from public.slokkvikerfi_skodanir s
join public.slokkvikerfi k on k.id = s.kerfi_id
join public.fyrirtaeki  f on f.id = s.fyrirtaeki_id
where s.status = 'final' and s.sala_id is null and s.reikningur_at is null;

grant select on public.v_gleymt_slokkvikerfi to anon, authenticated;

-- ── 21.09.2026 (MCP-migration `customer_documents_leyfa_slokkvikerfi`) ─────────────────────────────
-- Skoðunarskýrslan fer í customer_documents sem doc_type = 'slokkvikerfi' (ár skylt).
-- auto_pair_customer_document hunsar aðrar tegundir en reikningur/uttektarskyrsla/brunakerfi,
-- svo skýrslan getur ALDREI orðið falskt úttektarpar. Skjalaspjaldið (199) les hana ekki enn.
alter table public.customer_documents drop constraint if exists customer_documents_doc_type_check;
alter table public.customer_documents add constraint customer_documents_doc_type_check
  check (doc_type = any (array['samningur'::text, 'uttektarskyrsla'::text, 'reikningur'::text, 'brunakerfi'::text, 'slokkvikerfi'::text]));

alter table public.customer_documents drop constraint if exists customer_documents_year_shape;
alter table public.customer_documents add constraint customer_documents_year_shape
  check ((doc_type = 'samningur'::text)
      or ((doc_type = any (array['uttektarskyrsla'::text, 'reikningur'::text, 'slokkvikerfi'::text])) and (year is not null))
      or (doc_type = 'brunakerfi'::text));
