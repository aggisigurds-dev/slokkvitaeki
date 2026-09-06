/* === RÆSI-SKYNDIMINNI: sýna síðustu gögn strax, sækja ferskt í bakgrunni (360) ==============
 *
 * Agnar 06.09.2026: „fyrirtækjasíður oft mjög lengi að opnast" → „já máttu reyna endurbæta".
 * Mælt fyrir: 86 REST-köll við ræsingu; kjarninn (DB.loadAll: uttaeki 5.813 raðir í 6 síðum,
 * verkbeidnir, verklidur, dagskra, skodunar_saga) klárast ~4,3 s eftir að síðan opnast, síðasta
 * kallið ~9,7 s. Þangað til er DB.online=false, Companies.load() skilar tómu og prófílar sýna
 * „Slökkvitæki (0)".
 *
 * Nú: síðasta vel heppnaða hleðsla er geymd í IndexedDB (slokk-boot) og sett í DB.cache um leið og
 * appið ræsist (tugir millisekúndna) → DB.online=true → App.refreshAll(). Sama gildir um
 * Companies.list (fyrirtaeki). Upprunalega loadAll keyrir svo ÓBREYTT í bakgrunni og skiptir öllu
 * út fyrir ferskt (og refreshAll aftur); eftir hverja vel heppnaða hleðslu er nýja myndin geymd.
 * Gögnin eru því aldrei eldri en síðasta hleðsla, og aldrei skrifað annað en það sem þjónninn
 * skilaði (SAMSTILLT-reglan: ástand býr á þjóninum, þetta er skyndiminni sem þjónninn endurhleður).
 * Bili IndexedDB (einkaflipi o.þ.h.) gerist ekkert — appið hegðar sér eins og áður.
 * uttaeki hefur ekki updated_at, svo „aðeins breytingar" er ekki hægt án skemabreytingar — full
 * endurhleðsla í bakgrunni er leiðin. `window.RaesiCache` = { stada, hreinsa }.
 * ========================================================================== */
