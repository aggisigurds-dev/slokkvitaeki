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

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ── Pre-seeded templates ──────────────────────────────────────────────────
  const SEED_TEMPLATES = [
    {
      id: 'seed_thjonustusamningur',
      name: 'Þjónustusamningur',
      type: 'thjonusta',
      _seed: true,
      html: `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:780px;margin:0 auto;padding:24px 32px 28px;background:#fff;border:2px solid #0f172a">
  <div style="text-align:center;margin-bottom:4px;line-height:0">
    <img src="/img/logo.png" alt="Slökkvitæki ehf" style="max-height:90px;max-width:100%;display:inline-block">
  </div>

  <div style="text-align:right;font-size:13px;color:#475569;margin:0 0 6px">Dags: {{dagsetning}}</div>

  <div style="text-align:center;margin:0 0 14px">
    <div style="font-size:24px;font-weight:800;letter-spacing:0.5px">Þjónustusamningur</div>
    <div style="font-size:14px;font-weight:600;margin-top:4px;color:#0f172a">Hleðsla — Sala — Þjónusta</div>
    <div style="font-size:13px;color:#475569;margin-top:2px">Sími: 565-4080</div>
  </div>

  <hr style="border:none;border-top:1px solid #cbd5e1;margin:18px 0">

  <div style="font-size:14px;line-height:1.7;margin-bottom:14px">
    Hér með gera <strong>Slökkvitæki ehf</strong> kt: <strong>600508-0400</strong> og
  </div>

  <div style="margin:14px 0;padding:12px 14px;background:#f8fafc;border-left:3px solid #0f172a;border-radius:4px">
    <div style="font-size:14px;line-height:1.8"><strong>Nafn:</strong> {{vidskiptavinur_nafn}} &nbsp;&nbsp;<strong>kt:</strong> {{kennitala}}</div>
    <div style="font-size:14px;line-height:1.8"><strong>Heimilisfang:</strong> {{heimilisfang}}</div>
  </div>

  <div style="font-size:14px;line-height:1.7;margin:14px 0">
    með sér þjónustusamning þess efnis að <strong>Slökkvitæki ehf</strong> muni sjá um árlega þjónustu slökkvitækja og tengdum búnaði.
  </div>

  <div style="font-size:13px;line-height:1.6;margin-bottom:18px;color:#475569;font-style:italic">
    Samningi þessum skal segja upp með minnst tveggja mánaða fyrirvara á e-mailið <strong>eldklar@eldklar.is</strong>
  </div>

  <hr style="border:none;border-top:1px solid #cbd5e1;margin:18px 0">

  <div style="margin-bottom:8px;font-size:14px;font-weight:700">Umsjón með:</div>
  <div style="margin-bottom:14px;font-size:14px;line-height:2">
    {{chk_slokkvitaeki}} &nbsp;Slökkvitækjum<br>
    {{chk_reykskynjarar}} &nbsp;Reykskynjurum<br>
    {{chk_brunaslongur}} &nbsp;Brunaslöngum
  </div>

  <div style="margin:18px 0 8px;font-size:14px;font-weight:700">Annað:</div>
  <div style="border:1px solid #cbd5e1;min-height:60px;padding:10px;font-size:14px;border-radius:4px;line-height:1.5;white-space:pre-wrap">{{annad}}</div>

  <hr style="border:none;border-top:1px dashed #cbd5e1;margin:26px 0 18px">

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:8px">
    <div>
      <div style="font-size:12px;color:#475569;margin-bottom:4px;font-weight:600">Fyrir hönd Slökkvitækja ehf:</div>
      <div style="height:60px;border-bottom:1px solid #0f172a;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">{{sig_slokkvitaeki}}</div>
      <div style="font-size:13px;margin-top:4px;font-weight:600">Elías Ásgeir Baldvinsson</div>
    </div>
    <div>
      <div style="font-size:12px;color:#475569;margin-bottom:4px;font-weight:600">Fyrir hönd fyrirtækis/húsfélags:</div>
      <div style="height:60px;border-bottom:1px solid #0f172a;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">{{sig_vidskiptavinur}}</div>
      <div style="font-size:13px;margin-top:4px;font-weight:600">{{vidskiptavinur_nafn}}</div>
    </div>
  </div>

  <div style="margin-top:32px;text-align:center;font-style:italic;font-size:13px;color:#475569">
    Slökkvitæki ehf leggja áherslu á persónulega og vandaða þjónustu.
  </div>

  <div style="margin-top:18px;padding-top:12px;border-top:1px solid #cbd5e1;text-align:center;font-size:11px;color:#64748b;line-height:1.6">
    Slökkvitæki ehf · Helluhrauni 10, 220 Hafnarfirði · vsknr. 98107<br>
    Netfang: eldklar@eldklar.is &nbsp;·&nbsp; Sími 565-4080
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
    <img src="/img/logo.png" alt="Slökkvitæki ehf" style="max-height:90px;max-width:100%;display:inline-block">
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
    <img src="/img/logo.png" alt="Slökkvitæki ehf" style="max-height:80px;max-width:100%;display:inline-block">
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
      html: `
<div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:820px;margin:0 auto;padding:20px 28px 24px;background:#fff;border:2px solid #0f172a">
  <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:10px">
    <div style="line-height:0"><img src="/img/logo.png" alt="Slökkvitæki ehf" style="max-height:70px"></div>
    <div style="text-align:right;font-size:12px;color:#475569">Dags: <strong>{{dagsetning}}</strong></div>
  </div>

  <div style="text-align:center;margin:8px 0 14px">
    <div style="font-size:20px;font-weight:800">Viðtökupróf / Árleg prófun</div>
    <div style="font-size:14px;font-weight:600;margin-top:2px">Brunaviðvörunarkerfi</div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <tr>
      <td style="border:1px solid #cbd5e1;padding:6px 9px;font-size:12px"><strong>Verkkaupi:</strong> {{verkkaupi}}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 9px;font-size:12px"><strong>Kennitala:</strong> {{kennitala}}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 9px;font-size:12px"><strong>Sími:</strong> {{simi}}</td>
    </tr>
    <tr>
      <td style="border:1px solid #cbd5e1;padding:6px 9px;font-size:12px"><strong>Tengiliður:</strong> {{tengilidur}}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 9px;font-size:12px"><strong>Heimilisf.:</strong> {{heimilisfang}}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 9px;font-size:12px"><strong>Póstnr.:</strong> {{postnr}}</td>
    </tr>
    <tr>
      <td colspan="2" style="border:1px solid #cbd5e1;padding:6px 9px;font-size:12px"><strong>Prófun (allt kerfið/hluti af kerfi):</strong> {{profunarsvid}}</td>
      <td style="border:1px solid #cbd5e1;padding:6px 9px;font-size:12px"><strong>Tegund kerfis:</strong> {{tegund_kerfis}}</td>
    </tr>
    <tr style="background:#f8fafc">
      <td style="border:1px solid #cbd5e1;padding:6px 9px;font-size:12px"><strong>Verktaki:</strong> Slökkvitæki ehf</td>
      <td style="border:1px solid #cbd5e1;padding:6px 9px;font-size:12px">Helluhraun 10 · kt: 600508-0400</td>
      <td style="border:1px solid #cbd5e1;padding:6px 9px;font-size:12px">Sími: 565-4080</td>
    </tr>
  </table>

  <div style="margin:8px 0 12px;font-size:13px;line-height:1.6"><strong>Næsta skoðun kerfis:</strong> {{naesta_skodun}}</div>

  <table style="width:100%;border-collapse:collapse;font-size:11.5px;margin-bottom:14px">
    <thead>
      <tr style="background:#f1f5f9">
        <th style="border:1px solid #cbd5e1;padding:5px 7px;text-align:left">Heiti</th>
        <th style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;width:60px">Í lagi</th>
        <th style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;width:60px">Ólagi</th>
        <th style="border:1px solid #cbd5e1;padding:5px 7px;text-align:left;width:25%">Athugasemd</th>
      </tr>
    </thead>
    <tbody>
      <tr><td colspan="4" style="border:1px solid #cbd5e1;padding:5px 7px;background:#fef3c7;font-weight:700">Prófun á stjórnstöð</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Analog gildi lesin og yfirfarin á stjórnstöð</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a1}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a1n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_a1}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Skynjarar prófaðir frá stöð</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a2}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a2n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_a2}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Lampaprófun</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a3}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a3n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_a3}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Bilun ef skynjararás er rofin</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a4}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a4n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_a4}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Bilun ef aðvörunarrás er rofin</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a5}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a5n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_a5}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Bilun frá aðalaflgjafa ath.</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a6}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a6n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_a6}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Bilun frá varaaflgjafa ath.</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a7}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a7n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_a7}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Hleðsluspenna og straumnotkun mæld</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a8}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a8n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_a8}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Prófun útganga</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a9}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a9n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_a9}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Merkingar, þjónustubók og yfirlitsmynd í lagi</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a10}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a10n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_a10}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Rafhlöður (merking/dagsetning)</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a11}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_a11n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{rafhl_dags}}</td></tr>
      <tr><td colspan="4" style="border:1px solid #cbd5e1;padding:5px 7px;background:#fef3c7;font-weight:700">Prófun á jaðarbúnaði</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Prófun á öllum reykskynjurum með gasi</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b1}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b1n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_b1}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Prófun á öllum hitaskynjurum með hitagjafa</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b2}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b2n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_b2}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Prófun á öllum handboðum</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b3}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b3n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_b3}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Bilun þegar skynjari er fjarlægður (5% per rás)</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b4}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b4n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_b4}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Gaumljós athuguð, hvort þau séu í lagi</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b5}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b5n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_b5}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Bjöllur (hljóðprófun)</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b6}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b6n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_b6}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Ath. með hurðasegla</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b7}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b7n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_b7}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Textar lesnir saman við númer og staðsetn.</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b8}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b8n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_b8}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Stýribúnaður (loftræsting, reyklúgur, sprinkler o.fl.)</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b9}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_b9n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_b9}}</td></tr>
      <tr><td colspan="4" style="border:1px solid #cbd5e1;padding:5px 7px;background:#fef3c7;font-weight:700">Undirstöðvar</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Athuga hvort textar og boð skili sér</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_c1}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_c1n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_c1}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Merking á þjónustubók og yfirlitsmynd í lagi</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_c2}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_c2n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_c2}}</td></tr>
      <tr><td colspan="4" style="border:1px solid #cbd5e1;padding:5px 7px;background:#fef3c7;font-weight:700">Boðsendir</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Skilar brunaboð sér frá hverri rás</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_d1}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_d1n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_d1}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Skila bilunarboð sér</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_d2}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_d2n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_d2}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Skynjari tekinn úr sökkli</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_d3}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_d3n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_d3}}</td></tr>
      <tr><td style="border:1px solid #cbd5e1;padding:5px 7px">Ath útkallsleiðbeinungar og tengiliði</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_d4}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px;text-align:center;font-size:14px">{{chk_d4n}}</td><td style="border:1px solid #cbd5e1;padding:5px 7px">{{ath_d4}}</td></tr>
    </tbody>
  </table>

  <div style="margin:14px 0 4px;font-size:14px;line-height:1.6"><strong>Prófun framkvæmd af:</strong> {{profun_af}}</div>

  <div style="margin:18px 0 4px;font-size:14px;font-weight:700">Athugasemdir:</div>
  <div style="border:1px solid #cbd5e1;min-height:80px;padding:10px 12px;font-size:13px;border-radius:4px;line-height:1.6;white-space:pre-wrap">{{athugasemdir}}</div>

  <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:30px">
    <div>
      <div style="font-size:12px;color:#475569;margin-bottom:4px;font-weight:600">F.h. Slökkvitæki ehf:</div>
      <div style="height:55px;border-bottom:1px solid #0f172a;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">{{sig_starfsmanns}}</div>
      <div style="font-size:13px;margin-top:4px;font-weight:600">{{starfsmadur}}</div>
    </div>
    <div>
      <div style="font-size:12px;color:#475569;margin-bottom:4px;font-weight:600">F.h. verkkaupa:</div>
      <div style="height:55px;border-bottom:1px solid #0f172a;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px">{{sig_verkkaupa}}</div>
      <div style="font-size:13px;margin-top:4px;font-weight:600">{{verkkaupi}}</div>
    </div>
  </div>

  <div style="margin-top:18px;padding-top:10px;border-top:1px solid #cbd5e1;text-align:center;font-size:11px;color:#64748b">
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
    <img src="/img/logo.png" alt="Slökkvitæki ehf" style="max-height:90px;max-width:100%;display:inline-block">
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
    <div style="line-height:0"><img src="/img/logo.png" alt="Slökkvitæki ehf" style="max-height:60px"></div>
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
  ];

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
    chk_slokkvitaeki: 'Slökkvitækjum',
    chk_reykskynjarar: 'Reykskynjurum',
    chk_brunaslongur: 'Brunaslöngum',
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

  function fillTemplate(html, values) {
    return html.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
      const k = key.trim();
      const t = fieldType(k);
      const v = values[k];

      if (t === 'checkbox') {
        return v ? '<span style="font-size:18px;line-height:1">☒</span>' : '<span style="font-size:18px;line-height:1">☐</span>';
      }

      if (t === 'signature') {
        if (v && typeof v === 'string' && v.startsWith('data:image/')) {
          return '<img src="' + v + '" alt="undirritun" style="max-height:55px;max-width:100%;display:inline-block">';
        }
        return ''; // empty when no signature drawn
      }

      return (v != null && v !== '') ? esc(v) : '<span style="color:#94a3b8;font-style:italic">[' + esc(fieldLabel(k)) + ']</span>';
    });
  }

  function getTemplates() {
    const stored = (window.AppSettings && window.AppSettings.path && window.AppSettings.path(STORAGE_KEY)) || [];
    const userTemplates = Array.isArray(stored) ? stored : [];
    // Seeds first, then user-added
    return SEED_TEMPLATES.concat(userTemplates);
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
  }

  function renderSection() {
    const templates = getTemplates();
    const cards = templates.map(t => {
      const isSeed = !!t._seed;
      return '' +
      '<div class="_dt-card" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px;box-shadow:0 1px 3px rgba(0,0,0,0.04)">' +
        '<div style="display:flex;justify-content:space-between;align-items:start;gap:8px">' +
          '<div style="font-weight:700;font-size:14px;color:#0f172a;line-height:1.3">' + esc(t.name) + '</div>' +
          (isSeed ? '<span style="font-size:9px;font-weight:700;background:#e0e7ff;color:#3730a3;padding:2px 6px;border-radius:99px;text-transform:uppercase;letter-spacing:0.04em">forsniðið</span>'
                  : '<span style="font-size:9px;font-weight:700;background:#dcfce7;color:#166534;padding:2px 6px;border-radius:99px;text-transform:uppercase;letter-spacing:0.04em">eigið</span>') +
        '</div>' +
        '<div style="font-size:11px;color:#64748b">' + extractFields(t.html).length + ' reitir til útfyllingar</div>' +
        '<div style="display:flex;gap:6px;margin-top:auto">' +
          '<button class="_dt-open btn btn-primary btn-sm" data-id="' + esc(t.id) + '" style="flex:1">📝 Opna og útfylla</button>' +
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
      const openBtn = e.target.closest('._dt-open');
      const editBtn = e.target.closest('._dt-edit');
      const delBtn  = e.target.closest('._dt-del');
      const addBtn  = e.target.closest('._dt-add');
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
      if (addBtn) { e.stopPropagation(); openTemplateEditor(null); return; }
    });
  }

  function refreshSection() {
    const section = document.querySelector('._dt-section');
    if (!section) { injectSection(); return; }
    section.innerHTML = renderSection();
    wireSection(section);
  }

  // ── Form modal: fill in placeholders → preview/print ──────────────────────
  function openTemplateForm(templateId) {
    const t = getTemplates().find(x => x.id === templateId);
    if (!t) { alert('Sniðmát fannst ekki'); return; }

    // Default dagsetning to today
    const today = new Date();
    const dStr = String(today.getDate()).padStart(2,'0') + '.' + String(today.getMonth()+1).padStart(2,'0') + '.' + today.getFullYear();

    const fields = extractFields(t.html);
    const values = {};
    fields.forEach(f => {
      if (f.key === 'dagsetning') values[f.key] = dStr;
    });

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
        '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 20px;border-top:1px solid #e2e8f0;background:#f8fafc">' +
          '<button id="_dt-cancel" type="button" style="padding:9px 16px;border:1px solid #cbd5e1;border-radius:8px;background:#fff;cursor:pointer;font:inherit;font-size:13px;color:#475569">Loka</button>' +
          '<button id="_dt-print" type="button" style="padding:9px 18px;background:#0f172a;color:#fff;border:none;border-radius:8px;cursor:pointer;font:inherit;font-size:13px;font-weight:600">🖨 Prenta</button>' +
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

    function updatePreview() {
      previewEl.innerHTML = fillTemplate(t.html, values);
    }
    updatePreview();

    dlg.querySelector('#_dt-print').addEventListener('click', () => {
      const html = fillTemplate(t.html, values);
      const win = window.open('', 'doc-print', 'width=900,height=1100');
      if (!win) { alert('Sprettigluggi var lokaður — leyfðu sprettiglugga til að prenta.'); return; }
      win.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(t.name) + '</title>' +
        '<style>@media print{@page{size:A4;margin:14mm}}body{margin:0;padding:14mm;background:#fff;font-family:Arial,Helvetica,sans-serif}@media print{body{padding:0}}</style>' +
        '</head><body>' + html + '<scr' + 'ipt>setTimeout(function(){window.print();},250);</scr' + 'ipt></body></html>');
      win.document.close();
    });
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

  window.DocTemplates = {
    open: openTemplateForm,
    edit: openTemplateEditor,
    list: getTemplates,
    refresh: refreshSection
  };

  console.log('[doc-templates] installed — 3 forsniðin sniðmát + eigin sniðmát aðgengileg í Samningum');
})();
/* === END SKJALASNIÐMÁT v1 === */
