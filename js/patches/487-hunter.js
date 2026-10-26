/* === HUNTER — sölulistar v1 (26.10.2026) ===
 *
 * Fyrirtæki sem við viljum í viðskipti. Kynningarpóstar úr eldklar@ (email_digest SENT, efni herferðar í
 * hunter_herferdir) verða sjálfkrafa að aðilum í hunter_adilar (hunter_innsog, pg_cron á 15 mín); svör, sjálfvirk svör og
 * skil (bounce) úr INBOX uppfæra stöðuna. Síðan sýnir listann í Brunastáli C (málmhaus, lykiltölur á stálplötu,
 * stöðuplötur) og spjald hvers aðila: tengiliður, staða, næsta skref, gátlisti, fasteignir (→ #greining), samskiptin
 * úr email_digest með svari í sama þræði gegnum eldklar@ (ReikningaPostur.replyTo / AppMail.send) og minnispunktar.
 * Mockup Agnars: claude.ai/artifact/Hski75RRHnF58fooq46DR1 („mátt búa til flott mockup", 26.10.2026). SQL: sql/hunter.sql.
 *
 * Reglur: engin eyðing (fjarlaegt_at); staða sem starfsmaður setur er aldrei yfirskrifuð af innsogi nema úr „Bíður svars"
 * / „Rangt netfang" í „Svar borist". Pósturinn er AÐEINS lesinn úr email_digest (aldrei Gmail-tenging einkahólfs).
 * Slóð: #hunter · #hunter/<id> opnar spjaldið. Forskeyti hu2- og falskir id-ar (K) gegn appham-uppblæstri.
 */
