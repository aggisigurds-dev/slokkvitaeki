/* Fyrirtækjaþjónusta — block ALL realtime re-renders while view is open.
 *
 * Vandinn (v1 var of slappur): Hver realtime breyting í uttaeki /
 * verkbeidnir / lanstaeki / dagskra / fyrirtaeki kallaði Companies.render(),
 * sem þurrkar #companies-main innerHTML algerlega. Ef notandi var staddur
 * á fyrirtækis-detail þá hrapaði detail-síðan og notandi þurfti að leita
 * fyrirtækið uppi aftur.
 *
 * Fyrri lausn (v1) treysti á að notandi væri með input í focus eða modal
 * opinn. Það er ekki nóg — bara það að skoða detail-síðu (skrolla, lesa)
 * eyðilegðist líka.
 *
 * Ný lausn (v2): aldrei láta sjálfvirka renderar þurrka detail-síðuna.
 *   1. Wrap Companies.render — ef view-companies er active og notandi
 *      er á DETAIL-síðu (þ.e.a.s. #companies-main inniheldur ekki
 *      `.company-grid`), þá hopp yfir og setjum render í biðröð.
 *   2. Þegar notandi fer aftur í gridið (smellir „← Til baka" eða
 *      switchView keyrir Companies.load), kemur biðraða-renderið inn
 *      sjálfvirkt.
 *   3. Þegar notandi er á gridi en með opinn input/modal — sami guard
 *      og áður (frá v1).
 *
 * Þetta er „pessimískur" guard sem hyggur að notandi vilji ekki að
 * detail-síðan endurhleðist nokkurn tíma sjálfkrafa. Manuell „🔄
 * Endurnýja" virkjar með window.__companiesEditGuard.forceRefresh().
 */
