-- Þjónustuborð: sönnun, næsta skref og tengill á hverju opnu máli (01.10.2026).
--
-- Agnar: „setja inn uppfærslutakka til að endurmeta stöðuna eða tengt þjónustubeiðnirnar við atriðin,
-- einhvernskonar trigger, hokk … að atriðin senda mig áfram á þann stað sem ég get klárað málið".
--
-- thjonustubeidni.sonnun = { buid, styrkur, texti, naesta, dags, tengill:{teg,id,num,url} }
--   buid=true  → gögnin sýna að málið er afgreitt (greitt / ógilt / sent í pósti / vinnublað klárað / svarað)
--   liklega    → sala hjá sama kúnna EFTIR að málið varð til — staðfesting Agnars þarf
--   tengill    → hvert „Opna ›" fer: sala (söluritillinn), sara (Vinnublöð), post (málið + Svara), payday, fyrirtaeki
--
-- Krókarnir (solur, sara_yfirferd, email_digest, thjonustubeidni) setja aðeins málsnúmer í biðröð — eitt INSERT
-- í varinni blokk, svo þeir geta aldrei stöðvað né tafið vistun sölu eða pósts. pg_cron vinnur biðröðina á
-- mínútu fresti og fer yfir öll opin mál á klukkutíma fresti. Takkinn „↻ Endurmeta" kallar beint á fallið.

alter table public.thjonustubeidni add column if not exists sonnun jsonb, add column if not exists sonnun_at timestamptz;

create table if not exists public.thjb_endurmat_bidrod (id bigint primary key, sett_at timestamptz not null default now());
alter table public.thjb_endurmat_bidrod enable row level security;   -- engar reglur: aðeins föllin (security definer) snerta hana

create or replace function public.thjb_sonnun_reikna(t public.thjonustubeidni) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  tgs text;
  sid bigint; snum text; heiti text; upph numeric; url text; netf text; base bigint;
  s record; e record; sv record; y record;
  fann boolean := false; fannp boolean := false; rukkun boolean;
  lin jsonb;
  tz constant text := 'Atlantic/Reykjavik';
