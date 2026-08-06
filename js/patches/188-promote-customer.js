/* === PROMOTE CUSTOMER → VIÐSKIPTI v2 ===
 *
 * Turns a regular customer (a Viðskiptavinur / Sala-created `vidskiptavinir`
 * row) into a company row in `fyrirtaeki`, creating/linking the
 * `customers_base` identity root so the whole record is unified.
 *
 * 2026-08-06 (ósk Agnars — sjá líka 280-company-service-toggle.js): áður setti
 * þetta ALLTAF er_i_thjonustu=true, sem var rangt fyrir langflest tilvik —
 * flestir sem þarf að skrá almennilega (afsláttur, reikningasaga) eru EKKI í
 * árlegri skoðunarþjónustu, bara í viðskiptum. Fáninn er núna FALSE
 * sjálfgefið; „⬆ Setja í þjónustu" (280) er sér ákvörðun sem Agnar tekur
 * handvirkt á eftir, per fyrirtæki, ef þörf er á.
 *
 *   • Fyrirtæki EKKI til í fyrirtaeki → stofna það (status 'virkur',
 *     er_i_thjonustu FALSE), copy name/kt/phone/email/address/notes.
 *   • Fyrirtæki ÞEGAR til → warn, then offer a SAFE fill-blanks merge:
 *     only empty fields on the existing company get filled from the customer
 *     record. Nothing is ever overwritten or deleted, and the service flag is
 *     left exactly as it was — merging never turns service on by itself. The
 *     originating vidskiptavinir row is kept and linked via the shared base.
 *
 * Public API:
 *   window.PromoteCustomer.run(seed, opts)
 *     seed = { kennitala, nafn, simi, netfang, heimilisfang, athugasemdir,
 *              farsimi, vefsida, tengilidur, greidsluskilmali, afslattur_pct,
 *              vidsk_id }
 *     opts = { onDone(fyrirtaekiRow) }   // optional callback after success
 *
 * Every write only happens after the user confirms in the modal — loading
 * this patch writes nothing on its own.
 */
