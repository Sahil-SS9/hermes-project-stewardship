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
// Pin esbuild's working directory so module-path comments in plugin.js are the
// same whichever directory the build is launched from.
const REPO = join(DESKTOP, '..', '..');
const SRC = join(DESKTOP, 'src');
const OUT = join(DESKTOP, 'plugin.js');
// The copy Hermes Desktop installs from Git (the repo's top-level desktop/).
// A real file, not a symlink: Desktop copies desktop/ out of a temporary
// clone, so a link into the rest of the checkout dangles once it is gone.
const PUBLISHED = join(REPO, 'desktop', 'plugin.js');
const ENTRY = join(SRC, 'index.js');
const require = createRequire(join(DESKTOP, '..', 'dashboard', 'package.json'));
const { build } = require('esbuild');

if (!statSync(ENTRY).isFile()) throw new Error(`missing entry module: ${ENTRY}`);
mkdirSync(DESKTOP, { recursive: true });

const result = await build({
  entryPoints: [ENTRY],
  bundle: true,
  absWorkingDir: REPO,
  outfile: OUT,
  format: 'esm',
  target: 'es2022',
  platform: 'browser',
  minify: false,
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
const bytes = readFileSync(OUT);
writeFileSync(PUBLISHED, bytes);
const hash = createHash('sha256').update(bytes).digest('hex');
const relative = OUT.slice(DESKTOP.length + 1);
console.log(`${relative}: ${bytes.length} bytes sha256=${hash}`);
