/* === ÚTFYLLT SKJÖL Á KÚNNANN + BRUNAKERFI SKÝRSLU-TAKKI ===
 *
 * Ósk Agnars 2026-07-10 (Bílabúð Benna dæmið): skýrsla fyllt út í Samningar-
 * flipanum („Vista í kerfi" → AppSettings.skjalasnidmat_filled) sást hvergi
 * nema þar. Nú:
 *
 *  1. FYRIRTÆKJAPRÓFÍLL: „📑 Samningar & útfyllt skjöl" spjald á kúnnasíðunni
 *     (companies-main) — öll útfyllt skjöl sem eiga kt eða nafn kúnnans,
 *     📝 Opna → prenta/vista PDF/breyta (DocTemplates.openFilled).
 *     (Sala/Fyrri viðskipti fékk sama í patch 253.)
 *
 *  2. BRUNAKERFISÞJÓNUSTA (147): prófunar-formatið FLUTT á síðuna sjálfa —
 *     nýr „📄 Skýrsla" takki í tækjastikunni opnar Ársskoðun brunakerfa
 *     (viðtökupróf, seed_arsskodun_brunakerfa) FORFYLLT fyrir valið fyrirtæki
 *     (verkkaupi/kt/heimilisfang/sími/tengiliður). Skýrslan vistast tengd
 *     kúnnanum (customer+kennitala í filled-færslunni) og birtist því á
 *     prófílnum, í Sölu og í skjöl-dálki síðunnar.
 *     Takkarnir sem Agnar X-aði (🔗 Afrita tengil · 📤 Senda starfsmanni ·
 *     📚 Skills) eru faldir — virknin er óbreytt á bak við (ekkert fjarlægt).
 *
 *  3. Neðst á Brunakerfisþjónustu, við hlið „Vistuð tilboð": „📄 Vistaðar
 *     skýrslur" — allar útfylltar prófunarskýrslur, nýjast efst, 📝 Opna
 *     (þaðan prentast/vistast sem PDF eins og tilboðin).
 */
