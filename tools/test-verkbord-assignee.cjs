#!/usr/bin/env node
'use strict';
/**
 * Keep in sync with assignee helpers in js/patches/231-verkbord.js
 * (assignedForNew, editorAssigneeValue, resolveEditorRowId, keepSelectedId,
 * workerFilterOptionsHtml) and isOldYearReport / tools/test-old-year-report.cjs
 */
const OLD_JOB_MS = 30 * 24 * 60 * 60 * 1000;
const WORKER_SENTINELS = { '': true, Allir: true, allir: true, nema_agnar: true };

function normAssignee(v) {
  const s = String(v == null ? '' : v).trim();
  return WORKER_SENTINELS[s] ? '' : s;
}
function assignedForNew(worker) {
  return normAssignee(worker) || null;
}
const WORKERS = ['Agnar', 'Sara', 'Hákon', 'Binni', 'Anni'];
const WORKER_FILTERS = [
  ['Agnar', 'Agnar'],
  ['nema_agnar', 'Allir án Agnars'],
  ['Sara', 'Sara'],
  ['Hákon', 'Hákon'],
  ['Binni', 'Binni'],
  ['Anni', 'Anni']
];
function knownWorkerFilter(v) {
  if (v === 'nema_agnar') return true;
  for (let i = 0; i < WORKERS.length; i++) if (WORKERS[i] === v) return true;
  return false;
}
function workerFilterOptionsHtml(cur) {
  const now = knownWorkerFilter(cur) ? cur : 'nema_agnar';
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
  return isOlderThanMonth(r, now) ? 'Agnar' : '';
}
function matchesWorker(r, filter, now) {
  const w = filter;
  if (!w || w === 'allir') return true;
  const who = effectiveAssignee(r, now);
  if (w === 'nema_agnar') return who !== 'Agnar';
  return who === w;
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

ok('unassigned old → Agnar', effectiveAssignee(oldUnassigned, NOW) === 'Agnar');
ok('unassigned recent → empty', effectiveAssignee(recentUnassigned, NOW) === '');
ok('Anni old stays Anni', effectiveAssignee(anniOld, NOW) === 'Anni');
ok('Agnar recent stays Agnar', effectiveAssignee(agnarRecent, NOW) === 'Agnar');
ok('Allir sentinel old → Agnar', effectiveAssignee(allirOld, NOW) === 'Agnar');
ok('closed old not stolen', effectiveAssignee(closedOld, NOW) === '');
ok('archived old not stolen', effectiveAssignee(archivedOld, NOW) === '');
ok('verkdagbok not stolen', effectiveAssignee(vdOld, NOW) === '');

ok('nema_agnar includes recent unassigned', matchesWorker(recentUnassigned, 'nema_agnar', NOW));
ok('nema_agnar excludes old unassigned', !matchesWorker(oldUnassigned, 'nema_agnar', NOW));
ok('nema_agnar excludes Agnar-assigned', !matchesWorker(agnarRecent, 'nema_agnar', NOW));
ok('nema_agnar includes Anni', matchesWorker(anniOld, 'nema_agnar', NOW));
ok('Agnar filter includes old unassigned', matchesWorker(oldUnassigned, 'Agnar', NOW));
ok('Agnar filter includes Agnar-assigned', matchesWorker(agnarRecent, 'Agnar', NOW));
ok('Agnar filter excludes Anni', !matchesWorker(anniOld, 'Agnar', NOW));
ok('Anni filter matches Anni', matchesWorker(anniOld, 'Anni', NOW));
ok('Anni filter excludes recent unassigned', !matchesWorker(recentUnassigned, 'Anni', NOW));
ok('allir includes Agnar backlog', matchesWorker(oldUnassigned, 'allir', NOW));
ok('allir includes Anni', matchesWorker(anniOld, 'allir', NOW));

ok('assignedForNew nema_agnar is null', assignedForNew('nema_agnar') === null);
ok('assignedForNew allir is null', assignedForNew('allir') === null);
ok('assignedForNew empty is null', assignedForNew('') === null);
ok('assignedForNew Allir is null', assignedForNew('Allir') === null);
ok('assignedForNew Agnar is Agnar', assignedForNew('Agnar') === 'Agnar');
ok('assignedForNew Anni is Anni', assignedForNew('Anni') === 'Anni');
ok('assignedForNew Binni is Binni', assignedForNew('Binni') === 'Binni');

const filterHtml = workerFilterOptionsHtml('nema_agnar');
ok('filter starts with Agnar', filterHtml.indexOf('<option value="Agnar"') === 0);
ok('filter has Allir án Agnars', /value="nema_agnar"[^>]*>Allir án Agnars</.test(filterHtml));
ok('filter has Sara Hákon Binni Anni', ['Sara', 'Hákon', 'Binni', 'Anni'].every(n => filterHtml.indexOf('>' + n + '<') !== -1));
ok('filter has no everyone-Allir', !/>Allir</.test(filterHtml));
ok('filter has no Andri', filterHtml.indexOf('Andri') === -1);
ok('filter has no Elías', filterHtml.indexOf('Elías') === -1);
ok('unknown stored filter falls back to Allir án Agnars', /value="nema_agnar" selected/.test(workerFilterOptionsHtml('allir')));
ok('Binni stored filter stays selected', /value="Binni" selected/.test(workerFilterOptionsHtml('Binni')));
ok('Binni filter matches Binni ticket', matchesWorker({ status: 'nytt', assigned_to: 'Binni', created_at: isoDaysAgo(2) }, 'Binni', NOW));
ok('nema_agnar includes Binni', matchesWorker({ status: 'nytt', assigned_to: 'Binni', created_at: isoDaysAgo(2) }, 'nema_agnar', NOW));

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

const allRows = [{ id: 705, assigned_to: 'Agnar' }, { id: 1, assigned_to: 'Anni' }];
const staffVisible = allRows.filter(x => matchesWorker(x, 'nema_agnar', NOW));
ok('nema_agnar visible after Agnar-assign is the other ticket', staffVisible.length === 1 && staffVisible[0].id === 1);
ok('keep VALIÐ MÁL on ticket that left nema_agnar', keepSelectedId(705, staffVisible, allRows) === 705);
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

console.log(failed ? '\nFAIL ' + failed : '\nOK');
process.exit(failed ? 1 : 0);
