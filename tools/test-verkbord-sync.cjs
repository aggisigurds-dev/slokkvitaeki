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
  { id: 193, nafn: 'Center Hótel - Plaza', kennitala: '450905-1430', customer_base_id: 146, er_i_thjonustu: true },
  { id: 195, nafn: 'Center Hótel - Arnarhvoll', kennitala: '450905-1430', customer_base_id: 146, er_i_thjonustu: true },
  { id: 197, nafn: 'Center Hótel - Grandi', kennitala: '450905-1430', customer_base_id: 146, er_i_thjonustu: true },
  { id: 1750, nafn: 'Center Hótel - Hlaðvarpinn', customer_base_id: 146, er_i_thjonustu: true },
  { id: 1627, nafn: 'Center Hótel - Þverholt 14', customer_base_id: 146, er_i_thjonustu: false },
  { id: 394, nafn: 'Fornhagi 11-17', customer_base_id: 9, er_i_thjonustu: true },
  { id: 819, nafn: 'Bustravel Iceland ehf.', kennitala: '441115-0400', customer_base_id: 125, er_i_thjonustu: false },
  { id: 774, nafn: 'Húsfélagið Kjarrhólmi 14', kennitala: '510483-0499', customer_base_id: 301, er_i_thjonustu: true },
  { id: 1807, nafn: 'Húsfélagið Kjarrhólmi 18', kennitala: '510483-9999', customer_base_id: 999, er_i_thjonustu: true },
  { id: 125, nafn: 'Húsf. Stóragerði 20', kennitala: '510486-3589', customer_base_id: 302, er_i_thjonustu: true },
  { id: 1160, nafn: 'Reykjavíkurborg', kennitala: '530269-7609', customer_base_id: 365, er_i_thjonustu: false },
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

const rvk = V.classifyEmailTask({
  id: 45492, sender_name: 'Bókhald fyrirspurnir', sender_email: 'bokhald@reykjavik.is',
  subject: 'Re: Reikningur er fallinn á eindaga',
  snippet: 'Við virðumst ekki hafa fengið þennan reikning vegna R-000314. Reikningur nr.93 er eini reikningurinn sem við höfum fengið frá ykkur síðan árið 2020. Gætirðu nokkuð flett upp reikningi R-000314?',
  folder: 'INBOX'
}, { sites: SITES, openItems: [] });
ok('Reykjavík afrit → bokhald', rvk.op === 'create' && rvk.tags.indexOf('bokhald') !== -1 && rvk.flokkur === 'rukkun');
ok('Reykjavík channel_ref email:45492', rvk.channel_ref === 'email:45492');

const rvkDup = V.classifyEmailTask({
  id: 45492, sender_email: 'bokhald@reykjavik.is', subject: 'Re: Reikningur er fallinn á eindaga',
  snippet: 'flett upp reikningi R-000314', folder: 'INBOX'
}, { sites: SITES, openItems: [{ id: 723, status: 'nytt', title: 'Re: Reikningur er fallinn á eindaga', channel_ref: 'email:45492' }] });
ok('Reykjavík already on board is skip', rvkDup.op === 'skip' && rvkDup.onBoard);
ok('Reykjavík create not auto-checked', rvk.defaultOn === false);

const bus = V.classifyEmailTask({
  id: 45667, sender_name: 'Guðbjörg Hilmarsdóttir', sender_email: 'gudbjorg@bustravel.is',
  subject: 'Fjármálasvið',
  snippet: 'Okkur vantar afrit af greiddum reikningum 16.06.2026 krónur 27110 29.06.2026 krónur 8410 06.07.2026 krónur 8410',
  folder: 'INBOX'
}, { sites: SITES, openItems: [] });
ok('BusTravel afrit → Bustravel site via domain', bus.op === 'create' && bus.customer_nafn === 'Bustravel Iceland ehf.');
ok('BusTravel tags bokhald', bus.tags.indexOf('bokhald') !== -1);

