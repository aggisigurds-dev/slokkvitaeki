/* === TILBÚIN VERK — SÍMASÍÐA (515) — 17.11.2026 ==================================================
 *
 * Agnar 17.11.2026: „Og geturðu útbúið símaview sér öpp síðu sem ég get sett í þjónustuver öpp og sé fremst þar."
 * Hann afgreiðir forunnu verkin (Afgreiðslu) í símanum. Þessi síða er SAMA röðin og eining 30 á Þjónustuborðinu
 * (511) og /afgreidsla.html, teiknuð fyrir þumal: eitt spjald per verk.
 *
 *   · Spjald: tegund, VIP-merki, virði, titill, viðtakandi, EIN lína „af hverju" (restin felld saman), og textinn sem
 *     fer út — lesanlegur í heild og breytanlegur (pósturinn). Símtal: smellanlegt númer og það sem á að segja.
 *   · Eyður í hornklofum ([AFHENDINGARDAGUR]) og ágiskuð netföng sjást rauð og stöðva takkann þar til Agnar hefur
 *     fyllt/staðfest. Þjónninn stöðvar líka (sama regla, EYDA í afgreidsla.cjs) — síðan er aðeins fyrri vörnin.
 *   · Stór aðaltakki FRAMKVÆMIR, með sömu tveggja smella staðfestingu og borðið (fyrri smellur vopnar í 6 sek.).
 *   · Seinna · Sleppa (úrelt, varanlegt) · athugasemd á hverju spjaldi.
 *   · Röð: VIP efst, svo peningar (krafa / virði), svo forgangur þjónsins, svo virði. Flísar sía eftir tegund.
 *
 * EIN HEIMILD: ekkert sótt, sent eða vistað héðan. Gögnin, aðgerðirnar og staðfestingin eru úr window.BordAfgreidsla
 * (511): sama S-ástand, sömu föll (framkvaema/sleppa/seinna/vistaAth/vistaTexta/agiskun um data-baf-eigindi) og sama
 * /api/afgreidsla. 511 kallar á þessa síðu eftir hverja breytingu (BordAfgreidsla.vakta).
 *
 * Síða í öppum: 261 PAGES 'tilbuin-verk', heimasíða Þjónustuborðs-appsins (verkefni) og fremst í vistuðum lista
 * (insertOnce __tlb1). Slóð #tilbuin-verk; hliðarstika fær engan hnapp (á tölvu er einingin á borðinu).
 * ============================================================================================== */
