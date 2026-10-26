-- 26.10.2026 — Stólpa-bókin: tegund 'villa' fyrir línur sem Agnar hefur dæmt rangar.
-- Hreyfingaryfirlitið (_hreyfingaryfirlit-kjarni.cjs) sleppir þeim eins og 'opnunarlina'.
-- Tilefni: Heimaleiga ehf greiddi R-107758 (Bríetartún) 11.02.2026 (krafa 104379) — reikningurinn var
-- kreditfærður og gefinn út aftur sem R-108266 sem Heimaleiga greiddi líka. Agnar: „tvígreiðslan í feb
-- er örugglega villa". Línurnar fjórar (id 545–548, runa 8417) merktar villa; upprunaleg tegund í heimild.
-- KEYRT 26.10.2026 (Claude, um Supabase MCP).

alter table stolpi_hreyfingar drop constraint stolpi_hreyfingar_tegund_check;
alter table stolpi_hreyfingar add constraint stolpi_hreyfingar_tegund_check
  check (tegund = any (array['reikningur','kredit','greiddur_reikningur','greidd_krafa','innheimtukostnadur',
                             'drattarvextir','greiddir_vextir','opnunarlina','annad','villa']));

update stolpi_hreyfingar
   set heimild = coalesce(heimild,'') || ' | 26.10.2026: merkt villa (var ' || tegund || ') — Agnar: „tvígreiðslan í feb er örugglega villa"; tekin út af hreyfingaryfirliti',
       tegund = 'villa'
 where id in (545,546,547,548) and kt10 = '5101170690' and dags = '2026-02-11';
