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
  // 2026-07-30 — RÓTIN að „boxið kom aldrei": klíentinn í þessu appi heitir
  // DB.sb (js/db.js), EKKI window.sb. fetchData fékk því null og decorate
  // hætti þögult — hýsillinn festist á prófílinn en kortið teiknaðist aldrei.
  const sb = () => (window.DB && window.DB.sb) || window.sb || null;
  const cache = {};

  async function fetchData(fid) {
    if (cache[fid] && Date.now() - cache[fid]._ts < 60000) return cache[fid];
    const client = sb(); if (!client) return null;
    const out = { _ts: Date.now(), f: null, mails: [], handled: "", siblings: [fid] };
    try {
      const { data: f } = await client.from("fyrirtaeki")
        .select('id,nafn,customer_base_id,banner_note,athugasemdir,netfang,simi,farsimi,"tengiliður",tengilidur')
        .eq("id", fid).maybeSingle();
      out.f = f || null;
      // 2026-07-30 (ósk Agnars — „skilaboða boxið í fyrirtækin", sama og
      // Heimaleigu-skúffan á Þjónustuborðinu): sagan er lesin á FÉLAGINU
      // (felag_samskipti) þegar byggingin á base. Eftir sönnunar-tenginguna á
      // stök bygging oft ENGA sannaða pósta þótt félagið eigi tugi — gamla
      // fyrirspurnin skildi boxið eftir tómt. Póstur á aðra byggingu ber
      // 📍-merki hennar.
      if (f && f.customer_base_id) {
        const { data: mails } = await client.from("felag_samskipti")
          .select("email_id,sender_name,sender_email,subject,snippet,is_question,fra_okkur,received_at,fyrirtaeki_id,fyrirtaeki_nafn,via")
          .eq("customer_base_id", f.customer_base_id).order("received_at", { ascending: false }).limit(30);
        out.mails = mails || [];
        const { data: sib } = await client.from("fyrirtaeki")
          .select("id").eq("customer_base_id", f.customer_base_id).is("deleted_at", null);
        out.siblings = (sib || []).map(x => x.id);
        if (!out.siblings.length) out.siblings = [fid];
      } else {
        const { data: mails } = await client.from("fyrirtaeki_samskipti")
          .select("email_id,sender_name,sender_email,subject,snippet,is_question,fra_okkur,received_at")
          .eq("fyrirtaeki_id", fid).order("received_at", { ascending: false }).limit(30);
        out.mails = mails || [];
      }
      // ✓-staðan (samskipti_stada) — spurning eldri en hún telst afgreidd
      const { data: h } = await client.from("samskipti_stada")
        .select("handled_at").eq("fyrirtaeki_id", fid).maybeSingle();
      out.handled = (h && h.handled_at) || "";
    } catch (e) { console.warn("[samskipti-panel]", e); }
    cache[fid] = out; return out;
  }
  // Opið erindi = spurning frá kúnna sem er nýrri en BÆÐI síðasta frá-okkur
  // sending og ✓-merkingin (sama regla og Þjónustuborðið).
  function cutOf(data) {
    const lastUs = data.mails.filter(m => m.fra_okkur).map(m => m.received_at).sort().pop() || "";
    return lastUs > (data.handled || "") ? lastUs : (data.handled || "");
  }
  async function markHandled(data) {
    const client = sb(); if (!client) return false;
    const nu = new Date().toISOString();
    let who = ""; try { who = localStorage.getItem("ky_me") || localStorage.getItem("bs_employee") || ""; } catch (_) {}
    const rows = data.siblings.map(id => ({ fyrirtaeki_id: id, handled_at: nu, handled_by: who, updated_at: nu }));
    const { error } = await client.from("samskipti_stada").upsert(rows, { onConflict: "fyrirtaeki_id" });
    if (error) { console.warn("[samskipti-panel] mark", error); return false; }
    data.handled = nu; return true;
  }

  function keyPoints(f, mails, cut) {
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
    const openQ = mails.filter(m => m.is_question && !m.fra_okkur && (!cut || m.received_at > cut)).length;
    if (warn) pts.push(["⚠️", warn.trim()]);
    else if (openQ) pts.push(["⚠️", openQ + " ósvöruð spurning" + (openQ > 1 ? "ar" : "") + " í pósti"]);
    return pts.slice(0, 4);
  }

  function render(host, fid, data) {
    const f = data.f; if (!f) return;
    const cut = cutOf(data);
    const openQ = data.mails.filter(m => m.is_question && !m.fra_okkur && (!cut || m.received_at > cut)).length;
    const pts = keyPoints(f, data.mails, cut);
    const card = document.createElement("div");
    card.className = "card pad _samskipti-card";
    card.style.cssText = "margin:10px 0;border-left:4px solid #6366f1;background:#fff;border-radius:12px;padding:13px 15px;font-size:13.5px";
    const ptsHtml = pts.map(p => '<div style="display:flex;gap:8px;margin:4px 0;line-height:1.45"><span style="flex:none">' + p[0] + "</span><span>" + (p[2] ? p[1] : esc(p[1])) + "</span></div>").join("") ||
      '<div style="color:#94a3b8">Engin samskipti skráð enn — skráðu netfang tengiliðar til að sækja póstsögu.</div>';
    const mailsHtml = data.mails.map(m => {
      const open = m.is_question && !m.fra_okkur && (!cut || m.received_at > cut);
      const via = (m.fyrirtaeki_nafn && m.fyrirtaeki_id !== fid)
        ? ' <span style="background:#eef2ff;border:1px solid #c7d2fe;color:#4338ca;border-radius:99px;padding:0 7px;font-size:10.5px;font-weight:700;white-space:nowrap">📍 ' + esc(m.fyrirtaeki_nafn) + "</span>" : "";
      return '<div style="padding:7px 9px;margin:5px 0;border-radius:8px;background:' + (open ? "#fef2f2;border:1px solid #fecaca" : "#f8fafc") + '">' +
      '<div style="font-size:11.5px;color:#64748b">' + fmtD(m.received_at) + " · " + esc(m.fra_okkur ? "Slökkvitæki ehf → viðskiptavinur" : (m.sender_name || m.sender_email)) +
      (open ? ' · <b style="color:#dc2626">spurning — ósvarað</b>' : "") + via + "</div>" +
      '<div style="font-weight:600">' + esc(m.subject || "(ekkert efni)") + "</div>" +
      '<div style="color:#475569;font-size:12.5px">' + esc((m.snippet || "").slice(0, 220)) + "</div></div>"; }).join("") ||
      '<div style="color:#94a3b8;padding:6px 0">Engir póstar fundust á netfangi tengiliðar.</div>';
    const aths = (f.athugasemdir || "").trim();
    card.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">' +
      '<div style="font-weight:800;font-size:12px;letter-spacing:.06em;color:#4f46e5">💬 SAMSKIPTASAGA &amp; BEIÐNIR</div>' +
      '<div style="display:flex;gap:7px;align-items:center">' +
      (openQ > 0
        ? '<button type="button" class="_ssk-mark" style="border:1px solid #156e3a;background:linear-gradient(150deg,#2bbf6c,#0f6e3a);color:#fff;border-radius:99px;padding:3px 12px;font-size:12px;cursor:pointer;font-weight:700">✓ Merkja afgreitt</button>'
        : (data.handled ? '<span style="color:#0f6e3a;font-weight:700;font-size:11.5px">✓ Afgreitt</span>' : "")) +
      '<button type="button" class="_ssk-toggle" style="border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:99px;padding:3px 12px;font-size:12px;cursor:pointer;font-weight:700">Póstar ▾</button></div></div>' +
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
    const mk = card.querySelector("._ssk-mark");
    if (mk) mk.addEventListener("click", async e => {
      e.target.disabled = true; e.target.textContent = "⏳ …";
      const ok = await markHandled(data);
      if (!ok) { e.target.disabled = false; e.target.textContent = "✓ Merkja afgreitt"; alert("Tókst ekki að merkja — reyndu aftur."); return; }
      delete cache[fid];               // ferskt við næstu opnun
      host.innerHTML = "";             // teikna kortið strax upp á nýtt
      render(host, fid, data);
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
    // Snemm-útgangur ÁÐUR en dýra hnappa-skönnunin keyrir — tifið er tíðara
    // núna (sjá „ÞROT-varið tif" neðst) svo þetta má ekki kosta neitt þegar
    // spjaldið er þegar á sínum stað.
    let host = document.querySelector("._samskipti-host");
    if (host && document.contains(host) && host.dataset.fid === String(fid) && host.childElementCount) return;
    // Besta akkerið (ósk Agnars 29.07): auða svæðið við hlið aðgerðahnappanna
    // („Merkja mikilvægt" o.fl.) — spjaldið fer beint fyrir aftan þá röð svo
    // punktarnir BLASI VIÐ án þess að opna Breyta-gluggann.
    let row = null;
    const mk = [...document.querySelectorAll("button")].find(b => /Merkja mikilvægt/.test(b.textContent || ""));
    if (mk) row = mk.parentElement;
    if (!row) row = btn.closest('[style*="display:flex"]') || btn.parentElement;
    const anchor = row ? (row.parentElement || row) : btn.parentElement;
    if (host) host.remove();
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
    // 175 endurteiknar `_rf_body` með innerHTML= — þá losnar gamla `._rf_info`
    // úr trénu (parentNode verður null). Aldrei skrifa í laust tré: næsta tif
    // finnur nýja kassann og býr spjaldið til aftur.
    if (!info || !info.parentNode || !document.contains(info)) return;
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
    if (card) {
      // Skila EINGÖNGU þegar spjaldið er raunverulega á sínum stað OG búið að
      // teikna sig. Gamla útgáfan skoðaði bara `dataset.dom`, svo spjald sem
      // sat fast í „Sæki póstsögu…" (eða hafði losnað í endurteiknun) lifði
      // að eilífu og engin ný tilraun var gerð.
      const same = card.dataset.dom === (dom || "") && document.contains(card);
      const busy = card.dataset.state === "loading" && Date.now() - (+card.dataset.ts || 0) < 15000;
      if (same && (card.dataset.state === "done" || busy)) return;
      card.remove(); card = null;
    }
    card = document.createElement("div");
    card.className = "_samskipti-rf"; card.dataset.dom = dom || "";
    card.dataset.state = "loading"; card.dataset.ts = String(Date.now());
    card.style.cssText = "margin:0 0 14px;border-left:4px solid #6366f1;background:var(--surface,#fff);border:1px solid var(--brd,#e2e8f0);border-left:4px solid #6366f1;border-radius:10px;padding:12px 14px;font-size:13px";
    if (slot) slot.appendChild(card); else info.parentNode.insertBefore(card, info.nextSibling);
    if (!dom) {
      card.innerHTML = '<div style="color:#94a3b8">💬 Engin netföng skráð á félagið — skráðu netfang til að sjá póstsögu.</div>';
      card.dataset.state = "done"; return;
    }
    card.innerHTML = '<div style="font-weight:800;font-size:11px;letter-spacing:.06em;color:#4f46e5">💬 SAMSKIPTASAGA (@' + esc(dom) + ')</div><div style="color:#94a3b8;margin-top:4px">Sæki póstsögu…</div>';
    const mails = await rfMails(dom);
    // 175 gæti hafa endurteiknað á meðan sótt var — þá er þetta spjald laust
    // og næsta tif býr til nýtt (annars skrifuðum við í ósýnilegt tré).
    if (!document.contains(card)) return;
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
    card.dataset.state = "done";
  }

  // ── ÞROT-VARIÐ TIF (2026-07-30 — rótin að „engin samskipti" gallanum) ──────
  // Gamla kveikjan var endurstillanleg biðlykkja:
  //     new MutationObserver(() => { clearTimeout(t); t = setTimeout(run, 350); })
  // Hliðarstikan endurskrifar hnappa-texta sína (`.vnav-btn`, teljarar/merki)
  // á ~50 ms fresti ALLAN tímann, svo `clearTimeout` núllstillti tímarann áður
  // en hann náði 350 ms. Mælt í vafra á deploy-preview: 555 breytingalotur á
  // einni lotu → **0 keyrslur**, bil milli breytinga 44–55 ms (399 af 400
  // undir 350 ms). Eina keyrslan sem nokkurn tímann varð var `setTimeout(…,1200)`
  // við ræsingu — löngu áður en rekstrarfélaga-síðan er opnuð, svo hún fann
  // engan `._rf_info` og gerði ekkert. Þess vegna sat `._rf_samskipti_slot`
  // tómt þótt fyrirspurnin sjálf skilaði röðum.
  //
  // Núna: kveikja sem má EKKI núllstilla (fyrsta breyting ræsir keyrslu eftir
  // í mesta lagi 250 ms) + hægt öryggis-tif fyrir kyrrar síður. `_running`
  // hindrar að tvær samhliða keyrslur búi til tvö spjöld.
  let _timer = null, _running = false;
  function runNow() {
    _timer = null;
    if (_running) return;                 // næsta DOM-breyting (eða tifið) endurræsir
    _running = true;
    Promise.resolve()
      .then(() => decorate())
      .catch(e => console.warn("[samskipti-panel]", e))
      .then(() => decorateRF())
      .catch(e => console.warn("[samskipti-rf]", e))
      .then(() => { _running = false; });
  }
  function schedule() { if (_timer) return; _timer = setTimeout(runNow, 250); }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  setInterval(schedule, 3000);            // öryggisnet ef ekkert hreyfist
  schedule();
  console.log("[samskipti-panel] v3 installed (prófílar + rekstrarfélög · þrot-varið tif)");
})();
