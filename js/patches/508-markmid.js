/* === MARKMIÐ (508, 16.11.2026) — markmiðslisti Agnars ==============================================================
 *
 * Agnar 16.11.2026: „setja allt þetta saman í markmiðslista. Skrá hvern flokk, mælieiningu, gauge eða einhvern kvarða
 * hver staðan er akkúrat í dag, með starting línu, sem hægt er að expanda til að sjá allt nánar, og klárað hvert fyrir
 * sig, bæta við gögnum, attachments, screenshots."
 *
 * Síðan #markmid (hnappur „Markmið" í valmyndinni, við hlið Þjónustuborðs). Flokkar sem stálspjöld; hvert markmið er
 * lína með mæli frá GRUNNLÍNU (mæld 16.11.2026) að MARKI; smellur opnar: tölur og saga mælinga, skref sem eru hökuð
 * hvert fyrir sig, gögn/athugasemdir, viðhengi og skjáskot (hlaða upp eða Ctrl+V), og staða (Í vinnu / Lokið).
 *
 * Gögn: /api/markmid (netlify/functions/markmid.cjs, starfsmannahlið). Framvindan er reiknuð á þjóninum
 * (_markmid-reikna.cjs) svo talan hér er sama tala og alls staðar annars staðar. Mælanleg markmið mælast sjálf á hverjum
 * morgni kl. 06:20 (markmid-cron) og þegar ýtt er á „Mæla núna". Allt er vistað á þjóninum — sama á öllum vélum.
 * Hvaða markmið eru opin á skjánum er tímabundin staða og lifir aðeins hér (regla 15.10.2026 leyfir það).
 * Útlit: Brunastál C (stálplata, stálspjald með hnoðuðum málmhaus, plötur, silfur/málm/grænir takkar) — sjá 413 og 507.
 * ================================================================================================================== */
