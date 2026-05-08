/* === SEND BACK TO WORKSHOP v1 ===
 *
 * Þegar verkbeiðni er merkt sem „Tilbúið" (status='ready') og bíður
 * afhendingar, þarf afgreiðslu-/verkstæðisfólk stundum að senda hana
 * AFTUR til verkstæðis — t.d. ef:
 *   • Tæki er í raun ónýtt þegar viðskiptavinur kemur að sækja
 *   • Þrýstingur féll á næstu klukkustund
 *   • Vantar varahluti sem þarf að rukka aukalega fyrir
 *   • Búrðu hleðslu sem kláraðist en var ekki skráð
 *
 * Patch bætir við „↩ Verkstæði" takka á hverri Tilbúin-rúðu (græni
 * hlutinn í Counter view, og Tilbúin-listanum á hliðarvalmynd
 * Afgreiðsla-tab). Smellur:
 *   1. Spyr um ástæðu (frjáls texti)
 *   2. Setur verkbeidnir.status = 'received' (Móttekin) þannig að verkið
 *      birtist aftur í verkstæðislistanum
 *   3. Bætir „[date · Aftur til verkstæðis] reason" við í athugasemdir
 *      (notes) reitnum
 *
 * Verkstæðismaður tekur svo við og notar EXISTING patch 103 takka
 * (✏️ Breyta · 📝 Athugasemd · 🚫 Ónýtt) til að skrá varahluti og merkja
 * tæki ónýtt.
 *
 * Bætir einnig við aðferðum:
 *   window.Counter.sendBackToWorkshop(id)  — bein API
 */
(() => {
  if (window.__sendBackInstalled) return;
  window.__sendBackInstalled = true;

  function getSB() { return (window.DB && window.DB.sb) || null; }
  function todayISO() { return new Date().toISOString().slice(0, 10); }

  async function sendBackToWorkshop(id) {
    const SB = getSB();
    if (!SB) { alert('Engin gagnabankatenging'); return; }
    const reason = prompt(
      'Hvers vegna er verkið sent aftur til verkstæðis?\n\n' +
      'Dæmi: „Tæki ónýtt", „Vantar varahluti", „Þrýstingur féll", ' +
      '„Bæta við hleðslu". Verkstæðismaður getur þá merkt tæki sem ónýtt ' +
      'eða skráð athugasemd með varahlutum sem þarf að rukka fyrir.',
      ''
    );
    if (reason === null) return; // user cancelled

    // Read current notes
    const cur = await SB.from('verkbeidnir').select('notes,num').eq('id', id).single();
    if (cur.error) { alert('Villa: ' + cur.error.message); return; }
    const oldNotes = (cur.data && cur.data.notes) || '';
    const num = (cur.data && cur.data.num) || ('#' + id);
    const stamp = '[' + todayISO() + ' · Aftur til verkstæðis] ' + (reason.trim() || '(engin ástæða)');
    const newNotes = oldNotes ? (oldNotes + '\n\n' + stamp) : stamp;

    // 'received' = Móttekin column (back at workshop). 'inprogress' if
    // they want it to skip the queue and go straight to "Í vinnslu" — but
    // 'received' is the conservative default since something changed.
    const r = await SB.from('verkbeidnir').update({
      status: 'received',
      notes: newNotes
    }).eq('id', id);
    if (r.error) { alert('Villa: ' + r.error.message); return; }

    // Update local cache so UI re-renders without a full reload
    if (window.DB && window.DB.cache && Array.isArray(window.DB.cache.jobs)) {
      const job = window.DB.cache.jobs.find(j => j.id === id);
      if (job) { job.status = 'received'; job.notes = newNotes; }
    }
    if (window.Toast && Toast.show) {
      Toast.show('↩ ' + num + ' sent aftur til verkstæðis');
    }
    // Trigger refresh
    if (window.App && typeof App.refreshAll === 'function') App.refreshAll();
    if (window.Counter && typeof Counter.render === 'function') Counter.render();
  }

  // Public API
  if (!window.Counter) window.Counter = {};
  window.Counter.sendBackToWorkshop = sendBackToWorkshop;

  // ── Inject "↩ Verkstæði" button into ready cards ──────────────────────
  function injectButton(card) {
    if (!card || card.dataset._sbwDone === '1') return;
    // Find the "Sótt ✓" sibling button to position next to it
    const sottBtn = card.querySelector('button[onclick*="markCollected"]');
    if (!sottBtn) return;
    card.dataset._sbwDone = '1';
    // Extract job id from the markCollected onclick
    const m = sottBtn.getAttribute('onclick').match(/markCollected\((\d+)\)/);
    if (!m) return;
    const jobId = parseInt(m[1], 10);

    const btn = document.createElement('button');
    btn.className = 'btn btn-sm btn-outline _sbw-btn';
    btn.type = 'button';
    btn.title = 'Senda aftur til verkstæðis (varahlutur, ónýtt, o.s.frv.)';
    btn.style.cssText = 'flex-shrink:0;align-self:center;padding:4px 8px;background:#fff;border:1px solid #fbbf24;color:#92400e;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;white-space:nowrap;margin-right:4px';
    btn.innerHTML = '↩ Verkstæði';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      sendBackToWorkshop(jobId);
    });
    // Insert BEFORE the "Sótt ✓" button so the destructive-ish "Sótt ✓"
    // remains rightmost / primary.
    sottBtn.parentNode.insertBefore(btn, sottBtn);
  }

  function decorate() {
    // Counter view ready cards (green column)
    document.querySelectorAll('button[onclick*="Counter.markCollected"]').forEach(btn => {
      const card = btn.closest('div');
      if (card) injectButton(card);
    });
    // Sidebar "Tilbúið til afhendingar" panel (modal.js + sidebar)
    document.querySelectorAll('.ready-item').forEach(injectButton);
  }

  // Watch the body for new ready cards being rendered
  function attach() {
    let _t = 0;
    new MutationObserver(() => {
      clearTimeout(_t);
      _t = setTimeout(decorate, 100);
    }).observe(document.body, { childList: true, subtree: true });
    decorate();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }

  console.log('[send-back-to-workshop] installed — ↩ Verkstæði button on Tilbúin cards');
})();
/* === END SEND BACK TO WORKSHOP v1 === */
