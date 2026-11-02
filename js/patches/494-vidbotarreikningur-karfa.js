/* === VIÐBÓTARREIKNINGUR — karfa við brunakerfisskoðun (494, 02.11.2026) ===
 *
 * Ósk Agnars 02.11.2026: sérstakt, frjálst „körfu“-viðmót á Brunakerfis skoðun-spjaldinu (274) til að rukka það sem
 * gleymdist eða smásölu í leiðinni (skynjari, bjalla, aukavinna) sem SJÁLFSTÆÐA BÚÐARSÖLU — óbeint tengda skoðuninni.
 * Tengillinn „Gera viðbótarreikning“ (fótur hægra spjaldsins í 274) opnar körfuna.
 *
 *   · Vinstra megin: verðlistinn í tveimur dálkum — ÞJÓNUSTA (brunakerfis-verðlistinn, app_settings.brunakerfi_verdlisti,
 *     sama heimild og 273 priceItems / 274) og VÖRUR (vorur.virkt, sama tafla og Sala/pos.js). „+“ setur línu í körfuna.
 *   · Hægra megin: karfan — lýsing, magn, einingaverð án vsk (ritanlegt), vsk %, afsláttur % á línu; „+ Ný lína“ er frjáls
 *     lína; afsláttur á heild %; athugasemd (fer í krafa_note — ALDREI í athugasemdir, þær prentast á reikninginn);
 *     samtala án vsk / vsk / með vsk.
 *   · Afsláttur: hlutfall félagsins (fyrirtaeki.afslattur_pct) fyllist fyrirfram sem afsláttur á heild; afsláttarhópur
 *     (discount_tiers, sama vél og 296/129) fyllir línu-afslátt eftir flokki. Hvort tveggja er breytanlegt.
 *
 * VISTUN — röð í `solur` eins og kassasala (pos.js), EKKI úttektarreikningur:
 *   source 'vidbot-brunakerfi' · vidskiptategund 'bud' · status 'drog' · greitt_med 'reikningur'
 *   linur í POS-sniðinu {type, desc, qty, unit_price_ex_vat, vsk_pct, ref, product_id}; línu-afsláttur er BAKAÐUR í
 *   einingarverðið (165-venjan: „· −N% afsl.“ aftan á lýsinguna), afslattur = kr m. vsk af HEILDINNI (afsláttur á heild),
 *   samtals = brúttó − afslattur, án-vsk/vsk skalast (VSK tekur afrúnun). Aldrei sömu krónur bæði bakaðar OG í afslattur.
 *   krafa_note byrjar á „Viðbót við brunakerfisskoðun <ár>“ — 488 VidbotUttekt.erVidbot þekkir það forskeyti líka, svo
 *   166/175/199/226/253/311/328 telja söluna ALDREI sem reikning ársins. Nýr uppruni (source) er ekki í
 *   uttekt/slokkvikerfi/brunakerfi/vinnublad-gáttinni í payday-push, svo engin skýrsla hengist við kröfuna.
 *
 * Snertir ALDREI úttektarreikninginn (291/273), skýrsluna né document_pairs. Ekkert sent í Payday — drög, Agnar sendir úr
 * Kröfu yfirliti. Allar stillingar á þjón; aðeins skyndiminni vörulistans í minni (60 s, eins og pos.js).
 *
 * Public: window.VidbotKarfa = { open(coId, opts), erVidbot(num, note), MARKI, SOURCE }
 */
