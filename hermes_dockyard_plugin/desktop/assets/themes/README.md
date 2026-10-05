# Dockyard themes: sources, licences and how the assets are made

Design round d + h (Sahil's demo feedback 04/10, round started 05/10). Sahil 05/10: all nine
themes ship (plus Match Hermes, the default), with the background art made to stand out more.

## Themes

| Id | Name | Mode | Source | Background |
|---|---|---|---|---|
| auto | Match Hermes | follows Hermes Desktop | Dockyard's own light/dark | none |
| caffeine | Caffeine Paper | light | HPS-UI-Concepts-v6 (approved 21/09) | none |
| kodama | Kodama Grove | light | v6 | none |
| cobalt | Midnight Cobalt | dark | v6 | cobalt.avif |
| estuary | Deep Estuary | dark | v6 | estuary.avif |
| burgundy | Burgundy Ink | dark | v6 | burgundy.avif |
| violet | Violet Signal | dark | v6 | violet.avif |
| ember | Ember Spectrum | dark | v6 | ember.avif |
| neon | Neon Block Night | dark | HPSUI2 (21/09) | neon.avif |
| grove | Kodama Grove Night | dark | HPSUI2 | grove.avif |

v6 = `/home/kensei/HPS-UI-Concepts-v6/index.html` (identical to `/home/sahil/Desktop/HPSUI/index6.html`).
HPSUI2 = `/home/sahil/Desktop/HPSUI/HPSUI2/index.html`. Colours: `theme-palettes.py` (copied values are
marked; derived ones fill Dockyard's token ladder). Every pair Dockyard uses passes WCAG AA
(`python3 theme-palettes.py` exits 0). v6 rules kept: neutral text, one contrasting accent per theme,
status colours (green/amber/red) identical in every theme of a mode.

Known trade-off: in Ember Spectrum and Neon Block Night the accent sits near the warning amber, as
designed. Warnings keep their icon and label.

## Backgrounds

| File | From | Provenance |
|---|---|---|
| cobalt.avif | /home/kensei/HPS-UI-Concepts-v5/assets/midnight-cobalt.png | Supplied by Sahil (v4 README: "Sahil's five supplied images"; OCR found no text) |
| estuary.avif | .../deep-estuary.png | same |
| burgundy.avif | .../burgundy-ink.png | same |
| violet.avif | .../violet-signal.png | same |
| ember.avif | .../ember-spectrum.png | same |
| neon.avif | .../burgundy-ink.png, hue +100 deg, saturation 1.4 | HPSUI2's Neon recipe (`hue-rotate(100deg) saturate(1.4)`) on a clean source |
| grove.avif | .../burgundy-ink.png, hue +70 deg, saturation 0.65 | HPSUI2's Grove recipe (`hue-rotate(70deg) saturate(.65)`) on a clean source |

HPSUI2 applied its recipes to `argon-fluid.png`. That file was rejected 05/10: it is a screenshot of a
third-party website (logo and title "OSTAVER", menu "ABOUT / WORK / EXPERTISE / CONTACT", tagline,
scroll cue), so it has rendered text and is not Sahil's artwork.

Recipe: v6's wallpaper rules (blur 4px, saturation 0.9, brightness 0.78, one veil in the theme's page
colour), baked at 1440x810 with ImageMagick, then AVIF quality 62 (4-7 KB each; JPEG at 6x the size
showed banding). v6 used 42% art under a 55-65% veil. 05/10: Sahil asked for the art to stand out a
bit more, so each theme now takes the strongest setting on the path towards 75% art / veil 30-42%
that keeps a 5% margin over the contrast minimums below, capped near double the v6 visibility
(luminance spread):

| Theme | Art | Veil (top-bottom) | Visibility vs v6 |
|---|---|---|---|
| cobalt | 52% | 47.5-58.1% | 1.8x (its bright core is the limit) |
| estuary | 54% | 45.6-56.4% | 2.0x |
| burgundy | 55% | 45-55.8% | 2.1x |
| violet | 55% | 45-55.8% | 2.1x |
| ember | 54% | 46.3-57% | 2.0x |
| neon | 55% | 45-55.8% | 2.1x |
| grove | 56% | 44.4-55.2% | 2.1x |

`python3 bake-backgrounds.py [SOURCE_DIR]` re-bakes all seven from the sources above (default
`/home/kensei/HPS-UI-Concepts-v5/assets`) and prints each image's brightest point (blurred 12.5%
sample, measured on the shipped AVIF). Those go in `theme-palettes.py` (`ART_BRIGHTEST`), whose gate
keeps body text at 7:1 or more and secondary text at 4.5:1 or more even over that point
(`tests/test_theme_palettes.py` runs the gate).

## Fonts

| File | Font | Version | Licence |
|---|---|---|---|
| fonts/space-grotesk-latin-wght-normal.woff2 | Space Grotesk (variable 300-700) | @fontsource-variable/space-grotesk 5.3.0 | SIL OFL 1.1 (fonts/OFL-space-grotesk.txt) |
| fonts/jetbrains-mono-latin-wght-normal.woff2 | JetBrains Mono (variable 100-800) | @fontsource-variable/jetbrains-mono 5.3.0 | SIL OFL 1.1 (fonts/OFL-jetbrains-mono.txt) |
| fonts/space-mono-latin-{400,700}-normal.woff2 | Space Mono | @fontsource/space-mono 5.3.0 | SIL OFL 1.1 (fonts/OFL-space-mono.txt) |

Latin subset only. The fonts are bundled so the app works offline; nothing is fetched at run time.

## Build

`node make-theme-assets.mjs` (in `hermes_dockyard_plugin/desktop`) writes `src/styles/theme-assets.js`
(data URLs), then `node build.mjs` bundles it into `plugin.js`.
