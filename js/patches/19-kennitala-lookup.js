/* === KENNITALA LOOKUP v1 === */
/* Adds a "Fletta upp" button next to every kennitala input in company/customer
 * forms. When clicked (or auto-triggered after 10 digits), it queries the
 * já.is public search API and fills in nafn, heimilisfang, sími, netfang.
 *
 * API key: stored in localStorage key "ja_is_api_key".
 * Set it once via Settings → já.is lykill. Without a key the request is
 * still sent — já.is allows a small number of anonymous requests.
 *
 * Endpoints tried in order:
 *  1. https://api.ja.is/v1/companies/{kennitala}  (companies)
 *  2. https://leit.is/api/v1/einstaklingar/{kennitala}  (individuals, fallback)
 *
 * The button is injected next to any input with id/name matching /kennitala|kt/
 * inside the company-new modal and any other form that opens after load.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__ktLookupInstalled) return;
  window.__ktLookupInstalled = true;

  const LS_KEY = 'ja_is_api_key';

  // ── Styles ──────────────────────────────────────────────────────────────
  const STYLE_ID = 'kt-lookup-style';
  if (!document.getElementById(STYLE_ID)) {
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .kt-lookup-wrap { display: flex; gap: 6px; align-items: center; }
      .kt-lookup-wrap input { flex: 1; min-width: 0; }
      .kt-lookup-btn {
        flex-shrink: 0; padding: 0 11px; height: 36px; font-size: 12px;
        font-family: inherit; font-weight: 500;
        background: #f1f5f9; border: 1px solid #cbd5e1;
        border-radius: 7px; cursor: pointer; color: #334155;
        white-space: nowrap; display: flex; align-items: center; gap: 5px;
        transition: background .12s, border-color .12s;
      }
      .kt-lookup-btn:hover { background: #e2e8f0; border-color: #94a3b8; }
      .kt-lookup-btn:disabled { opacity: .5; cursor: not-allowed; }
      .kt-lookup-btn.ok { background: #dcfce7; border-color: #86efac; color: #166534; }
      .kt-lookup-btn.err { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
    `;
    document.head.appendChild(s);
  }

  // ── Core lookup ──────────────────────────────────────────────────────────
  // Uses our own Netlify Function /api/kt-lookup which scrapes Skatturinn
  // Fyrirtækjaskrá server-side. The browser can't call Iceland's lookup
  // endpoints directly because none of them send CORS headers — so we proxy.
  // Free, no API key needed, works for company kennitalas.
  async function fetchKt(kt) {
    const clean = kt.replace(/[^0-9]/g, '');

    // 1) Our Netlify Function (server-side scrape of Skatturinn — free, no key)
    try {
      const r = await fetch(`/api/kt-lookup?kt=${clean}`);
      if (r.ok) {
        const d = await r.json();
        if (d && d.nafn) {
          return {
            nafn: d.nafn,
            heimilisfang: d.heimilisfang_full || d.heimilisfang || '',
            simi: '',
            netfang: ''
          };
        }
      }
    } catch (_) { /* fall through */ }

    // 2) já.is API — only used when the user has explicitly set an API key
    //    in Stillingar (paid service). Skipped silently otherwise.
    const apiKey = localStorage.getItem(LS_KEY) || '';
    if (apiKey) {
      try {
        const r = await fetch(`https://api.ja.is/v1/companies/${clean}`, {
          headers: { 'X-API-KEY': apiKey },
        });
        if (r.ok) {
          const d = await r.json();
          if (d && (d.nafn || d.name)) {
            return {
              nafn: d.nafn || d.name || '',
              heimilisfang: [d.heimilisfang || d.address || '', d.postnumer || d.postalCode || '', d.sveitarfelag || d.city || ''].filter(Boolean).join(', '),
              simi: d.simi || d.phone || '',
              netfang: d.netfang || d.email || ''
            };
          }
        }
      } catch (_) { /* fall through */ }
    }

    throw new Error('Kennitala fannst ekki í gagnagrunni.');
  }

  // ── Button injection ─────────────────────────────────────────────────────
  function wrapInput(input) {
    if (!input || input.dataset.ktLookupWrapped) return;
    input.dataset.ktLookupWrapped = '1';

    // Find the field group (parent frow/field-body/label-block or just parent)
    const parent = input.parentElement;
    if (!parent) return;

    // Wrap input + button in a flex row
    const wrap = document.createElement('div');
    wrap.className = 'kt-lookup-wrap';
    parent.insertBefore(wrap, input);
    wrap.appendChild(input);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'kt-lookup-btn';
    btn.title = 'Fletta upp nafni og heimilisfangi';
    btn.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="8" cy="8" r="5"/><path d="M15 15l-3.5-3.5"/></svg>Fletta upp';
    wrap.appendChild(btn);

    async function doLookup() {
      const kt = input.value.replace(/[^0-9]/g, '');
      if (kt.length !== 10) {
        if (window.Toast && Toast.show) Toast.show('Kennitalan þarf að vera 10 tölustafir');
        return;
      }
      btn.disabled = true;
      btn.innerHTML = '⏳';
      btn.className = 'kt-lookup-btn';
      try {
        const data = await fetchKt(kt);
        // Fill form fields — look for matching inputs by common id patterns
        const form = input.closest('form, .modal-bd, .modal, [class*="modal"]') || document;
        function fill(patterns, value) {
          if (!value) return;
          for (const p of patterns) {
            const el = form.querySelector(`input[id*="${p}"], input[name*="${p}"], textarea[id*="${p}"]`);
            if (el && !el.value) { el.value = value; el.dispatchEvent(new Event('input')); return; }
          }
          // Try filling even if has value if user explicitly looked up
          for (const p of patterns) {
            const el = form.querySelector(`input[id*="${p}"], input[name*="${p}"], textarea[id*="${p}"]`);
            if (el) { el.value = value; el.dispatchEvent(new Event('input')); return; }
          }
        }
        fill(['nafn', 'name'], data.nafn);
        fill(['heimilisfang', 'address', 'adress'], data.heimilisfang);
        fill(['simi', 'phone', 'tel'], data.simi);
        fill(['netfang', 'email'], data.netfang);

        btn.textContent = '✓ Fundið';
        btn.className = 'kt-lookup-btn ok';
        setTimeout(() => {
          btn.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="8" cy="8" r="5"/><path d="M15 15l-3.5-3.5"/></svg>Fletta upp';
          btn.className = 'kt-lookup-btn';
          btn.disabled = false;
        }, 3000);
      } catch (e) {
        btn.textContent = '✗ Ekki fundið';
        btn.className = 'kt-lookup-btn err';
        if (window.Toast && Toast.show) Toast.show('Uppfletting mistókst — ' + (e.message || e));
        setTimeout(() => {
          btn.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="8" cy="8" r="5"/><path d="M15 15l-3.5-3.5"/></svg>Fletta upp';
          btn.className = 'kt-lookup-btn';
          btn.disabled = false;
        }, 3000);
      }
    }

    btn.addEventListener('click', doLookup);

    // Auto-trigger when 10 digits are typed
    input.addEventListener('input', () => {
      const digits = input.value.replace(/[^0-9]/g, '');
      if (digits.length === 10) {
        setTimeout(doLookup, 300);
      }
    });
  }

  // ── Find and wrap kt inputs in forms ────────────────────────────────────
  function scan(root) {
    const inputs = (root || document).querySelectorAll(
      'input[id*="kt"], input[id*="kennitala"], input[name*="kt"], input[name*="kennitala"]'
    );
    inputs.forEach(el => {
      // Skip inputs inside search/filter rows (not forms)
      if (el.closest('.by-filters, .by-row, [id*="search"], [class*="search"]')) return;
      wrapInput(el);
    });
  }

  scan();
  setTimeout(scan, 800);
  setTimeout(scan, 2500);

  // Watch for modals opening
  const mo = new MutationObserver(muts => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType === 1) scan(n);
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });

  // ── Expose API key setting ───────────────────────────────────────────────
  window.KtLookup = {
    setApiKey: k => { localStorage.setItem(LS_KEY, k); Toast && Toast.show && Toast.show('já.is lykill vistaður'); },
    getApiKey: () => localStorage.getItem(LS_KEY) || '',
    lookup: fetchKt
  };

  // Hook into Settings view to surface the API key field
  function injectSettingsField() {
    const settingsView = document.getElementById('view-settings');
    if (!settingsView || document.getElementById('kt-api-key-field')) return;
    // Find a sensible spot — after first settings section or at end
    const container = settingsView.querySelector('.main-panel, .settings-wrap, main') || settingsView;
    const div = document.createElement('div');
    div.id = 'kt-api-key-field';
    div.style.cssText = 'padding:16px 20px;border-top:1px solid #e2e8f0;';
    div.innerHTML = `
      <div style="font-weight:600;font-size:13px;color:#0f172a;margin-bottom:8px;">
        já.is API lykill (Kennitala uppfletting)
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input id="kt-api-key-input" type="text" placeholder="Slærðu inn lykil frá api.ja.is (valfrjálst)"
          style="flex:1;padding:8px 12px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:13px;"
          value="${(localStorage.getItem(LS_KEY)||'').replace(/"/g,'&quot;')}">
        <button onclick="KtLookup.setApiKey(document.getElementById('kt-api-key-input').value.trim())"
          style="padding:8px 14px;background:#2563eb;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;">
          Vista
        </button>
      </div>
      <div style="font-size:11px;color:#64748b;margin-top:6px;">
        Skráðu þig á <a href="https://api.ja.is" target="_blank" style="color:#2563eb;">api.ja.is</a> til að fá ókeypis lykil.
        Án lykils virka ~5 uppflettingar á dag.
      </div>`;
    container.appendChild(div);
  }

  document.addEventListener('view-shown', e => {
    if (e.detail && e.detail.name === 'settings') setTimeout(injectSettingsField, 100);
  });
  setTimeout(injectSettingsField, 2000);

  console.log('[kennitala-lookup] installed');
})();
/* === END KENNITALA LOOKUP === */
