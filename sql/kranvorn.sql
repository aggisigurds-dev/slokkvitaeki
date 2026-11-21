-- =====================================================================
-- KRANVÖRN — Áfangi 4 í hreinsun Þjónustuborðsins (21.11.2026)
-- BEITT Á GRUNNINN 21.11.2026 (migrations: kranvorn_afangi4,
-- kranvorn_heilsuspjald, kranvorn_verkefnalisti_flag_fix,
-- kranvorn_verkefnalisti_log_lifir, kranvorn_aldursmork_postur).
-- Þessi skrá er heimildin: hún er samhljóða því sem er í loftinu.
-- =====================================================================
-- MÆLT ÁÐUR EN ÞETTA VAR SMÍÐAÐ (21 dagur fram að 20.11.2026):
--   claude (lotur) ....... 184 mál      ai-uppfaerslur ..... 60 mál
--   postur-sjalfvirkt .... 16 mál       payday-push .......... 7 mál
--   veidi-vaktin ........... 6 mál      Agnar sjálfur ........ 2 mál
--   => ~310 ný mál á 21 degi (15 á dag) og 2 af 310 komu frá manni.
--   `ai-uppfaerslur` skrifar 3–7 „AI-tillaga: …" á borðið hvern morgun
--   kl. 06:23. ÞAÐ FALL ER EKKI Í ÞESSU REPÓI — leitað var í báðum
--   repóum, netlify.toml, pg_cron og scheduled-tasks; lotan keyrir á
--   annarri vél. ÞVÍ ER VÖRNIN Í GRUNNINUM: hún hittir hvern sem
--   skrifar — lotur á hinni vélinni, Netlify-föllin, pg_cron og
--   REST-kall úr skel.
--   Verkefnalistinn: 93 raðir á 14 dögum, 30 merktar 'villa',
--   ~5 frá Agnari (skjámynd eða enginn agent), ~58 hugmyndir frá lotum.
--
-- REGLURNAR (beiðni Agnars 20.11.2026):
--   (a) engin lota stofnar mál sem er þegar til  -> nóta á málið sem er til
--       (a1 sami channel_ref · a2 sami ai:lykill · a3 sama félag+erindi)
--   (b) engin lota stofnar verkefnarað nema villa/markmið -> röðin fer ekki inn
--   (c) vakt verður aldrei að máli af sjálfu sér -> heilsuspjald, nema
--       pingið snerti peninga, kennitölu eða kúnna sem bíður
--   (d) „mælt aftur" þrisvar án niðurstöðu -> important + 'kranvorn:fyrir-agnar'
--   (e) aldursmörk: vélbúið mál verður ekki til úr pósti eldri en 21 dags
--
-- ENGU ER EYTT OG ENGU HAFNAÐ ÞEGJANDI: hver stöðvun fer í kranvorn_log
-- með fullum titli, nótum og tögum, svo hægt sé að stofna málið handvirkt.
-- Höfnun á Verkefnalistanum er EKKI `raise exception` — þá rúllaði hún
-- eigin log-færslu til baka (mælt: prófið taldi 5 færslur af 6).
--
-- AFTURKRÆFT: `select kranvorn_af()` slekkur allt; `select kranvorn_a()`
-- kveikir aftur. Þakið á aldrinum: app_kv lykill 'kranvorn' -> postur_dagar.
--
-- PRÓFAÐ ENDA Á MILLI á raungrunni 21.11.2026 — 17 mælingar, allar grænar,
-- prufuraðir hreinsaðar (test/kranvorn.test.cjs geymir sama prófið sem
-- SQL-streng; vörður tools/audit-kranvorn.cjs ver reglurnar í CI).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Annáll: hvað stöðvaði vörnin, með öllum textanum.
-- ---------------------------------------------------------------------
create table if not exists public.kranvorn_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  tafla       text not null,
  regla       text not null,   -- channel_ref | ai_lykill | sama_erindi | vakt | aldur | thak
  adgerd      text not null,   -- nota | heilsa | hafnad | til_agnars
  mal_id      bigint,          -- málið sem var til (ef við á)
  titill      text,
  created_by  text,
  source      text,
  channel_ref text,
  skyring     text,
  gogn        jsonb
);
create index if not exists kranvorn_log_at_idx on public.kranvorn_log (at desc);
comment on table public.kranvorn_log is
  'Kranvörn: hvert mál/verk sem vörnin stöðvaði, með fullum texta svo ekkert tapist. Sjá sql/kranvorn.sql.';

