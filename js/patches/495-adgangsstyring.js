/* 495 — Aðgangsstýring: hver sér hvaða síðu (Slökkvitæki-appið + Brunahólf) og „Skoða sem" starfsmaður.
 *
 * Agnar 03.11.2026: „Geturðu sett þarna Aðgangsstýring, inn á þjónustuborðið, bara fyrir Agnar … ég þarf að geta merkt
 * við allar síður í kerfinu, ekki bara eitthvað random,, leyfðu mér að opna sýnina hjá starfsmönnunum, svo ég sjái að
 * þetta virki".
 *
 *  • Flýtileiðin „Aðgangsstýring" á Þjónustuborðinu (368 linksHtml) sést aðeins þegar Agnar (AS, Admin) er skráður inn.
 *  • Síðulistinn er ALLT kerfið: Slökkvitæki-síðurnar lesnar lifandi úr hliðarstikunni (í röð hennar, undir flokkaheitum
 *    391, líka faldar síður), Brunahólfs-flipar úr hub_state á þjóninum (/api/hub-adgangar?listi=1 → katalogHub).
 *  • Vistun: POST {action:'sidur'} snertir aðeins síðuvalið. Lyklar: 'slokk:<data-view|slóð|@texti>', 'hub:<flipi>',
 *    'slokk:*'/'hub:*' = allar, 'slokk:!'/'hub:!' = engin. Enginn lykill = engin takmörkun (eins og fyrir 03.11).
 *  • Framfylgt hér fyrir innskráða starfsmenn (ekki admin): stílblað felur hnappa sem eru ekki leyfðir (rífur ekkert úr
 *    DOM-inu — 68/189/391 eiga hnappana), App.switchView og smellir á lokaðar síður stöðvaðir, og sé opin síða lokuð er
 *    farið á fyrstu leyfðu síðuna. Þetta er VIÐMÓTSHLIÐ eins og innskráningarkrafan — gögnin sjálf eru ekki læst á þjóni.
 *  • „Skoða sem": admin sér appið nákvæmlega eins og starfsmaðurinn. Staðan býr í slóðinni (?skoda_sem=LS) — engin
 *    vafrageymsla (audit-vafrastada), lifir endurhleðslu og hash-leiðsögn. Borði efst segir það og „Hætta" skilar öllu.
 *  Brunahólfs-hliðin: brunaholf/js/adgangur-hub.js (sama lyklakerfi, ?skoda_sem=NN).
 */
