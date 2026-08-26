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

  function chip(label, title, sel, extra) {
    return '<button type="button" data-tn-sel="' + esc(sel) + '" data-tn-label="' + esc(label) + '" title="' + esc(title) + '" ' +
      'style="all:unset;cursor:pointer;pointer-events:auto;font:800 11px \'Space Grotesk\',sans-serif;color:#fff;background:#2563eb;padding:3px 9px;border-radius:7px;box-shadow:0 3px 10px rgba(0,0,0,.35);white-space:nowrap;' + (extra || '') + '">' + esc(label) + '</button>';
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
    tables.forEach(t => {
      const tr = t.getBoundingClientRect();
      const ts = tableSel(t);
      const ths = Array.prototype.slice.call(t.querySelectorAll('thead th')).filter(th => getComputedStyle(th).display !== 'none');
      // dálka-flögg + þunn lóðrétt lína yfir hvern dálk
      ths.forEach((th, i) => {
        const n = Array.prototype.indexOf.call(th.parentNode.children, th) + 1;
        const r = th.getBoundingClientRect();
        if (r.width < 14) return;
        html += '<div style="position:fixed;left:' + r.left + 'px;top:' + tr.top + 'px;width:' + r.width + 'px;height:' + tr.height + 'px;border-left:1px dashed rgba(37,99,235,.5);pointer-events:none"></div>';
        html += '<div style="position:fixed;left:' + (r.left + 2) + 'px;top:' + Math.max(2, tr.top - 24) + 'px;pointer-events:none">' +
          chip('D' + (i + 1), 'Stíla dálk ' + (i + 1) + ' — haus + allir reitir', ts + ' tr>*:nth-child(' + n + ')') + '</div>';
      });
      // HAUS / RAÐIR / TAFLAN flögg efst til hægri við töfluna
      html += '<div style="position:fixed;left:' + Math.max(4, tr.left) + 'px;top:' + Math.max(2, tr.top - 52) + 'px;display:flex;gap:6px;pointer-events:none">' +
        chip('HAUS', 'Stíla töfluhausinn (allar haus-sellur)', ts + ' thead th', 'background:#0f172a') +
        chip('RAÐIR', 'Stíla allar raðir (alla reiti í body)', ts + ' tbody td', 'background:#0f172a') +
        chip('TAFLAN', 'Stíla töfluna í heild', ts, 'background:#0f172a') +
      '</div>';
    });
    ov.innerHTML = html;
    document.body.appendChild(ov);
    ov.querySelectorAll('[data-tn-sel]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      openEditor(b.dataset.tnSel, b.dataset.tnLabel, b.getBoundingClientRect());
    }));
  }
  function destroyOverlay() { const o = document.getElementById(OV_ID); if (o) o.remove(); }
  function closeEditor() { const d = document.getElementById(ED_ID); if (d) d.remove(); editing = null; }

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
