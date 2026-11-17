-- Lota 9 (17.11.2026): minni á höfnun rafræns reiknings (XML) per kennitölu.
-- Keyrt á Supabase 17.11.2026 (migration payday_rafraent_hafnad_minni).
--
-- payday-push.cjs þvingaði createElectronicInvoice=true á hverja sendingu og mundi ekki höfnun. Kúnni sem
-- Payday segir „does not accept electronic invoices" um fékk því nýja höfnun + nýtt borðmál í hvert sinn
-- (Óðins regla #10). Nú: kt hér (virkt=true) → XML-tilrauninni er sleppt og reikningurinn fer eins og
-- varaleiðin hefði sent hann (krafa í banka + póstur ef netfang er til). force_electronic:true reynir samt.
-- Afturkræft: virkt=false slekkur á minninu fyrir kt. Taflan er lokuð vafranum (RLS, engar reglur).

create table if not exists public.payday_rafraent_hafnad (
  kt text primary key check (kt ~ '^\d{10}$'),
  fyrst_hafnad_at timestamptz not null default now(),
  sidast_hafnad_at timestamptz not null default now(),
  fjoldi integer not null default 1,
  sidasta_sala_id bigint,
  sidasta_villa text,
  heimild text not null default 'payday-push',
  virkt boolean not null default true,
  uppfaert_at timestamptz not null default now()
);
alter table public.payday_rafraent_hafnad enable row level security;
revoke all on public.payday_rafraent_hafnad from anon, authenticated;

create or replace function public.payday_muna_rafraent_hafnad(p_kt text, p_sala_id bigint, p_villa text)
returns void language sql security invoker set search_path = public as $$
  insert into public.payday_rafraent_hafnad as h (kt, sidasta_sala_id, sidasta_villa)
  values (p_kt, p_sala_id, left(p_villa, 500))
  on conflict (kt) do update set
    sidast_hafnad_at = now(), fjoldi = h.fjoldi + 1, sidasta_sala_id = excluded.sidasta_sala_id,
    sidasta_villa = excluded.sidasta_villa, virkt = true, uppfaert_at = now();
$$;
revoke all on function public.payday_muna_rafraent_hafnad(text, bigint, text) from public, anon, authenticated;
grant execute on function public.payday_muna_rafraent_hafnad(text, bigint, text) to service_role;

-- Saga: höfnunirnar sem payday-push skráði í app_problems frá 14.09.2026 (aðeins „does not accept").
insert into public.payday_rafraent_hafnad (kt, fyrst_hafnad_at, sidast_hafnad_at, fjoldi, sidasta_sala_id, sidasta_villa, heimild)
select kt, min(ts), max(ts), count(*), (array_agg(sala_id order by ts desc))[1],
       'Customer does not accept electronic invoices (úr app_problems)', 'app_problems-saga'
from (
  select regexp_replace(s.customer_kt, '\D', '', 'g') kt, ap.ts, s.id sala_id
  from public.app_problems ap
  join public.solur s on s.id::text = split_part(ap.fingerprint, '|', 2)
  where ap.kind = 'payday_xml_hafnad' and ap.detail ilike '%does not accept%'
) z
where kt ~ '^\d{10}$' and kt <> '9999999999'
group by kt
on conflict (kt) do nothing;
