# -*- coding: utf-8 -*-
# vigur.py <vinnumappa> — vigur-PDF (textalag): tákn + allur textinn (skýringar, byggingarlýsing) → vigur_tokn.json + texti_<blað>.txt.
# FRAMBJÓÐENDUR, ekki lokaniðurstaða: legend blaðsins ræður hvað SL/BS/R þýðir (Suðurhella: [S] = slökkvitæki en segulloki á Trönuhrauni) —
# lestu texti_*.txt og yfirlagið sann_vigur_h*.png áður en þú notar tölurnar. Hnit eru rammahnit (sömu og nærmyndirnar).
import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')   # Windows: stdout er cp1252 sjálfgefið (→ og íslenskir stafir hrynja)
import pymupdf
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
D = sys.argv[1]
MINUT = float(os.environ.get('BGR_UT_MIN', '0') or 0)
M = json.load(open(os.path.join(D, 'manifest.json'), encoding='utf-8'))
TAK = ('SL', 'SLT', 'HSL', 'HST', 'BS', 'BSL', 'BRSL', 'R', 'ÚT', 'UT', 'BO', 'NF', 'LR', '!', '20m')
LIT = {'SL': (220, 30, 30), 'SLT': (220, 30, 30), 'HSL': (220, 30, 30), 'HST': (220, 30, 30), 'BS': (20, 80, 220), 'BRSL': (20, 80, 220), '20m': (20, 80, 220), 'R': (150, 0, 200), 'ÚT': (0, 150, 60), 'UT': (0, 150, 60), 'BO': (240, 130, 0), '!': (150, 0, 200)}
ut = {}
for nafn, b in M['blod'].items():
    if b.get('tegund') != 'vigur':
        continue
    d = pymupdf.open(os.path.join(D, b['skra'])); pg = d[0]
    fl = [h for h in M['haedir'] if h['blad'] == nafn]
    if not fl:
        continue
    k = fl[0]['frum']['b'] / pg.rect.width; Rm = pg.rotation_matrix
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
        haedir[h['nafn']] = {'skurdur': sk, 'tel': {t: sum(1 for o in inn if o['t'] == t) for t in TAK if any(o['t'] == t for o in inn)}, 'frambjodendur': inn}
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
        c.save(os.path.join(D, 'sann_vigur_h%d.png' % fi))
    print('blað', nafn, 'orð alls:', ut[nafn]['ord_alls'])
    for hn, v in haedir.items():
        print('   ', hn, v['tel'])
json.dump(ut, open(os.path.join(D, 'vigur_tokn.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
if not ut:
    print('engin vigur-blöð (textalag) — öll blöð eru skannanir: lestu nærmyndirnar')
