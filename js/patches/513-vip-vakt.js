/* === VIP-VAKT (513) — 17.11.2026, lota 8 ===================================================================
 *
 * Agnar 17.11.2026: „vantar kannski að geta sett ákveðin fyrirtæki í vip watchlist svo við getum svarað bara innan klst,
 * <fjögur félög nefnd með nafni>, og kannski einhverja fleiri mikilvæga“. (Hvaða félög: fyrirtaeki.vip — gögn, ekki kóði.)
 *
 * HVAÐ ÞETTA ER: borði EFST á Þjónustuborðinu (368, ofan við allar einingar) með ósvöruðum pósti frá VIP-félögum
 * (`fyrirtaeki.vip`, rofi á fyrirtækjaspjaldinu — 359) og klukku sem telur frá móttöku: grænt → gult eftir 2/3 af
 * svartíma félagsins (40 mín. af 60) → rautt þegar hann er liðinn. Engin ný síða („verkfæri, ekki plaggat“, 11.11.2026):
 *   ↩ Svara        Gmail-hólf (eldklar@ / bokhald@): opnar þráðinn í Tölvupóstum (448) með svarreitinn opinn — sama
 *                  drögaleið og áður (✨ Semja uppkast → 📤 Senda svar, sem les Gmail aftur áður en sent er).
 *   ✨ Uppkast      slokkvitaeki@ (M365, sending héðan ótengd): sama /api/postur-reply og 448; uppkastið birtist hér til
 *                  að afrita í Outlook. EKKERT er sent sjálfkrafa, hvorki héðan né annars staðar frá.
 *   ✓ Svarað       tvö tök; sama „svarað“-skráning og 448 (reikninga_postur_activity kind 'reply') — klukkan stöðvast.
 * Tölvupóstar (448) fá sama merki og klukku á þræðina og hlutann „⚡ VIP“ efst (VipVakt.thradur / chipHtml).
 *
 * GÖGN: GET /api/vip-postur (netlify/functions/vip-postur.cjs, aðeins innskráðir starfsmenn) — þjónninn les öll þrjú
 * hólfin (RLS hleypir vafranum ekki í slokkvitaeki@) og skilar aðeins VIP-þráðum. Pörun og „ósvarað“: _vip-postur.cjs.
 * Sótt þegar borðið opnast og svo á 2 mín. fresti meðan það er sýnilegt. Klukkurnar tikka á 30 s fresti með því að skipta
 * um TEXTA í [data-vipk]-stökum — engin endurteikning og enginn MutationObserver (patch-87-reglan).
 * Hólf sem lesarinn segir fast (t.d. slokkvitaeki@ 17.11.2026) fær „⚠ óvíst“: klukkan stendur, en svar gæti hafa farið.
 * ============================================================================================================== */
