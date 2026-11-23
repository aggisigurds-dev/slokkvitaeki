'use strict';
/* Pinni fylgir heimilisfangsbreytingu á HVAÐA LEIÐ SEM ER (Agnar 23.11.2026): kveikja → pinni_bidrod → pg_cron → geocode_cache.
 * Grunnurinn sjálfur er prófaður í rúllaðri færslu (sjá minnispunkt); hér er fest það sem má aldrei hverfa úr SQL-skránni. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SQL = fs.readFileSync(path.join(__dirname, '..', 'sql', '2026-11-23_pinni_bidrod.sql'), 'utf8');
const KODI = SQL.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');   // án athugasemda

function fall(nafn) {
  const m = new RegExp('create or replace function public\\.' + nafn + '\\([\\s\\S]*?\\n(?:end )?\\$\\$;', 'i').exec(KODI);
  assert.ok(m, nafn + ' fannst ekki');
  return m[0];
}

test('biðröðin er lokuð: RLS á, engin réttindi fyrir anon/authenticated, öll föllin afturkölluð', () => {
  assert.match(KODI, /alter table public\.pinni_bidrod enable row level security;/);
  assert.match(KODI, /revoke all on public\.pinni_bidrod from anon, authenticated;/);
  const rev = /revoke all on function ([^;]+) from public, anon, authenticated;/.exec(KODI);
  assert.ok(rev, 'REVOKE á föllin vantar');
  for (const f of ['pinni_leysa', 'pinni_vidvorun', 'pinni_afgreida', 'pinni_bidrod_vinna', 'pinni_virkt', 'trg_pinni_bidrod']) assert.ok(rev[1].includes('public.' + f), f + ' ekki afturkallað');
});

test('kveikjan: aðeins þegar heimilisfang BREYTIST, ein röð á fyrirtæki, vistun fellur aldrei', () => {
  assert.match(KODI, /after update of heimilisfang on public\.fyrirtaeki\s+for each row when \(old\.heimilisfang is distinct from new\.heimilisfang\)/);
  assert.match(KODI, /create unique index if not exists pinni_bidrod_bid_uniq on public\.pinni_bidrod \(fyrirtaeki_id\) where stada = 'bid'/);
  const t = fall('trg_pinni_bidrod');
  assert.match(t, /on conflict \(fyrirtaeki_id\) where stada = 'bid'/);
  assert.match(t, /exception when others then[\s\S]*raise warning[\s\S]*return new;/, 'kveikjan má ALDREI fella breytingu á fyrirtæki');
  assert.match(t, /if not public\.pinni_virkt\(\)/, 'rofinn verður að gilda');
});

test('vinnslan: ein í einu (advisory lock + skip locked), hver röð í sinni undirfærslu, bið milli tilrauna, hámark 5', () => {
  const w = fall('pinni_bidrod_vinna');
  assert.match(w, /pg_try_advisory_xact_lock/);
  assert.match(w, /for update skip locked/);
  assert.match(w, /begin\s+o := public\.pinni_afgreida\(it\.id\);\s+exception when others then[\s\S]*tilraunir = tilraunir \+ 1[\s\S]*end;/);
  assert.match(w, /tilraunir < 5/);
  assert.match(w, /tilraunir \* interval '5 minutes'/);
  assert.match(w, /pinni_virkt\(\)/);
});

test('pinni sem er fyrir er varinn: blobbinn teljist með, 150 m regla, aðeins Staðfangaskrá færir, ekkert hnit án Íslands', () => {
  const a = fall('pinni_afgreida');
  assert.match(a, /app_settings where id = 1/, 'föstu punktarnir í blobbnum (512 af 757 ekki í töflunni) verða að teljast sem pinni');
  assert.match(a, /fj < 150/);
  assert.match(a, /precise := src = 'stadfangaskra' or v_adr_src in \('stadfangaskra', 'manual', 'uppferslubord'\)/);
  assert.match(a, /if not precise then[\s\S]*pinni_vidvorun[\s\S]*return 'villa';/, 'ónákvæm uppfletting má ekki hreyfa pinna sem fyrir er — viðvörun í staðinn');
  assert.match(a, /'__co__:' \|\| it\.fyrirtaeki_id/);
  const l = fall('pinni_leysa');
  assert.match(l, /v_lat not between 62\.5 and 67\.5 or v_lon not between -25\.5 and -12\.5/);
  assert.match(l, /https:\/\/slokkvitaeki\.netlify\.app\/api\/geocode\?q=/);
  assert.match(l, /CURLOPT_TIMEOUT/);
});

test('viðvörunin þurrkar aldrei út viðvörun sem fyrir er (tómt/null) og skrifar aðeins í óstaðfest heimilisfangsmál', () => {
  const v = fall('pinni_vidvorun');
  assert.match(v, /if nullif\(btrim\(coalesce\(p_texti, ''\)\), ''\) is null then return; end if;/);
  assert.match(v, /kvittad_at is null and tegund like '%heimilisfang%'/);
});

test('vinnslan skrifar aðeins geocode_cache (engin gögn viðskiptavina) og hnitin fara í __co__ og heimilisfangslykil án þess að yfirskrifa hann', () => {
  const a = fall('pinni_afgreida');
  const skrif = [...a.matchAll(/(?:insert into|update|delete from)\s+public\.(\w+)/gi)].map((m) => m[1]);
  for (const t of new Set(skrif)) assert.ok(['pinni_bidrod', 'geocode_cache'].includes(t), 'pinni_afgreida snertir ' + t);
  assert.match(a, /values \(adr, v_lat, v_lon, res->>'display_name', 'pinni_bidrod'\)\s+on conflict \(query\) do nothing;/);
});
