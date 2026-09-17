/* === VINNUTÖLVA — skyndiminni á lestri, kveikt per tölvu (378) ================
 *
 * Agnar 17.09.2026: „Alveg spurning að setja vinnutölvu stillingu. Að það sé
 * takki sem lætur tölvuna sækja flest af síðunni. Ultra catch mode sem sækir
 * flest og sé alveg með flest ready." — og á undan: „Maður fer fram og til baka
 * og alltaf svo mikið reload í hvert skipti."
 *
 * MÆLT ÁÐUR EN ÞETTA VAR SMÍÐAÐ (Center Hótel – Plaza, 80 tæki):
 *   fyrsta heimsókn 112 netköll · annað fyrirtæki 62 · AFTUR á það fyrsta 70.
 * Ekkert var munað milli heimsókna. Öll gögnin á bak við prófílinn eru þó
 * aðeins ~15.400 raðir (uttaeki 6.230, customer_documents 3.819, document_pairs
 * 1.483, fyrirtaeki 1.261, felag_samskipti 941, solur 862, verkbeidnir 763).
 * Appið var því að sækja sömu gögnin í smáskömmtum aftur og aftur af því enginn
 * hélt þeim.
 *
 * AF HVERJU EFTIR SLÓÐ EN EKKI EFTIR TÖFLU:
 *   `solur` er sótt í 58 skrám, `verkbeidnir` í 34, `customer_documents` í 20.
 *   Að umskrifa kallendur er ekki á borðinu. En PostgREST er stöðulaust og setur
 *   ALLA fyrirspurnina í slóðina — sama slóð er nákvæmlega sama fyrirspurn. Þess
 *   vegna er skyndiminni eftir slóð merkingarlega nákvæmt: það getur aldrei
 *   skilað öðrum röðum en fyrirspurnin sjálf hefði skilað. Engin sía er
 *   endurútfærð hér, og þar með engin hætta á röngum gögnum á skjá.
 *
 * FERSKLEIKI — þrjár varnir, því tölur mega aldrei vera gamlar á peningaskjá:
 *   1. Svarið úr minni er sýnt STRAX og ferskt sótt í bakgrunni í sömu andrá.
 *      Sé nýja svarið annað er `App.refreshAll()` kallað (sama og 360 gerir).
 *   2. HVERT skrif (POST/PATCH/DELETE/PUT) á töflu hendir öllu skyndiminni
 *      þeirrar töflu samstundis. Vistun → lestur sýnir því aldrei gamalt gildi.
 *   3. Ekkert eldra en MAX_ALDUR er sýnt; þá er beðið eftir þjóninum eins og áður.
 *
 * SLÖKKT SJÁLFGEFIÐ. Þetta er tækjaval (~14 MB í minni) — gott á vinnutölvunum
 * fjórum, þungt á síma í 4G. Þess vegna localStorage: tækjaval eins vafra er
 * einmitt það sem má búa þar skv. SAMSTILLT-reglunni, ólíkt stöðu gagna.
 * ========================================================================== */
