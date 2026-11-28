/* === KERFI OG ÞJÓNUSTA — spjald á fyrirtækjaprófílnum (450) — 09.10.2026 =======================================
 *
 * Agnar 08.10.2026: „hvort þau séu með slíkt kerfi eða hvort það vanti … geta þá kanski skráð smá saman hjá hverjum þeir
 * eru með kerfin og þjónusturnar til að geta fundið út sirka verðin sem þeir eru að greiða og við þá gefið þeim betra
 * tilboð" · „Fínt líka að fá brunakerfisupplýsingar inn í öll fyrirtækin með brunakerfisþjónustu".
 *
 * Stálspjald (442 .ssp) beint á eftir Samskiptum (eða borðanum ef Samskipti eru ekki komin):
 *   haus      KERFI OG ÞJÓNUSTA · tegund staðarins · samtala tækifæra · Opna/Loka
 *   ræma      ein lína (föst hæð): notkunarflokkur · vissa · merki hvers kerfis með ljósi tækifærisins
 *   opið      tegund + rök + Leiðrétta tegund · hvert kerfi: krafa (skylt/skilyrt + skilyrði + heimild sem tengill) ·
 *             til staðar Já/Nei/Óvitað · þjónustuaðili · verð kr/ár · samningur til · athugasemd · tækifæri a–d ·
 *             brunaviðvörunarkerfi með smáatriðum úr brunakerfisskrá (stjórnstöð, skynjarar …) og hvað vantar
 * Staður sem er ekki í stadur_flokkun: spjaldið segir það í einni línu — engin innsetning úr vafra.
 *
 * VISTUN (VERKLAG: vistun má aldrei glatast): Já/Nei/Óvitað vistar við smell; textareitir við `change` (blur). Hver
 * innsláttur er skráður sem biðvistun (449a) svo 365 sendi hann með keepalive ef síðunni er lokað í miðjum reit.
 * „Vistað HH:MM" birtist aðeins eftir að þjónninn skilaði röðinni; mistök sýna villuna og „Reyna aftur".
 * Öll skrif fara um window.Flokkun (449a) — aðeins handvalsreitir, aldrei sjálfvirku dálkarnir né `uppruni`.
 *
 * STÖÐUGT VIÐMÓT: spjaldið er sett inn í SAMA tifi og prófíllinn teiknast (óinngjöfuð vakt á #companies-main, aðeins
 * childList — spjaldið er beint barn hans), lokað með fastri hæð þar til gögn koma, svo ekkert hoppar þegar þau lenda.
 * Opið/lokað lifir í breytu per fyrirtæki. Eftir vistun er aðeins röðin sem breyttist uppfærð (merki, ljós, staða) —
 * reitur sem verið er að skrifa í er aldrei teiknaður upp á nýtt. 421 lætur stadur_kerfi/stadur_flokkun vera
 * (SJALFTEIKNA): spjaldið teiknar sig sjálft.
 * ================================================================================================================ */
