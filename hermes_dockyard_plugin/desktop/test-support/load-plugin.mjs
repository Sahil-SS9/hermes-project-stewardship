// Shared Node test loader for the Desktop source modules.
// Test-only: the shipped runtime is a single ESM blob; this helper bundles the
// supplied artifact for its import contract, then evaluates the maintained
// source tree for jsdom with the legacy TypeScript canvas test double.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DESKTOP = join(HERE, '..');
const DASHBOARD = join(DESKTOP, '..', 'dashboard');
const require = createRequire(join(DASHBOARD, 'package.json'));
const React = require('react');
const rt = require('react/jsx-runtime');
const { buildSync } = require('esbuild');

export const ALLOWED_IMPORTS = Object.freeze([
  '@hermes/plugin-sdk',
  'react',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
]);

// The generated source graph currently emits the JSX runtime plus React and
// the SDK. Keep the assertion explicit rather than accepting a broad set.

const CANVAS_EXTERNALS = Object.freeze([
  './workflow-canvas-mount.js',
  '../runtime/workflow-canvas-mount.js',
]);

function buildOptions(stdin, bundle) {
  return {
    stdin: { contents: stdin, resolveDir: DESKTOP, sourcefile: 'plugin.js', loader: 'js' },
    bundle,
    write: false,
    format: bundle ? 'cjs' : 'esm',
    platform: bundle ? 'node' : 'browser',
    target: 'es2022',
    metafile: true,
    // Resolve packages from the dashboard workspace, where the test-only React
    // and JSX runtimes are installed.
    absWorkingDir: DASHBOARD,
    nodePaths: [join(DASHBOARD, 'node_modules')],
    ...(bundle ? { external: [...ALLOWED_IMPORTS, ...CANVAS_EXTERNALS] } : {}),
  };
}

export function sourceImports(source) {
  // Parse imports through esbuild's metafile rather than matching arbitrary
  // source text. This keeps string literals and comments out of the result.
  const result = buildSync(buildOptions(source, false));
  const output = Object.values(result.metafile.outputs)[0];
  return (output.imports ?? []).map((entry) => entry.path);
}

function evaluateBuilt(result, imports, source, host) {
  const module = { exports: {} };
  const localRequire = (name) => {
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime' || name === 'react/jsx-dev-runtime') return rt;
    if (name === '@hermes/plugin-sdk') return { host };
    if (name.endsWith('workflow-canvas-mount.js')) {
      return {
        mountDesktopWorkflowCanvas: (...args) => {
          const runtime = globalThis.__dockyardRuntime;
          const jsxRuntime = globalThis.__dockyardJsxRuntime;
          if (runtime.mountDesktopWorkflowCanvas) {
            return runtime.mountDesktopWorkflowCanvas(...args);
          }
          if (jsxRuntime?.mountDesktopWorkflowCanvas) {
            return jsxRuntime.mountDesktopWorkflowCanvas(...args);
          }
          return () => undefined;
        },
        validateConnection: (...args) => {
          const runtime = globalThis.__dockyardRuntime;
          return runtime.validateConnection
            ? runtime.validateConnection(...args)
            : null;
        },
      };
    }
    throw new Error(`unexpected bundled require: ${name}`);
  };
  // Test-only adapter. The shipped ESM contains no eval/new Function; only this
  // Node harness needs to execute the CJS translation produced by esbuild.
  const code = `${result.outputFiles[0].text}\n;if (typeof DOCKYARD_TEST !== 'undefined') module.exports.DOCKYARD_TEST = DOCKYARD_TEST;`;
  const evaluate = new Function('require', 'module', 'exports', code);
  evaluate(localRequire, module, module.exports);
  return {
    plugin: module.exports.default,
    test: module.exports.DOCKYARD_TEST ?? null,
    imports,
    source,
  };
}

export function evaluatePlugin(source, host, options = {}) {
  const imports = sourceImports(source);
  if (options.assertImports !== false) {
    assert.deepEqual(
      [...new Set(imports)].sort(),
      ['@hermes/plugin-sdk', 'react', 'react/jsx-runtime'],
      `unsupported or missing imports: ${imports.join(', ')}`,
    );
  }

  globalThis.__dockyardRuntime = options.runtime ?? globalThis.__dockyardRuntime ?? {};
  globalThis.__dockyardJsxRuntime = rt;
  // Evaluate the maintained source tree, not the already-generated blob. The
  // source tree is the stable jsdom seam; the committed blob is validated by
  // loader-contract.test.mjs. `sourceIndex` is only an explicit test seam for
  // callers that need to load a candidate source tree.
  const result = buildSync({
    ...buildOptions('', true),
    stdin: undefined,
    entryPoints: [options.sourceIndex ?? join(DESKTOP, 'src', 'index.js')],
  });
  return evaluateBuilt(result, imports, source, host);
}

export function evaluateArtifact(source, host, options = {}) {
  const imports = sourceImports(source);
  if (options.assertImports !== false) {
    assert.deepEqual(
      [...new Set(imports)].sort(),
      ['@hermes/plugin-sdk', 'react', 'react/jsx-runtime'],
      `unsupported or missing imports: ${imports.join(', ')}`,
    );
  }
  globalThis.__dockyardRuntime = options.runtime ?? globalThis.__dockyardRuntime ?? {};
  globalThis.__dockyardJsxRuntime = rt;
  const result = buildSync(buildOptions(source, true));
  return evaluateBuilt(result, imports, source, host);
}
