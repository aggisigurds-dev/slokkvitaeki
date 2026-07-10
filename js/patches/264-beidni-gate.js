/* === BEIÐNI-NÚMERS SKILYRÐI (Colas o.fl.) ===
 *
 * Verkefnalisti 8c27e989 (Agnar 2026-07-10): Colas greiðir ekki reikninga án
 * síns beiðni-/pöntunarnúmers — það VERÐUR að fylgja hverri sölu. Þessi patch
 * stoppar frágang sölu/afgreiðslu/heimsóknar fyrir merkta kúnna þar til
 * beiðninúmer hefur verið slegið inn, og skrifar það í athugasemd sölunnar
 * (birtist á reikningnum eins og aðrar athugasemdir).
 *
 * Þrír frágangs-staðir, allir gripnir í capture-fasa svo upprunalegu
 * handler-arnir keyra ekki fyrr en númerið er komið:
 *   1. #pos-checkout   — Sala (POS): númerið fer í #pos-notes (→ athugasemdir)
 *   2. #_pkc-finalize  — Afgreiðsla/Sótt (121): fer í #_pkc-salenote
 *   3. #_vw-finish     — Klára heimsókn (165): geymt í BeidniGate og 165 les
 *      það inn í athugasemd reikningsins (peek í forskoðun, take við vistun)
 *
 * Kúnnalistinn: kt-númer í REQUIRE_KTS (+ nafna-fallback þegar kt vantar).
 * Bæta má kúnnum við listann hér — eða síðar í stillingar ef þeim fjölgar.
 */
