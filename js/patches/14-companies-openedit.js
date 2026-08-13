/* === COMPANIES OPENEDIT v1 === */
/* Companies.openDetail() renders a "Breyta" button that calls
 * Companies.openEdit(id), but openEdit was never defined. Clicking it
 * threw ReferenceError and the page silently froze.
 *
 * This patch provides openEdit by reusing the existing modal-nyfyrirtaeki
 * form. It prefills the inputs, swaps the footer "Vista fyrirtæki" button
 * for an Update version, and on save runs UPDATE on supabase, refreshes
 * Companies.list, and re-renders the detail view.
 */
(() => {
  if (window.__companiesOpenEditInstalled) return;
  window.__companiesOpenEditInstalled = true;

  function ensure() {
    if (!window.Companies) { setTimeout(ensure, 300); return; }
    if (Companies.openEdit) return;
    Companies.openEdit = openEdit;
    console.log('[companies-openedit] installed');
  }

  async function openEdit(id) {
    const co = (Companies.list || []).find(c => c.id === id);
    if (!co) {
      if (window.Toast && Toast.show) Toast.show('Fyrirtæki fannst ekki');
      return;
    }
    const modal = document.getElementById('modal-nyfyrirtaeki');
    if (!modal) {
      alert('Edit-form not found');
      return;
    }
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val == null ? '' : val; };
    set('nf-nafn', co.nafn);
    set('nf-kt', co.kennitala);
    set('nf-simi', co.simi);
    set('nf-netfang', co.netfang);
    set('nf-tengiliður', co.tengiliður);
    set('nf-heimilisfang', co.heimilisfang);
    set('nf-athugasemdir', co.athugasemdir);

    const titleEl = modal.querySelector('h2');
    const origTitle = titleEl ? titleEl.textContent : null;
    if (titleEl) titleEl.textContent = 'Breyta fyrirtæki';

    const saveBtn = modal.querySelector('button.btn-primary');
    let origOnclick = null;
    let origText = null;
    if (saveBtn) {
      origOnclick = saveBtn.getAttribute('onclick');
      origText = saveBtn.textContent;
      saveBtn.removeAttribute('onclick');
      saveBtn.textContent = 'Vista breytingar';
    }

    function restore() {
      if (titleEl && origTitle != null) titleEl.textContent = origTitle;
      if (saveBtn) {
        if (origOnclick) saveBtn.setAttribute('onclick', origOnclick);
        if (origText) saveBtn.textContent = origText;
        saveBtn.onclick = null;
      }
    }

    if (saveBtn) {
      saveBtn.onclick = async function () {
        const get = id => ((document.getElementById(id) || {}).value || '').trim();
        const nafn = get('nf-nafn');
        if (!nafn) {
          if (window.Toast && Toast.show) Toast.show('Sláðu inn nafn');
          return;
        }
        const data = {
          nafn,
          kennitala: get('nf-kt'),
          simi: get('nf-simi'),
          netfang: get('nf-netfang'),
          tengiliður: get('nf-tengiliður'),
          heimilisfang: get('nf-heimilisfang'),
          athugasemdir: get('nf-athugasemdir')
        };
        const sb = (window.DB && DB.sb) || null;
        if (!sb) {
          if (window.Toast && Toast.show) Toast.show('Engin nettenging');
          return;
        }
        saveBtn.disabled = true;
        const prev = saveBtn.textContent;
        saveBtn.textContent = 'Vistar...';
        try {
          const r = await sb.from('fyrirtaeki').update(data).eq('id', id).select().single();
          if (r.error) throw r.error;
          const idx = Companies.list.findIndex(c => c.id === id);
          if (idx >= 0) Companies.list[idx] = Object.assign({}, Companies.list[idx], r.data);
          // Keep this company's tæki linked across the rename — uttaeki/lanstaeki
          // match the company only by `client` name, so a rename would orphan them.
          if (window.DB && DB.renameClientCascade && (co.nafn || '') !== nafn) {
            const cr = await DB.renameClientCascade(co.nafn, nafn);
            if (cr && cr.ok === false && window.Toast && Toast.show) {
              Toast.show('⚠ Nafn vistað, en tæki fylgdu ekki með — athugaðu nettengingu');
            }
          }
          restore();
          if (window.Modal && Modal.close) Modal.close('modal-nyfyrirtaeki');
          if (window.Toast && Toast.show) Toast.show('✓ ' + nafn + ' uppfært');
          setTimeout(() => Companies.openDetail(id), 100);
        } catch (e) {
          if (window.Toast && Toast.show) Toast.show('Villa: ' + (e.message || e));
          else alert('Villa: ' + (e.message || e));
          saveBtn.disabled = false;
          saveBtn.textContent = prev;
        }
      };
    }

    const closeX = modal.querySelector('.modal-x');
    if (closeX) {
      const origClose = closeX.onclick;
      closeX.onclick = function (e) {
        restore();
        if (origClose) return origClose.call(this, e);
        if (window.Modal && Modal.close) Modal.close('modal-nyfyrirtaeki');
      };
    }
    const cancelBtn = modal.querySelector('.modal-ft .btn-outline');
    if (cancelBtn) {
      const origCancel = cancelBtn.onclick;
      cancelBtn.onclick = function (e) {
        restore();
        if (origCancel) return origCancel.call(this, e);
        if (window.Modal && Modal.close) Modal.close('modal-nyfyrirtaeki');
      };
    }

    if (window.Modal && Modal.open) Modal.open('modal-nyfyrirtaeki');
    else { modal.classList.add('open'); modal.style.display = ''; }
  }

  ensure();
})();
/* === END COMPANIES OPENEDIT v1 === */
