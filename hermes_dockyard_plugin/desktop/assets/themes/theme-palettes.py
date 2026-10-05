"""Dockyard theme palettes and their contrast gate (design round d + h, 05/10).

Sources (Sahil-approved, read 05/10):
- /home/kensei/HPS-UI-Concepts-v6/index.html (== Desktop/HPSUI/index6.html, 21/09 22:11):
  Caffeine Paper, Kodama Grove, Midnight Cobalt, Deep Estuary, Burgundy Ink,
  Violet Signal, Ember Spectrum. v6 rules: neutral text layer, ONE contrasting
  brand accent per theme, status colours semantic only (never re-tinted),
  wallpaper 42% / blur 4px / saturation 0.9 / brightness 0.78 / one veil.
  05/10: Sahil asked for the art to stand out more; per-theme strengths are in
  bake-backgrounds.py (about double the v6 visibility, within this gate).
- /home/sahil/Desktop/HPSUI/HPSUI2/index.html (21/09 16:04): Neon Block Night,
  Kodama Grove Night.
Values marked v6/hpsui2 are copied; the rest are derived to fill Dockyard's
token ladder and must pass the gate below. Run: python3 theme-palettes.py [--json]
"""
import json
import sys

def lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def lum(h):
    r, g, b = rgb(h)
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def ratio(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)

def hue(h):
    r, g, b = (x / 255 for x in rgb(h))
    mx, mn = max(r, g, b), min(r, g, b)
    if mx == mn:
        return None
    d = mx - mn
    hh = ((g - b) / d) % 6 if mx == r else ((b - r) / d + 2 if mx == g else (r - g) / d + 4)
    return hh * 60

# Dockyard's own status colours (styles/tokens.js), shared by every theme of that mode.
LIGHT_STATUS = dict(success='#136c4a', successBg='#e7f6ef', warning='#805200', warningBg='#fff3d4',
                    danger='#a72a2a', dangerBg='#ffeded', info='#315ca8', infoBg='#eaf2ff')
DARK_STATUS = dict(success='#72cda2', successBg='#16372a', warning='#f0bd64', warningBg='#3a2c14',
                   danger='#ff9188', dangerBg='#40201f', info='#9ab9ff', infoBg='#1c2d4a')

def light(**t):
    return dict(mode='light', art=None, onAction='#ffffff', shadow='0 10px 28px rgba(54, 44, 28, 0.08)', **LIGHT_STATUS, **t)

def dark(**t):
    return dict(mode='dark', shadow='0 12px 30px rgba(0, 0, 0, 0.36)', **DARK_STATUS, **t)

