/* === VERK SOFT-DELETE (Eydd verk) v1 ===
 *
 * Vefrýni-beiðni (Agnar, 2026-06-23): "EYÐA" takki til að fjarlægja heil verk
 * (t.d. verk sem búið er að sækja, eða voru skráð vitlaust) — án þess að eyða
 * gögnum varanlega. Mirrors the existing per-tæki soft-delete ("Eydd tæki",
 * patch 78): the verk gets `status='eytt'`, hverfur af verkstæðis-/afgreiðslu-
 * borðinu, og safnast í samanbrjótanlega "Eydd verk" stiku neðst — endurheimta-
 * nleg. Engin hörð eyðing (bókhald lifir í `solur`).
 *
 * Built as a render-wrapper + DOM augmentation so the central board file
 * (78-counter-workshop-redesign.js) is left untouched — if anything here fails
 * it can only affect the 🗑 button + Eydd-verk section, never the board itself.
 *
 * Companion change: db.js getActiveJobs() now also excludes status 'eytt' so a
 * soft-deleted verk disappears from Afgreiðsla too (not just Verkstæði).
 */
(() => {
  if (window.__verkSoftDeleteInstalled) return;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function eyddVerk() {
    const jobs = (window.DB && DB.cache && Array.isArray(DB.cache.jobs)) ? DB.cache.jobs : [];
    return jobs.filter(j => j && j.status === 'eytt');
  }

  function ready() {
    // Wait until patch 78 has fully installed so we wrap the FINAL Workshop.render.
    if (!window.__counterWorkshopRedesignInstalled || !window.Workshop || typeof Workshop.render !== 'function') {
      return setTimeout(ready, 400);
    }
    if (window.__verkSoftDeleteInstalled) return;
    window.__verkSoftDeleteInstalled = true;

    Workshop._eyddVerkOpen = Workshop._eyddVerkOpen || false;
    Workshop.toggleEyddVerk = function () { Workshop._eyddVerkOpen = !Workshop._eyddVerkOpen; Workshop.render(); };

    // Soft-delete a whole verk → status 'eytt'. Reversible.
    async function softDelete(id) {
      try { if (DB.online && DB.sb) await DB.sb.from('verkbeidnir').update({ status: 'eytt' }).eq('id', id); }
      catch (e) { console.warn('[verk-soft-delete]', e); alert('Villa við að eyða verki: ' + (e.message || e)); return false; }
      const j = (DB.cache.jobs || []).find(x => x.id === id);
      if (j) j.status = 'eytt';
      return true;
    }

    Workshop.deleteVerkGroup = async function (ids) {
      ids = (ids || []).filter(Boolean);
      if (!ids.length) return;
      const first = DB.getJob(ids[0]);
      const label = (first && (first.customer || first.num)) || ('verk #' + ids[0]);
      const n = ids.length;
      const msg = (n > 1 ? ('Eyða ' + n + ' verkum fyrir „' + label + '"?') : ('Eyða verki „' + label + '"?')) +
        '\n\nFer í „Eydd verk" neðst — ekki eytt varanlega, hægt að endurheimta.';
      const ok = (window.Confirm && typeof Confirm.show === 'function')
        ? await Confirm.show(msg, { danger: true, okText: 'Eyða' })
        : window.confirm(msg);
      if (!ok) return;
      let any = false;
      for (const id of ids) { if (await softDelete(id)) any = true; }
      if (any && window.Toast && Toast.show) Toast.show('🗑 Sett í „Eydd verk"');
      try { Workshop.render(); } catch (_) {}
      try { if (window.Counter && Counter.render) Counter.render(); } catch (_) {}
    };

    Workshop.restoreVerk = async function (id) {
      try { if (DB.online && DB.sb) await DB.sb.from('verkbeidnir').update({ status: 'received' }).eq('id', id); }
      catch (e) { console.warn('[verk-soft-delete restore]', e); alert('Villa: ' + (e.message || e)); return; }
      const j = (DB.cache.jobs || []).find(x => x.id === id);
      if (j) j.status = 'received';
      if (window.Toast && Toast.show) Toast.show('↩ Verk endurheimt');
      try { Workshop.render(); } catch (_) {}
      try { if (window.Counter && Counter.render) Counter.render(); } catch (_) {}
    };

    // Wrap the board render: run the original, then add our 🗑 + Eydd-verk UI.
    const origRender = Workshop.render;
    Workshop.render = function () {
      const r = origRender.apply(this, arguments);
      try { augment(); } catch (e) { console.warn('[verk-soft-delete augment]', e); }
      return r;
    };

    function augment() {
      const view = document.getElementById('view-workshop');
      if (!view || view.offsetParent === null) return; // only when Verkstæði is visible

      // 1) Add a 🗑 button to each customer-group's action row (reads the job
      //    ids from the existing "Senda í afgreiðslu" button's onclick).
      view.querySelectorAll('.bw-prow').forEach(prow => {
        if (prow.querySelector('._vsd-del')) return;
        const sendBtn = prow.querySelector('.bw-send');
        const m = sendBtn && /\[([\d,\s]*)\]/.exec(sendBtn.getAttribute('onclick') || '');
        if (!m) return;
        const ids = m[1].split(',').map(s => +s.trim()).filter(Boolean);
        if (!ids.length) return;
        const del = document.createElement('button');
        del.type = 'button';
        del.className = '_vsd-del';
        del.title = 'Eyða verki (fer í „Eydd verk")';
        del.textContent = '🗑';
        del.style.cssText = 'flex:none;height:32px;width:36px;border-radius:9px;border:1px solid #fecaca;background:#fff;color:#dc2626;cursor:pointer;font-size:15px;line-height:1;margin-left:8px';
        del.addEventListener('click', e => { e.stopPropagation(); Workshop.deleteVerkGroup(ids); });
        prow.appendChild(del);
      });

      // 2) Add an "Eydd verk" section into the existing bottom archive bar.
      const arch = view.querySelector('.cw-archive');
      if (!arch || arch.querySelector('._vsd-section')) return;
      const items = eyddVerk();
      const open = Workshop._eyddVerkOpen === true;
      let list;
      if (!items.length) {
        list = '<div style="padding:13px 16px;color:#94a3b8;font-size:12px;text-align:center">Engin eydd verk.</div>';
      } else {
        list = items.map(j => {
          const cust = esc(j.customer || j.num || ('verk #' + j.id));
          const nUnits = (j.units || []).filter(u => u && u.status !== 'eytt').length;
          const num = j.num ? esc(String(j.num).replace(/-V\d+$/, '')) : '';
          return '<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-top:1px solid #f1f5f9">' +
              '<span style="font-size:13px;color:#475569;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
                '<span style="font-weight:600;color:#0f172a">' + cust + '</span>' +
                (num ? '<span style="color:#94a3b8;font-family:var(--mono,monospace);font-size:11px"> · ' + num + '</span>' : '') +
                '<span style="color:#94a3b8"> · ' + nUnits + ' tæki</span>' +
              '</span>' +
              '<button onclick="Workshop.restoreVerk(' + j.id + ')" style="border:1px solid #cbd5e1;background:#fff;border-radius:8px;padding:5px 11px;font-size:12px;cursor:pointer;white-space:nowrap;color:#0f172a">↩ Endurheimta</button>' +
            '</div>';
        }).join('');
      }
      const sec = document.createElement('div');
      sec.className = '_vsd-section';
      sec.style.cssText = 'border-top:2px solid #eef2f7';
      sec.innerHTML =
        '<div onclick="Workshop.toggleEyddVerk()" style="padding:11px 16px;cursor:pointer;display:flex;align-items:center;gap:9px;user-select:none">' +
          '<span>🗑️</span>' +
          '<span style="font-weight:700;flex:1;font-size:13px;color:#0f172a">Eydd verk (' + items.length + ')</span>' +
          '<span style="font-size:12px;color:#64748b">' + (open ? 'Loka ▾' : 'Sjá ▴') + '</span>' +
        '</div>' +
        (open ? '<div style="max-height:40vh;overflow-y:auto;border-top:1px solid #f1f5f9">' + list + '</div>' : '');
      arch.appendChild(sec);
    }

    // Re-render now if Verkstæði is already mounted.
    try { Workshop.render(); } catch (_) {}
    console.log('[patch-234] verk-soft-delete installed — 🗑 Eyða verk + Eydd verk stika');
  }
  ready();
})();
/* === END VERK SOFT-DELETE === */
