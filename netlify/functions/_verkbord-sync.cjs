'use strict';
/**
 * Shared validator for /api/verkbord-sync and the Þjónustuborð AI patch.
 *
 * The model NEVER writes the database. This module only:
 *   - sanitises proposed actions into the board vocabulary (231)
 *   - matches a name hint to ONE fyrirtaeki row (never a kennitala merge)
 *   - derives "eftir að gera" from per-site report/invoice facts
 *
 * Center Hotel (kt 450905-1430, customers_base 146) is 11 fyrirtaeki.
 * Matching "Center Hótel" without a site name MUST return null.
 */

const FLOKKAR = ['tilbod', 'thjonusta', 'brunakerfi', 'rukkun', 'samskipti'];
const TAGS = [
  'draft', 'gera_tilbod', 'thjonustusamningur', 'bokhald', 'kvortun', 'hringja',
  'brunakerfi', 'eftir_ad_rukka', 'thjonusta', 'senda_tolvupost',
  'senda_skyrslur', 'uppsetning',
];
const TYPES = [
  'tilbod', 'email', 'skyrsla', 'heimsokn', 'hringja', 'samningur',
  'skjalabeidni', 'verkdagbok', 'annad',
];
const OPS = ['create', 'close', 'tag', 'notes'];

const TAG_TO_FLOKK = {
  draft: 'samskipti',
  gera_tilbod: 'tilbod',
  thjonustusamningur: 'thjonusta',
  bokhald: 'rukkun',
  kvortun: 'samskipti',
  hringja: 'samskipti',
  brunakerfi: 'brunakerfi',
  eftir_ad_rukka: 'rukkun',
  thjonusta: 'thjonusta',
  senda_tolvupost: 'samskipti',
  senda_skyrslur: 'thjonusta',
  uppsetning: 'thjonusta',
};
const TAG_TO_TYPE = {
  gera_tilbod: 'tilbod',
  senda_skyrslur: 'skyrsla',
  senda_tolvupost: 'email',
  hringja: 'hringja',
  eftir_ad_rukka: 'skyrsla',
  brunakerfi: 'skyrsla',
  thjonusta: 'heimsokn',
  uppsetning: 'heimsokn',
};

