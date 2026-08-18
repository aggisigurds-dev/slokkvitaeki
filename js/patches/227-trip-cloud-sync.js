/* 227-trip-cloud-sync.js — keep the company-inspection working state SAFE.
 *
 * All inspection progress on the fyrirtæki page (per-tæki Hleðsla/Yfirferð/Nýtt
 * choices + the cost-calculator trip state: notes, skoðunaraðili, mánuður/dags,
 * akstur, skýrslugerð, afsláttur, aukalínur) is stored by patches 129 & 131 in
 *   localStorage['slokk_trip_<coId>']
 * — instant, but LOCAL ONLY. If the phone clears its cache, the app is reopened
 * on another device, or you switch mid-route, that work is gone.
 *
 * This patch mirrors every slokk_trip_* write to the cloud (Supabase via
 * AppSettings.inspection_trips) and restores it on any device — newest-wins by a
 * stamped _ts. No change needed in 129/131: we wrap localStorage.setItem, so
 * every existing save is automatically backed up. "Always on the run" → safe.
 */
(function () {
  'use strict';
  if (window.__tripCloudSync) return;
  window.__tripCloudSync = true;

  var KEY = 'inspection_trips';      // AppSettings (Supabase) key
  var PREFIX = 'slokk_trip_';
  function AS() { return window.AppSettings; }

  var origSet = localStorage.setItem.bind(localStorage);
  var origGet = localStorage.getItem.bind(localStorage);
  var origRemove = localStorage.removeItem.bind(localStorage);

  // Stamp an _ts into the stored trip object so newest-wins works across devices.
  // _deleted:false explicitly overwrites a cloud tombstone (AppSettings deep-
  // merge never REMOVES keys, so a stale _deleted:true would otherwise survive
  // a later legitimate save and delete the new trip).
  function stamp(v) {
    try { var o = JSON.parse(v); if (o && typeof o === 'object') { o._ts = Date.now(); o._deleted = false; return JSON.stringify(o); } } catch (_) {}
    return v;
  }

  // ── local write → cloud mirror (debounced) ──────────────────────────────
  var pending = {}, timer = 0;
  localStorage.setItem = function (k, v) {
    if (typeof k === 'string' && k.indexOf(PREFIX) === 0) {
      v = stamp(v);
      origSet(k, v);                          // store stamped copy locally too
      pending[k.slice(PREFIX.length)] = v;
      clearTimeout(timer); timer = setTimeout(flush, 1200);
      return;
    }
    return origSet(k, v);
  };

  // 2026-07-08 (afsláttar-úttekt): clearTrip (165) uses removeItem, which this
  // sync never saw — the FINISHED trip's cloud copy survived and was restored
  // on the next boot/sync, resurrecting last visit's afslættir, extras and
  // choices for next year. Mirror deletions as a cloud tombstone.
  localStorage.removeItem = function (k) {
    if (typeof k === 'string' && k.indexOf(PREFIX) === 0) {
      origRemove(k);
      pending[k.slice(PREFIX.length)] = JSON.stringify({ _deleted: true, _ts: Date.now() });
      clearTimeout(timer); timer = setTimeout(flush, 1200);
      return;
    }
    return origRemove(k);
  };

  function flush() {
    var as = AS();
    if (!(as && as.save)) { setTimeout(flush, 1000); return; }   // AppSettings not ready yet
    var patch = {}, any = false;
    Object.keys(pending).forEach(function (co) {
      try { patch[co] = JSON.parse(pending[co]); any = true; } catch (_) {}
    });
    pending = {};
    if (any) { var o = {}; o[KEY] = patch; try { as.save(o); } catch (_) {} } // deep-merges per coId
  }

  // ── cloud → local restore (newest-wins) ─────────────────────────────────
  function applyCloud(cloud) {
    if (!cloud || typeof cloud !== 'object') return;
    var changed = [];
    Object.keys(cloud).forEach(function (co) {
      var c = cloud[co]; if (!c || typeof c !== 'object') return;
      var lk = PREFIX + co, local = null;
      try { local = JSON.parse(origGet(lk) || 'null'); } catch (_) {}
      var ct = +(c._ts || 0), lt = +((local && local._ts) || 0);
      // Tombstone (trip was cleared, e.g. „✓ Klára heimsókn"): remove the
      // local copy too — unless the local one is strictly newer (a new trip
      // was already started on this device). Læsing + hök fylgja með út.
      if (c._deleted === true) {
        if (!(local && lt > ct)) {
          try { origRemove(lk); origRemove('sk_ut_lock_' + co); origRemove('sk_ut_done_' + co); } catch (_) {}
          changed.push(String(co));
        }
        return;
      }
      // Only overwrite when the cloud copy is strictly newer (so active local
      // edits are never clobbered by a stale cloud snapshot).
      if (!local || ct > lt) {
        try { origSet(lk, JSON.stringify(c)); } catch (_) {}
        // Læsingin og grænu hökin ferðast með ferðinni (224 speglar þau í st)
        // — voru áður tækjabundin svo aðrar vélar sáu ólæstan lista í grunnstöðu.
        try {
          if (typeof c._locked === 'boolean') { if (c._locked) origSet('sk_ut_lock_' + co, '1'); else origRemove('sk_ut_lock_' + co); }
          if (Array.isArray(c._doneIds)) origSet('sk_ut_done_' + co, JSON.stringify(c._doneIds));
        } catch (_) {}
        changed.push(String(co));
      }
    });
    notifyRestored(changed);
  }

  // 2026-08-17 („aldrei nokkurntíman má þetta breytast"): endurheimtin skrifaði
  // BEINT í localStorage (origSet) og lét viðmótið ALDREI vita. Borð sem var
  // þegar teiknað — kassaskjárinn, eða strax eftir F5 áður en skýið náði inn —
  // sat áfram á SJÁLFGEFNU gildunum (léttvatn → yfirferð) þótt rétta valið
  // (t.d. 5 hleðslur Afltaks) væri komið heilt undir. Leit út eins og valið
  // hefði breyst af sjálfu sér. Nú endurteiknast opna fyrirtækið um leið og
  // endurheimt lendir, og aðrir hlustendur fá 'trip-cloud-restored'.
  function notifyRestored(cos) {
    if (!cos || !cos.length) return;
    try { window.dispatchEvent(new CustomEvent('trip-cloud-restored', { detail: { coIds: cos } })); } catch (_) {}
    try {
      var main = document.getElementById('companies-main');
      var el = main && main.querySelector('[data-co-id]:not(._cat-section)');
      var open = el && el.getAttribute('data-co-id');
      if (open && cos.indexOf(String(open)) >= 0) {
        if (window.UttektTaeki && UttektTaeki.rerender) UttektTaeki.rerender(+open);
        if (window.recomputeCompanyTotalCost) window.recomputeCompanyTotalCost();
      }
    } catch (_) {}
  }

  function boot() {
    var as = AS();
    if (!(as && as.path)) { setTimeout(boot, 800); return; }
    try { applyCloud(as.path(KEY) || {}); } catch (_) {}
    // Re-restore whenever cloud data syncs in (another device saved) — the
    // newest-wins guard keeps the current device's in-progress edits.
    if (as.onChange) as.onChange(function () { try { applyCloud(as.path(KEY) || {}); } catch (_) {} });
  }
  boot();

  // Immediate, explicit save of one company's in-progress (óklárað) report —
  // used by the "💾 Vista óklárað" button (patch 129). Pushes straight to the
  // cloud now instead of waiting for the debounce. Returns a Promise.
  function saveNow(coId) {
    var as = AS();
    if (!coId || !(as && as.save)) return Promise.resolve(false);
    var raw; try { raw = origGet(PREFIX + coId); } catch (_) {}
    if (!raw) return Promise.resolve(false);
    var obj; try { obj = JSON.parse(raw); } catch (_) { return Promise.resolve(false); }
    if (obj && typeof obj === 'object') { obj._ts = Date.now(); obj._deleted = false; try { origSet(PREFIX + coId, JSON.stringify(obj)); } catch (_) {} }
    var o = {}; o[KEY] = {}; o[KEY][coId] = obj;
    try { return Promise.resolve(as.save(o)); } catch (_) { return Promise.resolve(false); }
  }

  // 2026-08-18: hljóðlát staðbundin skrif — HVORKI _ts-stimpill né skýjaspeglun.
  // Fyrir AFLEIDD gildi (computed-samtalan í 129): venjulega setItem-leiðin
  // stimplaði allan ferðahlutinn ferskan og endursendi hann heilan í skýið við
  // það eitt að HORFA á fyrirtæki — stöðnuð vél gekk þá aftur með gömul föst
  // verð (Center CO₂ 3270-draugurinn) og hreinsanir héldust aldrei.
  function silentSet(coId, obj) {
    try { origSet(PREFIX + coId, JSON.stringify(obj)); } catch (_) {}
  }

  window.TripCloudSync = {
    saveNow: saveNow,
    silentSet: silentSet,
    flush: function () { clearTimeout(timer); flush(); }
  };

  console.log('[patch-227] inspection trip-state cloud-sync installed');
})();
