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

  // Sækir póstnúmer úr frjálsu heimilisfangi — síðasti gildi 3-stafa strengur
  // á íslenska póstnúmera-bilinu (100–902). Notað til að forfylla reitinn.
  function pcFromAddr(addr) {
    var s = String(addr || ''), re = /(?:^|\D)(\d{3})(?=\D|$)/g, m, best = null;
    while ((m = re.exec(s))) { var n = +m[1]; if (n >= 100 && n <= 902) best = m[1]; }
    return best; // strengur eins og "105" eða null
  }

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

    // 2026-07-14: Payday afhendingarmáti fyrir þennan kúnna (rafrænt / tölvupóstur
    // / bæði). Stýrir því hvernig payday-push afhendir kröfuna. Sjálfgefið (tómt)
    // = rafrænt OG tölvupóstafrit þegar netfang er til (breytt 13.08.2026 —
    // áður rafrænt eingöngu); „Rafrænn reikningur" er valið fyrir félög sem
    // vilja EKKERT póstafrit (t.d. Eignarmiðlunar-óskin). Úttektarskýrsla
    // fylgir alltaf í tölvupósti þegar hún er til.
    (function ensureDeliverySelect() {
      if (!document.getElementById('nf-payday-delivery')) {
        const netf = document.getElementById('nf-netfang');
        const anchor = netf ? (netf.closest('.form-row, .field, .modal-row, .nf-row') || netf.parentElement) : null;
        if (anchor && anchor.parentElement) {
          const wrap = document.createElement('div');
          wrap.id = '_nf-delivery-wrap';
          wrap.style.cssText = 'margin:10px 0';
          wrap.innerHTML =
            '<label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:4px">📤 Payday afhending</label>' +
            '<select id="nf-payday-delivery" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;background:#fff">' +
              '<option value="">Sjálfgefið (rafrænt + tölvupóstafrit ef netfang er til)</option>' +
              '<option value="electronic">🔗 Aðeins rafrænn reikningur (ekkert póstafrit)</option>' +
              '<option value="email">📧 Aðeins tölvupóstur</option>' +
              '<option value="both">🔗 + 📧 Bæði (rafrænt og tölvupóstur)</option>' +
            '</select>' +
            '<div style="font-size:10.5px;color:#94a3b8;margin-top:3px">Bankakrafan fer ALLTAF í heimabankann, óháð þessu vali — veldu „Aðeins rafrænn" fyrir félög sem vilja engan tölvupóst.</div>' +
            '<label style="display:flex;align-items:center;gap:7px;font-size:12.5px;color:#475569;margin-top:8px;cursor:pointer">' +
              '<input type="checkbox" id="nf-skyrsla-med" style="width:15px;height:15px;accent-color:#2563eb">' +
              '📎 Úttektarskýrsla fylgir kröfu (viðhengi á reikningnum — fer rafrænt og í pósti)' +
            '</label>';
          anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
        }
      }
      set('nf-payday-delivery', co.payday_delivery);
      // Hak: NULL/true = skýrslan fylgir (sjálfgefið); false = fylgir ekki.
      const sm = document.getElementById('nf-skyrsla-med');
      if (sm) sm.checked = co.skyrsla_med_krofu !== false;
    })();

    // 2026-07-31: Póstnúmer-reitur — notaður til að raða „Fyrirtæki í þjónustu"
    // eftir akstursleið. Sprautað inn RÉTT á eftir heimilisfangs-reitnum.
    (function ensurePostnumer() {
      if (!document.getElementById('nf-postnumer')) {
        const heim = document.getElementById('nf-heimilisfang');
        const anchor = heim ? (heim.closest('.form-row, .field, .modal-row, .nf-row') || heim.parentElement) : null;
        if (anchor && anchor.parentElement) {
          const wrap = document.createElement('div');
          wrap.id = '_nf-postnumer-wrap';
          wrap.style.cssText = 'margin:10px 0';
          wrap.innerHTML =
            '<label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:4px">📍 Póstnúmer</label>' +
            '<input id="nf-postnumer" type="text" inputmode="numeric" maxlength="3" placeholder="t.d. 105" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:14px;background:#fff">' +
            '<div style="font-size:10.5px;color:#94a3b8;margin-top:3px">3 stafa póstnúmer — notað til að raða eftir akstursleið</div>';
          anchor.parentElement.insertBefore(wrap, anchor.nextSibling);
        }
      }
      // Forfylla: nota vistað póstnúmer, annars lesa úr heimilisfanginu.
      set('nf-postnumer', co.postnumer || pcFromAddr(co.heimilisfang) || '');
      // Lifandi tillaga: þegar heimilisfangi er breytt OG póstnúmer er tómt,
      // fylla það úr nýja heimilisfanginu.
      const heim = document.getElementById('nf-heimilisfang');
      const pn = document.getElementById('nf-postnumer');
      if (heim && pn && !heim._pcWired) {
        heim._pcWired = true;
        heim.addEventListener('input', function () {
          if (!(pn.value || '').trim()) {
            const guess = pcFromAddr(heim.value);
            if (guess) pn.value = guess;
          }
        });
      }
    })();

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
          athugasemdir: get('nf-athugasemdir'),
          payday_delivery: get('nf-payday-delivery') || null,
          skyrsla_med_krofu: !!((document.getElementById('nf-skyrsla-med') || { checked: true }).checked),
          postnumer: get('nf-postnumer') || null
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
          // Nafnið ÁÐUR en við skrifum — tækin hanga á því (sjá cascade neðar).
          const prevRow = Companies.list.find(c => c.id === id) || {};
          const oldNafn = prevRow.nafn;

          const r = await sb.from('fyrirtaeki').update(data).eq('id', id).select().single();
          if (r.error) throw r.error;

          // 2026-07-30 — LÁTA NAFNBREYTINGU FYLGJA TÆKJUNUM.
          // `uttaeki` á ENGAN staðar-lykil; tækjalistinn á fyrirtækjaspjaldinu er
          // fundinn með nákvæmum strengjasamanburði (`features.js:104`
          // `u.client === c.nafn`, sömuleiðis 224:161/171). Að endurnefna
          // fyrirtæki hér skildi því tækin eftir á GAMLA nafninu og spjaldið sagði
          // „engin tæki skráð" — og þegar sjálfvirka tækjagerðin sá gatið bjó hún
          // til NÝ placeholder-tæki undir nýja nafninu, svo úr varð bæði munaðar-
          // laus tæki OG tvítök (staðfest á fyrirtæki 1129: „Stafræn Prentsmiðja"
          // → „Prentun ehf", 5 tæki strönduð + 5 ný búin til).
          // Sama cascade og sameiningin í 157-allir-vidskiptavinir.js:922 gerir.
          if (oldNafn && nafn && oldNafn !== nafn) {
            for (const tafla of ['uttaeki', 'lanstaeki']) {
              try {
                const c = await sb.from(tafla).update({ client: nafn }).eq('client', oldNafn);
                if (c && c.error) console.warn('[14] cascade ' + tafla + ':', c.error.message);
              } catch (e) { console.warn('[14] cascade ' + tafla + ':', e && e.message); }
            }
            try { if (window.DB && DB.refresh) DB.refresh(); } catch (_) {}
          }

          const idx = Companies.list.findIndex(c => c.id === id);
          if (idx >= 0) Companies.list[idx] = Object.assign({}, Companies.list[idx], r.data);
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
