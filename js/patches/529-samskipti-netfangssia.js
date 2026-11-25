/* 529 — PÓSTUR EFTIR NETFANGI: netfanga-sía í samskiptaboxið (25.11.2026)
 *
 * Agnar: „finnst það nauðsynlega þurfi að geta tengt þetta betur … kannski þá bara setja fylter
 * í samskiptaboxin eftir póstföngum. Mega vera mörg á hverja eign."
 *
 * Samskiptaspjaldið (286) sýnir aðeins póst sem SJÁLFVIRKA tengingin (v_kunni_postur) eignar
 * félaginu — og hún sleppir viljandi deildum pósthólfum, fjöl-félaga netföngum og umsjónar-/bankalénum
 * (sjá sql/2026-10-16_v_kunni_netfong...). Hér er handvirk hlið að ÖLLUM póstinum: slærð inn (eða velur)
 * netfang og þú færð alla þræði við það úr email_digest — líka þá sem viewið felur. Þannig sérðu
 * samskipti sem tengjast ekki sjálfkrafa, án þess að breyta tengireglunum.
 *
 * Sjálfstæður skreyti-patch (eins og 473/359): snertir 286 EKKI að innan. Les-aðgerð, engin skrif
 * (að festa netfang á félagið er áfram „+N"-takkinn 473). Takkinn er settur aftur inn þegar 286
 * teiknar spjaldið upp á nýtt (MutationObserver + setTimeout til vara, undirskrift í dataset — regla
 * 10.11.2026 um hlut inni í hnút sem annar pappi teiknar).
 */
