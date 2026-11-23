/* === ÞARF ÞIG NÚNA (526, 23.11.2026) — tveir listar efst á vinnuborði Agnars ============================================
 *
 * Agnar 23.11.2026 (með skjáskoti af „Agnar · mitt vinnuborð"): „geturðu þjappað því aðeins betur saman, svo erfitt að hafa
 * yfirsýn … allt of mikið af sama dótinu út um allt í milljón hömum … hvar er það sem í raun skiptir máli, svona greini á
 * nýjustu póstunum sem verður að svara, og verkin sem ég er að reyna klára að senda reikningana fyrir eins og með
 * heimaleigu reikningana."
 *
 * HVAÐ ÞETTA ER: EITT spjald, tveir listar, hver lína með EINNI aðgerð á línunni sjálfri —
 *   ✉ Póstur sem bíður svars   — þræðir úr Tölvupóstum (448): ⚡ VIP, ★ Tilbúið að svara og „Bíður svars", nýjast efst.
 *                                 [Svara] opnar þráðinn í Tölvupóstum með svarreitinn opinn, [✓] merkir svarað (sama og 448).
 *   🧾 Reikningar sem bíða sendingar — ósendar kröfur Slökkvitækis úr SÖMU sýn og Yfirsýnarröndin telur (v_krafa_ekki_send_adgerd,
 *                                 því talan hér og „Ósent" í röndinni eru eitt og hið sama), flokkaðar eftir kúnna (Heimaleiga
 *                                 = ein lína með staðina sem flögur). Flaga opnar vinnuglugga kröfunnar (369 „Vinna ›").
 *                                 Brunahólf: ein lína með tölu úr röndinni og tengli í Kröfu yfirlit BH (listinn býr þar).
 *
 * HVERS VEGNA ÖÐRUVÍSI EN 520 („Í dag", tekin af borðinu 19.11 — „ég næ ekkert að nota þetta, né collapsað það"):
 *   · Það sem hann vinnur við í raun (póstur og reikningar), ekki mælingar og forgangsmerki.
 *   · Fellur saman með ▴ og valið vistast á þjón (Vidmot `bord.nuna.opid`); samantektin stendur í haus þótt lokað sé.
 *   · Ekkert nýtt sótt nema eitt: ósendu kröfurnar (ein sýn). Pósturinn er 448-gögnin; Tolvupostar.load() kallað AÐEINS ef ekkert
 *     hefur verið reynt (villa → ekki aftur fyrr en ↻), annars lykkjar notify() → render().
 *   · Aðgerðirnar eru engin ný skrifleið: [Svara] og „Vinna ›" opna það sem þegar er til, [✓] er 448 `svarad`. Ekkert er SENT héðan.
 *
 * HEIMILD OG ÚTHLUTUN: póstur = eldklar@ og bokhald@ (Brunaholf@ sést ekki í appinu), sótt kl. sýnt á spjaldinu.
 * ================================================================================================================== */
