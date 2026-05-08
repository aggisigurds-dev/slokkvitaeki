/* === KREDITFÆRA EFTIR NÚMERI v2 ===
 *
 * Kreditfærsla er algeng aðgerð hjá Slökkvitæki ehf, því þarf hún að vera
 * augljóslega aðgengileg úr öllum hornum kerfisins. Þessi patch:
 *
 *   1. Bætir "↩ Kreditreikningur" í hliðarvalmynd (vnav-btn) → alltaf sýnilegur
 *   2. Setur flot-takka (FAB) niðri hægra megin → einn smellur opnar lookup
 *   3. Bætir "↩ Kreditfæra reikning" í haus á Reikningar modal og Bókhaldsyfirliti
 *   4. Bætir "↩ Kreditfæra" í Sala-toolbar (við hliðina á klukkunni)
 *   5. Útsetur kreditFaera('R-000026') console-helper sem síðasta bjargráð
 *
 * Allar opnunarleiðir ræsa sömu lookup dialog → opnar staðal patch 26 dialog.
 * Ef kreditfærslukerfið (patch 26) er ekki hlaðið er notandi látinn vita.
 */
(() => {
  if (window.__creditByNumInstalled) return;
  window.__creditByNumInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function normalizeNum(raw) {
    let s = String(raw || '').trim().toUpperCase();
    s = s.replace(/^R-?/, '');
    if (!/^\d+$/.test(s)) return null;
    return 'R-' + s.padStart(6, '0');
  }

  // ── Sækja sölu og opna kreditdialog (frá patch 26) ─────────────────────────
  async function openCreditByNum(rawNum) {
    const num = normalizeNum(rawNum);
    if (!num) {
      alert('Ógilt reikningsnúmer. Notaðu form eins og R-000026 eða 26.');
      return;
    }
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }

    const { data, error } = await SB
      .from('solur')
      .select('id,num,customer_nafn,customer_id,samtals,greitt_med,linur,upphaed_an_vsk,vsk_upphaed,is_credit,credit_of,created_at')
      .eq('num', num)
      .single();

    if (error || !data) {
      alert('Reikningur ' + num + ' fannst ekki.\n\n' +
            (error ? 'Villa: ' + error.message : 'Athugaðu að númerið sé rétt skrifað.'));
      return;
    }

    if (data.is_credit) {
      alert('Reikningur ' + num + ' er nú þegar kreditfærsla og er ekki hægt að kreditfæra aftur.');
      return;
    }

    const { data: existingCredits } = await SB
      .from('solur')
      .select('id,num')
      .eq('credit_of', data.id);
    if (existingCredits && existingCredits.length) {
      const proceed = confirm('Reikningur ' + num + ' var áður kreditfærður (' +
        existingCredits.map(c => c.num).join(', ') +
        ').\n\nViltu samt halda áfram með nýja kreditfærslu?');
      if (!proceed) return;
    }

    const sale = {
      id: data.id,
      num: data.num,
      customer: data.customer_nafn || '',
      customer_id: data.customer_id,
      total: +(data.samtals || 0),
      ex: +(data.upphaed_an_vsk || 0),
      vsk: +(data.vsk_upphaed || 0),
      lines: Array.isArray(data.linur) ? data.linur : [],
      payment: data.greitt_med
    };

    if (window.CreditInvoice && window.CreditInvoice.open) {
      window.CreditInvoice.open(sale);
    } else {
      alert('Kreditfærslukerfi (patch 26) ekki hlaðið. Endurræstu síðuna.');
    }
  }

  // ── Lookup dialog ──────────────────────────────────────────────────────────
  function openLookupDialog() {
    let dlg = document.getElementById('cbn-dialog');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = 'cbn-dialog';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100015;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.3);width:min(440px,calc(100vw - 24px));overflow:hidden">' +
        '<div style="padding:16px 20px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#fff7ed,#fff);display:flex;justify-content:space-between;align-items:center">' +
          '<h3 style="margin:0;font-size:17px;font-weight:700;color:#9a3412">↩ Kreditfæra reikning</h3>' +
          '<button id="cbn-x" type="button" style="background:none;border:none;font-size:20px;color:#94a3b8;cursor:pointer;padding:2px 8px;border-radius:6px">✕</button>' +
        '</div>' +
        '<div style="padding:20px">' +
          '<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Reikningsnúmer</label>' +
          '<input id="cbn-num" type="text" placeholder="R-000026" autocomplete="off" ' +
            'style="width:100%;padding:11px 14px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:16px;font-family:monospace;font-weight:700;letter-spacing:0.05em;box-sizing:border-box">' +
          '<p style="margin:10px 0 0;font-size:12px;color:#64748b;line-height:1.4">Þú getur slegið inn fullt númer (<code>R-000026</code>) eða bara númerið sjálft (<code>26</code>).</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 20px;border-top:1px solid #e2e8f0">' +
          '<button id="cbn-cancel" type="button" style="padding:9px 18px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
          '<button id="cbn-go" type="button" style="padding:9px 18px;background:#c2410c;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">Halda áfram →</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    const input = dlg.querySelector('#cbn-num');
    setTimeout(() => input.focus(), 50);
    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#cbn-x').addEventListener('click', close);
    dlg.querySelector('#cbn-cancel').addEventListener('click', close);
    async function go() {
      const v = input.value.trim();
      if (!v) { input.focus(); return; }
      close();
      await openCreditByNum(v);
    }
    dlg.querySelector('#cbn-go').addEventListener('click', go);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); go(); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
  }

  // Make accessible from other patches and console
  window.openKreditLookup = openLookupDialog;
  window.kreditFaera = openCreditByNum;
  window.CreditByNum = { open: openLookupDialog, openByNum: openCreditByNum };

  // ── 1. Sidebar nav button ──────────────────────────────────────────────────
  function injectIntoSidebar() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) return false;
    if (nav.querySelector('._cbn-nav-btn')) return true;
    // Find the Reikningar button to clone its styling and place ours right after
    const allBtns = Array.from(nav.querySelectorAll('.vnav-btn'));
    const reikBtn = allBtns.find(b => /reikning/i.test(b.textContent || ''));
    const tplBtn = reikBtn || allBtns[0];
    if (!tplBtn) return false;
    const btn = document.createElement('button');
    btn.className = (tplBtn.className || 'vnav-btn') + ' _cbn-nav-btn';
    btn.type = 'button';
    btn.innerHTML = '<span style="margin-right:6px">↩</span>Kreditreikningur';
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openLookupDialog();
    });
    if (reikBtn && reikBtn.parentNode) {
      reikBtn.parentNode.insertBefore(btn, reikBtn.nextSibling);
    } else {
      nav.appendChild(btn);
    }
    return true;
  }

  // ── 2. Floating action button (FAB) ────────────────────────────────────────
  // 2026-05-08: Disabled per user request. FAB tók of mikið pláss í neðra
  // hægra horni (alltaf sýnilegur). Kreditfæra-takkinn er ennþá tiltækur:
  //   • Sem nav-takki (sjá injectIntoNav)
  //   • Í Reikningar-modal (sjá injectIntoReikModal)
  //   • Í Bókhaldsyfirliti (sjá injectIntoBokhald)
  //   • Á hverri sölulínu (sjá patch 26 — "↩ Kredit" í síðasta dálki)
  function injectFAB() {
    // Remove any FAB that might have been injected by older versions
    const existing = document.getElementById('cbn-fab');
    if (existing) existing.remove();
    const style = document.getElementById('cbn-fab-style');
    if (style) style.remove();
  }

  // ── 3. Reikningar modal header button ──────────────────────────────────────
  function injectIntoReikModal() {
    const modal = document.getElementById('reik-master-modal');
    if (!modal) return;
    if (modal.querySelector('._cbn-btn')) return;
    const header = modal.querySelector('h2');
    if (!header) return;
    const btn = document.createElement('button');
    btn.className = '_cbn-btn';
    btn.type = 'button';
    btn.textContent = '↩ Kreditfæra reikning';
    btn.style.cssText = 'margin-left:10px;padding:7px 12px;border:1px solid #c2410c;border-radius:8px;background:#9a3412;color:#fff;cursor:pointer;font-size:13px;font-weight:600';
    btn.addEventListener('click', openLookupDialog);
    header.insertAdjacentElement('afterend', btn);
  }

  // ── 4. Bókhaldsyfirlit toolbar button ──────────────────────────────────────
  function injectIntoBokhald() {
    const view = document.getElementById('view-bokhald-yfirlit') || document.getElementById('view-bokhald');
    if (!view) return;
    if (view.querySelector('._cbn-btn')) return;
    const toolbar = view.querySelector('.by-toolbar') || view.querySelector('div[class*="toolbar"]') || view.querySelector('h1, h2');
    if (!toolbar) return;
    const btn = document.createElement('button');
    btn.className = '_cbn-btn';
    btn.type = 'button';
    btn.textContent = '↩ Kreditfæra reikning';
    btn.style.cssText = 'margin-left:8px;padding:7px 12px;border:1px solid #c2410c;border-radius:8px;background:#9a3412;color:#fff;cursor:pointer;font-size:13px;font-weight:600';
    btn.addEventListener('click', openLookupDialog);
    toolbar.appendChild(btn);
  }

  // ── Watchers ───────────────────────────────────────────────────────────────
  // Reikningar modal opens on demand — light poll for it.
  function setupReikModalWatcher() {
    setInterval(() => {
      const modal = document.getElementById('reik-master-modal');
      if (modal && !modal.querySelector('._cbn-btn')) injectIntoReikModal();
    }, 600);
  }

  // Sidebar may be re-rendered by patch 68. Re-inject after each reorder pass.
  function setupSidebarWatcher() {
    // Hook into each known reorder event (DOMContentLoaded + scheduled passes).
    // Simplest: poll every 1.5s and re-add if the button has been wiped.
    setInterval(() => {
      const nav = document.querySelector('nav.view-nav, .view-nav');
      if (nav && !nav.querySelector('._cbn-nav-btn')) injectIntoSidebar();
    }, 1500);
  }

  // First-paint passes for sidebar + bokhald
  function tryAll() {
    injectIntoSidebar();
    injectFAB();
    injectIntoBokhald();
    injectIntoReikModal();
  }
  setTimeout(tryAll, 500);
  setTimeout(tryAll, 1500);
  setTimeout(tryAll, 3500);
  document.addEventListener('view-shown', e => {
    if (e && e.detail && /bokhald/i.test(e.detail.name || '')) {
      setTimeout(injectIntoBokhald, 200);
    }
  });
  setupReikModalWatcher();
  setupSidebarWatcher();

  console.log('[credit-by-num] v2 installed — sidebar + FAB + modal injections active');
})();
/* === END KREDITFÆRA EFTIR NÚMERI v2 === */
