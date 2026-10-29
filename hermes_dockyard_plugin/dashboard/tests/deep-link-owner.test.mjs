// Regression test for the v0.5.4 community review, finding 6:
// "Task notifications can open the wrong destination. From 'All projects',
//  clicking Open can show the project chooser instead of the task because
//  navigation loses the notification's owning project."
//
// The router is compiled from the real source with the project's own esbuild,
// so this exercises shipped logic rather than a copy of it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Build into a temp dir so the repo and dist/ stay untouched by a test run.
const outfile = join(mkdtempSync(join(tmpdir(), 'hps-deeplink-')), 'deep-link.mjs');
await build({
  entryPoints: [fileURLToPath(new URL('../src/deep-link.ts', import.meta.url))],
  bundle: true,
  outfile,
  format: 'esm',
  target: 'es2022',
  logLevel: 'silent',
});
const { applyFleetDeepLink } = await import(pathToFileURL(outfile).href);

// "All projects" is the reported starting point: no project selected.
function allProjects() {
  return { tab: 'dashboard', projectId: '', selectedWorkRef: null };
}

function navigate(link, ownerProjectId) {
  const s = allProjects();
  let rendered = 0;
  applyFleetDeepLink({ link, s, tabs: [], go: () => { rendered += 1; }, ownerProjectId });
  return { s, rendered };
}

test('a task notification opens the task, carrying its project', () => {
  const { s, rendered } = navigate('s2:work/UNI-1', 'beta');

  assert.equal(s.tab, 'work');
  assert.equal(s.selectedWorkRef, 'UNI-1');
  assert.equal(s.projectId, 'beta', 'the work tab had no project and fell back to the chooser');
  assert.equal(rendered, 1);
});

test('an approval notification opens the inbox on its own project', () => {
  const { s } = navigate('s6:initiative/INI-B1', 'beta');

  assert.equal(s.tab, 'inbox');
  assert.equal(s.projectId, 'beta');
});

test('the inbox screen link carries its project too', () => {
  const { s } = navigate('s4:inbox', 'beta');

  assert.equal(s.tab, 'inbox');
  assert.equal(s.projectId, 'beta');
});

test('a project named by the link itself still wins', () => {
  const { s } = navigate('s2:project/alpha', 'beta');

  assert.equal(s.projectId, 'alpha');
  assert.equal(s.tab, 'work');
});

test('without an owner the previous behaviour is unchanged', () => {
  const s = { tab: 'dashboard', projectId: 'alpha', selectedWorkRef: null };
  applyFleetDeepLink({ link: 's2:work/UNI-1', s, tabs: [], go: () => {} });

  assert.equal(s.projectId, 'alpha');
  assert.equal(s.selectedWorkRef, 'UNI-1');
});

test('a malformed link navigates nowhere', () => {
  const s = allProjects();
  let rendered = 0;
  applyFleetDeepLink({ link: 'nonsense', s, tabs: [], go: () => { rendered += 1; } });

  assert.equal(rendered, 0);
  assert.equal(s.tab, 'dashboard');
});

test('the tab strip follows the programmatic navigation', () => {
  const tab = {
    dataset: { tab: 'work' },
    classList: { toggle(_name, on) { this.on = on; } },
    setAttribute(name, value) { this[name] = value; },
  };
  const s = allProjects();
  applyFleetDeepLink({ link: 's2:work/UNI-1', s, tabs: [tab], go: () => {}, ownerProjectId: 'beta' });

  assert.equal(tab.classList.on, true);
  assert.equal(tab['aria-selected'], 'true');
});
