/* === ÞJÓNUSTUBORÐ · BRUNAHÓLF V4 (DÖKKT) v1 (26.11.2026) ===
 *
 * Agnar 26.11.2026 um samþykkta mockupið „Þjónustuborð V4": „Já, smíða V4" · „this is perfect" · „I'd like to keep the
 * building banner". Og um efri hlutann: skarpari, dýpri litir, þrívídd og ljómi.
 * Hönnunarkerfi: „Brunahólf V4 (Dökkt)" — leitt af Yfirsýnarröndinni (523): djúpur navy-grunnur #07152f með blárri
 * glóð, upphleypt glerspjöld (#0f2b52→#081a36 + skuggi með brún), navy-hausar með hástafatitlum, innfelldir brunnar fyrir
 * línur/reiti, ljósdíóður fyrir stöðu, pillur sem hálfgegnsær litur + lituð brún (aldrei fylltar), og EINN aðgerðalitur:
 * appelsínugult gler. Etsaðar línur (svört lína + dauf ljós lína) í stað flatra ramma.
 *
 * HVERNIG: V4 er V2-uppsetningin (507) með dökku skinni. Hýsillinn #view-bord fær data-thema="bh2" EINS OG V2 (hetjan með
 * húsamyndinni, grindin, allt) og AÐ AUKI data-v4. Hér er ekkert nema CSS, og allt undir
 *   :host([data-thema="bh2"][data-v4])
 * svo Boss (ekkert merki) og V2 (aðeins data-thema) breytast ekki um eina línu. 507 kallar css() og bætir aftast í
 * yfirlag sitt; 507 sér líka um rofann [Boss | V2 | V4] og vistunina (thjonustubord5.by_staff.<nafn>.thema = 'v4').
 *
 * ENGUM HNÚT ER HNIKAÐ. „Stjórnborðið" (Flýtileiðir + Merkja og keyra + hamir + einingaflipar) er sett saman sjónrænt:
 * aðliggjandi hlutar, sameiginlegur radíus, ekkert bil, etsaðar línur á milli — hver hluti stendur líka einn ef hinir vantar
 * (t.d. engin „Merkja og keyra"-stika, eða fliparnir faldir í ritham).
 *
 * Tókenar úr hönnunarkerfinu standa hér með nafni (tokens.json V4) svo næsta lota reki ekki frá þeim.
 */
