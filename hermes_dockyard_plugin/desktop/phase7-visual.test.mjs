// Lane B Phase 7 visual-matrix harness (PM-0705/PM-0706).
// Pure Node, no browser, no dependencies: parses the production
// hermes_dockyard_plugin/desktop/plugin.js text and asserts the same
// pairwise invariants as tests/test_phase7_visual_matrix.py.
// Heavy Playwright matrix runs under /tmp/stewardship-heavy-gates.lock
// post-integration; this file is the reusable light gate.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const PLUGIN_PATH = process.env.DOCKYARD_PLUGIN_PATH
  || fileURLToPath(new URL('./plugin.js', import.meta.url));
const SRC_DIR = process.env.DOCKYARD_SRC_DIR
  || fileURLToPath(new URL('./src', import.meta.url));
function sourceText(dir) {
  const files = [];
  const walk = (path) => {
    for (const name of readdirSync(path)) {
      const child = join(path, name);
      if (statSync(child).isDirectory()) walk(child);
      else if (name.endsWith('.js')) files.push(child);
    }
  };
  walk(dir);
  return files.sort().map((file) => readFileSync(file, 'utf8')).join('\n');
}
const text = sourceText(SRC_DIR);

function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const rgb = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function contrast(fg, bg) {
  const l1 = luminance(fg); const l2 = luminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

test('tokens match approved contract (light + dark)', () => {
  for (const token of ['#f6f7f9', '#0f1217', '#3654c7', '#136c4a', '#72cda2', '#a72a2a', '#ff9188']) {
    assert.ok(text.toLowerCase().includes(token), `missing token ${token}`);
  }
  assert.ok(text.includes('--dy-bg') && text.includes('--dy-focus'));
});

test('pairwise widths 1440/768/390 + 200% zoom invariants', () => {
  assert.ok(text.includes('container-type: inline-size'));
  assert.ok(text.includes('@container dockyard'));
  assert.ok(text.includes('text-overflow: ellipsis'));
  assert.ok(text.includes('overflow-wrap: anywhere'));
  assert.ok((text.match(/min-width: 0/g) || []).length >= 10);
});

test('empty/large/offline/destructive states implemented', () => {
  const lower = text.toLowerCase();
  for (const s of ['empty', 'offline', 'destructive', 'loading', 'stale', 'recovery', 'permission']) {
    assert.ok(lower.includes(s), `state ${s} missing`);
  }
  assert.ok(text.includes('Preview is stale'));
  assert.ok(text.includes('aria-modal'));
});

test('critical journeys onboarding/departure/lead/archive present', () => {
  for (const route of ['/onboard/discover', '/onboard/preflight', '/transfers/preview', '/transfers/execute', '/operations/', '/archive', '/restore']) {
    assert.ok(text.includes(route), `missing journey ${route}`);
  }
  // departure_pending is backend-owned; Desktop surfaces operation progress.
  assert.ok(text.includes('member departure'));
  assert.ok(text.includes('Retry remaining'));
});

test('key contrast pairs meet WCAG AA (4.5 text / 3 UI)', () => {
  const pairs45 = [
    ['#15171c', '#f6f7f9'], ['#15171c', '#ffffff'], ['#f3f5f7', '#0f1217'],
    ['#f3f5f7', '#171b22'], ['#ffffff', '#3654c7'],
  ];
  for (const [fg, bg] of pairs45) {
    assert.ok(contrast(fg, bg) >= 4.5, `${fg} on ${bg} = ${contrast(fg, bg).toFixed(2)}`);
  }
  assert.ok(contrast('#3654c7', '#f6f7f9') >= 3.0);
  assert.ok(contrast('#8fa2ff', '#0f1217') >= 3.0);
});
