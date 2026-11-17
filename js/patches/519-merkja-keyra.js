/* === MERKJA OG KEYRA (519) — 17.11.2026, lota 14 ============================================================
 *
 * Agnar 17.11.2026 (~20:00): Þjónustuborðið er „skelfilega takmarkað sem vinnuborð … bara upplýsingaskjár“. Og: „Nenni
 * varla að kópera texta inn í nýtt session. Útskýra allt áður en ég get unnið það“. Hönnunin hans (minnisskrá
 * project_merkja_og_keyra_2026_11_17): tiny merki á línu → lítill gluggi með hökum → hann merkir það sem hann getur,
 * án þess að slá inn texta → ▶ Keyra → agentar vinna → Óðinn metur → teljari og ljós segja hvenær umferð er búin.
 *
 * HVAR: lítið ◇ fremst í smáletursröð hverrar málslínu á Þjónustuborðinu (368 feedRow + mineRow). Smellur opnar gluggann
 * UNDIR línunni (ekkert yfirlag, tekur aldrei skjáinn): Já · Nei · Keyra · Snooze · Veit ekki · Rannsaka betur ·
 * Setja comment · Yfirfara. Eitt tak = merkt (glugginn lokast). Snooze býður dagsetningar (engin innsláttur); comment
 * er eini textareiturinn og valfrjáls. Teljarinn er ein lína efst (undir VIP-vaktinni): merkt · í keyrslu · klárað ·
 * vantar svör, með ▶ Keyra. „Veit ekki“ og „Rannsaka betur“ fara FREMST í röðina — þau eru beiðni um vinnu.
 *
 * GÖGN: /api/afgreidsla (sama fall og Afgreiðsla 511 og „Biddu Claude“ 492f — engin ný API-leið):
 *   GET  ?merkingar=1                         → { merkingar[], teljari, claude_virkt }
 *   POST { adgerd:'merkja', mal_id, merki|null, athugasemd?, due_at? }
 *   POST { adgerd:'merkja_keyra' }            → agentar fá verkin í bakgrunni; niðurstaðan → Tilbúin verk (511)
 * Aðeins innskráður stjórnandi (hlið afgreidsla.cjs). Án hans (401/403) teiknast ekkert — borðið er óbreytt.
 * Meðan umferð er í keyrslu er kannað á 6 s fresti (aðeins merkingarnar, ekki tilbúnu verkin) og hætt þegar hún er búin.
 * Ekkert hér sendir neitt út: lokasmellurinn er alltaf Agnars í Tilbúnum verkum.
 * ============================================================================================================== */
