# Gátt-yfirlag: teiknar greininguna (+ tillögur Arnolds ef til) á hvert blað eins og Gáttin les það → yfirlag/<cid>_<blad>.jpg + yfirlag_listi.json
#   python gera.py        (í vinnumöppunni með blod.json og blod/; UTF-8, ekki -I)
# Bakgrunnur skannaðra blaða er flattur (MaxFilter 21 + GaussianBlur 25, deilt út) → hvítur pappír, línur halda sér.
# Merki greiningarinnar = full litaður hringur; TILLAGA = hvítur hringur með lituðum hring og stöfum — sést strax að hún er áætlun.
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
Image.MAX_IMAGE_PIXELS = None
sys.stdout.reconfigure(encoding='utf-8')
B = json.load(open('blod.json', encoding='utf-8'))
os.makedirs('yfirlag', exist_ok=True)
LIT = {'sl': ((201, 60, 29), 'S'), 'bs': ((31, 95, 191), 'BS'), 'ut': ((46, 125, 50), 'ÚT'), 'r': ((142, 36, 170), 'R'), 'hb': ((106, 27, 154), 'HB'), 'st': ((69, 39, 160), '!')}
NAFN = {'sl': 'Slökkvitæki', 'bs': 'Brunaslanga', 'ut': 'ÚT-skilti', 'r': 'Reykskynjari', 'hb': 'Handboði', 'st': 'Stjórnstöð'}
LANGT = 1800


def flokkur(t):
    b = str(t.get('bunadur') or ''); f = str(t.get('flokkur') or '')
    if f == 'flotti' or b.startswith('Útgangur'): return 'ut'
    if f == 'brunakerfi':
        if 'eykskynjari' in b: return 'r'
        if 'andbo' in b: return 'hb'
        return 'st'
    if 'lang' in b or 'efli' in b: return 'bs'
    return 'sl'


def font(n):
    for f in ('arialbd.ttf', 'arial.ttf', 'DejaVuSans-Bold.ttf'):
        try: return ImageFont.truetype(f, n)
        except Exception: pass
    return ImageFont.load_default()


def hreinsa(im):
    g = im.convert('L')
    bg = g.filter(ImageFilter.MaxFilter(21)).filter(ImageFilter.GaussianBlur(25))
    a = np.asarray(g, dtype=np.float32); b = np.maximum(np.asarray(bg, dtype=np.float32), 1)
    r = np.clip(a / b, 0, 1)
    r = np.clip((r - 0.35) / (0.93 - 0.35), 0, 1) ** 1.15
    return Image.fromarray((r * 255).astype('uint8')).convert('RGB')


