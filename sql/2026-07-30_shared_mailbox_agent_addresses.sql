-- =====================================================================
-- 2026-07-30  DEILD UMBOÐS-NETFÖNG (shared agent mailboxes)
-- =====================================================================
-- EKKI KEYRT SJÁLFKRAFA. Yfirfara → keyra handvirkt (á eftir
-- sql/2026-07-30_fyrirtaeki_samskipti_evidence.sql, sem er þegar live).
--
-- VANDINN (tvö sannreynd einkenni í dag)
-- --------------------------------------
-- 1. gjaldkeri@eignaumsjon.is sendir fyrir MÖRG húsfélög (6 bases hjá okkur,
--    184 póstar). Hver einasti póstur taldist á ÖLLUM sex → crm_cache/
--    crm_yfirlit sýndu SÖMU töluna á öllum: osvarad=159, postar_alls=184
--    (sannreynt fyrir keyrslu: raðir 239/244/390/648/733/1368 allar eins).
-- 2. dimka@heimaleiga.is er skráð netfang á 7 bases (293 Heimaleiga + SAB
--    303, 676, 681, 769, 784 Aegina, 866). Aegina (base 784) á aðeins EINN
--    stað (fyrirtaeki 797) svo 'single'-reglan stimplaði ALLA 67 dimka-póstana
--    á bygginguna hans — „Re: Heimaleiga order, Dalbrekka 4-6…" birtist sem
--    Aegina-póstur.
--
-- Þetta er sama stéttin af villu og patch 240 leysti framenda-megin
-- („custByEmail — AÐEINS einkvæm netföng; deildir umboðsmanna-póstar eins og
-- gjaldkeri@eignaumsjon.is … eru útilokaðir"). Hér er sú regla flutt í SQL.
--
-- REGLAN
-- ------
-- Netfang sem er skráð á FLEIRI en eitt customer_base (á fyrirtaeki.netfang,
-- customers_base.netfang eða customers_base.contact_email) er DEILT
-- UMBOÐS-NETFANG. Póstur sem berst um deilt netfang:
--
--   * fær ALDREI 'single'- eða 'addr'-tengingu (netfangið sannar ekkert um
--     eiganda) — staður aðeins með innihalds-sönnun (bh_site_keys-hit),
--     nákvæmlega eins og fjölstaða-félög í morgun-migrationinu;
--   * telst á FÉLAG aðeins með sönnun: staður félagsins nefndur í póstinum
--     (eitt eða fleiri hit) EÐA aðgreinandi NAFN félagsins sjálfs (nýtt fall
--     bh_base_key: „Heimaleiga ehf" → 'heimaleiga', „Aegina ehf." → 'aegina');
--   * annars á það heima í UMBOÐS-PÓSTHÓLFINU (ný sýn umbods_postholf) — ekki
--     á neinu félagi. Pósturinn týnist ekki: Verkborð/innhólf lesa
--     email_digest beint og sjá hann áfram.
--
-- VALIÐ: leið (a) — sönnunar-krafa á félags-tengingu — EKKI leið (b) (halda
-- fanout en undanskilja úr talningu). Mælt á raungögnum:
--   * Leið (a): Heimaleiga (293) heldur 66/67 póstum (base-nafnið 'heimaleiga'
--     stendur í nær hverjum pósti — undirskrift/lén); Aegina (784) fer 67 → 3
--     (aðeins póstar sem nefna Aegina/Grensásveg); Eignaumsjónar-húsfélögin
--     halda aðeins pósti sem nefnir SITT hús (0–3 hvert); 179 umboðs-póstar
--     fara í hólfið. Einn-netfangs kúnnar (t.d. Hópbílar, site 303) óbreyttir.
--   * Leið (b) hefði áfram sýnt alla 67 Heimaleiga-póstana á Aegina-spjaldinu
--     og alla 184 gjaldkeri-póstana á hverju húsfélagi (aðeins tölurnar
--     lagaðar) — Heimaleiga-einkennið hefði EKKI lagast. Hafnað.
--
-- Deilt netfang er sjaldgæft: 20 netföng / 140 staðir / ~329 póstar alls
-- (tveir póstkassar bera nær allt: gjaldkeri 184 + dimka 67). Sameinaða
-- skilgreiningin (fyrirtaeki + customers_base) flippar ENGUM staði umfram
-- fyrirtaeki-hliðina eina (mælt: 0 raðir) — engin hliðarverkun á venjulega.
--
-- HRAÐI
-- -----
-- UNION-greinarnar tvær á email_digest standa ÓBREYTTAR (eitt netfang í einu
-- → email_digest_sender_lower_idx + email_digest_to_addresses_trgm_idx).
-- Eina viðbótin á heitu leiðinni er EITT kall á bh_addr_n_bases per netfang
-- félagsins (lítil uppfletting, fær eigin vísa hér að neðan). Einn-staðar
-- ódeilt félag fer áfram stystu leið ('single', hay=''‚ ekkert body sótt).
-- plpgsql-föllin eru áfram vísvitandi plpgsql svo áætlanasmiðurinn felli þau
-- ekki inn (planning-tíminn haldist ~2,7 ms).
--
-- VIÐMÓTS-SAMNINGUR
-- -----------------
-- fyrirtaeki_samskipti og felag_samskipti halda NÁKVÆMLEGA sömu dálkalistum
-- í sömu röð (patchar 286/287 lesa þá á nafni). via-gildin eru óbreytt
-- (single|addr|evidence|felag). refresh_crm_cache() heldur undirskrift,
-- SECURITY DEFINER og crm_cache-dálkunum; pg_cron verkið 'crm-cache-refresh'
-- (17 * * * *) þarf enga breytingu.
-- =====================================================================

begin;

-- ── Ný hjálparföll ───────────────────────────────────────────────────

-- Aðgreinandi NAFN-lykill félags: fellt nafn án félagaforms-endingar.
-- „Heimaleiga ehf" → 'heimaleiga' · „Aegina ehf." → 'aegina' ·
-- „Húsfélagið Álftamýri 36" → 'alftamyri 36' (húsfélags-forskeytið er ekki
-- aðgreinandi og er klippt). Of stutt (<5) eða tómt → null („SAB ehf." → null).
create or replace function public.bh_base_key(p_nafn text)
returns text language plpgsql immutable parallel safe as $fn$
declare k text;
begin
  k := public.bh_fold(p_nafn);
  k := btrim(regexp_replace(k, ' (ehf|hf|ohf|ses|slf|sf)$', ''));
  k := btrim(regexp_replace(k, '^(husfelag|husfelagid|huseigendafelag|huseigendafelagid) ', ''));
  if length(k) < 5 or k ~ '^[0-9 ]*$' then return null; end if;
  return k;
end $fn$;

-- Á hve mörgum customer_base er netfangið skráð? >1 = DEILT umboðs-netfang.
-- Telur fyrirtaeki.netfang (lifandi raðir; ótengdur staður = eigin pseudo-base
-- -id, sama regla og annars staðar) + customers_base.netfang/contact_email.
-- stable (les töflur) — kallað EINU SINNI per netfang félags í sýnunum.
create or replace function public.bh_addr_n_bases(p_addr text)
returns int language plpgsql stable parallel safe as $fn$
declare a text; n int;
begin
  a := lower(btrim(coalesce(p_addr, '')));
  if length(a) <= 4 then return 0; end if;
  select count(distinct x.bid) into n
  from (
    select coalesce(f.customer_base_id, -f.id) as bid
      from public.fyrirtaeki f
     where f.deleted_at is null and lower(btrim(f.netfang)) = a
    union
    select b.id from public.customers_base b where lower(btrim(b.netfang)) = a
    union
    select b.id from public.customers_base b where lower(btrim(b.contact_email)) = a
  ) x;
  return n;
end $fn$;

-- Vísar svo bh_addr_n_bases sé vísa-uppfletting en ekki seq-skann
-- (skiptir máli þegar felag_samskipti er lesin ósíuð, t.d. í rúllum).
create index if not exists fyrirtaeki_netfang_lower_idx
  on public.fyrirtaeki (lower(btrim(netfang))) where deleted_at is null;
create index if not exists customers_base_netfang_lower_idx
  on public.customers_base (lower(btrim(netfang)));
create index if not exists customers_base_contact_email_lower_idx
  on public.customers_base (lower(btrim(contact_email)));


-- ── 1) fyrirtaeki_samskipti — deilt netfang fær aldrei single/addr ───
-- Dálkalistinn er ÓBREYTTUR (12 dálkar, sama röð). Breytingarnar:
--   * a.shared  = bh_addr_n_bases(netfang) > 1, reiknað per netfang;
--   * sib fær lone-site NAFN-lykil (bh_base_key) þegar félagið á einn stað,
--     svo „Aegina" í texta sanni bygginguna hans (deilt+einn staður);
--   * hay/mm keyra líka fyrir einn-staðar félag þegar netfangið er deilt;
--   * v: 'single' og 'addr' AÐEINS þegar netfangið er EKKI deilt.
create or replace view public.fyrirtaeki_samskipti as
select
  f.id                              as fyrirtaeki_id,
  f.nafn                            as fyrirtaeki_nafn,
  e.email_id                        as email_id,
  e.sender_name,
  e.sender_email,
  e.subject,
  e.snippet,
  e.is_question,
  e.received_at,
  e.sender_email ilike '%eldklar%'  as fra_okkur,
  f.customer_base_id,
  e.via