function fold(s) {
  return String(s == null ? '' : s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function uniqTags(list) {
  const out = [];
  const seen = new Set();
  (Array.isArray(list) ? list : []).forEach((t) => {
    if (!TAGS.includes(t) || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  });
  return out.slice(0, 4);
}

/**
 * Match a free-text hint to exactly one site.
 * Exact fold first, then unique substring. 0 or 2+ hits → null (do not guess).
 */
function extractKennitala(text) {
  const digits = String(text || '').replace(/[^\d]/g, '');
  // Prefer dashed 6+4 in the original text.
  const m = String(text || '').match(/\b(\d{6})-?(\d{4})\b/);
  if (m) return m[1] + m[2];
  if (digits.length === 10) return digits;
  return '';
}

function ktDigits(s) {
  return String(s == null ? '' : s).replace(/\D/g, '');
}

/** Exactly one site with this kennitala. 0 or 2+ (Center Hotel) → null. */
function matchByKt(kt, sites) {
  const d = ktDigits(kt);
  if (d.length !== 10) return null;
  const hits = (sites || []).filter((s) => ktDigits(s.kennitala) === d);
  if (hits.length === 1) return hits[0];
  return null;
}

function normSubj(s) {
  let t = fold(s);
  for (let i = 0; i < 6; i++) t = t.replace(/^(re|fw|fwd|sv|vs) /, '');
  return t.trim();
}

function matchSite(hint, sites) {
  const f = fold(hint);
  if (!f || f.length < 2) return null;
  const list = Array.isArray(sites) ? sites : [];
  const exact = list.filter((s) => fold(s.nafn) === f);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const hits = list.filter((s) => {
    const n = fold(s.nafn);
    if (!n) return false;
    if (n.indexOf(f) !== -1) return true;
    return f.length >= 6 && f.indexOf(n) !== -1;
  });
  if (hits.length === 1) return hits[0];
  return null;
}

function channelRef(kind, year, fid) {
  return 'derived:' + String(kind || '') + ':' + String(year || '') + ':' + String(fid || '');
}

function parseTags(raw) {
  let t = raw;
  if (typeof t === 'string') {
    try { t = JSON.parse(t); } catch (_) { t = []; }
  }
  return Array.isArray(t) ? t : [];
}

function isOpenItem(i) {
  if (!i || i._vd) return false;
  if (i.status === 'lokad') return false;
  if (i.archived_at || i.deleted_at) return false;
  return true;
}

/** Open board row for this exact site name, optionally sharing a tag. */
function existingBoardHit(items, site, tags) {
  const fn = fold(site && site.nafn);
  if (!fn) return null;
  const want = new Set(Array.isArray(tags) ? tags : []);
  const list = Array.isArray(items) ? items : [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (!isOpenItem(row)) continue;
    if (fold(row.customer_nafn) !== fn) continue;
    if (!want.size) return row;
    const have = parseTags(row.tags);
    if (have.some((t) => want.has(t))) return row;
  }
  return null;
}

/**
 * Per-site slökk coverage. Never keyed by kennitala / customer_base_id.
 * reports: [{ fyrirtaeki_id }]  invoices: [{ customer_id }]
 */
function deriveUttekt(sites, reports, invoices, year) {
  const y = Number(year) || new Date().getFullYear();
  const rep = new Map();
  (reports || []).forEach((r) => {
    const id = Number(r && r.fyrirtaeki_id);
    if (!id) return;
    const dags = r.doc_date || r.created_at || '';
    const prev = rep.get(id);
    if (!prev || String(dags) > String(prev.dags)) rep.set(id, { id: r.id, dags: dags });
  });
  const inv = new Set();
  (invoices || []).forEach((s) => {
    const id = Number(s && s.customer_id);
    if (id) inv.add(id);
  });
  const out = [];
  (sites || []).forEach((s) => {
    if (s && s.er_i_thjonustu === false) return;
    const fid = Number(s && s.id);
    if (!fid) return;
    const rec = rep.get(fid);
    const hasR = !!rec;
    const hasI = inv.has(fid);
    let kind = 'engin_skyrsla';
    if (hasR && hasI) kind = 'klarad_skjol';
    else if (hasR) kind = 'vantar_reikning';
    else if (hasI) kind = 'vantar_skyrslu';
    if (kind !== 'vantar_reikning' && kind !== 'vantar_skyrslu') return;
    out.push({
      kind,
      fid,
      nafn: s.nafn,
      customer_base_id: s.customer_base_id || null,
      year: y,
      dags: rec && rec.dags ? rec.dags : null,
    });
  });
  return out;
}

function classifyEmailTask(email, opts) {
  const openItems = (opts && opts.openItems) || [];
  const sites = (opts && opts.sites) || [];
  const id = email && email.id;
  const sender = String((email && (email.sender_email || email.from)) || '');
  const subj = String((email && email.subject) || '').trim();
  const body = String((email && (email.body || email.snippet || email.body_preview)) || '');
  const blob = subj + '\n' + body + '\n' + String((email && email.sender_name) || '');
  const f = fold(blob);
  const ref = id ? 'email:' + id : '';

  if (/eldklar@eldklar\.is/i.test(sender) || String((email && email.folder) || '').toUpperCase() === 'SENT') {
    return { op: 'skip', reason: 'okkar póstur', channel_ref: ref, title: subj };
  }

  if (ref && openItems.some((i) => isOpenItem(i) && String(i.channel_ref || '') === ref)) {
    return { op: 'skip', onBoard: true, reason: 'þegar á borði', channel_ref: ref, title: subj };
  }

  const thread = openItems.find((i) => {
    if (!isOpenItem(i)) return false;
    const a = normSubj(i.title);
    const b = normSubj(subj);
    return a && b && (a === b || (a.length >= 8 && b.indexOf(a) !== -1) || (b.length >= 8 && a.indexOf(b) !== -1));
  });

  let tags = ['senda_tolvupost'];
  let type = 'email';
  let flokkur = 'samskipti';
  let reason = 'Svara pósti.';
  let title = subj || String((email && email.sender_name) || 'Póstur').slice(0, 90);
  let important = false;

  if (/afrit af (greiddum )?reikning|ekki hafa fengid.*reikning|ekki fengid.*reikning|flett upp reikning|vantar afrit/.test(f)) {
    tags = ['bokhald', 'senda_tolvupost'];
    type = 'skjalabeidni';
    flokkur = 'rukkun';
    reason = 'Senda afrit reiknings.';
    title = 'Afrit reiknings — ' + (String((email && email.sender_name) || subj).slice(0, 80));
  } else if (/teikning|neydarteikn/.test(f)) {
    tags = ['brunakerfi', 'senda_skyrslur'];
    type = 'skjalabeidni';
    flokkur = 'brunakerfi';
    reason = 'Senda teikningar / neyðarteikningar.';
    title = 'Senda teikningar — ' + (String((email && email.sender_name) || subj).slice(0, 80));
  } else if ((/ma senda reikning|senda reikninginn/.test(f) || /kennitala/.test(f)) && /reykskyn|slokkvitaeki|kolsyru|lettvatn/.test(f)) {
    tags = ['eftir_ad_rukka', 'thjonusta'];
    type = 'heimsokn';
    flokkur = 'thjonusta';
    reason = 'Rukka og setja á áætlun.';
  } else if (/var eftirlit|pipir|pipar i|skynjara/.test(f) && /eftirlit|skynjar/.test(f)) {
    tags = ['thjonusta', 'hringja'];
    type = 'heimsokn';
    flokkur = 'thjonusta';
    reason = 'Svara: eftirlit og skynjari sem pípar.';
    important = true;
    title = subj || 'Eftirlit / skynjari pípar';
  }

  const kt = extractKennitala(blob);
  let site = matchByKt(kt, sites);
  if (!site) {
    site = matchSite(email && email.sender_name, sites)
      || matchSite(subj, sites);
  }
  if (!site && sender.indexOf('@') !== -1) {
    const stem = fold(sender.split('@')[1].split('.')[0]);
    if (stem.length >= 5) site = matchSite(stem, sites);
  }
  if (!site) {
    const hits = (sites || []).filter((s) => {
      const n = fold(s.nafn).replace(/^(husf|husfelagid|husfelagio)\s+/, '');
      return n.length >= 8 && f.indexOf(n) !== -1;
    });
    if (hits.length === 1) site = hits[0];
  }

  if (thread && (!site || !thread.customer_nafn || fold(thread.customer_nafn) === fold(site.nafn))) {
    return {
      op: 'notes',
      id: thread.id,
      notes: (email && email.received_at ? String(email.received_at).slice(0, 10) + ': ' : '') + body.slice(0, 500),
      title: thread.title,
      customer_nafn: thread.customer_nafn || (site && site.nafn) || null,
      reason: 'Ítrekun á opnu máli — ekki nýtt mál.',
      defaultOn: true,
      channel_ref: ref,
      kind: 'email_thread',
    };
  }

  if (reason === 'Svara pósti.') {
    return { op: 'skip', reason: 'óflokkað', channel_ref: ref, title: subj };
  }

  return {
    op: 'create',
    title: title.slice(0, 240),
    notes: body.slice(0, 2000),
    type,
    tags,
    flokkur,
    customer_nafn: site ? site.nafn : (String((email && email.sender_name) || '').slice(0, 160) || null),
    customer_base_id: site ? (site.customer_base_id || null) : null,
    channel_ref: ref || null,
    important,
    reason,
    source: 'email',
    defaultOn: !!important,
    kind: 'email',
    sender,
  };
}

function titleForDerived(d) {
  if (d.kind === 'vantar_reikning') return 'Vantar úttektarreikning ' + d.year + ' — ' + d.nafn;
  if (d.kind === 'vantar_skyrslu') return 'Vantar úttektarskýrslu ' + d.year + ' — ' + d.nafn;
  return String(d.nafn || 'Verk');
}

function actionFromDerived(d, openItems) {
  const tags = d.kind === 'vantar_reikning' ? ['eftir_ad_rukka']
    : d.kind === 'vantar_skyrslu' ? ['senda_skyrslur'] : [];
  const ref = channelRef(d.kind, d.year, d.fid);
  const items = openItems || [];
  if (items.some((i) => isOpenItem(i) && String(i.channel_ref || '') === ref)) {
    return { op: 'skip', onBoard: true, kind: d.kind, fid: d.fid, nafn: d.nafn, year: d.year, channel_ref: ref, reason: 'þegar á borði' };
  }
  if (existingBoardHit(items, { nafn: d.nafn }, tags)) {
    return { op: 'skip', onBoard: true, kind: d.kind, fid: d.fid, nafn: d.nafn, year: d.year, channel_ref: ref, reason: 'þegar á borði' };
  }
  return {
    op: 'create',
    title: titleForDerived(d),
    type: 'skyrsla',
    tags,
    flokkur: d.kind === 'vantar_reikning' ? 'rukkun' : 'thjonusta',
    customer_nafn: d.nafn,
    customer_base_id: d.customer_base_id || null,
    channel_ref: ref,
    notes: 'Leitt úr gögnum: ' + d.kind + ' ' + d.year + ' á fyrirtaeki_id ' + d.fid + '. Ekki gisk, ekki kt-merge.',
    reason: d.kind === 'vantar_reikning' ? 'Úttektarskýrsla til, enginn úttektarreikningur á þessum stað.' : 'Úttektarreikningur til, engin úttektarskýrsla á þessum stað.',
    source: 'derived',
    defaultOn: false,
    kind: d.kind,
    fid: d.fid,
    year: d.year,
    dags: d.dags || null,
  };
}

function parseJsonArray(text) {
  const s = String(text || '');
  const m = s.match(/\[[\s\S]*\]/);
  if (!m) return [];
  try {
    const v = JSON.parse(m[0]);
    return Array.isArray(v) ? v : [];
  } catch (_) {
    return [];
  }
}

/**
 * Drop invented vocabulary, refuse kennitala-only customer links, cap size.
 * Close is never default-on. Unknown item ids are dropped.
 */
function validateActions(raw, opts) {
  const sites = (opts && opts.sites) || [];
  const openItems = (opts && opts.openItems) || [];
  const arr = Array.isArray(raw) ? raw.slice(0, 40) : [];
  const out = [];
  arr.forEach((a) => {
    if (!a || typeof a !== 'object') return;
    const op = a.op;
    if (op === 'create') {
      const title = String(a.title || '').trim().slice(0, 240);
      if (!title) return;
      const hint = String(a.customer_nafn || a.customer_hint || '').trim();
      const site = matchSite(hint, sites);
      let customer_nafn = null;
      let customer_base_id = null;
      if (site) {
        customer_nafn = site.nafn;
        customer_base_id = site.customer_base_id || null;
      } else if (hint) {
        const hits = sites.filter((s) => {
          const n = fold(s.nafn);
          const h = fold(hint);
          return n === h || n.indexOf(h) !== -1 || (h.length >= 6 && h.indexOf(n) !== -1);
        });
        if (hits.length > 1) {
          // Group name like "Center Hótel" — do not attach the legal entity as a site.
          customer_nafn = null;
        } else {
          customer_nafn = hint.slice(0, 160);
        }
      }
      const tags = uniqTags(a.tags).filter((t) => t !== 'draft');
      const type = TYPES.includes(a.type) ? a.type : (TAG_TO_TYPE[tags[0]] || 'annad');
      const flokkur = FLOKKAR.includes(a.flokkur) ? a.flokkur : (TAG_TO_FLOKK[tags[0]] || null);
      let ref = a.channel_ref ? String(a.channel_ref).slice(0, 120) : '';
      if (ref && !/^derived:[a-z0-9_]+:\d{4}:\d+$/.test(ref) && !/^notes:[a-z0-9_-]{4,40}$/.test(ref) && !/^email:\d+$/.test(ref)) {
        ref = '';
      }
      if (ref && openItems.some((i) => isOpenItem(i) && String(i.channel_ref || '') === ref)) return;
      if (site && existingBoardHit(openItems, site, tags.length ? tags : null)) return;
      out.push({
        op: 'create',
        title,
        notes: String(a.notes || '').slice(0, 2000),
        type,
        tags,
        flokkur,
        customer_nafn,
        customer_base_id,
        important: a.important === true,
        channel_ref: ref || null,
        reason: String(a.reason || '').slice(0, 240),
        source: a.source === 'derived' ? 'derived' : (ref && ref.indexOf('email:') === 0 ? 'email' : 'notes'),
        defaultOn: a.defaultOn !== false,
      });
      return;
    }
    if (op === 'close') {
      const id = Number(a.id);
      if (!id) return;
      const row = openItems.find((i) => Number(i.id) === id);
      if (!row) return;
      out.push({
        op: 'close',
        id,
        title: String(row.title || '').slice(0, 240),
        customer_nafn: row.customer_nafn || null,
        reason: String(a.reason || '').slice(0, 240),
        defaultOn: false,
      });
      return;
    }
    if (op === 'tag') {
      const id = Number(a.id);
      if (!id) return;
      const row = openItems.find((i) => Number(i.id) === id);
      if (!row) return;
      const add = uniqTags(a.add_tags || a.tags);
      if (!add.length) return;
      out.push({
        op: 'tag',
        id,
        add_tags: add,
        title: String(row.title || '').slice(0, 240),
        customer_nafn: row.customer_nafn || null,
        reason: String(a.reason || '').slice(0, 240),
        defaultOn: false,
      });
      return;
    }
    if (op === 'notes') {
      const id = Number(a.id);
      if (!id) return;
      const row = openItems.find((i) => Number(i.id) === id);
      if (!row) return;
      const extra = String(a.notes || '').trim().slice(0, 2000);
      if (!extra) return;
      out.push({
        op: 'notes',
        id,
        notes: extra,
        title: String(row.title || '').slice(0, 240),
        customer_nafn: row.customer_nafn || null,
        reason: String(a.reason || '').slice(0, 240),
        defaultOn: false,
      });
    }
  });
  return out;
}

module.exports = {
  FLOKKAR,
  TAGS,
  TYPES,
  OPS,
  fold,
  matchSite,
  channelRef,
  existingBoardHit,
  deriveUttekt,
  actionFromDerived,
  classifyEmailTask,
  extractKennitala,
  matchByKt,
  parseJsonArray,
  validateActions,
  uniqTags,
};
