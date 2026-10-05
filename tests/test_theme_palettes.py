"""Dockyard's theme colours and their contrast gate (design round d + h).

Sahil 05/10: all nine themes ship (plus Match Hermes, the default), and the
dark themes' background art stands out more. assets/themes/theme-palettes.py
is the source of truth for every theme colour and holds the contrast gate:
body text 7:1 and secondary text 4.5:1 on every surface, including over the
brightest point of each background image (ART_BRIGHTEST, measured on the
shipped images by bake-backgrounds.py). Until now the gate only ran by hand.

Rules pinned here:
- The gate passes: no colour pair Dockyard uses is below its minimum.
- The app's themes (src/styles/themes.js) carry exactly the palette file's
  name, mode, background and colours, theme by theme: no hand-edited drift.
- Every theme with background art ships its image and has a measured
  brightest point, and the gate checks text over that point.
- The images and fonts inside the app (src/styles/theme-assets.js, made by
  make-theme-assets.mjs) are byte for byte the files in assets/themes: a
  re-baked image that was not re-bundled would ship the old one.
"""
from __future__ import annotations

import base64
import importlib.util
import re
from pathlib import Path

ROOT = Path(__file__).parents[1]
DESKTOP = ROOT / "hermes_dockyard_plugin/desktop"
THEME_DIR = DESKTOP / "assets/themes"
THEMES_JS = DESKTOP / "src/styles/themes.js"
THEME_ASSETS_JS = DESKTOP / "src/styles/theme-assets.js"


def _palettes():
    spec = importlib.util.spec_from_file_location("theme_palettes", THEME_DIR / "theme-palettes.py")
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _app_themes() -> dict[str, dict]:
    """The THEMES entries of themes.js: id -> name, mode, art and tokens."""
    source = THEMES_JS.read_text(encoding="utf-8")
    entry = re.compile(
        r"\{ id: '(?P<id>[a-z]+)', name: '(?P<name>[^']+)', mode: '(?P<mode>[a-z]+)', source: '[a-z0-9]+', "
        r"art: (?P<art>null|'[a-z]+'),\s*tokens: (?P<tokens>null|Object\.freeze\(\{(?P<body>[^}]*)\}\)) \}"
    )
    themes = {}
    for match in entry.finditer(source):
        tokens = dict(re.findall(r"(\w+): '([^']*)'", match["body"] or ""))
        themes[match["id"]] = {
            "name": match["name"],
            "mode": match["mode"],
            "art": None if match["art"] == "null" else match["art"].strip("'"),
            "tokens": tokens or None,
        }
    return themes


def test_the_contrast_gate_passes():
    palettes = _palettes()
    failures = [
        f"{key}: {label} {fg} on {back} = {palettes.ratio(fg, back):.2f} (needs {minimum})"
        for key, theme in palettes.THEMES.items()
        for label, fg, back, minimum in palettes.pairs(theme)
        if palettes.ratio(fg, back) < minimum
    ]
    assert failures == []


def test_the_app_uses_exactly_the_palette_files_colours():
    palettes = _palettes()
    app = _app_themes()
    # Match Hermes is Dockyard's own light/dark, not a palette.
    assert app.pop("auto") == {"name": "Match Hermes", "mode": "auto", "art": None, "tokens": None}
    assert sorted(app) == sorted(palettes.THEMES)
    for key, theme in palettes.THEMES.items():
        shipped = app[key]
        assert (shipped["name"], shipped["mode"], shipped["art"]) == (theme["name"], theme["mode"], theme["art"]), key
        assert shipped["tokens"], key
        for token, value in shipped["tokens"].items():
            assert value.lower() == str(theme[token]).lower(), f"{key}.{token}: app {value}, palette {theme[token]}"


def test_every_background_is_shipped_measured_and_checked():
    palettes = _palettes()
    with_art = {key: theme for key, theme in palettes.THEMES.items() if theme["art"]}
    assert sorted(with_art) == ["burgundy", "cobalt", "ember", "estuary", "grove", "neon", "violet"]
    assert sorted(palettes.ART_BRIGHTEST) == sorted(theme["art"] for theme in with_art.values())
    for key, theme in with_art.items():
        image = THEME_DIR / f"{theme['art']}.avif"
        assert image.is_file() and image.stat().st_size > 0, image
        assert re.fullmatch(r"#[0-9a-f]{6}", palettes.ART_BRIGHTEST[theme["art"]]), key
        checked = {label for label, _, back, _ in palettes.pairs(theme) if back == palettes.ART_BRIGHTEST[theme["art"]]}
        assert {"text on brightest art", "secondary on brightest art", "tertiary on brightest art"} <= checked, key


def _bundled(block: str) -> dict[str, list[bytes]]:
    """THEME_ART or THEME_FONTS from theme-assets.js: id -> decoded data URLs."""
    source = THEME_ASSETS_JS.read_text(encoding="utf-8")
    body = re.search(rf"export const {block} = Object\.freeze\(\{{(.*?)\n\}}\)", source, re.S)
    assert body, block
    found = {}
    for key, values in re.findall(r'^  "([a-z-]+)": (.+?),?$', body.group(1), re.M):
        found[key] = [base64.b64decode(data) for data in re.findall(r'"data:[a-z/0-9+]+;base64,([A-Za-z0-9+/=]+)"', values)]
    return found


def test_the_bundled_images_and_fonts_are_the_shipped_files():
    palettes = _palettes()
    art = _bundled("THEME_ART")
    assert sorted(art) == sorted(theme["art"] for theme in palettes.THEMES.values() if theme["art"])
    for key, images in art.items():
        assert images == [(THEME_DIR / f"{key}.avif").read_bytes()], f"{key}: re-run make-theme-assets.mjs"
    fonts = _bundled("THEME_FONTS")
    bundled_fonts = sorted(data for files in fonts.values() for data in files)
    shipped_fonts = sorted(path.read_bytes() for path in (THEME_DIR / "fonts").glob("*.woff2"))
    assert bundled_fonts == shipped_fonts, "fonts: re-run make-theme-assets.mjs"
