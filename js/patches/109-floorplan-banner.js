/* === FLOORPLAN BANNER v1 ===
 *
 * Endurgerir „Teikning"-section á fyrirtækisspjaldi:
 *   • Banner-stíll: jafnbreitt og aðrar einingar á síðunni
 *   • Mynd „fit the frame" — passar inn án að skerast (object-fit:contain)
 *   • Zoom + pan virkt (mouse wheel + drag)
 *   • Tækjadottar (markers) sjást ALLTAF — stærri, meira contrast, bæði á
 *     canvas (varanlegt) og sem HTML-overlay (svo þú sjáir þá þó canvas
 *     re-render gleymi þeim)
 *
 * Hooks _coFpInject (úr newfeatures.js) til að breyta layout og bæta við
 * marker-overlay. Ef plan.markers er tóm sýnum við „Engir tækjadottar enn —
 * smelltu á tæki og síðan á myndina til að setja niður dot."
 */
(() => {
  if (window.__floorplanBannerInstalled) return;
  window.__floorplanBannerInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // CSS for banner-style floor plan section
  if (!document.getElementById('_fpb-style')) {
    const s = document.createElement('style');
    s.id = '_fpb-style';
    s.textContent = `
      #co-fp-section._fpb-banner {
        margin: 14px 0 18px !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 12px !important;
        overflow: hidden !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06) !important;
        background: #f8fafc !important;
      }
      #co-fp-section._fpb-banner #coFpVp {
        height: 480px !important;
        position: relative;
        background: repeating-linear-gradient(45deg, #f1f5f9, #f1f5f9 8px, #f8fafc 8px, #f8fafc 16px) !important;
        cursor: grab;
      }
      #co-fp-section._fpb-banner #coFpVp:active { cursor: grabbing; }
      #co-fp-section._fpb-banner #coFpCv {
        transform-origin: 0 0;
      }
      #co-fp-section._fpb-banner ._fpb-marker-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
      }
      #co-fp-section._fpb-banner ._fpb-marker {
        position: absolute;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #c93c1d;
        border: 3px solid #fff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.15);
        transform: translate(-50%, -50%);
        z-index: 10;
        transition: transform 0.15s;
      }
      #co-fp-section._fpb-banner ._fpb-marker:hover {
        transform: translate(-50%, -50%) scale(1.3);
      }
      #co-fp-section._fpb-banner ._fpb-empty {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255,255,255,0.95);
        border: 1px dashed #cbd5e1;
        border-radius: 10px;
        padding: 14px 22px;
        font-size: 13px;
        color: #64748b;
        text-align: center;
        max-width: 380px;
        pointer-events: none;
      }
      @media (max-width: 768px) {
        #co-fp-section._fpb-banner #coFpVp { height: 320px !important; }
      }
    `;
    document.head.appendChild(s);
  }

  function decorate() {
    const section = document.getElementById('co-fp-section');
    if (!section) return;
    if (!section.classList.contains('_fpb-banner')) {
      section.classList.add('_fpb-banner');
    }

    // Find current company id from window._currentCompanyId
    const coId = window._currentCompanyId;
    const fp = window.FloorPlan && window.FloorPlan.plans && coId ? window.FloorPlan.plans[coId] : null;
    const markers = fp && Array.isArray(fp.markers) ? fp.markers : [];

    const vp = section.querySelector('#coFpVp');
    if (!vp) return;
    const canvas = section.querySelector('#coFpCv');
    if (!canvas) return;

    // Add HTML overlay for markers (in addition to canvas rendering)
    let overlay = vp.querySelector('._fpb-marker-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = '_fpb-marker-overlay';
      vp.appendChild(overlay);
    }
    overlay.innerHTML = '';

    // Scale the canvas to fit the viewport (contain)
    fitCanvasToViewport(vp, canvas);

    // Determine canvas-to-viewport scale for marker positioning
    const vpRect = vp.getBoundingClientRect();
    const cwV = canvas.offsetWidth || parseFloat(canvas.style.width) || canvas.width;
    const chV = canvas.offsetHeight || parseFloat(canvas.style.height) || canvas.height;

    if (!markers.length) {
      const empty = document.createElement('div');
      empty.className = '_fpb-empty';
      empty.innerHTML = '📍 <strong>Engir tækjadottar enn</strong><br><span style="font-size:12px;color:#94a3b8">Smelltu á tæki og síðan á myndina til að setja niður dot.</span>';
      vp.appendChild(empty);
      // Replace empty if user clicks something
      return;
    }

    // Read canvas natural size from canvas.width / canvas.height
    const natW = canvas.width || cwV;
    const natH = canvas.height || chV;

    // Get the apparent on-screen canvas size (style)
    const showW = parseFloat(canvas.style.width) || cwV;
    const showH = parseFloat(canvas.style.height) || chV;
    // Get canvas offset within viewport (centered)
    const offX = (vp.offsetWidth - showW) / 2;
    const offY = (vp.offsetHeight - showH) / 2;

    markers.forEach((mk, i) => {
      const dot = document.createElement('div');
      dot.className = '_fpb-marker';
      dot.style.background = mk.color || '#c93c1d';
      // Coordinate normalization: support both ratio (0..1) and absolute pixel coords
      const xR = mk.x > 1 ? mk.x / natW : mk.x;
      const yR = mk.y > 1 ? mk.y / natH : mk.y;
      const px = offX + xR * showW;
      const py = offY + yR * showH;
      dot.style.left = px + 'px';
      dot.style.top = py + 'px';
      dot.title = (mk.label || mk.serial || ('Dot ' + (i + 1)));
      overlay.appendChild(dot);
    });
  }

  // Fit the canvas to the viewport (contain), centered
  function fitCanvasToViewport(vp, canvas) {
    const natW = canvas.width;
    const natH = canvas.height;
    if (!natW || !natH) return;
    const vpW = vp.offsetWidth - 4;
    const vpH = vp.offsetHeight - 4;
    if (vpW <= 0 || vpH <= 0) return;
    const scale = Math.min(vpW / natW, vpH / natH);
    const showW = natW * scale;
    const showH = natH * scale;
    const offX = (vp.offsetWidth - showW) / 2;
    const offY = (vp.offsetHeight - showH) / 2;
    canvas.style.width = showW + 'px';
    canvas.style.height = showH + 'px';
    canvas.style.left = offX + 'px';
    canvas.style.top = offY + 'px';
    canvas.style.position = 'absolute';
  }

  // Watch for the floor plan section being added/changed
  function attach() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(attach, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(decorate, 250);
    }).observe(main, { childList: true, subtree: true });
  }
  attach();
  setTimeout(decorate, 1500);
  setTimeout(decorate, 3000);

  // Periodic refresh in case markers are added live (user clicks on map)
  setInterval(() => {
    const section = document.getElementById('co-fp-section');
    if (section) decorate();
  }, 1500);

  // Re-fit on resize
  window.addEventListener('resize', () => setTimeout(decorate, 100));

  console.log('[floorplan-banner] installed — banner-style teikning + visible markers');
})();
/* === END FLOORPLAN BANNER v1 === */
