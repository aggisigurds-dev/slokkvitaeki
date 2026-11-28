/* === HERMIR: BENDA CLAUDE Á (539) ============================================
 *
 * Agnar 28.11.2026: „geturðu gert manni kleift í t.d. Öpp page að opna bara alla síðuna í emulator, svo maður getur
 * skoðað síðuna eins og hún birtist þar, og þá séð frekar hvað má breyta og get bent claude á hvar þarf að laga".
 *
 * Tækjaramminn (320) var til og Öpp-síðan (354) opnar hann nú fyrir allt kerfið eða eitt app. Þessi pappi bætir við
 * því sem vantaði: leið til að BENDA á hlut í rammanum og skrifa hvað er að, þannig að Claude-lota finni hann aftur.
 *
 *   • Takki „Benda Claude á" í stiku rammans. Hann opnar spjald vinstra megin (í stað Stílstjórans) og kveikir á bendli.
 *   • Smellur á hlut í rammanum virkjar hann EKKI heldur velur hann: heiti, DOM-slóð, texti, stærð, síða, sýn, app,
 *     tæki og síðustærð eru lesin af hlutnum. Agnar skrifar athugasemd og vistar.
 *   • „Nota síðuna" í spjaldinu slekkur á bendlinum svo hægt sé að flakka í rammanum; spjaldið stendur opið á meðan.
 *   • Vistun: AppSettings undir EIGIN lykli, `hermir_abendingar.<id>` (djúpsameining á þjóninum, svo ein ábending
 *     skrifar ekki yfir aðra). Ekkert í localStorage: ábendingarnar eru eins á öllum vélum (regla 15.10.2026).
 *   • Claude-megin: `node tools/hermir-abendingar.cjs` listar opnar ábendingar, `--lokid <id> "<hvað var gert>"`
 *     lokar. Lokaðar birtast í spjaldinu undir „Lagað".
 *   • „Fjarlægja" eyðir engu: ábendingin fær stöðuna `eytt` og hverfur úr listanum.
 *
 * Barnið (?devframe=) keyrir þennan pappa ekki: foreldrið teygir sig inn í iframe-ið (sama lén) og hlustar þar.
 * Ramminn er aðeins á sama léni; Brunahólfs-flipar í ramma (annað lén) fá engan bendil og það er sagt í spjaldinu.
 * ========================================================================== */
