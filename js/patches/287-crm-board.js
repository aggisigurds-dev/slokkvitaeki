/* js/patches/287-crm-board.js — 📇 Samskiptaborð (CRM)
   ────────────────────────────────────────────────────────────
   Yfirlit yfir síðustu samskipti við ÖLL félög í þjónustu.
   Flotandi hnappur neðst til hægri → borð með síðasta pósti,
   ósvöruðum spurningum, borðum og útvíkkanlegri póstsögu.
   Gögn: crm_cache (uppfærist á klst fresti, pg_cron 'crm-cache-refresh')
   + fyrirtaeki_samskipti (við útvíkkun línu).
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
      '<button id="_crm-x" style="border:0;background:#f1f5f9;border-radius:99px;width:32px;height:32px;cursor:pointer;font-size:16px">✕</button></div>' +
      '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center">' +
      '<input id="_crm-q" placeholder="Leita að félagi…" style="flex:1;min-width:180px;border:1px solid #cbd5e1;border-radius:10px;padding:8px 12px;font-size:14px">' +
      '<button class="_crm-f" data-f="osvarad" style="border:1px solid #fecaca;background:#fef2f2;color:#dc2626;border-radius:99px;padding:6px 13px;font-size:12.5px;font-weight:700;cursor:pointer">🔴 Ósvarað <span id="_crm-n-osv"></span></button>' +
      '<button class="_crm-f" data-f="med" style="border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:99px;padding:6px 13px;font-size:12.5px;font-weight:700;cursor:pointer">✉️ Með póstsögu</button>' +
      '<button class="_crm-f" data-f="all" style="border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:99px;padding:6px 13px;font-size:12.5px;font-weight:700;cursor:pointer">Öll félög</button>' +
      "</div></div>" +
      '<div id="_crm-list" style="overflow:auto;padding:10px 14px 16px">Sæki gögn…</div></div>';
    document.body.appendChild(ov);
    ov.addEventListener("click", e => { if (e.target === ov || e.target.id === "_crm-x") ov.remove(); });
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

  console.log("[crm-board] v1 installed");
})();