(() => {
  if (window.__merkjaKeyra519) return;
  window.__merkjaKeyra519 = true;

  const API = '/api/afgreidsla';
  const EIGANDI = 'Agnar';                    // eins og 489: sést aðeins hjá Agnari þar til fleiri fá það
  const KANNA_MS = 6000;
  // Röðin í glugganum er röð Agnars í beiðninni. forgangur/agent ráðast á þjóninum (_merkja.cjs MERKI).
  const MERKI = [
    ['ja', '✓', 'Já'], ['nei', '✕', 'Nei'], ['keyra', '▶', 'Keyra'], ['snooze', '💤', 'Snooze'],
    ['veit_ekki', '?', 'Veit ekki'], ['rannsaka', '🔎', 'Rannsaka betur'], ['comment', '💬', 'Setja comment'], ['yfirfara', '✓?', 'Yfirfara'],
  ];
  const TAKN = Object.fromEntries(MERKI.map(([k, t]) => [k, t]));
  const HEITI = Object.fromEntries(MERKI.map(([k, , h]) => [k, h]));
  const S = { virkt: false, sott: 0, bid: null, villa: null, gogn: null, idx: new Map(), opid: null, hamur: null, drog: {}, busy: {}, keyrir: false,
    kanna: 0, fyrraBuin: null, sed: lesaSed(), listaOpinn: true };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const p2 = (n) => String(n).padStart(2, '0');
  const dd = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : p2(d.getDate()) + '.' + p2(d.getMonth() + 1); };
  const kl = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  const ymd = (d) => d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
  const bord = () => window.Bord368 || null;
  // Hver situr við borðið: Samthykkja.nu (368) — sama og „Ég er“-valið. html(n) fær það líka beint frá 368.
  let _nuSidast = '';
  const nuNafn = () => { try { return (window.Samthykkja && Samthykkja.nu) ? Samthykkja.nu() : _nuSidast; } catch (_) { return _nuSidast; } };
  const toast = (m, w) => { try { if (bord() && bord().toast) return bord().toast(m, w); } catch (_) {} console[w ? 'warn' : 'log']('[519] ' + m); };
  const teikna = () => { try { if (window.Thjonustubord5 && Thjonustubord5.render) Thjonustubord5.render(); } catch (_) {} };
  // „Séð“ á umferð: viðmótsval vistað um Vidmot (472 — EITT gildi á þjóninum fyrir allar vélar, aldrei localStorage), svo
  // ljósið sem hann slökkti í símanum logi ekki áfram á tölvunni. Án Vidmot lifir það aðeins í minni.
  function lesaSed() { try { return (window.Vidmot && Vidmot.lesa) ? String(Vidmot.lesa('merkja_sed', '') || '') : ''; } catch (_) { return ''; } }
  function vistaSed(u) { S.sed = u || ''; try { if (window.Vidmot && Vidmot.setja) Vidmot.setja('merkja_sed', S.sed); } catch (_) {} }

  /* ── Þjónninn ───────────────────────────────────────────────────────── */
  async function kall(body) {
    const r = await fetch(API + (body ? '' : '?merkingar=1'), { method: body ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    return Object.assign(j && typeof j === 'object' ? j : {}, { _status: r.status });
  }
  function taka(j) {
    if (!j || !Array.isArray(j.merkingar)) return;
    S.gogn = j;
    S.idx = new Map(j.merkingar.map((m) => [Number(m.mal_id), m]));
    S.sott = Date.now();
    const t = j.teljari || {};
    // Umferð sem var í keyrslu er búin → tilkynning (sama hugsun og VIP-klukkan: sést án þess að leita).
    // Tilbúnu verkin (511) sótt strax, svo það sem Óðinn samþykkti standi í „Tilbúin verk“ án þess að bíða 5 mín.
    if (S.fyrraBuin === false && t.buin) {
      toast('Umferðin er búin: ' + (t.klarad || 0) + ' klárað · ' + (t.vantar_svar || 0) + ' vantar svör.');
      try { if (window.BordAfgreidsla && BordAfgreidsla.uppfaera) BordAfgreidsla.uppfaera(); } catch (_) {}
    }
    S.fyrraBuin = !!t.buin;
    if (t.i_keyrslu > 0) raesaKonnun(); else stodvaKonnun();
  }
  async function hlada() {
    if (S.bid) return S.bid;
    S.bid = (async () => {
      try {
        const j = await kall();
        if (j._status === 401 || j._status === 403) { S.virkt = false; S.villa = null; return; }
        if (j._status !== 200 || j.ok !== true) { S.villa = j.error || ('Villa ' + j._status); return; }
        S.virkt = true; S.villa = null; taka(j);
      } catch (e) { S.villa = String((e && e.message) || e); }
      finally { S.bid = null; teikna(); }
    })();
    return S.bid;
  }
  function raesaKonnun() { if (S.kanna) return; S.kanna = setInterval(() => { if (document.hidden) return; const v = document.getElementById('view-bord'); if (v && v.classList.contains('active')) hlada(); }, KANNA_MS); }
  function stodvaKonnun() { if (S.kanna) { clearInterval(S.kanna); S.kanna = 0; } }

  async function merkja(id, merki, extra) {
    if (S.busy[id]) return;
    S.busy[id] = true;
    // Strax á skjáinn (borðið á ekki að bíða eftir þjóninum); þjónninn ræður svo.
    const fyrri = S.idx.get(id);
    if (merki) S.idx.set(id, Object.assign({}, fyrri || {}, { mal_id: id, merki, stada: merki === 'snooze' ? 'blundar' : 'merkt', due_at: extra && extra.due_at, _bid: true }));
    else S.idx.delete(id);
    S.opid = null; S.hamur = null;
    teikna();
    try {
      const j = await kall(Object.assign({ adgerd: 'merkja', mal_id: id, merki: merki || null }, extra || {}));
      if (j._status !== 200) { if (fyrri) S.idx.set(id, fyrri); else S.idx.delete(id); toast(j.error || ('Merkið vistaðist ekki (' + j._status + ')'), true); }
      else { taka(j); if (merki === 'comment' || (extra && extra.athugasemd)) delete S.drog[id]; }
    } catch (e) { if (fyrri) S.idx.set(id, fyrri); else S.idx.delete(id); toast('Merkið vistaðist ekki: ' + ((e && e.message) || e), true); }
    finally { delete S.busy[id]; teikna(); }
  }
  async function keyra() {
    if (S.keyrir) return;
    S.keyrir = true; teikna();
    try {
      const j = await kall({ adgerd: 'merkja_keyra' });
      if (j._status !== 200) { toast(j.error || ('Keyrslan fór ekki af stað (' + j._status + ')'), true); return; }
      S.fyrraBuin = false;
      taka(j);
      toast((j.keyrsla && j.keyrsla.skilabod) || 'Komið af stað.');
      S.listaOpinn = true;
    } catch (e) { toast('Keyrslan fór ekki af stað: ' + ((e && e.message) || e), true); }
    finally { S.keyrir = false; teikna(); }
  }

  /* ── Teikning ─────────────────────────────────────────────────────── */
  const CSS = '<style id="mk519-css">' +
    '.mk-m{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:3px;min-width:26px;height:22px;padding:0 5px;margin:-3px 6px -3px -2px;' +
      'border:1px solid transparent;border-radius:11px;font:600 11px/1 var(--mono,ui-monospace,monospace);color:var(--mute,#6f685c);cursor:pointer;vertical-align:middle;letter-spacing:0;text-transform:none}' +
    '.mk-m:hover,.mk-m:focus-visible{border-color:var(--rule,#d9d3c6);background:#fff;color:var(--ink,#161513)}' +
    '.mk-m[data-s="merkt"]{border-color:#c9a54a;background:#fbf3dc;color:#7a5a12}' +
    '.mk-m[data-s="i_keyrslu"]{border-color:#7a8ea6;background:#eef2f7;color:#34495e}' +
    '.mk-m[data-s="i_keyrslu"] .mk-sn{display:inline-block;animation:mk-sn 1.2s linear infinite}@keyframes mk-sn{to{transform:rotate(360deg)}}' +
    '.mk-m[data-s="klarad"]{border-color:#2f7a4a;background:#e7f2ea;color:#2f7a4a}' +
    '.mk-m[data-s="vantar_svar"]{border-color:#b5522a;background:#fbece5;color:#b5522a}' +
    '.mk-m[data-s="blundar"]{border-color:var(--rule,#d9d3c6);background:#f4f1ea;color:var(--mute,#6f685c)}' +
    '.mk-m[data-s="snooze_buid"]{border-color:#c9a54a;background:#fff3b0;color:#7a5a12}' +
    '.mk-m[data-bid="1"]{opacity:.6}' +
    '.mk-g{margin:6px 0 2px;padding:8px;border:1px solid var(--rule,#d9d3c6);border-radius:6px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:520px}' +
    '.mk-gr{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}' +
    '.mk-h{all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:44px;padding:4px 2px;border:1px solid var(--rule,#d9d3c6);border-radius:5px;' +
      'background:var(--key,linear-gradient(180deg,#fff,#f1ede4));font:500 12px/1.15 system-ui,sans-serif;color:var(--ink,#161513);text-align:center;cursor:pointer}' +
    '.mk-h b{font-size:15px;line-height:1}.mk-h[aria-pressed="true"]{border-color:#c9a54a;background:#fbf3dc;font-weight:700}' +
    '.mk-h[data-v="veit_ekki"],.mk-h[data-v="rannsaka"]{border-color:#c9a54a}' +
    '.mk-h:focus-visible{outline:2px solid #c9a54a;outline-offset:1px}' +
    '.mk-r{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:7px;font-size:12px;color:var(--ink2,#3b3833)}' +
    '.mk-r .mk-h{flex:0 0 auto;min-height:34px;padding:4px 10px;flex-direction:row}' +
    '.mk-r input[type=date]{min-height:34px;padding:2px 6px;border:1px solid var(--rule,#d9d3c6);border-radius:5px;font:inherit}' +
    '.mk-g textarea{box-sizing:border-box;width:100%;min-height:58px;margin-top:7px;padding:6px 8px;border:1px solid var(--rule,#d9d3c6);border-radius:5px;font:13px/1.35 system-ui,sans-serif;resize:vertical}' +
    '.mk-ni{margin-top:7px;padding:6px 8px;border-radius:5px;background:#f7f5ef;font-size:12px;line-height:1.4;color:var(--ink2,#3b3833);overflow-wrap:anywhere}' +
    '.mk-ni.vs{background:#fbece5;color:#7c2f12}.mk-ni.ok{background:#e7f2ea;color:#1f5434}' +
    '.mk-x{all:unset;cursor:pointer;color:var(--mute,#6f685c);font-size:12px;padding:4px 6px;text-decoration:underline}' +
    '.mk-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin:0 0 10px;padding:7px 12px;border:1px solid var(--rule,#d9d3c6);border-radius:6px;background:var(--panel,#fff);font-size:13px;color:var(--ink2,#3b3833)}' +
    '.mk-bar .mk-t{display:inline-flex;align-items:baseline;gap:4px;white-space:nowrap}.mk-bar .mk-t b{font:700 15px/1 var(--mono,ui-monospace,monospace);color:var(--ink,#161513)}' +
    '.mk-bar .mk-t.vs b{color:#b5522a}.mk-bar .mk-t.ok b{color:#2f7a4a}.mk-bar .mk-t.ik b{color:#34495e}' +
    '.mk-bar .grow{flex:1 1 auto}' +
    '.mk-led{display:inline-block;width:10px;height:10px;border-radius:50%;background:#d9d3c6;flex:0 0 auto}' +
    '.mk-led[data-l="keyrir"]{background:#7a8ea6;animation:mk-p 1.2s ease-in-out infinite}.mk-led[data-l="buin"]{background:#2f7a4a;box-shadow:0 0 0 3px rgba(47,122,74,.25);animation:mk-p 1.6s ease-in-out 4}' +
    '.mk-led[data-l="buin_vs"]{background:#c9a54a;box-shadow:0 0 0 3px rgba(201,165,74,.3);animation:mk-p 1.6s ease-in-out 4}@keyframes mk-p{50%{opacity:.35}}' +
    '.mk-run{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:0 14px;border-radius:5px;border:1px solid #8f6a1c;background:var(--gface,#d9b25a);' +
      'font:700 13px/1 system-ui,sans-serif;color:#2b1d02;cursor:pointer}.mk-run[disabled]{opacity:.45;cursor:default}' +
    '.mk-sed{all:unset;cursor:pointer;font-size:12px;color:var(--mute,#6f685c);text-decoration:underline}' +
    '.mk-lst{flex:1 1 100%;margin:2px 0 0;padding:0;list-style:none;display:grid;gap:4px}' +
    '.mk-lst li{display:flex;flex-wrap:wrap;gap:4px 8px;align-items:baseline;padding:5px 8px;border-radius:5px;background:#fbece5;font-size:12px;line-height:1.35;color:#7c2f12}' +
    '.mk-lst li.ok{background:#e7f2ea;color:#1f5434}.mk-lst li b{color:var(--ink,#161513)}' +
    '.mk-lst button{all:unset;cursor:pointer;text-decoration:underline;font-weight:600}' +
    '.frow .kick,.mrow .kick{display:flex;align-items:center;flex-wrap:wrap}.sb-mk{margin-top:6px}.lrow .s .mk-m{margin-right:6px}' +
    '@media (max-width:700px){.mk-m{min-width:30px;height:26px;font-size:12px}.mk-h{min-height:48px;font-size:12px}.mk-bar{padding:7px 9px;gap:5px 9px}.mk-run{flex:1 1 100%;justify-content:center;min-height:40px}}' +
    '</style>';

  // Merkið á línunni (368 kallar þetta í feedRow/mineRow). Tómt hjá öðrum en Agnari eða án stjórnandaaðgangs.
  function merki(r) {
    if (!r || !r.id || !S.virkt || nuNafn() !== EIGANDI) return '';
    const m = S.idx.get(Number(r.id));
    let s = '', inni = '◇', titill = 'Merkja — Já · Nei · Keyra · Snooze · Veit ekki · Rannsaka betur · Comment · Yfirfara';
    if (m) {
      s = m.snooze_buid ? 'snooze_buid' : m.stada;
      if (m.stada === 'blundar') { inni = m.snooze_buid ? '⏰' : '💤 ' + esc(dd(m.due_at)); titill = m.snooze_buid ? 'Snooze búið — kom aftur' : 'Snooze til ' + dd(m.due_at); }
      else if (m.stada === 'i_keyrslu') { inni = '<span class="mk-sn">⟳</span>'; titill = HEITI[m.merki] + ' — ' + (m.agent || 'agent') + ' vinnur'; }
      else if (m.stada === 'klarad') { inni = '✓'; titill = 'Klárað' + (m.afgreidsla_id ? ' — tilbúið verk #' + m.afgreidsla_id : ''); }
      else if (m.stada === 'vantar_svar') { inni = '!'; titill = 'Vantar svar: ' + (m.astaeda || ''); }
      else { inni = esc(TAKN[m.merki] || '•'); titill = 'Merkt: ' + HEITI[m.merki] + ' — fer í næstu keyrslu'; }
    }
    return '<button type="button" class="mk-m" data-t5="mk-opna" data-id="' + Number(r.id) + '"' + (s ? ' data-s="' + esc(s) + '"' : '') + (m && m._bid ? ' data-bid="1"' : '') +
      ' aria-expanded="' + (S.opid === Number(r.id)) + '" aria-label="' + esc(titill) + '" title="' + esc(titill) + '">' + inni + '</button>';
  }

  // Stöðutákn án smells — í Samþykkja-listanum, þar sem listaatriðið sjálft er hnappur (merkið er á spjaldi valda málsins).
  function stada(r) {
    if (!r || !S.virkt || nuNafn() !== EIGANDI) return '';
    const m = S.idx.get(Number(r.id));
    if (!m) return '';
    const s = m.snooze_buid ? 'snooze_buid' : m.stada;
    const t = m.stada === 'blundar' ? (m.snooze_buid ? '⏰' : '💤') : m.stada === 'i_keyrslu' ? '⟳' : m.stada === 'klarad' ? '✓' : m.stada === 'vantar_svar' ? '!' : (TAKN[m.merki] || '•');
    return '<span class="mk-m" data-s="' + esc(s) + '" aria-label="Merkt: ' + esc(HEITI[m.merki] || '') + '" style="pointer-events:none;margin:0 4px">' + esc(t) + '</span>';
  }

  // Glugginn undir línunni (368 kallar þetta aftast í línunni). Teiknaður úr ástandi — lifir endurteikningu borðsins.
  function gluggi(r) {
    const id = Number(r && r.id);
    if (!id || S.opid !== id || !S.virkt || nuNafn() !== EIGANDI) return '';
    const m = S.idx.get(id) || null;
    const virkt = m && ['merkt', 'blundar'].includes(m.stada) ? m.merki : null;
    let ut = '<div class="mk-g" role="group" aria-label="Merkja línu">';
    if (m && m.stada === 'i_keyrslu') ut += '<div class="mk-ni">⟳ ' + esc(m.agent || 'Agent') + ' vinnur í þessu („' + esc(HEITI[m.merki] || m.merki) + '“). Niðurstaðan birtist hér og í Tilbúnum verkum.</div>';
    else {
      if (m && m.stada === 'klarad') ut += '<div class="mk-ni ok">✓ ' + esc(m.svar || 'Klárað') + (m.afgreidsla_id ? ' <b>→ Tilbúið verk #' + Number(m.afgreidsla_id) + '</b>' : '') + '</div>';
      if (m && m.stada === 'vantar_svar') ut += '<div class="mk-ni vs">! Vantar svar' + (m.agent ? ' (' + esc(m.agent) + ')' : '') + ': ' + esc(m.astaeda || '') + '</div>';
      ut += '<div class="mk-gr">' + MERKI.map(([k, t, h]) => '<button type="button" class="mk-h" data-t5="mk-merki" data-id="' + id + '" data-v="' + k + '" aria-pressed="' + (virkt === k) + '"><b aria-hidden="true">' + t + '</b>' + esc(h) + '</button>').join('') + '</div>';
      if (S.hamur === 'snooze') {
        const d = new Date(), a = (n) => { const x = new Date(d); x.setDate(x.getDate() + n); return ymd(x); };
        ut += '<div class="mk-r"><span>Snooze til:</span>' + [[1, 'Á morgun'], [3, '3 dagar'], [7, '1 vika'], [30, '1 mánuður']].map(([n, h]) =>
          '<button type="button" class="mk-h" data-t5="mk-snooze" data-id="' + id + '" data-d="' + a(n) + '">' + h + ' <span style="opacity:.6">' + esc(dd(a(n))) + '</span></button>').join('') +
          '<input type="date" data-mk-dags="' + id + '" min="' + a(1) + '" aria-label="Velja dag"></div>';
      }
      if (S.hamur === 'comment') {
        const t = S.drog[id] != null ? S.drog[id] : ((m && m.athugasemd) || '');
        ut += '<textarea data-mk="ath" data-id="' + id + '" rows="3" placeholder="Valfrjálst — það sem agentinn á að vita">' + esc(t) + '</textarea>' +
          '<div class="mk-r"><button type="button" class="mk-h" data-t5="mk-ath-vista" data-id="' + id + '"><b>💬</b>&nbsp;Vista comment</button></div>';
      }
      ut += '<div class="mk-r">' + (m && ['merkt', 'blundar', 'vantar_svar', 'klarad'].includes(m.stada) ? '<button type="button" class="mk-x" data-t5="mk-af" data-id="' + id + '">Taka merkið af</button>' : '') +
        '<span style="flex:1"></span><button type="button" class="mk-x" data-t5="mk-loka" data-id="' + id + '">Loka</button></div>';
    }
    return ut + '</div>';
  }

  // Teljarinn + ▶ Keyra + ljósið, ein lína efst á borðinu (368 kallar þetta undir VIP-vaktinni).
  function html(n) {
    _nuSidast = n || '';
    if (n !== EIGANDI) return '';
    if (!S.sott || Date.now() - S.sott > 60000) { if (!S.bid) hlada(); }
    if (!S.virkt) return '';
    const t = (S.gogn && S.gogn.teljari) || {};
    const claudeOk = !!(S.gogn && S.gogn.claude_virkt);
    const merktN = [...S.idx.values()].filter((m) => m.stada === 'merkt').length;
    const keyrir = (t.i_keyrslu || 0) > 0;
    if (!S.sed) S.sed = lesaSed();
    const ljos = keyrir ? 'keyrir' : t.buin && t.umferd !== S.sed ? ((t.vantar_svar || 0) ? 'buin_vs' : 'buin') : '';
    const tala = (k, h, cls) => '<span class="mk-t' + (cls ? ' ' + cls : '') + '"><b>' + (t[k] || 0) + '</b>' + h + '</span>';
    let ut = CSS + '<section class="mk-bar" aria-label="Merkja og keyra" role="status">' +
      '<span class="mk-led" data-l="' + ljos + '" aria-hidden="true"></span>' +
      tala('merkt', 'merkt') + tala('i_keyrslu', 'í keyrslu', keyrir ? 'ik' : '') + tala('klarad', 'klárað', 'ok') + tala('vantar_svar', 'vantar svör', (t.vantar_svar || 0) ? 'vs' : '') +
      ((t.blundar || 0) ? '<span class="mk-t"><b>' + t.blundar + '</b>💤</span>' : '') + ((t.snooze_buid || 0) ? '<span class="mk-t"><b>' + t.snooze_buid + '</b>⏰ komin aftur</span>' : '') +
      (ljos === 'buin' || ljos === 'buin_vs' ? '<span>Umferð búin' + (t.lokid_at ? ' kl. ' + esc(kl(t.lokid_at)) : '') + ' · <button type="button" class="mk-sed" data-t5="mk-sed">Séð</button></span>' : '') +
      (S.villa ? '<span style="color:#b5522a">' + esc(S.villa) + '</span>' : '') +
      '<span class="grow"></span>' +
      '<button type="button" class="mk-run" data-t5="mk-keyra"' + (!merktN || keyrir || S.keyrir || !claudeOk ? ' disabled' : '') +
        ' title="' + (claudeOk ? 'Senda allt sem er merkt til agenta — Veit ekki og Rannsaka betur fremst. Ekkert fer út; niðurstaðan bíður þín í Tilbúnum verkum.' : 'Agentarnir eru ekki komnir í gagnið (rofinn „Biddu Claude“ er af)') + '">' +
        (S.keyrir ? 'Ræsi…' : keyrir ? '⟳ Í keyrslu…' : '▶ Keyra' + (merktN ? ' (' + merktN + ')' : '')) + '</button>';
    // Niðurstöður síðustu umferðar: vantar svör fyrst (það sem hann þarf að vita), svo klárað. Hámark 8 línur.
    const umf = t.umferd ? [...S.idx.values()].filter((m) => m.umferd === t.umferd && (m.stada === 'vantar_svar' || m.stada === 'klarad')) : [];
    if (umf.length && t.umferd !== S.sed) {
      umf.sort((a, b) => (a.stada === 'vantar_svar' ? 0 : 1) - (b.stada === 'vantar_svar' ? 0 : 1));
      ut += '<ul class="mk-lst">' + umf.slice(0, 8).map((m) => '<li class="' + (m.stada === 'klarad' ? 'ok' : '') + '"><b>' + esc(m.stada === 'klarad' ? '✓' : '!') + ' ' + esc(String(m.mal_titill || 'Mál #' + m.mal_id).slice(0, 80)) + '</b>' +
        '<span>' + esc(m.stada === 'klarad' ? (m.afgreidsla_id ? 'Tilbúið verk #' + m.afgreidsla_id : (m.svar || 'Klárað')).slice(0, 140) : (m.astaeda || 'Vantar svar').slice(0, 220)) + '</span>' +
        '<button type="button" data-t5="mk-mal" data-id="' + Number(m.mal_id) + '">Opna málið</button></li>').join('') +
        (umf.length > 8 ? '<li>… og ' + (umf.length - 8) + ' til viðbótar á línunum sjálfum</li>' : '') + '</ul>';
    }
    return ut + '</section>';
  }

  /* ── Smellir (368 sendir data-t5="mk-*" hingað) ─────────────────────── */
  function smellur(el, e) {
    const a = el.dataset.t5, id = el.dataset.id ? Number(el.dataset.id) : null;
    if (a === 'mk-opna') { S.opid = S.opid === id ? null : id; S.hamur = null; teikna(); return true; }
    if (a === 'mk-loka') { S.opid = null; S.hamur = null; teikna(); return true; }
    if (a === 'mk-merki') {
      const v = el.dataset.v;
      if (v === 'snooze' || v === 'comment') { S.hamur = S.hamur === v ? null : v; teikna(); return true; }
      merkja(id, v, S.drog[id] ? { athugasemd: S.drog[id] } : undefined);
      return true;
    }
    if (a === 'mk-snooze') { merkja(id, 'snooze', { due_at: el.dataset.d }); return true; }
    if (a === 'mk-ath-vista') {
      const t = String(S.drog[id] || '').trim();
      if (!t) { toast('Athugasemdin er tóm.', true); return true; }
      const m = S.idx.get(id);
      const nuv = m && m.stada === 'merkt' && m.merki !== 'nei' ? m.merki : 'comment';
      merkja(id, nuv, { athugasemd: t });
      return true;
    }
    if (a === 'mk-af') { merkja(id, null); return true; }
    if (a === 'mk-keyra') { keyra(); return true; }
    if (a === 'mk-sed') { vistaSed((S.gogn && S.gogn.teljari && S.gogn.teljari.umferd) || ''); teikna(); return true; }
    if (a === 'mk-mal') { try { if (bord() && bord().opnaMal) bord().opnaMal(id); } catch (_) {} return true; }
    return false;
  }

  // Textareitur og dagsetning lifa í ástandinu (ekki DOM): endurteikning borðsins tekur þau með sér.
  let _tengt = null;
  function tengjaRot() {
    let root = null; try { root = bord() && bord().root ? bord().root() : null; } catch (_) {}
    if (!root || _tengt === root) return;
    _tengt = root;
    root.addEventListener('input', (e) => { const t = e.target; if (t && t.dataset && t.dataset.mk === 'ath') S.drog[Number(t.dataset.id)] = t.value; });
    root.addEventListener('change', (e) => { const t = e.target; if (t && t.dataset && t.dataset.mkDags && t.value) merkja(Number(t.dataset.mkDags), 'snooze', { due_at: t.value }); });
  }
  setInterval(tengjaRot, 1500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && S.virkt) hlada(); });

  window.MerkjaKeyra = { html, merki, gluggi, stada, smellur, hlada, S, MERKI, version: '519a' };
  console.log('[519-merkja-keyra] installed');
})();
/* === END MERKJA OG KEYRA === */