(() => {
  if (window.BordNuna) return;

  const MAX_POSTUR = 5;
  const MAX_FELOG = 6;
  const ENDURNYJA_MS = 5 * 60 * 1000;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tala = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const p2 = (n) => (n < 10 ? '0' : '') + n;
  const klukka = (t) => { const d = new Date(t); return isNaN(d) ? '' : p2(d.getHours()) + ':' + p2(d.getMinutes()); };

  /* ── ósendar kröfur Slökkvitækis: sama sýn og Yfirsýnarröndin (yfirsyn.cjs) ─────────────────────────────── */
  const S = { sl: null, villa: null, loading: false, at: 0 };
  const sb = () => (window.DB && window.DB.sb) || null;
  const teikna = () => { try { if (window.Bord368 && window.Bord368.render) window.Bord368.render(); } catch (_) {} };

  async function saekjaSL() {
    if (S.loading) return;
    const c = sb();
    if (!c) return;
    S.loading = true;
    try {
      const r = await c.from('v_krafa_ekki_send_adgerd').select('num,customer_nafn,samtals,dags,dagar,kreditfaerdur,i_bid').order('samtals', { ascending: false }).limit(200);
      if (r.error) throw r.error;
      const rows = r.data || [];
      // Vinnugluggi kröfunnar (369) tekur sölu-auðkenni, sýnin ber aðeins númerið — slá því upp í sömu umferð.
      const ids = {};
      if (rows.length) {
        const s = await c.from('solur').select('id,num').in('num', rows.map(x => x.num));
        if (s.error) throw s.error;
        (s.data || []).forEach(x => { ids[x.num] = x.id; });
      }
      S.sl = rows.map(x => ({ num: x.num, nafn: String(x.customer_nafn || ''), kr: Number(x.samtals) || 0, dagar: Number(x.dagar), id: ids[x.num] || null, kredit: !!x.kreditfaerdur, bid: !!x.i_bid }));
      S.villa = null;
    } catch (e) {
      S.villa = String((e && e.message) || e);
    } finally {
      S.loading = false;
      S.at = Date.now();
      teikna();
    }
  }
  function tryggjaSL() {
    if (S.loading) return;
    if (!S.at || Date.now() - S.at > ENDURNYJA_MS) saekjaSL();
  }

  /* ── póstur: 448 á gögnin, hér aðeins lestur ──────────────────────────────────────────────────────────── */
  // Hleðslan er ræst úr teikningu borðsins, sem keyrir líka áður en gagnagrunnstengingin er til (mælt 23.11: fyrsta kall
  // fékk „Engin tenging við gagnagrunn" og sat föst). Því: aldrei fyrr en DB.sb er til, mest tvær tilraunir, ≥15 s á milli
  // (annars lykkjar notify() → render() → hér); ↻ núllstillir. Villa sést í dálknum og „Reyna aftur" stendur.
  let tilraunir = 0, sidastaTilraun = 0;
  function tryggjaPost() {
    const T = window.Tolvupostar;
    if (!T || T.loaded() || T.loading()) return;
    if (!sb()) return;
    if (tilraunir >= 2 || Date.now() - sidastaTilraun < 15000) return;
    tilraunir++; sidastaTilraun = Date.now();
    try { T.load(); } catch (_) {}
  }
  const RODUN = { vip: 0, undirbuid: 1, bidur: 1 };
  function thraedir() {
    const T = window.Tolvupostar;
    if (!T || !T.loaded()) return [];
    return (T.S.thraedir || []).filter(t => !t.falid && RODUN[t.hluti] != null)
      .sort((a, b) => (RODUN[a.hluti] - RODUN[b.hluti]) || (new Date(b.timi) - new Date(a.timi)));
  }

  /* ── samsett gögn ─────────────────────────────────────────────────────────────────────────────────────── */
  // Kúnni úr nafni staðar: „Heimaleiga - Máni Apartments" → „Heimaleiga"; staðurinn verður flaga.
  const kunniAf = (n) => String(n || '').split(/\s+[-–]\s+|,\s+/)[0].trim() || String(n || '—');
  const stadurAf = (n) => { const l = String(n || '').split(/\s+[-–]\s+/); return l.length > 1 ? l.slice(1).join(' – ').trim() : ''; };
  function hopar() {
    const m = new Map();
    (S.sl || []).forEach(x => {
      const k = kunniAf(x.nafn);
      if (!m.has(k)) m.set(k, { k, kr: 0, n: 0, dagar: 0, l: [] });
      const h = m.get(k);
      h.kr += x.kr; h.n += 1; h.dagar = Math.max(h.dagar, Number.isFinite(x.dagar) ? x.dagar : 0); h.l.push(x);
    });
    return [...m.values()].sort((a, b) => b.kr - a.kr);
  }
  function bhOsent() {
    try {
      const d = window.YfirsynRond && window.YfirsynRond.S && window.YfirsynRond.S.d;
      const o = d && d.krofur && d.krofur.bh && d.krofur.bh.osent;
      return o && Number.isFinite(Number(o.n)) ? { n: Number(o.n), kr: Number(o.kr) || 0 } : null;
    } catch (_) { return null; }
  }

  function samantekt() {
    const T = window.Tolvupostar;
    const p = thraedir().length;
    const post = T && T.loaded() ? p + (p === 1 ? ' póstur bíður' : ' póstar bíða') : (T && T.villa() ? 'póstur ekki sóttur' : 'sæki póst…');
    const sl = S.sl ? S.sl.length : null;
    const rk = sl == null ? (S.villa ? 'reikningar ekki sóttir' : 'sæki reikninga…') : sl + (sl === 1 ? ' reikningur ósendur' : ' reikningar ósendir');
    return esc(post + ' · ' + rk);
  }
  function takkar() {
    return '<button type="button" class="btn iv sm" data-t5="nuna-endurhlada" title="Sækja póst og ósendar kröfur upp á nýtt">↻</button>';
  }

  /* ── teikning ─────────────────────────────────────────────────────────────────────────────────────────── */
  function aldur(d) { return d <= 0 ? 'Í dag' : d + ' d.'; }

  function postLina(t) {
    const T = window.Tolvupostar;
    const d = T.dagarSidan(t.timi);
    const nafn = (t.kunni && t.kunni.nafn) || t.nafn || t.netfang || '—';
    const merki = t.hluti === 'vip' ? '<span class="nu-tag nu-vip" title="VIP — svara innan klukkustundar">VIP</span>'
      : t.hluti === 'undirbuid' ? '<span class="nu-tag nu-gull" title="Claude er búinn að undirbúa svar — þú sendir">★ Tilbúið</span>' : '';
    const bz = T.S.busy && T.S.busy[t.k];
    return '<div class="nu-r">' +
      '<span class="nu-m"' + (d >= 3 ? ' data-sev="alv"' : '') + '>' + esc(aldur(d)) + '</span>' +
      '<div class="nu-t"><b>' + esc(nafn) + '</b><span class="nu-u" title="' + esc(t.efni) + '">' + esc(t.efni) + '</span></div>' +
      merki +
      '<button type="button" class="btn gold sm nu-b" data-t5="nuna-svara" data-k="' + esc(t.k) + '" title="Opna þráðinn í Tölvupóstum — svarreiturinn opinn">Svara</button>' +
      '<button type="button" class="btn iv sm nu-b nu-ok" data-t5="nuna-svarad" data-k="' + esc(t.k) + '"' + (bz ? ' disabled' : '') + ' aria-label="Merkja svarað" title="Svarað annars staðar (t.d. í Gmail) — tekur þráðinn af listanum">✓</button>' +
    '</div>';
  }
  function postDalkur() {
    const T = window.Tolvupostar;
    let body;
    if (!T) body = '<div class="nu-tomt">Tölvupóstar (448) hafa ekki hlaðist — endurhlaðið síðuna.</div>';
    else if (T.villa() && !T.loaded()) body = '<div class="nu-tomt nu-villa">Náði ekki í póstinn: ' + esc(T.villa()) + '</div>';
    else if (!T.loaded()) body = '<div class="nu-tomt">Sæki póstinn…</div>';
    else {
      const l = thraedir();
      body = l.length
        ? l.slice(0, MAX_POSTUR).map(postLina).join('') +
          '<button type="button" class="nu-meir" data-t5="nuna-ham" data-ham="tolvupostar">' + (l.length > MAX_POSTUR ? '+ ' + (l.length - MAX_POSTUR) + ' í viðbót — ' : '') + 'allir ' + l.length + ' í Tölvupóstum ›</button>'
        : '<div class="nu-tomt">Enginn póstur bíður svars. ✓</div>';
    }
    const fersk = T && T.loaded() && T.loadedAt() ? 'eldklar@ + bokhald@ · sótt kl. ' + klukka(T.loadedAt()) : 'eldklar@ + bokhald@';
    return '<div class="nu-d"><div class="nu-h"><span>✉ Póstur sem bíður svars</span><small>' + esc(fersk) + '</small></div>' + body + '</div>';
  }

  function felagLina(h) {
    const flogur = h.l.slice(0, 6).map(x => {
      const nm = stadurAf(x.nafn) || x.num;
      const txt = esc(nm) + ' · ' + tala(x.kr);
      return x.id
        ? '<button type="button" class="nu-fl" data-t5="vinna-sala" data-sid="' + esc(x.id) + '" title="' + esc(x.num + ' — opna vinnuglugga kröfunnar (þrep, gögn og tenglar)') + '">' + txt + ' ›</button>'
        : '<span class="nu-fl nu-fl-off" title="' + esc(x.num) + '">' + txt + '</span>';
    }).join('');
    return '<div class="nu-r nu-rk">' +
      '<span class="nu-m"' + (h.dagar >= 14 ? ' data-sev="alv"' : '') + '>' + esc(aldur(h.dagar)) + '</span>' +
      '<div class="nu-t"><b>' + esc(h.k) + '</b><span class="nu-u">' + h.n + (h.n === 1 ? ' reikningur' : ' reikningar') + ' · ' + tala(h.kr) + ' kr.</span></div>' +
      '<div class="nu-fls">' + flogur + (h.l.length > 6 ? '<span class="nu-fl nu-fl-off">+ ' + (h.l.length - 6) + '</span>' : '') + '</div>' +
    '</div>';
  }
  function felogDalkur() {
    let body;
    if (S.villa && !S.sl) body = '<div class="nu-tomt nu-villa">Náði ekki í kröfurnar: ' + esc(S.villa) + ' <button type="button" class="btn iv sm" data-t5="nuna-endurhlada">Reyna aftur</button></div>';
    else if (!S.sl) body = '<div class="nu-tomt">Sæki kröfurnar…</div>';
    else {
      const h = hopar();
      body = h.length
        ? h.slice(0, MAX_FELOG).map(felagLina).join('') + (h.length > MAX_FELOG ? '<div class="nu-meir nu-meir-st">+ ' + (h.length - MAX_FELOG) + ' félög í viðbót — í Kröfu yfirliti</div>' : '')
        : '<div class="nu-tomt">Engin krafa Slökkvitækis bíður sendingar. ✓</div>';
    }
    const bh = bhOsent();
    const bhLina = bh
      ? '<div class="nu-bh"><span><b>Brunahólf</b> · ' + bh.n + (bh.n === 1 ? ' ósend krafa' : ' ósendar kröfur') + ' · ' + tala(bh.kr) + ' kr.</span>' +
        '<a class="btn iv sm" href="https://brunaholf.netlify.app/#krofuyfirlit" target="_blank" rel="noopener" title="Kröfu yfirlit Brunahólfs — listinn og sendingin eru þar (nýr flipi)">Kröfu yfirlit BH ↗</a></div>'
      : '';
    const fersk = S.at ? 'Slökkvitæki · sótt kl. ' + klukka(S.at) : 'Slökkvitæki';
    const sumSL = S.sl && S.sl.length ? ' · ' + tala(S.sl.reduce((a, x) => a + x.kr, 0)) + ' kr.' : '';
    return '<div class="nu-d"><div class="nu-h"><span>🧾 Reikningar sem bíða sendingar</span><small>' + esc(fersk + sumSL) + '</small></div>' +
      body + bhLina +
      '<button type="button" class="nu-meir" data-t5="go" data-view="krofu-yfirlit">Allar kröfur í Kröfu yfirliti ›</button></div>';
  }

  function listi() {
    tryggjaPost();
    tryggjaSL();
    return '<div class="nu">' + postDalkur() + felogDalkur() + '</div>';
  }

  /* ── stíll og smellir (sama mynstur og 511/520: á skuggarót borðsins) ──────────────────────────────────── */
  // Aðeins borðsins eigin breytur (--ink, --mute, --rule2, --edge, --terra, --g8), svo þetta fylgir bæði Boss og V2 (507).
  function css() {
    return '.nu{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr)}' +
      '.nu-d{min-width:0;padding:0 0 4px}.nu-d+.nu-d{border-left:1px solid var(--rule2)}' +
      '.nu-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;padding:10px 16px 6px;font-family:var(--mono);font-size:11.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink)}' +
      '.nu-h small{font-family:var(--body);font-size:12px;font-weight:500;letter-spacing:0;text-transform:none;color:var(--mute)}' +
      '.nu-r{display:flex;align-items:center;gap:8px 10px;padding:7px 16px;border-top:1px solid var(--rule2);min-height:44px}' +
      '.nu-m{flex:0 0 auto;min-width:52px;padding:2px 6px;border:1px solid var(--edge);border-radius:2px;text-align:center;font-family:var(--mono);font-size:11.5px;font-weight:700;color:var(--ink2);font-variant-numeric:tabular-nums}' +
      '.nu-m[data-sev="alv"]{border-color:var(--terra);color:#8d2f12}' +
      '.nu-t{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:1px}' +
      '.nu-t>b{font-size:13.5px;font-weight:650;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.nu-u{font-size:12.5px;color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.nu-tag{flex:0 0 auto;padding:1px 7px;border:1px solid var(--edge);border-radius:999px;font-size:11.5px;font-weight:700;color:var(--ink2)}' +
      '.nu-vip{border-color:var(--terra);color:#8d2f12}.nu-gull{border-color:var(--g8);color:#6d5010}' +
      '.nu-b{flex:0 0 auto;min-height:34px;text-decoration:none}.nu-ok{min-width:34px;padding:0 8px}' +
      '.nu-rk{align-items:flex-start;flex-wrap:wrap}.nu-rk .nu-t{flex:0 1 190px}' +
      '.nu-fls{flex:1 1 220px;min-width:0;display:flex;flex-wrap:wrap;gap:5px}' +
      '.nu-fl{display:inline-block;padding:4px 9px;border:1px solid var(--edge);border-radius:3px;background:transparent;color:var(--ink);font:600 12.5px var(--body);cursor:pointer;font-variant-numeric:tabular-nums}' +
      '.nu-fl:hover{border-color:var(--ink2)}.nu-fl-off{cursor:default;color:var(--mute);border-style:dashed}' +
      '.nu-bh{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;padding:8px 16px;border-top:1px solid var(--rule2);font-size:13px;color:var(--ink)}' +
      '.nu-bh>span{flex:1 1 200px}' +
      '.nu-meir{display:block;width:100%;padding:8px 16px;border:0;border-top:1px solid var(--rule2);background:transparent;text-align:left;font:600 13px var(--body);color:var(--ink2);cursor:pointer}' +
      '.nu-meir:hover{color:var(--ink);text-decoration:underline}.nu-meir-st{cursor:default;font-weight:500;color:var(--mute)}.nu-meir-st:hover{text-decoration:none;color:var(--mute)}' +
      '.nu-tomt{padding:12px 16px;border-top:1px solid var(--rule2);font-size:13.5px;color:var(--mute)}.nu-villa{color:#8d2f12}' +
      '@container t5 (max-width: 900px){.nu{grid-template-columns:minmax(0,1fr)}.nu-d+.nu-d{border-left:0;border-top:2px solid var(--rule2)}}' +
      '@container t5 (max-width: 520px){.nu-r{flex-wrap:wrap}.nu-t{flex:1 1 60%}.nu-u{white-space:normal}.nu-b{min-height:40px}}';
  }

  function opnaThrad(k) {
    const T = window.Tolvupostar, b = window.Bord368;
    if (!T || !b || !b.opnaHam) return;
    // Síur Tölvupósta mega ekki fela þráðinn (aðeins í minni — vistaða valið breytist ekki). Sama og 513 „↩ Svara".
    T.S.sia.holf = 'baedi'; T.S.sia.merki = ''; T.S.sia.beidnir = false; T.S.sia.vidhengi = false; T.S.synaFalid = false;
    T.S.valinn = k; T.S.svarOpid = k; T.S.claudeOpid = null;
    if (!b.opnaHam('tolvupostar') && b.toast) b.toast('Hamurinn Tölvupóstar er falinn á þínu borði — opnaðu hann í ⚙ Velja einingar', true);
  }
  function smellur(e) {
    const el = e.target && e.target.closest ? e.target.closest('[data-t5^="nuna-"]') : null;
    if (!el) return;
    const a = el.dataset.t5;
    if (['nuna-svara', 'nuna-svarad', 'nuna-ham', 'nuna-endurhlada'].indexOf(a) < 0) return;   // annað (t.d. fellihnappurinn) er 368
    e.preventDefault();
    e.stopPropagation();
    const T = window.Tolvupostar;
    if (a === 'nuna-svara') opnaThrad(el.dataset.k);
    else if (a === 'nuna-svarad') { if (T && T.svarad && el.dataset.k) T.svarad(el.dataset.k); }
    else if (a === 'nuna-ham') { const b = window.Bord368; if (b && b.opnaHam) b.opnaHam(el.dataset.ham); }
    else if (a === 'nuna-endurhlada') {
      S.at = 0; saekjaSL();
      tilraunir = 1; sidastaTilraun = Date.now();
      if (T && !T.loading()) { try { T.load(true); } catch (_) {} }
    }
  }
  function festa(root) {
    if (!root) return;
    if (!root.querySelector('#nu526-css')) {
      const st = document.createElement('style');
      st.id = 'nu526-css';
      st.textContent = css();
      root.appendChild(st);
    }
    if (root.__nu526) return;
    root.__nu526 = true;
    root.addEventListener('click', smellur, true);
  }

  window.BordNuna = {
    festa, listi, samantekt, takkar, css,
    // Prófanlegt án DOM: hrá gögn og hjálparar.
    _S: S, _hopar: hopar, _thraedir: thraedir, _kunniAf: kunniAf, _stadurAf: stadurAf, _tala: tala,
    version: '2026-11-23'
  };
})();
