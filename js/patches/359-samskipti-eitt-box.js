/* === SAMSKIPTI: EITT BOX Á PRÓFÍLNUM (359) ==========================================
 *
 * Agnar 06.09.2026: „pæla hvort það sé hægt að sameina og endurbæta þessi samskiptabox… flott að
 * sjá strax þarna uppi hver síðustu skilaboð voru… neðri er hrikalega lengi að finna póstana…
 * vill sjá seinasta póstinn strax" → „reyna sameina bæði póstforritin í eitt".
 *
 * Tvö box voru á fyrirtækjaprófílnum:
 *   286 „Samskiptasaga & beiðnir" — les BEINT úr felag_samskipti (30 nýjustu, á félaginu, ~0,3 s),
 *       sýnir síðasta póstinn strax, samantekt (athugasemdir), póstlista sem opnast, beiðnir.
 *   295 „Póststaða & samskipti" — umferðarljósið (rautt ósvarað / gult merki / grænt), merkin
 *       (uppsögn, flutt, kvörtun…), ⭐ Mikilvægt, 🔕 slökkva ósvarað, „Öll póstsaga" (hub-RPC).
 *       Gögnin koma úr lista-vítta company-mail-kallinu (nú cache-að, 15 mín á þjóni).
 *
 * Hér: 295-boxið er FALIÐ á prófílnum (listamerkin 🔴🟡🟢 á Fyrirtæki í þjónustu haldast) og það
 * sem það gaf umfram 286 er fært inn í 286-kortið sem ræma undir hausnum: umferðarljós + merki +
 * ⭐/🔕-takkar (sömu föll: CompanyMail.setImportant/setMuted → AppSettings, samstillt milli véla).
 * „Öll póstsaga" verður „⬇ Eldri póstar" neðst í póstlistanum: 286 sýnir 30 nýjustu SAMSTUNDIS, og
 * eldri póstar (öll saga, company-mail?co=) bætast við fyrir neðan þegar beðið er um þá.
 * Snertir hvorki 286 né 295 — kortið er skreytt utan frá og skreytingin endurnýjuð þegar 286
 * teiknar upp á nýtt (undirskrift, throttle — síðan er aldrei róleg, sjá frontend-profiler).
 * Ekkert skrifað í grunninn umfram það sem 295 gerði áður; 153/187 ÓSNERT.
 * ========================================================================== */
