-- 2026-06-05 — §5c chain-of-custody (applied live to Supabase osfdzskyvisifcwyjkuk)
--
-- Companion record. Re-runnable (guards). Owner-confirmed vocabulary.
-- Follows 2026-06-05_unify_taeki_base_seasonal.sql.
--
-- Custody is a SEPARATE dimension from `uttaeki.status` (which is condition:
-- active/geymsla/i_vinnslu/ok/urelt). Owner note: "lokið/fyllt/tilbúið all basically
-- say it is ready" → the middle step describes in-service, not done. Final set with
-- the owner's floor meaning:
--   móttekið    = arrived (auto-stamped on scan-in)
--   á verkstæði = received, awaiting service on the to-do shelf (not yet serviced)
--   tilbúið     = serviced & moved to the ready-for-pickup shelf
--                 (serviced→ready is one moment → THIS transition is billable 1×)
--   afhent      = handed over / put back in its building
-- 'á verkstæði' chosen for the middle (distinct from the existing condition value
-- 'i_vinnslu'); 'í vinnslu' is an accepted synonym if the owner prefers it.
-- ---------------------------------------------------------------------------------

alter table public.uttaeki
  add column if not exists custody_status text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='uttaeki_custody_status_chk') then
    alter table public.uttaeki add constraint uttaeki_custody_status_chk
      check (custody_status is null or custody_status in
        ('móttekið','á verkstæði','tilbúið','afhent'));
  end if;
end $$;
comment on column public.uttaeki.custody_status is
  'Chain-of-custody (§5c), separate from condition status. Floor meaning: móttekið = arrived (auto on scan-in) -> á verkstæði = received, awaiting service on the to-do shelf -> tilbúið = serviced & moved to the ready-for-pickup shelf (this transition = billable 1×) -> afhent = handed over / put back in its building. null = not in a drop-off/custody flow.';

-- taeki_events — scan/transition log per unit (generalizes skodunar_saga + lanstaeki_saga)
create table if not exists public.taeki_events (
  id              bigint generated always as identity primary key,
  unit_id         bigint references public.uttaeki(id),
  serial          text,
  seasonal_job_id bigint references public.seasonal_job(id),
  event           text not null,            -- 'scan' | 'custody' | 'arrival' ...
  custody_status  text,                     -- resulting custody state, when this is a transition
  tech            text,
  notes           text,
  at              timestamptz not null default now()
);
comment on table public.taeki_events is
  'Chain-of-custody / scan event log per unit (§5c). Each drop-off scan or custody transition stamps unit_id + serial + resulting custody_status + tech + at.';

create index if not exists taeki_events_unit_idx on public.taeki_events(unit_id);
create index if not exists taeki_events_job_idx  on public.taeki_events(seasonal_job_id);
create index if not exists taeki_events_at_idx   on public.taeki_events(at desc);
