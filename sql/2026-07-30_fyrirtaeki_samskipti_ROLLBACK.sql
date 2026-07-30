-- AFTURKÖLLUN fyrir 2026-07-30_fyrirtaeki_samskipti_evidence.sql
--
-- Þetta er skilgreining `fyrirtaeki_samskipti` EINS OG HÚN VAR áður en
-- sönnunar-útgáfan var sett inn (sótt með pg_get_viewdef 2026-07-30).
-- Keyrðu þetta ef nýja sýnin veldur vandræðum.
--
-- ATH: gamla útgáfan tengir póst við byggingu EINGÖNGU á `fyrirtaeki.netfang`.
-- Það er einmitt gallinn sem var verið að laga: rekstrarfélag deilir einu
-- netfangi milli allra bygginga (allar 10 Heimaleigu-byggingarnar bera
-- `dimka@heimaleiga.is`), svo HVER bygging skilar sömu 67 póstunum. Að fara
-- til baka endurvekur þá lén-útbreiðslu.
--
-- `felag_samskipti` var ekki til fyrir migration-ið; til að hreinsa alveg:
--   drop view if exists public.felag_samskipti;

create or replace view public.fyrirtaeki_samskipti as
 SELECT f.id AS fyrirtaeki_id,
    f.nafn AS fyrirtaeki_nafn,
    e.id AS email_id,
    e.sender_name,
    e.sender_email,
    e.subject,
    e.snippet,
    e.is_question,
    e.received_at,
    e.sender_email ~~* '%eldklar%'::text AS fra_okkur
   FROM fyrirtaeki f
     JOIN LATERAL ( SELECT ed.id,
            ed.sender_name,
            ed.sender_email,
            ed.subject,
            ed.snippet,
            ed.is_question,
            ed.received_at
           FROM email_digest ed
          WHERE lower(ed.sender_email) = lower(btrim(f.netfang))
        UNION
         SELECT ed.id,
            ed.sender_name,
            ed.sender_email,
            ed.subject,
            ed.snippet,
            ed.is_question,
            ed.received_at
           FROM email_digest ed
          WHERE ed.to_addresses ~~* (('%'::text || btrim(f.netfang)) || '%'::text)) e ON true
  WHERE f.deleted_at IS NULL AND f.netfang IS NOT NULL AND length(btrim(f.netfang)) > 4;

grant select on public.fyrirtaeki_samskipti to anon, authenticated;
