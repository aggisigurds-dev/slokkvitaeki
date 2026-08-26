/* === 🧩 TÖFLUNET (Stílstjóra-hjálpartæki) ==================================
 * „Ég sé ekkert hvað ég get gert þarna... bætt við takka sem bætir við grid
 * yfir allt svo ég geti bara valið colom, header, Row heilt yfir" (Agnar
 * 26.08). Takki í Stílstjóra-toolbar leggur smellanlegt NET yfir töflur
 * virku síðunnar: númeruð flögg yfir hverjum dálki + HAUS / RAÐIR / TAFLAN
 * flögg efst. Smellur opnar litla ritilinn (litur, bakgrunnur, leturstærð,
 * feitletrun, jöfnun) sem skrifar beint í Stílstjóra-reglurnar gegnum
 * PageEditor.upsertDecl — sama breytingakerfi, vistast og fylgir milli
 * tækja. Dálk-val nær yfir BÆÐI haus og alla reiti dálksins.
 * ========================================================================== */
(() => {
  if (window.__toflunet321) return;
  window.__toflunet321 = true;

  const OV_ID = '_tn-overlay';
  const ED_ID = '_tn-editor';
  let on = false;
  let editing = null;   // { scope, sel, label }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function activeView() { return document.querySelector('.view.active'); }
  function tablesOf(view) {
    return Array.prototype.slice.call(view.querySelectorAll('table')).filter(t => {
      const r = t.getBoundingClientRect();
      return r.width > 200 && r.height > 60 && t.querySelector('thead th');
    });
  }
  // Stöðugur tafla-selector: table.fyrsta-klasa (annars bara 'table').
  function tableSel(t) {
    const c = (t.className || '').toString().trim().split(/\s+/).filter(Boolean)[0];
    return c ? 'table.' + c : 'table';
  }

  // Töflureiknis-rammi (v2, Agnar 26.08: „hefði helst bara viljað fá að sjá
  // töflunetið svona" + Sheets-skjámynd): bókstafir A B C … yfir dálkunum,
  // raðnúmer 1 2 3 … vinstra megin, H fyrir hausinn og ⬚ hornreitur fyrir
  // töfluna alla — smellur á reit opnar litla ritilinn.
  const STRIP = 26;   // þykkt bókstafa-/númera-randanna
  function colLetter(i) {
    let s = ''; i = i + 1;
    while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); }
    return s;
  }
  function cell(x, y, w, h, label, sel, title, dark, dragAttrs) {
    return '<button type="button" data-tn-sel="' + esc(sel) + '" data-tn-label="' + esc(title) + '" title="' + esc(title) + '" ' +
      'style="all:unset;box-sizing:border-box;position:fixed;left:' + Math.round(x) + 'px;top:' + Math.round(y) + 'px;width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px;' +
      'pointer-events:auto;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
      'font:700 10.5px \'Space Grotesk\',sans-serif;border:1px solid #c6cdd6;' +
      (dark ? 'background:#0f172a;color:#fff;' : 'background:#f1f3f6;color:#334155;') +
      'overflow:visible;white-space:nowrap">' + esc(label) +
      // dráttar-svæði á hægri brún bókstafa-reits: dragðu = dálkbreiddin
      (dragAttrs ? '<span ' + dragAttrs + ' style="position:absolute;right:-5px;top:0;width:11px;height:100%;cursor:col-resize;display:block"><span style="position:absolute;left:4px;top:15%;bottom:15%;width:2px;background:#2563eb;border-radius:1px"></span></span>' : '') +
      '</button>';
  }
  // Dálkbreiddar-drag úr bókstafa-röndinni — vistast í sama kerfi og
  // ↔ Dálkar (319, window.TableLook) svo allt helst á einum stað.
  let _tnTables = [];
  let _justDragged = false;
  function tlKeyFor(t) {
    const v = t.closest('.view'); const vid = v && v.id; if (!vid) return null;
    const cls = t.id ? ('#' + t.id) : (t.classList[0] ? ('.' + t.classList[0]) : '');
    return vid + '|' + (cls || 'table');
  }
  function colDrag(ev, t, n) {
    ev.preventDefault(); ev.stopPropagation();
    const ths = t.querySelectorAll('thead th');
    const th = ths[n - 1] || t.querySelector('thead tr') && t.querySelector('thead tr').children[n - 1];
    const col = t.querySelectorAll('colgroup col')[n - 1];
    const startX = ev.clientX;
    const startW = (th || t).getBoundingClientRect().width;
    let w = Math.round(startW);
    const mv = e2 => {
      w = Math.max(24, Math.min(Math.round(startW + (e2.clientX - startX)), Math.round(window.innerWidth * 0.9)));
      if (col) col.style.width = w + 'px'; else if (th) th.style.width = w + 'px';
    };
    const up = () => {
      document.removeEventListener('pointermove', mv);
      document.removeEventListener('pointerup', up);
      _justDragged = true; setTimeout(() => { _justDragged = false; }, 250);
      try {
        const TL = window.TableLook, key = tlKeyFor(t);
        if (TL && key) { const s = TL.get(); (s[key] = s[key] || {}); (s[key].w = s[key].w || {})[n] = w; TL.set(s); }
      } catch (_) {}
      build();   // endursmíða röndina á nýju breiddirnar
    };
    document.addEventListener('pointermove', mv);
    document.addEventListener('pointerup', up);
  }
  function build() {
    destroyOverlay();
    const view = activeView();
    if (!view) { try { Toast.show('Engin síða opin'); } catch (_) {} return; }
    const tables = tablesOf(view);
    if (!tables.length) { try { Toast.show('Engin tafla á þessari síðu'); } catch (_) {} return; }
    const ov = document.createElement('div');
    ov.id = OV_ID;
    ov.style.cssText = 'position:fixed;inset:0;z-index:99940;pointer-events:none';
    let html = '';
    _tnTables = tables;
    tables.forEach((t, ti) => {
      const tr = t.getBoundingClientRect();
      const ts = tableSel(t);
      const lx = Math.max(0, tr.left - STRIP);          // vinstri röndin
      const ty = Math.max(0, tr.top - STRIP);           // efri röndin
      // ⬚ hornreitur = taflan öll (eins og select-all hornið í Sheets)
      html += cell(lx, ty, STRIP, STRIP, '⬚', ts, 'Taflan í heild', true);
      // Bókstafir yfir dálkunum — smellur stílar dálkinn (haus + reitir),
      // drag á bláu línunni við hægri brún reitsins breytir dálkbreiddinni.
      const ths = Array.prototype.slice.call(t.querySelectorAll('thead th')).filter(th => getComputedStyle(th).display !== 'none');
      ths.forEach((th, i) => {
        const r = th.getBoundingClientRect();
        if (r.width < 8) return;
        const n = Array.prototype.indexOf.call(th.parentNode.children, th) + 1;
        const drag = i < ths.length - 1 ? 'data-tn-drag="1" data-tn-table="' + ti + '" data-tn-col="' + n + '"' : '';
        html += cell(r.left, ty, r.width, STRIP, colLetter(i), ts + ' tr>*:nth-child(' + n + ')', 'Dálkur ' + colLetter(i) + ' — smellur stílar; dragðu bláu línuna fyrir breidd', false, drag);
      });
      // H = haus-röðin; svo raðnúmer fyrir sýnilegu raðirnar
      const thead = t.querySelector('thead');
      if (thead) {
        const hr = thead.getBoundingClientRect();
        if (hr.height > 6) html += cell(lx, hr.top, STRIP, hr.height, 'H', ts + ' thead th', 'Haus-röðin (allar haus-sellur)', true);
      }
      const tb = t.querySelector('tbody');
      if (tb) {
        const rows = Array.prototype.slice.call(tb.children);
        let drawn = 0;
        for (let n = 1; n <= rows.length && drawn < 80; n++) {
          const r = rows[n - 1].getBoundingClientRect();
          if (r.bottom < STRIP || r.top > window.innerHeight || r.height < 6) continue;
          html += cell(lx, r.top, STRIP, r.height, String(n), ts + ' tbody tr:nth-child(' + n + ')>td', 'Röð ' + n);
          drawn++;
        }
      }
    });
    ov.innerHTML = html;
    document.body.appendChild(ov);
    ov.querySelectorAll('[data-tn-sel]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (_justDragged) return;   // dráttur endar ekki sem stíl-smellur
      openEditor(b.dataset.tnSel, b.dataset.tnLabel, b.getBoundingClientRect());
    }));
    ov.querySelectorAll('[data-tn-drag]').forEach(h => h.addEventListener('pointerdown', ev => {
      const t = _tnTables[+h.dataset.tnTable];
      if (t) colDrag(ev, t, +h.dataset.tnCol);
    }));
  }
  function destroyOverlay() { const o = document.getElementById(OV_ID); if (o) o.remove(); }
  function closeEditor() { const d = document.getElementById(ED_ID); if (d) d.remove(); editing = null; }

  const TN_FONTS = ['', 'Space Grotesk', 'Space Mono', 'Source Serif 4', 'Georgia, serif', 'system-ui, sans-serif', 'Arial, sans-serif', 'Courier New, monospace', 'Impact, sans-serif'];
  function pe() { return window.PageEditor || {}; }
  function readD(prop) { return editing && pe().readDecl ? pe().readDecl(editing.scope, editing.sel, prop) : null; }
  function setD(prop, val) { if (editing && pe().upsertDecl) pe().upsertDecl(editing.scope, editing.sel, prop, val); }

  function openEditor(sel, label, nearRect) {
    closeEditor();
    const view = activeView(); if (!view) return;
    editing = { scope: view.id, sel: sel, label: label };
    const d = document.createElement('div');
    d.id = ED_ID;
    const left = Math.min(Math.max(8, nearRect.left), window.innerWidth - 300);
    const top = Math.min(nearRect.bottom + 8, window.innerHeight - 240);
    d.style.cssText = 'position:fixed;left:' + left + 'px;top:' + top + 'px;z-index:99985;background:#fff;border:1px solid #cbd5e1;border-radius:13px;box-shadow:0 22px 50px -18px rgba(15,23,42,.5);padding:12px 14px;width:270px;font:13px \'Space Grotesk\',sans-serif;color:#0f172a';
    const curColor = readD('color') || '#0f172a';
    const curBg = readD('background-color') || '#ffffff';
    const curFs = parseInt(readD('font-size'), 10) || '';
    const bold = readD('font-weight') != null;
    const align = readD('text-align');
    const alBtn = (v, lbl) => '<button type="button" data-tn-al="' + v + '" style="all:unset;cursor:pointer;flex:1;text-align:center;padding:6px 0;border-radius:7px;font-weight:800;font-size:12px;' + (align === v ? 'background:#0f172a;color:#fff' : 'background:#f1f5f9;color:#334155') + '">' + lbl + '</button>';
    d.innerHTML =
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:9px"><b style="font-size:13.5px;flex:1">🧩 ' + esc(label) + '</b>' +
        '<button type="button" id="_tn-close" style="all:unset;cursor:pointer;font-weight:800;color:#64748b;padding:2px 6px">✕</button></div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin:7px 0"><span style="flex:1;color:#64748b">Texti</span>' +
        '<input type="color" data-tn-c="color" value="' + esc(String(curColor).slice(0, 7)) + '" style="width:44px;height:30px;border:1px solid #cbd5e1;border-radius:7px;padding:1px;background:#fff">' +
        '<button type="button" data-tn-x="color" title="Hreinsa" style="all:unset;cursor:pointer;color:#94a3b8;font-weight:800;padding:2px 5px">✕</button></div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin:7px 0"><span style="flex:1;color:#64748b">Bakgrunnur</span>' +
        '<input type="color" data-tn-c="background-color" value="' + esc(String(curBg).slice(0, 7)) + '" style="width:44px;height:30px;border:1px solid #cbd5e1;border-radius:7px;padding:1px;background:#fff">' +
        '<button type="button" data-tn-x="background-color" title="Hreinsa" style="all:unset;cursor:pointer;color:#94a3b8;font-weight:800;padding:2px 5px">✕</button></div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin:7px 0"><span style="flex:1;color:#64748b">Font</span>' +
        '<select data-tn-font style="flex:1.6;padding:6px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;min-width:0">' +
          TN_FONTS.map(f => '<option value="' + esc(f) + '"' + ((readD('font-family') || '') === f ? ' selected' : '') + '>' + esc(f || '(sjálfgefið)') + '</option>').join('') +
        '</select></div>' +
      '<div style="display:flex;align-items:center;gap:8px;margin:7px 0"><span style="flex:1;color:#64748b">Leturstærð</span>' +
        '<input type="range" data-tn-fs min="8" max="30" step="1" value="' + (curFs || 13) + '" style="flex:1.4">' +
        '<span data-tn-fsv style="width:34px;text-align:right;font-weight:700">' + (curFs ? curFs + 'px' : '—') + '</span></div>' +
      '<div style="display:flex;gap:6px;margin:9px 0">' + alBtn('left', '⟸') + alBtn('center', '⟺') + alBtn('right', '⟹') +
        '<button type="button" data-tn-b style="all:unset;cursor:pointer;flex:1;text-align:center;padding:6px 0;border-radius:7px;font-weight:900;font-size:12px;' + (bold ? 'background:#0f172a;color:#fff' : 'background:#f1f5f9;color:#334155') + '">B</button></div>' +
      '<div style="display:flex;gap:8px;margin-top:10px">' +
        '<button type="button" id="_tn-clear" style="all:unset;cursor:pointer;flex:1;text-align:center;padding:7px 0;border-radius:8px;background:#fef2f2;color:#b91c1c;font-weight:700;font-size:12.5px">↺ Hreinsa allt</button>' +
        '<button type="button" id="_tn-done" style="all:unset;cursor:pointer;flex:1;text-align:center;padding:7px 0;border-radius:8px;background:#16a34a;color:#fff;font-weight:800;font-size:12.5px">✓ Búið</button></div>' +
      '<div style="margin-top:8px;font-size:11px;color:#94a3b8">Vistast strax — fylgir milli tækja. Fínstillingar í Stílstjóranum.</div>';
    document.body.appendChild(d);
    d.querySelector('#_tn-close').onclick = closeEditor;
    d.querySelector('#_tn-done').onclick = closeEditor;
    d.querySelector('#_tn-clear').onclick = () => { if (pe().clearRule) pe().clearRule(editing.scope, editing.sel); closeEditor(); };
    d.querySelectorAll('[data-tn-c]').forEach(inp => inp.addEventListener('input', () => setD(inp.dataset.tnC, inp.value)));
    d.querySelectorAll('[data-tn-x]').forEach(b => b.onclick = () => setD(b.dataset.tnX, null));
    const fsel = d.querySelector('[data-tn-font]');
    if (fsel) fsel.addEventListener('change', () => setD('font-family', fsel.value || null));
    const fs = d.querySelector('[data-tn-fs]'), fsv = d.querySelector('[data-tn-fsv]');
    fs.addEventListener('input', () => { setD('font-size', fs.value + 'px'); fsv.textContent = fs.value + 'px'; });
    d.querySelectorAll('[data-tn-al]').forEach(b => b.onclick = () => {
      const cur = readD('text-align');
      setD('text-align', cur === b.dataset.tnAl ? null : b.dataset.tnAl);
      openEditor(editing.sel, editing.label, nearRect);   // endurteikna virku takkana
    });
    d.querySelector('[data-tn-b]').onclick = () => {
      setD('font-weight', readD('font-weight') ? null : '800');
      openEditor(editing.sel, editing.label, nearRect);
    };
  }

  function setOn(v) {
    on = v;
    if (on) build(); else { destroyOverlay(); closeEditor(); }
    const b = document.querySelector('#pe-toflunet'); if (b) b.classList.toggle('on', on);
  }

  // Netið eltir scroll/resize (endurbyggt throttlað) á meðan það er á.
  let rt = null;
  const refresh = () => { if (!on) return; clearTimeout(rt); rt = setTimeout(() => { if (on) build(); }, 120); };
  window.addEventListener('scroll', refresh, true);
  window.addEventListener('resize', refresh);
  window.addEventListener('hashchange', () => setOn(false));

  // Takkinn í Stílstjóra-toolbar (sama endursmíðunar-mynstur og 319/320).
  function ensureBtn() {
    const bar = document.querySelector('.pe-toolbar');
    if (!bar) { if (on) setOn(false); return; }
    if (!bar.querySelector('#pe-toflunet')) {
      const b = document.createElement('button');
      b.id = 'pe-toflunet'; b.type = 'button'; b.className = 'pe-btn' + (on ? ' on' : '');
      b.textContent = '🧩 Töflunet';
      b.title = 'Leggja smellanlegt net yfir töflur síðunnar — veldu dálk, haus, raðir eða töfluna í heild';
      b.addEventListener('click', e => { e.preventDefault(); setOn(!on); });
      bar.appendChild(b);
    }
  }
  let t = null;
  new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (n && n.nodeType === 1 && (n.id === OV_ID || n.id === ED_ID || (n.closest && (n.closest('#' + OV_ID) || n.closest('#' + ED_ID))))) return;
    }
    clearTimeout(t); t = setTimeout(ensureBtn, 250);
  }).observe(document.body, { childList: true, subtree: true });
  ensureBtn();

  console.log('[patch-321] töflunet ready');
})();
/* === END TÖFLUNET === */
