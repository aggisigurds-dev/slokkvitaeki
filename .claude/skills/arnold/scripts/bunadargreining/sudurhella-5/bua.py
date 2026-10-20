# -*- coding: utf-8 -*-
# Suðurhella 5 (15 023, útgáfa F/E, samþykkt 17.09.2025): Búnaðargreining úr textalagi vigur-PDF.
# Les tákn (SL = Handslökkvitæki, BS = Brunaslanga 20 m, R = Reykskynjari, ÚT, BO = Björgunarop), setur þau á rými
# og teiknar merktar myndir af báðum hæðum. Úttak: items.json (hnit í 6000-ramma Teikningar) + merkt PNG.
import pymupdf, json, os, sys
from PIL import Image, ImageDraw, ImageFont
HER = os.path.dirname(os.path.abspath(__file__))
PDF = os.path.join(HER, 'pdf', 'innsiglad2025.pdf')
UT = os.path.join(HER, 'ut'); os.makedirs(UT, exist_ok=True)
S = 2.2                      # teikni-kvarði myndar
KV = 6000 / 2384.0           # ramma-kvarði Teikningar (lengri hlið 6000)
d = pymupdf.open(PDF)
LEGEND_X = 2040              # skýringar/titilreitur hægra megin (síðu-px, kvarði 1)

# rými (bil) — x-mörk í síðu-px (kvarði 1)
BIL1 = [(443, 682, '0101'), (682, 920, '0102'), (920, 1159, '0103'), (1159, 1397, '0104'), (1397, 1636, '0105'), (1636, 1874, '0106')]
BIL2 = [(312, 546, '0107'), (546, 778, '0108'), (778, 1011, '0109'), (1011, 1243, '0110'), (1243, 1476, '0111'), (1476, 1708, '0112')]
HEITI = {'0101': 'Geymsla 152,6 m²', '0102': 'Geymsla 152,6 m²', '0103': 'Geymsla 152,6 m²', '0104': 'Geymsla 152,6 m²',
         '0105': 'Geymsla 103,7 m² (+ geymsla 45,2 m²)', '0106': 'Geymsla 152,6 m²',
         '0107': 'Geymsla 50,3 m² (milliloft)', '0108': 'Opið geymsluloft 50,3 m²', '0109': 'Geymsla 50,3 m² (milliloft)',
         '0110': 'Geymsla 25,4 m² + smávörulager', '0111': 'Smávörulager/Bað (milliloft)', '0112': 'Geymsla 49,7 m² (milliloft)'}
def bil(x, tafla):
    for a, b, n in tafla:
        if a <= x < b: return n
    return '?'