(function () {
  'use strict';
  if (window.Adgangsstyring) return;

  const HUB = 'https://brunaholf.netlify.app';
  const PARAM = 'skoda_sem';
  const ALIAS = { verkbord: 'bord' };          // nav-hnappur → view-id þar sem þau heita ekki eins
  const S = { st: null, skoda: null, sett: undefined, vafningur: null, beind: [] };
  const A = { opid: false, hledur: false, villa: '', users: [], katHub: [], arfur: {}, krefjast: false, krefjastSlokk: false,
    valId: null, app: 'slokk', drog: null, breytt: false, vistar: false, leit: '', katSlokk: null };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function tilkynna(m, villa) { try { if (typeof window.showToast === 'function') return window.showToast(m, villa); } catch (_) {} console.log('[495]', m); }
  function slodNn() { try { return new URLSearchParams(location.search).get(PARAM) || ''; } catch (_) { return ''; } }
  function setjaSlod(nn) {
    try { const u = new URL(location.href); if (nn) u.searchParams.set(PARAM, nn); else u.searchParams.delete(PARAM); history.replaceState(history.state, '', u.pathname + u.search + u.hash); } catch (_) {}
  }
  function api(method, body, qs) {
    const opt = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', cache: 'no-store' };
    if (body) opt.body = JSON.stringify(body);
    return fetch('/api/hub-adgangar' + (qs ? '?' + qs : ''), opt)
      .then((r) => r.json().catch(() => ({})).then((j) => { j._status = r.status; return j; }));
  }

  // ── hver er „ég" ──────────────────────────────────────────────────────────────────────────────────────────────────
  const raunNotandi = () => (S.st && S.st.authed && S.st.user) || null;
  const erAdmin = () => { const u = raunNotandi(); return !!(u && u.rola === 'Admin'); };
  const virkurNotandi = () => S.skoda || raunNotandi();

  // Leyfðir lyklar Slökkvitæki-appsins fyrir notanda, eða null = engin takmörkun.
  function settFyrir(u, app) {
    if (!u || (u.rola === 'Admin' && !u._skoda)) return null;
    const k = (u.sidur || []).filter((p) => String(p).indexOf(app + ':') === 0);
    if (!k.length || k.indexOf(app + ':*') > -1) return null;
    return new Set(k.filter((p) => p !== app + ':!'));
  }
  function reikna() { S.sett = settFyrir(virkurNotandi(), 'slokk'); return S.sett; }

  // ── síður Slökkvitæki-appsins, lesnar úr hliðarstikunni ───────────────────────────────────────────────────────────
  const nav = () => document.querySelector('nav.view-nav');
  function heiti(el) {
    if (el.classList.contains('qlinks-section')) return 'Tenglar (Storage, Skjaladropp, Drive)';
    const sp = [...el.querySelectorAll('span')].filter((s) => !/badge|count|ljos|ico|ext/i.test(s.className) && s.textContent.trim());
    return String((sp[0] || el).textContent || '').replace(/\s+/g, ' ').trim().replace(/\s*\d+$/, '').trim();
  }
  const slug = (t) => String(t).toLowerCase().replace(/\s+/g, '-').replace(/[<>"'`\\]/g, '').slice(0, 60);
  function lykill(el) {
    if (el.classList.contains('qlinks-section')) return 'slokk:@tenglar';
    const dv = el.getAttribute('data-view'); if (dv) return 'slokk:' + dv;
    const h = el.getAttribute('href'); if (h) return 'slokk:' + h;
    const t = heiti(el); return t ? 'slokk:@' + slug(t) : '';
  }
  function radadir() {
    const n = nav(); if (!n) return [];
    return [...n.querySelectorAll('.vnav-btn, .qlinks-section')]
      .map((el, i) => ({ el, i, o: parseFloat(el.style.order) || 0 })).sort((a, b) => a.o - b.o || a.i - b.i).map((x) => x.el);
  }
  function slokkKatalog() {
    const ut = [], sed = {}; let hopur = 'Efst í stikunni';
    radadir().forEach((el) => {
      if (el.classList.contains('nav-grp-start') && el.getAttribute('data-sbm-sec')) hopur = el.getAttribute('data-sbm-sec');
      const k = lykill(el); if (!k || sed[k]) return; sed[k] = 1;
      // Falið í stikunni (Aðlaga hliðarstiku, 162 o.fl.). Á meðan okkar takmörkun er virk segir computed style ósatt,
      // þá dugar inline-gildið sem 68 setur. opna() hættir „Skoða sem" á undan, svo þar er computed alltaf rétt.
      const falid = S.sett ? el.style.display === 'none' : getComputedStyle(el).display === 'none';
      const h = falid ? 'Falið í stikunni' : el.getAttribute('data-sbm-meira') === '1' ? 'Sjá meira' : hopur;
      ut.push({ k, n: heiti(el) || k.slice(6), h, ytri: el.tagName === 'A' && !el.getAttribute('data-view') });
    });
    return ut;
  }

  // ── framfylgd ─────────────────────────────────────────────────────────────────────────────────────────────────────
  const cssStr = (s) => String(s).replace(/["\\]/g, '');
  function leyftSyn(v) {
    if (!S.sett) return true;
    if (S.sett.has('slokk:' + v)) return true;
    for (const k in ALIAS) if (ALIAS[k] === v && S.sett.has('slokk:' + k)) return true;
    // Aðeins síður sem eru í valmyndinni teljast lokaðar; undirsíður (t.d. fyrirtækjaspjald) opnast úr leyfðri síðu.
    const n = nav(); if (!n) return true;
    const iNav = [...n.querySelectorAll('.vnav-btn[data-view]')].some((b) => { const d = b.getAttribute('data-view'); return d === v || ALIAS[d] === v; });
    return !iNav;
  }
  function leyftHnappur(el) { return !S.sett || S.sett.has(lykill(el)); }
  function merkjaTexta() {
    const n = nav(); if (!n) return;
    n.querySelectorAll('button.vnav-btn:not([data-view])').forEach((b) => {
      const ok = !!S.sett && S.sett.has(lykill(b));
      if (ok !== b.hasAttribute('data-adg-ok')) { if (ok) b.setAttribute('data-adg-ok', ''); else b.removeAttribute('data-adg-ok'); }
    });
  }
  function beita() {
    let st = document.getElementById('adg-takmorkun');
    if (!S.sett) { if (st) st.remove(); document.documentElement.removeAttribute('data-adg'); merkjaTexta(); return; }
    const v = [], h = [];
    S.sett.forEach((k) => { const x = k.slice(6); if (x.charAt(0) === '@') return; if (x.charAt(0) === '/' || /^https?:/.test(x)) h.push(x); else v.push(x); });
    const css = 'nav.view-nav .vnav-btn[data-view]' + v.map((x) => ':not([data-view="' + cssStr(x) + '"])').join('') + '{display:none!important}' +
      'nav.view-nav a.vnav-btn[href]:not([data-view])' + h.map((x) => ':not([href="' + cssStr(x) + '"])').join('') + '{display:none!important}' +
      'nav.view-nav button.vnav-btn:not([data-view]):not([data-adg-ok]){display:none!important}' +
      (S.sett.has('slokk:@tenglar') ? '' : 'nav.view-nav .qlinks-section{display:none!important}');
    if (!st) { st = document.createElement('style'); st.id = 'adg-takmorkun'; document.head.appendChild(st); }
    if (st.textContent !== css) st.textContent = css;
    document.documentElement.setAttribute('data-adg', 'takmarkad');
    merkjaTexta();
  }
  function fyrstaLeyfda() {
    const b = radadir().find((el) => el.matches('.vnav-btn[data-view]') && getComputedStyle(el).display !== 'none');
    const nu = Date.now(); S.beind = S.beind.filter((t) => nu - t < 5000);
    if (!b || S.beind.length >= 2) return;           // aldrei hringrás: í mesta lagi tvær tilfærslur á 5 s
    S.beind.push(nu); b.click();
  }
  function athugaSyn() {
    if (!S.sett) return;
    const act = document.querySelector('[id^="view-"].active');
    if (act && !leyftSyn(act.id.slice(5))) { tilkynna('Þessi síða er lokuð fyrir ' + (virkurNotandi().nafn || 'þennan aðgang') + '.', true); fyrstaLeyfda(); }
  }
  function vefja() {
    if (!S.sett || !window.App || typeof App.switchView !== 'function' || App.switchView === S.vafningur) return;
    const inn = App.switchView;
    const w = function (v) {
      if (S.sett && !leyftSyn(v)) { tilkynna('Þú hefur ekki aðgang að þessari síðu.', true); return; }
      return inn.apply(this, arguments);
    };
    Object.keys(inn).forEach((k) => { try { w[k] = inn[k]; } catch (_) {} });   // _patched o.fl. fylgja (sbr. 218)
    S.vafningur = w; App.switchView = w;
  }
  document.addEventListener('click', (e) => {
    if (!S.sett) return;
    const b = e.target && e.target.closest && e.target.closest('nav.view-nav .vnav-btn');
    if (b && !leyftHnappur(b)) { e.preventDefault(); e.stopImmediatePropagation(); tilkynna('Þú hefur ekki aðgang að þessari síðu.', true); return; }
    setTimeout(athugaSyn, 80);
  }, true);
  ['hashchange', 'popstate'].forEach((ev) => window.addEventListener(ev, () => setTimeout(athugaSyn, 120)));

  // ── „Skoða sem" ───────────────────────────────────────────────────────────────────────────────────────────────────
  function skodaSem(u) {
    if (!erAdmin()) return tilkynna('Aðeins admin getur skoðað sem annar.', true);
    S.skoda = { nn: u.nn || '', nafn: u.nafn, rola: u.rola, sidur: (u.sidur || []).slice(), _skoda: true };
    setjaSlod(u.nn || '#' + u.id);
    loka(); uppfaera();
    if (!S.sett) tilkynna(u.nafn + ' sér allar síður Slökkvitæki-appsins.');
  }
  function haettaSkoda() {
    S.skoda = null; setjaSlod('');
    uppfaera(); tilkynna('Þú sérð appið aftur sem þú sjálfur.');
  }
  function bordi() {
    let b = document.getElementById('adg-bordi');
    if (!S.skoda) { if (b) b.remove(); return; }
    const u = S.skoda, n = S.sett ? [...S.sett].filter((k) => k !== 'slokk:!').length : 0;
    const hub = settFyrir(u, 'hub');
    const html = '<span class="adg-b-l">Skoða sem</span><b>' + esc(u.nafn) + (u.nn ? ' (' + esc(u.nn) + ')' : '') + '</b>' +
      '<span class="adg-b-m">Slökkvitæki: ' + (S.sett ? n + (n === 1 ? ' síða' : ' síður') : 'allar síður') + ' · Brunahólf: ' + (hub ? [...hub].filter((k) => k !== 'hub:!').length + ' flipar' : 'allir flipar') + '</span>' +
      (u.nn ? '<a class="adg-b-btn" href="' + HUB + '/?skoda_sem=' + encodeURIComponent(u.nn) + '" target="_blank" rel="noopener">Brunahólf sem ' + esc(u.nn) + ' ↗</a>' : '') +
      '<button type="button" class="adg-b-btn adg-b-gull" id="adg-b-haetta">Hætta að skoða</button>';
    if (!b) { b = document.createElement('div'); b.id = 'adg-bordi'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
    if (b.innerHTML !== html) { b.innerHTML = html; b.querySelector('#adg-b-haetta').addEventListener('click', haettaSkoda); }
  }

  function uppfaera() {
    reikna(); beita(); vefja(); bordi(); athugaSyn();
    try { if (window.Thjonustubord5 && Thjonustubord5.render) Thjonustubord5.render(); } catch (_) {}
  }

  // ── Aðgangsstýringar-glugginn ─────────────────────────────────────────────────────────────────────────────────────
  function opna() {
    if (!erAdmin()) return tilkynna('Aðgangsstýring er aðeins fyrir admin.', true);
    if (S.skoda) haettaSkoda();
    A.opid = true; A.katSlokk = slokkKatalog(); A.villa = ''; teikna(); hlada();
  }
  function loka() { A.opid = false; const o = document.getElementById('adg-ovl'); if (o) o.remove(); document.removeEventListener('keydown', escLoka); }
  function escLoka(e) { if (e.key === 'Escape' && A.opid) loka(); }
  function hlada() {
    A.hledur = true; teikna();
    return api('GET', null, 'listi=1').then((j) => {
      A.hledur = false;
      if (j._status === 401) { A.villa = 'Innskráningin er útrunnin — skráðu þig inn aftur.'; return teikna(); }
      if (j._status === 403) { A.villa = 'Aðeins admin.'; return teikna(); }
      if (!j.users) { A.villa = 'Náði ekki sambandi við þjóninn.'; return teikna(); }
      A.users = j.users; A.katHub = j.katalogHub || []; A.arfur = j.arfur || {}; A.krefjast = !!j.krefjast; A.krefjastSlokk = !!j.krefjast_slokk;
      if (A.valId == null || !A.users.some((u) => u.id === A.valId)) { const f = A.users.find((u) => u.rola !== 'Admin') || A.users[0]; A.valId = f ? f.id : null; }
      A.drog = drogFra(valinn()); A.breytt = false; teikna();
    }).catch(() => { A.hledur = false; A.villa = 'Náði ekki sambandi við þjóninn.'; teikna(); });
  }
  const valinn = () => A.users.find((u) => u.id === A.valId) || null;
  const kat = (app) => (app === 'slokk' ? (A.katSlokk || []) : A.katHub);

  function drogFra(u) {
    const s = (u && u.sidur) || [], d = { arfur: false, annad: s.filter((p) => !/^(slokk|hub):/.test(p)) };
    ['slokk', 'hub'].forEach((app) => {
      const k = s.filter((p) => p.indexOf(app + ':') === 0);
      d[app] = { allar: !k.length || k.indexOf(app + ':*') > -1, sett: new Set(k.filter((p) => p !== app + ':*' && p !== app + ':!')) };
    });
    if (!s.some((p) => p.indexOf('hub:') === 0)) {
      const m = d.annad.map((l) => A.arfur[l]).filter(Boolean);
      if (m.length) { d.hub = { allar: false, sett: new Set(m) }; d.arfur = true; }
    }
    return d;
  }
  function sidurUr(d) {
    const ut = d.annad.slice();
    ['slokk', 'hub'].forEach((app) => { const x = d[app]; if (x.allar) ut.push(app + ':*'); else if (!x.sett.size) ut.push(app + ':!'); else x.sett.forEach((k) => ut.push(k)); });
    return ut;
  }
  function samantekt(u, app) {
    if (u.rola === 'Admin') return 'Admin · allt';
    const x = drogFra(u)[app];
    if (x.allar) return app === 'slokk' ? 'Allar síður' : 'Allir flipar';
    return x.sett.size ? x.sett.size + ' af ' + kat(app).length : 'Ekkert';
  }

  function teikna() {
    if (!A.opid) return;
    let o = document.getElementById('adg-ovl');
    if (!o) {
      o = document.createElement('div'); o.id = 'adg-ovl';
      o.addEventListener('mousedown', (e) => { if (e.target === o) loka(); });
      o.addEventListener('click', onClick); o.addEventListener('change', onChange); o.addEventListener('input', onInput);
      document.body.appendChild(o); document.addEventListener('keydown', escLoka);
    }
    const listi = o.querySelector('.adg-ritill .adg-hopar');
    const aftur = listi && window.Stodugt && Stodugt.vernda ? Stodugt.vernda(listi) : null;
    const skrun = listi ? listi.scrollTop : 0;
    o.innerHTML = '<div class="adg-kort" role="dialog" aria-modal="true" aria-label="Aðgangsstýring">' + hausHtml() + meginHtml() + '</div>';
    const nyr = o.querySelector('.adg-ritill .adg-hopar');
    if (nyr) { nyr.scrollTop = skrun; }
    if (aftur) try { aftur(); } catch (_) {}
  }
  function hausHtml() {
    return '<header class="adg-hd"><span class="adg-hn" aria-hidden="true"></span><span class="adg-hn r" aria-hidden="true"></span>' +
      '<div><div class="adg-over">— — Stjórnstöð · aðeins Agnar</div><h2>Aðgangsstýring</h2>' +
      '<div class="adg-sub">Hver sér hvaða síðu — Slökkvitæki-appið og Brunahólf</div></div>' +
      '<span class="adg-hd-lks">' +
        '<a class="adg-hd-lk gull" href="' + HUB + '/adgangar.html?nyr=1" target="_blank" rel="noopener" title="Stofna nýjan notanda og velja notandanafn">+ Bæta við aðgangi ↗</a>' +
        '<a class="adg-hd-lk" href="/innskraning.html" target="_blank" rel="noopener" title="Síðan sem starfsfólk skráir sig inn á">Innskráning starfsfólks ↗</a>' +
        '<a class="adg-hd-lk" href="' + HUB + '/adgangar.html" target="_blank" rel="noopener">Notendur og lykilorð ↗</a>' +
      '</span>' +
      '<button type="button" class="adg-x" data-a="loka" aria-label="Loka">✕</button></header>';
  }
  function rofi(felag, on, texti, lysing) {
    return '<div class="adg-rofi"><div><b>' + texti + '</b><span>' + lysing + '</span></div>' +
      '<button type="button" class="adg-sw' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" data-a="krefjast" data-felag="' + felag + '">' +
      '<span class="adg-sw-k"></span><span class="adg-sw-t">' + (on ? 'Á' : 'Af') + '</span></button></div>';
  }
  function meginHtml() {
    if (A.villa) return '<div class="adg-tomt"><p>' + esc(A.villa) + '</p>' + (/Innskrán/.test(A.villa) ? '<a class="adg-btn gull" href="/innskraning.html?next=' + encodeURIComponent(location.pathname + location.hash) + '">Skrá inn</a>' : '<button type="button" class="adg-btn" data-a="hlada">Reyna aftur</button>') + '</div>';
    if (A.hledur && !A.users.length) return '<div class="adg-tomt"><p>Sæki aðganga…</p></div>';
    return '<div class="adg-rofar">' +
        rofi('slokk', A.krefjastSlokk, 'Krefjast innskráningar · Slökkvitæki-appið', 'Síðuvalið gildir aðeins um þá sem eru skráðir inn. Á meðan þetta er af sér sá sem er ekki skráður inn allt.') +
        rofi('hub', A.krefjast, 'Krefjast innskráningar · Brunahólf', 'Stjórnstöðin brunaholf.netlify.app.') +
      '</div><div class="adg-meg"><aside class="adg-folk" aria-label="Starfsfólk">' + A.users.map(notandiHtml).join('') + '</aside>' +
      '<section class="adg-ritill" aria-label="Síður">' + ritillHtml() + '</section></div>';
  }
  function notandiHtml(u) {
    const val = u.id === A.valId;
    return '<button type="button" class="adg-u' + (val ? ' val' : '') + '" data-a="velja" data-id="' + u.id + '" aria-pressed="' + val + '">' +
      '<span class="adg-av">' + esc(u.nn || '—') + '</span><span class="adg-u-t"><b>' + esc(u.nafn) + '</b>' +
      '<small>' + esc(u.rola) + (u.nn ? '' : ' · vantar notandanafn') + (u.virkur ? '' : ' · óvirkur') + '</small>' +
      '<small class="adg-u-s">Slökkvitæki: ' + esc(samantekt(u, 'slokk')) + ' · Brunahólf: ' + esc(samantekt(u, 'hub')) + '</small></span></button>';
  }
  function ritillHtml() {
    const u = valinn(); if (!u) return '<div class="adg-tomt"><p>Veldu starfsmann.</p></div>';
    const adm = u.rola === 'Admin', d = A.drog, x = d[A.app], k = kat(A.app);
    let h = '<div class="adg-rh"><div><div class="adg-over">— — Aðgangur</div><h3>' + esc(u.nafn) + '</h3>' +
      '<div class="adg-meta">' + esc(u.nn || 'ekkert notandanafn') + ' · ' + esc(u.rola) + (u.felog && u.felog.length ? ' · ' + esc(u.felog.join(', ')) : '') + '</div></div>' +
      '<button type="button" class="adg-btn" data-a="skoda"' + (adm ? ' disabled title="Admin sér allt"' : '') + '>Skoða sem ' + esc(u.nn || u.nafn.split(' ')[0]) + '</button></div>';
    if (!u.nn) h += '<div class="adg-ath">Vantar notandanafn — ' + esc(u.nafn.split(' ')[0]) + ' getur ekki skráð sig inn fyrr en það er sett (Notendur og lykilorð ↗). Þú getur samt valið síður og skoðað.</div>';
    if (adm) return h + '<div class="adg-tomt"><p>Admin sér allar síður í báðum kerfum og getur stofnað aðganga.</p></div>';
    const fj = (app) => { const y = d[app]; return y.allar ? 'Allar' : y.sett.size + ' / ' + kat(app).length; };
    h += '<div class="adg-flipar" role="tablist">' +
      '<button type="button" role="tab" class="adg-fl' + (A.app === 'slokk' ? ' on' : '') + '" aria-selected="' + (A.app === 'slokk') + '" data-a="app" data-app="slokk">Slökkvitæki-appið <b>' + fj('slokk') + '</b></button>' +
      '<button type="button" role="tab" class="adg-fl' + (A.app === 'hub' ? ' on' : '') + '" aria-selected="' + (A.app === 'hub') + '" data-a="app" data-app="hub">Brunahólf <b>' + fj('hub') + '</b></button></div>';
    if (A.app === 'hub' && d.arfur) h += '<div class="adg-ath">Eldra val frá 19.10 („' + esc(d.annad.join('“, „')) + '“) er forvalið hér. Það hefur aldrei verið virkt og tekur fyrst gildi þegar þú vistar. „Skjöl" á engan flipa í Brunahólfi.</div>';
    h += '<div class="adg-tol"><label class="adg-allar"><input type="checkbox" data-a="allar"' + (x.allar ? ' checked' : '') + '><span><b>' + (A.app === 'slokk' ? 'Allar síður' : 'Allir flipar') + '</b><small>líka síður sem bætast við síðar</small></span></label>' +
      '<input type="search" class="adg-leit" data-a="leit" placeholder="Leita að síðu" aria-label="Leita að síðu" value="' + esc(A.leit) + '">' +
      '<button type="button" class="adg-btn sm" data-a="ekkert">Ekkert</button></div>';
    const hopar = []; const hMap = {};
    k.forEach((s) => { if (!hMap[s.h]) { hMap[s.h] = []; hopar.push(s.h); } hMap[s.h].push(s); });
    const tekid = new Set(k.map((s) => s.k));
    const utan = [...x.sett].filter((key) => !tekid.has(key));
    if (utan.length) { hopar.push('Ekki lengur í valmynd'); hMap['Ekki lengur í valmynd'] = utan.map((key) => ({ k: key, n: key.replace(/^(slokk|hub):@?/, ''), h: 'Ekki lengur í valmynd' })); }
    // Röð eins og stikan: efst fyrst, síðan flokkarnir, og það sem sést ekki í stikunni neðst.
    const AFTAST = ['Sjá meira', 'Utan röðunar', 'Falið í stikunni', 'Ekki lengur í valmynd'];
    hopar.sort((a, b) => (a === 'Efst í stikunni' ? -1 : b === 'Efst í stikunni' ? 1 : 0) || AFTAST.indexOf(a) - AFTAST.indexOf(b));
    const q = A.leit.trim().toLowerCase();
    h += '<div class="adg-hopar">' + (k.length ? hopar.map((hh) => {
      const lin = hMap[hh];
      const on = lin.filter((s) => x.allar || x.sett.has(s.k)).length;
      return '<fieldset class="adg-hopur"><legend><label><input type="checkbox" data-a="hopur" data-h="' + esc(hh) + '"' + (on === lin.length ? ' checked' : '') + '><span>' + esc(hh) + '</span></label><span class="adg-n" data-n="' + esc(hh) + '">' + on + ' / ' + lin.length + '</span></legend>' +
        '<div class="adg-gr">' + lin.map((s) => {
          const synd = !q || s.n.toLowerCase().indexOf(q) > -1;
          return '<label class="adg-ck"' + (synd ? '' : ' hidden') + ' data-nafn="' + esc(s.n.toLowerCase()) + '"><input type="checkbox" data-a="sida" data-k="' + esc(s.k) + '" data-h="' + esc(hh) + '"' + (x.allar || x.sett.has(s.k) ? ' checked' : '') + '><span>' + esc(s.n) + (s.ytri ? ' <small>↗</small>' : '') + '</span></label>';
        }).join('') + '</div></fieldset>';
    }).join('') : '<div class="adg-tomt"><p>' + (A.app === 'slokk' ? 'Hliðarstikan er ekki komin — lokaðu og opnaðu aftur eftir augnablik.' : 'Flipalisti Brunahólfs barst ekki frá þjóninum.') + '</p></div>') + '</div>';
    h += '<div class="adg-fotur"><span class="adg-breytt">' + (A.breytt ? 'Óvistaðar breytingar' : (A.vistar ? 'Vistar…' : '')) + '</span>' +
      (A.breytt ? '<button type="button" class="adg-btn" data-a="afturkalla">Afturkalla</button>' : '') +
      '<button type="button" class="adg-btn gull" data-a="vista"' + (A.breytt && !A.vistar ? '' : ' disabled') + '>Vista</button>' +
      '<button type="button" class="adg-btn dokk" data-a="vista-skoda"' + (A.vistar ? ' disabled' : '') + '>' + (A.breytt ? 'Vista og skoða sem ' : 'Skoða sem ') + esc(u.nn || u.nafn.split(' ')[0]) + '</button></div>';
    return h;
  }

  function setjaSidu(key, on) {
    const x = A.drog[A.app];
    if (x.allar) { x.allar = false; x.sett = new Set(kat(A.app).map((s) => s.k)); }
    if (on) x.sett.add(key); else x.sett.delete(key);
    if (A.app === 'hub') A.drog.arfur = false;
    A.breytt = true;
  }
  function onClick(e) {
    const el = e.target.closest('[data-a]'); if (!el || el.tagName === 'INPUT') return;
    const a = el.dataset.a;
    if (a === 'loka') return loka();
    if (a === 'hlada') return hlada();
    if (a === 'velja') {
      const id = Number(el.dataset.id); if (id === A.valId) return;
      if (A.breytt && !confirm('Óvistaðar breytingar á ' + (valinn() || {}).nafn + ' tapast. Halda áfram?')) return;
      A.valId = id; A.drog = drogFra(valinn()); A.breytt = false; A.leit = ''; return teikna();
    }
    if (a === 'app') { A.app = el.dataset.app; A.leit = ''; return teikna(); }
    if (a === 'ekkert') { const x = A.drog[A.app]; x.allar = false; x.sett = new Set(); A.breytt = true; return teikna(); }
    if (a === 'afturkalla') { A.drog = drogFra(valinn()); A.breytt = false; return teikna(); }
    if (a === 'skoda') { const u = valinn(); if (u) skodaSem(u); return; }
    if (a === 'vista' || a === 'vista-skoda') return vista(a === 'vista-skoda');
    if (a === 'krefjast') return krefjast(el.dataset.felag, !el.classList.contains('on'));
  }
  function onChange(e) {
    const el = e.target; if (!el.dataset || !el.dataset.a) return;
    const a = el.dataset.a, x = A.drog && A.drog[A.app];
    if (a === 'allar') {
      if (el.checked) { x.allar = true; } else { x.allar = false; x.sett = new Set(kat(A.app).map((s) => s.k)); }
      A.breytt = true; return teikna();
    }
    if (a === 'hopur') {
      const root = el.closest('fieldset');
      root.querySelectorAll('input[data-a="sida"]').forEach((c) => { setjaSidu(c.dataset.k, el.checked); });
      return teikna();
    }
    if (a === 'sida') {
      const varAllar = x.allar;
      setjaSidu(el.dataset.k, el.checked);
      if (varAllar) return teikna();             // „Allar" fór af — teikna hakið og teljarann
      // annars aðeins teljarar uppfærðir á staðnum (listinn heldur skruni og fókus)
      const o = document.getElementById('adg-ovl');
      const fs = el.closest('fieldset'), cs = [...fs.querySelectorAll('input[data-a="sida"]')], on = cs.filter((c) => c.checked).length;
      fs.querySelector('input[data-a="hopur"]').checked = on === cs.length;
      fs.querySelector('.adg-n').textContent = on + ' / ' + cs.length;
      const fl = o.querySelector('.adg-fl.on b'); if (fl) fl.textContent = x.sett.size + ' / ' + kat(A.app).length;
      const br = o.querySelector('.adg-breytt'); if (br) br.textContent = 'Óvistaðar breytingar';
      const v = o.querySelector('[data-a="vista"]'); if (v) v.disabled = false;
      const vs = o.querySelector('[data-a="vista-skoda"]'); const u = valinn(); if (vs && u) vs.textContent = 'Vista og skoða sem ' + (u.nn || u.nafn.split(' ')[0]);
      if (!o.querySelector('[data-a="afturkalla"]')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'adg-btn'; b.dataset.a = 'afturkalla'; b.textContent = 'Afturkalla'; br.after(b); }
    }
  }
  function onInput(e) {
    const el = e.target; if (!el.dataset || el.dataset.a !== 'leit') return;
    A.leit = el.value; const q = A.leit.trim().toLowerCase();
    document.querySelectorAll('#adg-ovl .adg-ck').forEach((l) => { l.hidden = !!q && l.dataset.nafn.indexOf(q) < 0; });
    document.querySelectorAll('#adg-ovl .adg-hopur').forEach((f) => { f.hidden = !!q && !f.querySelector('.adg-ck:not([hidden])'); });
  }
  function vista(svoSkoda) {
    const u = valinn(); if (!u) return;
    if (!A.breytt) { if (svoSkoda) skodaSem(u); return; }
    const sidur = sidurUr(A.drog);
    A.vistar = true; teikna();
    return api('POST', { action: 'sidur', id: u.id, sidur }).then((j) => {
      A.vistar = false;
      if (!j.ok) { tilkynna(j.error || 'Vistun mistókst.', true); return teikna(); }
      u.sidur = j.sidur || sidur; A.drog = drogFra(u); A.breytt = false;
      tilkynna('Síður vistaðar fyrir ' + u.nafn + '.');
      if (svoSkoda) skodaSem(u); else teikna();
    }).catch(() => { A.vistar = false; tilkynna('Vistun mistókst — netið svaraði ekki.', true); teikna(); });
  }
  function krefjast(felag, on) {
    const nafn = felag === 'slokk' ? 'Slökkvitæki-appinu' : 'Brunahólfi';
    if (!confirm((on ? 'Kveikja á' : 'Slökkva á') + ' innskráningarkröfu í ' + nafn + '?\n\n' + (on ? 'Allir sem opna það þurfa þá að skrá sig inn með notandanafni og lykilorði.' : 'Þá opnast það án innskráningar og síðuvalið gildir aðeins um þá sem skrá sig inn sjálfir.'))) return;
    api('POST', { action: 'krefjast', on, felag: felag === 'slokk' ? 'slokk' : undefined }).then((j) => {
      if (!j.ok) return tilkynna(j.error || 'Vistun mistókst.', true);
      if (felag === 'slokk') A.krefjastSlokk = on; else A.krefjast = on;
      tilkynna('Innskráning ' + (on ? 'krafist' : 'ekki krafist') + ' í ' + nafn + '.'); teikna();
    });
  }

  // ── stílblað (Brunastál: stálhaus með hnoðum, rjómaplata, gull) ───────────────────────────────────────────────────
  const st = document.createElement('style'); st.id = 'adg-still';
  st.textContent = [
    '#adg-ovl{position:fixed;inset:0;z-index:99980;background:rgba(10,10,12,.55);display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;overflow:auto;font-family:"IBM Plex Sans",system-ui,sans-serif}',
    '#adg-ovl .adg-kort{width:min(1180px,100%);background:#f6f2e8;color:#1a1714;border-radius:10px;border:1px solid #000;box-shadow:0 30px 70px -20px rgba(0,0,0,.7);overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 56px)}',
    '#adg-ovl .adg-hd{position:relative;display:flex;align-items:center;gap:16px;padding:18px 26px;color:#fff;background:linear-gradient(145deg,#08080a 0%,#26262c 30%,#3a3a41 50%,#19191d 75%,#070709 100%);border-bottom:2px solid #c9a14a;flex:none}',
    '#adg-ovl .adg-hn{position:absolute;left:10px;top:10px;width:7px;height:7px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#e6e6ea,#6b6b72 60%,#2a2a2e)}#adg-ovl .adg-hn.r{left:auto;right:10px}',
    '#adg-ovl .adg-over{font:700 10px/1.3 "JetBrains Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:#c9a95a}',
    '#adg-ovl h2{margin:2px 0 0;font:700 28px/1.1 "Playfair Display",Georgia,serif;color:#fff}',
    '#adg-ovl .adg-sub{font-size:12.5px;color:#aab2c0;margin-top:3px}',
    '#adg-ovl .adg-hd-lks{margin-left:auto;display:flex;flex-wrap:wrap;gap:6px 18px;align-items:center;justify-content:flex-end}',
    '#adg-ovl .adg-hd-lk{margin-left:auto;color:#e9cf86;font-size:12.5px;font-weight:600;text-decoration:none;white-space:nowrap}',
    '#adg-ovl .adg-hd-lks .adg-hd-lk{margin-left:0}',
    '#adg-ovl .adg-x{width:40px;height:40px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);color:#fff;font-size:16px;cursor:pointer;flex:none}',
    '#adg-ovl .adg-rofar{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px 26px;border-bottom:1px solid #d9d0bd;background:#efe8d8;flex:none}',
    '#adg-ovl .adg-rofi{display:flex;align-items:center;gap:12px;justify-content:space-between}#adg-ovl .adg-rofi b{display:block;font-size:13px}#adg-ovl .adg-rofi span{display:block;font-size:11.5px;color:#6b655a;line-height:1.35}',
    '#adg-ovl .adg-sw{position:relative;flex:none;width:66px;height:30px;border-radius:15px;border:1px solid #8a8170;background:#d6cfbf;cursor:pointer;padding:0}',
    '#adg-ovl .adg-sw-k{position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:linear-gradient(180deg,#fff,#cfcfd4);box-shadow:0 1px 2px rgba(0,0,0,.4);transition:left .15s}',
    '#adg-ovl .adg-sw-t{position:absolute;right:9px;top:0;line-height:28px;font:700 11px/28px "JetBrains Mono",monospace;color:#4a443a}',
    '#adg-ovl .adg-sw.on{background:linear-gradient(180deg,#e9cf86,#c9a14a 55%,#a9822f);border-color:#7d6020}#adg-ovl .adg-sw.on .adg-sw-k{left:39px}#adg-ovl .adg-sw.on .adg-sw-t{right:auto;left:10px;color:#2a1f08}',
    '#adg-ovl .adg-meg{display:grid;grid-template-columns:300px 1fr;min-height:0;flex:1}',
    '#adg-ovl .adg-folk{border-right:1px solid #d9d0bd;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:6px;background:#f1ecdf}',
    '#adg-ovl .adg-u{display:flex;gap:10px;align-items:flex-start;text-align:left;width:100%;padding:10px;border-radius:8px;border:1px solid #d9d0bd;background:#fbf8f1;cursor:pointer;color:inherit;font:inherit}',
    '#adg-ovl .adg-u.val{border-color:#a9822f;box-shadow:inset 3px 0 0 #c9a14a;background:#fff}',
    '#adg-ovl .adg-av{flex:none;width:38px;height:38px;border-radius:7px;display:flex;align-items:center;justify-content:center;font:700 11px/1 "JetBrains Mono",monospace;color:#fff;background:linear-gradient(145deg,#26262c,#3a3a41 50%,#19191d)}',
    '#adg-ovl .adg-u-t{display:flex;flex-direction:column;gap:2px;min-width:0}#adg-ovl .adg-u-t b{font-size:13.5px}#adg-ovl .adg-u-t small{font-size:11.5px;color:#6b655a}#adg-ovl .adg-u-s{color:#8a6a1f!important}',
    '#adg-ovl .adg-ritill{display:flex;flex-direction:column;min-height:0;padding:16px 22px 0}',
    '#adg-ovl .adg-rh{display:flex;align-items:flex-end;gap:12px;justify-content:space-between}#adg-ovl h3{margin:2px 0 0;font:700 22px/1.15 "Playfair Display",Georgia,serif}#adg-ovl .adg-meta{font-size:12px;color:#6b655a;margin-top:2px}',
    '#adg-ovl .adg-ath{margin-top:10px;padding:9px 12px;border-radius:7px;border:1px solid #e3c77d;background:#fbf1d6;font-size:12.5px;line-height:1.45}',
    '#adg-ovl .adg-flipar{display:flex;gap:6px;margin-top:14px;border-bottom:1px solid #d9d0bd}',
    '#adg-ovl .adg-fl{padding:9px 14px;border:1px solid transparent;border-bottom:0;border-radius:8px 8px 0 0;background:none;font:600 13px/1 inherit;font-family:inherit;color:#6b655a;cursor:pointer;margin-bottom:-1px}',
    '#adg-ovl .adg-fl b{margin-left:6px;font:700 11px/1 "JetBrains Mono",monospace;color:#8a6a1f}#adg-ovl .adg-fl.on{background:#fbf8f1;border-color:#d9d0bd;color:#1a1714}',
    '#adg-ovl .adg-tol{display:flex;gap:10px;align-items:center;padding:12px 0;flex-wrap:wrap}',
    '#adg-ovl .adg-allar{display:flex;align-items:center;gap:9px;padding:6px 12px;border:1px solid #d9d0bd;border-radius:8px;background:#fbf8f1;cursor:pointer}#adg-ovl .adg-allar span{display:flex;flex-direction:column}#adg-ovl .adg-allar b{font-size:13px}#adg-ovl .adg-allar small{font-size:11px;color:#6b655a}',
    '#adg-ovl input[type=checkbox]{width:18px;height:18px;margin:0;accent-color:#a9822f;flex:none}',
    '#adg-ovl .adg-leit{flex:1;min-width:160px;height:38px;padding:0 12px;border:1px solid #cfc5b0;border-radius:8px;background:#fff;font:inherit;font-size:13.5px}',
    '#adg-ovl .adg-hopar{flex:1;min-height:0;overflow:auto;padding-bottom:10px;display:flex;flex-direction:column;gap:10px}',
    '#adg-ovl .adg-hopur{margin:0;border:1px solid #d9d0bd;border-radius:8px;background:#fbf8f1;padding:8px 12px 10px}',
    '#adg-ovl .adg-hopur legend{display:flex;align-items:center;gap:10px;padding:0 6px;font:700 10.5px/1 "JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:#8a6a1f}',
    '#adg-ovl .adg-hopur legend label{display:flex;align-items:center;gap:8px;cursor:pointer}#adg-ovl .adg-n{color:#6b655a;letter-spacing:.04em}',
    '#adg-ovl .adg-gr{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px 10px;margin-top:6px}',
    '#adg-ovl .adg-ck{display:flex;align-items:center;gap:9px;min-height:36px;padding:0 8px;border-radius:6px;cursor:pointer;font-size:13.5px}#adg-ovl .adg-ck:hover{background:#f1ead8}#adg-ovl .adg-ck small{color:#6b655a}',
    '#adg-ovl .adg-ck[hidden],#adg-ovl .adg-hopur[hidden]{display:none}',
    '#adg-ovl .adg-fotur{display:flex;align-items:center;gap:10px;justify-content:flex-end;padding:12px 0 16px;border-top:1px solid #d9d0bd;flex:none}#adg-ovl .adg-breytt{margin-right:auto;font-size:12.5px;color:#a33a1f;font-weight:600}',
    '#adg-ovl .adg-btn{height:40px;padding:0 16px;border-radius:8px;border:1px solid #b9b0a0;background:linear-gradient(180deg,#fdfcf9,#e9e4d8);color:#1a1714;font:600 13px/1 "IBM Plex Sans",system-ui,sans-serif;cursor:pointer;white-space:nowrap;text-decoration:none;display:inline-flex;align-items:center}',
    '#adg-ovl .adg-btn.sm{height:34px;padding:0 12px}#adg-ovl .adg-btn:disabled{opacity:.45;cursor:default}',
    '#adg-ovl .adg-btn.gull{border-color:#7d6020;background:linear-gradient(180deg,#e9cf86,#c9a14a 55%,#a9822f);color:#2a1f08}',
    '#adg-ovl .adg-btn.dokk{border-color:#000;background:linear-gradient(145deg,#26262c,#3a3a41 50%,#19191d);color:#fff}',
    '#adg-ovl .adg-tomt{padding:40px 20px;text-align:center;color:#6b655a}#adg-ovl .adg-tomt p{margin:0 0 14px}',
    '@media (max-width:820px){#adg-ovl{padding:0}#adg-ovl .adg-kort{border-radius:0;max-height:none;min-height:100vh}#adg-ovl .adg-rofar{grid-template-columns:1fr;padding:12px 16px}#adg-ovl .adg-meg{grid-template-columns:1fr}#adg-ovl .adg-folk{border-right:0;border-bottom:1px solid #d9d0bd;flex-direction:row;overflow-x:auto}#adg-ovl .adg-u{min-width:230px}#adg-ovl .adg-ritill{padding:14px 16px 0}#adg-ovl .adg-hd{padding:16px;flex-wrap:wrap}#adg-ovl .adg-hd-lks{order:3;flex-basis:100%;margin-left:0;justify-content:flex-start;gap:8px 16px}#adg-ovl .adg-x{margin-left:auto}#adg-ovl .adg-fotur{flex-wrap:wrap}}',   // 10.11.2026: hlekkirnir voru faldir á mjóum skjá (display:none) — nú í eigin línu undir titlinum
    '#adg-bordi{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:99970;display:flex;align-items:center;gap:12px;max-width:calc(100vw - 16px);box-sizing:border-box;padding:7px 8px 7px 14px;border-radius:10px;border:1px solid #000;border-bottom:2px solid #c9a14a;background:linear-gradient(145deg,#08080a 0%,#26262c 30%,#3a3a41 50%,#19191d 75%,#070709 100%);color:#fff;font:500 12.5px/1.2 "IBM Plex Sans",system-ui,sans-serif;box-shadow:0 14px 30px -10px rgba(0,0,0,.6);flex-wrap:wrap}',
    '#adg-bordi .adg-b-l{font:700 10px/1 "JetBrains Mono",monospace;letter-spacing:.18em;text-transform:uppercase;color:#c9a95a}#adg-bordi .adg-b-m{color:#aab2c0}',
    '#adg-bordi .adg-b-btn{height:30px;padding:0 12px;border-radius:7px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:600 12px/30px inherit;font-family:inherit;cursor:pointer;text-decoration:none;white-space:nowrap}',
    '#adg-bordi .adg-b-gull{border-color:#7d6020;background:linear-gradient(180deg,#e9cf86,#c9a14a 55%,#a9822f);color:#2a1f08;line-height:28px}'
  ].join('\n');
  (document.head || document.documentElement).appendChild(st);

  // ── ræsing ────────────────────────────────────────────────────────────────────────────────────────────────────────
  const stada = window.__hubNotandiP || fetch('/api/hub-adgangar', { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.json());
  stada.then((st) => { S.st = st || {}; }).catch(() => { S.st = { authed: false }; }).then(() => {
    uppfaera();
    // ?skoda_sem=LS (eða #id án notandanafns) — aðeins admin; nýjasta vistaða síðuvalið sótt.
    const nn = slodNn();
    if (!nn) return;
    if (!erAdmin()) return setjaSlod('');
    api('GET', null, 'listi=1').then((j) => {
      const u = (j.users || []).find((x) => (nn.charAt(0) === '#' ? '#' + x.id === nn : String(x.nn || '').toUpperCase() === nn.toUpperCase()));
      if (!u) return setjaSlod('');
      S.skoda = { nn: u.nn || '', nafn: u.nafn, rola: u.rola, sidur: (u.sidur || []).slice(), _skoda: true };
      uppfaera();
    }).catch(() => {});
  });
  // Hnappar sem 19 pappar setja inn á mismunandi tímum — merkt aftur og switchView vafið aftur ef annar vafði eftir á.
  [1500, 4000, 9000].forEach((ms) => setTimeout(() => { if (S.sett) { beita(); vefja(); athugaSyn(); } }, ms));

  window.Adgangsstyring = {
    opna, loka, skodaSem, haettaSkoda,
    flytileid: () => !S.skoda && !!raunNotandi() && raunNotandi().nn === 'AS' && erAdmin(),   // „bara fyrir Agnar"
    stada: () => ({ notandi: raunNotandi(), skoda: S.skoda, takmorkun: S.sett ? [...S.sett] : null }),
    _katalog: slokkKatalog, _version: '495a'
  };
})();
