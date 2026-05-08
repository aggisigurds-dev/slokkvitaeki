/* === GJALDFALLIÐ GROUP v1 === */
/* In Þjónustutæki (view-field), the "Gjaldfallið" list rendered one card per
 * tæki, so a company with 5 due tæki took 5 rows. This patch groups by
 * customer/company. Each company row shows: name + total tæki count + earliest
 * next-inspection date, with a single "Opna fyrirtæki" button.
 *
 * Implementation: wraps Field.render. After the original runs we find the
 * "Gjaldfallið" section in #field-alerts and replace its body with grouped
 * rows. Útrunnið (overdue) section is left untouched — it's typically smaller
 * and time-critical, useful per-tæki.
 */
(() => {
  if (window.__gjaldfallidGroupInstalled) return;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function fmtDate(d) {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('is-IS'); } catch (_) { return String(d); }
  }

  function regroup() {
    const ae = document.getElementById('field-alerts');
    if (!ae) return;
    const due = (window.DB && DB.getDue) ? DB.getDue() : [];

    // Find the "Gjaldfallið" title element by text. The original markup is:
    // <div class="fcol-title" style="margin-top:16px">Gjaldfallið <span class="fcol-count">N</span></div>
    let titleEl = null;
    ae.querySelectorAll('.fcol-title').forEach(el => {
      if (titleEl) return;
      if ((el.textContent || '').trim().startsWith('Gjaldfallið')) titleEl = el;
    });
    if (!titleEl) return;

    // Update count: number of distinct customers, not number of tæki
    const distinctCustomers = new Set(due.map(u => u.client || ''));
    const countEl = titleEl.querySelector('.fcol-count');
    if (countEl) countEl.textContent = String(distinctCustomers.size);

    // Find the body that follows the title — could be one or many alert-card.due elements
    // or one empty-state. Replace whatever is there with grouped output.
    // We collect all sibling elements until the next .fcol-title or end.
    const toRemove = [];
    let n = titleEl.nextElementSibling;
    while (n && !n.classList.contains('fcol-title')) {
      toRemove.push(n);
      n = n.nextElementSibling;
    }
    toRemove.forEach(el => el.remove());

    if (!due.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.style.padding = '20px';
      empty.innerHTML = '<div class="es-sub">Engin tæki gjaldfallin</div>';
      titleEl.parentNode.insertBefore(empty, titleEl.nextSibling);
      return;
    }

    // Group due units by client
    const byClient = {};
    due.forEach(u => {
      const k = u.client || '';
      (byClient[k] = byClient[k] || []).push(u);
    });
    const sortedClients = Object.keys(byClient).sort((a, b) => a.localeCompare(b, 'is'));
    const companiesList = (window.Companies && Companies.list) || [];

    // Insert grouped rows in reverse so order is alphabetical (we always insert after titleEl)
    const frag = document.createDocumentFragment();
    sortedClients.forEach(clientName => {
      const units = byClient[clientName];
      const earliest = units.map(u => u.next_insp).filter(Boolean).sort()[0];
      const co = companiesList.find(c => (c.nafn || '').trim() === clientName.trim());
      const card = document.createElement('div');
      card.className = 'alert-card due';
      const nextLine = earliest ? ` · næsta skoðun ${fmtDate(earliest)}` : '';
      const btnHtml = co
        ? `<button class="btn btn-outline btn-sm" onclick="window._openCompanySafe?window._openCompanySafe(${co.id}):(App.switchView('companies'),setTimeout(function(){Companies.openDetail(${co.id});},200));">Opna fyrirtæki</button>`
        : '';
      card.innerHTML =
        `<div class="ac-name">${esc(clientName)}</div>` +
        `<div class="ac-meta">${units.length} tæki${nextLine}</div>` +
        `<div class="ac-acts">${btnHtml}</div>`;
      frag.appendChild(card);
    });
    titleEl.parentNode.insertBefore(frag, titleEl.nextSibling);
  }

  function install() {
    if (!window.Field || typeof Field.render !== 'function') {
      setTimeout(install, 300);
      return;
    }
    if (window.__gjaldfallidGroupInstalled) return;
    window.__gjaldfallidGroupInstalled = true;
    const orig = Field.render;
    Field.render = function() {
      orig.apply(this, arguments);
      setTimeout(regroup, 0);
    };
    // Also handle the case where Field.render was already called before we installed
    setTimeout(regroup, 100);
    console.log('[gjaldfallid-group] installed');
  }
  install();
})();
/* === END GJALDFALLIÐ GROUP v1 === */
