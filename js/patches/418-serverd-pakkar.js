/* 418 — SÉRVERÐ: tilbúnir pakkar úr síðustu reikningum  (25.09.2026)
 *
 * Agnar 25.09 (skjámynd af „🏷 Slökkvitæki — sérverð" með tveimur rauðum kössum við takkana):
 *   „Geturðu bætt við inn í tilboð og samningar - Sérverð … við viljum senda svona valinn verðlista
 *    með afslætti … erum mjög lengi að handvirkt skrá inn. Geturðu gert tilbúna pakka fyrir það
 *    helsta sem við erum að rukka í Ársskoðun og það helsta úr brunakerfisþjónustunni. Tekur þá
 *    bara nýjasta reikninginn gerðan þar og þau atriði sem eru þar. Og síðan sjá heildarlistann."
 *   „Núna eru ný slökkvitæki í sérverðum … svo fá slökkvitækjaþjónustuverð og brunakerfisþjónustuverð."
 *
 * Tveir takkar við hlið „+ Bæta við tæki / línu" í sérverðs-glugganum (papp 201):
 *   🧯 Slökkvitækjaþjónusta — línur úr síðustu ársskoðunarreikningum (solur.source = 'uttekt')
 *   🚨 Brunakerfisþjónusta  — línur úr síðustu brunakerfisreikningum   (solur.source = 'brunakerfi')
 *
 * Pakkinn = línur NÝJASTA reikningsins fremst, í hans röð, og svo hverjar aðrar línur sem komu
 * fyrir á 15 síðustu reikningum sömu tegundar, eftir tíðni. Verðið er verð nýjasta reikningsins
 * sem bar línuna, m/vsk. Línurnar koma inn HAKAÐAR (þetta er listinn sem á að fara út með afslætti)
 * og efst í töfluna; sé lína þegar til í töflunni („aðrar vörur") er hún hökuð og dregin upp í stað
 * þess að tvítakast. „▾ Sjá aðrar vörur" (201) er heildarlistinn og stendur óbreyttur.
 *
 * AÐFERÐ: 201 á gluggann og lokaða `lines`-breytu, en collect() les úr DOM-inu og hver aðgerð byrjar
 * á `lines = collect()`. Því nægir að skrifa raðir í #_th-tbody með SAMA merkingu (data-f, data-cell,
 * data-del, data-i, data-primary) — 201 les þær sem sínar. data-i verður að vera DOM-sætið (eyða-
 * takkinn notar það), svo raðirnar eru endurnúmeraðar eftir innsetningu. Þessi pappi á takkana tvo
 * og stöðulínuna; 201 á allt annað (CLAUDE.md regla 4).
 */
