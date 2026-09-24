/* 410 — ÞJÓNUSTU-TENGINGAR: þrír verð-gluggar í Vörur og þjónusta  (24.09.2026)
 *
 * Af hverju þessi pappi er til (Agnar 24.09.2026):
 *   Reikningur á Línuborun (R-001011) rukkaði 2× „Léttvatn 9 L" sem
 *   „Léttvatnstæki 6L. yfirferð" á 3.150 kr. Tvær ástæður, báðar í 129:
 *
 *     a) `SIZELESS_SVC` (/léttv|lettv|abf|froð|brunaslang|reykskynj|teppi/)
 *        HENDIR stærðinni áður en leitað er. Það var rétt fyrir brunaslöngur
 *        og teppi, en léttvatn, froða og ABF HAFA stærðir — 2L, 6 L, 9 L.
 *        Fyrirspurnin verður því bara „lettvatn" og eina léttvatnsvaran
 *        vinnur með fullu skori, hver sem stærð tækisins er.
 *     b) Aðalleitin `findMatchingServices` hefur ENGAN stærðarvörð. Varaleiðin
 *        `findReplacementProduct` fékk slíkan vörð 16.06.2026 („never bill a
 *        9 kg price for a 6 kg unit") — aðalleitin sat eftir.
 *
 *   Ný 9 L vara ein og sér lagar þetta EKKI; (a) hendir stærðinni áfram.
 *   Skráð tenging er leiðin fram hjá ágiskuninni.
 *
 *   Þrjú reikningsflæði verðleggja þjónustu og ENGIN tvö gera það eins:
 *     🧯 Slökkvitæki   → nafnaleit í `vorur` (flokkur Þjónusta), engin skráð tenging
 *     🚨 Brunakerfi    → eigin verðlisti í app_settings.brunakerfi_verdlisti
 *     🍳 Slökkvikerfi  → handslegið verð í hverja skýrslu (slokkvikerfi_skodanir.kostnadur)
 *
 *   Þessi pappi gefur hverju flæði glugga þar sem SÉST hvað er tengt við hvað,
 *   hægt er að skipta um tengingu, og hægt er að búa til nýja þjónustulínu með
 *   verði sem birtist samstundis í tengi-listunum.
 *
 * GEYMSLA — `thjonustu_tengingar` (Supabase, búin til 24.09.2026):
 *   flokkur + lykill  →  vara_id.  Skráð tenging á ALLTAF að ganga fyrir
 *   nafnaleit. Tenging sem vantar á að verða sýnileg og rauð, ekki þögul.
 *   CLAUDE.md-reglan um samstillingu milli véla: þetta eru VERÐ á reikninga,
 *   svo ekkert af þessu má lifa í localStorage.
 *
 * Pappinn á GLUGGANA. `js/vorur.js` á takkana sem opna þá (CLAUDE.md regla 4 —
 * tveir pappar mega aldrei eiga sama hnútinn).
 */
