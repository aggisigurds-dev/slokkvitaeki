-- Charlize — kúnnaminni (fyrirtæki í þjónustu)
-- Keyra EFTIR setup.sql. Öruggt að keyra aftur.

-- 1) Bæta 'kunni' við leyfileg scope-gildi
alter table charlize_knowledge drop constraint if exists charlize_knowledge_scope_check;
alter table charlize_knowledge add constraint charlize_knowledge_scope_check
  check (scope in ('slokkvitaeki','brunaholf','baedi','kerfi','folk','kunni'));

-- 2) Tenging á fyrirtæki
alter table charlize_knowledge add column if not exists kennitala        text;
alter table charlize_knowledge add column if not exists customer_base_id bigint;
alter table charlize_knowledge add column if not exists fyrirtaeki_id    bigint;

-- Kennitala er skylda þegar scope='kunni' — annars er færslan ótengjanleg
alter table charlize_knowledge drop constraint if exists charlize_kunni_kt;
alter table charlize_knowledge add constraint charlize_kunni_kt
  check (scope <> 'kunni' or kennitala is not null);

create index if not exists charlize_kt_idx
  on charlize_knowledge (kennitala) where kennitala is not null;

create index if not exists charlize_cb_idx
  on charlize_knowledge (customer_base_id) where customer_base_id is not null;

-- 3) View fyrir kúnnaminni
--    ATH: skilyrðið um "í þjónustu" er ÓSTAÐFEST — sjá references/kunnaminni.md.
--    Eins og þetta stendur skilar viewið öllum kúnnafærslum með nafni ef það finnst.
create or replace view v_charlize_kunni as
  select k.id,
         k.kennitala,
         coalesce(cb.nafn, f.nafn) as fyrirtaeki,
         k.topic,
         k.fact,
         k.detail,
         k.confidence,
         k.source,
         k.agent,
         k.created_at
  from charlize_knowledge k
  left join customers_base cb on cb.id = k.customer_base_id
  left join fyrirtaeki    f  on f.id  = k.fyrirtaeki_id
  where k.scope = 'kunni'
    and k.status = 'active'
  order by k.kennitala, k.topic, k.created_at desc;


-- ── Fyrirspurnir ──────────────────────────────────────────────────────────────

-- Fyrir heimsókn eða svar á póst
--   select topic, fact, detail from v_charlize_kunni where kennitala = '<kt>';

-- Öll fyrirtæki sem eiga skráð minni, með fjölda færslna
--   select kennitala, max(fyrirtaeki) as nafn, count(*) as faerslur
--   from v_charlize_kunni group by kennitala order by faerslur desc;

-- Tengja eldri færslur við customers_base eftir kennitölu
--   update charlize_knowledge k set customer_base_id = cb.id
--   from customers_base cb
--   where k.scope='kunni' and k.customer_base_id is null
--     and regexp_replace(cb.kennitala,'\D','','g') = regexp_replace(k.kennitala,'\D','','g');
