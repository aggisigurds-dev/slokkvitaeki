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

  // ── SKRÁIN — tegundir og stærðir (taeki_tegundir) ────────────────────────
  // Fellilistarnir (73 fjölda-skráning, 132 stærðardálkur) lesa héðan í stað
  // harðkóðaðra lista. Hleðst við ræsingu svo hún sé tilbúin þegar gluggi opnast;
  // sé hún ekki komin falla þeir á gömlu listana sína. `window.TaekiTegundir`.
  var Skra = (function () {
    var radir = null, lofad = null;
    function setja(r) { radir = (r || []).slice().sort(function (a, b) { return (a.rod - b.rod) || String(a.tegund).localeCompare(String(b.tegund), 'is'); }); }
    function hlada() {
      if (lofad) return lofad;
      var sb = SB();
      if (!sb) return Promise.resolve([]);
      lofad = sb.from('taeki_tegundir').select('*').eq('virk', true).order('rod')
        .then(function (r) { if (!r.error) setja(r.data || []); return radir || []; })
        .catch(function () { return radir || []; });
      return lofad;
    }
    function tegundir() {
      var ut = [];
      (radir || []).forEach(function (r) { if (ut.indexOf(r.tegund) < 0) ut.push(r.tegund); });
      return ut;
    }
    function staerdir(tegund) {
      var f = fjolskylda(tegund), ut = [];
      (radir || []).forEach(function (r) {
        if (r.tegund === tegund || fjolskylda(r.tegund) === f) {
          var s = r.staerd || '—';
          if (ut.indexOf(s) < 0) ut.push(s);
        }
      });
      return ut;
    }
    return { setja: setja, hlada: hlada, tegundir: tegundir, staerdir: staerdir,
      klar: function () { return !!radir; } };
  })();
  window.TaekiTegundir = Skra;
  // Ræsing: létt sókn, engin biðröð — sé DB ekki komið reynir 73 aftur við opnun.
  setTimeout(function () { try { Skra.hlada(); } catch (_) {} }, 1500);

  async function skraTegund(tegund, staerd) {
    var sb = SB(); if (!sb) throw new Error('Engin gagnabankatenging');
    tegund = String(tegund || '').trim(); staerd = String(staerd || '').trim();
    if (staerd === '—') staerd = '';
    if (!tegund) throw new Error('Tegund vantar');
    var r = await sb.from('taeki_tegundir')
      .upsert({ tegund: tegund, staerd: staerd, virk: true, uppfaert: new Date().toISOString(),
        uppfaert_af: (window.state && state.currentUser) || null }, { onConflict: 'tegund,staerd' })
      .select().single();
    if (r.error) throw r.error;
    return r.data;
  }
  // Fjarlægir línu sem ENGIN tæki bera: skráar-raðirnar og tengingar hennar.
  async function eydaLinu(t) {
    var sb = SB(); if (!sb) throw new Error('Engin gagnabankatenging');
    var nofn = [t.tegund].concat(t.hra || []);
    var r1 = await sb.from('taeki_tegundir').delete().in('tegund', nofn).eq('staerd', t.staerd);
    if (r1.error) throw r1.error;
    var lyklar = SVAR_KIND.map(function (k) { return t.tegund + '|' + t.staerd + '|' + k[0]; });
    var r2 = await sb.from('thjonustu_tengingar').delete().eq('flokkur', 'slokkvitaeki').in('lykill', lyklar);
    if (r2.error) throw r2.error;
    lyklar.forEach(function (l) { delete G.tengingar['slokkvitaeki//' + l]; });
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
      sb.from('v_taeki_tegundir').select('*').order('fjoldi', { ascending: false }),
      // Skráin (taeki_tegundir, 24.09) — tegundir/stærðir sem Agnar hefur skráð,
      // líka þær sem ekkert tæki ber enn (t.d. Léttvatn 9 L áður en fyrsta selst).
      sb.from('taeki_tegundir').select('*').eq('virk', true).order('rod')
    ]);
    if (svör[0].error) throw svör[0].error;
    if (svör[1].error) throw svör[1].error;
    G.vorur = svör[0].data || [];
    G.tengingar = {};
    (svör[1].data || []).forEach(function (t) { G.tengingar[t.flokkur + '//' + t.lykill] = t; });
    G.skra = svör[3].error ? [] : (svör[3].data || []);
    Skra.setja(G.skra);
    // Sýnin getur vantað á eldri afritum — þá stendur listinn tómur frekar en að glugginn hrynji.
    // Línur = tæki í skránni ∪ skráðar tegundir/stærðir ∪ skráðar tengingar (fjöldi 0 ef engin tæki).
    var hraar = (svör[2].error ? [] : (svör[2].data || [])).slice();
    G.skra.forEach(function (s) { hraar.push({ tegund: s.tegund, staerd: s.staerd, fjoldi: 0 }); });
    Object.keys(G.tengingar).forEach(function (k) {
      var t = G.tengingar[k];
      if (t.flokkur === 'slokkvitaeki' && t.tegund) hraar.push({ tegund: t.tegund, staerd: t.staerd || '', fjoldi: 0 });
    });
    G.tegundir = steypaTegundir(hraar);
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
    // 129 (ársskoðunar-útreikningurinn) og 128 (fjölda-glugginn) eiga skyndiminni
    // af tengingunum — segja þeim að það sé úrelt svo nýja verðið sjáist strax.
    try { window.dispatchEvent(new CustomEvent('thjonustu-tengingar-breytt', { detail: r.data })); } catch (_) {}
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
      // 24.09.2026 (Agnar: „ég sé ekki neitt á þetta með svarta stafi"): titillinn var dökkur á
      // dökkum haus í öllum þremur flokkunum. Hausinn setur `color:#fff` á sig sjálfan — en h2
      // ERFIR þann lit ekki, því app.css á eigin reglu á stakið: `h1,h2,h3{color:var(--ink1)}`
      // (#11141c). Regla á stakinu vinnur alltaf á erfðum, hversu ljós sem foreldrið er.
      // MÆLT á lifandi síðu: computed color rgb(17,20,28) fyrir, rgb(255,255,255) eftir.
      'html body #' + AUÐK + '-haus h2{margin:0;font-size:17px;font-weight:800;letter-spacing:.01em;'
        + 'color:#fff!important}',
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
      // leitarreiturinn (kom í stað fellilistans 24.09)
      '.' + AUÐK + '-leit{position:relative;max-width:320px}',
      '.' + AUÐK + '-leit-inp{width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #cbd5e1;border-radius:7px;',
      '  font:inherit;font-size:12.5px;background:#fff}',
      '.' + AUÐK + '-leit.vantar .' + AUÐK + '-leit-inp{border-color:#dc2626;background:#fef2f2}',
      '.' + AUÐK + '-leit-inp:focus{outline:2px solid #2563eb;outline-offset:-1px;background:#fff}',
      '.' + AUÐK + '-leit-listi{position:fixed;z-index:12500;max-height:320px;overflow:auto;',
      '  background:#fff;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 10px 30px rgba(15,23,42,.18);padding:4px}',
      '.' + AUÐK + '-leit-hopur{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#94a3b8;padding:6px 8px 3px}',
      '.' + AUÐK + '-leit-kostur{display:flex;justify-content:space-between;gap:10px;width:100%;text-align:left;border:0;background:none;',
      '  padding:6px 8px;border-radius:6px;font:inherit;font-size:12.5px;color:#0f172a;cursor:pointer}',
      '.' + AUÐK + '-leit-kostur span{color:#5b6573;white-space:nowrap;font-variant-numeric:tabular-nums}',
      '.' + AUÐK + '-leit-kostur.tom{color:#94a3b8;font-style:italic}',
      '.' + AUÐK + '-leit-kostur:hover,.' + AUÐK + '-leit-kostur.virk{background:#eff6ff}',
      '.' + AUÐK + '-leit-kostur.valin{font-weight:700;background:#f0fdf4}',
      // röðunarhausar + staðfesta-takki
      '.' + AUÐK + '-haus{cursor:pointer;user-select:none;white-space:nowrap}',
      '.' + AUÐK + '-haus:hover{color:#0f172a}',
      '.' + AUÐK + '-haus.virk{color:#1d4ed8}',
      '.' + AUÐK + '-or{margin-left:4px;font-size:10px;opacity:.55}',
      '.' + AUÐK + '-haus.virk .' + AUÐK + '-or{opacity:1}',
      '.' + AUÐK + '-stadfesta{margin-left:6px;padding:2px 8px;border-radius:10px;border:1px solid #86efac;background:#f0fdf4;',
      '  color:#166534;font:inherit;font-size:10.5px;font-weight:800;cursor:pointer;vertical-align:middle}',
      '.' + AUÐK + '-stadfesta:hover{background:#dcfce7}',
      '.' + AUÐK + '-stadfesta:disabled{opacity:.5;cursor:default}',
      '.' + AUÐK + '-eyda{margin-left:6px;border:1px solid #fecaca;background:#fff;color:#b91c1c;border-radius:6px;',
      '  font:inherit;font-size:10.5px;font-weight:800;padding:1px 6px;cursor:pointer;vertical-align:middle}',
      '.' + AUÐK + '-eyda:hover{background:#fef2f2}',
      '.' + AUÐK + '-tafla tr.' + AUÐK + '-fokus td{background:#fef9c3 !important;box-shadow:inset 0 0 0 1px #fde047}',
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

  // 24.09 (Agnar: „Mátt setja upp leitarglugga") — fellilistinn með 60+ vörum
  // vék fyrir leitarreit: skrifa hluta úr heiti („9l yfir"), listi síast með
  // sömu norm() og leitin sjálf, smellur/Enter vistar. Sama data-teng samskipta-
  // regla og áður, svo vistunarleiðin er óbreytt.
  function voruTexti(p) { return p.nafn + ' · ' + krVsk(p.verd_an_vsk, p.vsk_prosenta); }
  function valHtml(validId, auðkenni, vantar) {
    var v = validId ? vara(validId) : null;
    return '<div class="' + AUÐK + '-leit' + (vantar ? ' vantar' : '') + '" data-teng="' + esc(auðkenni) + '" data-val="' + esc(validId || '') + '">' +
      '<input type="text" class="' + AUÐK + '-leit-inp" autocomplete="off" spellcheck="false" ' +
        'value="' + esc(v ? voruTexti(v) : '') + '" placeholder="Leita að vöru eða þjónustu…" ' +
        'title="Skrifaðu hluta úr heiti — listinn síast. Enter eða smellur vistar.">' +
      '<div class="' + AUÐK + '-leit-listi" hidden></div></div>';
  }
  // Leitarniðurstöður: þjónustulínur fyrst (95% tilvika), aðrar vörur á eftir
  // (129 rukkar endurnýjunarverð af teppum o.fl.). Tóm fyrirspurn sýnir allt.
  function leitaVorur(q) {
    var t = norm(q).split(' ').filter(Boolean);
    var passar = G.vorur.filter(function (p) {
      if (!t.length) return true;
      var n = norm(p.nafn) + ' ' + norm(p.flokkur);
      return t.every(function (x) { return n.indexOf(x) >= 0; });
    });
    passar.sort(function (a, b) {
      var ta = a.flokkur === 'Þjónusta' ? 0 : 1, tb = b.flokkur === 'Þjónusta' ? 0 : 1;
      return ta - tb || String(a.nafn).localeCompare(String(b.nafn), 'is');
    });
    return passar;
  }
  function teiknaLeitarlista(rot, q) {
    var listi = rot.querySelector('.' + AUÐK + '-leit-listi');
    if (!listi) return;
    var valid = rot.dataset.val || '';
    var nidur = leitaVorur(q), h = '';
    h += '<button type="button" class="' + AUÐK + '-leit-kostur tom" data-id="">— engin tenging —</button>';
    var flokkur = null;
    nidur.slice(0, 60).forEach(function (p) {
      var fl = p.flokkur === 'Þjónusta' ? 'Þjónusta' : 'Aðrar vörur';
      if (fl !== flokkur) { flokkur = fl; h += '<div class="' + AUÐK + '-leit-hopur">' + fl + '</div>'; }
      h += '<button type="button" class="' + AUÐK + '-leit-kostur' + (String(p.id) === String(valid) ? ' valin' : '') + '" data-id="' + p.id + '">' +
        esc(p.nafn) + ' <span>' + krVsk(p.verd_an_vsk, p.vsk_prosenta) + '</span></button>';
    });
    if (!nidur.length) h += '<div class="' + AUÐK + '-leit-hopur">Engin vara passar við „' + esc(q) + '"</div>';
    if (nidur.length > 60) h += '<div class="' + AUÐK + '-leit-hopur">… ' + (nidur.length - 60) + ' fleiri — skrifaðu meira</div>';
    listi.innerHTML = h;
    listi.hidden = false;
    // Listinn er position:fixed (ekki absolute í reitnum) — annars klippir skrun-
    // ílátið #p410-efni hann af á neðstu línunum og hann er óaðgengilegur þar.
    var inp = rot.querySelector('.' + AUÐK + '-leit-inp');
    var r = (inp || rot).getBoundingClientRect();
    var plass = window.innerHeight - r.bottom - 12;
    var upp = plass < 180 && r.top > plass;      // lítið pláss fyrir neðan → opna upp
    listi.style.left = r.left + 'px';
    listi.style.width = Math.max(r.width, 260) + 'px';
    listi.style.maxHeight = Math.min(320, Math.max(120, upp ? r.top - 12 : plass)) + 'px';
    if (upp) { listi.style.top = 'auto'; listi.style.bottom = (window.innerHeight - r.top + 3) + 'px'; }
    else { listi.style.bottom = 'auto'; listi.style.top = (r.bottom + 3) + 'px'; }
  }
  function felaLeitarlista(rot) {
    var listi = rot && rot.querySelector('.' + AUÐK + '-leit-listi');
    if (listi) listi.hidden = true;
    // Textinn í reitnum á að sýna það sem ER vistað, ekki hálfskrifaða leit.
    var inp = rot && rot.querySelector('.' + AUÐK + '-leit-inp');
    if (inp) { var v = rot.dataset.val ? vara(rot.dataset.val) : null; inp.value = v ? voruTexti(v) : ''; }
  }

  // ── gluggi 1: slökkvitæki ───────────────────────────────────────────────
  // ── röðun (Agnar 24.09: „Mátt setja sort á allt") ──────────────────────
  // Sjálfgefið: flest tæki efst — það sem er mest í húfi. Smellur á haus
  // raðar; sami haus aftur snýr röðinni. Stærð raðast eftir tölunni fremst
  // („2 kg" < „6 kg" < „12 kg"), ekki stafrófsröð.
  var RODUN = { dalkur: 'taeki', upp: false };
  function stTala(s) { var m = String(s || '').match(/\d+([.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : NaN; }
  function bera(a, b, dalkur) {
    if (dalkur === 'taeki') return a.fjoldi - b.fjoldi;
    if (dalkur === 'staerd') {
      var x = stTala(a.staerd), y = stTala(b.staerd);
      if (!isNaN(x) && !isNaN(y) && x !== y) return x - y;
      if (isNaN(x) !== isNaN(y)) return isNaN(x) ? 1 : -1;
    }
    var s1 = String(a[dalkur] || ''), s2 = String(b[dalkur] || '');
    return s1.localeCompare(s2, 'is');
  }

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
      'giskið hittir ekki á rétta stærð. Val í reitnum vistast strax; „✓ Staðfesta" festir rétta ágiskun.</p>';

    // 1) Reikna allar línur fyrst, 2) raða, 3) teikna.
    var linur = [];
    G.tegundir.forEach(function (t) {
      SVAR_KIND.forEach(function (kind) {
        var lyk = t.tegund + '|' + t.staerd + '|' + kind[0];
        var tg = teng('slokkvitaeki', lyk);
        var giska = tg && tg.vara_id ? null : nafnaleit(t.tegund, t.staerd, kind[0]);
        var valinn = tg && tg.vara_id ? tg.vara_id : (giska ? giska.vara.id : '');
        var vantar = false, fl, txt, titl;
        if (tg && tg.ekki_rukka) {
          fl = 'ekkert'; txt = 'EKKI RUKKAÐ'; titl = 'Skráð sem lína sem á ekki að rukkast.';
        } else if (tg && tg.vara_id) {
          fl = 'skrad'; txt = 'SKRÁÐ'; titl = 'Skráð tenging — ágiskun kemur hvergi við sögu.';
        } else if (!giska) {
          fl = 'ekkert'; txt = 'EKKERT VERÐ'; titl = 'Hvorki þjónustulína né endurnýjunarvara fannst. Línan verður verðlaus.';
          vantar = true;
        } else if (giska.staerdRong) {
          fl = 'rangt'; txt = 'RÖNG STÆRÐ'; titl = 'Ágiskunin hittir á vöru af annarri stærð — rangt verð.';
          vantar = true;
        } else if (giska.staerdHunsud) {
          fl = 'rangt'; txt = 'STÆRÐ HUNSUÐ'; titl = 'Tegundin er í SIZELESS_SVC, svo stærðinni er hent fyrir leit. ' +
            'Öll tæki af þessari tegund fá sama verð, hver sem stærðin er.';
          vantar = true;
        } else if (giska.staerdVantar) {
          fl = 'rangt'; txt = 'STÆRÐ VANTAR'; titl = 'Tækin bera enga stærð en varan gerir það — leitin tók fyrstu vöruna sem ' +
            'passaði við heitið. Skráðu tenginguna eða stærðina á tækjunum.';
          vantar = true;
        } else if (giska.leid === 'afbrigdi') {
          fl = 'sjalf'; txt = 'AFBRIGÐI'; titl = 'Föst vörpun reykskynjara-afbrigðis á söluvöru.';
        } else if (giska.leid === 'vara') {
          fl = 'sjalf'; txt = 'ENDURNÝJUN'; titl = 'Engin yfirferð/hleðsla til — rukkað endurnýjunarverð vörunnar.';
        } else {
          fl = 'sjalf'; txt = 'GISKAÐ'; titl = 'Nafnaleit hitti á vöru með passandi stærð.';
        }
        var v = valinn ? vara(valinn) : null;
        linur.push({
          t: t, kind: kind, lyk: lyk, tg: tg, valinn: valinn, vantar: vantar,
          fl: fl, txt: txt, titl: titl,
          tegund: t.tegund, staerd: t.staerd, fjoldi: t.fjoldi, thjonusta: kind[1],
          vara: v ? v.nafn : '', stada: txt
        });
      });
    });
    linur.sort(function (a, b) {
      var r = bera(a, b, RODUN.dalkur);
      if (r) return RODUN.upp ? r : -r;
      // jafntefli: flest tæki efst, svo tegund/stærð/þjónusta — óháð stefnu
      return (b.fjoldi - a.fjoldi) || bera(a, b, 'tegund') || bera(a, b, 'staerd') || bera(a, b, 'thjonusta');
    });

    function haus(dalkur, heiti, still) {
      var virk = RODUN.dalkur === dalkur;
      return '<th class="' + AUÐK + '-haus' + (virk ? ' virk' : '') + '" data-rodun="' + dalkur + '"' +
        (still ? ' style="' + still + '"' : '') + ' title="Raða eftir ' + esc(heiti.toLowerCase()) + '">' +
        heiti + '<span class="' + AUÐK + '-or">' + (virk ? (RODUN.upp ? '▲' : '▼') : '⇅') + '</span></th>';
    }
    h += '<table class="' + AUÐK + '-tafla"><thead><tr>' +
      haus('tegund', 'Tegund') + haus('staerd', 'Stærð') + haus('taeki', 'Tæki', 'text-align:right') +
      haus('thjonusta', 'Þjónusta') + haus('vara', 'Tengd vara') + haus('stada', 'Staða') + '</tr></thead><tbody>';

    linur.forEach(function (L) {
      var merki = '<span class="' + AUÐK + '-merki ' + AUÐK + '-m-' + L.fl + '" title="' + esc(L.titl) + '">' + L.txt + '</span>';
      // „✓ Staðfesta" — Agnar: „hvernig staðfesti ég?". Val í listanum vistast
      // strax, en sé ágiskunin RÉTT kviknar enginn atburður við að velja það
      // sem þegar stendur. Takkinn vistar það sem sést sem skráða tengingu.
      var stadfesta = (!L.tg || !L.tg.vara_id) && L.valinn
        ? ' <button type="button" class="' + AUÐK + '-stadfesta" data-teng="' + esc('slokkvitaeki|' + L.lyk) + '" ' +
          'data-vara="' + esc(L.valinn) + '" title="Vista það sem stendur í reitnum sem skráða tengingu">✓ Staðfesta</button>'
        : '';
      var hra = L.t.hra && L.t.hra.length
        ? '<div style="font-size:10.5px;font-weight:400;color:#94a3b8">' + esc(L.t.hra.join(' · ')) + '</div>' : '';
      // Lína sem engin tæki bera (bara skráð) má hverfa — ✕ við fjöldann.
      var eyda = L.fjoldi === 0 && L.kind[0] === SVAR_KIND[0][0]
        ? ' <button type="button" class="' + AUÐK + '-eyda" data-linu="' + esc(L.tegund + '|' + L.staerd) + '" ' +
          'title="Fjarlægja þessa tegund/stærð úr skránni (engin tæki bera hana)">✕</button>' : '';
      h += '<tr data-linu="' + esc(L.tegund + '|' + L.staerd) + '"><td style="font-weight:700;color:#0f172a">' + esc(L.tegund) + hra + '</td>' +
        '<td>' + esc(L.staerd || '—') + '</td>' +
        '<td style="text-align:right;color:#5b6573;white-space:nowrap">' + (L.fjoldi || '<span style="color:#cbd5e1">0</span>') + eyda + '</td>' +
        '<td>' + L.thjonusta + '</td>' +
        '<td>' + valHtml(L.valinn, 'slokkvitaeki|' + L.lyk, L.vantar) + '</td>' +
        '<td style="white-space:nowrap">' + merki + stadfesta + '</td></tr>';
    });
    h += '</tbody></table>';
    // + Bæta við tegund/stærð (Agnar 24.09: „ég geti bætt við t.d. öðrum stærðum,
    // tegundum") — fer í taeki_tegundir og birtist strax í fellilistunum (73/132).
    var tegundaListi = '';
    Skra.tegundir().forEach(function (t) { tegundaListi += '<option value="' + esc(t) + '">'; });
    h += '<div class="' + AUÐK + '-h3" style="margin-top:14px">Ný tegund eða stærð</div>' +
      '<div class="' + AUÐK + '-nytt">' +
        '<div style="flex:1 1 200px"><label>Tegund</label>' +
          '<input id="' + AUÐK + '-tt-tegund" class="' + AUÐK + '-inp" style="width:100%" list="' + AUÐK + '-tt-tegundir" ' +
          'placeholder="t.d. Léttvatn eða ný tegund"><datalist id="' + AUÐK + '-tt-tegundir">' + tegundaListi + '</datalist></div>' +
        '<div style="flex:0 0 150px"><label>Stærð</label>' +
          '<input id="' + AUÐK + '-tt-staerd" class="' + AUÐK + '-inp" style="width:100%" placeholder="t.d. 9 L (má vera tóm)"></div>' +
        '<button id="' + AUÐK + '-tt-vista" type="button" class="' + AUÐK + '-takki">+ Bæta við</button>' +
      '</div>' +
      '<p style="margin:8px 0 0;font-size:11.5px;color:#94a3b8">' +
      'Línan birtist hér að ofan með 0 tæki og í fellilistunum Tegund/Stærð þegar tæki eru skráð. ' +
      'Skrifaðu stærðina eins og hún á að standa á tækinu („6 L", „2 kg", „30 m").</p>';
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
    // Ein vistunarleið fyrir leitarreit OG ✓ Staðfesta: tengStr = „flokkur|lykill".
    async function vistaVal(tengStr, varaId, hnutur) {
      var hlutar = String(tengStr || '').split('|');
      var flokkur = hlutar.shift(), lykill = hlutar.join('|');
      if (!flokkur || !lykill) return;
      if (hnutur) hnutur.disabled = true;
      try {
        var auka = {};
        if (flokkur === 'slokkvitaeki') {
          var p = lykill.split('|');
          auka = { tegund: p[0], staerd: p[1], thjonusta: p[2] };
        }
        await vistaTengingu(flokkur, lykill, varaId, auka);
        segja('Tenging vistuð ✓');
        teikna();
      } catch (villa) {
        segja('Vistaðist EKKI: ' + ((villa && villa.message) || villa), true);
        if (hnutur) hnutur.disabled = false;
      }
    }

    // ── leitarreiturinn ──
    gluggi.addEventListener('focusin', function (e) {
      var inp = e.target.closest ? e.target.closest('.' + AUÐK + '-leit-inp') : null;
      if (!inp) return;
      // Fókus tæmir sýnitextann svo hægt sé að byrja að skrifa strax; felaLeitarlista
      // setur vistaða heitið aftur ef ekkert er valið.
      inp.dataset.fyrri = inp.value; inp.value = '';
      teiknaLeitarlista(inp.parentNode, '');
    });
    gluggi.addEventListener('input', function (e) {
      var inp = e.target.closest ? e.target.closest('.' + AUÐK + '-leit-inp') : null;
      if (inp) teiknaLeitarlista(inp.parentNode, inp.value);
    });
    gluggi.addEventListener('keydown', function (e) {
      var inp = e.target.closest ? e.target.closest('.' + AUÐK + '-leit-inp') : null;
      if (!inp) return;
      var rot = inp.parentNode, listi = rot.querySelector('.' + AUÐK + '-leit-listi');
      if (e.key === 'Escape') { felaLeitarlista(rot); inp.blur(); return; }
      if (!listi || listi.hidden) return;
      var kostir = Array.prototype.slice.call(listi.querySelectorAll('.' + AUÐK + '-leit-kostur'));
      var i = kostir.findIndex(function (k) { return k.classList.contains('virk'); });
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (i >= 0) kostir[i].classList.remove('virk');
        i = e.key === 'ArrowDown' ? Math.min(kostir.length - 1, i + 1) : Math.max(0, i - 1);
        if (kostir[i]) { kostir[i].classList.add('virk'); kostir[i].scrollIntoView({ block: 'nearest' }); }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // Enter án örva: ein niðurstaða (fyrir utan „engin tenging") → hún er meint.
        var mark = i >= 0 ? kostir[i] : (kostir.length === 2 ? kostir[1] : null);
        if (mark) { listi.hidden = true; vistaVal(rot.dataset.teng, mark.dataset.id, inp); }
      }
    });
    // mousedown, ekki click: blur á reitnum kæmi á undan click og fældi listann.
    gluggi.addEventListener('mousedown', function (e) {
      var k = e.target.closest ? e.target.closest('.' + AUÐK + '-leit-kostur') : null;
      if (!k) return;
      e.preventDefault();
      var rot = k.closest('.' + AUÐK + '-leit');
      rot.querySelector('.' + AUÐK + '-leit-listi').hidden = true;
      vistaVal(rot.dataset.teng, k.dataset.id, rot.querySelector('.' + AUÐK + '-leit-inp'));
    });
    gluggi.addEventListener('focusout', function (e) {
      var inp = e.target.closest ? e.target.closest('.' + AUÐK + '-leit-inp') : null;
      if (!inp) return;
      var rot = inp.parentNode;
      setTimeout(function () { if (!rot.contains(document.activeElement)) felaLeitarlista(rot); }, 120);
    });
    // Listinn er fixed — skrun í efninu færir reitinn en ekki listann; fela hann þá.
    gluggi.addEventListener('scroll', function () {
      gluggi.querySelectorAll('.' + AUÐK + '-leit-listi:not([hidden])').forEach(function (l) {
        var rot = l.parentNode; felaLeitarlista(rot);
        var inp = rot.querySelector('.' + AUÐK + '-leit-inp'); if (inp) inp.blur();
      });
    }, true);

    // ── ✓ Staðfesta + röðunarhausar ──
    gluggi.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('.' + AUÐK + '-stadfesta') : null;
      if (b) { vistaVal(b.dataset.teng, b.dataset.vara, b); return; }
      if (e.target.id === AUÐK + '-tt-vista') {
        var tt = (document.getElementById(AUÐK + '-tt-tegund') || {}).value || '';
        var ts = (document.getElementById(AUÐK + '-tt-staerd') || {}).value || '';
        if (!String(tt).trim()) { segja('Skrifaðu tegund', true); return; }
        e.target.disabled = true;
        skraTegund(tt, ts).then(function () {
          segja('Skráð: ' + tt.trim() + (ts.trim() ? ' ' + ts.trim() : '') + ' ✓');
          return hlada(true);
        }).then(function () { teikna(); fokusaLinu(tt, ts); })
          .catch(function (v) { segja('Vistaðist EKKI: ' + ((v && v.message) || v), true); e.target.disabled = false; });
        return;
      }
      var x = e.target.closest ? e.target.closest('.' + AUÐK + '-eyda') : null;
      if (x) {
        var hl = String(x.dataset.linu || '').split('|');
        var lina = null;
        G.tegundir.forEach(function (t) { if (t.tegund === hl[0] && t.staerd === (hl[1] || '')) lina = t; });
        if (!lina) return;
        if (!window.confirm('Fjarlægja „' + lina.tegund + (lina.staerd ? ' ' + lina.staerd : '') + '" úr skránni og tengingar hennar?')) return;
        x.disabled = true;
        eydaLinu(lina).then(function () { segja('Fjarlægt ✓'); return hlada(true); }).then(teikna)
          .catch(function (v) { segja('Tókst EKKI: ' + ((v && v.message) || v), true); x.disabled = false; });
        return;
      }
      var th = e.target.closest ? e.target.closest('.' + AUÐK + '-haus') : null;
      if (th) {
        var d = th.dataset.rodun;
        if (RODUN.dalkur === d) RODUN.upp = !RODUN.upp;
        else { RODUN.dalkur = d; RODUN.upp = d !== 'taeki'; }   // texti: A→Ö; tæki: flest efst
        teikna();
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

  // Lýsa upp línu (t.d. þegar 128 sendir hingað úr fjölda-glugganum með „Reykskynjari / Batterís").
  function fokusaLinu(tegund, staerd) {
    var k = fjolskylda(tegund) + '|' + String(staerd || '').trim().replace(/^—$/, '');
    var radir = document.querySelectorAll('#' + AUÐK + '-efni tr[data-linu]');
    var fyrsta = null;
    radir.forEach(function (tr) {
      if (tr.dataset.linu === k) { tr.classList.add(AUÐK + '-fokus'); if (!fyrsta) fyrsta = tr; }
    });
    if (fyrsta) fyrsta.scrollIntoView({ block: 'center' });
    return !!fyrsta;
  }

  // `fokus` = { tegund, staerd } — línan sem sendandinn var að skoða lýsist upp.
  async function opna(flokkur, fokus) {
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
      if (fokus && fokus.tegund && !fokusaLinu(fokus.tegund, fokus.staerd)) {
        // Línan er ekki til — forfylla „Ný tegund eða stærð" svo eitt „+ Bæta við" nægi.
        var it = document.getElementById(AUÐK + '-tt-tegund'), is = document.getElementById(AUÐK + '-tt-staerd');
        if (it) it.value = fokus.tegund;
        if (is) is.value = fokus.staerd && fokus.staerd !== '—' ? fokus.staerd : '';
        segja('„' + fokus.tegund + (fokus.staerd ? ' ' + fokus.staerd : '') + '" er ekki í skránni — bættu henni við neðst.', true);
        if (it) it.scrollIntoView({ block: 'center' });
      }
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
    fjolskylda: fjolskylda,
    // Fyrir 128 o.fl.: skráð vara fyrir tegund+stærð+þjónustu (yfirferd/hledsla),
    // 'ekki_rukka', eða null. Sami lykill og 129 les — fjölskylduheiti + trimmuð stærð.
    async skradVara(tegund, staerd, kind) {
      await hlada(false);
      var t = teng('slokkvitaeki', fjolskylda(tegund) + '|' + String(staerd || '').trim().replace(/^—$/, '') + '|' + kind);
      if (!t) return null;
      if (t.ekki_rukka) return 'ekki_rukka';
      return t.vara_id ? vara(t.vara_id) : null;
    },
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
