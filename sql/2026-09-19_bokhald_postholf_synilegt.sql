-- ============================================================================
-- bokhald@eldklar.is verður sýnilegt appinu — en aðeins póstur frá FÓLKI
-- ============================================================================
-- Keyrt á Supabase 19.09.2026. Skráð hér svo reglan sé til utan gagnagrunnsins.
--
-- VANDINN, mældur:
--   Reikninga-póstur (js/patches/240-reikninga-postur.js) hefur frá upphafi
--   beðið um BÆÐI hólfin:
--       .in('account', ['eldklar@eldklar.is', 'bokhald@eldklar.is'])
--   en eina RLS-reglan fyrir anon var:
--       beidnir_anon_read_eldklar  SELECT  anon  (account = 'eldklar@eldklar.is')
--   svo síðari listinn skilaði TÓMU — ÁN VILLU. Mælt í vafranum: 249 póstar,
--   allir eldklar@, NÚLL bokhald@. Bein uppfletting á stökum röðum skilaði 0
--   röðum og engri villu; RLS felur, hún kvartar ekki.
--
--   Afleiðing: 137 skeyti (95 í innhólfi síðustu 60 daga) sáust aldrei í appinu.
--   Þar á meðal beiðni húsfélagsins Árskógar 6-8 (16.09.) og ítrekun hennar
--   (18.09., „eindagi 19.09."), um reikning R-000907 upp á 521.995 kr sem hafði
--   farið í banka en ALDREI til kúnnans. Á Forgangslista krafna stóð hann á
--   meðan sem „ítreka, hringja".
--
-- AF HVERJU EKKI BARA VÍKKA GÖMLU REGLUNA:
--   anon-lykillinn er OPINBER (stendur í js/config.js á opinberri síðu). Hólfið
--   geymir líka inkasso@inkasso.is, stolpi@stolpi.is, Teya-uppgjör, Nova og
--   birgjareikninga. Agnar valdi þrengri leiðina (B).
--
-- HVAÐ OPNAST: 27 af 137 skeytum (16 síðustu 60 daga), frá 15 sendendum sem eru
--   manneskjur eða fyrirtæki — hussjodurinn@hussjodurinn.is, marta@atlasverktakar.is,
--   svala@velras.is, rakel@markusnet.com, bokhald@adalskodun.is, info@rogg.is,
--   sala@vfs.is, skjoldurehf@gmail.com, reikningar@eignarekstur.is o.fl.
--
-- HVAÐ HELST LOKAÐ: 110 af 137 — allt vélrænt (no-reply/noreply/reporting/
--   delivery/donotreply) auk teya.com, inexchange.is, nova.is, google.com,
--   konto.is, stolpi.is og inkasso.is. Persónulega hólf Agnars
--   (aggisigurds@gmail.com) er undanskilið skv. standandi reglu.
--
-- SENT-mappan er ekki opnuð: skilyrðið krefst folder = 'INBOX'.
--
-- Staðfest eftir á í vafranum (anon-lykill):
--   bokhald@ skilar 15 póstum (var 0) · báðir Árskógar-póstarnir sjást ·
--   lekapróf á teya|nova|inexchange|inkasso|stolpi|konto|aggisigurds = TÓMT.
-- ============================================================================

drop policy if exists beidnir_anon_read_bokhald_fra_folki on public.email_digest;

create policy beidnir_anon_read_bokhald_fra_folki
  on public.email_digest for select to anon
  using (
    account = 'bokhald@eldklar.is'
    and folder = 'INBOX'
    and sender_email !~* '^(no-?reply|no_reply|noreply|donotreply|reporting|delivery|mailer-daemon)@'
    and sender_email !~* '@(teya\.com|info\.teya\.com|inexchange\.is|nova\.is|google\.com|accounts\.google\.com|konto\.is|stolpi\.is|inkasso\.is)$'
    and sender_email <> 'aggisigurds@gmail.com'
  );

-- Eftirlit: hvað sér anon núna?
--   set role anon;
--   select account, count(*) from email_digest
--    where account in ('eldklar@eldklar.is','bokhald@eldklar.is') group by 1;
--   reset role;