from public.fyrirtaeki f
-- (a) staðir félagsins + sönnunar-lyklar þeirra — reiknað EINU SINNI per f.
-- Einn-staðar félag fær AUK heimilisfangs-lykla nafn-lykil staðarins
-- (bh_base_key á nafn staðarins/félagsins) merktan á staðinn.
cross join lateral (
  select agg.n_sites,
         case when agg.n_sites = 1 and public.bh_base_key(agg.lone_nafn) is not null
              then agg.sitekeys || (agg.lone_site::text || '|' || public.bh_base_key(agg.lone_nafn))
              else agg.sitekeys end as sitekeys
  from (
    select count(distinct s.id)::int as n_sites,
           min(s.id)                 as lone_site,
           min(s.nafn)               as lone_nafn,
           coalesce(array_agg(distinct (s.id::text || '|' || k.sk))
                    filter (where k.sk is not null), '{}'::text[]) as sitekeys
    from public.fyrirtaeki s
    left join lateral unnest(public.bh_site_keys(s.nafn, s.heimilisfang)) as k(sk) on true
    where s.deleted_at is null
      and case when f.customer_base_id is not null
               then s.customer_base_id = f.customer_base_id
               else s.id = f.id end
  ) agg
) sib
-- (b) póstur félagsins + úrskurður um hvort HANN eigi heima á ÞESSUM stað
cross join lateral (
  select distinct on (d.id)
         d.id as email_id, d.sender_name, d.sender_email, d.subject,
         d.snippet, d.is_question, d.received_at, v.via
  -- netföng félagsins: talning eigenda INNAN félags + er netfangið DEILT
  -- milli félaga (umboðs-netfang)?
  from (
    select g.addr, g.n_owners, g.lone_owner,
           public.bh_addr_n_bases(g.addr) > 1 as shared
    from (
      select lower(btrim(s2.netfang)) as addr,
             count(*)::int            as n_owners,
             min(s2.id)               as lone_owner
      from public.fyrirtaeki s2
      where s2.deleted_at is null
        and s2.netfang is not null and length(btrim(s2.netfang)) > 4
        and case when f.customer_base_id is not null
                 then s2.customer_base_id = f.customer_base_id
                 else s2.id = f.id end
      group by 1
    ) g
  ) a
  -- EITT netfang í einu → báðar greinar geta notað vísana sína
  cross join lateral (
      select ed.id, ed.sender_name, ed.sender_email, ed.subject, ed.snippet,
             ed.is_question, ed.received_at
        from public.email_digest ed
       where lower(ed.sender_email) = a.addr
      union
      select ed.id, ed.sender_name, ed.sender_email, ed.subject, ed.snippet,
             ed.is_question, ed.received_at
        from public.email_digest ed
       where ed.to_addresses ilike '%' || a.addr || '%'
  ) d
  -- leitartexti aðeins þegar sönnunar þarf: fjölstaða-félag EÐA deilt netfang
  cross join lateral (
    select case when sib.n_sites <= 1 and not a.shared then ''
                else public.bh_mail_hay(d.subject, d.snippet,
                       (select ed2.body_preview from public.email_digest ed2 where ed2.id = d.id))
           end as hay
    offset 0
  ) h
  -- hvaða staðir félagsins eru nefndir í póstinum?
  cross join lateral (
    select array_agg(distinct split_part(kk, '|', 1)) as hits
    from unnest(sib.sitekeys) kk
    where (sib.n_sites > 1 or a.shared)
      and public.bh_key_hit(h.hay, split_part(kk, '|', 2))
  ) mm
  -- Stigveldi (sterkasta sönnun fyrst). DEILT netfang sannar aldrei neitt
  -- eitt og sér → 'single'/'addr' krefjast ódeilds netfangs.
  cross join lateral (
    select case
      when sib.n_sites <= 1 and not a.shared then 'single'::text
      when array_length(mm.hits, 1) = 1
        then case when mm.hits[1] = f.id::text then 'evidence'::text else null end
      when a.n_owners = 1 and a.lone_owner = f.id and not a.shared then 'addr'::text
      else null                                    -- óvíst → aðeins félagið
    end as via
  ) v
  where v.via is not null
  order by d.id, case v.via when 'single' then 0 when 'evidence' then 1 else 2 end
) e
where f.deleted_at is null;

