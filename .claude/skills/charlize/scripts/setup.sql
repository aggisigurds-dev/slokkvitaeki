-- Charlize — þekkingargrunnur
-- Keyra einu sinni í Supabase SQL Editor (project osfdzskyvisifcwyjkuk).
-- Öruggt að keyra aftur: allt er IF NOT EXISTS / OR REPLACE.

create table if not exists charlize_knowledge (
  id             bigserial primary key,
  scope          text not null check (scope in ('slokkvitaeki','brunaholf','baedi','kerfi','folk')),
  topic          text not null,
  fact           text not null,
  detail         text,
  source         text,
  confidence     text not null default 'confirmed'
                   check (confidence in ('confirmed','likely','unverified')),
  status         text not null default 'active'
                   check (status in ('active','superseded','wrong')),
  superseded_by  bigint references charlize_knowledge(id),
  agent          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists charlize_scope_topic_idx
  on charlize_knowledge (scope, topic);

create index if not exists charlize_status_idx
  on charlize_knowledge (status);

-- Leitarvísir. 'simple' (ekki 'icelandic') svo íslensk orð stemmi orðrétt.
create index if not exists charlize_fts_idx
  on charlize_knowledge
  using gin (to_tsvector('simple', fact || ' ' || coalesce(detail,'') || ' ' || topic));

create or replace view v_charlize_active as
  select id, scope, topic, fact, detail, source, confidence, agent, created_at
  from charlize_knowledge
  where status = 'active'
  order by scope, topic, created_at desc;

-- updated_at sjálfvirkt
create or replace function charlize_touch() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists charlize_touch_trg on charlize_knowledge;
create trigger charlize_touch_trg
  before update on charlize_knowledge
  for each row execute function charlize_touch();


-- ── Fyrirspurnir sem eru notaðar aftur og aftur ────────────────────────────────

-- 1) Allt um eitt efni
--    select topic, fact, detail, confidence, created_at
--    from v_charlize_active
--    where scope in ('slokkvitaeki','baedi') and topic = 'payday';

-- 2) Frítextaleit
--    select scope, topic, fact from v_charlize_active
--    where fact ilike '%krofuyfirlit%' or detail ilike '%krofuyfirlit%';

-- 3) Nýtt síðan síðast
--    select scope, topic, fact, agent, created_at from v_charlize_active
--    where created_at > now() - interval '14 days' order by created_at desc;

-- 4) Það sem þarf staðfestingu
--    select id, scope, topic, fact from v_charlize_active
--    where confidence <> 'confirmed';

-- 5) Supersede: ný færsla fyrst, svo tengja
--    insert into charlize_knowledge (scope,topic,fact,source,agent)
--    values ('slokkvitaeki','deploy','<rétta útgáfan>','sql','chat')
--    returning id;
--    update charlize_knowledge set status='superseded', superseded_by=<nýja_id>
--    where id=<gamla_id>;
