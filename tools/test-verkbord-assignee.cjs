#!/usr/bin/env node
'use strict';
/**
 * Keep in sync with assignee helpers in js/patches/231-verkbord.js
 * (assignedForNew, defaultAddWorker, addWorkerOptionsHtml, editorAssigneeValue,
 * resolveEditorRowId, keepSelectedId, workerFilterOptionsHtml, taggedWorkers,
 * composeTags, matchesWorker) and isOldYearReport / tools/test-old-year-report.cjs
 */
const OLD_JOB_MS = 30 * 24 * 60 * 60 * 1000;
const WORKER_SENTINELS = { '': true, Allir: true, allir: true, nema_agnar: true, nema_ai: true };
function canonWorker(v) {
  const s = String(v == null ? '' : v).trim();
  return s === 'Sara' ? 'Bjarndís' : s;
}
function canonFilter(v) {
  const s = canonWorker(v);
  if (s === 'Allir') return 'allir';
  if (s === 'nema_agnar') return 'nema_ai';
  return s;
}
function normAssignee(v) {
  const s = canonWorker(v);
  return WORKER_SENTINELS[s] ? '' : s;
}
function assignedForNew(worker) {
  return normAssignee(worker) || null;
}
function defaultAddWorker(filter, stateWorker) {
  return assignedForNew(filter != null ? filter : stateWorker);
}
function addWorkerOptionsHtml(filter, stateWorker) {
  const cur = defaultAddWorker(filter, stateWorker) || '';
  let html = '<option value=""' + (!cur ? ' selected' : '') + '>—</option>';
  for (let i = 0; i < WORKERS.length; i++) {
    const w = WORKERS[i];
    html += '<option value="' + w + '"' + (cur === w ? ' selected' : '') + '>' + w + '</option>';
  }
  return html;
}
const AI_WORKER = 'Charlize';
const WORKERS = ['Agnar', 'Charlize', 'Hákon', 'Binni', 'Anni', 'Bjarndís'];
const WORKER_FILTERS = [
  ['allir', 'Allir'],
  ['Agnar', 'Agnar'],
  ['nema_ai', 'Allir án Ai'],
  ['Charlize', 'Charlize'],
  ['Hákon', 'Hákon'],
  ['Binni', 'Binni'],
  ['Anni', 'Anni'],
  ['Bjarndís', 'Bjarndís']
];
function knownWorkerFilter(v) {
  const s = canonFilter(v);
  if (s === 'nema_ai' || s === 'allir') return true;
  for (let i = 0; i < WORKERS.length; i++) if (WORKERS[i] === s) return true;
  return false;
}
function workerFilterOptionsHtml(cur) {
  const now = knownWorkerFilter(cur) ? canonFilter(cur) : 'nema_ai';
  let html = '';
  for (let i = 0; i < WORKER_FILTERS.length; i++) {
    const val = WORKER_FILTERS[i][0], label = WORKER_FILTERS[i][1];
    html += '<option value="' + val + '"' + (now === val ? ' selected' : '') + '>' + label + '</option>';
  }
  return html;
}
function assigneeOptionsHtml(r) {
  const cur = editorAssigneeValue(r);
  const names = WORKERS.slice();
  if (cur && names.indexOf(cur) === -1) names.push(cur);
  let html = '<option value=""' + (!cur ? ' selected' : '') + '>—</option>';
  for (let i = 0; i < names.length; i++) {
    const w = names[i];
    html += '<option value="' + w + '"' + (cur === w ? ' selected' : '') + '>' + w + '</option>';
  }
  return html;
}
function editorAssigneeValue(r) {
  return normAssignee(r && r.assigned_to);
}
const TAGS = { draft: true, senda_skyrslur: true, gera_tilbod: true };
const WORKER_TAG_PREFIX = 'starfs:';
function rawTagList(r) {
  let t = r && r.tags;
  if (typeof t === 'string') { try { t = JSON.parse(t); } catch (_) { t = []; } }
  if (!Array.isArray(t)) return [];
  const out = [];
  for (let i = 0; i < t.length; i++) {
    const x = t[i];
    if (typeof x !== 'string') continue;
    const s = x.trim();
    if (s && out.indexOf(s) === -1) out.push(s);
  }
  return out;
}
function rowTags(r) {
  return rawTagList(r).filter(function (x) { return TAGS[x]; });
}
function taggedWorkers(r) {
  const names = [];
  const raw = rawTagList(r);
  for (let i = 0; i < raw.length; i++) {
    const t = raw[i];
    if (t.indexOf(WORKER_TAG_PREFIX) !== 0) continue;
    const n = canonWorker(t.slice(WORKER_TAG_PREFIX.length).trim());
    if (!n || WORKER_SENTINELS[n]) continue;
    if (names.indexOf(n) === -1) names.push(n);
  }
  return names;
}
function extraTags(r) {
  return rawTagList(r).filter(function (x) {
    return !TAGS[x] && x.indexOf(WORKER_TAG_PREFIX) !== 0;
  });
}
function composeTags(categoryTags, workers, extras) {
  const cats = [];
  (categoryTags || []).forEach(function (t) {
    if (TAGS[t] && cats.indexOf(t) === -1) cats.push(t);
  });
  const wtags = [];
  (workers || []).forEach(function (n) {
    const name = canonWorker(String(n == null ? '' : n).trim());
    if (!name || WORKER_SENTINELS[name]) return;
    const tok = WORKER_TAG_PREFIX + name;
    if (wtags.indexOf(tok) === -1) wtags.push(tok);
  });
  const rest = [];
  (extras || []).forEach(function (x) {
    if (typeof x === 'string' && x && rest.indexOf(x) === -1) rest.push(x);
  });
  return cats.concat(wtags).concat(rest);
}
function tagsWithCategory(row, nextCats) {
  return composeTags(nextCats, taggedWorkers(row), extraTags(row));
}
function tagsWithWorkers(row, workers) {
  const primary = editorAssigneeValue(row);
  const cleaned = [];
  (workers || []).forEach(function (n) {
    const name = canonWorker(n);
    if (name && name !== primary && cleaned.indexOf(name) === -1) cleaned.push(name);
  });
  return composeTags(rowTags(row), cleaned, extraTags(row));
}
function toggleTaggedWorker(row, name) {
  const n = canonWorker(String(name == null ? '' : name).trim());
  if (!n || WORKER_SENTINELS[n] || n === editorAssigneeValue(row)) {
    return tagsWithWorkers(row, taggedWorkers(row));
  }
  const cur = taggedWorkers(row).slice();
  const i = cur.indexOf(n);
  if (i === -1) cur.push(n); else cur.splice(i, 1);
  return tagsWithWorkers(row, cur);
}
function coerceRowId(raw) {
  if (raw == null || raw === '') return null;
  const s = String(raw);
  if (s.indexOf('vd:') === 0) return s;
  const n = Number(s);
  return Number.isFinite(n) ? n : s;
}
function resolveEditorRowId(el, selId, expandedId) {
  if (el && el.closest) {
    const host = el.closest('[data-id]');
    if (host) {
      const id = coerceRowId(host.getAttribute('data-id'));
      if (id != null) return id;
    }
    if (el.closest('#vb-sel-ed')) {
      const id = coerceRowId(selId);
      if (id != null) return id;
    }
  }
  if (expandedId != null && expandedId !== '') return coerceRowId(expandedId);
  return coerceRowId(selId);
}
function keepSelectedId(selId, visibleRows, allRows) {
  const sid = selId == null || selId === '' ? '' : String(selId);
  if (sid && (allRows || []).some(function (x) { return String(x.id) === sid; })) return selId;
  return (visibleRows && visibleRows.length) ? visibleRows[0].id : null;
}
function isOpen(r) { return r.status !== 'lokad'; }
function isArchived(r) { return !r._vd && !!r.archived_at; }
function isOlderThanMonth(r, now) {
  const t = Date.parse(r && r.created_at);
  if (!Number.isFinite(t)) return false;
  return t < (now != null ? now : Date.now()) - OLD_JOB_MS;
}
function effectiveAssignee(r, now) {
  const named = normAssignee(r && r.assigned_to);
  if (named) return named;
  if (!r || r._vd) return '';
  if (!isOpen(r) || isArchived(r) || r.deleted_at) return '';
  return isOlderThanMonth(r, now) ? AI_WORKER : '';
}
function matchesWorker(r, filter, now) {
  const w = canonFilter(filter);
  if (!w || w === 'allir') return true;
  const who = effectiveAssignee(r, now);
  const tagged = taggedWorkers(r);
  if (w === 'nema_ai') {
    if (who !== AI_WORKER) return true;
    for (let i = 0; i < tagged.length; i++) if (tagged[i] !== AI_WORKER) return true;
    return false;
  }
  if (who === w) return true;
  return tagged.indexOf(w) !== -1;
}
function shouldClaim(r, now) {
  if (!isOpen(r) || isArchived(r) || r.deleted_at) return false;
  if (normAssignee(r.assigned_to)) return false;
  return isOlderThanMonth(r, now);
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

const NOW = Date.parse('2026-08-30T12:00:00Z');
function isoDaysAgo(d) {
  return new Date(NOW - d * 86400000).toISOString();
}

let failed = 0;
function ok(name, cond) {
  if (cond) console.log('  OK  ' + name);
  else { failed++; console.log('  FAIL ' + name); }
}

const oldUnassigned = { status: 'nytt', created_at: isoDaysAgo(40), assigned_to: null };
const recentUnassigned = { status: 'nytt', created_at: isoDaysAgo(5), assigned_to: null };
const anniOld = { status: 'nytt', created_at: isoDaysAgo(40), assigned_to: 'Anni' };
const agnarRecent = { status: 'nytt', created_at: isoDaysAgo(5), assigned_to: 'Agnar' };
const charlizeRecent = { status: 'nytt', created_at: isoDaysAgo(5), assigned_to: 'Charlize' };
const allirOld = { status: 'nytt', created_at: isoDaysAgo(40), assigned_to: 'Allir' };
const closedOld = { status: 'lokad', created_at: isoDaysAgo(40), assigned_to: null };
const archivedOld = { status: 'nytt', created_at: isoDaysAgo(40), assigned_to: null, archived_at: isoDaysAgo(1) };
const vdOld = { _vd: true, status: 'nytt', created_at: isoDaysAgo(40), assigned_to: null };
const tengja2023 = {
  title: 'Tengja úttektarskýrslu — Interroll Nordic 2023',
  tags: ['senda_skyrslur'],
  status: 'nytt',
  created_at: isoDaysAgo(21),
  assigned_to: null
};
const sendaNoYear = {
  title: 'Senda tilbúna úttektarskýrslu — Ferðafélag Íslands',
  tags: ['senda_skyrslur'],
  status: 'nytt',
  created_at: isoDaysAgo(10),
  assigned_to: null
};
const derived2026 = {
  title: 'Vantar úttektarskýrslu 2026 — Plaza',
  channel_ref: 'derived:vantar_skyrslu:2026:193',
  status: 'nytt',
  created_at: isoDaysAgo(3),
  assigned_to: null
};

ok('unassigned old → Charlize (AI-bunkinn)', effectiveAssignee(oldUnassigned, NOW) === 'Charlize');
ok('unassigned recent → empty', effectiveAssignee(recentUnassigned, NOW) === '');
ok('Anni old stays Anni', effectiveAssignee(anniOld, NOW) === 'Anni');
ok('Agnar recent stays Agnar', effectiveAssignee(agnarRecent, NOW) === 'Agnar');
ok('Allir sentinel old → Charlize', effectiveAssignee(allirOld, NOW) === 'Charlize');
ok('closed old not stolen', effectiveAssignee(closedOld, NOW) === '');
ok('archived old not stolen', effectiveAssignee(archivedOld, NOW) === '');
ok('verkdagbok not stolen', effectiveAssignee(vdOld, NOW) === '');

ok('nema_ai includes recent unassigned', matchesWorker(recentUnassigned, 'nema_ai', NOW));
ok('nema_ai excludes old unassigned (AI-bunkinn)', !matchesWorker(oldUnassigned, 'nema_ai', NOW));
ok('nema_ai excludes Charlize-assigned', !matchesWorker(charlizeRecent, 'nema_ai', NOW));
ok('nema_ai INCLUDES Agnar-assigned (hann er starfsmaður núna)', matchesWorker(agnarRecent, 'nema_ai', NOW));
ok('nema_ai includes Anni', matchesWorker(anniOld, 'nema_ai', NOW));
// Gamla vistaða gildið á vélunum fjórum má ekki tapa valinu.
ok('gamla nema_agnar gildið þýðist í nema_ai', canonFilter('nema_agnar') === 'nema_ai');
ok('gamalt nema_agnar hegðar sér eins og nema_ai', !matchesWorker(oldUnassigned, 'nema_agnar', NOW));
ok('Charlize filter includes old unassigned', matchesWorker(oldUnassigned, 'Charlize', NOW));
ok('Agnar filter excludes old unassigned (ekki lengur ruslakistan)', !matchesWorker(oldUnassigned, 'Agnar', NOW));
ok('Agnar filter includes Agnar-assigned', matchesWorker(agnarRecent, 'Agnar', NOW));
ok('Agnar filter excludes Anni', !matchesWorker(anniOld, 'Agnar', NOW));
ok('Anni filter matches Anni', matchesWorker(anniOld, 'Anni', NOW));
ok('Anni filter excludes recent unassigned', !matchesWorker(recentUnassigned, 'Anni', NOW));
ok('allir includes AI backlog', matchesWorker(oldUnassigned, 'allir', NOW));
ok('allir includes Anni', matchesWorker(anniOld, 'allir', NOW));

ok('assignedForNew nema_ai is null', assignedForNew('nema_ai') === null);
ok('assignedForNew gamla nema_agnar is null', assignedForNew('nema_agnar') === null);
ok('assignedForNew allir is null', assignedForNew('allir') === null);
ok('assignedForNew empty is null', assignedForNew('') === null);
ok('assignedForNew Allir is null', assignedForNew('Allir') === null);
ok('assignedForNew Agnar is Agnar', assignedForNew('Agnar') === 'Agnar');
ok('assignedForNew Anni is Anni', assignedForNew('Anni') === 'Anni');
ok('default add from Anni filter is Anni', defaultAddWorker('Anni', 'Hákon') === 'Anni');
ok('default add from nema_ai is empty', defaultAddWorker('nema_ai', 'Hákon') === null);
ok('default add from gamla nema_agnar is empty', defaultAddWorker('nema_agnar', 'Hákon') === null);
ok('default add from allir is empty', defaultAddWorker('allir', 'Anni') === null);
ok('default add from Agnar filter is Agnar', defaultAddWorker('Agnar', null) === 'Agnar');
ok('default add falls back to state worker', defaultAddWorker(null, 'Anni') === 'Anni');
ok('default add undefined filter uses state', defaultAddWorker(undefined, 'Binni') === 'Binni');
ok('default add Charlize filter is Charlize', defaultAddWorker('Charlize', 'nema_ai') === 'Charlize');
ok('default add Bjarndís filter is Bjarndís', defaultAddWorker('Bjarndís', 'nema_ai') === 'Bjarndís');
ok('leftover Sara filter still composes as Bjarndís', defaultAddWorker('Sara', 'nema_ai') === 'Bjarndís');
const anniAddHtml = addWorkerOptionsHtml('Anni');
ok('composer select marks Anni selected', /value="Anni" selected/.test(anniAddHtml));
ok('composer select does not mark empty when Anni', !/<option value="" selected>/.test(anniAddHtml));
ok('composer select empty when staff board', /<option value="" selected>/.test(addWorkerOptionsHtml('nema_agnar')));
ok('composer select marks Agnar when Agnar filter', /value="Agnar" selected/.test(addWorkerOptionsHtml('Agnar')));
ok('assignedForNew Binni is Binni', assignedForNew('Binni') === 'Binni');
ok('assignedForNew Charlize is Charlize', assignedForNew('Charlize') === 'Charlize');
ok('assignedForNew Bjarndís is Bjarndís', assignedForNew('Bjarndís') === 'Bjarndís');
ok('assignedForNew leftover Sara is Bjarndís', assignedForNew('Sara') === 'Bjarndís');

const filterHtml = workerFilterOptionsHtml('nema_ai');
ok('filter starts with Allir', filterHtml.indexOf('<option value="allir"') === 0);
ok('filter has Allir overview', /value="allir"[^>]*>Allir</.test(filterHtml));
ok('filter has Agnar after Allir', filterHtml.indexOf('value="Agnar"') > 0);
ok('filter has Allir án Ai', /value="nema_ai"[^>]*>Allir án Ai</.test(filterHtml));
ok('gamla merkimiðanum er hvergi haldið eftir', filterHtml.indexOf('Allir án Agnars') === -1);
ok('filter has Charlize Hákon Binni Anni Bjarndís', ['Charlize', 'Hákon', 'Binni', 'Anni', 'Bjarndís'].every(n => filterHtml.indexOf('>' + n + '<') !== -1));
ok('Charlize comes before Bjarndís', filterHtml.indexOf('>Charlize<') < filterHtml.indexOf('>Bjarndís<') && filterHtml.indexOf('>Bjarndís<') !== -1);
ok('filter has no Sara label', filterHtml.indexOf('>Sara<') === -1);
ok('leftover Sara stored filter selects Bjarndís', /value="Bjarndís" selected/.test(workerFilterOptionsHtml('Sara')));
ok('stored Allir selects overview', /value="allir" selected/.test(workerFilterOptionsHtml('Allir')));
ok('stored allir stays selected', /value="allir" selected/.test(workerFilterOptionsHtml('allir')));
ok('filter has no Andri', filterHtml.indexOf('Andri') === -1);
ok('filter has no Elías', filterHtml.indexOf('Elías') === -1);
ok('unknown stored filter falls back to Allir án Ai', /value="nema_ai" selected/.test(workerFilterOptionsHtml('nobody')));
ok('gamalt vistað nema_agnar velur Allir án Ai', /value="nema_ai" selected/.test(workerFilterOptionsHtml('nema_agnar')));
ok('Binni stored filter stays selected', /value="Binni" selected/.test(workerFilterOptionsHtml('Binni')));
ok('Binni filter matches Binni ticket', matchesWorker({ status: 'nytt', assigned_to: 'Binni', created_at: isoDaysAgo(2) }, 'Binni', NOW));
ok('nema_agnar includes Binni', matchesWorker({ status: 'nytt', assigned_to: 'Binni', created_at: isoDaysAgo(2) }, 'nema_agnar', NOW));
ok('Charlize filter matches moved work', matchesWorker({ status: 'nytt', assigned_to: 'Charlize', created_at: isoDaysAgo(2) }, 'Charlize', NOW));
ok('Bjarndís filter does not take Charlize work', !matchesWorker({ status: 'nytt', assigned_to: 'Charlize', created_at: isoDaysAgo(2) }, 'Bjarndís', NOW));
ok('Bjarndís filter matches Bjarndís', matchesWorker({ status: 'nytt', assigned_to: 'Bjarndís', created_at: isoDaysAgo(1) }, 'Bjarndís', NOW));
ok('leftover Sara assigned_to matches Bjarndís filter', matchesWorker({ status: 'nytt', assigned_to: 'Sara', created_at: isoDaysAgo(1) }, 'Bjarndís', NOW));
ok('assignee dropdown has Charlize', assigneeOptionsHtml({ assigned_to: null }).indexOf('>Charlize<') !== -1);
ok('assignee dropdown has Bjarndís slot', assigneeOptionsHtml({ assigned_to: null }).indexOf('>Bjarndís<') !== -1);
ok('assignee dropdown has no Sara', assigneeOptionsHtml({ assigned_to: null }).indexOf('>Sara<') === -1);
ok('editor leftover Sara shows Bjarndís', editorAssigneeValue({ assigned_to: 'Sara' }) === 'Bjarndís');

const anniOpts = assigneeOptionsHtml(anniOld);
ok('assignee dropdown has Agnar', anniOpts.indexOf('>Agnar<') !== -1);
ok('assignee dropdown has Binni', anniOpts.indexOf('>Binni<') !== -1);
ok('assignee dropdown selects Anni', /value="Anni" selected/.test(anniOpts));
ok('orphan Andri still listed when stored', assigneeOptionsHtml({ assigned_to: 'Andri' }).indexOf('>Andri<') !== -1);

ok('editor shows Allir for old unassigned (not effective Agnar)', editorAssigneeValue(oldUnassigned) === '');
ok('editor shows Agnar only when stored', editorAssigneeValue(agnarRecent) === 'Agnar');
ok('editor shows Anni stored', editorAssigneeValue(anniOld) === 'Anni');
ok('editor treats Allir sentinel as empty', editorAssigneeValue(allirOld) === '');

function fakeEl(map) {
  return { closest: function (sel) { return Object.prototype.hasOwnProperty.call(map, sel) ? map[sel] : null; } };
}
const host821 = { getAttribute: function () { return '821'; } };
ok('editor id from data-id host', resolveEditorRowId(fakeEl({ '[data-id]': host821 }), 1, null) === 821);
ok('VALIÐ MÁL without host uses selId (expandedId was null after selrow)', resolveEditorRowId(fakeEl({ '[data-id]': null, '#vb-sel-ed': {} }), 705, null) === 705);
ok('no event target: expandedId wins', resolveEditorRowId(null, 705, 12) === 12);
ok('no event target: selId when Meira/expanded is null', resolveEditorRowId(null, 705, null) === 705);
ok('old currentEditorId(expandedId-only) would skip VALIÐ MÁL save', resolveEditorRowId(null, 705, null) != null);

const allRows = [{ id: 705, assigned_to: 'Charlize' }, { id: 1, assigned_to: 'Anni' }];
const staffVisible = allRows.filter(x => matchesWorker(x, 'nema_ai', NOW));
ok('nema_ai visible after Charlize-assign is the other ticket', staffVisible.length === 1 && staffVisible[0].id === 1);
ok('keep VALIÐ MÁL on ticket that left nema_ai', keepSelectedId(705, staffVisible, allRows) === 705);
ok('jump only when selected ticket is gone', keepSelectedId(999, staffVisible, allRows) === 1);
ok('empty filter still keeps existing ticket', keepSelectedId(705, [], allRows) === 705);

ok('claim old unassigned', shouldClaim(oldUnassigned, NOW));
ok('do not claim recent', !shouldClaim(recentUnassigned, NOW));
ok('do not claim Anni old', !shouldClaim(anniOld, NOW));
ok('do not claim closed', !shouldClaim(closedOld, NOW));
ok('do not claim archived', !shouldClaim(archivedOld, NOW));

ok('2023 tengja still old-year', isOldYearReport(tengja2023));
ok('2023 tengja is 21 days so not claimed', !shouldClaim(tengja2023, NOW));
ok('2023 tengja hidden from staff by year not Agnar', matchesWorker(tengja2023, 'nema_agnar', NOW));
ok('senda tilbúna án árs stays on staff board', matchesWorker(sendaNoYear, 'nema_agnar', NOW) && !isOldYearReport(sendaNoYear));
ok('2026 derived stays on staff board', matchesWorker(derived2026, 'nema_agnar', NOW) && !isOldYearReport(derived2026));

const agnarTaggedHakon = {
  status: 'nytt', created_at: isoDaysAgo(5), assigned_to: 'Agnar',
  tags: ['draft', 'starfs:Hákon']
};
const hakonAssigned = { status: 'nytt', created_at: isoDaysAgo(2), assigned_to: 'Hákon' };
const oldUnassignedTaggedHakon = {
  status: 'nytt', created_at: isoDaysAgo(40), assigned_to: null,
  tags: ['starfs:Hákon']
};
const aiTaggedAiOnly = {
  status: 'nytt', created_at: isoDaysAgo(3), assigned_to: 'Charlize',
  tags: ['starfs:Charlize']
};

ok('Hákon filter sees Agnar job tagged Hákon', matchesWorker(agnarTaggedHakon, 'Hákon', NOW));
ok('Agnar filter still sees own tagged job', matchesWorker(agnarTaggedHakon, 'Agnar', NOW));
ok('nema_ai shows Agnar job tagged to staff', matchesWorker(agnarTaggedHakon, 'nema_ai', NOW));
ok('Anni filter does not take Hákon tag', !matchesWorker(agnarTaggedHakon, 'Anni', NOW));
ok('Bjarndís filter does not take Hákon tag', !matchesWorker(agnarTaggedHakon, 'Bjarndís', NOW));
ok('tag does not steal assigned_to', effectiveAssignee(agnarTaggedHakon, NOW) === 'Agnar');
ok('rowTags strips starfs prefix from merki', rowTags(agnarTaggedHakon).join(',') === 'draft');
ok('taggedWorkers reads Hákon', taggedWorkers(agnarTaggedHakon).join(',') === 'Hákon');
ok('Hákon assigned still matches Hákon without tag', matchesWorker(hakonAssigned, 'Hákon', NOW));
ok('old unassigned tagged Hákon still claims', shouldClaim(oldUnassignedTaggedHakon, NOW));
ok('old unassigned tagged Hákon is effective Charlize', effectiveAssignee(oldUnassignedTaggedHakon, NOW) === 'Charlize');
ok('Hákon filter sees old unassigned tagged to him', matchesWorker(oldUnassignedTaggedHakon, 'Hákon', NOW));
ok('nema_ai sees old unassigned tagged to staff', matchesWorker(oldUnassignedTaggedHakon, 'nema_ai', NOW));
ok('Anni old is not claimed even with a tag', !shouldClaim(Object.assign({}, anniOld, { tags: ['starfs:Hákon'] }), NOW));
ok('tagging Charlize on Charlize job does not leak to nema_ai', !matchesWorker(aiTaggedAiOnly, 'nema_ai', NOW));

const preserved = tagsWithCategory(agnarTaggedHakon, ['draft', 'senda_skyrslur']);
ok('category rewrite keeps starfs:Hákon', preserved.indexOf('starfs:Hákon') !== -1 && preserved.indexOf('senda_skyrslur') !== -1 && preserved.indexOf('draft') !== -1);
ok('toggle tags Hákon onto Agnar row', toggleTaggedWorker({ assigned_to: 'Agnar', tags: ['draft'] }, 'Hákon').indexOf('starfs:Hákon') !== -1);
ok('toggle does not tag primary assignee', toggleTaggedWorker({ assigned_to: 'Hákon', tags: [] }, 'Hákon').indexOf('starfs:Hákon') === -1);
ok('toggle off removes tag', toggleTaggedWorker(agnarTaggedHakon, 'Hákon').indexOf('starfs:Hákon') === -1);
ok('composeTags drops sentinels', composeTags(['draft'], ['nema_agnar', 'Allir', 'Hákon'], []).join(',') === 'draft,starfs:Hákon');
ok('tagsWithWorkers drops new primary', tagsWithWorkers({ assigned_to: 'Hákon', tags: ['starfs:Hákon', 'draft'] }, ['Hákon', 'Anni']).join(',') === 'draft,starfs:Anni');
ok('starfs:Sara reads as Bjarndís', taggedWorkers({ tags: ['starfs:Sara'] }).join(',') === 'Bjarndís');
ok('compose leftover Sara writes starfs:Bjarndís', composeTags([], ['Sara'], []).join(',') === 'starfs:Bjarndís');
ok('Bjarndís filter sees leftover starfs:Sara tag', matchesWorker({ status: 'nytt', assigned_to: 'Agnar', created_at: isoDaysAgo(2), tags: ['starfs:Sara'] }, 'Bjarndís', NOW));
ok('toggle leftover Sara tag writes starfs:Bjarndís', toggleTaggedWorker({ assigned_to: 'Agnar', tags: [] }, 'Sara').indexOf('starfs:Bjarndís') !== -1);

function tagChipUniverse(rows, filter, now) {
  return rows.filter(function (x) { return matchesWorker(x, filter, now); });
}
const chipRows = [anniOld, agnarRecent, charlizeRecent, oldUnassigned, recentUnassigned];
ok('Agnar TÖG universe excludes Anni', tagChipUniverse(chipRows, 'Agnar', NOW).indexOf(anniOld) === -1);
ok('Agnar TÖG universe includes own', tagChipUniverse(chipRows, 'Agnar', NOW).indexOf(agnarRecent) !== -1);
ok('Agnar TÖG universe no longer includes old unassigned', tagChipUniverse(chipRows, 'Agnar', NOW).indexOf(oldUnassigned) === -1);
ok('Charlize TÖG universe includes own + old unassigned', tagChipUniverse(chipRows, 'Charlize', NOW).indexOf(charlizeRecent) !== -1 && tagChipUniverse(chipRows, 'Charlize', NOW).indexOf(oldUnassigned) !== -1);
ok('Agnar TÖG universe excludes recent unassigned', tagChipUniverse(chipRows, 'Agnar', NOW).indexOf(recentUnassigned) === -1);
ok('Allir TÖG universe is the full set', tagChipUniverse(chipRows, 'allir', NOW).length === chipRows.length);
ok('nema_ai TÖG universe excludes Charlize-assigned', tagChipUniverse(chipRows, 'nema_ai', NOW).indexOf(charlizeRecent) === -1);
ok('nema_ai TÖG universe KEEPS Agnar-assigned', tagChipUniverse(chipRows, 'nema_ai', NOW).indexOf(agnarRecent) !== -1);

const fs = require('fs');
const path = require('path');
const v231src = fs.readFileSync(path.join(__dirname, '..', 'js/patches/231-verkbord.js'), 'utf8');
ok('231 TÖG chips call matchesWorker', v231src.indexOf('inQueue(x) && matchesWorker(x)') !== -1);
ok('231 Allir is a filter option', v231src.indexOf("['allir', 'Allir']") !== -1);
ok('231 Allir is a known filter', /s === 'nema_ai' \|\| s === 'allir'/.test(v231src));
ok('231 merkir AI-bunkann Charlize', v231src.indexOf("const AI_WORKER = 'Charlize'") !== -1);
ok('231 gefur gamla nema_agnar gildinu þýðingu', v231src.indexOf("if (s === 'nema_agnar') return 'nema_ai'") !== -1);
ok('231 sópar gömlum málum á AI_WORKER, ekki Agnar', v231src.indexOf("assigned_to: AI_WORKER") !== -1 && v231src.indexOf("assigned_to: 'Agnar'") === -1);
ok('231 hefur engan harðkóðaðan Allir án Agnars merkimiða', v231src.indexOf("'Allir án Agnars'") === -1);

console.log(failed ? '\nFAIL ' + failed : '\nOK');
process.exit(failed ? 1 : 0);