comment on view public.fyrirtaeki_samskipti is
  'Póstur tengdur STAÐ (fyrirtaeki) — aðeins með sönnun: eini staðurinn, '
  'eigið netfang staðarins, eða nafn/gata+húsnúmer hans nefnt í póstinum og '
  'enginn annar staður félagsins. DEILT umboðs-netfang (skráð á >1 base, t.d. '
  'gjaldkeri@eignaumsjon.is, dimka@heimaleiga.is) sannar aldrei stað — þar '
  'gildir aðeins innihalds-sönnun. via = single|addr|evidence.';


-- ── 2) felag_samskipti — deilt netfang telst á félag aðeins með sönnun ─
-- Dálkalistinn er ÓBREYTTUR (14 dálkar, sama röð). Viðbót: röð um DEILT
-- netfang birtist AÐEINS þegar (i) staður félagsins er nefndur (eitt eða
-- fleiri hit) eða (ii) aðgreinandi nafn félagsins sjálfs (bh_base_key á
-- b.nafn) stendur í póstinum. Annars fer pósturinn í umbods_postholf.
create or replace view public.felag_samskipti as
select
  b.id                              as customer_base_id,
  b.nafn                            as felag_nafn,
  b.rekstrarfelag,
  e.email_id,
  e.sender_name,
  e.sender_email,
  e.subject,
  e.snippet,
  e.is_question,
  e.received_at,
  e.sender_email ilike '%eldklar%'  as fra_okkur,
  e.fyrirtaeki_id,
  (select s.nafn from public.fyrirtaeki s where s.id = e.fyrirtaeki_id) as fyrirtaeki_nafn,
  e.via
