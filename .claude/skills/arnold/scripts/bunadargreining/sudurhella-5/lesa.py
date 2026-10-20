# -*- coding: utf-8 -*-
# Suðurhella 5 (2025 aðaluppdráttur, vigur): sækir tákn úr textalagi, teiknar yfirlag á síðu 1 og 2 til að sannreyna
import pymupdf, json, sys, os
from PIL import Image, ImageDraw, ImageFont
HER = os.path.dirname(os.path.abspath(__file__))
PDF = os.path.join(HER, 'pdf', 'innsiglad2025.pdf')
S = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
TAK = ('SL', 'BS', 'R', 'ÚT', 'BO', '20m', 'NF', 'LR', 'rv', 'VS')
d = pymupdf.open(PDF)
ut = {}
for i in (0, 1):
    p = d[i]
    M = p.rotation_matrix
    pm = p.get_pixmap(matrix=pymupdf.Matrix(S, S))
    img = Image.frombytes('RGB', (pm.width, pm.height), pm.samples)
    dr = ImageDraw.Draw(img)
    ords = []
    for w in p.get_text('words'):
        if w[4] in TAK:
            r = pymupdf.Rect(w[:4]) * M
            ords.append({'t': w[4], 'x': round((r.x0 + r.x1) / 2, 1), 'y': round((r.y0 + r.y1) / 2, 1), 'w': round(r.width, 1), 'h': round(r.height, 1)})
    ut['h%d' % (i + 1)] = {'b': p.rect.width, 'h': p.rect.height, 'orð': ords}
    lit = {'SL': (220, 30, 30), 'BS': (20, 80, 220), '20m': (20, 80, 220), 'R': (150, 0, 200), 'ÚT': (0, 150, 60), 'BO': (240, 130, 0)}
    for o in ords:
        c = lit.get(o['t'])
        if not c: continue
        x, y = o['x'] * S, o['y'] * S
        dr.ellipse([x - 14, y - 14, x + 14, y + 14], outline=c, width=3)
        dr.text((x + 16, y - 8), o['t'], fill=c)
    img.save(os.path.join(HER, 'sann_h%d.png' % (i + 1)))
    print('h%d' % (i + 1), pm.width, pm.height, {t: sum(1 for o in ords if o['t'] == t) for t in TAK})
json.dump(ut, open(os.path.join(HER, 'tokn.json'), 'w', encoding='utf-8'), ensure_ascii=False)
