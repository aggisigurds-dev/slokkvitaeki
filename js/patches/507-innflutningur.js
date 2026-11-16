/* === INNFLUTNINGUR (507, 16.11.2026) — flipi í Birgðum ==============================================================
 *
 * Agnar 16.11.2026 (skjáskot af Birgðum): „Mátt síðan gera nýjan flipa þarna um innfluttning og útreikninginn á öllu
 * innfluttu sem við síðan uppfærum við núverandi birgðir."
 *
 * Hver innflutt sending (t.d. sending frá erlendum birgja) er skráð einu sinni: vörulínur (magn × einingaverð í erlendri
 * mynt), það sem var greitt í krónum, og kostnaðarliðir (flutningur, úrvinnslugjald, tollur, VSK við innflutning).
 * Útreikningurinn skiptir kostnaðinum á vörurnar og segir kostnaðarverð á stykki. „Færa í birgðir" skrifar það á
 * vörurnar (sama kaupverð og Birgðir, Vörur og þjónusta og Sala sýna) og, ef valið er, bætir magninu á lagerinn.
 *
 * Gögn: /api/innflutningur (netlify/functions/innflutningur.cjs, starfsmannahlið). Útreikningurinn býr ÞAR
 * (_innflutningur-reikna.cjs) — síðan sýnir aðeins það sem þjónninn reiknaði, svo talan á skjánum er talan sem fer á
 * vöruna. Undantekning: vegið meðaltal í vali færslunnar er sýnt hér til viðmiðunar; áður en nokkuð er skrifað
 * forskoðar þjónninn færsluna og staðfestingin sýnir HANS tölur.
 *
 * Samstillt milli véla: sendingin vistast á þjóninum við hverja breytingu (change), og þjónninn hafnar vistun ef önnur
 * vél breytti á meðan (409 → nýjasta útgáfan birtist). Val í færsluhlutanum er ósend drög og lifir aðeins hér.
 * Stöðugt viðmót: meðan skrifað er í reit uppfærast aðeins tölurnar; heildarteikning bíður þar til fókus fer út.
 * Útlit: Brunastál C (stálplata, stálspjald með hnoðuðum málmhaus, reitir, plötur, tafla C) — sjá 413.
 * ================================================================================================================== */
