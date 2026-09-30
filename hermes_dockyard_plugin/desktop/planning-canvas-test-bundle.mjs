// Shared by the planning-canvas browser tests: bundle the REAL desktop
// plugin.js with the repo's own esbuild, mounted with a fetch-backed ctx.rest.
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = join(HERE, '..', '..');
export const DASHBOARD = join(REPO, 'hermes_dockyard_plugin', 'dashboard');
export const { chromium } = createRequire(join(DASHBOARD, 'package.json'))('playwright');

/** Bundle the REAL plugin.js with the repo's own esbuild (the shape every
 *  rendered desktop test uses). */
export function buildDesktopBundle() {
  const dir = mkdtempSync(join(tmpdir(), 'dockyard-pc-v6-'));
  const sdk = join(dir, 'sdk.js');
  const entry = join(dir, 'entry.jsx');
  const bundle = join(dir, 'bundle.js');
  writeFileSync(sdk, 'export const host = { navigate() {} };\n');
  writeFileSync(entry, [
    `import plugin from ${JSON.stringify(join(REPO, 'hermes_dockyard_plugin', 'desktop', 'plugin.js'))};`,
    "import React from 'react';",
    "import { createRoot } from 'react-dom/client';",
    'const ctx = {',
    "  rest: async (p, init = {}) => { const r = await fetch('/api' + p, { method: init.method || 'GET', headers: { 'content-type': 'application/json' }, body: init.method && init.method !== 'GET' ? JSON.stringify(init.body) : undefined }); if (!r.ok) { let detail = ''; try { detail = (await r.json())?.detail ?? ''; } catch {} throw Error(`${r.status}: ${detail}`); } return r.json(); },",
    '  os: { writeClipboard: async () => true },',
    '  registerMany(xs) { this.items = xs },',
    '};',
    'plugin.register(ctx);',
    "const page = ctx.items.find((x) => x.area === 'routes');",
    "createRoot(document.getElementById('root')).render(page.render());",
  ].join('\n'));
  const nm = join(DASHBOARD, 'node_modules');
  execFileSync(join(nm, '.bin', 'esbuild'), [
    entry, '--bundle', '--format=esm', `--outfile=${bundle}`, '--jsx=automatic',
    `--alias:@hermes/plugin-sdk=${sdk}`,
    `--alias:react=${join(nm, 'react')}`,
    `--alias:react/jsx-runtime=${join(nm, 'react', 'jsx-runtime.js')}`,
    `--alias:react-dom/client=${join(nm, 'react-dom', 'client.js')}`,
    '--log-level=error',
  ], { cwd: DASHBOARD });
  return { dir, code: readFileSync(bundle, 'utf8') };
}

