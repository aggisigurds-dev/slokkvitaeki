-- Charlize — artifact-skrá og biðstofa
-- Keyra EFTIR setup.sql. Öruggt að keyra aftur.

-- ── 1) Artifact-skráin ────────────────────────────────────────────────────────
-- Hvað er til, hvað gerir það, hvort það er enn í notkun.
create table if not exists charlize_artifacts (
  id            bigserial primary key,
  path          text not null,
  filename      text not null,
  content_hash  text,                       -- sha1 — sami lykill og skjalaheiti_log notar
  kind          text,                       -- js | gs | py | html | sql | md | sheet | json
  system        text,                       -- slokkvitaeki | brunaholf | luna-bridge | cowork | annad
  purpose       text,                       -- ein setning: hvað þetta gerir
  status        text not null default 'unknown'
                  check (status in ('active','superseded','unknown','dead')),
  superseded_by bigint references charlize_artifacts(id),
  bytes         bigint,
  modified_at   timestamptz,
  notes         text,
  first_seen    timestamptz not null default now(),
  last_seen     timestamptz not null default now(),
  unique (path)
);

create index if not exists charlize_art_hash_idx on charlize_artifacts (content_hash);
create index if not exists charlize_art_sys_idx  on charlize_artifacts (system, status);

-- Tvíburar: sama innihald á tveimur stöðum. Þetta er vandamálið sem margfaldaði
-- "master-skjölin" og module-afbrigðin.
create or replace view v_charlize_tvibura as
  select content_hash, count(*) as eintok,
         array_agg(path order by path) as slodir
  from charlize_artifacts
  where content_hash is not null and status <> 'dead'
  group by content_hash
  having count(*) > 1;

create or replace view v_charlize_artifacts_active as
  select id, system, kind, filename, purpose, path, modified_at
  from charlize_artifacts
  where status = 'active'
  order by system, kind, filename;


-- ── 2) Biðstofan ──────────────────────────────────────────────────────────────
-- Uppskera fer ALDREI beint í charlize_knowledge. Hún lendir hér og Agnar hleypir henni inn.
create table if not exists charlize_inbox (
  id            bigserial primary key,
  scope         text,
  topic         text,
  fact          text not null,
  detail        text,
  kennitala     text,
  source_path   text,                        -- hvaða skrá þetta kom úr
  source_line   int,
  content_hash  text,                        -- hash upprunaskrárinnar
  confidence    text default 'unverified',
  agent         text,
  status        text not null default 'pending'
                  check (status in ('pending','approved','rejected','duplicate')),
  review_note   text,
  created_at    timestamptz not null default now()
);

create index if not exists charlize_inbox_status_idx on charlize_artifacts (status);
create index if not exists charlize_inbox_st_idx     on charlize_inbox (status);

create or replace view v_charlize_inbox_pending as
  select id, scope, topic, fact, source_path, source_line, created_at
  from charlize_inbox
  where status = 'pending'
  order by scope, topic, created_at;


-- ── 3) Samþykkt — færir úr biðstofu í þekkingargrunn ──────────────────────────
create or replace function charlize_approve(inbox_id bigint)
returns bigint as $$
declare new_id bigint;
begin
  insert into charlize_knowledge (scope, topic, fact, detail, kennitala, source, confidence, agent)
  select coalesce(scope,'kerfi'), coalesce(topic,'annad'), fact, detail, kennitala,
         'artifact: ' || coalesce(source_path,'?'), coalesce(confidence,'unverified'),
         coalesce(agent,'cowork')
  from charlize_inbox where id = inbox_id and status = 'pending'
  returning id into new_id;

  if new_id is null then
    raise exception 'Færsla % er ekki til eða ekki pending', inbox_id;
  end if;

  update charlize_inbox set status = 'approved' where id = inbox_id;
  return new_id;
end $$ language plpgsql;

-- Samþykkja margar í einu:
--   select charlize_approve(id) from v_charlize_inbox_pending where topic = 'deploy';

-- Hafna:
--   update charlize_inbox set status='rejected', review_note='<af hverju>' where id in (...);


-- ── Fyrirspurnir ──────────────────────────────────────────────────────────────

-- Hvað er óyfirfarið og hvaðan kom það
--   select source_path, count(*) from v_charlize_inbox_pending group by 1 order by 2 desc;

-- Artifacts sem enginn hefur flokkað
--   select system, path, modified_at from charlize_artifacts
--   where status='unknown' order by modified_at desc;

-- Skrár sem hafa ekki sést í síðustu skönnun (líklega horfnar)
--   select path, last_seen from charlize_artifacts
--   where last_seen < now() - interval '30 days' and status <> 'dead';
