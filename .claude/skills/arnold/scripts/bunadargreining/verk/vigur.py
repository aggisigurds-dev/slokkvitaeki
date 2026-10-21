# -*- coding: utf-8 -*-
# vigur.py <vinnumappa> — vigur-PDF (textalag): tákn + allur textinn (skýringar, byggingarlýsing) → vigur_tokn.json + texti_<blað>.txt.
# FRAMBJÓÐENDUR, ekki lokaniðurstaða: legend blaðsins ræður hvað SL/BS/R þýðir (Suðurhella: [S] = slökkvitæki en segulloki á Trönuhrauni) —
# lestu texti_*.txt og yfirlagið sann_vigur_h*.png áður en þú notar tölurnar. Hnit eru rammahnit (sömu og nærmyndirnar).
import json, math, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')   # Windows: stdout er cp1252 sjálfgefið (→ og íslenskir stafir hrynja)
import pymupdf
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
D = sys.argv[1]
MINUT = float(os.environ.get('BGR_UT_MIN', '0') or 0)
M = json.load(open(os.path.join(D, 'manifest.json'), encoding='utf-8'))
TAK = ('SL', 'SLT', 'HSL', 'HST', 'BS', 'BSL', 'BRSL', 'R', 'ÚT', 'UT', 'BO', 'NF', 'LR', '!', '20m')
LIT = {'SL': (220, 30, 30), 'SLT': (220, 30, 30), 'HSL': (220, 30, 30), 'HST': (220, 30, 30), 'BS': (20, 80, 220), 'BRSL': (20, 80, 220), '20m': (20, 80, 220), 'R': (150, 0, 200), 'ÚT': (0, 150, 60), 'UT': (0, 150, 60), 'BO': (240, 130, 0), '!': (150, 0, 200)}
# EI-merki: EI60, EI30-CS, EICS-30, REI60, A-EI120, REIM90 … (R60 = burðarþol bita, ekki veggur → ekki með)
EI_RE = re.compile(r'^(A-)?(R?EI)(CS|M)?-?(\d{2,3})(-?CS)?$')
LIT['EI'] = (230, 110, 0); LIT['hurd'] = (0, 150, 170)
K_BOGI = 0.5522847498          # stýripunktar fjórðungsboga (Bézier) = 0,5523 · radíus


def ei_tokn(pg, k, Rm):
    ut_ = []
    for w in pg.get_text('words'):
        m = EI_RE.match(w[4].strip())
        if not m:
            continue
        r = pymupdf.Rect(w[:4]) * Rm
        o = {'t': w[4].strip(), 'typ': m.group(2) + ('-CS' if (m.group(3) == 'CS' or m.group(5)) else ''), 'min': int(m.group(4)),
             'x': round((r.x0 + r.x1) / 2 * k, 1), 'y': round((r.y0 + r.y1) / 2 * k, 1), 'w': round(r.width * k, 1), 'h': round(r.height * k, 1)}
        o['ori'] = 'v' if o['h'] > o['w'] * 1.4 else 'h'          # texti stendur eftir veggnum: lóðréttur texti = lóðréttur veggur
        if not any(q['t'] == o['t'] and abs(q['x'] - o['x']) <= 6 and abs(q['y'] - o['y']) <= 6 for q in ut_):
            ut_.append(o)
    return ut_


def _hringur(pts):
    """Kåsa-felling hrings að punktum → (miðja, radíus, rms) eða None."""
    import numpy as np
    P = np.array(pts, dtype=float)
    if len(P) < 4:
        return None
    A = np.c_[2 * P[:, 0], 2 * P[:, 1], np.ones(len(P))]
    y = (P ** 2).sum(1)
    try:
        sol = np.linalg.lstsq(A, y, rcond=None)[0]
    except Exception:
        return None
    cx, cy = sol[0], sol[1]
    r2 = sol[2] + cx * cx + cy * cy
    if r2 <= 0:
        return None
    r = math.sqrt(r2)
    res = np.abs(np.hypot(P[:, 0] - cx, P[:, 1] - cy) - r)
    return (cx, cy), r, float(np.sqrt((res ** 2).mean())), P