-- ---------------------------------------------------------------------
-- Heilsuspjald: ping úr vöktum sem fara EKKI á Þjónustuborðið.
-- Sama ping tvisvar hækkar n í stað þess að verða ný lína.
-- ---------------------------------------------------------------------
create table if not exists public.heilsuspjald (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  uppruni    text,
  flokkur    text not null default 'vakt-ping',
  titill     text,
  texti      text,
  n          int not null default 1,
  sidast_at  timestamptz not null default now()
);
create unique index if not exists heilsuspjald_lykill_idx
  on public.heilsuspjald (coalesce(uppruni,''), flokkur, coalesce(titill,''));
comment on table public.heilsuspjald is
  'Heilsuspjald: ping úr vöktum sem kranvörnin hleypti EKKI á Þjónustuborðið. Sjá sql/kranvorn.sql.';

-- Tvítekningarvörn í biðstofu Charlize (mælt 21.11: 594 færslur á 7 dögum,
-- 0 tvítekin content_hash — vörnin er því frí og gerir hana varanlega).
create unique index if not exists charlize_inbox_hash_idx on public.charlize_inbox (content_hash);

-- ---------------------------------------------------------------------
-- Rofar og tölur. Vantar lykilinn => vörnin er á.
-- ---------------------------------------------------------------------
create or replace function public.kranvorn_rofi(p_nafn text) returns boolean
language sql stable set search_path to 'public' as $$
  select coalesce((select (value->>p_nafn)::boolean from public.app_kv where key = 'kranvorn'), true);
$$;

create or replace function public.kranvorn_tala(p_nafn text, p_sjalfgefid numeric) returns numeric
language sql stable set search_path to 'public' as $$
  select coalesce((select (value->>p_nafn)::numeric from public.app_kv where key = 'kranvorn'), p_sjalfgefid);
$$;

create or replace function public.kranvorn_af() returns jsonb
language sql set search_path to 'public' as $$
  insert into public.app_kv(key, value, updated_at)
  values ('kranvorn', '{"bord":false,"verkefnalisti":false,"vaktir":false}'::jsonb, now())
  on conflict (key) do update set value = excluded.value, updated_at = now()
  returning value;
$$;

create or replace function public.kranvorn_a() returns jsonb
language sql set search_path to 'public' as $$
  insert into public.app_kv(key, value, updated_at)
  values ('kranvorn', '{"bord":true,"verkefnalisti":true,"vaktir":true}'::jsonb, now())
  on conflict (key) do update set value = excluded.value, updated_at = now()
  returning value;
$$;

-- ---------------------------------------------------------------------
-- Erindi úr titli: „AI-tillaga: Rafís: færa eindaga" og „Re: rafís —
-- færa eindaga!" lenda á sama streng. Fyrstu 60 stafir, broddar haldnir.
-- ---------------------------------------------------------------------
create or replace function public.kranvorn_erindi(p_titill text) returns text
language sql immutable as $$
  select left(btrim(regexp_replace(
           regexp_replace(lower(coalesce(p_titill, '')),
             '^[^a-z0-9áðéíóúýþæö]*((ai-tillaga|tillaga|re|sv|svar|fwd|fw|aw|tr|vip|áríðandi)[ ]*:[ ]*)+', '', 'i'),
           '[^a-z0-9áðéíóúýþæö]+', ' ', 'g')), 60);
$$;