(() => {
  if (window.__hermirBenda539) return;
  window.__hermirBenda539 = true;
  try { if (new URLSearchParams(location.search).get('devframe')) return; } catch (_) {}

  const LYK = 'hermir_abendingar';
  const STILL = 'hermir-benda-539';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const DISP = '"Playfair Display",Georgia,serif';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Staðan lifir í breytum, ekki í DOM: ramminn er endurbyggður þegar skipt er um tæki í stikunni.
  let opid = false;      // spjaldið sýnilegt
  let benda = false;     // bendillinn virkur (smellur velur í stað þess að virkja)
  let drog = null;       // hlutur sem var valinn og bíður athugasemdar
  let bod = '';          // ein lína neðst í spjaldinu

  const ov = () => document.getElementById('_devframe-overlay');
  const ifr = () => { try { return (window.SlokkDevFrame && SlokkDevFrame.iframe()) || null; } catch (_) { return null; } };
  const barn = () => { try { const f = ifr(); return (f && f.contentDocument && f.contentWindow) ? { doc: f.contentDocument, win: f.contentWindow } : null; } catch (_) { return null; } };

  /* ── gögn ──────────────────────────────────────────────────────────────── */
  function allar() {
    try { const o = window.AppSettings && AppSettings.get(LYK); return (o && typeof o === 'object') ? o : {}; } catch (_) { return {}; }
  }
  function listi(stada) {
    const o = allar();
    return Object.keys(o).map(k => o[k]).filter(m => m && m.id && (m.stada || 'opin') === stada)
      .sort((a, b) => String(b.ts || '').localeCompare(String(a.ts || '')));
  }
  async function vistaEina(m) {
    try {
      if (!window.AppSettings || !AppSettings.save) return false;
      const patch = {}; patch[LYK] = {}; patch[LYK][m.id] = m;
      return !!(await AppSettings.save(patch));
    } catch (_) { return false; }
  }
  function dags(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    const p = n => String(n).padStart(2, '0');
    return p(d.getDate()) + '.' + p(d.getMonth() + 1) + '.' + d.getFullYear() + ' kl. ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  /* ── lestur af hlutnum sem bent er á ───────────────────────────────────── */
  const STODUKLASAR = /^(active|on|open|opid|opin|hover|focus|selected|valid|show|hidden|is-.+|_hb.*)$/;
  function heiti(el) {
    const t = el.tagName.toLowerCase();
    if (el.id) return t + '#' + el.id;
    const kl = Array.prototype.filter.call(el.classList || [], c => !STODUKLASAR.test(c) && c.length < 40).slice(0, 2);
    return t + (kl.length ? '.' + kl.join('.') : '');
  }
  function slod(el) {
    const ut = []; let n = el, d = 0;
    while (n && n.nodeType === 1 && n.tagName !== 'HTML' && n.tagName !== 'BODY' && d < 7) {
      let h = heiti(n);
      if (!n.id && n.parentElement) {
        const sys = Array.prototype.filter.call(n.parentElement.children, c => c.tagName === n.tagName);
        if (sys.length > 1) h += ':nth-of-type(' + (sys.indexOf(n) + 1) + ')';
      }
      ut.unshift(h);
      if (n.id) break;
      n = n.parentElement; d++;
    }
    return ut.join(' > ');
  }
  function textiHlutar(el) {
    let s = '';
    try { s = el.innerText || el.value || el.getAttribute('aria-label') || el.getAttribute('title') || el.getAttribute('placeholder') || el.getAttribute('alt') || ''; } catch (_) {}
    s = String(s).replace(/\s+/g, ' ').trim();
    return s.length > 90 ? s.slice(0, 88) + '…' : s;
  }
  function taeki() {
    try {
      const f = ifr(), k = SlokkDevFrame.device();
      const nofn = { simi: 'Sími', simiL: 'Sími á hlið', tafla: 'Spjaldtölva', taflaL: 'Spjaldtölva á hlið', s26: 'S26' };
      return (nofn[k] || k || '?') + ' ' + parseInt(f.style.width, 10) + '×' + parseInt(f.style.height, 10);
    } catch (_) { return '?'; }
  }
  function lesaHlut(el) {
    const b = barn(); if (!b) return null;
    const r = el.getBoundingClientRect();
    let app = '', sidulykill = '', zoom = '';
    try { const u = new URL(b.win.location.href); app = u.searchParams.get('app') || ''; sidulykill = u.searchParams.get('page') || ''; } catch (_) {}
    try { if (!app) app = (b.doc.body && b.doc.body.getAttribute('data-app')) || ''; } catch (_) {}
    try {
      const z = b.win.AppPageZoom && b.win.AppPageZoom.get && b.win.AppPageZoom.get();
      const s = (z && typeof z === 'object') ? z.s : z;
      if (isFinite(+s) && +s > 0) zoom = Math.round(+s * 100) + ' %';
    } catch (_) {}
    let syn = '';
    try { const v = el.closest('.view') || b.doc.querySelector('.view.active'); syn = v && v.id ? v.id : ''; } catch (_) {}
    return {
      heiti: heiti(el), slod: slod(el), texti: textiHlutar(el),
      kassi: Math.round(r.width) + '×' + Math.round(r.height),
      sida: (b.win.location.hash || '') || (sidulykill ? '#' + sidulykill : '') || b.win.location.pathname,
      syn: syn, app: app, taeki: taeki(), zoom: zoom
    };
  }

  /* ── bendillinn inni í rammanum ────────────────────────────────────────── */
  const STODVA = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'dblclick', 'contextmenu', 'submit'];
  function tengjaBarn() {
    const b = barn(); if (!b) return false;
    if (b.win.__hb539) { stillaBarn(); return true; }
    b.win.__hb539 = true;
    const st = b.doc.createElement('style');
    st.id = '_hb-still';
    st.textContent =
      'html._hb-benda,html._hb-benda *{cursor:crosshair!important}' +
      'html._hb-benda [data-hb-yfir]{outline:2px solid #e2382f!important;outline-offset:-2px!important}' +
      '[data-hb-valid]{outline:3px solid #e2382f!important;outline-offset:-3px!important}';
    (b.doc.head || b.doc.documentElement).appendChild(st);
    let yfir = null;
    b.win.addEventListener('mousemove', e => {
      if (!benda) return;
      const el = e.target && e.target.nodeType === 1 ? e.target : null;
      if (el === yfir) return;
      if (yfir) { try { yfir.removeAttribute('data-hb-yfir'); } catch (_) {} }
      yfir = el;
      if (yfir) { try { yfir.setAttribute('data-hb-yfir', ''); } catch (_) {} }
    }, true);
    b.win.addEventListener('mouseout', e => {
      if (e.relatedTarget) return;
      if (yfir) { try { yfir.removeAttribute('data-hb-yfir'); } catch (_) {} yfir = null; }
    }, true);
    STODVA.forEach(nafn => b.win.addEventListener(nafn, e => {
      if (!benda) return;
      e.stopPropagation(); e.stopImmediatePropagation();
      if (e.cancelable) e.preventDefault();
    }, true));
    b.win.addEventListener('click', e => {
      if (!benda) return;
      e.stopPropagation(); e.stopImmediatePropagation(); e.preventDefault();
      const el = e.target && e.target.nodeType === 1 ? e.target : null;
      if (!el) return;
      velja(el);
    }, true);
    stillaBarn();
    return true;
  }
  function stillaBarn() {
    const b = barn(); if (!b) return;
    try { b.doc.documentElement.classList.toggle('_hb-benda', !!benda); } catch (_) {}
    if (!benda) { try { b.doc.querySelectorAll('[data-hb-yfir]').forEach(x => x.removeAttribute('data-hb-yfir')); } catch (_) {} }
  }
  function hreinsaVal() {
    const b = barn(); if (!b) return;
    try { b.doc.querySelectorAll('[data-hb-valid]').forEach(x => x.removeAttribute('data-hb-valid')); } catch (_) {}
  }
  function velja(el) {
    const info = lesaHlut(el); if (!info) return;
    hreinsaVal();
    try { el.removeAttribute('data-hb-yfir'); el.setAttribute('data-hb-valid', ''); } catch (_) {}
    drog = Object.assign({ nota: (drog && drog.nota) || '' }, info);
    bod = '';
    teikna();
    const ta = document.querySelector('#_hb-spjald [data-hb-nota]');
    if (ta) { try { ta.focus(); } catch (_) {} }
  }

  /* ── spjaldið við hlið rammans ─────────────────────────────────────────── */
  function stilar() {
    if (document.getElementById(STILL)) return;
    const S = '#_devframe-overlay #_hb-spjald';
    const TAKKI = 'all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:0 14px;border-radius:8px;' +
      'font:700 13px ' + SANS + ';white-space:nowrap;';
    const css = [
      '#_devframe-overlay._hb-on #_devframe-editor{display:none!important}',
      S + '{display:none;flex:0 0 340px;max-width:min(38vw,400px);min-width:260px;box-sizing:border-box;overflow:auto;padding:14px;background:#16181c;border:1px solid #000;border-radius:14px;' +
        'box-shadow:0 18px 50px -24px rgba(0,0,0,.55);color:#eef1f5;font:13.5px/1.45 ' + SANS + ';text-align:left}',
      '#_devframe-overlay._hb-on #_hb-spjald{display:block}',
      '#_devframe-overlay._df-phone #_hb-spjald{flex:0 0 42vh;width:100%;max-width:none;order:2}',
      S + ' .hb-h small{display:block;font:700 9.5px ' + MONO + ';letter-spacing:.18em;text-transform:uppercase;color:#c9ced6}',
      S + ' .hb-h strong{display:block;font:800 20px/1.15 ' + DISP + ';color:#fff;margin-top:2px}',
      S + ' .hb-l{margin:8px 0 10px;color:#dfe3ea}',
      S + ' .hb-seg{display:flex;gap:3px;padding:3px;background:#0b0c0f;border:1px solid #000;border-radius:10px}',
      S + ' .hb-seg button{' + TAKKI + 'flex:1 1 0;color:#dfe3ea;background:transparent}',
      S + ' .hb-seg button.on{background:linear-gradient(180deg,#c22f26 0%,#951818 50%,#650c0d 100%)!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.22)}',
      S + ' .hb-sec{font:700 10px ' + MONO + ';letter-spacing:.16em;text-transform:uppercase;color:#c9ced6;margin:16px 0 6px}',
      S + ' .hb-kort{background:#23262c;border:1px solid #000;border-radius:10px;padding:10px 11px;margin-bottom:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.06)}',
      S + ' .hb-drog{border-color:#e2382f;box-shadow:0 0 0 1px #e2382f}',
      S + ' .hb-nota{color:#fff;font-weight:600;white-space:pre-wrap;overflow-wrap:anywhere}',
      S + ' .hb-hvad{color:#eef1f5;overflow-wrap:anywhere;margin-top:3px}',
      S + ' .hb-hvad b{font:700 12px ' + MONO + ';color:#fff}',
      S + ' .hb-m{font:500 11.5px ' + MONO + ';color:#c9ced6;margin-top:4px;overflow-wrap:anywhere}',
      S + ' .hb-svar{margin-top:5px;color:#b9e6c8;overflow-wrap:anywhere}',
      S + ' textarea{all:unset;box-sizing:border-box;display:block;width:100%;min-height:76px;margin-top:8px;padding:9px 10px;background:#fff;color:#141822;border:1px solid #000;border-radius:8px;' +
        'font:15px/1.4 ' + SANS + ';white-space:pre-wrap;overflow-wrap:anywhere;cursor:text}',
      S + ' textarea::placeholder{color:#5b6370}',
      S + ' .hb-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
      S + ' .hb-b{' + TAKKI + 'color:#eef1f5;background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)!important;border:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14)}',
      S + ' .hb-b:hover{color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 0 0 1px rgba(224,96,90,.55)}',
      S + ' .hb-b.hb-gull{color:#1a1205;background:linear-gradient(180deg,#f7d57a 0%,#d9a531 100%)!important;border-color:#5a3f06}',
      S + ' .hb-b[disabled]{opacity:.55;cursor:default}',
      S + ' .hb-bod{margin-top:10px;color:#fff;white-space:pre-wrap;overflow-wrap:anywhere}',
      S + ' .hb-tomt{color:#dfe3ea}',
      '#_devframe-overlay #_hb-takki{all:unset;box-sizing:border-box;cursor:pointer;flex:0 0 auto;white-space:nowrap;font:700 12.5px ' + SANS + ';color:#1a1205;' +
        'background:linear-gradient(180deg,#f7d57a 0%,#d9a531 100%);padding:8px 14px;border-radius:9px}',
      '#_devframe-overlay #_hb-takki.on{color:#fff;background:linear-gradient(180deg,#c22f26 0%,#951818 50%,#650c0d 100%)}'
    ].join('\n');
    const s = document.createElement('style'); s.id = STILL; s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  function kortHtml(m, lokad) {
    return '<div class="hb-kort">' +
      '<div class="hb-nota">' + esc(m.nota || '(engin athugasemd)') + '</div>' +
      '<div class="hb-hvad"><b>' + esc(m.heiti) + '</b>' + (m.texti ? ' „' + esc(m.texti) + '"' : '') + '</div>' +
      '<div class="hb-m">' + esc([m.taeki, m.sida, dags(m.ts)].filter(Boolean).join(' · ')) + '</div>' +
      (lokad
        ? '<div class="hb-svar">Lagað' + (m.lokid_ts ? ' ' + esc(dags(m.lokid_ts)) : '') + (m.svar ? ': ' + esc(m.svar) : '') + '</div>'
        : '<div class="hb-row"><button type="button" class="hb-b" data-hb="syna" data-id="' + esc(m.id) + '">Sýna í rammanum</button>' +
          '<button type="button" class="hb-b" data-hb="fjarlaegja" data-id="' + esc(m.id) + '">Fjarlægja</button></div>') +
      '</div>';
  }
  function spjaldHtml() {
    const opnar = listi('opin'), lokadar = listi('lokid').slice(0, 5);
    const nair = !!barn();
    let h = '<div class="hb-h"><small>Hermir</small><strong>Ábendingar til Claude</strong></div>';
    if (!nair) {
      h += '<p class="hb-l">Þessi síða í rammanum er á öðru léni, svo ekki er hægt að benda á hluti í henni. Opnaðu síðu úr Slökkvitæki-kerfinu í rammanum.</p>';
    } else {
      h += '<p class="hb-l">' + (benda
        ? 'Smelltu á það í rammanum sem á að laga og skrifaðu hvað er að.'
        : 'Þú notar síðuna í rammanum eins og venjulega. Veldu „Benda" þegar þú vilt merkja eitthvað.') + '</p>' +
        '<div class="hb-seg"><button type="button" data-hb="benda-a" class="' + (benda ? 'on' : '') + '">Benda</button>' +
        '<button type="button" data-hb="benda-af" class="' + (benda ? '' : 'on') + '">Nota síðuna</button></div>';
    }
    if (drog) {
      h += '<div class="hb-sec">Ný ábending</div><div class="hb-kort hb-drog">' +
        '<div class="hb-hvad"><b>' + esc(drog.heiti) + '</b>' + (drog.texti ? ' „' + esc(drog.texti) + '"' : '') + '</div>' +
        '<div class="hb-m">' + esc([drog.taeki, drog.sida, drog.kassi + ' px'].filter(Boolean).join(' · ')) + '</div>' +
        '<textarea data-hb-nota rows="3" placeholder="Hvað á að laga hér?" aria-label="Hvað á að laga hér?">' + esc(drog.nota || '') + '</textarea>' +
        '<div class="hb-row"><button type="button" class="hb-b hb-gull" data-hb="vista">Vista ábendingu</button>' +
        '<button type="button" class="hb-b" data-hb="haetta">Hætta við</button></div></div>';
    }
    h += '<div class="hb-sec">Opnar · ' + opnar.length + '</div>' +
      (opnar.length ? opnar.map(m => kortHtml(m, false)).join('') : '<div class="hb-tomt">Engin opin ábending.</div>');
    if (opnar.length) h += '<div class="hb-row"><button type="button" class="hb-b" data-hb="afrita">Afrita allar sem texta</button></div>';
    if (lokadar.length) h += '<div class="hb-sec">Lagað · ' + listi('lokid').length + '</div>' + lokadar.map(m => kortHtml(m, true)).join('');
    if (bod) h += '<div class="hb-bod">' + esc(bod) + '</div>';
    return h;
  }
  function teikna() {
    const sp = document.getElementById('_hb-spjald'); if (!sp) return;
    const skrun = sp.scrollTop;
    sp.innerHTML = spjaldHtml();
    sp.scrollTop = skrun;
    const o = ov(); if (o) o.classList.toggle('_hb-on', !!opid);
    const t = document.getElementById('_hb-takki');
    if (t) {
      const n = listi('opin').length;
      t.classList.toggle('on', !!opid);
      t.textContent = 'Benda Claude á' + (n ? ' · ' + n : '');
      t.title = opid ? 'Loka ábendingaspjaldinu (Stílstjórinn kemur aftur)' : 'Smelltu á það í rammanum sem á að laga og skrifaðu hvað er að';
    }
    stillaBarn();
  }

  function textiFyrirClaude() {
    const opnar = listi('opin');
    const linur = ['Ábendingar úr herminum (Slökkvitæki-appið): ' + opnar.length + (opnar.length === 1 ? ' opin' : ' opnar')];
    opnar.forEach((m, i) => {
      linur.push('');
      linur.push((i + 1) + '. [' + m.id + '] ' + (m.nota || '(engin athugasemd)'));
      linur.push('   Hlutur: ' + m.heiti + (m.texti ? ' „' + m.texti + '"' : '') + (m.kassi ? ' · ' + m.kassi + ' px' : ''));
      linur.push('   Slóð í DOM: ' + m.slod);
      linur.push('   Síða: ' + [m.sida, m.syn ? 'sýn ' + m.syn : '', m.app ? 'app ' + m.app : ''].filter(Boolean).join(' · '));
      linur.push('   Tæki: ' + [m.taeki, m.zoom ? 'síðustærð ' + m.zoom : ''].filter(Boolean).join(' · '));
      linur.push('   Skráð: ' + dags(m.ts));
    });
    return linur.join('\n');
  }

  async function adgerd(b) {
    const hv = b.dataset.hb, id = b.dataset.id;
    if (hv === 'benda-a' || hv === 'benda-af') { benda = hv === 'benda-a'; if (benda) tengjaBarn(); teikna(); return; }
    if (hv === 'haetta') { drog = null; hreinsaVal(); bod = ''; teikna(); return; }
    if (hv === 'vista') {
      if (!drog) return;
      const ta = document.querySelector('#_hb-spjald [data-hb-nota]');
      const m = {
        id: 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        ts: new Date().toISOString(), stada: 'opin',
        nota: String(ta ? ta.value : drog.nota || '').trim(),
        heiti: drog.heiti, slod: drog.slod, texti: drog.texti, kassi: drog.kassi,
        sida: drog.sida, syn: drog.syn, app: drog.app, taeki: drog.taeki, zoom: drog.zoom
      };
      b.disabled = true;
      const ok = await vistaEina(m);
      // AppSettings geymir skrifið í biðröð og reynir aftur þegar það mistekst, svo ábendingin er í minni hvort sem er.
      drog = null; hreinsaVal();
      bod = ok ? 'Vistað. Ábendingin bíður Claude.' : 'Vistun á þjóninn mistókst núna. Ábendingin er geymd og reynt er aftur; ekki loka vafranum strax.';
      teikna(); return;
    }
    if (hv === 'fjarlaegja' && id) {
      const m = allar()[id]; if (!m) return;
      b.disabled = true;
      const ok = await vistaEina(Object.assign({}, m, { stada: 'eytt', eytt_ts: new Date().toISOString() }));
      bod = ok ? 'Fjarlægt af listanum.' : 'Tókst ekki að vista núna; reynt er aftur.';
      teikna(); return;
    }
    if (hv === 'syna' && id) {
      const m = allar()[id], bb = barn(); if (!m || !bb) return;
      let el = null;
      try { el = bb.doc.querySelector(m.slod); } catch (_) {}
      if (!el || !el.getClientRects().length) { bod = 'Hluturinn sést ekki á síðunni sem er opin í rammanum. Hann var skráður á ' + (m.sida || 'annarri síðu') + '.'; teikna(); return; }
      hreinsaVal();
      try { el.scrollIntoView({ block: 'center', inline: 'center' }); el.setAttribute('data-hb-valid', ''); } catch (_) {}
      setTimeout(() => { try { el.removeAttribute('data-hb-valid'); } catch (_) {} }, 3500);
      bod = ''; teikna(); return;
    }
    if (hv === 'afrita') {
      const txt = textiFyrirClaude();
      try { await navigator.clipboard.writeText(txt); bod = 'Afritað. Límdu textann í Claude-lotu.'; }
      catch (_) { bod = txt; }
      teikna(); return;
    }
  }

  /* ── festing við rammann (hann er endurbyggður við hvert open) ─────────── */
  function festa() {
    const o = ov(); if (!o || o.querySelector('#_hb-takki')) return;
    const stika = o.firstElementChild, rod = o.querySelector('#_devframe-row'), svid = o.querySelector('#_devframe-stage');
    if (!stika || !rod || !svid) return;
    stilar();
    drog = null; bod = '';
    const t = document.createElement('button');
    t.id = '_hb-takki'; t.type = 'button';
    // Fremst í stikunni: nýja aðgerðin sést alltaf, líka þegar stikan brotnar í tvær línur.
    stika.insertBefore(t, stika.firstChild);
    // Takkinn bætist við EFTIR að 320 reiknaði skölunina; resize lætur hann mæla stikuna aftur.
    try { window.dispatchEvent(new Event('resize')); } catch (_) {}
    t.addEventListener('click', e => {
      e.preventDefault();
      opid = !opid; benda = opid;
      if (!opid) { drog = null; hreinsaVal(); }
      if (opid) tengjaBarn();
      teikna();
    });
    const sp = document.createElement('div');
    sp.id = '_hb-spjald';
    rod.insertBefore(sp, svid);
    sp.addEventListener('click', e => {
      const b = e.target.closest('button[data-hb]'); if (!b || !sp.contains(b) || b.disabled) return;
      e.preventDefault(); adgerd(b);
    });
    sp.addEventListener('input', e => { if (drog && e.target.matches('[data-hb-nota]')) drog.nota = e.target.value; });
    const f = ifr();
    if (f) f.addEventListener('load', () => { drog = null; if (opid) { tengjaBarn(); teikna(); } });
    if (opid) tengjaBarn();
    teikna();
  }
  try {
    new (window.__NativeMutationObserver || MutationObserver)(() => { try { festa(); } catch (_) {} }).observe(document.body, { childList: true });
  } catch (_) {}
  festa();

  window.HermirBenda = {
    opnar: () => listi('opin'),
    texti: textiFyrirClaude,
    stada: () => ({ opid: opid, benda: benda, drog: !!drog }),
    version: '539'
  };
  console.log('[patch-539] hermir: benda Claude á');
})();
/* === END HERMIR: BENDA CLAUDE Á === */
