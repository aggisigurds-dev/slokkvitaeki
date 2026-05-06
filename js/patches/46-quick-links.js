/* === QUICK LINKS v1 === */
/* Side-nav quick-link buttons:
 *   📁 Skrár        — opens Supabase Storage browser (verkdagbok bucket)
 *   📊 Google Sheet — opens user-configured Google Sheet
 *
 * Sheet URL is stored in localStorage 'cfg_google_sheet_url'.
 * If not set, clicking the button prompts for it.
 *
 * Right-click either button → option to change/clear URL.
 */
(() => {
  if (window.__quickLinksInstalled) return;
  window.__quickLinksInstalled = true;

  const STORAGE_URL = 'https://supabase.com/dashboard/project/osfdzskyvisifcwyjkuk/storage/buckets/verkdagbok';

  // Configurable URLs (each stored under cfg_<key>_url in localStorage)
  const LINKS = [
    { key:'google_sheet', icon:'📊', label:'Google Sheet',   defaultPlaceholder:'https://docs.google.com/spreadsheets/d/' },
    { key:'google_drive', icon:'☁️',  label:'Google Drive',   defaultPlaceholder:'https://drive.google.com/drive/folders/' }
  ];

  function getUrl(key)  { return localStorage.getItem('cfg_'+key+'_url') || ''; }
  function setUrl(key,u){ if (u) localStorage.setItem('cfg_'+key+'_url', u); else localStorage.removeItem('cfg_'+key+'_url'); }

  function openLink(link) {
    let url = getUrl(link.key);
    if (!url) {
      url = prompt(`Sláðu inn slóð á ${link.label}:\n(Hægri-smelltu hvenær sem er til að breyta)`, link.defaultPlaceholder);
      if (!url || url === link.defaultPlaceholder) return;
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      setUrl(link.key, url);
    }
    window.open(url, '_blank', 'noopener');
  }

  function openStorage() { window.open(STORAGE_URL, '_blank', 'noopener'); }

  function changeUrl(link, e) {
    e.preventDefault();
    const cur = getUrl(link.key);
    const v = prompt(`Slóð á ${link.label} (skildu eftir tóman reit til að fjarlægja):`, cur);
    if (v === null) return;
    setUrl(link.key, v.trim());
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
        if (lbl) lbl.textContent = getUrl(l.key) ? l.label : `${l.label} (stilla)`;
      });
    };
    updateLabels();

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

  window.QuickLinks = { openStorage, openLink, changeUrl, getUrl, setUrl, LINKS };
  console.log('[quick-links] installed');
})();
/* === END QUICK LINKS === */
