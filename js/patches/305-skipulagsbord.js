/* === SKIPULAGSBORD — 12-rúða skipulagsgriðin (2026-08-09) ===
 *
 * Situr undir dagskráræmunni (#303) í Þjónustuborði (#231).
 * Stillanlegur raðafjöldi (1–10 raðir × 4 dálkar) — spjöld með fyrirtækjanafni og stuttri
 * lýsingu úr Þjónustuborðinu sem hægt er að draga á milli rúða og yfir í
 * dagskráræmuna til að bóka í ákveðinn dag.
 *
 * FLÆÐI:
 *   • „📋 Skipulag" á Þjónustuborðs-spjaldi → bæta við á borðið.
 *   • Smella á spjald → hoppa niður á málið í borðinu (verkbord-select event).
 *   • Draga á milli rúða → endurraða.
 *   • Draga yfir dagskrárrúðu → opna dagskrá-glugga forútfylltan; spjald
 *     hverfur af borðinu þegar verk er vistað.
 *   • Litaðir punktar á neðanverðu spjaldi = tegund verks; smella til að velja.
 *   • Hausinn sýnir FJÖLDA spjalda á borðinu og raðafjöldann; + / − fjölga
 *     eða fækka sýnilegum röðum (1–10). Spjöld í röðum sem hverfa við fækkun
 *     eru ALDREI hent — þau bíða og koma aftur við fjölgun (⤓-takkinn sýnir þau).
 *
 * GÖGN: AppSettings.path('skipulagsbord.cards')
 *   Spjald: { id, slot, verkbord_id, name, title, type }
 *   type = 0-4 (index í TYPES) eða null
 *
 * API: window.Skipulagsbord = { mount, addFromRow }
 */
