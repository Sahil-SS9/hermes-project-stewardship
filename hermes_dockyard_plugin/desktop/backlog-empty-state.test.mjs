// #28: real React renders of maintained source AND the shipped Desktop artifact.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const desktop = dirname(fileURLToPath(import.meta.url));
const dashboard = join(desktop, '..', 'dashboard');
const require = createRequire(join(dashboard, 'package.json'));
const { buildSync } = require('esbuild');
const React = require('react');
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');

function load(artifact) {
  const contents = artifact
    ? readFileSync(join(desktop, 'plugin.js'), 'utf8') + '\nexport { BacklogView, bindContext, loadBacklogData };'
    : `export { BacklogView } from './src/views/backlog.js';
       export { bindContext } from './src/runtime/context.js';
       export { loadBacklogData } from './src/data/loaders.js';`;
  const built = buildSync({
    stdin: { contents, resolveDir: desktop, loader: 'js' },
    absWorkingDir: dashboard, bundle: true, write: false, platform: 'node',
    format: 'cjs', target: 'es2022', nodePaths: [join(dashboard, 'node_modules')],
    external: ['react', 'react/jsx-runtime', '@hermes/plugin-sdk'],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', built.outputFiles[0].text)(
    name => name === '@hermes/plugin-sdk' ? { host: {} } : require(name), module, module.exports);
  return module.exports;
}

for (const artifact of [false, true]) {
  test(`Backlog empty/project transitions: ${artifact ? 'shipped bundle' : 'maintained source'}`, async () => {
    const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://local.test/' });
    const keys = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'CustomEvent'];
    const previous = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const actEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
    let root;
    try {
      for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: dom.window[key] });
      globalThis.IS_REACT_ACT_ENVIRONMENT = true;
      const mod = load(artifact);
      const calls = [], errors = [];
      mod.bindContext({ rest: async (path) => { calls.push(path); return path === '/dashboard' ? { projects: [] } : { operations: [] }; } });
      class Boundary extends React.Component {
        state = { error: null };
        static getDerivedStateFromError(error) { return { error }; }
        componentDidCatch(error) { errors.push(error.message); }
        render() { return this.state.error ? React.createElement('div', { 'data-test-error': true }, this.state.error.message) : this.props.children; }
      }
      root = createRoot(dom.window.document.getElementById('root'), { onCaughtError() {} });
      const empty = await mod.loadBacklogData();
      for (const id of [null, 'first', null, 'second', 'third', null]) {
        const view = id === null ? empty : { project: { id, enabled: true, phase: 'active' },
          projects: [], backlog: [], workItems: [], initiatives: [], bots: [] };
        await React.act(async () => {
          root.render(React.createElement(Boundary, null, React.createElement(mod.BacklogView, { view, onRefresh() {} })));
        });
        assert.deepEqual(errors, [], 'Backlog must not throw or change its hook order');
        assert.equal(dom.window.document.querySelector('[data-test-error]'), null);
        if (id === null) assert.match(dom.window.document.body.textContent, /No project selected/);
        else assert.match(dom.window.document.body.textContent, /Backlog/);
        if (id === 'second') {
          const openCreate = dom.window.document.querySelector('[data-action="open-create-backlog-item"]');
          assert(openCreate && !openCreate.disabled);
          await React.act(async () => openCreate.click());
          assert.equal(dom.window.document.querySelector('[data-create-backlog-layer]').hidden, false);
          // Refreshing this project must retain its own draft/modal state.
          await React.act(async () => {
            root.render(React.createElement(Boundary, null, React.createElement(mod.BacklogView, { view: { ...view }, onRefresh() {} })));
          });
          assert.equal(dom.window.document.querySelector('[data-create-backlog-layer]').hidden, false);
        }
        if (id === 'third') {
          assert.equal(dom.window.document.querySelector('[data-create-backlog-layer]').hidden, true,
            'switching projects must discard the previous project modal/draft state');
        }
      }
      assert(!calls.some(path => /null|undefined/.test(path)), 'no requests for a missing project');
    } finally {
      if (root) await React.act(async () => root.unmount());
      dom.window.close();
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
      }
      globalThis.IS_REACT_ACT_ENVIRONMENT = actEnvironment;
    }
  });
}
