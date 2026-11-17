#!/usr/bin/env node
/* Vörður — birtingarmerkið virkar AÐEINS í fyrirsögn commit-skilaboða (lota 9, 17.11.2026, Verkefnalisti 166530a8).
 *
 * Það sem gerðist 10.11.2026: lota skrifaði í MEGINMÁL skilaboða að breyting væri „ekki" til birtingar — með merkinu í
 * hornklofum — og báðar síður birtust. Kveikjurnar lásu öll skilaboðin: deploy.yml `contains(head_commit.message, …)`
 * og brunaholf/netlify.toml `git log -1 --pretty=%B | grep`. Nú les deploy.yml-hliðið (gate) aðeins fyrstu línuna
 * við ýtingu og netlify.toml les `%s` (fyrirsögn).
 *
 * RAUTT ef: gate-skrefið í deploy.yml stöðvar ekki ýtingu þar sem merkið er aðeins í meginmáli, skilaboðin fara beint
 * inn í skelina með ${{ }} (skipanainnspýting) í stað env. (brunaholf/netlify.toml %s er prófað í brunaholf.)
 * Hliðið er KEYRT: skeljarbúturinn er tekinn úr deploy.yml og keyrður á þremur skilaboðum.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROT = path.join(__dirname, '..');
const brot = [];
const yml = fs.readFileSync(path.join(ROT, '.github/workflows/deploy.yml'), 'utf8').replace(/\r\n/g, '\n');

const iGate = yml.indexOf('id: gate');
const gate = iGate > -1 ? yml.slice(iGate, yml.indexOf('\n      - ', iGate + 1)) : '';
if (!gate) brot.push('fann ekki gate-skrefið (id: gate) í deploy.yml');
if (!/HAUS_SKILABOD:\s*\$\{\{\s*github\.event\.head_commit\.message\s*\}\}/.test(gate)) brot.push('skilaboðin koma ekki um env (HAUS_SKILABOD) í gate-skrefinu');
const pushBlokk = (gate.match(/if \[ "\$\{\{ github\.event_name \}\}" = "push" \]; then\n([\s\S]*?)\n\s*fi\n/) || [])[1] || '';
if (!pushBlokk) brot.push('gate-skrefið hefur enga push-grein sem les fyrirsögnina');
if (/\$\{\{\s*github\.event\.head_commit\.message/.test(pushBlokk)) brot.push('skilaboðin fara beint inn í skelina með ${{ }} — innspýting; notaðu env');

if (pushBlokk) {
  const skel = pushBlokk.split('\n').map(l => l.replace(/^ {12}/, '')).join('\n');
  const keyra = (msg) => {
    // GITHUB_OUTPUT í skrá (Windows-bash hefur ekki /dev/stdout). „run=afram" bætist aðeins við ef hliðið hætti ekki (exit 0).
    const ut = path.join(os.tmpdir(), 'birtingarmerki-' + process.pid + '.txt');
    fs.writeFileSync(ut, '');
    const r = spawnSync('bash', ['-c', skel + '\necho run=afram >> "$GITHUB_OUTPUT"'], { env: Object.assign({}, process.env, { HAUS_SKILABOD: msg, GITHUB_OUTPUT: ut.split(path.sep).join('/') }), encoding: 'utf8' });
    if (r.error) return 'VILLA:' + r.error.message;
    let o = ''; try { o = fs.readFileSync(ut, 'utf8'); fs.unlinkSync(ut); } catch (_) {}
    return o.includes('run=false') ? 'sleppt' : (o.includes('run=afram') ? 'afram' : 'óljóst:' + o + (r.stdout || '') + (r.stderr || ''));
  };
  const M = '[' + 'deploy' + ']';
  const tilvik = [
    [M + ' Birta lagfæringu\n\nmeginmál', 'afram'],
    ['Laga villu\n\nEkki ' + M + ': fer út með næstu birtingu', 'sleppt'],
    ['Laga villu " ; echo run=afram ; "\n\n' + M, 'sleppt'],
  ];
  for (const [msg, vaent] of tilvik) {
    const ut = keyra(msg);
    if (/^VILLA:/.test(ut)) { brot.push('bash ekki tiltækt til að keyra hliðið (' + ut + ')'); break; }
    if (ut !== vaent) brot.push('hliðið gaf „' + ut + '" fyrir „' + msg.split('\n')[0].slice(0, 50) + '…" (vænt: ' + vaent + ')');
  }
}

// brunaholf/netlify.toml (%s) er prófað í brunaholf sjálfu (test/birtingarmerki.test.js) — systurtréð hér getur verið á eftir.

if (brot.length) {
  console.log('❌ audit-birtingarmerki-fyrirsogn: ' + brot.length + ' brot');
  brot.forEach(b => console.log('   • ' + b));
  process.exit(1);
}
console.log('✅ audit-birtingarmerki-fyrirsogn: merkið birtir aðeins úr fyrirsögn (deploy.yml-hliðið keyrt á 3 skilaboðum' + ')');
