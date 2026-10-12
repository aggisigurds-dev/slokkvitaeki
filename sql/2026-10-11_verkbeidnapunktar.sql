-- 11.10.2026 — Verkbeiðnapunktar, verkefni og vinnusvæði í Þjónustugáttinni (Eignagátt).
--
-- 1) Verkbeiðni sem PUNKTUR á teikningu hæðar (eða án teikningar), með mynd. Málið fer á Þjónustuborðið eins og
--    önnur gatt-mál (thjonustubeidni, source 'gatt'). Þegar verkið er lagað fer eftirmynd á málið, punkturinn
--    verður grænn í gáttinni og kúnninn fær tilkynningu (portal_messages + póstur).
--    Sama tafla ber líka VERKEFNI sem kúnninn á sjálfur (abyrgd 'eigandi') eða annar verktaki ('annar') — svo
--    gáttin sýni alla byggingarumsjón, ekki aðeins það sem við gerum (Agnar 11.10.2026).
--
--      punktur      {haed (vísitala í teikning_bord.haedir), nafn, x, y} — x/y í FRUMDÍLUM myndarinnar, sama
--                   hnitakerfi og merkin (markers) → teiknað með sama kvarða og í 456/gatt.
--      myndir       [{path, w, h, at}]      — myndir kúnna við skráningu (bucket gatt, einkamál)
--      eftirmyndir  [{path, w, h, at, af}]  — eftirmyndir þegar lagað
--      abyrgd       'okkar' | 'eigandi' | 'annar'
--      lokid_*      hvenær, hver og hvernig verkið var klárað; tilkynnt_at = hvenær kúnninn fékk tilkynningu
--
-- 2) portal_items — „Mitt vinnusvæði": skjöl (í bucket) og hlekkir sem kúnninn geymir á borðinu sínu, röð valin.
--
-- 3) Einkamáls-bucket `gatt`: aðeins service-lykillinn (gatt.cjs / verkbeidni-lokid.cjs) les og skrifar; gáttin fær
--    undirritaðar slóðir (10 mín). Engar RLS-reglur á storage.objects fyrir hann → anon kemst hvergi.
--    Slóðir: verkbeidnir/<base>/<fid>/<tími>-<id>.jpg · skjol/<base>/<tími>-<heiti>
--
-- Beitt á Supabase gegnum MCP-migration `verkbeidnapunktar` (bíður samþykkis Agnars 11.10.2026).

alter table public.thjonustubeidni
  add column if not exists punktur      jsonb,
  add column if not exists myndir       jsonb not null default '[]'::jsonb,
  add column if not exists eftirmyndir  jsonb not null default '[]'::jsonb,
  add column if not exists abyrgd       text  not null default 'okkar',
  add column if not exists lokid_at     timestamptz,
  add column if not exists lokid_af     text,
  add column if not exists lokid_lysing text,
  add column if not exists tilkynnt_at  timestamptz;

alter table public.thjonustubeidni drop constraint if exists thjonustubeidni_abyrgd_chk;
alter table public.thjonustubeidni add constraint thjonustubeidni_abyrgd_chk check (abyrgd in ('okkar', 'eigandi', 'annar'));

create index if not exists thjonustubeidni_punktur_idx on public.thjonustubeidni (fyrirtaeki_id) where punktur is not null;

create table if not exists public.portal_items (
  id          bigserial primary key,
  base_id     bigint not null references public.customers_base(id) on delete cascade,
  tegund      text not null check (tegund in ('skjal', 'hlekkur')),
  heiti       text not null,
  url         text,            -- hlekkur
  path        text,            -- skjal: slóð í bucket gatt (skjol/<base>/…)
  staerd      integer,
  mime        text,
  rod         integer not null default 0,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists portal_items_base_idx on public.portal_items (base_id, rod);
alter table public.portal_items enable row level security;   -- engar reglur = aðeins service-lykill

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gatt', 'gatt', false, 15728640,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv'])
on conflict (id) do nothing;

