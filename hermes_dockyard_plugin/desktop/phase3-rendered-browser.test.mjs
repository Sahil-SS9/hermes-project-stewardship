import assert from 'node:assert/strict'
import { test } from 'node:test'
import { chromium } from './browser-harness.mjs'
const BASE = process.env.STEWARD_DESKTOP_URL || 'http://127.0.0.1:19500/desktop'
const tabs = ['dashboard','project','backlog','workflows','inbox','notifications','onboard','settings']
test('Phase 3 rendered Desktop: scope isolation, dirty switching, keyboard and narrow layout', {timeout:120000}, async()=>{
 const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:820}});
 const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const picker=page.getByRole('button',{name:'Project context',exact:true});
 const select=async(id)=>{await picker.click();await page.getByRole('combobox',{name:'Find project'}).fill(id);await page.getByRole('listbox',{name:'Projects'}).getByRole('option',{name:id,exact:true}).click()};
 try {
  await page.goto(BASE,{waitUntil:'networkidle'});
  await page.getByRole('heading',{name:'Command Center',exact:true}).waitFor();
  assert.deepEqual(await page.locator('[data-tab]').evaluateAll(els=>els.map(e=>e.dataset.tab)),tabs);
  assert.equal(await picker.count(),1);
  // Dashboard metric strip is rendered from real backend data (restored check).
  assert.deepEqual(await page.locator('[data-metric]').evaluateAll(els=>els.map(e=>e.dataset.metric)),['projects','needs-your-review','on-track','evidence-files']);
  // Three fixture projects exist in the disposable backend; the metric must reflect real data.
  assert.equal(await page.locator('[data-metric="projects"] strong').innerText(),'3');
  assert.match(await page.locator('body').innerText(),/payments-relaunch/);
  assert.equal(await page.locator('[data-tab="dashboard"]').getAttribute('aria-selected'),'true');
  await page.locator('[data-tab="dashboard"]').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.evaluate(()=>document.activeElement?.dataset.tab),'project');
  await page.locator('[data-project-view="overview"].active').waitFor();
  assert.equal(await page.locator('[data-tab="project"]').getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('[data-tab="dashboard"]').getAttribute('aria-selected'),'false');
  await select('payments-relaunch');
  await page.locator('[data-project-dashboard="payments-relaunch"]').waitFor();
  // Delay a genuine earlier response; do not synthesize project data.
  await page.route('**/projects/mobile-client/settings',async route=>{const response=await route.fetch();await new Promise(r=>setTimeout(r,700));await route.fulfill({response})});
  await select('mobile-client');await select('payments-relaunch');
  await page.waitForTimeout(1000);
  await page.locator('[data-project-dashboard="payments-relaunch"]').waitFor();
  await page.locator('[data-project-view="settings"]').click();
  await page.getByRole('button',{name:/Edit configuration/}).click();
  await page.locator('[data-setting-field="mission"]').fill('Unsaved browser verification change');
  await select('mobile-client');
  await page.locator('[data-project-switch-confirm]').getByRole('button',{name:'Cancel',exact:true}).click();
  assert.match(await picker.innerText(),/payments-relaunch/);
  assert.equal(await page.locator('[data-setting-field="mission"]').inputValue(),'Unsaved browser verification change');
  await select('mobile-client');
  await page.locator('[data-project-switch-confirm]').getByRole('button',{name:'Discard',exact:true}).click();
  await page.locator('[data-project-dashboard="mobile-client"]').waitFor();
  assert.match(await picker.innerText(),/mobile-client/);
  const root=page.locator('.dockyard-root');
  const styles=await root.evaluate(el=>{const s=getComputedStyle(el);return {bg:s.backgroundColor,color:s.color,font:s.fontFamily}});
  assert.notEqual(styles.bg,'rgba(0, 0, 0, 0)');assert.notEqual(styles.color,'rgba(0, 0, 0, 0)');assert.ok(!styles.font.includes('Times New Roman'));
  await page.setViewportSize({width:390,height:844});
  await page.waitForTimeout(250);
  assert.ok((await root.boundingBox()).width<=390,'root must fit a 390px viewport');
  assert.equal(await page.locator('body').evaluate(el=>el.scrollWidth<=window.innerWidth+1),true);
  assert.ok(await page.locator('[data-tab="dashboard"]').isVisible());
  assert.ok(await picker.isVisible(),'project picker must stay reachable at narrow width');
  await select('payments-relaunch');await page.locator('[data-tab="dashboard"]').click();
  await page.getByRole('heading',{name:'Command Center',exact:true}).waitFor();
  assert.ok(await page.locator('[data-project-row="payments-relaunch"]').count());
  assert.deepEqual(errors,[]);
 } finally {await browser.close()}
})