def hurdarop(pg, k, Rm, pxm):
    """Hurðarop úr vigurteikningunni: bogi hurðarblaðsins (strikuð brotalína EÐA Bézier-fjórðungsbogi), radíus 0,55–1,5 m, sponn ~90°.
    Miðja bogans = hjörin; opið er radíus á breidd. Blaðið (þunnur rétthyrningur / lína frá hjörunni) staðfestir (`blad`)."""
    try:
        drs = pg.get_drawings()
    except Exception:
        return []
    kand = []                      # (miðja pt, radíus pt, bogaendar [a, b] pt)
    leifar = []                    # bein strik / rétthyrningar til að staðfesta hurðarblað
    import numpy as np

    def boginn(pts):
        f = _hringur(pts)
        if not f:
            return
        (cx, cy), r, rms, P = f
        if not (0.55 <= r * k / pxm <= 1.5) or rms > 0.05 * r:
            return
        ang = np.arctan2(P[:, 1] - cy, P[:, 0] - cx)
        mid = math.atan2(np.sin(ang).mean(), np.cos(ang).mean())
        rel = (ang - mid + math.pi) % (2 * math.pi) - math.pi
        sponn = math.degrees(rel.max() - rel.min())
        if not (55 <= sponn <= 125):
            return
        i0, i1 = int(rel.argmin()), int(rel.argmax())
        kand.append(((cx, cy), r, [pymupdf.Point(P[i0, 0], P[i0, 1]), pymupdf.Point(P[i1, 0], P[i1, 1])]))

    keda, sidast = [], None        # keðja stuttra teikninga (strikaður bogi)
    for d in drs:
        its = d['items']
        stutt = bool(its) and all(it[0] == 'l' for it in its) and len(its) <= 3 and d['rect'].width + d['rect'].height < 12 and d.get('dashes') in (None, '', '[] 0')
        if stutt:
            pp = [(it[1].x, it[1].y) for it in its] + [(its[-1][2].x, its[-1][2].y)]
            if keda and sidast is not None and min(math.hypot(a[0] - b[0], a[1] - b[1]) for a in pp for b in sidast) <= 9:
                keda.append(pp)
            else:
                if len(keda) >= 6:
                    boginn([q for c_ in keda for q in c_])
                keda = [pp]
            sidast = pp
        elif keda:
            if len(keda) >= 6:
                boginn([q for c_ in keda for q in c_])
            keda, sidast = [], None
        for it in its:
            if it[0] == 'l':
                L = math.hypot(it[2].x - it[1].x, it[2].y - it[1].y)
                if L > 3:
                    leifar.append((it[1], it[2], L))
            elif it[0] == 're':
                r_ = it[1]
                leifar.append((pymupdf.Point(r_.x0, r_.y0), pymupdf.Point(r_.x1, r_.y1), math.hypot(r_.width, r_.height)))
            elif it[0] == 'c':
                p1, p2, p3, p4 = it[1], it[2], it[3], it[4]
                ch = math.hypot(p4.x - p1.x, p4.y - p1.y)
                if ch < 1e-6:
                    continue
                ml = math.hypot(p2.x - p1.x, p2.y - p1.y) + math.hypot(p3.x - p2.x, p3.y - p2.y) + math.hypot(p4.x - p3.x, p4.y - p3.y)
                if not (1.15 <= ml / ch <= 1.30):
                    continue
                rad = ch / math.sqrt(2)
                if not (0.55 <= rad * k / pxm <= 1.5):
                    continue
                q = pymupdf.Point(p1.x + (p2.x - p1.x) / K_BOGI, p1.y + (p2.y - p1.y) / K_BOGI)
                c = pymupdf.Point(p1.x + p4.x - q.x, p1.y + p4.y - q.y)
                kand.append(((c.x, c.y), rad, [p1, p4]))
        # heil brotalína í einni teikningu (≥ 5 bútar) → hringfelling
        ls = [it for it in its if it[0] == 'l']
        if len(ls) >= 5 and len(ls) == len(its):
            boginn([q for it in ls for q in ((it[1].x, it[1].y), (it[2].x, it[2].y))])
    if len(keda) >= 6:
        boginn([q for c_ in keda for q in c_])
    ut_ = []
    for (cx, cy), rad, ends in kand:
        blad = False
        for la, lb, L in leifar:
            if not (0.6 * rad <= L <= 1.25 * rad):
                continue
            for h_ in (la, lb):
                if math.hypot(h_.x - cx, h_.y - cy) <= 0.15 * rad:
                    blad = True
        a_, b_ = ends
        T = lambda x, y: (pymupdf.Point(x, y) * Rm)
        c2, a2, b2 = T(cx, cy), T(a_.x, a_.y), T(b_.x, b_.y)
        o = {'hjor': [round(c2.x * k, 1), round(c2.y * k, 1)], 'a': [round(a2.x * k, 1), round(a2.y * k, 1)], 'b': [round(b2.x * k, 1), round(b2.y * k, 1)],
             'breidd_m': round(rad * k / pxm, 2), 'blad': blad}
        o['x'] = round((o['hjor'][0] + o['a'][0]) / 2, 1); o['y'] = round((o['hjor'][1] + o['a'][1]) / 2, 1)
        o['x2'] = round((o['hjor'][0] + o['b'][0]) / 2, 1); o['y2'] = round((o['hjor'][1] + o['b'][1]) / 2, 1)
        if not any(abs(q['hjor'][0] - o['hjor'][0]) < 3 and abs(q['hjor'][1] - o['hjor'][1]) < 3 and abs(q['breidd_m'] - o['breidd_m']) < 0.08 for q in ut_):
            ut_.append(o)
    return ut_


