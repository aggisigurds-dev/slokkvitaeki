// _merkja-leid.cjs — hvaða agent fær merkta línu („Merkja og keyra“, lota 14, 17.11.2026).
//
// EKKI nýr fastur listi: agentarnir, kveikjuorðin þeirra og síðukortið koma úr LEIÐARVÍSINUM sem er til —
// data/agents-registry.json í brunaholf (byggt af tools/build-agents-registry.cjs úr .claude/agents/*.md og
// data/sidukort.json; birt opinberlega á https://brunaholf.netlify.app/data/agents-registry.json).
// Stigagjöfin speglar tools/router.cjs (brunaholf), skref 1–3 (kveikjuorð nákvæmt 3 · beygt 2 · síðuheiti til eiganda
// síðunnar 3 / iframe 2 · almennt orð 1 og aðeins með öðru hitti · hvert orð til hæstu stiga · ≥ 2 stig). Fyrirtækjaskref
// router.cjs (felog.json) er ekki hér: sú skrá er ekki birt (kennitölur). test/merkja-keyra.test.cjs ber útkomuna saman
// við router.cjs sjálfan þegar brunaholf-repóið er við hliðina — breytist router.cjs fellur prófið.
// Finnist enginn agent heldur jarvis keflinu og `gat: true` er skráð (boðhlaupsreglan 04.11.2026).
'use strict';

const REGISTRY_URL = process.env.MERKJA_REGISTRY_URL || 'https://brunaholf.netlify.app/data/agents-registry.json';
const VARA = 'jarvis';

/* ── Normalísering — sama og router.cjs ──────────────────────────────────── */
const STUTT = new Set(['kt', 'qr', 'pos', 'rls', 'vsk', 'pdf', 'nav', '3d']);
const VISK = /(innar|inu|num|nir|nar|inn|ins|in|ið|um|ar|ir|ur|na|i|a|u|s)$/;
const FOLD = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ý: 'y', ð: 'd', þ: 'th', æ: 'ae', ö: 'o' };
const fold = (w) => w.replace(/[áéíóúýðþæö]/g, (c) => FOLD[c]);
function stofn(w) { const m = VISK.exec(w); return m && w.length - m[0].length >= 4 ? w.slice(0, w.length - m[0].length) : w; }
const tok = (w) => { const s = stofn(w); return { w, s, f: fold(s) }; };
const ordin = (t) => String(t || '').normalize('NFC').toLowerCase().split(/[^a-z0-9þæöðáéíóúý]+/);
const FALLORD = new Set(['fyrir', 'eftir', 'undir', 'yfir', 'milli', 'þegar', 'þetta', 'þessi', 'þessu', 'þessa', 'aðeins', 'alveg', 'hvernig', 'hvort',
  'einnig', 'þannig', 'vegna', 'meðan', 'síðan', 'núna', 'bara', 'líka', 'samt', 'annars', 'allir', 'allar', 'öllum', 'hérna', 'þarna', 'eitthvað', 'ekkert',
  'hægt', 'verða', 'verður', 'verði', 'orðið', 'mikið', 'strax']);
const ord = (t) => ordin(t).filter((w) => w && !FALLORD.has(w) && (w.length >= 3 || STUTT.has(w))).map(tok);
const forskeyti = (a, b) => { const [s, l] = a.length <= b.length ? [a, b] : [b, a]; return s.length >= 5 && l.length - s.length <= 3 && l.startsWith(s); };
function sama(p, k) {
  if (p.w === k.w) return 'n';
  if (p.s === k.s || p.f === k.f || forskeyti(p.w, k.w) || forskeyti(p.s, k.s) || forskeyti(p.f, k.f)) return 'b';
  return null;
}
const ALMENN = ['skrá', 'muna', 'sala', 'kort', 'borð', 'flipi', 'app', 'skjal', 'villa', 'prófa', 'staðan', 'beiðnir'].map(tok);
const erAlmennt = (K) => K.length === 1 && ALMENN.some((a) => K[0].w === a.w || K[0].s === a.s || K[0].f === a.f);
function finnaRod(K, P) {
  let best = null;
  for (let i = 0; i + K.length <= P.length; i++) {
    let allN = true, ok = true;
    for (let j = 0; j < K.length; j++) { const t = sama(P[i + j], K[j]); if (!t) { ok = false; break; } if (t !== 'n') allN = false; }
    if (!ok) continue;
    const pos = K.map((_, j) => i + j);
    if (allN) return { pos, teg: 'n' };
    if (!best) best = { pos, teg: 'b' };
  }
  return best;
}

