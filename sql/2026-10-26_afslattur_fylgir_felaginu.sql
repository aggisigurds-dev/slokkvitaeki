-- AFSLÁTTURINN BÝR HJÁ FÉLAGINU, EKKI Á STAÐNUM.   BEITT 26.10.2026
-- (migration `afslattur_fylgir_felaginu`; vörður tools/audit-afslattur-hopur.cjs)
--
-- Agnar: „sami afslátturinn á að koma sjálfvirkt á alla í sama félagi í 100asta sinn".
--
-- `fyrirtaeki.afslattur_pct` er lesinn af SEX leiðum (pos.js lookupKt · 114 POS-spjaldið ·
-- 129 CtcDiscount.companyPct → 165 reikningurinn · 142 söluritillinn · 03 Breyta-glugginn ·
-- discount-engine) og hver þeirra les EINA röð. Staður sem gleymdist að merkja fór því út á
-- fullu verði þótt félagið væri með samning, og reikningurinn leit eðlilega út — bara hærri.
--
-- MÆLT 26.10.2026: 8 félög af 24 fjölstaða-félögum báru misjafnan afslátt — 19 staðir á 0 %
-- þótt systurstaður bæri samningsprósentu. Steypustöðin (25 % skv. undirrituðum þjónustu-
-- samningi 06.05.2021) hafði Hólabrú, Íshellu og Selfoss á 0 %; Heimaleiga 9 staði af 10.
-- Kostnaður sem sást: R-001132 (Selfoss 12.10.2026) fór út án afsláttar — 15.448 kr. án vsk,
-- og R-000157/158 (Malarhöfða) á 16,1 % í stað 25 %.
--
-- Að laga raðirnar einar dugar ekki: næsti nýi staður endurtekur villuna. Reglan er því sett
-- í gagnagrunninn þar sem allar sex leiðirnar sjá hana:
--   1) nýr staður ERFIR afslátt félagsins,
--   2) breyting á einum stað DREIFIST á alla staði félagsins.
-- Undantekning fyrir eina heimsókn stendur óbreytt: handvirka %-gildið í ferðinni
-- (129 CtcDiscount.effectivePct → ts.discount_pct) trompar og snertir ekki skráninguna.
--
-- PRÓFAÐ 26.10.2026 í transaction sem var rúllað til baka: nýr staður settur inn með 0 %
-- undir félagi 720 fékk 25 %; `update fyrirtaeki set afslattur_pct = 10 where id = 622`
-- skilaði öllum 10 stöðum félagsins á 10 % og engum utan þess. Eftir rollback: 9 staðir,
-- eitt gildi, 25 %.

-- ── 1. Leiðrétting á því sem þegar er skakkt ────────────────────────────────
update fyrirtaeki f
   set afslattur_pct = h.haesti
  from (select customer_base_id b, max(coalesce(afslattur_pct, 0)) haesti
          from fyrirtaeki
         where deleted_at is null and customer_base_id is not null
         group by 1
        having count(distinct coalesce(afslattur_pct, 0)) > 1) h
 where f.customer_base_id = h.b
   and f.deleted_at is null
   and coalesce(f.afslattur_pct, 0) is distinct from h.haesti;

-- ── 2. Nýr staður erfir afslátt félagsins ───────────────────────────────────
create or replace function fyrirtaeki_afslattur_erfa() returns trigger
language plpgsql as $$
declare hopur numeric;
begin
  if NEW.customer_base_id is not null and coalesce(NEW.afslattur_pct, 0) = 0 then
    select max(coalesce(afslattur_pct, 0)) into hopur
      from fyrirtaeki
     where customer_base_id = NEW.customer_base_id and deleted_at is null;
    if coalesce(hopur, 0) > 0 then NEW.afslattur_pct := hopur; end if;
  end if;
  return NEW;
end $$;

drop trigger if exists fyrirtaeki_afslattur_erfa on fyrirtaeki;
create trigger fyrirtaeki_afslattur_erfa
  before insert on fyrirtaeki
  for each row execute function fyrirtaeki_afslattur_erfa();

-- ── 3. Breyting á einum stað dreifist á félagið ─────────────────────────────
create or replace function fyrirtaeki_afslattur_dreifa() returns trigger
language plpgsql as $$
begin
  -- pg_trigger_depth stöðvar keðjuna: UPDATE-ið hér að neðan vekur þennan sama
  -- trigger á systkinunum og án hennar yrði þetta óendanleg lykkja.
  if pg_trigger_depth() > 1 or NEW.customer_base_id is null then return null; end if;
  update fyrirtaeki
     set afslattur_pct = NEW.afslattur_pct
   where customer_base_id = NEW.customer_base_id
     and deleted_at is null
     and id <> NEW.id
     and coalesce(afslattur_pct, 0) is distinct from coalesce(NEW.afslattur_pct, 0);
  return null;
end $$;

drop trigger if exists fyrirtaeki_afslattur_dreifa on fyrirtaeki;
create trigger fyrirtaeki_afslattur_dreifa
  after update of afslattur_pct on fyrirtaeki
  for each row
  when (coalesce(OLD.afslattur_pct, 0) is distinct from coalesce(NEW.afslattur_pct, 0))
  execute function fyrirtaeki_afslattur_dreifa();

-- STAÐFESTING (á að skila 0 röðum):
--   select customer_base_id from fyrirtaeki
--    where deleted_at is null and customer_base_id is not null
--    group by 1 having count(*) > 1 and count(distinct coalesce(afslattur_pct, 0)) > 1;
