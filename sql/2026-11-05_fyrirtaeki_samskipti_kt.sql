-- 2026-11-05  fyrirtaeki_samskipti_kt — póstar tengdir félagi með KENNITÖLU (viðbót við fyrirtaeki_samskipti)
--
-- Agnar 04.11.2026: „getur þú reynt að tengja fleiri pósta við fyrirtæki“ → „já“ (tengja við samskiptagluggann sem er til).
-- postur_ai_yfirlit.yfirlit._kt fékk kennitölu fyrir 1.038 pósta til viðbótar (reglur kt-i-texta, thradur, netfang-skra, simi;
-- merkt með _kt_tengt; afturköllun í minnisskrá agentakerfisins). Þessi tafla birtir þá pósta á SAMA formi og
-- fyrirtaeki_samskipti svo patch 286 (samskiptaspjald) og 287 (CRM-borð) sameini þær eftir email_id.
--
-- HEGÐUN: ný tafla — fyrirtaeki_samskipti (þung, með ROLLBACK og árangurspróf) er EKKI snert.
--   • FÉLAGSSTIG: ein röð per póst per félag (customer_base_id). fyrirtaeki_id er fyllt aðeins þegar félagið á NÁKVÆMLEGA EINN
--     stað (annars null — kennitala segir hvaða félag, ekki hvaða stað); stað-fyrirspurnir (eq fyrirtaeki_id) fá því aðeins
--     eins-staða félög, félagsfyrirspurnir (eq customer_base_id) fá allt.
--   • aggisigurds@gmail.com (einkapóstur) aldrei með.
-- KEYRSLA: 1) þessi skrá (view) · 2) AÐGANGUR — handvirkt skref Agnars í SQL Editor, sjálfvirka heimildakerfið neitar GRANT:
--      grant select on public.fyrirtaeki_samskipti_kt to anon, authenticated, service_role;
--    (sama aðgangsstig og fyrirtaeki_samskipti hefur: appið les með anon-lyklinum; sýnir efnislínur pósta.) Þar til það er gert
--    sleppa patch 286/287 töflunni þegjandi — ekkert brotnar.
drop view if exists public.fyrirtaeki_samskipti_kt;
create view public.fyrirtaeki_samskipti_kt as
select (case when ss.n = 1 then ss.fid end)                       as fyrirtaeki_id,
       (case when ss.n = 1 then ss.fnafn else cb.nafn end)::text  as fyrirtaeki_nafn,
       d.id                                                       as email_id,
       d.sender_name,
       d.sender_email,
       d.subject,
       d.snippet,
       d.is_question,
       d.received_at,
       (d.sender_email ~~* '%eldklar%')                           as fra_okkur,
       cb.id                                                      as customer_base_id,
       ('kt:' || (p.yfirlit ->> '_kt_leid'))                      as via
from public.postur_ai_yfirlit p
join public.email_digest   d  on d.id::text = p.mail_id
join public.customers_base cb on regexp_replace(cb.kennitala, '\D', '', 'g') = (p.yfirlit ->> '_kt')
join lateral (select count(*)::int as n, min(s.id) as fid, min(s.nafn) as fnafn
              from public.fyrirtaeki s where s.customer_base_id = cb.id and s.deleted_at is null) ss on ss.n >= 1
where p.yfirlit ? '_kt_tengt'
  and lower(coalesce(d.account, '')) <> 'aggisigurds@gmail.com';

comment on view public.fyrirtaeki_samskipti_kt is
  'Póstar tengdir félagi með kennitölu (postur_ai_yfirlit._kt, merki _kt_tengt) á sama formi og fyrirtaeki_samskipti, á félagsstigi. 2026-11-05.';
