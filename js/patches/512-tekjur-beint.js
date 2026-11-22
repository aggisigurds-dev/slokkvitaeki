// 512 — Tekjur í beinni (lota 4, 17.11.2026, Agnar: „finna út tekjur og hagnað nokkuð svona live").
// Litlar flísar efst á Tekjum (#view-income) og Bókhaldi (#view-bokhalds-yfirlit): hvort félag í sinni röð, án VSK —
// mánuður til dags, ár til dags, síðasti mánuður, „í pípunni" og hagnaður. Tölurnar koma úr /api/tekjur-beint
// (reglurnar í netlify/functions/_tekjur.cjs). Ómælt er sagt ómælt — aldrei 0. Hagnaður reiknast þegar launakostnaður
// og annar kostnaður á mánuði eru slegin inn (smelltu á Hagnaður-flísina).
// Engin MutationObserver: tekjur.js og 11-bokhalds-yfirlit.js kalla TekjurBeint.mount(el) þegar þau teikna.
(function () {
  'use strict';
  var MAN = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  var _d = null, _at = 0, _bid = null, _villa = null, _opid = {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function kr(n) {
    if (n == null) return 'ómælt';
    var neg = n < 0, s = String(Math.abs(Math.round(n))), p = [];
    while (s.length > 3) { p.unshift(s.slice(-3)); s = s.slice(0, -3); }
    p.unshift(s);
    return (neg ? '−' : '') + p.join('.') + ' kr';
  }
  function mkr(n) { return n == null ? 'ómælt' : (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2).replace('.', ',') + ' m' : kr(n)); }
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

  // Ljóst undirlag svo heiti og neðsta línan séu læsileg á hvaða þema sem er (dökkt þemabakgrunn gerði þau ósýnileg, 17.11.2026).
  var CSS = '.tkb{margin:0 0 12px;font-family:inherit;background:rgba(248,250,252,.92);border:1px solid rgba(15,23,42,.08);border-radius:12px;padding:8px 8px 6px;color:#0f172a}' +
    '.tkb-rod{display:flex;flex-wrap:wrap;gap:6px;align-items:stretch;margin-bottom:6px}' +
    '.tkb-fel{flex:0 0 92px;display:flex;flex-direction:column;justify-content:center;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#334155}' +
    '.tkb-fel small{font-weight:600;letter-spacing:0;text-transform:none;color:#94a3b8;font-size:10px}' +
    '.tkb-fl{flex:1 1 118px;min-width:118px;max-width:190px;border-radius:10px;padding:6px 9px;background:linear-gradient(180deg,#fff,#f1f4f8);border:1px solid rgba(15,23,42,.08);box-shadow:inset 0 1px 0 #fff,0 2px 6px -4px rgba(15,23,42,.25)}' +
    '.tkb-fl b{display:block;font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#8a93a5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.tkb-fl span{display:block;font-family:"JetBrains Mono",ui-monospace,monospace;font-size:15px;font-weight:700;color:#11141c;white-space:nowrap}' +
    '.tkb-fl i{display:block;font-style:normal;font-size:10px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '.tkb-fl.tkb-pipa span{color:#b45309}.tkb-fl.tkb-omaelt span{color:#b45309;font-family:inherit;font-size:13px}' +
    '.tkb-fl.tkb-unnid{border-color:rgba(15,118,110,.35);background:linear-gradient(180deg,#f3fbfa,#e6f5f3)}.tkb-fl.tkb-unnid span{color:#0f766e}' +
    '.tkb-fl.tkb-smell{cursor:pointer}.tkb-fl.tkb-smell:hover{border-color:#94a3b8}' +
    '.tkb-form{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px 98px;font-size:11px;color:#475569}' +
    '.tkb-form input{width:120px;padding:4px 6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px}' +
    '.tkb-form button{padding:4px 10px;border-radius:6px;border:1px solid #1c3d8c;background:#2f5fe0;color:#fff;font-weight:700;font-size:11px;cursor:pointer}' +
    '.tkb-nedst{font-size:10px;color:#64748b}.tkb-nedst a{color:#475569;cursor:pointer;text-decoration:underline}' +
    '@media (max-width:600px){.tkb-fel{flex-basis:100%}.tkb-form{margin-left:0}.tkb-fl{max-width:none}}';
  function stilar() {
    if (document.getElementById('tkb-css')) return;
    var st = document.createElement('style'); st.id = 'tkb-css'; st.textContent = CSS; document.head.appendChild(st);
  }

  function fl(lbl, val, sub, cls, attr) {
    if (val === 'ómælt' && !/tkb-omaelt/.test(cls || '')) cls = (cls ? cls + ' ' : '') + 'tkb-omaelt';
    return '<div class="tkb-fl' + (cls ? ' ' + cls : '') + '"' + (attr || '') + '><b title="' + esc(lbl) + '">' + esc(lbl) + '</b><span>' + esc(val) + '</span>' + (sub ? '<i title="' + esc(sub) + '">' + esc(sub) + '</i>' : '') + '</div>';
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

  function teikna(el, d) {
    var s = d.slokkvitaeki, b = d.brunaholf, fv = s.framlegd_voru && s.framlegd_voru.fyrri_manudur;
    var rodS = '<div class="tkb-rod"><div class="tkb-fel">Slökkvitæki<small>án VSK</small></div>' +
      fl(manNafn(s.manudur) + ' til dags', mkr(s.manudur_til_dags), s.omaelt || 'kredit dregið frá') +
      fl(s.manudur.slice(0, 4) + ' til dags', mkr(s.ar_til_dags), s.ar_fra === '2026-05' ? 'frá yfirtöku 04.05' : 'frá 1. jan') +
      fl(manNafn(s.fyrri_man), mkr(s.fyrri_manudur), 'heill mánuður') +
      fl('Í pípunni', mkr(s.pipa.kr_an_vsk), s.pipa.fjoldi + ' drög · ekki í tekjum', 'tkb-pipa') +
      (fv && fv.thak_pct != null ? fl('Framlegð vöru · ' + manNafn(s.fyrri_man), mkr(fv.framlegd), 'aðeins ' + String(fv.thak_pct).replace('.', ',') + ' % sölu með kostnaðarverð') : fl('Framlegð vöru', 'ómælt', 'kostnaðarverð vantar', 'tkb-omaelt')) +
      hagnFl('slokkvitaeki', s.hagnadur, s.fyrri_man) + '</div>' + (_opid.slokkvitaeki ? forsForm('slokkvitaeki', s.hagnadur) : '');
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
      hagnFl('brunaholf', b.hagnadur, b.fyrri_man) + '</div>' + (_opid.brunaholf ? forsForm('brunaholf', b.hagnadur) : '');
    var sk = d.skilgreining || {};
    var nedst = '<div class="tkb-nedst">Mælt ' + dags(d.maelt_at) + ' kl. ' + String(d.maelt_at || '').slice(11, 16) + ' · <a data-tkb-endur>↻ uppfæra</a> · <span title="' +
      esc('Slökkvitæki: ' + sk.slokkvitaeki + '\nBrunahólf: ' + sk.brunaholf + '\nHagnaður: ' + sk.hagnadur) + '">ⓘ hvernig er reiknað</span> · félögin eru aldrei lögð saman</div>';
    el.innerHTML = '<div class="tkb">' + rodS + rodB + nedst + '</div>';
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
    kall.then(function (j) { _d = j; _at = Date.now(); _opid[felag] = false; teikna(el, j); })
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
        var v = t.closest && t.closest('[data-tkb-vista]');
        if (v) { vista(el, v.getAttribute('data-tkb-vista')); return; }
        if (t.closest && t.closest('[data-tkb-endur]')) { mount(el, true); }
      });
    }
    if (_d) { try { teikna(el, _d); } catch (_) { _d = null; } }
    if (!_d) el.innerHTML = '<div class="tkb"><div class="tkb-nedst" style="font-size:12px">Sæki tekjur í beinni …</div></div>';
    saekja(!!fersk).then(function (d) { if (el.isConnected !== false) teikna(el, d); })
      .catch(function (e) { if (e && e.fela) { el.innerHTML = ''; return; } villa(el, _villa || (e && e.message) || String(e)); });
  }

  window.TekjurBeint = { mount: mount, _teikna: teikna, _kr: kr, _mkr: mkr };
})();
