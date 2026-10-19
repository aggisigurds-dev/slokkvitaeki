/* === KENNITALA LOOKUP v1 === */
/* Adds a "Fletta upp" button next to every kennitala input in company/customer
 * forms. When clicked (or auto-triggered after 10 digits), it queries the
 * já.is public search API and fills in nafn, heimilisfang, sími, netfang.
 *
 * 19.10.2026: já.is-lykillinn er HVERGI í vafranum lengur. Hann býr í Netlify env
 * (JA_IS_API_KEY, valfrjáls) og /api/kt-lookup spyr já.is sjálft þegar Skatturinn
 * finnur ekki kennitöluna. Stillingar sýna aðeins „stillt á þjóni: já/nei".
 *
 * Endpoints tried in order:
 *  1. /api/kt-lookup (Skatturinn → já.is á þjóni ef lykill er til)
 *  2. Public CORS proxies → skatturinn.is, parsað hér
 *
 * The button is injected next to any input with id/name matching /kennitala|kt/
 * inside the company-new modal and any other form that opens after load.
 */
(() => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__ktLookupInstalled) return;
  window.__ktLookupInstalled = true;

  // Gamla leyndarmálið hreinsað einu sinni úr vafranum — það er aldrei lesið aftur.
  try { localStorage.removeItem('ja_is_api_key'); } catch (_) {}

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

    // 3) já.is — var áður kallað HÉR með lykli úr localStorage. Nú gerir /api/kt-lookup það
    //    á þjóninum (JA_IS_API_KEY í env) í þrepi 1; vafrinn ber engan lykil.

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

    // ── 30.09.2026 · ENGINN TEXTI MÁ TAPAST ────────────────────────────────────
    // MÆLT á lifandi síðu: ég skrifaði „MITT EIGIÐ NAFN sem má ekki tapast" í
    // nafnareitinn, sló svo inn kennitölu — og reiturinn sagði „Ferdinand Hansen".
    // Nafnið var þurrkað út þegjandi. Þannig varð líka til fyrirtæki #1844 sem hét
    // nafni úr EINNI kennitölu, með ENGA kennitölu og ekkert customer_base_id.
    //
    // Ástæðan var forsenda sem gilti ekki: `fill()` hafði annað þrep með
    // athugasemdinni „Try filling even if has value if user explicitly looked up"
    // — en `doLookup` er líka kallað af `input`-atburði (lína ~272, 300 ms eftir
    // innslátt), svo yfirskriftin gekk þegar ENGINN hafði smellt á neitt.
    //
    // Nú: innsláttur fyllir aðeins TÓMA reiti (sama regla og 114:262 hefur haft
    // rétta allan tímann). Smellur á „Fletta upp" má yfirskrifa — notandinn bað um
    // það — en fyrri gildin eru geymd og „↶ Til baka" birtist til að skila þeim.
    let afturHnappur = null;
    function bjodaTilBaka(fyrri) {
      if (!fyrri.length) return;
      if (afturHnappur) { try { afturHnappur.remove(); } catch (_) {} afturHnappur = null; }
      const a = document.createElement('button');
      a.type = 'button';
      a.className = 'kt-lookup-btn';
      a.textContent = '↶ Til baka';
      a.title = 'Skila textanum sem var í reitunum fyrir uppflettinguna:\n' +
        fyrri.map((f) => '• ' + f.heiti + ': ' + (f.gildi || '(tómt)')).join('\n');
      a.addEventListener('click', () => {
        fyrri.forEach((f) => { f.el.value = f.gildi; f.el.dispatchEvent(new Event('input', { bubbles: true })); });
        try { a.remove(); } catch (_) {}
        afturHnappur = null;
        if (window.Toast && Toast.show) Toast.show('Fyrri texti skilaður');
      });
      wrap.appendChild(a);
      afturHnappur = a;
      // hverfur af sjálfu sér — en textinn er þá þegar í reitnum, ekkert tapast
      setTimeout(() => { if (afturHnappur === a) { try { a.remove(); } catch (_) {} afturHnappur = null; } }, 30000);
    }

    async function doLookup(afSmelli) {
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
        const yfirskrifad = [];   // { el, heiti, gildi } — fyrra innihald, svo það sé afturkallanlegt
        function fill(patterns, value, heiti) {
          if (!value) return;
          // 1) tómir reitir — alltaf óhætt
          for (const p of patterns) {
            const el = form.querySelector(`input[id*="${p}"], input[name*="${p}"], textarea[id*="${p}"]`);
            if (el && !el.value) { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); return; }
          }
          // 2) reitur með texta: AÐEINS þegar smellt var á „Fletta upp". Innsláttur
          //    kennitölu má aldrei eyða texta sem einhver skrifaði.
          if (!afSmelli) return;
          for (const p of patterns) {
            const el = form.querySelector(`input[id*="${p}"], input[name*="${p}"], textarea[id*="${p}"]`);
            if (el) {
              if (el.value !== value) yfirskrifad.push({ el, heiti, gildi: el.value });
              el.value = value;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              return;
            }
          }
        }
        fill(['nafn', 'name'], data.nafn, 'Nafn');
        fill(['heimilisfang', 'address', 'adress', 'heim'], data.heimilisfang, 'Heimilisfang');
        fill(['simi', 'phone', 'tel'], data.simi, 'Sími');
        fill(['netfang', 'email'], data.netfang, 'Netfang');
        bjodaTilBaka(yfirskrifad);

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

    btn.addEventListener('click', () => doLookup(true));    // EXPLICIT — má yfirskrifa, með „↶ Til baka"

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
          setTimeout(() => doLookup(false), 300);   // SJÁLFVIRKT við innslátt — fyllir aðeins TÓMA reiti
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

  window.KtLookup = {
    lookup: fetchKt
  };

  // Stillingar: sýna aðeins hvort já.is-lykillinn sé til á þjóni (aldrei gildið)
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
      <div id="kt-api-key-stada" style="font-size:13px;color:#334155;">Stillt á þjóni: <strong>athuga…</strong></div>
      <div style="font-size:11px;color:#64748b;margin-top:6px;">
        Valfrjáls varaleið þegar Skatturinn finnur ekki kennitöluna. Lykillinn býr í Netlify env
        (<code>JA_IS_API_KEY</code>) — ekki í vafranum.
      </div>`;
    container.appendChild(div);
    fetch('/api/kt-lookup?stada=1').then(r => r.ok ? r.json() : null).then(j => {
      const el = document.getElementById('kt-api-key-stada');
      if (!el) return;
      el.innerHTML = 'Stillt á þjóni: <strong style="color:' + (j && j.ja_is_stillt ? '#166534' : '#64748b') + '">' + (j ? (j.ja_is_stillt ? 'já' : 'nei (valfrjálst)') : 'óþekkt') + '</strong>';
    }).catch(() => { const el = document.getElementById('kt-api-key-stada'); if (el) el.innerHTML = 'Stillt á þjóni: <strong>óþekkt</strong>'; });
  }

  document.addEventListener('view-shown', e => {
    if (e.detail && e.detail.name === 'settings') setTimeout(injectSettingsField, 100);
  });
  setTimeout(injectSettingsField, 2000);

  console.log('[kennitala-lookup] installed');
})();
/* === END KENNITALA LOOKUP === */
