import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const DASHBOARD = path.join(REPO, 'hermes_dockyard_plugin', 'dashboard');
const require = createRequire(path.join(DASHBOARD, 'package.json'));
export const { chromium } = require('playwright');

const PORT = Number(process.env.PHASE4_PORT || 19501);
const BASE = `http://127.0.0.1:${PORT}`;

export function buildBundle(realBackend = false) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hps-p4-'));
  const sdk = path.join(outDir, 'sdk.js');
  const entry = path.join(outDir, 'entry.jsx');
  const bundle = path.join(outDir, 'bundle.js');
  fs.writeFileSync(sdk, 'export const host = { navigate() {} };\n');
  fs.writeFileSync(entry, [
    `import plugin from ${JSON.stringify(path.join(REPO, 'hermes_dockyard_plugin', 'desktop', 'plugin.js'))};`,
    "import React from 'react';",
    "import { createRoot } from 'react-dom/client';",
    'const ctx = {',
    '  rest: async (p, init = {}) => {',
    realBackend ? "    const r = await fetch('/api/plugins/hermes-dockyard' + p, { method: init.method || 'GET', headers: { 'content-type': 'application/json', 'x-hermes-session-token': 'demo-session-token' }," : "    const r = await fetch('/api' + p, { method: init.method || 'GET', headers: { 'content-type': 'application/json' },",
    "      body: init.method && init.method !== 'GET' ? JSON.stringify(init.body) : undefined });",
    "    if (!r.ok) { let detail = ''; try { detail = (await r.json())?.detail ?? ''; } catch {} throw Error(`${r.status}: ${detail}`); }",
    '    return r.json();',
    '  },',
    '  os: { writeClipboard: async () => true },',
    '  registerMany(xs) { this.items = xs },',
    '};',
    'plugin.register(ctx);',
    "const page = ctx.items.find((x) => x.area === 'routes');",
    "createRoot(document.getElementById('root')).render(page.render());",
  ].join('\n'));
  const nm = path.join(DASHBOARD, 'node_modules');
  execFileSync(path.join(nm, '.bin', 'esbuild'), [
    entry, '--bundle', '--format=esm', `--outfile=${bundle}`, '--jsx=automatic',
    `--alias:@hermes/plugin-sdk=${sdk}`,
    `--alias:react=${path.join(nm, 'react')}`,
    `--alias:react/jsx-runtime=${path.join(nm, 'react/jsx-runtime.js')}`,
    `--alias:react-dom/client=${path.join(nm, 'react-dom', 'client.js')}`,
    '--log-level=error',
  ], { cwd: DASHBOARD });
  return { outDir, bundle };
}


export async function fixtureBrowser(run) {
 const {outDir,bundle}=buildBundle();
 const port=19651;
 const host=spawn(process.execPath,[path.join(HERE,'phase4-host.mjs')],{env:{...process.env,PHASE4_PORT:String(port),PHASE4_BUNDLE:bundle}});
 let browser;
 try {
  for(let n=0;;n++){try {if((await fetch(`http://127.0.0.1:${port}/health`)).ok)break;}catch{} if(n>80)throw Error('fixture not ready'); await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true}); const page=await browser.newPage(); page.setDefaultTimeout(5000);
  await page.goto(`http://127.0.0.1:${port}/desktop`); await page.locator('[data-tab="project"]').waitFor();
  await run(page,`http://127.0.0.1:${port}`);
 } finally {await browser?.close();host.kill();fs.rmSync(outDir,{recursive:true,force:true});}
}