def lesa(i):
    p = d[i]; M = p.rotation_matrix; out = []
    for w in p.get_text('words'):
        r = pymupdf.Rect(w[:4]) * M
        out.append((w[4], (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2))
    return p, out

items = []
def add(h, flokkur, t, x, y, bilnr, stadur, **kw):
    it = {'haed': h, 'flokkur': flokkur, 'tegund': t, 'x': round(x, 1), 'y': round(y, 1), 'rymi': bilnr, 'stadur': stadur}
    it.update(kw); items.append(it)

# ---------- 1. hæð ----------
p1, W1 = lesa(0)
plan = [(t, x, y) for t, x, y in W1 if x < LEGEND_X and 230 < y < 960]       # aðeins grunnmyndin
SL1 = sorted([(x, y) for t, x, y in plan if t == 'SL'])
BS1 = sorted([(x, y) for t, x, y in plan if t == 'BS'])
R1 = sorted([(x, y) for t, x, y in plan if t == 'R'])
UT1 = sorted([(x, y) for t, x, y in plan if t == 'ÚT'])
MID = 600     # y-mörk: neðan = framhlið (inngangar/BS), ofan = bakhlið (stigar/snyrting)
for x, y in SL1:
    b = bil(x, BIL1); fram = y > MID
    add(1, 'slokkvitaeki', 'Handslökkvitæki', x, y, b, ('framhlið' if fram else 'bakhlið') + (', við flóttahurð' ))
for x, y in BS1:
    b = bil(x, BIL1); add(1, 'slanga', 'Brunaslanga 20 m', x, y, b, 'framhlið, við flóttahurð')
for x, y in R1:
    b = bil(x, BIL1); add(1, 'brunakerfi', 'Reykskynjari', x, y, b, 'í rými')
for x, y in UT1:
    b = bil(x, BIL1)
    add(1, 'flotti', 'Útgangur (ÚT)', x, y, b, 'framhlið' if y > MID else 'bakhlið')

# ---------- 2. hæð ----------
p2, W2 = lesa(1)
plan2 = [(t, x, y) for t, x, y in W2 if x < LEGEND_X and 200 < y < 700]
SL2 = sorted([(x, y) for t, x, y in plan2 if t == 'SL'])
R2 = sorted([(x, y) for t, x, y in plan2 if t == 'R'])
BO2 = sorted([(x, y) for t, x, y in plan2 if t == 'BO'])
for x, y in SL2:
    add(2, 'slokkvitaeki', 'Handslökkvitæki', x, y, bil(x, BIL2), 'við stiga niður, á millilofti')
for x, y in R2:
    add(2, 'brunakerfi', 'Reykskynjari', x, y, bil(x, BIL2), 'á millilofti')
# Björgunarop (BO) ekki talin með — Agnar 20.10.2026: „björgunarop þarf reyndar ekki að vera þarna“

# ---------- auðkenni ----------
n = {'slokkvitaeki': 0, 'slanga': 0, 'brunakerfi': 0, 'flotti': 0, 'bjorgun': 0}
pre = {'slokkvitaeki': 'S', 'slanga': 'B', 'brunakerfi': 'R', 'flotti': 'ÚT', 'bjorgun': 'BO'}
for it in sorted(items, key=lambda z: (z['haed'], z['flokkur'], z['rymi'], -z['y'])):
    n[it['flokkur']] += 1; it['audkenni'] = pre[it['flokkur']] + str(n[it['flokkur']])
    it['bx'] = round(it['x'] * KV, 1); it['by'] = round(it['y'] * KV, 1)     # 6000-rammi Teikningar
json.dump({'items': items, 'ramma': {'b': 6000, 'h': round(1684 * KV)}, 'kv': KV}, open(os.path.join(HER, 'items.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
tel = lambda h, f: sum(1 for i in items if i['haed'] == h and i['flokkur'] == f)
print('1. hæð: SL', tel(1, 'slokkvitaeki'), 'BS', tel(1, 'slanga'), 'R', tel(1, 'brunakerfi'), 'ÚT', tel(1, 'flotti'))
print('2. hæð: SL', tel(2, 'slokkvitaeki'), 'R', tel(2, 'brunakerfi'), 'BO', tel(2, 'bjorgun'))

# ---------- myndir ----------
def font(sz):
    for f in ('C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/arial.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()
F1, F2, FL = font(30), font(17), font(34)
LIT = {'slokkvitaeki': (214, 40, 40), 'slanga': (20, 90, 220), 'brunakerfi': (140, 40, 190), 'flotti': (20, 150, 70), 'bjorgun': (240, 130, 0)}
def teikna(h, p, crop, fn, titill):
    pm = p.get_pixmap(matrix=pymupdf.Matrix(S, S))
    img = Image.frombytes('RGB', (pm.width, pm.height), pm.samples).convert('RGB')
    dr = ImageDraw.Draw(img)
    its = [i for i in items if i['haed'] == h]
    placed = []
    for it in sorted(its, key=lambda z: {'brunakerfi': 0, 'flotti': 1, 'bjorgun': 2, 'slanga': 3, 'slokkvitaeki': 4}[z['flokkur']]):
        x, y = it['x'] * S, it['y'] * S
        # forðast að merki liggi ofan á öðru (BS/SL/ÚT eru þétt)
        for _ in range(12):
            if all((x - a) ** 2 + (y - b) ** 2 > 40 ** 2 for a, b in placed): break
            x += 14; y += 10
        placed.append((x, y))
        c = LIT[it['flokkur']]; rr = 21 if it['flokkur'] in ('brunakerfi', 'flotti', 'bjorgun') else 24
        if (x, y) != (it['x'] * S, it['y'] * S): dr.line([(it['x'] * S, it['y'] * S), (x, y)], fill=c, width=3)
        dr.ellipse([x - rr, y - rr, x + rr, y + rr], fill=c, outline=(255, 255, 255), width=3)
        tx = it['audkenni']; f = F1 if rr == 24 else F2
        w = dr.textlength(tx, font=f); dr.text((x - w / 2, y - (15 if rr == 24 else 10)), tx, fill=(255, 255, 255), font=f)
    x0, y0, x1, y1 = [int(v * S) for v in crop]
    im = img.crop((x0, y0, x1, y1))
    # haus + skýringar
    H = 150; out = Image.new('RGB', (im.width, im.height + H), (255, 255, 255)); out.paste(im, (0, H))
    do = ImageDraw.Draw(out); do.text((24, 14), titill, fill=(20, 20, 20), font=FL)
    xs = 24; ys = 78
    for k, nm in (('slokkvitaeki', 'Handslökkvitæki (SL)'), ('slanga', 'Brunaslanga 20 m (BS)'), ('flotti', 'Útgangur (ÚT)'), ('bjorgun', 'Björgunarop (BO)'), ('brunakerfi', 'Reykskynjari (R)')):
        c = tel(h, k)
        if not c: continue
        do.ellipse([xs, ys, xs + 36, ys + 36], fill=LIT[k]); t = '%s: %d' % (nm, c)
        do.text((xs + 46, ys + 2), t, fill=(20, 20, 20), font=F1); xs += 46 + int(do.textlength(t, font=F1)) + 36
    out.save(os.path.join(UT, fn), optimize=True)
    print('->', fn, out.size)
teikna(1, p1, (360, 215, 1960, 960), 'Sudurhella5_1_haed_merkt.png', 'Suðurhella 5 — 1. hæð: hvar búnaður á að vera (aðaluppdráttur 15 023 útg. F, samþ. 17.09.2025)')
teikna(2, p2, (230, 150, 1760, 780), 'Sudurhella5_2_haed_merkt.png', 'Suðurhella 5 — 2. hæð / milliloft: hvar búnaður á að vera (aðaluppdráttur 15 023 útg. E, samþ. 17.09.2025)')
