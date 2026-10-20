# -*- coding: utf-8 -*-
# crops.py <vinnumappa> — blöðin (JPEG/PDF) úr manifest.json → flokkuð (vigur/skönnun) + GRIDDED NÆRMYNDIR af hverri hæð.
# Rammahnit = dílar blaðsins eins og Teikning geymir þau (frum.b × frum.h, 6006 á lengri hlið); gridlínur á 200 díla fresti með
# hnitum í rammanum, svo það sem þú lest af mynd er beint nothæft í lestur.json (x, y). Skrifar h<N>_<k>.png, h<N>_yfirlit.png, kort.json.
import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')   # Windows: stdout er cp1252 sjálfgefið (→ og íslenskir stafir hrynja)
import pymupdf
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
D = sys.argv[1]
M = json.load(open(os.path.join(D, 'manifest.json'), encoding='utf-8'))
TW, TH, OV, GRID = 1300, 1700, 60, 200

def mynd_blads(nafn, b, frum):
    """Skilar (PIL-mynd í ramma-dílum, tegund, fjöldi orða í textalagi)"""
    p = os.path.join(D, b['skra'])
    if b['pdf']:
        d = pymupdf.open(p); pg = d[0]
        orð = len(pg.get_text('words'))
        k = frum['b'] / pg.rect.width
        pm = pg.get_pixmap(matrix=pymupdf.Matrix(k, k))
        im = Image.frombytes('RGB', (pm.width, pm.height), pm.samples)
        return im, ('vigur' if orð >= 60 else 'skonnun-pdf'), orð
    im = Image.open(p).convert('RGB')
    return im, 'skonnun', 0

myndir = {}
for h in M['haedir']:
    b = M['blod'][h['blad']]
    if h['blad'] not in myndir:
        im, teg, orð = mynd_blads(h['blad'], b, h['frum'])
        myndir[h['blad']] = im; b['tegund'] = teg; b['ord_i_textalagi'] = orð; b['stærð'] = list(im.size)
        if b['pdf']:
            im.save(os.path.join(D, h['blad'] + '_render.jpg'), quality=90); b['render'] = h['blad'] + '_render.jpg'

kort = []
for fi, h in enumerate(M['haedir'], 1):
    im = myndir[h['blad']]
    sx = im.width / float(h['frum']['b'])   # mynd ↔ rammi (≈1)
    sk = h.get('skurdur') or {'x': 0, 'y': 0, 'w': h['frum']['b'], 'h': h['frum']['h']}
    X0, Y0, W, Hh = int(sk['x']), int(sk['y']), int(sk['w']), int(sk['h'])
    # yfirlit
    c = im.crop((int(X0 * sx), int(Y0 * sx), int((X0 + W) * sx), int((Y0 + Hh) * sx)))
    k = min(1.0, 1500.0 / max(c.width, c.height)); ov = c.resize((max(1, int(c.width * k)), max(1, int(c.height * k))), Image.LANCZOS); d = ImageDraw.Draw(ov)
    for gx in range((X0 // 500 + 1) * 500, X0 + W, 500):
        xx = (gx - X0) * sx * k; d.line([(xx, 0), (xx, ov.height)], fill=(255, 120, 0), width=1); d.text((xx + 2, 2), str(gx), fill=(220, 0, 0))
    for gy in range((Y0 // 500 + 1) * 500, Y0 + Hh, 500):
        yy = (gy - Y0) * sx * k; d.line([(0, yy), (ov.width, yy)], fill=(255, 120, 0), width=1); d.text((2, yy + 2), str(gy), fill=(220, 0, 0))
    ov.save(os.path.join(D, 'h%d_yfirlit.png' % fi))
    # nærmyndir
    nx = max(1, -(-(W - OV) // (TW - OV))) if W > TW else 1
    ny = max(1, -(-(Hh - OV) // (TH - OV))) if Hh > TH else 1
    tw = -(-(W + (nx - 1) * OV) // nx); th = -(-(Hh + (ny - 1) * OV) // ny)
    t = 0
    for j in range(ny):
        for i in range(nx):
            x0 = X0 + i * (tw - OV); y0 = Y0 + j * (th - OV); x1 = min(X0 + W, x0 + tw); y1 = min(Y0 + Hh, y0 + th)
            cr = im.crop((int(x0 * sx), int(y0 * sx), int(x1 * sx), int(y1 * sx))); dr = ImageDraw.Draw(cr)
            for gx in range((x0 // GRID + 1) * GRID, x1, GRID):
                xx = (gx - x0) * sx; dr.line([(xx, 0), (xx, cr.height)], fill=(255, 120, 0), width=1); dr.text((xx + 2, 2), str(gx), fill=(220, 0, 0))
            for gy in range((y0 // GRID + 1) * GRID, y1, GRID):
                yy = (gy - y0) * sx; dr.line([(0, yy), (cr.width, yy)], fill=(255, 120, 0), width=1); dr.text((2, yy + 2), str(gy), fill=(220, 0, 0))
            t += 1; fn = 'h%d_%d.png' % (fi, t); cr.save(os.path.join(D, fn))
            kort.append({'file': fn, 'haed': h['nafn'], 'id': h['id'], 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'sx': sx})
    print('hæð', fi, h['nafn'], h['blad'], '→ yfirlit +', t, 'nærmynd(ir)', '(skurður', W, 'x', Hh, ')')

json.dump(kort, open(os.path.join(D, 'kort.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(M, open(os.path.join(D, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for n, b in M['blod'].items():
    print('blað', n, b.get('tegund'), b.get('stærð'), 'orð í textalagi:', b.get('ord_i_textalagi'))
