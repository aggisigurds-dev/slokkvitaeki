# Sunnukriki 3: merktar myndir þriggja blaða + gögn í bunadargreining-sniði (tki, teikningar) — tilbúið til vistunar.
import pymupdf, cv2, numpy as np, json
DPI = 130; K = DPI / 72
E0 = (183.3, 314.2)                                   # uppruni nærmyndar einingarinnar (pt), 150 dpi
def pt(px, py): return (E0[0] + px * 72 / 150, E0[1] + py * 72 / 150)
EIN = {
    'SLT': [((216, 364), 'Afgreiðsla — við inngang úr anddyri (EI30-CS)'), ((463, 1818), 'Salur — við útgang að útistiga (EI30-C)')],
    'RS': [((238, 190), 'Anddyri (0109)'), ((720, 495), 'Starfsmannarými'), ((1356, 553), 'Búningsherbergi 13,2 m²'),
           ((548, 896), 'Afgreiðsla / gangur að starfsmannarými'), ((1339, 869), 'Búningsherbergi 12,6 m²'), ((877, 1452), 'Salur (0102), 100,2 m²')],
    'ÚT': [((157, 515), 'Afgreiðsla — flóttaleið að aðalinngangi (um anddyri)', 'Flóttaleið innanhúss'),
           ((222, 1105), 'Salur — flóttaleið um glerrennihurð í afgreiðslu', 'Flóttaleið innanhúss'),
           ((543, 1730), 'Salur — útgangur að útistiga (önnur flóttaleið)', 'Útidyr')],
}
tki, blod = [], []
# ── blað 1: aðaluppdráttur einingarinnar (bls. 3) ──
p = pymupdf.open('skjol/2026-10-01_A_aluppdr_ttir_sett.pdf')[2]
pix = p.get_pixmap(dpi=DPI); cv2.imwrite('blad_ein.jpg', cv2.cvtColor(np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, pix.n)[:, :, :3], cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 82])
blod.append({'id': 'e1', 'nafn': '1. hæð — Hóptíma stúdíó (aðaluppdr. 2026)', 'skra': 'blad_ein.jpg', 'frum': {'b': pix.w, 'h': pix.h},
             'skurdur': {'x': round(170 * K), 'y': round(300 * K), 'w': round(870 * K), 'h': round(920 * K)}, 'heimild': 'Arkform, Grunnmynd 1. hæð — Hóptíma stúdíó; aðaluppdr. innsiglaður 01.10.2026'})
for i, ((px, py), st) in enumerate(EIN['SLT'], 1):
    x, y = pt(px, py); tki.append({'audkenni': 'S%d' % i, 'bunadur': 'Handslökkvitæki', 'tegund': '6 L léttvatn (skv. brunavörnum: 2 stk)', 'stadur': st, 'haed': '1. hæð', 'blad': 'e1', 'bx': round(x * K), 'by': round(y * K), 'heimild': 'Aðaluppdr. 2026 („SLT")'})
for i, ((px, py), st) in enumerate(EIN['RS'], 1):
    x, y = pt(px, py); tki.append({'audkenni': 'R%d' % i, 'bunadur': 'Reykskynjari', 'flokkur': 'brunakerfi', 'upplysingar': True, 'tegund': 'Reykskynjari (firmakerfi, „RS")', 'stadur': st, 'haed': '1. hæð', 'blad': 'e1', 'bx': round(x * K), 'by': round(y * K), 'heimild': 'Aðaluppdr. 2026 („RS")'})
for i, ((px, py), st, teg) in enumerate(EIN['ÚT'], 1):
    x, y = pt(px, py); tki.append({'audkenni': 'ÚT%d' % i, 'bunadur': 'Útgangur (ÚT-merki)', 'flokkur': 'flotti', 'upplysingar': True, 'tegund': teg, 'stadur': st, 'haed': '1. hæð', 'blad': 'e1', 'bx': round(x * K), 'by': round(y * K), 'heimild': 'Aðaluppdr. 2026 (ÚT-ör)'})
# ── blöð 2–3: brunakerfi (vigur, „R" úr textalagi; skýringareitir felldir) ──
R = json.load(open('bk_R.json', encoding='utf-8'))
for bid, f, pg, nafn, heim, leg, pre in (
        ('e2', 'skjol/2026-07-09_Raflagnauppdr_ttir_sett.pdf', 5, '1. hæð — Líkamsrækt, brunakerfi (raflagnir 2026)', 'Arnar Bjarnason, raflagnir Líkamsrækt — 32.01.01 Brunakerfi, 09.07.2026', lambda a: a['y'] < 300 and a['x'] < 560, 'RL'),
        ('e3', 'skjol/2026-08-24_Raflagnauppdr_ttir_sett.pdf', 4, '1. hæð — brunakerfi, annað rými (Verkhönnun 2026)', 'Verkhönnun ehf, Raflagnir — Brunakerfi 1. hæð (32.01.01), 05.02.2026, br. B 09.06.2026', lambda a: a['y'] < 240, 'RV')):
    p = pymupdf.open(f)[pg]; r = p.rect
    pix = p.get_pixmap(dpi=DPI, clip=pymupdf.Rect(0, 0, r.width * 0.86, r.height))
    skra = 'blad_%s.jpg' % bid
    cv2.imwrite(skra, cv2.cvtColor(np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, pix.n)[:, :, :3], cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 82])
    blod.append({'id': bid, 'nafn': nafn, 'skra': skra, 'frum': {'b': pix.w, 'h': pix.h}, 'skurdur': None, 'heimild': heim})
    pts = sorted([a for a in R['bk0709' if bid == 'e2' else 'bk0824'] if not leg(a)], key=lambda a: (a['y'] // 60, a['x']))
    for i, a in enumerate(pts, 1):
        tki.append({'audkenni': '%s%d' % (pre, i), 'bunadur': 'Reykskynjari', 'flokkur': 'brunakerfi', 'upplysingar': True, 'tegund': 'Reykskynjari (brunaviðvörunarkerfi)', 'stadur': '', 'haed': '1. hæð', 'blad': bid, 'bx': round(a['x'] * K), 'by': round(a['y'] * K), 'heimild': heim})
    print(bid, len(pts), 'reykskynjarar')
json.dump({'tki': tki, 'blod': blod}, open('greining_sunnukriki.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# merktar myndir til útprentunar
LIT = {'slokkvi': (30, 30, 210), 'flotti': (40, 125, 46), 'brunakerfi': (170, 36, 142)}
for b in blod:
    a = cv2.imread(b['skra'])
    for t in tki:
        if t['blad'] != b['id']: continue
        c = LIT[t.get('flokkur', 'slokkvi')]; x, y = t['bx'], t['by']
        cv2.circle(a, (x, y), 22, c, 4)
        cv2.putText(a, t['audkenni'], (x + 24, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 6)
        cv2.putText(a, t['audkenni'], (x + 24, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, c, 2)
    if b['skurdur']:
        s = b['skurdur']; a = a[s['y']:s['y'] + s['h'], s['x']:s['x'] + s['w']]
    cv2.imwrite('merkt_%s.jpg' % b['id'], a, [cv2.IMWRITE_JPEG_QUALITY, 85])
print(len(tki), 'atriði')