const bus2 = V.classifyEmailTask({
  id: 47087, sender_email: 'gudbjorg@bustravel.is', subject: 'Fjármálasvið',
  snippet: 'Okkur vantar afrit af greiddum reikning 16.06.2026 krónur 27110', folder: 'INBOX'
}, { sites: SITES, openItems: [{ id: 705, status: 'nytt', title: 'Fjármálasvið', customer_nafn: 'Bustravel Iceland ehf.', channel_ref: 'email:45667' }] });
ok('BusTravel ítrekun → notes on existing, not a second ticket', bus2.op === 'notes' && bus2.id === 705);

const gk = V.classifyEmailTask({
  id: 47161, sender_name: 'Davíð Vilmundarson', sender_email: 'david.vilmundarson@greenkey.is',
  subject: 'Re: brunakerfi',
  snippet: 'Geturðu líka sent mér afrit af þeim teikningum sem þú hefur unnið fyrir húsnæðið? Þá á ég meðal annars við neyðarteikningar.',
  folder: 'INBOX'
}, { sites: SITES, openItems: [] });
ok('GreenKey teikningar → brunakerfi, no fake site', gk.op === 'create' && gk.flokkur === 'brunakerfi' && gk.customer_base_id == null);
ok('GreenKey keeps sender as nafn', gk.customer_nafn === 'Davíð Vilmundarson');

const kj = V.classifyEmailTask({
  id: 48941, sender_name: 'Rakel Ragnarsdóttir', sender_email: 'raks@simnet.is',
  subject: 'Re: Reykskynjarar og slökkvitæki',
  snippet: 'Það má senda reikning á okkur: Kennitala húsfélagsins er 510483-0499 - Kjarrhólmi 14 Kópavogi. Þetta voru 7 samtengjanlegir reykskynjarar, 2 léttvatns slökkvitæki og 1 lítið kolsýrutæki.',
  folder: 'INBOX'
}, { sites: SITES, openItems: [] });
ok('Kjarrhólmi 14 via kennitala, not Kjarrhólmi 18', kj.op === 'create' && kj.customer_nafn === 'Húsfélagið Kjarrhólmi 14' && kj.customer_base_id === 301);
ok('Kjarrhólmi rukka+þjónusta', kj.tags.indexOf('eftir_ad_rukka') !== -1 && kj.type === 'heimsokn');
ok('Kjarrhólmi 18 not picked', kj.customer_nafn !== 'Húsfélagið Kjarrhólmi 18');

const st = V.classifyEmailTask({
  id: 48935, sender_name: 'Guðbjörg Kristín Arnardóttir', sender_email: 'gudbjorg.kristin@gmail.com',
  subject: 'Re: Eftirlit-Stóragerði 20',
  snippet: 'Var eftirliti lokið? Það pípir í einhverjum skynjara.',
  folder: 'INBOX'
}, { sites: SITES, openItems: [{ id: 47, status: 'nytt', title: 'Eftirlit-Stóragerði 20', customer_nafn: 'Guðbjörg Kristín Arnardóttir', archived_at: '2026-07-10', channel_ref: 'email:15647' }] });
ok('Stóragerði follow-up is new (old one archived)', st.op === 'create' && st.customer_nafn === 'Húsf. Stóragerði 20');
ok('Stóragerði important heimsókn', st.important === true && st.type === 'heimsokn');
ok('Stóragerði important is default-on', st.defaultOn === true);

const sent = V.classifyEmailTask({
  id: 46516, sender_email: 'eldklar@eldklar.is', subject: 'Úttektarskýrsla — E Fasteignafélag v/Norðurhella 17',
  snippet: 'Meðfylgjandi er úttektarskýrsla', folder: 'SENT'
}, { sites: SITES, openItems: [] });
ok('Our SENT report is not a board ticket', sent.op === 'skip');

ok('Center kt still does not pick a hotel', V.matchByKt('450905-1430', SITES) == null);

console.log(failed ? '\nFAIL ' + failed : '\nOK');
process.exit(failed ? 1 : 0);