(() => {
  if (window.Markmid) return;

  const API = '/api/markmid';
  const VL_SLOD = 'https://brunaholf.netlify.app/verkefnalisti.html';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m) => { try { window.Toast && Toast.show(m); } catch (_) {} };
  const thus = (n) => { const s = String(Math.abs(Math.round(n))); return (n < 0 ? '−' : '') + s.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  const tala = (n) => (n == null || n === '' || !Number.isFinite(Number(n)) ? '—' : thus(Number(n)));
  const pct = (x) => (x == null ? '—' : Math.round(x * 100) + ' %');
  const p2 = (x) => String(x).padStart(2, '0');
  const dags = (iso) => { if (!iso) return '—'; const d = new Date(iso); return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`; };
  const stund = (iso) => { if (!iso) return ''; const d = new Date(iso); return `${dags(iso)} kl. ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const STADA = { opid: 'Opið', i_vinnu: 'Í vinnu', lokid: 'Lokið' };

  let _gogn = null, _loadP = null, _villa = null, _vinnur = false;
  const _opin = new Set();      // opin markmið (tímabundin staða)
  let _sidastOpnad = null;      // Ctrl+V fer á það markmið
  let _hoppaTil = null;         // markmið sem var opnað af borðinu — skrunað að því þegar gögnin eru komin

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
        if (status === 401) { _villa = { texti: 'Innskráning starfsmanns vantar til að sjá markmiðin.', inn: true }; return; }
        if (!ok) { _villa = { texti: d.error || `Náði ekki í markmiðin (${status})` }; return; }
        _villa = null;
        _gogn = d;
      } catch (e) { _villa = { texti: 'Náði ekki í markmiðin: ' + (e && e.message ? e.message : e) }; }
    })();
    return _loadP;
  }
  function setja(m) {
    if (!_gogn || !m) return;
    const i = _gogn.markmid.findIndex((x) => x.id === m.id);
    if (i >= 0) _gogn.markmid[i] = m;
    _gogn.flokkar = flokkar(_gogn.markmid);
  }
  // Sama samantekt og _markmid-reikna.cjs flokkar() — aðeins notuð til að uppfæra hausinn strax eftir breytingu;
  // næsta hleðsla kemur með tölu þjónsins.
  function flokkar(listi) {
    const rod = [], eftir = new Map();
    listi.forEach((m) => { if (!eftir.has(m.flokkur)) { eftir.set(m.flokkur, []); rod.push(m.flokkur); } eftir.get(m.flokkur).push(m); });
    return rod.map((h) => { const mm = eftir.get(h), f = mm.map((m) => m.framvinda).filter((x) => x != null);
      return { heiti: h, fjoldi: mm.length, lokid: mm.filter((m) => m.stada === 'lokid').length, framvinda: f.length ? f.reduce((a, b) => a + b, 0) / mm.length : null, omaeld: mm.length - f.length }; });
  }

  // ── Útlit ────────────────────────────────────────────────────────────────────────────────────────────────────────
  function stilar() {
    if (document.getElementById('_mm-css')) return;
    if (!document.getElementById('_tbm-font') && !document.getElementById('_innf-font') && !document.getElementById('_mm-font')) {
      const lf = document.createElement('link');
      lf.id = '_mm-font'; lf.rel = 'stylesheet';
      lf.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap';
      document.head.appendChild(lf);
    }
    const MONO = '"JetBrains Mono",ui-monospace,monospace', SANS = '"IBM Plex Sans",system-ui,sans-serif', DISPLAY = '"Playfair Display",Georgia,serif';
    const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
    const STAL_IMG = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
    const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
    const V = '#view-markmid:not(#_mm1):not(#_mm2):not(#_mm3):not(#_mm4) .mm';
    const css = [
      `#view-markmid{background:#eceff3}`,
      `${V}{font-family:${SANS};color:#141822;max-width:1280px;margin:0 auto}`,
      `${V} *{box-sizing:border-box}`,
      `${V}-topp{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:0 0 12px}`,
      `${V}-h1{font-family:${DISPLAY};font-weight:800;font-size:32px;line-height:1.05;margin:0;color:#141822}`,
      `${V}-undir{font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#3a4250;margin-top:4px}`,
      `${V}-takkar{display:flex;gap:8px;flex-wrap:wrap}`,
      `${V}-plata{background-color:#e2e6ec;background-image:${STAL_IMG};border:1px solid #000;border-radius:14px;box-shadow:0 10px 28px -10px rgba(10,14,22,.45);padding:12px 12px 16px;display:grid;grid-template-columns:minmax(0,1fr);gap:12px;min-width:0}`,
      `${V}-yfir{display:grid;grid-template-columns:minmax(200px,1.1fr) repeat(auto-fill,minmax(150px,1fr));gap:10px}`,
      `${V}-reitur{background:#fff;border-radius:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);padding:10px 12px;min-width:0;cursor:pointer;text-align:left;border:0;font:inherit;color:inherit}`,
      `${V}-reitur:focus-visible{outline:2px solid #b42318;outline-offset:2px}`,
      `${V}-reitur--heild{background:${METAL};color:#fff;cursor:default}`,
      `${V}-rmerki{font-family:${MONO};font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3a4250;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`,
      `${V}-reitur--heild .mm-rmerki{color:#c9ced8}`,
      `${V}-rtala{font-family:${MONO};font-size:22px;font-weight:700;line-height:1.2;margin:4px 0 6px}`,
      `${V}-reitur--heild .mm-rtala{font-family:${DISPLAY};font-size:40px;font-weight:800;color:#fff}`,
      `${V}-rsma{font-size:11.5px;color:#4a5260}`,
      `${V}-reitur--heild .mm-rsma{color:#c9ced8}`,
      // Mælirinn: grunnlína vinstra megin, mark hægra megin, fylling = framvinda
      `${V}-maelir{position:relative;height:10px;border-radius:5px;background:#dfe3ea;box-shadow:inset 0 1px 2px rgba(0,0,0,.25);overflow:hidden}`,
      `${V}-maelir i{position:absolute;left:0;top:0;bottom:0;border-radius:5px;background:linear-gradient(180deg,#5fd18e 0%,#16783f 100%)}`,
      `${V}-maelir--lagt i{background:linear-gradient(180deg,#ffd27a 0%,#c48a12 100%)}`,
      `${V}-maelir--byrjun i{background:linear-gradient(180deg,#c9ced8 0%,#8f98a8 100%)}`,
      `${V}-reitur--heild .mm-maelir{background:#2c2f36}`,
      `${V}-spjald{background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);overflow:hidden;min-width:0}`,
      `${V}-haus{position:relative;background:${METAL};min-height:46px;padding:5px 16px 5px 20px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);border-bottom:1px solid #000}`,
      `${V}-haus::before,${V}-haus::after{content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7)}`,
      `${V}-haus::before{left:7px}${V}-haus::after{right:7px}`,
      `${V}-titill{font-size:15px;font-weight:600;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.6)}`,
      `${V}-htala{font-family:${DISPLAY};font-weight:800;font-size:26px;line-height:1;margin-left:auto;color:#fff;white-space:nowrap}`,
      `${V}-plate{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:${SILVER};box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12);font-family:${MONO};font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1f2530;white-space:nowrap}`,
      `${V}-plate--dokk{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border-color:#000;color:#eef1f4}`,
      `${V}-plate i{width:7px;height:7px;border-radius:50%;background:#8f98a8}`,
      `${V}-plate--i_vinnu i{background:#d29a1e}${V}-plate--lokid i{background:#16a34a}`,
      `${V}-traust{display:inline-flex;align-items:center;height:22px;padding:0 8px;margin-left:6px;border-radius:3px;font-family:${MONO};font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;vertical-align:middle;border:1px dashed #8f98a8;color:#3a4250;background:transparent}`,
      `${V}-traust--rett{border:1px solid rgba(22,120,63,.45);color:#0e5a2e;background:#eef8f1}`,
      `${V}-traust--rangt{border:1px solid rgba(180,35,24,.5);color:#8a1c12;background:#fff3f1}`,
      `${V}-traust--oljost{border:1px solid rgba(160,110,20,.5);color:#6b4a0c;background:#fff8e6}`,
      `${V}-traust-lysing{margin-top:8px;padding:8px 10px;border-radius:6px;font-size:12.5px;line-height:1.5;background:#f3f5f8;border-left:3px solid #8f98a8;color:#1f2530}`,
      `${V}-traust-lysing--rett{border-left-color:#16783f}${V}-traust-lysing--rangt{border-left-color:#b42318}${V}-traust-lysing--oljost{border-left-color:#d29a1e}`,
      // Lína markmiðs
      `${V}-lina{border-top:1px solid #e4e8ef}`,
      `${V}-lina:first-child{border-top:0}`,
      `${V}-rod{display:grid;grid-template-columns:minmax(0,1fr) minmax(170px,240px) 56px 28px;gap:12px;align-items:center;padding:10px 14px;cursor:pointer;width:100%;background:transparent;border:0;font:inherit;color:inherit;text-align:left;min-height:56px}`,
      `${V}-rod:hover{background:#f6f8fb}${V}-rod:focus-visible{outline:2px solid #b42318;outline-offset:-2px}`,
      `${V}-mtitill{font-weight:700;font-size:14px;color:#141822;display:flex;align-items:center;gap:8px;flex-wrap:wrap}`,
      `${V}-mtitill--lokid{color:#4a5260;text-decoration:line-through;text-decoration-color:rgba(20,24,34,.35)}`,
      `${V}-maeli-lina{font-family:${MONO};font-size:11.5px;color:#3a4250;margin-top:3px;white-space:normal}`,
      `${V}-maeli-lina b{color:#141822}`,
      `${V}-versnad{color:#b42318!important}`,
      `${V}-mpct{font-family:${MONO};font-weight:700;font-size:13px;text-align:right}`,
      `${V}-chev{width:18px;height:18px;color:#3a4250;transition:transform .12s}`,
      `${V}-lina[data-opid="1"] .mm-chev{transform:rotate(180deg)}`,
      `${V}-kvardi{display:flex;justify-content:space-between;font-family:${MONO};font-size:10px;color:#4a5260;margin-top:3px}`,
      // Opið markmið
      `${V}-opid{padding:4px 14px 16px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;background:#fafbfc;border-top:1px dashed #d5dbe4}`,
      `${V}-kafli{min-width:0}`,
      `${V}-kafli--heil{grid-column:1/-1}`,
      `${V}-merki{font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#3a4250;margin:10px 0 6px}`,
      `${V}-lysing{font-size:13px;line-height:1.5;color:#2a303b;white-space:pre-wrap}`,
      `${V}-tolur{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}`,
      `${V}-tolur div{background:#fff;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12);padding:7px 9px}`,
      `${V}-tolur span{display:block;font-family:${MONO};font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4a5260}`,
      `${V}-tolur b{font-family:${MONO};font-size:17px}`,
      `${V}-skref{display:grid;gap:2px}`,
      `${V}-skref label{display:flex;align-items:flex-start;gap:9px;font-size:13px;padding:6px 6px;border-radius:6px;cursor:pointer;min-height:36px}`,
      `${V}-skref label:hover{background:#eef1f6}`,
      `${V}-skref input{width:18px!important;height:18px!important;min-height:18px!important;margin:1px 0 0;accent-color:#16783f;flex:none}`,
      `${V}-skref .done span{text-decoration:line-through;color:#4a5260}`,
      `${V}-skref small{display:block;font-family:${MONO};font-size:10.5px;color:#4a5260!important;margin-top:1px}`,
      `${V}-faersla{background:#fff;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.1);padding:7px 10px;font-size:13px;line-height:1.45;margin-bottom:6px;white-space:pre-wrap;word-break:break-word}`,
      `${V}-faersla em{display:block;font-style:normal;font-family:${MONO};font-size:10.5px;color:#4a5260;margin-bottom:2px}`,
      `${V} textarea,${V} input[type=text]{width:100%;min-width:0;background:#eef1f6;border:1px solid rgba(20,24,34,.14);border-radius:8px;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);padding:8px 10px!important;font:inherit;font-size:13px!important;color:#141822;min-height:40px!important}`,
      `${V} textarea{min-height:64px!important;resize:vertical}`,
      `${V} textarea:focus,${V} input[type=text]:focus{outline:2px solid #b42318;outline-offset:1px;background:#fff}`,
      `${V}-saman{display:flex;gap:8px;align-items:flex-start;margin-top:6px}`,
      `${V}-vidh{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}`,
      `${V}-vidh a{display:block;background:#fff;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12);padding:6px;text-decoration:none;color:#1f2530;font-size:11.5px;word-break:break-word;position:relative}`,
      `${V}-vidh img{display:block;width:100%;height:84px;object-fit:cover;border-radius:4px;background:#e4e8ef;margin-bottom:4px}`,
      `${V}-vidh .ikon{height:84px;display:flex;align-items:center;justify-content:center;font-family:${MONO};font-weight:700;font-size:13px;color:#3a4250;background:#eef1f6;border-radius:4px;margin-bottom:4px}`,
      `${V}-vidh button{position:absolute;top:4px;right:4px;width:26px!important;height:26px!important;min-height:26px!important;padding:0!important;border-radius:5px!important}`,
      `${V}-saga svg{display:block;width:100%;height:46px}`,
      `${V}-vl{display:flex;gap:6px;flex-wrap:wrap}`,
      `${V}-vl a{font-family:${MONO};font-size:11px;font-weight:700;color:#1f2530;text-decoration:none;padding:3px 7px;border-radius:3px;background:${SILVER};border:1px solid rgba(20,24,34,.14)}`,
      // Takkar
      `${V} button{font-family:${SANS}!important;cursor:pointer}`,
      `${V}-btn{height:36px!important;min-height:36px!important;padding:0 14px!important;border-radius:9px!important;font-size:13px!important;font-weight:600!important;display:inline-flex;align-items:center;justify-content:center;gap:7px;white-space:nowrap;background:${SILVER};border:1px solid rgba(20,24,34,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530}`,
      `${V}-btn:focus-visible{outline:2px solid #b42318;outline-offset:2px}`,
      `${V}-btn--malmur{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);color:#eef1f4}`,
      `${V}-btn--graent{border:1px solid rgba(52,168,98,.55);background:linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%);color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.55)}`,
      `${V}-btn[disabled]{opacity:.38;pointer-events:none}`,
      `${V}-villa{background:#fff;border:1px solid #b42318;border-radius:10px;padding:14px 16px;color:#b42318;font-weight:600}`,
      `${V}-beinagrind{height:520px;border-radius:14px;background:${STAL_IMG};border:1px solid #000;opacity:.7}`,
      `${V}-daufur{font-size:12px;color:#4a5260}`,
      `@media (max-width:720px){${V}-rod{grid-template-columns:minmax(0,1fr) 48px 22px;row-gap:6px}${V}-rod>.mm-gauge{grid-column:1/-1;grid-row:2}${V}-opid{grid-template-columns:minmax(0,1fr)}${V}-tolur{grid-template-columns:repeat(2,minmax(0,1fr))}${V}-h1{font-size:26px}}`,
    ].join('\n');
    const s = document.createElement('style');
    s.id = '_mm-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  const CHEV = '<svg class="mm-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const X = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function maelir(m, lita) {
    const f = m.framvinda;
    const cls = f == null ? ' mm-maelir--byrjun' : m.versnad ? ' mm-maelir--lagt' : '';
    return `<div class="mm-maelir${lita === false ? '' : cls}" role="img" aria-label="Framvinda ${pct(f)}"><i style="width:${f == null ? 0 : Math.max(2, Math.round(f * 100))}%"></i></div>`;
  }

  function maeliLina(m) {
    if (m.tegund === 'skref' || m.upphaf == null) {
      const s = m.skref || [];
      const k = s.filter((x) => x.done).length;
      return `<b>${k} af ${s.length}</b> skrefum kláruð`;
    }
    const nu = `<b class="${m.versnad ? 'mm-versnad' : ''}">${tala(m.nu)}</b>`;
    return `${nu} ${esc(m.maelieining || '')} · grunnlína <b>${tala(m.upphaf)}</b> (${dags(m.upphaf_at)}) · mark <b>${tala(m.mark)}</b>`;
  }

  function kvardi(m) {
    if (m.tegund === 'skref' || m.upphaf == null) return '';
    return `<div class="mm-kvardi"><span>grunnlína ${tala(m.upphaf)}</span><span>mark ${tala(m.mark)}</span></div>`;
  }

  // Er að marka mælinn? (16.11.2026, Agnar: „allskonar mælitæki á Jarvis sem ég veit ekkert hvort sé að marka").
  // Aðeins sjálfvirkt mæld markmið bera merkið; handvirk tala og skref eru það sem fólk skráði sjálft.
  const TRAUST = { rett: 'Sannreynt', rangt: 'Mælingin röng', oljost: 'Óljós mæling' };
  const dagsStutt = (iso) => { if (!iso) return ''; const d = new Date(iso); return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}`; };
  function traustTexti(m) {
    if (m.tegund !== 'maelt') return '';
    return m.sannreynt ? TRAUST[m.sannreynt] + (m.sannreynt === 'rett' && m.sannreynt_at ? ' ' + dagsStutt(m.sannreynt_at) : '') : 'Ósannreynd';
  }
  function traust(m) {
    const t = traustTexti(m);
    if (!t) return '';
    return `<span class="mm-traust${m.sannreynt ? ' mm-traust--' + m.sannreynt : ''}" title="${esc(m.sannreynt_lysing || 'Mælirinn hefur ekki verið borinn saman við óháða mælingu.')}">${esc(t)}</span>`;
  }
  function traustLysing(m) {
    if (m.tegund !== 'maelt') return '';
    const k = m.sannreynt ? ' mm-traust-lysing--' + m.sannreynt : '';
    const haus = m.sannreynt ? `${TRAUST[m.sannreynt]}${m.sannreynt_at ? ' ' + dags(m.sannreynt_at) : ''}: ` : 'Ósannreynd mæling: ';
    return `<div class="mm-traust-lysing${k}"><b>${esc(haus)}</b>${esc(m.sannreynt_lysing || 'talan hefur ekki enn verið borin saman við óháða mælingu, svo ekki er vitað hvort það er að marka hana.')}</div>`;
  }

  function sagaSvg(saga) {
    const s = (saga || []).filter((x) => Number.isFinite(x.gildi));
    if (s.length < 2) return '<div class="mm-daufur">Ein mæling enn — sagan teiknast þegar fleiri koma (á hverjum morgni kl. 06:20).</div>';
    const W = 300, Hh = 46, min = Math.min(...s.map((x) => x.gildi)), max = Math.max(...s.map((x) => x.gildi)), sp = max - min || 1;
    const pts = s.map((x, i) => `${(i / (s.length - 1)) * (W - 8) + 4},${Hh - 6 - ((x.gildi - min) / sp) * (Hh - 12)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none" role="img" aria-label="Saga mælinga: ${s.length} mælingar frá ${tala(s[0].gildi)} til ${tala(s[s.length - 1].gildi)}"><polyline points="${pts}" fill="none" stroke="#16783f" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
      <div class="mm-kvardi"><span>${dags(s[0].at)} · ${tala(s[0].gildi)}</span><span>${dags(s[s.length - 1].at)} · ${tala(s[s.length - 1].gildi)}</span></div>`;
  }

  function opidHtml(m) {
    const lokid = m.stada === 'lokid';
    const breyting = m.upphaf != null && m.nu != null ? Number(m.nu) - Number(m.upphaf) : null;
    const tolur = m.tegund === 'skref' || m.upphaf == null ? '' : `<div class="mm-kafli mm-kafli--heil"><div class="mm-merki">Mælingin</div>
      <div class="mm-tolur"><div><span>Grunnlína ${dags(m.upphaf_at)}</span><b>${tala(m.upphaf)}</b></div><div><span>Núna${m.nu_at ? ' · ' + dags(m.nu_at) : ''}</span><b class="${m.versnad ? 'mm-versnad' : ''}">${tala(m.nu)}</b></div>
      <div><span>Mark</span><b>${tala(m.mark)}</b></div><div><span>Breyting</span><b class="${m.versnad ? 'mm-versnad' : ''}">${breyting == null ? '—' : (breyting > 0 ? '+' : '') + tala(breyting)}</b></div></div>
      <div class="mm-saga" style="margin-top:8px">${sagaSvg(m.saga)}</div>
      ${traustLysing(m)}
      ${m.tegund === 'handvirkt' && !lokid ? `<div class="mm-saman"><input type="text" inputmode="decimal" data-nu="${m.id}" placeholder="Ný staða (${esc(m.maelieining || 'tala')})" aria-label="Ný staða"><button type="button" class="mm-btn mm-btn--malmur" data-a="nu" data-id="${m.id}">Skrá stöðu</button></div>` : ''}
      ${m.tegund === 'maelt' ? `<div class="mm-daufur" style="margin-top:6px">Mælist sjálfkrafa á hverjum morgni kl. 06:20. <button type="button" class="mm-btn" data-a="maela1" data-id="${m.id}" style="margin-left:6px">Mæla núna</button></div>` : ''}</div>`;
    const skref = (m.skref || []).map((s) => `<label class="${s.done ? 'done' : ''}"><input type="checkbox" data-skref="${esc(s.id)}" data-id="${m.id}"${s.done ? ' checked' : ''}${lokid ? ' disabled' : ''}><span>${esc(s.t)}${s.done && s.af ? `<small>${esc(s.af)} · ${stund(s.at)}</small>` : ''}</span></label>`).join('');
    const ath = (m.athugasemdir || []).slice().reverse().map((a) => `<div class="mm-faersla"><em>${esc(a.af || '')} · ${stund(a.at)}</em>${esc(a.texti)}</div>`).join('');
    const vidh = (m.vidhengi || []).map((v) => {
      const mynd = /^image\//.test(v.tegund) && v.url;
      const enda = (String(v.nafn).split('.').pop() || '').toUpperCase().slice(0, 4);
      return `<a href="${esc(v.url || '#')}" target="_blank" rel="noopener" title="${esc(v.nafn)}">${mynd ? `<img src="${esc(v.url)}" alt="${esc(v.nafn)}" loading="lazy">` : `<div class="ikon">${esc(enda || 'SKRÁ')}</div>`}${esc(v.nafn)}<br><span class="mm-daufur">${dags(v.at)}</span>
        <button type="button" class="mm-btn" data-a="vid-eyda" data-id="${m.id}" data-vid="${esc(v.id)}" title="Eyða viðhengi" aria-label="Eyða viðhengi ${esc(v.nafn)}">${X}</button></a>`;
    }).join('');
    const vl = (m.vl || []).map((x) => `<a href="${VL_SLOD}#${esc(x)}" target="_blank" rel="noopener" title="Verk á Verkefnalistanum">VL ${esc(x)}</a>`).join('');
    return `<div class="mm-opid">
      ${m.lysing ? `<div class="mm-kafli mm-kafli--heil"><div class="mm-merki">Um markmiðið</div><div class="mm-lysing">${esc(m.lysing)}</div></div>` : ''}
      ${tolur}
      <div class="mm-kafli"><div class="mm-merki">Skref</div><div class="mm-skref">${skref || '<div class="mm-daufur">Engin skref.</div>'}</div>
        ${lokid ? '' : `<div class="mm-saman"><input type="text" data-nyskref="${m.id}" placeholder="Nýtt skref" aria-label="Nýtt skref"><button type="button" class="mm-btn" data-a="skref-nytt" data-id="${m.id}">Bæta við</button></div>`}</div>
      <div class="mm-kafli"><div class="mm-merki">Gögn og athugasemdir</div>${ath || '<div class="mm-daufur">Ekkert skráð enn.</div>'}
        <div class="mm-saman"><textarea data-ath="${m.id}" placeholder="Skrá gögn, niðurstöðu eða athugasemd" aria-label="Ný athugasemd"></textarea></div>
        <div class="mm-saman"><button type="button" class="mm-btn mm-btn--malmur" data-a="ath" data-id="${m.id}">Vista athugasemd</button></div></div>
      <div class="mm-kafli mm-kafli--heil"><div class="mm-merki">Viðhengi og skjáskot</div><div class="mm-vidh">${vidh}</div>
        <div class="mm-saman"><button type="button" class="mm-btn" data-a="vid" data-id="${m.id}">Hlaða upp skrá eða mynd</button><span class="mm-daufur" style="align-self:center">eða Ctrl+V til að líma skjáskot hér</span></div>
        <input type="file" data-skra="${m.id}" multiple accept="image/*,.pdf,.txt,.csv,.xlsx,.xls,.docx,.doc" hidden></div>
      <div class="mm-kafli mm-kafli--heil" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between">
        <div class="mm-vl">${vl}</div>
        <div class="mm-takkar">${lokid ? `<span class="mm-daufur">Lokið ${stund(m.lokid_at)}${m.lokid_af ? ' · ' + esc(m.lokid_af) : ''}</span><button type="button" class="mm-btn" data-a="stada" data-stada="opid" data-id="${m.id}">Opna aftur</button>`
          : `${m.stada !== 'i_vinnu' ? `<button type="button" class="mm-btn" data-a="stada" data-stada="i_vinnu" data-id="${m.id}">Í vinnu</button>` : ''}<button type="button" class="mm-btn mm-btn--graent" data-a="stada" data-stada="lokid" data-id="${m.id}">Merkja lokið</button>`}</div></div>
    </div>`;
  }

  function linaHtml(m) {
    const opid = _opin.has(m.id);
    return `<div class="mm-lina" data-mm="${m.id}" data-opid="${opid ? 1 : 0}">
      <button type="button" class="mm-rod" data-a="opna" data-id="${m.id}" aria-expanded="${opid}">
        <span style="min-width:0"><span class="mm-mtitill${m.stada === 'lokid' ? ' mm-mtitill--lokid' : ''}">${esc(m.titill)}<span class="mm-plate mm-plate--${m.stada}"><i aria-hidden="true"></i>${STADA[m.stada] || m.stada}</span>${traust(m)}</span>
          <span class="mm-maeli-lina" style="display:block">${maeliLina(m)}</span></span>
        <span class="mm-gauge">${maelir(m)}${kvardi(m)}</span>
        <span class="mm-mpct">${pct(m.framvinda)}</span>${CHEV}
      </button>
      ${opid ? opidHtml(m) : ''}
    </div>`;
  }

  function allt() {
    if (_villa) {
      return `<div class="mm"><div class="mm-villa">${esc(_villa.texti)}<div style="margin-top:10px">${_villa.inn
        ? `<a class="mm-btn mm-btn--malmur" href="/innskraning.html?next=${encodeURIComponent(location.pathname + location.search + '#markmid')}">Skrá inn</a>`
        : '<button type="button" class="mm-btn" data-a="endurhlada">Reyna aftur</button>'}</div></div></div>`;
    }
    if (!_gogn) return '<div class="mm"><div class="mm-beinagrind"></div></div>';
    const mm = _gogn.markmid || [];
    const fl = _gogn.flokkar || [];
    const f = mm.map((m) => m.framvinda).filter((x) => x != null);
    const heild = mm.length ? f.reduce((a, b) => a + b, 0) / mm.length : 0;
    const lokid = mm.filter((m) => m.stada === 'lokid').length;
    const grunn = mm.map((m) => m.upphaf_at).filter(Boolean).sort()[0];
    const sidast = mm.map((m) => m.nu_at).filter(Boolean).sort().pop();
    const yfir = `<div class="mm-yfir">
      <div class="mm-reitur mm-reitur--heild"><div class="mm-rmerki">Heildarframvinda</div><div class="mm-rtala">${pct(heild)}</div>${maelir({ framvinda: heild }, false)}
        <div class="mm-rsma" style="margin-top:6px">${lokid} af ${mm.length} markmiðum lokið</div></div>
      ${fl.map((x) => `<button type="button" class="mm-reitur" data-a="hoppa" data-flokkur="${esc(x.heiti)}" title="Fara í flokkinn"><div class="mm-rmerki">${esc(x.heiti)}</div><div class="mm-rtala">${pct(x.framvinda)}</div>${maelir({ framvinda: x.framvinda })}
        <div class="mm-rsma" style="margin-top:6px">${x.lokid} af ${x.fjoldi} lokið</div></button>`).join('')}
    </div>`;
    const spjold = fl.map((x) => `<section class="mm-spjald" data-flokkur="${esc(x.heiti)}">
      <div class="mm-haus"><span class="mm-titill">${esc(x.heiti)}</span><span class="mm-plate mm-plate--dokk">${x.fjoldi} markmið</span><span class="mm-htala">${pct(x.framvinda)}</span></div>
      <div>${mm.filter((m) => m.flokkur === x.heiti).map(linaHtml).join('')}</div></section>`).join('');
    return `<div class="mm">
      <div class="mm-topp"><div><h1 class="mm-h1">Markmið</h1><div class="mm-undir">${mm.length} markmið · ${fl.length} flokkar · grunnlína ${dags(grunn)}${sidast ? ' · mælt ' + stund(sidast) : ''}</div></div>
        <div class="mm-takkar"><button type="button" class="mm-btn" data-a="opna-allt">${_opin.size ? 'Loka öllum' : 'Opna öll'}</button>
          <button type="button" class="mm-btn mm-btn--malmur" data-a="maela"${_vinnur ? ' disabled' : ''}>Mæla núna</button></div></div>
      <div class="mm-plata">${yfir}${spjold}</div></div>`;
  }

  function teikna() {
    const rot = document.getElementById('markmid-main');
    if (!rot) return;
    stilar();
    const aftur = window.Stodugt && Stodugt.vernda ? Stodugt.vernda(rot) : null;
    rot.innerHTML = allt();
    if (aftur) aftur();
    tengja(rot);
    if (_hoppaTil != null && _gogn) {
      const el = rot.querySelector(`[data-mm="${_hoppaTil}"]`);
      _hoppaTil = null;
      if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    }
  }

  // ── Aðgerðir ─────────────────────────────────────────────────────────────────────────────────────────────────────
  async function senda(body, takki) {
    if (takki) takki.disabled = true;
    try {
      const r = await api('POST', body);
      if (r.status === 401) { _villa = { texti: 'Innskráning rann út. Skráðu þig inn aftur.', inn: true }; teikna(); return null; }
      if (!r.ok) { toast(r.d.error || `Tókst ekki (${r.status})`); if (r.status === 409) { await hlada(true); teikna(); } return null; }
      if (r.d.markmid) setja(r.d.markmid);
      return r.d;
    } catch (_) { toast('Tókst ekki — athugaðu netið'); return null; } finally { if (takki) takki.disabled = false; }
  }

  // Skjáskot og stórar myndir minnkaðar í vafranum (mest 1800 px, JPEG) svo þau rúmist í 4 MB þaki fallsins.
  function lesaSkra(file) {
    return new Promise((ok, villa) => {
      const fr = new FileReader();
      fr.onerror = () => villa(new Error('Gat ekki lesið skrána'));
      fr.onload = () => {
        const url = fr.result;
        if (!/^image\/(png|jpe?g|webp)$/.test(file.type) || file.size < 1.2 * 1024 * 1024) return ok({ b64: url, tegund: file.type || 'application/octet-stream', nafn: file.name });
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, 1800 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          ok({ b64: c.toDataURL('image/jpeg', 0.86), tegund: 'image/jpeg', nafn: String(file.name || 'mynd').replace(/\.\w+$/, '') + '.jpg' });
        };
        img.onerror = () => ok({ b64: url, tegund: file.type, nafn: file.name });
        img.src = url;
      };
      fr.readAsDataURL(file);
    });
  }
  async function hladaUpp(id, files) {
    for (const f of files) {
      try {
        const s = await lesaSkra(f);
        toast('Hleð upp ' + s.nafn + '…');
        const d = await senda({ action: 'vidhengi', id, nafn: s.nafn, tegund: s.tegund, b64: s.b64 });
        if (d) toast('Vistað: ' + s.nafn);
      } catch (e) { toast(e.message || 'Tókst ekki að hlaða upp'); }
    }
    teikna();
  }

  function tengja(rot) {
    if (rot._mmTengt) return;
    rot._mmTengt = true;
    rot.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-a]');
      if (!t || !rot.contains(t)) return;
      const a = t.dataset.a, id = Number(t.dataset.id);
      if (a === 'opna') { if (_opin.has(id)) _opin.delete(id); else { _opin.add(id); _sidastOpnad = id; } teikna(); return; }
      if (a === 'opna-allt') { if (_opin.size) _opin.clear(); else (_gogn.markmid || []).forEach((m) => _opin.add(m.id)); teikna(); return; }
      if (a === 'hoppa') { const s = rot.querySelector(`section[data-flokkur="${CSS.escape(t.dataset.flokkur)}"]`); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (a === 'endurhlada') { _villa = null; teikna(); await hlada(true); teikna(); return; }
      if (a === 'maela' || a === 'maela1') {
        _vinnur = true; teikna();
        const d = await senda(a === 'maela1' ? { action: 'maela', id } : { action: 'maela' }, t);
        _vinnur = false;
        if (d) { await hlada(true); toast(`Mælt: ${(d.maelt || []).filter((x) => x.gildi != null).length} markmið`); }
        teikna(); return;
      }
      if (a === 'stada') { _sidastOpnad = id; if (await senda({ action: 'stada', id, stada: t.dataset.stada }, t)) teikna(); return; }
      if (a === 'skref-nytt') { const i = rot.querySelector(`input[data-nyskref="${id}"]`); if (!i || !i.value.trim()) return; if (await senda({ action: 'skref_nytt', id, texti: i.value }, t)) teikna(); return; }
      if (a === 'ath') { const i = rot.querySelector(`textarea[data-ath="${id}"]`); if (!i || !i.value.trim()) return; if (await senda({ action: 'athugasemd', id, texti: i.value }, t)) teikna(); return; }
      if (a === 'nu') { const i = rot.querySelector(`input[data-nu="${id}"]`); if (!i || !i.value.trim()) return; if (await senda({ action: 'nu', id, gildi: i.value }, t)) teikna(); return; }
      if (a === 'vid') { _sidastOpnad = id; const i = rot.querySelector(`input[data-skra="${id}"]`); if (i) i.click(); return; }
      if (a === 'vid-eyda') {
        e.preventDefault();
        if (!(await Confirm.show('Eyða þessu viðhengi? Það er ekki hægt að afturkalla.', { okText: 'Eyða', danger: true }))) return;
        if (await senda({ action: 'vidhengi_eyda', id, vid_id: t.dataset.vid }, t)) teikna();
      }
    });
    rot.addEventListener('change', async (e) => {
      const t = e.target;
      if (t.dataset && t.dataset.skref) { if (await senda({ action: 'skref', id: Number(t.dataset.id), skref_id: t.dataset.skref, done: t.checked })) teikna(); else t.checked = !t.checked; return; }
      if (t.dataset && t.dataset.skra && t.files && t.files.length) { const files = [...t.files]; t.value = ''; await hladaUpp(Number(t.dataset.skra), files); }
    });
  }

  // Ctrl+V: skjáskot límt inn á síðasta opnaða markmiðið (aðeins þegar Markmið er opin og eitthvert markmið er opið).
  document.addEventListener('paste', (e) => {
    const v = document.getElementById('view-markmid');
    if (!v || !v.classList.contains('active') || !_sidastOpnad || !_opin.has(_sidastOpnad)) return;
    const a = document.activeElement;
    if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && !(e.clipboardData && [...e.clipboardData.items].some((i) => i.kind === 'file'))) return;
    const files = [...((e.clipboardData && e.clipboardData.items) || [])].filter((i) => i.kind === 'file').map((i) => i.getAsFile()).filter(Boolean)
      .map((f, i) => (f.name && f.name !== 'image.png' ? f : new File([f], `Skjáskot ${stund(new Date().toISOString()).replace(/[/:]/g, '-')}${i ? '-' + i : ''}.png`, { type: f.type || 'image/png' })));
    if (!files.length) return;
    e.preventDefault();
    hladaUpp(_sidastOpnad, files);
  });

  // ── Síðan, valmyndin og leiðin ───────────────────────────────────────────────────────────────────────────────────
  if (!document.getElementById('view-markmid')) {
    const div = document.createElement('div');
    div.id = 'view-markmid';
    div.className = 'view';
    div.innerHTML = '<main class="main-panel" id="markmid-main" style="height:100%;overflow-y:auto;padding:24px 20px 60px"></main>';
    const eftir = document.getElementById('view-birgdir') || document.getElementById('view-bord');
    eftir ? eftir.after(div) : document.body.appendChild(div);
  }
  function setjaHnapp() {
    const nav = document.querySelector('.view-nav');
    if (!nav || nav.querySelector('[data-view="markmid"]')) return !!nav;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.dataset.view = 'markmid';
    btn.onclick = () => App.switchView('markmid');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg><span>Markmið</span>';
    // Á eftir Þjónustuborðinu (hnappurinn heitir verkbord í valmyndinni, sjá 368 festaHnapp). Röðin sjálf kemur úr
    // sidebar_order á þjóninum (68), þar sem „markmid" stendur á eftir „verkbord" — annars lenti síðan undir „Sjá meira".
    const bord = nav.querySelector('[data-view="verkbord"]') || nav.querySelector('[data-view="bord"]');
    bord ? bord.after(btn) : nav.appendChild(btn);
    return true;
  }
  if (!setjaHnapp()) { let n = 0; const t = setInterval(() => { if (setjaHnapp() || ++n > 40) clearInterval(t); }, 250); }

  (function patchSwitchView() {
    if (typeof App === 'undefined' || !App.switchView) { setTimeout(patchSwitchView, 200); return; }
    if (App.switchView._markmidPatch) return;
    const orig = App.switchView.bind(App);
    App.switchView = function (v) {
      if (v === 'markmid') {
        document.querySelectorAll('.view').forEach((el) => el.classList.remove('active'));
        document.querySelectorAll('.vnav-btn').forEach((el) => el.classList.toggle('active', el.dataset.view === 'markmid'));
        const el = document.getElementById('view-markmid');
        if (el) el.classList.add('active');
        document.dispatchEvent(new CustomEvent('view-shown', { detail: 'markmid' }));
        return;
      }
      return orig(v);
    };
    App.switchView._markmidPatch = true;
  })();

  document.addEventListener('view-shown', (e) => {
    if (e.detail !== 'markmid') return;
    teikna();
    hlada(true).then(teikna);
  });

  /* ── Eining 29 á Þjónustuborðinu (16.11.2026, Agnar: „Settu þetta í sér lista inn á þjónustuborðið. Hjá hinum sem er efst").
   * Sama mynstur og 369 (KrofuVinnugluggi): 368 kallar samantekt() / listi() / takkar() / festa(rót) og teiknar spjaldið.
   * Gögnin eru SÖMU og síðunnar (_gogn) — ein sókn. Opnir flokkar vistast á þjóninum (markmid_bord.by_staff.<nafn>.opid),
   * regla 15.10.2026: samanbrot er eins á öllum vélum. Smellur á markmið opnar það á síðunni Markmið. */
  const bordNafn = () => { try { return (window.BordStarfsmadur && BordStarfsmadur.get()) || 'Agnar'; } catch (_) { return 'Agnar'; } };
  const teiknaBord = () => { try { if (window.Thjonustubord5 && Thjonustubord5.render) Thjonustubord5.render(); } catch (_) {} };
  let _bordBid = null, _bordOpidBid = null;
  function bordTryggja(afl) {
    if ((_gogn || _villa) && !afl) return;
    if (_bordBid) return;
    _bordBid = hlada(!!afl).then(() => {
      _bordBid = null;
      teiknaBord();
      if (document.getElementById('markmid-main')) teikna();
    });
  }
  function bordOpid() {
    if (_bordOpidBid) return new Set(_bordOpidBid);
    let v = null;
    try { v = window.AppSettings && AppSettings.path ? AppSettings.path('markmid_bord.by_staff.' + bordNafn() + '.opid') : null; } catch (_) {}
    return new Set(Array.isArray(v) ? v : []);
  }
  async function bordOpidVista(set) {
    const listi = [...set];
    _bordOpidBid = listi;
    teiknaBord();
    let ok = false;
    try { ok = !!(await AppSettings.save({ markmid_bord: { by_staff: { [bordNafn()]: { opid: listi } } } })); } catch (_) {}
    if (_bordOpidBid === listi) _bordOpidBid = ok ? null : listi;
  }
  function bordHeild() {
    const mm = (_gogn && _gogn.markmid) || [];
    const f = mm.map((m) => m.framvinda).filter((x) => x != null);
    return { mm, heild: mm.length ? f.reduce((a, b) => a + b, 0) / mm.length : 0, lokid: mm.filter((m) => m.stada === 'lokid').length,
      osannreynd: mm.filter((m) => m.tegund === 'maelt' && m.sannreynt !== 'rett').length };
  }
  function bordSamantekt() {
    bordTryggja(false);
    if (_villa) return _villa.inn ? 'Innskráning vantar' : 'Náði ekki í markmiðin';
    if (!_gogn) return 'Sæki markmiðin…';
    const h = bordHeild();
    return pct(h.heild) + ' · ' + h.lokid + ' af ' + h.mm.length + ' lokið' + (h.osannreynd ? ' · ' + h.osannreynd + ' mælar ósannreyndir' : '') + (_bordBid ? ' · uppfæri…' : '');
  }
  const bordMaelir = (f, cls) => `<span class="mmb-bar${cls || ''}" role="img" aria-label="Framvinda ${pct(f)}"><i style="width:${f == null ? 0 : Math.max(2, Math.round(f * 100))}%"></i></span>`;
  function bordStutt(m) {
    if (m.tegund === 'skref' || m.upphaf == null) { const s = m.skref || []; return s.filter((x) => x.done).length + ' af ' + s.length + ' skrefum'; }
    return tala(m.nu) + ' ' + (m.maelieining || '') + ' · mark ' + tala(m.mark);
  }
  function bordListi() {
    if (_villa) return `<div class="mmb-tomt">${esc(_villa.texti)}</div>`;
    if (!_gogn) {
      // Staðgengill í sömu hæð og listinn (9 flokkar 16.11.2026) svo ekkert hoppi þegar gögnin lenda.
      return '<div class="mmb">' + Array.from({ length: 9 }, () => '<div class="mmb-fl mmb-fl--bid" aria-hidden="true"></div>').join('') + '</div>';
    }
    const opid = bordOpid(), mm = _gogn.markmid || [];
    return '<div class="mmb">' + (_gogn.flokkar || []).map((x) => {
      const o = opid.has(x.heiti);
      const lin = o ? mm.filter((m) => m.flokkur === x.heiti).map((m) => {
        const t = traustTexti(m);
        return `<button type="button" class="mmb-m" data-mmb="opna" data-id="${m.id}" title="Opna markmiðið á síðunni Markmið">
          <span class="mmb-mt"><span class="mmb-mn${m.stada === 'lokid' ? ' mmb-mn--lokid' : ''}">${esc(m.titill)}</span>
            <span class="mmb-ms"><span class="${m.versnad ? 'mmb-versnad' : ''}">${esc(bordStutt(m))}</span>${t ? `<span class="mmb-tr${m.sannreynt ? ' mmb-tr--' + m.sannreynt : ''}">${esc(t)}</span>` : ''}</span></span>
          ${bordMaelir(m.framvinda, m.framvinda == null ? ' mmb-bar--byrjun' : m.versnad ? ' mmb-bar--lagt' : '')}<span class="mmb-pct">${pct(m.framvinda)}</span></button>`;
      }).join('') : '';
      return `<button type="button" class="mmb-fl" data-mmb="fl" data-fl="${esc(x.heiti)}" aria-expanded="${o}">
          <span class="mmb-fn">${esc(x.heiti)}</span><span class="mmb-fs">${x.lokid} af ${x.fjoldi} lokið</span>
          ${bordMaelir(x.framvinda)}<span class="mmb-pct">${pct(x.framvinda)}</span><span class="mmb-chev" aria-hidden="true">${o ? '▴' : '▾'}</span></button>${o ? `<div class="mmb-ml">${lin}</div>` : ''}`;
    }).join('') + '</div>';
  }
  function bordTakkar() {
    return '<button type="button" class="btn iv sm tog" data-mmb="uppf" title="Sækja nýjustu stöðu" aria-label="Uppfæra markmiðin">↻</button>' +
      '<button type="button" class="btn gold sm" data-mmb="sida">Markmið ›</button>';
  }
  function bordCss() {
    return [
      '.mmb{display:flex;flex-direction:column}',
      '.mmb-fl{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(90px,180px) 44px 18px;align-items:center;gap:10px;width:100%;min-height:44px;padding:8px 14px;border:0;border-top:1px solid var(--rule2);background:none;font:inherit;color:inherit;text-align:left;cursor:pointer}',
      '.mmb-fl:hover{background:rgba(241,237,228,.55)}',
      '.mmb-fl:focus-visible,.mmb-m:focus-visible{outline:2px solid var(--g6);outline-offset:-2px}',
      '.mmb-fl--bid{cursor:default;background:linear-gradient(90deg,rgba(0,0,0,.025),rgba(0,0,0,.06),rgba(0,0,0,.025))}',
      '.mmb-fn{font-size:13.5px;font-weight:700;min-width:0;overflow-wrap:anywhere}',
      '.mmb-fs{font-family:var(--mono);font-size:11px;color:var(--mute);white-space:nowrap}',
      '.mmb-bar{display:block;height:8px;border-radius:4px;background:#dfe3e8;box-shadow:inset 0 1px 2px rgba(0,0,0,.18);overflow:hidden}',
      '.mmb-bar i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#0e5a2e,#16783f)}',
      '.mmb-bar--byrjun i{background:#c8ccd2}.mmb-bar--lagt i{background:linear-gradient(90deg,#8a1c12,#b42318)}',
      '.mmb-pct{font-family:var(--mono);font-size:12.5px;font-weight:700;text-align:right;font-variant-numeric:tabular-nums}',
      '.mmb-chev{font-size:12px;color:var(--mute);text-align:center}',
      '.mmb-ml{display:flex;flex-direction:column;background:rgba(250,248,243,.7);border-top:1px dashed var(--rule2)}',
      '.mmb-m{display:grid;grid-template-columns:minmax(0,1fr) minmax(70px,140px) 44px;align-items:center;gap:10px;width:100%;min-height:44px;padding:7px 14px 7px 26px;border:0;border-top:1px solid rgba(0,0,0,.05);background:none;font:inherit;color:inherit;text-align:left;cursor:pointer}',
      '.mmb-m:hover .mmb-mn{text-decoration:underline;text-decoration-color:var(--g6);text-underline-offset:3px}',
      '.mmb-mt{display:flex;flex-direction:column;gap:2px;min-width:0}',
      '.mmb-mn{font-size:13px;font-weight:600;overflow-wrap:anywhere}.mmb-mn--lokid{text-decoration:line-through;color:var(--mute)}',
      '.mmb-ms{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-family:var(--mono);font-size:11px;color:var(--ink2)}',
      '.mmb-versnad{color:#8a1c12;font-weight:700}',
      '.mmb-tr{font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:1px 5px;border-radius:2px;border:1px dashed #8f98a8;color:#3a4250}',
      '.mmb-tr--rett{border:1px solid rgba(22,120,63,.45);color:#0e5a2e;background:#eef8f1}',
      '.mmb-tr--rangt{border:1px solid rgba(180,35,24,.5);color:#8a1c12;background:#fff3f1}',
      '.mmb-tr--oljost{border:1px solid rgba(160,110,20,.5);color:#6b4a0c;background:#fff8e6}',
      '.mmb-tomt{padding:12px 14px;font-size:13px;color:var(--mute)}',
      '@media (max-width:720px){.mmb-fl{grid-template-columns:minmax(0,1fr) 44px 18px;row-gap:4px}.mmb-fl .mmb-fs{grid-column:1;grid-row:2}.mmb-fl .mmb-bar{grid-column:1/-1;grid-row:3}' +
        '.mmb-m{grid-template-columns:minmax(0,1fr) 44px;padding-left:18px}.mmb-m .mmb-bar{grid-column:1/-1;grid-row:2}}'
    ].join('');
  }
  function bordFesta(root) {
    if (!root) return;
    if (!root.querySelector('#mmb-still')) {
      const st = document.createElement('style');
      st.id = 'mmb-still';
      st.textContent = bordCss();
      root.appendChild(st);
    }
    if (root.__mmbFest) return;
    root.__mmbFest = true;
    root.addEventListener('click', (e) => {
      const el = e.target && e.target.closest ? e.target.closest('[data-mmb]') : null;
      if (!el) return;
      const a = el.dataset.mmb;
      if (a === 'fl') { const o = bordOpid(), h = el.dataset.fl; if (o.has(h)) o.delete(h); else o.add(h); bordOpidVista(o); return; }
      if (a === 'uppf') { bordTryggja(true); teiknaBord(); return; }
      if (a === 'sida') { App.switchView('markmid'); return; }
      if (a === 'opna') opnaMarkmid(Number(el.dataset.id));
    });
  }
  function opnaMarkmid(id) {
    if (!id) return;
    _opin.add(id);
    _sidastOpnad = id;
    _hoppaTil = id;
    App.switchView('markmid');
  }

  window.MarkmidBord = { version: '508b', samantekt: bordSamantekt, listi: bordListi, takkar: bordTakkar, festa: bordFesta, uppfaera: () => { bordTryggja(true); teiknaBord(); } };
  // 368 kann að hafa teiknað borðið áður en þessi skrá hlóðst („Ekki hlaðið“) — teikna einu sinni aftur ef borðið er sýnilegt.
  { const vb = document.getElementById('view-bord'); if (vb && vb.offsetParent !== null) teiknaBord(); }
  window.Markmid = { teikna, hlada: () => hlada(true).then(teikna), opna: opnaMarkmid };
})();