(() => {
  if (window.__samskiptiEitt359) return;
  window.__samskiptiEitt359 = true;

  const API = 'https://brunaholf.netlify.app/api/company-mail';
  const DOT = { blue: '#2563eb', red: '#dc2626', yellow: '#d97706', green: '#16a34a', hist: '#94a3b8', none: '#cbd5e1' };
  const ST = { blue: 'Beiðni um aukaþjónustu eða uppsögn — svara', red: 'Ósvarað — kallar á svar', yellow: 'Mikilvægt / breyting?', green: 'Í sambandi', hist: 'Eldri póstsaga til', none: 'Engin nýleg póstmerki' };
  const SIG = { uppsogn: '🚪 Sagði upp þjónustu', flutt: '📦 Flutt / nýtt heimilisfang', eigandi: '🔑 Eigendaskipti / nýr rekstur', gjaldthrot: '🏚️ Gjaldþrot / þrotabú', kvortun: '😠 Kvörtun / óánægja', bilun: '🔧 Bilun / öryggismál', aridandi: '⏰ Áríðandi' };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtD = d => { try { return new Date(d).toLocaleDateString('is-IS', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (_) { return ''; } };
  const monYr = d => { try { return new Date(d).toLocaleDateString('is-IS', { month: 'short', year: 'numeric' }); } catch (_) { return ''; } };
  const PILL = 'border-radius:99px;padding:3px 11px;font-size:12px;cursor:pointer;font-weight:700;line-height:1.3;white-space:nowrap';

  if (!document.getElementById('_smx-css')) {
    const st = document.createElement('style'); st.id = '_smx-css';
    // Tvær reglur fyrir sama hlutinn, viljandi:
    //   :has()  — felur 295-boxið á SAMA AUGNABLIKI og hýsillinn birtist, án þess
    //             að bíða eftir JS. Þrengingin (400 ms) á athuga() lagði annars
    //             hálfri sekúndu ofan á blikkið sem Agnar sá.
    //   .smx-eitt — sama regla fyrir vafra án :has() (Chrome <105); þar helst
    //             gamla hegðunin: falið þegar kortið er komið.
    // `.smx-gafst` slekkur á :has()-reglunni þegar tímavörðurinn gefst upp á
    // sókninni, svo autt svæði verði aldrei útkoman.
    st.textContent = '#companies-main:has(._samskipti-host[data-fid]):not(.smx-gafst) ._co-mail-box{display:none !important}' +
      '#companies-main.smx-eitt ._co-mail-box{display:none !important}' +
      '._smx-strip{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:7px 0 2px}' +
      '._smx-sig{background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:99px;padding:1px 8px;font-size:11px;font-weight:700;white-space:nowrap}' +
      '._smx-old{padding:7px 9px;margin:5px 0;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12.5px}';
    document.head.appendChild(st);
  }

  function flags(fid) { try { const m = (window.AppSettings && AppSettings.path && AppSettings.path('arsskodun_customers')) || {}; return m[String(fid)] || {}; } catch (_) { return {}; } }
  function stateOf(fid) {
    const CM = window.CompanyMail || null;
    const d = CM && CM.data ? CM.data(fid) : null;
    const st = (CM && CM.status ? CM.status(fid) : null) || 'none';
    const f = flags(fid);
    return { d, st, imp: !!f.mail_important, off: !!f.mail_off };
  }
  const sigOf = (s) => [s.st, s.d ? (s.d.received_at || '') : '', s.d && s.d.signals ? s.d.signals.length : 0, s.imp ? 1 : 0, s.off ? 1 : 0].join('|');

  function stripHtml(fid, s) {
    const sigs = (s.d && Array.isArray(s.d.signals) ? s.d.signals : []).slice(0, 4);
    return '<span style="display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;color:' + DOT[s.st] + '" title="Póststaða úr umferðarljósi listans">' +
        '<span style="width:9px;height:9px;border-radius:50%;background:' + DOT[s.st] + ';flex:none"></span>' + esc(ST[s.st]) +
        (s.off && s.st !== 'red' ? ' <span style="font-weight:400;color:#94a3b8">(ósvarað-merki slökkt)</span>' : '') + '</span>' +
      sigs.map(g => '<span class="_smx-sig" title="' + esc((g.subject || '') + (g.received_at ? ' · ' + fmtD(g.received_at) : '')) + '">' + esc(SIG[g.type] || g.type) + (g.received_at ? ' · ' + esc(monYr(g.received_at)) : '') + '</span>').join('') +
      '<span style="flex:1"></span>' +
      '<button type="button" class="_smx-imp" style="' + PILL + ';border:1px solid ' + (s.imp ? '#fde68a' : '#e2e8f0') + ';background:' + (s.imp ? '#fef3c7' : '#f8fafc') + ';color:#334155">' + (s.imp ? '⭐ Mikilvægt · afmerkja' : '☆ Merkja mikilvægt') + '</button>' +
      (s.st === 'red' ? '<button type="button" class="_smx-mute" style="' + PILL + ';border:1px solid #e2e8f0;background:#f8fafc;color:#334155" title="Slökkva rauða ósvarað-merkið á þessum kúnna">🔕 Slökkva ósvarað</button>' : '');
  }

  function retitle(card) {
    const h = [...card.querySelectorAll('div')].find(d => /SAMSKIPTASAGA/.test(d.textContent || '') && d.children.length === 0);
    if (h && !h.dataset.smx) { h.dataset.smx = '1'; h.textContent = '💬 SAMSKIPTI · PÓSTUR · BEIÐNIR'; }
  }

  async function saekjaEldri(card, fid, btn) {
    btn.disabled = true; btn.textContent = '⏳ Sæki alla póstsögu…';
    try {
      const r = await fetch(API + '?co=' + encodeURIComponent(fid), { cache: 'no-store' });
      const j = await r.json();
      const mails = (j && j.mails) || [];
      const have = new Set([...card.querySelectorAll('._ssk-mail[data-eid]')].map(el => String(el.dataset.eid)));
      const eldri = mails.filter(m => !have.has(String(m.id || m.email_id)));
      const holder = document.createElement('div'); holder.className = '_smx-oldwrap';
      holder.innerHTML = (eldri.length
        ? '<div style="font-weight:700;font-size:11.5px;color:#64748b;letter-spacing:.05em;margin:9px 0 3px">🕰 ELDRI PÓSTAR <span style="font-weight:400">· ' + eldri.length + ' til viðbótar · öll saga ' + mails.length + '</span></div>' +
          eldri.map(m => '<div class="_smx-old"><div style="font-size:11.5px;color:#64748b">' + esc(fmtD(m.received_at)) + ' · ' + esc(m.fra_okkur ? 'Slökkvitæki ehf → viðskiptavinur' : (m.sender_name || m.sender_email || '')) + (m.via ? ' · ' + esc(m.via) : '') + '</div>' +
            '<div style="font-weight:600">' + esc(m.subject || '(ekkert efni)') + '</div>' + (m.snippet ? '<div style="color:#475569">' + esc(String(m.snippet).slice(0, 220)) + '</div>' : '') + '</div>').join('')
        : '<div style="color:#94a3b8;font-size:12.5px;padding:6px 0">Engir eldri póstar umfram þá sem sjást hér að ofan' + (mails.length ? ' (öll saga: ' + mails.length + ')' : '') + '.</div>');
      btn.replaceWith(holder);
    } catch (e) {
      btn.disabled = false; btn.textContent = '⬇ Eldri póstar — villa, reyna aftur';
    }
  }
  function eldriBtn(card, fid) {
    // 09.09.2026: 286 sækir núna ALLA póstsöguna sjálft (báðar heimildirnar,
    // ekkert 30-þak) og býður upp á „⬇ Sýna öll samskiptin". Þessi takki sótti
    // gömlu, þrengri RPC-söguna og myndi aðeins tvítaka — sleppum honum þá.
    if (card.dataset.ollSagan === '1') return;
    const full = card.querySelector('._ssk-full'); if (!full || full.querySelector('._smx-eldri, ._smx-oldwrap')) return;
    const beidnirHead = [...full.children].find(el => /BEIÐNIR/.test(el.textContent || '') && el.querySelector && el.querySelector('div'));
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = '_smx-eldri';
    btn.style.cssText = 'margin:6px 0 2px;border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;' + PILL;
    btn.textContent = '⬇ Eldri póstar (öll saga)';
    btn.addEventListener('click', e => { e.stopPropagation(); saekjaEldri(card, fid, btn); });
    if (beidnirHead) full.insertBefore(btn, beidnirHead); else full.appendChild(btn);
  }

  function inject(card, fid) {
    const s = stateOf(fid), sig = sigOf(s);
    let strip = card.querySelector('._smx-strip');
    if (!strip) {
      strip = document.createElement('div'); strip.className = '_smx-strip';
      const head = card.firstElementChild;
      if (head) head.insertAdjacentElement('afterend', strip); else card.prepend(strip);
    } else if (strip.dataset.sig === sig) { retitle(card); eldriBtn(card, fid); return; }
    strip.dataset.sig = sig;
    strip.innerHTML = stripHtml(fid, s);
    const imp = strip.querySelector('._smx-imp');
    if (imp) imp.addEventListener('click', async e => {
      e.stopPropagation(); imp.disabled = true;
      const ok = window.CompanyMail && CompanyMail.setImportant ? await CompanyMail.setImportant(fid, !s.imp) : false;
      if (window.Toast && Toast.show) Toast.show(ok ? (!s.imp ? '⭐ Merkt mikilvægt' : '☆ Afmerkt') : '⚠ Vistun mistókst');
      try { CompanyMail.onListRender(); } catch (_) {}
      strip.dataset.sig = ''; inject(card, fid);
    });
    const mute = strip.querySelector('._smx-mute');
    if (mute) mute.addEventListener('click', async e => {
      e.stopPropagation(); mute.disabled = true;
      const ok = window.CompanyMail && CompanyMail.setMuted ? await CompanyMail.setMuted(fid, true) : false;
      if (window.Toast && Toast.show) Toast.show(ok ? '🔕 Ósvarað-merki slökkt' : '⚠ Vistun mistókst');
      try { CompanyMail.onListRender(); } catch (_) {}
      strip.dataset.sig = ''; inject(card, fid);
    });
    retitle(card); eldriBtn(card, fid);
  }

  // 09.09.2026 (Agnar: „það kemur öðruvísi gluggi fyrst, í hálfa sekúndu, síðan
  // þessi"). KAPPHLAUPIÐ: 295-boxið teiknast STRAX (20 mín localStorage-skyndiminni)
  // en 286-kortið bíður eftir Supabase-sókn — og `smx-eitt`, sem felur 295, var
  // sett á fyrst þegar KORTIÐ var komið. Gamla boxið blikkaði því á meðan.
  // Auk þess er MutationObserverinn þrengdur í 400 ms, sem lagði allt að hálfri
  // sekúndu ofan á.
  //
  // Nú er falið um leið og HÝSILLINN er kominn — 286 býr hann til á undan
  // sókninni (286:322 á undan 286:324), svo hann er í DOM-inu strax.
  // Öryggisventillinn sem klasa-hliðið átti að vera er áfram til, bara sem
  // tímavörður: skili sóknin engu korti innan 6 s er klasinn tekinn af og gamla
  // boxið birtist aftur — hangi sókn má aldrei skilja eftir autt svæði (sbr.
  // ade35d7, þar sem hangandi _running læsti spjaldið úti að eilífu).
  let vaktTimer = null, vaktFid = null, gafstUpp = false;
  function athuga() {
    const host = document.querySelector('#companies-main ._samskipti-host[data-fid]');
    const card = host && host.querySelector('._samskipti-card');
    const main = document.getElementById('companies-main');
    const fid  = host ? host.dataset.fid : null;

    if (fid !== vaktFid) {                       // annað fyrirtæki opnað → nýtt bið
      vaktFid = fid; gafstUpp = false;
      const m0 = document.getElementById('companies-main');
      if (m0) m0.classList.remove('smx-gafst');
      if (vaktTimer) { clearTimeout(vaktTimer); vaktTimer = null; }
    }
    if (!host) {
      if (main) main.classList.remove('smx-eitt');
      if (vaktTimer) { clearTimeout(vaktTimer); vaktTimer = null; }
      return;
    }
    // 10.09.2026 (Agnar: „setja frekar loadmerki á gluggann og það komi þegar það er klárt").
    // 286 sýnir hleðslukort (._skx-hledur) á meðan sótt er. Það er ekki „autt svæði", svo gamla
    // boxið á EKKI að blikka inn eftir 6 s — 286 á sjálft tímamörk (20 s) og skiptir þá í
    // villukort (._skx-villa). Villukort = sóknin brást → gamla boxið strax sem varaleið.
    if (!card && host.querySelector('._skx-hledur')) {
      if (vaktTimer) { clearTimeout(vaktTimer); vaktTimer = null; }
      gafstUpp = false;
      if (main) {
        if (main.classList.contains('smx-gafst')) main.classList.remove('smx-gafst');
        if (!main.classList.contains('smx-eitt')) main.classList.add('smx-eitt');
      }
      return;
    }
    if (!card && host.querySelector('._skx-villa')) {
      if (vaktTimer) { clearTimeout(vaktTimer); vaktTimer = null; }
      gafstUpp = true;
      if (main) {
        if (main.classList.contains('smx-eitt')) main.classList.remove('smx-eitt');
        if (!main.classList.contains('smx-gafst')) main.classList.add('smx-gafst');
      }
      return;
    }
    if (card && vaktTimer) { clearTimeout(vaktTimer); vaktTimer = null; }
    if (card && main) main.classList.remove('smx-gafst');

    const fela = !!card || !gafstUpp;
    if (main && main.classList.contains('smx-eitt') !== fela) main.classList.toggle('smx-eitt', fela);

    if (!card) {
      if (!vaktTimer && !gafstUpp) vaktTimer = setTimeout(() => {
        vaktTimer = null;
        if (document.querySelector('#companies-main ._samskipti-host[data-fid] ._samskipti-card')) return;
        gafstUpp = true;                         // kortið kom ekki — sýnum gamla boxið
        const m = document.getElementById('companies-main');
        if (m) { m.classList.remove('smx-eitt'); m.classList.add('smx-gafst'); }
      }, 6000);
      return;
    }
    inject(card, Number(fid));
  }
  // throttle, ekki debounce (síðan er aldrei róleg — sjá frontend-profiler)
  let timer = null, last = 0;
  function tikk() { timer = null; last = Date.now(); try { athuga(); } catch (_) {} }
  const obs = new MutationObserver(() => { if (timer) return; timer = setTimeout(tikk, Math.max(60, 400 - (Date.now() - last))); });
  const start = () => { const m = document.getElementById('companies-main'); if (!m) { setTimeout(start, 500); return; } obs.observe(m, { childList: true, subtree: true }); athuga(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  setInterval(() => { try { athuga(); } catch (_) {} }, 3000);   // 295 endurnýjar gögnin án DOM-breytingar á kortinu

  window.SamskiptiEitt = { athuga, version: '359d' };
  console.log('[359-samskipti-eitt-box] virkur');
})();
/* === END SAMSKIPTI EITT BOX === */
