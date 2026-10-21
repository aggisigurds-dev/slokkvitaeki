# -*- coding: utf-8 -*-
# 3D-mynd af búnaðargreiningu einnar hæðar: vistaða 3D-vinnumyndin (Blender, án tækja) + hvert atriði greiningarinnar varpað inn
# með SÖMU vörpun og appið (445 varpa: rammahnit → heimur → cam → mynd), sem upprétt „prik" með tákni á toppnum.
# node/py: python teikna3d.py <hæð: 1|2> <úttak.png>
import json, math, sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
Image.MAX_IMAGE_PIXELS = None
sys.stdout.reconfigure(encoding='utf-8')
HER = os.path.dirname(os.path.abspath(__file__))
HAED = int(sys.argv[1]) if len(sys.argv) > 1 else 1
UT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HER, 'skutuvogur_%d_haed_3d.png' % HAED)
G = json.load(open(os.path.join(HER, 'greining661.json'), encoding='utf-8'))
BORD = json.load(open(os.path.join(HER, 'bord661.json'), encoding='utf-8'))
SKRA = json.load(open(os.path.join(HER, 'skra.json')))       # bk1 → b1 (aðeins hæð 1; Voltorka-blaðið)
bh = [h for h in BORD if h['nafn'].startswith('%d.' % HAED)][0]
vm = bh['vm']; k = vm['kort']; e = vm['cam']
IM = Image.open(os.path.join(HER, 'vm%d.jpg' % HAED)).convert('RGB')
print('mynd', IM.size, 'veggH', vm['veggH'])

def varpa(u, v, y=0.0):
    """rammahnit borðsins (dílar frummyndar) + hæð y (heimseiningar) → díll á vinnumyndinni"""
    wx = (u - k['sx']) * k['f'] - k['gw'] / 2; wz = (v - k['sy']) * k['f'] - k['gh'] / 2
    cx = e[0] * wx + e[4] * y + e[8] * wz + e[12]; cy = e[1] * wx + e[5] * y + e[9] * wz + e[13]; cw = e[3] * wx + e[7] * y + e[11] * wz + e[15]
    return ((cx / cw + 1) / 2 * vm['heild'][0] - vm['rammi'][0], (1 - cy / cw) / 2 * vm['heild'][1] - vm['rammi'][1])

# 2025-blað (b1/b2) → ramma borðsins: x = 1.5374·bx − 62.5, y = 1.5378·by − 42.6 (aðhvarf á atriðum sem eiga bæði hnitin, mestu frávik 1 díll)
def ur_b(bx, by): return 1.5374 * bx - 62.5, 1.5378 * by - 42.6
def ur_bk(bx, by):
    x1 = SKRA['k'] * bx + SKRA['ox']; y1 = SKRA['k'] * by + SKRA['oy']
    return ur_b(x1, y1)

nafn = '%d. hæð' % HAED
items = []
for t in G['tki']:
    if t.get('haed') != nafn: continue
    if t.get('x') is not None and t.get('y') is not None: u, v = t['x'], t['y']
    elif t.get('blad') == 'bk1' and HAED == 1: u, v = ur_bk(t['bx'], t['by'])
    elif t.get('blad') in ('b1', 'b2') and t.get('bx') is not None: u, v = ur_b(t['bx'], t['by'])
    else: continue
    b = t.get('bunadur', '')
    kind = 'ut' if t.get('flokkur') == 'flotti' else 'bs' if ('löng' in b.lower() or 'kefli' in b.lower()) else 'sl' if t.get('flokkur') is None else 'r' if 'Reyk' in b else 'hiti' if 'Hita' in b else 'hb' if 'handb' in b.lower() else 'st'
    items.append(dict(kind=kind, u=u, v=v, id=t.get('audkenni', ''), stadur=t.get('stadur', '')))
from collections import Counter
print(HAED, '. hæð atriði:', dict(Counter(i['kind'] for i in items)))

