/* === AFGREIÐSLA Á ÞJÓNUSTUBORÐINU — eining 30 „Tilbúin verk" (511) =================================
 *
 * Agnar 16.11.2026: „Gerðu bara þjónustuborðið öflugra sem vinnuborð" · „Finna út leið til að hjálpa mér".
 * Sama kvörtun og 11.09 („þetta er svolítið bara upplýsingablað en ekki vinnustofa"): borðið hans sýndi
 * dagskrá, lista og markmið, en forunnu verkin (15 tilbúin 16.11) lágu á ANNARRI síðu (/afgreidsla.html) og á
 * sjálfu borðinu var ekkert hægt að framkvæma.
 *
 * HVAÐ ÞETTA ER: eining á Þjónustuborðinu (368, MODS.tilbuin) sem sýnir tilbúnu verkin úr töflunni `afgreidsla`.
 *   · Hver lína er verk: tegund, titill, áætlað virði. Smellur opnar það UNDIR línunni (eitt opið í einu).
 *   · Opið verk sýnir hvað gerist þegar ýtt er, rökin með heimild og tengli á skjalið sjálft, efnið (svar sem má
 *     breyta / símtalið með handriti / verkið / krafan), athuganir þjónsins og athugasemd Agnars.
 *   · Takkinn FRAMKVÆMIR það sem á honum stendur — í tveimur smellum (fyrri vopnar í 6 sek., seinni framkvæmir).
 *
 * ENGIN NÝ SKRIFLEIÐ: allt fer um /api/afgreidsla (netlify/functions/afgreidsla.cjs), sama fall, sömu athuganir og
 * sama hlið (aðeins innskráður stjórnandi) og síðan /afgreidsla.html notar. Þjónninn les pósthólfið aftur rétt áður
 * en hann sendir og stöðvar ef nýrra skeyti er komið; verk sem stenst ekki athugun fær óvirkan takka hér.
 *
 * STÖÐUGT VIÐMÓT: textareitirnir bera data-ritun, svo 368 frestar endurteikningu á meðan skrifað er; drögin búa í
 * S.textaDrog / S.athDrog og fara aftur í reitinn eftir teikningu. Ekkert localStorage (viðskiptagögn).
 * Síðan /afgreidsla.html stendur áfram (sagan er þar) — „Saga ›" í haus einingarinnar opnar hana.
 * ============================================================================================== */
