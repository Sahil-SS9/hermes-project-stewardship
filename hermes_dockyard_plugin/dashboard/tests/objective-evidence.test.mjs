import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const payload = JSON.parse(execFileSync(fileURLToPath(new URL('../../../.venv/bin/python', import.meta.url)), [fileURLToPath(new URL('../../../tests/phase2_payload.py', import.meta.url))], {encoding:'utf8'}));

test('project evidence renders explicit states and inert history', async () => {
 const dom = new JSDOM('<div id="root"></div>', {runScripts:'outside-only', url:'https://dashboard.local/'});
 dom.window.__HERMES_PLUGIN_SDK__ = { sdkVersion:'1.1.0', React:{createElement:()=>({})}, hooks:{useEffect:()=>{},useRef:()=>({current:null})}, fetchJSON: async url => {
  if(url.endsWith('/portfolio')) return {projects:[{project_id:'demo',status:'idle'}]};
  if(url.endsWith('/dashboard')) return {projects:[{id:'demo'}]};
  if(url.endsWith('/objectives')) return payload;
  return {};
 }};
 try {
  dom.window.eval(readFileSync(new URL('../dist/index.js', import.meta.url),'utf8'));
  await new Promise(resolve=>setTimeout(resolve,80));
  const button = dom.window.document.querySelector('[data-objectives-project="demo"]');
  assert.ok(button, 'project objective evidence button exists');
  button.click(); await new Promise(resolve=>setTimeout(resolve,80));
  const panel=dom.window.document.querySelector('[data-objective-evidence-panel]');
  assert.ok(panel);
  for (const state of ['passed','failed','stale','unknown']) assert.ok(panel.textContent.includes(state));
  assert.equal(panel.querySelectorAll('script').length,0);
  assert.ok(panel.textContent.includes('ticket:1'));
  assert.ok(panel.textContent.includes('insufficient data'));
 } finally { dom.window.close(); }
});