from public.customers_base b
cross join lateral (
  select agg.n_sites, agg.lone_site,
         case when agg.n_sites = 1 and public.bh_base_key(agg.lone_nafn) is not null
              then agg.sitekeys || (agg.lone_site::text || '|' || public.bh_base_key(agg.lone_nafn))
              else agg.sitekeys end as sitekeys,
         public.bh_base_key(b.nafn) as bkey
  from (
    select count(distinct s.id)::int as n_sites,
           min(s.id)                 as lone_site,
           min(s.nafn)               as lone_nafn,
           coalesce(array_agg(distinct (s.id::text || '|' || k.sk))
                    filter (where k.sk is not null), '{}'::text[]) as sitekeys
    from public.fyrirtaeki s
    left join lateral unnest(public.bh_site_keys(s.nafn, s.heimilisfang)) as k(sk) on true
    where s.deleted_at is null and s.customer_base_id = b.id
  ) agg
) sib
cross join lateral (
  select distinct on (d.id)
         d.id as email_id, d.sender_name, d.sender_email, d.subject,
         d.snippet, d.is_question, d.received_at, v.fyrirtaeki_id, v.via
  from (
    select g.addr, g.n_owners, g.lone_owner,
           public.bh_addr_n_bases(g.addr) > 1 as shared
    from (
      select lower(btrim(s2.netfang)) as addr,
             count(*)::int            as n_owners,
             min(s2.id)               as lone_owner
      from public.fyrirtaeki s2
      where s2.deleted_at is null and s2.customer_base_id = b.id
        and s2.netfang is not null and length(btrim(s2.netfang)) > 4
      group by 1
    ) g
  ) a
  cross join lateral (
      select ed.id, ed.sender_name, ed.sender_email, ed.subject, ed.snippet,
             ed.is_question, ed.received_at
        from public.email_digest ed
       where lower(ed.sender_email) = a.addr
      union
      select ed.id, ed.sender_name, ed.sender_email, ed.subject, ed.snippet,
             ed.is_question, ed.received_at
        from public.email_digest ed
       where ed.to_addresses ilike '%' || a.addr || '%'
  ) d
  cross join lateral (
    select case when sib.n_sites <= 1 and not a.shared then ''
                else public.bh_mail_hay(d.subject, d.snippet,
                       (select ed2.body_preview from public.email_digest ed2 where ed2.id = d.id))
           end as hay
    offset 0
  ) h
  cross join lateral (
    select array_agg(distinct split_part(kk, '|', 1)) as hits
    from unnest(sib.sitekeys) kk
    where (sib.n_sites > 1 or a.shared)
      and public.bh_key_hit(h.hay, split_part(kk, '|', 2))
  ) mm
  -- sama stigveldi og að ofan; staður er EKKI skilyrði fyrir röð, en um DEILT
  -- netfang krefst röðin sönnunar (staðar-hit eða nafn félagsins)
  cross join lateral (
    select
      case
        when sib.n_sites <= 1 and not a.shared then sib.lone_site
        when array_length(mm.hits, 1) = 1      then mm.hits[1]::bigint
        when a.n_owners = 1 and not a.shared   then a.lone_owner
        else null
      end as fyrirtaeki_id,
      case
        when sib.n_sites <= 1 and not a.shared then 'single'::text
        when array_length(mm.hits, 1) = 1      then 'evidence'::text
        when a.n_owners = 1 and not a.shared   then 'addr'::text
        else 'felag'::text
      end as via
  ) v
  where (not a.shared)
     or mm.hits is not null
     or public.bh_key_hit(h.hay, sib.bkey)
  order by d.id, case v.via when 'single' then 0 when 'evidence' then 1
                            when 'addr' then 2 else 3 end
) e;