(() => {
  if (window.Vinnutolva) return;

  const LYKILL = 'vinnutolva_ultra';
  const MAX_ALDUR = 10 * 60 * 1000;      // eldra en þetta → sótt eins og áður
  const REST = '/rest/v1/';

  const minni = new Map();               // slóð -> { t, status, headers, texti }
  let uppfLotu = 0, uppfTimer = 0;

  const a = () => { try { return localStorage.getItem(LYKILL) === '1'; } catch (_) { return false; } };
  const kveikja = (v) => {
    try { localStorage.setItem(LYKILL, v ? '1' : '0'); } catch (_) {}
    if (!v) minni.clear();
    merki();
    return a();
  };

  const tafla = (slod) => {
    const i = slod.indexOf(REST);
    if (i < 0) return '';
    return slod.slice(i + REST.length).split(/[?&#]/)[0];
  };

  // Endurteikna þegar ferskt svar reynist annað en það sem var sýnt.
  function bodaUppfaerslu() {
    uppfLotu++;
    clearTimeout(uppfTimer);
    uppfTimer = setTimeout(() => {
      uppfLotu = 0;
      try { if (window.App && typeof App.refreshAll === 'function') App.refreshAll(); } catch (_) {}
    }, 400);
  }

  function svarAf(g) {
    return new Response(g.texti, { status: g.status, statusText: 'OK', headers: new Headers(g.headers || {}) });
  }

  async function geyma(slod, r) {
    try {
      const klon = r.clone();
      const texti = await klon.text();
      const headers = {};
      klon.headers.forEach((v, k) => { if (/^(content-type|content-range)$/i.test(k)) headers[k] = v; });
      const fyrir = minni.get(slod);
      minni.set(slod, { t: Date.now(), status: klon.status, headers, texti });
      return !!(fyrir && fyrir.texti !== texti);
    } catch (_) { return false; }
  }

  const upprunalegt = window.fetch.bind(window);

  window.fetch = function (inn, valk) {
    let slod = '';
    try { slod = typeof inn === 'string' ? inn : (inn && inn.url) || ''; } catch (_) {}
    const adferd = String((valk && valk.method) || (inn && inn.method) || 'GET').toUpperCase();

    // Skrif gegnum ÞJÓNUSTUFÖLL (payday-push, uttekt-upload, email-send …) breyta
    // líka töflum, en slóðin segir ekki hverjum. Þá er allt hreinsað — grófara en
    // nauðsyn, en eina rétta svarið: betra að sækja aftur en að sýna gamla tölu.
    if (adferd !== 'GET' && adferd !== 'HEAD'
        && (slod.indexOf('/.netlify/functions/') >= 0 || slod.indexOf('/api/') >= 0)) {
      minni.clear();
      return upprunalegt(inn, valk);
    }

    if (!slod || slod.indexOf(REST) < 0) return upprunalegt(inn, valk);

    // ── Skrif: hendum ÖLLU skyndiminni þeirrar töflu strax. Vistun → lestur
    //    má aldrei sýna gamalt gildi (docs/VERKLAG.md: vistun má ekki glatast).
    if (adferd !== 'GET' && adferd !== 'HEAD') {
      const t = tafla(slod);
      if (t) for (const k of [...minni.keys()]) if (tafla(k) === t) minni.delete(k);
      return upprunalegt(inn, valk);
    }

    if (!a()) return upprunalegt(inn, valk);

    // Range-hausar (síðuflettingar) eru hluti af fyrirspurninni og verða að
    // vera hluti af lyklinum, annars blandast síða 1 og síða 2 saman.
    let lykill = slod;
    try {
      const h = new Headers((valk && valk.headers) || (inn && inn.headers) || {});
      const rng = h.get('Range') || h.get('range');
      if (rng) lykill += '|range=' + rng;
      // `Prefer: count=…` breytir svarinu (content-range berst með talningu), svo
      // hann er hluti af fyrirspurninni og verður að vera hluti af lyklinum.
      const pref = h.get('Prefer') || h.get('prefer');
      if (pref) lykill += '|prefer=' + pref;
    } catch (_) {}

    const geymt = minni.get(lykill);
    if (geymt && Date.now() - geymt.t < MAX_ALDUR) {
      // Ferskt sótt í bakgrunni; sé svarið annað er teiknað upp á nýtt.
      upprunalegt(inn, valk)
        .then((r) => (r && r.ok ? geyma(lykill, r) : false))
        .then((breytt) => { if (breytt) bodaUppfaerslu(); })
        .catch(() => {});
      return Promise.resolve(svarAf(geymt));
    }

    return upprunalegt(inn, valk).then((r) => {
      if (r && r.ok) geyma(lykill, r);
      return r;
    });
  };

  // ── Merki á skjánum: það MÁ ekki vera hulið hvort tölur koma úr minni ──────
  function merki() {
    let el = document.getElementById('_vt-merki');
    if (!a()) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('button');
      el.id = '_vt-merki';
      el.type = 'button';
      el.title = 'Vinnutölva: lesin gögn geymd og sýnd strax, ferskt sótt í bakgrunni. Smelltu til að slökkva.';
      el.style.cssText = 'position:fixed;right:10px;bottom:10px;z-index:99998;border:1px solid #16a34a;'
        + 'background:#f0fdf4;color:#15803d;border-radius:999px;padding:4px 11px;font:600 11px/1 system-ui,sans-serif;'
        + 'cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.12)';
      el.onclick = () => { kveikja(false); };
      document.body.appendChild(el);
    }
    el.textContent = '⚡ Vinnutölva · ' + minni.size + ' svör í minni';
  }
  setInterval(() => { if (a()) merki(); }, 4000);
  if (document.readyState !== 'loading') merki();
  else document.addEventListener('DOMContentLoaded', merki);

  // ── Takkinn í Stillingum (sama aðferð og 19/29 nota til að bæta við röð) ──
  function setjaStillingu() {
    const sv = document.getElementById('view-settings');
    if (!sv || document.getElementById('_vt-stilling')) return;
    const box = sv.querySelector('.main-panel, .settings-wrap, main') || sv;
    const d = document.createElement('div');
    d.id = '_vt-stilling';
    d.style.cssText = 'padding:16px 20px;border-top:1px solid #e2e8f0';
    d.innerHTML =
      '<div style="font-weight:600;font-size:13px;color:#0f172a;margin-bottom:4px">⚡ Vinnutölva</div>'
      + '<div style="font-size:12px;color:#64748b;line-height:1.5;margin-bottom:9px">'
      + 'Geymir það sem er lesið og sýnir það strax næst — ferskt er alltaf sótt í bakgrunni og '
      + 'skjárinn uppfærist þegar það lendir. Hvert skrif hreinsar sína töflu, svo vistun sýnir aldrei gamalt gildi.<br>'
      + '<b>Kveiktu á vinnutölvunum</b> — ekki í síma á 4G, þetta heldur ~14 MB í minni. Valið gildir aðeins fyrir þessa tölvu.</div>'
      + '<label style="display:inline-flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">'
      + '<input id="_vt-rofi" type="checkbox"' + (a() ? ' checked' : '') + '> Kveikt á þessari tölvu</label>'
      + '<div id="_vt-stada" style="font-size:11.5px;color:#64748b;margin-top:7px"></div>';
    box.appendChild(d);
    const rofi = d.querySelector('#_vt-rofi');
    const stadaEl = d.querySelector('#_vt-stada');
    const syna = () => { stadaEl.textContent = a() ? (minni.size + ' svör í minni') : 'Slökkt — hvert kall fer á þjóninn eins og áður.'; };
    rofi.onchange = () => { kveikja(rofi.checked); syna(); };
    syna();
    setInterval(syna, 4000);
  }
  setInterval(setjaStillingu, 1500);

  window.Vinnutolva = {
    a, kveikja,
    stada: () => ({ kveikt: a(), svor: minni.size, toflur: [...new Set([...minni.keys()].map(tafla))].sort() }),
    hreinsa: () => { minni.clear(); merki(); },
  };
})();
/* === LOK VINNUTÖLVU === */
