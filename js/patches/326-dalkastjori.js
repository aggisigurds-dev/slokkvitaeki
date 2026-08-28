/* === DÁLKASTJÓRI (column manager) v1 =========================================
 * Ósk Agnars 28.08.2026: „I would really need some layout control. button hid
 * add. colume control. in a new page or something."
 *
 * Heilskjás-listi yfir ALLA dálka töflunnar á síðunni. Ein lína á dálk með
 * STÓRUM snertiflötum:
 *
 *     [ 👁 ]  Heimilisfang            [ − ]  240px  [ + ]
 *
 * Af hverju nýtt spjald þegar 323 hefur „ítarlegt"?
 *   - Það liggur þremur smellum djúpt inni í Stilla útlit og heitir „ítarlegt",
 *     svo það finnst ekki. Agnar leitaði ítrekað og fann ekki.
 *   - Hnapparnir þar eru ~28px og standa þétt; á síma er það of smátt.
 *   - Þetta spjald opnast beint úr borðanum (📐) og fyllir skjáinn.
 *
 * ENGIN NÝ GEYMSLA og enginn nýr CSS-vélbúnaður: skrifar í sama TableLook og
 * dálkadrag (319) notar. 319.applyCss() gefur út
 *     html body #view-x#view-x table.data-table col:nth-child(N){width:Npx!important}
 * með tvítekið auðkenni — nógu sterkt til að vinna á síma-reglunum í 314.
 * Felun fer í `hide` (dálk-númer), sem 319 styður þegar (bæði col og td).
 *
 * ATH: dálkar og hausar eru EKKI 1:1 í Ársskoðun — hausinn „Skoðanir · Skjöl"
 * spannar fjóra dálka (ár×4). Þess vegna er merkimiðinn reiknaður út frá
 * colspan, ekki bara th-vísitölu.
 * ========================================================================== */
