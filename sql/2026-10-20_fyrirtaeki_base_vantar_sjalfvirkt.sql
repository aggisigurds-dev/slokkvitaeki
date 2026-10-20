-- 20.10.2026 — félag stofnað án kennitölu fær sjálfkrafa grunnröð 'VANTAR-<id>' (migration fyrirtaeki_base_vantar_sjalfvirkt, beitt á osfdzskyvisifcwyjkuk)
-- Tilefni: fyrirtaeki 1879 („suðurbraut 26, 220 Hafnarfjörður", einstaklingur, engin kt) var stofnað í þjónustu án customer_base_id →
-- document_pairs (lyklað á customer_base_id) gat ekki parað skýrslu/reikning og tools/audit-customer-base.cjs féll (A).
-- Stofnleiðirnar eru tíu (tools/audit-stofnleidir.cjs) og aðeins sex setja base_id sjálfar — gagnagrunnurinn á að sjá um það óháð leið.
-- Venjan sem fyrir var: customers_base.kennitala = 'VANTAR-<id félags>' (1637, 1638, 1641 …). Aðeins INSERT; kennitala bætt við síðar er mannleg
-- ákvörðun (sameina/færa grunn) og audit-customer-base kallar á hana (C). Lagfæring 1879: customers_base 1223 ('VANTAR-1879').
-- Prófað í færslu sem var rúlluð til baka: án kt → base 'VANTAR-<id>'; með kt → eins og áður.
CREATE OR REPLACE FUNCTION public.fyrirtaeki_autolink_base()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ktd text;
  bid int;
BEGIN
  IF NEW.customer_base_id IS NULL THEN
    ktd := regexp_replace(coalesce(NEW.kennitala, ''), '\D', '', 'g');
    IF length(ktd) = 10 THEN
      -- Finna núverandi canonical base fyrir þetta kt (lægsta id = canonical)
      SELECT id INTO bid FROM customers_base
        WHERE regexp_replace(coalesce(kennitala,''), '\D', '', 'g') = ktd
        ORDER BY id LIMIT 1;
      IF bid IS NULL THEN
        INSERT INTO customers_base (nafn, kennitala)
          VALUES (COALESCE(NULLIF(btrim(NEW.nafn),''), 'kt ' || NEW.kennitala), NEW.kennitala)
          RETURNING id INTO bid;
      END IF;
      NEW.customer_base_id := bid;
    ELSIF TG_OP = 'INSERT' THEN
      -- engin (gild) kennitala: grunnröð með staðgengli 'VANTAR-<id>' svo félagið sé aldrei án grunns
      INSERT INTO customers_base (nafn, kennitala, simi, netfang, heimilisfang)
        VALUES (COALESCE(NULLIF(btrim(NEW.nafn),''), 'Óskráð félag ' || NEW.id), 'VANTAR-' || NEW.id, NEW.simi, NEW.netfang, NEW.heimilisfang)
        RETURNING id INTO bid;
      NEW.customer_base_id := bid;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
