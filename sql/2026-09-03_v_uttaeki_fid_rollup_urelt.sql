-- ═══════════════════════════════════════════════════════════════════════════
-- v_uttaeki_fid_rollup: síðasta eintak status='active'-villunnar — í gagnagrunninum
-- ═══════════════════════════════════════════════════════════════════════════
-- STAÐA: KEYRT 03.09.2026 (Supabase migration v_uttaeki_fid_rollup_urelt).
--
-- 01.09.2026 voru 22 kóðastaðir lagaðir sem síuðu tæki á status='active' einu
-- (uttaeki.status ber fjögur gildi: active · urelt · „Í lagi" · ok; í notkun =
-- allt nema urelt). Gæðayfirferð 03.09.2026 fann að þetta view — sem
-- Rekstrarfélög (175) OG kúnnavefurinn (gatt.js, _gatt-eq.cjs) telja tæki úr —
-- síaði ENN á 'active' server-megin. Mælt áður en lagað var:
--
--     tæki 'active' með fyrirtaeki_id      5100
--     tæki í notkun (≠ urelt)              5328   → 228 vantalin
--     fyrirtæki með ranga tölu               17   → 14 þeirra sýndust ALVEG tóm
--
-- Dálkar og röð ÓBREYTT (create or replace view krefst þess). Eina breytingin
-- er WHERE-skilyrðið. Vörðurinn tools/audit-status-gildi.cjs mælir nú summu
-- view-sins gegn beinni talningu og fellur ef þær stemma ekki.
--
-- ATH: v_uttaeki_client_rollup (nafna-lyklað, legacy) hefur ENGA stöðusíu og
-- telur urelt tæki MEÐ — annars konar villa, ómæld, skráð í gæðaskýrslu.

create or replace view public.v_uttaeki_fid_rollup as
 SELECT fyrirtaeki_id,
    count(*)::integer AS units,
    count(*) FILTER (WHERE type ~* '(l[eé]ttv|abf|fro[dð])' OR type ~* '(duft|abc|pfc)' OR type ~* '(co2|co₂|kols[yý]r)')::integer AS slt,
    count(*) FILTER (WHERE type ~* '(brunaslang|brunasl[öo]ng|hose)')::integer AS bsl,
    count(*) FILTER (WHERE type ~* '(reykskynj|smoke)')::integer AS rs,
    count(*) FILTER (WHERE type IS NULL OR NOT (type ~* '(l[eé]ttv|abf|fro[dð])' OR type ~* '(duft|abc|pfc)' OR type ~* '(co2|co₂|kols[yý]r)' OR type ~* '(brunaslang|brunasl[öo]ng|hose)' OR type ~* '(reykskynj|smoke)'))::integer AS other_units
   FROM uttaeki
  WHERE fyrirtaeki_id IS NOT NULL AND status IS DISTINCT FROM 'urelt'
  GROUP BY fyrirtaeki_id;
