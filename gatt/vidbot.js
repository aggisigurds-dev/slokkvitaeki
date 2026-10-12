/* vidbot.js — Þjónustugátt: viðbótartólin fimm (12.10.2026, Agnar: „Mátt halda áfram að fullkomna þetta").
 *
 *   verktakar   Verktakaskrá með SLA: fag, tengiliður, viðbragðstími, samningur og tryggingaskírteini með gildistíma
 *   rymi        Rými og leigutakar per eign/hæð
 *   lyklar      Lyklar og aðgangur per eign (ENGIR hurðakóðar — skráin er lesanleg öllum með aðgang)
 *   orkumaelar  Mælar per eign + álestur með mynd; notkun milli álestra; CSV fyrir ESG
 *   kostnadur   Kostnaðaryfirlit per eign per ár: reikningar Slökkvitækja (data.invoices) + eigin færslur; áætlun næsta árs; CSV
 *
 * Allt býr í EINNI töflu, portal_skrar (tegund + gogn jsonb) — POST skra_add / skra_edit / skra_eyda í gatt.cjs.
 * Hleðst eftir eignagatt.js og á undan portal.js; tengist með window.Gatt og króknum GattVidbot.{render, eignHtml, atburdir, leit}.
 * Hvert tól hlýðir rofa okkar (account.syn) OG vali kúnnans (stillingar.verkfaeri — „Stilla vinnusvæði"). */
