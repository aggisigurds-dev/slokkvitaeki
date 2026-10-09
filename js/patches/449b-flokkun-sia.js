/* === FLOKKUN VIÐSKIPTAVINA — SÍAN (449b) — 09.10.2026 ==========================================================
 *
 * Flipinn „Flokkun viðskiptavina" á Reglur-síðunni (449 á flipastikuna og slóðina #reglur/flokkun; þessi skrá á aðeins
 * innihaldið í #_fl449-root). Agnar 08.10.2026: „setja síðan filter kerfi á þarna svo við getum séð hvaða
 * eignir/fasteignir falla undir hvaða flokk … hvort þau séu með slíkt kerfi eða hvort það vanti. spotta ný tækifæri".
 *
 *   Yfirlit   tölur sem eru síur (smellur = sían sett): neyðarlýsing/útljós skylt en ekki hjá okkur, brunaviðvörunarkerfi
 *             hjá öðrum, skylt-vantar, hjá öðrum, óflokkað, lág vissa, handvalið — og fjöldi eftir tegund
 *   Síur      tegund · notkunarflokkur · vissa · kerfi · staða kerfis · krafa · tækifæri a–d · leit (nafn/heimilisfang/kt)
 *   Staðir    tafla C: staður (tengill á #company/<id>) · tegund (+ Leiðrétta) · notkunarflokkur · vissa · kerfamerki
 *
 * SÍAN Á KERFUM ER „TIL ER RÖÐ": staður passar ef EIN kerfaröð hans uppfyllir kerfi + stöðu + kröfu + tækifæri saman —
 * nákvæmlega sama og `select count(distinct fyrirtaeki_id) from v_stadur_kerfi where …`, svo talan á skjánum og SQL
 * stemma (prófað). Allt annað (tegund, skylt, tækifæri) er reiknað í sýnunum — hér er ekkert endurreiknað.
 *
 * Gögn og skrif: window.Flokkun (449a). Síuval lifir í breytum (ekki localStorage, ekki DOM-klösum). Listinn er teiknaður
 * með Stodugt.vernda (388) svo skrun og fókus haldist; síureitirnir sjálfir eru aldrei endurteiknaðir við síun.
 * Útlit: Brunastál C eins og 449 (málmhaus með hnoðum, stálplata, stálspjöld, tafla C, Playfair-tölur). Engin emoji.
 * ================================================================================================================ */
