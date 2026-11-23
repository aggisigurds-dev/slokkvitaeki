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
    host.toggleAttribute('data-agnar-dagskra', nafn === 'Agnar');
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
  /* Tókenar úr hönnunarkerfinu Brunahólf V2 (artifact AkDa6kxwo6S8kzgUgCmUGZ, project/tokens.json, útgáfa 2).
   * Skrifaðir hér með nafni kerfisins svo næsta lota sjái strax hvaðan gildið kemur og reki ekki frá því.
   * Agnar 17.11.2026: „uppfæra designsystemið svo þetta haldist yfir það sem skráð er". */
  const OK_TINT = '#ddfada', OK_INK = '#166534';      // ok-tint / ok-ink
  const WARN_TINT = '#feecd2', WARN_INK = '#9a3412';  // warn-tint / warn-ink
  const BAD_TINT = '#fee2de', BAD_INK = '#b91c1c';    // bad-tint / bad-ink
  const DUE_TINT = '#fde5a4', DUE_INK = '#7a4b00';    // due-tint / due-ink — „í 69 daga"
  const LINE_SOFT = '#e7ecf3', ROW_HOVER = '#f6f9fd'; // line-soft / row-hover
  const INK = '#101e43', INK2 = '#2e4064', MUTED = '#5a6882';
  const LEITARTAKN ="url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235a6882' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='8'/%3E%3Cpath d='m21 21-4.3-4.3'/%3E%3C/svg%3E\")";

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
      H + ' .kicker{color:#fff;font:600 13px/1.2 var(--body);letter-spacing:.18em;margin:0 0 10px}',
      H + ' .kicker::before{display:none}',
      H + ' .h1{font:700 44px/1.1 var(--body);letter-spacing:-.02em;color:#fff;text-shadow:0 2px 12px rgba(2,25,60,.4);margin:0}',
      H + ' .meta{display:flex;align-items:center;flex-wrap:wrap;gap:4px 10px;margin:10px 0 0;font:500 13px/1.4 var(--body);letter-spacing:0;text-transform:none;color:#c9d3e3}',
      H + ' .acts{display:contents}',
      H + ' .acts>.who{grid-row:1;grid-column:2/-1;justify-self:end;align-self:end;margin:0 8px 40px 0;flex-direction:row;align-items:center;gap:10px;position:relative;z-index:2}',
      // Merkið lendir ofan á upplýstri byggingunni í myndinni — dökk undirlögn svo það lesist.
      H + ' .who .lbl{white-space:nowrap;padding:5px 9px;border-radius:6px;background:rgba(2,25,60,.72);color:#fff;font:600 12px/1.2 var(--body);letter-spacing:.08em}',
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
      H + ' .btn.gold.sm{font-size:14px}',
      // Númer einingarinnar á VIRKA flipanum var gullbrúnt (#3e2c06) úr Boss-hamnum — 3,70:1 á appelsínugulu í 11 px.
      H + ' .flipi[aria-selected="true"] .fln{color:#02193c}',
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
      H + ' .seg.sm button{height:26px;padding:0 10px;font-size:13px;border-radius:6px}',
      H + ' .seg.modeseg{flex:1 1 auto;display:flex;background:#fff;border-radius:14px;padding:6px;box-shadow:' + SH + '}',
      H + ' .seg.modeseg button{flex:1 0 auto;height:40px;padding:0 16px;border-radius:10px;font:600 14px var(--body)}',
      H + ' .seg.modeseg button:hover{background:#f6f9fd}',
      H + ' .seg.modeseg button[aria-pressed="true"]{background:linear-gradient(180deg,#ff8a1f,#ec5300);color:#fff;box-shadow:' + GLOD + '}',
      H + ' .seg .c{display:inline-grid;place-items:center;min-width:20px;height:20px;margin-left:8px;padding:0 6px;border-radius:999px;background:#ff6702;color:#02193c;font:700 12px/1 var(--body);letter-spacing:0}',
      H + ' .seg button[aria-pressed="true"] .c{background:#fff;color:#c2410c}',

      // Flýtileiðir = hvítt spjald með flísum.
      H + ' .links{gap:10px;padding:14px 16px;border:0;border-radius:14px;background:#fff;box-shadow:' + SH + '}',
      H + ' .links>.lbl{margin-right:6px;font:600 14px/1 var(--body);letter-spacing:0;text-transform:none;color:#101e43}',
      H + ' .lk{height:34px;gap:8px;padding:0 16px 0 6px;border:0;border-radius:999px;background:#fff;box-shadow:' + RAMMI + ';font:500 13px var(--body);color:#101e43}',
      H + ' .lk:hover{filter:none;background:#f6f9fd}',
      H + ' .lk-ic{width:22px;height:22px;background:#ffeee0;color:#c2410c;box-shadow:inset 0 0 0 1px #f8b98c;font:700 12px/1 var(--body)}',

      // Spjöld (Panel): hvít, skuggi, navy-haus. Í hausnum snúast textalitirnir við; stýringar halda dökku.
      H + ' .panel{border:0;border-radius:14px;background:#fff;box-shadow:' + SH + '}',
      H + ' .phead{min-height:44px;padding:8px 16px;gap:8px 12px;background:linear-gradient(180deg,#012548,#011f40);box-shadow:none;border-bottom:0;border-image:none;border-radius:14px 14px 0 0;color:#fff;--ink:#fff;--ink2:#c9d3e3;--mute:#c9d3e3}',
      H + ' .phead:last-child{border-radius:14px}',
      H + ' .phead .btn,' + H + ' .phead .seg,' + H + ' .phead select,' + H + ' .phead input:not(.chktitill),' + H + ' .phead .tag{--ink:#101e43;--ink2:#2e4064;--mute:#5a6882}',
      H + ' .ptitle{font:600 16px/1.3 var(--body);letter-spacing:0;text-shadow:none;color:#fff}',
      H + ' .plate,' + H + ' .plate.dark{padding:0;border:0;background:none;box-shadow:none;text-shadow:none;color:#c9d3e3;font:600 12px/1 var(--body);letter-spacing:.08em}',
      H + ' .sum{font-family:var(--body);letter-spacing:.02em}',
      H + ' .phead .sum{font:500 13.5px/1.2 var(--body);letter-spacing:0;text-transform:none;color:#c9d3e3}',
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
      H + ' .dn,' + H + ' .day:not(.today) .dn{font:600 12px/1.2 var(--body);letter-spacing:.08em;color:#2e4064}',
      H + ' .dd{font:700 18px/1 var(--body)}',
      H + ' .today .dd{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:linear-gradient(180deg,#ff8a1f,#ec5300);color:#02193c;font-size:14px}',
      H + ' .dplus,' + H + ' .today .dplus{width:28px;height:28px;border:0;border-radius:8px;background:#fff;box-shadow:' + RAMMI + ';color:#101e43;font:600 16px/1 var(--body)}',
      H + ' .dplus:hover{background:#f6f9fd}',
      H + ' .dnone,' + H + ' .today .dnone{color:#5a6882}',
      // border-left-color flokksins kemur inline úr 368; ramminn hverfur en liturinn lifir og punkturinn erfir hann.
      H + ' .job,' + H + ' .today .job{position:relative;padding:8px 10px 8px 24px;border:0;border-radius:8px;background:#f3f6fb;color:#2e4064;font:13.5px/1.4 var(--body)}',
      H + ' .job::before{content:"";position:absolute;left:10px;top:13px;width:0;height:8px;border-left:8px solid;border-left-color:inherit;border-radius:50%}',
      H + ' .job b,' + H + ' .today .job b{font:600 13.5px/1.4 var(--body);color:#101e43}',
      H + ' .job small{color:#5a6882}',
      H + ' .dnota textarea{min-height:56px;padding:8px 10px;border:0;border-radius:8px;background:#fff;box-shadow:' + RAMMI + ';font:13px/1.45 var(--body);color:#101e43}',
      H + ' .dnota textarea:hover{background:#f6f9fd}',
      H + ' .dnota textarea:focus{' + FOKUS + ';background:#fff}',
      H + ' .dnota textarea::placeholder,' + H + ' .ovbox textarea::placeholder{color:#5a6882;opacity:1}',
      H + ' .legend{gap:6px 18px;padding:0 16px 12px;font-size:13.5px;color:#2e4064}',

      // Þarf að gera í vikunni (500).
      H + ' .ov{padding:0 16px 16px}',
      H + ' .ovh{padding:14px 0 10px;border-top:1px solid #e7ecf3}',
      H + ' .ovh h3{font:600 12px/1.2 var(--body);letter-spacing:.08em;color:#2e4064}',
      H + ' .ovh span{font-size:13.5px;color:#5a6882}',
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
      H + ' .skmc{height:22px;padding:0 9px;border-radius:999px;background:#f3f6fb;color:#2e4064;font:600 12.5px/22px var(--body);letter-spacing:0}',
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
      /* 18.11.2026 (Agnar: „eginlega allt of mikið blátt í sama lit, mátt lísa upp textaglugga"). Spjaldið var
       * navy #011f40 og HVER einasti reitur inni í því navy #02193c — tveir litir sem muna 6 í birtu, svo
       * málglugginn las sem einn flötur. Hönnunarkerfið sjálft segir annað: ramminn er navy, efnið situr á
       * ljósum spjöldum. Hér er því rammanum haldið og innihaldinu lyft upp á surface-2 (#f3f6fb) með ink-texta.
       * Birtuhlutfall mælt: ink #101e43 á #f3f6fb = 15,3:1, ink-2 #2e4064 = 8,9:1, orange-ink #c2410c = 4,9:1. */
      H + ' .well,' + H + ' .saga,' + H + ' .bm,' + H + ' .fskjol{border:1px solid #d8dee9;border-radius:10px;background:#f3f6fb;box-shadow:none;color:#101e43}',
      H + ' .well p{color:#101e43}',
      H + ' .well .slabel,' + H + ' .saga .slabel,' + H + ' .bm .slabel,' + H + ' .fskjol .slabel{color:#c2410c}',
      H + ' .saga .sg-l,' + H + ' .fskjol .sg-m,' + H + ' .saga .sg-m,' + H + ' .well .sg-m{color:#2e4064}',
      H + ' .saga .sg-l b{color:#101e43}',
      H + ' .saga .sg-l em.ok{color:#166534}' + H + ' .saga .sg-l em.bid{color:#9a3412}',
      H + ' .saga .sg-buid{color:#166534}',
      H + ' .well .clink.dk,' + H + ' .fskjol .clink.dk{color:#c2410c;text-decoration-color:rgba(194,65,12,.45)}',
      // Takkarnir í hausum ljósu reitanna (↻ Uppfæra, + Bæta við skjölum, ✕, ✎ Skrifa) fylgja fletinum.
      H + ' .saga .sg-r,' + H + ' .fskjol .sg-r,' + H + ' .well .sg-r,' + H + ' .fskjol .sx{border-color:#d8dee9;background:#fff;color:#101e43}',
      H + ' .saga .sg-r:hover,' + H + ' .fskjol .sg-r:hover,' + H + ' .well .sg-r:hover{background:#e9f0fa}',
      H + ' .bm input,' + H + ' .bm textarea,' + H + ' .bm select{border-color:#d8dee9;background:#fff;color:#101e43}',
      H + ' .bm label>span,' + H + ' .bm .bm-c{color:#2e4064}',
      H + ' .fsmynd{border-color:rgba(255,255,255,.12)}',
      H + ' .sacts.sm2{border-top-color:rgba(255,255,255,.14)}',
      H + ' .vbr-mynd{border:0;border-radius:10px;background:#011f40}',
      H + ' .slot.on{background:#0b2d5f;border-color:#0b2d5f}',
      H + ' .nt textarea{border-radius:10px;background:#fff;box-shadow:none}',
      H + ' .nt.dark textarea{border-color:#d8dee9;background:#fff;color:#101e43;box-shadow:none}',
      H + ' .nt.dark .ntst{color:#2e4064}',
      H + ' .nt-tl{background:#fff;box-shadow:inset 0 0 0 1px #e3e9f2}',
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
      H + ' .sx,' + H + ' .sg-r,' + H + ' .hchip:not(.on),' + H + ' .setja select,' + H + ' .bm input,' + H + ' .bm textarea,' + H + ' .bm select{border-color:#d8dee9;background:#fff;color:#101e43}',
      H + ' .sx:hover,' + H + ' .sg-r:hover,' + H + ' .hchip:not(.on):hover{background:#e9f0fa}',
      H + ' .setja .slabel{color:#c9d3e3}',

      /* Tilbúin verk (511) — einingin var eina borðið sem hélt Boss-efninu undir V2: rjómaflötur, messingplötur og
       * gulllykill. Hér fær hún sama mál og hitt borðið (hvít spjöld, navy blek, EINN appelsínugulur lykill).
       * Breyturnar (--gface, --disp, --gline, --key) eru þegar V2 að ofan, svo aðeins hörðu gildin eru leiðrétt. */
      H + ' .baf-f{border:0;border-radius:999px;background:#fff;box-shadow:' + RAMMI + ';font:500 13px var(--body);color:#101e43}',
      H + ' .baf-f b{font-family:var(--body)}',
      H + ' .baf-f[aria-pressed="true"]{background:#0b2d5f;border-color:transparent;color:#fff;box-shadow:none}',
      H + ' .baf-v{border-top-color:#e7ecf3}',
      H + ' .baf-r:hover{background:#f6f9fd}',
      H + ' .baf-v.opid>.baf-r{background:#f3f6fb}',
      H + ' .baf-teg{border-radius:6px;border-color:#d8dee9;font:600 11px var(--body);color:#5a6882}',
      H + ' .baf-kr,' + H + ' .baf-h,' + H + ' .baf-am,' + H + ' .baf-meta,' + H + ' .baf-dl dt,' + H + ' .baf-grein{font-family:var(--body)}',
      H + ' .baf-d{border-top:1px solid #e7ecf3;background:#fff}',
      H + ' .baf-k h3{font:600 12px var(--body);letter-spacing:.08em;color:#5a6882}',
      // Haus opna verksins: Poppins 700 og hvítar flísar með mjúkum skugga — enginn hvítur textaskuggi á ljósum fleti.
      H + ' .baf-kick{font:600 12px var(--body);letter-spacing:.14em;color:#c2410c}',
      H + ' .baf-kick::before{display:none}',
      H + ' .baf-sp{font-weight:700;letter-spacing:-.01em;text-shadow:none}',
      H + ' .baf-kt{border:0;border-radius:10px;background:#fff;box-shadow:' + RAMMI + ',0 1px 2px rgba(2,25,60,.06)}',
      H + ' .baf-kt span{font:600 11.5px var(--body);letter-spacing:.08em}',
      H + ' .baf-kt b{font-weight:700;color:#101e43}',
      H + ' .baf-kt b i{font:500 12px var(--body)}',
      // Merki rakanna og skrefatölurnar: appelsínugult í stað messings, hringlaga tala með hvítu letri.
      H + ' .baf-rok li::before{top:8px;width:5px;height:5px;border:0;border-radius:50%;background:#ff6702}',
      H + ' .baf-nr{border:0;border-radius:999px;background:' + APP + ';color:#fff;font:700 11.5px var(--body);box-shadow:none}',
      H + ' .baf-sk{border-color:#d8dee9;border-radius:10px;background:#fff}',
      H + ' .baf-sk pre,' + H + ' .baf-g,' + H + ' .baf-rok,' + H + ' .baf-skref{font-family:var(--body)}',
      H + ' .baf-ta{border:0;border-radius:10px;background:#fff;box-shadow:' + RAMMI + ';font-family:var(--body)}',
      H + ' .baf-ta:focus-visible{outline:3px solid rgba(255,103,2,.45);outline-offset:0}',
      H + ' .baf-ok{color:#166534}' ,
      H + ' .baf-nei,' + H + ' .baf-stopp,' + H + ' .baf-mk .x{color:#b91c1c}',
      H + ' .baf-msg.villa{border-color:#f5c2c0;background:#fef2f2;color:#b91c1c}',
      H + ' .baf-ft{border-top-color:#e7ecf3}',
      // Einn appelsínugulur lykill á spjaldið; vopnaði takkinn verður navy svo breytingin sjáist.
      H + ' .btn.baf-go{border:0;border-radius:10px;background:' + APP + ';color:#fff;font-weight:600;text-shadow:none;box-shadow:' + GLOD + '}',
      H + ' .btn.baf-go:hover{background:#ec5300}',
      H + ' .btn.baf-go[disabled]{background:#c9d3e3;border:0;color:#fff;box-shadow:none}',
      H + ' .btn.baf-vopn{border:0;background:#0b2d5f;color:#fff;box-shadow:0 0 0 3px rgba(255,103,2,.45)}',
      H + ' .baf-meira{border-top-color:#e7ecf3;font-family:var(--body)}',
      H + ' .baf-meira:hover{background:#f6f9fd}',
      H + ' .baf-tomt{font-family:var(--body)}',
      H + ' .baf-bid{background:linear-gradient(90deg,#eef3fb,#dfe8f5,#eef3fb)}',

      /* Markmið (508) — sama gat og var á Tilbúnum verkum: einingin er á borði Agnars (og hans borð er á V2),
       * en 507 átti enga reglu fyrir `.mmb-*`, svo rjómahover, hlý merki og dökkrauð „versnað“ stóðu eftir
       * inni í navy-borðinu. Letrið fylgdi strax (var(--mono) er Poppins í V2) — hér eru hörðu gildin. */
      H + ' .mmb-fl{border-top-color:#e7ecf3}',
      H + ' .mmb-fl:hover{background:#f6f9fd}',
      H + ' .mmb-fl--bid{background:linear-gradient(90deg,#eef3fb,#dfe8f5,#eef3fb)}',
      H + ' .mmb-ml{background:#f6f9fd;border-top-color:#e7ecf3}',
      H + ' .mmb-m{border-top-color:#e7ecf3}',
      H + ' .mmb-bar{background:#dbe3ee;box-shadow:inset 0 1px 2px rgba(2,25,60,.14)}',
      H + ' .mmb-bar i{background:linear-gradient(90deg,#166534,#1d7a44)}',
      H + ' .mmb-bar--byrjun i{background:#c9d3e3}',
      H + ' .mmb-bar--lagt i{background:linear-gradient(90deg,#991b1b,#b91c1c)}',
      H + ' .mmb-versnad{color:#b91c1c}',
      H + ' .mmb-tr{border-radius:6px;border:1px dashed #c3ccd9;color:#5a6882;font-family:var(--body);letter-spacing:.06em}',
      H + ' .mmb-tr--rett{border:1px solid #bdeab6;color:' + OK_INK + ';background:' + OK_TINT + '}',
      H + ' .mmb-tr--rangt{border:1px solid #f6c9c2;color:' + BAD_INK + ';background:' + BAD_TINT + '}',
      H + ' .mmb-tr--oljost{border:1px solid #f6d3a6;color:' + WARN_INK + ';background:' + WARN_TINT + '}',
      H + ' .mmb-mn--lokid{color:#5a6882}',

      /* Listalínurnar (Forgangsmál 28 og aðrir listar sem nota lrowHtml) á mál hönnunarkerfisins:
       * TaskList-línan er heiti í body-strong með eign/eiganda í small undir, og tíminn hægra megin.
       * Aldurinn „12D" var ber mono-tala; hann verður due-pillan sem kerfið á fyrir tíma („í 69 daga"),
       * og kaflafyrirsagnirnar verða label (11px 600 0.08em). Stöðuorðið sjálft stendur í fyrirsögn
       * kaflans („Þarf að bregðast við" / „Ný skilaboð"), svo liturinn stendur aldrei einn. */
      H + ' .sect{padding:12px 16px 6px;font:600 12px/1.2 var(--body);letter-spacing:.08em;color:' + INK2 + '}',
      H + ' .lrow{padding:12px 16px;border-top-color:' + LINE_SOFT + '}',
      H + ' .lrow:hover{background:' + ROW_HOVER + '}',
      H + ' .lrow b{font:600 14px/1.4 var(--body);color:' + INK + '}',
      H + ' .lrow .s{font:400 13.5px/1.4 var(--body);color:' + MUTED + '}',
      H + ' .pprev{font:400 13.5px/1.45 var(--body);color:' + INK2 + ';margin-top:5px}',
      H + ' .age{display:inline-block;padding:2px 9px;border-radius:999px;font:600 12px/1.3 var(--body);' +
        'letter-spacing:0;background:' + DUE_TINT + ';color:' + DUE_INK + '}',
      H + ' .age.warm{background:' + WARN_TINT + ';color:' + WARN_INK + '}',
      H + ' .age.hot{background:' + BAD_TINT + ';color:' + BAD_INK + '}',
      H + ' .more{padding:10px 16px 14px;font:400 13.5px var(--body);color:' + MUTED + '}',
      H + ' .sectm{font:400 13.5px var(--body);color:' + MUTED + '}',

      /* ── Afgangurinn af borðinu (skannað 17.11.2026) ───────────────────────────────────────────
       * Skönnun á öllum einingum að hörðum Boss-gildum (rjómi, messing, brúnsvart, Playfair) fann
       * fimm staði sem V2-lagið náði ekki yfir. Þeir eru hér, allir á tókena kerfisins. */

      // Kröfu-vinnuglugginn (369, eining 22 „Forgangslisti krafna") — var allur í Boss að innan.
      H + ' .kvbann{border-radius:10px;background:' + WARN_TINT + ';color:' + WARN_INK + '}',
      H + ' .kvrow{border-top-color:' + LINE_SOFT + '}',
      H + ' .kvrow.kvvirk{background:' + ROW_HOVER + '}',
      H + ' .kvt,' + H + ' .kvst{border-radius:999px;font-family:var(--body);letter-spacing:.04em}',
      H + ' .kvst.st-tilbuid_i_vinnslu,' + H + ' .kvst.st-i_vinnslu{border-color:transparent;background:#0b2d5f;color:#fff}',
      H + ' .kvst.st-i_yfirferd_agnars{border-color:#f8b98c;background:#ffeee0;color:#c2410c}',
      H + ' .kvst.st-lokid{border-color:#bdeab6;background:' + OK_TINT + ';color:' + OK_INK + '}',
      H + ' .kv-x{border-color:rgba(255,255,255,.28);background:rgba(255,255,255,.08);border-radius:10px}',
      H + ' .kv-x:hover{background:rgba(255,255,255,.16)}',
      H + ' .kv-upph{color:#ff8a1f}',                         // orange-hi, 7:1 á navy-900
      H + ' .kvt2{color:#c9d3e3}',                            // on-navy-muted í stað gulls
      H + ' .kv-nr{color:#fff}',
      H + ' .kvf{border-radius:999px;font-family:var(--body)}',
      H + ' .kvf.ok{border-color:#bdeab6;background:' + OK_TINT + ';color:' + OK_INK + '}',
      H + ' .kvf.nei{border-color:#f6c9c2;background:' + BAD_TINT + ';color:' + BAD_INK + '}',
      H + ' .kvf.agnar{border-color:#f8b98c;background:#ffeee0;color:#c2410c}',
      H + ' .kvf.vinnsla{border-color:transparent;background:#0b2d5f;color:#fff}',

      // Einkaritarinn (506) og Ráðgjafinn (506-radgjafinn): Playfair-fyrirsögn → h2 kerfisins.
      H + ' .ek-fyrir,' + H + ' .rg-fyrir{font:700 22px/1.25 var(--body);letter-spacing:-.01em;color:' + INK + ';border-bottom-color:' + LINE_SOFT + '}',

      // Tölvupóstar (448): „lokið"-merkið bar Boss-grænt.
      H + ' .tp .tp-m._lokid{border-color:#bdeab6;color:' + OK_INK + '}',
      // Erindi (449c): vinstri rönd erindisins á info-bláa kerfisins.
      H + ' .er .er-kassi._erindi{border-left-color:#2f6fe4}',
      // Vinnusamantekt (489): stjörnuhnappurinn var gullinn.
      H + ' .samt-stj:hover{background:' + ROW_HOVER + ';color:#ff6702}',
      H + ' .samt-stj.on{color:#ff6702}',
      // Frestir/listar: valin lína á sama bláa og .mrow.
      H + ' .frow[aria-current="true"]{background:#eef3fb}',

      // Rofinn [Boss | V2] í meta-línunni.
      '.t5-thema{vertical-align:middle;margin-left:10px;text-transform:none;letter-spacing:0}',
      H + ' .t5-thema{margin-left:0}',

      // Mjór skjár: grindin í þrjá jafna dálka — leit í heilli línu, takkarnir þrír undir.
      /* ── 21.11.2026 — MILLIVEGURINN (Agnar, skjáskot: rautt út, blátt neðst samanbrotið, grænt stendur) ────────
       * Leitarreiturinn og takkarnir þrír eru farnir úr röð 2, svo hvíta spjaldið sem lá undir þeim fer líka
       * (annars stæði autt hvítt spjald á milli hetjunnar og Flýtileiða). */
      H + ' .col::before{display:none}',
      // Hetjan hefur margin-bottom:-36px og lá því 20 px yfir Flýtileiðum þegar hvíta spjaldið fór (rýni 21.11, mælt
      // á 375/1440/1920 px) — smellur á efri hluta flísanna lenti í hetjunni. Flýtileiðir standa nú ofan á henni.
      H + ' .links{position:relative;z-index:2}',
      // Leitarreiturinn birtist nú aðeins við „Finna"/tengingu — hann flæðir á eftir Flýtileiðum með „Veldu fyrirtæki…"-
      // borðanum í stað fastrar raðar 2 (sem setti hann fyrir ofan Flýtileiðir og borðann fyrir neðan).
      H + ' .leit{grid-row:auto;grid-column:1/-1}',
      H + ' .lk-skil{background:#d8dee9}',
      // Dagskráin eftir teikningu Agnars 21.11: „Dagskrá | 21.–27. nóvember", dagar sem spjöld með „+ Bæta við",
      // verk sem ljósblá spjöld með lit tegundar til vinstri, ótímasett sem þriggja dálka rist af línum.
      H + ' .mod[aria-label="Dagskrá"] .phead .plate,' + H + ' .dgsyn .lbl{display:none}',
      H + ' .mod[aria-label="Dagskrá"] .phead .sum{padding-left:14px;border-left:1px solid rgba(255,255,255,.28);font:400 16px/1.2 var(--body);color:#c9d3e3}',
      H + ' .week{gap:8px;padding:12px 12px 10px}',
      H + ' .day{gap:6px;padding:8px 10px 10px}',
      H + ' .day.today{background:#fff1e6;box-shadow:inset 0 0 0 1px #f8b98c}',
      H + ' .day.today .dn{color:#c2410c}',
      H + ' .today .dd{width:26px;height:26px;background:#ff6702;color:#fff;font-size:14px}',
      H + ' .day.mjor:not(.today){background:#f3f6fb}',
      H + ' .dplus,' + H + ' .today .dplus{width:auto;min-width:28px;height:28px;padding:0 4px;border:0;border-radius:8px;background:transparent;box-shadow:none;color:#2f6fe4;font:500 12.5px/1 var(--body);white-space:nowrap}',
      H + ' .dplus:hover{background:#ebf0fe}',
      H + ' .dpt{display:inline}',
      H + ' .day.mjor .dpt{display:none}',
      H + ' .day.mjor .dplus{font-size:16px;font-weight:600}',
      H + ' .job,' + H + ' .today .job{padding:6px 10px;border:0;border-left:3px solid #2f6fe4;border-radius:6px;background:#ebf0fe;color:#101e43;font:13px/1.4 var(--body)}',
      H + ' .job::before{display:none}',
      H + ' .job b,' + H + ' .today .job b{font:700 13.5px/1.4 var(--body);color:#101e43}',
      // Dagnótan heldur sér (ekkert hent), en er án ramma: dagurinn lítur út eins og á teikningunni og smellur í
      // auðan flöt dagsins skrifar nótu. Leiðbeiningin „Skrifaðu hér…" birtist við sveimu eða fókus.
      H + ' .djobs{flex:1}',
      H + ' .dnota{flex:1}',
      H + ' .dnota textarea{min-height:40px;padding:4px 2px;border:0;border-radius:6px;background:transparent;box-shadow:none;resize:none;field-sizing:content}',
      // 23.11.2026 (Agnar, rauð lína undir síðasta verki dagsins): dagur án nótu er EIN lína, ekki 40+ px — spjaldið endar þar
      // sem efnið endar. Vex með textanum (field-sizing) og stækkar í 44 px þegar smellt er í hana. Klasinn `tomt`: 368 dagNotaHtml.
      H + ' .dnota.tomt textarea{min-height:24px;padding:2px 2px}',
      H + ' .dnota.tomt textarea:focus{min-height:44px}',
      H + ' .dnb{width:28px;height:28px;border:0;border-radius:8px;background:transparent;box-shadow:none;color:#5a6882;font:14px/1 var(--body);opacity:.7}',
      H + ' .dnb:hover{background:#ebf0fe;color:#2f6fe4;opacity:1}',
      H + ' .dnota textarea:hover{background:transparent}',
      H + ' .dnota textarea::placeholder{color:transparent}',
      H + ' .day:hover .dnota textarea::placeholder,' + H + ' .dnota textarea:focus::placeholder{color:#5a6882}',
      H + ' .legend{display:none}',
      H + ' .ov{padding:0 12px 12px}',
      H + ' .ovh{padding:4px 4px 8px;border-top:0}',
      H + ' .ovgrid{gap:1px;border:1px solid #e7ecf3;border-radius:10px;overflow:hidden;background:#e7ecf3}',
      H + ' .ovbox{background:#fff}',
      // Stöðumerkið („Vistað kl. …") efst í hægra horni svo það liggi ekki yfir einu textalínunni í 36 px reit.
      H + ' .ovst{top:3px;bottom:auto;right:6px;padding:0 4px;border-radius:4px;font-size:10.5px}',
      // field-sizing: reiturinn vex með textanum (margra lína nótur r1–r4 skerast hvorki né fá skrunstiku).
      H + ' .ovbox textarea{min-height:36px;max-height:240px;padding:8px 12px;border:0;border-radius:0;background:#fff;box-shadow:none;font:14px/1.45 var(--body);resize:none;field-sizing:content}',
      H + ' .ovbox textarea:focus{outline:2px solid #2f6fe4;outline-offset:-2px;box-shadow:none}',
      H + ' .ovbox textarea::placeholder{font-style:italic;color:#5a6882}',
      // ⅓-dálkurinn við Dagskrána og VIP-mál (368, 21.11.2026).
      H + ' .efst-grip::before{background:#d8dee9}',
      H + ' .efst-grip:hover::before,' + H + ' .efst-grip.dregur::before{background:#ff6702}',
      H + ' .efst-hgrip::before{background:#d8dee9}',
      H + ' .efst-hgrip:hover::before,' + H + ' .efst-hgrip.dregur::before{background:#ff6702}',
      H + ' .vipm-h{border-top-color:#e7ecf3}',
      H + ' .ov-ein .ov{padding:12px}',   // eining 34: efri spássía sem V2-reglan .ov tók af
      H + ' .vipm-h b{font:600 14px/1.3 var(--body);color:#101e43}',
      H + ' .vipm-h span{color:#5a6882}',
      // „Annað á borðinu" (368 nedstHtml).
      H + ' .nedst-hd h2{font:700 18px/1.2 var(--body);color:#101e43}',
      H + ' .nedst-hd span{font-size:13px;color:#5a6882}',
      H + ' .nl-h{width:36px;height:36px;margin-top:4px;border:0;border-radius:10px;background:#fff;box-shadow:' + RAMMI + ';color:#101e43}',
      H + ' .nedst-sr{padding:12px 16px;border:0;border-radius:14px;background:#fff;box-shadow:' + SH + '}',
      H + ' .nedst-sr span{color:#5a6882}',

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