(function (rot) {
  'use strict';
  if (rot.TilbuinSimi) return;

  var VIEW_ID = 'view-tilbuin-verk', NAV_KEY = 'tilbuin-verk';
  var FLOKKAR = ['allt', 'dagsverk', 'tolvupostur', 'simtal', 'krafa', 'verk', 'sameina', 'bokun'];
  // SÉRFLOKKAR (19.11.2026). „Bókanir“ (Agnar: „geturðu sett auka ham fyrir svona“ — bókunarpóstar og bókunarsímtöl) og
  // „Dagsverk“ (Agnar: „svona auka dagsvinnuplatform“ — verk dagsins, hvert með stöðu og dyrum). Liður með flokk úr
  // SERFLOKKAR (gogn.flokkur á þjóninum) býr í eigin flokki og er EKKI í „Allt“ né tegundaflokkunum, svo hann drukkni
  // ekki í hinum verkunum og hin verkin ekki í honum. Gildin: [eintala, fleirtala, heiti flokksins].
  var SERFLOKKAR = { dagsverk: ['dagsverk', 'dagsverk', 'Dagsverk'], bokun: ['bókun', 'bókanir', 'Bókanir'] };
  var serflokkur = function (v) { return v && Object.prototype.hasOwnProperty.call(SERFLOKKAR, v.flokkur) ? v.flokkur : null; };
  var erBokun = function (v) { return serflokkur(v) === 'bokun'; };
  var iFlokki = function (v, k) { var s = serflokkur(v); return Object.prototype.hasOwnProperty.call(SERFLOKKAR, k) ? s === k : !s && (!k || k === 'allt' || v.tegund === k); };
  var teljaFlokka = function (l) { var t = { allt: 0 }; (l || []).forEach(function (v) { var s = serflokkur(v), k = s || v.tegund; if (!s) t.allt++; t[k] = (t[k] || 0) + 1; }); return t; };
  var serTexti = function (tel) { return Object.keys(SERFLOKKAR).filter(function (k) { return tel[k]; }).map(function (k) { return ' · ' + tel[k] + ' ' + SERFLOKKAR[k][tel[k] === 1 ? 0 : 1]; }).join(''); };

  var HEITI = { allt: 'Allt', tolvupostur: 'Póstur', simtal: 'Símtal', krafa: 'Krafa', verk: 'Verk', sameina: 'Breyting', bokun: 'Bókanir', dagsverk: 'Dagsverk' };
  // Sama regla og þjónninn (afgreidsla.cjs EYDA) — prófið heldur þeim eins.
  var EYDA = /\[[^\]\n]{1,60}\]/g;

  var P = { sia: 'allt', rokOpin: {}, bida: false, kl: 0 };
  var A = function () { return rot.BordAfgreidsla || null; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  // Viðhengi svarsins sem TENGLAR á sama skjal og sendingin sækir (18.11.2026) — Agnar opnar og staðfestir í símanum
  // áður en hann sendir. Aðeins http(s); viðhengi án slóðar og eldri þjónn án vidhengi_opna birtast sem nafn.
  var vidhengiHtml = function (p) {
    var o = p && p.vidhengi_opna;
    if (!o || !o.length) return esc(((p && p.vidhengi) || []).join(', '));
    return o.map(function (x) {
      return x.url && /^https?:\/\//.test(String(x.url))
        ? '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">📎 ' + esc(x.nafn || 'skjal') + ' ↗</a>'
        : esc(x.nafn || 'skjal');
    }).join(' · ');
  };
  var kr = function (v) { return v == null || !isFinite(Number(v)) || Number(v) <= 0 ? '' : Math.round(Number(v)).toLocaleString('is-IS') + ' kr.'; };

  /* ── HREIN FÖLL (prófuð í test/tilbuin-simi.test.cjs) ─────────────────────────────────────────── */
  function eydur(t) {
    var m = String(t || '').match(EYDA) || [];
    return m.filter(function (x, i) { return m.indexOf(x) === i; });
  }
  function erPeningar(v) { return v.tegund === 'krafa' || Number(v.virdi_kr) > 0; }
  // 27.11.2026 (Agnar: „Priority. Ég vil geta svarað nýjum póstum samdægurs … hættið að þvinga gömlu bulli fremst"):
  // 0 = NÝR PÓSTUR (síðustu 3 daga, nýjastur efst), 1 = VIP, 2 = peningar, 3 = annað. Innan hóps: forgangur, virði, og
  // svo NÝRRA á undan eldra (áður: elsta fyrst).
  var NYR_POSTUR_MS = 3 * 864e5;
  function tima(s) { return Date.parse(s || '') || 0; }
  function erNyrPostur(v, nu) { return v.tegund === 'tolvupostur' && !!v.post_at && ((nu || Date.now()) - tima(v.post_at)) <= NYR_POSTUR_MS; }
  function hopur(v, nu) { return erNyrPostur(v, nu) ? 0 : v.vip ? 1 : erPeningar(v) ? 2 : 3; }
  function rada(listi, nu) {
    return (listi || []).map(function (v, i) { return [v, i]; }).sort(function (a, b) {
      var x = a[0], y = b[0];
      var hx = hopur(x, nu), hy = hopur(y, nu);
      if (hx !== hy) return hx - hy;
      if (hx === 0) return tima(y.post_at) - tima(x.post_at) || a[1] - b[1];
      var fx = x.forgangur == null ? 50 : Number(x.forgangur), fy = y.forgangur == null ? 50 : Number(y.forgangur);
      return fx - fy || (Number(y.virdi_kr) || 0) - (Number(x.virdi_kr) || 0) || tima(y.created_at) - tima(x.created_at) || a[1] - b[1];
    }).map(function (p) { return p[0]; });
  }
  function sia(listi, f) { return (listi || []).filter(function (v) { return iFlokki(v, f); }); }
  function teljarar(listi) {
    return teljaFlokka(listi);
  }
  // Hvað stöðvar takkann? null = má framkvæma. Þjónninn ræður (v.ok); hér bætast við eyður í drögunum sem enn hafa
  // ekki farið á þjóninn og óstaðfest ágiskun, svo ástæðan standi skýrt á spjaldinu.
  function stodvun(v, texti) {
    if (!v) return 'Verkið fannst ekki';
    if (v.tegund === 'tolvupostur') {
      var e = eydur(texti);
      if (e.length) return 'Fylltu inn ' + e.join(', ') + ' — ekkert sent fyrr en eyðurnar eru farnar';
    }
    var ag = (v.athuganir || []).filter(function (x) { return x && x.agiskun && !x.ok; });
    if (ag.length) return 'Ágiskað netfang: ' + ag.map(function (x) { return x.agiskun; }).join(', ') + ' — staðfestu eða taktu út';
    if (!v.ok) return 'Athugun stóðst ekki — ekkert verður gert';
    return null;
  }
  function vidtakandi(v) {
    if (v.tegund === 'tolvupostur' && v.post) {
      var t = (v.post.to || []).join(', ');
      return t + ((v.post.cc || []).length ? ' · afrit: ' + v.post.cc.join(', ') : '');
    }
    if (v.tegund === 'simtal' && v.simtal) return v.simtal.hverjum || '';
    if (v.tegund === 'krafa' && v.krafa) return v.krafa.r_numer ? 'Reikningur ' + v.krafa.r_numer : '';
    return '';
  }

  /* ── TEIKNING ───────────────────────────────────────────────────────────────────────────────── */
  function hausHtml(a) {
    // Talan í hausnum er sú sama og „Allt“ sýnir; sérflokkarnir (Dagsverk, Bókanir) eru taldir sér. Flipateljarinn telur allt.
    var S = a ? a.S : null, tel = S && S.tilbuin ? teljaFlokka(S.tilbuin) : null, n = tel ? tel.allt : null, ser = tel ? serTexti(tel) : '';
    var st = !S ? 'Hleð…' : S.loading && !S.tilbuin ? 'Sæki verkin…' : n == null ? (S.villa ? S.villa.texti : 'Sæki verkin…') :
      (n || ser ? n + ' tilbúin' + ser : 'Allt afgreitt') + (S.loading ? ' · uppfæri…' : S.at ? ' · sótt kl. ' + new Date(S.at).toTimeString().slice(0, 5) : '');
    return '<div class="ts-haus"><div><div class="tt">Tilbúin verk</div><div class="st" role="status">' + esc(st) + '</div></div>' +
      '<button type="button" class="ts-uppf" data-baf="uppf" aria-label="Sækja nýjustu stöðu" title="Sækja nýjustu stöðu">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg></button></div>';
  }
  function flisarHtml(listi) {
    var t = teljarar(listi);
    return '<div class="ts-fl" role="group" aria-label="Sía eftir tegund">' + FLOKKAR.filter(function (k) { return k === 'allt' || t[k] || P.sia === k; }).map(function (k) {
      return '<button type="button" data-ts="sia" data-f="' + k + '" aria-pressed="' + (P.sia === k) + '">' + HEITI[k] + ' <b>' + (t[k] || 0) + '</b></button>';
    }).join('') + '</div>';
  }
  function rokHtml(v, a) {
    var r = (v.af_hverju || []).filter(function (x) { return x && x.texti; });
    if (!r.length) return '';
    var fyrsta = '<div class="ts-af">' + esc(r[0].texti) + '</div>';
    if (r.length === 1 && !r[0].slod) return fyrsta;
    var opin = !!P.rokOpin[v.id];
    return fyrsta + '<details class="ts-rok" data-ts-rok="' + v.id + '"' + (opin ? ' open' : '') + '><summary>' + (r.length > 1 ? 'Fleiri rök (' + (r.length - 1) + ') og heimildir' : 'Heimild') + '</summary><ul>' +
      r.map(function (x, i) {
        var sl = x.slod && a && a.opnaHtml ? a.opnaHtml(x.slod) : '';
        return '<li>' + (i ? esc(x.texti) : '') + (x.heimild || sl ? '<span class="h">' + esc(x.heimild || '') + (sl ? ' ' + sl : '') + '</span>' : '') + '</li>';
      }).join('') + '</ul></details>';
  }
  function efniHtml(v, a, texti) { return (a && a.dyrHtml ? a.dyrHtml(v) : '') + efniAn(v, a, texti); }   // 18.11.2026: dyr efst (521 Gatt opnar ofan á síðunni)
  function efniAn(v, a, texti) {
    if (v.tegund === 'tolvupostur' && v.post) {
      var e = eydur(texti), sv = v.svar_vid;
      // 27.11.2026 (Agnar: „Vantar kannski bara að vita hver skilaboðin voru"): skeytið frá kúnnanum OPIÐ sjálfgefið, með
      // tíma, og „Svarið þitt" skilur það frá drögunum — áður var það samanbrotið og viðhengi svarsins virtist tilheyra því.
      return (sv ? '<details class="ts-rok" open><summary>Skeytið frá ' + esc(sv.fra) + (sv.dags ? ' · ' + esc(sv.dags) : '') + '</summary><div class="ts-skeyti"><b>' + esc(sv.efni) + '</b><pre>' + esc(sv.texti) + '</pre></div></details>' : '') +
        '<div class="ts-svh">Svarið þitt</div>' +
        '<div class="ts-efni-h">Efni: <b>' + esc(v.post.subject) + '</b>' + ((v.post.vidhengi || []).length ? ' · viðhengi: ' + vidhengiHtml(v.post) : '') + '</div>' +
        (e.length ? '<div class="ts-eyda" role="alert">Fylltu inn: ' + e.map(function (x) { return '<code>' + esc(x) + '</code>'; }).join(' ') + '</div>' : '') +
        '<textarea class="ts-ta' + (e.length ? ' _eyda' : '') + '" data-baf-texti="' + v.id + '" data-ritun="1" rows="' + (a && a.linur ? a.linur(texti) : 10) + '" spellcheck="true" aria-label="Textinn sem fer út">' + esc(texti) + '</textarea>';
    }
    if (v.tegund === 'simtal' && v.simtal) {
      var s = v.simtal, num = String(s.simi || '').replace(/[^\d+]/g, '');
      return (num ? '<a class="ts-simi" href="tel:' + esc(num) + '"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>Hringja · ' + esc(s.simi) + '</a>' : '<div class="ts-eyda">Ekkert símanúmer á verkinu</div>') +
        (s.handrit ? '<div class="ts-efni-h">Það sem á að segja</div><pre class="ts-pre">' + esc(s.handrit) + '</pre>' : '');
    }
    if (v.tegund === 'verk') return '<pre class="ts-pre">' + esc((v.verk || {}).lysing) + '</pre>';
    if (v.tegund === 'krafa' && v.krafa) return v.krafa.slod && a && a.opnaHtml ? '<div class="ts-efni-h">' + a.opnaHtml(v.krafa.slod) + '</div>' : '';
    if (v.tegund === 'sameina' && v.sameina) return '<pre class="ts-pre">' + esc(v.sameina.lysing) + '</pre>';
    return '';
  }
  function spjaldHtml(v, a) {
    var S = a.S, texti = a.textiNu(v), stopp = stodvun(v, texti);
    var upptekid = S.busy === v.id, vopnF = S.vopnad === 'framkvaema:' + v.id, vopnS = S.vopnad === 'sleppa:' + v.id;
    var fall = (v.athuganir || []).filter(function (x) { return x && !x.ok; });
    var vid = vidtakandi(v), virdi = kr(v.virdi_kr);
    var h = '<article class="ts-sp' + (v.vip ? ' _vip' : '') + (stopp ? ' _stopp' : '') + '" data-id="' + v.id + '">';
    h += '<div class="ts-topp"><span class="ts-teg">' + esc(HEITI[v.tegund] || v.tegund) + '</span>' +
      (v.vip ? '<span class="ts-vip" title="Félag á VIP-vaktinni (' + esc(v.vip.hvernig) + ')">VIP · ' + esc(v.vip.felag) + '</span>' : '') +
      (virdi ? '<span class="ts-kr">' + esc(virdi) + '</span>' : '') + '</div>';
    h += '<h3 class="ts-tt">' + esc(v.titill) + '</h3>';
    if (vid) h += '<div class="ts-vid">' + (v.tegund === 'tolvupostur' ? 'Til ' : v.tegund === 'simtal' ? 'Hringja í ' : '') + esc(vid) + '</div>';
    h += rokHtml(v, a);
    h += '<div class="ts-efni">' + efniHtml(v, a, texti) + '</div>';
    // Aðeins það sem fellur sést strax — með ágiskunartökkunum úr 511 (sama markup, sama aðgerð).
    if (fall.length && a.athHtml) h += '<div class="ts-ath">' + a.athHtml(fall, v.id) + '</div>';
    if (S.skilabod && S.skilabod.id === v.id) h += '<div class="ts-msg" role="alert">' + esc(S.skilabod.texti) + '</div>';
    else if (v.sidasta_tilraun) h += '<div class="ts-msg" role="alert">' + esc(v.sidasta_tilraun) + '</div>';   // vistuð á þjóninum
    h += '<button type="button" class="ts-go' + (vopnF ? ' _vopn' : '') + '" data-baf="framkvaema" data-id="' + v.id + '"' + (stopp || upptekid ? ' disabled' : '') + '>' +
      esc(upptekid ? 'Augnablik…' : vopnF ? 'Ýttu aftur til að staðfesta' : v.takki || 'Framkvæma') + '</button>';
    if (stopp) h += '<div class="ts-stopp">' + esc(stopp) + '</div>';
    else h += '<div class="ts-hvad">' + esc(v.hvad_gerist || '') + '</div>';
    h += '<div class="ts-aukat">' +
      '<button type="button" data-baf="seinna" data-id="' + v.id + '"' + (upptekid ? ' disabled' : '') + '>Seinna</button>' +
      '<button type="button" class="' + (vopnS ? '_vopn' : '') + '" data-baf="sleppa" data-id="' + v.id + '"' + (upptekid ? ' disabled' : '') + ' title="Tekur verkið úr röðinni fyrir fullt og allt. Athugasemdin fylgir sem ástæða.">' +
        (vopnS ? 'Ýttu aftur — kemur ekki aftur' : (v.tegund === 'sameina' ? 'Hafna' : 'Sleppa · úrelt')) + '</button></div>';
    var athT = a.athNu(v);
    h += '<details class="ts-athug"' + (athT || (S.athSkilabod && S.athSkilabod.id === v.id) ? ' open' : '') + '><summary>Athugasemd' + (v.athugasemd ? ' · vistuð' : '') + '</summary>' +
      '<textarea class="ts-ta _lag" data-baf-ath="' + v.id + '" data-ritun="1" maxlength="2000" spellcheck="true" aria-label="Athugasemd á verkið" placeholder="Til Claude og Tonys — vistast á verkið">' + esc(athT) + '</textarea>' +
      '<div class="ts-athv"><button type="button" data-baf="ath-vista" data-id="' + v.id + '"' + (S.athBusy === v.id ? ' disabled' : '') + '>' + (S.athBusy === v.id ? 'Vista…' : 'Vista athugasemd') + '</button>' +
      '<span role="status">' + esc(S.athSkilabod && S.athSkilabod.id === v.id ? S.athSkilabod.texti : '') + '</span></div></details>';
    return h + '</article>';
  }
  function meginmal(a) {
    if (!a) return '<div class="ts-tomt">Hleð Afgreiðsluna…</div>';
    var S = a.S;
    if (!S.tilbuin) {
      if (S.villa) return '<div class="ts-tomt">' + esc(S.villa.texti) + (S.villa.inn ? ' · <a href="/innskraning.html?next=' + encodeURIComponent('/#' + NAV_KEY) + '">Skrá inn ›</a>' : '') + '</div>';
      return '<div class="ts-bid" aria-hidden="true"></div><div class="ts-bid" aria-hidden="true"></div>';
    }
    var h = '';
    if (S.villa) h += '<div class="ts-msg" role="status">' + esc(S.villa.texti) + ' — sýni síðustu stöðu.</div>';
    // 27.11.2026 (Agnar: „ýtti á senda en hef ekki andsk. hugmynd hvort það virkaði"): það sem fór, grænt og efst, stendur.
    if (S.gert && S.gert.length) h += S.gert.map(function (g) { return '<div class="ts-msg ts-ok" role="status">' + esc(g.texti) + '</div>'; }).join('');
    if (!S.tilbuin.length) return h + '<div class="ts-tomt"><b>Allt afgreitt.</b> Ný verk birtast hér þegar þau eru tilbúin og standast athuganirnar.</div>';
    var l = rada(sia(S.tilbuin, P.sia));
    h += flisarHtml(S.tilbuin);
    h += l.length ? l.map(function (v) { return spjaldHtml(v, a); }).join('') : '<div class="ts-tomt">Ekkert í þessum flokki.</div>';
    return h;
  }

  /* ── SKJÁRINN ───────────────────────────────────────────────────────────────────────────────── */
  function ritad() {
    var v = document.getElementById(VIEW_ID), ae = document.activeElement;
    return !!(v && ae && v.contains(ae) && ae.getAttribute && ae.getAttribute('data-ritun'));
  }
  function render() {
    var v = document.getElementById(VIEW_ID);
    if (!v || !v.classList.contains('active')) { teljari(); return; }
    // Stöðugt viðmót: ekki skipta um reit á meðan skrifað er — teiknað þegar farið er úr honum (eins og 368 gerir).
    if (ritad()) { P.bida = true; teljari(); return; }
    P.bida = false;
    var a = A(), rotEl = v.querySelector('#_ts515-root');
    var skrun = v.scrollTop;
    rotEl.innerHTML = hausHtml(a) + '<div class="ts-listi">' + meginmal(a) + '</div>';
    v.scrollTop = skrun;
    teljari();
  }
  // Teljari á flipanum (og á app-tákninu þar sem vafrinn styður það) — aðeins þegar talan breytist.
  function teljari() {
    var a = A(), n = a && a.S && a.S.tilbuin ? a.S.tilbuin.length : null;
    if (n === P.kl) return;
    P.kl = n;
    try {
      var t = document.querySelector('#_app-nav ._app-tab[data-k="' + NAV_KEY + '"]');
      if (t) { if (n) t.setAttribute('data-ts-n', String(n)); else t.removeAttribute('data-ts-n'); }
    } catch (_) {}
    try {
      if (document.body.classList.contains('appmode') && navigator.setAppBadge) { if (n) navigator.setAppBadge(n); else if (navigator.clearAppBadge) navigator.clearAppBadge(); }
    } catch (_) {}
  }
  function smellur(e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-ts]') : null;
    if (!el) return;
    if (el.getAttribute('data-ts') === 'sia') { P.sia = el.getAttribute('data-f') || 'allt'; render(); }
  }
  function css() {
    var MONO = '"JetBrains Mono",ui-monospace,monospace', SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif', DISP = '"Playfair Display",Georgia,serif';
    var V = 'html body #' + VIEW_ID;
    var SILFUR = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
    return [
      V + '{display:none;min-height:100vh;background:#e2e6ec;background-image:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%);font-family:' + SANS + ';color:#141822;padding-bottom:120px}',
      V + '.active{display:block}',
      V + ' *{box-sizing:border-box}',
      V + ' .ts-haus{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(180deg,#2b2e35 0%,#191b20 100%);border-bottom:1px solid #000;color:#fff}',
      V + ' .ts-haus>div{min-width:0;flex:1 1 auto}',
      V + ' .ts-haus .tt{font-family:' + DISP + ';font-weight:800;font-size:20px;line-height:1}',
      V + ' .ts-haus .st{font-family:' + MONO + ';font-size:11px;color:#aab2c0;margin-top:4px;letter-spacing:.03em}',
      V + ' .ts-uppf{flex:none;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:9px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.07);color:#fff;cursor:pointer}',
      V + ' .ts-listi{max-width:760px;margin:0 auto}',
      V + ' .ts-fl{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:10px 12px 4px;-webkit-overflow-scrolling:touch}',
      V + ' .ts-fl::-webkit-scrollbar{display:none}',
      V + ' .ts-fl button{flex:none;min-height:44px;padding:0 14px;border-radius:9px;border:1px solid rgba(20,24,34,.2);background:' + SILFUR + ';color:#1f2530;font:700 14px ' + SANS + ';cursor:pointer;white-space:nowrap}',
      V + ' .ts-fl button b{font-family:' + MONO + ';margin-left:3px}',
      V + ' .ts-fl button[aria-pressed="true"]{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);color:#fff;border-color:#000}',
      V + ' .ts-sp{margin:10px 12px;padding:14px 14px 12px;border-radius:12px;background:#fff;border:1px solid rgba(20,24,34,.16);box-shadow:0 1px 2px rgba(0,0,0,.06)}',
      V + ' .ts-sp._vip{box-shadow:inset 4px 0 0 #c99a3a,0 1px 2px rgba(0,0,0,.06)}',
      V + ' .ts-topp{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-bottom:6px}',
      V + ' .ts-teg{font:700 10.5px ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;padding:3px 7px;border:1px solid rgba(20,24,34,.25);border-radius:3px;color:#3a4250}',
      V + ' .ts-vip{font:700 11px ' + MONO + ';padding:3px 7px;border-radius:3px;background:#1c1608;color:#f1d98f;letter-spacing:.04em}',
      V + ' .ts-kr{margin-left:auto;font:700 15px ' + MONO + ';color:#141822;font-variant-numeric:tabular-nums}',
      V + ' .ts-tt{margin:0 0 4px;font-size:17px;line-height:1.3;font-weight:700;color:#11141c;overflow-wrap:anywhere}',
      V + ' .ts-vid{font-size:14px;color:#3a4250;overflow-wrap:anywhere;margin-bottom:6px}',
      V + ' .ts-af{font-size:14px;line-height:1.45;color:#141822;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      V + ' .ts-rok{margin-top:6px;font-size:14px}',
      V + ' .ts-rok summary{min-height:36px;display:flex;align-items:center;font-weight:600;color:#3a4250;cursor:pointer}',
      V + ' .ts-rok ul{margin:4px 0 0;padding-left:18px;line-height:1.45}',
      V + ' .ts-rok li{margin-bottom:6px}',
      V + ' .ts-rok .h{display:block;font:12px/1.4 ' + MONO + ';color:#5b6472}',
      V + ' .ts-rok a,' + V + ' .ts-efni-h a,' + V + ' .ts-ath a{color:#1f2530;font-weight:700}',
      V + ' .ts-skeyti{padding:8px 10px;border:1px solid rgba(20,24,34,.15);border-radius:6px;background:#f6f7f9}',
      V + ' .ts-skeyti pre,' + V + ' .ts-pre{margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.5 ' + SANS + ';color:#141822}',
      V + ' .ts-pre{padding:10px 12px;border:1px solid rgba(20,24,34,.15);border-radius:8px;background:#fffdf7}',
      V + ' .ts-efni{margin-top:10px}',
      V + ' .ts-efni-h{font-size:13px;color:#3a4250;margin:8px 0 6px;overflow-wrap:anywhere}',
      V + ' .ts-svh{margin:14px 0 2px;font:800 12px ' + SANS + ';letter-spacing:.08em;text-transform:uppercase;color:#3a4250}',
      V + ' .ts-ta{display:block;width:100%;padding:10px 12px;border:1px solid rgba(20,24,34,.25);border-radius:8px;background:#fff;font:16px/1.5 ' + SANS + ';color:#141822;resize:vertical}',
      V + ' .ts-ta._eyda{border:2px solid #b42318;background:#fff7f6}',
      V + ' .ts-ta._lag{min-height:72px}',
      V + ' .ts-ta:focus-visible{outline:2px solid #b42318;outline-offset:1px}',
      V + ' .ts-eyda{margin:6px 0;padding:8px 10px;border-radius:8px;background:#fff1f0;border:1px solid rgba(180,35,24,.45);color:#8a1c12;font-weight:700;font-size:14px}',
      V + ' .ts-eyda code{font:700 13px ' + MONO + ';background:#fff;border:1px solid rgba(180,35,24,.35);border-radius:4px;padding:1px 5px;margin:0 2px}',
      V + ' .ts-simi{display:flex;align-items:center;justify-content:center;gap:10px;min-height:52px;border-radius:10px;background:linear-gradient(180deg,#1f6b3c 0%,#145229 100%);color:#fff;font:700 17px ' + SANS + ';text-decoration:none;border:1px solid #0b3519}',
      V + ' .ts-ath{margin-top:10px;padding:8px 10px;border-radius:8px;background:#fff1f0;border:1px solid rgba(180,35,24,.3);font-size:14px}',
      V + ' .ts-ath h3{display:none}',
      V + ' .ts-ath ul{list-style:none;margin:0;padding:0}',
      V + ' .ts-ath li{display:flex;gap:8px;align-items:flex-start;margin:0 0 6px}',
      V + ' .ts-ath .baf-nei{color:#a1161a;font-weight:800}',
      V + ' .ts-ath .btn{min-height:44px;padding:0 12px;border-radius:8px;border:1px solid rgba(20,24,34,.22);background:' + SILFUR + ';color:#1f2530;font:700 14px ' + SANS + ';cursor:pointer}',
      V + ' .ts-msg{margin:10px 0;padding:10px 12px;border-radius:8px;border:1px solid rgba(180,35,24,.5);background:#fff3f1;color:#8a1c12;font-weight:600;font-size:14px}',
      V + ' .ts-listi>.ts-msg{margin:10px 12px}',
      V + ' .ts-msg.ts-ok{border-color:rgba(22,120,60,.5);background:#eefaf1;color:#135c2e;font-size:15px}',
      V + ' .ts-go{display:block;width:100%;min-height:56px;margin-top:12px;padding:10px 14px;border-radius:10px;border:1px solid #6d0f12;border-top-color:#e2574c;background:linear-gradient(#c3271c,#a1161a);color:#fff;font:800 17px ' + SANS + ';cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 2px 5px rgba(22,21,19,.35)}',
      V + ' .ts-go._vopn{border-color:#b8892e;background:#161513;color:#f7e6b8;box-shadow:0 0 0 3px rgba(184,137,46,.5)}',
      V + ' .ts-go[disabled]{cursor:not-allowed;background:#b9b3a6;border-color:#9a9383;box-shadow:none}',
      V + ' .ts-stopp{margin-top:6px;font-size:13.5px;font-weight:700;color:#8a1c12}',
      V + ' .ts-hvad{margin-top:6px;font-size:13px;line-height:1.4;color:#5b6472}',
      V + ' .ts-aukat{display:flex;gap:8px;margin-top:10px}',
      V + ' .ts-aukat button,' + V + ' .ts-athv button{flex:1 1 0;min-height:44px;border-radius:9px;border:1px solid rgba(20,24,34,.22);background:' + SILFUR + ';color:#1f2530;font:700 14px ' + SANS + ';cursor:pointer}',
      V + ' .ts-aukat button._vopn{background:#161513;color:#f7e6b8;border-color:#b8892e}',
      V + ' .ts-athug{margin-top:10px;font-size:14px}',
      V + ' .ts-athug summary{min-height:40px;display:flex;align-items:center;font-weight:600;color:#3a4250;cursor:pointer}',
      V + ' .ts-athv{display:flex;align-items:center;gap:10px;margin-top:6px}',
      V + ' .ts-athv button{flex:0 0 auto;padding:0 16px}',
      V + ' .ts-athv span{font:12px ' + MONO + ';color:#5b6472}',
      V + ' .ts-tomt{margin:16px 12px;padding:16px;border-radius:12px;background:#fff;border:1px solid rgba(20,24,34,.14);font-size:15px;color:#3a4250}',
      V + ' .ts-bid{margin:10px 12px;height:180px;border-radius:12px;background:linear-gradient(90deg,rgba(255,255,255,.6),rgba(255,255,255,.9),rgba(255,255,255,.6))}',
      V + ' button:focus-visible,' + V + ' a:focus-visible,' + V + ' summary:focus-visible{outline:2px solid #b42318;outline-offset:2px}',
      // Teljarinn á flipanum í botnstikunni (261 #_app-nav) — aðeins á þessum flipa.
      '#_app-nav ._app-tab[data-k="' + NAV_KEY + '"]{position:relative}',
      '#_app-nav ._app-tab[data-k="' + NAV_KEY + '"][data-ts-n]::after{content:attr(data-ts-n);position:absolute;top:4px;right:6px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#c3271c;color:#fff;font:700 11px/18px ' + MONO + ';text-align:center}'
    ].join('\n');
  }
  function injectCss() {
    if (document.getElementById('_ts515-css')) return;
    var st = document.createElement('style'); st.id = '_ts515-css'; st.textContent = css() + (window.BordAfgreidsla && BordAfgreidsla.dyrCss ? BordAfgreidsla.dyrCss() : '');   // + dyrnar (511)
    (document.head || document.documentElement).appendChild(st);
  }
  function ensureView() {
    var v = document.getElementById(VIEW_ID);
    if (v) return v;
    v = document.createElement('div');
    v.id = VIEW_ID; v.className = 'view';
    v.innerHTML = '<div id="_ts515-root"></div>';
    v.addEventListener('click', smellur);
    v.addEventListener('toggle', function (e) {
      var d = e.target; if (!d || !d.getAttribute) return;
      var id = d.getAttribute('data-ts-rok'); if (id) P.rokOpin[id] = d.open;
    }, true);
    // Teikning sem beið á meðan skrifað var fer af stað þegar farið er úr reitnum (á eftir vistun 511).
    v.addEventListener('focusout', function () { setTimeout(function () { if (P.bida && !ritad()) render(); }, 0); });
    document.body.appendChild(v);
    return v;
  }
  function tengja() {
    var a = A();
    if (!a || !a.festa || !a.vakta) { setTimeout(tengja, 300); return; }
    var v = ensureView();
    // Sömu smell-/innsláttar-/vistunarhlustarar og borðið (511): data-baf framkvæmir, vistar og staðfestir.
    a.festa(v);
    a.vakta(render);
    teljari();
  }
  var _poll = 0;
  function open() {
    injectCss();
    var v = ensureView();
    document.querySelectorAll('.view,[id^="view-"]').forEach(function (x) { x.style.display = 'none'; x.classList.remove('active'); });
    v.style.display = 'block'; v.classList.add('active');
    document.querySelectorAll('.vnav-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-view') === NAV_KEY); });
    try { if ((location.hash || '').replace(/^#/, '') !== NAV_KEY) history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
    render();
    var a = A();
    if (a) { if (a.S && a.S.tilbuin && !a.S.busy && !a.S.vopnad) a.uppfaera(); else a.tryggja(); }
    clearInterval(_poll);
    _poll = setInterval(function () { var vv = document.getElementById(VIEW_ID); var b = A(); if (vv && vv.classList.contains('active') && !document.hidden && b) b.tryggja(); }, 60000);
    if (!rot.__ts515Vakt) {
      rot.__ts515Vakt = true;
      document.addEventListener('visibilitychange', function () {
        var vv = document.getElementById(VIEW_ID), b = A();
        if (document.hidden || !vv || !vv.classList.contains('active') || !b || b.S.busy || b.S.vopnad || ritad()) return;
        b.uppfaera();
      });
    }
  }
  function hide() {
    try { var v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'none'; v.classList.remove('active'); } } catch (_) {}
    clearInterval(_poll); _poll = 0;
  }
  function patchSwitchView() {
    if (!rot.App) { setTimeout(patchSwitchView, 150); return; }
    if (rot.App._tilbuinSimiPatched) return;
    var orig = rot.App.switchView;
    rot.App.switchView = function (view) {
      if (view === NAV_KEY) { open(); return; }
      var r = orig ? orig.apply(this, arguments) : undefined;
      hide();
      return r;
    };
    for (var k in orig) { try { rot.App.switchView[k] = orig[k]; } catch (_) {} }
    rot.App._tilbuinSimiPatched = true;
  }
  function boot() {
    patchSwitchView();
    tengja();
    if ((location.hash || '').replace(/^#/, '') === NAV_KEY) setTimeout(function () { if (rot.App && rot.App.switchView) rot.App.switchView(NAV_KEY); else open(); }, 300);
    rot.addEventListener('hashchange', function () { if ((location.hash || '').replace(/^#/, '') === NAV_KEY) open(); });
  }

  var api = { version: '515', open: open, render: render, eydur: eydur, rada: rada, sia: sia, teljarar: teljarar, stodvun: stodvun, hopur: hopur, vidtakandi: vidtakandi, EYDA: EYDA, P: P, _spjald: spjaldHtml, _meginmal: meginmal, _haus: hausHtml };
  rot.TilbuinSimi = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