def gera(bl, titill, ut):
    im = Image.open(bl['f']).convert('RGB')
    sk = bl['sk']
    if sk and sk['w'] > 8 and sk['h'] > 8:
        x0, y0, x1, y1 = sk['x'], sk['y'], sk['x'] + sk['w'], sk['y'] + sk['h']
    else:
        x0, y0, x1, y1 = 0, 0, im.width, im.height
    m = 45
    for t in bl['tki'] + bl.get('till', []):   # merki utan skurðar fá að vera með (annars vantar þau á myndina en eru talin)
        x0, y0 = min(x0, t['bx'] - m), min(y0, t['by'] - m); x1, y1 = max(x1, t['bx'] + m), max(y1, t['by'] + m)
    x0, y0, x1, y1 = max(0, int(x0)), max(0, int(y0)), min(im.width, int(x1)), min(im.height, int(y1))
    im = im.crop((x0, y0, x1, y1))
    sc = min(1.0, LANGT / max(im.size))
    im = im.resize((max(1, int(im.width * sc)), max(1, int(im.height * sc))), Image.LANCZOS)
    im = hreinsa(im)
    W, H = im.size
    r = max(12, int(W * 0.0105))
    d = ImageDraw.Draw(im, 'RGBA')
    f = font(int(r * 1.05))
    talid, till = {}, {}
    for t in bl['tki']:
        k = flokkur(t)
        x, y = (t['bx'] - x0) * sc, (t['by'] - y0) * sc
        if not (-r < x < W + r and -r < y < H + r): continue
        talid[k] = talid.get(k, 0) + 1
        lit, txt = LIT[k]
        d.ellipse((x - r, y - r, x + r, y + r), fill=lit + (232,), outline=(255, 255, 255, 255), width=max(2, r // 6))
        tw = d.textlength(txt, font=f)
        d.text((x - tw / 2, y - r * 0.55), txt, fill=(255, 255, 255, 255), font=f)
    for t in bl.get('till', []):
        k = t['flokkur']
        x, y = (t['bx'] - x0) * sc, (t['by'] - y0) * sc
        if not (-r < x < W + r and -r < y < H + r): continue
        till[k] = till.get(k, 0) + 1
        lit, txt = LIT[k]
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255, 245), outline=lit + (255,), width=max(3, r // 4))
        tw = d.textlength(txt, font=f)
        d.text((x - tw / 2, y - r * 0.55), txt, fill=lit + (255,), font=f)
    ff = font(26)
    bar = Image.new('RGB', (im.width, 78), (28, 34, 40))
    bd = ImageDraw.Draw(bar)
    bd.text((14, 8), titill, fill=(255, 255, 255), font=font(30))
    x = 14
    for k in ('sl', 'bs', 'ut', 'r', 'hb', 'st'):
        if talid.get(k):
            lit, txt = LIT[k]
            bd.ellipse((x, 46, x + 22, 68), fill=lit, outline=(255, 255, 255), width=2)
            s2 = '%s %d' % (NAFN[k], talid[k])
            bd.text((x + 28, 44), s2, fill=(235, 238, 240), font=ff)
            x += 28 + int(bd.textlength(s2, font=ff)) + 26
    for k in ('sl', 'bs'):
        if till.get(k):
            lit, txt = LIT[k]
            bd.ellipse((x, 46, x + 22, 68), fill=(255, 255, 255), outline=lit, width=4)
            s2 = '%s (tillaga) %d' % (NAFN[k], till[k])
            bd.text((x + 28, 44), s2, fill=(235, 238, 240), font=ff)
            x += 28 + int(bd.textlength(s2, font=ff)) + 26
    out = Image.new('RGB', (im.width, im.height + bar.height), 'white')
    out.paste(bar, (0, 0)); out.paste(im, (0, bar.height))
    out.save(ut, quality=84, optimize=True, progressive=True)
    return out.size, talid, till


res = []
for bl in B:
    if not os.path.exists(bl['f']):
        print('BLAÐ VANTAR', bl['cid'], bl['id']); continue
    if not bl['tki'] and not bl.get('till'):
        print('ENGIN merki', bl['cid'], bl['id']); continue
    ut = 'yfirlag/%d_%s.jpg' % (bl['cid'], bl['id'])
    try:
        sz, tal, til = gera(bl, '%s · %s — búnaðargreining' % (bl['bygging'], bl['label']), ut)
        alls = {}
        for t in bl['tki']:
            k = flokkur(t); alls[k] = alls.get(k, 0) + 1
        tilalls = {}
        for t in bl.get('till', []): tilalls[t['flokkur']] = tilalls.get(t['flokkur'], 0) + 1
        ok = '' if (alls == tal and tilalls == til) else '  <<< teiknað ' + str(tal) + '/' + str(til) + ' af ' + str(alls) + '/' + str(tilalls)
        res.append({'cid': bl['cid'], 'id': bl['id'], 'haed': bl['haed'], 'label': bl['label'], 'f': ut, 'tel': alls, 'till': tilalls})
        print(bl['cid'], bl['id'], sz, alls, tilalls or '', ok)
    except Exception as e:
        print('VILLA', bl['cid'], bl['id'], e)
json.dump(res, open('yfirlag_listi.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(len(res), 'myndir')
