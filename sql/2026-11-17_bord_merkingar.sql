-- 2026-11-17 — „Merkja og keyra“ (lota 14): merki Agnars á línum Þjónustuborðsins.
--
-- Agnar 17.11.2026: tiny merki á hverri línu → lítill gluggi (Já · Nei · Keyra · Snooze · Veit ekki · Rannsaka betur ·
-- Setja comment · Yfirfara). Hann merkir það sem hann getur án þess að skrifa, ýtir á Keyra, og agentar vinna verkin.
-- Niðurstaða agents fer aldrei út: Óðinn metur hana og marktæk niðurstaða verður „tilbúið verk“ í afgreidsla.
--
-- Ein röð = eitt merki á eina línu. Nýtt merki á sömu línu leysir eldra af hólmi (stada 'tekid_af'), engu eytt.
-- Flæðið: merkt → i_keyrslu → klarad | vantar_svar.  Snooze: blundar (due_at SKYLDA, annars hverfur atriðið).
-- RLS virk og ENGAR reglur: aðeins þjónninn (afgreidsla.cjs, þjónustuhlutverk) les og skrifar. Vafrinn fer um /api/afgreidsla.

create table if not exists public.bord_merkingar (
  id            bigserial primary key,
  bord          text not null default 'thjonustubord',                     -- hvaða borð (v1: aðeins Þjónustuborðið)
  lina          text not null,                                             -- línulykill, t.d. 'mal:1234'
  mal_id        bigint references public.thjonustubeidni(id) on delete set null,
  mal_titill    text,
  merki         text not null check (merki in ('ja','nei','keyra','snooze','veit_ekki','rannsaka','comment','yfirfara')),
  athugasemd    text,
  due_at        timestamptz,                                               -- snooze: hvenær atriðið kemur aftur
  merkt_af      text not null,
  merkt_at      timestamptz not null default now(),
  stada         text not null default 'merkt'
                check (stada in ('merkt','i_keyrslu','klarad','vantar_svar','blundar','tekid_af')),
  forgangur     integer not null default 50,                               -- lægra = fremst (Veit ekki / Rannsaka betur)
  umferd        text,                                                      -- auðkenni keyrsluumferðar
  agent         text,                                                      -- agentinn sem fékk verkið (úr leiðarvísinum)
  agent_leid    jsonb,                                                     -- hvers vegna: stig, orð, gat
  claude        jsonb,                                                     -- vinnustaða „Biddu Claude“ (nonce er aldrei sýnt vafranum)
  nidurstada    jsonb,                                                     -- svar agentsins + tillaga
  odin_mat      jsonb,                                                     -- mat Óðins: { marktaekt, astaeda, urskurdur_id, at }
  astaeda       text,                                                      -- vantar_svar: hvers vegna (sýnt Agnari)
  afgreidsla_id bigint references public.afgreidsla(id) on delete set null,
  keyrt_at      timestamptz,
  lokid_at      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint bord_merkingar_snooze_dags check (merki <> 'snooze' or due_at is not null)
);

-- Eitt virkt merki á línu hjá hverjum merkjanda (nýtt merki = uppfærsla, eldra víkur).
create unique index if not exists bord_merkingar_ein_virk
  on public.bord_merkingar (bord, lina, merkt_af) where stada in ('merkt','i_keyrslu','blundar');
create index if not exists bord_merkingar_stada on public.bord_merkingar (merkt_af, stada, forgangur);
create index if not exists bord_merkingar_umferd on public.bord_merkingar (umferd);

alter table public.bord_merkingar enable row level security;
-- Viljandi engar reglur: anon/authenticated fá ekkert. Þjónustuhlutverkið fer framhjá RLS.
revoke all on public.bord_merkingar from anon, authenticated;

comment on table public.bord_merkingar is 'Merkja og keyra (lota 14, 17.11.2026): merki Agnars á línum Þjónustuborðsins. Aðeins þjónninn (/api/afgreidsla) les og skrifar.';
