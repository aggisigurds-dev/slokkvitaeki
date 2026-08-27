/* === TÖFLU-EDITOR (322) — „STILLA TÖFLU" =====================================
 *
 * Hönnun Agnars 26.08 („Töflu-editor 2.0" + „Stilla útlit v2"): í stað þess að
 * veiða element með „Velja hlut" og draga sleða sem gera ekkert, opnast einföld
 * verkfærastika BEINT á töflu síðunnar:
 *
 *     STILLA TÖFLU · <síða>
 *     LETUR   [leturgerð ▾]  − 13 +
 *     LÍNUHÆÐ − 100% +
 *     [Þétt] [Miðlungs] [Rúmgott]        ✓ Vista síðu   ↺
 *
 * ÞRJÁR ÁSTÆÐUR FYRIR AÐ ÞETTA VIRKAR ÞAR SEM SLEÐARNIR GERÐU ÞAÐ EKKI:
 *
 * 1. Stillingarnar fara í `window.TableLook` (patch 319) — SÖMU geymslu og
 *    dálkabreiddirnar. 319 skrifar þær sem reglur beint á `tbody td` / `thead th`,
 *    svo þær lenda á FRUMUNUM. Stílstjórinn skrifaði á <table> og frumurnar hafa
 *    sínar eigin reglur, svo erfðin náði aldrei niður („letrið fór 14→9 í
 *    panelinum en taflan breyttist ekkert").
 * 2. Geymslan er þegar viðvarandi (AppSettings) OG er lesin/skrifuð af ÚTGÁFUR
 *    í 262 — þannig fylgir töfluútlitið sjálfkrafa með „Vista síðu" og
 *    endurheimtist með eldri útgáfum. Engin ný geymsla, engin ný samstilling.
 * 3. Steppar í stað sleða: talan sem sést ER talan sem gildir. Enginn
 *    einingaruglingur (px vs %) eins og felldi línuhæðar-sleðann.
 *
 * Töfluna finnum við sjálf á virku síðunni — ekkert „Velja hlut" fyrst.
 * Dálka-dragið (319) og Töflunetið (321) eru ÓSNERT; þessi patch bætir aðeins
 * við letur-/línuhæðar-/þéttleika-stjórn ofan á sama grunn.
 */
