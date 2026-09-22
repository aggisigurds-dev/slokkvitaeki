/* === ÁRSSKOÐUN: MÁNAÐASTRIMILL OG FLEIRI SÍUR (394) — 22.09.2026 ===
 *
 * Agnar: „þessi útgáfa bara með hinum litunum gráu" → hönnunin sem hann samþykkti
 * (https://claude.ai/artifact/KbvQMth5FzXN5vQHdj86k1) í húsalitunum. 393 sá um málminn;
 * hér koma þrír hlutar sem eru MEIRA en stíll:
 *   1. Mánaðastrimill — súlur í stað flísa, hæðin = fjöldi staða, mánuðurinn sem stendur
 *      yfir í gulli. Segir á augabragði hvar álagið liggur á árinu.
 *   2. „Fleiri síur" — fimm daglegu síurnar standa eftir, hinar tíu fara í eitt hólf með
 *      fjölda; virkar aukasíur birtast sem flísar sem má slökkva á.
 *   3. Hlutahaus yfir töflunni („Staðirnir · N af 632").
 *
 * 153 ER EKKI SNERT (vörðuð lína). Þetta er hjúpur: hann LES flísarnar sem 153 teiknar og
 * SMELLIR á þær — engin sía, ekkert ástand og engin gögn eru afrituð hingað. Þess vegna
 * helst hegðunin nákvæmlega eins og áður, líka þegar 153 breytist. Falli hjúpurinn út
 * (villa, nýtt markup) birtast upprunalegu flísarnar aftur óbreyttar.
 *
 * 153 teiknar sýnina upp á nýtt við hverja síubreytingu, svo hjúpurinn er endurbyggður
 * á MutationObserver — alltaf úr því sem stendur á skjánum, aldrei úr minni.
 */