(function () {
  'use strict';
  if (window.__serverdPakkar418) return;
  window.__serverdPakkar418 = true;

  var PAKKAR = {
    ars: { id: '_th-pk-ars', source: 'uttekt', takn: '🧯', heiti: 'Slökkvitækjaþjónusta', radaEftirTegund: true,
      titill: 'Línur úr síðustu ársskoðunarreikningum — hleðsla/yfirferð, reykskynjarar, brunaslöngur, skýrslugerð, akstur' },
    bk:  { id: '_th-pk-bk',  source: 'brunakerfi', takn: '🚨', heiti: 'Brunakerfisþjónusta',
      titill: 'Línur úr síðustu brunakerfisreikningum — skoðun stöðvar, skynjara, bjalla, skýrsla' }
  };
  var FJOLDI_REIKNINGA = 15;

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function grp(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS'); }
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  // „Hleðsla · Léttvatnstækis 6L. hleðsla" → „Léttvatnstækis 6L. hleðsla" (129 skrifar þjónustuna fremst)
  function heiti(desc) {
    var s = String(desc || '').replace(/\s+/g, ' ').trim();
    var m = s.match(/^(Hleðsla|Yfirferð|Nýtt|Vara)\s*·\s*(.+)$/i);
    return m ? m[2].trim() : s;
  }

  var minni = {};   // source → { at, linur, nyjasti }
  async function saekjaPakka(source) {
    var h = minni[source];
    if (h && Date.now() - h.at < 60000) return h;
    var sb = SB(); if (!sb) throw new Error('Engin gagnabankatenging');
    var r = await sb.from('solur').select('num,created_at,customer_nafn,linur')
      .eq('source', source).or('is_credit.is.null,is_credit.eq.false')
      .order('created_at', { ascending: false }).limit(FJOLDI_REIKNINGA);
    if (r.error) throw r.error;
    var solur = r.data || [];
    var m = {}, rod = [];
    solur.forEach(function (s, ix) {
      var linur = Array.isArray(s.linur) ? s.linur : [];
      linur.forEach(function (l) {
        var n = heiti(l.desc); if (!n) return;
        var k = norm(n);
        var verd = Math.round((Number(l.unit_price_ex_vat) || 0) * (1 + (Number(l.vsk_pct) || 24) / 100));
        if (!m[k]) { m[k] = { n: n, full: verd, fjoldi: 0, nyjasti: ix === 0, saeti: rod.length }; rod.push(k); }
        m[k].fjoldi++;
      });
    });
    // nýjasti reikningurinn fremst í sinni röð, svo hinar eftir tíðni
    var linur = rod.map(function (k) { return m[k]; }).sort(function (a, b) {
      if (a.nyjasti !== b.nyjasti) return a.nyjasti ? -1 : 1;
      if (a.nyjasti) return a.saeti - b.saeti;
      return (b.fjoldi - a.fjoldi) || (a.saeti - b.saeti);
    });
    var ny = solur[0] || null;
    var ut = { at: Date.now(), linur: linur, fjoldiReikninga: solur.length,
      nyjasti: ny ? { num: ny.num, dags: ny.created_at, nafn: ny.customer_nafn } : null };
    minni[source] = ut;
    return ut;
  }

  function dmy(iso) { var d = iso ? new Date(iso) : null; return d && !isNaN(d) ? ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) : ''; }

  // Sama röð og rowHtml() í 201 — data-f/data-cell/data-del/data-i/data-primary eru samningurinn.
  function rodHtml(l, i) {
    var inSt = 'padding:6px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px;text-align:right';
    return '<tr data-i="' + i + '" data-primary="1" draggable="true" style="background:#f0fdf4">' +
      '<td style="text-align:center;padding:4px 6px;white-space:nowrap"><span class="_th-grip" title="Draga til" style="cursor:grab;color:#94a3b8;font-size:13px;user-select:none;padding:0 3px;line-height:1">⋮⋮</span>' +
        '<input data-f="inc" type="checkbox" checked style="width:16px;height:16px;cursor:pointer;vertical-align:middle"></td>' +
      '<td style="padding:4px 6px"><input data-f="n" type="text" value="' + esc(l.n) + '" placeholder="Tæki / vara" style="width:100%;min-width:210px;padding:6px 8px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:12px"></td>' +
      '<td style="padding:4px 6px"><input data-f="full" type="text" inputmode="numeric" value="' + grp(l.full) + '" style="' + inSt + ';width:94px"></td>' +
      '<td style="padding:4px 6px"><input data-f="afsl" type="number" min="0" max="100" step="1" value="" placeholder="0" style="' + inSt + ';width:54px"></td>' +
      '<td data-cell="final" style="padding:4px 8px;font-size:12.5px;text-align:right;font-weight:700;color:var(--th-primary);white-space:nowrap">' + grp(l.full) + ' kr</td>' +
      '<td style="padding:4px 6px"><button data-del type="button" style="border:none;background:#fef2f2;color:#dc2626;border-radius:6px;width:26px;height:26px;cursor:pointer">×</button></td>' +
    '</tr>';
  }

  // Röðin innan slökkvitækjaþjónustunnar (Agnar 25.09): „hleðslu/yfirferð fyrst, reykskynjara,
  // brunaslöngu, skýrslugerð og akstur í lokin". Brunakerfið heldur röð reikningsins.
  function rod(n) {
    var s = norm(n);
    if (/akstur/.test(s)) return 5;
    if (/skýrslu|skyrslu/.test(s)) return 4;
    if (/brunaslang|brunaslöng|slöngu|slongu/.test(s)) return 3;
    if (/reykskynj|hitaskynj/.test(s)) return 2;
    if (/hleðsl|hledsl|yfirfer/.test(s)) return 0;
    return 1;
  }
  // Fyrirsagnarlína — sama merking og rowHtml() í 201 fyrir { heading:true } (data-heading + [data-f="h"]).
  function fyrirsognHtml(h) {
    return '<tr data-i="0" data-primary="1" data-heading="1" draggable="true" style="background:var(--th-tint)">' +
      '<td style="text-align:center;padding:4px 6px"><span class="_th-grip" title="Draga til" style="cursor:grab;color:#94a3b8;font-size:13px;user-select:none;padding:0 3px;line-height:1">⋮⋮</span></td>' +
      '<td colspan="4" style="padding:4px 6px"><input data-f="h" type="text" value="' + esc(h) + '" placeholder="Fyrirsögn flokks" style="width:100%;padding:6px 8px;border:1px solid var(--th-tintb);border-radius:6px;font:inherit;font-size:12.5px;font-weight:800;color:var(--th-dark);background:#fff"></td>' +
      '<td style="padding:4px 6px"><button data-del type="button" style="border:none;background:#fef2f2;color:#dc2626;border-radius:6px;width:26px;height:26px;cursor:pointer">×</button></td></tr>';
  }
  function nyRod(html) { var t = document.createElement('tbody'); t.innerHTML = html; return t.firstElementChild; }

  function setjaInn(tbody, pakki, P) {
    var radir = Array.prototype.slice.call(tbody.querySelectorAll('tr'));
    // Aðeins FALDAR „aðrar vörur" eru dregnar inn í flokkinn; sýnileg lína (t.d. nýtt tæki undir
    // „Ný tæki") stendur þar sem hún er — „ekki láta þetta blandast saman".
    var faldar = {}, synilegar = {};
    radir.forEach(function (tr) {
      if (tr.dataset.heading === '1') return;
      var inp = tr.querySelector('[data-f="n"]'); if (!inp) return;
      (tr.classList.contains('_th-other') ? faldar : synilegar)[norm(inp.value)] = tr;
    });
    var linur = pakki.linur.slice();
    if (P.radaEftirTegund) linur.sort(function (a, b) { return rod(a.n) - rod(b.n); });   // stöðug röðun → pakkaröðin helst innan hóps
    // Flokkurinn: fyrirsögn sem þegar er til með sama heiti er endurnýtt, annars ný.
    var fyrirs = radir.find(function (tr) { return tr.dataset.heading === '1' && norm((tr.querySelector('[data-f="h"]') || {}).value) === norm(P.heiti); });
    var blokk = document.createDocumentFragment();
    if (!fyrirs) { fyrirs = nyRod(fyrirsognHtml(P.heiti)); blokk.appendChild(fyrirs); }
    var nyjar = 0, hakadar = 0, sleppt = 0;
    linur.forEach(function (l) {
      var k = norm(l.n);
      if (synilegar[k]) { sleppt++; return; }
      var tr = faldar[k];
      if (tr) {
        var inc = tr.querySelector('[data-f="inc"]'); if (inc && !inc.checked) { inc.checked = true; hakadar++; }
        tr.classList.remove('_th-other'); tr.dataset.primary = '1'; tr.style.display = '';
        blokk.appendChild(tr);
      } else { blokk.appendChild(nyRod(rodHtml(l, 0))); nyjar++; }
    });
    if (fyrirs.parentNode === tbody) {
      // Fyrirsögnin er þegar í töflunni: línurnar fara aftast í HENNAR flokk (fram að næstu fyrirsögn/földu línu).
      var eftir = fyrirs.nextElementSibling;
      while (eftir && eftir.dataset.heading !== '1' && !eftir.classList.contains('_th-other')) eftir = eftir.nextElementSibling;
      tbody.insertBefore(blokk, eftir);
    } else {
      // Ný blokk: aftast í sýnilega hlutann, á undan földu „öðrum vörum" — „Ný tæki" standa efst.
      var fyrstaFalda = radir.find(function (tr) { return tr.classList.contains('_th-other') && tr.parentNode === tbody; }) || null;
      tbody.insertBefore(blokk, fyrstaFalda);
    }
    // data-i = DOM-sætið (eyða-takkinn í 201 notar það)
    Array.prototype.forEach.call(tbody.querySelectorAll('tr'), function (tr, i) { tr.dataset.i = String(i); });
    // recompute() í 201 hlustar á input-atburði á glugganum
    var einhver = tbody.querySelector('input'); if (einhver) einhver.dispatchEvent(new Event('input', { bubbles: true }));
    return { nyjar: nyjar, hakadar: hakadar, sleppt: sleppt };
  }

  function segja(ov, txt, villa) {
    var s = ov.querySelector('#_th-pk-stada');
    if (!s) return;
    s.textContent = txt || '';
    s.style.color = villa ? '#b91c1c' : '#166534';
  }

  async function smellur(ov, lykill) {
    var P = PAKKAR[lykill], b = ov.querySelector('#' + P.id), tbody = ov.querySelector('#_th-tbody');
    if (!b || !tbody) return;
    b.disabled = true; segja(ov, 'Sæki ' + P.heiti.toLowerCase() + '…');
    try {
      var pakki = await saekjaPakka(P.source);
      if (!pakki.linur.length) { segja(ov, 'Engir reikningar fundust með source = ' + P.source, true); return; }
      var u = setjaInn(tbody, pakki, P);
      var ny = pakki.nyjasti;
      segja(ov, P.takn + ' ' + P.heiti + ': ' + (u.nyjar + u.hakadar) + ' línur úr ' + pakki.fjoldiReikninga + ' síðustu reikningum' +
        (ny ? ' · nýjasti ' + (ny.num || '') + ' ' + dmy(ny.dags) + (ny.nafn ? ' (' + ny.nafn + ')' : '') : '') +
        (u.sleppt ? ' · ' + u.sleppt + ' þegar í listanum ofar' : '') + '. Settu afsláttinn.');
    } catch (e) {
      segja(ov, 'Tókst ekki: ' + ((e && e.message) || e), true);
    } finally { b.disabled = false; }
  }

  function setjaTakka() {
    var ov = document.getElementById('_th-modal'); if (!ov) return;
    var add = ov.querySelector('#_th-addrow'), tbody = ov.querySelector('#_th-tbody');
    if (!add || !tbody || ov.querySelector('#_th-pk-ars')) return;
    // Aðeins sérverðs-glugginn (201 notar #_th-addrow líka í slökkvitækja-tilboðinu, en þar er
    // ekki „inc"-hakreitur).
    if (!tbody.querySelector('[data-f="inc"]')) return;
    var st = 'padding:7px 12px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:12px;font-weight:700;color:#1f2530';
    var eftir = add;   // 🧯 fyrst, svo 🚨 — hvor takki fer aftan við þann á undan
    Object.keys(PAKKAR).forEach(function (k) {
      var P = PAKKAR[k];
      var b = document.createElement('button');
      b.type = 'button'; b.id = P.id; b.title = P.titill; b.style.cssText = st;
      b.textContent = P.takn + ' ' + P.heiti;
      b.addEventListener('click', function () { smellur(ov, k); });
      eftir.parentNode.insertBefore(b, eftir.nextSibling); eftir = b;
    });
    var stada = document.createElement('span');
    stada.id = '_th-pk-stada';
    stada.style.cssText = 'flex:1 1 100%;font-size:11.5px;color:#166534;min-height:14px';
    add.parentNode.appendChild(stada);
  }

  // Glugginn er skrifaður í body þegar smellt er á „🏷 Nýtt sérverð" eða breyta-takka — vakt + smell-varaleið.
  new MutationObserver(function () { setjaTakka(); }).observe(document.body, { childList: true, subtree: true });
  // openServerd() í 201 bíður eftir vörulistanum áður en glugginn er teiknaður — smellurinn er á
  // undan glugganum, svo það er þreifað í ~3 s (vaktin nær því annars, en hún frýs í földu spjaldi).
  document.addEventListener('click', function () {
    var n = 0; var t = setInterval(function () { setjaTakka(); if (++n >= 20 || document.getElementById('_th-pk-ars')) clearInterval(t); }, 150);
  }, true);
  window.ServerdPakkar = { saekja: saekjaPakka, setjaTakka: setjaTakka };
})();
