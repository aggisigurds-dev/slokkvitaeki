/* === QUICK LINKS v2 === */
/* Side-nav quick-link buttons:
 *   📁 Skrár        — opens Supabase Storage browser (verkdagbok bucket)
 *   📊 Google Sheet — opens user-configured Google Sheet
 *   ☁️  Google Drive — opens user-configured Google Drive folder
 *
 * v2: URLs now live in AppSettings (Supabase) so they sync across all devices
 * and don't fall out when localStorage is cleared. Old localStorage values are
 * migrated automatically on first load. Right-click still works to edit
 * inline; the proper editor lives in Stillingar → 🔗 Tenglar tab.
 */
(() => {
  if (window.__quickLinksInstalled) return;
  window.__quickLinksInstalled = true;

  const STORAGE_URL = 'https://supabase.com/dashboard/project/osfdzskyvisifcwyjkuk/storage/buckets/verkdagbok';

  // Configurable URLs — keys correspond to AppSettings.tenglar.<key>_url
  const LINKS = [
    { key:'google_sheet', settingsKey:'google_sheet_url', icon:'📊', label:'Google Sheet', defaultPlaceholder:'https://docs.google.com/spreadsheets/d/' },
    { key:'google_drive', settingsKey:'google_drive_url', icon:'☁️',  label:'Google Drive', defaultPlaceholder:'https://drive.google.com/drive/folders/' }
  ];

  function getUrl(link) {
    // 1. AppSettings (Supabase) — primary source
    if (window.AppSettings && typeof window.AppSettings.path === 'function') {
      const v = window.AppSettings.path('tenglar.' + link.settingsKey);
      if (v) return v;
    }
    // 2. localStorage — legacy fallback (and for first-load before Supabase responds)
    return localStorage.getItem('cfg_'+link.key+'_url') || '';
  }
  async function setUrl(link, u) {
    const url = (u || '').trim();
    // Save to localStorage immediately (works offline, instant)
    if (url) localStorage.setItem('cfg_'+link.key+'_url', url);
    else localStorage.removeItem('cfg_'+link.key+'_url');
    // Save to AppSettings (Supabase) — persists across devices
    if (window.AppSettings && typeof window.AppSettings.save === 'function') {
      const patch = { tenglar: {} };
      patch.tenglar[link.settingsKey] = url;
      try { await window.AppSettings.save(patch); } catch (e) { /* offline → localStorage already set */ }
    }
  }
  // One-time migration: if localStorage has URLs but Supabase doesn't, push up.
  function migrateLocalStorage() {
    if (!window.AppSettings || !window.AppSettings.isLoaded || !window.AppSettings.isLoaded()) return;
    const t = window.AppSettings.path('tenglar') || {};
    LINKS.forEach(link => {
      const local = localStorage.getItem('cfg_'+link.key+'_url');
      if (local && !t[link.settingsKey]) {
        // Push the local value up so other devices see it too
        setUrl(link, local);
      }
    });
  }

  async function openLink(link) {
    let url = getUrl(link);
    if (!url) {
      url = prompt(`Sláðu inn slóð á ${link.label}:\n(Þetta vistast núna í Stillingar → 🔗 Tenglar — virkar á öllum tækjum)`, link.defaultPlaceholder);
      if (!url || url === link.defaultPlaceholder) return;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      await setUrl(link, url);
    }
    window.open(url, '_blank', 'noopener');
  }

  function openStorage() { window.open(STORAGE_URL, '_blank', 'noopener'); }

  async function changeUrl(link, e) {
    e.preventDefault();
    const cur = getUrl(link);
    const v = prompt(`Slóð á ${link.label} (skildu eftir tóman reit til að fjarlægja):`, cur);
    if (v === null) return;
    await setUrl(link, v.trim());
    return false;
  }

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('qlinks-style')) {
    const s = document.createElement('style');
    s.id = 'qlinks-style';
    s.textContent = `
      .qlinks-section { margin-top:14px; padding-top:12px; border-top:1px solid rgba(255,255,255,.1); }
      .qlinks-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em;
                      color:rgba(255,255,255,.5); padding:0 14px; margin-bottom:8px; }
      .qlinks-btn { display:flex; align-items:center; gap:10px; padding:9px 14px; cursor:pointer;
                    color:rgba(255,255,255,.85); text-decoration:none; font-size:13px; border-radius:6px;
                    margin:2px 6px; transition:background .12s, color .12s; }
      .qlinks-btn:hover { background:rgba(255,255,255,.08); color:#fff; }
      .qlinks-btn .ico { font-size:15px; }
      .qlinks-btn .ext { margin-left:auto; opacity:.4; font-size:11px; }
      /* Light theme fallback (in case sidebar isn't dark on some pages) */
      body.light-theme .qlinks-section { border-top-color:#e2e8f0; }
      body.light-theme .qlinks-label { color:#64748b; }
      body.light-theme .qlinks-btn { color:#0f172a; }
      body.light-theme .qlinks-btn:hover { background:#f1f5f9; }
    `;
    document.head.appendChild(s);
  }

  // ── Inject into side nav ──────────────────────────────────────────────────
  function inject() {
    const nav = document.querySelector('nav.view-nav');
    if (!nav || nav.querySelector('.qlinks-section')) return;

    const wrap = document.createElement('div');
    wrap.className = 'qlinks-section';
    wrap.innerHTML = `
      <div class="qlinks-label">Tenglar</div>
      <a class="qlinks-btn" id="qlink-storage" title="Skoða allar myndir og skjöl í Supabase Storage">
        <span class="ico">📁</span><span>Skrár í Storage</span><span class="ext">↗</span>
      </a>
      ${LINKS.map(l => `
        <a class="qlinks-btn" data-qkey="${l.key}" title="${l.label} (hægri-smelltu til að breyta)">
          <span class="ico">${l.icon}</span><span class="qlink-label" data-qlbl="${l.key}">${l.label}</span><span class="ext">↗</span>
        </a>`).join('')}`;
    nav.appendChild(wrap);

    const updateLabels = () => {
      LINKS.forEach(l => {
        const lbl = wrap.querySelector(`[data-qlbl="${l.key}"]`);
        if (lbl) lbl.textContent = getUrl(l) ? l.label : `${l.label} (stilla)`;
      });
    };
    updateLabels();
    // Re-render labels whenever AppSettings.tenglar changes (Stillingar save).
    if (window.AppSettings && typeof window.AppSettings.onChange === 'function') {
      window.AppSettings.onChange(() => updateLabels());
    }

    wrap.querySelector('#qlink-storage').addEventListener('click', e => { e.preventDefault(); openStorage(); });
    LINKS.forEach(l => {
      const btn = wrap.querySelector(`[data-qkey="${l.key}"]`);
      if (!btn) return;
      btn.addEventListener('click', e => { e.preventDefault(); openLink(l); updateLabels(); });
      btn.addEventListener('contextmenu', e => { changeUrl(l, e); updateLabels(); });
    });
  }

  // Try immediately + when DOM changes (nav may render later)
  inject();
  const obs = new MutationObserver(() => inject());
  obs.observe(document.body, { childList:true, subtree:true });

  // After AppSettings hydrates, run one-time migration of legacy localStorage URLs.
  function tryMigrate(tries) {
    if (window.AppSettings && window.AppSettings.isLoaded && window.AppSettings.isLoaded()) {
      migrateLocalStorage();
      return;
    }
    if ((tries || 0) > 30) return;
    setTimeout(() => tryMigrate((tries || 0) + 1), 400);
  }
  tryMigrate();

  window.QuickLinks = { openStorage, openLink, changeUrl, getUrl, setUrl, LINKS };
  console.log('[quick-links v2] installed');
})();
/* === END QUICK LINKS === */