-- ---------------------------------------------------------------------
-- (e) Aldursmörk. Sér kveikja sem keyrir Á UNDAN kranvorn_bord_trg
-- (stafrófsröð: aldur < bord), svo 9,5 kB fallið bh_postur_inn_a_bord
-- þurfi ekki að breytast.
-- ---------------------------------------------------------------------
create or replace function public.kranvorn_aldur() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare v_vel boolean; v_dagar int; v_dags timestamptz;
begin
  if not public.kranvorn_rofi('bord') then return new; end if;
  v_vel := coalesce(new.created_by, '') ~* '(claude|^ai$|^ai-|vakt|cron|audit|payday|sjalfv|combo|hunter|postur-|verkdagbok|cowork|gatt-)'
        or coalesce(new.source, '')     ~* '^(claude|ai$|ai-|cowork|verkdagbok|gatt-)';
  if not v_vel then return new; end if;

  v_dagar := public.kranvorn_tala('postur_dagar', 21)::int;

  if new.channel_ref ~ '^email:[0-9]+$' then
    select d.received_at into v_dags from public.email_digest d
     where d.id = (substring(new.channel_ref from 7))::bigint;
  end if;
  v_dags := coalesce(v_dags, new.created_at);
  if v_dags is null or v_dags >= now() - (v_dagar || ' days')::interval then return new; end if;

  insert into public.kranvorn_log(tafla, regla, adgerd, titill, created_by, source, channel_ref, skyring, gogn)
  values ('thjonustubeidni', 'aldur', 'hafnad', new.title, new.created_by, new.source, new.channel_ref,
          'erindið er ' || (extract(day from now() - v_dags))::int || ' daga gamalt — eldra en ' || v_dagar
          || ' daga þakið, svo það varð ekki nýtt mál (app_kv kranvorn.postur_dagar)',
          jsonb_build_object('notes', left(coalesce(new.notes, ''), 2000), 'dags', v_dags, 'tags', new.tags));
  return null;
end $function$;

drop trigger if exists kranvorn_aldur_trg on public.thjonustubeidni;
create trigger kranvorn_aldur_trg before insert on public.thjonustubeidni
  for each row execute function public.kranvorn_aldur();

-- ---------------------------------------------------------------------
-- (a) + (c) + (d) Þjónustuborðið
-- ---------------------------------------------------------------------
create or replace function public.kranvorn_bord() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_vel boolean; v_vakt boolean; v_texti text; v_erindi text;
  v_felag bigint; v_lykill text; v_mal bigint; v_regla text; v_n int;
