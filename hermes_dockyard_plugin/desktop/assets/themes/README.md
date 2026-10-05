# Dockyard themes: sources, licences and how the assets are made

Design round d + h (Sahil's demo feedback 04/10, round started 05/10). Prototype only
(branch proto/dh-r1) until Sahil picks which themes ship.

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

Recipe (v6 wallpaper rules: 42% opacity, 4px blur, saturation 0.9, brightness 0.78, one veil), baked
at 1440x810 with ImageMagick, then AVIF quality 62 (2-4 KB each; JPEG at 6x the size showed banding):

    convert -size 1440x810 xc:<theme bg> \( <art> [-modulate 100,<sat>,<hue>] -resize 1440x810^ \
      -gravity center -extent 1440x810 -virtual-pixel edge -blur 0x4 -modulate 78,90,100 \) \
      -compose dissolve -define compose:args=42 -composite \
      \( -size 1440x810 "gradient:rgba(<veil>,0.55)-rgba(<veil>,0.65)" \) -compose over -composite -strip <id>.png
    convert <id>.png -quality 62 <id>.avif

Brightest point of each baked background (blurred 12.5% sample) is in `theme-palettes.py`
(`ART_BRIGHTEST`); body text keeps at least 7:1 and secondary text 4.5:1 even over that point.

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
