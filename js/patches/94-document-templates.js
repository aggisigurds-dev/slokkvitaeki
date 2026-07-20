/* === SKJALASNIÐMÁT v1 ===
 *
 * Bætir við "Skjalasniðmát" hluta inni í Samningar-sýninni þar sem notandi getur:
 *   • Bætt við sniðmátum (HTML eða texti með {{reitir}} placeholder-um)
 *   • Opnað sniðmát → fyllir reiti í form → prentar (eða vistar PDF)
 *   • Vistað sín eigin sniðmát í AppSettings (samstillt milli tækja)
 *
 * Þrjú forsniðin sniðmát fylgja:
 *   1. Þjónustusamningur — Slökkvitæki ehf við viðskiptavin
 *   2. Skipasamningur — fyrir skoðun og þjónustu á sjónum
 *   3. Almenn staðfesting — fyrir hvers kyns samþykki / vottorð
 *
 * Reitir eru sjálfvirkt greindir úr sniðmáti með regex /\{\{([^}]+)\}\}/g.
 * Allir greinanlegir reitir verða input-svæði í forminu, með íslenskum
 * "label" útgáfum (t.d. {{vidskiptavinur_nafn}} → "Viðskiptavinur (nafn)").
 *
 * Vistun: AppSettings.skjalasnidmat = [{id, name, type, html, created_at}]
 */
