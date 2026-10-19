# Sunnukriki 3 — Hóptíma stúdíó (aðaluppdr. innsiglaður 01.10.2026, Arkform): brunavarnatexti (bls. 1, snúinn texti)
# og tákn á grunnmynd (bls. 3): SLT, RS (reykskynjari), NL (neyðarlýsing). Úttak í UTF-8 JSON.
import pymupdf, json, re
d = pymupdf.open('skjol/2026-10-01_A_aluppdr_ttir_sett.pdf')
p = d[0]
FYR = ['Notkunarskilmálar vegna brunavarna', 'Brunaviðvörun', 'Handslökkvibúnaður', 'Neyðarlýsing og leiðarmerkingar', 'Rýming við eldsvoða',
       'Klæðningar', 'Brunahólfun', 'Aðkoma og aðgerðir slökkviliðs', 'Burðarvirki við bruna', 'Viðhald brunavarna', 'Lýsing á starfseminni']
bl = [b for b in p.get_text('blocks') if b[4].strip() and b[0] < 240 and b[1] < 1300]
bands = sorted({round(b[1] / 50) * 50 for b in bl})
kaflar = []
for band in bands:
    for b in sorted([b for b in bl if round(b[1] / 50) * 50 == band], key=lambda b: -b[0]):     # snúinn texti: lesið frá hægri
        t = re.sub(r'\s+', ' ', b[4].replace('\n', ' ')).strip()
        h = next((f for f in FYR if t.startswith(f)), None)
        if t == 'Brunavarnir': continue
        if h:
            kaflar.append({'fyrirsogn': h, 'texti': t[len(h):].strip(), 'lykill': h in ('Handslökkvibúnaður', 'Viðhald brunavarna', 'Brunaviðvörun')})
        elif kaflar:
            kaflar[-1]['texti'] = (kaflar[-1]['texti'] + ' ' + t).strip()
# „Lýsing á starfseminni" fer í sér hluta (ekki brunavarnir)
lys = [k for k in kaflar if k['fyrirsogn'] == 'Lýsing á starfseminni']
kaflar = [k for k in kaflar if k['fyrirsogn'] != 'Lýsing á starfseminni']
json.dump({'kaflar': kaflar, 'starfsemi': lys}, open('brunavarnir_eining.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for k in kaflar: print('##', k['fyrirsogn'], '|', k['texti'][:90])
# tákn á bls. 3 — innan einingarinnar (svæði hennar á blaðinu, pt)
p3 = d[2]; r = p3.rect
EIN = (140 * 72 / 55, 240 * 72 / 55, 785 * 72 / 55, 920 * 72 / 55)      # x0, y0, x1, y1 af 55-dpi forskoðun
tak = []
for w in p3.get_text('words'):
    if w[4] in ('SLT', 'RS', 'NL'):
        x, y = (w[0] + w[2]) / 2, (w[1] + w[3]) / 2
        if EIN[0] <= x <= EIN[2] and EIN[1] <= y <= EIN[3]: tak.append({'t': w[4], 'x': round(x, 1), 'y': round(y, 1)})
print({t: sum(1 for k in tak if k['t'] == t) for t in ('SLT', 'RS', 'NL')}, 'blað', r)
json.dump(tak, open('takn_eining.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
p3.get_pixmap(dpi=150, clip=pymupdf.Rect(*EIN)).save('eining_150.png')
