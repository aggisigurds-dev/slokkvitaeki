/* Leiðbeiningar — In-app tutorials tab.
 *
 * Injects a sidebar nav button "Leiðbeiningar" and a view that embeds
 * the docs/ folder (live tutorials with talsetning + screenshots).
 * Loads docs/index.html in an iframe so any updates propagate without
 * needing a redeploy of this patch.
 */
(() => {
  if (window.__leidbeiningarInstalled) return;
  window.__leidbeiningarInstalled = true;

  function ensureView() {
    if (document.getElementById('view-leidbeiningar')) return;
    const v = document.createElement('div');
    v.id = 'view-leidbeiningar';
    v.className = 'view';
    v.style.cssText = 'padding:0;height:calc(100vh - 56px);overflow:hidden;background:#f8fafc';
    v.innerHTML =
      '<div style="display:flex;flex-direction:column;height:100%">' +
        '<div style="padding:10px 16px;border-bottom:1px solid var(--brd,#e4e6ea);display:flex;align-items:center;gap:10px;background:#fff;flex-wrap:wrap">' +
          '<div style="font-size:13px;font-weight:700;color:#0f172a">📚 Leiðbeiningar</div>' +
          '<span style="font-size:12px;color:var(--ink3,#8891a0)">Kennslubækur fyrir starfsfólk</span>' +
          '<div style="margin-left:auto;display:flex;gap:8px">' +
            '<a href="https://slokkvitaeki.netlify.app/docs/" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="text-decoration:none">↗ Opna í nýjum flipa</a>' +
            '<button class="btn btn-outline btn-sm" onclick="document.getElementById(\'leidb-frame\').contentWindow.location.reload()">⟲ Endurnýja</button>' +
          '</div>' +
        '</div>' +
        '<iframe id="leidb-frame" src="docs/index.html" style="flex:1;border:none;background:#fff;width:100%" loading="lazy"></iframe>' +
      '</div>';
    // Other views (view-counter, view-workshop) live as direct children of body.
    // Match that placement so the app's view-routing CSS sizes us correctly.
    const ref = document.querySelector('div.view#view-counter, div.view#view-workshop');
    if (ref && ref.parentElement) {
      ref.parentElement.insertBefore(v, ref.nextSibling);
    } else {
      document.body.appendChild(v);
    }
  }

  function ensureNavBtn() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) return false;
    if (nav.querySelector('.vnav-btn[data-view="leidbeiningar"]')) return true;
    const btn = document.createElement('button');
    btn.className = 'vnav-btn';
    btn.setAttribute('data-view', 'leidbeiningar');
    btn.setAttribute('onclick', "App.switchView('leidbeiningar')");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
        '<path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>' +
        '<path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>' +
      '</svg>' +
      '<span>Leiðbeiningar</span>';
    nav.appendChild(btn);
    if (window.SidebarReorder && SidebarReorder.reorder) {
      try { SidebarReorder.reorder(); } catch (_) {}
    }
    return true;
  }

  function init() {
    ensureView();
    if (!ensureNavBtn()) {
      let tries = 0;
      const t = setInterval(() => {
        if (ensureNavBtn() || ++tries > 30) clearInterval(t);
      }, 500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[leidbeiningar] installed');
})();
