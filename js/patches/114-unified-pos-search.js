/* === UNIFIED POS SEARCH v1 ===
 *
 * Sameinaður leitareitur á Sala-síðu — leitar samtímis af kennitölum,
 * nöfnum og símanúmerum. Birtir live niðurstöður undir reitnum.
 *
 * Eiginleikar:
 *   • Einn leitareitur „Leita að kennitölu, nafni eða síma…"
 *   • Live dropdown með matchandi viðskiptavinum + fyrirtækjum
 *   • Smellur á niðurstöðu fyllir út kt + nafn + sími sjálfvirkt
 *   • Quick „⚡ Staðgreitt" takki: notar kt 999999-9999 — engin skráning
 *   • Notandi getur slegið inn nafn + síma fyrir staðgreidda sem fer ekki
 *     í gagnagrunninn (engin tvírit í Viðskiptavinir)
 *
 * Niðurstöður koma úr:
 *   • Companies.list (fyrirtaeki)
 *   • Vidskiptavinir.list eða DB.cache.vidsk (vidskiptavinir)
 *
 * Breytingar á flæði:
 *   • Þegar leitarniðurstaða er valin → setur state.customer eins og
 *     gamla kennitala-flæðið (svo öll önnur virkni heldur áfram)
 *   • Þegar „Staðgreitt" er ýtt → tilboðsverð, kvittun, allt eins —
 *     bara með kt 999999-9999 og nafn úr handvirkum reit
 */
