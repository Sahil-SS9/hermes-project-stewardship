// DOM interaction tests: plugin registers with the host registry and
// renders the app shell. jsdom + the built bundle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const bundle = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');

function boot() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    runScripts: 'outside-only',
    url: 'https://dashboard.local/',
  });
  const calls = [];
  dom.window.__HERMES_PLUGIN_SDK__ = {
    sdkVersion: '1.1.0',
    React: { createElement: (t, p, c) => ({ t, p, c }) },
    hooks: {
      useEffect: () => {},
      useRef: () => ({ current: null }),
    },
    fetchJSON: async () => ({}),
  };
  dom.window.__HERMES_PLUGINS__ = {
    register: (name, comp) => calls.push({ name, comp }),
  };
  dom.window.eval(bundle);
  return { dom, calls };
}

test('registers hermes-dockyard tab with the host registry', async () => {
  const { calls } = boot();
  await new Promise((r) => setTimeout(r, 50)); // registration is async (whenReady)
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'hermes-dockyard');
  assert.equal(typeof calls[0].comp, 'function');
});

test('bundle is non-empty iife without external react import', () => {
  assert.ok(bundle.length > 1000);
  assert.ok(!/from\s+['"]react['"]/.test(bundle));
});
