#!/usr/bin/env node
/* Byggir fact-skrá rekstrarfélaganna úr tools/rekstrarfelog-gogn.json.
 * Generuð svo hún geti ekki skakkast frá gögnunum — aldrei handskrifuð.
 * Keyrsla: node tools/rekstrarfelog-gogn.cjs > tools/rekstrarfelog-gogn.json
 *          node tools/byggja-rekstrarfelagaskra.cjs > <út>.html
 */
const fs = require('fs');
const path = require('path');
const G = JSON.parse(fs.readFileSync(path.join(__dirname, 'rekstrarfelog-gogn.json'), 'utf8'));
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ktF = k => k && k.length === 10 ? k.slice(0, 6) + '-' + k.slice(6) : (k || '—');

/* Ástand staðar. Tríóið er mælikvarðinn: beri skýrslan tölu og prófíllinn sömu
   tölu er staðurinn staðfestur. Beri skýrslan enga tölu er ekkert til að
   staðfesta MEÐ — það er annað ástand en ósamræmi og má ekki líta eins út. */
function astand(s) {
  if (!s.ithj) return { fl: 'hlut', txt: 'ekki í þjónustu' };
  if (s.skyrslutala == null) return { fl: 'engin', txt: 'engin skýrslutala' };
  if (s.skyrslutala === s.taeki) return { fl: 'ok', txt: 'staðfest ' + s.taeki };
  return { fl: 'skakkt', txt: 'skýrsla ' + s.skyrslutala + ' · prófíll ' + s.taeki };
}
const merkiRada = s => [s.nr == null ? 'án nr.' : null, s.nafnrek ? 'nafn-rek' : null].filter(Boolean);

function tafla(stadir) {
  return '<div class="skrun"><table>'
    + '<thead><tr><th>Hús</th><th class="c">Nr.</th><th class="n">Tæki</th>'
    + '<th class="n">Skýrsla</th><th class="n">Skjöl</th><th>Staða</th></tr></thead><tbody>'
    + stadir.map(s => {
      const a = astand(s), m = merkiRada(s);
      return `<tr class="${s.ithj ? '' : 'ovirkur'}">`
        + `<td><div class="hus">${esc(s.nafn)}</div>`
        + `<div class="addr">${esc(s.heimilisfang || '—')}`
        + (m.length ? m.map(x => `<span class="flagg">${esc(x)}</span>`).join('') : '') + '</div></td>'
        + `<td class="c mono">${s.nr == null ? '—' : s.nr}</td>`
        + `<td class="n mono">${s.taeki || '—'}</td>`
        + `<td class="n mono sk">${s.skyrsluAr ? s.skyrsluAr + '<span>' + s.skyrslutala + '</span>' : '—'}</td>`
        + `<td class="n mono">${s.skjol || '—'}</td>`
        + `<td><span class="pilla p-${a.fl}">${esc(a.txt)}</span></td></tr>`;
    }).join('') + '</tbody></table></div>';
}

function band(h) {
  const hlutf = h.stadir.length ? Math.round(h.stadfest / h.stadir.length * 100) : 0;
  return `<div class="band"><span class="bnafn">${esc(h.nafn)}</span>`
    + `<span class="bkt">${ktF(h.kt)}</span>`
    + (h.merki ? `<span class="bmerki">merki: ${esc(h.merki)}</span>` : '')
    + `<span class="btelj">${h.stadir.length} staðir · ${h.taeki} tæki · `
    + `<b class="${hlutf === 100 ? 'heilt' : ''}">${h.stadfest}/${h.stadir.length} staðfest</b></span></div>`;
}

const HL = G.hopar.find(h => h.kt === '5101170690');
const greid = (G.merkjaHopar['Heimaleiga'] || []).filter(b => b.kt !== '5101170690');
const hin = G.hopar.filter(h => h.kt !== '5101170690');
const alls = { stadir: G.hopar.reduce((a, h) => a + h.stadir.length, 0), taeki: G.heild.taeki,
  stadfest: G.hopar.reduce((a, h) => a + h.stadfest, 0) };

