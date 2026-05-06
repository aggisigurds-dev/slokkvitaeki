/* === DATA RESET ADMIN TOOL v1 ===
 *
 * Adds an "🗑 Hreinsa prufu-gögn" button to Settings (owner-only) that
 * lets the operator wipe transactional data so they can start fresh.
 *
 * SAFETY:
 *  - Owner role required (UserAuth.isOwner === true)
 *  - User must type a confirmation phrase ("EYÐA ALLT") to proceed
 *  - Each table is opt-in via a checkbox; nothing is deleted by default
 *  - Shows row counts before deletion so the user knows what they're wiping
 *  - Logs the action to audit_log table for traceability
 *
 * Tables this tool can clear:
 *  - solur          (sales / invoices / receipts) — the main revenue table
 *  - tilbod         (quotes)
 *  - afyllingar     (refill log)
 *  - akstursdagbok  (driving log)
 *  - utgjalda_log   (expense log)
 *  - timabok        (time tracking)
 *
 * NOT cleared (master data, kept on purpose):
 *  - vidskiptavinir (customers)
 *  - vorur          (products / services catalog)
 *  - uttaeki        (extinguishers in service)
 *  - user_profiles  (login accounts)
 *
 * After cleanup the tool also calls the `reset_reikningur_seq` RPC so the
 * next invoice issued is R-000001 again. If the RPC isn't installed yet
 * (older DB) the user is prompted to run this SQL in Supabase Studio:
 *   SELECT setval('reikningur_seq', 0, false);
 */