begin
  select coalesce(string_agg(x, ' '), '') into tgs from jsonb_array_elements_text(coalesce(t.tags, '[]'::jsonb)) x;
  -- Greiðsla afgreiðir aðeins RUKKUNARmál. Á spurningu um sölu („kortið rukkað tvisvar", „greidd á röngum stað")
  -- er staða sölunnar upplýsing, ekki sönnun (mælt 01.10: 6 slík mál hefðu annars talist búin).
  rukkun := tgs ~ '(payday-xml|payday:\d|(^| )rukkun( |$)|eftir_ad_rukka|postur-beidni)';
  base := coalesce(t.customer_base_id, (select f.customer_base_id from fyrirtaeki f where f.id = t.fyrirtaeki_id));

  -- 1) Sala: payday-xml-sala:<id> · sala:<R-num> · R-nnnnnn í titli · payday:<n> með „nafn · upphæð" í titli
  sid := (regexp_match(tgs, 'payday-xml-sala:(\d+)'))[1]::bigint;
  if sid is null then snum := (regexp_match(tgs, '(?:^| )sala:(R-\d+)'))[1]; end if;
  if sid is null and snum is null then snum := (regexp_match(coalesce(t.title, ''), '(R-\d{6})'))[1]; end if;
  if sid is not null or snum is not null then
    select id, num, status, paid_at, krafa_sent_at into s from solur
     where case when sid is not null then id = sid else num = snum end
     order by id desc limit 1;
    fann := found;
  elsif tgs ~ '(^| )payday:\d+' then
    url := (regexp_match(coalesce(t.notes, ''), '(https://app\.payday\.is/\S+)'))[1];
    heiti := btrim(regexp_replace(split_part(t.title, ' · ', 2), '\s*\(.*\)\s*$', ''));
    upph := nullif(regexp_replace(split_part(split_part(t.title, ' · ', 3), ' kr', 1), '[^0-9]', '', 'g'), '')::numeric;
    if heiti <> '' and upph is not null then
      select id, num, status, paid_at, krafa_sent_at into s from solur
       where samtals = upph and customer_nafn ilike '%' || split_part(heiti, ',', 1) || '%'
         and status <> 'void' and coalesce(is_credit, false) = false
       order by id desc limit 1;
      fann := found;
    end if;
  elsif rukkun and base is not null and coalesce(t.title, '') ~ '\d{1,3}(\.\d{3})+ kr' then
    -- „Árskógar 6-8, húsfélag — 521.995 kr: …" — upphæð í titli + sami kúnni
    upph := replace((regexp_match(t.title, '(\d{1,3}(?:\.\d{3})+) kr'))[1], '.', '')::numeric;
    select id, num, status, paid_at, krafa_sent_at into s from solur
     where customer_base_id = base and samtals = upph and coalesce(is_credit, false) = false
     order by id desc limit 1;
    fann := found;
  end if;

  if fann and not rukkun then
    return jsonb_build_object('buid', false, 'upplysing', true,
      'texti', s.num || case when s.status = 'void' then ' ógilt'
                             when s.paid_at is not null then ' greiddur ' || to_char(s.paid_at at time zone tz, 'DD.MM.')
                             when s.status = 'drog' then ' í drögum'
                             when s.krafa_sent_at is not null then ' · krafa send ' || to_char(s.krafa_sent_at at time zone tz, 'DD.MM.') || ' · ógreitt'
                             else ' · ógreitt' end,
      'tengill', jsonb_build_object('teg', 'sala', 'id', s.id, 'num', s.num));
  end if;

  if fann then
    lin := jsonb_build_object('teg', 'sala', 'id', s.id, 'num', s.num);
    if s.status = 'void' then
      return jsonb_build_object('buid', true, 'styrkur', 'stadfest', 'texti', s.num || ' var ógilt', 'naesta', 'Salan var ógilt — hægt að loka', 'tengill', lin);
    end if;
    if s.paid_at is not null then
      return jsonb_build_object('buid', true, 'styrkur', 'stadfest', 'texti', s.num || ' greiddur ' || to_char(s.paid_at at time zone tz, 'DD.MM.'),
        'naesta', 'Greitt — hægt að loka', 'dags', s.paid_at, 'tengill', lin);
    end if;
    -- Reikningurinn sendur í pósti (viðhengi ber númerið) eftir að málið varð til
    select received_at, to_addresses into sv from email_digest
     where folder = 'SENT' and has_attachment and received_at > t.created_at - interval '3 days'
       and attachment_names::text ilike '%' || s.num || '%' and coalesce(to_addresses::text, '') not ilike '%aggisigurds%'
     order by received_at limit 1;
    fannp := found;
    if fannp then
      return jsonb_build_object('buid', true, 'styrkur', 'stadfest', 'texti', s.num || ' sendur í pósti ' || to_char(sv.received_at at time zone tz, 'DD.MM.'),
        'naesta', 'Reikningurinn er farinn — hægt að loka', 'dags', sv.received_at, 'tengill', lin);
    end if;
    if s.status = 'drog' then
      return jsonb_build_object('buid', false, 'texti', s.num || ' er í drögum', 'naesta', 'Klára söluna eða ógilda hana', 'tengill', lin);
    end if;
    if s.krafa_sent_at is not null then
      return jsonb_build_object('buid', false, 'texti', s.num || ' · krafa send ' || to_char(s.krafa_sent_at at time zone tz, 'DD.MM.') || ' · ógreitt',
        'naesta', case when tgs like '%payday-xml%' then 'XML komst ekki til skila — sendu reikninginn í pósti' else 'Bíður greiðslu' end, 'tengill', lin);
    end if;
    return jsonb_build_object('buid', false, 'texti', s.num || ' · engin krafa send', 'naesta', 'Senda kröfu', 'tengill', lin);
  end if;

  -- 2) Vinnublað (sara:<id>) — „Opna ›" fer í Vinnublöð með málið valið
  sid := (regexp_match(tgs, '(?:^| )sara:(\d+)'))[1]::bigint;
  if sid is not null then
    select id, stada, updated_at into y from sara_yfirferd where id = sid;
    if found then
      lin := jsonb_build_object('teg', 'sara', 'id', t.id, 'sara', sid);
      if y.stada = 'klarad' then
        return jsonb_build_object('buid', true, 'styrkur', 'stadfest', 'texti', 'Vinnublaðið klárað ' || to_char(y.updated_at at time zone tz, 'DD.MM.'),
          'naesta', 'Hægt að loka', 'dags', y.updated_at, 'tengill', lin);
      end if;
      return jsonb_build_object('buid', false, 'texti', 'Vinnublaðið bíður staðfestingar', 'naesta', 'Lesa blaðið og staðfesta', 'tengill', lin);
    end if;
  end if;

  -- 3) Póstur (channel_ref email:<id>) — svar til sendandans eftir að pósturinn kom
  if t.channel_ref ~ '^email:\d+$' then
    select id, sender_email, received_at into e from email_digest where id = substring(t.channel_ref from 7)::bigint;
    if found and coalesce(e.sender_email, '') <> '' then
      lin := jsonb_build_object('teg', 'post', 'id', t.id, 'post', e.id);
      select received_at, has_attachment into sv from email_digest
       where folder = 'SENT' and received_at > e.received_at
         and to_addresses::text ilike '%' || e.sender_email || '%' and to_addresses::text not ilike '%aggisigurds%'
       order by received_at desc limit 1;
      if found then
        return jsonb_build_object('buid', true, 'styrkur', 'svarad',
          'texti', 'Svarað ' || to_char(sv.received_at at time zone tz, 'DD.MM.') || case when sv.has_attachment then ' með viðhengi' else '' end,
          'naesta', 'Svar er farið — lokaðu ef málið er leyst', 'dags', sv.received_at, 'tengill', lin);
      end if;
      return jsonb_build_object('buid', false, 'texti', 'Bíður svars síðan ' || to_char(e.received_at at time zone tz, 'DD.MM.'),
        'naesta', 'Svara í sama þræði', 'dags', e.received_at, 'tengill', lin);
    end if;
  end if;

  -- 4) Rukkunarmál sem nefnir netfang: sent með viðhengi á það netfang eftir að málið varð til (Árskógar 6-8)
  if tgs ~ '(^| )(rukkun|postur-beidni)( |$)' then
    -- fyrsta netfang KÚNNANS — athugasemdin nefnir líka okkar eigin hólf (bokhald@eldklar.is)
    select lower(m[1]) into netf from regexp_matches(coalesce(t.notes, '') || ' ' || coalesce(t.title, ''), '([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})', 'g') m
     where lower(m[1]) !~ '(eldklar|brunaholf|aggisigurds)' limit 1;
    if netf is not null then
      select received_at into sv from email_digest
       where folder = 'SENT' and has_attachment and received_at > t.created_at - interval '3 days'
         and to_addresses::text ilike '%' || netf || '%'
       order by received_at limit 1;
      if found then
        return jsonb_build_object('buid', true, 'styrkur', 'stadfest', 'texti', 'Sent á ' || netf || ' ' || to_char(sv.received_at at time zone tz, 'DD.MM.') || ' með viðhengi',
          'naesta', 'Sent — hægt að loka', 'dags', sv.received_at,
          'tengill', case when t.fyrirtaeki_id is not null then jsonb_build_object('teg', 'fyrirtaeki', 'id', t.fyrirtaeki_id) end);
      end if;
    end if;
  end if;

  -- 5) Sala hjá sama kúnna EFTIR að málið varð til → líklega afgreitt (Agnar staðfestir)
  if base is not null then
    select id, num, paid_at, created_at into s from solur
     where customer_base_id = base and created_at > t.created_at and status <> 'void' and coalesce(is_credit, false) = false
     order by created_at desc limit 1;
    if found then
      return jsonb_build_object('buid', false, 'liklega', true,
        'texti', 'Líklega afgreitt: ' || s.num || ' gerð ' || to_char(s.created_at at time zone tz, 'DD.MM.') ||
                 case when s.paid_at is not null then ' · greidd ' || to_char(s.paid_at at time zone tz, 'DD.MM.') else '' end,
        'naesta', 'Staðfestu að salan afgreiði málið og lokaðu því', 'tengill', jsonb_build_object('teg', 'sala', 'id', s.id, 'num', s.num));
    end if;
  end if;

  if url is not null then
    return jsonb_build_object('buid', false, 'texti', null, 'naesta', 'Opnaðu reikninginn í Payday', 'tengill', jsonb_build_object('teg', 'payday', 'url', url));
  end if;
  if t.fyrirtaeki_id is not null then
    return jsonb_build_object('buid', false, 'tengill', jsonb_build_object('teg', 'fyrirtaeki', 'id', t.fyrirtaeki_id));
  end if;
  return null;
