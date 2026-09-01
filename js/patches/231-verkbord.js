/* === ÞJÓNUSTUBORÐ (áður Verkborð) — eitt sameinað vinnuborð ===
 *
 * HEITI (2026-08-06, ósk Agnars): síðan heitir núna „🔧 Þjónustuborð" bæði í
 * valmyndinni og á síðutitlinum (hét „Verkborð"/„Þjónustuverk"). Gamla síðan
 * sem bar heitið Þjónustuborð — CRM-borðið í #287 — var endurskírð
 * „📇 Samskiptaborð" og slug-ið hennar fært 'thjonustubord' → 'samskiptabord'
 * svo tvær síður beri ekki sama nafn. Slug ÞESSARAR síðu er áfram #verkbord:
 * hann er í bókamerkjum, í deep-link-vörninni hér að neðan og í patch 218.
 *
 * ÚTLIT V3 (2026-08-06, hönnun „Verkbord med banner V3"): einn langur listi var
 * óskýr, svo málin flokkast nú í kort eftir merki (⭐ BÍÐUR SVARS efst) og valið
 * mál opnast í föstu spjaldi hægra megin í stað þess að þenja röðina út.
 *
 * Sameinar gömlu efstu listana (Verkefni #145 · Þjónustuverk #172 ·h
 * Beiðnir/Þjónustuver #182 · Eftirfylgni #194) + foldar Verkdagbók #04 inn —
 * í EITT hratt verkborð. Hugsað eins og léttur verkefna-/CRM-/tikket-listi:
 *
 *   • HRAÐ-skráning efst: skrifaðu og ýttu á Enter → komið inn. Veldu tegund
 *     með einum smelli (Tilboð / Póstur / Skýrsla / Heimsókn / Annað).
 *   • Allt á einum stað, raðað eftir því sem skiptir máli: áríðandi + á
 *     gjalddaga efst. Rauður dagsetningarstimpill þegar útrunnið.
 *   • Biðraðir: Í dag · Allt opið · Lokað  +  tegunda-síur.
 *   • Smelltu á röð → opnast ritill (titill, nótur, tegund, staða, forgangur,
 *     gjalddagi/mikilvæg dagsetning, viðskiptavinur). Smelltu á stöðu-depil til
 *     að færa áfram. Stjarna = áríðandi.
 *   • Verkdagbókar-færslur (óloknar) birtast inni í borðinu (📓) — opnast í
 *     Verkdagbók til að breyta; hægt að haka „Klárað“ beint.
 *   • ✨ Tillaga: endurnýtir /api/tv-summary (sama Haiku-endapunkt og #182) til
 *     að fá eina næsta-skref línu. Dýpri AI (útgáfa 2): patch 343 fyllir
 *     `#vb-ai-slot` — leiðir „eftir að gera“ úr gögnum og leggur til
 *     búa-til/loka með staðfestingu. applyActions() er eini skrif-stígurinn.
 *
 * Gögn: BEINT í `thjonustubeidni` töfluna (sama og Beiðnir #182 notar — engin
 * ný tafla, engin tvíföldun). Verkdagbók lesin live úr `verkdagbok`.
 *
 * Við fyrstu opnun felur borðið gömlu fjóra listana úr valmyndinni (bætir
 * 'verkefni'/'thjonustuverk'/'thjonustuver'/'eftirfylgni' í sidebar_hidden) og
 * setur sig efst — allt afturkræft í Stillingar → Valmynd. Gögnin lifa áfram.
 */
