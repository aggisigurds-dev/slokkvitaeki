/* === HANDVIRKT „NÝTT" MERKI v1 (2026-07-28) ===
 *
 * Ósk Agnars: takki á fyrirtækjaprófílnum — við hlið „Taka úr þjónustu" — sem
 * kveikir/slekkur á NÝTT-merkinu handvirkt, og sía í BÁÐUM yfirlitunum sem
 * grípur það (Brunakerfi yfirlit #272 og Fyrirtæki í Þjónustu #153).
 *
 * Áður var NÝTT eingöngu AFLEITT í brunayfirlitinu (engin skýrsla = bíður
 * fyrstu skoðunar). Það nær ekki yfir kúnna sem Agnar veit að er nýr en á
 * þegar eina skýrslu, né yfir slökkvitækja-hliðina þar sem merkið var ekki til.
 *
 * Geymsla: AppSettings.arsskodun_customers[<fyrirtaeki_id>].nytt_manual
 *   — sama blob og akstur/urgent/priority/subscribed lifa í, svo merkið
 *     samstillist milli tækja og BÁÐAR síðurnar lesa sama gildið.
 *   — false (ekki delete) þegar slökkt er: AppSettings djúp-merge-ar, svo
 *     delete myndi skila gamla gildinu (sama regla og patch 153:1251).
 *
 * Takkinn er klónaður af Breyta-hnappnum eins og patch 280 gerir, svo hann
 * falli inn í röðina. Kveikt = ✓ + fjólublár texti (#7c3aed, sami og merkið).
 *
 * Public: window.NyttBadge = { is, set, badgeHtml }
 */
(() => {
  if (window.__nyttBadgeInstalled) return;
  window.__nyttBadgeInstalled = true;

  const STORAGE_KEY = 'arsskodun_customers';
  const FLAG = 'nytt_manual';
  const PURPLE = '#7c3aed';

  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[nytt]', m); }
  function coName(coId) {
    const co = ((window.Companies && Companies.list) || []).find(c => String(c.id) === String(coId));
    return co ? (co.nafn || ('#' + coId)) : ('#' + coId);
  }

  // ── lestur / skrif ────────────────────────────────────────────────────────
  function is(coId) {
    if (coId == null) return false;
    try {
      const map = (window.AppSettings && AppSettings.path && AppSettings.path(STORAGE_KEY)) || {};
      const e = map[String(coId)];
      return !!(e && e[FLAG] === true);
    } catch (_) { return false; }
  }
  async function set(coId, on) {
    if (!window.AppSettings || !AppSettings.save) { toast('Engar stillingar tiltækar'); return false; }
    // AÐEINS þessi eini lykill er skrifaður — AppSettings djúp-merge-ar, svo
    // merking á einu fyrirtæki yfirskrifar ekki nýlega breytingu á öðru
    // (sama race-vörn og patch 153:1257).
    try {
      const ok = await AppSettings.save({ [STORAGE_KEY]: { [String(coId)]: { [FLAG]: !!on } } });
      return ok !== false;
    } catch (_) { return false; }
  }

  // Merkið sjálft — sama útlit og NÝTT-merkið sem patch 272 teiknar nú þegar.
  function badgeHtml(title) {
    return '<span class="_nytt-badge" title="' + (title || 'Merkt NÝTT á fyrirtækjaprófílnum') + '" ' +
      'style="margin-left:7px;padding:1px 7px;border-radius:99px;background:' + PURPLE + ';color:#fff;' +
      'font-size:9.5px;font-weight:800;letter-spacing:.03em;vertical-align:middle;white-space:nowrap">NÝTT</span>';
  }

  // ── takkinn á fyrirtækjaprófílnum ─────────────────────────────────────────
  function paint(btn, on) {
    btn.dataset.nytt = on ? '1' : '0';
    btn.textContent = on ? '✓ Nýtt' : '🆕 Nýtt';
    btn.style.color = on ? PURPLE : '';
    btn.style.fontWeight = on ? '800' : '';
    btn.title = on
      ? 'Merkt NÝTT — birtist með fjólubláu merki og undir „Nýtt"-síunni í Brunakerfi yfirliti og Fyrirtæki í Þjónustu. Smelltu til að taka af.'
      : 'Merkja sem NÝTT — birtist þá undir „Nýtt"-síunni í báðum yfirlitunum';
  }

  function injectButton() {
    const main = document.getElementById('companies-main');
    if (!main) return;
    const editBtn = main.querySelector('button[onclick^="Companies.openEdit"]');
    if (!editBtn) return;
    const actionsRow = editBtn.parentElement;
    if (!actionsRow || actionsRow.querySelector('._co-nytt-toggle')) return;
    const m = editBtn.getAttribute('onclick').match(/openEdit\((\d+)\)/);
    if (!m) return;
    const coId = +m[1];

    const btn = document.createElement('button');
    btn.type = 'button';
    // Sama útlit og systkinin í röðinni (ósk Agnars: „looking similar to the
    // others in that line") — klónum class + inline-stíl af Breyta-hnappnum.
    btn.className = (editBtn.className || 'btn btn-outline btn-sm') + ' _co-nytt-toggle';
    const es = editBtn.getAttribute('style');
    if (es) btn.setAttribute('style', es);
    paint(btn, is(coId));

    btn.addEventListener('click', async e => {
      e.preventDefault(); e.stopPropagation();
      const on = btn.dataset.nytt === '1';
      const next = !on;
      const label = btn.textContent;
      btn.disabled = true; btn.textContent = '…';
      const ok = await set(coId, next);
      btn.disabled = false;
      if (!ok) { btn.textContent = label; toast('⚠ Vistun mistókst'); return; }
      paint(btn, next);
      toast(next ? '🆕 ' + coName(coId) + ' merkt NÝTT' : 'NÝTT-merki tekið af ' + coName(coId));
      // Yfirlitin endurteikna sig sjálf við næstu opnun; ýtum á þau ef opin.
      ['BrunakerfiYfirlit', 'Arsskodun', 'ArsSkodun'].forEach(k => {
        try { const o = window[k]; if (o && typeof o.reload === 'function') o.reload(); } catch (_) {}
      });
    });

    // Vinstra megin við þjónustu-takkann (þar sem Agnar merkti); ef hann er
    // ekki kominn enn, þá vinstra megin við Breyta.
    const svcBtn = actionsRow.querySelector('._co-svc-toggle');
    actionsRow.insertBefore(btn, svcBtn || editBtn);
  }

  function watch() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(watch, 500); return; }
    new MutationObserver(() => injectButton()).observe(main, { childList: true, subtree: true });
    injectButton();
  }
  watch();

  window.NyttBadge = { is, set, badgeHtml };
  console.log('[nytt-badge] installed');
})();
/* === END HANDVIRKT „NÝTT" MERKI === */
