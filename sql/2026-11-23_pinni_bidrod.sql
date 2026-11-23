-- 23.11.2026 (Agnar: „já reyndu að láta þetta virka — vil geta breytt einföldum hlutum“).
-- Heimilisfang breytt á HVAÐA LEIÐ SEM ER (SQL, agent, innflutningur, gamalt spjald) → pinninn á kortinu fylgir sjálfkrafa.
-- Áður fékk aðeins viðmótið (527 → Uppfærsluborð 431) nýjan pinna; breyting beint í grunninn skildi pinnann eftir á gamla staðnum.
--
-- Mynstur: sama og thjb_bidrod (biðröð + pg_cron á mínútu fresti).
--   1. kveikja á fyrirtaeki.heimilisfang → ein röð í pinni_bidrod á fyrirtæki (ný breyting yfirskrifar bið)
--   2. pinni_bidrod_vinna() (pg_cron „pinni-bidrod“, hver mínúta) → /api/geocode (Staðfangaskrá HMS → Nominatim) → geocode_cache `__co__:<id>`
--   3. geocode_cache.updated_at (2026-11-23_geocode_cache_updated_at.sql) hækkar við breytt hnit → 156 saekjaBreytt() flytur pinnann á allar vélar
-- Reglur: pinni sem fyrir er (taflan EÐA AppSettings-blobbinn — upprunans sér ekki stað, 247 af 249 bera `local-sync`) stendur ef nýja hnitið er innan 150 m
--         (heimilisfang aðeins endurritað) og víkur annars aðeins fyrir hnitum úr Staðfangaskrá; fyrir Nominatim er pinninn látinn standa og viðvörun birtist.
--         Enginn pinni fyrir → hvaða niðurstaða sem er.
-- Bilun → allt að 5 tilraunir (5 mín. bil; hver röð í sinni undirfærslu), svo stada 'villa' + lína í viðvörunina (kt_breyting_log.vidvorun → v_audkenni_vidvaranir).
-- Rofi: app_kv 'pinni_sjalfvirkt' {"virkt": false} slekkur á biðröð og vinnslu. Engin gögn viðskiptavina breytast; aðeins geocode_cache.
-- Ekki dekkað: ný fyrirtæki (INSERT) — pinninn þeirra kemur úr kortinu (156/161) eins og áður.

create table if not exists public.pinni_bidrod (
  id bigserial primary key,
  fyrirtaeki_id bigint not null,
  heimilisfang text not null,
  bidid_at timestamptz not null default now(),
  tilraun_at timestamptz,
  tilraunir int not null default 0,
  stada text not null default 'bid' check (stada in ('bid', 'lokid', 'villa')),
  utkoma jsonb,
  unnid_at timestamptz
);
create unique index if not exists pinni_bidrod_bid_uniq on public.pinni_bidrod (fyrirtaeki_id) where stada = 'bid';
create index if not exists pinni_bidrod_fyrirtaeki_idx on public.pinni_bidrod (fyrirtaeki_id, bidid_at desc);
alter table public.pinni_bidrod enable row level security;
revoke all on public.pinni_bidrod from anon, authenticated;
revoke all on sequence public.pinni_bidrod_id_seq from anon, authenticated;

create or replace function public.pinni_virkt() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (value->>'virkt')::boolean from public.app_kv where key = 'pinni_sjalfvirkt'), true)
$$;

