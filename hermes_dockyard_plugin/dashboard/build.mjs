import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  format: 'iife',
  target: 'es2022',
  minify: false,
  sourcemap: false,
  external: ['react'], // host provides React via SDK
});

// style.css is plain CSS — copy verbatim (no imports to resolve yet)
import { copyFileSync, readFileSync, statSync } from 'node:fs';
copyFileSync('src/style.css', 'dist/style.css');

const meta = {
  name: 'hermes-dockyard',
  builtFrom: ['src/index.ts', 'src/app.ts', 'src/api.ts', 'src/style.css'],
};
writeFileSync('dist/build-meta.json', JSON.stringify(meta, null, 2) + '\n');

for (const f of ['dist/index.js', 'dist/style.css']) {
  const size = statSync(f).size;
  if (size === 0) throw new Error(`empty build output: ${f}`);
  console.log(`${f}: ${size} bytes`);
}
