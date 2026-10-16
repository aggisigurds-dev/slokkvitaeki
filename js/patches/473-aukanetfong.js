/* 473 — VIÐBÓTARNETFÖNG FÉLAGS (16.10.2026)
 *
 * Agnar: „Geturðu heimilað að ég geti sett inn viðbótar tölvupósta sem ég get sett inn sem hjálpar
 * við að tengja Samskipti — tengingarnar og póstsögu".
 *
 * Samskipti (286) les v_kunni_postur, sem tengir póst við félag eftir netföngunum í v_kunni_netfong.
 * Þar var aðeins EITT netfang á félag (fyrirtaeki.netfang / customers_base). Nú les viewið líka
 * samþykkta tengiliði með kennitölu félagsins (charlize_contacts — sama tafla og Tengiliðir-síðan,
 * sql/2026-10-16_v_kunni_netfong_vidbotarnetfong.sql). Mælt sama dag: Heimaleiga 0 → 46 póstar.
 *
 * Hér: silfurplata „+N" í Netfang-línu borðans. Smellur opnar stálspjald með netföngum félagsins:
 *   • hvert netfang segir hvort það TENGIST Samskiptum — lesið úr v_kunni_netfong sjálfu, ekki giskað
 *     (sameiginlegt netfang, lén umsjónaraðila eða ósamþykkt tengist ekki, og ástæðan stendur);
 *   • „Bæta við" skrifar um /api/tengilidir (brunaholf) — eina hurðin að töflunni (RLS án policies);
 *   • „Aftengja" tekur netfangið af félaginu.
 * Eftir breytingu sækir Samskipti-kortið strax ferskt (SamskiptiPanel.endurnyja).
 *
 * Platan teiknast í SAMA tifi og borðinn (462 SKREF, regla 5) — talan kemur síðar á sama hnút.
 * Engin staða í vafranum: listinn er á þjóninum, minnið hér er 60 s skyndiminni sem þjónninn endurhleður.
 */
