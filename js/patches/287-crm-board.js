/* js/patches/287-crm-board.js — 📇 Samskiptaborð (CRM) — hét áður Þjónustuborð
   ────────────────────────────────────────────────────────────
   v1: Flotandi hnappur neðst til hægri → borð með síðasta pósti,
   ósvöruðum spurningum og útvíkkanlegri póstsögu (crm_cache).
   v2 (2026-07-29): Full síða „📇 Samskiptaborð" (view 'samskiptabord')
       ENDURSKÍRT 2026-08-06 (ósk Agnars): hét „Þjónustuborð" og slug-ið
       'thjonustubord'. Nafnið færðist yfir á Verkborðið (#231) svo tvær
       síður beri ekki sama heiti; þessi er CRM-samskiptaborð og heitir það nú.
   yfir NÝJU sýnina crm_yfirlit — allt félagið á einni línu: síðasti
   póstur, skoðunarmánuður, skjalateljarar (S/Ú/R) og ógreitt í Payday.
   Hópun eftir rekstrarfélagi, leit, röðun, smellur opnar fyrirtækið.
   Smíðað af Cowork 2026-07-29. */
(() => {
  if (window.__crmBoardInstalled) return;
  window.__crmBoardInstalled = true;

  const U = "https://osfdzskyvisifcwyjkuk.supabase.co";
  const K = "sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f";
  const H = { apikey: K, Authorization: "Bearer " + K };
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtD = d => { if (!d) return "—"; try { return new Date(d).toLocaleDateString("is-IS", { day: "numeric", month: "short", year: "numeric" }); } catch { return "—" } };
  const daysAgo = d => d ? Math.floor((Date.now() - new Date(d).getTime()) / 864e5) : null;

  let DATA = null, filter = "all", q = "";

  // 2026-07-30 (ósk Agnars): ENGINN fljótandi hnappur á öllum síðum lengur —
  // hann sat fastur neðst til hægri yfir hverri einustu síðu og skyggði á efni.
  // Samskiptaborðið opnast núna AÐEINS úr Þjónustuverki (Verkborð, patch 231):
  // við skjótum chip inn í fyrstu stjórn-röðina (.vb-scroll) þegar sú síða er
  // sýnileg. Borðið sjálft (open()) er óbreytt og líka aðgengilegt gegnum
  // window.CrmBoard.open() fyrir aðra kalla.
  const CHIP_ID = "_crm-open-chip";
  function mountChip() {
    const v = document.getElementById("view-verkbord");
    if (!v) return;
    const r = v.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;        // ekki sýnilegt
    if (v.querySelector("#" + CHIP_ID)) return;         // þegar til
    const row = v.querySelector(".vb-scroll");
    if (!row) return;
    const b = document.createElement("button");
    b.id = CHIP_ID;
    b.type = "button";
    b.textContent = "📇 Samskipti";
    b.style.cssText = "border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:99px;padding:6px 13px;font-size:12.5px;font-weight:700;cursor:pointer;white-space:nowrap";
    b.addEventListener("click", open);
    row.appendChild(b);
  }
  // ÞROT-VARIÐ TIF — sama gildra og felldi patch 286 (sjá þar).
  // Fyrri útgáfa notaði `clearTimeout(_mt); _mt = setTimeout(mountChip, 200)`.
  // Hliðarstikan endurskrifar hnappa-texta sína á ~50 ms fresti allan tímann, svo
  // sú biðlykkja NÁÐI ALDREI að renna út og chip-inn birtist aldrei. Mælt á 286:
  // 555 breytingalotur → núll keyrslur. Hér má tímarinn EKKI núllstillast: fyrsta
  // breyting ræsir keyrslu eftir í mesta lagi 250 ms, plús hægt öryggis-tif.
  let _mt = null;
  function scheduleMount() {
    if (_mt) return;
    _mt = setTimeout(() => { _mt = null; try { mountChip(); } catch (_) {} }, 250);
  }
  new MutationObserver(scheduleMount).observe(document.body, { childList: true, subtree: true });
  setInterval(scheduleMount, 3000);
  scheduleMount();
  window.CrmBoard = { open };

  function badge(r) {
    if (r.osvarad > 0) return ["🔴", "Ósvöruð spurning í pósti"];
    const d = daysAgo(r.sidasti_postur);
    if (d === null) return ["⚪", "Engin póstsaga (ekkert netfang skráð?)"];
    if (d > 400) return ["🟡", "Ekkert samband í " + d + " daga"];
    return ["🟢", "Í lagi"];
  }

  // Litir borðsins (2026-08-07, ósk Agnars: „total page audit fix for grey on
  // grey — lack of contrast between text and background", skjáskot af símanum).
  // Rótin: borðið erfði textalit frá <body> — undir dökku þema (66) eða dökkum
  // Brunastál-bakgrunni (220/230) er sá litur LJÓS, svo félagsnöfnin (sem höfðu
  // engan eigin lit) urðu nær ósýnileg á hvítu spjöldunum. Inline-litirnir
  // (#475569/#94a3b8 …) voru að auki endurskrifaðir af attribute-selectorum
  // annarra þema-patcha ([style*="color:#94a3b8"] → annar litur !important í
  // 66/229/240), svo gráskalinn snerist við. Lausnin: ALLIR litir búa nú í
  // þessu klasa-stílblaði með skýrum lit á hverjum texta — ekkert erft, engir
  // inline-litastrengir sem þemu geta gripið. Borðið er alltaf ljóst spjald,
  // líka ofan á dökku þema, og hver grár mælist ≥4,5:1 á sínum fleti (WCAG AA):
  // #0f172a 16,9 · #334155 9,8 · #475569 7,5 · #525b6b 6,3 · #64748b 4,8 ·
  // #b91c1c 5,9 · #b45309 4,6 · #4338ca 8,0 — allt mælt á hvítu.
  function crmStyle() {
    if (document.getElementById("_crm-style")) return;
    const s = document.createElement("style");
    s.id = "_crm-style";
    s.textContent =
      "#_crm-box{background:#f8fafc;color:#0f172a;border-radius:16px;max-width:860px;width:100%;height:fit-content;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,.4)}" +
      "#_crm-ov .crm-head{padding:16px 20px 10px;border-bottom:1px solid #e2e8f0;background:#fff;border-radius:16px 16px 0 0}" +
      "#_crm-ov .crm-title{font-weight:800;font-size:15px;color:#0f172a}" +
      "#_crm-ov .crm-subh{font-weight:400;color:#525b6b;font-size:12px}" +
      "#_crm-ov .crm-input{flex:1;min-width:180px;border:1px solid #cbd5e1;border-radius:10px;padding:8px 12px;font-size:14px;background:#fff;color:#0f172a}" +
      "#_crm-ov .crm-input::placeholder{color:#64748b}" +
      "#_crm-ov .crm-chip{border-radius:99px;padding:6px 13px;font-size:12.5px;font-weight:700;cursor:pointer}" +
      "#_crm-ov .crm-chip-red{border:1px solid #fecaca;background:#fef2f2;color:#b91c1c}" +
      "#_crm-ov .crm-chip-ind{border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca}" +
      "#_crm-ov .crm-chip-plain{border:1px solid #cbd5e1;background:#fff;color:#334155}" +
      "#_crm-ov .crm-x{border:0;background:#e2e8f0;color:#0f172a;border-radius:99px;width:32px;height:32px;cursor:pointer;font-size:16px}" +
      "#_crm-ov #_crm-list{overflow:auto;padding:10px 14px 16px}" +
      "#_crm-ov .crm-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 13px;margin:6px 0;cursor:pointer;color:#0f172a}" +
      "#_crm-ov .crm-card.osv{border-left:4px solid #ef4444}" +
      "#_crm-ov .crm-name{font-weight:700;font-size:14px;color:#0f172a}" +
      "#_crm-ov .crm-tengi{color:#475569;font-size:12.5px}" +
      "#_crm-ov .crm-badge{background:#fef2f2;color:#b91c1c;border-radius:99px;padding:1px 9px;font-size:11.5px;font-weight:700}" +
      "#_crm-ov .crm-meta{color:#475569;font-size:12.5px;margin-top:3px}" +
      "#_crm-ov .crm-faint{color:#64748b}" +
      "#_crm-ov .crm-banner{color:#b45309;font-size:12.5px;margin-top:2px}" +
      "#_crm-ov .crm-empty{color:#64748b;padding:16px}" +
      "#_crm-ov .crm-mail{background:#f8fafc;border-radius:8px;padding:6px 9px;margin:4px 0;color:#0f172a}" +
      "#_crm-ov .crm-mail.q{background:#fef2f2}" +
      "#_crm-ov .crm-mailmeta{font-size:11px;color:#525b6b}" +
      "#_crm-ov .crm-mailsubj{font-weight:600;font-size:12.5px;color:#0f172a}" +
      "#_crm-ov .crm-mailsnip{color:#475569;font-size:12px}" +
      "#_crm-ov .crm-plabel{font-size:11px;font-weight:700;color:#525b6b;margin:8px 0 3px}" +
      "#_crm-ov .crm-pbox{white-space:pre-wrap;background:#f8fafc;border-radius:8px;padding:8px 10px;font-size:12px;color:#334155}" +
      "#_crm-ov .crm-links a{color:#1d4ed8;font-weight:600;text-decoration:none}";
    document.head.appendChild(s);
  }

  async function open() {
    let ov = document.getElementById("_crm-ov");
    if (ov) { ov.remove(); return; }
    crmStyle();
    ov = document.createElement("div");
    ov.id = "_crm-ov";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:9999;display:flex;justify-content:center;padding:24px;overflow:auto";
    ov.innerHTML = '<div id="_crm-box">' +
      '<div class="crm-head">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
      '<div class="crm-title">📇 SAMSKIPTABORÐ <span id="_crm-sub" class="crm-subh"></span></div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
      '<button id="_crm-full" class="crm-chip crm-chip-ind">Opna Samskiptaborð ↗</button>' +
      '<button id="_crm-x" class="crm-x">✕</button></div></div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center">' +
      '<input id="_crm-q" class="crm-input" placeholder="Leita að félagi…">' +
      '<button class="_crm-f crm-chip crm-chip-red" data-f="osvarad">🔴 Ósvarað <span id="_crm-n-osv"></span></button>' +
      '<button class="_crm-f crm-chip crm-chip-ind" data-f="med">✉️ Með póstsögu</button>' +
      '<button class="_crm-f crm-chip crm-chip-plain" data-f="all">Öll félög</button>' +
      "</div></div>" +
      '<div id="_crm-list">Sæki gögn…</div></div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", e => { if (e.target === ov || e.target.id === "_crm-x") ov.remove(); });
    ov.querySelector("#_crm-full").addEventListener("click", () => { ov.remove(); if (window.App && App.switchView && window.App._tbordSwitchPatched) App.switchView("samskiptabord"); else if (window.Samskiptabord) Samskiptabord.open(); });
    ov.querySelector("#_crm-q").addEventListener("input", e => { q = e.target.value.toLowerCase(); renderList(); });
    ov.querySelectorAll("._crm-f").forEach(b => b.addEventListener("click", () => { filter = b.dataset.f; renderList(); }));
    if (!DATA) {
      try {
        const r = await fetch(U + "/rest/v1/crm_cache?select=*", { headers: H });
        DATA = await r.json();
        DATA.sort((a, b) => (b.osvarad > 0) - (a.osvarad > 0) ||
          new Date(b.sidasti_postur || 0) - new Date(a.sidasti_postur || 0));
      } catch (e) { document.getElementById("_crm-list").textContent = "Villa við að sækja gögn: " + e.message; return; }
    }
    const t = DATA[0]?.refreshed_at;
    document.getElementById("_crm-sub").textContent = "— " + DATA.length + " félög í þjónustu · uppfært " + (t ? new Date(t).toLocaleString("is-IS") : "");
    document.getElementById("_crm-n-osv").textContent = "(" + DATA.filter(r => r.osvarad > 0).length + ")";
    renderList();
  }

  function renderList() {
    const host = document.getElementById("_crm-list"); if (!host || !DATA) return;
    let rows = DATA;
    if (filter === "osvarad") rows = rows.filter(r => r.osvarad > 0);
    if (filter === "med") rows = rows.filter(r => r.sidasti_postur);
    if (q) rows = rows.filter(r => (r.nafn || "").toLowerCase().includes(q) || (r.tengilidur || "").toLowerCase().includes(q) || (r.netfang || "").toLowerCase().includes(q));
    host.innerHTML = rows.length ? "" : '<div class="crm-empty">Ekkert félag fannst.</div>';
    for (const r of rows.slice(0, 400)) {
      const [dot, tip] = badge(r);
      const row = document.createElement("div");
      row.className = "crm-card" + (r.osvarad > 0 ? " osv" : "");
      row.innerHTML =
        '<div style="display:flex;gap:9px;align-items:baseline;flex-wrap:wrap">' +
        '<span title="' + esc(tip) + '">' + dot + '</span>' +
        '<span class="crm-name">' + esc(r.nafn) + "</span>" +
        (r.tengilidur ? '<span class="crm-tengi">👤 ' + esc(r.tengilidur) + "</span>" : "") +
        (r.osvarad > 0 ? '<span class="crm-badge">' + r.osvarad + " ósvarað</span>" : "") +
        "</div>" +
        '<div class="crm-meta">✉️ ' +
        (r.sidasti_postur
          ? fmtD(r.sidasti_postur) + " — " + esc(r.sidasta_efni || "(ekkert efni)") +
            ' <span class="crm-faint">(' + (r.sidasti_fra_okkur ? "frá okkur" : "frá " + esc(r.sidasti_sendandi || "viðskiptavini")) + ")</span>"
          : '<span class="crm-faint">engin póstsaga' + (r.netfang ? "" : " — ekkert netfang skráð") + "</span>") +
        "</div>" +
        (r.banner_note ? '<div class="crm-banner">📌 ' + esc(r.banner_note) + "</div>" : "") +
        '<div class="_crm-exp" style="display:none"></div>';
      row.addEventListener("click", ev => { if (ev.target.closest("a")) return; expand(row, r); });
      host.appendChild(row);
    }
  }

  async function expand(row, r) {
    const box = row.querySelector("._crm-exp");
    if (box.style.display !== "none") { box.style.display = "none"; return; }
    box.style.display = "";
    box.innerHTML = '<div class="crm-faint" style="font-size:12px;padding:6px 0">Sæki póstsögu…</div>';
    let mails = [];
    try {
      const res = await fetch(U + "/rest/v1/fyrirtaeki_samskipti?fyrirtaeki_id=eq." + r.fyrirtaeki_id +
        "&select=received_at,sender_name,subject,snippet,is_question,fra_okkur&order=received_at.desc&limit=5", { headers: H });
      mails = await res.json();
    } catch (e) { }
    box.innerHTML = '<div style="border-top:1px dashed #e2e8f0;margin-top:8px;padding-top:8px">' +
      (mails.length ? mails.map(m =>
        '<div class="crm-mail' + (m.is_question && !m.fra_okkur ? " q" : "") + '">' +
        '<div class="crm-mailmeta">' + fmtD(m.received_at) + " · " + esc(m.fra_okkur ? "Slökkvitæki ehf" : (m.sender_name || "")) + "</div>" +
        '<div class="crm-mailsubj">' + esc(m.subject || "(ekkert efni)") + "</div>" +
        '<div class="crm-mailsnip">' + esc((m.snippet || "").slice(0, 180)) + "</div></div>").join("")
        : '<div class="crm-faint" style="font-size:12px">Engir póstar.</div>') +
      (r.athugasemdir_stubbur ? '<div class="crm-plabel">📋 PUNKTAR</div><div class="crm-pbox">' + esc(r.athugasemdir_stubbur) + "</div>" : "") +
      (r.simi || r.netfang ? '<div class="crm-links" style="margin-top:7px;font-size:12.5px">' +
        (r.simi ? '<a href="tel:' + esc(String(r.simi).replace(/[^\d+]/g, "")) + '">📞 ' + esc(r.simi) + "</a> · " : "") +
        (r.netfang ? '<a href="mailto:' + esc(r.netfang) + '">✉️ ' + esc(r.netfang) + "</a>" : "") + "</div>" : "") +
      "</div>";
  }

  /* ════════════════════════════════════════════════════════════
     ÞJÓNUSTUBORÐ — full síða yfir crm_yfirlit (v2)
     ════════════════════════════════════════════════════════════ */
  const NAV_KEY = "samskiptabord", VIEW_ID = "view-samskiptabord";
  const MAN = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];
  const getSB = () => (window.DB && window.DB.sb) || null;
  const fmtISK = n => String(Math.round(+n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " kr";
  const relD = d => {
    const n = daysAgo(d);
    if (n === null) return "—";
    if (n <= 0) return "í dag";
    if (n === 1) return "í gær";
    if (n < 30) return n + " d. síðan";
    if (n < 365) return Math.round(n / 30) + " mán. síðan";
    return fmtD(d);
  };

  const T = { rows: null, loading: false, err: null, q: "", group: "all", sortKey: "nafn", sortDir: 1, filter: "all" };
  const SORT_DEF = { nafn: 1, sidasti_postur: -1, inspect_month: 1, isk_ogreitt: -1, osv: -1 };

  // ✓ Afgreitt (2026-07-30, ósk Agnars: „leyfa mér að mark done").
  // samskipti_stada (PK fyrirtaeki_id) geymir hvenær erindi félags var síðast
  // afgreitt. Virkt ósvarað = 0 ef handled_at nær yfir síðasta póst — annars
  // osvarad-talan úr crm_cache. Merkingin samstillist því milli tækja og
  // klukkutíma-cache-inn getur ekki endurvakið hana.
  let HANDLED = {};                       // fyrirtaeki_id → handled_at
  async function tFetchHandled() {
    try {
      const res = await fetch(U + "/rest/v1/samskipti_stada?select=fyrirtaeki_id,handled_at", { headers: H });
      const rows = await res.json();
      HANDLED = {};
      (Array.isArray(rows) ? rows : []).forEach(r => { HANDLED[r.fyrirtaeki_id] = r.handled_at; });
    } catch (e) { console.warn("[tbord] samskipti_stada", e); }
  }
  function effOsv(r) {
    const h = HANDLED[r.fyrirtaeki_id];
    if (h && r.sidasti_postur && h >= r.sidasti_postur) return 0;
    return +r.osvarad || 0;
  }
  // Deilt pósthólf (Agnar: „useless, when one email goes multiple to all
  // locations"): crm_cache endurtekur SAMA póstinn á hverja byggingu félagsins.
  // Þar til sýnin sjálf er löguð er hann birtur EINU SINNI per félag — á
  // fulltrúa-röðinni (lægsta fyrirtaeki_id) — hinar sýna dauft „félags-póstur"
  // og telja hvorki ↩ í dálki, hópsummu né röðun.
  let FDUP = {};                 // fyrirtaeki_id → 'rep' | 'dup'
  function buildDup(rows) {
    FDUP = {};
    const seen = {};
    rows.forEach(r => {
      if (!r.customer_base_id || !r.sidasti_postur) return;
      const k = r.customer_base_id + "|" + r.sidasti_postur + "|" + (r.sidasta_efni || "");
      if (!seen[k]) seen[k] = [];
      seen[k].push(r.fyrirtaeki_id);
    });
    Object.keys(seen).forEach(k => {
      const ids = seen[k];
      if (ids.length < 2) return;
      const rep = ids.slice().sort((a, b) => a - b)[0];
      ids.forEach(id => { FDUP[id] = id === rep ? "rep" : "dup"; });
    });
  }
  function effOsv2(r) { return FDUP[r.fyrirtaeki_id] === "dup" ? 0 : effOsv(r); }
  function whoAmI() {
    try { return localStorage.getItem("ky_me") || localStorage.getItem("bs_employee") || ""; } catch (_) { return ""; }
  }
  // Merkir afgreitt fyrir ALLAR byggingar sem deila sama base — pósturinn
  // liggur á félaginu, svo ein bygging afgreidd = félagið afgreitt.
  async function tMark(ids) {
    const nu = new Date().toISOString();
    const body = ids.map(id => ({ fyrirtaeki_id: id, handled_at: nu, handled_by: whoAmI(), updated_at: nu }));
    const res = await fetch(U + "/rest/v1/samskipti_stada?on_conflict=fyrirtaeki_id", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, H),
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    ids.forEach(id => { HANDLED[id] = nu; });
  }
  function baseSiblings(r) {
    if (!r.customer_base_id) return [r.fyrirtaeki_id];
    return (T.rows || []).filter(x => x.customer_base_id === r.customer_base_id).map(x => x.fyrirtaeki_id);
  }

  async function tFetch() {
    const SB = getSB();
    let rows = [], from = 0;
    while (true) {
      let chunk;
      if (SB) {
        const r = await SB.from("crm_yfirlit").select("*").order("nafn").range(from, from + 999);
        if (r.error) throw new Error(r.error.message);
        chunk = r.data || [];
      } else {
        const res = await fetch(U + "/rest/v1/crm_yfirlit?select=*&order=nafn.asc&offset=" + from + "&limit=1000", { headers: H });
        if (!res.ok) throw new Error("HTTP " + res.status);
        chunk = await res.json();
        if (!Array.isArray(chunk)) throw new Error("Óvænt svar frá grunni");
      }
      rows = rows.concat(chunk);
      if (chunk.length < 1000 || from > 20000) break;
      from += 1000;
    }
    return rows;
  }
  async function tLoad(force) {
    if (T.loading) return;
    if (T.rows && !force) { tRender(); return; }
    T.loading = true; T.err = null; tRender();
    try { const both = await Promise.all([tFetch(), tFetchHandled()]); T.rows = both[0]; } catch (e) { T.err = e.message || String(e); }
    T.loading = false; tRender();
  }

  function tSorted(rows) {
    const k = T.sortKey, dir = T.sortDir;
    return rows.slice().sort((a, b) => {
      let v = 0;
      if (k === "nafn") v = String(a.nafn || "").localeCompare(String(b.nafn || ""), "is");
      else if (k === "sidasti_postur") v = (new Date(a.sidasti_postur || 0)) - (new Date(b.sidasti_postur || 0));
      else if (k === "inspect_month") v = (a.inspect_month == null ? 99 : a.inspect_month) - (b.inspect_month == null ? 99 : b.inspect_month);
      else if (k === "isk_ogreitt") v = (+a.isk_ogreitt || 0) - (+b.isk_ogreitt || 0);
      else if (k === "osv") v = effOsv2(a) - effOsv2(b);
      return v * dir || String(a.nafn || "").localeCompare(String(b.nafn || ""), "is");
    });
  }
  function tFiltered() {
    buildDup(T.rows || []);
    let rows = T.rows || [];
    if (T.filter === "osv") rows = rows.filter(r => effOsv2(r) > 0);
    else if (T.filter === "ogreitt") rows = rows.filter(r => +r.isk_ogreitt > 0);
    else if (T.filter === "postur") rows = rows.filter(r => r.sidasti_postur && FDUP[r.fyrirtaeki_id] !== "dup");
    if (T.q) {
      const q = T.q;
      rows = rows.filter(r => String(r.nafn || "").toLowerCase().includes(q) ||
        String(r.rekstrarfelag || "").toLowerCase().includes(q) ||
        String(r.kennitala || "").replace(/\D/g, "").includes(q.replace(/\D/g, "") || "\u0000"));
    }
    return tSorted(rows);
  }
  // Morgunlínan: talin á ÖLLUM röðum (ekki síuðum) svo hún segi satt hvað bíður.
  function tSummary() {
    const all = T.rows || [];
    let osvF = 0, osvN = 0, ogrF = 0, ogrSum = 0;
    all.forEach(r => {
      const eo = effOsv2(r);
      if (eo > 0) { osvF++; osvN += eo; }
      if (+r.isk_ogreitt > 0) { ogrF++; ogrSum += +r.isk_ogreitt; }
    });
    return { osvF, osvN, ogrF, ogrSum };
  }

  function tdPostur(r) {
    if (!r.sidasti_postur) return '<span class="tbord-mut">—</span>';
    if (FDUP[r.fyrirtaeki_id] === "dup") {
      return '<div class="tbord-rel tbord-mut">' + esc(relD(r.sidasti_postur)) +
        ' · ✉️ félags-póstur</div><div class="tbord-sub tbord-mut">sjá félags-röðina / hópinn</div>';
    }
    // Ósk Agnars 30.07 („show more text in this list"): sendandi + lengra efni
    // + póstafjöldi í stað 60-stafa klippu.
    const efni = String(r.sidasta_efni || "").slice(0, 110) + (String(r.sidasta_efni || "").length > 110 ? "…" : "");
    const hver = r.sidasti_fra_okkur ? "Slökkvitæki ehf" : String(r.sidasti_sendandi || "").slice(0, 40);
    const eo = effOsv(r);
    const svara = r.sidasti_fra_okkur === false && eo > 0
      ? ' <span class="tbord-osv" title="Ósvarað — síðasti póstur frá viðskiptavini">↩︎ <b>' + eo + "</b></span>"
      : (HANDLED[r.fyrirtaeki_id] && (+r.osvarad || 0) > 0
         ? ' <span class="tbord-ok" title="Merkt afgreitt ' + esc(relD(HANDLED[r.fyrirtaeki_id])) + '">✓</span>' : "");
    return '<div class="tbord-rel">' + esc(relD(r.sidasti_postur)) + svara +
      (hver ? ' <span class="tbord-mut">· ' + esc(hver) + "</span>" : "") +
      (+r.postar_alls > 1 ? ' <span class="tbord-mut">· ' + (+r.postar_alls) + " póstar</span>" : "") + "</div>" +
      '<div class="tbord-sub tbord-efni" title="' + esc(r.sidasta_efni || "") + '">' + esc(efni) + "</div>";
  }
  function tdSkodun(r) {
    const m = r.inspect_month >= 1 && r.inspect_month <= 12 ? MAN[r.inspect_month - 1] : null;
    const top = m ? esc(m) + (r.report_year ? " " + esc(r.report_year) : "") : "—";
    const t = +r.total_devices || 0;
    return '<div class="' + (m ? "" : "tbord-mut") + '">' + top + "</div>" +
      (t ? '<div class="tbord-sub">' + t + " tæki</div>" : "");
  }
  function tdSkjol(r) {
    const c = (l, n) => '<span class="tbord-cnt ' + (+n > 0 ? "on" : "off") + '">' + l + ":" + (+n || 0) + "</span>";
    return c("S", r.n_samningar) + c("Ú", r.n_uttektir) + c("R", r.n_reikningar);
  }
  function tdOgreitt(r) {
    const isk = +r.isk_ogreitt || 0, n = +r.n_ogreitt || 0;
    if (!isk && !n) return '<span class="tbord-mut">—</span>';
    return '<span class="tbord-red">' + esc(fmtISK(isk)) + "</span>" + (n ? '<span class="tbord-sub"> (' + n + ")</span>" : "");
  }
  function tRow(r) {
    const eo = effOsv2(r);
    return '<tr class="tbord-row" data-id="' + esc(r.fyrirtaeki_id) + '" data-base="' + esc(r.customer_base_id || "") + '">' +
      '<td><div class="tbord-nafn">' + esc(r.nafn || "—") + "</div>" +
      (r.heimilisfang ? '<div class="tbord-sub">' + esc(r.heimilisfang) + "</div>" : "") + "</td>" +
      "<td>" + (r.rekstrarfelag ? esc(r.rekstrarfelag) : '<span class="tbord-mut">—</span>') + "</td>" +
      "<td>" + tdPostur(r) + "</td>" +
      '<td class="tbord-nowrap tbord-osvtd">' + (eo > 0 ? '<span class="tbord-osv">↩︎ <b>' + eo + "</b></span>" : '<span class="tbord-mut">—</span>') + "</td>" +
      "<td>" + tdSkodun(r) + "</td>" +
      '<td class="tbord-nowrap">' + tdSkjol(r) + "</td>" +
      '<td class="tbord-nowrap">' + tdOgreitt(r) + "</td></tr>";
  }
  function tBody(rows) {
    if (!rows.length) return '<tr><td colspan="7" class="tbord-empty">Ekkert félag fannst.</td></tr>';
    if (T.group !== "rf") return rows.map(tRow).join("");
    const groups = new Map();
    rows.forEach(r => {
      const k = r.rekstrarfelag || "\u0000";
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    });
    const keys = [...groups.keys()].filter(k => k !== "\u0000").sort((a, b) => a.localeCompare(b, "is"));
    if (groups.has("\u0000")) keys.push("\u0000");
    return keys.map(k => {
      const g = groups.get(k);
      const sum = g.reduce((s, r) => s + (+r.isk_ogreitt || 0), 0);
      const osv = g.reduce((s, r) => s + effOsv2(r), 0);
      return '<tr class="tbord-ghead"><td colspan="7">' +
        esc(k === "\u0000" ? "— Sjálfstæð —" : k) +
        ' <span class="tbord-gsub">· ' + g.length + " félög" +
        (sum > 0 ? ' · <span class="tbord-red">' + esc(fmtISK(sum)) + " ógreitt</span>" : "") +
        (osv > 0 ? ' · <span class="tbord-osv">↩︎ ' + osv + " ósvarað</span>" : "") +
        "</span></td></tr>" + g.map(tRow).join("");
    }).join("");
  }

  function tRender() {
    const host = document.getElementById("tbord-main");
    if (!host) return;
    if (T.loading && !T.rows) { host.innerHTML = '<div class="tbord-note" style="padding:30px">Sæki gögn…</div>'; return; }
    if (T.err && !T.rows) { host.innerHTML = '<div class="tbord-note" style="padding:30px;color:#b91c1c">Villa: ' + esc(T.err) + '</div>'; return; }
    const rows = tFiltered();
    const refreshed = (T.rows || []).reduce((m, r) => r.refreshed_at > (m || "") ? r.refreshed_at : m, null);
    const hhmm = refreshed ? new Date(refreshed).toLocaleTimeString("is-IS", { hour: "2-digit", minute: "2-digit" }) : "";
    const arrow = k => T.sortKey === k ? (T.sortDir === 1 ? " ▲" : " ▼") : "";
    const th = (k, l, extra) => k
      ? '<th class="tbord-th" data-sort="' + k + '"' + (extra || "") + ">" + l + arrow(k) + "</th>"
      : "<th" + (extra || "") + ">" + l + "</th>";
    // Morgunlínan (ósk Agnars 30.07 „make better summary"): hvað BÍÐUR — aðeins
    // það sem er til; núll-hlutar detta út í stað þess að sýna „0".
    const sm = tSummary();
    const smBits = [];
    if (sm.osvF) smBits.push('<span class="tbord-osv">↩︎ ' + sm.osvN + " ósvarað hjá " + sm.osvF + " félögum</span>");
    if (sm.ogrF) smBits.push('<span class="tbord-red">' + esc(fmtISK(sm.ogrSum)) + " ógreitt hjá " + sm.ogrF + "</span>");
    const smHtml = smBits.length
      ? '<div class="tbord-summary">' + smBits.join('<span class="tbord-mut"> · </span>') + "</div>" : "";
    const fchip = (k, l, n) =>
      '<button data-f="' + k + '" class="tbord-fchip' + (T.filter === k ? " on" : "") + '"' + (n === 0 ? " disabled" : "") + ">" +
      l + (n != null && n > 0 ? " (" + n + ")" : "") + "</button>";
    host.innerHTML =
      '<div class="tbord-top">' +
      '<h2 class="tbord-title">📇 Samskiptaborð</h2>' +
      '<span class="tbord-note">' + rows.length + " félög" + (hhmm ? " · Uppfært " + esc(hhmm) : "") + "</span>" +
      '<button id="tbord-refresh" class="tbord-btn" title="Sækja aftur"' + (T.loading ? " disabled" : "") + ">↻" + (T.loading ? " …" : "") + "</button>" +
      '<input id="tbord-q" placeholder="Leita — nafn / rekstrarfélag / kt…" value="' + esc(T.q) + '">' +
      '<div class="tbord-seg">' +
      '<button data-g="all" class="' + (T.group === "all" ? "on" : "") + '">Allt</button>' +
      '<button data-g="rf" class="' + (T.group === "rf" ? "on" : "") + '">Eftir rekstrarfélagi</button></div></div>' +
      smHtml +
      '<div class="tbord-filters">' +
      fchip("all", "Öll félög", null) +
      fchip("osv", "↩︎ Ósvarað", sm.osvF) +
      fchip("ogreitt", "💰 Ógreitt", sm.ogrF) +
      fchip("postur", "✉️ Með póstsögu", null) + "</div>" +
      '<div class="tbord-tblwrap"><table class="tbord-tbl"><thead><tr>' +
      th("nafn", "Fyrirtæki") + th(null, "Rekstrarfélag") + th("sidasti_postur", "Síðasti póstur") +
      th("osv", '↩︎', ' title="Ósvöruð erindi — smelltu til að raða"') +
      th("inspect_month", "Skoðun") + th(null, "Skjöl") + th("isk_ogreitt", "Ógreitt") +
      "</tr></thead><tbody>" + tBody(rows) + "</tbody></table></div>";
    const qEl = host.querySelector("#tbord-q");
    qEl.addEventListener("input", e => {
      T.q = e.target.value.toLowerCase();
      const tb = host.querySelector("tbody");
      if (tb) tb.innerHTML = tBody(tFiltered());
    });
    host.querySelector("#tbord-refresh").addEventListener("click", () => tLoad(true));
    host.querySelectorAll(".tbord-seg button").forEach(b => b.addEventListener("click", () => { T.group = b.dataset.g; tRender(); }));
    host.querySelectorAll(".tbord-fchip").forEach(b => b.addEventListener("click", () => { T.filter = b.dataset.f; tRender(); }));
    host.querySelectorAll(".tbord-th").forEach(h => h.addEventListener("click", () => {
      const k = h.dataset.sort;
      if (T.sortKey === k) T.sortDir *= -1; else { T.sortKey = k; T.sortDir = SORT_DEF[k] || 1; }
      tRender();
    }));
    // 2026-07-30 (ósk Agnars: „klárað almennilega samskiptasöguna … leyfa mér að
    // mark done"): smellur á röð opnar SAMSKIPTASÖGU-skúffu undir henni í stað
    // þess að stökkva beint á fyrirtækið — „Opna fyrirtæki →" er hnappur í
    // skúffunni svo gamla leiðin týnist ekki.
    host.querySelector("tbody").addEventListener("click", e => {
      const mark = e.target.closest("[data-mark]");
      if (mark) { e.stopPropagation(); tDoMark(mark); return; }
      const rep = e.target.closest("[data-reply]");
      if (rep) {
        e.stopPropagation();
        const drawer = rep.closest("tr.tbord-drawer");
        const row = drawer && drawer.previousElementSibling;
        const rid = row ? +row.getAttribute("data-id") : null;
        const r = (T.rows || []).find(x => x.fyrirtaeki_id === rid);
        if (!r) return;
        const key = r.customer_base_id ? "base:" + r.customer_base_id : "f:" + r.fyrirtaeki_id;
        const mail = (SAGA_CACHE[key] || []).find(m => String(m.email_id) === rep.getAttribute("data-reply"));
        if (mail) tReply(r, mail);
        return;
      }
      const opn = e.target.closest("[data-opna]");
      if (opn) {
        e.stopPropagation();
        const id = +opn.getAttribute("data-opna");
        try {
          if (window.Companies && Companies.openDetail) Companies.openDetail(id);
          else if (window.VidskDetail && VidskDetail.show) VidskDetail.show(id);
        } catch (err) { console.warn("[tbord] openDetail", err); }
        return;
      }
      const tr = e.target.closest("tr.tbord-row");
      if (!tr) return;
      tToggleDrawer(tr);
    });
  }

  // ── Samskiptasaga-skúffan ──────────────────────────────────────────────────
  const SAGA_CACHE = {};   // lykill base:ID eða f:ID → raðir
  async function tSaga(r) {
    const key = r.customer_base_id ? "base:" + r.customer_base_id : "f:" + r.fyrirtaeki_id;
    if (SAGA_CACHE[key]) return SAGA_CACHE[key];
    const sel = "select=email_id,sender_name,sender_email,subject,snippet,is_question,fra_okkur,received_at,fyrirtaeki_id,fyrirtaeki_nafn,via";
    const url = r.customer_base_id
      ? U + "/rest/v1/felag_samskipti?" + sel + "&customer_base_id=eq." + r.customer_base_id + "&order=received_at.desc&limit=40"
      : U + "/rest/v1/fyrirtaeki_samskipti?select=email_id,sender_name,sender_email,subject,snippet,is_question,fra_okkur,received_at&fyrirtaeki_id=eq." + r.fyrirtaeki_id + "&order=received_at.desc&limit=40";
    const res = await fetch(url, { headers: H });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const rows = await res.json();
    SAGA_CACHE[key] = Array.isArray(rows) ? rows : [];
    return SAGA_CACHE[key];
  }
  function tSagaHtml(r, mails) {
    const h = HANDLED[r.fyrirtaeki_id] || "";
    const eo = effOsv(r);
    // Spurning telst SVARAГ ef við sendum póst á eftir henni (sama regla og
    // 286-kortið notar) — annars töldust 32/40 „ósvarað" hjá Heimaleigu þótt
    // búið væri að svara flestum. Opið = spurning frá kúnna sem er nýrri en
    // BÆÐI síðasta frá-okkur sending og handled-merkingin.
    const lastUs = mails.filter(m => m.fra_okkur).map(m => m.received_at).sort().pop() || "";
    const cut = lastUs > h ? lastUs : h;
    // Nýjasti póstur FRÁ kúnna = sá sem ✉️ Svara í hausnum svarar.
    const newestCust = mails.find(m => !m.fra_okkur && m.sender_email);
    const contact = [];
    if (r.tengilidur) contact.push("👤 " + esc(r.tengilidur));
    if (r.simi) contact.push('<a href="tel:' + esc(String(r.simi).replace(/[^\d+]/g, "")) + '">📞 ' + esc(r.simi) + "</a>");
    if (r.netfang) contact.push('<a href="mailto:' + esc(r.netfang) + '">✉️ ' + esc(r.netfang) + "</a>");
    const head =
      '<div class="tbord-dhead">' +
      '<button class="tbord-btn" data-opna="' + esc(r.fyrirtaeki_id) + '">Opna fyrirtæki →</button>' +
      (newestCust
        ? '<button class="tbord-btn tbord-replybtn" data-reply="' + esc(newestCust.email_id) + '" title="Svara nýjasta pósti kúnnans — Claude semur uppkast, þú yfirferð og sendir">✉️ Svara</button>' : "") +
      (eo > 0
        ? '<button class="tbord-btn tbord-markbtn" data-mark="' + esc(r.fyrirtaeki_id) + '">✓ Merkja afgreitt</button>'
        : (h ? '<span class="tbord-ok">✓ Afgreitt ' + esc(relD(h)) + "</span>" : "")) +
      '<span class="tbord-note">' + mails.length + " póstar" + (r.customer_base_id ? " á félaginu (allar byggingar)" : "") + "</span>" +
      (contact.length ? '<span class="tbord-contact">' + contact.join(" · ") + "</span>" : "") + "</div>";
    if (!mails.length) return head + '<div class="tbord-note" style="padding:8px 2px">Engin póstsaga — ekkert netfang tengt, eða enginn póstur enn.</div>';
    const list = mails.map(m => {
      const open = m.is_question && !m.fra_okkur && (!cut || m.received_at > cut);
      const via = m.fyrirtaeki_nafn ? '<span class="tbord-via" title="Tengt á byggingu (' + esc(m.via || "") + ')">📍 ' + esc(m.fyrirtaeki_nafn) + "</span>" : "";
      const svarB = open && m.sender_email
        ? ' <button class="tbord-minireply" data-reply="' + esc(m.email_id) + '" title="Svara þessum pósti">✉️ Svara</button>' : "";
      return '<div class="tbord-mail' + (open ? " open" : "") + '">' +
        '<div class="tbord-mailmeta">' + esc(relD(m.received_at)) + " · " +
        esc(m.fra_okkur ? "Slökkvitæki ehf" : (m.sender_name || m.sender_email || "")) +
        (open ? ' · <b class="tbord-osv">spurning — ósvarað</b>' : "") + " " + via + svarB + "</div>" +
        '<div class="tbord-mailsubj">' + esc(m.subject || "(ekkert efni)") + "</div>" +
        (m.snippet ? '<div class="tbord-mailsnip">' + esc(String(m.snippet).slice(0, 220)) + "</div>" : "") +
        "</div>";
    }).join("");
    return head + '<div class="tbord-maillist">' + list + "</div>";
  }
  // ✉️ Svara af borðinu — sama svar-vél og Verkborð/Reikninga-póstur (240):
  // Claude semur uppkast, skrifstofan yfirfer og sendir. Þegar svarið er SENT
  // er félagið um leið merkt ✓ afgreitt (allar byggingar) — sama merking og
  // handvirka ✓, svo borðið, prófíllinn og RF-kortið segja strax það sama.
  async function tReply(r, mail) {
    if (!window.ReikningaPostur || !ReikningaPostur.replyTo) { alert("Svar-vélin (Reikninga-póstur, 240) er ekki hlaðin."); return; }
    let m = null;
    // Reyna að ná fullri digest-röð (body_preview + message_id) — RLS getur
    // falið hluta email_digest fyrir anon-lyklinum, þá duga saga-reitirnir.
    try {
      const res = await fetch(U + "/rest/v1/email_digest?select=message_id,sender_name,sender_email,subject,snippet,body_preview&id=eq." + (+mail.email_id) + "&limit=1", { headers: H });
      if (res.ok) { const a = await res.json(); if (Array.isArray(a) && a[0]) {
        const e = a[0];
        m = { message_id: e.message_id, sender_name: e.sender_name || "", from: e.sender_email || "",
          subject: e.subject || "", body_preview: e.body_preview || "", snippet: e.snippet || "" };
      } }
    } catch (_) {}
    if (!m) m = { message_id: null, sender_name: mail.sender_name || "", from: mail.sender_email || "",
      subject: mail.subject || "", body_preview: "", snippet: mail.snippet || "" };
    if (!m.from) { alert("Ekkert sendandanetfang á þessum pósti."); return; }
    m._onSent = async () => {
      try {
        await tMark(baseSiblings(r));
        delete SAGA_CACHE[r.customer_base_id ? "base:" + r.customer_base_id : "f:" + r.fyrirtaeki_id];
        const tr = document.querySelector('tr.tbord-row[data-id="' + r.fyrirtaeki_id + '"]');
        const drawer = tr && tr.nextElementSibling && tr.nextElementSibling.classList.contains("tbord-drawer") ? tr.nextElementSibling : null;
        if (drawer) { const mails = await tSaga(r); drawer.querySelector(".tbord-dbox").innerHTML = tSagaHtml(r, mails); }
        if (tr) tr.outerHTML = tRow(r);
      } catch (e) { console.warn("[tbord] onSent", e); }
    };
    ReikningaPostur.replyTo(m);
  }
  async function tToggleDrawer(tr) {
    const nxt = tr.nextElementSibling;
    if (nxt && nxt.classList.contains("tbord-drawer")) { nxt.remove(); tr.classList.remove("is-open"); return; }
    // loka öðrum opnum
    tr.closest("tbody").querySelectorAll("tr.tbord-drawer").forEach(d => { const p = d.previousElementSibling; if (p) p.classList.remove("is-open"); d.remove(); });
    const id = +tr.getAttribute("data-id");
    const r = (T.rows || []).find(x => x.fyrirtaeki_id === id);
    if (!r) return;
    tr.classList.add("is-open");
    const d = document.createElement("tr");
    d.className = "tbord-drawer";
    d.innerHTML = '<td colspan="7"><div class="tbord-dbox">Sæki póstsögu…</div></td>';
    tr.after(d);
    try {
      const mails = await tSaga(r);
      if (!d.isConnected) return;
      d.querySelector(".tbord-dbox").innerHTML = tSagaHtml(r, mails);
    } catch (e) {
      if (d.isConnected) d.querySelector(".tbord-dbox").innerHTML = '<span style="color:#b91c1c">Villa: ' + esc(e.message || e) + "</span>";
    }
  }
  async function tDoMark(btn) {
    const id = +btn.getAttribute("data-mark");
    const r = (T.rows || []).find(x => x.fyrirtaeki_id === id);
    if (!r) return;
    btn.disabled = true; btn.textContent = "⏳ …";
    try {
      await tMark(baseSiblings(r));
      // uppfæra skúffuna + röðina á staðnum
      const drawer = btn.closest("tr.tbord-drawer");
      const row = drawer && drawer.previousElementSibling;
      const mails = await tSaga(r);
      if (drawer) drawer.querySelector(".tbord-dbox").innerHTML = tSagaHtml(r, mails);
      if (row) row.outerHTML = tRow(r) ;
    } catch (e) {
      btn.disabled = false; btn.textContent = "✓ Merkja afgreitt";
      alert("Tókst ekki að merkja: " + (e.message || e));
    }
  }

  function tStyle() {
    if (document.getElementById("tbord-style")) return;
    const s = document.createElement("style");
    s.id = "tbord-style";
    s.textContent =
      // Kontrast-úttekt 2026-08-07 (ósk Agnars: „total page audit fix for grey
      // on grey"): gráir textar dekktir upp fyrir WCAG AA á sínum fleti —
      // sub #94a3b8→#525b6b (2,9→6,3), mut #cbd5e1→#64748b (1,5→4,8), tómu
      // skjalateljararnir #94a3b8→#525b6b á #f1f5f9, osv-pillan #dc2626→#b91c1c
      // á #fef2f2. Hvítu fletirnir (taflan, skúffan, póstkortin) fá líka SKÝRAN
      // dökkan textalit í stað þess að erfa — undir dökku þema var erfði
      // liturinn ljós og textinn hvarf á hvítu. Neðst eru dökk-þema mótreglur
      // (html[data-theme="dark"], patch 66) svo dekktu gráirnir snúist við
      // þegar patch 66 flippar flötunum sjálfum yfir í dökkt.
      "#" + VIEW_ID + "{color:var(--ink1,#0f172a)}" +
      ".tbord-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:16px 18px 12px}" +
      ".tbord-title{margin:0;font-size:19px;font-weight:800}" +
      ".tbord-note{color:var(--ink2,#525b6b);font-size:12.5px}" +
      ".tbord-btn{border:1px solid var(--brd,#cbd5e1);background:#fff;color:#334155;border-radius:9px;padding:6px 12px;font-size:14px;font-weight:700;cursor:pointer}" +
      "#tbord-q{flex:1;min-width:200px;border:1px solid var(--brd,#cbd5e1);border-radius:10px;padding:8px 12px;font-size:13.5px;background:#fff;color:#0f172a}" +
      ".tbord-seg{display:flex;border:1px solid var(--brd,#cbd5e1);border-radius:10px;overflow:hidden}" +
      ".tbord-seg button{border:0;background:#fff;color:#475569;padding:7px 13px;font-size:12.5px;font-weight:700;cursor:pointer}" +
      ".tbord-seg button.on{background:#0f172a;color:#fff}" +
      ".tbord-tblwrap{margin:0 18px 40px;background:#fff;border:1px solid var(--brd,#e2e8f0);border-radius:12px;overflow:auto}" +
      ".tbord-tbl{width:100%;border-collapse:collapse;font-size:13px;color:#334155}" +
      ".tbord-tbl th{text-align:left;color:#525b6b;font-size:11.5px;text-transform:uppercase;letter-spacing:.03em;padding:9px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;background:#f8fafc;position:sticky;top:0}" +
      ".tbord-th{cursor:pointer;user-select:none}.tbord-th:hover{color:#0f172a}" +
      ".tbord-tbl td{padding:8px 10px;border-bottom:1px solid #eef1f5;vertical-align:top}" +
      ".tbord-row{cursor:pointer}.tbord-row:hover td{background:#f1f5f9}" +
      ".tbord-nafn{font-weight:700;color:#0f172a}" +
      ".tbord-sub{color:#525b6b;font-size:11.5px}" +
      ".tbord-mut{color:#64748b}" +
      ".tbord-nowrap{white-space:nowrap}" +
      ".tbord-osv{color:#b91c1c;font-weight:700;background:#fef2f2;border-radius:99px;padding:1px 8px;font-size:11.5px}" +
      ".tbord-red{color:#b91c1c;font-weight:700}" +
      ".tbord-cnt{display:inline-block;border-radius:6px;padding:1px 6px;margin-right:3px;font-size:11.5px;font-weight:700;background:#f1f5f9;color:#525b6b}" +
      ".tbord-cnt.on{background:#f0fdf4;color:#15803d}" +
      ".tbord-ghead td{background:#0f172a;color:#fff;font-weight:800;font-size:12.5px;padding:7px 10px}" +
      ".tbord-gsub{font-weight:400;color:#cbd5e1}" +
      ".tbord-ghead .tbord-red{color:#fca5a5}.tbord-ghead .tbord-osv{background:transparent;padding:0;color:#fca5a5}" +
      ".tbord-ghead .tbord-gsub .tbord-mut{color:#cbd5e1}" +
      ".tbord-empty{text-align:center;color:#64748b;padding:26px}" +
      ".tbord-osvtd{text-align:center}" +
      ".tbord-ok{color:#0f6e3a;font-weight:700;font-size:12px;white-space:nowrap}" +
      ".tbord-row.is-open td{background:#eef2ff}" +
      ".tbord-drawer td{background:#f8fafc;border-bottom:2px solid #c7d2fe;padding:0}" +
      ".tbord-dbox{padding:12px 16px 14px;color:#334155}" +
      ".tbord-dhead{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:8px}" +
      ".tbord-markbtn{border-color:#156e3a;background:linear-gradient(150deg,#2bbf6c,#0f6e3a);color:#fff;font-weight:700}" +
      ".tbord-maillist{display:flex;flex-direction:column;gap:6px;max-height:420px;overflow:auto}" +
      ".tbord-mail{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:8px 11px;color:#334155}" +
      ".tbord-mail.open{background:#fef2f2;border-color:#fecaca}" +
      ".tbord-mailmeta{font-size:11.5px;color:#525b6b}" +
      ".tbord-mailsubj{font-weight:600;font-size:13px;color:#0f172a}" +
      ".tbord-mailsnip{font-size:12px;color:#525b6b}" +
      ".tbord-via{background:#eef2ff;border:1px solid #c7d2fe;color:#4338ca;border-radius:99px;padding:1px 8px;font-size:10.5px;font-weight:700;white-space:nowrap}" +
      ".tbord-summary{padding:0 18px 4px;font-size:13.5px;font-weight:600}" +
      ".tbord-filters{display:flex;gap:7px;flex-wrap:wrap;padding:4px 18px 10px}" +
      ".tbord-fchip{border:1px solid var(--brd,#cbd5e1);background:#fff;color:#475569;border-radius:99px;padding:5px 13px;font-size:12.5px;font-weight:700;cursor:pointer}" +
      ".tbord-fchip.on{background:#0f172a;border-color:#0f172a;color:#fff}" +
      ".tbord-fchip:disabled{opacity:.45;cursor:default}" +
      ".tbord-replybtn{border-color:#3730a3;background:linear-gradient(150deg,#6366f1,#4338ca);color:#fff;font-weight:700}" +
      ".tbord-minireply{border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:99px;padding:1px 9px;font-size:11px;font-weight:700;cursor:pointer;margin-left:4px}" +
      ".tbord-contact{margin-left:auto;font-size:12px;color:#475569;white-space:nowrap}" +
      ".tbord-contact a{color:#1d4ed8;text-decoration:none;font-weight:600}" +
      ".tbord-efni{color:#475569;font-size:12.5px;max-width:520px}" +
      // Dökk-þema mótreglur (patch 66 setur html[data-theme="dark"] og flippar
      // töflunni/inntökum sjálfur í dökkt með !important — hér snúa gráir og
      // hvít-hörðu fletirnir okkar við svo ekkert verði svart-á-svörtu):
      'html[data-theme="dark"] #' + VIEW_ID + "{color:#e2e8f0}" +
      'html[data-theme="dark"] .tbord-tbl,html[data-theme="dark"] .tbord-tbl td{color:#e2e8f0}' +
      'html[data-theme="dark"] .tbord-nafn,html[data-theme="dark"] .tbord-mailsubj{color:#f1f5f9}' +
      'html[data-theme="dark"] .tbord-sub,html[data-theme="dark"] .tbord-mut,html[data-theme="dark"] .tbord-mailmeta,html[data-theme="dark"] .tbord-mailsnip,html[data-theme="dark"] .tbord-empty{color:#94a3b8}' +
      'html[data-theme="dark"] .tbord-tblwrap{background:#1e293b;border-color:#334155}' +
      'html[data-theme="dark"] .tbord-mail{background:#1e293b;border-color:#334155;color:#e2e8f0}' +
      'html[data-theme="dark"] .tbord-mail.open{background:rgba(220,38,38,.15);border-color:#7f1d1d}' +
      'html[data-theme="dark"] .tbord-dbox{color:#cbd5e1}' +
      'html[data-theme="dark"] .tbord-efni,html[data-theme="dark"] .tbord-contact{color:#cbd5e1}' +
      'html[data-theme="dark"] .tbord-contact a{color:#93c5fd}' +
      'html[data-theme="dark"] .tbord-osv{background:rgba(220,38,38,.2);color:#fca5a5}' +
      'html[data-theme="dark"] .tbord-red{color:#fca5a5}' +
      'html[data-theme="dark"] .tbord-ok{color:#4ade80}' +
      'html[data-theme="dark"] .tbord-cnt{background:#334155;color:#94a3b8}' +
      'html[data-theme="dark"] .tbord-cnt.on{background:rgba(34,197,94,.15);color:#4ade80}' +
      'html[data-theme="dark"] .tbord-row:hover td{background:#0f172a}' +
      'html[data-theme="dark"] .tbord-row.is-open td{background:#312e81}' +
      'html[data-theme="dark"] .tbord-drawer td{background:#0f172a;border-bottom-color:#4338ca}' +
      'html[data-theme="dark"] .tbord-btn,html[data-theme="dark"] .tbord-seg button,html[data-theme="dark"] .tbord-fchip{background:#1e293b;color:#cbd5e1;border-color:#334155}' +
      'html[data-theme="dark"] .tbord-seg button.on,html[data-theme="dark"] .tbord-fchip.on{background:#e2e8f0;color:#0f172a;border-color:#e2e8f0}' +
      'html[data-theme="dark"] .tbord-note{color:#94a3b8}' +
      // Lit-hnapparnir halda stiglunum sínum líka í dökku (annars flatti
      // .tbord-btn-mótreglan þá út — þeir bera báða klasana):
      'html[data-theme="dark"] .tbord-markbtn{border-color:#156e3a;background:linear-gradient(150deg,#2bbf6c,#0f6e3a);color:#fff}' +
      'html[data-theme="dark"] .tbord-replybtn{border-color:#3730a3;background:linear-gradient(150deg,#6366f1,#4338ca);color:#fff}';
    document.head.appendChild(s);
  }

  function tEnsureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById("view-counter") || document.getElementById("view-sala");
    if (!sample || !sample.parentElement) return;
    const v = document.createElement("div");
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, "").trim();
    v.innerHTML = '<main id="tbord-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
    tStyle();
  }
  function tShow() {
    tEnsureView();
    document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display = "none"; v.classList.remove("active"); });
    const v = document.getElementById(VIEW_ID);
    if (v) { v.style.display = "block"; v.classList.add("active"); }
    document.querySelectorAll(".vnav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === NAV_KEY));
    try { if (location.hash !== "#" + NAV_KEY) history.replaceState(null, "", "#" + NAV_KEY); } catch (_) { }
    tRender();
    tLoad(false);
  }
  function tPatchSwitchView() {
    if (!window.App || !App.switchView || window.App._tbordSwitchPatched) { if (!window.App || !App.switchView) setTimeout(tPatchSwitchView, 500); return; }
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { tShow(); return; }
      return orig.apply(this, arguments);
    };
    window.App._tbordSwitchPatched = true;
  }
  function tInjectNav() {
    const nav = document.querySelector("nav.view-nav, .view-nav");
    if (!nav) { setTimeout(tInjectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const tpl = nav.querySelector(".vnav-btn");
    if (!tpl) { setTimeout(tInjectNav, 500); return; }
    const b = document.createElement("button");
    b.className = (tpl.className || "vnav-btn").replace(/\bactive\b/g, "").trim();
    b.setAttribute("data-view", NAV_KEY);
    b.innerHTML = '<span style="margin-right:6px">📇</span>Samskiptaborð';
    b.addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView && window.App._tbordSwitchPatched) App.switchView(NAV_KEY); else tShow();
    });
    nav.appendChild(b);
  }
  tPatchSwitchView();
  tInjectNav();
  window.Samskiptabord = { open: tShow, reload: () => tLoad(true) };
  // Gamla heitið lifir sem samnefni — ekkert utanaðkomandi notar það í dag,
  // en deep-link/bókamerki úr eldri lotum mega ekki deyja þögult.
  window.Thjonustubord = window.Samskiptabord;

  console.log("[crm-board] v2 installed (flotandi borð + Samskiptaborð)");
})();
