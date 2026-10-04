import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixtureBrowser} from './browser-harness.mjs';

test('searchable project context, requested discard target and retained project routes', async()=>fixtureBrowser(async(page)=>{
 const select=async(id)=>{await page.getByRole('button',{name:'Project context',exact:true}).click(); await page.getByRole('combobox',{name:'Find project'}).fill(id); await page.getByRole('listbox',{name:'Projects'}).getByRole('option',{name:id,exact:true}).click();};
 await select('payments-relaunch');
 await page.locator('[data-tab="project"]').click();
 await page.locator('[data-project-view="overview"].active').waitFor();
 await page.locator('[data-project-view="settings"]').click();
 await page.getByRole('button',{name:/Edit configuration/}).click();
 await page.locator('[data-setting-field="mission"]').fill('Unsaved');
 await select('mobile-client');
 await page.locator('[data-project-switch-confirm]').getByRole('button',{name:'Cancel',exact:true}).click();
 assert.match(await page.getByRole('button',{name:'Project context',exact:true}).innerText(),/payments-relaunch/);
 await select('mobile-client');
 await page.locator('[data-project-switch-confirm]').getByRole('button',{name:'Discard',exact:true}).click();
 await page.locator('[data-project-dashboard="mobile-client"]').waitFor();
 await page.locator('[data-project-view="board"]').click();
 await page.locator('[data-saved-views-screen]').waitFor();
 // C2: milestone planning moved off the board into the Milestones sub-tab.
 await page.locator('[data-kanban-tab="milestones"]').click();
 await page.locator('[data-planning-panel]').waitFor();
 await page.locator('[data-project-view="initiative"]').click();
 await page.getByRole('heading',{name:'No initiative available'}).waitFor();
}));

test('Open workflow library with unsaved changes asks first; Cancel keeps the tab (Quan M1)', async()=>fixtureBrowser(async(page)=>{
 const select=async(id)=>{await page.getByRole('button',{name:'Project context',exact:true}).click(); await page.getByRole('combobox',{name:'Find project'}).fill(id); await page.getByRole('listbox',{name:'Projects'}).getByRole('option',{name:id,exact:true}).click();};
 await select('payments-relaunch');
 await page.locator('[data-tab="project"]').click();
 await page.locator('[data-project-view="settings"]').click();
 await page.getByRole('button',{name:/Edit configuration/}).click();
 await page.locator('[data-setting-field="mission"]').fill('Unsaved library edit');
 await page.locator('[data-project-view="workflows"]').click();
 await page.locator('[data-action="open-workflow-library"]').click();
 const prompt=page.locator('[data-project-switch-confirm]');
 await prompt.waitFor();
 assert.equal(await prompt.getAttribute('data-nav-target'),'tab:workflows');
 await prompt.getByRole('button',{name:'Cancel',exact:true}).click();
 assert.equal(await prompt.count(),0);
 await page.locator('[data-project-view="workflows"].active').waitFor();
 assert.equal(await page.locator('[data-action="open-workflow-library"]').count(),1,'still on the project Workflows view, not the library');
 await page.locator('[data-action="open-workflow-library"]').click();
 await prompt.getByRole('button',{name:'Discard',exact:true}).click();
 await page.locator('[data-action="open-workflow-library"]').waitFor({state:'detached'});
}));

test('Kanban drag reads back, keyboard alternative and errors never claim success', async()=>fixtureBrowser(async(page,base)=>{
 const errors=[]; page.on('pageerror',e=>errors.push(String(e)));
 await page.getByRole('button',{name:'Project context',exact:true}).waitFor();
 const initiallySelected = await page.getByRole('button',{name:'Project context',exact:true}).innerText();
 assert.notEqual(initiallySelected, 'Choose project');
 await page.locator('[data-tab="notifications"]').click();
 assert.equal(await page.getByRole('button',{name:'Project context',exact:true}).innerText(), initiallySelected);
 await page.locator('[data-tab="project"]').click();
 await page.locator('[data-project-view="board"]').click();
 await page.locator('[data-work-card="HDY-13"]').dragTo(page.locator('[data-board-column="active"]'));
 await page.getByText('Work item moved to in progress.',{exact:true}).waitFor();
 await page.locator('[data-board-column="active"] [data-work-card="HDY-13"]').waitFor();
 await page.getByRole('combobox',{name:'Move HDY-13'}).selectOption('blocked');
 await page.locator('[data-board-column="blocked"] [data-work-card="HDY-13"]').waitFor();
 assert.deepEqual(errors,[]);
}));
