-- ============================================================================
-- AFSLÁTTARHÓPAR (discount tiers) — 2026-08-05
--
-- Ósk Agnars: „Vantar að geta búið til afsláttarflokka fyrir viðskiptavini …
-- 10-30% afsláttur … en öll þessi afsláttarhópar ganga framar heldur en
-- afsláttur af öllu ef slík tala er sett."
--
-- Hver hópur ber sex prósentur — eina fyrir hvern vöru-/þjónustuflokk:
--   ext_refill_pct         hleðsla slökkvitækja
--   ext_service_pct        yfirferð slökkvitækja
--   hose_service_pct       yfirferð brunaslangna
--   detector_service_pct   yfirferð og þjónusta reykskynjara
--   general_service_pct    aðrir þjónustuliðir (vinna, akstur, skýrslur …)
--   hardware_purchase_pct  ný tæki og vörur
--
-- NULL vs 0 — MIKILVÆGT:
--   NULL  = „ekkert sett" → almenni afslátturinn (fyrirtaeki.afslattur_pct)
--           gildir á þann flokk.
--   0     = „núll prósent" → ENGINN afsláttur á þann flokk, líka þótt almennur
--           afsláttur sé skráður (hópurinn gengur framar).
--   >0    = hópsafslátturinn gildir og yfirstígur almenna afsláttinn.
-- ============================================================================

create table if not exists public.discount_tiers (
  id                    bigint generated always as identity primary key,
  tier_name             text        not null,
  ext_refill_pct        numeric(5,2),
  ext_service_pct       numeric(5,2),
  hose_service_pct      numeric(5,2),
  detector_service_pct  numeric(5,2),
  general_service_pct   numeric(5,2),
  hardware_purchase_pct numeric(5,2),
  athugasemd            text,
  virkt                 boolean     not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint discount_tiers_name_uniq unique (tier_name),
  constraint discount_tiers_pct_range check (
    coalesce(ext_refill_pct,        0) between 0 and 100 and
    coalesce(ext_service_pct,       0) between 0 and 100 and
    coalesce(hose_service_pct,      0) between 0 and 100 and
    coalesce(detector_service_pct,  0) between 0 and 100 and
    coalesce(general_service_pct,   0) between 0 and 100 and
    coalesce(hardware_purchase_pct, 0) between 0 and 100
  )
);

comment on table public.discount_tiers is
  'Afsláttarhópar — prósenta per vöruflokki. Gengur framar fyrirtaeki.afslattur_pct.';

-- Tengingin á viðskiptavininn. Bæði töflurnar bera kúnna (sjá pos.js lookupKt:
-- fyrirtaeki OG vidskiptavinir geta átt sömu kennitölu) svo báðar fá dálkinn.
alter table public.fyrirtaeki
  add column if not exists discount_tier_id bigint
  references public.discount_tiers(id) on delete set null;

alter table public.vidskiptavinir
  add column if not exists discount_tier_id bigint
  references public.discount_tiers(id) on delete set null;

create index if not exists fyrirtaeki_discount_tier_idx
  on public.fyrirtaeki(discount_tier_id) where discount_tier_id is not null;
create index if not exists vidskiptavinir_discount_tier_idx
  on public.vidskiptavinir(discount_tier_id) where discount_tier_id is not null;

-- Appið talar við Supabase með anon-lyklinum (js/config.js). Nýja taflan fær
-- RLS KVEIKT með opinni anon-reglu — nákvæmlega sami aðgangur og aðrar töflur
-- hafa í dag (RLS off), en án þess að bæta enn einni RLS-lausri töflu í safnið.
alter table public.discount_tiers enable row level security;

drop policy if exists discount_tiers_anon_all on public.discount_tiers;
create policy discount_tiers_anon_all on public.discount_tiers
  for all to anon, authenticated using (true) with check (true);

-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- alter table public.fyrirtaeki     drop column if exists discount_tier_id;
-- alter table public.vidskiptavinir drop column if exists discount_tier_id;
-- drop table if exists public.discount_tiers;
