-- v_thjonustu_tolur taldi MJÚK-EYDD félög — 08.09.2026
--
-- Hausinn á Ársskoðun les þetta view („N fyrirtæki · M í árlegri
-- slökkvitækjaskoðun", js/patches/153-arsskodun.js ~1575). Hann sagði 682 meðan
-- dálkurinn `er_i_thjonustu = true` bar 649 og listinn undir hausnum 670.
-- Þrjár tölur, þrjú svör — nákvæmlega það sem Agnar rekst endalaust á.
--
-- ORSÖKIN: grunn-CTE-ið `i_thj` síaði AÐEINS á `er_i_thjonustu` og sleppti
-- `deleted_at IS NULL`. Þrjátíu og þrjú mjúk-eydd félög báru flaggið enn og
-- voru talin — 18 þeirra eru sameiningar-leifar sem eiga lifandi tvíbura
-- (Bláa lónið ×2, Vélrás vr-5 ×2, Aðaskoðun Grjótháls, Colas/Álfhella,
-- Eignarhaldsfélagið Gerðuberg …). Sextán þeirra bera skráðan mánuð og lentu
-- því líka í „Eftir 2026" — vinnulisti ársins var ofmetinn um 16 dauð félög.
--
-- BREYTINGIN er EIN LÍNA: `AND fyrirtaeki.deleted_at IS NULL`. Allt annað er
-- orðrétt eins og `pg_get_viewdef` skilaði því fyrir keyrslu — viewið var lesið
-- fyrst, ekki endursmíðað eftir útkomunni.
--
-- MÆLT fyrir og eftir:
--   allar_i_thjonustu  682 → 649
--   fjoldi             615 → 599
--   i_arsskodun        592 → 576
--   eftir_2026         252 → 236
--   buid_2026          340 → 340 (óbreytt — engin eydd röð átti 2026-skýrslu)
--   buid_2026_pct       57 → 59
--
-- EFTIR STENDUR (ákvörðun Agnars, ekki kóða): borðið sýnir 670 af því að
-- 21 félag kemst þangað inn án flaggsins — 17 þeirra eiga AÐEINS lifandi tæki
-- úr fjöldainnflutningnum 03.06.2026 (Hótel Atlantic apartments 32 tæki,
-- Hlíðablóm 16, Eskihlíð 12 …). Annaðhvort eiga þau flaggið eða tækin eru rusl.
-- Þegar það er ákveðið verða haus og listi sama talan.

CREATE OR REPLACE VIEW public.v_thjonustu_tolur AS
 WITH i_thj AS (
         SELECT fyrirtaeki.id
           FROM fyrirtaeki
          WHERE fyrirtaeki.er_i_thjonustu
            AND fyrirtaeki.deleted_at IS NULL          -- ← eina breytingin
        ), skyrsla AS (
         SELECT DISTINCT arsskodun_report_facts.fyrirtaeki_id,
            arsskodun_report_facts.report_year
           FROM arsskodun_report_facts
          WHERE arsskodun_report_facts.fyrirtaeki_id IS NOT NULL
        ), manudur AS (
         SELECT DISTINCT arsskodun_report_facts.fyrirtaeki_id
           FROM arsskodun_report_facts
          WHERE arsskodun_report_facts.inspect_month IS NOT NULL
        ), b AS (
         SELECT count(*) FILTER (WHERE (EXISTS ( SELECT 1
                   FROM skyrsla s
                  WHERE s.fyrirtaeki_id = t.id AND s.report_year >= 2023 AND s.report_year <= 2026))) AS fjoldi,
            count(*) FILTER (WHERE (EXISTS ( SELECT 1
                   FROM manudur m
                  WHERE m.fyrirtaeki_id = t.id))) AS i_arsskodun,
            count(*) FILTER (WHERE (EXISTS ( SELECT 1
                   FROM manudur m
                  WHERE m.fyrirtaeki_id = t.id)) AND (EXISTS ( SELECT 1
                   FROM skyrsla s
                  WHERE s.fyrirtaeki_id = t.id AND s.report_year = 2026))) AS buid_2026,
            count(*) FILTER (WHERE (EXISTS ( SELECT 1
                   FROM manudur m
                  WHERE m.fyrirtaeki_id = t.id)) AND NOT (EXISTS ( SELECT 1
                   FROM skyrsla s
                  WHERE s.fyrirtaeki_id = t.id AND s.report_year = 2026))) AS eftir_2026,
            count(*) AS allar_i_thjonustu,
            count(*) FILTER (WHERE (EXISTS ( SELECT 1
                   FROM skyrsla s
                  WHERE s.fyrirtaeki_id = t.id AND s.report_year >= 2023 AND s.report_year <= 2026)) AND NOT (EXISTS ( SELECT 1
                   FROM manudur m
                  WHERE m.fyrirtaeki_id = t.id))) AS skyrsla_en_enginn_manudur,
            count(*) FILTER (WHERE NOT (EXISTS ( SELECT 1
                   FROM skyrsla s
                  WHERE s.fyrirtaeki_id = t.id AND s.report_year >= 2023 AND s.report_year <= 2026))) AS engin_skyrsla_2023_2026
           FROM i_thj t
        )
 SELECT fjoldi,
    i_arsskodun,
    buid_2026,
    round(100.0 * buid_2026::numeric / NULLIF(i_arsskodun, 0)::numeric, 0) AS buid_2026_pct,
    eftir_2026,
    allar_i_thjonustu,
    skyrsla_en_enginn_manudur,
    engin_skyrsla_2023_2026
   FROM b;
