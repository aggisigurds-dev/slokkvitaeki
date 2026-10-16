-- 16.10.2026 — Viðbótarnetföng félags tengja pósta í Samskipti (v_kunni_postur).
--
-- Agnar: „heimila að ég geti sett inn viðbótar tölvupósta … sem hjálpar við að tengja
-- Samskipti — tengingarnar og póstsögu". Samskipti-kortið (286) les v_kunni_postur, sem
-- tengir póst við kúnna (customers_base) eftir netföngunum í v_kunni_netfong. Þar voru
-- aðeins þrjár heimildir: fyrirtaeki.netfang, customers_base.netfang og .contact_email —
-- eitt netfang á félag. Tengiliðir sem Agnar hafði þegar tengt við kennitölu á
-- Tengiliðir-síðunni (charlize_contacts) sáust hvergi í Samskiptum. Mælt 16.10.2026:
-- Heimaleiga ehf átti 0 pósta í Samskiptum en sex starfsmenn tengda (46 póstar),
-- GTS 0 → 23, Dagar 0 → 12.
--
-- Fjórða heimildin: charlize_contacts með status 'approved' og kennitölu → customers_base
-- (kennitala er UNIQUE þar). Sama tafla og Tengiliðir-síðan og nýi „+"-takkinn á
-- netfangsreit prófílsins (473) skrifa í gegnum /api/tengilidir — ein staðreynd, einn staður.
--
-- Þrjár reglur svo viðbótin taki ALDREI tengingu af neinum:
--   1. Viðbótarnetföng tengja aðeins NÁKVÆMT netfang (via 'addr'), aldrei lén — annars gæti
--      eitt netfang á léni annars kúnna tekið lénstenginguna af honum.
--   2. Sé netfangið aðalnetfang einhvers félags ræður það (adal) — tengiliðaröð getur ekki
--      gert það „sameiginlegt" og fellt það út.
--   3. Netföng umsjónaraðila (umsjonar_len) og banka/endurskoðenda (v_thjonustulen) skrifa
--      um mörg hús; þau tengjast eftir götu í umsjonarpostur_tengsl, ekki hér — nema
--      „plús-netfang" (gjaldkeri+5401190660@eignaumsjon.is), sem á eitt hús.
-- Mælt fyrir og eftir: hver einasta röð gamla viewsins er í því nýja (sjá PR).
CREATE OR REPLACE VIEW public.v_kunni_netfong AS
 WITH okkar_kassar AS (
         SELECT DISTINCT lower(btrim(email_digest.account)) AS addr
           FROM email_digest
          WHERE email_digest.account ~~ '%@%'::text
        ), adr AS (
         SELECT fyrirtaeki.customer_base_id AS bid,
            lower(btrim(fyrirtaeki.netfang)) AS addr,
            true AS adal
           FROM fyrirtaeki
          WHERE fyrirtaeki.deleted_at IS NULL AND fyrirtaeki.customer_base_id IS NOT NULL AND fyrirtaeki.netfang IS NOT NULL AND fyrirtaeki.netfang ~~ '%@%'::text
        UNION
         SELECT customers_base.id,
            lower(btrim(customers_base.netfang)) AS lower,
            true
           FROM customers_base
          WHERE customers_base.netfang ~~ '%@%'::text
        UNION
         SELECT customers_base.id,
            lower(btrim(customers_base.contact_email)) AS lower,
            true
           FROM customers_base
          WHERE customers_base.contact_email ~~ '%@%'::text
        UNION
         SELECT cb.id,
            lower(btrim(cc.netfang)) AS lower,
            false
           FROM charlize_contacts cc
             JOIN customers_base cb ON regexp_replace(cb.kennitala, '\D'::text, ''::text, 'g'::text) = regexp_replace(cc.kennitala, '\D'::text, ''::text, 'g'::text)
          WHERE cc.kennitala IS NOT NULL AND cc.status = 'approved'::text AND cc.netfang ~~ '%@%'::text
        ), hreint AS (
         SELECT adr.bid,
            adr.addr,
            split_part(adr.addr, '@'::text, 2) AS dom,
            adr.adal
           FROM adr
          WHERE adr.addr ~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'::text AND NOT (adr.addr IN ( SELECT okkar_kassar.addr
                   FROM okkar_kassar)) AND NOT (split_part(adr.addr, '@'::text, 2) IN ( SELECT v_okkar_len.dom
                   FROM v_okkar_len))
            AND (adr.adal
                 OR split_part(adr.addr, '@'::text, 1) ~~ '%+%'::text
                 OR NOT EXISTS ( SELECT 1 FROM umsjonar_len u WHERE lower(u.len) = split_part(adr.addr, '@'::text, 2))
                    AND NOT EXISTS ( SELECT 1 FROM v_thjonustulen t WHERE t.dom = split_part(adr.addr, '@'::text, 2)))
        ), addr_val AS (
         SELECT h.bid,
            h.addr
           FROM hreint h
          WHERE h.adal OR NOT (EXISTS ( SELECT 1
                   FROM hreint h2
                  WHERE h2.addr = h.addr AND h2.adal))
        )
 SELECT addr_val.addr AS lykill,
    'addr'::text AS via,
    min(addr_val.bid) AS customer_base_id
   FROM addr_val
  GROUP BY addr_val.addr
 HAVING count(DISTINCT addr_val.bid) = 1
