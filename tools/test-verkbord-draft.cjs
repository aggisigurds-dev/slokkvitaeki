#!/usr/bin/env node
'use strict';
/**
 * Keep in sync with forvinna/Draft helpers in js/patches/231-verkbord.js
 * Site lock is exact foldName match only — never kennitala merge (Center Hotel).
 */
const DRAFT_MARK = 'DRAFT|';
const WORKER_SENTINELS = { '': true, Allir: true, allir: true, nema_agnar: true };

function foldName(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function parseDraftSummary(s) {
  if (!s || String(s).indexOf(DRAFT_MARK) !== 0) return null;
  try {
    const o = JSON.parse(String(s).slice(DRAFT_MARK.length));
    return o && typeof o === 'object' ? o : null;
  } catch (_) { return null; }
}
function encodeDraftSummary(pack) {
  return DRAFT_MARK + JSON.stringify(pack || {});
}
function pickSite(nafn, rows) {
  const hits = (rows || []).filter((x) => foldName(x.nafn) === foldName(nafn));
  if (hits.length === 1) return { site: hits[0], ambiguous: false };
  if (hits.length > 1) return { site: null, ambiguous: true };
  return { site: null, ambiguous: false };
}
function buildVilla(r, pack) {
  const blob = String((r && r.title) || '') + '\n' + String((r && r.notes) || '');
  const wantInv = /reikning|afrit|invoice|kröfu/i.test(blob);
  const wantRep = /sk[yý]rsl|úttekt|teikning/i.test(blob);
  const site = String((r && r.customer_nafn) || '').trim() || 'staðnum';
  const bits = [];
  if (pack.ambiguous) {
    bits.push('Fleiri en einn staður passaði við nafnið — ekkert valið (Center/kt-merge bannað). Tengdu nákvæmt fyrirtæki.');
  }
  if (wantInv && pack.invoice) bits.push('Beðið um reikning. Fannst ' + pack.invoice.label + ' á ' + site + '.');
  else if (wantInv && !pack.invoice) bits.push('Beðið um reikning. Ekkert úttektarreikningur fannst á ' + site + ' (leitað aðeins á þessum stað).');
  if (wantRep && pack.report) bits.push('Beðið um skýrslu. Fannst ' + pack.report.label + ' á ' + site + '.');
  else if (wantRep && !pack.report) bits.push('Beðið um skýrslu. Engin úttektarskýrsla fannst á ' + site + '.');
  if (!bits.length) {
    if (pack.invoice || pack.report) bits.push('Skjöl fundin á ' + site + (pack.invoice ? ': ' + pack.invoice.label : '') + (pack.report ? (pack.invoice ? ' · ' : ': ') + pack.report.label : '') + '.');
    else if (site !== 'staðnum') bits.push('Tengdur staður: ' + site + '. Reikningur og skýrsla ekki fundin hér — athugaðu nafn eða hlaða inn viðhengi.');
    else bits.push('Ekkert fyrirtæki tengt. Tengdu stað svo hægt sé að finna reikning og skýrslu.');
  }
  return bits.join(' ');
}
function buildReplyDraft(r, pack) {
  const nafn = String((r && r.customer_nafn) || '').trim() || 'þið';
  const lines = ['Góðan dag,', '', 'Takk fyrir póstinn.'];
  if (pack.invoice || pack.report) {
    lines.push('Hér eru skjölin sem við fundum:');
    if (pack.invoice) lines.push('- Reikningur: ' + pack.invoice.label + (pack.invoice.url ? ' — ' + pack.invoice.url : ''));
    if (pack.report) lines.push('- Skýrsla: ' + pack.report.label + (pack.report.url ? ' — ' + pack.report.url : ''));
  } else {
    lines.push('Við erum að ganga frá skjölinum og sendum þau strax og þau eru tilbúin.');
  }
  if (pack.villa) { lines.push('', pack.villa); }
  lines.push('', 'Bestu kveðjur,', 'Brunahólf Slökkvitæki');
  return lines.join('\n');
}
function hasDraftTag(r) {
  let t = r && r.tags;
  if (typeof t === 'string') { try { t = JSON.parse(t); } catch (_) { t = []; } }
  return Array.isArray(t) && t.indexOf('draft') !== -1;
}
function draftPackIsUseful(pack, r) {
  if (!pack) return false;
  if (pack.invoice || pack.report || pack.ambiguous) return true;
  const th = pack.thread || [];
  for (let i = 0; i < th.length; i++) {
    if (String((th[i] && th[i].text) || '').trim()) return true;
  }
  if (/Forvinna klikkaði/i.test(String(pack.villa || ''))) return true;
  if (hasDraftTag(r)) return true;
  const reply = String(pack.reply || '').trim();
  if (reply && r) {
    const expected = String(buildReplyDraft(r, pack) || '').trim();
    if (reply !== expected) return true;
  }
  return false;
}
function draftPanelDefaultOpen(pack, r, busy) {
  if (busy && !pack) return false;
  return draftPackIsUseful(pack, r);
}
function assignedForNew(worker) {
  const s = String(worker == null ? '' : worker).trim();
  return WORKER_SENTINELS[s] ? null : (s || null);
}
function hasOldReportYear(s) {
  return /(?:^|[^\d])(2023|2024|2025)(?:[^\d]|$)/.test(String(s == null ? '' : s));
}
function isOldYearReport(r) {
  if (!r || r._vd) return false;
  const blob = String(r.title || '') + '\n' + String(r.notes || '') + '\n' + String(r.channel_ref || '');
  if (!hasOldReportYear(blob)) return false;
  if (/sk[yý]rsl|úttektarskyr|uttektarskyr|tengja úttekt/i.test(blob)) return true;
  if (r.type === 'skyrsla') return true;
  const t = r.tags;
  return (Array.isArray(t) ? t : []).indexOf('senda_skyrslur') !== -1;
}

let failed = 0;
function ok(name, cond, detail) {
  if (cond) console.log('  OK  ' + name);
  else { failed++; console.log('  FAIL ' + name + (detail ? ' — ' + detail : '')); }
}

const pack = {
  v: 1,
  invoice: { id: 11, saleId: 99, date: '2026-08-01', url: 'https://example/inv', label: 'Reikningur R-000314 · 12.345 kr' },
  report: { id: 22, year: 2026, date: '2026-06-01', url: 'https://example/rep', label: 'Úttektarskýrsla 2026' },
  thread: [{ at: '2026-08-20', from: 'bokhald@example.is', mine: false, text: 'Vantar afrit' }],
  villa: '',
  reply: 'Góðan dag,',
  links: [{ label: 'Saga', href: 'https://example/hist' }],
  historyUrl: 'https://example/hist',
  fid: 394,
  ambiguous: false
};
const encoded = encodeDraftSummary(pack);
const parsed = parseDraftSummary(encoded);
ok('encode starts with DRAFT|', encoded.indexOf('DRAFT|') === 0);
ok('parse roundtrip invoice label', parsed && parsed.invoice && parsed.invoice.label === pack.invoice.label);
ok('parse roundtrip report year', parsed && parsed.report && parsed.report.year === 2026);
ok('parse roundtrip fid', parsed && parsed.fid === 394);
ok('legacy sparkle summary is not a draft pack', parseDraftSummary('✨ Vantar afrit af reikningi') == null);
ok('plain notes are not a draft pack', parseDraftSummary('Vantar skýrslu') == null);
ok('empty is not a draft pack', parseDraftSummary('') == null);
ok('broken JSON after mark is null', parseDraftSummary('DRAFT|{nope') == null);

const found = buildVilla(
  { title: 'Re: Reikningur er fallinn á eindaga', customer_nafn: 'Fornhagi 11-17', notes: 'vantar afrit' },
  { invoice: pack.invoice, report: null, ambiguous: false }
);
ok('villa names found invoice', /Fannst Reikningur R-000314/.test(found) && /Fornhagi/.test(found));

const missing = buildVilla(
  { title: 'Re: Reikningur', customer_nafn: 'Fornhagi 11-17' },
  { invoice: null, report: null, ambiguous: false }
);
ok('villa says invoice missing on this site only', /Ekkert úttektarreikningur fannst á Fornhagi/.test(missing) && /þessum stað/.test(missing));

const wantRep = buildVilla(
  { title: 'Senda teikningar', customer_nafn: 'GreenKey' },
  { invoice: null, report: pack.report, ambiguous: false }
);
ok('villa names found report', /Fannst Úttektarskýrsla 2026/.test(wantRep));

const missRep = buildVilla(
  { title: 'Vantar skýrslu', customer_nafn: 'Plaza' },
  { invoice: null, report: null, ambiguous: false }
);
ok('villa says report missing', /Engin úttektarskýrsla fannst á Plaza/.test(missRep));

const amb = buildVilla(
  { title: 'Reikningur', customer_nafn: 'Center Hótel' },
  { invoice: null, report: null, ambiguous: true }
);
ok('ambiguous villa forbids kt-merge', /Center\/kt-merge bannað/.test(amb) && /ekkert valið/i.test(amb));

const SITES = [
  { id: 193, nafn: 'Center Hótel - Plaza', kennitala: '450905-1430' },
  { id: 195, nafn: 'Center Hótel - Arnarhvoll', kennitala: '450905-1430' },
  { id: 197, nafn: 'Center Hótel - Grandi', kennitala: '450905-1430' },
  { id: 1930, nafn: 'Center Hotel - Plaza', kennitala: '450905-1430' },
  { id: 394, nafn: 'Fornhagi 11-17', kennitala: '590169-2069' },
  { id: 774, nafn: 'Húsfélagið Kjarrhólmi 14', kennitala: '510483-0499' },
  { id: 1807, nafn: 'Húsfélagið Kjarrhólmi 18', kennitala: '510483-9999' }
];

const fornhagi = pickSite('Fornhagi 11-17', SITES);
ok('exact Fornhagi picks #394', fornhagi.site && fornhagi.site.id === 394 && !fornhagi.ambiguous);

const plazaExact = pickSite('Center Hótel - Plaza', SITES);
ok('Plaza exact name is ambiguous (Hótel vs Hotel spelling twins)', plazaExact.ambiguous === true && plazaExact.site == null);
ok('Plaza unique when only one folded name exists', pickSite('Center Hótel - Plaza', SITES.filter((s) => s.id !== 1930)).site && pickSite('Center Hótel - Plaza', SITES.filter((s) => s.id !== 1930)).site.id === 193);

const group = pickSite('Center Hótel', SITES);
ok('group name Center Hótel picks nothing (not a kt merge)', group.site == null && group.ambiguous === false);

const grandi = pickSite('Center Hótel - Grandi', SITES);
ok('exact Grandi unique', grandi.site && grandi.site.id === 197 && !grandi.ambiguous);

const kj14 = pickSite('Húsfélagið Kjarrhólmi 14', SITES);
ok('Kjarrhólmi 14 not 18', kj14.site && kj14.site.id === 774);
ok('Kjarrhólmi 14 query does not hit 18', pickSite('Húsfélagið Kjarrhólmi 14', SITES).site.id !== 1807);

ok('2023 tengja still old-year report', isOldYearReport({
  title: 'Tengja úttektarskýrslu — Interroll Nordic 2023',
  tags: ['senda_skyrslur']
}));
ok('assignedForNew(nema_agnar) is null, not a person', assignedForNew('nema_agnar') === null);
ok('assignedForNew(allir) is null', assignedForNew('allir') === null);
ok('assignedForNew(Anni) stays Anni', assignedForNew('Anni') === 'Anni');

const orkuRow = { title: 'orkureitur senda reikninga', customer_nafn: 'orkureitur', notes: '', tags: [] };
const orkuPack = {
  v: 1, invoice: null, report: null, thread: [], villa: '', reply: '',
  links: [{ label: 'Samskipta-/viðskiptasaga', href: 'https://example/hist' }],
  historyUrl: 'https://example/hist', fid: 1, ambiguous: false
};
orkuPack.villa = buildVilla(orkuRow, orkuPack);
orkuPack.reply = buildReplyDraft(orkuRow, orkuPack);
ok('orkureitur-style empty pack is not useful', draftPackIsUseful(orkuPack, orkuRow) === false);
ok('orkureitur empty Forvinna stays collapsed', draftPanelDefaultOpen(orkuPack, orkuRow, false) === false);
ok('null pack is not useful', draftPackIsUseful(null, orkuRow) === false);
ok('still-loading does not open the panel', draftPanelDefaultOpen(null, orkuRow, true) === false);
ok('invoice pack is useful', draftPackIsUseful(pack, { title: 'Reikningur', customer_nafn: 'Fornhagi 11-17' }) === true);
ok('useful pack defaults open', draftPanelDefaultOpen(pack, { title: 'Reikningur' }, false) === true);
ok('report-only pack is useful', draftPackIsUseful({
  v: 1, invoice: null, report: pack.report, thread: [], villa: '', reply: '', links: [], historyUrl: '', fid: 1, ambiguous: false
}, { title: 'Skýrsla' }) === true);
ok('thread text is useful', draftPackIsUseful({
  v: 1, invoice: null, report: null, thread: [{ text: 'Vantar afrit' }], villa: '', reply: '', links: [], historyUrl: '', fid: null, ambiguous: false
}, orkuRow) === true);
ok('empty thread is not useful', draftPackIsUseful({
  v: 1, invoice: null, report: null, thread: [{ text: '  ' }], villa: '', reply: '', links: [], historyUrl: '', fid: null, ambiguous: false
}, orkuRow) === false);
ok('ambiguous pack is useful', draftPackIsUseful({
  v: 1, invoice: null, report: null, thread: [], villa: amb, reply: '', links: [], historyUrl: '', fid: null, ambiguous: true
}, { title: 'Reikningur', customer_nafn: 'Center Hótel' }) === true);
ok('klikkuð Forvinna is useful', draftPackIsUseful({
  v: 1, invoice: null, report: null, thread: [], villa: 'Forvinna klikkaði: timeout', reply: '', links: [], historyUrl: '', fid: null, ambiguous: false
}, orkuRow) === true);
ok('Draft tag keeps Forvinna useful', draftPackIsUseful(orkuPack, { title: 'orkureitur', tags: ['draft'] }) === true);
const customRow = { title: 'orkureitur senda reikninga', customer_nafn: 'orkureitur', tags: [] };
ok('custom reply is useful', draftPackIsUseful(Object.assign({}, orkuPack, { reply: 'Halló, hér er afritið.' }), customRow) === true);
ok('generic auto-reply is not useful', draftPackIsUseful(orkuPack, orkuRow) === false);

console.log(failed ? '\nFAIL ' + failed : '\nOK');
process.exit(failed ? 1 : 0);
