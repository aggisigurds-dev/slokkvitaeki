/* === KOSTNAÐUR (419) — 27.09.2026 ===
 *
 * Agnar: „síða í Slökkvitæki sem les viðhengin úr póstinum sjálfkrafa og flokkar þau … leyfir mér að tengja
 * við ákveðin verk, fyrirtæki, Teya-kortayfirlit og hvað sem það inniheldur … sumt eru reikningar á verkstæðið
 * og sumt á verk … sækja allt síðasta mánuðinn frá eldklar@eldklar.is … nefna síðuna Kostnaður."
 *
 * GÖGNIN
 *   Tafla `kostnadur` (ein röð = eitt viðhengi). Fyllt af brunaholf-fallinu kostnadur-sync-background: það les
 *   póst eldklar@eldklar.is (Gmail, format=full), vistar skjalið í lokaða bucketinn `kostnadur` og lætur Claude
 *   lesa seljanda, upphæð, VSK, línur og flokk. Þessi síða les töfluna beint (RLS: anon select/update) og skrifar
 *   AÐEINS tengingar/flokk/stöðu/nótu — strax á þjóninn (fjórar vélar vinna í sömu gögnum).
 *   Skjalið sjálft opnast um brunaholf /api/kostnadur?skra=<id> (undirrituð slóð, 1 klst).
 *
 * ÚTLIT — Brunastál C (hönnunarkerfið): stálplata, stálspjöld með hnoðuðum málmhaus, silfur/málm/rauðir takkar,
 * Playfair-tala í haus, engin emoji. Opið spjald lifir í breytu (_opid), ekki DOM-klasa; nótureitur er ekki
 * endurteiknaður meðan skrifað er (Stöðugt viðmót, reglur 1 og 7).
 */