SS = 2                                         # yfirsýnataka (kantar án tanna)
W, Hh = IM.size
base = IM.resize((W * SS, Hh * SS), Image.LANCZOS).convert('RGBA')
sk = Image.new('RGBA', base.size, (0, 0, 0, 0)); sd = ImageDraw.Draw(sk)           # skuggar
lay = Image.new('RGBA', base.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)           # prik + tákn
M = vm['veggH'] / 3.0                          # 1 m í heimseiningum (vegghæð = 3 m)
FONT = lambda n, s: ImageFont.truetype('C:/Windows/Fonts/%s' % n, int(s * SS))
f_l = FONT("arialbd.ttf", 13)
LIT = {'sl': (225, 29, 46), 'bs': (37, 99, 235), 'ut': (21, 128, 61), 'r': (147, 51, 234), 'hb': (234, 88, 12), 'hiti': (245, 158, 11), 'st': (109, 40, 217)}
HAED_M = {'sl': 1.45, 'bs': 1.3, 'ut': 2.35, 'r': 2.9, 'hb': 1.4, 'hiti': 2.9, 'st': 1.5}   # festingarhæð tákns (m)
STAERD = 1.5
# fjærst fyrst (hærra á mynd = lengra í burtu)
for it in sorted(items, key=lambda i: varpa(i['u'], i['v'])[1]):
    x0, y0 = varpa(it['u'], it['v'], 0); x1, y1 = varpa(it['u'], it['v'], HAED_M[it['kind']] * M)
    X0, Y0, X1, Y1 = x0 * SS, y0 * SS, x1 * SS, y1 * SS
    c = LIT[it['kind']]
    sd.ellipse([X0 - 9 * SS, Y0 - 4 * SS, X0 + 9 * SS, Y0 + 4 * SS], fill=(0, 0, 0, 90))              # skuggi á gólfi
    d.line([(X0, Y0), (X1, Y1)], fill=(70, 70, 76, 230), width=int(1.6 * SS))                          # prik
    s = SS * STAERD
    kd = it['kind']
    if kd == 'sl':      # slökkvitæki: rauður hólkur + handfang
        d.rounded_rectangle([X1 - 6 * s, Y1 - 15 * s, X1 + 6 * s, Y1 + 3 * s], radius=4 * s, fill=c + (255,), outline=(255, 255, 255, 255), width=int(1.6 * s))
        d.rectangle([X1 - 3 * s, Y1 - 19 * s, X1 + 3 * s, Y1 - 15 * s], fill=(40, 40, 44, 255))
    elif kd == 'bs':    # brunaslanga: blár hringur með öðrum hring (kefli)
        d.ellipse([X1 - 10 * s, Y1 - 10 * s, X1 + 10 * s, Y1 + 10 * s], fill=c + (255,), outline=(255, 255, 255, 255), width=int(1.8 * s))
        d.ellipse([X1 - 5 * s, Y1 - 5 * s, X1 + 5 * s, Y1 + 5 * s], fill=(235, 240, 255, 255))
    elif kd == 'ut':    # útljós: grænt skilti með hvítu ÚT
        d.rounded_rectangle([X1 - 11 * s, Y1 - 7 * s, X1 + 11 * s, Y1 + 7 * s], radius=2.5 * s, fill=c + (255,), outline=(255, 255, 255, 255), width=int(1.4 * s))
        d.text((X1, Y1), 'ÚT', font=FONT('arialbd.ttf', 9), fill=(255, 255, 255, 255), anchor='mm')
    elif kd == 'hb':    # handboði: appelsínugulur ferningur
        d.rectangle([X1 - 6 * s, Y1 - 6 * s, X1 + 6 * s, Y1 + 6 * s], fill=c + (255,), outline=(255, 255, 255, 255), width=int(1.4 * s))
    elif kd in ('r', 'hiti'):   # skynjari: lítill diskur
        d.ellipse([X1 - 5.5 * s, Y1 - 5.5 * s, X1 + 5.5 * s, Y1 + 5.5 * s], fill=c + (255,), outline=(255, 255, 255, 255), width=int(1.4 * s))
    else:               # stjórnstöð / útstöð: tígull
        d.polygon([(X1, Y1 - 10 * s), (X1 + 10 * s, Y1), (X1, Y1 + 10 * s), (X1 - 10 * s, Y1)], fill=c + (255,), outline=(255, 255, 255, 255))
    if kd in ('sl', 'bs') and it['id']:
        d.text((X1 + 11 * s, Y1 - 4 * s), it['id'], font=f_l, fill=(255, 255, 255, 255), stroke_width=int(2.2 * s), stroke_fill=(30, 30, 34, 255), anchor='lm')
sk = sk.filter(ImageFilter.GaussianBlur(2.5 * SS))
out = Image.alpha_composite(Image.alpha_composite(base, sk), lay).resize((W, Hh), Image.LANCZOS).convert('RGB')

# haus + skýringar
TOP = 150
canvas = Image.new('RGB', (W, Hh + TOP), (28, 31, 36)); canvas.paste(out, (0, TOP))
dr = ImageDraw.Draw(canvas)
dr.text((46, 34), 'Skútuvogur 4 — %s' % nafn, font=ImageFont.truetype('C:/Windows/Fonts/georgiab.ttf', 44), fill=(244, 238, 226))
dr.text((48, 94), 'Búnaðargreining í 3D · aðaluppdráttur 09.12.2025 og brunakerfi Voltorku 2020 · tillaga — staðfest á staðnum', font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22), fill=(176, 170, 160))
tel = Counter(i['kind'] for i in items)
LEG = [('sl', 'Slökkvitæki'), ('bs', 'Slöngukefli'), ('ut', 'ÚT-ljós'), ('r', 'Reykskynjarar'), ('hb', 'Handboðar'), ('hiti', 'Hitaskynjari'), ('st', 'Stjórnstöð / útstöð')]
x = W - 40
for kd, tx in reversed(LEG):
    if not tel.get(kd): continue
    lab = '%d %s' % (tel[kd], tx); fnt = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 21); w = dr.textlength(lab, font=fnt)
    x -= w; dr.text((x, 40), lab, font=fnt, fill=(244, 238, 226)); x -= 30
    dr.ellipse([x, 43, x + 20, 63], fill=LIT[kd], outline=(255, 255, 255)); x -= 26
canvas.save(UT, quality=95); print('vistað', UT, canvas.size)