(() => {
  if (window.__kerfiThjonusta450) return;
  window.__kerfiThjonusta450 = true;

  const ID = '_kt450';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const DARK_PLATE = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  const STAL = 'linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  const FERSKT_MS = 30000;
  const MANUDIR = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];

  const F = () => window.Flokkun;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const kl = () => new Date().toTimeString().slice(0, 5);

  /* ── ÁSTAND ─────────────────────────────────────────────────────────────────────────────────────────────── */
  const _minni = new Map();      // fid → { gogn, t, fingur }
  const _opid = new Map();       // fid → true ef spjaldið er opið (lifir endurteikningu prófílsins, ekki milli lota)
  const _ollKerfi = new Map();   // fid → true: líka kerfi án kröfu
  const _rodStada = new Map();   // `${fid}|${kerfi}` → { texti, villa, reyna }
  let _ritill = null;            // { fid, stada, villa, vistar } — Leiðrétta tegund
  const _saekir = new Map();     // fid → promise
  const BVK = 'brunavidvorunarkerfi', SLT = 'slokkvitaeki';

  // Flipinn sem prófíll I (500) sýnir: 'bk' (Brunakerfisþjónusta) · 'adrar' (Aðrar þjónustur) · null (gamli prófíllinn / aðrir flipar).
  const flipi = () => { const m = document.getElementById('companies-main'); const t = m && m.getAttribute('data-p2tab'); return t === 'bk' || t === 'adrar' ? t : null; };
  // Opið/lokað: val notandans gildir; annars opið í þessum tveimur flipum (þar er spjaldið aðalefnið), lokað annars staðar.
  const erOpid = (fid) => (_opid.has(fid) ? !!_opid.get(fid) : !!flipi());
  // Hvaða kerfi teljast í samtölunni í hausnum eftir flipa — sama skipting og CSS-ið hér að ofan.
  const iFlipa = (kerfi) => { const f = flipi(); return f === 'bk' ? kerfi === BVK : f === 'adrar' ? kerfi !== BVK : true; };
  // Brunakerfisáskrift = félagið er á áskriftarlistanum (147; sama regla og 153 hasBru: !!brunakerfi_customers[fid]).
  const bkListi = () => (window.AppSettings && AppSettings.path && AppSettings.path('brunakerfi_customers')) || {};
  const erBkAskrift = (fid) => !!bkListi()[String(fid)];
  const toast = (t) => { try { if (window.Toast && Toast.show) { Toast.show(t); return; } } catch (_) {} console.log('[450]', t); };

  /* ── CSS (eigið gildissvið #_kt450 ofan á .ssp úr 442) ──────────────────────────────────────────────────── */
  function css() {
    // Gervi-auðkenni: 442 stílar .ssp-btn/.ssp-reitur/.ssp-plata með fjórum :not(#…) + !important — fimm auðkenni hér vinna.
    const R = '#' + ID + ':not(#_k450a):not(#_k450b):not(#_k450c):not(#_k450d)';
    return [
      R + '{margin:12px 0!important;font-family:' + SANS + '}',
      R + ' *{box-sizing:border-box}',
      R + ' [hidden]{display:none!important}',
      R + ' .kt-haus{flex-wrap:nowrap!important;height:46px;overflow:hidden}',
      R + ' .kt-haus .ssp-titill{flex:none}',
      R + ' .kt-undir{flex:1 1 auto;min-width:0!important}',
      R + ' .kt-samtals{flex:none;display:flex;gap:5px}',
      R + ' button.kt-opna{flex:none}',
      R + ' button.kt-opna{min-width:76px}',
      // Ræman — ein lína, föst hæð (engin hreyfing þegar gögn koma)
      R + ' .kt-raema{display:flex;align-items:center;gap:6px;height:46px;padding:0 12px;overflow-x:auto;overflow-y:hidden;white-space:nowrap;background:' + STAL + ';scrollbar-width:none;border-bottom:1px solid transparent}',
      R + ' .kt-raema::-webkit-scrollbar{display:none}',
      R + ' .kt-raema > *{flex:none!important;max-width:none!important}',
      R + ' .kt-raema .kt-texti{font:500 12.5px ' + SANS + ';color:#3a4250;overflow:hidden;text-overflow:ellipsis}',
      R + ' .kt-bil{flex:none;width:1px;height:20px;margin:0 4px;background:rgba(20,24,34,.18)}',
      R + ' .ssp-plata.kt-k{gap:5px!important;padding:0 8px!important}',
      R + ' .ssp-plata.kt-dokk{background:' + DARK_PLATE + '!important;border-color:#000!important;color:#eef1f4!important}',
      R + ' .kt-led-c{display:inline-block;width:7px;height:7px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 1.5px #7b8494}',
      R + '.kt-opid .kt-raema{border-bottom-color:rgba(20,24,34,.14)}',
      // Opið spjald
      R + ' .kt-buk{padding:12px 12px 14px!important}',
      R + ' .kt-tegund{display:grid;grid-template-columns:minmax(0,1fr);gap:6px}',
      R + ' .kt-teg-lina{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
      R + ' .kt-teg-lina .kt-teg-heiti{font:700 14px ' + SANS + ';color:#141822}',
      R + ' .kt-teg-lina .ssp-btn{margin-left:auto}',
      R + ' .kt-rok{font:400 12.5px/1.45 ' + SANS + ';color:#3a4250}',
      R + ' .kt-ritill{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px;padding:10px;background:#f4f6f9;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12)}',
      R + ' .kt-ritill label{flex:1 1 280px;display:flex;flex-direction:column;gap:4px;min-width:0;margin:0}',
      R + ' .kt-stada{min-height:16px;font:600 12px ' + MONO + ';color:#1e6b3a}',
      R + ' .kt-stada.villa{color:#b42318}',
      R + ' .kt-stada.bid{color:#845400}',
      R + ' .kt-kerfi{display:flex;flex-direction:column;gap:8px}',
      R + ' .kt-rod{background:#fff;border-radius:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);padding:10px 12px 12px;min-width:0}',
      R + ' .kt-rod-haus{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px}',
      R + ' .kt-nafn{font:700 14px ' + SANS + ';color:#141822;margin-right:4px}',
      R + ' .kt-uppruni{margin-left:auto;font:500 11px ' + MONO + ';color:#6b7483;white-space:nowrap}',
      R + ' .kt-krafa{margin:6px 0 0;font:400 12.5px/1.45 ' + SANS + ';color:#3a4250;overflow-wrap:anywhere}',
      R + ' .kt-krafa a{color:#141822;text-decoration:underline;text-decoration-color:rgba(20,24,34,.35);text-underline-offset:2px}',
      R + ' .kt-krafa a:hover{color:#8f1d13}',
      R + ' .kt-reitir{display:grid;grid-template-columns:minmax(200px,1.05fr) minmax(0,1.1fr) minmax(0,.75fr) minmax(0,.75fr) minmax(0,1.35fr);gap:8px 10px;margin-top:10px;align-items:end}',
      R + ' .kt-reitur{display:flex;flex-direction:column;gap:4px;min-width:0;margin:0}',
      R + ' .kt-reitur.heil{grid-column:1 / -1}',
      R + ' input.ssp-reitur{margin:0!important;width:100%!important;max-width:100%!important}',
      R + ' input.ssp-reitur.ogilt{box-shadow:inset 0 2px 5px rgba(0,0,0,.18),0 0 0 2px #b42318!important}',
      R + ' select.ssp-reitur{margin:0!important;width:100%!important;max-width:100%!important;padding-right:28px!important}',
      R + ' .kt-hnappar{display:flex;gap:4px}',
      R + ' button.kt-tilst{flex:1 1 0;min-width:0!important;padding:0 8px!important;height:40px!important}',
      R + ' button.kt-tilst[aria-pressed="true"]{background:' + DARK_PLATE + '!important;border-color:#000!important;color:#eef1f4!important}',
      R + ' .kt-rod-fot{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:6px;min-height:18px}',
      R + ' .kt-sma{margin-top:10px;padding-top:10px;border-top:1px dashed rgba(20,24,34,.18)}',
      R + ' details.kt-sma-d{margin-top:10px}',
      R + ' details.kt-sma-d > summary{cursor:pointer;list-style:none;font:600 11px ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#525b6b;padding:6px 0;border-top:1px dashed rgba(20,24,34,.18)}',
      R + ' details.kt-sma-d > summary::-webkit-details-marker{display:none}',
      R + ' details.kt-sma-d > summary::before{content:"▸";display:inline-block;width:14px;transition:transform .12s}',
      R + ' details.kt-sma-d[open] > summary::before{transform:rotate(90deg)}',
      R + ' details.kt-sma-d .kt-sma-hint{font-weight:500;letter-spacing:.02em;text-transform:none;color:#7a8390}',
      R + ' details.kt-sma-d[open] .kt-sma-hint{display:none}',
      R + ' details.kt-sma-d .kt-sma{border-top:0;margin-top:0;padding-top:4px}',
      R + ' .kt-sma .ssp-reitir{grid-template-columns:repeat(3,minmax(0,1fr))}',
      R + ' .kt-sma .ssp-lina{grid-template-columns:118px minmax(0,1fr)}',
      R + ' .kt-vantar{color:#b42318!important;font-style:italic}',
      R + ' .kt-sma-texti{margin-top:8px;font:400 12.5px/1.45 ' + SANS + ';color:#3a4250}',
      R + ' .kt-fleiri{display:flex;justify-content:center;margin-top:10px}',
      R + ' .kt-tomt{font:500 13px ' + SANS + ';color:#3a4250}',
      R + ' button.ssp-btn.kt-lit{height:30px!important;padding:0 10px!important;font-size:12px!important}',
      // SKRÁ Í ÞJÓNUSTU (28.11.2026, Agnar: „mig vantar að geta skráð í þjónustu inn á company profile brunakerfis og síðan
      // rest undir aðrar þjónustur"). Skiptingin er CSS á #companies-main[data-p2tab] (500) — enginn hnútur fluttur eða fjarlægður
      // (500 les ræmuna ÓSÍAÐA til að telja „Aðrar þjónustur"), svo ekkert hverfur og gamli prófíllinn (án data-p2tab) er óbreyttur.
      //   Brunakerfisþjónusta → aðeins Brunaviðvörunarkerfi · Aðrar þjónustur → allt nema það (Slökkvitæki neðst, enginn reitur týnist).
      R + ' .kt-skra{flex:none;display:flex;align-items:center;gap:6px}',
      R + ' .kt-skra[hidden]{display:none!important}',
      R + ' .kt-skra .kt-skra-pill{white-space:nowrap}',
      R + ' .kt-okkar{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:8px}',
      R + ' .kt-okkar:empty{display:none}',
      '#companies-main[data-p2tab="bk"] ' + R + ' .kt-raema .kt-k:not([data-kerfi="brunavidvorunarkerfi"]){display:none!important}',
      '#companies-main[data-p2tab="bk"] ' + R + ' .kt-rod:not([data-kerfi="brunavidvorunarkerfi"]){display:none!important}',
      '#companies-main[data-p2tab="bk"] ' + R + ' .kt-fleiri{display:none!important}',
      '#companies-main[data-p2tab="adrar"] ' + R + ' .kt-raema .kt-k[data-kerfi="brunavidvorunarkerfi"]{display:none!important}',
      '#companies-main[data-p2tab="adrar"] ' + R + ' .kt-rod[data-kerfi="brunavidvorunarkerfi"]{display:none!important}',
      '#companies-main[data-p2tab="adrar"] ' + R + ' .kt-rod[data-kerfi="slokkvitaeki"]{order:99}',
      '@container (max-width: 560px){' +
        R + ' .kt-haus{flex-wrap:wrap!important;height:auto!important;padding-top:8px!important;padding-bottom:8px!important;overflow:visible!important}' +
        R + ' .kt-skra{order:5;flex:1 1 100%}' +
        R + ' .kt-skra button.ssp-btn{height:44px!important}' +
      '}',
      // Þröngt (sími 375 og S26 980 px með hliðarstiku): reitir í dálk, samtala falin í haus — ekkert lárétt skrun
      '@container (max-width: 1100px){' + R + ' .kt-reitir{grid-template-columns:minmax(200px,1fr) minmax(0,1fr) minmax(0,1fr)}' + R + ' .kt-reitir .kt-ath{grid-column:span 2}' + '}',
      '@container (max-width: 760px){' +
        R + ' .kt-reitir{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}' +
        R + ' .kt-reitir .kt-reitur:first-child,' + R + ' .kt-reitir .kt-ath{grid-column:1 / -1}' +
        R + ' .kt-sma .ssp-reitir{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}' +
        R + ' .kt-uppruni{margin-left:0;flex-basis:100%}' +
      '}',
      '@container (max-width: 560px){' +
        R + ' .kt-samtals{display:none}' +
        R + ' .kt-reitir{grid-template-columns:minmax(0,1fr)}' +
        R + ' .kt-sma .ssp-reitir{grid-template-columns:minmax(0,1fr)}' +
        R + ' .kt-sma .ssp-lina{grid-template-columns:104px minmax(0,1fr)}' +
        R + ' button.kt-tilst{height:44px!important}' +
        R + ' input.ssp-reitur{height:44px!important;font-size:16px!important}' +
        R + ' select.ssp-reitur{height:44px!important;font-size:16px!important}' +
      '}',
    ].join('\n');
  }
  function injectCss() {
    if (document.getElementById('_kt450-css')) return;
    const st = document.createElement('style'); st.id = '_kt450-css'; st.textContent = css();
    (document.head || document.documentElement).appendChild(st);
  }

  /* ── GÖGN ───────────────────────────────────────────────────────────────────────────────────────────────── */
  const fingur = (g) => { try { return JSON.stringify([g.flokkun, g.kerfi]); } catch (_) { return String(Date.now()); } };
  function saekja(fid) {
    if (_saekir.has(fid)) return _saekir.get(fid);
    const p = F().stadur(fid).then((g) => {
      const fyrir = _minni.get(fid);
      const fi = fingur(g);
      _minni.set(fid, { gogn: g, t: Date.now(), fingur: fi, villa: null });
      if (_minni.size > 30) _minni.delete(_minni.keys().next().value);
      return { breytt: !fyrir || fyrir.fingur !== fi || !!fyrir.villa };
    }, (e) => {
      const fyrir = _minni.get(fid);
      _minni.set(fid, { gogn: fyrir ? fyrir.gogn : null, t: Date.now(), fingur: fyrir ? fyrir.fingur : '', villa: F().villuTexti(e) });
      try { if (typeof window.logProblem === 'function') window.logProblem('flokkun_prof', F().villuTexti(e)); } catch (_) {}
      return { breytt: true };
    });
    _saekir.set(fid, p);
    p.then(() => _saekir.delete(fid), () => _saekir.delete(fid));
    return p;
  }

  // Kerfin sem spjaldið sýnir: allar raðir staðarins + kerfi sem krafan segir skylt/skilyrt (án raðar = óvitað).
  function kerfiStadar(g) {
    const Fk = F();
    const t = g.flokkun && g.krofur.tegundir.get(g.flokkun.tegund);
    const eftir = new Map(g.kerfi.map((r) => [r.kerfi, r]));
    return Fk.KERFI.map((k) => {
      const r = eftir.get(k.k) || null;
      const kr = t ? t.kerfi.get(k.k) : null;
      const skylt = r ? r.skylt : (kr ? kr.skylt : null);
      const til = r ? r.til_stadar : 'ovitad';
      // Tækifæri: úr sýninni ef röð er til; annars sama regla og sýnin (óvitað + skylt/skilyrt → c)
      const taek = r ? r.taekifaeri : ((skylt === 'ja' || skylt === 'skilyrt') ? 'c' : null);
      const synt = !!r || skylt === 'ja' || skylt === 'skilyrt';
      return { k, r, kr, skylt, til, taek, synt };
    });
  }

  /* ── TEIKNING ───────────────────────────────────────────────────────────────────────────────────────────── */
  const ledHtml = (t) => (t === 'c' || !t) ? '<i class="kt-led-c"></i>' : '<i class="ssp-led ' + F().TAEKIFAERI[t].led + '"></i>';
  function taekPlata(t) { if (!t) return ''; const x = F().TAEKIFAERI[t]; return '<span class="ssp-plata kt-taek" title="Tækifæri (' + t + ')">' + ledHtml(t) + esc(x.heiti) + '</span>'; }
  function samtala(listi) {
    const n = { a: 0, b: 0, c: 0, d: 0 };
    listi.forEach((x) => { if (x.synt && x.taek && iFlipa(x.k.k)) n[x.taek]++; });
    return ['a', 'b', 'c', 'd'].filter((t) => n[t]).map((t) => '<span class="ssp-plata" title="' + esc(F().TAEKIFAERI[t].heiti) + '">' + ledHtml(t) + n[t] + ' ' + esc(F().TAEKIFAERI[t].stutt.toLowerCase()) + '</span>').join('');
  }
  function raemaHtml(g, listi) {
    const Fk = F(), f = g.flokkun;
    const plotur = [];
    if (f) {   // óflokkaður staður: engar flokkunarplötur, aðeins kerfaplöturnar (sem eru líka tómar þar)
      if (f.notkunarflokkur) plotur.push('<span class="ssp-plata" title="Notkunarflokkur">Fl. ' + esc(f.notkunarflokkur) + '</span>');
      plotur.push('<span class="ssp-plata' + (f.vissa === 'handval' ? ' kt-dokk' : '') + '" title="Vissa flokkunar">' + esc(f.vissa === 'handval' ? 'Handval' : 'Vissa ' + (Fk.VISSA[f.vissa] || f.vissa || '—').toLowerCase()) + '</span>');
      plotur.push('<span class="kt-bil"></span>');
    }
    listi.filter((x) => x.synt && x.taek).forEach((x) => {
      plotur.push('<span class="ssp-plata kt-k" data-kerfi="' + x.k.k + '" title="' + esc(x.k.heiti + ' · ' + (Fk.SKYLT[x.skylt] || 'krafa óþekkt') + ' · ' + Fk.TAEKIFAERI[x.taek].heiti) + '">' + ledHtml(x.taek) + esc(x.k.stutt) + '</span>');
    });
    return plotur.join('');
  }
  // TEIKNING (09.10.2026, Agnar: „setja líka skynjaratölurnar samanburðinn"): smaatridi.teikning = skynjarar taldir á
  // teikningum úr skjalasafni (teikning-greining/brunavidvorun). Sýnir hannað, ekki uppsett — borið við okkar skrá.
  function teikningHtml(t) {
    if (!t || typeof t !== 'object') return '';
    const n = (x) => (x == null || x === '' ? null : Number(x).toLocaleString('de-DE'));
    const a = [];
    if (t.ekki_teiknadir) a.push('Engir skynjarar teiknaðir (aðeins í skýringum)');
    else if (t.reykskynjarar != null) a.push(n(t.reykskynjarar) + ' reykskynjarar' + (t.hluti ? ' (aðeins hluti hússins)' : ''));
    if (t.hitaskynjarar) a.push(n(t.hitaskynjarar) + ' hitaskynjarar');
    if (t.handbodar) a.push(n(t.handbodar) + ' handboðar');
    if (t.bjollur) a.push(n(t.bjollur) + ' bjöllur/sírenur');
    const lina = (m, g) => g ? '<div class="ssp-lina heil"><span class="ssp-merki">' + esc(m) + '</span><span class="ssp-gildi">' + esc(g) + '</span></div>' : '';
    return '<div class="kt-sma"><div class="ssp-skilti">Á teikningu · skjalasafn' + (t.talid ? ' · talið ' + esc(F().birtaDags(t.talid) || t.talid) : '') + '</div>' +
      '<div class="ssp-reitir">' + lina('Teikning', a.join(' · ') || null) + lina('Okkar skrá', t.skra_vid_talningu ? String(t.skra_vid_talningu).replace(/\s*\n\s*/g, ' ') : null) +
      lina('Mismunur', t.mismunur ? t.mismunur + (t.vissa ? ' · vissa ' + t.vissa : '') : null) + lina('Blöð', t.blod || null) + '</div>' +
      (t.athugasemd ? '<div class="kt-sma-texti">' + esc(t.athugasemd) + '</div>' : '') +
      '<div class="kt-sma-texti"><i>Teikning sýnir hvað var hannað, ekki hvað er uppsett — stærðargráða, staðfestist við skoðun.</i></div></div>';
  }
  function smaHtml(s) {
    if (!s || typeof s !== 'object') return '';
    // aðeins teikningatalning (engin brunakerfisskrá, t.d. Midtown 1486): sýna hana eina, ekki tóma skrá
    const skraLyklar = Object.keys(s).filter((k) => k !== 'teikning');
    if (!skraLyklar.length) return teikningHtml(s.teikning);
    const v = (x) => (x == null || x === '' ? null : x);
    const tala = (x) => (x == null ? null : Number(x).toLocaleString('de-DE'));
    const manud = (x) => (x == null ? null : (MANUDIR[+x - 1] || String(x)));
    const arman = (x) => { const m = /^(\d{4})-(\d{2})$/.exec(String(x || '')); return m ? m[2] + '/' + m[1] : (x ? F().birtaDags(x) || String(x) : null); };
    const verd = s.verd && typeof s.verd === 'object' ? s.verd : {};
    // askrift_tekjur_YYYY = revenue_YYYY í brunakerfi_customers: ALLAR tekjur af félaginu það ár (líka uppsetning og
    // viðbætur), ekki áskriftarverð — Miðgarður 2026: 3.549.926 kr. 0 kr = engin skráning, sleppt.
    const VERD = [['skodun_an_vsk_sidasta_skyrsla', 'Skoðun án vsk (síðasta skýrsla)'], ['askrift_tekjur_2026', 'Tekjur 2026'], ['askrift_tekjur_2025', 'Tekjur 2025'], ['reikningar_2026', 'Reikningar 2026'], ['reikningar_2025', 'Reikningar 2025'], ['sala_2026', 'Sala 2026']];
    const verdTexti = VERD.filter(([k]) => verd[k] != null && Number(verd[k]) !== 0).map(([k, h]) => h + ': ' + F().fmtKr(verd[k])).join(' · ');
    const REITIR = [
      ['Stjórnstöð', v(s.stjornstodvar) == null ? null : tala(s.stjornstodvar) + ' stk'],
      ['Framleiðandi', v(s.framleidandi)],
      ['Gerð', v(s.gerd)],
      ['Rásir / slaufur', v(s.rasir_slaufur)],
      ['Reykskynjarar', tala(s.reykskynjarar)],
      ['Hitaskynjarar', tala(s.hitaskynjarar)],
      ['Skynjarar alls', s.skynjarar_alls == null ? null : tala(s.skynjarar_alls) + (s.skynjarar_heimild ? ' (' + s.skynjarar_heimild + ')' : '')],
      ['Handboðar', tala(s.handbodar)],
      ['Bjöllur', tala(s.bjollur)],
      ['Vaktstöð', v(s.vaktstod)],
      ['Síðasta skoðun', s.sidasta_skodun ? F().birtaDags(s.sidasta_skodun) : null],
      ['Skoðunarmánuður', manud(s.skodunarmanudur)],
      ['Næsta skoðun', arman(s.naesta_skodun) ? arman(s.naesta_skodun) + (s.skodun_fram_yfir ? ' — komin fram yfir' : '') : null],
      ['Áskrift', s.askrift == null ? null : (s.askrift ? 'Já' : 'Nei')],
      ['Verð / tekjur', verdTexti || null],
    ];
    const NOFN = { framleidandi: 'framleiðandi', skynjarafjoldi: 'fjöldi skynjara', handbodar: 'handboðar', vaktstod: 'vaktstöð', skodunarmanudur: 'skoðunarmánuður', sidasta_skodun: 'síðasta skoðun', verd: 'verð' };
    const vantar = Array.isArray(s.vantar_reiti) ? s.vantar_reiti.map((x) => NOFN[x] || x) : [];
    const ath = Array.isArray(s.athugasemdir) ? s.athugasemdir.filter(Boolean) : [];
    const bl = s.byggingarlysing && typeof s.byggingarlysing === 'object' ? s.byggingarlysing : null;
    return '<div class="kt-sma"><div class="ssp-skilti">Brunakerfisskrá' + (s.heimild && !/^brunakerfissk/i.test(s.heimild) ? ' · ' + esc(s.heimild) : '') + '</div>' +
      '<div class="ssp-reitir">' + REITIR.map(([m, g]) => '<div class="ssp-lina' + (m === 'Verð / tekjur' ? ' heil' : '') + '"><span class="ssp-merki">' + esc(m) + '</span><span class="ssp-gildi' + (g == null ? ' kt-vantar' : '') + '">' + esc(g == null ? 'vantar' : g) + '</span></div>').join('') + '</div>' +
      (vantar.length ? '<div class="kt-sma-texti"><b>Vantar í skrá:</b> ' + esc(vantar.join(', ')) + (s.naegilega_skrad ? '' : ' — ekki nægilega skráð') + '</div>' : '') +
      (ath.length ? '<div class="kt-sma-texti"><b>Athugasemdir:</b> ' + esc(ath.join(' · ')) + '</div>' : '') +
      (bl ? '<div class="kt-sma-texti"><b>Byggingarlýsing</b>' + (bl.skjal ? ' (' + esc(bl.skjal) + ')' : '') + ': ' + esc(bl.segir || '') + (Array.isArray(bl.misraemi) && bl.misraemi.length ? '<br><b>Misræmi:</b> ' + esc(bl.misraemi.join(' · ')) : '') + '</div>' : '') +
    '</div>' + teikningHtml(s.teikning);
  }
  function rodStadaHtml(fid, k) {
    const s = _rodStada.get(fid + '|' + k) || {};
    return '<span class="kt-stada' + (s.villa ? ' villa' : s.bid ? ' bid' : '') + '" data-kt-stada aria-live="polite">' + esc(s.texti || '') + '</span>' +
      (s.reyna ? '<button type="button" class="ssp-btn kt-lit" data-kt="reyna" data-kerfi="' + esc(k) + '">Reyna aftur</button>' : '');
  }
  function upprunaTexti(x) {
    if (!x.r) return 'ekkert skráð';
    const d = x.r.uppfaert ? F().birtaDags(String(x.r.uppfaert).slice(0, 10)) : '';
    return (x.r.uppruni === 'handvirkt' ? 'handskráð' : 'sjálfvirkt') + (d ? ' · ' + d : '') + (x.r.heimild ? ' · ' + x.r.heimild : '');
  }
  // „Skrá í þjónustu hjá okkur" á hverja röð Aðrar þjónustur: til_stadar=já + þjónustuaðili=okkar (sömu reitir og handvirka færslan, ein smellileið).
  // „Taka úr" fjarlægir aðeins þjónustuaðilann — „til staðar" stendur, því kerfið er enn í húsinu.
  const erOkkarRod = (x) => !!(x.r && x.r.til_stadar === 'ja' && F().erOkkar(x.r.thjonustuadili));
  function okkarHtml(x) {
    return erOkkarRod(x)
      ? '<span class="ssp-plata kt-dokk" title="Þjónustuaðili: okkar">✓ Í þjónustu hjá okkur</span><button type="button" class="ssp-btn kt-lit" data-kt="ekki-okkar">Taka úr þjónustu</button>'
      : '<button type="button" class="ssp-btn malm kt-lit" data-kt="okkar">+ Skrá í þjónustu hjá okkur</button>';
  }
  function rodHtml(fid, x) {
    const Fk = F(), r = x.r || {}, kr = x.kr || {};
    const skilyrdi = r.skilyrdi || kr.skilyrdi || '';
    const heimild = r.krafa_heimild || kr.heimild || '';
    const url = r.krafa_url || kr.url || '';
    const til = x.til;
    const visb = r.visbending === '0_i_arlegri_skodun' ? ' · 0 skráð í árlegri skoðun' : '';
    const verd = r.verd_ar != null ? Number(r.verd_ar).toLocaleString('de-DE') : '';
    return '<div class="kt-rod t-' + (x.taek || 'x') + '" data-kerfi="' + x.k.k + '">' +
      '<div class="kt-rod-haus"><span class="kt-nafn">' + esc(x.k.heiti) + '</span>' +
        '<span class="ssp-plata' + (x.skylt === 'ja' ? ' kt-dokk' : '') + '" data-kt-krafa>' + esc(Fk.SKYLT[x.skylt] || 'Krafa óþekkt') + '</span>' +
        '<span data-kt-taek>' + taekPlata(x.taek) + '</span>' +
        '<span class="kt-uppruni" data-kt-uppruni>' + esc(upprunaTexti(x)) + esc(visb) + '</span></div>' +
      (skilyrdi || heimild ? '<div class="kt-krafa">' + esc(skilyrdi) + (kr.magn ? ' <b>Magn:</b> ' + esc(kr.magn) : '') + (heimild && heimild !== '—' ? ' · ' + (url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(heimild) + '</a>' : esc(heimild)) : '') + '</div>' : '') +
      '<div class="kt-reitir">' +
        '<div class="kt-reitur"><span class="ssp-merki">Til staðar</span><div class="kt-hnappar" role="group" aria-label="' + esc(x.k.heiti) + ' til staðar">' +
          ['ja', 'nei', 'ovitad'].map((v) => '<button type="button" class="ssp-btn kt-tilst" data-kt="til" data-v="' + v + '" aria-pressed="' + (til === v) + '">' + esc(Fk.TIL_STADAR[v]) + '</button>').join('') +
        '</div></div>' +
        '<label class="kt-reitur"><span class="ssp-merki">Þjónustuaðili</span><input type="text" class="ssp-reitur" data-kt-reitur="thjonustuadili" value="' + esc(r.thjonustuadili || '') + '" placeholder="okkar, Securitas …" autocomplete="off"></label>' +
        '<label class="kt-reitur"><span class="ssp-merki">Verð kr/ár</span><input type="text" inputmode="numeric" class="ssp-reitur" data-kt-reitur="verd_ar" value="' + esc(verd) + '" placeholder="sirka" autocomplete="off"></label>' +
        '<label class="kt-reitur"><span class="ssp-merki">Samningur til</span><input type="text" inputmode="numeric" class="ssp-reitur" data-kt-reitur="samningur_til" value="' + esc(Fk.birtaDags(r.samningur_til)) + '" placeholder="DD/MM/YYYY" autocomplete="off"></label>' +
        '<label class="kt-reitur kt-ath"><span class="ssp-merki">Athugasemd</span><input type="text" class="ssp-reitur" data-kt-reitur="athugasemd" value="' + esc(r.athugasemd || '') + '" autocomplete="off"></label>' +
      '</div>' +
      (x.k.k === BVK ? '' : '<div class="kt-okkar" data-kt-okkar>' + okkarHtml(x) + '</div>') +
      '<div class="kt-rod-fot" data-kt-fot>' + rodStadaHtml(fid, x.k.k) + '</div>' +
      // 28.11.2026 (Agnar: „collapse þessar auka upplýsingar, þau eru í þjónustu og búið að skoða"): brunakerfisskráin og
      // teikningatalningin eru samanbrotnar þegar kerfið er í þjónustu hjá okkur — gögnin standa, smellur opnar.
      (x.k.k === 'brunavidvorunarkerfi' && r.smaatridi
        ? (F().erOkkar(r.thjonustuadili) && r.til_stadar === 'ja'
          ? '<details class="kt-sma-d"><summary>Brunakerfisskrá og teikning <span class="kt-sma-hint">· samanbrotið — í þjónustu hjá okkur</span></summary>' + smaHtml(r.smaatridi) + '</details>'
          : smaHtml(r.smaatridi))
        : '') +
    '</div>';
  }
  function ritillHtml(fid, g) {
    const f = g.flokkun, r = (_ritill && _ritill.fid === fid) ? _ritill : {};
    const opt = g.krofur.listi.map((t) => '<option value="' + esc(t.tegund) + '"' + (t.tegund === f.tegund ? ' selected' : '') + '>' + esc(t.heiti + (t.notkunarflokkur ? ' · fl. ' + t.notkunarflokkur : '')) + '</option>').join('');
    const sjalf = g.krofur.tegundir.get(f.tegund_sjalfvirk);
    return '<div class="kt-ritill" data-kt-ritill>' +
      '<label><span class="ssp-merki">Rétt tegund</span><select class="ssp-reitur" data-kt-teg-val>' + opt + '</select></label>' +
      '<button type="button" class="ssp-btn malm" data-kt="vista-teg"' + (r.vistar ? ' disabled' : '') + '>Vista</button>' +
      (f.tegund_handval ? '<button type="button" class="ssp-btn" data-kt="fella-teg"' + (r.vistar ? ' disabled' : '') + '>Fella niður handval</button>' : '') +
      '<button type="button" class="ssp-btn" data-kt="loka-teg">' + (r.stada ? 'Loka' : 'Hætta við') + '</button>' +
      '<div class="kt-rok" style="flex:1 1 100%">Sjálfvirk flokkun: <b>' + esc(sjalf ? sjalf.heiti : (f.tegund_sjalfvirk || 'engin')) + '</b>. Aðeins handvalið breytist — kröfur og tækifæri fylgja tegundinni.</div>' +
      '<div class="kt-stada' + (r.villa ? ' villa' : '') + '" style="flex:1 1 100%" aria-live="polite">' + esc(r.stada || '') + '</div>' +
    '</div>';
  }
  // Óflokkaður staður: engin tegund/kröfur, en þjónustu má samt skrá. Sýnir ÖLL kerfin (ekki synt-síuð) með til-staðar
  // hnöppum og þjónustureitunum — sama rodHtml og annars, sem ræður við x.kr/x.skylt = null (plata „Krafa óþekkt").
  function bukOflokkadur(fid, listi) {
    return '<div class="kt-tomt" style="margin-bottom:10px">Staðurinn er ekki flokkaður enn, svo kröfur og tækifæri liggja ekki fyrir. Þú getur samt skráð hvaða kerfi eru til staðar og þjónustuna á þeim — flokkunin raðar þeim þegar hún nær staðnum.</div>' +
      '<div class="ssp-skilti">Kerfi · til staðar · þjónusta</div>' +
      '<div class="kt-kerfi">' + listi.map((x) => rodHtml(fid, x)).join('') + '</div>';
  }
  function bukHtml(fid, g, listi) {
    const Fk = F(), f = g.flokkun;
    // Brunaviðvörunarkerfi er alltaf með: undir Brunakerfisþjónustu er það eina röðin, og hún má ekki vanta hjá félagi sem er nýtt í þjónustu.
    const ber = (x) => x.synt || x.k.k === BVK;
    const synd = _ollKerfi.get(fid) ? listi : listi.filter(ber);
    const falin = listi.length - listi.filter(ber).length;
    const heimild = Array.isArray(f.heimild) && f.heimild.length ? ' · heimild: ' + f.heimild.join(', ') : '';
    const staerd = [f.m2 ? Number(f.m2).toLocaleString('de-DE') + ' m²' : '', f.haedir ? f.haedir + ' hæðir' : ''].filter(Boolean).join(' · ');
    return '<div class="kt-tegund">' +
        '<div class="kt-teg-lina"><span class="ssp-merki">Tegund</span><span class="kt-teg-heiti">' + esc(f.tegund_heiti || f.tegund || '—') + '</span>' +
          (f.notkunarflokkur ? '<span class="ssp-plata">Notkunarflokkur ' + esc(f.notkunarflokkur) + '</span>' : '') +
          '<span class="ssp-plata' + (f.vissa === 'handval' ? ' kt-dokk' : '') + '">' + esc(f.vissa === 'handval' ? 'Handvalið' : 'Vissa ' + (Fk.VISSA[f.vissa] || f.vissa || '—').toLowerCase()) + '</span>' +
          (staerd ? '<span class="ssp-plata">' + esc(staerd) + '</span>' : '') +
          '<button type="button" class="ssp-btn" data-kt="leidretta" aria-expanded="' + !!(_ritill && _ritill.fid === fid) + '">Leiðrétta tegund</button></div>' +
        (f.rokstudningur ? '<div class="kt-rok">' + esc(f.rokstudningur) + esc(heimild) + '</div>' : '') +
        (_ritill && _ritill.fid === fid ? ritillHtml(fid, g) : '') +
      '</div>' +
      '<div class="ssp-skilti">Kerfi · krafa · til staðar · þjónusta</div>' +
      '<div class="kt-kerfi">' + synd.map((x) => rodHtml(fid, x)).join('') + '</div>' +
      (falin ? '<div class="kt-fleiri"><button type="button" class="ssp-btn" data-kt="oll">' + (_ollKerfi.get(fid) ? 'Fela kerfi án kröfu' : 'Sýna öll kerfi (' + falin + ' án kröfu)') + '</button></div>' : '');
  }

  // Samtala tækifæra í hausnum: hnúturinn verður til þegar gögn koma (nýr hnútur, ekki tilfærsla) á milli undirtitils
  // og Opna — Opna stendur kyrr við hægri brún og undirtitillinn mjókkar. Hnútur sem væri til tómur í beinagrindinni
  // og fylltist færi til vinstri = layout-shift (mælt: span.ssp-hlid 0,0007).
  function setjaSamtals(kort, html) {
    let sam = kort.querySelector('[data-kt-samtals]');
    if (!html) { if (sam) sam.remove(); return; }
    if (!sam) {
      sam = document.createElement('span'); sam.className = 'kt-samtals'; sam.setAttribute('data-kt-samtals', '');
      const opna = kort.querySelector('.kt-haus [data-kt="opna"]');
      opna.parentNode.insertBefore(sam, opna);
    }
    if (sam._kt !== html) { sam._kt = html; sam.innerHTML = html; }
  }
  /* ── SKRÁ Í BRUNAKERFISÞJÓNUSTU (haus, aðeins í flipanum Brunakerfisþjónusta) ────────────────────────────────── */
  // Áskrift = færsla í AppSettings.brunakerfi_customers[fid] (147, sama snið og „+ Bæta við fyrirtæki" býr til: { unit_count: 0,
  // inspect_month: 0, co_id }). Aðeins ÞETTA félag fer í vistun (aldrei allur blobbinn) og lesið er til baka.
  // „Taka úr" er aðeins í boði á ósnertri nýskráningu (engar einingar, mánuður eða athugasemdir) — færsla með gögnum er fjarlægð
  // á Brunakerfi-yfirlitinu (147), svo ekkert tapast hér við misstig.
  const _skra = new Map();       // fid → true meðan vistun stendur
  const erOsnert = (f) => !!f && typeof f === 'object' && Object.keys(f).every((k) => ['co_id', 'unit_count', 'inspect_month'].indexOf(k) >= 0) && !(+f.unit_count > 0) && !(+f.inspect_month > 0);
  function skraHtml(fid) {
    if (_skra.get(fid)) return '<button type="button" class="ssp-btn malm kt-skra-btn" disabled>Vistar…</button>';
    if (erBkAskrift(fid)) {
      return '<span class="ssp-plata kt-dokk kt-skra-pill" title="Félagið er á áskriftarlista brunakerfa (Brunakerfi → yfirlit)">✓ Í brunakerfisþjónustu</span>' +
        (erOsnert(bkListi()[String(fid)]) ? '<button type="button" class="ssp-btn kt-lit" data-kt="bk-af" title="Afturkalla nýskráninguna — ekkert var skráð á hana enn">Taka úr</button>' : '');
    }
    return '<button type="button" class="ssp-btn malm kt-skra-btn" data-kt="bk-skra" title="Setur félagið á áskriftarlista brunakerfa">+ Skrá í brunakerfisþjónustu</button>';
  }
  function setjaSkra(kort, fid) {
    const el = kort.querySelector('[data-kt-skra]'); if (!el) return;
    const sja = flipi() === 'bk';
    if (el.hidden !== !sja) el.hidden = !sja;
    if (!sja) return;
    const h = skraHtml(fid);
    if (el._kt !== h) { el._kt = h; el.innerHTML = h; }
  }
  function uppfaeraSkra(fid) { const k = document.getElementById(ID); if (k && +k.dataset.fid === fid) setjaSkra(k, fid); }
  async function vistaBvk(fid, breyting) {
    const k = document.getElementById(ID); const m = _minni.get(fid);
    if (!k || +k.dataset.fid !== fid || !m || !m.gogn) return null;   // röðin er ekki á skjánum — ekkert að uppfæra hér
    F().bidVistun(fid, BVK, breyting);
    return vista(k, fid, BVK, breyting);
  }
  async function skraBrunakerfi(fid) {
    const AS = window.AppSettings;
    if (!AS || !AS.save || !AS.path) { toast('⚠ Vistun er ekki tilbúin — endurhlaðið síðuna'); return; }
    if (_skra.get(fid) || erBkAskrift(fid)) return;
    const arsk = (AS.path('arsskodun_customers') || {})[String(fid)] || {};
    // 153: virk brunakerfisáskrift trompar afskráningu úr slökkvitækjaþjónustu — félagið kemur aftur á Ársskoðunarlistann.
    if (arsk.removed_from_service_at && !window.confirm('Félagið var tekið úr slökkvitækjaþjónustu. Brunakerfisáskrift setur það aftur á Ársskoðunarlistann.\n\nSkrá í brunakerfisþjónustu samt?')) return;
    _skra.set(fid, true); uppfaeraSkra(fid);
    let ok = false;
    try {
      const svar = await AS.save({ brunakerfi_customers: { [String(fid)]: { unit_count: 0, inspect_month: 0, co_id: fid } } });
      ok = svar !== false && erBkAskrift(fid);
    } catch (e) { ok = false; try { if (typeof window.logProblem === 'function') window.logProblem('bk_skra_450', String(e && e.message || e).slice(0, 160)); } catch (_) {} }
    _skra.delete(fid); uppfaeraSkra(fid);
    if (!ok) { toast('⚠ Vistaðist ekki — félagið er EKKI skráð í brunakerfisþjónustu. Reyndu aftur.'); return; }
    const kerfiOk = await vistaBvk(fid, { til_stadar: 'ja', thjonustuadili: 'okkar' });
    toast(kerfiOk === false ? '✓ Skráð í brunakerfisþjónustu — en „Brunaviðvörunarkerfi" vistaðist ekki, sjá röðina' : '✓ Skráð í brunakerfisþjónustu');
  }
  async function afskraBrunakerfi(fid) {
    const AS = window.AppSettings;
    if (!AS || !AS.save || !AS.path || _skra.get(fid)) return;
    if (!erOsnert(bkListi()[String(fid)])) { toast('Færslan hefur gögn — fjarlægðu hana á Brunakerfi-yfirlitinu'); return; }
    _skra.set(fid, true); uppfaeraSkra(fid);
    let ok = false;
    try { const svar = await AS.save({ brunakerfi_customers: { [String(fid)]: null } }); ok = svar !== false && !erBkAskrift(fid); } catch (e) { ok = false; }
    _skra.delete(fid); uppfaeraSkra(fid);
    if (!ok) { toast('⚠ Vistaðist ekki — félagið er enn á áskriftarlistanum'); return; }
    const m = _minni.get(fid); const r = m && m.gogn && m.gogn.kerfi.find((y) => y.kerfi === BVK);
    if (r && F().erOkkar(r.thjonustuadili)) await vistaBvk(fid, { thjonustuadili: null });
    toast('Tekið af áskriftarlista brunakerfa');
  }

  // Fyllir spjaldið. Hnúturinn sjálfur er aldrei skipt út — aðeins innihald hans (Stodugt.vernda heldur skruni/fókus).
  function fylla(kort, fid) {
    const m = _minni.get(fid);
    const g = m && m.gogn;
    const undir = kort.querySelector('[data-kt-undir]');
    const raema = kort.querySelector('[data-kt-raema]');
    const buk = kort.querySelector('[data-kt-buk]');
    const opna = kort.querySelector('[data-kt="opna"]');
    const opid = erOpid(fid);
    const setja = (el, html) => { if (el && el._kt !== html) { el._kt = html; el.innerHTML = html; } };
    setjaSkra(kort, fid);   // óháð flokkun og hleðslu: brunakerfisáskrift er skráð á félagið, ekki á staðinn
    if (!g) {
      setja(undir, m && m.villa ? 'Náðist ekki' : 'Hleður…');
      setja(raema, '<span class="kt-texti">' + esc(m && m.villa ? 'Kerfin náðust ekki: ' + m.villa : 'Sæki kerfi og kröfur staðarins…') + '</span>');
      setjaSamtals(kort, '');
      if (opna) { opna.disabled = true; opna.hidden = false; }
      buk.hidden = true;
      return;
    }
    if (!g.flokkun) {
      // Óflokkaður: áður dauð leið (Opna falin, ekkert hægt að skrá). Nú má opna og skrá þjónustu samt — „+ Bæta við
      // þjónustu" á prófílnum (500) smellir á þessa Opna, svo hún verður að vera sýnileg og virk.
      const listi = kerfiStadar(g);
      setja(undir, 'Ekki flokkaður');
      setja(raema, '<span class="kt-texti">Staðurinn er ekki í flokkunartöflunni — sjálfvirka flokkunin hefur ekki náð honum enn. Opnaðu til að skrá þjónustu samt.</span>');
      setjaSamtals(kort, '');
      if (opna) {
        opna.hidden = false; opna.disabled = false;
        const t = opid ? 'Loka' : 'Opna';
        if (opna.textContent !== t) opna.textContent = t;
        if (opna.getAttribute('aria-expanded') !== String(opid)) opna.setAttribute('aria-expanded', String(opid));
      }
      if (kort.classList.contains('kt-opid') !== opid) kort.classList.toggle('kt-opid', opid);
      if (buk.hidden !== !opid) buk.hidden = !opid;
      if (opid) {
        const html = bukOflokkadur(fid, listi);
        if (buk._kt !== html) {
          const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(buk) : null;
          buk._kt = html; buk.innerHTML = html;
          if (aftur) aftur();
        }
      }
      return;
    }
    const listi = kerfiStadar(g);
    setja(undir, g.flokkun.tegund_heiti || g.flokkun.tegund || '—');
    setja(raema, raemaHtml(g, listi));
    setjaSamtals(kort, samtala(listi));
    if (opna) {
      opna.hidden = false; opna.disabled = false;
      const t = opid ? 'Loka' : 'Opna';
      if (opna.textContent !== t) opna.textContent = t;
      if (opna.getAttribute('aria-expanded') !== String(opid)) opna.setAttribute('aria-expanded', String(opid));
    }
    if (kort.classList.contains('kt-opid') !== opid) kort.classList.toggle('kt-opid', opid);
    if (buk.hidden !== !opid) buk.hidden = !opid;
    if (opid) {
      const html = bukHtml(fid, g, listi);
      if (buk._kt !== html) {
        const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(buk) : null;
        buk._kt = html; buk.innerHTML = html;
        if (aftur) aftur();
      }
    }
  }
  // Aðeins ein röð uppfærð eftir vistun — reitirnir (og fókusinn í þeim) standa.
  function uppfaeraRod(kort, fid, kerfi) {
    const m = _minni.get(fid); if (!m || !m.gogn) return;
    const listi = kerfiStadar(m.gogn);
    const x = listi.find((y) => y.k.k === kerfi);
    const rod = kort.querySelector('.kt-rod[data-kerfi="' + kerfi + '"]');
    if (x && rod) {
      const klasi = 'kt-rod t-' + (x.taek || 'x');
      if (rod.className !== klasi) rod.className = klasi;
      const tp = rod.querySelector('[data-kt-taek]'); const th = taekPlata(x.taek); if (tp && tp._kt !== th) { tp._kt = th; tp.innerHTML = th; }
      const up = rod.querySelector('[data-kt-uppruni]'); const ut = upprunaTexti(x); if (up && up.textContent !== ut) up.textContent = ut;
      rod.querySelectorAll('[data-kt="til"]').forEach((b) => { const a = String(b.dataset.v === x.til); if (b.getAttribute('aria-pressed') !== a) b.setAttribute('aria-pressed', a); });
      const fot = rod.querySelector('[data-kt-fot]'); const fh = rodStadaHtml(fid, kerfi); if (fot && fot._kt !== fh) { fot._kt = fh; fot.innerHTML = fh; }
      const ok = rod.querySelector('[data-kt-okkar]'); const oh = ok ? okkarHtml(x) : ''; if (ok && ok._kt !== oh) { ok._kt = oh; ok.innerHTML = oh; }
      const ti = rod.querySelector('[data-kt-reitur="thjonustuadili"]'); const tn = (x.r && x.r.thjonustuadili) || '';
      if (ti && document.activeElement !== ti && ti.value !== tn) ti.value = tn;   // „Skrá í þjónustu" breytir reitnum — hann á ekki að sýna gamla gildið
    }
    if (m.gogn.flokkun) {   // óflokkaður: raeman er skýringarnóta, ekki flokkunarsamantekt — ekki yfirskrifa hana
      const raema = kort.querySelector('[data-kt-raema]'); const rh = raemaHtml(m.gogn, listi); if (raema && raema._kt !== rh) { raema._kt = rh; raema.innerHTML = rh; }
      setjaSamtals(kort, samtala(listi));
    }
    // Hnútamynd bukHtml er orðin úrelt — næsta fulla fylling ber saman við nýtt
    const buk = kort.querySelector('[data-kt-buk]'); if (buk) buk._kt = null;
  }
  function setjaRodStodu(kort, fid, kerfi, s) {
    _rodStada.set(fid + '|' + kerfi, s);
    const rod = kort && kort.querySelector('.kt-rod[data-kerfi="' + kerfi + '"]');
    const fot = rod && rod.querySelector('[data-kt-fot]');
    const fh = rodStadaHtml(fid, kerfi);
    if (fot && fot._kt !== fh) { fot._kt = fh; fot.innerHTML = fh; }
  }

  /* ── VISTUN ─────────────────────────────────────────────────────────────────────────────────────────────── */
  function lesaReit(nafn, txt) {
    const Fk = F();
    if (nafn === 'verd_ar') return Fk.lesaKr(txt);
    if (nafn === 'samningur_til') return Fk.lesaDags(txt);
    return String(txt || '').trim() || null;
  }
  async function vista(kort, fid, kerfi, breyting) {
    setjaRodStodu(kort, fid, kerfi, { texti: 'Vistar…', bid: true });
    try {
      const rod = await F().vistaKerfi(fid, kerfi, breyting);
      // Biðvistun staðfest aðeins fyrir reiti sem eru óbreyttir síðan þeir voru sendir
      const m = _minni.get(fid);
      if (m && m.gogn) {
        const i = m.gogn.kerfi.findIndex((r) => r.kerfi === kerfi);
        if (i >= 0) m.gogn.kerfi[i] = Object.assign({}, m.gogn.kerfi[i], rod); else m.gogn.kerfi.push(rod);
        m.fingur = fingur(m.gogn); m.t = Date.now();
      }
      const lifandi = document.getElementById(ID);
      const reitir = Object.keys(breyting).filter((k) => {
        const inp = lifandi && lifandi.querySelector('.kt-rod[data-kerfi="' + kerfi + '"] [data-kt-reitur="' + k + '"]');
        return !inp || lesaReit(k, inp.value) === breyting[k];
      });
      F().stadfestVistun(fid, kerfi, reitir);
      if (lifandi && +lifandi.dataset.fid === fid) {
        setjaRodStodu(lifandi, fid, kerfi, { texti: 'Vistað ' + kl() });
        uppfaeraRod(lifandi, fid, kerfi);
      } else _rodStada.set(fid + '|' + kerfi, { texti: 'Vistað ' + kl() });
      return true;
    } catch (e) {
      const lifandi = document.getElementById(ID);
      setjaRodStodu(lifandi, fid, kerfi, { texti: 'Vistun mistókst: ' + F().villuTexti(e) + ' — breytingin er geymd', villa: true, reyna: true });
      return false;
    }
  }
  async function vistaTegund(kort, fid, tegund) {
    _ritill = { fid, stada: 'Vistar…', vistar: true };
    fylla(kort, fid);
    try {
      await F().leidrettaTegund(fid, tegund);
      _ritill = { fid, stada: (tegund ? 'Vistað ' : 'Handval fellt niður ') + kl() + ' — kröfur og tækifæri endurreiknuð' };
      await saekja(fid);
    } catch (e) {
      _ritill = { fid, stada: 'Vistun mistókst: ' + F().villuTexti(e), villa: true };
    }
    const lifandi = document.getElementById(ID);
    if (lifandi && +lifandi.dataset.fid === fid) fylla(lifandi, fid);
  }

  /* ── ATBURÐIR ───────────────────────────────────────────────────────────────────────────────────────────── */
  function tengja(kort) {
    kort.addEventListener('click', (e) => {
      const b = e.target.closest('[data-kt]');
      if (!b || !kort.contains(b) || b.tagName === 'SPAN') return;
      const fid = +kort.dataset.fid;
      const a = b.dataset.kt;
      if (a === 'opna') { _opid.set(fid, !erOpid(fid)); fylla(kort, fid); return; }
      if (a === 'bk-skra') { skraBrunakerfi(fid); return; }
      if (a === 'bk-af') { afskraBrunakerfi(fid); return; }
      if (a === 'oll') { _ollKerfi.set(fid, !_ollKerfi.get(fid)); fylla(kort, fid); return; }
      if (a === 'leidretta') { _ritill = (_ritill && _ritill.fid === fid) ? null : { fid }; fylla(kort, fid); if (_ritill) { const s = kort.querySelector('[data-kt-teg-val]'); if (s) s.focus({ preventScroll: true }); } return; }
      if (a === 'loka-teg') { _ritill = null; fylla(kort, fid); return; }
      if (a === 'vista-teg') { const s = kort.querySelector('[data-kt-teg-val]'); if (s) vistaTegund(kort, fid, s.value); return; }
      if (a === 'fella-teg') { vistaTegund(kort, fid, null); return; }
      const rod = b.closest('.kt-rod'); if (!rod) return;
      const kerfi = rod.dataset.kerfi;
      if (a === 'til') {
        const v = b.dataset.v;
        rod.querySelectorAll('[data-kt="til"]').forEach((x) => { const p = String(x === b); if (x.getAttribute('aria-pressed') !== p) x.setAttribute('aria-pressed', p); });
        F().bidVistun(fid, kerfi, { til_stadar: v });
        vista(kort, fid, kerfi, { til_stadar: v });
        return;
      }
      if (a === 'okkar' || a === 'ekki-okkar') {
        // Aðrar þjónustur: ein smellileið á sömu reiti og handvirka færslan (til staðar + þjónustuaðili). „Taka úr" lætur „til staðar" standa.
        const breyting = a === 'okkar' ? { til_stadar: 'ja', thjonustuadili: 'okkar' } : { thjonustuadili: null };
        const ti = rod.querySelector('[data-kt-reitur="thjonustuadili"]'); if (ti) ti.value = a === 'okkar' ? 'okkar' : '';
        F().bidVistun(fid, kerfi, breyting);
        vista(kort, fid, kerfi, breyting);
        return;
      }
      if (a === 'reyna') {
        // Sendir aftur allt sem stendur í reitum raðarinnar og er frábrugðið vistuðu röðinni
        const breyting = {};
        rod.querySelectorAll('[data-kt-reitur]').forEach((inp) => { const v = lesaReit(inp.dataset.ktReitur, inp.value); if (v !== undefined) breyting[inp.dataset.ktReitur] = v; });
        const p = rod.querySelector('[data-kt="til"][aria-pressed="true"]'); if (p) breyting.til_stadar = p.dataset.v;
        vista(kort, fid, kerfi, breyting);
      }
    });
    kort.addEventListener('input', (e) => {
      const inp = e.target.closest('[data-kt-reitur]'); if (!inp) return;
      const rod = inp.closest('.kt-rod'); if (!rod) return;
      const fid = +kort.dataset.fid, kerfi = rod.dataset.kerfi, nafn = inp.dataset.ktReitur;
      const v = lesaReit(nafn, inp.value);
      if (v === undefined) { F().stadfestVistun(fid, kerfi, [nafn]); return; }   // ógilt enn — ekkert í bið
      F().bidVistun(fid, kerfi, { [nafn]: v });
      if (inp.classList.contains('ogilt')) inp.classList.remove('ogilt');
      const s = _rodStada.get(fid + '|' + kerfi);
      if (!s || s.texti !== 'Óvistað — vistast þegar farið er úr reitnum') setjaRodStodu(kort, fid, kerfi, { texti: 'Óvistað — vistast þegar farið er úr reitnum', bid: true });
    });
    kort.addEventListener('change', (e) => {
      const inp = e.target.closest('[data-kt-reitur]'); if (!inp) return;
      const rod = inp.closest('.kt-rod'); if (!rod) return;
      const fid = +kort.dataset.fid, kerfi = rod.dataset.kerfi, nafn = inp.dataset.ktReitur;
      const v = lesaReit(nafn, inp.value);
      if (v === undefined) {
        inp.classList.add('ogilt');
        setjaRodStodu(kort, fid, kerfi, { texti: nafn === 'samningur_til' ? 'Ógild dagsetning — skrifaðu DD/MM/YYYY. Ekkert vistað.' : 'Ógilt verð — aðeins tölur. Ekkert vistað.', villa: true });
        return;
      }
      if (nafn === 'verd_ar' && v != null) { const t = Number(v).toLocaleString('de-DE'); if (inp.value !== t) inp.value = t; }
      if (nafn === 'samningur_til' && v) { const t = F().birtaDags(v); if (inp.value !== t) inp.value = t; }
      const m = _minni.get(fid);
      const nu = m && m.gogn && m.gogn.kerfi.find((r) => r.kerfi === kerfi);
      const fyrir = nu ? (nafn === 'verd_ar' ? (nu.verd_ar == null ? null : Math.round(Number(nu.verd_ar))) : (nu[nafn] == null ? null : nu[nafn])) : null;
      if (fyrir === v) { F().stadfestVistun(fid, kerfi, [nafn]); setjaRodStodu(kort, fid, kerfi, {}); return; }   // ekkert breyttist
      vista(kort, fid, kerfi, { [nafn]: v });
    });
  }

  /* ── FESTING Á PRÓFÍLINN ────────────────────────────────────────────────────────────────────────────────── */
  function smida(fid) {
    const kort = document.createElement('section');
    kort.id = ID;
    kort.className = 'ssp kt450';
    kort.dataset.fid = String(fid);
    kort.setAttribute('aria-labelledby', ID + '-t');
    kort.innerHTML =
      '<header class="ssp-haus kt-haus"><span class="ssp-titill" id="' + ID + '-t">Kerfi og þjónusta</span><span class="ssp-undir kt-undir" data-kt-undir></span>' +
        '<span class="kt-skra" data-kt-skra hidden></span>' +
        '<button type="button" class="ssp-btn kt-opna" data-kt="opna" aria-expanded="false" aria-controls="' + ID + '-buk">Opna</button></header>' +
      '<div class="kt-raema" data-kt-raema></div>' +
      '<div class="ssp-buk kt-buk" id="' + ID + '-buk" data-kt-buk hidden></div>';
    tengja(kort);
    return kort;
  }
  // 00-legacy setur _currentCompanyId (og features.js Companies.currentId) ÁÐUR en prófíllinn er teiknaður.
  const opidFid = () => {
    const n = parseInt(window._currentCompanyId != null ? window._currentCompanyId : (window.Companies && Companies.currentId), 10);
    return isFinite(n) && n > 0 ? n : null;
  };
  let _sidastFid = null;
  function festa() {
    const main = document.getElementById('companies-main');
    if (!main || !F()) return;
    const banner = main.querySelector(':scope > .co-banner');
    let kort = document.getElementById(ID);
    if (!banner) return;                       // ekki prófíll (listinn eða annað) — spjaldið fór með innerHTML
    const fid = opidFid();
    if (!fid) return;
    injectCss();
    if (fid !== _sidastFid) { _sidastFid = fid; _ritill = null; }
    let fylla_ = false;
    if (!kort || kort.parentNode !== main) {
      if (kort) kort.remove();
      kort = smida(fid);
      fylla_ = true;
    } else if (+kort.dataset.fid !== fid) {
      kort.dataset.fid = String(fid);
      kort.querySelectorAll('[data-kt-undir],[data-kt-raema],[data-kt-buk],[data-kt-samtals]').forEach((el) => { el._kt = null; });
      fylla_ = true;
    }
    // Staður: á eftir Samskiptum ef þau eru komin, annars á eftir borðanum. Aðeins hreyft ef hann er rangur.
    const sam = main.querySelector(':scope > ._samskipti-host');
    const mynd = main.querySelector(':scope > #_bgm477');   // 477: myndir búnaðargreiningar — Agnar 22.10: teikningarnar ofan við Kerfi og þjónustu
    const teikn = main.querySelector(':scope > #co-fp-section.t485');   // 485: Teikning + Búnaðargreining í einum glugga rétt undir Samskiptum — akkeri keðjunnar (annars togast þau á um sama stað)
    const akkeri = mynd || teikn || sam || banner;
    if (kort.previousElementSibling !== akkeri || kort.parentNode !== main) akkeri.after(kort);
    const m = _minni.get(fid);
    if (fylla_) fylla(kort, fid);
    if (!m || m.villa || Date.now() - m.t > FERSKT_MS) {
      saekja(fid).then((r) => {
        const k = document.getElementById(ID);
        if (!k || +k.dataset.fid !== fid || !r.breytt) return;
        // Aldrei teiknað undan þeim sem er að skrifa í spjaldið — beðið eftir focusout
        if (k.contains(document.activeElement) && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
          k.addEventListener('focusout', function bida() { setTimeout(() => { const kk = document.getElementById(ID); if (kk && !kk.contains(document.activeElement)) { kk.removeEventListener('focusout', bida); fylla(kk, fid); } }, 0); });
          return;
        }
        fylla(k, fid);
      });
    }
  }

  // Breyting frá flipanum Flokkun (449b) á sama stað → sótt aftur
  document.addEventListener('flokkun-breytt', (e) => {
    const d = e.detail || {};
    if (!d.fid || !_minni.has(d.fid)) return;
    if (d.tegund) { const m = _minni.get(d.fid); m.t = 0; }
  });

  let _vaktTilraunir = 0;
  function vakta() {
    const main = document.getElementById('companies-main');
    if (!main) { if (++_vaktTilraunir < 60) setTimeout(vakta, 500); return; }
    const MO = window.__NativeMutationObserver || MutationObserver;
    // Aðeins bein börn #companies-main (spjaldið er eitt þeirra) — óinngjöfuð, svo spjaldið er komið fyrir málun.
    new MO((ms) => {
      for (const m of ms) {
        const breytt = [...m.addedNodes, ...m.removedNodes].some((n) => n.nodeType === 1 && n.id !== ID);
        if (breytt) { try { festa(); } catch (err) { console.warn('[450]', err); } return; }
      }
    }).observe(main, { childList: true });
    // Flipaskipti í prófíl I (500 setur data-p2tab): haus (Skrá í brunakerfisþjónustu), samtala og sjálfgefið opið fylgja flipanum.
    new MO(() => { const k = document.getElementById(ID); if (k) { try { fylla(k, +k.dataset.fid); } catch (err) { console.warn('[450]', err); } } })
      .observe(main, { attributes: true, attributeFilter: ['data-p2tab'] });
    try { festa(); } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta);
  else vakta();

  window.KerfiThjonusta = {
    festa,
    opna: (fid) => { fid = fid || opidFid(); if (!fid) return; _opid.set(fid, true); const k = document.getElementById(ID); if (k) fylla(k, fid); },
    endurhlada: (fid) => { fid = fid || opidFid(); if (!fid) return Promise.resolve(); return saekja(fid).then(() => { const k = document.getElementById(ID); if (k && +k.dataset.fid === fid) fylla(k, fid); }); },
    gogn: (fid) => { const m = _minni.get(fid || opidFid()); return m ? m.gogn : null; },
    version: '450',
  };
})();
/* === END KERFI OG ÞJÓNUSTA === */