/* ── Gögnin: registry (agentar + síður) ───────────────────────────────────── */
function undirbua(r) {
  const agentar = (r.list || []).filter((e) => e.type === 'agent');
  const kv = agentar.map((e) => ({ e, kv: (e.kveikjuord || []).map((k) => ({ k, K: ord(k) })).filter((x) => x.K.length) }));
  const sidur = (r.pages || []).map((p) => {
    const heiti = new Set([String(p.titill || '').split(/[·(—–]/)[0].trim(), ...(p.kveikjuord || [])]);
    if (p.id && !/[:/]/.test(p.id) && p.id.length >= 4) heiti.add(p.id);
    return { p, heiti: [...heiti].filter(Boolean).map((h) => ({ h, K: ord(h) })).filter((x) => x.K.length) };
  });
  return { kv, sidur, byName: new Map(agentar.map((e) => [e.name, e])) };
}
let _cache = { t: 0, g: null };
async function saekja({ fetchFn = fetch, url = REGISTRY_URL } = {}) {
  if (_cache.g && Date.now() - _cache.t < 10 * 60 * 1000) return _cache.g;
  const r = await fetchFn(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('agents-registry.json svaraði ' + r.status);
  _cache = { t: Date.now(), g: undirbua(await r.json()) };
  return _cache.g;
}
const stilla = (registry) => { _cache = { t: Date.now(), g: registry ? undirbua(registry) : null }; };

/* ── Greining: texti málsins → agent ─────────────────────────────────────── */
function greina(texti, g, { heima = 'slokkvitaeki' } = {}) {
  const P = ord(String(texti || '').slice(0, 6000));
  const kand = [];
  for (const { e, kv } of g.kv) for (const { k, K } of kv) {
    const m = finnaRod(K, P); if (!m) continue;
    const alm = erAlmennt(K);
    kand.push({ agent: e.name, kv: k, pos: m.pos, stig: alm ? 1 : (m.teg === 'n' ? 3 : 2), alm });
  }
  for (const { p, heiti } of g.sidur) for (const { h, K } of heiti) {
    const m = finnaRod(K, P); if (!m) continue;
    if (p.eigandi) { const alm = erAlmennt(K); kand.push({ agent: p.eigandi.replace(/^(?:bh|sl):/, ''), kv: h, pos: m.pos, stig: alm ? 1 : (/^iframe/.test(p.tegund || '') || /^br-/.test(p.id || '') ? 2 : 3), alm }); }
    break;
  }
  const hamark = new Map();
  for (const c of kand) for (const i of c.pos) hamark.set(i, Math.max(hamark.get(i) || 0, c.stig));
  const gild = kand.filter((c) => c.stig >= Math.max(...c.pos.map((i) => hamark.get(i))));
  const perA = new Map();
  for (const c of gild.sort((a, b) => b.stig - a.stig || b.pos.length - a.pos.length)) {
    const a = perA.get(c.agent) || { agent: c.agent, notud: new Set(), hitt: [], serhaeft: 0 };
    if (c.pos.some((i) => a.notud.has(i))) continue;
    c.pos.forEach((i) => a.notud.add(i));
    a.hitt.push(c); if (!c.alm) a.serhaeft++;
    perA.set(c.agent, a);
  }
  const heimaRepo = (e) => ((e && e.skrar) || []).filter((s) => !s.afrit).map((s) => s.repo);
  const stig = [...perA.values()].map((a) => {
    const hitt = a.serhaeft ? a.hitt : [];
    return { agent: a.agent, stig: hitt.reduce((n, c) => n + c.stig, 0), ord: a.hitt.map((c) => c.kv), heima: heimaRepo(g.byName.get(a.agent)).includes(heima) };
  }).sort((a, b) => b.stig - a.stig || (b.heima - a.heima) || a.agent.localeCompare(b.agent));
  return stig.filter((s) => s.stig >= 2).slice(0, 3);
}

// Línan á borðinu → { agent, stig, ord, gat, lysing, aldrei, ... }. Textinn er tegund + titill + samantekt málsins.
async function leid(texti, opt = {}) {
  let g = null;
  try { g = opt.g || await saekja(opt); } catch (e) { return { agent: VARA, stig: 0, ord: [], gat: true, villa: 'Leiðarvísirinn svaraði ekki: ' + String((e && e.message) || e).slice(0, 120) }; }
  const v = greina(texti, g, opt);
  const a = v[0];
  const nafn = a ? a.agent : VARA;
  const e = g.byName.get(nafn) || null;
  return { agent: nafn, stig: a ? a.stig : 0, ord: a ? a.ord.slice(0, 6) : [], gat: !a, adrir: v.slice(1).map((x) => x.agent),
    emoji: e && e.emoji || '', lysing: String((e && e.lysing) || '').slice(0, 600), serhaefing: ((e && e.serhaefing) || []).slice(0, 6), aldrei: ((e && e.aldrei) || []).slice(0, 8) };
}

module.exports = { leid, greina, undirbua, saekja, stilla, ord, stofn, VARA, REGISTRY_URL };
