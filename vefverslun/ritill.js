// Breytingahamur vefverslunarinnar (prufuhamur). Hleðst aðeins meðan verslunin er í prufu eða með ?breyta=1.
//
//   Efri slá: staða (prufa/virk) · síðuval · Breyta · Þema · Vörur · afturkalla/endurgera · forskoða · vistun · Virkja
//   Smelltu á texta → skrifaðu beint í hann; spjaldið hægra megin stillir letur, stærð, þykkt, lit, jöfnun, línubil
//   Smelltu á mynd → skipta (upphleðsla, slóð, myndasafn, draga skrá á myndina), Heil mynd / Fylla ramma, hæð og
//   breidd ramma (líka með handfanginu í horninu), staðsetning, aðdráttur, bakgrunnur, rúnun
//   Smelltu á auðan flöt í kafla → fela kaflann eða lita bakgrunninn
//   Ctrl+smellur fer í tengil eins og venjulega. Ctrl+Z / Ctrl+Y afturkalla og endurgera.
//
// Allt fer í VV.efni og vistast sjálfkrafa sem drög (/api/vefverslun, adgerd 'vista', bjartsýn læsing).
// „Virkja" afritar drögin í virku útgáfuna sem almenningur sér.
(() => {
  'use strict';
  const VV = window.VV;
  if (!VV || VV._ritill) return;
  VV._ritill = true;
  const { esc, num, okLitur, LETUR, THEMA0, STADIR } = VV;

  const R = { val: null, saga: [], fram: [], sidastaSaga: 0, sidastiLykill: '', vistT: null, vistar: false, ovistad: false, villa: '', vistadKl: null, spjald: 'val', forskoda: false, allar: null, breytir: null, endurhladaVorur: false };
  const hluti = (n) => { if (!VV.efni[n] || typeof VV.efni[n] !== 'object' || Array.isArray(VV.efni[n])) VV.efni[n] = {}; return VV.efni[n]; };
  const klst = (d) => { const x = d ? new Date(d) : new Date(); return String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); };
  const sel = (teg, k) => `#vv-app [data-${teg}="${CSS.escape(k)}"]`;

  // ── Útlit ritilsins (eigin litir, ekki þema verslunarinnar) ───────────────
  const css = `
body.vvr-a{padding-top:52px}
@media (min-width:1180px){body.vvr-spjald-a{margin-right:340px}}
.vvr,.vvr *{box-sizing:border-box}
.vvr{font:14px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#0f172a}
#vvr-bar{position:fixed;top:0;left:0;right:0;height:52px;z-index:1000;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;gap:6px;padding:0 10px;overflow-x:auto;scrollbar-width:none}
#vvr-bar button,#vvr-bar select{flex:none;height:34px;border-radius:8px;border:1px solid #334155;background:#1e293b;color:#e2e8f0;padding:0 11px;font:500 13px system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
#vvr-bar select{max-width:210px}
#vvr-bar button:hover{border-color:#64748b}
#vvr-bar button[aria-pressed=true]{background:#2563eb;border-color:#2563eb;color:#fff}
#vvr-bar button:disabled{opacity:.4;cursor:default}
#vvr-bar .vvr-adal{background:#ff4001;border-color:#ff4001;color:#fff;font-weight:600}
#vvr-bar svg{width:16px;height:16px;fill:currentColor}
.vvr-merki{flex:none;font:700 10.5px system-ui;letter-spacing:.08em;padding:5px 8px;border-radius:6px;background:#f59e0b;color:#111827}
.vvr-merki.virk{background:#22c55e}
.vvr-stada{flex:none;font-size:12px;color:#94a3b8;white-space:nowrap}
.vvr-vistun{flex:none;font-size:12px;color:#94a3b8;white-space:nowrap;min-width:92px;text-align:right}
.vvr-vistun.villa{color:#fca5a5}
.vvr-bil{flex:1 0 8px}
#vvr-spjald{position:fixed;top:52px;right:0;bottom:0;width:340px;z-index:999;background:#fff;border-left:1px solid #e2e8f0;overflow:auto;box-shadow:-14px 0 30px -24px rgba(15,23,42,.5)}
@media (max-width:700px){#vvr-spjald{top:auto;left:0;width:auto;height:56vh;border-left:0;border-top:1px solid #e2e8f0;border-radius:14px 14px 0 0}}
.vvr-haus{position:sticky;top:0;background:#fff;z-index:1;padding:14px 16px 10px;border-bottom:1px solid #eef2f7;display:flex;gap:8px;align-items:flex-start}
.vvr-haus b{display:block;font-size:15px}
.vvr-haus code{display:block;font:11.5px ui-monospace,Consolas,monospace;color:#64748b;word-break:break-all;margin-top:2px}
.vvr-haus .vvr-x{margin-left:auto;flex:none;width:30px;height:30px;border-radius:8px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font-size:16px;line-height:1}
.vvr-kafli{padding:12px 16px;border-bottom:1px solid #f1f5f9;display:flex;flex-direction:column;gap:10px}
.vvr-kafli>h4{margin:0;font:600 11.5px system-ui;letter-spacing:.06em;text-transform:uppercase;color:#64748b}
.vvr-rod{display:grid;grid-template-columns:92px 1fr;gap:8px;align-items:center}
.vvr-rod>label{font-size:13px;color:#334155}
.vvr-samsett{display:flex;gap:6px;align-items:center;min-width:0}
.vvr-samsett input[type=range]{flex:1;min-width:0;accent-color:#2563eb}
.vvr-samsett input[type=number]{width:62px}
.vvr input[type=text],.vvr input[type=number],.vvr select,.vvr textarea{width:100%;padding:7px 9px;border:1px solid #cbd5e1;border-radius:8px;font:13.5px system-ui,sans-serif;color:#0f172a;background:#fff}
.vvr textarea{min-height:84px;resize:vertical;line-height:1.45}
.vvr input:focus,.vvr select:focus,.vvr textarea:focus{outline:2px solid #2563eb;outline-offset:0;border-color:#2563eb}
.vvr-hnappar{display:flex;flex-wrap:wrap;gap:6px}
.vvr-h{height:32px;padding:0 11px;border-radius:8px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;font:500 13px system-ui,sans-serif;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.vvr-h:hover{border-color:#64748b}
.vvr-h[aria-pressed=true]{background:#0f172a;border-color:#0f172a;color:#fff}
.vvr-h.blar{background:#2563eb;border-color:#2563eb;color:#fff}
.vvr-h.raudur{color:#b91c1c;border-color:#fecaca}
.vvr-h.lit{padding:0 6px}
.vvr-litir{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.vvr-lit{width:26px;height:26px;border-radius:7px;border:1px solid rgba(15,23,42,.18);cursor:pointer;padding:0}
.vvr-lit[aria-pressed=true]{outline:2px solid #2563eb;outline-offset:2px}
.vvr-lit.ekkert{background:linear-gradient(135deg,#fff 45%,#ef4444 47%,#ef4444 53%,#fff 55%)}
.vvr input[type=color]{width:34px;height:28px;padding:0;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer}
.vvr-hint{font-size:12px;color:#64748b;margin:0}
.vvr-forsyn{height:120px;border-radius:10px;background:#f1f5f9 center/contain no-repeat;border:1px solid #e2e8f0}
.vvr-safn{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;max-height:220px;overflow:auto}
.vvr-safn button{height:58px;border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc center/cover no-repeat;cursor:pointer;padding:0}
.vvr-safn button.vara{background-size:contain;background-color:#fff}
.vvr-safn button:hover{outline:2px solid #2563eb}
.vvr-stadir{display:grid;grid-template-columns:repeat(3,26px);gap:4px}
.vvr-stadir button{width:26px;height:26px;border-radius:6px;border:1px solid #cbd5e1;background:#fff;cursor:pointer;padding:0}
.vvr-stadir button[aria-pressed=true]{background:#2563eb;border-color:#2563eb}
.vvr-vorulisti{display:flex;flex-direction:column;gap:2px}
.vvr-vorulisti h5{margin:10px 0 4px;font:600 12px system-ui;color:#64748b}
.vvr-vorulisti label{display:grid;grid-template-columns:20px 1fr auto;gap:8px;align-items:center;padding:5px 4px;border-radius:6px;font-size:13px;cursor:pointer}
.vvr-vorulisti label:hover{background:#f8fafc}
.vvr-vorulisti small{color:#64748b;font-variant-numeric:tabular-nums}
.vvr-tomt{padding:22px 16px;color:#475569;font-size:13.5px;line-height:1.6}
.vvr-tomt ul{margin:8px 0 0;padding-left:18px}
body.vv-ritill-a #vv-app .vvr-yfir{outline:2px dashed #2563eb;outline-offset:3px;cursor:pointer}
body.vv-ritill-a #vv-app [data-e].vvr-yfir{cursor:text}
body.vv-ritill-a #vv-app [data-b].vvr-yfir{outline-color:#94a3b8;outline-offset:-2px}
body.vv-ritill-a #vv-app .vvr-valid{outline:2px solid #2563eb!important;outline-offset:3px}
body.vv-ritill-a #vv-app [data-b].vvr-valid{outline:2px solid #64748b!important;outline-offset:-2px}
body.vv-ritill-a #vv-app .vvr-drop{outline:3px dashed #16a34a!important;outline-offset:-3px}
#vv-app [contenteditable]{outline:2px solid #2563eb!important;outline-offset:3px;background:rgba(37,99,235,.07);white-space:pre-wrap;cursor:text;-webkit-user-modify:read-write-plaintext-only}
#vvr-handfang{position:fixed;z-index:998;width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45);cursor:nwse-resize;touch-action:none;display:none}
#vvr-merkimidi{position:fixed;z-index:998;pointer-events:none;background:#2563eb;color:#fff;font:600 11px system-ui;padding:3px 7px;border-radius:5px;display:none;white-space:nowrap}
.vvr-hula{position:fixed;inset:0;z-index:1100;background:rgba(15,23,42,.45);display:grid;place-items:center;padding:16px}
.vvr-gluggi{background:#fff;border-radius:14px;max-width:440px;width:100%;padding:22px;box-shadow:0 30px 60px -20px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:12px}
.vvr-gluggi h3{margin:0;font:600 18px system-ui}
.vvr-gluggi p{margin:0;color:#334155;line-height:1.55}
.vvr-gluggi .vvr-hnappar{justify-content:flex-end;margin-top:6px}
.vvr-gluggi ul{margin:0;padding:0;list-style:none;max-height:300px;overflow:auto;display:flex;flex-direction:column;gap:4px}
.vvr-valmynd{position:fixed;top:48px;z-index:1050;background:#fff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 18px 40px -16px rgba(15,23,42,.45);padding:6px;display:flex;flex-direction:column;min-width:230px}
.vvr-valmynd button{text-align:left;border:0;background:none;padding:9px 10px;border-radius:7px;font:13.5px system-ui;cursor:pointer;color:#0f172a}
.vvr-valmynd button:hover{background:#f1f5f9}
.vvr-forskodun{position:fixed;right:14px;bottom:14px;z-index:1000;height:38px;padding:0 14px;border-radius:999px;border:0;background:#0f172a;color:#fff;font:600 13px system-ui;cursor:pointer;box-shadow:0 10px 24px -10px rgba(0,0,0,.5)}
`;
  const stillTag = document.createElement('style');
  stillTag.textContent = css;
  document.head.appendChild(stillTag);

  const SVG = {
    blyantur: 'M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z',
    afturkalla: 'M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z',
    endurgera: 'M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z',
    auga: 'M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z',
    meira: 'M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128ZM196,116a12,12,0,1,0,12,12A12,12,0,0,0,196,116ZM60,116a12,12,0,1,0,12,12A12,12,0,0,0,60,116Z',
    palletta: 'M200.77,53.89A103.27,103.27,0,0,0,128,24h-1.07A104,104,0,0,0,24,128c0,43,26.58,79.06,69.36,94.17A32,32,0,0,0,136,192a16,16,0,0,1,16-16h46.21a31.81,31.81,0,0,0,31.2-24.88,104.43,104.43,0,0,0,2.59-24A103.28,103.28,0,0,0,200.77,53.89ZM84,168a12,12,0,1,1,12-12A12,12,0,0,1,84,168Zm0-56a12,12,0,1,1,12-12A12,12,0,0,1,84,112Zm44-24a12,12,0,1,1,12-12A12,12,0,0,1,128,88Zm44,24a12,12,0,1,1,12-12A12,12,0,0,1,172,112Z',
    listi: 'M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128ZM40,72H216a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16ZM216,184H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z',
  };
  const ic = (n) => `<svg viewBox="0 0 256 256" aria-hidden="true"><path d="${SVG[n]}"/></svg>`;

  // ── Efri slá ────────────────────────────────────────────────────────────
  const bar = document.createElement('div');
  bar.id = 'vvr-bar';
  bar.className = 'vvr';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Breytingahamur vefverslunar');
  document.body.prepend(bar);
  document.body.classList.add('vvr-a');
  const spjald = document.createElement('aside');
  spjald.id = 'vvr-spjald';
  spjald.className = 'vvr';
  spjald.hidden = true;
  document.body.appendChild(spjald);
  const handfang = document.createElement('div');
  handfang.id = 'vvr-handfang';
  handfang.title = 'Dragðu til að stækka eða minnka rammann';
  document.body.appendChild(handfang);
  const merkimidi = document.createElement('div');
  merkimidi.id = 'vvr-merkimidi';
  document.body.appendChild(merkimidi);

  function teiknaSla() {
    const virk = VV.stada === 'virk';
    const sidur = [['#/', 'Verslun (forsíða)']].concat(VV.synilegar().map((v) => ['#/vara/' + v.id, (VV.efni.t && VV.efni.t[`vara.${v.id}.nafn`] && VV.efni.t[`vara.${v.id}.nafn`].x) || v.nafn]), [['#/karfa', 'Karfa']]);
    const nu = location.hash || '#/';
    bar.innerHTML = `<span class="vvr-merki${virk ? ' virk' : ''}">${virk ? 'VIRK' : 'PRUFUÚTGÁFA'}</span>
<span class="vvr-stada">${virk ? 'Útgáfa ' + VV.utgafa + (VV.virkjad ? ' · virkjuð ' + new Date(VV.virkjad).toLocaleDateString('is-IS') : '') : 'Ekki virk · aðeins drög'}</span>
<select data-r="sida" aria-label="Síða">${sidur.map(([h, n]) => `<option value="${esc(h)}"${h === nu ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
<button type="button" data-r="breyta" aria-pressed="${VV.ritill}">${ic('blyantur')}Breyta</button>
<button type="button" data-r="thema" aria-pressed="${VV.ritill && R.spjald === 'thema'}">${ic('palletta')}Þema</button>
<button type="button" data-r="vorur" aria-pressed="${VV.ritill && R.spjald === 'vorur'}">${ic('listi')}Vörur</button>
<button type="button" data-r="afturkalla" title="Afturkalla (Ctrl+Z)" aria-label="Afturkalla"${R.saga.length ? '' : ' disabled'}>${ic('afturkalla')}</button>
<button type="button" data-r="endurgera" title="Endurgera (Ctrl+Y)" aria-label="Endurgera"${R.fram.length ? '' : ' disabled'}>${ic('endurgera')}</button>
<button type="button" data-r="forskoda">${ic('auga')}Forskoða</button>
<span class="vvr-bil"></span>
<span class="vvr-vistun${R.villa ? ' villa' : ''}" role="status">${R.villa ? esc(R.villa) : R.vistar ? 'Vistar…' : R.ovistad ? 'Óvistað' : R.vistadKl ? 'Vistað ' + R.vistadKl : 'Drög'}</span>
<button type="button" data-r="meira" aria-label="Fleiri aðgerðir">${ic('meira')}</button>
<button type="button" class="vvr-adal" data-r="virkja">${virk ? 'Birta breytingar' : 'Virkja verslun'}</button>`;
  }

  function stadaVistunar() {
    const s = bar.querySelector('.vvr-vistun');
    if (!s) return;
    s.className = 'vvr-vistun' + (R.villa ? ' villa' : '');
    s.textContent = R.villa || (R.vistar ? 'Vistar…' : R.ovistad ? 'Óvistað' : R.vistadKl ? 'Vistað ' + R.vistadKl : 'Drög');
    const a = bar.querySelector('[data-r="afturkalla"]'); if (a) a.disabled = !R.saga.length;
    const f = bar.querySelector('[data-r="endurgera"]'); if (f) f.disabled = !R.fram.length;
  }

  // ── Saga (afturkalla / endurgera) og vistun ──────────────────────────────
  function skraSogu(lykill) {
    const nu = Date.now();
    if (lykill && lykill === R.sidastiLykill && nu - R.sidastaSaga < 900) { R.sidastaSaga = nu; return; }
    R.saga.push(JSON.stringify(VV.efni));
    if (R.saga.length > 120) R.saga.shift();
    R.fram = [];
    R.sidastiLykill = lykill || '';
    R.sidastaSaga = nu;
  }
  function breytt() {
    R.ovistad = true;
    R.villa = '';
    stadaVistunar();
    clearTimeout(R.vistT);
    R.vistT = setTimeout(vista, 900);
  }
  async function vista(yfirskrifa) {
    clearTimeout(R.vistT);
    if (R.vistar) { R.vistT = setTimeout(vista, 400); return; }
    R.vistar = true; R.ovistad = false; stadaVistunar();
    try {
      const r = await fetch(VV.API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adgerd: 'vista', efni: VV.efni, grunnur: yfirskrifa ? undefined : VV.drog_uppfaert }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 409) { R.vistar = false; arekstur(d); return; }
      if (r.status === 401) throw new Error('Innskráning starfsmanns vantar');
      if (!r.ok) throw new Error(d.error || 'Villa ' + r.status);
      VV.drog_uppfaert = d.drog_uppfaert;
      R.vistadKl = klst();
      if (R.endurhladaVorur) {
        R.endurhladaVorur = false;
        const s = await fetch(VV.API + '?drog=1', { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
        if (s && s.vorur) { VV.vorur = s.vorur; VV.render(false); teiknaSla(); }
      }
    } catch (e) {
      R.villa = 'Vistun mistókst: ' + e.message;
      R.ovistad = true;
    }
    R.vistar = false;
    stadaVistunar();
  }
  function arekstur(d) {
    gluggi(`<h3>Önnur tölva vistaði breytingar</h3><p>Einhver vistaði drög verslunarinnar á meðan þú varst að breyta. Viltu sækja þeirra útgáfu eða skrifa yfir hana með þinni?</p>`,
      [['Sækja þeirra', async () => { VV.efni = d.drog || {}; VV.drog_uppfaert = d.drog_uppfaert; R.saga = []; R.fram = []; VV.beitaThema(); VV.render(false); teiknaSpjald(); R.vistadKl = klst(); stadaVistunar(); }],
        ['Skrifa yfir með minni', () => vista(true), 'blar']]);
  }
  window.addEventListener('pagehide', () => {
    if (!R.ovistad) return;
    try { fetch(VV.API, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adgerd: 'vista', efni: VV.efni, grunnur: VV.drog_uppfaert }) }); } catch (_) {}
  });
  function afturkalla() {
    if (!R.saga.length) return;
    lokaTexta();
    R.fram.push(JSON.stringify(VV.efni));
    VV.efni = JSON.parse(R.saga.pop());
    R.sidastiLykill = '';
    VV.beitaThema(); VV.render(false); teiknaSpjald(); breytt();
  }
  function endurgera() {
    if (!R.fram.length) return;
    lokaTexta();
    R.saga.push(JSON.stringify(VV.efni));
    VV.efni = JSON.parse(R.fram.pop());
    R.sidastiLykill = '';
    VV.beitaThema(); VV.render(false); teiknaSpjald(); breytt();
  }

  // ── Gögn: textar, stílar, myndir, kaflar, tölur ──────────────────────────
  const tO = (k, buatil) => { const t = hluti('t'); if (!t[k] && buatil) t[k] = {}; return t[k] || {}; };
  const textiNu = (k) => { const o = (VV.efni.t || {})[k]; return o && typeof o.x === 'string' ? o.x : VV.sjg[k] != null ? VV.sjg[k] : ''; };
  function hreinsaT(k) {
    const t = hluti('t'), o = t[k];
    if (!o) return;
    if (o.s && !Object.keys(o.s).length) delete o.s;
    if (!o.fela) delete o.fela;
    if (!Object.keys(o).length) delete t[k];
  }
  function setjaTexta(k, x) {
    skraSogu('x:' + k);
    const o = tO(k, true);
    if (x === VV.sjg[k]) delete o.x; else o.x = x;
    hreinsaT(k);
    document.querySelectorAll(sel('e', k)).forEach((el) => { if (el !== R.breytir) el.innerHTML = VV.md(textiNu(k)); });
    breytt();
  }
  function setjaStil(k, p, v) {
    skraSogu('s:' + k + p);
    const o = tO(k, true);
    o.s = o.s || {};
    if (v === '' || v == null) delete o.s[p]; else o.s[p] = v;
    hreinsaT(k);
    const st = VV.stillStr((VV.efni.t[k] || {}).s);
    document.querySelectorAll(sel('e', k)).forEach((el) => { if (st) el.setAttribute('style', st); else el.removeAttribute('style'); });
    breytt();
  }
  function felaTexta(k, f) {
    skraSogu();
    const o = tO(k, true);
    o.fela = !!f;
    hreinsaT(k);
    document.querySelectorAll(sel('e', k)).forEach((el) => el.classList.toggle('vv-falid', !!f));
    breytt();
  }
  function endurstillaTexta(k) {
    skraSogu();
    delete hluti('t')[k];
    VV.render(false);
    breytt();
  }
  function uppfaeraRamma(k) {
    document.querySelectorAll(sel('m', k)).forEach((el) => {
      const s = VV.mStill(k, el.dataset.ms || null);
      if (s.ramma) el.setAttribute('style', s.ramma); else el.removeAttribute('style');
      el.classList.toggle('vv-falid', s.fela);
      el.classList.toggle('tomt', !s.src);
      let img = el.querySelector('img');
      if (s.src) {
        if (!img) { img = document.createElement('img'); img.alt = ''; el.appendChild(img); }
        if (img.getAttribute('src') !== s.src) img.setAttribute('src', s.src);
        img.setAttribute('style', s.mynd);
      } else if (img) img.remove();
    });
    stadsetjaHandfang();
  }
  function setjaMynd(k, p, v, samfellt) {
    skraSogu(samfellt ? 'm:' + k + p : '');
    const m = hluti('m');
    const o = m[k] || (m[k] = {});
    if (v === '' || v == null) delete o[p]; else o[p] = v;
    if (!Object.keys(o).length) delete m[k];
    uppfaeraRamma(k);
    breytt();
  }
  function setjaMyndSrc(ms, url) {
    skraSogu();
    const m = hluti('m');
    const o = m[ms] || (m[ms] = {});
    if (url) o.src = url; else delete o.src;
    if (!Object.keys(o).length) delete m[ms];
    VV.render(false);
    breytt();
  }
  function endurstillaMynd(k) {
    skraSogu();
    delete hluti('m')[k];
    VV.render(false);
    breytt();
  }
  function setjaKafla(k, p, v) {
    skraSogu();
    const b = hluti('b');
    const o = b[k] || (b[k] = {});
    if (v === '' || v == null || v === false) delete o[p]; else o[p] = v;
    if (!Object.keys(o).length) delete b[k];
    VV.render(false);
    breytt();
  }
  function setjaTolu(k, v, samfellt) {
    skraSogu(samfellt ? 'n:' + k : '');
    const n = hluti('n');
    if (v === '' || v == null) delete n[k]; else n[k] = v;
    VV.render(false);
    breytt();
  }

  // ── Val og bein textabreyting ────────────────────────────────────────────
  function leysaUpp(t) {
    if (!t || !t.closest) return null;
    const app = document.getElementById('vv-app');
    if (!app.contains(t)) return null;
    const el = t.closest('[data-e],[data-m],[data-n]');
    if (el && app.contains(el)) return el;
    if (t.closest('[data-act],input,select,textarea,label')) return null;
    const b = t.closest('[data-b]');
    return b && app.contains(b) ? b : null;
  }
  function tegund(el) { return el.dataset.e != null ? 'e' : el.dataset.m != null ? 'm' : el.dataset.n != null ? 'n' : 'b'; }

  function velja(el) {
    lokaTexta();
    const teg = tegund(el);
    R.val = { teg, k: el.dataset[teg], ms: el.dataset.ms || null, fast: el.dataset.fast === '1', max: num(el.dataset.max, 10), min: num(el.dataset.min, 0), sjg: num(el.dataset.sjg, 0) };
    R.spjald = 'val';
    merkja();
    if (teg === 'e') hefjaTexta(el);
    teiknaSla();
    teiknaSpjald();
  }
  function afvelja() {
    lokaTexta();
    R.val = null;
    merkja();
    teiknaSpjald();
  }
  function merkja() {
    document.querySelectorAll('#vv-app .vvr-valid').forEach((e) => e.classList.remove('vvr-valid'));
    if (R.val) document.querySelectorAll(sel(R.val.teg, R.val.k)).forEach((e) => e.classList.add('vvr-valid'));
    stadsetjaHandfang();
  }
  function hefjaTexta(el) {
    R.breytir = el;
    el.textContent = textiNu(R.val.k);
    try { el.setAttribute('contenteditable', 'plaintext-only'); if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true'); } catch (_) { el.setAttribute('contenteditable', 'true'); }
    el.spellcheck = true;
    el.focus({ preventScroll: true });
    const r = document.createRange();
    r.selectNodeContents(el);
    r.collapse(false);
    const s = window.getSelection();
    s.removeAllRanges(); s.addRange(r);
  }
  function lokaTexta() {
    const el = R.breytir;
    if (!el) return;
    R.breytir = null;
    el.removeAttribute('contenteditable');
    const k = el.dataset.e;
    if (k != null) el.innerHTML = VV.md(textiNu(k));
  }
  document.addEventListener('input', (e) => {
    if (!R.breytir || e.target !== R.breytir) return;
    const x = R.breytir.innerText.replace(/ /g, ' ').replace(/\n$/, '');
    setjaTexta(R.val.k, x);
    const ta = spjald.querySelector('[data-r="x"]');
    if (ta && ta.value !== x) ta.value = x;
  }, true);
  document.addEventListener('keydown', (e) => {
    if (R.breytir && e.target === R.breytir) {
      if (e.key === 'Enter' && !e.shiftKey && !/^(P|LI|TD)$/.test(R.breytir.tagName)) { e.preventDefault(); R.breytir.blur(); lokaTexta(); }
      else if (e.key === 'Escape') { e.preventDefault(); afvelja(); }
      return;
    }
    if (!VV.ritill) return;
    const iReit = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '');
    if ((e.ctrlKey || e.metaKey) && !iReit && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); afturkalla(); }
    else if ((e.ctrlKey || e.metaKey) && !iReit && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); endurgera(); }
    else if (e.key === 'Escape' && R.val) afvelja();
  });
  document.addEventListener('paste', (e) => {
    if (!R.breytir || e.target !== R.breytir) return;
    e.preventDefault();
    const x = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, x);
  }, true);

  document.addEventListener('click', (e) => {
    if (!VV.ritill || R.forskoda) return;
    if (e.target.closest('.vvr,.vvr-hula,.vvr-valmynd')) return;
    if (e.ctrlKey || e.metaKey) return;
    if (R.breytir && R.breytir.contains(e.target)) { e.preventDefault(); e.stopPropagation(); return; }
    const el = leysaUpp(e.target);
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    velja(el);
  }, true);
  let yfir = null;
  document.addEventListener('mouseover', (e) => {
    if (!VV.ritill || R.forskoda) return;
    const el = leysaUpp(e.target);
    if (el === yfir) return;
    if (yfir) yfir.classList.remove('vvr-yfir');
    yfir = el;
    if (el) {
      el.classList.add('vvr-yfir');
      const r = el.getBoundingClientRect();
      merkimidi.textContent = heitiLykils(tegund(el), el.dataset[tegund(el)]);
      merkimidi.style.display = 'block';
      merkimidi.style.left = Math.max(4, r.left) + 'px';
      merkimidi.style.top = Math.max(56, r.top - 22) + 'px';
    } else merkimidi.style.display = 'none';
  });

  // Draga mynd beint á myndaramma
  document.addEventListener('dragover', (e) => {
    if (!VV.ritill) return;
    const el = e.target.closest && e.target.closest('#vv-app [data-m]');
    if (!el) return;
    e.preventDefault();
    document.querySelectorAll('.vvr-drop').forEach((x) => x !== el && x.classList.remove('vvr-drop'));
    el.classList.add('vvr-drop');
  });
  document.addEventListener('dragleave', (e) => { const el = e.target.closest && e.target.closest('[data-m]'); if (el) el.classList.remove('vvr-drop'); });
  document.addEventListener('drop', async (e) => {
    if (!VV.ritill) return;
    const el = e.target.closest && e.target.closest('#vv-app [data-m]');
    if (!el) return;
    e.preventDefault();
    el.classList.remove('vvr-drop');
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    velja(el);
    await skiptaUmMynd(f);
  });

  // ── Handfang til að stækka/minnka myndaramma ─────────────────────────────
  function stadsetjaHandfang() {
    const v = R.val;
    if (!VV.ritill || R.forskoda || !v || v.teg !== 'm' || v.fast) { handfang.style.display = 'none'; return; }
    const el = document.querySelector(sel('m', v.k) + '.vvr-valid') || document.querySelector(sel('m', v.k));
    if (!el) { handfang.style.display = 'none'; return; }
    const r = el.getBoundingClientRect();
    if (r.bottom < 52 || r.top > innerHeight) { handfang.style.display = 'none'; return; }
    handfang.style.display = 'block';
    handfang.style.left = r.right - 9 + 'px';
    handfang.style.top = r.bottom - 9 + 'px';
    handfang._el = el;
  }
  addEventListener('scroll', stadsetjaHandfang, { passive: true });
  addEventListener('resize', stadsetjaHandfang);
  handfang.addEventListener('pointerdown', (e) => {
    const el = handfang._el;
    if (!el || !R.val) return;
    e.preventDefault();
    handfang.setPointerCapture(e.pointerId);
    const k = R.val.k, x0 = e.clientX, y0 = e.clientY, h0 = el.offsetHeight;
    const foreldri = el.parentElement.getBoundingClientRect().width || 1;
    const w0 = (el.getBoundingClientRect().width / foreldri) * 100;
    skraSogu();
    const hreyfa = (ev) => {
      const m = hluti('m'); const o = m[k] || (m[k] = {});
      o.h = Math.round(Math.min(1400, Math.max(40, h0 + (ev.clientY - y0))));
      const w = Math.round(Math.min(100, Math.max(15, w0 + ((ev.clientX - x0) / foreldri) * 100)));
      if (w >= 99) delete o.w; else o.w = w;
      uppfaeraRamma(k);
      const s = spjald.querySelector('[data-r="h"]'); if (s) { s.value = o.h; const n = spjald.querySelector('[data-r="h-n"]'); if (n) n.value = o.h; }
    };
    const sleppa = () => { handfang.removeEventListener('pointermove', hreyfa); handfang.removeEventListener('pointerup', sleppa); breytt(); teiknaSpjald(); };
    handfang.addEventListener('pointermove', hreyfa);
    handfang.addEventListener('pointerup', sleppa);
  });

  // ── Heiti lykla í spjaldinu ──────────────────────────────────────────────
  function heitiLykils(teg, k) {
    const og = { e: 'Texti', m: 'Mynd', b: 'Kafli', n: 'Gildi' }[teg];
    const v = /^vara\.(\d+)\./.exec(k);
    const vn = v && VV.synilegar().find((x) => x.id === Number(v[1]));
    const svid = [
      [/^haus\./, 'Haus'], [/^flipi\./, 'Flipar'], [/^forsida\.hetja/, 'Forsíðuborði'], [/^traust\./, 'Traustræma'], [/^forsida\./, 'Forsíða'],
      [/^flokkur\./, 'Flokkahnappur'], [/^kort\./, 'Öll vörukort'], [/^merki\./, 'Merki á kortum'], [/^cta\./, 'Tilboðsborði'], [/^bordi\./, 'Öryggisborði'],
      [/^fotur/, 'Fótur'], [/^afh\./, 'Afhending (allar síður)'], [/^karfa\./, 'Karfa'], [/^lager\./, 'Lagerstaða (allar vörur)'], [/^hentar\./, 'Hvaða tæki hentar'],
      [/^reikn\./, 'Reiknivél (allar vörur)'], [/^mola\./, 'Brauðmolar'], [/^vara\.(galleri|not|skref|oft|um|takki|tilbod|skoda)/, 'Vörusíður (allar)'],
    ].find(([re]) => re.test(k));
    return og + ' · ' + (vn ? (VV.efni.t && VV.efni.t[`vara.${vn.id}.nafn`] && VV.efni.t[`vara.${vn.id}.nafn`].x) || vn.nafn : svid ? svid[1] : 'Síða');
  }

  // ── Spjaldið ─────────────────────────────────────────────────────────────
  const litir = () => Object.assign({}, THEMA0.litir, (VV.efni.thema && VV.efni.thema.litir) || {});
  const LITAHEITI = { navy: 'Dökkblár', navyDeep: 'Dekksti blár', orange: 'Appelsínugulur', orangeInk: 'Appelsínugulur texti', mist: 'Grunnur', white: 'Hvítur', ink: 'Texti', muted: 'Daufur texti', line: 'Línur' };
  function litaval(r, nu, ekkert) {
    const l = litir();
    const sett = [...new Set([l.navy, l.navyDeep, l.orange, l.orangeInk, l.ink, l.muted, l.line, l.mist, '#ffffff', '#000000'])];
    return `<div class="vvr-litir">${ekkert ? `<button type="button" class="vvr-lit ekkert" data-r="${r}" data-v="" title="Enginn / sjálfgefið" aria-pressed="${!nu}"></button>` : ''}${sett.map((c) => `<button type="button" class="vvr-lit" data-r="${r}" data-v="${c}" style="background:${c}" title="${c}" aria-pressed="${(nu || '').toLowerCase() === c.toLowerCase()}"></button>`).join('')}<input type="color" data-r="${r}" value="${okLitur(nu) && nu !== 'transparent' && nu.length === 7 ? nu : '#222f47'}" title="Velja annan lit"></div>`;
  }
  const rennir = (r, v, min, max, skref, sjg) => `<div class="vvr-samsett"><input type="range" data-r="${r}" min="${min}" max="${max}" step="${skref}" value="${v == null || v === '' ? sjg : v}"><input type="number" data-r="${r}-n" min="${min}" max="${max}" step="${skref}" value="${v == null || v === '' ? '' : v}" placeholder="${sjg}"></div>`;

  function teiknaSpjald() {
    const opid = VV.ritill && !R.forskoda;
    spjald.hidden = !opid;
    document.body.classList.toggle('vvr-spjald-a', opid);
    if (!opid) { stadsetjaHandfang(); return; }
    let h = '';
    if (R.spjald === 'thema') h = spjaldThema();
    else if (R.spjald === 'vorur') h = spjaldVorur();
    else if (!R.val) h = spjaldTomt();
    else if (R.val.teg === 'e') h = spjaldTexti();
    else if (R.val.teg === 'm') h = spjaldMynd();
    else if (R.val.teg === 'n') h = spjaldTala();
    else h = spjaldKafli();
    spjald.innerHTML = h;
    stadsetjaHandfang();
  }
  const haus = (titill, k) => `<div class="vvr-haus"><div><b>${esc(titill)}</b>${k ? `<code>${esc(k)}</code>` : ''}</div><button type="button" class="vvr-x" data-r="loka" aria-label="Loka">×</button></div>`;

  function spjaldTomt() {
    const r = VV.leid();
    const id = r.s === 'vara' ? r.id : null;
    return `${haus('Breytingahamur', '')}<div class="vvr-tomt">Smelltu á það sem þú vilt breyta:<ul><li><b>Texta</b> — skrifaðu beint í hann</li><li><b>Mynd</b> — skipta um, stækka, heil eða fyllt</li><li><b>Auðan flöt í kafla</b> — fela eða lita</li></ul><p class="vvr-hint" style="margin-top:10px">Haltu Ctrl inni til að smella á tengla. Allt vistast sjálfkrafa sem drög; almenningur sér ekkert fyrr en þú ýtir á Virkja.</p></div>
${id ? `<div class="vvr-kafli"><h4>Þessi vörusíða</h4><label class="vvr-rod" style="grid-template-columns:20px 1fr"><input type="checkbox" data-r="profill" ${VV.profill(id) ? 'checked' : ''}><span>Ítarlegur vöruprófíll (eldflokkar, notkun, myndir, reglur, spurningar)</span></label></div>` : ''}`;
  }

  function spjaldTexti() {
    const k = R.val.k, o = (VV.efni.t || {})[k] || {}, s = o.s || {};
    const fwv = [['', 'Sjálfg.'], [400, '400'], [500, '500'], [600, '600'], [700, '700'], [800, '800']];
    return `${haus(heitiLykils('e', k), k)}
<div class="vvr-kafli"><h4>Texti</h4><textarea data-r="x" rows="3">${esc(textiNu(k))}</textarea><p class="vvr-hint">**feitletrað** · {appelsínugult} · Shift+Enter nýja línu</p></div>
<div class="vvr-kafli"><h4>Letur</h4>
<div class="vvr-rod"><label>Leturgerð</label><select data-r="ff"><option value="">Úr þema</option>${LETUR.map((f) => `<option value="${esc(f)}"${s.ff === f ? ' selected' : ''} style="font-family:'${esc(f)}'">${esc(f)}</option>`).join('')}</select></div>
<div class="vvr-rod"><label>Stærð (px)</label>${rennir('fs', s.fs, 10, 110, 1, Math.round(parseFloat(getComputedStyle(document.querySelector(sel('e', k)) || document.body).fontSize)) || 16)}</div>
<div class="vvr-rod"><label>Þykkt</label><div class="vvr-hnappar">${fwv.map(([v, t]) => `<button type="button" class="vvr-h" data-r="fw" data-v="${v}" aria-pressed="${String(s.fw || '') === String(v)}">${t}</button>`).join('')}</div></div>
<div class="vvr-rod"><label>Línubil</label>${rennir('lh', s.lh, 0.9, 2.4, 0.05, 1.5)}</div>
<div class="vvr-rod"><label>Stafabil</label>${rennir('ls', s.ls, -0.05, 0.25, 0.005, 0)}</div>
<div class="vvr-rod"><label>Jöfnun</label><div class="vvr-hnappar">${[['', 'Sjálfg.'], ['left', 'Vinstri'], ['center', 'Miðja'], ['right', 'Hægri']].map(([v, t]) => `<button type="button" class="vvr-h" data-r="ta" data-v="${v}" aria-pressed="${(s.ta || '') === v}">${t}</button>`).join('')}</div></div>
<div class="vvr-rod"><label>Stíll</label><div class="vvr-hnappar"><button type="button" class="vvr-h" data-r="it" aria-pressed="${!!s.it}"><i>Skáletur</i></button><button type="button" class="vvr-h" data-r="tt" aria-pressed="${s.tt === 'uppercase'}">HÁSTAFIR</button></div></div></div>
<div class="vvr-kafli"><h4>Litur</h4>${litaval('c', s.c, true)}</div>
<div class="vvr-kafli"><h4>Bakgrunnur (merki)</h4>${litaval('bg', s.bg, true)}</div>
<div class="vvr-kafli"><div class="vvr-hnappar"><button type="button" class="vvr-h" data-r="fela" aria-pressed="${!!o.fela}">${o.fela ? 'Falið — sýna' : 'Fela'}</button><button type="button" class="vvr-h raudur" data-r="endurstilla">Endurstilla</button></div></div>`;
  }

  function myndasafn() {
    const innbyggt = ['hetja', 'notkun-verkstaedi', 'notkun-bilskur', 'notkun-sumarhus', 'notkun-batur', 'notkun-lager', 'notkun-grill', 'flokkur-a', 'flokkur-b', 'flokkur-c', 'ekki-feiti', 'ekki-tolvur', 'ekki-lithium', 'skref-1', 'skref-2', 'skref-3', 'skref-4', 'maelir', 'veggur'].map((n) => 'myndir/' + n + '.jpg');
    const upp = Array.isArray(VV.efni.myndasafn) ? VV.efni.myndasafn : [];
    const vorur = VV.vorur.map((v) => v.mynd).filter(Boolean);
    const takki = (u, c) => `<button type="button" class="${c || ''}" data-r="safn" data-v="${esc(u)}" style="background-image:url('${esc(u).replace(/'/g, '%27')}')" title="${esc(u.split('/').pop())}"></button>`;
    return `<div class="vvr-safn">${upp.map((u) => takki(u)).join('')}${innbyggt.map((u) => takki(u)).join('')}${vorur.map((u) => takki(u, 'vara')).join('')}</div>`;
  }
  function spjaldMynd() {
    const k = R.val.k, ms = R.val.ms || k;
    const s = VV.mStill(k, R.val.ms);
    const o = (VV.efni.m || {})[k] || {};
    const fast = R.val.fast;
    return `${haus(heitiLykils('m', ms), ms !== k ? ms + '  ·  rammi: ' + k : k)}
<div class="vvr-kafli"><div class="vvr-forsyn" style="background-image:url('${esc(s.src).replace(/'/g, '%27')}')"></div>
<div class="vvr-hnappar"><label class="vvr-h blar" style="cursor:pointer">Hlaða upp mynd<input type="file" accept="image/jpeg,image/png,image/webp" data-r="skra" hidden></label>${(VV.efni.m || {})[ms] && (VV.efni.m || {})[ms].src ? '<button type="button" class="vvr-h" data-r="src-sjg">Upprunaleg mynd</button>' : ''}</div>
<p class="vvr-hint">Eða dragðu myndaskrá beint á myndina á síðunni.</p>
<div class="vvr-samsett"><input type="text" data-r="slod" placeholder="Líma slóð á mynd (https://…)"><button type="button" class="vvr-h" data-r="nota-slod">Nota</button></div></div>
<div class="vvr-kafli"><h4>Hvernig myndin passar</h4><div class="vvr-hnappar"><button type="button" class="vvr-h" data-r="fit" data-v="contain" aria-pressed="${s.fit === 'contain'}">Heil mynd</button><button type="button" class="vvr-h" data-r="fit" data-v="cover" aria-pressed="${s.fit === 'cover'}">Fylla ramma</button></div>
<p class="vvr-hint">Heil mynd sýnir alla myndina og fyllir afganginn með bakgrunnslit. Fylla ramma klippir myndina til.</p>
${fast ? '<p class="vvr-hint">Þessi rammi lagar sig að kaflanum; stærðinni er stjórnað af honum.</p>' : `<div class="vvr-rod"><label>Hæð (px)</label>${rennir('h', o.h, 60, 1000, 2, s.h || Math.round((document.querySelector(sel('m', k)) || {}).offsetHeight || 200))}</div>
<div class="vvr-rod"><label>Breidd (%)</label>${rennir('w', o.w, 15, 100, 1, 100)}</div>`}
<div class="vvr-rod"><label>Aðdráttur (%)</label>${rennir('z', o.z, 100, 300, 5, 100)}</div>
<div class="vvr-rod"><label>Staðsetning</label><div class="vvr-stadir">${['left top', 'top', 'right top', 'left', 'center', 'right', 'left bottom', 'bottom', 'right bottom'].map((p) => `<button type="button" data-r="pos" data-v="${p}" title="${p}" aria-pressed="${s.pos === p}"></button>`).join('')}</div></div>
<div class="vvr-rod"><label>Rúnun (px)</label>${rennir('r', o.r, 0, 60, 1, '')}</div></div>
<div class="vvr-kafli"><h4>Bakgrunnur rammans</h4>${litaval('bak', o.bak, true)}<div class="vvr-hnappar"><button type="button" class="vvr-h" data-r="bak" data-v="transparent">Gegnsær</button></div></div>
<div class="vvr-kafli"><h4>Myndasafn</h4>${myndasafn()}</div>
<div class="vvr-kafli"><div class="vvr-hnappar"><button type="button" class="vvr-h" data-r="mfela" aria-pressed="${!!o.fela}">${o.fela ? 'Falin — sýna' : 'Fela mynd'}</button><button type="button" class="vvr-h raudur" data-r="mendurstilla">Endurstilla ramma</button></div></div>`;
  }

  function spjaldTala() {
    const k = R.val.k, n = VV.efni.n || {};
    const v = n[k] != null ? n[k] : R.val.sjg;
    return `${haus('Gildi', k)}<div class="vvr-kafli"><div class="vvr-rod"><label>Gildi</label>${rennir('n', n[k], R.val.min, R.val.max, 1, v)}</div><p class="vvr-hint">Til dæmis virknistig (0–4) eða slökkvigeta tækis í reiknivélinni.</p><div class="vvr-hnappar"><button type="button" class="vvr-h raudur" data-r="nendurstilla">Endurstilla</button></div></div>`;
  }

  function spjaldKafli() {
    const k = R.val.k, o = (VV.efni.b || {})[k] || {};
    return `${haus('Kafli', k)}<div class="vvr-kafli"><div class="vvr-hnappar"><button type="button" class="vvr-h" data-r="bfela" aria-pressed="${!!o.fela}">${o.fela ? 'Falinn — sýna kaflann' : 'Fela kaflann'}</button></div><p class="vvr-hint">Falinn kafli sést dofinn hér en ekki hjá gestum.</p></div>
<div class="vvr-kafli"><h4>Bakgrunnur</h4>${litaval('bbg', o.bg, true)}</div>`;
  }

  function spjaldThema() {
    const th = VV.efni.thema || {}, l = litir(), lt = Object.assign({}, THEMA0.letur, th.letur || {});
    return `${haus('Þema verslunarinnar', 'Gildir um allar síður')}
<div class="vvr-kafli"><h4>Litir</h4>${Object.keys(THEMA0.litir).map((k) => `<div class="vvr-rod"><label>${LITAHEITI[k]}</label><div class="vvr-samsett"><input type="color" data-r="tlitur" data-k="${k}" value="${l[k]}"><input type="text" data-r="tlitur-t" data-k="${k}" value="${l[k]}" maxlength="7"></div></div>`).join('')}</div>
<div class="vvr-kafli"><h4>Letur</h4>
<div class="vvr-rod"><label>Fyrirsagnir</label><select data-r="tletur" data-k="fyrirsagnir">${LETUR.map((f) => `<option${lt.fyrirsagnir === f ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select></div>
<div class="vvr-rod"><label>Texti</label><select data-r="tletur" data-k="texti">${LETUR.map((f) => `<option${lt.texti === f ? ' selected' : ''}>${esc(f)}</option>`).join('')}</select></div>
<div class="vvr-rod"><label>Grunnstærð</label>${rennir('tgrunn', th.grunnstaerd, 13, 20, 0.5, 16)}</div></div>
<div class="vvr-kafli"><h4>Lögun</h4><div class="vvr-rod"><label>Rúnun korta</label>${rennir('trunun', th.runun, 0, 32, 1, 16)}</div>
<div class="vvr-rod"><label>Takkar</label><div class="vvr-hnappar">${[['pilla', 'Pillur'], ['runad', 'Rúnaðir'], ['ferkantad', 'Ferkantaðir']].map(([v, t]) => `<button type="button" class="vvr-h" data-r="ttakkar" data-v="${v}" aria-pressed="${(th.takkar || 'pilla') === v}">${t}</button>`).join('')}</div></div></div>
<div class="vvr-kafli"><div class="vvr-hnappar"><button type="button" class="vvr-h raudur" data-r="tendurstilla">Endurstilla þema</button></div></div>`;
  }

  function spjaldVorur() {
    if (!R.allar) {
      fetch(VV.API + '?allar=1', { cache: 'no-store' }).then((r) => r.json()).then((d) => { R.allar = d.vorur || []; if (R.spjald === 'vorur') teiknaSpjald(); }).catch(() => { R.allar = []; });
      return `${haus('Vörur í versluninni', '')}<div class="vvr-tomt">Sæki vörulistann…</div>`;
    }
    const vv = VV.efni.vorur || {}, falid = vv.falid || [], auka = vv.aukalega || [];
    const flokkar = {};
    for (const v of R.allar) (flokkar[v.flokkur || 'Annað'] = flokkar[v.flokkur || 'Annað'] || []).push(v);
    const synd = (v) => (v.forsida ? !falid.includes(v.id) : auka.includes(v.id));
    const fj = R.allar.filter(synd).length;
    return `${haus('Vörur í versluninni', fj + ' sýndar')}<div class="vvr-kafli"><p class="vvr-hint">Sjálfgefið eru vörurnar á forsíðu söluborðsins. Hakaðu við til að bæta við eða taka út. Verð og lager koma alltaf úr vöruskránni. „Prófíll" kveikir á ítarlegu vörusíðunni.</p>
<div class="vvr-vorulisti">${Object.entries(flokkar).map(([f, l]) => `<h5>${esc(f)}</h5>${l.map((v) => `<label><input type="checkbox" data-r="synd" data-id="${v.id}" data-fs="${v.forsida ? 1 : 0}" ${synd(v) ? 'checked' : ''}><span>${esc(v.nafn)}</span><small>${VV.kr(v.verd)}</small></label>${synd(v) ? `<label style="padding-left:28px;grid-template-columns:20px 1fr"><input type="checkbox" data-r="profill" data-id="${v.id}" ${VV.profill(v.id) ? 'checked' : ''}><small>Ítarlegur prófíll</small></label>` : ''}`).join('')}`).join('')}</div></div>`;
  }

  // ── Atburðir í spjaldinu ─────────────────────────────────────────────────
  function gildiUrStak(t) { return t.dataset.v != null ? t.dataset.v : t.value; }
  async function spjaldAtburdur(e) {
    const t = e.target.closest('[data-r]');
    if (!t || !spjald.contains(t)) return;
    const r = t.dataset.r.replace(/-n$/, ''), samfellt = e.type === 'input';
    const v = R.val;
    if (e.type === 'click' && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) && t.type !== 'checkbox') return;
    if (e.type === 'click' && t.type === 'checkbox') return; // change sér um gátreiti
    if (e.type === 'input' && (t.type === 'checkbox' || t.type === 'file' || t.tagName === 'SELECT')) return; // change sér um þau
    if (e.type === 'change' && t.type !== 'checkbox' && t.type !== 'file' && t.tagName !== 'SELECT' && t.type !== 'color') return;
    if (r === 'loka') { if (R.spjald !== 'val') { R.spjald = 'val'; teiknaSla(); teiknaSpjald(); } else afvelja(); return; }

    // Texti
    if (v && v.teg === 'e') {
      const k = v.k;
      if (r === 'x') { if (R.breytir) R.breytir.textContent = t.value; setjaTexta(k, t.value); return; }
      if (r === 'ff') { setjaStil(k, 'ff', t.value); return; }
      if (['fs', 'lh', 'ls'].includes(r)) { const n = t.value === '' ? '' : Number(t.value); setjaStil(k, r, n); samstilla(t, r, n); return; }
      if (r === 'fw') { setjaStil(k, 'fw', t.dataset.v ? Number(t.dataset.v) : ''); teiknaSpjald(); return; }
      if (r === 'ta') { setjaStil(k, 'ta', t.dataset.v); teiknaSpjald(); return; }
      if (r === 'it') { setjaStil(k, 'it', ((VV.efni.t[k] || {}).s || {}).it ? '' : true); teiknaSpjald(); return; }
      if (r === 'tt') { setjaStil(k, 'tt', ((VV.efni.t[k] || {}).s || {}).tt === 'uppercase' ? '' : 'uppercase'); teiknaSpjald(); return; }
      if (r === 'c' || r === 'bg') { setjaStil(k, r, gildiUrStak(t)); if (!samfellt) teiknaSpjald(); return; }
      if (r === 'fela') { felaTexta(k, !((VV.efni.t || {})[k] || {}).fela); teiknaSpjald(); return; }
      if (r === 'endurstilla') { endurstillaTexta(k); const el = document.querySelector(sel('e', k)); if (el) velja(el); else afvelja(); return; }
    }
    // Mynd
    if (v && v.teg === 'm') {
      const k = v.k, ms = v.ms || k;
      if (r === 'skra' && t.files && t.files[0]) { await skiptaUmMynd(t.files[0]); return; }
      if (r === 'nota-slod') { const s = spjald.querySelector('[data-r="slod"]').value.trim(); if (/^https:\/\/\S+$/i.test(s)) { setjaMyndSrc(ms, s); teiknaSpjald(); } else VV.toast('Slóðin þarf að byrja á https://'); return; }
      if (r === 'src-sjg') { setjaMyndSrc(ms, ''); teiknaSpjald(); return; }
      if (r === 'safn') { setjaMyndSrc(ms, t.dataset.v); teiknaSpjald(); return; }
      if (r === 'fit') { setjaMynd(k, 'fit', t.dataset.v); teiknaSpjald(); return; }
      if (['h', 'w', 'z', 'r'].includes(r)) { const n = t.value === '' ? '' : Number(t.value); setjaMynd(k, r, r === 'w' && n >= 100 ? '' : n, samfellt); samstilla(t, r, n); return; }
      if (r === 'pos') { setjaMynd(k, 'pos', t.dataset.v); teiknaSpjald(); return; }
      if (r === 'bak') { setjaMynd(k, 'bak', gildiUrStak(t), samfellt); if (!samfellt) teiknaSpjald(); return; }
      if (r === 'mfela') { setjaMynd(k, 'fela', ((VV.efni.m || {})[k] || {}).fela ? '' : true); teiknaSpjald(); return; }
      if (r === 'mendurstilla') { endurstillaMynd(k); teiknaSpjald(); return; }
    }
    if (v && v.teg === 'n') {
      if (r === 'n') { setjaTolu(v.k, t.value === '' ? '' : Number(t.value), samfellt); samstilla(t, 'n', t.value); merkja(); return; }
      if (r === 'nendurstilla') { setjaTolu(v.k, ''); teiknaSpjald(); return; }
    }
    if (v && v.teg === 'b') {
      if (r === 'bfela') { setjaKafla(v.k, 'fela', !((VV.efni.b || {})[v.k] || {}).fela); merkja(); teiknaSpjald(); return; }
      if (r === 'bbg') { setjaKafla(v.k, 'bg', gildiUrStak(t)); merkja(); if (!samfellt) teiknaSpjald(); return; }
    }
    // Þema
    const th = () => { const x = hluti('thema'); x.litir = x.litir || {}; x.letur = x.letur || {}; return x; };
    if (r === 'tlitur' || r === 'tlitur-t') {
      const val = t.value.trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(val)) return;
      skraSogu('t:' + t.dataset.k);
      th().litir[t.dataset.k] = val;
      VV.beitaThema();
      const ann = spjald.querySelector(`[data-r="${r === 'tlitur' ? 'tlitur-t' : 'tlitur'}"][data-k="${t.dataset.k}"]`); if (ann) ann.value = val;
      breytt(); return;
    }
    if (r === 'tletur') { skraSogu(); th().letur[t.dataset.k] = t.value; VV.beitaThema(); breytt(); return; }
    if (r === 'tgrunn' || r === 'trunun') { skraSogu('t:' + r); const n = t.value === '' ? '' : Number(t.value); if (n === '') delete th()[r === 'tgrunn' ? 'grunnstaerd' : 'runun']; else th()[r === 'tgrunn' ? 'grunnstaerd' : 'runun'] = n; VV.beitaThema(); samstilla(t, r, n); breytt(); return; }
    if (r === 'ttakkar') { skraSogu(); th().takkar = t.dataset.v; VV.beitaThema(); breytt(); teiknaSpjald(); return; }
    if (r === 'tendurstilla') { skraSogu(); delete VV.efni.thema; VV.beitaThema(); VV.render(false); breytt(); teiknaSpjald(); return; }
    // Vörur og prófíll
    if (r === 'synd') {
      skraSogu();
      const id = Number(t.dataset.id), fs = t.dataset.fs === '1';
      const vv = hluti('vorur');
      vv.falid = (vv.falid || []).filter((x) => x !== id);
      vv.aukalega = (vv.aukalega || []).filter((x) => x !== id);
      if (fs && !t.checked) vv.falid.push(id);
      if (!fs && t.checked) { vv.aukalega.push(id); R.endurhladaVorur = true; }
      VV.render(false); teiknaSla(); breytt(); teiknaSpjald(); return;
    }
    if (r === 'profill') {
      skraSogu();
      const leidNu = VV.leid();
      const id = t.dataset.id ? Number(t.dataset.id) : leidNu.id;
      const vv = hluti('vorur');
      vv.profill = vv.profill || {};
      vv.profill[id] = !!t.checked;
      VV.render(false); breytt(); teiknaSpjald(); return;
    }
  }
  function samstilla(t, r, n) {
    const a = spjald.querySelector(`[data-r="${r}"]`), b = spjald.querySelector(`[data-r="${r}-n"]`);
    if (a && a !== t && n !== '') a.value = n;
    if (b && b !== t) b.value = n;
  }
  ['click', 'input', 'change'].forEach((ev) => spjald.addEventListener(ev, spjaldAtburdur));

  // ── Myndir: minnka í vafranum og hlaða upp ──────────────────────────────
  function minnka(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 1800, s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        const g = c.getContext('2d');
        const png = file.type === 'image/png' && file.size < 1.5e6;
        if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(png ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.86));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Gat ekki lesið myndina')); };
      img.src = url;
    });
  }
  async function skiptaUmMynd(file) {
    if (!R.val || R.val.teg !== 'm') return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { VV.toast('Aðeins JPEG, PNG eða WebP myndir'); return; }
    const ms = R.val.ms || R.val.k;
    R.villa = ''; R.vistar = true; stadaVistunar();
    const s = bar.querySelector('.vvr-vistun'); if (s) s.textContent = 'Hleð upp mynd…';
    try {
      const gogn = await minnka(file);
      const r = await fetch(VV.API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adgerd: 'mynd', gogn }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) throw new Error(d.error || 'Villa ' + r.status);
      R.vistar = false;
      const safn = Array.isArray(VV.efni.myndasafn) ? VV.efni.myndasafn : [];
      VV.efni.myndasafn = [d.url].concat(safn.filter((u) => u !== d.url)).slice(0, 200);
      setjaMyndSrc(ms, d.url);
      teiknaSpjald();
    } catch (e) {
      R.vistar = false;
      R.villa = 'Upphleðsla mistókst: ' + e.message;
      stadaVistunar();
    }
  }

  // ── Gluggar og valmynd ──────────────────────────────────────────────────
  function gluggi(html, takkar) {
    const h = document.createElement('div');
    h.className = 'vvr-hula vvr';
    h.innerHTML = `<div class="vvr-gluggi" role="dialog" aria-modal="true">${html}<div class="vvr-hnappar">${takkar.map(([t, , c], i) => `<button type="button" class="vvr-h ${c || ''}" data-i="${i}">${esc(t)}</button>`).join('')}<button type="button" class="vvr-h" data-i="x">Hætta við</button></div></div>`;
    document.body.appendChild(h);
    const loka = () => h.remove();
    h.addEventListener('click', async (e) => {
      if (e.target === h) return loka();
      const b = e.target.closest('[data-i]');
      if (!b) return;
      if (b.dataset.i === 'x') return loka();
      const f = takkar[Number(b.dataset.i)][1];
      loka();
      if (f) await f();
    });
    const fyrsti = h.querySelector('.blar') || h.querySelector('[data-i]');
    if (fyrsti) fyrsti.focus();
    return h;
  }
  async function adgerd(nafn, auki) {
    const r = await fetch(VV.API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ adgerd: nafn }, auki || {})) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Villa ' + r.status);
    return d;
  }
  async function virkja() {
    lokaTexta();
    if (R.ovistad || R.vistar) await vista();
    const virk = VV.stada === 'virk';
    gluggi(`<h3>${virk ? 'Birta breytingarnar?' : 'Virkja verslunina?'}</h3><p>${virk ? 'Drögin verða ný útgáfa sem allir sjá á /vefverslun.' : 'Þá sjá allir sem opna /vefverslun þessa útgáfu og prufuborðinn hverfur hjá þeim. Þú getur alltaf breytt áfram með ?breyta=1 og tekið hana úr loftinu aftur.'}</p>`,
      [[virk ? 'Birta' : 'Virkja', async () => {
        try { const d = await adgerd('virkja'); VV.stada = 'virk'; VV.utgafa = d.utgafa; VV.virkjad = d.virkjad; teiknaSla(); VV.toast(virk ? 'Breytingarnar eru komnar í loftið' : 'Verslunin er virk'); } catch (e) { VV.toast('Mistókst: ' + e.message); }
      }, 'blar']]);
  }
  function valmynd(akkeri) {
    document.querySelectorAll('.vvr-valmynd').forEach((x) => x.remove());
    const m = document.createElement('div');
    m.className = 'vvr-valmynd vvr';
    const virk = VV.stada === 'virk';
    m.innerHTML = `<button type="button" data-m="gestur">Opna eins og gestur sér hana</button><button type="button" data-m="saga">Útgáfusaga…</button>${virk ? '<button type="button" data-m="henda">Henda óbirtum breytingum</button><button type="button" data-m="afvirkja">Taka verslunina úr loftinu</button>' : ''}<button type="button" data-m="flytja">Sækja drögin sem skrá (afrit)</button>`;
    document.body.appendChild(m);
    const r = akkeri.getBoundingClientRect();
    m.style.left = Math.max(8, Math.min(innerWidth - 250, r.right - 230)) + 'px';
    const loka = (e) => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('click', loka, true); } };
    setTimeout(() => document.addEventListener('click', loka, true));
    m.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-m]'); if (!b) return;
      m.remove();
      const a = b.dataset.m;
      if (a === 'gestur') window.open(location.pathname + location.hash, '_blank', 'noopener');
      else if (a === 'flytja') {
        const blob = new Blob([JSON.stringify(VV.efni, null, 1)], { type: 'application/json' });
        const u = URL.createObjectURL(blob), l = document.createElement('a');
        l.href = u; l.download = 'vefverslun-drog-' + new Date().toISOString().slice(0, 10) + '.json'; l.click();
        setTimeout(() => URL.revokeObjectURL(u), 2000);
      } else if (a === 'henda') {
        gluggi('<h3>Henda óbirtum breytingum?</h3><p>Drögin verða eins og útgáfan sem er í loftinu.</p>', [['Henda', async () => { try { const d = await adgerd('afturkalla'); VV.efni = d.efni || {}; VV.drog_uppfaert = d.drog_uppfaert; R.saga = []; R.fram = []; VV.beitaThema(); VV.render(false); teiknaSla(); teiknaSpjald(); } catch (e2) { VV.toast(e2.message); } }, 'raudur']]);
      } else if (a === 'afvirkja') {
        gluggi('<h3>Taka verslunina úr loftinu?</h3><p>Hún fer aftur í prufuham. Drögin standa óbreytt.</p>', [['Taka úr loftinu', async () => { try { await adgerd('afvirkja'); VV.stada = 'prufa'; teiknaSla(); } catch (e2) { VV.toast(e2.message); } }, 'raudur']]);
      } else if (a === 'saga') {
        const d = await fetch(VV.API + '?saga=1', { cache: 'no-store' }).then((x) => x.json()).catch(() => ({ saga: [] }));
        const l = d.saga || [];
        const h = gluggi(`<h3>Útgáfusaga</h3>${l.length ? `<ul>${l.map((s) => `<li><button type="button" class="vvr-h" style="width:100%;justify-content:space-between" data-saga="${s.id}"><span>Útgáfa ${s.utgafa}</span><small>${new Date(s.created_at).toLocaleString('is-IS')}</small></button></li>`).join('')}</ul><p class="vvr-hint">Smelltu á útgáfu til að setja hana í drögin.</p>` : '<p>Engin útgáfa hefur verið virkjuð ennþá.</p>'}`, []);
        h.addEventListener('click', async (e2) => {
          const b2 = e2.target.closest('[data-saga]'); if (!b2) return;
          h.remove();
          try { const dd = await adgerd('endurheimta', { id: Number(b2.dataset.saga) }); skraSogu(); VV.efni = dd.efni || {}; VV.drog_uppfaert = dd.drog_uppfaert; VV.beitaThema(); VV.render(false); teiknaSpjald(); R.vistadKl = klst(); stadaVistunar(); } catch (e3) { VV.toast(e3.message); }
        });
      }
    });
  }

  // ── Slá: atburðir ───────────────────────────────────────────────────────
  bar.addEventListener('change', (e) => {
    const t = e.target.closest('[data-r="sida"]');
    if (t) { lokaTexta(); R.val = null; location.hash = t.value; }
  });
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-r]');
    if (!b || b.tagName === 'SELECT') return;
    const r = b.dataset.r;
    if (r === 'breyta') { kveikja(!VV.ritill); }
    else if (r === 'thema' || r === 'vorur') { if (!VV.ritill) kveikja(true); lokaTexta(); R.spjald = R.spjald === r ? 'val' : r; teiknaSla(); teiknaSpjald(); }
    else if (r === 'afturkalla') afturkalla();
    else if (r === 'endurgera') endurgera();
    else if (r === 'forskoda') forskoda(true);
    else if (r === 'meira') valmynd(b);
    else if (r === 'virkja') virkja();
  });
  function kveikja(a) {
    VV.ritill = a;
    document.body.classList.toggle('vv-ritill-a', a);
    if (!a) { lokaTexta(); R.val = null; merkja(); if (yfir) { yfir.classList.remove('vvr-yfir'); yfir = null; } merkimidi.style.display = 'none'; }
    teiknaSla();
    teiknaSpjald();
  }
  function forskoda(a) {
    R.forskoda = a;
    lokaTexta();
    bar.style.display = a ? 'none' : '';
    document.body.classList.toggle('vvr-a', !a);
    document.body.classList.toggle('vv-ritill-a', !a && VV.ritill);
    if (yfir) { yfir.classList.remove('vvr-yfir'); yfir = null; }
    merkimidi.style.display = 'none';
    document.querySelectorAll('#vv-app .vvr-valid').forEach((x) => x.classList.toggle('vvr-valid', !a));
    let p = document.querySelector('.vvr-forskodun');
    if (a && !p) { p = document.createElement('button'); p.type = 'button'; p.className = 'vvr-forskodun'; p.textContent = 'Hætta forskoðun'; p.addEventListener('click', () => forskoda(false)); document.body.appendChild(p); }
    if (!a && p) p.remove();
    teiknaSpjald();
  }

  // Eftir hverja teikningu verslunarinnar: endurmerkja val og halda slánni í takt við síðuna
  VV.eftirTeikningu = () => {
    if (R.val) {
      const el = document.querySelector(sel(R.val.teg, R.val.k));
      if (!el) R.val = null;
      merkja();
    }
    yfir = null;
    const s = bar.querySelector('[data-r="sida"]');
    if (s && s.value !== (location.hash || '#/')) teiknaSla();
  };
  window.addEventListener('hashchange', () => { R.val = null; if (VV.ritill) teiknaSpjald(); });

  teiknaSla();
  kveikja(new URLSearchParams(location.search).has('breyta'));
})();