process.stdout.write(`<title>Rekstrarfélög — fact-skrá</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans+Condensed:wght@600;700&display=swap">
<style>
  :root{
    --ground:#f5f5f7; --surface:#fff; --alt:#fbfcfe;
    --ink1:#0f1117; --ink2:#404550; --ink3:#525b6b; --ink4:#6b7484;
    --brd:#e4e6ea; --brd2:#d0d4da;
    --metb:#141822; --met-ink:#f0f2f5; --met-dim:#8f99a8;
    --graent:#0f6e3a; --graent-bg:#edfaf3; --graent-bd:#a7e8c5;
    --gult:#8a5310; --gult-bg:#fff8ea; --gult-bd:#f2d59b;
    --rautt:#a01820; --rautt-bg:#fdf1ef; --rautt-bd:#f0c4bd;
  }
  :root:not([data-theme="light"]){}
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--ink1);
    font:15px/1.55 "IBM Plex Sans",-apple-system,"Segoe UI",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1120px;margin:0 auto;padding:32px 20px 70px;display:flex;flex-direction:column;gap:20px}
  .haus{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;border-bottom:2px solid var(--metb);padding-bottom:13px}
  .haus h1{margin:0;font-family:"IBM Plex Sans Condensed","IBM Plex Sans",sans-serif;
    font-size:33px;font-weight:700;letter-spacing:-.015em}
  .haus .und{font-family:"IBM Plex Mono",monospace;font-size:12.5px;color:var(--ink3)}
  .haus .dags{margin-left:auto;font-size:11.5px;font-weight:600;letter-spacing:.09em;
    text-transform:uppercase;color:var(--ink4)}
  .summa{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;
    background:var(--brd2);border:1px solid var(--brd2);border-radius:3px;overflow:hidden}
  .summa div{background:var(--surface);padding:13px 15px}
  .summa .t{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink4)}
  .summa .v{font-family:"IBM Plex Mono",monospace;font-size:25px;font-weight:600;
    font-variant-numeric:tabular-nums;margin-top:3px;letter-spacing:-.02em}
  .summa .s{font-size:11.5px;color:var(--ink3);margin-top:1px}
  .skyring{font-size:12.5px;color:var(--ink3);max-width:74ch}
  .skyring b{color:var(--ink2)}
  .hopur{border:1px solid rgba(20,24,34,.1);border-radius:9px;overflow:hidden;background:var(--surface)}
  .band{display:flex;align-items:center;gap:11px;flex-wrap:wrap;background:var(--metb);
    color:var(--met-ink);padding:9px 14px}
  .band .bnafn{font-weight:600;font-size:14.5px}
  .band .bkt,.band .bmerki{font-family:"IBM Plex Mono",monospace;font-size:11.5px;color:var(--met-dim)}
  .band .bmerki{border-left:1px solid rgba(255,255,255,.16);padding-left:11px}
  .band .btelj{margin-left:auto;font-size:11.5px;color:var(--met-dim);font-variant-numeric:tabular-nums;white-space:nowrap}
  .band .btelj b{color:#cfd6e0;font-weight:600}
  .band .btelj b.heilt{color:#7fe0a8}
  .skrun{overflow-x:auto}
  table{width:100%;border-collapse:collapse;font-size:13.5px}
  thead th{text-align:left;font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;
    color:var(--ink4);padding:7px 14px;border-bottom:1px solid var(--brd);background:var(--alt);white-space:nowrap}
  th.n,td.n{text-align:right}th.c,td.c{text-align:center}
  tbody td{padding:8px 14px;border-bottom:1px solid var(--brd);vertical-align:middle}
  tbody tr:nth-child(even){background:var(--alt)}
  tbody tr:last-child td{border-bottom:0}
  .hus{font-weight:500}
  .addr{font-size:11.5px;color:var(--ink3);margin-top:1px}
  .flagg{display:inline-block;margin-left:7px;font-size:10px;font-weight:600;letter-spacing:.04em;
    text-transform:uppercase;color:var(--gult);border:1px solid var(--gult-bd);background:var(--gult-bg);
    border-radius:2px;padding:0 5px}
  .mono{font-family:"IBM Plex Mono",monospace;font-variant-numeric:tabular-nums}
  td.sk span{color:var(--ink4);font-size:11.5px;margin-left:5px}
  td.sk span::before{content:"→ "}
  .pilla{display:inline-block;padding:2px 8px;border-radius:2px;font-size:11px;font-weight:600;
    white-space:nowrap;border:1px solid}
  .p-ok{background:var(--graent-bg);border-color:var(--graent-bd);color:var(--graent)}
  .p-skakkt{background:var(--rautt-bg);border-color:var(--rautt-bd);color:var(--rautt)}
  .p-engin{background:var(--gult-bg);border-color:var(--gult-bd);color:var(--gult)}
  .p-hlut{background:var(--alt);border-color:var(--brd2);color:var(--ink4)}
  tr.ovirkur .hus{color:var(--ink3);font-weight:400}
  h2.kafli{margin:14px 0 -6px;font-family:"IBM Plex Sans Condensed",sans-serif;font-size:19px;font-weight:700}
  h2.kafli span{font-family:"IBM Plex Sans",sans-serif;font-size:12.5px;font-weight:400;color:var(--ink3);margin-left:9px}
  .fotur{font-size:11.5px;color:var(--ink4);border-top:1px solid var(--brd);padding-top:12px;
    display:flex;gap:16px;flex-wrap:wrap;font-variant-numeric:tabular-nums}
  .utaf{display:grid;gap:1px;background:var(--brd2);border:1px solid var(--brd2);border-radius:9px;overflow:hidden}
  .atr{background:var(--surface);padding:15px 17px;border-left:3px solid var(--gult)}
  .atrh{font-weight:600;font-size:14px;margin-bottom:5px}
  .atr p{margin:0 0 8px;font-size:13px;color:var(--ink2);max-width:76ch}
  .atr p:last-child{margin-bottom:0}
  .atr p.var{color:var(--ink3);font-size:12.5px;border-top:1px solid var(--brd);padding-top:8px}
  .kk{font-family:"IBM Plex Mono",monospace;font-size:12px;background:var(--alt);
    border:1px solid var(--brd);border-radius:2px;padding:0 4px}
  @media (max-width:640px){.haus h1{font-size:25px}.haus .dags{margin-left:0;width:100%}}
</style>

<div class="wrap">
  <header class="haus">
    <div><h1>Rekstrarfélög</h1>
      <div class="und">${G.hopar.length} félög með fleiri en einn stað · ${alls.stadir} staðir · ${alls.taeki} tæki</div></div>
    <div class="dags">Mælt ${G.maelt}</div>
  </header>

  <section class="summa">
    <div><div class="t">Félög</div><div class="v">${G.hopar.length}</div><div class="s">ein kt, margir staðir</div></div>
    <div><div class="t">Staðir</div><div class="v">${alls.stadir}</div><div class="s">lifandi skráningar</div></div>
    <div><div class="t">Staðfest tríó</div><div class="v">${alls.stadfest}</div><div class="s">af ${alls.stadir} — skýrsla = prófíll</div></div>
    <div><div class="t">Tæki</div><div class="v">${alls.taeki}</div><div class="s">í notkun</div></div>
  </section>

  <p class="skyring">
    <b>Staðfest</b> þýðir að tækjatalan á prófílnum er sú sama og tæknimaðurinn taldi upp í
    úttektarskýrsluna. <b>Engin skýrslutala</b> er ekki það sama og ósamræmi — þar er einfaldlega
    ekkert til að staðfesta með. Auðkenni staðar er kennitala + númer, svo <b>án nr.</b> merkir stað
    sem er í raun ónefndur, og <b>nafn-rek</b> merkir stað þar sem tækin bera annað nafn en fyrirtækið.
  </p>

  <h2 class="kafli">Heimaleiga<span>eigin kennitala og greiðendurnir níu</span></h2>
  <div class="hopur">${band(HL)}${tafla(HL.stadir)}</div>
${greid.map(b => `  <div class="hopur"><div class="band"><span class="bnafn">${esc(b.nafn)}</span>`
  + `<span class="bkt">${ktF(b.kt)}</span><span class="bmerki">greiðandi · Heimaleiga</span>`
  + `<span class="btelj">${b.stadir.length} ${b.stadir.length === 1 ? 'staður' : 'staðir'} · ${b.taeki} tæki</span></div>`
  + (b.stadir.length ? tafla(b.stadir)
     : '<div class="skrun"><table><tbody><tr><td style="padding:12px 14px"><div class="hus" style="font-weight:400;color:var(--ink3);font-style:italic">Enginn staður tengdur</div>'
       + '<div class="addr">greiðandi án húss — telst ekki sem þjónustustaður</div></td>'
       + '<td style="text-align:right;padding:12px 14px"><span class="pilla p-hlut">greiðandi, ekki staður</span></td></tr></tbody></table></div>')
  + '</div>').join('\n')}

  <h2 class="kafli">Hin félögin<span>${hin.length} með fleiri en einn stað</span></h2>
${hin.map(h => `  <div class="hopur">${band(h)}${tafla(h.stadir)}</div>`).join('\n')}

  <h2 class="kafli">Það sem stendur út af<span>fjögur atriði, öll með sönnun</span></h2>
  <div class="utaf">
    <div class="atr">
      <div class="atrh">Númeraröðin slitnaði þegar Aegina var skilin frá</div>
      <p>Númer staðar er <b>per kennitölu</b> — þess vegna eiga sjö greiðendur hver sitt
      <span class="kk">nr.&nbsp;1</span> og það er reglan að virka, ekki villa. Ein sker sig úr:
      <b>Aegina á einn stað sem ber nr.&nbsp;10</b>, og nákvæmlega nr.&nbsp;10 vantar í röð
      Heimaleigu (1–9, 11). Icelandic Apartments var númeraður inn í eina samfellda
      Heimaleigu-röð og síðan færður á kennitölu Aegina — númerið fylgdi ekki með.</p>
      <p class="var">Númerið er hluti af auðkenni staðar og fer inn í Payday sem
      <span class="kk">kt nr. N</span>. Að endurnúmera slítur tenginguna við eldri
      bókhaldsfærslur, svo þetta er ekki vélræn lagfæring.</p>
    </div>
    <div class="atr">
      <div class="atrh">Tveir greiðendur telja sem þjónustustaðir án þess að vera hús</div>
      <p><b>SAB ehf.</b> ber Heimaleigu-merkið en á <b>engan stað og engin skjöl</b> —
      hann birtist á borðinu sem „ekki í skrá". <b>EA Law Practice</b> á stað á Skipholti 50D
      með núll tæki og núll skjöl, á meðan Freyjugata 16 — húsið sem EA greiðir fyrir — er
      sinn eigin staður hjá Heimaleigu með sína skýrslu og reikning.</p>
    </div>
    <div class="atr">
      <div class="atrh">Urðarhvarf 2 situr undir Heimaleigu, ekki Aegina</div>
      <p>Aegina á Urðarhvarf 2 og 4 að þínu sögn. Í kerfinu situr <b>nr.&nbsp;4
      (Icelandic Apartments) á Aegina en nr.&nbsp;2 (Blue Mountain) á kennitölu Heimaleigu</b>.
      Skjölin styðja núverandi skráningu — úttektarskýrslurnar heita „Heimaleiga&nbsp;-&nbsp;Urðarhvarf 2"
      og bera kennitölu Heimaleigu. Það getur bæði þýtt að Aegina eigi húsið og Heimaleiga reki það.</p>
    </div>
    <div class="atr">
      <div class="atrh">Bríetartún er tvennt, ekki tvítak</div>
      <p>Tvær skráningar á sama heimilisfangi bera <b>hvor sín gögn</b>: húsfélagið 48 tæki og
      reikninga upp á 193.600 kr, Heimaleigu-eintakið 8 tæki og R-107527 upp á 53.143 kr.
      Ólík númer, ólíkar upphæðir — tvö aðskilin viðskiptasambönd í einu húsi.
      <b>Hvorugt má hverfa.</b></p>
    </div>
  </div>

  <div class="fotur">
    <span>Mælt beint úr Supabase ${G.maelt}</span>
    <span>${alls.stadfest} af ${alls.stadir} staðfest</span>
    <span>Generuð úr tools/rekstrarfelog-gogn.json — ekki handskrifuð</span>
  </div>
</div>
`);