begin
  if not public.kranvorn_rofi('bord') then return new; end if;

  -- Það sem maður skrifar sjálfur fer ALLTAF inn. Vörnin snertir aðeins vélbúin mál.
  v_vel := coalesce(new.created_by, '') ~* '(claude|^ai$|^ai-|vakt|cron|audit|payday|sjalfv|combo|hunter|postur-|verkdagbok|cowork|gatt-)'
        or coalesce(new.source, '')     ~* '^(claude|ai$|ai-|cowork|verkdagbok|gatt-)';
  if not v_vel then return new; end if;

  v_texti := coalesce(new.title, '') || ' ' || coalesce(new.notes, '') || ' ' || coalesce(new.summary, '');

  -- (c) Vakt verður aldrei að máli af sjálfu sér.
  v_vakt := coalesce(new.created_by, '') ~* '(vakt|audit|cron|sjalfprof|heilsa|naeturkerfi|vordur|vordurinn)'
         or coalesce(new.source, '')     ~* '(vakt|audit|heilsa)';
  if v_vakt and public.kranvorn_rofi('vaktir')
     and v_texti !~* '(\d{6}-?\d{4}|kennitöl|kennitol|\mkt\M|\mkr\M|krón|kron|reikning|kröfu|krofu|krafa|kredit|greið|greid|ógreid|ogreid|innheimt|eindag|gjaldfall|vanskil|bíður|bidur|svar vantar|ósvarað|osvarad|kúnni|kunni|viðskiptavin|vidskiptavin)'
  then
    insert into public.heilsuspjald(uppruni, flokkur, titill, texti)
    values (coalesce(nullif(new.created_by, ''), new.source, 'vakt'), 'vakt-ping',
            left(coalesce(new.title, '(án titils)'), 200),
            left(coalesce(nullif(new.notes, ''), nullif(new.summary, ''), ''), 2000))
    on conflict (coalesce(uppruni,''), flokkur, coalesce(titill,''))
      do update set n = public.heilsuspjald.n + 1, sidast_at = now(),
                    texti = coalesce(excluded.texti, public.heilsuspjald.texti);
    insert into public.kranvorn_log(tafla, regla, adgerd, titill, created_by, source, channel_ref, skyring, gogn)
    values ('thjonustubeidni', 'vakt', 'heilsa', new.title, new.created_by, new.source, new.channel_ref,
            'ping úr vakt snertir hvorki peninga, kennitölu né kúnna sem bíður — fór á heilsuspjald',
            jsonb_build_object('notes', left(coalesce(new.notes, ''), 2000), 'tags', new.tags));
    return null;
  end if;

  -- (a1) Sami channel_ref og opið mál (sami póstþráður).
  if new.channel_ref is not null and new.channel_ref <> '' then
    select id into v_mal from public.thjonustubeidni
     where channel_ref = new.channel_ref and deleted_at is null and archived_at is null
       and coalesce(status, '') not in ('lokad', 'lokid', 'archived', 'closed')
     order by updated_at desc nulls last limit 1;
    if v_mal is not null then v_regla := 'channel_ref'; end if;
  end if;

  -- (a2) Sama AI-tillaga (ai:lykill) hefur ÞEGAR verið lögð fyrir — líka ef henni var lokað.
  if v_mal is null then
    select x into v_lykill
      from jsonb_array_elements_text(coalesce(new.tags, '[]'::jsonb)) x
     where x like 'ai:lykill:%' limit 1;
    if v_lykill is not null then
      select id into v_mal from public.thjonustubeidni
       where deleted_at is null and coalesce(tags, '[]'::jsonb) @> jsonb_build_array(v_lykill)
       order by id desc limit 1;
      if v_mal is not null then v_regla := 'ai_lykill'; end if;
    end if;
  end if;

  -- (a3) Sama félag með sama erindi opið.
  if v_mal is null then
    v_erindi := public.kranvorn_erindi(new.title);
    v_felag  := coalesce(new.fyrirtaeki_id, -new.customer_base_id);
    if length(v_erindi) >= 12 then
      select id into v_mal from public.thjonustubeidni
       where deleted_at is null and archived_at is null
         and coalesce(status, '') not in ('lokad', 'lokid', 'archived', 'closed')
         and public.kranvorn_erindi(title) = v_erindi
         and ((v_felag is not null and coalesce(fyrirtaeki_id, -customer_base_id) = v_felag)
           or (v_felag is null and fyrirtaeki_id is null and customer_base_id is null))
       order by updated_at desc nulls last limit 1;
      if v_mal is not null then v_regla := 'sama_erindi'; end if;
    end if;
  end if;

  if v_mal is null then return new; end if;   -- nýtt erindi: fer inn eins og áður

  -- Nóta á málið sem er til — enginn texti tapast.
  -- (d) Teljari: þriðja mælingin án niðurstöðu fer fyrir Agnar.
  select coalesce(max((regexp_match(x, '^kranvorn:maelt:(\d+)$'))[1]::int), 0) into v_n
    from public.thjonustubeidni t, jsonb_array_elements_text(coalesce(t.tags, '[]'::jsonb)) x
   where t.id = v_mal;
  v_n := coalesce(v_n, 0) + 1;

  update public.thjonustubeidni set
    notes = left(coalesce(notes || E'\n', '') || '— ' || to_char(now(), 'DD.MM.YYYY HH24:MI')
            || ' kranvörn (' || v_regla || '): ' || coalesce(nullif(new.created_by, ''), 'vél')
            || ' vildi stofna nýtt mál um sama erindi: ' || coalesce(new.title, '(án titils)')
            || coalesce(E'\n' || nullif(left(new.notes, 800), ''), ''), 20000),
    tags = coalesce((select jsonb_agg(x) from jsonb_array_elements_text(coalesce(tags, '[]'::jsonb)) x
                      where x !~ '^kranvorn:maelt:'), '[]'::jsonb)
           || jsonb_build_array('kranvorn:maelt:' || v_n)
           || case when v_n >= 3 and not (coalesce(tags, '[]'::jsonb) @> '["kranvorn:fyrir-agnar"]'::jsonb)
                   then '["kranvorn:fyrir-agnar"]'::jsonb else '[]'::jsonb end,
    important = case when v_n >= 3 and coalesce(assigned_to, 'Agnar') = 'Agnar' then true else important end,
    updated_at = now()
   where id = v_mal;

  insert into public.kranvorn_log(tafla, regla, adgerd, mal_id, titill, created_by, source, channel_ref, skyring, gogn)
  values ('thjonustubeidni', v_regla, case when v_n >= 3 then 'til_agnars' else 'nota' end, v_mal,
          new.title, new.created_by, new.source, new.channel_ref,
          'erindið var þegar á borðinu sem #' || v_mal || ' — nóta sett þar, mæling nr. ' || v_n,
          jsonb_build_object('notes', left(coalesce(new.notes, ''), 2000), 'tags', new.tags,
                             'summary', left(coalesce(new.summary, ''), 1000)));
  return null;