(() => {
  if (window.__raesiCache360) return;
  window.__raesiCache360 = true;

  const DBN = 'slokk-boot', STORE = 'snap', KEY_DB = 'db_cache_v1', KEY_CO = 'companies_v1';
  const stada = { hydrated: false, hydratedAt: null, snapAge_s: null, savedAt: null, error: null, companiesHydrated: false };

  function open() {
    return new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('no idb'));
      const r = indexedDB.open(DBN, 1);
      r.onupgradeneeded = () => { try { r.result.createObjectStore(STORE); } catch (_) {} };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error || new Error('idb open'));
      r.onblocked = () => rej(new Error('idb blocked'));
    });
  }
  async function get(key) {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly'); const rq = tx.objectStore(STORE).get(key);
      rq.onsuccess = () => { res(rq.result || null); db.close(); };
      rq.onerror = () => { rej(rq.error); db.close(); };
    });
  }
  async function put(key, val) {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(val, key);
      tx.oncomplete = () => { res(true); db.close(); };
      tx.onerror = () => { rej(tx.error); db.close(); };
    });
  }
  async function hreinsa() { try { const db = await open(); await new Promise((res) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).clear(); tx.oncomplete = () => { res(); db.close(); }; tx.onerror = () => { res(); db.close(); }; }); } catch (_) {} }

  function byClient(units) {
    const m = Object.create(null);
    for (const u of units) { const k = u.client || ''; if (!k) continue; (m[k] = m[k] || []).push(u); }
    return m;
  }

  // ── 1. vökva DB.cache úr skyndiminni ─────────────────────────────────────
  async function hydrateDb() {
    const DB = window.DB; if (!DB || !DB.cache) return false;
    if (DB.online || (DB.cache.units && DB.cache.units.length)) return false;   // þjónninn þegar kominn
    const snap = await get(KEY_DB);
    if (!snap || !Array.isArray(snap.units) || !snap.units.length) return false;
    if (DB.online || (DB.cache.units && DB.cache.units.length)) return false;   // kapphlaup: net vann
    DB.cache.jobs = snap.jobs || []; DB.cache.units = snap.units; DB.cache.schedule = snap.schedule || []; DB.cache.history = snap.history || [];
    DB.cache.unitsByClient = byClient(snap.units);
    DB.online = true; DB._lastLoadOk = DB._lastLoadOk || (snap.t || Date.now());
    try { DB.setSyncState && DB.setSyncState('syncing'); } catch (_) {}          // ferskt er á leiðinni
    stada.hydrated = true; stada.hydratedAt = Math.round(performance.now()); stada.snapAge_s = snap.t ? Math.round((Date.now() - snap.t) / 1000) : null;
    try { window.App && App.refreshAll && App.refreshAll(); } catch (e) { console.warn('[360] refreshAll', e); }
    console.log('[360] ræsi-skyndiminni: ' + snap.units.length + ' tæki, ' + (snap.jobs || []).length + ' verkbeiðnir úr IndexedDB (' + stada.snapAge_s + ' s gamalt) á ' + stada.hydratedAt + ' ms');
    return true;
  }
  async function saveDb() {
    const DB = window.DB; if (!DB || !DB.cache || !Array.isArray(DB.cache.units) || !DB.cache.units.length) return;
    try {
      await put(KEY_DB, { t: Date.now(), jobs: DB.cache.jobs || [], units: DB.cache.units, schedule: DB.cache.schedule || [], history: DB.cache.history || [] });
      stada.savedAt = Date.now();
    } catch (e) { stada.error = String(e && e.message || e); }
  }

  // ── 2. Companies.list ────────────────────────────────────────────────────
  async function hydrateCompanies() {
    const C = window.Companies; if (!C || (Array.isArray(C.list) && C.list.length)) return false;
    const snap = await get(KEY_CO);
    if (!snap || !Array.isArray(snap.list) || !snap.list.length) return false;
    if (Array.isArray(C.list) && C.list.length) return false;
    C.list = snap.list; stada.companiesHydrated = true;
    try { if (document.querySelector('#view-companies.active') && C.render) C.render(); } catch (_) {}
    return true;
  }
  async function saveCompanies() {
    const C = window.Companies; if (!C || !Array.isArray(C.list) || !C.list.length) return;
    try { await put(KEY_CO, { t: Date.now(), list: C.list }); } catch (_) {}
  }

  // ── 3. vefja loadAll / Companies.load — óbreytt hegðun + vistun á eftir ─────
  let saveTimer = null;
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => { saveDb(); }, 1500); };
  function wrap() {
    const DB = window.DB;
    if (DB && typeof DB.loadAll === 'function' && !DB.loadAll.__raesi360) {
      const orig = DB.loadAll;
      const wrapped = async function () {
        if (!stada.hydrated && !DB.online) { try { await hydrateDb(); } catch (e) { stada.error = String(e && e.message || e); } }
        const r = await orig.apply(this, arguments);
        if (DB.online && DB.cache && Array.isArray(DB.cache.units) && DB.cache.units.length) saveSoon();
        return r;
      };
      wrapped.__raesi360 = true;
      DB.loadAll = wrapped;
    }
    const C = window.Companies;
    if (C && typeof C.load === 'function' && !C.load.__raesi360) {
      const origC = C.load;
      const wrappedC = async function () {
        // vökva listann úr skyndiminni þótt DB sé „online" (DB var sjálft vökvað úr skyndiminni) — netið sækir svo ferskt á eftir
        if (!stada.companiesHydrated && !(Array.isArray(C.list) && C.list.length)) { try { await hydrateCompanies(); } catch (_) {} }
        const r = await origC.apply(this, arguments);
        if (Array.isArray(C.list) && C.list.length && window.DB && DB.online) setTimeout(saveCompanies, 1200);
        return r;
      };
      wrappedC.__raesi360 = true;
      C.load = wrappedC;
    }
  }
  wrap();
  // Ef DB.init hefur þegar farið af stað (ólíklegt — pappinn er defer og init er á DOMContentLoaded)
  // eða loadAll er aldrei kallað á þessari sýn: reyna vökvun einu sinni sjálfstætt.
  setTimeout(() => { hydrateDb().catch(() => {}); hydrateCompanies().catch(() => {}); }, 60);

  window.RaesiCache = { stada: () => Object.assign({}, stada), hreinsa, version: '360b' };
  console.log('[360-raesi-skyndiminni] virkur');
})();
/* === END RÆSI-SKYNDIMINNI === */