(() => {
  if (window.__beidniGateInstalled) return;
  window.__beidniGateInstalled = true;

  const REQUIRE_KTS = ['4201871499'];          // Colas Ísland ehf.
  const REQUIRE_NAMES = [/\bcolas\b/i];        // fallback þegar kt vantar á söluna
  // "er beiðninúmer þegar í textanum?" — merkiorð + a.m.k. 3 tölustafir nálægt
  const HAS_PO = s => /(bei[ðd]n|p[öo]ntun|\bpo\b)\D{0,14}\d{3,}/i.test(String(s || ''));

  function requiresPO(kt, nafn) {
    const d = String(kt || '').replace(/\D/g, '');
    if (d && REQUIRE_KTS.indexOf(d) >= 0) return true;
    return REQUIRE_NAMES.some(rx => rx.test(String(nafn || '')));
  }

  // ── Lítill spurninga-gluggi ────────────────────────────────────────────────
  function ask(nafn, onOk) {
    const old = document.getElementById('_bg-modal'); if (old) old.remove();
    const dlg = document.createElement('div');
    dlg.id = '_bg-modal';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100095;background:rgba(15,23,42,.65);display:flex;align-items:center;justify-content:center;padding:16px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.4);width:min(440px,calc(100vw - 32px));overflow:hidden">' +
        '<div style="padding:14px 18px;background:linear-gradient(135deg,#b45309,#92400e);color:#fff">' +
          '<div style="font-size:15px;font-weight:800">📋 Beiðninúmer vantar</div>' +
          '<div style="font-size:12px;color:#fde68a;margin-top:3px">' + esc(nafn || 'Þessi viðskiptavinur') + ' krefst beiðni-/pöntunarnúmers á hverjum reikningi — salan verður ekki kláruð án þess.</div>' +
        '</div>' +
        '<div style="padding:18px">' +
          '<input id="_bg-po" type="text" inputmode="numeric" placeholder="t.d. 9847265" autocomplete="off" ' +
            'style="width:100%;padding:12px 14px;border:2px solid #f59e0b;border-radius:9px;font:inherit;font-size:16px;box-sizing:border-box;font-family:monospace">' +
          '<div id="_bg-err" style="display:none;font-size:12px;color:#b91c1c;margin-top:6px">Sláðu inn beiðninúmerið.</div>' +
        '</div>' +
        '<div style="padding:0 18px 18px;display:flex;gap:8px;justify-content:flex-end">' +
          '<button id="_bg-cancel" type="button" style="padding:10px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;color:#475569;cursor:pointer;font:inherit;font-size:13px">Hætta við</button>' +
          '<button id="_bg-ok" type="button" style="padding:10px 20px;border:none;border-radius:8px;background:#166534;color:#fff;cursor:pointer;font:inherit;font-size:13px;font-weight:700">✓ Setja númer og klára</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    const inp = dlg.querySelector('#_bg-po');
    const close = () => dlg.remove();
    function confirm() {
      const v = (inp.value || '').trim();
      if (!v) { dlg.querySelector('#_bg-err').style.display = ''; inp.focus(); return; }
      close();
      onOk(v);
    }
    dlg.querySelector('#_bg-ok').addEventListener('click', confirm);
    dlg.querySelector('#_bg-cancel').addEventListener('click', close);
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') close(); });
    setTimeout(() => { try { inp.focus(); } catch (_) {} }, 40);
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // ── Geymsla fyrir heimsóknar-flæðið (165 les gegnum BeidniGate) ───────────
  const _po = {};   // coId → { po, ts }
  function peek(coId) {
    const e = _po[String(coId)];
    return (e && (Date.now() - e.ts) < 2 * 3600e3) ? e.po : '';
  }
  function take(coId) {
    const v = peek(coId);
    delete _po[String(coId)];
    return v;
  }

  // ── 1. Sala (POS) ─────────────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const btn = e.target && e.target.closest && e.target.closest('#pos-checkout');
    if (!btn || btn.disabled) return;
    let st = null;
    try { st = window.POS && POS.getState && POS.getState(); } catch (_) {}
    const c = (st && st.customer) || {};
    if (!requiresPO(c.kt || c.kennitala, c.nafn)) return;
    if (HAS_PO(st && st.notes)) return;
    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
    ask(c.nafn, po => {
      const line = 'Beiðni nr: ' + po;
      const notes = document.getElementById('pos-notes');
      if (notes) {
        notes.value = (notes.value ? notes.value + ' · ' : '') + line;
        notes.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (st) { st.notes = (st.notes ? st.notes + ' · ' : '') + line; }
      setTimeout(() => { const b = document.getElementById('pos-checkout'); if (b) b.click(); }, 60);
    });
  }, true);

  // ── 2. Afgreiðsla / Sótt (121) ────────────────────────────────────────────
  document.addEventListener('click', e => {
    const btn = e.target && e.target.closest && e.target.closest('#_pkc-finalize');
    if (!btn || btn.disabled) return;
    const kt = (document.getElementById('_pkc-cust-kt') || {}).value || '';
    const nafn = (document.getElementById('_pkc-cust-nafn') || {}).value || '';
    if (!requiresPO(kt, nafn)) return;
    const noteEl = document.getElementById('_pkc-salenote');
    if (noteEl && HAS_PO(noteEl.value)) return;
    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
    ask(nafn, po => {
      if (noteEl) {
        noteEl.value = (noteEl.value ? noteEl.value + ' · ' : '') + 'Beiðni nr: ' + po;
        noteEl.dispatchEvent(new Event('input', { bubbles: true }));
        noteEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
      setTimeout(() => { const b = document.getElementById('_pkc-finalize'); if (b) b.click(); }, 60);
    });
  }, true);

  // ── 3. Klára heimsókn (165) — kt fundið af fyrirtækjasíðunni ─────────────
  document.addEventListener('click', e => {
    const btn = e.target && e.target.closest && e.target.closest('#_vw-finish');
    if (!btn || btn.disabled) return;
    const main = document.getElementById('companies-main');
    const idEl = main && main.querySelector('[data-co-id]:not(._cat-section)');
    const coId = idEl && /^\d+$/.test(idEl.getAttribute('data-co-id') || '') ? +idEl.getAttribute('data-co-id') : null;
    if (!coId) return;
    const co = ((window.Companies && Companies.list) || []).find(x => +x.id === coId) || {};
    if (!requiresPO(co.kennitala, co.nafn)) return;
    if (peek(coId)) return;   // þegar komið fyrir þessa heimsókn
    e.preventDefault(); e.stopImmediatePropagation(); e.stopPropagation();
    ask(co.nafn, po => {
      _po[String(coId)] = { po: po, ts: Date.now() };
      setTimeout(() => { const b = document.getElementById('_vw-finish'); if (b) b.click(); }, 60);
    });
  }, true);

  window.BeidniGate = { requiresPO, peek, take, HAS_PO };
  console.log('[patch-264] beiðni-númers skilyrði (Colas) installed');
})();
/* === END BEIÐNI-NÚMERS SKILYRÐI === */
