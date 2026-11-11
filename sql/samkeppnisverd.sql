-- Verð samkeppnisaðila (11.11.2026)
--
-- Agnar: „bæta við flipa inn í allar þjónustutegundirnar Verð Samkeppnisaðila … þurfum að fara greina markaðinn betur,
-- verð við misjöfn tilefni, stærðir, dags, frá hverjum".
--
-- Ein röð = eitt verð sem við höfum séð hjá öðrum: hver bauð, hvað, hvenær, við hvaða tilefni og fyrir hvaða stærð.
-- Lesið og skrifað af biðlaranum (js/patches/505-samkeppnisverd.js). `thjonusta` er auðkenni þjónustutegundar: verðlisti í
-- 502 (sprinkler, neydarljos, …) eða flokkur í 410 (slokkvitaeki, brunakerfi, slokkvikerfi). Eyðing er mjúk (`eytt`).
--
-- Fylgir sömu reglu og aðrar töflur sem biðlarinn les beint (sala_geymd, thjonustu_tengingar o.fl.): RLS af, grant til
-- anon/authenticated.

create table if not exists public.samkeppnisverd (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  eytt        boolean not null default false,
  thjonusta   text not null,
  adili       text not null default '',
  lidur       text not null default '',
  verd        numeric,
  eining      text not null default '',
  dags        date,
  tilefni     text not null default '',
  staerd      text not null default '',
  stadur      text not null default '',
  ath         text not null default '',
  okkar_lidur text,
  skrad_af    text
);

comment on table public.samkeppnisverd is 'Verð samkeppnisaðila eftir þjónustutegund — markaðsgreining (flipinn Verð samkeppnisaðila, patch 505).';
comment on column public.samkeppnisverd.thjonusta is 'Þjónustutegund: auðkenni verðlista (502) eða flokks (410), t.d. sprinkler, neydarljos, slokkvitaeki, brunakerfi.';
comment on column public.samkeppnisverd.adili is 'Frá hverjum verðið er (samkeppnisaðili).';
comment on column public.samkeppnisverd.verd is 'Verð ÁN vsk í krónum; null = óþekkt. Verð gefið upp með vsk er umreiknað við skráningu og upprunatalan sögð í ath.';
comment on column public.samkeppnisverd.dags is 'Hvenær verðið var gefið eða gilti.';
comment on column public.samkeppnisverd.tilefni is 'Við hvaða tilefni: þjónustusamningur, tilboð, útboð, verðskrá, reikningur, munnlegt …';
comment on column public.samkeppnisverd.staerd is 'Stærð verks eða kerfis sem verðið á við (fjöldi tækja, stúta, m² …).';
comment on column public.samkeppnisverd.stadur is 'Hvar eða fyrir hvern verðið var gefið (má vera autt).';
comment on column public.samkeppnisverd.okkar_lidur is 'Auðkenni liðar í okkar verðlista til samanburðar (valfrjálst), t.d. sp-q.';

create index if not exists samkeppnisverd_thjonusta_idx on public.samkeppnisverd (thjonusta, dags desc) where not eytt;

alter table public.samkeppnisverd disable row level security;
grant select, insert, update on public.samkeppnisverd to anon, authenticated;
