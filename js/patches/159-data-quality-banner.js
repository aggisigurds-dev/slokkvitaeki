/* === DATA QUALITY BANNER v1 ===
 *
 * Surfaces "needs attention" customers on the Fyrirtæki í Þjónustu and
 * Allir Viðskiptavinir pages so they don't get lost. Built 2026-05-18.
 *
 * Specifically: contract customers (ársskoðun OR brunakerfi) that have
 * NO address field — they can never appear on the map and the driver
 * has no idea where to go. The user knew there were a handful (8 at
 * audit time) but had no surface to find them quickly.
 *
 * UX: a small amber banner above the customer list, dismissable via
 * localStorage flag (per-browser session — not "forever", because the
 * count may change as new customers are imported).
 *
 * Click → opens a small modal listing the affected customers with a
 * "Opna" button per row that jumps to their detail page so the user
 * can add an address.
 */
(() => {
  if (window.__dataQualityBannerInstalled) return;
  window.__dataQualityBannerInstalled = true;

  const DISMISS_KEY = '_dq_banner_dismissed_today';

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
  }

  function isDismissedToday() {
    const v = localStorage.getItem(DISMISS_KEY);
    if (!v) return false;
    const today = new Date().toISOString().slice(0,10);
    return v === today;
  }
  function dismissForToday() {
    const today = new Date().toISOString().slice(0,10);
    localStorage.setItem(DISMISS_KEY, today);
  }

  function getMissingAddrContracts() {
    const cos = (window.Companies && Companies.list) || [];
    const arsMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('arsskodun_customers')) || {};
    const bruMap = (window.AppSettings && window.AppSettings.path && window.AppSettings.path('brunakerfi_customers')) || {};
    return cos.filter(c => {
      const ars = arsMap[String(c.id)];
      const bru = bruMap[String(c.id)];
      const isContract = (ars && ars.equipment) || !!bru;
      if (!isContract) return false;
      return !c.heimilisfang || !c.heimilisfang.trim();
    });
  }

  function injectBannerInto(parentSelector) {
    const parent = document.querySelector(parentSelector);
    if (!parent) return false;
    if (parent.querySelector('._dq-banner')) return true; // already there
    if (isDismissedToday()) return true;
    const missing = getMissingAddrContracts();
    if (!missing.length) return true;
    const banner = document.createElement('div');
    banner.className = '_dq-banner';
    banner.style.cssText = 'background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:10px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap';
    banner.innerHTML =
      '<div style="font-size:12.5px;color:#92400e">' +
      '⚠️ <strong>' + missing.length + ' samningshafar</strong> eru með <strong>ekkert heimilisfang skráð</strong> — koma ekki fram á korti. ' +
      '<button class="_dq-show" type="button" style="background:none;border:none;color:#b45309;text-decoration:underline;cursor:pointer;font:inherit;font-size:12.5px;font-weight:700;padding:0;margin-left:4px">Skoða lista →</button>' +
      '</div>' +
      '<button class="_dq-dismiss" type="button" title="Loka fyrir daginn" style="background:#fff;border:1px solid #fde68a;color:#92400e;border-radius:6px;padding:3px 8px;cursor:pointer;font:inherit;font-size:11px;font-weight:600">✕ Í dag</button>';
    parent.insertBefore(banner, parent.firstChild);
    banner.querySelector('._dq-show').addEventListener('click', openModal);
    banner.querySelector('._dq-dismiss').addEventListener('click', () => {
      dismissForToday();
      banner.remove();
    });
    return true;
  }

  function openModal() {
    const missing = getMissingAddrContracts();
    if (!missing.length) return;
    const back = document.createElement('div');
    back.id = '_dq-modal-back';
    back.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    back.innerHTML = `
      <div style="background:#fff;border-radius:14px;max-width:680px;width:100%;max-height:80vh;overflow:auto;padding:18px 22px;box-shadow:0 20px 50px rgba(0,0,0,0.3)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:10px">
          <h2 style="margin:0;font-size:17px;color:#0f172a;display:flex;align-items:center;gap:8px">
            ⚠️ Samningshafar án heimilisfangs
            <span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:2px 8px;border-radius:99px;border:1px solid #fde68a">${missing.length}</span>
          </h2>
          <button class="_dq-close" type="button" style="background:none;border:none;cursor:pointer;font-size:22px;color:#64748b;line-height:1">×</button>
        </div>
        <div style="font-size:12px;color:#64748b;margin-bottom:14px">Þessir samningshafar koma ekki fram á korti vegna þess að ekkert heimilisfang er skráð. Smelltu "Opna" til að bæta við.</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${missing.map(c => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
              <div style="min-width:0;flex:1">
                <div style="font-weight:700;color:#0f172a;font-size:13px">${esc(c.nafn)}</div>
                <div style="font-size:10.5px;color:#94a3b8;font-family:monospace">kt. ${esc(c.kennitala || '—')}</div>
              </div>
              <button class="_dq-open" data-co-id="${c.id}" type="button" style="padding:5px 11px;background:#0f172a;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:11.5px;font-weight:700">Opna →</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(back);
    back.addEventListener('click', e => { if (e.target === back) back.remove(); });
    back.querySelector('._dq-close').addEventListener('click', () => back.remove());
    back.querySelectorAll('._dq-open').forEach(b => b.addEventListener('click', () => {
      const id = +b.dataset.coId;
      back.remove();
      // Use VidskDetail if available — that's where the user can see the
      // customer and either edit on the platform or jump to Fyrirtækjaþjónustu.
      if (window.VidskDetail && typeof window.VidskDetail.show === 'function') {
        window.VidskDetail.show(id);
      } else if (window._openCompanySafe) {
        window._openCompanySafe(id);
      }
    }));
  }

  // Inject the banner whenever the user navigates to Ársskoðun or Allir
  // Viðskiptavinir. The pages render dynamically (no static DOM hook), so
  // a MutationObserver is overkill; we just hook view changes via patch
  // 154's wrap (which we know exists) OR a simple polling fallback.
  function tryInject() {
    const active = document.querySelector('.view.active');
    if (!active) return;
    if (active.id === 'view-arsskodun') {
      // Find the ars-main panel and inject above the content area
      const main = document.getElementById('ars-main');
      if (main) {
        // Find the first inner container — banner goes above filter chips
        const firstChild = main.querySelector(':scope > div');
        if (firstChild) injectBannerInto('#ars-main > div');
      }
    } else if (active.id === 'view-allir-vidsk') {
      const main = document.getElementById('_av-main');
      if (main) {
        const firstChild = main.querySelector(':scope > div');
        if (firstChild) injectBannerInto('#_av-main > div');
      }
    }
  }

  // Poll every second — cheap, and survives the patch 153/157 re-renders.
  setInterval(tryInject, 1000);

  console.log('[data-quality-banner v1] installed');
})();
/* === END DATA QUALITY BANNER === */
