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
    return '<img src="' + url + '" alt="' + escAlt + '" ' +
      'style="height:' + h + 'px;width:' + w + 'px;max-width:100%;object-fit:contain;display:inline-block;vertical-align:middle" ' +
      'onerror="this.style.visibility=\'hidden\'">';
  }

  window.SlokkLogo = { getUrl, imgHtml };

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
    wrap.style.cssText = 'margin-top:8px;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;align-items:center;gap:12px;flex-wrap:wrap';
    wrap.innerHTML =
      '<input id="_sl-file" type="file" accept="image/png,image/jpeg,image/svg+xml" style="font:inherit;font-size:12px">' +
      '<button id="_sl-reset" type="button" style="padding:6px 10px;background:#fff;border:1px solid #cbd5e1;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;color:#475569">↺ Endurstilla á sjálfgefið</button>' +
      '<div style="flex:1;min-width:160px;display:flex;justify-content:flex-end">' +
        '<div id="_sl-preview-frame" style="background:repeating-conic-gradient(#f1f5f9 0% 25%, #fff 0% 50%) 50% / 14px 14px;border:1px solid #cbd5e1;border-radius:6px;padding:6px;display:inline-flex;align-items:center;justify-content:center">' +
          '<img id="_sl-preview" src="' + getUrl() + '" style="height:48px;width:144px;object-fit:contain;display:block">' +
        '</div>' +
      '</div>';
    row.parentElement.insertBefore(wrap, row.nextSibling);

    const file = wrap.querySelector('#_sl-file');
    const preview = wrap.querySelector('#_sl-preview');
    const resetBtn = wrap.querySelector('#_sl-reset');

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

    file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      if (!f) return;
      if (f.size > 2 * 1024 * 1024) {
        alert('Skráin er stærri en 2 MB. Veldu minni mynd (helst < 200 KB).');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        commitLogo(dataUrl);
      };
      reader.readAsDataURL(f);
    });

    resetBtn.addEventListener('click', () => { commitLogo(DEFAULT_URL); });

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
