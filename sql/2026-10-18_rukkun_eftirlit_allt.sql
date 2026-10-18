-- 2026-10-18 (Agnar: „Fæ þetta bara alltaf. Fullt gamallt bull. Veit ekki hvað er nýtt"):
-- rukkun_eftirlit() skilar aðeins 8 óröðuðum dæmum per gátlista, svo pósturinn gat hvorki sagt hvaða atriði væru ný
-- né hver hefðu verið leyst. rukkun_eftirlit_allt() er SAMA fyrirspurn án 8-þaksins (1000) og er notuð af
-- payday-sync-cron.cjs til að bera saman við síðasta póst (app_kv.rukkun_eftirlit_sidast).
-- Gamla fallið stendur óbreytt. Nýja fallið er aðeins lesandi og aðeins service_role má kalla á það (ber nöfn og upphæðir).
CREATE OR REPLACE FUNCTION public.rukkun_eftirlit_allt()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
WITH
doc_nr AS (
  SELECT invoice_number, count(DISTINCT customer_base_id) AS felog,
         string_agg(DISTINCT customer_name, ' | ') AS kunnar
  FROM customer_documents
  WHERE doc_type='reikningur' AND invoice_number IS NOT NULL
  GROUP BY invoice_number HAVING count(DISTINCT customer_base_id) > 1),
tvinotud AS (
  SELECT num, count(*) AS n FROM solur GROUP BY num HAVING count(*) > 1),
rekki AS (
  SELECT num, customer_nafn, samtals, status FROM solur
  WHERE krafa_sent_at IS NOT NULL AND coalesce(status,'') <> 'final'),
vgr AS (
  SELECT num, customer_nafn, samtals FROM solur
  WHERE status = 'void' AND paid_at IS NOT NULL),
tvitok AS (
  SELECT a.customer_nafn, a.num AS num_a, b.num AS num_b, a.samtals
  FROM solur a JOIN solur b
    ON a.customer_kt = b.customer_kt AND a.linur::text = b.linur::text
   AND a.samtals = b.samtals AND a.id < b.id
  WHERE a.customer_kt <> '999999-9999'
    AND NOT coalesce(a.is_credit,false) AND NOT coalesce(b.is_credit,false)
    AND a.status = 'final' AND b.status = 'final'),
netflaus AS (
  SELECT s.num, s.customer_nafn, s.samtals FROM solur s
  WHERE s.krafa_sent_at IS NOT NULL AND s.customer_base_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM fyrirtaeki f
      WHERE f.customer_base_id = s.customer_base_id AND coalesce(f.netfang,'') <> '')),
gsg AS (
  SELECT num, customer_nafn, samtals, (now()::date - created_at::date) AS dagar
  FROM solur
  WHERE greitt_med = 'greitt_sidar' AND paid_at IS NULL
    AND coalesce(status,'') NOT IN ('void')
    AND created_at < now() - interval '14 days'),
sef AS (
  SELECT DISTINCT ON (pv.verk)
         pv.verk, coalesce(s.num, '—') AS sala,
         coalesce(s.status, 'ENGIN SALA') AS status, s.samtals
  FROM (
    SELECT split_part(v.num, '-V', 1) AS verk
    FROM verkbeidnir v
    WHERE v.status = 'collected'
    GROUP BY 1) pv
  LEFT JOIN solur s ON s.num = pv.verk
  WHERE s.id IS NULL OR coalesce(s.status,'') <> 'final'
  ORDER BY pv.verk, s.id)
SELECT jsonb_build_object(
  'doc_nr_a_fleiri_felog', jsonb_build_object(
    'alls', (SELECT count(*) FROM doc_nr),
    'daemi', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (SELECT * FROM doc_nr LIMIT 1000) x)),
  'tvinotud_num', jsonb_build_object(
    'alls', (SELECT count(*) FROM tvinotud),
    'daemi', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (SELECT * FROM tvinotud LIMIT 1000) x)),
  'rukkad_ekki_final', jsonb_build_object(
    'alls', (SELECT count(*) FROM rekki),
    'daemi', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (SELECT * FROM rekki LIMIT 1000) x)),
  'void_greitt', jsonb_build_object(
    'alls', (SELECT count(*) FROM vgr),
    'daemi', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (SELECT * FROM vgr LIMIT 1000) x)),
  'byte_eins_tvitok', jsonb_build_object(
    'alls', (SELECT count(*) FROM tvitok),
    'daemi', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (SELECT * FROM tvitok LIMIT 1000) x)),
  'rukkad_an_kt', (SELECT count(*) FROM solur WHERE krafa_sent_at IS NOT NULL AND customer_base_id IS NULL),
  'rukkad_an_netfangs', jsonb_build_object(
    'alls', (SELECT count(*) FROM netflaus),
    'daemi', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (SELECT * FROM netflaus LIMIT 1000) x)),
  'felog_an_afhendingar', (SELECT count(*) FROM fyrirtaeki WHERE coalesce(er_i_thjonustu,false) AND payday_delivery IS NULL),
  'greitt_sidar_gamalt', jsonb_build_object(
    'alls', (SELECT count(*) FROM gsg),
    'daemi', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (SELECT * FROM gsg ORDER BY dagar DESC LIMIT 1000) x)),
  'sott_ekki_final', jsonb_build_object(
    'alls', (SELECT count(*) FROM sef),
    'daemi', (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (SELECT * FROM sef LIMIT 1000) x))
);
$function$;

REVOKE ALL ON FUNCTION public.rukkun_eftirlit_allt() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rukkun_eftirlit_allt() TO service_role;
