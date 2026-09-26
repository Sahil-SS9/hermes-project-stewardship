// Build the Desktop plugin from the hand-edited modules in src/.
//
// The Hermes Desktop runtime evaluates desktop/plugin.js as one blob and does
// not resolve relative imports. Keep this file generated: edit src/ instead.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DESKTOP = dirname(fileURLToPath(import.meta.url));
const SRC = join(DESKTOP, 'src');
const OUT = join(DESKTOP, 'plugin.js');
const ENTRY = join(SRC, 'index.js');
const require = createRequire(join(DESKTOP, '..', 'dashboard', 'package.json'));
const { build } = require('esbuild');

if (!statSync(ENTRY).isFile()) throw new Error(`missing entry module: ${ENTRY}`);
mkdirSync(DESKTOP, { recursive: true });

const result = await build({
  entryPoints: [ENTRY],
  bundle: true,
  outfile: OUT,
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  minify: false,
  // Keep a stable, review-friendly module order for the existing text probes.
  treeShaking: true,
  sourcemap: false,
  legalComments: 'none',
  // Keep the runtime seam exact: jsx-dev-runtime is allowed by the loader
  // contract but is not emitted by this source graph.
  external: ['react', 'react/jsx-runtime', '@hermes/plugin-sdk'],
  banner: {
    js: '// GENERATED — edit desktop/src/, then run node hermes_dockyard_plugin/desktop/build.mjs',
  },
});

if (result.errors.length) throw new Error(`esbuild reported ${result.errors.length} error(s)`);
const generated = readFileSync(OUT, 'utf8');
const initiativeMarker = '// hermes_dockyard_plugin/desktop/src/views/initiative.js';
const teamsMarker = '// hermes_dockyard_plugin/desktop/src/views/teams.js';
const initiativeAt = generated.indexOf(initiativeMarker);
const teamsAt = generated.indexOf(teamsMarker);
if (initiativeAt >= 0 && teamsAt > initiativeAt) {
  const initiativeEnd = teamsAt;
  const teamsEnd = generated.indexOf('\n// hermes_dockyard_plugin/desktop/', teamsAt + teamsMarker.length);
  if (teamsEnd >= 0) {
    const prefix = generated.slice(0, initiativeAt);
    const initiative = generated.slice(initiativeAt, initiativeEnd);
    const teams = generated.slice(teamsAt, teamsEnd);
    const suffix = generated.slice(teamsEnd);
    writeFileSync(OUT, `${prefix}${teams}${initiative}${suffix}`);
  }
}
const bytes = readFileSync(OUT);
const hash = createHash('sha256').update(bytes).digest('hex');
const relative = OUT.slice(DESKTOP.length + 1);
console.log(`${relative}: ${bytes.length} bytes sha256=${hash}`);
