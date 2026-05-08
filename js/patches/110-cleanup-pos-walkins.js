/* === CLEANUP POS WALK-INS v1 ===
 *
 * Vandamál: Áður (fyrir 2026-05-08 fix í pos.js) var Sala-checkout að
 * skrá kennitölu-staðgreidda viðskiptavini í `fyrirtaeki`-töfluna í
 * staðinn fyrir `vidskiptavinir`. Það endaði með því að rugla saman
 * Fyrirtækjaþjónustu (B2B þjónustusamningar) og venjulegri afgreiðslu.
 *
 * Þessi patch:
 *   1. Setur upp „Hreinsa POS-staðgreidda úr fyrirtækjaþjónustu" hnapp
 *      í Stillingar (eða gerir þetta sjálfvirkt fyrir admin) sem:
 *        a) Finnur allar fyrirtaeki-rúður þar sem nafn passar
 *           „Viðskiptavinur DDDDDD-DDDD" eða þar sem kennitala er einstök
 *           og engin tæki/verkbeiðnir tengd þessu fyrirtæki — flest svona
 *           rúður eru villandi POS auto-create.
 *        b) Færir þessar rúður yfir í `vidskiptavinir` (ef ekki nú þegar
 *           til með sömu kennitölu)
 *        c) Uppfærir solur.customer_id sem benti á fyrirtaeki rúðuna að
 *           benda á nýju viðskiptavina-rúðuna
 *        d) Eyðir gömlu fyrirtaeki-rúðunni
 *
 * Aðgangur: gera handvirkt í Console:
 *   await window.CleanupPosWalkins.run({ dryRun: true })   // sjá hverjar
 *   await window.CleanupPosWalkins.run({ dryRun: false })  // framkvæma
 *
 * Birtir líka takka „🧹 Hreinsa villandi viðskiptavini" í Stillingar →
 * Almennt þannig að notandi geti smellt einu sinni.
 */