(function () {
  'use strict';
  if (window.__samskiptiNetfangssia529) return;
  window.__samskiptiNetfangssia529 = true;

  var MONO = '"JetBrains Mono",ui-monospace,monospace';
  var SANS = '"IBM Plex Sans",system-ui,sans-serif';
  var METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function sb() { return (window.DB && window.DB.sb) || window.sb || null; }
  // Aðeins löglegir netfangsstafir — ver gegn því að komma/svigi brjóti PostgREST or()-síuna.
  function hreintAddr(s) { return String(s || '').trim().toLowerCase().replace(/[^a-z0-9@._+\-]/g, ''); }

  var MAN_IS = ['jan.', 'feb.', 'mar.', 'apr.', 'maí', 'jún.', 'júl.', 'ágú.', 'sep.', 'okt.', 'nóv.', 'des.'];
  function fmtD(d) { var t = new Date(d); return isNaN(t.getTime()) ? '' : t.getDate() + '. ' + MAN_IS[t.getMonth()] + ' ' + t.getFullYear(); }

  function stilar() {
    if (document.getElementById('_nfs-css')) return;
    var st = document.createElement('style'); st.id = '_nfs-css';
    st.textContent = [
      '._nfs-takki{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--brd,#e3e7ee);background:#fff;color:var(--ink,#0f172a);',
      'border-radius:9px;padding:5px 11px;font:inherit;font-size:12px;font-weight:600;line-height:1.3;cursor:pointer;white-space:nowrap}',
      '._nfs-takki:hover{background:#f7f8fa}',
      '._nfs-bakhjarl{position:fixed;inset:0;z-index:10060;background:rgba(10,14,22,.42);display:flex;align-items:flex-start;justify-content:center;padding:6vh 16px 16px}',
      '._nfs-spjald{width:min(640px,100%);max-height:88vh;display:flex;flex-direction:column;background:#fff;border:1px solid #000;border-radius:12px;overflow:hidden;font-family:' + SANS + ';color:#1f2530;box-shadow:0 24px 60px -16px rgba(10,14,22,.6)}',
      '._nfs-haus{background:' + METAL + ';color:#fff;padding:11px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #000}',
      '._nfs-titill{font:600 15px/1.2 ' + SANS + ';flex:1;min-width:0;text-shadow:0 1px 1px rgba(0,0,0,.6)}',
      '._nfs-loka{width:30px;height:30px;border-radius:8px;border:1px solid #000;cursor:pointer;background:linear-gradient(180deg,#3d4048,#1c1e23);color:#eef1f4;font-size:16px;line-height:1;flex:none}',
      '._nfs-leit{display:flex;gap:8px;padding:12px 14px;border-bottom:1px solid #eef1f4;flex-wrap:wrap}',
      '._nfs-reitur{flex:1 1 220px;min-width:0;height:38px;box-sizing:border-box;padding:0 12px;background:#eef1f6;border:1px solid rgba(20,24,34,.14);border-radius:8px;font:400 13px/1 ' + MONO + ';color:#141822;outline:none}',
      '._nfs-reitur:focus{border-color:#be201c}',
      '._nfs-saekja{height:38px;padding:0 16px;border:1px solid rgba(190,32,28,.55);border-radius:8px;background:' + METAL + ';color:#fff;font:600 13px/1 ' + SANS + ';cursor:pointer;white-space:nowrap}',
      '._nfs-saekja:disabled{opacity:.6;cursor:default}',
      '._nfs-buk{padding:10px 14px 14px;overflow:auto}',
      '._nfs-skyr{font:400 11.5px/1.45 ' + SANS + ';color:#525b6b;margin:0 0 8px}',
      '._nfs-rod{padding:8px 10px;border:1px solid #eef1f4;border-radius:9px;margin-bottom:7px;background:#fff}',
      '._nfs-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font:400 11.5px/1 ' + SANS + ';color:#64748b;margin-bottom:3px}',
      '._nfs-chip{display:inline-flex;align-items:center;border-radius:99px;padding:1px 8px;font-size:10.5px;font-weight:700;white-space:nowrap}',
      '._nfs-chip.inn{background:#fff1f2;color:#9f1239;border:1px solid #fecdd3}',
      '._nfs-chip.ut{background:#eff6ff;color:#1e3a8a;border:1px solid #bfdbfe}',
      '._nfs-subj{font:700 13px/1.35 ' + SANS + ';color:#141822;overflow-wrap:anywhere}',
      '._nfs-snip{font:400 12px/1.45 ' + SANS + ';color:#475569;overflow-wrap:anywhere;margin-top:2px}',
      '._nfs-tomt{font:400 12.5px/1.5 ' + SANS + ';color:#69717f;padding:8px 2px}',
      '._nfs-bidur{font:400 12.5px/1.5 ' + SANS + ';color:#69717f;padding:8px 2px}',
      '._nfs-villa{font:500 12.5px/1.45 ' + SANS + ';color:#b42318;padding:8px 2px}',
    ].join('');
    (document.head || document.documentElement).appendChild(st);
  }

  // Félagið á opna prófílnum (sama aðferð og 473): id úr Companies.openEdit-takkanum, netfang úr Companies.list.
  function felag() {
    var main = document.getElementById('companies-main'); if (!main) return null;
    var b = main.querySelector('button[onclick^="Companies.openEdit"]');
    var m = b && String(b.getAttribute('onclick') || '').match(/openEdit\((\d+)\)/);
    if (!m) return null;
    var fid = +m[1];
    var c = ((window.Companies && Companies.list) || []).find(function (x) { return x && +x.id === fid; }) || {};
    return { fid: fid, nafn: c.nafn || '', netfang: String(c.netfang || '').trim().toLowerCase() };
  }

  // ── Leit í email_digest ────────────────────────────────────────────────────
  function leita(addr) {
    var c = sb(); if (!c) return Promise.reject(new Error('enginn gagnatengill'));
    var a = hreintAddr(addr);
    if (!a || a.indexOf('@') < 0) return Promise.reject(new Error('Sláðu inn gilt netfang.'));
    // PostgREST or() notar * sem algildisstaf (ekki %); a er þegar hreinsað svo engin komma/svigi sleppur inn.
    return c.from('email_digest')
      .select('received_at,sender_name,sender_email,to_addresses,subject,snippet')
      .or('sender_email.ilike.*' + a + '*,to_addresses.ilike.*' + a + '*')
      .order('received_at', { ascending: false })
      .limit(60)
      .then(function (r) { if (r.error) throw new Error(r.error.message || 'villa'); return { addr: a, rows: r.data || [] }; });
  }

  function rodHtml(m, addr) {
    var fra = String(m.sender_email || '').toLowerCase().indexOf(addr) >= 0;
    var hver = m.sender_name || m.sender_email || '(óþekktur)';
    var snip = String(m.snippet || '').replace(/\s+/g, ' ').trim();
    return '<div class="_nfs-rod">' +
      '<div class="_nfs-meta">' +
        '<span class="_nfs-chip ' + (fra ? 'inn' : 'ut') + '">' + (fra ? 'Frá þeim' : 'Til þeirra') + '</span>' +
        '<span>' + esc(hver) + '</span><span>·</span><span>' + esc(fmtD(m.received_at)) + '</span>' +
      '</div>' +
      '<div class="_nfs-subj">' + esc(m.subject || '(ekkert efni)') + '</div>' +
      (snip ? '<div class="_nfs-snip">' + esc(snip.slice(0, 220)) + '</div>' : '') +
    '</div>';
  }

  var _opid = null;
  function loka() { if (_opid) { try { _opid.remove(); } catch (_) {} _opid = null; document.removeEventListener('keydown', escLoka, true); } }
  function escLoka(e) { if (e.key === 'Escape') { e.stopPropagation(); loka(); } }

  function opna(f) {
    loka(); stilar();
    var bak = document.createElement('div'); bak.className = '_nfs-bakhjarl';
    bak.innerHTML =
      '<div class="_nfs-spjald" role="dialog" aria-label="Póstur eftir netfangi">' +
        '<div class="_nfs-haus"><span class="_nfs-titill">🔍 Póstur eftir netfangi' + (f.nafn ? ' · ' + esc(f.nafn) : '') + '</span>' +
          '<button type="button" class="_nfs-loka" title="Loka" aria-label="Loka">×</button></div>' +
        '<div class="_nfs-leit">' +
          '<input class="_nfs-reitur" type="email" inputmode="email" autocomplete="off" spellcheck="false" placeholder="jon@felag.is" aria-label="Netfang">' +
          '<button type="button" class="_nfs-saekja">Sækja</button>' +
        '</div>' +
        '<div class="_nfs-buk">' +
          '<p class="_nfs-skyr">Sýnir allan póst til og frá netfanginu úr pósthólfinu — líka þann sem tengist ekki félaginu sjálfkrafa. Til að festa netfang varanlega á félagið, notaðu „+N" við netfangið í hausnum.</p>' +
          '<div data-nfs-nid></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bak);
    _opid = bak;
    document.addEventListener('keydown', escLoka, true);
    bak.addEventListener('mousedown', function (e) { if (e.target === bak) loka(); });
    bak.querySelector('._nfs-loka').addEventListener('click', loka);

    var reitur = bak.querySelector('._nfs-reitur');
    var saekja = bak.querySelector('._nfs-saekja');
    var nid = bak.querySelector('[data-nfs-nid]');
    if (f.netfang) reitur.value = f.netfang;

    function keyra() {
      var addr = reitur.value;
      nid.innerHTML = '<div class="_nfs-bidur">Sæki póst…</div>';
      saekja.disabled = true;
      leita(addr).then(function (res) {
        saekja.disabled = false;
        if (!res.rows.length) { nid.innerHTML = '<div class="_nfs-tomt">Enginn póstur fannst við <b>' + esc(res.addr) + '</b> í pósthólfinu.</div>'; return; }
        nid.innerHTML = '<div class="_nfs-skyr">' + res.rows.length + (res.rows.length === 60 ? '+ ' : ' ') + 'póstar við <b>' + esc(res.addr) + '</b> (nýjastir efst)</div>' +
          res.rows.map(function (m) { return rodHtml(m, res.addr); }).join('');
      }, function (e) {
        saekja.disabled = false;
        nid.innerHTML = '<div class="_nfs-villa">' + esc((e && e.message) || e) + '</div>';
      });
    }
    saekja.addEventListener('click', keyra);
    reitur.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); keyra(); } });
    setTimeout(function () { try { reitur.focus(); reitur.select(); } catch (_) {} }, 0);
    if (f.netfang) keyra();
  }

  // ── Setja takkann í hausinn á samskiptaspjaldinu (endurtekið þegar 286 teiknar upp á nýtt) ──
  function setja() {
    var main = document.getElementById('companies-main'); if (!main) return;
    var acts = main.querySelector('._samskipti-card ._skx-acts'); if (!acts) return;
    var f = felag(); if (!f) return;
    var fyrir = acts.querySelector('._nfs-takki');
    if (fyrir && fyrir.dataset.nfsFid === String(f.fid)) return;
    if (fyrir) fyrir.remove();
    stilar();
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = '_nfs-takki'; btn.dataset.nfsFid = String(f.fid);
    btn.title = 'Leita að pósti eftir netfangi — líka póst sem tengist ekki félaginu sjálfkrafa';
    btn.innerHTML = '🔍 Póstur eftir netfangi';
    btn.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); var g = felag(); if (g) opna(g); });
    acts.appendChild(btn);
  }

  var _throttle = null;
  function planaSetja() { if (_throttle) return; _throttle = setTimeout(function () { _throttle = null; try { setja(); } catch (_) {} }, 120); }

  function vakta() {
    var main = document.getElementById('companies-main');
    if (!main) { setTimeout(vakta, 500); return; }
    try { new MutationObserver(planaSetja).observe(main, { childList: true, subtree: true }); } catch (_) {}
    planaSetja();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta);
  else vakta();
  window.addEventListener('hashchange', planaSetja);

  window.SamskiptiNetfangssia = { opna: function () { var f = felag(); if (f) opna(f); }, setja: setja, version: '529a' };
})();
