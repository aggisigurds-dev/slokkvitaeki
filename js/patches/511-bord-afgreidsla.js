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
  var TEG = { tolvupostur: 'Póstur', krafa: 'Krafa', simtal: 'Símtal', verk: 'Verk' };
  var FLEIRT = { tolvupostur: ['póstur', 'póstar'], krafa: ['krafa', 'kröfur'], simtal: ['símtal', 'símtöl'], verk: ['verk', 'verk'] };
  var FLOKKAR = ['allt', 'tolvupostur', 'krafa', 'simtal', 'verk'];

  var S = { tilbuin: null, villa: null, loading: null, at: 0, flokkur: 'allt', opid: null, vopnad: null, vopnT: null,
    busy: null, skilabod: null, athDrog: {}, textaDrog: {}, athBusy: null, athSkilabod: null };

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var kr = function (v) { return v == null || !isFinite(Number(v)) ? '' : Math.round(Number(v)).toLocaleString('is-IS') + ' kr.'; };
  var klTxt = function (iso) { var d = new Date(iso); if (isNaN(d)) return ''; var p = function (n) { return String(n).padStart(2, '0'); }; return p(d.getDate()) + '.' + p(d.getMonth() + 1) + ' kl. ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  var bord = function () { return rot.Bord368 || null; };
  var notify = function () { try { var b = bord(); if (b && b.render) b.render(); } catch (_) {} };
  var toast = function (t, villa) { try { var b = bord(); if (b && b.toast) b.toast(t, !!villa); } catch (_) {} };
  var falinn = function () { return typeof document !== 'undefined' && document.visibilityState === 'hidden'; };
  // Slóð frá þjóninum → tengill í nýjum flipa. Aðeins http(s) eða slóð á þessum vef (aldrei //annar-vefur, aldrei javascript:).
  var opnaHtml = function (s) {
    if (!s || !s.url || !/^(https?:\/\/|\/(?!\/))/.test(String(s.url))) return '';
    return '<a class="baf-lk" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.texti || 'Opna') + ' ↗</a>';
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
  function sia() { var l = S.tilbuin || []; return S.flokkur === 'allt' ? l : l.filter(function (v) { return v.tegund === S.flokkur; }); }
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

  /* ── TEIKNING ──────────────────────────────────────────────────────────────────────────────── */
  function samantekt() {
    tryggja();
    if (!S.tilbuin) return S.villa ? (S.villa.inn ? 'Innskráning vantar' : 'Náði ekki í verkin') : 'Sæki verkin…';
    var n = S.tilbuin.length, tel = {};
    if (!n) return 'Allt afgreitt' + (S.loading ? ' · uppfæri…' : '');
    S.tilbuin.forEach(function (v) { tel[v.tegund] = (tel[v.tegund] || 0) + 1; });
    return n + ' tilbúin' + FLOKKAR.slice(1).filter(function (k) { return tel[k]; }).map(function (k) { return ' · ' + tel[k] + ' ' + FLEIRT[k][tel[k] === 1 ? 0 : 1]; }).join('') +
      (S.loading ? ' · uppfæri…' : '');
  }
  function takkar() {
    return '<button type="button" class="btn iv sm tog" data-baf="uppf" title="Sækja nýjustu stöðu" aria-label="Uppfæra tilbúnu verkin">↻</button>' +
      '<a class="btn iv sm" href="/afgreidsla.html" title="Öll verkin og sagan (gert, sleppt, úrelt) á sér síðu">Saga ›</a>';
  }

  function rokHtml(rok) {
    if (!rok || !rok.length) return '';
    return '<section class="baf-k"><h3>Af hverju þetta er rétt</h3><ul class="baf-rok">' + rok.map(function (r) {
      var sl = r && r.slod ? opnaHtml(r.slod) : '';
      return '<li>' + esc(r && r.texti) + ((r && r.heimild) || sl ? '<span class="baf-h">' + esc((r && r.heimild) || '') + (sl ? ' ' + sl : '') + '</span>' : '') + '</li>';
    }).join('') + '</ul></section>';
  }
  function athHtml(a) {
    if (!a || !a.length) return '';
    return '<section class="baf-k"><h3>Athuganir — keyrðar núna</h3><ul class="baf-ath">' + a.map(function (x) {
      return '<li><span class="' + (x.ok ? 'baf-ok' : 'baf-nei') + '" aria-label="' + (x.ok ? 'Í lagi' : 'Ekki í lagi') + '">' + (x.ok ? '✓' : '✗') + '</span><span>' + esc(x.texti) + '</span></li>';
    }).join('') + '</ul></section>';
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
        ((p.vidhengi || []).length ? '<dt>Viðhengi</dt><dd>' + esc(p.vidhengi.join(', ')) + '</dd>' : '') + '</dl>' +
        '<textarea class="baf-ta" data-baf-texti="' + v.id + '" data-ritun="1" rows="' + linur(textiNu(v)) + '" spellcheck="true" aria-label="Texti svarsins">' + esc(textiNu(v)) + '</textarea></section>';
    }
    if (v.tegund === 'simtal') {
      var s = v.simtal || {};
      return '<section class="baf-k"><h3>Símtalið</h3><dl class="baf-dl"><dt>Hverjum</dt><dd>' + esc(s.hverjum) + '</dd>' +
        (s.simi ? '<dt>Sími</dt><dd><a class="baf-lk" href="tel:' + esc(String(s.simi).replace(/[^\d+]/g, '')) + '">' + esc(s.simi) + '</a></dd>' : '') + '</dl>' +
        (s.handrit ? '<div class="baf-sk"><pre>' + esc(s.handrit) + '</pre></div>' : '') + '</section>';
    }
    if (v.tegund === 'verk') return '<section class="baf-k"><h3>Verkið</h3><div class="baf-sk"><pre>' + esc((v.verk || {}).lysing) + '</pre></div></section>';
    if (v.tegund === 'krafa' && v.krafa) {
      var ks = v.krafa.slod ? opnaHtml(v.krafa.slod) : '';
      return '<section class="baf-k"><h3>Krafan</h3><dl class="baf-dl"><dt>Reikningur</dt><dd>' + esc(v.krafa.r_numer || '') + (ks ? ' · ' + ks : '') + '</dd></dl></section>';
    }
    return '';
  }
  function opidHtml(v) {
    var upptekid = S.busy === v.id, vopnF = S.vopnad === 'framkvaema:' + v.id, vopnS = S.vopnad === 'sleppa:' + v.id;
    var h = '<div class="baf-d" id="baf-d-' + v.id + '">';
    // Tveir dálkar þegar einingin er breið (bogaskjárinn): rökin vinstra megin, efnið og athugasemdin hægra megin.
    h += '<div class="baf-c"><section class="baf-k"><h3>Hvað gerist þegar þú ýtir</h3><div class="baf-g">' + esc(v.hvad_gerist) + '</div></section>';
    h += rokHtml(v.af_hverju) + athHtml(v.athuganir) + '</div><div class="baf-c">' + efniHtml(v);
    h += '<section class="baf-k"><h3>Athugasemd þín</h3><textarea class="baf-ta lagur" data-baf-ath="' + v.id + '" data-ritun="1" spellcheck="true" maxlength="2000" aria-label="Athugasemd á verkið" ' +
      'placeholder="Til Claude og Tonys — vistast á verkið, t.d. „bíða til mánaðamóta“ eða verðið sem á að standa">' + esc(athNu(v)) + '</textarea>' +
      '<div class="baf-af"><button type="button" class="btn iv sm" data-baf="ath-vista" data-id="' + v.id + '"' + (S.athBusy === v.id ? ' disabled' : '') + '>' + (S.athBusy === v.id ? 'Vista…' : 'Vista athugasemd') + '</button>' +
      '<span class="baf-am" role="status">' + esc(S.athSkilabod && S.athSkilabod.id === v.id ? S.athSkilabod.texti : v.athugasemd ? 'Vistað ' + klTxt(v.athugasemd_at) + (v.athugasemd_af ? ' · ' + v.athugasemd_af : '') : '') + '</span></div></section></div>';
    if (S.skilabod && S.skilabod.id === v.id) h += '<div class="baf-msg villa" role="alert">' + esc(S.skilabod.texti) + '</div>';
    h += '<div class="baf-ft">' +
      '<button type="button" class="btn iv sm" data-baf="seinna" data-id="' + v.id + '"' + (upptekid ? ' disabled' : '') + ' title="Færir verkið aftar í röðina">Seinna</button>' +
      '<button type="button" class="btn iv sm' + (vopnS ? ' baf-vopn' : '') + '" data-baf="sleppa" data-id="' + v.id + '"' + (upptekid ? ' disabled' : '') + ' title="Tekur verkið úr röðinni fyrir fullt og allt. Athugasemdin þín fylgir sem ástæða.">' +
        (vopnS ? 'Ýttu aftur — kemur ekki aftur' : 'Ekki þess virði') + '</button>' +
      '<span class="baf-grow"></span>' +
      (v.ok ? '' : '<span class="baf-stopp">Athugun stóðst ekki — ekkert verður gert</span>') +
      '<button type="button" class="btn baf-go' + (vopnF ? ' baf-vopn' : '') + '" data-baf="framkvaema" data-id="' + v.id + '"' + (!v.ok || upptekid ? ' disabled' : '') +
        ' title="' + esc(v.ok ? v.hvad_gerist : 'Athugun stóðst ekki — sjá að ofan') + '">' + esc(upptekid ? 'Augnablik…' : vopnF ? 'Ýttu aftur til að staðfesta' : v.takki) + '</button>' +
      '</div></div>';
    return h;
  }
  function radHtml(v) {
    var opid = S.opid === v.id, virdi = kr(v.virdi_kr);
    return '<div class="baf-v' + (opid ? ' opid' : '') + '"><button type="button" class="baf-r" data-baf="opna" data-id="' + v.id + '" aria-expanded="' + opid + '"' + (opid ? ' aria-controls="baf-d-' + v.id + '"' : '') + '>' +
      '<span class="baf-teg">' + esc(TEG[v.tegund]) + '</span><span class="baf-t">' + esc(v.titill) + '</span>' +
      '<span class="baf-mk">' + (v.ok ? '' : '<span class="x" title="Athugun stóðst ekki">✗</span>') + (v.athugasemd ? '<span title="Athugasemd: ' + esc(v.athugasemd) + '">✎</span>' : '') +
        (virdi ? '<span class="baf-kr" title="Áætlað virði">' + virdi + '</span>' : '') + '</span>' +
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
    var tel = { allt: S.tilbuin.length };
    S.tilbuin.forEach(function (v) { tel[v.tegund] = (tel[v.tegund] || 0) + 1; });
    h += '<div class="baf-fl" role="group" aria-label="Flokkar verka">' + FLOKKAR.filter(function (k) { return k === 'allt' || tel[k] || S.flokkur === k; }).map(function (k) {
      return '<button type="button" class="baf-f" data-baf="fl" data-f="' + k + '" aria-pressed="' + (S.flokkur === k) + '">' + (k === 'allt' ? 'Allt' : TEG[k]) + ' <b>' + (tel[k] || 0) + '</b></button>';
    }).join('') + '</div>';
    var l = sia();
    h += l.length ? l.map(radHtml).join('') : '<div class="baf-tomt">Ekkert í þessum flokki.</div>';
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
      if (j._status === 200 && j.ok) { fjarlaegja(v.id); toast('Gert: ' + v.titill); }
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

  function smellur(e) {
    var el = e && e.target && e.target.closest ? e.target.closest('[data-baf]') : null;
    if (!el) return null;
    var a = el.getAttribute('data-baf'), id = Number(el.getAttribute('data-id')) || null, v = id ? finna(id) : null;
    if (a === 'uppf') { S.at = 0; S.villa = null; hlada(); notify(); return null; }
    if (a === 'fl') { S.flokkur = el.getAttribute('data-f') || 'allt'; afvopna(); notify(); return null; }
    if (a === 'opna') { S.opid = S.opid === id ? null : id; afvopna(); S.skilabod = null; S.athSkilabod = null; notify(); return null; }
    if (!v || S.busy) return null;
    if (a === 'framkvaema') return framkvaema(v);
    if (a === 'sleppa') return sleppa(v);
    if (a === 'seinna') return seinna(v);
    if (a === 'ath-vista') return vistaAth(v);
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

  function css() {
    return [
      '.baf{display:flex;flex-direction:column;container-type:inline-size;container-name:baf}',
      '.baf-fl{display:flex;flex-wrap:wrap;gap:6px;padding:10px 14px}',
      '.baf-f{min-height:30px;padding:0 11px;border:1px solid var(--edge);border-radius:15px;background:none;font:600 11.5px var(--body);color:var(--ink2);cursor:pointer}',
      '.baf-f b{font-family:var(--mono);font-weight:700;margin-left:2px}',
      '.baf-f[aria-pressed="true"]{background:var(--ink);border-color:var(--ink);color:var(--on)}',
      '.baf-f:focus-visible,.baf-r:focus-visible{outline:2px solid var(--g6);outline-offset:-2px}',
      '.baf-v{border-top:1px solid var(--rule2)}',
      '.baf-r{display:grid;grid-template-columns:64px minmax(0,1fr) auto 16px;align-items:center;gap:10px;width:100%;min-height:44px;padding:8px 14px;border:0;background:none;font:inherit;color:inherit;text-align:left;cursor:pointer}',
      '.baf-r:hover{background:rgba(241,237,228,.55)}',
      '.baf-v.opid>.baf-r{background:rgba(241,237,228,.85)}',
      '.baf-bid{cursor:default;border-top:1px solid var(--rule2);background:linear-gradient(90deg,rgba(0,0,0,.025),rgba(0,0,0,.06),rgba(0,0,0,.025))}',
      '.baf-teg{font:600 9.5px var(--mono);letter-spacing:.1em;text-transform:uppercase;padding:3px 0;border:1px solid var(--edge2);border-radius:2px;color:var(--ink2);text-align:center;white-space:nowrap}',
      '.baf-t{font-size:13.5px;font-weight:600;line-height:1.35;min-width:0;overflow-wrap:anywhere}',
      '.baf-mk{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--mute);white-space:nowrap}',
      '.baf-mk .x{color:#a1161a;font-weight:800}',
      '.baf-kr{font:600 12px var(--mono);font-variant-numeric:tabular-nums;color:var(--ink2)}',
      '.baf-chev{font-size:12px;color:var(--mute);text-align:center}',
      '.baf-d{padding:2px 16px 16px;border-top:1px dashed var(--rule2);background:rgba(250,248,243,.7)}',
      '.baf-c{min-width:0}',
      '.baf-k{margin-top:13px}',
      '.baf-k h3{margin:0 0 5px;font:600 10px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}',
      '.baf-g{font-size:13px;line-height:1.5;color:var(--ink);max-width:92ch}',
      '.baf-rok{margin:0;padding:0 0 0 18px;font-size:13px;line-height:1.5;color:var(--ink);max-width:92ch}',
      '.baf-rok li{margin:0 0 7px}',
      '.baf-h{display:block;margin-top:1px;font:11px/1.4 var(--mono);color:var(--mute)}',
      '.baf-lk{color:var(--g8);font-weight:700;text-decoration:underline;text-underline-offset:2px;white-space:nowrap}',
      '.baf-sk{padding:9px 11px;border:1px solid var(--rule);border-radius:4px;background:#fffdf7;max-width:92ch}',
      '.baf-sk pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.5 var(--body);color:var(--ink2);max-height:260px;overflow:auto}',
      '.baf-meta{margin-bottom:4px;font:11px/1.4 var(--mono);color:var(--mute)}',
      '.baf-efni{margin-bottom:4px;font-size:13px;font-weight:700}',
      '.baf-dl{display:grid;grid-template-columns:auto minmax(0,1fr);gap:3px 10px;margin:0 0 8px;font-size:12.5px}',
      '.baf-dl dt{padding-top:1px;font:11px/1.5 var(--mono);color:var(--mute)}',
      '.baf-dl dd{margin:0;overflow-wrap:anywhere}',
      '.baf-ta{display:block;box-sizing:border-box;width:100%;max-width:92ch;padding:9px 11px;border:1px solid var(--edge);border-radius:4px;background:#fff;font:13px/1.5 var(--body);color:var(--ink);resize:vertical}',
      '.baf-ta.lagur{min-height:52px}',
      '.baf-ta:focus-visible{outline:2px solid var(--g6);outline-offset:1px}',
      '.baf-ath{list-style:none;margin:0;padding:0;font-size:12.5px;line-height:1.45}',
      '.baf-ath li{display:flex;align-items:flex-start;gap:8px;margin:0 0 4px}',
      '.baf-ok{color:#1b6b2d;font-weight:800}.baf-nei{color:#a1161a;font-weight:800}',
      '.baf-af{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:6px}',
      '.baf-am{font:11px var(--mono);color:var(--mute)}',
      '.baf-msg{margin:10px 14px 0;padding:8px 11px;border-radius:4px;font-size:13px;font-weight:600}',
      '.baf-d .baf-msg{margin:12px 0 0}',
      '.baf-msg.villa{border:1px solid rgba(180,35,24,.5);background:#fff3f1;color:#8a1c12}',
      '.baf-ft{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:14px;padding-top:12px;border-top:1px solid var(--rule2)}',
      '.baf-grow{flex:1 1 auto}',
      '.baf-stopp{font-size:12px;font-weight:700;color:#8a1c12}',
      '.btn.baf-go{min-height:40px;border:1px solid #6d0f12;border-top-color:#e2574c;border-radius:5px;background:linear-gradient(#c3271c,#a1161a);color:#fff;font-weight:800;white-space:normal;text-align:center;' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 2px 5px rgba(22,21,19,.35)}',
      '.btn.baf-go[disabled]{cursor:not-allowed;background:#b9b3a6;border-color:#9a9383;color:#fff;box-shadow:none;filter:none;opacity:1}',
      '.btn.baf-vopn{border-color:#b8892e;background:#161513;color:#f7e6b8;font-weight:800;box-shadow:0 0 0 2px rgba(184,137,46,.45)}',
      '.baf-tomt{padding:14px 16px;font-size:13px;color:var(--mute)}',
      '.baf-tomt b{color:var(--ink)}',
      '@media (prefers-reduced-motion:no-preference){.btn.baf-go{transition:filter 120ms,background-color 120ms}}',
      '@container baf (min-width: 980px){.baf-d{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:32px;align-items:start}.baf-d>.baf-msg,.baf-ft{grid-column:1 / -1}}',
      '@container baf (max-width: 620px){.baf-r{grid-template-columns:56px minmax(0,1fr) 16px;row-gap:3px}.baf-mk{grid-column:2;grid-row:2}.baf-chev{grid-column:3;grid-row:1}' +
        '.baf-d{padding:2px 12px 14px}.baf-ft .btn{flex:1 1 auto}.baf-grow{display:none}.btn.baf-go{flex:1 1 100%;min-height:44px}}'
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

  var api = { version: '2026-11-16a', samantekt: samantekt, listi: listi, takkar: takkar, festa: festa, opna: opna,
    uppfaera: function () { S.at = 0; return hlada(); }, smellur: smellur, innslattur: innslattur, ur_reit: ur_reit, S: S };
  rot.BordAfgreidsla = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
