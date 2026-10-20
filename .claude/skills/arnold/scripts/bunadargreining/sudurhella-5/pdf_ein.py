# -*- coding: utf-8 -*-
# EIN síða (A4 lóðrétt, 300 dpi): samantekt efst, 1. hæð, 2. hæð fyrir neðan — engin blaðaskipti. Fyrir símann og prentun.
import json, os
from PIL import Image, ImageDraw, ImageFont
HER = os.path.dirname(os.path.abspath(__file__))
UT = os.path.join(HER, 'ut')
items = json.load(open(os.path.join(HER, 'items.json'), encoding='utf-8'))['items']
tel = lambda h, f: sum(1 for i in items if i['haed'] == h and i['flokkur'] == f)
W, H = 3508, 4961; M = 60
def font(sz, b=False):
    f = 'C:/Windows/Fonts/arialbd.ttf' if b else 'C:/Windows/Fonts/arial.ttf'
    return ImageFont.truetype(f, sz) if os.path.exists(f) else ImageFont.load_default()
FT, FS, FB, FN, FM = font(110, True), font(46), font(70, True), font(64), font(42)
pg = Image.new('RGB', (W, H), (255, 255, 255)); d = ImageDraw.Draw(pg)
y = 70
HM = Image.open(os.path.join(UT, 'husmynd.jpg')).convert('RGB'); HW = 1300; HM = HM.resize((HW, int(HM.height * HW / HM.width)), Image.LANCZOS)
pg.paste(HM, (W - M - HW, 70)); d.rectangle([W - M - HW, 70, W - M, 70 + HM.height], outline=(120, 120, 120), width=3)
d.text((M + 20, y), 'Suðurhella 5, Hafnarfirði — búnaður', fill=(20, 20, 20), font=FT); y += 135
d.text((M + 20, y), 'Samantekt úr aðaluppdrætti 15 023 (útg. F/E), samþykktum 17.09.2025 — lesið úr skjalinu sjálfu', fill=(90, 90, 90), font=FS); y += 90
RAD = [('Handslökkvitæki (SL)', 'slokkvitaeki', (214, 40, 40)), ('Brunaslöngur 20 m (BS)', 'slanga', (20, 90, 220)), ('Útgangar (ÚT)', 'flotti', (20, 150, 70)),
       ('Reykskynjarar (R)', 'brunakerfi', (140, 40, 190))]
cx = [M + 40, 1130, 1450, 1770]   # tafla þrengd — húsmyndin fær hægra hornið
for x, t in zip(cx, ['Búnaður', '1. hæð', '2. hæð', 'Samtals']): d.text((x, y), t, fill=(20, 20, 20), font=FB)
y += 100; d.line([(M, y), (W - M - HW - 40, y)], fill=(120, 120, 120), width=5); y += 22
for nm, k, c in RAD:
    a, b = tel(1, k), tel(2, k)
    d.ellipse([M + 40, y + 10, M + 40 + 54, y + 10 + 54], fill=c); d.text((M + 40 + 90, y), nm, fill=(20, 20, 20), font=FN)
    for x, v in zip(cx[1:], [a, b, a + b]): d.text((x, y), str(v) if v else '–', fill=(20, 20, 20), font=FB if x == cx[3] else FN)
    y += 96
d.line([(M, y), (W - M - HW - 40, y)], fill=(120, 120, 120), width=4); y += 22
sl = lambda h: tel(h, 'slokkvitaeki') + tel(h, 'slanga')
d.text((M + 40, y), 'Slökkvibúnaður (SL + BS)', fill=(20, 20, 20), font=FB)
for x, v in zip(cx[1:], [sl(1), sl(2), sl(1) + sl(2)]): d.text((x, y), str(v), fill=(214, 40, 40), font=FB)
y += 110
for t in ['Tegund handslökkvitækja er ekki tilgreind á teikningunni — duft 6 kg er tillaga. Bil 0104 hefur aðeins eitt slökkvitæki (framhlið); hin bilin tvö.']:
    d.text((M + 40, y), t, fill=(60, 60, 60), font=FM); y += 70
y += 20
for fn in ('Sudurhella5_1_haed_merkt.png', 'Sudurhella5_2_haed_merkt.png'):
    im = Image.open(os.path.join(UT, fn)).convert('RGB')
    kv = (W - 2 * M) / im.width
    im = im.resize((W - 2 * M, int(im.height * kv)), Image.LANCZOS)
    if y + im.height > H - 40: raise SystemExit('of hátt: %d' % (y + im.height))
    pg.paste(im, (M, y)); d.rectangle([M, y, M + im.width, y + im.height], outline=(190, 190, 190), width=2)
    y += im.height + 40
print('notað hæð', y, 'af', H)
pg = pg.crop((0, 0, W, min(H, y + 20)))
out = os.path.join(UT, 'Sudurhella5_bunadargreining_ein_sida.pdf')
pg.save(out, 'PDF', resolution=300.0, quality=90)
pg.resize((W // 2, pg.height // 2), Image.LANCZOS).save(os.path.join(UT, 'Sudurhella5_bunadargreining_ein_mynd.png'), optimize=True)
print(out, os.path.getsize(out) // 1024, 'KB', pg.size)
