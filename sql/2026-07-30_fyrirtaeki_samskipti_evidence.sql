-- =====================================================================
-- 2026-07-30  fyrirtaeki_samskipti — LÉNS-ÚTBREIÐSLA LÖGUÐ
-- =====================================================================
-- EKKI KEYRT SJÁLFKRAFA. Yfirfara → keyra handvirkt.
--
-- VANDINN
-- -------
-- Gamla sýnin tengdi póst við BYGGINGU eingöngu á `fyrirtaeki.netfang`:
--
--     where lower(ed.sender_email) = lower(btrim(f.netfang))
--        or ed.to_addresses ilike '%'||btrim(f.netfang)||'%'
--
-- Rekstrarfélag deilir EINU netfangi á öllum stöðum sínum. Öll 10 lifandi
-- Heimaleiga-húsin bera `dimka@heimaleiga.is`, svo hvert einasta þeirra fékk
-- NÁKVÆMLEGA SÖMU 67 póstana (sannreynt: fyrirtaeki_id 1485/1487/1488/1621 →
-- 67 raðir hvert). Þess vegna sást „Skýrsla fyrir Hamraborg 7" á Freyjugötu 16
-- og „Dalbrekka 4-6 fire extinguishers update" hvergi frekar en annars staðar.
-- Netfangið eitt og sér getur EKKI valið byggingu.
--
-- LAUSNIN — sama regla og `_spine.resolveSite` í Brunahólf-hubbinu:
-- tengjum aldrei við stað nema með SÖNNUN, annars aðeins við FÉLAGIÐ.
--
--   1. 'single'   — félagið á aðeins EINN lifandi stað  → allur póstur þangað
--                   (óbreytt hegðun fyrir ~1200 venjulega kúnna).
--   2. 'addr'     — pósturinn barst á netfang sem NÁKVÆMLEGA EINN staður
--                   félagsins ber → sá staður (t.d. Center Hótel - Þverholt 14
--                   sem á sitt eigið netfang).
--   3. 'evidence' — aðgreinandi HEITI staðarins eða GATA+HÚSNÚMER hans birtist
--                   í subject/snippet/body_preview og NÁKVÆMLEGA EINN staður
--                   félagsins passar → sá staður.
--   4. annars     — ENGIN stað-tenging. Pósturinn lifir aðeins á félags-
--                   stiginu (`felag_samskipti`), aldrei giskað á byggingu.
--
-- Þrep 3 er vísvitandi strangt: nefni póstur TVÖ hús (löng svarkeðja) telst
-- það óvíst og fer á félagið. Mælt á Heimaleiga: 38 af 67 póstum fá stað,
-- 29 sitja á félaginu (15 nefna ekkert hús, 14 nefna fleiri en eitt).
--
-- HRAÐI
-- -----
-- Sýnin er ÁFRAM keyrð frá `fyrirtaeki f` og lénsfyrirspurnin er ÁFRAM
-- UNION af tveimur greinum með EITT netfang í einu, svo báðar geta notað
-- vísana sína:
--     lower(sender_email) = <addr>            → email_digest_sender_lower_idx
--     to_addresses ilike '%'||<addr>||'%'     → email_digest_to_addresses_trgm_idx (GIN)
-- Sönnunar-leitin (leiðandi jokertákn í subject/snippet/body) keyrir EKKI á
-- allri töflunni — hún keyrir aðeins á póstunum sem félags-lykkjan skilaði
-- (tugir raða), og lyklar staðanna eru reiknaðir EINU SINNI per félag.
--
-- Mælt (EXPLAIN ANALYZE, heit skyndiminni, versta tilfelli = Heimaleiga,
-- 67 pósta safn × 11 staðir), `where fyrirtaeki_id=1621 order by received_at
-- desc limit 6`:
--     gamla sýnin :   6,5 ms  (67 kandídatar — sömu 67 og á hverju hinna húsanna)
--     nýja sýnin  :  44,5 ms  (10 raðir, allar um Dalbrekku), planning 2,7 ms
-- Vísa-skönnunin helst óbreytt í plani (Bitmap Index Scan á báðum greinum).
-- Venjulegur einn-staðar kúnni fer stystu leið ('single') og borgar aðeins
-- eina litla samantekt til viðbótar.
--
-- BREYTINGAR Á VIÐMÓTI
-- --------------------
-- `fyrirtaeki_samskipti` heldur ÖLLUM sínum dálkum í sömu röð (patch 286
-- `fetchData` og patch 287 `expand` lesa hana óbreytt) og fær tvo NÝJA dálka
-- aftast: `customer_base_id` og `via`. Ný sýn `felag_samskipti` er félags-
-- rúllan svo HQ-spjaldið sýni áfram ALLT.
-- =====================================================================

