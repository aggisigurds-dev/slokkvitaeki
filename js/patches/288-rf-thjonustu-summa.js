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

  function notes() {
    try { return (window.AppSettings && AppSettings.path && AppSettings.path("rekstrarfelag_notes")) || {}; }
    catch (_) { return {}; }
  }
  function coNotes() {
    try { return (window.AppSettings && AppSettings.path && AppSettings.path("fyrirtaeki_notes")) || {}; }
    catch (_) { return {}; }
  }
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

  function pill(txt) {
    return '<span style="display:inline-block;padding:2px 10px;border-radius:99px;background:#f3e8ff;color:#6b21a8;font-weight:700;font-size:12px">' + esc(txt) + "</span>";
  }

  function buildCard(merki, note) {
    const card = document.createElement("div");
    card.className = "_rf_summa";
    card.dataset.merki = merki;
    card.style.cssText = "margin:0 0 12px;border:1px solid var(--brd,#e2e8f0);border-left:4px solid #7c3aed;border-radius:10px;padding:12px 14px;font-size:13px;background:var(--surface,#fff)";

    const opin = Array.isArray(note.opin_mal) ? note.opin_mal : [];
    const head =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">' +
      '<div style="font-weight:800;font-size:11px;letter-spacing:.06em;color:#6d28d9">📋 ÞJÓNUSTU-SUMMA</div>' +
      (note.stada ? pill(note.stada) : "") + "</div>";

    // Alltaf sýnilegt: tölur + næsta skref
    const always =
      (note.tolur ? '<div style="display:flex;gap:8px;margin-top:7px;line-height:1.45"><span>📨</span><span>' + esc(note.tolur) + "</span></div>" : "") +
      (note.naesta_skref ? '<div style="display:flex;gap:8px;margin-top:4px;line-height:1.45"><span>🎯</span><span style="font-weight:600">' + esc(note.naesta_skref) + "</span></div>" : "");

    // Útvíkkanlegt: tengiliðir + opin mál
    const moreInner =
      (note.tengilidir ? '<div style="display:flex;gap:8px;margin:6px 0;line-height:1.45"><span>👤</span><span>' + esc(note.tengilidir) + "</span></div>" : "") +
      (opin.length ? '<div style="font-weight:700;font-size:11.5px;color:#64748b;letter-spacing:.05em;margin:8px 0 3px">⚠️ OPIN MÁL</div>' +
        opin.map(m => '<div style="display:flex;gap:7px;margin:3px 0;line-height:1.4"><span style="color:#dc2626">•</span><span>' + esc(m) + "</span></div>").join("") : "") +
      (note.updated_at ? '<div style="color:#94a3b8;font-size:11px;margin-top:8px">Uppfært ' + esc(note.updated_at) + (note.by ? " · " + esc(note.by) : "") + "</div>" : "");

    const hasMore = !!(note.tengilidir || opin.length);
    card.innerHTML = head + always +
      (hasMore
        ? '<button type="button" class="_rf_summa_tog" style="margin-top:8px;border:1px solid #ddd6fe;background:#f5f3ff;color:#6d28d9;border-radius:99px;padding:3px 12px;font-size:12px;cursor:pointer;font-weight:700">Meira ▾</button>' +
          '<div class="_rf_summa_more" style="display:none;margin-top:8px;border-top:1px dashed #e9d5ff;padding-top:8px">' + moreInner + "</div>"
        : "");

    const tog = card.querySelector("._rf_summa_tog");
    if (tog) tog.addEventListener("click", e => {
      const more = card.querySelector("._rf_summa_more"), open = more.style.display === "none";
      more.style.display = open ? "" : "none";
      e.target.textContent = open ? "Minna ▴" : "Meira ▾";
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

      const slot = body.querySelector("._rf_samskipti_slot") || body;
      const hit = lookup(merki);
      const existing = slot.querySelector("._rf_summa");

      if (!hit) { if (existing) existing.remove(); return; }
      if (existing) { if (existing.dataset.merki === hit[0]) return; existing.remove(); }

      const el = buildCard(hit[0], hit[1]);
      slot.insertBefore(el, slot.firstChild);   // EFST — ofan á póstsögunni (286)
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
    el.className = "_co_summa"; el.dataset.fid = fid;
    // Akkeri: sama röð og 286 (Merkja mikilvægt-hnappurinn), spjaldið fyrir aftan.
    let row = null;
    const mk = [...document.querySelectorAll("button")].find(b => /Merkja mikilvæg|Bæta við tæki|Þjónustusamningur/.test(b.textContent || ""));
    if (mk) row = mk.parentElement;
    const anchor = row || btn.parentElement;
    if (anchor && anchor.parentElement) anchor.parentElement.insertBefore(el, anchor.nextSibling);
    else if (anchor) anchor.appendChild(el);
  }

  let t = null;
  const run = () => { clearTimeout(t); t = setTimeout(() => { try { tick(); tickCo(); } catch (e) { console.warn("[rf-summa]", e); } }, 300); };
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
  if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(run);
  setTimeout(run, 1200);
  console.log("[rf-thjonustu-summa] v1 installed");
})();
