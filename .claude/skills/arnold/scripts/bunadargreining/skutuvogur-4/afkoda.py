# Afkóðun textalags Skútuvogs 4 (2025): leturgerðin hliðrar ASCII um 29; íslenskir stafir á eigin sætum.
SER = {0xe8: 'ð', 0x69: 'á', 0xa0: 'æ', 0x74: 'í', 0x79: 'ó', 0x7e: 'ú', 0x7c: 'ö', 0xec: 'þ', 0xea: 'ý', 0x67: 'Ö',
       0xcf: 'Ó', 0xd2: 'Ú', 0xe7: 'Ð', 0xf0: '²', 0x6e: '?', 0x70: 'é', 0xeb: 'Þ', 0xcb: 'Í', 0xc8: 'É', 0xc4: 'Í', 0xf6: '³', 0xb3: '³', 0xed: '°'}
def dk(s, hlidrad=True):
    if not hlidrad: return s
    return ''.join(SER.get(ord(c), chr(ord(c) + 29) if ord(c) + 29 < 0x7f else c) for c in s)
def hlidrad_letur(span):
    # hliðraða letrið hefur fáa venjulega lágstafi; venjulegt letur: mest a–z
    t = span['text']; lag = sum(1 for c in t if 'a' <= c <= 'z'); return lag < max(1, len(t)) * 0.5