(() => {
  if (window.__companiesEditGuardInstalled) return;
  window.__companiesEditGuardInstalled = true;

  let _isEditing = false;
  let _editingTimer = null;
  let _queuedRender = false;
  let _queuedListRefresh = false;
  let _lastFocusTime = 0;

  function viewActive() {
    return !!document.getElementById('view-companies')?.classList.contains('active');
  }

  function onDetailPage() {
    // We're on detail when the grid is gone AND a detail-page marker is
    // present. Without the second check we'd also report "detail" during
    // initial load (when main is empty or only has a loading spinner),
    // which would block the first Companies.render() call and leave the
    // page permanently in a loading state.
    const main = document.getElementById('companies-main');
    if (!main) return false;
    if (main.querySelector('.company-grid')) return false; // grid is showing
    // Detail-page markers: the edit button, a back button, or the company
    // attachments section that only renders on detail.
    return !!main.querySelector(
      'button[onclick*="Companies.openEdit"], ' +
      'button[onclick*="Companies.openMap"], ' +
      'button[onclick*="Companies.render"], ' +
      '._cat-section, ._cpr-section, #_ctc-section'
    );
  }

  function shouldBlock() {
    if (!viewActive()) return false;
    // Always block while on a detail page (so user keeps their context).
    if (onDetailPage()) return true;
    // On grid: only block if user is actively editing or has a modal open.
    return _isEditing;
  }

  function isInsideCompaniesView(el) {
    if (!el || !el.closest) return false;
    return !!el.closest('#view-companies, .company-detail, ._cl_wrap, [class*="modal"]:not([class*="modal-floorplan"])');
  }

  function setEditing(on) {
    if (on) {
      _isEditing = true;
      _lastFocusTime = Date.now();
      clearTimeout(_editingTimer);
    } else {
      clearTimeout(_editingTimer);
      _editingTimer = setTimeout(() => {
        _isEditing = false;
        flushQueued();
      }, 1500);
    }
  }

  function flushQueued() {
    if (shouldBlock()) return;
    if (_queuedRender && window.Companies && typeof window.Companies.render === 'function' && !window.Companies.render.__inGuard) {
      _queuedRender = false;
      try { window.Companies.render(); } catch (_) {}
    }
    if (_queuedListRefresh && typeof window.refreshCompaniesList === 'function') {
      _queuedListRefresh = false;
      try { window.refreshCompaniesList(); } catch (_) {}
    }
  }

  document.addEventListener('focusin', e => {
    const t = e.target;
    if (!t || !t.tagName) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && isInsideCompaniesView(t)) setEditing(true);
  }, true);
  document.addEventListener('focusout', e => {
    const t = e.target;
    if (!t || !t.tagName) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && isInsideCompaniesView(t)) setEditing(false);
  }, true);

  const modalObs = new MutationObserver(() => {
    const openModal = document.querySelector('[role="dialog"]:not([style*="display: none"]), .modal.open, ._vbu_modal, ._cl_detail_open, #_bulkadd_modal');
    if (openModal && viewActive()) {
      setEditing(true);
    } else if (!openModal && _isEditing && Date.now() - _lastFocusTime > 500) {
      const stillFocused = document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && isInsideCompaniesView(document.activeElement);
      if (!stillFocused) setEditing(false);
    }
  });
  modalObs.observe(document.body, { childList: true, subtree: true });

  // Track when grid disappears → detail opened. When grid reappears (user
  // went back) flush any queued realtime renders.
  let _wasOnDetail = false;
  function gridStateObserver() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(gridStateObserver, 800); return; }
    new MutationObserver(() => {
      const onDet = onDetailPage();
      if (_wasOnDetail && !onDet) {
        // Returned to grid — fire any pending updates.
        flushQueued();
      }
      _wasOnDetail = onDet;
    }).observe(main, { childList: true });
    _wasOnDetail = onDetailPage();
  }
  gridStateObserver();

  // Wrap Companies.render.
  function wrapRender() {
    if (!window.Companies || typeof window.Companies.render !== 'function') return false;
    if (window.Companies.render.__editGuardWrapped) return true;
    const orig = window.Companies.render;
    const wrapped = function () {
      // Always allow render if view is NOT active — it's likely a background
      // re-render before the user navigates there.
      if (!viewActive()) {
        wrapped.__inGuard = true;
        try { return orig.apply(this, arguments); }
        finally { wrapped.__inGuard = false; }
      }
      if (shouldBlock()) {
        _queuedRender = true;
        return undefined;
      }
      wrapped.__inGuard = true;
      try { return orig.apply(this, arguments); }
      finally { wrapped.__inGuard = false; }
    };
    wrapped.__editGuardWrapped = true;
    if (orig._clFixed) wrapped._clFixed = true;
    window.Companies.render = wrapped;
    console.log('[companies-edit-guard] Companies.render wrapped');
    return true;
  }

  function wrapListRefresh() {
    if (typeof window.refreshCompaniesList !== 'function') return false;
    if (window.refreshCompaniesList.__editGuardWrapped) return true;
    const orig = window.refreshCompaniesList;
    const wrapped = function () {
      if (shouldBlock()) {
        _queuedListRefresh = true;
        return undefined;
      }
      return orig.apply(this, arguments);
    };
    wrapped.__editGuardWrapped = true;
    window.refreshCompaniesList = wrapped;
    console.log('[companies-edit-guard] refreshCompaniesList wrapped');
    return true;
  }

  function init() {
    const rOk = wrapRender();
    const lOk = wrapListRefresh();
    if (!rOk || !lOk) setTimeout(init, 500);
  }
  init();

  window.__companiesEditGuard = {
    isEditing: () => _isEditing,
    onDetail: onDetailPage,
    blocked: shouldBlock,
    forceRefresh: () => {
      _isEditing = false;
      _queuedRender = false;
      _queuedListRefresh = false;
      if (window.Companies && window.Companies.render) {
        if (window.Companies.load) window.Companies.load();
        else window.Companies.render();
      }
    }
  };

  console.log('[companies-edit-guard] v2 installed — detail-page protected');
})();
