-- Þjónustuver póstar (patch 309): efnisleg gögn fyrir kúnnaþjónustu-póstsíðuna.
--
-- felag_samskipti er DÝR view (lateral address-matching per customers_base) — full
-- scan fellur á statement_timeout úr anon-hlutverkinu (mælt 2026-08-19: 500
-- „canceling statement due to statement timeout"). Þessi SECURITY DEFINER-fall
-- keyrir reikninginn EINU sinni með hækkað timeout og skilar in-service kúnnum með
-- póstum þeirra hópuðum. Öll svarstöðu-/AI-/„svarað"-rök eru áfram client-hlið
-- (patch 309: computeGroup + needs_action + localStorage handled-marks).
--
-- Engin ný gagna-útsetning: felag_samskipti er nú þegar anon-læsileg — fallið hópar
-- bara sömu gögn á skilvirkari hátt. Skilar { freshest_outbound, customers:[...] }.
create or replace function public.tv_postar_list()
returns jsonb
language sql
stable
security definer
set search_path = public
set statement_timeout to '25s'
as $$
  with cur as (
    select distinct customer_base_id
    from fyrirtaeki
    where er_i_thjonustu = true and deleted_at is null and customer_base_id is not null
  ),
  hd as (
    select f.customer_base_id, max(s.handled_at) as handled_at
    from samskipti_stada s
    join fyrirtaeki f on f.id = s.fyrirtaeki_id
    where f.customer_base_id is not null
    group by f.customer_base_id
  ),
  m as (
    select fs.customer_base_id, fs.felag_nafn, fs.email_id, fs.subject, fs.snippet,
           fs.sender_name, fs.sender_email, fs.is_question, fs.fra_okkur, fs.received_at, fs.via
    from felag_samskipti fs
    join cur c on c.customer_base_id = fs.customer_base_id
  ),
  agg as (
    select m.customer_base_id,
           max(m.felag_nafn) as nafn,
           max(m.received_at) filter (where not m.fra_okkur) as last_in
    from m group by m.customer_base_id
  )
  select jsonb_build_object(
    'freshest_outbound', (select max(received_at) from m where fra_okkur),
    'customers', (
      select coalesce(jsonb_agg(row order by row->>'last_in' desc nulls last), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'base_id', a.customer_base_id,
          'nafn', a.nafn,
          'last_in', a.last_in,
          'handled_at', h.handled_at,
          'mails', (
            select coalesce(jsonb_agg(jsonb_build_object(
              'id', mm.email_id, 'subject', mm.subject, 'snippet', mm.snippet,
              'sender_name', mm.sender_name, 'sender_email', mm.sender_email,
              'is_question', mm.is_question, 'fra_okkur', mm.fra_okkur,
              'received_at', mm.received_at, 'via', mm.via
            ) order by mm.received_at desc), '[]'::jsonb)
            from m mm where mm.customer_base_id = a.customer_base_id
          )
        ) as row
        from agg a
        left join hd h on h.customer_base_id = a.customer_base_id
      ) q
    )
  );
$$;

grant execute on function public.tv_postar_list() to anon, authenticated, service_role;