(() => {
  if (window.__promoteCustomerInstalled) return;
  window.__promoteCustomerInstalled = true;

  function SB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[promote]', m); }
  function digits(kt) { return String(kt || '').replace(/\D/g, ''); }
  function dash(kt) { const d = digits(kt); return d.length === 10 ? d.slice(0, 6) + '-' + d.slice(6) : (kt || ''); }
  const blank = v => v == null || String(v).trim() === '' || (typeof v === 'number' && v === 0);

  // Columns shared between fyrirtaeki and the source customer record.
  const SHARED = ['simi', 'netfang', 'heimilisfang', 'athugasemdir', 'farsimi', 'vefsida', 'tengilidur', 'greidsluskilmali', 'afslattur_pct'];

  let _opts = {};

  async function findFyrirtaeki(ktDash) {
    const sb = SB(); if (!sb) return null;
    try {
      const { data } = await sb.from('fyrirtaeki')
        .select('id,nafn,kennitala,customer_base_id,er_i_thjonustu,status,deleted_at,' + SHARED.join(','))
        .eq('kennitala', ktDash).is('deleted_at', null).limit(1);
      return (data && data[0]) || null;
    } catch (e) { console.warn('[promote] findFyrirtaeki', e); return null; }
  }

  // One identity root per kennitala — reuse if present, else create.
  async function ensureBase(ktDash, seed) {
    const sb = SB(); if (!sb) return null;
    try {
      const { data: ex } = await sb.from('customers_base').select('id').eq('kennitala', ktDash).limit(1);
      if (ex && ex[0]) return ex[0].id;
      const { data, error } = await sb.from('customers_base').insert({
        kennitala: ktDash, nafn: seed.nafn || '', simi: seed.simi || '',
        netfang: seed.netfang || '', heimilisfang: seed.heimilisfang || ''
      }).select('id').single();
      if (error) throw error;
      return data ? data.id : null;
    } catch (e) { console.warn('[promote] ensureBase', e); return null; }
  }

  async function doCreate(ktDash, seed) {
    const sb = SB(); if (!sb) return;
    const baseId = await ensureBase(ktDash, seed);
    const row = { nafn: seed.nafn || '', kennitala: ktDash, status: 'virkur', er_i_thjonustu: false, customer_base_id: baseId || null };
    SHARED.forEach(c => { if (!blank(seed[c])) row[c] = seed[c]; });
    let fy = null;
    try {
      const { data, error } = await sb.from('fyrirtaeki').insert(row).select().single();
      if (error) throw error;
      fy = data;
    } catch (e) { toast('Villa: ' + (e.message || e)); return; }
    // Keep the originating vidskiptavinir row, just link it to the same base.
    if (seed.vidsk_id && baseId) {
      try { await sb.from('vidskiptavinir').update({ customer_base_id: baseId }).eq('id', seed.vidsk_id); } catch (_) {}
    }
    toast('✓ ' + (seed.nafn || 'Fyrirtæki') + ' skráð í viðskipti');
    afterPromote(fy);
  }

  async function doMergeFillBlanks(existing, seed) {
    const sb = SB(); if (!sb) return;
    const upd = {};
    SHARED.forEach(c => { if (blank(existing[c]) && !blank(seed[c])) upd[c] = seed[c]; });
    if (blank(existing.status)) upd.status = 'virkur';
    const baseId = existing.customer_base_id || await ensureBase(dash(existing.kennitala || seed.kennitala), seed);
    if (!existing.customer_base_id && baseId) upd.customer_base_id = baseId;
    if (Object.keys(upd).length) {
      try { await sb.from('fyrirtaeki').update(upd).eq('id', existing.id); Object.assign(existing, upd); }
      catch (e) { toast('Villa við sameiningu: ' + (e.message || e)); return; }
    }
    if (seed.vidsk_id && baseId) {
      try { await sb.from('vidskiptavinir').update({ customer_base_id: baseId }).eq('id', seed.vidsk_id); } catch (_) {}
    }
    toast('✓ Upplýsingar sameinaðar í ' + (existing.nafn || 'fyrirtæki'));
    afterPromote(existing);
  }

  function afterPromote(fy) {
    try { if (typeof window.refreshCompaniesList === 'function') window.refreshCompaniesList(); } catch (_) {}
    if (_opts && typeof _opts.onDone === 'function') { try { _opts.onDone(fy); } catch (_) {} }
    // Best-effort: open the company detail so the user lands on it.
    setTimeout(() => {
      try { if (window.Companies && typeof Companies.openDetail === 'function' && fy && fy.id) Companies.openDetail(+fy.id); } catch (_) {}
    }, 250);
  }

  // ── Confirm / warn modal ─────────────────────────────────────────────────
  function confirmModal({ title, body, okLabel, okColor, onOk }) {
    document.getElementById('_promote-modal')?.remove();
    const m = document.createElement('div');
    m.id = '_promote-modal';
    m.style.cssText = 'position:fixed;inset:0;z-index:100060;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit';
    m.innerHTML =
      `<div style="background:#fff;border-radius:14px;padding:22px;max-width:460px;width:100%;box-shadow:0 20px 60px rgba(15,23,42,.3)">
        <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a">${title}</h2>
        <div style="font-size:13.5px;color:#475569;line-height:1.55;margin-bottom:18px">${body}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button id="_pm-cancel" style="padding:9px 16px;border-radius:8px;font-size:14px;cursor:pointer;border:1px solid #e2e8f0;background:#fff;color:#334155;font-weight:500">Hætta við</button>
          <button id="_pm-ok" style="padding:9px 18px;border-radius:8px;font-size:14px;cursor:pointer;border:none;background:${okColor || '#16a34a'};color:#fff;font-weight:700">${esc(okLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(m);
    const close = () => m.remove();
    m.querySelector('#_pm-cancel').onclick = close;
    m.addEventListener('click', e => { if (e.target === m) close(); });
    m.querySelector('#_pm-ok').onclick = () => { close(); onOk && onOk(); };
  }

  async function run(seed, opts) {
    seed = seed || {};
    _opts = opts || {};
    const sb = SB(); if (!sb) { toast('Engin nettenging'); return; }
    const d = digits(seed.kennitala);
    if (d.length !== 10) { toast('Vantar gilda kennitölu til að gera að fyrirtæki'); return; }
    const ktDash = dash(d);
    const existing = await findFyrirtaeki(ktDash);
    if (existing) {
      const inServ = !!existing.er_i_thjonustu;
      confirmModal({
        title: '⚠ Nú þegar til',
        body: `„${esc(existing.nafn || seed.nafn || '')}" (${esc(ktDash)}) er þegar til sem fyrirtæki${inServ ? ' og <b>í þjónustu</b>' : ''}.<br><br>` +
              `Viltu <b>sameina</b> viðbótarupplýsingar af viðskiptavininum yfir á fyrirtækið? Aðeins <b>tómir reitir</b> verða fylltir — engu sem þegar er skráð er breytt eða eytt, og þjónustustaðan haldur sér óbreytt.`,
        okLabel: 'Sameina', okColor: '#2563eb',
        onOk: () => doMergeFillBlanks(existing, seed)
      });
      return;
    }
    confirmModal({
      title: '🔖 Skrá í viðskipti',
      body: `Skrá „${esc(seed.nafn || '')}" (${esc(ktDash)}) í viðskipti? Upplýsingar verða afritaðar og fyrirtækið birtist í ` +
            `<b>Allir viðskiptavinir</b> með virkan afslátt og reikningasögu.<br><br>` +
            `Fær <b>ekki</b> árlega skoðunarþjónustu sjálfkrafa — það er sér ákvörðun („⬆ Setja í þjónustu"-takkinn) ef við á.`,
      okLabel: 'Skrá', okColor: '#16a34a',
      onOk: () => doCreate(ktDash, seed)
    });
  }

  window.PromoteCustomer = { run };
  console.log('[patch-188] promote-customer installed');
})();
/* === END PROMOTE CUSTOMER === */