(() => {
  if (window.__vipVakt513) return;
  window.__vipVakt513 = true;

  const API = '/api/vip-postur';
  const LITUR = { graent: '#2f7a4a', gult: '#b8892e', rautt: '#c0392b' };
  const S = { gogn: null, villa: null, bid: false, sott: null, sig: '', drog: {}, opid: null, vopnad: null, vopnTimi: 0, busy: {}, skilabod: null };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ts = (s) => { const n = Date.parse(s || ''); return isFinite(n) ? n : 0; };
  const p2 = (n) => String(n).padStart(2, '0');
  const kl = (iso) => { const d = new Date(iso); return isNaN(d) ? '—' : p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  const dk = (iso) => { const d = new Date(iso); return isNaN(d) ? '—' : p2(d.getDate()) + '.' + p2(d.getMonth() + 1) + ' kl. ' + kl(iso); };
  const bord = () => window.Bord368 || null;
  const rot = () => { try { return bord() && bord().root ? bord().root() : null; } catch (_) { return null; } };
  const toast = (m, w) => { try { if (bord() && bord().toast) return bord().toast(m, w); } catch (_) {} console[w ? 'warn' : 'log']('[513] ' + m); };

  // Sama regla og _vip-postur.cjs klukka()/lengd() — prófuð í test/vip-vakt-bord.test.cjs.
  function klukka(mottekid, nu, svartimi) {
    const sv = Number(svartimi) > 0 ? Number(svartimi) : 60;
    const min = Math.max(0, Math.floor(((nu instanceof Date ? nu.getTime() : Number(nu) || Date.now()) - ts(mottekid)) / 60000));
    return { min, litur: min >= sv ? 'rautt' : min >= Math.round(sv * 2 / 3) ? 'gult' : 'graent', svartimi: sv };
  }
  function lengd(min) {
    if (min < 60) return min + ' mín.';
    if (min < 1440) { const h = Math.floor(min / 60), r = min % 60; return h + ' klst.' + (r ? ' ' + r + ' mín.' : ''); }
    return Math.floor(min / 1440) + ' d.';
  }
  const klukkuTexti = (t, nu) => { const k = klukka(t.mottekid, nu || new Date(), t.svartimi); return { texti: '⏱ ' + lengd(k.min), litur: k.litur }; };

  /* ── GÖGN ─────────────────────────────────────────────────────────── */
  const idx = () => { const m = new Map(); ((S.gogn && S.gogn.thraedir) || []).forEach((t) => m.set(t.k, t)); return m; };
  let _idx = new Map(), _svarad = new Map();
  async function hlada() {
    if (S.bid) return;
    S.bid = true;
    try {
      const r = await fetch(API, { credentials: 'same-origin', cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j || j.ok !== true) { S.villa = r.status === 401 ? 'innskraning' : ((j && j.error) || ('Villa ' + r.status)); }
      else { S.gogn = j; S.villa = null; S.sott = new Date(); }
    } catch (e) { S.villa = (e && e.message) || String(e); }
    S.bid = false;
    _idx = idx();
    _svarad = new Map(((S.gogn && S.gogn.svarad) || []).map((x) => [x.k, x]));
    const sig = JSON.stringify([S.villa, ((S.gogn && S.gogn.thraedir) || []).map((t) => t.k + (t.ovisst ? '?' : '')), [..._svarad.keys()]]);
    if (sig !== S.sig) {
      S.sig = sig;
      try { if (window.Tolvupostar && Tolvupostar.endurflokka) Tolvupostar.endurflokka(); } catch (_) {}   // 448: ⚡ VIP-hlutinn
      try { if (bord() && bord().render) bord().render(); } catch (_) {}
    } else tikka();
  }

  // ── VIP-merkið á fyrirtækinu (rofi á fyrirtækjaspjaldinu, 359) — fyrirtaeki.vip / vip_svartimi_min ──────────────
  const CO = { map: new Map(), hladid: false, bid: null };
  async function hladaCo() {
    const c = window.DB && DB.sb; if (!c) return;
    if (CO.bid) return CO.bid;
    CO.bid = (async () => {
      const r = await c.from('fyrirtaeki').select('id,vip,vip_svartimi_min').eq('vip', true).is('deleted_at', null).limit(1000);
      if (!r.error) { CO.map = new Map((r.data || []).map((x) => [String(x.id), x])); CO.hladid = true; }
    })();
    try { await CO.bid; } finally { CO.bid = null; }
  }
  async function setjaCo(fid, on) {
    const c = window.DB && DB.sb; if (!c) return false;
    let hver = 'starfsmaður';
    try { hver = (window.BordStarfsmadur && BordStarfsmadur.get()) || hver; } catch (_) {}
    const r = await c.from('fyrirtaeki').update({ vip: !!on, vip_merkt_af: hver, vip_merkt_at: new Date().toISOString() }).eq('id', Number(fid)).select('id,vip,vip_svartimi_min');
    if (r.error || !r.data || !r.data.length) return false;
    if (on) CO.map.set(String(fid), r.data[0]); else CO.map.delete(String(fid));
    hlada();
    return true;
  }
  (function raesaCo(n) { if (window.DB && DB.sb) hladaCo(); else if (n < 50) setTimeout(() => raesaCo(n + 1), 300); })(0);
  const synilegt = () => { const r = rot(); return !!(r && r.host && r.host.classList.contains('active')) && document.visibilityState !== 'hidden'; };
  setInterval(() => { if (synilegt()) hlada(); }, 120000);
  document.addEventListener('visibilitychange', () => { if (synilegt() && (!S.sott || Date.now() - S.sott.getTime() > 60000)) hlada(); });
  // Klukkurnar: aðeins texti og litur skipt um — aldrei endurteikning.
  function tikka() {
    const r = rot(); if (!r) return;
    const nu = new Date();
    r.querySelectorAll('[data-vipk]').forEach((el) => {
      const t = _idx.get(el.dataset.vipk); if (!t) return;
      const k = klukkuTexti(t, nu);
      if (el.textContent !== k.texti) el.textContent = k.texti;
      if (el.dataset.litur !== k.litur) { el.dataset.litur = k.litur; el.style.setProperty('--vk', LITUR[k.litur]); }
    });
  }
  setInterval(() => { if (synilegt()) tikka(); }, 30000);

  /* ── TEIKNING ─────────────────────────────────────────────────────── */
  const klukkaHtml = (t) => { const k = klukkuTexti(t); return '<span class="vip-kl" data-vipk="' + esc(t.k) + '" data-litur="' + k.litur + '" style="--vk:' + LITUR[k.litur] + '" title="Frá móttöku ' + esc(dk(t.mottekid)) + ' · svarloforð ' + t.svartimi + ' mín.">' + esc(k.texti) + '</span>'; };
  function chipHtml(k) {
    const t = _idx.get(k);
    if (t) return '<span class="tp-m vip-chip" title="VIP · ' + esc(t.felag) + ' · parað um ' + esc(t.hvernig) + '">⚡ VIP</span>' + klukkaHtml(t);
    const s = _svarad.get(k);
    return s ? '<span class="tp-m vip-chip _svarad" title="VIP · ' + esc(s.felag) + ' · svarað">⚡ VIP</span>' : '';
  }
  function innlesturHtml(d) {
    const l = (d && d.inntak && d.inntak.lesarar) || [];
    const gm = l.find((x) => x.lesari === 'gmail-ingest');
    const lb = l.filter((x) => x.lesari === 'luna-bridge').sort((a, b) => ts(b.sidast) - ts(a.sidast))[0];
    const hl = (d && d.inntak && d.inntak.holf) || [];
    const sl = hl.find((h) => h.holf === 'slokkvitaeki@brunaholf.is');
    const bits = [];
    if (gm) bits.push('Gmail lesið kl. ' + kl(gm.sidast) + ' (á 2 klst. fresti)');
    if (lb) bits.push('luna-bridge kl. ' + kl(lb.sidast));
    if (sl && sl.sidast_lesid && Date.now() - ts(sl.sidast_lesid) > 864e5) bits.push('⚠ slokkvitaeki@ ólesið síðan ' + dk(sl.sidast_lesid));
    return bits.length ? '<span class="vip-inn" title="Klukkan sér aðeins póst sem er kominn inn í kerfið">' + esc(bits.join(' · ')) + '</span>' : '';
  }
  function rodHtml(t) {
    const b = !!S.busy[t.k], v = S.vopnad === 'svarad:' + t.k && Date.now() - S.vopnTimi < 6000, opid = S.opid === t.k;
    return '<li class="vip-rod' + (t.ovisst ? ' _ovisst' : '') + '">' +
      '<div class="vip-l1">' + klukkaHtml(t) + '<b class="vip-fel">' + esc(t.felag) + '</b><span class="vip-fra">' + esc(t.fra_nafn) + '</span>' +
        '<span class="vip-holf">' + esc(String(t.account).split('@')[0]) + '@</span><time>' + esc(dk(t.mottekid)) + '</time></div>' +
      '<div class="vip-efni"><b>' + esc(t.efni) + '</b> <span>' + esc(t.snippet) + '</span></div>' +
      (t.ovisst ? '<div class="vip-ov">⚠ Óvíst hvort svarað: ' + esc(t.ovisst) + '</div>' : '') +
      '<div class="vip-takkar">' +
        (t.gmail ? '<button type="button" class="btn iv sm vip-svara" data-vip="svara" data-k="' + esc(t.k) + '">↩ Svara</button>'
          : '<button type="button" class="btn iv sm" data-vip="uppkast" data-k="' + esc(t.k) + '"' + (b ? ' disabled' : '') + '>' + (b ? 'Sem uppkast…' : '✨ Uppkast') + '</button>') +
        '<button type="button" class="btn iv sm' + (v ? ' vip-vopn' : '') + '" data-vip="svarad" data-k="' + esc(t.k) + '"' + (b ? ' disabled' : '') + ' title="Svarað annars staðar (sími, Outlook) — stöðvar klukkuna">' + (v ? 'Ýttu aftur — skrá svarað' : '✓ Svarað') + '</button>' +
        (t.coId ? '<button type="button" class="btn iv sm" data-t5="fyr-id" data-id="' + esc(t.coId) + '">Fyrirtækið ›</button>' : '') +
        (t.mal_id ? '<span class="vip-mal">📋 #' + esc(t.mal_id) + '</span>' : '') +
      '</div>' +
      (opid ? '<div class="vip-drog"><textarea data-ritun="1" data-vipdrog="' + esc(t.k) + '" rows="7">' + esc(S.drog[t.k] || '') + '</textarea>' +
        '<div class="vip-takkar"><button type="button" class="btn iv sm" data-vip="afrita" data-k="' + esc(t.k) + '">📋 Afrita</button>' +
        '<span class="vip-sk">Sending héðan er ekki tengd ' + esc(t.account) + ' — límdu í Outlook og ýttu svo á ✓ Svarað.</span></div></div>' : '') +
      '</li>';
  }
  function html(n) {
    if (!S.sott && !S.bid && !S.villa) hlada();
    festa(rot());
    if (S.villa === 'innskraning' || (!S.gogn && !S.villa)) return '';
    if (!S.gogn) return '<section class="vip"><header><b>⚡ VIP-vakt</b><span class="vip-inn">Náði ekki í VIP-póstinn: ' + esc(S.villa) + '</span></header></section>';
    const l = S.gogn.thraedir || [], f = S.gogn.felog || [];
    const yfir = l.filter((t) => klukka(t.mottekid, new Date(), t.svartimi).litur === 'rautt').length;
    const haus = '<header><b>⚡ VIP-vakt</b><span class="vip-tala">' + (l.length ? l.length + ' ósvarað' + (yfir ? ' · ' + yfir + ' yfir tíma' : '') : 'ekkert ósvarað') + '</span>' +
      '<span class="vip-fel-l" title="' + esc(f.map((x) => x.nafn + ' (' + x.radir + ' raðir · ' + x.svartimi + ' mín.)').join(', ')) + '">' + f.length + ' félög</span>' +
      innlesturHtml(S.gogn) + (S.skilabod ? '<span class="vip-sk">' + esc(S.skilabod) + '</span>' : '') + '</header>';
    return '<section class="vip' + (l.length ? '' : ' _tomt') + '" aria-label="VIP-vakt">' + haus + (l.length ? '<ul>' + l.map(rodHtml).join('') + '</ul>' : '') + '</section>';
  }
  function css() {
    return [
      '.vip{margin:10px 0 12px;padding:10px 14px;border:1px solid rgba(192,57,43,.35);border-left:4px solid #c0392b;border-radius:6px;background:rgba(255,255,255,.7)}',
      '.vip._tomt{border-color:var(--rule2,#ddd);border-left-color:#2f7a4a;padding:6px 12px}',
      '.vip header{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;font-size:12.5px}.vip header b{font-family:var(--mono,monospace);font-size:11px;letter-spacing:.1em;text-transform:uppercase}',
      '.vip .vip-tala{font-weight:700}.vip .vip-fel-l,.vip .vip-inn,.vip .vip-sk{color:var(--mute,#667);font-size:11.5px}',
      '.vip ul{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:6px}',
      '.vip .vip-rod{padding:8px 10px;border:1px solid var(--rule2,#e3e3e3);border-radius:5px;background:#fff}.vip .vip-rod._ovisst{border-style:dashed}',
      '.vip .vip-l1{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px;font-size:12.5px}.vip .vip-l1 time{margin-left:auto;font-family:var(--mono,monospace);font-size:10.5px;color:var(--mute,#667)}',
      '.vip .vip-fra{color:var(--ink2,#334)}.vip .vip-holf{font-family:var(--mono,monospace);font-size:10px;letter-spacing:.06em;color:var(--mute,#667)}',
      '.vip-kl{display:inline-block;padding:1px 7px;border-radius:10px;font:700 11px/1.5 var(--mono,monospace);color:#fff;background:var(--vk,#2f7a4a);white-space:nowrap}',
      '.vip .vip-efni{margin-top:3px;font-size:13px;line-height:1.45;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.vip .vip-efni span{color:var(--mute,#667)}',
      '.vip .vip-ov{margin-top:4px;font-size:11.5px;color:#8a6218}',
      '.vip .vip-takkar{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:6px}.vip .vip-mal{font-family:var(--mono,monospace);font-size:10.5px;color:var(--mute,#667)}',
      '.vip .btn.vip-svara{background:linear-gradient(180deg,#2d8a4e,#1f6b3c);color:#fff;border-color:#0b3519}.vip .btn.vip-vopn{background:#c0392b;color:#fff;border-color:#7a1f14}',
      '.vip .vip-drog textarea{display:block;width:100%;box-sizing:border-box;margin-top:6px;padding:8px 10px;border:1px solid var(--edge,#ccc);border-radius:4px;font:13px/1.5 var(--body,system-ui)}',
      '.tp-m.vip-chip{border-color:#c0392b!important;color:#c0392b!important;font-weight:700}.tp-m.vip-chip._svarad{border-color:var(--edge,#ccc)!important;color:var(--mute,#667)!important;font-weight:500}',
      '@media (max-width:620px){.vip .vip-l1 time{margin-left:0}.vip .vip-efni{white-space:normal}.vip .btn{min-height:40px}}',
    ].join('\n');
  }

  /* ── AÐGERÐIR ─────────────────────────────────────────────────────── */
  function festa(root) {
    if (!root) return;
    if (!root.querySelector('#vip513-css')) { const st = document.createElement('style'); st.id = 'vip513-css'; st.textContent = css(); root.appendChild(st); }
    if (root.__vipFest) return;
    root.__vipFest = true;
    root.addEventListener('click', smellur);
    root.addEventListener('input', (e) => { const el = e.target; if (el && el.dataset && el.dataset.vipdrog) S.drog[el.dataset.vipdrog] = el.value; });
  }
  const endurteikna = () => { try { if (bord() && bord().render) bord().render(); } catch (_) {} };
  async function svara(t) {
    const b = bord(), T = window.Tolvupostar;
    if (!b || !b.opnaHam || !T) { toast('Tölvupóstar eru ekki hlaðnir á þessu borði', true); return; }
    // Síur Tölvupósta mega ekki fela þráðinn (aðeins í minni — vistaða valið breytist ekki).
    T.S.sia.holf = 'baedi'; T.S.sia.merki = ''; T.S.sia.beidnir = false; T.S.sia.vidhengi = false; T.S.synaFalid = false;
    T.S.valinn = t.k; T.S.svarOpid = t.k; T.S.claudeOpid = null;
    if (!b.opnaHam('tolvupostar')) { toast('Hamurinn Tölvupóstar er falinn á þínu borði — opnaðu hann í ⚙ Mitt vinnuborð', true); return; }
    if (!T.loaded() && !T.loading()) await T.load();
    if (!T.finna(t.k)) toast('Þráðurinn sést ekki í Tölvupóstum (eldri en 60 daga eða hólfið lokað vafranum)', true);
  }
  async function uppkast(t) {
    S.busy[t.k] = 1; S.opid = t.k; endurteikna();
    try {
      const r = await fetch('/api/postur-reply', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        email: { sender_name: t.fra_nafn || '', sender_email: t.fra || '', subject: t.efni || '', body: t.texti || t.snippet || '' },
        customer: { name: t.felag || '', kt: t.felagKt || '' }, invoices: [], instruction: '' }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j || !j.body) throw new Error((j && (j.error || j.detail)) || ('Uppkastið kom ekki (' + r.status + ')'));
      S.drog[t.k] = String(j.body);
    } catch (e) { toast('Uppkast: ' + ((e && e.message) || e), true); if (!S.drog[t.k]) S.opid = null; }   // tómur reitur hjálpar engum
    delete S.busy[t.k]; endurteikna();
  }
  async function merkjaSvarad(t) {
    const c = window.DB && DB.sb;
    if (!c || !t.message_id) { toast('Ekki hægt að skrá svarað (engin tenging eða ekkert message_id)', true); return; }
    S.busy[t.k] = 1; endurteikna();
    try {
      const r = await c.from('reikninga_postur_activity').insert({ message_id: t.message_id, kind: 'reply' });
      if (r.error) throw r.error;
      S.skilabod = 'Skráð svarað: ' + t.felag + ' · ' + t.efni.slice(0, 40);
    } catch (e) { toast('Vistaðist ekki: ' + ((e && e.message) || e), true); }
    delete S.busy[t.k]; S.vopnad = null;
    await hlada();
    try { if (window.Tolvupostar && Tolvupostar.loaded()) Tolvupostar.load(true); } catch (_) {}
  }
  function smellur(e) {
    const el = e.target && e.target.closest ? e.target.closest('[data-vip]') : null;
    if (!el) return;
    const t = _idx.get(el.dataset.k || ''); if (!t) return;
    e.preventDefault(); e.stopPropagation();
    const a = el.dataset.vip;
    if (a === 'svara') return void svara(t);
    if (a === 'uppkast') return void uppkast(t);
    if (a === 'afrita') { const x = S.drog[t.k] || ''; try { navigator.clipboard.writeText(x).then(() => toast('Uppkastið afritað'), () => toast('Afritun tókst ekki — veldu textann og afritaðu', true)); } catch (_) { toast('Afritun tókst ekki', true); } return; }
    if (a === 'svarad') {
      const lykill = 'svarad:' + t.k;
      if (S.vopnad === lykill && Date.now() - S.vopnTimi < 6000) return void merkjaSvarad(t);
      S.vopnad = lykill; S.vopnTimi = Date.now(); endurteikna();
      setTimeout(() => { if (S.vopnad === lykill) { S.vopnad = null; endurteikna(); } }, 6100);
    }
  }

  window.VipVakt = {
    S, html, hlada, chipHtml, klukkaHtml, tikka,
    erVipCo: (fid) => CO.map.get(String(fid)) || null, coHladid: () => CO.hladid, hladaCo, setjaCo,
    thradur: (k) => _idx.get(k) || null,
    osvarad: (k) => _idx.has(k),
    _klukka: klukka, _lengd: lengd, _setja: (d) => { S.gogn = d; S.villa = null; S.sott = new Date(); _idx = idx(); _svarad = new Map(((d && d.svarad) || []).map((x) => [x.k, x])); },
    version: '2026-11-17',
  };
})();
