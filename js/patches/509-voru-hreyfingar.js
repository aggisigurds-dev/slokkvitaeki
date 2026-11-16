/* === HREYFINGAR VÖRU (509, 16.11.2026) — sögugluggi á hverja söluvöru ==================================================
 *
 * Agnar 16.11.2026: „skráðu kostnaðarverðin á vörurnar … en hafðu hverja vöru með history glugga, sem sýnir þá magn og
 * á hvaða verði, og útreikninga, vísun í þennan útreikning, hvenær bætt við dags … hálfgerðan hreyfingarlista."
 *
 * VoruHreyfingar.opna(varaId) opnar glugga með:
 *   · stöðu vörunnar núna (kaupverð, söluverð án vsk, framlegð, lager, selt frá upphafi),
 *   · hreyfingum hennar: innfluttar sendingar (magn, verð frá birgja, gengi, vörur og gjöld á stykki, kostnaðarverð,
 *     hvað stóð á vörunni fyrir og eftir, hvenær og hver skráði), talningar og eldri verð — með útreikningnum sjálfum
 *     undir hverri línu og tengli á sendinguna í Birgðir → Innflutningur,
 *   · sölu eftir mánuðum (sömu tölur og dálkurinn „Selt" í Birgðum).
 *
 * Gögn: GET /api/innflutningur?vara=<id> (netlify/functions/innflutningur.cjs, starfsmannahlið; taflan vorur_hreyfingar).
 * Glugginn les aðeins; hreyfingarnar skrifar „Færa í birgðir" í Innflutningi (507). Ekkert er vistað hér.
 * Stöðugt viðmót: beinagrindin heldur stærð gluggans meðan sótt er; opnir útreikningar lifa í breytu (_opnir).
 * Útlit: Brunastál C (stálspjald með hnoðuðum málmhaus, reitir, plötur, tafla C). Engin tákn úr emoji.
 * ================================================================================================================== */
