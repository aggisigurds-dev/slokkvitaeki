/* Stækkunargler á vörur/þjónustur á Sölusíðu — popup með myndum og lýsingu.
 *
 * Bætir litlu 🔍 takka í efra-vinstra horn á hverjum tile í #pos-services
 * og #pos-products (sem og í aux-vörur gridinu frá patch 80). Þegar smellt
 * — opnast popup sem sýnir:
 *   • Stærri mynd
 *   • Heiti
 *   • Verð m/VSK + án VSK
 *   • Flokkur
 *   • Lysing (lýsing) ef til staðar
 *   • Birgðastaða (vörur) eða VSK% (þjónustur)
 *
 * Smelltu utan popup eða X til að loka.
 *
 * Smellur á stækkunarglerinn fer EKKI í gegnum tile-smell — varið með
 * stopPropagation svo varan fer ekki í körfu.
 */
(() => {
  if (window.__productInfoPopupInstalled) return;
  window.__productInfoPopupInstalled = true;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtKr(n) {
    return Math.round(Number(n) || 0).toLocaleString('is-IS') + ' kr';
  }

  const ICON_HTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px">' +
      '<circle cx="11" cy="11" r="7"/>' +
      '<line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
    '</svg>';

  async function fetchProduct(id) {
    const sb = window.DB && window.DB.sb;
    if (!sb) return null;
    const { data, error } = await sb.from('vorur')
      .select('id,nafn,flokkur,mynd,verd_an_vsk,vsk_prosenta,birgdir,lysing,virkt')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  }

  function openPopup(product) {
    closePopup();
    const incVat = (+product.verd_an_vsk || 0) * (1 + (+product.vsk_prosenta || 24) / 100);
    const isService = String(product.flokkur || '').toLowerCase().includes('þjón');
    const imgHtml = product.mynd
      ? '<img src="' + esc(product.mynd) + '" style="display:block;width:100%;max-height:340px;object-fit:contain;background:#f8fafc;border-radius:10px" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'"><div style="display:none;width:100%;height:200px;background:#f1f5f9;border-radius:10px;align-items:center;justify-content:center;color:#94a3b8;font-size:48px">📦</div>'
      : '<div style="width:100%;height:200px;background:#f1f5f9;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:48px">' + (isService ? '🔧' : '📦') + '</div>';

    const overlay = document.createElement('div');
    overlay.id = '_pip-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML =
      '<div style="background:#fff;border-radius:16px;max-width:520px;width:100%;max-height:92vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.4)">' +
        '<div style="padding:14px 18px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;background:#f8fafc">' +
          '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em">' + esc(product.flokkur || (isService ? 'Þjónusta' : 'Vara')) + '</div>' +
          '<button id="_pip-close" type="button" style="background:none;border:none;font-size:24px;cursor:pointer;color:#64748b;line-height:1;padding:0 4px">×</button>' +
        '</div>' +
        '<div style="overflow-y:auto;padding:18px 22px">' +
          imgHtml +
          '<h2 style="margin:14px 0 6px;font-size:19px;color:#0f172a;line-height:1.3">' + esc(product.nafn) + '</h2>' +
          '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:12px">' +
            '<div style="font-size:24px;font-weight:800;color:#0f172a;font-variant-numeric:tabular-nums">' + fmtKr(incVat) + '</div>' +
            '<div style="font-size:12px;color:#94a3b8">' + fmtKr(product.verd_an_vsk) + ' án vsk · VSK ' + (product.vsk_prosenta || 24) + '%</div>' +
          '</div>' +
          (!isService && product.birgdir != null
            ? '<div style="margin-bottom:12px;padding:8px 12px;background:' + (product.birgdir > 0 ? '#dcfce7' : '#fee2e2') + ';color:' + (product.birgdir > 0 ? '#166534' : '#991b1b') + ';border-radius:8px;font-size:13px;font-weight:600;display:inline-block">' +
                '📦 Birgðir: ' + product.birgdir + (product.birgdir > 0 ? ' í geymslu' : ' — ekki á lager') +
              '</div>'
            : '') +
          (product.lysing
            ? '<div style="margin-top:14px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px"><div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Lýsing</div><div style="font-size:13px;color:#334155;line-height:1.55;white-space:pre-wrap">' + esc(product.lysing) + '</div></div>'
            : '<div style="margin-top:14px;color:#94a3b8;font-size:12px;font-style:italic">Engin lýsing skráð fyrir þessa ' + (isService ? 'þjónustu' : 'vöru') + '.</div>') +
        '</div>' +
        '<div style="padding:12px 18px;border-top:1px solid #e5e7eb;display:flex;gap:8px;justify-content:flex-end;background:#f8fafc">' +
          '<button id="_pip-add" type="button" style="background:#1a7f4b;color:#fff;border:none;padding:9px 18px;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px">🛒 Bæta í körfu</button>' +
          '<button id="_pip-ok" type="button" style="background:#f3f4f6;color:#374151;border:none;padding:9px 18px;border-radius:8px;cursor:pointer;font-size:14px">Loka</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => { if (e.target === overlay) closePopup(); });
    document.getElementById('_pip-close').onclick = closePopup;
    document.getElementById('_pip-ok').onclick = closePopup;
    document.getElementById('_pip-add').onclick = () => {
      const grid = isService ? document.getElementById('pos-services') : document.getElementById('pos-products');
      if (grid) {
        let tile = grid.querySelector('[data-id="' + product.id + '"]');
        if (!tile) {
          tile = document.createElement('button');
          tile.className = isService ? 'pos-svc' : 'pos-prod';
          tile.setAttribute('data-id', product.id);
          tile.style.display = 'none';
          grid.appendChild(tile);
          tile.click();
          setTimeout(() => tile.remove(), 100);
        } else {
          tile.click();
        }
      }
      closePopup();
      if (window.Toast && Toast.show) Toast.show('+ ' + product.nafn);
    };
    document.addEventListener('keydown', escClose);
  }

  function escClose(e) {
    if (e.key === 'Escape') closePopup();
  }

  function closePopup() {
    const ov = document.getElementById('_pip-overlay');
    if (ov) ov.remove();
    document.removeEventListener('keydown', escClose);
  }

  function injectButton(tile) {
    if (!tile || tile.dataset._pipInjected === '1') return;
    tile.dataset._pipInjected = '1';
    // The tile is itself a button; we add an absolutely positioned info icon
    // in the top-left corner (top-right is occupied by the stock-chip on
    // product tiles).
    const btn = document.createElement('span');
    btn.className = '_pip-btn';
    btn.title = 'Skoða upplýsingar';
    btn.setAttribute('role', 'button');
    btn.style.cssText = 'position:absolute;top:4px;left:4px;width:24px;height:24px;background:rgba(255,255,255,.92);border:1px solid #cbd5e1;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#475569;cursor:pointer;z-index:2;box-shadow:0 1px 2px rgba(0,0,0,.08);transition:all .15s';
    btn.innerHTML = ICON_HTML;
    btn.addEventListener('click', async e => {
      e.preventDefault();
      e.stopPropagation();
      const id = parseInt(tile.getAttribute('data-id'), 10);
      if (!id) return;
      btn.style.background = '#dbeafe';
      const product = await fetchProduct(id);
      btn.style.background = 'rgba(255,255,255,.92)';
      if (!product) {
        if (window.Toast && Toast.show) Toast.show('⚠ Vara fannst ekki');
        return;
      }
      openPopup(product);
    });
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#dbeafe';
      btn.style.color = '#1e40af';
      btn.style.borderColor = '#93c5fd';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(255,255,255,.92)';
      btn.style.color = '#475569';
      btn.style.borderColor = '#cbd5e1';
    });
    // pos.js sets position:relative implicitly via flex layout; ensure relative.
    if (getComputedStyle(tile).position === 'static') tile.style.position = 'relative';
    tile.appendChild(btn);
  }

  function injectAll() {
    document.querySelectorAll('.pos-prod, .pos-svc').forEach(injectButton);
  }

  function attach() {
    injectAll();
    new MutationObserver(muts => {
      for (const m of muts) {
        for (const n of m.addedNodes) {
          if (n.nodeType !== 1) continue;
          if (n.classList && (n.classList.contains('pos-prod') || n.classList.contains('pos-svc'))) {
            injectButton(n);
          } else if (n.querySelectorAll) {
            n.querySelectorAll('.pos-prod, .pos-svc').forEach(injectButton);
          }
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }

  console.log('[product-info-popup] installed');
})();