UNION ALL
 SELECT hreint.dom AS lykill,
    'len'::text AS via,
    min(hreint.bid) AS customer_base_id
   FROM hreint
  WHERE hreint.adal AND NOT (hreint.dom IN ( SELECT v_frilen.dom
           FROM v_frilen)) AND NOT (hreint.dom IN ( SELECT v_thjonustulen.dom
           FROM v_thjonustulen))
  GROUP BY hreint.dom
 HAVING count(DISTINCT hreint.bid) = 1;

-- ── AFTURKÖLLUN (fyrri skilgreining, tekin 16.10.2026 rétt fyrir breytingu) ──────────
-- CREATE OR REPLACE VIEW public.v_kunni_netfong AS
--  WITH okkar_kassar AS (
--          SELECT DISTINCT lower(btrim(email_digest.account)) AS addr FROM email_digest WHERE email_digest.account ~~ '%@%'::text
--         ), adr AS (
--          SELECT fyrirtaeki.customer_base_id AS bid, lower(btrim(fyrirtaeki.netfang)) AS addr FROM fyrirtaeki
--           WHERE fyrirtaeki.deleted_at IS NULL AND fyrirtaeki.customer_base_id IS NOT NULL AND fyrirtaeki.netfang IS NOT NULL AND fyrirtaeki.netfang ~~ '%@%'::text
--         UNION SELECT customers_base.id, lower(btrim(customers_base.netfang)) FROM customers_base WHERE customers_base.netfang ~~ '%@%'::text
--         UNION SELECT customers_base.id, lower(btrim(customers_base.contact_email)) FROM customers_base WHERE customers_base.contact_email ~~ '%@%'::text
--         ), hreint AS (
--          SELECT adr.bid, adr.addr, split_part(adr.addr, '@'::text, 2) AS dom FROM adr
--           WHERE adr.addr ~ '^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$'::text AND NOT (adr.addr IN (SELECT okkar_kassar.addr FROM okkar_kassar))
--             AND NOT (split_part(adr.addr, '@'::text, 2) IN (SELECT v_okkar_len.dom FROM v_okkar_len))
--         )
--  SELECT hreint.addr AS lykill, 'addr'::text AS via, min(hreint.bid) AS customer_base_id FROM hreint GROUP BY hreint.addr HAVING count(DISTINCT hreint.bid) = 1
-- UNION ALL
--  SELECT hreint.dom AS lykill, 'len'::text AS via, min(hreint.bid) AS customer_base_id FROM hreint
--   WHERE NOT (hreint.dom IN (SELECT v_frilen.dom FROM v_frilen)) AND NOT (hreint.dom IN (SELECT v_thjonustulen.dom FROM v_thjonustulen))
--   GROUP BY hreint.dom HAVING count(DISTINCT hreint.bid) = 1;
