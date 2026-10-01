/* === VERKSPJALDIÐ (430) — eitt verk, einn gluggi · 01.10.2026 ===
 *
 * Agnar 01.10.2026: „rooosalega margir mismunandi gluggar sem tengjast sama Tækinu sem kom inn í
 * söluborð og fer í hleðslu … eins og 4-5 prent takkar á einni síðunni". Kortlagt: 14 gluggar.
 * Plan: .claude/plans/var-svona-svoldi-a-curried-teapot.md · teikning (Design Claude, Miðakerfi —
 * Brunastál): https://claude.ai/artifact/NMphoaSSZykBMQ5PMg3oZp → Verkspjald.dc.html.
 *
 * ÁFANGI 2a (þessi skrá): verkið sem ein heild — allar -Vn verkbeiðnir sömu sölu (R-001055-V1..V3)
 * í einum glugga. Haus · stöðuband · Prenta ▾. Verkstæðishlutinn (C) er fullunninn Á STAÐNUM: nafn og
 * sími, tækin opnast í glugganum (Tilbúið / Ónýtt / varahlutir / raðnr. / eyða), ein athugasemd,
 * „Senda í afgreiðslu". Afhending (A) og greitt (B) SÝNA línur og samtölur en takkarnir opna áfram
 * 121 (afhending/greiðsla), 142 (línur) og 26 (leiðrétting) — reikningsreglurnar (bakaður afsláttur,
 * kröfur, Payday) eiga heima þar þar til netvordur hefur farið yfir áfanga 2b.
 *
 * Kemur í stað: verkbeiðni-gluggans (#counter-detail-modal), tækjagluggans (#bw-unit-ov) og
 * „Breyta tæki", „Breyta verkbeiðni", „Athugasemd á verki", tveggja lengdarvala og fimm prent-takka.
 *
 * Inngangar: Counter.openJobModal (78 kallar hann úr Counter.select OG úr Counter.render við hverja
 * gagnabreytingu — þannig endurnýjast spjaldið), Workshop.openUnitModal, Workshop.select.
 * Skrif: aðeins verkbeidnir (nafn, sími, athugasemd, staða) og verklidur (staða, raðnr., varahlutir)
 * gegnum föll 78 og 134 — ENGIN skrif í sölur.
 *
 * Afturkall: AppSettings `verkspjald.af = true` → gömlu gluggarnir opnast aftur.
 * Shadow DOM: þema hússins málar alla <button> með !important; skuggarótin heldur útlitinu hreinu.
 */