(function (rot) {
  'use strict';
  if (rot.BordAfgreidsla) return;

  var API = '/api/afgreidsla';
  var FERSKT_MS = 5 * 60 * 1000, VOPN_MS = 6000;
  var THAK = 8;   // línur sýndar í einu — einingin má ekki ýta dagskránni langt niður; „sýna öll" opnar restina
  var TEG = { tolvupostur: 'Póstur', krafa: 'Krafa', simtal: 'Símtal', verk: 'Verk', sameina: 'Breyting' };
  var FLOKKHEITI = { dagsverk: 'Dagsverk', bokun: 'Bókanir' };   // flokkar sem eru ekki tegund verks
  var FLEIRT = { tolvupostur: ['póstur', 'póstar'], krafa: ['krafa', 'kröfur'], simtal: ['símtal', 'símtöl'], verk: ['verk', 'verk'], sameina: ['breyting', 'breytingar'], bokun: ['bókun', 'bókanir'], dagsverk: ['dagsverk', 'dagsverk'] };
  var FLOKKAR = ['allt', 'dagsverk', 'tolvupostur', 'krafa', 'simtal', 'verk', 'sameina', 'bokun'];
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


  var S = { tilbuin: null, villa: null, loading: null, at: 0, flokkur: 'allt', opid: null, vopnad: null, vopnT: null,
    busy: null, skilabod: null, athDrog: {}, textaDrog: {}, athBusy: null, athSkilabod: null, allt: false };

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var kr = function (v) { return v == null || !isFinite(Number(v)) ? '' : Math.round(Number(v)).toLocaleString('is-IS') + ' kr.'; };
  var klTxt = function (iso) { var d = new Date(iso); if (isNaN(d)) return ''; var p = function (n) { return String(n).padStart(2, '0'); }; return p(d.getDate()) + '.' + p(d.getMonth() + 1) + ' kl. ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  var bord = function () { return rot.Bord368 || null; };
  // 17.11.2026 (símasíðan 515): fleiri en borðið teikna úr sama ástandi (S) — hver skráir sig með vakta(fn) og er
  // kallaður eftir hverja breytingu, eins og borðið. Ein heimild: sömu föll, sama sókn, sama staðfesting.
  var vaktar = [];
  var notify = function () {
    try { var b = bord(); if (b && b.render) b.render(); } catch (_) {}
    vaktar.forEach(function (f) { try { f(); } catch (_) {} });
  };
  var toast = function (t, villa) {
    try { var b = bord(); if (b && b.toast) { b.toast(t, !!villa); return; } } catch (_) {}
    try { if (rot.Toast && rot.Toast.show) rot.Toast.show(t); } catch (_) {}
  };
  var falinn = function () { return typeof document !== 'undefined' && document.visibilityState === 'hidden'; };
  // Slóð frá þjóninum → tengill í nýjum flipa. Aðeins http(s) eða slóð á þessum vef (aldrei //annar-vefur, aldrei javascript:).
  var opnaHtml = function (s) {
    if (!s || !s.url || !/^(https?:\/\/|\/(?!\/))/.test(String(s.url))) return '';
    return '<a class="baf-lk" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.texti || 'Opna') + ' ↗</a>';
  };
  // Viðhengi svarsins sem TENGLAR á sama skjal og sendingin sækir (18.11.2026) — Agnar opnar og staðfestir áður en
  // hann sendir. Viðhengi án slóðar (teiknað í vafra) og eldri þjónn án vidhengi_opna birtast sem nafn eins og áður.
  var vidhengiHtml = function (p) {
    var o = p && p.vidhengi_opna;
    if (!o || !o.length) return esc(((p && p.vidhengi) || []).join(', '));
    return o.map(function (x) { return opnaHtml({ url: x.url, texti: '📎 ' + (x.nafn || 'skjal') }) || esc(x.nafn || 'skjal'); }).join(' · ');
  };
  // Skjáskot (verkefnavaktin): aðeins https-slóð (public bucket) verður að mynd — aldrei data:/javascript:/annar vefur.
  var mynd = function (url) {
    if (!url || !/^https:\/\/[^\s"'<>]+$/.test(String(url))) return '';
    return '<a class="baf-lk" href="' + esc(url) + '" target="_blank" rel="noopener"><img class="baf-skot" src="' + esc(url) + '" alt="Skjáskot af breytingunni" loading="lazy"></a>';
  };

  function kall(body) {
    return rot.fetch(API, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          j = j && typeof j === 'object' ? j : {};
          j._status = r.status; return j;
        });
      });
  }

  function hlada() {
    if (S.loading) return S.loading;
    S.loading = kall().then(function (j) {
      S.loading = null;
      if (j._status === 200) {
        S.tilbuin = (j.tilbuin || []).filter(function (v) { return v && TEG[v.tegund]; });
        S.villa = null; S.at = Date.now();
        if (S.opid && !finna(S.opid)) S.opid = null;
      } else if (j._status === 401) S.villa = { inn: true, texti: 'Innskráning vantar' };
      else if (j._status === 403) S.villa = { texti: 'Aðeins stjórnandi sér tilbúnu verkin' };
      else S.villa = { texti: 'Náði ekki í verkin: ' + (j.error || ('villa ' + j._status)) };
      notify();
    }).catch(function (e) {
      S.loading = null; S.villa = { texti: 'Netvilla: ' + String((e && e.message) || e) }; notify();
    });
    return S.loading;
  }
  // Kallað úr teikningu einingarinnar: fyrsta sókn, og endurnýjun þegar gögnin eru orðin gömul (aldrei í miðju verki).
  function tryggja() {
    if (S.loading) return;
    if (!S.tilbuin && !S.villa) { hlada(); return; }
    if (S.tilbuin && Date.now() - S.at > FERSKT_MS && !S.busy && !S.vopnad && !falinn()) hlada();
  }

  function finna(id) { var l = S.tilbuin || []; for (var k = 0; k < l.length; k++) if (l[k].id === id) return l[k]; return null; }
  function sia() { return (S.tilbuin || []).filter(function (v) { return iFlokki(v, S.flokkur); }); }
  function fjarlaegja(id) {
    S.tilbuin = (S.tilbuin || []).filter(function (v) { return v.id !== id; });
    if (S.opid === id) S.opid = null;
    delete S.textaDrog[id]; delete S.athDrog[id];
  }
  function afvopna() { if (S.vopnT) { clearTimeout(S.vopnT); S.vopnT = null; } S.vopnad = null; }
  function vopna(lykill) {
    afvopna(); S.vopnad = lykill; S.skilabod = null;
    S.vopnT = setTimeout(function () { if (S.vopnad === lykill) { S.vopnad = null; S.vopnT = null; notify(); } }, VOPN_MS);
    if (S.vopnT && S.vopnT.unref) S.vopnT.unref();
    notify();
  }
  var textiNu = function (v) { return v.id in S.textaDrog ? S.textaDrog[v.id] : ((v.post || {}).texti || ''); };
  // Hæð svarreitsins fylgir textanum (8–24 línur) svo allt svarið sjáist án þess að skruna inni í reitnum.
  var linur = function (t) { var n = 0; String(t || '').split('\n').forEach(function (l) { n += Math.max(1, Math.ceil(l.length / 80)); }); return Math.max(8, Math.min(24, n + 2)); };
  var athNu = function (v) { return v.id in S.athDrog ? S.athDrog[v.id] : (v.athugasemd || ''); };

  // (Tillaga B 17.11.2026 tók við af númeruðu skrefunum og tölu-flísunum — sjá geristHtml / linaHtml hér að neðan.)
  var dagarFra = function (iso) { var d = new Date(iso); if (isNaN(d)) return null; return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000)); };

  /* ── TILLAGA B (Agnar 17.11.2026: „renna hratt í gegnum þessa glugga" → valdi Tillögu B á Design-striganum
   *    https://claude.ai/artifact/T3duYbnZX8poZJAmXBvK7M). Sama efni og áður, brotið upp svo augað finni aðalatriðin:
   *    · fyrirsögnin skiptist í aðila (fyrir „:") / spurningu / sögn (stutt hali eftir „ — ") og biðin er auðkennd;
   *    · staðreyndalína: Hverjum · Sími · Bið · Áætlað virði · Svarað úr — aðeins það sem verkið sjálft geymir;
   *    · rökin sem tímalína (dagsetningin úr textanum), „Í dag"-hnútur úr setningu sem segir að ekkert hafi gerst,
   *      ÓSTAÐFEST/⚠ í gulum reit, heimildirnar saman neðst merktar dagsetningu hnútsins;
   *    · handrit símtals brotið í kafla eftir HÁSTAFA-fyrirsögnum (ERINDI:, SPYRJA:, TILLAGA AÐ ÍTREKUN: …).
   *    Allt hér er hreint (gögn inn → HTML/gögn út) og /afgreidsla.html notar sömu föll (BordAfgreidsla.snid). */
  var STORIR = 'A-ZÁÐÉÍÓÚÝÞÆÖ';
  var DAGS_RX = /(^|[^\d.])(\d{1,2})\.(\d{1,2})(?:\.(\d{4}))?(?![\d])/g;
  var IDAG_RX = /^(Síðan hefur|Ekkert svar|Ekkert hefur|Enginn hefur|Því hefur ekki|Hvergi er skráð)/;
  var VAFI_RX = /^(ÓSTAÐFEST|⚠|ÁÐUR EN|ÁLYKTUN)/;
  var BID_RX = /(ósvöru\S*|ósvarað\S*|ógreidd\S*|aldrei \S+|ekkert svar|ekki bókuð|óbókuð)[^,—:;(]*/i;
  var SETN_RX = new RegExp('\\.\\s+(?=[' + STORIR + '„])');
  var hreint = function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); };
  // Allar dagsetningar (dd.mm eða dd.mm.áááá) í texta sem eru liðnar — án ártals er gengið út frá nýjasta liðna ári.
  function dagsetningar(t, nu) {
    var ut = [], m, n = nu || new Date();
    DAGS_RX.lastIndex = 0;
    while ((m = DAGS_RX.exec(String(t || '')))) {
      var d = +m[2], mn = +m[3], ar = m[4] ? +m[4] : n.getFullYear();
      if (d < 1 || d > 31 || mn < 1 || mn > 12) continue;
      var dt = new Date(ar, mn - 1, d);
      if (!m[4] && dt > n) dt = new Date(ar - 1, mn - 1, d);
      if (dt > n) continue;
      ut.push({ dt: dt, merki: String(d).padStart(2, '0') + '.' + String(mn).padStart(2, '0'), stadur: m.index + m[1].length });
    }
    return ut;
  }
  var dagaOrd = function (n) { return n === 0 ? 'í dag' : n + (n % 10 === 1 && n % 100 !== 11 ? ' dagur' : ' dagar'); };
  // Biðin = dagar frá SÍÐUSTU dagsetningu í titlinum (höfundur verksins setur þar dagsetninguna sem málið stendur á).
  // Án dagsetningar: „í 47 daga" / „62 dögum" í titlinum gildir frá því verkið var skrifað (created_at) og hækkar síðan.
  function bid(v, nu) {
    var n = nu || new Date(), tonn = function (x) { return x >= 60 ? 'r' : x >= 30 ? 'y' : 'n'; };
    var d = dagsetningar(v && v.titill, n);
    if (!d.length) {
      var m = /(\d{1,4})\s+(?:daga|dögum|dagar)\b/.exec(String((v && v.titill) || ''));
      var c = v && v.created_at ? new Date(v.created_at) : null;
      if (!m) return null;
      var x = +m[1] + (c && !isNaN(c) ? Math.max(0, Math.floor((n - c) / 86400000)) : 0);
      return { dagar: x, fra: null, texti: dagaOrd(x), tonn: tonn(x) };
    }
    var s = d[d.length - 1];
    var dagar = Math.max(0, Math.floor((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - s.dt) / 86400000));
    return { dagar: dagar, fra: s.merki, texti: dagaOrd(dagar), tonn: tonn(dagar) };
  }
  // „Aðili: spurningin — sögn" → { adili, spurning, sogn }. Hali verður sögn aðeins ef hann er stuttur (≤ 4 orð).
  function titill(t) {
    var s = hreint(t), adili = '', sogn = '';
    var k = s.indexOf(': ');
    if (k > 0 && k <= 70) { adili = s.slice(0, k); s = s.slice(k + 2); }
    var h = s.lastIndexOf(' — ');
    if (h > 0) { var hali = s.slice(h + 3).trim(); if (hali && hali.length <= 32 && hali.split(/\s+/).length <= 4) { sogn = hali; s = s.slice(0, h).trim(); } }
    return { adili: adili, spurning: s, sogn: sogn };
  }
  // Fyrirsögnin með biðina auðkennda (<mark>) — leitað í hreinum texta, hver bútur afmáður sér.
  function merktHtml(t) {
    var m = BID_RX.exec(t);
    if (!m) return esc(t);
    var a = m.index, b = a + m[0].replace(/\s+$/, '').length;
    return esc(t.slice(0, a)) + '<mark class="baf-merk">' + esc(t.slice(a, b)) + '</mark>' + esc(t.slice(b));
  }
  // Áherslur: magn með einingu („15–20 handslökkvitæki", „14.500 kr.", „41,35 klst.") feitletrað. Dagsetningar, klukka,
  // númer (nr./R-/#) og ártöl standa óbreytt. Unnið á hreinum texta; hver bútur afmáður.
  var TALA = '\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?|\\d+(?:,\\d+)?';
  var STOP = 'og|eða|til|í|á|af|við|sem|kl|um|frá|með|en|að|er|var|eru|ár|árið|hjá|fyrir|þann';
  var AHER_RX = new RegExp('(^|[\\s(„])((?:' + TALA + ')(?:\\s?[–-]\\s?(?:' + TALA + '))?)(\\s?(?:kr\\.?|klst\\.?|m²|%)|\\s(?!(?:' + STOP + ')(?![' + STORIR.toLowerCase() + 'a-z]))[a-záðéíóúýþæö]{3,})', 'gi');
  function aherslur(t) {
    var s = String(t == null ? '' : t), ut = '', fra = 0, m;
    AHER_RX.lastIndex = 0;
    while ((m = AHER_RX.exec(s))) {
      var a = m.index + m[1].length, tala = m[2], fyrir = s.slice(Math.max(0, a - 4), a);
      if (/(nr\.\s|#|R-)$/.test(fyrir) || (/^(19|20)\d\d$/.test(tala) && !/kr/.test(m[3]))) continue;
      var b = a + tala.length + m[3].length;
      ut += esc(s.slice(fra, a)) + '<b>' + esc(s.slice(a, b)) + '</b>';
      fra = b;
    }
    return ut + esc(s.slice(fra));
  }
  // Rökin → tímalína. Hnútur = rök með dagsetningu (sú fyrsta í textanum); ÓSTAÐFEST/⚠ og rök án dagsetningar fara
  // í reitina undir; fyrsta setning sem segir að ekkert hafi gerst (IDAG_RX) verður „Í dag"-hnúturinn neðst.
  function timalina(rok, nu) {
    var hnutar = [], athugasemdir = [], vafi = [], heimildir = [], idag = null;
    (rok || []).forEach(function (r) {
      if (!r) return;
      var texti = hreint(r.texti), merki = '';
      if (!idag && !VAFI_RX.test(texti)) {
        var setn = texti.split(SETN_RX);
        for (var k = 0; k < setn.length; k++) {
          if (IDAG_RX.test(setn[k].trim())) {
            idag = setn[k].trim().replace(/([^.!?])$/, '$1.'); setn.splice(k, 1);
            texti = setn.join('. ').replace(/\.\./g, '.').trim();
            if (texti && !/[.!?)]$/.test(texti)) texti += '.';
            if (!texti) merki = 'Í dag';
            break;
          }
        }
      }
      if (texti && VAFI_RX.test(texti)) vafi.push(texti);
      else if (texti) {
        var d = dagsetningar(texti, nu);
        if (d.length) { merki = d[0].merki; hnutar.push({ merki: merki, texti: texti }); }
        else athugasemdir.push(texti);
      }
      if (r.heimild || r.slod) heimildir.push({ merki: merki, heimild: r.heimild || '', slod: r.slod || null });
    });
    return { hnutar: hnutar, idag: idag, athugasemdir: athugasemdir, vafi: vafi, heimildir: heimildir };
  }
  // „Hvað gerist": fyrsta setningin feitletruð, restin venjuleg.
  function gerist(t) {
    var s = hreint(t), p = s.split(SETN_RX);
    var fyrsta = p.shift() || '';
    return { fyrsta: /[.!?]$/.test(fyrsta) || !p.length ? fyrsta : fyrsta + '.', rest: p.join('. ').replace(/\.\./g, '.') };
  }
  // Handrit → inngangur + kaflar. Kafli byrjar á línu sem hefst á HÁSTAFA-heiti og tvípunkti („SPYRJA:", „SEGI ÞAU …:",
  // „TILLAGA AÐ SVARI (fylltu inn verð ljósanna):" — svigi með lágstöfum má fylgja heitinu).
  var KAFLA_RX = new RegExp('^([' + STORIR + '][' + STORIR + '0-9 ,./–-]{2,70}(?:\\s*\\([^)]{0,80}\\))?):\\s*(.*)$');
  function handrit(t) {
    var inn = [], kaflar = [], nuv = null;
    String(t == null ? '' : t).replace(/\r/g, '').split('\n').forEach(function (l) {
      var m = KAFLA_RX.exec(l.trim());
      if (m && /[A-ZÁÐÉÍÓÚÝÞÆÖ]{3}/.test(m[1])) { nuv = { heiti: m[1].trim(), linur: m[2] ? [m[2]] : [] }; kaflar.push(nuv); return; }
      (nuv ? nuv.linur : inn).push(l);
    });
    var klippa = function (a) { while (a.length && !a[0].trim()) a.shift(); while (a.length && !a[a.length - 1].trim()) a.pop(); return a.join('\n'); };
    return { inngangur: klippa(inn), kaflar: kaflar.map(function (k) { return { heiti: k.heiti, texti: klippa(k.linur) }; }).filter(function (k) { return k.texti; }) };
  }
  // Hverjum: „Nafn, restin" eða „Nafn — restin" → nafnið stórt, restin smá.
  function hverjum(t) {
    var s = hreint(t), a = s.indexOf(', '), b = s.indexOf(' — ');
    var k = a < 0 ? b : b < 0 ? a : Math.min(a, b);
    return k > 0 ? { nafn: s.slice(0, k), rest: s.slice(k + (k === b ? 3 : 2)) } : { nafn: s, rest: '' };
  }

  // ── HTML-bútar Tillögu B (sömu klasar á borðinu og á /afgreidsla.html; hvor síða á sitt CSS) ──
  function hausHtml(v, nu) {
    var t = titill(v.titill), d = dagarFra(v.created_at);
    return '<div class="baf-hd"><div class="baf-hdt"><div class="baf-kr2">' + (t.sogn ? '<span class="baf-sogn">' + esc(t.sogn) + '</span>' : '') +
      '<span class="baf-kick">Það sem þú ákveður</span></div>' +
      '<h2 class="baf-sp">' + (t.adili ? '<span class="baf-sp-a">' + esc(t.adili) + '</span>' : '') + merktHtml(t.adili ? t.spurning.charAt(0).toLocaleUpperCase('is') + t.spurning.slice(1) : t.spurning) + '</h2></div>' +
      (d != null ? '<div class="baf-bord"><span>Á borðinu</span><b>' + (d === 0 ? 'Í dag' : esc(dagaOrd(d))) + '</b></div>' : '') + '</div>';
  }
  /* DYR (18.11.2026, Agnar: „þetta á að vera portal, sendir mig þá þangað sem ég get gert eitthvað beint“ · „ég vil helst
   * geta gert allt beint þaðan af borðinu“). Þjónninn (_afgreidsla-dyr.cjs) breytir auðkennum liðarins — máli, reikningi,
   * félagi, símanúmeri — í dyr { teg, id, heiti, slod }. Hér verða þær takkar EFST í liðnum. Í appinu grípur 521 (Gatt)
   * smellinn um data-gatt og opnar færsluna ofan á borðinu; á /afgreidsla.html er slóðin sjálf notuð.
   * Slóð sem er hvorki tel: né afstæð slóð á þennan vef verður ekki að tengli. */
  var dyraSlod = function (s) { s = String(s || ''); return /^tel:\+?\d{7,15}$/.test(s) || /^\/(?![\/\\])[^\s"'<>\\]*$/.test(s) ? s : ''; };
  var breidur = function () { try { return !rot.Gatt && rot.matchMedia && rot.matchMedia('(min-width: 900px)').matches; } catch (_) { return false; } };
  function dyrTakki(x, fyrsti) {
    var sl = dyraSlod(x && x.slod);
    if (!sl || !x.heiti) return '';
    var simi = x.teg === 'simi';
    return '<a class="baf-dyr' + (fyrsti ? ' baf-dyr-a' : '') + (simi ? ' baf-dyr-s' : '') + '" href="' + esc(sl) + '"' +
      (!simi && x.teg && x.id ? ' data-gatt="' + esc(x.teg + ':' + x.id) + '"' : '') + (!simi && breidur() ? ' target="_blank" rel="noopener"' : '') + '>' +
      '<span class="baf-dyr-t">' + esc(x.heiti) + '</span><span class="baf-dyr-o" aria-hidden="true">' + (simi ? '📞' : '›') + '</span></a>';
  }
  function dyrLina(f) {
    var sl = dyraSlod(f && f.slod), sm = dyraSlod(f && f.simi);
    var nafn = sl ? '<a class="baf-dl-n" href="' + esc(sl) + '"' + (f.teg && f.id ? ' data-gatt="' + esc(f.teg + ':' + f.id) + '"' : '') + (breidur() ? ' target="_blank" rel="noopener"' : '') + '>' + esc(f.nafn) + '&nbsp;<span aria-hidden="true">›</span></a>'
      : '<span class="baf-dl-n baf-dl-x" title="Félagið fannst ekki í kerfinu">' + esc(f.nafn) + '</span>';
    return '<li>' + nafn + (f.auka ? '<span class="baf-dl-a">' + esc(f.auka) + '</span>' : '') +
      (sm ? '<a class="baf-dl-s" href="' + esc(sm) + '" aria-label="Hringja í ' + esc(f.nafn) + '">📞 ' + esc(f.simanumer || '') + '</a>' : '') + '</li>';
  }
  function dyrHtml(v) {
    var d = ((v && v.dyr) || []).map(function (x, i) { return dyrTakki(x, i === 0); }).filter(Boolean);
    var l = ((v && v.listi) || []).filter(function (f) { return f && f.nafn; });
    if (!d.length && !l.length) return '';
    var h = '<div class="baf-dy" role="group" aria-label="Opna beint">';
    if (d.length) h += '<div class="baf-dyrr">' + d.join('') + (v.fleiri_reikningar ? '<span class="baf-dyr-f">+' + Number(v.fleiri_reikningar) + ' reikningar nefndir í lýsingunni</span>' : '') + '</div>';
    if (l.length) {
      var SYND = 8;
      h += '<div class="baf-dl"><div class="baf-dl-h">' + l.length + ' ' + (l.length === 1 ? 'félag' : 'félög') + ' — smelltu á nafn til að opna það</div><ol>' + l.slice(0, SYND).map(dyrLina).join('') + '</ol>' +
        (l.length > SYND ? '<details><summary>Sýna hin ' + (l.length - SYND) + '</summary><ol start="' + (SYND + 1) + '">' + l.slice(SYND).map(dyrLina).join('') + '</ol></details>' : '') + '</div>';
    }
    return h + '</div>';
  }
  function reitur(heiti, gildi, undir, kl) {
    return '<div class="baf-sr' + (kl ? ' ' + kl : '') + '"><dt>' + esc(heiti) + '</dt><dd class="baf-sv">' + gildi + '</dd>' + (undir ? '<dd class="baf-su">' + undir + '</dd>' : '') + '</div>';
  }
  function linaHtml(v, nu) {
    // Þúsundapunktur handvirkt: /afgreidsla.html keyrir líka í vöfrum án íslenskra staðargagna (þá gæfi toLocaleString „114,050").
    var r = [], b = bid(v, nu), virdi = v.virdi_kr == null || !isFinite(Number(v.virdi_kr)) ? null : String(Math.round(Number(v.virdi_kr))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    if (v.tegund === 'simtal') {
      var s = v.simtal || {}, h = hverjum(s.hverjum);
      if (h.nafn) r.push(reitur('Hverjum', esc(h.nafn), esc(h.rest) + (s.simi ? '' : (h.rest ? ' · ' : '') + 'enginn sími skráður')));
      if (s.simi) r.push(reitur('Sími', '<a class="baf-lk" href="tel:' + esc(String(s.simi).replace(/[^\d+]/g, '')) + '">' + esc(s.simi) + '</a>'));
    } else if (v.tegund === 'tolvupostur' && v.post) {
      var to = v.post.to || [];
      if (to.length) r.push(reitur('Til', esc(to[0]) + (to.length > 1 ? ' <i>+' + (to.length - 1) + '</i>' : ''), esc(v.post.subject || '')));
    } else if (v.tegund === 'krafa' && v.krafa && v.krafa.r_numer) {
      r.push(reitur('Reikningur', esc(v.krafa.r_numer), v.krafa.slod ? opnaHtml(v.krafa.slod) : ''));
    }
    if (b) r.push(reitur('Bið', esc(b.texti), b.fra ? 'síðan ' + esc(b.fra) : 'talið frá titlinum', 'baf-t-' + b.tonn));
    r.push(reitur('Áætlað virði', virdi ? virdi + ' <i>kr.</i>' : 'Óþekkt', virdi ? '' : 'ekkert virði skráð á verkið'));
    if (v.tegund === 'tolvupostur' && v.post && v.post.account) r.push(reitur('Sent úr', esc(v.post.account), ''));
    else if (v.tegund === 'simtal' && /Thunderbird/.test(v.hvad_gerist || '')) {
      var th = /[Þþ]ráðurinn er í ([^\s,(]+)/.exec(v.hvad_gerist || '');
      r.push(reitur('Svarað úr', 'Thunderbird', th ? 'þráðurinn er í ' + esc(th[1].replace(/[.,]$/, '')) : ''));
    }
    return dyrHtml(v) + '<dl class="baf-strip">' + r.join('') + '</dl>';
  }
  function timalinaHtml(rok, nu, synaHeimildir) {
    if (!rok || !rok.length) return '';
    var t = timalina(rok, nu), h = '<section class="baf-k"><h3>Af hverju þetta er rétt</h3>';
    var allir = t.hnutar.map(function (x, i) { return { merki: x.merki, texti: x.texti, kl: i === t.hnutar.length - 1 && !t.idag ? 'sidast' : '' }; });
    if (t.idag) allir.push({ merki: 'Í dag', texti: t.idag, kl: 'idag' });
    if (allir.length) h += '<ol class="baf-tl">' + allir.map(function (x) {
      return '<li class="' + x.kl + '"><span class="baf-tld">' + esc(x.merki) + '</span><span class="baf-tlp" aria-hidden="true"></span><p>' + (x.kl === 'idag' ? esc(x.texti) : aherslur(x.texti)) + '</p></li>';
    }).join('') + '</ol>';
    if (t.athugasemdir.length) h += '<div class="baf-ath2">' + t.athugasemdir.map(function (x) { return '<p>' + aherslur(x) + '</p>'; }).join('') + '</div>';
    if (t.vafi.length) h += '<div class="baf-vafi">' + t.vafi.map(function (x) { return '<p>' + aherslur(x) + '</p>'; }).join('') + '</div>';
    if (synaHeimildir !== false && t.heimildir.length) h += '<ul class="baf-heim" aria-label="Heimildir">' + t.heimildir.map(function (x) {
      var sl = x.slod ? opnaHtml(x.slod) : '';
      return '<li>' + (x.merki ? '<b>' + esc(x.merki) + '</b> · ' : '') + esc(x.heimild) + (sl ? ' ' + sl : '') + '</li>';
    }).join('') + '</ul>';
    return h + '</section>';
  }
  function geristHtml(t) {
    var g = gerist(t);
    if (!g.fyrsta) return '';
    return '<section class="baf-k"><h3 class="baf-sr-only">Þetta gerist þegar þú ýtir</h3><div class="baf-info">' +
      '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>' +
      '<div><b>' + esc(g.fyrsta) + '</b>' + (g.rest ? '<span>' + esc(g.rest) + '</span>' : '') + '</div></div></section>';
  }
  // Handritið í köflum. Langur kafli (≥ 3 línur eða > 180 stafir) fær reit og „Afrita"; stuttur er lína með heiti.
  function handritHtml(t, id) {
    var h = handrit(t);
    if (!h.kaflar.length) h = { inngangur: '', kaflar: t ? [{ heiti: 'Handrit', texti: String(t).trim() }] : [] };
    var ut = h.inngangur ? '<p class="baf-inn">' + esc(h.inngangur).replace(/\n+/g, ' ') + '</p>' : '';
    return ut + h.kaflar.map(function (k, i) {
      var linur = k.texti.split('\n'), langur = linur.length >= 3 || k.texti.length > 180;
      var tolus = linur.length >= 2 && linur.every(function (l) { return !l.trim() || /^\d+[.)]\s/.test(l.trim()); });
      var efni = tolus ? '<ol class="baf-hl">' + linur.filter(function (l) { return l.trim(); }).map(function (l) { return '<li>' + esc(l.trim().replace(/^\d+[.)]\s*/, '')) + '</li>'; }).join('') + '</ol>'
        : '<div class="baf-ht">' + esc(k.texti) + '</div>';
      return '<div class="baf-kafli' + (langur ? ' langur' : '') + '"><div class="baf-kh"><h4>' + esc(k.heiti) + '</h4>' +
        (langur && id != null ? '<button type="button" class="btn iv sm baf-afr" data-baf="afrita" data-id="' + id + '" data-k="' + i + '">Afrita texta</button>' : '') + '</div>' + efni + '</div>';
    }).join('');
  }
  function handritKafli(t, i) { var h = handrit(t); if (!h.kaflar.length) return String(t || '').trim(); var k = h.kaflar[i]; return k ? k.texti : ''; }

  /* ── TEIKNING ──────────────────────────────────────────────────────────────────────────────── */
  function samantekt() {
    tryggja();
    if (!S.tilbuin) return S.villa ? (S.villa.inn ? 'Innskráning vantar' : 'Náði ekki í verkin') : 'Sæki verkin…';
    var tel = teljaFlokka(S.tilbuin), n = tel.allt;
    if (!S.tilbuin.length) return 'Allt afgreitt' + (S.loading ? ' · uppfæri…' : '');
    return n + ' tilbúin' + FLOKKAR.slice(1).filter(function (k) { return tel[k]; }).map(function (k) { return ' · ' + tel[k] + ' ' + FLEIRT[k][tel[k] === 1 ? 0 : 1]; }).join('') +
      (S.loading ? ' · uppfæri…' : '');
  }
  function takkar() {
    return '<button type="button" class="btn iv sm tog" data-baf="uppf" title="Sækja nýjustu stöðu" aria-label="Uppfæra tilbúnu verkin">↻</button>' +
      '<a class="btn iv sm" href="/afgreidsla.html" title="Öll verkin og sagan (gert, sleppt, úrelt) á sér síðu">Saga ›</a>';
  }

  // Óstaðfest ágiskun (x.agiskun) fær tvo takka: staðfesta netfangið, eða taka það út og senda án þess (kóðarýni 17.11.2026).
  function athHtml(a, id) {
    if (!a || !a.length) return '';
    return '<section class="baf-k"><h3>Athuganir — keyrðar núna</h3><ul class="baf-ath">' + a.map(function (x) {
      return '<li><span class="' + (x.ok ? 'baf-ok' : 'baf-nei') + '" aria-label="' + (x.ok ? 'Í lagi' : 'Ekki í lagi') + '">' + (x.ok ? '✓' : '✗') + '</span><span>' + esc(x.texti) +
        (x.agiskun && !x.ok && id ? '<span class="baf-agisk" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px"><button type="button" class="btn iv sm" data-baf="agiskun" data-val="stadfesta" data-id="' + id + '" data-netfang="' + esc(x.agiskun) + '">Staðfesta netfangið</button>' +
          '<button type="button" class="btn iv sm" data-baf="agiskun" data-val="fjarlaegja" data-id="' + id + '" data-netfang="' + esc(x.agiskun) + '">Taka það út og senda án þess</button></span>' : '') + '</span></li>';
    }).join('') + '</ul></section>';
  }
  function agiskun(v, nf, val) {
    if (!nf || !window.confirm(val === 'stadfesta' ? 'Staðfesta að ' + nf + ' sé rétt netfang? Staðfestingin er skráð á þig.' : 'Taka ' + nf + ' úr viðtakendum? Pósturinn fer þá án þess.')) return null;
    afvopna(); S.busy = v.id; S.skilabod = null; notify();
    return kall({ id: v.id, adgerd: 'agiskun', netfang: nf, val: val }).then(function (j) {
      S.busy = null;
      if (j._status === 200 && j.verk) { for (var k in j.verk) v[k] = j.verk[k]; S.skilabod = { id: v.id, ok: true, texti: val === 'stadfesta' ? nf + ' staðfest' : nf + ' tekið út' }; }
      else S.skilabod = { id: v.id, texti: j.error || ('Villa ' + j._status) };
      notify();
    }).catch(function (e) { S.busy = null; S.skilabod = { id: v.id, texti: 'Netvilla — óvíst hvort breytingin vistaðist: ' + String((e && e.message) || e) }; notify(); });
  }
  function efniHtml(v) {
    if (v.tegund === 'tolvupostur') {
      var h = '', sv = v.svar_vid, p = v.post || {};
      if (sv) {
        var sl = sv.slod ? opnaHtml(sv.slod) : '';
        h += '<section class="baf-k"><h3>Skeytið sem þú svarar (það nýjasta í þræðinum)</h3><div class="baf-sk"><div class="baf-meta">' + esc(sv.fra) + ' · ' + esc(sv.dags) + (sl ? ' · ' + sl : '') +
          '</div><div class="baf-efni">' + esc(sv.efni) + '</div><pre>' + esc(sv.texti) + '</pre></div></section>';
      }
      return h + '<section class="baf-k"><h3>Svarið — þú mátt breyta því</h3><dl class="baf-dl"><dt>Frá</dt><dd>' + esc(p.account) + '</dd><dt>Til</dt><dd>' + esc((p.to || []).join(', ')) + '</dd>' +
        ((p.cc || []).length ? '<dt>Afrit</dt><dd>' + esc(p.cc.join(', ')) + '</dd>' : '') + '<dt>Efni</dt><dd>' + esc(p.subject) + '</dd>' +
        ((p.vidhengi || []).length ? '<dt>Viðhengi</dt><dd>' + vidhengiHtml(p) + '</dd>' : '') + '</dl>' +
        '<textarea class="baf-ta" data-baf-texti="' + v.id + '" data-ritun="1" rows="' + linur(textiNu(v)) + '" spellcheck="true" aria-label="Texti svarsins">' + esc(textiNu(v)) + '</textarea></section>';
    }
    if (v.tegund === 'simtal') {
      // Tillaga B: hverjum og sími standa í staðreyndalínunni efst; hér er aðeins handritið, brotið í kafla.
      var s = v.simtal || {};
      return s.handrit ? '<section class="baf-k"><h3 class="baf-sr-only">Símtalið</h3>' + handritHtml(s.handrit, v.id) + '</section>' : '';
    }
    if (v.tegund === 'verk') return '<section class="baf-k"><h3>Verkið</h3><div class="baf-sk"><pre>' + esc((v.verk || {}).lysing) + '</pre></div></section>';
    if (v.tegund === 'krafa' && v.krafa) {
      var ks = v.krafa.slod ? opnaHtml(v.krafa.slod) : '';
      return '<section class="baf-k"><h3>Krafan</h3><dl class="baf-dl"><dt>Reikningur</dt><dd>' + esc(v.krafa.r_numer || '') + (ks ? ' · ' + ks : '') + '</dd></dl></section>';
    }
    if (v.tegund === 'sameina' && v.sameina) {
      var sm = v.sameina;
      var hs = '<section class="baf-k"><h3>Hvað var gert</h3><div class="baf-sk"><pre>' + esc(sm.lysing) + '</pre></div></section>';
      if (sm.sannprof) hs += '<section class="baf-k"><h3>Hvernig það var sannreynt</h3><div class="baf-sk"><pre>' + esc(sm.sannprof) + '</pre></div></section>';
      hs += '<section class="baf-k"><h3>Grein</h3><dl class="baf-dl"><dt>Grein</dt><dd><code class="baf-grein">' + esc(sm.grein) + '</code></dd><dt>Vefur</dt><dd>' + esc(sm.vefur) + '</dd>' +
        (sm.verk_slod ? '<dt>Verk</dt><dd>' + opnaHtml(sm.verk_slod) + '</dd>' : '') + '</dl></section>';
      if (sm.skjaskot_url) hs += '<section class="baf-k"><h3>Skjáskot</h3>' + mynd(sm.skjaskot_url) + '</section>';
      return hs;
    }
    return '';
  }
  function opidHtml(v) {
    var upptekid = S.busy === v.id, vopnF = S.vopnad === 'framkvaema:' + v.id, vopnS = S.vopnad === 'sleppa:' + v.id, erSam = v.tegund === 'sameina';
    var h = '<div class="baf-d" id="baf-d-' + v.id + '">';
    // Haus yfir báða dálka: það sem er verið að biðja um, og tölurnar sem segja hvað það snýst um. Agnar 16.11.2026:
    // „skýrara hvað er verið að biðja um, og sé ekki bara textabók sem er erfitt að ná að sjá aðalatriðin."
    // Tillaga B (17.11.2026): sögn + aðili + spurningin með biðina auðkennda, staðreyndalína yfir báða dálka.
    h += hausHtml(v) + linaHtml(v);
    // Tveir dálkar þegar einingin er breið (bogaskjárinn): rökin vinstra megin, efnið og athugasemdin hægra megin.
    h += '<div class="baf-c">' + timalinaHtml(v.af_hverju) + athHtml(v.athuganir, v.id) + '</div>';
    h += '<div class="baf-c">' + geristHtml(v.hvad_gerist) + efniHtml(v);
    h += '<section class="baf-k"><h3><label for="baf-ath-' + v.id + '">Athugasemd þín</label></h3><div class="baf-athr"><textarea class="baf-ta lagur" id="baf-ath-' + v.id + '" data-baf-ath="' + v.id + '" data-ritun="1" spellcheck="true" maxlength="2000" ' +
      'placeholder="Til Claude og Tonys — vistast á verkið, t.d. „bíða til mánaðamóta“ eða verðið sem á að standa">' + esc(athNu(v)) + '</textarea>' +
      '<button type="button" class="btn iv sm" data-baf="ath-vista" data-id="' + v.id + '" aria-label="Vista athugasemd"' + (S.athBusy === v.id ? ' disabled' : '') + '>' + (S.athBusy === v.id ? 'Vista…' : 'Vista') + '</button></div>' +
      '<div class="baf-af"><span class="baf-am" role="status">' + esc(S.athSkilabod && S.athSkilabod.id === v.id ? S.athSkilabod.texti : v.athugasemd ? 'Vistað ' + klTxt(v.athugasemd_at) + (v.athugasemd_af ? ' · ' + v.athugasemd_af : '') : '') + '</span></div></section></div>';
    if (S.skilabod && S.skilabod.id === v.id) h += '<div class="baf-msg villa" role="alert">' + esc(S.skilabod.texti) + '</div>';
    // 27.11.2026: stöðvuð tilraun er VISTUÐ á þjóninum (sést eftir endurhleðslu og í öðru tæki) — aldrei óvissa um hvort fór.
    else if (v.sidasta_tilraun) h += '<div class="baf-msg villa" role="alert">' + esc(v.sidasta_tilraun) + '</div>';
    h += '<div class="baf-ft">' +
      '<button type="button" class="btn iv sm" data-baf="seinna" data-id="' + v.id + '"' + (upptekid ? ' disabled' : '') + ' title="Færir verkið aftar í röðina">Seinna</button>' +
      '<button type="button" class="btn iv sm' + (vopnS ? ' baf-vopn' : '') + '" data-baf="sleppa" data-id="' + v.id + '"' + (upptekid ? ' disabled' : '') +
        ' title="' + (erSam ? 'Hafnar breytingunni og sendir hana aftur í vinnu með athugasemdinni þinni sem skýringu.' : 'Tekur verkið úr röðinni fyrir fullt og allt. Athugasemdin þín fylgir sem ástæða.') + '">' +
        (erSam ? (vopnS ? 'Ýttu aftur — fer aftur í vinnu' : 'Hafna ›') : (vopnS ? 'Ýttu aftur — kemur ekki aftur' : 'Ekki þess virði')) + '</button>' +
      '<span class="baf-grow"></span>' +
      (v.ok ? '' : '<span class="baf-stopp">Athugun stóðst ekki — ekkert verður gert</span>') +
      '<button type="button" class="btn baf-go' + (vopnF ? ' baf-vopn' : '') + '" data-baf="framkvaema" data-id="' + v.id + '"' + (!v.ok || upptekid ? ' disabled' : '') +
        ' title="' + esc(v.ok ? v.hvad_gerist : 'Athugun stóðst ekki — sjá að ofan') + '">' + esc(upptekid ? 'Augnablik…' : vopnF ? 'Ýttu aftur til að staðfesta' : v.takki) + '</button>' +
      '</div></div>';
    return h;
  }
  // Lína: aðilinn feitur fremst, restin venjuleg á einni línu; biðin (dagar frá dagsetningu titilsins) sem pilla aftast.
  function radHtml(v) {
    var opid = S.opid === v.id, virdi = kr(v.virdi_kr), t = titill(v.titill), b = bid(v);
    var tx = t.adili
      ? '<b class="baf-ta1">' + esc(t.adili) + '</b><span class="baf-sep"> · </span><span class="baf-rest">' + (opid ? 'opið' : esc(t.spurning + (t.sogn ? ' — ' + t.sogn : ''))) + '</span>'
      : '<span class="baf-rest heil">' + esc(v.titill) + '</span>';
    return '<div class="baf-v' + (opid ? ' opid' : '') + '"><button type="button" class="baf-r" data-baf="opna" data-id="' + v.id + '" aria-expanded="' + opid + '"' + (opid ? ' aria-controls="baf-d-' + v.id + '"' : '') + ' title="' + esc(v.titill) + '">' +
      '<span class="baf-teg">' + esc(TEG[v.tegund]) + '</span><span class="baf-t">' + tx + '</span>' +
      '<span class="baf-mk">' + (v.ok ? '' : '<span class="x" title="Athugun stóðst ekki">✗</span>') + (v.athugasemd ? '<span title="Athugasemd: ' + esc(v.athugasemd) + '">✎</span>' : '') +
        (virdi ? '<span class="baf-kr" title="Áætlað virði">' + virdi + '</span>' : '') +
        (b ? '<span class="baf-ald baf-t-' + b.tonn + '" title="' + esc(b.texti + (b.fra ? ' síðan ' + b.fra : '')) + '">' + esc(b.texti) + '</span>' : '') + '</span>' +
      '<span class="baf-chev" aria-hidden="true">' + (opid ? '▴' : '▾') + '</span></button>' + (opid ? opidHtml(v) : '') + '</div>';
  }
  function listi() {
    if (!S.tilbuin) {
      if (S.villa) return '<div class="baf"><div class="baf-tomt">' + esc(S.villa.texti) + (S.villa.inn ? ' · <a class="baf-lk" href="/innskraning.html?next=' + encodeURIComponent('/#bord') + '">Skrá inn ›</a>' : '') + '</div></div>';
      return '<div class="baf">' + [0, 1, 2, 3].map(function () { return '<div class="baf-r baf-bid" aria-hidden="true"></div>'; }).join('') + '</div>';
    }
    var h = '<div class="baf">';
    if (S.villa) h += '<div class="baf-msg villa" role="status">' + esc(S.villa.texti) + ' — sýni síðustu stöðu' + (S.at ? ' frá ' + klTxt(new Date(S.at).toISOString()) : '') + '.</div>';
    if (!S.tilbuin.length) return h + '<div class="baf-tomt"><b>Allt afgreitt.</b> Ný verk birtast hér þegar þau eru tilbúin og standast athuganirnar.</div></div>';
    var tel = teljaFlokka(S.tilbuin);
    // 27.11.2026: það sem var sent/gert í þessari setu, efst og grænt, svo aldrei sé vafi hvort það fór.
    if (S.gert && S.gert.length) h += S.gert.map(function (g) { return '<div class="baf-msg ok" role="status">' + esc(g.texti) + '</div>'; }).join('');
    h += '<div class="baf-fl" role="group" aria-label="Flokkar verka">' + FLOKKAR.filter(function (k) { return k === 'allt' || tel[k] || S.flokkur === k; }).map(function (k) {
      return '<button type="button" class="baf-f" data-baf="fl" data-f="' + k + '" aria-pressed="' + (S.flokkur === k) + '">' + (k === 'allt' ? 'Allt' : (TEG[k] || FLOKKHEITI[k])) + ' <b>' + (tel[k] || 0) + '</b></button>';
    }).join('') + '</div>';
    var l = sia(), synd = S.allt || l.length <= THAK ? l : l.slice(0, THAK);
    // Opið verk er alltaf sýnt, líka þegar það er neðan við þakið (opnað úr Einkaritaranum).
    if (synd.length < l.length && S.opid && !synd.some(function (v) { return v.id === S.opid; })) { var o = finna(S.opid); if (o && l.indexOf(o) >= 0) synd = synd.concat([o]); }
    h += l.length ? synd.map(radHtml).join('') : '<div class="baf-tomt">Ekkert í þessum flokki.</div>';
    if (l.length > THAK) h += '<button type="button" class="baf-meira" data-baf="allt" aria-expanded="' + !!S.allt + '">' + (S.allt ? 'Sýna færri' : '+ ' + (l.length - synd.length) + ' til viðbótar — sýna öll ' + l.length) + '</button>';
    return h + '</div>';
  }

  /* ── AÐGERÐIR ──────────────────────────────────────────────────────────────────────────────── */
  function framkvaema(v) {
    if (!v.ok) return null;
    var lyk = 'framkvaema:' + v.id;
    if (S.vopnad !== lyk) { vopna(lyk); return null; }
    afvopna(); S.busy = v.id; S.skilabod = null; notify();
    return kall({ id: v.id, adgerd: 'framkvaema', texti: v.tegund === 'tolvupostur' ? textiNu(v) : undefined }).then(function (j) {
      S.busy = null;
      if (j._status === 200 && j.ok) {
        // 27.11.2026: græn lína efst sem STENDUR (ekki bara toast sem hverfur) — „Sent til X kl. HH:MM".
        var d = new Date(), kl = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
        var til = v.tegund === 'tolvupostur' && v.post && v.post.to && v.post.to.length ? ' til ' + v.post.to.join(', ') : '';
        S.gert = [{ texti: (v.tegund === 'tolvupostur' ? '✓ SENT' + til : '✓ GERT') + ' kl. ' + kl + ' — ' + v.titill }].concat(S.gert || []).slice(0, 5);
        fjarlaegja(v.id); toast((v.tegund === 'tolvupostur' ? 'Sent' + til : 'Gert') + ': ' + v.titill);
      }
      else if (j.urelt) { fjarlaegja(v.id); toast((j.error || 'Verkið á ekki lengur við') + ' — tekið úr röðinni.', true); }
      else {
        S.skilabod = { id: v.id, texti: (j.error || ('Villa ' + j._status)) };
        if (Array.isArray(j.athuganir)) { v.athuganir = j.athuganir; v.ok = j.athuganir.every(function (x) { return x.ok; }); }
      }
      notify();
    }).catch(function (e) {
      // Svarið barst ekki: óvíst hvort þjónninn framkvæmdi. Aldrei segja „ekkert gerðist" — sækja stöðuna í staðinn.
      S.busy = null; S.skilabod = { id: v.id, texti: 'Netvilla — óvíst hvort verkið fór í gegn. Staðan er sótt aftur; reyndu ekki aftur fyrr en hún er komin. (' + String((e && e.message) || e) + ')' };
      S.at = 0; hlada(); notify();
    });
  }
  function sleppa(v) {
    var lyk = 'sleppa:' + v.id;
    if (S.vopnad !== lyk) { vopna(lyk); return null; }
    afvopna(); S.busy = v.id; notify();
    return kall({ id: v.id, adgerd: 'sleppa', varanlegt: true, astaeda: String(athNu(v) || '').trim().slice(0, 300) || 'Ekki þess virði' }).then(function (j) {
      S.busy = null;
      if (j._status === 200) { fjarlaegja(v.id); toast('Tekið úr röðinni: ' + v.titill); }
      else S.skilabod = { id: v.id, texti: j.error || ('Villa ' + j._status) };
      notify();
    }).catch(function (e) { S.busy = null; S.skilabod = { id: v.id, texti: 'Netvilla — verkið stendur óbreytt: ' + String((e && e.message) || e) }; notify(); });
  }
  function seinna(v) {
    S.busy = v.id; notify();
    return kall({ id: v.id, adgerd: 'seinna' }).then(function (j) {
      S.busy = null;
      if (j._status === 200) { if (S.opid === v.id) S.opid = null; S.at = 0; return hlada(); }
      S.skilabod = { id: v.id, texti: j.error || ('Villa ' + j._status) }; notify();
    }).catch(function (e) { S.busy = null; S.skilabod = { id: v.id, texti: 'Netvilla: ' + String((e && e.message) || e) }; notify(); });
  }
  function vistaAth(v) {
    var t = String(athNu(v) || '');
    S.athBusy = v.id; S.athSkilabod = null; notify();
    return kall({ id: v.id, adgerd: 'athugasemd', texti: t }).then(function (j) {
      S.athBusy = null;
      if (j._status === 200 && j.ok) {
        v.athugasemd = j.athugasemd; v.athugasemd_af = j.athugasemd_af; v.athugasemd_at = j.athugasemd_at; delete S.athDrog[v.id];
        S.athSkilabod = { id: v.id, texti: j.athugasemd ? 'Vistað ' + klTxt(j.athugasemd_at) + (j.athugasemd_af ? ' · ' + j.athugasemd_af : '') : 'Athugasemdin var hreinsuð' };
      } else S.athSkilabod = { id: v.id, texti: 'Vistaðist ekki: ' + (j.error || ('villa ' + j._status)) + ' — textinn er enn í reitnum' };
      notify();
    }).catch(function (e) { S.athBusy = null; S.athSkilabod = { id: v.id, texti: 'Netvilla — vistaðist ekki: ' + String((e && e.message) || e) }; notify(); });
  }
  // Breyttur póstur vistast á verkið þegar farið er úr reitnum (þjónninn keyrir athuganirnar aftur á nýja textanum).
  function vistaTexta(v) {
    if (!v || v.tegund !== 'tolvupostur' || !v.post || !(v.id in S.textaDrog)) return null;
    var t = S.textaDrog[v.id];
    if (t === v.post.texti) { delete S.textaDrog[v.id]; return null; }
    return kall({ id: v.id, adgerd: 'vista', texti: t }).then(function (j) {
      if (j._status === 200 && j.verk) {
        v.post.texti = t; v.athuganir = j.verk.athuganir; v.ok = j.verk.ok;
        if (S.textaDrog[v.id] === t) delete S.textaDrog[v.id];
        notify();
      }
    }).catch(function () {});   // drögin standa í reitnum og fara með þegar framkvæmt er
  }

  // „Afrita texta" á kafla í handriti — aðeins á klippiborðið, ekkert sent og engu breytt.
  function afrita(t) {
    if (!t) return null;
    var cb = rot.navigator && rot.navigator.clipboard;
    if (!cb || !cb.writeText) { toast('Vafrinn leyfir ekki afritun — merktu textann og afritaðu', true); return null; }
    return cb.writeText(t).then(function () { toast('Textinn er kominn á klippiborðið'); }, function () { toast('Afritun tókst ekki — merktu textann og afritaðu', true); });
  }
  function smellur(e) {
    var el = e && e.target && e.target.closest ? e.target.closest('[data-baf]') : null;
    if (!el) return null;
    var a = el.getAttribute('data-baf'), id = Number(el.getAttribute('data-id')) || null, v = id ? finna(id) : null;
    if (a === 'uppf') { S.at = 0; S.villa = null; hlada(); notify(); return null; }
    if (a === 'fl') { S.flokkur = el.getAttribute('data-f') || 'allt'; afvopna(); notify(); return null; }
    if (a === 'allt') { S.allt = !S.allt; notify(); return null; }
    if (a === 'opna') { S.opid = S.opid === id ? null : id; afvopna(); S.skilabod = null; S.athSkilabod = null; notify(); return null; }
    if (a === 'afrita') return afrita(v && v.simtal ? handritKafli(v.simtal.handrit, Number(el.getAttribute('data-k')) || 0) : '');
    if (!v || S.busy) return null;
    if (a === 'framkvaema') return framkvaema(v);
    if (a === 'sleppa') return sleppa(v);
    if (a === 'seinna') return seinna(v);
    if (a === 'ath-vista') return vistaAth(v);
    if (a === 'agiskun') return agiskun(v, el.getAttribute('data-netfang'), el.getAttribute('data-val'));
    return null;
  }
  function innslattur(e) {
    var t = e && e.target; if (!t || !t.getAttribute) return;
    var a = t.getAttribute('data-baf-texti'), b = t.getAttribute('data-baf-ath');
    if (a) S.textaDrog[Number(a)] = t.value;
    else if (b) S.athDrog[Number(b)] = t.value;
  }
  function ur_reit(e) {
    var t = e && e.target; if (!t || !t.getAttribute) return null;
    var a = t.getAttribute('data-baf-texti');
    return a ? vistaTexta(finna(Number(a))) : null;
  }

  // DYR (18.11.2026): takkarnir sem opna staðinn þar sem verkið er unnið — fyrsti takkinn er aðalleiðin. Sér breyta svo
  // símasíðan (515), sem teiknar án borðsins, fái sömu stíla um api.dyrCss().
  var DYR_CSS = [
      '.baf-dy{margin:14px 0 0;display:flex;flex-direction:column;gap:12px}',
      '.baf-dyrr{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
      '.baf-dyr{display:inline-flex;align-items:center;justify-content:space-between;gap:10px;min-height:46px;padding:9px 14px 9px 16px;border-radius:10px;border:1.5px solid #c8d3e6;background:#fff;' +
        'color:#12284c;font:700 15px/1.25 var(--body, Poppins, system-ui, sans-serif);text-decoration:none;box-shadow:0 1px 2px rgba(18,40,76,.08);-webkit-tap-highlight-color:transparent}',
      '.baf-dyr:hover{border-color:#12284c;background:#f3f6fb}.baf-dyr:focus-visible{outline:3px solid #f08a24;outline-offset:2px}',
      '.baf-dyr-o{flex:none;font-size:19px;line-height:1;color:#f08a24;font-weight:800}',
      '.baf-dyr-a{background:#12284c;border-color:#12284c;color:#fff;box-shadow:0 4px 14px rgba(18,40,76,.25)}.baf-dyr-a:hover{background:#0b1c38;border-color:#0b1c38}',
      '.baf-dyr-a .baf-dyr-o{color:#ffb55c}',
      '.baf-dyr-s{background:#0f7a3d;border-color:#0f7a3d;color:#fff}.baf-dyr-s:hover{background:#0b5f2f;border-color:#0b5f2f}.baf-dyr-s .baf-dyr-o{color:#d7f5e3}',
      '.baf-dyr-f{font:600 12.5px var(--body, system-ui);color:#5b6b85}',
      '.baf-dl{border:1px solid #d6deec;border-radius:10px;background:#fff;overflow:hidden}',
      '.baf-dl-h{padding:9px 14px;background:#f3f6fb;font:700 12.5px var(--body, system-ui);letter-spacing:.02em;color:#2e4064;border-bottom:1px solid #d6deec}',
      '.baf-dl ol{list-style:none;margin:0;padding:0}',
      '.baf-dl li{display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:10px;row-gap:1px;align-items:center;padding:9px 14px;border-bottom:1px solid #e9eef6}',
      '.baf-dl li:last-child{border-bottom:0}',
      '.baf-dl-n{grid-column:1;font:700 14.5px/1.3 var(--body, system-ui);color:#12284c;text-decoration:none;overflow-wrap:anywhere}a.baf-dl-n:hover{text-decoration:underline}',
      '.baf-dl-n span{color:#f08a24}.baf-dl-x{color:#5b6b85;font-weight:600}',
      '.baf-dl-a{grid-column:1;font:500 12.5px/1.35 var(--body, system-ui);color:#5b6b85;overflow-wrap:anywhere}',
      '.baf-dl-s{grid-column:2;grid-row:1 / span 2;align-self:center;min-height:38px;display:inline-flex;align-items:center;padding:6px 11px;border-radius:999px;background:#e6f6ec;color:#0b5f2f;' +
        'font:700 13px var(--body, system-ui);text-decoration:none;white-space:nowrap}',
      '.baf-dl details{border-top:1px solid #e9eef6}.baf-dl summary{padding:10px 14px;cursor:pointer;font:700 13.5px var(--body, system-ui);color:#12284c}',
      '@media (max-width:560px){.baf-dyr{flex:1 1 100%}}'
  ].join('');
  function css() {
    return [
      '.baf{display:flex;flex-direction:column;container-type:inline-size;container-name:baf}',
      '.baf-fl{display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px}',
      '.baf-f{min-height:30px;padding:0 11px;border:1px solid var(--edge);border-radius:15px;background:none;font:600 12.5px var(--body);color:var(--ink2);cursor:pointer}',
      '.baf-f b{font-family:var(--mono);font-weight:700;margin-left:2px}',
      '.baf-f[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--on)}',
      '.baf-f:focus-visible,.baf-r:focus-visible{outline:2px solid var(--g6);outline-offset:-2px}',
      '.baf-v{border-top:1px solid var(--rule2)}',
      '.baf-r{display:grid;grid-template-columns:64px minmax(0,1fr) auto 16px;align-items:center;gap:10px;width:100%;min-height:44px;padding:8px 14px;border:0;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer}',
      '.baf-r:hover{background:rgba(241,237,228,.55)}',
      '.baf-v.opid>.baf-r{background:rgba(241,237,228,.85)}',
      '.baf-bid{cursor:default;border-top:1px solid var(--rule2);background:linear-gradient(90deg,rgba(0,0,0,.025),rgba(0,0,0,.06),rgba(0,0,0,.025))}',
      '.baf-teg{font:600 11px var(--mono);letter-spacing:.1em;text-transform:uppercase;padding:3px 0;border:1px solid var(--edge2);border-radius:2px;color:var(--ink2);text-align:center;white-space:nowrap}',
      // Tillaga B: ein lína á línu — aðilinn feitur, restin venjuleg; allur titillinn í title-eigindinu.
      '.baf-t{font-size:14.5px;font-weight:400;line-height:1.4;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.baf-ta1{font-weight:700;color:var(--ink)}.baf-sep{color:var(--mute)}.baf-rest{color:var(--ink2)}.baf-rest.heil{font-weight:600;color:var(--ink)}',
      '.baf-ald{font:700 13px var(--body);font-variant-numeric:tabular-nums;border-radius:999px;padding:3px 10px;background:#f3f6fb;color:#2e4064;white-space:nowrap}',
      '.baf-ald.baf-t-r{background:#fee2de;color:#b91c1c}.baf-ald.baf-t-y{background:#fde5a4;color:#7a4b00}',
      '.baf-mk{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--mute);white-space:nowrap}',
      '.baf-mk .x{color:#a1161a;font-weight:800}',
      '.baf-kr{font:600 13px var(--mono);font-variant-numeric:tabular-nums;color:var(--ink2)}',
      '.baf-chev{font-size:13px;color:var(--mute);text-align:center}',
      '.baf-d{padding:2px 16px 16px;border-top:1px dashed var(--rule2);background:rgba(250,248,243,.7)}',
      '.baf-c{min-width:0}',
      '.baf-k{margin-top:13px}',
      '.baf-k h3{margin:0 0 5px;font:600 11.5px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}',
      '.baf-g{font-size:14px;line-height:1.5;color:var(--ink);max-width:92ch}',
      // Haus opna verksins: kicker með gullstriki, spurningin í Playfair og tölu-flísarnar.
      '.baf-hd{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:14px 20px;margin-top:12px}',
      '.baf-hdt{flex:999 1 320px;min-width:0;display:flex;flex-direction:column;gap:6px}',
      '.baf-kick{display:flex;align-items:center;gap:9px;font:700 11.5px var(--body);letter-spacing:.2em;text-transform:uppercase;color:var(--g8)}',
      '.baf-kick::before{content:"";flex:none;width:26px;height:2px;background:var(--gline);box-shadow:0 1px 0 #fff}',
      '.baf-sp{margin:0;font:800 clamp(19px,2.2cqi,28px)/1.22 var(--disp);letter-spacing:-.02em;color:var(--ink);text-shadow:0 1px 0 #fff;overflow-wrap:anywhere}',
      '.baf-kpi{flex:0 1 auto;display:flex;flex-wrap:wrap;gap:10px}',
      '.baf-kt{display:flex;flex-direction:column;gap:1px;min-width:98px;padding:7px 12px;border:1px solid var(--rule3);border-radius:4px;background:var(--key);box-shadow:var(--keysh)}',
      '.baf-kt span{font:700 11px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--mute)}',
      '.baf-kt b{font:800 23px/1.1 var(--disp);letter-spacing:-.02em;color:var(--ink);font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.baf-kt b i{font:600 12px var(--mono);font-style:normal;color:var(--mute)}',
      // Rökin: ferkantað gullmerki í stað kúlu, heimildin undir í mono (.baf-h).
      '.baf-rok{list-style:none;margin:0;padding:0;font-size:14px;line-height:1.5;color:var(--ink);max-width:92ch}',
      '.baf-rok li{position:relative;margin:0 0 8px;padding-left:15px}',
      '.baf-rok li::before{content:"";position:absolute;left:0;top:7px;width:6px;height:6px;background:var(--gface);border:1px solid #7a5a12;border-radius:1px}',
      // Hvað gerist: númeruð skref með gullplötu, svo röðin sjáist í stað einnar málsgreinar.
      '.baf-skref{list-style:none;margin:0;padding:0;font-size:14px;line-height:1.5;color:var(--ink);max-width:92ch}',
      '.baf-skref li{display:flex;align-items:flex-start;gap:9px;margin:0 0 7px}',
      '.baf-nr{flex:none;display:inline-flex;align-items:center;justify-content:center;min-width:19px;height:19px;margin-top:1px;padding:0 5px;' +
        'font:600 11.5px var(--mono);color:#2e2004;border:1px solid #5a4410;border-radius:2px;background:var(--gface);box-shadow:inset 0 1px 0 rgba(255,255,255,.6)}',
      '.baf-h{display:block;margin-top:1px;font:12px/1.4 var(--mono);color:var(--mute)}',
      '.baf-lk{color:var(--g8);font-weight:700;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}',
      DYR_CSS,   // dyrnar (sjá DYR_CSS að ofan — 515 notar sömu stíla)
      '.baf-sk{padding:9px 11px;border:1px solid var(--rule);border-radius:4px;background:#fffdf7;max-width:92ch}',
      '.baf-sk pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.5 var(--body);color:var(--ink2);max-height:260px;overflow:auto}',
      '.baf-skot{display:block;max-width:100%;height:auto;border:1px solid var(--rule);border-radius:4px;background:#fff}',
      '.baf-grein{font:13px var(--mono);word-break:break-all}',
      '.baf-meta{margin-bottom:4px;font:12px/1.4 var(--mono);color:var(--mute)}',
      '.baf-efni{margin-bottom:4px;font-size:14px;font-weight:700}',
      '.baf-dl{display:grid;grid-template-columns:auto minmax(0,1fr);gap:3px 10px;margin:0 0 8px;font-size:13.5px}',
      '.baf-dl dt{padding-top:1px;font:12px/1.5 var(--mono);color:var(--mute)}',
      '.baf-dl dd{margin:0;overflow-wrap:anywhere}',
      '.baf-ta{display:block;box-sizing:border-box;width:100%;max-width:92ch;padding:9px 11px;border:1px solid var(--edge);border-radius:4px;background:#fff;font:14px/1.5 var(--body);color:var(--ink);resize:vertical}',
      '.baf-ta.lagur{min-height:52px}',
      '.baf-ta:focus-visible{outline:2px solid var(--g6);outline-offset:1px}',
      '.baf-ath{list-style:none;margin:0;padding:0;font-size:13.5px;line-height:1.45}',
      '.baf-ath li{display:flex;align-items:flex-start;gap:8px;margin:0 0 4px}',
      '.baf-ok{color:#1b6b2d;font-weight:800}.baf-nei{color:#a1161a;font-weight:800}',
      '.baf-af{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:6px}',
      '.baf-am{font:12px var(--mono);color:var(--mute)}',
      '.baf-msg{margin:10px 14px 0;padding:8px 11px;border-radius:4px;font-size:14px;font-weight:600}',
      '.baf-d .baf-msg{margin:12px 0 0}',
      '.baf-msg.villa{border:1px solid rgba(180,35,24,.5);background:#fff3f1;color:#8a1c12}',
      '.baf-msg.ok{border:1px solid rgba(22,120,60,.5);background:#eefaf1;color:#135c2e}',
      '.baf-ft{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid var(--rule2)}',
      '.baf-grow{flex:1 1 auto}',
      '.baf-stopp{font-size:13px;font-weight:700;color:#8a1c12}',
      // Einn gulllykill á spjaldið (boss-btn.gold uppskriftin) — hinir takkarnir eru fílabein.
      '.btn.baf-go{min-height:42px;border:1px solid #5a4410;border-top-color:#f7e6b8;border-bottom-color:#2e2004;border-radius:5px;background:var(--gface);color:var(--ink);font-weight:800;' +
        'white-space:normal;text-align:center;text-shadow:0 1px 0 rgba(255,255,255,.35);' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.6),inset 0 -3px 4px rgba(60,40,0,.5),0 3px 7px rgba(22,21,19,.4)}',
      '.btn.baf-go[disabled]{cursor:not-allowed;background:#b9b3a6;border-color:#9a9383;color:#fff;box-shadow:none;filter:none;opacity:1}',
      '.btn.baf-vopn{border-color:#b8892e;background:#161513;color:#f7e6b8;font-weight:800;box-shadow:0 0 0 2px rgba(184,137,46,.45)}',
      '.baf-tomt{padding:14px 16px;font-size:14px;color:var(--mute)}',
      '.baf-meira{display:block;width:100%;min-height:40px;padding:8px 14px;border:0;border-top:1px solid var(--rule2);background:none;font:600 13px var(--body);color:var(--ink2);text-align:left;cursor:pointer}',
      '.baf-meira:hover{background:rgba(241,237,228,.55)}.baf-meira:focus-visible{outline:2px solid var(--g6);outline-offset:-2px}',
      '.baf-tomt b{color:var(--ink)}',
      bCss(),
      '@media (prefers-reduced-motion:no-preference){.btn.baf-go{transition:filter 120ms,background-color 120ms}}',
      '@container baf (min-width: 980px){.baf-d{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:40px;align-items:start}.baf-d>.baf-msg,.baf-ft,.baf-hd,.baf-strip{grid-column:1 / -1}}',
      '@container baf (max-width: 620px){.baf-r{grid-template-columns:56px minmax(0,1fr) 16px;row-gap:3px}.baf-mk{grid-column:2;grid-row:2}.baf-chev{grid-column:3;grid-row:1}' +
        '.baf-t{white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}' +
        '.baf-d{padding:2px 12px 14px}.baf-ft .btn{flex:1 1 auto}.baf-grow{display:none}.btn.baf-go{flex:1 1 100%;min-height:46px}' +
        '.baf-sp{font-size:19px}.baf-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.baf-tl li{grid-template-columns:44px 18px minmax(0,1fr)}}'
    ].join('');
  }
  /* Tillaga B — útlit opna verksins. Sameiginlegt borðinu og /afgreidsla.html (sem setur það í <style> sjálf).
   * Breytur borðsins (--ink, --ink2, --mute, --rule2, --edge, --body) með V2-gildin sem varagildi; litatónarnir
   * (gult fyrir bið, rautt fyrir „í dag", blátt fyrir „hvað gerist", appelsínugult fyrir sögnina) eru úr Brunahólf V2. */
  function bCss() {
    var I = 'var(--ink,#101e43)', I2 = 'var(--ink2,#2e4064)', M = 'var(--mute,#5a6882)', R2 = 'var(--rule2,#e7ecf3)', B = "var(--body,Poppins,system-ui,sans-serif)";
    return [
      '.baf-hd{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:14px 20px;margin-top:14px}',
      '.baf-hdt{flex:999 1 320px;min-width:0;display:flex;flex-direction:column;gap:8px}',
      '.baf-kr2{display:flex;flex-wrap:wrap;align-items:center;gap:10px}',
      '.baf-sogn{font:700 12px/1.2 ' + B + ';letter-spacing:.12em;text-transform:uppercase;color:#c2410c;background:#ffeee0;box-shadow:inset 0 0 0 1px #f8b98c;border-radius:6px;padding:5px 9px}',
      '.baf-sp-a{display:block;margin-bottom:5px;font:600 15px/1.3 ' + B + ';letter-spacing:0;color:' + I2 + '}',
      '.baf-merk{background:#fde5a4;color:inherit;border-radius:5px;padding:0 5px;-webkit-box-decoration-break:clone;box-decoration-break:clone}',
      '.baf-bord{flex:none;display:flex;flex-direction:column;gap:1px;padding:7px 13px;border-radius:10px;box-shadow:inset 0 0 0 1px var(--edge,#d8dee9)}',
      '.baf-bord span{font:600 11.5px ' + B + ';letter-spacing:.08em;text-transform:uppercase;color:' + M + '}',
      '.baf-bord b{font:700 16px/1.25 ' + B + ';color:' + I + '}',
      '.baf-strip{margin:16px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1px;background:' + R2 + ';border-radius:10px;overflow:hidden;box-shadow:inset 0 0 0 1px ' + R2 + '}',
      '.baf-sr{display:flex;flex-direction:column;gap:2px;min-width:0;padding:12px 16px;background:#f3f6fb}',
      '.baf-sr dt{font:600 11.5px ' + B + ';letter-spacing:.08em;text-transform:uppercase;color:' + M + '}',
      '.baf-sv{margin:0;font:700 17px/1.3 ' + B + ';color:' + I + ';overflow-wrap:anywhere}',
      '.baf-sv i{font:500 13px ' + B + ';font-style:normal;color:' + M + '}',
      '.baf-su{margin:0;font:13.5px/1.4 ' + B + ';color:' + M + ';overflow-wrap:anywhere}',
      '.baf-sr.baf-t-r .baf-sv{color:#b91c1c}.baf-sr.baf-t-y .baf-sv{color:#7a4b00}',
      '.baf-k h3.baf-sr-only,.baf-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}',
      // Tímalínan: dagsetning · punktur á lóðréttri línu · texti. Síðasti dagsetti hnúturinn navy, „Í dag" rauður.
      '.baf-tl{list-style:none;margin:0;padding:0;max-width:92ch}',
      '.baf-tl li{display:grid;grid-template-columns:52px 18px minmax(0,1fr);column-gap:10px}',
      '.baf-tld{font:700 13.5px/1.6 ' + B + ';color:' + I + ';font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.baf-tlp{position:relative}',
      '.baf-tlp::before{content:"";position:absolute;left:4px;top:6px;width:10px;height:10px;border-radius:50%;background:#c3ccd9}',
      '.baf-tlp::after{content:"";position:absolute;left:8px;top:19px;bottom:-5px;width:2px;background:' + R2 + '}',
      '.baf-tl li:last-child .baf-tlp::after{display:none}',
      '.baf-tl li.sidast .baf-tlp::before{background:#0b2d5f}',
      '.baf-tl li.idag .baf-tld{color:#b91c1c}',
      '.baf-tl li.idag .baf-tlp::before{left:3px;top:5px;width:12px;height:12px;background:#dc2626;box-shadow:0 0 0 4px #fee2de}',
      '.baf-tl p{margin:0 0 14px;font:14.5px/1.6 ' + B + ';color:' + I2 + ';overflow-wrap:anywhere}',
      '.baf-tl li:last-child p{margin-bottom:0}',
      '.baf-tl b,.baf-ath2 b{font-weight:600;color:' + I + '}',
      '.baf-tl li.idag p{font-weight:600;color:' + I + '}',
      '.baf-ath2,.baf-vafi{margin-top:12px;padding:10px 13px;border-radius:10px;background:#f3f6fb;font:13.5px/1.55 ' + B + ';color:' + I2 + ';max-width:92ch;overflow-wrap:anywhere}',
      '.baf-ath2 p,.baf-vafi p{margin:0}.baf-ath2 p+p,.baf-vafi p+p{margin-top:6px}',
      '.baf-vafi{background:#feecd2;color:#9a3412}.baf-vafi b{font-weight:600;color:#7c2d12}',
      '.baf-heim{list-style:none;margin:10px 0 0;padding:0;font:13px/1.45 ' + B + ';color:' + M + ';max-width:92ch;overflow-wrap:anywhere}',
      '.baf-heim li{margin:0 0 3px}.baf-heim b{color:' + I2 + ';font-weight:600}',
      // „Hvað gerist" í bláum reit: fyrsta setningin feit.
      '.baf-info{display:flex;gap:12px;align-items:flex-start;padding:13px 15px;border-radius:10px;background:#ebf0fe;color:#1e3a8a;max-width:92ch}',
      '.baf-info svg{flex:none;margin-top:2px;color:#2f6fe4}',
      '.baf-info b{display:block;font:700 15px/1.45 ' + B + '}',
      '.baf-info span{display:block;margin-top:2px;font:13.5px/1.5 ' + B + '}',
      // Handritið í köflum.
      '.baf-inn{margin:0 0 10px;font:13.5px/1.5 ' + B + ';color:' + M + ';max-width:92ch}',
      '.baf-kafli{margin:0 0 12px;max-width:92ch}',
      '.baf-kh{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:5px}',
      '.baf-kh h4{margin:0;font:600 11.5px/1.3 ' + B + ';letter-spacing:.08em;text-transform:uppercase;color:' + M + '}',
      '.baf-ht{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.6 ' + B + ';color:' + I + '}',
      '.baf-hl{margin:0;padding-left:22px;font:14px/1.6 ' + B + ';color:' + I + '}.baf-hl li+li{margin-top:2px}',
      '.baf-kafli.langur .baf-ht,.baf-kafli.langur .baf-hl{padding:14px 16px;border-radius:10px;background:#f3f6fb;box-shadow:inset 0 0 0 1px ' + R2 + '}',
      '.baf-kafli.langur .baf-hl{padding-left:36px}',
      '.baf-athr{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-start}',
      '.baf-athr .baf-ta{flex:1 1 280px;width:auto;min-width:0}',
      '.baf-athr .btn{min-height:44px}'
    ].join('');
  }
  function festa(root) {
    if (!root) return;
    if (!root.querySelector('#baf-still')) {
      var st = document.createElement('style');
      st.id = 'baf-still';
      st.textContent = css();
      root.appendChild(st);
    }
    if (root.__bafFest) return;
    root.__bafFest = true;
    root.addEventListener('click', smellur);
    root.addEventListener('input', innslattur);
    root.addEventListener('focusout', ur_reit);
  }
  // Opna tiltekið verk á borðinu (Einkaritarinn 506: „Afgreiða ›"). Skilar false ef einingin er ekki á borðinu núna.
  function opna(id) {
    var b = bord();
    if (!b || !b.opnaEiningu || !b.opnaEiningu('tilbuin')) return false;
    id = Number(id) || null;
    S.flokkur = 'allt'; afvopna(); S.skilabod = null;
    var syna = function () {
      if (id && S.tilbuin && !finna(id)) { toast('Verkið er ekki lengur í röðinni.', true); id = null; }
      // 19.11.2026 (rýni): liður í sérflokki (Bókanir, Dagsverk) er ekki í „Allt“ — án þessa opnaðist einingin en röðin var ekki í listanum.
      S.flokkur = (id && serflokkur(finna(id))) || 'allt';
      if (id) S.opid = id;
      notify();
      setTimeout(function () {
        try {
          var r = b.root && b.root(), el = r && r.querySelector(id ? '[data-baf="opna"][data-id="' + id + '"]' : '.baf');
          if (el && el.scrollIntoView) el.scrollIntoView({ block: id ? 'start' : 'nearest', behavior: 'smooth' });
        } catch (_) {}
      }, 80);
    };
    if (S.tilbuin) syna(); else { S.villa = null; hlada().then(syna); }
    return true;
  }

  // Tillaga B — hrein föll og HTML-bútar sem /afgreidsla.html notar líka (ein útgáfa af greiningunni).
  var snid = { titill: titill, bid: bid, timalina: timalina, gerist: gerist, handrit: handrit, hverjum: hverjum, aherslur: aherslur, merktHtml: merktHtml,
    hausHtml: hausHtml, linaHtml: linaHtml, dyrHtml: dyrHtml, dyrCss: function () { return DYR_CSS; }, timalinaHtml: timalinaHtml, geristHtml: geristHtml, handritHtml: handritHtml, handritKafli: handritKafli,
    afrita: afrita, css: bCss };
  var api = { version: '2026-11-17b', snid: snid, samantekt: samantekt, listi: listi, takkar: takkar, festa: festa, opna: opna,
    uppfaera: function () { S.at = 0; return hlada(); }, smellur: smellur, innslattur: innslattur, ur_reit: ur_reit, S: S,
    // Fyrir símasíðuna (515): sömu hjálparföll og borðið teiknar með — engin önnur útgáfa af gögnunum eða aðgerðunum.
    vakta: function (f) { if (typeof f === 'function' && vaktar.indexOf(f) < 0) vaktar.push(f); },
    tryggja: tryggja, finna: finna, textiNu: textiNu, athNu: athNu, linur: linur, athHtml: athHtml, opnaHtml: opnaHtml, dyrHtml: dyrHtml, dyrCss: function () { return DYR_CSS; }, kr: kr, TEG: TEG,
    erBokun: erBokun, iFlokki: iFlokki, teljaFlokka: teljaFlokka, serflokkur: serflokkur, serTexti: serTexti, SERFLOKKAR: SERFLOKKAR };
  rot.BordAfgreidsla = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