(() => {
  if (window.__docTemplatesInstalled) return;
  window.__docTemplatesInstalled = true;

  const STORAGE_KEY = 'skjalasnidmat';
  // 2026-05-13: Storage for FILLED-IN copies of templates (with values).
  // Lets the user save a Þjónustusamningur for Customer X, come back later,
  // re-print, edit fields, etc. — just like patch 50's contracts list but
  // for any of our six templates.
  const FILLED_KEY = 'skjalasnidmat_filled';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ── Pre-seeded templates ──────────────────────────────────────────────────
  // 2026-06-01: built FRESH on every call (was a const evaluated once at
  // load) so the ${SlokkLogo.imgHtml(...)} logo is resolved at render time —
  // otherwise a logo changed in Stillingar/Branding never reached the
  // þjónustusamningur opened from Fyrirtæki í Þjónustu (the seed body had the
  // default logo baked in before branding finished loading).
  function buildSeedTemplates() { return [
    {
      id: 'seed_thjonustusamningur',
      name: 'Þjónustusamningur',
      type: 'thjonusta',
      _seed: true,
      html: `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:780px;margin:0 auto;padding:18px 32px 16px;background:#fff;box-sizing:border-box;min-height:262mm;display:flex;flex-direction:column">
  <div style="text-align:center;line-height:0;margin-bottom:2px">
    ${(window.SlokkLogo && SlokkLogo.imgHtml) ? SlokkLogo.imgHtml({heightPx:82, alt:"Brunahólf / Slökkvitæki ehf."}) : '<img src="/img/logo.png?v=20260520b" alt="Brunahólf / Slökkvitæki ehf." style="height:82px;width:246px;object-fit:contain;display:inline-block">'}
  </div>

  <div style="text-align:right;font-size:13px;color:#0f172a;margin:0 0 6px">Dags: {{dagsetning}}</div>

  <div style="text-align:center;margin:0 0 16px">
    <div style="font-size:24px;font-weight:800;letter-spacing:0.3px">Þjónustusamningur</div>
  </div>

  <div style="font-size:13.5px;line-height:1.5;margin-bottom:12px">
    Hér með gera Brunahólf Slökkvitæki ehf. kt.: 600508-0400 og
  </div>

  <div style="font-size:13.5px;line-height:1.75;margin-bottom:3px"><strong>Nafn:</strong> {{vidskiptavinur_nafn}} &nbsp;&nbsp;<strong>Kt.:</strong> {{kennitala}}</div>
  <div style="font-size:13.5px;line-height:1.75;margin-bottom:14px"><strong>Heimilisfang:</strong> {{heimilisfang}}</div>

  <div style="font-size:13.5px;line-height:1.55;margin-bottom:12px">
    Með sér þjónustusamningi þess efnis að Brunahólf Slökkvitæki ehf. annist reglubundna þjónustu, eftirlit og viðhald á þeim brunavarna- og öryggisbúnaði sem samningur þessi tekur til.
  </div>

  <div style="font-size:13px;line-height:1.55;margin-bottom:18px">
    Samningi þessum skal segja upp með minnst tveggja mánaða fyrirvara á e-mailið <a href="mailto:eldklar@eldklar.is" style="color:#2563eb;text-decoration:underline">eldklar@eldklar.is</a>
  </div>

  <div style="margin-bottom:8px;font-size:13.5px;font-weight:700">Umsjón með:</div>
  <div style="font-size:13.5px;line-height:2.15">
    {{chk_slokkvitaeki}} &nbsp;Handslökkvitæki<br>
    {{chk_reykskynjarar}} &nbsp;Reykskynjarar<br>
    {{chk_brunaslongur}} &nbsp;Brunaslöngur<br>
    {{chk_brunavidvorun}} &nbsp;Brunaviðvörunarkerfi<br>
    {{chk_slokkvikerfi}} &nbsp;Slökkvikerfi
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:auto;padding-top:24px">
    <div style="text-align:center">
      <div style="font-size:12.5px;font-weight:700;color:#b91c1c">Samþykki staðfest með tölvupósti</div>
      <div style="font-size:13px;font-weight:700;margin:4px 0 2px">eldklar@eldklar.is</div>
      <div style="height:38px;display:flex;align-items:flex-end;justify-content:center;font-weight:700;font-size:13px">{{sig_slokkvitaeki}}{{starfsmadur}}</div>
      <div style="border-top:1px solid #0f172a;padding-top:6px;font-size:12.5px;font-weight:700;text-align:left">Fyrir hönd Brunahólf Slökkvitæki ehf.:</div>
    </div>
    <div style="text-align:center">
      <div style="font-size:12.5px;font-weight:700;color:#b91c1c">Samþykki staðfest með tölvupósti</div>
      <div style="font-size:13px;font-weight:700;margin:4px 0 2px">{{netfang}}</div>
      <div style="height:38px;display:flex;align-items:flex-end;justify-content:center">{{sig_vidskiptavinur}}</div>
      <div style="border-top:1px solid #0f172a;padding-top:6px;font-size:12.5px;font-weight:700;text-align:left">Fyrir hönd fyrirtækis/húsfélags:</div>
    </div>
  </div>

  <div style="margin-top:28px;text-align:center;font-style:italic;font-size:13px;color:#0f172a">
    Við leggjum áherslu á persónulega og vandaða þjónustu.
  </div>

  <div style="margin-top:16px;text-align:center;font-size:11px;color:#475569;line-height:1.6">
    Brunahólf Slökkvitæki ehf. · Helluhrauni 10, 220 Hafnarfirði · Vsknr. 98107<br>
    Netfang: <a href="mailto:eldklar@eldklar.is" style="color:#2563eb;text-decoration:underline">eldklar@eldklar.is</a> &nbsp;·&nbsp; Sími 565-4080
  </div>
</div>`
    },
    {
      id: 'seed_thjonustusamningur_brunakerfi',
      name: 'Þjónustusamningur brunakerfi',
      type: 'thjonusta_brunakerfi',
      _seed: true,
      html: `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:780px;margin:0 auto;padding:24px 32px 28px;background:#fff;border:2px solid #0f172a">
  <div style="text-align:center;margin-bottom:4px;line-height:0">
    ${(window.SlokkLogo && SlokkLogo.imgHtml) ? SlokkLogo.imgHtml({heightPx:90, alt:"Slökkvitæki / Brunahólf"}) : '<img src="/img/logo.png?v=20260520b" alt="Slökkvitæki / Brunahólf" style="height:90px;width:270px;object-fit:contain;display:inline-block">'}
  </div>

  <div style="text-align:right;font-size:13px;color:#475569;margin:0 0 6px">Dagsetning: {{dagsetning}}</div>

  <div style="text-align:center;margin:0 0 14px">
    <div style="font-size:24px;font-weight:800;letter-spacing:0.5px">Þjónustusamningur</div>
    <div style="font-size:14px;font-weight:600;margin-top:4px;color:#0f172a">Hleðsla — Sala — Þjónusta</div>
    <div style="font-size:13px;color:#475569;margin-top:2px">Sími: 565-4080</div>
  </div>

  <hr style="border:none;border-top:1px solid #cbd5e1;margin:14px 0">

  <div style="font-size:14px;line-height:1.7;margin-bottom:14px">
    Hér með gera <strong>Slökkvitæki ehf</strong> kt: <strong>600508-0400</strong> og
  </div>

  <div style="margin:14px 0;padding:12px 14px;background:#f8fafc;border-left:3px solid #0f172a;border-radius:4px">
    <div style="font-size:14px;line-height:1.8"><strong>Nafn:</strong> {{vidskiptavinur_nafn}} &nbsp;&nbsp;<strong>kt:</strong> {{kennitala}}</div>
    <div style="font-size:14px;line-height:1.8"><strong>Heimilisfang:</strong> {{heimilisfang}}</div>
    <div style="font-size:14px;line-height:1.8"><strong>Fnr.:</strong> {{fnr}}</div>
  </div>

  <div style="font-size:14px;line-height:1.7;margin:14px 0">
    með sér þjónustusamning þess efnis að <strong>Slökkvitæki ehf</strong> muni sjá um árlega þjónustu á <strong>brunaviðvörunarkerfum</strong> og tengdum búnaði.
  </div>

  <div style="font-size:13px;line-height:1.6;margin-bottom:18px;color:#475569;font-style:italic">
    Samningi þessum skal segja upp með minnst tveggja mánaða fyrirvara í síma 565-4080 eða á e-mailið <strong>eldklar@eldklar.is</strong>
  </div>

  <hr style="border:none;border-top:1px dashed #cbd5e1;margin:24px 0 18px">

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px">
    <div>
      <div style="font-size:12px;color:#475569;margin-bottom:4px;font-weight:600">Fyrir hönd Slökkvitækja ehf:</div>
      <div style="height:60px;border-bottom:1px solid #0f172a;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">{{sig_slokkvitaeki}}</div>
      <div style="font-size:13px;margin-top:4px;font-weight:600">Frank Höybye</div>
      <div style="font-size:11px;color:#475569;margin-top:1px">kt: 080379-5019 · Gsm: 844-5222</div>
    </div>
    <div>
      <div style="font-size:12px;color:#475569;margin-bottom:4px;font-weight:600">Fyrir hönd fyrirtækis/húsfélags:</div>
      <div style="height:60px;border-bottom:1px solid #0f172a;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">{{sig_vidskiptavinur}}</div>
      <div style="font-size:13px;margin-top:4px;font-weight:600">{{vidskiptavinur_nafn}}</div>
    </div>
  </div>

  <div style="margin-top:18px;padding-top:12px;border-top:1px solid #cbd5e1;text-align:center;font-size:11px;color:#64748b;line-height:1.6">
    Slökkvitæki ehf · Helluhrauni 10, 220 Hafnarfirði · vsknr. 98107<br>
    Netfang: eldklar@eldklar.is &nbsp;·&nbsp; Sími 565-4080
  </div>
</div>`
    },
    {
      id: 'seed_uttektarskyrsla',
      name: 'Úttektarskýrsla (slökkvitæki + slöngur)',
      type: 'skyrsla',
      _seed: true,
      html: `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:780px;margin:0 auto;padding:24px 32px 28px;background:#fff;border:2px solid #0f172a">
  <div style="text-align:center;margin-bottom:4px;line-height:0">
    ${(window.SlokkLogo && SlokkLogo.imgHtml) ? SlokkLogo.imgHtml({heightPx:80, alt:"Slökkvitæki / Brunahólf"}) : '<img src="/img/logo.png?v=20260520b" alt="Slökkvitæki / Brunahólf" style="height:80px;width:240px;object-fit:contain;display:inline-block">'}
  </div>

  <div style="text-align:center;font-size:12px;color:#475569;margin:4px 0 14px">
    Helluhrauni 10, 220 Hafnarfjörður &nbsp;·&nbsp; Sími: 565 4080 &nbsp;·&nbsp; kt. 600508-0400
  </div>

  <hr style="border:none;border-top:1px solid #cbd5e1;margin:0 0 14px">

  <div style="font-size:14px;line-height:1.6;margin-bottom:14px">
    Skýrsla vegna úttektar á brunaslöngum, slökkvitækjum og öðrum búnaði (ef við á) hjá fyrirtækinu
    <strong>{{vidskiptavinur_nafn}}</strong> {{heimilisfang}} kt: {{kennitala}}
  </div>

  <div style="font-size:13px;font-style:italic;margin:8px 0 16px;color:#475569">
    Tæki voru yfirfarin af Slökkvitæki ehf í <strong>{{manudur_ar}}</strong>
  </div>

  <div style="margin:10px 0">
    <div style="padding:5px 0;font-size:13px;line-height:1.7">Slökkvitæki léttvatn 6-9 ltr. &nbsp;&nbsp;Fjöldi: <strong>{{fj_lettvatn}}</strong> &nbsp;&nbsp;Í lagi: <strong>{{ok_lettvatn}}</strong></div>
    <div style="padding:5px 0;font-size:13px;line-height:1.7">Slökkvitæki duft 2 kg. &nbsp;&nbsp;Fjöldi: <strong>{{fj_duft2}}</strong> &nbsp;&nbsp;Í lagi: <strong>{{ok_duft2}}</strong></div>
    <div style="padding:5px 0;font-size:13px;line-height:1.7">Slökkvitæki duft 6-12 kg. &nbsp;&nbsp;Fjöldi: <strong>{{fj_duft6_12}}</strong> &nbsp;&nbsp;Í lagi: <strong>{{ok_duft6_12}}</strong></div>
    <div style="padding:5px 0;font-size:13px;line-height:1.7">Slökkvitæki Co2 2 kg. &nbsp;&nbsp;Fjöldi: <strong>{{fj_co2_2}}</strong> &nbsp;&nbsp;Í lagi: <strong>{{ok_co2_2}}</strong></div>
    <div style="padding:5px 0;font-size:13px;line-height:1.7">Slökkvitæki Co2 5 kg. &nbsp;&nbsp;Fjöldi: <strong>{{fj_co2_5}}</strong> &nbsp;&nbsp;Í lagi: <strong>{{ok_co2_5}}</strong></div>
    <div style="padding:5px 0;font-size:13px;line-height:1.7">Brunaslöngur &nbsp;&nbsp;Fjöldi: <strong>{{fj_slongur}}</strong> &nbsp;&nbsp;Í lagi: <strong>{{ok_slongur}}</strong></div>
    <div style="padding:5px 0;font-size:13px;line-height:1.7">Eldvarnarteppi &nbsp;&nbsp;Fjöldi: <strong>{{fj_teppi}}</strong> &nbsp;&nbsp;Í lagi: <strong>{{ok_teppi}}</strong></div>
    <div style="padding:5px 0;font-size:13px;line-height:1.7">Reykskynjarar &nbsp;&nbsp;Fjöldi: <strong>{{fj_reyk}}</strong> &nbsp;&nbsp;Í lagi: <strong>{{ok_reyk}}</strong></div>
  </div>

  <div style="margin:18px 0 4px;font-size:14px;font-weight:700">Annað:</div>
  <div style="border:1px solid #cbd5e1;min-height:70px;padding:10px 12px;font-size:13px;border-radius:4px;line-height:1.6;white-space:pre-wrap">{{annad}}</div>

  <div style="margin:14px 0 4px;font-size:14px;font-weight:700">Athugasemdir:</div>
  <div style="border:1px solid #cbd5e1;min-height:50px;padding:10px 12px;font-size:13px;border-radius:4px;line-height:1.6;white-space:pre-wrap">{{athugasemdir}}</div>

  <div style="margin-top:30px">
    <div style="font-size:14px">Fyrir hönd Slökkvitæki ehf</div>
    <div style="height:50px;border-bottom:1px solid #0f172a;width:280px;margin-top:8px;display:flex;align-items:flex-end;padding-bottom:4px">{{sig_starfsmanns}}</div>
    <div style="font-size:13px;margin-top:4px;font-weight:600">{{starfsmadur}}</div>
  </div>

  <div style="margin-top:24px;padding-top:10px;border-top:1px solid #cbd5e1;text-align:center;font-size:11px;color:#64748b">
    Slökkvitæki ehf · kt. 600508-0400 · vsknr. 98107
  </div>
</div>`
    },
    {
      id: 'seed_arsskodun_brunakerfa',
      name: 'Ársskoðun brunakerfa (viðtökupróf)',
      type: 'arsskodun_brunakerfa',
      _seed: true,
      // 2026-05-13: Compressed to fit a single A4 page. Reduced paddings,
      // shrunk fonts (10pt body, 9pt table rows), smaller logo + signature
      // strip, tighter margins. The @page rule forces narrow print margins.
      html: `
<style>
  @media print { @page { size: A4; margin: 8mm 10mm } }
  .ab-doc { font-family: Arial, Helvetica, sans-serif; color:#0f172a; max-width:820px;
            margin:0 auto; padding:10px 14px 12px; background:#fff; border:1.5px solid #0f172a; }
  .ab-doc table { width:100%; border-collapse:collapse }
  .ab-doc .info-tbl td { border:1px solid #cbd5e1; padding:3px 6px; font-size:10px }
  .ab-doc .chk-tbl th, .ab-doc .chk-tbl td { border:1px solid #cbd5e1; padding:2px 5px; font-size:9.5px; line-height:1.25 }
  .ab-doc .chk-tbl th { background:#f1f5f9; text-align:left }
  .ab-doc .chk-tbl .c { text-align:center; font-size:11px; width:42px }
  .ab-doc .chk-tbl .sect { background:#fef3c7; font-weight:700 }
  .ab-doc .chk-tbl .ath { width:22% }
</style>
<div class="ab-doc">
  <div style="text-align:right;font-size:10px;color:#475569;margin-bottom:2px">Dags: <strong>{{dagsetning}}</strong></div>
  <div style="text-align:center;line-height:0;margin:2px 0 8px">${(window.SlokkLogo && SlokkLogo.imgHtml) ? SlokkLogo.imgHtml({heightPx:68, alt:"Slökkvitæki / Brunahólf"}) : '<img src="/img/logo.png?v=20260520b" alt="Slökkvitæki / Brunahólf" style="height:68px;width:204px;object-fit:contain;display:inline-block">'}</div>

  <div style="text-align:center;margin:2px 0 6px">
    <div style="font-size:15px;font-weight:800;line-height:1.1">Viðtökupróf / Árleg prófun · Brunaviðvörunarkerfi</div>
  </div>

  <table class="info-tbl" style="margin-bottom:4px">
    <tr>
      <td><strong>Verkkaupi:</strong> {{verkkaupi}}</td>
      <td><strong>Kennitala:</strong> {{kennitala}}</td>
      <td><strong>Sími:</strong> {{simi}}</td>
    </tr>
    <tr>
      <td><strong>Tengiliður:</strong> {{tengilidur}}</td>
      <td><strong>Heimilisf.:</strong> {{heimilisfang}}</td>
      <td><strong>Póstnr.:</strong> {{postnr}}</td>
    </tr>
    <tr>
      <td colspan="2"><strong>Prófun:</strong> {{profunarsvid}}</td>
      <td><strong>Tegund kerfis:</strong> {{tegund_kerfis}}</td>
    </tr>
  </table>

  <div style="margin:3px 0 5px;font-size:10px"><strong>Næsta skoðun:</strong> {{naesta_skodun}}</div>

  <table class="chk-tbl" style="margin-bottom:6px">
    <thead><tr>
      <th>Heiti</th><th class="c">Í lagi</th><th class="c">Ólagi</th><th class="ath">Athugasemd</th>
    </tr></thead>
    <tbody>
      <tr><td colspan="4" class="sect">Prófun á stjórnstöð</td></tr>
      <tr><td>Analog gildi lesin og yfirfarin á stjórnstöð</td><td class="c">{{chk_a1}}</td><td class="c">{{chk_a1n}}</td><td>{{ath_a1}}</td></tr>
      <tr><td>Skynjarar prófaðir frá stöð</td><td class="c">{{chk_a2}}</td><td class="c">{{chk_a2n}}</td><td>{{ath_a2}}</td></tr>
      <tr><td>Lampaprófun</td><td class="c">{{chk_a3}}</td><td class="c">{{chk_a3n}}</td><td>{{ath_a3}}</td></tr>
      <tr><td>Bilun ef skynjararás er rofin</td><td class="c">{{chk_a4}}</td><td class="c">{{chk_a4n}}</td><td>{{ath_a4}}</td></tr>
      <tr><td>Bilun ef aðvörunarrás er rofin</td><td class="c">{{chk_a5}}</td><td class="c">{{chk_a5n}}</td><td>{{ath_a5}}</td></tr>
      <tr><td>Bilun frá aðalaflgjafa ath.</td><td class="c">{{chk_a6}}</td><td class="c">{{chk_a6n}}</td><td>{{ath_a6}}</td></tr>
      <tr><td>Bilun frá varaaflgjafa ath.</td><td class="c">{{chk_a7}}</td><td class="c">{{chk_a7n}}</td><td>{{ath_a7}}</td></tr>
      <tr><td>Hleðsluspenna og straumnotkun mæld</td><td class="c">{{chk_a8}}</td><td class="c">{{chk_a8n}}</td><td>{{ath_a8}}</td></tr>
      <tr><td>Prófun útganga</td><td class="c">{{chk_a9}}</td><td class="c">{{chk_a9n}}</td><td>{{ath_a9}}</td></tr>
      <tr><td>Merkingar, þjónustubók og yfirlitsmynd í lagi</td><td class="c">{{chk_a10}}</td><td class="c">{{chk_a10n}}</td><td>{{ath_a10}}</td></tr>
      <tr><td>Rafhlöður (merking/dagsetning)</td><td class="c">{{chk_a11}}</td><td class="c">{{chk_a11n}}</td><td>{{rafhl_dags}}</td></tr>
      <tr><td colspan="4" class="sect">Prófun á jaðarbúnaði</td></tr>
      <tr><td>Reykskynjarar prófaðir með gasi</td><td class="c">{{chk_b1}}</td><td class="c">{{chk_b1n}}</td><td>{{ath_b1}}</td></tr>
      <tr><td>Hitaskynjarar prófaðir með hitagjafa</td><td class="c">{{chk_b2}}</td><td class="c">{{chk_b2n}}</td><td>{{ath_b2}}</td></tr>
      <tr><td>Prófun á öllum handboðum</td><td class="c">{{chk_b3}}</td><td class="c">{{chk_b3n}}</td><td>{{ath_b3}}</td></tr>
      <tr><td>Bilun þegar skynjari er fjarlægður (5% per rás)</td><td class="c">{{chk_b4}}</td><td class="c">{{chk_b4n}}</td><td>{{ath_b4}}</td></tr>
      <tr><td>Gaumljós athuguð</td><td class="c">{{chk_b5}}</td><td class="c">{{chk_b5n}}</td><td>{{ath_b5}}</td></tr>
      <tr><td>Bjöllur (hljóðprófun)</td><td class="c">{{chk_b6}}</td><td class="c">{{chk_b6n}}</td><td>{{ath_b6}}</td></tr>
      <tr><td>Hurðaseglar</td><td class="c">{{chk_b7}}</td><td class="c">{{chk_b7n}}</td><td>{{ath_b7}}</td></tr>
      <tr><td>Textar lesnir saman við númer og staðsetn.</td><td class="c">{{chk_b8}}</td><td class="c">{{chk_b8n}}</td><td>{{ath_b8}}</td></tr>
      <tr><td>Stýribúnaður (loftræsting, reyklúgur, sprinkler o.fl.)</td><td class="c">{{chk_b9}}</td><td class="c">{{chk_b9n}}</td><td>{{ath_b9}}</td></tr>
      <tr><td colspan="4" class="sect">Undirstöðvar</td></tr>
      <tr><td>Athuga hvort textar og boð skili sér</td><td class="c">{{chk_c1}}</td><td class="c">{{chk_c1n}}</td><td>{{ath_c1}}</td></tr>
      <tr><td>Merking á þjónustubók og yfirlitsmynd í lagi</td><td class="c">{{chk_c2}}</td><td class="c">{{chk_c2n}}</td><td>{{ath_c2}}</td></tr>
      <tr><td colspan="4" class="sect">Boðsendir</td></tr>
      <tr><td>Skilar brunaboð sér frá hverri rás</td><td class="c">{{chk_d1}}</td><td class="c">{{chk_d1n}}</td><td>{{ath_d1}}</td></tr>
      <tr><td>Skila bilunarboð sér</td><td class="c">{{chk_d2}}</td><td class="c">{{chk_d2n}}</td><td>{{ath_d2}}</td></tr>
      <tr><td>Skynjari tekinn úr sökkli</td><td class="c">{{chk_d3}}</td><td class="c">{{chk_d3n}}</td><td>{{ath_d3}}</td></tr>
      <tr><td>Ath útkallsleiðbeiningar og tengiliði</td><td class="c">{{chk_d4}}</td><td class="c">{{chk_d4n}}</td><td>{{ath_d4}}</td></tr>
    </tbody>
  </table>

  <div style="margin:4px 0 2px;font-size:10px"><strong>Prófun framkvæmd af:</strong> {{profun_af}}</div>

  <div style="margin:6px 0 2px;font-size:10px;font-weight:700">Athugasemdir:</div>
  <div style="border:1px solid #cbd5e1;min-height:34px;padding:4px 6px;font-size:10px;line-height:1.3;white-space:pre-wrap">{{athugasemdir}}</div>

  <div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:18px">
    <div>
      <div style="font-size:9px;color:#475569;margin-bottom:2px;font-weight:600">F.h. Slökkvitæki ehf:</div>
      <div style="height:32px;border-bottom:1px solid #0f172a;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px">{{sig_starfsmanns}}</div>
      <div style="font-size:10px;margin-top:2px;font-weight:600">{{starfsmadur}}</div>
    </div>
    <div>
      <div style="font-size:9px;color:#475569;margin-bottom:2px;font-weight:600">F.h. verkkaupa:</div>
      <div style="height:32px;border-bottom:1px solid #0f172a;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px">{{sig_verkkaupa}}</div>
      <div style="font-size:10px;margin-top:2px;font-weight:600">{{verkkaupi}}</div>
    </div>
  </div>

  <div style="margin-top:6px;padding-top:4px;border-top:1px solid #cbd5e1;text-align:center;font-size:8.5px;color:#64748b">
    Slökkvitæki ehf · Helluhrauni 10, 220 Hafnarfirði · kt. 600508-0400 · vsknr. 98107 · Sími 565-4080
  </div>
</div>`
    },
    {
      id: 'seed_tilbod',
      name: 'Tilboð í þjónustu',
      type: 'tilbod',
      _seed: true,
      html: `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:780px;margin:0 auto;padding:24px 32px 28px;background:#fff;border:2px solid #0f172a">
  <div style="text-align:center;margin-bottom:4px;line-height:0">
    ${(window.SlokkLogo && SlokkLogo.imgHtml) ? SlokkLogo.imgHtml({heightPx:90, alt:"Slökkvitæki / Brunahólf"}) : '<img src="/img/logo.png?v=20260520b" alt="Slökkvitæki / Brunahólf" style="height:90px;width:270px;object-fit:contain;display:inline-block">'}
  </div>

  <div style="text-align:right;font-size:13px;color:#475569;margin:0 0 6px">Dagsetning: {{dagsetning}}</div>

  <div style="text-align:center;margin:0 0 18px">
    <div style="font-size:24px;font-weight:800;letter-spacing:0.5px">Tilboð í þjónustu</div>
  </div>

  <hr style="border:none;border-top:1px solid #cbd5e1;margin:14px 0">

  <div style="font-size:14px;line-height:1.7;margin:14px 0">
    Hér með gerir <strong>Slökkvitæki ehf</strong>, kt: <strong>600508-0400</strong>, eftirfarandi tilboð í {{tilbod_lysing}} fyrir <strong>{{vidskiptavinur_nafn}}</strong>{{heimilisfang_kommu}}
  </div>

  <table style="width:100%;border-collapse:collapse;margin:18px 0">
    <thead>
      <tr style="background:#f1f5f9">
        <th style="border:1px solid #0f172a;padding:8px 10px;text-align:left;font-size:12px;font-weight:700">Vara</th>
        <th style="border:1px solid #0f172a;padding:8px 10px;text-align:center;font-size:12px;font-weight:700;width:80px">Magn</th>
        <th style="border:1px solid #0f172a;padding:8px 10px;text-align:right;font-size:12px;font-weight:700;width:120px">Verð pr. stk</th>
        <th style="border:1px solid #0f172a;padding:8px 10px;text-align:right;font-size:12px;font-weight:700;width:140px">Samt. í kr.</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="border:1px solid #cbd5e1;padding:7px 10px;font-size:13px">{{vara1}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:center;font-size:13px">{{magn1}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:right;font-size:13px">{{verd1}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:right;font-size:13px;font-weight:600">{{samtals1}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:7px 10px;font-size:13px">{{vara2}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:center;font-size:13px">{{magn2}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:right;font-size:13px">{{verd2}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:right;font-size:13px;font-weight:600">{{samtals2}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:7px 10px;font-size:13px">{{vara3}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:center;font-size:13px">{{magn3}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:right;font-size:13px">{{verd3}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:right;font-size:13px;font-weight:600">{{samtals3}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:7px 10px;font-size:13px">{{vara4}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:center;font-size:13px">{{magn4}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:right;font-size:13px">{{verd4}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:right;font-size:13px;font-weight:600">{{samtals4}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:7px 10px;font-size:13px">{{vara5}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:center;font-size:13px">{{magn5}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:right;font-size:13px">{{verd5}}</td><td style="border:1px solid #cbd5e1;padding:7px 10px;text-align:right;font-size:13px;font-weight:600">{{samtals5}}</td></tr>
      <tr style="background:#fef3c7"><td colspan="3" style="border:1px solid #0f172a;padding:9px 10px;font-size:14px;font-weight:700;text-align:right">Heildarverð m/VSK</td><td style="border:1px solid #0f172a;padding:9px 10px;text-align:right;font-size:15px;font-weight:800">{{heildarverd}}</td></tr>
    </tbody>
  </table>

  <div style="margin:14px 0;font-size:12px;color:#475569;font-style:italic">Athugið að öll verð eru með VSK.</div>

  <div style="margin:18px 0 4px;font-size:14px;font-weight:700">Athugasemdir:</div>
  <div style="border:1px solid #cbd5e1;min-height:50px;padding:10px;font-size:13px;border-radius:4px;line-height:1.5;white-space:pre-wrap">{{athugasemdir}}</div>

  <div style="margin-top:24px;font-size:14px;line-height:1.7">Með bestu kveðju.<br><strong>Slökkvitæki ehf</strong></div>

  <div style="margin-top:18px;padding-top:12px;border-top:1px solid #cbd5e1;text-align:center;font-size:11px;color:#64748b;line-height:1.6">
    Slökkvitæki ehf · Helluhrauni 10, 220 Hafnarfirði · vsknr. 98107<br>
    Netfang: eldklar@eldklar.is &nbsp;·&nbsp; Sími 565-4080
  </div>
</div>`
    },
    {
      id: 'seed_skipasamningur',
      name: 'Skoðun á slökkvibúnaði (skip — Samgöngustofu eyðublað)',
      type: 'skipaskodun',
      _seed: true,
      html: `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:820px;margin:0 auto;padding:20px 28px 24px;background:#fff;border:2px solid #0f172a">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:8px">
    <div style="line-height:0">${(window.SlokkLogo && SlokkLogo.imgHtml) ? SlokkLogo.imgHtml({heightPx:60, alt:"Slökkvitæki / Brunahólf"}) : '<img src="/img/logo.png?v=20260520b" alt="Slökkvitæki / Brunahólf" style="height:60px;width:180px;object-fit:contain;display:inline-block">'}</div>
    <div style="text-align:right;font-size:11px;color:#475569;line-height:1.4">
      Nr. 15.11.01.01 · útgáfa nr. 2<br>
      <strong style="color:#0f172a;font-size:13px">SKOÐUN Á SLÖKKVIBÚNAÐI</strong><br>
      <em>Fire Equipment Inspection</em>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:10px;font-size:11.5px">
    <tr>
      <td style="border:1px solid #cbd5e1;padding:5px 8px"><strong>Skipaskrárnúmer:</strong> {{skipaskrarnumer}}</td>
      <td style="border:1px solid #cbd5e1;padding:5px 8px"><strong>Official No.:</strong> {{official_no}}</td>
    </tr>
    <tr>
      <td style="border:1px solid #cbd5e1;padding:5px 8px"><strong>NAFN SKIPS:</strong> {{nafn_skips}}</td>
      <td style="border:1px solid #cbd5e1;padding:5px 8px"><strong>Vessel's name:</strong> {{vessel_name}}</td>
    </tr>
    <tr>
      <td style="border:1px solid #cbd5e1;padding:5px 8px"><strong>UMDÆMISNR.:</strong> {{umdaemisnr}}</td>
      <td style="border:1px solid #cbd5e1;padding:5px 8px"><strong>District No:</strong> {{district_no}}</td>
    </tr>
  </table>

  <div style="background:#f1f5f9;padding:6px 10px;font-size:13px;font-weight:700;margin:12px 0 4px">
    Slökkvibúnaður / <em>Fire fighting equipment</em>
  </div>
  <div style="font-size:12px;font-weight:600;margin-bottom:6px">HANDSLÖKKVITÆKI / Portable fire-extinguishers</div>

  <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:14px">
    <thead>
      <tr style="background:#f8fafc">
        <th style="border:1px solid #cbd5e1;padding:5px 6px;text-align:left">Fjöldi<br><em style="font-weight:400">Numbers</em></th>
        <th style="border:1px solid #cbd5e1;padding:5px 6px;text-align:left">Gerð*<br><em style="font-weight:400">Type*</em></th>
        <th style="border:1px solid #cbd5e1;padding:5px 6px;text-align:left">Númer<br><em style="font-weight:400">No.</em></th>
        <th style="border:1px solid #cbd5e1;padding:5px 6px;text-align:left">Stærð<br><em style="font-weight:400">Size</em></th>
        <th style="border:1px solid #cbd5e1;padding:5px 6px;text-align:left">Þrýstiprófun<br><em style="font-weight:400">Pressure test</em></th>
        <th style="border:1px solid #cbd5e1;padding:5px 6px;text-align:left">Endurhlaðið<br><em style="font-weight:400">Reloading date</em></th>
        <th style="border:1px solid #cbd5e1;padding:5px 6px;text-align:left">Vigtað kg.<br><em style="font-weight:400">Weight kg.</em></th>
        <th style="border:1px solid #cbd5e1;padding:5px 6px;text-align:center">Í lagi<br><em style="font-weight:400">In order</em></th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk1_fj}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk1_gerd}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk1_nr}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk1_str}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk1_thrysti}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk1_endurhl}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk1_vigt}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px;text-align:center">{{tk1_ok}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk2_fj}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk2_gerd}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk2_nr}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk2_str}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk2_thrysti}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk2_endurhl}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk2_vigt}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px;text-align:center">{{tk2_ok}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk3_fj}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk3_gerd}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk3_nr}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk3_str}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk3_thrysti}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk3_endurhl}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk3_vigt}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px;text-align:center">{{tk3_ok}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk4_fj}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk4_gerd}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk4_nr}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk4_str}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk4_thrysti}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk4_endurhl}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk4_vigt}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px;text-align:center">{{tk4_ok}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk5_fj}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk5_gerd}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk5_nr}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk5_str}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk5_thrysti}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk5_endurhl}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px">{{tk5_vigt}}</td><td style="border:1px solid #cbd5e1;padding:5px 6px;text-align:center">{{tk5_ok}}</td></tr>
    </tbody>
  </table>

  <div style="font-size:10.5px;color:#475569;font-style:italic;margin:6px 0 14px">
    * V: vatnstæki / water &nbsp;·&nbsp; K: kolsýrut. / Co₂ &nbsp;·&nbsp; Þ: þurrduft. / powder &nbsp;·&nbsp; H: halont. / halon &nbsp;·&nbsp; F: froðut. / foam
  </div>

  <div style="background:#f1f5f9;padding:6px 10px;font-size:13px;font-weight:700;margin:18px 0 8px">
    FASTUR SLÖKKVIBÚNAÐUR VÉLARÚMA OG FARMRÝMA<br>
    <em style="font-size:11px;font-weight:600">Fixed fire-extinguishing equipment in machinery spaces and holds</em>
  </div>

  <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px">
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px;width:40%"><strong>Tegund / Type:</strong></td><td style="border:1px solid #cbd5e1;padding:6px 10px">{{fast_tegund}}</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px"><strong>Gerð slökkviefnis / Type of extinguishing medium:</strong></td><td style="border:1px solid #cbd5e1;padding:6px 10px">{{fast_efni}}</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px"><strong>Fjöldi hylkja og stærð / Number and size of containers:</strong></td><td style="border:1px solid #cbd5e1;padding:6px 10px">{{fast_fj_str}}</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px"><strong>Þrýstiprófun hylkja / Cont. press. test:</strong></td><td style="border:1px solid #cbd5e1;padding:6px 10px">{{fast_thrysti}}</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px"><strong>Síðast endurhlaðin / Last reloading date:</strong></td><td style="border:1px solid #cbd5e1;padding:6px 10px">{{fast_endurhl}}</td></tr>
    <tr><td style="border:1px solid #cbd5e1;padding:6px 10px"><strong>Skoðun framkvæmd / Date of inspection:</strong></td><td style="border:1px solid #cbd5e1;padding:6px 10px">{{fast_skodun}}</td></tr>
  </table>

  <div style="margin:14px 0 4px;font-size:13px;font-weight:700">ATHUGASEMDIR / VIÐGERÐIR <em style="font-weight:400;color:#475569">/ Remarks / Repair:</em></div>
  <div style="border:1px solid #cbd5e1;min-height:60px;padding:10px;font-size:13px;border-radius:4px;line-height:1.5;white-space:pre-wrap">{{athugasemdir}}</div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:18px;font-size:13px">
    <div><strong>Staður</strong> <em style="color:#475569;font-weight:400">/ Place</em>: {{stadur}}</div>
    <div><strong>Dags.</strong> <em style="color:#475569;font-weight:400">/ Date of issue</em>: {{dagsetning}}</div>
  </div>

  <div style="margin-top:18px;padding:10px 14px;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;font-size:12px;font-weight:600;color:#92400e">
    VIÐURKENND SKOÐUNARSTÖÐ <em style="font-weight:400">/ Authorized service station</em><br>
    Slökkvitæki ehf · kt. 600508-0400
  </div>

  <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:30px">
    <div>
      <div style="font-size:12px;color:#475569;margin-bottom:4px;font-weight:600">Skoðunarmaður / <em style="font-weight:400">Surveyor</em>:</div>
      <div style="height:55px;border-bottom:1px solid #0f172a;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">{{sig_skodunarmadur}}</div>
      <div style="font-size:13px;margin-top:4px;font-weight:600">{{skodunarmadur}}</div>
    </div>
    <div>
      <div style="font-size:12px;color:#475569;margin-bottom:4px;font-weight:600">F.h. útgerðar / <em style="font-weight:400">For owner</em>:</div>
      <div style="height:55px;border-bottom:1px solid #0f172a;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">{{sig_utgerd}}</div>
      <div style="font-size:13px;margin-top:4px;font-weight:600">{{utgerd}}</div>
    </div>
  </div>

  <div style="margin-top:14px;padding-top:10px;border-top:1px solid #cbd5e1;font-size:10.5px;color:#64748b;line-height:1.5;font-style:italic">
    Frumrit sendist á útgerð. Skoðunaraðili varðveiti afrit í 5 ár. Senda skal Samgöngustofu afrit á samgongustofa@samgongustofa.is
  </div>

  <div style="margin-top:8px;text-align:center;font-size:11px;color:#64748b">
    Slökkvitæki ehf · Helluhrauni 10, 220 Hafnarfirði · vsknr. 98107 · sími 565-4080
  </div>
</div>`
    },
    {
      id: 'seed_stadfesting',
      name: 'Almenn staðfesting',
      type: 'stadfesting',
      _seed: true,
      html: `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:780px;margin:0 auto;padding:24px;border:2px solid #0f172a">
  <div style="text-align:center;margin-bottom:20px">
    <div style="font-size:24px;font-weight:800;letter-spacing:0.5px;margin:6px 0">Slökkvitæki ehf</div>
    <div style="font-size:13px;font-weight:600">Hleðsla — Sala — Þjónusta</div>
    <div style="font-size:12px;margin-top:4px">Helluhrauni 10, 220 Hafnarfirði · sími 565-4080</div>
    <div style="font-size:18px;font-weight:700;margin-top:18px;text-transform:uppercase;letter-spacing:1px">Staðfesting</div>
  </div>

  <div style="margin:18px 0;font-size:14px;line-height:1.7">
    <div><strong>Dagsetning:</strong> {{dagsetning}}</div>
  </div>

  <div style="margin:24px 0;font-size:15px;line-height:1.8">
    Hér með staðfestist að <strong>{{vidskiptavinur_nafn}}</strong> (kt. {{kennitala}})
    hefur fengið þjónustu hjá Slökkvitæki ehf eins og lýst er hér að neðan:
  </div>

  <div style="margin:18px 0;padding:14px;background:#f8fafc;border-left:4px solid #0f172a;font-size:14px;line-height:1.6">
    {{lysing}}
  </div>

  <div style="margin:18px 0;font-size:14px;line-height:1.7">
    <strong>Frekari upplýsingar:</strong>
  </div>
  <div style="border:1px solid #cbd5e1;min-height:80px;padding:10px;font-size:14px;border-radius:4px">{{frekari_upplysingar}}</div>

  <div style="margin-top:50px">
    <div style="border-bottom:1px solid #0f172a;height:32px;width:280px"></div>
    <div style="font-size:12px;margin-top:4px">F.h. Slökkvitæki ehf · {{starfsmadur}}</div>
  </div>

  <div style="text-align:center;font-size:11px;color:#64748b;margin-top:30px;padding-top:12px;border-top:1px solid #cbd5e1">
    Slökkvitæki ehf · kt. 600508-0400 · vsknr. 98107 · 565-4080 · eldklar@eldklar.is
  </div>
</div>`
    }
  ]; }

  // ── Field labels (Icelandic-friendly) ──────────────────────────────────────
  const FIELD_LABELS = {
    dagsetning: 'Dagsetning',
    vidskiptavinur_nafn: 'Viðskiptavinur (nafn)',
    kennitala: 'Kennitala',
    heimilisfang: 'Heimilisfang',
    tengilidur: 'Tengiliður',
    simi: 'Sími',
    netfang: 'Netfang',
    taeki_lysing: 'Tæki / lýsing',
    fjoldi: 'Fjöldi',
    tidni: 'Þjónustutíðni',
    verd: 'Verð (án vsk., kr)',
    athugasemdir: 'Athugasemdir',
    utgerd: 'Útgerð / eigandi',
    skip_nafn: 'Skip (nafn)',
    skipsnr: 'Skipsnúmer',
    heimahofn: 'Heimahöfn',
    skipstjori: 'Skipstjóri / tengiliður',
    fj_slokkvitaekja: 'Fjöldi slökkvitækja',
    fj_slonguhjola: 'Fjöldi slönguhjóla',
    fj_reykskynjara: 'Fjöldi reykskynjara',
    annad_taeki: 'Annað',
    lysing: 'Lýsing',
    frekari_upplysingar: 'Frekari upplýsingar',
    starfsmadur: 'Starfsmaður (Slökkvitæki ehf)',
    annad: 'Annað',
    chk_slokkvitaeki: 'Handslökkvitæki',
    chk_reykskynjarar: 'Reykskynjarar',
    chk_brunaslongur: 'Brunaslöngur',
    chk_brunavidvorun: 'Brunaviðvörunarkerfi',
    chk_slokkvikerfi: 'Slökkvikerfi',
    netfang: 'Netfang viðskiptavinar (samþykki)',
    sig_slokkvitaeki: 'Undirritun (Slökkvitæki ehf)',
    sig_vidskiptavinur: 'Undirritun (viðskiptavinur)',
    sig_starfsmanns: 'Undirritun starfsmanns',
    sig_verkkaupa: 'Undirritun verkkaupa',
    fnr: 'Fnr.',
    manudur_ar: 'Mánuður og ár',
    fj_lettvatn: 'Fjöldi — léttvatn 6-9 ltr.',
    ok_lettvatn: 'Í lagi — léttvatn',
    fj_duft2: 'Fjöldi — duft 2 kg',
    ok_duft2: 'Í lagi — duft 2 kg',
    fj_duft6_12: 'Fjöldi — duft 6-12 kg',
    ok_duft6_12: 'Í lagi — duft 6-12 kg',
    fj_co2_2: 'Fjöldi — CO₂ 2 kg',
    ok_co2_2: 'Í lagi — CO₂ 2 kg',
    fj_co2_5: 'Fjöldi — CO₂ 5 kg',
    ok_co2_5: 'Í lagi — CO₂ 5 kg',
    fj_slongur: 'Fjöldi — brunaslöngur',
    ok_slongur: 'Í lagi — brunaslöngur',
    fj_teppi: 'Fjöldi — eldvarnarteppi',
    ok_teppi: 'Í lagi — eldvarnarteppi',
    fj_reyk: 'Fjöldi — reykskynjarar',
    ok_reyk: 'Í lagi — reykskynjarar',
    annad: 'Annað',
    verkkaupi: 'Verkkaupi',
    postnr: 'Póstnúmer',
    profunarsvid: 'Prófun (allt kerfið / hluti af kerfi)',
    tegund_kerfis: 'Tegund kerfis',
    naesta_skodun: 'Næsta skoðun kerfis',
    profun_af: 'Prófun framkvæmd af',
    tilbod_lysing: 'Lýsing á því sem tilboðið nær yfir',
    heimilisfang_kommu: 'Heimilisfang (með kommu á undan, t.d. „, Kleppsmýrarvegur 8, 104 Reykjavík")',
    vara1: 'Vara 1', magn1: 'Magn 1', verd1: 'Verð pr. stk 1', samtals1: 'Samtals 1',
    vara2: 'Vara 2', magn2: 'Magn 2', verd2: 'Verð pr. stk 2', samtals2: 'Samtals 2',
    vara3: 'Vara 3', magn3: 'Magn 3', verd3: 'Verð pr. stk 3', samtals3: 'Samtals 3',
    vara4: 'Vara 4', magn4: 'Magn 4', verd4: 'Verð pr. stk 4', samtals4: 'Samtals 4',
    vara5: 'Vara 5', magn5: 'Magn 5', verd5: 'Verð pr. stk 5', samtals5: 'Samtals 5',
    heildarverd: 'Heildarverð (m/VSK)',
    skipaskrarnumer: 'Skipaskrárnúmer',
    official_no: 'Official No.',
    nafn_skips: 'Nafn skips',
    vessel_name: 'Vessel name',
    umdaemisnr: 'Umdæmisnr.',
    district_no: 'District No.',
    fast_tegund: 'Fastur — Tegund',
    fast_efni: 'Fastur — Slökkviefni',
    fast_fj_str: 'Fastur — Fjöldi og stærð hylkja',
    fast_thrysti: 'Fastur — Þrýstiprófun',
    fast_endurhl: 'Fastur — Síðast endurhlaðið',
    fast_skodun: 'Fastur — Dags. skoðunar',
    stadur: 'Staður',
    skodunarmadur: 'Skoðunarmaður (nafn)',
    sig_skodunarmadur: 'Undirritun skoðunarmanns',
    sig_utgerd: 'Undirritun útgerðar'
  };

  // Field types — special prefixes get special UI controls + render output:
  //   chk_*  → checkbox in form, ☐ / ☒ in output
  //   sig_*  → signature pad in form, embedded <img> in output
  //   long-text fields (athugasemdir/lysing/frekari/annad/notes) → textarea
  //   default → text input
  function fieldType(key) {
    if (key.startsWith('chk_')) return 'checkbox';
    if (key.startsWith('sig_')) return 'signature';
    if (/(athugasemdir|lysing|frekari|annad|notes|texti|skilmal)/i.test(key)) return 'long';
    if (key === 'dagsetning') return 'date';
    return 'text';
  }

  function fieldLabel(key) {
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    let k = key;
    // Strip type prefix for cleaner label
    if (k.startsWith('chk_')) k = k.slice(4);
    if (k.startsWith('sig_')) k = 'Undirritun ' + k.slice(4);
    return k.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
  }

  function extractFields(html) {
    const fields = [];
    const seen = new Set();
    const re = /\{\{([^}]+)\}\}/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const key = m[1].trim();
      if (!seen.has(key)) {
        seen.add(key);
        fields.push({ key, label: fieldLabel(key), type: fieldType(key) });
      }
    }
    return fields;
  }

  function fillTemplate(html, values, opts) {
    // 2026-05-13: `opts.forPrint=true` renders empty fields as truly empty
    // (no helper `[Label]` placeholder text). Use this when printing or
    // saving — the helper text belongs only in the on-screen editor preview
    // so the user knows which boxes to fill.
    const forPrint = !!(opts && opts.forPrint);
    return html.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const k = key.trim();
      const t = fieldType(k);
      const v = values[k];

      if (t === 'checkbox') {
        const glyph = v ? '☒' : '☐';
        // 2026-05-20: in the editor preview, render checkboxes as click-
        // targets so the user can toggle them by tapping the box itself
        // (no need to hunt for the matching field on the left). On print
        // we keep the plain glyph so no interactive attributes leak in.
        if (forPrint) {
          return '<span style="font-size:18px;line-height:1">' + glyph + '</span>';
        }
        return '<span class="_dt-chk" data-chk-field="' + esc(k) + '" ' +
          'role="checkbox" aria-checked="' + (v ? 'true' : 'false') + '" tabindex="0" ' +
          'style="font-size:20px;line-height:1;cursor:pointer;user-select:none;padding:2px 4px;border-radius:4px;display:inline-block">' +
          glyph +
        '</span>';
      }

      if (t === 'signature') {
        if (v && typeof v === 'string' && v.startsWith('data:image/')) {
          return '<img src="' + v + '" alt="undirritun" style="max-height:55px;max-width:100%;display:inline-block">';
        }
        return ''; // empty when no signature drawn
      }

      if (v != null && v !== '') return esc(v);
      // Empty field: hide the placeholder hint when printing/saving
      return forPrint ? '' : '<span style="color:#94a3b8;font-style:italic">[' + esc(fieldLabel(k)) + ']</span>';
    });
  }

  function getTemplates() {
    const stored = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || [];
    const userTemplates = Array.isArray(stored) ? stored : [];
    // Seeds first, then user-added
    return buildSeedTemplates().concat(userTemplates);
  }

  // 2026-05-20: Hidden-template handling. User templates carry a `hidden`
  // boolean directly. Seeds are read-only constants so we track hidden seed
  // IDs in a separate AppSettings list. isHidden() works for both.
  const HIDDEN_KEY = 'document_templates_hidden';
  function getHiddenSeedIds() {
    const stored = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(HIDDEN_KEY)) || [];
    return Array.isArray(stored) ? stored : [];
  }
  function isHidden(t) {
    if (!t) return false;
    if (t._seed) return getHiddenSeedIds().indexOf(t.id) >= 0;
    return !!t.hidden;
  }
  async function setHidden(id, hidden) {
    const t = getTemplates().find(x => x.id === id);
    if (!t) return false;
    if (t._seed) {
      const cur = getHiddenSeedIds().slice();
      const idx = cur.indexOf(id);
      if (hidden && idx < 0) cur.push(id);
      else if (!hidden && idx >= 0) cur.splice(idx, 1);
      if (!window.AppSettings || !window.AppSettings.save) return false;
      return await window.AppSettings.save({ [HIDDEN_KEY]: cur });
    }
    // User template — mutate and save.
    t.hidden = !!hidden;
    return await saveUserTemplate(t);
  }

  async function saveUserTemplate(t) {
    if (!window.AppSettings || !window.AppSettings.save) {
      alert('AppSettings ekki tilbúið');
      return false;
    }
    const stored = window.AppSettings.path(STORAGE_KEY) || [];
    const list = Array.isArray(stored) ? stored.slice() : [];
    const idx = list.findIndex(x => x.id === t.id);
    if (idx >= 0) list[idx] = t; else list.push(t);
    return await window.AppSettings.save({ [STORAGE_KEY]: list });
  }

  async function deleteUserTemplate(id) {
    if (!window.AppSettings || !window.AppSettings.save) return false;
    const stored = window.AppSettings.path(STORAGE_KEY) || [];
    const list = Array.isArray(stored) ? stored.slice() : [];
    const next = list.filter(x => x.id !== id);
    return await window.AppSettings.save({ [STORAGE_KEY]: next });
  }

  // ── Filled-document persistence (Þjónustusamningar etc.) ──────────────────
  function getFilledList() {
    const stored = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(FILLED_KEY)) || [];
    return Array.isArray(stored) ? stored : [];
  }
  async function saveFilled(rec) {
    if (!window.AppSettings || !window.AppSettings.save) {
      alert('AppSettings ekki tilbúið');
      return false;
    }
    const list = getFilledList().slice();
    const idx = list.findIndex(x => x.id === rec.id);
    if (idx >= 0) list[idx] = rec; else list.push(rec);
    return await window.AppSettings.save({ [FILLED_KEY]: list });
  }
  async function deleteFilled(id) {
    if (!window.AppSettings || !window.AppSettings.save) return false;
    const next = getFilledList().filter(x => x.id !== id);
    return await window.AppSettings.save({ [FILLED_KEY]: next });
  }
  function fmtDateShort(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2,'0') + '.' + String(d.getMonth()+1).padStart(2,'0') + '.' + d.getFullYear();
  }

  // ── UI: Section in Samningar view ──────────────────────────────────────────
  function injectSection() {
    const main = document.querySelector('#view-samningar #ct-main');
    if (!main) return;
    if (main.querySelector('._dt-section')) return;

    const section = document.createElement('div');
    section.className = '_dt-section';
    section.style.cssText = 'max-width:1180px;margin:24px auto 0;padding-top:18px;border-top:1px dashed #e2e8f0';
    section.innerHTML = renderSection();
    main.appendChild(section);
    wireSection(section);

    // 2026-05-13: Filled-documents section below the templates list
    if (!main.querySelector('._dt-filled-section')) {
      const filled = document.createElement('div');
      filled.className = '_dt-filled-section';
      filled.style.cssText = 'max-width:1180px;margin:24px auto 0;padding-top:18px;border-top:1px dashed #e2e8f0';
      filled.innerHTML = renderFilledSection();
      main.appendChild(filled);
      wireFilledSection(filled);
    }
  }

  // 2026-07-11 (verkefnalisti): listinn fellanlegur — valið munað per tæki.
  function filledOpen(){ try { return localStorage.getItem('dt_filled_open') !== '0'; } catch(_){ return true; } }
  function toggleFilled(){
    try { localStorage.setItem('dt_filled_open', filledOpen() ? '0' : '1'); } catch(_){}
    refreshFilledSection();
  }

  function renderFilledSection() {
    const list = getFilledList()
      .slice()
      .sort((a, b) => (b.updated_at || b.created_at || '').localeCompare(a.updated_at || a.created_at || ''));
    if (!list.length) {
      return '' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<div><h2 style="margin:0;font-size:18px;color:#0f172a">📁 Vistuð skjöl</h2>' +
          '<div style="font-size:12px;color:#64748b;margin-top:2px">Útfyllt sniðmát birtast hér eftir að þú smellir „💾 Vista í kerfi" í forskoðunarglugganum.</div></div>' +
        '</div>' +
        '<div style="background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;padding:24px;color:#94a3b8;font-style:italic;font-size:13px;text-align:center">Engin vistuð skjöl ennþá.</div>';
    }
    const rows = list.map(rec => {
      const tmpl = getTemplates().find(x => x.id === rec.template_id);
      const tName = tmpl ? tmpl.name : (rec.template_name || 'Sniðmát');
      return '' +
        '<tr data-fid="' + esc(rec.id) + '">' +
          '<td style="padding:9px 12px;font-weight:600;color:#0f172a">' + esc(rec.name || tName) + '</td>' +
          '<td style="padding:9px 12px;color:#475569">' + esc(tName) + '</td>' +
          '<td style="padding:9px 12px;color:#475569">' + esc(rec.customer || '—') + '</td>' +
          '<td style="padding:9px 12px;color:#475569;font-family:monospace;font-size:12px">' + esc(rec.kennitala || '—') + '</td>' +
          '<td style="padding:9px 12px;color:#64748b;font-size:12px">' + esc(fmtDateShort(rec.updated_at || rec.created_at)) + '</td>' +
          '<td style="padding:6px 12px;text-align:right;white-space:nowrap">' +
            '<button class="_dt-filled-open" data-fid="' + esc(rec.id) + '" type="button" style="padding:6px 12px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font:inherit;font-size:12px;font-weight:600;margin-right:4px">📝 Opna</button>' +
            '<button class="_dt-filled-del" data-fid="' + esc(rec.id) + '" type="button" title="Eyða" style="padding:6px 10px;background:#fff;color:#dc2626;border:1px solid #fecaca;border-radius:6px;cursor:pointer;font:inherit;font-size:13px">✕</button>' +
          '</td>' +
        '</tr>';
    }).join('');
    const open = filledOpen();
    return '' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:10px;flex-wrap:wrap">' +
        '<div><h2 style="margin:0;font-size:18px;color:#0f172a">📁 Vistuð skjöl <span style="font-size:12px;color:#64748b;font-weight:500">· ' + list.length + '</span></h2>' +
        '<div style="font-size:12px;color:#64748b;margin-top:2px">Þjónustusamningar, tilboð og skýrslur sem þú hefur vistað. Smelltu á „Opna" til að halda áfram eða endurprenta.</div></div>' +
        '<button class="_dt-filled-toggle" type="button" style="padding:8px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;cursor:pointer;font:inherit;font-size:13px;font-weight:600;color:#334155;box-shadow:0 1px 3px rgba(0,0,0,.04)">' +
          '<span style="opacity:.6">' + (open ? '▾' : '▸') + '</span> ' + (open ? 'Fela listann' : 'Sýna listann (' + list.length + ')') +
        '</button>' +
      '</div>' +
      '<div style="' + (open ? '' : 'display:none;') + 'background:#fff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04)">' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px">' +
          '<thead><tr style="background:#f8fafc;text-align:left">' +
            '<th style="padding:9px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Skjal</th>' +
            '<th style="padding:9px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Sniðmát</th>' +
            '<th style="padding:9px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Viðskiptavinur</th>' +
            '<th style="padding:9px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Kennitala</th>' +
            '<th style="padding:9px 12px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.04em">Dags</th>' +
            '<th style="padding:9px 12px"></th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>';
  }

  function wireFilledSection(section) {
    section.addEventListener('click', async e => {
      const tglBtn = e.target.closest('._dt-filled-toggle');
      if (tglBtn) { e.stopPropagation(); toggleFilled(); return; }
      const openBtn = e.target.closest('._dt-filled-open');
      const delBtn  = e.target.closest('._dt-filled-del');
      if (openBtn) {
        e.stopPropagation();
        const rec = getFilledList().find(x => x.id === openBtn.dataset.fid);
        if (rec) openTemplateForm(rec.template_id, { filledId: rec.id });
        return;
      }
      if (delBtn) {
        e.stopPropagation();
        const id = delBtn.dataset.fid;
        const rec = getFilledList().find(x => x.id === id);
        if (rec && confirm('Eyða „' + (rec.name || 'skjali') + '"?')) {
          await deleteFilled(id);
          refreshFilledSection();
        }
      }
    });
  }

  function refreshFilledSection() {
    const section = document.querySelector('._dt-filled-section');
    if (!section) { injectSection(); return; }
    section.innerHTML = renderFilledSection();
    wireFilledSection(section);
  }

  function renderSection() {
    const templates = getTemplates();
    const cards = templates.map(t => {
      const isSeed = !!t._seed;
      const hidden = isHidden(t);
      const cardStyle = 'background:#fff;border:1px solid ' + (hidden ? '#cbd5e1' : '#e2e8f0') +
        ';border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px;box-shadow:0 1px 3px rgba(0,0,0,0.04)' +
        (hidden ? ';opacity:.6' : '');
      const hiddenBadge = hidden
        ? '<span title="Birtist ekki í vali í brunakerfi/Fyrirtæki" style="font-size:9px;font-weight:700;background:#f1f5f9;color:#475569;padding:2px 6px;border-radius:99px;text-transform:uppercase;letter-spacing:0.04em;margin-left:4px">🚫 Falið</span>'
        : '';
      return '' +
      '<div class="_dt-card" style="' + cardStyle + '">' +
        '<div style="display:flex;justify-content:space-between;align-items:start;gap:8px;flex-wrap:wrap">' +
          '<div style="font-weight:700;font-size:14px;color:#0f172a;line-height:1.3;flex:1;min-width:0">' + esc(t.name) + '</div>' +
          '<div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">' +
            (isSeed ? '<span style="font-size:9px;font-weight:700;background:#e0e7ff;color:#3730a3;padding:2px 6px;border-radius:99px;text-transform:uppercase;letter-spacing:0.04em">forsniðið</span>'
                    : '<span style="font-size:9px;font-weight:700;background:#dcfce7;color:#166534;padding:2px 6px;border-radius:99px;text-transform:uppercase;letter-spacing:0.04em">eigið</span>') +
            hiddenBadge +
          '</div>' +
        '</div>' +
        '<div style="font-size:11px;color:#64748b">' + extractFields(t.html).length + ' reitir til útfyllingar</div>' +
        // 2026-05-20: hide-from-picker checkbox. When ticked, the template
        // stops showing up in the brunakerfi/Fyrirtæki sniðmáta-veljara,
        // but stays editable here in Samningar.
        '<label style="display:flex;align-items:center;gap:7px;font-size:12px;color:#475569;cursor:pointer;user-select:none;padding:5px 0">' +
          '<input class="_dt-hide" type="checkbox" data-id="' + esc(t.id) + '"' + (hidden ? ' checked' : '') + ' style="width:15px;height:15px;cursor:pointer">' +
          '<span>Falið — birtist ekki í vali</span>' +
        '</label>' +
        '<div style="display:flex;gap:6px;margin-top:auto">' +
          '<button class="_dt-open btn btn-primary btn-sm" data-id="' + esc(t.id) + '" style="flex:1">📝 Opna og útfylla</button>' +
          // 2026-05-13: Seed templates get an "Afrita" button (clone into an
          // editable user-template). User-templates keep edit/delete.
          (isSeed ? '<button class="_dt-clone btn btn-outline btn-sm" data-id="' + esc(t.id) + '" title="Afrita sem mitt eigið sniðmát sem hægt er að breyta">📋</button>' : '') +
          (!isSeed ? '<button class="_dt-edit btn btn-outline btn-sm" data-id="' + esc(t.id) + '" title="Breyta sniðmáti">✎</button>' : '') +
          (!isSeed ? '<button class="_dt-del btn btn-outline btn-sm" data-id="' + esc(t.id) + '" style="color:#dc2626;border-color:#fecaca" title="Eyða">✕</button>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    return '' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">' +
        '<div>' +
          '<h2 style="margin:0;font-size:18px;color:#0f172a">📋 Skjalasniðmát</h2>' +
          '<div style="font-size:12px;color:#64748b;margin-top:2px">Opnaðu sniðmát, fylltu reitina og prentaðu — eigin sniðmát eru samstillt milli tækja.</div>' +
        '</div>' +
        '<button class="_dt-add btn btn-primary" style="padding:9px 16px">+ Bæta við sniðmáti</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">' + cards + '</div>';
  }

  function wireSection(section) {
    section.addEventListener('click', e => {
      const openBtn  = e.target.closest('._dt-open');
      const editBtn  = e.target.closest('._dt-edit');
      const delBtn   = e.target.closest('._dt-del');
      const addBtn   = e.target.closest('._dt-add');
      const cloneBtn = e.target.closest('._dt-clone');
      if (openBtn) { e.stopPropagation(); openTemplateForm(openBtn.dataset.id); return; }
      if (editBtn) { e.stopPropagation(); openTemplateEditor(editBtn.dataset.id); return; }
      if (delBtn)  {
        e.stopPropagation();
        const id = delBtn.dataset.id;
        const t = getTemplates().find(x => x.id === id);
        if (t && confirm('Eyða sniðmáti "' + t.name + '"?')) {
          deleteUserTemplate(id).then(() => refreshSection());
        }
        return;
      }
      if (cloneBtn) { e.stopPropagation(); cloneSeedTemplate(cloneBtn.dataset.id); return; }
      if (addBtn)   { e.stopPropagation(); openTemplateEditor(null); return; }
    });
    // 2026-05-20: hide-from-picker checkbox change handler.
    section.addEventListener('change', async e => {
      const cb = e.target.closest('._dt-hide');
      if (!cb) return;
      e.stopPropagation();
      const ok = await setHidden(cb.dataset.id, cb.checked);
      if (!ok) {
        alert('Tókst ekki að vista földunarstöðu.');
        cb.checked = !cb.checked;
        return;
      }
      if (window.Toast && Toast.show) {
        Toast.show(cb.checked ? '🚫 Sniðmát falið — birtist ekki í vali' : '✓ Sniðmát birt aftur');
      }
      refreshSection();
    });
  }

  // 2026-05-13: Clone a forsniðið (seed) template into an editable
  // user-template. The new template is identical in content + fields, but
  // marked as eigið so it can be modified via the editor without touching
  // the originals. After saving, opens the editor on the new copy.
  async function cloneSeedTemplate(seedId) {
    const seed = getTemplates().find(x => x.id === seedId);
    if (!seed) { alert('Sniðmát fannst ekki'); return; }
    const baseName = (seed.name || 'Sniðmát') + ' (afrit)';
    // Avoid clashing names if the user clones the same template twice
    const existing = getTemplates().map(x => (x.name || '').toLowerCase());
    let candidate = baseName;
    let n = 2;
    while (existing.includes(candidate.toLowerCase())) {
      candidate = (seed.name || 'Sniðmát') + ' (afrit ' + n + ')';
      n++;
    }
    const clone = {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      name: candidate,
      type: seed.type || 'eigid',
      html: seed.html,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      cloned_from: seedId
      // NOTE: no _seed flag — that's what makes the editor allow it
    };
    const ok = await saveUserTemplate(clone);
    if (!ok) { alert('Villa við vistun afrits.'); return; }
    if (window.Toast && Toast.show) Toast.show('✓ „' + candidate + '" búið til — opna ritil…');
    refreshSection();
    // Slight delay so the section rebuild settles before the editor opens
    setTimeout(() => openTemplateEditor(clone.id), 60);
  }

  function refreshSection() {
    const section = document.querySelector('._dt-section');
    if (!section) { injectSection(); return; }
    section.innerHTML = renderSection();
    wireSection(section);
  }

  // ── Form modal: fill in placeholders → preview/print ──────────────────────
  function openTemplateForm(templateId, opts) {
    const t = getTemplates().find(x => x.id === templateId);
    if (!t) { alert('Sniðmát fannst ekki'); return; }

    // 2026-05-13: If opening an existing filled doc, hydrate its values.
    // Otherwise create a fresh form, defaulting dagsetning to today.
    const existing = (opts && opts.filledId)
      ? getFilledList().find(x => x.id === opts.filledId)
      : null;

    const today = new Date();
    const dStr = String(today.getDate()).padStart(2,'0') + '.' + String(today.getMonth()+1).padStart(2,'0') + '.' + today.getFullYear();

    const fields = extractFields(t.html);
    const values = {};
    if (existing && existing.values) {
      Object.assign(values, existing.values);
    } else {
      fields.forEach(f => {
        if (f.key === 'dagsetning') values[f.key] = dStr;
      });
      // 2026-05-31: callers (e.g. the company detail page) can pre-fill fields
      // such as vidskiptavinur_nafn / kennitala / heimilisfang via opts.prefill.
      // Values stay fully editable in the form.
      if (opts && opts.prefill) {
        Object.keys(opts.prefill).forEach(k => {
          if (opts.prefill[k] != null && opts.prefill[k] !== '') values[k] = opts.prefill[k];
        });
      }
    }
    // Track id of the filled doc we're editing (null = new)
    let filledId = existing ? existing.id : null;
    let filledName = existing ? (existing.name || '') : '';

    let dlg = document.getElementById('_dt-form-modal');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_dt-form-modal';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100020;background:rgba(15,23,42,0.6);display:flex;align-items:center;justify-content:center;padding:16px';

    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.3);width:min(1100px,calc(100vw - 24px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 20px;border-bottom:1px solid #e2e8f0;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<h3 style="margin:0;font-size:16px;font-weight:700">📝 ' + esc(t.name) + '</h3>' +
          '<button id="_dt-x" type="button" style="background:none;border:none;font-size:22px;color:#cbd5e1;cursor:pointer;padding:2px 8px">✕</button>' +
        '</div>' +
        '<div style="flex:1;display:grid;grid-template-columns:340px 1fr;overflow:hidden;min-height:0">' +
          '<div id="_dt-form" style="padding:16px;overflow:auto;background:#f8fafc;border-right:1px solid #e2e8f0"></div>' +
          '<div id="_dt-preview" style="padding:18px;overflow:auto;background:#fff"></div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 20px;border-top:1px solid #e2e8f0;background:#f8fafc;flex-wrap:wrap">' +
          '<button id="_dt-cancel" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Loka</button>' +
          // 2026-06-30: Senda link á kúnna — generates a tokenized fill URL
          // via brunaholf /api/skoda and copies it to clipboard. Visible only
          // for the Ársskoðun brunakerfa template (the remote-fill flow).
          (t.type === 'arsskodun_brunakerfa'
            ? '<button id="_dt-sendlink" type="button" title="Búa til tokenized tengil og senda kúnnanum til útfyllingar í síma" style="padding:9px 16px;background:#0ea5e9;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">📨 Senda link á kúnna</button>'
            : '') +
          // 2026-05-13: Vista í kerfi — saves the filled-in values into
          // AppSettings.skjalasnidmat_filled so the doc can be reopened
          // and edited later from the "Vistuð skjöl" list in Samningar.
          '<button id="_dt-save" type="button" title="Vista útfyllt skjal í kerfið (Vistuð skjöl listi)" style="padding:9px 16px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">💾 Vista í kerfi</button>' +
          // 2026-05-13: Second print button — forces signature fields blank
          // so you can print a clean copy for pen signing, regardless of what
          // has been drawn in the signature canvases.
          '<button id="_dt-print-blank" type="button" title="Prenta tóma undirskriftarreiti til að skrifa undir með penna" style="padding:9px 16px;background:#fff;color:#0f172a;border:1px solid #0f172a;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">✍️ Til undirritunar (auður)</button>' +
          '<button id="_dt-print" type="button" title="Prenta með rafrænni undirskrift (það sem þú teiknaðir)" style="padding:9px 18px;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">🖨 Prenta (rafrænt)</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_dt-x').addEventListener('click', close);
    dlg.querySelector('#_dt-cancel').addEventListener('click', close);

    const formEl = dlg.querySelector('#_dt-form');
    const previewEl = dlg.querySelector('#_dt-preview');

    if (!fields.length) {
      formEl.innerHTML = '<div style="color:#64748b;font-size:13px;padding:12px">Engir reitir í þessu sniðmáti — beint að prenta.</div>';
    } else {
      formEl.innerHTML = '<div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px">Reitir til útfyllingar</div>' +
        fields.map(f => {
          const v = values[f.key] || '';
          if (f.type === 'checkbox') {
            return '<div style="margin-bottom:8px">' +
              '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#0f172a;cursor:pointer;padding:8px 10px;background:#fff;border:1px solid #e2e8f0;border-radius:6px">' +
                '<input type="checkbox" data-field="' + esc(f.key) + '" data-type="checkbox" ' + (v ? 'checked' : '') + ' style="width:18px;height:18px;cursor:pointer;flex-shrink:0">' +
                '<span>' + esc(f.label) + '</span>' +
              '</label>' +
            '</div>';
          }
          if (f.type === 'signature') {
            return '<div style="margin-bottom:14px">' +
              '<label style="display:block;font-size:11px;font-weight:600;color:#475569;margin-bottom:3px">' + esc(f.label) + '</label>' +
              '<div data-sig-field="' + esc(f.key) + '" class="_dt-sig-wrap" style="border:1px dashed #94a3b8;border-radius:6px;background:#fff;position:relative;height:90px;cursor:crosshair">' +
                '<canvas class="_dt-sig-canvas" width="320" height="90" style="display:block;width:100%;height:100%;touch-action:none"></canvas>' +
                '<div class="_dt-sig-placeholder" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:#94a3b8;pointer-events:none">Skrifaðu undirritun hér</div>' +
              '</div>' +
              '<div style="display:flex;gap:6px;margin-top:4px">' +
                '<button class="_dt-sig-clear" data-sig="' + esc(f.key) + '" type="button" style="font-size:11px;padding:4px 10px;background:#fff;border:1px solid #cbd5e1;border-radius:5px;cursor:pointer;color:#475569">↻ Hreinsa</button>' +
              '</div>' +
            '</div>';
          }
          if (f.type === 'long') {
            return '<div style="margin-bottom:12px">' +
              '<label style="display:block;font-size:11px;font-weight:600;color:#475569;margin-bottom:3px">' + esc(f.label) + '</label>' +
              '<textarea data-field="' + esc(f.key) + '" rows="3" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box;resize:vertical">' + esc(v) + '</textarea>' +
            '</div>';
          }
          return '<div style="margin-bottom:12px">' +
            '<label style="display:block;font-size:11px;font-weight:600;color:#475569;margin-bottom:3px">' + esc(f.label) + '</label>' +
            '<input type="' + (f.type === 'date' ? 'text' : 'text') + '" data-field="' + esc(f.key) + '" value="' + esc(v) + '" style="width:100%;padding:8px 10px;border:1px solid #cbd5e1;border-radius:6px;font:inherit;font-size:13px;box-sizing:border-box">' +
          '</div>';
        }).join('');

      // Wire text/textarea inputs
      formEl.querySelectorAll('input[data-field][type="text"], textarea[data-field]').forEach(inp => {
        inp.addEventListener('input', () => {
          values[inp.dataset.field] = inp.value;
          updatePreview();
        });
      });

      // Wire checkbox inputs
      formEl.querySelectorAll('input[data-type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          values[cb.dataset.field] = cb.checked;
          updatePreview();
        });
      });

      // Wire signature canvases
      formEl.querySelectorAll('._dt-sig-wrap').forEach(wrap => {
        const canvas = wrap.querySelector('._dt-sig-canvas');
        const placeholder = wrap.querySelector('._dt-sig-placeholder');
        const fieldKey = wrap.dataset.sigField;
        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0f172a';
        let drawing = false, lastX = 0, lastY = 0, hasDrawn = false;

        function pos(e) {
          const r = canvas.getBoundingClientRect();
          const sx = canvas.width / r.width;
          const sy = canvas.height / r.height;
          const t = (e.touches && e.touches[0]) || e;
          return [(t.clientX - r.left) * sx, (t.clientY - r.top) * sy];
        }
        function start(e) {
          e.preventDefault();
          drawing = true;
          [lastX, lastY] = pos(e);
          if (!hasDrawn) { placeholder.style.display = 'none'; hasDrawn = true; }
        }
        function move(e) {
          if (!drawing) return;
          e.preventDefault();
          const [x, y] = pos(e);
          ctx.beginPath();
          ctx.moveTo(lastX, lastY);
          ctx.lineTo(x, y);
          ctx.stroke();
          [lastX, lastY] = [x, y];
        }
        function end() {
          if (!drawing) return;
          drawing = false;
          // Save as data URL
          values[fieldKey] = canvas.toDataURL('image/png');
          updatePreview();
        }
        canvas.addEventListener('mousedown', start);
        canvas.addEventListener('mousemove', move);
        canvas.addEventListener('mouseup', end);
        canvas.addEventListener('mouseleave', end);
        canvas.addEventListener('touchstart', start, { passive: false });
        canvas.addEventListener('touchmove', move, { passive: false });
        canvas.addEventListener('touchend', end);
      });

      // Wire signature clear buttons
      formEl.querySelectorAll('._dt-sig-clear').forEach(btn => {
        btn.addEventListener('click', () => {
          const wrap = formEl.querySelector('._dt-sig-wrap[data-sig-field="' + btn.dataset.sig + '"]');
          if (!wrap) return;
          const canvas = wrap.querySelector('._dt-sig-canvas');
          const ph = wrap.querySelector('._dt-sig-placeholder');
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
          if (ph) ph.style.display = '';
          values[btn.dataset.sig] = '';
          updatePreview();
        });
      });
    }

    // 2026-05-20: click anywhere on a checkbox in the preview to toggle it.
    // Keeps the left-side form checkbox in sync so both views stay consistent.
    previewEl.addEventListener('click', e => {
      const box = e.target.closest('._dt-chk');
      if (!box) return;
      e.preventDefault();
      const key = box.dataset.chkField;
      if (!key) return;
      values[key] = !values[key];
      const cb = formEl.querySelector('input[data-type="checkbox"][data-field="' + (window.CSS && CSS.escape ? CSS.escape(key) : key) + '"]');
      if (cb) cb.checked = !!values[key];
      updatePreview();
    });
    // Keyboard accessibility — space/enter toggles a focused checkbox.
    previewEl.addEventListener('keydown', e => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      const box = e.target.closest && e.target.closest('._dt-chk');
      if (!box) return;
      e.preventDefault();
      box.click();
    });

    function updatePreview() {
      previewEl.innerHTML = fillTemplate(t.html, values);
    }
    updatePreview();

    function openPrintWindow(printValues) {
      // forPrint=true → empty fields render as blank (no [Label] hint text)
      const html = fillTemplate(t.html, printValues, { forPrint: true });
      const win = window.open('', 'doc-print', 'width=900,height=1100');
      if (!win) { alert('Sprettigluggi var lokaður — leyfðu sprettiglugga til að prenta.'); return; }
      win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(t.name) + '</title>' +
        '<style>@media print{@page{size:A4;margin:10mm}}body{margin:0;padding:10mm;background:#fff;font-family:Arial,Helvetica,sans-serif}@media print{body{padding:0}}</style>' +
        '</head><body>' + html + '<scr' + 'ipt>setTimeout(function(){window.print();},250);</scr' + 'ipt></body></html>');
      win.document.close();
    }

    dlg.querySelector('#_dt-print').addEventListener('click', () => {
      // Digital print — use values as-is (signatures included if drawn)
      openPrintWindow(values);
    });

    // 2026-05-13: Blank-signature print — clone values but strip every
    // signature field so the printed sheet has clean undirskriftarlínur
    // for pen signing.
    dlg.querySelector('#_dt-print-blank').addEventListener('click', () => {
      const blank = Object.assign({}, values);
      fields.forEach(f => { if (f.type === 'signature') blank[f.key] = ''; });
      openPrintWindow(blank);
    });

    // 2026-06-30: 📨 Senda link á kúnna — generates a tokenized fill URL via the
    // brunaholf /api/skoda endpoint. Carries whatever the user has already filled
    // in (verkkaupi/kt/heimilisfang/etc.) so the form is pre-populated for the
    // customer's employee. Visible only for arsskodun_brunakerfa.
    const sendlinkBtn = dlg.querySelector('#_dt-sendlink');
    if (sendlinkBtn) {
      sendlinkBtn.addEventListener('click', async () => {
        const verkkaupi = (values.verkkaupi || values.vidskiptavinur_nafn || '').toString().trim();
        if (!verkkaupi) {
          alert('Sláðu inn „Verkkaupi" áður en þú sendir tengilinn.');
          return;
        }
        sendlinkBtn.disabled = true;
        const orig = sendlinkBtn.textContent;
        sendlinkBtn.textContent = '⏳ Sendir…';
        try {
          const r = await fetch('https://brunaholf.netlify.app/api/skoda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'invite',
              template_id: 'arsskodun-brunakerfa',
              verkkaupi,
              kennitala: (values.kennitala || '').toString().trim(),
              simi: (values.simi || '').toString().trim(),
              tengilidur: (values.tengilidur || '').toString().trim(),
              heimilisfang: (values.heimilisfang || '').toString().trim(),
              postnumer: (values.postnr || values.postnumer || '').toString().trim(),
              created_by: 'slokkvitaeki-app',
            }),
          });
          const j = await r.json();
          if (!r.ok || !j.url) throw new Error(j.error || ('HTTP ' + r.status));
          const url = j.url;
          // Copy to clipboard immediately.
          try { await navigator.clipboard.writeText(url); } catch (_) {}
          // Pop a tiny inline dialog with the URL + actions.
          let pop = document.getElementById('_dt-sendlink-pop');
          if (pop) pop.remove();
          pop = document.createElement('div');
          pop.id = '_dt-sendlink-pop';
          pop.style.cssText = 'position:fixed;inset:0;z-index:100030;background:rgba(15,23,42,0.5);display:flex;align-items:center;justify-content:center;padding:20px';
          pop.innerHTML =
            '<div style="background:#fff;border-radius:12px;padding:22px;max-width:560px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.3)">' +
              '<div style="font-size:18px;font-weight:750;margin-bottom:6px">✅ Tengill tilbúinn</div>' +
              '<div style="color:#475569;font-size:13px;margin-bottom:14px">Tengillinn hefur verið afritaður í klippiborð. Sendu hann á kúnnann — gildir í 14 daga.</div>' +
              '<input value="' + esc(url) + '" readonly style="width:100%;padding:11px;border:1px solid #cbd5e1;border-radius:8px;font-family:monospace;font-size:12px;margin-bottom:12px" id="_dt-sendlink-url">' +
              '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap">' +
                '<button id="_dt-sendlink-copy" type="button" style="padding:9px 14px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;font-weight:600">📋 Afrita aftur</button>' +
                '<button id="_dt-sendlink-mail" type="button" style="padding:9px 14px;border:none;background:#0ea5e9;color:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">✉️ Opna Gmail</button>' +
                '<button id="_dt-sendlink-close" type="button" style="padding:9px 14px;border:none;background:#0f172a;color:#fff;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">Loka</button>' +
              '</div>' +
            '</div>';
          document.body.appendChild(pop);
          pop.querySelector('#_dt-sendlink-close').onclick = () => pop.remove();
          pop.addEventListener('click', e => { if (e.target === pop) pop.remove(); });
          pop.querySelector('#_dt-sendlink-copy').onclick = () => {
            const inp = pop.querySelector('#_dt-sendlink-url');
            inp.select();
            navigator.clipboard && navigator.clipboard.writeText(url);
            pop.querySelector('#_dt-sendlink-copy').textContent = 'Afritað ✓';
          };
          pop.querySelector('#_dt-sendlink-mail').onclick = () => {
            const subj = encodeURIComponent('Brunakerfi skoðun — ' + verkkaupi);
            const body = encodeURIComponent(
              'Sæll/sæl,\n\nHér er tengill til að fylla út árlega skoðun á brunakerfinu hjá ' + verkkaupi + ':\n\n' + url +
              '\n\nGildir í 14 daga.\n\nKveðja,\nSlökkvitæki ehf'
            );
            window.location.href = 'mailto:?subject=' + subj + '&body=' + body;
          };
        } catch (e) {
          alert('Villa: ' + (e.message || e));
        } finally {
          sendlinkBtn.disabled = false;
          sendlinkBtn.textContent = orig;
        }
      });
    }

    // 2026-05-13: Vista í kerfi — store the filled values so we can come
    // back later. If editing an existing filled doc (filledId set) we
    // update in place; otherwise insert a new record.
    // For Þjónustusamningur templates we ALSO upsert into the actual
    // `thjonustusamningar` Supabase table so the contract appears in the
    // existing Þjónustusamningar list (patch 50) — single source of truth.
    dlg.querySelector('#_dt-save').addEventListener('click', async () => {
      const saveBtn = dlg.querySelector('#_dt-save');
      const customer = (values.vidskiptavinur_nafn || values.verkkaupi || '').toString().trim();
      const kt = (values.kennitala || '').toString().trim();
      const autoName = customer ? (t.name + ' — ' + customer) : t.name;
      const isThjonusta = (t.type === 'thjonusta' || t.type === 'thjonusta_brunakerfi');
      const rec = {
        id: filledId || ('filled_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)),
        template_id: t.id,
        template_name: t.name,
        name: filledName || autoName,
        customer,
        kennitala: kt,
        values: Object.assign({}, values),
        created_at: existing ? existing.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Keep any previously-linked thjonustusamningar.id so subsequent saves
        // update the same row instead of inserting duplicates.
        thjonustusamningar_id: existing ? existing.thjonustusamningar_id : null
      };
      saveBtn.disabled = true;
      saveBtn.textContent = '…';

      // Dual-write for Þjónustusamningur templates
      let contractMsg = '';
      if (isThjonusta) {
        try {
          const linkedId = await upsertThjonustusamningur(t, values, rec.thjonustusamningar_id);
          if (linkedId) {
            rec.thjonustusamningar_id = linkedId;
            contractMsg = ' · Birtist í Þjónustusamningar';
          }
        } catch (err) {
          console.warn('[patch-94] thjonustusamningar upsert failed:', err);
          contractMsg = ' (en samningalisti uppfærður ekki)';
        }
      }

      const ok = await saveFilled(rec);
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Vista í kerfi';
      if (!ok) { alert('Vistun mistókst.'); return; }
      filledId = rec.id;
      filledName = rec.name;
      if (window.Toast && Toast.show) Toast.show('✓ Vistað' + contractMsg);
      refreshFilledSection();
      // Refresh the patch-50 contracts list so the new/updated row appears
      if (isThjonusta && window.ServiceContracts && typeof window.ServiceContracts.load === 'function') {
        try { window.ServiceContracts.load(); } catch (_) {}
      }
    });
  }

  // 2026-05-13: When the user saves a Þjónustusamningur template, mirror the
  // filled values into the `thjonustusamningar` Supabase table that patch 50
  // already renders as the main contracts list. That way the saved doc shows
  // up in the familiar Þjónustusamningar table immediately. Returns the row
  // id (existing or new) so subsequent updates target the same row.
  async function upsertThjonustusamningur(template, values, existingId) {
    const SB = (window.DB && window.DB.sb) || null;
    if (!SB) return null;
    // Parse the dagsetning (dd.mm.yyyy) to ISO if possible, else today
    function parseDate(s) {
      if (!s) return new Date().toISOString().slice(0, 10);
      const m = String(s).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
      if (m) return m[3] + '-' + m[2] + '-' + m[1];
      const d = new Date(s);
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
      return new Date().toISOString().slice(0, 10);
    }
    const signedAt = parseDate(values.dagsetning);
    const next = new Date(signedAt);
    next.setMonth(next.getMonth() + 12);
    const nextDue = next.toISOString().slice(0, 10);

    // Brunaslöngur isn't a top-level column — fold into umsjon_annad if ticked
    const annadParts = [];
    if (values.annad) annadParts.push(String(values.annad).trim());
    if (values.chk_brunaslongur) annadParts.push('Brunaslöngur');
    if (values.chk_brunavidvorun || template.type === 'thjonusta_brunakerfi') annadParts.push('Brunaviðvörunarkerfi');
    if (values.chk_slokkvikerfi) annadParts.push('Slökkvikerfi');

    const rec = {
      company_nafn: (values.vidskiptavinur_nafn || '').trim(),
      kennitala: (values.kennitala || '').trim(),
      heimilisfang: (values.heimilisfang || '').trim(),
      umsjon_slokkvitaeki: !!values.chk_slokkvitaeki,
      umsjon_reykskynjarar: !!values.chk_reykskynjarar,
      umsjon_annad: annadParts.join(' · '),
      thjonusta: 'Árleg þjónusta',
      upphaed_an_vsk: 0,
      tidni_man: 12,
      next_due: nextDue,
      signed_at: signedAt,
      status: 'virkur'
    };
    if (!rec.company_nafn) return null; // can't create a row without a name

    if (existingId) {
      const { data, error } = await SB.from('thjonustusamningar').update(rec).eq('id', existingId).select().single();
      if (error) throw error;
      return data && data.id;
    }
    const { data, error } = await SB.from('thjonustusamningar').insert(rec).select().single();
    if (error) throw error;
    return data && data.id;
  }

  // ── Editor for user-added templates ────────────────────────────────────────
  function openTemplateEditor(templateId) {
    const editing = templateId ? getTemplates().find(x => x.id === templateId) : null;
    if (templateId && editing && editing._seed) {
      alert('Forsniðin sniðmát er ekki hægt að breyta. Búðu frekar til afrit með „+ Bæta við sniðmáti".');
      return;
    }
    const initialHtml = editing ? editing.html : (
      '<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:780px;margin:0 auto;padding:24px;border:2px solid #0f172a">\n' +
      '  <div style="text-align:center;margin-bottom:20px">\n' +
      '    <div style="font-size:24px;font-weight:800;margin:6px 0">Slökkvitæki ehf</div>\n' +
      '    <div style="font-size:13px;font-weight:600">Hleðsla — Sala — Þjónusta</div>\n' +
      '    <div style="font-size:18px;font-weight:700;margin-top:18px">[Titill skjals]</div>\n' +
      '  </div>\n\n' +
      '  <div style="margin:18px 0;font-size:14px;line-height:1.7">\n' +
      '    <div><strong>Dagsetning:</strong> {{dagsetning}}</div>\n' +
      '    <div><strong>Viðskiptavinur:</strong> {{vidskiptavinur_nafn}}</div>\n' +
      '  </div>\n\n' +
      '  <div style="margin:18px 0;font-size:14px;line-height:1.6">{{lysing}}</div>\n\n' +
      '  <div style="margin-top:40px">\n' +
      '    <div style="border-bottom:1px solid #0f172a;height:28px;width:280px"></div>\n' +
      '    <div style="font-size:12px;margin-top:4px">F.h. Slökkvitæki ehf</div>\n' +
      '  </div>\n' +
      '</div>'
    );
    const initialName = editing ? editing.name : '';

    let dlg = document.getElementById('_dt-edit-modal');
    if (dlg) dlg.remove();
    dlg = document.createElement('div');
    dlg.id = '_dt-edit-modal';
    dlg.style.cssText = 'position:fixed;inset:0;z-index:100021;background:rgba(15,23,42,0.7);display:flex;align-items:center;justify-content:center;padding:16px';
    dlg.innerHTML =
      '<div style="background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.3);width:min(1100px,calc(100vw - 24px));max-height:calc(100vh - 32px);display:flex;flex-direction:column;overflow:hidden">' +
        '<div style="padding:14px 20px;border-bottom:1px solid #e2e8f0;background:#0f172a;color:#fff;display:flex;justify-content:space-between;align-items:center">' +
          '<h3 style="margin:0;font-size:16px;font-weight:700">' + (editing ? 'Breyta sniðmáti' : 'Nýtt sniðmát') + '</h3>' +
          '<button id="_dte-x" type="button" style="background:none;border:none;font-size:22px;color:#cbd5e1;cursor:pointer;padding:2px 8px">✕</button>' +
        '</div>' +
        '<div style="padding:14px 20px 0">' +
          '<label style="display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">Nafn sniðmáts</label>' +
          '<input id="_dte-name" type="text" value="' + esc(initialName) + '" placeholder="t.d. Móttökukvittun" style="width:100%;padding:10px 12px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:14px;box-sizing:border-box">' +
        '</div>' +
        '<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:0;overflow:hidden;min-height:0;padding:14px 20px">' +
          '<div style="display:flex;flex-direction:column;min-height:0;padding-right:10px">' +
            '<label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">HTML / texti (notaðu <code>{{reitur}}</code> fyrir útfyllingareiti)</label>' +
            '<textarea id="_dte-html" style="flex:1;width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:7px;font:inherit;font-size:12px;font-family:Consolas,Monaco,monospace;box-sizing:border-box;resize:none">' + esc(initialHtml) + '</textarea>' +
          '</div>' +
          '<div style="display:flex;flex-direction:column;min-height:0;padding-left:10px">' +
            '<label style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px">Forskoðun</label>' +
            '<div id="_dte-prev" style="flex:1;border:1px solid #e2e8f0;border-radius:7px;padding:14px;overflow:auto;background:#fafafa"></div>' +
          '</div>' +
        '</div>' +
        '<div style="padding:8px 20px;background:#fef3c7;border-top:1px solid #fde68a;font-size:12px;color:#92400e">' +
          '💡 Reitir sem fundust: <span id="_dte-fields" style="font-weight:600">—</span>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 20px;border-top:1px solid #e2e8f0;background:#f8fafc">' +
          '<button id="_dte-cancel" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Hætta við</button>' +
          '<button id="_dte-save" type="button" style="padding:9px 18px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">✓ Vista sniðmát</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(dlg);

    function close() { dlg.remove(); }
    dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
    dlg.querySelector('#_dte-x').addEventListener('click', close);
    dlg.querySelector('#_dte-cancel').addEventListener('click', close);

    const ta = dlg.querySelector('#_dte-html');
    const prev = dlg.querySelector('#_dte-prev');
    const fieldsLbl = dlg.querySelector('#_dte-fields');
    function refreshPrev() {
      prev.innerHTML = ta.value;
      const fs = extractFields(ta.value);
      fieldsLbl.textContent = fs.length ? fs.map(f => '{{' + f.key + '}}').join(', ') : 'engir';
    }
    ta.addEventListener('input', refreshPrev);
    refreshPrev();

    dlg.querySelector('#_dte-save').addEventListener('click', async () => {
      const name = dlg.querySelector('#_dte-name').value.trim();
      const html = ta.value;
      if (!name) { alert('Sláðu inn nafn á sniðmáti.'); return; }
      if (!html.trim()) { alert('Sniðmát má ekki vera tómt.'); return; }
      const t = {
        id: editing ? editing.id : ('user_' + Date.now() + '_' + Math.random().toString(36).slice(2,8)),
        name,
        type: editing ? (editing.type || 'eigid') : 'eigid',
        html,
        created_at: editing ? editing.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const ok = await saveUserTemplate(t);
      if (ok) {
        close();
        refreshSection();
        if (window.Toast && Toast.show) Toast.show('✓ Sniðmát vistað');
      } else {
        alert('Villa við vistun. Athugaðu nettengingu.');
      }
    });
  }

  // ── Mount when Samningar view opens ────────────────────────────────────────
  document.addEventListener('view-shown', e => {
    if (e && e.detail && e.detail.name === 'samningar') {
      setTimeout(injectSection, 200);
      setTimeout(injectSection, 800);
    }
  });
  // Polled fallback (samningar view may exist before listener fires)
  setInterval(() => {
    const view = document.getElementById('view-samningar');
    if (view && view.classList.contains('active') && !view.querySelector('._dt-section')) {
      injectSection();
    }
  }, 1500);

  // Re-render section when AppSettings change (fresh templates from another device)
  if (window.AppSettings && typeof window.AppSettings.onChange === 'function') {
    window.AppSettings.onChange(() => {
      const view = document.getElementById('view-samningar');
      if (view && view.classList.contains('active')) refreshSection();
    });
  }

  // 2026-05-15: Expose a convenience `openFilled(filledId)` that opens a
  // previously-saved filled-in document directly (used by Brunakerfisþjónusta
  // to re-open saved Ársskoðun / Þjónustusamningur entries).
  function openFilled(filledId) {
    const rec = getFilledList().find(x => x.id === filledId);
    if (!rec) { alert('Skjalið fannst ekki.'); return; }
    openTemplateForm(rec.template_id, { filledId: rec.id });
  }

  // 2026-07-20: teiknar VISTAÐA útfyllta skýrslu sem PDF (base64) — fyrir 📧 Senda
  // hnappinn í „Vistaðar skýrslur" (patch 265). Sama fyllingar-leið og prentun
  // (fillTemplate forPrint) + html2pdf brúin úr patch 176. Skilar {filename,content}
  // eða null. Ath: reynir að hlaða html2pdf lazily gegnum CompanyReportEmail.
  async function buildFilledPdfBase64(filledId) {
    const rec = getFilledList().find(x => x.id === filledId);
    if (!rec) return null;
    const t = getTemplates().find(x => x.id === rec.template_id);
    if (!t) return null;
    if (!(window.CompanyReportEmail && CompanyReportEmail.htmlToPdfBase64)) return null;
    const html = fillTemplate(t.html, Object.assign({}, rec.values || {}), { forPrint: true });
    const namer = String(rec.name || rec.template_name || t.name || 'Skýrsla').replace(/[\\/:*?"<>|]/g, '_') + '.pdf';
    // Heildar-tímamörk (30s) svo hnappurinn frjósi aldrei þótt html2canvas hiksti.
    const b64 = await Promise.race([
      CompanyReportEmail.htmlToPdfBase64(html, namer),
      new Promise((_, rej) => setTimeout(() => rej(new Error('PDF-teikning tók of langan tíma')), 30000)),
    ]);
    return b64 ? { filename: namer, content: b64 } : null;
  }

  // 2026-05-31: open the main "Þjónustusamningur" template (seed_thjonustusamningur)
  // pre-filled with a company's nafn / kt / heimilisfang. Launched from the
  // company detail page; the form stays editable and saves/prints as normal.
  async function openForCompany(coId) {
    let co = (window.Companies && Companies.list || []).find(x => +x.id === +coId);
    if (!co && window.DB && window.DB.sb) {
      try {
        const r = await window.DB.sb.from('fyrirtaeki').select('nafn,kennitala,heimilisfang,netfang').eq('id', coId).maybeSingle();
        co = r && r.data;
      } catch (e) { /* fall through to empty form */ }
    }
    co = co || {};
    openTemplateForm('seed_thjonustusamningur', {
      prefill: {
        vidskiptavinur_nafn: co.nafn || '',
        kennitala: co.kennitala || '',
        heimilisfang: co.heimilisFang || co.heimilisfang || '',
        netfang: co.netfang || '',
        chk_slokkvitaeki: true
      }
    });
  }

  const api = {
    open: openTemplateForm,
    openForCompany,
    openFilled,
    buildFilledPdfBase64,
    // 2026-07-10: leyfa öðrum pötchum (265 kúnnaspjald, 253 Fyrri viðskipti)
    // að fletta upp útfylltum skjölum eftir kúnna — þau geyma customer+kennitala.
    listFilled: getFilledList,
    edit: openTemplateEditor,
    cloneSeed: cloneSeedTemplate,   // For UIs that want "edit a seed" semantics
    list: getTemplates,
    refresh: refreshSection,
    // 2026-05-20: hidden-template controls — used by the picker in patch 147
    // to filter, and by the Samningar UI to toggle the flag.
    isHidden,
    setHidden
  };
  window.DocTemplates = api;
  // Alias under the more discoverable name (patches search both)
  window.DocumentTemplates = api;

  console.log('[doc-templates] installed — 3 forsniðin sniðmát + eigin sniðmát aðgengileg í Samningum');
})();
/* === END SKJALASNIÐMÁT v1 === */
