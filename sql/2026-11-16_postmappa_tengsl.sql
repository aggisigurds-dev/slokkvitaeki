-- 2026-11-16 — Póstur úr Thunderbird-MÖPPUM inn í samskiptasögu fyrirtækja.
--
-- Agnar 16.11.2026: „Auðvitað opna á þau og reyna tengja við fyrirtæki eða staðsetningar og inn á samskiptasögu."
-- Kveikt var á 84 notendamöppum (app_kv bru_moppur_kveikt). luna-bridge les þær inn í email_digest
-- með folder = slóð möppunnar (t.d. 'Verkefni-1/Hnjúkamói 9').
-- Möppurnar heita eftir verkum og stöðum, svo mappan sjálf er sönnun um tengingu. Sendandinn
-- (verktaki, eftirlit, birgir) er oft ekki skráður á staðinn og núverandi tengingar ná honum ekki.
--
-- postmappa_tengsl: ein röð á möppu → fyrirtaeki (samskiptasaga Slökkvitækis) og/eða verkstað Brunahólfs
-- (verkstadur_info.worksite_name). Aðeins NÁKVÆM samsvörun er sett inn (gata + húsnúmer eða fullt heiti):
--   - lyklaleit bh_site_keys gaf Dalvegur 24/26/30A → „Endurvinnslan - Dalvegur" (aðeins gatan) — HAFNAÐ.
-- fyrirtaeki_samskipti_kt (lesin af 286-samskipti-panel eftir customer_base_id OG fyrirtaeki_id) fær
-- UNION ALL á möppupóst með via = 'mappa:<mappa>'. Kennitöluhlutinn er ÓBREYTTUR.

create table if not exists public.postmappa_tengsl (
  account        text not null,                 -- sami ritháttur og email_digest.account
  mappa          text not null,                 -- sama og email_digest.folder
  fyrirtaeki_id  bigint references public.fyrirtaeki(id),
  worksite_name  text,                          -- verkstadur_info.worksite_name (Brunahólf), ef til
  adferd         text not null,                 -- hvernig tengingin var fundin
  athugasemd     text,
  created_at     timestamptz not null default now(),
  primary key (account, mappa)
);
alter table public.postmappa_tengsl enable row level security;
grant select on public.postmappa_tengsl to authenticated, service_role, stjori_lesari;
comment on table public.postmappa_tengsl is
  'Thunderbird-mappa → fyrirtæki/verkstaður (16.11.2026). Aðeins nákvæm samsvörun heitis/heimilisfangs. Lesin af fyrirtaeki_samskipti_kt.';

insert into public.postmappa_tengsl (account, mappa, fyrirtaeki_id, worksite_name, adferd) values
  ('Brunaholf@brunaholf.is', 'Verkefni-1/Hnjúkamói 9',        1919, 'Hnjúkamói 9',          'heiti möppu = verkstaður (slokk_company_id 1919)'),
  ('Brunaholf@brunaholf.is', 'Verkefni-1/Stórhöfði 29',       1920, 'Stórhöfði 29',         'heiti möppu = verkstaður (slokk_company_id 1920)'),
  ('Brunaholf@brunaholf.is', 'Verkefni-1/Egilsgata 14',       1924, 'Egilsgata14',          'heiti möppu = verkstaður (slokk_company_id 1924)'),
  ('Brunaholf@brunaholf.is', 'Verkefni-1/Hvaleyrarbraut 39',  1918, 'Hvaleyrarbraut 39',    'heiti möppu = verkstaður (slokk_company_id 1918)'),
  ('Brunaholf@brunaholf.is', 'Verkefni-1/Stangarhylur 3',     1923, 'Stangarhyl 3 og 3A',   'heiti möppu = verkstaður (slokk_company_id 1923)'),
  ('Brunaholf@brunaholf.is', 'Verkefni-1/Heklureitur',        1921, null,                   'heiti möppu = fyrirtæki „Brunahólf - Heklureitur"'),
  ('Brunaholf@brunaholf.is', 'Verkefni-1/Catalína Hamraborg 11', 1845, null,                'heimilisfang möppu = fyrirtæki (Hamraborg 11)'),
  ('Brunaholf@brunaholf.is', 'Verkefni-1/Gjáhella 5',         null, 'Gjáhella 5',           'heiti möppu = verkstaður (ekkert fyrirtæki)'),
  ('Brunaholf@brunaholf.is', 'Fellaskóli',                    null, 'Fellaskóli',           'heiti möppu = verkstaður (ekkert fyrirtæki)'),
  ('Brunaholf@brunaholf.is', 'Verkefni-1/Bugðufljót 9',       null, 'Bugðufljót 9',         'heiti möppu = verkstaður (ekkert fyrirtæki)'),
  ('Brunaholf@brunaholf.is', 'Verkefni-1/Dalvegur 26',        null, 'Dalvegur 26',          'heiti möppu = verkstaður (ekkert fyrirtæki)'),
  ('Brunaholf@brunaholf.is', 'Verkefni-1/Fjallaböðin Þjórsárdal', null, 'Fjallaböðin Þjórsárdal', 'heiti möppu = verkstaður (ekkert fyrirtæki)'),
  ('Brunaholf@brunaholf.is', 'Vesturgata 22',                 null, 'Vesturgata 22',        'heiti möppu = verkstaður (ekkert fyrirtæki)')
