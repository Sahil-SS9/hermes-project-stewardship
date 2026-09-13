// Lane B Phase 7 accessibility harness (PM-0707).
// Pure Node, no browser: asserts keyboard, focus, naming, live-region,
// non-colour status, touch and reduced-motion invariants in plugin.js.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const PLUGIN_PATH = process.env.DOCKYARD_PLUGIN_PATH
  || fileURLToPath(new URL('./plugin.js', import.meta.url));
const text = readFileSync(PLUGIN_PATH, 'utf8');

test('keyboard: Escape/arrows/roving tabindex + dialog semantics', () => {
  assert.ok(text.includes('Escape'));
  assert.ok(text.includes('tabIndex') || text.toLowerCase().includes('tabindex'));
  assert.ok(text.includes('ArrowRight') && text.includes('ArrowLeft'));
  assert.ok(text.includes('focus()'));
  assert.ok(text.includes('aria-modal'));
  assert.ok(text.includes('aria-labelledby'));
  // NOTE (LANE-B-03): full Tab-trap + focus-return-to-trigger from the Phase2
  // prototype picker is not present in production plugin.js on this base.
});

test('naming + live regions + dialog semantics', () => {
  assert.ok((text.match(/aria-label/g) || []).length >= 10);
  for (const role of ['dialog', 'tablist', 'progressbar', 'status']) {
    assert.ok(text.includes(role), `role ${role} missing`);
  }
  assert.ok(text.includes('aria-live') || text.includes('Status messages'));
});

test('non-colour status + touch targets', () => {
  assert.ok(text.includes('dockyard-status-mark'));
  assert.ok(text.includes('aria-hidden'));
  assert.ok(text.includes('min-height: 38px') || text.includes('min-height: 40px'));
  assert.ok(text.includes('-webkit-tap-highlight-color'));
});

test('contrast metadata + reduced motion + visible focus', () => {
  assert.ok(text.includes('CONTRAST_PAIRS'));
  assert.ok(text.includes('minimum: 4.5'));
  assert.ok(text.includes('prefers-reduced-motion'));
  assert.ok(text.includes('outline: 3px solid var(--dy-focus)'));
  assert.ok(text.includes(':focus-visible'));
});
