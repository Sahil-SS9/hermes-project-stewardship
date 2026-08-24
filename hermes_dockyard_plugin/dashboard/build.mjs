import { build } from 'esbuild';
import { writeFileSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// cor-008: anchor every path to this script's directory so a wrong-cwd
// invocation can never silently "build" into the wrong place.
const dir = dirname(fileURLToPath(import.meta.url));

mkdirSync(join(dir, 'dist'), { recursive: true });

await build({
  entryPoints: [join(dir, 'src/index.ts')],
  bundle: true,
  outfile: join(dir, 'dist/index.js'),
  format: 'iife',
  target: 'es2022',
  minify: false,
  sourcemap: false,
  external: ['react'], // host provides React via SDK
});

// style.css is plain CSS — copy verbatim (no imports to resolve yet)
const cssSrc = join(dir, 'src/style.css');
if (!statSync(cssSrc).isFile()) {
  throw new Error(`missing source stylesheet: ${cssSrc}`);
}
copyFileSync(cssSrc, join(dir, 'dist/style.css'));

const meta = {
  name: 'hermes-dockyard',
  builtFrom: ['src/index.ts', 'src/app.ts', 'src/api.ts', 'src/style.css'],
};
writeFileSync('dist/build-meta.json', JSON.stringify(meta, null, 2) + '\n');

for (const rel of ['dist/index.js', 'dist/style.css']) {
  const f = join(dir, rel);
  const size = statSync(f).size;
  if (size === 0) throw new Error(`empty build output: ${f}`);
  console.log(`${rel}: ${size} bytes`);
}