on conflict (account, mappa) do nothing;

create index if not exists email_digest_account_folder_idx on public.email_digest (account, folder);

create or replace view public.fyrirtaeki_samskipti_kt as
 SELECT
        CASE
            WHEN ss.n = 1 THEN ss.fid
            ELSE NULL::bigint
        END AS fyrirtaeki_id,
        CASE
            WHEN ss.n = 1 THEN ss.fnafn
            ELSE cb.nafn
        END AS fyrirtaeki_nafn,
    d.id AS email_id,
    d.sender_name,
    d.sender_email,
    d.subject,
    d.snippet,
    d.is_question,
    d.received_at,
    d.sender_email ~~* '%eldklar%'::text AS fra_okkur,
    cb.id AS customer_base_id,
    'kt:'::text || (p.yfirlit ->> '_kt_leid'::text) AS via
   FROM postur_ai_yfirlit p
     JOIN email_digest d ON d.id::text = p.mail_id
     JOIN customers_base cb ON regexp_replace(cb.kennitala, '\D'::text, ''::text, 'g'::text) = (p.yfirlit ->> '_kt'::text)
     JOIN LATERAL ( SELECT count(*)::integer AS n,
            min(s.id) AS fid,
            min(s.nafn) AS fnafn
           FROM fyrirtaeki s
          WHERE s.customer_base_id = cb.id AND s.deleted_at IS NULL) ss ON ss.n >= 1
  WHERE p.yfirlit ? '_kt_tengt'::text AND lower(COALESCE(d.account, ''::text)) <> 'aggisigurds@gmail.com'::text
UNION ALL
 -- 16.11.2026: póstur úr Thunderbird-möppu sem heitir eftir staðnum (postmappa_tengsl).
 SELECT f.id::bigint AS fyrirtaeki_id,
    f.nafn AS fyrirtaeki_nafn,
    d.id AS email_id,
    d.sender_name,
    d.sender_email,
    d.subject,
    d.snippet,
    d.is_question,
    d.received_at,
    (d.sender_email ~~* '%eldklar%'::text OR d.sender_email ~~* '%@brunaholf.is'::text) AS fra_okkur,
    f.customer_base_id::bigint AS customer_base_id,
    'mappa:'::text || t.mappa AS via
   FROM postmappa_tengsl t
     JOIN email_digest d ON d.account = t.account AND d.folder = t.mappa
     JOIN fyrirtaeki f ON f.id = t.fyrirtaeki_id AND f.deleted_at IS NULL
  WHERE t.fyrirtaeki_id IS NOT NULL AND lower(COALESCE(d.account, ''::text)) <> 'aggisigurds@gmail.com'::text;