-- Leysir heimilisfang í hnit gegnum sama /api/geocode og viðmótið notar (skyndiminni → Staðfangaskrá → Nominatim). Skrifar ekkert í okkar töflur.
create or replace function public.pinni_leysa(p_adr text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r extensions.http_response; j jsonb; v_lat double precision; v_lon double precision;
begin
  if nullif(btrim(coalesce(p_adr, '')), '') is null then return jsonb_build_object('ok', false, 'villa', 'heimilisfang tómt'); end if;
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT', '20');
  perform extensions.http_set_curlopt('CURLOPT_CONNECTTIMEOUT', '8');
  r := extensions.http_get('https://slokkvitaeki.netlify.app/api/geocode?q=' || extensions.urlencode(btrim(p_adr)));
  if r.status <> 200 then return jsonb_build_object('ok', false, 'villa', 'HTTP ' || r.status); end if;
  begin j := r.content::jsonb; exception when others then return jsonb_build_object('ok', false, 'villa', 'ólesanlegt svar'); end;
  if coalesce(j->>'found', '') = 'false' then return jsonb_build_object('ok', false, 'finnst_ekki', true, 'villa', 'fannst ekki'); end if;
  begin v_lat := (j->>'lat')::double precision; v_lon := (j->>'lon')::double precision; exception when others then v_lat := null; end;
  if v_lat is null or v_lon is null or v_lat not between 62.5 and 67.5 or v_lon not between -25.5 and -12.5 then
    return jsonb_build_object('ok', false, 'villa', 'hnit utan Íslands eða ólesanleg');
  end if;
  return jsonb_build_object('ok', true, 'lat', v_lat, 'lon', v_lon, 'display_name', nullif(j->>'display_name', ''), 'source', coalesce(j->>'source', '?'));
exception when others then
  return jsonb_build_object('ok', false, 'villa', left(sqlerrm, 160));
end $$;

create or replace function public.pinni_vidvorun(p_id bigint, p_texti text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if nullif(btrim(coalesce(p_texti, '')), '') is null then return; end if;   -- tómt má aldrei þurrka út viðvörun sem fyrir er
  update public.kt_breyting_log
     set vidvorun = coalesce(vidvorun || E'\n', '') || p_texti
   where id = (select max(id) from public.kt_breyting_log where fyrirtaeki_id = p_id and kvittad_at is null and tegund like '%heimilisfang%');
end $$;

-- Afgreiðir EINA röð í biðröðinni. Skilar: sleppt | thegar | haldid | flutt | villa | bid.
-- Pinni sem fyrir er (geocode_cache `__co__:<id>` EÐA föstu punktarnir í AppSettings-blobbnum — 757 blobblyklar, aðeins 249 í töflunni, og taflan geymir upprunann
-- sem `local-sync`, svo „handvirkt“ sést ekki á source) er aðeins færður þegar nýja hnitið kemur frá Staðfangaskrá (beint eða úr skyndiminni þar sem uppruninn er
-- skráður Staðfangaskrá/handvirkur) — Nominatim giskar stundum á samnefnda götu í öðrum landshluta (geocode.js, 16.09.2026). Innan 150 m = heimilisfang aðeins endurritað → pinninn stendur.
create or replace function public.pinni_afgreida(p_id bigint) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  it public.pinni_bidrod%rowtype; f record; res jsonb; adr text; k text;
  v_lat double precision; v_lon double precision; src text; g_lat double precision; g_lng double precision; fj double precision;
  precise boolean; v_adr_src text;
begin
  select * into it from public.pinni_bidrod where id = p_id;
  if not found or it.stada <> 'bid' then return 'sleppt'; end if;
  select id, heimilisfang, deleted_at into f from public.fyrirtaeki where id = it.fyrirtaeki_id;
  adr := btrim(coalesce(f.heimilisfang, ''));
  if not found or f.deleted_at is not null or adr = '' then
    update public.pinni_bidrod set stada = 'lokid', unnid_at = now(), utkoma = jsonb_build_object('sleppt', 'fyrirtæki eytt eða heimilisfang tómt') where id = it.id;
    return 'sleppt';
  end if;
  k := '__co__:' || it.fyrirtaeki_id;
  -- viðmótið (Uppfærsluborð) var á undan og hefur þegar fært pinnann
  if exists (select 1 from public.geocode_cache where query = k and updated_at >= it.bidid_at)
     and exists (select 1 from public.geocode_cache where query = adr) then
    update public.pinni_bidrod set stada = 'lokid', unnid_at = now(), utkoma = jsonb_build_object('thegar', true) where id = it.id;
    return 'thegar';
  end if;

  res := public.pinni_leysa(adr);
  if not coalesce((res->>'ok')::boolean, false) then
    update public.pinni_bidrod
       set tilraunir = tilraunir + 1, tilraun_at = now(), utkoma = res,
           stada = case when tilraunir + 1 >= 5 or (coalesce((res->>'finnst_ekki')::boolean, false) and tilraunir + 1 >= 2) then 'villa' else 'bid' end,
           unnid_at = case when tilraunir + 1 >= 5 or (coalesce((res->>'finnst_ekki')::boolean, false) and tilraunir + 1 >= 2) then now() else null end
     where id = it.id;
    if exists (select 1 from public.pinni_bidrod where id = it.id and stada = 'villa') then
      perform public.pinni_vidvorun(it.fyrirtaeki_id, 'Pinninn fannst ekki sjálfkrafa (' || coalesce(res->>'villa', '?') || ') — keyrðu „Uppfæra eftir heimilisfangi“ í Uppfærsluborði eða „Laga staðsetningu“ á Leiðsögn svo kort, Teikningar og búnaðardreifing finni staðinn.');
      return 'villa';
    end if;
    return 'bid';
  end if;

  v_lat := (res->>'lat')::double precision; v_lon := (res->>'lon')::double precision; src := res->>'source';
  select lat, lng into g_lat, g_lng from public.geocode_cache where query = k;
  if not found then
    select (settings->'geocode_cache'->k->>'lat')::double precision, (settings->'geocode_cache'->k->>'lng')::double precision
      into g_lat, g_lng from public.app_settings where id = 1;
  end if;
  if g_lat is not null and g_lng is not null then
    fj := 111320 * sqrt(power(v_lat - g_lat, 2) + power((v_lon - g_lng) * cos(radians(v_lat)), 2));
    if fj < 150 then
      update public.pinni_bidrod set stada = 'lokid', unnid_at = now(), tilraunir = tilraunir + 1,
             utkoma = jsonb_build_object('haldid', true, 'ast', 'pinni fyrir innan við 150 m — heimilisfang aðeins endurritað', 'fjarlaegd_m', round(fj::numeric)) where id = it.id;
      return 'haldid';
    end if;
    v_adr_src := coalesce((select source from public.geocode_cache where query = adr), '');
    precise := src = 'stadfangaskra' or v_adr_src in ('stadfangaskra', 'manual', 'uppferslubord');
    if not precise then
      update public.pinni_bidrod set stada = 'villa', unnid_at = now(), tilraunir = tilraunir + 1,
             utkoma = jsonb_build_object('villa', 'pinni er fyrir og nýja hnitið er ekki úr Staðfangaskrá', 'uppruni', src, 'heimilisfangslykill', v_adr_src, 'fjarlaegd_m', round(fj::numeric)) where id = it.id;
      perform public.pinni_vidvorun(it.fyrirtaeki_id, 'Pinninn var EKKI færður sjálfkrafa: pinni er fyrir og nýja heimilisfangið fannst aðeins með ónákvæmri uppflettingu (' || round(fj::numeric) || ' m frá núverandi pinna). Færðu hann með „Uppfæra eftir heimilisfangi“ í Uppfærsluborði eða „Laga staðsetningu“ á Leiðsögn.');
      return 'villa';
    end if;
  end if;

  insert into public.geocode_cache (query, lat, lng, display_name, source)
  values (k, v_lat, v_lon, res->>'display_name', 'pinni_bidrod')
  on conflict (query) do update set lat = excluded.lat, lng = excluded.lng, display_name = excluded.display_name, source = excluded.source;
  insert into public.geocode_cache (query, lat, lng, display_name, source)
  values (adr, v_lat, v_lon, res->>'display_name', 'pinni_bidrod')
  on conflict (query) do nothing;
  update public.pinni_bidrod set stada = 'lokid', unnid_at = now(), tilraunir = tilraunir + 1,
         utkoma = jsonb_build_object('lat', v_lat, 'lon', v_lon, 'source', src, 'fjarlaegd_m', case when fj is null then null else round(fj::numeric) end) where id = it.id;
  return 'flutt';
end $$;

-- pg_cron kallar á hana á mínútu fresti. Hver röð í sinni undirfærslu: villa eða kast í einni röð telst sem tilraun og stöðvar hvorki hinar né endurtekur sig endalaust.
create or replace function public.pinni_bidrod_vinna(p_hamark int default 2) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare it record; o text; tal jsonb := '{}'::jsonb; n int := 0;
begin
  if not public.pinni_virkt() then return jsonb_build_object('virkt', false); end if;
  if not pg_try_advisory_xact_lock(hashtext('pinni_bidrod_vinna')) then return jsonb_build_object('upptekid', true); end if;
  for it in
    select id from public.pinni_bidrod
     where stada = 'bid' and tilraunir < 5 and (tilraun_at is null or tilraun_at < now() - (tilraunir * interval '5 minutes'))
     order by bidid_at limit greatest(p_hamark, 1) for update skip locked
  loop
    n := n + 1;
    begin
      o := public.pinni_afgreida(it.id);
    exception when others then
      update public.pinni_bidrod
         set tilraunir = tilraunir + 1, tilraun_at = now(), utkoma = jsonb_build_object('villa', left(sqlerrm, 160)),
             stada = case when tilraunir + 1 >= 5 then 'villa' else 'bid' end
       where id = it.id;
      o := 'kast';
    end;
    tal := tal || jsonb_build_object(o, coalesce((tal->>o)::int, 0) + 1);
  end loop;
  return jsonb_build_object('unnid', n) || tal;
end $$;

create or replace function public.trg_pinni_bidrod() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if nullif(btrim(coalesce(new.heimilisfang, '')), '') is null then return new; end if;
  if not public.pinni_virkt() then return new; end if;
  insert into public.pinni_bidrod (fyrirtaeki_id, heimilisfang) values (new.id, btrim(new.heimilisfang))
  on conflict (fyrirtaeki_id) where stada = 'bid'
  do update set heimilisfang = excluded.heimilisfang, bidid_at = now(), tilraunir = 0, tilraun_at = null;
  return new;
exception when others then
  -- ALLTAF LEYFA VISTUN: biðröðin má aldrei fella breytingu á fyrirtæki.
  raise warning 'trg_pinni_bidrod (fyrirtaeki %): %', new.id, sqlerrm;
  return new;
end $$;

drop trigger if exists trg_zz_pinni_bidrod on public.fyrirtaeki;
create trigger trg_zz_pinni_bidrod
  after update of heimilisfang on public.fyrirtaeki
  for each row when (old.heimilisfang is distinct from new.heimilisfang)
  execute function public.trg_pinni_bidrod();

revoke all on function public.pinni_leysa(text), public.pinni_vidvorun(bigint, text), public.pinni_afgreida(bigint), public.pinni_bidrod_vinna(int), public.pinni_virkt(), public.trg_pinni_bidrod() from public, anon, authenticated;

-- Tímasett 23.11.2026 17:15 (jobid 10) eftir próf í rúlluðum færslum (kveikja, hald innan 150 m, færsla, Nominatim-vörn, fannst ekki, undantekning/bið/5 tilraunir) og eina raunkeyrslu pg_cron:
select cron.schedule('pinni-bidrod', '* * * * *', 'select public.pinni_bidrod_vinna()');
