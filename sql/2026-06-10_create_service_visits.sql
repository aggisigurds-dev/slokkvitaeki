-- ÞjónustuVerkstæði: one row per service "cycle/visit" for a company in
-- Fyrirtækjaþjónusta / Ferðaþjónustu. Survives across trips so a half-done
-- visit can be parked with a reason instead of being forgotten.
-- Applied to project osfdzskyvisifcwyjkuk on 2026-06-10.
create table if not exists public.service_visits (
  id              bigint generated always as identity primary key,
  customer_kt     text,
  customer_nafn   text,
  fyrirtaeki_id   bigint,
  service_type    text not null default 'fyrirtaeki',  -- fyrirtaeki | ferda | brunakerfi
  mode            text not null default 'lota',         -- lota | innkoma
  status          text not null default 'opin',         -- opin | bidur | tilbuid | lokid
  block_reason    text,                                 -- simtal | varahlutur | verkstaedi | svar | endurkoma
  next_action     text,
  remind_at       date,
  trip_count      int  not null default 1,
  units           jsonb not null default '[]'::jsonb,
  units_total     int  not null default 0,
  units_done      int  not null default 0,
  technician      text,
  dk_invoice_id   text,
  invoiced_at     timestamptz,
  report_url      text,
  started_at      timestamptz not null default now(),
  last_touched_at timestamptz not null default now(),
  completed_at    timestamptz,
  athugasemdir    text,
  created_at      timestamptz not null default now()
);
create index if not exists service_visits_status_idx on public.service_visits (status);
create index if not exists service_visits_customer_idx on public.service_visits (customer_kt);
create index if not exists service_visits_open_idx on public.service_visits (status) where status <> 'lokid';
grant all on public.service_visits to anon, authenticated, service_role;
grant usage, select on sequence public.service_visits_id_seq to anon, authenticated, service_role;
