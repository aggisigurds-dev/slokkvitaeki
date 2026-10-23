/* 482-reikninga-pdf-vordur.js — varðhundur: hver lokareikningur (greitt_med='reikningur') á PDF-afrit í skjölum.
 *
 * 23.10.2026 (Agnar: „setja guard dog þar svo það vistist pottþétt"). Mælt sama dag: 33 af 257 lokareikningum
 * frá 18.07 áttu ekkert PDF-afrit — reikningar úr POS (10), vinnublöðum, tilboðum og 'claude' fara aldrei um
 * 233 saveForSale, og í flæðunum sem gera það (165/273/386) var bilun gleypt. Þessi pappi:
 *   • þegar Kröfu yfirlit opnast (#view-krofu-yfirlit fær .active): finnur lokareikninga síðustu 90 daga án
 *     afrits og býr þau til með SAMA teiknara og reikningar fá við stofnun (233 buildInvoiceBlob) — aldrei annað
 *     útlit (Agnar: „passaðu að hann líti eins út … voru gerðir einhvern tímann og komu hræðilega ljótt út").
 *     Mest 15 í einu, einu sinni á mínútu, aðeins þegar eitthvað vantar; toast segir hvað var gert.
 *   • ReikningaPdfVordur.keyra({ handvirkt:true, endurgera:true, allt:true, hamark:N }) — handvirk keyrsla sem
 *     líka skiptir út gömlu 254-afritunum („Reikningur R-xxx.pdf", fjöldakeyrsla 18.07) fyrir rétta útlitið.
 *     Gamla afritið víkur AÐEINS eftir að nýja er sannreynt (233 sér um það).
 *   • ReikningaPdfVordur.finna() — telur án þess að skrifa neitt.
 * Skrifar aðeins þegar afrit VANTAR; snertir aldrei kanónískt afrit sem er til. Tvíritunarvörn 233 gildir.
 */
(function () {
  if (window.ReikningaPdfVordur) return;
  var DAGAR = 90, HAMARK = 15, BID_MS = 60000;
  var _last = 0, _running = false;
  function getSB() { return (window.DB && DB.sb) || null; }
  function toast(m) { try { if (window.Toast && Toast.show) Toast.show(m); } catch (_) {} }
  function er254(n) { return /^Reikningur[ _]R-\d+/i.test(String(n || '')); }
  function attList(coId) { try { return (window.CompanyAttachments && CompanyAttachments.list) ? (CompanyAttachments.list(coId) || []) : []; } catch (_) { return []; } }

  async function finna(opts) {
    opts = opts || {};
    var SB = getSB(); if (!SB) return { vantar: [], ljot: [], skodad: 0 };
    var q = SB.from('solur').select('*').eq('status', 'final').eq('greitt_med', 'reikningur')
      .or('is_credit.is.null,is_credit.eq.false').not('customer_id', 'is', null).order('created_at', { ascending: false }).limit(opts.allt ? 1000 : 600);
    if (!opts.allt) q = q.gte('created_at', new Date(Date.now() - (opts.dagar || DAGAR) * 864e5).toISOString());
    var r = await q; var sales = (r && r.data) || [];
    var nums = sales.map(function (s) { return s.num; }).filter(Boolean);
    var docs = {};
    for (var i = 0; i < nums.length; i += 200) {
      var d = await SB.from('customer_documents').select('invoice_number,storage_path,drive_file_id').in('invoice_number', nums.slice(i, i + 200)).or('is_duplicate.is.null,is_duplicate.eq.false');
      ((d && d.data) || []).forEach(function (x) { if (x.storage_path || x.drive_file_id) docs[x.invoice_number] = x; });
    }
    var vantar = [], ljot = [];
    sales.forEach(function (s) {
      var L = attList(s.customer_id), num = String(s.num || '');
      var kanon = L.some(function (a) { return a && a.name && a.name.indexOf(num) >= 0 && !er254(a.name); });
      if (kanon) return;
      // Gamalt 254-afrit: ýmist skráð sem viðhengi („Reikningur R-xxx.pdf") eða aðeins sem skjalaröð sem bendir á
      // …/<ts>_Reikningur_R-xxx.pdf í Storage (fjöldakeyrslan 18.07 skráði enga viðhengi).
      var gamalt = L.some(function (a) { return a && a.name && a.name.indexOf(num) >= 0 && er254(a.name); })
        || (docs[num] && /\/\d+_Reikningur_R-\d+/i.test(String(docs[num].storage_path || '')));
      if (gamalt) { ljot.push(s); return; }
      if (!docs[num]) vantar.push(s);
    });
    return { vantar: vantar, ljot: ljot, skodad: sales.length };
  }

  async function keyra(opts) {
    opts = opts || {};
    if (_running) return null;
    if (!opts.handvirkt && Date.now() - _last < BID_MS) return null;
    if (!(window.UttektInvoicePdf && UttektInvoicePdf.saveForSale)) return null;
    _running = true; _last = Date.now();
    try {
      var f = await finna(opts);
      var listi = opts.endurgera ? f.vantar.concat(f.ljot) : f.vantar;
      var max = opts.hamark || HAMARK, gert = 0, brast = 0;
      for (var i = 0; i < listi.length && (gert + brast) < max; i++) {
        var s = listi[i];
        var m = null;
        try { m = await UttektInvoicePdf.saveForSale(s.customer_id, s, { endurgera: !!opts.endurgera }); } catch (_) { m = null; }
        if (m) gert++; else brast++;
      }
      var eftir = Math.max(0, listi.length - (gert + brast));
      if (gert || brast) toast('🧾 PDF-vörður: ' + gert + ' afrit búin til' + (brast ? ' · ' + brast + ' brugðust' : '') + (eftir ? ' · ' + eftir + ' eftir (opnaðu aftur)' : ''));
      var res = { skodad: f.skodad, vantar: f.vantar.length, ljot: f.ljot.length, gert: gert, brast: brast, eftir: eftir };
      console.log('[482 PDF-vörður]', res);
      return res;
    } catch (e) { console.warn('[482 PDF-vörður]', e && e.message); return null; }
    finally { _running = false; }
  }

  // Kveikja: Kröfu yfirlit opnast. Vakt á class-eigind EINS hnúts (ódýr, engin undirtré).
  function vakta() {
    var el = document.getElementById('view-krofu-yfirlit');
    if (!el) { setTimeout(vakta, 3000); return; }
    var kveikt = function () { if (el.classList.contains('active')) setTimeout(function () { keyra({}); }, 1500); };
    new MutationObserver(kveikt).observe(el, { attributes: true, attributeFilter: ['class'] });
    kveikt();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta); else vakta();

  window.ReikningaPdfVordur = { keyra: keyra, finna: finna };
})();