begin;

-- ── Hjálparföll ──────────────────────────────────────────────────────
-- Vísvitandi plpgsql (ekki sql): plpgsql-föll eru EKKI innfelld af
-- áætlanasmiðnum, svo sýnar-skilgreiningin helst lítil og planning-tíminn
-- lágur (inline-útgáfan af sömu rökum kostaði 73 ms í planning, þessi 2,7 ms).

-- Fellir íslensku úr texta: lágstafir, broddar/sérstafir → ascii,
-- allt annað en [a-z0-9] verður eitt bil. „Bríetartún 9-11" → „brietartun 9 11".
create or replace function public.bh_fold(p_t text)
returns text language plpgsql immutable parallel safe as $fn$
begin
  return btrim(regexp_replace(
    replace(replace(replace(
      translate(lower(coalesce(p_t, '')),
        'áàâäãåéèêëíìîïóòôöõúùûüýÿðñçø',
        'aaaaaaeeeeiiiiooooouuuuyydnco'),
      'þ', 'th'), 'æ', 'ae'), 'ß', 'ss'),
    '[^a-z0-9]+', ' ', 'g'));
end $fn$;

-- Laus heimilisfangs-lykill: gata + FYRSTA húsnúmer (hliðstæða
-- `_spine.addrKeyLoose`). „Dalbrekka 4-6, 200 Kópavogur" → „dalbrekka 4".
-- „Bríetartún 9 og 11" → „brietartun 9". Ekkert húsnúmer → null.
create or replace function public.bh_addr_key(p_t text)
returns text language plpgsql immutable parallel safe as $fn$
declare s text; m text[];
begin
  s := public.bh_fold(split_part(coalesce(p_t, ''), ',', 1));
  if s = '' then return null; end if;
  m := regexp_match(s, '^([a-z]+(?: [a-z]+)*) +([0-9]+)');
  if m is null then return null; end if;
  if length(m[1]) < 4 then return null; end if;   -- of stutt til að vera gata
  return m[1] || ' ' || m[2];
end $fn$;

-- Aðgreinandi hluti staðarnafns skv. nafnavenjunni „Rekstrarfélag - Sérkenni"
-- (STAÐREYNDIR / _spine): „Heimaleiga - Dalbrekka 4-6" → „Dalbrekka 4-6".
-- Nafn ÁN „ - " sem endar á ehf/hf er höfuðstöðin sjálf, ekki útibú → null.
create or replace function public.bh_dist_name(p_nafn text)
returns text language plpgsql immutable parallel safe as $fn$
declare d text;
begin
  d := coalesce(p_nafn, '');
  if position(' - ' in d) > 0 then
    d := substr(d, position(' - ' in d) + 3);
  elsif public.bh_fold(d) ~ ' (ehf|hf|ses|slf)$' then
    return null;
  end if;
  d := btrim(d);
  if d = '' then return null; end if;
  return d;
end $fn$;

-- Sönnunar-lyklar staðar: gata+númer úr aðgreinandi nafni og/eða heimilisfangi,
-- annars aðgreinandi nafnið sjálft sem frasi („midtown hotel").
create or replace function public.bh_site_keys(p_nafn text, p_heimilisfang text)
returns text[] language plpgsql immutable parallel safe as $fn$
declare d text; k text; out_keys text[] := '{}';
begin
  d := public.bh_dist_name(p_nafn);
  if d is not null then
    k := public.bh_addr_key(d);
    if k is not null then
      out_keys := out_keys || k;
    else
      k := public.bh_fold(d);
      -- frasa-lykill aðeins þegar hann er nógu sérkennandi
      if length(k) >= 5 and k !~ '^(ehf|hf|husfelag|husfelagid) ?' then
        out_keys := out_keys || k;
      end if;
    end if;
  end if;
  k := public.bh_addr_key(p_heimilisfang);
  if k is not null and not (k = any(out_keys)) then out_keys := out_keys || k; end if;
  return out_keys;
end $fn$;

-- Leitartexti pósts (fellt). body_preview klippt í 1500 stafi — nóg fyrir
-- heimilisfang í kveðju/undirskrift án þess að afþjappa heilu bréfin.
create or replace function public.bh_mail_hay(p_subject text, p_snippet text, p_body text)
returns text language plpgsql immutable parallel safe as $fn$
begin
  return public.bh_fold(
    coalesce(p_subject, '') || ' ' || coalesce(p_snippet, '') || ' ' ||
    left(coalesce(p_body, ''), 1500));
end $fn$;

-- Lykill finnst í texta á orðamörkum. Mörkin skipta máli: „laugavegur 1" má
-- EKKI passa við „Laugavegur 18". Lyklar innihalda aðeins [a-z0-9 ] (úr
-- bh_fold) svo ekkert regex-tákn sleppur í gegn.
create or replace function public.bh_key_hit(p_hay text, p_key text)
returns boolean language plpgsql immutable parallel safe as $fn$
begin
  if p_hay is null or p_key is null or p_key = '' then return false; end if;
  return p_hay ~ ('(^|[^a-z0-9])' || p_key || '([^0-9]|$)');
