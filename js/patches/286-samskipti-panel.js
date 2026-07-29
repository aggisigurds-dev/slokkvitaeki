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
      '<button type="button" class="_ssk-toggle" style="border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:99px;padding:3px 12px;font-size:12px;cursor:pointer;font-weight:700">Póstar ▾</button></div>' +
      '<div class="_ssk-pts" style="margin-top:6px">' + ptsHtml + "</div>" +
      // Punktarnir ALLTAF sýnilegir (ósk Agnars 29.07: „ég mun aldrei fatta að
      // checka inn í edit" — textinn úr athugasemdareitnum birtist hér beint).
      (aths ? '<div style="font-weight:700;font-size:11.5px;color:#64748b;letter-spacing:.05em;margin:9px 0 3px">📋 PUNKTAR &amp; UPPLÝSINGAR</div>' +
        '<div style="white-space:pre-wrap;background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:9px 11px;color:#334155;max-height:180px;overflow:auto;font-size:12.5px;line-height:1.5">' + esc(aths) + "</div>" : "") +
      '<div class="_ssk-full" style="display:none;margin-top:10px;border-top:1px dashed #e2e8f0;padding-top:9px">' +
      '<div style="font-weight:700;font-size:11.5px;color:#64748b;letter-spacing:.05em;margin-bottom:3px">✉️ SÍÐUSTU PÓSTAR</div>' + mailsHtml +
      "</div>";
    card.querySelector("._ssk-toggle").addEventListener("click", e => {
      const full = card.querySelector("._ssk-full"), open = full.style.display === "none";
      full.style.display = open ? "" : "none";
      e.target.textContent = open ? "Loka ▴" : "Póstar ▾";
    });
    host.appendChild(card);
  }

  async function decorate() {
    // fid af openEdit-hnappnum á opnum prófíl
    const btn = document.querySelector('button[onclick^="Companies.openEdit"]');
    if (!btn) return;
    const m = btn.getAttribute("onclick").match(/openEdit\((\d+)\)/);
    if (!m) return;
    const fid = +m[1];
    // Besta akkerið (ósk Agnars 29.07): auða svæðið við hlið aðgerðahnappanna
    // („Merkja mikilvægt" o.fl.) — spjaldið fer beint fyrir aftan þá röð svo
    // punktarnir BLASI VIÐ án þess að opna Breyta-gluggann.
    let row = null;
    const mk = [...document.querySelectorAll("button")].find(b => /Merkja mikilvægt/.test(b.textContent || ""));
    if (mk) row = mk.parentElement;
    if (!row) row = btn.closest('[style*="display:flex"]') || btn.parentElement;
    const anchor = row ? (row.parentElement || row) : btn.parentElement;
    let host = document.querySelector("._samskipti-host");
    if (host) { if (host.dataset.fid === String(fid) && host.childElementCount) return; host.remove(); }
    host = document.createElement("div");
    host.className = "_samskipti-host"; host.dataset.fid = fid;
    (row && row.parentElement ? row.parentElement : anchor).insertBefore(host, row ? row.nextSibling : null);
    const data = await fetchData(fid);
    if (data) render(host, fid, data);
  }

  // ── Rekstrarfélags-síðan (#view-rekstrarfelog, patch 175) ─────────────────
  // Sama spjald þar: netföng lesin úr „Upplýsingar um rekstrarfélag"-kassanum,
  // póstsagan sótt eftir LÉNI félagsins (öll netföng þess) beint úr email_digest.
  const RU = "https://osfdzskyvisifcwyjkuk.supabase.co";
  const RK = "sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f";
  const rfCache = {};
  async function rfMails(dom) {
    // 5 mín skyndiminni — síðan endurteiknast ört (realtime-refresh) og spjaldið
    // þarf að birtast SAMSTUNDIS aftur, ekki bíða eftir nýrri póstsókn í hvert sinn.
    if (rfCache[dom] && Date.now() - rfCache[dom]._ts < 300000) return rfCache[dom].m;
    let m = [];
    try {
      const r = await fetch(RU + "/rest/v1/email_digest?select=received_at,sender_name,sender_email,subject,snippet,is_question" +
        "&or=(sender_email.ilike.*%40" + encodeURIComponent(dom) + ",to_addresses.ilike.*" + encodeURIComponent(dom) + "*)" +
        "&order=received_at.desc&limit=8", { headers: { apikey: RK, Authorization: "Bearer " + RK } });
      m = (await r.json()).map(x => ({ ...x, fra_okkur: /eldklar/i.test(x.sender_email || "") }));
    } catch (e) { console.warn("[samskipti-rf]", e); }
    rfCache[dom] = { _ts: Date.now(), m };
    return m;
  }
  async function decorateRF() {
    const v = document.getElementById("view-rekstrarfelog");
    if (!v) return;
    // ATH: ekki offsetParent-tékk — það er null á position:fixed (síma-/app-ham)
    // og spjaldið birtist þá aldrei þar. Rect-stærð segir satt í öllum hömum.
    const r = v.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    // Accordion-síðan getur haft MARGA ._rf_info kassa í DOM (eitt per opnað
    // félag) — hver fær sitt spjald, hengt beint fyrir aftan SINN kassa.
    const infos = [...v.querySelectorAll("._rf_info")];
    if (!infos.length) { v.querySelectorAll("._samskipti-rf").forEach(c => c.remove()); return; }
    for (const info of infos) {
      try { await decorateRFone(info); }
      catch (e) { console.warn("[samskipti-rf] villa:", e); }
    }
  }
  async function decorateRFone(info) {
    // Netföng: bæði mailto-hlekkir OG hreinn texti (mismunandi útgáfur spjaldsins)
    let emails = [...info.querySelectorAll('a[href^="mailto:"]')].map(a => a.getAttribute("href").slice(7));
    if (!emails.length) {
      emails = (String(info.textContent || "").match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || []);
    }
    const doms = {};
    emails.forEach(e => { const d = (e.split("@")[1] || "").toLowerCase().trim(); if (d) doms[d] = (doms[d] || 0) + 1; });
    const dom = Object.keys(doms).sort((a, b) => doms[b] - doms[a])[0];
    // Fast plásshólf úr 175 (lifir af endurteiknanir) ef til, annars systkini.
    const slot = info.parentNode.querySelector("._rf_samskipti_slot");
    let card = slot ? slot.querySelector("._samskipti-rf")
      : (info.nextElementSibling && info.nextElementSibling.classList && info.nextElementSibling.classList.contains("_samskipti-rf")
         ? info.nextElementSibling : null);
    if (card) { if (card.dataset.dom === (dom || "")) return; card.remove(); card = null; }
    card = document.createElement("div");
    card.className = "_samskipti-rf"; card.dataset.dom = dom || "";
    card.style.cssText = "margin:0 0 14px;border-left:4px solid #6366f1;background:var(--surface,#fff);border:1px solid var(--brd,#e2e8f0);border-left:4px solid #6366f1;border-radius:10px;padding:12px 14px;font-size:13px";
    if (slot) slot.appendChild(card); else info.parentNode.insertBefore(card, info.nextSibling);
    if (!dom) { card.innerHTML = '<div style="color:#94a3b8">💬 Engin netföng skráð á félagið — skráðu netfang til að sjá póstsögu.</div>'; return; }
    card.innerHTML = '<div style="font-weight:800;font-size:11px;letter-spacing:.06em;color:#4f46e5">💬 SAMSKIPTASAGA (@' + esc(dom) + ')</div><div style="color:#94a3b8;margin-top:4px">Sæki póstsögu…</div>';
    const mails = await rfMails(dom);
    const lastUs = mails.filter(m => m.fra_okkur).map(m => m.received_at).sort().pop() || "";
    const openQ = mails.filter(m => m.is_question && !m.fra_okkur && m.received_at > lastUs).length;
    const top = mails[0];
    const mailsHtml = mails.map(m =>
      '<div style="padding:6px 9px;margin:4px 0;border-radius:8px;background:' + (m.is_question && !m.fra_okkur ? "#fef2f2;border:1px solid #fecaca" : "var(--surface2,#f8fafc)") + '">' +
      '<div style="font-size:11px;color:#64748b">' + fmtD(m.received_at) + " · " + esc(m.fra_okkur ? "Slökkvitæki ehf" : (m.sender_name || m.sender_email)) +
      (m.is_question && !m.fra_okkur ? ' · <b style="color:#dc2626">spurning</b>' : "") + "</div>" +
      '<div style="font-weight:600">' + esc(m.subject || "(ekkert efni)") + "</div>" +
      '<div style="color:#64748b;font-size:12px">' + esc((m.snippet || "").slice(0, 180)) + "</div></div>").join("") ||
      '<div style="color:#94a3b8;padding:4px 0">Engir póstar fundust á @' + esc(dom) + ".</div>";
    card.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
      '<div style="font-weight:800;font-size:11px;letter-spacing:.06em;color:#4f46e5">💬 SAMSKIPTASAGA <span style="font-weight:400;color:#94a3b8">@' + esc(dom) + "</span></div>" +
      '<button type="button" class="_ssk-rf-toggle" style="border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:99px;padding:3px 12px;font-size:12px;cursor:pointer;font-weight:700">Opna ▾</button></div>' +
      '<div style="margin-top:5px">' +
      (top ? '<div style="display:flex;gap:8px;line-height:1.45"><span>✉️</span><span>' + fmtD(top.received_at) + " — " + esc(top.subject || "(ekkert efni)") +
        ' <span style="color:#94a3b8">(' + (top.fra_okkur ? "frá okkur" : "frá " + esc(top.sender_name || top.sender_email)) + ")</span></span></div>"
        : '<div style="color:#94a3b8">Engir póstar fundust á @' + esc(dom) + ".</div>") +
      (openQ ? '<div style="display:flex;gap:8px;margin-top:3px"><span>⚠️</span><span style="color:#dc2626;font-weight:700">' + openQ + " ósvöruð spurning" + (openQ > 1 ? "ar" : "") + " í pósti</span></div>" : "") +
      "</div>" +
      '<div class="_ssk-rf-full" style="display:none;margin-top:9px;border-top:1px dashed #e2e8f0;padding-top:8px">' + mailsHtml + "</div>";
    card.querySelector("._ssk-rf-toggle").addEventListener("click", e => {
      const full = card.querySelector("._ssk-rf-full"), open = full.style.display === "none";
      full.style.display = open ? "" : "none";
      e.target.textContent = open ? "Loka ▴" : "Opna ▾";
    });
  }

  let t = null;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(() => { decorate(); decorateRF(); }, 350); })
    .observe(document.body, { childList: true, subtree: true });
  setTimeout(() => { decorate(); decorateRF(); }, 1200);
  console.log("[samskipti-panel] v2 installed (prófílar + rekstrarfélög)");
})();