(() => {
  if (window.VoruHreyfingar) return;

  const API = '/api/innflutningur';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ── Snið ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  const erTala = (n) => n != null && n !== '' && Number.isFinite(Number(n));
  const thus = (n) => { const s = String(Math.abs(Math.round(n))); return (n < 0 ? '−' : '') + s.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); };
  const kr = (n) => (erTala(n) ? thus(Number(n)) + ' kr' : '—');
  const aukastafir = (n, d) => {
    if (!erTala(n)) return '—';
    const [h, a] = Math.abs(Number(n)).toFixed(d).split('.');
    return (Number(n) < 0 ? '−' : '') + thus(Number(h)) + (a ? ',' + a : '');
  };
  const pct = (x, d) => (erTala(x) ? (Number(x) * 100).toFixed(d == null ? 1 : d).replace('.', ',') + ' %' : '—');
  const dags = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${m[3]}/${m[2]}/${m[1]}` : '—'; };
  const stund = (iso) => {
    try { const d = new Date(iso); if (isNaN(d)) return '—'; const p = (x) => String(x).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} kl. ${p(d.getHours())}:${p(d.getMinutes())}`; } catch (_) { return '—'; }
  };
  const MAN = ['janúar', 'febrúar', 'mars', 'apríl', 'maí', 'júní', 'júlí', 'ágúst', 'september', 'október', 'nóvember', 'desember'];
  const manudur = (ym) => { const m = /^(\d{4})-(\d{2})$/.exec(ym || ''); return m ? `${MAN[Number(m[2]) - 1]} ${m[1]}` : esc(ym || '—'); };
  const TEGUND = { innflutningur: 'Innflutningur', innkaup: 'Innkaup', talning: 'Talning', leidretting: 'Leiðrétting', eldra: 'Eldra verð' };
  const KAUPVERD = { nytt: 'Kaupverð vörunnar sett á þetta verð', medal: 'Kaupverð vörunnar sett á vegið meðaltal við eldri lager', obreytt: 'Kaupverð vörunnar stóð óbreytt' };

  // ── Ástand ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  let _bak = null;            // yfirlagið (eitt í einu)
  let _id = null;             // varan sem er opin
  let _gogn = null;           // { vara, hreyfingar, sala, sala_villa }
  let _villa = null;          // { texti, innskraning }
  let _fyrriFokus = null;
  const _opnir = new Set();   // id hreyfinga með opinn útreikning — lifir í breytu, ekki í DOM

  // ── Stílar (Brunastál C; sömu tákn og 507) ─────────────────────────────────────────────────────────────────────────
  function stilar() {
    if (document.getElementById('_vhr-css')) return;
    if (!document.getElementById('_tbm-font') && !document.getElementById('_innf-font') && !document.getElementById('_vhr-font')) {
      const lf = document.createElement('link');
      lf.id = '_vhr-font'; lf.rel = 'stylesheet';
      lf.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap';
      document.head.appendChild(lf);
    }
    const MONO = '"JetBrains Mono",ui-monospace,monospace', SANS = '"IBM Plex Sans",system-ui,sans-serif', DISPLAY = '"Playfair Display",Georgia,serif';
    const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
    const STAL_IMG = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
    const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
    // Fjögur gervi-auðkenni: appham blæs upp takka með !important (gildra 3 í Brunastáli C).
    const B = '#_vhr-bak:not(#_vhr1):not(#_vhr2):not(#_vhr3):not(#_vhr4)';
    const V = B + ' .vhr';
    const css = [
      `${B}{position:fixed;inset:0;z-index:9400;background:rgba(10,14,22,.62);display:flex;align-items:flex-start;justify-content:center;padding:28px 14px;overflow-y:auto;-webkit-overflow-scrolling:touch}`,
      `${V}{font-family:${SANS};color:#141822;width:min(1240px,100%);container-type:inline-size}`,
      `${V} *{box-sizing:border-box}`,
      `${V}-spjald{background-color:#e2e6ec;background-image:${STAL_IMG};border:1px solid #000;border-radius:14px;box-shadow:0 24px 60px -12px rgba(0,0,0,.7);overflow:hidden}`,
      `${V}-haus{position:relative;background:${METAL};min-height:56px;padding:8px 18px 8px 22px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.1);border-bottom:1px solid #000}`,
      `${V}-haus::before,${V}-haus::after{content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7)}`,
      `${V}-haus::before{left:8px}${V}-haus::after{right:8px}`,
      `${V}-titill{min-width:0;flex:1 1 260px}`,
      `${V}-titill small{display:block;font-family:${MONO};font-size:10.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#c9ced8!important;margin-bottom:2px}`,
      `${V}-titill b{display:block;font-size:17px;font-weight:600;color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.6);overflow-wrap:anywhere}`,
      `${V}-tala{font-family:${DISPLAY};font-weight:800;font-size:30px;line-height:1;color:#fff;font-variant-numeric:lining-nums;white-space:nowrap;text-align:right}`,
      `${V}-tala span{display:block;font-family:${MONO};font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#c9ced8;margin-bottom:4px}`,
      `${V} button{font-family:${SANS}!important;cursor:pointer}`,
      `${V}-btn{height:36px!important;min-height:36px!important;padding:0 14px!important;border-radius:9px!important;font-size:13px!important;font-weight:600!important;display:inline-flex;align-items:center;gap:7px;white-space:nowrap;background:${SILVER};border:1px solid rgba(20,24,34,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.18);color:#141822!important;width:auto!important}`,
      `${V}-btn:hover{filter:brightness(1.04)}${V}-btn:focus-visible{outline:2px solid #b42318;outline-offset:2px}`,
      `${V}-btn--litill{height:28px!important;min-height:28px!important;padding:0 10px!important;font-size:12px!important;border-radius:6px!important}`,
      `${V}-bukur{padding:14px;display:grid;grid-template-columns:minmax(0,1fr);gap:14px;min-height:420px;align-content:start}`,
      `${V}-kafli{background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 2px 6px rgba(10,14,22,.12);padding:12px 14px 14px;min-width:0}`,
      `${V}-merki{font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#3a4250;margin:0 0 8px;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}`,
      `${V}-merki em{font-style:normal;font-family:${SANS};font-size:11.5px;font-weight:500;letter-spacing:0;text-transform:none;color:#5b6472}`,
      // Lykiltölur: reitir (.line) í grind
      `${V}-lykil{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}`,
      `${V}-reitur{background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);padding:9px 12px;min-width:0}`,
      `${V}-reitur span{display:block;font-family:${MONO};font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#3a4250}`,
      `${V}-reitur b{display:block;font-family:${MONO};font-size:20px;font-weight:700;color:#141822;margin-top:3px;white-space:nowrap}`,
      `${V}-reitur i{display:block;font-style:normal;font-size:11.5px;color:#5b6472;margin-top:1px;min-height:16px}`,
      // Plötur
      `${V}-plate{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:${SILVER};box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12);font-family:${MONO};font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#141822;white-space:nowrap}`,
      `${V}-plate i{width:7px;height:7px;border-radius:50%;background:#8f98a8;box-shadow:inset 0 0 0 1px rgba(0,0,0,.25)}`,
      `${V}-plate--inn i{background:#16a34a}${V}-plate--taln i{background:#d29a1e}${V}-plate--aft i{background:#b42318}`,
      // Tafla C
      `${V}-umbudir{overflow-x:auto;-webkit-overflow-scrolling:touch;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)}`,
      `${V}-tafla{width:100%!important;min-width:0!important;display:table!important;border-collapse:separate;border-spacing:0;background:#fff;font-size:13px}`,
      `${V}-tafla thead th{background:#eef1f6!important;color:#3a4250!important;font-family:${MONO}!important;font-size:10.5px!important;font-weight:700!important;letter-spacing:.08em;text-transform:uppercase;text-align:left;padding:9px 8px!important;white-space:normal;line-height:1.25;vertical-align:bottom;border:0!important}`,
      `${V}-tafla th.t,${V}-tafla td.t{text-align:right}`,
      `${V}-tafla td{padding:8px;border-top:1px solid #e4e8ef;vertical-align:top}`,
      `${V}-tafla td.t{font-family:${MONO};font-size:12px;white-space:nowrap}`,
      `${V}-tafla td.kv{font-weight:700;color:#141822;font-size:13px}`,
      `${V}-tafla tr.vhr-aft td{color:#8a93a2}${V}-tafla tr.vhr-aft td.kv{text-decoration:line-through}`,
      `${V}-tafla tfoot td{background:#eef1f6;font-weight:700;border-top:1px solid #cfd5df}`,
      `${V}-nafn{font-weight:700;display:block}`,
      `${V}-daufur{display:block;color:#5b6472;font-size:11.5px;font-weight:500;margin-top:2px;white-space:normal;font-family:${SANS}}`,
      `${V}-tafla td.vhr-hr{min-width:240px}${V}-tafla td.vhr-skr{white-space:nowrap;font-size:12px}`,
      // Útreikningurinn undir línunni
      `${V}-tafla tr.vhr-utrod td{background:#f6f8fb;padding:10px 12px 12px;border-top:1px dashed #cfd5df}`,
      `${V}-utr{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px 24px}`,
      `${V}-utr h4{margin:0 0 6px;font-family:${MONO};font-size:10.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#3a4250}`,
      `${V}-daemi{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 14px;font-size:12.5px}`,
      `${V}-daemi span{color:#3a4250}${V}-daemi b{font-family:${MONO};font-weight:500;text-align:right;white-space:nowrap}`,
      `${V}-daemi .vhr-sum{border-top:1px solid #141822;padding-top:4px;font-weight:700;color:#141822}`,
      `${V}-daemi b.vhr-sum{font-weight:700}`,
      `${V}-daemi .vhr-ekki{color:#8a93a2}`,
      `${V}-vantar{display:inline-flex;align-items:center;min-height:22px;padding:2px 8px;border-radius:3px;background:#fff4e0;border:1px solid #e0a93e;color:#845400;font-size:11.5px;font-weight:600;margin-top:6px}`,
      `${V}-undir{display:flex;gap:8px 14px;flex-wrap:wrap;align-items:center;margin-top:10px;font-size:12px;color:#3a4250}`,
      `${V}-tomt{padding:16px 4px;color:#3a4250;font-size:13px}`,
      `${V}-villa{background:#fff;border:1px solid #b42318;border-radius:10px;padding:14px 16px;color:#b42318;font-weight:600}`,
      `${V}-villa a{color:#b42318}`,
      `${V}-beinagrind{height:86px;border-radius:12px;background:#fff;border:1px solid #000;opacity:.7}`,
      `${V}-beinagrind--ha{height:300px}`,
      `@container (max-width:640px){${V}-tala{font-size:24px}${V}-bukur{padding:10px}${V}-kafli{padding:10px}}`,
    ].join('\n');
    const s = document.createElement('style');
    s.id = '_vhr-css';
    s.textContent = css;
    document.head.appendChild(s);
  }

  // ── Teikning ───────────────────────────────────────────────────────────────────────────────────────────────────────
  // Röð: dagsetning atburðar (sendingin, talningin) nýjust fyrst; hreyfing án dagsetningar (eldra verð) aftast.
  function radad(hreyfingar) {
    const lykill = (h) => (h.dags ? String(h.dags) : '0000-00-00') + '|' + String(h.created_at || '');
    return [...hreyfingar].sort((a, b) => lykill(b).localeCompare(lykill(a)));
  }

  function lykiltolur(g) {
    const v = g.vara || {};
    const kv = erTala(v.kostnadarverd) ? Number(v.kostnadarverd) : null;
    const sv = erTala(v.verd_an_vsk) ? Number(v.verd_an_vsk) : null;
    const framl = kv != null && sv != null ? sv - kv : null;
    const selt = g.sala_villa ? null : (g.sala || []).reduce((a, s) => a + (Number(s.magn) || 0), 0);
    const reitur = (merki, gildi, undir) => `<div class="vhr-reitur"><span>${merki}</span><b>${gildi}</b><i>${undir || ''}</i></div>`;
    return `<div class="vhr-lykil">
      ${reitur('Kaupverð nú', kv != null ? kr(kv) : '—', kv != null ? 'án vsk, komið til landsins' : 'ekki skráð')}
      ${reitur('Söluverð', sv != null ? kr(sv) : '—', 'án vsk')}
      ${reitur('Framlegð á stykki', framl != null ? kr(framl) : '—', framl != null && sv > 0 ? pct(framl / sv, 0) + ' af söluverði' : '')}
      ${reitur('Á lager', erTala(v.birgdir) ? thus(Number(v.birgdir)) + ' stk' : '—', erTala(v.birgdir) ? '' : 'ótalið')}
      ${reitur('Selt frá upphafi', selt != null ? thus(selt) + ' stk' : '—', selt != null ? 'nettó eftir kreditreikninga' : 'salan náðist ekki')}
    </div>`;
  }

  // Útreikningurinn eins og hann var gerður: verð × gengi, hlutdeild í kostnaði sendingarinnar, summan.
  function utreikningurHtml(h) {
    const u = h.utreikningur || {};
    const mynt = esc(h.mynt || '');
    const skipt = u.skipting === 'fjoldi' ? 'eftir fjölda stykkja' : 'eftir verðhlutfalli';
    const lidir = Array.isArray(u.lidir) ? u.lidir : [];
    const lidur = (k) => {
      const ekki = k.tegund !== 'kostnadur' || k.upphaed == null;
      const merki = k.upphaed == null ? ' (ómælt, ekki talið)' : k.tegund === 'innskattur' ? ' (innskattur, ekki kostnaður)' : k.tegund === 'ekki' ? ' (ekki talið)' : '';
      return `<span class="${ekki ? 'vhr-ekki' : ''}">${esc(k.heiti)}${merki}</span><b class="${ekki ? 'vhr-ekki' : ''}">${k.upphaed == null ? '—' : kr(k.upphaed)}</b>`;
    };
    const omaelt = Array.isArray(u.omaeldir) && u.omaeldir.length
      ? `<div class="vhr-vantar">Ómælt þegar skráð var: ${u.omaeldir.map(esc).join(', ')}. Kostnaðarverðið hækkar þegar það bætist við.</div>` : '';
    return `<div class="vhr-utr">
      <div>
        <h4>Á stykki</h4>
        <div class="vhr-daemi">
          <span>Verð frá birgja ${aukastafir(h.einingaverd, 2)} ${mynt} × gengi ${aukastafir(h.gengi, 2)}</span><b>${kr(h.vorur_kr)}</b>
          <span>Hlutdeild í flutningi og gjöldum: ${kr(u.kostnadur_alls)} × ${pct(u.hlutur, 2)} ÷ ${thus(Number(h.magn) || 0)} stk</span><b>${kr(h.alag_kr)}</b>
          <span class="vhr-sum">Kostnaðarverð á stykki</span><b class="vhr-sum">${kr(h.kostnadarverd)}</b>
        </div>
        ${omaelt}
      </div>
      <div>
        <h4>Sendingin í heild</h4>
        <div class="vhr-daemi">
          <span>Vörur: ${aukastafir(u.erl_alls, 2)} ${mynt} greiddar</span><b>${kr(u.vorur_isk_alls)}</b>
          ${lidir.map(lidur).join('')}
          <span class="vhr-sum">Vörur og kostnaður samtals</span><b class="vhr-sum">${kr(u.heild)}</b>
        </div>
      </div>
    </div>
    <div class="vhr-undir">
      <span>Kostnaði skipt ${skipt}: hlutur þessarar vöru ${pct(u.hlutur, 2)}.</span>
      <span>${esc(KAUPVERD[u.kaupverd] || '')}${u.baeta ? ' · magninu bætt við lager' : ' · lager ekki breytt'}.</span>
      ${h.innflutningur_id ? `<button type="button" class="vhr-btn vhr-btn--litill" data-vhr-sending="${Number(h.innflutningur_id)}">Opna sendinguna${h.tilvisun ? ' ' + esc(h.tilvisun) : ''}</button>` : ''}
    </div>`;
  }

  function hreyfingRod(h) {
    const u = h.utreikningur || {};
    const innfl = h.tegund === 'innflutningur' || h.tegund === 'innkaup';
    const aft = !!h.afturkallad_at;
    const plata = aft ? `<span class="vhr-plate vhr-plate--aft"><i></i>Afturkallað</span>`
      : `<span class="vhr-plate ${innfl ? 'vhr-plate--inn' : 'vhr-plate--taln'}"><i></i>${esc(TEGUND[h.tegund] || h.tegund)}</span>`;
    const undir = [h.tilvisun ? 'Tilvísun ' + esc(h.tilvisun) : '', u.birgir ? esc(u.birgir) + (u.land ? ', ' + esc(u.land) : '') : ''].filter(Boolean).join(' · ');
    const breyttVerd = h.kostn_fyrir !== h.kostn_eftir && !(h.kostn_fyrir == null && h.kostn_eftir == null);
    const breyttLager = h.birgdir_fyrir !== h.birgdir_eftir && erTala(h.birgdir_eftir);
    const aVoru = [
      erTala(h.kostn_eftir) || erTala(h.kostn_fyrir)
        ? (breyttVerd ? `${kr(h.kostn_fyrir)} → <b>${kr(h.kostn_eftir)}</b>` : `${kr(h.kostn_eftir)}<span class="vhr-daufur">óbreytt</span>`) : '',
      breyttLager ? `<span class="vhr-daufur">Lager ${erTala(h.birgdir_fyrir) ? thus(Number(h.birgdir_fyrir)) : '—'} → ${thus(Number(h.birgdir_eftir))} stk</span>` : '',
    ].filter(Boolean).join('') || '—';
    const opinn = _opnir.has(h.id);
    const rod = `<tr class="${aft ? 'vhr-aft' : ''}">
      <td class="t" style="text-align:left">${dags(h.dags)}</td>
      <td class="vhr-hr">${plata}${undir ? `<span class="vhr-daufur">${undir}</span>` : ''}${h.athugasemd ? `<span class="vhr-daufur">${esc(h.athugasemd)}</span>` : ''}${aft ? `<span class="vhr-daufur">Afturkallað ${stund(h.afturkallad_at)}</span>` : ''}</td>
      <td class="t">${erTala(h.magn) ? thus(Number(h.magn)) + ' stk' : '—'}</td>
      <td class="t">${erTala(h.einingaverd) ? aukastafir(h.einingaverd, 2) + ' ' + esc(h.mynt || '') : '—'}</td>
      <td class="t">${erTala(h.vorur_kr) ? kr(h.vorur_kr) : '—'}</td>
      <td class="t">${erTala(h.alag_kr) ? kr(h.alag_kr) : '—'}</td>
      <td class="t kv">${erTala(h.kostnadarverd) ? kr(h.kostnadarverd) : '—'}</td>
      <td class="t">${aVoru}</td>
      <td class="vhr-skr">${stund(h.created_at)}<span class="vhr-daufur">${esc(h.skrad_af || '')}</span></td>
      <td>${innfl && h.utreikningur ? `<button type="button" class="vhr-btn vhr-btn--litill" data-vhr-utr="${Number(h.id)}" aria-expanded="${opinn}">${opinn ? 'Fela útreikning' : 'Útreikningur'}</button>` : ''}</td>
    </tr>`;
    return rod + (innfl && h.utreikningur && opinn ? `<tr class="vhr-utrod"><td colspan="10">${utreikningurHtml(h)}</td></tr>` : '');
  }

  function hreyfingarHtml(g) {
    const l = radad(g.hreyfingar || []);
    if (!l.length) return '<div class="vhr-tomt">Engar hreyfingar skráðar á þessa vöru enn. Innflutt sending skráist hér þegar hún er færð í birgðir (Birgðir, flipinn Innflutningur).</div>';
    return `<div class="vhr-umbudir"><table class="vhr-tafla">
      <thead><tr><th>Dags.</th><th>Hreyfing</th><th class="t">Magn</th><th class="t">Verð frá birgja</th><th class="t">Vörur á stk</th><th class="t">Flutn. og gjöld á stk</th><th class="t">Kostnaðarverð</th><th class="t">Kaupverð á vöru</th><th>Skráð</th><th></th></tr></thead>
      <tbody>${l.map(hreyfingRod).join('')}</tbody>
    </table></div>`;
  }

  function soluHtml(g) {
    if (g.sala_villa) return '<div class="vhr-tomt">Salan náðist ekki í þetta sinn. Opnaðu gluggann aftur.</div>';
    const l = g.sala || [];
    if (!l.length) return '<div class="vhr-tomt">Engin sala skráð á þessa vöru.</div>';
    const magn = l.reduce((a, s) => a + (Number(s.magn) || 0), 0), upph = l.reduce((a, s) => a + (Number(s.an_vsk) || 0), 0);
    return `<div class="vhr-umbudir"><table class="vhr-tafla">
      <thead><tr><th>Mánuður</th><th class="t">Selt</th><th class="t">Sala án vsk</th><th class="t">Meðalverð á stk</th></tr></thead>
      <tbody>${l.map((s) => `<tr><td>${manudur(s.manudur)}</td><td class="t">${thus(Number(s.magn) || 0)} stk</td><td class="t">${kr(s.an_vsk)}</td><td class="t">${Number(s.magn) > 0 ? kr(Number(s.an_vsk) / Number(s.magn)) : '—'}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td>Samtals</td><td class="t">${thus(magn)} stk</td><td class="t">${kr(upph)}</td><td class="t">${magn > 0 ? kr(upph / magn) : '—'}</td></tr></tfoot>
    </table></div>`;
  }

  function efniHtml() {
    if (_villa) {
      return `<div class="vhr-villa">${esc(_villa.texti)}${_villa.innskraning ? ` <a href="/innskraning.html?next=${encodeURIComponent(location.pathname + location.hash)}">Skrá inn</a>` : ''}</div>`;
    }
    if (!_gogn) return '<div class="vhr-beinagrind"></div><div class="vhr-beinagrind vhr-beinagrind--ha"></div>';
    return `<div>${lykiltolur(_gogn)}</div>
      <div class="vhr-kafli"><div class="vhr-merki">Innkaup og kostnaðarverð <em>hver hreyfing með útreikningi sínum</em></div>${hreyfingarHtml(_gogn)}</div>
      <div class="vhr-kafli"><div class="vhr-merki">Sala eftir mánuðum <em>einingaverð × magn á reikningum, fyrir afslátt reiknings</em></div>${soluHtml(_gogn)}</div>`;
  }

  function teikna() {
    if (!_bak) return;
    const v = (_gogn && _gogn.vara) || {};
    const kv = erTala(v.kostnadarverd) ? kr(v.kostnadarverd) : '—';
    const haus = _bak.querySelector('.vhr-haus-efni');
    if (haus) haus.innerHTML = `<div class="vhr-titill"><small>Hreyfingar vöru</small><b>${esc(v.nafn || (_gogn ? '' : 'Sæki…'))}</b></div><div class="vhr-tala"><span>Kaupverð nú</span>${kv}</div>`;
    const bukur = _bak.querySelector('.vhr-bukur');
    if (!bukur) return;
    const skrun = _bak.scrollTop;
    bukur.innerHTML = efniHtml();
    _bak.scrollTop = skrun;
  }

  // ── Gögn ───────────────────────────────────────────────────────────────────────────────────────────────────────────
  async function saekja(id) {
    try {
      const r = await fetch(`${API}?vara=${encodeURIComponent(id)}`, { credentials: 'same-origin' });
      let d = null;
      try { d = await r.json(); } catch (_) { d = null; }
      if (_id !== id) return;                                  // annar gluggi var opnaður á meðan
      if (!r.ok || !d || !d.vara) {
        _villa = { texti: (d && d.error) || 'Náði ekki í hreyfingar vörunnar.', innskraning: !!(d && d.need_login) || r.status === 401 };
        _gogn = null;
      } else {
        _gogn = d; _villa = null;
        // Nýjasta innkaupalínan sýnir útreikninginn strax — það er hann sem glugginn er opnaður til að sjá.
        const fyrsta = radad(d.hreyfingar || []).find((h) => (h.tegund === 'innflutningur' || h.tegund === 'innkaup') && h.utreikningur && !h.afturkallad_at);
        if (fyrsta) _opnir.add(fyrsta.id);
      }
    } catch (_) {
      if (_id !== id) return;
      _villa = { texti: 'Náði ekki sambandi. Reyndu aftur.', innskraning: false };
      _gogn = null;
    }
    teikna();
  }

  // ── Gluggi ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  function loka() {
    if (!_bak) return;
    document.removeEventListener('keydown', aLykil, true);
    _bak.remove();
    _bak = null; _id = null; _gogn = null; _villa = null;
    _opnir.clear();
    try { if (_fyrriFokus && document.contains(_fyrriFokus)) _fyrriFokus.focus(); } catch (_) {}
    _fyrriFokus = null;
  }
  function aLykil(e) { if (e.key === 'Escape' && _bak) { e.stopPropagation(); loka(); } }

  function opnaSendingu(sid) {
    loka();
    try {
      if (window.App && App.switchView) App.switchView('birgdir');
      if (window.Stock && Stock._setHam) Stock._setHam('innflutningur');
      if (window.Innflutningur && Innflutningur.opnaSendingu) Innflutningur.opnaSendingu(sid);
    } catch (_) {}
  }

  function opna(id) {
    id = Number(id);
    if (!Number.isInteger(id) || id <= 0) return;
    stilar();
    if (_bak) loka();
    _fyrriFokus = document.activeElement;
    _id = id; _gogn = null; _villa = null;
    _bak = document.createElement('div');
    _bak.id = '_vhr-bak';
    _bak.innerHTML = `<div class="vhr" role="dialog" aria-modal="true" aria-label="Hreyfingar vöru"><div class="vhr-spjald">
      <div class="vhr-haus"><div class="vhr-haus-efni" style="display:contents"></div><button type="button" class="vhr-btn" data-vhr-loka>Loka</button></div>
      <div class="vhr-bukur"></div>
    </div></div>`;
    _bak.addEventListener('click', (e) => {
      if (e.target === _bak || e.target.closest('[data-vhr-loka]')) { loka(); return; }
      const u = e.target.closest('[data-vhr-utr]');
      if (u) { const hid = Number(u.dataset.vhrUtr); if (_opnir.has(hid)) _opnir.delete(hid); else _opnir.add(hid); teikna(); return; }
      const s = e.target.closest('[data-vhr-sending]');
      if (s) opnaSendingu(Number(s.dataset.vhrSending));
    });
    document.addEventListener('keydown', aLykil, true);
    document.body.appendChild(_bak);
    teikna();
    try { _bak.querySelector('[data-vhr-loka]').focus(); } catch (_) {}
    saekja(id);
  }

  window.VoruHreyfingar = { opna, loka };
})();
