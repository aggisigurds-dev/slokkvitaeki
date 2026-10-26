-- Hunter — sölulistar Slökkvitækis (26.10.2026)
-- Aðilar sem við viljum í viðskipti: kynningarpóstar úr eldklar@ (email_digest SENT) verða sjálfkrafa að
-- aðilum, svör og skil (bounce) úr INBOX uppfæra stöðuna. Síðan: js/patches/487-hunter.js (#hunter).
-- RLS er EKKI á (eins og thjonustubeidni/verkbeidnir — appið les með anon-lykli). Engin eyðing: fjarlaegt_at.

create table if not exists public.hunter_herferdir (
  id         bigserial primary key,
  heiti      text not null,
  efni_regex text not null,           -- ~* á efnislínu SENT-pósts
  virk       boolean not null default true,
  fra        date,                    -- eldri póstar en þetta eru ekki lesnir
  created_at timestamptz not null default now()
);

create table if not exists public.hunter_adilar (
  id                   bigserial primary key,
  nafn                 text not null,
  len                  text,                      -- lén netfangsins
  netfang              text not null unique,      -- lykill (lágstafir)
  tengilidur           text,
  simi                 text,
  kennitala            text,
  herferd              text,
  stada                text not null default 'bidur'
                       check (stada in ('bidur','svar','sidar','fundur','unnid','hafnad','rangt')),
  naesta_skref         text,
  naesta_dags          date,
  abyrgd               text,
  minnispunktar        text,
  fyrirtaeki_id        bigint,                    -- þegar aðilinn verður að fyrirtæki í kerfinu
  fyrst_sent_at        timestamptz,
  sidast_fra_okkur_at  timestamptz,
  sidast_fra_theim_at  timestamptz,
  sidast_sjalfvirkt_at timestamptz,
  sidast_svar_id       bigint,                    -- email_digest.id nýjasta raunsvars
  sent_message_id      text,                      -- Message-ID nýjasta pósts frá okkur (svar í þræði)
  thread_ids           text[] not null default '{}',
  postar_fjoldi        int not null default 0,
  skiladist_ekki       boolean not null default false,
  skil_villa           text,
  skil_at              timestamptz,
  gatlisti             jsonb not null default '[]'::jsonb,   -- [{k, t, done, dags}]
  stjarna              boolean not null default false,       -- ★ eftirlæti (sía)
  uppruni              text not null default 'innsog',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  fjarlaegt_at         timestamptz
);
create index if not exists hunter_adilar_stada_idx on public.hunter_adilar (stada) where fjarlaegt_at is null;
create index if not exists hunter_adilar_threads_idx on public.hunter_adilar using gin (thread_ids);

create table if not exists public.hunter_fasteignir (
  id             bigserial primary key,
  adili_id       bigint not null references public.hunter_adilar(id),
  heimilisfang   text not null,
  landnr         text,
  taeki_aaetlad  int,
  athugasemd     text,
  created_at     timestamptz not null default now(),
  fjarlaegt_at   timestamptz
);
create index if not exists hunter_fasteignir_adili_idx on public.hunter_fasteignir (adili_id) where fjarlaegt_at is null;

grant select, insert, update on public.hunter_herferdir, public.hunter_adilar, public.hunter_fasteignir to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

insert into public.hunter_herferdir (heiti, efni_regex, fra)
select v.heiti, v.rx, v.fra::date from (values
  ('Yfirferð brunavarna', 'yfirferð brunavarn', '2026-10-01'),
  ('Slökkvitækja-leiga',  'slökkvitækja-?leiga', '2026-10-01'),
  ('Samstarf',            'fundur vegna samstarfs', '2026-10-01')
) v(heiti, rx, fra)
where not exists (select 1 from public.hunter_herferdir h where h.heiti = v.heiti);

-- Innsog: SENT → aðilar; INBOX → svör, sjálfvirk svör, skil. Keyrt á 15 mín (pg_cron) með 7 daga glugga,
-- handvirkt úr síðunni („Sækja póst") með sama glugga; fyrsta keyrsla með 60.
create or replace function public.hunter_innsog(p_days int default 7)
returns table(adgerd text, n int)
language plpgsql security definer set search_path = public as $$
declare
  v_fra    timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 7), 1));
  v_ny int := 0; v_uppf int := 0; v_svor int := 0; v_sjalfv int := 0; v_skil int := 0; v_rc int;
  e record; r record; a record;
  v_herferd text; v_tengil text; v_len text; v_id bigint; v_adr text;
