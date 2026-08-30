#!/usr/bin/env node
'use strict';
/**
 * Keep in sync with isOldYearReport in js/patches/231-verkbord.js
 */
function hasOldReportYear(s) {
  return /(?:^|[^\d])(2023|2024|2025)(?:[^\d]|$)/.test(String(s == null ? '' : s));
}
function rowTags(r) {
  const t = r && r.tags;
  return Array.isArray(t) ? t : [];
}
function isOldYearReport(r) {
  if (!r || r._vd) return false;
  const blob = String(r.title || '') + '\n' + String(r.notes || '') + '\n' + String(r.channel_ref || '');
  if (!hasOldReportYear(blob)) return false;
  if (/sk[yý]rsl|úttektarskyr|uttektarskyr|tengja úttekt/i.test(blob)) return true;
  if (r.type === 'skyrsla') return true;
  return rowTags(r).indexOf('senda_skyrslur') !== -1;
}

let failed = 0;
function ok(name, cond) {
  if (cond) console.log('  OK  ' + name);
  else { failed++; console.log('  FAIL ' + name); }
}

ok('2023 tengja', isOldYearReport({ title: 'Tengja úttektarskýrslu — Interroll Nordic 2023', tags: ['senda_skyrslur'] }));
ok('2024 tengja', isOldYearReport({ title: 'Tengja úttektarskýrslu — Dra ehf 2024' }));
ok('2025 tengja', isOldYearReport({ title: 'Tengja úttektarskýrslu — Bæjarlind 12 2025' }));
ok('derived 2024', isOldYearReport({ title: 'Vantar skýrslu', channel_ref: 'derived:vantar_skyrslu:2024:12' }));
ok('2026 derived stays', !isOldYearReport({ title: 'Vantar úttektarskýrslu 2026 — Plaza', channel_ref: 'derived:vantar_skyrslu:2026:193' }));
ok('senda tilbúna án árs stays', !isOldYearReport({ title: 'Senda tilbúna úttektarskýrslu — Ferðafélag Íslands', tags: ['senda_skyrslur'] }));
ok('klára 2026 stays', !isOldYearReport({ title: 'Klára skýrslutexta + úttekt — Tjarnarból 2', notes: 'steps_2026.uttekt=true' }));
ok('reikningur póstur stays', !isOldYearReport({ title: 'Re: Reikningur', tags: ['senda_skyrslur'] }));
ok('verkdagbok stays', !isOldYearReport({ _vd: true, title: 'Úttekt 2023' }));
ok('kt digits are not a year', !isOldYearReport({ title: 'Kúnnaskrá 5104830499', tags: ['senda_skyrslur'] }));

console.log(failed ? '\nFAIL ' + failed : '\nOK');
process.exit(failed ? 1 : 0);