(() => {
  if (window.__skipulagsbord) return;
  window.__skipulagsbord = true;

  const SLOT_ID = 'vb-skipulag';
  const COLS    = 4;

  // 2026-09-04 (Agnar): Markmiðs-teljarinn var tekinn af og +/− stýra nú
  // SÝNILEGUM RÖÐUM í staðinn — 1..10 raðir í stað fastra 12 rúða.
  // Grunnreglan: spjald í röð sem hverfur við fækkun er ALDREI hent. Það
  // heldur `slot`-inu sínu, telst áfram með í teljaranum og birtist aftur um
  // leið og röðum er fjölgað (⤓-takkinn undir griðinu gerir það í einum smelli).
  const ROWS_MIN  = 1;
  const ROWS_MAX  = 10;
  const ROWS_DEF  = 3;
  const SLOTS_MAX = ROWS_MAX * COLS;
  function synilegarRadir() {
    return Math.max(ROWS_MIN, Math.min(ROWS_MAX, Number(state.rows) || ROWS_DEF));
  }

  // Tegund verks — sama listi og í 303-vikudagskra og 231-verkbord
  const TYPES = [
    ['Árskoðun',   '#c3271c'],
    ['Hleðsla',    '#b8770e'],
    ['Uppsetning', '#2c6e9e'],
    ['Verkstæði',  '#5b6470'],
    ['Annað',      '#8a8f98']
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[skipulagsbord]', m); }

  // ── State ──────────────────────────────────────────────────────────────────
  // Default collapsed: the 12-slot grid eats Þjónustuborð and is still rough
  // (Agnar 2026-08-31). Missing localStorage pref = collapsed. Explicit Víkka
  // writes '1' and is honoured on later visits; Fela writes '0'.
  const OPEN_KEY = 'vb_skipulag_open';
  function readOpenPref() {
    try { return localStorage.getItem(OPEN_KEY) === '1'; } catch (_) { return false; }
  }
  function writeOpenPref(open) {
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch (_) {}
  }
  const state = { cards: [], rows: ROWS_DEF, collapsed: !readOpenPref() };
  let _drag = null;         // id of card being dragged from the board
  let _pendingRemove = null; // card id to remove after calendar save

  // ── Storage ────────────────────────────────────────────────────────────────
  // 2026-09-02: BORÐIÐ ER PER STARFSMANN (#350) — `skipulagsbord.by_staff.<nafn>`.
  function nafnStarfsm() {
    return (window.BordStarfsmadur && BordStarfsmadur.get) ? BordStarfsmadur.get() : 'Agnar';
  }
  function readData() {
    const P = k => (window.AppSettings && AppSettings.path) ? AppSettings.path(k) : null;
    const v = P('skipulagsbord.by_staff.' + nafnStarfsm());
    if (v && Array.isArray(v.cards)) return v;
    // Fyrsta opnun þessa starfsmanns. Agnar erfir gamla sameiginlega borðið
    // (flutt í #350); aðrir byrja auðir — annars sæju allir sömu spjöldin.
    if (nafnStarfsm() === 'Agnar') {
      const g = P('skipulagsbord');
      if (g && Array.isArray(g.cards)) return g;
      const g2 = P('skipulagsborg');
      if (g2 && Array.isArray(g2.cards)) return g2;
      try {
        const ls = JSON.parse(localStorage.getItem('bh_sb') || '{}');
        if (Array.isArray(ls.cards)) return { cards: ls.cards, rows: ls.rows };
      } catch (_) {}
    }
    return { cards: [], rows: ROWS_DEF };
  }
  async function persist() {
    const data = { cards: state.cards, rows: synilegarRadir() };
    render();
    if (!window.AppSettings || !AppSettings.save) return;
    // Sama vörn og í dagskránni (#303): spjöldin eru skrifuð sem HEILT fylki,
    // svo skrif á undan `load()` skrifa skyndiminnis-stöðuna yfir það sem hin
    // vélin vistaði. Bíða þar til stillingar hafa hlaðist.
    if (AppSettings.isLoaded && !AppSettings.isLoaded()) {
      for (let i = 0; i < 40 && !AppSettings.isLoaded(); i++) await new Promise(r => setTimeout(r, 150));
      if (!AppSettings.isLoaded()) { if (window.toast) toast('Stillingar hlóðust ekki — borðið vistaðist ekki'); return; }
    }
    await AppSettings.save({ skipulagsbord: { by_staff: { [nafnStarfsm()]: data } } });
    // localStorage-afritið er AÐEINS fyrir Agnar (gamla sameiginlega borðið);
    // annars myndi afgreiðslutölvan skrifa sitt borð yfir afrit hans.
    if (nafnStarfsm() === 'Agnar') { try { localStorage.setItem('bh_sb', JSON.stringify(data)); } catch (_) {} }
  }
  function newId() { return 'sb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function firstFreeSlot() {
    const used = new Set(state.cards.map(c => c.slot));
    for (let i = 0; i < SLOTS_MAX; i++) if (!used.has(i)) return i;
    return state.cards.length % SLOTS_MAX;
  }
  // Nýtt spjald má ALDREI lenda þegjandi í falinni röð — fjölgum röðum svo
  // rúðan sjáist (upp að ROWS_MAX). Annars „gerðist ekkert" við að bæta við.
  function opnaRadFyrir(slot) {
    const tharf = Math.ceil((Number(slot) + 1) / COLS);
    if (tharf > synilegarRadir()) state.rows = Math.min(ROWS_MAX, tharf);
  }

  // Try to detect a TYPES index from row tags/merki
  function detectType(row) {
    const merki = row.merki || row.tags || '';
    for (let i = 0; i < TYPES.length; i++) {
      if (String(merki).indexOf(TYPES[i][0]) !== -1) return i;
    }
    return null;
  }

  // ── CSS ────────────────────────────────────────────────────────────────────
  function injectCSS() {
    if (document.getElementById('sb-css')) return;
    const s = document.createElement('style');
    s.id = 'sb-css';
    s.textContent = `
      #${SLOT_ID} .sb-slot {
        min-height:74px; border:1.5px dashed #d3d6db; border-radius:11px;
        box-sizing:border-box; transition:border-color .12s, background .12s;
      }
      #${SLOT_ID} .sb-slot.sb-over, #${SLOT_ID} .sb-slot.sb-empty:hover {
        border-color:#2563eb; background:rgba(37,99,235,.06);
      }
      #${SLOT_ID} .sb-slot.sb-empty { cursor:pointer; }
      /* Ritanlegur texti á minnispunkta-spjaldi — lýsist upp við yfirsvif svo
         sjáist að hann er smellanlegur. Aðeins bakgrunnur, ENGIN rammabreyting:
         rammi myndi hliðra textanum og láta spjaldið hoppa til við músina. */
      #${SLOT_ID} .sb-rit { transition:background .12s; }
      #${SLOT_ID} .sb-card:hover .sb-rit:hover { background:rgba(37,99,235,.09); }
      /* Spjald MEÐ mynd: smámynd vinstra megin í fullri hæð, texti hægra megin.
         align-items:stretch svo myndin fylli hæðina; min-width:0 á textanum svo
         hann megi klippast í stað þess að ýta myndinni út (flex-börn eru annars
         min-width:auto og neita að minnka). */
      #${SLOT_ID} .sb-card.sb-hasimg { display:flex; align-items:stretch; gap:8px; }
      #${SLOT_ID} .sb-card.sb-hasimg .sb-txt { flex:1 1 auto; min-width:0; }
      #${SLOT_ID} .sb-thumb {
        flex:0 0 auto; height:auto; align-self:stretch; width:auto; max-width:44%;
        object-fit:cover; border-radius:7px; border:1px solid #e3e6ea;
        cursor:zoom-in; background:#f6f7f9;
      }
      /* Stækkuð mynd */
      #_sb-lightbox {
        position:fixed; inset:0; z-index:99999; display:flex; align-items:center;
        justify-content:center; background:rgba(12,13,16,.86); padding:20px;
        cursor:zoom-out; -webkit-tap-highlight-color:transparent;
      }
      #_sb-lightbox img {
        max-width:100%; max-height:100%; object-fit:contain; border-radius:10px;
        box-shadow:0 18px 60px rgba(0,0,0,.5);
      }
      #_sb-lightbox .sb-lb-x {
        position:absolute; top:14px; right:16px; width:40px; height:40px;
        border-radius:50%; border:0; background:rgba(255,255,255,.14); color:#fff;
        font:700 20px/1 system-ui, sans-serif; cursor:pointer;
      }
      #${SLOT_ID} .sb-card {
        width:100%; min-height:70px; box-sizing:border-box;
        padding:8px 8px 7px; border-radius:9px;
        background:#fff; border:1px solid #e2e5ea;
        box-shadow:0 1px 4px rgba(0,0,0,.07);
        cursor:grab; display:flex; flex-direction:column; gap:4px;
        transition:box-shadow .12s, transform .1s; user-select:none;
      }
      #${SLOT_ID} .sb-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.14); }
      #${SLOT_ID} .sb-card.sb-dragging { opacity:.35; transform:scale(.96); cursor:grabbing; }
      #${SLOT_ID} .sb-x {
        opacity:0; border:none; background:none; cursor:pointer;
        font-size:12px; color:#9aa0aa; padding:0; line-height:1;
        transition:opacity .1s, color .1s; flex:none;
      }
      #${SLOT_ID} .sb-card:hover .sb-x { opacity:1; }
      #${SLOT_ID} .sb-x:hover { color:#dc2626; }
      #${SLOT_ID} .sb-card:hover .sb-co-btn, #${SLOT_ID} .sb-card:hover .sb-eye-btn { opacity:1 !important; }
      #${SLOT_ID} .sb-co-btn:hover, #${SLOT_ID} .sb-eye-btn:hover { color:#2563eb !important; }
      /* Síminn hefur ekkert hover — hljóðlátu hnapparnir yrðu ósýnilegir að eilífu. */
      @media (hover:none){ #${SLOT_ID} .sb-co-btn, #${SLOT_ID} .sb-eye-btn { opacity:.55 !important; } }
      #${SLOT_ID} .sb-type-dot {
        display:inline-block; border-radius:50%; cursor:pointer; flex:none;
        transition:transform .1s, box-shadow .1s;
      }
      #${SLOT_ID} .sb-type-dot:hover { transform:scale(1.25); }
      .sb-cal-over {
        border-color:#2563eb !important; outline:2px solid #2563eb;
        outline-offset:-2px; background:rgba(37,99,235,.09) !important;
      }
    `;
    document.head.appendChild(s);
  }

  // Spjald → snöggskoðunar-spec: beiðnin EF hún er til, annars nafnamatch —
  // og spjaldstextinn (title+name) fylgir ALLTAF, hann er oft eina heimildin.
  function cardSpec(c) {
    const spec = { card_title: c.title || '', card_name: c.name || '' };
    if (c.verkbord_id != null) spec.beidni_id = c.verkbord_id; else spec.nafn = c.name || '';
    return spec;
  }

  // ── Live row lookup ────────────────────────────────────────────────────────
  function liveRow(card) {
    try {
      if (window.VerkbordLiveItems) {
        const r = VerkbordLiveItems().find(x => String(x.id) === String(card.verkbord_id));
        if (r) return r;
      }
    } catch (_) {}
    return { customer_nafn: card.name, title: card.title, id: card.verkbord_id };
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  function typeDotRow(card) {
    return '<div style="display:flex;align-items:center;gap:4px;margin-top:auto;padding-top:5px;flex-wrap:nowrap">' +
      TYPES.map(function (t, i) {
        const sel = card.type === i;
        const sz  = sel ? '11' : '9';
        return '<span class="sb-type-dot" ' +
          'data-sb-type-cid="' + esc(card.id) + '" data-sb-type-i="' + i + '" ' +
          'title="' + esc(t[0]) + '" ' +
          'style="width:' + sz + 'px;height:' + sz + 'px;background:' + t[1] + ';' +
          (sel ? 'box-shadow:0 0 0 1.5px #fff,0 0 0 3px ' + t[1] + ';opacity:1;' : 'opacity:.55;') +
          '"></span>';
      }).join('') +
      '<span style="font-size:9.5px;color:#94a3b8;margin-left:3px;pointer-events:none;overflow:hidden;' +
        'text-overflow:ellipsis;white-space:nowrap;flex:1">' +
        (card.type != null ? esc(TYPES[card.type][0]) : '') +
      '</span>' +
      (card.name
        ? '<button class="sb-co-btn" data-sb-co-name="' + esc(card.name) + '" ' +
            'title="Opna fyrirtækisíðu: ' + esc(card.name) + '" ' +
            'style="border:none;background:none;cursor:pointer;font-size:11px;color:#94a3b8;' +
              'padding:0 2px;line-height:1;flex:none;opacity:0;transition:opacity .1s;margin-left:auto">🏢</button>'
        : '') +
      // 👁 Snöggskoðun (Pakki 5 v2) — sama hljóðláta mynstur og 🏢 hér að ofan.
      // Ber spjald-ID: skoðunin fær ALLT spjaldið (title+name eru oft eina
      // heimildin — „Um 16 tæki" stendur í spjaldstitli, ekki í málinu).
      ((card.verkbord_id != null || card.name)
        ? '<button class="sb-eye-btn" data-sb-eye="' + esc(card.id) + '" ' +
            'title="Snöggskoðun — allt sem kerfið veit um málið" ' +
            'style="border:none;background:none;cursor:pointer;font-size:11px;color:#94a3b8;' +
              'padding:0 2px;line-height:1;flex:none;opacity:0;transition:opacity .1s' +
              (card.name ? '' : ';margin-left:auto') + '">👁</button>'
        : '') +
    '</div>';
  }

  function slotHTML(i) {
    const card = state.cards.find(c => c.slot === i);
    if (!card) {
      // 2026-09-02: tóm rúða er nú SMELLANLEG — Agnar: „enable that we can push
      // on the plus sign in the skipulagsborð and just put in some random text
      // notes". Áður var hún aðeins sleppi-svæði fyrir drag.
      return '<div class="sb-slot sb-empty" data-sb-slot="' + i + '" data-sb-nytt="' + i + '" ' +
        'title="Smelltu til að skrifa minnispunkt">' +
        '<div style="height:100%;display:flex;align-items:center;justify-content:center;' +
          'color:#d3d6da;font-size:18px;font-weight:300;padding:16px 0;pointer-events:none">+</div>' +
        '</div>';
    }
    const row   = liveRow(card);
    const name  = row.customer_nafn || card.name || '—';
    const title = row.title || card.title || '';
    const tc    = card.type != null ? TYPES[card.type][1] : '#d3d6db';
    // 03.09.2026 (ósk Agnars: „ég vill geta haldið áfram að breyta … bara geta
    // skrifað beint á þetta svæði"): MINNISPUNKTA-spjöld (þau sem eru ekki
    // tengd máli) eru ritanleg beint á borðinu — sama og þegar þau eru búin til.
    // Spjöld sem HANGA Á MÁLI spegla titil málsins úr VerkbordLiveItems; að
    // skrifa á þau hér myndi annaðhvort þurrkast út við næstu teikningu eða
    // þurfa að skrifa í þjónustubeiðnina á bak við — þau opna því málið áfram,
    // þar sem titillinn er ritanlegur í VALIÐ MÁL.
    const ritanlegt = card.verkbord_id == null;
    // 04.09.2026 (ósk Agnars): skjáskot límt beint á spjaldið. Smámyndin situr
    // VINSTRA megin og passar í hæð spjaldsins (width:auto), svo textinn heldur
    // sínu plássi við hliðina — spjaldið stækkar ekki. Smellur á hana opnar
    // hana í fullri stærð. Myndin sjálf fer í `verkbord-files`-fötuna (sama og
    // spjallið og viðhengin nota); á spjaldinu er AÐEINS slóðin. Base64 hér
    // hefði farið í skipulagsbord.cards → app_settings, sem er þegar 1,5 MB og
    // er lesið og skrifað af öllu appinu.
    const mynd = card.mynd || '';

    return '<div class="sb-slot" data-sb-slot="' + i + '">' +
      '<div class="sb-card' + (mynd ? ' sb-hasimg' : '') + '" draggable="true" data-sb-card="' + esc(card.id) + '" ' +
        'data-sb-vid="' + esc(card.verkbord_id) + '" title="' +
        (ritanlegt ? 'Smella á textann til að breyta honum' : 'Smella til að opna málið hér að neðan') + '">' +
        (mynd
          ? '<img class="sb-thumb" src="' + esc(mynd) + '" alt="" draggable="false" ' +
              'data-sb-mynd="' + esc(mynd) + '" title="Smella til að stækka myndina">'
          : '') +
        '<div class="sb-txt">' +
        // Header: dot + name + delete
        '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:4px">' +
          '<div class="' + (ritanlegt ? 'sb-rit' : '') + '"' +
            (ritanlegt ? ' data-sb-edit="' + esc(card.id) + '"' : '') +
            ' style="display:flex;align-items:center;gap:5px;overflow:hidden;flex:1;min-width:0' +
            (ritanlegt ? ';cursor:text;border-radius:5px' : '') + '">' +
            '<span style="width:9px;height:9px;border-radius:50%;background:' + tc + ';flex:none;' +
              'margin-top:1px;transition:background .15s"></span>' +
            '<span style="font-size:11.5px;font-weight:800;color:#1a1c22;overflow:hidden;' +
              'text-overflow:ellipsis;white-space:nowrap;line-height:1.3">' + esc(name) + '</span>' +
          '</div>' +
          '<button class="sb-x" data-sb-del="' + esc(card.id) + '" title="Fjarlægja">✕</button>' +
        '</div>' +
        // Title
        (title
          ? '<div' + (ritanlegt ? ' class="sb-rit" data-sb-edit="' + esc(card.id) + '" style="cursor:text;border-radius:5px;' : ' style="') +
              'font-size:10.5px;color:#6b7280;line-height:1.4;overflow:hidden;' +
              'display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">' +
              esc(title) + '</div>'
          : (ritanlegt
              ? '<div class="sb-rit" data-sb-edit="' + esc(card.id) + '" style="cursor:text;border-radius:5px;' +
                  'font-size:10.5px;color:#c3c7cd;line-height:1.4">Bæta við nánar…</div>'
              : '')) +
        // Type picker dots
        typeDotRow(card) +
        '</div>' +
      '</div></div>';
  }

  function render() {
    const el = document.getElementById(SLOT_ID);
    if (!el) return;
    injectCSS();
    const onBoard = state.cards.length;
    const radir   = synilegarRadir();
    const rum     = radir * COLS;
    const faldar  = state.cards.filter(c => (Number(c.slot) || 0) >= rum).length;
    const spj     = n => n + (n === 1 ? ' spjald' : ' spjöld');

    if (state.collapsed) {
      el.innerHTML =
        '<div style="background:#fff;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.07);' +
          'margin-bottom:16px;overflow:hidden">' +
          '<div data-sb="toggle" style="display:flex;align-items:center;justify-content:space-between;' +
            'gap:12px;background:linear-gradient(180deg,#2e3037,#17181c 55%,#0c0d10);' +
            'padding:7px 12px;cursor:pointer">' +
            '<div style="display:flex;align-items:center;gap:10px">' +
              '<span style="font-size:11px;font-weight:800;letter-spacing:1.4px;' +
                'background:linear-gradient(180deg,#96c2a4,#4a8563 45%,#1e4631);' +
                '-webkit-background-clip:text;background-clip:text;color:transparent">SKIPULAGSBORD</span>' +
              '<span style="font-size:12px;color:#9aa0aa">' + spj(onBoard) + '</span>' +
            '</div>' +
            '<span style="font-size:12px;color:#9aa0aa;font-weight:700">▼ Víkka</span>' +
          '</div>' +
        '</div>';
      return;
    }

    const slots = [];
    for (let i = 0; i < rum; i++) slots.push(slotHTML(i));

    el.innerHTML =
      '<div style="background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.08);' +
        'overflow:hidden;margin-bottom:16px;color:#16181d">' +
        // Dökki haus
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;' +
          'flex-wrap:wrap;background:linear-gradient(180deg,#2e3037,#17181c 55%,#0c0d10);' +
          'padding:8px 12px;border-bottom:1px solid #2a2c33">' +
          '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">' +
            '<span style="font-size:11px;font-weight:800;letter-spacing:1.4px;' +
              'background:linear-gradient(180deg,#96c2a4,#4a8563 45%,#1e4631);' +
              '-webkit-background-clip:text;background-clip:text;color:transparent">SKIPULAGSBORD</span>' +
            '<span style="font-size:13px;color:#9aa0aa">Dragðu spjöld á dagskrárrúður</span>' +
          '</div>' +
          // Hausinn er 4 hópar núna (fjöldi · raðir · prenta · fela) — á 390px
          // síma verður að mega brjóta, annars ýtist „Fela" út fyrir kantinn.
          '<div style="display:flex;align-items:center;justify-content:flex-end;' +
            'flex-wrap:wrap;gap:8px;row-gap:6px">' +
            // Fjöldi verkefna Á BORÐINU (kom í stað Markmiðs-teljarans)
            '<div style="display:flex;align-items:baseline;gap:4px">' +
              '<span style="font-family:ui-monospace,monospace;font-size:14px;font-weight:800;color:#fff">' +
                onBoard + '</span>' +
              '<span style="font-size:11px;color:#9aa0aa">' +
                (onBoard === 1 ? 'spjald' : 'spjöld') + '</span>' +
            '</div>' +
            // Sýnilegar raðir — 1..10. Fækkun hendir engu (sjá ⤓ undir griðinu).
            '<div style="display:flex;align-items:center;gap:5px">' +
              '<span style="font-size:11px;color:#9aa0aa">Raðir:</span>' +
              '<span style="font-family:ui-monospace,monospace;font-size:14px;font-weight:800;color:#fff">' +
                radir + '</span>' +
              '<button data-sb="rows-minus" title="Færri sýnilegar raðir"' +
                (radir <= ROWS_MIN ? ' disabled' : '') + ' ' +
                'style="width:22px;height:22px;border:1px solid #3a3d45;border-radius:6px;' +
                'background:#23252c;color:#9aa0aa;font-size:13px;font-family:inherit;padding:0;' +
                (radir <= ROWS_MIN ? 'opacity:.35;cursor:default' : 'cursor:pointer') + '">−</button>' +
              '<button data-sb="rows-plus" title="Fleiri sýnilegar raðir"' +
                (radir >= ROWS_MAX ? ' disabled' : '') + ' ' +
                'style="width:22px;height:22px;border:1px solid #3a3d45;border-radius:6px;' +
                'background:#23252c;color:#9aa0aa;font-size:13px;font-family:inherit;padding:0;' +
                (radir >= ROWS_MAX ? 'opacity:.35;cursor:default' : 'cursor:pointer') + '">+</button>' +
            '</div>' +
            '<button data-sb="print-all" title="Prenta fyrirtækjablað fyrir öll spjöld á borðinu — eitt skjal, síða per fyrirtæki" ' +
              'style="height:26px;padding:0 10px;border:1px solid #3a3d45;border-radius:8px;' +
              'background:#23252c;color:#9aa0aa;cursor:pointer;font-family:inherit;' +
              'font-size:11px;font-weight:700">🖨 Prenta öll spjöld</button>' +
            '<button data-sb="toggle" style="height:26px;padding:0 10px;border:1px solid #3a3d45;' +
              'border-radius:8px;background:#23252c;color:#9aa0aa;cursor:pointer;' +
              'font-family:inherit;font-size:11px;font-weight:700">▲ Fela</button>' +
          '</div>' +
        '</div>' +
        // Grid
        '<div style="padding:10px 12px 12px">' +
          '<div class="sb-grid" style="display:grid;grid-template-columns:repeat(' + COLS + ',minmax(0,1fr));gap:8px">' +
            slots.join('') +
          '</div>' +
          (onBoard === 0
            ? '<div style="text-align:center;color:#94a3b8;font-size:12px;padding:10px 0 2px">' +
                'Veldu mál í Þjónustuborðinu og smelltu á <b>📋 Skipulag</b> til að bæta við.</div>'
            : '') +
          // Fækkun raða felur — hendir ekki. Þetta segir hversu mörg bíða.
          (faldar
            ? '<div style="text-align:center;padding:9px 0 2px">' +
                '<button data-sb="rows-fit" style="border:1px solid #e2e8f0;border-radius:8px;' +
                  'background:#f8fafc;color:#475569;cursor:pointer;font-family:inherit;' +
                  'font-size:11.5px;font-weight:700;padding:5px 11px">⤓ ' + spj(faldar) +
                  ' í földum röðum — sýna</button></div>'
            : '') +
        '</div>' +
      '</div>';

    wireDrag();
  }

  // ── Drag within board ──────────────────────────────────────────────────────
  function wireDrag() {
    const el = document.getElementById(SLOT_ID);
    if (!el) return;

    el.querySelectorAll('.sb-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        _drag = card.getAttribute('data-sb-card');
        card.classList.add('sb-dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', 'sb:' + _drag);
      });
      card.addEventListener('dragend', () => {
        card.classList.remove('sb-dragging');
        _drag = null;
        document.querySelectorAll('.sb-cal-over').forEach(c => c.classList.remove('sb-cal-over'));
      });
    });

    el.querySelectorAll('.sb-slot').forEach(slot => {
      slot.addEventListener('dragover', e => {
        if (!_drag && !window._vdCalDrag) return;
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        slot.classList.add('sb-over');
      });
      slot.addEventListener('dragleave', () => slot.classList.remove('sb-over'));
      slot.addEventListener('drop', e => {
        e.preventDefault(); slot.classList.remove('sb-over');
        const toSlot = Number(slot.getAttribute('data-sb-slot'));

        // Dagskrá-verk dregið af dagskrá → spjald á borðið
        if (window._vdCalDrag) {
          const job = window._vdCalDrag;
          window._vdCalDrag = null;
          const typeIdx = TYPES.findIndex(t => t[0] === job.type);
          const targetSlot = state.cards.find(c => c.slot === toSlot) ? firstFreeSlot() : toSlot;
          opnaRadFyrir(targetSlot);
          state.cards.push({ id: newId(), slot: targetSlot, verkbord_id: null,
            name: job.name, title: job.note || '', type: typeIdx >= 0 ? typeIdx : null });
          persist();
          if (window.Vikudagskra && Vikudagskra.removeJob) Vikudagskra.removeJob(job.id);
          return;
        }

        // Spjald flutt milli rúða á borðinu
        if (!_drag) return;
        const from = state.cards.find(c => c.id === _drag);
        if (!from) return;
        const occ = state.cards.find(c => c.slot === toSlot && c.id !== _drag);
        state.cards = state.cards.map(c => {
          if (c.id === _drag) return Object.assign({}, c, { slot: toSlot });
          if (occ && c.id === occ.id) return Object.assign({}, c, { slot: from.slot });
          return c;
        });
        persist();
      });
    });
  }

  // ── Drag to calendar day ───────────────────────────────────────────────────
  document.addEventListener('dragover', e => {
    if (!_drag) return;
    const cell = e.target.closest('[data-vd="day"][data-vd-date]');
    if (!cell) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    cell.classList.add('sb-cal-over');
  });
  document.addEventListener('dragleave', e => {
    const cell = e.target.closest('[data-vd="day"][data-vd-date]');
    if (cell) cell.classList.remove('sb-cal-over');
  });
  document.addEventListener('drop', e => {
    const cell = e.target.closest('[data-vd="day"][data-vd-date]');
    if (!cell || !_drag) return;
    e.preventDefault(); cell.classList.remove('sb-cal-over');
    const date = cell.getAttribute('data-vd-date');
    const card = state.cards.find(c => c.id === _drag);
    if (!card || !date) return;
    _pendingRemove = card.id;
    if (window.Vikudagskra && Vikudagskra.open) {
      Vikudagskra.open(date);
      setTimeout(() => {
        const n = document.getElementById('vd-name');
        if (n) { n.value = card.name; n.setAttribute('data-original', card.name); n.select(); }
        const nt = document.getElementById('vd-note');
        if (nt && card.title) { nt.value = card.title; nt.setAttribute('data-original', card.title); }
      }, 60);
    }
  });

  // When calendar saves → remove the pending card from board
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-vd="save"]');
    if (!btn || !_pendingRemove) return;
    const id = _pendingRemove;
    _pendingRemove = null;
    setTimeout(() => {
      state.cards = state.cards.filter(c => c.id !== id);
      persist();
    }, 200);
  }, true);

  // ── Board click events ─────────────────────────────────────────────────────
  document.addEventListener('click', e => {
    const el = document.getElementById(SLOT_ID);
    if (!el || !el.contains(e.target)) return;

    // Tóm rúða → frjáls minnispunktur. Spjaldið fær engan `verkbord_id`, svo
    // það er hreinn texti sem hangir ekki á máli í þjónustubeiðnum. Vistast
    // undir NÚVERANDI starfsmanni (#350) og samstillist við aðrar vélar.
    const nyttHolf = e.target.closest('[data-sb-nytt]');
    if (nyttHolf) {
      e.stopPropagation();
      // 2026-09-02: skrifað BEINT Í KASSANN — Agnar: „hafðu að maður getur
      // skrifað beint inn í minniskassann". `prompt()` var fljótlegt en það er
      // stýrikerfis-gluggi ofan á síðunni: hann tekur fókusinn, sýnir enga
      // umgjörð og maður sér ekki borðið á meðan.
      const i = Number(nyttHolf.getAttribute('data-sb-nytt'));
      if (nyttHolf.querySelector('textarea')) return;   // þegar í ritun
      nyttHolf.innerHTML =
        '<textarea class="sb-minnis" placeholder="Minnispunktur… (Enter vistar, Esc hættir við)" ' +
        'style="width:100%;height:100%;min-height:64px;box-sizing:border-box;border:0;outline:none;' +
        'background:transparent;resize:none;font:inherit;font-size:12.5px;line-height:1.4;' +
        'color:#1f2430;padding:8px"></textarea>';
      const ta = nyttHolf.querySelector('textarea');
      // Fókus tvisvar: strax, og aftur eftir að smell-atburðurinn er búinn.
      // Mælt 02.09.2026: eitthvað annað í smell-keðjunni tók fókusinn af
      // textareanu jafnóðum (activeElement var BODY), og þá gerði blur() ekkert.
      ta.focus(); setTimeout(() => { try { ta.focus(); } catch (_) {} }, 0);
      let vistad = false;   // vista aðeins EINU SINNI þótt Enter og blur komi bæði
      const vista = () => {
        if (vistad) return; vistad = true;
        const t = (ta.value || '').trim();
        if (!t) { render(); return; }
        const skil = t.indexOf(String.fromCharCode(10));
        state.cards.push({
          id: newId(), slot: i, verkbord_id: null,
          name: skil > 0 ? t.slice(0, skil).trim() : t,
          title: skil > 0 ? t.slice(skil + 1).trim() : '',
          type: null, minnispunktur: true
        });
        persist();
      };
      ta.addEventListener('keydown', ev => {
        ev.stopPropagation();
        // Enter vistar BEINT — ekki gegnum blur(). blur() á element sem hefur
        // ekki fókus gerir ekkert, og þá vistaðist aldrei neitt. Shift+Enter
        // gefur nýja línu (fyrsta línan er fyrirsögn). Esc hættir við.
        if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); vista(); }
        else if (ev.key === 'Escape') { ev.preventDefault(); ta.value = ''; vista(); }
      });
      ta.addEventListener('click', ev => ev.stopPropagation());
      ta.addEventListener('mousedown', ev => ev.stopPropagation());
      // Smellur annars staðar vistar líka — varaleið, ekki aðalleið.
      ta.addEventListener('blur', vista);
      return;
    }

    // Smámynd → stækka. Verður að koma á undan spjald-smellinum, annars opnar
    // hann málið að neðan í staðinn fyrir að sýna myndina.
    const smamynd = e.target.closest('[data-sb-mynd]');
    if (smamynd) {
      e.stopPropagation();
      e.preventDefault();
      opnaMynd(smamynd.getAttribute('data-sb-mynd'));
      return;
    }

    // ── Breyta minnispunkta-spjaldi BEINT á borðinu ─────────────────────────
    // 03.09.2026 (ósk Agnars). Sama ritflæði og þegar spjaldið er búið til í
    // tómri rúðu: textareita ofan í spjaldinu, fyrsta línan er fyrirsögn og
    // restin skýring, Enter vistar, Shift+Enter gefur línu, Esc hættir við.
    const ritSvaedi = e.target.closest('[data-sb-edit]');
    if (ritSvaedi) {
      e.stopPropagation();
      e.preventDefault();
      const cid  = ritSvaedi.getAttribute('data-sb-edit');
      const card = state.cards.find(c => c.id === cid);
      if (!card) return;
      const kort = ritSvaedi.closest('.sb-card');
      if (!kort || kort.querySelector('textarea')) return;   // þegar í ritun
      // Dragið verður að slökkna á meðan — annars stelur það mousedown og
      // ekki er hægt að setja bendilinn né velja texta inni í reitnum.
      const dragAdur = kort.getAttribute('draggable');
      kort.setAttribute('draggable', 'false');

      const fyrir = (card.name || '') + (card.title ? String.fromCharCode(10) + card.title : '');
      const haed  = Math.max(64, kort.offsetHeight - 8);
      kort.innerHTML =
        '<textarea class="sb-minnis" placeholder="Minnispunktur… (Enter vistar, Esc hættir við)" ' +
        'style="width:100%;height:' + haed + 'px;box-sizing:border-box;border:0;outline:none;' +
        'background:transparent;resize:none;font:inherit;font-size:12.5px;line-height:1.4;' +
        'color:#1f2430;padding:0"></textarea>';
      const ta = kort.querySelector('textarea');
      ta.value = fyrir;
      // Fókus tvisvar af sömu ástæðu og í nýskráningunni: eitthvað annað í
      // smell-keðjunni tók fókusinn jafnóðum og þá gerði blur() ekkert.
      ta.focus(); setTimeout(() => { try { ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length; } catch (_) {} }, 0);

      let vistad = false;   // Enter OG blur mega bæði koma — vista aðeins einu sinni
      const vista = (haettVid) => {
        if (vistad) return; vistad = true;
        kort.setAttribute('draggable', dragAdur == null ? 'true' : dragAdur);
        if (haettVid) { render(); return; }
        const t = (ta.value || '').trim();
        // Tómt = spjaldið er ekki lengur minnispunktur; fjarlægjum það frekar en
        // að skilja eftir nafnlaust spjald sem ekki er hægt að smella á aftur.
        if (!t) { state.cards = state.cards.filter(c => c.id !== cid); persist(); return; }
        const skil = t.indexOf(String.fromCharCode(10));
        card.name  = skil > 0 ? t.slice(0, skil).trim() : t;
        card.title = skil > 0 ? t.slice(skil + 1).trim() : '';
        persist();
      };
      ta.addEventListener('keydown', ev => {
        ev.stopPropagation();
        if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); vista(false); }
        else if (ev.key === 'Escape') { ev.preventDefault(); vista(true); }
      });
      ta.addEventListener('click', ev => ev.stopPropagation());
      ta.addEventListener('mousedown', ev => ev.stopPropagation());
      // Líma skjáskot beint á spjaldið. Textinn sem þegar er í reitnum er
      // vistaður FYRST — annars hefði render() eftir upphleðsluna hent honum.
      ta.addEventListener('paste', async ev => {
        const f = myndUrLimingu(ev);
        if (!f) return;                       // venjuleg texta-líming: ósnert
        ev.preventDefault();
        ev.stopPropagation();
        const texti = (ta.value || '').trim();
        if (texti) {
          const sk = texti.indexOf(String.fromCharCode(10));
          card.name  = sk > 0 ? texti.slice(0, sk).trim() : texti;
          card.title = sk > 0 ? texti.slice(sk + 1).trim() : '';
        }
        ta.disabled = true;
        toast('Hleð upp mynd…');
        const url = await hladaMynd(f, cid);
        if (url) { card.mynd = url; toast('✓ Mynd vistuð á spjaldið'); }
        vistad = true;                        // blur má ekki vista ofan í þetta
        kort.setAttribute('draggable', dragAdur == null ? 'true' : dragAdur);
        persist();
      });
      ta.addEventListener('blur', () => vista(false));
      return;
    }

    // Type dot picker
    const typeDot = e.target.closest('[data-sb-type-cid]');
    if (typeDot) {
      e.stopPropagation();
      const cid = typeDot.getAttribute('data-sb-type-cid');
      const ti  = Number(typeDot.getAttribute('data-sb-type-i'));
      const card = state.cards.find(c => c.id === cid);
      if (!card) return;
      card.type = (card.type === ti) ? null : ti; // click same → deselect
      persist();
      return;
    }

    // Delete button
    const delBtn = e.target.closest('[data-sb-del]');
    if (delBtn) {
      e.stopPropagation();
      const id = delBtn.getAttribute('data-sb-del');
      state.cards = state.cards.filter(c => c.id !== id);
      persist();
      return;
    }

    // Board control buttons
    const ctrl = e.target.closest('[data-sb]');
    if (ctrl) {
      const act = ctrl.getAttribute('data-sb');
      if (act === 'toggle')     {
        state.collapsed = !state.collapsed;
        writeOpenPref(!state.collapsed);
        render();
        return;
      }
      if (act === 'rows-plus')  { state.rows = Math.min(synilegarRadir() + 1, ROWS_MAX); persist(); return; }
      if (act === 'rows-minus') { state.rows = Math.max(synilegarRadir() - 1, ROWS_MIN); persist(); return; }
      if (act === 'rows-fit') {
        // Sýna allar raðir sem eiga spjöld — einn smellur til baka eftir fækkun.
        const tharf = state.cards.reduce(
          (m, c) => Math.max(m, Math.ceil(((Number(c.slot) || 0) + 1) / COLS)), ROWS_MIN);
        state.rows = Math.min(ROWS_MAX, tharf);
        persist();
        return;
      }
      if (act === 'print-all') {
        // Dagsskammturinn í einum snöggskoðunar-glugga — page-break milli
        // fyrirtækja við prentun. Spjöld án beiðni-ids fylgja á nafni og
        // spjaldstextinn fylgir ALLTAF með — enginn dettur þegjandi úr bunka.
        const specs = state.cards
          .filter(c => c.verkbord_id != null || c.name)
          .sort((a, b) => (a.slot || 0) - (b.slot || 0))
          .map(cardSpec);
        if (!specs.length) { toast('🖨 Engin spjöld á borðinu'); return; }
        if (window.Snoggskodun) Snoggskodun.open(specs);
        else toast('👁 Snöggskoðunin er ekki hlaðin');
        return;
      }
    }

    // 👁 Snöggskoðun — gluggi ofan á borðinu með öllu sem kerfið veit (306).
    // stopPropagation nauðsynlegt: spjaldið sjálft gleypir annars smellinn
    // („Smella til að opna málið hér að neðan").
    const eyeBtn = e.target.closest('.sb-eye-btn');
    if (eyeBtn) {
      e.stopPropagation();
      e.preventDefault();
      const card = state.cards.find(c => String(c.id) === String(eyeBtn.getAttribute('data-sb-eye')));
      if (!card) return;
      if (window.Snoggskodun) Snoggskodun.open([cardSpec(card)]);
      else toast('👁 Snöggskoðunin er ekki hlaðin');
      return;
    }

    // 🏢 Company profile button → open VidskDetail for this company
    const coBtn = e.target.closest('.sb-co-btn');
    if (coBtn) {
      e.stopPropagation();
      const name = coBtn.getAttribute('data-sb-co-name');
      if (!name) return;
      const cos = (window.Companies && Companies.list) || [];
      const co = cos.find(function (c) {
        return String(c.nafn || '').trim().toLowerCase() === name.trim().toLowerCase();
      });
      if (co && window.VidskDetail && typeof VidskDetail.show === 'function') {
        VidskDetail.show(co.id);
      } else if (co && window._openCompanySafe) {
        _openCompanySafe(co.id);
      } else {
        toast('🏢 ' + name + ' — fyrirtæki fannst ekki í lista');
      }
      return;
    }

    // Card click → jump to item in board
    const card = e.target.closest('[data-sb-card]');
    if (card && !e.target.closest('[data-sb-del]') && !e.target.closest('[data-sb-type-cid]')) {
      const vid = card.getAttribute('data-sb-vid');
      if (!vid) return;
      window.dispatchEvent(new CustomEvent('verkbord-select', { detail: { id: Number(vid) } }));
    }
  });

  // ── Public API ─────────────────────────────────────────────────────────────
  /* ── Skjáskot á spjaldi (04.09.2026, ósk Agnars) ────────────────────────────
     Myndin fer í `verkbord-files` (sama fata og spjallið #347 og viðhengin í
     231 nota); spjaldið geymir AÐEINS slóðina. Base64 á spjaldinu hefði endað
     inni í app_settings — 1,5 MB JSON sem allt appið les og skrifar. */
  const MYND_FATA = 'verkbord-files';
  const MYND_MAX_MB = 10;

  async function hladaMynd(file, cardId) {
    const sb = (window.DB && DB.sb) || null;
    if (!sb) { toast('Enginn gagnagrunnur — mynd ekki vistuð'); return null; }
    if (file.size > MYND_MAX_MB * 1024 * 1024) {
      toast('Myndin er of stór (hámark ' + MYND_MAX_MB + ' MB)');
      return null;
    }
    const endi = (file.type && file.type.split('/')[1] || 'png').replace(/[^a-z0-9]/gi, '') || 'png';
    const slod = 'skipulag/' + String(cardId) + '-' + Date.now() + '.' + endi;
    try {
      const up = await sb.storage.from(MYND_FATA).upload(slod, file, {
        contentType: file.type || 'image/png', upsert: false
      });
      if (up.error) { toast('Villa við upphleðslu: ' + (up.error.message || up.error)); return null; }
      const { data: u } = sb.storage.from(MYND_FATA).getPublicUrl(slod);
      return (u && u.publicUrl) || null;
    } catch (e) {
      toast('Villa við upphleðslu: ' + ((e && e.message) || e));
      return null;
    }
  }

  // Sækir mynd úr límingar-atburði. Skjáskot koma sem `file`-hlutur í items.
  function myndUrLimingu(ev) {
    try {
      const items = (ev.clipboardData && ev.clipboardData.items) || [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file' && /^image\//.test(items[i].type || '')) {
          const f = items[i].getAsFile();
          if (f) return f;
        }
      }
    } catch (_) {}
    return null;
  }

  function opnaMynd(url) {
    const gamalt = document.getElementById('_sb-lightbox');
    if (gamalt) gamalt.remove();
    const lb = document.createElement('div');
    lb.id = '_sb-lightbox';
    lb.innerHTML = '<button class="sb-lb-x" type="button" title="Loka">✕</button>'
      + '<img src="' + esc(url) + '" alt="">';
    const loka = () => { lb.remove(); document.removeEventListener('keydown', esclykill); };
    const esclykill = ev => { if (ev.key === 'Escape') loka(); };
    lb.addEventListener('click', loka);
    document.addEventListener('keydown', esclykill);
    document.body.appendChild(lb);
  }

  function addFromRow(row) {
    if (!row) return;
    if (state.cards.find(c => String(c.verkbord_id) === String(row.id))) {
      toast('📋 Þetta mál er nú þegar á skipulagsbordinu');
      return;
    }
    if (state.collapsed) { state.collapsed = false; writeOpenPref(true); }
    const slot = firstFreeSlot();
    opnaRadFyrir(slot);
    state.cards.push({
      id: newId(),
      slot,
      verkbord_id: row.id,
      name:  row.customer_nafn || '',
      title: row.title || '',
      type:  detectType(row)
    });
    persist();
    toast('📋 Bætt á skipulagsbord');
  }

  function mount() {
    if (!document.getElementById(SLOT_ID)) return;
    const data = readData();
    state.cards = data.cards || [];
    state.rows  = Math.max(ROWS_MIN, Math.min(ROWS_MAX, Number(data.rows) || ROWS_DEF));
    state.collapsed = !readOpenPref();
    render();
  }

  if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(mount);
  // Skipt um starfsmann → annad bord (#350).
  // 2026-09-02: BIÐRÖÐ, ekki beint kall. #350 hleðst Á EFTIR þessari skrá, svo
  // `window.BordStarfsmadur` er EKKI til hér — beint `onChange` hvarf þegjandi
  // og borðið skipti aldrei um starfsmann. Biðröðin er óháð hleðsluröð.
  (window.__bordStarfsmadurAskrift = window.__bordStarfsmadurAskrift || []).push(mount);

  window.Skipulagsbord = { mount, addFromRow };

  mount();
  window.addEventListener('load', mount);

  console.log('[skipulagsbord] installed');
})();