(() => {
  if (window.Innflutningur) return;

  const API = '/api/innflutningur';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m) => { try { window.Toast && Toast.show(m); } catch (_) {} };

  // ── Snið ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  const thus = (n) => { const s = String(Math.abs(Math.round(n))); return (n < 0 ? '−' : '') + s.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  const kr = (n) => (n == null || !Number.isFinite(Number(n)) ? '—' : thus(Number(n)) + ' kr');
  const aukastafir = (n, d) => {
    if (n == null || n === '' || !Number.isFinite(Number(n))) return '';
    const [h, a] = Number(n).toFixed(d).split('.');
    return thus(Number(h)) + (a ? ',' + a : '');
  };
  const pct = (x) => (Number(x) * 100).toFixed(1).replace('.', ',') + ' %';
  const dags = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'; };
  const stund = (iso) => { try { const d = new Date(iso); const p = (x) => String(x).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} kl. ${p(d.getHours())}:${p(d.getMinutes())}`; } catch (_) { return ''; } };
  const stk = (n) => thus(n) + ' stk';
  // Reitagildi: krónur með þúsundapunktum, erlend verð með tveimur aukastöfum, magn heilt.
  const reitKr = (v) => (v == null || v === '' ? '' : typeof v === 'number' ? thus(v) : String(v));
  const reitErl = (v) => (v == null || v === '' ? '' : typeof v === 'number' ? aukastafir(v, 2) : String(v));
  const reitMagn = (v) => (v == null || v === '' ? '' : typeof v === 'number' ? String(v) : String(v));
  const reitGengi = (v) => (v == null || v === '' ? '' : typeof v === 'number' ? aukastafir(v, 2) : String(v));

  // ── Ástand ───────────────────────────────────────────────────────────────────────────────────────────────────────
  let _gogn = null;          // { sendingar, vorur }
  let _loadP = null;         // EIN sókn þótt margir kalli
  let _villa = null;         // { texti, innskraning }
  let _rot = null;           // hnúturinn sem 36 lét okkur fá
  let _opid = null;          // id opinnar sendingar
  let _drog = null;          // breytanleg afrit opinnar sendingar
  let _vistar = false, _aftur = false;   // ein vistun í einu; nýjasta staðan fer á eftir
  let _bidur = false;        // heildarteikning bíður þess að fókus fari út
  let _vinnur = false;       // færsla / afturköllun í gangi
  const _val = {};           // { [sendingId]: { [vara_id]: { kaupverd, baeta } } } — ósend drög
  let _omaeltOk = {};        // { [sendingId]: true } — hakað „færa samt"

  async function api(method, body) {
    const r = await fetch(API, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    let d = null;
    try { d = await r.json(); } catch (_) { d = null; }
    return { ok: r.ok, status: r.status, d: d || {} };
  }

  function hlada(endurnyja) {
    if (_loadP && !endurnyja) return _loadP;
    _loadP = (async () => {
      try {
        const { ok, status, d } = await api('GET');
        if (status === 401) { _villa = { texti: 'Innskráning starfsmanns vantar til að sjá innflutning.', innskraning: true }; return; }
        if (!ok) { _villa = { texti: d.error || `Náði ekki í innflutning (${status})` }; return; }
        _villa = null;
        _gogn = { sendingar: d.sendingar || [], vorur: d.vorur || [] };
        if (_opid == null || !_gogn.sendingar.some((s) => s.id === _opid)) _opid = _gogn.sendingar.length ? _gogn.sendingar[0].id : null;
        _drog = null;
        merkjaFjolda();
      } catch (e) {
        _villa = { texti: 'Náði ekki í innflutning: ' + (e && e.message ? e.message : e) };
      }
    })();
    return _loadP;
  }

  function merkjaFjolda() {
    const n = document.getElementById('innf-ham-n');
    if (n && _gogn) n.textContent = String(_gogn.sendingar.length);
  }

  const opin = () => (_gogn ? _gogn.sendingar.find((s) => s.id === _opid) || null : null);
  const vara = (id) => (_gogn ? _gogn.vorur.find((v) => v.id === Number(id)) : null);
  function drog() {
    const s = opin();
    if (!s) return null;
    if (!_drog || _drog.id !== s.id) {
      _drog = JSON.parse(JSON.stringify({ id: s.id, updated_at: s.updated_at, tilvisun: s.tilvisun, birgir: s.birgir, land: s.land, mynt: s.mynt,
        gengi: s.gengi == null ? null : Number(s.gengi), vorur_isk: s.vorur_isk == null ? null : Number(s.vorur_isk), skipting: s.skipting, dags: s.dags,
        athugasemd: s.athugasemd, linur: s.linur || [], kostnadur: s.kostnadur || [] }));
    }
    return _drog;
  }
  function setjaSendingu(ny) {
    if (!_gogn || !ny) return;
    const i = _gogn.sendingar.findIndex((s) => s.id === ny.id);
    if (i >= 0) _gogn.sendingar[i] = ny; else _gogn.sendingar.unshift(ny);
    merkjaFjolda();
  }

  // ── CSS (Brunastál C, sömu tákn og 413) ─────────────────────────────────────────────────────────────────────────
  function stilar() {
    if (document.getElementById('_innf-css')) return;
    if (!document.getElementById('_tbm-font') && !document.getElementById('_innf-font')) {
      const lf = document.createElement('link');
      lf.id = '_innf-font'; lf.rel = 'stylesheet';
      lf.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap';
      document.head.appendChild(lf);
    }
    const MONO = '"JetBrains Mono",ui-monospace,monospace', SANS = '"IBM Plex Sans",system-ui,sans-serif', DISPLAY = '"Playfair Display",Georgia,serif';
    const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
    const STAL_IMG = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
    const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
    // Fjögur gervi-auðkenni: appham blæs upp takka og reiti með !important (gildra 3 í Brunastáli C).
    const V = '#view-birgdir:not(#_innf1):not(#_innf2):not(#_innf3):not(#_innf4) .innf';
    const css = [
      `${V}{font-family:${SANS};color:#141822;min-height:480px}`,
      `${V} *{box-sizing:border-box}`,
      `${V}-plata{background-color:#e2e6ec;background-image:${STAL_IMG};border:1px solid #000;border-radius:14px;box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 10px 28px -10px rgba(10,14,22,.45);padding:12px 12px 16px;display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0}`,
      `${V}-spjald{background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);overflow:hidden;min-width:0}`,
      `${V}-haus{position:relative;background:${METAL};min-height:46px;padding:5px 16px 5px 20px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);border-bottom:1px solid #000}`,
      `${V}-haus::before,${V}-haus::after{content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7)}`,
      `${V}-haus::before{left:7px}${V}-haus::after{right:7px}`,
      `${V}-titill{font-size:15px;font-weight:600;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.6);letter-spacing:.01em}`,
      `${V}-titill b{font-family:${MONO};font-weight:700}`,
      `${V}-tala{font-family:${DISPLAY};font-weight:800;font-size:30px;line-height:1;color:#fff;font-variant-numeric:lining-nums;margin-left:auto;white-space:nowrap}`,
      `${V}-tala span{font-size:15px;font-weight:700;margin-left:6px;color:#c9ced8}`,
      `${V}-bukur{padding:12px 14px 14px;display:grid;grid-template-columns:minmax(0,1fr);gap:14px;min-width:0}`,
      `${V}-merki{font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#3a4250;margin:0 0 6px}`,
      `${V}-plate{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:${SILVER};box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12);font-family:${MONO};font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1f2530;white-space:nowrap}`,
      `${V}-plate--dokk{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border-color:#000;color:#eef1f4}`,
      `${V}-plate i{width:7px;height:7px;border-radius:50%;background:#8f98a8;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}`,
      `${V}-plate--faert i{background:#16a34a}${V}-plate--drog i{background:#d29a1e}`,
      // Takkar: silfur (sjálfgefinn), málmur (hlutlaus/Vista), rautt (eina aðalaðgerðin), grænn (áfram: Færa í birgðir)
      `${V} button{font-family:${SANS}!important;cursor:pointer}`,
      `${V}-btn{height:36px!important;min-height:36px!important;padding:0 14px!important;border-radius:9px!important;font-size:13px!important;font-weight:600!important;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;background:${SILVER};border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530}`,
      `${V}-btn:hover{filter:brightness(1.04)}${V}-btn:focus-visible{outline:2px solid #b42318;outline-offset:2px}`,
      `${V}-btn--malmur{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);color:#eef1f4}`,
      `${V}-btn--rautt{background:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%);border:1px solid rgba(190,32,28,.55);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 8px rgba(0,0,0,.45)}`,
      `${V}-btn--graent{height:44px!important;min-height:44px!important;font-size:14px!important;font-weight:700!important;padding:0 18px!important;border-radius:10px!important;border:1px solid rgba(52,168,98,.55);background:linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3)}`,
      `${V}-btn--litill{height:30px!important;min-height:30px!important;width:30px!important;padding:0!important;justify-content:center;border-radius:6px!important}`,
      `${V}-btn[disabled]{opacity:.38;pointer-events:none}`,
      `${V}-haus .innf-btn{margin-left:0}`,
      // Reitir
      `${V}-reitir{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(170px,100%),1fr));gap:10px}`,
      `${V}-reitir label{min-width:0}`,
      `${V}-reitir label{display:grid;gap:4px;font-size:11px;font-weight:600;color:#3a4250;letter-spacing:.02em}`,
      `${V} input,${V} select,${V} textarea{background:#eef1f6;border:1px solid rgba(20,24,34,.14);border-radius:8px;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);padding:0 10px!important;font-size:13px!important;color:#141822;min-height:40px!important;height:40px!important;font-family:${SANS};width:100%;min-width:0}`,
      `${V} textarea{height:auto!important;min-height:64px!important;padding:8px 10px!important;resize:vertical;line-height:1.45}`,
      `${V} input:focus,${V} select:focus,${V} textarea:focus{outline:2px solid #b42318;outline-offset:1px;background:#fff}`,
      `${V} input.innf-tal{font-family:${MONO};text-align:right}`,
      `${V}-tafla input,${V}-tafla select{height:34px!important;min-height:34px!important;font-size:12.5px!important}`,
      // Rofi (skipting / kaupverðsval): dökkur bakki, valið = silfur
      `${V}-rofi{display:inline-flex;gap:3px;background:#1c1e23;border:1px solid #000;border-radius:9px;padding:3px;box-shadow:inset 0 2px 4px rgba(0,0,0,.5)}`,
      `${V}-rofi button{height:32px!important;min-height:32px!important;padding:0 11px!important;border:0;border-radius:6px!important;background:transparent;color:#c9ced8;font-size:12px!important;font-weight:600!important;white-space:nowrap}`,
      `${V}-rofi button[aria-pressed="true"]{background:${SILVER};color:#141822;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)}`,
      // Tafla C
      `${V}-umbudir{overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)}`,
      // Taflan fyllir alltaf hólfið (eldri reglur setja display:block / lágmarksbreidd). Hausröðin er ljós eins og í
      // listasíðum Brunastáls C — ákveðin hér, svo almenna thead-reglan ráði ekki hálfu útlitinu.
      `${V}-tafla{width:100%!important;min-width:0!important;display:table!important;border-collapse:separate;border-spacing:0;background:#fff;font-size:13px}`,
      `${V}-tafla thead th{background:#eef1f6!important;color:#3a4250!important;font-family:${MONO}!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.08em;text-transform:uppercase;text-align:left;padding:9px 8px!important;white-space:nowrap;border-bottom:1px solid #d5dbe4}`,
      `${V}-tafla th.t,${V}-tafla td.t{text-align:right}`,
      `${V}-tafla td{padding:6px 8px;border-top:1px solid #e4e8ef;vertical-align:middle}`,
      `${V}-tafla td.t{font-family:${MONO};font-size:12px;white-space:nowrap}`,
      `${V}-tafla td.kv{font-weight:700;color:#141822}`,
      `${V}-tafla tr.innf-rod{cursor:pointer}${V}-tafla tr.innf-rod:hover td{background:#f4f6f9}`,
      `${V}-tafla tr.innf-rod[aria-current="true"] td{background:#eef1f6}`,
      `${V}-tafla tr.innf-rod:focus-visible{outline:2px solid #b42318;outline-offset:-2px}`,
      `${V}-daufur{color:#5b6472;font-size:11px;font-weight:500}`,
      `${V}-nafn{font-weight:700}`,
      `${V}-mono{font-family:${MONO}}`,
      `${V}-undir{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}`,
      // Samtölur og málmbandið
      `${V}-samt{display:flex;flex-wrap:wrap;gap:6px 18px;justify-content:flex-end;font-family:${MONO};font-size:12.5px;color:#3a4250}`,
      `${V}-samt b{color:#141822}`,
      `${V}-band{background:${METAL};border:1px solid #000;border-radius:10px;padding:10px 16px;display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;color:#c9ced8;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}`,
      `${V}-band .innf-tala{font-size:28px}`,
      `${V}-band-merki{font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}`,
      // Viðvaranir: frátekið pláss, svo ekkert hoppar þegar þær koma og fara
      `${V}-vantar{min-height:22px;display:flex;flex-wrap:wrap;gap:6px}`,
      `${V}-vantar span{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:3px;background:#fff4e0;border:1px solid #e0a93e;color:#845400;font-size:11.5px;font-weight:600}`,
      `${V}-villa{background:#fff;border:1px solid #b42318;border-radius:10px;padding:14px 16px;color:#b42318;font-weight:600}`,
      `${V}-tomt{padding:18px 16px;color:#3a4250}`,
      `${V}-beinagrind{height:46px;border-radius:12px;background:${METAL};opacity:.85}`,
      `${V}-beinagrind--hvit{height:360px;background:#fff;border:1px solid #000;opacity:1}`,
      `${V}-saga{font-size:12px;color:#3a4250;display:grid;gap:3px}`,
      `${V}-saga span{font-family:${MONO}}`,
      `${V}-hak{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;min-height:32px;cursor:pointer}`,
      `${V}-hak input{width:18px!important;height:18px!important;min-height:18px!important;padding:0!important;box-shadow:none;accent-color:#16783f}`,
      `@media (max-width:640px){${V}-bukur{padding:10px}${V}-haus{padding:5px 14px 5px 18px}${V}-tala{font-size:24px}}`,
    ].join('\n');
    const s = document.createElement('style');
    s.id = '_innf-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── Teikning ─────────────────────────────────────────────────────────────────────────────────────────────────────
  function beinagrind() {
    return '<div class="innf"><div class="innf-plata"><div class="innf-beinagrind"></div><div class="innf-beinagrind innf-beinagrind--hvit"></div></div></div>';
  }

  function plataStodu(s) {
    return s.stada === 'faert'
      ? '<span class="innf-plate innf-plate--faert"><i aria-hidden="true"></i>Fært í birgðir</span>'
      : '<span class="innf-plate innf-plate--drog"><i aria-hidden="true"></i>Drög</span>';
  }

  function listiHtml() {
    const ss = _gogn.sendingar;
    const rodir = ss.map((s) => {
      const r = s.reikningur || {};
      const cur = s.id === _opid;
      return `<tr class="innf-rod" tabindex="0" role="button" aria-current="${cur}" data-opna="${s.id}" aria-label="Opna sendingu ${esc(s.tilvisun)}">
        <td><span class="innf-nafn innf-mono">${esc(s.tilvisun)}</span><div class="innf-daufur">${esc(s.birgir || 'Birgi vantar')}${s.land ? ' · ' + esc(s.land) : ''}</div></td>
        <td class="t">${dags(s.dags)}</td>
        <td class="t">${stk(r.magn || 0)}</td>
        <td class="t kv" data-r="listi-${s.id}">${kr(r.heild)}</td>
        <td>${plataStodu(s)}</td></tr>`;
    }).join('');
    return `<div class="innf-spjald">
      <div class="innf-haus"><span class="innf-titill">Sendingar</span><span class="innf-plate innf-plate--dokk">${ss.length}</span>
        <span style="margin-left:auto"></span><button type="button" class="innf-btn innf-btn--rautt" data-adgerd="ny">+ Ný sending</button></div>
      ${ss.length ? `<div class="innf-umbudir" style="border-radius:0;box-shadow:none"><table class="innf-tafla"><thead><tr>
        <th>Sending</th><th class="t">Dagsetning</th><th class="t">Magn</th><th class="t">Kostnaðarverð alls</th><th>Staða</th></tr></thead><tbody>${rodir}</tbody></table></div>`
        : '<div class="innf-tomt">Engar sendingar skráðar. „+ Ný sending" stofnar fyrstu drögin.</div>'}
    </div>`;
  }

  function vorurValkostir(valid) {
    const vv = _gogn.vorur.slice().sort((a, b) => (a.flokkur === 'Slökkvitæki' ? 0 : 1) - (b.flokkur === 'Slökkvitæki' ? 0 : 1)
      || String(a.flokkur || '').localeCompare(String(b.flokkur || ''), 'is') || String(a.nafn).localeCompare(String(b.nafn), 'is'));
    let html = `<option value="">Ekki tengd vöru</option>`;
    let flokkur = null;
    vv.forEach((v) => {
      if (v.flokkur !== flokkur) { if (flokkur !== null) html += '</optgroup>'; flokkur = v.flokkur; html += `<optgroup label="${esc(flokkur || 'Annað')}">`; }
      html += `<option value="${v.id}"${Number(valid) === v.id ? ' selected' : ''}>${esc(v.nafn)}</option>`;
    });
    if (flokkur !== null) html += '</optgroup>';
    return html;
  }

  function sendingHtml() {
    const s = opin();
    if (!s) return '';
    const d = drog();
    const r = s.reikningur || {};
    const laest = s.stada === 'faert';
    const dis = laest ? ' disabled' : '';
    const mynt = esc(d.mynt || 'EUR');

    const grunnur = `<div><div class="innf-merki">Sendingin</div><div class="innf-reitir">
      <label>Tilvísun<input data-f="tilvisun" value="${esc(d.tilvisun)}"${dis}></label>
      <label>Birgir<input data-f="birgir" value="${esc(d.birgir || '')}"${dis}></label>
      <label>Land<input data-f="land" value="${esc(d.land || '')}"${dis}></label>
      <label>Tollafgreiðsludagur<input type="date" data-f="dags" value="${esc(d.dags || '')}"${dis}></label>
      <label>Mynt<input data-f="mynt" value="${mynt}" maxlength="8"${dis}></label>
      <label>Gengi (kr á ${mynt})<input class="innf-tal" inputmode="decimal" data-f="gengi" value="${esc(reitGengi(d.gengi))}" placeholder="t.d. 144,20"${dis}></label>
      <label>Greitt fyrir vörur (kr)<input class="innf-tal" inputmode="decimal" data-f="vorur_isk" value="${esc(reitKr(d.vorur_isk))}" placeholder="línur × gengi"${dis}></label>
      <label>Skipting kostnaðar<span class="innf-rofi" role="group" aria-label="Skipting kostnaðar">
        <button type="button" data-skipting="verd" aria-pressed="${d.skipting !== 'fjoldi'}"${dis}>Eftir verði</button>
        <button type="button" data-skipting="fjoldi" aria-pressed="${d.skipting === 'fjoldi'}"${dis}>Eftir fjölda</button></span></label>
    </div></div>`;

    const linur = (d.linur || []).map((l, i) => {
      const rl = (r.linur || [])[i] || {};
      const v = vara(l.vara_id);
      return `<tr>
        <td style="min-width:200px"><select data-f="linur.${i}.vara_id" aria-label="Vara í línu ${i + 1}"${dis}>${vorurValkostir(l.vara_id)}</select></td>
        <td style="min-width:150px"><input data-f="linur.${i}.heiti" value="${esc(l.heiti || '')}" placeholder="Heiti á reikningi" aria-label="Heiti í línu ${i + 1}"${dis}></td>
        <td style="width:84px"><input class="innf-tal" inputmode="numeric" data-f="linur.${i}.magn" value="${esc(reitMagn(l.magn))}" aria-label="Magn í línu ${i + 1}"${dis}></td>
        <td style="width:104px"><input class="innf-tal" inputmode="decimal" data-f="linur.${i}.einingaverd" value="${esc(reitErl(l.einingaverd))}" aria-label="Einingaverð í línu ${i + 1}"${dis}></td>
        <td class="t" data-r="l${i}-isk">${kr(rl.vorur_isk)}</td>
        <td class="t" data-r="l${i}-alag">${kr(rl.alag)}</td>
        <td class="t kv" data-r="l${i}-kv">${kr(rl.kostnadarverd)}</td>
        <td class="t">${v ? kr(v.kostnadarverd) : '—'}</td>
        <td class="t">${v && v.birgdir != null ? thus(v.birgdir) : '—'}</td>
        <td>${laest ? '' : `<button type="button" class="innf-btn innf-btn--litill" data-adgerd="eyda-linu" data-i="${i}" title="Eyða línu ${i + 1}" aria-label="Eyða línu ${i + 1}">${X}</button>`}</td></tr>`;
    }).join('');

    const vorurTafla = `<div><div class="innf-merki">Vörur</div><div class="innf-umbudir"><table class="innf-tafla"><thead><tr>
      <th>Vara</th><th>Heiti á reikningi</th><th class="t">Magn</th><th class="t">Verð (${mynt})</th><th class="t">Í krónum</th>
      <th class="t" title="Hlutur línunnar í flutningi og gjöldum">Kostnaður</th><th class="t">Kostnaðarverð / stk</th>
      <th class="t" title="Kaupverð vörunnar í Birgðum núna">Kaupverð núna</th><th class="t">Á lager</th><th></th></tr></thead>
      <tbody>${linur || `<tr><td colspan="10" class="innf-daufur" style="padding:12px">Engar línur enn.</td></tr>`}</tbody></table></div>
      ${laest ? '' : '<div class="innf-undir"><button type="button" class="innf-btn" data-adgerd="ny-lina">+ Lína</button></div>'}</div>`;

    const kostn = (d.kostnadur || []).map((k, i) => `<tr>
      <td style="min-width:240px"><input data-f="kostnadur.${i}.heiti" value="${esc(k.heiti || '')}" placeholder="t.d. Flutningur" aria-label="Kostnaðarliður ${i + 1}"${dis}></td>
      <td style="width:150px"><input class="innf-tal" inputmode="decimal" data-f="kostnadur.${i}.upphaed" value="${esc(reitKr(k.upphaed))}" placeholder="ómælt" aria-label="Upphæð kostnaðarliðar ${i + 1}"${dis}></td>
      <td style="width:230px"><select data-f="kostnadur.${i}.tegund" aria-label="Tegund kostnaðarliðar ${i + 1}"${dis}>
        <option value="kostnadur"${k.tegund === 'kostnadur' || !k.tegund ? ' selected' : ''}>Á kostnaðarverð</option>
        <option value="innskattur"${k.tegund === 'innskattur' ? ' selected' : ''}>VSK — innskattur</option>
        <option value="ekki"${k.tegund === 'ekki' ? ' selected' : ''}>Ekki talið með</option></select></td>
      <td>${laest ? '' : `<button type="button" class="innf-btn innf-btn--litill" data-adgerd="eyda-kostn" data-i="${i}" title="Eyða kostnaðarlið ${i + 1}" aria-label="Eyða kostnaðarlið ${i + 1}">${X}</button>`}</td></tr>`).join('');

    const kostnTafla = `<div><div class="innf-merki">Kostnaður (kr án VSK)</div><div class="innf-umbudir"><table class="innf-tafla"><thead><tr>
      <th>Liður</th><th class="t">Upphæð</th><th>Tegund</th><th></th></tr></thead>
      <tbody>${kostn || `<tr><td colspan="4" class="innf-daufur" style="padding:12px">Enginn kostnaður skráður.</td></tr>`}</tbody></table></div>
      ${laest ? '' : '<div class="innf-undir"><button type="button" class="innf-btn" data-adgerd="nyr-kostn">+ Kostnaðarliður</button><span class="innf-daufur">Tóm upphæð = ómælt. Liðurinn er þá ekki talinn sem 0 heldur sýndur sem gat.</span></div>'}</div>`;

    const samt = `<div style="display:grid;gap:8px">
      <div class="innf-samt"><span>Vörur <b data-r="s-vorur">${kr(r.vorur_isk)}</b></span>
        <span>Kostnaður <b data-r="s-kostn">${kr(r.kostnadur_alls)}</b> (<b data-r="s-pct">+${pct(r.alag_pct || 0)}</b>)</span>
        <span title="VSK við innflutning: greiddur en dreginn frá sem innskattur, svo hann er ekki kostnaður">Innskattur <b data-r="s-innsk">${kr(r.innskattur)}</b></span>
        <span>Virkt gengi <b data-r="s-gengi">${aukastafir(r.gengi, 2) || '—'}</b></span></div>
      <div class="innf-band"><span class="innf-band-merki">Samtals án VSK</span><span class="innf-tala" data-r="s-heild">${thus(r.heild || 0)}<span>kr</span></span></div>
      <div class="innf-vantar" data-r="vantar" aria-live="polite">${vantarHtml(r)}</div></div>`;

    const ath = `<label style="display:grid;gap:4px;font-size:11px;font-weight:600;color:#3a4250">Athugasemd<textarea data-f="athugasemd" rows="3"${dis}>${esc(d.athugasemd || '')}</textarea></label>`;

    return `<div class="innf-spjald">
      <div class="innf-haus"><span class="innf-titill">Sending <b>${esc(s.tilvisun)}</b></span>${plataStodu(s)}
        <span class="innf-tala" data-r="haus-heild">${thus(r.heild || 0)}<span>kr</span></span></div>
      <div class="innf-bukur">${grunnur}${vorurTafla}${kostnTafla}${samt}${ath}</div>
    </div>
    ${faersluHtml(s)}`;
  }

  function vantarHtml(r) {
    return (r.vantar || []).map((t) => `<span>${esc(t)}</span>`).join('');
  }

  const X = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  // Vörur sendingarinnar, línur á sömu vöru saman (sama regla og aVorur á þjóninum).
  function aVorur(r) {
    const m = new Map();
    (r.linur || []).forEach((l) => {
      if (!l.vara_id || !(l.magn > 0)) return;
      const v = m.get(l.vara_id) || { vara_id: l.vara_id, magn: 0, samtals: 0, heiti: l.heiti };
      v.magn += l.magn; v.samtals += l.samtals; m.set(l.vara_id, v);
    });
    return [...m.values()].map((v) => ({ ...v, kostnadarverd: v.samtals / v.magn }));
  }
  // Til viðmiðunar í valinu; þjónninn reiknar það sem er skrifað (medalverd í _innflutningur-reikna.cjs).
  function medal(birgdir, kNu, magn, nytt, baeta) {
    const eldri = Math.max(0, baeta ? (Number(birgdir) || 0) : (Number(birgdir) || 0) - magn);
    if (kNu == null || !(Number(kNu) > 0) || eldri <= 0) return nytt;
    return (eldri * Number(kNu) + magn * nytt) / (eldri + magn);
  }
  function valFyrir(sId, v) {
    const a = (_val[sId] = _val[sId] || {});
    if (!a[v.vara_id]) { const vv = vara(v.vara_id); a[v.vara_id] = { kaupverd: vv && vv.kostnadarverd != null ? 'obreytt' : 'nytt', baeta: false }; }
    return a[v.vara_id];
  }

  function faersluHtml(s) {
    const r = s.reikningur || {};
    if (s.stada === 'faert' && s.faersla) {
      const f = s.faersla;
      const rodir = (f.linur || []).map((l) => `<tr><td class="innf-nafn">${esc(l.nafn || ('Vara ' + l.vara_id))}</td>
        <td class="t">${kr(l.kostn_fyrir)}</td><td class="t kv">${kr(l.kostn_eftir)}</td>
        <td class="t">${l.birgdir_fyrir == null ? '—' : thus(l.birgdir_fyrir)}</td><td class="t">${l.birgdir_eftir == null ? '—' : thus(l.birgdir_eftir)}</td></tr>`).join('');
      const arek = (f.arekstrar || []).length ? `<div class="innf-vantar">${f.arekstrar.map((a) => `<span>${esc(a.nafn || a.vara_id)}: ${esc(a.astaeda)}</span>`).join('')}</div>` : '';
      return `<div class="innf-spjald"><div class="innf-haus"><span class="innf-titill">Fært í birgðir</span>
          <span class="innf-plate innf-plate--dokk">${esc(stund(f.at))}${f.af ? ' · ' + esc(f.af) : ''}</span></div>
        <div class="innf-bukur"><div class="innf-umbudir"><table class="innf-tafla"><thead><tr><th>Vara</th><th class="t">Kaupverð áður</th><th class="t">Kaupverð nú</th><th class="t">Lager áður</th><th class="t">Lager eftir</th></tr></thead>
          <tbody>${rodir}</tbody></table></div>${arek}
          ${(f.omaeldir || []).length ? `<div class="innf-vantar"><span>Fært með ómældum kostnaði: ${esc(f.omaeldir.join(', '))}</span></div>` : ''}
          <div class="innf-undir"><button type="button" class="innf-btn" data-adgerd="afturkalla"${_vinnur ? ' disabled' : ''}>Afturkalla færslu</button>
            <span class="innf-daufur">Setur kaupverðið til baka (nema því hafi verið breytt síðan) og dregur frá það magn sem var bætt við.</span></div>
          ${sagaHtml(s)}</div></div>`;
    }
    const vv = aVorur(r);
    const rodir = vv.map((a) => {
      const v = vara(a.vara_id) || {};
      const o = valFyrir(s.id, a);
      const nytt = Math.round(a.kostnadarverd);
      const med = Math.round(medal(v.birgdir, v.kostnadarverd, a.magn, a.kostnadarverd, o.baeta));
      const eftir = o.kaupverd === 'nytt' ? nytt : o.kaupverd === 'medal' ? med : (v.kostnadarverd == null ? null : Number(v.kostnadarverd));
      const lagerEftir = o.baeta ? (Number(v.birgdir) || 0) + a.magn : v.birgdir;
      const knappur = (k, t) => `<button type="button" data-val="${a.vara_id}" data-kaupverd="${k}" aria-pressed="${o.kaupverd === k}">${t}</button>`;
      return `<tr>
        <td class="innf-nafn" style="min-width:180px">${esc(v.nafn || a.heiti || ('Vara ' + a.vara_id))}</td>
        <td class="t">${stk(a.magn)}</td>
        <td class="t">${kr(v.kostnadarverd)}</td>
        <td><span class="innf-rofi" role="group" aria-label="Kaupverð ${esc(v.nafn || '')}">${knappur('nytt', 'Nýtt ' + thus(nytt))}${knappur('medal', 'Meðaltal ' + thus(med))}${knappur('obreytt', 'Óbreytt')}</span></td>
        <td class="t kv">${kr(eftir)}</td>
        <td><label class="innf-hak"><input type="checkbox" data-baeta="${a.vara_id}"${o.baeta ? ' checked' : ''}> +${thus(a.magn)} á lager</label></td>
        <td class="t">${v.birgdir == null ? '—' : thus(v.birgdir)} → ${lagerEftir == null ? '—' : thus(lagerEftir)}</td></tr>`;
    }).join('');
    const omaelt = (r.omaeldir || []).length;
    return `<div class="innf-spjald"><div class="innf-haus"><span class="innf-titill">Færa í birgðir</span>
        <span class="innf-plate">${vv.length} ${vv.length === 1 ? 'vara' : 'vörur'}</span></div>
      <div class="innf-bukur">
        <div class="innf-daufur" style="font-size:12.5px;color:#3a4250">Kaupverðið fer á vöruna í Birgðum, Vörum og þjónustu og á Sölu.
          <b>Nýtt</b> = kostnaðarverð sendingarinnar. <b>Meðaltal</b> = vegið við eldri stykki á lager (lager núna, að frádreginni sendingunni nema henni sé bætt við).
          Hakaðu í „á lager" aðeins ef sendingin hefur ekki þegar verið talin inn.</div>
        ${vv.length ? `<div class="innf-umbudir"><table class="innf-tafla"><thead><tr><th>Vara</th><th class="t">Í sendingu</th><th class="t">Kaupverð núna</th><th>Kaupverð eftir færslu</th><th class="t">Verður</th><th>Lager</th><th class="t">Lager núna → eftir</th></tr></thead>
          <tbody>${rodir}</tbody></table></div>` : '<div class="innf-daufur">Engin lína er tengd vöru. Veldu vöru í hverri línu hér fyrir ofan.</div>'}
        ${omaelt ? `<label class="innf-hak"><input type="checkbox" data-omaelt="1"${_omaeltOk[s.id] ? ' checked' : ''}> Færa samt, þótt ${omaelt === 1 ? 'einn kostnaðarliður sé ómældur' : omaelt + ' kostnaðarliðir séu ómældir'} (kaupverðið verður of lágt um þá upphæð)</label>` : ''}
        <div class="innf-undir">
          <button type="button" class="innf-btn innf-btn--graent" data-adgerd="faera"${!vv.length || _vinnur || (omaelt && !_omaeltOk[s.id]) ? ' disabled' : ''}>Færa í birgðir</button>
          <button type="button" class="innf-btn" data-adgerd="eyda-sendingu"${_vinnur ? ' disabled' : ''}>Eyða drögum</button>
        </div>
        ${sagaHtml(s)}
      </div></div>`;
  }

  function sagaHtml(s) {
    const saga = Array.isArray(s.saga) ? s.saga.slice(-8).reverse() : [];
    if (!saga.length) return '';
    const heiti = { stofnud: 'Stofnuð', faert: 'Fært í birgðir', afturkallad: 'Færsla afturkölluð' };
    return `<div><div class="innf-merki">Saga</div><div class="innf-saga">${saga.map((x) => `<div><span>${esc(stund(x.at))}</span> · ${esc(heiti[x.adgerd] || x.adgerd)}${x.af ? ' · ' + esc(x.af) : ''}</div>`).join('')}</div></div>`;
  }

  function allt() {
    if (_villa) {
      return `<div class="innf"><div class="innf-plata"><div class="innf-villa">${esc(_villa.texti)}
        ${_villa.innskraning ? `<div style="margin-top:10px"><a class="innf-btn innf-btn--rautt" href="/innskraning.html?next=${encodeURIComponent(location.pathname + location.search + location.hash)}">Skrá inn</a></div>`
          : '<div style="margin-top:10px"><button type="button" class="innf-btn" data-adgerd="endurhlada">Reyna aftur</button></div>'}</div></div></div>`;
    }
    if (!_gogn) return beinagrind();
    return `<div class="innf"><div class="innf-plata">${listiHtml()}${sendingHtml()}</div></div>`;
  }

  function teiknaAllt() {
    const rot = _rot;
    if (!rot || !rot.isConnected) return;
    stilar();
    _bidur = false;
    const aftur = window.Stodugt && Stodugt.vernda ? Stodugt.vernda(rot) : null;
    rot.innerHTML = allt();
    if (aftur) aftur();
    tengja(rot);
  }

  // Meðan skrifað er: aðeins tölurnar (sama hnút, nýr texti) — reitirnir sjálfir standa.
  const erAdSkrifa = () => { const a = document.activeElement; return !!(a && _rot && _rot.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== 'checkbox'); };
  function uppfaeraTolur() {
    const s = opin();
    if (!s || !_rot) return;
    const r = s.reikningur || {};
    const setja = (k, html) => { const el = _rot.querySelector(`[data-r="${k}"]`); if (el && el.innerHTML !== html) el.innerHTML = html; };
    (r.linur || []).forEach((l, i) => { setja(`l${i}-isk`, kr(l.vorur_isk)); setja(`l${i}-alag`, kr(l.alag)); setja(`l${i}-kv`, kr(l.kostnadarverd)); });
    setja('s-vorur', kr(r.vorur_isk)); setja('s-kostn', kr(r.kostnadur_alls)); setja('s-pct', '+' + pct(r.alag_pct || 0));
    setja('s-innsk', kr(r.innskattur)); setja('s-gengi', aukastafir(r.gengi, 2) || '—');
    setja('s-heild', `${thus(r.heild || 0)}<span>kr</span>`); setja('haus-heild', `${thus(r.heild || 0)}<span>kr</span>`);
    setja('vantar', vantarHtml(r)); setja(`listi-${s.id}`, kr(r.heild));
  }
  function teiknaEdaBida() {
    if (erAdSkrifa()) { uppfaeraTolur(); _bidur = true; } else teiknaAllt();
  }

  // ── Vistun ───────────────────────────────────────────────────────────────────────────────────────────────────────
  async function vista() {
    if (_vistar) { _aftur = true; return; }
    const d = drog();
    if (!d) return;
    _vistar = true;
    try {
      const { ok, status, d: svar } = await api('POST', { action: 'vista', sending: d });
      if (status === 401) { _villa = { texti: 'Innskráning rann út. Skráðu þig inn aftur; óvistaðar breytingar týnast.', innskraning: true }; teiknaAllt(); return; }
      if (svar.sending) {
        setjaSendingu(svar.sending);
        if (ok) { d.updated_at = svar.sending.updated_at; }
        else { _drog = null; }   // 409: nýjasta útgáfan frá þjóninum tekur við
      }
      if (!ok) { toast(svar.error || `Vistaðist ekki (${status})`); teiknaAllt(); return; }
      if (!_aftur) teiknaEdaBida();
    } catch (e) {
      toast('Vistaðist ekki — athugaðu netið og reyndu aftur');
    } finally {
      _vistar = false;
      if (_aftur) { _aftur = false; vista(); }
    }
  }

  function setjaReit(slod, gildi) {
    const d = drog();
    if (!d) return;
    const p = slod.split('.');
    let o = d;
    for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
    const k = p[p.length - 1];
    o[k] = gildi === '' ? null : gildi;
    if (p[0] === 'linur' && k === 'vara_id') {
      o.vara_id = gildi ? Number(gildi) : null;
      const v = vara(gildi);
      if (v && !o.heiti) o.heiti = v.nafn;
    }
  }

  // ── Atburðir ─────────────────────────────────────────────────────────────────────────────────────────────────────
  function tengja(rot) {
    if (rot._innfTengt) return;
    rot._innfTengt = true;
    rot.addEventListener('change', (e) => {
      const t = e.target;
      if (t.dataset && t.dataset.f) { setjaReit(t.dataset.f, t.value); vista(); return; }
      if (t.dataset && t.dataset.baeta) { const s = opin(); const o = valFyrir(s.id, { vara_id: Number(t.dataset.baeta) }); o.baeta = t.checked; teiknaAllt(); return; }
      if (t.dataset && t.dataset.omaelt) { const s = opin(); _omaeltOk[s.id] = t.checked; teiknaAllt(); }
    });
    rot.addEventListener('focusout', (e) => {
      if (!_bidur) return;
      if (e.relatedTarget && rot.contains(e.relatedTarget)) return;   // fókus innan flipans: bíðum áfram
      requestAnimationFrame(() => { if (_bidur && !erAdSkrifa()) teiknaAllt(); });
    });
    rot.addEventListener('keydown', (e) => {
      const rod = e.target.closest && e.target.closest('tr[data-opna]');
      if (rod && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); opna(Number(rod.dataset.opna)); }
    });
    rot.addEventListener('click', async (e) => {
      const t = e.target.closest('button, tr[data-opna]');
      if (!t || !rot.contains(t)) return;
      if (t.dataset.opna) { opna(Number(t.dataset.opna)); return; }
      if (t.dataset.skipting) { setjaReit('skipting', t.dataset.skipting); teiknaAllt(); vista(); return; }
      if (t.dataset.val) { const s = opin(); valFyrir(s.id, { vara_id: Number(t.dataset.val) }).kaupverd = t.dataset.kaupverd; teiknaAllt(); return; }
      const a = t.dataset.adgerd;
      if (!a) return;
      const d = drog();
      if (a === 'ny') return nySending();
      if (a === 'endurhlada') { _villa = null; teiknaAllt(); await hlada(true); teiknaAllt(); return; }
      if (a === 'ny-lina') { d.linur.push({ vara_id: null, heiti: '', magn: null, einingaverd: null }); teiknaAllt(); vista(); return; }
      if (a === 'eyda-linu') { d.linur.splice(Number(t.dataset.i), 1); teiknaAllt(); vista(); return; }
      if (a === 'nyr-kostn') { d.kostnadur.push({ heiti: '', upphaed: null, tegund: 'kostnadur' }); teiknaAllt(); vista(); return; }
      if (a === 'eyda-kostn') { d.kostnadur.splice(Number(t.dataset.i), 1); teiknaAllt(); vista(); return; }
      if (a === 'faera') return faera();
      if (a === 'afturkalla') return afturkalla();
      if (a === 'eyda-sendingu') return eydaSendingu();
    });
  }

  function opna(id) {
    if (id === _opid) return;
    _opid = id;
    _drog = null;
    teiknaAllt();
  }

  async function nySending() {
    const { ok, status, d } = await api('POST', { action: 'vista', sending: { tilvisun: 'Ný sending', mynt: 'EUR', linur: [], kostnadur: [
      { heiti: 'Flutningur', upphaed: null, tegund: 'kostnadur' },
      { heiti: 'Úrvinnslugjald', upphaed: null, tegund: 'kostnadur' },
      { heiti: 'Tollur', upphaed: null, tegund: 'kostnadur' },
      { heiti: 'VSK við innflutning', upphaed: null, tegund: 'innskattur' },
    ] } });
    if (!ok) { toast(d.error || `Stofnaðist ekki (${status})`); return; }
    setjaSendingu(d.sending);
    _opid = d.sending.id;
    _drog = null;
    teiknaAllt();
    const f = _rot && _rot.querySelector('input[data-f="tilvisun"]');
    if (f) { f.focus(); f.select(); }
  }

  async function faera() {
    const s = opin();
    if (!s || _vinnur) return;
    const val = _val[s.id] || {};
    _vinnur = true; teiknaAllt();
    try {
      const fs = await api('POST', { action: 'faera', id: s.id, val, forskoda: true });
      if (!fs.ok) { toast(fs.d.error || 'Forskoðun brást'); return; }
      const plan = fs.d.aaetlun || { linur: [] };
      if (!plan.linur.length) { toast('Ekkert breytist á vörunum með þessu vali'); return; }
      const lysing = plan.linur.map((l) => {
        const k = l.kostn_eftir !== l.kostn_fyrir ? `kaupverð ${kr(l.kostn_fyrir)} → ${kr(l.kostn_eftir)}` : '';
        const b = l.birgdir_eftir !== l.birgdir_fyrir ? `lager ${l.birgdir_fyrir == null ? '—' : thus(l.birgdir_fyrir)} → ${thus(l.birgdir_eftir)}` : '';
        return `${l.nafn}: ${[k, b].filter(Boolean).join(', ')}`;
      }).join('\n');
      const omaelt = (s.reikningur && s.reikningur.omaeldir) || [];
      const texti = `Færa sendingu ${s.tilvisun} í birgðir?\n\n${lysing}${omaelt.length ? `\n\nÓmælt: ${omaelt.join(', ')}` : ''}\n\nHægt er að afturkalla færsluna.`;
      if (!(await Confirm.show(texti, { okText: 'Færa í birgðir' }))) return;
      const r = await api('POST', { action: 'faera', id: s.id, val, omaelt_ok: !!_omaeltOk[s.id] });
      if (r.d.sending) setjaSendingu(r.d.sending);
      if (!r.ok) { toast(r.d.error || `Færslan tókst ekki (${r.status})`); return; }
      const f = r.d.faersla || {};
      toast(`Fært í birgðir · ${f.linur ? f.linur.length : 0} ${f.linur && f.linur.length === 1 ? 'vara' : 'vörur'}${f.arekstrar && f.arekstrar.length ? ` · ${f.arekstrar.length} sleppt` : ''}`);
      delete _val[s.id];
      await hlada(true);
      try { window.Stock && Stock.load && Stock.load(); } catch (_) {}
    } catch (e) {
      toast('Færslan tókst ekki — athugaðu netið');
    } finally {
      _vinnur = false; teiknaAllt();
    }
  }

  async function afturkalla() {
    const s = opin();
    if (!s || _vinnur) return;
    if (!(await Confirm.show(`Afturkalla færslu sendingar ${s.tilvisun}?\n\nKaupverðið fer til baka þar sem því hefur ekki verið breytt síðan, og magnið sem var bætt á lagerinn er dregið frá.`, { okText: 'Afturkalla', danger: true }))) return;
    _vinnur = true; teiknaAllt();
    try {
      const r = await api('POST', { action: 'afturkalla', id: s.id });
      if (r.d.sending) setjaSendingu(r.d.sending);
      if (!r.ok) { toast(r.d.error || 'Afturköllun tókst ekki'); return; }
      toast(`Færsla afturkölluð · ${(r.d.afturkallad || []).length} ${(r.d.afturkallad || []).length === 1 ? 'vara' : 'vörur'}${(r.d.sleppt || []).length ? ` · ${(r.d.sleppt || []).length} stóðu` : ''}`);
      await hlada(true);
      try { window.Stock && Stock.load && Stock.load(); } catch (_) {}
    } finally {
      _vinnur = false; teiknaAllt();
    }
  }

  async function eydaSendingu() {
    const s = opin();
    if (!s) return;
    if (!(await Confirm.show(`Eyða drögum sendingar ${s.tilvisun}? Það er ekki hægt að afturkalla.`, { okText: 'Eyða', danger: true }))) return;
    const r = await api('POST', { action: 'eyda', id: s.id });
    if (!r.ok) { toast(r.d.error || 'Eyðing tókst ekki'); return; }
    _gogn.sendingar = _gogn.sendingar.filter((x) => x.id !== s.id);
    _opid = _gogn.sendingar.length ? _gogn.sendingar[0].id : null;
    _drog = null;
    merkjaFjolda();
    teiknaAllt();
  }

  // ── Opinbert ─────────────────────────────────────────────────────────────────────────────────────────────────────
  window.Innflutningur = {
    // 36 kallar með hnútnum sem flipinn á; gögnin sækjast einu sinni, beinagrindin heldur plássinu á meðan.
    teikna(rot) {
      _rot = rot;
      stilar();
      if (_gogn || _villa) { teiknaAllt(); return; }
      rot.innerHTML = beinagrind();
      hlada().then(() => { if (_rot === rot) teiknaAllt(); });
    },
    fjoldi: () => (_gogn ? _gogn.sendingar.length : null),
    hlada: () => hlada(true),
  };
})();