(() => {
  if (window.VidbotKarfa) return;

  const MARKI = 'Viðbót við brunakerfisskoðun ';
  const SOURCE = 'vidbot-brunakerfi';
  const VAT = 24;
  const Z = 2147482050;   // yfir #_bkc-overlay (9300) og app-krómið (#_app-hdr 2147481001) — sjá audit-modal-yfir-appkrom

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SB = () => (window.DB && window.DB.sb) || null;
  const num = v => { const s = String(v == null ? '' : v).replace(/\s/g, '').replace(/\.(?=\d{3}(?:[.,]|$))/g, '').replace(',', '.'); const n = parseFloat(s); return isFinite(n) ? n : 0; };
  const fmtKr = n => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';
  const fmtPct = p => (Math.round(p * 100) / 100).toString().replace('.', ',');
  const toast = (t, bad) => { try { if (window.Toast && Toast.show) return Toast.show(t); } catch (_) {} try { if (window.showToast) showToast(t, !!bad); } catch (_) {} };
  const skra = (kind, detail) => { try { window.logProblem && window.logProblem(kind, detail); } catch (_) {} };
  // Confirm.show (utils.js) teiknar #_cfm-dialog á z-index 100200 — undir körfunni. Lyftum glugganum yfir hana (mælt 02.11.2026:
  // spurningin „Vista sem búðarsölu?" sást ekki, karfan lá ofan á henni og takkinn virtist dauður).
  const confirmUser = msg => {
    if (window.Confirm && Confirm.show) {
      const p = Confirm.show(msg);
      try { const d = document.getElementById('_cfm-dialog'); if (d) d.style.zIndex = String(Z + 10); } catch (_) {}
      return p;
    }
    return Promise.resolve(window.confirm(msg));
  };

  function erVidbot(num, note) { return String(note || '').indexOf(MARKI) === 0; }

  // ── ástand körfunnar (lifir aðeins meðan glugginn er opinn — ósend drög) ────────────────────────────────────────────
  const ST = { coId: null, co: null, year: null, lines: [], pct: 0, note: '', tier: null, busy: false, leit: '' };
  let _vorur = { at: 0, data: [], p: null };

  // ── verðlistinn: þjónusta (273/274 heimildin) ──────────────────────────────────────────────────────────────────────
  function thjonustuListi() {
    try { if (window.BrunakerfiSkyrsla && BrunakerfiSkyrsla.verdlistiMedTegund) return BrunakerfiSkyrsla.verdlistiMedTegund(); } catch (_) {}
    let l = null;
    try { l = window.AppSettings && AppSettings.path && AppSettings.path('brunakerfi_verdlisti'); } catch (_) {}
    if (!l) { try { l = JSON.parse(localStorage.getItem('brunakerfi_verdlisti') || 'null'); } catch (_) {} }   // skyndiminni sem þjónninn endurhleður
    const items = (l && Array.isArray(l.items)) ? l.items : (Array.isArray(l) ? l : []);
    return items.map(x => ({ name: x.name || '', price: num(x.price), link: x.link || '', teg: x.teg === 'vara' ? 'vara' : 'thjonusta' }));
  }
  // ── vörur (vorur.virkt — sama tafla og Sala; nýtum lista Sölunnar sé hann til) ───────────────────────────────────
  function saekjaVorur() {
    try {
      const s = window.POS && POS.getState && POS.getState();
      if (s && ((s.products && s.products.length) || (s.services && s.services.length))) return Promise.resolve((s.products || []).concat(s.services || []));
    } catch (_) {}
    if (_vorur.at && Date.now() - _vorur.at < 60000) return Promise.resolve(_vorur.data);
    if (_vorur.p) return _vorur.p;
    const sb = SB();
    if (!sb) return Promise.resolve(_vorur.data);   // DB.sb er null þar til DB.init() klárast — .from kastar synkrónt (audit-db-null-guard)
    _vorur.p = sb.from('vorur').select('id,nafn,verd_an_vsk,vsk_prosenta,flokkur,virkt').eq('virkt', true).order('nafn').then(r => {
      if (r.error) { skra('vidbotkarfa_vorur_brast', String(r.error.message || '').slice(0, 120)); return _vorur.data; }
      _vorur = { at: Date.now(), data: r.data || [], p: null };
      return _vorur.data;
    }).catch(e => { skra('vidbotkarfa_vorur_brast', String((e && e.message) || e).slice(0, 120)); _vorur.p = null; return _vorur.data; });
    return _vorur.p;
  }

  // ── talnareglur — sama og pos.js (lineUnitEx / totals / bakedLines) ────────────────────────────────────────────────
  const discPct = l => Math.max(0, Math.min(100, num(l && l.disc_pct)));
  const vskPct = l => (l && l.vsk_pct != null && String(l.vsk_pct) !== '') ? num(l.vsk_pct) : VAT;
  const unitEx = l => { const d = discPct(l), b = num(l && l.unit_price_ex_vat); return d > 0 ? Math.round(b * (1 - d / 100)) : b; };
  const lineInc = l => num(l && l.qty) * unitEx(l) * (1 + vskPct(l) / 100);
  function totals() {
    let ex = 0, vsk = 0, fullEx = 0, fullVsk = 0;
    ST.lines.forEach(l => { const v = vskPct(l), q = num(l.qty); const le = q * unitEx(l); ex += le; vsk += le * v / 100; const lf = q * num(l.unit_price_ex_vat); fullEx += lf; fullVsk += lf * v / 100; });
    const pct = Math.max(0, Math.min(100, num(ST.pct)));
    const pctDisc = ex * pct / 100;
    const ad = Math.max(0, ex - pctDisc);
    const av = ex > 0 ? ad * (vsk / ex) : 0;
    const saved = (ex + vsk) - (ad + av);                 // afsláttur á heild, kr m. vsk → solur.afslattur
    const lineSaved = (fullEx + fullVsk) - (ex + vsk);   // línu-afslættir, bakaðir í verðin
    return { ex: ad, vsk: av, total: ad + av, brutto: ex + vsk, saved, lineSaved, discTotal: saved + lineSaved };
  }
  function bakedLines() {
    return ST.lines.map(l => {
      const d = discPct(l);
      const nl = { type: l.type === 'product' ? 'product' : 'service', desc: String(l.desc || '').trim(), qty: num(l.qty), unit_price_ex_vat: num(l.unit_price_ex_vat), vsk_pct: vskPct(l), ref: l.ref || '', product_id: l.product_id == null ? undefined : l.product_id };
      if (d > 0) { nl.unit_price_ex_vat = unitEx(l); nl.desc = nl.desc + ' · −' + fmtPct(d) + '% afsl.'; }
      return nl;
    });
  }

  // ── afsláttarhópur félagsins (sama vél og 296/129) → línu-afsláttur eftir flokki ──────────────────────────────────
  function hopurPct(line) {
    try {
      const E = window.DiscountEngine;
      if (!ST.tier || !E || !E.classifyItem || !E.tierPct) return null;
      const cat = E.classifyItem({ nafn: line.desc, flokkur: line.flokkur, type: line.type });
      return E.tierPct(ST.tier, cat);
    } catch (_) { return null; }
  }

  // ── CSS: Brunastál C (stálplata · stálspjald með málmhaus og hnoðum · reitir · plötur · takkar) ────────────────────
  function injectCSS() {
    if (document.getElementById('_vbk-css')) return;
    const MONO = '"JetBrains Mono",ui-monospace,monospace', SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif', DISPLAY = '"Playfair Display",Georgia,serif';
    const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
    const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
    const PLATE = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
    const RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
    const LINE = 'background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)';
    const REITUR = 'background:#eef1f6;border:1px solid rgba(20,24,34,.14);border-radius:8px;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);color:#141822;font-family:' + SANS + ';font-size:13px;padding:0 10px;height:36px;min-height:0;box-sizing:border-box';
    const BTN = 'height:36px;min-height:0;padding:0 14px;border-radius:4px;font-family:' + SANS + ';font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:7px;cursor:pointer;white-space:nowrap;box-sizing:border-box;line-height:1';
    const P = '#_vbk-ov ';
    const r = (sel, css) => sel.split(',').map(x => P + x.trim()).join(',') + '{' + css + '}';
    const st = document.createElement('style'); st.id = '_vbk-css';
    st.textContent = [
      '#_vbk-ov{position:fixed;inset:0;z-index:' + Z + ';background:rgba(10,12,18,.62);display:none;align-items:flex-start;justify-content:center;padding:3vh 12px;overflow-y:auto;-webkit-overflow-scrolling:touch;font-family:' + SANS + ';color:#16181c}',
      '#_vbk-ov.open{display:flex}',
      '#_vbk-ov *{box-sizing:border-box}',
      'body.appmode #_vbk-ov{zoom:var(--app-krom-zoom,1)}',
      // stálspjaldið sjálft
      r('._vbk-p', 'width:min(1280px,100%);background:#e2e6ec;background-image:' + PLATE + ';border:1px solid #000;border-radius:14px;overflow:hidden;box-shadow:0 30px 60px -20px rgba(0,0,0,.7),0 2px 6px rgba(0,0,0,.3);display:flex;flex-direction:column;max-height:94vh'),
      r('._vbk-hd', 'position:relative;background:' + METAL + ';color:#fff;border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);padding:12px 22px 11px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;flex:none'),
      r('._vbk-hd::before,._vbk-hd::after', 'content:"";position:absolute;width:7px;height:7px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7);top:8px'),
      r('._vbk-hd::before', 'left:8px'), r('._vbk-hd::after', 'right:8px'),
      r('._vbk-t', 'font-family:' + MONO + ';font-size:11.5px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#d9dee6;display:flex;align-items:center;gap:9px;white-space:nowrap'),
      r('._vbk-led', 'width:8px;height:8px;border-radius:50%;display:inline-block;flex:none;background:#f6b545;box-shadow:0 0 0 3px rgba(246,181,69,.18),0 0 12px rgba(246,181,69,.85)'),
      r('._vbk-co', 'font-family:' + DISPLAY + ';font-size:22px;font-weight:700;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1 1 200px'),
      r('._vbk-plata', 'display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12);color:#11141c;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;flex:none'),
      r('._vbk-plata i', 'width:5px;height:5px;border-radius:50%;display:inline-block;background:#8f98a8'),
      r('._vbk-hint', 'font-size:12px;color:#525b6b'),
      r('._vbk-hd ._vbk-hint', 'color:#aeb6c4;flex-basis:100%'),
      // takkar
      r('._vbk-silfur', BTN + ';background:' + SILVER + ';border:1px solid rgba(20,24,34,.16);color:#1f2530;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)'),
      r('._vbk-silfur:hover', 'filter:brightness(.97)'),
      r('._vbk-malmur', BTN + ';background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border:1px solid #000;color:#eef1f4;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45)'),
      r('._vbk-graenn', BTN + ';height:44px;padding:0 20px;font-size:14px;font-weight:700;background:linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%);border:1px solid rgba(52,168,98,.55);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3);text-shadow:0 1px 1px rgba(0,0,0,.55)'),
      r('button[disabled]', 'opacity:.38;pointer-events:none'),
      r('._vbk-plus', 'all:unset;cursor:pointer;flex:none;width:30px;height:30px;border-radius:4px;background:' + SILVER + ';border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1);color:#11141c;font:800 18px/1 ' + SANS + ';display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box'),
      r('._vbk-plus:hover', 'background:linear-gradient(180deg,#fff 0%,#d6dbe4 100%)'),
      r('._vbk-plus:active', 'filter:brightness(.92)'),
      r('._vbk-x', 'all:unset;cursor:pointer;width:26px;height:26px;border-radius:4px;color:#b9c0c9;font:700 15px/1 ' + SANS + ';display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box'),
      r('._vbk-x:hover', 'color:#b42318;background:#fdeeee'),
      // meginmál: tveir dálkar
      r('._vbk-b', 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;padding:14px;overflow:auto;flex:1 1 auto;min-height:0;align-items:start'),
      r('._vbk-k', 'background:#fff;border:1px solid rgba(20,24,34,.16);border-radius:12px;box-shadow:0 2px 6px rgba(0,0,0,.14);overflow:hidden;display:flex;flex-direction:column;min-width:0'),
      r('._vbk-kh', 'background:' + METAL + ';color:#fff;border-bottom:1px solid #000;padding:0 14px;height:40px;display:flex;align-items:center;gap:10px;font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase'),
      r('._vbk-kh .n', 'margin-left:auto;font-family:' + DISPLAY + ';font-size:20px;font-weight:700;letter-spacing:0;text-transform:none'),
      r('._vbk-kb', 'padding:12px;display:flex;flex-direction:column;gap:10px'),
      r('._vbk-leit', REITUR + ';width:100%'),
      r('._vbk-reitur', REITUR),
      r('._vbk-reitur:focus,._vbk-leit:focus', 'outline:none;border-color:rgba(20,24,34,.35)'),
      r('._vbk-merki', 'font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#3a4250;display:flex;align-items:center;gap:8px;padding:0 2px'),
      r('._vbk-merki small', 'font-family:' + SANS + ';font-weight:400;letter-spacing:0;text-transform:none;color:#6b7483;font-size:11.5px'),
      r('._vbk-merki i', 'width:6px;height:6px;border-radius:50%;display:inline-block;flex:none'),
      r('._vbk-merki i.t', 'background:#4f74dc'), r('._vbk-merki i.v', 'background:#b8860b'),
      // verðlistinn: tveir dálkar inni í vinstra spjaldi
      r('._vbk-vl2', 'display:grid;grid-template-columns:1fr 1fr;gap:10px;container-type:inline-size'),
      r('._vbk-vd', 'display:flex;flex-direction:column;gap:6px;min-width:0'),
      r('._vbk-list', 'display:flex;flex-direction:column;gap:4px;max-height:54vh;overflow:auto;padding:2px'),
      // heiti efst (má brotna í tvær línur), verðið í mono undir — plús-takkinn hægra megin; röðin heldur hæð sinni
      r('._vbk-li', LINE + ';display:grid;grid-template-columns:minmax(0,1fr) 30px;grid-template-areas:"nm pl" "pr pl";column-gap:8px;row-gap:1px;align-items:center;min-height:44px;padding:5px 6px 5px 10px;font-size:12.5px;color:#2b313c'),
      r('._vbk-li .nm', 'grid-area:nm;min-width:0;font-weight:600;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical'),
      r('._vbk-li .pr', 'grid-area:pr;font-family:' + MONO + ';font-size:11.5px;color:#1f2530;white-space:nowrap'),
      r('._vbk-li .pr small', 'color:#8a93a3;font-size:10px;margin-left:3px'),
      r('._vbk-li ._vbk-plus', 'grid-area:pl'),
      r('._vbk-tomt', LINE + ';padding:18px 12px;text-align:center;font-size:12.5px;color:#59606c'),
      // karfan: tafla með málmhaus
      r('._vbk-tbl', 'background:#fff;border-radius:8px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);display:flex;flex-direction:column;container-type:inline-size'),
      r('._vbk-th,._vbk-tr', 'display:grid;grid-template-columns:minmax(0,1fr) 54px 92px 54px 56px 96px 28px;gap:6px;align-items:center'),
      r('._vbk-th', 'background:linear-gradient(180deg,#2b2f37,#15171c);color:#eef1f4;font-family:' + MONO + ';font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;padding:0 10px;height:34px;border-bottom:1px solid #000'),
      r('._vbk-th > span:nth-child(n+2)', 'text-align:right'),
      r('._vbk-tr', 'padding:6px 10px;border-bottom:1px solid #edf0f4'),
      r('._vbk-in', 'height:30px;min-height:0;border:1px solid rgba(20,24,34,.14);border-radius:6px;background:#eef1f6;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);font-family:' + MONO + ';font-size:12px;padding:0 6px;text-align:right;width:100%;color:#141822;box-sizing:border-box'),
      r('._vbk-in[data-k="qty"]', 'text-align:center;padding:0 4px'),
      r('._vbk-in[data-k="desc"]', 'font-family:' + SANS + ';font-weight:600;font-size:12.5px;background:#fff;box-shadow:none;border-color:transparent;text-align:left;text-overflow:ellipsis;padding:0 4px'),
      r('._vbk-in[data-k="desc"]:focus', 'border-color:rgba(20,24,34,.3)'),
      r('._vbk-in:focus', 'outline:none'),
      r('._vbk-sum', 'font-family:' + MONO + ';font-size:12px;font-weight:700;color:#11141c;text-align:right;white-space:nowrap'),
      r('._vbk-tf', 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px'),
      r('._vbk-tf ._vbk-hint', 'margin-left:auto'),
      r('._vbk-tempty', 'padding:22px 12px;text-align:center;font-size:12.5px;color:#59606c;font-style:italic'),
      // samtölur og afsláttur
      r('._vbk-undir', 'display:flex;gap:16px;justify-content:flex-end;flex-wrap:wrap;align-items:center;font-family:' + MONO + ';font-size:11.5px;color:#5b6472;padding:0 4px'),
      r('._vbk-undir b', 'color:#1f2530;font-weight:700;margin-left:4px'),
      r('._vbk-undir .afsl b', 'color:#b42318'),
      r('._vbk-pct', 'width:64px;height:28px;min-height:0;border:1px solid rgba(20,24,34,.14);border-radius:4px;background:#eef1f6;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);font:700 12px ' + MONO + ';text-align:right;padding:0 6px;margin:0 2px 0 4px;color:#b42318;box-sizing:border-box'),
      r('._vbk-big', 'display:flex;justify-content:space-between;align-items:center;background:' + METAL + ';border:1px solid #000;border-radius:8px;padding:10px 18px;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);font-family:' + MONO + ';font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase'),
      r('._vbk-big span:last-child', 'font-family:' + DISPLAY + ';font-size:30px;font-weight:800;letter-spacing:0;text-transform:none;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)'),
      r('._vbk-note', REITUR + ';height:auto;min-height:64px;padding:9px 10px;width:100%;resize:vertical;line-height:1.4'),
      r('._vbk-ft', 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px 14px;border-top:1px solid rgba(20,24,34,.12);background:rgba(255,255,255,.4);flex:none'),
      r('._vbk-ft ._vbk-sp', 'flex:1'),
      // þröngt (sími: S26 segist 980 px — stöflum undir 1100)
      '@media (max-width:1100px){' + P + '._vbk-b{grid-template-columns:1fr}' + P + '._vbk-list{max-height:34vh}}',
      '@container (max-width:520px){' + P + '._vbk-vl2{grid-template-columns:1fr}}',
      '@container (max-width:560px){' + P + '._vbk-th,' + P + '._vbk-tr{grid-template-columns:54px 92px 54px 56px minmax(0,1fr) 28px;grid-template-areas:"nm nm nm nm nm nm" "fj pr vs af sm x";row-gap:5px}' +
        ['nm', 'fj', 'pr', 'vs', 'af', 'sm', 'x'].map((a, i) => P + '._vbk-th > :nth-child(' + (i + 1) + '),' + P + '._vbk-tr > :nth-child(' + (i + 1) + '){grid-area:' + a + '}').join('') + '}'
    ].join('\n');
    document.head.appendChild(st);
  }

  // ── glugginn ─────────────────────────────────────────────────────────────────────────────────────────────────────
  function ensure() {
    injectCSS();
    let ov = document.getElementById('_vbk-ov'); if (ov) return ov;
    ov = document.createElement('div'); ov.id = '_vbk-ov';
    ov.innerHTML =
      '<div class="_vbk-p" role="dialog" aria-label="Viðbótarreikningur">' +
        '<header class="_vbk-hd">' +
          '<div class="_vbk-t"><i class="_vbk-led"></i>Viðbótarreikningur</div>' +
          '<div class="_vbk-co" id="_vbk-co"></div>' +
          '<span class="_vbk-plata" id="_vbk-ar"><i></i>Búðarsala</span>' +
          '<button type="button" class="_vbk-silfur" id="_vbk-loka">Loka</button>' +
          '<span class="_vbk-hint">Sjálfstæð búðarsala, óbeint tengd skoðuninni — úttektarreikningur ársins er ósnertur. Vistast sem drög í Kröfu yfirliti.</span>' +
        '</header>' +
        '<div class="_vbk-b">' +
          '<section class="_vbk-k">' +
            '<div class="_vbk-kh">Verðlisti</div>' +
            '<div class="_vbk-kb">' +
              '<input class="_vbk-leit" id="_vbk-leit" type="search" placeholder="Leita í verðlistanum…" autocomplete="off">' +
              '<div class="_vbk-vl2">' +
                '<div class="_vbk-vd"><div class="_vbk-merki"><i class="t"></i>Þjónusta <small id="_vbk-nt"></small></div><div class="_vbk-list" id="_vbk-thj"></div></div>' +
                '<div class="_vbk-vd"><div class="_vbk-merki"><i class="v"></i>Vörur <small id="_vbk-nv"></small></div><div class="_vbk-list" id="_vbk-vor"></div></div>' +
              '</div>' +
            '</div>' +
          '</section>' +
          '<section class="_vbk-k">' +
            '<div class="_vbk-kh">Karfa <span class="n" id="_vbk-kn">0 línur</span></div>' +
            '<div class="_vbk-kb">' +
              '<div class="_vbk-tbl" id="_vbk-tbl"></div>' +
              '<div class="_vbk-undir">' +
                '<span>Án vsk <b id="_vbk-ex">0 kr</b></span>' +
                '<span class="afsl"><label>Afsláttur á heild <input class="_vbk-pct" id="_vbk-pct" inputmode="decimal" placeholder="0" title="Prósenta af heildinni — hlutfall félagsins fyllist fyrirfram"> %</label><b id="_vbk-afsl">0 kr</b></span>' +
                '<span>Vsk <b id="_vbk-vsk">0 kr</b></span>' +
              '</div>' +
              '<div class="_vbk-big"><span>Samtals með vsk</span><span id="_vbk-tot">0 kr</span></div>' +
              '<div class="_vbk-merki">Athugasemd <small>innri — fer í kröfunótu, prentast ekki á reikninginn</small></div>' +
              '<textarea class="_vbk-note" id="_vbk-note" rows="2" placeholder="t.d. skynjari sem gleymdist við skoðun…"></textarea>' +
            '</div>' +
          '</section>' +
        '</div>' +
        '<footer class="_vbk-ft">' +
          '<span class="_vbk-hint" id="_vbk-st"></span>' +
          '<span class="_vbk-sp"></span>' +
          '<button type="button" class="_vbk-silfur" id="_vbk-haetta">Hætta við</button>' +
          '<button type="button" class="_vbk-graenn" id="_vbk-vista">Vista sem búðarsölu</button>' +
        '</footer>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) haetta(); });
    ov.querySelector('#_vbk-loka').addEventListener('click', haetta);
    ov.querySelector('#_vbk-haetta').addEventListener('click', haetta);
    ov.querySelector('#_vbk-vista').addEventListener('click', vista);
    ov.querySelector('#_vbk-leit').addEventListener('input', e => { ST.leit = e.target.value; teiknaVerdlista(); });
    ov.querySelector('#_vbk-pct').addEventListener('input', e => { ST.pct = num(e.target.value); samtolur(); });
    ov.querySelector('#_vbk-note').addEventListener('input', e => { ST.note = e.target.value; });
    // verðlistinn: „+“ (atburðir á ílátinu — listinn er endurteiknaður við leit)
    ov.querySelector('#_vbk-thj').addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (b) baetaVid(JSON.parse(b.getAttribute('data-add'))); });
    ov.querySelector('#_vbk-vor').addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (b) baetaVid(JSON.parse(b.getAttribute('data-add'))); });
    // karfan: innsláttur uppfærir ástandið og summurnar — EKKI endurteikning (Stöðugt viðmót: fókusinn helst)
    const tbl = ov.querySelector('#_vbk-tbl');
    tbl.addEventListener('input', e => {
      const inp = e.target.closest('._vbk-in'); if (!inp) return;
      const i = +inp.closest('[data-i]').getAttribute('data-i'); const l = ST.lines[i]; if (!l) return;
      const k = inp.getAttribute('data-k');
      l[k] = k === 'desc' ? inp.value : inp.value;
      const s = inp.closest('._vbk-tr').querySelector('._vbk-sum'); if (s) s.textContent = fmtKr(lineInc(l));
      samtolur();
    });
    tbl.addEventListener('click', e => {
      const x = e.target.closest('[data-del]'); if (x) { ST.lines.splice(+x.getAttribute('data-del'), 1); teiknaKorfu(); return; }
      const ny = e.target.closest('#_vbk-nylina'); if (ny) { ST.lines.push({ type: 'service', desc: '', qty: 1, unit_price_ex_vat: 0, vsk_pct: VAT, disc_pct: 0, ref: '', product_id: null, fri: true }); teiknaKorfu(); const f = tbl.querySelector('[data-i="' + (ST.lines.length - 1) + '"] [data-k="desc"]'); if (f) f.focus(); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('open')) haetta(); });
    return ov;
  }

  function baetaVid(it) {
    // sama vara aftur → magnið hækkar (eins og addProductLine í pos.js); þjónustulína bætist alltaf við sem ný lína
    if (it.product_id != null) { const ex = ST.lines.find(l => l.product_id === it.product_id && !l.fri); if (ex) { ex.qty = num(ex.qty) + 1; teiknaKorfu(); return; } }
    const l = { type: it.type || 'service', desc: it.desc || '', qty: 1, unit_price_ex_vat: num(it.price), vsk_pct: it.vsk != null ? num(it.vsk) : VAT, disc_pct: 0, ref: '', product_id: it.product_id == null ? null : it.product_id, flokkur: it.flokkur || '' };
    const hp = hopurPct(l); if (hp != null && hp > 0) l.disc_pct = hp;
    ST.lines.push(l);
    teiknaKorfu();
  }

  function teiknaVerdlista() {
    const ov = ensure();
    const q = String(ST.leit || '').trim().toLowerCase();
    const hit = n => !q || String(n || '').toLowerCase().indexOf(q) >= 0;
    const li = (it, pid) => '<div class="_vbk-li"><span class="nm">' + esc(it.desc) + '</span><span class="pr">' + fmtKr(it.price).replace(/ kr$/, '') + '<small>kr án vsk</small></span><button type="button" class="_vbk-plus" data-add="' + esc(JSON.stringify(it)) + '" title="Setja í körfuna" aria-label="Setja í körfuna">+</button></div>';
    const thj = thjonustuListi().filter(x => x.name && hit(x.name)).map(x => ({ type: x.teg === 'vara' ? 'product' : 'service', desc: x.name, price: x.price, vsk: VAT, product_id: null }));
    const vor = (_vorurNu || []).filter(x => x.nafn && hit(x.nafn)).map(x => ({ type: x.flokkur === 'Þjónusta' ? 'service' : 'product', desc: x.nafn, price: num(x.verd_an_vsk), vsk: x.vsk_prosenta != null ? num(x.vsk_prosenta) : VAT, product_id: x.id, flokkur: x.flokkur || '' }));
    ov.querySelector('#_vbk-thj').innerHTML = thj.length ? thj.map(li).join('') : '<div class="_vbk-tomt">' + (q ? 'Ekkert í þjónustulistanum passar.' : 'Verðlistinn er tómur — stilltu hann í Brunakerfis skoðun.') + '</div>';
    ov.querySelector('#_vbk-vor').innerHTML = vor.length ? vor.map(li).join('') : '<div class="_vbk-tomt">' + (q ? 'Engin vara passar.' : (_vorurSott ? 'Engar virkar vörur.' : 'Sæki vörur…')) + '</div>';
    ov.querySelector('#_vbk-nt').textContent = thj.length + ' liðir';
    ov.querySelector('#_vbk-nv').textContent = vor.length + ' vörur';
  }
  let _vorurNu = [], _vorurSott = false;

  function teiknaKorfu() {
    const ov = ensure();
    const tbl = ov.querySelector('#_vbk-tbl');
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(tbl) : null;
    const inp = (i, k, v, extra) => '<input class="_vbk-in" data-k="' + k + '" value="' + esc(v) + '" ' + (extra || '') + '>';
    tbl.innerHTML =
      '<div class="_vbk-th"><span>Lýsing</span><span>Magn</span><span>Verð án vsk</span><span>Vsk %</span><span>Afsl %</span><span>Samtals</span><span></span></div>' +
      (ST.lines.length ? ST.lines.map((l, i) =>
        '<div class="_vbk-tr" data-i="' + i + '">' +
          inp(i, 'desc', l.desc, 'placeholder="Lýsing línu" title="' + (l.product_id != null ? 'Vara #' + esc(l.product_id) : 'Þjónusta') + '"') +
          inp(i, 'qty', l.qty, 'inputmode="decimal"') +
          inp(i, 'unit_price_ex_vat', l.unit_price_ex_vat, 'inputmode="decimal"') +
          inp(i, 'vsk_pct', l.vsk_pct, 'inputmode="decimal"') +
          inp(i, 'disc_pct', l.disc_pct || '', 'inputmode="decimal" placeholder="0"') +
          '<span class="_vbk-sum">' + fmtKr(lineInc(l)) + '</span>' +
          '<button type="button" class="_vbk-x" data-del="' + i + '" title="Taka línuna úr körfunni" aria-label="Taka úr körfu">×</button>' +
        '</div>').join('')
      : '<div class="_vbk-tempty">Karfan er tóm — veldu lið úr verðlistanum eða bættu við frjálsri línu.</div>') +
      '<div class="_vbk-tf"><button type="button" class="_vbk-silfur" id="_vbk-nylina">+ Ný lína</button><span class="_vbk-hint">Línu-afsláttur bakast í einingarverðið; afsláttur á heild fer í afslattur.</span></div>';
    if (aftur) aftur();
    ov.querySelector('#_vbk-kn').textContent = ST.lines.length + (ST.lines.length === 1 ? ' lína' : ' línur');
    samtolur();
  }

  function samtolur() {
    const ov = ensure(); const t = totals();
    ov.querySelector('#_vbk-ex').textContent = fmtKr(t.ex);
    ov.querySelector('#_vbk-vsk').textContent = fmtKr(t.vsk);
    ov.querySelector('#_vbk-afsl').textContent = (t.discTotal > 0 ? '−' : '') + fmtKr(t.discTotal);
    ov.querySelector('#_vbk-tot').textContent = fmtKr(t.total);
    ov.querySelector('#_vbk-vista').disabled = !ST.lines.length || ST.busy;
  }

  // ── opna / loka ──────────────────────────────────────────────────────────────────────────────────────────────────
  async function open(coId, opts) {
    opts = opts || {};
    const ov = ensure();
    ST.coId = +coId || null; ST.co = opts.co || null; ST.year = opts.year || new Date().getFullYear();
    ST.lines = []; ST.pct = 0; ST.note = ''; ST.tier = null; ST.busy = false; ST.leit = '';
    ov.querySelector('#_vbk-leit').value = ''; ov.querySelector('#_vbk-note').value = ''; ov.querySelector('#_vbk-pct').value = '';
    ov.querySelector('#_vbk-co').textContent = (ST.co && ST.co.nafn) || '';
    ov.querySelector('#_vbk-ar').innerHTML = '<i></i>Búðarsala · ' + esc(ST.year);
    ov.querySelector('#_vbk-st').textContent = 'Sæki félagið…';
    ov.classList.add('open');
    teiknaVerdlista(); teiknaKorfu();
    // félagið: nafn, kt, greiðandi, afsláttur, afsláttarhópur — lesið FERSKT af þjóni (aldrei sala án kennitölu úr gömlu minni)
    const sb = SB();
    if (!sb || !ST.coId) { ov.querySelector('#_vbk-st').textContent = 'Engin gagnagrunnstenging — ekki hægt að vista.'; ov.querySelector('#_vbk-vista').disabled = true; return; }
    try {
      const cr = await sb.from('fyrirtaeki').select('id,nafn,kennitala,customer_base_id,afslattur_pct,discount_tier_id').eq('id', ST.coId).maybeSingle();
      if (cr.error) throw cr.error;
      if (!cr.data) throw new Error('fyrirtæki ' + ST.coId + ' fannst ekki');
      ST.co = Object.assign({}, ST.co || {}, cr.data);
      ov.querySelector('#_vbk-co').textContent = ST.co.nafn || '';
      ST.pct = Math.max(0, Math.min(100, num(ST.co.afslattur_pct)));
      ov.querySelector('#_vbk-pct').value = ST.pct > 0 ? fmtPct(ST.pct) : '';
      if (ST.co.discount_tier_id != null) {
        const tr = await sb.from('discount_tiers').select('*').eq('id', ST.co.discount_tier_id).maybeSingle();
        if (tr.error) skra('vidbotkarfa_tier_brast', 'co ' + ST.coId + ': ' + String(tr.error.message || '').slice(0, 100));
        else if (tr.data && tr.data.virkt !== false) ST.tier = tr.data;
      }
      ov.querySelector('#_vbk-st').textContent = (ST.co.kennitala ? 'Kt. ' + ST.co.kennitala : 'Engin kennitala skráð') +
        (ST.pct > 0 ? ' · ' + fmtPct(ST.pct) + ' % afsláttur félagsins' : '') + (ST.tier ? ' · afsláttarhópur ' + (ST.tier.nafn || ST.tier.name || ST.tier.id) : '');
      samtolur();
    } catch (e) {
      skra('vidbotkarfa_fyrirtaeki_brast', 'co ' + ST.coId + ': ' + String((e && e.message) || e).slice(0, 120));
      ov.querySelector('#_vbk-st').textContent = 'Gat ekki lesið félagið: ' + ((e && e.message) || e) + ' — ekki hægt að vista.';
      ST.co = null; samtolur(); ov.querySelector('#_vbk-vista').disabled = true;
    }
    _vorurSott = false;
    saekjaVorur().then(v => { _vorurNu = v || []; _vorurSott = true; if (ov.classList.contains('open')) teiknaVerdlista(); });
  }
  function loka() { const ov = document.getElementById('_vbk-ov'); if (ov) ov.classList.remove('open'); }
  async function haetta() {
    if (ST.busy) return;
    if (ST.lines.length && !(await confirmUser('Henda körfunni? Ekkert hefur verið vistað.'))) return;
    ST.lines = []; loka();
  }

  // ── vistun: EIN röð í solur, drög, búðarsala — aldrei úttektarreikningur ──────────────────────────────────────────
  async function vista() {
    if (ST.busy) return;
    const ov = ensure();
    const sb = SB();
    if (!sb) return toast('Engin gagnagrunnstenging — ekkert vistað', true);
    if (!ST.co || !ST.co.id) return toast('Félagið náðist ekki — ekkert vistað', true);
    if (!ST.lines.length) return toast('Karfan er tóm', true);
    const tomar = ST.lines.filter(l => !String(l.desc || '').trim());
    if (tomar.length) { toast('Lýsingu vantar á ' + tomar.length + (tomar.length === 1 ? ' línu' : ' línur'), true); const f = ov.querySelector('[data-i="' + ST.lines.indexOf(tomar[0]) + '"] [data-k="desc"]'); if (f) f.focus(); return; }
    if (ST.lines.some(l => num(l.qty) <= 0)) return toast('Magn verður að vera stærra en 0', true);
    const t = totals();
    const linur = bakedLines();
    const samtals = Math.round(t.total), ex = Math.round(t.ex), vsk = samtals - ex;   // VSK tekur afrúnun svo ex + vsk === samtals (pos.js-reglan)
    const afsl = Math.max(0, Math.round(t.brutto) - samtals);
    const ok = await confirmUser('Vista sem búðarsölu (drög) á ' + (ST.co.nafn || '') + '?\n\n' + linur.length + (linur.length === 1 ? ' lína · ' : ' línur · ') + fmtKr(samtals) + ' með vsk' + (afsl > 0 ? ' (afsláttur ' + fmtKr(afsl) + ')' : '') + '\n\nÚttektarreikningur ársins er ósnertur. Salan fer sem drög í Kröfu yfirlit — ekkert er sent.');
    if (!ok) return;
    ST.busy = true; samtolur(); ov.querySelector('#_vbk-st').textContent = 'Vista…';
    const ktd = String(ST.co.kennitala || '').replace(/\D/g, '');
    const kt = ktd.length === 10 ? ktd.slice(0, 6) + '-' + ktd.slice(6) : (ST.co.kennitala || null);
    const note = String(ST.note || '').trim();
    const row = {
      customer_nafn: ST.co.nafn || '', customer_id: ST.co.id, customer_kt: kt || null, customer_base_id: ST.co.customer_base_id || null,
      starfsmadur: 'Kassi', linur,
      upphaed_an_vsk: ex, vsk_upphaed: vsk, afslattur: afsl, samtals,
      greitt_med: 'reikningur', status: 'drog', source: SOURCE, vidskiptategund: 'bud',
      // innri texti fer í krafa_note (Kröfu yfirlit sýnir hana), ALDREI í athugasemdir — þær prentast á reikninginn (05.10.2026)
      krafa_note: MARKI + ST.year + (note ? ' · ' + note : ''),
      athugasemdir: ''
    };
    const ins = await sb.from('solur').insert(row).select('id,num,samtals,status').single();
    ST.busy = false;
    if (ins.error) {
      skra('vidbotkarfa_vistun_brast', 'co ' + ST.co.id + ': ' + String(ins.error.message || '').slice(0, 140));
      ov.querySelector('#_vbk-st').textContent = 'Vistaðist ekki: ' + (ins.error.message || '') + ' — karfan stendur óbreytt.';
      samtolur();
      return toast('Búðarsalan vistaðist ekki: ' + (ins.error.message || ''), true);
    }
    const sala = ins.data;
    // Gikkurinn trg_vidskiptategund (set_vidskiptategund) yfirskrifar tegundina við INSERT eftir source/greitt_med — óþekktur
    // uppruni → 'ovisst' (mælt 02.11.2026 á R-001243). Við UPDATE virðir hann skýra breytingu, svo tegundin er sett hér á eftir.
    const up = await sb.from('solur').update({ vidskiptategund: 'bud' }).eq('id', sala.id).select('vidskiptategund').single();
    if (up.error || !up.data || up.data.vidskiptategund !== 'bud') {
      skra('vidbotkarfa_tegund_brast', sala.num + ': ' + ((up.error && up.error.message) || ('tegund ' + (up.data && up.data.vidskiptategund))).slice(0, 120));
      toast('Salan ' + (sala.num || '') + ' vistaðist en merktist ekki sem búðarsala — merktu hana í Bókhalds yfirliti', true);
    }
    ST.lines = []; loka();
    toast('Búðarsala ' + (sala.num || '') + ' vistuð sem drög — ' + fmtKr(sala.samtals) + ' · í Kröfu yfirliti');
    try { document.dispatchEvent(new CustomEvent('vidbot-karfa:vistad', { detail: { coId: ST.co.id, sala } })); } catch (_) {}
    try { if (window.BrunakerfiFyrirtaeki && BrunakerfiFyrirtaeki.reload) BrunakerfiFyrirtaeki.reload(); } catch (_) {}
  }

  window.VidbotKarfa = { open, erVidbot, MARKI, SOURCE };
})();
