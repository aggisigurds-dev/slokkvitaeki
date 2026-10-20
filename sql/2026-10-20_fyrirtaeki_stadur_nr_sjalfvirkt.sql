-- 20.10.2026 (Agnar: ProLan Suðurhella 5, „ekki vesen að bæta við auka staðsetningu"). Keyrt sem migration
-- `fyrirtaeki_stadur_nr_sjalfvirkt` á osfdzskyvisifcwyjkuk.
--
-- Nýr staður á kennitölu sem er þegar til fær næsta staðarnúmer (hæsta + 1, líka af eyddum röðum því einkvæma vísitalan
-- fyrirtaeki_kt_stadur_nr_uniq nær yfir þær). Fyrsti staður á kt fær EKKERT númer. Gildi sem sett er með ásetningi er aldrei
-- yfirskrifað. Villa í þessu falli má aldrei fella innsetningu. Gildir fyrir ALLAR leiðir (gluggi í Ársskoðun, 175, innflutningur,
-- gömul útgáfa í vafra) — áður fékk staðurinn ekkert númer ef vafrinn var enn á eldri skrá (ProLan - Suðurhella 5, fyrirtæki 1875).
--
-- Prófað 20.10 í DO-blokk sem var afturkölluð (RAISE): þriðji staður → 3, handvirkt 9 → 9, ný kt → NULL, engar leifar.
CREATE OR REPLACE FUNCTION public.fyrirtaeki_stadur_nr_sjalfvirkt()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE kd text; mx int; fjoldi int;
BEGIN
  IF NEW.stadur_nr IS NOT NULL THEN RETURN NEW; END IF;
  kd := regexp_replace(coalesce(NEW.kennitala, ''), '\D', '', 'g');
  IF length(kd) <> 10 THEN RETURN NEW; END IF;
  SELECT count(*), coalesce(max(f.stadur_nr), 0) INTO fjoldi, mx
  FROM public.fyrirtaeki f
  WHERE regexp_replace(coalesce(f.kennitala, ''), '\D', '', 'g') = kd;
  IF fjoldi > 0 THEN NEW.stadur_nr := mx + 1; END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stadur_nr_sjalfvirkt ON public.fyrirtaeki;
CREATE TRIGGER trg_stadur_nr_sjalfvirkt BEFORE INSERT ON public.fyrirtaeki
  FOR EACH ROW EXECUTE FUNCTION public.fyrirtaeki_stadur_nr_sjalfvirkt();