(() => {
  if (window.__unifiedPosSearchInstalled) return;
  window.__unifiedPosSearchInstalled = true;

  const STAÐGREITT_KT = '999999-9999';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function getCompanies() {
    return (window.Companies && Array.isArray(Companies.list)) ? Companies.list : [];
  }
  function getVidsk() {
    if (window.Vidskiptavinir && Array.isArray(Vidskiptavinir.list) && Vidskiptavinir.list.length) return Vidskiptavinir.list;
    if (window.DB && DB.cache && Array.isArray(DB.cache.vidsk) && DB.cache.vidsk.length) return DB.cache.vidsk;
    return _vidskFallback;
  }

  // Local fallback cache populated by direct Supabase query (in case neither
  // Companies nor Vidskiptavinir module has been loaded yet — search works
  // anyway).
  let _vidskFallback = [];

  // Prefetch both companies + viðskiptavinir directly from Supabase so search
  // works even before user visits those views.
  //
  // 2026-05-11: Added TTL (60s) so updates from other tabs / users / direct
  // DB edits are picked up automatically. Without this the cache was set
  // once on page load and never refreshed — e.g. when a customer was
  // renamed from "Vidskiptavinur 491209-1270" to "VR-5 Vélrás" in another
  // view, the POS search kept showing the old name forever.
  let _prefetchPromise = null;
  let _lastFetchTs = 0;
  const PREFETCH_TTL_MS = 60 * 1000;

  function prefetchCustomers(force) {
    const SB = window.DB && window.DB.sb;
    if (!SB) {
      setTimeout(prefetchCustomers, 500);
      return Promise.resolve();
    }
    // Reuse an in-flight promise if available.
    if (_prefetchPromise && !force) {
      const age = Date.now() - _lastFetchTs;
      if (age < PREFETCH_TTL_MS) return _prefetchPromise;
      // Cache expired → kick off a fresh fetch.
    }
    _prefetchPromise = Promise.all([
      // fyrirtaeki is >1000 rows — page through the Supabase cap, then re-shape
      // to { data } so the consumer below stays unchanged.
      DB.fetchAll((from, to) => SB.from('fyrirtaeki')
        .select('id,nafn,simi,kennitala,heimilisfang,netfang,afslattur_pct,athugasemdir,er_i_thjonustu')
        .is('deleted_at', null)
        .order('nafn')
        .range(from, to)).then(rows => ({ data: rows })),
      SB.from('vidskiptavinir')
        .select('id,nafn,kennitala,simi,farsimi,heimilisfang,netfang,afslattur_pct,athugasemdir')
        .order('nafn')
    ]).then(results => {
      const fy = (results[0] && results[0].data) || [];
      const vk = (results[1] && results[1].data) || [];
      // Always overwrite caches so renames / new rows are visible.
      if (window.Companies) Companies.list = fy;
      if (window.Vidskiptavinir) Vidskiptavinir.list = vk;
      if (window.DB && window.DB.cache) DB.cache.vidsk = vk;
      _vidskFallback = vk;
      _lastFetchTs = Date.now();
      console.log('[unified-pos-search] prefetched', fy.length, 'companies +', vk.length, 'viðskiptavinir');
    }).catch(e => {
      console.warn('[unified-pos-search] prefetch failed:', e);
    });
    return _prefetchPromise;
  }

  // Public helper so other patches can force a refresh after editing.
  window._upsRefreshCustomers = () => prefetchCustomers(true);

  // 2026-08-06 (ósk Agnars): kt-lookup.js spyr EINGÖNGU RSK Fyrirtækjaskrá —
  // finni það kennitöluna þýðir það sjálfkrafa að hún er skráð FYRIRTÆKI, ekki
  // einstaklingur (Fyrirtækjaskrá geymir aldrei kennitölur einstaklinga). Því
  // á fundin RSK-niðurstaða að stofna beint í `fyrirtaeki` (Allir viðskipta-
  // vinir), ekki `vidskiptavinir` — öfugt við „Skrá viðskiptavin"-flæðið sem
  // er ætlað einstaklingum og heldur áfram að skrifa í vidskiptavinir eins og
  // áður. Þjónustu-fáninn er FALSE — sér ákvörðun ef Agnar vill bæta við.
  async function createFyrirtaekiFromRsk(ktDigits, data) {
    const sb = window.DB && window.DB.sb;
    if (!sb) throw new Error('Engin gagnabankatenging');
    const ktDash = ktDigits.slice(0, 6) + '-' + ktDigits.slice(6);
    // Defensive: reuse if a row already exists (race with another tab, or a
    // stale local cache that missed a recent add).
    const existing = await sb.from('fyrirtaeki').select('*').or('kennitala.eq.' + ktDash + ',kennitala.eq.' + ktDigits).is('deleted_at', null).limit(1).maybeSingle();
    if (existing && existing.data) return { row: existing.data, reused: true };

    let baseId = null;
    const base = await sb.from('customers_base').select('id').eq('kennitala', ktDash).limit(1).maybeSingle();
    if (base && base.data) baseId = base.data.id;
    else {
      const nb = await sb.from('customers_base').insert({
        kennitala: ktDash, nafn: data.nafn || '', heimilisfang: data.heimilisfang || ''
      }).select('id').single();
      if (nb.error) throw nb.error;
      baseId = nb.data.id;
    }

    const ins = await sb.from('fyrirtaeki').insert({
      nafn: data.nafn || '', kennitala: ktDash, status: 'virkur', er_i_thjonustu: false,
      customer_base_id: baseId, heimilisfang: data.heimilisfang || null, simi: data.simi || null
    }).select().single();
    if (ins.error) throw ins.error;
    return { row: ins.data, reused: false };
  }

  // 2026-05-10 (#2): Public opener so other patches (e.g. patch 19 RSK
  // lookup) can fall back to this when their flow can't proceed.
  window._upsOpenNewCustomer = function(presetText, presetKt) {
    return openNewCustomerDialog(presetText, presetKt);
  };

  // 2026-05-10 (F6/F7): Inline "+ Stofna nýjan viðskiptavin" dialog. Used
  // when search returns no results — lets the user add a customer right in
  // the POS flow without navigating to Vidskiptavinir / Fyrirtæki page.
  function openNewCustomerDialog(presetText, presetKt) {
    const looksLikeKt = /^\d{3,10}$/.test((presetText || '').replace(/[^0-9]/g, ''));
    const initialNafn = looksLikeKt ? '' : (presetText || '');
    const initialKt = (presetKt || '').replace(/[^0-9]/g, '');

    const existing = document.getElementById('_ups-newdlg');
    if (existing) existing.remove();
    const dlg = document.createElement('div');
    dlg.id = '_ups-newdlg';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100040;background:rgba(15,23,42,0.55);display:flex;align-items:center;justify-content:center;padding:16px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:13px;box-shadow:0 24px 60px rgba(0,0,0,0.3);width:min(460px,calc(100vw - 32px));overflow:hidden">' +
        '<div style="padding:13px 18px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff">' +
          '<div style="font-size:11px;color:#bbf7d0;text-transform:uppercase;letter-spacing:0.06em;font-weight:600">Stofna viðskiptavin</div>' +
          '<div style="font-size:15px;font-weight:700;margin-top:2px">+ Nýr viðskiptavinur</div>' +
        '</div>' +
        '<div style="padding:18px 22px;display:flex;flex-direction:column;gap:11px">' +
          '<div><label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Nafn *</label>' +
            '<input id="_ups-new-nafn" type="text" value="' + esc(initialNafn) + '" placeholder="Fyrirtæki eða nafn" style="width:100%;padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;margin-top:4px;box-sizing:border-box"></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' +
            '<div><label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Kennitala</label>' +
              '<div style="display:flex;gap:6px;align-items:stretch;margin-top:4px">' +
                '<input id="_ups-new-kt" type="text" inputmode="numeric" data-kt-lookup-wrapped="1" value="' + esc(initialKt) + '" placeholder="0000000000" maxlength="11" style="flex:1;min-width:0;padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;box-sizing:border-box;font-family:monospace">' +
                '<button id="_ups-new-ktlookup" type="button" style="flex-shrink:0;padding:0 11px;border:1px solid #cbd5e1;border-radius:7px;background:#f1f5f9;cursor:pointer;font:inherit;font-size:12px;font-weight:600;color:#334155;white-space:nowrap">🔍 Fletta upp</button>' +
              '</div></div>' +
            '<div><label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Sími</label>' +
              '<input id="_ups-new-simi" type="tel" placeholder="555 1234" style="width:100%;padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;margin-top:4px;box-sizing:border-box"></div>' +
          '</div>' +
          '<div><label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Netfang</label>' +
            '<input id="_ups-new-email" type="email" placeholder="reikningur@dæmi.is" style="width:100%;padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;margin-top:4px;box-sizing:border-box"></div>' +
          '<div><label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">Heimilisfang</label>' +
            '<input id="_ups-new-addr" type="text" placeholder="Götu 1, 101 Reykjavík" style="width:100%;padding:9px 11px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;margin-top:4px;box-sizing:border-box"></div>' +
          '<div id="_ups-new-err" style="display:none;font-size:12px;color:#dc2626;font-weight:600;padding:6px 10px;background:#fee2e2;border-radius:6px"></div>' +
        '</div>' +
        '<div style="padding:11px 18px;border-top:1px solid #e2e8f0;display:flex;gap:8px;justify-content:flex-end">' +
          '<button id="_ups-new-cancel" type="button" style="padding:8px 16px;border:1px solid #cbd5e1;border-radius:7px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
          '<button id="_ups-new-save" type="button" style="padding:8px 18px;background:#16a34a;color:#fff;border:none;border-radius:7px;cursor:pointer;font:inherit;font-size:13px;font-weight:700">Vista og velja</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_ups-new-cancel').addEventListener('click', close);

    const nafnInp = dlg.querySelector('#_ups-new-nafn');
    const ktInp = dlg.querySelector('#_ups-new-kt');
    const simiInp = dlg.querySelector('#_ups-new-simi');
    const emailInp = dlg.querySelector('#_ups-new-email');
    const addrInp = dlg.querySelector('#_ups-new-addr');
    const errEl = dlg.querySelector('#_ups-new-err');
    setTimeout(() => { (initialNafn ? simiInp : nafnInp).focus(); }, 30);

    // Auto-format kt as user types: 6 digits + dash + 4 digits
    ktInp.addEventListener('input', () => {
      const raw = ktInp.value.replace(/[^0-9]/g, '').slice(0, 10);
      ktInp.value = raw.length > 6 ? raw.slice(0,6) + '-' + raw.slice(6) : raw;
    });

    // RSK kennitala auto-fill. Reuses window.KtLookup.lookup (patch 19).
    // Fills only empty fields with non-empty results; never overwrites what
    // the user already typed. simi is usually empty on the free path.
    const ktBtn = dlg.querySelector('#_ups-new-ktlookup');
    let ktLookupBusy = false;
    async function doKtLookup() {
      if (ktLookupBusy) return;
      const kt = ktInp.value.replace(/[^0-9]/g, '');
      if (kt.length !== 10) {
        if (window.Toast && Toast.show) Toast.show('Kennitalan þarf að vera 10 tölustafir');
        return;
      }
      if (!(window.KtLookup && typeof KtLookup.lookup === 'function')) {
        if (window.Toast && Toast.show) Toast.show('Uppfletting ekki tiltæk');
        return;
      }
      ktLookupBusy = true;
      const origLabel = ktBtn.textContent;
      ktBtn.disabled = true;
      ktBtn.textContent = '⏳';
      try {
        const data = await KtLookup.lookup(kt);
        if (data) {
          if (data.nafn && !nafnInp.value.trim()) nafnInp.value = data.nafn;
          if (data.simi && !simiInp.value.trim()) simiInp.value = data.simi;
          if (data.netfang && !emailInp.value.trim()) emailInp.value = data.netfang;
          // heimilisfang from lookup is already a full string; build defensively
          // if separate parts are returned instead.
          let addr = data.heimilisfang || '';
          if (!addr && (data.postnumer || data.stadur)) {
            addr = [data.postnumer, data.stadur].filter(Boolean).join(' ');
          } else if (addr && data.postnumer && data.stadur && !/\d{3}/.test(addr)) {
            addr = addr + ', ' + data.postnumer + ' ' + data.stadur;
          }
          if (addr && !addrInp.value.trim()) addrInp.value = addr;
          if (window.Toast && Toast.show) Toast.show('✓ ' + (data.nafn || 'Fundið'));
        }
      } catch (e) {
        if (window.Toast && Toast.show) Toast.show('Uppfletting mistókst — ' + ((e && e.message) || e));
      } finally {
        ktLookupBusy = false;
        ktBtn.disabled = false;
        ktBtn.textContent = origLabel;
      }
    }
    ktBtn.addEventListener('click', doKtLookup);
    // Auto-trigger once the kt reaches 10 digits (debounced) and on blur.
    ktInp.addEventListener('input', () => {
      if (ktInp.value.replace(/[^0-9]/g, '').length === 10) setTimeout(doKtLookup, 300);
    });
    ktInp.addEventListener('blur', () => {
      if (ktInp.value.replace(/[^0-9]/g, '').length === 10) doKtLookup();
    });
    // If a kt was preset, run it once on open.
    if (initialKt && initialKt.length === 10) setTimeout(doKtLookup, 200);

    function showErr(msg) { errEl.textContent = msg; errEl.style.display = ''; }

    dlg.querySelector('#_ups-new-save').addEventListener('click', async () => {
      const nafn = nafnInp.value.trim();
      const ktClean = ktInp.value.replace(/[^0-9]/g, '');
      const simi = simiInp.value.trim();
      const email = emailInp.value.trim();
      const addr = addrInp.value.trim();
      if (!nafn) { showErr('Nafn vantar'); return; }
      if (ktClean && ktClean.length !== 10) { showErr('Kennitala verður að vera 10 tölustafir (eða tóm)'); return; }
      const SB = window.DB && window.DB.sb;
      if (!SB) { showErr('Engin gagnabankatenging'); return; }

      // 2026-05-10 (#1): Kt-collision check. If user enters a kennitala that
      // already exists in vidskiptavinir or fyrirtaeki, warn and offer
      // "Velja eldri" instead of silently creating a duplicate row that
      // confuses the kt-lookup later.
      if (ktClean) {
        try {
          const [existVi, existFy] = await Promise.all([
            SB.from('vidskiptavinir').select('id,nafn,kennitala').eq('kennitala', ktClean).maybeSingle(),
            SB.from('fyrirtaeki').select('id,nafn,kennitala').eq('kennitala', ktClean).maybeSingle()
          ]);
          const existing = (existVi && existVi.data) || (existFy && existFy.data);
          if (existing) {
            const useExisting = await Confirm.show(
              'Þessi kennitala (' + ktClean.slice(0,6) + '-' + ktClean.slice(6) + ') er þegar skráð á:\n\n' +
              '   ' + (existing.nafn || '(óþekkt nafn)') + '\n\n' +
              'Viltu velja þennan viðskiptavin í staðinn fyrir að stofna nýjan?',
              { okText: 'Velja eldri', cancelText: 'Stofna nýjan samt' }
            );
            if (useExisting) {
              // Pick the existing customer
              if (window.POS && typeof POS.getState === 'function') {
                const st = POS.getState();
                if (st && st.customer) {
                  st.customer.nafn = existing.nafn || '';
                  st.customer.kt = existing.kennitala || '';
                  st.customer.co_id = existing.id;
                  st.customer.mode = 'kt';
                }
              }
              const ktDom = document.getElementById('pos-kt');
              if (ktDom) {
                ktDom.value = ktClean.slice(0,6) + '-' + ktClean.slice(6);
                ktDom.dispatchEvent(new Event('input', { bubbles: true }));
              }
              if (window.Toast && Toast.show) Toast.show('✓ Eldri viðskiptavinur valinn: ' + (existing.nafn || ''));
              close();
              if (typeof window.rerenderDynamic === 'function') window.rerenderDynamic();
              return;
            }
            // If user clicks "Stofna nýjan samt" we fall through to insert below.
            // Fresh row with same kt will technically work but flagged for the user.
          }
        } catch (_) { /* lookup non-fatal — proceed with insert */ }
      }

      try {
        const r = await SB.from('vidskiptavinir').insert({
          nafn, kennitala: ktClean || null,
          simi: simi || null, netfang: email || null,
          heimilisfang: addr || null
        }).select().single();
        if (r.error) { showErr(r.error.message); return; }
        // Refresh local cache so it appears in future searches
        try {
          if (window.Vidskiptavinir && Array.isArray(Vidskiptavinir.list)) Vidskiptavinir.list.push(r.data);
          if (window.DB && DB.cache && Array.isArray(DB.cache.vidsk)) DB.cache.vidsk.push(r.data);
          _vidskFallback.push(r.data);
        } catch (_) {}
        // Push to POS state so the customer sticks immediately
        if (window.POS && typeof POS.getState === 'function') {
          const st = POS.getState();
          if (st && st.customer) {
            st.customer.nafn = r.data.nafn || '';
            st.customer.kt = r.data.kennitala || '';
            st.customer.simi = r.data.simi || '';
            st.customer.co_id = r.data.id;
            st.customer.mode = 'kt';
          }
        }
        // Mirror to legacy DOM inputs that other patches read
        const ktDom = document.getElementById('pos-kt');
        if (ktDom && r.data.kennitala) {
          ktDom.value = r.data.kennitala.slice(0,6) + '-' + r.data.kennitala.slice(6);
          ktDom.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (window.Toast && Toast.show) Toast.show('✓ ' + r.data.nafn + ' stofnaður og valinn');
        close();
        // Re-trigger render so the customer card pop in
        if (typeof window.rerenderDynamic === 'function') window.rerenderDynamic();
      } catch (e) {
        showErr(e.message || String(e));
      }
    });

    // Enter on any field saves
    [nafnInp, ktInp, simiInp, emailInp, addrInp].forEach(inp => {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); dlg.querySelector('#_ups-new-save').click(); }
        if (e.key === 'Escape') { e.preventDefault(); close(); }
      });
    });
  }

  // Search both companies + viðskiptavinir
  function searchCustomers(q) {
    if (!q || q.length < 2) return [];
    const qLow = q.toLowerCase().trim();
    const qDigits = q.replace(/[^0-9]/g, '');
    const looksLikeKt = qDigits.length >= 3;

    const all = [];
    getCompanies().forEach(c => {
      all.push({
        id: c.id,
        nafn: c.nafn || '',
        kennitala: c.kennitala || '',
        simi: c.simi || '',
        netfang: c.netfang || '',
        heimilisfang: c.heimilisfang || c.heimilisFang || '',
        afslattur_pct: c.afslattur_pct || 0,
        athugasemdir: c.athugasemdir || '',
        er_i_thjonustu: !!c.er_i_thjonustu,
        source: 'fyrirtaeki'
      });
    });
    // 2026-05-11: Smarter dedup — when two rows share the same kennitala
    // (e.g. duplicates created by a rename that inserted instead of
    // updating), prefer the one with a real name. The legacy placeholder
    // "Viðskiptavinur NNNNNN-NNNN" or just "Viðskiptavinur" should always
    // lose to a row with a real company / person name.
    function isPlaceholderName(nafn) {
      const n = String(nafn || '').trim();
      if (!n) return true;
      if (/^vi[ðd]skiptavinur(\s+\d{3,})?\s*$/i.test(n)) return true;
      return false;
    }
    function ktDigits(s) { return String(s || '').replace(/[^0-9]/g, ''); }

    getVidsk().forEach(v => {
      const vKt = ktDigits(v.kennitala);
      if (vKt) {
        // Look for an existing row with the same kt-digits.
        const existingIdx = all.findIndex(x => ktDigits(x.kennitala) === vKt);
        if (existingIdx >= 0) {
          const existing = all[existingIdx];
          // Replace existing if the existing is a placeholder AND the new
          // one isn't. Otherwise skip (keep the first / better one).
          if (isPlaceholderName(existing.nafn) && !isPlaceholderName(v.nafn)) {
            all[existingIdx] = {
              id: v.id,
              nafn: v.nafn || '',
              kennitala: v.kennitala || '',
              simi: v.simi || existing.simi || '',
              farsimi: v.farsimi || existing.farsimi || '',
              netfang: v.netfang || existing.netfang || '',
              heimilisfang: v.heimilisfang || existing.heimilisfang || '',
              afslattur_pct: v.afslattur_pct || existing.afslattur_pct || 0,
              athugasemdir: v.athugasemdir || existing.athugasemdir || '',
              source: 'vidskiptavinir'
            };
          }
          return;
        }
      }
      all.push({
        id: v.id,
        nafn: v.nafn || '',
        kennitala: v.kennitala || '',
        simi: v.simi || '',
        farsimi: v.farsimi || '',
        netfang: v.netfang || '',
        heimilisfang: v.heimilisfang || '',
        afslattur_pct: v.afslattur_pct || 0,
        athugasemdir: v.athugasemdir || '',
        source: 'vidskiptavinir'
      });
    });

    const matches = all.filter(c => {
      const n = (c.nafn || '').toLowerCase();
      const ktDigits = String(c.kennitala || '').replace(/[^0-9]/g, '');
      const siDigits = String(c.simi || '').replace(/[^0-9]/g, '');
      const farDigits = String(c.farsimi || '').replace(/[^0-9]/g, '');
      if (n.includes(qLow)) return true;
      if (looksLikeKt) {
        if (ktDigits.includes(qDigits)) return true;
        if (siDigits.includes(qDigits)) return true;
        if (farDigits.includes(qDigits)) return true;
      }
      return false;
    });
    // Limit + prioritize: exact-prefix matches first, then substring
    matches.sort((a, b) => {
      const an = (a.nafn || '').toLowerCase();
      const bn = (b.nafn || '').toLowerCase();
      const ap = an.startsWith(qLow) ? 0 : 1;
      const bp = bn.startsWith(qLow) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return an.localeCompare(bn, 'is');
    });
    return matches.slice(0, 12);
  }

  // ── Inject unified search UI into the existing customer card ─────────────
  function injectUnifiedSearch() {
    const ktBox = document.getElementById('pos-kt-box');
    if (!ktBox) return;
    const card = ktBox.parentElement;
    if (!card) return;
    if (card.dataset._upsDone === '1') return;
    card.dataset._upsDone = '1';

    // Hide the mode toggle buttons (Kennitala / Nafn/Sími) — we replace it
    const modeButtons = card.querySelectorAll('.pos-mode-btn');
    modeButtons.forEach(b => { b.style.display = 'none'; });

    // Hide the manual box (we'll add our own walk-in UI)
    const manualBox = document.getElementById('pos-manual-box');
    if (manualBox) manualBox.style.display = 'none';

    // Build new unified UI inserted before pos-kt-box
    const wrap = document.createElement('div');
    wrap.id = '_ups-wrap';
    wrap.style.cssText = 'position:relative;margin-bottom:8px';
    wrap.innerHTML =
      '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">' +
        '<input id="_ups-search" type="text" autocomplete="off" placeholder="🔍 Leita að kennitölu, nafni eða síma…" ' +
          'style="flex:1;padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;box-sizing:border-box">' +
        '<button id="_ups-walkin" type="button" title="Án kennitölu — gestur, kt: 999999-9999, engin skráning" ' +
          'style="padding:10px 14px;background:#dcfce7;border:1px solid #86efac;color:#166534;border-radius:8px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">⚡ Án kennitölu</button>' +
      '</div>' +
      '<div id="_ups-results" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,0.12);z-index:50;max-height:380px;overflow:auto;margin-top:2px"></div>' +
      // Selected customer card — sober grey/blue palette
      '<div id="_ups-selected" style="display:none;margin-top:8px;padding:11px 13px;background:#f8fafc;border:1px solid #cbd5e1;border-left:3px solid #2563eb;border-radius:8px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px">' +
          '<div style="flex:1;min-width:0">' +
            '<div style="display:flex;align-items:center;gap:6px;margin-bottom:2px">' +
              '<span style="font-size:11px;color:#64748b">Valinn viðskiptavinur</span>' +
              '<span id="_ups-sel-source" style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:99px;letter-spacing:0.04em"></span>' +
            '</div>' +
            '<div id="_ups-sel-nafn" style="font-size:15px;font-weight:700;color:#0f172a;line-height:1.2;word-break:break-word"></div>' +
            '<div id="_ups-sel-kt" style="font-size:12px;color:#475569;font-family:\'Courier New\',monospace;font-weight:600;margin-top:2px"></div>' +
            '<div id="_ups-sel-meta" style="font-size:11px;color:#64748b;margin-top:2px"></div>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">' +
            '<button id="_ups-sel-open" type="button" title="Opna viðskiptavin" style="background:#2563eb;border:1px solid #1d4ed8;color:#fff;font-size:11px;font-weight:600;padding:4px 9px;border-radius:5px;cursor:pointer;line-height:1.2;white-space:nowrap">Sjá →</button>' +
            '<button id="_ups-sel-clear" type="button" title="Hætta við" style="background:#fff;border:1px solid #cbd5e1;color:#64748b;font-size:13px;width:26px;height:24px;border-radius:5px;cursor:pointer;line-height:1">✕</button>' +
          '</div>' +
        '</div>' +
        '<div id="_ups-sel-disc" style="display:none;margin-top:5px;padding:3px 8px;background:#dbeafe;color:#1e3a8a;border:1px solid #bfdbfe;border-radius:5px;font-size:11px;font-weight:600"></div>' +
        '<div id="_ups-sel-pricing" style="display:none;margin-top:5px;padding:4px 8px;background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;border-radius:5px;font-size:11px"></div>' +
        '<div id="_ups-sel-notes" style="display:none;margin-top:6px;padding:7px 10px;background:#fff;border:1px solid #e2e8f0;border-left:3px solid #64748b;border-radius:5px">' +
          '<div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:3px">📝 Athugasemdir</div>' +
          '<div id="_ups-sel-notes-text" style="font-size:12px;color:#334155;white-space:pre-wrap;line-height:1.45"></div>' +
        '</div>' +
      '</div>' +
      // Walk-in form (hidden until user clicks Án kennitölu) — soft green
      '<div id="_ups-walkin-form" style="display:none;margin-top:8px;padding:10px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
          '<div style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.05em">⚡ Án kennitölu — kt: 999999-9999</div>' +
          '<button id="_ups-walkin-clear" type="button" style="background:transparent;border:none;color:#166534;font-size:14px;cursor:pointer;padding:0 4px">✕</button>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
          '<input id="_ups-walkin-name" type="text" placeholder="Nafn (valkvætt)" style="padding:8px 10px;border:1px solid #bbf7d0;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box">' +
          '<input id="_ups-walkin-phone" type="tel" placeholder="Sími (valkvætt)" style="padding:8px 10px;border:1px solid #bbf7d0;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box">' +
        '</div>' +
        '<div style="margin-top:6px;font-size:11px;color:#166534">Engin skráning í Viðskiptavinir — fer í kvittun og bókhald með kt 999999-9999.</div>' +
      '</div>';

    card.insertBefore(wrap, ktBox);

    // Hide the kt input row (still kept in DOM so existing pos.js logic works)
    ktBox.style.display = 'none';

    wireSearch();
  }

  function wireSearch() {
    const search = document.getElementById('_ups-search');
    const results = document.getElementById('_ups-results');
    const walkinBtn = document.getElementById('_ups-walkin');
    const walkinForm = document.getElementById('_ups-walkin-form');
    const walkinClear = document.getElementById('_ups-walkin-clear');
    const walkinName = document.getElementById('_ups-walkin-name');
    const walkinPhone = document.getElementById('_ups-walkin-phone');
    if (!search) return;

    // ── Reikningsnúmera-leit (2026-07-11, ósk Agnars): sláðu Payday-númer
    // (t.d. 108271) eða R-númer í SAMA leitarreit → reikningurinn finnst úr
    // payday_invoices_slokk speglinum + solur og smellur opnar Fyrri viðskipti
    // kúnnans (þar sést reikningurinn og öll sagan). Async, keyrir samhliða
    // kúnnaleitinni og bætir „🧾 Reikningar"-kafla EFST í fellilistann.
    let invHTML = '', invForQ = '', invTimer = null;
    function renderInvSection() {
      if (!invHTML || search.value.trim() !== invForQ) return;
      if (results.querySelector('#_ups-invsec')) return;
      results.insertAdjacentHTML('afterbegin', invHTML);
      results.style.display = 'block';
      results.querySelectorAll('._ups-inv').forEach(row => {
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          const kt = row.dataset.kt || '', nafn = row.dataset.nafn || '';
          results.style.display = 'none';
          if (window.SalaCustomerHistory && SalaCustomerHistory.open) {
            const fy = getCompanies().find(c => String(c.kennitala || '').replace(/[^0-9]/g, '') === kt);
            SalaCustomerHistory.open(fy
              ? { id: fy.id, source: 'fyrirtaeki', kt: fy.kennitala || kt, nafn: fy.nafn }
              : { id: '', source: '', kt: kt, nafn: nafn });
          }
        });
        row.addEventListener('mouseenter', () => { row.style.background = '#f3f6fc'; });
        row.addEventListener('mouseleave', () => { row.style.background = ''; });
      });
    }
    async function invoiceSearch(q) {
      const d = q.replace(/[^0-9]/g, '');
      const rish = /^r[-\s]?\d+/i.test(q);
      // Payday-númerin eru STUTT (1–118 í dag): hrein 1–3 stafa tala slegin inn
      // = nákvæm samsvörun á númerinu. 4–8 stafir = innihaldsleit (R-númer með
      // núllum o.þ.h.). Kennitölur (9–10 stafir) trufla ekki.
      const shortNum = !rish && d.length >= 1 && d.length <= 3 && q === d;
      const longNum = rish || (d.length >= 4 && d.length <= 8);
      if (!shortNum && !longNum) { invHTML = ''; return; }
      const SB = window.DB && DB.sb; if (!SB) return;
      try {
        let pdQ = SB.from('payday_invoices_slokk')
          .select('number,reference,customer_name,kt,amount_total,status,created_date,paid_date');
        pdQ = shortNum ? pdQ.eq('number', d) : pdQ.or('number.ilike.%' + d + '%,reference.ilike.%' + d + '%');
        const [pd, sl] = await Promise.all([
          pdQ.order('created_date', { ascending: false }).limit(5),
          longNum
            ? SB.from('solur').select('num,customer_nafn,customer_kt,samtals,created_at')
                .eq('status', 'final').ilike('num', '%' + d + '%')
                .order('created_at', { ascending: false }).limit(4)
            : Promise.resolve({ data: [] })
        ]);
        if (search.value.trim() !== q) return; // úrelt svar
        const rows = [];
        ((pd && pd.data) || []).forEach(p => {
          const paid = p.paid_date || /paid|greid/i.test(p.status || '');
          rows.push('<div class="_ups-inv" data-kt="' + String(p.kt || '').replace(/[^0-9]/g, '') + '" data-nafn="' + esc(p.customer_name || '') + '" ' +
            'style="padding:9px 14px;cursor:pointer;border-bottom:1px solid #ede9fe;font-size:13px;background:#faf9ff">' +
            '<div style="font-weight:700;color:#5b21b6">PD ' + esc(p.number || '') + (p.reference ? ' <span style="font-weight:600;color:#7c6aa8">· ' + esc(p.reference) + '</span>' : '') +
              ' <span style="font-size:9px;background:' + (paid ? '#dcfce7;color:#166534' : '#fffbeb;color:#b45309') + ';padding:1px 6px;border-radius:99px;font-weight:700;margin-left:4px">' + (paid ? 'Greitt' : 'Ógreitt') + '</span></div>' +
            '<div style="font-size:11px;color:#64748b">' + esc(p.customer_name || '') + ' · ' + Math.round(Number(p.amount_total) || 0).toLocaleString('is-IS') + ' kr · ' + esc(p.created_date || '') + '</div>' +
          '</div>');
        });
        ((sl && sl.data) || []).forEach(s2 => {
          const already = ((pd && pd.data) || []).some(p => String(p.reference || '').replace(/\D/g, '').endsWith(String(s2.num || '').replace(/\D/g, '')));
          if (already) return;
          rows.push('<div class="_ups-inv" data-kt="' + String(s2.customer_kt || '').replace(/[^0-9]/g, '') + '" data-nafn="' + esc(s2.customer_nafn || '') + '" ' +
            'style="padding:9px 14px;cursor:pointer;border-bottom:1px solid #e2e8f0;font-size:13px">' +
            '<div style="font-weight:700;color:#0f172a">' + esc(s2.num || '') + '</div>' +
            '<div style="font-size:11px;color:#64748b">' + esc(s2.customer_nafn || '') + ' · ' + Math.round(Number(s2.samtals) || 0).toLocaleString('is-IS') + ' kr · ' + String(s2.created_at || '').slice(0, 10) + '</div>' +
          '</div>');
        });
        invForQ = q;
        invHTML = rows.length
          ? '<div id="_ups-invsec"><div style="padding:6px 14px;font-size:10px;font-weight:800;letter-spacing:.1em;color:#7c6aa8;background:#f5f3ff;border-bottom:1px solid #ede9fe">🧾 REIKNINGAR</div>' + rows.join('') + '</div>'
          : '';
        renderInvSection();
      } catch (_) { /* þögul — kúnnaleitin heldur sínu striki */ }
    }
    function runSearchPlus() { runSearch(); renderInvSection(); }

    search.addEventListener('input', () => {
      const q = search.value.trim();
      invHTML = ''; invForQ = '';
      if (!q) { results.style.display = 'none'; results.innerHTML = ''; return; }
      clearTimeout(invTimer);
      invTimer = setTimeout(() => invoiceSearch(q), 220);
      // Ensure data is loaded
      prefetchCustomers().then(() => {
        runSearchPlus();
      });
      runSearchPlus();
    });
    // On focus, kick off a background refresh so renames / new customers
    // appear without the user having to reload the page. TTL inside
    // prefetchCustomers prevents hammering Supabase.
    search.addEventListener('focus', () => {
      prefetchCustomers().then(() => {
        // If the user is mid-search, re-run with fresh data.
        if (search.value.trim()) runSearchPlus();
      });
    });
    // Enter → pick first visible result (or fall back to RSK lookup if 10 digits)
    search.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const firstResult = results.querySelector('._ups-result');
        if (firstResult) {
          firstResult.click();
        } else {
          const rskRow = results.querySelector('._ups-rsk');
          if (rskRow) rskRow.click();
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        results.style.display = 'none';
        search.value = '';
      }
    });

    function runSearch() {
      const q = search.value.trim();
      if (!q) return;
      // If user types a 10-digit kennitala, also support direct lookup
      const qDigits = q.replace(/[^0-9]/g, '');
      const matches = searchCustomers(q);
      // 2026-05-10 (F6/F7): When the search has no local matches, give the
      // user a way to ADD a new customer inline — both for kt-shaped queries
      // (alongside the RSK option) and for free-text name queries.
      if (!matches.length) {
        let html = '';
        if (qDigits.length === 10) {
          html += '<div class="_ups-rsk" data-kt="' + qDigits + '" style="padding:11px 14px;cursor:pointer;border-bottom:1px solid #e2e8f0;background:#eff6ff;color:#1e40af;font-weight:600;font-size:13px">' +
            '📋 Leita að ' + qDigits.slice(0,6) + '-' + qDigits.slice(6,10) + ' í þjóðskrá / RSK' +
          '</div>';
        }
        // 2026-08-14 (ósk Agnars): hlutlaus röð með GRÆNUM plús sem áherslu —
        // heili ljósgræni flöturinn stakk í stúf við hvítu raðirnar. RSK-röðin
        // (_ups-rsk) heldur sínum lit — hún er annars eðlis (uppfletting).
        const newLabel = qDigits.length === 10
          ? 'Stofna nýjan viðskiptavin (handvirkt)'
          : 'Stofna nýjan viðskiptavin' + (q ? ': „' + esc(q) + '"' : '');
        html += '<div class="_ups-new" style="padding:11px 14px;cursor:pointer;background:#fff;color:#0f172a;font-weight:600;font-size:13px;border-top:1px solid #e2e8f0" ' +
          'onmouseover="this.style.background=\'#f8fafc\'" onmouseout="this.style.background=\'#fff\'">' +
          '<span style="color:#15803d;font-weight:800;margin-right:6px">+</span>' + newLabel +
        '</div>';
        if (!html) html = '<div style="padding:14px;text-align:center;color:#94a3b8;font-size:13px">Engin niðurstaða — prófaðu „⚡ Staðgreitt" eða sláðu inn fulla kennitölu.</div>';
        results.innerHTML = html;
        results.style.display = 'block';
        const rsk = results.querySelector('._ups-rsk');
        if (rsk) {
          rsk.addEventListener('click', async () => {
            // The RSK row is a single <div> with text directly inside (no
            // child element). Use textContent on the row itself to update it.
            rsk.textContent = '⏳ Sæki úr RSK...';
            try {
              if (window.KtLookup && typeof KtLookup.lookup === 'function') {
                const data = await KtLookup.lookup(qDigits);
                if (data && data.nafn) {
                  // Found in RSK Fyrirtækjaskrá = definitely a company (that
                  // registry never carries individuals) → create it directly
                  // in fyrirtaeki, not vidskiptavinir.
                  rsk.textContent = '⏳ Skrái í viðskipti...';
                  const { row, reused } = await createFyrirtaekiFromRsk(qDigits, data);
                  try {
                    if (window.Companies && Array.isArray(Companies.list) && !reused) Companies.list.push(row);
                  } catch (_) {}
                  results.style.display = 'none';
                  selectCustomer({
                    id: row.id,
                    nafn: row.nafn,
                    kennitala: row.kennitala,
                    simi: row.simi || '',
                    heimilisfang: row.heimilisfang || '',
                    afslattur_pct: row.afslattur_pct || 0,
                    er_i_thjonustu: row.er_i_thjonustu
                  }, 'fyrirtaeki');
                  if (window.Toast && Toast.show) Toast.show((reused ? '✓ Fannst þegar: ' : '✓ Skráð í viðskipti: ') + row.nafn);
                  return;
                }
              }
              rsk.style.background = '#fef3c7';
              rsk.style.color = '#78350f';
              rsk.textContent = '⚠ Fannst ekki í RSK — stofnaðu handvirkt';
            } catch (e) {
              console.warn('[ups-rsk] lookup error:', e);
              rsk.style.background = '#fee2e2';
              rsk.style.color = '#991b1b';
              rsk.textContent = '⚠ ' + (e.message || 'Uppfletting mistókst');
            }
          });
        }
        results.querySelector('._ups-new').addEventListener('click', () => {
          openNewCustomerDialog(q, qDigits.length === 10 ? qDigits : '');
        });
        return;
      }
      results.innerHTML = matches.map(m => {
        const ktDisp = m.kennitala ? esc(m.kennitala) : '';
        // 2026-08-06 (ósk Agnars: "show in lookup what database they are in"):
        // þrjú stig, ekki tvö — fyrirtaeki er annaðhvort í árlegri þjónustu
        // eða bara í viðskiptum, og það er sitthvor síðan (Fyrirtæki í
        // þjónustu vs. Allir viðskiptavinir).
        const sourceBadge = m.source === 'fyrirtaeki'
          ? (m.er_i_thjonustu
              ? '<span style="font-size:9px;background:#dcfce7;color:#166534;padding:1px 6px;border-radius:99px;font-weight:700;margin-left:6px">🧯 Þjónusta</span>'
              : '<span style="font-size:9px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:99px;font-weight:700;margin-left:6px">🏢 Viðskipti</span>')
          : '<span style="font-size:9px;background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:99px;font-weight:700;margin-left:6px">👤 Viðsk.</span>';
        const discBadge = m.afslattur_pct > 0
          ? '<span style="font-size:9px;background:#dcfce7;color:#166534;padding:1px 6px;border-radius:99px;font-weight:700;margin-left:4px">' + m.afslattur_pct + '%</span>'
          : '';
        return '<div class="_ups-result" data-id="' + esc(m.id) + '" data-source="' + esc(m.source) + '" style="padding:9px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:13px">' +
          '<div style="font-weight:700;color:#0f172a">' + esc(m.nafn) + sourceBadge + discBadge + '</div>' +
          (ktDisp ? '<div style="font-size:11px;color:#64748b;font-family:monospace">kt. ' + ktDisp + (m.simi ? ' · sími: ' + esc(m.simi) : '') + '</div>' : '') +
        '</div>';
      }).join('');
      results.style.display = 'block';
      results.querySelectorAll('._ups-result').forEach(row => {
        row.addEventListener('click', () => {
          const id = row.dataset.id;
          const source = row.dataset.source;
          const list = source === 'fyrirtaeki' ? getCompanies() : getVidsk();
          const m = list.find(x => String(x.id) === String(id));
          if (m) selectCustomer(m, source);
          results.style.display = 'none';
        });
        row.addEventListener('mouseenter', () => { row.style.background = '#f8fafc'; });
        row.addEventListener('mouseleave', () => { row.style.background = ''; });
      });
    }

    // Hide results on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('#_ups-wrap')) {
        results.style.display = 'none';
      }
    });

    // Walk-in flow
    // Also watch for kt input results from pos.js's own lookup flow — e.g.
    // when user types kt directly, or when the RSK lookup completes. We hook
    // into pos-kt-result mutations and convert to our prominent card.
    const posKtResult = document.getElementById('pos-kt-result');
    if (posKtResult && !posKtResult.dataset._upsWatched) {
      posKtResult.dataset._upsWatched = '1';
      new MutationObserver(() => {
        const txt = (posKtResult.textContent || '').trim();
        // Only show our card if the result indicates a found customer (not a "Leita…" or empty)
        if (!txt || /Leita\.\.\.|Leita…|Engin/.test(txt)) return;
        // 2026-05-14: When the user clicked "Án kennitölu" the kt becomes
        // 999999-9999 — this is a SENTINEL, not a real customer. Never
        // promote a walk-in into the "Valinn viðskiptavinur" card just
        // because some old stray vidskiptavinur row happens to share that kt.
        const ktInp = document.getElementById('pos-kt');
        const kt = ktInp ? ktInp.value.replace(/[^0-9]/g, '') : '';
        if (kt === '9999999999') return;
        // If our card is already shown for a selected customer, skip
        const card = document.getElementById('_ups-selected');
        if (card && card.style.display !== 'none') return;
        if (kt.length !== 10) return;
        // Find customer in companies/vidsk by kt
        const fy = getCompanies().find(c => String(c.kennitala || '').replace(/[^0-9]/g, '') === kt);
        const vk = !fy && getVidsk().find(c => String(c.kennitala || '').replace(/[^0-9]/g, '') === kt);
        if (fy) showSelectedCard(fy, 'fyrirtaeki');
        else if (vk) showSelectedCard(vk, 'vidskiptavinir');
      }).observe(posKtResult, { childList: true, characterData: true, subtree: true });
    }

    walkinBtn.addEventListener('click', () => {
      walkinForm.style.display = '';
      // 2026-05-12: FULLY RESET previous customer state before entering
      // walk-in mode. Was carrying over the last customer's nafn/sími which
      // is confusing — walk-in should start empty and only show what the
      // user types now.
      walkinName.value = '';
      walkinPhone.value = '';
      // Hide selected-customer card if it was showing from previous selection
      const selCard = document.getElementById('_ups-selected');
      if (selCard) selCard.style.display = 'none';
      // Reset POS state so the next sale doesn't inherit a stale name/co_id
      try {
        const posState = window.POS && typeof POS.getState === 'function' && POS.getState();
        if (posState && posState.customer) {
          posState.customer.nafn = '';
          posState.customer.kt = STAÐGREITT_KT;
          posState.customer.simi = '';
          posState.customer.co_id = null;
          posState.customer.heimilisfang = '';
          posState.customer.afslattur_pct = 0;
          posState.customer.athugasemdir = '';
          posState.customer.mode = 'walkin';
        }
      } catch (_) {}
      // Set kt to 999999-9999 (drives existing pos.js auto-create logic)
      const ktInp = document.getElementById('pos-kt');
      if (ktInp) {
        ktInp.value = STAÐGREITT_KT;
        ktInp.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // Clear the legacy manual nafn/sími fields so pos.js can't read stale data
      const manualNafn = document.getElementById('pos-nafn');
      const manualSimi = document.getElementById('pos-simi');
      if (manualNafn) { manualNafn.value = ''; manualNafn.dispatchEvent(new Event('input', { bubbles: true })); }
      if (manualSimi) { manualSimi.value = ''; manualSimi.dispatchEvent(new Event('input', { bubbles: true })); }
      // Clear search field
      search.value = '';
      results.style.display = 'none';
      // Show fresh "⚡ Án kennitölu" header line
      const r = document.getElementById('pos-kt-result');
      if (r) r.innerHTML = '<span style="color:#166534;font-weight:600">⚡ Án kennitölu</span>';
      // Focus the name input so the user can type the customer name right away
      setTimeout(() => walkinName.focus(), 30);
    });

    // Walk-in name/phone live-update
    walkinName.addEventListener('input', () => {
      const manualNafn = document.getElementById('pos-nafn');
      if (manualNafn) {
        manualNafn.value = walkinName.value || 'Staðgreitt';
        manualNafn.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const r = document.getElementById('pos-kt-result');
      if (r) r.innerHTML = '<span style="color:#166534;font-weight:600">⚡ Án kennitölu' + (walkinName.value ? ' · ' + esc(walkinName.value) : '') + '</span>';
    });
    walkinPhone.addEventListener('input', () => {
      const manualSimi = document.getElementById('pos-simi');
      if (manualSimi) {
        manualSimi.value = walkinPhone.value;
        manualSimi.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    walkinClear.addEventListener('click', () => {
      walkinForm.style.display = 'none';
      walkinName.value = '';
      walkinPhone.value = '';
      const ktInp = document.getElementById('pos-kt');
      if (ktInp) { ktInp.value = ''; ktInp.dispatchEvent(new Event('input', { bubbles: true })); }
      const manualNafn = document.getElementById('pos-nafn');
      const manualSimi = document.getElementById('pos-simi');
      if (manualNafn) { manualNafn.value = ''; manualNafn.dispatchEvent(new Event('input', { bubbles: true })); }
      if (manualSimi) { manualSimi.value = ''; manualSimi.dispatchEvent(new Event('input', { bubbles: true })); }
      const r = document.getElementById('pos-kt-result');
      if (r) r.innerHTML = '';
    });
  }

  function selectCustomer(m, source) {
    // 2026-05-11: Also write to POS state synchronously so the cart has
    // the customer name immediately. Otherwise pos.js's async kt-lookup
    // (which runs from the input event below) is racy — if the user
    // clicks ÁFRAM before it returns, the receipt prints with an empty
    // customer name. By mutating POS.getState().customer directly we
    // make the customer info available the moment the user picks them.
    try {
      const posState = window.POS && typeof POS.getState === 'function' && POS.getState();
      if (posState && posState.customer) {
        posState.customer.nafn = m.nafn || '';
        posState.customer.kt = m.kennitala || '';
        posState.customer.simi = m.simi || '';
        posState.customer.co_id = (source === 'fyrirtaeki') ? (m.id || null) : null;
        posState.customer.heimilisfang = m.heimilisfang || m.heimilisFang || '';
        if (m.afslattur_pct != null) posState.customer.afslattur_pct = +m.afslattur_pct || 0;
        if (m.athugasemdir != null) posState.customer.athugasemdir = m.athugasemdir || '';
      }
    } catch (_) {}

    // Drive the existing kt-lookup flow by populating #pos-kt and dispatching input
    const ktInp = document.getElementById('pos-kt');
    if (ktInp && m.kennitala) {
      ktInp.value = m.kennitala;
      ktInp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // Hide walk-in form if visible
    const walkinForm = document.getElementById('_ups-walkin-form');
    if (walkinForm) walkinForm.style.display = 'none';
    // Clear search bar so user can search again if needed
    const search = document.getElementById('_ups-search');
    if (search) search.value = '';
    // Hide the small pos-kt-result line — we use our own prominent card now
    const r = document.getElementById('pos-kt-result');
    if (r) r.innerHTML = '';

    // Show the prominent selected-customer card
    showSelectedCard(m, source);
  }

  function showSelectedCard(m, source) {
    const card = document.getElementById('_ups-selected');
    if (!card) return;
    const srcEl = document.getElementById('_ups-sel-source');
    const nafnEl = document.getElementById('_ups-sel-nafn');
    const ktEl = document.getElementById('_ups-sel-kt');
    const metaEl = document.getElementById('_ups-sel-meta');
    const discEl = document.getElementById('_ups-sel-disc');
    const pricingEl = document.getElementById('_ups-sel-pricing');
    const notesEl = document.getElementById('_ups-sel-notes');
    const notesTextEl = document.getElementById('_ups-sel-notes-text');

    if (srcEl) {
      if (source === 'fyrirtaeki' && m.er_i_thjonustu) {
        srcEl.style.background = '#dcfce7';
        srcEl.style.color = '#166534';
        srcEl.textContent = '🧯 Í ÞJÓNUSTU';
      } else if (source === 'fyrirtaeki') {
        srcEl.style.background = '#fef3c7';
        srcEl.style.color = '#92400e';
        srcEl.textContent = '🏢 Í VIÐSKIPTUM';
      } else if (source === 'walkin') {
        srcEl.style.background = '#f1f5f9';
        srcEl.style.color = '#475569';
        srcEl.textContent = '⚡ STAÐGREITT';
      } else {
        srcEl.style.background = '#dbeafe';
        srcEl.style.color = '#1e40af';
        srcEl.textContent = '👤 VIÐSK.';
      }
    }

    // Remember which customer this card refers to so the "Sjá" button can
    // route to the correct profile.
    card.dataset.id = m.id != null ? String(m.id) : '';
    card.dataset.source = source || '';
    card.dataset.kt = (m.kennitala || '').replace(/[^0-9]/g, '');

    // Hide "Sjá →" button for walk-ins (no profile to open)
    const openBtn = document.getElementById('_ups-sel-open');
    if (openBtn) {
      openBtn.style.display = (source === 'walkin' || !m.id) ? 'none' : '';
    }

    if (nafnEl) nafnEl.textContent = m.nafn || '—';
    if (ktEl) ktEl.textContent = m.kennitala ? 'kt. ' + m.kennitala : '';

    // Meta line: phone + heimilisfang
    const metaParts = [];
    if (m.simi) metaParts.push('📞 ' + m.simi);
    if (m.farsimi && m.farsimi !== m.simi) metaParts.push('📱 ' + m.farsimi);
    const heim = m.heimilisfang || m.heimilisFang;
    if (heim) metaParts.push('📍 ' + heim);
    if (metaEl) metaEl.innerHTML = metaParts.map(p => esc(p)).join(' &nbsp;·&nbsp; ');

    // Discount badge
    if (discEl) {
      const pct = +m.afslattur_pct || 0;
      if (pct > 0) {
        discEl.textContent = '🎯 Sjálfgefinn afsláttur: ' + pct + '%';
        discEl.style.display = '';
      } else {
        discEl.style.display = 'none';
      }
    }

    // Tilboðsverð / Sérkjör info — count entries from AppSettings
    // (company_pricing for B2B, vidsk_pricing for individual customers)
    if (pricingEl && m.id) {
      let pricingList = [];
      let label = '💰 tilboðsverð';
      let icon = '💰';
      try {
        const key = source === 'fyrirtaeki' ? 'company_pricing' : 'vidsk_pricing';
        if (source === 'vidskiptavinir') { label = '💎 sérkjör'; icon = '💎'; }
        const stored = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(key)) || {};
        pricingList = (stored && stored[String(m.id)]) || [];
      } catch (_) {}
      if (pricingList.length) {
        const summary = pricingList.slice(0, 3).map(p => p.name).join(', ') + (pricingList.length > 3 ? ' +' + (pricingList.length - 3) + ' fleiri' : '');
        pricingEl.innerHTML = icon + ' <strong>' + pricingList.length + ' ' + label + '</strong> — beitt sjálfvirkt á körfu-línur. (' + esc(summary) + ')';
        pricingEl.style.display = '';
      } else {
        pricingEl.style.display = 'none';
      }
    }

    // Athugasemdir — always overwrite the text (so a stale value from a
    // previous customer doesn't linger in the DOM, even if hidden).
    if (notesEl && notesTextEl) {
      const notes = (m.athugasemdir || '').trim();
      notesTextEl.textContent = notes;
      notesEl.style.display = notes ? '' : 'none';
    }

    // Show the card
    card.style.display = '';

    // Wire clear-button (only once)
    const clearBtn = document.getElementById('_ups-sel-clear');
    if (clearBtn && !clearBtn.dataset._wired) {
      clearBtn.dataset._wired = '1';
      clearBtn.addEventListener('click', () => {
        clearSelectedCard();
      });
    }

    // Wire open-profile button (only once) — routes to the right view
    const openBtn2 = document.getElementById('_ups-sel-open');
    if (openBtn2 && !openBtn2.dataset._wired) {
      openBtn2.dataset._wired = '1';
      openBtn2.addEventListener('click', () => {
        const card2 = document.getElementById('_ups-selected');
        const id = card2 && card2.dataset.id;
        const src = card2 && card2.dataset.source;
        if (!id) return;
        openCustomerProfile(id, src);
      });
    }
  }

  // Open the customer profile in the right view based on source
  async function openCustomerProfile(id, source) {
    if (source === 'fyrirtaeki') {
      // Companies side — uses helper that handles view switch + open race
      if (typeof window._openCompanySafe === 'function') {
        window._openCompanySafe(id);
        return;
      }
      // Fallback: switch view + open detail manually
      if (window.App && typeof App.switchView === 'function') App.switchView('companies');
      setTimeout(() => {
        if (window.Companies && typeof Companies.openDetail === 'function') {
          Companies.openDetail(id);
        }
      }, 250);
      return;
    }

    // Vidskiptavinir — the revamp module keeps its customers array in
    // closure; Vidskiptavinir.list can be overwritten without populating
    // the closure. We must call .load() so openDetail can find the record.
    if (window.App && typeof App.switchView === 'function') App.switchView('vidskiptavinir');

    if (!window.Vidskiptavinir) {
      // Module not ready — wait briefly and retry
      setTimeout(() => openCustomerProfile(id, source), 300);
      return;
    }

    // Ensure customers list is loaded into the module's closure
    try {
      if (typeof Vidskiptavinir.load === 'function') {
        await Vidskiptavinir.load();
      }
    } catch (e) {
      console.warn('[unified-pos-search] Vidskiptavinir.load failed:', e);
    }

    // Now openDetail can find the customer in its closure array
    if (typeof Vidskiptavinir.openDetail === 'function') {
      const list = (Vidskiptavinir.list && Vidskiptavinir.list.length) ? Vidskiptavinir.list : getVidsk();
      const c = list.find(x => String(x.id) === String(id)) || { id };
      // Trigger render — switch the module's view to detail
      Vidskiptavinir.openDetail(c);
      // Force a refresh in case render didn't trigger
      setTimeout(() => {
        if (typeof Vidskiptavinir.refresh === 'function' && !document.querySelector('#vidsk-main #vk-back')) {
          // Detail didn't render — call again
          Vidskiptavinir.openDetail(c);
        }
      }, 200);
    }
  }

  function clearSelectedCard() {
    const card = document.getElementById('_ups-selected');
    if (card) card.style.display = 'none';
    const ktInp = document.getElementById('pos-kt');
    if (ktInp) {
      ktInp.value = '';
      ktInp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const r = document.getElementById('pos-kt-result');
    if (r) r.innerHTML = '';
    const search = document.getElementById('_ups-search');
    if (search) { search.value = ''; search.focus(); }
  }

  // ── Watch for Sala view rendering ────────────────────────────────────────
  function watch() {
    const view = document.getElementById('view-sala');
    if (!view) { setTimeout(watch, 800); return; }
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(injectUnifiedSearch, 200);
    }).observe(view, { childList: true, subtree: true });
  }
  watch();
  setTimeout(injectUnifiedSearch, 1500);
  setInterval(injectUnifiedSearch, 2000);
  // Pre-fetch customers as soon as the patch loads so the first search is instant
  setTimeout(prefetchCustomers, 800);

  console.log('[unified-pos-search] installed — single search bar + Staðgreitt walk-in flow');
})();
/* === END UNIFIED POS SEARCH v1 === */
