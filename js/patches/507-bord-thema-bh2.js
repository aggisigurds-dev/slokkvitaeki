/* === ÞJÓNUSTUBORÐ · BRUNAHÓLF V2-ÚTLIT Á NAFN STARFSMANNS v1 (16.11.2026) ===
 *
 * Agnar 15.11.2026: „skipta þemainu fyrir Annþór inn á þjónustuborð, að láta bara það vera í brunahólf v2
 * þemu" + „síðan kanski bara litinn takka með að svissa milli þema". Samþykkt mockup:
 * https://claude.ai/artifact/JZBae99KPANtwkjgB1bxxo (Design-strigi, raungögn Anni).
 * Hönnunarkerfi: Brunahólf V2 (claude.ai/code/artifact/4eeafa1c-ff33-444b-a6c7-14426661cd82) — navy rammi,
 * appelsínugul aðgerð, hvít spjöld með mjúkum skugga á ljósbláum grunni, Poppins.
 *
 * UMFANG: aðeins Þjónustuborðið (368, skuggarót #view-bord). Haus appsins, hliðarstika og aðrar síður
 * halda sínu útliti. Boss-stíllinn í 368 er ósnertur — þetta er YFIRLAG sem gildir aðeins undir
 * :host([data-thema="bh2"]), svo án merkisins sést nákvæmlega sama borð og áður.
 *
 * GÖGN (regla 15.10.2026 — val notandans fer á þjóninn, eins á öllum vélum):
 *   thjonustubord5.by_staff.<nafn>.thema = 'bh2' | 'boss'   (vantar = Boss)
 * Rofinn [Boss | V2] aftast í meta-línunni undir fyrirsögninni skrifar það á nafn þess sem er við borðið.
 *
 * API (368 kallar, allt varið með `window.ThbThemaBh2 &&`):
 *   css()                 yfirlagið, bætt aftast í cssText()
 *   stilla(host, nafn)    í render(): setur/tekur data-thema á #view-bord
 *   rofi(nafn)            HTML rofans (í .meta)
 *   skipta(nafn, gildi, render) → Promise<bool>   smellur á rofann; vistar á þjón
 *   thema(nafn)           'bh2' | ''
 */