(() => {
  if (window.ThbThemaV4) return;

  const V = ':host([data-thema="bh2"][data-v4])';
  const MYND = '/img/bh2-hetja-bygging.jpg';

  // ── Tókenar (Brunahólf V4 · tokens.json) ────────────────────────────────────────────────────────────────────────
  const PAGE = '#07152f';
  const INK = '#fff', INK2 = '#dbe6f6', MUTED = '#a9b8d0', SOFT = '#b8c6dd', ONNAVY = '#c8d4e8', PENDING = '#8da0c0';
  const OR_INK = '#ffb37a', OK_INK = '#86efac', WARN_INK = '#f8d98d', BAD_INK = '#ffaaa3', INFO_INK = '#a9c5ff';
  const WELL = 'rgba(0,8,22,.45)';
  // shadow-card: efri skábrún + glerbrún + svört hárlína + tvöfaldur fallskuggi
  const SH_CARD = 'inset 0 1px 0 rgba(255,255,255,.30),inset 0 0 0 1px rgba(150,185,235,.26),inset 0 -2px 0 rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.7),0 1px 0 1px rgba(255,255,255,.03),0 26px 40px -18px rgba(0,0,0,1),0 8px 14px -8px rgba(0,0,0,.85)';
  const SH_GLOW = 'inset 0 1px 0 rgba(255,240,220,.85),inset 0 -2px 3px rgba(120,30,0,.45),0 0 0 1px rgba(130,40,0,.85),0 2px 0 rgba(90,25,0,.9),0 12px 24px -8px rgba(255,103,2,1),0 0 18px -4px rgba(255,120,30,.7)';
  const SH_VALID = 'inset 0 0 0 2px #ff8a1f,inset 0 0 18px -6px rgba(255,138,31,.8),0 0 26px -6px rgba(255,103,2,.9)';
  const SH_WELL = 'inset 0 2px 6px rgba(0,0,0,.85),inset 0 0 0 1px rgba(0,0,0,.45),inset 0 -1px 0 rgba(255,255,255,.04),0 1px 0 rgba(255,255,255,.10)';
  const SH_CHIP = 'inset 0 1px 0 rgba(255,255,255,.22),inset 0 0 0 1px rgba(160,190,235,.3),inset 0 -1px 0 rgba(0,0,0,.5),0 0 0 1px rgba(0,0,0,.55),0 2px 0 rgba(0,0,0,.45),0 6px 12px -4px rgba(0,0,0,.7)';
  const SH_CHIP_HOVER = 'inset 0 1px 0 rgba(255,255,255,.26),inset 0 0 0 1px rgba(190,210,245,.55),inset 0 -1px 0 rgba(0,0,0,.5),0 0 0 1px rgba(0,0,0,.55),0 2px 0 rgba(0,0,0,.45),0 6px 12px -4px rgba(0,0,0,.7)';
  const SH_FRAME = '0 -1px 0 rgba(255,170,100,.55),0 -10px 30px -12px rgba(255,103,2,.55),0 0 0 1px rgba(0,0,0,.7),0 40px 70px -30px rgba(0,0,0,1),0 18px 30px -16px rgba(1,10,25,.9)';
  // Glerspjald (V4.1): gljái efst, blá glóð, dýpri halli.
  const GLER = 'linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.02) 22%,rgba(255,255,255,0) 40%),radial-gradient(100% 70% at 50% 0%,rgba(110,160,235,.22),transparent 65%),radial-gradient(90% 80% at 50% 45%,rgba(70,130,210,.20),transparent 70%),linear-gradient(180deg,#11305a 0%,#0b2246 45%,#071833 100%)';
  const GLER_LITID = 'linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,0) 36%),linear-gradient(180deg,#0f2b52,#081a36)';
  const HAUS = 'linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,0) 60%),linear-gradient(180deg,#1d4479,#10305c)';
  const HAUS_SH = 'inset 0 1px 0 rgba(255,255,255,.3),inset 0 -1px 0 rgba(0,0,0,.65),0 1px 0 rgba(255,255,255,.07)';
  const APP = 'linear-gradient(180deg,#ffa756 0%,#ff6702 48%,#e25000 52%,#f06a14 100%)';
  const APP_HOVER = 'linear-gradient(180deg,#ffb56e 0%,#ff7414 48%,#ec5a00 52%,#f57a26 100%)';
  const LYKILL = 'linear-gradient(180deg,rgba(255,255,255,.14) 0%,rgba(255,255,255,.05) 48%,rgba(0,0,0,.08) 52%,rgba(0,8,24,.3) 100%),#0e2850';
  const LYKILL_HOVER = 'linear-gradient(180deg,rgba(255,255,255,.2) 0%,rgba(255,255,255,.08) 48%,rgba(0,0,0,.04) 52%,rgba(0,8,24,.2) 100%),#14335f';
  const SILFUR = 'linear-gradient(180deg,#f4f7fc,#cdd8e8)';
  const ETS_EFST = 'inset 0 1px 0 rgba(0,0,0,.5),inset 0 2px 0 rgba(255,255,255,.05)';   // etsuð lína efst í hlut
  const ETS_NEDST = 'inset 0 -1px 0 rgba(0,0,0,.45),0 1px 0 rgba(255,255,255,.04)';     // etsuð lína neðst í hlut
  const KOMMA = ',';
  // Pillur: hálfgegnsær litur + lituð brún + ljóst blek (aldrei fylltar).
  const pilla = (tint, edge, ink) => 'background:' + tint + ';color:' + ink + ';border:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.12),inset 0 0 0 1px ' + edge + ',0 1px 2px rgba(0,0,0,.6);text-shadow:0 1px 0 rgba(0,0,0,.5)';
  const P_OR = pilla('rgba(255,103,2,.16)', 'rgba(255,138,31,.6)', OR_INK);
  const P_OK = pilla('rgba(22,163,74,.18)', 'rgba(74,222,128,.5)', OK_INK);
  const P_WARN = pilla('rgba(242,193,78,.16)', 'rgba(242,193,78,.55)', WARN_INK);
  const P_BAD = pilla('rgba(220,38,38,.18)', 'rgba(248,113,113,.6)', BAD_INK);
  const P_INFO = pilla('rgba(47,111,228,.2)', 'rgba(91,143,240,.6)', INFO_INK);
  const P_HLUTL = pilla(WELL, 'rgba(160,190,235,.28)', '#cdd9ec');
  // Ljósdíóða: --c ræður litnum.
  const LED = 'display:inline-block;width:8px;height:8px;border-radius:50%;flex:none;background:radial-gradient(circle at 35% 30%,#fff 0 16%,var(--c) 52%,#000 130%);box-shadow:0 0 5px var(--c),0 0 12px var(--c)';
  // Stjórnborðið: hliðarbrúnir + fallskuggi sameiginlegur öllum hlutum; toppur/botn eftir því hvort hlutur tengist öðrum.
  const DK_HLID = 'inset 1px 0 0 rgba(150,185,235,.24),inset -1px 0 0 rgba(150,185,235,.24),0 0 0 1px rgba(0,0,0,.7),0 26px 40px -18px rgba(0,0,0,1),0 8px 14px -8px rgba(0,0,0,.85)';
  const DK_TOPP = 'inset 0 1px 0 rgba(255,255,255,.30),inset 0 2px 0 rgba(150,185,235,.10)';
  const DK_SAUMUR = 'inset 0 1px 0 rgba(0,0,0,.55),inset 0 2px 0 rgba(255,255,255,.06)';
  const DK_BOTN = 'inset 0 -2px 0 rgba(0,0,0,.6)';
  const DK1 = 'linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,0) 70%),#0e2a50';
  const DK2 = '#0c2547', DK3 = '#0b2243', DK4 = '#0a1f3e';
  // Táknmyndir (lucide, sama og mockupið) sem grímur — liturinn er currentColor, ljóminn drop-shadow.
  const svgGrima = d => "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E" + d + "%3C/svg%3E\") center/contain no-repeat";
  const T_DAGATAL = svgGrima("%3Cpath d='M8 2v4M16 2v4'/%3E%3Crect width='18' height='18' x='3' y='4' rx='2'/%3E%3Cpath d='M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01'/%3E");
  const T_LISTI = svgGrima("%3Cpath d='m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8'/%3E");
  const takn = (m, lit) => 'content:"";flex:none;width:16px;height:16px;background:' + (lit || '#ff8a1f') + ';-webkit-mask:' + m + ';mask:' + m + ';filter:drop-shadow(0 0 6px rgba(255,138,31,.7))';

  function css() {
    return [
      // ── Breyturnar: allt sem les var(--…) í 368 og einingunum dökknar sjálft ────────────────────────────────────
      V + '{background:' + PAGE + ';color-scheme:dark;--ink:' + INK + ';--ink2:' + INK2 + ';--mute:' + MUTED + ';--on:' + INK + ';--on2:' + ONNAVY + ';--on3:' + MUTED + ';' +
        '--rule:rgba(160,190,235,.22);--rule2:rgba(255,255,255,.08);--rule3:rgba(160,190,235,.2);--edge:rgba(150,185,235,.28);--edge2:rgba(150,185,235,.4);' +
        '--terra:' + BAD_INK + ';--green:' + OK_INK + ';--gink:' + OR_INK + ';--g5:#ff8a1f;--g6:#ff6702;--g8:' + OR_INK + ';--link:' + OR_INK + ';' +
        '--gline:linear-gradient(90deg,#ff8a1f,#ff6702);--gface:' + APP + ';--gside:' + APP + ';--gcoin:radial-gradient(circle at 35% 30%,#ffb066,#ff6702 60%,#c94400);' +
        '--panel:' + GLER + ';--panelsh:' + SH_CARD + ';--strip:' + HAUS + ';--stripsh:' + HAUS_SH + ';--key:' + LYKILL + ';--keysh:' + SH_CHIP + ';' +
        '--well:' + WELL + ';--wellsh:' + SH_WELL + ';--slab:' + GLER + ';--slabsh:' + SH_CARD + ';--dwell:' + WELL + ';--dwellsh:' + SH_WELL + '}',
      // Grunnurinn byrjar í SAMA lit og hetjan dofnar í (annars sést lína þar sem myndin endar); bláa glóðin liggur neðar.
      V + ' .t5{background:radial-gradient(70% 700px at 50% 1000px,rgba(120,170,240,.08),transparent 70%),radial-gradient(45% 700px at 88% 1200px,rgba(47,111,228,.08),transparent 70%),linear-gradient(180deg,' + PAGE + ' 0%,' + PAGE + ' 45%,#050f24 100%);color:' + INK + ';-webkit-font-smoothing:antialiased}',
      V + ' .t5 :focus-visible{outline:2px solid #ffb066;outline-offset:2px}',
      V + ' select option{background:#0c2347;color:#fff}',
      V + ' ::placeholder{color:' + PENDING + ';opacity:1}',

      // ── Hetjan: húsamyndin heldur sér, dofnar niður í navy-grunninn; appelsínugul og blá glóð, skarpari titill ──────
      V + ' .head>div:first-child{background:' + PAGE + '}',
      V + ' .head>div:first-child::before{background:url(' + MYND + ') right top/cover no-repeat,linear-gradient(180deg,#0d2a5c,' + PAGE + ');filter:saturate(1.18) contrast(1.08) brightness(.9)}',
      V + ' .head>div:first-child::after{background:' +
        'radial-gradient(42% 120% at 86% 58%,rgba(255,120,30,.30),transparent 62%),' +
        'radial-gradient(55% 90% at 60% -12%,rgba(91,143,240,.40),transparent 70%),' +
        'radial-gradient(40% 70% at 0% 0%,rgba(40,90,190,.38),transparent 70%),' +
        'linear-gradient(90deg,' + PAGE + ' 16%,rgba(7,21,47,.62) 44%,rgba(7,21,47,.04) 72%),' +
        'linear-gradient(180deg,rgba(7,21,47,0) 48%,rgba(7,21,47,.72) 80%,' + PAGE + ' 100%)}',
      V + ' .kicker{color:' + INK2 + ';text-shadow:0 0 14px rgba(140,180,255,.5)}',
      V + ' .h1{font-size:46px;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.7),0 0 30px rgba(140,180,255,.35),0 6px 24px rgba(0,0,0,.5)}',
      V + ' .meta{color:' + ONNAVY + '}',
      V + ' .who .lbl{background:rgba(5,15,36,.78);color:' + INK2 + ';box-shadow:inset 0 0 0 1px rgba(160,190,235,.25);font-size:11.5px;letter-spacing:.12em}',
      V + ' .who select{background:rgba(5,15,36,.82);color:#fff;box-shadow:' + SH_WELL + ',inset 0 0 0 1px rgba(160,190,235,.22)}',

      // ── Takkar: glerlyklar; EINN appelsínugulur á svæði ───────────────────────────────────────────────────────────
      V + ' .btn.iv{background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + ';text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      V + ' .btn.iv:hover{background:' + LYKILL_HOVER + ';color:#fff;box-shadow:' + SH_CHIP_HOVER + '}',
      V + ' .btn.gold,' + V + ' .acts>.btn:nth-of-type(3),' + V + ' .btn.baf-go,' + V + ' .tp .btn.tp-gull,' + V + ' .er .er-takkar ._gull{background:' + APP + ';color:#fff;text-shadow:0 1px 0 rgba(120,35,0,.6);box-shadow:' + SH_GLOW + '}',
      V + ' .btn.gold:hover,' + V + ' .acts>.btn:nth-of-type(3):hover,' + V + ' .btn.baf-go:hover{background:' + APP_HOVER + '}',
      V + ' .btn[aria-pressed="true"]{background:' + SILFUR + ';color:#0b1f40;text-shadow:none;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(0,0,0,.5)}',
      V + ' .btn[disabled]{filter:saturate(.6) brightness(.85)}',
      V + ' .phead .btn,' + V + ' .phead .seg,' + V + ' .phead select,' + V + ' .phead input:not(.chktitill),' + V + ' .phead .tag{--ink:' + INK + ';--ink2:' + INK2 + ';--mute:' + MUTED + '}',
      V + ' .phead .btn.iv{box-shadow:' + SH_CHIP + '}',
      // Tenglarnir efst t.h. í hetjunni (Nýi vefurinn, Þjónustugátt): reykgler ofan á myndinni.
      V + ' .t5-hl .btn,' + V + ' .head>div:first-child>a.btn{background:rgba(5,15,36,.55);color:#fff;box-shadow:' + SH_CHIP + ';backdrop-filter:blur(4px)}',
      V + ' .t5-hl .btn:hover,' + V + ' .head>div:first-child>a.btn:hover{background:rgba(20,51,95,.75);box-shadow:' + SH_CHIP_HOVER + '}',
      // Takkahópar: samliggjandi glerlyklar deila radíus, etsuð lína á milli (Flýtileiðir, hamir, hausar).
      V + ' :is(.links,.modes,.phead,.vs-h,.ek-h,.rg-h,.t5-agentanet,.vip-takkar)>.btn.iv:has(+ .btn.iv){border-top-right-radius:0;border-bottom-right-radius:0}',
      V + ' :is(.links,.modes,.phead,.vs-h,.ek-h,.rg-h,.t5-agentanet,.vip-takkar)>.btn.iv+.btn.iv{margin-left:calc(-1 * var(--hb,8px));border-top-left-radius:0;border-bottom-left-radius:0;box-shadow:inset 1px 0 0 rgba(0,0,0,.55),inset 2px 0 0 rgba(255,255,255,.06),' + SH_CHIP + '}',

      // ── Rofar (Segmented): innfelld rauf, valinn = silfur ─────────────────────────────────────────────────────────
      V + ' .seg{background:rgba(0,6,18,.55);box-shadow:inset 0 1px 3px rgba(0,0,0,.7),inset 0 0 0 1px rgba(160,190,235,.22);border-radius:12px;padding:3px;gap:3px}',
      V + ' .seg button{color:' + ONNAVY + ';font-weight:600}',
      V + ' .seg button:hover{color:#fff;background:rgba(255,255,255,.07)}',
      V + ' .seg button[aria-pressed="true"]{background:' + SILFUR + ';color:#0b1f40;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(0,0,0,.5)}',
      V + ' .seg .c{background:radial-gradient(circle at 35% 30%,#ffb066,#ff6702 60%,#c94400);color:#fff;box-shadow:0 0 8px rgba(255,103,2,.7),inset 0 1px 0 rgba(255,235,210,.6);text-shadow:0 1px 0 rgba(110,30,0,.6)}',
      V + ' .seg button[aria-pressed="true"] .c{background:#0b1f40;color:#ffb37a;box-shadow:none;text-shadow:none}',
      V + ' .t5-thema{box-shadow:inset 0 1px 3px rgba(0,0,0,.8),inset 0 0 0 1px rgba(160,190,235,.3),0 0 18px -6px rgba(91,143,240,.5)}',

      // ── Leit ─────────────────────────────────────────────────────────────────────────────────────────────────────
      V + ' .leit input{background-color:' + WELL + ';color:#fff;box-shadow:' + SH_WELL + ',inset 0 0 0 1px rgba(160,190,235,.16)}',
      V + ' .leit input:focus{outline:2px solid #ffb066;outline-offset:2px;box-shadow:' + SH_WELL + ',inset 0 0 0 1px #ff8a1f}',

      // ── STJÓRNBORÐIÐ: Flýtileiðir · Merkja og keyra · hamir · einingaflipar = eitt spjald ─────────────────────────
      // Hver hluti er sjálfstætt spjald (radíus 15, toppur + botn). Liggi hann að öðrum hluta fer bilið (−16 px = row-gap
      // grindarinnar .col), radíusinn á samskeytunum og samskeytin verða etsuð lína.
      V + ' .links,' + V + ' .mk-bar,' + V + ' .modes{border:0;border-radius:15px;box-shadow:' + DK_TOPP + KOMMA + DK_BOTN + KOMMA + DK_HLID + '}',
      V + ' .links{background:' + DK1 + '}',
      V + ' .mk-bar{background:' + DK2 + '}',
      V + ' .modes{background:' + DK3 + ';padding:8px 10px}',
      // Flýtileiðir: ein lína. Flísarnar eru þéttar; komist þær ekki fyrir skrunar línan lárétt og hópurinn
      // „Mitt vinnuborð + Nýtt mál" stendur kyrr við hægri brúnina (sticky) svo aðgerðin sé alltaf sýnileg.
      V + ' .links{--hb:6px;flex-wrap:nowrap;gap:6px;padding:10px 14px 10px 16px;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;scrollbar-color:rgba(160,190,235,.22) transparent;overscroll-behavior-x:contain}',
      V + ' .links>*{flex:none}',
      V + ' .links>.grow{flex:1 0 0}',
      V + ' .links>.lbl{margin-right:6px;font:600 12px/1 var(--body);letter-spacing:.09em;text-transform:uppercase;color:#eef3fb;white-space:nowrap}',
      V + ' .lkw{gap:2px}',
      V + ' .lk{height:28px;gap:5px;padding:0 10px 0 3px;border:0;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(0,8,24,.38));box-shadow:' + SH_CHIP + ';font:500 12px/1 var(--body);color:#e6edf8;text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      V + ' .lk:hover{filter:none;background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(0,8,24,.28));color:#fff;box-shadow:' + SH_CHIP_HOVER + '}',
      V + ' .lk-ic{width:20px;height:20px;background:rgba(255,103,2,.16);color:' + OR_INK + ';box-shadow:inset 0 0 0 1px rgba(255,138,31,.6),0 0 10px -2px rgba(255,120,30,.6);font:700 10.5px/1 var(--body);text-shadow:none}',
      V + ' .lk-x{background:' + WELL + ';border:0;color:' + BAD_INK + ';box-shadow:inset 0 0 0 1px rgba(248,113,113,.5)}',
      V + ' .lk-m{font:600 11.5px/1 var(--body);letter-spacing:.04em;text-transform:none;color:' + MUTED + ';white-space:nowrap;padding:0 4px}',
      V + ' .lk-tomt{color:' + MUTED + '}',
      V + ' .links .btn.sm,' + V + ' .links .btn{height:30px;padding:0 12px;font-size:12.5px;border-radius:10px}',
      V + ' .lk-akt{flex-wrap:nowrap;gap:8px;position:sticky;right:-14px;z-index:1;margin-right:-14px;padding:0 14px 0 10px;background:#0e2a4f;box-shadow:-14px 0 12px -8px #0e2a4f}',
      V + ' .lk-skil{width:1px;height:24px;background:rgba(255,255,255,.12);box-shadow:-1px 0 0 rgba(0,0,0,.6)}',
      // Merkja og keyra (519): stöðuröð í stjórnborðinu.
      V + ' .mk-bar{margin:0;padding:8px 16px;gap:6px 16px;font-size:13px;color:' + ONNAVY + '}',
      V + ' .mk-bar .mk-t b{font:700 15px/1 var(--body);color:#fff}',
      V + ' .mk-bar .mk-t.vs b{color:' + BAD_INK + '}' + V + ' .mk-bar .mk-t.ok b{color:' + OK_INK + '}' + V + ' .mk-bar .mk-t.ik b{color:' + INFO_INK + '}',
      V + ' .mk-led{--c:#9fb0cc;' + LED + ';width:10px;height:10px;box-shadow:0 0 3px rgba(159,176,204,.6)}',
      V + ' .mk-led[data-l="keyrir"]{--c:#5b8ff0;box-shadow:0 0 5px var(--c),0 0 12px var(--c)}',
      V + ' .mk-led[data-l="buin"]{--c:#22c55e;box-shadow:0 0 5px var(--c),0 0 12px var(--c)}',
      V + ' .mk-led[data-l="buin_vs"]{--c:#f2c14e;box-shadow:0 0 5px var(--c),0 0 12px var(--c)}',
      V + ' .mk-run{height:32px;padding:0 14px;border:0;border-radius:10px;background:' + APP + ';color:#fff;font:600 13px/1 var(--body);text-shadow:0 1px 0 rgba(120,35,0,.6);box-shadow:' + SH_GLOW + '}',
      V + ' .mk-run[disabled]{opacity:1;background:' + LYKILL + ';color:' + MUTED + ';box-shadow:' + SH_CHIP + '}',
      V + ' .mk-lst li{background:rgba(220,38,38,.14);color:' + BAD_INK + ';box-shadow:inset 0 0 0 1px rgba(248,113,113,.35)}',
      V + ' .mk-lst li.ok{background:rgba(22,163,74,.14);color:' + OK_INK + ';box-shadow:inset 0 0 0 1px rgba(74,222,128,.35)}',
      V + ' .mk-lst li b{color:#fff}',
      // Merkið á línunni og hraðvalsglugginn (519).
      V + ' .mk-m{box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:3px;min-width:26px;height:22px;padding:0 5px;margin:-3px 6px -3px -2px;border:0;border-radius:11px;background:transparent;box-shadow:inset 0 0 0 1px rgba(160,190,235,.28);font:600 11px/1 var(--body);color:' + MUTED + ';cursor:pointer;vertical-align:middle;appearance:none}',
      V + ' .mk-m:hover,' + V + ' .mk-m:focus-visible{border-color:rgba(160,190,235,.35);background:' + WELL + ';color:#fff}',
      V + ' .mk-m[data-s="merkt"],' + V + ' .mk-m[data-s="snooze_buid"]{' + P_OR + '}',
      V + ' .mk-m[data-s="i_keyrslu"]{' + P_INFO + '}',
      V + ' .mk-m[data-s="klarad"]{' + P_OK + '}',
      V + ' .mk-m[data-s="vantar_svar"]{' + P_BAD + '}',
      V + ' .mk-m[data-s="blundar"]{' + P_HLUTL + '}',
      // Hraðvalsglugginn: útlitið hér líka, því mk519-css er aðeins í skuggarótinni þegar stikan sjálf er teiknuð.
      V + ' .mk-g{margin:6px 0 2px;padding:8px;max-width:520px;border:0;border-radius:12px;background:' + GLER_LITID + ';box-shadow:' + SH_CARD + '}',
      V + ' .mk-gr{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}',
      V + ' .mk-h{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-height:44px;padding:4px 2px;font:500 12px/1.15 var(--body);text-align:center;cursor:pointer}',
      V + ' .mk-r .mk-h{flex:0 0 auto;min-height:34px;padding:4px 10px;flex-direction:row}',
      V + ' .mk-x,' + V + ' .mk-sed{appearance:none;border:0;background:none;box-shadow:none;padding:4px 6px;font:500 12px var(--body);color:' + INK2 + ';text-decoration:underline;cursor:pointer}',
      V + ' .mk-h{border:0;border-radius:8px;background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + '}',
      V + ' .mk-h[aria-pressed="true"]{background:' + APP + ';color:#fff;box-shadow:' + SH_GLOW + '}',
      V + ' .mk-h[data-v="veit_ekki"],' + V + ' .mk-h[data-v="rannsaka"]{box-shadow:inset 0 0 0 1px rgba(255,138,31,.6),' + SH_CHIP + '}',
      V + ' .mk-r{color:' + INK2 + '}',
      V + ' .mk-r input[type=date],' + V + ' .mk-g textarea{border:0;background:' + WELL + ';color:#fff;box-shadow:' + SH_WELL + '}',
      V + ' .mk-ni{background:' + WELL + ';color:' + INK2 + ';box-shadow:' + SH_WELL + '}',
      V + ' .mk-ni.vs{background:rgba(220,38,38,.14);color:' + BAD_INK + '}' + V + ' .mk-ni.ok{background:rgba(22,163,74,.14);color:' + OK_INK + '}',
      // Hamir: fliparnir sitja beint á stjórnborðinu; virkur = appelsínugult gler.
      V + ' .modes{--hb:8px;gap:8px}',
      V + ' .seg.modeseg{flex:1 1 auto;background:none;box-shadow:none;border-radius:0;padding:0;gap:4px}',
      V + ' .seg.modeseg button{flex:0 1 auto;height:36px;padding:0 12px;border:0;border-radius:10px;background:none;font:600 13.5px var(--body);color:#e6edf8;text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      V + ' .seg.modeseg button:hover{background:rgba(255,255,255,.07);color:#fff}',
      V + ' .seg.modeseg button[aria-pressed="true"]{background:' + APP + ';color:#fff;text-shadow:0 1px 0 rgba(110,30,0,.7);box-shadow:' + SH_GLOW + '}',
      V + ' .seg.modeseg button[aria-pressed="true"] .c{background:rgba(255,255,255,.92);color:#b23c00}',
      V + ' .modes>.btn.sm{height:32px;font-size:12.5px;border-radius:10px}',
      // Einingaflipar (368 .flipar): neðsti hluti stjórnborðsins.
      V + ' .flipar{gap:8px;margin:0 0 18px;padding:12px 14px;border-radius:15px;background:' + DK4 + ';box-shadow:' + DK_TOPP + KOMMA + DK_BOTN + KOMMA + DK_HLID + '}',
      V + ' .flipi{height:40px;gap:9px;padding:0 14px;border:0;border-radius:11px;background:' + LYKILL + ';box-shadow:' + SH_CHIP + ';font:600 14px/1 var(--body);color:#e6edf8;text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      V + ' .flipi:hover{filter:none;background:' + LYKILL_HOVER + ';color:#fff;box-shadow:' + SH_CHIP_HOVER + '}',
      V + ' .flipi .fln{font:600 11.5px/1 var(--body);letter-spacing:.06em;color:' + MUTED + ';text-shadow:none}',
      V + ' .flipi[aria-selected="true"]{background:' + APP + ';color:#fff;text-shadow:0 1px 0 rgba(110,30,0,.7);box-shadow:' + SH_GLOW + '}',
      V + ' .flipi[aria-selected="true"] .fln,' + V + ' .flipi[aria-selected="true"] .flx,' + V + ' .flipi[aria-selected="true"] .flp{color:rgba(255,255,255,.92)}',
      V + ' .flipi .flp,' + V + ' .flipi .flx{color:' + ONNAVY + '}',
      V + ' .flipi .flp:hover,' + V + ' .flipi .flx:hover{background:rgba(255,255,255,.12);color:#fff}',
      // Samskeytin. 519 skrifar <style id="mk519-css"> rétt á undan stikunni, svo „næsti hlutur" getur verið style-merki
      // (display:none, ekki reitur í grindinni) — þess vegna bæði `+ .mk-bar` og `+ style + .mk-bar`.
      V + ' .links:is(:has(+ .mk-bar),:has(+ style + .mk-bar),:has(+ .modes),:has(+ style + .modes)){border-bottom-left-radius:0;border-bottom-right-radius:0;box-shadow:' + DK_TOPP + KOMMA + DK_HLID + '}',
      V + ' :is(.links+.mk-bar,.links+style+.mk-bar){margin-top:-16px;border-top-left-radius:0;border-top-right-radius:0;box-shadow:' + DK_SAUMUR + KOMMA + DK_BOTN + KOMMA + DK_HLID + '}',
      V + ' .mk-bar:is(:has(+ .modes),:has(+ style + .modes)){border-bottom-left-radius:0;border-bottom-right-radius:0;box-shadow:' + DK_TOPP + KOMMA + DK_HLID + '}',
      V + ' :is(.links+.mk-bar,.links+style+.mk-bar):is(:has(+ .modes),:has(+ style + .modes)){box-shadow:' + DK_SAUMUR + KOMMA + DK_HLID + '}',
      V + ' :is(.links+.modes,.links+style+.modes,.mk-bar+.modes,.mk-bar+style+.modes){margin-top:-16px;border-top-left-radius:0;border-top-right-radius:0;box-shadow:' + DK_SAUMUR + KOMMA + DK_BOTN + KOMMA + DK_HLID + '}',
      V + ' .modes:has(+ .layout>.efst>.flipar:first-child:not([hidden])){border-bottom-left-radius:0;border-bottom-right-radius:0;box-shadow:' + DK_TOPP + KOMMA + DK_HLID + '}',
      V + ' :is(.links+.modes,.links+style+.modes,.mk-bar+.modes,.mk-bar+style+.modes):has(+ .layout>.efst>.flipar:first-child:not([hidden])){box-shadow:' + DK_SAUMUR + KOMMA + DK_HLID + '}',
      V + ' .modes+.layout>.efst>.flipar:first-child{margin-top:-16px;border-top-left-radius:0;border-top-right-radius:0;box-shadow:' + DK_SAUMUR + KOMMA + DK_BOTN + KOMMA + DK_HLID + '}',

      // ── Spjöld: upphleypt gler, navy-haus með hástafatitli og glóandi tákni ────────────────────────────────────────
      V + ' .panel{border:0;border-radius:15px;background:' + GLER + ';box-shadow:' + SH_CARD + ';color:' + INK + '}',
      V + ' .phead{--hb:12px;min-height:44px;padding:8px 14px 8px 16px;gap:8px 12px;background:' + HAUS + ';box-shadow:' + HAUS_SH + ';border:0;border-image:none;border-radius:15px 15px 0 0;color:#fff;--ink:#fff;--ink2:' + INK2 + ';--mute:' + MUTED + '}',
      V + ' .phead:last-child,' + V + ' .mod:not(.open):not(.alltaf) .phead{border-radius:15px}',
      V + ' .ptitle{display:flex;align-items:center;gap:8px;font:700 12.5px/1.2 var(--body);letter-spacing:.09em;text-transform:uppercase;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.7)}',
      V + ' .plate,' + V + ' .plate.dark{order:0;font:600 11.5px/1 var(--body);letter-spacing:.04em;color:' + MUTED + ';text-shadow:none}',
      V + ' .phead .sum{padding-left:14px;border:0;box-shadow:-1px 0 0 rgba(0,0,0,.6),-2px 0 0 rgba(255,255,255,.12);font:400 13.5px/1.2 var(--body);letter-spacing:0;text-transform:none;color:' + ONNAVY + '}',
      V + ' .mod[aria-label="Dagskrá"] .phead .sum{border-left:0;font:400 13.5px/1.2 var(--body);color:' + ONNAVY + '}',
      V + ' .mod[aria-label="Dagskrá"] .ptitle::before{' + takn(T_DAGATAL) + '}',
      V + ' .phead .lbl{color:' + MUTED + '}',
      V + ' .phead select,' + V + ' .dgsyn select{height:32px;border:0;border-radius:10px;background:' + WELL + ';color:#fff;box-shadow:' + SH_WELL + ',inset 0 0 0 1px rgba(160,190,235,.16);font:500 13px var(--body)}',
      V + ' .chktitill{color:#fff;font:700 12.5px/1.2 var(--body);letter-spacing:.09em;text-transform:uppercase}',
      V + ' .chktitill:hover{border-color:rgba(255,255,255,.3)}',
      V + ' .chktitill:focus{background:' + WELL + ';border-color:#ff8a1f;color:#fff;text-transform:none;letter-spacing:0}',
      V + ' .sum{color:' + MUTED + '}',
      V + ' .lbl{color:' + MUTED + '}',
      V + ' .sect{color:' + INK2 + '}',
      V + ' .sectm,' + V + ' .more{color:' + MUTED + '}',

      // KPI-spjöld.
      V + ' .kpi{border:0;border-image:none;border-radius:14px;background:' + GLER_LITID + ';box-shadow:' + SH_CARD + ';color:#fff}',
      V + ' .kpi.dark{background:' + GLER + ';box-shadow:' + SH_CARD + KOMMA + SH_VALID + '}',

      // ── Dagskrá: dagar eru brunnar; í dag = appelsínugul brún + innri glóð ───────────────────────────────────────
      V + ' .week{gap:8px;padding:12px}',
      V + ' .day{min-height:150px;padding:10px;border:0;border-radius:12px;color:' + INK2 + ';background:linear-gradient(180deg,rgba(0,4,14,.6),rgba(0,10,28,.35) 40%,rgba(14,40,80,.35));box-shadow:inset 0 2px 8px rgba(0,0,0,.85),inset 0 0 0 1px rgba(0,0,0,.5),inset 0 -1px 0 rgba(255,255,255,.05),0 1px 0 rgba(255,255,255,.10)}',
      V + ' .day.mjor:not(.today){background:linear-gradient(180deg,rgba(0,4,14,.7),rgba(0,8,22,.5))}',
      V + ' .day.today{background:radial-gradient(120% 70% at 50% 0%,rgba(255,103,2,.22),transparent 65%),linear-gradient(180deg,rgba(0,4,14,.6),rgba(30,20,20,.35));box-shadow:inset 0 0 0 1.5px #ff8a1f,inset 0 0 22px -6px rgba(255,120,30,.7),0 0 22px -6px rgba(255,103,2,.8),0 1px 0 rgba(255,255,255,.1)}',
      V + ' .dn,' + V + ' .day:not(.today) .dn,' + V + ' .day.today .dn{font:600 11.5px/1 var(--body);letter-spacing:.08em;text-transform:uppercase;color:' + MUTED + '}',
      V + ' .dd{color:#fff}',
      V + ' .today .dd{background:radial-gradient(circle at 35% 30%,#ffb066,#ff6702 60%,#c94400);color:#fff;box-shadow:0 0 10px rgba(255,103,2,.8);text-shadow:0 1px 0 rgba(110,30,0,.6)}',
      V + ' .dplus,' + V + ' .today .dplus{background:transparent;box-shadow:none;color:' + OR_INK + ';font:600 11.5px/1 var(--body)}',
      V + ' .dplus:hover{background:rgba(255,255,255,.07);color:#fff}',
      V + ' .dnone,' + V + ' .today .dnone{color:' + PENDING + '}',
      // Verk: blátt gler; litur tegundar (inline border-left-color úr 368) lifir.
      V + ' .job,' + V + ' .today .job{border-radius:8px;background:linear-gradient(180deg,rgba(91,143,240,.30),rgba(47,111,228,.14));color:' + INK2 + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 0 0 1px rgba(0,0,0,.5),0 4px 10px -4px rgba(0,0,0,.8)}',
      V + ' .job b,' + V + ' .today .job b{color:#fff}',
      V + ' .job small{color:' + SOFT + '}',
      V + ' .dnota textarea{color:' + INK2 + ';background:transparent}',
      V + ' .dnota textarea:focus{background:' + WELL + ';outline:2px solid #ffb066;outline-offset:0;box-shadow:none}',
      V + ' .day:hover .dnota textarea::placeholder,' + V + ' .dnota textarea:focus::placeholder{color:' + PENDING + '}',
      V + ' .legend{color:' + INK2 + '}',
      // „Í vikunni, ótímasett" (500): minnismiðar sem brunnar með litaðri brún til vinstri.
      V + ' .ov{padding:0 12px 14px}',
      V + ' .ovh h3{font:600 13px/1 var(--body);letter-spacing:0;text-transform:none;color:#fff}',
      V + ' .ovh span{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:999px;font:600 12px/1 var(--body);' + P_OR + '}',
      V + ' .ovgrid{gap:8px;border:0;border-radius:0;background:none;overflow:visible}',
      V + ' .ovbox{border:0;border-radius:10px;background:' + WELL + ';box-shadow:inset 3px 0 0 var(--ov-accent,#5b8ff0),-3px 0 12px -5px var(--ov-accent,#5b8ff0),' + SH_WELL + '}',
      V + ' .ovbox textarea{background:transparent;color:#dfe6f2;font:13px/1.45 var(--body)}',
      // 500 („Í vikunni, ótímasett“) á borði Agnars: 500 málar ljóst undir :host([data-agnar-dagskra]) .mod[aria-label="Dagskrá"]
      // (sértækni 0,5,0) — hér sama hali undir V (0,6,0). Litaröndin (--ov-accent úr 500) heldur sér og fær ljóma.
      V + ' .mod[aria-label="Dagskrá"] .ov{margin:0 12px 14px;padding:0;border:0;border-radius:0;background:none}',
      V + ' .mod[aria-label="Dagskrá"] .ovh{padding:8px 4px 10px}',
      V + ' .mod[aria-label="Dagskrá"] .ovh h3{font:600 13px/1 var(--body);color:#fff}',
      V + ' .mod[aria-label="Dagskrá"] .ovh span{display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:999px;font:600 12px/1 var(--body);' + P_OR + '}',
      V + ' .mod[aria-label="Dagskrá"] .ovbox{border:0;border-radius:10px;background:' + WELL + ';box-shadow:-3px 0 12px -6px var(--ov-accent,#5b8ff0),' + SH_WELL + '}',
      V + ' .mod[aria-label="Dagskrá"] .ovbox::before{box-shadow:0 0 8px var(--ov-accent,#5b8ff0)}',
      V + ' .mod[aria-label="Dagskrá"] .ovbox:has(textarea:placeholder-shown)::before{background:rgba(160,190,235,.28);box-shadow:none}',
      V + ' .mod[aria-label="Dagskrá"] .ovbox:has(.ovcheck:checked){background:radial-gradient(60% 100% at 0% 50%,rgba(34,197,94,.14),transparent 70%),' + WELL + '}',
      V + ' .mod[aria-label="Dagskrá"] .ovbox textarea{background:transparent;color:#dfe6f2}',
      V + ' .mod[aria-label="Dagskrá"] .ovbox textarea:focus{outline:2px solid #ffb066;outline-offset:-2px;background:rgba(0,6,18,.5)}',
      V + ' .mod[aria-label="Dagskrá"] .ovbox:has(.ovcheck:disabled) textarea:placeholder-shown{color:' + PENDING + '}',
      V + ' .mod[aria-label="Dagskrá"] .ovcheck{accent-color:#22c55e}',
      V + ' .mod[aria-label="Dagskrá"] .ovcheck:checked+textarea{color:' + OK_INK + '}',
      V + ' .mod[aria-label="Dagskrá"] .ovcompany{border:0;border-radius:6px;background:' + LYKILL + ';color:#cdd9ec;box-shadow:' + SH_CHIP + '}',
      V + ' .mod[aria-label="Dagskrá"] .ovcompany:hover{background:' + LYKILL_HOVER + ';color:#fff}',
      V + ' .mod[aria-label="Dagskrá"] .ovcompany[data-linked]{' + P_OK + '}',
      V + ' .ov-company-picker{border:0;background:' + GLER_LITID + ';color:#fff;box-shadow:' + SH_CARD + '}',
      V + ' .ov-company-picker input,' + V + ' .ov-company-picker button{border:0;background:' + WELL + ';color:#fff;box-shadow:' + SH_WELL + ',inset 0 0 0 1px rgba(160,190,235,.2)}',
      V + ' .ov-company-picker button:hover{background:rgba(255,255,255,.08)}',
      V + ' .ovbox textarea:focus{outline:2px solid #ffb066;outline-offset:-2px}',
      V + ' .ovbox textarea::placeholder{color:' + PENDING + '}',
      V + ' .ovst{background:rgba(5,15,36,.88);color:' + MUTED + '}',
      V + ' .efst-grip::before,' + V + ' .efst-hgrip::before,' + V + ' .tb-grip::before{background:rgba(160,190,235,.28)}',
      V + ' .efst-grip:hover::before,' + V + ' .efst-grip.dregur::before,' + V + ' .efst-hgrip:hover::before,' + V + ' .efst-hgrip.dregur::before{background:#ff8a1f;box-shadow:0 0 8px rgba(255,138,31,.8)}',

      // ── Checklisti: hver lína er brunnur; stjörnumerktar fá litaða brún ────────────────────────────────────────────
      V + ' .chkl{gap:6px;padding:12px}',
      V + ' .chk{min-height:38px;padding:3px 10px;border:0;border-radius:10px;background:' + WELL + ';box-shadow:' + SH_WELL + ';color:#e6edf8}',
      V + ' .chk.star,' + V + ' .chk.star.st-gull{background:radial-gradient(60% 100% at 0% 50%,rgba(255,103,2,.14),transparent 70%),' + WELL + ';box-shadow:inset 0 0 0 1px rgba(255,138,31,.75),0 0 14px -6px rgba(255,103,2,.8),' + SH_WELL + '}',
      V + ' .chk.star.st-raud{background:radial-gradient(60% 100% at 0% 50%,rgba(248,113,113,.16),transparent 70%),' + WELL + ';box-shadow:inset 0 0 0 1px rgba(248,113,113,.75),0 0 14px -6px rgba(248,113,113,.8),' + SH_WELL + '}',
      V + ' .chk.star.st-bla{background:radial-gradient(60% 100% at 0% 50%,rgba(91,143,240,.16),transparent 70%),' + WELL + ';box-shadow:inset 0 0 0 1px rgba(91,143,240,.75),0 0 14px -6px rgba(91,143,240,.8),' + SH_WELL + '}',
      V + ' .chk.star.st-graen{background:radial-gradient(60% 100% at 0% 50%,rgba(34,197,94,.14),transparent 70%),' + WELL + ';box-shadow:inset 0 0 0 1px rgba(74,222,128,.7),0 0 14px -6px rgba(34,197,94,.8),' + SH_WELL + '}',
      V + ' .chkgrip{color:' + PENDING + '}',
      V + ' .chkbox{border:0;border-radius:5px;background:' + WELL + ';box-shadow:inset 0 0 0 1.5px rgba(160,190,235,.45);color:#fff}',
      V + ' .chk.done .chkbox{background:#16a34a;box-shadow:0 0 8px rgba(34,197,94,.6);color:#fff}',
      V + ' .chkt{background:transparent;color:#e6edf8}',
      V + ' .chk.done .chkt{color:' + PENDING + '}',
      V + ' .chkt:focus{background:rgba(0,6,18,.55);color:#fff}',
      V + ' .chkstj{color:' + PENDING + '}',
      V + ' .chkstj:hover,' + V + ' .chkx:hover{background:rgba(255,255,255,.08)}',
      V + ' .chkstj[aria-pressed="true"],' + V + ' .chkstj.st-gull{color:#ff8a1f;text-shadow:0 0 6px rgba(255,138,31,.7)}',
      V + ' .chkstj.st-raud{color:#f87171;text-shadow:0 0 6px rgba(248,113,113,.7)}',
      V + ' .chkstj.st-bla{color:#5b8ff0;text-shadow:0 0 6px rgba(91,143,240,.7)}',
      V + ' .chkstj.st-graen{color:#22c55e;text-shadow:0 0 6px rgba(34,197,94,.7)}',
      V + ' .chkx{color:' + PENDING + '}',
      V + ' .chkx:hover{color:' + BAD_INK + '}',
      V + ' .chkny{gap:8px;padding:0 12px 12px}',
      V + ' .chkny input{height:38px;border:0;border-radius:10px;background:' + WELL + ';color:#fff;box-shadow:' + SH_WELL + ',inset 0 0 0 1px rgba(160,190,235,.16)}',
      V + ' .chkny input:focus{outline:2px solid #ffb066;outline-offset:2px}',

      // ── VIP-vakt (513): rautt glerbrún; pósturinn í brunnum ───────────────────────────────────────────────────────
      V + ' .vip{padding:0;border:0;border-radius:15px;background:' + GLER + ';box-shadow:inset 0 0 0 1px rgba(248,113,113,.6),0 0 26px -10px rgba(248,113,113,.6),' + SH_CARD + ';color:' + INK2 + ';overflow:hidden}',
      V + ' .vip._tomt{box-shadow:inset 0 0 0 1px rgba(74,222,128,.5),0 0 22px -12px rgba(34,197,94,.6),' + SH_CARD + '}',
      V + ' .vip header{padding:12px 16px;gap:4px 12px;font-size:12.5px;color:' + MUTED + ';box-shadow:' + ETS_NEDST + '}',
      V + ' .vip header b{font:700 12px/1 var(--body);letter-spacing:.09em;text-transform:uppercase;color:#fff;text-shadow:0 0 10px rgba(242,193,78,.35)}',
      V + ' .vip .vip-tala{color:#fff}',
      V + ' .vip .vip-fel-l,' + V + ' .vip .vip-inn,' + V + ' .vip .vip-sk,' + V + ' .vip .vip-mal,' + V + ' .vip .vip-holf,' + V + ' .vip .vip-l1 time{color:' + MUTED + '}',
      V + ' .vip-takkar{--hb:6px}',
      V + ' .vip ul{margin:0;padding:10px 12px 12px;gap:8px}',
      V + ' .vip .vip-rod{padding:10px 12px;border:0;border-radius:12px;background:' + WELL + ';box-shadow:' + SH_WELL + '}',
      V + ' .vip .vip-rod._ovisst{box-shadow:inset 0 0 0 1px rgba(160,190,235,.3),' + SH_WELL + '}',
      V + ' .vip .vip-l1{color:' + SOFT + '}',
      V + ' .vip .vip-l1 b,' + V + ' .vip .vip-efni b{color:#fff}',
      V + ' .vip .vip-fra{color:' + SOFT + '}',
      V + ' .vip .vip-efni{color:#dfe6f2}',
      V + ' .vip .vip-efni span{color:' + MUTED + '}',
      V + ' .vip .vip-ov{color:' + WARN_INK + '}',
      // Aldurspillan ber lit sinn í --vk (inline úr 513): litur í brún og bleki, ekki fyllt.
      V + ' .vip-kl{border-radius:999px;background:color-mix(in srgb,var(--vk,#22c55e) 20%,transparent);color:color-mix(in srgb,var(--vk,#22c55e) 35%,#fff);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--vk,#22c55e) 70%,transparent),0 1px 2px rgba(0,0,0,.6);font-family:var(--body);text-shadow:0 1px 0 rgba(0,0,0,.5)}',
      V + ' .vip .btn,' + V + ' .vip .btn.vip-svara{border:0;background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + ';text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      V + ' .vip .btn.vip-vopn{border:0;background:linear-gradient(180deg,rgba(248,113,113,.35),rgba(120,20,20,.5)),#2a0f18;color:#fff;box-shadow:inset 0 0 0 1px rgba(248,113,113,.7),' + SH_CHIP + ',0 0 16px -4px rgba(248,113,113,.7)}',
      V + ' .vip .vip-drog textarea{border:0;background:rgba(0,6,18,.6);color:#fff;box-shadow:' + SH_WELL + ',inset 0 0 0 1px rgba(160,190,235,.18)}',
      V + ' .tp-m.vip-chip{border-color:rgba(248,113,113,.7)!important;color:' + BAD_INK + '!important}',
      V + ' .tp-m.vip-chip._svarad{border-color:rgba(160,190,235,.3)!important;color:' + MUTED + '!important}',

      // ── VIP-mál, Forgangsmál og aðrir listar (lrowHtml): etsaðar línur, due-pillur ────────────────────────────────
      V + ' .vipm-h{border-top:0;box-shadow:' + ETS_EFST + ';padding:10px 16px 4px}',
      V + ' .vipm-h b{font:600 13.5px/1.3 var(--body);color:#fff}',
      V + ' .vipm-h span{color:' + MUTED + '}',
      V + ' .lrow{border-top:0;box-shadow:' + ETS_EFST + '}',
      V + ' .lrow:hover{background:rgba(255,255,255,.04)}',
      V + ' .lrow b{color:#fff}',
      V + ' .lrow .s{color:' + MUTED + '}',
      V + ' .lpick:hover b{text-decoration-color:#ff8a1f}',
      V + ' .pprev{color:' + SOFT + '}',
      V + ' .age{' + P_WARN + '}',
      V + ' .age.warm{' + P_OR + '}',
      V + ' .age.hot{' + P_BAD + '}',
      V + ' .tag{background:' + WELL + ';color:#cdd9ec;border-color:rgba(160,190,235,.28)}',
      V + ' .tag.ham,' + V + ' .tag.samt{' + P_OR + '}',
      V + ' .fela,' + V + ' .adg{color:' + MUTED + '}',
      V + ' .clink.dk,' + V + ' .clink{color:' + OR_INK + ';text-decoration-color:rgba(255,179,122,.5)}',
      V + ' .mrow[aria-current="true"],' + V + ' .vbr-item[aria-current="true"],' + V + ' .frow[aria-current="true"]{background:rgba(91,143,240,.14);box-shadow:inset 3px 0 0 #ff8a1f}',
      V + ' .pin{color:#ff8a1f}',
      V + ' .mn:not(.les):hover,' + V + ' .mn:not(.les):focus-visible{background:rgba(255,255,255,.05)}',
      V + ' .hchip.on{background:' + APP + ';color:#fff;box-shadow:' + SH_GLOW + '}',
      V + ' .hchip.auto{border-color:rgba(255,138,31,.6);color:' + OR_INK + '}',
      V + ' .sx,' + V + ' .sg-r,' + V + ' .hchip:not(.on),' + V + ' .setja select{border:0;background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + '}',
      V + ' .sx:hover,' + V + ' .sg-r:hover,' + V + ' .hchip:not(.on):hover{background:' + LYKILL_HOVER + ';color:#fff}',
      V + ' .setja .slabel{color:' + ONNAVY + '}',

      // ── Valið mál, brunnar og undirgluggar (aðrir hamir) ──────────────────────────────────────────────────────────
      V + ' .sel,' + V + ' .vbr-svar{border:0;border-image:none;border-radius:15px;background:' + GLER + ';box-shadow:' + SH_CARD + ';color:' + INK + '}',
      V + ' .well,' + V + ' .saga,' + V + ' .bm,' + V + ' .fskjol{border:0;border-radius:10px;background:' + WELL + ';box-shadow:' + SH_WELL + ';color:#e6edf8}',
      V + ' .well p{color:#e6edf8}',
      V + ' .well .slabel,' + V + ' .saga .slabel,' + V + ' .bm .slabel,' + V + ' .fskjol .slabel,' + V + ' .slabel{color:' + OR_INK + '}',
      V + ' .saga .sg-l,' + V + ' .fskjol .sg-m,' + V + ' .saga .sg-m,' + V + ' .well .sg-m{color:' + SOFT + '}',
      V + ' .saga .sg-l b{color:#fff}',
      V + ' .saga .sg-l em.ok,' + V + ' .saga .sg-buid{color:' + OK_INK + '}' + V + ' .saga .sg-l em.bid{color:' + WARN_INK + '}',
      V + ' .well .clink.dk,' + V + ' .fskjol .clink.dk{color:' + OR_INK + ';text-decoration-color:rgba(255,179,122,.5)}',
      V + ' .saga .sg-r,' + V + ' .fskjol .sg-r,' + V + ' .well .sg-r,' + V + ' .fskjol .sx{border:0;background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + '}',
      V + ' .saga .sg-r:hover,' + V + ' .fskjol .sg-r:hover,' + V + ' .well .sg-r:hover{background:' + LYKILL_HOVER + '}',
      V + ' .bm input,' + V + ' .bm textarea,' + V + ' .bm select,' + V + ' .composer input[type="text"],' + V + ' .composer textarea,' + V + ' .nt textarea,' + V + ' .nt.dark textarea,' + V + ' .baf-ta{border:0;background:rgba(0,6,18,.6);color:#fff;box-shadow:' + SH_WELL + ',inset 0 0 0 1px rgba(160,190,235,.18)}',
      // „+ Nýtt mál" og „+ Hamur": felliglistar og dagsetning (368 .nylbl — hvítir í Boss/V2).
      V + ' .nylbl select,' + V + ' .nylbl input{border:0;background:rgba(0,6,18,.6);color:#fff;box-shadow:' + SH_WELL + ',inset 0 0 0 1px rgba(160,190,235,.18)}',
      V + ' .nylbl select:focus,' + V + ' .nylbl input:focus{outline:2px solid #ffb066;outline-offset:1px}',
      V + ' .nylbl{color:' + SOFT + '}',
      V + ' .bm label>span,' + V + ' .bm .bm-c,' + V + ' .nt.dark .ntst{color:' + SOFT + '}',
      V + ' .nt.dark textarea:focus,' + V + ' .bm textarea:focus,' + V + ' .bm input:focus,' + V + ' .composer input:focus,' + V + ' .composer textarea:focus{outline:2px solid #ffb066;outline-offset:1px;box-shadow:' + SH_WELL + ',inset 0 0 0 1px #ff8a1f}',
      V + ' .nt-tl{background:' + WELL + ';box-shadow:' + SH_WELL + '}',
      V + ' .fsmynd{border-color:rgba(255,255,255,.12)}',
      V + ' .vbr-mynd{background:' + WELL + '}',
      V + ' .slot.on{background:' + APP + ';border-color:transparent;color:#fff}',
      V + ' .t5toast{border:0;border-radius:12px;background:' + GLER_LITID + ';box-shadow:' + SH_CARD + ';color:#fff}',
      V + ' .t5toast .undo{background:' + APP + ';color:#fff;box-shadow:' + SH_GLOW + '}',
      V + ' .vbt-kort{background:' + WELL + ';box-shadow:' + SH_WELL + '}',
      V + ' .tfbanner{border:0;border-radius:10px;' + P_OR + '}',
      V + ' .skla.skbid{background:' + WELL + ';color:' + OR_INK + '}',
      V + ' .samt-teljari button._gull b,' + V + ' .samt-stj.on,' + V + ' .tp-stj{color:#ff8a1f}',
      V + ' .samt-stj:hover{background:rgba(255,255,255,.07);color:#ff8a1f}',
      V + ' .mbar button{background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + '}',
      V + ' .cfgrow.hamh{background:rgba(0,8,22,.3)}',
      V + ' .lk-ham,' + V + ' .lk-till{color:' + INK2 + '}',
      V + ' .lk-till{border-top:0;box-shadow:' + ETS_EFST + '}',
      // Skipulagsborð.
      V + ' .skc{border:0;background:' + GLER_LITID + ';box-shadow:' + SH_CARD + '}',
      V + ' .skt{color:' + INK2 + '}',
      V + ' .skt:focus{background:' + WELL + '}',
      V + ' .skb,' + V + ' .skmb{border:0;background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + '}',
      V + ' .skmc{' + P_HLUTL + '}',
      V + ' .sknew{color:' + OR_INK + '}',
      V + ' .sknew:hover{background:rgba(255,255,255,.06)}',
      // Tölvupóstar (448) og Erindi (449c).
      V + ' .tp .tp-m._beidni,' + V + ' .er .er-m._eyda{' + P_OR + '}',
      V + ' .tp .tp-m._lokid{' + P_OK + '}',
      V + ' .tp .tp-uppk{border:0;border-radius:10px;' + P_OR + '}',
      V + ' .tp .tp-uppk b{color:#ffd2ad}',
      V + ' .tp .tp-skeyti._okkar{background:rgba(91,143,240,.12);border-color:rgba(91,143,240,.35)}',
      V + ' [style*="d4a017"]{color:#ff8a1f!important}',
      V + ' .er .er-kassi._svar{background:rgba(255,103,2,.12);border-color:rgba(255,138,31,.5)}',
      V + ' .er .er-kassi._erindi{border-left-color:#5b8ff0}',
      V + ' .er .er-eydur button{border:0;background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + '}',
      // Samþykkja-glugginn (368 .sb-*): spjaldið var hvítt með ljósum reitum — hér glerspjald, brunnar og pillur.
      V + ' .sb{background:' + GLER + ';box-shadow:' + SH_CARD + ';color:' + INK + '}',
      V + ' .sb-bar{background:' + HAUS + ';border-bottom:0;box-shadow:' + HAUS_SH + '}',
      V + ' .sb-bar-t{color:' + INK2 + '}' + V + ' .sb-bar-t b{color:#fff}',
      V + ' .sb-nr,' + V + ' .sb-kick,' + V + ' .sb-sr dt,' + V + ' .sb-su,' + V + ' .sb-k h4,' + V + ' .sb-ath,' + V + ' .sb-bord span,' + V + ' .sb-sky span,' + V + ' .sb-li-meta{color:' + MUTED + '}',
      V + ' .sb-chip{' + P_HLUTL + '}',
      V + ' .sb-chip._till{' + P_OR + '}' + V + ' .sb-chip._spur{' + P_INFO + '}' + V + ' .sb-chip._sv,' + V + ' .sb-chip._ok{' + P_OK + '}',
      V + ' .sb-sogn{' + P_OR + '}',
      V + ' .sb-ari{' + P_BAD + '}',
      V + ' .sb-h,' + V + ' .sb-bord b,' + V + ' .sb-sv,' + V + ' .sb-tld,' + V + ' .sb-tl b,' + V + ' .vbr-item.sb-li .sb-li-t b{color:#fff}',
      V + ' .sb-fyr,' + V + ' .sb-tl p,' + V + ' .sb-li-t{color:' + INK2 + '}',
      V + ' a.sb-fyr:hover{color:' + OR_INK + '}',
      V + ' .sb-h .baf-merk{background:rgba(242,193,78,.22);color:#fff}',
      V + ' .sb-strip{gap:8px;background:none;box-shadow:none;border-radius:0}',
      V + ' .sb-sr{border-radius:10px;background:' + WELL + ';box-shadow:' + SH_WELL + '}',
      V + ' .sb-sr._warn{background:rgba(242,193,78,.12);box-shadow:inset 0 0 0 1px rgba(242,193,78,.5),' + SH_WELL + '}',
      V + ' .sb-sr._warn dt,' + V + ' .sb-sr._warn .sb-sv,' + V + ' .sb-sr._warn .sb-su{color:' + WARN_INK + '}',
      V + ' .sb-sr._ok .sb-sv{color:' + OK_INK + '}',
      V + ' .sb-tlp::before{background:#6f86ab}' + V + ' .sb-tlp::after{background:rgba(255,255,255,.12)}',
      V + ' .sb-tl li.sidast .sb-tlp::before{background:#ff8a1f;box-shadow:0 0 8px rgba(255,138,31,.8)}',
      V + ' .sb-tl li.idag .sb-tld{color:' + BAD_INK + '}' + V + ' .sb-tl li.idag .sb-tlp::before{background:#f87171;box-shadow:0 0 0 4px rgba(220,38,38,.25),0 0 10px #f87171}',
      V + ' .sb-info{background:rgba(47,111,228,.16);color:' + INFO_INK + ';box-shadow:inset 0 0 0 1px rgba(91,143,240,.45)}',
      V + ' .sb-info svg{color:#5b8ff0}',
      V + ' .sb-svar{background:' + LYKILL + ';color:#fff;box-shadow:' + SH_CHIP + '}',
      V + ' .sb-svar:hover{background:' + LYKILL_HOVER + '}',
      V + ' .sb-svar span{color:' + SOFT + '}',
      V + ' .sb-svar b i{' + P_OK + '}',
      V + ' .sb-svar._adal{background:' + APP + ';box-shadow:' + SH_GLOW + ';color:#fff;text-shadow:0 1px 0 rgba(120,35,0,.6)}',
      V + ' .sb-svar._adal:hover{background:' + APP_HOVER + '}',
      V + ' .sb-svar._adal span{color:#fff}',
      V + ' .sb-sky textarea{background:rgba(0,6,18,.6);color:#fff;box-shadow:' + SH_WELL + ',inset 0 0 0 1px rgba(160,190,235,.18)}',
      V + ' .sb-stada{background:' + WELL + ';color:' + INK2 + ';box-shadow:' + SH_WELL + '}',
      V + ' .sb-ft{background:#0a1f3e;border-top:0;box-shadow:' + ETS_EFST + ',0 -6px 14px -10px rgba(0,0,0,.8)}',
      V + ' .sb-meira-t{background:none;color:#fff;box-shadow:' + ETS_EFST + '}',
      V + ' .sb-meira-t:hover{background:rgba(255,255,255,.05)}',
      V + ' .sb-meira-t span{color:' + MUTED + '}',
      V + ' .sb-p{' + P_HLUTL + '}',
      V + ' .sb-p._y{' + P_WARN + '}' + V + ' .sb-p._r{' + P_BAD + '}' + V + ' .sb-p._w{' + P_OR + '}',
      // Samþykkja-listinn: síurofar og teljarar.
      V + ' .samt-rod button,' + V + ' .samt-teljari button{border:0;background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + '}',
      V + ' .samt-rod button[aria-pressed="true"],' + V + ' .samt-teljari button[aria-pressed="true"]{background:' + SILFUR + ';color:#0b1f40;box-shadow:inset 0 1px 0 #fff,0 2px 4px rgba(0,0,0,.5)}',
      V + ' .samt-rod button.samt-sn b{background:rgba(255,255,255,.14)}',
      V + ' .samt-kr{background:' + WELL + ';color:' + OR_INK + '}',
      V + ' .vbr-spurn{border:0;border-radius:10px;background:rgba(220,38,38,.10);color:#fff;box-shadow:inset 4px 0 0 #f87171,inset 0 0 0 1px rgba(248,113,113,.45)}',
      V + ' .vbr-spurn .lbl{color:' + BAD_INK + '}',
      V + ' .nt-tl,' + V + ' .nt-tl .sb-tld,' + V + ' .nt-tl b{color:#fff}',
      V + ' .nt-tl p{color:' + INK2 + '}',
      V + ' .skla{border:0;background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + '}',
      V + ' .skla.skvilla{color:' + BAD_INK + ';box-shadow:inset 0 0 0 1px rgba(248,113,113,.6),' + SH_CHIP + '}',
      // Tölvupóstar (448): merki, kassar, reitir og skeyti.
      V + ' .tp .tp-m,' + V + ' .er .er-m{font-size:11px;border-color:rgba(160,190,235,.3);background:' + WELL + ';color:#cdd9ec}',
      V + ' .tp .tp-m._mal{border-color:rgba(160,190,235,.45)}',
      V + ' .tp .tp-holf._bokhald{border-color:rgba(91,143,240,.55);color:' + INFO_INK + '}',
      V + ' .tp .btn._on,' + V + ' .er .er-takkar ._on{background:' + SILFUR + ';color:#0b1f40;border-color:transparent}',
      V + ' .tp .tp-svar,' + V + ' .tp .tp-claude,' + V + ' .tp .tp-mal,' + V + ' .er .er-kassi{border:0;border-radius:10px;background:' + WELL + ';box-shadow:' + SH_WELL + '}',
      V + ' .tp .tp-inp,' + V + ' .tp .tp-ta,' + V + ' .er .er-inp,' + V + ' .er .er-ta{border:0;background:rgba(0,6,18,.6);color:#fff;box-shadow:' + SH_WELL + ',inset 0 0 0 1px rgba(160,190,235,.18)}',
      V + ' .tp .tp-skeyti{border:0;border-radius:10px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(160,190,235,.18)}',
      V + ' .tp .tp-skeyti._okkar{background:rgba(91,143,240,.12);box-shadow:inset 0 0 0 1px rgba(91,143,240,.35)}',
      V + ' .tp .tp-svar .tp-takkar,' + V + ' .tp .tp-claude .tp-takkar,' + V + ' .er .er-kassi._svar .er-takkar{background:#0a1f3e}',
      // Erindi (449c).
      V + ' .er .er-m._graen,' + V + ' .er .er-m._ok{' + P_OK + '}',
      V + ' .er .er-m._raut{' + P_BAD + '}',
      V + ' .er .er-kassi._erindi{background:rgba(91,143,240,.10);box-shadow:inset 3px 0 0 #5b8ff0,' + SH_WELL + '}',
      V + ' .er .er-kassi._svar{background:rgba(255,103,2,.10);box-shadow:inset 0 0 0 1px rgba(255,138,31,.45),' + SH_WELL + '}',
      V + ' .er .er-eydur ._ok{color:' + OK_INK + '}',
      V + ' .er .er-takkar button,' + V + ' .er .er-takkar a{border:0;background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + '}',
      V + ' .er .er-takkar ._graen{background:linear-gradient(180deg,rgba(74,222,128,.35),rgba(22,101,52,.55)),#0e2850;color:#fff;box-shadow:inset 0 0 0 1px rgba(74,222,128,.6),' + SH_CHIP + '}',
      V + ' .er .er-takkar ._raut{background:linear-gradient(180deg,rgba(248,113,113,.35),rgba(120,20,20,.5)),#2a0f18;color:#fff;box-shadow:inset 0 0 0 1px rgba(248,113,113,.7),' + SH_CHIP + '}',
      V + ' .er .er-takkar ._gull{background:' + APP + ';color:#fff;box-shadow:' + SH_GLOW + '}',
      // Tilbúin verk (511).
      V + ' .baf-f{border:0;background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + '}',
      V + ' .baf-f[aria-pressed="true"]{background:' + APP + ';color:#fff;box-shadow:' + SH_GLOW + '}',
      V + ' .baf-v{border-top:0;box-shadow:' + ETS_EFST + '}',
      V + ' .baf-r:hover{background:rgba(255,255,255,.04)}',
      V + ' .baf-v.opid>.baf-r{background:rgba(91,143,240,.10)}',
      V + ' .baf-teg{border-color:rgba(160,190,235,.3);color:' + MUTED + '}',
      // Aldurspillur verkanna (511 .baf-ald): litur í brún og bleki.
      V + ' .baf-ald{' + P_HLUTL + '}',
      V + ' .baf-ald.baf-t-y{' + P_WARN + '}' + V + ' .baf-ald.baf-t-r{' + P_BAD + '}',
      V + ' .baf-t-y .baf-sv{color:' + WARN_INK + '}' + V + ' .baf-t-r .baf-sv{color:' + BAD_INK + '}',
      V + ' .baf-dyr{border-color:transparent;background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + '}',
      V + ' .baf-dyr:hover{border-color:transparent;background:' + LYKILL_HOVER + ';color:#fff}',
      V + ' .baf-dyr-o{color:#ff8a1f}',
      V + ' .baf-dyr-a{background:' + APP + ';color:#fff;box-shadow:' + SH_GLOW + '}' + V + ' .baf-dyr-a .baf-dyr-o{color:#fff}',
      V + ' .baf-dyr-s{background:linear-gradient(180deg,rgba(74,222,128,.35),rgba(22,101,52,.55)),#0e2850;color:#fff;box-shadow:inset 0 0 0 1px rgba(74,222,128,.6),' + SH_CHIP + '}',
      V + ' .baf-dl{border:0;background:' + WELL + ';box-shadow:' + SH_WELL + '}',
      V + ' .baf-dl-h{background:rgba(255,255,255,.04);color:' + INK2 + ';border-bottom-color:rgba(255,255,255,.08)}',
      V + ' .baf-dl li{border-bottom-color:rgba(255,255,255,.08)}' + V + ' .baf-dl details{border-top-color:rgba(255,255,255,.08)}',
      V + ' .baf-sp{color:#fff;text-shadow:none}' + V + ' .baf-kick::before{box-shadow:none}',
      V + ' .baf-d{border-top:0;background:rgba(0,8,22,.3);box-shadow:' + ETS_EFST + '}',
      V + ' .baf-k h3,' + V + ' .baf-kt span{color:' + MUTED + '}',
      V + ' .baf-kick{color:' + OR_INK + '}',
      V + ' .baf-kt{border:0;background:' + WELL + ';box-shadow:' + SH_WELL + '}',
      V + ' .baf-kt b{color:#fff}',
      V + ' .baf-rok li::before{background:#ff8a1f;box-shadow:0 0 6px rgba(255,138,31,.8)}',
      V + ' .baf-nr{background:' + APP + ';color:#fff;box-shadow:0 0 8px rgba(255,103,2,.6)}',
      V + ' .baf-sk{border:0;background:' + WELL + ';box-shadow:' + SH_WELL + '}',
      V + ' .baf-ok{color:' + OK_INK + '}',
      V + ' .baf-nei,' + V + ' .baf-stopp,' + V + ' .baf-mk .x{color:' + BAD_INK + '}',
      V + ' .baf-msg.villa{border:0;' + P_BAD + '}',
      V + ' .baf-ft,' + V + ' .baf-meira{border-top:0;box-shadow:' + ETS_EFST + '}',
      V + ' .baf-meira:hover{background:rgba(255,255,255,.05)}',
      V + ' .btn.baf-go[disabled]{background:' + LYKILL + ';color:' + MUTED + ';box-shadow:' + SH_CHIP + '}',
      V + ' .btn.baf-vopn{background:' + LYKILL + ';color:#fff;box-shadow:' + SH_CHIP + ',0 0 0 3px rgba(255,103,2,.55)}',
      V + ' .baf-bid,' + V + ' .mmb-fl--bid{background:linear-gradient(90deg,rgba(255,255,255,.03),rgba(255,255,255,.09),rgba(255,255,255,.03))}',
      // Markmið (508).
      V + ' .mmb-fl,' + V + ' .mmb-m{border-top:0;box-shadow:' + ETS_EFST + '}',
      V + ' .mmb-fl:hover{background:rgba(255,255,255,.04)}',
      V + ' .mmb-ml{background:rgba(0,8,22,.3);border-top:0;box-shadow:' + ETS_EFST + '}',
      V + ' .mmb-bar{background:rgba(0,6,20,.6);box-shadow:inset 0 1px 3px rgba(0,0,0,.8),0 1px 0 rgba(255,255,255,.09)}',
      V + ' .mmb-bar i{background:linear-gradient(180deg,#86efac,#16a34a);box-shadow:0 0 8px rgba(74,222,128,.6)}',
      V + ' .mmb-bar--byrjun i{background:#6f86ab;box-shadow:none}',
      V + ' .mmb-bar--lagt i{background:linear-gradient(180deg,#fca5a5,#dc2626);box-shadow:0 0 8px rgba(248,113,113,.7)}',
      V + ' .mmb-versnad{color:' + BAD_INK + '}',
      V + ' .mmb-tr{border-color:rgba(160,190,235,.35);color:' + MUTED + '}',
      V + ' .mmb-tr--rett{border:0;' + P_OK + '}',
      V + ' .mmb-tr--rangt{border:0;' + P_BAD + '}',
      V + ' .mmb-tr--oljost{border:0;' + P_WARN + '}',
      V + ' .mmb-mn--lokid{color:' + PENDING + '}',
      // Kröfu-vinnuglugginn (369).
      V + ' .kvbann{' + P_WARN + '}',
      V + ' .kvrow{border-top-color:rgba(255,255,255,.08)}',
      V + ' .kvrow.kvvirk{background:rgba(91,143,240,.12)}',
      V + ' .kvst.st-tilbuid_i_vinnslu,' + V + ' .kvst.st-i_vinnslu,' + V + ' .kvf.vinnsla{' + P_INFO + '}',
      V + ' .kvst.st-i_yfirferd_agnars,' + V + ' .kvf.agnar{' + P_OR + '}',
      V + ' .kvst.st-lokid,' + V + ' .kvf.ok{' + P_OK + '}',
      V + ' .kvf.nei{' + P_BAD + '}',
      V + ' .kv-upph{color:#ff8a1f}',
      V + ' .kvt2{color:' + ONNAVY + '}',
      // Valmyndir og annað smátt.
      V + ' .ovst,' + V + ' .note{color:' + MUTED + '}',
      V + ' .nl-h{background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + '}',

      // ── Annað á borðinu: eitt spjald með grænni brún; Pósthólf, Verkferlis-yfirlit og Sannreyna eru raðir í því ─────
      V + ' .nedst{gap:0;padding:0;border-radius:12px;background:' + GLER_LITID + ';box-shadow:' + SH_CARD + ',inset 3px 0 0 #22c55e,-4px 0 16px -6px rgba(34,197,94,.6)}',
      V + ' .nedst>*{margin:0}',
      V + ' .nedst-hd{align-items:center;padding:11px 16px 11px 18px;gap:10px 22px}',
      V + ' .nedst-hd h2{font:700 11px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;color:#eef3fb}',
      V + ' .nedst-hd span{font:500 12px/1 var(--body);letter-spacing:.08em;text-transform:uppercase;color:' + MUTED + '}',
      V + ' .nedst>.ph,' + V + ' .nedst-sr{padding:11px 16px 11px 18px;border:0;border-radius:0;background:none;box-shadow:' + ETS_EFST + '}',
      V + ' .nedst-sr b{font:700 11px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;color:#eef3fb;min-width:160px;flex:none}',
      V + ' .nedst-sr span{color:' + MUTED + '}',
      // Pósthólf (522).
      V + ' .ph{border:0;border-radius:12px;background:' + GLER_LITID + ';box-shadow:' + SH_CARD + ';color:#dfe6f2}',
      V + ' .ph._vand{box-shadow:' + SH_CARD + ',inset 3px 0 0 #f2c14e}',
      V + ' .nedst>.ph._vand{box-shadow:' + ETS_EFST + ',inset 3px 0 0 #f2c14e}',
      V + ' .ph .ph-k{flex:none;min-width:160px;font:700 11px/1 var(--body);letter-spacing:.12em;color:#eef3fb}',
      V + ' .ph .ph-h{color:#dfe6f2}',
      V + ' .ph .ph-h:hover,' + V + ' .ph .ph-i._opid .ph-h{border-color:rgba(160,190,235,.3);background:' + WELL + '}',
      V + ' .ph .ph-t{color:' + MUTED + '}',
      V + ' .ph .ph-ljos{--c:#22c55e;' + LED + '}',
      V + ' .ph .ph-ljos[data-s="seinn"]{--c:#f2c14e}' + V + ' .ph .ph-ljos[data-s="villa"]{--c:#f87171}',
      V + ' .ph .ph-r{border:0;background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + '}',
      V + ' .ph .ph-r:hover{background:' + LYKILL_HOVER + '}',
      V + ' .ph .ph-sk{color:' + OK_INK + '}' + V + ' .ph .ph-sk._v,' + V + ' .ph .ph-villa{color:' + BAD_INK + '}',
      V + ' .ph .ph-nanar{border-top:0;box-shadow:' + ETS_EFST + ';color:' + SOFT + '}',
      V + ' .ph .ph-nanar b{color:#fff}',
      V + ' .ph .ph-nanar i,' + V + ' .ph .ph-nanar .ph-aths{color:' + MUTED + '}',
      // Verkferlis-yfirlit (499): stálið víkur fyrir glerröð. Takkinn ber :not()×4 í 499 — sama keðja +1 hér.
      V + ' .nedst-yf{box-shadow:' + ETS_EFST + '}',
      V + ' #yf499{margin:0;border:0;border-radius:0;background:none;box-shadow:none;color:#dfe6f2}',
      V + ' #yf499 .yf-haus{background:none;color:#fff;padding:11px 16px 11px 18px}',
      V + ' #yf499 .yf-haus::before,' + V + ' #yf499 .yf-haus::after{display:none}',
      V + ' #yf499 .yf-titill{padding-left:0;font:700 11px/1 var(--body);letter-spacing:.12em;color:#eef3fb}',
      V + ' #yf499 .yf-stada{color:' + MUTED + '}',
      V + ' #yf499 .yf-keyra:not(#_yA):not(#_yB):not(#_yC):not(#_yD):not(#_yE){border:0;background:' + LYKILL + ';color:#e6edf8;box-shadow:' + SH_CHIP + ';border-radius:10px}',
      V + ' #yf499 .yf-bol{background:rgba(0,8,22,.3);color:#dfe6f2;box-shadow:' + ETS_EFST + '}',
      V + ' #yf499 .yf-flokkur{color:' + MUTED + ';border-bottom-color:rgba(255,255,255,.1)}',
      V + ' #yf499 .yf-m.ok{color:' + OK_INK + '}' + V + ' #yf499 .yf-m.ny{color:' + BAD_INK + '}' + V + ' #yf499 .yf-m.om{color:' + WARN_INK + '}',
      V + ' #yf499 .yf-p,' + V + ' #yf499 .yf-dag{color:' + SOFT + '}',
      V + ' #yf499 .yf-nanar,' + V + ' #yf499 small{color:' + MUTED + '}',
      V + ' #yf499 .yf-villa{color:' + BAD_INK + '}',
      V + ' #yf499 .yf-grind div{background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.1),rgba(255,255,255,.04))}',
      // J.A.R.V.I.S.-röðin (493). Stíll 493 er í <head> og nær ekki inn í skuggarótina — röðin fær því uppsetninguna hér.
      V + ' .t5-agentanet{--hb:8px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0;padding:11px 16px 11px 18px;border:0;border-radius:12px;background:' + GLER_LITID + ';box-shadow:' + SH_CARD + ',inset 3px 0 0 #5b8ff0,-4px 0 16px -6px rgba(91,143,240,.55)}',
      V + ' .t5-agentanet .l{flex:none;min-width:160px;margin-right:8px;font:700 11px/1 var(--body);letter-spacing:.12em;color:#eef3fb}',

      // ── Vinnusamantekt (489): mælar með glóandi efri brún; opinn mælir = shadow-valid ──────────────────────────────
      V + ' .vs-h{--hb:14px;gap:8px 14px;padding:10px 14px 10px 16px;border:0;background:' + HAUS + ';box-shadow:' + HAUS_SH + ';border-radius:15px 15px 0 0}',
      V + ' .vs-h h2{display:flex;align-items:center;gap:8px;font:700 12.5px/1.2 var(--body);letter-spacing:.09em;text-transform:uppercase;color:#fff;text-shadow:0 1px 0 rgba(0,0,0,.7)}',
      V + ' .vs-h h2::before{' + takn(T_LISTI) + '}',
      V + ' .vs-sum{color:#fff;padding-left:14px;box-shadow:-1px 0 0 rgba(0,0,0,.6),-2px 0 0 rgba(255,255,255,.12)}',
      V + ' .vs-mute{color:' + ONNAVY + '}',
      V + ' .vs-mb{gap:10px;padding:12px}',
      V + ' .vs-mc{position:relative;overflow:hidden;border:0;border-radius:14px;background:' + GLER_LITID + ';box-shadow:' + SH_CARD + '}',
      V + ' .vs-mc::before{content:"";position:absolute;left:0;right:0;top:0;height:3px;background:var(--c,transparent);box-shadow:0 0 12px 1px var(--c,transparent),0 1px 0 rgba(0,0,0,.6)}',
      V + ' .vs-mc[data-sev="alv"]{--c:#f87171}' + V + ' .vs-mc[data-sev="athuga"]{--c:#f2c14e}',
      V + ' .vs-mc[aria-expanded="true"]{background:' + GLER_LITID + ';box-shadow:' + SH_CARD + KOMMA + SH_VALID + '}',
      V + ' .vs-mc[aria-expanded="false"]{background:' + GLER_LITID + '}',
      V + ' .vs-mch,' + V + ' .vs-mc[aria-expanded="true"] .vs-mch{font:600 11.5px/1.25 var(--body);letter-spacing:.08em;color:#eef3fb}',
      V + ' .vs-mcn,' + V + ' .vs-mc[aria-expanded="false"] .vs-mcn{font:600 24px/1.1 var(--body);letter-spacing:0;color:#fff;text-shadow:0 0 18px rgba(130,175,255,.3)}',
      V + ' .vs-mcd{font-family:var(--body);color:' + OK_INK + '}',
      V + ' .vs-mcd[data-att="eins"]{color:' + MUTED + '}',
      V + ' .vs-d{color:' + SOFT + '}',
      V + ' .vs-mcu{color:' + SOFT + '}',
      V + ' .vs-mcx{margin-top:4px;padding-top:6px;box-shadow:' + ETS_EFST + ';font-family:var(--body);color:' + MUTED + '}',
      V + ' .vs-mc[aria-expanded="true"] .vs-mcx{color:' + OR_INK + '}',
      V + ' .vs-mcx b{color:#fff}',
      V + ' .vs-mc[data-sev="alv"] .vs-mcs{color:' + BAD_INK + '}' + V + ' .vs-mc[data-sev="athuga"] .vs-mcs{color:' + WARN_INK + '}',
      V + ' .vs-grid{column-rule:1px solid rgba(0,0,0,.45);box-shadow:' + ETS_EFST + '}',
      V + ' .vs-g{border-bottom:1px solid rgba(255,255,255,.06)}',
      V + ' .vs-g>h3{border-bottom:0;font:700 15px/1.2 var(--body);letter-spacing:0;color:#fff;text-shadow:none}',
      V + ' .vs-g>h3::before{--c:#fb8b3c;' + LED + '}',
      V + ' .vs-r{border-top:1px dashed rgba(255,255,255,.12)}',
      V + ' .vs-r:first-of-type{border-top:0}',
      V + ' .vs-led{--c:#9fb0cc;width:9px;height:9px;margin-top:5px;background:radial-gradient(circle at 35% 30%,#fff 0 16%,var(--c) 52%,#000 130%);box-shadow:0 0 3px rgba(159,176,204,.6)}',
      V + ' .vs-led[data-sev="alv"]{--c:#f87171;box-shadow:0 0 5px var(--c),0 0 12px var(--c)}',
      V + ' .vs-led[data-sev="athuga"]{--c:#f2c14e;box-shadow:0 0 5px var(--c),0 0 12px var(--c)}',
      V + ' .vs-led[data-sev="ok"]{--c:#22c55e;box-shadow:0 0 5px var(--c),0 0 12px var(--c)}',
      V + ' .vs-led[data-sev="upp"]{--c:#5b8ff0;box-shadow:0 0 5px var(--c),0 0 12px var(--c)}',
      V + ' .vs-t{color:#fff;border-bottom:1px dotted rgba(255,255,255,.4)}',
      V + ' .vs-t:hover,' + V + ' .vs-t:focus-visible{border-bottom-color:#ff8a1f}',
      V + ' .vs-w{display:inline-flex;align-items:center;height:19px;padding:0 8px;border-radius:999px;font-size:10.5px;letter-spacing:.06em}',
      V + ' .vs-r[data-sev="alv"] .vs-w{' + P_BAD + '}' + V + ' .vs-r[data-sev="athuga"] .vs-w{' + P_WARN + '}',
      V + ' .vs-n{color:#fff}',
      V + ' .vs-u{color:' + SOFT + '}',
      V + ' .vs-p,' + V + ' .vs-a,' + V + ' .vs-tomt{color:' + MUTED + '}',
      V + ' .vs-p li>strong{color:#fff}',
      V + ' .vs-fl{color:' + OR_INK + ';border-bottom-color:rgba(255,179,122,.4)}',
      V + ' .vs-tog{color:' + MUTED + '}',

      // ── Einkaritarinn (506) og Ráðgjafinn (506-radgjafinn): „brief"-spjöld ────────────────────────────────────────
      V + ' .ek-h,' + V + ' .rg-h{--hb:12px;gap:8px 12px;padding:14px 18px 6px 20px;border:0;background:none}',
      V + ' .ek-h h2,' + V + ' .rg-h h2{font:700 12px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;color:#eef3fb}',
      V + ' .ek-mute,' + V + ' .rg-mute{font-size:12.5px;color:' + MUTED + '}',
      V + ' .ek-fyrir,' + V + ' .rg-fyrir{padding:10px 20px 14px;border-bottom:0;font:700 22px/1.3 var(--body);letter-spacing:-.01em;color:#fff;text-shadow:0 0 22px rgba(130,175,255,.2)}',
      V + ' :is(.ek,.rg) h3,' + V + ' :is(.ek,.rg) h5{font:700 11.5px/1 var(--body);letter-spacing:.14em;text-transform:uppercase;color:' + MUTED + '}',
      V + ' :is(.ek,.rg) :is(.ek-idag,.ek-tolur,.ek-samn,.ek-topp,.ek-am,.ek-ft){padding-left:20px;padding-right:20px;border:0;box-shadow:' + ETS_EFST + '}',
      V + ' .ek-rad>li{border-top:1px solid rgba(255,255,255,.08)}',
      V + ' .ek-rad>li:first-child{border-top:0}',
      V + ' .ek-rad>li::before{border:0;background:' + WELL + ';color:#fff;box-shadow:' + SH_WELL + ',inset 0 0 0 1px rgba(160,190,235,.3)}',
      V + ' .ek-t,' + V + ' .ek-hop h4,' + V + ' .ek-opin,' + V + ' .ek-skref,' + V + ' .ek-am-texti,' + V + ' .ek-am-listi>li{color:#fff}',
      V + ' .ek-a,' + V + ' .ek-stada{color:' + SOFT + '}',
      V + ' .ek-s,' + V + ' .ek-ft{color:' + MUTED + '}',
      V + ' .ek-s a,' + V + ' .ek-lk{color:' + OR_INK + '}',
      V + ' .ek-tolur>div{border:0;border-radius:12px;background:' + WELL + ';box-shadow:' + SH_WELL + '}',
      V + ' .ek-tolur b{color:' + MUTED + '}',
      V + ' .ek-tolur span{color:#fff;text-shadow:0 0 16px rgba(130,175,255,.28)}',
      V + ' .ek-tolur small{color:' + SOFT + '}',
      V + ' .ek-hm{justify-self:start;border:0;background:' + WELL + ';color:#cdd9ec;box-shadow:inset 0 0 0 1px rgba(160,190,235,.2)}',
      V + ' .ek-hop+.ek-hop{border-top:0;box-shadow:' + ETS_EFST + '}',
      V + ' .ek-am-listi>li{border-top-color:rgba(255,255,255,.08)}',
      V + ' .ek-am-listi em,' + V + ' .ek-opin em,' + V + ' .ek-skref em{color:' + MUTED + '}',
      V + ' .ek-ft .err{color:' + BAD_INK + '}',
      // Stöðupillur Ráðgjafans (2 mánaða planið): litur í brún og bleki, aldrei fylltar.
      V + ' .rg-st{border:0;border-radius:999px;padding:0 8px;' + P_HLUTL + '}',
      V + ' .rg-st.eftir{' + P_BAD + '}',
      V + ' .rg-st.aaetlun{' + P_OK + '}',
      V + ' .rg-st.lokid{' + P_INFO + '}',

      // ── Yfirsýn (523) — V4.1-dýpt: rammi með appelsínugulri brún, upphleyptari flísar, dýpri brunnar ───────────────
      V + ' .yr-fr{box-shadow:' + SH_FRAME + '}',
      V + ' .yr-k{isolation:isolate;background:' + GLER + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.30),inset 0 0 0 1px rgba(150,185,235,.26),inset 0 -2px 0 rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.7),0 1px 0 1px rgba(255,255,255,.03),0 26px 40px -18px rgba(0,0,0,1),0 8px 14px -8px rgba(0,0,0,.85)}',
      V + ' .yr-k::after{content:"";position:absolute;left:12px;right:12px;top:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55) 25%,rgba(255,255,255,.75) 50%,rgba(255,255,255,.55) 75%,transparent);pointer-events:none;z-index:3}',
      V + ' .yr-k.yr-hero,' + V + ' .yr-hero{box-shadow:inset 0 1px 0 rgba(255,255,255,.4),inset 0 0 0 1px rgba(134,239,172,.32),inset 0 -2px 0 rgba(0,0,0,.65),0 0 0 1px rgba(0,0,0,.75),0 28px 40px -18px #000,0 10px 16px -8px rgba(0,0,0,.8),0 0 40px -12px rgba(34,197,94,.7)}',
      V + ' .yr-well,' + V + ' .yr-lr,' + V + ' .yr-mc,' + V + ' .yr-gl,' + V + ' .yr-yr,' + V + ' .yr-scr{box-shadow:' + SH_WELL + '}',
      V + ' .yr-chip{background:' + LYKILL + ';border-color:transparent;box-shadow:' + SH_CHIP + ';text-shadow:0 1px 0 rgba(0,0,0,.6)}',
      V + ' .yr-kp{box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 1px 2px rgba(0,0,0,.6);text-shadow:0 1px 0 rgba(0,0,0,.5)}',
      V + ' .yr-kn{text-shadow:0 1px 0 rgba(0,0,0,.8),0 2px 6px rgba(0,0,0,.5),0 0 22px rgba(130,175,255,.25)}',
      V + ' .yr-kl svg,' + V + ' .yr-kl .ic{filter:drop-shadow(0 0 6px rgba(255,138,31,.55))}',

      // Símahamur (530: data-t5snerti="simi"): sýnilegar stærðir eins og í V2/519 á síma — snertisvæði 530 leggjast ofan á.
      ':host([data-thema="bh2"][data-v4][data-t5snerti="simi"]) .lk{height:34px;font-size:13px;padding:0 14px 0 5px}',
      ':host([data-thema="bh2"][data-v4][data-t5snerti="simi"]) .lk-ic{width:22px;height:22px}',
      ':host([data-thema="bh2"][data-v4][data-t5snerti="simi"]) .links .btn,' + ':host([data-thema="bh2"][data-v4][data-t5snerti="simi"]) .modes>.btn.sm{height:36px}',
      ':host([data-thema="bh2"][data-v4][data-t5snerti="simi"]) .mk-m{min-width:30px;height:26px;font-size:12px}',
      ':host([data-thema="bh2"][data-v4][data-t5snerti="simi"]) .mk-run{min-height:40px}',
      // ── Mjór skjár ───────────────────────────────────────────────────────────────────────────────────────────────
      '@container t5 (max-width: 760px){' +
        V + ' .h1{font-size:30px}' +
        // Á síma brjóta Flýtileiðir um eins og í V2: í 360 px tæki kyrri hópurinn („Mitt vinnuborð + Nýtt mál“) nær allri
        // línunni og flísarnar hyrfu undir hann (mælt 390 px). Ein lína gildir á tölvu.
        V + ' .links{flex-wrap:wrap;overflow:visible;padding:8px 10px}' +
        V + ' .lk-akt{position:static;flex-wrap:wrap;margin:0 0 0 auto;padding:0;background:none;box-shadow:none}' +
        V + ' .seg.modeseg{flex-wrap:nowrap;overflow-x:auto}' +
        V + ' .seg.modeseg button{flex:0 0 auto;height:40px}' +
        V + ' .flipar{flex-wrap:nowrap;overflow-x:auto;padding:10px}' +
        V + ' .week{padding:10px}' +
        V + ' .day{min-height:0}' +
        V + ' .mk-m{min-width:30px;height:26px;font-size:12px}' +
        // J.A.R.V.I.S.-röðin brotnar um á síma: langi takkinn má brjóta textann svo ekkert standi út fyrir skjáinn (mælt 390 px).
        V + ' .t5-agentanet{padding:10px 12px}' +
        V + ' .t5-agentanet .l{flex:1 0 100%;min-width:0;margin:0}' +
        V + ' .t5-agentanet .btn{max-width:100%;height:auto;min-height:32px;white-space:normal;text-align:left}' +
        V + ' .phead .sum{box-shadow:none;padding-left:0}' +
      '}',
      '@media (prefers-reduced-motion: reduce){' + V + ' .lk,' + V + ' .flipi{transition:none}}'
    ].join('\n');
  }

  window.ThbThemaV4 = { css };
})();