(() => {
  if (window.__arsVinnusvaediInstalled) return;
  window.__arsVinnusvaediInstalled = true;

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif';
  const DISPLAY = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const STRIPE = 'repeating-linear-gradient(108deg,rgba(255,255,255,.05) 0 1px,transparent 1px 5px),';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const STEELBAR = 'linear-gradient(180deg,#e2e6ec 0%,#8f98a8 40%,#555d6b 60%,#737c8b 100%)';
  const GOLDBAR = 'linear-gradient(180deg,#ffe9b0 0%,#d3ab4e 40%,#7a5608 60%,#a67f22 100%)';
  const REDBAR = 'linear-gradient(180deg,#ff9d95 0%,#e25555 40%,#971515 60%,#b52020 100%)';
  const RED = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';

  // Síurnar sem eru notaðar daglega standa eftir; hinar fara í hólfið.
  // (Heitin koma úr 153: „Allt", „✅ Búið 2026 355", „⏳ Eftir 158", „🗓️ Eftir 2026 270", …)
  const ADAL = [/^allt$/i, /búið/i, /eftir/i, /í vinnslu/i, /aksturslisti/i];

  function css() {
    const V = 'html body #view-arsskodun ';
    return [
      V + '.arsm-strip{display:grid;gap:6px;align-items:end;padding:12px 14px 12px;margin-bottom:12px;border-top:3px solid #555d6b;border-radius:2px;background-image:' + STRIPE + METAL + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 14px 30px -14px rgba(0,0,0,.7)}',
      V + '.arsm-head{grid-column:1/-1;display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:2px}',
      V + '.arsm-head b{font:700 10px/1 ' + MONO + ';letter-spacing:.16em;text-transform:uppercase;color:#d3ab4e}',
      V + '.arsm-head span{font:500 11.5px/1.4 ' + MONO + ';color:#aeb6c4}',
      V + '.arsm-b{display:flex;flex-direction:column;align-items:center;gap:6px;padding:0;border:0;background:transparent;cursor:pointer}',
      V + '.arsm-b i{display:block;width:100%;border-radius:1px;background:' + STEELBAR + ';transition:filter .12s}',
      V + '.arsm-b:hover i{filter:brightness(1.15)}',
      V + '.arsm-b em{font:700 11px/1 ' + MONO + ';font-style:normal;color:#fff}',
      V + '.arsm-b u{font:500 10.5px/1 ' + MONO + ';text-decoration:none;color:#aeb6c4}',
      V + '.arsm-b.is-nu i{background:' + GOLDBAR + ';box-shadow:0 0 14px -3px rgba(211,171,78,.8)}',
      V + '.arsm-b.is-nu em,' + V + '.arsm-b.is-nu u{color:#ffd27a}',
      V + '.arsm-b.is-on i{background:' + REDBAR + ';box-shadow:0 0 14px -3px rgba(226,85,85,.75)}',
      V + '.arsm-b.is-on em,' + V + '.arsm-b.is-on u{color:#ff9d95}',
      V + '.arsm-b.is-all i{background:repeating-linear-gradient(135deg,rgba(255,255,255,.10) 0 3px,rgba(255,255,255,.03) 3px 6px);border:1px solid rgba(255,255,255,.14);box-sizing:border-box}',
      V + '.arsm-b.is-tom i{background:' + GOLDBAR + ';opacity:.85}',
      // Fleiri síur
      V + '.arsm-more{position:relative;display:inline-flex}',
      V + '.arsm-more>button{height:38px;display:inline-flex;align-items:center;gap:8px;padding:0 13px;border:1px solid rgba(20,24,34,.18);border-radius:3px;background:' + SILVER + ';color:#3a4250;font:600 12.5px ' + SANS + ';cursor:pointer}',
      V + '.arsm-more>button b{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:2px;background:' + RED + ';color:#fff;font:700 10px ' + MONO + '}',
      V + '.arsm-menu{position:absolute;top:42px;left:0;z-index:60;width:260px;box-sizing:border-box;display:flex;flex-direction:column;gap:2px;padding:6px;background:#fff;border:1px solid rgba(20,24,34,.14);border-radius:3px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5)}',
      V + '.arsm-menu[hidden]{display:none}',
      V + '.arsm-menu button{display:flex;align-items:center;gap:9px;height:34px;padding:0 9px;border:0;border-radius:2px;background:transparent;color:#1f2530;font:500 13px ' + SANS + ';text-align:left;cursor:pointer}',
      V + '.arsm-menu button:hover{background:#f1f4f8}',
      V + '.arsm-menu button.is-on{background:' + RED + ';color:#fff}',
      V + '.arsm-menu button span{margin-left:auto;font:700 11px ' + MONO + ';color:#6b7483}',
      V + '.arsm-menu button.is-on span{color:#ffd8d4}',
      V + '.arsm-tags{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:-4px 0 10px}',
      V + '.arsm-tag{display:inline-flex;align-items:center;gap:7px;height:28px;padding:0 9px 0 0;border:1px solid rgba(20,24,34,.16);border-radius:3px;background:' + SILVER + ';color:#3a4250;font:600 11.5px ' + SANS + ';overflow:hidden;cursor:pointer}',
      V + '.arsm-tag i{width:4px;align-self:stretch;background:' + REDBAR + '}',
      V + '.arsm-tag b{font:700 11px ' + MONO + ';color:#6b7483}',
      V + '.arsm-tag u{text-decoration:none;color:#8a93a3;margin-left:2px}',
      // Hlutahaus
      V + '.arsm-sec{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:14px 2px 10px}',
      V + '.arsm-sec h2{margin:0;font:800 24px/1.1 ' + DISPLAY + ';letter-spacing:-.02em;color:#11141c}',
      V + '.arsm-sec span{font:500 11.5px/1.4 ' + MONO + ';color:#2b313c}',
      // Upprunalegu raðirnar víkja þegar hjúpurinn hefur teiknað sig
      V + '._ars-morow[data-arsm="falid"]{display:none!important}',
      V + '._ars-st[data-arsm="falid"]{display:none!important}',
    ].join('\n');
  }

  function injectCss() {
    if (document.getElementById('_arsv-css')) return;
    const st = document.createElement('style');
    st.id = '_arsv-css';
    st.textContent = '@media (min-width: 901px){\n' + css() + '\n}';
    (document.head || document.documentElement).appendChild(st);
  }

  const talaAf = el => {
    const m = String(el.textContent || '').match(/(\d[\d.]*)\s*$/);
    return m ? +m[1].replace(/\./g, '') : 0;
  };
  const heitiAf = el => String(el.textContent || '').replace(/\s*\d[\d.]*\s*$/, '').trim();

  // ── 1 · mánaðastrimill ────────────────────────────────────────────────────
  function strimill(root) {
    const row = root.querySelector('._ars-morow');
    if (!row || row.dataset.arsm === 'falid') return;
    const chips = Array.from(row.querySelectorAll('._ars-mo'));
    if (chips.length < 6) return;                       // ekki það sem við héldum — snertum ekkert
    const gomul = root.querySelector('.arsm-strip');
    if (gomul) gomul.remove();

    const tolur = chips.map(talaAf);
    const max = Math.max.apply(null, tolur.concat([1]));
    const strip = document.createElement('div');
    strip.className = 'arsm-strip';
    strip.style.gridTemplateColumns = 'repeat(' + chips.length + ',minmax(0,1fr))';
    const alls = tolur.reduce((a, b) => a + b, 0);
    const haus = document.createElement('div');
    haus.className = 'arsm-head';
    const nuHeiti = ['jan', 'feb', 'mar', 'apr', 'maí', 'jún', 'júl', 'ágú', 'sep', 'okt', 'nóv', 'des'][new Date().getMonth()];
    haus.innerHTML = '<b>Skoðunarmánuður · ' + new Date().getFullYear() + '</b>';
    const hs = document.createElement('span');
    strip.appendChild(haus);

    chips.forEach((c, i) => {
      const n = tolur[i];
      const heiti = heitiAf(c);
      const erAllir = /allir/i.test(heiti);
      const erTom = /án mánaðar/i.test(heiti);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'arsm-b' + (erAllir ? ' is-all' : '') + (erTom ? ' is-tom' : '') +
        (c.getAttribute('aria-pressed') === 'true' ? ' is-on' : '') +
        (!erAllir && !erTom && heiti.toLowerCase().slice(0, 3) === nuHeiti.slice(0, 3) ? ' is-nu' : '');
      b.title = heiti + (n ? ' — ' + n + ' staðir' : '');
      const h = erAllir ? 56 : Math.max(10, Math.round(14 + (n / max) * 46));
      b.innerHTML = '<i style="height:' + h + 'px"></i><em></em><u></u>';
      b.querySelector('em').textContent = erTom ? 'Án mán.' : heiti;
      b.querySelector('u').textContent = n ? String(n) : (erAllir ? String(alls) : '0');
      b.addEventListener('click', () => c.click());          // 153 á síuna — við smellum bara
      strip.appendChild(b);
    });

    const nuChip = chips.find(c => heitiAf(c).toLowerCase().slice(0, 3) === nuHeiti.slice(0, 3));
    hs.textContent = alls + ' með mánuð · ' + (tolur[chips.length - 1] || 0) + ' án mánaðar' +
      (nuChip ? ' · ' + heitiAf(nuChip) + ' ' + talaAf(nuChip) + ' í dag' : '');
    haus.appendChild(hs);

    row.parentNode.insertBefore(strip, row);
    // Inline + !important, ekki stílblað: 153 setur `display:flex!important` á röðina
    // í eigin blaði (lína 3439) og hliðarstiku-lærdómurinn frá 391 var einmitt sá að
    // stílblað tapar þessum slag. Inline vinnur hann.
    row.dataset.arsm = 'falid';
    row.style.setProperty('display', 'none', 'important');
  }

  // ── 2 · Fleiri síur ───────────────────────────────────────────────────────
  function siur(root) {
    const row = root.querySelector('._ars-statusrow');
    if (!row) return;
    const chips = Array.from(row.querySelectorAll('._ars-st'));
    if (chips.length < 8) return;
    const auka = chips.filter(c => !ADAL.some(re => re.test(heitiAf(c))));
    if (!auka.length) return;

    const gamall = root.querySelector('.arsm-more');
    if (gamall) gamall.remove();
    const gamlirTags = root.querySelector('.arsm-tags');
    if (gamlirTags) gamlirTags.remove();

    const virk = auka.filter(c => (c.getAttribute('style') || '').indexOf('--brand') !== -1);
    const wrap = document.createElement('div');
    wrap.className = 'arsm-more';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = 'Fleiri síur' + (virk.length ? ' <b>' + virk.length + '</b>' : '') + ' <span style="color:#8a93a3">▾</span>';
    const menu = document.createElement('div');
    menu.className = 'arsm-menu';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    auka.forEach(c => {
      const it = document.createElement('button');
      it.type = 'button';
      it.setAttribute('role', 'menuitem');
      const n = talaAf(c);
      it.className = (c.getAttribute('style') || '').indexOf('--brand') !== -1 ? 'is-on' : '';
      it.textContent = heitiAf(c);
      if (n) { const s = document.createElement('span'); s.textContent = String(n); it.appendChild(s); }
      it.addEventListener('click', () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); c.click(); });
      menu.appendChild(it);
    });
    // „☐ fela“ hakið situr INNI í stöðuröðinni (153 setur það á eftir „Slepptir í
    // fyrra“). Það fylgir þeirri síu, svo það fer með í hólfið — annars stæði það
    // eitt eftir við hliðina á daglegu síunum og segði ekkert.
    const fela = root.querySelector('#_ars-skiphide');
    if (fela) {
      const it = document.createElement('button');
      it.type = 'button';
      it.setAttribute('role', 'menuitem');
      it.className = fela.getAttribute('aria-checked') === 'true' ? 'is-on' : '';
      it.textContent = String(fela.textContent || '').trim() + ' slepptu';
      it.title = fela.getAttribute('title') || '';
      it.addEventListener('click', () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); fela.click(); });
      menu.appendChild(it);
      fela.dataset.arsm = 'falid';
      fela.style.setProperty('display', 'none', 'important');
    }
    btn.addEventListener('click', () => {
      const opid = menu.hidden;
      menu.hidden = !opid;
      btn.setAttribute('aria-expanded', String(opid));
    });
    document.addEventListener('pointerdown', e => {
      if (!menu.hidden && !wrap.contains(e.target)) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    }, true);
    wrap.appendChild(btn); wrap.appendChild(menu);
    row.parentNode.insertBefore(wrap, row.nextSibling);
    auka.forEach(c => { c.dataset.arsm = 'falid'; c.style.setProperty('display', 'none', 'important'); });

    if (virk.length) {
      const tags = document.createElement('div');
      tags.className = 'arsm-tags';
      virk.forEach(c => {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'arsm-tag';
        t.title = 'Slökkva á síunni';
        const n = talaAf(c);
        t.innerHTML = '<i></i>';
        t.appendChild(document.createTextNode(heitiAf(c)));
        if (n) { const b2 = document.createElement('b'); b2.textContent = String(n); t.appendChild(b2); }
        const x = document.createElement('u'); x.textContent = '✕'; t.appendChild(x);
        t.addEventListener('click', () => { const allt = chips[0]; if (allt) allt.click(); });
        tags.appendChild(t);
      });
      const strip = row.closest('._ars-filterstrip') || row.parentNode;
      strip.parentNode.insertBefore(tags, strip.nextSibling);
    }
  }

  // ── 3 · hlutahaus yfir töflunni ───────────────────────────────────────────
  function hlutahaus(root) {
    const wrap = root.querySelector('.data-table-wrap, ._ars-tblscroll');
    if (!wrap) return;
    const gamall = root.querySelector('.arsm-sec');
    if (gamall) gamall.remove();
    // Talan er ekki reiknuð hér — hún er LESIN af línunni sem 153 skrifar sjálft
    // („Sýni 632 af 655 viðskiptavinum“). Tvær talningar á sama hlut reka í sundur.
    let talning = '';
    const lina = Array.from(root.querySelectorAll('div')).find(
      d => d.children.length <= 2 && !d.closest('.arsm-sec') &&
        /^\s*Sýni\s+[\d.]+\s+af\s/.test(d.textContent || '')
    );
    if (lina) {
      talning = String(lina.textContent || '').trim().replace(/\s+/g, ' ');
      lina.style.setProperty('display', 'none', 'important');
    } else {
      talning = root.querySelectorAll('table.data-table tbody tr').length + ' raðir';
    }
    const sec = document.createElement('div');
    sec.className = 'arsm-sec';
    const h = document.createElement('h2'); h.textContent = 'Staðirnir';
    const s = document.createElement('span');
    s.textContent = talning;
    sec.appendChild(h); sec.appendChild(s);
    (wrap.closest('.thm') || wrap).parentNode.insertBefore(sec, wrap.closest('.thm') || wrap);
  }

  let t = null, inni = false;
  function bygg() {
    const root = document.querySelector('#view-arsskodun #ars-main');
    if (!root || !root.offsetParent) return;
    inni = true;
    try { strimill(root); } catch (e) { console.warn('[394] strimill', e); }
    try { siur(root); } catch (e) { console.warn('[394] síur', e); }
    try { hlutahaus(root); } catch (e) { console.warn('[394] haus', e); }
    inni = false;
  }
  function schedule() { if (t || inni) return; t = setTimeout(() => { t = null; bygg(); }, 260); }

  function start() {
    injectCss();
    const v = document.getElementById('view-arsskodun');
    if (!v) { setTimeout(start, 1000); return; }
    schedule();
    new MutationObserver(schedule).observe(v, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 1200));
  else setTimeout(start, 1200);

  window.ArsVinnusvaedi = { bygg };
  console.log('[394] Ársskoðun: mánaðastrimill + fleiri síur');
})();
/* === END ÁRSSKOÐUN VINNUSVÆÐI === */