(() => {
  if (window.__verkbordInstalled) return;
  window.__verkbordInstalled = true;

  const VIEW_ID = 'view-verkbord';
  const NAV_KEY = 'verkbord';

  // ── helpers ──────────────────────────────────────────────────────────────
  function getSB() { return (window.DB && window.DB.sb) || null; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function foldName(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function toast(m) { if (window.Toast && Toast.show) Toast.show(m); else console.log('[verkbord]', m); }
  function nowIso() { return new Date().toISOString(); }
  function fmtDate(iso) {
    if (!iso) return '';
    const d = (iso instanceof Date) ? iso : new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  }
  function currentUser() {
    try {
      const p = window.UserAuth && UserAuth.getProfile && UserAuth.getProfile();
      if (p && p.nafn) return p.nafn;
      const u = window.UserAuth && UserAuth.getUser && UserAuth.getUser();
      if (u && u.email) return u.email.split('@')[0];
    } catch (_) {}
    return 'Slökkvitæki';
  }
  // Match by folded first token so "Agnar Sigurðsson" counts; do not treat
  // "nema_agnar" / "Allir án Agnars" / Anni / Bjarndís as Agnar. Ambiguous leftover
  // strings that are not Agnar are staff. An unnamed office session (no
  // UserAuth / bs_employee) is Agnar's machine — secondary lock only.
  function looksLikeAgnar(raw) {
    const s = String(raw == null ? '' : raw).trim();
    if (!s) return false;
    const f = foldName(s);
    if (!f) return false;
    const token = f.split(/\s+/)[0];
    return token === 'agnar' || token === 'aggisigurds';
  }
  function isGenericOperatorName(raw) {
    const f = foldName(raw).replace(/\s+/g, '');
    return !f || f === 'slokkvitki' || f === 'slokkvitaeki' || f === 'starfsmaur' || f === 'starfsmadur' || f === 'kassi' || f === 'app';
  }
  function operatorIdentityNames() {
    const names = [];
    try {
      const p = window.UserAuth && UserAuth.getProfile && UserAuth.getProfile();
      if (p && p.nafn) names.push(p.nafn);
      const u = window.UserAuth && UserAuth.getUser && UserAuth.getUser();
      if (u && u.email) names.push(String(u.email).split('@')[0]);
    } catch (_) {}
    try {
      names.push(localStorage.getItem('ky_me') || '');
      names.push(localStorage.getItem('ky_eg') || '');
      names.push(localStorage.getItem('bs_employee') || '');
      names.push(localStorage.getItem('starfsmadur') || '');
    } catch (_) {}
    names.push(currentUser());
    return names;
  }
  function isAgnarFromNames(names, override) {
    if (override === true) return true;
    if (override === false) return false;
    const list = Array.isArray(names) ? names : [];
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      if (n == null || n === '') continue;
      if (isGenericOperatorName(n)) continue;
      return looksLikeAgnar(n);
    }
    return true;
  }
  function isAgnarUser() {
    let override;
    try { override = window.__vbAgnar; } catch (_) {}
    return isAgnarFromNames(operatorIdentityNames(), override);
  }
  // Extra chrome (AI borð, Innhólf/Allt/Verkefni/Lokað/Póstar, Snjallröðun/Þétt,
  // Sækja póst / Kúnnaskrá / 2023–25) follows the NAME DROPDOWN, not who is
  // logged in. Agnar 2026-08-31 follow-up: Bjarndís selected must hide extras even
  // on Agnar's office session. Picking Agnar brings them back. Allir is the
  // owner's overview (combined board) so it also shows extras. isAgnarUser() is
  // only a secondary lock. Do not gate chrome on isAgnarUser() alone — that was
  // the live bug (staff filter, extras still visible).
  function isOwnerOverviewFilter(raw) {
    const s = String(raw == null ? '' : raw).trim();
    if (s === 'allir' || s === 'Allir') return true;
    return looksLikeAgnar(s);
  }
  function showOwnerChrome() {
    return isOwnerOverviewFilter(state.fWorker) && isAgnarUser();
  }
  function effectiveQueue() {
    return showOwnerChrome() ? state.queue : 'allt';
  }

  // ── reference data ───────────────────────────────────────────────────────
  // Unified type vocabulary. Includes the legacy keys patch #182 wrote so old
  // rows still get a sensible chip.
  const TYPES = {
    tilbod:             { label: 'Tilboð',      emoji: '💰', color: '#1d4ed8', bg: '#eff6ff' },
    email:              { label: 'Póstur',      emoji: '✉️', color: '#7c3aed', bg: '#f5f3ff' },
    skyrsla:            { label: 'Skýrsla',     emoji: '📄', color: '#0891b2', bg: '#ecfeff' },
    heimsokn:           { label: 'Heimsókn',    emoji: '🚐', color: '#16a34a', bg: '#f0fdf4' },
    hringja:            { label: 'Hringja',     emoji: '📞', color: '#d97706', bg: '#fffbeb' },
    samningur:          { label: 'Samningur',   emoji: '📝', color: '#16a34a', bg: '#f0fdf4' },
    skjalabeidni:       { label: 'Skjöl',       emoji: '📁', color: '#7c3aed', bg: '#f5f3ff' },
    verkdagbok:         { label: 'Verkdagbók',  emoji: '📓', color: '#92400e', bg: '#fef3c7' },
    annad:              { label: 'Annað',       emoji: '•',  color: '#64748b', bg: '#f1f5f9' },
    // legacy (#182):
    skodun_tilbod:      { label: 'Skoðun & tilboð',  emoji: '💰', color: '#1d4ed8', bg: '#eff6ff' },
    nyr_samningur:      { label: 'Nýr samningur',    emoji: '📝', color: '#16a34a', bg: '#f0fdf4' },
    uttekt_eftirfylgni: { label: 'Úttekt / eftirfylgni', emoji: '🔎', color: '#0891b2', bg: '#ecfeff' }
  };
  function typeDef(t) { return TYPES[t] || TYPES.annad; }
  function typeChip(t) {
    const d = typeDef(t);
    return '<span class="vb-type" style="color:' + d.color + ';background:' + d.bg + ';border-color:' + d.color + '33">' + d.emoji + ' ' + esc(d.label) + '</span>';
  }
  // Tegunda-síur → hvaða raun-type gildi falla undir.
  const TYPE_GROUP = {
    tilbod:    ['tilbod', 'skodun_tilbod'],
    email:     ['email'],
    skyrsla:   ['skyrsla', 'uttekt_eftirfylgni'],
    heimsokn:  ['heimsokn'],
    verkdagbok:['verkdagbok'],
    hringja:   ['hringja']
  };
  const FILTERS = [
    { v: 'tilbod',     label: '💰 Tilboð' },
    { v: 'email',      label: '✉️ Póstur' },
    { v: 'skyrsla',    label: '📄 Skýrslur' },
    { v: 'heimsokn',   label: '🚐 Heimsóknir' },
    { v: 'verkdagbok', label: '📓 Verkdagbók' },
    { v: 'hringja',    label: '📞 Hringja' }
  ];
  // Hröðu tegundir í skráningarstikunni.
  const ADD_TYPES = ['annad', 'tilbod', 'email', 'skyrsla', 'heimsokn'];

  // ── Merki/tags (2026-07-10, ósk Agnars — sama sett og gamla Þjónustuverk-borðið)
  // Geymd í thjonustubeidni.tags (jsonb fylki, additive dálkur). Mörg merki per
  // beiðni; sían efst telur og síar; ritillinn togglar. Starfsmanna-tög
  // (starfs:Hákon) búa í sama fylki en rowTags síar þau frá merki-viðmótinu.
  const TAGS = {
    // 2026-08-31 (ósk Agnars): forvinna tilbúin — reikningur, skýrsla, viðhengi,
    // slóðir, svar-drög, samskiptasaga og sönnun á villunni. Starfsfólk yfirfer.
    draft:              { label: 'Draft',              emoji: '📝', color: '#b45309' },
    gera_tilbod:        { label: 'Gera tilboð',        emoji: '📄', color: '#7c3aed' },
    thjonustusamningur: { label: 'Þjónustusamningur',  emoji: '📝', color: '#16a34a' },
    bokhald:            { label: 'Bókhald',            emoji: '📊', color: '#1d4ed8' },
    kvortun:            { label: 'Kvörtun',            emoji: '😠', color: '#dc2626' },
    hringja:            { label: 'Hringja',            emoji: '📞', color: '#d97706' },
    brunakerfi:         { label: 'Brunakerfi',         emoji: '🔥', color: '#ea580c' },
    eftir_ad_rukka:     { label: 'Eftir að rukka',     emoji: '💰', color: '#be123c' },
    thjonusta:          { label: 'Þjónusta',           emoji: '🔧', color: '#0d9488' },
    senda_tolvupost:    { label: 'Senda tölvupóst',    emoji: '✉️', color: '#0369a1' },
    senda_skyrslur:     { label: 'Senda skýrslur',     emoji: '📑', color: '#4338ca' },
    // 2026-08-14 (ósk Agnars): uppsetningarverk — silfur-málm texti (sjá dkChip).
    uppsetning:         { label: 'Uppsetning',         emoji: '🔩', color: '#9aa3ad' }
  };
  const TAG_ORDER = Object.keys(TAGS);

  // ── Flokkarnir fimm (Þjónustuborð v2, 2026-07-10) ─────────────────────────
  // Aðal-flokkun borðsins — geymd í thjonustubeidni.flokkur (additive dálkur,
  // batch-flokkað í grunninum með leitarorðum/merkjum/tegund; ritillinn breytir).
  // MERKIN (TAGS) lifa áfram sem auka-merkingar í ritlinum.
  const FLOKKAR = {
    tilbod:     { label: 'Tilboð',     emoji: '💰', color: '#1d4ed8' },
    thjonusta:  { label: 'Þjónusta',   emoji: '🔧', color: '#0d9488' },
    brunakerfi: { label: 'Brunakerfi', emoji: '🔥', color: '#ea580c' },
    rukkun:     { label: 'Rukkun',     emoji: '💸', color: '#be123c' },
    samskipti:  { label: 'Samskipti',  emoji: '📞', color: '#d97706' }
  };
  const FLOKK_ORDER = Object.keys(FLOKKAR);
  function flokkDef(f) { return FLOKKAR[f] || { label: 'Annað', emoji: '•', color: '#64748b' }; }
  function rowFlokk(r) { return (r && r.flokkur && FLOKKAR[r.flokkur]) ? r.flokkur : ''; }
  // 2026-07-22 (ósk Agnars — „það sýnir tvær tegundir af tögum"): borðið sýndi
  // AÐRA chippa-tegund fyrir flokkinn (ljósa pastel-pillu) og AÐRA fyrir merkin
  // (dökk-metal) — sama merking, tvö útlit, og á röðum þar sem flokkur OG merki
  // sögðu það sama (t.d. flokkur=brunakerfi + merki=Brunakerfi) birtist chippinn
  // TVISVAR. Nú er bara EIN tegund: dökk-metal. Flokkurinn er þýddur yfir í sitt
  // eigna merki og settur FREMST (efst) — ljósa „Rukkun"-pillan verður þannig að
  // svarta „Eftir að rukka".
  const FLOKK_TO_TAG = {
    tilbod: 'gera_tilbod', thjonusta: 'thjonusta', brunakerfi: 'brunakerfi',
    rukkun: 'eftir_ad_rukka', samskipti: 'hringja'
  };
  function flokkTag(r) {
    const f = rowFlokk(r);
    return f && FLOKK_TO_TAG[f] ? FLOKK_TO_TAG[f] : '';
  }

  // ── Þjónustuverk v3 útlit (2026-07-10, dc.html referens frá Agnari) ────────
  // Dökk-metal chippar (spec: „Dark-metal control surface"), 5px vinstri-rönd
  // eftir flokki, metallísk STAÐA-pilla. Allir litir beint úr Thjonustuverkv3.
  const V3_METAL = 'background:linear-gradient(180deg,#2f333b,#1b1e24 60%,#111318);border:1px solid #0a0b0d;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)';
  const V3_METAL_ON = 'background:linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%);border:1px solid #0a0b0d;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)';
  const V3_CARD = 'border-radius:16px;border:1px solid rgba(20,24,34,.1);background:linear-gradient(180deg,#ffffff,#f5f7fb);box-shadow:0 16px 38px -20px rgba(15,23,42,.36),inset 0 2px 0 rgba(255,255,255,.95)';
  // Merkja-litir á dökku (spec §Category chip text colors)
  const TAG_DK = {
    draft: '#fbbf24',
    gera_tilbod: '#b79cff', thjonustusamningur: '#c3ccd8', bokhald: '#8fb0ff',
    kvortun: '#ff8a82', hringja: '#f2c24e', brunakerfi: '#ff8a82',
    eftir_ad_rukka: '#ff8a82', thjonusta: '#4fd08a', senda_tolvupost: '#8fb0ff',
    senda_skyrslur: '#a5b4fc', uppsetning: '#d7dce3'
  };
  // Silfur-málm texti (Uppsetning) — gradient-clip á INNRI span svo hann
  // stangist ekki á við metal-bakgrunn chippsins sjálfs.
  const SILVER_TXT = 'background:linear-gradient(180deg,#ffffff,#cfd6df 40%,#8f979f 70%,#e8ecf1);' +
    '-webkit-background-clip:text;background-clip:text;color:transparent;font-weight:800';
  // 5px vinstri-röndin litast af FLOKKI raðarinnar (mynstrið í referensinum).
  const RAIL = { tilbod: '#2f5fe0', thjonusta: '#22b063', brunakerfi: '#df2c2c', rukkun: '#be123c', samskipti: '#e0a93e' };
  function railColor(r) { return RAIL[rowFlokk(r)] || '#8a929e'; }
  // Raunveruleg merki raðarinnar (þau sem hökin í ritlinum stýra), í TAG_ORDER röð.
  // 2026-07-20: ÁÐUR bætti þetta við merki sem var LEITT AF FLOKKNUM (tilbod →
  // „Gera tilboð" o.s.frv.). Það þýddi að merki sem notandinn tók af í ritlinum
  // POPPAÐI STRAX AFTUR upp á röðinni — hakið sagði AF en chippinn sagði Á, og
  // ekki var hægt að fjarlægja t.d. „Gera tilboð" (kvörtun Agnars). Merkin eru nú
  // AÐEINS raunveruleg merki raðarinnar, svo chipparnir og hökin segja það sama.
  function dispTags(r) {
    const own = rowTags(r);
    return TAG_ORDER.filter(t => own.indexOf(t) !== -1);
  }
  // Chipparnir sem SJÁST á röðinni = merki raðarinnar + merkið sem flokkurinn
  // þýðist í (fremst). Síur og talningar nota þetta svo að smella á chip finni
  // alltaf röðina sem ber hann. Merkið sem flokkurinn leiðir af sér hverfur um
  // leið og hakið er tekið af í ritlinum (tagtoggle hreinsar flokkinn líka), svo
  // gamla „merkið poppar aftur upp"-vandamálið kemur ekki til baka.
  function rowChips(r) {
    const own = dispTags(r), ft = flokkTag(r);
    return ft && own.indexOf(ft) === -1 ? [ft].concat(own) : own;
  }
  function dkChip(t, act, rid) {
    const d = TAGS[t]; if (!d) return '';
    const lbl = t === 'uppsetning' ? '<span style="' + SILVER_TXT + '">' + esc(d.label) + '</span>' : esc(d.label);
    return '<span' + (act ? ' data-act="' + act + '" data-tag="' + t + '"' + (rid != null ? ' data-id="' + esc(rid) + '"' : '') : '') +
      ' style="display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:104px;font-size:11.5px;font-weight:600;padding:3px 9px;border-radius:7px;' + V3_METAL + ';color:' + (TAG_DK[t] || '#c3ccd8') + ';white-space:nowrap;cursor:pointer">' + d.emoji + ' ' + lbl + '</span>';
  }
  // Litlu merkja-chipparnir hægra megin á röð í hópaða viewinu (2026-08-14,
  // ósk Agnars): sýna HIN merkin sem málið ber — merki hópsins sjálfs er
  // sleppt (það sæist tvöfalt). Mest 4, svo „+N".
  function miniTagChips(r, excl) {
    const ts = rowChips(r).filter(t => t !== excl);
    if (!ts.length) return '';
    const MAXN = 4;
    const chips = ts.slice(0, MAXN).map(t => {
      const d = TAGS[t]; if (!d) return '';
      const lbl = t === 'uppsetning' ? '<span style="' + SILVER_TXT + '">' + esc(d.label) + '</span>' : esc(d.label);
      return '<span title="' + esc(d.label) + '" style="display:inline-flex;align-items:center;gap:3px;' +
        'font-size:10px;font-weight:700;padding:2px 7px;border-radius:6px;' + V3_METAL + ';' +
        'color:' + (TAG_DK[t] || '#c3ccd8') + ';white-space:nowrap">' + d.emoji + ' ' + lbl + '</span>';
    }).join('');
    const more = ts.length > MAXN
      ? '<span style="font-size:10px;color:#9aa0aa;font-weight:800;align-self:center">+' + (ts.length - MAXN) + '</span>' : '';
    return '<div style="flex:none;display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end;' +
      'max-width:200px;align-content:flex-start;margin-top:2px">' + chips + more + '</div>';
  }
  // Metallíska STAÐA-pillan (Ný = blá; beint úr referensinum).
  const PILL_GRAD = {
    nytt:      'linear-gradient(145deg,#5a86e0,#2f5fe0 42%,#1a3a8c 72%,#2d55c4)',
    i_vinnslu: 'linear-gradient(145deg,#8f77e8,#6d28d9 42%,#3d1a8c 72%,#5b2dc4)',
    bedid:     'linear-gradient(145deg,#e0b25a,#d97706 42%,#8c5a1a 72%,#c4952d)',
    tilbuid:   'linear-gradient(150deg,#2bbf6c,#0f6e3a)',
    lokad:     'linear-gradient(150deg,#2bbf6c,#0f6e3a)'
  };
  function stadaPill(r) {
    const st = statusDef(r.status);
    const lbl = r.status === 'nytt' ? 'Ný' : st.label;
    return '<span data-act="status" data-id="' + esc(r.id) + '" title="Smella til að færa stöðuna áfram" ' +
      'style="font-size:11px;font-weight:600;padding:4px 12px;border-radius:8px;background:' + (PILL_GRAD[r.status] || PILL_GRAD.nytt) + ';color:#fff;border:1px solid #12296b;white-space:nowrap;cursor:pointer;' +
      'box-shadow:inset 0 1.5px 0 rgba(255,255,255,.4),inset 0 -2px 4px rgba(0,0,0,.24),0 2px 5px -2px rgba(20,30,60,.4);text-shadow:0 1px 1px rgba(0,0,0,.3);filter:saturate(.74)">' + esc(lbl) + '</span>';
  }
  function fmtDots(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
  }

  function rawTagList(r) {
    let t = r && r.tags;
    if (typeof t === 'string') { try { t = JSON.parse(t); } catch (_) { t = []; } }
    if (!Array.isArray(t)) return [];
    const out = [];
    for (let i = 0; i < t.length; i++) {
      const x = t[i];
      if (typeof x !== 'string') continue;
      const s = x.trim();
      if (s && out.indexOf(s) === -1) out.push(s);
    }
    return out;
  }
  function rowTags(r) {
    return rawTagList(r).filter(function (x) { return TAGS[x]; });
  }
  function tagChip(t, small) {
    const d = TAGS[t]; if (!d) return '';
    return '<span style="display:inline-block;padding:' + (small ? '1px 7px' : '2px 9px') + ';border-radius:99px;font-size:' + (small ? '10px' : '10.5px') + ';font-weight:700;color:' + d.color + ';background:' + d.color + '14;border:1px solid ' + d.color + '44;white-space:nowrap">' + d.emoji + ' ' + esc(d.label) + '</span>';
  }

  const STATUSES = {
    nytt:      { label: 'Nýtt',      color: '#475569', dot: '#94a3b8' },
    i_vinnslu: { label: 'Í vinnslu', color: '#1d4ed8', dot: '#2563eb' },
    bedid:     { label: 'Beðið',     color: '#92400e', dot: '#d97706' },
    tilbuid:   { label: 'Tilbúið',   color: '#166534', dot: '#16a34a' },
    lokad:     { label: 'Lokað',     color: '#166534', dot: '#16a34a' }
  };
  const STATUS_ORDER = ['nytt', 'i_vinnslu', 'bedid', 'tilbuid', 'lokad'];
  function statusDef(s) { return STATUSES[s] || STATUSES.nytt; }
  function nextStatus(s) { const i = STATUS_ORDER.indexOf(s); return STATUS_ORDER[(i + 1) % STATUS_ORDER.length]; }

  const PRIORITIES = { lagur: 'Lágur', venjulegur: 'Venjulegur', har: 'Hár' };

  function dueInfo(iso) {
    if (!iso) return null;
    const d = new Date(iso); if (isNaN(d)) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dd = new Date(d); dd.setHours(0, 0, 0, 0);
    const diff = Math.round((dd - today) / 86400000);
    let label, overdue = false;
    if (diff < 0) { overdue = true; label = 'Fyrir ' + (-diff) + (-diff === 1 ? ' degi' : ' dögum'); }
    else if (diff === 0) label = 'Í dag';
    else if (diff === 1) label = 'Á morgun';
    else if (diff <= 7) label = 'Eftir ' + diff + ' daga';
    else label = fmtDate(iso);
    return { label, overdue, diff };
  }
  function isOpen(r) { return r.status !== 'lokad'; }
  function isOverdue(r) { if (!isOpen(r)) return false; const di = dueInfo(r.due_at); return !!(di && di.overdue); }
  function isToday(r) {
    if (!isOpen(r)) return false;
    if (r.important) return true;
    const di = dueInfo(r.due_at);
    return !!(di && di.diff <= 0);
  }
  // 2026-08-30 (ósk Agnars): skýrslumál 2023–2025 eru ekki vinnan þessa árs.
  // Þau blésu Verkefni upp (Tengja úttektarskýrslu — X 2023 …). Falin á
  // opnum biðröðum; 2026 og póstar án árs standa.
  function hasOldReportYear(s) {
    return /(?:^|[^\d])(2023|2024|2025)(?:[^\d]|$)/.test(String(s == null ? '' : s));
  }
  function isOldYearReport(r) {
    if (!r || r._vd) return false;
    const blob = String(r.title || '') + '\n' + String(r.notes || '') + '\n' + String(r.channel_ref || '');
    if (!hasOldReportYear(blob)) return false;
    if (/sk[yý]rsl|úttektarskyr|uttektarskyr|tengja úttekt/i.test(blob)) return true;
    if (r.type === 'skyrsla') return true;
    const tags = rowTags(r);
    return tags.indexOf('senda_skyrslur') !== -1;
  }

  // 2026-08-31 (ósk Agnars): nafnaval — Allir, Agnar, Allir án Agnars, Charlize,
  // Hákon, Binni, Anni, Bjarndís. Charlize tók við gömlu Söru (mál flutt).
  // Bjarndís er nýja slóðin (áður tóm Sara-slóð). Vistað „Sara" og
  // starfs:Sara lesast sem Bjarndís. Charlize-mál eru óhreyfð.
  // Starfsfólk sér daglega vinnu; skjalavinna fer á Agnar.
  // Óúthlutað og eldra en 30 dagar skráist á Agnar. Sjálfgefin sía er
  // „Allir án Agnars". Vistað „Allir"/allir opnar eiganda-yfirlitið aftur
  // (sameinað borð). Tómt gildi flyst áfram yfir í Allir án Agnars.
  // Keep in sync with tools/test-verkbord-assignee.cjs
  const OLD_JOB_MS = 30 * 24 * 60 * 60 * 1000;
  const WORKERS = ['Agnar', 'Charlize', 'Hákon', 'Binni', 'Anni', 'Bjarndís'];
  const WORKER_FILTERS = [
    ['allir', 'Allir'],
    ['Agnar', 'Agnar'],
    ['nema_agnar', 'Allir án Agnars'],
    ['Charlize', 'Charlize'],
    ['Hákon', 'Hákon'],
    ['Binni', 'Binni'],
    ['Anni', 'Anni'],
    ['Bjarndís', 'Bjarndís']
  ];
  const WORKER_SENTINELS = { '': true, Allir: true, allir: true, nema_agnar: true };
  function canonWorker(v) {
    const s = String(v == null ? '' : v).trim();
    return s === 'Sara' ? 'Bjarndís' : s;
  }
  function normAssignee(v) {
    const s = canonWorker(v);
    return WORKER_SENTINELS[s] ? '' : s;
  }
  function assignedForNew(worker) {
    return normAssignee(worker) || null;
  }
  // Composer-starfsmaðurinn fylgir síunni: Anni-sía → Anni, Agnar-sía → Agnar.
  // Allir án Agnars / allir / tómt → „—" (ekkert vistað assigned_to).
  function defaultAddWorker(filter) {
    return assignedForNew(filter != null ? filter : state.fWorker);
  }
  function addWorkerOptionsHtml(filter) {
    const cur = defaultAddWorker(filter) || '';
    let html = '<option value=""' + (!cur ? ' selected' : '') + '>—</option>';
    for (let i = 0; i < WORKERS.length; i++) {
      const w = WORKERS[i];
      html += '<option value="' + w + '"' + (cur === w ? ' selected' : '') + '>' + w + '</option>';
    }
    return html;
  }
  function syncAddWorkerSelect() {
    const sel = document.getElementById('vb-add-worker');
    if (!sel) return;
    sel.value = defaultAddWorker() || '';
  }
  // Stored assignee for the Meira dropdown — not effectiveAssignee. Old
  // unassigned tickets display as Agnar on the list; the editor must still
  // show Allir so picking Agnar fires change and persists assigned_to.
  function editorAssigneeValue(r) {
    return normAssignee(r && r.assigned_to);
  }
  function coerceRowId(raw) {
    if (raw == null || raw === '') return null;
    const s = String(raw);
    if (s.indexOf('vd:') === 0) return s;
    const n = Number(s);
    return Number.isFinite(n) ? n : s;
  }
  // VALIÐ MÁL Meira lives under #vb-sel-ed; list expand uses expandedId.
  // Prefer the field's own data-id host, then the selected ticket, then the
  // expanded list row. Never return null while a ticket is open in VALIÐ MÁL.
  function resolveEditorRowId(el, selId, expandedId) {
    if (el && el.closest) {
      const host = el.closest('[data-id]');
      if (host) {
        const id = coerceRowId(host.getAttribute('data-id'));
        if (id != null) return id;
      }
      if (el.closest('#vb-sel-ed')) {
        const id = coerceRowId(selId);
        if (id != null) return id;
      }
    }
    if (expandedId != null && expandedId !== '') return coerceRowId(expandedId);
    return coerceRowId(selId);
  }
  // Do not steal VALIÐ MÁL when a save (e.g. assigned_to=Agnar) drops the
  // ticket out of the current worker filter. Only jump to another row if
  // the selected ticket is gone from the loaded set.
  function keepSelectedId(selId, visibleRows, allRows) {
    const sid = selId == null || selId === '' ? '' : String(selId);
    if (sid && (allRows || []).some(function (x) { return String(x.id) === sid; })) return selId;
    return (visibleRows && visibleRows.length) ? visibleRows[0].id : null;
  }
  function isOlderThanMonth(r, now) {
    const t = Date.parse(r && r.created_at);
    if (!Number.isFinite(t)) return false;
    return t < (now != null ? now : Date.now()) - OLD_JOB_MS;
  }
  function effectiveAssignee(r, now) {
    const named = normAssignee(r && r.assigned_to);
    if (named) return named;
    if (!r || r._vd) return '';
    if (!isOpen(r) || isArchived(r) || r.deleted_at) return '';
    return isOlderThanMonth(r, now) ? 'Agnar' : '';
  }
  function matchesWorker(r, filter, now) {
    const w = canonFilter(filter != null ? filter : state.fWorker);
    if (!w || w === 'allir') return true;
    const who = effectiveAssignee(r, now);
    const tagged = taggedWorkers(r);
    if (w === 'nema_agnar') {
      if (who !== 'Agnar') return true;
      for (let i = 0; i < tagged.length; i++) if (tagged[i] !== 'Agnar') return true;
      return false;
    }
    if (who === w) return true;
    return tagged.indexOf(w) !== -1;
  }
  function canonFilter(v) {
    const s = canonWorker(v);
    if (s === 'Allir') return 'allir';
    return s;
  }
  function knownWorkerFilter(v) {
    const s = canonFilter(v);
    if (s === 'nema_agnar' || s === 'allir') return true;
    for (let i = 0; i < WORKERS.length; i++) if (WORKERS[i] === s) return true;
    return false;
  }
  function readStoredWorker() {
    try {
      const stored = localStorage.getItem(WKEY);
      if (stored === null || stored === '') return 'nema_agnar';
      if (knownWorkerFilter(stored)) return canonFilter(stored);
      return 'nema_agnar';
    } catch (_) { return 'nema_agnar'; }
  }
  function workerFilterOptionsHtml(cur) {
    const now = knownWorkerFilter(cur) ? canonFilter(cur) : 'nema_agnar';
    let html = '';
    for (let i = 0; i < WORKER_FILTERS.length; i++) {
      const val = WORKER_FILTERS[i][0], label = WORKER_FILTERS[i][1];
      html += '<option value="' + val + '"' + (now === val ? ' selected' : '') + '>' + label + '</option>';
    }
    return html;
  }
  function workerFilterOptions() {
    return workerFilterOptionsHtml(state.fWorker);
  }
  function assigneeOptionsHtml(r) {
    const cur = editorAssigneeValue(r);
    const names = WORKERS.slice();
    if (cur && names.indexOf(cur) === -1) names.push(cur);
    let html = '<option value=""' + (!cur ? ' selected' : '') + '>—</option>';
    for (let i = 0; i < names.length; i++) {
      const w = names[i];
      html += '<option value="' + w + '"' + (cur === w ? ' selected' : '') + '>' + w + '</option>';
    }
    return html;
  }
  // 2026-08-31 (ósk Agnars): létt tag á annan starfsmann án þess að stela
  // assigned_to. Geymt í tags sem „starfs:Hákon". Hákon sér málið á sínu
  // borði; aðalstarfsmaðurinn er óbreyttur. Keep in sync with
  // tools/test-verkbord-assignee.cjs
  const WORKER_TAG_PREFIX = 'starfs:';
  function taggedWorkers(r) {
    const names = [];
    const raw = rawTagList(r);
    for (let i = 0; i < raw.length; i++) {
      const t = raw[i];
      if (t.indexOf(WORKER_TAG_PREFIX) !== 0) continue;
      const n = canonWorker(t.slice(WORKER_TAG_PREFIX.length).trim());
      if (!n || WORKER_SENTINELS[n]) continue;
      if (names.indexOf(n) === -1) names.push(n);
    }
    return names;
  }
  function extraTags(r) {
    return rawTagList(r).filter(function (x) {
      return !TAGS[x] && x.indexOf(WORKER_TAG_PREFIX) !== 0;
    });
  }
  function composeTags(categoryTags, workers, extras) {
    const cats = [];
    (categoryTags || []).forEach(function (t) {
      if (TAGS[t] && cats.indexOf(t) === -1) cats.push(t);
    });
    const wtags = [];
    (workers || []).forEach(function (n) {
      const name = canonWorker(String(n == null ? '' : n).trim());
      if (!name || WORKER_SENTINELS[name]) return;
      const tok = WORKER_TAG_PREFIX + name;
      if (wtags.indexOf(tok) === -1) wtags.push(tok);
    });
    const rest = [];
    (extras || []).forEach(function (x) {
      if (typeof x === 'string' && x && rest.indexOf(x) === -1) rest.push(x);
    });
    return cats.concat(wtags).concat(rest);
  }
  function tagsWithCategory(row, nextCats) {
    return composeTags(nextCats, taggedWorkers(row), extraTags(row));
  }
  function tagsWithWorkers(row, workers) {
    const primary = editorAssigneeValue(row);
    const cleaned = [];
    (workers || []).forEach(function (n) {
      const name = canonWorker(n);
      if (name && name !== primary && cleaned.indexOf(name) === -1) cleaned.push(name);
    });
    return composeTags(rowTags(row), cleaned, extraTags(row));
  }
  function toggleTaggedWorker(row, name) {
    const n = canonWorker(String(name == null ? '' : name).trim());
    if (!n || WORKER_SENTINELS[n] || n === editorAssigneeValue(row)) {
      return tagsWithWorkers(row, taggedWorkers(row));
    }
    const cur = taggedWorkers(row).slice();
    const i = cur.indexOf(n);
    if (i === -1) cur.push(n); else cur.splice(i, 1);
    return tagsWithWorkers(row, cur);
  }
  function taggedListChipsHtml(r) {
    const tagged = taggedWorkers(r);
    if (!tagged.length) return '';
    return tagged.map(function (n) {
      return '<span title="Taggaður — sér málið, er ekki aðalstarfsmaður" style="font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:7px;background:#f0fdfa;color:#0f766e;border:1px solid #99f6e4;white-space:nowrap">🏷 ' + esc(n) + '</span>';
    }).join('');
  }
  function tagWorkerButtonsHtml(r) {
    const primary = editorAssigneeValue(r);
    const tagged = taggedWorkers(r);
    let html = '';
    for (let i = 0; i < WORKERS.length; i++) {
      const w = WORKERS[i];
      if (w === primary) continue;
      const on = tagged.indexOf(w) !== -1;
      html += '<button data-act="tagworker" data-id="' + esc(String(r.id)) + '" data-worker="' + esc(w) + '" type="button" title="' +
        (on ? 'Taka ' + w + ' af málinu' : 'Tagga ' + w + ' svo viðkomandi sjái málið — án þess að taka það yfir') + '" ' +
        'style="font-family:inherit;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;cursor:pointer;' +
        (on
          ? 'color:#0f766e;background:#ccfbf1;border:1.5px solid #14b8a6'
          : 'color:#64748b;background:#fff;border:1px solid #d8dadf') + '">' +
        (on ? '🏷 ' : '') + esc(w) + '</button>';
    }
    return html;
  }

  // ── state ────────────────────────────────────────────────────────────────
  const QKEY = '_vb_queue', FKEY = '_vb_filter', SKEY = '_vb_sort', TGKEY = '_vb_tag', VMKEY = '_vb_viewmode', WKEY = '_vb_worker';
  // Starfsmenn (skráning + sía). Sjálfgefið „Allir án Agnars". WORKERS er
  // skilgreint ofar með Agnar / Charlize / Hákon / Binni / Anni / Bjarndís.
  // Valin sía: texti lýsist upp + glóð í lit chips-ins (2026-07-13, ósk Agnars —
  // „sést illa hvað er valið"). currentColor = litur chips-ins svo glóðin passar.
  // 2026-07-22 (ósk Agnars — „það sýnir illa þegar sían er á … hafðu svarta gráa
  // meira black metal sem líka lýsist upp"): grunnurinn var of GRÁR, svo munurinn
  // á af/á sást varla. Nú er ósnert chip verulega dekkra (nær svörtu) og valið
  // chip fær upplýstan bakgrunn OFAN Á glóðina — bæði dekkra og bjartara.
  // 2026-08-06 (ósk Agnars — „make it full color… dark grey black like the
  // others and bright color text"): ósnert chip er ekki lengur deyft (engin
  // opacity) heldur sami dökk-gráa málmurinn og hinir hnapparnir á borðinu
  // (V3_METAL) með FULLUM merkjalit á textanum. Munurinn á af/á færist því
  // alfarið yfir í FILTER_ON, sem er hertur á móti: ljósari málmur, sterkari
  // glóð og meiri birta svo það sé augljóst að sían sé kveikt.
  const FILTER_METAL = 'background:linear-gradient(180deg,#2f333b,#1b1e24 60%,#111318);' +
    'border:1px solid #0a0b0d;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)';
  const FILTER_ON = 'opacity:1;background:linear-gradient(180deg,#5c636f,#363b45 55%,#1b1e24);' +
    'border:1.5px solid currentColor;outline:none;' +
    'box-shadow:0 0 22px -2px currentColor, inset 0 0 15px -4px currentColor, inset 0 1px 0 rgba(255,255,255,.24);' +
    'text-shadow:0 0 11px currentColor;filter:brightness(1.5) saturate(1.35)';
  const state = {
    items: [],          // thjonustubeidni rows
    vd: [],             // open verkdagbok rows (folded in)
    companies: null,    // fyrirtaeki names for the datalist (lazy)
    loading: false,
    // Biðraðir Þjónustuborðs v2: 📥 Innhólf (post) · 📋 Verkefni (verk) · Lokað.
    // Gömul vistuð gildi ('opid'/'idag') varpast á næsta jafngildi.
    queue: (function () {
      try {
        const q = localStorage.getItem(QKEY) || 'post';
        return (q === 'opid' || q === 'idag') ? 'verk' : q;
      } catch (_) { return 'post'; }
    })(),
    // Flokka-sían (fimm flokkarnir; 'annad' = án flokks) + „📦 Sýna eldri".
    // Flokka-sían á sér ENGA hnappa lengur (síun fer öll gegnum MERKI). Vistað
    // gildi frá því hún var til hefði því síað borðið áfram án nokkurrar leiðar
    // til að slökkva á því — svo lykillinn er hreinsaður í stað þess að lesast.
    fFlokk: (function () { try { localStorage.removeItem('_vb_flokk'); } catch (_) {} return ''; })(),
    showOld: false,
    showOldReports: false,
    // ── Verkborð V3 (2026-08-06, hönnun „Verkbord med banner V3") ───────────
    // Einn langur listi var óskýr (ósk Agnars) → málin flokkast nú í kort eftir
    // merki, og valið mál opnast í fastri hliðarspjaldi í stað þess að þenja
    // röðina út í listanum.
    selId: null,        // mál sem birtist í „VALIÐ MÁL"
    // Innbyggða sían í MÁL-kortinu í efstu röðinni: 'allt' | 'aridandi'.
    // Hún er sjálfstæð — snertir hvorki TÖG-síuna né ⭐-hnappinn að ofan.
    topFilter: 'allt',
    catOpen: {},        // { '<tag>': false } — lokaðir flokkar (sjálfgefið opnir)
    catMore: {},        // { '<tag>': true } — flokkur sem sýnir ALLT (ekki bara fyrstu 5)
    catAddOpen: {},     // { '<tag>': true } — flýtiskráningarform flokksins er opið
    filter: (function () { try { return localStorage.getItem(FKEY) || ''; } catch (_) { return ''; } })(),
    // 2026-07-10 (ósk Agnars): röðunar-valkostur — 'snjall' (sjálfgefið, áríðandi/
    // gjalddagi/forgangur eins og áður) eða 'nyjast' (hrein dagsetningarröð, nýjast efst).
    sort: (function () { try { return localStorage.getItem(SKEY) || 'snjall'; } catch (_) { return 'snjall'; } })(),
    // Merki-sía + sýn (þétt/ítarlegt) — bæði geymd milli heimsókna (2026-07-10).
    // 2026-07-22 (ósk Agnars — „gerðu mögulegt að hafa fleiri en eina síu"):
    // fTag (einn strengur) → fTags (fylki). Gamla vistaða stakgildið lifir af
    // uppfærsluna, og fylki sem var vistað sem JSON les rétt til baka.
    fTags: (function () {
      try {
        const raw = localStorage.getItem(TGKEY) || '';
        if (!raw) return [];
        if (raw.charAt(0) === '[') { const a = JSON.parse(raw); return Array.isArray(a) ? a.filter(t => TAGS[t]) : []; }
        return TAGS[raw] ? [raw] : [];
      } catch (_) { return []; }
    })(),
    fWorker: readStoredWorker(),
    viewMode: (function () { try { return localStorage.getItem(VMKEY) || 'itarlegt'; } catch (_) { return 'itarlegt'; } })(),
    search: '',
    addType: 'annad',
    addTags: [],        // merki valin í ný-beiðni línunni (hreinsast eftir skráningu)
    addTagged: [],      // auka starfsmenn (starfs:X) við nýtt mál
    threadLatest: {},   // beidniId → nýjasti póstur í þræðinum (sjá loadThreadLatest)
    attachments: {},    // beidniId → [{ id, name, path, url, mime_type, size }]
    draftPack: {},      // beidniId → forvinna { invoice, report, thread, villa, reply, links }
    draftBusy: {},      // beidniId → true while loadDraftPack runs
    draftOpen: {},      // beidniId → true|false user override for Forvinna panel
    addRsk: null,       // síðasta RSK-uppfletting úr fyrirtækjareitnum {kt,nafn,heimilisfang}
    // Þjónustuverk v3: ⭐ Áríðandi-sía, dálkaröðun, síðuskipting, composer-sýnileiki
    // Áríðandi-sían byrjar AF (Agnar 2026-08-07) — borðið sýnir öll mál sjálfgefið,
    // notandinn kveikir á ⭐ Áríðandi handvirkt þegar hann vill sía.
    fStar: false,
    colSort: null,      // {key:'dags'|'mal'|'stada', dir:'asc'|'desc'} | null
    page: 0,
    // Composer opið á tölvu, lokað á síma/spjaldtölvu (+ Nýtt mál opnar) —
    // verkefnin fyrst á minni skjám (þröskuldur fylgir 1020px media-reglunni).
    composerOpen: (function () { try { return window.innerWidth > 1020; } catch (_) { return true; } })(),
    expandedId: null
  };
  function setQueue(q) { state.queue = q; try { localStorage.setItem(QKEY, q); } catch (_) {} }
  function setFlokk(f) { state.fFlokk = f; try { localStorage.setItem('_vb_flokk', f); } catch (_) {} }
  function setSort(v) { state.sort = v; try { localStorage.setItem(SKEY, v); } catch (_) {} }
  // Smellur kveikir/slekkur á einu merki; fleiri mega loga í einu.
  function toggleTag(v) {
    if (!TAGS[v]) return;
    state.fTags = state.fTags.indexOf(v) !== -1 ? state.fTags.filter(t => t !== v) : state.fTags.concat([v]);
    try { localStorage.setItem(TGKEY, JSON.stringify(state.fTags)); } catch (_) {}
  }
  function setViewMode(v) { state.viewMode = v; try { localStorage.setItem(VMKEY, v); } catch (_) {} }
  function setFilter(f) { state.filter = f; try { localStorage.setItem(FKEY, f); } catch (_) {} }
  function setWorker(v) {
    state.fWorker = knownWorkerFilter(v) ? canonFilter(v) : 'nema_agnar';
    try { localStorage.setItem(WKEY, state.fWorker); } catch (_) {}
    syncAddWorkerSelect();
    applyStaffChrome();
    if (document.getElementById('vb-controls')) renderControls();
    if (window.VerkbordAi) { try { VerkbordAi.mount(); } catch (_) {} }
  }

  // verkdagbok rows → pseudo work-items (read-through; structure stays in #04).
  function vdItems() {
    return state.vd.map(r => ({
      id: 'vd:' + r.id, _vd: true, _raw: r,
      title: (r.fyrirtaeki || 'Verkdagbók') + (r.athugasemdir ? '' : ' — þjónusta'),
      notes: r.athugasemdir || '',
      type: 'verkdagbok', status: r.done ? 'lokad' : 'nytt',
      priority: 'venjulegur', important: false, due_at: null,
      customer_nafn: r.fyrirtaeki || '', source: 'verkdagbok',
      created_at: r.created_at
    }));
  }
  function allItems() { return state.items.concat(vdItems()); }

  // ── data ─────────────────────────────────────────────────────────────────
  async function load() {
    const SB = getSB();
    if (!SB) {
      // Köld hleðsla beint á /#verkbord: show() (og deep-link-vörnin) keyrir
      // ÁÐUR en DB.sb er til. Gamla útgáfan gafst þá þegjandi upp og borðið sat
      // eftir tómt — „🎉 Ekkert hér." ofan á 137 raunverulegum málum. Reynum
      // aftur þar til tengingin er komin (10s þak).
      if ((load._waits = (load._waits || 0) + 1) <= 40) setTimeout(load, 250);
      return;
    }
    load._waits = 0;
    state.loading = true; renderList();
    try {
      const a = await SB.from('thjonustubeidni').select('*').is('deleted_at', null)
        .order('created_at', { ascending: false }).range(0, 1499);
      if (a.error) throw a.error;
      state.items = a.data || [];
    } catch (e) {
      console.warn('[verkbord] load thjonustubeidni', e);
      state.items = [];
    }
    try {
      const b = await SB.from('verkdagbok').select('*').eq('done', false).eq('archived', false)
        .order('created_at', { ascending: false }).range(0, 499);
      state.vd = (b && !b.error && b.data) ? b.data : [];
    } catch (e) { state.vd = []; }
    state.loading = false;
    renderControls(); renderList(); refreshBadge();
    claimOldJobs();
    applyStaffChrome();
    if (window.VerkbordAi) { try { VerkbordAi.mount(); } catch (_) {} }
    // Nýjasta svarið í þræðinum (2026-07-10, ósk Agnars): ✨-samantektin/forsýnin
    // gat sýnt GAMALT efni úr miðjum póstþræði (löngu afgreitt). Flettum upp
    // nýjasta póstinum með sömu efnislínu og sýnum HANN — keyrt eftir fyrstu
    // málningu svo borðið birtist strax.
    loadThreadLatest().then(ok => { if (ok) renderList(); }).catch(() => {});
  }

  // Óúthlutað og eldra en 30 dagar → Agnar. Idempotent; snertir ekki
  // mál sem þegar eru skráð á Anni/Andri/o.s.frv.
  let _claimingOld = false;
  async function claimOldJobs() {
    if (_claimingOld) return;
    const cutoff = Date.now() - OLD_JOB_MS;
    const ids = [];
    for (const r of state.items) {
      if (!isOpen(r) || isArchived(r) || r.deleted_at) continue;
      if (normAssignee(r.assigned_to)) continue;
      const t = Date.parse(r.created_at);
      if (!Number.isFinite(t) || t >= cutoff) continue;
      ids.push(r.id);
      r.assigned_to = 'Agnar';
    }
    if (!ids.length) return;
    renderControls(); renderList(); refreshBadge();
    const SB = getSB(); if (!SB) return;
    _claimingOld = true;
    try {
      const stamp = nowIso();
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const { error } = await SB.from('thjonustubeidni')
          .update({ assigned_to: 'Agnar', updated_at: stamp })
          .in('id', chunk);
        if (error) console.warn('[verkbord] claimOldJobs', error.message);
      }
    } catch (e) {
      console.warn('[verkbord] claimOldJobs', e);
    } finally {
      _claimingOld = false;
    }
  }

  // Efnislína án Re:/Fwd:/Sv:-forskeyta — lykill fyrir þráða-mátun.
  function normSubj(s) {
    let t = String(s || '').trim().toLowerCase();
    for (let i = 0; i < 6; i++) t = t.replace(/^(re|fw|fwd|sv|vs)\s*:\s*/i, '');
    return t.replace(/\s+/g, ' ').trim();
  }
  async function loadThreadLatest() {
    const SB = getSB(); if (!SB) return false;
    const emailRows = state.items.filter(x => isOpen(x) && /^email:/.test(String(x.channel_ref || '')));
    if (!emailRows.length) { state.threadLatest = {}; return false; }
    let emails = [];
    try {
      const r = await SB.from('email_digest')
        .select('id,sender_name,sender_email,subject,snippet,body_preview,received_at')
        .eq('account', 'eldklar@eldklar.is')
        .order('received_at', { ascending: false }).range(0, 799);
      if (r.error) throw r.error;
      emails = r.data || [];
    } catch (_) { return false; }
    // Nýjasti póstur per efnislínu (listinn er raðaður nýjast fyrst).
    const newest = new Map();
    for (const e of emails) {
      const k = normSubj(e.subject);
      if (k && !newest.has(k)) newest.set(k, e);
    }
    const out = {};
    for (const b of emailRows) {
      const m = newest.get(normSubj(b.title));
      if (!m) continue;
      if (('email:' + m.id) === String(b.channel_ref)) continue;              // sami póstur og beiðnin
      if (new Date(m.received_at) - new Date(b.created_at) < 60e3) continue;  // ekkert nýrra komið
      const text = String(m.body_preview || m.snippet || '').trim();
      if (!text) continue;
      out[b.id] = {
        text, at: m.received_at,
        from: m.sender_name || m.sender_email || '',
        mine: /eldklar/i.test(m.sender_email || ''),
      };
    }
    state.threadLatest = out;
    return Object.keys(out).length > 0;
  }

  async function loadCompanies() {
    if (state.companies) return state.companies;
    const SB = getSB(); if (!SB) { state.companies = []; return []; }
    try {
      // Leit eins og á sölusíðunni: nafn EÐA kennitala þvert á fyrirtæki +
      // viðskiptavini + customers_base (2026-07-13). Sameinað + tvítök felld
      // (lækkuð nöfn), kýs röð sem ber customer_base_id.
      const [fy, vk, cb] = await Promise.all([
        SB.from('fyrirtaeki').select('nafn,kennitala,customer_base_id').is('deleted_at', null).range(0, 2999),
        SB.from('vidskiptavinir').select('nafn,kennitala,customer_base_id').range(0, 2999),
        SB.from('customers_base').select('nafn,kennitala,id').range(0, 2999)
      ]);
      const rows = [];
      (fy.data || []).forEach(c => c.nafn && rows.push({ nafn: c.nafn, kennitala: c.kennitala, customer_base_id: c.customer_base_id }));
      (vk.data || []).forEach(c => c.nafn && rows.push({ nafn: c.nafn, kennitala: c.kennitala, customer_base_id: c.customer_base_id }));
      (cb.data || []).forEach(c => c.nafn && rows.push({ nafn: c.nafn, kennitala: c.kennitala, customer_base_id: c.id }));
      const seen = new Map();
      rows.forEach(r => {
        const k = String(r.nafn).trim().toLowerCase();
        const ex = seen.get(k);
        if (!ex || (!ex.customer_base_id && r.customer_base_id)) seen.set(k, r);
      });
      state.companies = Array.from(seen.values());
    } catch (_) { state.companies = []; }
    return state.companies;
  }

  async function quickAdd(title, type, custName, expand, tags, rsk, worker, extraWorkers) {
    title = (title || '').trim();
    if (!title) return;
    const SB = getSB(); if (!SB) { toast('Engin gagnabankatenging'); return; }
    // Fyrirtækja-tenging (2026-07-10): nafn úr quick-línunni matchast við
    // fyrirtaeki (case-fold) → customer_base_id; annars geymist nafnið samt.
    custName = (custName || '').trim();
    let baseId = null;
    if (custName) {
      const cos = await loadCompanies();
      const hit = (cos || []).find(c => String(c.nafn || '').trim().toLowerCase() === custName.toLowerCase());
      if (hit) { custName = hit.nafn; baseId = hit.customer_base_id || null; }
    }
    // Kt-uppfletting sem fann kúnna í kerfinu → tengja base beint (2026-07-13).
    if (!baseId && rsk && rsk.inSystem && rsk.baseId) { baseId = rsk.baseId; custName = custName || rsk.nafn; }
    // RSK-fyrirtæki sem er EKKI á skrá: kt + heimilisfang fylgja í nótunum.
    const rskNote = (rsk && !rsk.inSystem && !baseId) ? 'RSK: kt ' + rsk.kt + (rsk.heimilisfang ? ' · ' + rsk.heimilisfang : '') : '';
    const primary = assignedForNew(worker);
    const extra = (extraWorkers || []).filter(function (n) { return n && n !== primary; });
    const cats = Array.isArray(tags) ? tags.filter(function (t) { return TAGS[t]; }) : [];
    const obj = {
      title, notes: rskNote, type: type || 'annad', status: 'nytt', priority: 'venjulegur',
      customer_nafn: custName || null, customer_base_id: baseId,
      assigned_to: primary,
      tags: composeTags(cats, extra, []),
      source: 'beint', important: false, created_at: nowIso(), created_by: currentUser(), updated_at: nowIso()
    };
    try {
      const r = await SB.from('thjonustubeidni').insert(obj).select().single();
      if (r.error) throw r.error;
      state.items.unshift(r.data);
      if (expand && r.data) state.expandedId = r.data.id;   // ⚙ Fleiri valkostir → opna ritilinn strax
      renderControls(); renderList(); refreshBadge();
    } catch (e) { toast('Náði ekki að bæta við: ' + (e.message || e)); }
  }

  // ── Fylgiskjöl (attachments) ─────────────────────────────────────────────
  const ATT_BUCKET = 'verkbord-files';

  async function loadAttachments(beidniId) {
    const SB = getSB(); if (!SB) return;
    const { data } = await SB.from('thjonustubeidni_files').select('*').eq('beidni_id', beidniId).order('created_at');
    state.attachments[beidniId] = data || [];
  }

  // ── Forvinna / Draft pack (2026-08-31) ──────────────────────────────────
  // Keep in sync with tools/test-verkbord-draft.cjs
  const DRAFT_MARK = 'DRAFT|';
  function parseDraftSummary(s) {
    if (!s || String(s).indexOf(DRAFT_MARK) !== 0) return null;
    try {
      const o = JSON.parse(String(s).slice(DRAFT_MARK.length));
      return o && typeof o === 'object' ? o : null;
    } catch (_) { return null; }
  }
  function encodeDraftSummary(pack) {
    return DRAFT_MARK + JSON.stringify(pack || {});
  }
  function draftDocUrl(d) {
    if (!d) return '';
    const p = String(d.storage_path || '').replace(/^\/+/, '');
    const i = p.indexOf('/');
    const base = String(window.SUPABASE_URL || '').replace(/\/+$/, '');
    if (base && i > 0) {
      return base + '/storage/v1/object/public/' + p.slice(0, i) + '/' +
        p.slice(i + 1).split('/').map(encodeURIComponent).join('/');
    }
    const drv = d.drive_file_id && String(d.drive_file_id).indexOf('sb:') !== 0 ? d.drive_file_id : '';
    return drv ? 'https://brunaholf.netlify.app/api/skjal?id=' + encodeURIComponent(drv) : '';
  }
  function fmtKr(n) {
    return Math.round(Number(n) || 0).toLocaleString('is-IS').replace(/,/g, '.') + ' kr';
  }
  function buildVilla(r, pack) {
    const blob = String((r && r.title) || '') + '\n' + String((r && r.notes) || '');
    const wantInv = /reikning|afrit|invoice|kröfu/i.test(blob);
    const wantRep = /sk[yý]rsl|úttekt|teikning/i.test(blob);
    const site = String((r && r.customer_nafn) || '').trim() || 'staðnum';
    const bits = [];
    if (pack.ambiguous) {
      bits.push('Fleiri en einn staður passaði við nafnið — ekkert valið (Center/kt-merge bannað). Tengdu nákvæmt fyrirtæki.');
    }
    if (wantInv && pack.invoice) bits.push('Beðið um reikning. Fannst ' + pack.invoice.label + ' á ' + site + '.');
    else if (wantInv && !pack.invoice) bits.push('Beðið um reikning. Ekkert úttektarreikningur fannst á ' + site + ' (leitað aðeins á þessum stað).');
    if (wantRep && pack.report) bits.push('Beðið um skýrslu. Fannst ' + pack.report.label + ' á ' + site + '.');
    else if (wantRep && !pack.report) bits.push('Beðið um skýrslu. Engin úttektarskýrsla fannst á ' + site + '.');
    if (!bits.length) {
      if (pack.invoice || pack.report) bits.push('Skjöl fundin á ' + site + (pack.invoice ? ': ' + pack.invoice.label : '') + (pack.report ? (pack.invoice ? ' · ' : ': ') + pack.report.label : '') + '.');
      else if (site !== 'staðnum') bits.push('Tengdur staður: ' + site + '. Reikningur og skýrsla ekki fundin hér — athugaðu nafn eða hlaða inn viðhengi.');
      else bits.push('Ekkert fyrirtæki tengt. Tengdu stað svo hægt sé að finna reikning og skýrslu.');
    }
    return bits.join(' ');
  }
  function buildReplyDraft(r, pack) {
    const nafn = String((r && r.customer_nafn) || '').trim() || 'þið';
    const lines = ['Góðan dag,', '', 'Takk fyrir póstinn.'];
    if (pack.invoice || pack.report) {
      lines.push('Hér eru skjölin sem við fundum:');
      if (pack.invoice) lines.push('- Reikningur: ' + pack.invoice.label + (pack.invoice.url ? ' — ' + pack.invoice.url : ''));
      if (pack.report) lines.push('- Skýrsla: ' + pack.report.label + (pack.report.url ? ' — ' + pack.report.url : ''));
    } else {
      lines.push('Við erum að ganga frá skjölinum og sendum þau strax og þau eru tilbúin.');
    }
    if (pack.villa) { lines.push('', pack.villa); }
    lines.push('', 'Bestu kveðjur,', 'Brunahólf Slökkvitæki');
    return lines.join('\n');
  }
  // 2026-08-31 (ósk Agnars): Forvinna sem „á ekkert við" á ekki að fylla VALIÐ MÁL.
  // Gagnlegt = reikningur, skýrsla, póstþráður, tvírætt nafn, villa, merkt Draft,
  // eða svar-drög sem starfsmaður hefur breytt. Ekki: fannst-ekki, tóm saga,
  // sjálfvirk drög, eða „enn að sækja". Keep in sync with tools/test-verkbord-draft.cjs
  function draftPackIsUseful(pack, r) {
    if (!pack) return false;
    if (pack.invoice || pack.report || pack.ambiguous) return true;
    const th = pack.thread || [];
    for (let i = 0; i < th.length; i++) {
      if (String((th[i] && th[i].text) || '').trim()) return true;
    }
    if (/Forvinna klikkaði/i.test(String(pack.villa || ''))) return true;
    if (r && rowTags(r).indexOf('draft') !== -1) return true;
    const reply = String(pack.reply || '').trim();
    if (reply && r) {
      const expected = String(buildReplyDraft(r, pack) || '').trim();
      if (reply !== expected) return true;
    }
    return false;
  }
  function readDraftOpenMap() {
    try {
      const raw = localStorage.getItem('vb_forvinna_open');
      const o = raw ? JSON.parse(raw) : {};
      return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
    } catch (_) { return {}; }
  }
  function writeDraftOpen(id, on) {
    const k = String(id);
    state.draftOpen[k] = !!on;
    try {
      const o = readDraftOpenMap();
      o[k] = on ? 1 : 0;
      const keys = Object.keys(o);
      if (keys.length > 100) {
        keys.slice(0, keys.length - 80).forEach(function (old) { delete o[old]; });
      }
      localStorage.setItem('vb_forvinna_open', JSON.stringify(o));
    } catch (_) {}
  }
  function isDraftPanelOpen(r, pack) {
    if (!r || r.id == null) return false;
    const k = String(r.id);
    if (Object.prototype.hasOwnProperty.call(state.draftOpen, k)) return !!state.draftOpen[k];
    const o = readDraftOpenMap();
    if (Object.prototype.hasOwnProperty.call(o, k)) return o[k] === 1;
    if (state.draftBusy[r.id] && !pack) return false;
    return draftPackIsUseful(pack, r);
  }
  async function loadDraftPack(r, force) {
    if (!r || r._vd) return null;
    const id = r.id;
    if (!force) {
      const cached = state.draftPack[id] || parseDraftSummary(r.summary);
      if (cached && cached.v === 1 && !cached.stale) {
        state.draftPack[id] = cached;
        return cached;
      }
    }
    state.draftBusy[id] = true;
    const SB = getSB();
    const pack = { v: 1, invoice: null, report: null, thread: [], villa: '', reply: '', links: [], historyUrl: '', fid: null, ambiguous: false, at: nowIso() };
    try {
      const nafn = String(r.customer_nafn || '').trim();
      let fid = null, kt = '', baseId = r.customer_base_id || null;
      if (nafn && SB) {
        const fy = await SB.from('fyrirtaeki').select('id,nafn,kennitala,customer_base_id')
          .ilike('nafn', nafn).is('deleted_at', null).range(0, 19);
        const hits = (fy.data || []).filter(x => foldName(x.nafn) === foldName(nafn));
        if (hits.length === 1) {
          fid = hits[0].id;
          kt = hits[0].kennitala || '';
          baseId = hits[0].customer_base_id || baseId;
        } else if (hits.length > 1) {
          pack.ambiguous = true;
        }
      }
      pack.fid = fid;
      if (window.SalaCustomerHistory && SalaCustomerHistory.urlFor) {
        pack.historyUrl = SalaCustomerHistory.urlFor(kt, nafn) || '';
      }
      if (fid && SB) {
        const docs = await SB.from('customer_documents')
          .select('id,year,doc_date,created_at,storage_path,drive_file_id,file_name,doc_type,invoice_number')
          .eq('fyrirtaeki_id', fid)
          .in('doc_type', ['uttektarskyrsla', 'brunakerfi', 'reikningur'])
          .eq('is_duplicate', false)
          .order('doc_date', { ascending: false })
          .range(0, 19);
        const rows = docs && !docs.error ? (docs.data || []) : [];
        const rep = rows.find(d => d.doc_type === 'uttektarskyrsla' || d.doc_type === 'brunakerfi');
        const invDoc = rows.find(d => d.doc_type === 'reikningur');
        if (rep) {
          pack.report = {
            id: rep.id, year: rep.year, date: rep.doc_date || rep.created_at,
            url: draftDocUrl(rep),
            label: (rep.doc_type === 'brunakerfi' ? 'Brunakerfisskýrsla' : 'Úttektarskýrsla') +
              (rep.year ? ' ' + rep.year : '')
          };
        }
        if (invDoc && draftDocUrl(invDoc)) {
          pack.invoice = pack.invoice || {
            id: invDoc.id, saleId: null, date: invDoc.doc_date || invDoc.created_at,
            url: draftDocUrl(invDoc),
            label: 'Reikningur' + (invDoc.invoice_number ? ' ' + invDoc.invoice_number : '')
          };
        }
        const sales = await SB.from('solur')
          .select('id,created_at,samtals,status,paid_at,source,vidskiptategund,invoice_number')
          .eq('customer_id', fid)
          .eq('is_credit', false)
          .order('created_at', { ascending: false })
          .range(0, 19);
        const ss = sales && !sales.error ? (sales.data || []).filter(s => !s.status || String(s.status) === 'final') : [];
        const utt = ss.find(s => String(s.source || '') === 'uttekt' || String(s.vidskiptategund || '') === 'uttekt') || ss[0];
        if (utt) {
          pack.invoice = {
            id: utt.id, saleId: utt.id, date: utt.created_at,
            url: pack.invoice && pack.invoice.url ? pack.invoice.url : '',
            label: 'Reikningur' + (utt.invoice_number ? ' ' + utt.invoice_number : '') +
              ' · ' + fmtKr(utt.samtals) + (utt.paid_at ? ' (greitt)' : '')
          };
        }
      }
      const ref = String(r.channel_ref || '');
      const digestId = ref.indexOf('email:') === 0 ? ref.slice(6) : '';
      if (SB && (digestId || r.title)) {
        let emails = [];
        if (digestId) {
          const one = await SB.from('email_digest').select('id,sender_name,sender_email,subject,snippet,body_preview,received_at')
            .eq('id', digestId).maybeSingle();
          if (one && one.data) emails.push(one.data);
        }
        const subj = String((emails[0] && emails[0].subject) || r.title || '').replace(/^(re|fw|fwd|sv|vs)\s*:\s*/ig, '').trim();
        if (subj) {
          const more = await SB.from('email_digest')
            .select('id,sender_name,sender_email,subject,snippet,body_preview,received_at')
            .eq('account', 'eldklar@eldklar.is')
            .ilike('subject', '%' + subj.slice(0, 80) + '%')
            .order('received_at', { ascending: false }).range(0, 7);
          (more && more.data || []).forEach(e => {
            if (!emails.some(x => x.id === e.id)) emails.push(e);
          });
        }
        pack.thread = emails.slice(0, 6).map(e => ({
          at: e.received_at, from: e.sender_name || e.sender_email || '',
          mine: /eldklar/i.test(e.sender_email || ''),
          text: String(e.body_preview || e.snippet || '').replace(/\s+/g, ' ').trim().slice(0, 280)
        }));
      }
      if (pack.historyUrl) pack.links.push({ label: 'Samskipta-/viðskiptasaga', href: pack.historyUrl });
      if (pack.report && pack.report.url) pack.links.push({ label: pack.report.label, href: pack.report.url });
      if (pack.invoice && pack.invoice.url) pack.links.push({ label: pack.invoice.label, href: pack.invoice.url });
      pack.villa = buildVilla(r, pack);
      pack.reply = buildReplyDraft(r, pack);
    } catch (e) {
      pack.villa = 'Forvinna klikkaði: ' + ((e && e.message) || e);
    }
    state.draftBusy[id] = false;
    state.draftPack[id] = pack;
    return pack;
  }
  async function saveDraftPack(r) {
    const pack = state.draftPack[r.id] || await loadDraftPack(r, true);
    if (!pack) return;
    const ta = document.getElementById('vb-draft-reply');
    if (ta) pack.reply = ta.value;
    const tags = rowTags(r);
    if (tags.indexOf('draft') === -1) tags.push('draft');
    const nextTags = tagsWithCategory(r, tags);
    await saveRow(r.id, { summary: encodeDraftSummary(pack), tags: nextTags });
    r.summary = encodeDraftSummary(pack);
    r.tags = nextTags;
    toast('📝 Draft vistað — reikningur, skýrsla og svar-drög á málinu');
    renderControls(); renderList(); renderSel();
  }
  async function openDraftInvoice(saleId) {
    const SB = getSB();
    if (!saleId || !SB || !window.SalaInvoice || typeof SalaInvoice.renderFromSale !== 'function') {
      toast('Reikningsmótið er ekki tiltækt'); return;
    }
    const w = window.open('', '_blank', 'width=900,height=1100');
    if (!w) { toast('Leyfðu sprettiglugga til að opna reikning'); return; }
    const r = await SB.from('solur').select('*').eq('id', saleId).single();
    if (r.error || !r.data) { w.close(); toast('Salan fannst ekki'); return; }
    const sale = r.data;
    let cust = null;
    if (sale.customer_id) {
      const f = await SB.from('fyrirtaeki').select('nafn,kennitala,heimilisfang').eq('id', sale.customer_id).maybeSingle();
      cust = f && f.data;
    }
    try { SalaInvoice.renderFromSale(w, sale, cust); } catch (e) { toast('Villa: ' + (e.message || e)); }
  }
  function draftPackHTML(r) {
    if (r._vd) return '';
    const busy = !!state.draftBusy[r.id];
    const pack = state.draftPack[r.id] || parseDraftSummary(r.summary);
    if (!isDraftPanelOpen(r, pack)) return '';
    const on = rowTags(r).indexOf('draft') !== -1;
    const row = function (label, body) {
      return '<div style="display:flex;gap:8px;align-items:flex-start;margin:0 0 8px">' +
        '<div style="flex:none;width:88px;font-size:10.5px;font-weight:800;letter-spacing:.04em;color:#92400e;text-transform:uppercase;padding-top:2px">' + label + '</div>' +
        '<div style="flex:1;min-width:0;font-size:12.5px;color:#1c1917;line-height:1.45">' + body + '</div></div>';
    };
    const link = function (href, label, act, extra) {
      if (act) {
        return '<button data-act="' + act + '" data-id="' + esc(r.id) + '"' + (extra || '') +
          ' type="button" style="border:0;background:none;padding:0;font:inherit;font-size:12.5px;font-weight:700;color:#1d4ed8;cursor:pointer;text-align:left">' + esc(label) + '</button>';
      }
      if (!href) return '<span style="color:#78716c">' + esc(label) + '</span>';
      return '<a href="' + esc(href) + '" target="_blank" rel="noopener" style="color:#1d4ed8;font-weight:700;text-decoration:none">' + esc(label) + '</a>';
    };
    let body;
    if (busy && !pack) {
      body = '<div style="font-size:12.5px;color:#78716c">Sæki reikning, skýrslu og samskipti…</div>';
    } else if (!pack) {
      body = '<div style="font-size:12.5px;color:#57534e;margin-bottom:8px">Finna reikning, skýrslu, slóðir, samskiptasögu og semja svar-drög. Hengdu svo viðhengi hér fyrir neðan.</div>';
    } else {
      const invBody = pack.invoice
        ? (pack.invoice.saleId
            ? link('', pack.invoice.label, 'draftinv', ' data-sale="' + esc(pack.invoice.saleId) + '"')
            : link(pack.invoice.url, pack.invoice.label))
        : '<span style="color:#b45309">Fannst ekki á þessum stað</span>';
      const repBody = pack.report
        ? link(pack.report.url, pack.report.label)
        : '<span style="color:#b45309">Fannst ekki á þessum stað</span>';
      const histBody = pack.historyUrl
        ? link('', 'Opna fyrri viðskipti', 'drafthist')
        : '<span style="color:#78716c">Tengdu fyrirtæki</span>';
      const extra = (pack.links || []).filter(l => l.href && l.label).map(l =>
        '<div style="margin-top:3px">' + link(l.href, l.label) + '</div>').join('');
      const th = (pack.thread || []).slice(0, 4).map(t =>
        '<div style="margin:0 0 6px;padding:7px 9px;border-radius:8px;background:' + (t.mine ? '#ecfdf5' : '#fff7ed') + ';border:1px solid ' + (t.mine ? '#a7f3d0' : '#fed7aa') + '">' +
          '<div style="font-size:10.5px;font-weight:700;color:#78716c">' + esc((t.mine ? 'Við' : (t.from || 'Sendandi')) + (t.at ? ' · ' + fmtShortDate(t.at) : '')) + '</div>' +
          '<div style="font-size:12px;color:#1c1917;margin-top:2px">' + esc(t.text || '') + '</div></div>'
      ).join('') || '<span style="color:#78716c">Enginn póstþráður á þessu máli</span>';
      body =
        row('Reikningur', invBody) +
        row('Skýrsla', repBody) +
        row('Saga', histBody + extra) +
        row('Villa', '<div style="white-space:pre-wrap">' + esc(pack.villa || '') + '</div>') +
        row('Samskipti', th) +
        '<div style="margin-top:4px">' +
          '<div style="font-size:10.5px;font-weight:800;letter-spacing:.04em;color:#92400e;text-transform:uppercase;margin-bottom:4px">Svar (drög)</div>' +
          '<textarea id="vb-draft-reply" data-id="' + esc(r.id) + '" rows="6" ' +
            'style="width:100%;box-sizing:border-box;font:inherit;font-size:12.5px;line-height:1.5;padding:8px 10px;border:1px solid #fbbf24;border-radius:8px;background:#fffbeb;color:#1c1917;resize:vertical;min-height:88px">' +
            esc(pack.reply || '') + '</textarea></div>';
    }
    return '<div id="vb-draft" style="border:1px solid #f59e0b;border-radius:12px;background:linear-gradient(180deg,#fffbeb,#fff7ed);padding:12px 12px 10px;margin:0 0 12px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">' +
        '<span style="font-size:12px;font-weight:800;color:#92400e">📝 Forvinna' + (on ? ' · Draft' : '') + '</span>' +
        '<button data-act="drafttoggle" data-id="' + esc(r.id) + '" type="button" title="Fella Forvinnu" ' +
          'style="height:22px;padding:0 7px;border-radius:6px;border:1px solid #f59e0b;background:#fff;color:#92400e;font-family:inherit;font-size:10.5px;font-weight:700;cursor:pointer">▾ Fella</button>' +
        '<span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">' +
          '<button data-act="draftrun" data-id="' + esc(r.id) + '" type="button" ' +
            'style="height:28px;padding:0 10px;border-radius:7px;border:1px solid #d97706;background:#fff;color:#92400e;font-family:inherit;font-size:11.5px;font-weight:700;cursor:pointer">' +
            (pack ? '↻ Endursækja' : 'Finna skjöl') + '</button>' +
          (pack ? '<button data-act="draftsave" data-id="' + esc(r.id) + '" type="button" ' +
            'style="height:28px;padding:0 10px;border-radius:7px;border:1px solid #b45309;background:#b45309;color:#fff;font-family:inherit;font-size:11.5px;font-weight:700;cursor:pointer">Merkja Draft</button>' : '') +
          (pack && isEmailBeidni(r) ? '<button data-act="draftreply" data-id="' + esc(r.id) + '" type="button" ' +
            'style="height:28px;padding:0 10px;border-radius:7px;border:1px solid #0f766e;background:#0f766e;color:#fff;font-family:inherit;font-size:11.5px;font-weight:700;cursor:pointer">✉ Svara með drögum</button>' : '') +
        '</span></div>' + body +
      '<div style="font-size:11px;color:#a16207;margin-top:8px">Viðhengi opnast hér undir. Ekkert sent fyrr en þú ýtir á Svara.</div>' +
    '</div>';
  }

  async function uploadAttachment(beidniId, file) {
    const SB = getSB(); if (!SB) return;
    toast('Hleð upp...');
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = String(beidniId) + '/' + Date.now() + '-' + safeName;
    const { error: upErr } = await SB.storage.from(ATT_BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (upErr) { toast('Villa við upphleðslu: ' + (upErr.message || upErr)); return; }
    const { data: urlData } = SB.storage.from(ATT_BUCKET).getPublicUrl(path);
    const { error: insErr } = await SB.from('thjonustubeidni_files').insert({
      beidni_id: Number(beidniId), name: file.name, path,
      url: urlData ? urlData.publicUrl : null,
      mime_type: file.type || null, size: file.size || null
    });
    if (insErr) { toast('Villa við skráningu: ' + (insErr.message || insErr)); return; }
    toast(file.name + ' vistað');
    await loadAttachments(beidniId);
    renderSel();
  }

  async function deleteAttachment(attId, path, beidniId) {
    const SB = getSB(); if (!SB) return;
    if (path) await SB.storage.from(ATT_BUCKET).remove([path]);
    await SB.from('thjonustubeidni_files').delete().eq('id', attId);
    await loadAttachments(beidniId);
    renderSel();
  }

  // Global handlers referenced from inline HTML (onchange/onclick)
  window.__vbUpload = function (ev, beidniId) {
    const f = ev.target && ev.target.files && ev.target.files[0]; if (!f) return;
    uploadAttachment(beidniId, f);
    ev.target.value = '';  // reset so same file can be re-uploaded
  };
  window.__vbDelAtt = async function (attId, path, beidniId) {
    const ok = (window.Confirm && Confirm.show) ? await Confirm.show('Eyða fylgiskjali?') : window.confirm('Eyða fylgiskjali?');
    if (!ok) return;
    deleteAttachment(attId, path, beidniId);
  };

  function attFileIcon(mime) {
    if (!mime) return '📄';
    if (mime.startsWith('image/')) return '🖼';
    if (mime === 'application/pdf') return '📑';
    if (mime.includes('word') || mime.includes('document')) return '📝';
    if (mime.includes('sheet') || mime.includes('excel')) return '📊';
    return '📄';
  }

  function fmtSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function attSectionHTML(r) {
    const atts = state.attachments[r.id] || [];
    const bid = esc(String(r.id));
    return '<div style="border-top:1px solid #f1f3f5;padding-top:10px;margin-top:6px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">' +
        '<span style="font-size:10.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px">📎 Fylgiskjöl</span>' +
        '<label style="cursor:pointer;height:26px;padding:0 10px;border-radius:7px;border:1px solid #d8dadf;background:#fff;' +
          'font-size:11px;font-weight:700;color:#4b5058;font-family:inherit;display:inline-flex;align-items:center;gap:4px">' +
          '＋ Hlaða inn<input type="file" multiple style="display:none" onchange="window.__vbUpload(event,' + bid + ')">' +
        '</label>' +
        '<label style="margin-left:auto;display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px">Starfsmaður' +
          '<select id="vb-sel-worker" data-field="assigned_to" data-id="' + bid + '" title="Setja mál á starfsmann" ' +
          'style="text-transform:none;letter-spacing:0;height:26px;padding:0 8px;border-radius:7px;border:1px solid #d8dadf;background:#fff;color:#16181d;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer">' +
          assigneeOptionsHtml(r) + '</select></label>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:8px">' +
        '<span style="font-size:10.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px">Tagga starfsmann</span>' +
        tagWorkerButtonsHtml(r) +
      '</div>' +
      (atts.length
        ? atts.map(function (a) {
            return '<div style="display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid #f8fafc">' +
              '<span style="font-size:15px;flex:none">' + attFileIcon(a.mime_type) + '</span>' +
              '<a href="' + esc(a.url || '') + '" target="_blank" rel="noopener" ' +
                'style="flex:1;min-width:0;font-size:12px;color:#2563eb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-decoration:none" ' +
                'title="' + esc(a.name) + '">' + esc(a.name) + '</a>' +
              '<span style="font-size:10.5px;color:#9aa0aa;flex:none">' + fmtSize(a.size) + '</span>' +
              '<button onclick="window.__vbDelAtt(' + a.id + ',\'' + esc(a.path || '') + '\',' + bid + ')" ' +
                'style="border:none;background:none;color:#dc2626;cursor:pointer;font-size:14px;padding:2px 5px;flex:none;line-height:1" ' +
                'title="Eyða">✕</button>' +
            '</div>';
          }).join('')
        : '<div style="font-size:12px;color:#9aa0aa;padding:4px 0">' +
          (rowTags(r).indexOf('draft') !== -1
            ? 'Hengdu reikning eða skýrslu hér — eða opnaðu slóðina í forvinnunni hér að ofan.'
            : 'Engin fylgiskjöl') + '</div>') +
    '</div>';
  }

  async function saveRow(id, patch) {
    const SB = getSB(); if (!SB) return;
    patch.updated_at = nowIso();
    const row = state.items.find(x => String(x.id) === String(id));
    if (row) Object.assign(row, patch);
    try { const r = await SB.from('thjonustubeidni').update(patch).eq('id', id); if (r.error) throw r.error; }
    catch (e) { toast('Náði ekki að vista: ' + (e.message || e)); }
  }
  async function softDelete(id) {
    const SB = getSB(); if (!SB) return;
    const delOk = (window.Confirm && Confirm.show) ? await Confirm.show('Eyða þessu verki? (geymist sem eytt og endurheimtanlegt)') : window.confirm('Eyða þessu verki? (geymist sem eytt og endurheimtanlegt)');
    if (!delOk) return;
    try {
      const r = await SB.from('thjonustubeidni').update({ deleted_at: nowIso() }).eq('id', id);
      if (r.error) throw r.error;
      state.items = state.items.filter(x => x.id !== id);
      if (state.expandedId === id) state.expandedId = null;
      renderControls(); renderList(); refreshBadge();
    } catch (e) { toast('Eyðing mistókst: ' + (e.message || e)); }
  }
  // Fljót-eyðing af listanum — engin staðfesting (mjúk eyðing, endurheimtanleg).
  async function quickDelete(id) {
    const SB = getSB(); if (!SB) return;
    const row = state.items.find(x => x.id === id);
    // Bjartsýn: fjarlægja strax úr sýn svo það sé snöggt.
    state.items = state.items.filter(x => x.id !== id);
    if (state.expandedId === id) state.expandedId = null;
    renderControls(); renderList(); refreshBadge();
    try {
      const r = await SB.from('thjonustubeidni').update({ deleted_at: nowIso() }).eq('id', id);
      if (r.error) throw r.error;
    } catch (e) { toast('Eyðing mistókst: ' + (e.message || e)); if (row) { state.items.push(row); renderControls(); renderList(); } }
  }
  // „Reikningur hefur verið greiddur" o.þ.h. eru Payday/Mailchimp GREIÐSLU-
  // TILKYNNINGAR — upplýsingar, ekki verk. Þær soguðust inn og blésu listann upp
  // í 400+. Þekkja þær svo hægt sé að hreinsa í einu lagi (og telja í hausnum).
  function isPaymentNoise(r) {
    if (!r || r._vd) return false;
    const t = String(r.title || '').toLowerCase();
    return /reikningur hefur verið greiddur|greiðslustaðfesting|payment (received|confirmation)|hefur verið greidd/.test(t);
  }
  async function clearPaymentNoise() {
    const SB = getSB(); if (!SB) return;
    const noisy = state.items.filter(isPaymentNoise);
    if (!noisy.length) { toast('Engar greiðslu-tilkynningar til að hreinsa'); return; }
    const clearMsg = 'Fela ' + noisy.length + ' greiðslu-tilkynningar? (Payday „reikningur greiddur" — upplýsingar, ekki verk. Endurheimtanlegt.)';
    const clearOk = (window.Confirm && Confirm.show) ? await Confirm.show(clearMsg) : window.confirm(clearMsg);
    if (!clearOk) return;
    const ids = noisy.map(x => x.id);
    state.items = state.items.filter(x => !isPaymentNoise(x));
    renderControls(); renderList(); refreshBadge();
    try {
      for (let i = 0; i < ids.length; i += 100) {
        const r = await SB.from('thjonustubeidni').update({ deleted_at: nowIso() }).in('id', ids.slice(i, i + 100));
        if (r.error) throw r.error;
      }
      toast('🧹 ' + ids.length + ' greiðslu-tilkynningar faldar');
    } catch (e) { toast('Hreinsun stöðvaðist: ' + (e.message || e)); load(); }
  }
  async function clearOldYearReports() {
    const SB = getSB(); if (!SB) return;
    const old = state.items.filter(x => isOpen(x) && !isArchived(x) && isOldYearReport(x));
    if (!old.length) { toast('Engar skýrslur 2023–2025 á borðinu'); return; }
    const msg = 'Fela ' + old.length + ' skýrslumál 2023–2025? Þau eru ekki vinnan þessa árs. Endurheimtanlegt í geymslu.';
    const ok = (window.Confirm && Confirm.show) ? await Confirm.show(msg, { okText: 'Fela', cancelText: 'Hætta við' }) : false;
    if (!ok) {
      if (!(window.Confirm && Confirm.show)) toast('Staðfestingargluggi vantar — ekkert falið');
      return;
    }
    const stamp = nowIso();
    const ids = old.map(x => x.id);
    old.forEach(x => { x.archived_at = stamp; });
    renderControls(); renderList(); refreshBadge();
    try {
      for (let i = 0; i < ids.length; i += 100) {
        const r = await SB.from('thjonustubeidni').update({ archived_at: stamp }).in('id', ids.slice(i, i + 100));
        if (r.error) throw r.error;
      }
      toast('📦 ' + ids.length + ' skýrslur 2023–2025 faldar');
    } catch (e) { toast('Hreinsun stöðvaðist: ' + (e.message || e)); load(); }
  }
  async function vdSetDone(rawId) {
    const SB = getSB(); if (!SB) return;
    try {
      const r = await SB.from('verkdagbok').update({ done: true }).eq('id', rawId);
      if (r.error) throw r.error;
      state.vd = state.vd.filter(x => x.id !== rawId);
      renderControls(); renderList(); refreshBadge();
    } catch (e) { toast('Tókst ekki: ' + (e.message || e)); }
  }
  async function vdArchive(rawId) {
    const SB = getSB(); if (!SB) return;
    try {
      const r = await SB.from('verkdagbok').update({ archived: true }).eq('id', Number(rawId));
      if (r.error) throw r.error;
      state.vd = state.vd.filter(x => String(x.id) !== String(rawId));
      if (String(state.selId) === 'vd:' + rawId) state.selId = null;
      renderControls(); renderList(); renderSel(); refreshBadge();
    } catch (e) { toast('Fela mistókst: ' + (e.message || e)); }
  }

  // ✨ next-step suggestion via the existing /api/tv-summary endpoint (#182).
  async function aiSuggest(id) {
    const row = state.items.find(x => x.id === id);
    if (!row) return;
    const btn = document.querySelector('.vb-ai[data-id="' + id + '"]');
    if (btn) { btn.disabled = true; btn.textContent = '… hugsa'; }
    try {
      const items = [{ id: row.id, customer_nafn: row.customer_nafn, type: row.type, title: row.title, notes: row.notes }];
      const r = await fetch('/api/tv-summary', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items }) });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || (data && data.error)) throw new Error((data && data.error) || ('HTTP ' + r.status));
      const sums = (data && data.summaries) || {};
      const txt = sums[row.id] || sums[String(row.id)];
      if (txt) { row.summary = txt; saveRow(id, { summary: txt }); renderList(); }
      else { toast('Engin tillaga kom til baka'); if (btn) { btn.disabled = false; btn.textContent = '✨ Tillaga'; } }
    } catch (e) { toast('Tillaga mistókst: ' + (e.message || e)); if (btn) { btn.disabled = false; btn.textContent = '✨ Tillaga'; } }
  }

  // ── filtering / sorting ──────────────────────────────────────────────────
  // Pósthólf vs Verkefni (2026-07-10, ósk Agnars — „handvirkt sér… ákveðnir
  // póstar sem voru færðir yfir… og síðan pósthólf"): sjálfvirkt innsognir
  // póstar (channel_ref 'email:…') sitja í 📧 Pósthólfi þar til þeir eru
  // „📋 færðir yfir" (promoted_at sett) — þá teljast þeir með handvirku
  // verkefnunum í 📋 Verkefni. Handvirk skráning fer alltaf beint í Verkefni.
  function isPost(r) {
    if (r._vd || r.promoted_at) return false;
    return r.source === 'email' || /^email:/.test(String(r.channel_ref || ''));
  }
  // Geymslan (Þjónustuborð v2): gamli póst-staflinn ber archived_at — sést
  // undir „📦 Eldra" í innhólfinu, telst hvergi annars staðar. Ekkert eytt.
  function isArchived(r) { return !r._vd && !!r.archived_at; }
  // „Svarað": annaðhvort svarað AF borðinu (svarad_at sett við Resend-send)
  // eða nýjasta skeytið í þræðinum er frá okkur (threadLatest.mine).
  function isReplied(r) {
    if (r.svarad_at) return true;
    const tl = state.threadLatest[r.id];
    return !!(tl && tl.mine);
  }
  // „Bíður svars" = opinn innhólfspóstur sem við höfum ekki svarað.
  function isWaiting(r) { return isPost(r) && !isArchived(r) && isOpen(r) && !isReplied(r); }
  function waitDays(r) {
    const d = Math.floor((Date.now() - new Date(r.created_at || Date.now())) / 86400000);
    return d < 0 ? 0 : d;
  }
  function inQueue(r) {
    const q = effectiveQueue();
    if (isOldYearReport(r) && !state.showOldReports) {
      if (q === 'lokad') return !isOpen(r);
      return false;
    }
    if (q === 'lokad') return !isOpen(r);
    if (q === 'post') return isOpen(r) && isPost(r) && (state.showOld ? true : !isArchived(r));
    if (q === 'allt') return isOpen(r) && !isArchived(r);
    return isOpen(r) && !isPost(r) && !isArchived(r);
  }
  // 2026-07-10: gamla type-sían fjarlægð (flokkun fer nú gegnum MERKI). Hlutlaus
  // svo gömul vistuð type-sía í localStorage feli ekki raðir. (Fall haldið til
  // öryggis ef eitthvað kallar enn á það.)
  function inFilter() { return true; }
  // Merkja-sían nær líka yfir gömlu type-flokkana sem sjást á póst-röðunum
  // (röð án merkja sýnir type-chippann — þá á að vera hægt að sía eftir honum).
  const TYPE_TO_TAG = {
    tilbod: 'gera_tilbod', skodun_tilbod: 'gera_tilbod',
    hringja: 'hringja',
    samningur: 'thjonustusamningur', nyr_samningur: 'thjonustusamningur'
  };
  function effTags(r) {
    const t = rowTags(r);
    if (t.length) return t;
    const m = TYPE_TO_TAG[r && r.type];
    return m ? [m] : [];
  }
  /* Hversu mörg mál FELUR sían? Sama grunnmengi og visibleRows byrjar á, svo
     talan er raunveruleg en ekki áætluð. Leitarstrengurinn er EKKI talinn með —
     hann stendur í reitnum og notandinn veit af honum. Hinar fjórar (flokkur,
     merki, starfsmaður, stjarna) eru ósýnilegar þegar þær eru virkar.

     Agnar 01.09.2026: mál 817 var stílað á hann, lá óhreyft í viku og hann sá
     það ekki — sjálfgefna starfsmannasían er `nema_agnar`, „allir NEMA Agnar",
     og hún býr í localStorage svo hún er ólík á hverri tölvu. Hann hélt að
     borðið væri ekki að samstillast. Sían á að segja frá sér. */
  function faldirAfSiu() {
    const grunnur = allItems().filter(x => inQueue(x) && inFilter(x));
    const eftir = grunnur.filter(x => {
      if (state.fFlokk && (state.fFlokk === 'annad' ? !!rowFlokk(x) : rowFlokk(x) !== state.fFlokk)) return false;
      if (state.fTags.length) { const dt = rowChips(x); if (!state.fTags.some(t => dt.indexOf(t) !== -1)) return false; }
      if (state.fWorker && state.fWorker !== 'allir' && !matchesWorker(x)) return false;
      if (state.fStar && !x.important) return false;
      return true;
    });
    return { faldir: grunnur.length - eftir.length, alls: grunnur.length };
  }

  function siuBordi(f) {
    if (!f || f.faldir <= 0) return '';
    return '<div id="vb-siubordi" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;'
      + 'padding:9px 13px;border-radius:11px;border:1px solid #fcd34d;background:#fffbeb;color:#78350f;font-size:12.5px">'
      + '<span style="font-weight:800">Sía er virk</span>'
      + '<span>' + f.faldir + ' af ' + f.alls + ' málum eru falin'
      + (state.fWorker && state.fWorker !== 'allir'
          ? ' · starfsmaður: <b>' + esc(state.fWorker === 'nema_agnar' ? 'Allir án Agnars' : state.fWorker) + '</b>' : '')
      + (state.fTags.length ? ' · merki: <b>' + esc(state.fTags.join(', ')) + '</b>' : '')
      + (state.fFlokk ? ' · flokkur: <b>' + esc(state.fFlokk) + '</b>' : '')
      + (state.fStar ? ' · aðeins áríðandi' : '')
      + '</span>'
      + '<button id="vb-hreinsa-siu" type="button" style="margin-left:auto;height:30px;padding:0 12px;border-radius:9px;'
      + 'border:1px solid #b45309;background:#b45309;color:#fff;font:inherit;font-size:12px;font-weight:700;cursor:pointer">'
      + 'Sýna allt</button></div>';
  }

  /* „Sýna allt" hreinsar ALLAR fjórar síurnar OG localStorage-gildin þeirra —
     annars kæmi sama sían aftur við næstu opnun og notandinn stæði í sömu
     sporum á morgun. */
  function wireSiuBordi() {
    const b = document.getElementById('vb-hreinsa-siu');
    if (!b) return;
    b.addEventListener('click', function () {
      state.fWorker = 'allir'; state.fTags = []; state.fFlokk = ''; state.fStar = false;
      try {
        localStorage.setItem(WKEY, 'allir');
        localStorage.setItem(TGKEY, '[]');
      } catch (_) {}
      renderControls(); renderList(); renderSel(); refreshBadge();
    });
  }

  function visibleRows() {
    let r = allItems().filter(x => inQueue(x) && inFilter(x));
    // Flokka-sían (v2): '' = allt, 'annad' = án flokks, annars einn af fimm.
    if (state.fFlokk) r = r.filter(x => (state.fFlokk === 'annad' ? !rowFlokk(x) : rowFlokk(x) === state.fFlokk));
    // v3 TÖG-sían: merki notandans ∪ flokks-leidd merki, + ⭐ Áríðandi.
    // Fleiri en eitt merki valið = ALLT sem ber eitthvert þeirra (sameining),
    // svo það að bæta við merki víkkar listann í stað þess að tæma hann.
    if (state.fTags.length) r = r.filter(x => { const dt = rowChips(x); return state.fTags.some(t => dt.indexOf(t) !== -1); });
    if (state.fWorker && state.fWorker !== 'allir') r = r.filter(x => matchesWorker(x));
    if (state.fStar) r = r.filter(x => !!x.important);
    const s = state.search.trim().toLowerCase();
    if (s) r = r.filter(x => [x.customer_nafn, x.title, x.notes].some(f => (f || '').toLowerCase().includes(s)));
    // v3 dálkaröðun (DAGS./MÁL/STAÐA hausar) — trompar aðrar raðanir þegar valin.
    if (state.colSort) {
      const cs = state.colSort, dir = cs.dir === 'asc' ? 1 : -1;
      r.sort((a, b) => {
        let av, bv;
        if (cs.key === 'dags') { av = new Date(a.created_at || 0).getTime(); bv = new Date(b.created_at || 0).getTime(); }
        else if (cs.key === 'stada') { av = STATUS_ORDER.indexOf(a.status); bv = STATUS_ORDER.indexOf(b.status); }
        else { av = ((a.customer_nafn || '') + ' ' + (a.title || '')).toLowerCase(); bv = ((b.customer_nafn || '') + ' ' + (b.title || '')).toLowerCase(); }
        return av < bv ? -dir : av > bv ? dir : 0;
      });
      return r;
    }
    // Innhólfið raðast sér: ósvarað ELST efst (því lengur sem kúnni bíður, því
    // ofar), svo svarað/upplýsingar nýjast efst, geymslan (ef sýnd) aftast.
    if (effectiveQueue() === 'post' && state.sort !== 'nyjast') {
      r.sort((a, b) => {
        const aa = isArchived(a) ? 1 : 0, ba = isArchived(b) ? 1 : 0;
        if (aa !== ba) return aa - ba;
        const aw = isWaiting(a) ? 0 : 1, bw = isWaiting(b) ? 0 : 1;
        if (aw !== bw) return aw - bw;
        if (!aw) return new Date(a.created_at || 0) - new Date(b.created_at || 0); // bíða: elst efst
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
      return r;
    }
    if (state.sort === 'nyjast') {
      // Hrein dagsetningarröð — nýjast efst (ósk Agnars 2026-07-10).
      r.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      return r;
    }
    const prio = { har: 0, venjulegur: 1, lagur: 2 };
    r.sort((a, b) => {
      // áríðandi efst, svo útrunnið/gjalddagi, svo forgangur, svo nýjast.
      const ai = (a.important ? 1 : 0), bi = (b.important ? 1 : 0);
      if (ai !== bi) return bi - ai;
      const ao = isOverdue(a) ? 1 : 0, bo = isOverdue(b) ? 1 : 0;
      if (ao !== bo) return bo - ao;
      const ad = dueInfo(a.due_at), bd = dueInfo(b.due_at);
      const adv = ad ? ad.diff : 99999, bdv = bd ? bd.diff : 99999;
      if (adv !== bdv) return adv - bdv;
      const ap = prio[a.priority] ?? 1, bp = prio[b.priority] ?? 1;
      if (ap !== bp) return ap - bp;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    return r;
  }
  function counts() {
    const all = allItems();
    const c = { idag: 0, verk: 0, post: 0, allt: 0, geymsla: 0, lokad: 0, wait: 0, od: 0, oldReports: 0 };
    for (const x of all) {
      if (isOldYearReport(x) && isOpen(x) && !isArchived(x)) c.oldReports++;
      if (isOldYearReport(x) && !state.showOldReports) {
        if (!isOpen(x) && matchesWorker(x)) c.lokad++;
        continue;
      }
      if (!matchesWorker(x)) continue;
      if (!isOpen(x)) { c.lokad++; continue; }
      if (isPost(x)) {
        if (isArchived(x)) { c.geymsla++; continue; }
        c.post++;
        if (isWaiting(x)) c.wait++;
        continue;
      }
      if (isArchived(x)) { c.geymsla++; continue; }
      c.verk++;
      if (isToday(x)) c.idag++;
      if (isOverdue(x)) c.od++;
    }
    c.allt = c.post + c.verk;
    return c;
  }

  // ── sidebar nav ──────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const tpl = nav.querySelector('.vnav-btn');
    if (!tpl) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (tpl.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.style.cssText += ';position:relative;z-index:5;display:flex;align-items:center';
    btn.innerHTML = '<span style="margin-right:6px">🔧</span>Þjónustuborð' +
      ' <span class="vb-badge" style="margin-left:auto;background:#fff;color:#b91c1c;font-size:10px;font-weight:800;padding:1px 7px;border-radius:99px;display:none"></span>';
    btn.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (window.App && App.switchView) App.switchView(NAV_KEY); else show();
    });
    nav.insertBefore(btn, nav.firstChild); // efst — patch 68 heldur svo röðinni
    refreshBadge();
  }
  function refreshBadge() {
    const b = document.querySelector('.vb-badge');
    if (!b) return;
    // Badge = það sem kallar á athygli: póstar sem bíða svars + verk dagsins.
    const c = counts();
    const n = c.wait + c.idag;
    b.textContent = String(n);
    b.style.display = n > 0 ? 'inline-block' : 'none';
  }

  // ── view container + switchView hook ──────────────────────────────────────
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div');
    v.id = VIEW_ID;
    v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="vb-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
    injectStyle();
    wireDelegation(v);
    // Skipulagsborð (#304) les live gögn í gegnum þetta fall.
    window.VerkbordLiveItems = function () { return allItems(); };
    // Skipulagsborð sendir þetta event þegar notandi smellir á spjald.
    window.addEventListener('verkbord-select', function (ev) {
      const id = ev && ev.detail && ev.detail.id;
      if (!id) return;
      state.selId = id;
      state.expandedId = null;
      renderSel(); renderList();
      const el = document.getElementById('vb-controls');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
  function show() {
    ensureView();
    document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
    const v = document.getElementById(VIEW_ID);
    if (v) { v.style.display = 'block'; v.classList.add('active'); }
    document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === NAV_KEY));
    // Spegla slóðina (deep-link) — 231-wrapperinn skammhleypir framhjá patch 218
    // switchView-speglinum, svo hash sat fast á fyrri síðu (#sala).
    try { if (location.hash !== '#verkbord') history.replaceState(null, '', '#verkbord'); } catch (_) {}
    renderAll();
    retireOldOnce();
    load();
  }
  function patchSwitchView() {
    if (!window.App || window.App._vbSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) { show(); return; }
      return orig.apply(this, arguments);
    };
    window.App._vbSwitchPatched = true;
  }

  // ── one-time retire of the old lists ──────────────────────────────────────
  async function retireOldOnce() {
    try {
      if (!window.AppSettings || !AppSettings.save || !AppSettings.isLoaded || !AppSettings.isLoaded()) return;
      if (AppSettings.path('verkbord.retired_v1')) return;
      const hidden = (AppSettings.path('sidebar_hidden') || []).slice();
      const add = ['verkefni', 'thjonustuverk', 'thjonustuver', 'eftirfylgni'];
      add.forEach(h => { if (!hidden.some(x => String(x).toLowerCase() === h)) hidden.push(h); });
      const patch = { verkbord: { retired_v1: true }, sidebar_hidden: hidden };
      let order = AppSettings.path('sidebar_order');
      if (Array.isArray(order) && order.length &&
          !order.some(x => { const v = String(x).toLowerCase(); return v === 'verkbord' || v.indexOf('verkborð') !== -1; })) {
        patch.sidebar_order = ['verkbord'].concat(order);
      }
      const ok = await AppSettings.save(patch);
      if (!ok) { console.warn('[verkbord] retireOldOnce: save() returned false — skipping hide/toast'); return; }
      hideOldButtonsNow();
      toast('Faldi gömlu listana — sjást aftur í Stillingar → Valmynd ef þú vilt.');
    } catch (e) { console.warn('[verkbord] retireOldOnce', e); }
  }
  function hideOldButtonsNow() {
    const nav = document.querySelector('nav.view-nav, .view-nav'); if (!nav) return;
    const ids = ['thjonustuverk', 'thjonustuver', 'eftirfylgni'];
    nav.querySelectorAll('.vnav-btn').forEach(b => {
      const dv = b.getAttribute('data-view');
      const txt = (b.textContent || '').toLowerCase();
      if ((dv && ids.indexOf(dv) !== -1) || (!b.querySelector('.vb-badge') && /(^|\s)verkefni(\s|$)/.test(txt) && dv !== NAV_KEY)) {
        b.style.display = 'none';
      }
    });
  }

  // ── migration: import sensible open items from the old blob lists ─────────
  async function importOld() {
    const SB = getSB(); if (!SB) { toast('Engin gagnabankatenging'); return; }
    if (!window.AppSettings) { toast('Stillingar ekki tilbúnar'); return; }
    const existingRefs = new Set(state.items.map(x => x.channel_ref).filter(Boolean));
    const toInsert = [];
    // Verkefni (#145) — kanban cards not in a "done" column.
    const todo = AppSettings.path('todo');
    if (todo && Array.isArray(todo.columns)) {
      todo.columns.forEach(col => {
        const done = /klárað|done|lokið/i.test(col.title || '');
        (col.cards || []).forEach(card => {
          const ref = 'imp:verkefni:' + card.id;
          if (done || existingRefs.has(ref)) return;
          const title = (card.title || '').trim() || (card.body || '').trim().slice(0, 60) || '(án titils)';
          toInsert.push({
            title, notes: card.body || '', type: 'annad',
            status: /vinnsl/i.test(col.title || '') ? 'i_vinnslu' : 'nytt',
            priority: 'venjulegur', source: 'beint', important: false, channel_ref: ref,
            created_at: card.created_at || nowIso(), created_by: currentUser(), updated_at: nowIso()
          });
        });
      });
    }
    // Þjónustuverk (#172) — open cases.
    const tv = AppSettings.path('thjonustuverk');
    if (tv && Array.isArray(tv.cases)) {
      tv.cases.forEach(cs => {
        if (cs.status === 'lokid') return;
        const ref = 'imp:tverk:' + cs.id;
        if (existingRefs.has(ref)) return;
        const hasTilbod = cs.tilbod && (cs.tilbod.lines || cs.tilbod.items || []).length;
        toInsert.push({
          title: (cs.title || '').trim() || '(án titils)', notes: cs.body || '',
          type: hasTilbod ? 'tilbod' : 'annad',
          status: cs.status === 'i_vinnslu' ? 'i_vinnslu' : 'nytt',
          priority: 'venjulegur', source: 'beint', important: false, channel_ref: ref,
          customer_nafn: cs.customer_nafn || cs.customer || null,
          created_at: cs.created_at || nowIso(), created_by: currentUser(), updated_at: nowIso()
        });
      });
    }
    if (!toInsert.length) { toast('Ekkert nýtt að flytja inn — allt þegar komið.'); return; }
    const impMsg = 'Flytja inn ' + toInsert.length + ' atriði úr Verkefni + Þjónustuverk?';
    const impOk = (window.Confirm && Confirm.show) ? await Confirm.show(impMsg) : window.confirm(impMsg);
    if (!impOk) return;
    try {
      const r = await SB.from('thjonustubeidni').insert(toInsert).select();
      if (r.error) throw r.error;
      state.items = (r.data || []).concat(state.items);
      renderControls(); renderList(); refreshBadge();
      toast('Flutti inn ' + (r.data || []).length + ' atriði.');
    } catch (e) { toast('Innflutningur mistókst: ' + (e.message || e)); }
  }

  // ── styles ────────────────────────────────────────────────────────────────
  function injectStyle() {
    if (document.getElementById('verkbord-style')) return;
    const s = document.createElement('style');
    s.id = 'verkbord-style';
    s.textContent = `
      /* ═══ Þjónustuverk v3 (dc.html referens) ═══ */
      #view-verkbord { font-family: 'IBM Plex Sans', -apple-system, 'Segoe UI', sans-serif; color: #11141c;
        padding: 0 !important;
        background: linear-gradient(180deg, #060607 0px, #060607 120px, #aeb4be 420px, #9ba1ad 100%) !important; }
      /* 2026-08-06 (ósk Agnars — „almost full size to the background, almost to
         the sidebanner"): borðið nýtir nú nánast alla breidd efnissvæðisins í
         stað 1560px kassa í miðjunni. Efri mörkin halda bara aftur af því á
         mjög breiðum skjám svo línurnar verði ekki óþægilega langar. */
      #view-verkbord .vb-wrap { max-width: 2200px; width: 100%; margin: 0 auto; padding: 22px 20px 60px; box-sizing: border-box; }
      /* Ein skrunanleg chippa-lína (síma-mynstur). */
      #view-verkbord .vb-scroll { display: flex; gap: 7px; align-items: center; width: 100%;
        flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch;
        scrollbar-width: none; padding-bottom: 2px; }
      #view-verkbord .vb-scroll::-webkit-scrollbar { display: none; }
      #view-verkbord .vb-scroll > * { flex: 0 0 auto; }
      /* v3 raðir: zebra + hover-lyfting (úr referensinum). */
      #view-verkbord .task { position: relative; transition: background .12s ease; background: #fff; }
      #view-verkbord .task:nth-child(even) { background: #fbfcfe; }
      #view-verkbord .task:hover { background: #fff; box-shadow: 0 8px 24px -8px rgba(15,23,42,.26); z-index: 2; }
      #view-verkbord .task:hover > span:first-child { filter: brightness(1.15) saturate(1.2); }
      #view-verkbord .task.open { background: #fff; box-shadow: 0 8px 24px -8px rgba(15,23,42,.3); z-index: 3; }
      #view-verkbord button:active, #view-verkbord [data-act]:active { transform: translateY(1px); }
      #view-verkbord input:focus { border-color: #2f5fe0 !important; box-shadow: 0 0 0 3px rgba(47,95,224,.14) !important; }
      #view-verkbord .vb-empty { text-align: center; color: #5b6472; padding: 44px 18px;
        font-size: 14.5px; font-weight: 600; }
      /* Ritillinn (inni í opinni röð) — óbreytt virkni, ljóst kort. */
      #view-verkbord .vb-ed { margin-top: 12px; border-top: 1px dashed rgba(20,24,34,.14); padding-top: 12px; display: grid; gap: 10px; cursor: default; }
      #view-verkbord .vb-ed label { font-size: 10.5px; font-weight: 700; color: #8a93a5;
        letter-spacing: .12em; text-transform: uppercase; display: block; margin-bottom: 4px; }
      #view-verkbord .vb-ed input, #view-verkbord .vb-ed select, #view-verkbord .vb-ed textarea {
        font: inherit; font-size: 14px; border: 1px solid rgba(20,24,34,.14); border-radius: 9px;
        padding: 9px 12px; width: 100%; box-sizing: border-box; background: #eef1f6; color: #141822; outline: none; }
      #view-verkbord .vb-ed textarea { min-height: 140px !important; resize: vertical !important; line-height: 1.5; }
      #view-verkbord .vb-ed-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
      #view-verkbord .vb-ed-actions { display: flex; gap: 9px; flex-wrap: wrap; align-items: center; }
      #view-verkbord .vb-btn { font: inherit; font-size: 12.5px; font-weight: 600;
        padding: 9px 14px; border-radius: 9px; cursor: pointer; min-height: 38px;
        border: 1px solid rgba(20,24,34,.14); background: #f1f5f9; color: #3a4250; }
      #view-verkbord .vb-btn:hover { background: #e2e8f0; }
      #view-verkbord .vb-btn.red { border: 1px solid #f3c6c4; background: #fdecec; color: #c0241f; }
      #view-verkbord .vb-btn.green { background: linear-gradient(150deg,#2bbf6c,#0f6e3a);
        color: #fff; border: 1px solid #156e3a; font-weight: 700;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.25); }
      /* ── Sími/spjaldtölva (2026-07-11, skjámynd Agnars): taflan kremst í mjóa
         súlu þegar MERKI-dálkur + aðgerðir sitja hægra megin. Á ≤1020px víkur
         MERKI-dálkurinn; á ≤820px víkur dags-dálkurinn og röðin leggst í TVÆR
         línur — efnið fullbreitt efst, aðgerðirnar (Færa · Ný · ✕) hægra megin
         á eigin línu undir. Titillinn fær að brjóta línur eðlilega. ── */
      @media (max-width: 1020px) {
        #view-verkbord .vb-colmerki { display: none !important; }
      }
      /* V3: tveggja-dálka útlitið (listi + VALIÐ MÁL) leggst í eina súlu þegar
         spjaldið á ekki lengur pláss — þá situr valið mál EFST, því á síma
         skoðar maður eitt mál í einu frekar en að renna listann. */
      /* Efsta röðin (NÝJAST + MÁL) leggst í eina súlu áður en kortin verða
         of mjó til að lesa titla í. */
      @media (max-width: 1420px) {
        #view-verkbord .vb-toprow { grid-template-columns: minmax(0,1fr) !important; }
      }
      @media (max-width: 1180px) {
        #view-verkbord .vb-split { grid-template-columns: minmax(0,1fr) !important; }
        #view-verkbord #vb-sel { position: static !important; order: -1; }
        /* #vb-controls STAYS sticky here (2026-08-10, Agnar: "the top cuttes
           off when scrolling... I should always be able to see it fully") —
           this rule used to force it static too, but that fought its own
           purpose (staying at hand while scrolling a long list) for no
           layout reason tied to the single-column collapse above. */
      }
      @media (max-width: 820px) {
        #view-verkbord .vb-wrap { padding: 14px 10px 90px; }
        #view-verkbord .vb-dags { display: none !important; }
        #view-verkbord .vb-rowflex { flex-wrap: wrap; gap: 8px 10px !important;
          padding-left: 12px !important; padding-right: 12px !important; }
        #view-verkbord .vb-rowflex > div:not(.vb-acts):not(.vb-dags) { flex: 1 1 calc(100% - 40px) !important; }
        #view-verkbord .vb-acts { flex: 1 1 100% !important; justify-content: flex-end;
          padding-top: 0 !important; gap: 9px !important;
          border-top: 1px dashed rgba(20,24,34,.08); padding-top: 7px !important; margin-top: 2px; }
        /* Dálkahausinn einfaldast: bara MÁL + STAÐA */
        #view-verkbord .vb-colh { display: none !important; }
        /* Stjórnkortið þéttara */
        #view-verkbord #vb-controls { padding: 12px 12px !important; }
        #view-verkbord #vb-composer { padding: 12px 12px !important; }
      }

      /* ═══ VERKBORÐIÐ ER ALLTAF LJÓST (2026-08-07, skjáskot Agnars: „this
         should be white") ═══
         Dökka þemað (66) og þemabrúin (229) endurlita inline-stíla með
         [style*=…]-attribute-selectorum og !important — undir dökku þema
         flippuðust hvítu V3-kortin (CARD_V3/raðirnar) yfir í dökkblátt.
         Borðið er hannað ljóst: ljósgrár síðubakgrunnur, hvít kort, dökkir
         kortahausar. Hér er ÞAÐ útlit neglt fast: sömu attribute-selectorar,
         en með #view-verkbord-forskeyti (hærri sértækni en báðar þemareglurnar,
         (1,1,0)+ á móti (0,2,1)) og sama gildi og inline-stíllinn segir.
         Pinnum AÐEINS litina sem þemun remappa og koma fyrir í þessari skrá —
         aðrir litir standa óbreyttir. */
      #view-verkbord [style*="background:#fff"] { background: #fff !important; }
      #view-verkbord [style*="background:#f1f5f9"] { background: #f1f5f9 !important; }
      #view-verkbord [style*="color:#16181d"] { color: #16181d !important; }
      #view-verkbord [style*="color:#475569"] { color: #475569 !important; }
      #view-verkbord [style*="color:#64748b"] { color: #64748b !important; }
      #view-verkbord [style*="color:#6b7280"] { color: #6b7280 !important; }
      #view-verkbord [style*="color:#94a3b8"] { color: #94a3b8 !important; }
      /* Patch 66 dekkir líka input/select/textarea og .card með element-reglum
         (án [style*=…]) — leitarreiturinn og stjórnkortin haldast ljós: */
      html[data-theme="dark"] #view-verkbord input,
      html[data-theme="dark"] #view-verkbord select,
      html[data-theme="dark"] #view-verkbord textarea {
        background: #fff !important; color: #141822 !important; border-color: #d8dadf !important; }
      html[data-theme="dark"] #view-verkbord .card,
      html[data-theme="dark"] #view-verkbord table {
        background: #fff !important; color: #11141c !important; border-color: #e5e7eb !important; }
      /* Staff chrome: hide AI borð slot so 343 cannot leave a 16px hole. */
      #view-verkbord.vb-staff #vb-ai-slot { display: none !important; margin: 0 !important; height: 0 !important;
        overflow: hidden !important; padding: 0 !important; }
    `;
    document.head.appendChild(s);
  }

  function applyStaffChrome() {
    const staff = !showOwnerChrome();
    const view = document.getElementById(VIEW_ID);
    if (view) view.classList.toggle('vb-staff', staff);
    const slot = document.getElementById('vb-ai-slot');
    if (slot) {
      slot.style.display = staff ? 'none' : '';
      if (staff) slot.innerHTML = '';
    }
    const chip = document.getElementById('vb-postar-chip');
    if (staff && chip && chip.parentNode) chip.parentNode.removeChild(chip);
  }

  // ── render (Þjónustuverk v3 — speglar Thjonustuverkv3.dc.html) ────────────
  function renderAll() {
    const main = document.getElementById('vb-main'); if (!main) return;
    const c = counts();
    main.innerHTML =
      '<div class="vb-wrap">' +
        // Síðutitill á dökka bandinu + „+ Nýtt mál" (togglar composer-kortið)
        '<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px;flex-wrap:wrap">' +
          '<div>' +
            '<div style="font-size:28px;font-weight:700;color:#fff;letter-spacing:-.01em">🔧 Þjónustuborð</div>' +
            '<div style="font-size:13px;color:rgba(255,255,255,.6);margin-top:4px">Tilboð, fyrirspurnir og póstar sem þarf að fylgja eftir</div>' +
            '<div id="vb-morgun" style="font-size:12px;color:rgba(255,255,255,.55);margin-top:3px;font-family:\'JetBrains Mono\',ui-monospace,monospace"></div>' +
          '</div>' +
          // Hnappahópur hægra megin: 🔑 Viðskiptavinavefir (opnar /gatt-admin/ í
          // nýjum flipa — sjálfstæð stjórnsíða aðgangs/lykilorða/fyrirspurna,
          // ekki view) + „＋ Nýtt mál". Grúppað svo þeir haldist saman og brjóti
          // sig eðlilega niður fyrir titilinn á síma (ytri röðin er flex-wrap).
          '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">' +
            '<button data-act="gattadmin" title="Opna Viðskiptavinavefi — stjórn aðgangs, lykilorða og fyrirspurna (ný síða)" ' +
              'style="height:42px;padding:0 18px;border-radius:12px;' + V3_METAL + ';color:rgba(255,255,255,.9);font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:7px">🔑 Viðskiptavinavefir</button>' +
            '<button data-act="composer" class="abtn" style="height:42px;padding:0 18px;border-radius:12px;border:1px solid rgba(190,32,28,.55);' +
              'background:linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%);color:#fff;font-family:inherit;font-size:14px;font-weight:600;cursor:pointer;' +
              'box-shadow:0 0 16px -4px rgba(160,16,16,.55),inset 0 1px 0 rgba(255,255,255,.16);display:inline-flex;align-items:center;gap:7px">＋ Nýtt mál</button>' +
          '</div>' +
        '</div>' +
        // Vikudagskrá-banner (patch #303 fyllir reitinn) — vikan á undan listanum.
        '<div id="vb-dagskra" style="margin-bottom:16px"></div>' +
        // Skipulagsborð (patch #304) — 12-rúða skipulagsgriðin undir dagskránni.
        '<div id="vb-skipulag"></div>' +
        // AI-borð (patch 343) — tómt reit, renderAll má ekki teikna innihaldið.
        '<div id="vb-ai-slot"></div>' +
        // Composer-kort (skráningarlínan + MERKI tagpicks)
        '<div id="vb-composer" style="' + V3_CARD + ';padding:14px 16px;margin-bottom:16px;display:' + (state.composerOpen ? 'block' : 'none') + '">' +
          '<div style="display:flex;gap:8px;align-items:center;margin-bottom:9px;flex-wrap:wrap">' +
            '<input class="vb-add-cust" id="vb-add-cust" list="vb-add-colist" placeholder="🗂 Fyrirtæki eða kennitala (RSK)…" autocomplete="off" ' +
              'style="flex:1 1 200px;min-width:150px;height:38px;padding:0 13px;border-radius:9px;border:1px solid rgba(20,24,34,.14);background:#eef1f6;color:#141822;font-family:inherit;font-size:13px;outline:none">' +
            '<datalist id="vb-add-colist"></datalist>' +
            '<input class="vb-add-input" id="vb-add-input" placeholder="+ Skrá verk… (Enter vistar)" autocomplete="off" ' +
              'style="flex:2 1 240px;min-width:170px;height:38px;padding:0 13px;border-radius:9px;border:1px solid rgba(20,24,34,.14);background:#eef1f6;color:#141822;font-family:inherit;font-size:13.5px;font-weight:500;outline:none">' +
            '<select id="vb-add-worker" title="Starfsmaður" ' +
              'style="flex:none;height:38px;padding:0 10px;border-radius:9px;border:1px solid rgba(20,24,34,.14);background:#eef1f6;color:#141822;font-family:inherit;font-size:13px;outline:none;cursor:pointer">' +
              addWorkerOptionsHtml() +
            '</select>' +
            // V3: skráningarhnappurinn er blár — rauði liturinn er frátekinn
            // fyrir „+ Nýtt mál" og dagskrár-hnappinn í bannernum.
            '<button data-act="add" class="abtn" style="flex:none;height:38px;padding:0 16px;border-radius:9px;border:1px solid #0a142a;' +
              'background:linear-gradient(180deg,#182f61 0%,#1d3b7e 45%,#2b529f 80%,#4669b7 100%);color:#fff;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;' +
              'box-shadow:inset 0 1px 0 rgba(255,255,255,.15),0 2px 8px rgba(0,0,0,.4)">+ Bæta við</button>' +
            '<button data-act="addmore" title="Skrá og opna alla valkosti (forgangur, frestur, nánar…)" ' +
              'style="flex:none;height:38px;padding:0 13px;border-radius:9px;border:1px solid rgba(20,24,34,.14);background:#fff;color:#475569;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer">⚙ Fleiri</button>' +
          '</div>' +
          // Merkjaröðin er falin þar til eitthvað er skrifað í verk-reitinn
          // (ósk Agnars 6.8.) — tómur reitur = ekkert að merkja. syncAddTags()
          // kveikir/slekkur á henni.
          '<div class="vb-scroll" id="vb-add-tags" style="align-items:center;display:none">' +
            '<span style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#94a3b8;margin-right:1px">🏷 MERKI</span>' +
            TAG_ORDER.map(t => {
              const d = TAGS[t], on = state.addTags.indexOf(t) !== -1;
              return '<button data-act="addtag" data-tag="' + t + '" type="button" ' +
                'style="font-family:inherit;font-size:11.5px;font-weight:600;padding:4px 10px;border-radius:7px;' + V3_METAL + ';color:' + (TAG_DK[t] || '#c3ccd8') + ';cursor:pointer;white-space:nowrap;' +
                'opacity:' + (on ? '1' : '.55') + (on ? ';outline:1px solid currentColor;outline-offset:-1px' : '') + '">' +
                d.emoji + ' ' + esc(d.label) + '</button>';
            }).join('') +
          '</div>' +
          '<div class="vb-scroll" id="vb-add-tagged" style="align-items:center;margin-top:8px;display:none">' +
            '<span style="font-size:10px;font-weight:700;letter-spacing:.1em;color:#94a3b8;margin-right:1px">TAGGA LÍKA</span>' +
            WORKERS.map(function (w) {
              const on = state.addTagged.indexOf(w) !== -1;
              return '<button data-act="addtagged" data-worker="' + w + '" type="button" title="Tagga ' + w + ' án þess að setja málið á hann" ' +
                'style="font-family:inherit;font-size:11px;font-weight:700;padding:3px 9px;border-radius:99px;cursor:pointer;' +
                (on ? 'color:#0f766e;background:#ccfbf1;border:1.5px solid #14b8a6' : 'color:#64748b;background:#fff;border:1px solid #d8dadf') + '">' +
                (on ? '🏷 ' : '') + w + '</button>';
            }).join('') +
          '</div>' +
        '</div>' +
        // Stjórnkortið loðir við toppinn svo flipar/síur séu alltaf við höndina
        // þegar skrunað er niður langan flokkalista.
        '<div id="vb-controls" style="' + V3_CARD + ';padding:12px 15px;margin-bottom:14px;position:sticky;top:8px;z-index:30"></div>' +
        // V3: listi vinstra megin, fast „VALIÐ MÁL" spjald hægra megin.
        '<div class="vb-split" style="display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:14px;align-items:start">' +
          '<div style="display:flex;flex-direction:column;gap:12px;min-width:0">' +
            // Efsta röðin (2026-08-06, ósk Agnars): tvö kort hlið við hlið —
            // NÝJAST (15 nýjustu) og MÁL með innbyggðri Allt/Áríðandi-síu.
            // Með VALIÐ MÁL hægra megin gerir þetta þrjú kort í fyrstu röð;
            // flokkakortin (GERA TILBOÐ o.fl.) færast niður fyrir hana.
            '<div id="vb-toprow" class="vb-toprow" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;align-items:start"></div>' +
            '<div id="vb-list" style="display:flex;flex-direction:column;gap:12px;min-width:0"></div>' +
          '</div>' +
          '<div id="vb-sel" style="position:sticky;top:118px;min-width:0;max-height:calc(100vh - 130px);overflow-y:auto;scrollbar-width:thin"></div>' +
        '</div>' +
      '</div>';
    renderControls(); renderList(); renderSel();
    syncAddTags();
    applyStaffChrome();
    // renderAll skrifar yfir allt #vb-main, svo dagskráin er teiknuð aftur hér.
    if (window.Vikudagskra) { try { Vikudagskra.mount(); } catch (e) { console.warn('[verkbord] dagskrá:', e); } }
    if (window.Skipulagsbord) { try { Skipulagsbord.mount(); } catch (e) { console.warn('[verkbord] skipulagsbord:', e); } }
    if (window.VerkbordAi) { try { VerkbordAi.mount(); } catch (e) { console.warn('[verkbord] ai:', e); } }
  }

  // MERKI-röðin undir skráningarreitnum sést aðeins þegar það er eitthvað til
  // að merkja: texti í reitnum — eða merki þegar valin, svo alltaf sé hægt að
  // taka þau af aftur (annars sætu þau föst og ósýnileg á næsta verki).
  function syncAddTags() {
    const row = document.getElementById('vb-add-tags'); if (!row) return;
    const inp = document.getElementById('vb-add-input');
    const show = !!(inp && inp.value.trim()) || state.addTags.length > 0 || state.addTagged.length > 0;
    row.style.display = show ? '' : 'none';
    const tagged = document.getElementById('vb-add-tagged');
    if (tagged) tagged.style.display = show ? '' : 'none';
  }

  // Stjórnkortið (v3): Innhólf/Allt/Verkefni/Lokað flipar + leit + röðun/sýn,
  // skil, svo TÖG-síuröðin (⭐ Áríðandi + dökk-metal merkjachippar með teljara).
  // Extra chrome only when the name dropdown is Agnar. Bjarndís / Anni / Hákon /
  // Charlize / Binni / Allir án Agnars get nafnaval + leit ofan TÖG — engin AI-borð,
  // biðraðir, Snjallröðun/Þétt né Sækja póst / Kúnnaskrá / 2023–25.
  function renderControls() {
    const el = document.getElementById('vb-controls'); if (!el) return;
    const c = counts();
    const noiseN = allItems().filter(x => isOpen(x) && isPaymentNoise(x) && matchesWorker(x)).length;
    const oldRepN = c.oldReports;
    const agnar = showOwnerChrome();
    applyStaffChrome();
    // Morgunlínan undir síðutitlinum (mono, á dökka bandinu).
    const mg = document.getElementById('vb-morgun');
    if (mg) mg.textContent =
      (c.wait ? c.wait + (c.wait === 1 ? ' póstur bíður svars' : ' póstar bíða svars') : 'enginn póstur bíður svars') +
      (c.idag ? ' · ' + c.idag + ' verk í dag' : '') + (c.od ? ' · ' + c.od + ' fram yfir' : '');

    // V3: biðraðirnar eru pillur — virk pilla blá, hinar dökkar.
    const tab = (v, icon, label, n) => {
      const on = state.queue === v;
      return '<button data-act="queue" data-q="' + v + '" style="display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 14px;border-radius:17px;' +
        (on ? 'border:1px solid #0a142a;background:linear-gradient(180deg,#182f61 0%,#1d3b7e 45%,#2b529f 80%,#4669b7 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.15),0 2px 8px rgba(0,0,0,.4)'
            : 'border:1px solid #3a3d45;background:#17181d') +
        ';color:#fff;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap">' +
        icon + label +
        '<span style="font-size:12px;font-weight:700;color:#fff;background:rgba(255,255,255,.16);border-radius:9px;padding:1px 7px">' + n + '</span></button>';
    };
    const searchHtml =
      '<div style="position:relative;flex:1 1 200px;min-width:160px;max-width:260px">' +
        '<span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#9aa3b5;font-size:13px">🔎</span>' +
        '<input class="malSearch" id="vb-search" placeholder="Leita í málum…" value="' + esc(state.search) + '" ' +
          'style="width:100%;height:38px;padding:0 12px 0 34px;border-radius:11px;border:1px solid rgba(20,24,34,.14);background:#fff;color:#141822;font-family:inherit;font-size:13px;outline:none;box-shadow:inset 0 1px 2px rgba(20,30,60,.05)">' +
      '</div>';
    const workerHtml =
      '<select id="vb-worker-filter" title="Sía eftir starfsmanni" style="height:38px;padding:0 10px;border-radius:11px;' +
        (state.fWorker && state.fWorker !== 'nema_agnar'
          ? 'border:1.5px solid #a5b4fc;background:linear-gradient(180deg,#3730a3,#1e1b4b);color:#e0e7ff;box-shadow:0 0 12px -2px #818cf8;text-shadow:0 0 8px #a5b4fc'
          : 'border:1px solid #0a0b0d;background:linear-gradient(180deg,#26272c,#0d0e10);color:#fff') +
        ';font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap;outline:none">' +
        workerFilterOptions() +
      '</select>';

    const topRow = agnar
      ? ('<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(20,24,34,.08);flex-wrap:wrap">' +
          '<div class="vb-scroll" style="width:auto;flex:1 1 auto;min-width:0">' +
            tab('post', '📥 ', 'Innhólf', c.post) +
            tab('allt', '☰ ', 'Allt', c.allt) +
            tab('verk', '📋 ', 'Verkefni', c.verk) +
            tab('lokad', '✓ ', 'Lokað', c.lokad) +
          '</div>' +
          searchHtml +
          '<div class="vb-scroll" style="width:auto;flex:0 1 auto">' +
            '<button data-act="sort" data-s="snjall" title="Áríðandi og gjalddagar efst — hreinsar dálkaröðun" ' +
              'style="display:inline-flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:11px;' + (state.sort !== 'nyjast' && !state.colSort ? V3_METAL_ON + ';color:#fff' : V3_METAL + ';color:rgba(255,255,255,.9)') + ';font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">⭐ Snjallröðun</button>' +
            '<span style="display:inline-flex;border:1px solid #0a0b0d;border-radius:11px;overflow:hidden">' +
              '<button data-act="viewmode" data-vm="thett" style="height:38px;padding:0 13px;border:0;' + (state.viewMode === 'thett' ? V3_METAL_ON.replace('border:1px solid #0a0b0d;', '') + ';color:#fff' : V3_METAL.replace('border:1px solid #0a0b0d;', '') + ';color:rgba(255,255,255,.6)') + ';font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">☰ Þétt</button>' +
              '<button data-act="viewmode" data-vm="itarlegt" style="height:38px;padding:0 13px;border:0;border-left:1px solid rgba(20,24,34,.3);' + (state.viewMode !== 'thett' ? V3_METAL_ON.replace('border:1px solid #0a0b0d;', '') + ';color:#fff' : V3_METAL.replace('border:1px solid #0a0b0d;', '') + ';color:rgba(255,255,255,.6)') + ';font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">▮ Ítarlegt</button>' +
            '</span>' +
            workerHtml +
            '<button data-act="email" title="Flytja inn nýjar beiðnir úr eldklar-pósthólfinu (engin tvítök)" style="display:inline-flex;align-items:center;height:38px;padding:0 13px;border-radius:11px;' + V3_METAL + ';color:rgba(255,255,255,.85);font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">✉️ Sækja póst</button>' +
            '<a href="kunnaskra.html" target="_blank" rel="noopener" title="Opna heildar-kúnnaskrá — lifandi úr Supabase" style="display:inline-flex;align-items:center;height:38px;padding:0 13px;border-radius:11px;text-decoration:none;' + V3_METAL + ';color:#7ee0c0;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">🗂️ Kúnnaskrá</a><a href="postsvorun.html" target="_blank" rel="noopener" title="Opna heildar-kúnnaskrá — lifandi úr Supabase" style="display:inline-flex;align-items:center;height:38px;padding:0 13px;border-radius:11px;text-decoration:none;' + V3_METAL + ';color:#f0b866;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">📨 Póstsvörun</a>' +
            (noiseN ? '<button data-act="clearnoise" title="Fela allar Payday-greiðslutilkynningar í einu (endurheimtanlegt)" style="display:inline-flex;align-items:center;height:38px;padding:0 13px;border-radius:11px;' + V3_METAL + ';color:#ff8a82;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">🧹 ' + noiseN + '</button>' : '') +
            (oldRepN ? '<button data-act="clearoldrep" title="Fela skýrslumál 2023–2025 varanlega í geymslu. Þau eru nú þegar falin á opnum biðröðum." style="display:inline-flex;align-items:center;height:38px;padding:0 13px;border-radius:11px;' + V3_METAL + ';color:#fde68a;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">📄 2023–25 · ' + oldRepN + '</button>' : '') +
            (oldRepN ? '<button data-act="showoldrep" title="Sýna samt skýrslumál 2023–2025" style="display:inline-flex;align-items:center;height:38px;padding:0 13px;border-radius:11px;' +
              (state.showOldReports ? V3_METAL_ON + ';color:#fff' : V3_METAL + ';color:rgba(255,255,255,.85)') +
              ';font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">' +
              (state.showOldReports ? '▲ Fela 2023–25' : 'Sýna 2023–25') + '</button>' : '') +
            ((state.queue === 'post' && (c.geymsla || state.showOld))
              ? '<button data-act="showold" title="Póstur í geymslu er aldrei eytt — sýna/fela hann hér" style="display:inline-flex;align-items:center;height:38px;padding:0 13px;border-radius:11px;' +
                (state.showOld ? V3_METAL_ON + ';color:#fff' : V3_METAL + ';color:rgba(255,255,255,.85)') +
                ';font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap">' +
                (state.showOld ? '▲ Fela geymslu' : '📦 Geymsla · ' + c.geymsla) + '</button>'
              : '') +
          '</div>' +
        '</div>')
      : ('<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid rgba(20,24,34,.08);flex-wrap:wrap">' +
          workerHtml +
          searchHtml +
        '</div>');

    el.innerHTML =
      topRow +
      // TÖG-síuröðin
      '<div class="vb-scroll" style="align-items:center">' +
        '<span style="font-size:11px;font-weight:700;letter-spacing:.1em;color:#8a93a5;margin-right:2px">TÖG</span>' +
        '<button data-act="starfilter" style="font-family:inherit;font-size:12px;font-weight:700;padding:5px 11px;border-radius:8px;' + FILTER_METAL + ';color:#f2c24e;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:5px;' +
          (state.fStar ? FILTER_ON : 'opacity:1') + '">⭐ Áríðandi' + (c ? '' : '') + '</button>' +
        (function () {
          const tc = {};
          allItems().filter(x => inQueue(x) && matchesWorker(x)).forEach(x => rowChips(x).forEach(t => { tc[t] = (tc[t] || 0) + 1; }));
          const chips = TAG_ORDER.map(t => {
            const d = TAGS[t], on = state.fTags.indexOf(t) !== -1, n = tc[t] || 0;
            // Merki sem enginn ber er falið — nema það sé valið, eða splunkunýtt
            // og enn ónotað (annars væri ekki hægt að byrja að nota það).
            if (!n && !on && t !== 'senda_skyrslur' && t !== 'uppsetning' && t !== 'draft') return '';
            return '<button data-act="tagfilter" data-tag="' + t + '" title="Sía eftir merkinu ' + esc(d.label) + ' — fleiri mega vera valin í einu" ' +
              'style="font-family:inherit;font-size:12px;font-weight:600;padding:5px 11px;border-radius:8px;' + FILTER_METAL + ';color:' + (TAG_DK[t] || '#c3ccd8') + ';cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;' +
              (on ? FILTER_ON : 'opacity:1') + '">' +
              d.emoji + ' ' + esc(d.label) + ' <span style="opacity:.6">' + n + '</span></button>';
          }).join('');
          // Með fjölvali þarf leið til að slökkva á öllu í einu.
          return chips + (state.fTags.length > 1
            ? '<button data-act="tagclear" title="Hreinsa öll valin merki" style="font-family:inherit;font-size:12px;font-weight:700;padding:5px 11px;border-radius:8px;' + FILTER_METAL + ';color:#ff8a82;cursor:pointer;white-space:nowrap">✕ Hreinsa (' + state.fTags.length + ')</button>'
            : '');
        })() +
      '</div>';
  }

  // Listakortið (v3): dökk-metal dálkahaus með röðunar-örvum, kaflar í
  // innhólfinu (bíða svars / svarað / geymsla), zebra-raðir, síðuskipting.
  const PAGE_SIZE = 50; // 2026-07-11: 25 → 50 (ósk Agnars)
  function colHead() {
    const arrow = (k) => {
      if (!state.colSort || state.colSort.key !== k) return '<span style="color:rgba(255,255,255,.45)">↕</span>';
      return '<span style="color:#fff">' + (state.colSort.dir === 'asc' ? '▲' : '▼') + '</span>';
    };
    return '<div style="display:flex;align-items:center;gap:16px;padding:11px 18px 11px 21px;' + V3_METAL.replace('border:1px solid #0a0b0d', 'border-bottom:1px solid #0a0b0d') + ';font-size:11.5px;font-weight:700;letter-spacing:.08em;color:#f0f2f5">' +
      '<span style="width:22px;flex:none"></span>' +
      '<span data-act="colsort" data-k="dags" style="width:74px;flex:none;display:inline-flex;align-items:center;gap:4px;cursor:pointer" class="vb-colh">DAGS. ' + arrow('dags') + '</span>' +
      '<span data-act="colsort" data-k="mal" style="flex:1;min-width:0;display:inline-flex;align-items:center;gap:4px;cursor:pointer">FYRIRTÆKI / MÁL ' + arrow('mal') + '</span>' +
      '<span style="width:220px;flex:none" class="vb-colmerki">MERKI</span>' +
      '<span data-act="colsort" data-k="stada" style="flex:none;display:inline-flex;align-items:center;gap:4px;cursor:pointer">STAÐA ' + arrow('stada') + '</span>' +
    '</div>';
  }
  function pager(total, shownFrom, shownTo) {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (pages <= 1) return '<div style="display:flex;align-items:center;padding:12px 18px;background:linear-gradient(180deg,#f1f4f9,#e7ebf2);border-top:1px solid rgba(20,24,34,.09)">' +
      '<span style="font-size:12px;color:#6b7686">Sýnir <b style="color:#3a4250">' + total + '</b> mál</span></div>';
    const cur = Math.min(state.page, pages - 1);
    let nums = [];
    for (let i = 0; i < pages; i++) {
      if (i === 0 || i === pages - 1 || Math.abs(i - cur) <= 1) nums.push(i);
      else if (nums[nums.length - 1] !== '…') nums.push('…');
    }
    const btn = (label, pg, on, dis) =>
      dis ? '' : '<button data-act="page" data-p="' + pg + '" style="height:32px;min-width:32px;padding:0 8px;border-radius:8px;font-family:\'JetBrains Mono\',ui-monospace,monospace;font-size:12.5px;cursor:pointer;' +
        (on ? 'border:1px solid #0a0b0d;background:linear-gradient(145deg,#08080a,#2a2a30 50%,#070709);color:#fff;font-weight:700'
            : 'border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fff,#e3e7ee);color:#3a4250;font-weight:600;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)') + '">' + label + '</button>';
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;background:linear-gradient(180deg,#f1f4f9,#e7ebf2);border-top:1px solid rgba(20,24,34,.09);flex-wrap:wrap">' +
      '<span style="font-size:12px;color:#6b7686">Sýnir <b style="color:#3a4250">' + (shownFrom + 1) + '–' + shownTo + '</b> af <b style="color:#3a4250">' + total + '</b> málum</span>' +
      '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
        (cur > 0 ? btn('‹', cur - 1, false) : '') +
        nums.map(n => n === '…' ? '<span style="font-size:12px;color:#94a3b8;padding:0 2px">…</span>' : btn(String(n + 1), n, n === cur)).join('') +
        (cur < pages - 1 ? btn('›', cur + 1, false) : '') +
      '</div></div>';
  }
  // ── Verkborð V3 — flokkakort í stað eins langs lista ──────────────────────
  // Hönnun „Verkbord med banner V3". Sami gagnagrunnur og áður (visibleRows),
  // aðeins framsetningin breytist: ⭐ BÍÐUR SVARS efst, svo eitt kort per MERKI.
  // Röð getur birst í fleiri en einu korti ef hún ber fleiri en eitt merki —
  // það er viljandi og speglar teljarana í TÖG-síunni.
  const CARD_V3   = 'background:#fff;border-radius:13px;box-shadow:0 8px 24px -10px rgba(15,23,42,.34);overflow:hidden';
  const CARDHEAD  = 'display:flex;align-items:center;gap:8px;background:linear-gradient(180deg,#2e3037 0%,#17181c 55%,#0c0d10 100%);padding:8px 12px';
  const CAT_ROWS  = 5;   // sýnt per flokk áður en „Sjá öll N mál →" birtist

  function waitPill(r) {
    if (!isWaiting(r)) return '';
    const d = waitDays(r);
    const c = d > 90 ? '#c3271c' : (d > 30 ? '#b8860b' : '#6b7280');
    const lbl = d === 0 ? 'kom í dag' : (d === 1 ? 'bíður 1 dag' : 'bíður ' + d + ' daga');
    return '<span style="flex:none;display:inline-flex;align-items:center;gap:5px;border:1px solid ' + c + '66;color:' + c +
      ';border-radius:20px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap">' +
      '<span style="width:6px;height:6px;border-radius:50%;background:' + c + '"></span>' + lbl + '</span>';
  }

  // Hausinn á hverri röð: FYRIRTÆKIÐ fremst (blátt, opnar fyrirtækjaspjaldið) og
  // málið sjálft á SÖMU línu hægra megin (ósk Agnars 7.8.). Nafninu er sleppt ef
  // titillinn byrjar hvort sem er á því — margir póstar bera fyrirtækjanafnið í
  // efnislínunni og þá stæði það tvisvar í sömu röð.
  function rowHeadHTML(r) {
    const title = String(r.title || '(ónefnt)');
    const co = String(r.customer_nafn || '').trim();
    const dupe = co && title.trim().toLowerCase().indexOf(co.toLowerCase()) === 0;
    return (r.important ? '<span style="color:#eab308">★ </span>' : '') +
      (co && !dupe
        // Nafnið fylgir með í data-co: raðirnar koma úr fleiri en einni uppsprettu
        // (allItems() sameinar thjonustubeidni og verkdagbók) svo uppfletting á
        // state.items eftir id finnur ekki allar raðir — og skilaði því engu.
        ? '<span data-act="openco" data-co="' + esc(co) + '" title="Opna fyrirtækjaspjald — ' + esc(co) + '" ' +
            'style="color:#2f5fe0;cursor:pointer">' + esc(co) + '</span>' +
          '<span style="color:#c3c8d0"> · </span>'
        : '') +
      esc(title);
  }

  // Ein röð inni í korti. `clamp` = tveggja lína lýsing (flokkakortin), annars
  // ein lína (BÍÐUR SVARS er þéttara).
  function v3Row(r, clamp, tagColor, groupKey) {
    const on = String(state.selId) === String(r.id);
    const tl = (state.threadLatest && state.threadLatest[r.id]) || null;
    const emailFrom = isPost(r) ? (tl && tl.from ? tl.from : (r.customer_nafn || '')) : '';
    const sub = emailFrom
      ? (r.title || r.notes || '').replace(/\s+/g, ' ').trim()        // email: sub = subject line
      : (r.notes || r.customer_nafn || '').replace(/\s+/g, ' ').trim(); // normal: sub = snippet
    const lines = state.viewMode === 'thett' ? 2 : 4;
    const subStyle = clamp
      ? 'font-size:12px;color:#6b7280;line-height:1.5;display:-webkit-box;-webkit-line-clamp:' + lines +
        ';-webkit-box-orient:vertical;overflow:hidden'
      : 'font-size:12px;color:#6b7280;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    return '<div class="vb-v3row" data-act="selrow" data-id="' + esc(r.id) + '" ' +
      'style="display:flex;align-items:' + (clamp ? 'flex-start' : 'center') + ';gap:10px;padding:' + (clamp ? '10px 12px' : '9px 12px') + ';' +
      'border-top:1px solid #eef0f2;cursor:pointer;background:' + (on ? 'rgba(195,39,28,.05)' : '#fff') + ';' +
      (on ? 'box-shadow:inset 3px 0 0 #c3271c;' : '') + '">' +
        // 2026-08-10 (ósk Agnars): smellanleg Áríðandi-stjarna — sama data-act="star"
        // og eldri renderRow() notar, svo toggleStar()/wireDelegation grípa hana sjálfkrafa.
        '<span data-act="star" data-id="' + esc(r.id) + '" title="Áríðandi" style="flex:none;width:22px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:17px;line-height:1;color:' + (r.important ? '#e0a93e' : '#cbd2dc') + (clamp ? ';margin-top:1px' : '') + '">' + (r.important ? '★' : '☆') + '</span>' +
        '<div style="flex:none;width:42px' + (clamp ? ';padding-top:2px' : '') + '">' +
          '<div style="font-family:ui-monospace,Consolas,monospace;font-size:11.5px;font-weight:700;color:#3f4650">' +
            esc(shortDate(r.created_at)) + '</div>' +
          (clamp
            ? '<div title="' + waitDays(r) + ' dagar frá skráningu" style="font-family:ui-monospace,Consolas,monospace;' +
              'font-size:11px;font-weight:800;color:' + (tagColor || '#9aa0aa') + ';margin-top:2px">' + waitDays(r) + 'D</div>'
            : '') +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
          // Email rows: sender name as the main bold line, subject as sub-line
          (emailFrom
            ? '<div style="font-size:13px;font-weight:700;color:#16181d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
                esc(emailFrom) + '</div>'
            : '<div style="font-size:13px;font-weight:700;color:#16181d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
                rowHeadHTML(r) + '</div>') +
          (sub ? '<div style="' + subStyle + '">' + esc(sub) + '</div>' : '') +
        '</div>' +
        (clamp ? '' : waitPill(r)) +
        // HIN merkin sem málið ber — sýnileg beint á röðinni (ósk Agnars 14.08).
        miniTagChips(r, groupKey || '') +
        '<span style="flex:none;display:flex;flex-wrap:wrap;gap:4px;align-items:center">' + taggedListChipsHtml(r) + '</span>' +
        '<button data-act="skra" data-id="' + esc(r.id) + '" title="Setja á dagskrá" ' +
          'style="flex:none;border:1px solid #d8dadf;border-radius:7px;background:#fff;cursor:pointer;padding:3px 8px;' +
          'font-size:11px;font-weight:700;color:#4b5058;font-family:inherit' + (clamp ? ';margin-top:2px' : '') + '">🗓 Á dagskrá</button>' +
      '</div>';
  }

  function shortDate(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0');
  }

  // ── Efsta röðin: NÝJAST + MÁL (innbyggð Allt/Áríðandi-sía) ────────────────
  // Bæði kortin lesa SAMA `rows` og flokkakortin fyrir neðan, svo flipar, leit
  // og TÖG sem valin eru að ofan gilda hér líka — þetta eru útsýnisgluggar á
  // sama gagnasafn, ekki nýr listi.
  const TOP_N = 10;   // 10 nýjustu / 10 efstu í MÁL (ósk Agnars 6.8.)

  // Röð í efstu kortunum (2026-08-06, ósk Agnars — hann strikaði út pilluna og
  // 🗓-hnappinn): þéttari en flokkakortin. „bíður N daga"-pillan og „Á dagskrá"
  // víkja; biðin birtist í staðinn sem þéttur „7D"-teljari undir dagsetningunni,
  // sem er sjálf í meiri birtuskilum. Textinn fær þrjár línur alls — titill og
  // tveggja lína lýsing. Hnappurinn lifir áfram í flokkakortunum fyrir neðan.
  function topRow(r) {
    const on = String(state.selId) === String(r.id);
    const tl = (state.threadLatest && state.threadLatest[r.id]) || null;
    const emailFrom = isPost(r) ? (tl && tl.from ? tl.from : (r.customer_nafn || '')) : '';
    const sub = emailFrom
      ? (r.title || r.notes || '').replace(/\s+/g, ' ').trim()
      : (r.notes || r.customer_nafn || '').replace(/\s+/g, ' ').trim();
    const d = isWaiting(r) ? waitDays(r) : null;
    const dc = d === null ? '' : (d > 90 ? '#c3271c' : (d > 30 ? '#b8860b' : '#6b7280'));
    return '<div class="vb-v3row" data-act="selrow" data-id="' + esc(r.id) + '" ' +
      'style="display:flex;align-items:flex-start;gap:10px;padding:9px 12px;border-top:1px solid #eef0f2;cursor:pointer;' +
      'background:' + (on ? 'rgba(195,39,28,.05)' : '#fff') + ';' + (on ? 'box-shadow:inset 3px 0 0 #c3271c;' : '') + '">' +
        // 2026-08-10 (ósk Agnars): smellanleg stjarna hér líka — þessi fallið teiknar
        // BÆÐI „🆕 NÝJAST" og „★ Áríðandi" kortin, svo smellur hér inni í Áríðandi
        // sjálfu fjarlægir málið úr þeim glugga samstundis (renderTop síar á r.important).
        '<span data-act="star" data-id="' + esc(r.id) + '" title="Áríðandi" style="flex:none;width:20px;height:20px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-top:1px;font-size:16px;line-height:1;color:' + (r.important ? '#e0a93e' : '#cbd2dc') + '">' + (r.important ? '★' : '☆') + '</span>' +
        '<div style="flex:none;width:40px;padding-top:1px">' +
          '<div style="font-family:ui-monospace,Consolas,monospace;font-size:11.5px;font-weight:700;color:#3f4650">' +
            esc(shortDate(r.created_at)) + '</div>' +
          (d === null ? ''
            : '<div title="bíður ' + d + ' daga" style="font-family:ui-monospace,Consolas,monospace;font-size:11px;' +
              'font-weight:800;color:' + dc + ';margin-top:2px">' + d + 'D</div>') +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
          (emailFrom
            ? '<div style="font-size:13px;font-weight:700;color:#16181d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
                esc(emailFrom) + '</div>'
            : '<div style="font-size:13px;font-weight:700;color:#16181d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
                rowHeadHTML(r) + '</div>') +
          (sub
            ? '<div style="font-size:12px;color:#6b7280;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;' +
              '-webkit-box-orient:vertical;overflow:hidden">' + esc(sub) + '</div>'
            : '') +
        '</div>' +
      '</div>';
  }

  function topCard(title, emoji, count, headExtra, bodyHTML) {
    return '<div style="' + CARD_V3 + ';min-width:0">' +
      '<div style="' + CARDHEAD + ';padding:7px 12px">' +
        '<span style="font-size:13px">' + emoji + '</span>' +
        '<span style="color:#fff;font-weight:800;font-size:13px;letter-spacing:.6px">' + title + '</span>' +
        '<span style="min-width:20px;height:18px;padding:0 6px;border-radius:9px;background:rgba(255,255,255,.14);color:#e6e9ee;' +
          'font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box">' + count + '</span>' +
        (headExtra || '') +
      '</div>' +
      (bodyHTML || '<div style="padding:22px 12px;text-align:center;color:#6b7280;font-size:12.5px">Ekkert hér.</div>') +
    '</div>';
  }

  function renderTop(rows) {
    const el = document.getElementById('vb-toprow'); if (!el) return;
    // NÝJAST raðar sjálft (hrein dagsetning), en MÁL heldur röðun borðsins
    // (Snjallröðun / dálkaröðun / innhólfs-röðin) — annars væru kortin tvö
    // eins þegar „Allt" er valið.
    const nyjast = rows.slice()
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, TOP_N);
    const aridandi = rows.filter(x => !!x.important).slice(0, TOP_N);

    el.innerHTML =
      topCard('NÝJAST', '🆕', nyjast.length,
        '<span style="margin-left:auto;font-size:11px;font-weight:600;color:#9aa0aa">nýjast efst</span>',
        nyjast.map(topRow).join('')) +
      topCard('★ Áríðandi', '⭐', aridandi.length, '',
        aridandi.length ? aridandi.map(topRow).join('') :
          '<div style="padding:18px 14px;text-align:center;color:#6b7280;font-size:12px">Engin áríðandi mál</div>');
  }

  function renderList() {
    const el = document.getElementById('vb-list'); if (!el) return;
    if (state.loading && !state.items.length) {
      el.innerHTML = '<div class="vb-empty">Sæki…</div>';
      const top = document.getElementById('vb-toprow'); if (top) top.innerHTML = '';
      return;
    }
    const rows = visibleRows();
    renderTop(rows);
    const _f = faldirAfSiu();
    const _bordi = siuBordi(_f);
    if (!rows.length) {
      // Tómur listi MEÐ virkri síu er nákvæmlega tilvikið sem blekkti Agnar —
      // „Ekkert hér" er þá ósatt.
      el.innerHTML = _bordi + '<div style="' + CARD_V3 + ';padding:26px;text-align:center;color:#6b7280;font-size:13px">' +
        (state.search ? 'Ekkert fannst fyrir „' + esc(state.search) + '“.'
         : _f.faldir > 0 ? 'Ekkert sýnilegt — sían felur ' + _f.faldir + ' mál.' : '🎉 Ekkert hér.') + '</div>';
      wireSiuBordi();
      renderSel();
      return;
    }
    // Keep VALIÐ MÁL on the ticket the user is editing even if it just left
    // the worker filter (assign to Agnar while "Allir án Agnars" is on).
    // Only jump to another row when the selected ticket is gone entirely.
    state.selId = keepSelectedId(state.selId, rows, allItems());

    let html = _bordi;

    // ⭐ BÍÐUR SVARS — ósvaraðir póstar, elstu efst.
    const wait = rows.filter(x => isWaiting(x)).sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (wait.length) {
      html += '<div style="' + CARD_V3 + '">' +
        '<div style="' + CARDHEAD + '">' +
          '<span style="color:#eab308;font-size:13px">★</span>' +
          '<span style="color:#fff;font-weight:800;font-size:13px;letter-spacing:.6px">BÍÐUR SVARS</span>' +
          '<span style="min-width:20px;height:18px;padding:0 6px;border-radius:9px;background:rgba(234,179,8,.2);color:#eab308;' +
            'font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box">' + wait.length + '</span>' +
          '<span style="margin-left:auto;font-size:11px;font-weight:600;color:#9aa0aa">elstu efst · rautt = yfir 90 daga</span>' +
        '</div>' +
        wait.slice(0, 12).map(r => v3Row(r, false)).join('') +
      '</div>';
    }

    // Eitt kort per MERKI (+ „Ómerkt" fyrir raðir án merkis).
    const groups = [];
    for (const t of TAG_ORDER) {
      const items = rows.filter(r => rowChips(r).indexOf(t) !== -1);
      if (items.length) groups.push({ key: t, name: TAGS[t].label.toUpperCase(), emoji: TAGS[t].emoji, color: TAGS[t].color, items });
    }
    const untagged = rows.filter(r => !rowChips(r).length);
    if (untagged.length) groups.push({ key: '_annad', name: 'ÓMERKT', emoji: '•', color: '#64748b', items: untagged });

    for (const g of groups) {
      const open = state.catOpen[g.key] !== false;
      const showAll = !!state.catMore[g.key];
      const shown = showAll ? g.items : g.items.slice(0, CAT_ROWS);
      html += '<div style="' + CARD_V3 + '">' +
        '<div data-act="cattoggle" data-cat="' + esc(g.key) + '" style="' + CARDHEAD + ';padding:7px 12px;cursor:pointer">' +
          '<span style="color:#9aa0aa;font-size:11px;width:12px">' + (open ? '▾' : '▸') + '</span>' +
          '<span style="width:9px;height:9px;border-radius:50%;background:' + g.color + '"></span>' +
          '<span style="color:#fff;font-weight:800;font-size:13px;letter-spacing:.6px">' + esc(g.name) + '</span>' +
          '<span style="min-width:20px;height:18px;padding:0 6px;border-radius:9px;background:' + g.color + '33;color:' + (TAG_DK[g.key] || '#c8ccd4') + ';' +
            'font-size:11px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box">' + g.items.length + '</span>' +
          '<span style="margin-left:auto;font-size:11px;font-weight:600;color:#6b7280">' +
            (open ? '' : g.items.length + ' mál · smelltu til að opna') + '</span>' +
          // 2026-08-10 (ósk Agnars — „quite time consuming register projects"):
          // flýtiskráning beint úr flokkahausnum — sami quickAdd() og aðal-
          // composerinn notar, bara forfyllt með ÞESSU merki + valda starfsmanni
          // (state.fWorker, sami veljari og „Allir án Agnars" efst á borðinu).
          '<button data-act="catadd" data-cat="' + esc(g.key) + '" title="Fljótskrá í ' + esc(g.name) + '" ' +
            'style="flex:none;width:20px;height:20px;border-radius:50%;border:1px solid rgba(255,255,255,.4);' +
            'background:' + (state.catAddOpen[g.key] ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.1)') + ';' +
            'color:' + (state.catAddOpen[g.key] ? '#17181d' : '#fff') + ';font-size:13px;font-weight:800;line-height:1;' +
            'display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0">+</button>' +
        '</div>' +
        (state.catAddOpen[g.key]
          ? '<div style="display:flex;gap:6px;padding:8px 12px;border-top:1px solid #eef0f2;background:#f8fafc">' +
              '<input class="vb-catadd-cust" data-cat="' + esc(g.key) + '" list="vb-add-colist" placeholder="🗂 Fyrirtæki…" autocomplete="off" ' +
                'style="flex:1 1 45%;min-width:0;height:32px;padding:0 10px;border-radius:7px;border:1px solid #cbd5e1;background:#fff;color:#141822;font-family:inherit;font-size:12.5px;outline:none">' +
              '<input class="vb-catadd-txt" data-cat="' + esc(g.key) + '" placeholder="Texti… (Enter vistar)" autocomplete="off" ' +
                'style="flex:1 1 55%;min-width:0;height:32px;padding:0 10px;border-radius:7px;border:1px solid #cbd5e1;background:#fff;color:#141822;font-family:inherit;font-size:12.5px;outline:none">' +
            '</div>'
          : '') +
        (open
          ? shown.map(r => v3Row(r, true, g.color, g.key)).join('') +
            (g.items.length > shown.length
              ? '<div data-act="catmore" data-cat="' + esc(g.key) + '" style="padding:8px 12px;border-top:1px solid #eef0f2;' +
                'font-size:12px;font-weight:700;color:#6b7280;cursor:pointer">Sjá öll ' + g.items.length + ' mál →</div>'
              : '')
          : '') +
      '</div>';
    }

    el.innerHTML = html;
    wireSiuBordi();
    renderSel();   // öll önnur köll á renderList() halda spjaldinu í takt
  }

  // ── „VALIÐ MÁL" — fasta spjaldið hægra megin ─────────────────────────────
  // Kemur í stað gamla útþanda ritilsins í röðinni. Ritillinn sjálfur er EKKI
  // horfinn: „✎ Breyta" opnar hann hér inni (Agnar vill geta breytt öllu).
  // 2026-08-09: VALIÐ MÁL er nú beint breytanlegt: titill sem input, fyrirtæki
  // með ✏️-hnapp, öll merki sem toggle-chippar — án þess að þurfa að smella
  // „✎ Breyta" fyrst. „⋯ Meira" opnar enn fulla ritilinn (gjalddagi, starfsm.).
  function selCoHTML(row) {
    if (row._vd) return row.customer_nafn ? '<span style="font-size:12px;font-weight:700;color:#6b7280">🗂 ' + esc(row.customer_nafn) + '</span>' : '';
    const BTNST = 'font:inherit;font-size:11px;padding:2px 7px;border-radius:6px;border:1px solid #d8dadf;background:#f8fafc;color:#4b5058;cursor:pointer;white-space:nowrap';
    const pack = state.draftPack[row.id] || parseDraftSummary(row.summary);
    const open = isDraftPanelOpen(row, pack);
    const useful = draftPackIsUseful(pack, row);
    const draftBg = open ? '#fde68a' : (useful ? '#fef3c7' : '#fffbeb');
    const draftBd = open || useful ? '#d97706' : '#f59e0b';
    const DRAFTBTN = 'font:inherit;font-size:11px;font-weight:700;padding:2px 7px;border-radius:6px;border:1px solid ' + draftBd +
      ';background:' + draftBg + ';color:#92400e;cursor:pointer;white-space:nowrap;line-height:1.2';
    return '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
      (row.customer_nafn
        ? '<span style="font-size:12px;font-weight:700;color:#6b7280">🗂 ' + esc(row.customer_nafn) + '</span>'
        : '<span style="font-size:12px;color:#94a3b8;font-style:italic">🔗 Engin tenging</span>') +
      '<button data-act="editco" data-id="' + esc(row.id) + '" title="Breyta/tengja fyrirtæki" style="' + BTNST + '">✏️ Tengja</button>' +
      '<button data-act="drafttoggle" data-id="' + esc(row.id) + '" type="button" title="' +
        (open ? 'Fella Forvinnu' : 'Opna Forvinnu — reikningur, skýrsla og svar-drög') + '" style="' + DRAFTBTN + '">Forvinna</button>' +
    '</div>';
  }
  // Sticky-rúmfræði VALINS MÁLS (2026-08-14, skjáskot Agnars): stjórnkortið
  // fyrir ofan er LÍKA sticky og MISHÁTT eftir skjá (chip-línurnar brotna í
  // 1–3 raðir) — harðkóðaða top:118px lét topp spjaldsins hverfa undir það
  // og botninn rann út fyrir skjáinn. Mælum kortið og stillum top+max-height
  // eftir því; ResizeObserver heldur þessu réttu þegar kortið breytir hæð.
  function fixSelViewport() {
    const sel = document.getElementById('vb-sel');
    const ctr = document.getElementById('vb-controls');
    if (!sel || !ctr) return;
    if (window.matchMedia('(max-width:1180px)').matches) {   // ein súla → static
      sel.style.removeProperty('top'); sel.style.removeProperty('max-height');
    } else {
      const top = 8 + Math.ceil(ctr.getBoundingClientRect().height) + 10;
      // Skrunið gerist í innri containernum (#vb-main), ekki glugganum —
      // sticky-top OG sýnileg hæð miðast við HANS viewport, ekki 100vh.
      const scroller = sel.closest('#vb-main');
      const viewH = (scroller && scroller.clientHeight) || window.innerHeight;
      sel.style.top = top + 'px';
      sel.style.maxHeight = Math.max(220, viewH - top - 10) + 'px';
    }
    if (window.ResizeObserver && !ctr._selRo) {
      ctr._selRo = new ResizeObserver(() => fixSelViewport());
      ctr._selRo.observe(ctr);
    }
  }
  window.addEventListener('resize', fixSelViewport);

  // Fella/stækka athugasemdaglugga VALINS MÁLS — langur texti þvingaði annars
  // allt spjaldið í skrun. Valið lifir milli mála/heimsókna.
  function notesMin() { try { return localStorage.getItem('vb_notes_min') === '1'; } catch (_) { return false; } }

  function renderSel() {
    const el = document.getElementById('vb-sel'); if (!el) return;
    const r = allItems().find(x => String(x.id) === String(state.selId));
    if (!r) {
      el.innerHTML = '<div style="' + CARD_V3 + ';padding:28px 22px;text-align:center;color:#9aa0aa;font-size:12.5px">' +
        '<div style="font-size:44px;margin-bottom:10px;color:#9aa0aa;opacity:.25;line-height:1">📋</div>' +
        '<p style="margin:0 0 4px;font-weight:700;color:#6b7280;font-size:13px">Valið mál</p>' +
        '<p style="margin:0 0 18px;font-size:11.5px">Smelltu á mál til að skoða það hér.</p>' +
        '<button data-act="composer" style="height:34px;padding:0 16px;border-radius:8px;border:1px solid rgba(190,32,28,.5);' +
        'background:linear-gradient(180deg,#7f1d1d,#450a0a);color:#fca5a5;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer">＋ Nýtt mál</button>' +
      '</div>';
      fixSelViewport();
      return;
    }
    const chips = rowChips(r);
    const editing = String(state.expandedId) === String(r.id);
    const btn = (act, label, kind) => {
      const base = 'display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 13px;border-radius:8px;' +
        'font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;';
      if (kind === 'blue') return '<button data-act="' + act + '" data-id="' + esc(r.id) + '" style="' + base +
        'border:1px solid #0a142a;background:linear-gradient(180deg,#182f61 0%,#1d3b7e 45%,#2b529f 80%,#4669b7 100%);color:#fff;font-weight:800;' +
        'box-shadow:inset 0 1px 0 rgba(255,255,255,.15),0 2px 8px rgba(0,0,0,.4)">' + label + '</button>';
      if (kind === 'light') return '<button data-act="' + act + '" data-id="' + esc(r.id) + '" style="' + base +
        'border:1px solid #d8dadf;background:#fff;color:#16181d">' + label + '</button>';
      return '<button data-act="' + act + '" data-id="' + esc(r.id) + '" style="' + base +
        'border:1px solid #3a3d45;background:#17181d;color:#fff">' + label + '</button>';
    };

    el.innerHTML = '<div style="' + CARD_V3 + '">' +
      '<div style="' + CARDHEAD + '">' +
        '<span style="color:#c8cdd6;font-weight:900;font-size:16px;letter-spacing:.4px">📋 VALIÐ MÁL</span>' +
        '<button data-act="composer" title="Bæta við nýju máli efst" style="margin-left:6px;border:1px solid rgba(190,32,28,.5);' +
          'background:linear-gradient(180deg,#5f0808,#300404);color:#fca5a5;border-radius:7px;' +
          'padding:2px 8px;font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit">＋ Nýtt</button>' +
        (r.important ? '<button data-act="star" data-id="' + esc(r.id) + '" title="Fjarlægja Áríðandi merki" ' +
          'style="border:1px solid rgba(224,169,62,.45);background:rgba(224,169,62,.12);color:#e0a93e;border-radius:7px;' +
          'padding:2px 9px;font-size:11.5px;font-weight:700;cursor:pointer;font-family:inherit">☆ Fjarlægja</button>' : '') +
        '<span style="margin-left:auto;font-family:ui-monospace,Consolas,monospace;font-size:11px;color:#9aa0aa">' + esc(shortDate(r.created_at)) + '</span>' +
      '</div>' +
      '<div style="padding:14px 16px 16px">' +
        // Status chips (not interactive here — stadaPill handles advance)
        '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:10px">' +
          chips.map(t => dkChip(t)).join('') + taggedListChipsHtml(r) + waitPill(r) + stadaPill(r) +
        '</div>' +
        // BEINT BREYTANLEGUR TITILL — vistast 500ms eftir að hætt er að slá inn
        (r._vd
          ? '<div style="font-size:17px;font-weight:800;color:#16181d;line-height:1.3;margin-bottom:10px">' + esc(r.title || '(ónefnt)') + '</div>'
          : '<input id="vb-sel-title" data-selid="' + esc(String(r.id)) + '" value="' + esc(r.title || '') + '" placeholder="Titill…" ' +
            'style="font-size:17px;font-weight:800;color:#16181d;line-height:1.3;margin-bottom:10px;width:100%;' +
            'border:1px solid transparent;border-radius:7px;padding:4px 7px;background:transparent;outline:none;' +
            'box-sizing:border-box;font-family:inherit" ' +
            'onfocus="this.style.borderColor=\'#d8dadf\';this.style.background=\'#f8fafc\'" ' +
            'onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'">') +
        // FYRIRTÆKI (með ✏️ Tengja hnappi)
        '<div id="vb-sel-co" style="margin-bottom:10px">' + selCoHTML(r) + '</div>' +
        (!r._vd ? draftPackHTML(r) : '') +
        // 2026-08-11: inline-editable textarea (replaces read-only div — saves on 500ms debounce, same as title)
        (!editing && !r._vd
          ? '<div style="display:flex;align-items:center;margin-bottom:1px">' +
              '<span style="font-size:10.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px">Athugasemdir</span>' +
              '<button data-act="notesmin" type="button" title="Fella/stækka textagluggann" ' +
                'style="margin-left:auto;border:1px solid #d8dadf;background:#f8fafc;color:#4b5058;border-radius:6px;' +
                'padding:1px 8px;font-size:10.5px;cursor:pointer;font-family:inherit">' +
                (notesMin() ? '▸ Stækka' : '▾ Fella') + '</button>' +
            '</div>' +
            '<textarea id="vb-sel-notes" data-selid="' + esc(String(r.id)) + '" rows="3" placeholder="Athugasemdir…" ' +
            'style="font-size:13px;color:#4b5058;line-height:1.65;width:100%;resize:vertical;min-height:52px;max-height:880px;overflow-y:auto;' +
            'border:1px solid transparent;border-radius:7px;padding:5px 7px;background:transparent;outline:none;' +
            'box-sizing:border-box;font-family:inherit;margin-bottom:10px" ' +
            'onfocus="this.style.borderColor=\'#d8dadf\';this.style.background=\'#f8fafc\'" ' +
            'onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'">' + esc(r.notes || '') + '</textarea>'
          : (r.notes ? '<div style="font-size:13px;color:#4b5058;line-height:1.65;white-space:pre-wrap;max-height:200px;overflow-y:auto;margin-bottom:10px">' + esc(r.notes) + '</div>' : '')) +
        // MERKI — öll tiltæk merki sem toggle-chippar (dökk-metal eins og TÖG-sían)
        (!r._vd
          ? '<div style="border-top:1px solid #f1f3f5;padding-top:10px;margin-bottom:12px">' +
            '<div style="font-size:10.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">Merki</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:5px">' +
              TAG_ORDER.map(function (tg) {
                const d = TAGS[tg], on = rowChips(r).indexOf(tg) !== -1;
                return '<button data-act="tagtoggle" data-id="' + esc(String(r.id)) + '" data-tag="' + tg + '" type="button" ' +
                  'style="font-family:inherit;font-size:11px;font-weight:600;padding:4px 10px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;' +
                  FILTER_METAL + ';color:' + (TAG_DK[tg] || '#c3ccd8') + ';' + (on ? FILTER_ON : '') + '">' +
                  d.emoji + ' ' + esc(d.label) + '</button>';
              }).join('') +
            '</div></div>'
          : '') +
        // FYLGISKJÖL — sýnd alltaf (nema á verkdagbók-færslum)
        (!r._vd ? attSectionHTML(r) : '') +
        (editing
          ? '<div id="vb-sel-ed" data-id="' + esc(String(r.id)) + '" style="margin-top:4px;padding-top:12px;border-top:1px solid #eef0f2">' + renderEditor(r) + '</div>'
          : '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;padding-top:12px;border-top:1px solid #eef0f2">' +
              (r._vd
                ? '<button class="vb-btn" data-act="vd-open" data-id="' + esc(r.id) + '">📓 Opna í Verkdagbók</button>' +
                  '<button class="vb-btn green" data-act="vd-done" data-id="' + esc(r.id) + '">✓ Klárað</button>' +
                  '<button class="vb-btn" data-act="vd-archive" data-id="' + esc(r.id) + '" style="color:#dc2626">🗑 Fela</button>'
                : (isPost(r) ? btn('reply', '✉ Svara') : '') +
                  btn('skra', '🗓 Setja á dagskrá', 'blue') +
                  btn('edit', '⋯ Meira', 'light') +
                  (isOpen(r) ? btn('done', '✓ Loka máli', 'light') : '')) +
            '</div>') +
      '</div>' +
    '</div>';

    if (editing) {
      const host = document.getElementById('vb-sel-ed');
      if (host) { wireEditor(host); loadCompanies().then(fillCompanyList); }
    }
    // Tengja title-input við vistun (debounced + blur/Enter)
    const tInp = document.getElementById('vb-sel-title');
    if (tInp) {
      let _tt = null;
      const saveTitle = () => { clearTimeout(_tt); saveRow(Number(tInp.dataset.selid), { title: tInp.value }); };
      tInp.addEventListener('input', () => { clearTimeout(_tt); _tt = setTimeout(saveTitle, 500); });
      tInp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); tInp.blur(); saveTitle(); } });
    }
    const dTa = document.getElementById('vb-draft-reply');
    if (dTa) {
      dTa.addEventListener('input', function () {
        const rid = dTa.getAttribute('data-id');
        if (!rid) return;
        const cur = state.draftPack[rid] || parseDraftSummary((allItems().find(function (x) { return String(x.id) === String(rid); }) || {}).summary) || { v: 1 };
        cur.reply = dTa.value;
        state.draftPack[rid] = cur;
      });
    }
    // Tengja notes-textarea við vistun (debounced) + sjálf-stækkun eftir innihaldi.
    // Stutt nóta (t.d. 5 línur) helst óbreytt (grunnhæð ~52px); löng nóta (t.d.
    // 100 línur) vex upp í +300% af gömlu 220px hámarki (880px) — annars skrunar.
    // setProperty(...,'important') — patch 245 (Brunastál) setur height:auto
    // !important á allar textareur og vinnur annars á venjulegu inline-height.
    const nTa = document.getElementById('vb-sel-notes');
    if (nTa) {
      let _nt = null;
      const saveNotes = () => { clearTimeout(_nt); saveRow(Number(nTa.dataset.selid), { notes: nTa.value }); };
      const CAP = Math.min(880, Math.round(window.innerHeight * 0.7));
      const grow = () => {
        // Fellt (▾ Fella): fast ~3ja lína hæð með innra skruni — langa nótan
        // þvingar þá ekki allt spjaldið í skrun. ▸ Stækka skilar sjálf-stækkun.
        if (notesMin()) { nTa.style.setProperty('height', '70px', 'important'); return; }
        nTa.style.setProperty('height', 'auto', 'important');
        nTa.style.setProperty('height', Math.min(nTa.scrollHeight + 4, CAP) + 'px', 'important');
      };
      grow();
      nTa.addEventListener('input', () => {
        grow();
        clearTimeout(_nt); _nt = setTimeout(saveNotes, 500);
      });
    }
    fixSelViewport();
  }

  // v3 task-röðin: 5px flokkslituð rönd · stjarna · mono-dags · titill+lýsing+
  // tenging · MERKI-dálkur (jafnbreiðir dökk-metal chippar) · STAÐA-pilla · ✕.
  function renderRow(r) {
    const open = state.expandedId === r.id;
    const done = !isOpen(r);
    const compact = state.viewMode === 'thett' && !open;
    // Breiðara viewið (▮ Ítarlegt, líka sjálfgefna „venjulegt"): skýringin fær
    // allt að 6 línur í stað einnar (ósk Agnars 11.7., +2 línur 2026-08-07) — Þétt heldur einni.
    const wide = state.viewMode !== 'thett';
    const who = effectiveAssignee(r);
    const di = dueInfo(r.due_at);
    const od = isOverdue(r);
    const chips = rowChips(r);
    // Innihaldslínan: nýjasta þráðasvar → ✨ samantekt → nótu-forsýn.
    const tl = state.threadLatest[r.id];
    const pvMax = state.viewMode !== 'thett' ? 930 : 260;
    const packHint = parseDraftSummary(r.summary);
    const desc = tl
      ? '↩ ' + (tl.mine ? 'Við svöruðum' : tl.from) + ' · ' + fmtShortDate(tl.at) + ' — ' + cleanPreview(tl.text, pvMax)
      : (packHint ? '📝 ' + cleanPreview(packHint.villa || 'Forvinna tilbúin', pvMax)
        : (r.summary ? '✨ ' + r.summary : cleanPreview(r.notes || '', pvMax)));
    const descColor = tl ? '#0f766e' : (packHint ? '#b45309' : (r.summary && /^✅|^⚠️/.test(r.summary) ? (/^⚠️/.test(r.summary) ? '#be123c' : '#047857') : '#5b6472'));
    // Litlar stöðu-flögur við lýsinguna (bíð-dagar / svarað / geymsla / gjalddagi)
    const flags =
      (isWaiting(r) ? '<span style="font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:7px;background:#fff1f2;color:#be123c;border:1px solid #fecdd3;white-space:nowrap">🔴 ' +
        (function (d) { return d === 0 ? 'kom í dag' : d === 1 ? 'bíður 1 dag' : 'bíður ' + d + ' daga'; })(waitDays(r)) + '</span>' : '') +
      (isPost(r) && !isWaiting(r) && isOpen(r) && isReplied(r) ? '<span style="font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:7px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;white-space:nowrap">✓ svarað</span>' : '') +
      (isArchived(r) ? '<span style="font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:7px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;white-space:nowrap">📦 geymsla</span>' : '') +
      (di ? '<span style="font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:7px;white-space:nowrap;font-family:\'JetBrains Mono\',ui-monospace,monospace;' +
        (od ? 'background:#fff1f2;color:#be123c;border:1px solid #fecdd3' : 'background:#fffbeb;color:#b45309;border:1px solid #fde68a') + '">📅 ' + esc(di.label) + '</span>' : '');
    const linkLine = r.customer_nafn
      ? '<span data-act="history" data-id="' + esc(r.id) + '" style="font-size:12.5px;font-weight:600;color:#2f5fe0;display:inline-flex;align-items:center;gap:5px;cursor:pointer">🏢 ' + esc(r.customer_nafn) + '</span>'
      : '<span style="font-size:12px;color:#94a3b8;font-style:italic;display:inline-flex;align-items:center;gap:5px">🔗 engin tenging</span>';
    return '<div class="task' + (open ? ' open' : '') + (done ? ' vb-done' : '') + '" data-id="' + esc(r.id) + '" data-act="expand" ' +
      'style="display:flex;align-items:stretch;gap:0;border-top:1px solid rgba(20,24,34,.07);cursor:pointer' + (done ? ';opacity:.62' : '') + '">' +
      '<span style="width:5px;flex:none;background:' + railColor(r) + '"></span>' +
      '<div style="flex:1;min-width:0;display:flex;gap:16px;padding:' + (compact ? '9px 18px' : '14px 18px') + ';align-items:flex-start" class="vb-rowflex">' +
        // 2026-07-22 (ósk Agnars — „gerðu stjörnuna stærri"): 15px → 22px.
        '<span data-act="star" data-id="' + esc(r.id) + '" title="Áríðandi" style="flex:none;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-top:-2px;font-size:22px;line-height:1;color:' + (r.important ? '#e0a93e' : '#cbd2dc') + '">' + (r.important ? '★' : '☆') + '</span>' +
        '<div class="vb-dags" style="width:74px;flex:none;font-family:\'JetBrains Mono\',ui-monospace,monospace;font-size:11.5px;color:#9098a6;padding-top:2px">' + fmtDots(r.created_at) + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:14px;font-weight:600;color:#11141c;' + (compact ? 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis' : 'line-height:1.35') + '">' +
            (done ? '<s style="color:#9098a6">' + esc(r.title || '(án titils)') + '</s>' : esc(r.title || '(án titils)')) + '</div>' +
          (!compact && desc ? '<div style="font-size:12.5px;color:' + descColor + ';margin-top:2px;' +
            (wide ? 'display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden;white-space:normal;overflow-wrap:break-word;line-height:1.5'
                  : 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis') + '">' + esc(desc) + '</div>' : '') +
          (!compact ? '<div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">' + linkLine + flags +
            (who ? '<span style="font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:7px;background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;white-space:nowrap">👤 ' + esc(who) + '</span>' : '') +
            taggedListChipsHtml(r) +
            (r._vd ? '<span style="font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:7px;background:#fef3c7;color:#92400e;border:1px solid #fde68a">📓 úr Verkdagbók</span>' : '') +
          '</div>' : '') +
          (open ? renderEditor(r) : '') +
        '</div>' +
        '<div class="vb-colmerki" style="width:220px;flex:none;display:flex;flex-wrap:wrap;gap:5px;justify-content:flex-end;align-content:flex-start">' +
          // EIN chippa-tegund (dökk-metal). Merkið sem flokkurinn þýðist í situr
          // fremst/efst; ef röðin ber það merki nú þegar er það EKKI tvítekið.
          chips.map(t => dkChip(t)).join('') +
        '</div>' +
        '<div class="vb-acts" style="flex:none;display:flex;align-items:center;gap:12px;padding-top:1px">' +
          /* 2026-07-20 (ósk Agnars): græni „📋 Færa"-flýtitakkinn fjarlægður af röðinni. */
          (isArchived(r) && isOpen(r) ? '<span data-act="unarchive" data-id="' + esc(r.id) + '" title="Taka úr geymslu" ' +
            'style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:8px;border:1px solid rgba(20,24,34,.16);background:linear-gradient(180deg,#fff,#e3e7ee);color:#3a4250;white-space:nowrap;cursor:pointer">↩ Út</span>' : '') +
          stadaPill(r) +
          (r._vd ? '' : '<span data-act="quickdel" data-id="' + esc(r.id) + '" title="Fela / eyða (endurheimtanlegt)" style="color:#cbd2dc;cursor:pointer;font-size:15px">✕</span>') +
        '</div>' +
      '</div>' +
    '</div>';
  }
  // Nótu-forsýn: fjarlægja langar slóðir (mailchimp/gallery o.fl.) sem gera
  // sjálfvirku póst-tilkynningarnar ólæsilegar á listanum.
  function cleanPreview(s, max) {
    return String(s || '').replace(/https?:\/\/\S+/g, '🔗').replace(/\[\s*🔗\s*\]/g, '🔗').replace(/\s+/g, ' ').trim().slice(0, max || 260);
  }
  function fmtShortDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.';
  }

  function renderEditor(r) {
    if (r._vd) {
      return '<div class="vb-ed" data-act="noexpand">' +
        (r.notes ? '<div style="font-size:13px;color:#475569;white-space:pre-wrap">' + esc(r.notes) + '</div>' : '<div class="vb-hint">Þjónustufærsla úr Verkdagbók.</div>') +
        '<div class="vb-ed-actions">' +
          '<button class="vb-btn" data-act="vd-open" data-id="' + esc(r.id) + '">📓 Opna í Verkdagbók</button>' +
          '<button class="vb-btn green" data-act="vd-done" data-id="' + esc(r.id) + '">✓ Klárað</button>' +
        '</div></div>';
    }
    const statusOpts = STATUS_ORDER.map(s => '<option value="' + s + '"' + (r.status === s ? ' selected' : '') + '>' + STATUSES[s].label + '</option>').join('');
    const prioOpts = Object.keys(PRIORITIES).map(p => '<option value="' + p + '"' + (r.priority === p ? ' selected' : '') + '>' + PRIORITIES[p] + '</option>').join('');
    const dueVal = r.due_at ? new Date(r.due_at).toISOString().slice(0, 10) : '';
    return '<div class="vb-ed" data-act="noexpand">' +
      '<div><label>Titill</label><input data-field="title" value="' + esc(r.title || '') + '"></div>' +
      '<div><label>Nótur</label><textarea data-field="notes" placeholder="Lýsing, símanúmer, krækjur…">' + esc(r.notes || '') + '</textarea></div>' +
      '<div class="vb-ed-grid">' +
        // 2026-07-22 (ósk Agnars — „fjarlægðu þennan fellilista"): Flokkur-valið
        // er farið. Flokkurinn er ekki lengur sérstakt hugtak í viðmótinu heldur
        // birtist sem venjulegt MERKI á röðinni, svo MERKI-hökin hér að neðan eru
        // eina flokkunartólið. Gildið í dálkinum stendur óbreytt í grunninum.
        '<div><label>Staða</label><select data-field="status">' + statusOpts + '</select></div>' +
        '<div><label>Forgangur</label><select data-field="priority">' + prioOpts + '</select></div>' +
        '<div><label>Starfsmaður</label><select data-field="assigned_to" data-id="' + esc(String(r.id)) + '">' +
          assigneeOptionsHtml(r) +
        '</select></div>' +
        '<div><label>Gjalddagi / dagsetning</label><input type="date" data-field="due_at" value="' + dueVal + '"></div>' +
      '</div>' +
      '<div><label>Viðskiptavinur</label><input data-field="customer_nafn" list="vb-companies" value="' + esc(r.customer_nafn || '') + '" placeholder="Fyrirtæki…"><datalist id="vb-companies"></datalist></div>' +
      // Merki (2026-07-10): smella til að setja/taka af — vistast strax í tags (jsonb).
      '<div><label>Merki</label><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:2px">' +
        TAG_ORDER.map(t => {
          // Hakið verður að spegla ÞAÐ SEM SÉST á röðinni (rowChips), ekki bara
          // tags-fylkið: merki sem flokkurinn leiðir af sér er sýnilegur chip og
          // hakið á að segja Á — annars stæði hakið á AF meðan chippinn logar.
          const d = TAGS[t], on = rowChips(r).indexOf(t) !== -1;
          return '<button data-act="tagtoggle" data-id="' + esc(r.id) + '" data-tag="' + t + '" type="button" ' +
            'style="font:inherit;font-size:11px;font-weight:700;padding:5px 10px;border-radius:99px;cursor:pointer;' +
            'color:' + (on ? '#fff' : d.color) + ';background:' + (on ? d.color : d.color + '12') + ';border:1.5px solid ' + d.color + (on ? '' : '44') + '">' +
            d.emoji + ' ' + esc(d.label) + '</button>';
        }).join('') +
      '</div></div>' +
      '<div class="vb-ed-actions">' +
        '<button class="vb-ai vb-btn" data-act="ai" data-id="' + esc(r.id) + '">✨ Tillaga</button>' +
        // ✉️ Svara — beint úr borðinu (2026-07-10): opnar sama svar-gluggann og
        // Reikninga-póstur (Claude semur uppkast → yfirfara → senda gegnum Resend).
        // Aðeins á póst-beiðnum sem eiga upprunapóst (channel_ref='email:<id>').
        (isEmailBeidni(r) ? '<button class="vb-btn" data-act="reply" data-id="' + esc(r.id) + '" title="Svara póstinum — Claude semur uppkast sem þú yfirferð og sendir">✉️ Svara</button>' : '') +
        // Pósthólf ↔ Verkefni. 2026-07-20 (ósk Agnars): „📋 Færa á verkefnalistann"
        // fjarlægt úr ritlinum — of margir hnappar. „↩ Í pósthólfið" heldur sér svo
        // hægt sé að bakka færslu sem er þegar komin á listann.
        (isEmailBeidni(r) && isOpen(r) && !isPost(r)
          ? '<button class="vb-btn" data-act="demote" data-id="' + esc(r.id) + '" title="Setja aftur í pósthólfið">↩ Í pósthólfið</button>' : '') +
        (r.customer_nafn ? '<button class="vb-btn" data-act="history" data-id="' + esc(r.id) + '" title="Öll gögn kúnnans — sölur, Payday-kröfur, skýrslur og samningar (sami gluggi og á Sölu)">🧾 Sjá fyrri viðskipti</button>' : '') +
        // 📞 Hringja: fyrsta símanúmerið úr titli/nótum verður tel:-hlekkur.
        (function () {
          const m = String((r.title || '') + ' ' + (r.notes || '')).match(/\b[4-8]\d{2}[- ]?\d{4}\b/);
          return m ? '<a class="vb-btn" data-act="noexpand" href="tel:' + m[0].replace(/\D/g, '') + '" style="text-decoration:none;display:inline-flex;align-items:center">📞 Hringja ' + m[0] + '</a>' : '';
        })() +
        /* 2026-07-20 (ósk Agnars): „📦 Í geymslu" fjarlægt úr ritlinum.
           Aðgerðin sjálf (data-act="archive") lifir áfram — „↩ Út" á geymdum
           röðum notar hana — svo ekkert er eytt og hægt er að bakka. */
        '<span style="flex:1"></span>' +
        '<button class="vb-btn red" data-act="del" data-id="' + esc(r.id) + '">🗑 Eyða</button>' +
        (isOpen(r) ? '<button class="vb-btn green" data-act="done" data-id="' + esc(r.id) + '">✓ Klára verk</button>' : '') +
        '<button class="vb-btn" data-act="collapse">Loka glugga</button>' +
      '</div></div>';
  }

  // ── event wiring ─────────────────────────────────────────────────────────
  let _searchTimer = null, _noteTimer = null;
  function wireDelegation(root) {
    root.addEventListener('click', e => {
      const t = e.target.closest('[data-act]'); if (!t) return;
      const act = t.getAttribute('data-act');
      const id = t.getAttribute('data-id');
      const nid = id && id.indexOf('vd:') !== 0 ? Number(id) : id;
      if (act === 'add') { doAdd(); return; }
      if (act === 'addmore') { doAdd(true); return; }
      if (act === 'email') { ingestEmailHere(t); return; }
      // 🔑 Viðskiptavinavefir — sjálfstæð stjórnsíða (/gatt-admin/), ekki view.
      // Opnast í nýjum flipa svo starfsfólk missi ekki Þjónustuborðið.
      if (act === 'gattadmin') { window.open('/gatt-admin/', '_blank', 'noopener'); return; }
      if (act === 'addtag') {
        const tg = t.getAttribute('data-tag'), d = TAGS[tg];
        const i = state.addTags.indexOf(tg);
        if (i === -1) state.addTags.push(tg); else state.addTags.splice(i, 1);
        const on = i === -1;
        t.style.color = on ? '#fff' : d.color;
        t.style.background = on ? d.color : d.color + '12';
        t.style.borderColor = d.color + (on ? '' : '44');
        syncAddTags();
        return;
      }
      if (act === 'addtagged') {
        const w = t.getAttribute('data-worker');
        if (!w) return;
        const i = state.addTagged.indexOf(w);
        if (i === -1) state.addTagged.push(w); else state.addTagged.splice(i, 1);
        const on = i === -1;
        t.style.color = on ? '#0f766e' : '#64748b';
        t.style.background = on ? '#ccfbf1' : '#fff';
        t.style.border = on ? '1.5px solid #14b8a6' : '1px solid #d8dadf';
        t.textContent = (on ? '🏷 ' : '') + w;
        return;
      }
      if (act === 'tagworker') {
        e.stopPropagation();
        const rid = Number(t.getAttribute('data-id'));
        const row = state.items.find(x => x.id === rid); if (!row) return;
        const name = t.getAttribute('data-worker');
        saveRow(rid, { tags: toggleTaggedWorker(row, name) });
        renderControls(); renderList(); renderSel(); refreshBadge();
        return;
      }
      if (act === 'addtype') {
        state.addType = t.getAttribute('data-type');
        root.querySelectorAll('.vb-add-types .vb-tchip').forEach(c => {
          const ct = c.getAttribute('data-type'), on = ct === state.addType, d = typeDef(ct);
          c.classList.toggle('active', on);
          // Lita-chipparnir (2026-07-10): inline-litirnir verða að fylgja valinu.
          c.style.color = on ? '#fff' : d.color;
          c.style.background = on ? d.color : d.bg;
          c.style.borderColor = d.color + (on ? '' : '55');
        });
        const inp = document.getElementById('vb-add-input'); if (inp) inp.focus();
        return;
      }
      if (act === 'queue') { setQueue(t.getAttribute('data-q')); state.page = 0; renderControls(); renderList(); return; }
      if (act === 'filter') { setFilter(t.getAttribute('data-f')); renderControls(); renderList(); return; }
      if (act === 'sort') { setSort(t.getAttribute('data-s')); state.colSort = null; state.page = 0; renderControls(); renderList(); return; }
      if (act === 'viewmode') { setViewMode(t.getAttribute('data-vm')); renderControls(); renderList(); return; }
      // v3: composer-toggl (+ Nýtt mál), ⭐ Áríðandi-sía, dálkaröðun, síðuskipting.
      if (act === 'composer') {
        state.composerOpen = !state.composerOpen;
        const p = document.getElementById('vb-composer');
        if (p) { p.style.display = state.composerOpen ? 'block' : 'none'; if (state.composerOpen) { const i = document.getElementById('vb-add-input'); if (i) i.focus(); } }
        syncAddTags();
        return;
      }
      if (act === 'starfilter') { state.fStar = !state.fStar; state.page = 0; renderControls(); renderList(); return; }
      if (act === 'notesmin') {
        try { localStorage.setItem('vb_notes_min', notesMin() ? '0' : '1'); } catch (_) {}
        renderSel(); return;
      }
      // Innbyggða sían í MÁL-kortinu (efsta röðin) — snertir aðeins það kort.
      if (act === 'topfilter') { state.topFilter = t.getAttribute('data-tf') || 'allt'; renderTop(visibleRows()); return; }
      if (act === 'colsort') {
        e.stopPropagation();
        const k = t.getAttribute('data-k');
        state.colSort = (state.colSort && state.colSort.key === k)
          ? (state.colSort.dir === 'asc' ? { key: k, dir: 'desc' } : null)
          : { key: k, dir: k === 'dags' ? 'desc' : 'asc' };
        state.page = 0; renderList(); return;
      }
      if (act === 'page') {
        e.stopPropagation();
        state.page = Number(t.getAttribute('data-p')) || 0; renderList();
        const lc = document.getElementById('vb-list'); if (lc) lc.scrollIntoView({ block: 'start', behavior: 'smooth' });
        return;
      }
      // Fyrirtækjanafnið fremst í hausnum → fyrirtækjaspjaldið.
      // NB: loadCompanies() dugar EKKI hér. Hún sækir nafn/kennitölu/
      // customer_base_id en ALDREI fyrirtækis-id, svo co.id er alltaf undefined
      // og _openCompanySafe(undefined) hættir þegjandi. Þess vegna er flett upp
      // beint í fyrirtaeki-töflunni — sömu töflu og Companies.openDetail vinnur á.
      // Finnist nafnið ekki þar opnast „fyrri viðskipti" á nafninu í staðinn, svo
      // smellurinn skili alltaf einhverju.
      if (act === 'openco') {
        e.stopPropagation();
        const nafn = String(t.getAttribute('data-co') || '').trim();
        if (!nafn) return;
        const go = coId => {
          if (coId && window._openCompanySafe) { window._openCompanySafe(coId); return; }
          if (window.SalaCustomerHistory && SalaCustomerHistory.open) {
            SalaCustomerHistory.open({ id: '', source: '', kt: '', nafn });
          } else {
            toast('Fann ekki „' + nafn + '“ á fyrirtækjaskrá');
          }
        };
        const SB = getSB();
        if (!SB) { go(null); return; }
        SB.from('fyrirtaeki').select('id').ilike('nafn', nafn).is('deleted_at', null).limit(1)
          .then(res => go(res && res.data && res.data.length ? res.data[0].id : null))
          .catch(() => go(null));
        return;
      }
      if (act === 'history') {
        e.stopPropagation();
        const row = state.items.find(x => x.id === Number(t.getAttribute('data-id')));
        if (!row || !window.SalaCustomerHistory || !SalaCustomerHistory.open) return;
        loadCompanies().then(cos => {
          const co = (cos || []).find(c => String(c.nafn || '').trim().toLowerCase() === String(row.customer_nafn || '').trim().toLowerCase());
          // Fannst á skrá → full kt-uppfletting (sölur+Payday+skjöl+samningar);
          // annars nafna-leit (sýnir a.m.k. sölurnar á sama nafni).
          SalaCustomerHistory.open(co
            ? { id: co.id, source: 'fyrirtaeki', kt: co.kennitala || '', nafn: co.nafn }
            : { id: '', source: '', kt: '', nafn: row.customer_nafn || '' });
        });
        return;
      }
      if (act === 'tagfilter') { toggleTag(t.getAttribute('data-tag')); state.page = 0; renderControls(); renderList(); return; }
      if (act === 'tagclear') { state.fTags = []; try { localStorage.setItem(TGKEY, '[]'); } catch (_) {} state.page = 0; renderControls(); renderList(); return; }
      // ── Inline fyrirtæki-breyting í VALIÐ MÁL (2026-08-09) ───────────────
      if (act === 'editco') {
        e.stopPropagation();
        const wrap = document.getElementById('vb-sel-co'); if (!wrap) return;
        const cur = allItems().find(x => String(x.id) === String(id));
        const curVal = (cur && cur.customer_nafn) || '';
        const INP = 'flex:1;min-width:0;font:inherit;font-size:12.5px;padding:4px 8px;border:1.5px solid #4669b7;border-radius:7px;outline:none';
        wrap.innerHTML =
          '<div style="display:flex;align-items:center;gap:6px">' +
            '<input id="vb-sel-co-inp" list="vb-sel-colist" value="' + esc(curVal) + '" ' +
              'placeholder="Fyrirtæki…" autocomplete="off" style="' + INP + '">' +
            '<datalist id="vb-sel-colist"></datalist>' +
            '<button data-act="selco-save" data-id="' + esc(id) + '" title="Vista" ' +
              'style="flex:none;height:28px;padding:0 10px;border-radius:6px;border:1px solid #16a34a;background:#dcfce7;color:#166534;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer">✓</button>' +
            '<button data-act="selco-cancel" title="Hætta við" ' +
              'style="flex:none;height:28px;padding:0 10px;border-radius:6px;border:1px solid #d8dadf;background:#f8fafc;color:#4b5058;font-family:inherit;font-size:12px;cursor:pointer">✕</button>' +
          '</div>';
        loadCompanies().then(() => {
          const opts = (state.companies || []).slice(0, 1500).map(c => '<option value="' + esc(c.nafn) + '"></option>').join('');
          const dl = document.getElementById('vb-sel-colist'); if (dl) dl.innerHTML = opts;
        });
        const inp = document.getElementById('vb-sel-co-inp');
        if (inp) { inp.focus(); inp.select(); }
        return;
      }
      if (act === 'selco-cancel') {
        e.stopPropagation();
        const row = allItems().find(x => String(x.id) === String(id));
        const wrap = document.getElementById('vb-sel-co'); if (!wrap || !row) return;
        wrap.innerHTML = selCoHTML(row);
        return;
      }
      if (act === 'selco-save') {
        e.stopPropagation();
        const inp = document.getElementById('vb-sel-co-inp'); if (!inp) return;
        const nafn = inp.value.trim();
        const match = (state.companies || []).find(c => c.nafn === nafn);
        const patch = { customer_nafn: nafn || null, customer_base_id: match ? (match.customer_base_id || null) : null };
        saveRow(Number(id), patch);
        renderSel(); renderList();
        return;
      }
      if (act === 'tagtoggle') {
        e.stopPropagation();
        const rid = Number(t.getAttribute('data-id'));
        const row = state.items.find(x => x.id === rid); if (!row) return;
        const cur = rowTags(row), tg = t.getAttribute('data-tag');
        // Slökkt er á því sem SÉST (merkið getur logað vegna flokksins þótt það
        // sé ekki í tags). Þá þarf flokkurinn að fara með, annars stæði chippinn
        // eftir þótt hakið segði AF — kvörtunin sem lagfærð var 2026-07-20.
        const patch = {};
        if (rowChips(row).indexOf(tg) !== -1) {
          patch.tags = tagsWithCategory(row, cur.filter(x => x !== tg));
          if (flokkTag(row) === tg) patch.flokkur = null;
        } else {
          patch.tags = tagsWithCategory(row, cur.concat([tg]));
        }
        saveRow(rid, patch);
        renderControls(); renderList(); renderSel();
        return;
      }
      if (act === 'import') { importOld(); return; }
      // Þjónustuborð v2: flokka-sía, geymsla, klára.
      if (act === 'flokk') { const f = t.getAttribute('data-f'); setFlokk(state.fFlokk === f ? '' : f); renderControls(); renderList(); return; }
      if (act === 'showold') { state.showOld = !state.showOld; renderControls(); renderList(); return; }
      if (act === 'archive') {
        e.stopPropagation();
        saveRow(nid, { archived_at: nowIso() });
        toast('📦 Sett í geymslu'); state.expandedId = null;
        renderControls(); renderList(); refreshBadge(); return;
      }
      if (act === 'unarchive') {
        e.stopPropagation();
        saveRow(nid, { archived_at: null });
        toast('↩ Komið aftur í innhólfið');
        renderControls(); renderList(); refreshBadge(); return;
      }
      if (act === 'done') {
        e.stopPropagation();
        saveRow(nid, { status: 'lokad' });
        toast('✓ Verk klárað'); state.expandedId = null;
        renderControls(); renderList(); refreshBadge(); return;
      }
      // 📋 Færa póst úr Pósthólfi yfir á verkefnalistann (og ↩ til baka).
      if (act === 'promote') {
        e.stopPropagation();
        saveRow(nid, { promoted_at: nowIso() });
        toast('📋 Fært á verkefnalistann');
        renderControls(); renderList(); refreshBadge();
        return;
      }
      if (act === 'demote') {
        e.stopPropagation();
        saveRow(nid, { promoted_at: null });
        toast('📧 Fært aftur í pósthólfið');
        renderControls(); renderList(); refreshBadge();
        return;
      }
      if (act === 'noexpand') { e.stopPropagation(); return; }
      if (act === 'status') { e.stopPropagation(); advance(id); return; }
      if (act === 'star') { e.stopPropagation(); toggleStar(id); return; }
      if (act === 'ai') { e.stopPropagation(); aiSuggest(nid); return; }
      if (act === 'reply') {
        e.stopPropagation();
        const row = allItems().find(x => String(x.id) === String(nid));
        const pack = row ? (state.draftPack[row.id] || parseDraftSummary(row.summary) || null) : null;
        const ta = document.getElementById('vb-draft-reply');
        if (ta && pack) pack.reply = ta.value;
        replyToBeidni(nid, pack);
        return;
      }
      if (act === 'quickdel') { e.stopPropagation(); quickDelete(nid); return; }
      if (act === 'clearnoise') { clearPaymentNoise(); return; }
      if (act === 'clearoldrep') { clearOldYearReports(); return; }
      if (act === 'showoldrep') { state.showOldReports = !state.showOldReports; renderControls(); renderList(); refreshBadge(); return; }
      if (act === 'del') { e.stopPropagation(); softDelete(nid); return; }
      if (act === 'collapse') { e.stopPropagation(); state.expandedId = null; renderList(); return; }
      if (act === 'vd-open') { e.stopPropagation(); if (window.App && App.switchView) App.switchView('verkdagbok'); return; }
      if (act === 'vd-done') { e.stopPropagation(); vdSetDone(id.slice(3)); return; }
      if (act === 'vd-archive') { e.stopPropagation(); vdArchive(id.slice(3)); return; }
      if (act === 'sbpin') {
        e.stopPropagation();
        const row = allItems().find(x => String(x.id) === String(nid));
        if (row && window.Skipulagsbord) Skipulagsbord.addFromRow(row);
        return;
      }
      if (act === 'expand') {
        const rid = t.getAttribute('data-id');
        const real = rid && rid.indexOf('vd:') !== 0 ? Number(rid) : rid;
        state.expandedId = (state.expandedId === real) ? null : real;
        renderList();
        if (state.expandedId != null) loadCompanies().then(fillCompanyList);
        return;
      }

      // ── V3-aðgerðir (flokkakort + valið mál) ─────────────────────────────
      if (act === 'drafttoggle') {
        e.stopPropagation();
        const row = allItems().find(x => String(x.id) === String(nid));
        if (!row) return;
        const pack = state.draftPack[row.id] || parseDraftSummary(row.summary);
        const next = !isDraftPanelOpen(row, pack);
        writeDraftOpen(row.id, next);
        renderSel();
        if (next && !pack && !state.draftBusy[row.id]) {
          state.draftBusy[row.id] = true; renderSel();
          loadDraftPack(row, false).then(function () { renderSel(); });
        }
        return;
      }
      if (act === 'draftrun') {
        e.stopPropagation();
        const row = allItems().find(x => String(x.id) === String(nid));
        if (!row) return;
        writeDraftOpen(row.id, true);
        state.draftBusy[row.id] = true; renderSel();
        loadDraftPack(row, true).then(function () { renderSel(); });
        return;
      }
      if (act === 'draftsave') {
        e.stopPropagation();
        const row = allItems().find(x => String(x.id) === String(nid));
        if (row) saveDraftPack(row);
        return;
      }
      if (act === 'draftreply') {
        e.stopPropagation();
        const row = allItems().find(x => String(x.id) === String(nid));
        if (!row) return;
        const pack = state.draftPack[row.id] || parseDraftSummary(row.summary) || {};
        const ta = document.getElementById('vb-draft-reply');
        if (ta) pack.reply = ta.value;
        state.draftPack[row.id] = pack;
        replyToBeidni(row.id, pack);
        return;
      }
      if (act === 'draftinv') {
        e.stopPropagation();
        openDraftInvoice(t.getAttribute('data-sale'));
        return;
      }
      if (act === 'drafthist') {
        e.stopPropagation();
        const row = allItems().find(x => String(x.id) === String(nid));
        if (!row || !window.SalaCustomerHistory) return;
        const pack = state.draftPack[row.id] || {};
        if (pack.fid) {
          SalaCustomerHistory.open({ id: pack.fid, source: 'fyrirtaeki', kt: '', nafn: row.customer_nafn || '' });
        } else if (pack.historyUrl) {
          window.open(pack.historyUrl, '_blank', 'noopener');
        }
        return;
      }
      if (act === 'selrow') {
        state.selId = t.getAttribute('data-id');
        state.expandedId = null;
        renderList(); renderSel();
        // Load attachments in background; re-render panel when ready
        const _selId = state.selId;
        loadAttachments(_selId).then(function () {
          if (String(state.selId) === String(_selId)) renderSel();
        });
        const _row = allItems().find(x => String(x.id) === String(_selId));
        if (_row && !_row._vd) {
          loadDraftPack(_row, false).then(function () {
            if (String(state.selId) === String(_selId)) renderSel();
          });
        }
        return;
      }
      if (act === 'cattoggle') {
        const k = t.getAttribute('data-cat');
        state.catOpen[k] = state.catOpen[k] === false;
        renderList();
        return;
      }
      if (act === 'catadd') {
        e.stopPropagation();
        const k = t.getAttribute('data-cat');
        state.catAddOpen[k] = !state.catAddOpen[k];
        renderList();
        if (state.catAddOpen[k]) {
          const inp = document.querySelector('.vb-catadd-cust[data-cat="' + k + '"]');
          if (inp) inp.focus();
        }
        return;
      }
      if (act === 'catmore') {
        e.stopPropagation();
        state.catMore[t.getAttribute('data-cat')] = true;
        renderList();
        return;
      }
      if (act === 'edit') {
        e.stopPropagation();
        const rid = t.getAttribute('data-id');
        state.expandedId = rid && rid.indexOf('vd:') !== 0 ? Number(rid) : rid;
        renderSel();
        return;
      }
      // „🗓 Á dagskrá" / „Setja á dagskrá" — sami samningur og hönnunin lýsir:
      // vikubannerinn (#303) hlerar st-skra-verk og opnar gluggann forútfylltan.
      if (act === 'skra') {
        e.stopPropagation();
        const row = allItems().find(x => String(x.id) === String(t.getAttribute('data-id')));
        if (!row) return;
        const nafn = (row.customer_nafn || String(row.title || '').split(' — ')[0] || '').trim();
        // 2026-08-29 (Agnar): athugasemd málsins á að fylgja með á dagskrána.
        // Áður fór aðeins nafnið yfir og athugasemdareiturinn opnaðist tómur —
        // þá þurfti að skruna til baka í málið og afrita textann handvirkt.
        window.dispatchEvent(new CustomEvent('st-skra-verk', {
          detail: { name: nafn, id: row.id, note: String(row.notes || '').trim() },
        }));
        const main = document.getElementById('vb-main');
        if (main && main.scrollIntoView) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    });
    root.addEventListener('input', e => {
      if (e.target.id === 'vb-search') {
        clearTimeout(_searchTimer);
        _searchTimer = setTimeout(() => { state.search = e.target.value; renderList(); }, 180);
        return;
      }
      const f = e.target.getAttribute && e.target.getAttribute('data-field');
      if (f && (f === 'title' || f === 'notes')) {
        const id = currentEditorId(e.target);
        if (id == null) return;
        clearTimeout(_noteTimer);
        const val = e.target.value;
        _noteTimer = setTimeout(() => saveRow(id, { [f]: val }), 500);
      }
    });
    // MERKI-röðin fylgir innihaldi verk-reitsins (sjá syncAddTags).
    root.addEventListener('input', e => { if (e.target.id === 'vb-add-input') syncAddTags(); });
    root.addEventListener('keydown', e => {
      if (e.target.id === 'vb-add-input' && e.key === 'Enter') { e.preventDefault(); doAdd(); }
      if (e.target.id === 'vb-add-cust' && e.key === 'Enter') { e.preventDefault(); document.getElementById('vb-add-input')?.focus(); }
      // Flokka-flýtiformið (catadd): Enter í fyrirtækja-reitnum hoppar í texta-
      // reitinn; Enter í texta-reitnum vistar — sama „Enter vistar" venja og
      // aðal-composerinn.
      if (e.target.classList && e.target.classList.contains('vb-catadd-cust') && e.key === 'Enter') {
        e.preventDefault();
        const k = e.target.getAttribute('data-cat');
        document.querySelector('.vb-catadd-txt[data-cat="' + k + '"]')?.focus();
      }
      if (e.target.classList && e.target.classList.contains('vb-catadd-txt') && e.key === 'Enter') {
        e.preventDefault();
        catQuickAdd(e.target.getAttribute('data-cat'));
      }
      if (e.target.id === 'vb-sel-co-inp' && e.key === 'Enter') {
        e.preventDefault();
        const btn = root.querySelector('[data-act="selco-save"]'); if (btn) btn.click();
      }
    });
    // Fyrirtækja-datalist quick-línunnar fyllist við fyrstu snertingu (lazy).
    // Sami deilda datalistinn (#vb-add-colist) þjónar bæði aðal-composernum
    // og öllum flokka-flýtiformunum.
    root.addEventListener('focusin', e => {
      if (e.target.id === 'vb-add-cust' || e.target.id === 'vb-add-input' ||
        (e.target.classList && e.target.classList.contains('vb-catadd-cust'))) loadCompanies().then(fillCompanyList);
    });
    // RSK-uppfletting (2026-07-10, ósk Agnars — „finna þá fyrirtæki á skrá eða
    // rsk"): sé KENNITALA (10 tölustafir) slegin í fyrirtækjareitinn flettist
    // hún upp í RSK fyrirtækjaskrá gegnum /api/kt-lookup og reiturinn fyllist
    // með opinbera nafninu; kt+heimilisfang geymast og fara í nótur verksins.
    root.addEventListener('change', async e => {
      if (e.target.id !== 'vb-add-cust') return;
      const digits = String(e.target.value || '').replace(/\D/g, '');
      if (digits.length !== 10) { state.addRsk = null; return; }
      const inp = e.target;
      inp.style.borderColor = '#d97706';
      // 1) Leita INNAN KERFIS fyrst (eins og sölusíðan) — nafn/kt í fyrirtæki+
      //    viðskiptavini+base. Finnist kt → fylla nafn + tengja base beint.
      await loadCompanies();
      const inSys = (state.companies || []).find(c => String(c.kennitala || '').replace(/\D/g, '') === digits);
      if (inSys) {
        inp.value = inSys.nafn; inp.style.borderColor = '#16a34a';
        state.addRsk = { kt: digits, nafn: inSys.nafn, heimilisfang: '', baseId: inSys.customer_base_id || null, inSystem: true };
        toast('✓ ' + inSys.nafn + ' — í kerfinu');
        return;
      }
      // 2) Ekki í kerfinu → RSK-uppfletting
      fetch('/.netlify/functions/kt-lookup?kt=' + digits)
        .then(r => r.ok ? r.json() : Promise.reject(new Error('fannst ekki')))
        .then(d => {
          if (!d || !d.nafn) throw new Error('fannst ekki');
          state.addRsk = { kt: digits, nafn: d.nafn, heimilisfang: [d.heimilisfang, d.postnumer, d.stadur].filter(Boolean).join(' ') };
          inp.value = d.nafn;
          inp.style.borderColor = '#16a34a';
          toast('RSK: ' + d.nafn + (state.addRsk.heimilisfang ? ' · ' + state.addRsk.heimilisfang : ''));
        })
        .catch(() => { state.addRsk = null; inp.style.borderColor = '#dc2626'; toast('Kennitalan fannst ekki í RSK'); });
    });
    root.addEventListener('change', e => {
      if (e.target.id === 'vb-worker-filter') {
        setWorker(e.target.value); state.page = 0;
        renderControls(); renderList(); refreshBadge();
        return;
      }
      const f = e.target.getAttribute && e.target.getAttribute('data-field');
      if (!f) return;
      const id = currentEditorId(e.target);
      if (id == null) return;
      let val = e.target.value;
      if (f === 'due_at') val = val ? new Date(val + 'T00:00:00').toISOString() : null;
      if (f === 'assigned_to') val = assignedForNew(val);
      if (f === 'customer_nafn') {
        const match = (state.companies || []).find(c => c.nafn === val);
        saveRow(id, { customer_nafn: val || null, customer_base_id: match ? match.customer_base_id : null });
      } else if (f === 'assigned_to') {
        const row = state.items.find(x => String(x.id) === String(id));
        const patch = { assigned_to: val };
        if (row) {
          const next = Object.assign({}, row, { assigned_to: val });
          const tw = taggedWorkers(row).filter(function (n) { return n !== (val || ''); });
          patch.tags = tagsWithWorkers(next, tw);
        }
        saveRow(id, patch);
      } else {
        saveRow(id, { [f]: val });
      }
      if (f === 'status' || f === 'type' || f === 'assigned_to') { renderControls(); renderList(); renderSel(); refreshBadge(); }
    });
  }
  function currentEditorId(el) {
    return resolveEditorRowId(el, state.selId, state.expandedId);
  }
  function doAdd(expand) {
    const inp = document.getElementById('vb-add-input'); if (!inp) return;
    const cust = document.getElementById('vb-add-cust');
    const v = inp.value; inp.value = '';
    const cv = cust ? cust.value : '';
    if (cust) cust.value = '';
    // Merkin tekin SAMSTUNDIS (quickAdd er async — má ekki lesa state eftir hreinsun).
    // RSK-uppflettingin (ef kt var slegin inn) fylgir verkinu í nótur.
    const rsk = (state.addRsk && cv && state.addRsk.nafn === cv) ? state.addRsk : null;
    state.addRsk = null;
    if (cust) cust.style.borderColor = '';
    const wsel = document.getElementById('vb-add-worker');
    const worker = wsel ? wsel.value : (defaultAddWorker() || '');
    quickAdd(v, state.addType, cv, !!expand, state.addTags.slice(), rsk, worker, state.addTagged.slice());
    state.addTags = [];
    state.addTagged = [];
    document.querySelectorAll('#view-verkbord [data-act="addtag"]').forEach(c => {
      const d = TAGS[c.getAttribute('data-tag')]; if (!d) return;
      c.style.color = d.color; c.style.background = d.color + '12'; c.style.borderColor = d.color + '44';
    });
    document.querySelectorAll('#view-verkbord [data-act="addtagged"]').forEach(c => {
      const w = c.getAttribute('data-worker');
      c.style.color = '#64748b'; c.style.background = '#fff'; c.style.border = '1px solid #d8dadf';
      c.textContent = w || '';
    });
    syncAddTags();
    inp.focus();
  }
  // Flokka-flýtiskráning (2026-08-10, ósk Agnars): sama quickAdd() sem knýr
  // aðal-composerinn, en kallað beint úr flokkahausnum — forfyllt með ÞESSU
  // merki einu (ekki state.addTags, sem er fyrir aðal-composerinn) og núverandi
  // starfsmanna-síu (state.fWorker — sami veljari og „Allir án Agnars" efst á
  // borðinu). Nema_agnar/allir skrifa ekki sentinels í assigned_to.
  async function catQuickAdd(cat) {
    const custEl = document.querySelector('.vb-catadd-cust[data-cat="' + cat + '"]');
    const txtEl = document.querySelector('.vb-catadd-txt[data-cat="' + cat + '"]');
    if (!txtEl) return;
    const v = txtEl.value;
    if (!v.trim()) { txtEl.focus(); return; }
    const cv = custEl ? custEl.value : '';
    txtEl.value = ''; if (custEl) custEl.value = '';
    await quickAdd(v, null, cv, false, [cat], null, defaultAddWorker());
    // quickAdd endurteiknar #vb-list — sækja ferskt eintak áður en fókusað er.
    const freshTxt = document.querySelector('.vb-catadd-txt[data-cat="' + cat + '"]');
    if (freshTxt) freshTxt.focus();
  }
  // ✉️ Sækja tölvupóst — endurnýtir póst-innsogið úr Þjónustuveri (182, sama
  // tafla thjonustubeidni, idempotent á channel_ref) og endurhleður borðið.
  async function ingestEmailHere(btn) {
    if (!window.Thjonustuver || !Thjonustuver.ingestEmail) { toast('Póst-innsogið (182) er ekki hlaðið'); return; }
    const old = btn.textContent;
    btn.disabled = true; btn.textContent = '✉️ Sæki…';
    try { await Thjonustuver.ingestEmail(); } catch (e) { toast('Villa: ' + (e.message || e)); }
    btn.disabled = false; btn.textContent = old;
    load();
  }
  // Er þetta beiðni sem varð til úr pósti? channel_ref='email:<email_digest.id>'
  // (sett af Þjónustuver ingestEmail) → hægt að svara sendandanum.
  function isEmailBeidni(r) {
    return !!(r && (r.source === 'email' || /^email:/.test(String(r.channel_ref || ''))));
  }
  // ✉️ Svara — flettir upp upprunapóstinum (email_digest) og opnar svar-gluggann
  // úr Reikninga-pósti (240, ReikningaPostur.replyTo). Ef forvinna er til
  // (pack.reply) fer textinn inn í gluggann og Claude semur EKKI yfir hann.
  // Ekkert sent fyrr en Senda svar er smellt. Allt samtalið gerist á borðinu.
  async function replyToBeidni(id, pack) {
    const row = state.items.find(x => String(x.id) === String(id)); if (!row) return;
    if (!window.ReikningaPostur || !ReikningaPostur.replyTo) { toast('Svar-vélin (Reikninga-póstur, 240) er ekki hlaðin'); return; }
    const ref = String(row.channel_ref || '');
    const digestId = ref.indexOf('email:') === 0 ? ref.slice(6) : null;
    let m = null;
    const SB = getSB();
    if (digestId && SB) {
      try {
        const r = await SB.from('email_digest')
          .select('message_id,sender_name,sender_email,subject,snippet,body_preview')
          .eq('id', digestId).maybeSingle();
        if (r && r.data) {
          const e = r.data;
          m = { message_id: e.message_id, sender_name: e.sender_name || row.customer_nafn || '',
            from: e.sender_email || '', subject: e.subject || row.title || '',
            body_preview: e.body_preview || '', snippet: e.snippet || row.notes || '' };
        }
      } catch (_) {}
    }
    // Fallback ef digest-röðin fannst ekki — nota það sem er á beiðninni.
    if (!m) m = { message_id: null, sender_name: row.customer_nafn || '', from: '', subject: row.title || '', body_preview: '', snippet: row.notes || '' };
    if (!m.from) { toast('Ekkert sendandanetfang fannst á þessari beiðni — opnaðu upprunapóstinn í Reikninga-pósti.'); return; }
    // Þegar svarið er SENT (Resend-ok í 240-glugganum) fær beiðnin svarad_at —
    // hún dettur þá sjálfkrafa úr „🔴 Bíða svars" og ber „✓ svarað"-merkið.
    m._onSent = () => {
      saveRow(row.id, { svarad_at: nowIso(), status: row.status === 'nytt' ? 'i_vinnslu' : row.status });
      renderControls(); renderList(); refreshBadge();
    };
    if (pack && pack.reply) {
      m.draftBody = String(pack.reply);
      m.draftSummary = String(pack.villa || '');
    }
    ReikningaPostur.replyTo(m);
  }
  function advance(id) {
    if (typeof id === 'string' && id.indexOf('vd:') === 0) { return; }
    const rid = Number(id);
    const row = state.items.find(x => x.id === rid); if (!row) return;
    const ns = nextStatus(row.status);
    saveRow(rid, { status: ns });
    renderControls(); renderList(); refreshBadge();
  }
  function toggleStar(id) {
    if (typeof id === 'string' && id.indexOf('vd:') === 0) return;
    const rid = Number(id);
    const row = state.items.find(x => x.id === rid); if (!row) return;
    saveRow(rid, { important: !row.important });
    renderControls(); renderList(); refreshBadge();
  }
  function wireEditor(rowEl) {
    // Nótu-svæðið stækkar sjálft að innihaldinu (upp að ~60% skjáhæðar) og
    // heldur áfram að vaxa á meðan skrifað er; resize:vertical leyfir handvirkt.
    const ta = rowEl.querySelector('textarea[data-field="notes"]');
    if (ta) {
      // setProperty(...,'important') — patch 245 (Brunastál) setur height:auto
      // !important á allar textareur og vinnur annars á venjulegu inline-height.
      const cap = Math.max(360, Math.round(window.innerHeight * 0.65));
      const grow = () => {
        ta.style.setProperty('height', 'auto', 'important');
        ta.style.setProperty('height', Math.min(ta.scrollHeight + 4, cap) + 'px', 'important');
      };
      grow();
      ta.addEventListener('input', grow);
    }
  }
  function fillCompanyList() {
    if (!state.companies) return;
    const opts = state.companies.slice(0, 1500).map(c => '<option value="' + esc(c.nafn) + '"></option>').join('');
    const dl = document.getElementById('vb-companies'); if (dl) dl.innerHTML = opts;
    const dl2 = document.getElementById('vb-add-colist'); if (dl2) dl2.innerHTML = opts;   // quick-línan (2026-07-10)
  }

  // ── deep-link re-assert (speglar patch 219 fyrir #bilstjori) ─────────────
  // Fersk hleðsla á /#verkbord lenti áður á Sölu: view-verkbord verður ekki til
  // fyrr en show() keyrir, svo patch 218 applyHash hunsaði slug-inn („unknown
  // slug") og sala.js boot-landerinn vann. Hér á Verkborð sinn eigin slug —
  // endurtekur show() þar til við erum komin ÞANGAÐ, notandinn grípur inn í,
  // eða hash-ið hættir að vera okkar.
  let _userTook = false;
  ['pointerdown', 'mousedown', 'keydown', 'touchstart'].forEach(ev =>
    window.addEventListener(ev, () => { _userTook = true; }, { capture: true, passive: true }));
  function hashIsMine() {
    const h = (location.hash || '').replace(/^#/, '').toLowerCase();
    return h === NAV_KEY || h === 'verkefni';
  }
  // NB: boot-landerinn sem stelur fókus speglast í hash-ið með replaceState
  // (patch 218 wrapperinn) — það kveikir EKKI hashchange, svo lykkjan má ekki
  // lesa location.hash til að hætta. Alvöru leiðsögn (hashchange-atburður)
  // hækkar _navGen og drepur gömlu lykkjuna.
  let _navGen = 0;
  function openFromHash() {
    _navGen++;
    if (!hashIsMine()) return;
    const gen = _navGen;
    const deadline = Date.now() + 5000;
    let skippedOnce = false;
    (function tick() {
      if (_userTook || gen !== _navGen || Date.now() > deadline) return;
      // Framandi hash: (a) alvöru leiðsögn þar sem hashchange hefur ekki enn
      // keyrt — show() núna myndi replaceState-a hash-ið til baka og gleypa
      // leiðsögnina; (b) hljóðlát spegluð stuldar-uppfærsla (replaceState, engin
      // atburður) — þá EIGUM við að re-asserta. Sleppum EINUM tick: (a) hækkar
      // _navGen fyrir næsta tick og drepur lykkjuna, (b) gerir það ekki.
      if (!hashIsMine() && !skippedOnce) { skippedOnce = true; setTimeout(tick, 70); return; }
      skippedOnce = false;
      try {
        const active = document.querySelector('.view.active');
        if (!active || active.id !== VIEW_ID) show();   // lander stal fókus → aftur á Verkborð
      } catch (_) {}
      setTimeout(tick, 70);
    })();
  }

  // ── boot ──────────────────────────────────────────────────────────────────
  function boot() {
    injectNav();
    patchSwitchView();
    ensureView();   // view-verkbord til strax → patch 218 getur leyst #verkbord
    openFromHash(); // deep-link á fyrstu hleðslu (þolir sala.js boot-landerinn)
    window.addEventListener('hashchange', openFromHash);
    setTimeout(() => { injectNav(); patchSwitchView(); }, 1500);
    // keep the "Í dag" badge fresh once settings/DB are warm
    if (window.AppSettings && AppSettings.onChange) AppSettings.onChange(() => refreshBadge());
    // light preload so the badge has a number before first open
    setTimeout(() => { if (getSB() && !state.items.length) quietCount(); }, 2500);
  }
  async function quietCount() {
    const SB = getSB(); if (!SB) return;
    try {
      const a = await SB.from('thjonustubeidni').select('*').is('deleted_at', null).range(0, 1499);
      if (!a.error) { state.items = a.data || []; }
      const b = await SB.from('verkdagbok').select('*').eq('done', false).eq('archived', false).range(0, 499);
      if (b && !b.error) state.vd = b.data || [];
      refreshBadge();
    } catch (_) {}
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // Patch 343: confirmed AI / derived actions only. Never DELETE. Never guess a site.
  async function applyActions(actions) {
    const SB = getSB();
    if (!SB) { toast('Engin gagnabankatenging'); return { created: 0, closed: 0, tagged: 0, notes: 0, skipped: 0, errors: ['no sb'] }; }
    const out = { created: 0, closed: 0, tagged: 0, notes: 0, skipped: 0, errors: [] };
    const list = Array.isArray(actions) ? actions : [];
    for (let i = 0; i < list.length; i++) {
      const a = list[i] || {};
      try {
        if (a.op === 'create') {
          const title = String(a.title || '').trim().slice(0, 240);
          if (!title) { out.skipped++; continue; }
          const ref = a.channel_ref ? String(a.channel_ref).slice(0, 120) : '';
          if (ref) {
            const dup = state.items.find(x => String(x.channel_ref || '') === ref && x.status !== 'lokad');
            if (dup) { out.skipped++; continue; }
          }
          const tags = Array.isArray(a.tags) ? a.tags.filter(t => TAGS[t]) : [];
          const obj = {
            title,
            notes: String(a.notes || '').slice(0, 4000),
            type: TYPES[a.type] ? a.type : 'annad',
            status: 'nytt',
            priority: a.important ? 'har' : 'venjulegur',
            customer_nafn: a.customer_nafn || null,
            customer_base_id: a.customer_base_id || null,
            tags,
            flokkur: FLOKKAR[a.flokkur] ? a.flokkur : null,
            source: (ref && ref.indexOf('email:') === 0) ? 'email' : 'cowork',
            channel_ref: ref || null,
            important: a.important === true,
            created_at: nowIso(), created_by: currentUser(), updated_at: nowIso()
          };
          const r = await SB.from('thjonustubeidni').insert(obj).select().single();
          if (r.error) throw r.error;
          state.items.unshift(r.data);
          out.created++;
        } else if (a.op === 'close') {
          const id = Number(a.id);
          if (!id) { out.skipped++; continue; }
          await saveRow(id, { status: 'lokad' });
          out.closed++;
        } else if (a.op === 'tag') {
          const id = Number(a.id);
          const row = state.items.find(x => x.id === id);
          if (!row) { out.skipped++; continue; }
          const cur = rowTags(row);
          const add = Array.isArray(a.add_tags) ? a.add_tags.filter(t => TAGS[t] && cur.indexOf(t) === -1) : [];
          if (!add.length) { out.skipped++; continue; }
          await saveRow(id, { tags: tagsWithCategory(row, cur.concat(add)) });
          out.tagged++;
        } else if (a.op === 'notes') {
          const id = Number(a.id);
          const row = state.items.find(x => x.id === id);
          if (!row) { out.skipped++; continue; }
          const extra = String(a.notes || '').trim();
          if (!extra) { out.skipped++; continue; }
          const merged = ((row.notes ? String(row.notes).trim() + '\n\n' : '') + extra).slice(0, 8000);
          await saveRow(id, { notes: merged });
          out.notes++;
        } else if (a.op === 'draft') {
          const id = Number(a.id);
          const row = state.items.find(x => x.id === id);
          if (!row) { out.skipped++; continue; }
          const cur = rowTags(row);
          if (cur.indexOf('draft') === -1) cur.push('draft');
          const patch = { tags: tagsWithCategory(row, cur) };
          if (a.pack && typeof a.pack === 'object') patch.summary = encodeDraftSummary(a.pack);
          else if (a.summary && String(a.summary).indexOf(DRAFT_MARK) === 0) patch.summary = String(a.summary);
          await saveRow(id, patch);
          out.tagged++;
        } else {
          out.skipped++;
        }
      } catch (e) {
        out.errors.push(String((e && e.message) || e));
      }
    }
    renderControls(); renderList(); renderSel(); refreshBadge();
    return out;
  }

  window.Verkbord = {
    open: show, reload: load, importOld, applyActions,
    isOldYearReport, effectiveAssignee, matchesWorker, assignedForNew,
    canonFilter, isOwnerOverviewFilter,
    editorAssigneeValue, coerceRowId, resolveEditorRowId, keepSelectedId,
    knownWorkerFilter, workerFilterOptionsHtml, assigneeOptionsHtml,
    defaultAddWorker, addWorkerOptionsHtml,
    taggedWorkers, composeTags, tagsWithCategory, tagsWithWorkers, toggleTaggedWorker,
    parseDraftSummary, encodeDraftSummary, buildVilla, foldName,
    looksLikeAgnar, isGenericOperatorName, isAgnarFromNames, isAgnarUser,
    showOwnerChrome, effectiveQueue, applyStaffChrome,
    taggedWorkers, composeTags, tagsWithCategory, tagsWithWorkers, toggleTaggedWorker,
    parseDraftSummary, encodeDraftSummary, buildVilla, foldName,
    looksLikeAgnar, isGenericOperatorName, isAgnarFromNames, isAgnarUser,
    showOwnerChrome, effectiveQueue, applyStaffChrome,
    refreshChrome: function () {
      const main = document.getElementById('vb-main');
      if (main) renderAll();
      else applyStaffChrome();
    }
  };
  console.log('[patch-231] Verkborð installed — App.switchView("verkbord")');
})();
/* === END VERKBORÐ === */