end $$;

-- Metur opin mál (öll, eða þau sem eru talin upp). Skrifar aðeins þar sem niðurstaðan breyttist.
-- Svarað póstmál fær líka svarad_at (borðið sýnir annars „Bíður svars" á svöruðu máli).
create or replace function public.thjonustubeidni_endurmeta(p_ids bigint[] default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t public.thjonustubeidni; nyr jsonb; metin int := 0; breytt int := 0; buid int := 0;
begin
  for t in select * from thjonustubeidni
            where deleted_at is null and archived_at is null and status is distinct from 'lokad'
              and (p_ids is null or id = any(p_ids)) loop
    metin := metin + 1;
    nyr := thjb_sonnun_reikna(t);
    if coalesce((nyr->>'buid')::boolean, false) then buid := buid + 1; end if;
    if nyr is distinct from t.sonnun then
      update thjonustubeidni set sonnun = nyr, sonnun_at = now(),
             svarad_at = case when svarad_at is null and nyr->>'styrkur' = 'svarad' then (nyr->>'dags')::timestamptz else svarad_at end
       where id = t.id;
      breytt := breytt + 1;
    end if;
  end loop;
  if p_ids is null then
    insert into app_kv(key, value, updated_at) values ('thjonustubord_endurmat', jsonb_build_object('metin', metin, 'breytt', breytt, 'buid', buid), now())
    on conflict (key) do update set value = excluded.value, updated_at = excluded.updated_at;
  end if;
  return jsonb_build_object('metin', metin, 'breytt', breytt, 'buid', buid);
end $$;

create or replace function public.thjb_bidrod_vinna() returns jsonb
language plpgsql security definer set search_path = public as $$
declare ids bigint[];
begin
  with tekid as (delete from thjb_endurmat_bidrod returning id) select array_agg(id) into ids from tekid;
  if ids is null then return jsonb_build_object('metin', 0); end if;
  return thjonustubeidni_endurmeta(ids);
end $$;

-- ── Krókarnir: aðeins biðröð, aldrei villa út í vistunina sem kveikti ──
create or replace function public.thjb_krokur() returns trigger
language plpgsql security definer set search_path = public as $$
declare ids bigint[];
begin
  begin
    if tg_table_name = 'thjonustubeidni' then
      ids := array[new.id];
    elsif tg_table_name = 'solur' then
      select array_agg(t.id) into ids from thjonustubeidni t
       where t.deleted_at is null and t.archived_at is null and t.status is distinct from 'lokad'
         and (coalesce(t.tags, '[]'::jsonb) @> jsonb_build_array('payday-xml-sala:' || new.id)
           or coalesce(t.tags, '[]'::jsonb) @> jsonb_build_array('sala:' || new.num)
           or (new.num is not null and t.title like '%' || new.num || '%')
           or (new.customer_base_id is not null and t.customer_base_id = new.customer_base_id)
           or coalesce(t.tags, '[]'::jsonb)::text like '%"payday:%');
    elsif tg_table_name = 'sara_yfirferd' then
      select array_agg(t.id) into ids from thjonustubeidni t
       where t.deleted_at is null and t.status is distinct from 'lokad'
         and coalesce(t.tags, '[]'::jsonb) @> jsonb_build_array('sara:' || new.id);
    elsif tg_table_name = 'email_digest' then
      if new.folder is distinct from 'SENT' then return null; end if;
      select array_agg(t.id) into ids from thjonustubeidni t
        left join email_digest e on t.channel_ref ~ '^email:\d+$' and e.id = substring(t.channel_ref from 7)::bigint
       where t.deleted_at is null and t.archived_at is null and t.status is distinct from 'lokad'
         and ((e.sender_email is not null and new.to_addresses::text ilike '%' || e.sender_email || '%')
           or coalesce(t.tags, '[]'::jsonb)::text ~ '"(rukkun|postur-beidni|payday-xml)');
    end if;
    if ids is not null then
      insert into thjb_endurmat_bidrod(id) select unnest(ids) on conflict (id) do nothing;
    end if;
  exception when others then
    raise warning 'thjb_krokur (%): %', tg_table_name, sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists thjb_krokur on public.solur;
create trigger thjb_krokur after insert or update of paid_at, krafa_sent_at, status on public.solur
  for each row execute function public.thjb_krokur();
drop trigger if exists thjb_krokur on public.sara_yfirferd;
create trigger thjb_krokur after update of stada on public.sara_yfirferd
  for each row execute function public.thjb_krokur();
drop trigger if exists thjb_krokur on public.email_digest;
create trigger thjb_krokur after insert on public.email_digest
  for each row execute function public.thjb_krokur();
drop trigger if exists thjb_krokur on public.thjonustubeidni;
create trigger thjb_krokur after insert or update of tags, channel_ref, title, notes, fyrirtaeki_id, customer_base_id, status on public.thjonustubeidni
  for each row execute function public.thjb_krokur();

grant execute on function public.thjonustubeidni_endurmeta(bigint[]) to anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname in ('thjb-bidrod', 'thjb-endurmat');
select cron.schedule('thjb-bidrod', '* * * * *', 'select public.thjb_bidrod_vinna()');
select cron.schedule('thjb-endurmat', '23 * * * *', 'select public.thjonustubeidni_endurmeta()');
