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
  // Skatturinn (RSK) Fyrirtækjaskrá sendir ekki CORS-headers, þannig að við
  // þurfum að proxa beiðnina. Tvær leiðir í forgangsröð:
  //   1) Eigin Netlify Function /api/kt-lookup (ef hún er deplýjuð — annars 404)
  //   2) Public CORS proxy (corsproxy.io / allorigins.win) sem nær HTML-inu
  //      beint frá skatturinn.is og við parsum það client-side.
  //
  // HTML pars hér mirroar parsing-logic-ið úr Netlify Function (netlify/
  // functions/kt-lookup.js) svo niðurstaðan sé sú sama. Free, no API key.

  function parseRskHtml(html) {
    const nameMatch = html.match(/<h1>\s*([^<(]+?)\s*\((\d{10})\)\s*<\/h1>/);
    const nafn = nameMatch ? nameMatch[1].trim() : '';
    if (!nafn) return null;
    let heimilisfang = '', postnumer = '', stadur = '';
    const addrMatch = html.match(/<td>\s*([^<>]+?)\s*<br\s*\/?>\s*(\d{3})\s+([^<>]+?)\s*<\/td>/);
    if (addrMatch) {
      heimilisfang = addrMatch[1].trim();
      postnumer    = addrMatch[2].trim();
      stadur       = addrMatch[3].trim();
    }
    const heimilisfang_full = [heimilisfang, postnumer && stadur ? `${postnumer} ${stadur}` : (postnumer || stadur)]
      .filter(Boolean).join(', ');
    return { nafn, heimilisfang, heimilisfang_full, postnumer, stadur };
  }

  async function fetchKt(kt) {
    const clean = kt.replace(/[^0-9]/g, '');

    // 1) Try our Netlify Function first (works only if deployed).
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

    // 2) Public CORS proxies → Skatturinn (RSK) Fyrirtækjaskrá.
    //    codetabs er fyrsti valkostur (frítt, virkar áreiðanlega) — nota
    //    trailing slash til að sleppa 301 redirect sem getur týnt CORS-um
    //    í sumum vöfrum.
    const target = `https://www.skatturinn.is/fyrirtaekjaskra/leit/kennitala/${clean}`;
    const proxies = [
      'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(target),
      'https://api.allorigins.win/raw?url=' + encodeURIComponent(target),
      'https://corsproxy.io/?url=' + encodeURIComponent(target)
    ];
    let anyProxyReached = false;
    for (const url of proxies) {
      try {
        const r = await fetch(url);
        if (!r.ok) { console.warn('[kt-lookup] proxy', url.split('?')[0], 'HTTP', r.status); continue; }
        anyProxyReached = true;
        const html = await r.text();
        const parsed = parseRskHtml(html);
        if (parsed) {
          console.log('[kt-lookup] found via', url.split('?')[0], '→', parsed.nafn);
          return {
            nafn: parsed.nafn,
            heimilisfang: parsed.heimilisfang_full || parsed.heimilisfang || '',
            simi: '',
            netfang: ''
          };
        }
        // Proxy worked but page had no company info → RSK said no.
        console.warn('[kt-lookup] proxy ok but kt not in fyrirtækjaskrá:', clean);
      } catch (e) {
        console.warn('[kt-lookup] proxy failed', url.split('?')[0], e && e.message);
      }
    }
    if (!anyProxyReached) {
      throw new Error('Engin CORS-proxy svaraði — netvandamál eða allir blokkaðir.');
    }

    // 3) já.is API — ef notandi hefur sett lykil í Stillingar (paid service).
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

    throw new Error('Kennitala fannst ekki í fyrirtækjaskrá RSK.');
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
        const form = input.closest('form, .modal-bd, .modal, [class*="modal"], [id*="modal"], #tb-modal .tb-card') || document;
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
        fill(['heimilisfang', 'address', 'adress', 'heim'], data.heimilisfang);
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
        // 2026-05-10 (#2): Offer inline fallback to manually create the
        // customer with this kt instead of leaving the user stranded with
        // a "Engin samsvörun" message and no path forward.
        try {
          const ktForFallback = (input.value || '').replace(/[^0-9]/g, '');
          if (ktForFallback.length === 10 && window.Confirm && Confirm.show) {
            const ok = await Confirm.show(
              'Kennitala ' + ktForFallback.slice(0,6) + '-' + ktForFallback.slice(6) +
              ' fannst ekki í þjóðskrá / kerfinu.\n\nViltu skrá viðskiptavin handvirkt með þessari kt?',
              { okText: 'Skrá handvirkt', cancelText: 'Hætta við' }
            );
            if (ok) {
              // Look for the unified-pos-search "+ Stofna" dialog opener
              if (window._upsOpenNewCustomer) {
                window._upsOpenNewCustomer('', ktForFallback);
              } else {
                // Fallback: trigger search results re-render so user sees
                // the inline "+ Stofna" option from patch 114
                const searchInp = document.querySelector('#_ups-search, input[placeholder*="kennit"]');
                if (searchInp) {
                  searchInp.focus();
                  searchInp.dispatchEvent(new Event('input', { bubbles: true }));
                }
              }
            }
          }
        } catch (_) {}
        setTimeout(() => {
          btn.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="8" cy="8" r="5"/><path d="M15 15l-3.5-3.5"/></svg>Fletta upp';
          btn.className = 'kt-lookup-btn';
          btn.disabled = false;
        }, 3000);
      }
    }

    btn.addEventListener('click', doLookup);

    // Auto-trigger only on customer-creation forms — NOT on the Sala POS
    // input (#pos-kt). On Sala the unified search (patch 114) owns the
    // customer-resolution flow and populates state directly from the local
    // DB. Auto-running an RSK lookup on top of that caused two issues:
    //   • If RSK had slightly different data, the form fields got overwritten
    //     with stale info (e.g. older heimilisfang).
    //   • If RSK couldn't find the kt (e.g. individual / not in
    //     fyrirtækjaskrá), the catch-branch fallback fired the "Skrá
    //     viðskiptavin handvirkt?" Confirm.show dialog even though a
    //     valid local customer was already selected — confusing the user.
    // The user can still click the "Fletta upp" button explicitly when
    // they actually want to refresh from RSK.
    const isSalaSearch = input.id === 'pos-kt' ||
      !!input.closest('#view-sala, .pos-cart, [id*="pos-"]');
    if (!isSalaSearch) {
      input.addEventListener('input', () => {
        const digits = input.value.replace(/[^0-9]/g, '');
        if (digits.length === 10) {
          setTimeout(doLookup, 300);
        }
      });
    }
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
