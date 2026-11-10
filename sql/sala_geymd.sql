-- Geymd drög úr Sölu (10.11.2026)
--
-- Agnar: „yrði hægt að setja neðst niðri, geyma sem drög … og þá að þau séu inn í Drög flipanum sem Geymd Drög, í sér
-- flokki ofanlega". Karfan (kúnni + línur + afsláttur + Vegna-texti) er geymd HÉR, ekki sem sala í `solur`: ekkert R-númer er
-- tekið, engin greiðsluaðferð valin og ekkert berst í Bókhald, Kröfu yfirlit eða Payday fyrr en salan er kláruð í Sölu eftir
-- að drögin eru opnuð aftur (js/patches/501-geymd-drog.js). Að opna drögin í körfu merkir röðina eydda (deleted_at) —
-- „Sýna eydd" í Drög-flipanum endurheimtir hana.
--
-- Fylgir sömu reglu og aðrar töflur sem biðlarinn les beint (thjonustu_tengingar o.fl.): RLS af, grant til anon/authenticated.

create table if not exists public.sala_geymd (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  customer_nafn text,
  customer_kt   text,
  customer_id   bigint,
  samtals       numeric,
  linur_fjoldi  integer,
  yfirlit       text,
  karfa         jsonb not null
);

comment on table public.sala_geymd is 'Körfur úr Sölu sem voru geymdar sem drög (Geymd drög í Drög-flipanum). Ekki sölur — engin R-númer.';
comment on column public.sala_geymd.karfa is 'Snjómynd af POS-state: { customer, lines, discount, discount_pct, discount_gross, notes, staffNotes, beidninumer }';
comment on column public.sala_geymd.deleted_at is 'Sett þegar drögin eru opnuð í körfu eða eytt; hægt að endurheimta með „Sýna eydd".';

create index if not exists sala_geymd_virk_idx on public.sala_geymd (created_at desc) where deleted_at is null;

alter table public.sala_geymd disable row level security;
grant select, insert, update, delete on public.sala_geymd to anon, authenticated;
grant usage, select on sequence public.sala_geymd_id_seq to anon, authenticated;
