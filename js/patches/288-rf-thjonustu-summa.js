/* js/patches/288-rf-thjonustu-summa.js
   ─────────────────────────────────────────────────────────────────
   „Þjónustu-summa" — CURATED yfirlits-spjald efst í rekstrarfélags-boxinu,
   fyrsti sýnilegi púst kúnna-þjónustuborðsins (STAÐREYNDIR §4b).

   Les `app_settings.rekstrarfelag_notes[<merki>]` (sama synca blob og annað) og
   birtir LITLA alltaf-sýnilega summu: staða-pilla · tölur · næsta skref — og
   „▾ Meira" opnar tengiliði + opin mál. Situr EFST í `._rf_samskipti_slot`, þ.e.
   ofan á hráa póstlistanum sem patch 286 teiknar (286 er ósnert — ný skrá).

   Merki fæst úr `.rfa__name` í spjald-hausnum (patch 175). Ekkert note → ekkert
   spjald (engin óreiða á félögum án summu).

   Skrifað 2026-07-30. Bæta <script defer src="/js/patches/288-rf-thjonustu-summa.js?v=1">
   í index.html á eftir 286. Bump ?v= við breytingar.
*/
(() => {
  if (window.__rfSummaInstalled) return;
  window.__rfSummaInstalled = true;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Stale-while-revalidate: birtum STRAX úr localStorage (síðasta hleðsla), svo
  // ferskum gögnum beint úr Supabase í bakgrunni (DB.sb = sami klient og appið).
  const LS = "rf_summa_cache_v1";
  let _cache = null, _cacheTs = 0, _fetching = null;
  function loadLS() {
    try { const j = JSON.parse(localStorage.getItem(LS) || "null"); if (j && j.rf) { _cache = j; } } catch (_) {}
    if (!_cache) _cache = { rf: {}, co: {} };
    return _cache;
  }
  function saveLS() { try { localStorage.setItem(LS, JSON.stringify(_cache)); } catch (_) {} }
  async function fetchNotes(force) {
    if (!force && _cache && Date.now() - _cacheTs < 60000) return _cache;
    if (_fetching) return _fetching;
    const sb = (window.DB && window.DB.sb) || window.sb || null;
    if (!sb) return _cache || loadLS();
    _fetching = (async () => {
      try {
        // 2026-08-05 (hraða-úttekt): `select("settings")` sótti ALLAN
        // stillingar-blobbinn — 1,6 MB — í hvert sinn, bara til að lesa tvo
        // litla lykla. PostgREST getur skilað json-slóð beint: 1,6 MB → ~9 kB.
        const r = await sb.from("app_settings")
          .select("rf:settings->rekstrarfelag_notes, co:settings->fyrirtaeki_notes")
          .eq("id", 1).maybeSingle();
        const d = (r && r.data) || {};
        _cache = { rf: d.rf || {}, co: d.co || {} };
        _cacheTs = Date.now();
        saveLS();                                  // næsta hleðsla poppar strax
      } catch (e) { console.warn("[rf-summa] fetch villa:", e); if (!_cache) loadLS(); }
      _fetching = null;
      return _cache;
    })();
    return _fetching;
  }
  function notes() { return (_cache && _cache.rf) || {}; }
  function coNotes() { return (_cache && _cache.co) || {}; }
  // Nafn í hausnum getur borið minniháttar hvítbil/ehf-viðskeyti; reynum
  // nákvæmt match fyrst, svo fold-að (án ehf/hf, lowercase) svo „Heimaleiga"
  // í note-inu passi við „Heimaleiga ehf" o.s.frv.
  function fold(s) { return String(s || "").toLowerCase().replace(/\b(ehf|hf|ses|slf)\.?\b/g, "").replace(/[^\p{L}\p{N}]+/gu, "").trim(); }
  function lookup(name) {
    const n = notes(); if (!n || !name) return null;
    if (n[name]) return [name, n[name]];
    const f = fold(name);
    const hit = Object.keys(n).find(k => fold(k) === f);
    return hit ? [hit, n[hit]] : null;
  }

  // 04.10.2026 (Agnar: „more stylish í samræmi við Fyrirtæki í þjónustu"): Stálspjald (442) í stað fjólubláa
  // spjaldsins — málmhaus með hnoðum, staðan sem plata með LED, línur á stálplötu, engin emoji. Textinn úr gögnunum
  // getur byrjað á emoji („🔴 Ósvarað · …") — það fer og liturinn fer í LED-ið.
  const SP = () => window.Stalspjald || { anEmoji: x => String(x || ''), ledLitur: () => 'gull' };
  function plata(txt) {
    return '<span class="ssp-plata" title="' + esc(SP().anEmoji(txt)) + '"><i class="ssp-led ' + SP().ledLitur(txt) + '"></i>' + esc(SP().anEmoji(txt)) + '</span>';
  }
  function lina(merki, gildi, cls) {
    return '<div class="ssp-lina heil efst"><span class="ssp-merki">' + merki + '</span><span class="ssp-gildi' + (cls ? ' ' + cls : '') + '">' + gildi + '</span></div>';
  }

  function buildCard(merki, note) {
    const card = document.createElement("div");
    card.className = "_rf_summa ssp";
    card.dataset.merki = merki;

    const opin = Array.isArray(note.opin_mal) ? note.opin_mal : [];
    const head =
      '<div class="ssp-haus"><span class="ssp-titill">Þjónustusumma</span>' +
        '<button type="button" class="_summa_refresh ssp-btn ikon" title="Sækja ferskt" aria-label="Sækja ferskt">↻</button>' +
        '<span class="ssp-hlid">' + (note.stada ? plata(note.stada) : "") + '</span>' +
      '</div>';

    // Alltaf sýnilegt: tölur + næsta skref
    const always =
      (note.tolur ? lina('Póstar', esc(note.tolur)) : "") +
      (note.naesta_skref ? lina('Næsta skref', esc(note.naesta_skref), 'feitt') : "");

    // Útvíkkanlegt: tengiliðir + opin mál
    const moreInner =
      (note.tengilidir ? '<div class="ssp-reitir">' + lina('Tengiliðir', esc(note.tengilidir)) + '</div>' : "") +
      (opin.length ? '<div class="ssp-skilti">Opin mál</div>' + opin.map(m => '<div class="ssp-mal"><span class="ssp-gildi">' + esc(m) + '</span></div>').join("") : "") +
      (note.updated_at ? '<div class="ssp-medal" style="margin-top:8px">Uppfært ' + esc(note.updated_at) + (note.by ? " · " + esc(note.by) : "") + '</div>' : "");

    const hasMore = !!(note.tengilidir || opin.length);
    card.innerHTML = head +
      '<div class="ssp-buk">' +
        (always ? '<div class="ssp-reitir">' + always + '</div>' : '') +
        (hasMore
          ? '<div style="margin-top:8px"><button type="button" class="_rf_summa_tog ssp-btn">Meira ▾</button></div>' +
            '<div class="_rf_summa_more" style="display:none;margin-top:8px">' + moreInner + "</div>"
          : "") +
      '</div>';

    const tog = card.querySelector("._rf_summa_tog");
    if (tog) tog.addEventListener("click", e => {
      const more = card.querySelector("._rf_summa_more"), open = more.style.display === "none";
      more.style.display = open ? "" : "none";
      e.target.textContent = open ? "Minna ▴" : "Meira ▾";
    });
    const rf = card.querySelector("._summa_refresh");
    if (rf) rf.addEventListener("click", e => {
      e.stopPropagation(); e.target.textContent = "…";
      fetchNotes(true).then(() => { document.querySelectorAll("._rf_summa,._co_summa").forEach(c => c.remove()); tick(); tickCo(); });
    });
    return card;
  }

  function tick() {
    const v = document.getElementById("view-rekstrarfelog");
    if (!v) return;
    const r = v.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;   // ekki sýnilegt (sbr. 286)

    v.querySelectorAll("._rf_body").forEach(body => {
      // Merki úr hausnum: .rfa__name situr í spjaldinu utan um þennan _rf_body
      const card = body.closest('[class]') && body.parentElement ? body.parentElement : body;
      let nameEl = null, p = body;
      for (let i = 0; i < 4 && p; i++) { nameEl = p.querySelector ? p.querySelector(".rfa__name") : null; if (nameEl) break; p = p.parentElement; }
      const merki = nameEl ? nameEl.textContent.trim() : "";
      if (!merki) return;

      const hit = lookup(merki);
      const existing = body.querySelector("._rf_summa");
      if (!hit) { if (existing) existing.remove(); return; }
      if (existing) { if (existing.dataset.merki === hit[0]) return; existing.remove(); }

      const el = buildCard(hit[0], hit[1]);
      // Mount: helst efst í samskipta-slotinu (ofan á 286 póstsögu); annars
      // beint á eftir SÝNILEGA info-kassanum; annars aftast í body.
      const slot = body.querySelector("._rf_samskipti_slot");
      const info = body.querySelector("._rf_info");
      if (slot) slot.insertBefore(el, slot.firstChild);
      else if (info) info.insertAdjacentElement("afterend", el);
      else body.appendChild(el);
    });
  }

  // ── Staka fyrirtæki-prófílinn (patch 158/199) ────────────────────────────
  // Sama summa-spjald, lykill = fyrirtaeki_id úr openEdit-hnappnum (eins og 286).
  // Sett EFST í aðgerðaröðinni svo það blasi við — beint fyrir aftan hnappana.
  function tickCo() {
    const btn = document.querySelector('button[onclick^="Companies.openEdit"]');
    if (!btn) { document.querySelectorAll("._co_summa").forEach(c => c.remove()); return; }
    const m = btn.getAttribute("onclick").match(/openEdit\((\d+)\)/);
    if (!m) return;
    const fid = m[1];
    const note = coNotes()[fid];
    const existing = document.querySelector("._co_summa");
    if (!note) { if (existing) existing.remove(); return; }
    if (existing) { if (existing.dataset.fid === fid) return; existing.remove(); }

    const el = buildCard("co:" + fid, note);
    el.className = "_co_summa ssp"; el.dataset.fid = fid;
    // Akkeri: sama röð og 286 (Merkja mikilvægt-hnappurinn), spjaldið fyrir aftan.
    let row = null;
    const mk = [...document.querySelectorAll("button")].find(b => /Merkja mikilvæg|Bæta við tæki|Þjónustusamningur/.test(b.textContent || ""));
    if (mk) row = mk.parentElement;
    const anchor = row || btn.parentElement;
    if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(el, anchor.nextSibling);
    else if (anchor) anchor.appendChild(el);
  }

  // 30.09.2026: vaktin hlustaði á body+subtree og kallaði fetchNotes() — NETKALL —
  // í hvert sinn sem hún settist. HVER EINASTA DOM-breyting í appinu endurstillti
  // 300 ms biðina og hvert hlé skilaði sókn. Þetta er vélin á bak við „Prófíll 66
  // netköll".
  //
  // Teikningin og sóknin eru tvennt ólíkt og eru nú aðskilin: vaktin teiknar
  // aðeins (ódýrt, staðbundið), en gögnin eru sótt í mesta lagi á þriggja mínútna
  // fresti — og aldrei í földum flipa. Sótt strax við endurkomu svo spjaldið sé
  // aldrei úrelt þegar horft er á það.
  const SOKN_BIL_MS = 180000;
  let _sidastSott = 0;
  function kannskiSaekja() {
    if (document.hidden) return Promise.resolve();
    const nu = Date.now();
    if (nu - _sidastSott < SOKN_BIL_MS) return Promise.resolve();
    _sidastSott = nu;
    return fetchNotes();
  }

  let t = null;
  const run = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      kannskiSaekja().then(() => { try { tick(); tickCo(); } catch (e) { console.warn("[rf-summa]", e); } })
        .catch(() => { try { tick(); tickCo(); } catch (_) {} });
    }, 300);
  };
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { _sidastSott = 0; run(); }
  });
  // 1) STRAX: birtu úr localStorage (síðasta hleðsla) — poppar upp án biðar.
  loadLS();
  try { tick(); tickCo(); } catch (_) {}
  // 2) Í bakgrunni: sæktu ferskt, uppfærðu + vistaðu fyrir næstu hleðslu.
  fetchNotes(true).then(() => run());
  setTimeout(run, 1500);
  console.log("[rf-thjonustu-summa] v4 — localStorage-strax + bakgrunns-refresh + ↻");
})();