comment on view public.felag_samskipti is
  'Allur póstur félagsins (customers_base) á einum stað — rúllan sem HQ-spjaldið '
  'birtir. fyrirtaeki_id er fyllt ÞEGAR staður er sannaður, annars null (via=felag). '
  'Um DEILT umboðs-netfang (skráð á >1 base) birtist póstur AÐEINS með sönnun: '
  'staður félagsins eða aðgreinandi nafn þess (bh_base_key) nefnt í póstinum; '
  'ósannaður umboðs-póstur er í umbods_postholf.';


-- ── 3) umbods_postholf — umboðs-póstur sem sannast á ekkert félag ────
-- Endurskoðunar-sýn (ekki á heitu UI-leiðinni): póstur um deild netföng sem
-- ENGINN lykill (staðar-lyklar né félags-nöfn þeirra sem deila netfanginu)
-- grípur. Þessi póstur birtist hvorki í fyrirtaeki_samskipti né
-- felag_samskipti — hann er samt áfram í email_digest/Verkborði.
-- Við útgáfu: 179 gjaldkeri@eignaumsjon.is + 1 dimka@heimaleiga.is o.fl.
create or replace view public.umbods_postholf as
with deilt as materialized (
  select x.addr
  from (
    select lower(btrim(f.netfang)) as addr, coalesce(f.customer_base_id, -f.id) as bid
      from public.fyrirtaeki f
     where f.deleted_at is null and f.netfang is not null
    union
    select lower(btrim(b.netfang)), b.id
      from public.customers_base b where b.netfang is not null
    union
    select lower(btrim(b.contact_email)), b.id
      from public.customers_base b where b.contact_email is not null
  ) x
  where length(x.addr) > 4
  group by x.addr
  having count(distinct x.bid) > 1
),
lyklar as materialized (
  select lower(btrim(f.netfang)) as addr, k.sk
  from public.fyrirtaeki f
  join deilt d on d.addr = lower(btrim(f.netfang))
  cross join lateral unnest(public.bh_site_keys(f.nafn, f.heimilisfang)) as k(sk)
  where f.deleted_at is null
  union
  select lower(btrim(f.netfang)), public.bh_base_key(coalesce(b.nafn, f.nafn))
  from public.fyrirtaeki f
  left join public.customers_base b on b.id = f.customer_base_id
  join deilt d on d.addr = lower(btrim(f.netfang))
  where f.deleted_at is null
    and public.bh_base_key(coalesce(b.nafn, f.nafn)) is not null
),
postar as materialized (
  select d.addr, ed.id, ed.sender_name, ed.sender_email, ed.subject, ed.snippet,
         ed.is_question, ed.received_at,
         public.bh_mail_hay(ed.subject, ed.snippet, ed.body_preview) as h
  from deilt d
  join public.email_digest ed
    on lower(ed.sender_email) = d.addr
    or ed.to_addresses ilike '%' || d.addr || '%'
)
select p.addr        as umbods_netfang,
       p.id          as email_id,
       p.sender_name,
       p.sender_email,
       p.subject,
       p.snippet,
       p.is_question,
       p.received_at
