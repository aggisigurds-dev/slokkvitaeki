# -*- coding: utf-8 -*-
# yfirlag.py <vinnumappa> — lestur.json → sann_h<N>_<k>.png: nærmyndirnar með hring og merki um HVERT lesið atriði.
# SANNREYNSLAN: skoðaðu hverja mynd — hver hringur á að vera á tákni, og ekkert tákn má vera án hrings. Leiðréttu lestur.json og keyrðu aftur.
import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')   # Windows: stdout er cp1252 sjálfgefið (→ og íslenskir stafir hrynja)
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
D = sys.argv[1]
L = json.load(open(os.path.join(D, 'lestur.json'), encoding='utf-8'))
K = json.load(open(os.path.join(D, 'kort.json'), encoding='utf-8'))
LIT = {'sl': (220, 30, 30), 'bs': (20, 80, 220), 'ut': (0, 150, 60), 'r': (150, 0, 200), 'hiti': (230, 100, 0), 'hb': (110, 0, 170), 'st': (110, 0, 170)}
ELD = {'sl': 'S', 'bs': 'BS', 'ut': 'UT', 'r': 'R', 'hiti': 'H', 'hb': 'HB', 'st': 'ST'}
alls = {}
for t in K:
    im = Image.open(os.path.join(D, t['file'])).convert('RGB'); dr = ImageDraw.Draw(im); n = 0
    for it in L['items']:
        if it['haed'] != t['haed'] and it['haed'] != t['id']:
            continue
        if not (t['x0'] <= it['x'] <= t['x1'] and t['y0'] <= it['y'] <= t['y1']):
            continue
        x, y = (it['x'] - t['x0']) * t['sx'], (it['y'] - t['y0']) * t['sx']; col = LIT.get(it['kind'], (0, 0, 0)); r = 24 if it['kind'] in ('sl', 'bs') else 18
        dr.ellipse([x - r, y - r, x + r, y + r], outline=col, width=4); dr.text((x + r + 3, y - 6), ELD.get(it['kind'], '?'), fill=col); n += 1
    im.save(os.path.join(D, 'sann_' + t['file'])); alls[t['haed']] = alls.get(t['haed'], 0) + n
print('yfirlag búin; atriði á hæð (hver hringur telst einu sinni, atriði á skörun tvisvar):', alls)