(() => {
  'use strict';
  if (window.__verkspjald430) return;
  window.__verkspjald430 = true;

  const Z = 8500;   // ofan á #counter-detail-modal (8000), undir .bw-ov (9000), miðalengd (9999) og öllu öðru sem héðan opnast
  const TEG = [[/co2|co₂|kolsýr/i, '#dc2626'], [/duft|abc/i, '#2563eb'], [/froð|frod|abf/i, '#14b8a6'], [/léttvatn|lettvatn|vatn/i, '#38bdf8']];
  const LENGDIR = [50, 70, 90, 100];

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const kr = n => (Math.round(+n || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' kr';
  const krTala = n => (Math.round(+n || 0)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const dags = d => {
    if (!d) return '';
    const x = new Date(String(d).length === 10 ? d + 'T12:00:00' : d);
    return isNaN(x) ? '' : String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0') + '/' + x.getFullYear();
  };
  const tegLitur = t => { const s = String(t || ''); const x = TEG.find(p => p[0].test(s)); return x ? x[1] : '#8a93a3'; };
  const virkt = () => { try { return !(window.AppSettings && AppSettings.path && AppSettings.path('verkspjald.af') === true); } catch (_) { return true; } };
  const salaNumAf = job => { const m = /^([RK]-\d+)-V\d+$/i.exec(String((job && job.num) || '')); return m ? m[1].toUpperCase() : ''; };
  const lifandi = l => (l || []).filter(u => u && u.status !== 'eytt');
  const toast = (m, villa) => { try { if (window.Toast && Toast.show) Toast.show(m, villa ? 'err' : undefined); } catch (_) {} };

  function verkin(job) {
    const n = salaNumAf(job);
    if (!n) return [job];
    const l = ((window.DB && DB.cache && DB.cache.jobs) || []).filter(j => salaNumAf(j) === n && j.status !== 'eytt' && j.status !== 'cancelled');
    if (!l.some(j => j.id === job.id)) l.push(job);
    return l.sort((a, b) => String(a.num).localeCompare(String(b.num), 'is', { numeric: true }));
  }
  const taekin = jobs => { const o = []; jobs.forEach(j => lifandi(j.units).forEach(u => o.push({ j, u }))); return o; };
  const heitiTaekis = u => [u.type, u.size].filter(Boolean).join(' ') || u.service || 'Tæki';
  const kominn = u => u.status === 'done' || u.status === 'broken';

  // 1 = á verkstæði · 2 = afhending og greiðsla · 3 = afhent
  function skref(jobs) {
    if (jobs.some(j => j.status === 'received' || j.status === 'inprogress' || !j.status)) return 1;
    if (jobs.some(j => j.status === 'ready')) return 2;
    return 3;
  }
  function midiLengd() {
    let v = null;
    try { v = +(window.AppSettings && AppSettings.path && AppSettings.path('prentun.midi_lengd_mm')); } catch (_) {}
    return LENGDIR.indexOf(v) >= 0 ? v : 70;
  }

  // ── ástand ──────────────────────────────────────────────────────────────
  const S = {
    id: null,            // verk sem var opnað (job.id)
    opid: null,          // tæki sem er opið (verklidur.id)
    sala: null, salaNum: '', salaSott: 0, salaVilla: '',
    prenta: false, prentaBreyta: false, simi: null,
    meira: null,         // ⋯ opið á tæki
    rnr: null,           // raðnr. í breytingu (verklidur.id)
    bidTeikn: false
  };
  let host = null, rot = null, _notaT = null;

  // ── stíll (úr Verkspjald.dc.html, Brunastál) ─────────────────────────────
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const SILFUR = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const SVART = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  const GRAENN = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
  const RAUDUR = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';
  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const CSS = `
:host{all:initial}
*{box-sizing:border-box}
.ov{position:fixed;inset:0;z-index:${Z};background:rgba(8,10,14,.62);overflow:auto;padding:24px 16px;font-family:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;color:#11141c;font-size:13px;-webkit-font-smoothing:antialiased}
.vsp{max-width:1180px;margin:0 auto;background:#fff;border:1px solid #000;border-radius:14px;box-shadow:0 40px 80px -24px rgba(0,0,0,.75),0 2px 6px rgba(0,0,0,.3);overflow:visible}
button{font-family:inherit;cursor:pointer}
input,textarea{font-family:inherit}
.mono{font-family:${MONO}}
.haus{position:relative;background:${METAL};border-bottom:1px solid #000;border-radius:13px 13px 0 0;padding:16px 22px 14px 24px;display:flex;align-items:center;gap:16px;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}
.hnod{position:absolute;width:7px;height:7px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7)}
.merkid{width:52px;height:52px;flex:none;border-radius:10px;border:1px solid rgba(255,255,255,.14);display:flex;align-items:center;justify-content:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.16);background:${SVART}}
.merkid.m2{background:${GRAENN}}.merkid.m3{background:${RAUDUR}}
.kicker{font-family:${MONO};font-size:10.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#c9d0db}
.nafn{font-family:"Playfair Display",Georgia,serif;font-size:28px;font-weight:800;letter-spacing:-.01em;line-height:1.05;text-shadow:0 1px 0 rgba(0,0,0,.6);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.undir{font-family:${MONO};font-size:12px;color:#e3e8ef;margin-top:5px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.undir .d{color:#aeb6c3}
.grow{flex:1;min-width:0}
.plata{display:inline-flex;align-items:center;gap:6px;height:22px;padding:0 8px;border-radius:3px;border:1px solid rgba(20,24,34,.12);background:${SILFUR};box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12);font-family:${MONO};font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#1f2530;white-space:nowrap}
.plata i{width:6px;height:6px;border-radius:50%;display:inline-block;background:#6b7483}
.plata.ok i{background:#1f9d57}.plata.gull i{background:#c98a14}.plata.rautt i{background:#c0392b}
.silfur{height:40px;padding:0 14px;border-radius:9px;border:1px solid rgba(20,24,34,.16);background:${SILFUR};box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);display:inline-flex;align-items:center;justify-content:center;gap:7px;font-weight:600;font-size:13px;color:#1f2530;white-space:nowrap}
.silfur.lok{width:40px;padding:0}
.silfur:hover,.vbtn:hover,.fljot:hover{filter:brightness(.97)}
.pwrap{position:relative}
.pmenu{position:absolute;right:0;top:48px;width:330px;z-index:5;background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 22px 44px -12px rgba(0,0,0,.7);overflow:hidden;color:#11141c}
.pm-i{display:flex;align-items:center;gap:11px;width:100%;min-height:54px;padding:8px 14px;border:0;border-bottom:1px solid rgba(20,24,34,.08);background:#fff;text-align:left;color:#11141c}
.pm-i:hover{background:#f3f5f8}
.pm-i:disabled{opacity:.45;cursor:default}
.pm-i .t{font-weight:700;font-size:13.5px}.pm-i .u{font-family:${MONO};font-size:11px;color:#4a5363;margin-top:2px}
.pm-i .tala{margin-left:auto}
.pm-f{display:flex;align-items:center;gap:8px;padding:9px 14px;background:#e2e6ec;font-family:${MONO};font-size:11.5px;color:#2b313c;flex-wrap:wrap}
.pm-f .bt{margin-left:auto;height:28px;padding:0 10px;border-radius:7px;border:1px solid rgba(20,24,34,.16);background:${SILFUR};font-size:12px;font-weight:600;color:#1f2530}
.seg{display:inline-flex;gap:3px}
.seg button{height:32px;min-width:44px;padding:0 9px;border-radius:7px;border:1px solid rgba(20,24,34,.16);background:${SILFUR};font:700 12px ${MONO};color:#2b313c}
.seg button.val{background:${SVART};border-color:#000;color:#fff}
.fb{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));background:${SILFUR};border-bottom:1px solid rgba(20,24,34,.2)}
.fbs{position:relative;display:flex;align-items:center;gap:10px;padding:10px 20px 11px;color:#4a5363;min-width:0}
.fbs+.fbs{border-left:1px solid rgba(20,24,34,.12)}
.fbs .n{width:24px;height:24px;flex:none;border-radius:50%;border:1.5px solid #8f98a6;background:#fff;display:flex;align-items:center;justify-content:center;font:700 11px ${MONO};color:#2b313c}
.fbs .t{font-weight:700;font-size:13px}.fbs .u{font-family:${MONO};font-size:11px;margin-top:1px;color:#4a5363;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fbs.nu{background:#fff;color:#11141c}.fbs.nu .u{color:#2b313c}
.fbs.nu::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:3px;background:#b42318}
.fbs.nu .n{background:${SVART};border-color:#000;color:#fff}
.fbs.lok{color:#1f2530}.fbs.lok .n{background:${GRAENN};border-color:#03200f;color:#fff}
.stal{background:#e2e6ec;background-image:repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%);padding:16px;display:grid;grid-template-columns:minmax(0,1fr) 372px;gap:16px;align-items:start;border-radius:0 0 13px 13px}
.dalkur{display:flex;flex-direction:column;gap:14px;min-width:0}
.hopur{background:#fff;border:1px solid rgba(20,24,34,.14);border-radius:12px;box-shadow:0 1px 2px rgba(0,0,0,.08),0 6px 16px -10px rgba(0,0,0,.25);padding:12px 14px 14px}
.merki{font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#2b313c;display:flex;align-items:center;gap:7px;margin:0 0 8px}
.merki .fj{margin-left:auto;letter-spacing:.04em;text-transform:none;font-weight:500;color:#4a5363}
.lina{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr);gap:8px}
.lbl{font-family:${MONO};font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#4a5363;margin:0 0 4px;display:block}
.reitur{height:40px;border-radius:8px;border:1px solid rgba(20,24,34,.16);background:#f6f7f9;box-shadow:inset 0 1px 2px rgba(20,24,34,.08);padding:0 12px;font-size:13.5px;color:#11141c;width:100%;outline:none}
.reitur:focus{border-color:#1f2530;background:#fff}
.reitur[readonly]{background:#eef0f3;color:#2b313c}
.reitur.mono{font-family:${MONO};font-size:13px}
.vk{position:relative;border:1px solid rgba(20,24,34,.14);border-radius:10px;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08);overflow:hidden;margin-bottom:8px}
.vk::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--teg,#8a93a3)}
.vk-h{display:flex;align-items:center;gap:10px;width:100%;min-height:54px;padding:8px 12px 8px 16px;border:0;background:transparent;text-align:left;color:#11141c}
.vk-h .nm{font-weight:700;font-size:14px}.vk-h .id{font-family:${MONO};font-size:11.5px;color:#4a5363;margin-top:1px}
.vk-h .sv{font-size:12px;color:#4a5363;margin-top:1px}
.vk-h .chev{color:#4a5363;margin-left:6px}
.vk-b{padding:2px 12px 12px 16px;display:flex;flex-direction:column;gap:8px;border-top:1px solid rgba(20,24,34,.08)}
.vk-act{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 40px;gap:6px;padding-top:10px}
.vbtn{height:40px;border-radius:9px;border:1px solid rgba(20,24,34,.16);background:${SILFUR};box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14);display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:13px;font-weight:600;color:#1f2530;padding:0 10px}
.vbtn.ok{background:${GRAENN};border-color:#021a0b;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}
.vbtn.nyt{background:${SVART};border-color:#000;color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.14)}
.vbtn.sm{height:34px;font-size:12.5px;align-self:flex-start}
.meira{display:flex;flex-direction:column;border:1px solid rgba(20,24,34,.16);border-radius:9px;overflow:hidden}
.meira button{height:40px;border:0;border-bottom:1px solid rgba(20,24,34,.08);background:#fff;text-align:left;padding:0 12px;font-size:13px;font-weight:600;color:#1f2530}
.meira button:last-child{border-bottom:0}.meira button.eyda{color:#b42318}
.meira button:hover{background:#f3f5f8}
.vk-l{width:100%;border-collapse:collapse}
.vk-l td{padding:7px 0;border-bottom:1px dashed rgba(20,24,34,.15);font-size:13px;vertical-align:middle}
.vk-l .k{text-align:right;font-family:${MONO};font-size:12.5px;font-weight:700;white-space:nowrap;padding-left:8px}
.vk-l .q{font-family:${MONO};font-size:11.5px;color:#4a5363;margin-left:6px}
.fjarl{width:28px;height:28px;border-radius:6px;border:1px solid transparent;background:transparent;color:#4a5363;display:inline-flex;align-items:center;justify-content:center;margin-left:4px}
.fjarl:hover{border-color:rgba(20,24,34,.16);color:#b42318}
.rnr{display:flex;gap:6px;align-items:center}
.tomt{font-size:12.5px;color:#4a5363;padding:4px 0}
.textar{width:100%;min-height:64px;border-radius:8px;border:1px solid rgba(20,24,34,.16);background:#f6f7f9;box-shadow:inset 0 1px 2px rgba(20,24,34,.08);padding:9px 12px;font-size:13px;line-height:1.5;resize:vertical;outline:none;color:#11141c}
.textar:focus{border-color:#1f2530;background:#fff}
.annad{font-size:12.5px;color:#2b313c;margin-top:6px;white-space:pre-wrap}
.annad b{font-family:${MONO};font-size:11px}
.spjald{background:#fff;border:1px solid #000;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,.12),0 10px 24px -14px rgba(0,0,0,.45)}
.shaus{position:relative;height:46px;padding:5px 16px 5px 20px;background:${METAL};border-bottom:1px solid #000;display:flex;align-items:center;gap:10px;color:#fff;font-weight:600;font-size:15px;text-shadow:0 1px 0 rgba(0,0,0,.6)}
.shaus .hnod{width:6px;height:6px;top:20px}
.sinni{padding:14px;display:flex;flex-direction:column;gap:12px}
.stort{font-family:"Playfair Display",Georgia,serif;font-size:30px;font-weight:800;line-height:1}
.sbar{display:flex;gap:4px}.sbar span{flex:1;height:8px;border-radius:2px;background:#cfd5de}
.sbar span.ok{background:linear-gradient(180deg,#16783f,#0e5a2e)}.sbar span.nyt{background:#4a5363}
.stada-l{display:flex;align-items:center;gap:8px;font-size:13px;padding:6px 0;border-bottom:1px dashed rgba(20,24,34,.15)}
.stada-l:last-child{border-bottom:0}.stada-l .id{font-family:${MONO};font-size:11.5px;color:#4a5363}
.samtals{position:relative;margin:0 -14px;padding:10px 16px 12px 20px;background:${METAL};display:flex;align-items:baseline;justify-content:space-between;color:#fff}
.samtals .l{font-family:${MONO};font-size:11px;font-weight:700;letter-spacing:.16em;color:#c9d0db;text-transform:uppercase}
.samtals .t{font-family:"Playfair Display",Georgia,serif;font-size:34px;font-weight:800;letter-spacing:-.01em}
.samtals .t small{font-family:"IBM Plex Sans",sans-serif;font-size:15px;font-weight:700;margin-left:4px}
.klara{width:100%;min-height:52px;border-radius:10px;border:1px solid #021a0b;background:${GRAENN};box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 3px 10px rgba(6,51,26,.45);color:#fff;font-size:15px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:10px;text-shadow:0 1px 0 rgba(0,0,0,.5)}
.klara.rautt{background:${RAUDUR};border-color:#2a0304;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 3px 10px rgba(80,8,8,.4)}
.klara:disabled{opacity:.42;cursor:default;box-shadow:none}
.skyr{font-size:12px;color:#2b313c;line-height:1.45;text-align:center}
.tvo{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.haetta{height:36px;border:0;background:transparent;color:#2b313c;font-size:13px;font-weight:600;text-decoration:underline;text-underline-offset:3px}
.tafla{width:100%;border-collapse:separate;border-spacing:0;border-radius:8px;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(20,24,34,.12)}
.tafla th{background:${METAL};color:#c9d0db;font:700 10.5px ${MONO};letter-spacing:.1em;text-transform:uppercase;text-align:left;padding:9px 10px}
.tafla td{padding:8px 10px;border-top:1px solid rgba(20,24,34,.08);vertical-align:middle;font-size:13px}
.tafla .h{text-align:right;font-family:${MONO};white-space:nowrap}
.tafla .vu{font-size:11px;color:#4a5363;margin-top:1px}
.summa{display:flex;justify-content:space-between;font-family:${MONO};font-size:12px;color:#2b313c;padding:2px 0}
.summa.afsl{color:#b42318}
.villa{font-size:12.5px;color:#b42318}
@media (max-width:920px){.stal{grid-template-columns:minmax(0,1fr)}.ov{padding:0}.vsp{border-radius:0;min-height:100%}.haus{border-radius:0}.lina{grid-template-columns:1fr}.fbs .u{display:none}.nafn{font-size:22px}}
`;

  // ── tákn (inline stroke-SVG, Miðakerfi) ─────────────────────────────────
  const I = {
    lykill: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>',
    kassi: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
    las: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    prent: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="6" y="14" width="12" height="7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/></svg>',
    nidur: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    upp: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>',
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    xs: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    hak: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    meira: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>',
    plus: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    mida: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
    kvittun: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 1V2l-1 1-3-2-3 2-3-2-3 2-3-2z"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
    afram: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };
  const hnod2 = '<span class="hnod" style="left:7px"></span><span class="hnod" style="right:7px"></span>';
  const hnod = '<span class="hnod" style="left:7px;top:7px"></span><span class="hnod" style="right:7px;top:7px"></span><span class="hnod" style="left:7px;bottom:7px"></span><span class="hnod" style="right:7px;bottom:7px"></span>';

  // ── gögn: salan (aðeins lesin) ───────────────────────────────────────────
  async function saekjaSolu(num, afl) {
    if (!num || !window.DB || !DB.sb) return;
    if (!afl && S.salaNum === num && S.sala && Date.now() - S.salaSott < 15000) return;
    S.salaNum = num;
    try {
      const r = await DB.sb.from('solur').select('id,num,status,greitt_med,paid_at,afslattur,samtals,upphaed_an_vsk,vsk_upphaed,customer_nafn,customer_kt,customer_id,linur,is_credit,invoiced_at,krafa_sent_at').eq('num', num).maybeSingle();
      if (S.salaNum !== num) return;
      S.sala = (r && r.data) || null;
      S.salaVilla = r && r.error ? (r.error.message || 'villa') : '';
      S.salaSott = Date.now();
    } catch (e) { S.salaVilla = String(e && e.message || e); }
    teiknaSidar();
  }
  function linurSolu() {
    const l = (S.sala && Array.isArray(S.sala.linur)) ? S.sala.linur : [];
    return l.map(x => {
      const q = +x.qty || 0, v = +x.unit_price_ex_vat || 0, vsk = (x.vsk_pct == null ? 24 : +x.vsk_pct);
      const d = Math.max(0, Math.min(100, +x.discount_pct || 0));
      return { desc: String(x.desc || ''), q, d, mVsk: v * (1 + vsk / 100), samt: v * q * (1 + vsk / 100) * (1 - d / 100) };
    });
  }

  // ── teikning ─────────────────────────────────────────────────────────────
  function tryggjaHost() {
    if (host && host.isConnected) return rot;
    if (!document.getElementById('_vsp-font')) {
      const lf = document.createElement('link');
      lf.id = '_vsp-font'; lf.rel = 'stylesheet';
      lf.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap';
      (document.head || document.documentElement).appendChild(lf);
    }
    host = document.createElement('div');
    host.id = 'vsp-host';
    document.body.appendChild(host);
    rot = host.attachShadow({ mode: 'open' });
    rot.innerHTML = '<style>' + CSS + '</style><div class="ov"><div class="vsp" role="dialog" aria-modal="true" aria-label="Verkspjald"></div></div>';
    rot.addEventListener('click', onClick);
    rot.addEventListener('change', onChange);
    rot.addEventListener('input', onInput);
    rot.addEventListener('focusout', onFocusOut);
    const ov = rot.querySelector('.ov');
    let nidri = false;
    ov.addEventListener('mousedown', e => { nidri = e.target === ov; });
    ov.addEventListener('mouseup', e => { if (nidri && e.target === ov) loka(); nidri = false; });
    return rot;
  }
  const erAdSkrifa = () => { const a = rot && rot.activeElement; return !!(a && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type !== 'checkbox'))); };

  function teiknaSidar() {
    if (!S.id || !rot) return;
    if (erAdSkrifa()) { S.bidTeikn = true; return; }   // Stöðugt viðmót: aldrei kippa reit undan þeim sem skrifar
    teikna();
  }

  function teikna() {
    const r = tryggjaHost();
    const job = window.DB && DB.getJob ? DB.getJob(S.id) : null;
    if (!job) { loka(); return; }
    const jobs = verkin(job), t = taekin(jobs), sk = skref(jobs), salaNum = salaNumAf(job);
    if (salaNum) saekjaSolu(salaNum);
    const s = S.sala && S.sala.num === salaNum ? S.sala : null;
    const ov = r.querySelector('.ov'), skrun = ov ? ov.scrollTop : 0;
    r.querySelector('.vsp').innerHTML = hausHtml(job, jobs, t, sk, s) + bandHtml(jobs, t, sk, s) +
      '<div class="stal"><div class="dalkur">' + vidskHtml(job, jobs, s) + taekiHtml(jobs, t, sk) + notaHtml(jobs) + '</div>' +
      '<div class="dalkur">' + (sk === 1 ? stadaHtml(jobs, t, s) : sk === 2 ? afhendingHtml(jobs, t, s) : greittHtml(jobs, s)) + '</div></div>';
    if (ov) ov.scrollTop = skrun;
    host.style.display = '';
  }

  function hausHtml(job, jobs, t, sk, s) {
    const nm = ['Á verkstæði', 'Afhending', 'Afhent'][sk - 1];
    const plata = sk === 1 ? '<span class="plata gull"><i></i>Á verkstæði</span>' : sk === 2 ? '<span class="plata ok"><i></i>Tilbúið</span>' :
      (s && s.paid_at ? '<span class="plata ok"><i></i>Greitt</span>' : '<span class="plata"><i></i>Afhent</span>');
    const num = salaNumAf(job) || job.num || '';
    const numHtml = /^R-0+/.test(num) ? '<span class="d">' + esc(num.match(/^R-0+/)[0]) + '</span>' + esc(num.replace(/^R-0+/, '')) : esc(num);
    const kt = s && s.customer_kt && s.customer_kt !== '999999-9999' ? s.customer_kt : '';
    return '<div class="haus">' + hnod +
      '<div class="merkid' + (sk === 2 ? ' m2' : sk === 3 ? ' m3' : '') + '">' + (sk === 1 ? I.lykill : sk === 2 ? I.kassi : I.las) + '</div>' +
      '<div class="grow"><div class="kicker">Verkspjald · ' + nm + (jobs.length > 1 ? ' · ' + jobs.length + ' verk' : '') + '</div>' +
        '<div class="nafn">' + esc(job.customer || 'Viðskiptavinur') + '</div>' +
        '<div class="undir"><span>' + numHtml + '</span>' + (kt ? '<span class="d">·</span><span>kt. ' + esc(kt) + '</span>' : '') +
          (job.dropoff ? '<span class="d">·</span><span>móttekið ' + esc(dags(job.dropoff)) + '</span>' : '') + '</div></div>' +
      plata +
      '<div class="pwrap"><button type="button" class="silfur" data-a="prenta" aria-haspopup="menu" aria-expanded="' + S.prenta + '">' + I.prent + ' Prenta ' + (S.prenta ? I.upp : I.nidur) + '</button>' +
        (S.prenta ? prentaHtml(job, t, s) : '') + '</div>' +
      '<button type="button" class="silfur lok" data-a="loka" aria-label="Loka" title="Loka">' + I.x + '</button></div>';
  }

  function prentaHtml(job, t, s) {
    const lengd = midiLengd(), simi = S.simi != null ? S.simi : (job.phone || '');
    const kvOk = !!(s && s.status === 'final');
    return '<div class="pmenu" role="menu">' +
      '<button type="button" class="pm-i" role="menuitem" data-a="midar"' + (t.length ? '' : ' disabled') + '>' + I.mida +
        '<span><span class="t">Miðar á tækin</span><span class="u" style="display:block">einn á hvert tæki · Brother ' + lengd + ' mm</span></span>' +
        '<span class="plata tala">' + t.length + '</span></button>' +
      '<button type="button" class="pm-i" role="menuitem" data-a="kvittun"' + (kvOk ? '' : ' disabled') + '>' + I.kvittun +
        '<span><span class="t">Kvittun</span><span class="u" style="display:block">' + (kvOk ? 'reikningur ' + esc(s.num) : 'verður til þegar salan er kláruð') + '</span></span></button>' +
      '<div class="pm-f">' + (S.prentaBreyta
        ? '<span>Lengd</span><span class="seg">' + LENGDIR.map(n => '<button type="button" data-a="lengd" data-n="' + n + '" class="' + (n === lengd ? 'val' : '') + '">' + n + '</button>').join('') + '</span>' +
          '<input class="reitur mono" style="height:32px;width:130px" data-k="simi" value="' + esc(simi) + '" placeholder="Sími á miða" aria-label="Sími á miða">' +
          '<button type="button" class="bt" data-a="prenta-breyta">Búið</button>'
        : '<span>Miðar: ' + lengd + ' mm · sími ' + esc(simi || '—') + '</span><button type="button" class="bt" data-a="prenta-breyta">Breyta</button>') +
      '</div></div>';
  }

  function bandHtml(jobs, t, sk, s) {
    const tilb = t.filter(x => kominn(x.u)).length;
    const st = [
      ['Á verkstæði', sk === 1 ? tilb + ' af ' + t.length + ' tilbúin' : 'Lokið · ' + t.length + ' tæki'],
      ['Afhending og greiðsla', sk < 2 ? 'næsta skref' : sk === 2 ? 'línur og greiðsla' : 'Afhent'],
      [s && s.paid_at ? 'Greitt' : 'Afhent', sk === 3 ? (s && s.paid_at ? 'greitt ' + dags(s.paid_at) : (s && s.status === 'final' ? 'krafa · ógreitt' : 'kvittun og miðar')) : 'kvittun og miðar']
    ];
    return '<div class="fb">' + st.map((x, i) => {
      const n = i + 1, kl = n < sk ? 'lok' : n === sk ? 'nu' : '';
      return '<div class="fbs ' + kl + '"><span class="n">' + (n < sk ? I.hak : n) + '</span><span style="min-width:0"><div class="t">' + esc(x[0]) + '</div><div class="u">' + esc(x[1]) + '</div></span></div>';
    }).join('') + '</div>';
  }

  function vidskHtml(job, jobs, s) {
    const kt = s ? (s.customer_kt || '') : '';
    return '<div class="hopur"><div class="merki">Viðskiptavinur' + (jobs.length > 1 ? '<span class="fj">breytist á öllum ' + jobs.length + ' verkunum</span>' : '') + '</div>' +
      '<div class="lina">' +
        '<label><span class="lbl">Nafn</span><input class="reitur" data-k="nafn" value="' + esc(job.customer || '') + '" aria-label="Nafn"></label>' +
        '<label><span class="lbl">Kennitala</span><input class="reitur mono" value="' + esc(kt) + '" readonly title="Kennitalan er á sölunni — breytt í línunum (Afhending)" aria-label="Kennitala"></label>' +
        '<label><span class="lbl">Sími</span><input class="reitur mono" data-k="simi-verk" value="' + esc(job.phone || '') + '" placeholder="Sími" aria-label="Sími"></label>' +
      '</div></div>';
  }

  function taekiHtml(jobs, t, sk) {
    const fleiri = jobs.length > 1;
    const kort = t.map(({ j, u }) => {
      const opid = S.opid === u.id, staða = u.status === 'done' ? ['ok', 'Tilbúið'] : u.status === 'broken' ? ['rautt', 'Ónýtt'] : ['', 'Móttekið'];
      const parts = Array.isArray(u.parts) ? u.parts : [];
      let b = '';
      if (opid) {
        b = '<div class="vk-b">' +
          (sk === 1 ? '<div class="vk-act">' +
            '<button type="button" class="vbtn' + (u.status === 'done' ? ' ok' : '') + '" data-a="stada" data-s="done" data-j="' + j.id + '" data-u="' + u.id + '" aria-pressed="' + (u.status === 'done') + '">' + I.hak + ' Tilbúið</button>' +
            '<button type="button" class="vbtn' + (u.status === 'broken' ? ' nyt' : '') + '" data-a="stada" data-s="broken" data-j="' + j.id + '" data-u="' + u.id + '" aria-pressed="' + (u.status === 'broken') + '">Ónýtt</button>' +
            '<button type="button" class="vbtn" data-a="meira" data-u="' + u.id + '" aria-expanded="' + (S.meira === u.id) + '" aria-label="Fleiri aðgerðir" title="Fleiri aðgerðir">' + I.meira + '</button></div>'
            : '<div class="vk-act" style="grid-template-columns:minmax(0,1fr) 40px"><span class="plata ' + staða[0] + '" style="height:30px;justify-self:start"><i></i>' + staða[1] + '</span>' +
              '<button type="button" class="vbtn" data-a="meira" data-u="' + u.id + '" aria-label="Fleiri aðgerðir" title="Fleiri aðgerðir">' + I.meira + '</button></div>') +
          (S.meira === u.id ? '<div class="meira" role="menu">' +
            '<button type="button" role="menuitem" data-a="mida-eitt" data-j="' + j.id + '" data-u="' + u.id + '">Prenta miða</button>' +
            '<button type="button" role="menuitem" data-a="rnr" data-u="' + u.id + '">Breyta raðnúmeri</button>' +
            (sk === 1 ? '<button type="button" role="menuitem" class="eyda" data-a="eyda" data-j="' + j.id + '" data-u="' + u.id + '">Eyða tæki</button>' : '') +
            '</div>' : '') +
          (S.rnr === u.id ? '<div class="rnr"><input class="reitur mono" data-k="rnr" data-u="' + u.id + '" value="' + esc(u.serial || '') + '" aria-label="Raðnúmer"><button type="button" class="vbtn ok" data-a="rnr-vista" data-j="' + j.id + '" data-u="' + u.id + '">Vista</button><button type="button" class="vbtn" data-a="rnr">Hætta við</button></div>' : '') +
          (u.service && u.service !== heitiTaekis(u) ? '<div class="tomt">' + esc(u.service) + '</div>' : '') +
          (parts.length ? '<table class="vk-l">' + parts.map((p, i) => {
            const v = (+p.verd_an_vsk || 0) * (1 + (p.vsk_prosenta == null ? 24 : +p.vsk_prosenta) / 100) * (+p.qty || 1);
            return '<tr><td>' + esc(p.nafn || 'Varahlutur') + (+p.qty > 1 ? '<span class="q">×' + (+p.qty) + '</span>' : '') + '</td><td class="k">' + kr(v) +
              (sk === 1 ? '<button type="button" class="fjarl" data-a="hluti-x" data-j="' + j.id + '" data-u="' + u.id + '" data-i="' + i + '" aria-label="Taka ' + esc(p.nafn || 'varahlut') + ' af" title="Taka af">' + I.xs + '</button>' : '') + '</td></tr>';
          }).join('') + '</table>' : (sk === 1 ? '' : '<div class="tomt">Engir varahlutir.</div>')) +
          (sk === 1 ? '<button type="button" class="vbtn sm" data-a="hluti" data-j="' + j.id + '" data-u="' + u.id + '">' + I.plus + ' Varahlutur / þjónusta</button>' : '') +
        '</div>';
      }
      return '<div class="vk" style="--teg:' + tegLitur(u.type || u.service) + '">' +
        '<button type="button" class="vk-h" data-a="opna" data-u="' + u.id + '" aria-expanded="' + opid + '">' +
          '<span style="min-width:0"><div class="nm">' + esc(heitiTaekis(u)) + '</div><div class="id">' + esc(u.serial || '') + (fleiri ? ' · ' + esc(String(j.num).replace(/^.*-(V\d+)$/i, '$1')) : '') + '</div></span>' +
          '<span class="grow"></span>' + (parts.length && !opid ? '<span class="plata">' + parts.length + ' hl.</span>' : '') +
          '<span class="plata ' + staða[0] + '"><i></i>' + staða[1] + '</span><span class="chev">' + (opid ? I.upp : I.nidur) + '</span></button>' + b + '</div>';
    }).join('');
    return '<div class="hopur"><div class="merki">Tækin<span class="fj">' + t.length + ' tæki · smelltu til að opna</span></div>' +
      (kort || '<div class="tomt">Engin tæki á verkinu.</div>') +
      (sk === 1 ? '<button type="button" class="vbtn sm" data-a="nytt-taeki" data-j="' + jobs[0].id + '">' + I.plus + ' Bæta við tæki</button>' : '') + '</div>';
  }

  function notaHtml(jobs) {
    const JN = window.JobNotes;
    const sp = j => (JN && JN.split) ? JN.split(j.notes) : { prefix: '', userNote: String(j.notes || '') };
    const fyrsta = jobs[0], f = sp(fyrsta);
    const adrar = jobs.slice(1).map(j => ({ j, n: sp(j).userNote })).filter(x => x.n);
    return '<div class="hopur"><div class="merki">Athugasemd<span class="fj">ein á verkinu · innanhúss, prentast ekki</span></div>' +
      '<textarea class="textar" data-k="nota" data-j="' + fyrsta.id + '" rows="3" placeholder="Skrifaðu athugasemd — sést á Verkstæði og í Afgreiðslu" aria-label="Athugasemd">' + esc(f.userNote) + '</textarea>' +
      (f.prefix ? '<div class="annad">Þjónusta: ' + esc(f.prefix) + '</div>' : '') +
      adrar.map(x => '<div class="annad"><b>' + esc(String(x.j.num).replace(/^.*-(V\d+)$/i, '$1')) + ':</b> ' + esc(x.n) + '</div>').join('') +
      '</div>';
  }

  function samtalaSolu(jobs, s) {
    if (s) return +s.samtals || 0;
    return jobs.reduce((a, j) => a + (+j.verd || 0), 0);
  }

  function stadaHtml(jobs, t, s) {
    const tilb = t.filter(x => kominn(x.u)).length, allt = t.length > 0 && tilb === t.length;
    return '<div class="spjald"><div class="shaus">' + hnod2 + 'Staða verksins</div><div class="sinni">' +
      '<div style="display:flex;align-items:baseline;gap:8px"><span class="stort">' + tilb + '</span><span>af ' + t.length + ' tækjum tilbúin</span></div>' +
      '<div class="sbar">' + t.map(x => '<span class="' + (x.u.status === 'done' ? 'ok' : x.u.status === 'broken' ? 'nyt' : '') + '"></span>').join('') + '</div>' +
      '<div>' + t.map(({ u }) => '<div class="stada-l"><b>' + esc(heitiTaekis(u)) + '</b><span class="id">' + esc(u.serial || '') + '</span><span class="grow"></span>' +
        (u.status === 'done' ? '<span class="plata ok"><i></i>Tilbúið</span>' : u.status === 'broken' ? '<span class="plata rautt"><i></i>Ónýtt</span>' : '<span class="plata"><i></i>Móttekið</span>') + '</div>').join('') + '</div>' +
      '<div class="samtals"><span class="l">Á reikningnum</span><span class="t">' + krTala(samtalaSolu(jobs, s)) + '<small>kr</small></span></div>' +
      '<button type="button" class="klara" data-a="senda"' + (allt ? '' : ' disabled') + '>Senda í afgreiðslu ' + I.afram + '</button>' +
      '<div class="skyr">' + (allt ? 'Verkið fer í Afgreiðslu og bíður þess að vera sótt.' : 'Merktu öll tæki Tilbúið eða Ónýtt fyrst.') + '</div>' +
      '</div></div>';
  }

  function linuTafla(s) {
    const l = linurSolu();
    if (!s) return '<div class="tomt">' + (S.salaVilla ? '<span class="villa">Náði ekki í söluna: ' + esc(S.salaVilla) + '</span>' : 'Engin sala tengd verkinu.') + '</div>';
    if (!l.length) return '<div class="tomt">Engar línur á sölunni.</div>';
    return '<table class="tafla"><thead><tr><th>Vara</th><th class="h">Magn</th><th class="h">Afsl.</th><th class="h">Samtals</th></tr></thead><tbody>' +
      l.map(x => '<tr><td><div style="font-weight:700">' + esc(x.desc.replace(/\s*·\s*[−-]\s*[\d.,]+\s*%\s*afsl\.?\s*$/i, '')) + '</div><div class="vu">' + kr(x.mVsk) + ' stk.</div></td><td class="h">' + x.q + '</td><td class="h">' + (x.d ? x.d + ' %' : '—') + '</td><td class="h">' + kr(x.samt) + '</td></tr>').join('') +
      '</tbody></table>';
  }
  function summaHtml(s) {
    if (!s) return '';
    const afsl = +s.afslattur || 0;
    return (s.upphaed_an_vsk != null ? '<div class="summa"><span>Án vsk</span><span>' + kr(s.upphaed_an_vsk) + '</span></div>' : '') +
      (s.vsk_upphaed != null ? '<div class="summa"><span>Vsk</span><span>' + kr(s.vsk_upphaed) + '</span></div>' : '') +
      (afsl > 0 ? '<div class="summa afsl"><span>Afsláttur</span><span>−' + kr(afsl) + '</span></div>' : '');
  }

  function afhendingHtml(jobs, t, s) {
    return '<div class="spjald"><div class="shaus">' + hnod2 + 'Afhending og greiðsla</div><div class="sinni">' +
      linuTafla(s) + summaHtml(s) +
      '<div class="samtals"><span class="l">Samtals</span><span class="t">' + krTala(samtalaSolu(jobs, s)) + '<small>kr</small></span></div>' +
      '<button type="button" class="klara" data-a="afhenda">' + I.hak + ' Klára sölu og afhenda</button>' +
      '<div class="tvo"><button type="button" class="vbtn" data-a="linur"' + (s ? '' : ' disabled') + '>Breyta línum</button>' +
        '<button type="button" class="vbtn" data-a="aftur">Til baka á verkstæði</button></div>' +
      '<div class="skyr">Greiðslumáti og afsláttur eru valdir í næsta skrefi.</div>' +
      '</div></div>';
  }

  function greittHtml(jobs, s) {
    const gr = s && s.paid_at, aMap = { kort: 'Kort', reidufe: 'Reiðufé', peningar: 'Reiðufé', reikningur: 'Reikningur', greitt_sidar: 'Greitt síðar' };
    return '<div class="spjald"><div class="shaus">' + hnod2 + (gr ? 'Greitt og læst' : 'Afhent') + '</div><div class="sinni">' +
      (s ? '<div class="stada-l"><b>' + esc(s.num) + '</b><span class="grow"></span><span class="plata' + (gr ? ' ok' : ' gull') + '"><i></i>' +
        (gr ? 'Greitt ' + esc(dags(s.paid_at)) : (s.status === 'final' ? 'Krafa · ógreitt' : 'Drög')) + '</span></div>' +
        (s.greitt_med ? '<div class="stada-l"><span>Greiðslumáti</span><span class="grow"></span><b>' + esc(aMap[s.greitt_med] || s.greitt_med) + '</b></div>' : '') : '') +
      linuTafla(s) + summaHtml(s) +
      '<div class="samtals"><span class="l">' + (gr ? 'Greitt' : 'Samtals') + '</span><span class="t">' + krTala(samtalaSolu(jobs, s)) + '<small>kr</small></span></div>' +
      (s && s.status === 'final' && !s.is_credit ? '<button type="button" class="klara rautt" data-a="leidretta">Leiðrétta sölu</button>' : '') +
      '<div class="tvo"><button type="button" class="vbtn nyt" data-a="kvittun"' + (s && s.status === 'final' ? '' : ' disabled') + '>' + I.kvittun + ' Kvittun</button>' +
        '<button type="button" class="vbtn" data-a="midar">' + I.mida + ' Prenta miða</button></div>' +
      '<div class="skyr">Leiðrétting er alltaf kreditreikningur og nýr reikningur.</div>' +
      '</div></div>';
  }

  // ── aðgerðir ─────────────────────────────────────────────────────────────
  const finna = (jid, uid) => { const j = DB.getJob(+jid); const u = j && (j.units || []).find(x => x.id === +uid); return { j, u }; };

  async function prentaMida(listi, simiYfir) {
    const QLC = window.QrLabelCustomer;
    if (!QLC || !QLC.buildPrintLabel || !QLC.openPrintWindow || !QLC.qrPNG) { alert('QR-miðakerfið er ekki hlaðið — get ekki prentað.'); return; }
    if (!listi.length) { toast('Engin tæki til að prenta'); return; }
    const lengd = midiLengd();
    try { await QLC.ensureQRLib(); } catch (e) { alert('Gat ekki hlaðið QR-safnið.'); return; }
    // Sama sniðmát og Sala (08) — miðinn sem Agnar segir virka. QR = bert raðnr.
    const parts = await Promise.all(listi.map(async ({ j, u }) => {
      const qr = u.serial ? await QLC.qrPNG(u.serial, 320) : '';
      return QLC.buildPrintLabel({ qrDataUrl: qr, name: j.customer || '—', phone: simiYfir != null ? simiYfir : (j.phone || ''), serial: u.serial || '', extra: [u.type, u.size].filter(Boolean).join(' ') || u.service || '' });
    }));
    QLC.openPrintWindow(parts.join(''), lengd);
  }

  async function vistaVidsk(svid, gildi) {
    const job = DB.getJob(S.id); if (!job) return;
    const jobs = verkin(job), patch = svid === 'nafn' ? { customer: gildi } : { phone: gildi };
    if ((svid === 'nafn' ? job.customer || '' : job.phone || '') === gildi) return;
    let villa = null;
    for (const j of jobs) {
      try { const r = await DB.sb.from('verkbeidnir').update(patch).eq('id', j.id); if (r.error) villa = r.error; } catch (e) { villa = e; }
    }
    if (villa) { alert('Vistaðist ekki: ' + (villa.message || villa)); return; }
    jobs.forEach(j => Object.assign(j, patch));
    toast(svid === 'nafn' ? 'Nafn uppfært' : 'Sími uppfærður');
    try { if (window.Workshop && Workshop.render) Workshop.render(); } catch (_) {}
  }

  async function vistaNotu(jid, texti) {
    const j = DB.getJob(+jid); if (!j) return;
    const JN = window.JobNotes;
    const f = JN && JN.split ? JN.split(j.notes) : { prefix: '', userNote: j.notes || '' };
    if ((f.userNote || '') === String(texti || '').trim()) return;
    const nyr = JN && JN.join ? JN.join(f.prefix, texti) : String(texti || '').trim();
    const ok = JN && JN.save ? await JN.save(j.id, nyr) : !(await DB.sb.from('verkbeidnir').update({ notes: nyr }).eq('id', j.id)).error;
    if (!ok) { toast('Athugasemdin vistaðist ekki', true); return; }
    j.notes = nyr;
    toast('Athugasemd vistuð');
  }

  async function vistaRnr(jid, uid) {
    const inp = rot.querySelector('[data-k="rnr"][data-u="' + uid + '"]');
    const ny = inp ? String(inp.value || '').trim() : '';
    const { u } = finna(jid, uid); if (!u) return;
    if (!ny) { alert('Raðnúmer má ekki vera autt.'); return; }
    if (ny === (u.serial || '')) { S.rnr = null; teikna(); return; }
    const r = await DB.sb.from('verklidur').update({ serial: ny }).eq('id', u.id);
    if (r.error) { alert('Vistaðist ekki: ' + r.error.message); return; }
    u.serial = ny; S.rnr = null; S.meira = null;
    toast('Raðnúmer uppfært');
    try { if (window.Workshop && Workshop.render) Workshop.render(); } catch (_) {}
    teikna();
  }

  async function onClick(e) {
    const el = e.target.closest('[data-a]');
    if (!el || el.disabled) {
      if (S.prenta && !e.target.closest('.pwrap')) { S.prenta = false; S.prentaBreyta = false; teikna(); }
      return;
    }
    const a = el.dataset.a, job = DB.getJob(S.id);
    if (!job) return;
    if (a !== 'prenta' && a !== 'prenta-breyta' && a !== 'lengd' && S.prenta && !el.closest('.pmenu')) { S.prenta = false; S.prentaBreyta = false; }
    switch (a) {
      case 'loka': loka(); return;
      case 'prenta': S.prenta = !S.prenta; S.prentaBreyta = false; teikna(); return;
      case 'prenta-breyta': {
        if (S.prentaBreyta) { const i = rot.querySelector('[data-k="simi"]'); if (i) S.simi = String(i.value || '').trim(); }
        S.prentaBreyta = !S.prentaBreyta; teikna(); return;
      }
      case 'lengd': {
        const n = +el.dataset.n; if (LENGDIR.indexOf(n) < 0) return;
        const i = rot.querySelector('[data-k="simi"]'); if (i) S.simi = String(i.value || '').trim();
        try { if (window.AppSettings && AppSettings.save) await AppSettings.save({ prentun: { midi_lengd_mm: n } }); } catch (_) {}
        teikna(); return;
      }
      case 'midar': S.prenta = false; teikna(); prentaMida(taekin(verkin(job)), S.simi); return;
      case 'mida-eitt': { const f = finna(el.dataset.j, el.dataset.u); S.meira = null; teikna(); if (f.u) prentaMida([f], S.simi); return; }
      case 'kvittun': S.prenta = false; teikna(); if (window.Counter && Counter.prentaKvittun) Counter.prentaKvittun(job.id); return;
      case 'opna': { const uid = +el.dataset.u; S.opid = S.opid === uid ? null : uid; S.meira = null; S.rnr = null; teikna(); return; }
      case 'meira': { const uid = +el.dataset.u; S.meira = S.meira === uid ? null : uid; teikna(); return; }
      case 'stada': {
        const { j, u } = finna(el.dataset.j, el.dataset.u); if (!u) return;
        const ny = u.status === el.dataset.s ? 'received' : el.dataset.s;
        el.disabled = true;
        await Workshop.setUnitStatus(j.id, u.id, ny);
        teikna(); return;
      }
      case 'hluti': Workshop.addPartToUnit(+el.dataset.j, +el.dataset.u); return;   // vöruvalið (117) — Workshop.render teiknar okkur
      case 'hluti-x': await Workshop.removePartFromUnit(+el.dataset.j, +el.dataset.u, +el.dataset.i); teikna(); return;
      case 'rnr': { const uid = el.dataset.u ? +el.dataset.u : null; S.rnr = uid && S.rnr !== uid ? uid : null; S.meira = null; teikna(); if (S.rnr) { const i = rot.querySelector('[data-k="rnr"]'); if (i) { i.focus(); i.select(); } } return; }
      case 'rnr-vista': vistaRnr(el.dataset.j, el.dataset.u); return;
      case 'eyda': { S.meira = null; const ok = await Workshop.deleteUnit(+el.dataset.j, +el.dataset.u); if (ok && S.opid === +el.dataset.u) S.opid = null; teikna(); return; }
      case 'nytt-taeki': Workshop.addUnit(+el.dataset.j); return;   // lítill gluggi (78, z 9000) — Workshop.render teiknar okkur
      case 'senda': {
        const ids = verkin(job).filter(j => j.status !== 'collected').map(j => j.id);
        el.disabled = true;
        await Workshop.sendGroupToAfgreidsla(ids);
        teikna(); return;
      }
      case 'afhenda': {
        // Áfangi 2a: afhending og greiðsla í gegnum 121 (greiðslumáti, kröfur, kvittun) — reikningsreglurnar þar.
        const fyrst = verkin(job).find(j => j.status === 'ready') || job;
        if (window.PickupCheckout && PickupCheckout.open) PickupCheckout.open(fyrst.id);
        else if (window.Counter && Counter.markCollected) Counter.markCollected(fyrst.id);
        return;
      }
      case 'linur': if (window.SaleEditor && SaleEditor.openFromJob) SaleEditor.openFromJob(job.num); return;
      case 'aftur': {
        const tilb = verkin(job).filter(j => j.status === 'ready');
        if (!window.Counter || !Counter.sendBackToWorkshop) return;
        for (const j of tilb) { try { await Counter.sendBackToWorkshop(j.id); } catch (_) {} }
        teikna(); return;
      }
      case 'leidretta': {
        if (!S.sala) return;
        if (window.CreditInvoice && CreditInvoice.openEdit) CreditInvoice.openEdit(S.sala);
        else if (window.CreditInvoice && CreditInvoice.open) CreditInvoice.open(S.sala);
        return;
      }
    }
  }
  function onChange(e) {
    const k = e.target && e.target.dataset ? e.target.dataset.k : null;
    if (k === 'nafn') vistaVidsk('nafn', String(e.target.value || '').trim());
    else if (k === 'simi-verk') vistaVidsk('simi', String(e.target.value || '').trim());
  }
  function onInput(e) {
    const t = e.target, k = t && t.dataset ? t.dataset.k : null;
    if (k === 'nota') { clearTimeout(_notaT); const jid = t.dataset.j, v = t.value; _notaT = setTimeout(() => vistaNotu(jid, v), 900); }
  }
  function onFocusOut(e) {
    const t = e.target, k = t && t.dataset ? t.dataset.k : null;
    if (k === 'nota') { clearTimeout(_notaT); vistaNotu(t.dataset.j, t.value); }
    setTimeout(() => { if (S.bidTeikn && !erAdSkrifa()) { S.bidTeikn = false; teikna(); } }, 0);
  }
  function onKeyDoc(e) {
    if (!S.id || e.key !== 'Escape') return;
    if (document.querySelector('#_vp-dialog, #bw-add-ov, #_pbl-picker, #ci-modal, #_se-dlg')) return;   // gluggi ofan á okkur fær Esc
    if (S.prenta) { S.prenta = false; S.prentaBreyta = false; teikna(); return; }
    if (S.meira || S.rnr) { S.meira = null; S.rnr = null; teikna(); return; }
    loka();
  }

  // ── opna / loka ──────────────────────────────────────────────────────────
  function visa(id, unitId) {
    const job = window.DB && DB.getJob ? DB.getJob(id) : null;
    if (!job) return false;
    const nytt = S.id !== id;
    if (nytt) { S.opid = null; S.meira = null; S.rnr = null; S.prenta = false; S.prentaBreyta = false; S.simi = null; S.sala = null; S.salaNum = ''; S.salaVilla = ''; }
    S.id = id;
    if (unitId != null) S.opid = +unitId;
    else if (nytt) { const t = taekin(verkin(job)); if (t.length === 1) S.opid = t[0].u.id; }
    if (nytt) document.addEventListener('keydown', onKeyDoc);
    if (nytt || !erAdSkrifa()) teikna(); else S.bidTeikn = true;
    return true;
  }
  function loka(fraCounter) {
    if (!S.id) return;
    clearTimeout(_notaT);
    const ta = rot && rot.querySelector('[data-k="nota"]');
    if (ta) vistaNotu(ta.dataset.j, ta.value);
    S.id = null; S.opid = null; S.prenta = false; S.meira = null; S.rnr = null;
    document.removeEventListener('keydown', onKeyDoc);
    if (host) host.style.display = 'none';
    if (!fraCounter && window.Counter) {
      Counter.sel = null;
      try { if (Counter.render) Counter.render(); } catch (_) {}
    }
  }

  // ── tenging við inngangana ───────────────────────────────────────────────
  function tengja() {
    const C = window.Counter, W = window.Workshop;
    if (!C || !W || typeof C.openJobModal !== 'function' || typeof W.openUnitModal !== 'function' || typeof W.render !== 'function') return false;
    if (!C.openJobModal.__vsp) {
      const orig = C.openJobModal;
      C.openJobModal = function () {
        if (virkt() && C.sel) {
          const m = document.getElementById('counter-detail-modal'); if (m) m.style.display = 'none';
          if (visa(C.sel)) return;
        }
        return orig.apply(this, arguments);
      };
      C.openJobModal.__vsp = true;
    }
    if (!C.closeJobModal.__vsp) {
      const orig = C.closeJobModal;
      C.closeJobModal = function () { loka(true); return orig.apply(this, arguments); };
      C.closeJobModal.__vsp = true;
    }
    if (!W.openUnitModal.__vsp) {
      const orig = W.openUnitModal;
      W.openUnitModal = function (jobId, unitId) {
        if (virkt() && DB.getJob(jobId)) { C.sel = jobId; visa(jobId, unitId); return; }
        return orig.apply(this, arguments);
      };
      W.openUnitModal.__vsp = true;
    }
    if (typeof W.select === 'function' && !W.select.__vsp) {
      const orig = W.select;
      W.select = function (id) {
        if (virkt() && DB.getJob(id)) { C.sel = id; visa(id); return; }
        return orig.apply(this, arguments);
      };
      W.select.__vsp = true;
    }
    // Aðgerðir 78 enda á Workshop.render() — þá teiknast spjaldið líka (vöruval, nýtt tæki, eyða).
    if (!W.render.__vsp) {
      const orig = W.render;
      W.render = function () { const r = orig.apply(this, arguments); if (S.id) teiknaSidar(); return r; };
      W.render.__vsp = true;
    }
    return true;
  }
  // 78 skilgreinir föllin í eigin ræsingu og yfirskrifar Workshop.render — tengt aftur ef það gerist.
  let _tilr = 0;
  (function bida() { tengja(); if (++_tilr < 240) setTimeout(bida, _tilr < 40 ? 250 : 2000); })();
  document.addEventListener('sale-edited', () => { if (S.id && S.salaNum) saekjaSolu(S.salaNum, true); });
  window.addEventListener('focus', () => { if (S.id && S.salaNum) saekjaSolu(S.salaNum, true); });

  window.Verkspjald = { opna: id => { if (window.Counter) Counter.sel = id; return visa(id); }, loka: () => loka(), virkt, _S: S };
  console.log('[430] Verkspjaldið — eitt verk, einn gluggi');
})();
/* === END VERKSPJALDIÐ === */
