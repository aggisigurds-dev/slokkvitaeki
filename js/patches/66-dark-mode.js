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
      html[data-theme="dark"] [style*="color:#475569"], html[data-theme="dark"] [style*="color:#64748b"] { color:#94a3b8 !important; }
      html[data-theme="dark"] [style*="color:#94a3b8"] { color:#64748b !important; }
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

  // Load saved theme on init
  const saved = localStorage.getItem('cfg_theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    apply('dark');
  }

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