(() => {
  if (window.ThbThemaBh2) return;

  const LYKILL = 'thjonustubord5';
  const MYND = '/img/bh2-hetja-bygging.jpg';
  const P = k => { try { return (window.AppSettings && AppSettings.path) ? AppSettings.path(k) : null; } catch (_) { return null; } };
  // Val sem er smellt en þjónninn hefur ekki enn skilað — svo rofinn skipti strax, ekki eftir svar.
  const bid = {};

  function thema(nafn) {
    const v = P(LYKILL + '.by_staff.' + nafn + '.thema');
    if (bid[nafn] != null) {
      if (v === bid[nafn]) delete bid[nafn];
      else return bid[nafn] === 'bh2' ? 'bh2' : '';
    }
    return v === 'bh2' ? 'bh2' : '';
  }

  function letur() {
    if (document.getElementById('t5-bh2-letur')) return;
    const l = document.createElement('link');
    l.id = 't5-bh2-letur';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
  }

  function stilla(host, nafn) {
    if (!host) return;
    if (thema(nafn) === 'bh2') {
      letur();
      if (host.getAttribute('data-thema') !== 'bh2') host.setAttribute('data-thema', 'bh2');
    } else if (host.hasAttribute('data-thema')) host.removeAttribute('data-thema');
  }

  function rofi(nafn) {
    const v2 = thema(nafn) === 'bh2';
    return '<span class="seg sm t5-thema" role="group" aria-label="Útlit borðsins">' +
      '<button type="button" data-t5="thema" data-v="boss" aria-pressed="' + !v2 + '" title="Boss-útlitið (svart stál og gull)">Boss</button>' +
      '<button type="button" data-t5="thema" data-v="bh2" aria-pressed="' + v2 + '" title="Brunahólf V2 (navy og appelsínugult)">V2</button>' +
    '</span>';
  }

  async function skipta(nafn, gildi, render) {
    const nyt = gildi === 'bh2' ? 'bh2' : 'boss';
    if ((thema(nafn) === 'bh2') === (nyt === 'bh2')) return true;
    bid[nafn] = nyt;
    if (render) render();
    let ok = false;
    try { ok = !!(await AppSettings.save({ [LYKILL]: { by_staff: { [nafn]: { thema: nyt } } } })); } catch (_) {}
    if (!ok) { delete bid[nafn]; if (render) render(); }
    return ok;
  }

  // ── Yfirlagið. Allt undir H svo Boss-borðið breytist ekki um eina línu. ────────────────────────────────
  const H = ':host([data-thema="bh2"])';
  const SH = '0 1px 2px rgba(2,25,60,.06),0 8px 24px rgba(2,25,60,.08)';
  const GLOD = '0 6px 16px rgba(255,103,2,.35)';
  const APP = 'linear-gradient(180deg,#ff8a1f,#ff6702 55%,#ec5300)';
  const RAMMI = 'inset 0 0 0 1px #d8dee9';
  const FOKUS = 'outline:3px solid rgba(255,103,2,.45);outline-offset:0;box-shadow:inset 0 0 0 1px #ff6702';
  const LEITARTAKN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235a6882' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.3-4.3'/%3E%3C/svg%3E\")";

  function css() {
    return [
      // Breyturnar sem allt borðið les — Boss-gildin víkja fyrir V2-táknum (tokens.json Brunahólf V2).
      H + '{background:#e9f0fa;--ink:#101e43;--ink2:#2e4064;--mute:#5a6882;--on:#fff;--on2:#c9d3e3;--on3:#c9d3e3;' +
        '--rule:#d8dee9;--rule2:#e7ecf3;--rule3:#d8dee9;--edge:#d8dee9;--edge2:#c3ccd9;--terra:#b91c1c;--green:#166534;' +
        '--gink:#c2410c;--g5:#ff8a1f;--g6:#ff6702;--g8:#c2410c;' +
        '--gline:linear-gradient(90deg,#ff8a1f,#ff6702);--gface:' + APP + ';--gside:linear-gradient(180deg,#ff8a1f,#ec5300);--gcoin:linear-gradient(180deg,#ff8a1f,#ec5300);' +
        '--panel:#fff;--panelsh:' + SH + ';--strip:#fff;--stripsh:none;--key:#fff;--keysh:0 1px 2px rgba(2,25,60,.06);' +
        '--well:#fff;--wellsh:none;--slab:#0b2d5f;--slabsh:' + SH + ';--dwell:#02193c;--dwellsh:none;' +
        "--disp:Poppins,system-ui,sans-serif;--mono:Poppins,system-ui,sans-serif;--body:Poppins,system-ui,-apple-system,'Segoe UI',sans-serif}",
      H + ' .t5{background:#e9f0fa}',
      H + ' .t5 :focus-visible{outline:3px solid #ff6702;outline-offset:2px}',

      // Hetjan + verkfærastikan (mockup): .head og .acts leysast upp í grind .col — enginn hnútur færður.
      // Röð 1: hetjan (titill) með „Ég er" neðst t.h.  Röð 2: hvítt spjald með leit + þrír takkar.
      H + ' .col{display:grid;grid-template-columns:minmax(0,1fr) repeat(3,auto);column-gap:10px;row-gap:16px;align-items:start}',
      H + ' .col>*{grid-column:1/-1;min-width:0}',
      H + ' .head{display:contents}',
      H + ' .head>div:first-child{grid-row:1;grid-column:1/-1;position:relative;isolation:isolate;overflow:hidden;margin:-16px -22px -36px;padding:30px 32px 76px;min-height:214px;background:#02193c;color:#fff}',
      H + ' .head>div:first-child::before{content:"";position:absolute;inset:0;z-index:-2;background:url(' + MYND + ') right top/cover no-repeat,radial-gradient(60% 90% at 78% 70%,rgba(255,138,31,.45),transparent 70%),linear-gradient(180deg,#0a2a55,#3a5b83)}',
      H + ' .head>div:first-child::after{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(90deg,#02193c 18%,rgba(2,25,60,.55) 45%,rgba(2,25,60,0) 70%),linear-gradient(180deg,rgba(233,240,250,0) 62%,#e9f0fa 100%)}',
      // Tenglarnir efst t.h. (Nýi vefurinn, Þjónustugátt) — draugatakkar á navy.
      H + ' .t5-hl{top:18px;right:24px}',
      H + ' .head>div:first-child>a.btn{top:18px!important;right:24px!important}',
      H + ' .t5-hl .btn,' + H + ' .head>div:first-child>a.btn{background:rgba(255,255,255,.08);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.28)}',
      H + ' .t5-hl .btn:hover,' + H + ' .head>div:first-child>a.btn:hover{background:rgba(255,255,255,.16)}',
      H + ' .kicker{color:#fff;font:600 12px/1.2 var(--body);letter-spacing:.18em;margin:0 0 10px}',
      H + ' .kicker::before{display:none}',
      H + ' .h1{font:700 44px/1.1 var(--body);letter-spacing:-.02em;color:#fff;text-shadow:0 2px 12px rgba(2,25,60,.4);margin:0}',
      H + ' .meta{display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px;margin:10px 0 0;font:500 13px/1.4 var(--body);letter-spacing:0;text-transform:none;color:#c9d3e3}',
      H + ' .acts{display:contents}',
      H + ' .acts>.who{grid-row:1;grid-column:2/-1;justify-self:end;align-self:end;margin:0 8px 40px 0;flex-direction:row;align-items:center;gap:10px;position:relative;z-index:2}',
      // Merkið lendir ofan á upplýstri byggingunni í myndinni — dökk undirlögn svo það lesist.
      H + ' .who .lbl{white-space:nowrap;padding:5px 9px;border-radius:6px;background:rgba(2,25,60,.72);color:#fff;font:600 11px/1.2 var(--body);letter-spacing:.08em}',
      H + ' .who select{height:40px;min-width:170px;padding:0 12px;border:0;border-radius:10px;background:#fff;box-shadow:' + RAMMI + ';font:600 14px var(--body);color:#101e43}',
      H + ' .acts>.btn{grid-row:2;align-self:center;position:relative;z-index:2}',
      H + ' .acts>.btn:nth-of-type(1){grid-column:2}',
      H + ' .acts>.btn:nth-of-type(2){grid-column:3}',
      H + ' .acts>.btn:nth-of-type(3){grid-column:4}',
      H + ' .leit{grid-row:2;grid-column:1;max-width:none;position:relative;z-index:2}',
      H + ' .col::before{content:"";grid-row:2;grid-column:1/-1;align-self:stretch;margin:-14px -16px;background:#fff;border-radius:14px;box-shadow:' + SH + ';position:relative;z-index:1}',

      // Takkar: hvítir með hárlínu; EINN appelsínugulur á svæði („+ Nýtt mál", gylltu takkarnir).
      H + ' .btn{height:40px;padding:0 16px;border-radius:10px;font:600 14px var(--body);transition:transform .16s cubic-bezier(.23,1,.32,1),background-color .16s,box-shadow .16s}',
      H + ' .btn:hover,' + H + ' .btn:active{filter:none}',
      H + ' .btn:active{transform:scale(.97)}',
      H + ' .btn.sm{height:32px;padding:0 12px;font-size:13px;border-radius:8px}',
      H + ' .btn.lg{height:48px;padding:0 24px;font-size:15px}',
      H + ' .btn.iv{border:0;background:#fff;color:#101e43;box-shadow:' + RAMMI + ',0 1px 2px rgba(2,25,60,.06)}',
      H + ' .btn.iv:hover{background:#f6f9fd}',
      H + ' .btn.gold,' + H + ' .acts>.btn:nth-of-type(3){border:0;background:' + APP + ';color:#fff;font-weight:600;text-shadow:none;box-shadow:' + GLOD + '}',
      H + ' .btn.gold:hover,' + H + ' .acts>.btn:nth-of-type(3):hover{background:#ec5300}',
      H + ' .btn[aria-pressed="true"]{background:#0b2d5f;color:#fff;box-shadow:none}',

      // Leit.
      H + ' .leit input{height:44px;padding:0 14px 0 42px;border:0;border-radius:10px;background:#fff ' + LEITARTAKN + ' 14px center/18px no-repeat;box-shadow:' + RAMMI + ';font:14px var(--body);color:#101e43}',
      H + ' .leit input::placeholder{color:#5a6882;opacity:1}',
      H + ' .leit input:focus{' + FOKUS + '}',

      // Hamir = flipar í hvítri stiku; virkur appelsínugulur. Aðrir rofar = Segmented (navy-700 valinn).
      H + ' .modes{gap:12px}',
      H + ' .modes>.lbl{display:none}',
      H + ' .seg{border:0;border-radius:10px;background:#f3f6fb;box-shadow:inset 0 0 0 1px #e7ecf3;padding:4px;gap:4px}',
      H + ' .seg button{height:34px;padding:0 14px;border:0;border-radius:8px;background:transparent;font:500 13.5px var(--body);color:#101e43}',
      H + ' .seg button[aria-pressed="true"]{background:#0b2d5f;color:#fff;font-weight:600;box-shadow:none}',
      H + ' .seg.sm{padding:2px;gap:2px;border-radius:8px}',
      H + ' .seg.sm button{height:26px;padding:0 10px;font-size:12px;border-radius:6px}',
      H + ' .seg.modeseg{flex:1 1 640px;display:flex;background:#fff;border-radius:14px;padding:6px;box-shadow:' + SH + '}',
      H + ' .seg.modeseg button{flex:1 0 auto;height:40px;padding:0 16px;border-radius:10px;font:600 14px var(--body)}',
      H + ' .seg.modeseg button:hover{background:#f6f9fd}',
      H + ' .seg.modeseg button[aria-pressed="true"]{background:linear-gradient(180deg,#ff8a1f,#ec5300);color:#fff;box-shadow:' + GLOD + '}',
      H + ' .seg .c{display:inline-grid;place-items:center;min-width:20px;height:20px;margin-left:8px;padding:0 6px;border-radius:999px;background:#ff6702;color:#fff;font:700 11px/1 var(--body);letter-spacing:0}',
      H + ' .seg button[aria-pressed="true"] .c{background:#fff;color:#c2410c}',

      // Flýtileiðir = hvítt spjald með flísum.
      H + ' .links{gap:10px;padding:14px 16px;border:0;border-radius:14px;background:#fff;box-shadow:' + SH + '}',
      H + ' .links>.lbl{margin-right:6px;font:600 14px/1 var(--body);letter-spacing:0;text-transform:none;color:#101e43}',
      H + ' .lk{height:34px;gap:8px;padding:0 16px 0 6px;border:0;border-radius:999px;background:#fff;box-shadow:' + RAMMI + ';font:500 13px var(--body);color:#101e43}',
      H + ' .lk:hover{filter:none;background:#f6f9fd}',
      H + ' .lk-ic{width:22px;height:22px;background:#ffeee0;color:#c2410c;box-shadow:inset 0 0 0 1px #f8b98c;font:700 11px/1 var(--body)}',

      // Spjöld (Panel): hvít, skuggi, navy-haus. Í hausnum snúast textalitirnir við; stýringar halda dökku.
      H + ' .panel{border:0;border-radius:14px;background:#fff;box-shadow:' + SH + '}',
      H + ' .phead{min-height:44px;padding:8px 16px;gap:8px 12px;background:linear-gradient(180deg,#012548,#011f40);box-shadow:none;border-bottom:0;border-image:none;border-radius:14px 14px 0 0;color:#fff;--ink:#fff;--ink2:#c9d3e3;--mute:#c9d3e3}',
      H + ' .phead:last-child{border-radius:14px}',
      H + ' .phead .btn,' + H + ' .phead .seg,' + H + ' .phead select,' + H + ' .phead input:not(.chktitill),' + H + ' .phead .tag{--ink:#101e43;--ink2:#2e4064;--mute:#5a6882}',
      H + ' .ptitle{font:600 16px/1.3 var(--body);letter-spacing:0;text-shadow:none;color:#fff}',
      H + ' .plate,' + H + ' .plate.dark{padding:0;border:0;background:none;box-shadow:none;text-shadow:none;color:#c9d3e3;font:600 11px/1 var(--body);letter-spacing:.08em}',
      H + ' .sum{font-family:var(--body);letter-spacing:.02em}',
      H + ' .phead .sum{font:500 12.5px/1.2 var(--body);letter-spacing:0;text-transform:none;color:#c9d3e3}',
      H + ' .phead .lbl{color:#c9d3e3}',
      H + ' .phead select{height:34px;padding:0 10px;border:0;border-radius:8px;background:#fff;box-shadow:' + RAMMI + ';font:500 13px var(--body);color:#101e43}',
      H + ' .phead .btn.iv{box-shadow:none}',
      H + ' .chktitill{color:#fff}',
      H + ' .chktitill:hover{border-color:rgba(255,255,255,.3)}',
      H + ' .chktitill:focus{background:#fff;border-color:#ff6702;color:#101e43}',

      // KPI-spjöld (í hömum með borði).
      H + ' .kpi{border:0;border-image:none;border-radius:14px;background:#fff;box-shadow:' + SH + '}',
      H + ' .kpi.dark{background:#0b2d5f;box-shadow:inset 0 0 0 2px #ff6702,' + SH + '}',

      // Dagskrá: dagar sem ljósir reitir; í dag með appelsínugulum hring; flokkur verks = litapunktur.
      H + ' .week{gap:12px;padding:16px}',
      H + ' .day{padding:10px;border:0;border-radius:10px;background:#fff;box-shadow:' + RAMMI + ';color:#101e43}',
      H + ' .day.today{background:#fff;color:#101e43;box-shadow:inset 0 0 0 2px #ff6702}',
      H + ' .dn,' + H + ' .day:not(.today) .dn{font:600 11px/1.2 var(--body);letter-spacing:.08em;color:#2e4064}',
      H + ' .dd{font:700 18px/1 var(--body)}',
      H + ' .today .dd{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(180deg,#ff8a1f,#ec5300);color:#02193c;font-size:14px}',
      H + ' .dplus,' + H + ' .today .dplus{width:28px;height:28px;border:0;border-radius:8px;background:#fff;box-shadow:' + RAMMI + ';color:#101e43;font:600 16px/1 var(--body)}',
      H + ' .dplus:hover{background:#f6f9fd}',
      H + ' .dnone,' + H + ' .today .dnone{color:#5a6882}',
      // border-left-color flokksins kemur inline úr 368; ramminn hverfur en liturinn lifir og punkturinn erfir hann.
      H + ' .job,' + H + ' .today .job{position:relative;padding:8px 10px 8px 24px;border:0;border-radius:8px;background:#f3f6fb;color:#2e4064;font:12.5px/1.4 var(--body)}',
      H + ' .job::before{content:"";position:absolute;left:10px;top:13px;width:0;height:8px;border-left:8px solid;border-left-color:inherit;border-radius:50%}',
      H + ' .job b,' + H + ' .today .job b{font:600 12.5px/1.4 var(--body);color:#101e43}',
      H + ' .job small{color:#5a6882}',
      H + ' .dnota textarea{min-height:56px;padding:8px 10px;border:0;border-radius:8px;background:#fff;box-shadow:' + RAMMI + ';font:13px/1.45 var(--body);color:#101e43}',
      H + ' .dnota textarea:hover{background:#f6f9fd}',
      H + ' .dnota textarea:focus{' + FOKUS + ';background:#fff}',
      H + ' .dnota textarea::placeholder,' + H + ' .ovbox textarea::placeholder{color:#5a6882;opacity:1}',
      H + ' .legend{gap:6px 18px;padding:0 16px 12px;font-size:12.5px;color:#2e4064}',

      // Þarf að gera í vikunni (500).
      H + ' .ov{padding:0 16px 16px}',
      H + ' .ovh{padding:14px 0 10px;border-top:1px solid #e7ecf3}',
      H + ' .ovh h3{font:600 11px/1.2 var(--body);letter-spacing:.08em;color:#2e4064}',
      H + ' .ovh span{font-size:12.5px;color:#5a6882}',
      H + ' .ovgrid{gap:12px}',
      H + ' .ovbox textarea{min-height:60px;padding:10px 12px;border:0;border-radius:10px;background:#fff;box-shadow:' + RAMMI + ';font:13.5px/1.45 var(--body);color:#101e43}',
      H + ' .ovbox textarea:hover{background:#f6f9fd}',
      H + ' .ovbox textarea:focus{' + FOKUS + ';background:#fff}',
      H + ' .ovst{background:rgba(255,255,255,.9)}',

      // Checklisti.
      H + ' .chkl{gap:8px;padding:14px 16px}',
      H + ' .chk{padding:5px 8px;border-radius:10px}',
      H + ' .chkbox{border:0;border-radius:6px;background:#fff;box-shadow:inset 0 0 0 1.5px #aab4c6;color:#16a34a}',
      H + ' .chk.done .chkbox{background:#16a34a;color:#fff;box-shadow:none}',
      H + ' .chkt{font:13.5px var(--body)}',
      H + ' .chkt:focus{background:#f3f6fb}',
      H + ' .chkny input{padding:9px 12px;border-radius:10px;font:13px var(--body)}',

      // Skipulagsborð.
      H + ' .skwrap{gap:14px;padding:16px}',
      H + ' .skgrid{gap:12px}',
      H + ' .skc{border:0;border-radius:10px;background:#fff;box-shadow:' + RAMMI + ',0 1px 2px rgba(2,25,60,.06)}',
      H + ' .skn{font:600 14.5px var(--body)}',
      H + ' .skt{font:13.5px/1.5 var(--body);color:#2e4064}',
      H + ' .skt:focus{background:#f6f9fd}',
      H + ' .skb{border:0;border-radius:6px;background:#fff;box-shadow:' + RAMMI + ';color:#2e4064}',
      H + ' .skmc{height:22px;padding:0 9px;border-radius:999px;background:#f3f6fb;color:#2e4064;font:600 11.5px/22px var(--body);letter-spacing:0}',
      H + ' .skmb{border:0;border-radius:6px;background:#fff;box-shadow:' + RAMMI + '}',
      H + ' .sknew{border-radius:10px;font:600 13px var(--body)}',
      H + ' .sknew:hover{background:#f6f9fd}',

      // Merki.
      H + ' .tag{border-radius:999px;padding:3px 9px}',
      H + ' .tag.ham{border-color:#f8b98c;color:#c2410c}',
      H + ' .tag.samt{border-color:#f8b98c;color:#c2410c;background:#ffeee0}',
      // Engin emoji í V2 (hönnunarkerfið): ⚙ 🔍 ✎ í tökkunum eru vafin í .t5-emo í 368.
      H + ' .t5-emo{display:none}',

      // ── Það sem hin hamirnir og undirgluggarnir teikna (16.11.2026, „kláraðu þemabreytinguna") ──────────
      // Mælt á borði Anni: hver litur í gull/rjóma-sviði (litblær 36–62°) og Playfair/Plex-letur í öllum hömum.
      // Valið mál, brunnar og dökk spjöld: svart stál → navy.
      H + ' .sel,' + H + ' .vbr-svar{border:0;border-image:none;border-radius:14px;background:#011f40;box-shadow:' + SH + '}',
      H + ' .sel .age.warm{color:#ff8a1f}',
      H + ' .sel .age.hot{color:#ffb4a2}',
      H + ' .well,' + H + ' .saga,' + H + ' .bm,' + H + ' .fskjol{border:1px solid rgba(255,255,255,.12);border-radius:10px;background:#02193c;box-shadow:none}',
      H + ' .well p{color:#e6ecf5}',
      H + ' .fsmynd{border-color:rgba(255,255,255,.12)}',
      H + ' .sacts.sm2{border-top-color:rgba(255,255,255,.14)}',
      H + ' .vbr-mynd{border:0;border-radius:10px;background:#011f40}',
      H + ' .slot.on{background:#0b2d5f;border-color:#0b2d5f}',
      H + ' .nt textarea{border-radius:10px;background:#fff;box-shadow:none}',
      H + ' .nt.dark textarea{border-color:rgba(255,255,255,.16);background:#02193c;color:#fff;box-shadow:none}',
      H + ' .nt.dark textarea:focus,' + H + ' .bm textarea:focus,' + H + ' .bm input:focus{border-color:#ff6702;box-shadow:0 0 0 3px rgba(255,103,2,.35)}',
      H + ' .t5toast{border:0;border-radius:10px;background:#011f40;box-shadow:' + SH + '}',
      H + ' .t5toast .undo{border:0;border-radius:8px;background:' + APP + ';color:#fff}',
      // Hlekkir, flísar og valdar línur.
      H + ' .clink.dk{color:#ff8a1f;text-decoration-color:rgba(255,138,31,.5)}',
      H + ' .hchip.on{background:linear-gradient(180deg,#ff8a1f,#ec5300);border-color:transparent;color:#fff}',
      H + ' .hchip.auto{border-color:rgba(255,138,31,.6);color:#ff8a1f}',
      H + ' .mrow[aria-current="true"],' + H + ' .vbr-item[aria-current="true"]{background:#eef3fb}',
      H + ' .vbr-item[aria-current="true"]{box-shadow:inset 3px 0 0 #ff6702}',
      H + ' .mn:not(.les):hover,' + H + ' .mn:not(.les):focus-visible{background:#f6f9fd}',
      H + ' .vbt-kort{background:#f3f6fb}',
      H + ' .tfbanner{border-color:#f8b98c;border-radius:10px;background:#ffeee0}',
      H + ' .chk.star{background:linear-gradient(90deg,#ffeee0,#fff 40%)}',
      H + ' .skla.skbid{background:#fff;color:#c2410c}',
      H + ' .tb-grip::before{background:#c3ccd9}',
      H + ' .samt-teljari button._gull b{color:#c2410c}',
      // „Velja einingar"-ritillinn (raðhamur).
      H + ' .mbar button{border-radius:6px;background:#fff}',
      H + ' .mbar button:hover{color:#fff}',
      // Tölvupóstar (448) og Erindi (449c): gyllt merki, drög og takkar → appelsínugult V2.
      H + ' .tp .tp-m._beidni,' + H + ' .er .er-m._eyda{border-color:#f8b98c;color:#c2410c;background:#ffeee0}',
      H + ' .tp .btn.tp-gull,' + H + ' .er .er-takkar ._gull{border:0;background:' + APP + ';color:#fff;box-shadow:' + GLOD + '}',
      H + ' .tp .tp-uppk{border-left:0;border-radius:10px;background:#ffeee0;box-shadow:inset 0 0 0 1px #f8b98c}',
      H + ' .tp .tp-uppk b{color:#c2410c}',
      H + ' .tp .tp-skeyti._okkar{background:#f3f6fb;border-color:#d8dee9}',
      H + ' .tp-stj,' + H + ' [style*="d4a017"]{color:#ff6702!important}',
      H + ' .er .er-kassi._svar{background:#ffeee0;border-color:#f8b98c}',
      H + ' .er .er-eydur button{border-color:#d8dee9;border-radius:8px;background:#fff;color:#101e43}',
      // Verkferlis-yfirlit (499) efst: svart stál + Plex → navy + Poppins. Takkinn ber :not()×4 í 499, því !important á letrinu.
      H + ' #yf499{border:0;border-radius:14px;background:#011f40;box-shadow:' + SH + ';font-family:var(--body)}',
      H + ' #yf499 .yf-titill,' + H + ' #yf499 .yf-stada,' + H + ' #yf499 .yf-flokkur,' + H + ' #yf499 .yf-m,' + H + ' #yf499 .yf-t,' + H + ' #yf499 .yf-p{font-family:var(--body)}',
      H + ' #yf499 .yf-keyra:not(#_yA):not(#_yB):not(#_yC):not(#_yD):not(#_yE){font-family:var(--body)!important;border-radius:8px}',
      // Stýringar í dökku spjöldunum (Valið mál, skráning, flýtival): brúnsvart #1c1b18 → navy-700 með hárlínu.
      H + ' .sx,' + H + ' .sg-r,' + H + ' .hchip:not(.on),' + H + ' .setja select,' + H + ' .bm input,' + H + ' .bm textarea,' + H + ' .bm select{border-color:rgba(255,255,255,.18);background:#0b2d5f}',
      H + ' .sx:hover,' + H + ' .sg-r:hover,' + H + ' .hchip:not(.on):hover{background:#123a73}',

      // Rofinn [Boss | V2] í meta-línunni.
      '.t5-thema{vertical-align:middle;margin-left:10px;text-transform:none;letter-spacing:0}',
      H + ' .t5-thema{margin-left:0}',

      // Mjór skjár: grindin í þrjá jafna dálka — leit í heilli línu, takkarnir þrír undir.
      '@container t5 (max-width: 760px){' +
        H + ' .col{grid-template-columns:repeat(3,minmax(0,1fr))}' +
        // „Ég er" í eigin línu neðst í hetjunni, undir meta-línunni — annars hylur það rofann [Boss | V2].
        H + ' .head>div:first-child{padding:24px 16px 104px;min-height:190px}' +
        H + ' .h1{font-size:30px}' +
        H + ' .acts>.who{grid-column:1/-1;justify-self:start;margin:0 0 4px}' +
        H + ' .leit{grid-column:1/-1}' +
        H + ' .acts>.btn{grid-row:3;white-space:normal;height:auto;min-height:40px;padding:6px 10px}' +
        H + ' .acts>.btn:nth-of-type(1){grid-column:1}' +
        H + ' .acts>.btn:nth-of-type(2){grid-column:2}' +
        H + ' .acts>.btn:nth-of-type(3){grid-column:3}' +
        H + ' .col::before{grid-row:2/4}' +
      '}',
      '@media (prefers-reduced-motion: reduce){' + H + ' .btn{transition:none}' + H + ' .btn:active{transform:none}}'
    ].join('\n');
  }

  window.ThbThemaBh2 = { css, stilla, rofi, skipta, thema };
})();