end $function$;

drop trigger if exists kranvorn_bord_trg on public.thjonustubeidni;
create trigger kranvorn_bord_trg before insert on public.thjonustubeidni
  for each row execute function public.kranvorn_bord();

-- ---------------------------------------------------------------------
-- (b) Verkefnalistaþak: listinn er Agnars. Lota má skrá VILLU eða verk
--     sem tengist markmiði — ekki hugmyndir.
-- ---------------------------------------------------------------------
create or replace function public.kranvorn_verkefnalisti() returns trigger
language plpgsql security definer set search_path to 'public' as $function$
declare v_texti text;
begin
  if not public.kranvorn_rofi('verkefnalisti') then return new; end if;

  -- Agnar sjálfur: skjámynd límd á verkið, engin vél merkt á það, eða verk sem
  -- Afgreiðslan/Aðalmál stofnaði af því AGNAR ýtti á takkann ([AGNAR]-merkið,
  -- netlify/functions/afgreidsla.cjs).
  if new.request_image_url is not null
     or coalesce(new.request_image_urls::text, '[]') not in ('[]', 'null', '')
     or coalesce(new.assigned_agent, '') !~* '(claude|vakt|cron|agent|ai)'
     or position('[AGNAR]' in coalesce(new.description, '') || coalesce(new.claude_notes, '')) > 0
  then return new; end if;

  v_texti := coalesce(new.title, '') || ' ' || coalesce(new.description, '') || ' ' || coalesce(new.claude_notes, '');

  -- Skráð villa, eða verk sem tengist markmiði.
  if coalesce(new.category, '') ~* '(villa|bug|galli)'
     or v_texti ~* '(markmið|markmid|\mvilla\M|villan|galli|gallinn|\mbug\M|stack ?trace|exception|traceback|hrynur|hrun|kastar villu)'
  then return new; end if;

  insert into public.kranvorn_log(tafla, regla, adgerd, titill, created_by, skyring, gogn)
  values ('verkefnalisti', 'thak', 'hafnad', new.title, new.assigned_agent,
          'Verkefnalistaþak (regla Agnars 16.11.2026): hvorki skráð villa né tengt markmiði. Röðin fór EKKI inn; textinn er hér. Sé þetta villa: category = ''villa''. Annars fer það í lokasvarið til Agnars eða í Charlize.',
          jsonb_build_object('description', left(coalesce(new.description, ''), 4000),
                             'claude_notes', left(coalesce(new.claude_notes, ''), 2000),
                             'category', new.category, 'priority', new.priority, 'vefur', new.vefur,
                             'status', new.status));
  return null;
end $function$;

drop trigger if exists kranvorn_verkefnalisti_trg on public.verkefnalisti;
create trigger kranvorn_verkefnalisti_trg before insert on public.verkefnalisti
  for each row execute function public.kranvorn_verkefnalisti();

-- ---------------------------------------------------------------------
-- Yfirlit: hvað stöðvaði vörnin? (Fyrir Þjónustuborðið og lotur.)
-- ---------------------------------------------------------------------
create or replace view public.v_kranvorn_7d as
  select tafla, regla, adgerd, count(*) n, max(at) sidast
    from public.kranvorn_log where at > now() - interval '7 days'
   group by 1, 2, 3 order by n desc;
