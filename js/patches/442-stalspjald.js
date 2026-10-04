/* === STÁLSPJALD — sameiginleg Brunastál C-spjöld (442) =======================
 *
 * Agnar 04.10.2026 (Brunakerfi-appið, Rekstrarfélög): „geturðu gert rekstrar-
 * félagsupplýsingarnar eitthvað more stylish í samræmi við Fyrirtæki í
 * þjónustu". Upplýsingarnar (175), Þjónustusumman (288) og Samskiptasagan (286)
 * voru hvít spjöld með fjólubláum áherslum og emoji — þrír pappar, þrír stílar.
 *
 * Hér er Stálspjald-kortið úr hönnunarkerfinu (components/Stalspjald) sem
 * klasar, með sömu táknum og 419 Kostnaður og 402 fyrirtækjasíðan nota, svo
 * papparnir teikni SAMA spjaldið:
 *
 *   .ssp          umgjörð — hvítt, 1px málmkantur, radíus 12, skuggi, gámur
 *   .ssp-haus     málmhaus 46px með hnoðum 7px frá köntum
 *     .ssp-titill   heiti (mono, hástafir)  · .ssp-undir lén o.þ.h.
 *     .ssp-hlid     takkar / stöðuplata hægra megin
 *   .ssp-buk      búkur á burstaðri stálplötu
 *     .ssp-reitir   grind af .ssp-lina (merki | gildi); .heil = full breidd
 *   .ssp-plata    silfurplata (staða, netfang) · .ssp-led .rautt/.graent/.gull
 *   .ssp-btn      silfurtakki · .ssp-btn.malm málmtakki (Vista, hlutlaus aðgerð)
 *   .ssp-reitur   innsláttarreitur (field-bg, innskuggi, 40px)
 *
 * App-hamurinn (261 + simi-compact-layer) blæs hvern takka og reit í .view upp
 * í 50–52 px / 16–18 px með !important. Falsk-id keðjan (K) + !important á
 * stærðum heldur spjaldinu í sínum hlutföllum — sama aðferð og 353/356.
 * Aðeins útlit. Engin gögn. 153/187 ÓSNERT.
 * ========================================================================== */