(() => {
  if (window.__dalkastjori326) return;
  window.__dalkastjori326 = true;

  const PANEL = '_dst-panel';
  const BTN = '_dst-btn';

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* Sýnilega taflan á virku síðunni. */
  function currentTable() {
    const view = document.querySelector('.view.active') || document;
    const all = [...view.querySelectorAll('table')]
      .filter((t) => t.offsetParent !== null && t.querySelector('thead th') && t.querySelector('colgroup col'));
    // stærsta taflan = aðaltaflan (litlar hjálpartöflur eiga ekki heima hér)
    return all.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0] || null;
  }

  /* Sami lykill og 319/321 nota — annars týnist stillingin. */
  function keyFor(t) {
    const v = t.closest('.view');
    const vid = v && v.id;
    if (!vid) return null;
    const cls = t.id ? ('#' + t.id) : (t.classList[0] ? ('.' + t.classList[0]) : '');
    return vid + '|' + (cls || 'table');
  }

  /* Dálk-númer -> merkimiði, með tilliti til colspan í hausnum. */
  function columnLabels(t) {
    const colCount = t.querySelectorAll('colgroup col').length;
    const out = new Array(colCount).fill('');
    const ths = [...t.querySelectorAll('thead tr:last-child th, thead tr:first-child th')];
    let n = 1;
    const seen = new Set();
    for (const th of ths) {
      if (seen.has(th)) continue;
      seen.add(th);
      const span = Math.max(1, parseInt(th.getAttribute('colspan') || '1', 10));
      let label = (th.innerText || '').trim().replace(/[⇅▲▼]/g, '').replace(/\s+/g, ' ').trim();
      if (!label) label = th.querySelector('[title]') ? th.querySelector('[title]').getAttribute('title') : '';
      if (!label) label = '(ómerkt)';
      for (let k = 0; k < span && n <= colCount; k++, n++) {
        out[n - 1] = span > 1 ? label + ' ' + (k + 1) : label;
      }
    }
    for (let i = 0; i < colCount; i++) if (!out[i]) out[i] = 'Dálkur ' + (i + 1);
    return out;
  }

  function look() { try { return window.TableLook ? window.TableLook.get() : {}; } catch (_) { return {}; } }
  function writeLook(key, mutate) {
    try {
      const s = look();
      s[key] = s[key] || {};
      mutate(s[key]);
      window.TableLook.set(s);
    } catch (e) { console.warn('[326] gat ekki vistað:', e.message); }
  }

  function css() {
    if (document.getElementById('_dst-css')) return;
    const st = document.createElement('style');
    st.id = '_dst-css';
    st.textContent = [
      '#' + PANEL + '{position:fixed;inset:0;z-index:100000;background:#0f172a;color:#e2e8f0;',
      '  display:flex;flex-direction:column;font:inherit;overscroll-behavior:contain}',
      '#' + PANEL + ' ._h{display:flex;align-items:center;gap:10px;padding:14px 14px;',
      '  border-bottom:1px solid #1e293b;background:#0b1220;position:sticky;top:0}',
      '#' + PANEL + ' ._h b{font-size:16px;font-weight:800;flex:1;min-width:0}',
      '#' + PANEL + ' ._x{all:unset;cursor:pointer;background:#1e293b;color:#e2e8f0;padding:10px 16px;',
      '  border-radius:10px;font-weight:700;font-size:15px}',
      '#' + PANEL + ' ._sub{padding:8px 14px 0;color:#94a3b8;font-size:12.5px}',
      '#' + PANEL + ' ._list{flex:1;overflow:auto;padding:10px 10px 28px;-webkit-overflow-scrolling:touch}',
      '#' + PANEL + ' ._row{display:flex;align-items:center;gap:8px;padding:10px 8px;',
      '  border-bottom:1px solid #1e293b}',
      '#' + PANEL + ' ._row._off ._nm{opacity:.38;text-decoration:line-through}',
      '#' + PANEL + ' ._nm{flex:1;min-width:0;font-size:15px;font-weight:600;',
      '  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '#' + PANEL + ' ._b{all:unset;cursor:pointer;min-width:46px;height:46px;border-radius:11px;',
      '  background:#1e293b;color:#e2e8f0;text-align:center;line-height:46px;font-size:19px;font-weight:800;',
      '  flex:0 0 auto;touch-action:manipulation}',
      '#' + PANEL + ' ._b:active{background:#334155}',
      '#' + PANEL + ' ._b._on{background:#166534;color:#dcfce7}',
      '#' + PANEL + ' ._w{min-width:58px;text-align:center;font-size:13px;font-variant-numeric:tabular-nums;color:#cbd5e1}',
      '#' + PANEL + ' ._ft{display:flex;gap:8px;padding:12px 14px;border-top:1px solid #1e293b;background:#0b1220}',
      '#' + PANEL + ' ._ft ._b2{all:unset;flex:1;text-align:center;cursor:pointer;padding:14px 0;',
      '  border-radius:12px;background:#1e293b;font-weight:800;font-size:15px}',
      '#' + PANEL + ' ._ft ._b2._warn{background:#7f1d1d;color:#fecaca}',
      '#' + BTN + '{position:static;width:34px;height:34px;padding:0;border:0;background:transparent;',
      '  border-radius:9px;font-size:17px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center}',
      '#' + BTN + ':hover{background:rgba(255,255,255,.12)}',
      // Fljótandi staða þegar borðaröndin er falin (sími). Situr fyrir ofan
      // 📮 AI-flokka takkann svo þeir skarist ekki.
      '#' + BTN + '._float{position:fixed;right:14px;bottom:78px;z-index:9999;width:52px;height:52px;',
      '  border-radius:50%;background:#1e293b;color:#fff;font-size:22px;',
      '  box-shadow:0 6px 20px rgba(0,0,0,.45)}',
    ].join('');
    document.head.appendChild(st);
  }

  const STEP = 16;   // px á smell — nógu stórt til að sjást strax á síma

  function render() {
    const p = document.getElementById(PANEL);
    if (!p) return;
    const t = currentTable();
    const list = p.querySelector('._list');
    const sub = p.querySelector('._sub');
    if (!t) {
      sub.textContent = '';
      list.innerHTML = '<div style="padding:24px;color:#94a3b8">Engin tafla á þessari síðu.</div>';
      return;
    }
    const key = keyFor(t);
    const e = (look()[key]) || {};
    const w = e.w || {}, hide = e.hide || {};
    const labels = columnLabels(t);
    const cols = [...t.querySelectorAll('colgroup col')];

    sub.textContent = labels.length + ' dálkar · breytingar vistast strax';
    list.innerHTML = labels.map((lab, i) => {
      const n = i + 1;
      const off = !!hide[n];
      const px = w[n] ? (w[n] + 'px') : (cols[i] ? Math.round(cols[i].getBoundingClientRect().width || 0) + 'px' : 'auto');
      return '<div class="_row' + (off ? ' _off' : '') + '" data-n="' + n + '">' +
        '<button class="_b' + (off ? '' : ' _on') + '" data-eye="' + n + '" title="' + (off ? 'Sýna' : 'Fela') + '">' +
          (off ? '🚫' : '👁') + '</button>' +
        '<span class="_nm">' + esc(lab) + '</span>' +
        '<button class="_b" data-w="' + n + '|-1">−</button>' +
        '<span class="_w">' + esc(px) + '</span>' +
        '<button class="_b" data-w="' + n + '|1">+</button>' +
      '</div>';
    }).join('');

    list.querySelectorAll('[data-eye]').forEach((b) => {
      b.onclick = () => {
        const n = b.dataset.eye;
        writeLook(key, (o) => {
          o.hide = Object.assign({}, o.hide || {});
          if (o.hide[n]) delete o.hide[n]; else o.hide[n] = true;
        });
        render();
      };
    });
    list.querySelectorAll('[data-w]').forEach((b) => {
      b.onclick = () => {
        const [nStr, dirStr] = b.dataset.w.split('|');
        const n = +nStr, dir = +dirStr;
        const col = cols[n - 1];
        const cur = (w[n] != null) ? w[n] : Math.round((col && col.getBoundingClientRect().width) || 80);
        const next = Math.max(24, Math.min(1200, cur + dir * STEP));
        writeLook(key, (o) => { o.w = Object.assign({}, o.w || {}); o.w[n] = next; });
        render();
      };
    });
  }

  function open() {
    css();
    if (document.getElementById(PANEL)) { render(); return; }
    const p = document.createElement('div');
    p.id = PANEL;
    p.innerHTML =
      '<div class="_h"><b>📐 Dálkastjóri</b><button class="_x" data-close>✕ Loka</button></div>' +
      '<div class="_sub"></div>' +
      '<div class="_list"></div>' +
      '<div class="_ft">' +
        '<button class="_b2" data-showall>👁 Sýna alla</button>' +
        '<button class="_b2 _warn" data-reset>↺ Núllstilla breiddir</button>' +
      '</div>';
    document.body.appendChild(p);
    p.querySelector('[data-close]').onclick = close;
    p.querySelector('[data-showall]').onclick = () => {
      const t = currentTable(); const key = t && keyFor(t); if (!key) return;
      writeLook(key, (o) => { o.hide = {}; });
      render();
    };
    p.querySelector('[data-reset]').onclick = () => {
      const t = currentTable(); const key = t && keyFor(t); if (!key) return;
      if (!confirm('Núllstilla ALLAR dálkabreiddir á þessari töflu?\n(Felun helst óbreytt.)')) return;
      writeLook(key, (o) => { o.w = {}; });
      render();
    };
    document.addEventListener('keydown', onKey);
    render();
  }
  function close() {
    const p = document.getElementById(PANEL);
    if (p) p.remove();
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') close(); }

  /* Hnappur í borðanum — EN borðaröndin er FALIN á síma:
       314-simi-compact-layer.js:189  html[data-viewmode="mobile"] .bb-rightwrap{display:none!important}
       css/mobile.css:201             #bstal-banner .bb-rightwrap{display:none!important}
     Það dugar því EKKI að athuga hvort .bb-rightwrap sé til — hún er til en
     ósýnileg. Sé hún falin fer hnappurinn í fljótandi stöðu neðst til hægri,
     annars í borðann. Endurmetið í fylgjaranum, því hamurinn getur skipst. */
  function wrapUsable(w) {
    return !!w && w.offsetParent !== null && getComputedStyle(w).display !== 'none';
  }
  function mountButton() {
    css();
    const wrap = document.querySelector('.bb-rightwrap');
    const usable = wrapUsable(wrap);
    let b = document.getElementById(BTN);
    const wanted = usable ? 'banner' : 'float';
    if (b && b.dataset.spot === wanted) return;     // þegar á réttum stað
    if (b) b.remove();

    b = document.createElement('button');
    b.id = BTN;
    b.type = 'button';
    b.dataset.spot = wanted;
    b.title = 'Dálkastjóri — fela, sýna og breikka dálka';
    b.setAttribute('aria-label', 'Dálkastjóri');
    b.textContent = '📐';
    b.addEventListener('click', open);

    if (usable) {
      b.className = '';
      const clock = wrap.querySelector('.bb-clockbox');
      if (clock) wrap.insertBefore(b, clock); else wrap.appendChild(b);
    } else {
      b.className = '_float';
      document.body.appendChild(b);
    }
  }

  /* Borðinn er endurteiknaður; ytri fylgjari heldur hnappnum á sínum stað.
     (Sama gildra og felldi 280 — sjá charlize 266.) */
  let pending = null;
  new MutationObserver(() => {
    if (pending) return;
    pending = setTimeout(() => { pending = null; try { mountButton(); } catch (_) {} }, 150);
  }).observe(document.documentElement, { childList: true, subtree: true });
  mountButton();

  window.Dalkastjori = { open, close };
  console.log('[patch-326] Dálkastjóri tilbúinn');
})();
/* === END DÁLKASTJÓRI === */
