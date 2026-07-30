/* js/patches/287-crm-board.js — 📇 Samskiptaborð (CRM) + Þjónustuborð
   ────────────────────────────────────────────────────────────
   v1: Flotandi hnappur neðst til hægri → borð með síðasta pósti,
   ósvöruðum spurningum og útvíkkanlegri póstsögu (crm_cache).
   v2 (2026-07-29): Full síða „📇 Þjónustuborð" (view 'thjonustubord')
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

  const btn = document.createElement("button");
  btn.textContent = "📇 Samskipti";
  btn.style.cssText = "position:fixed;bottom:18px;right:18px;z-index:9998;background:#4f46e5;color:#fff;border:0;border-radius:99px;padding:10px 18px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 6px 20px rgba(79,70,229,.4)";
  btn.addEventListener("click", open);
  document.body.appendChild(btn);

  function badge(r) {
    if (r.osvarad > 0) return ["🔴", "Ósvöruð spurning í pósti"];
    const d = daysAgo(r.sidasti_postur);
    if (d === null) return ["⚪", "Engin póstsaga (ekkert netfang skráð?)"];
    if (d > 400) return ["🟡", "Ekkert samband í " + d + " daga"];
    return ["🟢", "Í lagi"];
  }

  async function open() {
    let ov = document.getElementById("_crm-ov");
    if (ov) { ov.remove(); return; }
    ov = document.createElement("div");
    ov.id = "_crm-ov";
    ov.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:9999;display:flex;justify-content:center;padding:24px;overflow:auto";
    ov.innerHTML = '<div id="_crm-box" style="background:#f8fafc;border-radius:16px;max-width:860px;width:100%;height:fit-content;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,.4)">' +
      '<div style="padding:16px 20px 10px;border-bottom:1px solid #e2e8f0;background:#fff;border-radius:16px 16px 0 0">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
      '<div style="font-weight:800;font-size:15px">📇 SAMSKIPTABORÐ <span id="_crm-sub" style="font-weight:400;color:#94a3b8;font-size:12px"></span></div>' +
      '<div style="display:flex;gap:8px;align-items:center">' +
      '<button id="_crm-full" style="border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:99px;padding:6px 13px;font-size:12.5px;font-weight:700;cursor:pointer">Opna Þjónustuborð ↗</button>' +
      '<button id="_crm-x" style="border:0;background:#f1f5f9;border-radius:99px;width:32px;height:32px;cursor:pointer;font-size:16px">✕</button></div></div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center">' +
      '<input id="_crm-q" placeholder="Leita að félagi…" style="flex:1;min-width:180px;border:1px solid #cbd5e1;border-radius:10px;padding:8px 12px;font-size:14px">' +
      '<button class="_crm-f" data-f="osvarad" style="border:1px solid #fecaca;background:#fef2f2;color:#dc2626;border-radius:99px;padding:6px 13px;font-size:12.5px;font-weight:700;cursor:pointer">🔴 Ósvarað <span id="_crm-n-osv"></span></button>' +
      '<button class="_crm-f" data-f="med" style="border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:99px;padding:6px 13px;font-size:12.5px;font-weight:700;cursor:pointer">✉️ Með póstsögu</button>' +
      '<button class="_crm-f" data-f="all" style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:99px;padding:6px 13px;font-size:12.5px;font-weight:700;cursor:pointer">Öll félög</button>' +
      "</div></div>" +
      '<div id="_crm-list" style="overflow:auto;padding:10px 14px 16px">Sæki gögn…</div></div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", e => { if (e.target === ov || e.target.id === "_crm-x") ov.remove(); });
    ov.querySelector("#_crm-full").addEventListener("click", () => { ov.remove(); if (window.App && App.switchView && window.App._tbordSwitchPatched) App.switchView("thjonustubord"); else if (window.Thjonustubord) Thjonustubord.open(); });
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
    host.innerHTML = rows.length ? "" : '<div style="color:#94a3b8;padding:16px">Ekkert félag fannst.</div>';
    for (const r of rows.slice(0, 400)) {
      const [dot, tip] = badge(r);
      const row = document.createElement("div");
      row.style.cssText = "background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 13px;margin:6px 0;cursor:pointer" + (r.osvarad > 0 ? ";border-left:4px solid #ef4444" : "");
      row.innerHTML =
        '<div style="display:flex;gap:9px;align-items:baseline;flex-wrap:wrap">' +
        '<span title="' + esc(tip) + '">' + dot + '</span>' +
        '<span style="font-weight:700;font-size:14px">' + esc(r.nafn) + "</span>" +
        (r.tengilidur ? '<span style="color:#64748b;font-size:12.5px">👤 ' + esc(r.tengilidur) + "</span>" : "") +
        (r.osvarad > 0 ? '<span style="background:#fef2f2;color:#dc2626;border-radius:99px;padding:1px 9px;font-size:11.5px;font-weight:700">' + r.osvarad + " ósvarað</span>" : "") +
        "</div>" +
        '<div style="color:#475569;font-size:12.5px;margin-top:3px">✉️ ' +
        (r.sidasti_postur
          ? fmtD(r.sidasti_postur) + " — " + esc(r.sidasta_efni || "(ekkert efni)") +
            ' <span style="color:#94a3b8">(' + (r.sidasti_fra_okkur ? "frá okkur" : "frá " + esc(r.sidasti_sendandi || "viðskiptavini")) + ")</span>"
          : '<span style="color:#94a3b8">engin póstsaga' + (r.netfang ? "" : " — ekkert netfang skráð") + "</span>") +
        "</div>" +
        (r.banner_note ? '<div style="color:#b45309;font-size:12.5px;margin-top:2px">📌 ' + esc(r.banner_note) + "</div>" : "") +
        '<div class="_crm-exp" style="display:none"></div>';
      row.addEventListener("click", ev => { if (ev.target.closest("a")) return; expand(row, r); });
      host.appendChild(row);
    }
  }

  async function expand(row, r) {
    const box = row.querySelector("._crm-exp");
    if (box.style.display !== "none") { box.style.display = "none"; return; }
    box.style.display = "";
    box.innerHTML = '<div style="color:#94a3b8;font-size:12px;padding:6px 0">Sæki póstsögu…</div>';
    let mails = [];
    try {
      const res = await fetch(U + "/rest/v1/fyrirtaeki_samskipti?fyrirtaeki_id=eq." + r.fyrirtaeki_id +
        "&select=received_at,sender_name,subject,snippet,is_question,fra_okkur&order=received_at.desc&limit=5", { headers: H });
      mails = await res.json();
    } catch (e) { }
    box.innerHTML = '<div style="border-top:1px dashed #e2e8f0;margin-top:8px;padding-top:8px">' +
      (mails.length ? mails.map(m =>
        '<div style="padding:6px 9px;margin:4px 0;border-radius:8px;background:' + (m.is_question && !m.fra_okkur ? "#fef2f2" : "#f8fafc") + '">' +
        '<div style="font-size:11px;color:#64748b">' + fmtD(m.received_at) + " · " + esc(m.fra_okkur ? "Slökkvitæki ehf" : (m.sender_name || "")) + "</div>" +
        '<div style="font-weight:600;font-size:12.5px">' + esc(m.subject || "(ekkert efni)") + "</div>" +
        '<div style="color:#475569;font-size:12px">' + esc((m.snippet || "").slice(0, 180)) + "</div></div>").join("")
        : '<div style="color:#94a3b8;font-size:12px">Engir póstar.</div>') +
      (r.athugasemdir_stubbur ? '<div style="font-size:11px;font-weight:700;color:#64748b;margin:8px 0 3px">📋 PUNKTAR</div><div style="white-space:pre-wrap;background:#f8fafc;border-radius:8px;padding:8px 10px;font-size:12px;color:#334155">' + esc(r.athugasemdir_stubbur) + "</div>" : "") +
      (r.simi || r.netfang ? '<div style="margin-top:7px;font-size:12.5px">' +
        (r.simi ? '<a href="tel:' + esc(String(r.simi).replace(/[^\d+]/g, "")) + '">📞 ' + esc(r.simi) + "</a> · " : "") +
        (r.netfang ? '<a href="mailto:' + esc(r.netfang) + '">✉️ ' + esc(r.netfang) + "</a>" : "") + "</div>" : "") +
      "</div>";
  }

  /* ════════════════════════════════════════════════════════════
     ÞJÓNUSTUBORÐ — full síða yfir crm_yfirlit (v2)
     ════════════════════════════════════════════════════════════ */
  const NAV_KEY = "thjonustubord", VIEW_ID = "view-thjonustubord";
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

  const T = { rows: null, loading: false, err: null, q: "", group: "all", sortKey: "nafn", sortDir: 1 };
  const SORT_DEF = { nafn: 1, sidasti_postur: -1, inspect_month: 1, isk_ogreitt: -1 };

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
    try { T.rows = await tFetch(); } catch (e) { T.err = e.message || String(e); }
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
      return v * dir || String(a.nafn || "").localeCompare(String(b.nafn || ""), "is");
    });
  }
  function tFiltered() {
    let rows = T.rows || [];
    if (T.q) {
      const q = T.q;
      rows = rows.filter(r => String(r.nafn || "").toLowerCase().includes(q) ||
        String(r.rekstrarfelag || "").toLowerCase().includes(q) ||
        String(r.kennitala || "").replace(/\D/g, "").includes(q.replace(/\D/g, "") || " "));
    }
    return tSorted(rows);
  }

  function tdPostur(r) {
    if (!r.sidasti_postur) return '<span class="tbord-mut">—</span>';
    const efni = String(r.sidasta_efni || "").slice(0, 60) + (String(r.sidasta_efni || "").length > 60 ? "…" : "");
    const svara = r.sidasti_fra_okkur === false && r.osvarad > 0
      ? ' <span class="tbord-osv" title="Ósvarað — síðasti póstur frá viðskiptavini">↩︎ <b>' + r.osvarad + "</b></span>" : "";
    return '<div class="tbord-rel">' + esc(relD(r.sidasti_postur)) + svara + "</div>" +
      '<div class="tbord-sub" title="' + esc(r.sidasta_efni || "") + '">' + esc(efni) + "</div>";
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
    return '<tr class="tbord-row" data-id="' + esc(r.fyrirtaeki_id) + '">' +
      '<td><div class="tbord-nafn">' + esc(r.nafn || "—") + "</div>" +
      (r.heimilisfang ? '<div class="tbord-sub">' + esc(r.heimilisfang) + "</div>" : "") + "</td>" +
      "<td>" + (r.rekstrarfelag ? esc(r.rekstrarfelag) : '<span class="tbord-mut">—</span>') + "</td>" +
      "<td>" + tdPostur(r) + "</td>" +
      "<td>" + tdSkodun(r) + "</td>" +
      '<td class="tbord-nowrap">' + tdSkjol(r) + "</td>" +
      '<td class="tbord-nowrap">' + tdOgreitt(r) + "</td></tr>";
  }
  function tBody(rows) {
    if (!rows.length) return '<tr><td colspan="6" class="tbord-empty">Ekkert félag fannst.</td></tr>';
    if (T.group !== "rf") return rows.map(tRow).join("");
    const groups = new Map();
    rows.forEach(r => {
      const k = r.rekstrarfelag || " ";
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(r);
    });
    const keys = [...groups.keys()].filter(k => k !== " ").sort((a, b) => a.localeCompare(b, "is"));
    if (groups.has(" ")) keys.push(" ");
    return keys.map(k => {
      const g = groups.get(k);
      const sum = g.reduce((s, r) => s + (+r.isk_ogreitt || 0), 0);
      const osv = g.reduce((s, r) => s + (+r.osvarad || 0), 0);
      return '<tr class="tbord-ghead"><td colspan="6">' +
        esc(k === " " ? "— Sjálfstæð —" : k) +
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
    host.innerHTML =
      '<div class="tbord-top">' +
      '<h2 class="tbord-title">📇 Þjónustuborð</h2>' +
      '<span class="tbord-note">' + rows.length + " félög" + (hhmm ? " · Uppfært " + esc(hhmm) : "") + "</span>" +
      '<button id="tbord-refresh" class="tbord-btn" title="Sækja aftur"' + (T.loading ? " disabled" : "") + ">↻" + (T.loading ? " …" : "") + "</button>" +
      '<input id="tbord-q" placeholder="Leita — nafn / rekstrarfélag / kt…" value="' + esc(T.q) + '">' +
      '<div class="tbord-seg">' +
      '<button data-g="all" class="' + (T.group === "all" ? "on" : "") + '">Allt</button>' +
      '<button data-g="rf" class="' + (T.group === "rf" ? "on" : "") + '">Eftir rekstrarfélagi</button></div></div>' +
      '<div class="tbord-tblwrap"><table class="tbord-tbl"><thead><tr>' +
      th("nafn", "Fyrirtæki") + th(null, "Rekstrarfélag") + th("sidasti_postur", "Síðasti póstur") +
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
    host.querySelectorAll(".tbord-th").forEach(h => h.addEventListener("click", () => {
      const k = h.dataset.sort;
      if (T.sortKey === k) T.sortDir *= -1; else { T.sortKey = k; T.sortDir = SORT_DEF[k] || 1; }
      tRender();
    }));
    host.querySelector("tbody").addEventListener("click", e => {
      const tr = e.target.closest("tr.tbord-row");
      if (!tr) return;
      const id = tr.getAttribute("data-id");
      try {
        if (window.Companies && Companies.openDetail) Companies.openDetail(isNaN(id) ? id : parseInt(id, 10));
        else if (window.VidskDetail && VidskDetail.show) VidskDetail.show(parseInt(id, 10));
      } catch (err) { console.warn("[tbord] openDetail", err); }
    });
  }

  function tStyle() {
    if (document.getElementById("tbord-style")) return;
    const s = document.createElement("style");
    s.id = "tbord-style";
    s.textContent =
      "#" + VIEW_ID + "{color:var(--ink1,#0f172a)}" +
      ".tbord-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:16px 18px 12px}" +
      ".tbord-title{margin:0;font-size:19px;font-weight:800}" +
      ".tbord-note{color:var(--ink2,#64748b);font-size:12.5px}" +
      ".tbord-btn{border:1px solid var(--brd,#cbd5e1);background:#fff;border-radius:9px;padding:6px 12px;font-size:14px;font-weight:700;cursor:pointer}" +
      "#tbord-q{flex:1;min-width:200px;border:1px solid var(--brd,#cbd5e1);border-radius:10px;padding:8px 12px;font-size:13.5px}" +
      ".tbord-seg{display:flex;border:1px solid var(--brd,#cbd5e1);border-radius:10px;overflow:hidden}" +
      ".tbord-seg button{border:0;background:#fff;color:#475569;padding:7px 13px;font-size:12.5px;font-weight:700;cursor:pointer}" +
      ".tbord-seg button.on{background:#0f172a;color:#fff}" +
      ".tbord-tblwrap{margin:0 18px 40px;background:#fff;border:1px solid var(--brd,#e2e8f0);border-radius:12px;overflow:auto}" +
      ".tbord-tbl{width:100%;border-collapse:collapse;font-size:13px}" +
      ".tbord-tbl th{text-align:left;color:#64748b;font-size:11.5px;text-transform:uppercase;letter-spacing:.03em;padding:9px 10px;border-bottom:1px solid #e2e8f0;white-space:nowrap;background:#f8fafc;position:sticky;top:0}" +
      ".tbord-th{cursor:pointer;user-select:none}.tbord-th:hover{color:#0f172a}" +
      ".tbord-tbl td{padding:8px 10px;border-bottom:1px solid #eef1f5;vertical-align:top}" +
      ".tbord-row{cursor:pointer}.tbord-row:hover td{background:#f1f5f9}" +
      ".tbord-nafn{font-weight:700}" +
      ".tbord-sub{color:#94a3b8;font-size:11.5px}" +
      ".tbord-mut{color:#cbd5e1}" +
      ".tbord-nowrap{white-space:nowrap}" +
      ".tbord-osv{color:#dc2626;font-weight:700;background:#fef2f2;border-radius:99px;padding:1px 8px;font-size:11.5px}" +
      ".tbord-red{color:#b91c1c;font-weight:700}" +
      ".tbord-cnt{display:inline-block;border-radius:6px;padding:1px 6px;margin-right:3px;font-size:11.5px;font-weight:700;background:#f1f5f9;color:#94a3b8}" +
      ".tbord-cnt.on{background:#f0fdf4;color:#15803d}" +
      ".tbord-ghead td{background:#0f172a;color:#fff;font-weight:800;font-size:12.5px;padding:7px 10px}" +
      ".tbord-gsub{font-weight:400;color:#cbd5e1}" +
      ".tbord-ghead .tbord-red{color:#fca5a5}.tbord-ghead .tbord-osv{background:transparent;padding:0;color:#fca5a5}" +
      ".tbord-empty{text-align:center;color:#94a3b8;padding:26px}";
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
    b.innerHTML = '<span style="margin-right:6px">📇</span>Þjónustuborð';
    b.addEventListener("click", e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView && window.App._tbordSwitchPatched) App.switchView(NAV_KEY); else tShow();
    });
    nav.appendChild(b);
  }
  tPatchSwitchView();
  tInjectNav();
  window.Thjonustubord = { open: tShow, reload: () => tLoad(true) };

  console.log("[crm-board] v2 installed (flotandi borð + Þjónustuborð)");
})();