end $fn$;


-- ── 1) fyrirtaeki_samskipti — póstur á STAÐ, aðeins með sönnun ───────
-- NB dálkaröðin fremst er ÓBREYTT frá gömlu sýninni (create or replace
-- leyfir aðeins viðbætur aftast); `customer_base_id` + `via` bætast við.
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
-- (a) staðir félagsins + sönnunar-lyklar þeirra — reiknað EINU SINNI per f
cross join lateral (
  select
    count(distinct s.id)::int as n_sites,
    coalesce(array_agg(distinct (s.id::text || '|' || k.sk))
             filter (where k.sk is not null), '{}'::text[]) as sitekeys
  from public.fyrirtaeki s
  left join lateral unnest(public.bh_site_keys(s.nafn, s.heimilisfang)) as k(sk) on true
  where s.deleted_at is null
    and case when f.customer_base_id is not null
             then s.customer_base_id = f.customer_base_id
             else s.id = f.id end
) sib
-- (b) póstur félagsins + úrskurður um hvort HANN eigi heima á ÞESSUM stað
cross join lateral (
  select distinct on (d.id)
         d.id as email_id, d.sender_name, d.sender_email, d.subject,
         d.snippet, d.is_question, d.received_at, v.via
  -- netföng félagsins, með talningu á hve margir staðir bera hvert
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
  -- leitartexti reiknaður aðeins þegar sönnunar þarf (offset 0 = ekki flatt út,
  -- svo body_preview er hvorki sótt né afþjappað fyrir einn-staðar félög)
  cross join lateral (
    select case when sib.n_sites <= 1 then ''
                else public.bh_mail_hay(d.subject, d.snippet,
                       (select ed2.body_preview from public.email_digest ed2 where ed2.id = d.id))
           end as hay
    offset 0
  ) h
  -- hvaða staðir félagsins eru nefndir í póstinum?
  cross join lateral (
    select array_agg(distinct split_part(kk, '|', 1)) as hits
    from unnest(sib.sitekeys) kk
    where sib.n_sites > 1
      and public.bh_key_hit(h.hay, split_part(kk, '|', 2))
  ) mm
  -- Stigveldi (sterkasta sönnun fyrst). Innihald pósts gengur FRAMAR netfangi:
  -- „Skýrsla fyrir Hamraborg 7" sem sendist á netfang Þverholts fjallar um
  -- Hamraborg. Þannig getur sami póstur heldur aldrei lent á tveimur stöðum.
  cross join lateral (
    select case
      when sib.n_sites <= 1 then 'single'::text
      when array_length(mm.hits, 1) = 1
        then case when mm.hits[1] = f.id::text then 'evidence'::text else null end
      when a.n_owners = 1 and a.lone_owner = f.id then 'addr'::text
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
  'enginn annar staður félagsins. Aldrei giskað (sbr. _spine.resolveSite). '
  'Óviss póstur birtist í felag_samskipti. Dálkurinn via = single|addr|evidence.';


-- ── 2) felag_samskipti — félags-rúlla (HQ-spjaldið sýnir ALLT) ───────
-- Sama lógík en keyrð frá customers_base svo `?customer_base_id=eq.N` nái
-- vísa-uppflettingu. (Vísvitandi ekki byggð ofan á sýnina að ofan: þá gæti
-- síunin ekki ýtst niður og hvert kall reiknaði allan gagnagrunninn.)
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
  select
    count(distinct s.id)::int as n_sites,
    min(s.id)                 as lone_site,
    coalesce(array_agg(distinct (s.id::text || '|' || k.sk))
             filter (where k.sk is not null), '{}'::text[]) as sitekeys
  from public.fyrirtaeki s
  left join lateral unnest(public.bh_site_keys(s.nafn, s.heimilisfang)) as k(sk) on true
  where s.deleted_at is null and s.customer_base_id = b.id
) sib
cross join lateral (
  select distinct on (d.id)
         d.id as email_id, d.sender_name, d.sender_email, d.subject,
         d.snippet, d.is_question, d.received_at, v.fyrirtaeki_id, v.via
  from (
    select lower(btrim(s2.netfang)) as addr,
           count(*)::int            as n_owners,
           min(s2.id)               as lone_owner
    from public.fyrirtaeki s2
    where s2.deleted_at is null and s2.customer_base_id = b.id
      and s2.netfang is not null and length(btrim(s2.netfang)) > 4
    group by 1
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
    select case when sib.n_sites <= 1 then ''
                else public.bh_mail_hay(d.subject, d.snippet,
                       (select ed2.body_preview from public.email_digest ed2 where ed2.id = d.id))
           end as hay
    offset 0
  ) h
  cross join lateral (
    select array_agg(distinct split_part(kk, '|', 1)) as hits
    from unnest(sib.sitekeys) kk
    where sib.n_sites > 1
      and public.bh_key_hit(h.hay, split_part(kk, '|', 2))
  ) mm
  -- sama stigveldi og að ofan, en hér er staðurinn EKKI skilyrði (rúllan
  -- birtir allan póstinn; fyrirtaeki_id er einfaldlega null þegar óvíst er)
  cross join lateral (
    select
      case
        when sib.n_sites <= 1             then sib.lone_site
        when array_length(mm.hits, 1) = 1 then mm.hits[1]::bigint
        when a.n_owners = 1               then a.lone_owner
        else null
      end as fyrirtaeki_id,
      case
        when sib.n_sites <= 1             then 'single'::text
        when array_length(mm.hits, 1) = 1 then 'evidence'::text
        when a.n_owners = 1               then 'addr'::text
        else 'felag'::text
      end as via
  ) v
  order by d.id, case v.via when 'single' then 0 when 'evidence' then 1
                            when 'addr' then 2 else 3 end
) e;

