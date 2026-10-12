/* portal.js — Þjónustuvefur (kúndavefur) framendi.
 * Sækir gögn úr /api/gatt (innskráð session). ?demo=1 sýnir hönnunina með
 * sýnishorns-gögnum (engin auðkenning) svo hægt sé að skoða útlitið á forskoðun.
 */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var fmtKr = function (n) { return (n == null || n === '') ? '—' : Number(n).toLocaleString('is-IS') + ' kr.'; };
  var fmtDate = function (d) {
    if (!d) return '—';
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
    return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(d);
  };
  var TYPE_LABEL = { uttektarskyrsla: 'Slökkvitæki', brunakerfi: 'Brunakerfi' };

  /* ── Tákn (stroke = currentColor). Lykill = merkið á spjaldinu. Engin emoji. ── */
  var ICON = {
    'Byggingar': '<path d="M4.5 21V6l7.5-3 7.5 3v15"/><path d="M2.5 21h19"/><path d="M8.5 9h2M13.5 9h2M8.5 13h2M13.5 13h2M10.5 21v-4h3v4"/>',
    'Slökkvitæki': '<rect x="8" y="8.5" width="8" height="13" rx="3"/><path d="M10 8.5V6h4v2.5"/><path d="M14 6h2.6l2.9 2.3"/><path d="M9 3.5h6"/><path d="M8 14h8"/>',
    'Brunaslöngur': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.5"/><path d="M20.5 12H23"/>',
    'Brunakerfi': '<path d="M6.5 16v-4.5a5.5 5.5 0 0 1 11 0V16l1.5 2h-14z"/><path d="M10 20.5a2 2 0 0 0 4 0"/><path d="M3.5 9.5a9 9 0 0 1 2.3-4.6M20.5 9.5a9 9 0 0 0-2.3-4.6"/>',
    'Skoðun á tíma': '<path d="M12 2.8 4.8 5.6v5.6c0 4.7 3.1 8.5 7.2 9.9 4.1-1.4 7.2-5.2 7.2-9.9V5.6z"/><path d="m8.8 12.1 2.3 2.3 4.3-4.6"/>',
    'pdf': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9.5 14.5 12 17l2.5-2.5"/>',
    'mappa': '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    'erindi': '<path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 9.5h7M8.5 12.5h4.5"/>',
    'las': '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.6-1.7"/>',
    'hak': '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    'leit': '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  };
  function svgIc(k, w) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (w || 1.7) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICON[k] || '') + '</svg>';
  }
  // Stór fyllt tákn á lykiltölu-spjöldin (eins og í mockup Agnars 10.10.2026) — fyllt
  // með málmhallanum #g-ic úr index.html, svo þau fylgja þema fyrirtækisins.
  var ART = {
    'Byggingar': '<path fill-rule="evenodd" d="M15 44V9l9-5 9 5v35ZM3 44V19h10v25ZM35 44V15h10v29ZM18.2 11.5h4v3.4h-4ZM18.2 17.5h4v3.4h-4ZM18.2 23.5h4v3.4h-4ZM18.2 29.5h4v3.4h-4ZM25.8 11.5h4v3.4h-4ZM25.8 17.5h4v3.4h-4ZM25.8 23.5h4v3.4h-4ZM25.8 29.5h4v3.4h-4ZM21.5 36.5h5v7.5h-5ZM5.2 22h2.6v3h-2.6ZM5.2 28h2.6v3h-2.6ZM5.2 34h2.6v3h-2.6ZM9.2 22h2.6v3h-2.6ZM9.2 28h2.6v3h-2.6ZM9.2 34h2.6v3h-2.6ZM37.2 18h2.6v3h-2.6ZM37.2 24h2.6v3h-2.6ZM37.2 30h2.6v3h-2.6ZM37.2 36h2.6v3h-2.6ZM41.2 18h2.6v3h-2.6ZM41.2 24h2.6v3h-2.6ZM41.2 30h2.6v3h-2.6ZM41.2 36h2.6v3h-2.6Z"/><path d="M1 44h46v2.4H1z"/>',
    'Slökkvitæki': '<path fill-rule="evenodd" d="M16 21a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v20a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4ZM19.5 23.5h9v9.5h-9ZM19.5 37h9v1.8h-9Z"/><path d="M21 9.5h6v6h-6zM19 6h10v4.2H19z"/><path d="M29 6.6 40.2 3c1.7-.5 2.5 1.5 1 2.3L30 10.4Z"/><path d="M29 9.8 38.6 13c1.5.5 1 2.5-.6 2.2L29 13.2Z"/><path d="M21 8.6C12.5 8.6 8.5 13.5 8.5 21.5v14.5c0 2.6.9 4.3 2.6 5.3" fill="none" stroke-width="3" stroke-linecap="round"/><path d="m9.2 40.6 3.6 1.5-1.5 3.4-3.6-1.5z"/>',
    'Brunaslöngur': '<path fill-rule="evenodd" d="M9 8h26a2 2 0 0 1 2 2v26a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2ZM11.2 11h1.6v24h-1.6ZM14.65 11h1.6v24h-1.6ZM18.1 11h1.6v24h-1.6ZM21.55 11h1.6v24h-1.6ZM25 11h1.6v24h-1.6ZM28.45 11h1.6v24h-1.6ZM31.9 11h1.6v24h-1.6Z"/><path d="M6 4.5h32v2.4H6z"/><path d="M37 21.6h2.4v2.8H37zM42.2 19.6a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8Z"/><path d="M12 38v3.6c0 1.6-.8 2.6-2.2 2.9" fill="none" stroke-width="3" stroke-linecap="round"/><path d="M6.6 42.4h4.2v4.4H6.6z"/>',
    'Brunakerfi': '<path fill-rule="evenodd" d="M24 3 41 9v13c0 11.5-7.4 19.6-17 23C14.4 41.6 7 33.5 7 22V9ZM24.6 13c1.6 5.2-2.2 7.4-3.8 10.2-1.6 2.6-3.2 4.8-3.2 8.4a6.6 6.6 0 0 0 13.2 0c0-3.6-1.6-6.2-3.6-8.2 0 2.6-1 4.2-2.6 5.2 1-5.8 0-10.6 0-15.6Z"/><path d="M24 38.2a3.2 3.2 0 0 1-3.2-3.2c0-2.2 1.6-3.2 2.6-4.8.4 1.4 1 2.2 2 2.6.6-.6 1-1.6 1-2.6 1 1.2 1.4 2.6 1.4 3.8a3.6 3.6 0 0 1-3.8 4.2Z"/>',
    'Skoðun á tíma': '<path fill-rule="evenodd" d="M4 24a20 20 0 1 0 40 0 20 20 0 1 0-40 0ZM8.4 24a15.6 15.6 0 1 0 31.2 0 15.6 15.6 0 1 0-31.2 0Z"/><path d="M22.7 11.5h2.6V24h-2.6z"/><path d="m24.8 22.7 8.7 5.6-1.4 2.2-8.7-5.6z"/><path d="M21.3 24a2.7 2.7 0 1 0 5.4 0 2.7 2.7 0 1 0-5.4 0Z"/><path d="M23 5.6h2v3h-2zM23 39.4h2v3h-2zM5.6 23h3v2h-3zM39.4 23h3v2h-3z" opacity=".75"/>',
  };
  // Tákn fyrir lykiltölur eignasafnsins (fyllt, sami málmhalli)
  ART['Eignir'] = ART['Byggingar'];
  ART['Í þjónustu'] = ART['Skoðun á tíma'];
  ART['Fermetrar'] = '<path fill-rule="evenodd" d="M4 6h40v36H4ZM8 10h14v12H8ZM26 10h14v8H26ZM8 26h10v12H8ZM22 26h18v12H22Z"/>';
  ART['Byggingarár'] = '<path fill-rule="evenodd" d="M6 10a3 3 0 0 1 3-3h30a3 3 0 0 1 3 3v29a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3ZM10 17h28v21H10Z"/><path d="M14 3h4v8h-4zM30 3h4v8h-4zM13 21h6v5h-6zM21 21h6v5h-6zM29 21h6v5h-6zM13 29h6v5h-6zM21 29h6v5h-6z"/>';
  ART['Beiðnir í vinnslu'] = '<path fill-rule="evenodd" d="M9 8a3 3 0 0 1 3-3h24a3 3 0 0 1 3 3v33a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3ZM13 12h22v28H13Z"/><path d="M17 2h14v8H17zM17 17h14v3H17zM17 24h14v3H17zM17 31h9v3h-9z"/>';
  function icon(k) { return ART[k] ? '<svg class="art" viewBox="0 0 48 48" aria-hidden="true">' + ART[k] + '</svg>' : ''; }
  // Íslensk fleirtala: 1, 21, 31 … (ekki 11) taka eintölu
  function eint(n) { return n % 10 === 1 && n % 100 !== 11; }
  function tala(n, et, ft) { return n + ' ' + (eint(n) ? et : ft); }
  // Fótlína töflu: „11 skýrslur“ eða „3 af 11 skýrslum · Klöpp“
  function foot(sel, shown, total, nf, thgf, filter) {
    var el = $(sel); if (!el) return;
    if (!total) { el.innerHTML = ''; return; }
    el.innerHTML = filter
      ? '<b>' + shown + '</b>&nbsp;af ' + tala(total, thgf[0], thgf[1]) + ' · ' + esc(filter)
      : '<b>' + total + '</b>&nbsp;' + (eint(total) ? nf[0] : nf[1]);
  }
  // Tegund sem pilla: slökkvitæki (málmlituð, tákn), brunakerfi (hlutlaus, tákn), annað án tákns
  function tegundPilla(t) {
    var s = String(t || '');
    if (!s || s === '—') return '<span class="dim">—</span>';
    if (/^brunakerfi/i.test(s)) return '<span class="tb br">' + svgIc('Brunakerfi', 1.9) + esc(s) + '</span>';
    if (/sl[öo]kkvit|uttekt|úttekt/i.test(s)) return '<span class="tb sl">' + svgIc('Slökkvitæki', 1.9) + esc(s) + '</span>';
    return '<span class="tb plain">' + esc(s) + '</span>';
  }
  var INV_TEG = { uttekt: 'Slökkvitæki', brunakerfi: 'Brunakerfi', bud: 'Búð', ovisst: 'Óvíst' };

  /* ── SÝNISHORN (úr v3 Steel hönnun) ── */
  var DEMO = {
    account: { name: 'Center Hótel', theme: 'steel' },
    stats: [
      { k: 'Byggingar', v: '10' }, { k: 'Slökkvitæki', v: '155' }, { k: 'Brunaslöngur', v: '77' },
      { k: 'Brunakerfi', v: '9', s: 'hús' }, { k: 'Skoðun á tíma', v: '1', s: 'hús', dark: true },
    ],
    buildings: [
      { nafn: 'Arnarhvoll', heimilisfang: 'Ingólfsstræti 1, 101 Reykjavík', sl: 13, slo: 8, br: true, y: [['no', 'no'], ['ok', 'ok'], ['ok', 'ok'], ['no', 'ok']], nt: 'Tæki: janúar 2026|Kerfi: maí 2027' },
      { nafn: 'Grandi', heimilisfang: 'Seljavegur 2, 101 Reykjavík', sl: 14, slo: 11, br: true, y: [['ok', 'ok'], ['ok', 'ok'], ['ok', 'ok'], ['ok', 'ok']], nt: 'Tæki: janúar 2027|Kerfi: mars 2027' },
      { nafn: 'Hlaðvarpinn', heimilisfang: 'Aðalstræti 4, 101 Reykjavík', sl: null, slo: null, br: false, y: [['no', 'no'], ['no', 'no'], ['no', 'no'], ['no', 'no']], nt: 'Tæki: —' },
      { nafn: 'Klöpp', heimilisfang: 'Klapparstígur 26, 101 Reykjavík', sl: 18, slo: 10, br: true, y: [['no', 'ok'], ['ok', 'ok'], ['ok', 'ok'], ['ok', 'no']], nt: 'Tæki: júlí 2027|Kerfi: nóvember 2026' },
      { nafn: 'Laugavegur', heimilisfang: 'Laugavegur 95–99, 101 Reykjavík', sl: 15, slo: null, br: true, y: [['ok', 'no'], ['ok', 'ok'], ['ok', 'ok'], ['ok', 'no']], nt: 'Tæki: ágúst 2027|Kerfi: september 2026' },
      { nafn: 'Miðgarður', heimilisfang: 'Laugavegur 120, 101 Reykjavík', sl: 31, slo: null, br: true, y: [['ok', 'no'], ['ok', 'ok'], ['no', 'ok'], ['ok', 'no']], nt: 'Tæki: september 2027|Kerfi: september 2026' },
      { nafn: 'Plaza', heimilisfang: 'Aðalstræti 4–6, 101 Reykjavík', sl: 44, slo: 39, br: true, y: [['ok', 'no'], ['ok', 'ok'], ['ok', 'ok'], ['no', 'no']], nt: 'Tæki: ágúst 2026|Kerfi: desember 2026' },
      { nafn: 'Skjaldbreið', heimilisfang: 'Laugavegur 16, 101 Reykjavík', sl: 3, slo: null, br: true, y: [['no', 'ok'], ['ok', 'ok'], ['ok', 'ok'], ['ok', 'no']], nt: 'Tæki: júlí 2027|Kerfi: september 2026' },
    ],
    reports: [
      { dags: '2026-08-03', bygging: 'Klöpp', heimilisfang: 'Klapparstígur 26', tegund: 'Slökkvitæki og slöngur', magn: '18 + 10', ar: 2026 },
      { dags: '2026-08-03', bygging: 'Skjaldbreið', heimilisfang: 'Laugavegur 16', tegund: 'Slökkvitæki', magn: '3', ar: 2026 },
      { dags: '2026-05-01', bygging: 'Arnarhvoll', heimilisfang: 'Ingólfsstræti 1', tegund: 'Brunakerfi', magn: null, ar: 2026 },
      { dags: '2026-03-01', bygging: 'Grandi', heimilisfang: 'Seljavegur 2', tegund: 'Brunakerfi', magn: null, ar: 2026 },
      { dags: '2026', bygging: 'Grandi', heimilisfang: 'Seljavegur 2', tegund: 'Slökkvitæki og slöngur', magn: '14 + 11', ar: 2026 },
      { dags: '2025-12-01', bygging: 'Plaza', heimilisfang: 'Aðalstræti 4–6', tegund: 'Brunakerfi', magn: null, ar: 2025 },
      { dags: '2025-10-01', bygging: 'Klöpp', heimilisfang: 'Klapparstígur 26', tegund: 'Brunakerfi', magn: null, ar: 2025 },
      { dags: '2025-09-01', bygging: 'Laugavegur', heimilisfang: 'Laugavegur 95–99', tegund: 'Brunakerfi', magn: null, ar: 2025 },
      { dags: '2025-09-01', bygging: 'Miðgarður', heimilisfang: 'Laugavegur 120', tegund: 'Brunakerfi', magn: null, ar: 2025 },
      { dags: '2025-09-01', bygging: 'Skjaldbreið', heimilisfang: 'Laugavegur 16', tegund: 'Brunakerfi', magn: null, ar: 2025 },
      { dags: '2025-09-01', bygging: 'Þingholt', heimilisfang: 'Þingholtsstræti 3–5', tegund: 'Brunakerfi', magn: null, ar: 2025 },
    ],
    invoices: [
      { nr: 'R-000668', dags: '2026-08-03', bygging: 'Klöpp', lysing: 'Úttekt — slökkvitæki og brunaslöngur', upphaed: 174747, tegund: 'Slökkvitæki' },
      { nr: 'R-000670', dags: '2026-08-03', bygging: 'Skjaldbreið', lysing: 'Úttekt — slökkvitæki', upphaed: 19778, tegund: 'Slökkvitæki' },
      { nr: 'R-107802', dags: '2026', bygging: 'Plaza', lysing: 'Þjónusta', upphaed: null, tegund: 'Slökkvitæki' },
      { nr: 'R-108001', dags: '2026', bygging: 'Grandi', lysing: 'Þjónusta', upphaed: null, tegund: 'Brunakerfi' },
      { nr: 'R-108134', dags: '2026', bygging: 'Grandi', lysing: 'Þjónusta', upphaed: null },
      { nr: 'R-107257', dags: '2025', bygging: 'Plaza', lysing: 'Úttekt', upphaed: null },
      { nr: 'R-107258', dags: '2025', bygging: 'Arnarhvoll', lysing: 'Úttekt', upphaed: null },
      { nr: 'R-107259', dags: '2025', bygging: 'Miðgarður', lysing: 'Úttekt', upphaed: null },
      { nr: 'R-107260', dags: '2025', bygging: 'Laugavegur', lysing: 'Úttekt', upphaed: null },
      { nr: 'R-107261', dags: '2025', bygging: 'Þingholt', lysing: 'Úttekt', upphaed: null },
      { nr: 'R-107053', dags: '2025', bygging: 'Skjaldbreið', lysing: 'Þjónusta', upphaed: null },
    ],
    messages: [
      { sender: 'starf', author_name: 'Slökkvitæki', body: 'Sæl! Úttekt á Klöpp er lokið og skýrslan komin inn.', created_at: '2026-08-03T10:12:00' },
      { sender: 'kunni', author_name: 'Center Hótel', body: 'Takk fyrir! Getið þið sent afrit af reikningi fyrir Skjaldbreið?', created_at: '2026-08-04T09:20:00' },
    ],
  };


  // Sýnishorn: tækjaskrá búin til úr fjölda tækja svo spjaldið „nánari upplýsingar“ sjáist
  function demoEquipment(b) {
    var LOC = ['Móttaka', '1. hæð — gangur', '2. hæð — gangur', '3. hæð — gangur', 'Eldhús', 'Kjallari', 'Stigagangur', 'Þvottahús', 'Bílakjallari', 'Tæknirými'];
    var out = [], n = b.sl || 0, i;
    for (i = 0; i < n; i++) {
      var co2 = i % 6 === 5;
      out.push({ tegund: co2 ? 'CO2' : 'Léttvatn', staerd: co2 ? '2 kg' : '6 L', stadsetning: LOC[i % LOC.length],
        nr: 'AE2026-' + String(1000 + i * 7 + n), sidast: '2026-08-24', naest: '2027-08-24', lan: false });
    }
    for (i = 0; i < (b.slo || 0); i++) {
      out.push({ tegund: 'Brunaslanga', staerd: '25 m', stadsetning: LOC[(i + 2) % LOC.length], nr: null, sidast: '2026-08-24', naest: '2027-08-24', lan: false });
    }
    return out;
  }

  // Sýnishorn: grunnmynd (SVG) per hæð með merkjum, greiningu og einni 3D-mynd
  function demoPlan(n) {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="#fff"/>' +
      '<g fill="none" stroke="#1f1f1f" stroke-width="12"><rect x="70" y="70" width="1060" height="760"/></g><g stroke="#2b2b2b" stroke-width="6" fill="none">' +
      '<path d="M70 380H520M600 380H1130M70 520H330M410 520H1130"/>';
    for (var x = 200 + (n % 3) * 20; x < 1100; x += 150) s += '<path d="M' + x + ' 70V310M' + x + ' 590V830"/>';
    s += '</g><g fill="#9aa0a8" font-family="Arial" font-size="22">';
    for (var r = 0; r < 6; r++) s += '<text x="' + (110 + r * 160) + '" y="230">' + (n * 100 + r + 1) + '</text><text x="' + (110 + r * 160) + '" y="700">' + (n * 100 + r + 11) + '</text>';
    s += '</g><path d="M560 380v140" stroke="#2b2b2b" stroke-width="6"/><rect x="545" y="410" width="60" height="80" fill="none" stroke="#555" stroke-width="3"/></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
  }
  function demo3d() {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000" viewBox="0 0 1400 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f5f7"/><stop offset="1" stop-color="#dfe2e6"/></linearGradient></defs>' +
      '<rect width="1400" height="1000" fill="url(#g)"/><path d="M700 230 1210 500 700 770 190 500Z" fill="#fbfbfa" stroke="#c9ccd1" stroke-width="2"/>';
    var veggir = [[700, 230, 1210, 500], [700, 230, 190, 500], [445, 365, 955, 635], [570, 297, 315, 432], [825, 297, 1080, 432], [955, 365, 700, 500]];
    veggir.forEach(function (v) {
      s += '<path d="M' + v[0] + ' ' + v[1] + 'L' + v[2] + ' ' + v[3] + 'L' + v[2] + ' ' + (v[3] - 70) + 'L' + v[0] + ' ' + (v[1] - 70) + 'Z" fill="#e9ebee" stroke="#9aa0a8" stroke-width="2"/>' +
        '<path d="M' + v[0] + ' ' + (v[1] - 70) + 'L' + v[2] + ' ' + (v[3] - 70) + '" stroke="#6b7280" stroke-width="3"/>';
    });
    [[520, 470, '#e11d2e'], [820, 520, '#e11d2e'], [640, 600, '#15803d'], [930, 430, '#e11d2e']].forEach(function (m) {
      s += '<circle cx="' + m[0] + '" cy="' + m[1] + '" r="13" fill="' + m[2] + '" stroke="#fff" stroke-width="4"/>';
    });
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s + '</svg>');
  }
  function demoTeikning(b, bi) {
    var nofn = ['Kjallari', '1. hæð', '2. hæð', '3. hæð', '4. hæð', '5. hæð', '6. hæð'];
    var fj = [3, 6, 2, 4, 3, 5, 4, 2][bi % 8];
    var L = { 'Léttvatn': '#0f9488', 'CO2': '#111827', 'Brunaslanga': '#be123c', 'Útgangsmerki': '#15803d' };
    return nofn.slice(0, fj).map(function (nafn, n) {
      var merki = [], taeki = {}, mk = {};
      function bk(x, y, l, merkiB) { merki.push([x, y, L[l]]); var box = merkiB ? mk : taeki; box[l] = box[l] || { n: 0, c: L[l] }; box[l].n++; }
      for (var x = 160; x < 1100; x += 230) bk(x + n * 7, 450, 'Léttvatn');
      bk(540, 450, 'CO2'); if (n % 2) bk(1060, 430, 'Brunaslanga');
      bk(120, 120, 'Útgangsmerki', true); bk(1080, 780, 'Útgangsmerki', true);
      return { nafn: nafn, fjoldi: merki.length, mynd: demoPlan(n + bi), frum: { b: 1200, h: 900 }, skurdur: null, merki: merki,
        threed: (n === 1 && bi < 3) ? { url: demo3d(), b: 1400, h: 1000 } : null,
        greining: { taeki: taeki, merki: mk, ei60: n % 3 === 1 ? 2 : 0, ei30: n % 2 } };
    });
  }

  var SLUG = (function () { var m = /[?&]c=([^&]+)/.exec(location.search); return m ? decodeURIComponent(m[1]) : ''; })();
  var state = { data: null, demo: false, open: false };

  /* ── boot ── */
  function boot() {
    var demo = /[?&]demo=1/.test(location.search);
    if (demo) {
      state.demo = true;
      var qt = /[?&]theme=([a-z]+)/.exec(location.search); // ?theme=cream til að forskoða þema
      if (qt) DEMO.account.theme = qt[1];
      // Sýnishornið sýnir „nánari upplýsingar“ (?details=0 slekkur)
      DEMO.account.details = !/[?&]details=0/.test(location.search);
      if (DEMO.account.details) DEMO.buildings.forEach(function (b, bi) { b.equipment = demoEquipment(b); b.teikning = demoTeikning(b, bi); });
      DEMO.account.syn = {}; Object.keys(SYN_DEF).forEach(function (k) { DEMO.account.syn[k] = SYN_DEF[k]; });
      demoEignagatt();
      if (window.GattVinnusvaedi) GattVinnusvaedi.demo(DEMO);
      renderPortal(DEMO); showDemoRibbon(); return;
    }
    fetch('/api/gatt', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (r.ok) return r.json().then(function (d) { renderPortal(normalize(d)); });
        return gateBySlug();   // ekki innskráð → athuga slug-stöðu
      })
      .catch(function () { gateBySlug(); });
  }

  // Ekki innskráð: innskráningarglugginn opnast AÐEINS ef félags-URL er virkt
  // (aðgangsorð+lykilorð sett). Annars „vefurinn ekki virkur enn".
  function gateBySlug() {
    if (!SLUG) { showLogin(); return; }
    return fetch('/api/gatt-status?c=' + encodeURIComponent(SLUG), { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        if (s && s.theme) document.documentElement.setAttribute('data-theme', s.theme);
        if (s && s.active) showLogin();       // lykilorð virkt → innskráning
        else if (s && s.open) openBoot();      // opinn forsýnar-aðgangur → raungögn án innskráningar
        else showNotReady(s && s.name);
      })
      .catch(function () { showLogin(); });
  }

  // Opinn aðgangur (virkur + ekkert lykilorð): sækir raungögn félagsins um
  // slug ÁN innskráningar. Læsist um leið og lykilorð er sett.
  function openBoot() {
    fetch('/api/gatt?c=' + encodeURIComponent(SLUG), { headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) { state.open = true; renderPortal(normalize(d)); showOpenRibbon(); })
      .catch(function () { showNotReady(); });
  }
  function showNotReady(name) {
    $('#login').classList.add('hidden');
    $('#portal').classList.add('hidden');
    if (name) $('#notready-name').textContent = 'Aðgangur fyrir ' + name + ' hefur ekki verið virkjaður enn.';
    $('#notready').classList.remove('hidden');
  }

  /* Map API-svar → sama form og DEMO */
  function normalize(d) {
    var s = d.stats || {};
    var out = {
      account: d.account || {},
      stats: [
        { k: 'Byggingar', v: s.byggingar != null ? String(s.byggingar) : '—' },
        { k: 'Slökkvitæki', v: s.taeki_alls != null ? String(s.taeki_alls) : '—' },
        { k: 'Brunaslöngur', v: s.brunaslongur_alls != null ? String(s.brunaslongur_alls) : '—' },
        { k: 'Brunakerfi', v: s.brunakerfi_stk != null ? String(s.brunakerfi_stk) : '—', s: 'hús' },
        { k: 'Skoðun á tíma', v: s.i_lagi != null ? String(s.i_lagi) : '—', s: 'hús', dark: true },
      ],
      buildings: (d.buildings || []).map(function (b) {
        return { nafn: b.nafn, heimilisfang: b.heimilisfang, sl: b.taeki, slo: b.slo, br: !!b.bru_i_thjonustu,
          y: yearsFromStatus(b), nt: nextInspText(b), docId: null, stada: b.stada,
          id: b.id, equipment: Array.isArray(b.equipment) ? b.equipment : null,
          teikning: Array.isArray(b.teikning) ? b.teikning : null,
          eign: b.eign || null, beidni: !!b.beidni, bru_lysing: b.bru_lysing || null, prufa: !!b.prufa,
          i_thjonustu: b.i_thjonustu, skodun_manudur: b.skodun_manudur, bru_skodun_manudur: b.bru_skodun_manudur,
          ar_slokk: b.ar_slokk || [], ar_bru: b.ar_bru || [], sidasta_ar: b.sidasta_ar,
          kerfi: Array.isArray(b.kerfi) ? b.kerfi : [], flokkun: b.flokkun || null,
          eldvarnabok: Array.isArray(b.eldvarnabok) ? b.eldvarnabok : null };
      }),
      reports: (d.reports || []).map(function (r) {
        return { docId: r.docId, dags: r.dags || r.ar, bygging: r.bygging, heimilisfang: '', tegund: TYPE_LABEL[r.tegund] || r.tegund, magn: r.magn, ar: r.ar };
      }),
      invoices: (d.invoices || []).map(function (i) {
        return { docId: i.docId, nr: i.nr, dags: i.dags || i.ar, bygging: i.bygging, lysing: i.lysing || '', upphaed: i.upphaed, tegund: INV_TEG[i.tegund] || i.tegund || '' };
      }),
      messages: d.messages || [],
      erindi: d.erindi || [],
      items: d.items || [],
      checklist: d.checklist || [],
      vidhald: d.vidhald || [],
      eignir_utan: (d.eignir_utan || []).map(function (b) { return { id: b.id, nafn: b.nafn, heimilisfang: b.heimilisfang || '', eign: b.eign || null, beidni: !!b.beidni, teikning: Array.isArray(b.teikning) ? b.teikning : null, kerfi: Array.isArray(b.kerfi) ? b.kerfi : [], flokkun: b.flokkun || null }; }),
    };
    afskeyta(out);
    return out;
  }

  // „Reitir - Kringlan" → „Kringlan": félagsforskeytið fer þegar ALLAR eignir bera það
  // (skýrslur/reikningar fá sömu meðferð svo síun eftir eign haldist rétt).
  function afskeyta(o) {
    var nofn = (o.buildings || []).concat(o.eignir_utan || []).map(function (b) { return b.nafn || ''; });
    if (!nofn.length || nofn[0].indexOf(' - ') < 0) return;
    var pre = nofn[0].split(' - ')[0] + ' - ';
    if (!nofn.every(function (n) { return n.indexOf(pre) === 0; })) return;
    function kl(x) { return (x && String(x).indexOf(pre) === 0) ? String(x).slice(pre.length) : x; }
    (o.buildings || []).concat(o.eignir_utan || []).forEach(function (b) { b.nafn = kl(b.nafn); });
    (o.reports || []).forEach(function (r) { r.bygging = kl(r.bygging); });
    (o.invoices || []).forEach(function (r) { r.bygging = kl(r.bygging); });
  }
  var MONTHS_IS = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  function lastDocYear(arr) {
    var m = 0;
    (arr || []).forEach(function (y) { var n = Number(y); if (n > m) m = n; });
    return m || null;
  }
  // Tvær línur þegar húsið er í báðum þjónustum — slökk og brunakerfi ráða
  // hvor sinni dagsetningu. Aldrei eitt „næsta skoðun" fyrir báðar.
  function nextInspText(b) {
    var lines = [];
    function line(lbl, month, last) {
      if (!month || month < 1 || month > 12) return;
      var yr = last ? (Number(last) + 1) : null;
      lines.push(lbl + ': ' + MONTHS_IS[month - 1] + (yr ? ' ' + yr : ''));
    }
    if (b.i_thjonustu !== false) line('Tæki', b.skodun_manudur, lastDocYear(b.ar_slokk) || b.sidasta_ar);
    if (b.bru_i_thjonustu) line('Kerfi', b.bru_skodun_manudur, lastDocYear(b.ar_bru));
    return lines.join('|');
  }

  function yearsFromStatus(b) {
    // Hvert ár sýnir tvö merki: [slökkvitæki, brunakerfi].
    // AÐEINS ár þar sem raunverulegt skjal er til á ÞESSU fyrirtaeki_id.
    // Aldrei fylla slökk áfram frá sidasta_ar (Miðgarður '25 / Plaza '26).
    var sl = {}; (b.ar_slokk || []).forEach(function (y) { sl[String(y)] = 1; });
    var bru = {}; (b.ar_bru || []).forEach(function (y) { bru[String(y)] = 1; });
    return ['2023', '2024', '2025', '2026'].map(function (y) {
      return [sl[y] ? 'ok' : 'no', bru[y] ? 'ok' : 'no'];
    });
  }

  /* ── LOGIN ── */
  function showLogin(msg) {
    $('#portal').classList.add('hidden');
    $('#notready').classList.add('hidden');
    $('#login').classList.remove('hidden');
    if (msg) $('#lerr').textContent = msg;
  }
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    $('#lerr').textContent = '';
    var email = $('#email').value, password = $('#password').value;
    fetch('/api/gatt-login', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: password }),
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.ok) { $('#login').classList.add('hidden'); boot(); }
        else $('#lerr').textContent = res.j.error || 'Rangt netfang eða lykilorð';
      })
      .catch(function () { $('#lerr').textContent = 'Villa við innskráningu. Reyndu aftur.'; });
  });

  /* ── PORTAL ── */
  function renderPortal(data) {
    state.data = data;
    document.documentElement.setAttribute('data-theme', (data.account && data.account.theme) || 'steel');
    $('#login').classList.add('hidden');
    $('#portal').classList.remove('hidden');
    var lo = $('#logoutBtn'); if (lo) lo.style.display = state.open ? 'none' : '';  // ekkert að útskrá í opnum ham
    var d = new Date();
    var today = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
    $('#yf-kicker').textContent = 'Staða brunavarna · uppfært ' + today;
    if (data.account && data.account.name) $('#htag').innerHTML = 'Þjónustuvefur · <b>' + esc(data.account.name) + '</b>';
    renderCards(data.stats);
    renderYfirlit(data.buildings);
    renderChips('#sk-chips', data.reports, renderSkyrslur);
    renderChips('#re-chips', data.invoices, renderReikningar);
    renderSkyrslur('');
    renderReikningar('');
    renderEignasafn();
    renderYfTools();
    renderEgYfir();
    renderEldvarnabok();
    if (window.GattVinnusvaedi) GattVinnusvaedi.render();
    renderMessages(data.messages);
    wireNav();
  }

  function renderMessages(msgs) {
    msgs = msgs || [];
    var box = $('#msg-thread');
    if (!msgs.length) { box.innerHTML = '<div class="msg-empty">Engin skilaboð enn. Sendu okkur fyrirspurn hér að neðan.</div>'; }
    else {
      box.innerHTML = msgs.map(function (m) {
        var who = m.sender === 'kunni' ? (m.author_name || 'Þú') : 'Slökkvitæki ehf.';
        return '<div class="msg-bubble ' + (m.sender === 'kunni' ? 'kunni' : 'starf') + '">' +
          '<div class="who">' + esc(who) + '</div>' + esc(m.body) +
          '<div class="t">' + esc(fmtDate(m.created_at)) + '</div></div>';
      }).join('');
      box.scrollTop = box.scrollHeight;
    }
  }

  function renderCards(stats) {
    $('#cards').innerHTML = (stats || []).map(function (c) {
      return '<div class="sc' + (c.dark ? ' dark' : '') + '">' + icon(c.k) + '<div class="k">' + esc(c.k) + '</div>' +
        '<div class="v' + (String(c.v).length >= 9 ? ' xl' : String(c.v).length >= 6 ? ' l' : '') + '">' + esc(c.v) + (c.s ? ' <small' + (String(c.s).length > 3 ? ' class="nl"' : '') + '>' + esc(c.s) + '</small>' : '') + '</div></div>';
    }).join('');
  }

  function markCell(pair) {
    function m(v) { return v === 'ok' ? '<span class="ok">✓</span>' : v === 'due' ? '<span class="due">!</span>' : '<span class="no">—</span>'; }
    return '<div class="mk">' + m(pair[0]) + ' ' + m(pair[1]) + '</div>';
  }
  function renderYfirlit(bldgs) {
    var yrs = ["'23", "'24", "'25", "'26"];
    var det = !!(state.data && state.data.account && state.data.account.details);
    $('#yf-body').innerHTML = (bldgs || []).map(function (b, bi) {
      var boxes = (b.y || []).map(function (p, i) {
        return '<div class="yb"><div class="yy">' + yrs[i] + '</div>' + markCell(p) + '</div>';
      }).join('');
      var next = '';
      if (b.nt) {
        var parts = b.nt.split('|');
        next = parts.map(function (line) {
          var kv = line.split(':');
          var lbl = kv.shift(), val = kv.join(':').trim();
          var isOn = b.ontime && val.indexOf(b.ontime) > -1;
          return '<div><span class="lbl">' + esc(lbl) + ':</span> ' + (isOn ? '<b>' + esc(val) + '</b><span class="badge">Á tíma</span>' : esc(val)) + '</div>';
        }).join('');
      }
      var cls = (b.ontime ? 'ontime' : '') + (det ? ' clk' : '');
      return '<tr data-i="' + bi + '"' + (cls.trim() ? ' class="' + cls.trim() + '"' : '') + (det ? ' title="Opna eignasíðu"' : '') + '>' +
        '<td><div class="bcell">' + (b.eign && b.eign.mynd ? '<span class="bic ph" style="background-image:url(\'' + esc(imgW(b.eign.mynd, 360)) + '\')"></span>' : '<span class="bic">' + svgIc('Byggingar') + '</span>') + '<div><div class="bname">' + esc(b.nafn) + '</div><div class="baddr">' + esc(b.heimilisfang) + '</div></div></div></td>' +
        '<td class="num">' + (b.sl != null ? b.sl : '—') + '</td>' +
        '<td class="num">' + (b.slo != null ? b.slo : '—') + '</td>' +
        '<td>' + kerfiCell(b) + '</td>' +
        '<td><div class="yrs">' + boxes + '</div></td>' +
        '<td><div class="next">' + (next || '<span class="dim">—</span>') + '</div></td>' +
        // 09.10.2026: byggingin á engin eitt skjal (docId alltaf null) — „Skjöl" opnar Skýrslur síaðar á bygginguna.
        '<td class="r"><div class="ract"><a class="pdf" href="#" data-skjol="' + esc(b.nafn) + '">' + svgIc('mappa') + 'Skjöl</a>' +
        '<button type="button" class="pdf" data-erindi-b="' + bi + '" title="Senda fyrirspurn eða bæta við þjónustu">' + svgIc('erindi') + 'Erindi' + (opinErindi(b) ? '<i class="nb">' + opinErindi(b) + '</i>' : '') + '</button></div></td></tr>';
    }).join('') || '<tr><td colspan="7" class="empty">Engar byggingar skráðar</td></tr>';
    foot('#yf-foot', (bldgs || []).length, (bldgs || []).length, ['bygging', 'byggingar'], ['byggingu', 'byggingum'], '');
    if (yfSia.q || yfSia.s) yfSiaBeita();
  }

  function docLink(label, docId) {
    if (state.demo || !docId) return '<a class="pdf" href="#" onclick="return false">' + svgIc('pdf', 1.8) + label + '</a>';
    // Opinn ham: gatt-doc opnar skjöl félagsins með ?c=<slug> (án innskráningar).
    var href = '/api/gatt-doc?doc=' + encodeURIComponent(docId) + (state.open ? '&c=' + encodeURIComponent(SLUG) : '');
    return '<a class="pdf" href="' + href + '" target="_blank" rel="noopener">' + svgIc('pdf', 1.8) + label + '</a>';
  }

  function buildingsOf(rows) {
    var seen = {}, out = [];
    (rows || []).forEach(function (r) { if (r.bygging && !seen[r.bygging]) { seen[r.bygging] = 1; out.push(r.bygging); } });
    return out;
  }
  function renderChips(sel, rows, onPick) {
    var names = buildingsOf(rows);
    var html = '<button class="chip on" data-b="">Allar byggingar</button>' +
      names.map(function (n) { return '<button class="chip" data-b="' + esc(n) + '">' + esc(n) + '</button>'; }).join('');
    var box = $(sel); box.innerHTML = html;
    box.querySelectorAll('.chip').forEach(function (c) {
      c.addEventListener('click', function () {
        box.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('on'); });
        c.classList.add('on');
        onPick(c.getAttribute('data-b'));
      });
    });
  }

  function renderSkyrslur(filter) {
    var rows = (state.data.reports || []).filter(function (r) { return !filter || r.bygging === filter; });
    $('#sk-body').innerHTML = rows.map(function (r) {
      return '<tr><td class="num">' + esc(fmtDate(r.dags)) + '</td>' +
        '<td><span class="bname" style="font-size:17px">' + esc(r.bygging) + '</span></td>' +
        '<td class="dim">' + esc(r.heimilisfang || '') + '</td>' +
        '<td>' + tegundPilla(r.tegund) + '</td>' +
        '<td class="num">' + (r.magn != null ? esc(r.magn) : '<span class="dim">—</span>') + '</td>' +
        '<td class="num">' + esc(r.ar || '') + '</td>' +
        '<td class="r">' + docLink('PDF', r.docId) + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="empty">Engar skýrslur skráðar</td></tr>';
    foot('#sk-foot', rows.length, (state.data.reports || []).length, ['skýrsla', 'skýrslur'], ['skýrslu', 'skýrslum'], filter);
  }

  function renderReikningar(filter) {
    var rows = (state.data.invoices || []).filter(function (r) { return !filter || r.bygging === filter; });
    $('#re-body').innerHTML = rows.map(function (r) {
      return '<tr><td class="kt">' + esc(r.nr || '—') + '</td>' +
        '<td class="num">' + esc(fmtDate(r.dags)) + '</td>' +
        '<td><span class="bname" style="font-size:17px">' + esc(r.bygging) + '</span></td>' +
        '<td>' + tegundPilla(r.tegund) + '</td>' +
        '<td class="dim">' + esc(r.lysing || '') + '</td>' +
        '<td class="r num">' + (r.upphaed != null ? esc(fmtKr(r.upphaed)) : '<span class="dim">—</span>') + '</td>' +
        '<td class="r">' + docLink('PDF', r.docId) + '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="empty">Engir reikningar skráðir</td></tr>';
    foot('#re-foot', rows.length, (state.data.invoices || []).length, ['reikningur', 'reikningar'], ['reikningi', 'reikningum'], filter);
  }

  /* ── nav / lang / logout ── */
  var VIEWS = ['yfirlit', 'vinnusvaedi', 'eldvarnabok', 'skyrslur', 'reikningar', 'verkbeidnir', 'skilabod'];
  function goView(v) {
    document.querySelectorAll('nav .tab').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-view') === v); });
    VIEWS.forEach(function (name) { $('#v-' + name).classList.toggle('hidden', name !== v); });
  }
  // „Skjöl" á Yfirliti → Skýrslur síaðar á þá byggingu (smellir á sama flís og notandinn myndi gera).
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-skjol]'); if (!a) return;
    e.preventDefault();
    var n = a.getAttribute('data-skjol'); goView('skyrslur'); window.scrollTo(0, 0);
    var chips = document.querySelectorAll('#v-skyrslur .chip'), hit = null;
    chips.forEach(function (c) { if (c.getAttribute('data-b') === n) hit = c; });
    if (hit) hit.click(); else { chips.forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-b') === ''); }); renderSkyrslur(n); }
  });
  function wireNav() {
    document.querySelectorAll('nav .tab').forEach(function (t) {
      t.onclick = function () {
        document.querySelectorAll('nav .tab').forEach(function (x) { x.classList.remove('on'); });
        t.classList.add('on');
        var v = t.getAttribute('data-view');
        VIEWS.forEach(function (name) {
          $('#v-' + name).classList.toggle('hidden', name !== v);
        });
      };
    });
    $('#logoutBtn').onclick = function () {
      if (state.demo) { showLogin(); return; }
      fetch('/api/gatt-login', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) })
        .then(function () { location.reload(); });
    };
    // EN/IS þýðingar ekki komnar — takki sem gerir ekkert er falinn þar til þær koma (09.10.2026).
    var lb = $('#langBtn'); if (lb) lb.style.display = 'none';
    $('#msg-form').onsubmit = function (e) {
      e.preventDefault();
      var inp = $('#msg-input'), text = inp.value.trim();
      if (!text) return;
      if (state.demo) {
        state.data.messages.push({ sender: 'kunni', author_name: 'Þú', body: text, created_at: new Date().toISOString() });
        renderMessages(state.data.messages); inp.value = ''; return;
      }
      var btn = e.target.querySelector('button'); btn.disabled = true;
      var purl = state.open ? ('/api/gatt?c=' + encodeURIComponent(SLUG)) : '/api/gatt';
      fetch(purl, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text }) })
        .then(function (r) { return r.json(); })
        .then(function () {
          state.data.messages.push({ sender: 'kunni', author_name: state.data.account.name || 'Þú', body: text, created_at: new Date().toISOString() });
          renderMessages(state.data.messages); inp.value = '';
        })
        .catch(function () {})
        .then(function () { btn.disabled = false; });
    };
  }

  function showDemoRibbon() {
    var r = document.createElement('div'); r.className = 'demo-ribbon'; r.textContent = 'Sýnishorn';
    document.body.appendChild(r);
  }

  function showOpenRibbon() {
    var r = document.createElement('div'); r.className = 'open-ribbon';
    r.innerHTML = svgIc('las', 1.9) + 'Opinn aðgangur — vefurinn læsist þegar lykilorð er sett';
    document.body.appendChild(r);
  }


  /* ── EIGNASÍÐA (portal_users.show_details + syn) ─────────────────────────────
     Smellur á eign opnar eignasíðu: yfirlit, teikningar hverrar hæðar (2D með merkjum
     eða vistuð 3D-mynd, stækka + sækja), greining teikninga, tækjaskrá, skýrslur og
     reikningar. syn (valið á gatt-admin) ræður hvaða hlutar sjást. */
  // Verkfæraskráin (gatt/verkfaeri.js, hlaðin á undan): lykill → sjálfgefið; ótilbúið tól er alltaf slökkt
  var SYN_DEF = {};
  (window.GATT_VERKFAERI || []).forEach(function (v) { SYN_DEF[v.k] = !!(v.sjalfgefid && v.tilbuid); });
  var SYN_TILBUID = {}; (window.GATT_VERKFAERI || []).forEach(function (v) { SYN_TILBUID[v.k] = !!v.tilbuid; });
  function synOf() {
    var a = (state.data && state.data.account) || {}, s = {};
    Object.keys(SYN_DEF).forEach(function (k) { s[k] = (a.syn && typeof a.syn[k] === 'boolean' ? a.syn[k] : SYN_DEF[k]) && SYN_TILBUID[k]; });
    return s;
  }
  var drOpen = -1, drB = null;
  function bldgAt(i) { return ((state.data && state.data.buildings) || [])[i] || null; }

  // Myndir sóttar einu sinni á lotu (sama blað á oft margar hæðir)
  var myndir = {};
  // Hreint PDF (Hafnarfjörður o.fl.: teikn-mynd skilar PDF-inu sjálfu, sem <img> sýnir ekki) er teiknað
  // með pdf.js eins og í Teikningu appsins (435 TeiknGaedi): sama PDF-leið (teikn-pdf) og sama útgáfa.
  // Kvarðinn reiknast af breidd strigans á móti frum.b, svo skurður og merki lenda rétt.
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  function pdfSlod(url) {
    try {
      var u = new URL(url, location.href), inn = u.searchParams.get('url') || '';
      if (!/teikn-mynd/.test(u.pathname) || !inn || !/\.pdf$/i.test(new URL(inn).pathname)) return '';
      return '/.netlify/functions/teikn-pdf?url=' + encodeURIComponent(inn);
    } catch (_) { return ''; }
  }
  var pdfJsP = null;
  function saekjaPdfJs() {
    if (window.pdfjsLib) return Promise.resolve();
    if (!pdfJsP) pdfJsP = new Promise(function (res, rej) {
      var sk = document.createElement('script'); sk.src = PDFJS + 'pdf.min.js';
      sk.onload = function () { try { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js'; } catch (_) {} res(); };
      sk.onerror = function () { pdfJsP = null; rej(new Error('pdf.js')); };
      document.head.appendChild(sk);
    });
    return pdfJsP;
  }
  function rastaPdf(slod, hlid) {
    return saekjaPdfJs()
      .then(function () { return fetch(slod); })
      .then(function (r) { if (!r.ok) throw new Error('pdf'); return r.arrayBuffer(); })
      .then(function (buf) { return window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise; })
      .then(function (doc) { return doc.getPage(1); })
      .then(function (sida) {
        var v0 = sida.getViewport({ scale: 1 }), vp = sida.getViewport({ scale: hlid / Math.max(v0.width, v0.height, 1) });
        var cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(vp.width)); cv.height = Math.max(1, Math.round(vp.height));
        var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
        return sida.render({ canvasContext: cx, viewport: vp }).promise.then(function () { return cv; });
      });
  }
  function hladaMynd(url) {
    if (!myndir[url]) {
      var ps = pdfSlod(url);
      myndir[url] = (ps ? rastaPdf(ps, 3000) : new Promise(function (res, rej) {
        var i = new Image();
        i.onload = function () { res(i); };
        i.onerror = function () { rej(new Error('mynd')); };
        i.src = url;
      })).catch(function (e) { delete myndir[url]; throw e; });
    }
    return myndir[url];
  }
  // Teikning hæðar á striga: skurður (frumdílar → myndadílar) og merkin í lit tegundar — sama reikningur og 456 í appinu
  function teiknaHaed(c, f, hamark) {
    return hladaMynd(f.mynd).then(function (img) {
      var nb = img.naturalWidth || img.width, nh = img.naturalHeight || img.height;
      var k0 = f.frum && f.frum.b > 0 ? nb / f.frum.b : 1;
      var sk = f.skurdur || { x: 0, y: 0, w: nb / k0, h: nh / k0 };
      var sx = Math.max(0, Math.min(nb - 2, sk.x * k0)), sy = Math.max(0, Math.min(nh - 2, sk.y * k0));
      var sw = Math.max(1, Math.min(nb - sx, sk.w * k0)), sh = Math.max(1, Math.min(nh - sy, sk.h * k0));
      var k = Math.min(1, (hamark || 1100) / Math.max(sw, sh));
      c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k));
      var x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      var r = Math.max(3.5, c.width / 130);
      (f.merki || []).forEach(function (m) {
        var mx = +m[0], my = +m[1];
        if (!isFinite(mx) || !isFinite(my)) return;
        if (mx <= 1 && my <= 1) { mx = mx * nb / k0; my = my * nh / k0; }   // eldri hlutfallsmerki
        var px = (mx - sk.x) * k0 * k, py = (my - sk.y) * k0 * k;
        if (px < -r || py < -r || px > c.width + r || py > c.height + r) return;
        x.beginPath(); x.arc(px, py, r, 0, 2 * Math.PI);
        x.fillStyle = m[2] || '#e11d2e'; x.fill();
        x.lineWidth = Math.max(1, r * 0.35); x.strokeStyle = '#fff'; x.stroke();
      });
      // Verkbeiðnapunktar ofan á (eignagatt.js) — sami kvarði og merkin, svo smellur reiknast til baka í frumdíla
      if (window.GattPunktar) GattPunktar.teikna(c, f, { k0: k0, k: k, sk: sk, nb: nb, nh: nh });
      return c;
    });
  }
  function synaHaed(box, f, ham, hamark) {
    if (ham === '3d' && f.threed) {
      box.innerHTML = '<img alt="3D · ' + esc(f.nafn) + '" src="' + esc(f.threed.url) + '">';
      box.firstChild.onerror = function () { box.innerHTML = '<div class="ft">3D-myndin fannst ekki</div>'; };
      return;
    }
    if (!f.mynd) { box.innerHTML = '<div class="ft">Engin teikning á hæðinni</div>'; return; }
    box.innerHTML = '<div class="ft">Sæki teikningu…</div>';
    var c = document.createElement('canvas');
    teiknaHaed(c, f, hamark).then(function () { box.innerHTML = ''; box.appendChild(c); },
      function () { box.innerHTML = '<div class="ft">Teikningin opnast ekki í forskoðun</div>'; });
  }
  function nafnSkrar(b, f, ext) {
    return (String((b && b.nafn) || 'eign') + ' - ' + String(f.nafn || 'hæð')).replace(/[\\/:*?"<>|]+/g, '').trim() + ext;
  }
  function vistaBlob(blob, nafn) {
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nafn;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  // Sækja: 3D = vistaða myndin; teikning = hæðin teiknuð í hárri upplausn með merkjunum (PNG)
  function saekja(b, f, ham) {
    if (ham === '3d' && f.threed) {
      fetch(f.threed.url).then(function (r) { if (!r.ok) throw 0; return r.blob(); })
        .then(function (bl) { vistaBlob(bl, nafnSkrar(b, f, ' (3D).jpg')); }, function () { window.open(f.threed.url, '_blank', 'noopener'); });
      return;
    }
    if (!f.mynd) return;
    toast('Útbý teikninguna…');
    var c = document.createElement('canvas');
    teiknaHaed(c, f, 3200).then(function () {
      c.toBlob(function (bl) { if (bl) vistaBlob(bl, nafnSkrar(b, f, '.png')); else toast('Ekki tókst að sækja teikninguna'); }, 'image/png');
    }, function () { toast('Teikningin opnast ekki'); });
  }

  // Spjöldin teiknuð aðeins þegar þau sjást
  var sjonarhorn = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      sjonarhorn.unobserve(e.target);
      var k = e.target; synaHaed(k.querySelector('.fm'), k._f, k._ham);
    });
  }, { rootMargin: '200px' }) : null;

  function haedarSpjald(b, f, j, syn) {
    var both = !!(f.mynd && f.threed);
    var k = document.createElement('div');
    k.className = 'fcard' + (j >= 5 ? ' umfram' : '');
    f._fid = b.id; f._haed = (b.teikning || []).indexOf(f);   // hvaða eign og hæð — fyrir verkbeiðnapunkta
    k._f = f; k._ham = f.threed && (!f.mynd || syn.threed) ? '3d' : 'teikning';
    if (!f.mynd) k._ham = '3d';
    k.innerHTML = '<div class="fcard-h"><span>' + esc(f.nafn || ((j + 1) + '. hæð')) + (f.mynd && f.merki ? '<small>' + tala(f.merki.length, 'merki', 'merki') + '</small>' : '') + '</span>' +
      (both ? '<span class="fseg"><button type="button" data-ham="teikning">Teikning</button><button type="button" data-ham="3d">3D</button></span>' : '') + '</div>' +
      '<div class="fm" title="Stækka"><div class="ft">…</div></div>' +
      (syn.nidurhal ? '<div class="fcard-f"><button type="button" class="dl">' + svgIc('pdf', 1.8) + 'Sækja</button></div>' : '');
    function merkja() { k.querySelectorAll('.fseg button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-ham') === k._ham); }); }
    merkja();
    k.querySelectorAll('.fseg button').forEach(function (x) {
      x.onclick = function (e) { e.stopPropagation(); k._ham = x.getAttribute('data-ham'); merkja(); synaHaed(k.querySelector('.fm'), f, k._ham); };
    });
    k.querySelector('.fm').onclick = function (e) { if (window.GattPunktar && GattPunktar.smellur(e, f, b)) return; opnaLb(b, f, k._ham); };
    var dl = k.querySelector('.dl'); if (dl) dl.onclick = function () { saekja(b, f, k._ham); };
    if (window.GattPunktar) GattPunktar.spjald(k, b, f);
    if (sjonarhorn) sjonarhorn.observe(k); else synaHaed(k.querySelector('.fm'), f, k._ham);
    return k;
  }

  function openDrawer(i) {
    var b = bldgAt(i); if (!b) return;
    drOpen = i; drB = b;
    setjaHero(b); drFotur(false);
    var syn = synOf();
    $('#dr-name').textContent = b.nafn || '';
    $('#dr-addr').textContent = b.heimilisfang || '';
    var html = '';
    // Yfirlit
    var nextHtml = (b.nt || '').split('|').filter(Boolean).map(function (line) {
      var kv = line.split(':'); var lbl = kv.shift(), val = kv.join(':').trim();
      return '<div><span class="lbl">' + esc(lbl) + ':</span> ' + esc(val) + '</div>';
    }).join('');
    var yrs = ["'23", "'24", "'25", "'26"];
    var boxes = (b.y || []).map(function (p, k) { return '<div class="yb"><div class="yy">' + yrs[k] + '</div>' + markCell(p) + '</div>'; }).join('');
    html += '<section class="dsec"><h4>Yfirlit</h4><div class="dkpis">' +
      '<div class="dk"><div class="k">Slökkvitæki</div><div class="v">' + (b.sl != null ? b.sl : '—') + '</div></div>' +
      '<div class="dk"><div class="k">Brunaslöngur</div><div class="v">' + (b.slo != null ? b.slo : '—') + '</div></div>' +
      '<div class="dk"><div class="k">Brunakerfi</div><div class="v">' + (b.br ? 'Já' : '—') + '</div>' + (b.br && b.bru_lysing ? '<div class="k" style="margin-top:6px">' + esc(b.bru_lysing) + '</div>' : '') + '</div></div>' +
      '<div class="dnext"><div class="next">' + (nextHtml || '<span class="dim">Næsta skoðun ekki skráð</span>') + '</div><div class="yrs">' + boxes + '</div></div></section>';
    html += umEignina(b) + (window.GattGreining ? GattGreining.eignHtml(b) : '') + kerfiHtml(b, false) + (window.GattVidhald ? GattVidhald.eignHtml(b) : '') + erindiHtml(b) + ebMinni(b) + (window.GattSaga ? GattSaga.eignHtml(b) : '') + (window.GattSkyrsla ? GattSkyrsla.eignHtml(b) : '');
    // Teikningar
    var tk = (b.teikning || []).filter(function (f) { return f && (f.mynd || f.threed); });
    var gf = syn.greining ? (b.teikning || []).filter(function (f) { return f && f.greining; }) : [];
    // Greining birtist aðeins þegar eitthvað er merkt á teikningarnar (annars tafla full af núllum)
    if (!gf.some(function (f) { var g = f.greining; return Object.keys(g.taeki || {}).length || Object.keys(g.merki || {}).length || g.ei60 || g.ei30; })) gf = [];
    var lit = {};
    gf.forEach(function (f) { [f.greining.taeki, f.greining.merki].forEach(function (o) { Object.keys(o || {}).forEach(function (l) { lit[l] = o[l].c; }); }); });
    if (tk.length) {
      html += '<section class="dsec"><h4>Teikningar <span class="cnt">' + tala(tk.length, 'hæð', 'hæðir') + '</span></h4><div class="tgrid" id="dr-tk"></div>' +
        (Object.keys(lit).length ? '<div class="legend">' + Object.keys(lit).map(function (l) { return '<span><i class="gdot" style="background:' + esc(lit[l]) + '"></i>' + esc(l) + '</span>'; }).join('') + '</div>' : '') +
        '</section>';
    }
    // Greining teikninga
    if (gf.length) {
      var tot = {}, ei60 = 0, ei30 = 0;
      gf.forEach(function (f) {
        [f.greining.taeki, f.greining.merki].forEach(function (o) { Object.keys(o || {}).forEach(function (l) { tot[l] = tot[l] || { n: 0, c: o[l].c }; tot[l].n += o[l].n; }); });
        ei60 += f.greining.ei60 || 0; ei30 += f.greining.ei30 || 0;
      });
      var chips = Object.keys(tot).sort(function (a, c) { return tot[c].n - tot[a].n; }).map(function (l) {
        return '<span class="gchip"><i class="gdot" style="background:' + esc(tot[l].c) + '"></i><b>' + tot[l].n + '</b>' + esc(l) + '</span>';
      }).join('') +
        (ei60 ? '<span class="gchip"><i class="gdot" style="background:#dc2626"></i><b>' + ei60 + '</b>Eldveggir EI-60</span>' : '') +
        (ei30 ? '<span class="gchip"><i class="gdot" style="background:#f97316"></i><b>' + ei30 + '</b>Eldveggir EI-30</span>' : '');
      var summa = function (o) { return Object.keys(o || {}).reduce(function (n, l) { return n + o[l].n; }, 0); };
      html += '<section class="dsec"><h4>Greining teikninga</h4>' + (chips ? '<div class="gsum">' + chips + '</div>' : '') +
        '<div class="dpanel"><table><thead><tr><th>Hæð</th><th class="r">Tæki</th><th class="r">Merki</th><th class="r">Eldveggir</th></tr></thead><tbody>' +
        gf.map(function (f) {
          var e = (f.greining.ei60 || 0) + (f.greining.ei30 || 0);
          return '<tr><td style="font-weight:600;color:var(--ink)">' + esc(f.nafn) + '</td><td class="num r">' + summa(f.greining.taeki) + '</td><td class="num r">' + summa(f.greining.merki) + '</td><td class="num r">' + (e || '—') + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="gnote">Samantekt úr merkingum Slökkvitækja ehf. á teikningum hússins.</div></section>';
    }
    html += thorfHtml(b, syn);
    // Búnaður
    if (syn.taeki && Array.isArray(b.equipment)) {
      var eq = b.equipment;
      var groups = {}, order = [];
      eq.forEach(function (e) { var k = (e.tegund || 'Tæki') + (e.staerd ? ' ' + e.staerd : ''); if (!groups[k]) { groups[k] = 0; order.push(k); } groups[k]++; });
      html += '<section class="dsec"><h4>Búnaður <span class="cnt">' + (eq.length ? tala(eq.length, 'tæki', 'tæki') : '') + (b.prufa ? ' · sýnishorn' : '') + '</span></h4>';
      if (!eq.length) html += '<div class="dpanel"><div class="dempty">Engin tæki skráð á þessa eign.</div></div>';
      else {
        html += '<div class="eqsum">' + order.map(function (k) { return tegundPilla(k).replace('</span>', ' <b>× ' + groups[k] + '</b></span>'); }).join('') + '</div>';
        html += '<div class="dpanel"><table><thead><tr><th>Tegund</th><th>Staðsetning</th><th>Síðast skoðað</th><th>Næsta skoðun</th></tr></thead><tbody>' +
          eq.map(function (e) {
            return '<tr><td><div style="font-weight:600;color:var(--ink)">' + esc(e.tegund || '—') + (e.staerd ? ' <span class="dim" style="font-weight:500">' + esc(e.staerd) + '</span>' : '') + '</div>' +
              (e.nr ? '<div class="eq-nr">Nr. ' + esc(e.nr) + '</div>' : '') + (e.lan ? '<div class="eq-nr">Lánstæki</div>' : '') + '</td>' +
              '<td class="eq-loc">' + (e.stadsetning ? esc(e.stadsetning) : '—') + '</td>' +
              '<td class="num">' + esc(fmtDate(e.sidast)) + '</td>' +
              '<td class="num">' + esc(fmtDate(e.naest)) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      html += '</section>';
    }
    // Skýrslur og reikningar eignarinnar
    if (syn.skjol) {
      var reps = (state.data.reports || []).filter(function (r) { return r.bygging === b.nafn; });
      html += '<section class="dsec"><h4>Skýrslur <span class="cnt">' + (reps.length ? tala(reps.length, 'skýrsla', 'skýrslur') : '') + '</span></h4><div class="dpanel">' +
        (reps.length ? reps.map(function (r) {
          return '<div class="drow"><span class="dd">' + esc(fmtDate(r.dags)) + '</span><span class="grow">' + tegundPilla(r.tegund) + '</span>' + docLink('PDF', r.docId) + '</div>';
        }).join('') : '<div class="dempty">Engar skýrslur skráðar.</div>') + '</div></section>';
      var invs = (state.data.invoices || []).filter(function (r) { return r.bygging === b.nafn; });
      if (invs.length) {
        html += '<section class="dsec"><h4>Reikningar <span class="cnt">' + tala(invs.length, 'reikningur', 'reikningar') + '</span></h4><div class="dpanel">' +
          invs.map(function (r) {
            return '<div class="drow"><span class="dd">' + esc(fmtDate(r.dags)) + '</span><span class="grow"><span class="kt">' + esc(r.nr || '—') + '</span> <span class="dim">' + esc(r.lysing || '') + '</span></span>' +
              '<span class="num" style="font-weight:600;color:var(--ink)">' + (r.upphaed != null ? esc(fmtKr(r.upphaed)) : '') + '</span>' + docLink('PDF', r.docId) + '</div>';
          }).join('') + '</div></section>';
      }
    }
    $('#dr-body').innerHTML = html;
    if (window.GattGreining) GattGreining.lifga(b);
    var g = $('#dr-tk');
    if (g) {
      tk.forEach(function (f, j) { g.appendChild(haedarSpjald(b, f, j, syn)); });
      if (tk.length > 5) {
        var fl = document.createElement('button'); fl.type = 'button'; fl.className = 'kbtn';
        var lokad = 'Sjá fleiri hæðir (' + (tk.length - 5) + ')';
        fl.textContent = lokad;
        fl.onclick = function () { var a = g.classList.toggle('allar'); fl.textContent = a ? 'Sýna færri' : lokad; };
        g.appendChild(fl);
      }
    }
    $('#dr-body').scrollTop = 0;
    $('#dr-scrim').classList.remove('hidden');
    $('#drawer').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drOpen = -1;
    $('#dr-scrim').classList.add('hidden');
    $('#drawer').classList.add('hidden');
    if ($('#er-modal').classList.contains('hidden') && $('#lb').classList.contains('hidden')) document.body.style.overflow = '';
  }

  /* ── Teikning í fullri stærð ── */
  var lbS = null;
  function lbMerkja() { document.querySelectorAll('#lb-seg button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-ham') === lbS.ham); }); }
  function opnaLb(b, f, ham) {
    lbS = { b: b, f: f, ham: ham };
    $('#lb-name').textContent = (b.nafn || '') + ' · ' + (f.nafn || '');
    $('#lb-seg').classList.toggle('hidden', !(f.mynd && f.threed));
    $('#lb-dl').classList.toggle('hidden', !synOf().nidurhal);
    lbMerkja();
    $('#lb').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    synaHaed($('#lb-m'), f, ham, 2600);
    if (window.GattPunktar) GattPunktar.lbOpin(b, f, ham);
  }
  function lokaLb() {
    if (window.GattPunktar) GattPunktar.lbLokad();
    $('#lb').classList.add('hidden'); $('#lb-m').innerHTML = ''; lbS = null;
    if ($('#drawer').classList.contains('hidden') && $('#er-modal').classList.contains('hidden')) document.body.style.overflow = '';
  }
  document.querySelectorAll('#lb-seg button').forEach(function (x) {
    x.onclick = function () { if (!lbS) return; lbS.ham = x.getAttribute('data-ham'); lbMerkja(); synaHaed($('#lb-m'), lbS.f, lbS.ham, 2600); if (window.GattPunktar) GattPunktar.lbOpin(lbS.b, lbS.f, lbS.ham); };
  });
  $('#lb-dl').onclick = function () { if (lbS) saekja(lbS.b, lbS.f, lbS.ham); };
  $('#lb-x').onclick = lokaLb;
  $('#lb').addEventListener('mousedown', function (e) { if (e.target === this) lokaLb(); });

  /* ── ERINDI: fyrirspurn, verkbeiðni eða „bæta við þjónustu“ fyrir eign ───────
     Fer í skilaboðin (portal_messages) með eignina í fyrstu línu; verkbeiðni og
     þjónusta verða líka mál á Þjónustuborðinu (gatt.cjs, source 'gatt'). */
  var erB = null, erKind = 'fyrirspurn', erUtan = false;
  var ER_TXT = {
    fyrirspurn: { lbl: 'Fyrirspurn', ph: 'Skrifaðu fyrirspurnina hér…' },
    verkbeidni: { lbl: 'Lýsing (valfrjálst)', ph: 'T.d. hvaða tæki, hvenær hentar að koma…' },
    thjonusta: { lbl: 'Nánari lýsing (valfrjálst)', ph: 'T.d. fjöldi tækja, hæð, hvenær hentar…' },
  };
  function setErKind(k) {
    if (k === 'verkbeidni' && (!synOf().verkbeidni || erUtan)) k = 'fyrirspurn';
    erKind = k;
    document.querySelectorAll('#er-seg button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-k') === k); });
    $('#er-svc').classList.toggle('hidden', k !== 'thjonusta');
    $('#er-vb').classList.toggle('hidden', k !== 'verkbeidni');
    $('#er-stad').classList.toggle('hidden', k !== 'verkbeidni');
    $('#er-lbl').textContent = ER_TXT[k].lbl;
    $('#er-text').placeholder = ER_TXT[k].ph;
  }
  function openErindi(i, kind) { openErindiB(bldgAt(i), kind); }
  function openErindiB(b, kind) {
    erB = b;
    erUtan = !!(b && ((state.data && state.data.eignir_utan) || []).indexOf(b) > -1);
    $('#er-kick').textContent = erUtan ? 'Skrá eign í þjónustu' : 'Erindi til Slökkvitækja ehf.';
    $('#er-title').textContent = erB ? erB.nafn : 'Almennt erindi';
    $('#er-addr').textContent = erB ? (erB.heimilisfang || '') : '';
    $('#er-text').value = ''; $('#er-stad').value = '';
    document.querySelectorAll('#er-svc input, #er-vb input').forEach(function (c) { c.checked = false; });
    $('#er-vb-k').classList.toggle('hidden', erUtan || !synOf().verkbeidni);
    setErKind(kind || 'fyrirspurn');
    $('#er-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('#er-text').focus(); }, 40);
  }
  function closeErindi() {
    $('#er-modal').classList.add('hidden');
    if ($('#drawer').classList.contains('hidden') && $('#lb').classList.contains('hidden')) document.body.style.overflow = '';
  }
  function toast(msg) {
    var t = $('#toast'); t.innerHTML = svgIc('hak', 2) + esc(msg); t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2800);
  }
  // Sendir erindi (sama leið og Skilaboð-formið, líka í opnum ham). Skilar Promise<bool>.
  function sendErindi(text, kind, siteId) {
    if (state.demo) {
      state.data.messages.push({ sender: 'kunni', author_name: 'Þú', body: text, created_at: new Date().toISOString() });
      renderMessages(state.data.messages); return Promise.resolve(true);
    }
    var purl = state.open ? ('/api/gatt?c=' + encodeURIComponent(SLUG)) : '/api/gatt';
    return fetch(purl, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: text, kind: kind, site_id: siteId || null }) })
      .then(function (r) { return r.ok ? r.json().catch(function () { return {}; }) : null; })
      .then(function (j) {
        var ok = !!j;
        if (ok && j.mal) {
          (state.data.erindi = state.data.erindi || []).unshift({ id: j.mal, fid: siteId || null, titill: kind === 'verkbeidni' ? 'Verkbeiðni' : 'Beiðni um þjónustu',
            stada: 'mottekid', tegund: kind, dags: new Date().toISOString() });
          renderYfirlit(state.data.buildings); renderEgYfir();
        }
        if (ok) {
          state.data.messages.push({ sender: 'kunni', author_name: (state.data.account && state.data.account.name) || 'Þú', body: text, created_at: new Date().toISOString() });
          renderMessages(state.data.messages);
        }
        return ok;
      })
      .catch(function () { return false; });
  }
  $('#er-seg').addEventListener('click', function (e) { var bt = e.target.closest('button[data-k]'); if (bt) setErKind(bt.getAttribute('data-k')); });
  $('#er-close').onclick = closeErindi;
  $('#er-modal').addEventListener('mousedown', function (e) { if (e.target === this) closeErindi(); });
  $('#er-form').onsubmit = function (e) {
    e.preventDefault();
    var msg = $('#er-text').value.trim(), stad = $('#er-stad').value.trim();
    var listi = erKind === 'thjonusta' ? '#er-svc' : erKind === 'verkbeidni' ? '#er-vb' : null;
    var val = []; if (listi) document.querySelectorAll(listi + ' input:checked').forEach(function (c) { val.push(c.value); });
    if (erKind === 'fyrirspurn' && !msg) { $('#er-text').focus(); return; }
    if (erKind !== 'fyrirspurn' && !val.length && !msg) { toast(erKind === 'verkbeidni' ? 'Veldu verk eða skrifaðu lýsingu' : 'Veldu þjónustu eða skrifaðu lýsingu'); return; }
    var where = erB ? (erB.nafn + (erB.heimilisfang ? ' (' + erB.heimilisfang + ')' : '')) : '';
    var head = (erKind === 'thjonusta' ? 'Beiðni um þjónustu' : erKind === 'verkbeidni' ? 'Verkbeiðni' : 'Fyrirspurn') + (where ? ' — ' + where : '');
    var text = head +
      (val.length ? '\n' + (erKind === 'verkbeidni' ? 'Verk: ' : 'Þjónusta: ') + val.join(', ') : '') +
      (erKind === 'verkbeidni' && stad ? '\nStaðsetning: ' + stad : '') +
      (msg ? '\n\n' + msg : '');
    var btn = $('#er-send'); btn.disabled = true;
    sendErindi(text, erKind, erB && erB.id).then(function (ok) {
      btn.disabled = false;
      if (ok) {
        closeErindi();
        if (erKind === 'thjonusta' && erB && erUtan) {
          erB.beidni = true; renderEignasafn();
          if (drB === erB && !$('#drawer').classList.contains('hidden')) openUtan(state.data.eignir_utan.indexOf(erB));
        }
        toast(erKind === 'verkbeidni' ? 'Verkbeiðnin er móttekin — við höfum samband' : erKind === 'thjonusta' ? 'Beiðnin er send — við höfum samband' : 'Fyrirspurnin er send');
      } else toast('Sending tókst ekki — reyndu aftur');
    });
  };
  $('#dr-close').onclick = closeDrawer;
  $('#dr-scrim').onclick = closeDrawer;
  document.querySelectorAll('[data-dr-erindi]').forEach(function (bt) {
    bt.onclick = function () { openErindiB(drB, bt.getAttribute('data-dr-erindi')); };
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('#lb').classList.contains('hidden')) lokaLb();
    else if (!$('#er-modal').classList.contains('hidden')) closeErindi();
    else if (!$('#sk-modal').classList.contains('hidden')) lokaSkra();
    else if (!$('#drawer').classList.contains('hidden')) closeDrawer();
  });
  // Yfirlit: „Erindi“ á hverri eign + smellur á röð opnar eignasíðuna (ef hakað á gatt-admin)
  document.addEventListener('click', function (e) {
    var t = e.target;
    var er = t.closest && t.closest('[data-erindi-b]');
    if (er) { e.preventDefault(); openErindi(Number(er.getAttribute('data-erindi-b')), 'fyrirspurn'); return; }
    var ut = t.closest && t.closest('[data-utan]'); if (ut) { openUtan(+ut.getAttribute('data-utan')); return; }
    var sk = t.closest && t.closest('[data-skra]'); if (sk) { openErindiB(utanAt(+sk.getAttribute('data-skra')), 'thjonusta'); return; }
    if (t.closest && t.closest('#es-skra')) { openSkra(); return; }
    var tr = t.closest && t.closest('#yf-body tr.clk');
    if (tr && !t.closest('a,button')) openDrawer(Number(tr.getAttribute('data-i')));
  });


  /* ── EIGNASAFN: eignir utan þjónustu (fyrirtaeki.eign) → „Skrá í þjónustu" ────────
     Félag sem er ekki enn í þjónustu (t.d. Reitir 11.10.2026) sér eignirnar sínar sem
     myndaspjöld; hver eign opnar eignasíðu (mynd, um eignina, þjónustan, skrefin) og
     „Skrá í þjónustu" sendir beiðni sem verður mál á Þjónustuborðinu. */
  function imgW(u, w) { return /images\.prismic\.io/.test(u || '') ? u + (u.indexOf('?') > -1 ? '&' : '?') + 'w=' + w : (u || ''); }
  function fmtTala(n) { return Number(n).toLocaleString('is-IS'); }
  function utanAt(j) { return ((state.data && state.data.eignir_utan) || [])[j] || null; }
  var SVC_KORT = [
    ['Slökkvitæki', 'Slökkvitæki', 'Árleg skoðun, áfylling og viðhald. Hvert tæki skráð með staðsetningu og næstu skoðun.'],
    ['Brunaslöngur', 'Brunaslöngur', 'Skoðun og prófun brunaslangna og slöngukefla.'],
    ['Brunakerfi', 'Brunaviðvörunarkerfi', 'Reglubundið eftirlit og prófanir á brunakerfum.'],
    ['utgangur', 'Neyðarlýsing og merkingar', 'Útljós, flóttaleiðamerki og skilti samkvæmt reglum.'],
    ['teikning', 'Teikningar og 3D', 'Búnaður merktur á teikningar hverrar hæðar, 3D-yfirlit og greining eldveggja.'],
    ['erindi', 'Þjónustugátt', 'Skýrslur, reikningar og tækjaskrá á einum stað — verkbeiðnir beint frá ykkur.'],
  ];
  ICON.utgangur = '<path d="M13 4h6v16h-6"/><path d="M15.5 12H6"/><path d="m9 8.5-3.5 3.5L9 15.5"/>';
  ICON.teikning = '<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 11h7v9M10 4v4M14 11h7M14 11v4"/>';
  ICON.plus = '<path d="M12 5v14M5 12h14"/>';
  // Tákn fyrir eignagatt.js (verkbeiðnapunktar, Mitt vinnusvæði) — stroke-SVG, engin emoji
  ICON.x = '<path d="M6 6l12 12M18 6 6 18"/>';
  ICON.til_baka = '<path d="m14 6-6 6 6 6"/>';
  ICON.afram = '<path d="m10 6 6 6-6 6"/>';
  ICON.upp = '<path d="m6 14 6-6 6 6"/>';
  ICON.nidur = '<path d="m6 10 6 6 6-6"/>';
  ICON.hlekkur = '<path d="M10 13a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 5.8"/><path d="M14 11a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"/>';
  ICON.mynd = '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m5 18 5-5 3 3 2.5-2.5L20 18"/>';
  ICON.skjal = '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M9.5 13h5M9.5 16.5h5"/>';
  ICON.kort = '<path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>';
  ICON.dagatal = '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>';

  /* ── ÞARFAGREINING (fyrirtaeki.eign.thorf) — búnaður og kerfi sem reglur krefjast, per hæð.
     Leiðbeinandi greining eftir byggingarreglugerð 112/2012 og 165.BR1 (Arnold); fyrirvarinn
     á að sjást í viðmótinu, ekki bara í athugasemd. */
  function thorfHtml(b, syn) {
    var t = b && b.eign && b.eign.thorf;
    if (!t || !syn.greining || !Array.isArray(t.haedir)) return '';
    var sum = function (k) { return t.haedir.reduce(function (n, h) { return n + (+h[k] || 0); }, 0); };
    var tot = [['Slökkvitæki', sum('slokkvitaeki'), '#0f9488'], ['Kolsýrutæki', sum('co2'), '#111827'], ['Slöngukefli', sum('slongur'), '#be123c'],
      ['Útljós', sum('utljos'), '#15803d'], ['Neyðarljós', sum('neydarljos'), '#ca8a04'], ['Gistiherbergi · rýmingaruppdráttur', sum('herbergi'), '#64748b']];
    var chips = tot.filter(function (x) { return x[1] > 0; }).map(function (x) {
      return '<span class="gchip"><i class="gdot" style="background:' + x[2] + '"></i><b>' + fmtTala(x[1]) + '</b>' + esc(x[0]) + '</span>';
    }).join('');
    var rows = t.haedir.map(function (h) {
      return '<tr><td style="font-weight:600;color:var(--ink)">' + esc(h.nafn) + '</td><td class="num r">' + (h.m2 ? fmtTala(h.m2) : '—') + '</td>' +
        '<td class="num r">' + (h.slokkvitaeki || 0) + '</td><td class="num r">' + (h.co2 || '—') + '</td><td class="num r">' + (h.slongur || '—') + '</td>' +
        '<td class="num r">' + (h.utljos || '—') + '</td><td class="num r">' + (h.neydarljos || '—') + '</td></tr>';
    }).join('');
    var kerfi = (t.kerfi || []).map(function (k) {
      var sk = /skylt/i.test(k.krafa || '');
      return '<div class="kcard"><div class="kc-h"><b>' + esc(k.heiti) + '</b><span class="kb ' + (sk ? 'skylt' : 'skil') + '">' + esc(k.krafa || '') + '</span></div>' +
        '<p>' + esc(k.skyring || '') + '</p>' + (k.heimild ? '<small>' + esc(k.heimild) + '</small>' : '') + '</div>';
    }).join('');
    return '<section class="dsec"><h4>Þarfagreining <span class="cnt">' + esc(t.flokkur || '') + '</span></h4>' +
      '<div class="gsum">' + chips + '</div>' +
      '<div class="dpanel"><table><thead><tr><th>Hæð</th><th class="r">m²</th><th class="r">Slökkvitæki</th><th class="r">Kolsýra</th><th class="r">Slöngukefli</th><th class="r">Útljós</th><th class="r">Neyðarljós</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      (kerfi ? '<div class="kgrid">' + kerfi + '</div>' : '') +
      (t.eftirlit ? '<div class="kfoot"><b>Eftirlit:</b> ' + esc(t.eftirlit) + (t.eftirlit_heimild ? ' <span class="dim">(' + esc(t.eftirlit_heimild) + ')</span>' : '') + '</div>' : '') +
      '<div class="fyrirv">' + (t.forsendur ? esc(t.forsendur) + ' ' : '') +
        'Leiðbeinandi greining ' + esc(t.hofundur || 'Slökkvitækja ehf.') + ' byggð á byggingarreglugerð 112/2012 og 165.BR1 — endanlegt samþykki brunavarna er hjá hönnuði og slökkviliði sveitarfélagsins.' +
        (t.dags ? ' <span class="dim">' + esc(fmtDate(t.dags)) + '</span>' : '') + '</div>' +
    '</section>';
  }
  function eignaKort(b, j) {
    var e = b.eign || {}, img = e.mynd ? imgW(e.mynd, 900) : '';
    return '<article class="ecard' + (b.beidni ? ' sent' : '') + '">' +
      '<div class="eimg" data-utan="' + j + '"' + (img ? ' style="background-image:url(\'' + esc(img) + '\')"' : '') + '>' +
        (e.tegund ? '<span class="etag">' + esc(e.tegund) + '</span>' : '') +
        '<span class="estat">' + (b.beidni ? 'Beiðni í vinnslu' : 'Ekki í þjónustu') + '</span></div>' +
      '<div class="ebody"><h3>' + esc(b.nafn) + '</h3><div class="baddr">' + esc(b.heimilisfang) + '</div>' +
        '<div class="efacts">' + (e.staerd_m2 ? '<span>' + fmtTala(e.staerd_m2) + ' m²</span>' : '') + (e.byggingarar ? '<span>Byggt ' + esc(e.byggingarar) + '</span>' : '') + '</div></div>' +
      '<div class="efoot"><button type="button" class="kbtn" data-utan="' + j + '">Skoða eign</button>' +
        (b.beidni ? '<span class="eok">' + svgIc('hak', 2) + 'Beiðni móttekin</span>' : '<button type="button" class="gbtn" data-skra="' + j + '">Skrá í þjónustu</button>') +
      '</div></article>';
  }

  function renderEignasafn() {
    var d = state.data || {}, utan = d.eignir_utan || [], inni = d.buildings || [];
    var box = $('#eignasafn'); if (!box) return;
    var prospect = !inni.length && utan.length > 0;
    $('#yf-tbl').classList.toggle('hidden', prospect);
    if (prospect) {
      $('#v-yfirlit h2.page').textContent = 'Eignasafn';
      $('#yf-kicker').textContent = 'Þjónustugátt Slökkvitækja ehf. · eignir ' + ((d.account && d.account.name) || 'félagsins');
      var m2 = utan.reduce(function (n, b) { return n + (+(b.eign && b.eign.staerd_m2) || 0); }, 0);
      var ar = utan.map(function (b) { return +(b.eign && b.eign.byggingarar) || 0; }).filter(Boolean);
      var bn = utan.filter(function (b) { return b.beidni; }).length;
      renderCards([
        { k: 'Eignir', v: String(utan.length) },
        { k: 'Fermetrar', v: m2 ? fmtTala(m2) : '—', s: 'm²' },
        { k: 'Byggingarár', v: ar.length ? String(Math.min.apply(null, ar)) : '—', s: ar.length > 1 ? 'til ' + Math.max.apply(null, ar) : '' },
        { k: 'Beiðnir í vinnslu', v: String(bn) },
        { k: 'Í þjónustu', v: '0', s: 'af ' + utan.length, dark: true },
      ]);
    }
    if (!utan.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="es-h"><div><div class="kicker">' + (prospect ? 'Eignir félagsins' : 'Eignasafn') + '</div>' +
      '<h3>' + (prospect ? 'Skráið eignir í þjónustu' : 'Eignir utan þjónustu') + '</h3></div>' +
      '<button type="button" class="gbtn" id="es-skra">' + svgIc('plus', 2) + 'Skrá eignir í þjónustu</button></div>' +
      '<div class="egrid">' + utan.map(eignaKort).join('') + '</div>';
  }

  function setjaHero(b) {
    var head = $('#drawer .dr-head'), m = b && b.eign && b.eign.mynd;
    head.classList.toggle('hero', !!m);
    head.style.setProperty('--hero', m ? 'url("' + imgW(m, 1800).replace(/"/g, '%22') + '")' : 'none');
  }
  function drFotur(utan) {
    $('#dr-vb').classList.toggle('hidden', utan || !synOf().verkbeidni);
    $('#dr-thj-l').textContent = utan ? 'Skrá í þjónustu' : 'Bæta við þjónustu';
  }

  function openUtan(j) {
    var b = utanAt(j); if (!b) return;
    drOpen = -1; drB = b;
    setjaHero(b); drFotur(true);
    $('#dr-name').textContent = b.nafn || '';
    $('#dr-addr').textContent = b.heimilisfang || '';
    var e = b.eign || {}, syn = synOf();
    var tk = (syn.teikningar || syn.threed) ? (b.teikning || []).filter(function (f) { return f && (f.mynd || f.threed); }) : [];
    function kp(k, v, t) { return '<div class="dk' + (t ? ' t' : '') + '"><div class="k">' + k + '</div><div class="v">' + (v == null || v === '' ? '—' : esc(v)) + '</div></div>'; }
    var html = (b.beidni ? '<div class="ebanner">' + svgIc('hak', 2) + '<div><b>Beiðni um þjónustu er móttekin</b><span>Við höfum samband til að skipuleggja fyrstu úttekt.</span></div></div>' : '') +
      '<section class="dsec"><h4>Um eignina</h4><div class="dkpis k4">' +
        kp('Tegund', e.tegund, true) + kp('Stærð', e.staerd_m2 ? fmtTala(e.staerd_m2) + ' m²' : null) + kp('Byggt', e.byggingarar) + kp('Staða', b.beidni ? 'Beiðni í vinnslu' : 'Ekki í þjónustu', true) + '</div>' +
        (e.lysing ? '<p class="elys">' + esc(e.lysing) + '</p>' : '') +
        (e.heimild ? '<div class="gnote">Mynd og lýsing: ' + esc(e.heimild) + '</div>' : '') + '</section>' +
      (window.GattGreining ? GattGreining.eignHtml(b) : '') + kerfiHtml(b, true) +
      (tk.length ? '<section class="dsec"><h4>Teikningar <span class="cnt">' + tala(tk.length, 'hæð', 'hæðir') + '</span></h4><div class="tgrid" id="dr-tk"></div></section>' : '') +
      thorfHtml(b, syn) +
      '<section class="dsec"><h4>Þjónusta sem við bjóðum</h4><div class="svcg">' +
        SVC_KORT.map(function (s) { return '<div class="svc-k"><span class="ic2">' + svgIc(s[0], 1.7) + '</span><b>' + esc(s[1]) + '</b><span>' + esc(s[2]) + '</span></div>'; }).join('') +
      '</div></section>' +
      '<section class="dsec"><h4>Svona virkar það</h4><ol class="skref">' +
        '<li><b>Skráið eignina</b>Veljið þjónustu og sendið beiðni hér í gáttinni.</li>' +
        '<li><b>Fyrsta úttekt</b>Við skoðum búnaðinn, merkjum hann inn á teikningar hverrar hæðar og skráum í tækjaskrá.</li>' +
        '<li><b>Allt á einum stað</b>Skýrslur, reikningar, teikningar og næsta skoðun birtast hér — og þið sendið verkbeiðnir beint.</li>' +
      '</ol></section>';
    $('#dr-body').innerHTML = html;
    if (window.GattGreining) GattGreining.lifga(b);
    var g = $('#dr-tk');
    if (g) {
      tk.forEach(function (f, k) { g.appendChild(haedarSpjald(b, f, k, syn)); });
      if (tk.length > 5) {
        var fl = document.createElement('button'); fl.type = 'button'; fl.className = 'kbtn';
        var lokad = 'Sjá fleiri hæðir (' + (tk.length - 5) + ')';
        fl.textContent = lokad;
        fl.onclick = function () { var a = g.classList.toggle('allar'); fl.textContent = a ? 'Sýna færri' : lokad; };
        g.appendChild(fl);
      }
    }
    $('#dr-body').scrollTop = 0;
    $('#dr-scrim').classList.remove('hidden');
    $('#drawer').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  /* ── Skrá margar eignir í þjónustu í einu ── */
  function openSkra(forval) {
    var utan = (state.data && state.data.eignir_utan) || [];
    $('#sk-list').innerHTML = utan.map(function (b, j) {
      var e = b.eign || {};
      return '<label class="skrow' + (b.beidni ? ' ok' : '') + '"><input type="checkbox" value="' + j + '"' + (b.beidni ? ' disabled' : (forval === j ? ' checked' : '')) + '>' +
        '<i' + (e.mynd ? ' style="background-image:url(\'' + esc(imgW(e.mynd, 200)) + '\')"' : '') + '></i>' +
        '<span><b>' + esc(b.nafn) + '</b><small>' + (b.beidni ? 'Beiðni í vinnslu' : esc(b.heimilisfang)) + '</small></span></label>';
    }).join('');
    $('#sk-svc').innerHTML = $('#er-svc').innerHTML;
    $('#sk-svc').querySelectorAll('input').forEach(function (c) { c.checked = false; });
    $('#sk-adrar').value = ''; $('#sk-text').value = '';
    $('#sk-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }
  function lokaSkra() {
    $('#sk-modal').classList.add('hidden');
    if ($('#drawer').classList.contains('hidden') && $('#er-modal').classList.contains('hidden')) document.body.style.overflow = '';
  }
  $('#sk-close').onclick = lokaSkra;
  $('#sk-modal').addEventListener('mousedown', function (e) { if (e.target === this) lokaSkra(); });
  $('#sk-allar').onclick = function () {
    var cs = [].slice.call(document.querySelectorAll('#sk-list input:not(:disabled)'));
    var allar = cs.every(function (c) { return c.checked; });
    cs.forEach(function (c) { c.checked = !allar; });
  };
  $('#sk-form').onsubmit = function (e) {
    e.preventDefault();
    var utan = (state.data && state.data.eignir_utan) || [];
    var val = [].slice.call(document.querySelectorAll('#sk-list input:checked')).map(function (c) { return utan[+c.value]; }).filter(Boolean);
    var svc = []; document.querySelectorAll('#sk-svc input:checked').forEach(function (c) { svc.push(c.value); });
    var adrar = $('#sk-adrar').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    var ath = $('#sk-text').value.trim();
    if (!val.length && !adrar.length) { toast('Veljið eign eða skrifið aðrar eignir'); return; }
    var btn = $('#sk-send'); btn.disabled = true;
    var sendingar = val.map(function (b) {
      return { b: b, t: 'Beiðni um þjónustu — ' + b.nafn + (b.heimilisfang ? ' (' + b.heimilisfang + ')' : '') + (svc.length ? '\nÞjónusta: ' + svc.join(', ') : '') + (ath ? '\n\n' + ath : '') };
    });
    if (adrar.length) sendingar.push({ b: null, t: 'Beiðni um þjónustu — fleiri eignir\nEignir:\n' + adrar.map(function (a) { return '• ' + a; }).join('\n') + (svc.length ? '\nÞjónusta: ' + svc.join(', ') : '') + (ath ? '\n\n' + ath : '') });
    var tokst = 0;
    sendingar.reduce(function (p, s) {
      return p.then(function () { return sendErindi(s.t, 'thjonusta', s.b && s.b.id).then(function (ok) { if (ok) { tokst++; if (s.b) s.b.beidni = true; } }); });
    }, Promise.resolve()).then(function () {
      btn.disabled = false;
      renderEignasafn();
      if (tokst) { lokaSkra(); toast(tokst === 1 ? 'Beiðnin er send — við höfum samband' : 'Beiðnir sendar fyrir ' + tokst + ' eignir — við höfum samband'); }
      else toast('Sending tókst ekki — reyndu aftur');
    });
  };

  /* ══ EIGNAGÁTT (11.10.2026, Agnar: „setja þína 3 skjá breytingar bara beint inn í kerfið") ══════════════
     Skissan „Eignagátt" (Eignasafn · Eign · Eldvarnabók) byggð á RAUNGÖGNUM:
       kerfi   = v_stadur_kerfi (skylt eftir notkunarflokki, til staðar, hver þjónustar) — gatt.cjs grisjar
       erindi  = mál af þjónustuvef á Þjónustuborði (Móttekið → Í vinnslu → Lokið)
       eldvarnabók = mánaðarlegt eigið eftirlit (723/2017, 26. gr.) — tafla eldvarnabok, skrif um gatt.cjs
     Ekkert er fyllt í með ágiskun: kerfi sem enginn hefur staðfest heitir „Óskráð". */
  var KERFI_ROD = ['slokkvitaeki', 'slongukefli', 'reykskynjarar', 'brunavidvorunarkerfi', 'vatnsudakerfi', 'neydarlysing', 'utljos',
    'reyklosun', 'eldvarnarteppi', 'brunathettingar', 'eldvarnaeftirlit', 'slokkvikerfi_eldhus', 'rymingaruppdrattur', 'fjoldaskilti'];
  var KERFI_HEITI = { slokkvitaeki: 'Slökkvitæki', slongukefli: 'Slöngukefli', reykskynjarar: 'Reykskynjarar', brunavidvorunarkerfi: 'Brunaviðvörunarkerfi',
    vatnsudakerfi: 'Vatnsúðakerfi', neydarlysing: 'Neyðarlýsing', utljos: 'Útljós og leiðamerkingar', reyklosun: 'Reyklosun', eldvarnarteppi: 'Eldvarnarteppi',
    brunathettingar: 'Brunaþéttingar', eldvarnaeftirlit: 'Eldvarnaeftirlit (árlegt)', slokkvikerfi_eldhus: 'Slökkvikerfi í eldhúsháfi',
    rymingaruppdrattur: 'Rýmingaruppdráttur', fjoldaskilti: 'Fjöldaskilti' };
  var KST_HEITI = { okkar: 'Í þjónustu hjá okkur', til: 'Til staðar', vantar: 'Skylt — vantar', ekki: 'Ekki til staðar', oskrad: 'Óskráð' };
  var MAN_STUTT = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'];
  var ER_TEG = { verkbeidni: 'Verkbeiðni', thjonusta: 'Þjónusta', fyrirspurn: 'Fyrirspurn', eldvarnabok: 'Eldvarnabók' };
  var ER_SKREF = [['mottekid', 'Móttekið'], ['i_vinnslu', 'Í vinnslu'], ['lokid', 'Lokið']];

  function kerfiStada(k) {
    if (k.adili === 'okkar') return 'okkar';
    if (k.til === 'ja') return 'til';
    if (k.til === 'nei') return k.skylt === 'ja' ? 'vantar' : 'ekki';
    return 'oskrad';
  }
  function kerfiRod(list) {
    return (list || []).slice().sort(function (a, c) { return KERFI_ROD.indexOf(a.k) - KERFI_ROD.indexOf(c.k); });
  }
  // Næsta skoðun út frá skoðunarmánuði + síðasta skoðunarári (sama regla og nextInspText)
  function naestaSkodun(month, last) {
    month = Number(month);
    if (!month || month < 1 || month > 12) return null;
    var d = new Date(), cy = d.getFullYear(), cm = d.getMonth() + 1;
    var yr = last ? Number(last) + 1 : (month >= cm ? cy : cy + 1);
    return { m: month, y: yr, idx: yr * 12 + month, seint: (yr * 12 + month) < (cy * 12 + cm) };
  }
  function manTxt(n) { return n ? MAN_STUTT[n.m - 1] + '. ' + n.y : '—'; }
  function sidastaSkyrsla(b, teg) {
    var r = (state.data.reports || []).filter(function (x) { return x.bygging === b.nafn && x.tegund === teg; })
      .sort(function (a, c) { return String(c.dags || c.ar || '').localeCompare(String(a.dags || a.ar || '')); });
    return r[0] || null;
  }
  function skodanirEignar(b) {
    var out = [];
    if (b.i_thjonustu !== false && b.skodun_manudur) {
      var n1 = naestaSkodun(b.skodun_manudur, lastDocYear(b.ar_slokk) || b.sidasta_ar);
      if (n1) out.push({ b: b, k: 'slokkvitaeki', heiti: 'Slökkvitæki — árleg skoðun', n: n1 });
    }
    if (b.br && b.bru_skodun_manudur) {
      var n2 = naestaSkodun(b.bru_skodun_manudur, lastDocYear(b.ar_bru));
      if (n2) out.push({ b: b, k: 'brunavidvorunarkerfi', heiti: 'Brunakerfi — árleg skoðun', n: n2 });
    }
    return out;
  }
  function eignAfId(fid) {
    var all = ((state.data && state.data.buildings) || []).concat((state.data && state.data.eignir_utan) || []);
    for (var i = 0; i < all.length; i++) if (all[i].id === fid) return all[i];
    return null;
  }
  function erindiEignar(b) { return ((state.data && state.data.erindi) || []).filter(function (e) { return b && e.fid === b.id; }); }
  function opinErindi(b) { return erindiEignar(b).filter(function (e) { return e.stada !== 'lokid'; }).length; }

  // ── Kerfi á yfirliti: ein rönd per kerfi (litur = staða) + „x af y skráð" ──
  function kerfiCell(b) {
    var L = kerfiRod(b.kerfi);
    if (!L.length) return b.br ? '<span class="kc-txt">Brunakerfi í þjónustu</span>' : '<span class="dim">—</span>';
    var sk = L.filter(function (k) { return kerfiStada(k) !== 'oskrad'; }).length;
    return '<div class="kbar">' + L.map(function (k) {
      var st = kerfiStada(k);
      return '<i class="' + st + '" title="' + esc((KERFI_HEITI[k.k] || k.k) + ' — ' + KST_HEITI[st]) + '"></i>';
    }).join('') + '</div><div class="kc-txt">' + sk + ' af ' + L.length + ' skráð' + (b.br ? ' · brunakerfi' : '') + '</div>';
  }

  // ── Eignasíða: um eignina, kerfi og skoðanir, erindi, eldvarnabók ──
  function umEignina(b) {
    var e = b.eign || {}, f = b.flokkun || {};
    var m2 = e.staerd_m2 || f.m2, haedir = (b.teikning || []).length || f.haedir;
    if (!(e.tegund || f.tegund || m2 || e.byggingarar)) return '';
    function kp(k, v, t) { return '<div class="dk' + (t ? ' t' : '') + '"><div class="k">' + k + '</div><div class="v">' + (v == null || v === '' ? '—' : esc(v)) + '</div></div>'; }
    return '<section class="dsec"><h4>Um eignina</h4><div class="dkpis k4">' +
      kp('Tegund', f.tegund || e.tegund, true) +
      kp('Notkunarflokkur', f.flokkur ? 'Flokkur ' + f.flokkur : null, true) +
      kp('Stærð', m2 ? fmtTala(m2) + ' m²' : null) +
      kp(haedir ? 'Hæðir' : 'Byggt', haedir ? haedir : e.byggingarar) + '</div>' +
      (e.lysing ? '<p class="elys">' + esc(e.lysing) + '</p>' : '') + '</section>';
  }
  function kerfiHtml(b, utan) {
    var syn = synOf();
    var L = kerfiRod(b.kerfi);
    if (!syn.kerfi || !L.length) return '';
    var f = b.flokkun || {};
    var tel = { okkar: 0, til: 0, vantar: 0, oskrad: 0, ekki: 0 };
    var rows = L.map(function (k) {
      var st = kerfiStada(k); tel[st]++;
      var sid = null, nae = null, skj = null;
      if (!utan && k.k === 'slokkvitaeki') {
        var r1 = sidastaSkyrsla(b, 'Slökkvitæki'); sid = r1 ? r1.dags : null; skj = r1;
        nae = naestaSkodun(b.skodun_manudur, lastDocYear(b.ar_slokk) || b.sidasta_ar);
      } else if (!utan && k.k === 'brunavidvorunarkerfi') {
        var r2 = sidastaSkyrsla(b, 'Brunakerfi'); sid = r2 ? r2.dags : null; skj = r2;
        if (b.br) nae = naestaSkodun(b.bru_skodun_manudur, lastDocYear(b.ar_bru));
      }
      var seint = nae && nae.seint;
      return '<tr><td><div class="kn">' + esc(KERFI_HEITI[k.k] || k.k) + '</div>' +
          '<div class="ks"' + (k.heimild ? ' title="' + esc(k.heimild) + '"' : '') + '>' + (k.skylt === 'ja' ? 'Skylt' : k.skylt === 'skilyrt' ? 'Skilyrt — fer eftir stærð og notkun' : 'Ekki skylt') + '</div></td>' +
        '<td>' + (k.til === 'ja' ? 'Já' : k.til === 'nei' ? 'Nei' : '<span class="dim">Óvitað</span>') + '</td>' +
        (utan ? '' : '<td class="num">' + (sid ? esc(fmtDate(sid)) : '<span class="dim">—</span>') + '</td><td class="num">' + (nae ? esc(manTxt(nae)) : '<span class="dim">—</span>') + '</td>') +
        '<td>' + (k.adili === 'okkar' ? 'Slökkvitæki ehf.' : k.adili === 'annar' ? 'Annar aðili' : '<span class="dim">—</span>') + '</td>' +
        '<td><span class="kst ' + (seint ? 'vantar' : st) + '">' + esc(seint ? 'Á eftir' : KST_HEITI[st]) + '</span>' +
          '<button type="button" class="kbtn xs" data-kerfi-skra="' + esc(k.k) + '" data-sid="' + b.id + '" title="Skrá hvort kerfið er til staðar og hver þjónustar það">' + (st === 'oskrad' ? 'Skrá' : 'Breyta') + '</button></td>' +
        (utan ? '' : '<td class="r">' + (skj && skj.docId ? docLink('PDF', skj.docId) : '<span class="dim">—</span>') + '</td>') + '</tr>';
    }).join('');
    var cnt = [tel.okkar ? tel.okkar + ' hjá okkur' : '', tel.til ? tel.til + ' til staðar' : '', tel.vantar ? tel.vantar + ' vantar' : '', tel.oskrad ? tel.oskrad + ' óskráð' : '']
      .filter(Boolean).join(' · ');
    return '<section class="dsec"><h4>' + (utan ? 'Kerfi og kröfur' : 'Kerfi og skoðanir') + ' <span class="cnt">' + esc(cnt) + '</span></h4>' +
      '<div class="dpanel"><table class="ktbl"><thead><tr><th>Kerfi</th><th>Til staðar</th>' + (utan ? '' : '<th>Síðast</th><th>Næst</th>') +
      '<th>Þjónustuaðili</th><th>Staða</th>' + (utan ? '' : '<th class="r">Skírteini</th>') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<div class="kfoot2"><span>Kröfur eftir ' + (f.flokkur ? 'notkunarflokki ' + esc(f.flokkur) + ' · ' : '') + esc(f.tegund || 'tegund eignar') +
        ' skv. byggingarreglugerð 112/2012 — leiðbeinandi; endanlegt mat er hjá hönnuði og slökkviliði. „Óskráð" þýðir að ekki hefur verið staðfest hvort kerfið er til staðar.</span>' +
        (tel.oskrad || tel.vantar ? '<button type="button" class="kbtn sm" data-kerfi-uttekt="1">' + svgIc('hak', 2) + 'Biðja um úttekt á kerfum</button>' : '') + '</div></section>';
  }
  function erindiRod(e, medEign) {
    var i = 0; ER_SKREF.forEach(function (s, j) { if (s[0] === e.stada) i = j; });
    var eign = medEign ? eignAfId(e.fid) : null;
    return '<div class="erow"><div class="er-h"><span class="tb plain">' + esc(ER_TEG[e.tegund] || 'Erindi') + '</span>' +
      '<b>' + esc(e.titill || '') + '</b>' + (eign ? '<span class="er-e">' + esc(eign.nafn) + '</span>' : '') +
      '<span class="dd">' + esc(fmtDate(e.dags)) + '</span></div>' +
      '<div class="erstep">' + ER_SKREF.map(function (s, j) { return '<span class="' + (j < i ? 'buid' : j === i ? 'nu' : '') + '">' + esc(s[1]) + '</span>'; }).join('') + '</div>' +
      (window.GattPunktar ? GattPunktar.erindiAuki(e) : '') + '</div>';
  }
  function erindiHtml(b) {
    if (!synOf().erindi) return '';
    var L = erindiEignar(b), op = L.filter(function (e) { return e.stada !== 'lokid'; }).length;
    return '<section class="dsec"><h4>Erindi <span class="cnt">' + (L.length ? op + ' opin · ' + (L.length - op) + ' lokið' : '') + '</span></h4>' +
      (L.length ? '<div class="dpanel elist">' + L.slice(0, 8).map(function (e) { return erindiRod(e, false); }).join('') + '</div>'
        : '<div class="dpanel"><div class="dempty">Engin erindi enn — sendu fyrirspurn eða verkbeiðni hér að neðan og fylgstu með stöðunni hér.</div></div>') +
      '</section>';
  }
  function ebMinni(b) {
    if (!synOf().eldvarnabok || !Array.isArray(b.eldvarnabok) || b.i_thjonustu === false) return '';
    var M = ebManudir();
    var nu = ebRod(b, M[M.length - 1].key);
    return '<section class="dsec"><h4>Eldvarnabók <span class="cnt">' + esc(ebStadaTxt(b, nu)) + '</span></h4>' +
      '<div class="dpanel ebm"><div class="ebm-s">' + M.map(function (m) {
        var r = ebRod(b, m.key);
        return '<span class="' + (r ? (r.stada === 'undirritad' ? 'und' : 'drog') : '') + '" title="' + esc(m.heiti + ' — ' + ebStadaTxt(b, r)) + '">' + esc(m.stutt) + '</span>';
      }).join('') + '</div><button type="button" class="kbtn sm" data-eb-opna="' + b.id + '">Opna eldvarnabók</button></div></section>';
  }

  // ── Yfirlit: verkfærastika (leit, síur, CSV) + næstu skoðanir, erindi, eldvarnabók ──
  var yfSia = { q: '', s: '' };
  function ebOundirritud(b) {
    if (!Array.isArray(b.eldvarnabok) || b.i_thjonustu === false) return false;
    var M = ebManudir(), r = ebRod(b, M[M.length - 1].key);
    return !(r && r.stada === 'undirritad');
  }
  function yfPassar(b) {
    var q = yfSia.q.toLowerCase();
    if (q && ((b.nafn || '') + ' ' + (b.heimilisfang || '')).toLowerCase().indexOf(q) < 0) return false;
    if (yfSia.s === 'erindi') return opinErindi(b) > 0;
    if (yfSia.s === 'eldvarnabok') return ebOundirritud(b);
    if (yfSia.s === 'oskrad') return (b.kerfi || []).some(function (k) { return kerfiStada(k) === 'oskrad' || kerfiStada(k) === 'vantar'; });
    return true;
  }
  function yfSiaBeita() {
    var bl = (state.data && state.data.buildings) || [], n = 0;
    document.querySelectorAll('#yf-body tr[data-i]').forEach(function (tr) {
      var b = bl[+tr.getAttribute('data-i')], ok = !!b && yfPassar(b);
      tr.style.display = ok ? '' : 'none'; if (ok) n++;
    });
    var lbl = yfSia.q ? '„' + yfSia.q + '“' : ({ erindi: 'opin erindi', eldvarnabok: 'eldvarnabók óundirrituð', oskrad: 'óskráð kerfi' })[yfSia.s] || '';
    foot('#yf-foot', n, bl.length, ['bygging', 'byggingar'], ['byggingu', 'byggingum'], lbl);
  }
  function renderYfTools() {
    var box = $('#yf-tools'); if (!box) return;
    var bl = (state.data && state.data.buildings) || [], syn = synOf();
    if (bl.length < 2) { box.innerHTML = ''; return; }
    var siur = [['', 'Allar eignir']];
    if (syn.erindi) siur.push(['erindi', 'Opin erindi']);
    if (syn.eldvarnabok && bl.some(function (b) { return Array.isArray(b.eldvarnabok); })) siur.push(['eldvarnabok', 'Eldvarnabók óundirrituð']);
    if (syn.kerfi && bl.some(function (b) { return (b.kerfi || []).length; })) siur.push(['oskrad', 'Óskráð kerfi']);
    box.innerHTML = '<label class="yf-q">' + svgIc('leit', 1.8) + '<input id="yf-q" type="search" placeholder="Leita eftir eign eða heimilisfangi" value="' + esc(yfSia.q) + '"></label>' +
      '<div class="yf-s">' + siur.map(function (s) { return '<button type="button" class="ysia' + (yfSia.s === s[0] ? ' on' : '') + '" data-ysia="' + s[0] + '">' + esc(s[1]) + '</button>'; }).join('') + '</div>' +
      '<button type="button" class="kbtn sm" id="yf-csv">' + svgIc('pdf', 1.8) + 'Flytja út CSV</button>';
  }
  function yfCsv() {
    var bl = ((state.data && state.data.buildings) || []).filter(yfPassar);
    var M = ebManudir(), key = M[M.length - 1].key;
    var h = ['Eign', 'Heimilisfang', 'Slökkvitæki', 'Brunaslöngur', 'Brunakerfi', 'Næsta skoðun', 'Kerfi skráð', 'Opin erindi', 'Eldvarnabók ' + M[M.length - 1].heiti];
    var rows = bl.map(function (b) {
      var L = b.kerfi || [], sk = L.filter(function (k) { return kerfiStada(k) !== 'oskrad'; }).length;
      return [b.nafn, b.heimilisfang, b.sl == null ? '' : b.sl, b.slo == null ? '' : b.slo, b.br ? 'Já' : 'Nei', String(b.nt || '').replace(/\|/g, ' / '),
        L.length ? sk + ' af ' + L.length : '', opinErindi(b), Array.isArray(b.eldvarnabok) ? ebStadaTxt(b, ebRod(b, key)) : ''];
    });
    var csv = '﻿' + [h].concat(rows).map(function (r) { return r.map(function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';'); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'eignasafn-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function renderEgYfir() {
    var box = $('#eg-yfir'); if (!box) return;
    var bl = (state.data && state.data.buildings) || [], syn = synOf(), panels = [];
    // Næstu skoðanir (12 mánuðir) — seinar fyrst
    var sk = [];
    bl.forEach(function (b) { skodanirEignar(b).forEach(function (s) { sk.push(s); }); });
    var d = new Date(), nuIdx = d.getFullYear() * 12 + d.getMonth() + 1;
    sk = sk.filter(function (s) { return s.n.idx <= nuIdx + 12; }).sort(function (a, c) { return a.n.idx - c.n.idx; });
    panels.push('<div class="egp"><div class="egp-h"><b>Næstu skoðanir</b><span>' + (sk.length ? '12 mánuðir · ' + sk.length : '12 mánuðir') + '</span></div>' +
      (sk.length ? sk.slice(0, 6).map(function (s) {
        return '<div class="egp-r"><span class="egd' + (s.n.seint ? ' seint' : '') + '"><b>' + esc(MAN_STUTT[s.n.m - 1]) + '</b>' + s.n.y + '</span>' +
          '<div class="egt"><b>' + esc(s.b.nafn) + '</b><span>' + esc(s.heiti) + '</span></div>' +
          (s.n.seint ? '<span class="kst vantar">Á eftir</span>' : '<span class="kst okkar">Okkar</span>') + '</div>';
      }).join('') : '<div class="egp-e">Engin skoðun á dagskrá næstu 12 mánuði. Skoðunarmánuður er settur við fyrstu úttekt.</div>') + '</div>');
    // Erindi
    if (syn.erindi) {
      var er = ((state.data && state.data.erindi) || []).slice().sort(function (a, c) { return (a.stada === 'lokid') - (c.stada === 'lokid') || String(c.dags).localeCompare(String(a.dags)); });
      var op = er.filter(function (e) { return e.stada !== 'lokid'; }).length;
      panels.push('<div class="egp"><div class="egp-h"><b>Erindi</b><span>' + (er.length ? op + ' opin · ' + (er.length - op) + ' lokið' : 'síðustu 12 mánuði') + '</span></div>' +
        (er.length ? '<div class="elist">' + er.slice(0, 5).map(function (e) { return erindiRod(e, true); }).join('') + '</div>'
          : '<div class="egp-e">Engin erindi enn. Fyrirspurnir, verkbeiðnir og beiðnir um þjónustu birtast hér með stöðu.</div>') + '</div>');
    }
    // Eldvarnabók mánaðarins
    var ebl = bl.filter(function (b) { return Array.isArray(b.eldvarnabok) && b.i_thjonustu !== false; });
    if (syn.eldvarnabok && ebl.length) {
      var M = ebManudir(), key = M[M.length - 1].key;
      var und = ebl.filter(function (b) { var r = ebRod(b, key); return r && r.stada === 'undirritad'; }).length;
      panels.push('<div class="egp"><div class="egp-h"><b>Eldvarnabók</b><span>' + esc(M[M.length - 1].heiti) + ' · ' + und + ' af ' + ebl.length + ' undirritaðar</span></div>' +
        '<div class="ebbar"><i style="width:' + Math.round(und / ebl.length * 100) + '%"></i></div>' +
        ebl.slice(0, 5).map(function (b) {
          var r = ebRod(b, key);
          return '<div class="egp-r clk" data-eb-opna="' + b.id + '"><div class="egt"><b>' + esc(b.nafn) + '</b><span>' + esc(ebStadaTxt(b, r)) + '</span></div>' +
            '<span class="kst ' + (r && r.stada === 'undirritad' ? 'okkar' : r ? 'til' : 'oskrad') + '">' + (r && r.stada === 'undirritad' ? 'Undirritað' : r ? 'Drög' : 'Ekki hafið') + '</span></div>';
        }).join('') + '</div>');
    }
    box.className = 'eg-grid n' + panels.length;
    box.innerHTML = panels.join('');
  }

  // ══ ELDVARNABÓK — mánaðarlegt eigið eftirlit ══
  var EB_LIDIR = [
    [1, 'Flóttaleiðir greiðfærar og útgangar opnanlegir innan frá', 'Gangar, stigahús og neyðarútgangar'],
    [2, 'Brunahurðir lokast sjálfkrafa og eru ekki haldnar opnum', 'Ekkert fleygað; lokunarbúnaður virkar'],
    [3, 'Flóttaleiðamerkingar og útljós loga og sjást', 'Skilti óskemmd og ekki hulin'],
    [4, 'Slökkvitæki á merktum stað og aðgengileg', 'Innsigli heil og þjónustumiði í gildi'],
    [5, 'Brunaslöngur aðgengilegar og óskemmdar', 'Ekkert fyrir skápum; slanga upprúlluð'],
    [6, 'Neyðarlýsing — virkniprófun', 'Prófhnappur eða sjálfprófun; enginn lampi óvirkur'],
    [7, 'Brunaviðvörunarkerfi án bilunar- eða útsláttarboða', 'Stjórnstöð í eðlilegri stöðu'],
    [8, 'Vatnsúða- eða slökkvikerfi í lagi', 'Lokar opnir og þrýstingur eðlilegur'],
    [9, 'Rafmagnstöflur og tæknirými lokuð og ekki notuð sem geymsla', ''],
    [10, 'Eldfim efni og rusl geymd á öruggum stað', 'Ekkert við útveggi eða í flóttaleiðum'],
    [11, 'Rýmingaráætlun og leiðbeiningar uppi og þekktar', 'Starfsfólk veit hvert á að fara'],
  ];
  var MAN_LANGT = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  function ebManudir() {
    var d = new Date(), out = [];
    for (var i = 11; i >= 0; i--) {
      var x = new Date(d.getFullYear(), d.getMonth() - i, 1), m = x.getMonth();
      out.push({ key: x.getFullYear() + '-' + ('0' + (m + 1)).slice(-2), stutt: MAN_STUTT[m], heiti: MAN_LANGT[m] + ' ' + x.getFullYear() });
    }
    return out;
  }
  function ebRod(b, key) {
    var L = (b && b.eldvarnabok) || [];
    for (var i = 0; i < L.length; i++) if (L[i].manudur === key) return L[i];
    return null;
  }
  function ebSvarad(svor) { return EB_LIDIR.filter(function (l) { var s = svor && svor[l[0]]; return s && s.n; }).length; }
  function ebStadaTxt(b, r) {
    if (!r) return 'Ekki hafið';
    if (r.stada === 'undirritad') return 'Undirritað' + (r.undirritad_af ? ' — ' + r.undirritad_af : '');
    return 'Drög · ' + ebSvarad(r.svor) + ' af ' + EB_LIDIR.length + ' liðum';
  }
  function ebEignir() { return ((state.data && state.data.buildings) || []).filter(function (b) { return Array.isArray(b.eldvarnabok) && b.i_thjonustu !== false && b.id != null; }); }
  var eb = { fid: null, man: null, svor: {}, breytt: false, vinnur: false };
  function ebB() { return eignAfId(eb.fid); }
  function ebVelja(fid, man) {
    if (eb.breytt && eb.fid != null) ebVista(false, true);
    var L = ebEignir();
    if (fid == null || !L.some(function (b) { return b.id === fid; })) fid = L.length ? L[0].id : null;
    var M = ebManudir();
    eb.fid = fid; eb.man = man || eb.man || M[M.length - 1].key;
    var r = ebRod(ebB(), eb.man);
    eb.svor = JSON.parse(JSON.stringify((r && r.svor) || {}));
    eb.breytt = false;
    renderEldvarnabok();
  }
  function renderEldvarnabok() {
    var tab = document.querySelector('nav .tab[data-view="eldvarnabok"]');
    var L = ebEignir(), syn = synOf();
    var synileg = syn.eldvarnabok && L.length > 0;
    if (tab) tab.classList.toggle('hidden', !synileg);
    if (!synileg) return;
    if (eb.fid == null || !ebB()) { var M0 = ebManudir(); eb.fid = L[0].id; eb.man = M0[M0.length - 1].key; var r0 = ebRod(L[0], eb.man); eb.svor = JSON.parse(JSON.stringify((r0 && r0.svor) || {})); }
    var b = ebB(), M = ebManudir(), r = ebRod(b, eb.man), und = !!(r && r.stada === 'undirritad');
    var heiti = ''; M.forEach(function (m) { if (m.key === eb.man) heiti = m.heiti; });
    $('#eb-eignir').innerHTML = L.length > 1 ? L.map(function (x) {
      return '<button type="button" class="chip' + (x.id === eb.fid ? ' on' : '') + '" data-eb-eign="' + x.id + '">' + esc(x.nafn) + '</button>';
    }).join('') : '';
    $('#eb-man').innerHTML = M.map(function (m) {
      var rr = ebRod(b, m.key);
      return '<button type="button" class="ebmb' + (m.key === eb.man ? ' on' : '') + '" data-eb-man="' + m.key + '" title="' + esc(m.heiti + ' — ' + ebStadaTxt(b, rr)) + '">' +
        '<span>' + esc(m.stutt) + '</span><i class="' + (rr ? (rr.stada === 'undirritad' ? 'und' : 'drog') : '') + '"></i></button>';
    }).join('');
    var svarad = ebSvarad(eb.svor);
    $('#eb-main').innerHTML =
      '<div class="eb-h"><div><div class="kicker">Gátlisti · eigið eftirlit</div><h3>' + esc(b.nafn) + ' <span>· ' + esc(heiti) + '</span></h3></div>' +
        '<span class="eb-plate ' + (und ? 'und' : r || svarad ? 'drog' : '') + '" id="eb-plate">' + esc(und ? 'Undirritað' : 'Drög · ' + svarad + ' af ' + EB_LIDIR.length) + '</span></div>' +
      '<div class="eb-tw"><table class="eb-t"><thead><tr><th class="c">Nr</th><th>Liður</th><th>Niðurstaða</th><th>Athugasemd</th></tr></thead><tbody>' +
        EB_LIDIR.map(function (l) {
          var s = eb.svor[l[0]] || {};
          return '<tr data-nr="' + l[0] + '" class="' + (s.n === 'nei' ? 'nei' : '') + '"><td class="c num">' + l[0] + '</td>' +
            '<td><b>' + esc(l[1]) + '</b>' + (l[2] ? '<small>' + esc(l[2]) + '</small>' : '') + '</td>' +
            '<td><div class="eb-seg">' + [['ja', 'Já'], ['nei', 'Nei'], ['na', 'Á ekki við']].map(function (o) {
              return '<button type="button" data-n="' + o[0] + '"' + (s.n === o[0] ? ' class="on"' : '') + (und ? ' disabled' : '') + '>' + o[1] + '</button>';
            }).join('') + '</div></td>' +
            '<td><input class="eb-a" maxlength="500" placeholder="' + (und ? '' : 'Athugasemd') + '" value="' + esc(s.a || '') + '"' + (und ? ' disabled' : '') + '></td></tr>';
        }).join('') + '</tbody></table></div>' +
      '<div class="eb-foot">' + (und
        ? '<div class="eb-und">' + svgIc('hak', 2.2) + '<div><b>Undirritað af ' + esc(r.undirritad_af || '') + '</b><span>' + esc(fmtDate(r.undirritad_at)) + (r.erindi ? ' · frávik send sem erindi' : '') + '</span></div></div>' +
          '<span class="sp"></span><button type="button" class="kbtn" id="eb-prenta">' + svgIc('pdf', 1.8) + 'Prenta</button>'
        : '<label class="eb-nafn"><span>Undirskrift eldvarnarfulltrúa</span><input id="eb-nafn" maxlength="120" placeholder="Fullt nafn" value="' + esc(eb.nafn || '') + '"></label>' +
          '<span class="sp"></span><button type="button" class="kbtn" id="eb-vista">Vista drög</button>' +
          '<button type="button" class="gbtn" id="eb-undirrita">' + svgIc('hak', 2.2) + 'Undirrita mánuðinn</button>') + '</div>';
    renderEbHlid();
  }
  function renderEbHlid() {
    var b = ebB(), M = ebManudir();
    var nei = EB_LIDIR.filter(function (l) { var s = eb.svor[l[0]]; return s && s.n === 'nei'; });
    $('#eb-side').innerHTML =
      '<div class="egp"><div class="egp-h"><b>Frávik mánaðarins</b><span>' + nei.length + '</span></div>' +
        (nei.length ? nei.map(function (l) {
          var s = eb.svor[l[0]];
          return '<div class="egp-r"><span class="ebnr">' + l[0] + '</span><div class="egt"><b>' + esc(l[1]) + '</b><span>' + esc(s.a || 'Engin athugasemd skráð') + '</span></div></div>';
        }).join('') : '<div class="egp-e">Engin frávik skráð.</div>') +
        '<div class="egp-n">Þegar mánuðurinn er undirritaður verða frávik sjálfkrafa að erindi til Slökkvitækja ehf.</div></div>' +
      '<div class="egp"><div class="egp-h"><b>Síðustu mánuðir</b><span>' + esc(b ? b.nafn : '') + '</span></div>' +
        M.slice().reverse().slice(0, 6).map(function (m) {
          var r = ebRod(b, m.key);
          return '<div class="egp-r clk" data-eb-man="' + m.key + '"><div class="egt"><b>' + esc(m.heiti.charAt(0).toUpperCase() + m.heiti.slice(1)) + '</b><span>' + esc(ebStadaTxt(b, r)) + '</span></div>' +
            '<span class="kst ' + (r && r.stada === 'undirritad' ? 'okkar' : r ? 'til' : 'oskrad') + '">' + (r && r.stada === 'undirritad' ? 'Undirritað' : r ? 'Drög' : 'Ekki hafið') + '</span></div>';
        }).join('') + '</div>' +
      '<div class="egp"><div class="egp-h"><b>Hver gerir hvað</b></div>' +
        '<div class="egp-r"><div class="egt"><b>Eigandi</b><span>Ber ábyrgð á eldvörnum og annast eigið eftirlit (reglugerð 723/2017, 3. og 26. gr.).</span></div></div>' +
        '<div class="egp-r"><div class="egt"><b>Eldvarnarfulltrúi</b><span>Fer yfir gátlistann og undirritar mánuðinn (11. gr.).</span></div></div>' +
        '<div class="egp-r"><div class="egt"><b>Slökkvitæki ehf.</b><span>Skoðar búnaðinn árlega og tekur við frávikum sem erindum.</span></div></div></div>';
  }
  function ebPlata() {
    var p = $('#eb-plate'); if (!p) return;
    var n = ebSvarad(eb.svor);
    p.textContent = 'Drög · ' + n + ' af ' + EB_LIDIR.length;
    p.className = 'eb-plate' + (n ? ' drog' : '');
  }
  function ebVista(undirrita, hljott) {
    var b = ebB(); if (!b || eb.vinnur) return Promise.resolve(false);
    var nafn = (($('#eb-nafn') || {}).value || '').trim();
    if (undirrita) {
      var vantar = EB_LIDIR.length - ebSvarad(eb.svor);
      if (vantar) { toast('Svaraðu öllum liðum áður en þú undirritar (' + vantar + ' eftir)'); return Promise.resolve(false); }
      if (!nafn) { toast('Skrifaðu nafn þess sem undirritar'); var ni = $('#eb-nafn'); if (ni) ni.focus(); return Promise.resolve(false); }
      if (!window.confirm('Undirrita eldvarnabók fyrir ' + b.nafn + '? Eftir undirritun er mánuðurinn læstur.')) return Promise.resolve(false);
    }
    eb.nafn = nafn;
    var fravik = EB_LIDIR.filter(function (l) { var s = eb.svor[l[0]]; return s && s.n === 'nei'; }).map(function (l) { return { nr: l[0], lidur: l[1] }; });
    var fid = eb.fid, man = eb.man, svor = JSON.parse(JSON.stringify(eb.svor));
    function beita(rod, mal) {
      var L = b.eldvarnabok || (b.eldvarnabok = []), i;
      for (i = 0; i < L.length; i++) if (L[i].manudur === rod.manudur) break;
      L[i] = rod;
      if (mal) (state.data.erindi = state.data.erindi || []).unshift({ id: mal, fid: fid, titill: 'Eldvarnabók — frávik í ' + MAN_LANGT[+man.slice(5) - 1] + ' ' + man.slice(0, 4), stada: 'mottekid', tegund: 'eldvarnabok', dags: new Date().toISOString() });
      if (eb.fid === fid && eb.man === man) eb.breytt = false;
      if (!hljott) renderEldvarnabok();
      renderEgYfir();
      if (!hljott) toast(undirrita ? (mal ? 'Mánuðurinn er undirritaður — frávik send sem erindi' : 'Mánuðurinn er undirritaður') : 'Drög vistuð');
      return true;
    }
    if (state.demo) {
      return Promise.resolve(beita({ manudur: man, svor: svor, stada: undirrita ? 'undirritad' : 'drog', undirritad_af: undirrita ? nafn : null,
        undirritad_at: undirrita ? new Date().toISOString() : null, uppf: new Date().toISOString(), erindi: null }, undirrita && fravik.length ? Date.now() : null));
    }
    eb.vinnur = true;
    var purl = state.open ? ('/api/gatt?c=' + encodeURIComponent(SLUG)) : '/api/gatt';
    return fetch(purl, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'eldvarnabok', site_id: fid, manudur: man, svor: svor, stada: undirrita ? 'undirritad' : 'drog', undirritad_af: nafn, fravik: fravik }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        eb.vinnur = false;
        if (res.ok && res.j && res.j.rod) return beita(res.j.rod, res.j.mal);
        toast((res.j && res.j.error) || 'Vistun tókst ekki — reyndu aftur'); return false;
      })
      .catch(function () { eb.vinnur = false; toast('Vistun tókst ekki — reyndu aftur'); return false; });
  }
  // Atburðir eldvarnabókar (ein hlustun á sýninni — teikning tapar engu)
  (function () {
    var v = $('#v-eldvarnabok'); if (!v) return;
    v.addEventListener('click', function (e) {
      var t = e.target;
      var ei = t.closest('[data-eb-eign]'); if (ei) { ebVelja(+ei.getAttribute('data-eb-eign'), eb.man); return; }
      var mb = t.closest('[data-eb-man]'); if (mb) { ebVelja(eb.fid, mb.getAttribute('data-eb-man')); return; }
      var sb = t.closest('.eb-seg button'); if (sb && !sb.disabled) {
        var tr = sb.closest('tr'), nr = tr.getAttribute('data-nr'), n = sb.getAttribute('data-n');
        var s = eb.svor[nr] || (eb.svor[nr] = { n: null, a: '' });
        s.n = s.n === n ? null : n;
        tr.querySelectorAll('.eb-seg button').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-n') === s.n); });
        tr.classList.toggle('nei', s.n === 'nei');
        eb.breytt = true; ebPlata(); renderEbHlid(); return;
      }
      if (t.closest('#eb-vista')) { ebVista(false); return; }
      if (t.closest('#eb-undirrita')) { ebVista(true); return; }
      if (t.closest('#eb-prenta')) { window.print(); return; }
    });
    v.addEventListener('input', function (e) {
      var inp = e.target.closest('.eb-a'); if (!inp) return;
      var nr = inp.closest('tr').getAttribute('data-nr');
      var s = eb.svor[nr] || (eb.svor[nr] = { n: null, a: '' });
      s.a = inp.value; eb.breytt = true;
    });
    v.addEventListener('focusout', function (e) { if (e.target.closest && e.target.closest('.eb-a')) renderEbHlid(); });
    // Óvistuð drög fara ekki forgörðum: vistuð hljóðlega þegar síðunni er lokað
    window.addEventListener('pagehide', function () {
      if (!eb.breytt || state.demo || eb.fid == null) return;
      try {
        var purl = state.open ? ('/api/gatt?c=' + encodeURIComponent(SLUG)) : '/api/gatt';
        fetch(purl, { method: 'POST', credentials: 'same-origin', keepalive: true, headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'eldvarnabok', site_id: eb.fid, manudur: eb.man, svor: eb.svor, stada: 'drog' }) });
      } catch (_) {}
    });
  })();
  // ── Kerfi skráð af kúnna (12.10.2026): „Skrá"/„Breyta" á hverju kerfi í töflunni → innfelld lína með
  //    Til staðar · Þjónustuaðili · Athugasemd → POST kerfi_skra → sama tafla og appið les. ──
  function kerfiSkraOpna(btn) {
    var tr = btn.closest('tr'), k = btn.getAttribute('data-kerfi-skra'), sid = +btn.getAttribute('data-sid');
    if (!tr || !k) return;
    var gamla = tr.parentNode.querySelector('.kskra'); if (gamla) gamla.parentNode.removeChild(gamla);
    if (tr.nextElementSibling && tr.nextElementSibling.classList.contains('kskra') && tr.nextElementSibling.getAttribute('data-k') === k) return;
    var b = drB, kr = ((b && b.kerfi) || []).filter(function (x) { return x.k === k; })[0] || {};
    var sel = function (v, cur) { return v === cur ? ' selected' : ''; };
    var row = document.createElement('tr'); row.className = 'kskra'; row.setAttribute('data-k', k); row.setAttribute('data-sid', sid);
    row.innerHTML = '<td colspan="7"><div class="kskra-f"><b>' + esc(KERFI_HEITI[k] || k) + '</b>' +
      '<label>Til staðar <select data-ks="til"><option value="ja"' + sel('ja', kr.til) + '>Já</option><option value="nei"' + sel('nei', kr.til) + '>Nei</option><option value="ovitad"' + sel('ovitad', kr.til || 'ovitad') + '>Veit ekki</option></select></label>' +
      '<label>Þjónustuaðili <select data-ks="adili"><option value="">— óbreytt —</option><option value="okkar"' + sel('okkar', kr.adili) + '>Slökkvitæki ehf.</option><option value="annar"' + sel('annar', kr.adili) + '>Annar aðili</option><option value="enginn">Enginn</option></select></label>' +
      '<input type="text" data-ks="nafn" maxlength="80" placeholder="Nafn þjónustuaðila (ef annar)">' +
      '<input type="text" data-ks="ath" maxlength="300" placeholder="Athugasemd (valfrjálst)">' +
      '<button type="button" class="kbtn sm" data-kskra-vista="1">' + svgIc('hak', 2) + 'Vista</button><button type="button" class="kbtn sm" data-kskra-haetta="1">Hætta við</button></div></td>';
    tr.parentNode.insertBefore(row, tr.nextSibling);
    var ta = row.querySelector('[data-ks="til"]'); if (ta) ta.focus();
  }
  function kerfiSkraVista(btn) {
    var row = btn.closest('.kskra'); if (!row) return;
    var g = function (n) { var el = row.querySelector('[data-ks="' + n + '"]'); return el ? el.value : ''; };
    var body = { action: 'kerfi_skra', site_id: +row.getAttribute('data-sid'), kerfi: row.getAttribute('data-k'), til: g('til'), adili: g('adili') || null, adili_nafn: g('nafn'), ath: g('ath') };
    btn.disabled = true;
    var purl = state.open ? ('/api/gatt?c=' + encodeURIComponent(SLUG)) : '/api/gatt';
    (state.demo ? Promise.resolve({ ok: true, j: { ok: true, kerfi: { k: body.kerfi, til: body.til, adili: body.adili === 'enginn' ? null : (body.adili || null) } } })
      : fetch(purl, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .catch(function () { return { ok: false, j: { error: 'Engin tenging' } }; }))
    .then(function (res) {
      btn.disabled = false;
      if (!res.ok || !res.j || !res.j.kerfi) { toast((res.j && res.j.error) || 'Vistun mistókst'); return; }
      var b = drB, L = b.kerfi = b.kerfi || [], hit = L.filter(function (x) { return x.k === res.j.kerfi.k; })[0];
      if (hit) { hit.til = res.j.kerfi.til; hit.adili = res.j.kerfi.adili; } else L.push({ k: res.j.kerfi.k, skylt: null, til: res.j.kerfi.til, adili: res.j.kerfi.adili });
      // Endurteikna skúffuna svo staðan, teljararnir og yfirlitsröndin sýni það sem var skráð
      var ut = ((state.data && state.data.eignir_utan) || []).indexOf(b);
      if (ut > -1) openUtan(ut); else if (drOpen > -1) openDrawer(drOpen);
      toast('Skráð — takk, þetta sést líka hjá okkur');
    });
  }
  // Smellir: úttekt á kerfum, opna eldvarnabók, síur á yfirliti
  document.addEventListener('click', function (e) {
    var t = e.target;
    var ks = t.closest && t.closest('[data-kerfi-skra]'); if (ks) { kerfiSkraOpna(ks); return; }
    var kv = t.closest && t.closest('[data-kskra-vista]'); if (kv) { kerfiSkraVista(kv); return; }
    var kh = t.closest && t.closest('[data-kskra-haetta]'); if (kh) { var r0 = kh.closest('.kskra'); if (r0) r0.parentNode.removeChild(r0); return; }
    if (t.closest && t.closest('[data-kerfi-uttekt]')) { openErindiB(drB, 'thjonusta'); return; }
    var eo = t.closest && t.closest('[data-eb-opna]');
    if (eo) { closeDrawer(); goView('eldvarnabok'); ebVelja(+eo.getAttribute('data-eb-opna')); window.scrollTo(0, 0); return; }
    var ys = t.closest && t.closest('[data-ysia]');
    if (ys) { yfSia.s = ys.getAttribute('data-ysia'); document.querySelectorAll('[data-ysia]').forEach(function (x) { x.classList.toggle('on', x === ys); }); yfSiaBeita(); return; }
    if (t.closest && t.closest('#yf-csv')) { yfCsv(); return; }
  });
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'yf-q') { yfSia.q = e.target.value.trim(); yfSiaBeita(); }
  });

  // Sýnishorn: kerfi, erindi og eldvarnabók á sýnishornsbyggingum
  function demoEignagatt() {
    var M = ebManudir(), MAN = [1, 1, null, 7, 8, 9, 8, 7];
    DEMO.buildings.forEach(function (b, bi) {
      b.id = 9000 + bi; b.i_thjonustu = true; b.skodun_manudur = MAN[bi]; b.bru_skodun_manudur = b.br ? ((bi * 3) % 12) + 1 : null;
      b.flokkun = { tegund: 'Hótel / gistiheimili / hostel', flokkur: '4' };
      b.kerfi = [
        { k: 'slokkvitaeki', skylt: 'ja', til: 'ja', adili: 'okkar' },
        { k: 'slongukefli', skylt: 'skilyrt', til: b.slo ? 'ja' : 'ovitad', adili: b.slo ? 'okkar' : null },
        { k: 'brunavidvorunarkerfi', skylt: 'skilyrt', til: b.br ? 'ja' : 'ovitad', adili: b.br ? 'okkar' : null },
        { k: 'neydarlysing', skylt: 'ja', til: bi % 3 ? 'ja' : 'ovitad', adili: bi % 3 ? 'annar' : null },
        { k: 'utljos', skylt: 'ja', til: 'ja', adili: null },
        { k: 'rymingaruppdrattur', skylt: 'ja', til: bi % 2 ? 'ja' : 'ovitad', adili: null },
        { k: 'eldvarnaeftirlit', skylt: 'ja', til: 'ovitad', adili: null }];
      b.eldvarnabok = bi < 4 ? [{ manudur: M[10].key, stada: 'undirritad', undirritad_af: 'Guðrún Jónsdóttir', undirritad_at: M[10].key + '-28', svor: {}, erindi: null }] : [];
    });
    DEMO.erindi = [
      { id: 1, fid: 9000, titill: 'Verkbeiðni', stada: 'i_vinnslu', tegund: 'verkbeidni', dags: new Date(Date.now() - 2 * 864e5).toISOString() },
      { id: 2, fid: 9003, titill: 'Beiðni um þjónustu', stada: 'mottekid', tegund: 'thjonusta', dags: new Date(Date.now() - 864e5).toISOString() },
      { id: 3, fid: 9001, titill: 'Verkbeiðni', stada: 'lokid', tegund: 'verkbeidni', dags: new Date(Date.now() - 20 * 864e5).toISOString() }];
  }

  // Innri föll fyrir eignagatt.js (verkbeiðnapunktar, Mitt vinnusvæði) — hleðst á undan og kallar aðeins eftir boot
  window.Gatt = {
    state: state, svgIc: svgIc, toast: toast, synOf: synOf, eignAfId: eignAfId, vistaBlob: vistaBlob,
    renderYfirlit: renderYfirlit, renderEgYfir: renderEgYfir, renderEignasafn: renderEignasafn,
    openDrawer: openDrawer, openUtan: openUtan, closeDrawer: closeDrawer, drB: function () { return drB; },
    synaHaed: synaHaed, opnaLb: opnaLb, lokaLb: lokaLb, lbS: function () { return lbS; }, haedarSpjald: haedarSpjald, erindiRod: erindiRod,
    skodanirEignar: skodanirEignar, ebManudir: ebManudir, ebRod: ebRod, MAN_STUTT: MAN_STUTT, MAN_LANGT: MAN_LANGT,
    SLUG: function () { return SLUG; }, KERFI_ROD: KERFI_ROD, KERFI_HEITI: KERFI_HEITI,
  };
  boot();
})();