THEMES = {
    # --- light -----------------------------------------------------------------
    'caffeine': light(name='Caffeine Paper', source='v6',
        bg='#f7f5f0', surface='#fbfaf7', surfaceSubtle='#f3f0e9', surfaceStrong='#eee9e0',   # v6 bg/panel/panel2
        text='#1c1a17', textSecondary='#5d574e', textTertiary='#5d574e',                       # v6 text/muted
        border='#d8d2c4', controlBorder='#8c8374',                                             # v6 line
        action='#2563eb', actionHover='#1d4fd8',                                               # v6 accent
        accentText='#1d4ed8', accentSoft='#e6edfc', accentBorder='#b4c6f3',
        neutral='#5a574f', neutralBg='#ebe7de', focus='#2563eb', disabledText='#5d574e', disabledBg='#eee9e0'),
    'kodama': light(name='Kodama Grove', source='v6',
        bg='#e9e2c8', surface='#f1ebda', surfaceSubtle='#ece5cf', surfaceStrong='#e4dbbb',   # v6 bg/panel; panel2 #e0d5b0 lifted so status text keeps 4.5:1
        text='#1d2416', textSecondary='#4f4f35', textTertiary='#4f4f35',                       # v6 text; muted #5c5c3f deepened for 4.5:1 on panel2
        border='#bfae8a', controlBorder='#776a4d',                                             # v6 line
        action='#0e7490', actionHover='#0b5f77',                                               # v6 accent
        accentText='#0a5a70', accentSoft='#d7e6e0', accentBorder='#8db9c2',
        neutral='#4f5444', neutralBg='#e3dcc4', focus='#0e7490', disabledText='#4f4f35', disabledBg='#e4dbbb'),
    # --- dark (v6) ---------------------------------------------------------------
    'cobalt': dark(name='Midnight Cobalt', source='v6', art='cobalt',
        bg='#070a12', surface='#0e1422', surfaceSubtle='#121a2b', surfaceStrong='#182338',   # v6 bg; panels lifted to read over art
        text='#eef3fb', textSecondary='#a9bad4', textTertiary='#9cb0cd',                       # v6 text/muted
        border='#223148', controlBorder='#566e94',                                             # v6 line
        action='#60a5fa', actionHover='#86bbfb', onAction='#061224',                           # v6 accent
        accentText='#9cc6fc', accentSoft='#16253f', accentBorder='#2f5487',
        neutral='#bac2ce', neutralBg='#202939', focus='#93c5fd', disabledText='#a9bad4', disabledBg='#182338'),
    'estuary': dark(name='Deep Estuary', source='v6', art='estuary',
        bg='#060f0e', surface='#0b1816', surfaceSubtle='#0f201d', surfaceStrong='#152a26',
        text='#eef7f3', textSecondary='#a6c7bb', textTertiary='#9cc0b3',                       # v6 text/muted
        border='#1f3a33', controlBorder='#4f7a6d',                                             # v6 line
        action='#5eead4', actionHover='#8af0e0', onAction='#03201b',                           # v6 accent
        accentText='#93f1e2', accentSoft='#11302b', accentBorder='#2b6458',
        neutral='#b8c8c2', neutralBg='#1d2b28', focus='#5eead4', disabledText='#a6c7bb', disabledBg='#152a26'),
    'burgundy': dark(name='Burgundy Ink', source='v6', art='burgundy',
        bg='#0f080d', surface='#180c14', surfaceSubtle='#1f111b', surfaceStrong='#2a1724',
        text='#fbeef2', textSecondary='#d1aec3', textTertiary='#c8a2b9',                       # v6 text/muted
        border='#3a2233', controlBorder='#83566e',                                             # v6 line
        action='#f472b6', actionHover='#f794c8', onAction='#2b0718',                           # v6 accent
        accentText='#f9a8d4', accentSoft='#3a1529', accentBorder='#73305a',
        neutral='#cdbdc6', neutralBg='#2c1f29', focus='#f9a8d4', disabledText='#d1aec3', disabledBg='#2a1724'),
    'violet': dark(name='Violet Signal', source='v6', art='violet',
        bg='#0a0813', surface='#110d1e', surfaceSubtle='#171228', surfaceStrong='#201936',
        text='#f1eefb', textSecondary='#bab2d9', textTertiary='#b1a8d2',                       # v6 text/muted
        border='#2c2449', controlBorder='#675d97',                                             # v6 line
        action='#a78bfa', actionHover='#bba5fb', onAction='#150a35',                           # v6 accent
        accentText='#c9bcfd', accentSoft='#241b45', accentBorder='#4d3e88',
        neutral='#c3bed6', neutralBg='#231d36', focus='#c4b5fd', disabledText='#bab2d9', disabledBg='#201936'),
    'ember': dark(name='Ember Spectrum', source='v6', art='ember',
        bg='#0f0811', surface='#180c1b', surfaceSubtle='#1f1023', surfaceStrong='#2a162e',
        text='#faf0f1', textSecondary='#d4b1c4', textTertiary='#cba5ba',                       # v6 text/muted
        border='#3b2440', controlBorder='#85607f',                                             # v6 line
        action='#fb923c', actionHover='#fcaa66', onAction='#2b1203',                           # v6 accent
        accentText='#fdba74', accentSoft='#3a1f12', accentBorder='#7f4519',
        neutral='#cdbfc8', neutralBg='#2b1f2e', focus='#fdba74', disabledText='#d4b1c4', disabledBg='#2a162e'),
    # --- dark (HPSUI2) -----------------------------------------------------------
    'neon': dark(name='Neon Block Night', source='hpsui2', art='neon',
        bg='#03160f', surface='#062419', surfaceSubtle='#082c20', surfaceStrong='#0c3828',   # hpsui2 bg/panel
        text='#fffdf1', textSecondary='#b4d6c3', textTertiary='#acd1bc',                       # hpsui2 text/muted
        border='#145238', controlBorder='#3f8d6b',                                             # hpsui2 line #1c7150 family
        action='#ffb21c', actionHover='#ffc451', onAction='#2a1900',                           # hpsui2 accent
        accentText='#ffe1a1', accentSoft='#2b3313', accentBorder='#8a6512',                    # hpsui2 accent2
        neutral='#bfd3c8', neutralBg='#12332a', focus='#ffe1a1', disabledText='#b4d6c3', disabledBg='#0c3828'),
    'grove': dark(name='Kodama Grove Night', source='hpsui2', art='grove',
        bg='#12180e', surface='#1b2315', surfaceSubtle='#212a1a', surfaceStrong='#2a3421',   # hpsui2 bg/panel
        text='#f5efd9', textSecondary='#cdcca9', textTertiary='#c5c4a2',                       # hpsui2 text/muted
        border='#3a4529', controlBorder='#6f7f53',                                             # hpsui2 line #65724c family
        action='#b9cf72', actionHover='#cadc8f', onAction='#1a2204',                           # hpsui2 accent
        accentText='#e4efb9', accentSoft='#2c3a1a', accentBorder='#66783a',                    # hpsui2 accent2
        neutral='#cfcab4', neutralBg='#2c3322', focus='#e4efb9', disabledText='#cdcca9', disabledBg='#2a3421'),
}
# Brightest pixel of each baked wallpaper (12.5% downsample, blurred), from dh-art/*.png.
# Measured on the shipped AVIFs by bake-backgrounds.py (05/10: art strengthened, Sahil).
ART_BRIGHTEST = {'cobalt': '#464018', 'estuary': '#364d1e', 'burgundy': '#52280d', 'violet': '#14384f',
                 'ember': '#503a15', 'neon': '#06530f', 'grove': '#3b4d1b'}

