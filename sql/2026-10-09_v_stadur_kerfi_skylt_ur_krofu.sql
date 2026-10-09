-- 09.10.2026 — v_stadur_kerfi: skylt fellur á kröfu tegundarinnar þegar sjálfvirka gildið vantar.
--
-- Villan (mæld í prófi á Test fyrirtæki 1404): kerfaröð sem verður til ÚR VAFRANUM (Kerfi og þjónusta, patch 450 —
-- t.d. „Nei" á brunaþéttingum sem áttu enga röð) ber skylt_sjalfvirkt = null, því vafrinn skrifar aldrei sjálfvirku
-- dálkana. Sýnin tók skylt = coalesce(handval-krafa, skylt_sjalfvirkt) → null, og tækifærið varð null í stað (a)/(c).
-- Sjálfvirka keyrslan snertir aldrei handskráðar raðir, svo gildið hefði staðið null að eilífu.
--
-- Lagfæring: coalesce(handval-krafa, skylt_sjalfvirkt, krafa núverandi tegundar). Mælt fyrir beitingu: allar 3.682
-- raðir utan 1404 bera skylt_sjalfvirkt, svo úttak þeirra er óbreytt (md5 af fid|kerfi|skylt|tækifæri borið saman).
create or replace view public.v_stadur_kerfi with (security_invoker = true) as
select k.fyrirtaeki_id,
       v.nafn,
       v.heimilisfang,
       v.tegund,
       v.tegund_heiti,
       v.notkunarflokkur,
       k.kerfi,
       k.til_stadar,
       coalesce(case when v.tegund_handval is not null then r.skylt else null::text end, k.skylt_sjalfvirkt, r.skylt) as skylt,
       r.skilyrdi,
       r.heimild as krafa_heimild,
       r.url as krafa_url,
       k.thjonustuadili,
       k.verd_ar,
       k.samningur_til,
       k.heimild,
       k.visbending,
       k.smaatridi,
       k.athugasemd,
       k.uppruni,
       k.uppfaert,
       case
         when k.thjonustuadili ~~* 'okkar%'::text then 'd'::text
         when k.til_stadar = 'ja'::text then 'b'::text
         when coalesce(case when v.tegund_handval is not null then r.skylt else null::text end, k.skylt_sjalfvirkt, r.skylt) = any (array['ja'::text, 'skilyrt'::text])
              and (k.til_stadar = 'nei'::text or (k.til_stadar = 'ovitad'::text and k.visbending = '0_i_arlegri_skodun'::text)) then 'a'::text
         when k.til_stadar = 'ovitad'::text
              and coalesce(case when v.tegund_handval is not null then r.skylt else null::text end, k.skylt_sjalfvirkt, r.skylt) = any (array['ja'::text, 'skilyrt'::text]) then 'c'::text
         else null::text
       end as taekifaeri
  from stadur_kerfi k
  join v_stadur_flokkun v using (fyrirtaeki_id)
  left join flokkar_krofur r on r.tegund = v.tegund and r.kerfi = k.kerfi;