(function () {
  'use strict';
  if (window.__aukanetfong473) return;
  window.__aukanetfong473 = true;

  var API = 'https://brunaholf.netlify.app/api/tengilidir';
  // Brunastál C — sömu tákn og 413 (afslaettir-c)
  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SANS = '"IBM Plex Sans",system-ui,sans-serif';
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  var SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ktTolur(kt) { var d = String(kt || '').replace(/\D/g, ''); return d.length === 10 ? d : ''; }
  function sb() { return window.DB && DB.sb; }

  function stilar() {
    if (document.getElementById('_anf-css')) return;
    var st = document.createElement('style'); st.id = '_anf-css';
    st.textContent = [
      // Platan í Netfang-línunni (PLATA í 413)
      '._anf-takki{display:inline-flex;align-items:center;justify-content:center;gap:4px;height:22px;min-width:28px;padding:0 7px;margin-left:8px;flex:none;',
      'border-radius:3px;border:1px solid rgba(20,24,34,.16);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12);',
      'font:700 10.5px/1 ' + MONO + ';letter-spacing:.04em;color:#1f2530;cursor:pointer;white-space:nowrap}',
      '._anf-takki:hover{filter:brightness(1.04)}._anf-takki:focus-visible{outline:2px solid #f0584c;outline-offset:1px}',
      '._anf-takki svg{width:11px;height:11px}',
      '._anf-tomt{color:#69717f!important;font-style:normal}',
      // Stálspjaldið (SPJALD + HAUS + RIVET í 413)
      '._anf-spjald{position:fixed;z-index:10050;width:min(420px,calc(100vw - 32px));background:#fff;border:1px solid #000;border-radius:12px;',
      'box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);overflow:hidden;font-family:' + SANS + ';color:#1f2530}',
      '._anf-haus{position:relative;background:' + METAL + ';min-height:46px;box-sizing:border-box;padding:5px 16px 5px 20px;display:flex;align-items:center;gap:8px;',
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.1);border-bottom:1px solid #000;color:#fff}',
      '._anf-haus::before,._anf-haus::after{content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;',
      'background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7)}',
      '._anf-haus::before{left:7px}._anf-haus::after{right:7px}',
      '._anf-titill{font:600 15px/1.2 ' + SANS + ';text-shadow:0 1px 1px rgba(0,0,0,.6);flex:1 1 auto;min-width:0}',
      '._anf-plata{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';',
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12);font:700 10.5px/1 ' + MONO + ';letter-spacing:.06em;text-transform:uppercase;color:#1f2530;white-space:nowrap;flex:none}',
      '._anf-plata i{width:7px;height:7px;border-radius:50%;display:inline-block;flex:none}',
      '._anf-loka{width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid #000;cursor:pointer;',
      'background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.14);color:#eef1f4;flex:none}',
      '._anf-loka svg{width:14px;height:14px}',
      '._anf-buk{padding:12px 14px 14px;display:flex;flex-direction:column;gap:8px;max-height:min(60vh,520px);overflow:auto}',
      '._anf-lina{background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);',
      'padding:8px 10px;display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:4px 8px;align-items:center;min-height:44px;box-sizing:border-box}',
      '._anf-addr{font:500 12.5px/1.3 ' + MONO + ';color:#141822;overflow-wrap:anywhere}',
      '._anf-skyr{grid-column:1/-1;font:400 11.5px/1.35 ' + SANS + ';color:#525b6b}',
      '._anf-skyr b{font-weight:600;color:#2b313c}',
      '._anf-btn{height:32px;padding:0 10px;border-radius:8px;cursor:pointer;font:600 12px/1 ' + SANS + ';white-space:nowrap;',
      'background:' + SILVER + ';border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530}',
      '._anf-btn:hover{filter:brightness(1.03)}._anf-btn[disabled]{opacity:.38;pointer-events:none}',
      '._anf-btn._anf-vista{height:40px;padding:0 16px;border:1px solid #000;background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);',
      'box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);color:#eef1f4}',
      '._anf-nytt{display:flex;gap:8px;align-items:center;margin-top:2px}',
      '._anf-reitur{flex:1 1 auto;min-width:0;height:40px;box-sizing:border-box;padding:0 12px;background:#eef1f6;border:1px solid rgba(20,24,34,.14);border-radius:8px;',
      'box-shadow:inset 0 2px 5px rgba(0,0,0,.18);font:400 13px/1 ' + MONO + ';color:#141822;outline:none}',
      '._anf-reitur:focus{border-color:#f0584c}',
      '._anf-merki{font:700 11px/1 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#3a4250;margin-top:4px}',
      '._anf-skyring{font:400 11.5px/1.45 ' + SANS + ';color:#525b6b}',
      '._anf-villa{font:500 12px/1.4 ' + SANS + ';color:#b42318;min-height:0}',
      '._anf-bidur{font:400 12px/1 ' + SANS + ';color:#69717f;height:44px;display:flex;align-items:center;padding:0 10px}',
      '@media (prefers-reduced-motion:no-preference){._anf-spjald{animation:_anf-inn .12s ease-out}}',
      '@keyframes _anf-inn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}',
    ].join('');
    (document.head || document.documentElement).appendChild(st);
  }

  var IKON = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    loka: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  };

  // ── Gögn ─────────────────────────────────────────────────────────────────────
  var _minni = {};   // kt-tölur → { t, contacts }  (60 s skyndiminni, þjónninn er heimildin)
  var _isokn = {};
  function saekja(kt, ferskt) {
    var k = ktTolur(kt); if (!k) return Promise.resolve(null);
    var m = _minni[k];
    if (!ferskt && m && Date.now() - m.t < 60000) return Promise.resolve(m.contacts);
    if (!ferskt && _isokn[k]) return _isokn[k];
    var p = fetch(API + '?kennitala=' + k, { cache: 'no-store' })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); })
      // Aðeins raðir ÞESSARAR kennitölu: eldra fall (fyrir 16.10.2026) hunsar ?kennitala og skilar öllum 453.
      .then(function (j) { var c = (Array.isArray(j.contacts) ? j.contacts : []).filter(function (x) { return ktTolur(x.kennitala) === k; }); _minni[k] = { t: Date.now(), contacts: c }; return c; })
      .finally(function () { delete _isokn[k]; });
    _isokn[k] = p;
    return p;
  }
  function post(body) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status)); return j; }); });
  }
  // Tengist netfangið Samskiptum ÞESSA félags? Svarið kemur úr viewinu sjálfu (via 'addr' eða lén).
  function tengingar(addrs, baseId) {
    var c = sb(); if (!c || !addrs.length) return Promise.resolve(null);
    var lenar = Array.from(new Set(addrs.map(function (a) { return a.split('@')[1] || ''; }).filter(Boolean)));
    return c.from('v_kunni_netfong').select('lykill,via,customer_base_id').in('lykill', addrs.concat(lenar))
      .then(function (r) {
        if (r.error) return null;
        var ut = {};
        addrs.forEach(function (a) {
          var bein = (r.data || []).find(function (x) { return x.via === 'addr' && x.lykill === a; });
          var len = (r.data || []).find(function (x) { return x.via === 'len' && x.lykill === (a.split('@')[1] || ''); });
          var hit = bein || len;
          ut[a] = { tengt: !!(hit && +hit.customer_base_id === +baseId), annad: !!(hit && +hit.customer_base_id !== +baseId), via: hit ? hit.via : null };
        });
        return ut;
      }, function () { return null; });
  }

  // ── Félagið á opna prófílnum ────────────────────────────────────────────────
  function felag() {
    var main = document.getElementById('companies-main'); if (!main) return null;
    var bn = main.querySelector(':scope > .co-banner'); if (!bn) return null;
    var b = main.querySelector('button[onclick^="Companies.openEdit"]');
    var m = b && String(b.getAttribute('onclick') || '').match(/openEdit\((\d+)\)/);
    if (!m) return null;
    var fid = +m[1];
    var c = ((window.Companies && Companies.list) || []).find(function (x) { return x && +x.id === fid; }) || {};
    var kt = c.kennitala || ((bn.querySelector('.co-banner-kt') || {}).textContent || '').replace(/^kt\.\s*/, '').slice(0, 11);
    return { fid: fid, kt: kt, nafn: c.nafn || '', netfang: String(c.netfang || '').trim().toLowerCase(), bn: bn, main: main };
  }

  function aukaFjoldi(contacts, adal) {
    return (contacts || []).filter(function (x) { return x.status === 'approved' && x.netfang && x.netfang !== adal; }).length;
  }
  function merkjaTakka(btn, n) {
    var txt = n > 0 ? '+' + n : '';
    var nyr = n > 0 ? '<span>' + txt + '</span>' : IKON.plus;
    if (btn.dataset.anfN !== String(n)) { btn.innerHTML = nyr; btn.dataset.anfN = String(n); }
    btn.title = n > 0 ? (n === 1 ? '1 netfang í viðbót' : n + ' netföng í viðbót') + ' — tengja pósta við félagið' : 'Bæta við netfangi — tengir pósta við félagið';
    btn.setAttribute('aria-label', btn.title);
  }

  // Platan teiknast strax (sama tif og borðinn); talan fyllist á sama hnút þegar svarið kemur.
  function setja() {
    stilar();
    var f = felag(); if (!f) return;
    var facts = f.main.querySelector('.co-banner-facts'); if (!facts) return;
    var span = Array.prototype.find.call(facts.children, function (s) { return s.querySelector && s.querySelector('a[href^="mailto"]'); });
    if (!span) {
      if (!ktTolur(f.kt)) return;   // ekkert netfang og engin kennitala — ekkert til að tengja á
      span = document.createElement('span');
      span.innerHTML = '✉ <a href="mailto:" class="_anf-tomt" data-anf-tomt="1">Ekkert skráð</a>';
      facts.appendChild(span);
      span.querySelector('a').addEventListener('click', function (e) { e.preventDefault(); var t = span.querySelector('._anf-takki'); if (t) t.click(); });
    }
    var btn = span.querySelector('._anf-takki');
    if (btn && btn.dataset.anfFid === String(f.fid)) return;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button'; btn.className = '_anf-takki';
      btn.setAttribute('aria-haspopup', 'dialog');
      btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); opna(btn); });
      span.appendChild(btn);
    }
    btn.dataset.anfFid = String(f.fid);
    merkjaTakka(btn, 0);
    if (!ktTolur(f.kt)) return;
    saekja(f.kt).then(function (c) {
      if (btn.isConnected && btn.dataset.anfFid === String(f.fid)) merkjaTakka(btn, aukaFjoldi(c, f.netfang));
    }, function () {});
  }

  // ── Stálspjaldið ─────────────────────────────────────────────────────────────
  var _opid = null;
  function loka() {
    if (!_opid) return;
    var o = _opid; _opid = null;
    document.removeEventListener('mousedown', o.uti, true);
    document.removeEventListener('keydown', o.esc, true);
    window.removeEventListener('resize', o.stadsetja);
    o.el.remove();
    if (o.btn && o.btn.isConnected) { o.btn.setAttribute('aria-expanded', 'false'); try { o.btn.focus({ preventScroll: true }); } catch (_) {} }
  }

  function opna(btn) {
    if (_opid && _opid.btn === btn) { loka(); return; }
    loka();
    var f = felag(); if (!f) return;
    var el = document.createElement('div');
    el.className = '_anf-spjald'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Netföng félagsins');
    el.innerHTML =
      '<div class="_anf-haus"><span class="_anf-titill">Netföng félagsins</span><span class="_anf-plata" data-anf-fjoldi>…</span>' +
      '<button type="button" class="_anf-loka" title="Loka" aria-label="Loka">' + IKON.loka + '</button></div>' +
      '<div class="_anf-buk">' +
        '<div data-anf-listi><div class="_anf-bidur">Sæki netföng…</div></div>' +
        '<div class="_anf-merki">Bæta við netfangi</div>' +
        '<div class="_anf-nytt"><input class="_anf-reitur" type="email" inputmode="email" autocomplete="off" spellcheck="false" placeholder="jon@felag.is" aria-label="Nýtt netfang">' +
          '<button type="button" class="_anf-btn _anf-vista">Vista</button></div>' +
        '<div class="_anf-villa" data-anf-villa role="status"></div>' +
        '<div class="_anf-skyring">Póstar frá og til netfanganna birtast í Samskiptum félagsins, allt aftur í tímann. ' +
          'Netfang sem er líka tengt öðru félagi tengist hvorugu, og netföng umsjónaraðila og banka tengjast eftir götu hússins, ekki hér. ' +
          'Sömu netföng sjást á Tengiliðir-síðunni.</div>' +
      '</div>';
    document.body.appendChild(el);
    var stadsetja = function () {
      if (!btn.isConnected) { loka(); return; }
      var r = btn.getBoundingClientRect(), w = el.offsetWidth, h = el.offsetHeight;
      var left = Math.max(16, Math.min(r.right - w, window.innerWidth - w - 16));
      var top = r.bottom + 6;
      if (top + h > window.innerHeight - 8 && r.top - h - 6 > 8) top = r.top - h - 6;
      el.style.left = Math.round(left) + 'px'; el.style.top = Math.round(Math.max(8, top)) + 'px';
    };
    var uti = function (e) { if (!el.contains(e.target) && e.target !== btn && !btn.contains(e.target) && !(e.target.closest && e.target.closest('.modal,.confirm-modal,[class*="confirm"]'))) loka(); };
    var escF = function (e) { if (e.key === 'Escape') { e.stopPropagation(); loka(); } };
    _opid = { el: el, btn: btn, uti: uti, esc: escF, stadsetja: stadsetja, f: f };
    btn.setAttribute('aria-expanded', 'true');
    stadsetja();
    document.addEventListener('mousedown', uti, true);
    document.addEventListener('keydown', escF, true);
    window.addEventListener('resize', stadsetja);
    el.querySelector('._anf-loka').addEventListener('click', loka);

    var reitur = el.querySelector('._anf-reitur'), vista = el.querySelector('._anf-vista'), villa = el.querySelector('[data-anf-villa]');
    reitur.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); vista.click(); } });
    // ALLTAF LEYFA VISTUN: takkinn er aldrei óvirkur nema á meðan vistað er; þjónninn segir til ef eitthvað vantar.
    vista.addEventListener('click', function () {
      var v = reitur.value.trim();
      if (!v) { villa.textContent = 'Skrifaðu netfang í reitinn.'; reitur.focus(); return; }
      villa.textContent = ''; vista.disabled = true; vista.textContent = 'Vista…';
      post({ action: 'add', netfang: v, kennitala: f.kt, fyrirtaeki: f.nafn })
        .then(function (j) {
          reitur.value = '';
          var addr = (j.contact && j.contact.netfang) || v.toLowerCase();
          toast(j.onnur && j.onnur.length
            ? addr + ' vistað — en það er líka tengt ' + j.onnur.map(function (o) { return o.fyrirtaeki || o.kennitala; }).join(', ') + ', svo póstar þess tengjast hvorugu'
            : addr + ' tengt — Samskipti uppfærast');
          return eftirBreytingu(f);
        })
        .catch(function (e) { villa.textContent = 'Vistaðist ekki: ' + ((e && e.message) || e); })
        .finally(function () { vista.disabled = false; vista.textContent = 'Vista'; });
    });
    teiknaLista(f, false);
    setTimeout(function () { try { reitur.focus({ preventScroll: true }); } catch (_) {} }, 0);
  }

  function eftirBreytingu(f) {
    try { if (window.SamskiptiPanel && SamskiptiPanel.endurnyja) SamskiptiPanel.endurnyja(f.fid); } catch (_) {}
    return teiknaLista(f, true).then(function (c) {
      var btn = document.querySelector('._anf-takki[data-anf-fid="' + f.fid + '"]');
      if (btn && c) merkjaTakka(btn, aukaFjoldi(c, f.netfang));
    });
  }

  var _baseId = {};
  function baseFyrir(fid) {
    if (_baseId[fid] !== undefined) return Promise.resolve(_baseId[fid]);
    var c = sb(); if (!c) return Promise.resolve(null);
    return c.from('fyrirtaeki').select('customer_base_id').eq('id', fid).maybeSingle()
      .then(function (r) { var b = r && r.data ? r.data.customer_base_id : null; if (!r.error) _baseId[fid] = b; return b; }, function () { return null; });
  }

  function teiknaLista(f, ferskt) {
    var o = _opid; if (!o || o.f.fid !== f.fid) return Promise.resolve(null);
    var host = o.el.querySelector('[data-anf-listi]'), plata = o.el.querySelector('[data-anf-fjoldi]');
    if (!ktTolur(f.kt)) {
      host.innerHTML = '<div class="_anf-lina"><span class="_anf-skyr">Félagið vantar kennitölu. Viðbótarnetföng tengjast á kennitölu — skráðu hana með Breyta.</span></div>';
      plata.textContent = '—';
      o.el.querySelector('._anf-vista').disabled = true;
      return Promise.resolve(null);
    }
    return Promise.all([saekja(f.kt, ferskt), baseFyrir(f.fid)]).then(function (res) {
      var contacts = res[0] || [], baseId = res[1];
      if (!_opid || _opid.el !== o.el) return contacts;
      var lina = [];
      if (f.netfang) lina.push({ adal: true, netfang: f.netfang });
      contacts.forEach(function (x) { if (x.netfang && x.netfang !== f.netfang) lina.push(x); });
      var alls = lina.length;
      plata.textContent = alls === 1 ? '1 netfang' : alls + ' netföng';
      if (!alls) { host.innerHTML = '<div class="_anf-lina"><span class="_anf-skyr">Ekkert netfang skráð á félagið.</span></div>'; return contacts; }
      return tengingar(lina.map(function (x) { return x.netfang; }), baseId).then(function (t) {
        if (!_opid || _opid.el !== o.el) return contacts;
        host.innerHTML = lina.map(function (x) { return linaHtml(x, t ? t[x.netfang] : undefined, baseId); }).join('');
        host.querySelectorAll('[data-anf-aftengja]').forEach(function (b) { b.addEventListener('click', function () { aftengja(f, +b.dataset.anfAftengja, b.dataset.anfAddr, b); }); });
        host.querySelectorAll('[data-anf-samthykkja]').forEach(function (b) { b.addEventListener('click', function () { samthykkja(f, +b.dataset.anfSamthykkja, b); }); });
        return contacts;
      });
    }, function (e) {
      if (_opid && _opid.el === o.el) host.innerHTML = '<div class="_anf-lina"><span class="_anf-skyr" style="color:#b42318">Náði ekki í netföngin: ' + esc((e && e.message) || e) + '</span></div>';
      return null;
    });
  }

  function linaHtml(x, t, baseId) {
    var plata, skyr = [];
    var tengt = t && t.tengt;
    if (x.adal) skyr.push('<b>Aðalnetfang</b> — breytist með Breyta');
    else if (x.source) skyr.push(esc(String(x.source).replace(/\s*\(\d{4}-\d{2}-\d{2}\)\s*$/, '')));
    if (x.heiti && !x.adal) skyr.unshift('<b>' + esc(x.heiti) + '</b>');
    if (x.status === 'pending') {
      plata = plataHtml('Bíður', '#845400');
      skyr.push('Bíður samþykkis — tengist ekki fyrr en það er samþykkt');
    } else if (tengt) {
      plata = plataHtml(t.via === 'len' ? 'Tengt · lén' : 'Tengt', '#0b6b3a');
    } else {
      plata = plataHtml('Tengist ekki', '#b42318');
      if (x.onnur && x.onnur.length) skyr.push('Líka tengt <b>' + esc(x.onnur.map(function (o) { return o.fyrirtaeki || o.kennitala; }).join(', ')) + '</b> — póstar þess tengjast hvorugu');
      else if (t && t.annad) skyr.push('Netfangið eða lénið tilheyrir öðru félagi');
      else if (baseId == null) skyr.push('Félagið er ekki tengt kúnnagrunni (customers_base) — póstsagan les ekki netföng þess');
      else if (t === undefined) skyr.push('Tenging ekki staðfest — reyndu aftur');
      // 16.10.2026 (mælt á lifandi Heimaleigu): aðalnetfangið er skráð á tveimur félögum (Heimaleiga +
      // Mannheimar) og fellur því úr viewinu — „sameiginlegt lén" eitt og sér var röng skýring þar.
      else skyr.push(x.adal
        ? 'Netfangið er líka skráð á öðru félagi (t.d. systurfélagi), svo pósturinn er ekki eignaður neinu þeirra — viðbótarnetföngin tengjast samt'
        : 'Netfangið eða lén þess er skráð á fleiri en eitt félag, eða er lén umsjónaraðila eða banka — pósturinn er ekki eignaður neinu þeirra');
    }
    var takkar = '';
    if (!x.adal && x.status === 'pending' && x.id) takkar += '<button type="button" class="_anf-btn" data-anf-samthykkja="' + x.id + '">Samþykkja</button>';
    if (!x.adal && x.id) takkar += '<button type="button" class="_anf-btn" data-anf-aftengja="' + x.id + '" data-anf-addr="' + esc(x.netfang) + '">Aftengja</button>';
    return '<div class="_anf-lina"><span class="_anf-addr">' + esc(x.netfang) + '</span>' + plata + '<span style="display:inline-flex;gap:6px">' + takkar + '</span>' +
      (skyr.length ? '<span class="_anf-skyr">' + skyr.join(' · ') + '</span>' : '') + '</div>';
  }
  function plataHtml(txt, litur) { return '<span class="_anf-plata"><i style="background:' + litur + '"></i>' + esc(txt) + '</span>'; }

  function stadfesta(texti) {
    if (window.Confirm && typeof Confirm.show === 'function') return Promise.resolve(Confirm.show(texti));
    return Promise.resolve(window.confirm(texti));
  }
  function aftengja(f, id, addr, b) {
    stadfesta('Aftengja ' + addr + ' frá ' + (f.nafn || 'félaginu') + '? Póstar þess hætta að birtast í Samskiptum.').then(function (ja) {
      if (!ja) return;
      b.disabled = true; b.textContent = 'Aftengi…';
      post({ action: 'aftengja', id: id })
        .then(function () { toast(addr + ' aftengt'); return eftirBreytingu(f); })
        .catch(function (e) { b.disabled = false; b.textContent = 'Aftengja'; toast('Tókst ekki að aftengja: ' + ((e && e.message) || e)); });
    });
  }
  function samthykkja(f, id, b) {
    b.disabled = true; b.textContent = 'Samþykki…';
    post({ action: 'approve', id: id })
      .then(function () { toast('Samþykkt — Samskipti uppfærast'); return eftirBreytingu(f); })
      .catch(function (e) { b.disabled = false; b.textContent = 'Samþykkja'; toast('Tókst ekki: ' + ((e && e.message) || e)); });
  }
  function toast(m) {
    try { if (window.Toast && Toast.show) return Toast.show(m); } catch (_) {}
    try { console.log('[473] ' + m); } catch (_) {}
  }

  // Annað félag opnað → spjaldið lokast (það á við félagið sem var opið).
  window.addEventListener('hashchange', loka);

  // 462 kallar setja() í sama tifi og borðinn. Sé borðinn þegar kominn þegar þessi skrá hleðst
  // (djúptengill, hæg hleðsla) er platan sett strax — annars birtist hún fyrst við næstu opnun.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { try { setja(); } catch (_) {} });
  else setTimeout(function () { try { setja(); } catch (_) {} }, 0);

  window.Aukanetfong = { setja: setja, opna: function () { var b = document.querySelector('._anf-takki'); if (b) opna(b); }, version: '473a' };
})();