(() => {
  if (window.__cleanupPosWalkinsInstalled) return;
  window.__cleanupPosWalkinsInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }

  // Identify rows in `fyrirtaeki` that look like POS walk-in entries:
  //  • nafn matches "Viðskiptavinur DDDDDD-DDDD" or just "Staðgreitt"
  //  • OR nafn equals the kennitala digits
  // (Removed unit-filter — even if they have a unit attached we want to
  // migrate them; the uttaeki.client gets retained but the customer-record
  // moves to the right table. User confirms each migration.)
  function looksLikeWalkin(co) {
    const n = String(co.nafn || '').trim();
    const kt = String(co.kennitala || '').replace(/[^0-9]/g, '');
    if (/^Vi[ðd]skiptavinur\s+\d{6}-?\d{4}/i.test(n)) return true;
    if (/^Vi[ðd]skiptavinur\s+\d/i.test(n)) return true;     // looser: any digits
    if (/^Sta[ðd]greitt$/i.test(n)) return true;
    if (n && kt && n === kt) return true;
    return false;
  }

  async function findCandidates() {
    const SB = getSB();
    if (!SB) return [];
    const { data: companies, error } = await SB.from('fyrirtaeki').select('id,nafn,kennitala,simi,heimilisfang,heimilisFang,athugasemdir');
    if (error) throw error;
    const candidates = (companies || []).filter(looksLikeWalkin);
    if (!candidates.length) return [];
    // Annotate candidates with unit count so the user can see what they're migrating.
    const names = candidates.map(c => c.nafn);
    const { data: units } = await SB.from('uttaeki').select('client').in('client', names);
    const countByName = {};
    (units || []).forEach(u => { if (u.client) countByName[u.client] = (countByName[u.client] || 0) + 1; });
    return candidates.map(c => ({ ...c, _unitCount: countByName[c.nafn] || 0 }));
  }

  async function migrate(opts) {
    opts = opts || {};
    const dryRun = !!opts.dryRun;
    const SB = getSB();
    if (!SB) return { error: 'no DB' };

    const candidates = await findCandidates();
    const results = { found: candidates.length, migrated: 0, skipped: 0, errors: [], dryRun };
    if (!candidates.length) return results;

    for (const co of candidates) {
      try {
        const cleanKt = String(co.kennitala || '').replace(/[^0-9]/g, '');
        let vidId = null;

        if (cleanKt && cleanKt.length === 10) {
          // Check if vidskiptavinur with this kennitala already exists
          const existing = await SB.from('vidskiptavinir').select('id').eq('kennitala', cleanKt).limit(1).maybeSingle();
          if (existing && existing.data && existing.data.id) {
            vidId = existing.data.id;
          }
        }

        if (!vidId && !dryRun) {
          // Create new vidskiptavinur
          const newRow = {
            nafn: co.nafn,
            kennitala: cleanKt || null,
            simi: co.simi || null,
            heimilisfang: co.heimilisfang || co.heimilisFang || null,
            athugasemdir: co.athugasemdir || null
          };
          const ins = await SB.from('vidskiptavinir').insert(newRow).select().single();
          if (ins.error) { results.errors.push({ co: co.id, err: ins.error.message }); continue; }
          vidId = ins.data.id;
        }

        if (!dryRun && vidId) {
          // Update solur.customer_id from old fyrirtaeki id → new vidskiptavinir id
          const sUpd = await SB.from('solur').update({ customer_id: vidId }).eq('customer_id', co.id);
          if (sUpd.error) results.errors.push({ co: co.id, step: 'solur', err: sUpd.error.message });

          // Delete the fyrirtaeki row
          const del = await SB.from('fyrirtaeki').delete().eq('id', co.id);
          if (del.error) results.errors.push({ co: co.id, step: 'delete', err: del.error.message });
          else results.migrated++;
        } else if (dryRun) {
          results.migrated++;
        }
      } catch (e) {
        results.errors.push({ co: co.id, err: e.message || String(e) });
      }
    }
    return results;
  }

  async function showCleanupDialog() {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }

    let dlg = document.getElementById('_cpw-dlg');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_cpw-dlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100090;background:rgba(15,23,42,0.65);display:flex;align-items:center;justify-content:center;padding:16px';

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,0.3);width:min(580px,calc(100vw - 24px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 22px;background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<h3 style="margin:0;font-size:17px;font-weight:700">🧹 Hreinsa villandi POS-skráningar</h3>' +
          '<button id="_cpw-x" type="button" style="background:transparent;border:1px solid #ef4444;color:#fff;font-size:20px;width:36px;height:36px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
        '<div style="padding:18px 22px;overflow:auto;flex:1">' +
          '<p style="margin:0 0 14px;font-size:13px;color:#475569;line-height:1.5">Skannar Fyrirtækjaþjónustu fyrir auto-skráðar staðgreidda viðskiptavini sem ættu réttilega að vera í <strong>Viðskiptavinir</strong>-töflunni.</p>' +
          '<div id="_cpw-result" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;font-size:13px;color:#475569;line-height:1.6">Smelltu á „Skanna" til að byrja…</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 22px;border-top:1px solid #e2e8f0;background:#f8fafc;flex-wrap:wrap">' +
          '<button id="_cpw-close" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Loka</button>' +
          '<button id="_cpw-scan" type="button" style="padding:9px 18px;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">🔍 Skanna</button>' +
          '<button id="_cpw-run" type="button" disabled style="padding:9px 18px;background:#dc2626;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:700;opacity:0.5">▶ Framkvæma flutning</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    const result = dlg.querySelector('#_cpw-result');
    const runBtn = dlg.querySelector('#_cpw-run');
    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_cpw-x').addEventListener('click', close);
    dlg.querySelector('#_cpw-close').addEventListener('click', close);

    let candidatesCache = [];

    dlg.querySelector('#_cpw-scan').addEventListener('click', async () => {
      result.innerHTML = '⏳ Skanna...';
      try {
        candidatesCache = await findCandidates();
        if (!candidatesCache.length) {
          result.innerHTML = '✅ Engar villandi POS-skráningar fundust í Fyrirtækjaþjónustu.';
          return;
        }
        const list = candidatesCache.map(c =>
          '<li style="padding:4px 0;border-bottom:1px solid #e2e8f0;font-size:12px;display:flex;justify-content:space-between;gap:8px;align-items:center">' +
            '<span><strong>' + esc(c.nafn) + '</strong> · kt. ' + esc(c.kennitala || '—') + (c.simi ? ' · ' + esc(c.simi) : '') + '</span>' +
            (c._unitCount ? '<span style="font-size:10px;font-weight:700;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:99px">' + c._unitCount + ' tæki</span>' : '') +
          '</li>'
        ).join('');
        result.innerHTML =
          '<div style="font-weight:700;color:#dc2626;margin-bottom:8px">Fundust ' + candidatesCache.length + ' villandi skráningar:</div>' +
          '<ul style="margin:0;padding:0;list-style:none">' + list + '</ul>' +
          '<div style="margin-top:10px;font-size:12px;color:#64748b">Aðgerð flytur þær yfir í Viðskiptavinir, uppfærir solur tilvísanir, og eyðir úr Fyrirtækjaþjónustu.</div>';
        runBtn.disabled = false;
        runBtn.style.opacity = '1';
      } catch (e) {
        result.innerHTML = '<div style="color:#dc2626">Villa: ' + esc(e.message || String(e)) + '</div>';
      }
    });

    dlg.querySelector('#_cpw-run').addEventListener('click', async () => {
      if (!candidatesCache.length) return;
      if (!confirm('Flytja ' + candidatesCache.length + ' rúður úr Fyrirtækjaþjónustu yfir í Viðskiptavinir? Þetta er ekki afturkræft.')) return;
      runBtn.disabled = true;
      runBtn.textContent = '⏳ Vinn...';
      result.innerHTML = '⏳ Flyt...';
      const r = await migrate({ dryRun: false });
      runBtn.textContent = '▶ Framkvæma flutning';
      result.innerHTML =
        '<div style="font-weight:700;color:#16a34a;margin-bottom:6px">✓ Flutningur kláraður</div>' +
        '<div style="font-size:12px;color:#475569">Fundust: ' + r.found + ' · Fluttar: ' + r.migrated + ' · Villur: ' + r.errors.length + '</div>' +
        (r.errors.length ? '<details style="margin-top:8px;font-size:11px;color:#dc2626"><summary>Sjá villur</summary><pre>' + esc(JSON.stringify(r.errors, null, 2)) + '</pre></details>' : '') +
        '<div style="margin-top:10px;font-size:12px;color:#64748b">Endurhladdu fyrirtækjalistann til að sjá uppfærslu.</div>';
      // Refresh local Companies cache
      try {
        if (window.Companies && Companies.load) await Companies.load();
      } catch (_) {}
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  window.CleanupPosWalkins = {
    run: migrate,
    show: showCleanupDialog,
    find: findCandidates
  };

  // Inject a button on the company list view (Fyrirtækjaþjónusta) to trigger
  function injectButton() {
    const view = document.getElementById('view-companies');
    if (!view || !view.classList.contains('active')) return;
    const main = view.querySelector('main, #companies-main');
    if (!main) return;
    // 2026-05-08: Removed user-facing button per request. The cleanup
    // function is still callable via window.CleanupPosWalkins.show() from
    // the console if needed. Also remove any stale button that might be
    // in the DOM from before the change.
    main.querySelectorAll('._cpw-btn').forEach(b => b.remove());
  }
  setInterval(injectButton, 5000);

  console.log('[cleanup-pos-walkins] installed — call CleanupPosWalkins.show() or use button on Fyrirtæki list');
})();
/* === END CLEANUP POS WALK-INS v1 === */
