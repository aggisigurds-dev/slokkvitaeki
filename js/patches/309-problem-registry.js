/* === PROBLEM REGISTRY v1 (2026-08-20) ===
 * A nervous system for the app: records every problem the moment it happens into
 * Supabase `app_problems`, so nothing fails silently and the daily health sweep
 * (+ Claude) can see what broke, where, when and for whom — instead of Agnar
 * hearing it from staff/customers the next morning.
 *
 *   window.logProblem(kind, detail, opts?)   — call at any failure point.
 *       kind:   short slug ('blank_invoice_blocked', 'send_failed', 'kt_not_found'…)
 *       detail: free text (NO personal kennitölur — kinds + context only)
 *       opts:   { severity:'error'|'warn'|'info', page, fingerprint }
 *
 * Also auto-captures window 'error' + 'unhandledrejection'. Throttled/deduped
 * (same fingerprint within 60 s is dropped) so a loop can't spam the table, and
 * it NEVER throws back into the app. Loaded right after db.js so it catches
 * problems from every patch that follows.
 */
(() => {
  if (window.__problemRegistry) return;
  window.__problemRegistry = true;

  function sb() { return (window.DB && window.DB.sb) || null; }
  function who() { try { return localStorage.getItem('bh_me') || ''; } catch (_) { return ''; } }
  function page() {
    try {
      var p = location.hash || '';
      if (window.MasterView && MasterView.current) p += ' ' + MasterView.current;
      return p;
    } catch (_) { return location.hash || ''; }
  }

  var _recent = new Map();   // fingerprint -> last ts (throttle window)
  var _queue = [];           // rows logged before DB.sb was ready
  var WINDOW_MS = 60000;

  function row(kind, detail, opts) {
    opts = opts || {};
    var fp = String(opts.fingerprint || (kind + '|' + String(detail == null ? '' : detail).slice(0, 80)));
    return {
      _fp: fp,
      source_app: 'slokkvitaeki',
      kind: String(kind || 'unknown').slice(0, 80),
      severity: opts.severity || 'error',
      detail: detail == null ? null : String(detail).slice(0, 2000),
      page: String(opts.page || page() || '').slice(0, 200),
      who: who().slice(0, 80),
      ua: (navigator.userAgent || '').slice(0, 300),
      fingerprint: fp.slice(0, 200)
    };
  }

  async function flush() {
    var S = sb();
    if (!S || !_queue.length) return;
    var batch = _queue.splice(0, _queue.length).map(function (r) { var c = Object.assign({}, r); delete c._fp; return c; });
    try { await S.from('app_problems').insert(batch); } catch (_) { /* swallow — logging must never break the app */ }
  }

  function logProblem(kind, detail, opts) {
    try {
      var r = row(kind, detail, opts);
      var now = Date.now();
      var last = _recent.get(r._fp) || 0;
      if (now - last < WINDOW_MS) return;                 // duplicate within the window → drop
      _recent.set(r._fp, now);
      if (_recent.size > 300) { _recent.forEach(function (v, k) { if (now - v > WINDOW_MS) _recent.delete(k); }); }
      _queue.push(r);
      flush();
    } catch (_) { /* never throw into the app */ }
  }
  window.logProblem = logProblem;

  // Safety net for problems logged before DB.sb existed (early boot errors):
  // retry the flush for ~30 s, then stop (DB is surely up by then; logProblem
  // also flushes directly on every call).
  var tries = 0;
  var iv = setInterval(function () { tries++; flush(); if (!_queue.length || tries > 20) clearInterval(iv); }, 1500);

  window.addEventListener('error', function (e) {
    if (!e) return;
    var msg = e.message || (e.error && e.error.message) || 'error';
    if (/ResizeObserver loop|^Script error\.?$/.test(msg)) return;   // known browser noise, not our bug
    var where = e.filename ? ' @ ' + String(e.filename).split('/').pop() + ':' + e.lineno : '';
    logProblem('js_error', msg + where, { fingerprint: 'jserr|' + msg });
  });
  window.addEventListener('unhandledrejection', function (e) {
    var reason = e && e.reason;
    var msg = (reason && (reason.message || reason)) || 'unhandledrejection';
    logProblem('promise_rejection', String(msg).slice(0, 300), { fingerprint: 'rej|' + String(msg).slice(0, 80) });
  });

  console.log('[problem-registry] installed — window.logProblem(kind, detail) live');
})();
/* === END PROBLEM REGISTRY === */
