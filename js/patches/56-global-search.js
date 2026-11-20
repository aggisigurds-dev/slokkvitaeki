/* === ALHEIMSLEIT v2 — finnur OG opnar (Ctrl/Cmd+K) ===
 *
 * Agnar 20.11.2026: „Eg bara veit ekkert hvert allt fer eda hvar er, eg finn ekkert."
 * Mælt sama dag á lifandi vef: 63 hnappar í hliðarstikunni, 12 hamir á Þjónustuborðinu
 * og sex stakar síður. Leitin (v1) var til og fann hlutina — en gerði tvennt rangt:
 *
 *   1. SMELLUR OPNAÐI EKKI HLUTINN. openResult kallaði aðeins App.switchView(view),
 *      svo „Hótel Varmaland" skilaði þér á LISTANN með 1.377 félögum. Þú fannst
 *      niðurstöðuna og týndir henni aftur í sama smelli.
 *   2. HÚN LEITAÐI EKKI AÐ ÞVÍ SEM TÝNIST. Aðeins fyrirtæki, sölur, verkbeiðnir,
 *      tæki og tilboð — engin mál af borðinu, engin skjöl, og ENGAR SÍÐUR. Spurningin
 *      „hvar er Kröfu yfirlitið" átti sér hvergi svar.
 *
 * v2 lagar hvort tveggja:
 *   • Hver niðurstaða opnast á sínum stað um djúptengi 235 (#company/<id>, #sale/<num>,
 *     #unit/<serial>, #verkbeidni/<num>), _openCompanySafe (mapfix) eða Bord368.opnaMal.
 *   • Síður eru lesnar LIFANDI úr viðmótinu: .vnav-btn úr hliðarstikunni, hamirnir úr
 *     skugga-rót borðsins ([data-t5="mode"]) og stöku síðurnar hér fyrir neðan. Nýr
 *     hnappur í stikunni ratar sjálfkrafa í leitina — enginn listi til að halda við.
 *   • Tómur reitur sýnir ALLAR síður strax. Leitin er þá kortið yfir kerfið.
 *   • Íslensk stafsetning er fyrirgefin á síðunum: „thjonustubord", „krofu", „bokhald"
 *     hitta. Agnar skrifar oftast án broddstafa úr símanum.
 *   • Á síma (<901px) er fastur leitarhnappur neðst til hægri. Hliðarstikustíllinn (391)
 *     á aðeins við frá 901px, svo þar var hnappurinn 26 px og ósýnilegur í reynd.
 *
 * Opnunarleiðir eru allar til fyrir: þetta býr enga nýja til og breytir engri síðu.
 */
