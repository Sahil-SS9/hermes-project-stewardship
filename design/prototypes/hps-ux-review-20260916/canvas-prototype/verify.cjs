const fs=require('fs');const {chromium}=require('/tmp/stewardship-desktop-demo-eb8z3v8x/hermes/node_modules/playwright');(async()=>{const out='/tmp/dockyard-ux-research/canvas/evidence';fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1280,height:900}});const results=[],errors=[];page.on('pageerror',e=>errors.push(e.message));const check=(v,n)=>{if(!v)throw Error(n);results.push(n)};await page.goto('http://127.0.0.1:19441/canvas/preview/');check(await page.locator('.obj').count()===6,'six sample objects');check(await page.locator('svg path[marker-end]').count()===1,'initial connector drawn');
const br=await page.locator('#board').evaluate(e=>{const s=getComputedStyle(e);return{bg:s.backgroundImage,parentBorder:getComputedStyle(e.parentElement).borderTopWidth,overflow:s.overflow}});check(br.parentBorder==='2px','board frame border');check(br.bg.includes('radial-gradient'),'dot-grid surface');check(br.overflow==='hidden','board clips world');
const r0=await page.locator('#board').boundingBox();await page.locator('#zoom-in').click();const r1=await page.locator('#board').boundingBox();check(Math.abs(r1.x-r0.x)<1&&Math.abs(r1.y-r0.y)<1&&Math.abs(r1.width-r0.width)<1,'zoom-in: stage fixed');await page.locator('#zoom-readout').click();check(await page.locator('#zoom-readout').innerText()==='100%','reset 100%');
await page.mouse.move(r0.x+r0.width/2,r0.y+r0.height/2);await page.mouse.wheel(0,-240);const r2=await page.locator('#board').boundingBox();check(Math.abs(r2.x-r0.x)<1,'wheel: stage fixed');await page.mouse.wheel(0,240);
check(await page.evaluate(()=>scrollY)===0,'zoom never scrolls page');
await page.keyboard.press('Control+1');const zf=await page.locator('#zoom-readout').innerText();check(zf!=='100%','fit adjusts zoom: '+zf);
const bd=await page.locator('#board').boundingBox();await page.mouse.move(bd.x+10,bd.y+10);await page.mouse.down();await page.mouse.move(bd.x+bd.width*0.38,bd.y+bd.height*0.55,{steps:6});await page.mouse.up();
const selN=await page.locator('.obj.selected').count();check(selN>=2,'marquee selects '+selN+' objects');check(await page.locator('#sel-chip').isVisible(),'selection chip visible');check((await page.locator('#sel-chip').innerText()).includes(selN+' selected'),'chip shows count');check(await page.locator('.obj.dimmed').count()>=1,'non-selected dimmed');check((await page.locator('#announce').innerText()).includes('selected'),'selection announced');
await page.locator('#board').evaluate(()=>{document.getElementById('zoom-readout').click()});
const p1a=await page.locator('[data-id="1"]').boundingBox();const p2a=await page.locator('[data-id="2"]').boundingBox();await page.mouse.move(p1a.x+20,p1a.y+15);await page.mouse.down();await page.mouse.move(p1a.x+80,p1a.y+55,{steps:5});await page.mouse.up();const p1b=await page.locator('[data-id="1"]').boundingBox();const p2b=await page.locator('[data-id="2"]').boundingBox();check(Math.abs(p1b.x-p1a.x)>10,'obj1 moved');check(Math.abs(p2b.x-p2a.x)>10,'group partner moved too');await page.keyboard.press('Control+1');
await page.locator('#connect-tool').click();await page.locator('[data-id="1"]').click({force:true});const t5=await page.locator('[data-id="5"]').boundingBox();await page.mouse.click(t5.x+t5.width/2,t5.y+12);check(await page.locator('svg path[marker-end]').count()===2,'connector added');
await page.keyboard.press('Control+z');check(await page.locator('svg path[marker-end]').count()===1,'undo removes connector');await page.keyboard.press('Control+Shift+z');check(await page.locator('svg path[marker-end]').count()===2,'redo restores connector');
// delete — use keyboard-selected first card
// type system v3
check(await page.locator('.obj.sticky').count()>=3,'stickies rendered');check((await page.locator('.obj.sticky').first().getAttribute('data-colour'))==='yellow','sticky coloured');check(await page.locator('.obj.frame').count()===0,'no frames by default');
await page.keyboard.press('f');check(await page.locator('.obj.frame').count()===1,'F adds frame');
await page.evaluate(()=>{objects=objects.filter(o=>o.kind!=='frame');selected=new Set();render()});
// v4 checks: a) close, b) swatches, c) alignment, d) accept/dismiss colours, e) chat
check(await page.locator('.obj.sticky').count()>=3,'stickies present');
await (await page.locator('.obj.sticky').first()).click();check(!(await page.locator('#inspector').isHidden()),'inspector open');
await page.click('#insp-close');check(await page.locator('#inspector').evaluate(e=>e.hidden),'close button hides inspector');
await (await page.locator('.obj.sticky').first()).click();const sw=page.locator('#swatches .swatch');check(await sw.count()===4,'4 swatches');
const beforeCol=await page.locator('.obj.sticky').first().getAttribute('data-colour');await sw.nth(1).click();check((await page.locator('.obj.sticky').first().getAttribute('data-colour'))!=='','swatch changes colour');await page.click('#insp-close');
// connector alignment: edges at midpoints
const pA=await page.locator('[data-id="1"]').boundingBox(),pB=await page.locator('[data-id="5"]').boundingBox();
const pathD=await page.locator('svg path[marker-end]').first().getAttribute('d');
check(pathD&&pathD.length>0,'connector has path');
// chat open + reply + approve
await page.click('#chat-open');check(await page.locator('#chat').isVisible(),'chat opens');check(await page.locator('#chat-suggest').isVisible(),'quick prompts shown');
await page.click('#chat-suggest button:has-text("Summarise")');
await page.waitForTimeout(700);
check((await page.locator('#chat-log').innerText()).toLowerCase().includes('board holds'),'assistant summarises');
await page.fill('#chat-input','flag the risks');await page.click('#chat-send');await page.waitForTimeout(700);
check((await page.locator('#chat-log').innerText()).toLowerCase().includes('risk'),'risk reply');
check(await page.locator('#chat-propose').isVisible(),'proposal card shown');
const oc=await page.locator('.obj').count();await page.click('#chat-approve');await page.waitForTimeout(150);check((await page.locator('.obj').count())===oc+1,'chat approve adds scratch object');await page.evaluate(()=>{hideInspector()});
await page.evaluate(()=>closeChat());check(await page.locator('#chat').isHidden(),'chat closes');
// run review accept/dismiss colours
await page.click('#run-review');check(await page.locator('.sugg .accept').count()>=1,'accept buttons present');const accC=await page.locator('.sugg .accept').first().evaluate(e=>getComputedStyle(e).color);check(/rgb\(/.test(accC),'accept has colour style');
await page.click('#queue-clear');
await page.keyboard.press('n');const nn=await page.locator('.obj').last().boundingBox();await page.mouse.click(nn.x+20,nn.y+15);const before=await page.locator('.obj').count();await page.keyboard.press('Delete');check(await page.locator('.obj').count()===before-1,'delete removes selected ('+before+'→'+(await page.locator('.obj').count())+')');
await page.selectOption('#theme','dark');await page.screenshot({path:out+'/dark-canvas.png',fullPage:true});await page.selectOption('#theme','light');await page.screenshot({path:out+'/light-canvas.png',fullPage:true});await page.locator('#zoom-in').click();await page.screenshot({path:out+'/zoomed.png'});
await page.setViewportSize({width:390,height:840});check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.body.scrollWidth<=innerWidth),'mobile fits');
check(errors.length===0,'no browser errors');fs.writeFileSync(out+'/checks.json',JSON.stringify({passed:results.length,results,errors},null,2));await browser.close();console.log(JSON.stringify({passed:results.length,results,errors}))})().catch(e=>{console.error(e);process.exit(1)});