#!/usr/bin/env node
'use strict';
/**
 * Keep in sync with looksLikeAgnar / isGenericOperatorName / isAgnarFromNames /
 * showOwnerChrome in js/patches/231-verkbord.js.
 *
 * Extra chrome is visible iff the worker filter is Agnar (and the operator is
 * not a named non-Agnar). Logged-in Agnar + Sara filter must hide extras.
 */
function foldName(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function looksLikeAgnar(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return false;
  const f = foldName(s);
  if (!f) return false;
  const token = f.split(/\s+/)[0];
  return token === 'agnar' || token === 'aggisigurds';
}
function isGenericOperatorName(raw) {
  const f = foldName(raw).replace(/\s+/g, '');
  return !f || f === 'slokkvitki' || f === 'slokkvitaeki' || f === 'starfsmaur' || f === 'starfsmadur' || f === 'kassi' || f === 'app';
}
function isAgnarFromNames(names, override) {
  if (override === true) return true;
  if (override === false) return false;
  const list = Array.isArray(names) ? names : [];
  for (let i = 0; i < list.length; i++) {
    const n = list[i];
    if (n == null || n === '') continue;
    if (isGenericOperatorName(n)) continue;
    return looksLikeAgnar(n);
  }
  return true;
}
function showOwnerChrome(fWorker, operatorIsAgnar) {
  return looksLikeAgnar(fWorker) && !!operatorIsAgnar;
}

let failed = 0;
function ok(name, cond) {
  if (cond) console.log('  OK  ' + name);
  else { failed++; console.log('  FAIL ' + name); }
}

ok('Agnar exact', looksLikeAgnar('Agnar'));
ok('agnar lower', looksLikeAgnar('agnar'));
ok('Agnar Sigurðsson fold', looksLikeAgnar('Agnar Sigurðsson'));
ok('aggisigurds supporting', looksLikeAgnar('aggisigurds'));
ok('aggisigurds@gmail.com', looksLikeAgnar('aggisigurds@gmail.com'));
ok('Anni is not Agnar', !looksLikeAgnar('Anni'));
ok('Hákon is not Agnar', !looksLikeAgnar('Hákon'));
ok('Charlize is not Agnar', !looksLikeAgnar('Charlize'));
ok('Sara is not Agnar', !looksLikeAgnar('Sara'));
ok('Aggi is not Agnar', !looksLikeAgnar('Aggi'));
ok('nema_agnar is not Agnar', !looksLikeAgnar('nema_agnar'));
ok('Allir án Agnars is not Agnar', !looksLikeAgnar('Allir án Agnars'));
ok('empty is not Agnar name', !looksLikeAgnar(''));
ok('Slökkvitæki generic', isGenericOperatorName('Slökkvitæki'));
ok('Starfsmaður generic', isGenericOperatorName('Starfsmaður'));
ok('Anni not generic', !isGenericOperatorName('Anni'));

ok('Anni login is staff', !isAgnarFromNames(['Anni']));
ok('Agnar login is owner', isAgnarFromNames(['Agnar']));
ok('unnamed office session is Agnar', isAgnarFromNames(['Slökkvitæki']));
ok('empty identities office default Agnar', isAgnarFromNames([]));
ok('override false forces staff', !isAgnarFromNames(['Agnar'], false));
ok('override true forces Agnar', isAgnarFromNames(['Anni'], true));

ok('Sara filter hides extras even for Agnar operator', !showOwnerChrome('Sara', true));
ok('Anni filter hides extras even for Agnar operator', !showOwnerChrome('Anni', true));
ok('Hákon filter hides extras even for Agnar operator', !showOwnerChrome('Hákon', true));
ok('Charlize filter hides extras even for Agnar operator', !showOwnerChrome('Charlize', true));
ok('Binni filter hides extras even for Agnar operator', !showOwnerChrome('Binni', true));
ok('nema_agnar filter hides extras even for Agnar operator', !showOwnerChrome('nema_agnar', true));
ok('Agnar filter shows extras for Agnar operator', showOwnerChrome('Agnar', true));
ok('Agnar filter hidden for Anni operator', !showOwnerChrome('Agnar', false));
ok('unnamed office + Agnar filter shows extras', showOwnerChrome('Agnar', isAgnarFromNames(['Slökkvitæki'])));
ok('unnamed office + Sara filter hides extras', !showOwnerChrome('Sara', isAgnarFromNames(['Slökkvitæki'])));

const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const v231 = fs.readFileSync(path.join(root, 'js/patches/231-verkbord.js'), 'utf8');
const v287 = fs.readFileSync(path.join(root, 'js/patches/287-postar-queue.js'), 'utf8');
const v343 = fs.readFileSync(path.join(root, 'js/patches/343-verkbord-ai.js'), 'utf8');

ok('cache-bust 231 ?v=20260831sc2', html.includes('231-verkbord.js?v=20260831sc2'));
ok('cache-bust 343 ?v=20260831sc2', html.includes('343-verkbord-ai.js?v=20260831sc2'));
ok('cache-bust 287 ?v=20260831sc2', html.includes('287-postar-queue.js?v=20260831sc2'));
ok('231 defines showOwnerChrome', v231.includes('function showOwnerChrome()'));
ok('231 chrome follows worker filter', v231.includes('looksLikeAgnar(state.fWorker) && isAgnarUser()'));
ok('231 renderControls uses showOwnerChrome', v231.includes('const agnar = showOwnerChrome()'));
ok('231 applyStaffChrome uses showOwnerChrome', v231.includes('const staff = !showOwnerChrome()'));
ok('231 setWorker refreshes chrome', /function setWorker\(v\) \{[\s\S]*?applyStaffChrome\(\);[\s\S]*?renderControls\(\);/.test(v231));
ok('231 staff top row is worker + search', v231.includes("workerHtml +\n          searchHtml"));
ok('231 Agnar still has Innhólf', v231.includes("tab('post', '📥 ', 'Innhólf'"));
ok('231 staff chrome CSS hides AI slot', v231.includes('#view-verkbord.vb-staff #vb-ai-slot'));
ok('231 comment says filter not login', v231.includes('follows the name dropdown'));
ok('231 does not gate chrome on operator alone', !v231.includes('never the worker filter'));
ok('Forvinna collapse still present', v231.includes("data-act=\"drafttoggle\"") && v231.includes('function draftPackIsUseful'));
ok('287 skips Póstar chip via showOwnerChrome', v287.includes('!Verkbord.showOwnerChrome()'));
ok('343 skips AI mount via showOwnerChrome', v343.includes('!Verkbord.showOwnerChrome()'));
ok('231 exports showOwnerChrome', /showOwnerChrome,/.test(v231));

console.log(failed ? '\nFAIL ' + failed : '\nOK');
process.exit(failed ? 1 : 0);
