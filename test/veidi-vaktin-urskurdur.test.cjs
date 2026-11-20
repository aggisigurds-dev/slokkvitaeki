// Veiði-vaktin: úrskurðað mál stendur (Verkefnalisti 1b6c7507, lagað í ad264195, próf 17.11.2026 eftir stikkprufu).
// Vaktin (tools/veidi-vaktin.cjs) keyrð á gervineti (tools/_veidi-gervinet.cjs — ekkert raunkall, --thurr). Fyrir
// ad264195 STOFNAÐI hún nýtt samþykkismál á Agnar í hvert sinn sem mál var lokað með úrskurði en sýnin ekki tóm
// (#1530 kredit, #1531 verk, #1534 skeytamiðlun hefðu öll komið aftur). Prófið fellur á þeim kóða.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { spawnSync } = require('child_process');

const ROT = path.join(__dirname, '..');
const KREDIT = 'veidi:kredit-an-endurgerdar';

function keyra(svidsmynd) {
  const r = spawnSync(process.execPath, ['--require', path.join(ROT, 'tools', '_veidi-gervinet.cjs'), path.join(ROT, 'tools', 'veidi-vaktin.cjs'), '--thurr'], {
    env: Object.assign({}, process.env, { SUPABASE_URL: 'https://gervi.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'gervi', VEIDI_GERVI: JSON.stringify(svidsmynd) }),
    encoding: 'utf8', timeout: 30000,
  });
  return (r.stdout || '') + (r.stderr || '');
}
const kredit = (n) => ({ num: n, customer_nafn: 'Gervifélag', samtals: 10000, kredit_dags: '2026-09-01', kredit_num: 'R-9' + n.slice(-2) });

test('lokað mál með úrskurði og sömu röðum → ekkert nýtt mál', () => {
  const ut = keyra({
    syn: { v_kredit_an_endurgerdar: [kredit('R-000111'), kredit('R-000222')] },
    lokud: { [KREDIT]: [{ id: 9001, notes: '• R-000111 · …\n• R-000222 · …', lokid_af: 'Claude', lokid_at: '2026-11-11T11:00:00Z' }] },
  });
  assert.doesNotMatch(ut, /RED:/, ut);
  assert.match(ut, /ÚRSKURÐAÐ #9001 — v_kredit_an_endurgerdar/, ut);
  assert.doesNotMatch(ut, /STOFNA — \d+ reikningar felldir/, 'stofnaði aftur mál sem búið var að úrskurða:\n' + ut);
});

test('ný röð bætist við eftir úrskurð → nýtt mál telur AÐEINS nýju röðina', () => {
  const ut = keyra({
    syn: { v_kredit_an_endurgerdar: [kredit('R-000111'), kredit('R-000222'), kredit('R-000333')] },
    lokud: { [KREDIT]: [{ id: 9001, notes: 'blabla\n\n‹raðir: R-000111 ¦ R-000222›', lokid_af: 'Agnar', lokid_at: '2026-11-11T11:00:00Z' }] },
  });
  assert.match(ut, /STOFNA — 1 reikningar felldir/, ut);
});

test('mál sem vaktin lokaði sjálf (sýnin tæmdist) → nýjar raðir vekja mál eins og áður', () => {
  const ut = keyra({
    syn: { v_kredit_an_endurgerdar: [kredit('R-000111')] },
    lokud: { [KREDIT]: [{ id: 9002, notes: '• R-000111 · …', lokid_af: 'veidi-vaktin', lokid_at: '2026-11-10T03:00:00Z' }] },
  });
  assert.match(ut, /STOFNA — 1 reikningar felldir/, ut);
});

test('v_skeytamidlun_vantar er ekki vöktuð lengur (mældi tómt payday_delivery)', () => {
  const ut = keyra({ syn: { v_skeytamidlun_vantar: [{ nafn: 'Gervifélag', ogreiddir: 2 }] } });
  assert.doesNotMatch(ut, /skeytamiðlun/i, ut);
  assert.match(ut, /0 stofnuð/, ut);
});
