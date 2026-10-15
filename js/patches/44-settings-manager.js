/* === SETTINGS MANAGER / STILLINGAR v1 === */
/* Central settings panel for all app-wide configuration.
 * Replaces / enhances any existing Stillingar view with a unified UI.
 *
 * Sections:
 *   1. Fyrirtæki — company name, address, phone, kennitala, VSK number
 *   2. Þjónusta  — default inspection interval (months), lab hourly rate
 *   3. SMS / Tölvupóstur — reminder templates, sender phone
 *   4. Kerfið    — version info, cache clear, export all settings
 *
 * 15.10.2026: settings live on the server — AppSettings 'stillingar.fyrirtaeki.*' (+ 'stillingar.timagjald',
 * 'stillingar.sms.simi' mirrors) — one value for all machines, written ONLY on "Vista". The old localStorage
 * 'cfg_*' keys are read as a fallback until the first save and never written again (except cfg_default_tech).
 *
 * Legacy keys (read-only fallback):
 *   sms_company_phone  → same as cfg_company_phone
 *   insp_tech          → same as cfg_default_tech
 *   job_hourly_rate    → same as cfg_hourly_rate
 *   bulk_reminder_log  → preserved (not cleared)
 */
(() => {
  if (window.__settingsMgrInstalled) return;
  window.__settingsMgrInstalled = true;

  function esc(s) { return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // 15.10.2026 (regla Agnars: engin stilling má gilda bara í einu tæki): þessar stillingar snerta reikninga, SMS og
  // póst → þær búa í AppSettings undir 'stillingar.fyrirtaeki.<reitur>' (eitt gildi fyrir allar vélar) og eru
  // skrifaðar AÐEINS við „Vista stillingar"-smell. Gömlu localStorage-lyklarnir (cfg_*, sms_company_phone,
  // job_hourly_rate) eru aðeins LESNIR sem varagildi þar til fyrst er vistað — aldrei skrifaðir framar.
  // cfg_default_tech (= hver er við vélina) er undantekningin og situr áfram í localStorage þessarar vélar.
  const FIELDS = [
    // [storageKey, label, type, placeholder, section, legacyKey?, stillingar-slóð (null = per vél)]
    ['cfg_company_name',    'Nafn fyrirtækis',         'text',   'Slökkvitæki ehf',       'company', null, 'fyrirtaeki.nafn'],
    ['cfg_company_address', 'Heimilisfang',             'text',   'Hafnargata 1, 101 Reykjavík', 'company', null, 'fyrirtaeki.heimilisfang'],
    ['cfg_company_phone',   'Símanúmer fyrirtækis',     'tel',    '+354 xxx xxxx',         'company', 'sms_company_phone', 'fyrirtaeki.simi'],
    ['cfg_company_email',   'Tölvupóstfang',            'email',  'info@slokkvitaeki.is',  'company', null, 'fyrirtaeki.netfang'],
    ['cfg_kennitala',       'Kennitala',                'text',   '000000-0000',           'company', null, 'fyrirtaeki.kt'],
    ['cfg_vsk_number',      'VSK-númer',                'text',   '00000',                 'company', null, 'fyrirtaeki.vsk'],

    ['cfg_insp_interval',   'Sjálfgefið skoðunarbil (mánuðir)', 'number', '12',           'service',  null, 'fyrirtaeki.skodunarbil'],
    ['cfg_hourly_rate',     'Tímagjald tæknimanns (kr/klst)',    'number', '12000',        'service',  'job_hourly_rate', 'fyrirtaeki.timagjald'],
    ['cfg_default_tech',    'Sjálfgefið nafn tæknimanns',        'text',   '',             'service',  'insp_tech', null],

    ['cfg_sms_template',    'SMS sniðmát (áminning)',   'textarea','Slökkvitæki ehf: Tæki hjá {nafn} eru á gjalddaga skoðunar. Hafðu samband.','sms', null, 'fyrirtaeki.smsSnid'],
    ['cfg_email_subject',   'Efni tölvupósts (áminning)','text',  'Áminning — skoðun slökkvitækja hjá {nafn}', 'sms', null, 'fyrirtaeki.postEfni'],
    ['cfg_email_intro',     'Inngangssetning tölvupósts', 'textarea','Góðan dag,\n\nSlökkvitæki ehf hér með áminningu um að eftirfarandi slökkvitæki eru á gjalddaga skoðunar:', 'sms', null, 'fyrirtaeki.postInngangur'],
  ];

  const SECTIONS = {
    company: { label:'🏢 Fyrirtæki', desc:'Grunnupplýsingar um fyrirtækið — notaðar á reikninga og vottorð.' },
    service: { label:'🔧 Þjónusta',  desc:'Sjálfgefnar stillingar fyrir skoðun og verðlagningu.' },
    sms:     { label:'📱 SMS / Tölvupóstur', desc:'Sniðmát fyrir sjálfvirkar áminningar til viðskiptavina.' },
  };

  // ── CSS ───────────────────────────────────────────────────────────────────
  if (!document.getElementById('settings-mgr-style')) {
    const s = document.createElement('style');
    s.id = 'settings-mgr-style';
    s.textContent = `
      .sm-modal-wrap { position:fixed; inset:0; z-index:99998; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.45); padding:16px; }
      .sm-modal { background:#fff; border-radius:16px; max-width:580px; width:100%; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 24px 64px rgba(0,0,0,.28); font-family:inherit; overflow:hidden; }
      .sm-modal-hd { display:flex; align-items:center; justify-content:space-between; padding:20px 24px; border-bottom:1px solid var(--brd,#e2e8f0); flex-shrink:0; }
      .sm-modal-body { flex:1; overflow-y:auto; padding:0; }
      .sm-modal-ft { padding:14px 24px; border-top:1px solid var(--brd,#e2e8f0); display:flex; gap:8px; justify-content:flex-end; flex-shrink:0; }
      .sm-section { padding:20px 24px; border-bottom:1px solid var(--brd,#e2e8f0); }
      .sm-section:last-child { border-bottom:none; }
      .sm-section-title { font-size:13px; font-weight:700; color:var(--ink1,#1e293b); margin-bottom:3px; }
      .sm-section-desc  { font-size:12px; color:var(--ink3,#64748b); margin-bottom:14px; }
      .sm-field { margin-bottom:12px; }
      .sm-field:last-child { margin-bottom:0; }
      .sm-label { font-size:12px; font-weight:600; color:var(--ink2,#475569); margin-bottom:4px; display:block; }
      .sm-inp { width:100%; box-sizing:border-box; padding:8px 12px; border:1px solid var(--brd,#e2e8f0); border-radius:8px; font:inherit; font-size:13px; background:var(--bg1,#fff); color:var(--ink1,#1e293b); }
      .sm-inp:focus { outline:2px solid var(--blu,#3b82f6); outline-offset:1px; }
      .sm-ta { width:100%; box-sizing:border-box; padding:8px 12px; border:1px solid var(--brd,#e2e8f0); border-radius:8px; font:inherit; font-size:12px; background:var(--bg1,#fff); color:var(--ink1); resize:vertical; min-height:60px; }
      .sm-saved-dot { display:inline-block; width:6px; height:6px; background:#16a34a; border-radius:50%; margin-left:6px; animation:sm-fade 2s forwards; }
      @keyframes sm-fade { 0%{opacity:1} 80%{opacity:1} 100%{opacity:0} }
      .sm-sys-row { display:flex; align-items:center; justify-content:space-between; font-size:13px; padding:8px 0; border-bottom:1px solid var(--bg2,#f1f5f9); }
      .sm-sys-row:last-child { border-bottom:none; }
    `;
    document.head.appendChild(s);
  }

  // ── Read / write helpers ──────────────────────────────────────────────────
  function stLesa(p) {
    try { const v = window.AppSettings && AppSettings.path && AppSettings.path('stillingar.' + p); return (v === undefined || v === null || v === '') ? null : String(v); } catch (_) { return null; }
  }
  const stSlod = key => { const f = FIELDS.find(x => x[0] === key); return f ? f[6] : null; };
  function get(key, legacyKey) {
    const p = stSlod(key);
    if (p) { const v = stLesa(p); if (v != null) return v; }
    // Varagildi þar til fyrst er vistað (aðeins lesið).
    try { return localStorage.getItem(key) || (legacyKey ? localStorage.getItem(legacyKey) : '') || ''; } catch (_) { return ''; }
  }
  // Setur gildi á punktaslóð inn í patch-hlut: 'fyrirtaeki.nafn' → { fyrirtaeki: { nafn } }.
  function setjaSlod(obj, p, val) { const h = p.split('.'); let o = obj; for (let i = 0; i < h.length - 1; i++) o = o[h[i]] = o[h[i]] || {}; o[h[h.length - 1]] = val; }

  function save() {
    let changed = 0;
    const st = {};
    FIELDS.forEach(([key,,,,,legacyKey, p]) => {
      const el = document.getElementById('sm-field-'+key);
      if (!el) return;
      const val = el.value;
      if (p) {
        setjaSlod(st, p, val);
        // Sömu speglanir og gömlu legacy-lyklarnir: 43 les stillingar.timagjald, 33/37 lesa stillingar.sms.simi.
        if (key === 'cfg_hourly_rate') st.timagjald = parseInt(val, 10) || 12000;
        if (key === 'cfg_company_phone') setjaSlod(st, 'sms.simi', val);
      } else {
        // Per vél (hver er við vélina) — localStorage eins og áður.
        try { localStorage.setItem(key, val); if (legacyKey) localStorage.setItem(legacyKey, val); } catch (_) {}
      }
      changed++;
    });
    // Skrifað AÐEINS hér — við „Vista stillingar"-smell — á þjóninn (allar vélar).
    try { if (window.AppSettings && AppSettings.save) AppSettings.save({ stillingar: st }); } catch (_) {}
    if (window.Toast) Toast.show('✓ Stillingar vistaðar');
    // Animate saved dot
    const title = document.querySelector('.sm-modal-hd .sm-modal-title');
    if (title) {
      const dot = document.createElement('span');
      dot.className = 'sm-saved-dot';
      title.appendChild(dot);
      setTimeout(()=>dot.remove(), 2100);
    }
  }

  // ── Open panel ────────────────────────────────────────────────────────────
  function open() {
    document.getElementById('sm-settings-modal')?.remove();
    const m = document.createElement('div');
    m.id = 'sm-settings-modal';
    m.className = 'sm-modal-wrap';
    m.onclick = e => { if(e.target===m) m.remove(); };

    // Build section HTML
    const sections = Object.entries(SECTIONS).map(([key, sec]) => {
      const fields = FIELDS.filter(f=>f[4]===key);
      const fieldHtml = fields.map(([fkey, label, type,, ,legacyKey]) => {
        const val = esc(get(fkey, legacyKey));
        const inp = type==='textarea'
          ? `<textarea class="sm-ta" id="sm-field-${fkey}" rows="3">${val}</textarea>`
          : `<input class="sm-inp" type="${type}" id="sm-field-${fkey}" value="${val}" placeholder="">`;
        return `<div class="sm-field"><label class="sm-label">${esc(label)}</label>${inp}</div>`;
      }).join('');
      return `<div class="sm-section">
        <div class="sm-section-title">${sec.label}</div>
        <div class="sm-section-desc">${sec.desc}</div>
        ${fieldHtml}
      </div>`;
    }).join('');

    // System section
    const ver = document.querySelector('meta[name="app-version"]')?.content || '—';
    const sysHtml = `<div class="sm-section">
      <div class="sm-section-title">⚙️ Kerfið</div>
      <div class="sm-section-desc">Tæknilegar upplýsingar og viðhald.</div>
      <div class="sm-sys-row"><span>Útgáfa</span><span style="color:var(--ink3);font-family:monospace">${esc(ver)}</span></div>
      <div class="sm-sys-row"><span>Stillingatæki</span><span><button class="btn btn-outline btn-sm" onclick="SettingsMgr._exportSettings()">⬇ Flytja út</button></span></div>
      <div class="sm-sys-row"><span>Innflutningur</span><span><input type="file" id="sm-import-file" accept=".json" style="font-size:11px" onchange="SettingsMgr._importSettings(this.files[0])"></span></div>
      <div class="sm-sys-row"><span>Skýra reminder log</span><span><button class="btn btn-outline btn-sm" onclick="SettingsMgr._clearLog()">Hreinsa</button></span></div>
    </div>`;

    m.innerHTML = `
      <div class="sm-modal">
        <div class="sm-modal-hd">
          <div style="font-size:16px;font-weight:700" class="sm-modal-title">⚙️ Stillingar</div>
          <button onclick="document.getElementById('sm-settings-modal')?.remove()" style="background:none;border:none;font-size:18px;cursor:pointer;color:#64748b">✕</button>
        </div>
        <div class="sm-modal-body">
          ${sections}
          ${sysHtml}
        </div>
        <div class="sm-modal-ft">
          <button class="btn btn-outline" onclick="document.getElementById('sm-settings-modal')?.remove()">Loka</button>
          <button class="btn btn-primary" onclick="SettingsMgr.save()">💾 Vista stillingar</button>
        </div>
      </div>`;
    document.body.appendChild(m);
  }

  // ── Export / import settings ──────────────────────────────────────────────
  function _exportSettings() {
    const out = {};
    FIELDS.forEach(([key,,,,,legacyKey]) => { out[key] = get(key, legacyKey) || ''; });
    const blob = new Blob([JSON.stringify(out, null, 2)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'slokkvitaeki-stillingar.json';
    a.click();
  }

  function _importSettings(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        // Innflutningur er raunveruleg aðgerð notandans (skrá valin) → sömu leið og Vista: þjónninn fyrir
        // fyrirtækis-reitina, localStorage aðeins fyrir per-vélar reitinn.
        const st = {};
        Object.entries(data).forEach(([k,v]) => {
          if (!k.startsWith('cfg_')) return;
          const p = stSlod(k);
          if (p) {
            setjaSlod(st, p, String(v == null ? '' : v));
            if (k === 'cfg_hourly_rate') st.timagjald = parseInt(v, 10) || 12000;
            if (k === 'cfg_company_phone') setjaSlod(st, 'sms.simi', String(v == null ? '' : v));
          } else { try { localStorage.setItem(k, v); } catch (_) {} }
        });
        let p = null;
        try { if (Object.keys(st).length && window.AppSettings && AppSettings.save) p = AppSettings.save({ stillingar: st }); } catch (_) {}
        if(window.Toast) Toast.show('✓ Stillingar fluttar inn');
        Promise.resolve(p).then(open, open); // Re-open to show updated values
      } catch { if(window.Toast) Toast.show('Villa við innflutning'); }
    };
    reader.readAsText(file);
  }

  async function _clearLog() {
    if (!await Confirm.show('Hreinsa áminningarlog? Þetta mun fjarlægja minningar um sent tölvupóstar/SMS.')) return;
    localStorage.removeItem('bulk_reminder_log');
    localStorage.removeItem('sms_sent_log');
    // 21.09.2026: sagan býr nú á ÞJÓNINUM (33/37: sms_aminningar_log · bulk_aminningar_log) og localStorage er aðeins
    // skyndiminni — hnappurinn hreinsaði því ekkert lengur (sagan kom strax aftur). Vörpur sameinast per lykil og
    // lesarinn í 33 hunsar gildi sem eru ekki strengir, svo hver færsla er sett á null. Sagt SATT frá ef það bregst.
    let n = 0, okThjonn = true;
    try {
      const AS = window.AppSettings;
      if (AS && AS.save && AS.path) {
        if (AS.load) { try { await AS.load(); } catch (_) {} }
        for (const lykill of ['sms_aminningar_log', 'bulk_aminningar_log']) {
          const m = AS.path(lykill) || {}; const p = {};
          Object.keys(m).forEach(k => { if (typeof m[k] === 'string') { p[k] = null; n++; } });
          if (Object.keys(p).length && (await AS.save({ [lykill]: p })) !== true) okThjonn = false;
        }
      } else okThjonn = false;
    } catch (e) { okThjonn = false; console.warn('[settings-mgr] hreinsun áminningasögu', e); }
    if(window.Toast) Toast.show(okThjonn ? ('✓ Áminningasaga hreinsuð á öllum tækjum (' + n + ' færslur)') : '⚠ Hreinsað á þessu tæki, en náði EKKI á þjóninn — sagan kemur aftur. Reyndu aftur.');
  }

  // ── Inject button into existing Stillingar nav + inject gear icon ─────────
  // 13.10.2026 (afköst): vaktin skannaði ALLT skjalið við hverja DOM-breytingu hvar sem er. Falin borð haldast í DOM-inu,
  // svo eftir að mörg borð hafa verið opnuð (~100 þús. hnútar) kostaði hver umferð 40–70 ms (CPU-prófíll) — og veljarinn
  // fann ekkert stak í neinu af 55 borðum appsins (mælt). Nú: ein heil leit í fyrstu umferð eins og áður, síðan aðeins
  // nýju hnútarnir úr breytingunni.
  let _fyrstaLeit = true;
  const nyirHnutar = (skr, sel) => {
    if (_fyrstaLeit || !Array.isArray(skr)) { _fyrstaLeit = false; return document.querySelectorAll(sel); }
    const ut = new Set();
    for (const s of skr) for (const n of s.addedNodes || []) {
      if (n.nodeType !== 1) continue;
      if (n.matches(sel)) ut.add(n);
      n.querySelectorAll(sel).forEach(x => ut.add(x));
    }
    return ut;
  };
  function _injectSettingsButtons(skr) {
    // Inject into any existing Stillingar section header
    nyirHnutar(skr, '.stillingar-section-hd, [data-settings-inject]:not([data-sm-injected])').forEach(el => {
      el.dataset.smInjected = '1';
      const btn = document.createElement('button');
      btn.className = 'btn btn-outline btn-sm';
      btn.innerHTML = '⚙️ Opnar stillingar';
      btn.onclick = () => SettingsMgr.open();
      el.appendChild(btn);
    });

    // Inject gear button into top nav / header if there's a settings button placeholder
    const existing = document.querySelector('[data-view="settings"]');
    if (existing && !existing.dataset.smOverride) {
      existing.dataset.smOverride = '1';
      const origClick = existing.onclick;
      existing.onclick = () => { SettingsMgr.open(); };
    }
  }
  new MutationObserver(_injectSettingsButtons).observe(document.body, { childList:true, subtree:true });
  setTimeout(_injectSettingsButtons, 800);

  // ── Expose + provide company info helper ──────────────────────────────────
  window.SettingsMgr = {
    open, save, _exportSettings, _importSettings, _clearLog,
    // Les af þjóninum (stillingar.fyrirtaeki.*) með gamla localStorage-gildinu sem varagildi.
    get: (key, fallback) => { const f = FIELDS.find(x => x[0] === 'cfg_' + key); return get('cfg_' + key, f ? f[5] : null) || fallback || ''; },
  };

  // 15.10.2026: gamla „samstilling legacy-lykla við hleðslu" (skrifaði í localStorage við hverja ræsingu) er farin —
  // 33/37/43 lesa nú stillingar.sms.simi / stillingar.timagjald af þjóninum, speglað í save() hér að ofan.

  console.log('[settings-manager] installed');
})();
/* === END SETTINGS MANAGER === */