(() => {
  if (window.__globalSearchInstalled) return;
  window.__globalSearchInstalled = true;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const getSB = () => window.DB && window.DB.sb;

  // Eining getur verið til en ekki á borði þess sem situr við það (opnaEiningu skilar false).
  // Þá á að SEGJA það — þögn er einmitt það sem gerði leitina ónothæfa.
  const toastEkki = t => {
    const skilabod = '„' + t + '“ er ekki á borðinu þínu — bættu henni við með „Velja einingar“.';
    try { if (window.Bord368 && typeof Bord368.toast === 'function') { Bord368.toast(skilabod); return; } } catch (_) {}
    try { alert(skilabod); } catch (_) {}
  };

  // Broddstafir og sérstafir burt svo „thjonustubord" hitti „Þjónustuborð".
  const norm = s => String(s == null ? '' : s).toLowerCase()
    .replace(/[áà]/g, 'a').replace(/[éè]/g, 'e').replace(/[íì]/g, 'i').replace(/[óò]/g, 'o')
    .replace(/[úù]/g, 'u').replace(/[ýỳ]/g, 'y').replace(/ð/g, 'd').replace(/þ/g, 'th')
    .replace(/æ/g, 'ae').replace(/ö/g, 'o').replace(/[^a-z0-9]+/g, ' ').trim();

  // ── stakar síður (ekki hnappur í stikunni) ────────────────────────────────
  const STAKAR = [
    { l: 'Afgreiðsla — tilbúin verk', u: '/afgreidsla.html', o: 'samthykkt verk takki' },
    { l: 'Kúnnaskrá', u: '/kunnaskra.html', o: 'vidskiptavinir leit kennitala' },
    { l: 'Póstsvörun', u: '/postsvorun.html', o: 'tolvupostur svar' },
    { l: 'Hreyfingaryfirlit', u: '/hreyfingaryfirlit.html', o: 'bokhald faerslur' },
    { l: 'Uppgjörslisti', u: '/uppgjorslisti.html', o: 'uppgjor' },
    { l: 'Brunahólf — stjórnborð', u: 'https://brunaholf.netlify.app/', o: 'hub bh jarvis' },
    { l: 'Brunahólf — Kerfis-kort', u: 'https://brunaholf.netlify.app/kerfiskort.html', o: 'gagnaskra tengingar skjol stadir' }
  ];

  // ── síðurnar, lesnar lifandi úr viðmótinu ─────────────────────────────────
  function sidur() {
    const ut = [];
    // 1) hliðarstikan
    document.querySelectorAll('.vnav-btn').forEach(b => {
      const t = (b.textContent || '').replace(/\s+/g, ' ').trim().replace(/\s*\d+$/, '');
      if (!t || t.length > 40) return;
      ut.push({ type: 'sida', icon: '→', title: t, meta: 'Hliðarstika', key: norm(t), opna: () => b.click() });
    });
    // 2) hamir Þjónustuborðsins. Listinn kemur úr 368 (hamir()) en ekki af skjánum: á ferskri hleðslu
    //    er skugga-rótin ekki tengd (368 rot() kallast fyrst úr render()), og þá væru hamirnir ekki
    //    í leitinni fyrr en borðið hefði verið opnað einu sinni — þvert á „tómur reitur sýnir allt".
    try {
      const H = window.Bord368 && window.Bord368.hamir;
      const listi = typeof H === 'function' ? H() : [];
      listi.forEach(h => {
        if (!h || !h.k) return;
        const t = String(h.l || h.k).replace(/\s+/g, ' ').trim().replace(/\s*\d+$/, '');
        ut.push({
          type: 'sida', icon: '→', title: t, meta: 'Hamur á Þjónustuborðinu', key: norm(t + ' ' + h.k),
          opna: () => aBordid(() => {
            if (!(window.Bord368 && typeof Bord368.opnaHam === 'function')) return false;
            if (!Bord368.opnaHam(h.k)) toastEkki(t);
          })
        });
      });
    } catch (_) {}
    // 3) einingar borðsins (Dagskrá, Pósthólf, Tilbúin verk …) — líka þær sem eru í öðrum ham.
    //    opnaEiningu skiptir sjálft um ham ef þarf og skilar false sé einingin ekki á borði þess sem situr við það.
    try {
      const E = window.Bord368 && window.Bord368.einingar;
      if (typeof E === 'function') E().forEach(e => ut.push({
        type: 'sida', icon: '→', title: e.t, meta: 'Eining á Þjónustuborðinu', key: norm(e.t + ' ' + e.k),
        opna: () => aBordid(() => {
          if (!(window.Bord368 && typeof Bord368.opnaEiningu === 'function')) return false;
          if (!Bord368.opnaEiningu(e.k)) toastEkki(e.t);
        })
      }));
    } catch (_) {}
    // 4) stakar síður
    STAKAR.forEach(s => ut.push({
      type: 'sida', icon: '→', title: s.l, meta: /^https?:/.test(s.u) ? 'Annar vefur' : 'Sér síða',
      key: norm(s.l + ' ' + s.o), opna: () => { location.href = s.u; }
    }));
    // sama heiti tvisvar (stikan + hamur) — fyrra eintakið stendur
    const sed = new Set();
    return ut.filter(r => { const k = r.type + '|' + r.key; if (sed.has(k)) return false; sed.add(k); return true; })
      .map(r => { r.key2 = r.key.replace(/ /g, ''); return r; });
  }

  let SIDUR = [];
  let results = [];
  let selectedIdx = 0;
  let gildi = '';
  let keyrsla = 0;

  if (!document.getElementById('gs-style')) {
    const s = document.createElement('style');
    s.id = 'gs-style';
    s.textContent = `
      .gs-overlay{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.5);display:none;align-items:flex-start;justify-content:center;padding:80px 16px 16px}
      .gs-overlay.show{display:flex}
      .gs-modal{background:#fff;border-radius:12px;width:600px;max-width:100%;box-shadow:0 24px 64px rgba(0,0,0,.3);overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 96px)}
      .gs-input{width:100%;padding:18px 20px;border:none;font-size:17px;outline:none;border-bottom:1px solid #e2e8f0;box-sizing:border-box;color:#0f172a;background:#fff}
      .gs-results{overflow:auto;flex:1 1 auto;-webkit-overflow-scrolling:touch}
      .gs-group{padding:8px 0;border-top:1px solid #f1f5f9}
      .gs-group:first-child{border-top:none}
      .gs-group-hd{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#64748b;padding:6px 20px}
      .gs-item{padding:11px 20px;cursor:pointer;font-size:13.5px;color:#0f172a;line-height:1.35}
      .gs-item:hover,.gs-item.selected{background:#eff6ff;color:#1d4ed8}
      .gs-item .meta{font-size:11px;color:#94a3b8;margin-top:2px}
      .gs-empty{padding:40px 20px;text-align:center;color:#94a3b8;font-size:13px}
      .gs-hint{padding:8px 20px;font-size:11px;color:#94a3b8;background:#f8fafc;display:flex;justify-content:space-between;gap:10px;flex:0 0 auto}
      .gs-hint kbd{background:#e2e8f0;padding:1px 5px;border-radius:3px;font-family:monospace;font-size:10px}
      /* Síma- og spjaldútlit: 391 klæðir hnappinn aðeins frá 901px, svo hér fyrir neðan var hann
         óstílaður og sat AFTAST í stikunni — á eftir 63 hnöppum. Hann er nú settur næst á eftir
         merkinu (sjá ensureBtn) og lítur út eins og leitarreitur.
         Enginn fljótandi hnappur: hægra hornið ber nú þegar sex fasta hnappi og #_ad-fab (z-index
         2147481000) lá beint ofan á lúpunni — mælt á 375px 20.11.2026. Sjöundi hnappurinn þar
         hefði verið ósýnilegur og í vegi. */
      @media (max-width:900.98px){
        .gs-overlay{padding-top:24px}
        .gs-hint{display:none}
        /* ENGIN `order` hér: DOM-staðan (næst á eftir .brand) ræður. `order:-1` lyfti reitnum upp
           fyrir merkið, þar sem #_mnav_btn (hamborgarinn, fastur á top:9 með z-index 9999) liggur
           ofan á honum — mælt á 375px: smellur lenti á hamborgaranum, ekki á leitinni. */
        #gs-trigger{flex:none;width:auto;min-height:44px;margin:8px 10px 4px;padding:0 12px;gap:9px;
          background:#1d1f25;border:1px solid rgba(0,0,0,.6);border-radius:10px;color:#9aa3b2;
          font:400 15px/1 inherit;text-align:left;box-shadow:inset 0 2px 5px rgba(0,0,0,.45)}
        #gs-trigger span{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        #gs-trigger kbd{display:none}
      }
    `;
    document.head.appendChild(s);
  }

  function ensureModal() {
    if (document.getElementById('gs-modal')) return;
    const m = document.createElement('div');
    m.id = 'gs-modal';
    m.className = 'gs-overlay';
    m.innerHTML = `<div class="gs-modal">
      <input class="gs-input" id="gs-input" placeholder="Leita eða fara á…" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="go">
      <div class="gs-results" id="gs-results"></div>
      <div class="gs-hint"><span><kbd>↑</kbd> <kbd>↓</kbd> Velja · <kbd>Enter</kbd> Opna · <kbd>Esc</kbd> Loka</span><span>Ctrl+K</span></div>
    </div>`;
    m.onclick = e => { if (e.target === m) close(); };
    document.body.appendChild(m);
    const inp = document.getElementById('gs-input');
    let to = null;
    inp.addEventListener('input', () => {
      gildi = inp.value;
      synaStrax();                                  // síðurnar svara á sama augnabliki
      clearTimeout(to);
      to = setTimeout(() => leitaGogn(gildi), 220); // gögnin koma á eftir
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
      // Math.max(0, …): á tómum lista varð selectedIdx -1 og Enter gerði ekkert þar til ýtt var aftur.
      else if (e.key === 'ArrowDown') { e.preventDefault(); selectedIdx = Math.max(0, Math.min(selectedIdx + 1, results.length - 1)); renderResults(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); renderResults(); }
      else if (e.key === 'Enter') { e.preventDefault(); openResult(results[selectedIdx]); }
    });
  }

  function open() {
    ensureModal();
    SIDUR = sidur();
    gildi = '';
    document.getElementById('gs-modal').classList.add('show');
    const inp = document.getElementById('gs-input');
    inp.value = '';
    synaStrax();
    setTimeout(() => inp.focus(), 50);
  }
  function close() {
    const m = document.getElementById('gs-modal');
    if (m) { m.classList.remove('show'); document.getElementById('gs-input').value = ''; }
    keyrsla++;                       // svar sem er á leiðinni má ekki teikna í lokaðan glugga
    results = []; selectedIdx = 0; gildi = '';
  }

  // ── síðurnar: svara áður en nokkuð er sótt ────────────────────────────────
  // Íslenskan beygist og Agnar skrifar greininn með: „Þjonustubordid", „bidstofan", „reikningana".
  // Mælt í loftinu 20.11.2026: „Þjonustubordid" skilaði ENGU af því að orðið er LENGRA en heitið sem
  // leitað er í. Því má sleppa tveimur stöfum aftan af orði sem er 6 stafir eða lengra.
  // Endingarnar eru mislangar („-ið" 2, „-urnar" 4, og stofninn sjálfur breytist: kröfu → kröfur),
  // svo reynt er að stytta orðið aftan frá — aldrei meira en fjóra stafi og aldrei niður fyrir fjóra.
  // key2 er heitið án bila: „Kerfis-kort" verður „kerfiskort", sem er það sem hann slær inn.
  const hittir = (r, w) => {
    if (r.key.indexOf(w) > -1 || r.key2.indexOf(w) > -1) return true;
    const minnst = Math.max(4, w.length - 4);
    for (let i = w.length - 1; i >= minnst; i--) {
      const s = w.slice(0, i);
      if (r.key.indexOf(s) > -1 || r.key2.indexOf(s) > -1) return true;
    }
    return false;
  };

  function sidurFyrir(q, listi) {
    const L = listi || SIDUR;
    const n = norm(q);
    if (!n) return L.slice();
    const ord = n.split(' ').filter(Boolean);
    return L
      .map(r => {
        if (!ord.every(o => hittir(r, o))) return null;
        // Röðun: nákvæmt heiti → heiti sem byrjar á orðinu → orðið stendur óstytt í heitinu →
        // aðeins stytt orð hitti. Án síðasta þrepsins skilaði „kerfiskort" fyrst „Brunakerfis skoðun"
        // (hitti á stytt „kerfis") en ekki „Brunahólf — Kerfis-kort" sem geymir orðið heilt.
        const heilt = ord.every(o => r.key.indexOf(o) > -1 || r.key2.indexOf(o) > -1);
        return { r, v: r.key === n ? 0 : r.key.indexOf(n) === 0 ? 1 : heilt ? 2 : 3 };
      })
      .filter(Boolean)
      .sort((a, b) => a.v - b.v || a.r.title.length - b.r.title.length)
      .map(x => x.r);
  }

  function synaStrax() {
    results = sidurFyrir(gildi);
    selectedIdx = 0;
    renderResults(gildi.trim().length >= 2 ? 'Leita í gögnunum…' : '');
  }

  // ── gögnin ────────────────────────────────────────────────────────────────
  async function leitaGogn(q) {
    // Teljarinn er hækkaður FYRST. Væri það gert eftir „of stutt"-vörðinn gæti svar við „hotel"
    // skilað sér eftir að notandinn strokaði niður í „h" (sú leit fer aldrei í gegn) og teiknað
    // niðurstöður sem eiga ekkert skylt við það sem stendur í reitnum — mælt í rýni 20.11.2026.
    const minn = ++keyrsla;
    if (!q || q.trim().length < 2) return;
    const SB = getSB();
    if (!SB) { renderResults(''); return; }
    const safe = async p => { try { return await p; } catch (e) { return { data: [] }; } };
    // „Benna, Fiskislóð" og „Hótel (Borgarnes)" skiluðu ENGU (mælt 20.11.2026): kommur og svigar voru
    // hreinsuð burt — þau mega ekki fara óbreytt í PostgREST-segðina — og eftir stóð tvöfalt bil sem
    // ilike fann hvergi. Orðin eru nú tengd með % svo þau megi standa í þessari röð með hverju sem er á milli.
    const like = q.trim().replace(/[%,()*"']/g, ' ').split(/\s+/).filter(Boolean).join('%');
    if (!like) { renderResults(''); return; }
    const [co, mal, inv, doc, job, dev, qt] = await Promise.all([
      safe(SB.from('fyrirtaeki').select('id,nafn,kennitala,heimilisfang').or(`nafn.ilike.%${like}%,kennitala.ilike.%${like}%,heimilisfang.ilike.%${like}%`).limit(6)),
      safe(SB.from('thjonustubeidni').select('id,title,customer_nafn,status,assigned_to').is('deleted_at', null).is('archived_at', null)
        .or(`title.ilike.%${like}%,summary.ilike.%${like}%,customer_nafn.ilike.%${like}%`).limit(6)),
      safe(SB.from('solur').select('id,num,customer_nafn,samtals').or(`num.ilike.%${like}%,customer_nafn.ilike.%${like}%`).limit(6)),
      safe(SB.from('customer_documents').select('id,file_name,customer_name,year,doc_type,fyrirtaeki_id').or(`file_name.ilike.%${like}%,customer_name.ilike.%${like}%`).limit(6)),
      safe(SB.from('verkbeidnir').select('id,num,customer,status').or(`num.ilike.%${like}%,customer.ilike.%${like}%`).limit(5)),
      safe(SB.from('uttaeki').select('id,serial,client,type').or(`serial.ilike.%${like}%,client.ilike.%${like}%`).limit(5)),
      safe(SB.from('tilbod').select('id,num,company_nafn,samtals').or(`num.ilike.%${like}%,company_nafn.ilike.%${like}%`).limit(4))
    ]);
    if (minn !== keyrsla) return;              // nýrri innsláttur kom á meðan
    const kr = n => (n == null ? '' : Math.round(n).toLocaleString('is-IS') + ' kr');
    const r = sidurFyrir(gildi);
    (co.data || []).forEach(x => r.push({ type: 'co', icon: '🏢', title: x.nafn, meta: x.kennitala || x.heimilisfang || '', opna: () => opnaFyrirtaeki(x.id) }));
    (mal.data || []).forEach(x => r.push({ type: 'mal', icon: '📋', title: x.title || '#' + x.id, meta: [x.customer_nafn, x.assigned_to, x.status].filter(Boolean).join(' · '), opna: () => opnaMal(x.id) }));
    (inv.data || []).forEach(x => r.push({ type: 'inv', icon: '📄', title: (x.num || '#' + x.id) + ' — ' + (x.customer_nafn || ''), meta: kr(x.samtals), opna: () => opnaSolu(x) }));
    // 640 skjöl af 4.220 bera ekkert file_name — „Skjal #10103" segir ekkert, svo tegund og ár taka við.
    (doc.data || []).forEach(x => r.push({
      type: 'doc', icon: '📁',
      title: x.file_name || [x.customer_name, x.doc_type, x.year].filter(Boolean).join(' · ') || 'Skjal #' + x.id,
      meta: [x.customer_name, x.doc_type, x.year].filter(Boolean).join(' · '), opna: () => opnaSkjal(x)
    }));
    (job.data || []).forEach(x => r.push({ type: 'job', icon: '🔧', title: (x.num || '#' + x.id) + ' — ' + (x.customer || ''), meta: x.status || '', opna: () => opnaVerkbeidni(x) }));
    (dev.data || []).forEach(x => r.push({ type: 'dev', icon: '🔥', title: (x.serial || '#' + x.id) + ' — ' + (x.type || ''), meta: x.client || '', opna: () => opnaTaeki(x) }));
    (qt.data || []).forEach(x => r.push({ type: 'qt', icon: '📝', title: (x.num || '#' + x.id) + ' — ' + (x.company_nafn || ''), meta: kr(x.samtals), opna: () => { sv('tilbod'); } }));
    results = r;
    if (selectedIdx >= results.length) selectedIdx = 0;
    renderResults('');
  }

  // ── opnunarleiðir (allar til fyrir) ───────────────────────────────────────
  const sv = v => { if (window.App && typeof App.switchView === 'function') App.switchView(v); };
  const hash = h => { try { location.hash = h; } catch (_) {} };

  function opnaFyrirtaeki(id) {
    if (typeof window._openCompanySafe === 'function') window._openCompanySafe(id);
    else hash('#company/' + id);
  }
  // 368 render() hættir samstundis sé borðssýnin ekki virk (`!v.classList.contains('active')`), og
  // opnaHam/opnaEiningu skila SAMT true. Smellur á ham eða einingu þegar notandinn stendur á Tekjum
  // gerði því nákvæmlega ekkert — sami gallinn og þessi útgáfa var smíðuð til að laga (rýni 20.11.2026).
  // Því er borðið alltaf opnað fyrst og aðgerðin keyrð á eftir; skili `gera` false er reynt aftur
  // þar til borðið er komið upp.
  function aBordid(gera) {
    const b = document.querySelector('.vnav-btn[data-view="verkbord"]');
    if (b) b.click(); else sv('bord');
    let n = 0;
    const reyna = () => {
      let komst = true;
      try { komst = gera() !== false; } catch (e) { console.warn('[leit] borðsaðgerð brást', e); }
      if (!komst && ++n < 20) setTimeout(reyna, 150);
    };
    reyna();
  }

  function opnaMal(id) {
    aBordid(() => {
      if (!(window.Bord368 && typeof Bord368.opnaMal === 'function')) return false;
      Bord368.opnaMal(id);
    });
  }
  // Reikningurinn opnast í sprettiglugga (235 kallar window.open). Sé leiðin keyrð um location.hash
  // kemur hún í NÝRRI lotu — smell-keðjan er rofin og sprettigluggavörnin stöðvar hann þegjandi
  // (mælt í loftinu 20.11.2026: hash rétt, sýn rétt, enginn reikningur). Því er opnunin kölluð
  // BEINT í sama smelli og slóðin skrifuð án hashchange. Hinar leiðirnar (#unit, #verkbeidni,
  // #company) opna glugga innan síðunnar og mega fara um hash eins og áður.
  function opnaSolu(x) {
    if (!x.num) { sv('income'); return; }
    const R = window.SubRoutes && SubRoutes._routes && SubRoutes._routes.sale;
    if (R && typeof R.open === 'function') {
      if (R.parent) sv(R.parent);
      try { history.replaceState(null, '', '#sale/' + x.num); } catch (_) {}
      R.open(x.num);
      return;
    }
    hash('#sale/' + x.num);
  }
  function opnaVerkbeidni(x) { if (x.num) hash('#verkbeidni/' + x.num); else sv('workshop'); }
  function opnaTaeki(x) { if (x.serial) hash('#unit/' + x.serial); else sv('field'); }
  function opnaSkjal(x) {
    if (x.fyrirtaeki_id) { opnaFyrirtaeki(x.fyrirtaeki_id); return; }
    sv('companies');
  }

  // ── teikning ──────────────────────────────────────────────────────────────
  const HOPAR = { sida: 'Síður og hamir', co: '🏢 Viðskiptavinir', mal: '📋 Mál á borðinu', inv: '📄 Reikningar', doc: '📁 Skjöl', job: '🔧 Verk', dev: '🔥 Þjónustutæki', qt: '📝 Tilboð' };

  function renderResults(fotur) {
    const root = document.getElementById('gs-results');
    if (!root) return;
    if (!results.length) {
      root.innerHTML = '<div class="gs-empty">' + (fotur ? esc(fotur) : 'Engar niðurstöður') + '</div>';
      return;
    }
    let html = '';
    let prev = null;
    results.forEach((r, i) => {
      if (r.type !== prev) {
        if (prev) html += '</div>';
        html += '<div class="gs-group"><div class="gs-group-hd">' + esc(HOPAR[r.type] || r.type) + '</div>';
        prev = r.type;
      }
      html += '<div class="gs-item' + (i === selectedIdx ? ' selected' : '') + '" data-idx="' + i + '">' +
        '<div>' + esc(r.icon) + ' ' + esc(r.title) + '</div>' +
        (r.meta ? '<div class="meta">' + esc(r.meta) + '</div>' : '') + '</div>';
    });
    if (prev) html += '</div>';
    if (fotur) html += '<div class="gs-empty">' + esc(fotur) + '</div>';
    root.innerHTML = html;
    root.querySelectorAll('.gs-item').forEach(el => { el.onclick = () => openResult(results[parseInt(el.dataset.idx, 10)]); });
    const s = root.querySelector('.gs-item.selected');
    if (s) s.scrollIntoView({ block: 'nearest' });
  }

  function openResult(r) {
    if (!r) return;
    close();
    try { r.opna(); } catch (e) { console.warn('[leit] opnun brást', e); }
  }

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); open(); }
  });

  // ── hnappar: stikan (391 klæðir hann) og fastur hnappur á síma ────────────
  const LUPA = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  function ensureBtn() {
    if (document.getElementById('gs-trigger')) return;
    const topbar = document.querySelector('.topbar') || document.querySelector('header');
    if (!topbar) return;
    const btn = document.createElement('button');
    btn.id = 'gs-trigger';
    btn.type = 'button';
    btn.title = 'Leita eða fara á… (Ctrl+K)';
    btn.style.cssText = 'background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:8px;padding:6px 12px;color:#fff;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:6px;margin:0 6px';
    btn.innerHTML = LUPA + '<span>Leita eða fara á…</span>';
    btn.onclick = open;
    // Næst á eftir merkinu, ekki aftast: á síma ræður DOM-röðin (391 stílar aðeins frá 901px) og
    // hnappurinn lenti á eftir öllum 63 hnöppum stikunnar, neðst í skúffu sem þarf að skruna.
    // Á tölvuskjá ræður `order:1` úr 391 eftir sem áður, svo staðan þar breytist ekki.
    const merki = topbar.querySelector('.brand');
    if (merki && merki.nextSibling) topbar.insertBefore(btn, merki.nextSibling);
    else topbar.appendChild(btn);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(ensureBtn, 1200));
  else setTimeout(ensureBtn, 1200);
  setTimeout(ensureBtn, 3000);

  // sidurFyrir og _opna eru flutt út svo prófið (test/leit-opnar.test.cjs) mæli ÞESSAR
  // föllin sjálf — ekki eftirlíkingu af þeim. Opnunarleiðirnar eru kjarni v2.
  window.GlobalSearch = {
    open, close, leita: leitaGogn, sidur, sidurFyrir, _norm: norm,
    _opna: { fyrirtaeki: opnaFyrirtaeki, mal: opnaMal, sala: opnaSolu, verkbeidni: opnaVerkbeidni, taeki: opnaTaeki, skjal: opnaSkjal }
  };
  console.log('[global-search] v2 installed');
})();
