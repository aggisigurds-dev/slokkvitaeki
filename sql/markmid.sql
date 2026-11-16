-- markmid — markmiðslisti Agnars (16.11.2026, „setja allt þetta saman í markmiðslista. Skrá hvern flokk, mælieiningu,
-- gauge eða einhvern kvarða hver staðan er akkúrat í dag, með starting línu, sem hægt er að expanda til að sjá allt nánar,
-- og klárað hvert fyrir sig, bæta við gögnum, attachments, screenshots").
--
-- Eitt markmið = ein röð. Mælanlegt markmið ber `maeling` (lykill í markmid_maela hér fyrir neðan): grunnlínan (upphaf)
-- er mæld einu sinni þegar markmiðið er stofnað og breytist aldrei; `nu` er nýjasta mæling. Óbeint mælanlegt markmið
-- (t.d. „finna villuna") mælist í skrefum: framvinda = kláruð skref / öll skref. Handvirk mæling (`handvirkt`) leyfir að
-- slá inn gildið (t.d. „gluggar prófaðir af 27").
-- RLS á og engar reglur: aðeins /api/markmid (þjónustulykill, starfsmannahlið) les og skrifar. Viðhengi í private bucket
-- `markmid`, afhent með undirrituðum slóðum.

create table if not exists public.markmid (
  id           bigserial primary key,
  flokkur      text not null,
  rod          integer not null default 0,
  titill       text not null,
  lysing       text,
  maelieining  text,
  maeling      text,
  handvirkt    boolean not null default false,
  stefna       text not null default 'nidur' check (stefna in ('nidur', 'upp')),
  upphaf       numeric,
  upphaf_at    timestamptz,
  mark         numeric,
  nu           numeric,
  nu_at        timestamptz,
  skref        jsonb not null default '[]'::jsonb,
  athugasemdir jsonb not null default '[]'::jsonb,
  vidhengi     jsonb not null default '[]'::jsonb,
  vl           text[] not null default '{}',
  stada        text not null default 'opid' check (stada in ('opid', 'i_vinnu', 'lokid')),
  lokid_at     timestamptz,
  lokid_af     text,
  breytt_af    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.markmid_maelingar (
  id         bigserial primary key,
  markmid_id bigint not null references public.markmid(id) on delete cascade,
  gildi      numeric not null,
  at         timestamptz not null default now()
);
create index if not exists markmid_maelingar_mm on public.markmid_maelingar (markmid_id, at desc);

alter table public.markmid enable row level security;
alter table public.markmid_maelingar enable row level security;
revoke all on table public.markmid, public.markmid_maelingar from anon, authenticated;
revoke all on sequence public.markmid_id_seq, public.markmid_maelingar_id_seq from anon, authenticated;

-- Mælingarnar. Hver lykill = ein tala, skilgreind hér svo sama talan birtist alls staðar. Óþekktur lykill → null.
-- SECURITY DEFINER og aðeins þjónustulykillinn má keyra (fallið /api/markmid).
create or replace function public.markmid_maela(p_lykill text) returns numeric
language plpgsql stable security definer set search_path = public as $$
declare
  v numeric;
begin
  case p_lykill
    -- félög í þjónustu með ógreidda reikninga og engan sendingarmáta í Payday
    when 'skeytamidlun_vantar' then select count(*) into v from v_skeytamidlun_vantar;
    -- reikningsdrög sem standa opin (draft/overdue) og eru eldri en 30 daga
    when 'drog_opin_30d' then
      select count(*) into v from invoice_drafts where status in ('draft', 'overdue') and created_at < now() - interval '30 days';
    -- vörur (ekki þjónusta, vinna eða leiga) án kostnaðarverðs
    when 'vorur_an_kostnadarverds' then
      select count(*) into v from vorur where coalesce(flokkur, '') not in ('Þjónusta', 'Vinna og akstur', 'Leiga') and kostnadarverd is null;
    -- lagervörur í mínus eða ótaldar
    when 'birgdir_neikv_otalid' then
      select count(*) into v from vorur
       where (virkt or flokkur = 'Brunakerfi') and coalesce(flokkur, '') not in ('Þjónusta', 'Vinna og akstur', 'Leiga')
         and (birgdir is null or birgdir < 0);
    -- lagervörur án birgja
    when 'vorur_an_birgja' then
      select count(*) into v from vorur
       where (virkt or flokkur = 'Brunakerfi') and coalesce(flokkur, '') not in ('Þjónusta', 'Vinna og akstur', 'Leiga')
         and coalesce(birgi, '') = '';
    -- mál á Þjónustuborðinu sem eru hvorki eydd, í geymslu né lokuð (sama tala og borðið sýnir)
    when 'opin_mal_bord' then
      select count(*) into v from thjonustubeidni where deleted_at is null and archived_at is null and coalesce(status, '') <> 'lokad';
    -- þar af merkt samþykki
    when 'samthykki_opin' then
      select count(*) into v from thjonustubeidni
       where deleted_at is null and archived_at is null and coalesce(status, '') <> 'lokad' and tags ? 'samthykki';
    -- opin verk í flokknum villa á Verkefnalistanum
    when 'villur_opnar' then
      select count(*) into v from verkefnalisti where category = 'villa' and status in ('beidni', 'i_vinnu');
    -- verð keppinauta sem hafa verið skráð eða staðfest síðustu 90 daga
    when 'samkeppnisverd_fersk' then
      select count(*) into v from competitor_prices where scraped_at > now() - interval '90 days';
    -- SMS sem Twilio tók við (ekki misheppnuð)
    when 'sms_send_ok' then
      select count(*) into v from sms_saga where coalesce(status, '') not in ('failed', 'undelivered', 'villa');
    -- innfluttar sendingar færðar í birgðir
    when 'innflutningur_faert' then
      select count(*) into v from innflutningur where stada = 'faert';
    -- óleystar villur síðustu 7 daga (sama tala og Villuvöktun á Kerfisheilsu, brunaholf villur.js)
    when 'villur_oleystar' then
      select count(*) into v from villur where leyst_at is null and sidast_at >= now() - interval '7 days';
    else v := null;
  end case;
  return v;
end $$;
revoke all on function public.markmid_maela(text) from public, anon, authenticated;
grant execute on function public.markmid_maela(text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values ('markmid', 'markmid', false, 10485760)
on conflict (id) do nothing;

comment on table public.markmid is 'Markmiðslisti (Markmið í Slökkvitæki-appinu). RLS án reglna: aðeins /api/markmid.';
