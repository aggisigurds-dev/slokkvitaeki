/* === 459 — SKANNAÐU TÆKI, FÁÐU VIÐSKIPTAVININN ===========================
 *
 * Agnar 12.10.2026, tvennt í sömu andrá:
 *   „ég get ekki neinstaðar leitað upp QR-tækjamerkingarnar eins og TMP-PZ22AK"
 *   „Ég held líka að þessi skannatakki hjá kennitölu sé bara að leita af
 *    vörunúmerum en ekki tækjum"
 *   „væri fínt að þegar við skönnum inn tæki sem hefur komið áður að
 *    viðskiptavinurinn komi upp og hvað tækið er"
 *
 * HVAÐ SKANNINN GERÐI ÁÐUR (js/pos.js, `scanQr`) — mælt þennan dag:
 *
 *     DB.sb.from('uttaeki').select('serial,type,size').eq('serial', code)
 *
 *   · Hann leitaði RÉTT að tækjum, ekki vörunúmerum — en AÐEINS í `uttaeki`
 *     og aðeins með NÁKVÆMU jafnt-og.
 *   · TMP-kóðar sem verða til á söluborðinu (142-sale-editor) lenda í
 *     `verklidur` og fá ENGA `uttaeki`-röð. MÆLT: 1.123 slíkir kóðar eru til,
 *     allir einkvæmir, og `eq` á `uttaeki` finnur ENGAN þeirra.
 *   · Fyndist kóðinn ekki bætti hann samt ÞEGJANDI við línu:
 *         { desc: 'Þjónusta', unit_price_ex_vat: 8900 }
 *     og fyndist hann, þá  { desc: 'Áfylling · <type> <size>', 8900 }.
 *     MÆLT: 8.900 er EKKI til sem verð í `vorur`. Raunverðin eru t.d.
 *     Léttvatn 6L hleðsla 6.782 · CO₂ 2 kg 3.400 · CO₂ 5 kg 6.900 ·
 *     Duft 12 kg 9.597. Skanninn bjó því til tölu og setti hana í körfuna.
 *
 * ÞESSI PATCH tekur yfir takkann `#pos-scan-top` og gerir skönnun að
 * UPPFLETTINGU, ekki sjálfvirkri verðlagningu:
 *
 *   1. Kóðinn er leitaður í BÁÐUM geymslum — `uttaeki` (skráð tæki) og
 *      `verklidur` + `verkbeidnir` (það sem kom inn á borðið). Nákvæm leit
 *      fyrst, svo hlutaleit, svo að miði sem les með aukastaf virki samt.
 *   2. Spjald opnast sem segir HVAÐ tækið er og HVER átti það síðast, með
 *      sögunni: verknúmer, innlagt, sótt, staða.
 *   3. Agnar velur sjálfur: „Setja viðskiptavin" (um `#pos-kt`, sömu leið og
 *      kennitöluleitin notar — ekki með því að pota í innra ástand) eða
 *      „Bæta þjónustu við" þar sem verðið kemur ÚR VERÐSKRÁNNI. Finnist ekkert
 *      verð er línan ekki búin til; spjaldið segir það í stað þess að giska.
 *
 * Af hverju þetta er ekki breyting á `js/pos.js`: `scanQr` er lokuð fastafall
 * inni í IIFE-inu þar og verður ekki yfirskrifað. Takkinn er hins vegar
 * venjulegur hnappur — við klónum hann, sem hendir gamla hlustaranum, og
 * setjum okkar á. Gamla leiðin liggur óhreyfð eftir sem varaleið.
 */