ut = {}
for nafn, b in M['blod'].items():
    if b.get('tegund') != 'vigur':
        continue
    d = pymupdf.open(os.path.join(D, b['skra'])); pg = d[0]
    fl = [h for h in M['haedir'] if h['blad'] == nafn]
    if not fl:
        continue
    k = fl[0]['frum']['b'] / pg.rect.width; Rm = pg.rotation_matrix
    pxm = k * 72 / 25.4 * 10        # dílar á metra við 1:100 (aðaluppdrættir): rammi px/pt · pt/mm · 10 mm á metra
    ei_alls = ei_tokn(pg, k, Rm); hurdir_alls = hurdarop(pg, k, Rm, pxm)
    ords = []
    for w in pg.get_text('words'):
        if w[4] in TAK:
            r = pymupdf.Rect(w[:4]) * Rm
            o = {'t': w[4], 'x': round((r.x0 + r.x1) / 2 * k, 1), 'y': round((r.y0 + r.y1) / 2 * k, 1), 'w': round(r.width * k, 1), 'h': round(r.height * k, 1)}
            if w[4] == 'ÚT' and MINUT and max(o['w'], o['h']) < MINUT * k:   # smátt „ÚT“ í máltölum/hæðarkótum, ekki tákn (Grandi: BGR_UT_MIN=8) — sjálfgefið engin sía
                continue
            if not any(q['t'] == o['t'] and abs(q['x'] - o['x']) <= 12 and abs(q['y'] - o['y']) <= 12 for q in ords):   # texti yfirprentaður = sama tákn tvisvar
                ords.append(o)
    # allur textinn í lestrarröð (skýringar + byggingarlýsing)
    lines = [l[4].strip() for l in sorted(pg.get_text('blocks'), key=lambda t: (round(t[1] / 12), t[0])) if len(l) > 4 and l[4].strip()]
    open(os.path.join(D, 'texti_%s.txt' % nafn), 'w', encoding='utf-8').write('\n'.join(lines))
    # frambjóðendur per hæð (innan skurðar)
    haedir = {}
    for h in fl:
        sk = h.get('skurdur') or {'x': 0, 'y': 0, 'w': 99999, 'h': 99999}
        inn = [o for o in ords if sk['x'] <= o['x'] <= sk['x'] + sk['w'] and sk['y'] <= o['y'] <= sk['y'] + sk['h']]
        ei_inn = [o for o in ei_alls if sk['x'] <= o['x'] <= sk['x'] + sk['w'] and sk['y'] <= o['y'] <= sk['y'] + sk['h']]
        hu_inn = [o for o in hurdir_alls if sk['x'] <= o['hjor'][0] <= sk['x'] + sk['w'] and sk['y'] <= o['hjor'][1] <= sk['y'] + sk['h']]
        haedir[h['nafn']] = {'skurdur': sk, 'tel': {t: sum(1 for o in inn if o['t'] == t) for t in TAK if any(o['t'] == t for o in inn)}, 'frambjodendur': inn,
                             'ei': ei_inn, 'hurdir': hu_inn, 'pxm': round(pxm, 1)}
    ut[nafn] = {'ramma': fl[0]['frum'], 'ord_alls': {t: sum(1 for o in ords if o['t'] == t) for t in TAK if any(o['t'] == t for o in ords)}, 'haedir': haedir}
    # yfirlagsmynd per hæð (hálfur kvarði)
    pm = pg.get_pixmap(matrix=pymupdf.Matrix(k * 0.5, k * 0.5)); im = Image.frombytes('RGB', (pm.width, pm.height), pm.samples)
    for fi, h in enumerate(M['haedir'], 1):
        if h['blad'] != nafn:
            continue
        sk = h.get('skurdur') or {'x': 0, 'y': 0, 'w': h['frum']['b'], 'h': h['frum']['h']}
        c = im.crop((int(sk['x'] * .5), int(sk['y'] * .5), int((sk['x'] + sk['w']) * .5), int((sk['y'] + sk['h']) * .5))); dr = ImageDraw.Draw(c)
        for o in haedir[h['nafn']]['frambjodendur']:
            col = LIT.get(o['t']);
            if not col: continue
            x, y = o['x'] * .5 - sk['x'] * .5, o['y'] * .5 - sk['y'] * .5
            dr.ellipse([x - 9, y - 9, x + 9, y + 9], outline=col, width=2); dr.text((x + 10, y - 6), o['t'], fill=col)
        for o in haedir[h['nafn']]['ei']:
            x, y = o['x'] * .5 - sk['x'] * .5, o['y'] * .5 - sk['y'] * .5
            dr.rectangle([x - 14, y - 7, x + 14, y + 7], outline=LIT['EI'], width=2)
        for o in haedir[h['nafn']]['hurdir']:
            x, y = o['hjor'][0] * .5 - sk['x'] * .5, o['hjor'][1] * .5 - sk['y'] * .5
            rr = o['breidd_m'] * pxm * .5
            dr.ellipse([x - 3, y - 3, x + 3, y + 3], fill=LIT['hurd']); dr.arc([x - rr, y - rr, x + rr, y + rr], 0, 360, fill=LIT['hurd'], width=1)
        c.save(os.path.join(D, 'sann_vigur_h%d.png' % fi))
    print('blað', nafn, 'orð alls:', ut[nafn]['ord_alls'])
    for hn, v in haedir.items():
        print('   ', hn, v['tel'], '· EI-merki', len(v['ei']), '· hurðarop', len(v['hurdir']), '(með blaðlínu %d)' % sum(1 for o in v['hurdir'] if o['blad']))
json.dump(ut, open(os.path.join(D, 'vigur_tokn.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
if not ut:
    print('engin vigur-blöð (textalag) — öll blöð eru skannanir: lestu nærmyndirnar')