comment on view public.felag_samskipti is
  'Allur póstur félagsins (customers_base) á einum stað — rúllan sem HQ-spjaldið '
  'birtir. fyrirtaeki_id er fyllt ÞEGAR staður er sannaður, annars null (via=felag).';

grant select on public.fyrirtaeki_samskipti to anon, authenticated;
grant select on public.felag_samskipti      to anon, authenticated;
grant execute on function public.bh_fold(text)                       to anon, authenticated;
grant execute on function public.bh_addr_key(text)                   to anon, authenticated;
grant execute on function public.bh_dist_name(text)                  to anon, authenticated;
grant execute on function public.bh_site_keys(text, text)            to anon, authenticated;
grant execute on function public.bh_mail_hay(text, text, text)       to anon, authenticated;
grant execute on function public.bh_key_hit(text, text)              to anon, authenticated;

commit;

-- =====================================================================
-- SANNPRÓFUN eftir keyrslu (á að skila því sem stendur til hægri)
-- =====================================================================
-- -- Dalbrekka fær SÍNA pósta (var 0 sýnilegir, þótt titillinn nefni hana):
-- select subject from fyrirtaeki_samskipti
--  where fyrirtaeki_id = 1621 order by received_at desc limit 5;
--        → „…Dalbrekka 4-6 fire extinguishers update"
--
-- -- Hamraborgar-pósturinn er EKKI lengur á Freyjugötu 16:
-- select count(*) from fyrirtaeki_samskipti
--  where fyrirtaeki_id = 1485 and subject ilike '%Hamraborg%';   → 0
--
-- -- Engin bygging fær lengur allan lénspóstinn (var 67 á HVERRI):
-- select fyrirtaeki_id, count(*) from fyrirtaeki_samskipti
--  where fyrirtaeki_id in (1485,1487,1488,1621) group by 1 order by 1;
--        1485 Freyjugata 16 → engin röð (enginn póstur nefnir Freyjugötu —
--                             hann sést á félaginu, ekki giskað á hús)
--        1487 Bríetartún    → 5
--        1488 Hamraborg 7   → 6
--        1621 Dalbrekka 4-6 → 10
--
-- -- Sami póstur má ALDREI lenda á tveimur húsum sama félags:
-- select email_id, count(*) from fyrirtaeki_samskipti
--  where customer_base_id = 293 group by 1 having count(*) > 1;   → 0 raðir
--
-- -- Félagið sér áfram ALLT:
-- select count(*) from felag_samskipti where customer_base_id = 293;   → 67
--
-- -- Hraði (á að vera tugir ms, ekki sekúndur — og enn Bitmap Index Scan
-- --  á email_digest_sender_lower_idx + email_digest_to_addresses_trgm_idx):
-- explain (analyze) select * from fyrirtaeki_samskipti
--  where fyrirtaeki_id = 1621 order by received_at desc limit 6;
-- =====================================================================