(() => {
  if (window.__tofluEditorInstalled) return;
  window.__tofluEditorInstalled = true;

  const FONTS = [
    ['', '(sjálfgefið)'],
    ['"IBM Plex Sans",-apple-system,"Segoe UI",sans-serif', 'IBM Plex Sans'],
    ['"Public Sans",system-ui,sans-serif', 'Public Sans'],
    ['system-ui,-apple-system,sans-serif', 'Kerfisletur'],
    ['Verdana,Geneva,sans-serif', 'Verdana'],
    ['Georgia,"Times New Roman",serif', 'Georgia'],
    ['ui-monospace,Consolas,monospace', 'Jafnbreitt']
  ];
  // Þéttleiki = leturstærð + línuhæð + lóðrétt bil í einu höggi. „90% tilfella
  // þarf ekkert meira" (Agnar) — þetta leysir „lækka row height" án pixla-hugsunar.
  const DENSITY = {
    'Þétt':     { fs: 11, lh: 105, padY: 2 },
    'Miðlungs': { fs: 13, lh: 130, padY: 6 },
    'Rúmgott':  { fs: 15, lh: 155, padY: 11 }
  };
  const FS_MIN = 9, FS_MAX = 22, LH_MIN = 70, LH_MAX = 170, LH_STEP = 5;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function activeView() { return document.querySelector('.view.active'); }
  // Stærsta SÝNILEGA taflan á virku síðunni — það er sú sem notandinn á við.
  function pickTable() {
    const v = activeView(); if (!v) return null;
    const ts = [...v.querySelectorAll('table')]
      .filter(t => t.offsetWidth > 200 && t.querySelector('tbody td'));
    if (!ts.length) return null;
    return ts.sort((a, b) =>
      b.querySelectorAll('tbody tr').length - a.querySelectorAll('tbody tr').length)[0];
  }
  // Sami lykill og 319 notar fyrir dálkabreiddirnar — svo allt situr á einum stað.
  function keyFor(t) {
    const v = t.closest('.view'); const vid = v && v.id; if (!vid) return null;
    const cls = t.id ? ('#' + t.id) : (t.classList[0] ? ('.' + t.classList[0]) : '');
    return vid + '|' + (cls || 'table');
  }
  function entry(create) {
    const TL = window.TableLook; const t = pickTable();
    if (!TL || !t) return null;
    const k = keyFor(t); if (!k) return null;
    const s = TL.get();
    if (!s[k] && !create) return { store: s, key: k, e: {}, table: t };
    s[k] = s[k] || {};
    return { store: s, key: k, e: s[k], table: t };
  }
  function readVals() {
    const en = entry(false);
    const t = en && en.table;
    const e = (en && en.e) || {};
    let fs = e.fs, lh = e.lh;
    // Ekkert vistað enn → lesa það sem taflan sýnir NÚNA, svo talan í stikunni
    // sé alltaf sönn (ekki uppdiktað sjálfgildi).
    if (t) {
      const td = t.querySelector('tbody td');
      if (td) {
        const cs = getComputedStyle(td);
        if (!fs) fs = Math.round(parseFloat(cs.fontSize)) || 13;
        if (!lh) {
          const l = parseFloat(cs.lineHeight), f = parseFloat(cs.fontSize);
          lh = (isFinite(l) && isFinite(f) && f > 0) ? Math.round((l / f) * 100) : 130;
        }
      }
    }
    return { fs: fs || 13, lh: lh || 130, ff: e.ff || '', padY: e.padY, has: !!t };
  }
  function write(patch) {
    const en = entry(true); if (!en) return;
    Object.keys(patch).forEach(k => {
      const v = patch[k];
      if (v === null || v === '' || v === undefined) delete en.e[k]; else en.e[k] = v;
    });
    window.TableLook.set(en.store);   // vistar + endurskrifar CSS
    render();
    try { if (window.Toast && Toast.show) Toast.show('✓ Töflu-útlit uppfært'); } catch (_) {}
  }

  // ── stikan ────────────────────────────────────────────────────────────────
  const BAR = '_te-bar';
  function css() {
    if (document.getElementById('_te-css')) return;
    const s = document.createElement('style'); s.id = '_te-css';
    s.textContent = [
      '#' + BAR + '{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 12px;background:#171a21;color:#e8eaf0;border-radius:11px;font:13px "IBM Plex Sans",-apple-system,"Segoe UI",sans-serif;margin:0 0 10px}',
      '#' + BAR + ' .te-brand{font-weight:800;font-size:12px;letter-spacing:.5px;color:#ff8a80}',
      '#' + BAR + ' .te-tgt{background:#262b36;border:1px solid #3a4150;border-radius:8px;padding:4px 9px;font-size:12px;font-weight:600;max-width:46vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#' + BAR + ' .te-grp{display:flex;align-items:center;gap:5px;background:#262b36;border:1px solid #3a4150;border-radius:8px;padding:3px 7px}',
      '#' + BAR + ' .te-grp>label{font-size:10px;color:#9aa2b3;letter-spacing:.6px;text-transform:uppercase;font-weight:700}',
      '#' + BAR + ' .te-stp{display:flex;align-items:center;gap:1px}',
      '#' + BAR + ' .te-stp button{all:unset;cursor:pointer;color:#e8eaf0;font-size:15px;font-weight:800;width:23px;height:23px;border-radius:6px;text-align:center;line-height:23px}',
      '#' + BAR + ' .te-stp button:hover{background:#3a4150}',
      '#' + BAR + ' .te-val{min-width:34px;text-align:center;font-variant-numeric:tabular-nums;font-size:13px;font-weight:700}',
      '#' + BAR + ' select{background:#262b36;color:#e8eaf0;border:1px solid #3a4150;border-radius:7px;padding:4px 6px;font:inherit;font-size:12px;max-width:140px}',
      '#' + BAR + ' .te-dens{display:flex;background:#262b36;border:1px solid #3a4150;border-radius:8px;overflow:hidden}',
      '#' + BAR + ' .te-dens button{all:unset;cursor:pointer;color:#9aa2b3;font-size:12px;font-weight:700;padding:6px 11px}',
      '#' + BAR + ' .te-dens button.on{background:#3d4557;color:#fff}',
      '#' + BAR + ' .te-sp{flex:1 1 auto;min-width:4px}',
      '#' + BAR + ' .te-ic{all:unset;cursor:pointer;border:1px solid #3a4150;border-radius:8px;width:29px;height:29px;text-align:center;line-height:29px;color:#e8eaf0}',
      '#' + BAR + ' .te-ic:hover{background:#3a4150}',
      '#' + BAR + ' .te-save{all:unset;cursor:pointer;background:#1e7d38;color:#fff;font-weight:800;font-size:12.5px;padding:8px 15px;border-radius:8px}',
      '#' + BAR + ' .te-save:hover{filter:brightness(1.1)}',
      '@media(max-width:768px){#' + BAR + '{gap:6px;padding:8px}#' + BAR + ' .te-tgt{max-width:100%;order:-1;width:100%}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function barHtml(v) {
    const dens = Object.keys(DENSITY).map(n => {
      const d = DENSITY[n];
      const on = (v.fs === d.fs && v.lh === d.lh && v.padY === d.padY) ? ' on' : '';
      return '<button type="button" class="' + on.trim() + '" data-te-dens="' + esc(n) + '">' + esc(n) + '</button>';
    }).join('');
    return '<span class="te-brand">STILLA TÖFLU</span>' +
      '<span class="te-tgt">' + esc(pageLabel()) + '</span>' +
      '<span class="te-grp"><label>Letur</label>' +
        '<select data-te-ff>' + FONTS.map(f =>
          '<option value="' + esc(f[0]) + '"' + (f[0] === v.ff ? ' selected' : '') + '>' + esc(f[1]) + '</option>').join('') +
        '</select>' +
        '<span class="te-stp"><button type="button" data-te-fs="-1">−</button>' +
          '<span class="te-val">' + v.fs + '</span>' +
          '<button type="button" data-te-fs="1">+</button></span></span>' +
      '<span class="te-grp"><label>Línuhæð</label>' +
        '<span class="te-stp"><button type="button" data-te-lh="-1">−</button>' +
          '<span class="te-val">' + v.lh + '%</span>' +
          '<button type="button" data-te-lh="1">+</button></span></span>' +
      '<span class="te-dens">' + dens + '</span>' +
      '<span class="te-sp"></span>' +
      '<button type="button" class="te-ic" data-te-reset title="Núllstilla töflu-útlit þessarar síðu">↺</button>' +
      '<button type="button" class="te-save" data-te-save>✓ Vista síðu</button>';
  }
  function pageLabel() {
    const v = activeView(); if (!v) return 'Taflan';
    const h = v.querySelector('h1');
    return 'Taflan · ' + ((h && h.textContent.trim().slice(0, 32)) || v.id.replace(/^view-/, ''));
  }

  // Stikan sest efst í töflu-svæðið á virku síðunni.
  function host() {
    const t = pickTable(); if (!t) return null;
    return t.closest('.data-table-wrap, .thm, ._ars-tblscroll, .by-table-wrap, .tb-table-wrap') ||
           t.parentElement;
  }
  function render() {
    const old = document.getElementById(BAR);
    if (!on) { if (old) old.remove(); return; }
    const h = host(); if (!h) { if (old) old.remove(); return; }
    const v = readVals(); if (!v.has) { if (old) old.remove(); return; }
    css();
    let bar = old;
    if (!bar) { bar = document.createElement('div'); bar.id = BAR; }
    bar.innerHTML = barHtml(v);
    if (bar.parentElement !== h || h.firstChild !== bar) h.insertBefore(bar, h.firstChild);
    wire(bar, v);
  }
  function wire(bar, v) {
    bar.querySelectorAll('[data-te-fs]').forEach(b => b.onclick = () => {
      const n = Math.max(FS_MIN, Math.min(FS_MAX, v.fs + (+b.dataset.teFs)));
      write({ fs: n });
    });
    bar.querySelectorAll('[data-te-lh]').forEach(b => b.onclick = () => {
      const n = Math.max(LH_MIN, Math.min(LH_MAX, v.lh + (+b.dataset.teLh) * LH_STEP));
      write({ lh: n });
    });
    const ff = bar.querySelector('[data-te-ff]');
    if (ff) ff.onchange = () => write({ ff: ff.value || null });
    bar.querySelectorAll('[data-te-dens]').forEach(b => b.onclick = () => {
      const d = DENSITY[b.dataset.teDens]; if (d) write({ fs: d.fs, lh: d.lh, padY: d.padY });
    });
    const rs = bar.querySelector('[data-te-reset]');
    if (rs) rs.onclick = () => {
      if (!confirm('Núllstilla letur, línuhæð og bil á þessari töflu?\n(Dálkabreiddir haldast.)')) return;
      write({ fs: null, lh: null, ff: null, padY: null });
    };
    const sv = bar.querySelector('[data-te-save]');
    if (sv) sv.onclick = () => {
      // Töflu-útlitið er ÞEGAR vistað (TableLook skrifar strax). Þessi takki
      // vistar heildar-útlit síðunnar sem nefnda útgáfu — sama aðgerð og
      // „＋ Vista núverandi útlit sem…" í Stílstjóranum.
      try {
        const b = document.getElementById('pe-savepage') || document.getElementById('pe-ver-save');
        if (b) { b.click(); return; }
      } catch (_) {}
      try { if (window.Toast && Toast.show) Toast.show('✓ Töflu-útlit vistað'); } catch (_) {}
    };
  }

  // ── kveikja/slökkva ───────────────────────────────────────────────────────
  let on = false;
  function setOn(v) {
    on = v; render();
    const b = document.getElementById('pe-tofluedit');
    if (b) b.classList.toggle('on', on);
  }
  window.TofluEditor = { setOn, isOn: () => on, render };

  // Takki í Stílstjóra-toolbarnum (sama mynstur og 319/320/321).
  function ensureBtn() {
    const bar = document.querySelector('.pe-toolbar');
    if (!bar) { if (on) setOn(false); return; }
    if (bar.querySelector('#pe-tofluedit')) return;
    const b = document.createElement('button');
    b.id = 'pe-tofluedit'; b.type = 'button'; b.className = 'pe-btn' + (on ? ' on' : '');
    b.textContent = '📊 Stilla töflu';
    b.title = 'Letur, línuhæð og þéttleiki á töflu síðunnar — engin element-veiði';
    b.addEventListener('click', e => { e.preventDefault(); setOn(!on); });
    bar.appendChild(b);
  }

  let t = null;
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n && n.nodeType === 1 && (n.id === BAR || (n.closest && n.closest('#' + BAR)))) return;
    }
    clearTimeout(t); t = setTimeout(() => { ensureBtn(); if (on) render(); }, 250);
  }).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => { setOn(false); });
  ensureBtn();

  console.log('[patch-322] töflu-editor ready');
})();
/* === END TÖFLU-EDITOR === */
