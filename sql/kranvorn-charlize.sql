-- =====================================================================
-- CHARLIZE-VÖRÐUR — þrenging á uppskerunni inn í biðstofuna (26.11.2026)
-- BEITT Á GRUNNINN 26.11.2026 (migration: charlize_inbox_vorn).
-- Þessi skrá er heimildin: hún er samhljóða því sem er í loftinu.
-- Systir kranvorn.sql — sama hugsun, önnur tafla (charlize_inbox).
-- =====================================================================
-- MÆLT ÁÐUR EN ÞETTA VAR SMÍÐAÐ (26.11.2026):
--   Biðstofan (charlize_inbox, status='pending') var komin í 376 — 360
--   þeirra frá `postur`-uppskerunni, öll 'unverified', öll síðustu 9 daga
--   (~40 á dag). Nákvæmlega sú endurvöxtur sem 07.11-lotan spáði: hún
--   grisjaði röðina 869 -> 1 í fimm umferðum og hún var komin aftur í 376
--   á 19 dögum. Framleiðandinn (harvest.py, agent='postur') er EKKI Í
--   ÞESSU REPÓI — hann keyrir á annarri vél, eins og `ai-uppfaerslur`.
--   ÞVÍ ER VÖRNIN Í GRUNNINUM: BEFORE INSERT-kveikja hittir hvern sem
--   skrifar í töfluna, óháð vél.
--
-- HVAÐ ER EKKI ÞEKKING (07.11-reglan, mæld á innihaldinu 26.11):
--   „Lýsir setningin ástandi sem getur breyst á morgun? Þá er hún
--    verkefni, ekki þekking." Tvennt er BYGGINGARLEGA ekki þekking og
--   má hafna við inntak án þess að lesa póstinn:
--     R1  source_path like 'veidin:%'  — afleiddur veiðilisti sem
--         endurreiknast daglega úr lifandi sýn; fast afrit úreldist strax.
--     R2  topic = 'loford'             — loforð/ólokið mál. Það á heima
--         á Þjónustuborðinu og í póstinum, EKKI í fasta þekkingargrunninum.
--         Vörðurinn snertir hvorki borðið né póstinn — hann heldur aðeins
--         verkefnum út úr þekkingunni.
--
-- AF HVERJU EKKI ORÐALAGSREGLA: mælt 26.11 að regex á atburðaorð
--   ( „var send", „var greidd", „staðfesti að" … ) felldi 23 raðir, en
--   a.m.k. 3 þeirra báru VARANLEGA staðreynd (reikningsnetfang félags) í
--   annarri setningu þótt fyrsta setningin lýsti atburði.
--   Merkingarskipting atburðar vs. staðreyndar innan reikninga/þjónustu/
--   vandamála er dómur uppskerunnar (eða manns), ALDREI regex hér.
--   Vörðurinn er því aðeins byggingarlegur (source_path + topic) og misfar
--   ekki — eins og kranvorn á þjónustuborðinu.
--
-- ENGU ER EYTT OG ENGU HAFNAÐ ÞEGJANDI: höfnuð röð stendur áfram í
--   töflunni með status='rejected' og review_note sem segir hvers vegna,
--   svo hægt sé að endurskoða hana. Ekkert `raise exception`.
--
-- AFTURKRÆFT: `select public.charlize_vorn_af()` slekkur (dregur kveikjuna
--   niður); `select public.charlize_vorn_a()` kveikir aftur.
--
-- PRÓFAÐ ENDA Á MILLI á raungrunni 26.11.2026: prufuröð með source_path
--   'veidin:test' og prufuröð með topic='loford' lentu báðar á 'rejected'
--   með nótu; prufuröð með topic='tengilidir' (varanleg staðreynd) hélst
--   'pending'. Prufuraðir hreinsaðar á eftir.
-- =====================================================================

-- Kveikjufallið -------------------------------------------------------
create or replace function public.charlize_inbox_vorn()
returns trigger
language plpgsql
as $$
declare
  astaeda text := null;
begin
  -- Aðeins ný framboð eru skoðuð. Raðir sem eru settar inn með öðru
  -- status (t.d. 'approved' þegar appið afritar) sleppa ósnertar.
  if NEW.status is not null and NEW.status <> 'pending' then
    return NEW;
  end if;

  -- R1: afleiddur veiðilisti
  if NEW.source_path like 'veidin:%' then
    astaeda := 'afleitt efni (veiðilisti sem endurreiknast daglega úr lifandi sýn)';
  -- R2: loforð/ólokið mál = verkefni, ekki þekking
  elsif NEW.topic = 'loford' then
    astaeda := 'loforð/ólokið mál er verkefni, ekki þekking — á heima á borði og í pósti, ekki í fasta grunninum';
  end if;

  if astaeda is not null then
    NEW.status := 'rejected';
    NEW.review_note := coalesce(NEW.review_note, '')
      || ' — Hafnað sjálfkrafa ' || to_char(now() at time zone 'Atlantic/Reykjavik', 'DD.MM.YYYY')
      || ' (Charlize-vörður): ' || astaeda
      || '. Afturkræft: select public.charlize_vorn_af().';
  end if;

  return NEW;
end;
$$;

-- Kveikjan sjálf ------------------------------------------------------
drop trigger if exists trg_charlize_inbox_vorn on public.charlize_inbox;
create trigger trg_charlize_inbox_vorn
  before insert on public.charlize_inbox
  for each row execute function public.charlize_inbox_vorn();

-- Af/á — afturkræft ---------------------------------------------------
create or replace function public.charlize_vorn_af()
returns text language plpgsql as $$
begin
  drop trigger if exists trg_charlize_inbox_vorn on public.charlize_inbox;
  return 'Charlize-vörður SLÖKKTUR';
end;
$$;

create or replace function public.charlize_vorn_a()
returns text language plpgsql as $$
begin
  drop trigger if exists trg_charlize_inbox_vorn on public.charlize_inbox;
  create trigger trg_charlize_inbox_vorn
    before insert on public.charlize_inbox
    for each row execute function public.charlize_inbox_vorn();
  return 'Charlize-vörður KVEIKTUR';
end;
$$;