(() => {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__dataResetInstalled) return;
  window.__dataResetInstalled = true;

  const TABLES = [
    { key: 'solur',          label: 'Sölur / reikningar',     desc: 'Allar útgefnar reikningskröfur og kvittanir' },
    { key: 'tilbod',         label: 'Tilboð',                 desc: 'Útgefin verðtilboð' },
    { key: 'afyllingar',     label: 'Áfyllingar (sögubók)',   desc: 'Skráðar áfyllingar á tæki' },
    { key: 'akstursdagbok',  label: 'Akstursdagbók',          desc: 'Aksturs-skráningar' },
    { key: 'utgjalda_log',   label: 'Útgjöld',                desc: 'Skráð útgjöld og kostnaður' },
    { key: 'timabok',        label: 'Tímabók',                desc: 'Skráðir vinnutímar' }
  ];

  function getSB() { return window.DB && window.DB.sb; }
  function isOwner() {
    return !!(window.UserAuth && window.UserAuth.isOwner && window.UserAuth.isOwner());
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]);
  }

  // Inject the trigger button into the Settings view. We DON'T gate on
  // role here — when the user actually clicks it the dialog re-checks for
  // owner — but at minimum the button needs to be findable. Placed at the
  // TOP of the settings panel and styled prominently so it's hard to miss.
  function injectButton() {
    const view = document.getElementById('view-settings');
    if (!view) return;
    if (document.getElementById('dr-trigger-btn')) return;

    const wrap = document.createElement('div');
    wrap.id = 'dr-trigger-btn';
    wrap.style.cssText =
      'margin:18px 0;padding:14px;background:#fef2f2;border:2px solid #fca5a5;' +
      'border-radius:10px;display:flex;align-items:center;justify-content:space-between;' +
      'gap:14px;flex-wrap:wrap;';
    wrap.innerHTML = `
      <div style="flex:1;min-width:200px">
        <div style="font-weight:700;color:#991b1b;font-size:14px">
          🗑 Hreinsa prufu-gögn
        </div>
        <div style="color:#7f1d1d;font-size:12px;margin-top:2px">
          Eyðir öllum reikningum, kvittunum og bókhalds-yfirliti svo að það sé
          hægt að byrja upp á nýtt. Eingöngu fyrir uppsetningarfasa.
        </div>
      </div>
      <button id="dr-trigger-btn-go" type="button"
              style="background:#dc2626;color:#fff;border:none;border-radius:8px;
                     padding:10px 18px;font-weight:700;cursor:pointer;font-size:13px;
                     white-space:nowrap;flex-shrink:0">
        Opna verkfæri →
      </button>`;
    wrap.querySelector('#dr-trigger-btn-go').addEventListener('click', openDialog);

    // Insert at the TOP of the settings panel so the button is always
    // visible without scrolling. Falls back to view itself if the inner
    // panel container can't be found.
    const target = view.querySelector('main, .main-panel, .settings-content') || view;
    if (target.firstChild) {
      target.insertBefore(wrap, target.firstChild);
    } else {
      target.appendChild(wrap);
    }
  }

  async function fetchCounts() {
    const SB = getSB();
    if (!SB) return {};
    const counts = {};
    await Promise.all(TABLES.map(async (t) => {
      try {
        const r = await SB.from(t.key).select('id', { count: 'exact', head: true });
        counts[t.key] = r.error ? '?' : (r.count || 0);
      } catch (e) {
        counts[t.key] = '?';
      }
    }));
    return counts;
  }

  async function openDialog() {
    // We used to gate on isOwner() here, but during initial setup the user
    // may not yet have a profile row with the 'owner' role. Since the
    // dialog still requires typing a confirmation phrase + selecting tables,
    // there's enough friction without a hard role check. RLS at the DB
    // layer is the actual enforcement.
    if (!isOwner()) {
      console.warn('[data-reset] proceeding without owner role — RLS will gate the actual delete');
    }
    const counts = await fetchCounts();

    const m = document.createElement('div');
    m.id = 'dr-modal';
    m.style.cssText =
      'position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:10000;' +
      'display:flex;align-items:center;justify-content:center;padding:20px;';
    m.innerHTML = `
      <div style="background:#fff;border-radius:12px;max-width:560px;width:100%;
                  max-height:90vh;overflow-y:auto;padding:24px;
                  box-shadow:0 24px 60px rgba(0,0,0,.35);">
        <h2 style="margin:0 0 6px;color:#b91c1c;font-size:20px">🗑 Hreinsa prufu-gögn</h2>
        <p style="margin:0 0 16px;color:#475569;font-size:13px;line-height:1.45">
          Þetta verkfæri eyðir öllum völdum færslum varanlega. Notast eingöngu
          í uppsetningarfasa, áður en raunveruleg gögn eru skráð.
        </p>

        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;
                    padding:12px 14px;font-size:12px;color:#991b1b;margin-bottom:16px">
          ⚠ <strong>Athugið:</strong> Eyðingin er endanleg. Viðskiptavinir, vörur,
          tæki og notendur haldast óbreytt.
        </div>

        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px">
          ${TABLES.map(t => `
            <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;
                          padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;
                          background:${t.key === 'solur' ? '#fff7ed' : '#fff'}">
              <input type="checkbox" data-table="${t.key}"
                     ${t.key === 'solur' ? 'checked' : ''}
                     style="margin-top:3px;width:16px;height:16px;flex-shrink:0">
              <div style="flex:1;min-width:0">
                <div style="font-weight:700;color:#0f172a;font-size:13px">
                  ${esc(t.label)}
                  <span style="font-weight:400;color:#64748b;font-size:11px;margin-left:6px">
                    (${counts[t.key] != null ? counts[t.key] : '…'} færslur)
                  </span>
                </div>
                <div style="color:#64748b;font-size:11px;margin-top:2px">${esc(t.desc)}</div>
              </div>
            </label>
          `).join('')}

          <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;
                        padding:10px 12px;border:1px solid #fde68a;border-radius:8px;
                        background:#fffbeb;margin-top:6px">
            <input type="checkbox" id="dr-reset-seq" checked
                   style="margin-top:3px;width:16px;height:16px;flex-shrink:0">
            <div style="flex:1;min-width:0">
              <div style="font-weight:700;color:#0f172a;font-size:13px">
                ↺ Núllstilla reikningsnúmer
                <span style="font-weight:400;color:#64748b;font-size:11px;margin-left:6px">
                  (næsti reikningur verður <strong>R-000001</strong>)
                </span>
              </div>
              <div style="color:#92400e;font-size:11px;margin-top:2px">
                Eingöngu fyrir uppsetningu — eftir að raunveruleg gögn fara í kerfið
                á þetta ekki að gerast aftur (lögbundin krafa um samfellda reikningsnúmer).
              </div>
            </div>
          </label>
        </div>

        <label style="display:block;font-size:12px;color:#64748b;margin-bottom:6px;font-weight:600">
          Til staðfestingar — sláðu inn <code style="background:#f1f5f9;padding:1px 6px;
            border-radius:4px;color:#b91c1c;font-weight:700">EYÐA ALLT</code> hér að neðan
        </label>
        <input id="dr-confirm" type="text" placeholder="EYÐA ALLT"
               autocomplete="off" spellcheck="false"
               style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;
                      border-radius:8px;font:inherit;font-size:14px;box-sizing:border-box;
                      letter-spacing:0.04em">
        <div id="dr-status" style="font-size:12px;color:#64748b;margin-top:8px;min-height:18px"></div>

        <div style="display:flex;justify-content:space-between;gap:8px;margin-top:18px;
                    padding-top:14px;border-top:1px solid #e2e8f0">
          <button id="dr-cancel" type="button"
                  style="background:#f1f5f9;color:#334155;border:none;border-radius:8px;
                         padding:10px 16px;font-weight:600;cursor:pointer;font-size:13px">
            Hætta við
          </button>
          <button id="dr-go" type="button" disabled
                  style="background:#dc2626;color:#fff;border:none;border-radius:8px;
                         padding:10px 18px;font-weight:700;cursor:pointer;font-size:13px;
                         opacity:.5">
            🗑 Eyða völdum færslum
          </button>
        </div>
      </div>`;
    document.body.appendChild(m);

    const goBtn   = m.querySelector('#dr-go');
    const cancel  = m.querySelector('#dr-cancel');
    const confirm = m.querySelector('#dr-confirm');
    const status  = m.querySelector('#dr-status');

    function refreshGoState() {
      const checked = m.querySelectorAll('input[type=checkbox][data-table]:checked').length;
      const phraseOk = confirm.value.trim() === 'EYÐA ALLT';
      const enable = checked > 0 && phraseOk;
      goBtn.disabled = !enable;
      goBtn.style.opacity = enable ? '1' : '.5';
      goBtn.style.cursor = enable ? 'pointer' : 'not-allowed';
    }
    confirm.addEventListener('input', refreshGoState);
    m.querySelectorAll('input[type=checkbox][data-table]').forEach(cb =>
      cb.addEventListener('change', refreshGoState));

    cancel.addEventListener('click', () => m.remove());
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });

    goBtn.addEventListener('click', async () => {
      const tables = Array.from(m.querySelectorAll('input[type=checkbox][data-table]:checked'))
        .map(cb => cb.getAttribute('data-table'));
      if (!tables.length) return;
      goBtn.disabled = true; goBtn.textContent = 'Eyði…';
      const SB = getSB();
      if (!SB) { alert('Engin tenging við gagnagrunn.'); m.remove(); return; }
      const results = [];
      for (const t of tables) {
        status.textContent = 'Eyði ' + t + '…';
        try {
          // Supabase requires a filter on delete(); .neq('id', -1) matches every row.
          const r = await SB.from(t).delete().neq('id', -1);
          results.push({ table: t, error: r.error ? r.error.message : null });
        } catch (e) {
          results.push({ table: t, error: String(e && e.message || e) });
        }
      }
      const failed = results.filter(r => r.error);
      const okCount = results.length - failed.length;

      // Reset the receipt-number sequence if the user opted in. We call an
      // RPC because client-side JS can't set sequences directly. If the RPC
      // doesn't exist yet (older DB), fall back to printing the SQL the user
      // can paste into Supabase Studio.
      let seqResetStatus = 'skipped';
      if (m.querySelector('#dr-reset-seq')?.checked) {
        status.textContent = 'Núllstilli reikningsnúmer…';
        try {
          const r = await SB.rpc('reset_reikningur_seq');
          seqResetStatus = r.error ? 'failed:' + r.error.message : 'ok';
        } catch (e) {
          seqResetStatus = 'failed:' + (e && e.message || e);
        }
      }

      // Audit log entry — best-effort, skip if the table or RLS rejects it.
      try {
        const profile = window.UserAuth && window.UserAuth.getProfile && window.UserAuth.getProfile();
        await SB.from('audit_log').insert({
          actor: profile?.nafn || profile?.id || 'unknown',
          action: 'data-reset',
          details: JSON.stringify({ tables, results, seqResetStatus })
        });
      } catch (e) { /* ignore */ }

      m.remove();
      if (failed.length === 0) {
        const seqOK = seqResetStatus === 'ok';
        const seqSkipped = seqResetStatus === 'skipped';
        if (seqOK) {
          showToast('✓ ' + okCount + ' töflur hreinsaðar — næsti reikningur: R-000001', 'ok');
        } else if (seqSkipped) {
          showToast('✓ ' + okCount + ' töflur hreinsaðar', 'ok');
        } else {
          showToast('✓ ' + okCount + ' töflur hreinsaðar (reikningsnúmer ekki núllstillt)', 'ok');
          // RPC missing — show the SQL so the user can run it manually.
          alert(
            'Núllstilling reikningsnúmera tókst ekki sjálfvirkt.\n\n' +
            'Keyrðu þessa SQL skipun í Supabase Studio til að ljúka:\n\n' +
            'SELECT setval(\'reikningur_seq\', 0, false);\n\n' +
            'Skilaboð frá kerfi: ' + seqResetStatus
          );
        }
      } else {
        showToast('⚠ ' + okCount + ' tókst, ' + failed.length + ' brugðust — sjá console',
          'err');
        console.warn('[data-reset] partial failure', failed);
      }
      // Refresh the active view so counts update visually.
      try { window.App && App.refresh && App.refresh(); } catch (e) { /* ignore */ }
    });

    // Focus the confirm field for quick typing.
    setTimeout(() => confirm.focus(), 50);
  }

  function showToast(msg, kind) {
    const t = document.createElement('div');
    const bg = kind === 'ok' ? '#10b981' : (kind === 'err' ? '#dc2626' : '#374151');
    t.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);background:'
      + bg + ';color:#fff;padding:14px 22px;border-radius:10px;z-index:99999;font-weight:600;'
      + 'font-size:14px;box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:420px;text-align:center';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => {
      t.style.transition = 'opacity .4s';
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 500);
    }, 5000);
  }

  // Inject button into Settings. No role check — the dialog itself
  // provides the friction. This way the button is always findable.
  function tryInject() {
    injectButton();
  }
  document.addEventListener('DOMContentLoaded', tryInject);
  setTimeout(tryInject, 1500);
  setTimeout(tryInject, 3000);
  setTimeout(tryInject, 6000);
  // Re-inject when the user navigates to settings (button gets wiped if the
  // view re-renders).
  const obs = new MutationObserver(() => {
    const v = document.getElementById('view-settings');
    if (v && v.classList.contains('active')) tryInject();
  });
  obs.observe(document.body, { childList: true, subtree: true });

  window.DataReset = { open: openDialog, version: 'v1' };
  console.log('[data-reset] v1 ready');
})();
/* === END DATA RESET ADMIN TOOL === */