(() => {
  if (window.__stalspjald442) return;
  window.__stalspjald442 = true;

  const MONO = '"JetBrains Mono",ui-monospace,monospace';
  const SANS = '"IBM Plex Sans",system-ui,-apple-system,sans-serif';
  const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
  const STAL = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
  const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)';
  const MALM_TAKKI = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
  const RIVET = 'content:"";position:absolute;top:50%;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%);box-shadow:0 1px 1px rgba(0,0,0,.7)';
  const K = ':not(#_s442a):not(#_s442b):not(#_s442c):not(#_s442d)';

  const CSS = [
    '.ssp{background:#fff;border:1px solid #000;border-radius:12px;box-shadow:0 18px 40px -16px rgba(10,14,22,.45),0 2px 6px rgba(10,14,22,.12);overflow:hidden;margin:0 0 12px;container-type:inline-size;font-family:' + SANS + ';color:#141822;text-align:left}',
    '.ssp-haus{position:relative;display:flex;align-items:center;gap:10px;flex-wrap:wrap;min-height:46px;padding:5px 16px 5px 20px;background:' + METAL + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.1);border-bottom:1px solid #000;color:#fff;box-sizing:border-box}',
    '.ssp-haus::before{' + RIVET + ';left:7px}',
    '.ssp-haus::after{' + RIVET + ';right:7px}',
    '.ssp-titill' + K + '{font:700 11px/1.2 ' + MONO + '!important;letter-spacing:.16em!important;text-transform:uppercase!important;color:#eef1f4!important;text-shadow:0 1px 1px rgba(0,0,0,.6)!important;white-space:nowrap!important}',
    '.ssp-undir' + K + '{font:500 11.5px ' + MONO + '!important;color:#aab1bb!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}',
    '.ssp-hlid{margin-left:auto;display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
    '.ssp-buk{padding:10px 12px 12px;background:' + STAL + '}',
    '.ssp-reitir{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}',
    '.ssp-lina{display:grid;grid-template-columns:96px minmax(0,1fr);align-items:center;column-gap:10px;min-height:38px;padding:7px 10px;background:#fff;border-radius:6px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14);box-sizing:border-box}',
    '.ssp-lina.heil{grid-column:1 / -1}',
    '.ssp-lina.efst{align-items:start}',
    '.ssp-merki' + K + '{font:700 10.5px/1.3 ' + MONO + '!important;letter-spacing:.12em!important;text-transform:uppercase!important;color:#3a4250!important}',
    '.ssp-merki small' + K + '{display:block!important;font:500 10.5px ' + SANS + '!important;letter-spacing:0!important;text-transform:none!important;color:#6b7483!important}',
    '.ssp-gildi' + K + '{font:500 13.5px/1.45 ' + SANS + '!important;color:#141822!important;min-width:0!important;overflow-wrap:anywhere!important}',
    '.ssp-gildi.mono' + K + '{font-family:' + MONO + '!important;font-size:13px!important}',
    '.ssp-gildi.feitt' + K + '{font-weight:600!important}',
    '.ssp-daufur{color:#6b7483}',
    '.ssp-plotur{display:flex;flex-wrap:wrap;gap:5px;min-width:0}',
    '.ssp-plata' + K + '{display:inline-flex!important;align-items:center!important;gap:6px!important;height:24px!important;padding:0 9px!important;border-radius:4px!important;border:1px solid rgba(20,24,34,.16)!important;background:' + SILVER + '!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.12)!important;font:700 11px ' + MONO + '!important;letter-spacing:.03em!important;color:#1f2530!important;text-decoration:none!important;white-space:nowrap!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;vertical-align:middle!important;box-sizing:border-box!important}',
    'a.ssp-plata:hover{border-color:rgba(20,24,34,.34)}',
    '.ssp-haus .ssp-plata' + K + '{height:26px!important}',
    '.ssp-led{display:inline-block;width:7px;height:7px;border-radius:50%;flex:none;background:#8a929e;box-shadow:0 0 0 1px rgba(0,0,0,.25)}',
    '.ssp-led.rautt{background:#e0453c;box-shadow:0 0 6px rgba(224,69,60,.85),0 0 0 1px rgba(0,0,0,.3)}',
    '.ssp-led.graent{background:#2fbf6b;box-shadow:0 0 6px rgba(47,191,107,.85),0 0 0 1px rgba(0,0,0,.3)}',
    '.ssp-led.gull{background:#d9b762;box-shadow:0 0 6px rgba(217,183,98,.85),0 0 0 1px rgba(0,0,0,.3)}',
    '.ssp-btn' + K + '{display:inline-flex!important;align-items:center;justify-content:center;gap:6px;height:32px!important;min-height:0!important;padding:0 12px!important;border-radius:8px!important;border:1px solid rgba(20,24,34,.18)!important;background:' + SILVER + '!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.14)!important;color:#1f2530!important;font:600 12.5px/1 ' + SANS + '!important;cursor:pointer;white-space:nowrap;text-decoration:none!important;width:auto!important;box-sizing:border-box}',
    '.ssp-btn.malm' + K + '{background:' + MALM_TAKKI + '!important;border-color:#000!important;color:#eef1f4!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45)!important}',
    '.ssp-btn.ikon' + K + '{width:32px!important;padding:0!important}',
    '.ssp-btn[disabled]' + K + '{opacity:.38;pointer-events:none}',
    '.ssp-reitur' + K + '{width:100%;height:40px!important;min-height:0!important;box-sizing:border-box;padding:0 12px!important;background:#eef1f6!important;border:1px solid rgba(20,24,34,.14)!important;border-radius:8px!important;box-shadow:inset 0 2px 5px rgba(0,0,0,.18)!important;font:13.5px/1.4 ' + SANS + '!important;color:#141822!important}',
    'textarea.ssp-reitur' + K + '{height:auto!important;min-height:40px!important;padding:9px 12px!important;resize:vertical;field-sizing:content;max-height:220px}',
    '.ssp-mal{display:flex;align-items:baseline;gap:8px;margin:3px 0;line-height:1.45}',
    '.ssp-mal::before{content:"";flex:none;width:6px;height:6px;border-radius:50%;background:#b42318;transform:translateY(-1px)}',
    '.ssp-skilti' + K + '{font:700 10.5px ' + MONO + '!important;letter-spacing:.12em!important;text-transform:uppercase!important;color:#3a4250!important;margin:10px 0 4px!important}',
    '.ssp-medal' + K + '{font:500 11px ' + MONO + '!important;color:#6b7483!important}',
    '@container (max-width:560px){.ssp-reitir{grid-template-columns:minmax(0,1fr)}.ssp-lina{grid-template-columns:88px minmax(0,1fr)}.ssp-haus{padding-right:16px}}'
  ].join('\n');

  function mount() {
    let s = document.getElementById('_ssp-css');
    if (!s) {
      s = document.createElement('style');
      s.id = '_ssp-css';
      (document.head || document.documentElement).appendChild(s);
    }
    if (s.textContent !== CSS) s.textContent = CSS;
  }
  mount();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);

  // Emoji/tákn fremst í texta úr gögnum (t.d. „🔴 Ósvarað · …") — spjaldið sýnir stöðuna með LED í staðinn.
  function anEmoji(s) {
    return String(s == null ? '' : s).replace(/^[\s←-⯿✀-➿️‍]+/u, '').replace(/^(?:\p{Extended_Pictographic}|️|‍|\s)+/u, '').trim();
  }
  // Litur LED eftir stöðutexta: rautt = bíður/ósvarað, grænt = í lagi/afgreitt, gull = annað.
  function ledLitur(s) {
    const t = String(s || '').toLowerCase();
    if (/🔴|ósvar|bíð|vantar|liðin|villa|opið|opin/.test(t)) return 'rautt';
    if (/🟢|✅|✓|afgreitt|í lagi|lokið|svarað/.test(t)) return 'graent';
    return 'gull';
  }
  window.Stalspjald = { anEmoji, ledLitur, version: '442' };
})();
/* === END STÁLSPJALD === */
