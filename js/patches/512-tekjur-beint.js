// 512 — Tekjur í beinni (lota 4, 17.11.2026, Agnar: „finna út tekjur og hagnað nokkuð svona live").
// Litlar flísar efst á Tekjum (#view-income) og Bókhaldi (#view-bokhalds-yfirlit): hvort félag í sinni röð, án VSK —
// mánuður til dags, ár til dags, síðasti mánuður, „í pípunni" og hagnaður. Tölurnar koma úr /api/tekjur-beint
// (reglurnar í netlify/functions/_tekjur.cjs). Ómælt er sagt ómælt — aldrei 0. Hagnaður reiknast þegar launakostnaður
// og annar kostnaður á mánuði eru slegin inn (smelltu á Hagnaður-flísina).
// 22.11.2026 (Agnar: tekjur Slökkvitækis miðast við unnið verk): röðin „Slökkvitæki · unnið“ — Skoðanir (ársþjónusta, brunakerfi,
// slökkvikerfi eftir skoðunarmánuði skv. skýrslunni) · Verkstæði (þegar tæki er klárt og sent í afgreiðslu, klart_at) · Verslun ·
// Samtals, með fjölda tækja (yfirfarin / hlaðin / ný). Það sem er „án skýrslu“, „óviss“ eða „áætlað“ er flaggað á flísinni — aldrei
// falið — og vanti gögn er sagt ómælt með ástæðu, aldrei 0. Gamla talan (söludagur) stendur í röðinni fyrir neðan.
// 22.11.2026 (Agnar: „ég hef ekki hugmynd hvernig reksturinn gengur“): efst „Hvernig gengur reksturinn?“ — hvort félag sér (aldrei lögð saman),
// sjö mánuðir: UNNIÐ · REIKNINGSFÆRT (sent) · GREITT og „ógefið út“, ógreitt núna, innheimtuhlutfall og greiðsluhraði (skilgreining í ⓘ),
// ein setning + MERKT áætlun. Gögnin koma úr /api/rekstur-yfirlit (sér fall, eigin tímamörk); bregðist það er sagt ómælt með ástæðu og
// flísarnar fyrir neðan standa óbreyttar. Hver tala sýnir hvað er á bak við hana (title) — ekki ný síða, heldur verkfærið sem er í notkun.
// Engin MutationObserver: tekjur.js og 11-bokhalds-yfirlit.js kalla TekjurBeint.mount(el) þegar þau teikna.
(function () {
  'use strict';
  var MAN = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  var _d = null, _at = 0, _bid = null, _villa = null, _opid = {};
  var _r = null, _rat = 0, _rbid = null, _rvilla = null, _rfela = false;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function kr(n) {
    if (n == null) return 'ómælt';
    var neg = n < 0, s = String(Math.abs(Math.round(n))), p = [];
    while (s.length > 3) { p.unshift(s.slice(-3)); s = s.slice(0, -3); }
    p.unshift(s);
    return (neg ? '−' : '') + p.join('.') + ' kr';
  }
  function mkr(n) { return n == null ? 'ómælt' : (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2).replace('.', ',') + ' m' : kr(n)); }
  function tal(n) { var s = String(Math.abs(Math.round(Number(n) || 0))), p = []; while (s.length > 3) { p.unshift(s.slice(-3)); s = s.slice(0, -3); } p.unshift(s); return p.join('.'); }
  function manNafn(m) { var i = Number(String(m || '').slice(5, 7)) - 1; return MAN[i] || m; }
  function dags(iso) { var x = String(iso || ''); return x.slice(8, 10) + '.' + x.slice(5, 7) + '.'; }

  function saekja(fersk) {
    if (_bid) return _bid;
    if (!fersk && _d && Date.now() - _at < 60000) return Promise.resolve(_d);
    _bid = fetch('/api/tekjur-beint', { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { r: r, j: j }; }); })
      .then(function (x) {
        if (x.r.status === 401) throw new Error('Skráðu þig inn til að sjá tekjur í beinni');
        // 403 = innskráður en ekki stjórnandi: flísarnar eru ekki fyrir hann — ekkert sýnt, engin villulína.
        if (x.r.status === 403) throw Object.assign(new Error('Aðeins fyrir stjórnanda'), { fela: true });
        if (!x.r.ok) throw new Error(x.j.error || ('villa ' + x.r.status));
        _d = x.j; _at = Date.now(); _villa = null; return _d;
      })
      .catch(function (e) { _villa = (e && e.message) || String(e); throw e; })
      .finally(function () { _bid = null; });
    return _bid;
  }

  // Hvernig gengur reksturinn? — sér kall, sér tímamörk; kastar aldrei út fyrir flísina
  function saekjaRekstur(fersk) {
    if (_rbid) return _rbid;
    if (!fersk && _r && Date.now() - _rat < 60000) return Promise.resolve(_r);
    _rbid = fetch('/api/rekstur-yfirlit', { credentials: 'same-origin', headers: { accept: 'application/json' } })
      .then(function (x) { return x.json().catch(function () { return {}; }).then(function (j) { return { r: x, j: j }; }); })
      .then(function (x) {
        if (x.r.status === 401 || x.r.status === 403) throw Object.assign(new Error('Aðeins fyrir stjórnanda'), { fela: true });
        if (!x.r.ok) throw new Error((x.j && x.j.error) || ('villa ' + x.r.status));
        var j = x.j;
        if (!j || !j.slokkvitaeki || !j.brunaholf) throw new Error('óvænt snið');
        _r = j; _rat = Date.now(); _rvilla = null; return _r;
      })
      .catch(function (e) { if (e && e.fela) _rfela = true; else _rvilla = (e && e.message) || String(e); throw e; })
      .finally(function () { _rbid = null; });
    return _rbid;
  }

  // Ljóst undirlag svo heiti og neðsta línan séu læsileg á hvaða þema sem er (dökkt þemabakgrunn gerði þau ósýnileg, 17.11.2026).
  var CSS = '.tkb{margin:0 0 12px;font-family:inherit;background:rgba(248,250,252,.92);border:1px solid rgba(15,23,42,.08);border-radius:12px;padding:8px 8px 6px;color:#0f172a}' +
    '.tkb-rod{display:flex;flex-wrap:wrap;gap:6px;align-items:stretch;margin-bottom:6px}' +
    '.tkb-fel{flex:0 0 92px;display:flex;flex-direction:column;justify-content:center;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#334155}' +
    '.tkb-fel small{font-weight:600;letter-spacing:0;text-transform:none;color:#94a3b8;font-size:10px}' +
    '.tkb-fl{flex:1 1 118px;min-width:118px;max-width:190px;border-radius:10px;padding:6px 9px;background:linear-gradient(180deg,#fff,#f1f4f8);border:1px solid rgba(15,23,42,.08);box-shadow:inset 0 1px 0 #fff,0 2px 6px -4px rgba(15,23,42,.25)}' +
    '.tkb-fl b{display:block;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8a93a5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.tkb-fl span{display:block;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:15px;font-weight:700;color:#11141c;white-space:nowrap}' +
    '.tkb-fl i{display:block;font-style:normal;font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.tkb-fl i.tkb-flagg{color:#b45309;font-weight:600}' +
    '.tkb-fl.tkb-pipa span{color:#b45309}.tkb-fl.tkb-omaelt span{color:#b45309;font-family:inherit;font-size:13px}' +
    '.tkb-fl.tkb-unnid{border-color:rgba(15,118,110,.35);background:linear-gradient(180deg,#f3fbfa,#e6f5f3)}.tkb-fl.tkb-unnid span{color:#0f766e}' +
    '.tkb-fl.tkb-smell{cursor:pointer}.tkb-fl.tkb-smell:hover{border-color:#94a3b8}' +
    '.tkb-form{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px 98px;font-size:11px;color:#475569}' +
    '.tkb-form input{width:120px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px}' +
    '.tkb-form button{padding:4px 10px;border-radius:6px;border:1px solid #1c3d8c;background:#2f5fe0;color:#fff;font-weight:700;font-size:11px;cursor:pointer}' +
    '.tkb-nedst{font-size:10px;color:#64748b}.tkb-nedst a{color:#475569;cursor:pointer;text-decoration:underline}' +
    '.tkb-rk{margin:0 0 10px;padding:8px 8px 6px;border-radius:10px;background:#fff;border:1px solid rgba(15,23,42,.1)}' +
    '.tkb-rk-h{font-size:13px;font-weight:800;color:#0f172a;margin:0 0 6px}.tkb-rk-h small{font-weight:600;color:#64748b;font-size:10px;margin-left:6px}' +
    '.tkb-rk-fel{display:flex;flex-wrap:wrap;gap:10px}.tkb-rk-fel section{flex:1 1 330px;min-width:0}' +
    '.tkb-rk h4{margin:0 0 3px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#334155}' +
    '.tkb-rk p{margin:0 0 3px;font-size:12px;line-height:1.35;color:#0f172a}.tkb-rk p.tkb-aaetl{color:#b45309;font-size:11px}' +
    '.tkb-rk table{border-collapse:collapse;width:100%;margin:4px 0;font-size:11px}.tkb-rk th{font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#8a93a5;text-align:right;padding:2px 3px}' +
    '.tkb-rk th:first-child,.tkb-rk td:first-child{text-align:left}.tkb-rk td{padding:2px 3px;text-align:right;font-family:"JetBrains Mono",ui-monospace,monospace;border-top:1px solid rgba(15,23,42,.06);white-space:nowrap}' +
    '.tkb-rk td:first-child{font-family:inherit;color:#475569}.tkb-rk td.tkb-u{font-weight:700;color:#0f766e}.tkb-rk td.tkb-om{color:#b45309;font-family:inherit}.tkb-rk tr.tkb-nu td{background:rgba(15,118,110,.07)}' +
    '.tkb-rk td sup{color:#b45309;font-weight:700}.tkb-rk .tkb-ne{color:#b91c1c}' +
    '.tkb-rk-l{font-size:11px;color:#334155;margin:2px 0}.tkb-rk-l b{color:#0f172a}.tkb-rk-l a{color:#2f5fe0;cursor:pointer;text-decoration:underline}.tkb-rk-l .tkb-i{cursor:help;color:#64748b}' +
    '@media (max-width:600px){.tkb-fel{flex-basis:100%}.tkb-form{margin-left:0}.tkb-fl{max-width:none}.tkb-rk-fel section{flex-basis:100%}}';
  function stilar() {
    if (document.getElementById('tkb-css')) return;
    var st = document.createElement('style'); st.id = 'tkb-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  function fl(lbl, val, sub, cls, attr, flagg) {
    if (val === 'ómælt' && !/tkb-omaelt/.test(cls || '')) cls = (cls ? cls + ' ' : '') + 'tkb-omaelt';
    return '<div class="tkb-fl' + (cls ? ' ' + cls : '') + '"' + (attr || '') + '><b title="' + esc(lbl) + '">' + esc(lbl) + '</b><span>' + esc(val) + '</span>' + (sub ? '<i title="' + esc(sub) + '">' + esc(sub) + '</i>' : '') +
      (flagg ? '<i class="tkb-flagg" title="' + esc(flagg) + '">' + esc(flagg) + '</i>' : '') + '</div>';
  }
  // Tæki: „yfirf. 412 · hlaðin 88 · ný 12“ (núll sleppt, allt núll → „engin tæki“)
  function taekiTexti(t) {
    if (!t) return '';
    var a = [];
    if (t.yfirferd) a.push('yfirf. ' + tal(t.yfirferd));
    if (t.hledsla) a.push('hlaðin ' + tal(t.hledsla));
    if (t.nytt) a.push('ný ' + tal(t.nytt));
    return a.length ? a.join(' · ') : 'engin tæki';
  }
  // Slökkvitæki unnið: undirbýr flísarnar úr s.unnid (ómælt með ástæðu ef lesturinn brást — aldrei 0)
  function unnidSl(s) {
    var u = s.unnid;
    if (!u) return '';
    if (u.omaelt || !u.manudur_til_dags) return fl('Unnið', 'ómælt', (u && u.omaelt) || 'náðist ekki', 'tkb-omaelt');
    var m = u.manudur_til_dags, f = u.fyrri_manudur, sk = m.skodanir, vk = m.verkstaedi, nm = manNafn(u.manudur);
    var skFlagg = [];
    if (sk.an_skyrslu_kr) skFlagg.push('án skýrslu ' + mkr(sk.an_skyrslu_kr) + (sk.an_skyrslu_fjoldi ? ' (' + sk.an_skyrslu_fjoldi + ')' : ''));
    if (sk.oviss_kr) skFlagg.push('óviss ' + mkr(sk.oviss_kr));
    var skTip = 'Ársþjónusta ' + mkr(sk.arsthjonusta_kr) + ' · brunakerfi ' + mkr(sk.brunakerfi_kr) + ' · slökkvikerfi ' + mkr(sk.slokkvikerfi_kr) +
      (sk.leidrett_fjoldi ? ' · ' + sk.leidrett_fjoldi + ' með leiðréttu ári' : '');
    var vkFlagg = vk.aaetlad_kr ? 'áætlað ' + mkr(vk.aaetlad_kr) + ' (klart_at vantar)' : '';
    var t = '';
    t += fl('Skoðanir · ' + nm + ' til dags', mkr(sk.kr), taekiTexti(sk.taeki), 'tkb-unnid', ' title="' + esc(skTip) + '"', skFlagg.join(' · '));
    t += fl('Verkstæði · ' + nm + ' til dags', mkr(vk.kr), taekiTexti(vk.taeki), 'tkb-unnid', '', vkFlagg);
    // „skýrslur sendar“ telja eftir raunverulegum kláradegi í kerfinu (Agnar 21.11), ekki skoðunarmánuði
    if (sk.skyrslur_klaradar != null) t += fl('Skýrslur kláraðar · ' + nm, tal(sk.skyrslur_klaradar), 'þar af ' + tal(sk.skyrslur_sidbuin || 0) + ' síðbúnar · eftir kláradegi', 'tkb-unnid');
    t += fl('Verslun · ' + nm + ' til dags', mkr(m.verslun.kr), 'sala án tækja úr skoðun', 'tkb-unnid');
    t += fl('Samtals unnið · ' + nm + ' til dags', mkr(m.samtals.kr), taekiTexti(m.samtals.taeki), 'tkb-unnid');
    if (f) t += fl('Samtals unnið · ' + manNafn(u.fyrri_man), mkr(f.samtals.kr), 'heill mánuður · skoðanir ' + mkr(f.skodanir.kr), 'tkb-unnid');
    t += fl('Unnið · ' + u.manudur.slice(0, 4) + ' til dags', mkr(u.ar_til_dags_kr), u.ar_fra === '2026-05' ? 'frá yfirtöku 04.05' : 'frá 1. jan', 'tkb-unnid');
    if (u.i_vinnslu_kr) t += fl('Á verkstæði núna', mkr(u.i_vinnslu_kr), 'í vinnslu · telst ekki enn', 'tkb-pipa');
    return t;
  }
  function hagnFl(felag, h, fm) {
    if (h && h.kr != null) return fl('Hagnaður · ' + manNafn(fm), mkr(h.kr), 'tekjur − laun − annar kostn. (þínar tölur)', 'tkb-smell', ' data-tkb-hagn="' + felag + '"');
    return fl('Hagnaður', 'ómælt', 'vantar laun og annan kostnað · smelltu', 'tkb-omaelt tkb-smell', ' data-tkb-hagn="' + felag + '"');
  }
  function forsForm(felag, h) {
    var f = (h && h.forsendur) || {};
    return '<div class="tkb-form" data-tkb-form="' + felag + '">Á mánuði, án VSK, úr bókhaldi: ' +
      '<label>Launakostnaður <input inputmode="numeric" data-tkb-lykill="laun" value="' + (f.laun != null ? f.laun : '') + '" placeholder="t.d. 2.400.000"></label>' +
      '<label>Annar kostnaður <input inputmode="numeric" data-tkb-lykill="annar" value="' + (f.annar != null ? f.annar : '') + '" placeholder="innkaup, leiga, bílar …"></label>' +
      '<button type="button" data-tkb-vista="' + felag + '">Vista</button></div>';
  }

  // Með formerki (ógefið út getur verið neikvætt): „−1,23 m“
  function mkrS(n) { if (n == null) return 'ómælt'; var a = Math.abs(n); var t = a >= 1e6 ? (a / 1e6).toFixed(2).replace('.', ',') + ' m' : tal(a) + ' kr'; return (n < 0 ? '−' : '') + t; }
  function ibox(txt) { return ' <span class="tkb-i" title="' + esc(txt) + '">ⓘ</span>'; }
  function rkMan(x, nu) {
    var nafn = manNafn(x.man).slice(0, 3) + (nu ? ' · til dags' : '');
    var mat = x.mat || {}, st = '';
    if (mat.an_skyrslu_kr) st += '<sup title="' + esc('án skýrslu ' + mkrS(mat.an_skyrslu_kr) + ' — söludagur notaður') + '">*</sup>';
    if (mat.aaetlad_kr) st += '<sup title="' + esc('verkstæði áætlað ' + mkrS(mat.aaetlad_kr) + ' — klart_at vantar, söludagur notaður') + '">†</sup>';
    function c(v, cls, tip) { return v == null ? '<td class="tkb-om" title="' + esc(x.omaelt || 'ómælt') + '">ómælt</td>' : '<td' + (cls ? ' class="' + cls + '"' : '') + (tip ? ' title="' + esc(tip) + '"' : '') + '>' + esc(mkrS(v)) + '</td>'; }
    var h = x.hlutar || {}, rfTip = h.rf_payday != null ? 'Payday ' + mkrS(h.rf_payday) + ' · verslun ' + mkrS(h.rf_verslun) : '', grTip = h.gr_payday != null ? 'Payday ' + mkrS(h.gr_payday) + ' · verslun ' + mkrS(h.gr_verslun) : '';
    var unTip = h.tima != null ? 'tímar ' + mkrS(h.tima) + ' · Landspítali ' + mkrS(h.landspitali) + ' · Heklureitur ' + mkrS(h.heklureitur) : '';
    var og = x.ogefid == null ? c(null) : '<td' + (x.ogefid < 0 ? ' class="tkb-ne"' : '') + ' title="' + esc('unnið − reikningsfært' + (x.ogefid < 0 ? ' (neikvætt: reikningar fyrir fyrri vinnu sendir í þessum mánuði)' : '')) + '">' + esc(mkrS(x.ogefid)) + '</td>';
    return '<tr' + (nu ? ' class="tkb-nu"' : '') + '><td>' + esc(nafn) + st + '</td>' + c(x.unnid, 'tkb-u', unTip) + c(x.reikningsfaert, '', rfTip) + c(x.greitt, '', grTip) + og + '</tr>';
  }
  function rkFelag(felag, nafn, b, sk, hagn, fm) {
    if (!b || b.omaelt || !b.man) return '<section><h4>' + esc(nafn) + '</h4><p>Ómælt — ' + esc((b && b.omaelt) || 'gögn vantar') + '</p></section>';
    var rows = b.man.slice().reverse().map(function (x, i) { return rkMan(x, i === 0); }).join('');
    var set = b.setning || {};
    var og = b.ogreitt || {}, inn = b.innheimta || {};
    var ogTxt;
    if (og.omaelt) ogTxt = 'Ógreitt núna: <b>ómælt</b> — ' + esc(og.omaelt);
    else if (og.kr_an_vsk != null) ogTxt = 'Ógreitt núna (sent, án VSK): <b>' + esc(mkrS(og.kr_an_vsk)) + '</b> (' + og.n + ' reikn.) · gjaldfallið <b>' + esc(mkrS(og.gjaldfallid_kr)) + '</b> (' + og.gjaldfallid_n + ') · yfir 45 d <b>' + esc(mkrS(og.yfir45_kr)) + '</b> (' + og.yfir45_n + ')';
    else ogTxt = 'Ógreitt núna (Kröfu yfirlit, m. VSK): <b>' + esc(mkrS(og.kr_m_vsk)) + '</b> (' + og.n + ' reikn.) · gjaldfallið <b>' + esc(mkrS(og.gjaldfallid_kr_m_vsk)) + '</b> (' + og.gjaldfallid_n + ') · yfir 45 d <b>' + esc(mkrS(og.yfir45_kr_m_vsk)) + '</b> (' + og.yfir45_n + ')';
    var innTxt = inn.omaelt ? 'Innheimtuhlutfall <b>ómælt</b> · greiðsluhraði <b>ómælt</b> — ' + esc(inn.omaelt)
      : 'Innheimtuhlutfall <b>' + (inn.hlutfall != null ? String(inn.hlutfall).replace('.', ',') + ' %' : 'ómælt') + '</b>' + ibox(sk.innheimtuhlutfall || '') +
        ' · greiðsluhraði <b>' + (inn.hradi_midgildi != null ? String(inn.hradi_midgildi).replace('.', ',') + ' dagar' : 'ómælt') + '</b>' + ibox(sk.greidsluhradi || '') +
        (inn.fra ? ' <span title="reikningar útgefnir frá ' + esc(inn.fra) + '">(frá ' + esc(dags(inn.fra)) + ')</span>' : '');
    var uppsafn = b.ogefid_uppsafnad != null ? '<p class="tkb-rk-l">Ógefið út, uppsafnað (' + b.ogefid_manudir + ' mán.): <b' + (b.ogefid_uppsafnad < 0 ? ' class="tkb-ne"' : '') + '>' + esc(mkrS(b.ogefid_uppsafnad)) + '</b>' + ibox(sk.ogefid || '') + '</p>' : '';
    var hag = hagn && hagn.kr != null ? 'Hagnaður ' + esc(manNafn(fm)) + ': <b>' + esc(mkrS(hagn.kr)) + '</b>' : 'Hagnaður: <b>ómælt</b> — vantar laun og annan kostnað';
    return '<section><h4>' + esc(nafn) + '</h4>' +
      '<p>' + esc(set.setning || '') + ibox(sk.setning || '') + '</p>' +
      (set.aaetlun ? '<p class="tkb-aaetl">' + esc(set.aaetlun.texti) + '</p>' : '') +
      '<table><tr><th>Mánuður</th><th>Unnið' + ibox(sk.unnid || '') + '</th><th>Reikningsfært' + ibox(sk.reikningsfaert || '') + '</th><th>Greitt' + ibox(sk.greitt || '') + '</th><th>Ógefið út</th></tr>' + rows + '</table>' +
      uppsafn +
      '<p class="tkb-rk-l">' + ogTxt + ' · <a data-tkb-ga="krofu-yfirlit">Kröfu yfirlit →</a></p>' +
      '<p class="tkb-rk-l">' + innTxt + '</p>' +
      '<p class="tkb-rk-l">' + hag + ' · <a data-tkb-hagn="' + felag + '">skrá laun og kostnað</a>' + ibox(sk.hagnadur || '') + '</p>' +
      (_opid[felag] ? forsForm(felag, hagn) : '') + '</section>';
  }
  function reksturBlokk(d) {
    if (_rfela) return '';
    if (!_r) return '<div class="tkb-rk"><div class="tkb-rk-h">Hvernig gengur reksturinn?</div><p>' + (_rvilla ? 'Ómælt — ' + esc(_rvilla) : 'Sæki …') + '</p></div>';
    var sk = _r.skilgreining || {}, s = d.slokkvitaeki || {}, b = d.brunaholf || {};
    return '<div class="tkb-rk"><div class="tkb-rk-h">Hvernig gengur reksturinn?<small>án VSK · félögin aldrei lögð saman · mælt ' + esc(dags(_r.maelt_at)) + ' kl. ' + esc(String(_r.maelt_at || '').slice(11, 16)) + '</small></div>' +
      '<div class="tkb-rk-fel">' + rkFelag('slokkvitaeki', 'Slökkvitæki', _r.slokkvitaeki, sk, s.hagnadur, s.fyrri_man) + rkFelag('brunaholf', 'Brunahólf', _r.brunaholf, sk, b.hagnadur, b.fyrri_man) + '</div>' +
      '<p class="tkb-rk-l" style="margin-top:4px">* án skýrslu (söludagur notaður) · † verkstæði áætlað (klart_at vantar) · vinnudagar mán–fös, frídagar ekki dregnir frá</p></div>';
  }

  function teikna(el, d) {
    var s = d.slokkvitaeki, b = d.brunaholf, fv = s.framlegd_voru && s.framlegd_voru.fyrri_manudur;
    var unnidRodS = s.unnid !== undefined && s.unnid !== null ? '<div class="tkb-rod"><div class="tkb-fel">Slökkvitæki<small>unnið · án VSK</small></div>' + unnidSl(s) + '</div>' : '';
    var rodS = unnidRodS + '<div class="tkb-rod"><div class="tkb-fel">Slökkvitæki<small>söluskráð · án VSK</small></div>' +
      fl(manNafn(s.manudur) + ' til dags', mkr(s.manudur_til_dags), s.omaelt || 'eftir söludegi · kredit dregið frá') +
      fl(s.manudur.slice(0, 4) + ' til dags', mkr(s.ar_til_dags), s.ar_fra === '2026-05' ? 'frá yfirtöku 04.05' : 'frá 1. jan') +
      fl(manNafn(s.fyrri_man), mkr(s.fyrri_manudur), 'heill mánuður') +
      fl('Í pípunni', mkr(s.pipa.kr_an_vsk), s.pipa.fjoldi + ' drög · ekki í tekjum', 'tkb-pipa') +
      (fv && fv.thak_pct != null ? fl('Framlegð vöru · ' + manNafn(s.fyrri_man), mkr(fv.framlegd), 'aðeins ' + String(fv.thak_pct).replace('.', ',') + ' % sölu með kostnaðarverð') : fl('Framlegð vöru', 'ómælt', 'kostnaðarverð vantar', 'tkb-omaelt')) +
      hagnFl('slokkvitaeki', s.hagnadur, s.fyrri_man) + '</div>' + (_opid.slokkvitaeki && !_r ? forsForm('slokkvitaeki', s.hagnadur) : '');
    // 21.11.2026 (Agnar: Brunahólf telst eftir unnu verki skv. tímaskýrslu og Ajour Done-degi): „Unnið" er nú fyrst og útgáfudagstalan
    // heitir „Reikningsfært". Unnið er áætlun úr Rekstrarskýrslu Brunahólfs — ómælt með ástæðu ef hún næst ekki, aldrei 0.
    var u = b.unnid || {};
    var unnidFl = (u.manudur_til_dags != null
      ? fl('Unnið · ' + manNafn(b.manudur) + ' til dags', mkr(u.manudur_til_dags), 'áætlun · tímar og göt' + (u.ajour_til ? ' · göt til ' + String(u.ajour_til).slice(8, 10) + '.' + String(u.ajour_til).slice(5, 7) : ''), 'tkb-unnid') +
        fl('Unnið · ' + manNafn(b.fyrri_man), mkr(u.fyrri_manudur), 'heill mánuður · áætlun', 'tkb-unnid')
      : fl('Unnið', 'ómælt', u.omaelt || 'náðist ekki', 'tkb-omaelt'));
    var greittFl = u.greitt_manudur_til_dags != null ? fl('Greitt · ' + manNafn(b.manudur) + ' til dags', mkr(u.greitt_manudur_til_dags), 'Payday + handfært') : '';
    var rodB = '<div class="tkb-rod"><div class="tkb-fel">Brunahólf<small>án VSK</small></div>' + unnidFl +
      fl('Reikningsfært · ' + manNafn(b.manudur) + ' til dags', mkr(b.manudur_til_dags), b.omaelt || 'eftir útgáfudegi') + greittFl +
      fl('Reikningsfært · ' + b.manudur.slice(0, 4) + ' til dags', mkr(b.ar_til_dags), 'Payday greitt + sent') +
      fl('Reikningsfært · ' + manNafn(b.fyrri_man), mkr(b.fyrri_manudur), 'heill mánuður') +
      (b.pipa.kr_m_vsk != null ? fl('Í pípunni (m. VSK)', mkr(b.pipa.kr_m_vsk), b.pipa.fjoldi + ' ósent · sama og Kröfu yfirlit', 'tkb-pipa') : fl('Í pípunni', 'ómælt', b.pipa.omaelt || 'náðist ekki', 'tkb-omaelt')) +
      hagnFl('brunaholf', b.hagnadur, b.fyrri_man) + '</div>' + (_opid.brunaholf && !_r ? forsForm('brunaholf', b.hagnadur) : '');
    var sk = d.skilgreining || {};
    var nedst = '<div class="tkb-nedst">Mælt ' + dags(d.maelt_at) + ' kl. ' + String(d.maelt_at || '').slice(11, 16) + ' · <a data-tkb-endur>↻ uppfæra</a> · <span title="' +
      esc('Slökkvitæki: ' + sk.slokkvitaeki + '\nBrunahólf: ' + sk.brunaholf + '\nHagnaður: ' + sk.hagnadur) + '">ⓘ hvernig er reiknað</span> · félögin eru aldrei lögð saman</div>';
    el.innerHTML = '<div class="tkb">' + reksturBlokk(d) + rodS + rodB + nedst + '</div>';
  }

  function vista(el, felag) {
    var form = el.querySelector('[data-tkb-form="' + felag + '"]');
    if (!form) return;
    var inn = form.querySelectorAll('input[data-tkb-lykill]'), kall = Promise.resolve();
    Array.prototype.forEach.call(inn, function (i) {
      var lykill = i.getAttribute('data-tkb-lykill'), v = i.value.trim();
      kall = kall.then(function () {
        return fetch('/api/tekjur-beint', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'forsenda', felag: felag, lykill: lykill, kr: v === '' ? null : v }) })
          .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; }); });
      });
    });
    kall.then(function (j) {
      // Vista skilar án Unnið (skýrslan er þung): haldið tölunni frá síðustu opnun (rýni 22.11).
      if (j && j.brunaholf && j.brunaholf.unnid == null && _d && _d.brunaholf) j.brunaholf.unnid = _d.brunaholf.unnid;
      if (j && j.slokkvitaeki && j.slokkvitaeki.unnid == null && _d && _d.slokkvitaeki) j.slokkvitaeki.unnid = _d.slokkvitaeki.unnid;
      _d = j; _at = Date.now(); _opid[felag] = false; teikna(el, j);
    })
      .catch(function (e) { form.insertAdjacentHTML('beforeend', '<span style="color:#b91c1c">Vistaðist ekki: ' + esc(e.message || e) + '</span>'); });
  }

  function villa(el, texti) {
    try { stilar(); el.innerHTML = '<div class="tkb"><div class="tkb-nedst" style="font-size:12px;color:#b45309">Tekjur í beinni: ' + esc(texti || 'ómælt') + '</div></div>'; } catch (_) {}
  }
  // Kastar ALDREI: tekjur.js og 11-bokhalds-yfirlit.js kalla mount í miðri teikningu — villa hér má ekki stöðva síðuna.
  // 401 → „Skráðu þig inn …", 5xx/net/óvænt snið → stutt villulína; tölurnar fyrir neðan á síðunni standa óbreyttar.
  function mount(el, fersk) {
    if (!el) return;
    try { mountInn(el, fersk); } catch (e) { villa(el, (e && e.message) || String(e)); }
  }
  function mountInn(el, fersk) {
    stilar();
    if (!el.dataset.tkbTengt) {
      el.dataset.tkbTengt = '1';
      el.addEventListener('click', function (ev) {
        var t = ev.target;
        var h = t.closest && t.closest('[data-tkb-hagn]');
        if (h) { var f = h.getAttribute('data-tkb-hagn'); _opid[f] = !_opid[f]; if (_d) { try { teikna(el, _d); } catch (e2) { villa(el, e2.message); } } return; }
        var ga = t.closest && t.closest('[data-tkb-ga]');
        if (ga) { var v2 = ga.getAttribute('data-tkb-ga'); try { if (window.App && App.switchView) App.switchView(v2); else location.hash = '#' + v2; } catch (e3) { location.hash = '#' + v2; } return; }
        var v = t.closest && t.closest('[data-tkb-vista]');
        if (v) { vista(el, v.getAttribute('data-tkb-vista')); return; }
        if (t.closest && t.closest('[data-tkb-endur]')) { _r = null; mount(el, true); }
      });
    }
    if (_d) { try { teikna(el, _d); } catch (_) { _d = null; } }
    if (!_d) el.innerHTML = '<div class="tkb"><div class="tkb-nedst" style="font-size:12px">Sæki tekjur í beinni …</div></div>';
    // Hvernig gengur reksturinn? kemur sér (þungt: Payday, Tímavera, Ajour) og seinkar ekki flísunum; teiknað aftur þegar það berst
    saekjaRekstur(!!fersk).then(function () { if (el.isConnected !== false && _d) { try { teikna(el, _d); } catch (e4) { /* flísarnar standa */ } } })
      .catch(function () { if (el.isConnected !== false && _d) { try { teikna(el, _d); } catch (e5) { /* sjá að ofan */ } } });   // villa → „Ómælt — ástæða“; 403 → blokkin hverfur
    saekja(!!fersk).then(function (d) { if (el.isConnected !== false) teikna(el, d); })
      .catch(function (e) { if (e && e.fela) { el.innerHTML = ''; return; } villa(el, _villa || (e && e.message) || String(e)); });
  }

  window.TekjurBeint = { mount: mount, _teikna: teikna, _kr: kr, _mkr: mkr, _taekiTexti: taekiTexti };
})();