(() => {
  if (window.__kostnadur419) return;
  window.__kostnadur419 = true;

  const NAV_KEY = 'kostnadur';
  const VIEW_ID = 'view-kostnadur';           // view-{NAV_KEY} svo beinirinn (218) finni hana
  const API = 'https://brunaholf.netlify.app/api/kostnadur';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,sans-serif';
  const DISPLAY = '"Playfair Display",Georgia,serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const STAL_IMG = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const RED = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';
  const RIVET = 'content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7)';

  const FLOKKAR = [
    ['verkstaedi', 'Verkstæði'], ['verk', 'Verk'], ['efni', 'Efni'], ['rekstur', 'Rekstur'],
    ['bill', 'Bíll'], ['hugbunadur', 'Hugbúnaður'], ['annad', 'Annað'], ['ekki_kostnadur', 'Ekki kostnaður'],
  ];
  const FLOKKUR_HEITI = Object.fromEntries(FLOKKAR);
  const TEGUND_HEITI = {
    reikningur: 'Reikningur', kvittun: 'Kvittun', teya_yfirlit: 'Teya-yfirlit', kortayfirlit: 'Kortayfirlit',
    greidsluselill: 'Greiðsluseðill', okkar_reikningur: 'Okkar reikningur', tilbod: 'Tilboð', annad: 'Annað',
  };

  const S = {
    rows: [], sott: false, bid: false, villa: '',
    sia: 'opid',          // opid | allt | teya | <flokkur> | otengt | hunsad
    leit: '', opid: null, sync: null,
    verk: [], mal: [], tengSott: false,
    leitFt: {}, leitVk: {},   // leitartexti í tengireitum per röð (lifir yfir teikningar)
  };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kr = (n) => (n == null || isNaN(+n) ? '—' : Math.round(+n).toLocaleString('is-IS').replace(/,/g, '.') + ' kr');
  const dags = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
  const lagt = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ð/g, 'd').replace(/þ/g, 'th').replace(/æ/g, 'ae').replace(/ö/g, 'o');
  const sb = () => (window.DB && DB.sb) || null;
  const toast = (m, villa) => { try { if (window.toast) return window.toast(m, villa ? 'error' : undefined); } catch (_) {} console[villa ? 'warn' : 'log']('[419] ' + m); };
  const fyrirtaeki = () => (window.Companies && Array.isArray(Companies.list) ? Companies.list : []);
  const ftNafn = (id) => { const c = fyrirtaeki().find((x) => String(x.id) === String(id)); return c ? c.nafn : 'Fyrirtæki #' + id; };
  const erTeya = (r) => r.tegund === 'teya_yfirlit' || r.tegund === 'kortayfirlit';
  const erHunsad = (r) => r.stada === 'hunsad';
  const erTengt = (r) => !!(r.fyrirtaeki_id || r.verkbeidni_id || r.thjonustubeidni_id);

  /* ── gögn ─────────────────────────────────────────────────────────────── */
  // Djúptengill (#kostnadur) opnar síðuna áður en DB.sb er til — beðið í allt að 15 sek í stað þess að gefast upp.
  async function bidaEftirDb() {
    for (let i = 0; i < 60 && !sb(); i++) await new Promise((r) => setTimeout(r, 250));
    return sb();
  }
  async function saekja() {
    const c = await bidaEftirDb();
    if (!c) { S.villa = 'Engin tenging við gagnagrunninn'; return; }
    S.bid = true;
    // Síðuð sókn (1000 í senn) — PostgREST skilar mest 1000 röðum, svo fastur .limit() yfir því þegir um restina.
    const allt = [];
    for (let fra = 0; ; fra += 1000) {
      const { data, error } = await c.from('kostnadur').select('*').order('mottekid_at', { ascending: false }).order('id', { ascending: false }).range(fra, fra + 999);
      if (error) { S.bid = false; S.villa = /does not exist|relation/.test(error.message) ? 'Taflan kostnadur er ekki til' : error.message; return; }
      allt.push(...(data || []));
      if (!data || data.length < 1000) break;
    }
    S.bid = false;
    S.villa = ''; S.rows = allt; S.sott = true;
  }
  async function saekjaTengingar() {
    if (S.tengSott) return;
    const c = await bidaEftirDb(); if (!c) return;
    S.tengSott = true;
    const [v, m] = await Promise.all([
      c.from('verkbeidnir').select('id,num,customer,status,created_at').order('created_at', { ascending: false }).limit(600),
      c.from('thjonustubeidni').select('id,title,customer_nafn,status,created_at').is('deleted_at', null).order('created_at', { ascending: false }).limit(600),
    ]);
    S.verk = (v && v.data) || [];
    S.mal = (m && m.data) || [];
  }
  async function saekjaStodu() {
    try { const r = await fetch(API + '?stada=1'); const j = await r.json(); S.sync = j.stada || null; } catch (_) {}
  }
  // Allar breytingar fara strax á þjóninn; takist það ekki er villan sýnileg og röðin fær aftur fyrra gildi.
  async function uppfaera(id, patch) {
    const r = S.rows.find((x) => x.id === id); if (!r) return false;
    const fyrra = Object.assign({}, r);
    Object.assign(r, patch);
    teikna();
    const who = (window.BordStarfsmadur && BordStarfsmadur.get && BordStarfsmadur.get()) || null;
    const { error } = await sb().from('kostnadur').update(Object.assign({}, patch, { breytt_af: who })).eq('id', id);
    if (error) { Object.assign(r, fyrra); teikna(); toast('Vistaðist ekki: ' + error.message, true); return false; }
    return true;
  }

  /* ── tillögur um tengingu ─────────────────────────────────────────────── */
  function textiRadar(r) {
    return lagt([r.tilvisun, r.samantekt, r.efni, (r.linur || []).map((l) => l.lysing).join(' ')].join(' '));
  }
  function tillogurFt(r) {
    const t = textiRadar(r); if (!t) return [];
    const out = [];
    for (const c of fyrirtaeki()) {
      const n = lagt(c.nafn || ''), h = lagt((c.heimilisfang || '').split(',')[0]);
      let stig = 0;
      if (n.length > 4 && t.includes(n)) stig += 3;
      if (h.length > 6 && t.includes(h)) stig += 2;
      if (c.kennitala && r.tilvisun && String(r.tilvisun).replace(/\D/g, '').includes(String(c.kennitala).replace(/\D/g, ''))) stig += 3;
      if (stig) out.push({ c, stig });
    }
    return out.sort((a, b) => b.stig - a.stig).slice(0, 3).map((x) => x.c);
  }
  function leitFt(q) {
    const t = lagt(q).trim(); if (t.length < 2) return [];
    return fyrirtaeki().filter((c) => lagt(c.nafn).includes(t) || lagt(c.heimilisfang).includes(t) || String(c.kennitala || '').includes(t)).slice(0, 8);
  }
  function leitVerk(q) {
    const t = lagt(q).trim(); if (t.length < 1) return [];
    const v = S.verk.filter((x) => String(x.num || '').toLowerCase().includes(t) || lagt(x.customer).includes(t)).slice(0, 5).map((x) => ({ teg: 'v', id: x.id, heiti: (x.num || '#' + x.id) + ' · ' + (x.customer || '') }));
    const m = S.mal.filter((x) => lagt(x.title).includes(t) || lagt(x.customer_nafn).includes(t) || String(x.id) === t).slice(0, 5).map((x) => ({ teg: 'm', id: x.id, heiti: 'Mál ' + x.id + ' · ' + (x.customer_nafn || x.title || '') }));
    return v.concat(m);
  }
  const verkHeiti = (r) => {
    if (r.verkbeidni_id) { const v = S.verk.find((x) => x.id === r.verkbeidni_id); return v ? (v.num || '#' + v.id) + ' · ' + (v.customer || '') : 'Verk #' + r.verkbeidni_id; }
    if (r.thjonustubeidni_id) { const m = S.mal.find((x) => x.id === r.thjonustubeidni_id); return m ? 'Mál ' + m.id + ' · ' + (m.customer_nafn || m.title || '') : 'Mál #' + r.thjonustubeidni_id; }
    return '';
  };

  /* ── síun ──────────────────────────────────────────────────────────────── */
  function siad() {
    const q = lagt(S.leit).trim();
    return S.rows.filter((r) => {
      if (S.sia === 'opid' && (erHunsad(r) || r.stada === 'yfirfarid')) return false;
      if (S.sia === 'hunsad' && !erHunsad(r)) return false;
      if (S.sia === 'teya' && !erTeya(r)) return false;
      if (S.sia === 'otengt' && (erTengt(r) || erHunsad(r))) return false;
      if (FLOKKUR_HEITI[S.sia] && r.flokkur !== S.sia) return false;
      if (q && !lagt([r.seljandi, r.samantekt, r.efni, r.skra_nafn, r.reikningsnr, r.tilvisun, r.sendandi_email].join(' ')).includes(q)) return false;
      return true;
    });
  }
  const telja = (fn) => S.rows.filter(fn).length;

  /* ── teikning ──────────────────────────────────────────────────────────── */
  function viewEl() {
    let v = document.getElementById(VIEW_ID);
    if (!v) {
      v = document.createElement('div');
      v.id = VIEW_ID;
      v.className = 'view';
      const systkini = document.querySelector('.view');
      if (systkini && systkini.parentNode) systkini.parentNode.appendChild(v);
      else document.body.appendChild(v);
    }
    return v;
  }
  function haus(titill, hlid) {
    return '<div class="k9-haus"><span class="k9-titill">' + titill + '</span>' + (hlid || '') + '</div>';
  }
  function syncTexti() {
    const s = S.sync;
    if (!s) return 'Aldrei sótt';
    if (s.a_ferd) return 'Sæki… ' + (s.nyjar || 0) + ' ný skjöl lesin';
    return 'Síðast ' + dags(String(s.lokid || '').slice(0, 10)) + ' · ' + (s.nyjar || 0) + ' ný';
  }
  function sidaHtml() {
    const listi = siad();
    const samtals = listi.filter((r) => !erHunsad(r) && r.flokkur !== 'ekki_kostnadur' && !erTeya(r)).reduce((s, r) => s + (+r.upphaed || 0), 0);
    const siur = [
      ['opid', 'Óyfirfarið', telja((r) => !erHunsad(r) && r.stada !== 'yfirfarid')],
      ['otengt', 'Ótengt', telja((r) => !erTengt(r) && !erHunsad(r))],
      ['teya', 'Teya og kort', telja(erTeya)],
    ].concat(FLOKKAR.filter(([k]) => k !== 'ekki_kostnadur').map(([k, l]) => [k, l, telja((r) => r.flokkur === k && !erHunsad(r))]))
      .concat([['hunsad', 'Hunsað', telja(erHunsad)], ['allt', 'Allt', S.rows.length]]);
    const siuHtml = siur.map(([k, l, n]) => '<button type="button" class="k9-sia' + (S.sia === k ? ' on' : '') + '" data-k9="sia" data-v="' + k + '">' + esc(l) + '<span>' + n + '</span></button>').join('');
    const syncBid = !!(S.sync && S.sync.a_ferd);
    const hausHlid =
      '<span class="k9-plata" title="' + esc(S.sync && S.sync.villur && S.sync.villur.length ? S.sync.villur.slice(0, 5).join('\n') : 'Staða síðustu söfnunar úr pósti eldklar@eldklar.is') + '">' + esc(syncTexti()) + '</span>' +
      '<button type="button" class="k9-btn rautt" data-k9="sync"' + (syncBid ? ' disabled' : '') + '>Sækja úr pósti</button>';
    let efni;
    if (S.villa) efni = '<div class="k9-tomt">' + esc(S.villa) + '</div>';
    else if (!S.sott) efni = '<div class="k9-tomt">Sæki kostnað…</div>';
    else if (!S.rows.length) efni = '<div class="k9-tomt">Ekkert lesið enn. „Sækja úr pósti" les viðhengi síðustu 31 daga úr eldklar@eldklar.is.</div>';
    else if (S.sia === 'teya') efni = teyaHtml(listi);
    else efni = toflHtml(listi);
    return '<div class="k9-plata-stal">' +
      '<section class="k9-spjald">' +
        haus('Kostnaður', hausHlid) +
        '<div class="k9-buk">' +
          '<div class="k9-tala"><b>' + esc(kr(samtals).replace(' kr', '')) + '</b><span>kr · ' + listi.length + ' skjöl í síunni</span></div>' +
          '<div class="k9-siur">' + siuHtml + '</div>' +
          '<input class="k9-leit" data-k9="leit" type="search" placeholder="Leita — seljandi, reikningsnúmer, tilvísun…" value="' + esc(S.leit) + '" aria-label="Leita">' +
        '</div>' +
      '</section>' +
      '<section class="k9-spjald">' + efni + '</section>' +
    '</div>';
  }
  function toflHtml(listi) {
    if (!listi.length) return '<div class="k9-tomt">Ekkert í þessari síu.</div>';
    return '<table class="k9-tafla"><thead><tr><th>Dags</th><th>Seljandi</th><th>Flokkur</th><th class="h">Upphæð</th><th>Tengt</th><th></th></tr></thead><tbody>' +
      listi.map((r) => rodHtml(r) + (S.opid === r.id ? '<tr class="k9-nanar"><td colspan="6">' + nanarHtml(r) + '</td></tr>' : '')).join('') +
      '</tbody></table>';
  }
  function rodHtml(r) {
    const tengt = [r.fyrirtaeki_id ? '<span class="k9-pl">' + esc(ftNafn(r.fyrirtaeki_id)) + '</span>' : '', (r.verkbeidni_id || r.thjonustubeidni_id) ? '<span class="k9-pl">' + esc(verkHeiti(r)) + '</span>' : ''].join('');
    const flokkur = '<select class="k9-flokkur" data-k9="flokkur" data-id="' + r.id + '" aria-label="Flokkur">' +
      (r.flokkur ? '' : '<option value="" selected>Óflokkað</option>') +
      FLOKKAR.map(([k, l]) => '<option value="' + k + '"' + (r.flokkur === k ? ' selected' : '') + '>' + l + '</option>').join('') + '</select>';
    const undir = [TEGUND_HEITI[r.tegund] || '', r.samantekt || r.efni || '', r.ai_villa ? 'Lestur mistókst' : ''].filter(Boolean).join(' · ');
    return '<tr class="k9-rod' + (S.opid === r.id ? ' opin' : '') + (erHunsad(r) ? ' hunsad' : '') + '" data-k9="opna" data-id="' + r.id + '">' +
      '<td class="m">' + esc(dags(r.dags || String(r.mottekid_at || '').slice(0, 10))) + '</td>' +
      '<td><b>' + esc(r.seljandi || r.sendandi || r.sendandi_email || '(óþekkt)') + '</b><small>' + esc(undir.slice(0, 140)) + '</small></td>' +
      '<td>' + flokkur + '</td>' +
      '<td class="h m">' + esc(kr(r.upphaed)) + (r.vsk ? '<small>vsk ' + esc(kr(r.vsk)) + '</small>' : '') + '</td>' +
      '<td>' + (tengt || '<span class="k9-daufur">Ótengt</span>') + '</td>' +
      '<td class="h">' + (r.stada === 'yfirfarid' ? '<span class="k9-pl dokk">Yfirfarið</span>' : '') + '</td>' +
    '</tr>';
  }
  function nanarHtml(r) {
    const linur = (r.linur || []);
    const linuHtml = linur.length
      ? '<table class="k9-linur"><thead><tr><th>Lýsing</th><th class="h">Magn</th><th class="h">Einingarverð</th><th class="h">Upphæð</th></tr></thead><tbody>' +
        linur.slice(0, 60).map((l) => '<tr><td>' + esc(l.lysing) + (l.dags ? ' <small>' + esc(dags(l.dags)) + '</small>' : '') + (l.kort ? ' <small>' + esc(l.kort) + '</small>' : '') + '</td><td class="h m">' + (l.magn == null ? '' : esc(l.magn)) + '</td><td class="h m">' + (l.einingarverd == null ? '' : esc(kr(l.einingarverd))) + '</td><td class="h m">' + (l.upphaed == null ? '' : esc(kr(l.upphaed))) + '</td></tr>').join('') +
        (linur.length > 60 ? '<tr><td colspan="4" class="k9-daufur">+ ' + (linur.length - 60) + ' línur í viðbót — sjá skjalið</td></tr>' : '') +
        '</tbody></table>'
      : '<div class="k9-daufur">Engar línur lesnar.</div>';
    const upp = [
      ['Seljandi', (r.seljandi || '—') + (r.seljandi_kt ? ' · kt. ' + r.seljandi_kt.slice(0, 6) + '-' + r.seljandi_kt.slice(6) : '')],
      ['Reikningsnr.', r.reikningsnr || '—'],
      ['Dags / gjalddagi', (dags(r.dags) || '—') + ' / ' + (dags(r.gjalddagi) || '—')],
      ['Tilvísun', r.tilvisun || '—'],
      ['Póstur', (r.efni || '') + ' — ' + (r.sendandi_email || '')],
    ].map(([a, b]) => '<div class="k9-reitur"><span>' + a + '</span><b>' + esc(b) + '</b></div>').join('');
    const till = r.fyrirtaeki_id ? [] : tillogurFt(r);
    const ftLeit = S.leitFt[r.id] || '', vkLeit = S.leitVk[r.id] || '';
    const ftNidur = leitFt(ftLeit).map((c) => '<button type="button" class="k9-btn" data-k9="ft-velja" data-id="' + r.id + '" data-ft="' + c.id + '">' + esc(c.nafn) + (c.heimilisfang ? ' · ' + esc(String(c.heimilisfang).split(',')[0]) : '') + '</button>').join('');
    const vkNidur = leitVerk(vkLeit).map((x) => '<button type="button" class="k9-btn" data-k9="vk-velja" data-id="' + r.id + '" data-teg="' + x.teg + '" data-vk="' + x.id + '">' + esc(x.heiti) + '</button>').join('');
    return '<div class="k9-opid">' +
      '<div class="k9-reitir">' + upp + '</div>' +
      linuHtml +
      '<div class="k9-tengja">' +
        '<div><span class="k9-merki">Fyrirtæki</span>' +
          (r.fyrirtaeki_id ? '<span class="k9-pl dokk">' + esc(ftNafn(r.fyrirtaeki_id)) + '</span><button type="button" class="k9-btn" data-k9="ft-af" data-id="' + r.id + '">Aftengja</button>'
            : (till.length ? '<div class="k9-till">Tillaga: ' + till.map((c) => '<button type="button" class="k9-btn" data-k9="ft-velja" data-id="' + r.id + '" data-ft="' + c.id + '">' + esc(c.nafn) + '</button>').join('') + '</div>' : '') +
              '<input class="k9-inn" data-k9="ft-leit" data-id="' + r.id + '" placeholder="Leita að fyrirtæki…" value="' + esc(ftLeit) + '"><div class="k9-nidur">' + ftNidur + '</div>') +
        '</div>' +
        '<div><span class="k9-merki">Verk</span>' +
          ((r.verkbeidni_id || r.thjonustubeidni_id) ? '<span class="k9-pl dokk">' + esc(verkHeiti(r)) + '</span><button type="button" class="k9-btn" data-k9="vk-af" data-id="' + r.id + '">Aftengja</button>'
            : '<input class="k9-inn" data-k9="vk-leit" data-id="' + r.id + '" placeholder="Verknúmer, kúnni eða mál…" value="' + esc(vkLeit) + '"><div class="k9-nidur">' + vkNidur + '</div>') +
        '</div>' +
      '</div>' +
      '<textarea class="k9-inn nota" data-k9="nota" data-id="' + r.id + '" rows="2" placeholder="Athugasemd…">' + esc(r.nota || '') + '</textarea>' +
      '<div class="k9-adgerdir">' +
        (r.storage_path ? '<button type="button" class="k9-btn malm" data-k9="skjal" data-id="' + r.id + '">Opna skjalið</button>' : '') +
        (r.stada === 'yfirfarid' ? '<button type="button" class="k9-btn" data-k9="stada" data-id="' + r.id + '" data-v="nytt">Merkja óyfirfarið</button>'
          : '<button type="button" class="k9-btn malm" data-k9="stada" data-id="' + r.id + '" data-v="yfirfarid">Merkja yfirfarið</button>') +
        (erHunsad(r) ? '<button type="button" class="k9-btn" data-k9="stada" data-id="' + r.id + '" data-v="nytt">Taka úr hunsað</button>'
          : '<button type="button" class="k9-btn" data-k9="stada" data-id="' + r.id + '" data-v="hunsad">Hunsa</button>') +
        '<span class="k9-daufur">' + esc(r.skra_nafn || '') + (r.ai_vissa != null ? ' · vissa ' + Math.round(r.ai_vissa * 100) + '%' : '') + (r.ai_villa ? ' · ' + r.ai_villa : '') + '</span>' +
      '</div>' +
    '</div>';
  }
  function teyaHtml(listi) {
    if (!listi.length) return '<div class="k9-tomt">Engin Teya- eða kortayfirlit lesin enn.</div>';
    const allar = [];
    listi.forEach((r) => (r.linur || []).forEach((l) => allar.push(Object.assign({ _r: r }, l))));
    allar.sort((a, b) => String(b.dags || '').localeCompare(String(a.dags || '')));
    const perKort = {};
    allar.forEach((l) => { const k = l.kort || 'Óþekkt kort'; perKort[k] = (perKort[k] || 0) + (+l.upphaed || 0); });
    const kortHtml = Object.entries(perKort).map(([k, v]) => '<div class="k9-reitur"><span>' + esc(k) + '</span><b>' + esc(kr(v)) + '</b></div>').join('');
    return '<div class="k9-opid">' +
      '<div class="k9-reitir">' + kortHtml + '<div class="k9-reitur"><span>Yfirlit</span><b>' + listi.length + ' skjöl · ' + allar.length + ' færslur</b></div></div>' +
      '<table class="k9-linur"><thead><tr><th>Dags</th><th>Lýsing</th><th>Kort</th><th class="h">Upphæð</th><th>Skjal</th></tr></thead><tbody>' +
        allar.slice(0, 400).map((l) => '<tr><td class="m">' + esc(dags(l.dags)) + '</td><td>' + esc(l.lysing) + '</td><td class="m">' + esc(l.kort || '') + '</td><td class="h m">' + esc(kr(l.upphaed)) + '</td><td><button type="button" class="k9-btn" data-k9="skjal" data-id="' + l._r.id + '">' + esc(TEGUND_HEITI[l._r.tegund] || 'Skjal') + '</button></td></tr>').join('') +
      '</tbody></table>' +
    '</div>';
  }

  function teikna() {
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.classList.contains('active')) return;
    // Reitur í ritun (leit, nóta, tengileit) er aldrei rifinn undan þeim sem skrifar — beðið eftir focusout.
    const ae = document.activeElement;
    if (ae && v.contains(ae) && (ae.tagName === 'TEXTAREA' || (ae.tagName === 'INPUT' && ae.dataset.k9 !== 'leit' && ae.dataset.k9 !== 'ft-leit' && ae.dataset.k9 !== 'vk-leit'))) { teikna._bid = true; return; }
    const fokus = ae && v.contains(ae) && ae.dataset ? { k: ae.dataset.k9, id: ae.dataset.id, s: ae.selectionStart } : null;
    const aftur = (window.Stodugt && Stodugt.vernda) ? Stodugt.vernda(v) : null;
    v.innerHTML = sidaHtml();
    if (aftur) aftur();
    if (fokus && fokus.k) {
      const el = v.querySelector('[data-k9="' + fokus.k + '"]' + (fokus.id ? '[data-id="' + fokus.id + '"]' : ''));
      if (el) { el.focus(); try { if (fokus.s != null) el.setSelectionRange(fokus.s, fokus.s); } catch (_) {} }
    }
  }

  /* ── atburðir ─────────────────────────────────────────────────────────── */
  let _leitT = null, _notaT = {};
  function onClick(e) {
    const el = e.target.closest('[data-k9]');
    if (!el || el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return;
    const k = el.dataset.k9, id = el.dataset.id ? +el.dataset.id : null;
    if (k === 'sia') { S.sia = el.dataset.v; S.opid = null; teikna(); return; }
    if (k === 'opna') { S.opid = S.opid === id ? null : id; if (S.opid) saekjaTengingar().then(teikna); teikna(); return; }
    if (k === 'sync') { syncNu(); return; }
    if (k === 'skjal') { opnaSkjal(id); return; }
    if (k === 'stada') { uppfaera(id, { stada: el.dataset.v }); return; }
    if (k === 'ft-velja') { delete S.leitFt[id]; uppfaera(id, { fyrirtaeki_id: +el.dataset.ft }); return; }
    if (k === 'ft-af') { uppfaera(id, { fyrirtaeki_id: null }); return; }
    if (k === 'vk-velja') { delete S.leitVk[id]; uppfaera(id, el.dataset.teg === 'v' ? { verkbeidni_id: +el.dataset.vk, thjonustubeidni_id: null, flokkur: 'verk' } : { thjonustubeidni_id: +el.dataset.vk, verkbeidni_id: null, flokkur: 'verk' }); return; }
    if (k === 'vk-af') { uppfaera(id, { verkbeidni_id: null, thjonustubeidni_id: null }); return; }
  }
  function onChange(e) {
    const el = e.target;
    if (el.dataset.k9 === 'flokkur') uppfaera(+el.dataset.id, { flokkur: el.value || null });
  }
  function onInput(e) {
    const el = e.target, k = el.dataset && el.dataset.k9;
    if (k === 'leit') { S.leit = el.value; clearTimeout(_leitT); _leitT = setTimeout(teikna, 180); return; }
    if (k === 'ft-leit') { S.leitFt[+el.dataset.id] = el.value; clearTimeout(_leitT); _leitT = setTimeout(teikna, 180); return; }
    if (k === 'vk-leit') { S.leitVk[+el.dataset.id] = el.value; clearTimeout(_leitT); _leitT = setTimeout(teikna, 180); return; }
    if (k === 'nota') {
      const id = +el.dataset.id, t = el.value;
      clearTimeout(_notaT[id]);
      _notaT[id] = setTimeout(() => vistaNotu(id, t), 700);
    }
  }
  async function vistaNotu(id, t) {
    const r = S.rows.find((x) => x.id === id); if (!r || r.nota === t) return;
    r.nota = t;
    const { error } = await sb().from('kostnadur').update({ nota: t }).eq('id', id);
    if (error) toast('Athugasemdin vistaðist ekki: ' + error.message, true);
  }
  function onFocusOut(e) {
    const el = e.target;
    if (el && el.dataset && el.dataset.k9 === 'nota') { clearTimeout(_notaT[+el.dataset.id]); vistaNotu(+el.dataset.id, el.value); }
    if (teikna._bid) { teikna._bid = false; setTimeout(teikna, 0); }
  }
  async function opnaSkjal(id) {
    const w = window.open('about:blank', '_blank');   // opnað strax í smellinum svo sprettigluggavörn stöðvi ekki
    try {
      const r = await fetch(API + '?skra=' + id);
      const j = await r.json();
      if (!r.ok || !j.url) throw new Error(j.error || ('HTTP ' + r.status));
      if (w) w.location.href = j.url; else window.open(j.url, '_blank');
    } catch (e) { if (w) w.close(); toast('Skjalið opnaðist ekki: ' + e.message, true); }
  }
  let _syncT = null;
  async function syncNu() {
    try {
      const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'sync', days: 31 }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 409) toast('Söfnun er þegar í gangi');
      else if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
      else toast('Söfnun hafin — viðhengi síðustu 31 daga eru lesin');
      S.sync = Object.assign({}, S.sync || {}, { a_ferd: true, nyjar: (S.sync && S.sync.a_ferd && S.sync.nyjar) || 0 });
      teikna();
      fylgjaSync();
    } catch (e) { toast('Söfnunin fór ekki af stað: ' + e.message, true); }
  }
  // Á meðan söfnun er á ferð: staðan og nýjar raðir sóttar á 8 sek fresti, aðeins meðan síðan er opin.
  function fylgjaSync() {
    clearTimeout(_syncT);
    _syncT = setTimeout(async () => {
      const v = document.getElementById(VIEW_ID);
      if (!v || !v.classList.contains('active') || document.hidden) return;
      await saekjaStodu();
      await saekja();
      teikna();
      if (S.sync && S.sync.a_ferd) fylgjaSync();
    }, 8000);
  }

  /* ── stílar ───────────────────────────────────────────────────────────── */
  function css() {
    if (document.getElementById('_k9-css')) return;
    const V = '#' + VIEW_ID + ' ';
    const W = '#' + VIEW_ID + '#' + VIEW_ID + ' ';
    const st = document.createElement('style');
    st.id = '_k9-css';
    st.textContent = [
      '#' + VIEW_ID + '{background:linear-gradient(180deg,#eef0f3,#e3e6eb);min-height:100%;padding:16px 16px 90px;box-sizing:border-box;font-family:' + SANS + ';color:#141822}',
      V + '.k9-plata-stal{max-width:1280px;margin:0 auto;display:flex;flex-direction:column;gap:12px;padding:12px 12px 16px;border:1px solid #000;border-radius:14px;background:' + STAL_IMG + ';box-shadow:0 10px 30px -12px rgba(10,14,22,.45)}',
      V + '.k9-spjald{background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);overflow:hidden;min-width:0}',
      V + '.k9-haus{position:relative;display:flex;align-items:center;gap:10px;min-height:46px;padding:5px 16px 5px 20px;background:' + METAL + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.1);border-bottom:1px solid #000;color:#fff;flex-wrap:wrap}',
      V + '.k9-haus::before{' + RIVET + ';left:7px}',
      V + '.k9-haus::after{' + RIVET + ';right:7px}',
      V + '.k9-titill{font:600 15px ' + SANS + ';text-shadow:0 1px 1px rgba(0,0,0,.6);margin-right:auto}',
      V + '.k9-plata{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';font:700 10.5px ' + MONO + ';letter-spacing:.06em;text-transform:uppercase;color:#1f2530;white-space:nowrap}',
      V + '.k9-buk{padding:12px 14px;display:flex;flex-direction:column;gap:10px}',
      V + '.k9-tala{display:flex;align-items:baseline;gap:10px}',
      V + '.k9-tala b{font:800 38px/1 ' + DISPLAY + ';font-variant-numeric:lining-nums;color:#141822}',
      V + '.k9-tala span{font:700 16px ' + DISPLAY + ';color:#3a4250}',
      V + '.k9-siur{display:flex;flex-wrap:wrap;gap:6px}',
      V + '.k9-sia{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 12px;border-radius:9px;border:1px solid rgba(20,24,34,.16);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530;font:600 12.5px ' + SANS + ';cursor:pointer}',
      V + '.k9-sia span{font:700 11px ' + MONO + ';color:#5b6573}',
      V + '.k9-sia.on{background:' + METAL + ';border-color:#000;color:#fff}',
      V + '.k9-sia.on span{color:rgba(255,255,255,.78)}',
      V + '.k9-leit,' + V + '.k9-inn{height:40px;box-sizing:border-box;padding:0 12px;background:#eef1f6;border:1px solid rgba(20,24,34,.14);border-radius:8px;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);font:13px ' + SANS + ';color:#141822;min-width:0}',
      V + '.k9-inn.nota{height:auto;min-height:40px;padding:9px 12px;resize:vertical;width:100%}',
      V + '.k9-btn{display:inline-flex;align-items:center;height:36px;padding:0 12px;border-radius:9px;border:1px solid rgba(20,24,34,.16);background:' + SILVER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);color:#1f2530;font:600 12.5px ' + SANS + ';cursor:pointer;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}',
      V + '.k9-btn.malm{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border-color:#000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45);color:#eef1f4}',
      V + '.k9-btn.rautt{height:40px;background:' + RED + ';border-color:rgba(190,32,28,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 8px rgba(0,0,0,.45);color:#fff}',
      V + '.k9-btn[disabled]{opacity:.38;pointer-events:none}',
      // Eldri stílblöð (230 o.fl.) setja töflum display:block, lágmarksbreidd og ljósan th-bakgrunn með !important —
      // hér er gildissviðið hert (tvöfalt auðkenni) og !important á hverja eigind sem þau skrifa.
      W + 'table.k9-tafla,' + W + 'table.k9-linur{display:table!important;width:100%!important;min-width:0!important;max-width:none!important;border-collapse:collapse!important}',
      W + '.k9-tafla th,' + W + '.k9-linur th{background:' + METAL + '!important;color:rgba(255,255,255,.78)!important;font:700 10.5px ' + MONO + '!important;letter-spacing:.08em!important;text-transform:uppercase!important;text-align:left;padding:9px 8px!important;border:0!important}',
      W + '.k9-tafla th.h,' + W + '.k9-linur th.h{text-align:right!important}',
      W + '.k9-reitur span{font:700 10.5px ' + MONO + '!important;letter-spacing:.08em!important;text-transform:uppercase!important;color:#3a4250!important}',
      V + '.k9-tafla{table-layout:fixed}',
      V + '.k9-tafla th,' + V + '.k9-linur th{background:' + METAL + ';color:rgba(255,255,255,.78);font:700 10.5px ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;text-align:left;padding:9px 8px}',
      V + '.k9-tafla th:nth-child(1){width:92px}' + V + '.k9-tafla th:nth-child(3){width:140px}' + V + '.k9-tafla th:nth-child(4){width:120px}' + V + '.k9-tafla th:nth-child(5){width:24%}' + V + '.k9-tafla th:nth-child(6){width:96px}',
      V + '.k9-tafla td{padding:8px;border-top:1px solid #eceff4;vertical-align:top;font-size:13px;overflow:hidden}',
      V + '.k9-rod{cursor:pointer}' + V + '.k9-rod:hover td{background:#f7f9fd}' + V + '.k9-rod.opin td{background:#f1f4f8}',
      V + '.k9-rod.hunsad td{color:#8a93a1}',
      V + '.k9-tafla td b{display:block;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      V + '.k9-tafla small,' + V + '.k9-linur small{display:block;font-size:11px;color:#5b6573;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      V + '.m{font-family:' + MONO + ';font-size:12px}' + V + '.h{text-align:right}',
      V + '.k9-flokkur{height:30px;max-width:100%;border-radius:6px;border:1px solid rgba(20,24,34,.14);background:#fff;font:12.5px ' + SANS + '}',
      V + '.k9-pl{display:inline-flex;align-items:center;max-width:100%;height:22px;padding:0 8px;margin:0 4px 4px 0;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:' + SILVER + ';font:700 10.5px ' + MONO + ';color:#1f2530;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      V + '.k9-pl.dokk{background:linear-gradient(180deg,#3d4048 0%,#1c1e23 100%);border-color:#000;color:#eef1f4}',
      V + '.k9-daufur{color:#5b6573;font-size:12px}',
      V + '.k9-tomt{padding:28px 18px;color:#3a4250;font-size:13.5px}',
      V + '.k9-opid{padding:12px 14px;display:flex;flex-direction:column;gap:12px}',
      V + '.k9-reitir{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}',
      V + '.k9-reitur{background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);padding:8px 10px;min-width:0}',
      V + '.k9-reitur span{display:block;font:700 10.5px ' + MONO + ';letter-spacing:.08em;text-transform:uppercase;color:#3a4250}',
      V + '.k9-reitur b{display:block;font-size:13px;overflow-wrap:anywhere}',
      V + '.k9-linur{width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12)}',
      V + '.k9-linur td{padding:6px 8px;border-top:1px solid #eceff4;font-size:12.5px}',
      V + '.k9-tengja{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
      V + '.k9-tengja>div{display:flex;flex-direction:column;gap:6px;min-width:0}',
      V + '.k9-merki{font:700 11px ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#3a4250}',
      V + '.k9-till{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12px;color:#3a4250}',
      V + '.k9-nidur{display:flex;flex-wrap:wrap;gap:6px}',
      V + '.k9-adgerdir{display:flex;flex-wrap:wrap;gap:8px;align-items:center}',
      '@media (max-width:760px){' + V + '.k9-tafla th:nth-child(5),' + V + '.k9-tafla td:nth-child(5),' + V + '.k9-tafla th:nth-child(6),' + V + '.k9-tafla td:nth-child(6){display:none}' + V + '.k9-tafla th:nth-child(3){width:112px}' + V + '.k9-tengja{grid-template-columns:1fr}' + V + '.k9-tala b{font-size:30px}}',
    ].join('\n');
    document.head.appendChild(st);
    if (!document.getElementById('_tbm-font') && !document.getElementById('_k9-font')) {
      const l = document.createElement('link');
      l.id = '_k9-font'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap';
      document.head.appendChild(l);
    }
  }

  /* ── opnun + nav + beinir (sama mynstur og 346/345) ───────────────────── */
  async function opna() {
    css();
    const v = viewEl();
    if (!v.__k9) {
      v.__k9 = true;
      v.addEventListener('click', onClick);
      v.addEventListener('change', onChange);
      v.addEventListener('input', onInput);
      v.addEventListener('focusout', onFocusOut);
    }
    teikna();
    await Promise.all([saekja(), saekjaStodu()]);
    teikna();
    if (S.sync && S.sync.a_ferd) fylgjaSync();
  }
  function navTakki() {
    if (document.querySelector('[data-view="' + NAV_KEY + '"]')) return true;
    const sib = document.querySelector('[data-view="hreyfingarlisti"]') || document.querySelector('[data-view="bokhalds-yfirlit"]') || document.querySelector('[data-view]');
    if (!sib) return false;
    const b = sib.cloneNode(true);
    b.dataset.view = NAV_KEY;
    b.classList.remove('active');
    const sp = b.querySelector('span:not([class*="icon"]):not([class*="badge"])');
    if (sp) sp.textContent = 'Kostnaður';
    else for (const c of b.childNodes) if (c.nodeType === 3 && c.nodeValue.trim()) { c.nodeValue = ' Kostnaður'; break; }
    b.querySelectorAll('.count,.badge,[class*="badge"],[class*="count"]').forEach((n) => n.remove());
    b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); });
    sib.parentNode.insertBefore(b, sib.nextSibling);
    return true;
  }
  function hookSwitch() {
    if (!window.App || !App.switchView) return false;
    if (App.__kostnadurPatched) return true;
    const orig = App.switchView.bind(App);
    App.switchView = function (k) {
      if (k === NAV_KEY) {
        document.querySelectorAll('.view').forEach((x) => { x.style.display = 'none'; x.classList.remove('active'); });
        const el = viewEl();
        el.style.display = 'block';
        el.classList.add('active');
        document.querySelectorAll('.vnav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === NAV_KEY));
        opna();
        try { history.replaceState(null, '', '#' + NAV_KEY); } catch (_) {}
        return;
      }
      const me = document.getElementById(VIEW_ID);
      if (me) { me.style.display = 'none'; me.classList.remove('active'); }
      return orig(k);
    };
    App.__kostnadurPatched = true;
    return true;
  }
  let _tilraunir = 0;
  function start() {
    const ok = navTakki() & hookSwitch();
    if (!ok && ++_tilraunir < 40) { setTimeout(start, 300); return; }
    try {
      if (location.hash.replace('#', '') === NAV_KEY) {
        const el = document.getElementById(VIEW_ID);
        if (!el || !el.classList.contains('active')) App.switchView(NAV_KEY);
      }
    } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  window.Kostnadur = { opna, endurhlada: async () => { await saekja(); teikna(); }, version: 'v1' };
})();
/* === END KOSTNAÐUR === */
