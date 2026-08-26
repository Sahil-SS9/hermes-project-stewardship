// Product constraint (locked): the Dockyard dashboard must never reach for
// string→DOM sinks (innerHTML / outerHTML / insertAdjacentHTML), eval, or
// persistent storage (localStorage / sessionStorage / cookies). User and API
// text must stay inert — build the DOM with createElement / textContent /
// replaceChildren / appendChild and event listeners only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCE_FILES = ['src/index.ts', 'src/app.ts', 'src/api.ts'];
const DIST_FILES = ['dist/index.js', 'dist/style.css'];

const PROHIBITED = [
  { name: 'innerHTML', re: /\.innerHTML\b/ },
  { name: 'outerHTML', re: /\.outerHTML\b/ },
  { name: 'insertAdjacentHTML', re: /\.insertAdjacentHTML\b/ },
  { name: 'eval', re: /\beval\s*\(/ },
  { name: 'localStorage', re: /localStorage\b/ },
  { name: 'sessionStorage', re: /sessionStorage\b/ },
  { name: 'cookies', re: /(?:document\.cookie|\bcookieStore\b)/ },
];

function scan(files) {
  const hits = [];
  for (const rel of files) {
    const content = readFileSync(join(root, rel), 'utf8');
    for (const { name, re } of PROHIBITED) {
      if (re.test(content)) hits.push(`${rel}: ${name}`);
    }
  }
  return hits;
}

test('source and built dist are free of prohibited DOM/script/storage sinks', () => {
  const hits = [...scan(SOURCE_FILES), ...scan(DIST_FILES)];
  assert.deepEqual(hits, [], `prohibited patterns found:\n${hits.join('\n')}`);
});