(function () {
  'use strict';

  var AUÐK = 'p410';
  var SVAR_KIND = [['yfirferd', 'Yfirferð'], ['hledsla', 'Hleðsla']];
  var SVAR_LINUR = [
    ['skodun',  '🍳 Skoðun slökkvikerfis', 'stk'],
    ['vinna',   '🛠 Vinna',                'klst'],
    ['skyrsla', '📄 Skýrslugerð',          'stk'],
    ['akstur',  '🚗 Akstur',               'stk']
  ];

  var FLOKKAR = {
    slokkvitaeki: { tákn: '🧯', titill: 'Slökkvit. þjónusta — verð',
      undir: 'Hvaða þjónustulína ársskoðunin rukkar fyrir hverja tegund og stærð' },
    brunakerfi:   { tákn: '🚨', titill: 'Brunak. þjónusta — verð',
      undir: 'Verðlisti brunakerfisskýrslunnar og hvaða búnaðarlínu hver liður telur' },
    slokkvikerfi: { tákn: '🍳', titill: 'Slökkvikerfis þjónusta — verð',
      undir: 'Sjálfgefin verð á línurnar í slökkvikerfisskýrslunni' }
  };

  // ── gögn ────────────────────────────────────────────────────────────────
  var G = { vorur: [], tengingar: {}, tegundir: [], bkListi: null, hlaðið: false };

  function SB() { return (window.DB && DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function kr(n) { return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr'; }
  function krVsk(n, vsk) { return kr((Number(n) || 0) * (1 + (Number(vsk) || 24) / 100)); }

  // ── nafnaleitin úr 129, orðrétt, svo glugginn sýni það sem GERIST í dag ──
  // Þessi hermun má ALDREI víkja frá 129; víki hún, lýgur glugginn.
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/ð/g, 'd').replace(/þ/g, 'th')
      .replace(/æ/g, 'ae').replace(/[áàâ]/g, 'a').replace(/[éèê]/g, 'e')
      .replace(/[íìî]/g, 'i').replace(/[óòô]/g, 'o').replace(/[úùû]/g, 'u')
      .replace(/[ýỳ]/g, 'y').replace(/ö/g, 'o')
      .replace(/[₀-₉]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0x2080 + 0x30); })
      .replace(/[⁰¹²³⁴-⁹]/g, function (ch) {
        var m = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9' };
        return m[ch] || ch;
      })
      .replace(/[._,()]/g, ' ')
      .replace(/(\d)([a-z])/g, '$1 $2')
      .replace(/\s+/g, ' ').trim();
  }
  function tokenMatches(q, n) {
    if (q === n) return true;
    if (q.length < 4 || n.length < 4) return false;
    var st = Math.min(q.length, n.length, 5);
    if (q.slice(0, st) === n.slice(0, st)) return true;
    if (q.indexOf(n) >= 0 || n.indexOf(q) >= 0) return true;
    return false;
  }
  // 129 hendir stærðinni fyrir þessar tegundir áður en leitað er. Listinn er
  // orðréttur úr 129 (SIZELESS_SVC); víki hann, lýgur glugginn.
  var STAERDARLAUS = /léttv|lettv|abf|froð|frod|brunaslang|brunaslöng|brunaslong|hose|reykskynj|hitaskynj|smoke|teppi|blanket/i;
  var erStaerd = function (t) { return /^\d/.test(t); };

  // 24.09.2026 (Agnar: „eitthvað tvítak þarna") — 129 steypir tegundum saman í
  // FJÖLSKYLDU áður en hún reiknar (ABC Duft, PFC Duft og Duft = „Duft"; CO2 og
  // CO₂ = „CO₂") og LES tenginguna með fjölskyldu-heitinu. Glugginn skrifaði
  // hráa heitið, svo „ABC Duft|2 kg|yfirferd" hefði aldrei lesist. Sama röðun
  // hér og í 129 normalizeTypeFamily — víki hún, deyja tengingarnar þegjandi.
  function fjolskylda(t) {
    var s = String(t || '').toLowerCase();
    if (!s.trim() || s === '(vantar)') return '—';
    if (/\bduft\b|\babc\b|\bpfc\b/.test(s)) return 'Duft';
    if (/co2|co₂|co_?2|kolsyr|kolsýr/.test(s)) return 'CO₂';
    if (/léttv|lettv|abf|froð|frod/.test(s)) return 'Léttvatn';
    if (/brunaslang|brunaslöng|brunaslong|hose/.test(s)) return 'Brunaslanga';
    if (/reykskynj|smoke/.test(s)) return 'Reykskynjari';
    if (/teppi|blanket/.test(s)) return 'Eldvarnateppi';
    return t || '—';
  }
  // Steypir röðum sýnarinnar saman eftir fjölskyldu + stærð; hráu heitin
  // fylgja með (`hra`) svo sjáist hvað liggur undir hverri línu.
  function steypaTegundir(radir) {
    var m = {}, ut = [];
    (radir || []).forEach(function (t) {
      var teg = fjolskylda(t.tegund), st = String(t.staerd || '').trim();
      var k = teg + '|' + st;
      if (!m[k]) { m[k] = { tegund: teg, staerd: st, fjoldi: 0, hra: [] }; ut.push(m[k]); }
      m[k].fjoldi += Number(t.fjoldi) || 0;
      if (t.tegund !== teg && m[k].hra.indexOf(t.tegund) < 0) m[k].hra.push(t.tegund);
    });
    ut.sort(function (a, b) { return b.fjoldi - a.fjoldi; });
    return ut;
  }

  // Lag 3 í 129: reykskynjara-afbrigði fara BEINT á söluvöru.
  function reykAfbrigdi(tegund, staerd) {
    if (!/reykskynj|smoke/.test(norm(tegund))) return null;
    var st = norm(staerd), vil = null;
    if (/batter/.test(st)) vil = 'reykskynjari';
    else if (/langl/.test(st)) vil = 'reykskynjari 2';
    else if (/samteng/.test(st)) vil = 'reykskynjari 3';
    if (!vil) return null;
    for (var i = 0; i < G.vorur.length; i++) if (norm(G.vorur[i].nafn) === vil) return G.vorur[i];
    return null;
  }

  // Lag 1 í 129: aðalleitin. ENGINN stærðarvörður — það er hluti af villunni.
  function adalleit(tegund, leitarStaerd, thjonusta) {
    var q = norm(tegund + ' ' + leitarStaerd).split(' ').filter(Boolean);
    var best = null;
    for (var i = 0; i < G.vorur.length; i++) {
      var p2 = G.vorur[i], n = norm(p2.nafn);
      var erH = /hledsla/.test(n), erY = /yfirferd/.test(n);
      if (!erH && !erY) continue;
      if (thjonusta === 'hledsla' && !erH) continue;
      if (thjonusta === 'yfirferd' && !erY) continue;
      var nt = n.split(' ').filter(Boolean), passa = 0, sterk = 0;
      for (var j = 0; j < q.length; j++) {
        var qt = q[j];
        /* jshint loopfunc:true */
        if (nt.some(function (x) { return tokenMatches(qt, x); })) { passa++; if (qt.length >= 3) sterk++; }
      }
      if (!sterk) continue;
      var skor = passa / Math.max(1, q.length);
      if (skor < 0.5) continue;
      if (!best || skor > best.skor) best = { vara: p2, skor: skor, nt: nt };
    }
    return best;
  }

  // Lag 2 í 129: endurnýjunarverð (teppi o.fl.). ÞESSI hefur stærðarvörð.
  function varaleit(tegund, staerd) {
    var q = norm(tegund + ' ' + staerd).split(' ').filter(Boolean);
    var qStaerd = q.some(erStaerd), best = null;
    for (var i = 0; i < G.vorur.length; i++) {
      var p2 = G.vorur[i], n = norm(p2.nafn);
      if (/hledsla|yfirferd/.test(n)) continue;
      var nt = n.split(' ').filter(Boolean), passa = 0, sterk = 0, staerdSammala = false;
      for (var j = 0; j < q.length; j++) {
        var qt = q[j];
        /* jshint loopfunc:true */
        if (nt.some(function (x) { return tokenMatches(qt, x); })) {
          passa++; if (qt.length >= 3) sterk++; if (erStaerd(qt)) staerdSammala = true;
        }
      }
      if (!sterk) continue;
      if (qStaerd && nt.some(erStaerd) && !staerdSammala) continue;
      var skor = passa / Math.max(1, q.length);
      if (skor >= 0.5 && (!best || skor > best.skor)) best = { vara: p2, skor: skor };
    }
    return best;
  }

  // Heildarhermun: skilar { vara, leid, staerdHunsud, staerdRong } eða null.
  // `leid` segir HVAÐA lag 129 notaði, svo merkið í töflunni sé ekki ágiskun.
  function nafnaleit(tegund, staerd, thjonusta) {
    var reyk = reykAfbrigdi(tegund, staerd);
    if (reyk) return { vara: reyk, leid: 'afbrigdi', staerdHunsud: false, staerdRong: false };
    var hunsud = STAERDARLAUS.test(tegund);
    var leitarStaerd = hunsud ? '' : staerd;
    var a = adalleit(tegund, leitarStaerd, thjonusta);
    if (a) {
      // Ber varan sömu stærð og tækið? Sami vörður og `findReplacementProduct`
      // fékk 16.06.2026 — aðeins árekstur telst villa. Beri annað hvort enga
      // stærð (t.d. „Yfirferð Brunaslanga" á 30 m slöngu) er ekkert að.
      var taekiTolur = norm(tegund + ' ' + staerd).split(' ').filter(erStaerd);
      var voruTolur = a.nt.filter(erStaerd);
      var arekstur = taekiTolur.length > 0 && voruTolur.length > 0 &&
        !taekiTolur.some(function (t) { return voruTolur.indexOf(t) >= 0; });
      return {
        vara: a.vara, leid: 'adal',
        // Stærðinni var hent OG varan ber aðra stærð → öll tæki tegundarinnar
        // fá þetta verð, hver sem stærð þeirra er. Það er Línuborun-villan.
        staerdHunsud: hunsud && arekstur,
        staerdRong: !hunsud && arekstur,
        // 24.09: tækið ber ENGA stærð en varan gerir það („ABC Duft —" → „Duft 2 kg").
        // Vörðurinn í 129 sleppir þessu (rétt fyrir slöngur), en hér er verðið
        // handahófskennt — fyrsta duft-varan sem leitin hitti. Rautt, ekki blátt.
        staerdVantar: !taekiTolur.length && voruTolur.length > 0
      };
    }
    var v = varaleit(tegund, staerd);
    if (v) {
      var vTolur = norm(v.vara.nafn).split(' ').filter(erStaerd);
      var tTolur = norm(tegund + ' ' + staerd).split(' ').filter(erStaerd);
      return { vara: v.vara, leid: 'vara', staerdHunsud: false, staerdRong: false,
        staerdVantar: !tTolur.length && vTolur.length > 0 };
    }
    return null;
  }

  // ── hleðsla ─────────────────────────────────────────────────────────────
  async function hlada(thvinga) {
    if (G.hlaðið && !thvinga) return;
    var sb = SB();
    if (!sb) throw new Error('Engin gagnabankatenging');
    var svör = await Promise.all([
      // 129 leitar í ÖLLUM virkum vörum, ekki bara flokknum Þjónusta (t.d.
      // Eldvarnarteppi undir „Eldvarnir" — þar er rukkað endurnýjunarverð).
      // Hermunin hér verður að hafa sama mengi, annars lýgur hún.
      sb.from('vorur').select('id,nafn,flokkur,verd_an_vsk,vsk_prosenta,virkt')
        .eq('virkt', true).order('nafn'),
      sb.from('thjonustu_tengingar').select('*'),
      sb.from('v_taeki_tegundir').select('*').order('fjoldi', { ascending: false })
    ]);
    if (svör[0].error) throw svör[0].error;
    if (svör[1].error) throw svör[1].error;
    G.vorur = svör[0].data || [];
    G.tengingar = {};
    (svör[1].data || []).forEach(function (t) { G.tengingar[t.flokkur + '//' + t.lykill] = t; });
    // Sýnin getur vantað á eldri afritum — þá stendur listinn tómur frekar en að glugginn hrynji.
    G.tegundir = svör[2].error ? [] : steypaTegundir(svör[2].data || []);
    G.tegundaVilla = svör[2].error ? String(svör[2].error.message || svör[2].error) : '';
    try {
      G.bkListi = (window.AppSettings && AppSettings.path)
        ? AppSettings.path('brunakerfi_verdlisti') : null;
    } catch (e) { G.bkListi = null; }
    G.hlaðið = true;
  }

  function teng(flokkur, lykill) { return G.tengingar[flokkur + '//' + lykill] || null; }
  function vara(id) {
    for (var i = 0; i < G.vorur.length; i++) if (String(G.vorur[i].id) === String(id)) return G.vorur[i];
    return null;
  }

  async function vistaTengingu(flokkur, lykill, varaId, aukalegt) {
    var sb = SB(); if (!sb) throw new Error('Engin gagnabankatenging');
    var röð = Object.assign({
      flokkur: flokkur, lykill: lykill,
      vara_id: varaId ? Number(varaId) : null,
      uppfaert: new Date().toISOString(),
      uppfaert_af: (window.state && state.currentUser) || null
    }, aukalegt || {});
    var r = await sb.from('thjonustu_tengingar')
      .upsert(röð, { onConflict: 'flokkur,lykill' }).select().single();
    if (r.error) throw r.error;
    G.tengingar[flokkur + '//' + lykill] = r.data;
    return r.data;
  }

  // Ný þjónustulína í `vorur` — sama dálkamynstur og vorur.js notar.
  async function nyThjonusta(nafn, verdMedVsk, vskPct) {
    var sb = SB(); if (!sb) throw new Error('Engin gagnabankatenging');
    var vsk = Number(vskPct) || 24;
    var anVsk = Math.round(((Number(verdMedVsk) || 0) / (1 + vsk / 100)) * 100) / 100;
    var r = await sb.from('vorur').insert({
      nafn: String(nafn || '').trim(), flokkur: 'Þjónusta',
      verd_an_vsk: anVsk, vsk_prosenta: vsk, birgdir: 0, virkt: true
    }).select().single();
    if (r.error) throw r.error;
    G.vorur.push(r.data);
    G.vorur.sort(function (a, b) { return String(a.nafn).localeCompare(String(b.nafn), 'is'); });
    return r.data;
  }

  // ── útlit ───────────────────────────────────────────────────────────────
  function stilar() {
    if (document.getElementById(AUÐK + '-stil')) return;
    var st = document.createElement('style');
    st.id = AUÐK + '-stil';
    st.textContent = [
      '#' + AUÐK + '-bak{position:fixed;inset:0;z-index:12000;background:rgba(8,10,14,.62);',
      '  display:flex;align-items:flex-start;justify-content:center;padding:28px 16px;overflow:auto}',
      '#' + AUÐK + '-gluggi{width:min(1080px,100%);background:#fff;border-radius:14px;',
      '  box-shadow:0 24px 60px -20px rgba(0,0,0,.55);overflow:hidden;font:inherit}',
      '#' + AUÐK + '-haus{display:flex;align-items:center;gap:14px;padding:16px 20px;',
      '  background:linear-gradient(180deg,#1d2430,#141a23);color:#fff}',
      '#' + AUÐK + '-haus h2{margin:0;font-size:17px;font-weight:800;letter-spacing:.01em}',
      '#' + AUÐK + '-haus p{margin:3px 0 0;font-size:12px;color:#aab6c6}',
      '#' + AUÐK + '-loka{margin-left:auto;background:rgba(255,255,255,.12);color:#fff;border:0;',
      '  width:32px;height:32px;border-radius:8px;font-size:17px;cursor:pointer;line-height:1}',
      '#' + AUÐK + '-loka:hover{background:rgba(255,255,255,.24)}',
      '#' + AUÐK + '-efni{padding:18px 20px 22px;max-height:calc(100vh - 150px);overflow:auto}',
      '.' + AUÐK + '-h3{margin:20px 0 8px;font-size:13px;font-weight:800;color:#0f172a;',
      '  text-transform:uppercase;letter-spacing:.05em}',
      '.' + AUÐK + '-h3:first-child{margin-top:0}',
      '.' + AUÐK + '-tafla{width:100%;border-collapse:collapse;font-size:13px}',
      '.' + AUÐK + '-tafla th{text-align:left;font-size:11px;text-transform:uppercase;',
      '  letter-spacing:.04em;color:#5b6573;padding:6px 8px;border-bottom:2px solid #e2e8f0;font-weight:800}',
      '.' + AUÐK + '-tafla td{padding:7px 8px;border-bottom:1px solid #eef1f6;vertical-align:middle}',
      '.' + AUÐK + '-tafla tr:hover td{background:#f8fafc}',
      '.' + AUÐK + '-val{width:100%;max-width:290px;padding:6px 8px;border:1px solid #cbd5e1;',
      '  border-radius:7px;font:inherit;font-size:12.5px;background:#fff}',
      '.' + AUÐK + '-val.vantar{border-color:#dc2626;background:#fef2f2}',
      '.' + AUÐK + '-inp{padding:7px 9px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px}',
      '.' + AUÐK + '-takki{background:linear-gradient(180deg,#209d5c,#178048);color:#fff;border:1px solid rgba(0,0,0,.25);',
      '  padding:8px 14px;border-radius:8px;font:inherit;font-weight:700;font-size:12.5px;cursor:pointer}',
      '.' + AUÐK + '-takki.grar{background:#fff;color:#334155;border:1px solid #cbd5e1}',
      '.' + AUÐK + '-merki{display:inline-block;font-size:10.5px;font-weight:800;padding:2px 7px;',
      '  border-radius:10px;letter-spacing:.03em;white-space:nowrap}',
      '.' + AUÐK + '-m-skrad{background:#dcfce7;color:#166534}',
      '.' + AUÐK + '-m-sjalf{background:#e0e7ff;color:#3730a3}',
      '.' + AUÐK + '-m-rangt{background:#fee2e2;color:#991b1b}',
      '.' + AUÐK + '-m-ekkert{background:#fef3c7;color:#92400e}',
      '.' + AUÐK + '-nytt{margin-top:14px;padding:14px;background:#f1f5f9;border:1px dashed #94a3b8;border-radius:10px;',
      '  display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}',
      '.' + AUÐK + '-nytt label{display:block;font-size:11px;font-weight:700;color:#475569;margin-bottom:4px}',
      '#' + AUÐK + '-stada{padding:8px 20px;font-size:12.5px;font-weight:700;display:none}',
      '@media(max-width:700px){.' + AUÐK + '-val{max-width:none}',
      '  .' + AUÐK + '-tafla thead{display:none}',
      '  .' + AUÐK + '-tafla td{display:block;border:0;padding:3px 0}',
      '  .' + AUÐK + '-tafla tr{display:block;padding:10px 0;border-bottom:1px solid #e2e8f0}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  function segja(texti, villa) {
    var s = document.getElementById(AUÐK + '-stada');
    if (!s) return;
    s.textContent = texti;
    s.style.display = texti ? 'block' : 'none';
    s.style.background = villa ? '#fef2f2' : '#ecfdf5';
    s.style.color = villa ? '#991b1b' : '#166534';
    if (texti && !villa) setTimeout(function () { if (s.textContent === texti) segja(''); }, 3200);
  }

  function valHtml(validId, auðkenni, vantar) {
    var h = '<select class="' + AUÐK + '-val' + (vantar ? ' vantar' : '') + '" data-teng="' + esc(auðkenni) + '">';
    h += '<option value="">— engin tenging —</option>';
    // Þjónustulínurnar eru það sem er verið að leita að í 95% tilvika; hinar
    // vörurnar eru samt með því 129 rukkar endurnýjunarverð af þeim (teppi o.fl.).
    function hopur(heiti, sia) {
      var innri = '';
      G.vorur.forEach(function (p) {
        if (!sia(p)) return;
        innri += '<option value="' + p.id + '"' + (String(p.id) === String(validId) ? ' selected' : '') + '>' +
          esc(p.nafn) + ' · ' + krVsk(p.verd_an_vsk, p.vsk_prosenta) + '</option>';
      });
      return innri ? '<optgroup label="' + heiti + '">' + innri + '</optgroup>' : '';
    }
    h += hopur('Þjónusta', function (p) { return p.flokkur === 'Þjónusta'; });
    h += hopur('Aðrar vörur', function (p) { return p.flokkur !== 'Þjónusta'; });
    return h + '</select>';
  }

  // ── gluggi 1: slökkvitæki ───────────────────────────────────────────────
  function htmlSlokkvitaeki() {
    var h = '<div class="' + AUÐK + '-h3">Tengingar — tegund og stærð → þjónustulína</div>';
    if (G.tegundaVilla) {
      h += '<div style="padding:12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;color:#991b1b;font-size:12.5px">' +
        'Tækjategundir sóttust ekki: ' + esc(G.tegundaVilla) + '</div>';
      return h;
    }
    h += '<p style="margin:0 0 10px;font-size:12px;color:#5b6573;line-height:1.5">' +
      'Sé engin tenging skráð giskar ársskoðunin á þjónustulínu út frá heitinu — og hún krefst þess EKKI ' +
      'að stærðin passi. Þess vegna fékk „Léttvatn 9 L" verð 6 L tækisins. Rauðar línur eru þær sem ' +
      'giskið hittir ekki á rétta stærð.</p>';
    h += '<table class="' + AUÐK + '-tafla"><thead><tr>' +
      '<th>Tegund</th><th>Stærð</th><th style="text-align:right">Tæki</th>' +
      '<th>Þjónusta</th><th>Tengd vara</th><th>Staða</th></tr></thead><tbody>';
    G.tegundir.forEach(function (t) {
      SVAR_KIND.forEach(function (kind) {
        var lyk = t.tegund + '|' + t.staerd + '|' + kind[0];
        var tg = teng('slokkvitaeki', lyk);
        var giska = tg && tg.vara_id ? null : nafnaleit(t.tegund, t.staerd, kind[0]);
        var valinn = tg && tg.vara_id ? tg.vara_id : (giska ? giska.vara.id : '');
        var merki, vantar = false;
        function M(fl, txt, titl) {
          return '<span class="' + AUÐK + '-merki ' + AUÐK + '-m-' + fl + '"' +
            (titl ? ' title="' + esc(titl) + '"' : '') + '>' + txt + '</span>';
        }
        if (tg && tg.ekki_rukka) {
          merki = M('ekkert', 'EKKI RUKKAÐ', 'Skráð sem lína sem á ekki að rukkast.');
        } else if (tg && tg.vara_id) {
          merki = M('skrad', 'SKRÁÐ', 'Skráð tenging — ágiskun kemur hvergi við sögu.');
        } else if (!giska) {
          merki = M('ekkert', 'EKKERT VERÐ', 'Hvorki þjónustulína né endurnýjunarvara fannst. Línan verður verðlaus.');
          vantar = true;
        } else if (giska.staerdRong) {
          merki = M('rangt', 'RÖNG STÆRÐ', 'Ágiskunin hittir á vöru af annarri stærð — rangt verð.');
          vantar = true;
        } else if (giska.staerdHunsud) {
          merki = M('rangt', 'STÆRÐ HUNSUÐ', 'Tegundin er í SIZELESS_SVC, svo stærðinni er hent fyrir leit. ' +
            'Öll tæki af þessari tegund fá sama verð, hver sem stærðin er.');
          vantar = true;
        } else if (giska.staerdVantar) {
          merki = M('rangt', 'STÆRÐ VANTAR', 'Tækin bera enga stærð en varan gerir það — leitin tók fyrstu vöruna sem ' +
            'passaði við heitið. Skráðu tenginguna eða stærðina á tækjunum.');
          vantar = true;
        } else if (giska.leid === 'afbrigdi') {
          merki = M('sjalf', 'AFBRIGÐI', 'Föst vörpun reykskynjara-afbrigðis á söluvöru.');
        } else if (giska.leid === 'vara') {
          merki = M('sjalf', 'ENDURNÝJUN', 'Engin yfirferð/hleðsla til — rukkað endurnýjunarverð vörunnar.');
        } else {
          merki = M('sjalf', 'GISKAÐ', 'Nafnaleit hitti á vöru með passandi stærð.');
        }
        // „✓ Staðfesta" — Agnar: „hvernig staðfesti ég?". Val í listanum vistast
        // strax, en sé ágiskunin RÉTT kviknar enginn change-atburður við að velja
        // það sem þegar stendur. Takkinn vistar það sem sést sem skráða tengingu.
        var stadfesta = (!tg || !tg.vara_id) && valinn
          ? ' <button type="button" class="' + AUÐK + '-stadfesta" data-teng="' + esc('slokkvitaeki|' + lyk) + '" ' +
            'title="Vista það sem stendur í reitnum sem skráða tengingu">✓ Staðfesta</button>'
          : '';
        var hra = t.hra && t.hra.length
          ? '<div style="font-size:10.5px;font-weight:400;color:#94a3b8">' + esc(t.hra.join(' · ')) + '</div>' : '';
        h += '<tr><td style="font-weight:700;color:#0f172a">' + esc(t.tegund) + hra + '</td>' +
          '<td>' + esc(t.staerd || '—') + '</td>' +
          '<td style="text-align:right;color:#5b6573">' + t.fjoldi + '</td>' +
          '<td>' + kind[1] + '</td>' +
          '<td>' + valHtml(valinn, 'slokkvitaeki|' + lyk, vantar) + '</td>' +
          '<td style="white-space:nowrap">' + merki + stadfesta + '</td></tr>';
      });
    });
    h += '</tbody></table>';
    return h + nyttSvaediHtml();
  }

  // ── gluggi 2: brunakerfi ────────────────────────────────────────────────
  function htmlBrunakerfi() {
    var listi = (G.bkListi && Array.isArray(G.bkListi.items)) ? G.bkListi.items : null;
    var h = '<div class="' + AUÐK + '-h3">Verðlisti brunakerfisskýrslunnar</div>';
    h += '<p style="margin:0 0 10px;font-size:12px;color:#5b6573;line-height:1.5">' +
      'Þetta er sami listi og 🏷-takkinn inni í brunakerfisskýrslunni sýnir — ' +
      'hann býr í <code>app_settings.brunakerfi_verdlisti</code>, ekki í vörulistanum. ' +
      'Breytingar hér fara á sama stað.</p>';
    if (!listi || !listi.length) {
      h += '<div style="padding:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12.5px;color:#92400e">' +
        'Enginn vistaður verðlisti fannst — skýrslan notar þá innbyggða grunnlistann. ' +
        'Opnaðu 🏷 í brunakerfisskýrslu til að vista hann fyrst.</div>';
      return h;
    }
    h += '<table class="' + AUÐK + '-tafla"><thead><tr>' +
      '<th>Liður</th><th style="text-align:right">Verð (án vsk)</th><th>Telur búnaðarlínu</th>' +
      '</tr></thead><tbody>';
    listi.forEach(function (it) {
      h += '<tr><td style="font-weight:700;color:#0f172a">' + esc(it.name) + '</td>' +
        '<td style="text-align:right">' + kr(it.price) + '</td>' +
        '<td style="color:#5b6573">' + (it.link ? esc(it.link) : '<em style="color:#94a3b8">— ekki talið —</em>') + '</td></tr>';
    });
    h += '</tbody></table>';
    h += '<p style="margin:12px 0 0;font-size:12px;color:#5b6573">' +
      'Ritstýring þessa lista fer enn fram í 🏷-glugganum inni í skýrslunni. ' +
      'Hann hefur úreldingarvörð sem stöðvar vistun ef önnur vél breytti listanum á meðan — ' +
      'sá vörður á að eiga listann einn, svo hér er hann aðeins sýndur.</p>';
    return h;
  }

  // ── gluggi 3: slökkvikerfi ──────────────────────────────────────────────
  function htmlSlokkvikerfi() {
    var h = '<div class="' + AUÐK + '-h3">Sjálfgefin verð á línur slökkvikerfisskýrslunnar</div>';
    h += '<p style="margin:0 0 10px;font-size:12px;color:#5b6573;line-height:1.5">' +
      'Í dag er verðið slegið inn í hverja skýrslu fyrir sig. Tengirðu línu við þjónustulínu ' +
      'kemur verð hennar sjálfkrafa inn sem uppástunga — handslegið verð í skýrslunni gengur ' +
      'alltaf fyrir.</p>';
    h += '<table class="' + AUÐK + '-tafla"><thead><tr>' +
      '<th>Lína</th><th>Eining</th><th>Tengd vara</th><th>Verð</th></tr></thead><tbody>';
    SVAR_LINUR.forEach(function (L) {
      var tg = teng('slokkvikerfi', L[0]);
      var v = tg && tg.vara_id ? vara(tg.vara_id) : null;
      h += '<tr><td style="font-weight:700;color:#0f172a">' + L[1] + '</td>' +
        '<td style="color:#5b6573">' + L[2] + '</td>' +
        '<td>' + valHtml(tg ? tg.vara_id : '', 'slokkvikerfi|' + L[0], false) + '</td>' +
        '<td>' + (v ? krVsk(v.verd_an_vsk, v.vsk_prosenta) + ' m/vsk' : '<em style="color:#94a3b8">handslegið</em>') + '</td></tr>';
    });
    h += '</tbody></table>';
    return h + nyttSvaediHtml();
  }

  function nyttSvaediHtml() {
    return '<div class="' + AUÐK + '-h3">Ný þjónustulína</div>' +
      '<div class="' + AUÐK + '-nytt">' +
        '<div style="flex:1 1 240px"><label>Heiti</label>' +
          '<input id="' + AUÐK + '-n-nafn" class="' + AUÐK + '-inp" style="width:100%" ' +
          'placeholder="t.d. Léttvatnstæki 9L. yfirferð"></div>' +
        '<div style="flex:0 0 130px"><label>Verð m/vsk</label>' +
          '<input id="' + AUÐK + '-n-verd" class="' + AUÐK + '-inp" style="width:100%" type="number" min="0" step="1"></div>' +
        '<div style="flex:0 0 90px"><label>VSK %</label>' +
          '<input id="' + AUÐK + '-n-vsk" class="' + AUÐK + '-inp" style="width:100%" type="number" value="24"></div>' +
        '<button id="' + AUÐK + '-n-vista" class="' + AUÐK + '-takki">+ Stofna og bæta í listana</button>' +
      '</div>' +
      '<p style="margin:8px 0 0;font-size:11.5px;color:#94a3b8">' +
      'Fer í vörulistann sem þjónusta og birtist samstundis í öllum tengi-listunum hér að ofan.</p>';
  }

  // ── opna / teikna ───────────────────────────────────────────────────────
  var _flokkur = 'slokkvitaeki';

  function teikna() {
    var efni = document.getElementById(AUÐK + '-efni');
    if (!efni) return;
    var aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(efni) : null;
    efni.innerHTML = _flokkur === 'slokkvitaeki' ? htmlSlokkvitaeki()
      : _flokkur === 'brunakerfi' ? htmlBrunakerfi() : htmlSlokkvikerfi();
    if (aftur) aftur();
  }

  function tengjaAtburdi(gluggi) {
    // Ein vakt á glugganum öllum — lifir af endurteikningu efnisins.
    gluggi.addEventListener('change', async function (e) {
      var s = e.target.closest ? e.target.closest('.' + AUÐK + '-val') : null;
      if (!s) return;
      var hlutar = String(s.dataset.teng || '').split('|');
      var flokkur = hlutar.shift(), lykill = hlutar.join('|');
      if (!flokkur || !lykill) return;
      s.disabled = true;
      try {
        var auka = {};
        if (flokkur === 'slokkvitaeki') {
          var p = lykill.split('|');
          auka = { tegund: p[0], staerd: p[1], thjonusta: p[2] };
        }
        await vistaTengingu(flokkur, lykill, s.value, auka);
        segja('Tenging vistuð ✓');
        teikna();
      } catch (villa) {
        segja('Vistaðist EKKI: ' + ((villa && villa.message) || villa), true);
        s.disabled = false;
      }
    });

    gluggi.addEventListener('click', async function (e) {
      if (e.target.id !== AUÐK + '-n-vista') return;
      var nafn = (document.getElementById(AUÐK + '-n-nafn') || {}).value || '';
      var verd = (document.getElementById(AUÐK + '-n-verd') || {}).value || '';
      var vsk = (document.getElementById(AUÐK + '-n-vsk') || {}).value || 24;
      if (!String(nafn).trim()) { segja('Skrifaðu heiti á þjónustulínunni', true); return; }
      if (!(Number(verd) > 0)) { segja('Skrifaðu verð', true); return; }
      e.target.disabled = true;
      try {
        var ný = await nyThjonusta(nafn, verd, vsk);
        segja('„' + ný.nafn + '" stofnuð ✓ — nú valanleg í listunum');
        teikna();
      } catch (villa) {
        segja('Stofnaðist EKKI: ' + ((villa && villa.message) || villa), true);
      }
      e.target.disabled = false;
    });
  }

  async function opna(flokkur) {
    _flokkur = FLOKKAR[flokkur] ? flokkur : 'slokkvitaeki';
    stilar();
    loka();
    var f = FLOKKAR[_flokkur];
    var bak = document.createElement('div');
    bak.id = AUÐK + '-bak';
    bak.innerHTML =
      '<div id="' + AUÐK + '-gluggi" role="dialog" aria-modal="true">' +
        '<div id="' + AUÐK + '-haus">' +
          '<span style="font-size:24px;line-height:1">' + f.tákn + '</span>' +
          '<div><h2>' + esc(f.titill) + '</h2><p>' + esc(f.undir) + '</p></div>' +
          '<button id="' + AUÐK + '-loka" type="button" aria-label="Loka">✕</button>' +
        '</div>' +
        '<div id="' + AUÐK + '-stada"></div>' +
        '<div id="' + AUÐK + '-efni"><div style="padding:40px;text-align:center;color:#94a3b8">Sæki…</div></div>' +
      '</div>';
    document.body.appendChild(bak);
    bak.addEventListener('click', function (e) { if (e.target === bak) loka(); });
    document.getElementById(AUÐK + '-loka').addEventListener('click', loka);
    document.addEventListener('keydown', escLoka);
    tengjaAtburdi(bak);
    try {
      await hlada(true);
      teikna();
    } catch (villa) {
      var efni = document.getElementById(AUÐK + '-efni');
      if (efni) efni.innerHTML = '<div style="padding:30px;color:#991b1b;font-size:13px">' +
        'Gögn sóttust ekki: ' + esc((villa && villa.message) || villa) + '</div>';
    }
  }

  function escLoka(e) { if (e.key === 'Escape') loka(); }
  function loka() {
    var b = document.getElementById(AUÐK + '-bak');
    if (b) b.remove();
    document.removeEventListener('keydown', escLoka);
  }

  // ── opinbert API — `vorur.js` á takkana, þessi pappi á gluggana ──────────
  window.ThjonustuTengingar = {
    opna: opna,
    loka: loka,
    // Lesið af reikningsflæðunum: skráð tenging gengur ALLTAF fyrir nafnaleit.
    async tengingFyrir(flokkur, lykill) {
      await hlada(false);
      var t = teng(flokkur, lykill);
      if (!t || t.ekki_rukka) return null;
      return t.vara_id ? vara(t.vara_id) : null;
    },
    endurhlada: function () { return hlada(true); }
  };
})();