(() => {
  if (window.FlokkunSia) return;

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISP = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const STAL_IMG = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const DARK_PLATE = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  const RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
  const LED = { rautt: '#e0453c', graent: '#2fbf6b', gull: '#d9b762' };
  const SKAMMTUR = 150;      // raðir í hverri teikningu listans („Sýna fleiri")

  const F = () => window.Flokkun;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const svg = (d, w) => '<svg width="' + (w || 16) + '" height="' + (w || 16) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  const IK_LEIT = '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>';
  const beygjaStad = (n) => (n % 10 === 1 && n % 100 !== 11) ? 'staður' : 'staðir';
  const stofna = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ð/g, 'd');

  /* ── ÁSTAND ─────────────────────────────────────────────────────────────────────────────────────────────── */
  const TOM_SIA = () => ({ q: '', tegund: '', nf: '', vissa: '', kerfi: '', stada: '', krafa: '', taek: [] });
  let S = TOM_SIA();
  let _gogn = null, _villa = null, _hleður = false, _hysill = null, _syna = SKAMMTUR;
  let _ritill = null;          // { fid, stada, villa } — opinn „Leiðrétta tegund"-reitur
  let _stadir = [];            // forunnið: { s, kerfi[], leit, rod }
  let _leitTof = 0;

  // Yfirlitsflísar: hver er sía. Talan er reiknuð á ÖLLUM stöðum með sömu passar() og listinn notar.
  const FLISAR = [
    { id: 'neyd', heiti: 'Neyðarlýsing skylt — ekki hjá okkur', undir: 'vantar, óvitað eða hjá öðrum', sia: { kerfi: 'neydarlysing', krafa: 'ja', taek: ['a', 'b', 'c'] } },
    { id: 'utljos', heiti: 'Útljós skylt — ekki hjá okkur', undir: 'vantar, óvitað eða hjá öðrum', sia: { kerfi: 'utljos', krafa: 'ja', taek: ['a', 'b', 'c'] } },
    { id: 'bvk', heiti: 'Brunaviðvörunarkerfi hjá öðrum', undir: 'til staðar, annar aðili → tilboð', sia: { kerfi: 'brunavidvorunarkerfi', taek: ['b'] } },
    { id: 'a', heiti: 'Skylt en vantar', undir: 'tækifæri (a), eitthvert kerfi', sia: { taek: ['a'] } },
    { id: 'b', heiti: 'Hjá öðrum aðila', undir: 'tækifæri (b), eitthvert kerfi', sia: { taek: ['b'] } },
    { id: 'annad', heiti: 'Óflokkað', undir: 'tegund „Óflokkað / annað"', sia: { tegund: 'annad' } },
    { id: 'lag', heiti: 'Lág vissa', undir: 'sjálfvirk flokkun óviss — yfirfara', sia: { vissa: 'lag' } },
    { id: 'handval', heiti: 'Handvalið', undir: 'tegund leiðrétt af starfsmanni', sia: { vissa: 'handval' } },
  ];
  const fullSia = (p) => Object.assign(TOM_SIA(), p, { taek: (p.taek || []).slice() });
  const sama = (a, b) => ['q', 'tegund', 'nf', 'vissa', 'kerfi', 'stada', 'krafa'].every((k) => (a[k] || '') === (b[k] || '')) && a.taek.slice().sort().join() === b.taek.slice().sort().join();
  const erTom = (s) => sama(s, TOM_SIA());

  /* ── SÍAN ───────────────────────────────────────────────────────────────────────────────────────────────── */
  function kerfisRodPassar(r, s) {
    if (s.kerfi && r.kerfi !== s.kerfi) return false;
    if (s.stada) {
      const okkar = F().erOkkar(r.thjonustuadili);
      if (s.stada === 'okkar' && !okkar) return false;
      if (s.stada === 'annar' && !(r.til_stadar === 'ja' && !okkar)) return false;
      if (['ja', 'nei', 'ovitad'].includes(s.stada) && r.til_stadar !== s.stada) return false;
    }
    if (s.krafa) {
      if (s.krafa === 'ja_skilyrt') { if (r.skylt !== 'ja' && r.skylt !== 'skilyrt') return false; }
      else if (r.skylt !== s.krafa) return false;
    }
    if (s.taek.length && !s.taek.includes(r.taekifaeri)) return false;
    return true;
  }
  function passar(st, s, ord) {
    const x = st.s;
    if (s.tegund && x.tegund !== s.tegund) return false;
    if (s.nf && (s.nf === '_tomt' ? !!x.notkunarflokkur : x.notkunarflokkur !== s.nf)) return false;
    if (s.vissa && x.vissa !== s.vissa) return false;
    if (ord && ord.length && !ord.every((o) => st.leit.includes(o))) return false;
    if (s.kerfi || s.stada || s.krafa || s.taek.length) { if (!st.kerfi.some((r) => kerfisRodPassar(r, s))) return false; }
    return true;
  }
  function leitarOrd(q) {
    const t = stofna(q).trim();
    if (!t) return [];
    return t.split(/\s+/).map((o) => (/^[\d-]+$/.test(o) ? o.replace(/-/g, '') : o)).filter(Boolean);
  }
  function sia(s) {
    const ord = leitarOrd(s.q);
    return _stadir.filter((st) => passar(st, s, ord));
  }

  /* ── GÖGN ───────────────────────────────────────────────────────────────────────────────────────────────── */
  function forvinna(g) {
    const stadir = g.stadir.map((s) => {
      const kerfi = g.perStad.get(s.fyrirtaeki_id) || [];
      const leit = [stofna(s.nafn), stofna(s.heimilisfang), String(s.kennitala || '').replace(/\D/g, ''), stofna(s.tegund_heiti)].join(' ');
      return { s, kerfi, leit, rod: stofna(s.nafn) };
    });
    stadir.sort((a, b) => a.rod.localeCompare(b.rod, 'is') || a.s.fyrirtaeki_id - b.s.fyrirtaeki_id);
    return stadir;
  }
  function hlada(ferskt) {
    if (!F()) { _villa = 'Gagnalagið (449a) vantar'; teikna(); return; }
    if (_hleður) return;
    _hleður = true;
    F().allt(ferskt).then((g) => {
      _gogn = g; _villa = null; _stadir = forvinna(g);
    }, (e) => {
      _villa = F().villuTexti(e);
      try { if (typeof window.logProblem === 'function') window.logProblem('flokkun_hledsla', _villa); } catch (_) {}
    }).then(() => { _hleður = false; teikna(); try { if (window.Reglur && Reglur.uppfaeraHaus) Reglur.uppfaeraHaus(); } catch (_) {} });
  }

  /* ── CSS ────────────────────────────────────────────────────────────────────────────────────────────────── */
  function css() {
    const R = 'html body #view-reglur #_fl449-root';
    return [
      R + '{display:block;padding:0 0 24px;font-family:' + SANS + ';color:#1f2530}',
      R + ' *{box-sizing:border-box}',
      R + ' [hidden]{display:none!important}',
      // Stika (leit) — límist efst eins og leitarstika Reglna
      R + ' .fl-stika{position:sticky;top:0;z-index:6;display:flex;align-items:center;gap:10px;min-height:64px;padding:12px 22px;background:#dfe3ea;background-image:' + STAL_IMG + ';border-bottom:1px solid rgba(20,24,34,.14);box-shadow:0 6px 14px -12px rgba(10,14,22,.55)}',
      R + ' .fl-leitbox{position:relative;flex:0 1 560px;min-width:0}',
      R + ' .fl-leitbox svg{position:absolute;left:12px;top:50%;margin-top:-8px;color:#6b7483;pointer-events:none}',
      R + ' input.fl-leit{display:block;width:100%!important;height:40px!important;min-height:0!important;margin:0!important;padding:0 120px 0 38px!important;border-radius:8px!important;background:#eef1f6!important;border:1px solid rgba(20,24,34,.14)!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)!important;font:15px ' + SANS + '!important;color:#141822!important;-webkit-appearance:none;appearance:none}',
      R + ' .fl-leit:focus{outline:2px solid #971515;outline-offset:1px}',
      R + ' .fl-leit::-webkit-search-cancel-button{display:none}',
      R + ' .fl-fjoldi{position:absolute;right:12px;top:50%;transform:translateY(-50%);max-width:110px;font:500 12px ' + MONO + ';color:#3a4250;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none}',
      R + ' .fl-takki{flex:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:40px;padding:0 14px;border-radius:9px;font:600 13.5px ' + SANS + ';cursor:pointer;background:' + SILVER + ';border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530;white-space:nowrap}',
      R + ' .fl-takki.malm{background:' + DARK_PLATE + ';border-color:#000;color:#eef1f4;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.4)}',
      R + ' .fl-takki[disabled]{opacity:.38;pointer-events:none}',
      R + ' .fl-takki.lit{height:30px;padding:0 10px;font-size:12.5px;border-radius:7px}',
      R + ' .fl-stika .fl-takki{margin-left:auto}',
      R + ' .fl-takki:focus-visible,' + R + ' .fl-flis:focus-visible,' + R + ' .fl-teg:focus-visible,' + R + ' .fl-tk:focus-visible,' + R + ' a.fl-nafn:focus-visible{outline:2px solid #971515;outline-offset:2px}',
      // Grind = stálplata með stálspjöldum
      R + ' .fl-grind{display:flex;flex-direction:column;gap:14px;margin:14px 22px 0;padding:12px 12px 16px;border-radius:14px;border:1px solid #000;background:#cfd5de;background-image:' + STAL_IMG + ';box-shadow:0 10px 30px -10px rgba(10,14,22,.45);min-width:0}',
      R + ' .fl-hledur,' + R + ' .fl-tomt{padding:22px;text-align:center;font-size:14px;color:#3a4250}',
      R + ' .fl-villa{padding:16px 18px;font-size:14px;color:#8f1d13;background:#fff;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(143,29,19,.3)}',
      R + ' .fl-spjald{background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);overflow:hidden;min-width:0}',
      R + ' .fl-kh{position:relative;display:flex;align-items:center;gap:12px;flex-wrap:wrap;min-height:52px;padding:6px 20px 6px 22px;background:' + METAL + ';border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}',
      R + ' .fl-kh::before,' + R + ' .fl-kh::after{content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7)}',
      R + ' .fl-kh::before{left:8px}' + R + ' .fl-kh::after{right:8px}',
      R + ' .fl-kh h2{margin:0;min-width:0;font-family:' + DISP + ';font-weight:800;font-size:21px;line-height:1.15;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      R + ' .fl-kh .fl-undir{font:500 11.5px ' + MONO + ';color:#aab2c0;min-width:0}',
      R + ' .fl-kh .fl-hlid{margin-left:auto;display:flex;align-items:center;gap:8px}',
      R + ' .fl-kh .fl-tala{font-family:' + DISP + ';font-weight:800;font-size:24px;line-height:1;color:#fff}',
      R + ' .fl-kh .fl-tala small{font:700 13px ' + DISP + ';color:#cfd5de;margin-left:6px}',
      R + ' .fl-buk{padding:14px 16px 16px;background:' + STAL_IMG + '}',
      // Plötur
      R + ' .fl-plata{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12);font:700 10.5px ' + MONO + ';letter-spacing:.05em;text-transform:uppercase;color:#1f2530;white-space:nowrap}',
      R + ' .fl-plata._dokk{background:' + DARK_PLATE + ';border-color:#000;color:#eef1f4}',
      R + ' .fl-merki{margin:14px 0 6px;font:700 10.5px ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#3a4250}',
      R + ' .fl-merki:first-child{margin-top:0}',
      // Yfirlitsflísar
      R + ' .fl-flisar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}',
      R + ' .fl-flis{display:flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:0;min-height:96px;padding:10px 12px;text-align:left;cursor:pointer;background:#fff;border:1px solid rgba(20,24,34,.12);border-radius:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 2px 4px rgba(10,14,22,.14);color:#1f2530;font:inherit}',
      R + ' .fl-flis b{font-family:' + DISP + ';font-weight:800;font-size:30px;line-height:1;color:#141822;font-variant-numeric:lining-nums}',
      R + ' .fl-flis span{font:600 13px/1.3 ' + SANS + ';color:#141822}',
      R + ' .fl-flis small{font:500 11px/1.35 ' + MONO + ';color:#6b7483}',
      R + ' .fl-flis:hover{border-color:rgba(20,24,34,.32)}',
      R + ' .fl-flis[aria-pressed="true"]{background:' + DARK_PLATE + ';border-color:#000}',
      R + ' .fl-flis[aria-pressed="true"] b,' + R + ' .fl-flis[aria-pressed="true"] span{color:#fff}',
      R + ' .fl-flis[aria-pressed="true"] small{color:#c9cfd8}',
      // Tegundir (fjöldi eftir tegund)
      R + ' .fl-tegundir{display:flex;flex-wrap:wrap;gap:6px}',
      R + ' .fl-teg{display:inline-flex;align-items:center;gap:8px;max-width:100%;min-height:32px;padding:4px 10px;border-radius:7px;cursor:pointer;background:' + SILVER + ';border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12);font:500 13px ' + SANS + ';color:#1f2530;text-align:left}',
      R + ' .fl-teg span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      R + ' .fl-teg b{flex:none;font:700 12px ' + MONO + ';color:#3a4250}',
      R + ' .fl-teg[aria-pressed="true"]{background:' + DARK_PLATE + ';border-color:#000;color:#eef1f4}',
      R + ' .fl-teg[aria-pressed="true"] b{color:#d9dee6}',
      // Síur
      R + ' .fl-siur{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 12px;align-items:end}',
      R + ' .fl-sia{display:flex;flex-direction:column;gap:4px;min-width:0;margin:0}',
      R + ' .fl-sia > span{font:700 10.5px ' + MONO + ';letter-spacing:.12em;text-transform:uppercase;color:#3a4250}',
      R + ' select.fl-val{display:block;width:100%!important;max-width:100%!important;height:40px!important;min-height:0!important;margin:0!important;padding:0 30px 0 10px!important;border-radius:8px!important;background-color:#eef1f6!important;border:1px solid rgba(20,24,34,.14)!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.14)!important;font:14px ' + SANS + '!important;color:#141822!important;text-overflow:ellipsis}',
      R + ' select.fl-val:focus{outline:2px solid #971515;outline-offset:1px}',
      R + ' select.fl-val.virk{background-color:#fff!important;border-color:#1c1e23!important;box-shadow:0 0 0 1px #1c1e23!important}',
      R + ' .fl-taek{grid-column:span 2}',
      R + ' .fl-tkar{display:flex;flex-wrap:wrap;gap:6px}',
      R + ' .fl-tk{display:inline-flex;align-items:center;gap:7px;height:40px;padding:0 12px;border-radius:8px;cursor:pointer;background:' + SILVER + ';border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12);font:600 13px ' + SANS + ';color:#1f2530;white-space:nowrap}',
      R + ' .fl-tk[aria-pressed="true"]{background:' + DARK_PLATE + ';border-color:#000;color:#eef1f4}',
      R + ' .fl-tk .st{font:700 11px ' + MONO + ';opacity:.8}',
      // Ljós (tækifæri): a rautt · b gull · c tómt · d grænt
      R + ' .fl-led{display:inline-block;flex:none;width:8px;height:8px;border-radius:50%;background:#8a929e;box-shadow:0 0 0 1px rgba(0,0,0,.25)}',
      R + ' .t-a .fl-led,' + R + ' .fl-led.t-a{background:' + LED.rautt + ';box-shadow:0 0 6px rgba(224,69,60,.8),0 0 0 1px rgba(0,0,0,.3)}',
      R + ' .t-b .fl-led,' + R + ' .fl-led.t-b{background:' + LED.gull + ';box-shadow:0 0 6px rgba(217,183,98,.85),0 0 0 1px rgba(0,0,0,.3)}',
      R + ' .t-c .fl-led,' + R + ' .fl-led.t-c{background:transparent;box-shadow:inset 0 0 0 1.5px #7b8494}',
      R + ' .t-d .fl-led,' + R + ' .fl-led.t-d{background:' + LED.graent + ';box-shadow:0 0 6px rgba(47,191,107,.8),0 0 0 1px rgba(0,0,0,.3)}',
      R + ' .fl-skyring{display:flex;flex-wrap:wrap;gap:4px 14px;margin:0 0 10px;font:500 11.5px ' + MONO + ';color:#3a4250}',
      R + ' .fl-skyring span{display:inline-flex;align-items:center;gap:6px}',
      // Tafla C
      R + ' .fl-listi{padding:12px 12px 4px;background:' + STAL_IMG + '}',
      R + ' .fl-tafla{width:100%!important;min-width:0!important;display:table!important;table-layout:auto!important;border-collapse:separate!important;border-spacing:0!important;background:#fff;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);overflow:hidden;font-size:13.5px;line-height:1.45}',
      R + ' .fl-tafla thead{display:table-header-group!important}' + R + ' .fl-tafla tbody{display:table-row-group!important}' + R + ' .fl-tafla tr{display:table-row!important;background:#fff!important;height:auto!important}' + R + ' .fl-tafla th,' + R + ' .fl-tafla td{display:table-cell!important}',
      R + ' .fl-tafla th{background:' + METAL + '!important;color:#cfd5de!important;font:700 10.5px ' + MONO + '!important;letter-spacing:.08em!important;text-transform:uppercase!important;text-align:left!important;padding:9px 10px!important;vertical-align:bottom!important;white-space:nowrap!important;border:0!important;position:static!important}',
      R + ' .fl-tafla td{padding:8px 10px!important;border:0!important;border-top:1px solid rgba(20,24,34,.08)!important;vertical-align:top!important;white-space:normal!important;background:#fff!important;font:400 13.5px/1.45 ' + SANS + '!important;color:#1f2530!important;text-align:left!important;height:auto!important}',
      R + ' .fl-tafla td.fl-c-stadur{min-width:180px}',
      R + ' .fl-tafla td.fl-c-teg{min-width:170px}',
      R + ' .fl-tafla td.fl-c-nf{white-space:nowrap!important;font:500 12.5px ' + MONO + '!important}',
      R + ' a.fl-nafn{font-weight:700;color:#141822;text-decoration:none;border-bottom:1px dotted rgba(20,24,34,.45)}',
      R + ' a.fl-nafn:hover{color:#8f1d13;border-bottom-color:currentColor}',
      R + ' .fl-tafla small{display:block;margin-top:2px;font:400 11.5px/1.35 ' + SANS + ';color:#6b7483;overflow-wrap:anywhere}',
      R + ' .fl-teg-lina{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}',
      R + ' .fl-handval{display:block;margin-top:2px;font:500 11px ' + MONO + ';color:#845400}',
      R + ' .fl-kerfi{display:flex;flex-wrap:wrap;gap:4px}',
      R + ' .fl-k{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 7px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 1px rgba(0,0,0,.1);font:700 10.5px ' + MONO + ';color:#1f2530;white-space:nowrap}',
      R + ' .fl-k.val{background:' + DARK_PLATE + ';border-color:#000;color:#eef1f4}',
      R + ' .fl-v-ha{color:#1e6b3a}' + R + ' .fl-v-midlungs{color:#845400}' + R + ' .fl-v-lag{color:#b42318}' + R + ' .fl-v-handval{color:#1f2530}',
      R + ' .fl-meira{display:flex;justify-content:center;padding:10px 12px 14px;background:' + STAL_IMG + '}',
      // Leiðrétta tegund
      R + ' .fl-tafla tr.fl-ritill-rod td{background:#f4f6f9!important;border-top:0!important;padding:10px 12px 14px!important}',
      R + ' .fl-ritill{display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px}',
      R + ' .fl-ritill .fl-sia{flex:1 1 300px}',
      R + ' .fl-ritill-takkar{display:flex;flex-wrap:wrap;gap:6px}',
      R + ' .fl-ritill-skyring{flex:1 1 100%;font:500 12px/1.45 ' + SANS + ';color:#3a4250}',
      R + ' .fl-ritill-stada{flex:1 1 100%;min-height:18px;font:600 12.5px ' + MONO + ';color:#1e6b3a}',
      R + ' .fl-ritill-stada.villa{color:#b42318}',
      // Þröngt (sími, S26 980 px með hliðarstiku): stika brotnar, síur í tvo dálka, tafla verður spjöld — ekkert lárétt skrun
      '@container rg (max-width: 1000px){' + R + ' .fl-siur{grid-template-columns:repeat(3,minmax(0,1fr))}' + R + ' .fl-taek{grid-column:1 / -1}' + '}',
      '@container rg (max-width: 760px){' +
        R + ' .fl-stika{flex-wrap:wrap;padding:10px 12px;gap:8px}' + R + ' .fl-leitbox{flex:1 1 100%}' +
        R + ' input.fl-leit{height:44px!important;font-size:16px!important;padding-right:96px!important}' + R + ' .fl-fjoldi{max-width:88px}' +
        R + ' .fl-stika .fl-takki{margin-left:0}' +
        R + ' .fl-grind{margin:10px 8px 0;padding:8px 8px 12px;gap:10px;border-radius:12px}' +
        R + ' .fl-kh{padding:6px 16px 6px 18px}' + R + ' .fl-kh h2{font-size:19px}' +
        R + ' .fl-buk{padding:12px 10px 12px}' +
        R + ' .fl-flisar{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}' +
        R + ' .fl-flis{min-height:88px;padding:8px 10px}' + R + ' .fl-flis b{font-size:26px}' +
        R + ' .fl-siur{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}' + R + ' .fl-taek{grid-column:1 / -1}' +
        R + ' select.fl-val{height:44px!important;font-size:16px!important}' +
        R + ' .fl-tk{height:44px}' +
        R + ' .fl-listi{padding:8px 8px 2px}' +
        R + ' .fl-tafla,' + R + ' .fl-tafla tbody,' + R + ' .fl-tafla tr,' + R + ' .fl-tafla td{display:block!important;width:100%!important}' +
        R + ' .fl-tafla thead{display:none!important}' +
        R + ' .fl-tafla tr{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:12px;padding:10px 12px!important;border-top:1px solid rgba(20,24,34,.1)}' + R + ' .fl-tafla tr:first-child{border-top:0}' +
        R + ' .fl-tafla td.fl-c-stadur,' + R + ' .fl-tafla td.fl-c-teg,' + R + ' .fl-tafla td.fl-c-kerfi,' + R + ' .fl-tafla tr.fl-ritill-rod td{grid-column:1 / -1}' +
        R + ' .fl-tafla td{padding:2px 0!important;border:0!important;min-width:0!important}' +
        R + ' .fl-tafla td[data-dalkur]::before{content:attr(data-dalkur);display:block;margin-top:6px;font:700 10px ' + MONO + ';letter-spacing:.1em;text-transform:uppercase;color:#6b7483}' +
        R + ' .fl-tafla tr.fl-ritill-rod{padding:0!important}' + R + ' .fl-tafla tr.fl-ritill-rod td{padding:10px 12px 14px!important}' +
      '}',
      '@container rg (max-width: 420px){' + R + ' .fl-siur{grid-template-columns:minmax(0,1fr)}' + R + ' .fl-flisar{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}' + R + ' .fl-flis span{font-size:12.5px}' + '}',
      '@media (max-height: 520px){' + R + ' .fl-stika{position:static}' + '}',
    ].join('\n');
  }
  function injectCss() {
    if (document.getElementById('_fl449b-css')) return;
    const st = document.createElement('style'); st.id = '_fl449b-css'; st.textContent = css();
    (document.head || document.documentElement).appendChild(st);
  }

  /* ── TEIKNING ───────────────────────────────────────────────────────────────────────────────────────────── */
  function stikaHtml() {
    return '<div class="fl-stika">' +
      '<div class="fl-leitbox">' + svg(IK_LEIT) + '<input type="search" class="fl-leit" data-fl-leit placeholder="Leita: nafn, heimilisfang, kt." aria-label="Leita að stað" autocomplete="off" spellcheck="false" enterkeyhint="search" value="' + esc(S.q) + '">' +
        '<span class="fl-fjoldi" data-fl-fjoldi aria-live="polite"></span></div>' +
      '<button type="button" class="fl-takki" data-fl="hreinsa"' + (erTom(S) ? ' disabled' : '') + '>Hreinsa síur</button>' +
    '</div><div class="fl-grind" data-fl-grind></div>';
  }
  function valHtml(nafn, merki, valkostir) {
    const gildi = nafn === 'taek' ? '' : (S[nafn] || '');
    return '<label class="fl-sia"><span>' + esc(merki) + '</span><select class="fl-val' + (gildi ? ' virk' : '') + '" data-fl-sia="' + nafn + '">' +
      valkostir.map((o) => '<option value="' + esc(o[0]) + '"' + (o[0] === gildi ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></label>';
  }
  function grindHtml() {
    const g = _gogn, Fk = F();
    // Fjöldi eftir tegund (allir staðir)
    const eftirTeg = new Map();
    _stadir.forEach((st) => { const t = st.s.tegund || ''; const x = eftirTeg.get(t) || { n: 0, heiti: st.s.tegund_heiti || t || '(engin)' }; x.n++; eftirTeg.set(t, x); });
    const tegRod = [...eftirTeg.entries()].sort((a, b) => b[1].n - a[1].n || a[1].heiti.localeCompare(b[1].heiti, 'is'));
    const nfSet = new Set(); let nfTomt = 0;
    _stadir.forEach((st) => { if (st.s.notkunarflokkur) nfSet.add(st.s.notkunarflokkur); else nfTomt++; });
    const nfListi = [...nfSet].sort((a, b) => a.localeCompare(b, 'is', { numeric: true }));
    const flisar = FLISAR.map((f) => {
      const n = sia(fullSia(f.sia)).length;
      return '<button type="button" class="fl-flis" data-fl="flis" data-v="' + f.id + '" aria-pressed="false"><b>' + n.toLocaleString('de-DE') + '</b><span>' + esc(f.heiti) + '</span><small>' + esc(f.undir) + '</small></button>';
    }).join('');
    const tegundir = tegRod.map(([t, x]) => '<button type="button" class="fl-teg" data-fl="teg" data-v="' + esc(t) + '" aria-pressed="false" title="' + esc(x.heiti) + '"><span>' + esc(x.heiti) + '</span><b>' + x.n + '</b></button>').join('');
    const yfirlit = '<section class="fl-spjald" aria-labelledby="fl-h-yfirlit"><header class="fl-kh"><h2 id="fl-h-yfirlit">Yfirlit</h2><span class="fl-undir">smelltu á tölu til að sía listann</span>' +
        '</header>' +
      '<div class="fl-buk"><div class="fl-flisar" data-fl-flisar>' + flisar + '</div>' +
        '<div class="fl-merki">Fjöldi eftir tegund</div><div class="fl-tegundir" data-fl-tegundir>' + tegundir + '</div></div></section>';
    const tegValkostir = [['', 'Allar tegundir']].concat(g.krofur.listi.map((t) => [t.tegund, t.heiti + ' (' + ((eftirTeg.get(t.tegund) || { n: 0 }).n) + ')']));
    const siur = '<section class="fl-spjald" aria-labelledby="fl-h-siur"><header class="fl-kh"><h2 id="fl-h-siur">Síur</h2><span class="fl-undir">kerfissíurnar gilda saman á sama kerfið</span>' +
        '<span class="fl-hlid"><button type="button" class="fl-takki lit" data-fl="krofur">Kröfur eftir tegund</button></span></header>' +
      '<div class="fl-buk fl-siur">' +
        valHtml('tegund', 'Tegund', tegValkostir) +
        valHtml('nf', 'Notkunarflokkur', [['', 'Allir flokkar']].concat(nfListi.map((n) => [n, 'Notkunarflokkur ' + n])).concat(nfTomt ? [['_tomt', 'Enginn flokkur (' + nfTomt + ')']] : [])) +
        valHtml('vissa', 'Vissa flokkunar', [['', 'Öll vissa'], ['ha', 'Há'], ['midlungs', 'Miðlungs'], ['lag', 'Lág'], ['handval', 'Handval']]) +
        valHtml('kerfi', 'Kerfi', [['', 'Öll kerfi']].concat(Fk.KERFI.map((k) => [k.k, k.heiti]))) +
        valHtml('stada', 'Staða kerfis', [['', 'Öll staða'], ['ja', 'Til staðar'], ['nei', 'Skráð: vantar'], ['ovitad', 'Óvitað'], ['okkar', 'Okkar þjónusta'], ['annar', 'Hjá öðrum aðila']]) +
        valHtml('krafa', 'Krafa', [['', 'Allar kröfur'], ['ja', 'Skylt'], ['skilyrt', 'Skilyrt'], ['ja_skilyrt', 'Skylt eða skilyrt'], ['nei', 'Ekki skylt']]) +
        '<div class="fl-sia fl-taek"><span>Tækifæri</span><div class="fl-tkar">' +
          ['a', 'b', 'c', 'd'].map((t) => '<button type="button" class="fl-tk t-' + t + '" data-fl="taek" data-v="' + t + '" aria-pressed="' + S.taek.includes(t) + '"><i class="fl-led"></i>' + esc(Fk.TAEKIFAERI[t].heiti) + ' <span class="st">(' + t + ')</span></button>').join('') +
        '</div></div>' +
      '</div></section>';
    const skyring = '<div class="fl-skyring" aria-hidden="true">' + ['d', 'b', 'a', 'c'].map((t) => '<span class="t-' + t + '"><i class="fl-led"></i>' + esc(Fk.TAEKIFAERI[t].stutt) + '</span>').join('') + '<span>dökkt merki = valið kerfi</span></div>';
    const listi = '<section class="fl-spjald" aria-labelledby="fl-h-stadir"><header class="fl-kh"><h2 id="fl-h-stadir">Staðir</h2><span class="fl-undir" data-fl-listi-undir></span>' +
        '<span class="fl-hlid"><span class="fl-tala" data-fl-listi-tala></span></span></header>' +
      '<div class="fl-listi">' + skyring + '<div data-fl-listi></div></div><div class="fl-meira" data-fl-meira hidden></div></section>';
    return yfirlit + siur + listi;
  }
  function kerfaMerki(st) {
    const Fk = F();
    const eftir = new Map(st.kerfi.map((r) => [r.kerfi, r]));
    return Fk.KERFI.map((k) => {
      const r = eftir.get(k.k);
      if (!r || !r.taekifaeri) return '';
      const t = Fk.TAEKIFAERI[r.taekifaeri];
      const titill = k.heiti + ' · ' + (Fk.SKYLT[r.skylt] || 'krafa óþekkt') + ' · ' + t.heiti + (r.thjonustuadili ? ' · ' + r.thjonustuadili : '');
      return '<span class="fl-k t-' + r.taekifaeri + (S.kerfi === k.k ? ' val' : '') + '" title="' + esc(titill) + '"><i class="fl-led"></i>' + esc(k.stutt) + '</span>';
    }).join('');
  }
  function ritillHtml(st) {
    const Fk = F(), x = st.s, g = _gogn;
    const sjalf = g.krofur.tegundir.get(x.tegund_sjalfvirk);
    const valin = x.tegund || '';
    const opt = g.krofur.listi.map((t) => '<option value="' + esc(t.tegund) + '"' + (t.tegund === valin ? ' selected' : '') + '>' + esc(t.heiti + (t.notkunarflokkur ? ' · fl. ' + t.notkunarflokkur : '')) + '</option>').join('');
    const r = _ritill || {};
    return '<tr class="fl-ritill-rod" data-fl-ritill="' + x.fyrirtaeki_id + '"><td colspan="5"><div class="fl-ritill">' +
      '<label class="fl-sia"><span>Rétt tegund — ' + esc(x.nafn || '') + '</span><select class="fl-val" data-fl-ritill-val>' + opt + '</select></label>' +
      '<div class="fl-ritill-takkar">' +
        '<button type="button" class="fl-takki malm" data-fl="vista-tegund" data-fid="' + x.fyrirtaeki_id + '"' + (r.vistar ? ' disabled' : '') + '>Vista</button>' +
        (x.tegund_handval ? '<button type="button" class="fl-takki" data-fl="fella-handval" data-fid="' + x.fyrirtaeki_id + '"' + (r.vistar ? ' disabled' : '') + '>Fella niður handval</button>' : '') +
        '<button type="button" class="fl-takki" data-fl="loka-ritli">' + (r.stada ? 'Loka' : 'Hætta við') + '</button>' +
      '</div>' +
      '<div class="fl-ritill-skyring">Sjálfvirk flokkun: <b>' + esc(sjalf ? sjalf.heiti : (x.tegund_sjalfvirk || 'engin')) + '</b>' +
        (x.tegund_handval ? ' · handvalið gildir núna' : '') + '. Aðeins handvalið breytist — kröfurnar og tækifærin fylgja tegundinni sjálfkrafa.</div>' +
      '<div class="fl-ritill-stada' + (r.villa ? ' villa' : '') + '" data-fl-ritill-stada aria-live="polite">' + esc(r.stada || '') + '</div>' +
    '</div></td></tr>';
  }
  function radHtml(st) {
    const Fk = F(), x = st.s;
    const vissa = x.vissa || '';
    return '<tr data-fid="' + x.fyrirtaeki_id + '">' +
      '<td class="fl-c-stadur"><a class="fl-nafn" href="#company/' + x.fyrirtaeki_id + '" data-fl-opna="' + x.fyrirtaeki_id + '" title="Opna fyrirtækið">' + esc(x.nafn || '(nafnlaust)') + '</a>' +
        '<small>' + esc([x.heimilisfang, x.kennitala].filter(Boolean).join(' · ')) + '</small></td>' +
      '<td class="fl-c-teg" data-dalkur="Tegund"><div class="fl-teg-lina"><span>' + esc(x.tegund_heiti || x.tegund || '—') +
        (x.tegund_handval ? '<span class="fl-handval">handvalið</span>' : '') + '</span>' +
        '<button type="button" class="fl-takki lit" data-fl="leidretta" data-fid="' + x.fyrirtaeki_id + '" aria-expanded="' + !!(_ritill && _ritill.fid === x.fyrirtaeki_id) + '">Leiðrétta</button></div></td>' +
      '<td class="fl-c-nf" data-dalkur="Notkunarflokkur">' + esc(x.notkunarflokkur || '—') + '</td>' +
      '<td class="fl-c-vissa" data-dalkur="Vissa"><span class="fl-plata fl-v-' + esc(vissa) + '">' + esc(Fk.VISSA[vissa] || vissa || '—') + '</span></td>' +
      '<td class="fl-c-kerfi" data-dalkur="Kerfi"><div class="fl-kerfi">' + (kerfaMerki(st) || '<span class="fl-k">ekkert skráð</span>') + '</div></td>' +
    '</tr>' + (_ritill && _ritill.fid === x.fyrirtaeki_id ? ritillHtml(st) : '');
  }

  // Teiknar allt innihald flipans (fyrsta sinn og eftir nýja sókn). Síun teiknar aðeins listann (teiknaLista).
  function teikna() {
    const h = _hysill;
    if (!h || !h.isConnected) return;
    injectCss();
    if (!h.querySelector('.fl-stika')) h.innerHTML = stikaHtml();
    const grind = h.querySelector('[data-fl-grind]');
    if (_villa && !_gogn) {
      grind.innerHTML = '<div class="fl-villa">Flokkunin náðist ekki: ' + esc(_villa) + ' <button type="button" class="fl-takki lit" data-fl="reyna">Reyna aftur</button></div>';
      return;
    }
    if (!_gogn) { if (!grind.firstChild) grind.innerHTML = '<div class="fl-hledur">Hleður flokkun staða…</div>'; return; }
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(grind) : null;
    grind.innerHTML = grindHtml();
    if (aftur) aftur();
    teiknaLista();
  }
  function teiknaLista() {
    const h = _hysill;
    if (!h || !_gogn) return;
    const listi = h.querySelector('[data-fl-listi]');
    if (!listi) return;
    const nidur = sia(S);
    const synd = nidur.slice(0, _syna);
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(listi) : null;
    listi.innerHTML = synd.length
      ? '<table class="fl-tafla no-skin"><thead><tr><th>Staður</th><th>Tegund</th><th>Fl.</th><th>Vissa</th><th>Kerfi · tækifæri</th></tr></thead><tbody>' + synd.map(radHtml).join('') + '</tbody></table>'
      : '<div class="fl-tomt">Enginn staður passar við síurnar.</div>';
    if (aftur) aftur();
    const meira = h.querySelector('[data-fl-meira]');
    const eftir = nidur.length - synd.length;
    if (meira) {
      const t = eftir > 0 ? '<button type="button" class="fl-takki" data-fl="meira">Sýna fleiri (' + eftir + ' eftir)</button>' : '';
      if (meira._fl !== t) { meira._fl = t; meira.innerHTML = t; }
      if (meira.hidden !== !t) meira.hidden = !t;
    }
    const n = nidur.length;
    setjaTexta(h.querySelector('[data-fl-fjoldi]'), n + ' ' + beygjaStad(n));
    const tala = h.querySelector('[data-fl-listi-tala]');
    if (tala) { const t = n.toLocaleString('de-DE') + '<small>' + beygjaStad(n) + '</small>'; if (tala._fl !== t) { tala._fl = t; tala.innerHTML = t; } }
    setjaTexta(h.querySelector('[data-fl-listi-undir]'), erTom(S) ? 'allir flokkaðir staðir · raðað eftir nafni' : 'síað · raðað eftir nafni');
    merkjaVal();
  }
  const setjaTexta = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  const setjaAttr = (el, a, v) => { if (el && el.getAttribute(a) !== v) el.setAttribute(a, v); };
  // Valið sést á flísum, tegundum, tækifærum og síureitum — aðeins eigindi breytt, ekkert teiknað upp á nýtt.
  function merkjaVal() {
    const h = _hysill; if (!h) return;
    h.querySelectorAll('.fl-flis').forEach((b) => { const f = FLISAR.find((x) => x.id === b.dataset.v); setjaAttr(b, 'aria-pressed', String(!!f && sama(S, fullSia(f.sia)))); });
    h.querySelectorAll('.fl-teg').forEach((b) => setjaAttr(b, 'aria-pressed', String(!!S.tegund && S.tegund === b.dataset.v)));
    h.querySelectorAll('.fl-tk').forEach((b) => setjaAttr(b, 'aria-pressed', String(S.taek.includes(b.dataset.v))));
    h.querySelectorAll('select[data-fl-sia]').forEach((s) => { const v = S[s.dataset.flSia] || ''; if (s.value !== v) s.value = v; if (s.classList.contains('virk') !== !!v) s.classList.toggle('virk', !!v); });
    const inp = h.querySelector('[data-fl-leit]'); if (inp && inp.value !== S.q && document.activeElement !== inp) inp.value = S.q;
    const hr = h.querySelector('[data-fl="hreinsa"]'); if (hr && hr.disabled !== erTom(S)) hr.disabled = erTom(S);
  }
  function setjaSiu(nySia, skruna) {
    S = nySia; _syna = SKAMMTUR;
    teiknaLista();
    if (skruna) {
      const sec = _hysill && _hysill.querySelector('#fl-h-stadir');
      const stika = _hysill && _hysill.querySelector('.fl-stika');
      if (sec) {
        let s = sec.parentElement;
        while (s && s !== document.body && !(s.scrollHeight > s.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(s).overflowY))) s = s.parentElement;
        const munur = sec.closest('.fl-spjald').getBoundingClientRect().top - ((stika ? stika.getBoundingClientRect().bottom : 0) + 10);
        if (Math.abs(munur) > 1) { if (s && s !== document.body) s.scrollTop += munur; else window.scrollBy(0, munur); }
      }
    }
  }

  /* ── LEIÐRÉTTA TEGUND ───────────────────────────────────────────────────────────────────────────────────── */
  async function vistaTegund(fid, tegund) {
    _ritill = { fid, stada: 'Vistar…', vistar: true };
    teiknaLista();
    try {
      await F().leidrettaTegund(fid, tegund);
      const kl = new Date().toTimeString().slice(0, 5);
      _ritill = { fid, stada: (tegund ? 'Vistað ' : 'Handval fellt niður ') + kl + ' — kröfur og tækifæri endurreiknuð' };
      // Listinn stendur á meðan; 'flokkun-breytt' (449a) hefur þegar ræst endursókn — annars hér. Ein sókn (449a deilir henni).
      if (!_hleður) hlada(true);
    } catch (e) {
      _ritill = { fid, stada: 'Vistun mistókst: ' + F().villuTexti(e), villa: true };
      teiknaLista();
    }
  }

  /* ── ATBURÐIR (á hýslinum — 449 hlustar á [data-rg], ekki á [data-fl]) ──────────────────────────────────── */
  function tengja(h) {
    if (h._fl449b) return;
    h._fl449b = true;
    h.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-fl-opna]');
      if (a && h.contains(a)) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;   // nýr flipi: vafrinn sér um #company/<id>
        e.preventDefault();
        const id = parseInt(a.dataset.flOpna, 10);
        try { history.pushState(null, '', '#company/' + id); } catch (_) {}   // „til baka" skilar flipanum með síunum
        try {
          if (typeof window._openCompanySafe === 'function') window._openCompanySafe(id);
          else if (window.App && App.switchView && window.Companies && Companies.openDetail) { App.switchView('companies'); Companies.openDetail(id); }
          else location.hash = '#company/' + id;
        } catch (_) { location.hash = '#company/' + id; }
        return;
      }
      const b = e.target.closest('[data-fl]');
      if (!b || !h.contains(b)) return;
      const t = b.dataset.fl;
      if (t === 'flis') { const f = FLISAR.find((x) => x.id === b.dataset.v); if (!f) return; setjaSiu(sama(S, fullSia(f.sia)) ? TOM_SIA() : fullSia(f.sia), true); return; }
      if (t === 'teg') { const v = b.dataset.v; setjaSiu(Object.assign({}, S, { tegund: S.tegund === v ? '' : v }), true); return; }
      if (t === 'taek') { const v = b.dataset.v; const tk = S.taek.includes(v) ? S.taek.filter((x) => x !== v) : S.taek.concat(v); setjaSiu(Object.assign({}, S, { taek: tk })); return; }
      if (t === 'hreinsa') { setjaSiu(TOM_SIA()); const i = h.querySelector('[data-fl-leit]'); if (i) { i.value = ''; i.focus(); } return; }
      if (t === 'meira') { _syna += SKAMMTUR; teiknaLista(); return; }
      if (t === 'reyna') { _villa = null; hlada(true); teikna(); return; }
      if (t === 'krofur') { try { if (window.Reglur && Reglur.hoppa) Reglur.hoppa('flokkar'); } catch (_) {} return; }
      if (t === 'leidretta') { const fid = +b.dataset.fid; _ritill = (_ritill && _ritill.fid === fid) ? null : { fid }; teiknaLista(); if (_ritill) { const s = h.querySelector('[data-fl-ritill="' + fid + '"] select'); if (s) s.focus({ preventScroll: true }); } return; }
      if (t === 'loka-ritli') { _ritill = null; teiknaLista(); return; }
      if (t === 'vista-tegund' || t === 'fella-handval') {
        const fid = +b.dataset.fid;
        const s = h.querySelector('[data-fl-ritill="' + fid + '"] select');
        vistaTegund(fid, t === 'fella-handval' ? null : (s ? s.value : null));
      }
    });
    h.addEventListener('change', (e) => {
      const s = e.target.closest('select[data-fl-sia]');
      if (!s || !h.contains(s)) return;
      setjaSiu(Object.assign({}, S, { [s.dataset.flSia]: s.value }));
    });
    h.addEventListener('input', (e) => {
      const i = e.target.closest('[data-fl-leit]');
      if (!i) return;
      clearTimeout(_leitTof);
      const q = i.value;
      _leitTof = setTimeout(() => { if (S.q !== q) setjaSiu(Object.assign({}, S, { q })); }, 140);
    });
    h.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && e.target.closest('[data-fl-leit]') && S.q) { e.preventDefault(); e.stopPropagation(); e.target.value = ''; setjaSiu(Object.assign({}, S, { q: '' })); }
    });
  }

  // Breyting annars staðar (prófílspjaldið 450) gerir gögnin úrelt — sótt aftur næst þegar flipinn sést.
  document.addEventListener('flokkun-breytt', () => {
    const v = document.getElementById('view-reglur');
    const synilegt = v && v.classList.contains('active') && window.Reglur && Reglur.flipi && Reglur.flipi() === 'flokkun';
    if (synilegt && !_hleður) hlada(true);
  });

  window.FlokkunSia = {
    opna(hysill) {
      if (!hysill) return;
      _hysill = hysill;
      tengja(hysill);
      teikna();
      if (!_gogn || (F() && F().erUrelt())) hlada(!!_gogn);
    },
    tala: () => (_gogn ? { n: _stadir.length, ord: beygjaStad(_stadir.length) } : null),
    // Fyrir prófanir og aðra pappa: núverandi sía og fjöldi
    stada: () => ({ sia: JSON.parse(JSON.stringify(S)), fjoldi: _gogn ? sia(S).length : null, alls: _stadir.length }),
    setja: (p) => setjaSiu(fullSia(p || {})),
    telja: (p) => (_gogn ? sia(fullSia(p || {})).length : null),
    version: '449b',
  };
  // 449 ræsist á undan þessari skrá (defer keyrir með readyState „interactive"): sé flipinn þegar opinn eftir
  // djúptengil (#reglur/flokkun) stendur hýsillinn auður — fylltur hér.
  try {
    const h = document.querySelector('#view-reglur #_fl449-root');
    if (h && window.Reglur && Reglur.flipi && Reglur.flipi() === 'flokkun') { FlokkunSia.opna(h); if (Reglur.uppfaeraHaus) Reglur.uppfaeraHaus(); }
  } catch (_) {}
})();
/* === END FLOKKUN SÍA === */
