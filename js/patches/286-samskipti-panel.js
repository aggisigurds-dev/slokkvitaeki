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

  // ── 10.09.2026: útlit + textahreinsun ─────────────────────────────────────
  // Agnar: „more detailed samskiptabox so it shows the newest update and summary" og „smá
  // fallegri í stíl við síðuna". Sami rammi og önnur spjöld prófílsins (hvítt, 12px horn,
  // mjúkur skuggi), sömu Brunastáls-hnappar og IBM Plex. Stílblaðið er sett strax við
  // hleðslu svo 295-varaboxið (sem birtist ef kortið nær ekki að teiknast innan 6 s) fái
  // sama útlit — tvö ólík box litu út eins og „tvö forrit".
  function hreintEfni(s) {
    const t = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
    if (!t) return "(ekkert efni)";
    // Brengluð efnislína: áframsendir hausar sem lentu í efninu, t.d.
    // „2026 at 3:40:47 PM GMT To: Erling … Cc: …" (mælt í Öll póstsaga 10.09.2026).
    if (/\b(GMT|UTC)\b[^]*\b(To|Til):/i.test(t) || /^(from|frá|to|til|cc|sent):/i.test(t)) return "(ekkert efni)";
    return t;
  }
  // Aðeins það sem sendandinn skrifaði sjálfur: skorið við fyrstu tilvitnun, áframsendingu,
  // undirskrift eða kveðju. Útdrættirnir eru ein lína, svo leitað er innan línu. Dæmi sem
  // fylltu kortið: „… kveðja/Regards Alexander … ____ Frá: Slökkvitæki ehf <…> Sent: …".
  const KLIPPA_TXT = /\s(?:(?:frá|from|sent|til|to|cc|efni|subject)\s*:\s|-{3,}\s*(?:original|upprunaleg|forwarded|áframsent)|_{5,}|begin forwarded message|(?:kveðja|kv\.|kv,|bestu kveðjur|með kveðju|með bestu kveðju|virðingarfyllst|best regards|kind regards|regards)[\s,.!\/]|on .{3,80} wrote:|on (?:mon|tue|wed|thu|fri|sat|sun), |(?:mán|þri|mið|fim|fös|lau|sun)\.,? \d{1,2}\. \S+ \d{4}|þann .{3,80} skrifaði|\S+ skrifaði .{0,120}:)/i;
  function eiginTexti(s) {
    const t = " " + String(s == null ? "" : s).replace(/\s+/g, " ").trim();
    const m = KLIPPA_TXT.exec(t);
    return (m ? t.slice(0, m.index) : t).trim();
  }
  function afstada(iso) {
    const d = new Date(iso); if (isNaN(d.getTime())) return "";
    // Almanaksdagar (miðnætti til miðnættis): póstur frá því í gærkvöldi er „í gær", ekki „í dag".
    const nu = new Date();
    const dagar = Math.round((new Date(nu.getFullYear(), nu.getMonth(), nu.getDate()) - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    if (dagar <= 0) return "í dag";
    if (dagar === 1) return "í gær";
    if (dagar < 14) return "fyrir " + dagar + " dögum";
    if (dagar < 60) return "fyrir " + Math.round(dagar / 7) + " vikum";
    if (dagar < 365) return "fyrir " + Math.round(dagar / 30) + " mán.";
    const ar = Math.floor(dagar / 365);
    return "fyrir " + ar + (ar === 1 ? " ári" : " árum");
  }
  // Sendandanafn sem er í raun áframsendur haus („Has attachments JON … Begin forwarded message:
  // From: …", mælt á Álhellu 7) — netfangið segir þá meira en „nafnið".
  function hreintNafn(nafn, netfang) {
    const t = String(nafn == null ? "" : nafn).replace(/\s+/g, " ").trim();
    if (!t || t.length > 60 || /forwarded|from:|subject:|sent:|<[^>]*@/i.test(t)) return String(netfang || "") || "(óþekktur sendandi)";
    return t;
  }
  window.SamskiptiTexti = { hreintEfni, eiginTexti, afstada, hreintNafn };
  if (!document.getElementById("_skx-css")) {
    const BSTAL = "linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)";
    const st = document.createElement("style"); st.id = "_skx-css";
    st.textContent =
      "#companies-main ._samskipti-card._skx,#companies-main ._skx-hledur._skx,#companies-main ._skx-villa._skx,#companies-main ._co-mail-box{background:#fff !important;border:1px solid rgba(20,24,34,.1) !important;border-radius:12px !important;box-shadow:0 10px 28px -16px rgba(25,35,60,.22) !important;padding:14px 16px !important;margin:12px 0 !important;font-size:13.5px;color:var(--ink,#0f172a)}" +
      "._skx-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}" +
      "._skx-title{font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink,#0f172a)}" +
      "._skx-acts{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap;align-items:center}" +
      "._skx-btn{border:1px solid rgba(190,32,28,.55);background:" + BSTAL + ";color:#fff;border-radius:9px;padding:5px 12px;font:inherit;font-size:12px;font-weight:600;line-height:1.3;cursor:pointer;box-shadow:0 0 16px -4px rgba(160,16,16,.55),inset 0 1px 0 rgba(255,255,255,.16);white-space:nowrap}" +
      "._skx-btn.ljos{background:#fff;color:var(--ink,#0f172a);border-color:var(--brd,#e3e7ee);box-shadow:none}" +
      "._skx-btn.ljos:hover{background:#f7f8fa}._skx-btn:disabled{opacity:.6;cursor:default}" +
      "._skx-afgreitt{font-size:12px;font-weight:700;color:#166534}" +
      "._skx-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin:12px 0 4px}" +
      "._skx-tile{background:#f7f8fa;border:1px solid var(--brd,#e3e7ee);border-radius:10px;padding:8px 11px;min-width:0}" +
      "._skx-tile b{display:block;font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2,#5b6573);margin-bottom:2px}" +
      "._skx-tile span{display:block;font-size:13.5px;font-weight:600;color:var(--ink,#0f172a);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      "._skx-tile small{display:block;font-size:11.5px;color:var(--ink2,#5b6573);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      "._skx-tile small a{color:inherit}" +
      "._skx-tile.vidv{background:#fef2f2;border-color:#fecaca}._skx-tile.vidv span{color:#b91c1c}" +
      "._skx-lbl{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2,#5b6573);margin:14px 0 6px}" +
      "._skx ._ssk-mail{cursor:pointer}" +
      "._skx-nyjast{border:1px solid var(--brd,#e3e7ee);border-left:3px solid var(--accent,#c92a2a);border-radius:10px;padding:10px 13px;background:#fff}" +
      "._skx-nyjast.fra-okkur{border-left-color:#16365c}._skx-nyjast:hover{background:#fcfcfd}" +
      "._skx-rod{display:flex;gap:10px;align-items:flex-start;padding:8px 6px;border-bottom:1px solid #f1f3f6;border-radius:8px}" +
      "._skx-rod:hover{background:#f8fafc}._skx-rod.opin{background:#fef2f2}" +
      "._skx-rod-inni{min-width:0;flex:1}" +
      "._skx-dot{flex:none;width:8px;height:8px;border-radius:50%;margin-top:7px;background:var(--accent,#c92a2a)}._skx-dot.okkur{background:#16365c}" +
      "._skx-meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11.5px;color:var(--ink2,#5b6573)}" +
      "._skx-chip{display:inline-flex;align-items:center;gap:4px;border-radius:99px;padding:1px 8px;font-size:10.5px;font-weight:700;background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;white-space:nowrap}" +
      "._skx-chip.kunni{background:#fff1f2;color:#9f1239;border-color:#fecdd3}" +
      "._skx-chip.okkur{background:#eff6ff;color:#1e3a8a;border-color:#bfdbfe}" +
      "._skx-chip.osvarad{background:#fef2f2;color:#b91c1c;border-color:#fecaca}" +
      "._skx-subj{font-weight:700;font-size:14px;margin:4px 0 2px;color:var(--ink,#0f172a);overflow-wrap:anywhere}" +
      "._skx-subj ._ssk-caret{color:#94a3b8;font-weight:400;font-size:11px}" +
      "._skx-txt{font-size:13px;line-height:1.5;color:#334155;overflow-wrap:anywhere}" +
      "._skx-rod ._skx-subj{font-size:13px}._skx-rod ._skx-txt{font-size:12.5px;color:#475569}" +
      "._skx-daufur{color:#94a3b8;font-style:normal}" +
      "._skx-pts{margin:12px 0 2px;display:grid;gap:5px}" +
      "._skx-pt{display:flex;gap:8px;font-size:12.5px;line-height:1.45;color:#334155}._skx-pt>span:first-child{flex:none;width:18px;text-align:center}" +
      "._skx-note{margin:10px 0 2px}" +
      "._skx-note summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;background:#f7f8fa;border:1px solid var(--brd,#e3e7ee);border-radius:10px;padding:8px 12px;color:var(--ink,#0f172a);font-size:12.5px;font-weight:600}" +
      "._skx-note summary::-webkit-details-marker{display:none}" +
      "._skx-note ._ssk-note-head{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      "._skx-note ._ssk-note-edit{opacity:.7;cursor:pointer}._skx-note ._ssk-note-car{opacity:.6;font-size:11px}" +
      "._skx-note ._ssk-note-body{white-space:pre-wrap;background:#fffdf5;border:1px solid #f1e3b5;border-top:0;border-radius:0 0 10px 10px;padding:10px 12px;color:#334155;font-size:12.5px;line-height:1.55}" +
      "._skx-beidni{padding:8px 10px;margin:6px 0;border-radius:10px;background:#f7f8fa;border:1px solid var(--brd,#e3e7ee)}" +
      "._skx-beidni.lokid ._skx-subj{text-decoration:line-through;color:#94a3b8}" +
      "._samskipti-card ._smx-strip{margin:10px 0 0}" +
      "._samskipti-card ._smx-imp,._samskipti-card ._smx-mute{border-radius:9px !important;background:#fff !important;border:1px solid var(--brd,#e3e7ee) !important;color:var(--ink,#0f172a) !important}" +
      "._co-mail-box ._cmb-reply{background:" + BSTAL + " !important;border:1px solid rgba(190,32,28,.55) !important;border-radius:9px !important}" +
      "._co-mail-box ._cmb-imp,._co-mail-box ._cmb-mute,._co-mail-box ._cmb-hist{background:#fff !important;border:1px solid var(--brd,#e3e7ee) !important;border-radius:9px !important;color:var(--ink,#0f172a) !important}" +
      "._co-mail-box ._skx-title-alt{color:var(--ink,#0f172a) !important;font-weight:700 !important;letter-spacing:.08em !important}" +
      // 10.09.2026 — hleðslukort, „Uppfæri…"-merkið og lás á skrif-tökkum á meðan geymd útgáfa sést
      "._skx-uppf{display:inline-flex;align-items:center;gap:6px;min-width:0;max-width:100%;font-size:11.5px;font-weight:600;color:var(--ink2,#5b6573);background:#f7f8fa;border:1px solid var(--brd,#e3e7ee);border-radius:99px;padding:2px 10px 2px 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
      "._skx-uppf.ok{color:#166534;background:#f0fdf4;border-color:#bbf7d0}" +
      "._skx-uppf.villa{color:#9a3412;background:#fff7ed;border-color:#fed7aa}" +
      "._skx-snuda{flex:none;width:10px;height:10px;border-radius:50%;border:2px solid rgba(201,42,42,.22);border-top-color:var(--accent,#c92a2a);animation:_skxSnu .8s linear infinite}" +
      "@keyframes _skxSnu{to{transform:rotate(360deg)}}" +
      "._skx-bein{position:relative;overflow:hidden;background:#eef0f4 !important;border-color:#eef0f4 !important}" +
      "._skx-bein>*{visibility:hidden}" +
      "._skx-bein::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.75),rgba(255,255,255,0));transform:translateX(-100%);animation:_skxGlit 1.3s ease-in-out infinite}" +
      "@keyframes _skxGlit{to{transform:translateX(100%)}}" +
      "._skx-bein-blokk{height:74px;border-radius:10px;border:1px solid #eef0f4}" +
      "._skx[data-lagrad='1'] ._skx-svara,._skx[data-lagrad='1'] ._ssk-mark{opacity:.5;pointer-events:none}" +
      "._skx[data-lagrad='1'] ._ssk-note-edit{opacity:.2 !important;pointer-events:none}" +
      "@media (prefers-reduced-motion:reduce){._skx-snuda,._skx-bein::after{animation:none}}";
    document.head.appendChild(st);
  }

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // 10.09.2026: Chrome á Windows fellur í en-US fyrir is-IS („Oct 13, 2025") — sami vandi og
  // 61 leysti með íslenskum mánaðaheitum. Smíðað í höndunum svo dagsetningin sé alltaf íslensk.
  const MAN_IS = ["jan.", "feb.", "mar.", "apr.", "maí", "jún.", "júl.", "ágú.", "sep.", "okt.", "nóv.", "des."];
  const fmtD = d => { const t = new Date(d); return isNaN(t.getTime()) ? "" : t.getDate() + ". " + MAN_IS[t.getMonth()] + " " + t.getFullYear(); };
  // 2026-07-30 — RÓTIN að „boxið kom aldrei": klíentinn í þessu appi heitir
  // DB.sb (js/db.js), EKKI window.sb. fetchData fékk því null og decorate
  // hætti þögult — hýsillinn festist á prófílinn en kortið teiknaðist aldrei.
  const sb = () => (window.DB && window.DB.sb) || window.sb || null;
  const cache = {};
  // Opin/lokuð staða kortsins per félag (póstsaga, „öll samskiptin", samantekt). Lifir endurteikningu
  // á meðan notandinn er á sama félagi; hreinsuð þegar annað félag er opnað (decorate).
  const _opid = {};
  const uiLesa = fid => _opid[fid] || {};
  const uiSetja = (fid, k, v) => { (_opid[fid] = _opid[fid] || {})[k] = !!v; };
  // ── GEYMD SAMSKIPTI (10.09.2026) ─────────────────────────────────────────
  // Agnar: „láta samskiptin geymast í kerfinu svo það taki ekki of langan tíma að uppfærast,
  // setja frekar loadmerki á gluggann og það komi þegar það er klárt". Síðasta HEILA sókn hvers
  // félags er geymd í IndexedDB á tækinu (slokk-samskipti/kort, lykill = fyrirtaeki.id). Næsta
  // opnun teiknar kortið strax úr geymslunni með „Uppfæri…"-merki, sækir ferskt í bakgrunni og
  // teiknar aðeins upp á nýtt ef eitthvað breyttist. Ekkert geymt → hleðslukort þar til gögnin
  // eru klár. Geymslan er skyndiminni, ekki heimild: í hana fer aðeins það sem þjónninn skilaði
  // (og staðfest eigin skrif), og á meðan geymd útgáfa sést eru skrif-takkarnir læstir — annars
  // gæti sjálfvirka vistun samantektarinnar skrifað eldri texta yfir nýrri frá annarri vél.
  // Bili IndexedDB (einkaflipi o.þ.h.) hegðar kortið sér eins og áður, bara með hleðslukorti.
  // Mest HAMARK félög; þau sem lengst er síðan voru sótt víkja.
  const GEYMSLA = (() => {
    const DBN = "slokk-samskipti", ST = "kort", UTG = 1, HAMARK = 300;
    let _db = null, _klippt = false;
    function opna() {
      if (_db) return _db;
      const p = new Promise((res, rej) => {
        if (!("indexedDB" in window)) return rej(new Error("ekkert indexedDB"));
        const r = indexedDB.open(DBN, 1);
        r.onupgradeneeded = () => { try { r.result.createObjectStore(ST).createIndex("savedAt", "savedAt"); } catch (_) {} };
        r.onsuccess = () => { const db = r.result; db.onversionchange = () => { try { db.close(); } catch (_) {} _db = null; }; res(db); };
        r.onerror = () => rej(r.error || new Error("idb"));
        r.onblocked = () => rej(new Error("idb læst"));
      });
      _db = p;
      p.catch(() => { if (_db === p) _db = null; });
      return p;
    }
    const bida = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(null), ms))]);
    async function lesa(fid) {
      try {
        const db = await bida(opna(), 600); if (!db) return null;
        const v = await bida(new Promise(res => {
          const rq = db.transaction(ST, "readonly").objectStore(ST).get(+fid);
          rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null);
        }), 600);
        return v && v.utg === UTG && v.data && v.data.f && +v.data.f.id === +fid && Array.isArray(v.data.mails) ? v : null;
      } catch (_) { return null; }
    }
    async function skrifa(fid, data, savedAt) {
      try {
        const db = await opna();
        const ok = await new Promise(res => {
          const tx = db.transaction(ST, "readwrite");
          tx.objectStore(ST).put({ utg: UTG, fid: +fid, savedAt: savedAt || Date.now(), data }, +fid);
          tx.oncomplete = () => res(true); tx.onerror = () => res(false); tx.onabort = () => res(false);
        });
        if (ok && !_klippt) { _klippt = true; klippa(db); }
        return ok;
      } catch (_) { return false; }
    }
    function klippa(db) {
      try {
        const os = db.transaction(ST, "readwrite").objectStore(ST);
        const cq = os.count();
        cq.onsuccess = () => {
          let umfram = cq.result - HAMARK; if (umfram <= 0) return;
          const kq = os.index("savedAt").openKeyCursor();
          kq.onsuccess = () => { const c = kq.result; if (!c || umfram <= 0) return; os.delete(c.primaryKey); umfram--; c.continue(); };
        };
      } catch (_) {}
    }
    // Staðfest eigin skrif (samantekt vistuð, merkt afgreitt) færð inn í geymdu útgáfuna; savedAt óbreytt.
    async function laga(fid, breyta) {
      const v = await lesa(fid); if (!v) return false;
      try { breyta(v.data); } catch (_) { return false; }
      return skrifa(fid, v.data, v.savedAt);
    }
    async function hreinsa() {
      try { const db = await opna(); return await new Promise(res => { const tx = db.transaction(ST, "readwrite"); tx.objectStore(ST).clear(); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }); }
      catch (_) { return false; }
    }
    async function fjoldi() {
      try { const db = await opna(); return await new Promise(res => { const q = db.transaction(ST, "readonly").objectStore(ST).count(); q.onsuccess = () => res(q.result); q.onerror = () => res(-1); }); }
      catch (_) { return -1; }
    }
    return { lesa, skrifa, laga, hreinsa, fjoldi };
  })();
  window.SamskiptiGeymsla = { lesa: GEYMSLA.lesa, hreinsa: GEYMSLA.hreinsa, fjoldi: GEYMSLA.fjoldi };
  const klukka = t => { const d = new Date(t); return isNaN(d.getTime()) ? "" : fmtD(d) + " kl. " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
  // SENT-ÞEKJAN — frá hvaða degi eigum við sendan póst? Sótt einu sinni.
  // Nauðsynleg til að fullyrða ekki „ÓSVARAÐ" um póst sem er eldri en safnið
  // okkar af SENDUM pósti (byrjar 18.07.2025 á meðan INBOX nær til 2015).
  // Sama vörn og bláa/rauða merkið notar; án hennar hefðu 54 af 85 beiðnum
  // verið merktar ósvaraðar að ósekju.
  let _sentFra = null;
  async function sentThekja() {
    if (_sentFra !== null) return _sentFra;
    try {
      const c = sb(); if (!c) return (_sentFra = "");
      const { data } = await c.from("v_sent_thekja").select("fra").limit(1).maybeSingle();
      _sentFra = (data && data.fra) || "";
    } catch (_) { _sentFra = ""; }
    return _sentFra;
  }

  async function fetchData(fid) {
    if (cache[fid] && Date.now() - cache[fid]._ts < 60000) return cache[fid];
    const client = sb(); if (!client) return null;
    // ok = ALLAR fyrirspurnir tókust. supabase-js kastar ekki — villan kemur í .error, og áður var
    // hún hunsuð: brostin felag_samskipti-sókn sýndi „Engir póstar fundust". Aðeins heil sókn fer
    // í minnið og tækisgeymsluna; villur segja frá sér á kortinu (uppfaera).
    const out = { _ts: Date.now(), f: null, mails: [], beidnir: [], handled: "", siblings: [fid], sentFra: "", ok: false, villur: [] };
    const skra = (r, hvad) => { if (r && r.error) out.villur.push(hvad + ": " + (r.error.message || r.error.code || "villa")); return (r && r.data) || null; };
    try {
      const fRes = await client.from("fyrirtaeki")
        .select('id,nafn,customer_base_id,banner_note,athugasemdir,netfang,simi,farsimi,"tengiliður",tengilidur')
        .eq("id", fid).maybeSingle();
      const f = skra(fRes, "fyrirtaeki");
      out.f = f || null;
      if (!f) { if (!out.villur.length) out.villur.push("fyrirtæki " + fid + " fannst ekki"); return out; }
      // 2026-07-30 (ósk Agnars — „skilaboða boxið í fyrirtækin", sama og
      // Heimaleigu-skúffan á Þjónustuborðinu): sagan er lesin á FÉLAGINU
      // (felag_samskipti) þegar byggingin á base. Eftir sönnunar-tenginguna á
      // stök bygging oft ENGA sannaða pósta þótt félagið eigi tugi — gamla
      // fyrirspurnin skildi boxið eftir tómt. Póstur á aðra byggingu ber
      // 📍-merki hennar.
      if (f && f.customer_base_id) {
        // 09.09.2026 (Agnar: „ég vill hafa öll tölvupósta samskipti aðgengileg
        // þarna … alveg 3 ár aftur í tímann"). TVÆR HEIMILDIR, sameinaðar á
        // email_id:
        //   • felag_samskipti — gamla sönnunar-tengingin. Hún ein veit HVAÐA
        //     bygging á póstinn (fyrirtaeki_id → 📍-merkið), svo hún gengur fyrir
        //     þegar sami póstur er í báðum.
        //   • v_kunni_postur  — víða tengingin: netföng customers_base + lén sem
        //     á sér nákvæmlega einn kúnna. Hún finnur póstinn sem nákvæma
        //     netfangið missti af. Mælt: Granítsteinar er skráður
        //     bokhald@granitsteinar.is en öll samskipti eru við
        //     granitsteinar@granitsteinar.is — boxið var tómt. Á öllu safninu:
        //     925 póstar á 206 kúnnum → 1.678 á 235.
        // 30-þakið er farið; stærsti kúnninn á 207 pósta, svo öll sagan kemst
        // í eitt kall (uppfletting mæld 61 ms eftir að postfang_tengsl kom til).
        // 10.09.2026 (Agnar: „svo það taki ekki of langan tíma að uppfærast"): allt sem kortið
        // þarf er sótt SAMHLIÐA í einni umferð. Áður fimm ferðir í röð — mælt: Suðurhellu 9
        // 887 → 314 ms, Center Hótel (350 póstar, 214 KB) 776 → 444 ms, auk fyrirtaeki-raðarinnar
        // hér að ofan sem hinar þurfa customer_base_id úr.
        const base = f.customer_base_id;
        const [fsRes, vkRes, sibRes, bsRes, hRes, sentFra, umRes] = await Promise.all([
          client.from("felag_samskipti")
            .select("email_id,sender_name,sender_email,subject,snippet,is_question,fra_okkur,received_at,fyrirtaeki_id,fyrirtaeki_nafn,via")
            .eq("customer_base_id", base).order("received_at", { ascending: false }).limit(400),
          client.from("v_kunni_postur")
            .select("email_id,sender_name,sender_email,subject,snippet,is_question,fra_okkur,received_at,flokkur,via")
            .eq("customer_base_id", base).order("received_at", { ascending: false }).limit(400),
          client.from("fyrirtaeki")
            .select("id").eq("customer_base_id", base).is("deleted_at", null),
          // 2026-07-30 (ósk Agnars — „þyrfti að geta séð meira um þessi mál"): hausinn lofaði
          // BEIÐNUM en þær sáust hvergi — aðeins fjöldinn rataði í punktana. Hér koma sjálf
          // málin af Þjónustuborðinu (sama tafla, 231).
          client.from("thjonustubeidni")
            .select("id,title,notes,summary,status,type,flokkur,important,due_at,created_at,source,channel_ref")
            .eq("customer_base_id", base).is("deleted_at", null)
            .order("created_at", { ascending: false }).limit(12),
          // ✓-staðan (samskipti_stada) — spurning eldri en hún telst afgreidd
          client.from("samskipti_stada")
            .select("handled_at").eq("fyrirtaeki_id", fid).maybeSingle(),
          sentThekja(),
          // 10.09.2026: póstur umsjónaraðila (Eignaumsjón, Rekstrarumsjón, Eignarekstur) sem gatan í
          // honum tengir á húsið. Reiknað á klukkutíma fresti í umsjonarpostur_tengsl (pg_cron :50).
          client.from("felag_umsjonarpostur")
            .select("email_id,sender_name,sender_email,subject,snippet,is_question,fra_okkur,received_at,fyrirtaeki_id,fyrirtaeki_nafn,via,lyklar")
            .eq("customer_base_id", base).order("received_at", { ascending: false }).limit(400),
        ]);
        const byId = new Map();
        (skra(vkRes, "v_kunni_postur") || []).forEach(m => byId.set(String(m.email_id), m));
        // umsjón á undan felag_samskipti: sami póstur í báðum → felag_samskipti ræður (hún veit hvaða bygging)
        (skra(umRes, "felag_umsjonarpostur") || []).forEach(m => {
          const k = String(m.email_id);
          byId.set(k, Object.assign({}, byId.get(k) || {}, m));
        });
        (skra(fsRes, "felag_samskipti") || []).forEach(m => {
          const k = String(m.email_id);
          byId.set(k, Object.assign({}, byId.get(k) || {}, m));   // fs vinnur á sameiginlegum reitum
        });
        out.mails = [...byId.values()]
          .sort((a, b) => String(b.received_at || "").localeCompare(String(a.received_at || "")));
        // raðað: röð án ORDER BY getur flakkað milli kalla og liti þá út eins og breyting á kortinu
        out.siblings = (skra(sibRes, "systkini") || []).map(x => x.id).sort((a, b) => a - b);
        if (!out.siblings.length) out.siblings = [fid];
        out.beidnir = skra(bsRes, "thjonustubeidni") || [];
        const h = skra(hRes, "samskipti_stada");
        out.handled = (h && h.handled_at) || "";
        out.sentFra = sentFra || "";
      } else {
        const [mRes, hRes, sentFra] = await Promise.all([
          client.from("fyrirtaeki_samskipti")
            .select("email_id,sender_name,sender_email,subject,snippet,is_question,fra_okkur,received_at")
            .eq("fyrirtaeki_id", fid).order("received_at", { ascending: false }).limit(30),
          client.from("samskipti_stada")
            .select("handled_at").eq("fyrirtaeki_id", fid).maybeSingle(),
          sentThekja(),
        ]);
        out.mails = skra(mRes, "fyrirtaeki_samskipti") || [];
        const h = skra(hRes, "samskipti_stada");
        out.handled = (h && h.handled_at) || "";
        out.sentFra = sentFra || "";
      }
    } catch (e) { out.villur.push(String((e && e.message) || e)); console.warn("[samskipti-panel]", e); }
    out.ok = !!out.f && !out.villur.length;
    if (out.ok) cache[fid] = out;
    return out;
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

  function keyPoints(f, mails, cut, sentFra) {
    const pts = [];
    if (f.banner_note) pts.push(["📌", f.banner_note]);
    // 09.09.2026 (Agnar: „allir mikilvægir punktar má koma í samantekt um
    // fyrirtækið"). Beiðni um aukaþjónustu og uppsögn á samningi eru það sem
    // MÁ ALLS EKKI gleymast fyrir árlegu heimsóknina — þau fara því hátt í
    // samantektina sjálfa, ekki bara í punktinn á listanum.
    // Flokkurinn kemur úr bh_postflokkur (v_kunni_postur.flokkur) — SAMA
    // skilgreining og bláa merkið notar, svo þau geta ekki sagt sitt hvað.
    // Reiknað hér úr póstunum sem þegar eru sóttir, svo þetta virkar líka áður
    // en /api/company-mail fer í loftið.
    const merkt = mails.filter(m => m.flokkur && !m.fra_okkur);
    if (merkt.length) {
      const m = merkt[0];                       // mails er raðað nýjast fyrst
      const svarad = mails.some(x => x.fra_okkur &&
        String(x.received_at || "") > String(m.received_at || ""));
      // „ÓSVARAÐ" má aðeins fullyrða um póst sem er NÝRRI en sendi-safnið
      // okkar nær — annars er þögnin gat í safninu, ekki vanræksla.
      const metanlegt = !!sentFra && String(m.received_at || "") >= String(sentFra);
      pts.push([m.flokkur === "uppsogn" ? "🚪" : "📩",
        (m.flokkur === "uppsogn" ? "Uppsögn á samningi" : "Beiðni um aukaþjónustu") +
        " — " + fmtD(m.received_at) + ": " + (m.subject || "(ekkert efni)") +
        (svarad ? " (svarað)" : metanlegt ? " — ÓSVARAÐ" : " (svar óvíst — eldra en sendi-safnið)")]);
    }
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
    // Fimm slott (var fjögur): beiðni/uppsögn bætist við án þess að ýta
    // tengiliðnum eða síðasta póstinum út — hvort tveggja er notað daglega.
    return pts.slice(0, 5);
  }

  function render(host, fid, data, opt) {
    opt = opt || {};
    const f = data.f; if (!f) return;
    const cut = cutOf(data);
    const erOpin = m => m.is_question && !m.fra_okkur && (!cut || m.received_at > cut);
    const openQ = data.mails.filter(erOpin).length;
    // Tengiliður og síðasti póstur eru komnir í flísarnar og „Nýjasta uppfærslu" — punktarnir
    // halda aðeins því sem þar er ekki (festur miði, beiðni/uppsögn, viðvörun).
    const pts = keyPoints(f, data.mails, cut, data.sentFra || "").filter(p => p[0] !== "👤" && p[0] !== "✉️");
    const T = window.SamskiptiTexti;
    const card = document.createElement("div");
    card.className = "card pad _samskipti-card _skx";
    // Merki fyrir 359: ÖLL póstsagan er þegar í kortinu, svo „⬇ Eldri póstar" á ekki erindi.
    card.dataset.ollSagan = "1";
    // 10.09.2026: teiknað úr tækisgeymslu → skrif-takkar læstir þar til ferska sóknin staðfestir (uppfaera).
    if (opt.lagrad) card.dataset.lagrad = "1";
    const SYNI = 20;
    const nyjast = data.mails[0] || null;
    const arFra = Date.now() - 365 * 864e5;
    const sidastaAr = data.mails.filter(m => new Date(m.received_at).getTime() >= arFra);
    const fraKunna = sidastaAr.filter(m => !m.fra_okkur).length, fraOkkur = sidastaAr.length - fraKunna;
    const opnarBeidnir = (data.beidnir || []).filter(b => b.status !== "lokid").length;
    const teng = f["tengiliður"] || f.tengilidur || "";
    const simi = f.farsimi || f.simi || "";

    // ── Samantekt: fjórar flísar ──
    const flis = (lbl, gildi, smatt, kl) => '<div class="_skx-tile' + (kl ? " " + kl : "") + '"><b>' + esc(lbl) + "</b><span>" + gildi + "</span>" + (smatt ? "<small>" + smatt + "</small>" : "") + "</div>";
    const tilesHtml =
      flis("Síðasti póstur", nyjast ? esc(fmtD(nyjast.received_at)) : "—",
        nyjast ? esc(T.afstada(nyjast.received_at) + " · " + (nyjast.fra_okkur ? "frá okkur" : "frá kúnna")) : "enginn póstur skráður") +
      flis("Síðustu 12 mánuðir", esc(sidastaAr.length + (sidastaAr.length === 1 ? " póstur" : " póstar")),
        sidastaAr.length ? esc(fraKunna + " frá kúnna · " + fraOkkur + " frá okkur") : "") +
      flis("Opin mál", esc(openQ ? openQ + " ósvarað" : "Ekkert ósvarað"),
        opnarBeidnir ? esc(opnarBeidnir + (opnarBeidnir === 1 ? " opin beiðni" : " opnar beiðnir"))
          : (data.handled ? esc("✓ afgreitt " + fmtD(data.handled)) : ""), openQ ? "vidv" : "") +
      flis("Tengiliður", esc(teng || f.netfang || "—"),
        [simi ? '<a href="tel:' + esc(simi.replace(/[^\d+]/g, "")) + '">📞 ' + esc(simi) + "</a>" : "",
         f.netfang && teng ? '<a href="mailto:' + esc(f.netfang) + '">' + esc(f.netfang) + "</a>" : ""].filter(Boolean).join(" · "));

    // ── Póstur: nýjasta uppfærslan (stór) og röð í póstsögunni (lína) ──
    // Sömu klasar og áður (_ssk-mail / _ssk-snip / _ssk-body / _ssk-caret) — smellurinn sem
    // sækir allan póstinn og býður svar er óbreyttur hér neðar.
    const mailRow = (m, nyj) => {
      const open = erOpin(m);
      const via = (m.fyrirtaeki_nafn && m.fyrirtaeki_id !== fid) ? '<span class="_skx-chip">📍 ' + esc(m.fyrirtaeki_nafn) + "</span>" : "";
      const umsjon = m.via === "umsjon" ? '<span class="_skx-chip" title="Póstur umsjónaraðila — tengdur húsinu af því að „' + esc(m.lyklar || "") + '" stendur í honum">🔑 Umsjón</span>' : "";
      const hver = m.fra_okkur ? "Slökkvitæki ehf" : T.hreintNafn(m.sender_name, m.sender_email);
      const texti = T.eiginTexti(m.snippet);
      return '<div class="_ssk-mail ' + (nyj ? "_skx-nyjast" : "_skx-rod") + (m.fra_okkur ? " fra-okkur" : "") + (open ? " opin" : "") + '" data-eid="' + (m.email_id || "") + '">' +
        (nyj ? "" : '<span class="_skx-dot ' + (m.fra_okkur ? "okkur" : "kunni") + '"></span>') +
        '<div class="_skx-rod-inni">' +
          '<div class="_skx-meta">' +
            '<span class="_skx-chip ' + (m.fra_okkur ? "okkur" : "kunni") + '">' + (m.fra_okkur ? "Frá okkur" : "Frá kúnna") + "</span>" +
            (open ? '<span class="_skx-chip osvarad">Ósvarað</span>' : "") +
            "<span>" + esc(hver) + "</span><span>·</span><span>" + esc(fmtD(m.received_at)) + " · " + esc(T.afstada(m.received_at)) + "</span>" + via + umsjon +
          "</div>" +
          '<div class="_skx-subj">' + esc(T.hreintEfni(m.subject)) + ' <span class="_ssk-caret">▾</span></div>' +
          '<div class="_ssk-snip _skx-txt">' + (texti
            ? esc(texti.slice(0, nyj ? 420 : 180))
            : '<span class="_skx-daufur">Tilvitnun eða áframsendur póstur — smelltu til að lesa</span>') + "</div>" +
          '<div class="_ssk-body" style="display:none"></div>' +
        "</div></div>";
    };
    const eldri = data.mails.slice(SYNI);
    const mailsHtml = data.mails.length
      ? data.mails.slice(0, SYNI).map(m => mailRow(m, false)).join("") +
        (eldri.length
          ? '<div class="_ssk-eldri" hidden>' + eldri.map(m => mailRow(m, false)).join("") + "</div>" +
            '<button type="button" class="_ssk-meira _skx-btn ljos" style="margin-top:8px">⬇ Sýna öll samskiptin (' + data.mails.length + ")</button>"
          : "")
      : '<div class="_skx-daufur" style="padding:6px 0">Engir póstar fundust á netfangi tengiliðar.</div>';
    const beidnirHtml = (data.beidnir || []).length
      ? data.beidnir.map(b => {
          const lokid = b.status === "lokid";
          const merki = [b.flokkur, b.type].filter(Boolean).map(t => '<span class="_skx-chip">' + esc(t) + "</span>").join(" ");
          const txt = (b.summary || b.notes || "").trim();
          return '<div class="_skx-beidni' + (lokid ? " lokid" : "") + '">' +
            '<div class="_skx-meta"><span class="_skx-chip' + (lokid ? "" : " okkur") + '">' + esc(lokid ? "✓ lokið" : b.status === "i_vinnslu" ? "í vinnslu" : "nýtt") + "</span>" +
              "<span>" + esc(fmtD(b.created_at)) + "</span>" + (b.due_at ? "<span>· gjalddagi " + esc(fmtD(b.due_at)) + "</span>" : "") +
              (b.important ? '<span class="_skx-chip osvarad">áríðandi</span>' : "") + merki + "</div>" +
            '<div class="_skx-subj" style="font-size:13px">' + esc(b.title || "(ónefnt)") + "</div>" +
            (txt ? '<div class="_skx-txt" style="white-space:pre-wrap">' + esc(txt.slice(0, 300)) + "</div>" : "") +
          "</div>"; }).join("")
      : '<div class="_skx-daufur" style="padding:6px 0">Engar beiðnir skráðar á þetta félag.</div>';

    // ── Samantektarreiturinn (athugasemdir) — sama vistunarvirkni og áður hér neðar ──
    const aths = (f.athugasemdir || "").trim();
    const athsHead = aths ? aths.split("\n")[0].trim() : "";
    const athsRest = aths ? aths.split("\n").slice(1).join("\n").trim() : "";
    const athsBlock = aths
      ? '<details class="_ssk-note _skx-note">' +
          '<summary class="_ssk-note-sum"><span style="opacity:.7">📋</span>' +
            '<span class="_ssk-note-head">' + esc(athsHead) + "</span>" +
            '<span class="_ssk-note-edit" title="Breyta samantekt">✎</span>' +
            '<span class="_ssk-note-car">▸</span>' +
          "</summary>" +
          '<div class="_ssk-note-body">' + esc(athsRest || athsHead) + "</div>" +
        "</details>"
      : "";
    const ptsHtml = pts.map(p => '<div class="_skx-pt"><span>' + p[0] + "</span><span>" + (p[2] ? p[1] : esc(p[1])) + "</span></div>").join("");
    const svaraM = data.mails.find(m => !m.fra_okkur && m.sender_email) || null;

    card.innerHTML =
      '<div class="_skx-head">' +
        '<div class="_skx-title">💬 Samskipti</div>' +
        (opt.lagrad ? '<span class="_skx-uppf" title="Sýni samskiptin eins og þau voru sótt ' + esc(klukka(opt.lagrad)) + ' á þessu tæki, á meðan nýjustu eru sótt."><i class="_skx-snuda"></i>Uppfæri…</span>' : "") +
        '<div class="_skx-acts">' +
          (svaraM && window.ReikningaPostur && ReikningaPostur.replyTo ? '<button type="button" class="_skx-btn _skx-svara" title="Svara nýjasta pósti kúnnans — svarið fer í sama þráð">↩ Svara</button>' : "") +
          (openQ > 0
            ? '<button type="button" class="_ssk-mark _skx-btn ljos">✓ Merkja afgreitt</button>'
            : (data.handled ? '<span class="_skx-afgreitt">✓ Afgreitt</span>' : "")) +
          '<button type="button" class="_ssk-toggle _skx-btn ljos">Póstsaga ▾</button>' +
        "</div>" +
      "</div>" +
      '<div class="_skx-tiles">' + tilesHtml + "</div>" +
      (nyjast ? '<div class="_skx-lbl">Nýjasta uppfærsla</div>' + mailRow(nyjast, true) : "") +
      '<div class="_ssk-pts _skx-pts">' + ptsHtml + "</div>" +
      athsBlock +
      '<div class="_ssk-full" style="display:none">' +
        '<div class="_skx-lbl">Póstsaga · ' + data.mails.length + ' <span class="_skx-daufur" style="text-transform:none;letter-spacing:0;font-weight:400">— smelltu á póst til að lesa hann allan</span></div>' +
        mailsHtml +
        '<div class="_skx-lbl" style="display:flex;align-items:center;justify-content:space-between;gap:8px">Beiðnir &amp; mál' +
          (window.Verkbord ? '<button type="button" class="_ssk-bord _skx-btn ljos">Opna Þjónustuborð</button>' : "") +
        "</div>" +
        beidnirHtml +
      "</div>";

    // ↩ Svara — nýjasti póstur kúnnans; Message-ID sótt svo svarið fari í sama þráð.
    const svaraB = card.querySelector("._skx-svara");
    if (svaraB) svaraB.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      if (card.dataset.lagrad === "1") return;   // geymd útgáfa — nýrri póstur gæti verið á leiðinni
      svaraB.disabled = true;
      let m = null;
      try {
        const client = sb();
        const r = client ? await client.from("v_samskipti_postur")
          .select("id,message_id,account,sender_name,sender_email,subject,body_preview,snippet")
          .eq("id", +svaraM.email_id).maybeSingle() : null;
        m = (r && r.data) || null;
      } catch (_) {}
      svaraB.disabled = false;
      const src = m || svaraM;
      try {
        ReikningaPostur.replyTo({ sender_name: src.sender_name, from: src.sender_email, subject: src.subject,
          body_preview: (m && (m.body_preview || m.snippet)) || svaraM.snippet, message_id: m ? m.message_id : undefined, account: m ? m.account : undefined });
      } catch (e) { console.warn("[samskipti-panel] svara", e); }
    });
    // Samantektar-glugginn: örin snýst við opnun/lokun + innbyggð ritun (vistast beint).
    const noteEl = card.querySelector("._ssk-note");
    if (noteEl) {
      const car = noteEl.querySelector("._ssk-note-car");
      noteEl.addEventListener("toggle", () => { if (car) car.textContent = noteEl.open ? "▾" : "▸"; uiSetja(fid, "aths", noteEl.open); });
      const edBtn = noteEl.querySelector("._ssk-note-edit");
      if (edBtn) edBtn.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        // geymd útgáfa: sjálfvirka vistunin gæti annars skrifað eldri texta yfir nýrri frá annarri vél
        if (card.dataset.lagrad === "1") return;
        noteEl.open = true; if (car) car.textContent = "▾";
        const body = noteEl.querySelector("._ssk-note-body");
        if (!body || body.querySelector("textarea")) return;
        const cur = (f.athugasemdir || "").trim();
        body.innerHTML =
          '<textarea class="_ssk-note-ta" style="width:100%;min-height:130px;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:6px;padding:8px;font:inherit;font-size:12.5px;line-height:1.5;resize:vertical">' + esc(cur) + '</textarea>' +
          '<div style="font-size:10.5px;color:#94a3b8;margin:4px 0 0">Fyrsta línan = stutti hausinn sem sést þegar glugginn er lokaður.</div>' +
          '<div style="display:flex;gap:8px;margin-top:7px">' +
            '<button type="button" class="_ssk-note-save" style="border:1px solid #156e3a;background:linear-gradient(150deg,#2bbf6c,#0f6e3a);color:#fff;border-radius:8px;padding:5px 15px;font-size:12px;font-weight:700;cursor:pointer">Vista</button>' +
            '<button type="button" class="_ssk-note-cancel" style="border:1px solid #cbd5e1;background:#fff;color:#475569;border-radius:8px;padding:5px 14px;font-size:12px;cursor:pointer">Hætta við</button>' +
          '</div>';
        const ta = body.querySelector("._ssk-note-ta"); if (ta) ta.focus();
        // 09.09.2026 (ósk Agnars: „enginn texti má nokkurntíma tínast").
        // Samantektin vistaðist AÐEINS þegar smellt var á Vista. Fari notandinn
        // af prófílnum með reitinn opinn — eða loki flipanum — er textinn
        // horfinn. Sjálfvirk vistun (debounce + blur) sér til þess að hann sé
        // kominn á þjóninn löngu áður; Vista-takkinn er þá staðfesting, ekki
        // eina leiðin. Sama fyrirmynd og `savePlanNote` í 153-arsskodun.js.
        let sidast = (f.athugasemdir || "").trim();
        let timer = null;
        const vistaAths = async (fraTakka) => {
          clearTimeout(timer); timer = null;
          if (!ta) return false;
          const val = ta.value.trim();
          if (val === sidast) return true;                 // óbreytt → sleppa
          const c = sb();
          if (!c) {
            ta.style.outline = "2px solid #dc2626";
            ta.title = "Engin gagnagrunnstenging — textinn er enn hér, reyndu aftur.";
            if (fraTakka) alert("Engin gagnagrunnstenging — reyndu aftur eftir smástund.");
            return false;
          }
          try {
            // supabase-js kastar EKKI við villu — hún kemur í `.error`. Áður var
            // hún aldrei skoðuð, svo misheppnuð vistun leit út eins og hún hefði
            // tekist: `f.athugasemdir` var uppfært og redraw() sýndi nýja textann.
            const r = await c.from("fyrirtaeki").update({ athugasemdir: val }).eq("id", f.id);
            if (r && r.error) throw r.error;
          } catch (e) {
            ta.style.outline = "2px solid #dc2626";
            ta.title = "Samantektin vistaðist EKKI — textinn er enn hér, reyndu aftur.";
            try { if (window.logProblem) window.logProblem("samskipti_athugasemdir_save_failed", "co " + f.id + " — " + ((e && e.message) || e)); } catch (_) {}
            if (fraTakka) alert("Gat ekki vistað samantekt: " + ((e && e.message) || e));
            return false;
          }
          sidast = val;
          f.athugasemdir = val;
          if (cache[f.id]) cache[f.id]._ts = 0;            // næsta opnun sækir ferskt
          GEYMSLA.laga(f.id, d => { if (d.f) d.f.athugasemdir = val; });   // og tækisgeymslan sýnir nýja textann
          ta.style.outline = ""; ta.title = "";
          return true;
        };
        if (ta) {
          ta.addEventListener("input", () => { ta.style.outline = ""; clearTimeout(timer); timer = setTimeout(() => vistaAths(false), 700); });
          ta.addEventListener("blur", () => { clearTimeout(timer); vistaAths(false); });
        }
        const redraw = (val) => {
          const h = (val.split("\n")[0] || "").trim();
          const r = val.split("\n").slice(1).join("\n").trim();
          const hd = noteEl.querySelector("._ssk-note-head"); if (hd) hd.textContent = h;
          body.textContent = r || h;
        };
        // „Hætta við" má ALDREI henda texta sem er þegar kominn á þjóninn
        // (sjálfvirka vistunin er búin að skrifa hann) — teiknum því upp úr
        // `f.athugasemdir`, sem er nýjasta staðfesta gildið.
        body.querySelector("._ssk-note-cancel").addEventListener("click", () => redraw((f.athugasemdir || "").trim()));
        body.querySelector("._ssk-note-save").addEventListener("click", async () => {
          const btn = body.querySelector("._ssk-note-save"); if (btn) { btn.disabled = true; btn.textContent = "Vista…"; }
          const ok = await vistaAths(true);
          if (!ok) { if (btn) { btn.disabled = false; btn.textContent = "Vista"; } return; }
          redraw(ta.value.trim());
        });
      });
    }
    // „Sýna öll samskiptin" — afhjúpar það sem er þegar teiknað.
    const meira = card.querySelector("._ssk-meira");
    if (meira) meira.addEventListener("click", e => {
      e.stopPropagation();
      const box = card.querySelector("._ssk-eldri");
      if (!box) return;
      box.hidden = !box.hidden;
      meira.textContent = box.hidden
        ? "⬇ Sýna öll samskiptin (" + data.mails.length + ")"
        : "⬆ Sýna aðeins " + SYNI + " nýjustu";
      uiSetja(fid, "eldri", !box.hidden);
    });
    const bordBtn = card.querySelector("._ssk-bord");
    // 11.09.2026: Þjónustuborð 2 (368) er aðalborðið — gamla (231) aðeins ef 368 hefur ekki hlaðist.
    if (bordBtn) bordBtn.addEventListener("click", () => { try { if (window.Thjonustubord5 && window.App && App.switchView) App.switchView("bord"); else Verkbord.open(); } catch (_) {} });
    // Smella á póstrað → sækja hann allan úr email_digest og fella út.
    card.querySelectorAll("._ssk-mail").forEach(row => {
      row.addEventListener("click", async () => {
        const body = row.querySelector("._ssk-body"), caret = row.querySelector("._ssk-caret");
        const snip = row.querySelector("._ssk-snip");
        if (body.style.display !== "none") {                 // loka
          body.style.display = "none"; if (snip) snip.style.display = "";
          if (caret) caret.textContent = "▾"; return;
        }
        body.style.display = ""; if (snip) snip.style.display = "none";
        if (caret) caret.textContent = "▴";
        if (body.dataset.loaded) return;
        body.innerHTML = '<div style="color:#94a3b8;font-size:12.5px;padding:4px 0">Sæki póstinn…</div>';
        const eid = +row.dataset.eid;
        const client = sb();
        let m = null;
        if (eid && client) {
          try {
            // NB: EKKI `email_digest` beint — hún er RLS-varin og anon-reglan nær
            // aðeins yfir eldklar@eldklar.is, svo öll önnur pósthólf hefðu skilað
            // tómu. `v_samskipti_postur` (sýn, migration 2026-07-30) opnar efnið
            // aðeins fyrir pósta til/frá netfangi SKRÁÐS fyrirtækis — sama mengi
            // og spjaldið birtir; persónulegur póstur helst lokaður.
            const { data } = await client.from("v_samskipti_postur")
              .select("id,message_id,account,folder,sender_name,sender_email,to_addresses,subject,snippet,body_preview,has_attachment,attachment_names,received_at")
              .eq("id", eid).maybeSingle();
            m = data || null;
          } catch (e) { console.warn("[samskipti-panel] póstur", e); }
        }
        body.dataset.loaded = "1";
        if (!m) { body.innerHTML = '<div style="color:#b45309;font-size:12.5px;padding:4px 0">Náði ekki í efni póstsins.</div>'; return; }
        const texti = (m.body_preview || m.snippet || "").trim();
        let vidh = [];
        try { vidh = Array.isArray(m.attachment_names) ? m.attachment_names : JSON.parse(m.attachment_names || "[]"); } catch (_) {}
        body.innerHTML =
          '<div style="font-size:11.5px;color:#64748b;margin:5px 0 4px;border-top:1px solid #e2e8f0;padding-top:6px">' +
            (m.sender_email ? "Frá: " + esc(m.sender_email) + "<br>" : "") +
            (m.to_addresses ? "Til: " + esc(String(m.to_addresses).slice(0, 200)) + "<br>" : "") +
            (m.account ? "Pósthólf: " + esc(m.account) : "") +
            (vidh.length ? '<br>📎 ' + esc(vidh.join(", ")) : "") + "</div>" +
          '<div style="white-space:pre-wrap;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:9px 11px;' +
            'color:#334155;font-size:12.5px;line-height:1.55;max-height:320px;overflow:auto">' +
            (texti ? esc(texti) : '<i style="color:#94a3b8">Ekkert meira efni var sótt með þessum pósti.</i>') + "</div>" +
          (window.ReikningaPostur && ReikningaPostur.replyTo && m.sender_email
            ? '<button type="button" class="_ssk-reply" style="margin-top:7px;border:1px solid #156e3a;background:linear-gradient(150deg,#2bbf6c,#0f6e3a);color:#fff;border-radius:99px;padding:4px 13px;font-size:12px;cursor:pointer;font-weight:700">✉️ Svara</button>'
            : "");
        const rb = body.querySelector("._ssk-reply");
        if (rb) rb.addEventListener("click", ev => {
          ev.stopPropagation();
          try {
            ReikningaPostur.replyTo({ sender_name: m.sender_name, from: m.sender_email, subject: m.subject,
              body_preview: m.body_preview || m.snippet, message_id: m.message_id, account: m.account });
          } catch (e) { console.warn("[samskipti-panel] svara", e); }
        });
      });
    });
    card.querySelector("._ssk-toggle").addEventListener("click", e => {
      const full = card.querySelector("._ssk-full"), open = full.style.display === "none";
      full.style.display = open ? "" : "none";
      e.target.textContent = open ? "Loka póstsögu ▴" : "Póstsaga ▾";
      uiSetja(fid, "saga", open);
    });
    const mk = card.querySelector("._ssk-mark");
    if (mk) mk.addEventListener("click", async e => {
      if (card.dataset.lagrad === "1") return;
      e.target.disabled = true; e.target.textContent = "⏳ …";
      const ok = await markHandled(data);
      if (!ok) { e.target.disabled = false; e.target.textContent = "✓ Merkja afgreitt"; alert("Tókst ekki að merkja — reyndu aftur."); return; }
      delete cache[fid];               // ferskt við næstu opnun
      GEYMSLA.laga(fid, d => { d.handled = data.handled; });
      host.innerHTML = "";             // teikna kortið strax upp á nýtt
      render(host, fid, data);
    });
    // 10.09.2026: opin/lokuð staða lifir endurteikningu — fersk gögn, ✓ afgreitt, eða prófíllinn
    // teiknaður aftur (mælt: 357 opnar djúptengdan prófíl tvisvar og póstsagan lokaðist ~1 s eftir smell).
    const ui = uiLesa(fid);
    if (ui.saga) { const fu = card.querySelector("._ssk-full"), tg = card.querySelector("._ssk-toggle"); if (fu) fu.style.display = ""; if (tg) tg.textContent = "Loka póstsögu ▴"; }
    if (ui.eldri && meira) { const bx = card.querySelector("._ssk-eldri"); if (bx) { bx.hidden = false; meira.textContent = "⬆ Sýna aðeins " + SYNI + " nýjustu"; } }
    if (ui.aths && noteEl) noteEl.open = true;
    host.appendChild(card);
  }

  // ── HLEÐSLUKORT, BAKGRUNNSUPPFÆRSLA, ENDURTEIKNING (10.09.2026, sjá GEYMSLA) ──
  const medTima = (p, ms, vara) => Promise.race([p, new Promise(r => setTimeout(() => r(vara), ms))]);
  const eittBox = () => { try { if (window.SamskiptiEitt && SamskiptiEitt.athuga) SamskiptiEitt.athuga(); } catch (_) {} };
  const geymsluHluti = d => ({ f: d.f, mails: d.mails, beidnir: d.beidnir, handled: d.handled || "", siblings: d.siblings, sentFra: d.sentFra || "" });
  const undirskrift = d => { try { return JSON.stringify(geymsluHluti(d)); } catch (_) { return String(Math.random()); } };

  // Sami rammi og kortið (sömu flísar, svipuð hæð) svo ekkert hoppi þegar gögnin koma. Viljandi
  // EKKI ._samskipti-card: 359 skreytir aðeins alvöru kort og bíður á meðan þetta sést.
  function hledsla(host) {
    const flis = '<div class="_skx-tile _skx-bein"><b>&nbsp;</b><span>&nbsp;</span><small>&nbsp;</small></div>';
    host.innerHTML =
      '<div class="card pad _skx _skx-hledur" aria-busy="true">' +
        '<div class="_skx-head"><div class="_skx-title">💬 Samskipti</div>' +
          '<span class="_skx-uppf"><i class="_skx-snuda"></i>Sæki samskipti…</span></div>' +
        '<div class="_skx-tiles">' + flis + flis + flis + flis + "</div>" +
        '<div class="_skx-lbl">Nýjasta uppfærsla</div>' +
        '<div class="_skx-bein _skx-bein-blokk"></div>' +
      "</div>";
  }
  function villaKort(host, fid, hvad) {
    host.innerHTML =
      '<div class="card pad _skx _skx-villa">' +
        '<div class="_skx-head"><div class="_skx-title">💬 Samskipti</div>' +
          '<div class="_skx-acts"><button type="button" class="_skx-btn ljos _skx-reyna">↻ Reyna aftur</button></div></div>' +
        '<div class="_skx-txt" style="margin-top:8px;color:#9a3412">⚠ Náði ekki í samskiptin. Ekkert hefur glatast — reyndu aftur eftir smástund.</div>' +
        (hvad ? '<div class="_skx-daufur" style="font-size:11px;margin-top:4px">' + esc(hvad) + "</div>" : "") +
      "</div>";
    const b = host.querySelector("._skx-reyna");
    if (b) b.addEventListener("click", () => { hledsla(host); eittBox(); uppfaera(host, fid, null).catch(() => {}); });
  }
  function merkjaKort(card, gerd, texti, titill) {
    const head = card && card.querySelector("._skx-head"); if (!head) return null;
    let p = head.querySelector("._skx-uppf");
    if (!gerd) { if (p) p.remove(); return null; }
    if (!p) { p = document.createElement("span"); head.insertBefore(p, head.querySelector("._skx-acts")); }
    p.className = "_skx-uppf" + (gerd === "snuda" ? "" : " " + gerd);
    p.title = titill || "";
    p.innerHTML = (gerd === "snuda" ? '<i class="_skx-snuda"></i>' : "") + esc(texti);
    return p;
  }
  // Ein sókn í einu á hvert félag — fram og til baka milli prófíla tvísækir ekki.
  const _isokn = {};
  function saekja(fid) {
    if (!_isokn[fid]) _isokn[fid] = fetchData(fid)
      .then(d => { if (d && d.ok) GEYMSLA.skrifa(fid, geymsluHluti(d), d._ts); return d; })   // geymt EINU sinni á sókn
      .finally(() => { delete _isokn[fid]; });
    return _isokn[fid];
  }
  async function uppfaera(host, fid, lagrad) {
    let data = null;
    try { data = await medTima(saekja(fid), 20000, null); } catch (_) {}
    if (!data) delete _isokn[fid];                        // hangandi sókn má ekki læsa „Reyna aftur"
    const tokst = !!(data && data.ok);
    if (!document.contains(host) || host.dataset.fid !== String(fid)) return;   // farið af prófílnum á meðan
    if (!data && !sb()) { host.innerHTML = ""; return; }  // enginn klíent enn → næsta tif reynir aftur (eins og áður)
    const card = host.querySelector("._samskipti-card");
    if (tokst) {
      if (card && card.dataset.lagrad === "1" && lagrad && undirskrift(lagrad.data) === undirskrift(data)) {
        delete card.dataset.lagrad;                       // óbreytt → aflæsa og staðfesta, engin endurteiknun
        merkjaKort(card, "ok", "✓ Nýjasta staða");
        setTimeout(() => { if (!card.dataset.lagrad) merkjaKort(card, null); }, 1600);
        return;
      }
      teiknaAftur(host, fid, data);
      return;
    }
    if (card && lagrad) {                                 // geymd saga á skjánum en ferskt náðist ekki
      const p = merkjaKort(card, "villa", "⚠ Síðast sótt " + klukka(lagrad.savedAt) + " — náði ekki að uppfæra",
        "Sýni samskiptin eins og þau voru síðast sótt á þessu tæki. Smelltu til að reyna aftur.");
      if (p && !p.dataset.reyna) {
        p.dataset.reyna = "1"; p.style.cursor = "pointer";
        p.addEventListener("click", () => { merkjaKort(card, "snuda", "Uppfæri…"); uppfaera(host, fid, lagrad).catch(() => {}); });
      }
      return;
    }
    if (data && data.f) { teiknaAftur(host, fid, data, { hluti: true }); return; }   // hluti náðist — sýna og segja frá
    villaKort(host, fid, data && data.villur ? data.villur.join(" · ") : "tímamörk (20 s)"); eittBox();
  }
  // Nýtt kort í stað þess gamla — opin póstsaga, „öll samskiptin" og samantekt haldast opin.
  function teiknaAftur(host, fid, data, opt) {
    const gamalt = host.querySelector("._samskipti-card");
    if (gamalt && gamalt.querySelector("._ssk-note-ta")) return;     // aldrei henda texta sem er í ritun
    host.innerHTML = "";
    render(host, fid, data, opt);                                   // opin/lokuð staða kemur úr _opid (render)
    const card = host.querySelector("._samskipti-card");
    if (card) {
      if (opt && opt.hluti) merkjaKort(card, "villa", "⚠ Hluti gagna náðist ekki",
        "Ein eða fleiri fyrirspurnir brugðust (" + (data.villur || []).join(" · ") + ") — listinn gæti verið ófullkominn.");
    }
    eittBox();
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
    if (host && document.contains(host) && host.dataset.fid === String(fid) && host.childElementCount) {
      // 10.09.2026 — Agnar: „sometimes the Samskipti is up to the right, and sometimes down in
      // the middle — is it a different program?" Sama kort. Það festist við þá hnapparöð sem var
      // komin á FYRSTA tifi: „Merkja mikilvægt"-röðina (óskastaður 29.07) eða, væri hún ekki
      // komin, Breyta-röðina efst — og þessi snemm-útgangur hélt því þar að eilífu. Nú er það
      // FÆRT á óskastaðinn um leið og röðin birtist, án nýrrar sóknar. Ódýrt: á réttum stað er
      // aðeins borið saman við næsta systkini, og leitin hættir 15 s eftir að kortið var sett upp.
      const fyrir = host.previousElementSibling;
      if (fyrir && /Merkja mikilvægt/.test(fyrir.textContent || "")) return;
      if (Date.now() - (+host.dataset.ts || 0) > 15000) return;
      const mk2 = [...document.querySelectorAll("button")].find(b => /Merkja mikilvægt/.test(b.textContent || "") && !b.closest("._samskipti-host"));
      const rett = mk2 && mk2.parentElement;
      if (rett && rett.parentElement && !host.contains(rett)) rett.parentElement.insertBefore(host, rett.nextSibling);
      return;
    }
    // Besta akkerið (ósk Agnars 29.07): auða svæðið við hlið aðgerðahnappanna
    // („Merkja mikilvægt" o.fl.) — spjaldið fer beint fyrir aftan þá röð svo
    // punktarnir BLASI VIÐ án þess að opna Breyta-gluggann.
    let row = null;
    // Hnappur INNI í kortinu sjálfu (359: „★ Merkja mikilvægt") má ekki verða akkeri — þá hefði
    // nýja kortið lent inni í gamla hýslinum sem er fjarlægður línum neðar, og horfið.
    const mk = [...document.querySelectorAll("button")].find(b => /Merkja mikilvægt/.test(b.textContent || "") && !b.closest("._samskipti-host"));
    if (mk) row = mk.parentElement;
    if (!row) row = btn.closest('[style*="display:flex"]') || btn.parentElement;
    const anchor = row ? (row.parentElement || row) : btn.parentElement;
    if (host) host.remove();
    host = document.createElement("div");
    host.className = "_samskipti-host"; host.dataset.fid = fid; host.dataset.ts = String(Date.now());
    Object.keys(_opid).forEach(k => { if (k !== String(fid)) delete _opid[k]; });   // annað félag → sjálfgefin staða
    (row && row.parentElement ? row.parentElement : anchor).insertBefore(host, row ? row.nextSibling : null);
    // 10.09.2026 — minni (60 s) → tækisgeymsla → hleðslukort. Tif-lásnum er sleppt um leið og
    // eitthvað er komið á skjáinn; ferska sóknin gengur í bakgrunni (uppfaera).
    const minni = cache[fid] && Date.now() - cache[fid]._ts < 60000 ? cache[fid] : null;
    if (minni) { render(host, fid, minni); eittBox(); return; }
    const lagrad = await GEYMSLA.lesa(fid);
    if (!document.contains(host) || host.childElementCount) return;
    let notad = null;
    if (lagrad) {
      try { render(host, fid, lagrad.data, { lagrad: lagrad.savedAt }); notad = lagrad; eittBox(); }
      catch (e) { console.warn("[samskipti-panel] geymd útgáfa ónothæf", e); host.innerHTML = ""; }
    }
    if (!notad) hledsla(host);
    uppfaera(host, fid, notad).catch(e => console.warn("[samskipti-panel] uppfæra", e));
  }

  // ── Rekstrarfélags-síðan (#view-rekstrarfelog, patch 175) ─────────────────
  // Sama spjald þar: netföng lesin úr „Upplýsingar um rekstrarfélag"-kassanum,
  // póstsagan sótt eftir LÉNI félagsins (öll netföng þess) beint úr email_digest.
  const RU = "https://osfdzskyvisifcwyjkuk.supabase.co";
  const RK = "sb_publishable_YVpznM5EK01qOdevQwOcIg_rMjTkT7f";
  const rfCache = {};
  // 2026-07-30 — RÓTIN að „Heimaleiga er tóm": þetta spjald sótti póstinn BEINT
  // úr `email_digest` eftir LÉNI með opinbera lyklinum. `email_digest` er
  // RLS-varið, svo svarið er villu-HLUTUR (`{code:"42501",…}`) en ekki fylki →
  // `.map is not a function` (mælt á live: „[samskipti-rf] TypeError …"), catch
  // gleypti það og listinn varð tómur → „Engir póstar fundust á @heimaleiga.is"
  // þótt félagið ætti 66 pósta. Prófílkortið notaði alltaf `felag_samskipti`
  // og virkaði — þess vegna mældist boxið í lagi þar en ekki hér.
  //
  // Núna les RF-spjaldið SÖMU sönnunar-sýn og hinir tveir staðirnir
  // (Þjónustuborðið + prófílkortið): `felag_samskipti` eftir customer_base_id
  // byggingarinnar. Þar með gildir líka deildra-pósthólfa reglan (umboðsmanna-
  // netföng dreifast ekki á öll félög) — lén-leitin hunsaði hana alveg.
  // Lénið er aðeins haft sem SÍÐASTA úrræði (félag án nokkurrar base-tengingar).
  // Bygging → base kort, fyllt EINU SINNI fyrir ALLAR byggingar á síðunni.
  // Áður var þetta sér-fyrirspurn í hvert sinn sem félag var opnað, og hún sat
  // fremst í þriggja-þrepa keðju (bygging→base, svo póstur, svo ✓-staða) svo
  // hvert opnun kostaði þrjár ferðir fram og til baka. Nú er hún ein sameiginleg
  // og heit eftir fyrsta félag — hin félögin sleppa henni alveg.
  const BASEMAP = {};
  async function fyllaBasemap(coids) {
    const vantar = coids.filter(id => !(id in BASEMAP));
    if (!vantar.length) return;
    const client = sb(); if (!client) return;
    // Sækja fyrir ALLA sýnilega byggingar-hnappa á síðunni í sömu ferð, ekki
    // bara þá sem beðið var um — næstu félög verða þá án fyrirspurnar.
    let allir = vantar;
    try {
      const v = document.getElementById("view-rekstrarfelog");
      if (v) {
        const s = new Set(vantar);
        [...v.querySelectorAll("[data-coid]")].forEach(a => { const n = +a.getAttribute("data-coid"); if (n > 0 && !(n in BASEMAP)) s.add(n); });
        allir = [...s];
      }
    } catch (_) {}
    try {
      const { data } = await client.from("fyrirtaeki").select("id,customer_base_id").in("id", allir);
      (Array.isArray(data) ? data : []).forEach(f => { BASEMAP[f.id] = f.customer_base_id || null; });
      allir.forEach(id => { if (!(id in BASEMAP)) BASEMAP[id] = null; });
    } catch (e) { console.warn("[samskipti-rf] basemap:", e && e.message || e); }
  }
  async function rfMails(dom, coids) {
    // 5 mín skyndiminni — síðan endurteiknast ört (realtime-refresh) og spjaldið
    // þarf að birtast SAMSTUNDIS aftur, ekki bíða eftir nýrri póstsókn í hvert sinn.
    const key = (coids && coids.length) ? "co:" + coids.slice().sort((a, b) => a - b).join(",") : "dom:" + dom;
    if (rfCache[key] && Date.now() - rfCache[key]._ts < 300000) return rfCache[key].m;
    const asArray = x => Array.isArray(x) ? x : [];
    let m = [];
    try {
      const client = sb();
      let bases = [];
      if (coids && coids.length && client) {
        await fyllaBasemap(coids);
        bases = [...new Set(coids.map(id => BASEMAP[id]).filter(Boolean))];
      }
      if (bases.length && client) {
        const { data, error } = await client.from("felag_samskipti")
          .select("received_at,sender_name,sender_email,subject,snippet,is_question,fra_okkur,fyrirtaeki_nafn")
          .in("customer_base_id", bases).order("received_at", { ascending: false }).limit(12);
        if (error) throw new Error(error.message);
        m = asArray(data);
      } else if (dom) {
        // Fallback: félag án base — lénleit, en NÚ með fylkis-vörn svo villu-
        // hlutur kasti ekki heldur skili tómum lista með skýrri console-línu.
        const r = await fetch(RU + "/rest/v1/email_digest?select=received_at,sender_name,sender_email,subject,snippet,is_question" +
          "&or=(sender_email.ilike.*%40" + encodeURIComponent(dom) + ",to_addresses.ilike.*" + encodeURIComponent(dom) + "*)" +
          "&order=received_at.desc&limit=8", { headers: { apikey: RK, Authorization: "Bearer " + RK } });
        const j = await r.json();
        if (!Array.isArray(j)) console.warn("[samskipti-rf] lén-leit skilaði ekki fylki:", j && (j.message || j.code || j));
        m = asArray(j).map(x => ({ ...x, fra_okkur: /eldklar/i.test(x.sender_email || "") }));
      }
    } catch (e) { console.warn("[samskipti-rf] póstsókn:", e && e.message || e); }
    rfCache[key] = { _ts: Date.now(), m };
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
    // Byggingarnar (data-coid) — reiknaðar ÁÐUR en vörnin metur hvort megi
    // sleppa endurteikningu, því þær eru bæði póst-leiðin og ✓-lyklarnir.
    const coids = [...new Set([...info.parentNode.querySelectorAll("[data-coid]")]
      .map(a => +a.getAttribute("data-coid")).filter(n => n > 0))];
    const coidKey = coids.slice().sort((a, b) => a - b).join(",");
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
      //
      // 2026-07-30 — SEINNI HELMINGUR „Heimaleiga er tóm": 175 teiknar líkamann
      // í þrepum, svo FYRSTA tifið hittir stundum á `._rf_info` ÁÐUR en
      // byggingataflan er komin. Þá voru engar `data-coid` → engin base →
      // spjaldið fékk tómt, merkti sig `done` og vörnin sleppti ÖLLUM
      // endurtilraunum að eilífu. Byggingalykillinn er því hluti af „same":
      // fjölgi byggingunum (eða komi þær loksins) er teiknað upp á nýtt.
      const same = card.dataset.dom === (dom || "") && card.dataset.coids === coidKey && document.contains(card);
      const busy = card.dataset.state === "loading" && Date.now() - (+card.dataset.ts || 0) < 15000;
      if (same && (card.dataset.state === "done" || busy)) return;
      card.remove(); card = null;
    }
    card = document.createElement("div");
    card.className = "_samskipti-rf"; card.dataset.dom = dom || ""; card.dataset.coids = coidKey;
    card.dataset.state = "loading"; card.dataset.ts = String(Date.now());
    card.style.cssText = "margin:0 0 14px;border-left:4px solid #6366f1;background:var(--surface,#fff);border:1px solid var(--brd,#e2e8f0);border-left:4px solid #6366f1;border-radius:10px;padding:12px 14px;font-size:13px";
    if (slot) slot.appendChild(card); else info.parentNode.insertBefore(card, info.nextSibling);
    if (!dom && !coids.length) {
      card.innerHTML = '<div style="color:#94a3b8">💬 Engin netföng eða byggingar á félaginu — skráðu netfang til að sjá póstsögu.</div>';
      card.dataset.state = "done"; return;
    }
    card.innerHTML = '<div style="font-weight:800;font-size:11px;letter-spacing:.06em;color:#4f46e5">💬 SAMSKIPTASAGA' +
      (dom ? " (@" + esc(dom) + ")" : "") + '</div><div style="color:#94a3b8;margin-top:4px">Sæki póstsögu…</div>';
    // Póstsagan og ✓-staðan eru ÓHÁÐAR — sóttar SAMHLIÐA. Áður beið
    // ✓-fyrirspurnin eftir póstinum að óþörfu (ein ferð í viðbót í röð).
    const [mails, handled] = await Promise.all([
      rfMails(dom, coids),
      (async () => {
        if (!coids.length) return "";
        try {
          const hr = await fetch(RU + "/rest/v1/samskipti_stada?select=handled_at&fyrirtaeki_id=in.(" + coids.join(",") + ")&order=handled_at.desc&limit=1",
            { headers: { apikey: RK, Authorization: "Bearer " + RK } });
          const hj = await hr.json();
          return (Array.isArray(hj) && hj[0] && hj[0].handled_at) || "";
        } catch (e) { console.warn("[samskipti-rf] handled", e); return ""; }
      })()
    ]);
    // 175 gæti hafa endurteiknað á meðan sótt var — þá er þetta spjald laust
    // og næsta tif býr til nýtt (annars skrifuðum við í ósýnilegt tré).
    if (!document.contains(card)) return;
    const lastUs = mails.filter(m => m.fra_okkur).map(m => m.received_at).sort().pop() || "";
    // Sama skurðregla og cutOf(): spurning er opin aðeins ef hún er nýrri en
    // BÆÐI síðasta frá-okkur sending OG ✓-merkingin.
    const cut = lastUs > handled ? lastUs : handled;
    const openQ = mails.filter(m => m.is_question && !m.fra_okkur && m.received_at > cut).length;
    const top = mails[0];
    const mailsHtml = mails.map(m =>
      '<div style="padding:6px 9px;margin:4px 0;border-radius:8px;background:' + (m.is_question && !m.fra_okkur ? "#fef2f2;border:1px solid #fecaca" : "var(--surface2,#f8fafc)") + '">' +
      '<div style="font-size:11px;color:#64748b">' + fmtD(m.received_at) + " · " + esc(m.fra_okkur ? "Slökkvitæki ehf" : (m.sender_name || m.sender_email)) +
      (m.is_question && !m.fra_okkur ? ' · <b style="color:#dc2626">spurning</b>' : "") + "</div>" +
      '<div style="font-weight:600">' + esc(m.subject || "(ekkert efni)") + "</div>" +
      '<div style="color:#64748b;font-size:12px">' + esc((m.snippet || "").slice(0, 180)) + "</div></div>").join("") ||
      '<div style="color:#94a3b8;padding:4px 0">Engir póstar fundust' + (dom ? " á @" + esc(dom) : "") + ".</div>";
    card.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">' +
      '<div style="font-weight:800;font-size:11px;letter-spacing:.06em;color:#4f46e5">💬 SAMSKIPTASAGA ' +
      (dom ? '<span style="font-weight:400;color:#94a3b8">@' + esc(dom) + "</span>" : "") + "</div>" +
      '<div style="display:flex;gap:7px;align-items:center">' +
      (openQ > 0 && coids.length
        ? '<button type="button" class="_ssk-rf-mark" style="border:1px solid #156e3a;background:linear-gradient(150deg,#2bbf6c,#0f6e3a);color:#fff;border-radius:99px;padding:3px 12px;font-size:12px;cursor:pointer;font-weight:700">✓ Merkja afgreitt</button>'
        : (handled && !openQ ? '<span style="color:#0f6e3a;font-weight:700;font-size:11.5px">✓ Afgreitt</span>' : "")) +
      '<button type="button" class="_ssk-rf-toggle" style="border:1px solid #c7d2fe;background:#eef2ff;color:#4338ca;border-radius:99px;padding:3px 12px;font-size:12px;cursor:pointer;font-weight:700">Opna ▾</button></div></div>' +
      '<div style="margin-top:5px">' +
      (top ? '<div style="display:flex;gap:8px;line-height:1.45"><span>✉️</span><span>' + fmtD(top.received_at) + " — " + esc(top.subject || "(ekkert efni)") +
        ' <span style="color:#94a3b8">(' + (top.fra_okkur ? "frá okkur" : "frá " + esc(top.sender_name || top.sender_email)) + ")</span></span></div>"
        : '<div style="color:#94a3b8">Engir póstar fundust' + (dom ? " á @" + esc(dom) : "") + ".</div>") +
      '<div class="_ssk-rf-warn">' +
      (openQ ? '<div style="display:flex;gap:8px;margin-top:3px"><span>⚠️</span><span style="color:#dc2626;font-weight:700">' + openQ + " ósvöruð spurning" + (openQ > 1 ? "ar" : "") + " í pósti</span></div>" : "") +
      "</div></div>" +
      '<div class="_ssk-rf-full" style="display:none;margin-top:9px;border-top:1px dashed #e2e8f0;padding-top:8px">' + mailsHtml + "</div>";
    card.querySelector("._ssk-rf-toggle").addEventListener("click", e => {
      const full = card.querySelector("._ssk-rf-full"), open = full.style.display === "none";
      full.style.display = open ? "" : "none";
      e.target.textContent = open ? "Loka ▴" : "Opna ▾";
    });
    const rfMk = card.querySelector("._ssk-rf-mark");
    if (rfMk) rfMk.addEventListener("click", async e => {
      e.target.disabled = true; e.target.textContent = "⏳ …";
      const nu = new Date().toISOString();
      let who = ""; try { who = localStorage.getItem("ky_me") || localStorage.getItem("bs_employee") || ""; } catch (_) {}
      const rows = coids.map(id => ({ fyrirtaeki_id: id, handled_at: nu, handled_by: who, updated_at: nu }));
      try {
        const wr = await fetch(RU + "/rest/v1/samskipti_stada?on_conflict=fyrirtaeki_id", {
          method: "POST",
          headers: { apikey: RK, Authorization: "Bearer " + RK, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
          body: JSON.stringify(rows)
        });
        if (!wr.ok) throw new Error("HTTP " + wr.status);
      } catch (err) {
        console.warn("[samskipti-rf] mark", err);
        e.target.disabled = false; e.target.textContent = "✓ Merkja afgreitt";
        alert("Tókst ekki að merkja — reyndu aftur."); return;
      }
      // Uppfæra spjaldið á staðnum (engin endurteiknun þarf): viðvörun burt,
      // hnappur → grænt ✓. Prófílkortin (cache) sjá nýju stöðuna næst.
      const warn = card.querySelector("._ssk-rf-warn"); if (warn) warn.innerHTML = "";
      e.target.outerHTML = '<span style="color:#0f6e3a;font-weight:700;font-size:11.5px">✓ Afgreitt</span>';
      Object.keys(cache).forEach(k => { delete cache[k]; });
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
    // 06.09.2026: hangi sókn (t.d. Supabase-pottstífla, 504) sat _running fast að eilífu → aldrei spjald aftur í flipanum;
    // öryggisventill sleppir lásnum eftir 20 s.
    const _vent = setTimeout(() => { _running = false; }, 20000);
    Promise.resolve()
      .then(() => decorate())
      .catch(e => console.warn("[samskipti-panel]", e))
      .then(() => decorateRF())
      .catch(e => console.warn("[samskipti-rf]", e))
      .then(() => { clearTimeout(_vent); _running = false; });
  }
  function schedule() { if (_timer) return; _timer = setTimeout(runNow, 250); }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  setInterval(schedule, 3000);            // öryggisnet ef ekkert hreyfist
  schedule();
  console.log("[samskipti-panel] v3 installed (prófílar + rekstrarfélög · þrot-varið tif)");
})();
