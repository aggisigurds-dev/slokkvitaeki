// Vefverslun Brunahólfs — síðurnar (forsíða verslunar, vörusíða, karfa).
//
// Allt sem sést er teiknað úr þremur hlutum:
//   VV.vorur  lifandi úr `vorur` (forsíða söluborðsins) — nafn, verð, lager, mynd
//   VV.efni   það sem breytingahamurinn vistar: þema, textar (t), myndir (m), kaflar (b), tölur (n), vöruval (vorur)
//   sjálfgefin gildi hér í kóðanum — efnið geymir AÐEINS það sem hefur verið breytt, „Endurstilla" eyðir yfirskrifinni
//
// Hjálparar sem allar síður nota (og ritill.js les): E() texti, M() mynd, B() kafli, N() tala. Hver ber data-lykil
// (data-e / data-m / data-b / data-n) svo ritillinn finni hvað var smellt á.
(() => {
  'use strict';
  const API = '/api/vefverslun';
  const KARFA_LYKILL = 'bh_vefverslun_karfa';
  const OPINBER = 'https://brunaholf-preview.pages.dev/';
  const LETUR = ['Poppins', 'Inter', 'Montserrat', 'Roboto', 'Open Sans', 'Lato', 'Nunito', 'Raleway', 'Work Sans', 'DM Sans', 'Source Sans 3', 'Playfair Display', 'Merriweather', 'Oswald'];
  const THEMA0 = {
    litir: { navy: '#222f47', navyDeep: '#18213a', orange: '#ff4001', orangeInk: '#d13300', mist: '#f0f2f7', white: '#ffffff', ink: '#1b2338', muted: '#515d78', line: '#d5dae6' },
    letur: { fyrirsagnir: 'Poppins', texti: 'Poppins' }, grunnstaerd: 16, runun: 16, takkar: 'pilla',
  };
  const FLOKKAR = { 'Slökkvitæki': 'Slökkvitæki', 'Eldvarnir': 'Eldvarnateppi', 'Sjúkratöskur': 'Sjúkratöskur', 'Skynjarar og rafhlöður': 'Skynjarar', 'Slökkvitækjafestingar': 'Festingar' };

  const VV = window.VV = {
    API, LETUR, THEMA0,
    efni: {}, vorur: [], stada: 'prufa', drog_uppfaert: null, utgafa: 0, virkjad: null,
    ritill: false, breytaLeyft: false,
    sia: { flokkur: '', leit: '', rada: 'vinsaelt' },
    vara: { mynd: 0, fjoldi: 1, afhending: 'saekja', m2: 500, tilk: '' },
    karfaAfh: 'saekja',
    karfa: lesaKorfu(),
    sjg: {}, sjgM: {},
  };

  // ── Smáhjálparar ────────────────────────────────────────────────────────────
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tala = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const kr = (n) => tala(n) + ' kr';
  const num = (v, d) => { const n = Number(v); return v === '' || v == null || !isFinite(n) ? d : n; };
  const okLitur = (c) => (typeof c === 'string' && /^(#[0-9a-fA-F]{3,8}|transparent)$/.test(c) ? c : '');
  const STADIR = ['center', 'top', 'bottom', 'left', 'right', 'left top', 'right top', 'left bottom', 'right bottom'];
  // Texti: **feitt**, {áherslulitur}, línuskil
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\{(.+?)\}/g, '<span class="vv-aherslu">$1</span>').replace(/\n/g, '<br>');
  Object.assign(VV, { esc, kr, tala, num, okLitur, md, STADIR });

  const hladin = new Set(['Poppins']);
  function hladaLetri(f) {
    if (!f || hladin.has(f) || !LETUR.includes(f)) return;
    hladin.add(f);
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + f.replace(/ /g, '+') + ':wght@400;500;600;700;800&display=swap';
    document.head.appendChild(l);
  }
  VV.hladaLetri = hladaLetri;

  function stillStr(s) {
    if (!s || typeof s !== 'object') return '';
    const o = [];
    if (LETUR.includes(s.ff)) { hladaLetri(s.ff); o.push(`font-family:'${s.ff}',system-ui,sans-serif`); }
    if (s.fs) o.push(`font-size:${Math.min(160, Math.max(8, num(s.fs, 16)))}px`);
    if (s.fw) o.push(`font-weight:${Math.min(900, Math.max(100, num(s.fw, 400)))}`);
    if (okLitur(s.c)) o.push(`color:${s.c}`);
    if (okLitur(s.bg)) o.push(`background:${s.bg};padding:.08em .3em;border-radius:6px`);
    if (['left', 'center', 'right'].includes(s.ta)) o.push(`text-align:${s.ta}`);
    if (s.lh) o.push(`line-height:${Math.min(3, Math.max(0.8, num(s.lh, 1.5)))}`);
    if (s.ls != null && s.ls !== '') o.push(`letter-spacing:${Math.min(0.5, Math.max(-0.1, num(s.ls, 0)))}em`);
    if (s.it) o.push('font-style:italic');
    if (s.tt === 'uppercase' || s.tt === 'none') o.push(`text-transform:${s.tt}`);
    return o.join(';');
  }
  VV.stillStr = stillStr;

  // ── E(): texti ──────────────────────────────────────────────────────────────
  const tObj = (k) => (VV.efni.t && VV.efni.t[k]) || {};
  const texti = (k, def) => { const o = tObj(k); return typeof o.x === 'string' ? o.x : def; };
  function E(tag, k, def, cls) {
    VV.sjg[k] = def;
    const o = tObj(k), st = stillStr(o.s);
    const c = (cls || '') + (o.fela ? ' vv-falid' : '');
    return `<${tag} data-e="${esc(k)}"${c.trim() ? ` class="${esc(c.trim())}"` : ''}${st ? ` style="${esc(st)}"` : ''}>${md(texti(k, def))}</${tag}>`;
  }

  // ── M(): myndarammi. srcKey = annar lykill sem á myndina sjálfa (rammastíllinn er sameiginlegur, myndin ekki) ──
  function mStill(k, def, srcKey) {
    def = def || {};
    const m = VV.efni.m || {};
    const o = m[k] || {};
    const so = srcKey ? m[srcKey] || {} : o;
    const src = so.src || def.src || '';
    const fit = (o.fit || def.fit) === 'contain' ? 'contain' : 'cover';
    const pos = STADIR.includes(o.pos) ? o.pos : def.pos || 'center';
    const h = num(o.h, def.h), w = num(o.w, def.w), z = num(o.z, 100), r = o.r != null ? num(o.r, 0) : null;
    const bak = okLitur(o.bak) || def.bak || '';
    const ramma = [h ? `height:${Math.min(1400, Math.max(30, h))}px` : '', w ? `width:${Math.min(100, Math.max(10, w))}%` : '', bak ? `background:${bak}` : '', r != null ? `border-radius:${Math.min(80, Math.max(0, r))}px` : ''].filter(Boolean).join(';');
    const mynd = [`object-fit:${fit}`, `object-position:${pos}`, z !== 100 ? `transform:scale(${Math.min(4, Math.max(1, z / 100))});transform-origin:${pos}` : ''].filter(Boolean).join(';');
    return { src, ramma, mynd, fela: !!o.fela, fit, pos, h, w, z, bak, r };
  }
  VV.mStill = (k, srcKey) => mStill(k, VV.sjgM[k], srcKey);
  function M(k, def, opt) {
    opt = opt || {};
    VV.sjgM[k] = def;
    const s = mStill(k, def, opt.srcKey);
    const c = 'vv-m' + (s.src ? '' : ' tomt') + (s.fela ? ' vv-falid' : '') + (opt.cls ? ' ' + opt.cls : '');
    return `<div class="${c}" data-m="${esc(k)}"${opt.srcKey ? ` data-ms="${esc(opt.srcKey)}"` : ''}${opt.fast ? ' data-fast="1"' : ''}${s.ramma ? ` style="${esc(s.ramma)}"` : ''}>${s.src ? `<img src="${esc(s.src)}" alt="${esc(def.alt || '')}" loading="${opt.strax ? 'eager' : 'lazy'}" decoding="async" style="${esc(s.mynd)}">` : ''}</div>`;
  }
  VV.myndSrc = (k, def) => { const m = VV.efni.m || {}; return (m[k] && m[k].src) || def || ''; };

  // ── B(): kafli sem má fela eða lita ──
  function B(k, inner, cls, tag) {
    tag = tag || 'section';
    const o = (VV.efni.b && VV.efni.b[k]) || {};
    const bg = okLitur(o.bg);
    return `<${tag} data-b="${esc(k)}" class="${esc((cls || '') + (o.fela ? ' vv-falid' : ''))}"${bg ? ` style="background:${bg}"` : ''}>${inner}</${tag}>`;
  }

  // ── N(): tala sem ritillinn getur stillt (t.d. virknistig, slökkvigeta í reiknivél) ──
  const nGildi = (k, def) => num(VV.efni.n && VV.efni.n[k], def);

  // ── Tákn ───────────────────────────────────────────────────────────────────
  const T = {
    hak: ['0 0 256 256', 'M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z'],
    x: ['0 0 256 256', 'M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z'],
    hringhak: ['0 0 256 256', 'M173.66,98.34a8,8,0,0,1,0,11.32l-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35A8,8,0,0,1,173.66,98.34ZM232,128A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z'],
    innsigli: ['0 0 256 256', 'M225.86,102.82c-3.77-3.94-7.67-8-9.14-11.57-1.36-3.27-1.44-8.69-1.52-13.94-.15-9.76-.31-20.82-8-28.51s-18.75-7.85-28.51-8c-5.25-.08-10.67-.16-13.94-1.52-3.56-1.47-7.63-5.37-11.57-9.14C146.28,23.51,138.44,16,128,16s-18.27,7.51-25.18,14.14c-3.94,3.77-8,7.67-11.57,9.14C88,40.64,82.56,40.72,77.31,40.8c-9.76.15-20.82.31-28.51,8S41,67.55,40.8,77.31c-.08,5.25-.16,10.67-1.52,13.94-1.47,3.56-5.37,7.63-9.14,11.57C23.51,109.72,16,117.56,16,128s7.51,18.27,14.14,25.18c3.77,3.94,7.67,8,9.14,11.57,1.36,3.27,1.44,8.69,1.52,13.94.15,9.76.31,20.82,8,28.51s18.75,7.85,28.51,8c5.25.08,10.67.16,13.94,1.52,3.56,1.47,7.63,5.37,11.57,9.14C109.72,232.49,117.56,240,128,240s18.27-7.51,25.18-14.14c3.94-3.77,8-7.67,11.57-9.14,3.27-1.36,8.69-1.44,13.94-1.52,9.76-.15,20.82-.31,28.51-8s7.85-18.75,8-28.51c.08-5.25.16-10.67,1.52-13.94,1.47-3.56,5.37-7.63,9.14-11.57C232.49,146.28,240,138.44,240,128S232.49,109.73,225.86,102.82Zm-52.2,6.84-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z'],
    bill: ['0 0 256 256', 'M247.42,117l-14-35A15.93,15.93,0,0,0,218.58,72H184V64a8,8,0,0,0-8-8H24A16,16,0,0,0,8,72V184a16,16,0,0,0,16,16H41a32,32,0,0,0,62,0h50a32,32,0,0,0,62,0h17a16,16,0,0,0,16-16V120A7.94,7.94,0,0,0,247.42,117ZM184,88h34.58l9.6,24H184ZM72,208a16,16,0,1,1,16-16A16,16,0,0,1,72,208Zm112,0a16,16,0,1,1,16-16A16,16,0,0,1,184,208Z'],
    spjall: ['0 0 256 256', 'M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-6.54-.67L40,216,52.47,178.6a8,8,0,0,0-.66-6.54A88,88,0,1,1,128,216Z'],
    karfa: ['0 0 256 256', 'M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM176,88a48,48,0,0,1-96,0,8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0Z'],
    leit: ['0 0 256 256', 'M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z'],
    minus: ['0 0 256 256', 'M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z'],
    plus: ['0 0 256 256', 'M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z'],
    vinstri: ['0 0 256 256', 'M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z'],
    haegri: ['0 0 256 256', 'M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z'],
    skjal: ['0 0 256 256', 'M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z'],
    vidvorun: ['0 0 256 256', 'M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z'],
    logi: ['0 0 24 24', 'M12 1.8c.9 3.4 5.6 5.6 5.6 11.1 0 4.2-2.6 7.6-5.6 7.6s-5.6-3.4-5.6-7.6c0-2.4 1.1-4.1 2.4-5.4.2 2 1.1 3.3 2.4 3.3.1-3.6 1.6-5.7.8-9zM12 21.3c1.7 0 3.1-1.6 3.1-3.6 0-2.2-1.6-3.1-2.3-4.9-.9 1.6-3.9 2.7-3.9 4.9 0 2 1.4 3.6 3.1 3.6z'],
    brusi: ['0 0 24 24', 'M6 22V9.2L9.2 5H17a1 1 0 0 1 1 1v16zM10 2h5v3h-5zM8.5 12.5l7 7m0-7-7 7'],
    kutur: ['0 0 24 24', 'M8 7h8a3.5 3.5 0 0 1 3.5 3.5V19a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3v-8.5A3.5 3.5 0 0 1 8 7zm2-5h4v5h-4z'],
    panna: ['0 0 24 24', 'M10 21a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm6.5-8H23v2h-6.5zM10 1c1.5 2 3 3 2.6 5-.3 1.2-1.4 1.8-2.6 1.8S7.6 7 7.6 5.7C7.6 4 9 3 10 1z'],
    skjar: ['0 0 24 24', 'M3 4h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm1 2v8h16V6zm5 13h6v2H9z'],
    rafhlada: ['0 0 24 24', 'M3 7h15a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1zm17 3h2v4h-2zM11.5 8.5 7.5 13h3l-1 3.5 4-4.5h-3z'],
    skjoldur: ['0 0 24 24', 'M12 1.5 21 5v6.5c0 5.4-3.8 9.9-9 11-5.2-1.1-9-5.6-9-11V5zm0 2.2L5 6.4v5.1c0 4.2 2.9 7.8 7 8.9 4.1-1.1 7-4.7 7-8.9V6.4zm0 3.3c.7 2.4 3.6 3.7 3.6 7.2 0 2.5-1.6 4.3-3.6 4.3s-3.6-1.8-3.6-4.3c0-1.5.7-2.5 1.6-3.3.1 1.1.7 1.9 1.4 1.9.1-2.1 1-3.4.6-5.8z'],
  };
  const ico = (n, cls) => { const t = T[n]; if (!t) return ''; const strok = n === 'brusi' ? ' fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"' : ''; return `<svg class="vv-ico${cls ? ' ' + cls : ''}" viewBox="${t[0]}" aria-hidden="true"${strok}><path d="${t[1]}"/></svg>`; };
  VV.ico = ico;

  // ── Körfuhjálparar (karfan er vafra-staða gestsins: hann á enga aðra auðkenningu fyrr en pöntun er send) ──
  function lesaKorfu() {
    try { const o = JSON.parse(localStorage.getItem(KARFA_LYKILL) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch (_) { return {}; }
  }
  function vistaKorfu() { try { localStorage.setItem(KARFA_LYKILL, JSON.stringify(VV.karfa)); } catch (_) {} }
  const iKorfu = () => Object.entries(VV.karfa).filter(([id, n]) => vara(Number(id)) && n > 0);
  const fjoldiKorfu = () => iKorfu().reduce((s, [, n]) => s + n, 0);
  function baetaVid(id, n) {
    VV.karfa[id] = Math.min(999, (VV.karfa[id] || 0) + n);
    vistaKorfu();
  }

  // ── Vörur ──────────────────────────────────────────────────────────────────
  const vara = (id) => VV.vorur.find((v) => v.id === id);
  const falinVara = (id) => ((VV.efni.vorur && VV.efni.vorur.falid) || []).includes(id);
  const synilegar = () => VV.vorur.filter((v) => !falinVara(v.id));
  const varaNafn = (v) => texti(`vara.${v.id}.nafn`, v.nafn);
  const varaMynd = (v) => VV.myndSrc(`vara.${v.id}.mynd`, v.mynd);
  const flokkSlod = (f) => String(f || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/ð/g, 'd').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, '-');
  const flokkHeiti = (f) => texti('flokkur.' + flokkSlod(f), FLOKKAR[f] || f);
  const profill = (id) => { const p = VV.efni.vorur && VV.efni.vorur.profill; return p && p[id] != null ? !!p[id] : id === 1; };
  VV.profill = profill;
  VV.synilegar = synilegar;

  function radad(listi) {
    const l = listi.slice();
    if (VV.sia.rada === 'lagt') l.sort((a, b) => a.verd - b.verd);
    else if (VV.sia.rada === 'haett') l.sort((a, b) => b.verd - a.verd);
    else if (VV.sia.rada === 'nafn') l.sort((a, b) => varaNafn(a).localeCompare(varaNafn(b), 'is'));
    return l;
  }
  function sjanlegar() {
    const q = VV.sia.leit.trim().toLowerCase();
    return radad(synilegar().filter((v) => (!VV.sia.flokkur || flokkSlod(v.flokkur) === VV.sia.flokkur) && (!q || (varaNafn(v) + ' ' + v.flokkur).toLowerCase().includes(q))));
  }

  // ── Sameiginlegt: haus, fótur, vörukort ──────────────────────────────────
  function haus() {
    const flipar = [['heim', 'Heim', OPINBER], ['bruna', 'Brunaþéttingar', OPINBER + '#/brunathetting'], ['kerfi', 'Brunakerfi', OPINBER + '#/brunakerfi'], ['slokk', 'Slökkvitæki', OPINBER + '#/slokkvitaeki'], ['verslun', 'Vefverslun', '#/'], ['um', 'Um okkur', OPINBER + '#/um-okkur']];
    const n = fjoldiKorfu();
    return `<header class="vv-haus"><div class="vv-wrap">
<a class="vv-logo" href="#/" aria-label="Brunahólf vefverslun">${M('haus.logo', { src: 'myndir/brunaholf-logo.png', alt: 'Brunahólf', fit: 'contain', h: 40, bak: 'transparent' }, { strax: 1 })}</a>
<label class="vv-leit">${ico('leit')}<input type="search" data-act="leit" value="${esc(VV.sia.leit)}" placeholder="${esc(texti('haus.leit', 'Leita að vöru, t.d. reykskynjari'))}" aria-label="Leita að vöru"></label>
<div class="vv-haus-h"><a class="vv-btn ljos sm" href="#/karfa">${ico('karfa')}${E('span', 'haus.karfa', 'Karfa')}<span class="vv-fjoldi" id="vv-fjoldi">${n}</span></a><a class="vv-btn sm" href="${OPINBER}">${E('span', 'haus.tilbod', 'Fá tilboð')}</a></div>
</div></header>
<nav class="vv-flipar" aria-label="Svið"><div class="vv-wrap">${flipar.map(([k, d, h]) => `<a class="vv-flipi" href="${h}"${k === 'verslun' ? ' aria-current="page"' : ''}>${E('span', 'flipi.' + k, d)}</a>`).join('')}</div></nav>`;
  }
  function fotur() {
    return B('fotur', `<div class="vv-wrap"><a class="vv-logo" href="#/">${M('fotur.logo', { src: 'myndir/brunaholf-logo.png', alt: 'Brunahólf', fit: 'contain', h: 30, bak: 'transparent' })}</a>${E('span', 'fotur.texti', 'Brunahólf · Slökkvitæki ehf. · eldklar@eldklar.is')}</div>`, 'vv-fotur', 'footer');
  }
  function merki(v) {
    if (v.birgdir != null && v.birgdir <= 0) return E('span', 'merki.uppselt', 'Uppselt', 'vv-merki uppselt');
    if (v.birgdir != null && v.birgdir <= 5) return E('span', 'merki.faeftir', 'Fá eftir', 'vv-merki lagt');
    return '';
  }
  function kort(v) {
    const uppselt = v.birgdir != null && v.birgdir <= 0;
    return `<article class="vv-kort"><a class="vv-kort-m" href="#/vara/${v.id}">${merki(v)}${M('kort.mynd', { src: v.mynd, alt: v.nafn, fit: 'contain', h: 220, bak: '#ffffff' }, { srcKey: `vara.${v.id}.mynd` })}</a>
<div class="vv-kort-b"><span class="vv-kort-flokkur">${esc(flokkHeiti(v.flokkur))}</span><h3><a href="#/vara/${v.id}">${E('span', `vara.${v.id}.nafn`, v.nafn)}</a></h3>
<div class="vv-verd"><b>${kr(v.verd)}</b><small>${tala(v.an)} án vsk</small></div>
${uppselt ? `<a class="vv-btn ghost sm" href="#/vara/${v.id}">${E('span', 'kort.lata-vita', 'Láta mig vita')}</a>` : `<button type="button" class="vv-btn navy sm" data-act="i-korfu" data-id="${v.id}">${ico('karfa')}${E('span', 'kort.takki', 'Í körfu')}</button>`}</div></article>`;
  }
  const yfirHaus = (k, yfir, inng) => `<div class="vv-kafli-haus">${E('h2', k + '.yfir', yfir, 'vv-yfir')}${inng != null ? E('p', k + '.inng', inng, 'vv-yfir-inng') : ''}</div>`;

  // ── Forsíða verslunar ───────────────────────────────────────────────────
  function grind() {
    const l = sjanlegar();
    return `<div class="vv-grind" id="vv-grind">${l.length ? l.map(kort).join('') : `<div class="vv-tomt" style="grid-column:1/-1">${E('span', 'forsida.ekkert', 'Engin vara fannst. Prófaðu annað leitarorð.')}</div>`}</div>`;
  }
  function sidaForsida() {
    const syn = synilegar();
    const flokkar = [];
    for (const v of syn) if (!flokkar.some((f) => f.f === v.flokkur)) flokkar.push({ f: v.flokkur, n: syn.filter((x) => x.flokkur === v.flokkur).length });
    const hetja = B('forsida.hetja', `${M('forsida.hetja.mynd', { src: 'myndir/hetja.jpg', alt: '', fit: 'cover', bak: 'transparent' }, { fast: 1, strax: 1 })}<div class="vv-wrap">${E('span', 'forsida.hetja.yfir', 'Vefverslun Brunahólfs', 'vv-hetja-yfir')}${E('h1', 'forsida.hetja.titill', 'Rétt tæki, {á réttum stað.}')}${E('p', 'forsida.hetja.texti', 'Slökkvitæki, eldvarnateppi, reykskynjarar og sjúkratöskur. Sæktu hjá okkur eða fáðu sent heim.')}<div class="vv-hnappar"><a class="vv-btn ghost" href="#/vara/1">${E('span', 'forsida.hetja.takki1', 'Hvaða slökkvitæki á ég að kaupa?')}</a><a class="vv-btn ghost" href="#/vara/3">${E('span', 'forsida.hetja.takki2', 'Er reykskynjarinn minn nóg?')}</a></div></div>`, 'vv-hetja');
    const traust = B('forsida.traust', `<div class="vv-wrap">${[['innsigli', 'Starfsleyfi frá HMS'], ['bill', 'Sótt eða sent heim'], ['spjall', 'Ráðgjöf frá fagfólki'], ['hringhak', 'Skoðun og áfylling á tækjum']].map(([i, d], k) => `<span>${ico(i)}${E('span', 'traust.' + (k + 1), d)}</span>`).join('')}</div>`, 'vv-traust');
    const rada = [['vinsaelt', 'Vinsælast'], ['lagt', 'Verð: lægst fyrst'], ['haett', 'Verð: hæst fyrst'], ['nafn', 'Nafn (A–Ö)']];
    return `${hetja}${traust}<main class="vv-wrap vv-adal">
<div class="vv-titilrod"><div>${E('h2', 'forsida.titill', 'Allar vörur')}<span class="vv-undir" id="vv-taln">${syn.length} ${esc(texti('forsida.vorur-ord', 'vörur · verð með vsk'))}</span></div>
<label class="vv-rada">${E('span', 'forsida.rada', 'Raða')}<select data-act="rada">${rada.map(([k, d]) => `<option value="${k}"${VV.sia.rada === k ? ' selected' : ''}>${d}</option>`).join('')}</select></label></div>
<div class="vv-flokkar" role="group" aria-label="Flokkar"><button type="button" class="vv-flokk" data-act="flokkur" data-v="" aria-pressed="${!VV.sia.flokkur}">${E('span', 'flokkur.allt', 'Allt')}<small>${syn.length}</small></button>${flokkar.map((f) => `<button type="button" class="vv-flokk" data-act="flokkur" data-v="${flokkSlod(f.f)}" aria-pressed="${VV.sia.flokkur === flokkSlod(f.f)}">${E('span', 'flokkur.' + flokkSlod(f.f), FLOKKAR[f.f] || f.f)}<small>${f.n}</small></button>`).join('')}</div>
${grind()}
${B('forsida.cta', `<div>${E('h3', 'cta.titill', 'Fyrirtæki, húsfélag eða bátur?')}${E('p', 'cta.texti', 'Við veljum réttu tækin, setjum þau upp og skoðum þau árlega.')}</div><div class="vv-hnappar"><a class="vv-btn" href="${OPINBER}">${E('span', 'cta.takki1', 'Fá tilboð')}</a><a class="vv-btn ghost" href="${OPINBER}">${E('span', 'cta.takki2', 'Spyrja Loga')}</a></div>`, 'vv-cta', 'div')}
</main>`;
  }

  // ── Vörusíða ───────────────────────────────────────────────────────────
  const NOTKUN = [
    { k: 'verkstaedi', mynd: 'myndir/notkun-verkstaedi.jpg', merki: 'A · B', t: 'Verkstæði', x: 'Olía, leysiefni og neistar á sama stað. Slekkur bæði í olíutusku og olíupolli.' },
    { k: 'bilskur', mynd: 'myndir/notkun-bilskur.jpg', merki: 'A · B', t: 'Bílskúr', x: 'Bensín, dekk og rafgeymar. Hafðu tækið við dyrnar, ekki innst í skúrnum.' },
    { k: 'sumarhus', mynd: 'myndir/notkun-sumarhus.jpg', merki: 'A', t: 'Sumarhús', x: 'Kamína og langt í slökkvilið. Tækið þolir frost í óupphituðu húsi.' },
    { k: 'batur', mynd: 'myndir/notkun-batur.jpg', merki: 'A · B', t: 'Bátar', x: 'Olía og dísel í vélarrúmi. Skipafesting heldur tækinu föstu í veltingi.' },
    { k: 'lager', mynd: 'myndir/notkun-lager.jpg', merki: 'A', t: 'Lager', x: 'Pappi, plast og bretti. Tæki við hvern útgang, merkt með skilti.' },
    { k: 'grill', mynd: 'myndir/notkun-grill.jpg', merki: 'C', t: 'Gasgrill og pallur', x: 'Skrúfaðu fyrir kútinn ef þú getur, og slökktu svo.' },
  ];
  const EF = [
    { k: 'a', mynd: 'myndir/flokkur-a.jpg', ico: 'logi', fl: 'Flokkur A', t: 'Föst efni', x: 'Timbur, pappír, pappi, vefnaður, plast og dekk.', stig: 3, v: 'Góð virkni', n: 'Duftið kælir ekki. Gáðu að glóð þegar eldurinn er slokknaður.' },
    { k: 'b', mynd: 'myndir/flokkur-b.jpg', ico: 'brusi', fl: 'Flokkur B', t: 'Eldfimir vökvar', x: 'Bensín, dísel, olía, málning, lakk og leysiefni.', stig: 4, v: 'Mjög góð virkni', n: 'Sterkasta hlið duftsins. Slekkur hratt, líka á stórum fleti.' },
    { k: 'c', mynd: 'myndir/flokkur-c.jpg', ico: 'kutur', fl: 'Flokkur C', t: 'Gas', x: 'Própan og bútan á kútum, gaslagnir og gasgrill.', stig: 4, v: 'Mjög góð virkni', n: 'Skrúfaðu fyrst fyrir gasið ef þú getur, annars getur það safnast upp.' },
  ];
  const EKKI = [
    { k: 'feiti', mynd: 'myndir/ekki-feiti.jpg', ico: 'panna', fl: 'Flokkur F', t: 'Feiti í potti', x: 'Notaðu eldvarnateppi. Aldrei vatn.' },
    { k: 'tolvur', mynd: 'myndir/ekki-tolvur.jpg', ico: 'skjar', fl: 'Rafeindabúnaður', t: 'Tölvur og töflur', x: 'Duftið skemmir búnað. CO₂ er betra.' },
    { k: 'lithium', mynd: 'myndir/ekki-lithium.jpg', ico: 'rafhlada', fl: 'Liþíumrafhlöður', t: 'Rafhjól og hlaupahjól', x: 'Forðaðu þér og hringdu í 112.' },
  ];
  const SKREF = [
    ['Taktu pinnann úr', 'Rjúfðu innsiglið og togaðu öryggispinnann úr handfanginu.'],
    ['Miðaðu á rót eldsins', 'Beindu stútnum að rótum loganna, ekki upp í reykinn.'],
    ['Kreistu handfangið', 'Þrýstu þétt. Sleppirðu, stöðvast duftið strax.'],
    ['Sópaðu yfir eldinn', 'Hreyfðu stútinn frá hlið til hliðar þar til eldurinn er slokknaður.'],
  ];
  const REGLUR = [
    ['Handfangið í mest 90 cm hæð', 'Í upphengi á merktum, aðgengilegum stað. Aldrei bak við hurð, inni í skáp eða í afkima.'],
    ['Aldrei meira en 25 m að næsta tæki', 'Þar sem eldfimir vökvar eru geymdir er hámarkið 20 m, og tæki við hvern hættustað.'],
    ['Við útganga og á göngum', 'Á sömu stöðum á öllum hæðum, svo fólk viti hvar á að grípa tækið.'],
    ['Minnst tvö tæki á hverri hæð', 'Í atvinnuhúsnæði. Á hæð undir 100 m² með litlu brunaálagi getur eitt tæki dugað.'],
    ['Merkt með F001-skilti', 'Skiltið þarf að sjást líka í rafmagnsleysi, sjálflýsandi eða á neyðarlýsingu.'],
  ];
  const TAEKNI = [['Gerð', 'Forþrýst duftslökkvitæki'], ['Slökkviefni', 'ABC duft, 6 kg'], ['Drifefni', 'Köfnunarefni (N₂)'], ['Slökkvigeta', '43A 233B C'], ['Losunartími', 'Um 15 sekúndur'], ['Kastlengd', 'Um 6 metrar'], ['Hitaþol', '−30 °C til +60 °C'], ['Hæð og þvermál', 'Um 55 cm · 16 cm'], ['Þyngd með dufti', 'Um 9,5 kg'], ['Staðall', 'ÍST EN 3, CE-merkt'], ['Fylgir', 'Veggfesting og þrýstimælir']];
  const SPURN = [
    ['Hvað þýðir 43A 233B C?', 'Tölurnar segja hve stóran eld tækið slökkti í stöðluðu prófi. 43A er 4,3 metra löng timburstæða og 233B eru 233 lítrar af brennandi vökva í prófunarbakka. C þýðir að það má nota á gaselda.'],
    ['Hversu oft þarf að skoða tækið?', 'Einu sinni á ári. Þjónustuaðili með starfsleyfi yfirfer tækið, merkir það með dagsetningu og skráir skoðunina. Sjálfur lítur þú á mælinn mánaðarlega.'],
    ['Hvað geri ég eftir að tækið hefur verið notað?', 'Komdu með það í hleðslu, líka þótt aðeins lítið hafi farið úr því. Tæki sem byrjað er að tæma missir þrýsting og er ekki lengur öruggt.'],
    ['Má geyma tækið í frosti?', 'Já. Það þolir frá −30 °C upp í +60 °C, svo það má vera í óupphituðum bílskúr, sumarhúsi eða bát allan veturinn.'],
    ['Dugar eitt tæki á heimilið?', 'Við mælum með slökkvitæki og eldvarnateppi í eldhúsið á hverju heimili, og reykskynjari á að vera á hverri hæð. Í íbúð hentar léttvatn oft betur en duft, því það óhreinkar minna.'],
    ['Má nota það á rafmagnstæki?', 'Já, duftið leiðir ekki rafmagn. En það sest í allt og getur skemmt viðkvæman búnað, svo við tölvur og rafmagnstöflur er CO₂ betri kostur.'],
  ];

  function tengdar(v) {
    const syn = synilegar(), out = [], sed = new Set([v.id]);
    for (const f of [...new Set(syn.map((x) => x.flokkur))]) {
      if (out.length >= 4) break;
      if (f === v.flokkur) continue;
      const c = syn.find((x) => x.flokkur === f && !sed.has(x.id));
      if (c) { out.push(c); sed.add(c.id); }
    }
    for (const x of syn) { if (out.length >= 4) break; if (!sed.has(x.id)) { out.push(x); sed.add(x.id); } }
    return out;
  }

  function galleri(v, P, rik) {
    const syn = [{ teg: 'vara' }].concat(rik ? NOTKUN.map((n) => ({ teg: 'not', n })) : []);
    const i = Math.min(VV.vara.mynd, syn.length - 1);
    const valid = syn[i];
    let adal;
    if (valid.teg === 'vara') {
      adal = `${rik ? E('span', `${P}.merki`, 'Aðaltæki · verkstæði og lager', 'vv-galleri-merki') : ''}${M('vara.galleri', { src: v.mynd, alt: v.nafn, fit: 'contain', h: 600, bak: '#ffffff' }, { srcKey: `${P}.mynd`, strax: 1 })}`;
    } else {
      const n = valid.n;
      adal = `${M('vara.galleri.not', { src: n.mynd, alt: n.t, fit: 'cover', h: 420 }, { srcKey: `${P}.not.${n.k}.mynd` })}<div class="vv-galleri-texti">${E('span', `${P}.not.${n.k}.merki`, n.merki, 'vv-flokkmerki')}${E('h3', `${P}.not.${n.k}.t`, n.t)}${E('p', `${P}.not.${n.k}.x`, n.x)}</div>`;
    }
    const thumbs = syn.length > 1 ? `<div class="vv-thumbs" role="group" aria-label="Myndir">${syn.map((s, k) => {
      const src = s.teg === 'vara' ? VV.myndSrc(`${P}.mynd`, v.mynd) : VV.myndSrc(`${P}.not.${s.n.k}.mynd`, s.n.mynd);
      return `<button type="button" class="vv-thumb${s.teg === 'vara' ? ' vara' : ''}" data-act="mynd" data-i="${k}" aria-pressed="${k === i}" aria-label="${esc(s.teg === 'vara' ? 'Vörumynd' : s.n.t)}"><img src="${esc(src)}" alt="" loading="lazy"></button>`;
    }).join('')}</div>` : '';
    return `<div class="vv-galleri">${adal}</div>${thumbs}`;
  }

  function kaflarRikir(v, P) {
    const tolur = B(`${P}.tolur`, [['6 kg', 'ABC slökkviduft'], ['43A 233B C', 'Slökkvigeta'], ['≈ 15 sek', 'Losunartími'], ['≈ 6 m', 'Kastlengd']].map(([a, b], i) => `<div class="vv-tala">${E('b', `${P}.tala.${i + 1}.t`, a)}${E('span', `${P}.tala.${i + 1}.s`, b)}</div>`).join(''), 'vv-tolur', 'div');

    const efKort = EF.map((f) => {
      const stig = Math.round(Math.min(4, Math.max(0, nGildi(`${P}.ef.${f.k}.stig`, f.stig))));
      return `<div class="vv-ef">${M(`${P}.ef.${f.k}.mynd`, { src: f.mynd, alt: f.t, fit: 'cover', bak: '#ffffff' }, { fast: 1 })}<div class="vv-ef-i">
<div class="vv-ef-haus"><span class="vv-ef-tafla">${ico(f.ico)}</span><h3>${E('small', `${P}.ef.${f.k}.fl`, f.fl)}${E('span', `${P}.ef.${f.k}.t`, f.t)}</h3></div>
${E('p', `${P}.ef.${f.k}.x`, f.x)}
<div class="vv-virkni"><span data-n="${P}.ef.${f.k}.stig" data-max="4" data-sjg="${f.stig}">${[0, 1, 2, 3].map((j) => `<i${j < stig ? ' class="on"' : ''}></i>`).join('')}</span>${E('span', `${P}.ef.${f.k}.v`, f.v)}</div>
${E('p', `${P}.ef.${f.k}.n`, f.n)}</div></div>`;
    }).join('');
    const ekkiKort = EKKI.map((f) => `<div class="vv-ekki">${M(`${P}.ekki.${f.k}.mynd`, { src: f.mynd, alt: f.t, fit: 'cover', bak: '#ffffff' }, { fast: 1 })}<div class="vv-ekki-i"><span class="vv-ef-tafla">${ico(f.ico)}</span><h3>${E('small', `${P}.ekki.${f.k}.fl`, f.fl)}${E('span', `${P}.ekki.${f.k}.t`, f.t)}</h3>${E('p', `${P}.ekki.${f.k}.x`, f.x)}</div></div>`).join('');
    const eldflokkar = B(`${P}.eldflokkar`, `${yfirHaus(`${P}.eldflokkar`, 'Á hvað virkar tækið best?', 'Eldar skiptast í flokka eftir því hvað brennur. Þetta tæki ræður við þrjá algengustu flokkana.')}<div class="vv-ef-rod">${efKort}</div>${B(`${P}.ekki`, `<div class="vv-ekki-titill">${E('b', `${P}.ekki.titill`, 'Ekki ætlað fyrir')}${E('span', `${P}.ekki.undir`, 'Hér hentar annað betur.')}</div>${ekkiKort}`, 'vv-ekki-rod', 'div')}`, 'vv-kafli');

    const notkun = B(`${P}.notkun`, `${yfirHaus(`${P}.notkun`, 'Hvar kemur tækið að gagni?', 'Þar sem fleiri en ein tegund af eldi getur kviknað á sama stað. Myndirnar eru líka í myndasafninu efst.')}<div class="vv-not-rod">${NOTKUN.map((n) => `<div class="vv-not">${M('vara.not.mynd', { src: n.mynd, alt: n.t, fit: 'cover', h: 200 }, { srcKey: `${P}.not.${n.k}.mynd` })}<div class="vv-not-b">${E('span', `${P}.not.${n.k}.merki`, n.merki, 'vv-flokkmerki')}${E('h3', `${P}.not.${n.k}.t`, n.t)}${E('p', `${P}.not.${n.k}.x`, n.x)}</div></div>`).join('')}</div>${B('bordi', `${ico('skjoldur', 'vv-skjoldur')}${E('p', 'bordi.texti', 'Rétt slökkvitæki getur bjargað lífi, eignum og dregið úr skemmdum.')}<div class="vv-bordi-merki">${E('b', 'bordi.merki', 'Slökkvitæki ehf')}${E('small', 'bordi.undir', 'Slökkvitæki · Þjónusta · Varahlutir')}</div>`, 'vv-bordi', 'div')}`, 'vv-kafli');

    const um = B(`${P}.um`, `<div class="vv-blad" style="padding:40px;gap:18px">${E('h2', `${P}.um.yfir`, 'Um tækið', 'vv-yfir')}
${E('p', `${P}.um.1`, 'Duft 6 kg. ABC er traust aðaltæki þar sem eldur getur kviknað í ólíkum efnum: timbri, pappír og plasti, olíu og bensíni, eða gasi. Eitt og sama tækið ræður við alla þrjá flokkana, svo þú þarft ekki að velja rétt tæki á ögurstundu.', 'vv-txt')}
${E('p', `${P}.um.2`, 'Duftið leggst yfir eldinn, kæfir hann og rýfur efnahvarfið í loganum, svo eldurinn slokknar hratt. Tækið er forþrýst með köfnunarefni og alltaf tilbúið.', 'vv-txt')}
${E('p', `${P}.um.3`, 'Sex kíló eru lágmarkið fyrir duft sem aðaltæki. Tækið er nógu létt til að flestir ráði við það og nógu öflugt til að slökkva eld sem er að byrja að breiðast út.', 'vv-txt')}
<div class="vv-gott">${ico('vidvorun')}${E('p', `${P}.um.gott`, '**Gott að vita:** duftið dreifist víða og byrgir sýn í lokuðu rými. Í skrifstofum og verslunum mælum við frekar með léttvatni.')}</div></div>
<div class="vv-blad" style="padding:36px;gap:16px">${E('h3', `${P}.maelir.yfir`, 'Lestu á mælinn einu sinni í mánuði', 'vv-h3')}${M(`${P}.maelir.mynd`, { src: 'myndir/maelir.jpg', alt: 'Þrýstimælir á slökkvitæki, nálin á grænu', fit: 'cover', h: 200 })}
<ul class="vv-hak">${['Nálin er á græna svæðinu', 'Innsigli og öryggispinni á sínum stað', 'Engar beyglur, ryð eða sprungur í slöngu', 'Tækið hangir á sínum stað og skiltið sést', 'Skoðunarmiðinn er yngri en 12 mánaða'].map((d, i) => `<li>${ico('hak')}${E('span', `${P}.maelir.${i + 1}`, d)}</li>`).join('')}</ul>
${E('p', `${P}.maelir.rautt`, 'Nálin á rauðu? Notaðu ekki tækið. Komdu með það til okkar.', 'vv-heimild')}</div>`, 'vv-tveir');

    const skref = B(`${P}.skref`, `<div class="vv-blad navy" style="padding:44px 44px 40px;gap:28px"><div class="vv-titilrod">${E('h2', `${P}.skref.yfir`, 'Svona notarðu tækið', 'vv-yfir')}${E('span', `${P}.skref.undir`, 'Stattu í 2 til 3 metra fjarlægð, með flóttaleiðina að baki.')}</div>
<div class="vv-skref-rod">${SKREF.map(([t, x], i) => `<div class="vv-skref">${M('vara.skref.mynd', { src: `myndir/skref-${i + 1}.jpg`, alt: t, fit: 'cover', h: 150 }, { srcKey: `${P}.skref.${i + 1}.mynd` })}<div class="vv-skref-haus"><span class="vv-nr">${i + 1}</span>${E('h3', `${P}.skref.${i + 1}.t`, t)}</div>${E('p', `${P}.skref.${i + 1}.x`, x)}</div>`).join('')}</div>
<div class="vv-112"><b>112</b>${E('span', `${P}.skref.112`, 'Ef eldurinn er stærri en þú ræður við: forðaðu þér, lokaðu á eftir þér og hringdu í 112.')}</div></div>`, '', 'div');

    const stadur = B(`${P}.stadur`, `<div class="vv-blad" style="padding:28px">${M(`${P}.veggur.mynd`, { src: 'myndir/veggur.jpg', alt: 'Slökkvitæki á vegg undir F001-skilti', fit: 'cover', h: 460 })}</div>
<div class="vv-blad" style="padding:40px;gap:20px">${E('h2', `${P}.stadur.yfir`, 'Hvar á tækið að vera?', 'vv-yfir')}<div>${REGLUR.map(([b, s], i) => `<div class="vv-regla"><span class="n">${i + 1}</span><div>${E('b', `${P}.regla.${i + 1}.t`, b)}${E('span', `${P}.regla.${i + 1}.x`, s)}</div></div>`).join('')}</div>
${E('p', `${P}.stadur.heimild`, 'Heimildir: reglugerð um slökkvitæki nr. 1068/2011, byggingarreglugerð nr. 112/2012 (9. hluti) og leiðbeiningar 165.BR1.', 'vv-heimild')}</div>`, 'vv-tveir jafnt');

    const geta = Math.round(Math.min(200, Math.max(1, nGildi(`${P}.reikn.geta`, 43))));
    const krafa = Math.max(26, Math.round(0.065 * VV.vara.m2));
    const taeki = Math.max(2, Math.ceil(krafa / geta));
    const reikn = B(`${P}.reikn`, `<div class="vv-blad vv-reikn" style="padding:40px"><div style="display:flex;flex-direction:column;gap:14px">${E('h2', `${P}.reikn.yfir`, 'Hversu mörg tæki þarf?', 'vv-yfir')}${E('p', `${P}.reikn.inng`, 'Veldu stærð hæðarinnar. Samanlögð slökkvigeta á hæð þarf að vera minnst 0,065 A á hvern fermetra og aldrei undir 26A.', 'vv-yfir-inng')}
<div class="vv-flokkar" role="group" aria-label="Gólfflötur hæðar">${[200, 500, 1000, 2000].map((m) => `<button type="button" class="vv-stk" data-act="m2" data-v="${m}" aria-pressed="${VV.vara.m2 === m}">${tala(m)} m²</button>`).join('')}</div>
${E('p', `${P}.reikn.fyrirvari`, 'Leiðbeinandi útreikningur fyrir eina hæð í atvinnuhúsnæði. Í stórum eða skiptum rýmum ræður 25 metra reglan oft fjöldanum. Við komum og metum þörfina.', 'vv-heimild')}</div>
<div class="vv-reikn-svar"><span style="font-size:14px;font-weight:500;color:var(--c-muted)">${esc(texti(`${P}.reikn.haed`, 'Hæð upp á'))} ${tala(VV.vara.m2)} m²</span><b>${taeki} ${esc(texti('reikn.taeki', 'tæki'))}</b>
<span style="font-size:15px">${E('span', `${P}.reikn.lysing`, 'Hvert tæki gefur')} <b style="font:inherit;font-weight:600;color:inherit" data-n="${P}.reikn.geta" data-max="200" data-min="1" data-sjg="43">${geta}A</b> · þarf minnst <b style="font:inherit;font-weight:600;color:inherit">${krafa}A</b></span>
<button type="button" class="vv-btn navy" data-act="setja-fjolda" data-n="${taeki}" style="align-self:flex-start;margin-top:8px">${ico('karfa')}${E('span', 'reikn.takki', 'Setja í körfu')} · ${taeki}</button></div></div>`, '', 'div');

    const taekni = B(`${P}.taekni`, `<div class="vv-blad" style="padding:40px;gap:18px">${E('h2', `${P}.taekni.yfir`, 'Tæknilýsing', 'vv-yfir')}<table class="vv-tafla"><tbody>${TAEKNI.map(([a, b], i) => `<tr>${E('th', `${P}.taekni.${i + 1}.a`, a)}${E('td', `${P}.taekni.${i + 1}.b`, b)}</tr>`).join('')}</tbody></table>
<div class="vv-flokkar"><a class="vv-btn ghost sm" href="#">${ico('skjal')}${E('span', `${P}.taekni.skjal1`, 'Gagnablað · PDF')}</a><a class="vv-btn ghost sm" href="#">${ico('skjal')}${E('span', `${P}.taekni.skjal2`, 'Notkunarleiðbeiningar · PDF')}</a></div></div>
<div style="display:flex;flex-direction:column;gap:18px"><div class="vv-blad" style="padding:36px">${E('h3', `${P}.thjon.yfir`, 'Þjónusta við tækið', 'vv-h3')}${E('p', `${P}.thjon.x`, 'Samkvæmt reglugerð á þjónustuaðili að yfirfara slökkvitæki árlega. Við skoðum, hleðjum og merkjum tækið með dagsetningu.', 'vv-dauft')}
<div class="vv-verdlina">${E('span', `${P}.thjon.1.a`, 'Árleg yfirferð')}${E('b', `${P}.thjon.1.b`, '4.200 kr')}</div><div class="vv-verdlina">${E('span', `${P}.thjon.2.a`, 'Hleðsla eftir notkun')}${E('b', `${P}.thjon.2.b`, '8.410 kr')}</div>
<a class="vv-btn navy sm" href="${OPINBER}" style="align-self:flex-start;margin-top:8px">${E('span', `${P}.thjon.takki`, 'Bóka skoðun')}</a></div>
<div class="vv-blad navy" style="padding:36px">${E('h3', 'hentar.yfir', 'Hvaða tæki hentar?', 'vv-h3')}${E('p', 'hentar.x', '**Duft ABC** vinnur á flestum eldum. **Léttvatn** hentar vel á heimilin, á A og B elda. **CO₂** er fyrir rafmagn og rafeindatæki.', 'vv-dauft')}<a class="vv-btn" href="${OPINBER}" style="align-self:flex-start;margin-top:6px">${E('span', 'hentar.takki', 'Spyrja Loga')}</a></div></div>`, 'vv-tveir taekni', 'div');

    const spurn = B(`${P}.spurn`, `${yfirHaus(`${P}.spurn`, 'Algengar spurningar', null)}<div class="vv-spurn-rod">${SPURN.map(([q, a], i) => `<div class="vv-spurn">${E('h3', `${P}.spurn.${i + 1}.q`, q)}${E('p', `${P}.spurn.${i + 1}.a`, a)}</div>`).join('')}</div>`, 'vv-kafli');

    return tolur + eldflokkar + notkun + um + skref + stadur + reikn + taekni + spurn;
  }

  function sidaVara(id) {
    const v = vara(id);
    if (!v) return `<main class="vv-wrap vv-adal"><div class="vv-tomt">${E('span', 'vara.ekki-til', 'Þessi vara er ekki í versluninni.')}<br><br><a class="vv-btn navy" href="#/">${E('span', 'vara.til-baka', 'Aftur í verslunina')}</a></div></main>`;
    const P = `vara.${id}`, rik = profill(id), uppselt = v.birgdir != null && v.birgdir <= 0;
    const fyrstaMalsgrein = String(v.lysing || '').split(/\n\s*\n/)[0].trim();
    const s = VV.vara;
    const haegri = `<span class="vv-yfirflokkur">${esc(flokkHeiti(v.flokkur))}</span>${E('h1', `${P}.nafn`, v.nafn)}
${E('p', `${P}.inngangur`, rik ? 'Öflugt fjölnota slökkvitæki sem vinnur á eldi í föstum efnum, eldfimum vökvum og gasi. Traust aðaltæki fyrir verkstæði, lager, bílskúr, sumarhús og báta.' : fyrstaMalsgrein, 'vv-inng')}
${rik ? `<div class="vv-pillur">${E('span', `${P}.pilla.1`, '{**A**} · timbur, pappír, plast', 'vv-pilla')}${E('span', `${P}.pilla.2`, '{**B**} · olía, bensín, lakk', 'vv-pilla')}${E('span', `${P}.pilla.3`, '{**C**} · gas', 'vv-pilla')}</div>
<ul class="vv-hak">${['Slökkvigeta **43A 233B C**', 'Þrýstimælir sýnir í fljótu bragði hvort tækið er tilbúið', 'Þolir frost, veggfesting fylgir, CE-merkt samkvæmt ÍST EN 3'].map((d, i) => `<li>${ico('hak')}${E('span', `${P}.atridi.${i + 1}`, d)}</li>`).join('')}</ul>` : ''}
<div class="vv-stort-verd"><b>${kr(v.verd)}</b><small>${tala(v.an)} án vsk</small></div>
<span class="vv-lager">${ico('hringhak')}${uppselt ? E('span', 'lager.uppselt', 'Uppselt í bili. Pantaðu og við látum vita þegar það kemur.') : E('span', 'lager.til', 'Á lager, tilbúið til afhendingar')}</span>
<fieldset class="vv-afh"><legend>${E('span', 'afh.titill', 'Afhending')}</legend>
<button type="button" class="vv-val" data-act="afh" data-v="saekja" aria-pressed="${s.afhending === 'saekja'}"><span class="punktur"></span><span style="flex:1">${E('b', 'afh.saekja.t', 'Sækja hjá okkur')}${E('small', 'afh.saekja.x', '[AFHENDINGARSTAÐUR] · virka daga 8 til 16')}</span>${E('b', 'afh.saekja.verd', '0 kr')}</button>
<button type="button" class="vv-val" data-act="afh" data-v="senda" aria-pressed="${s.afhending === 'senda'}"><span class="punktur"></span><span style="flex:1">${E('b', 'afh.senda.t', 'Fá sent heim')}${E('small', 'afh.senda.x', 'Póstsending um land allt')}</span>${E('b', 'afh.senda.verd', '[VERÐ]')}</button></fieldset>
<div class="vv-kaupa"><div class="vv-fj" role="group" aria-label="Fjöldi"><button type="button" class="vv-stp" data-act="faerri" aria-label="Fækka">${ico('minus')}</button><span>${s.fjoldi}</span><button type="button" class="vv-stp" data-act="fleiri" aria-label="Fjölga">${ico('plus')}</button></div>
<button type="button" class="vv-btn navy" data-act="setja" data-id="${v.id}">${ico('karfa')}${E('span', 'vara.takki', 'Setja í körfu')} · ${kr(v.verd * s.fjoldi)}</button></div>
${s.tilk ? `<div class="vv-tilk" role="status"><span>${esc(s.tilk)}</span><a class="vv-btn ljos sm" href="#/karfa">${E('span', 'vara.skoda-korfu', 'Skoða körfu')}</a></div>` : ''}
<a class="vv-btn ghost" href="${OPINBER}" style="align-self:flex-start">${E('span', 'vara.tilbod', 'Fleiri en 10 tæki? Fá tilboð')}</a>`;

    const venjulegt = rik ? '' : B(`${P}.um`, `<div class="vv-blad" style="padding:40px;gap:16px">${E('h2', 'vara.um.yfir', 'Um vöruna', 'vv-yfir')}${E('p', `${P}.lysing`, String(v.lysing || '').trim() || 'Lýsing kemur fljótlega.', 'vv-txt')}</div>`, '', 'div');
    const oft = B('vara.oft', `${yfirHaus('vara.oft', 'Oft keypt með', null)}<div class="vv-grind">${tengdar(v).map(kort).join('')}</div>`, 'vv-kafli');

    return `<main class="vv-wrap vv-adal" style="padding-top:28px">
<nav class="vv-mola" aria-label="Brauðmolar"><a href="#/">${E('span', 'mola.verslun', 'Vefverslun')}</a><span aria-hidden="true">/</span><a href="#/" data-act="flokkur" data-v="${flokkSlod(v.flokkur)}">${esc(flokkHeiti(v.flokkur))}</a><span aria-hidden="true">/</span><span style="color:var(--c-ink)">${esc(varaNafn(v))}</span></nav>
<div class="vv-vara-haus"><div class="vv-vara-v">${galleri(v, P, rik)}</div><div class="vv-vara-h">${haegri}</div></div>
<div class="vv-kaflar">${rik ? kaflarRikir(v, P) : venjulegt}${oft}</div></main>`;
  }

  // ── Karfa ──────────────────────────────────────────────────────────────
  function sidaKarfa() {
    const linur = iKorfu().map(([id, n]) => ({ v: vara(Number(id)), n }));
    const vorur = linur.reduce((s, l) => s + l.v.verd * l.n, 0);
    const fj = linur.reduce((s, l) => s + l.n, 0);
    if (!linur.length) {
      return `<main class="vv-wrap vv-adal">${E('h1', 'karfa.titill', 'Karfan þín', 'vv-yfir')}<div class="vv-tomt">${E('p', 'karfa.tom', 'Karfan er tóm.')}<br><a class="vv-btn navy" href="#/">${ico('vinstri')}${E('span', 'karfa.halda', 'Halda áfram að versla')}</a></div></main>`;
    }
    const vsk = vorur - vorur / 1.24;
    return `<main class="vv-wrap vv-adal">
<div class="vv-titilrod"><div>${E('h1', 'karfa.titill', 'Karfan þín', 'vv-yfir')}<span class="vv-undir">${fj} ${esc(texti('karfa.vorur-ord', 'vörur · öll verð með vsk'))}</span></div><a class="vv-btn ghost sm" href="#/">${ico('vinstri')}${E('span', 'karfa.halda', 'Halda áfram að versla')}</a></div>
<div class="vv-karfa"><div class="vv-karfa-l">
<div class="vv-blad" style="padding:8px 24px">${linur.map(({ v, n }) => `<div class="vv-lina"><a class="vv-lina-m" href="#/vara/${v.id}"><img src="${esc(varaMynd(v))}" alt="" loading="lazy"></a>
<div><h3><a href="#/vara/${v.id}">${esc(varaNafn(v))}</a></h3><small>${kr(v.verd)} stk.</small><button type="button" class="fjar" data-act="k-fjarlaegja" data-id="${v.id}">${esc(texti('karfa.fjarlaegja', 'Fjarlægja'))}</button></div>
<div class="vv-fj"><button type="button" class="vv-stp litill" data-act="k-faerri" data-id="${v.id}" aria-label="Fækka">${ico('minus')}</button><span>${n}</span><button type="button" class="vv-stp litill" data-act="k-fleiri" data-id="${v.id}" aria-label="Fjölga">${ico('plus')}</button></div>
<div class="samt">${kr(v.verd * n)}</div></div>`).join('')}</div>
<div class="vv-blad">${E('h2', 'karfa.afh', 'Afhending', 'vv-h3')}
<button type="button" class="vv-val" data-act="k-afh" data-v="saekja" aria-pressed="${VV.karfaAfh === 'saekja'}"><span class="punktur"></span><span style="flex:1">${E('b', 'afh.saekja.t', 'Sækja hjá okkur')}${E('small', 'afh.saekja.x', '[AFHENDINGARSTAÐUR] · virka daga 8 til 16')}</span>${E('b', 'afh.saekja.verd', '0 kr')}</button>
<button type="button" class="vv-val" data-act="k-afh" data-v="senda" aria-pressed="${VV.karfaAfh === 'senda'}"><span class="punktur"></span><span style="flex:1">${E('b', 'afh.senda.t', 'Fá sent heim')}${E('small', 'afh.senda.x', 'Póstsending um land allt')}</span>${E('b', 'afh.senda.verd', '[VERÐ]')}</button></div>
<div class="vv-blad">${E('h2', 'karfa.upplysingar', 'Upplýsingar', 'vv-h3')}<div class="vv-reitir">
<label>${esc(texti('karfa.nafn', 'Nafn'))}<input autocomplete="name" placeholder="Jón Jónsson"></label><label>${esc(texti('karfa.kt', 'Kennitala (fyrir reikning)'))}<input inputmode="numeric" placeholder="000000-0000"></label>
<label>${esc(texti('karfa.netfang', 'Netfang'))}<input type="email" autocomplete="email" placeholder="jon@daemi.is"></label><label>${esc(texti('karfa.simi', 'Sími'))}<input type="tel" autocomplete="tel" placeholder="000 0000"></label></div></div>
</div>
<aside class="vv-samantekt">${E('h2', 'karfa.samantekt', 'Samantekt')}
<div class="rod"><span>${esc(texti('karfa.vorur', 'Vörur'))}</span><b>${kr(vorur)}</b></div>
<div class="rod"><span>${esc(texti('karfa.afhending', 'Afhending'))}</span><b>${VV.karfaAfh === 'senda' ? esc(texti('afh.senda.verd', '[VERÐ]')) : '0 kr'}</b></div>
<div class="rod"><span>${esc(texti('karfa.vsk', 'Þar af vsk (24%)'))}</span><b>${kr(vsk)}</b></div>
<div class="alls"><span>${esc(texti('karfa.samtals', 'Samtals'))}</span><b>${kr(vorur)}</b></div>
<button type="button" class="vv-btn breidur" data-act="greida">${E('span', 'karfa.greida', 'Halda áfram í greiðslu')}${ico('haegri')}</button>
${E('p', 'karfa.greidsluleidir', 'Greiðsluleiðir: [KORT · MILLIFÆRSLA · REIKNINGUR Á KENNITÖLU]', 'smatt')}</aside></div></main>`;
  }

  // ── Teiknun og leiðir ──────────────────────────────────────────────────
  function leid() {
    const h = location.hash.replace(/^#\/?/, '');
    const [a, b] = h.split('/');
    if (a === 'vara' && b) return { s: 'vara', id: Number(b) };
    if (a === 'karfa') return { s: 'karfa' };
    return { s: 'forsida' };
  }
  VV.leid = leid;

  function render(efst) {
    VV.sjg = {}; VV.sjgM = {};
    const r = leid();
    VV.sida = r;
    const app = document.getElementById('vv-app');
    const y = window.scrollY;
    const midja = r.s === 'vara' ? sidaVara(r.id) : r.s === 'karfa' ? sidaKarfa() : sidaForsida();
    app.innerHTML = haus() + midja + fotur();
    if (efst) window.scrollTo(0, 0); else window.scrollTo(0, y);
    const v = r.s === 'vara' && vara(r.id);
    document.title = (v ? varaNafn(v) + ' · ' : r.s === 'karfa' ? 'Karfa · ' : '') + 'Vefverslun Brunahólfs';
    if (VV.eftirTeikningu) VV.eftirTeikningu();
  }
  VV.render = render;

  function beitaThema() {
    const th = VV.efni.thema || {};
    const l = Object.assign({}, THEMA0.litir, th.litir || {});
    const st = document.documentElement.style;
    for (const [k, v] of Object.entries(l)) if (okLitur(v) && v !== 'transparent') st.setProperty('--c-' + k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), v);
    const lt = Object.assign({}, THEMA0.letur, th.letur || {});
    const fh = LETUR.includes(lt.fyrirsagnir) ? lt.fyrirsagnir : 'Poppins', fb = LETUR.includes(lt.texti) ? lt.texti : 'Poppins';
    hladaLetri(fh); hladaLetri(fb);
    st.setProperty('--f-head', `'${fh}',system-ui,sans-serif`);
    st.setProperty('--f-body', `'${fb}',system-ui,sans-serif`);
    st.setProperty('--base', Math.min(22, Math.max(13, num(th.grunnstaerd, 16))) + 'px');
    st.setProperty('--r', Math.min(40, Math.max(0, num(th.runun, 16))) + 'px');
    st.setProperty('--r-btn', th.takkar === 'runad' ? '12px' : th.takkar === 'ferkantad' ? '3px' : '999px');
  }
  VV.beitaThema = beitaThema;

  function toast(msg) {
    let t = document.querySelector('.vv-toast');
    if (!t) { t = document.createElement('div'); t.className = 'vv-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.remove(), 3200);
  }
  VV.toast = toast;

  // ── Atburðir ───────────────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (!a || !document.getElementById('vv-app').contains(a)) return;
    const act = a.dataset.act, id = Number(a.dataset.id);
    const s = VV.vara;
    if (act === 'leit') return;
    if (act === 'flokkur') {
      e.preventDefault();
      VV.sia.flokkur = a.dataset.v || '';
      if (leid().s !== 'forsida') { location.hash = '#/'; return; }
      render(false);
    } else if (act === 'i-korfu') {
      baetaVid(id, 1);
      const v = vara(id);
      toast((v ? varaNafn(v) : 'Vara') + ' ' + texti('kort.sett', 'sett í körfu'));
      const f = document.getElementById('vv-fjoldi'); if (f) f.textContent = fjoldiKorfu();
    } else if (act === 'mynd') { s.mynd = Number(a.dataset.i) || 0; render(false); }
    else if (act === 'faerri') { s.fjoldi = Math.max(1, s.fjoldi - 1); render(false); }
    else if (act === 'fleiri') { s.fjoldi = Math.min(99, s.fjoldi + 1); render(false); }
    else if (act === 'afh') { s.afhending = a.dataset.v; render(false); }
    else if (act === 'k-afh') { VV.karfaAfh = a.dataset.v; render(false); }
    else if (act === 'setja') {
      baetaVid(id, s.fjoldi);
      const v = vara(id);
      s.tilk = `${s.fjoldi} × ${v ? varaNafn(v) : ''} ${texti('kort.sett', 'sett í körfu')}`;
      render(false);
    } else if (act === 'm2') { s.m2 = Number(a.dataset.v) || 500; render(false); }
    else if (act === 'setja-fjolda') {
      const r = leid();
      const n = Number(a.dataset.n) || 1;
      if (r.s === 'vara') { baetaVid(r.id, n); s.tilk = `${n} × ${varaNafn(vara(r.id))} ${texti('kort.sett', 'sett í körfu')}`; render(false); }
    } else if (act === 'k-faerri' || act === 'k-fleiri' || act === 'k-fjarlaegja') {
      const n = VV.karfa[id] || 0;
      if (act === 'k-fjarlaegja' || (act === 'k-faerri' && n <= 1)) delete VV.karfa[id];
      else VV.karfa[id] = act === 'k-fleiri' ? Math.min(999, n + 1) : n - 1;
      vistaKorfu();
      render(false);
    } else if (act === 'greida') {
      toast(texti('karfa.prufa-skilabod', VV.stada === 'virk' ? 'Greiðsla er ekki tengd ennþá. Hafðu samband og við göngum frá pöntuninni.' : 'Prufuhamur: greiðsla er ekki tengd ennþá. Engin pöntun var send.'));
    }
  });
  document.addEventListener('change', (e) => {
    const a = e.target.closest('[data-act="rada"]');
    if (!a) return;
    VV.sia.rada = a.value;
    render(false);
  });
  document.addEventListener('input', (e) => {
    const a = e.target.closest('[data-act="leit"]');
    if (!a) return;
    VV.sia.leit = a.value;
    if (leid().s !== 'forsida') { location.hash = '#/'; return; }
    const g = document.getElementById('vv-grind');
    if (g) g.outerHTML = grind();
    if (VV.eftirTeikningu) VV.eftirTeikningu();
  });
  window.addEventListener('hashchange', () => { VV.vara.mynd = 0; VV.vara.fjoldi = 1; VV.vara.tilk = ''; render(true); });
  window.addEventListener('storage', (e) => { if (e.key === KARFA_LYKILL) { VV.karfa = lesaKorfu(); render(false); } });

  // ── Hleðsla ────────────────────────────────────────────────────────────
  async function saekja(drog) {
    const r = await fetch(API + (drog ? '?drog=1' : ''), { cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Villa ' + r.status);
    VV.stada = d.stada; VV.efni = d.efni || {}; VV.vorur = d.vorur || [];
    VV.drog_uppfaert = d.drog_uppfaert; VV.utgafa = d.utgafa || 0; VV.virkjad = d.virkjad || null;
    return d;
  }
  VV.saekja = saekja;

  (async () => {
    const q = new URLSearchParams(location.search);
    const breyta = q.has('breyta');
    try { await saekja(breyta); } catch (e) {
      document.getElementById('vv-app').innerHTML = `<div class="vv-hledur">Ekki tókst að sækja verslunina (${esc(e.message)}). <a href="">Reyna aftur</a></div>`;
      return;
    }
    VV.breytaLeyft = breyta || VV.stada !== 'virk';
    beitaThema();
    render(false);
    if (VV.breytaLeyft) {
      const s = document.createElement('script');
      s.src = 'ritill.js?v=' + (document.querySelector('meta[name="vv-utgafa"]') || {}).content;
      document.body.appendChild(s);
    }
  })();
})();
