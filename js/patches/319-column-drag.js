/* === COLUMN DRAG (Stílstjóri viðbót) ========================================
 * „↔ Dálkar" — dragðu dálkabreiddir í töflum sjálf(ur) (ósk Agnars 2026-08-26).
 *
 * Hnappurinn birtist í Stílstjóra-toolbarnum (262 endurteiknar hann — observer
 * setur hnappinn aftur inn). Þegar kveikt: grip-lína birtist á hægri brún hvers
 * dálkhauss í töflum virku síðunnar (töflur með <colgroup>). Drag skrifar
 * breiddina á <col> gegnum eigin style-blað með hárri sértækni svo hún vinnur
 * á 314-prósentunum í Sími-ham líka.
 *
 * Vistun: localStorage `slokk_coldrag_v1` — PER TÆKI (síminn þinn getur haft
 * aðrar breiddir en tölvan). „↺ breiddir" núllstillir virku síðuna.
 * Ekkert hér snertir gögn eða ._yr útlit — bara col-width.
 * ========================================================================== */
(() => {
  if (window.__colDrag319) return;
  window.__colDrag319 = true;

  const LS = 'slokk_coldrag_v1';
  const SHEET = '_coldrag-css';
  let on = false;
  let store = {};
  try { store = JSON.parse(localStorage.getItem(LS) || '{}') || {}; } catch (_) { store = {}; }
  // v2 snið: {w:{colN:px}, align:{colN:'left|center|right'}, padY:px}.
  // v1 (fyrsta útgáfa dagsins) geymdi breiddirnar beint — pökkum þeim inn.
  Object.keys(store).forEach(k => {
    const v = store[k];
    if (v && typeof v === 'object' && !('w' in v) && !('align' in v) && !('padY' in v)) store[k] = { w: v };
  });

  // ☁️ Samstilling (matseðill 5): AppSettings er aðal-geymslan (fylgir appinu
  // milli allra tækja), localStorage er hraðvirkt afrit/offline-vari.
  let _cloudT = null;
  const save = () => {
    try { localStorage.setItem(LS, JSON.stringify(store)); } catch (_) {}
    try {
      if (window.AppSettings && AppSettings.save) {
        clearTimeout(_cloudT);
        _cloudT = setTimeout(() => { try { AppSettings.save({ [LS]: JSON.stringify(store) }); } catch (_) {} }, 500);
      }
    } catch (_) {}
  };
  let _cloudLoaded = false;
  function syncFromCloud() {
    if (_cloudLoaded) return;
    try {
      if (!(window.AppSettings && AppSettings.path)) return;
      const raw = AppSettings.path(LS);
      _cloudLoaded = true;
      if (raw) {
        const cloud = JSON.parse(raw);
        if (cloud && typeof cloud === 'object' && Object.keys(cloud).length) { store = cloud; applyCss(); return; }
      }
      // Skýið tómt en tækið á stillingar → ýta þeim upp (fyrsta samstilling).
      if (Object.keys(store).length) save();
    } catch (_) {}
  }
  [1500, 4000, 9000].forEach(ms => setTimeout(syncFromCloud, ms));

  function viewIdOf(el) { const v = el && el.closest ? el.closest('.view') : null; return v && v.id ? v.id : null; }
  function tableKey(t) {
    const vid = viewIdOf(t); if (!vid) return null;
    const cls = t.id ? ('#' + t.id) : (t.classList[0] ? ('.' + t.classList[0]) : '');
    return vid + '|' + (cls || 'table');
  }
  // ── style-blaðið: vistaðar breiddir → CSS sem vinnur á 314 ────────────────
  function applyCss() {
    let s = document.getElementById(SHEET);
    if (!s) { s = document.createElement('style'); s.id = SHEET; (document.head || document.documentElement).appendChild(s); }
    let css = '';
    for (const key in store) {
      const e = store[key] || {};
      const w = e.w || {}, al = e.align || {};
      const wKeys = Object.keys(w), aKeys = Object.keys(al);
      // Sleppa TÓMUM færslum. Verður að telja ÖLL eigindin: áður sleppti þetta
      // færslu sem hafði aðeins fs/lh/ff/hide/sticky (engar dálkabreiddir), svo
      // leturstilling á töflu án dregins dálks datt þegjandi niður.
      // ATH: '__grid'-lykill Töflunetsins (321) hefur ekkert af þessu og heldur
      // því áfram að vera sleppt hér — eins og til er ætlast.
      if (!wKeys.length && !aKeys.length && e.padY == null && !e.fs && !e.lh && !e.ff &&
          !Object.keys(e.hide || {}).length && !e.sticky) continue;
      const [vid, cls] = key.split('|');
      // SÉRTÆKNI, ekki bara !important (staðfest í vafra 27.08): `html #view-x
      // table.data-table tbody td{font-size:15px!important}` TAPAÐI fyrir
      // þéttleika-reglum símaham-laganna, svo letur/línuhæð/raðhæð úr
      // töflu-ritlinum gerðu ekkert í þeim ham þótt gildin vistuðust rétt.
      // Auðkennið er því TVÍTEKIÐ (#view-x#view-x = tvö auðkenni); sömu
      // reglur, bara nógu sterkar til að vinna. `base.slice(5)` að neðan
      // sleppir „html " og heldur áfram að virka óbreytt.
      const base = 'html body #' + vid + '#' + vid + ' ' +
        (cls === 'table' ? 'table' : (cls[0] === '#' ? 'table' + cls : 'table' + cls));
      // 2026-08-29 (Agnar: „when I try to make them wider it just goes to the left
      // and fucks them up"). `width:100%` LÆSTI heildarbreidd töflunnar, svo það
      // sem einn dálkur fékk tóku hinir á sig — að breikka einn dálk þýddi alltaf
      // að mjókka aðra. Með `width:auto` verður breidd töflunnar SUMMA dálkanna,
      // svo hún vex til hægri og skrunar (töfluskrunarinn úr 325 sér um það).
      // `min-width:100%` heldur henni áfram út í kant þegar dálkarnir eru mjóir.
      if (wKeys.length) css += base + '{table-layout:fixed!important;width:auto!important;min-width:100%!important}\n';
      wKeys.forEach(n => { css += base + ' col:nth-child(' + n + '){width:' + w[n] + 'px!important}\n'; });
      aKeys.forEach(n => { css += base + ' tbody td:nth-child(' + n + '),' + base + ' thead th:nth-child(' + n + '){text-align:' + al[n] + '!important}\n'; });
      if (e.padY != null) css += base + ' tbody td{padding-top:' + e.padY + 'px!important;padding-bottom:' + e.padY + 'px!important;min-height:0!important;height:auto!important}\n';
      Object.keys(e.hide || {}).forEach(n => {
        css += base + ' tbody td:nth-child(' + n + '),' + base + ' thead th:nth-child(' + n + '){display:none!important}\n';
        css += base + ' col:nth-child(' + n + '){display:none!important;width:0!important}\n';
      });
      if (e.fs) css += base + ' tbody td{font-size:' + e.fs + 'px!important}\n';
      // Töflu-editor (322): línuhæð og leturgerð. Sama geymsla og breiddirnar,
      // svo hvort tveggja lifir reload og fylgir sjálfkrafa með í ÚTGÁFUR.
      // lh er geymt sem PRÓSENTA (70–160) — CSS-hlutfallið er lh/100.
      if (e.lh) css += base + ' tbody td,' + base + ' thead th{line-height:' + (e.lh / 100) + '!important}\n';
      if (e.ff) css += base + ' tbody td,' + base + ' thead th{font-family:' + e.ff + '!important}\n';
      if (e.sticky) {
        css += base + ' thead th{position:sticky!important;top:0!important;z-index:25!important}\n';
        css += 'html.slokk-phone-nav ' + base.slice(5) + ' thead th{top:74px!important}\n';
      }
      if (e.zebra) css += base + ' tbody tr:nth-child(even) td{background-image:linear-gradient(rgba(100,116,139,.09),rgba(100,116,139,.09))!important}\n';
    }
    s.textContent = css;
    if (s.parentNode) s.parentNode.appendChild(s);   // sitja síðast → vinna 314
  }

  // ── grip-línurnar ─────────────────────────────────────────────────────────
  function clearHandles() { document.querySelectorAll('._cd-handle').forEach(h => h.remove()); }
  function buildHandles() {
    clearHandles();
    if (!on) return;
    const view = document.querySelector('.view.active'); if (!view) return;
    view.querySelectorAll('table').forEach(t => {
      if (!t.querySelector('colgroup col')) return;
      const key = tableKey(t); if (!key) return;
      const ths = Array.prototype.slice.call(t.querySelectorAll('thead th'));
      ths.forEach((th, i) => {
        if (th.offsetParent === null) return;              // falinn dálkur
        if (i === ths.length - 1) return;                  // síðasta brún = tafla-brún
        th.style.position = 'relative';
        const h = document.createElement('div');
        h.className = '_cd-handle';
        h.style.cssText = 'position:absolute;top:0;right:-7px;width:14px;height:100%;cursor:col-resize;z-index:50;touch-action:none;';
        h.innerHTML = '<div style="position:absolute;top:0;bottom:0;left:6px;width:2px;background:#3b82f6;opacity:.55;border-radius:1px"></div>';
        h.addEventListener('pointerdown', ev => startDrag(ev, t, key, i + 1, th));
        th.appendChild(h);
        // Smellur á HAUSINN sjálfan (ekki grip-línuna) víxlar jöfnun dálksins:
        // vinstri → miðjað → hægri → sjálfgefið. Röðunar-smellur haussins er
        // bældur á meðan ↔-hamur er á (capture + stopPropagation).
        if (!th.__cdAlign) {
          th.__cdAlign = true;
          th.addEventListener('click', ev => {
            if (!on) return;
            if (th.__cdSuppress) { th.__cdSuppress = false; ev.preventDefault(); ev.stopPropagation(); return; }
            if (ev.target && ev.target.closest && ev.target.closest('._cd-handle')) return;
            ev.preventDefault(); ev.stopPropagation();
            const ths2 = Array.prototype.slice.call(t.querySelectorAll('thead th'));
            const n = ths2.indexOf(th) + 1; if (!n) return;
            const st = (store[key] = store[key] || {}); st.align = st.align || {};
            const cycle = { undefined: 'left', left: 'center', center: 'right', right: undefined };
            const next = cycle[st.align[n]];
            if (next) st.align[n] = next; else delete st.align[n];
            save(); applyCss();
            try { if (window.Toast && Toast.show) Toast.show('Dálkur ' + n + ': ' + (next === 'left' ? 'vinstri ⟸' : next === 'center' ? 'miðjað ⟺' : next === 'right' ? 'hægri ⟹' : 'sjálfgefið')); } catch (_) {}
          }, true);
        }
        // 👁 Long-press (600ms kyrr) á haus FELUR dálkinn — „👁 Sýna dálka"
        // í toolbar birtir aftur. Bælir jöfnunar-smellinn sem fylgir á eftir.
        if (!th.__cdHide) {
          th.__cdHide = true;
          th.addEventListener('pointerdown', ev => {
            if (!on) return;
            if (ev.target && ev.target.closest && ev.target.closest('._cd-handle')) return;
            const sx = ev.clientX, sy = ev.clientY;
            let fired = false;
            const tm = setTimeout(() => {
              fired = true;
              const ths2 = Array.prototype.slice.call(t.querySelectorAll('thead th'));
              const n = ths2.indexOf(th) + 1; if (!n) return;
              const st = (store[key] = store[key] || {}); (st.hide = st.hide || {})[n] = 1;
              th.__cdSuppress = true;
              save(); applyCss(); buildHandles();
              try { if (window.Toast && Toast.show) Toast.show('👁 Dálkur ' + n + ' falinn — „👁 Sýna dálka" birtir aftur'); } catch (_) {}
            }, 600);
            const cancel = e2 => {
              if (e2 && e2.type === 'pointermove' && Math.hypot(e2.clientX - sx, e2.clientY - sy) < 8) return;
              clearTimeout(tm);
              document.removeEventListener('pointermove', cancel);
              document.removeEventListener('pointerup', cancel);
            };
            document.addEventListener('pointermove', cancel);
            document.addEventListener('pointerup', cancel);
          });
        }
      });
    });
  }

  function startDrag(ev, table, key, colN, th) {
    ev.preventDefault(); ev.stopPropagation();
    const startX = ev.clientX;
    const startW = th.getBoundingClientRect().width;
    const col = table.querySelectorAll('colgroup col')[colN - 1];
    // 2026-08-29 (Agnar: „ég ætlaði að stækka Skoðun aðeins og þá fór allt í rugl").
    //
    // Um leið og EINN dálkur fékk vistaða breidd varð taflan table-layout:fixed.
    // Í þeim ham deila dálkar ÁN skilgreindrar breiddar jafnt því sem eftir er —
    // svo Fyrirtæki, Ferðanóta, Heimilisfang, Tæki, Akstur og Forgangur hrundu
    // öll í nákvæmlega sömu 96px og textinn brotnaði í miðjum orðum. Aðeins tveir
    // dálkar áttu í raun vistaða breidd; hinir sex voru fórnarlömb.
    //
    // Lagfæring: FESTA alla dálka á þá breidd sem þeir HAFA þegar, um leið og
    // dráttur hefst. Þá breytist aðeins sá sem dregið er í — hinir standa kyrrir
    // í stað þess að endurdeilast.
    const st0 = (store[key] = store[key] || {});
    st0.w = st0.w || {};
    const heads = table.querySelectorAll('thead th');
    heads.forEach((h, i) => {
      const n = i + 1;
      if (st0.w[n] != null) return;                       // á þegar vistaða breidd
      if (h.offsetParent === null) return;                // falinn dálkur — snertum ekki
      const wNow = Math.round(h.getBoundingClientRect().width);
      if (wNow > 0) st0.w[n] = wNow;
    });
    const move = e => {
      const w = Math.max(24, Math.min(Math.round(startW + (e.clientX - startX)), Math.round(window.innerWidth * 0.9)));
      const st = (store[key] = store[key] || {}); (st.w = st.w || {})[colN] = w;
      if (col) col.style.width = w + 'px';               // lifandi svörun
      applyCss();
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      save();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  }

  // ── takkarnir í Stílstjóra-toolbar ───────────────────────────────────────
  function ensureButtons() {
    const bar = document.querySelector('.pe-toolbar');
    if (!bar) { if (on) { on = false; clearHandles(); } return; }
    if (!bar.querySelector('#pe-coldrag')) {
      const b = document.createElement('button');
      b.id = 'pe-coldrag'; b.type = 'button'; b.className = 'pe-btn' + (on ? ' on' : '');
      b.textContent = '↔ Dálkar';
      b.title = 'Dragðu dálkabreiddir í töflum beint — vistast á þessu tæki';
      b.addEventListener('click', e => { e.preventDefault(); on = !on; b.classList.toggle('on', on); buildHandles(); syncReset(bar); });
      bar.appendChild(b);
    } else {
      bar.querySelector('#pe-coldrag').classList.toggle('on', on);
    }
    syncReset(bar);
  }
  function bumpPadY(d) {
    const view = document.querySelector('.view.active'); if (!view) return;
    // Beitum á ALLA töflulykla síðunnar + '|table' grunninn svo hún nái töflunum.
    const vid = view.id;
    view.querySelectorAll('table').forEach(t => {
      if (!t.querySelector('colgroup col')) return;
      const key = tableKey(t); if (!key) return;
      const st = (store[key] = store[key] || {});
      const cur = st.padY != null ? st.padY : (() => {
        const td = t.querySelector('tbody td');
        return td ? Math.round(parseFloat(getComputedStyle(td).paddingTop) || 4) : 4;
      })();
      st.padY = Math.max(0, Math.min(cur + d, 16));
    });
    save(); applyCss();
    try { if (window.Toast && Toast.show) Toast.show('Raðhæð: padding ' + (d > 0 ? '+' : '−') + '1px'); } catch (_) {}
  }
  // Beitir fn á store-færslu HVERRAR töflu virku síðunnar (matseðils-tólin).
  function eachViewTable(fn) {
    const view = document.querySelector('.view.active'); if (!view) return false;
    let hit = false;
    view.querySelectorAll('table').forEach(t => {
      if (!t.querySelector('colgroup col')) return;
      const key = tableKey(t); if (!key) return;
      fn((store[key] = store[key] || {}), t); hit = true;
    });
    if (hit) { save(); applyCss(); }
    return hit;
  }
  function bumpFs(d) {
    eachViewTable((st, t) => {
      const cur = st.fs || (() => { const td = t.querySelector('tbody td'); return td ? Math.round(parseFloat(getComputedStyle(td).fontSize) || 13) : 13; })();
      st.fs = Math.max(9, Math.min(cur + d, 22));
    });
    try { if (window.Toast && Toast.show) Toast.show('🔤 Leturstærð ' + (d > 0 ? '+' : '−') + '1px'); } catch (_) {}
  }
  function toggleFlag(flag, label) {
    let onNow = null;
    eachViewTable(st => { if (onNow == null) onNow = !st[flag]; if (onNow) st[flag] = 1; else delete st[flag]; });
    try { if (window.Toast && Toast.show) Toast.show(label + (onNow ? ' Á' : ' AF')); } catch (_) {}
  }
  function hiddenColCount() {
    const view = document.querySelector('.view.active'); if (!view || !view.id) return 0;
    let n = 0;
    Object.keys(store).forEach(k => { if (k.indexOf(view.id + '|') === 0) n += Object.keys((store[k] || {}).hide || {}).length; });
    return n;
  }
  function showAllCols() {
    eachViewTable(st => { delete st.hide; });
    buildHandles();
    try { if (window.Toast && Toast.show) Toast.show('👁 Allir dálkar sýndir'); } catch (_) {}
  }
  function syncReset(bar) {
    // ↕ raðhæðar-steppari (aðeins þegar ↔-hamur er á)
    let dn = bar.querySelector('#pe-rowh-dn'), upB = bar.querySelector('#pe-rowh-up');
    if (!on) { if (dn) dn.remove(); if (upB) upB.remove(); }
    else {
      if (!dn) {
        dn = document.createElement('button');
        dn.id = 'pe-rowh-dn'; dn.type = 'button'; dn.className = 'pe-btn';
        dn.textContent = '↕−'; dn.title = 'Lækka raðir í töflum þessarar síðu';
        dn.addEventListener('click', e => { e.preventDefault(); bumpPadY(-1); });
        bar.appendChild(dn);
      }
      if (!upB) {
        upB = document.createElement('button');
        upB.id = 'pe-rowh-up'; upB.type = 'button'; upB.className = 'pe-btn';
        upB.textContent = '↕+'; upB.title = 'Hækka raðir í töflum þessarar síðu';
        upB.addEventListener('click', e => { e.preventDefault(); bumpPadY(1); });
        bar.appendChild(upB);
      }
    }
    // 🔤 / 📌 / 🦓 / 👁 (matseðill 1–4)
    const MB = [
      ['pe-fs-dn', '🔤−', 'Minnka letur í töflum síðunnar', () => bumpFs(-1)],
      ['pe-fs-up', '🔤+', 'Stækka letur í töflum síðunnar', () => bumpFs(1)],
      ['pe-sticky', '📌', 'Límdur haus — dálkhausar fylgja við skroll', () => toggleFlag('sticky', '📌 Límdur haus')],
      ['pe-zebra', '🦓', 'Zebra-rendur — önnur hver röð lituð', () => toggleFlag('zebra', '🦓 Zebra')],
    ];
    MB.forEach(([id, label, title, fn]) => {
      let b = bar.querySelector('#' + id);
      if (!on) { if (b) b.remove(); return; }
      if (!b) {
        b = document.createElement('button');
        b.id = id; b.type = 'button'; b.className = 'pe-btn';
        b.textContent = label; b.title = title;
        b.addEventListener('click', e => { e.preventDefault(); fn(); });
        bar.appendChild(b);
      }
    });
    let sh = bar.querySelector('#pe-showcols');
    const hc = on ? hiddenColCount() : 0;
    if (!hc) { if (sh) sh.remove(); }
    else {
      if (!sh) {
        sh = document.createElement('button');
        sh.id = 'pe-showcols'; sh.type = 'button'; sh.className = 'pe-btn';
        sh.addEventListener('click', e => { e.preventDefault(); showAllCols(); syncReset(bar); });
        bar.appendChild(sh);
      }
      sh.textContent = '👁 Sýna dálka (' + hc + ')';
      sh.title = 'Birta falda dálka á þessari síðu';
    }
    let r = bar.querySelector('#pe-coldrag-reset');
    if (!on) { if (r) r.remove(); return; }
    if (!r) {
      r = document.createElement('button');
      r.id = 'pe-coldrag-reset'; r.type = 'button'; r.className = 'pe-btn';
      r.textContent = '↺ tafla';
      r.title = 'Núllstilla ALLAR töflustillingar síðunnar (breiddir, jöfnun, raðhæð, letur, falda dálka, 📌, 🦓)';
      r.addEventListener('click', e => {
        e.preventDefault();
        const view = document.querySelector('.view.active'); const vid = view && view.id;
        if (!vid) return;
        Object.keys(store).forEach(k => { if (k.indexOf(vid + '|') === 0) delete store[k]; });
        save(); applyCss();
        document.querySelectorAll('#' + vid + ' colgroup col').forEach(c => c.style.removeProperty('width'));
        buildHandles();
      });
      bar.appendChild(r);
    }
  }

  // Töflur endurteiknast (gagna-hleðsla) — grip-línur og CSS koma aftur.
  let t = null;
  const kick = () => { clearTimeout(t); t = setTimeout(() => { ensureButtons(); if (on) buildHandles(); applyCss(); }, 250); };
  const isOurs = n => n && n.nodeType === 1 && n.classList && n.classList.contains('_cd-handle');
  new MutationObserver(muts => {
    // Eigin grip-línu-mutations kveikja EKKI endursmíði — annars eilífðar-hringur.
    let foreign = false;
    for (const m of muts) {
      for (const n of m.addedNodes) if (!isOurs(n)) { foreign = true; break; }
      if (!foreign) for (const n of m.removedNodes) if (!isOurs(n)) { foreign = true; break; }
      if (foreign) break;
    }
    if (foreign) kick();
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', kick);
  document.addEventListener('slokk-viewmode', kick);
  applyCss();
  setInterval(applyCss, 8000);   // sitja síðast þó önnur blöð endur-appendist
  // 262 „Útgáfur" les/skrifar töflustillingarnar gegnum þetta.
  window.TableLook = {
    get: () => JSON.parse(JSON.stringify(store)),
    set: (v) => { store = (v && typeof v === 'object') ? v : {}; save(); applyCss();
      document.querySelectorAll('colgroup col').forEach(c => c.style.removeProperty('width')); },
  };
  console.log('[patch-319] column drag ready');
})();
/* === END COLUMN DRAG === */