begin
  -- 1. Póstar frá okkur sem bera efni herferðar → aðili per viðtakanda utanhúss
  for e in
    select d.id, d.received_at, coalesce(d.subject, '') subj, coalesce(d.to_addresses, '') til, d.thread_id, d.message_id,
           coalesce(d.body_preview, d.snippet, '') body
    from public.email_digest d
    where d.account = 'eldklar@eldklar.is' and d.folder = 'SENT' and d.received_at >= v_fra
      and exists (select 1 from public.hunter_herferdir h
                  where h.virk and coalesce(d.subject, '') ~* h.efni_regex and d.received_at >= coalesce(h.fra, date '2000-01-01'))
    order by d.received_at
  loop
    select h.heiti into v_herferd from public.hunter_herferdir h where h.virk and e.subj ~* h.efni_regex order by h.id limit 1;
    v_tengil := (regexp_match(e.body, '(?:Góðan dag(?:inn)?|Sæl(?:l|ar|ir)?|Hæ|Halló)\s+([A-ZÁÐÉÍÓÚÝÞÆÖ][^,\.\n!:]{1,60}?)\s*[,\.\n!:]'))[1];
    if v_tengil is not null and v_tengil ~* '^(allir|og|aftur)$' then v_tengil := null; end if;
    for a in select distinct m[1] as adr
             from regexp_matches(lower(e.til), '([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})', 'g') m
    loop
      v_adr := a.adr;
      v_len := split_part(v_adr, '@', 2);
      if v_len in ('eldklar.is', 'brunaholf.is') or v_adr = 'aggisigurds@gmail.com' then continue; end if;
      select x.id into v_id from public.hunter_adilar x where x.netfang = v_adr;
      if v_id is null then
        insert into public.hunter_adilar (nafn, len, netfang, tengilidur, herferd, fyrst_sent_at, sidast_fra_okkur_at,
                                          thread_ids, sent_message_id, uppruni)
        values (initcap(split_part(v_len, '.', 1)), v_len, v_adr, v_tengil, v_herferd, e.received_at, e.received_at,
                array_remove(array[e.thread_id], null), e.message_id, 'innsog');
        v_ny := v_ny + 1;
      else
        update public.hunter_adilar x set
          fyrst_sent_at       = least(coalesce(x.fyrst_sent_at, e.received_at), e.received_at),
          sent_message_id     = case when e.received_at >= coalesce(x.sidast_fra_okkur_at, e.received_at)
                                     then coalesce(e.message_id, x.sent_message_id) else x.sent_message_id end,
          sidast_fra_okkur_at = greatest(coalesce(x.sidast_fra_okkur_at, e.received_at), e.received_at),
          thread_ids          = (select coalesce(array_agg(distinct t), '{}') from unnest(x.thread_ids || array_remove(array[e.thread_id], null)) t),
          herferd             = coalesce(x.herferd, v_herferd),
          tengilidur          = coalesce(x.tengilidur, v_tengil),
          updated_at          = now()
        where x.id = v_id;
        v_uppf := v_uppf + 1;
      end if;
    end loop;
  end loop;

  -- 2. Innkominn póstur: skil, sjálfvirk svör, raunsvör
  for e in
    select d.id, d.received_at, lower(trim(coalesce(d.sender_email, ''))) sender, coalesce(d.subject, '') subj, d.thread_id,
           lower(coalesce(d.body_preview, d.snippet, '')) body
    from public.email_digest d
    where d.account = 'eldklar@eldklar.is' and d.folder <> 'SENT' and d.received_at >= v_fra
    order by d.received_at
  loop
    if e.sender ~* '^(mailer-daemon|postmaster)' or e.subj ~* '(delivery status notification|undeliverable|mail delivery (failed|subsystem)|returned mail|delivery failure)' then
      update public.hunter_adilar x set
        skiladist_ekki = true, skil_villa = left(e.body, 400), skil_at = e.received_at,
        stada = case when x.stada = 'bidur' then 'rangt' else x.stada end, updated_at = now()
      where x.fjarlaegt_at is null and position(x.netfang in e.body) > 0
        and (x.skil_at is null or x.skil_at < e.received_at)
        and e.received_at >= coalesce(x.sidast_fra_okkur_at, e.received_at) - interval '1 day';
      get diagnostics v_rc = row_count; v_skil := v_skil + v_rc;
      continue;
    end if;
    for r in
      select x.id from public.hunter_adilar x
      where x.fjarlaegt_at is null and (
            (e.thread_id is not null and e.thread_id = any (x.thread_ids))
         or x.netfang = e.sender
         or (x.len <> '' and split_part(e.sender, '@', 2) = x.len
             and exists (select 1 from public.hunter_herferdir h where h.virk and e.subj ~* h.efni_regex)))
    loop
      if e.subj ~* '(sjálfvirkt svar|automatic reply|auto-?reply|autoreply|out of office|í fríi|fjarverandi|away from|liggur niðri)' then
        update public.hunter_adilar x set
          sidast_sjalfvirkt_at = greatest(coalesce(x.sidast_sjalfvirkt_at, e.received_at), e.received_at),
          thread_ids = (select coalesce(array_agg(distinct t), '{}') from unnest(x.thread_ids || array_remove(array[e.thread_id], null)) t),
          updated_at = now()
        where x.id = r.id;
        v_sjalfv := v_sjalfv + 1;
      else
        update public.hunter_adilar x set
          sidast_svar_id      = case when e.received_at >= coalesce(x.sidast_fra_theim_at, e.received_at) then e.id else x.sidast_svar_id end,
          sidast_fra_theim_at = greatest(coalesce(x.sidast_fra_theim_at, e.received_at), e.received_at),
          stada               = case when x.stada in ('bidur', 'rangt') then 'svar' else x.stada end,
          thread_ids          = (select coalesce(array_agg(distinct t), '{}') from unnest(x.thread_ids || array_remove(array[e.thread_id], null)) t),
          updated_at          = now()
        where x.id = r.id;
        v_svor := v_svor + 1;
      end if;
    end loop;
  end loop;

  -- 3. Fjöldi pósta í samskiptum (frá fyrsta pósti okkar)
  update public.hunter_adilar x set postar_fjoldi = (
    select count(*) from public.email_digest d
    where d.account = 'eldklar@eldklar.is'
      and d.received_at >= coalesce(x.fyrst_sent_at, x.created_at) - interval '1 day'
      and ((d.thread_id is not null and d.thread_id = any (x.thread_ids))
           or lower(coalesce(d.sender_email, '')) = x.netfang
           or position(x.netfang in lower(coalesce(d.to_addresses, ''))) > 0))
  where x.fjarlaegt_at is null and (x.updated_at >= now() - interval '1 hour' or x.postar_fjoldi = 0);

  return query values ('nyir', v_ny), ('uppfaerdir', v_uppf), ('svor', v_svor), ('sjalfvirk', v_sjalfv), ('skiladist_ekki', v_skil);
end $$;

grant execute on function public.hunter_innsog(int) to anon, authenticated;

-- pg_cron: á 15 mín fresti, 7 daga gluggi
select cron.schedule('hunter-innsog', '7,22,37,52 * * * *', $$select count(*) from public.hunter_innsog(7)$$)
where not exists (select 1 from cron.job where jobname = 'hunter-innsog');
