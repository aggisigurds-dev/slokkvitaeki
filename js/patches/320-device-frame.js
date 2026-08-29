/* === DEVICE FRAME (Stílstjóri viðbót) =======================================
 * 📱 Símarammi / 📲 Spjaldrammi — appið opnast í iframe í ALVÖRU hlutföllum
 * (390×844 / 834×1112) svo allar @media-reglur og layout svara eins og á
 * tækinu (ósk Agnars 2026-08-26). Sama mynstur og brunaholf js/viewmode.js.
 *
 * Rammaða eintakið keyrir ?devframe=simi|tafla:
 *   - localStorage er SHIMMAÐ fyrir slokk_viewmode (get skilar ramma-ham,
 *     set hunsað) svo ramminn þvingar Sími/Tafla án þess að KRUKKA í
 *     raunverulegu sýnar-vali tækisins.
 *   - Stílstjórinn virkar INNI í rammanum — breytingar vistast í AppSettings
 *     og gilda alls staðar. ↻ endurhleður rammann.
 *   - Rammar sig ekki aftur (takkarnir birtast ekki í barni).
 * ========================================================================== */
(() => {
  if (window.__devFrame320) return;
  window.__devFrame320 = true;

  const params = new URLSearchParams(location.search);
  const CHILD_MODE = params.get('devframe');   // 'simi' | 'tafla' | null

  /* ── BARNIÐ: þvinga sýn án þess að vista ─────────────────────────────── */
  if (CHILD_MODE) {
    // Sniðin eru fjögur en sýnarhamirnir tveir — landscape-afbrigðin þvinga
    // SAMA ham og hæðarsniðin, aðeins útsýnisstærðin er önnur.
    const vm = /^tafla/.test(CHILD_MODE) ? 'table' : 'mobile';
    try {
      const realGet = Storage.prototype.getItem, realSet = Storage.prototype.setItem;
      Storage.prototype.getItem = function (k) { return k === 'slokk_viewmode' ? vm : realGet.call(this, k); };
      Storage.prototype.setItem = function (k, v) { if (k === 'slokk_viewmode') return; return realSet.call(this, k, v); };
    } catch (_) {}
    const enforce = () => {
      try {
        if (document.documentElement.dataset.viewmode !== vm) {
          if (window.SlokkViewMode && SlokkViewMode.apply) SlokkViewMode.apply(vm, true);
          else document.documentElement.dataset.viewmode = vm;
        }
      } catch (_) {}
    };
    enforce();
    [300, 900, 2000, 4500].forEach(ms => setTimeout(enforce, ms));
    document.addEventListener('DOMContentLoaded', enforce);
    return;   // ekkert ramma-UI í barninu
  }

  /* ── FORELDRIÐ: takkar í Stílstjóra-toolbar + ramminn ────────────────── */
  /* 2026-08-29 (Agnar: „Geturðu nokkuð bætt við tablet í landscape view líka").
     Ramminn hafði aðeins hæðarsnið. Spjaldtölva á hliðina er 1112px breið —
     yfir öllum brotmörkum appsins — svo það er allt annað útlit en 834px, og
     var hvergi hægt að skoða. `vm` segir hvaða sýnarham barnið á að þvinga. */
  const DEVICES = {
    simi:       { label: '📱 Sími',          w: 390,  h: 844,  radius: 34, vm: 'mobile' },
    simiL:      { label: '📱 Sími ↔',        w: 844,  h: 390,  radius: 34, vm: 'mobile' },
    tafla:      { label: '📲 Spjaldtölva',   w: 834,  h: 1112, radius: 22, vm: 'table'  },
    taflaL:     { label: '📲 Spjaldtölva ↔', w: 1112, h: 834,  radius: 22, vm: 'table'  },
  };
  let overlay = null, iframe = null, curDev = null, curUrl = null, curTitle = null;
  let scaler = null;

  // Handvirkt zoom (null = passa sjálfkrafa) og hliðarhamur. Bæði muna sig.
  const LS_ZOOM = 'devframe_zoom';
  const LS_DOCK = 'devframe_dock';
  let zoom = (function () {
    const v = parseFloat(localStorage.getItem(LS_ZOOM) || '');
    return (isFinite(v) && v >= 0.25 && v <= 1.5) ? v : null;
  })();
  let docked = (function () { try { return localStorage.getItem(LS_DOCK) === '1'; } catch (_) { return false; } })();
  const ZOOMS = [0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1, 1.15, 1.3];

  // „Passa" — stærsta skölun sem kemst fyrir. Í hliðarham er aðeins vinstri
  // helmingur skjásins í boði, svo viðmiðunarbreiddin er önnur.
  function fitScale(d) {
    const bh = 46;
    const availH = Math.max(280, window.innerHeight - bh - 26);
    const availW = Math.max(280, (docked ? window.innerWidth * 0.52 : window.innerWidth) - 24);
    return Math.min(1, availH / (d.h + 24), availW / (d.w + 24));
  }
  function curScale(d) { return zoom != null ? zoom : fitScale(d); }

  // Setur geometríuna á yfirlagið og skölunina á símann — án þess að byggja
  // rammann upp á nýtt (endurbygging myndi endurhlaða iframe-ið og tapa stöðu).
  function applyView() {
    const d = DEVICES[curDev]; if (!d || !overlay) return;
    overlay.style.inset = docked ? '0 auto 0 0' : '0';
    overlay.style.width = docked ? 'min(52vw, ' + Math.round(d.w * curScale(d) + 90) + 'px)' : '';
    overlay.style.background = docked ? 'rgba(8,10,14,.94)' : 'rgba(8,10,14,.86)';
    overlay.style.boxShadow = docked ? '18px 0 60px -20px rgba(0,0,0,.75)' : '';
    if (scaler) scaler.style.transform = 'scale(' + curScale(d) + ')';
    const lbl = overlay.querySelector('#_df-pct');
    if (lbl) lbl.textContent = Math.round(curScale(d) * 100) + '%' + (zoom == null ? ' · passa' : '');
    const dk = overlay.querySelector('#_df-dock');
    if (dk) dk.textContent = docked ? '⇥ Fylla skjá' : '⇤ Til hliðar';
    // Í hliðarham má EKKI loka fyrir hægri helminginn — þar situr Stílstjórinn.
    document.documentElement.style.setProperty('--devframe-dock', docked ? '1' : '0');
  }
  function setZoom(v) {
    zoom = v;
    try { v == null ? localStorage.removeItem(LS_ZOOM) : localStorage.setItem(LS_ZOOM, String(v)); } catch (_) {}
    applyView();
  }
  function stepZoom(dir) {
    const d = DEVICES[curDev]; if (!d) return;
    const cur = curScale(d);
    const list = ZOOMS.slice();
    if (dir < 0) { const c = list.filter(z => z < cur - 0.001); setZoom(c.length ? c[c.length - 1] : list[0]); }
    else { const c = list.filter(z => z > cur + 0.001); setZoom(c.length ? c[0] : list[list.length - 1]); }
  }

  /* 2026-08-29: ramminn tók áður AÐEINS núverandi síðu (location.href). Öpp-fylkið
     þarf að ramma HVAÐA síðu sem er — Agnar: „mér er bara vísað á síðuna á
     desctopinnu… er hægt að láta hana poppa upp í mobile view style". Því tekur
     open() nú við { url, title }. Slóðin kemur FULLBÚIN frá kallanda (hann veit
     hvort devframe eigi við); án hennar er hegðunin óbreytt. */
  function frameUrl(devKey, target) {
    if (target) return target;
    const u = new URL(location.href);
    u.searchParams.set('devframe', devKey);
    return u.toString();
  }
  function close() {
    if (overlay) overlay.remove();
    overlay = null; iframe = null; curDev = null; curUrl = null; curTitle = null;
    syncButtons();
  }
  function refresh() {
    if (iframe && curDev) { try { iframe.src = frameUrl(curDev, curUrl); } catch (_) {} }
  }
  function open(devKey, opts) {
    const d = DEVICES[devKey]; if (!d) return;
    const url = opts && opts.url ? String(opts.url) : null;
    const title = opts && opts.title ? String(opts.title) : null;
    close();
    curDev = devKey; curUrl = url; curTitle = title;
    overlay = document.createElement('div');
    overlay.id = '_devframe-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99980;background:rgba(8,10,14,.86);display:flex;flex-direction:column;align-items:center;padding:10px 8px;overflow:auto';
    const scale = curScale(d);
    const bar = document.createElement('div');
    // Fjögur snið + heiti + ↗ ↻ ✕ komast ekki fyrir í mjóum glugga — barinn
    // skrunast frekar en að klippast (sama regla og annars staðar í appinu).
    bar.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;flex:none;'
      + 'max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;padding-bottom:2px';
    bar.innerHTML =
      Object.keys(DEVICES).map(k =>
        '<button data-dev="' + k + '" style="all:unset;cursor:pointer;font:700 12.5px \'IBM Plex Sans\',-apple-system,\'Segoe UI\',sans-serif;color:' + (k === devKey ? '#0f1117' : '#e5e9f0') + ';background:' + (k === devKey ? '#fff' : 'rgba(255,255,255,.12)') + ';padding:8px 14px;border-radius:9px;flex:0 0 auto;white-space:nowrap">' + DEVICES[k].label + ' · ' + DEVICES[k].w + '×' + DEVICES[k].h + '</button>').join('') +
      // Zoom: minnka / stækka / passa. Vantaði alveg — skölunin var föst á
      // „passa á skjáinn" og því gat enginn minnkað til að sjá meira.
      '<button id="_df-zout" title="Minnka" style="all:unset;cursor:pointer;flex:0 0 auto;white-space:nowrap;font:700 15px sans-serif;color:#e5e9f0;background:rgba(255,255,255,.12);width:32px;height:32px;text-align:center;line-height:32px;border-radius:9px">−</button>' +
      '<span id="_df-pct" style="flex:0 0 auto;white-space:nowrap;font:12px \'JetBrains Mono\',ui-monospace,monospace;color:#9aa3b2;min-width:82px;text-align:center">' + Math.round(scale * 100) + '%</span>' +
      '<button id="_df-zin" title="Stækka" style="all:unset;cursor:pointer;flex:0 0 auto;white-space:nowrap;font:700 15px sans-serif;color:#e5e9f0;background:rgba(255,255,255,.12);width:32px;height:32px;text-align:center;line-height:32px;border-radius:9px">+</button>' +
      '<button id="_df-fit" title="Passa á skjáinn" style="all:unset;cursor:pointer;flex:0 0 auto;white-space:nowrap;font:700 12.5px sans-serif;color:#e5e9f0;background:rgba(255,255,255,.12);padding:8px 12px;border-radius:9px">Passa</button>' +
      // Hliðarhamur: síminn til vinstri, hægri helmingur laus fyrir Stílstjórann.
      '<button id="_df-dock" title="Færa símann til hliðar svo Stílstjórinn sé UTAN hans" style="all:unset;cursor:pointer;flex:0 0 auto;white-space:nowrap;font:700 12.5px sans-serif;color:#0f1117;background:#f5c04a;padding:8px 12px;border-radius:9px">⇤ Til hliðar</button>' +
      (curTitle ? '<span style="font:700 12.5px sans-serif;color:#fff;background:rgba(255,255,255,.10);padding:8px 12px;border-radius:9px">' + curTitle.replace(/[<>&]/g, '') + '</span>' : '') +
      (curUrl ? '<a id="_df-tab" href="' + curUrl.replace(/"/g, '&quot;') + '" target="_blank" rel="noopener" style="all:unset;cursor:pointer;font:700 12.5px sans-serif;color:#e5e9f0;background:rgba(255,255,255,.12);padding:8px 12px;border-radius:9px" title="Opna í nýjum flipa">↗</a>' : '') +
      '<button id="_df-refresh" style="all:unset;cursor:pointer;font:700 12.5px sans-serif;color:#e5e9f0;background:rgba(255,255,255,.12);padding:8px 12px;border-radius:9px" title="Endurhlaða rammann (sækir nýjustu stíla)">↻</button>' +
      '<button id="_df-close" style="all:unset;cursor:pointer;font:700 12.5px sans-serif;color:#fff;background:#c9403a;padding:8px 14px;border-radius:9px">✕ Loka</button>';
    scaler = document.createElement('div');
    scaler.style.cssText = 'flex:none;transform:scale(' + scale + ');transform-origin:top center';
    const bezel = document.createElement('div');
    bezel.style.cssText = 'padding:12px;background:linear-gradient(160deg,#2b2f36,#101216);border-radius:' + (d.radius + 12) + 'px;box-shadow:0 24px 70px -20px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.14)';
    iframe = document.createElement('iframe');
    iframe.src = frameUrl(devKey, curUrl);
    iframe.style.cssText = 'display:block;width:' + d.w + 'px;height:' + d.h + 'px;border:0;border-radius:' + d.radius + 'px;background:#fff';
    bezel.appendChild(iframe);
    scaler.appendChild(bezel);
    overlay.appendChild(bar);
    overlay.appendChild(scaler);
    document.body.appendChild(overlay);
    bar.querySelectorAll('[data-dev]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault(); open(b.dataset.dev, { url: curUrl, title: curTitle });
    }));
    bar.querySelector('#_df-zout').addEventListener('click', e => { e.preventDefault(); stepZoom(-1); });
    bar.querySelector('#_df-zin').addEventListener('click', e => { e.preventDefault(); stepZoom(1); });
    bar.querySelector('#_df-fit').addEventListener('click', e => { e.preventDefault(); setZoom(null); });
    bar.querySelector('#_df-dock').addEventListener('click', e => {
      e.preventDefault();
      docked = !docked;
      try { localStorage.setItem(LS_DOCK, docked ? '1' : '0'); } catch (_) {}
      applyView();
    });
    bar.querySelector('#_df-refresh').addEventListener('click', e => { e.preventDefault(); refresh(); });
    bar.querySelector('#_df-close').addEventListener('click', e => { e.preventDefault(); close(); });
    syncButtons();
    // Ábendingin á aðeins við þegar APPIÐ sjálft er rammað. Sé ytri slóð römmuð
    // (sjálfstæð útfærsla úr Öpp-fylkinu) er enginn Stílstjóri þar inni.
    applyView();
    // Gamla ábendingin sagði „opnaðu 🎨 INNI í rammanum" — það er einmitt það
    // sem gerði þetta ónothæft: Stílstjórinn fyllir þá 390px skjáinn og hylur
    // það sem verið er að laga. Rétta leiðin er hliðarhamur.
    if (!curUrl) {
      try {
        if (window.Toast && Toast.show) {
          Toast.show(docked
            ? 'Síminn er til hliðar — opnaðu Stílstjórann á síðunni hægra megin. Breytingar birtast hér jafnóðum.'
            : 'Ábending: ⇤ Til hliðar setur símann til vinstri svo Stílstjórinn sé UTAN hans.');
        }
      } catch (_) {}
    }
  }

  /* Takkar í Stílstjóra-toolbar (sama endursmíðunar-mynstur og 319). */
  function syncButtons() {
    const bar = document.querySelector('.pe-toolbar');
    if (!bar) return;
    Object.keys(DEVICES).forEach(k => {
      const id = 'pe-devframe-' + k;
      let b = bar.querySelector('#' + id);
      if (!b) {
        b = document.createElement('button');
        b.id = id; b.type = 'button'; b.className = 'pe-btn';
        b.textContent = DEVICES[k].label;
        b.title = 'Opna appið í ' + DEVICES[k].label + '-ramma í alvöru hlutföllum (' + DEVICES[k].w + '×' + DEVICES[k].h + ')';
        b.addEventListener('click', e => { e.preventDefault(); (curDev === k) ? close() : open(k); });
        bar.appendChild(b);
      }
      b.classList.toggle('on', curDev === k);
    });
  }

  let t = null;
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n && n.nodeType === 1 && (n.id === '_devframe-overlay' || (n.closest && n.closest('#_devframe-overlay')))) return;
    }
    clearTimeout(t); t = setTimeout(syncButtons, 250);
  }).observe(document.body, { childList: true, subtree: true });
  syncButtons();

  window.SlokkDevFrame = { open, close, refresh, isOpen: () => !!overlay };
  console.log('[patch-320] device frame ready');
})();
/* === END DEVICE FRAME === */