-- 4) portal_checklist — „Checklisti" kúnnans á Mitt vinnusvæði (sama hugsun og á Þjónustuborðinu): frjáls atriði með
--    stjörnu, hak og röð. Beitt 11.10.2026 kl. 23:35 (MCP-migration portal_checklist).
create table if not exists public.portal_checklist (
  id          bigserial primary key,
  base_id     bigint not null references public.customers_base(id) on delete cascade,
  texti       text not null,
  stjarna     boolean not null default false,
  lokid_at    timestamptz,
  rod         integer not null default 0,
  created_by  text,
  created_at  timestamptz not null default now()
);
create index if not exists portal_checklist_base_idx on public.portal_checklist (base_id, rod);
alter table public.portal_checklist enable row level security;

-- 5) portal_vidhald — fyrirbyggjandi viðhald + skírteini per eign (12.10.2026, beitt með MCP-migration portal_vidhald).
--    Hvert kerfi fær tíðni í mánuðum; naest = sidast + tíðni; skírteini (bucket gatt, skirteini/<base>/…) með gildir_til;
--    minning_dagar = hvenær „á eftir"-viðvörun kviknar. Birtist í dagatali og á eignasíðu; mál verða til af þessu
--    þegar við virkjum sjálfvirkar verkbeiðnir (ekki enn).
create table if not exists public.portal_vidhald (
  id             bigserial primary key,
  base_id        bigint not null references public.customers_base(id) on delete cascade,
  fyrirtaeki_id  bigint not null,
  kerfi          text,
  heiti          text not null,
  tidni_manudir  integer not null default 12,
  sidast         date,
  naest          date,
  abyrgd         text not null default 'okkar' check (abyrgd in ('okkar','eigandi','annar')),
  skirteini_path text,
  skirteini_heiti text,
  gildir_til     date,
  minning_dagar  integer not null default 30,
  athugasemd     text,
  created_by     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists portal_vidhald_base_idx on public.portal_vidhald (base_id, naest);
create index if not exists portal_vidhald_fid_idx on public.portal_vidhald (fyrirtaeki_id);
alter table public.portal_vidhald enable row level security;

-- 6) portal_users.stillingar — val kúnnans sjálfs (hvaða hlutar greiningar eignar sjást o.þ.h.), skrifað um gatt.cjs
--    action 'stillingar'. Beitt 12.10.2026 (MCP-migration portal_users_stillingar). syn (gatt-admin) er okkar val;
--    stillingar er hans.
alter table public.portal_users add column if not exists stillingar jsonb not null default '{}'::jsonb;

-- 7) portal_notendur — notendur félags með hlutverki og eignum (12.10.2026, beitt með MCP-migration portal_notendur).
--    stjornandi: allt · eldvarnarfulltrui: sínar eignir, skrifar · skodandi: les allt, skrifar ekkert · leigutaki: sínar
--    eignir, verkbeiðnir, engin skilaboð/reikningar/vinnusvæði. eignir = null → allar eignir félagsins. Innskráning
--    (gatt-login.cjs) leitar fyrst hér, svo í portal_users (félagsaðgangur = stjórnandi). Tokenið ber uid/hlutverk/eignir.
create table if not exists public.portal_notendur (
  id              uuid primary key default gen_random_uuid(),
  base_id         bigint not null references public.customers_base(id) on delete cascade,
  email           text not null,
  pass_hash       text,
  nafn            text,
  hlutverk        text not null default 'stjornandi' check (hlutverk in ('stjornandi','eldvarnarfulltrui','skodandi','leigutaki')),
  eignir          bigint[],
  active          boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until    timestamptz,
  last_login      timestamptz,
  created_at      timestamptz not null default now(),
  created_by      text
);
create unique index if not exists portal_notendur_email_key on public.portal_notendur (lower(email));
create index if not exists portal_notendur_base_idx on public.portal_notendur (base_id);
alter table public.portal_notendur enable row level security;