(function () {
  'use strict';
  function G() { return window.Gatt; }
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var fmtDate = function (d) { if (!d) return '—'; var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d)); return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(d); };
  function fmtKr(n) { n = Math.round(+n || 0); return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr'; }
  function st() { return G().state; }
  function data() { return st().data || {}; }
  function syn() { return G().synOf(); }
  function toast(m) { G().toast(m); }
  function ic(k, w) { return G().svgIc(k, w); }
  function felur() { var a = data().account || {}; return (a.stillingar && a.stillingar.verkfaeri) || {}; }
  function on(k) { return !!syn()[k] && felur()[k] !== false; }
  function eignAfId(id) { return G().eignAfId(id); }
  function allarEignir() { return (data().buildings || []).concat(data().eignir_utan || []); }
  function skrar(teg) { return (data().skrar || []).filter(function (r) { return r.tegund === teg; }); }
  function dagar(d) { if (!d) return null; var x = new Date(d + 'T00:00:00'); return isNaN(x) ? null : Math.round((x - new Date(new Date().toDateString())) / 864e5); }
  function idag() { return new Date().toISOString().slice(0, 10); }
  function api(body) {
    var s = st();
    if (s.demo) return Promise.resolve({ ok: true, j: { ok: true, demo: true } });
    var purl = s.open ? ('/api/gatt?c=' + encodeURIComponent(G().SLUG())) : '/api/gatt';
    return fetch(purl, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
      .catch(function () { return { ok: false, j: { error: 'Engin tenging' } }; });
  }
  function minnkaMynd(file, hamark) {
    return new Promise(function (res, rej) {
      if (!file || !/^image\//.test(file.type)) { rej(new Error('ekki mynd')); return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, (hamark || 1600) / Math.max(img.naturalWidth, img.naturalHeight, 1));
        var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        res({ data: c.toDataURL('image/jpeg', 0.82), w: c.width, h: c.height });
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('mynd')); };
      img.src = url;
    });
  }
  function csvSkra(nafn, rows) {
    var csv = '﻿' + rows.map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';'); }).join('\r\n');
    G().vistaBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), nafn + '-' + idag() + '.csv');
  }
  var BLY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m13.5 6.5 3 3"/></svg>';
  function tala(v) { return String(v == null ? '' : v).replace('.', ','); }

  /* ── Skilgreining tólanna: reitir [lykill, heiti, tegund, skylda, valkostir] ── */
  var FAG = ['Rafvirki', 'Pípari', 'Smiður', 'Brunakerfi', 'Lyftur', 'Loftræsting', 'Málari', 'Ræsting', 'Öryggisgæsla', 'Snjómokstur og lóð', 'Annað'];
  var SPEC = {
    verktaki: { heiti: 'Verktakaskrá', eitt: 'verktaki', k: 'verktakar', panel: 'vs-verktakar', eign: false, fields: [
      ['nafn', 'Nafn verktaka', 'text', 1], ['fag', 'Fag', 'select', 0, FAG], ['tengilidur', 'Tengiliður', 'text'], ['simi', 'Sími', 'tel'], ['netfang', 'Netfang', 'email'],
      ['sla_klst', 'Viðbragðstími (klst)', 'num'], ['samningur_til', 'Samningur gildir til', 'date'], ['tryggingar_til', 'Tryggingaskírteini gildir til', 'date'], ['ath', 'Athugasemd', 'textarea']] },
    rymi: { heiti: 'Rými og leigutakar', eitt: 'rými', k: 'rymi', panel: 'vs-rymi', eign: true, fields: [
      ['heiti', 'Rými (nr. eða heiti)', 'text', 1], ['haed', 'Hæð', 'text'], ['leigutaki', 'Leigutaki', 'text'], ['tengilidur', 'Tengiliður', 'text'], ['simi', 'Sími', 'tel'], ['netfang', 'Netfang', 'email'],
      ['m2', 'Stærð m²', 'num'], ['notkun', 'Notkun', 'text'], ['samningur_til', 'Leigusamningur til', 'date'], ['ath', 'Athugasemd', 'textarea']] },
    lykill: { heiti: 'Lyklar og aðgangur', eitt: 'lykil', k: 'lyklar', panel: 'vs-lyklar', eign: true, fields: [
      ['merki', 'Merking / lyklanúmer', 'text', 1], ['tegund', 'Tegund', 'select', 0, ['Lykill', 'Aðallykill', 'Aðgangskort', 'Fjarstýring', 'Lyklabox']], ['fjoldi', 'Fjöldi', 'num'],
      ['hja', 'Hver hefur', 'text'], ['stadsetning', 'Geymslustaður', 'text'], ['ath', 'Athugasemd', 'textarea']] },
    maelir: { heiti: 'Orkumælar', eitt: 'mæli', k: 'orkumaelar', panel: 'vs-maelar', eign: true, mynd: true, fields: [
      ['tegund', 'Tegund', 'select', 1, ['Rafmagn', 'Heitt vatn', 'Kalt vatn', 'Varmi', 'Gas']], ['maelinr', 'Mælisnúmer', 'text'], ['stadsetning', 'Staðsetning', 'text'],
      ['eining', 'Eining', 'select', 0, ['kWh', 'm³', 'MWh', 'tonn']], ['ath', 'Athugasemd', 'textarea']] },
    alestur: { heiti: 'Álestur', eitt: 'álestur', k: 'orkumaelar', eign: false, mynd: true, fields: [
      ['dags', 'Dagsetning', 'date', 1], ['gildi', 'Staða mælis', 'num', 1], ['ath', 'Athugasemd', 'text']] },
    kostnadur: { heiti: 'Kostnaðaryfirlit', eitt: 'kostnað', k: 'kostnadur', panel: 'vs-kostnadur', eign: true, fields: [
      ['dags', 'Dagsetning', 'date', 1], ['upphaed', 'Upphæð kr. (með vsk)', 'num', 1], ['flokkur', 'Flokkur', 'select', 0, ['Viðhald', 'Rekstur', 'Skoðun', 'Búnaður', 'Verktaki', 'Annað']],
      ['lysing', 'Lýsing', 'text', 1], ['verktaki', 'Verktaki / seljandi', 'text']] },
  };

  /* ── Verktakar ── */
  function vtStada(r) {
    var g = r.gogn, t = dagar(g.tryggingar_til), s = dagar(g.samningur_til), out = [];
    if (g.tryggingar_til) out.push(t < 0 ? '<span class="kst vantar">Tryggingar útrunnar ' + esc(fmtDate(g.tryggingar_til)) + '</span>' : t <= 60 ? '<span class="kst til">Tryggingar til ' + esc(fmtDate(g.tryggingar_til)) + '</span>' : '<span class="kst okkar">Tryggingar í gildi</span>');
    else out.push('<span class="kst oskrad">Tryggingar óskráðar</span>');
    if (g.samningur_til) out.push(s < 0 ? '<span class="kst vantar">Samningur rann út</span>' : s <= 60 ? '<span class="kst til">Samningur til ' + esc(fmtDate(g.samningur_til)) + '</span>' : '');
    return out.join('');
  }
  function verktakarHtml() {
    var L = skrar('verktaki').slice().sort(function (a, c) { return String(a.gogn.nafn || '').localeCompare(String(c.gogn.nafn || ''), 'is'); });
    var seint = L.filter(function (r) { var t = dagar(r.gogn.tryggingar_til); return t != null && t < 0; }).length;
    return '<div class="egp-h"><b>Verktakaskrá</b><span>' + L.length + (seint ? ' · <i class="vb-seint">' + seint + ' útrunnar tryggingar</i>' : '') + '</span></div>' +
      (L.length ? L.map(function (r) { var g = r.gogn; return '<div class="egp-r vb-r"><div class="egt"><b>' + esc(g.nafn) + (g.fag ? ' <small class="vb-fag">' + esc(g.fag) + '</small>' : '') + '</b><span>' +
        [g.tengilidur, g.simi ? '<a href="tel:' + esc(g.simi) + '">' + esc(g.simi) + '</a>' : '', g.netfang ? '<a href="mailto:' + esc(g.netfang) + '">' + esc(g.netfang) + '</a>' : '', g.sla_klst ? 'SLA ' + esc(g.sla_klst) + ' klst' : ''].filter(Boolean).join(' · ') + '</span><div class="vb-chips">' + vtStada(r) + '</div></div>' +
        '<button type="button" class="kbtn sm" data-sr-edit="' + r.id + '" aria-label="Breyta" title="Breyta">' + BLY + '</button></div>'; }).join('')
        : '<div class="egp-e">Skráðu verktakana sem sinna eignunum: fag, tengilið, viðbragðstíma og hvenær tryggingaskírteini og samningur renna út — áminning kemur í dagatalið og vikupóstinn.</div>') +
      '<div class="vs-dl"><button type="button" class="gbtn sm" data-sr-new="verktaki">' + ic('plus', 2.2) + 'Nýr verktaki</button>' + (L.length ? '<button type="button" class="kbtn sm" data-sr-csv="verktaki">' + ic('pdf', 1.8) + 'CSV</button>' : '') + '</div>';
  }

  /* ── Rými og leigutakar ── */
  function rymiRod(r) {
    var g = r.gogn, s = dagar(g.samningur_til);
    return '<div class="egp-r vb-r"><div class="egt"><b>' + esc(g.heiti) + (g.haed ? ' <small class="vb-fag">' + esc(g.haed) + '</small>' : '') + '</b><span>' +
      [g.leigutaki ? '<b>' + esc(g.leigutaki) + '</b>' : '<i>laust</i>', g.m2 ? tala(g.m2) + ' m²' : '', g.notkun, g.tengilidur, g.simi ? '<a href="tel:' + esc(g.simi) + '">' + esc(g.simi) + '</a>' : ''].filter(Boolean).join(' · ') +
      (g.samningur_til ? ' · <span class="' + (s < 0 ? 'vb-seint' : s <= 90 ? 'vb-brad' : '') + '">samningur til ' + esc(fmtDate(g.samningur_til)) + '</span>' : '') + '</span></div>' +
      '<button type="button" class="kbtn sm" data-sr-edit="' + r.id + '" aria-label="Breyta" title="Breyta">' + BLY + '</button></div>';
  }
  function rymiHtml() {
    var L = skrar('rymi'), byE = {};
    L.forEach(function (r) { (byE[r.fid] = byE[r.fid] || []).push(r); });
    var m2 = L.reduce(function (s, r) { return s + (+r.gogn.m2 || 0); }, 0), leigut = {}; L.forEach(function (r) { if (r.gogn.leigutaki) leigut[r.gogn.leigutaki.toLowerCase()] = 1; });
    return '<div class="egp-h"><b>Rými og leigutakar</b><span>' + L.length + ' rými · ' + Object.keys(leigut).length + ' leigutakar' + (m2 ? ' · ' + tala(Math.round(m2)) + ' m²' : '') + '</span></div>' +
      (L.length ? Object.keys(byE).map(function (fid) { var b = eignAfId(+fid); return '<div class="vb-eign">' + esc(b ? b.nafn : 'Eign') + '</div>' + byE[fid].sort(function (a, c) { return String(a.gogn.haed || '').localeCompare(String(c.gogn.haed || ''), 'is', { numeric: true }) || String(a.gogn.heiti || '').localeCompare(String(c.gogn.heiti || ''), 'is', { numeric: true }); }).map(rymiRod).join(''); }).join('')
        : '<div class="egp-e">Hver er hvar: rými per eign og hæð með leigutaka, tengilið, stærð og hvenær leigusamningur rennur út.</div>') +
      '<div class="vs-dl"><button type="button" class="gbtn sm" data-sr-new="rymi">' + ic('plus', 2.2) + 'Nýtt rými</button>' + (L.length ? '<button type="button" class="kbtn sm" data-sr-csv="rymi">' + ic('pdf', 1.8) + 'CSV</button>' : '') + '</div>';
  }

  /* ── Lyklar ── */
  function lykillRod(r) {
    var g = r.gogn;
    return '<div class="egp-r vb-r"><div class="egt"><b>' + esc(g.merki) + ' <small class="vb-fag">' + esc(g.tegund || 'Lykill') + (g.fjoldi ? ' × ' + esc(g.fjoldi) : '') + '</small></b><span>' + [g.hja ? 'hjá ' + esc(g.hja) : '', g.stadsetning, g.ath].filter(Boolean).join(' · ') + '</span></div>' +
      '<button type="button" class="kbtn sm" data-sr-edit="' + r.id + '" aria-label="Breyta" title="Breyta">' + BLY + '</button></div>';
  }
  function lyklarHtml() {
    var L = skrar('lykill'), byE = {}; L.forEach(function (r) { (byE[r.fid] = byE[r.fid] || []).push(r); });
    return '<div class="egp-h"><b>Lyklar og aðgangur</b><span>' + L.reduce(function (s, r) { return s + (+r.gogn.fjoldi || 1); }, 0) + ' lyklar</span></div>' +
      (L.length ? Object.keys(byE).map(function (fid) { var b = eignAfId(+fid); return '<div class="vb-eign">' + esc(b ? b.nafn : 'Eign') + '</div>' + byE[fid].map(lykillRod).join(''); }).join('')
        : '<div class="egp-e">Lyklaskrá per eign: merking, tegund, fjöldi, hver hefur lykilinn og hvar hann er geymdur.</div>') +
      '<div class="vs-dl"><button type="button" class="gbtn sm" data-sr-new="lykill">' + ic('plus', 2.2) + 'Nýr lykill</button></div>' +
      '<div class="egp-n">Skráðu aldrei hurðakóða eða lykilorð hér — skráin er lesanleg öllum sem hafa aðgang að gáttinni.</div>';
  }

  /* ── Orkumælar ── */
  function alestrar(mid) { return skrar('alestur').filter(function (a) { return a.foreldri === mid; }).sort(function (a, c) { return String(a.gogn.dags || '').localeCompare(String(c.gogn.dags || '')); }); }
  function notkun(A) {
    if (A.length < 2) return null;
    var a = A[A.length - 2], c = A[A.length - 1], d = Math.max(1, (new Date(c.gogn.dags) - new Date(a.gogn.dags)) / 864e5), diff = (+c.gogn.gildi || 0) - (+a.gogn.gildi || 0);
    return { diff: diff, dagar: Math.round(d), aDag: diff / d };
  }
  function maelirRod(r, iEign) {
    var g = r.gogn, A = alestrar(r.id), s = A[A.length - 1], n = notkun(A), b = eignAfId(r.fid), ein = g.eining || '';
    var gamall = s ? dagar(s.gogn.dags) < -45 : true;
    return '<div class="egp-r vb-r"><div class="egt"><b>' + esc(g.tegund || 'Mælir') + (g.maelinr ? ' <small class="vb-fag">' + esc(g.maelinr) + '</small>' : '') + '</b><span>' + [iEign ? '' : (b ? b.nafn : ''), g.stadsetning].filter(Boolean).join(' · ') + '</span>' +
      '<div class="vb-chips">' + (s ? '<span class="kst ' + (gamall ? 'til' : 'okkar') + '">' + esc(tala(s.gogn.gildi)) + ' ' + esc(ein) + ' · ' + esc(fmtDate(s.gogn.dags)) + '</span>' : '<span class="kst oskrad">Enginn álestur</span>') +
      (n ? '<span class="kst ekki">' + esc(tala(Math.round(n.diff * 10) / 10)) + ' ' + esc(ein) + ' á ' + n.dagar + ' dögum</span>' : '') + (s && s.mynd ? '<a class="vb-th" href="' + esc(s.mynd) + '" target="_blank" rel="noopener"><img src="' + esc(s.mynd) + '" alt=""></a>' : '') + '</div></div>' +
      '<button type="button" class="gbtn sm" data-sr-alestur="' + r.id + '">' + ic('plus', 2.2) + 'Álestur</button><button type="button" class="kbtn sm" data-sr-edit="' + r.id + '" aria-label="Breyta" title="Breyta">' + BLY + '</button></div>';
  }
  function maelarHtml() {
    var L = skrar('maelir'), A = skrar('alestur');
    return '<div class="egp-h"><b>Orkumælar</b><span>' + L.length + ' mælar · ' + A.length + ' álestrar</span></div>' +
      (L.length ? L.map(function (r) { return maelirRod(r, false); }).join('') : '<div class="egp-e">Skráðu mælana (rafmagn, heitt og kalt vatn, varmi) og lestu af þeim með mynd — notkunin milli álestra reiknast sjálf og allt fer í CSV fyrir ESG-uppgjör.</div>') +
      '<div class="vs-dl"><button type="button" class="gbtn sm" data-sr-new="maelir">' + ic('plus', 2.2) + 'Nýr mælir</button>' + (A.length ? '<button type="button" class="kbtn sm" data-sr-csv="alestur">' + ic('pdf', 1.8) + 'Álestrar (CSV)</button>' : '') + '</div>';
  }

  /* ── Kostnaður ── */
  function arUr(x) { var m = /^(\d{4})/.exec(String(x || '')); return m ? +m[1] : null; }
  function kostnadurPerEign() {
    var nuAr = new Date().getFullYear(), ar = [nuAr - 2, nuAr - 1, nuAr], byE = {};
    var setja = function (nafn, fid, a, u, hvadan) { if (!a || !isFinite(+u)) return; var key = fid != null ? 'f' + fid : 'n' + nafn; var e = byE[key] = byE[key] || { nafn: nafn, fid: fid, ar: {}, okkar: 0, eigin: 0 }; e.ar[a] = (e.ar[a] || 0) + (+u); e[hvadan] += +u; };
    (data().invoices || []).forEach(function (i) { var b = allarEignir().filter(function (x) { return x.nafn === i.bygging; })[0]; setja(i.bygging || 'Ótilgreint', b ? b.id : null, arUr(i.dags) || i.ar, i.upphaed, 'okkar'); });
    skrar('kostnadur').forEach(function (r) { var b = eignAfId(r.fid); setja(b ? b.nafn : 'Ótilgreint', r.fid, arUr(r.gogn.dags), r.gogn.upphaed, 'eigin'); });
    var L = Object.keys(byE).map(function (k) { return byE[k]; }).sort(function (a, c) { return a.nafn.localeCompare(c.nafn, 'is'); });
    L.forEach(function (e) { var f = [e.ar[ar[0]], e.ar[ar[1]]].filter(function (x) { return x > 0; }); e.aetlun = f.length ? Math.round(f.reduce(function (s, x) { return s + x; }, 0) / f.length * 1.04) : (e.ar[nuAr] ? Math.round(e.ar[nuAr] * 1.04) : 0); });
    return { ar: ar, L: L };
  }
  function kostnadurHtml(b) {
    var K = kostnadurPerEign(), L = b ? K.L.filter(function (e) { return e.fid === b.id || e.nafn === b.nafn; }) : K.L, ar = K.ar;
    var sum = function (a) { return L.reduce(function (s, e) { return s + (a === 'aetlun' ? e.aetlun : (e.ar[a] || 0)); }, 0); };
    var F = skrar('kostnadur').filter(function (r) { return !b || r.fid === b.id; }).sort(function (a, c) { return String(c.gogn.dags || '').localeCompare(String(a.gogn.dags || '')); });
    return (b ? '' : '<div class="egp-h"><b>Kostnaðaryfirlit</b><span>' + L.length + ' eignir · ' + fmtKr(sum(ar[2])) + ' á þessu ári</span></div>') +
      (L.length ? '<div class="vb-tw"><table class="vb-t"><thead><tr><th>Eign</th><th>' + ar[0] + '</th><th>' + ar[1] + '</th><th>' + ar[2] + '</th><th>Áætlun ' + (ar[2] + 1) + '</th></tr></thead><tbody>' +
        L.map(function (e) { return '<tr><td>' + esc(e.nafn) + '</td><td>' + (e.ar[ar[0]] ? fmtKr(e.ar[ar[0]]) : '—') + '</td><td>' + (e.ar[ar[1]] ? fmtKr(e.ar[ar[1]]) : '—') + '</td><td><b>' + (e.ar[ar[2]] ? fmtKr(e.ar[ar[2]]) : '—') + '</b></td><td>' + (e.aetlun ? fmtKr(e.aetlun) : '—') + '</td></tr>'; }).join('') +
        (L.length > 1 ? '<tr class="vb-sum"><td>Samtals</td><td>' + fmtKr(sum(ar[0])) + '</td><td>' + fmtKr(sum(ar[1])) + '</td><td><b>' + fmtKr(sum(ar[2])) + '</b></td><td>' + fmtKr(sum('aetlun')) + '</td></tr>' : '') + '</tbody></table></div>'
        : '<div class="egp-e">Reikningar Slökkvitækja ehf. birtast hér sjálfkrafa per eign og ár. Skráðu eigin kostnað (aðra verktaka, búnað, rekstur) til að fá heildarmyndina og áætlun næsta árs.</div>') +
      (F.length ? '<div class="vb-eign">Eigin færslur</div>' + F.slice(0, b ? 6 : 10).map(function (r) { var g = r.gogn, e0 = eignAfId(r.fid); return '<div class="egp-r vb-r"><span class="egd"><b>' + esc(fmtDate(g.dags).slice(0, 2)) + '</b>' + esc(fmtDate(g.dags).slice(3, 5)) + '/' + esc(String(g.dags || '').slice(2, 4)) + '</span><div class="egt"><b>' + esc(g.lysing) + '</b><span>' + [b ? '' : (e0 ? e0.nafn : ''), g.flokkur, g.verktaki].filter(Boolean).join(' · ') + '</span></div><span class="vb-kr">' + fmtKr(g.upphaed) + '</span><button type="button" class="kbtn sm" data-sr-edit="' + r.id + '" aria-label="Breyta" title="Breyta">' + BLY + '</button></div>'; }).join('') : '') +
      '<div class="vs-dl"><button type="button" class="gbtn sm" data-sr-new="kostnadur"' + (b ? ' data-sr-fid="' + b.id + '"' : '') + '>' + ic('plus', 2.2) + 'Skrá kostnað</button>' + (L.length && !b ? '<button type="button" class="kbtn sm" data-sr-csv="kostnadur">' + ic('pdf', 1.8) + 'CSV</button>' : '') + '</div>' +
      (b ? '' : '<div class="egp-n">Reikningar okkar koma úr skjalasafninu (upphæð með vsk þegar hún er skráð). Áætlun = meðaltal tveggja síðustu ára + 4 %.</div>');
  }

  /* ── Vinnusvæðið og eignasíðan ── */
  function render(syna) {
    if (!st().data) return;
    if (st().demo && !data().skrar) demo();
    if (syna('vs-verktakar', 'verktakar')) $('#vs-verktakar').innerHTML = verktakarHtml();
    if (syna('vs-rymi', 'rymi')) $('#vs-rymi').innerHTML = rymiHtml();
    if (syna('vs-lyklar', 'lyklar')) $('#vs-lyklar').innerHTML = lyklarHtml();
    if (syna('vs-maelar', 'orkumaelar')) $('#vs-maelar').innerHTML = maelarHtml();
    if (syna('vs-kostnadur', 'kostnadur')) $('#vs-kostnadur').innerHTML = kostnadurHtml(null);
  }
  function eignHtml(b) {
    if (!b || b.id == null || !st().data) return '';
    var h = '';
    if (on('rymi')) { var R = skrar('rymi').filter(function (r) { return r.fid === b.id; }); h += '<section class="dsec"><h4>Rými og leigutakar <span class="cnt">' + (R.length ? R.length + ' rými' : '') + '</span></h4><div class="dpanel">' + (R.length ? R.map(rymiRod).join('') : '<div class="dempty">Engin rými skráð.</div>') + '<div class="vs-dl"><button type="button" class="kbtn sm" data-sr-new="rymi" data-sr-fid="' + b.id + '">' + ic('plus', 2.2) + 'Nýtt rými</button></div></div></section>'; }
    if (on('lyklar')) { var K = skrar('lykill').filter(function (r) { return r.fid === b.id; }); h += '<section class="dsec"><h4>Lyklar <span class="cnt">' + (K.length ? K.length : '') + '</span></h4><div class="dpanel">' + (K.length ? K.map(lykillRod).join('') : '<div class="dempty">Engir lyklar skráðir.</div>') + '<div class="vs-dl"><button type="button" class="kbtn sm" data-sr-new="lykill" data-sr-fid="' + b.id + '">' + ic('plus', 2.2) + 'Nýr lykill</button></div></div></section>'; }
    if (on('orkumaelar')) { var Mm = skrar('maelir').filter(function (r) { return r.fid === b.id; }); h += '<section class="dsec"><h4>Orkumælar <span class="cnt">' + (Mm.length ? Mm.length : '') + '</span></h4><div class="dpanel">' + (Mm.length ? Mm.map(function (r) { return maelirRod(r, true); }).join('') : '<div class="dempty">Engir mælar skráðir.</div>') + '<div class="vs-dl"><button type="button" class="kbtn sm" data-sr-new="maelir" data-sr-fid="' + b.id + '">' + ic('plus', 2.2) + 'Nýr mælir</button></div></div></section>'; }
    if (on('kostnadur')) h += '<section class="dsec"><h4>Kostnaður</h4><div class="dpanel">' + kostnadurHtml(b) + '</div></section>';
    return h;
  }
  // Dagatal: tryggingar/samningar verktaka, leigusamningar, álestur sem er orðinn 45+ daga gamall (sýnt á 1. degi mánaðar)
  function atburdir(y, m) {
    var out = [], d0 = new Date();
    if (on('verktakar')) skrar('verktaki').forEach(function (r) {
      [['tryggingar_til', 'Tryggingaskírteini rennur út'], ['samningur_til', 'Verktakasamningur rennur út']].forEach(function (p) {
        var d = r.gogn[p[0]] ? new Date(r.gogn[p[0]] + 'T00:00:00') : null;
        if (d && !isNaN(d) && d.getFullYear() === y && d.getMonth() === m) out.push({ dagur: d.getDate(), teg: 'verktaki', heiti: p[1] + ': ' + (r.gogn.nafn || ''), eign: r.gogn.fag || '', seint: d < d0 });
      });
    });
    if (on('rymi')) skrar('rymi').forEach(function (r) {
      var d = r.gogn.samningur_til ? new Date(r.gogn.samningur_til + 'T00:00:00') : null, b = eignAfId(r.fid);
      if (d && !isNaN(d) && d.getFullYear() === y && d.getMonth() === m) out.push({ dagur: d.getDate(), teg: 'leiga', heiti: 'Leigusamningur rennur út: ' + (r.gogn.heiti || '') + (r.gogn.leigutaki ? ' — ' + r.gogn.leigutaki : ''), eign: b ? b.nafn : '', fid: r.fid, seint: d < d0 });
    });
    return out;
  }
  function leit(n) {
    var out = [], hit = function (s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').indexOf(n) > -1; };
    (data().skrar || []).forEach(function (r) {
      var g = r.gogn, sp = SPEC[r.tegund]; if (!sp || !on(sp.k) || r.tegund === 'alestur') return;
      var t = g.nafn || g.heiti || g.merki || g.lysing || (g.tegund ? g.tegund + (g.maelinr ? ' ' + g.maelinr : '') : '');
      if ([t, g.leigutaki, g.tengilidur, g.fag, g.hja, g.verktaki, g.maelinr, g.stadsetning].some(hit)) { var b = eignAfId(r.fid); out.push({ h: sp.heiti.split(' ')[0], t: t, s: (b ? b.nafn + ' · ' : '') + (g.leigutaki || g.fag || g.hja || g.flokkur || ''), a: 'tab', id: 'vinnusvaedi' }); }
    });
    return out;
  }

  /* ── Glugginn: einn fyrir allar tegundir, byggður úr SPEC ── */
  var sr = { teg: null, id: null, foreldri: null, mynd: null };
  function srInput(f, v) {
    var k = f[0], h = f[1], t = f[2], req = f[3] ? ' required' : '', val = v == null ? '' : String(v);
    if (t === 'select') return '<label class="flabel" for="sr-' + k + '">' + esc(h) + '</label><select class="svc-in" id="sr-' + k + '" data-sr-f="' + k + '"' + req + '>' + (f[3] ? '' : '<option value="">—</option>') + f[4].map(function (o) { return '<option' + (o === val ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
    if (t === 'textarea') return '<div class="sr-span"><label class="flabel" for="sr-' + k + '">' + esc(h) + '</label><textarea id="sr-' + k + '" data-sr-f="' + k + '" rows="2" maxlength="400">' + esc(val) + '</textarea></div>';
    var typ = t === 'num' ? 'number" step="any' : t === 'date' ? 'date' : t === 'tel' ? 'tel' : t === 'email' ? 'email' : 'text';
    return '<label class="flabel" for="sr-' + k + '">' + esc(h) + '</label><input class="svc-in" id="sr-' + k + '" data-sr-f="' + k + '" type="' + typ + '" value="' + esc(val) + '" maxlength="400" autocomplete="off"' + req + '>';
  }
  function opna(teg, r, fid, foreldri) {
    var sp = SPEC[teg]; if (!sp) return;
    sr = { teg: teg, id: r ? r.id : null, foreldri: foreldri || (r ? r.foreldri : null), mynd: null };
    var g = r ? r.gogn : {}, L = allarEignir(), m = $('#sr-modal');
    var eignSel = sp.eign ? '<label class="flabel" for="sr-eign">Eign</label><select class="svc-in" id="sr-eign" required>' + L.map(function (x) { return '<option value="' + x.id + '"' + ((r ? r.fid : fid) === x.id ? ' selected' : '') + '>' + esc(x.nafn) + '</option>'; }).join('') + '</select>' : '';
    var und = '';
    if (teg === 'alestur') { var mm = skrar('maelir').filter(function (x) { return x.id === sr.foreldri; })[0], b0 = mm ? eignAfId(mm.fid) : null; und = (mm ? (mm.gogn.tegund || 'Mælir') + (mm.gogn.maelinr ? ' ' + mm.gogn.maelinr : '') : '') + (b0 ? ' · ' + b0.nafn : ''); if (!r) g = { dags: idag() }; }
    $('#sr-h').textContent = (r ? 'Breyta — ' : 'Skrá ') + sp.eitt;
    $('#sr-sub').textContent = und || sp.heiti;
    $('#sr-fields').innerHTML = eignSel + sp.fields.map(function (f) { return srInput(f, g[f[0]]); }).join('');
    $('#sr-mynd-wrap').classList.toggle('hidden', !sp.mynd);
    $('#sr-prev').innerHTML = r && r.mynd ? '<img src="' + esc(r.mynd) + '" alt="">' : '';
    $('#sr-mynd').value = '';
    $('#sr-eyda').classList.toggle('hidden', !r);
    m.classList.remove('hidden'); document.body.style.overflow = 'hidden';
    setTimeout(function () { var f = $('#sr-fields [data-sr-f]'); if (f) f.focus(); }, 40);
  }
  function loka() { $('#sr-modal').classList.add('hidden'); document.body.style.overflow = ''; }
  function endurteikna() {
    if (window.GattVinnusvaedi) GattVinnusvaedi.render();
    var b = G().drB(), dr = $('#drawer');
    if (b && dr && !dr.classList.contains('hidden')) { var i = (data().buildings || []).indexOf(b), j = (data().eignir_utan || []).indexOf(b); if (i > -1) G().openDrawer(i); else if (j > -1) G().openUtan(j); }
  }
  function senda(body) {
    if (st().demo) {
      var L = data().skrar = data().skrar || [];
      if (body.action === 'skra_add') L.push({ id: Date.now(), tegund: body.tegund, fid: body.site_id || null, foreldri: body.foreldri_id || null, gogn: body.gogn, mynd: body.mynd || null, dags: new Date().toISOString() });
      else if (body.action === 'skra_edit') L.forEach(function (x) { if (x.id === body.id) { x.gogn = body.gogn; if (body.site_id !== undefined) x.fid = body.site_id; if (body.mynd) x.mynd = body.mynd; } });
      else if (body.action === 'skra_eyda') data().skrar = L.filter(function (x) { return x.id !== body.id && x.foreldri !== body.id; });
      endurteikna(); return Promise.resolve(true);
    }
    return api(body).then(function (res) {
      if (!res.ok) { toast((res.j && res.j.error) || 'Vistun tókst ekki'); return false; }
      data().skrar = res.j.skrar || []; endurteikna(); return true;
    });
  }
  function vista() {
    var sp = SPEC[sr.teg], gogn = {}, vantar = null;
    sp.fields.forEach(function (f) {
      var el = $('#sr-' + f[0]); if (!el) return;
      var v = el.value.trim();
      if (f[3] && !v) vantar = vantar || el;
      if (!v) return;
      gogn[f[0]] = f[2] === 'num' ? +v.replace(',', '.') : v;
    });
    if (vantar) { vantar.focus(); toast('Fylltu út ' + vantar.previousElementSibling.textContent.toLowerCase()); return; }
    var body = { action: sr.id ? 'skra_edit' : 'skra_add', tegund: sr.teg, id: sr.id, gogn: gogn };
    if (sp.eign) body.site_id = parseInt($('#sr-eign').value, 10) || null;
    if (sr.teg === 'alestur') body.foreldri_id = sr.foreldri;
    if (sr.mynd) body.mynd = sr.mynd.data;
    var btn = $('#sr-vista'); btn.disabled = true;
    senda(body).then(function (ok) { btn.disabled = false; if (ok) { loka(); toast(sr.id ? 'Vistað' : 'Skráð'); } });
  }
  function csv(teg) {
    var sp = SPEC[teg];
    if (teg === 'alestur') {
      var rows = [['Eign', 'Mælir', 'Mælisnúmer', 'Eining', 'Dagsetning', 'Staða', 'Notkun frá síðasta', 'Dagar', 'Athugasemd']];
      skrar('maelir').forEach(function (mm) { var b = eignAfId(mm.fid), A = alestrar(mm.id); A.forEach(function (a, i) { var p = A[i - 1]; rows.push([b ? b.nafn : '', mm.gogn.tegund || '', mm.gogn.maelinr || '', mm.gogn.eining || '', a.gogn.dags, tala(a.gogn.gildi), p ? tala(Math.round(((+a.gogn.gildi || 0) - (+p.gogn.gildi || 0)) * 100) / 100) : '', p ? Math.round((new Date(a.gogn.dags) - new Date(p.gogn.dags)) / 864e5) : '', a.gogn.ath || '']); }); });
      csvSkra('alestrar', rows); return;
    }
    var head = (sp.eign ? ['Eign'] : []).concat(sp.fields.map(function (f) { return f[1]; }));
    var rows2 = [head].concat(skrar(teg).map(function (r) { var b = eignAfId(r.fid); return (sp.eign ? [b ? b.nafn : ''] : []).concat(sp.fields.map(function (f) { var v = r.gogn[f[0]]; return f[2] === 'num' ? tala(v) : (v == null ? '' : v); })); }));
    if (teg === 'kostnadur') { (data().invoices || []).forEach(function (i) { rows2.push([i.bygging || '', i.dags || (i.ar ? i.ar + '-01-01' : ''), tala(i.upphaed), 'Slökkvitæki ehf.', 'Reikningur ' + (i.nr || ''), 'Slökkvitæki ehf.']); }); }
    csvSkra(teg === 'kostnadur' ? 'kostnadur' : sp.k, rows2);
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target, x; if (!t.closest) return;
    if ((x = t.closest('[data-sr-new]'))) { opna(x.getAttribute('data-sr-new'), null, +x.getAttribute('data-sr-fid') || null, null); return; }
    if ((x = t.closest('[data-sr-edit]'))) { var r = (data().skrar || []).filter(function (q) { return q.id === +x.getAttribute('data-sr-edit'); })[0]; if (r) opna(r.tegund, r, r.fid, r.foreldri); return; }
    if ((x = t.closest('[data-sr-alestur]'))) { opna('alestur', null, null, +x.getAttribute('data-sr-alestur')); return; }
    if ((x = t.closest('[data-sr-csv]'))) { csv(x.getAttribute('data-sr-csv')); return; }
    if (t.closest('#sr-close')) { loka(); return; }
    if (t.closest('#sr-eyda')) { if (sr.id && window.confirm('Eyða þessari línu' + (sr.teg === 'maelir' ? ' og öllum álestrum mælisins' : '') + '?')) senda({ action: 'skra_eyda', id: sr.id }).then(function (ok) { if (ok) { loka(); toast('Eytt'); } }); return; }
  });
  document.addEventListener('submit', function (ev) { if (ev.target && ev.target.id === 'sr-form') { ev.preventDefault(); vista(); } });
  document.addEventListener('change', function (ev) {
    if (ev.target && ev.target.id === 'sr-mynd') {
      var f = ev.target.files && ev.target.files[0]; if (!f) return;
      minnkaMynd(f, 1600).then(function (m) { sr.mynd = m; $('#sr-prev').innerHTML = '<img src="' + m.data + '" alt="">'; }).catch(function () { toast('Myndin opnaðist ekki'); });
    }
  });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !$('#sr-modal').classList.contains('hidden')) loka(); });

  /* ── Prufuhamur ── */
  function demo() {
    var B = data().buildings || [], f0 = B[0] ? B[0].id : null, f1 = B[1] ? B[1].id : f0, y = new Date().getFullYear(), d = function (m, dd) { return y + '-' + ('0' + m).slice(-2) + '-' + ('0' + dd).slice(-2); };
    var nu = new Date(), p = function (dagar) { return new Date(nu.getTime() + dagar * 864e5).toISOString().slice(0, 10); };
    data().skrar = [
      { id: 1, tegund: 'verktaki', fid: null, gogn: { nafn: 'Rafvirkjar Reykjavíkur ehf.', fag: 'Rafvirki', tengilidur: 'Jón Rafn', simi: '555 1234', sla_klst: 4, samningur_til: p(200), tryggingar_til: p(40) } },
      { id: 2, tegund: 'verktaki', fid: null, gogn: { nafn: 'Píparinn ehf.', fag: 'Pípari', simi: '555 2345', sla_klst: 24, tryggingar_til: p(-12) } },
      { id: 3, tegund: 'verktaki', fid: null, gogn: { nafn: 'Lyftutækni', fag: 'Lyftur', tengilidur: 'Anna', netfang: 'anna@lyftutaekni.is', sla_klst: 2, samningur_til: p(400), tryggingar_til: p(300) } },
      { id: 11, tegund: 'rymi', fid: f0, gogn: { heiti: '101', haed: '1. hæð', leigutaki: 'Kaffihúsið Krummi', tengilidur: 'Sigga', simi: '555 7777', m2: 142, notkun: 'Veitingar', samningur_til: p(60) } },
      { id: 12, tegund: 'rymi', fid: f0, gogn: { heiti: '201', haed: '2. hæð', leigutaki: 'Lögfræðistofan Lind', m2: 310, notkun: 'Skrifstofur', samningur_til: p(700) } },
      { id: 13, tegund: 'rymi', fid: f0, gogn: { heiti: '202', haed: '2. hæð', m2: 85, notkun: 'Skrifstofa' } },
      { id: 14, tegund: 'rymi', fid: f1, gogn: { heiti: 'Verslun', haed: 'Jarðhæð', leigutaki: 'Blómabúðin', m2: 220, notkun: 'Verslun' } },
      { id: 21, tegund: 'lykill', fid: f0, gogn: { merki: 'A-1', tegund: 'Aðallykill', fjoldi: 2, hja: 'Húsvörður', stadsetning: 'Lyklaskápur, kjallari' } },
      { id: 22, tegund: 'lykill', fid: f0, gogn: { merki: 'T-12', tegund: 'Lykill', fjoldi: 1, hja: 'Slökkvitæki ehf.', stadsetning: 'Tæknirými' } },
      { id: 23, tegund: 'lykill', fid: f1, gogn: { merki: 'Kort 7', tegund: 'Aðgangskort', fjoldi: 4, hja: 'Ræsting' } },
      { id: 31, tegund: 'maelir', fid: f0, gogn: { tegund: 'Rafmagn', maelinr: 'R-88213', stadsetning: 'Tæknirými kjallara', eining: 'kWh' } },
      { id: 32, tegund: 'maelir', fid: f0, gogn: { tegund: 'Heitt vatn', maelinr: 'HV-4471', stadsetning: 'Inntak', eining: 'm³' } },
      { id: 41, tegund: 'alestur', fid: f0, foreldri: 31, gogn: { dags: d(Math.max(1, nu.getMonth() - 1), 1), gildi: 184210 } },
      { id: 42, tegund: 'alestur', fid: f0, foreldri: 31, gogn: { dags: d(nu.getMonth() + 1, 1), gildi: 188940 } },
      { id: 43, tegund: 'alestur', fid: f0, foreldri: 32, gogn: { dags: d(nu.getMonth() + 1, 1), gildi: 3120.5 } },
      { id: 51, tegund: 'kostnadur', fid: f0, gogn: { dags: d(3, 14), upphaed: 186000, flokkur: 'Verktaki', lysing: 'Lagfæring á rafmagnstöflu', verktaki: 'Rafvirkjar Reykjavíkur ehf.' } },
      { id: 52, tegund: 'kostnadur', fid: f0, gogn: { dags: (y - 1) + '-11-02', upphaed: 420000, flokkur: 'Viðhald', lysing: 'Þakviðgerð', verktaki: 'Smiðurinn' } },
      { id: 53, tegund: 'kostnadur', fid: f1, gogn: { dags: d(5, 20), upphaed: 64000, flokkur: 'Búnaður', lysing: 'Ný neyðarljós (6 stk)', verktaki: 'Rafvirkjar Reykjavíkur ehf.' } },
    ];
  }

  window.GattVidbot = { render: render, eignHtml: eignHtml, atburdir: atburdir, leit: leit, opna: opna };
})();
