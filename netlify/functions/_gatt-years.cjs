// Shared year / service helpers for the customer portal (gatt) and audits.
// Two services on one house stay independent: slökkvitæki ≠ brunakerfi.
// Never fill slökk ticks forward from sidasta_ar. Never treat slökk
// er_i_thjonustu as "has a fire system".

const YEAR_COLS = ['2023', '2024', '2025', '2026'];

function yearSet(arr) {
  const out = {};
  (arr || []).forEach((y) => {
    if (y == null || y === '') return;
    out[String(y)] = 1;
  });
  return out;
}

function lastYear(arr) {
  let m = 0;
  (arr || []).forEach((y) => {
    const n = Number(y);
    if (n > m) m = n;
  });
  return m || null;
}

// One cell per year: [slökk, brunakerfi]. 'ok' only when THAT service has a
// real document year on THIS fyrirtaeki_id. Missing ar_slokk → all slökk 'no'
// (never fill from sidasta_ar — that is how Miðgarður '25 and Plaza '26 lied).
function yearsFromDocs(b, cols) {
  const years = cols || YEAR_COLS;
  const sl = yearSet(b && b.ar_slokk);
  const br = yearSet(b && b.ar_bru);
  return years.map((y) => [sl[y] ? 'ok' : 'no', br[y] ? 'ok' : 'no']);
}

// Fail-open: untagged / ovisst invoices count as úttekt. brunakerfi and búð
// never paint the slökk board (Charlize #226, 187 isUttektInvoiceTeg).
function isUttektInvoiceTeg(teg) {
  const t = String(teg || '').toLowerCase();
  return t !== 'brunakerfi' && t !== 'bud';
}

// Pick the document for THIS site. Never fall back to arr[0] (sibling bleed
// on shared customer_base_id / kennitala — Center Hótel, Heimaleiga).
// Unique-kt orphan (no fyrirtaeki_id, exactly one site on the base) is allowed.
function pickDocForSite(arr, coId, opts) {
  if (!arr || !arr.length) return null;
  const hit = arr.find((d) => d && d.fyrirtaeki_id != null && String(d.fyrirtaeki_id) === String(coId));
  if (hit) return hit;
  const sitesOnBase = opts && opts.sitesOnBase;
  if (sitesOnBase === 1) {
    return arr.find((d) => !d || d.fyrirtaeki_id == null) || null;
  }
  return null;
}

function bruInService(map, fid) {
  if (!map || fid == null) return false;
  const e = map[fid] || map[String(fid)];
  return !!(e && typeof e === 'object');
}

module.exports = {
  YEAR_COLS, yearSet, lastYear, yearsFromDocs, isUttektInvoiceTeg, pickDocForSite, bruInService,
};
