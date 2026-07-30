/* js/patches/293-utgafu-vakt.js
   ─────────────────────────────────────────────────────────────────
   ÚTGÁFU-VAKT — „ennþá tómt" vandinn leystur í eitt skipti fyrir öll.

   Vandinn (30.07.2026, kostaði marga daga): lagfæring fer í framleiðslu, en
   opinn flipi (eða uppsett app á síma) heldur áfram að keyra GAMLA kóðann.
   Notandinn sér óbreytt vandamál og segir réttilega „þetta er ekki komið" —
   á meðan mælingar á framleiðslunni sýna allt í lagi. Enginn hefur leið til
   að sjá misræmið; niðurstaðan er dagur í hringi.

   Lausnin: appið ber byggingar-auðkenni (window.BUILD, stimplað af
   build-dist.js) og sækir /build.json reglulega. Sé auðkennið á þjóninum
   ANNAÐ en það sem flipinn keyrir birtist áberandi borði neðst:
       „🔄 Nýrri útgáfa er komin — Endurhlaða"
   Takkinn hreinsar líka Cache Storage og afskráir service worker áður en
   hann endurhleður, svo endurhleðslan skili ÖRUGGLEGA nýja kóðanum.

   Athugað: við ræsingu (5 s), á 3 mín fresti, og í hvert sinn sem flipinn fær
   fókus aftur (algengasta tilvikið — flipi sem hefur legið opinn í marga tíma).
   Ekkert er sótt þegar flipinn er falinn.

   Á ALDREI að endurhlaða sjálfkrafa — notandinn gæti verið í miðri skráningu.
   Borðinn er tillaga, aldrei rof. Hann man líka höfnun (✕) fyrir ÞÁ útgáfu svo
   hann suði ekki, en birtist aftur þegar enn nýrri útgáfa kemur. */
(() => {
  if (window.__utgafuVaktInstalled) return;
  window.__utgafuVaktInstalled = true;

  const MINE = (window.BUILD && window.BUILD.commit) || null;
  if (!MINE) return;                       // ekki stimplað (t.d. staðbundin keyrsla) → sleppa
  const HUNSA_KEY = 'utgafa_hunsa_v1';
  let bannerOn = false;

  const hunsad = () => { try { return localStorage.getItem(HUNSA_KEY) || ''; } catch (_) { return ''; } };

  async function hreinsaOgEndurhlada() {
    // Cache Storage + service worker geta borið gamla útgáfu áfram þótt
    // netþjónninn sé með nýja — hreinsa BÆÐI áður en endurhlaðið er.
    try {
      if (window.caches && caches.keys) {
        const ks = await caches.keys();
        await Promise.all(ks.map(k => caches.delete(k)));
      }
    } catch (_) {}
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        const rs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(rs.map(r => r.unregister()));
      }
    } catch (_) {}
    // Cache-busting fyrirspurn tryggir ferskt index.html frá netþjóni.
    try { location.replace(location.pathname + '?_v=' + Date.now() + location.hash); }
    catch (_) { location.reload(); }
  }

  function syna(nyr) {
    if (bannerOn || hunsad() === nyr) return;
    bannerOn = true;
    const wrap = document.createElement('div');
    wrap.id = '_utgafa-bordi';
    wrap.style.cssText =
      'position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:2147483000;' +
      'display:flex;align-items:center;gap:12px;max-width:calc(100vw - 24px);' +
      'background:linear-gradient(150deg,#1d4ed8,#1e3a8a);color:#fff;border:1px solid #1e40af;' +
      'border-radius:12px;padding:11px 14px;box-shadow:0 12px 30px -10px rgba(0,0,0,.55);' +
      'font-family:system-ui,sans-serif;font-size:13.5px;font-weight:600';
    wrap.innerHTML =
      '<span style="line-height:1.35">🔄 Nýrri útgáfa er komin' +
      '<span style="display:block;font-weight:400;font-size:11.5px;opacity:.85">' +
      'þú keyrir ' + MINE + ' · ný ' + nyr + '</span></span>' +
      '<button type="button" id="_utgafa-nu" style="border:0;background:#fff;color:#1e3a8a;' +
      'border-radius:9px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer;white-space:nowrap">Endurhlaða</button>' +
      '<button type="button" id="_utgafa-ekki" title="Ekki núna" style="border:0;background:transparent;' +
      'color:#c7d7fe;font:inherit;font-size:16px;cursor:pointer;padding:2px 4px">✕</button>';
    document.body.appendChild(wrap);
    wrap.querySelector('#_utgafa-nu').addEventListener('click', () => {
      const b = wrap.querySelector('#_utgafa-nu');
      b.disabled = true; b.textContent = '⏳ …';
      hreinsaOgEndurhlada();
    });
    wrap.querySelector('#_utgafa-ekki').addEventListener('click', () => {
      try { localStorage.setItem(HUNSA_KEY, nyr); } catch (_) {}
      wrap.remove(); bannerOn = false;
    });
  }

  async function athuga() {
    if (document.hidden || bannerOn) return;
    try {
      const r = await fetch('/build.json?_=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return;                    // eldri deploy án build.json → þegja
      const j = await r.json();
      if (j && j.commit && j.commit !== MINE) syna(j.commit);
    } catch (_) { /* net niðri → þegja, reynt aftur síðar */ }
  }

  setTimeout(athuga, 5000);
  setInterval(athuga, 180000);
  window.addEventListener('focus', athuga);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) athuga(); });

  // Handvirkt: UtgafuVakt.athuga() í console, og .endurhlada() þvingar hreinsun.
  window.UtgafuVakt = { athuga, endurhlada: hreinsaOgEndurhlada, minUtgafa: MINE };
})();