def pairs(t):
    pages = [('page', t['bg'])] + ([('brightest art', ART_BRIGHTEST[t['art']])] if t.get('art') else [])
    surfaces = [('surface', t['surface']), ('subtle', t['surfaceSubtle']), ('strong', t['surfaceStrong'])]
    out = []
    for where, back in pages + surfaces:
        out.append((f'text on {where}', t['text'], back, 7.0))
        out.append((f'secondary on {where}', t['textSecondary'], back, 4.5))
        out.append((f'tertiary on {where}', t['textTertiary'], back, 4.5))
    for k in ('action', 'actionHover'):
        out.append((f'label on {k}', t['onAction'], t[k], 4.5))
    out.append(('accent text on accent soft', t['accentText'], t['accentSoft'], 4.5))
    for where, back in surfaces:
        out.append((f'accent text on {where}', t['accentText'], back, 4.5))
        out.append((f'action as text on {where}', t['action'], back, 3.0))
    for s in ('success', 'warning', 'danger', 'info', 'neutral'):
        out.append((f'{s} on its own bg', t[s], t[s + 'Bg'], 4.5))
        for where, back in surfaces:
            out.append((f'{s} on {where}', t[s], back, 4.5))
    out.append(('disabled', t['disabledText'], t['disabledBg'], 4.5))
    out.append(('inverse on info fill', t['surface'], t['info'], 4.5))
    for where, back in pages[:1] + surfaces[:2]:
        out.append((f'control border on {where}', t['controlBorder'], back, 3.0))
        out.append((f'focus ring on {where}', t['focus'], back, 3.0))
    return out

if __name__ == '__main__':
    failures = 0
    for key, t in THEMES.items():
        tight = []
        for label, fg, back, minimum in pairs(t):
            r = ratio(fg, back)
            if r < minimum:
                failures += 1
                print(f'FAIL {key:9} {label:30} {fg} on {back} = {r:.2f} (needs {minimum})')
            tight.append((r - minimum, f'{label}={r:.2f}'))
        a = hue(t['action'])
        for s in ('success', 'warning', 'danger'):
            hs = hue(t[s])
            if a is not None and hs is not None and min(abs(a - hs), 360 - abs(a - hs)) < 15:
                print(f'NOTE {key:9} accent {t["action"]} sits near {s} {t[s]} (hue {a:.0f} vs {hs:.0f}); status keeps icon + label')
        tight.sort()
        print(f'     {key:9} {t["name"]:20} tightest: ' + ', '.join(x for _, x in tight[:3]))
    print('FAILURES', failures)
    if '--json' in sys.argv:
        json.dump({'themes': THEMES, 'artBrightest': ART_BRIGHTEST}, open('themes.json', 'w'), indent=1)
    sys.exit(1 if failures else 0)
