/* === DÖKKT ÞEMA / DARK MODE v1 === */
/* Toggle button + persisted preference. CSS uses data-theme="dark" on <html>. */
(() => {
  if (window.__darkInstalled) return;
  window.__darkInstalled = true;

  if (!document.getElementById('dark-style')) {
    const s=document.createElement('style'); s.id='dark-style';
    s.textContent=`
      html[data-theme="dark"] body { background:#0f172a; color:#e2e8f0; }
      html[data-theme="dark"] .topbar, html[data-theme="dark"] header { background:#1e293b; border-bottom:1px solid rgba(255,255,255,.08); }
      html[data-theme="dark"] .main-panel, html[data-theme="dark"] main { background:#0f172a; }
      html[data-theme="dark"] .card, html[data-theme="dark"] .ak-card, html[data-theme="dark"] .sa-card, html[data-theme="dark"] .sa-section, html[data-theme="dark"] .cc-section,
      html[data-theme="dark"] table, html[data-theme="dark"] .vd-card, html[data-theme="dark"] .ct-modal, html[data-theme="dark"] .ak-modal,
      html[data-theme="dark"] .gs-modal, html[data-theme="dark"] .vdp-modal, html[data-theme="dark"] .dh-modal, html[data-theme="dark"] .pi-modal,
      html[data-theme="dark"] .notif-panel
        { background:#1e293b !important; color:#e2e8f0 !important; border-color:#334155 !important; }
      html[data-theme="dark"] th, html[data-theme="dark"] [class*="-hd"]:not(.dh-hd):not(.ct-form-hd) { background:#0f172a !important; color:#94a3b8 !important; }
      html[data-theme="dark"] td, html[data-theme="dark"] tr { border-color:#334155 !important; }
      html[data-theme="dark"] tr:hover td { background:#0f172a !important; }
      html[data-theme="dark"] input, html[data-theme="dark"] select, html[data-theme="dark"] textarea
        { background:#0f172a !important; color:#e2e8f0 !important; border-color:#334155 !important; }
      html[data-theme="dark"] .btn-outline { background:#1e293b !important; color:#e2e8f0 !important; border-color:#334155 !important; }
      html[data-theme="dark"] .btn-ghost { color:#cbd5e1 !important; }
      html[data-theme="dark"] [style*="background:#fff"], html[data-theme="dark"] [style*="background: #fff"] { background:#1e293b !important; }
      html[data-theme="dark"] [style*="background:#f8fafc"], html[data-theme="dark"] [style*="background:#f1f5f9"] { background:#0f172a !important; }
      html[data-theme="dark"] [style*="color:#0f172a"], html[data-theme="dark"] [style*="color: #0f172a"] { color:#e2e8f0 !important; }
      /* 2026-08-07 (skjáskot Agnars: „much black on black" á símanum): listinn
         hér að ofan þekkti bara #0f172a sem aðal-blek, en síður eins og
         Aksturslisti (268) notuðu #111827/#1e293b/#334155 — bakgrunnarnir
         flipppuðust dökkir en textinn sat eftir svartur. Sömu fjölskyldu-litir
         remappast nú líka. (Athuga: substring-selectorinn grípur líka
         border-color:#334155 — það er sami afsláttur og eldri reglurnar gera.) */
      html[data-theme="dark"] [style*="color:#111827"], html[data-theme="dark"] [style*="color:#1e293b"], html[data-theme="dark"] [style*="color:#334155"], html[data-theme="dark"] [style*="color:#111"] { color:#e2e8f0 !important; }
      html[data-theme="dark"] [style*="color:#475569"], html[data-theme="dark"] [style*="color:#64748b"] { color:#94a3b8 !important; }
      html[data-theme="dark"] [style*="color:#6b7280"], html[data-theme="dark"] [style*="color:#9ca3af"] { color:#94a3b8 !important; }
      /* Fjarlægt 2026-08-07: reglan [style*="color:#94a3b8"]→#64748b DÖKKAÐI
         daufa gráa textann í dökku þema — en fletirnir undir honum flippast
         dökkir, svo útkoman var #64748b á #1e293b (2,4:1, grátt á gráu).
         Án reglunnar stendur #94a3b8 áfram og mælist 4,9:1 á dökka fletinum. */
      .dark-toggle { background:none; border:none; cursor:pointer; padding:8px 10px; border-radius:8px; color:inherit; font-size:18px; }
      .dark-toggle:hover { background:rgba(255,255,255,.08); }
    `;
    document.head.appendChild(s);
  }

  function apply(theme){
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cfg_theme', theme);
    const btn = document.getElementById('dark-toggle');
    if (btn) btn.textContent = theme==='dark' ? '☀️' : '🌙';
  }

  function toggle(){
    const cur = document.documentElement.getAttribute('data-theme');
    apply(cur==='dark' ? 'light' : 'dark');
  }

  // One-time reset — until 2026-05-06 the patch auto-applied dark mode based on
  // OS preference. That polluted localStorage with cfg_theme='dark' on every
  // device whose OS was set to dark, and the dark-mode CSS doesn't render the
  // app well (see screenshots in the "Nytt fix mobile layout" Drive folder).
  // Wipe the stored preference once so everyone falls back to light; users
  // who actually want dark can re-enable it via the 🌙 toggle.
  if (!localStorage.getItem('cfg_theme_v2_reset')) {
    localStorage.removeItem('cfg_theme');
    localStorage.setItem('cfg_theme_v2_reset', '1');
  }
  // Load saved theme on init. Light is the default — we no longer follow the
  // OS preference automatically because users who have Windows in dark mode
  // were getting the dark theme without choosing it, and the desktop layout
  // wasn't designed around it.
  const saved = localStorage.getItem('cfg_theme');
  if (saved === 'dark') apply('dark');

  function ensureBtn(){
    if (document.getElementById('dark-toggle')) return;
    const topbar = document.querySelector('.topbar') || document.querySelector('header');
    if (!topbar) return;
    const btn = document.createElement('button');
    btn.id = 'dark-toggle';
    btn.className = 'dark-toggle';
    btn.title = 'Skipta um þema';
    btn.textContent = document.documentElement.getAttribute('data-theme')==='dark' ? '☀️' : '🌙';
    btn.onclick = toggle;
    topbar.appendChild(btn);
  }
  setTimeout(ensureBtn, 1500);

  window.DarkMode = { apply, toggle };
  console.log('[dark-mode] installed');
})();