from postar p
where not exists (
  select 1 from lyklar k
  where k.addr = p.addr and public.bh_key_hit(p.h, k.sk)
);

comment on view public.umbods_postholf is
  'Umboðs-pósthólfið: póstur um DEILD netföng (skráð á >1 customer_base — '
  'gjaldkeri@eignaumsjon.is, dimka@heimaleiga.is …) sem engin innihalds-sönnun '
  'tengir við neitt félag. Endurskoðunar-sýn; pósturinn er áfram í email_digest.';


-- ── 4) refresh_crm_cache — sama regla í talningunni ──────────────────
-- Óbreytt fyrir ódeild netföng (þ.m.t. fanout INNAN sama base, t.d. Pizzan —
-- þar er pósturinn hjá réttum kúnna þótt hann teljist á fleiri en einum stað
-- hans; það er vísvitandi látið standa svo póstur „hverfi" ekki úr talningu).
-- Fyrir DEILT netfang telur staður aðeins póst sem innihalds-sönnun tengir
-- við NÁKVÆMLEGA hann (sama exactly-one-innan-base regla og sýnin).
-- Undirskrift, SECURITY DEFINER og crm_cache-dálkar óbreyttir; cron-verkið
-- 'crm-cache-refresh' kallar þetta áfram óbreytt.
create or replace function public.refresh_crm_cache()
returns integer
language plpgsql
security definer
as $function$
declare n int;
begin
  create temp table _pairs on commit drop as
  select e.id eid, e.received_at, e.subject, e.sender_name, e.is_question,
         lower(e.sender_email) like '%eldklar%' as fra_okkur,
         addr.a as addr
  from email_digest e
  cross join lateral (
    select lower(e.sender_email) a
    union
    select lower(m.match[1])
    from regexp_matches(coalesce(e.to_addresses,''), '([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+)', 'g') m(match)
  ) addr
  where addr.a is not null and length(addr.a) > 4;
  create index on _pairs(addr, received_at desc);

  -- deild umboðs-netföng: skráð á >1 customer_base (sama skilgreining og
  -- bh_addr_n_bases / sýnirnar)
  create temp table _shared on commit drop as
  select x.addr
  from (
    select lower(btrim(f.netfang)) as addr, coalesce(f.customer_base_id, -f.id) as bid
      from fyrirtaeki f where f.deleted_at is null and f.netfang is not null
    union
    select lower(btrim(b.netfang)), b.id from customers_base b where b.netfang is not null
    union
    select lower(btrim(b.contact_email)), b.id from customers_base b where b.contact_email is not null
  ) x
  where length(x.addr) > 4
  group by x.addr having count(distinct x.bid) > 1;

  -- sönnunar-lyklar staða á deildum netföngum: staðar-lyklar + nafn-lykill
  -- staðarins þegar hann er eini staður síns base (sama og sýnirnar)
  create temp table _skeys on commit drop as
  select f.id as fid, coalesce(f.customer_base_id, -f.id) as bid,
         lower(btrim(f.netfang)) as addr, k.sk
  from fyrirtaeki f
  join _shared s on s.addr = lower(btrim(f.netfang))
  cross join lateral unnest(public.bh_site_keys(f.nafn, f.heimilisfang)) as k(sk)
  where f.deleted_at is null
  union
  select f.id, coalesce(f.customer_base_id, -f.id),
         lower(btrim(f.netfang)), public.bh_base_key(f.nafn)
  from fyrirtaeki f
  join _shared s on s.addr = lower(btrim(f.netfang))
  where f.deleted_at is null
    and public.bh_base_key(f.nafn) is not null
    and (f.customer_base_id is null
         or (select count(*) from fyrirtaeki f2
              where f2.customer_base_id = f.customer_base_id
                and f2.deleted_at is null) = 1);

  -- eignaðir póstar: ódeilt netfang → allt á netfangið (fid=null, eins og
  -- áður); deilt netfang → aðeins póstur sem nefnir nákvæmlega EINN stað
  -- base-sins (fid = sá staður)
  create temp table _att on commit drop as
  select p.addr, null::bigint as fid, p.eid, p.received_at, p.subject,
         p.sender_name, p.is_question, p.fra_okkur
  from _pairs p
  where not exists (select 1 from _shared s where s.addr = p.addr)
  union all
  select q.addr, hb.fid, q.eid, q.received_at, q.subject,
         q.sender_name, q.is_question, q.fra_okkur
  from (
    select distinct p.addr, p.eid, p.received_at, p.subject, p.sender_name,
           p.is_question, p.fra_okkur,
           public.bh_mail_hay(e.subject, e.snippet, e.body_preview) as h
    from _pairs p
    join _shared s on s.addr = p.addr
    join email_digest e on e.id = p.eid
  ) q
  cross join lateral (
    select w.bid, min(w.fid) as fid
    from (select distinct k.fid, k.bid from _skeys k
           where k.addr = q.addr and public.bh_key_hit(q.h, k.sk)) w
    group by w.bid
    having count(distinct w.fid) = 1
  ) hb;
  create index on _att(addr, fid, received_at desc);

  delete from crm_cache;
  insert into crm_cache (fyrirtaeki_id, nafn, netfang, tengilidur, simi, banner_note, athugasemdir_stubbur,
                         sidasti_postur, sidasta_efni, sidasti_fra_okkur, sidasti_sendandi, osvarad, postar_alls, refreshed_at)
  select f.id, f.nafn, f.netfang, f."tengiliður", coalesce(f.farsimi,f.simi), f.banner_note, left(f.athugasemdir,500),
         ls.received_at, ls.subject, ls.fra_okkur, ls.sender_name,
         coalesce(osv.n,0), coalesce(tot.n,0), now()
  from fyrirtaeki f
  left join lateral (
    select p.received_at, p.subject, p.fra_okkur, p.sender_name
    from _att p
    where p.addr = lower(trim(f.netfang)) and (p.fid is null or p.fid = f.id)
    order by p.received_at desc limit 1
  ) ls on true
  left join lateral (
    select count(*) n from _att p
    where p.addr = lower(trim(f.netfang)) and (p.fid is null or p.fid = f.id)
      and p.is_question and not p.fra_okkur
      and p.received_at > coalesce((select max(p2.received_at) from _att p2
                                    where p2.addr = lower(trim(f.netfang))
                                      and (p2.fid is null or p2.fid = f.id)
                                      and p2.fra_okkur),'1970-01-01'::timestamptz)
  ) osv on true
  left join lateral (
    select count(distinct p.eid) n from _att p
    where p.addr = lower(trim(f.netfang)) and (p.fid is null or p.fid = f.id)
  ) tot on true
  where f.er_i_thjonustu = true and f.deleted_at is null;
  get diagnostics n = row_count;
  return n;
end $function$;


-- ── Réttindi ─────────────────────────────────────────────────────────
grant select on public.fyrirtaeki_samskipti to anon, authenticated;
grant select on public.felag_samskipti      to anon, authenticated;
grant select on public.umbods_postholf      to anon, authenticated;
grant execute on function public.bh_base_key(text)      to anon, authenticated;
grant execute on function public.bh_addr_n_bases(text)  to anon, authenticated;

commit;

-- =====================================================================
-- SANNPRÓFUN eftir keyrslu (tölur mældar 2026-07-30 — nýr póstur eftir
-- þann dag hliðrar þeim; mynstur á að halda)
-- =====================================================================
-- -- 1. Aegina (base 784, eini staðurinn 797) fær EKKI lengur alla dimka-
-- --    póstana með via:'single' — aðeins þá 3 sem nefna Aegina/Grensásveg:
-- select count(*) from fyrirtaeki_samskipti where fyrirtaeki_id = 797;
--        → 3   (var 67)
-- select count(*) from felag_samskipti where customer_base_id = 784;
--        → 3   (var 67)
--
-- -- 2. Heimaleiga (base 293) heldur nær öllu — 'heimaleiga' nafn-lykillinn
-- --    grípur undirskriftirnar; aðeins 1 póstur án nokkurrar sönnunar dettur
-- --    í umboðs-pósthólfið:
-- select count(*) from felag_samskipti where customer_base_id = 293;
--        → 66  (var 67)
-- -- ... og staðar-tengingar Heimaleiga-húsanna standa ÓBREYTTAR frá
-- -- morgun-migrationinu (innihalds-sönnunin ræður áfram):
-- select count(*) from fyrirtaeki_samskipti where fyrirtaeki_id = 1621;  → 10 (óbreytt, Dalbrekka)
-- select count(*) from fyrirtaeki_samskipti where fyrirtaeki_id = 1488;  → 4  (óbreytt, Hamraborg)
--
-- -- 3. Einn-netfangs viðmiðunarkúnni ÓBREYTTUR (Hópbílar, site 303,
-- --    gudjonarnason@hopbilar.is skráð á nákvæmlega eitt base):
-- select count(*) from fyrirtaeki_samskipti where fyrirtaeki_id = 303;   → 20 (óbreytt)
--
-- -- 4. crm_cache: keyra endurhleðsluna og eins-159-suðið er horfið —
-- --    hvert Eignaumsjónar-húsfélag telur aðeins póst sem nefnir SITT hús:
-- select refresh_crm_cache();
-- select fyrirtaeki_id, nafn, osvarad, postar_alls
--   from crm_cache where netfang = 'gjaldkeri@eignaumsjon.is' order by 1;
--        239  Hverfisgata 40-44        0    0    (var 159 / 184)
--        244  Sjómannafélag Íslands    3    3    (var 159 / 184)
--        390  Austurberg 20            0    0    (var 159 / 184)
--        648  Miðleiti 8,10 og 12      0    0    (var 159 / 184)
--        733  Húsfélag Skaftahlíð 4-10 1    2    (var 159 / 184)
--        1368 Húsfélagið Álftamýri 36  0    0    (var 159 / 184)
-- -- ... og viðmiðunarkúnninn stendur í stað:
-- select osvarad, postar_alls from crm_cache where fyrirtaeki_id = 303;
--        → 13 / 20 (óbreytt m.v. 2026-07-30)
--
-- -- 5. Umboðs-pósthólfið tekur við ósannaða umboðs-póstinum:
-- select umbods_netfang, count(*) from umbods_postholf group by 1 order by 2 desc;
--        gjaldkeri@eignaumsjon.is → 179
--        dimka@heimaleiga.is      → 1
--        (+ smærri: dora@grimma.is o.fl.)
--
-- -- 6. Sami póstur lendir áfram ALDREI á tveimur húsum sama félags:
-- select email_id, count(*) from fyrirtaeki_samskipti
--  where customer_base_id = 293 group by 1 having count(*) > 1;   → 0 raðir
--
-- -- 7. Hraði: enn tugir ms og Bitmap Index Scan á báðum greinum
-- --    (email_digest_sender_lower_idx + email_digest_to_addresses_trgm_idx):
-- explain (analyze) select * from fyrirtaeki_samskipti
--  where fyrirtaeki_id = 1621 order by received_at desc limit 6;
-- explain (analyze) select * from fyrirtaeki_samskipti
--  where fyrirtaeki_id = 303 order by received_at desc limit 6;
-- =====================================================================
