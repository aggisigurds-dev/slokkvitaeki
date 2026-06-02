/* === LOGO CUSTOMIZATION v1 ===
 *
 * Central helper for the company logo used across every printed artifact:
 * receipts, A4 invoices, úttektarskýrslur, þjónustusamningar, brunakerfis-
 * skjöl, kúnnareikningur, document templates, etc.
 *
 *   window.SlokkLogo.getUrl()              → string (data URL or /img/logo.png)
 *   window.SlokkLogo.imgHtml({heightPx})   → "<img …>" inside a 3:1 frame
 *
 * UI: a small "🖼️ Logo" file-upload button gets injected into the Stillingar
 * panel (patch 86), right under the existing Logo URL field. Picking a PNG
 * reads it as a base64 data URL and stores it under branding.logo_url. All
 * subsequent renders pick it up (re-open the print preview to see).
 *
 * 3:1 frame: container width = heightPx × 3, with object-fit:contain so
 * whatever aspect-ratio logo the user uploads gets centered without
 * distortion. Each call site passes its own heightPx (the receipt uses ~60,
 * úttektarskýrslan ~90, brunakerfi pricelist ~42, etc.) so layouts don't
 * shift — only the brand mark changes.
 */
(() => {
  if (window.__slokkLogoInstalled) return;
  window.__slokkLogoInstalled = true;

  const DEFAULT_URL = '/img/logo.png?v=20260520b';

  function getUrl() {
    try {
      if (window.AppSettings && typeof AppSettings.path === 'function') {
        const v = AppSettings.path('branding.logo_url');
        if (v && String(v).trim()) return String(v);
      }
    } catch (_) {}
    return DEFAULT_URL;
  }

  // 3:1 framed <img>. Pass heightPx to fit the surrounding layout. Width is
  // computed as heightPx × 3 so the box always reads as a horizontal logo
  // slot. object-fit:contain centers the image without cropping or stretch.
  function imgHtml(opts) {
    const o = opts || {};
    const h = +o.heightPx || 80;
    const w = h * 3;
    const alt = String(o.alt || 'Slökkvitæki');
    const escAlt = alt.replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    // 2026-05-20: only prepend origin for *root-relative* paths (`/img/...`)
    // — data URLs and absolute http(s) URLs must be left untouched, otherwise
    // popup windows try to load `https://slokkvitaeki.netlify.appdata:image/...`
    // which is nonsense. This was the silent-fail bug for custom PNG uploads.
    const raw = getUrl();
    const isAbsolute = /^(data:|https?:|blob:)/i.test(raw);
    const url = (o.absoluteUrl && !isAbsolute && window.location && window.location.origin)
      ? window.location.origin + raw
      : raw;
    // object-position lets callers hug the wordmark to the left of its 3:1
    // box (default contain centers it, leaving a left gap that misaligns the
    // logo with the body text below). Defaults to center to preserve callers
    // that don't opt in.
    const objPos = o.objectPosition ? String(o.objectPosition) : 'center';
    return '<img src="' + url + '" alt="' + escAlt + '" class="slokk-logo-img" ' +
      'style="height:' + h + 'px;width:' + w + 'px;max-width:100%;object-fit:contain;object-position:' + objPos + ';display:inline-block;vertical-align:middle" ' +
      'onerror="this.style.visibility=\'hidden\'">';
  }

  // Persist a new logo everywhere and live-refresh anything already on screen.
  // Shared by both the Stillingar uploader and the standalone openUploader()
  // modal (the "🖼️ Logo" button on the Samningar toolbar).
  async function commitLogoGlobal(dataUrl) {
    // 1. Live-update any logos already rendered in the DOM (e.g. the contract
    //    print-preview behind the modal) — no re-open needed.
    try {
      document.querySelectorAll('img.slokk-logo-img').forEach(img => {
        img.style.visibility = ''; img.src = dataUrl;
      });
    } catch (_) {}
    // 2. Keep the Stillingar → Branding panel in sync if it happens to be open.
    try {
      const urlInp = document.querySelector('input[data-bk="logo_url"]');
      if (urlInp) {
        urlInp.value = dataUrl;
        urlInp.dispatchEvent(new Event('input', { bubbles: true }));
        urlInp.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const sp = document.querySelector('#_sl-preview');
      if (sp) sp.src = dataUrl;
    } catch (_) {}
    // 3. Persist to AppSettings (Supabase + localStorage cache).
    if (window.AppSettings && typeof AppSettings.save === 'function') {
      await AppSettings.save({ branding: { logo_url: dataUrl } });
    }
    if (window.Toast && Toast.show) Toast.show('✓ Logo vistað — birtist á öllum samningum');
  }

  // Standalone logo-upload modal — opened from the Samningar toolbar so the
  // user can change the contract logo without digging into Stillingar. Same
  // 3:1 framed dropzone, same storage (branding.logo_url) as the settings
  // panel, so the new logo flows to every artifact app-wide.
  function openUploader() {
    document.getElementById('_sl-logo-modal')?.remove();
    const FRAME_BG = 'repeating-conic-gradient(#f1f5f9 0% 25%, #fff 0% 50%) 50% / 14px 14px';
    const ov = document.createElement('div');
    ov.id = '_sl-logo-modal';
    ov.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);padding:16px';
    ov.innerHTML =
      '<div style="background:#fff;border-radius:14px;width:100%;max-width:460px;box-shadow:0 24px 64px rgba(0,0,0,.3);overflow:hidden">' +
        '<div style="background:#1e293b;color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center">' +
          '<h3 style="margin:0;font-size:16px">🖼️ Logo á samninga</h3>' +
          '<button id="_sl-x" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer">✕</button>' +
        '</div>' +
        '<div style="padding:20px;display:flex;flex-direction:column;gap:12px">' +
          '<div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.04em">Logo (3:1 rammi)</div>' +
          '<div id="_sl-drop2" title="Smelltu eða dragðu logo hingað" ' +
            'style="cursor:pointer;background:' + FRAME_BG + ';border:2px dashed #94a3b8;border-radius:10px;padding:12px;display:flex;align-items:center;justify-content:center;min-height:110px;transition:border-color .15s,background .15s">' +
            '<img id="_sl-prev2" src="' + getUrl() + '" alt="logo" style="height:90px;width:270px;max-width:100%;object-fit:contain;display:block;pointer-events:none">' +
          '</div>' +
          '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
            '<span style="font-size:12px;color:#64748b">Dragðu mynd í rammann eða</span>' +
            '<input id="_sl-file2" type="file" accept="image/png,image/jpeg,image/svg+xml" style="font:inherit;font-size:12px">' +
          '</div>' +
          '<div style="font-size:11px;color:#94a3b8">PNG/JPG/SVG, helst &lt; 200 KB. Birtist á öllum samningum, reikningum og skýrslum.</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:space-between;padding:14px 20px;background:#f8fafc">' +
          '<button id="_sl-reset2" style="padding:8px 12px;background:#fff;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:13px;color:#475569">↺ Sjálfgefið logo</button>' +
          '<button id="_sl-close2" class="btn btn-primary" style="padding:8px 14px">Loka</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    const file = ov.querySelector('#_sl-file2');
    const prev = ov.querySelector('#_sl-prev2');
    const drop = ov.querySelector('#_sl-drop2');
    const close = () => ov.remove();
    ov.querySelector('#_sl-x').addEventListener('click', close);
    ov.querySelector('#_sl-close2').addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });

    function handleFile(f) {
      if (!f) return;
      if (!/^image\//.test(f.type || '')) { alert('Veldu myndaskrá (PNG, JPG eða SVG).'); return; }
      if (f.size > 2 * 1024 * 1024) { alert('Skráin er stærri en 2 MB. Veldu minni mynd (helst < 200 KB).'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const d = String(reader.result || '');
        prev.src = d;
        commitLogoGlobal(d).catch(e => alert('Tókst ekki að vista logo: ' + (e.message || e)));
      };
      reader.readAsDataURL(f);
    }

    file.addEventListener('change', () => handleFile(file.files && file.files[0]));
    ov.querySelector('#_sl-reset2').addEventListener('click', () => {
      prev.src = DEFAULT_URL;
      commitLogoGlobal(DEFAULT_URL).catch(() => {});
    });
    drop.addEventListener('click', () => file.click());
    ['dragenter', 'dragover'].forEach(ev =>
      drop.addEventListener(ev, e => {
        e.preventDefault(); e.stopPropagation();
        drop.style.borderColor = '#2563eb'; drop.style.background = '#eff6ff';
      }));
    ['dragleave', 'dragend'].forEach(ev =>
      drop.addEventListener(ev, e => {
        e.preventDefault(); e.stopPropagation();
        drop.style.borderColor = '#94a3b8'; drop.style.background = FRAME_BG;
      }));
    drop.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      drop.style.borderColor = '#94a3b8'; drop.style.background = FRAME_BG;
      const dt = e.dataTransfer;
      handleFile(dt && dt.files && dt.files[0]);
    });
  }

  window.SlokkLogo = { getUrl, imgHtml, openUploader };

  // ── Settings UI enhancement ────────────────────────────────────────────
  // Watch for the Stillingar branding panel rendering and inject a file
  // input + small preview below the existing "Logo URL" text field.
  function injectUploader() {
    const panels = document.querySelectorAll('.su-panel, [class*="settings"], .su-row');
    if (!panels.length) return;
    // Find the Logo URL input by its data-bk attribute.
    const urlInp = document.querySelector('input[data-bk="logo_url"]');
    if (!urlInp) return;
    if (urlInp.dataset._slUpInjected === '1') return;
    urlInp.dataset._slUpInjected = '1';

    const row = urlInp.closest('.su-row') || urlInp.parentElement;
    if (!row) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-top:8px;padding:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;flex-direction:column;gap:8px';
    wrap.innerHTML =
      '<div style="font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.04em">Logo (3:1 rammi)</div>' +
      '<div id="_sl-drop" title="Smelltu eða dragðu logo hingað" ' +
        'style="cursor:pointer;position:relative;background:repeating-conic-gradient(#f1f5f9 0% 25%, #fff 0% 50%) 50% / 14px 14px;' +
        'border:2px dashed #94a3b8;border-radius:10px;padding:10px;display:flex;align-items:center;justify-content:center;min-height:96px;transition:border-color .15s,background .15s">' +
        '<img id="_sl-preview" src="' + getUrl() + '" alt="logo" style="height:78px;width:234px;max-width:100%;object-fit:contain;display:block;pointer-events:none">' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
        '<span style="font-size:12px;color:#64748b">Dragðu mynd í rammann að ofan eða</span>' +
        '<input id="_sl-file" type="file" accept="image/png,image/jpeg,image/svg+xml" style="font:inherit;font-size:12px">' +
        '<button id="_sl-reset" type="button" style="padding:6px 10px;background:#fff;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;color:#475569">↺ Endurstilla á sjálfgefið</button>' +
      '</div>' +
      '<div style="font-size:11px;color:#94a3b8">PNG/JPG/SVG, helst &lt; 200 KB. Birtist á samningum, reikningum og skýrslum.</div>';
    row.parentElement.insertBefore(wrap, row.nextSibling);

    const file = wrap.querySelector('#_sl-file');
    const preview = wrap.querySelector('#_sl-preview');
    const resetBtn = wrap.querySelector('#_sl-reset');
    const drop = wrap.querySelector('#_sl-drop');
    const FRAME_BG = 'repeating-conic-gradient(#f1f5f9 0% 25%, #fff 0% 50%) 50% / 14px 14px';

    // 2026-05-20: persist IMMEDIATELY via AppSettings.save() — the settings
    // panel's wireBranding handler only stores in a local draft until the
    // user clicks Vista, so the previous behaviour silently lost the upload
    // when the user closed the panel without saving.
    async function commitLogo(dataUrl) {
      // 1. Update the visible input + preview right away.
      urlInp.value = dataUrl;
      urlInp.dispatchEvent(new Event('input', { bubbles: true }));
      urlInp.dispatchEvent(new Event('change', { bubbles: true }));
      preview.src = dataUrl;
      // 2. Commit to AppSettings (Supabase + localStorage cache).
      if (window.AppSettings && typeof AppSettings.save === 'function') {
        try {
          await AppSettings.save({ branding: { logo_url: dataUrl } });
          if (window.Toast && Toast.show) Toast.show('✓ Logo vistað — birtist á öllum reikningum');
        } catch (e) {
          alert('Tókst ekki að vista logo: ' + (e.message || e));
        }
      }
    }

    function handleFile(f) {
      if (!f) return;
      if (!/^image\//.test(f.type || '')) { alert('Veldu myndaskrá (PNG, JPG eða SVG).'); return; }
      if (f.size > 2 * 1024 * 1024) {
        alert('Skráin er stærri en 2 MB. Veldu minni mynd (helst < 200 KB).');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => commitLogo(String(reader.result || ''));
      reader.readAsDataURL(f);
    }

    file.addEventListener('change', () => handleFile(file.files && file.files[0]));
    resetBtn.addEventListener('click', () => { commitLogo(DEFAULT_URL); });

    // Click the 3:1 frame to browse.
    drop.addEventListener('click', () => file.click());

    // Drag-and-drop a logo straight into the 3:1 frame.
    ['dragenter', 'dragover'].forEach(ev =>
      drop.addEventListener(ev, e => {
        e.preventDefault(); e.stopPropagation();
        drop.style.borderColor = '#2563eb';
        drop.style.background = '#eff6ff';
      }));
    ['dragleave', 'dragend'].forEach(ev =>
      drop.addEventListener(ev, e => {
        e.preventDefault(); e.stopPropagation();
        drop.style.borderColor = '#94a3b8';
        drop.style.background = FRAME_BG;
      }));
    drop.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      drop.style.borderColor = '#94a3b8';
      drop.style.background = FRAME_BG;
      const dt = e.dataTransfer;
      handleFile(dt && dt.files && dt.files[0]);
    });

    // Live preview when user manually edits the URL field too.
    urlInp.addEventListener('input', () => { preview.src = urlInp.value || DEFAULT_URL; });
  }

  // Re-check periodically — the settings panel is lazy-opened.
  let _tries = 0;
  function poll() {
    injectUploader();
    if (_tries++ < 120) setTimeout(poll, 800);
  }
  poll();

  console.log('[patch-169] SlokkLogo helper installed — upload logo in Stillingar → Branding');
})();
/* === END LOGO CUSTOMIZATION === */