(() => {
  if (window.__utfylltSkjolInstalled) return;
  window.__utfylltSkjolInstalled = true;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function ktDigits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function nrm(s) { return String(s || '').trim().toLowerCase(); }
  function fmtD(iso) { if (!iso) return ''; const d = new Date(iso); return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear(); }
  function listFilled() {
    try { return (window.DocTemplates && DocTemplates.listFilled && DocTemplates.listFilled()) || []; } catch (_) { return []; }
  }
  // Skjöl kúnnans: kt-match (áreiðanlegast) eða nákvæmt nafn.
  function docsFor(kt, nafn) {
    const kd = ktDigits(kt), nn = nrm(nafn);
    if (kd.length !== 10 && !nn) return [];
    return listFilled().filter(r => {
      const rk = ktDigits(r.kennitala);
      if (kd.length === 10 && kd !== '9999999999' && rk === kd) return true;
      return nn && nrm(r.customer) === nn;
    }).sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
  }
  function docRow(r) {
    return '<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #f1f5f9">' +
      '<span style="font-size:16px">📑</span>' +
      '<div style="flex:1;min-width:0">' +
        '<div style="font-size:12.5px;font-weight:600;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(r.name || r.template_name || 'Skjal') + '</div>' +
        '<div style="font-size:10.5px;color:#94a3b8">' + esc(r.template_name || '') + (r.customer ? ' · ' + esc(r.customer) : '') + ' · ' + esc(fmtD(r.updated_at || r.created_at)) + '</div>' +
      '</div>' +
      '<button class="_ufs-open" data-fid="' + esc(r.id) + '" type="button" style="padding:4px 10px;background:#fff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;white-space:nowrap">📝 Opna</button>' +
      '<button class="_ufs-send" data-fid="' + esc(r.id) + '" type="button" title="Senda skýrsluna í tölvupósti (PDF-viðhengi)" style="margin-left:6px;padding:4px 10px;background:#fff;color:#0f766e;border:1px solid #99f6e4;border-radius:5px;cursor:pointer;font:inherit;font-size:11px;white-space:nowrap">📧 Senda</button>' +
    '</div>';
  }
  async function emailForKt(kt) {
    const sb = (window.DB && DB.sb) || null;
    const d = ktDigits(kt);
    if (!sb || d.length !== 10 || d === '9999999999') return '';
    const dd = d.slice(0, 6) + '-' + d.slice(6);
    for (const t of ['fyrirtaeki', 'vidskiptavinir']) {
      try {
        const r = await sb.from(t).select('netfang').or('kennitala.eq.' + d + ',kennitala.eq.' + dd)
          .not('netfang', 'is', null).limit(1).maybeSingle();
        if (r && r.data && r.data.netfang) return String(r.data.netfang).trim();
      } catch (_) {}
    }
    return '';
  }
  function wireOpen(root) {
    root.querySelectorAll('._ufs-open').forEach(b => b.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.DocTemplates && DocTemplates.openFilled) DocTemplates.openFilled(b.dataset.fid);
    }));
    // 📧 Senda — teiknar vistuðu skýrsluna sem PDF og opnar póst-ritilinn (254).
    root.querySelectorAll('._ufs-send').forEach(b => b.addEventListener('click', async e => {
      e.preventDefault(); e.stopPropagation();
      if (!window.ReceiptSender || !ReceiptSender.compose || !window.DocTemplates || !DocTemplates.buildFilledPdfBase64) {
        alert('Póst-ritillinn hlóðst ekki — endurhladdu síðunni.'); return;
      }
      const rec = (listFilled() || []).find(x => String(x.id) === String(b.dataset.fid));
      if (!rec) { alert('Skýrslan fannst ekki.'); return; }
      const nafn = rec.customer || '';
      const email = await emailForKt(rec.kennitala);
      const heiti = rec.name || rec.template_name || 'Skýrsla';
      ReceiptSender.compose({
        title: 'Senda — ' + nafn,
        to: email,
        subject: heiti + (nafn ? ' — ' + nafn : '') + ' — Slökkvitæki ehf',
        bodyText: ReceiptSender.standardText('skyrsla', { nafn: nafn }),
        attachmentName: heiti + '.pdf',
        buildAttachments: async () => {
          const a = await DocTemplates.buildFilledPdfBase64(rec.id);
          if (!a) throw new Error('Gat ekki teiknað PDF af skýrslunni.');
          return [a];
        },
      });
    }));
  }

  // ── 1. Fyrirtækjaprófíll: „Samningar & útfyllt skjöl" spjald ──────────────
  function coIdOnPage() {
    const main = document.getElementById('companies-main'); if (!main) return null;
    const el = main.querySelector('[data-co-id]:not(._cat-section):not(._dyg-section):not(._ufs-section)');
    if (el) { const v = el.getAttribute('data-co-id'); if (v && /^\d+$/.test(v)) return +v; }
    return null;
  }
  async function coInfo(coId) {
    let co = ((window.Companies && Companies.list) || []).find(x => +x.id === +coId);
    if (!co && window.DB && DB.sb) {
      try { const r = await DB.sb.from('fyrirtaeki').select('nafn,kennitala').eq('id', coId).maybeSingle(); co = r && r.data; } catch (_) {}
    }
    return co || {};
  }
  async function injectProfile() {
    const main = document.getElementById('companies-main'); if (!main) return;
    const coId = coIdOnPage(); if (!coId) return;
    let sec = main.querySelector('._ufs-section');
    if (sec && String(sec.dataset.coId) === String(coId)) return;
    const co = await coInfo(coId);
    if (coIdOnPage() !== coId) return;   // notandi flakkaði á meðan
    const docs = docsFor(co.kennitala, co.nafn);
    if (!sec) {
      sec = document.createElement('div');
      sec.className = '_ufs-section sk-card';
      const dyg = main.querySelector('._dyg-section');
      if (dyg && dyg.nextSibling) main.insertBefore(sec, dyg.nextSibling);
      else if (dyg) main.appendChild(sec);
      else { const cat = main.querySelector('._cat-section'); if (cat) main.insertBefore(sec, cat); else main.appendChild(sec); }
    }
    sec.dataset.coId = coId;
    sec.style.cssText = sec.style.cssText || 'margin-top:14px';
    sec.innerHTML =
      '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-top:14px">' +
        '<div style="font-size:13px;font-weight:800;color:#0f172a;margin-bottom:8px">📑 Samningar &amp; útfyllt skjöl <span style="font-weight:500;color:#94a3b8;font-size:11px">(úr Samningar-flipanum)</span></div>' +
        (docs.length
          ? '<div style="border:1px solid #f1f5f9;border-radius:8px;overflow:hidden">' + docs.map(docRow).join('') + '</div>'
          : '<div style="font-size:12px;color:#94a3b8;font-style:italic">Engin útfyllt skjöl fundust á þessa kennitölu/nafn. Skjöl vistuð með „💾 Vista í kerfi" í Samningum birtast hér.</div>') +
      '</div>';
    wireOpen(sec);
  }
  (function watchProfile() {
    const main = document.getElementById('companies-main');
    if (!main) { setTimeout(watchProfile, 900); return; }
    let t = 0;
    new MutationObserver(() => { clearTimeout(t); t = setTimeout(injectProfile, 600); }).observe(main, { childList: true });
    injectProfile();
  })();

  // ── 2. Brunakerfisþjónusta: fela X-uðu takkana + „📄 Skýrsla" ─────────────
  const TEMPLATE_ID = 'seed_arsskodun_brunakerfa';
  (function css() {
    if (document.getElementById('_ufs-css')) return;
    const st = document.createElement('style');
    st.id = '_ufs-css';
    // Faldir skv. skjámynd Agnars 2026-07-10 (X yfir tökkunum) — kóðinn er óhreyfður.
    st.textContent = '#view-brunakerfi ._bk-share,#view-brunakerfi ._bk-send,#view-brunakerfi #_bk-skill-list{display:none!important}';
    document.head.appendChild(st);
  })();

  function bkCompanies() {
    // Sama gagnalind og patch 147: AppSettings.brunakerfi_customers (map coId→meta)
    // + nöfn/kt úr Companies.list (eða tóm ef ekki hlaðið enn).
    const map = (window.AppSettings && AppSettings.path && AppSettings.path('brunakerfi_customers')) || {};
    const ids = Object.keys(map).map(Number).filter(n => n > 0);
    const all = (window.Companies && Companies.list) || [];
    return ids.map(id => all.find(c => +c.id === id) || { id, nafn: '(fyrirtæki #' + id + ')' })
      .sort((a, b) => String(a.nafn || '').localeCompare(String(b.nafn || ''), 'is'));
  }
  function openReportFor(co) {
    if (!window.DocTemplates || !DocTemplates.open) { alert('Sniðmátaritill ekki tilbúinn.'); return; }
    co = co || {};
    const addr = String(co.heimilisfang || '');
    const pm = addr.match(/\b(\d{3})\b(?!.*\b\d{3}\b)/);
    DocTemplates.open(TEMPLATE_ID, {
      prefill: {
        verkkaupi: co.nafn || '',
        kennitala: co.kennitala || '',
        heimilisfang: addr,
        postnr: pm ? pm[1] : '',
        simi: co.simi || '',
        tengilidur: co['tengiliður'] || co.tengilidur || '',
        dagsetning: new Date().toLocaleDateString('is-IS'),
      },
    });
  }
  function openChooser() {
    document.getElementById('_ufs-choose')?.remove();
    const list = bkCompanies();
    const dlg = document.createElement('div');
    dlg.id = '_ufs-choose';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100060;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.35);width:min(460px,calc(100vw - 32px));max-height:80vh;display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:13px 16px;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<div style="font-size:14px;font-weight:800">📄 Ný prófunarskýrsla — veldu fyrirtæki</div>' +
          '<button id="_ufs-x" type="button" style="background:transparent;border:1px solid rgba(255,255,255,.4);color:#fff;width:30px;height:30px;border-radius:7px;cursor:pointer;font-size:15px;line-height:1">✕</button>' +
        '</div>' +
        '<div style="padding:10px 14px;border-bottom:1px solid #f1f5f9">' +
          '<input id="_ufs-q" type="text" placeholder="🔎 Leita…" autocomplete="off" style="width:100%;padding:9px 12px;border:1px solid #cbd5e1;border-radius:8px;font:inherit;font-size:13px;box-sizing:border-box">' +
        '</div>' +
        '<div id="_ufs-list" style="flex:1;overflow:auto;padding:6px 8px"></div>' +
        '<div style="padding:10px 14px;border-top:1px solid #f1f5f9;text-align:right">' +
          '<button id="_ufs-blank" type="button" style="padding:8px 14px;background:#fff;color:#475569;border:1px solid #cbd5e1;border-radius:7px;cursor:pointer;font:inherit;font-size:12px">Opna án fyrirtækis</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);
    const holder = dlg.querySelector('#_ufs-list');
    const q = dlg.querySelector('#_ufs-q');
    function paint() {
      const s = nrm(q.value);
      const rows = list.filter(c => !s || nrm(c.nafn).includes(s) || ktDigits(c.kennitala).includes(s.replace(/\D/g, '') || ' '));
      holder.innerHTML = rows.length ? rows.map(c =>
        '<button class="_ufs-co" data-id="' + c.id + '" type="button" style="display:block;width:100%;text-align:left;padding:9px 12px;background:#fff;border:none;border-bottom:1px solid #f8fafc;cursor:pointer;font:inherit">' +
          '<div style="font-size:13px;font-weight:600;color:#0f172a">' + esc(c.nafn || '') + '</div>' +
          '<div style="font-size:11px;color:#94a3b8">' + esc(c.kennitala || '') + (c.heimilisfang ? ' · ' + esc(c.heimilisfang) : '') + '</div>' +
        '</button>').join('')
        : '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;font-style:italic">Ekkert fyrirtæki fannst.</div>';
      holder.querySelectorAll('._ufs-co').forEach(b => b.addEventListener('click', () => {
        const co = list.find(c => String(c.id) === b.dataset.id);
        dlg.remove(); openReportFor(co);
      }));
    }
    q.addEventListener('input', paint);
    dlg.querySelector('#_ufs-x').addEventListener('click', () => dlg.remove());
    dlg.querySelector('#_ufs-blank').addEventListener('click', () => { dlg.remove(); openReportFor(null); });
    dlg.addEventListener('click', e => { if (e.target === dlg) dlg.remove(); });
    paint(); setTimeout(() => { try { q.focus(); } catch (_) {} }, 40);
  }

  function isReport(r) {
    return r && (r.template_id === TEMPLATE_ID || /prófun|profun|viðtökupróf|vidtokuprof|brunaviðvörunar|brunavidvorunar/i.test(String(r.template_name || '')));
  }
  function injectBrunakerfi() {
    const view = document.getElementById('view-brunakerfi'); if (!view) return;
    // a) „📄 Skýrsla" takki við hlið Tilboðs-takkans
    const tilbod = view.querySelector('._bk-tilbod');
    if (tilbod && !view.querySelector('#_ufs-skyrsla')) {
      const btn = document.createElement('button');
      btn.id = '_ufs-skyrsla';
      btn.type = 'button';
      btn.title = 'Opna prófunarskýrslu (Ársskoðun brunakerfa / viðtökupróf) forfyllta fyrir valið fyrirtæki';
      btn.style.cssText = 'padding:8px 12px;border:1px solid #b45309;border-radius:8px;background:#fffbeb;cursor:pointer;font:inherit;font-size:12px;color:#92400e;font-weight:700';
      btn.textContent = '📄 Skýrsla';
      btn.addEventListener('click', openChooser);
      tilbod.parentNode.insertBefore(btn, tilbod);
    }
    // b) „Vistaðar skýrslur" neðst — við hlið Vistuð tilboð
    const main = view.querySelector('div');
    if (!main) return;
    const reports = listFilled().filter(isReport)
      .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
    let sec = view.querySelector('#_ufs-reports');
    if (!sec) {
      sec = document.createElement('div');
      sec.id = '_ufs-reports';
      sec.style.cssText = 'max-width:1200px;margin:18px auto 30px;padding:0 22px';
      // Neðst á síðuna (Tilboðs-sectionið mountast líka neðst).
      (view.querySelector(':scope > div') || view).appendChild(sec);
    }
    sec.innerHTML =
      '<div style="font-size:14px;font-weight:800;color:#0f172a;margin:8px 0 8px">📄 Vistaðar skýrslur <span style="font-weight:500;color:#94a3b8;font-size:11px">' + reports.length + ' — prófunarskýrslur brunaviðvörunarkerfa, opnast til að prenta/vista PDF</span></div>' +
      (reports.length
        ? '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">' + reports.map(docRow).join('') + '</div>'
        : '<div style="background:#fff;border:1px dashed #e2e8f0;border-radius:12px;padding:16px;text-align:center;color:#94a3b8;font-size:12px;font-style:italic">Engar skýrslur vistaðar enn — „📄 Skýrsla" takkinn hér að ofan býr til nýja.</div>');
    wireOpen(sec);
  }
  (function watchBk() {
    const view = document.getElementById('view-brunakerfi');
    if (!view) { setTimeout(watchBk, 1200); return; }
    let t = 0;
    new MutationObserver(() => {
      if (view.querySelector('#_ufs-skyrsla') && view.querySelector('#_ufs-reports')) return;
      clearTimeout(t); t = setTimeout(injectBrunakerfi, 500);
    }).observe(view, { childList: true, subtree: true });
    injectBrunakerfi();
  })();

  window.UtfylltSkjol = { injectProfile, injectBrunakerfi, docsFor, openChooser };
  console.log('[patch-265] útfyllt skjöl á kúnnann + brunakerfi skýrslu-takki installed');
})();
/* === END ÚTFYLLT SKJÖL === */
