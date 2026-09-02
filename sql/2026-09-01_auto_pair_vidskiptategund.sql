-- ============================================================================
-- ✅ KEYRT 02.09.2026. Skorðan er komin í `auto_pair_customer_document()` og
-- 56 rangar tengingar voru losaðar (15 þeirra merktar `klarad`). Vörðurinn
-- tools/audit-para-tegund.cjs stendur nú í GRUNNLINA = 0.
--
-- Tvennt sem breyttist frá áætluninni hér að neðan:
--   · `v_service_type` er EKKI til í fallinu — það var ágiðskað og skjalið sagði
--     það. Rétta leiðin var ný breyta `v_teg` borin saman við `p.service_type`.
--   · Biðstöðu-greinin (INSERT) greip HVAÐA par sem er, óháð service_type. Þær
--     tvær greinar þurftu ÓLÍKA skörðu, ekki sömu.
--
-- Sannreynt: búðar-reikningur parast EKKI, úttektar-reikningur parast (par 1504,
-- bæði prófuninni eytt á eftir). Afrit: backup_20260902_document_pairs (1.443 raðir).
-- ============================================================================

-- Pörun má ekki tengja reikning af rangri þjónustutegund
-- ============================================================================
-- Fundið 01.09.2026: Agnar sá „Úttekt 2026 · reikn. R-108161 ✓" á NR5 ehf.
-- R-108161 er staðgreidd BÚÐARSALA — 3 léttvatn + 1 CO₂, engin yfirferð,
-- enginn akstur, engin skýrslugerð. Rétt flokkuð sem `bud`.
--
-- Reglan „búð og brunakerfi eru ekki slökkvitækjaþjónusta" var sett í
-- VIÐMÓTINU 26.08.2026:
--     js/patches/187-inservice-row-reports.js  isUttektInvoiceTeg()
--     js/patches/199-doc-year-grid.js          pushInvByService()
-- Hún barst aldrei niður í gagnagrunninn. Triggerinn
-- `auto_pair_customer_document()` parar eftir (customer_base_id, ár,
-- service_type) og skoðar ekki `customer_documents.vidskiptategund`.
--
-- MÆLT UMFANG 01.09.2026 (af 1.428 pörum):
--     51  uttekt      ← bud
--      1  uttekt      ← brunakerfi
--      1  brunakerfi  ← uttekt
--     ---
--     53  alls, þar af 14 merkt `klarad`
--
-- Merkt `klarad` þýðir að búðarsala telst kláruð úttekt. Það hækkar
-- `veidin_bundle_por` og lætur staði líta út fyrir að vera afgreidda sem hafa
-- aldrei fengið þjónustuheimsókn.
--
-- Uppruni paranna er ekki bara triggerinn:
--     auto_trigger 41 · cowork 7 · auto_standby 2 · manual 2 · shared_report 1
-- Þess vegna dugar ekki að laga triggerinn einan — sjá skref 3.
--
-- VÖRÐUR: tools/audit-para-tegund.cjs fellur rautt ef talan fer yfir 53.
-- Lækkaðu GRUNNLINA þar um leið og skref 3 er keyrt.
-- ============================================================================

-- ── SKREF 1: sjá núverandi fall ─────────────────────────────────────────────
-- Fallið er ekki í git (búið til beint í Supabase 2026-08-08). Sæktu það áður
-- en því er breytt — ekki endurskrifa það úr minni.

select pg_get_functiondef(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'auto_pair_customer_document'
  and n.nspname = 'public';


-- ── SKREF 2: skorðan sem á að bætast við ────────────────────────────────────
-- Bættu ÞESSU inn í bæði greinar fallsins (biðstöðuna og varfærnu leiðina),
-- á sama stað og önnur skjala-sía. `ovisst`/null halda ÁFRAM að tengjast —
-- 77 reikningar eru óvissir og sama undanþága gildir í patch 187, annars
-- slokknar á Hamraborg 7 o.fl.
--
--   -- Búð er ekki þjónusta. Brunakerfisreikningur er ekki úttekt og öfugt.
--   -- Sama regla og isUttektInvoiceTeg() í patch 187 (2026-08-26).
--   if new.doc_type = 'reikningur' then
--     if lower(coalesce(new.vidskiptategund,'')) = 'bud' then
--       return new;                       -- búð parast aldrei
--     end if;
--     if lower(coalesce(new.vidskiptategund,'')) in ('uttekt','brunakerfi')
--        and lower(new.vidskiptategund) <> v_service_type then
--       return new;                       -- röng þjónustutegund
--     end if;
--   end if;
--
-- ATH: breytunafnið `v_service_type` er ágiskun — notaðu það nafn sem SKREF 1
-- sýnir. Ekki afrita þetta blint.


-- ── SKREF 3: hreinsa þau 53 sem þegar eru til ───────────────────────────────
-- SKOÐA FYRST. Þetta sýnir nákvæmlega hvað yrði snert og breytir engu.

select p.id as par_id, p.year, p.service_type, p.status, p.matched_by,
       d.invoice_number, d.vidskiptategund, p.fyrirtaeki_id
from document_pairs p
join customer_documents d on d.id = p.invoice_doc_id
where d.doc_type = 'reikningur'
  and (
    (p.service_type = 'uttekt'     and lower(coalesce(d.vidskiptategund,'')) in ('bud','brunakerfi')) or
    (p.service_type = 'brunakerfi' and lower(coalesce(d.vidskiptategund,'')) in ('bud','uttekt'))
  )
order by p.year desc, p.id;

-- Afrit ÁÐUR en nokkru er breytt (venja repósins).
-- create table backup_20260901_document_pairs as select * from document_pairs;

-- Losa reikninginn og setja stöðuna aftur í „vantar reikning". Skýrslan
-- stendur óhreyfð — hún var aldrei vandamálið.
--
-- update document_pairs p
-- set invoice_doc_id = null,
--     solur_id       = null,
--     status         = case when p.report_doc_id is not null
--                           then 'vantar_reikning' else p.status end,
--     matched_by     = coalesce(p.matched_by,'') || '+teg_hreinsun_20260901',
--     updated_at     = now()
-- from customer_documents d
-- where d.id = p.invoice_doc_id
--   and d.doc_type = 'reikningur'
--   and (
--     (p.service_type = 'uttekt'     and lower(coalesce(d.vidskiptategund,'')) in ('bud','brunakerfi')) or
--     (p.service_type = 'brunakerfi' and lower(coalesce(d.vidskiptategund,'')) in ('bud','uttekt'))
--   );


-- ── SKREF 4: staðfesta ──────────────────────────────────────────────────────
-- Á að skila 0. Keyrðu svo `node tools/audit-para-tegund.cjs` og lækkaðu
-- GRUNNLINA í þá tölu sem stendur eftir.

-- select count(*) from document_pairs p
-- join customer_documents d on d.id = p.invoice_doc_id
-- where (p.service_type='uttekt'     and lower(coalesce(d.vidskiptategund,'')) in ('bud','brunakerfi'))
--    or (p.service_type='brunakerfi' and lower(coalesce(d.vidskiptategund,'')) in ('bud','uttekt'));
