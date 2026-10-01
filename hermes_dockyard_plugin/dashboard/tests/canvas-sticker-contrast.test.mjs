// D20: every planning sticker must stay readable in BOTH canvas themes.
//
// The palette has one home (src/workflow-canvas-css.ts). This test reads the
// light block and the dark block from that file, then checks each kind fill
// and each sticker colour against both ink tokens at WCAG AA (>= 4.5:1).
// A palette edit that makes any sticker unreadable fails here, not in review.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const HERE = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(HERE, '..', 'src', 'workflow-canvas-css.ts'), 'utf8');

const KINDS = ['evidence', 'claim', 'question', 'decision', 'plan_block', 'note', 'link', 'media'];
const COLOURS = ['yellow', 'green', 'blue', 'pink', 'purple', 'orange', 'coral', 'teal', 'lime', 'clay', 'slate', 'indigo'];

function block(theme) {
  const darkAt = CSS.search(/\.dockyard-root\[data-theme="dark"\]\s+\.dy-pc-scope,/);
  assert.ok(darkAt > 0, 'dark palette block must exist');
  const lightAt = CSS.search(/\.dy-pc-scope,\s*\n\.dy-pc-scope \.dy-pc\[data-canvas-theme="light"\] \{/);
  assert.ok(lightAt >= 0 && lightAt < darkAt, 'light palette block must exist before the dark one');
  const start = theme === 'dark' ? darkAt : lightAt;
  return CSS.slice(start, CSS.indexOf('}', start));
}

function token(text, name) {
  const m = text.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  assert.ok(m, `--${name} must be a 6-digit hex in this block`);
  return m[1];
}

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

for (const theme of ['light', 'dark']) {
  test(`planning stickers keep AA text contrast in the ${theme} canvas`, () => {
    const text = block(theme);
    const inks = { ink: token(text, 'dy-pc-ink'), 'ink-2': token(text, 'dy-pc-ink-2') };
    const fills = [
      ...KINDS.map((kind) => [`fill-${kind}`, token(text, `dy-pc-fill-${kind}`)]),
      ...COLOURS.map((colour) => [`sticker-${colour}`, token(text, `dy-pc-sticker-${colour}`)]),
    ];
    const failures = [];
    for (const [name, fill] of fills) {
      for (const [inkName, ink] of Object.entries(inks)) {
        const ratio = contrast(fill, ink);
        if (ratio < 4.5) failures.push(`${name} ${fill} vs ${inkName} ${ink} = ${ratio.toFixed(2)}:1`);
      }
    }
    assert.deepEqual(failures, [], failures.join('\n'));
  });
}

test('the sticker palette offered by the UI is exactly the palette styled here', () => {
  const ui = readFileSync(join(HERE, '..', '..', 'desktop', 'src', 'project', 'canvas.js'), 'utf8');
  const m = ui.match(/CANVAS_STICKER_COLOURS = Object\.freeze\(\[([^\]]*)\]\)/);
  assert.ok(m, 'canvas.js must declare CANVAS_STICKER_COLOURS');
  const offered = m[1].split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean).sort();
  assert.deepEqual(offered, [...COLOURS].sort());
  // ...and exactly the palette the server accepts (canvas_service.STICKER_COLOURS).
  const service = readFileSync(join(HERE, '..', '..', '..', 'src', 'hermes_project_stewardship', 'persistence', 'canvas_service.py'), 'utf8');
  const s = service.match(/STICKER_COLOURS = frozenset\(\{([^}]*)\}\)/);
  assert.ok(s, 'canvas_service.py must declare STICKER_COLOURS');
  assert.deepEqual(s[1].split(',').map((v) => v.trim().replace(/"/g, '')).filter(Boolean).sort(), [...COLOURS].sort());
  for (const colour of COLOURS) {
    assert.match(CSS, new RegExp(`\\.dy-pc-obj\\[data-canvas-colour="${colour}"\\]`), `${colour} must have a sticker rule`);
  }
});
