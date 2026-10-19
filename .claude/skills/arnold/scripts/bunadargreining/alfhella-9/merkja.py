# -*- coding: utf-8 -*-
"""Álfhella 9: búnaður af teikningum í 6000-díla ramma blaðsins (sama og Teikning/pdf.js) + merktar myndir til útprentunar."""
import json, pymupdf, cv2, numpy as np

K01 = 6696 / 2000          # skjáskölun yfirlitsmyndar → 200-dpi mynd
ORG = {'h1v': (180, 780), 'h1h': (560, 780), 'h2v': (180, 130)}
def m01(reitur, x, y):
    ox, oy = ORG[reitur]
    return (ox * K01 + x, oy * K01 + y)          # í 200-dpi díla (6696 breitt)

# (auðkenni, tegund, hæð, staður, (x, y) í 200-dpi dílum)
MHL01 = [
    ('S1', 'Slökkvitæki', '1. hæð', 'Kaffistofa (0103), við flóttahurð', m01('h1v', 683, 436)),
    ('S2', 'Slökkvitæki', '1. hæð', 'Við ræstingu (inntök), ofan við brunaslöngu BS1', m01('h1v', 657, 1102)),
    ('BS1', 'Brunaslanga', '1. hæð', 'Í ræstingu (inntök), við útgang', m01('h1v', 652, 1222)),
    ('S3', 'Slökkvitæki', '1. hæð', 'Atvinnu-/iðnaðarhúsnæði (0101), við útgang, undir stjórnstöð BV', m01('h1v', 495, 1248)),
    ('BV', 'Brunaviðvörunarkerfi', '1. hæð', 'Stjórnstöð brunaviðvörunarkerfis, í 0101 við útgang', m01('h1v', 487, 1137)),
    ('S4', 'Slökkvitæki', '1. hæð', 'Lager/geymsla (0102), gafl við útgang — ofan við dyr, við BS2', m01('h1h', 1851, 456)),
    ('BS2', 'Brunaslanga', '1. hæð', 'Lager/geymsla (0102), gafl ofan við útgang', m01('h1h', 1855, 497)),
    ('S5', 'Slökkvitæki', '1. hæð', 'Lager/geymsla (0102), gafl — neðan við útgang', m01('h1h', 1851, 882)),
    ('S6', 'Slökkvitæki', '2. hæð', 'Milliloft, við dyr geymslu 0105 á stigapalli', m01('h2v', 690, 425)),
    ('S7', 'Slökkvitæki', '2. hæð', 'Milliloft, við stiga og útgang (REI60-veggur við 0104)', m01('h2v', 500, 603)),
]
MHL02 = [   # (auðkenni, …, (x, y) í pt á síðu 1)
    ('SLT1', 'Slökkvitæki', 'Mhl. 02', 'Gafl við útgang milli smiðju og verkstæðis/geymslu', (558, 780)),
    ('SLT2', 'Slökkvitæki', 'Mhl. 02', 'Gafl við útgang úr þvottarými', (558, 1047)),
    ('SLT3', 'Slökkvitæki', 'Mhl. 02', 'Verkstæði/geymsla, við útgang (hinum megin)', (167, 994)),
    ('SLT4', 'Slökkvitæki', 'Mhl. 02', 'Smiðja, horn við útgang', (189, 477)),
]

d1 = pymupdf.open('B20200527_Alfhella_9_002.pdf')[0]; r1 = d1.rect
d2 = pymupdf.open('mhl02.pdf')[0]; r2 = d2.rect
k1 = 6000 / max(r1.width, r1.height); k2 = 6000 / max(r2.width, r2.height)
frum1 = {'b': round(r1.width * k1), 'h': round(r1.height * k1)}
frum2 = {'b': round(r2.width * k2), 'h': round(r2.height * k2)}
im01 = cv2.imread('mhl01_grunn.png')
s01 = 6000 / im01.shape[1]
ut = {'frum01': frum1, 'frum02': frum2, 'tki': []}
for (i, t, h, st, (x, y)) in MHL01:
    ut['tki'].append({'id': i, 'tegund': t, 'haed': h, 'stadur': st, 'x': round(x * s01), 'y': round(y * s01), 'blad': 'mhl01'})
for (i, t, h, st, (x, y)) in MHL02:
    ut['tki'].append({'id': i, 'tegund': t, 'haed': h, 'stadur': st, 'x': round(x * k2), 'y': round(y * k2), 'blad': 'mhl02'})
json.dump(ut, open('bunadur.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

LIT = {'Slökkvitæki': (30, 30, 210), 'Brunaslanga': (200, 90, 20), 'Brunaviðvörunarkerfi': (140, 30, 140)}
def merkt(im, punktar, skurdur, ut_skra, kv):
    m = im.copy()
    for p in punktar:
        x, y = int(p['x'] * kv), int(p['y'] * kv)
        lit = LIT.get(p['tegund'], (0, 0, 0))
        cv2.circle(m, (x, y), int(45 * kv / 1.1), lit, max(4, int(7 * kv)))
        cv2.putText(m, p['id'], (x + int(52 * kv), y + int(14 * kv)), cv2.FONT_HERSHEY_SIMPLEX, 1.5 * kv, lit, max(3, int(5 * kv)))
    x, y, w, h = [int(v * kv) for v in skurdur]
    cv2.imwrite(ut_skra, m[y:y + h, x:x + w])

# 6000-ramminn: mhl01 = 200-dpi mynd × s01; teiknum á 200-dpi myndina (kv = 1/s01 í ramma → díla)
SK = {'h1': (540, 2290, 2960, 1270), 'h2': (540, 330, 2960, 1280), 'm2': (270, 820, 1300, 2440)}
merkt(im01, [p for p in ut['tki'] if p['blad'] == 'mhl01' and p['haed'] == '1. hæð'], SK['h1'], 'merkt_h1.png', 1 / s01)
merkt(im01, [p for p in ut['tki'] if p['blad'] == 'mhl01' and p['haed'] == '2. hæð'], SK['h2'], 'merkt_h2.png', 1 / s01)
pix = d2.get_pixmap(matrix=pymupdf.Matrix(k2, k2)); pix.save('mhl02_6000.png')
im02 = cv2.imread('mhl02_6000.png')
merkt(im02, [p for p in ut['tki'] if p['blad'] == 'mhl02'], SK['m2'], 'merkt_m2.png', 1.0)
json.dump({'skurdir': SK, **{k: v for k, v in ut.items() if k != 'tki'}}, open('skurdir.json', 'w'))
print(frum1, frum2, len(ut['tki']), 'atriði')
