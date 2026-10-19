#!/usr/bin/env node
/* VÖRÐUR — API-leyndarmál mega hvorki vera lesin né skrifuð í vafranum.
 *
 * Fundið 15.10.2026 í úttekt (regla Agnars: engar per-tækis stillingar): Resend-lykill
 * (resend_api_key), já.is-lykill (ja_is_api_key) og Twilio sid/token/from
 * (sms_twilio_sid/token/from) sátu í localStorage hverrar vélar og voru send úr vafranum.
 * Þau mega ekki fara í app_settings heldur (anon-lykillinn les töfluna). Þau búa nú í
 * Netlify env og föllin email-send, kt-lookup og sms-send nota þau á þjóninum.
 *
 * Þessi vörður fellur rautt ef kóði í vafranum:
 *   · les eða skrifar einhvern þessara lykla í localStorage/sessionStorage
 *     (`removeItem` er leyft — það hreinsar gamla gildið),
 *   · sendir `apiKey` í pósthleðslu til /api/email-send, eða
 *   · kallar beint á api.twilio.com / api.resend.com / api.ja.is úr vafrakóða.
 * Kyrrstæður lestur — ekkert net — svo hann keyrir líka í pre-push.
 *
 *   node tools/audit-leyndarmal-vafri.cjs
 */
const fs = require('fs');
const path = require('path');

const rot = path.join(__dirname, '..');
const LYKLAR = /resend_api_key|ja_is_api_key|sms_twilio_(?:sid|token|from)/;
const GRUNNLINA = 0;

function skrar(dir, re) {
  const ut = [];
  (function ganga(d) {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) ganga(p);
      else if (re.test(e.name)) ut.push(p);
    }
  })(dir);
  return ut;
}
const rel = (f) => path.relative(rot, f).split(path.sep).join('/');
const fundid = [];

// Vafrakóði: js/ og index.html
const vafri = skrar(path.join(rot, 'js'), /\.js$/).concat([path.join(rot, 'index.html')].filter(fs.existsSync));
for (const f of vafri) {
  fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((l, i) => {
    const t = l.trim();
    if (/^(\/\/|\*|\/\*)/.test(t)) return;                  // athugasemdir
    const stad = rel(f) + ':' + (i + 1) + '  ' + t.slice(0, 100);
    if (LYKLAR.test(l) && !/removeItem|\.forEach\(k => localStorage\.removeItem/.test(l)
        && /(?:local|session)Storage|getItem|setItem|\bK\.TW_/.test(l)) fundid.push(stad);
    if (/\bapiKey\s*:\s*[^,}]*(?:localStorage|getItem)/.test(l)) fundid.push(stad);
    if (/api\.twilio\.com|api\.resend\.com|api\.ja\.is/.test(l)) fundid.push(stad);
  });
}

if (fundid.length > GRUNNLINA) {
  console.log(`❌ Leyndarmál í vafrakóða: ${fundid.length} (grunnlína ${GRUNNLINA})\n`);
  console.log('   Lyklar búa í Netlify env (RESEND_API_KEY, JA_IS_API_KEY, TWILIO_SID/TOKEN/FROM) og');
  console.log('   er beitt á þjóni: /api/email-send, /api/kt-lookup, /api/sms-send.\n');
  fundid.slice(0, 15).forEach((h) => console.log('   ' + h));
  process.exit(1);
}

console.log(`✅ Engin leyndarmál í vafrakóða — Resend, já.is og Twilio fara um þjóninn (${vafri.length} skrár skoðaðar).`);
process.exit(0);