(() => {
  if (window.__skannaTaekiKunni) return;
  window.__skannaTaekiKunni = true;

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Dagsetningar eru DD/MM/YYYY í birtingu (docs/DAGSETNINGAR.md). Geymt snið
  // er aldrei snert — þetta er aðeins það sem stendur á skjánum.
  const dd = v => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''));
    return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
  };
  const kr = n => (Math.round(Number(n) || 0)).toLocaleString('is-IS') + ' kr';

  const VERK_STADA = {
    received: 'Móttekið', in_progress: 'Í vinnslu', inprogress: 'Í vinnslu',
    ready: 'Tilbúið til afhendingar', collected: 'Sótt', eytt: 'Eytt'
  };

  const sb = () => (window.DB && DB.sb) || null;
  const toast = m => { try { if (window.Toast && Toast.show) Toast.show(m); } catch (_) {} };

  /* ── Uppfletting ─────────────────────────────────────────────────────────
   * Skilar { uttaeki: [...], verklidur: [...] } eða null ef SAMBANDIÐ brást.
   * null og tómt mega aldrei líta eins út: tómt svar er ekki staðreynd
   * (docs/MAELINGAR.md §4) — sóknarvilla sem birtist sem „fannst ekki" lætur
   * mann stofna tækið upp á nýtt þótt það sé til. */
  async function fletta(kodi) {
    const SB = sb();
    if (!SB) return null;
    const hreint = String(kodi || '').trim().replace(/[%,]/g, '');
    if (!hreint) return null;
    try {
      const [u, v] = await Promise.all([
        SB.from('uttaeki')
          .select('id,serial,type,size,status,last_insp,next_insp,location,notes,fyrirtaeki_id,customer_base_id')
          .or('serial.eq.' + hreint + ',serial.ilike.%' + hreint + '%')
          .order('id', { ascending: false }).limit(6),
        SB.from('verklidur')
          .select('id,serial,type,size,service,status,created_at,uttaeki_id,job_id,verkbeidnir(id,num,customer,phone,status,dropoff,pickup,notes)')
          .or('serial.eq.' + hreint + ',serial.ilike.%' + hreint + '%')
          .order('id', { ascending: false }).limit(6)
      ]);
      if (u.error || v.error) return null;
      return { uttaeki: u.data || [], verklidur: v.data || [] };
    } catch (_) { return null; }
  }

  // Félagið á bak við skráð tæki — nafn, kt og sími svo hægt sé að velja það.
  async function felag(fid) {
    const SB = sb();
    if (!SB || fid == null) return null;
    try {
      const r = await SB.from('fyrirtaeki').select('id,nafn,kennitala,simi,heimilisfang').eq('id', fid).maybeSingle();
      return r.error ? null : r.data;
    } catch (_) { return null; }
  }

  /* ── Verð úr VERÐSKRÁNNI, aldrei úr lausu lofti ──────────────────────────
   * 129 á `normalizeTypeFamily` sem leysir „Léttvatn 6 L" í fjölskylduheiti —
   * sami lykill og Verð-tengingar (410) nota. Sé hann ekki hlaðinn leitum við
   * með tegund+stærð í nafni þjónustunnar. Finnist ekkert skilum við null og
   * segjum það; við búum ALDREI til tölu (gamla 8.900-hegðunin). */
  async function verdFyrir(tegund, staerd) {
    const SB = sb();
    if (!SB) return null;
    const t = String(tegund || '').trim();
    const s = String(staerd || '').trim();
    if (!t) return null;
    try {
      const r = await SB.from('vorur')
        .select('id,nafn,verd_an_vsk,vsk_prosenta,virkt,flokkur,krefst_verkbeidni')
        .eq('virkt', true).limit(1000);
      if (r.error) return null;
      const linur = (r.data || []).filter(x => /þjón/i.test(String(x.flokkur || '')));
      const norm = x => String(x || '').toLowerCase()
        .replace(/₂/g, '2').replace(/\s+/g, ' ').trim();
      const nt = norm(t), ns = norm(s);
      // Tegund OG stærð verða báðar að standa í heiti þjónustunnar. Án stærðar
      // myndi „CO2" grípa 2 kg, 5 kg, 9 kg og 10 kg jafn vel — og fyrsta svarið
      // ræður þá verðinu. Það er nákvæmlega sú tegund ágiskunar sem á ekki að
      // enda í körfu.
      // MÆLT 12.10.2026: „Léttvatn 6 L" fann EKKERT af því að verðskráin skrifar
      // „Léttvatnstækis 6L. hleðsla" — bilið milli tölu og einingar er ekki samræmt.
      // Berum stærðina því líka saman bilalausa.
      const nsTheytt = ns.replace(/\s+/g, '');
      const passar = linur.filter(x => {
        const n = norm(x.nafn);
        const nTheytt = n.replace(/\s+/g, '');
        return n.includes(nt) && (!ns || n.includes(ns) || nTheytt.includes(nsTheytt));
      });
      if (passar.length === 1) return passar[0];
      // Fleiri en ein lína passar — t.d. „CO₂ 5 kg. hleðsla" OG „CO₂ 5 kg. yfirferd".
      // Við giskum ekki, en við látum Agnar velja: `val` ber línurnar sjálfar með
      // verðunum, svo hann sér muninn og smellir. Það er eina leiðin sem hvorki
      // giskar né skilur hann eftir með ekkert.
      return { oviss: passar.map(x => x.nafn).slice(0, 6), val: passar.slice(0, 6) };
    } catch (_) { return null; }
  }

  /* ── Spjaldið ────────────────────────────────────────────────────────── */
  function loka() {
    const el = document.getElementById('_skt-ov');
    if (el) el.remove();
  }

  function opna(innihald) {
    loka();
    const ov = document.createElement('div');
    ov.id = '_skt-ov';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(10,12,18,.55);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.34);width:min(560px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:13px 18px;background:#141822;color:#fff;display:flex;justify-content:space-between;align-items:center;gap:10px">' +
          '<b style="font-size:15px">📷 Skannað tæki</b>' +
          '<button type="button" id="_skt-x" style="background:transparent;border:1px solid rgba(255,255,255,.3);color:#fff;font-size:18px;width:32px;height:32px;border-radius:7px;cursor:pointer;line-height:1">✕</button>' +
        '</div>' +
        '<div id="_skt-body" style="padding:16px 18px;overflow:auto;flex:1;font-size:13px;color:#334155;line-height:1.55">' + innihald + '</div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) loka(); });
    const x = document.getElementById('_skt-x');
    if (x) x.addEventListener('click', loka);
  }

  function settBody(html) {
    const b = document.getElementById('_skt-body');
    if (b) b.innerHTML = html;
  }

  const takki = (id, texti, adal) =>
    '<button type="button" id="' + id + '" style="padding:9px 14px;border-radius:9px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;border:1px solid ' +
      (adal ? '#2563eb;background:#2563eb;color:#fff' : '#cbd5e1;background:#fff;color:#334155') + '">' + texti + '</button>';

  /* ── Velja viðskiptavininn ───────────────────────────────────────────────
   * Um `#pos-kt` + input-atburð: það er leiðin sem kennitöluleitin sjálf fer,
   * svo allt sem hangir á henni (spjaldið, afslátturinn, co_id) gerist eins og
   * venjulega. Að setja `POS.getState().customer` beint myndi sleppa því öllu. */
  function veljaMedKt(kt, nafn) {
    const hreint = String(kt || '').replace(/\D/g, '');
    const inp = document.getElementById('pos-kt');
    if (!inp || hreint.length !== 10) return false;
    inp.value = hreint.slice(0, 6) + '-' + hreint.slice(6);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    toast('✓ ' + (nafn || hreint) + ' valinn');
    return true;
  }

  // Borðs-kúnni á sér oft enga kennitölu (staðgreitt verk). Þá fyllum við
  // lausasölu-reitina — nafn og síma — í stað þess að þykjast hafa kt.
  function veljaLausasolu(nafn, simi) {
    const n = document.getElementById('pos-nafn');
    const s = document.getElementById('pos-simi');
    let ok = false;
    if (n) { n.value = nafn || ''; n.dispatchEvent(new Event('input', { bubbles: true })); ok = true; }
    if (s && simi) { s.value = simi; s.dispatchEvent(new Event('input', { bubbles: true })); }
    if (ok) toast('✓ ' + (nafn || 'Viðskiptavinur') + ' settur (án kennitölu)');
    return ok;
  }

  function baetaThjonustu(vara, tegund, staerd, radnr) {
    if (!window.POS || typeof POS.getState !== 'function') return false;
    const st = POS.getState();
    if (!st || !Array.isArray(st.lines)) return false;
    st.lines.push({
      type: 'service',
      desc: vara.nafn,
      qty: 1,
      unit_price_ex_vat: Number(vara.verd_an_vsk) || 0,
      vsk_pct: Number(vara.vsk_prosenta) || 24,
      ref: radnr || '',
      product_id: vara.id,
      krefst_verkbeidni: !!vara.krefst_verkbeidni
    });
    if (typeof POS.rerenderDynamic === 'function') POS.rerenderDynamic();
    toast('✓ ' + vara.nafn + ' · ' + kr(vara.verd_an_vsk) + ' án vsk');
    return true;
  }

  /* ── Teikna niðurstöðuna ─────────────────────────────────────────────── */
  async function syna(kodi, nidur) {
    if (nidur === null) {
      settBody('<div style="color:#b45309"><b>Náði ekki sambandi við grunninn.</b><br>' +
        'Ég veit því EKKI hvort <code>' + esc(kodi) + '</code> er til. Reyndu aftur — ' +
        'ekki stofna tækið upp á nýtt fyrr en þú hefur fengið raunverulegt svar.</div>');
      return;
    }
    const ut = nidur.uttaeki || [];
    const vl = nidur.verklidur || [];
    if (!ut.length && !vl.length) {
      settBody('<div><b>🏷 ' + esc(kodi) + '</b></div>' +
        '<div style="margin-top:6px;color:#475569">Þetta raðnúmer er hvergi til — hvorki í tækjaskrá né í verkbeiðnum.</div>' +
        '<div style="margin-top:10px;color:#64748b;font-size:12.5px">Gamli skanninn bætti hér við línu „Þjónusta · 8.900 kr" án þess að segja neitt. ' +
        'Sú tala er ekki til í verðskránni, svo hún er ekki búin til lengur. Veldu þjónustuna sjálfur í flísunum.</div>');
      return;
    }

    const hlutar = [];

    // 1) Skráð tæki — hér er raunverulegur eigandi með kennitölu.
    for (const u of ut) {
      const f = await felag(u.fyrirtaeki_id);
      const heiti = [u.type, u.size].filter(Boolean).join(' ');
      hlutar.push(
        '<div style="padding:11px 13px;border:1px solid #d7dbe3;border-radius:10px;margin-bottom:9px">' +
          '<div><b style="color:#0f172a">🏷 ' + esc(u.serial) + '</b>' + (heiti ? ' · ' + esc(heiti) : '') +
            ' <span style="color:#64748b;font-size:12px">· skráð tæki</span></div>' +
          (f ? '<div style="margin-top:3px"><b>' + esc(f.nafn) + '</b>' +
                (f.kennitala ? ' <span style="color:#64748b">· ' + esc(f.kennitala) + '</span>' : '') +
                (f.simi ? ' <span style="color:#64748b">· ☎ ' + esc(f.simi) + '</span>' : '') + '</div>'
             : '<div style="margin-top:3px;color:#94a3b8">Ekkert félag á tækinu.</div>') +
          '<div style="margin-top:3px;color:#64748b;font-size:12.5px">' +
            [u.location && esc(u.location), u.last_insp && ('síðast skoðað ' + dd(u.last_insp)), u.status && ('staða ' + esc(u.status))]
              .filter(Boolean).join(' · ') + '</div>' +
          '<div style="margin-top:8px;display:flex;gap:7px;flex-wrap:wrap">' +
            (f && String(f.kennitala || '').replace(/\D/g, '').length === 10
              ? takki('_skt-kt-' + u.id, '👤 Setja viðskiptavin', true) : '') +
            takki('_skt-sv-' + u.id, '➕ Bæta þjónustu við', false) +
          '</div>' +
          '<div id="_skt-verd-' + u.id + '" style="margin-top:6px;color:#64748b;font-size:12.5px"></div>' +
        '</div>');
    }

    // 2) Það sem kom inn á borðið — nafn og sími, oftast engin kennitala.
    for (const x of vl) {
      const j = x.verkbeidnir || {};
      const heiti = [x.type, x.size].filter(Boolean).join(' ');
      const dags = [dd(j.dropoff) && 'innlagt ' + dd(j.dropoff), dd(j.pickup) && 'sækja ' + dd(j.pickup)].filter(Boolean).join(' · ');
      hlutar.push(
        '<div style="padding:11px 13px;border:1px solid #d7dbe3;border-radius:10px;margin-bottom:9px">' +
          '<div><b style="color:#0f172a">🏷 ' + esc(x.serial) + '</b>' + (heiti ? ' · ' + esc(heiti) : '') +
            ' <span style="color:#64748b;font-size:12px">· kom inn á borðið</span></div>' +
          '<div style="margin-top:3px">' + (j.num ? '<b>' + esc(j.num) + '</b> · ' : '') + '<b>' + esc(j.customer || '') + '</b>' +
            (j.phone ? ' <span style="color:#64748b">· ☎ ' + esc(j.phone) + '</span>' : '') + '</div>' +
          '<div style="margin-top:3px;color:#64748b;font-size:12.5px">' +
            [dags, VERK_STADA[String(j.status || '')] || j.status || ''].filter(Boolean).join(' · ') + '</div>' +
          (x.service ? '<div style="margin-top:3px;color:#64748b;font-size:12.5px">' + esc(x.service) + '</div>' : '') +
          '<div style="margin-top:8px;display:flex;gap:7px;flex-wrap:wrap">' +
            (j.customer ? takki('_skt-ls-' + x.id, '👤 Setja viðskiptavin', true) : '') +
            takki('_skt-sv2-' + x.id, '➕ Bæta þjónustu við', false) +
          '</div>' +
          '<div id="_skt-verd2-' + x.id + '" style="margin-top:6px;color:#64748b;font-size:12.5px"></div>' +
        '</div>');
    }

    settBody('<div style="margin-bottom:10px;color:#475569">Raðnúmer <b>' + esc(kodi) + '</b> — ' +
      (ut.length + vl.length) + ' niðurstaða/-ður:</div>' + hlutar.join(''));

    // Hlustarar settir EFTIR teikningu (innerHTML hendir þeim annars).
    for (const u of ut) {
      const f = await felag(u.fyrirtaeki_id);
      const bKt = document.getElementById('_skt-kt-' + u.id);
      if (bKt && f) bKt.addEventListener('click', () => { if (veljaMedKt(f.kennitala, f.nafn)) loka(); });
      const bSv = document.getElementById('_skt-sv-' + u.id);
      if (bSv) bSv.addEventListener('click', () => baetaMedVerdi(u.type, u.size, u.serial, '_skt-verd-' + u.id));
    }
    for (const x of vl) {
      const j = x.verkbeidnir || {};
      const bLs = document.getElementById('_skt-ls-' + x.id);
      if (bLs) bLs.addEventListener('click', () => { if (veljaLausasolu(j.customer, j.phone)) loka(); });
      const bSv = document.getElementById('_skt-sv2-' + x.id);
      if (bSv) bSv.addEventListener('click', () => baetaMedVerdi(x.type, x.size, x.serial, '_skt-verd2-' + x.id));
    }
  }

  async function baetaMedVerdi(tegund, staerd, radnr, reitId) {
    const reitur = document.getElementById(reitId);
    if (reitur) reitur.innerHTML = 'Sæki verð úr verðskránni…';
    const v = await verdFyrir(tegund, staerd);
    if (!reitur) return;
    if (!v) {
      reitur.innerHTML = '<span style="color:#b45309">Náði ekki í verðskrána — engin lína búin til.</span>';
      return;
    }
    if (v.oviss) {
      const val = v.val || [];
      if (!val.length) {
        reitur.innerHTML = '<span style="color:#b45309">Verðskráin á enga þjónustu fyrir „' +
          esc([tegund, staerd].filter(Boolean).join(' ')) + '". Veldu hana í flísunum; ég giska ekki á verð.</span>';
        return;
      }
      reitur.innerHTML = '<div style="color:#475569;margin-bottom:5px">Fleiri en ein þjónusta passar — veldu:</div>' +
        val.map((x, i) => '<button type="button" data-val="' + i + '" style="display:block;width:100%;text-align:left;margin-top:4px;padding:7px 10px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;font:inherit;font-size:12.5px;cursor:pointer">' +
          '<b>' + esc(x.nafn) + '</b> · ' + kr(x.verd_an_vsk) + ' án vsk</button>').join('');
      reitur.querySelectorAll('button[data-val]').forEach(b => b.addEventListener('click', () => {
        const x = val[Number(b.getAttribute('data-val'))];
        if (x && baetaThjonustu(x, tegund, staerd, radnr))
          reitur.innerHTML = '<span style="color:#15803d">✓ ' + esc(x.nafn) + ' · ' + kr(x.verd_an_vsk) + ' án vsk — komið í körfuna.</span>';
      }));
      return;
    }
    if (baetaThjonustu(v, tegund, staerd, radnr)) {
      reitur.innerHTML = '<span style="color:#15803d">✓ ' + esc(v.nafn) + ' · ' + kr(v.verd_an_vsk) + ' án vsk — komið í körfuna.</span>';
    } else {
      reitur.innerHTML = '<span style="color:#b45309">Karfan svaraði ekki — ekkert bætt við.</span>';
    }
  }

  /* ── Takkinn ─────────────────────────────────────────────────────────── */
  function skanna() {
    if (!window.Scanner || typeof Scanner.open !== 'function') {
      opna('<div style="color:#b45309">QR-skanninn er ekki hlaðinn.</div>');
      return;
    }
    Scanner.open(async code => {
      if (!code) return;
      const kodi = String(code).trim();
      opna('<div>Raðnúmer <b>' + esc(kodi) + '</b> — fletti upp…</div>');
      const n = await fletta(kodi);
      await syna(kodi, n);
    });
  }

  // Klóna takkann → gamli hlustarinn (pos.js `scanQr`) fylgir ekki með.
  function tengja() {
    const b = document.getElementById('pos-scan-top');
    if (!b || b.dataset._skt === '1') return;
    const nyr = b.cloneNode(true);
    nyr.dataset._skt = '1';
    nyr.title = 'Skanna tæki — sýnir viðskiptavin og hvað tækið er';
    b.parentNode.replaceChild(nyr, b);
    nyr.addEventListener('click', skanna);
  }

  // Sala-sýnin er teiknuð upp á nýtt (pos.js `boot`), svo takkinn kemur og fer.
  // Fylgjumst með í stað þess að tengja einu sinni og vona.
  function vakta() {
    tengja();
    try {
      new MutationObserver(tengja).observe(document.body, { childList: true, subtree: true });
    } catch (_) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vakta);
  else vakta();

  window.SkannaTaeki = { fletta, skanna, verdFyrir };
})();
