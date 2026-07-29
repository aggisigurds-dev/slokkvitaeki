/* js/patches/286-samskipti-panel.js
   ─────────────────────────────────────────────────────────────────
   „Samskiptasaga & beiðnir" — spjald á fyrirtækjaprófílnum.
   Sýnir 4 helstu punkta (staða, tengiliður, síðasti póstur, viðvörun)
   og opnast í fulla sögu: síðustu póstar, verklýsing/athugasemdir.
   Gögn: fyrirtaeki + VIEW fyrirtaeki_samskipti (Supabase).
   Uppsetning: vista í js/patches/ og bæta <script src="/js/patches/samskipti-panel.js?v=1"></script>
   neðst í index.html (á eftir bundle-skránum). Bump ?v= við breytingar.
   Smíðað af Cowork 2026-07-29. */
(() => {
  if (window.__samskiptiPanelInstalled) return;
  window.__samskiptiPanelInstalled = true;

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtD = d => { try { const t = new Date(d); return t.toLocaleDateString("is-IS", { day: "numeric", month: "short", year: "numeric" }); } catch { return "" } };
  const sb = () => window.sb || null;
  const cache = {};

  async function fetchData(fid) {
    if (cache[fid] && Date.now() - cache[fid]._ts < 60000) return cache[fid];
    const client = sb(); if (!client) return null;
    const out = { _ts: Date.now(), f: null, mails: [] };
    try {
      const { data: f } = await client.from("fyrirtaeki")
        .select('id,nafn,banner_note,athugasemdir,netfang,simi,farsimi,"tengiliður",tengilidur')
        .eq("id", fid).maybeSingle();
      out.f = f || null;
      const { data: mails } = await client.from("fyrirtaeki_samskipti")
        .select("email_id,sender_name,sender_email,subject,snippet,is_question,fra_okkur,received_at")
        .eq("fyrirtaeki_id", fid).order("received_at", { ascending: false }).limit(6);
      out.mails = mails || [];
    } catch (e) { console.warn("[samskipti-panel]", e); }
    cache[fid] = out; return out;
  }

  function keyPoints(f, mails) {
    const pts = [];
    if (f.banner_note) pts.push(["📌", f.banner_note]);
    const teng = f["tengiliður"] || f.tengilidur;
    if (teng || f.netfang || f.simi || f.farsimi) {
      let c = teng ? esc(teng) : "";
      const links = [];
      if (f.farsimi || f.simi) links.push('<a href="tel:' + esc((f.farsimi || f.simi).replace(/[^\d+]/g, "")) + '">📞 ' + esc(f.farsimi || f.simi) + "</a>");
      if (f.netfang) links.push('<a href="mailto:' + esc(f.netfang) + '">✉️ ' + esc(f.netfang) + "</a>");
      pts.push(["👤", c + (links.length ? " · " + links.join(" · ") : ""), true]);
    }
    if (mails.length) {
      const m = mails[0];
      pts.push(["✉️", fmtD(m.received_at) + " — " + (m.subject || "(ekkert efni)") + (m.fra_okkur ? " (frá okkur)" : " (frá " + (m.sender_name || m.sender_email) + ")")]);
    }
    const warn = (f.athugasemdir || "").split("\n").find(l => /⚠|OPIÐ|OPID|vantar|bilað|bilun/i.test(l));
    const openQ = mails.filter(m => m.is_question && !m.fra_okkur).length;
    if (warn) pts.push(["⚠️", warn.trim()]);
    else if (openQ) pts.push(["⚠️", openQ + " ósvöruð spurning" + (openQ > 1 ? "ar" : "") + " í pósti"]);
    return pts.slice(0, 4);
  }

  function render(host, fid, data) {
    const f = data.f; if (!f) return;
    const pts = keyPoints(f, data.mails);
    const card = document.createElement("div");
    card.className = "card pad _samskipti-card";
    card.style.cssText = "margin:10px 0;border-left:4px solid #6366f1;background:#fff;border-radius:12px;padding:13px 15px;font-size:13.5px";
    const ptsHtml = pts.map(p => '<div style="display:flex;gap:8px;margin:4px 0;line-height:1.45"><span style="flex:none">' + p[0] + "</span><span>" + (p[2] ? p[1] : esc(p[1])) + "</span></div>").join("") ||
      '<div style="color:#94a3b8">Engin samskipti skráð enn — skráðu netfang tengiliðar til að sækja póstsögu.</div>';
    const mailsHtml = data.mails.map(m =>
      '<div style="padding:7px 9px;margin:5px 0;border-radius:8px;background:' + (m.is_question && !m.fra_okkur ? "#fef2f2;border:1px solid #fecaca" : "#f8fafc") + '">' +
      '<div style="font-size:11.5px;color:#64748b">' + fmtD(m.received_at) + " · " + esc(m.fra_okkur ? "Slökkvitæki ehf → viðskiptavinur" : (m.sender_name || m.sender_email)) +
      (m.is_question && !m.fra_okkur ? ' · <b style="color:#dc2626">spurning</b>' : "") + "</div>" +
      '<div style="font-weight:600">' + esc(m.subject || "(ekkert efni)") + "</div>" +
      '<div style="color:#475569;font-size:12.5px">' + esc((m.snippet || "").slice(0, 220)) + "</div></div>").join("") ||
      '<div style="color:#94a3b8;padding:6px 0">Engir póstar fundust á netfangi tengiliðar.</div>';
    const aths = (f.athugasemdir || "").trim();
    card.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
      '<div style="font-weight:800;font-size:12px;letter-spacing:.06em;color:#4f46e5">💬 SAMSKIPTASAGA &amp; BEIÐNIR</div>' +
      '<button type="button" class="_ssk-toggle" style="border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:99px;padding:3px 12px;font-size:12px;cursor:pointer;font-weight:700">Opna ▾</button></div>' +
      '<div class="_ssk-pts" style="margin-top:6px">' + ptsHtml + "</div>" +
      '<div class="_ssk-full" style="display:none;margin-top:10px;border-top:1px dashed #e2e8f0;padding-top:9px">' +
      '<div style="font-weight:700;font-size:11.5px;color:#64748b;letter-spacing:.05em;margin-bottom:3px">✉️ SÍÐUSTU PÓSTAR</div>' + mailsHtml +
      (aths ? '<div style="font-weight:700;font-size:11.5px;color:#64748b;letter-spacing:.05em;margin:10px 0 3px">📋 VERKLÝSING &amp; UPPLÝSINGAR</div><div style="white-space:pre-wrap;background:#f8fafc;border-radius:8px;padding:9px 11px;color:#334155">' + esc(aths) + "</div>" : "") +
      "</div>";
    card.querySelector("._ssk-toggle").addEventListener("click", e => {
      const full = card.querySelector("._ssk-full"), open = full.style.display === "none";
      full.style.display = open ? "" : "none";
      e.target.textContent = open ? "Loka ▴" : "Opna ▾";
    });
    host.appendChild(card);
  }

  async function decorate() {
    // sama aðferð og „Merkja mikilvægt"-bótin: finnum openEdit-hnappinn á opnum prófíl
    const btn = document.querySelector('button[onclick^="Companies.openEdit"]');
    if (!btn) return;
    const m = btn.getAttribute("onclick").match(/openEdit\((\d+)\)/);
    if (!m) return;
    const fid = +m[1];
    const row = btn.closest('[style*="display:flex"]') || btn.parentElement;
    const anchor = row ? (row.parentElement || row) : btn.parentElement;
    let host = anchor.querySelector(":scope > ._samskipti-host") || anchor.parentElement.querySelector("._samskipti-host");
    if (host) { if (host.dataset.fid === String(fid)) return; host.remove(); }
    host = document.createElement("div");
    host.className = "_samskipti-host"; host.dataset.fid = fid;
    (row && row.parentElement ? row.parentElement : anchor).insertBefore(host, row ? row.nextSibling : null);
    const data = await fetchData(fid);
    if (data) render(host, fid, data);
  }

  let t = null;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(decorate, 350); })
    .observe(document.body, { childList: true, subtree: true });
  setTimeout(decorate, 1200);
  console.log("[samskipti-panel] v1 installed");
})();
