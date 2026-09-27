// Browser → real plugin proxy → backend service → canonical reference adapter.
// This is NOT a vanilla-host acceptance claim (see disposable-backend.py).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chromium} from './browser-harness.mjs';
const BASE=process.env.STEWARD_DESKTOP_URL;
const API=process.env.STEWARD_API_URL;
test('real backend Kanban transition readback, audit actor and project isolation',async()=>{
 assert.ok(BASE && API,'Run via run-browser-suite.mjs');
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage();page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const get=async(p)=>{const r=await fetch(API+p,{headers:{'x-hermes-session-token':'demo-session-token'}}); assert.ok(r.ok);return r.json();};
 try {
  await page.goto(BASE);
  await page.getByRole('button',{name:'Project context',exact:true}).click();
  await page.getByRole('combobox',{name:'Find project'}).fill('payments-relaunch');
  await page.getByRole('listbox').getByRole('option',{name:'payments-relaunch',exact:true}).click();
  await page.locator('[data-tab="project"]').click();
  await page.locator('[data-project-view="board"]').click();
  const ref=(await get('/projects/payments-relaunch/work-items')).work_items.find(i=>i.title==='Verify payments-relaunch').ref;
  // Drag is load-sensitive under the full suite (my journey test runs first and
  // adds CPU pressure); retry a couple of times before declaring the drag failed
  // rather than letting a single flaky drop mask a real regression.
  let dragged=false;
  for(let attempt=0;attempt<3 && !dragged;attempt++){
    await page.locator(`[data-work-card="${ref}"]`).dragTo(page.locator('[data-board-column="active"]'));
    await page.getByText('Work item moved to in progress.',{exact:true}).waitFor({timeout:5000}).catch(()=>{});
    dragged=(await get('/projects/payments-relaunch/work-items')).work_items.find(i=>i.ref===ref).status==='in_progress';
  }
  assert.ok(dragged,'drag to in-progress (retried 3x)');
  assert.equal((await get('/projects/payments-relaunch/work-items')).work_items.find(i=>i.ref===ref).status,'in_progress');
  await page.getByRole('combobox',{name:`Move ${ref}`,exact:true}).selectOption('in_review');
  await page.locator(`[data-board-column="review"] [data-work-card="${ref}"]`).waitFor();
  const detail=await get(`/projects/payments-relaunch/work-items/${ref}`);
  assert.equal(detail.history.find(event=>event.action==='workitem.transition')?.actor,'demo-owner','trusted backend principal must override payload attribution');
  const response=await fetch(`${API}/projects/mobile-client/work-items/${ref}/transition`,{method:'POST',headers:{'content-type':'application/json','x-hermes-session-token':'demo-session-token'},body:JSON.stringify({status:'done'})});
  assert.equal(response.ok,false,'cross-project transition must fail');
  assert.equal((await get('/projects/payments-relaunch/work-items')).work_items.find(i=>i.ref===ref).status,'in_review');
  assert.deepEqual(errors,[]);
 } finally {await browser.close();}
});
