/* === COMPANIES DIAGNOSE v1 ===
   TEMPORARY instrumentation patch — logs every event that could be wiping
   the company detail page, so we can finally find the real culprit.

   Listens for:
     • Any innerHTML assignment on #companies-main with a stack trace
     • Companies.load() calls with caller stack
     • Companies.render() calls (wrapped + raw)
     • MutationObserver on #companies-main child-list changes

   To activate: open DevTools console while reproducing the issue.
   Diagnostics will print as `[DIAG]` lines.

   This patch is INERT for normal users — it only logs, doesn't change behavior.
   Remove once the bug is identified. */
(() => {
  if (window.__companiesDiagnoseInstalled) return;
  window.__companiesDiagnoseInstalled = true;

  function shortStack() {
    try {
      const stack = new Error().stack || '';
      // Strip the first 2 lines (Error: and current function) and show next 6
      return stack.split('\n').slice(2, 8).join('\n');
    } catch (_) { return '(no stack)'; }
  }

  function onDetailPage() {
    const main = document.getElementById('companies-main');
    if (!main) return false;
    return !!main.querySelector(
      'button[onclick*="Companies.openEdit"], ' +
      'button[onclick*="Companies.openMap"], ' +
      'button[onclick*="Companies.render"], ' +
      '._cat-section, ._cpr-section, #_ctc-section'
    );
  }
  function onGrid() {
    const main = document.getElementById('companies-main');
    return !!main && !!main.querySelector('.company-grid');
  }

  function tag() {
    return '%c[DIAG ' + new Date().toISOString().slice(11,19) + ']%c';
  }
  function styleHead() { return ['background:#1e40af;color:#fff;padding:2px 6px;border-radius:3px', '']; }

  // ── 1. innerHTML setter hook on #companies-main ───────────────────────────
  function instrumentInnerHtml() {
    const main = document.getElementById('companies-main');
    if (!main || main.__diagInstrumented) { setTimeout(instrumentInnerHtml, 500); return; }
    const proto = Object.getPrototypeOf(main);
    const desc = Object.getOwnPropertyDescriptor(proto, 'innerHTML') ||
                 Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (!desc || !desc.set) return;
    Object.defineProperty(main, 'innerHTML', {
      configurable: true,
      get() { return desc.get.call(this); },
      set(v) {
        const wasOnDetail = onDetailPage();
        const wasOnGrid = onGrid();
        const newHasGrid = String(v||'').includes('company-grid');
        const newHasDetailMark = /Companies\.(openEdit|openMap)|_cat-section|_cpr-section|_ctc-section/.test(String(v||''));
        // Only log when the change is significant (detail → grid, or wipe)
        const significant = wasOnDetail && !newHasDetailMark;
        if (significant) {
          console.log(tag()+' 🚨 DETAIL WIPED · was-detail='+wasOnDetail+' was-grid='+wasOnGrid+' new-grid='+newHasGrid+' new-detail='+newHasDetailMark+'\n'+shortStack(), ...styleHead());
        } else {
          console.log(tag()+' innerHTML← len='+String(v||'').length+' was-detail='+wasOnDetail+' new-grid='+newHasGrid+' new-detail='+newHasDetailMark, ...styleHead());
        }
        return desc.set.call(this, v);
      }
    });
    main.__diagInstrumented = true;
    console.log(tag()+' instrumented #companies-main.innerHTML', ...styleHead());
  }
  instrumentInnerHtml();

  // ── 2. Companies.load + render wrappers ───────────────────────────────────
  function wrapCompanies() {
    if (!window.Companies) { setTimeout(wrapCompanies, 300); return; }
    if (!window.Companies.__diagWrapped) {
      const origLoad = Companies.load;
      if (typeof origLoad === 'function') {
        Companies.load = function() {
          console.log(tag()+' Companies.load() · on-detail='+onDetailPage()+'\n'+shortStack(), ...styleHead());
          return origLoad.apply(this, arguments);
        };
      }
      const origRender = Companies.render;
      if (typeof origRender === 'function') {
        Companies.render = function() {
          console.log(tag()+' Companies.render() · on-detail='+onDetailPage()+' guard-blocked='+!!(window.__companiesEditGuard && window.__companiesEditGuard.blocked && window.__companiesEditGuard.blocked())+'\n'+shortStack(), ...styleHead());
          return origRender.apply(this, arguments);
        };
      }
      const origOpenDetail = Companies.openDetail;
      if (typeof origOpenDetail === 'function') {
        Companies.openDetail = function(id) {
          console.log(tag()+' Companies.openDetail('+id+') · on-detail='+onDetailPage()+'\n'+shortStack(), ...styleHead());
          return origOpenDetail.apply(this, arguments);
        };
      }
      window.Companies.__diagWrapped = true;
      console.log(tag()+' instrumented Companies.{load,render,openDetail}', ...styleHead());
    }
  }
  wrapCompanies();

  // ── 3. MutationObserver on #companies-main ────────────────────────────────
  function observeMain() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(observeMain, 500); return; }
    let prevOnDetail = onDetailPage();
    new MutationObserver((muts) => {
      const nowOnDetail = onDetailPage();
      const nowOnGrid = onGrid();
      if (prevOnDetail && !nowOnDetail) {
        console.log(tag()+' 🚨 LEFT DETAIL VIEW · now-grid='+nowOnGrid+' mutations='+muts.length, ...styleHead());
        muts.slice(0,3).forEach((m,i) => {
          console.log('  mut['+i+'] type='+m.type+' added='+m.addedNodes.length+' removed='+m.removedNodes.length);
        });
      }
      prevOnDetail = nowOnDetail;
    }).observe(main, { childList: true, subtree: false });
    console.log(tag()+' observing #companies-main child mutations', ...styleHead());
  }
  observeMain();

  // ── 4. Public helpers ─────────────────────────────────────────────────────
  window.__diag = {
    on() { console.log(tag()+' diagnose ON', ...styleHead()); },
    state() { return { onDetail: onDetailPage(), onGrid: onGrid(), currentCompanyId: window._currentCompanyId, guardBlocked: window.__companiesEditGuard && window.__companiesEditGuard.blocked && window.__companiesEditGuard.blocked() }; }
  };
  console.log(tag()+' companies-diagnose v1 installed — reproduce the issue then check console for 🚨 lines', ...styleHead());
})();
/* === END COMPANIES DIAGNOSE === */
