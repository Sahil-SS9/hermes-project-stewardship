"""Bake Project Stewardship's theme backgrounds (design round d + h).

Sahil 05/10: keep all nine themes; the background art should stand out a bit
more. Each dark theme's art is laid over its page colour, blurred, dimmed and
veiled so text over the page stays readable. This script holds the per-theme
strengths, writes assets/themes/<id>.avif and prints each image's brightest
point for theme-palettes.py (ART_BRIGHTEST), whose gate then proves body text
keeps 7:1 and secondary/tertiary text 4.5:1 over that point.

Strength (05/10): each theme takes the strongest setting on the path from the
v6 recipe (42% art, veil 55-65%) towards 75% art / veil 30-42% that keeps a 5%
margin over those minimums, capped near double the v6 visibility (luminance
spread). Cobalt stops at 1.8x: its bright core is the limit.

Needs ImageMagick 6 with AVIF (libheif). Sources: assets/themes/README.md.
Run: python3 bake-backgrounds.py SOURCE_DIR  (the HPS-UI-Concepts-v5/assets folder)
"""
import importlib.util
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCE = sys.argv[1] if len(sys.argv) > 1 else None  # the HPS-UI-Concepts-v5/assets folder

# The page colours come from the palette file, so the two cannot drift apart.
_spec = importlib.util.spec_from_file_location('theme_palettes', os.path.join(HERE, 'theme-palettes.py'))
assert _spec is not None and _spec.loader is not None
_palettes = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_palettes)
THEMES = _palettes.THEMES
lum = _palettes.lum

# id: (source file, art opacity %, veil top, veil bottom, extra modulate or None)
# Neon and Grove are HPSUI2's recipes (hue-rotate 100/70 deg, saturate 1.4/0.65) on a clean source.
ART = {
    'cobalt': ('midnight-cobalt.png', 52, 0.475, 0.581, None),
    'estuary': ('deep-estuary.png', 54, 0.456, 0.564, None),
    'burgundy': ('burgundy-ink.png', 55, 0.45, 0.558, None),
    'violet': ('violet-signal.png', 55, 0.45, 0.558, None),
    'ember': ('ember-spectrum.png', 54, 0.463, 0.57, None),
    'neon': ('burgundy-ink.png', 55, 0.45, 0.558, (140, 100 + 100 * 100 / 180)),
    'grove': ('burgundy-ink.png', 56, 0.444, 0.552, (65, 100 + 70 * 100 / 180)),
}
SIZE = '1440x810'


def rgb(hex_colour):
    h = hex_colour.lstrip('#')
    return ','.join(str(int(h[i:i + 2], 16)) for i in (0, 2, 4))


def bake(theme_id, png):
    source, opacity, veil_top, veil_bottom, modulate = ART[theme_id]
    page = THEMES[theme_id]['bg']
    pre = ['-modulate', f'100,{modulate[0]},{modulate[1]:.2f}'] if modulate else []
    subprocess.run([
        'convert', '-size', SIZE, f'xc:{page}',
        '(', os.path.join(SOURCE, source), *pre, '-resize', f'{SIZE}^', '-gravity', 'center', '-extent', SIZE,
        '-virtual-pixel', 'edge', '-blur', '0x4', '-modulate', '78,90,100', ')',
        '-compose', 'dissolve', '-define', f'compose:args={opacity}', '-composite',
        '(', '-size', SIZE, f'gradient:rgba({rgb(page)},{veil_top})-rgba({rgb(page)},{veil_bottom})', ')',
        '-compose', 'over', '-composite', '-strip', png,
    ], check=True)


def brightest(image):
    """Brightest point of a 12.5% box-averaged copy (what text of any size sits on)."""
    out = subprocess.run(['convert', image, '-filter', 'box', '-resize', '12.5%', '-depth', '8', 'txt:-'],
                         capture_output=True, text=True, check=True).stdout
    colours = ['#' + line.split('#')[1][:6].lower() for line in out.splitlines()[1:]]
    return max(colours, key=lum)


if __name__ == '__main__':
    if SOURCE is None:
        sys.exit('usage: python3 bake-backgrounds.py SOURCE_DIR  (the HPS-UI-Concepts-v5/assets folder)')
    found = {}
    with tempfile.TemporaryDirectory() as work:
        for theme_id in ART:
            png = os.path.join(work, f'{theme_id}.png')
            avif = os.path.join(HERE, f'{theme_id}.avif')
            bake(theme_id, png)
            subprocess.run(['convert', png, '-quality', '62', avif], check=True)
            # Measured on the shipped AVIF, which is what the browser shows.
            found[theme_id] = brightest(avif)
            print(f'{theme_id:9} {os.path.getsize(avif):6d} bytes  brightest {found[theme_id]}')
    print('ART_BRIGHTEST = ' + repr(found))