(() => {
  if (window.__hunter487) return;
  window.__hunter487 = true;

  const VIEW_ID = 'view-hunter';
  const NAV_KEY = 'hunter';
  const FRA = 'Brunahólf slökkvitæki ehf <eldklar@eldklar.is>';
  const SB = () => (window.DB && window.DB.sb) || null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, bad) => { try { if (window.Toast && Toast.show) return Toast.show((bad ? '⚠ ' : '') + m); } catch (_) {} try { console[bad ? 'warn' : 'log']('[hunter] ' + m); } catch (_) {} };
  const p2 = n => String(n).padStart(2, '0');
  const fmtD = v => { if (!v) return ''; const d = new Date(v); if (isNaN(d)) return ''; return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear(); };
  const fmtDT = v => { if (!v) return ''; const d = new Date(v); if (isNaN(d)) return ''; return fmtD(v) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
  const isoDag = v => { if (!v) return ''; const d = new Date(v); return isNaN(d) ? '' : d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  const dagar = v => { if (!v) return null; const d = new Date(v); if (isNaN(d)) return null; return Math.floor((Date.now() - d.getTime()) / 86400000); };
  const dagaOrd = n => n === 0 ? 'í dag' : (n % 10 === 1 && n % 100 !== 11) ? n + ' dagur' : n + ' dagar';

  const STODUR = {
    bidur:  { t: 'Bíður svars',        cls: 'silfur', led: '#a1a9b6' },
    svar:   { t: 'Svar borist',        cls: 'gull',   led: '#e0a93e' },
    rangt:  { t: 'Rangt netfang',      cls: 'rautt',  led: '#c92a2a' },
    sidar:  { t: 'Hafa samband síðar', cls: 'stal',   led: '#8f98a8' },
    fundur: { t: 'Fundur bókaður',     cls: 'blatt',  led: '#4f74dc' },
    unnid:  { t: 'Komið í viðskipti',  cls: 'graent', led: '#16783f' },
    hafnad: { t: 'Hafnað',             cls: 'rautt',  led: '#c92a2a' }
  };
  const ROD = { svar: 0, rangt: 1, fundur: 2, bidur: 4, sidar: 5, unnid: 6, hafnad: 7 };
  const GATLISTI = [['sent', 'Kynningarpóstur sendur'], ['svar', 'Svar borist — lesið'], ['tilbod', 'Verðskrá / tilboð sent'],
    ['simtal', 'Hringt í tengilið'], ['fundur', 'Fundur eða heimsókn'], ['stofnad', 'Fyrirtæki stofnað í Bakendanum']];

  const IK = {
    leit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>',
    saekja: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.4"></path><path d="M21 3v6h-6"></path></svg>',
    meira: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="12" r="2"></circle></svg>',
    hak: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"></path></svg>',
    postur: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h16v12H4z"></path><path d="m4 7 8 6 8-6"></path></svg>',
    simi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"></path></svg>',
    bakk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg>',
    loka: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"></path></svg>',
    stjarna: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z"></path></svg>',
    hus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"></path><path d="M5 10v10h14V10"></path><path d="M10 20v-6h4v6"></path></svg>'
  };

  // ── Stíll (Brunastál C) ─────────────────────────────────────────────────────────────────────────────
  function stillar() {
    if (document.getElementById('hu2-skin')) return;
    if (!document.getElementById('hl-fonts') && !document.getElementById('hu2-fonts')) {
      const l = document.createElement('link'); l.id = 'hu2-fonts'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@700;800&display=swap';
      (document.head || document.documentElement).appendChild(l);
    }
    const V = '#view-hunter ', K = ':not(#_h487a):not(#_h487b):not(#_h487c):not(#_h487d)';
    const SANS = '"IBM Plex Sans",system-ui,sans-serif', MONO = '"JetBrains Mono",ui-monospace,monospace', DISP = '"Playfair Display",Georgia,serif';
    const METAL = 'linear-gradient(145deg,#08080a 0%,#26262c 26%,#3a3a41 50%,#19191d 74%,#070709 100%)';
    const STAL = 'repeating-linear-gradient(108deg,rgba(255,255,255,.34) 0 1px,transparent 1px 4px),linear-gradient(180deg,#e8ebf0 0%,#dce1e8 100%)';
    const SILVER = 'linear-gradient(180deg,#fdfdfe 0%,#e3e7ee 100%)', MALM = 'linear-gradient(180deg,#3d4048 0%,#1c1e23 100%)';
    const RIVET = 'radial-gradient(circle at 35% 30%,#f4f6f8 0%,#aab1bb 40%,#3b3f46 100%)';
    const REIT = 'inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.12),0 2px 4px rgba(10,14,22,.14)';
    const BSTAL = 'linear-gradient(145deg,#0d0102 0%,#380506 20%,#6c0d10 43%,#971515 53%,#420607 74%,#100102 100%)';
    const SAEKJA = 'linear-gradient(145deg,#010d05 0%,#06331a 20%,#0e5a2e 43%,#16783f 53%,#073a1d 74%,#010f06 100%)';
    const GULL = 'linear-gradient(145deg,#171001 0%,#3d2b05 20%,#8a6410 43%,#d3ab4e 53%,#5a3f07 74%,#171001 100%)';
    const BLATT = 'linear-gradient(145deg,#040d18 0%,#0b2440 20%,#154a7d 43%,#2f7fc9 53%,#0d2b4c 74%,#040d18 100%)';
    const TAKKI = 'margin:0!important;min-height:0!important;min-width:0!important;box-sizing:border-box!important;cursor:pointer;line-height:1!important;';
    const BTN = (bg, edge, ink, sh) => '{' + TAKKI + 'height:40px!important;width:auto!important;display:inline-flex!important;align-items:center;justify-content:center;gap:7px;padding:0 14px!important;border-radius:9px!important;border:1px solid ' + edge + '!important;background:' + bg + '!important;color:' + ink + '!important;font:700 13px ' + SANS + '!important;box-shadow:' + sh + '!important;white-space:nowrap;text-decoration:none!important}';
    const s = document.createElement('style'); s.id = 'hu2-skin';
    s.textContent = [
      '#view-hunter{padding:0!important;max-width:none!important;background:transparent!important}',
      '#view-hunter #hu-main.main-panel{max-width:none!important;width:100%!important;padding:0!important;box-sizing:border-box}',
      V + '.hu2{display:flex;flex-direction:column;gap:16px;font-family:' + SANS + ';color:#141822;container-type:inline-size;container-name:hu2;-webkit-font-smoothing:antialiased}',
      V + '.hu2 *,.hu2-spjald *,.hu2-modal *{box-sizing:border-box}',
      V + '.hu2 svg,.hu2-spjald svg,.hu2-modal svg{flex:none;width:16px;height:16px}',
      V + '.hu2 button:focus-visible,.hu2-spjald button:focus-visible,.hu2-spjald input:focus-visible,.hu2-modal button:focus-visible{outline:2px solid #c92a2a!important;outline-offset:2px}',
      // málmhaus
      V + '.hu2-haus{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:14px 22px;padding:18px 24px 18px 30px;border-radius:14px;border:1px solid #000;background:' + METAL + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.1),0 18px 40px -16px rgba(0,0,0,.6)}',
      '.hu2-hnod{position:absolute;width:7px;height:7px;border-radius:50%;background:' + RIVET + ';box-shadow:0 1px 1px rgba(0,0,0,.7)}',
      '.hu2-hnod.a{top:9px;left:9px}.hu2-hnod.b{top:9px;right:9px}.hu2-hnod.c{bottom:9px;left:9px}.hu2-hnod.d{bottom:9px;right:9px}.hu2-hnod.v{top:50%;left:9px;margin-top:-3.5px}.hu2-hnod.h{top:50%;right:7px;margin-top:-3.5px}',
      V + '.hu2-titill{flex:1 1 300px;min-width:0;display:flex;flex-direction:column;gap:6px}',
      V + '.hu2-titill h1' + K + '{margin:0!important;display:flex;align-items:baseline;gap:14px;font:800 30px/1.1 ' + DISP + '!important;letter-spacing:-.01em!important;color:#f4f6f8!important;text-shadow:0 1px 0 rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.35)!important}',
      V + '.hu2-titill h1 span{font:700 11.5px ' + MONO + ';letter-spacing:.2em;text-transform:uppercase;color:#d5dbe6;text-shadow:none}',
      V + '.hu2-undir{font:13px/1.4 ' + SANS + ';color:#d9dee6}',
      V + '.hu2-tol{display:flex;flex-wrap:wrap;align-items:center;gap:10px}',
      // takkar
      V + '.hu2-raud' + K + ',.hu2-spjald .hu2-raud' + K + ',.hu2-modal .hu2-raud' + K + BTN(BSTAL, 'rgba(190,32,28,.55)', '#fff', '0 0 16px -4px rgba(160,16,16,.55),inset 0 1px 0 rgba(255,255,255,.16)'),
      V + '.hu2-malm' + K + ',.hu2-spjald .hu2-malm' + K + ',.hu2-modal .hu2-malm' + K + BTN(MALM, '#000', '#eef1f4', 'inset 0 1px 0 rgba(255,255,255,.14),0 2px 6px rgba(0,0,0,.45)'),
      V + '.hu2-silfur' + K + ',.hu2-spjald .hu2-silfur' + K + ',.hu2-modal .hu2-silfur' + K + BTN(SILVER, 'rgba(20,24,34,.16)', '#3a4250', 'inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)'),
      V + '.hu2-graen' + K + ',.hu2-spjald .hu2-graen' + K + BTN(SAEKJA, 'rgba(52,168,98,.55)', '#fff', 'inset 0 1px 0 rgba(255,255,255,.18),0 0 14px -5px rgba(22,140,72,.65),0 2px 5px rgba(0,0,0,.3)'),
      '.hu2-sm' + K + '{height:34px!important;padding:0 11px!important;font-size:12.5px!important}',
      '.hu2-ib' + K + '{width:36px!important;height:36px!important;padding:0!important}',
      '.hu2-raud:hover,.hu2-malm:hover,.hu2-silfur:hover,.hu2-graen:hover{filter:brightness(1.12)}',
      // reitir
      '.hu2-reitur{display:flex;align-items:center;gap:8px;height:40px;margin:0;padding:0 12px;border-radius:9px;border:1px solid rgba(20,24,34,.14);background:#eef1f6;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);color:#5b6472;min-width:0;cursor:text}',
      '.hu2-reitur input' + K + ',.hu2-reitur select' + K + ',.hu2-reitur textarea' + K + '{flex:1 1 auto!important;min-width:0!important;width:100%!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;outline:none!important;font:13.5px/1.3 ' + SANS + '!important;color:#141822!important;resize:none}',
      '.hu2-reitur input::placeholder,.hu2-reitur textarea::placeholder{color:#6b7483!important;opacity:1}',
      '.hu2-reitur.mono input' + K + '{font-family:' + MONO + '!important}',
      '.hu2-reitur.ha{height:auto;min-height:72px;align-items:flex-start;padding:10px 12px}',
      '.hu2-reitur .hu2-merki{flex:none;letter-spacing:.1em;font-size:10px;white-space:nowrap}',
      V + '.hu2-haus .hu2-reitur{width:260px;max-width:100%;border-color:#000}',
      // stálplata + lykiltölur
      V + '.hu2-plata{display:flex;flex-direction:column;gap:12px;padding:14px;border-radius:14px;border:1px solid rgba(0,0,0,.55);background-color:#e2e6ec;background-image:' + STAL + ';box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 18px 40px -18px rgba(0,0,0,.6)}',
      V + '.hu2-kpi{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}',
      V + '.hu2-k' + K + '{all:unset;box-sizing:border-box;cursor:pointer;display:flex!important;flex-direction:column;gap:6px;min-width:0;padding:12px 14px 11px!important;border-radius:10px!important;background:#fff!important;box-shadow:' + REIT + '!important;text-align:left;font:inherit!important;color:inherit!important;height:auto!important;width:100%!important;border:0!important}',
      V + '.hu2-k:hover' + K + '{box-shadow:inset 0 1px 0 rgba(255,255,255,.9),inset 0 0 0 1px rgba(20,24,34,.3),0 3px 8px rgba(10,14,22,.18)!important}',
      V + '.hu2-k.is-on' + K + '{box-shadow:inset 0 0 0 2px #11141c,0 3px 8px rgba(10,14,22,.2)!important}',
      '.hu2-merki{display:flex;align-items:center;gap:7px;font:700 10.5px/1.2 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#3a4250;white-space:nowrap}',
      '.hu2-led{display:inline-block;flex:none;width:8px;height:8px;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.2)}',
      V + '.hu2-tala{display:block;font:700 22px/1.15 ' + MONO + ';letter-spacing:-.02em;color:#11141c;font-variant-numeric:tabular-nums}',
      '.hu2-skyr{display:block;font-size:12px;line-height:1.3;color:#5b6472;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      V + '.hu2-eftir{display:flex;flex-wrap:wrap;align-items:center;gap:14px;padding:10px 14px;border-radius:10px;background:#fff;box-shadow:' + REIT + '}',
      V + '.hu2-strik{flex:1 1 240px;height:10px;border-radius:3px;background:#dfe3ea;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);display:flex;gap:3px;overflow:hidden}',
      V + '.hu2-strik span{display:block;border-radius:3px;min-width:4px}',
      V + '.hu2-strik .g{background:linear-gradient(180deg,#ffe0a0 0%,#e0a93e 40%,#935f0d 60%,#b27b1c 100%)}' + V + '.hu2-strik .s{background:linear-gradient(180deg,#e2e6ec 0%,#8f98a8 40%,#555d6b 60%,#737c8b 100%)}' + V + '.hu2-strik .a{background:linear-gradient(180deg,#7fe0a8 0%,#23a35a 40%,#0b5a2e 60%,#137a41 100%)}',
      V + '.hu2-eftir-t{font:11.5px ' + MONO + ';color:#2b313c;white-space:nowrap}' + V + '.hu2-eftir-t b{font-weight:700}',
      V + '.hu2-flisar{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
      '.hu2-flis' + K + '{' + TAKKI + 'height:26px!important;width:auto!important;display:inline-flex!important;align-items:center;padding:0 8px!important;border-radius:3px!important;border:1px solid rgba(20,24,34,.12)!important;background:' + SILVER + '!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12)!important;font:700 10.5px ' + MONO + '!important;letter-spacing:.06em;text-transform:uppercase;color:#2b313c!important;white-space:nowrap}',
      '.hu2-flis.is-on' + K + '{background:' + MALM + '!important;border-color:#000!important;color:#fff!important}',
      '.hu2-flis.dauf' + K + '{cursor:default;background:#eceff4!important;box-shadow:none!important}',
      // listaskel
      V + '.hu2-skel{border-radius:14px;border:1px solid rgba(0,0,0,.55);background:#fff;overflow:hidden;box-shadow:0 18px 40px -16px rgba(0,0,0,.6)}',
      V + '.hu2-skel-haus{position:relative;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 16px 10px 24px;background:' + METAL + ';border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.1)}',
      V + '.hu2-sia{display:flex;flex-wrap:wrap;gap:6px}',
      V + '.hu2-sia button' + K + '{' + TAKKI + 'height:36px!important;width:auto!important;display:inline-flex!important;align-items:center;gap:8px;padding:0 11px 0 13px!important;border-radius:9px!important;border:1px solid rgba(255,255,255,.12)!important;background:transparent!important;color:#d5dbe6!important;font:600 13px ' + SANS + '!important;box-shadow:none!important;white-space:nowrap}',
      V + '.hu2-sia button span' + K + '{padding:2px 7px!important;border-radius:99px!important;background:rgba(255,255,255,.12)!important;color:#eef1f4!important;font:700 11px/1.2 ' + MONO + '!important}',
      V + '.hu2-sia button.is-on' + K + '{background:' + SILVER + '!important;border-color:rgba(20,24,34,.25)!important;color:#11141c!important;box-shadow:inset 0 1px 0 #fff,0 1px 2px rgba(0,0,0,.3)!important}',
      V + '.hu2-sia button.is-on span' + K + '{background:#1d1f24!important;color:#fff!important}',
      V + '.hu2-sia button:not(.is-on):hover' + K + '{background:rgba(255,255,255,.07)!important}',
      V + '.hu2-sia button svg{width:14px;height:14px;color:#e0a93e}',
      V + '.hu2-skel-rod{margin-left:auto;font:11.5px ' + MONO + ';color:#d5dbe6;white-space:nowrap}',
      V + '.hu2-tbw{overflow-x:auto}',
      V + '.hu2-tafla' + K + '{width:100%!important;min-width:0;border-collapse:separate!important;border-spacing:0;display:table!important;font-family:' + SANS + '}',
      V + '.hu2-tafla th' + K + '{background:#f4f6f9!important;text-align:left;padding:10px 12px!important;font:700 10.5px ' + MONO + '!important;letter-spacing:.12em;text-transform:uppercase;color:#3a4250!important;border-bottom:1px solid rgba(20,24,34,.12)!important;white-space:nowrap}',
      V + '.hu2-tafla td' + K + '{padding:9px 12px!important;border-bottom:1px solid #edf0f4!important;vertical-align:middle;font:13px/1.3 ' + SANS + '!important;color:#1f2530!important;background:transparent!important}',
      V + '.hu2-tafla tr:last-child td' + K + '{border-bottom:0!important}',
      V + '.hu2-tafla tbody tr{cursor:pointer}' + V + '.hu2-tafla tbody tr:hover td' + K + '{background:#f6f8fb!important}',
      V + '.hu2-tafla tbody tr.is-open td' + K + '{background:#eef1f6!important}',
      V + '.hu2-tafla td:first-child{box-shadow:inset 3px 0 0 #dfe3ea}',
      V + '.hu2-tafla tr.r-gull td:first-child{box-shadow:inset 3px 0 0 #8a6410}' + V + '.hu2-tafla tr.r-stal td:first-child{box-shadow:inset 3px 0 0 #3a3a41}' + V + '.hu2-tafla tr.r-blatt td:first-child{box-shadow:inset 3px 0 0 rgba(60,120,200,.6)}' + V + '.hu2-tafla tr.r-graent td:first-child{box-shadow:inset 3px 0 0 #16783f}' + V + '.hu2-tafla tr.r-rautt td:first-child{box-shadow:inset 3px 0 0 #971515}',
      V + '.hu2-nafn{font-weight:700;color:#11141c;display:flex;align-items:center;gap:6px}' + V + '.hu2-nafn svg{width:13px;height:13px;color:#e0a93e}',
      '.hu2-sub{font-size:11px;color:#5b6472;display:block;margin-top:2px}',
      '.hu2-mono{font:11.5px ' + MONO + ';color:#3a4250;white-space:nowrap}' + '.hu2-mono.dauf{color:#a1a9b6}',
      '.hu2-sidast{display:flex;align-items:center;gap:8px;white-space:nowrap}',
      '.hu2-dot{display:inline-block;flex:none;width:6px;height:6px;border-radius:50%;background:#a1a9b6}.hu2-dot.lengi{background:#c92a2a;box-shadow:0 0 0 3px rgba(160,16,16,.35)}.hu2-dot.svarad{background:#16783f}.hu2-dot.skil{background:#c92a2a;box-shadow:0 0 0 3px rgba(160,16,16,.35)}.hu2-dot.sjalfv{background:#e0a93e}',
      '.hu2-naesta{font-size:12px;color:#2b313c}.hu2-naesta.hot{font-weight:700;color:#845400}.hu2-naesta.raud{font-weight:700;color:#b42318}',
      // stöðuplata
      '.hu2-pl{display:inline-flex;align-items:center;gap:7px;width:142px;height:26px;padding:0 10px;border-radius:3px;border:1px solid;font:700 12px ' + SANS + ';color:#fff;text-shadow:0 1px 1px rgba(0,0,0,.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.hu2-pl i{width:5px;height:5px;border-radius:50%;flex:none}',
      '.hu2-pl.silfur{background:' + SILVER + ';border-color:rgba(20,24,34,.16);color:#3a4250;text-shadow:none}.hu2-pl.silfur i{background:#a1a9b6}',
      '.hu2-pl.gull{background:' + GULL + ';border-color:rgba(190,150,60,.5)}.hu2-pl.gull i{background:#f7e6a8}',
      '.hu2-pl.stal{background:' + MALM + ';border-color:#000}.hu2-pl.stal i{background:#8f98a8}',
      '.hu2-pl.blatt{background:' + BLATT + ';border-color:rgba(60,120,200,.45)}.hu2-pl.blatt i{background:#9fd0ff}',
      '.hu2-pl.graent{background:' + SAEKJA + ';border-color:rgba(52,168,98,.55)}.hu2-pl.graent i{background:#7fe0a8}',
      '.hu2-pl.rautt{background:' + BSTAL + ';border-color:rgba(190,32,28,.55)}.hu2-pl.rautt i{background:#ff9d95}',
      V + '.hu2-fot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 20px;background:#f4f6f9;border-top:1px solid rgba(20,24,34,.12);flex-wrap:wrap}',
      V + '.hu2-tomt{padding:40px 20px;text-align:center;color:#5b6472;font-size:14px}',
      // ── spjald aðila (fast hægra megin; fullur skjár þröngt) ──
      '.hu2-spjald{position:fixed;top:0;right:0;bottom:0;width:min(600px,100vw);z-index:1200;display:flex;flex-direction:column;background:#fff;border-left:1px solid #000;box-shadow:-24px 0 60px -20px rgba(0,0,0,.6);font-family:' + SANS + ';color:#11141c;-webkit-font-smoothing:antialiased}',
      '.hu2-spjald-haus{position:relative;flex:none;display:flex;align-items:center;gap:12px;padding:12px 20px;background:' + METAL + ';border-bottom:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.14)}',
      '.hu2-spjald-haus h2' + K + '{margin:0!important;flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px;font:600 15px/20px ' + SANS + '!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)!important}',
      '.hu2-spjald-haus h2 small{font:11.5px ' + MONO + ';color:#d5dbe6;text-shadow:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.hu2-spjald-haus .hu2-ib' + K + '{border:1px solid rgba(255,255,255,.14)!important;background:transparent!important;color:#eef1f4!important;box-shadow:none!important}',
      '.hu2-spjald-haus .hu2-ib.stj' + K + '{color:#6b7483!important}.hu2-spjald-haus .hu2-ib.stj.is-on' + K + '{color:#f3d98a!important}',
      '.hu2-spjald-bukur{flex:1 1 auto;min-height:0;overflow:auto;padding:14px 16px 16px;display:flex;flex-direction:column;gap:14px}',
      '.hu2-kafli{display:flex;flex-direction:column;gap:8px}',
      '.hu2-kafli-h{display:flex;align-items:center;gap:10px;min-height:26px}' + '.hu2-kafli-h .hu2-skyr{margin-left:auto}',
      '.hu2-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}',
      '.hu2-line{background:#fff;border-radius:6px;box-shadow:' + REIT + '}',
      '.hu2-chip{display:inline-flex;align-items:center;height:22px;padding:0 8px;border-radius:3px;background:' + SILVER + ';border:1px solid rgba(20,24,34,.12);box-shadow:inset 0 1px 0 rgba(255,255,255,.85),0 1px 2px rgba(0,0,0,.12);font:700 10.5px ' + MONO + ';letter-spacing:.06em;text-transform:uppercase;color:#2b313c;white-space:nowrap}',
      '.hu2-chip.dokk{background:' + MALM + ';border-color:#000;color:#fff}.hu2-chip.raud{background:' + BSTAL + ';border-color:rgba(190,32,28,.55);color:#fff}',
      '.hu2-stodur{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}',
      '.hu2-st' + K + '{' + TAKKI + 'display:flex!important;align-items:center;gap:8px;height:40px!important;width:100%!important;padding:0 10px!important;border-radius:9px!important;border:1px solid rgba(20,24,34,.16)!important;background:' + SILVER + '!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 1px 2px rgba(0,0,0,.1)!important;font:600 12.5px ' + SANS + '!important;color:#3a4250!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.hu2-st i{width:8px;height:8px;border-radius:50%;flex:none}',
      '.hu2-st.is-on' + K + '{background:' + METAL + '!important;border-color:#000!important;color:#fff!important;text-shadow:0 1px 1px rgba(0,0,0,.5)}',
      '.hu2-gat{padding:4px;display:flex;flex-direction:column}',
      '.hu2-gat button' + K + '{' + TAKKI + 'display:flex!important;align-items:center;gap:12px;min-height:44px!important;height:auto!important;width:100%!important;padding:0 12px!important;border-radius:8px!important;border:0!important;background:transparent!important;color:#1f2530!important;font:500 13.5px ' + SANS + '!important;box-shadow:none!important;text-align:left}',
      '.hu2-gat button:hover' + K + '{background:#f1f4f8!important}',
      '.hu2-box{width:24px;height:24px;border-radius:50%;border:1px solid rgba(20,24,34,.16);display:inline-flex;align-items:center;justify-content:center;color:#a1a9b6;flex:none;background:#fff}.hu2-box svg{width:14px;height:14px}',
      '.hu2-box.is-on{background:' + SAEKJA + ';border-color:rgba(52,168,98,.55);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.18)}',
      '.hu2-gat .d{margin-left:auto;font:11.5px ' + MONO + ';color:#5b6472;white-space:nowrap}.hu2-gat button.is-on .t{color:#5b6472;text-decoration:line-through}',
      '.hu2-framv{flex:1 1 auto;height:6px;border-radius:3px;background:#dfe3ea;box-shadow:inset 0 2px 5px rgba(0,0,0,.18);overflow:hidden}.hu2-framv span{display:block;height:100%;background:linear-gradient(180deg,#7fe0a8 0%,#23a35a 40%,#0b5a2e 60%,#137a41 100%);border-radius:3px}',
      // fasteignir
      '.hu2-fst{display:flex;align-items:center;gap:10px;padding:8px 12px;flex-wrap:wrap}',
      '.hu2-fst .n{flex:1 1 180px;min-width:0;font-weight:600;font-size:13px}.hu2-fst .n small{display:block;font:11px ' + MONO + ';color:#5b6472;font-weight:400}',
      '.hu2-fst .hu2-reitur{width:92px;height:34px}.hu2-fst .hu2-reitur input' + K + '{text-align:center;font-family:' + MONO + '!important}',
      '.hu2-fst a.hu2-silfur' + K + '{height:34px!important;padding:0 11px!important;font-size:12.5px!important}',
      '.hu2-leit-l{display:flex;flex-direction:column;gap:4px;padding:6px;max-height:220px;overflow:auto}',
      '.hu2-leit-l button' + K + '{' + TAKKI + 'display:flex!important;align-items:center;gap:8px;min-height:40px!important;height:auto!important;width:100%!important;padding:6px 10px!important;border-radius:8px!important;border:0!important;background:transparent!important;color:#1f2530!important;font:500 13px/1.3 ' + SANS + '!important;box-shadow:none!important;text-align:left}',
      '.hu2-leit-l button:hover' + K + '{background:#f1f4f8!important}',
      // samskipti
      '.hu2-msg{padding:10px 12px;border-radius:8px;background:#fff;box-shadow:' + REIT + ';display:flex;flex-direction:column;gap:6px}',
      '.hu2-msg.dauf{opacity:.8}',
      '.hu2-msg .h{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.hu2-msg .n{font-weight:700;font-size:13px;color:#11141c;min-width:0;overflow:hidden;text-overflow:ellipsis}.hu2-msg .dt{font:11.5px ' + MONO + ';color:#5b6472;margin-left:auto;white-space:nowrap}',
      '.hu2-msg .s{font-weight:700;font-size:13px;color:#1f2530}',
      '.hu2-msg .b{margin:0;font-size:13.5px;line-height:1.45;color:#2b313c;white-space:pre-line;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.hu2-msg.opid .b{display:block;-webkit-line-clamp:none}',
      '.hu2-msg .f{display:flex;gap:8px;align-items:center}',
      '.hu2-msg .f button' + K + '{height:30px!important;padding:0 10px!important;font-size:12px!important}',
      '.hu2-spjald-fot{flex:none;display:flex;align-items:center;gap:8px;padding:12px 16px;background:#f4f6f9;border-top:1px solid rgba(20,24,34,.12);flex-wrap:wrap}',
      '.hu2-spjald-fot .hu2-ib{margin-left:auto}',
      // ⋯-valmynd og modal
      '.hu2-pop{position:fixed;z-index:1300;width:252px;padding:6px;border-radius:12px;border:1px solid rgba(20,24,34,.12);background:#fff;box-shadow:0 18px 40px -12px rgba(10,14,22,.5),0 2px 6px rgba(10,14,22,.12);display:flex;flex-direction:column;gap:2px;font-family:' + SANS + '}',
      '.hu2-pop button' + K + '{' + TAKKI + 'display:flex!important;align-items:center;gap:10px;height:40px!important;width:100%!important;padding:0 10px!important;border-radius:8px!important;border:0!important;background:transparent!important;color:#1f2530!important;font:500 13.5px ' + SANS + '!important;box-shadow:none!important;text-align:left}',
      '.hu2-pop button:hover' + K + ',.hu2-pop button:focus' + K + '{background:#f1f4f8!important}',
      '.hu2-pop button.haetta' + K + '{color:#b42318!important;font-weight:600!important}.hu2-pop hr{border:0;border-top:1px solid #eceff3;margin:4px 6px}',
      '.hu2-pop button svg{width:16px;height:16px;color:#5b6472}',
      '.hu2-bak{position:fixed;inset:0;z-index:1250;background:rgba(6,6,7,.55);display:flex;align-items:center;justify-content:center;padding:16px}',
      '.hu2-modal{width:min(640px,100%);max-height:calc(100vh - 32px);display:flex;flex-direction:column;background:#fff;border:1px solid #000;border-radius:12px;overflow:hidden;box-shadow:0 30px 60px -20px rgba(0,0,0,.7);font-family:' + SANS + ';color:#11141c}',
      '.hu2-modal .hu2-spjald-haus h2' + K + '{font:600 15px/20px ' + SANS + '!important}',
      '.hu2-modal-b{padding:14px 16px;display:flex;flex-direction:column;gap:10px;overflow:auto}',
      '.hu2-modal-b textarea' + K + '{min-height:180px!important;height:auto!important;line-height:1.45!important}',
      '.hu2-stada-l{font-size:12px;color:#5b6472}.hu2-stada-l.villa{color:#b42318;font-weight:600}',
      '.hu2-hak-l{display:flex;align-items:center;gap:8px;font-size:13px;color:#2b313c;min-height:40px}.hu2-hak-l input{width:18px;height:18px;margin:0}',
      // þröngt
      '@container hu2 (max-width: 980px){' + V + '.hu2-kpi{grid-template-columns:repeat(3,minmax(0,1fr))}}',
      '@container hu2 (max-width: 760px){' + V + '.hu2-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}' + V + '.hu2-haus{padding:14px 16px 14px 22px}' + V + '.hu2-titill h1' + K + '{font-size:24px!important}' + V + '.hu2-tafla .fela{display:none}}',
      '@media (max-width: 700px){.hu2-spjald{width:100vw;border-left:0}.hu2-stodur{grid-template-columns:repeat(2,minmax(0,1fr))}.hu2-grid2{grid-template-columns:minmax(0,1fr)}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ── Ástand ───────────────────────────────────────────────────────────────────────────────────────────
  const S = { rows: [], fast: {}, sia: 'allir', herferd: null, leit: '', opinn: null, post: {}, postHl: {}, hladid: false, hledur: false, leitN: null, opnirPostar: {} };
  let _pop = null, _bak = null, _leitT = null;

  // ── Afleiddar upplýsingar hverrar línu ───────────────────────────────────────────────────────────────
  function afleitt(a) {
    const okkur = a.sidast_fra_okkur_at, theim = a.sidast_fra_theim_at, sjalfv = a.sidast_sjalfvirkt_at;
    const svarad = theim && (!okkur || new Date(theim) >= new Date(okkur));
    const d = dagar(okkur);
    let dot = 'bidur', sidast = okkur, sidastT = okkur ? 'Sent ' + fmtD(okkur) + ' — ekkert svar' : 'Enginn póstur skráður';
    if (a.skiladist_ekki && a.stada === 'rangt') { dot = 'skil'; sidast = a.skil_at || okkur; sidastT = 'Skilaðist ekki ' + fmtD(sidast); }
    else if (svarad) { dot = 'svarad'; sidast = theim; sidastT = 'Svar ' + fmtD(theim); }
    else if (sjalfv && (!okkur || new Date(sjalfv) >= new Date(okkur))) { dot = 'sjalfv'; sidast = sjalfv; sidastT = 'Sjálfvirkt svar ' + fmtD(sjalfv) + ' — ekkert raunsvar'; }
    else if (d != null && d >= 15 && a.stada === 'bidur') { dot = 'lengi'; sidastT = 'Ósvarað í ' + dagaOrd(d) + ' — sent ' + fmtD(okkur); }
    else if (d != null && a.stada === 'bidur') { sidastT = 'Ósvarað í ' + dagaOrd(d) + ' — sent ' + fmtD(okkur); }
    const st = STODUR[a.stada] || STODUR.bidur;
    let naesta = a.naesta_skref || '', ncls = '';
    if (!naesta) {
      if (a.stada === 'svar') { naesta = 'Svara — ' + (svarad ? 'spurning bíður' : 'lesa svarið'); ncls = 'hot'; }
      else if (a.stada === 'rangt') { naesta = 'Senda aftur á rétt netfang'; ncls = 'raud'; }
      else if (a.stada === 'bidur' && dot === 'lengi') { naesta = 'Fylgja eftir — hringja'; ncls = 'hot'; }
      else if (a.stada === 'bidur') naesta = 'Bíða eftir svari';
      else if (a.stada === 'sidar') naesta = 'Hafa samband' + (a.naesta_dags ? ' ' + fmtD(a.naesta_dags) : ' · dags óákveðin');
      else if (a.stada === 'fundur') { naesta = 'Fundur' + (a.naesta_dags ? ' ' + fmtD(a.naesta_dags) : ''); ncls = 'hot'; }
      else if (a.stada === 'hafnad') naesta = 'Engin eftirfylgni';
      else if (a.stada === 'unnid') naesta = 'Í þjónustu';
    } else if (a.naesta_dags) naesta += ' · ' + fmtD(a.naesta_dags);
    if (a.naesta_dags && a.stada !== 'hafnad' && a.stada !== 'unnid') { const nd = dagar(a.naesta_dags); if (nd != null && nd >= 0) ncls = ncls || 'hot'; }
    const taeki = (S.fast[a.id] || []).reduce((n, f) => n + (+f.taeki_aaetlad || 0), 0);
    return { st, dot, sidast, sidastT, naesta, ncls, d, lengi: dot === 'lengi', taeki, fjFast: (S.fast[a.id] || []).length };
  }
  function rodun(a, b) {
    const A = afleitt(a), B = afleitt(b);
    const ra = a.stada === 'bidur' && A.lengi ? 3 : (ROD[a.stada] != null ? ROD[a.stada] : 4);
    const rb = b.stada === 'bidur' && B.lengi ? 3 : (ROD[b.stada] != null ? ROD[b.stada] : 4);
    if (ra !== rb) return ra - rb;
    if (!!b.stjarna !== !!a.stjarna) return b.stjarna ? 1 : -1;
    return String(a.nafn || '').localeCompare(String(b.nafn || ''), 'is');
  }
  function siad() {
    const q = S.leit.trim().toLowerCase();
    return S.rows.filter(a => {
      if (S.sia === 'stjarna') { if (!a.stjarna) return false; }
      else if (S.sia !== 'allir' && a.stada !== S.sia) return false;
      if (S.herferd && (a.herferd || '') !== S.herferd) return false;
      if (q && !([a.nafn, a.len, a.netfang, a.tengilidur, a.simi, a.herferd, a.minnispunktar].join(' ').toLowerCase().includes(q))) return false;
      return true;
    }).sort(rodun);
  }

  // ── Gögn ─────────────────────────────────────────────────────────────────────────────────────────────
  async function load() {
    const sb = SB();
    const main = document.getElementById('hu-main');
    if (!sb) { if (main && !S.hladid) main.innerHTML = '<div class="hu2"><div class="hu2-tomt">Tengist gagnagrunni…</div></div>'; setTimeout(load, 400); return; }
    if (S.hledur) return;
    S.hledur = true;
    try {
      const [a, f] = await Promise.all([
        sb.from('hunter_adilar').select('*').is('fjarlaegt_at', null).order('id'),
        sb.from('hunter_fasteignir').select('*').is('fjarlaegt_at', null).order('id')
      ]);
      if (a.error) throw a.error;
      S.rows = a.data || [];
      S.fast = {};
      (f.data || []).forEach(x => { (S.fast[x.adili_id] = S.fast[x.adili_id] || []).push(x); });
      S.hladid = true;
    } catch (e) {
      toast('Hunter: náði ekki í listann — ' + ((e && e.message) || e), true);
    } finally { S.hledur = false; }
    render();
    if (S.opinn != null) teiknaSpjald();
  }
  async function vista(id, breyting) {
    const sb = SB(); if (!sb) { toast('Enginn gagnagrunnur — ekkert vistað', true); return false; }
    breyting = Object.assign({}, breyting, { updated_at: new Date().toISOString() });
    const r = await sb.from('hunter_adilar').update(breyting).eq('id', id).select('*');
    if (r.error || !r.data || !r.data.length) { toast('Vistun mistókst: ' + ((r.error && r.error.message) || 'engin lína'), true); return false; }
    const i = S.rows.findIndex(x => x.id === id);
    if (i >= 0) S.rows[i] = r.data[0];
    return true;
  }
  async function saekjaPost(btn) {
    const sb = SB(); if (!sb) return;
    if (btn) { btn.disabled = true; btn.style.opacity = '.6'; }
    try {
      const r = await sb.rpc('hunter_innsog', { p_days: 7 });
      if (r.error) throw r.error;
      const t = {}; (r.data || []).forEach(x => { t[x.adgerd] = x.n; });
      toast('Póstur sóttur: ' + (t.nyir || 0) + ' nýir · ' + (t.svor || 0) + ' svör · ' + (t.skiladist_ekki || 0) + ' skil');
      await load();
    } catch (e) { toast('Innsog mistókst: ' + ((e && e.message) || e), true); }
    finally { if (btn) { btn.disabled = false; btn.style.opacity = ''; } }
  }

  // ── Listasíðan ───────────────────────────────────────────────────────────────────────────────────────
  function hnod(k) { return k.split('').map(c => '<span class="hu2-hnod ' + c + '" aria-hidden="true"></span>').join(''); }
  function plata(a) { const st = STODUR[a.stada] || STODUR.bidur; return '<span class="hu2-pl ' + st.cls + '"><i aria-hidden="true"></i>' + esc(st.t) + '</span>'; }
  function render() {
    const main = document.getElementById('hu-main'); if (!main) return;
    const alla = S.rows, af = alla.map(afleitt);
    const n = k => alla.filter(a => a.stada === k).length;
    const K = { alls: alla.length, sendir: alla.filter(a => a.fyrst_sent_at).length, bidur: n('bidur'), lengi: af.filter(x => x.lengi).length, svar: n('svar'), rangt: n('rangt'), sidar: n('sidar'), fundur: n('fundur'), unnid: n('unnid'), hafnad: n('hafnad'), stjarna: alla.filter(a => a.stjarna).length };
    const afgreitt = K.svar + K.sidar + K.fundur + K.unnid + K.hafnad + K.rangt;
    const bidaNy = K.bidur - K.lengi;
    const herferdir = {}; alla.forEach(a => { const h = a.herferd || 'Án herferðar'; herferdir[h] = (herferdir[h] || 0) + 1; });
    const naestiFundur = alla.filter(a => a.stada === 'fundur' && a.naesta_dags).map(a => a.naesta_dags).sort()[0];
    const kpi = (k, led, heiti, tala, skyr) => '<button type="button" class="hu2-k' + (S.sia === k ? ' is-on' : '') + '" data-act="sia" data-k="' + k + '"><span class="hu2-merki"><span class="hu2-led" style="background:' + led + '"></span>' + heiti + '</span><span class="hu2-tala">' + tala + '</span><span class="hu2-skyr">' + skyr + '</span></button>';
    const siur = [['allir', 'Allir', K.alls], ['stjarna', '', K.stjarna], ['svar', 'Svar borist', K.svar], ['bidur', 'Bíður svars', K.bidur], ['rangt', 'Rangt netfang', K.rangt], ['sidar', 'Síðar', K.sidar], ['fundur', 'Fundur', K.fundur], ['unnid', 'Unnið', K.unnid], ['hafnad', 'Hafnað', K.hafnad]]
      .filter(x => x[0] === 'allir' || x[0] === 'stjarna' || x[2] > 0 || S.sia === x[0]);
    const listi = siad();
    main.innerHTML =
      '<div class="hu2">' +
        '<header class="hu2-haus">' + hnod('abcd') +
          '<div class="hu2-titill"><h1>Hunter <span>Sölulistar · Slökkvitæki ehf.</span></h1>' +
          '<p class="hu2-undir" style="margin:0">Fyrirtæki sem við viljum í viðskipti — kynningarpóstar, svör, eftirfylgni og næsta skref á einum stað.</p></div>' +
          '<div class="hu2-tol">' +
            '<label class="hu2-reitur">' + IK.leit + '<input type="search" id="hu2-leit" placeholder="Leita í fyrirtæki, netfangi, síma…" aria-label="Leita í Hunter-listanum" value="' + esc(S.leit) + '"></label>' +
            '<button type="button" class="hu2-malm" data-act="saekja">' + IK.saekja + 'Sækja póst úr eldklar@</button>' +
            '<button type="button" class="hu2-raud" data-act="nyr">' + IK.plus + 'Nýr aðili</button>' +
          '</div>' +
        '</header>' +
        '<section class="hu2-plata" aria-label="Lykiltölur">' +
          '<div class="hu2-kpi">' +
            kpi('allir', '#3a3a41', 'Sendir póstar', K.sendir, Object.keys(herferdir).length + ' herferð' + (Object.keys(herferdir).length === 1 ? '' : 'ir')) +
            kpi('bidur', '#a1a9b6', 'Bíður svars', K.bidur, 'þar af ' + K.lengi + ' ósvarað í 15+ daga') +
            kpi('svar', '#e0a93e', 'Svar borist', K.svar, 'bíður aðgerðar hjá okkur') +
            kpi('sidar', '#8f98a8', 'Hafa samband síðar', K.sidar, 'á dagatali') +
            kpi('fundur', '#4f74dc', 'Fundur bókaður', K.fundur, naestiFundur ? 'næsti: ' + fmtD(naestiFundur) : 'enginn bókaður') +
            kpi('hafnad', '#c92a2a', 'Hafnað · rangt netfang', K.hafnad + K.rangt, K.rangt + ' skiluðust ekki') +
          '</div>' +
          '<div class="hu2-eftir"><span class="hu2-merki" style="color:#845400">Eftirfylgni á gjalddaga</span>' +
            '<div class="hu2-strik" role="img" aria-label="Eftirfylgni: ' + K.lengi + ' ósvarað í 15 daga eða lengur, ' + bidaNy + ' bíða enn, ' + afgreitt + ' afgreiddir">' +
              (K.lengi ? '<span class="g" style="flex-grow:' + K.lengi + '"></span>' : '') + (bidaNy ? '<span class="s" style="flex-grow:' + bidaNy + '"></span>' : '') + (afgreitt ? '<span class="a" style="flex-grow:' + afgreitt + '"></span>' : '') +
            '</div>' +
            '<span class="hu2-eftir-t"><b>' + K.lengi + '</b> þarf að hringja · <b>' + bidaNy + '</b> bíða · <b>' + afgreitt + '</b> afgreitt</span>' +
            '<button type="button" class="hu2-silfur hu2-sm" data-act="hringilisti">Prenta hringilista</button>' +
          '</div>' +
          '<div class="hu2-flisar"><span class="hu2-merki">Herferðir</span>' +
            Object.keys(herferdir).sort().map(h => '<button type="button" class="hu2-flis' + (S.herferd === h ? ' is-on' : '') + '" data-act="herferd" data-h="' + esc(h) + '">' + esc(h) + ' · ' + herferdir[h] + '</button>').join('') +
            '<span class="hu2-skyr" style="margin-left:auto">Smellur á flís síar listann; smellur aftur sýnir allt</span>' +
          '</div>' +
        '</section>' +
        '<section class="hu2-skel" aria-label="Aðilar í Hunter">' +
          '<div class="hu2-skel-haus">' + hnod('vh') + '<div class="hu2-sia">' +
            siur.map(x => '<button type="button" class="' + (S.sia === x[0] ? 'is-on' : '') + '" data-act="sia" data-k="' + x[0] + '"' + (x[0] === 'stjarna' ? ' aria-label="Eftirlæti"' : '') + '>' + (x[0] === 'stjarna' ? IK.stjarna + 'Eftirlæti' : esc(x[1])) + ' <span>' + x[2] + '</span></button>').join('') +
          '</div><span class="hu2-skel-rod">Röðun: eftirfylgni fyrst · ' + listi.length + ' af ' + K.alls + '</span></div>' +
          (listi.length ? '<div class="hu2-tbw"><table class="hu2-tafla"><thead><tr>' +
            '<th style="width:26%">Fyrirtæki</th><th style="width:20%">Tengiliður</th><th class="fela">Sími</th><th class="fela">Herferð</th><th class="fela">Sent</th><th>Síðast</th><th>Staða</th><th>Næsta skref</th><th class="fela">Fasteignir</th><th style="width:48px"><span style="position:absolute;width:1px;height:1px;overflow:hidden">Aðgerðir</span></th>' +
            '</tr></thead><tbody>' + listi.map(a => {
              const x = afleitt(a);
              return '<tr class="r-' + x.st.cls + (S.opinn === a.id ? ' is-open' : '') + '" data-id="' + a.id + '">' +
                '<td><span class="hu2-nafn">' + (a.stjarna ? IK.stjarna : '') + esc(a.nafn) + '</span><span class="hu2-sub">' + esc(a.len || '') + '</span></td>' +
                '<td><span style="display:block;font-weight:500">' + esc(a.tengilidur || '—') + '</span><span class="hu2-mono" style="font-size:11px">' + esc(a.netfang) + '</span></td>' +
                '<td class="fela"><span class="hu2-mono' + (a.simi ? '' : ' dauf') + '">' + esc(a.simi || '[vantar]') + '</span></td>' +
                '<td class="fela">' + (a.herferd ? '<span class="hu2-chip">' + esc(a.herferd) + '</span>' : '') + '</td>' +
                '<td class="fela"><span class="hu2-mono">' + esc(fmtD(a.fyrst_sent_at)) + '</span></td>' +
                '<td><span class="hu2-sidast" title="' + esc(x.sidastT) + '"><span class="hu2-dot ' + x.dot + '"></span><span class="hu2-mono">' + esc(fmtD(x.sidast) || '—') + '</span></span></td>' +
                '<td>' + plata(a) + '</td>' +
                '<td><span class="hu2-naesta ' + x.ncls + '">' + esc(x.naesta) + '</span></td>' +
                '<td class="fela"><span class="hu2-mono' + (x.fjFast ? '' : ' dauf') + '">' + (x.fjFast ? x.fjFast + (x.taeki ? ' · ~' + x.taeki + ' tæki' : '') : '—') + '</span></td>' +
                '<td><button type="button" class="hu2-silfur hu2-ib" data-act="meira" data-id="' + a.id + '" aria-label="Fleiri aðgerðir" aria-haspopup="menu" aria-expanded="false">' + IK.meira + '</button></td>' +
              '</tr>';
            }).join('') + '</tbody></table></div>'
          : '<div class="hu2-tomt">' + (S.hladid ? 'Enginn aðili passar við síuna.' : 'Sæki listann…') + '</div>') +
          '<div class="hu2-fot"><span class="hu2-skyr">Gögn úr eldklar@ (email_digest) · innsog á 15 mín fresti · ' + K.alls + ' aðilar</span>' +
            '<div style="display:flex;gap:8px"><button type="button" class="hu2-silfur hu2-sm" data-act="csv">Flytja út CSV</button></div></div>' +
        '</section>' +
      '</div>';
  }

  // ── Spjald aðila ─────────────────────────────────────────────────────────────────────────────────────
  function adili(id) { return S.rows.find(x => x.id === id) || null; }
  function gatlistiAf(a) {
    const g = Array.isArray(a.gatlisti) ? a.gatlisti : [];
    return GATLISTI.map(([k, t]) => { const r = g.find(x => x && x.k === k) || {}; return { k, t, done: !!r.done, dags: r.dags || '' }; });
  }
  function opnaSpjald(id) {
    S.opinn = id;
    try { if (location.hash.indexOf('#hunter') === 0 && location.hash !== '#hunter/' + id) history.replaceState(null, '', '#hunter/' + id); } catch (_) {}
    teiknaSpjald();
    render();
    hladaPost(id);
  }
  function lokaSpjald() {
    S.opinn = null;
    const el = document.getElementById('hu2-spjald'); if (el) el.remove();
    try { if (/^#hunter\//.test(location.hash)) history.replaceState(null, '', '#hunter'); } catch (_) {}
    render();
  }
  function teiknaSpjald() {
    const a = S.opinn != null ? adili(S.opinn) : null;
    let el = document.getElementById('hu2-spjald');
    if (!a) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('aside'); el.id = 'hu2-spjald'; el.className = 'hu2-spjald'; el.setAttribute('aria-label', 'Spjald aðila'); document.body.appendChild(el); el.addEventListener('click', spjaldSmell); el.addEventListener('change', spjaldBreyting); el.addEventListener('input', spjaldInnslattur); }
    const virkur = document.activeElement; const virkF = virkur && el.contains(virkur) ? virkur.getAttribute('data-f') : null;
    if (virkF) return; // reitur í skrifum — ekki endurteikna (Stöðugt viðmót, regla 7)
    const x = afleitt(a), g = gatlistiAf(a), lokid = g.filter(i => i.done).length;
    const fst = S.fast[a.id] || [];
    const post = S.post[a.id];
    el.innerHTML =
      '<header class="hu2-spjald-haus">' + hnod('vh') +
        '<button type="button" class="hu2-silfur hu2-ib" data-act="loka" aria-label="Loka spjaldi">' + IK.bakk + '</button>' +
        '<h2><span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(a.nafn) + '</span><small>' + esc(a.len || '') + (a.herferd ? ' · ' + esc(a.herferd) : '') + (a.fyrst_sent_at ? ' · sent ' + fmtD(a.fyrst_sent_at) : '') + '</small></h2>' +
        '<button type="button" class="hu2-silfur hu2-ib stj' + (a.stjarna ? ' is-on' : '') + '" data-act="stjarna" aria-label="' + (a.stjarna ? 'Taka úr eftirlæti' : 'Setja í eftirlæti') + '" aria-pressed="' + (a.stjarna ? 'true' : 'false') + '">' + IK.stjarna + '</button>' +
        plata(a) +
      '</header>' +
      '<div class="hu2-spjald-bukur">' +
        (a.stada === 'rangt' && a.skil_villa ? '<div class="hu2-line" style="padding:8px 12px;box-shadow:inset 0 0 0 1px rgba(190,32,28,.45)"><span class="hu2-merki" style="color:#b42318">Skilaðist ekki ' + esc(fmtD(a.skil_at)) + '</span><span class="hu2-skyr" style="white-space:normal;margin-top:4px">' + esc(String(a.skil_villa).replace(/\s+/g, ' ').slice(0, 220)) + '</span></div>' : '') +
        '<section class="hu2-kafli" aria-label="Tengiliður"><div class="hu2-grid2">' +
          reit('Fyrirtæki', 'nafn', a.nafn, '', 'grid-column:1/-1') +
          reit('Tengiliður', 'tengilidur', a.tengilidur, 'Nafn tengiliðar') +
          reit('Sími', 'simi', a.simi, '[vantar]', '', 'mono') +
          reit('Netfang', 'netfang', a.netfang, '', '', 'mono') +
          reit('Kennitala', 'kennitala', a.kennitala, 'Finna með nafni →', '', 'mono') +
        '</div><div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button type="button" class="hu2-silfur hu2-sm" data-act="kt">' + IK.leit + 'Finna kennitölu</button>' +
          (a.simi ? '<a class="hu2-silfur hu2-sm" href="tel:' + esc(String(a.simi).replace(/\s+/g, '')) + '">' + IK.simi + 'Hringja</a>' : '') +
          '<a class="hu2-silfur hu2-sm" href="mailto:' + esc(a.netfang) + '">' + IK.postur + 'mailto</a>' +
        '</div></section>' +
        '<section class="hu2-kafli" aria-label="Staða"><div class="hu2-kafli-h"><span class="hu2-merki">Staða</span></div><div class="hu2-stodur">' +
          Object.keys(STODUR).map(k => '<button type="button" class="hu2-st' + (a.stada === k ? ' is-on' : '') + '" data-act="stada" data-k="' + k + '" aria-pressed="' + (a.stada === k) + '"><i style="background:' + STODUR[k].led + '" aria-hidden="true"></i>' + esc(STODUR[k].t) + '</button>').join('') +
        '</div><div class="hu2-grid2">' +
          '<label class="hu2-reitur mono"><span class="hu2-merki">Næst</span><input type="date" data-f="naesta_dags" value="' + esc(isoDag(a.naesta_dags)) + '" aria-label="Dagsetning næsta skrefs"></label>' +
          '<label class="hu2-reitur"><span class="hu2-merki">Ábyrgð</span><input type="text" data-f="abyrgd" value="' + esc(a.abyrgd || '') + '" placeholder="Hver fylgir eftir" aria-label="Hver fylgir eftir"></label>' +
          '<label class="hu2-reitur" style="grid-column:1/-1"><span class="hu2-merki">Skref</span><input type="text" data-f="naesta_skref" value="' + esc(a.naesta_skref || '') + '" placeholder="' + esc(x.naesta) + '" aria-label="Næsta skref"></label>' +
        '</div></section>' +
        '<section class="hu2-kafli" aria-label="Gátlisti"><div class="hu2-kafli-h"><span class="hu2-merki">Gátlisti</span><span class="hu2-chip dokk">' + lokid + ' / ' + g.length + '</span>' +
          '<div class="hu2-framv" role="img" aria-label="Gátlisti: ' + lokid + ' af ' + g.length + ' lokið"><span style="width:' + Math.round(lokid / g.length * 100) + '%"></span></div></div>' +
          '<div class="hu2-line hu2-gat">' + g.map(i => '<button type="button" class="' + (i.done ? 'is-on' : '') + '" data-act="gat" data-k="' + i.k + '" aria-pressed="' + i.done + '"><span class="hu2-box' + (i.done ? ' is-on' : '') + '">' + IK.hak + '</span><span class="t">' + esc(i.t) + '</span><span class="d">' + esc(i.dags) + '</span></button>').join('') + '</div>' +
        '</section>' +
        '<section class="hu2-kafli" aria-label="Fasteignir"><div class="hu2-kafli-h"><span class="hu2-merki">' + IK.hus + 'Fasteignir</span>' + (x.taeki ? '<span class="hu2-chip">~' + x.taeki + ' tæki</span>' : '') + '<span class="hu2-skyr">Greining opnar #greining með heimilisfanginu</span></div>' +
          (fst.length ? fst.map(f => '<div class="hu2-line hu2-fst" data-fid="' + f.id + '"><span class="n">' + esc(f.heimilisfang) + '<small>' + (f.landnr ? 'L' + esc(f.landnr) + ' · ' : '') + esc(f.athugasemd || '') + '</small></span>' +
              '<label class="hu2-reitur" title="Áætlaður tækjafjöldi"><input type="number" min="0" data-ff="taeki_aaetlad" data-fid="' + f.id + '" value="' + esc(f.taeki_aaetlad == null ? '' : f.taeki_aaetlad) + '" placeholder="tæki" aria-label="Áætlaður tækjafjöldi"></label>' +
              '<a class="hu2-silfur" href="#greining/' + encodeURIComponent(f.heimilisfang) + '" data-act="greina">Greina</a>' +
              '<button type="button" class="hu2-silfur hu2-ib" data-act="fst-burt" data-fid="' + f.id + '" aria-label="Fjarlægja fasteign">' + IK.loka + '</button></div>').join('')
            : '<span class="hu2-skyr" style="white-space:normal">Engin fasteign skráð. Skrifaðu heimilisfang (með póstnúmeri) eða leitaðu eftir nafni fyrirtækisins.</span>') +
          '<div style="display:flex;gap:8px;flex-wrap:wrap"><label class="hu2-reitur" style="flex:1 1 220px">' + IK.hus + '<input type="text" id="hu2-fst-inn" placeholder="Heimilisfang, t.d. Síðumúli 10, 108 Reykjavík" aria-label="Heimilisfang fasteignar"></label>' +
            '<button type="button" class="hu2-silfur" data-act="fst-baeta">' + IK.plus + 'Bæta við</button><button type="button" class="hu2-malm" data-act="fst-leita">' + IK.leit + 'Leita eftir nafni</button></div>' +
          '<div id="hu2-leit-n"></div>' +
        '</section>' +
        '<section class="hu2-kafli" aria-label="Samskipti"><div class="hu2-kafli-h"><span class="hu2-merki">' + IK.postur + 'Samskipti</span><span class="hu2-chip">' + (post ? post.length + ' póst' + (post.length === 1 ? 'ur' : 'ar') : '…') + '</span><span class="hu2-skyr">eldklar@ · email_digest</span></div>' +
          (post == null ? '<span class="hu2-skyr">Sæki póstana…</span>' : post.length === 0 ? '<span class="hu2-skyr" style="white-space:normal">Enginn póstur fannst við þetta netfang.</span>' : post.map(m => postHtml(a, m)).join('')) +
        '</section>' +
        '<section class="hu2-kafli" aria-label="Minnispunktar"><div class="hu2-kafli-h"><span class="hu2-merki">Minnispunktar</span></div>' +
          '<label class="hu2-reitur ha"><textarea data-f="minnispunktar" rows="3" placeholder="Hvað var rætt, hver ræður, hvenær samningur rennur út…" aria-label="Minnispunktar">' + esc(a.minnispunktar || '') + '</textarea></label>' +
        '</section>' +
      '</div>' +
      '<footer class="hu2-spjald-fot">' +
        '<button type="button" class="hu2-raud" data-act="svara">' + IK.postur + (a.sidast_svar_id ? 'Svara í þræði' : a.stada === 'rangt' ? 'Senda aftur' : 'Senda póst')+ '</button>' +
        '<button type="button" class="hu2-malm" data-act="simtal">' + IK.simi + 'Skrá símtal</button>' +
        '<button type="button" class="hu2-silfur hu2-ib" data-act="meira" data-id="' + a.id + '" aria-label="Fleiri aðgerðir" aria-haspopup="menu" aria-expanded="false">' + IK.meira + '</button>' +
      '</footer>';
  }
  function reit(merki, f, gildi, ph, stil, mono) {
    return '<label class="hu2-reitur' + (mono ? ' ' + mono : '') + '"' + (stil ? ' style="' + stil + '"' : '') + '><span class="hu2-merki">' + esc(merki) + '</span><input type="text" data-f="' + f + '" value="' + esc(gildi || '') + '" placeholder="' + esc(ph || '') + '" aria-label="' + esc(merki) + '"></label>';
  }
  function postHtml(a, m) {
    const fraOkkur = m.folder === 'SENT' || /@(eldklar|brunaholf)\.is$/i.test(m.sender_email || '');
    const skil = /^(mailer-daemon|postmaster)/i.test(m.sender_email || '');
    const sjalfv = /(sjálfvirkt svar|automatic reply|auto-?reply|out of office|í fríi|fjarverandi|liggur niðri)/i.test(m.subject || '');
    const chip = skil ? '<span class="hu2-chip raud">Skil</span>' : fraOkkur ? '<span class="hu2-chip dokk">Frá okkur</span>' : sjalfv ? '<span class="hu2-chip">Sjálfvirkt</span>' : '<span class="hu2-chip">Frá þeim</span>';
    const nafn = fraOkkur ? (m.sender_name && !/slökkvitæki|brunahólf/i.test(m.sender_name) ? m.sender_name : 'Slökkvitæki ehf') : (m.sender_name || m.sender_email || '');
    const texti = String(m.body_preview || m.snippet || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
    const opid = !!S.opnirPostar[m.id];
    return '<article class="hu2-msg' + (sjalfv ? ' dauf' : '') + (opid ? ' opid' : '') + '" data-mid="' + m.id + '">' +
      '<div class="h">' + chip + '<span class="n">' + esc(nafn) + '</span><span class="dt">' + esc(fmtDT(m.received_at)) + '</span></div>' +
      '<span class="s">' + esc(m.subject || '(ekkert efni)') + '</span>' +
      (texti ? '<p class="b">' + esc(texti) + '</p>' : '') +
      '<div class="f">' + (texti.length > 180 ? '<button type="button" class="hu2-silfur" data-act="post-meira" data-mid="' + m.id + '">' + (opid ? 'Minna' : 'Meira') + '</button>' : '') +
        (!fraOkkur && !skil && !sjalfv && m.sender_email ? '<button type="button" class="hu2-malm" data-act="post-svara" data-mid="' + m.id + '">' + IK.postur + 'Svara í þræði</button>' : '') + '</div>' +
    '</article>';
  }
  async function hladaPost(id) {
    const sb = SB();
    const a = adili(id); if (!a || !sb) return;
    if (S.postHl[id]) return; S.postHl[id] = true;
    try {
      const ors = ['sender_email.eq.' + a.netfang, 'to_addresses.ilike.%' + a.netfang + '%', 'body_preview.ilike.%' + a.netfang + '%'];
      if (a.thread_ids && a.thread_ids.length) ors.push('thread_id.in.(' + a.thread_ids.map(t => '"' + t + '"').join(',') + ')');
      let q = sb.from('email_digest').select('id,message_id,folder,account,sender_name,sender_email,to_addresses,subject,snippet,body_preview,received_at,thread_id')
        .eq('account', 'eldklar@eldklar.is').or(ors.join(',')).order('received_at', { ascending: false }).limit(60);
      const fra = a.fyrst_sent_at || a.created_at; if (fra) q = q.gte('received_at', new Date(new Date(fra).getTime() - 86400000).toISOString());
      const r = await q;
      if (r.error) throw r.error;
      S.post[id] = (r.data || []).filter(m => !(m.folder === 'SENT' && a.netfang && !String(m.to_addresses || '').toLowerCase().includes(a.netfang) && !(a.thread_ids || []).includes(m.thread_id)));
    } catch (e) { S.post[id] = []; toast('Náði ekki í póstana: ' + ((e && e.message) || e), true); }
    finally { S.postHl[id] = false; }
    if (S.opinn === id) teiknaSpjald();
  }

  // ── Atburðir á spjaldi ───────────────────────────────────────────────────────────────────────────────
  let _vistT = {};
  function spjaldInnslattur(e) {
    const el = e.target; const f = el.getAttribute && el.getAttribute('data-f'); if (!f) return;
    const a = adili(S.opinn); if (!a) return;
    clearTimeout(_vistT[f]);
    _vistT[f] = setTimeout(() => spjaldBreyting({ target: el }), 900);
  }
  async function spjaldBreyting(e) {
    const el = e.target; const a = adili(S.opinn); if (!a) return;
    const ff = el.getAttribute && el.getAttribute('data-ff');
    if (ff) {
      const fid = +el.getAttribute('data-fid'); const v = el.value === '' ? null : +el.value;
      const sb = SB(); if (!sb) return;
      const r = await sb.from('hunter_fasteignir').update({ [ff]: v }).eq('id', fid).select('*');
      if (r.error) { toast('Vistun mistókst: ' + r.error.message, true); return; }
      const l = S.fast[a.id] || []; const i = l.findIndex(x => x.id === fid); if (i >= 0) l[i] = r.data[0];
      return;
    }
    const f = el.getAttribute && el.getAttribute('data-f'); if (!f) return;
    clearTimeout(_vistT[f]);
    let v = el.value; if (typeof v === 'string') v = v.trim();
    if (f === 'netfang') { v = v.toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v)) { toast('Netfangið lítur ekki rétt út', true); return; } }
    if (f === 'naesta_dags') v = v || null;
    if ((a[f] || '') === (v || '')) return;
    const br = { [f]: v || null };
    if (f === 'netfang') { br.len = v.split('@')[1]; if (a.stada === 'rangt') { br.skiladist_ekki = false; br.stada = 'bidur'; } }
    if (f === 'nafn' && !v) { toast('Nafn má ekki vera tómt', true); return; }
    const ok = await vista(a.id, br);
    if (ok) { render(); if (document.activeElement !== el) teiknaSpjald(); }
  }
  async function spjaldSmell(e) {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.getAttribute('data-act'); const a = adili(S.opinn); if (!a) return;
    if (act === 'greina') return; // venjulegur hlekkur á #greining/<heimilisfang>
    e.preventDefault();
    if (act === 'loka') return lokaSpjald();
    if (act === 'stjarna') { if (await vista(a.id, { stjarna: !a.stjarna })) { teiknaSpjald(); render(); } return; }
    if (act === 'stada') {
      const k = b.getAttribute('data-k'); if (!STODUR[k] || k === a.stada) return;
      const br = { stada: k }; if (k === 'bidur' && a.skiladist_ekki) br.skiladist_ekki = false;
      if (await vista(a.id, br)) { toast(STODUR[k].t + ' · ' + a.nafn); teiknaSpjald(); render(); }
      return;
    }
    if (act === 'gat') return gatToggle(a, b.getAttribute('data-k'));
    if (act === 'kt') return finnaKt(a, b);
    if (act === 'fst-baeta') { const inn = document.getElementById('hu2-fst-inn'); return baetaFasteign(a, inn ? inn.value : ''); }
    if (act === 'fst-leita') return leitaFasteigna(a, b);
    if (act === 'fst-vel') { const h = b.getAttribute('data-h'); return baetaFasteign(a, h, b.getAttribute('data-l') || null); }
    if (act === 'fst-burt') {
      const fid = +b.getAttribute('data-fid'); const sb = SB(); if (!sb) return;
      const r = await sb.from('hunter_fasteignir').update({ fjarlaegt_at: new Date().toISOString() }).eq('id', fid).select('id');
      if (r.error) return toast('Tókst ekki að fjarlægja: ' + r.error.message, true);
      S.fast[a.id] = (S.fast[a.id] || []).filter(x => x.id !== fid); teiknaSpjald(); render(); return;
    }
    if (act === 'post-meira') { const mid = +b.getAttribute('data-mid'); S.opnirPostar[mid] = !S.opnirPostar[mid]; const art = b.closest('.hu2-msg'); if (art) { art.classList.toggle('opid', !!S.opnirPostar[mid]); b.textContent = S.opnirPostar[mid] ? 'Minna' : 'Meira'; } return; }
    if (act === 'post-svara') { const m = (S.post[a.id] || []).find(x => x.id === +b.getAttribute('data-mid')); if (m) svaraIThraedi(a, m); return; }
    if (act === 'svara') {
      const m = a.sidast_svar_id ? (S.post[a.id] || []).find(x => x.id === a.sidast_svar_id) : null;
      if (m) return svaraIThraedi(a, m);
      const inn = (S.post[a.id] || []).find(x => x.folder !== 'SENT' && !/^(mailer-daemon|postmaster)/i.test(x.sender_email || '') && !/(sjálfvirkt svar|automatic reply|auto-?reply|out of office|í fríi)/i.test(x.subject || ''));
      if (inn) return svaraIThraedi(a, inn);
      return opnaSendingu(a);
    }
    if (act === 'simtal') return skraSimtal(a);
    if (act === 'meira') return opnaValmynd(b, a);
  }
  async function gatToggle(a, k) {
    const g = gatlistiAf(a); const i = g.find(x => x.k === k); if (!i) return;
    i.done = !i.done; i.dags = i.done ? fmtD(new Date()) : '';
    const ok = await vista(a.id, { gatlisti: g.map(x => ({ k: x.k, t: x.t, done: x.done, dags: x.dags })) });
    if (ok) teiknaSpjald();
  }
  async function skraSimtal(a) {
    const hvad = prompt('Símtal við ' + (a.tengilidur || a.nafn) + ' — hvað kom út úr því?', '');
    if (hvad == null) return;
    const lina = fmtD(new Date()) + ' símtal: ' + (hvad.trim() || '(ekkert skráð)');
    const g = gatlistiAf(a); const s = g.find(x => x.k === 'simtal'); if (s && !s.done) { s.done = true; s.dags = fmtD(new Date()); }
    const ok = await vista(a.id, { minnispunktar: (a.minnispunktar ? a.minnispunktar.replace(/\s+$/, '') + '\n' : '') + lina, gatlisti: g.map(x => ({ k: x.k, t: x.t, done: x.done, dags: x.dags })) });
    if (ok) { toast('Símtal skráð'); teiknaSpjald(); render(); }
  }
  async function finnaKt(a, btn) {
    btn.disabled = true;
    try {
      const r = await fetch('/api/kt-lookup?nafn=' + encodeURIComponent(a.nafn));
      const j = await r.json().catch(() => ({}));
      const l = (j && j.results) || [];
      if (!l.length) return toast('Engin kennitala fannst fyrir „' + a.nafn + '“ — reyndu að laga nafnið', true);
      const v = l.length === 1 ? l[0] : l.find(x => String(x.nafn || '').toLowerCase() === a.nafn.toLowerCase()) || l[0];
      const kt = String(v.kennitala || '').replace(/[^0-9]/g, '');
      if (!kt) return toast('Svarið bar enga kennitölu', true);
      const ok = await vista(a.id, { kennitala: kt.slice(0, 6) + '-' + kt.slice(6), nafn: a.uppruni === 'innsog' && a.nafn === (a.len || '').split('.')[0].replace(/^./, c => c.toUpperCase()) ? (v.nafn || a.nafn) : a.nafn });
      if (ok) { toast('Kennitala: ' + kt + (v.nafn ? ' · ' + v.nafn : '') + (l.length > 1 ? ' (' + l.length + ' niðurstöður — fyrsta valin)' : '')); teiknaSpjald(); render(); }
    } catch (e) { toast('Uppfletting mistókst: ' + ((e && e.message) || e), true); }
    finally { btn.disabled = false; }
  }
  async function baetaFasteign(a, heimilisfang, landnr) {
    heimilisfang = String(heimilisfang || '').trim(); if (!heimilisfang) return toast('Skrifaðu heimilisfang fyrst', true);
    const sb = SB(); if (!sb) return;
    const r = await sb.from('hunter_fasteignir').insert({ adili_id: a.id, heimilisfang, landnr: landnr || null }).select('*');
    if (r.error) return toast('Vistun mistókst: ' + r.error.message, true);
    (S.fast[a.id] = S.fast[a.id] || []).push(r.data[0]);
    toast('Fasteign skráð: ' + heimilisfang); teiknaSpjald(); render();
  }
  async function leitaFasteigna(a, btn) {
    const box = document.getElementById('hu2-leit-n'); if (!box) return;
    const inn = document.getElementById('hu2-fst-inn'); const q = (inn && inn.value.trim()) || a.nafn;
    btn.disabled = true; box.innerHTML = '<span class="hu2-skyr">Leita að „' + esc(q) + '“ á Íslandi (OpenStreetMap)…</span>';
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=is&limit=8&addressdetails=1&q=' + encodeURIComponent(q), { headers: { Accept: 'application/json' } });
      const l = await r.json();
      if (!Array.isArray(l) || !l.length) { box.innerHTML = '<span class="hu2-skyr" style="white-space:normal">Ekkert fannst undir þessu nafni — skrifaðu heimilisfangið sjálfur.</span>'; return; }
      box.innerHTML = '<div class="hu2-line hu2-leit-l">' + l.map(x => {
        const ad = x.address || {}; const gata = [ad.road, ad.house_number].filter(Boolean).join(' '); const baer = [ad.postcode, ad.city || ad.town || ad.village || ad.municipality].filter(Boolean).join(' ');
        const h = gata ? gata + (baer ? ', ' + baer : '') : String(x.display_name || '').split(',').slice(0, 3).join(',');
        return '<button type="button" data-act="fst-vel" data-h="' + esc(h) + '">' + IK.hus + '<span>' + esc(x.name || h) + '<small style="display:block;color:#5b6472">' + esc(h) + (x.type ? ' · ' + esc(x.type) : '') + '</small></span></button>';
      }).join('') + '</div><span class="hu2-skyr">© OpenStreetMap-framlagsaðilar · smelltu til að skrá</span>';
    } catch (e) { box.innerHTML = '<span class="hu2-skyr">Leit mistókst: ' + esc((e && e.message) || e) + '</span>'; }
    finally { btn.disabled = false; }
  }

  // ── Svar og sending úr eldklar@ ──────────────────────────────────────────────────────────────────────
  function svaraIThraedi(a, m) {
    if (!(window.ReikningaPostur && ReikningaPostur.replyTo)) return toast('Svar-glugginn (240) hefur ekki hlaðist — endurhlaðið síðuna.', true);
    const mm = { message_id: m.message_id, account: 'eldklar@eldklar.is', sender_name: m.sender_name || a.tengilidur || a.nafn, from: m.sender_email, subject: m.subject || '', body_preview: m.body_preview || '', snippet: m.snippet || '' };
    mm._onSent = async () => {
      const g = gatlistiAf(a); const s = g.find(x => x.k === 'svar'); if (s && !s.done) { s.done = true; s.dags = fmtD(new Date()); }
      await vista(a.id, { sidast_fra_okkur_at: new Date().toISOString(), gatlisti: g.map(x => ({ k: x.k, t: x.t, done: x.done, dags: x.dags })) });
      toast('Svarið sent úr eldklar@ · birtist í samskiptum eftir næsta innsog'); teiknaSpjald(); render();
    };
    try { ReikningaPostur.replyTo(mm); } catch (e) { toast('Svar-glugginn opnaðist ekki: ' + ((e && e.message) || e), true); }
  }
  function lokaBak() { if (_bak) { _bak.remove(); _bak = null; } }
  function opnaSendingu(a, valk) {
    valk = valk || {};
    lokaBak();
    const okkar = (S.post[a.id] || []).find(m => m.folder === 'SENT' && m.message_id);
    const efni = valk.efni || (a.herferd && a.herferd !== 'Samstarf' ? a.herferd : 'Brunavarnir — ' + a.nafn);
    const avarp = a.tengilidur ? 'Sæl/l ' + a.tengilidur.split(/\s+og\s+/)[0] + ',' : 'Góðan dag,';
    const texti = valk.texti || (a.stada === 'rangt'
      ? avarp + '\n\nVið sendum ykkur erindi ' + fmtD(a.fyrst_sent_at) + ' sem skilaði sér ekki. Við hjá Brunahólfi Slökkvitæki ehf. sjáum um reglubundna yfirferð slökkvitækja, brunaslangna og annarra brunavarna og langar að kanna hvort þið væruð opin fyrir tilboði í þjónustuna.\n\nKær kveðja,\nBrunahólf Slökkvitæki ehf.\nsími 565-4080 · eldklar@eldklar.is'
      : avarp + '\n\nVið sendum ykkur línu ' + fmtD(a.fyrst_sent_at) + ' um reglubundna yfirferð brunavarna og langar að heyra hvort erindið hafi borist og hvort einhver tími henti til að taka stutt spjall.\n\nKær kveðja,\nBrunahólf Slökkvitæki ehf.\nsími 565-4080 · eldklar@eldklar.is');
    _bak = document.createElement('div'); _bak.className = 'hu2-bak';
    _bak.innerHTML = '<div class="hu2-modal" role="dialog" aria-modal="true" aria-label="Senda póst úr eldklar@">' +
      '<header class="hu2-spjald-haus">' + hnod('vh') + '<h2>' + (a.stada === 'rangt' ? 'Senda aftur' : 'Senda póst') + ' — ' + esc(a.nafn) + '<small>frá eldklar@eldklar.is' + (okkar ? ' · svar í þræði fyrri pósts' : '') + '</small></h2><button type="button" class="hu2-silfur hu2-ib" data-m="loka" aria-label="Loka">' + IK.loka + '</button></header>' +
      '<div class="hu2-modal-b">' +
        '<label class="hu2-reitur mono"><span class="hu2-merki">Til</span><input type="email" id="hu2-s-til" value="' + esc(valk.til || a.netfang) + '" aria-label="Viðtakandi"></label>' +
        (a.stada === 'rangt' ? '<span class="hu2-stada-l villa">Síðasti póstur skilaðist ekki á ' + esc(a.netfang) + ' — lagaðu netfangið hér; það vistast á aðilann þegar sendingin tekst.</span>' : '') +
        '<label class="hu2-reitur"><span class="hu2-merki">Efni</span><input type="text" id="hu2-s-efni" value="' + esc(efni) + '" aria-label="Efni"></label>' +
        '<label class="hu2-reitur ha"><textarea id="hu2-s-texti" aria-label="Texti póstsins">' + esc(texti) + '</textarea></label>' +
        (okkar ? '<label class="hu2-hak-l"><input type="checkbox" id="hu2-s-thradur" checked> Senda sem svar í sama þræði og fyrri póstur okkar (' + esc(fmtD(okkar.received_at)) + ')</label>' : '') +
        '<span class="hu2-stada-l" id="hu2-s-stada">Pósturinn fer um Gmail úr eldklar@ (sama leið og Þjónustuborðið). Ekkert fer fyrr en ýtt er á Senda.</span>' +
      '</div>' +
      '<footer class="hu2-spjald-fot"><button type="button" class="hu2-raud" data-m="senda">' + IK.postur + 'Senda úr eldklar@</button><button type="button" class="hu2-silfur" data-m="loka">Hætta við</button></footer>' +
    '</div>';
    document.body.appendChild(_bak);
    _bak.addEventListener('click', async e => {
      if (e.target === _bak) return lokaBak();
      const b = e.target.closest('[data-m]'); if (!b) return;
      if (b.getAttribute('data-m') === 'loka') return lokaBak();
      if (b.getAttribute('data-m') !== 'senda') return;
      const til = String(document.getElementById('hu2-s-til').value || '').trim().toLowerCase();
      const ef = String(document.getElementById('hu2-s-efni').value || '').trim();
      const tx = String(document.getElementById('hu2-s-texti').value || '').trim();
      const st = document.getElementById('hu2-s-stada');
      if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(til)) { st.textContent = 'Netfangið lítur ekki rétt út.'; st.className = 'hu2-stada-l villa'; return; }
      if (!ef || !tx) { st.textContent = 'Efni og texti verða að vera til staðar.'; st.className = 'hu2-stada-l villa'; return; }
      if (!(window.AppMail && AppMail.send)) { st.textContent = 'Póstleiðin (AppMail, 254) hefur ekki hlaðist — endurhlaðið síðuna. Ekkert var sent.'; st.className = 'hu2-stada-l villa'; return; }
      const thr = document.getElementById('hu2-s-thradur'); const iThraedi = okkar && thr && thr.checked && til === a.netfang;
      b.disabled = true; st.textContent = 'Sendi…'; st.className = 'hu2-stada-l';
      const html = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#111">' + esc(tx).replace(/\n/g, '<br>') + '</div>';
      let r, j;
      try { r = await AppMail.send({ from: FRA, to: [til], subject: ef, html, inReplyTo: iThraedi ? okkar.message_id : undefined }); j = await r.json(); } catch (e2) { r = { ok: false }; j = { error: String((e2 && e2.message) || e2) }; }
      if (!r.ok) { b.disabled = false; st.textContent = 'Sending mistókst: ' + esc(j.error || j.message || ('HTTP ' + r.status)) + ' — ekkert var sent.'; st.className = 'hu2-stada-l villa'; return; }
      const nu = new Date().toISOString();
      const br = { sidast_fra_okkur_at: nu };
      if (til !== a.netfang) { br.netfang = til; br.len = til.split('@')[1]; }
      if (a.stada === 'rangt') { br.stada = 'bidur'; br.skiladist_ekki = false; }
      const g = gatlistiAf(a); const s = g.find(x => x.k === 'sent'); if (s && !s.done) { s.done = true; s.dags = fmtD(new Date()); } br.gatlisti = g.map(x => ({ k: x.k, t: x.t, done: x.done, dags: x.dags }));
      br.minnispunktar = (a.minnispunktar ? a.minnispunktar.replace(/\s+$/, '') + '\n' : '') + fmtD(new Date()) + ' sent á ' + til + ': „' + ef + '“';
      const ok = await vista(a.id, br);
      (S.post[a.id] = S.post[a.id] || []).unshift({ id: -Date.now(), folder: 'SENT', sender_email: 'eldklar@eldklar.is', sender_name: 'Slökkvitæki ehf', to_addresses: til, subject: ef, body_preview: tx, received_at: nu, message_id: null, _nytt: true });
      lokaBak();
      toast('Sent úr eldklar@ á ' + til + (j.threaded ? ' · í þræði' : '') + (ok ? '' : ' — en aðilinn vistaðist ekki'));
      teiknaSpjald(); render();
    });
    setTimeout(() => { const t = document.getElementById(a.stada === 'rangt' ? 'hu2-s-til' : 'hu2-s-texti'); if (t) t.focus(); }, 30);
  }

  // ── Nýr aðili ────────────────────────────────────────────────────────────────────────────────────────
  function nyrAdili() {
    lokaBak();
    _bak = document.createElement('div'); _bak.className = 'hu2-bak';
    _bak.innerHTML = '<div class="hu2-modal" role="dialog" aria-modal="true" aria-label="Nýr aðili"><header class="hu2-spjald-haus">' + hnod('vh') + '<h2>Nýr aðili<small>handvirk skráning — pósturinn tengist sjálfkrafa á netfangið</small></h2><button type="button" class="hu2-silfur hu2-ib" data-m="loka" aria-label="Loka">' + IK.loka + '</button></header>' +
      '<div class="hu2-modal-b"><div class="hu2-grid2">' +
        '<label class="hu2-reitur" style="grid-column:1/-1"><span class="hu2-merki">Fyrirtæki</span><input type="text" id="hu2-n-nafn" aria-label="Fyrirtæki"></label>' +
        '<label class="hu2-reitur mono"><span class="hu2-merki">Netfang</span><input type="email" id="hu2-n-netfang" aria-label="Netfang"></label>' +
        '<label class="hu2-reitur mono"><span class="hu2-merki">Sími</span><input type="text" id="hu2-n-simi" aria-label="Sími"></label>' +
        '<label class="hu2-reitur"><span class="hu2-merki">Tengiliður</span><input type="text" id="hu2-n-teng" aria-label="Tengiliður"></label>' +
        '<label class="hu2-reitur"><span class="hu2-merki">Herferð</span><input type="text" id="hu2-n-herf" list="hu2-herf-l" aria-label="Herferð"><datalist id="hu2-herf-l">' + Array.from(new Set(S.rows.map(a => a.herferd).filter(Boolean))).map(h => '<option value="' + esc(h) + '"></option>').join('') + '</datalist></label>' +
      '</div><span class="hu2-stada-l" id="hu2-n-stada"></span></div>' +
      '<footer class="hu2-spjald-fot"><button type="button" class="hu2-raud" data-m="vista">' + IK.plus + 'Skrá aðila</button><button type="button" class="hu2-silfur" data-m="loka">Hætta við</button></footer></div>';
    document.body.appendChild(_bak);
    _bak.addEventListener('click', async e => {
      if (e.target === _bak) return lokaBak();
      const b = e.target.closest('[data-m]'); if (!b) return;
      if (b.getAttribute('data-m') === 'loka') return lokaBak();
      const v = id => String((document.getElementById(id) || {}).value || '').trim();
      const nafn = v('hu2-n-nafn'), netfang = v('hu2-n-netfang').toLowerCase(), st = document.getElementById('hu2-n-stada');
      if (!nafn || !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(netfang)) { st.textContent = 'Fyrirtæki og gilt netfang þarf.'; st.className = 'hu2-stada-l villa'; return; }
      const sb = SB(); if (!sb) return;
      b.disabled = true;
      const r = await sb.from('hunter_adilar').insert({ nafn, netfang, len: netfang.split('@')[1], simi: v('hu2-n-simi') || null, tengilidur: v('hu2-n-teng') || null, herferd: v('hu2-n-herf') || null, uppruni: 'handvirkt' }).select('*');
      if (r.error) { b.disabled = false; st.textContent = /duplicate|unique/i.test(r.error.message) ? 'Þetta netfang er þegar á listanum.' : 'Vistun mistókst: ' + r.error.message; st.className = 'hu2-stada-l villa'; return; }
      S.rows.push(r.data[0]); lokaBak(); toast('Aðili skráður: ' + nafn); render(); opnaSpjald(r.data[0].id);
    });
    setTimeout(() => { const t = document.getElementById('hu2-n-nafn'); if (t) t.focus(); }, 30);
  }

  // ── ⋯-valmynd ───────────────────────────────────────────────────────────────────────────────────────
  function lokaValmynd() { if (!_pop) return; _pop.el.remove(); try { _pop.btn.setAttribute('aria-expanded', 'false'); } catch (_) {} _pop = null; document.removeEventListener('mousedown', _utan, true); window.removeEventListener('scroll', lokaValmynd, true); window.removeEventListener('resize', lokaValmynd); }
  function _utan(e) { if (_pop && !_pop.el.contains(e.target) && e.target !== _pop.btn) lokaValmynd(); }
  function opnaValmynd(btn, a) {
    if (_pop && _pop.btn === btn) return lokaValmynd();
    lokaValmynd();
    const el = document.createElement('div'); el.className = 'hu2-pop'; el.setAttribute('role', 'menu'); el.setAttribute('aria-label', 'Aðgerðir fyrir ' + a.nafn);
    const li = (act, t, ik, cls) => '<button type="button" role="menuitem" class="' + (cls || '') + '" data-v="' + act + '">' + (ik || '') + esc(t) + '</button>';
    el.innerHTML = li('opna', 'Opna spjaldið', IK.bakk) + li('senda', a.stada === 'rangt' ? 'Senda aftur á rétt netfang' : 'Senda póst úr eldklar@', IK.postur) + li('stjarna', a.stjarna ? 'Taka úr eftirlæti' : 'Setja í eftirlæti', IK.stjarna) + '<hr>' +
      li('st:sidar', 'Hafa samband síðar') + li('st:fundur', 'Fundur bókaður') + li('st:unnid', 'Komið í viðskipti') + li('st:hafnad', 'Merkja hafnað') + '<hr>' + li('fjarlaegja', 'Fjarlægja af listanum', IK.loka, 'haetta');
    document.body.appendChild(el);
    const r = btn.getBoundingClientRect(), pr = el.getBoundingClientRect();
    let left = Math.max(8, Math.min(r.right - pr.width, window.innerWidth - pr.width - 8)), top = r.bottom + 6;
    if (top + pr.height > window.innerHeight - 8) top = Math.max(8, r.top - pr.height - 6);
    el.style.left = left + 'px'; el.style.top = top + 'px';
    _pop = { el, btn }; btn.setAttribute('aria-expanded', 'true');
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-v]'); if (!b) return; const v = b.getAttribute('data-v'); lokaValmynd();
      if (v === 'opna') return opnaSpjald(a.id);
      if (v === 'senda') return opnaSendingu(a);
      if (v === 'stjarna') { if (await vista(a.id, { stjarna: !a.stjarna })) { render(); teiknaSpjald(); } return; }
      if (v.indexOf('st:') === 0) { const k = v.slice(3); if (await vista(a.id, { stada: k })) { toast(STODUR[k].t + ' · ' + a.nafn); render(); teiknaSpjald(); } return; }
      if (v === 'fjarlaegja') { if (!confirm('Fjarlægja ' + a.nafn + ' af Hunter-listanum? (Færslan geymist, kemur ekki aftur við innsog nema netfangið sé fjarlægt líka.)')) return;
        if (await vista(a.id, { fjarlaegt_at: new Date().toISOString() })) { S.rows = S.rows.filter(x => x.id !== a.id); if (S.opinn === a.id) lokaSpjald(); else render(); toast('Fjarlægt: ' + a.nafn); } }
    });
    el.addEventListener('keydown', e => { if (e.key === 'Escape') { lokaValmynd(); btn.focus(); } });
    document.addEventListener('mousedown', _utan, true); window.addEventListener('scroll', lokaValmynd, true); window.addEventListener('resize', lokaValmynd);
    const f = el.querySelector('button'); if (f) f.focus({ preventScroll: true });
  }

  // ── CSV og hringilisti ──────────────────────────────────────────────────────────────────────────────
  function csv() {
    const l = siad(); const h = ['Fyrirtæki', 'Lén', 'Tengiliður', 'Netfang', 'Sími', 'Kennitala', 'Herferð', 'Sent', 'Síðast', 'Staða', 'Næsta skref', 'Næst dags', 'Ábyrgð', 'Fasteignir', 'Tæki áætluð', 'Minnispunktar'];
    const rows = [h].concat(l.map(a => { const x = afleitt(a); return [a.nafn, a.len, a.tengilidur, a.netfang, a.simi, a.kennitala, a.herferd, fmtD(a.fyrst_sent_at), fmtD(x.sidast), x.st.t, x.naesta, fmtD(a.naesta_dags), a.abyrgd, (S.fast[a.id] || []).map(f => f.heimilisfang).join(' | '), x.taeki || '', a.minnispunktar]; }));
    const s = '﻿' + rows.map(r => r.map(c => '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const u = URL.createObjectURL(new Blob([s], { type: 'text/csv;charset=utf-8' })); const el = document.createElement('a'); el.href = u; el.download = 'Hunter_' + isoDag(new Date()) + '.csv'; document.body.appendChild(el); el.click(); setTimeout(() => { URL.revokeObjectURL(u); el.remove(); }, 200);
  }
  function hringilisti() {
    const l = S.rows.map(a => [a, afleitt(a)]).filter(([a, x]) => a.stada === 'svar' || a.stada === 'rangt' || (a.stada === 'bidur' && x.lengi) || (a.naesta_dags && dagar(a.naesta_dags) >= 0 && a.stada !== 'hafnad' && a.stada !== 'unnid')).sort((p, q) => rodun(p[0], q[0]));
    const w = window.open('', '_blank', 'width=900,height=1100'); if (!w) return toast('Leyfðu sprettiglugga til að prenta', true);
    w.document.write('<!doctype html><html lang="is"><head><meta charset="utf-8"><title>Hringilisti Hunter ' + fmtD(new Date()) + '</title><style>body{font:13px/1.4 "IBM Plex Sans",system-ui,sans-serif;color:#111;margin:24px}h1{font:800 24px "Playfair Display",Georgia,serif;margin:0 0 4px}p{margin:0 0 14px;color:#555}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:7px 8px;border-bottom:1px solid #ddd;vertical-align:top}th{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#444}td.m{font-family:"JetBrains Mono",monospace;font-size:12px;white-space:nowrap}td.hak{width:22px}td.hak span{display:inline-block;width:14px;height:14px;border:1px solid #333;border-radius:3px}@media print{body{margin:10mm}}</style></head><body>' +
      '<h1>Hringilisti — Hunter</h1><p>' + fmtD(new Date()) + ' · ' + l.length + ' aðilar sem þarf að hringja í eða fylgja eftir</p><table><thead><tr><th></th><th>Fyrirtæki</th><th>Tengiliður</th><th>Sími</th><th>Staða</th><th>Hvað</th><th>Niðurstaða</th></tr></thead><tbody>' +
      l.map(([a, x]) => '<tr><td class="hak"><span></span></td><td><b>' + esc(a.nafn) + '</b><br><small>' + esc(a.netfang) + '</small></td><td>' + esc(a.tengilidur || '') + '</td><td class="m">' + esc(a.simi || '[vantar]') + '</td><td>' + esc(x.st.t) + '</td><td>' + esc(x.naesta) + '</td><td style="width:28%"></td></tr>').join('') +
      '</tbody></table><script>setTimeout(function(){window.print()},300)<\/script></body></html>');
    w.document.close();
  }

  // ── Atburðir á listasíðu ─────────────────────────────────────────────────────────────────────────────
  function listaSmell(e) {
    const b = e.target.closest('[data-act]');
    if (b) {
      const act = b.getAttribute('data-act');
      if (act === 'sia') { const k = b.getAttribute('data-k'); S.sia = (S.sia === k && k !== 'allir') ? 'allir' : k; render(); return; }
      if (act === 'herferd') { const h = b.getAttribute('data-h'); S.herferd = S.herferd === h ? null : h; render(); return; }
      if (act === 'saekja') return saekjaPost(b);
      if (act === 'nyr') return nyrAdili();
      if (act === 'csv') return csv();
      if (act === 'hringilisti') return hringilisti();
      if (act === 'meira') { e.stopPropagation(); const a = adili(+b.getAttribute('data-id')); if (a) opnaValmynd(b, a); return; }
    }
    const tr = e.target.closest('tr[data-id]'); if (tr && !e.target.closest('a,button')) opnaSpjald(+tr.getAttribute('data-id'));
  }
  function listaInnslattur(e) { if (e.target && e.target.id === 'hu2-leit') { S.leit = e.target.value; clearTimeout(_leitT); _leitT = setTimeout(() => { const el = document.getElementById('hu2-leit'); const pos = el ? el.selectionStart : null; render(); const n = document.getElementById('hu2-leit'); if (n && document.activeElement !== n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} } }, 250); } }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (_bak) return lokaBak(); if (_pop) return lokaValmynd(); if (S.opinn != null && document.getElementById('hu2-spjald')) lokaSpjald(); } });

  // ── Grind: nav, view, switchView, slóð ───────────────────────────────────────────────────────────────
  function injectNav() {
    const nav = document.querySelector('nav.view-nav, .view-nav');
    if (!nav) { setTimeout(injectNav, 500); return; }
    if (nav.querySelector('[data-view="' + NAV_KEY + '"]')) return;
    const eftir = nav.querySelector('.vnav-btn[data-view="companies"]') || nav.querySelector('.vnav-btn');
    if (!eftir) { setTimeout(injectNav, 500); return; }
    const btn = document.createElement('button');
    btn.className = (eftir.className || 'vnav-btn').replace(/\bactive\b/g, '').trim();
    btn.setAttribute('data-view', NAV_KEY);
    btn.innerHTML = '<span style="margin-right:6px">🎯</span>Hunter';
    btn.style.display = 'flex'; btn.style.alignItems = 'center';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (window.App && App.switchView) App.switchView(NAV_KEY); else show(); });
    eftir.parentNode.insertBefore(btn, eftir.nextSibling);
  }
  function ensureView() {
    if (document.getElementById(VIEW_ID)) return;
    const sample = document.getElementById('view-counter') || document.getElementById('view-sala');
    if (!sample || !sample.parentElement) return;
    const v = document.createElement('div'); v.id = VIEW_ID; v.className = sample.className.replace(/\bactive\b/g, '').trim();
    v.innerHTML = '<main id="hu-main" class="main-panel"></main>';
    sample.parentElement.appendChild(v);
    v.addEventListener('click', listaSmell); v.addEventListener('input', listaInnslattur);
  }
  function patchSwitchView() {
    if (!window.App || window.App._huSwitchPatched) return;
    const orig = window.App.switchView;
    window.App.switchView = function (view) {
      if (view === NAV_KEY) {
        ensureView(); stillar();
        document.querySelectorAll('[id^="view-"]').forEach(v => { v.style.display = 'none'; v.classList.remove('active'); });
        const v = document.getElementById(VIEW_ID); if (v) { v.style.display = 'block'; v.classList.add('active'); }
        document.querySelectorAll('.vnav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === NAV_KEY));
        try { if (location.hash.indexOf('#hunter') !== 0) history.replaceState(null, '', '#hunter'); } catch (_) {}
        if (!S.hladid) render();
        load();
        return;
      }
      if (S.opinn != null) { S.opinn = null; const el = document.getElementById('hu2-spjald'); if (el) el.remove(); }
      lokaValmynd();
      return orig.apply(this, arguments);
    };
    window.App._huSwitchPatched = true;
  }
  function show() { ensureView(); stillar(); if (window.App && App.switchView) App.switchView(NAV_KEY); else load(); }
  function slod() {
    const m = /^#hunter(?:\/(\d+))?$/.exec(location.hash || ''); if (!m) return;
    const v = document.getElementById(VIEW_ID);
    if (!v || !v.classList.contains('active')) { try { if (window.App && App.switchView) App.switchView(NAV_KEY); } catch (_) {} }
    if (m[1]) { let n = 0; (function bid() { if (S.hladid) { if (S.opinn !== +m[1]) opnaSpjald(+m[1]); return; } if (n++ < 60) setTimeout(bid, 200); })(); }
  }

  injectNav(); setTimeout(injectNav, 1000); setTimeout(injectNav, 3000);
  ensureView(); patchSwitchView();
  window.addEventListener('hashchange', slod); setTimeout(slod, 1400);
  document.addEventListener('slokk-viewmode', () => { const v = document.getElementById(VIEW_ID); if (v && v.classList.contains('active')) { try { render(); } catch (_) {} } });

  window.Hunter = { show, load, open: opnaSpjald, saekja: () => saekjaPost(null), state: S };
  console.log('[patch-487] Hunter installed');
})();
/* === END HUNTER === */
