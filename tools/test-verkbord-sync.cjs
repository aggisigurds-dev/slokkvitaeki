#!/usr/bin/env node
'use strict';
/**
 * Offline ticks for Þjónustuborð AI-sync: site matching never merges
 * Center Hotel houses, derived work is per fyrirtaeki_id, close is never
 * default-on, invented tags/ops are dropped.
 */
const V = require('../netlify/functions/_verkbord-sync.cjs');
let failed = 0;
function ok(name, cond, detail) {
  if (cond) console.log('  OK  ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

const SITES = [
  { id: 193, nafn: 'Center Hótel - Plaza', customer_base_id: 146, er_i_thjonustu: true },
  { id: 195, nafn: 'Center Hótel - Arnarhvoll', customer_base_id: 146, er_i_thjonustu: true },
  { id: 197, nafn: 'Center Hótel - Grandi', customer_base_id: 146, er_i_thjonustu: true },
  { id: 1750, nafn: 'Center Hótel - Hlaðvarpinn', customer_base_id: 146, er_i_thjonustu: true },
  { id: 1627, nafn: 'Center Hótel - Þverholt 14', customer_base_id: 146, er_i_thjonustu: false },
  { id: 394, nafn: 'Fornhagi 11-17', customer_base_id: 9, er_i_thjonustu: true },
];

ok('Plaza unique by Plaza', V.matchSite('Plaza', SITES) && V.matchSite('Plaza', SITES).id === 193);
ok('Arnarhvoll unique', V.matchSite('arnarhvoll', SITES) && V.matchSite('arnarhvoll', SITES).id === 195);
ok('exact Grandi', V.matchSite('Center Hótel - Grandi', SITES).id === 197);
ok('group name Center Hótel is null (do not guess hotel)', V.matchSite('Center Hótel', SITES) == null);
ok('empty hint is null', V.matchSite('', SITES) == null);
ok('unknown name is null', V.matchSite('Einhver sem er ekki til', SITES) == null);

const derived = V.deriveUttekt(
  SITES,
  [{ fyrirtaeki_id: 197 }, { fyrirtaeki_id: 195 }],
  [{ customer_id: 195 }],
  2026
);
ok('Grandi vantar_reikning (report, no invoice)', derived.some((d) => d.fid === 197 && d.kind === 'vantar_reikning'));
ok('Plaza not in derived (no 2026 slökk report)', !derived.some((d) => d.fid === 193));
ok('Arnarhvoll klarad so absent from todo', !derived.some((d) => d.fid === 195));
ok('Þverholt 14 out of service skipped', !derived.some((d) => d.fid === 1627));
ok('never keyed by base 146 as one row', derived.filter((d) => d.customer_base_id === 146).every((d) => d.fid));

const grandiFact = derived.find((d) => d.fid === 197);
const act = V.actionFromDerived(grandiFact, []);
ok('derived create uses exact Grandi nafn', act.customer_nafn === 'Center Hótel - Grandi');
ok('derived create channel_ref per fid', act.channel_ref === 'derived:vantar_reikning:2026:197');
ok('derived rukkun tag', act.tags.indexOf('eftir_ad_rukka') !== -1);
ok('derived never default-checked (would dump 180 tickets)', act.defaultOn === false);

const already = [{ id: 1, status: 'nytt', customer_nafn: 'Center Hótel - Grandi', tags: ['eftir_ad_rukka'] }];
const skip = V.actionFromDerived(grandiFact, already);
ok('skip create when sticky already on that exact site', skip.op === 'skip' && skip.onBoard);

const plazaBoard = [{ id: 2, status: 'nytt', customer_nafn: 'Center Hótel - Plaza', tags: ['eftir_ad_rukka'] }];
ok('Plaza sticky does not eat Grandi derived', V.actionFromDerived(grandiFact, plazaBoard).op === 'create');

const raw = [
  { op: 'create', title: 'Senda skýrslu Plaza', customer_nafn: 'Plaza', tags: ['senda_skyrslur', 'invented_tag'] },
  { op: 'create', title: 'Center eitthvað', customer_nafn: 'Center Hótel', tags: ['thjonusta'] },
  { op: 'close', id: 99, reason: 'búið' },
  { op: 'close', id: 1, reason: 'búið' },
  { op: 'explode', id: 1 },
  { op: 'create', title: '', customer_nafn: 'Grandi' },
];
const openItems = [{ id: 1, status: 'nytt', title: 'Rukka Grandi', customer_nafn: 'Center Hótel - Grandi', tags: ['eftir_ad_rukka'] }];
const cleaned = V.validateActions(raw, { sites: SITES, openItems });
const plazaCreate = cleaned.find((a) => a.op === 'create' && a.customer_nafn && a.customer_nafn.indexOf('Plaza') !== -1);
ok('Plaza create resolved to exact site nafn', !!(plazaCreate && plazaCreate.customer_nafn === 'Center Hótel - Plaza'));
ok('invented tag dropped', plazaCreate && plazaCreate.tags.indexOf('invented_tag') === -1 && plazaCreate.tags.indexOf('senda_skyrslur') !== -1);
const groupCreate = cleaned.find((a) => a.title === 'Center eitthvað');
ok('group-name create has no customer_nafn', !!(groupCreate && !groupCreate.customer_nafn));
ok('close unknown id dropped', !cleaned.some((a) => a.op === 'close' && a.id === 99));
ok('close known id kept and defaultOff', cleaned.some((a) => a.op === 'close' && a.id === 1 && a.defaultOn === false));
ok('invented op dropped', !cleaned.some((a) => a.op === 'explode'));
ok('empty title dropped', !cleaned.some((a) => a.title === ''));

const parsed = V.parseJsonArray('blah [{"op":"create","title":"x"}] trailing');
ok('parseJsonArray extracts array', parsed.length === 1 && parsed[0].title === 'x');

console.log(failed ? '\nFAIL ' + failed : '\nOK');
process.exit(failed ? 1 : 0);
