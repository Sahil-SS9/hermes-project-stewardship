const $=s=>document.querySelector(s);
// ---- state ----
let objects=[
 {id:1,kind:'sticky',colour:'yellow',x:24,y:24,text:'Checkout p95 latency breached 800ms under 3x load.',state:'scratch'},
 {id:2,kind:'sticky',colour:'pink',x:24,y:196,text:'Idempotency keys might remove the retry double-charge entirely.',state:'scratch'},
 {id:3,kind:'task',x:216,y:24,text:'Load-test new checkout flow with 3x peak traffic.',state:'promoted',ref:'DEMO-14'},
 {id:4,kind:'link',x:216,y:196,url:'https://docs.example.com/idempotency',label:'Idempotency API reference',state:'scratch'},
 {id:5,kind:'sticky',colour:'yellow',x:24,y:368,text:'Support reported 4 duplicate-charge complaints this week.',state:'scratch'},
 {id:6,kind:'sticky',colour:'green',x:216,y:368,text:'Consider webhook replay protection for legacy listener.',state:'scratch',ai:true}
];
let connections=[{from:2,to:3}];
let selected=new Set(),cronOn=false,assistantOn=true,queue=[];
let cam={x:0,y:0,z:1};
let history=[],future=[];
const KIND_LABEL={sticky:'Sticky',task:'Task',link:'Link',frame:'Frame'};
const W=210,OH=150,WORLD_W=2400,WORLD_H=1500;
const world=()=>$('#world');
// ---- history ----
function pushHistory(){history.push(JSON.stringify({objects,connections}));if(history.length>60)history.shift();future=[]}
function undo(){if(!history.length)return;future.push(JSON.stringify({objects,connections}));const s=JSON.parse(history.pop());objects=s.objects;connections=s.connections;selected=new Set();hideInspector();render();$('#announce').textContent='Undo'}
function redo(){if(!future.length)return;history.push(JSON.stringify({objects,connections}));const s=JSON.parse(future.pop());objects=s.objects;connections=s.connections;selected=new Set();hideInspector();render();$('#announce').textContent='Redo'}
$('#undo').onclick=undo;$('#redo').onclick=redo;
// ---- camera (world layer only — board frame NEVER moves) ----
function applyCam(){world().style.transform=`translate(${cam.x}px,${cam.y}px) scale(${cam.z})`;$('#zoom-readout').textContent=Math.round(cam.z*100)+'%'}
function zoomAt(factor,cx,cy){const rect=$('#board').getBoundingClientRect();const px=cx-rect.left,py=cy-rect.top;const nz=Math.min(4,Math.max(0.25,cam.z*factor));const k=nz/cam.z;cam.x=px-(px-cam.x)*k;cam.y=py-(py-cam.y)*k;cam.z=nz;applyCam()}
$('#zoom-in').onclick=()=>{const r=$('#board').getBoundingClientRect();zoomAt(1.25,r.left+r.width/2,r.top+r.height/2);$('#announce').textContent='Zoomed in.'};
$('#zoom-out').onclick=()=>{const r=$('#board').getBoundingClientRect();zoomAt(1/1.25,r.left+r.width/2,r.top+r.height/2);$('#announce').textContent='Zoomed out.'};
$('#zoom-readout').onclick=()=>{cam={x:0,y:0,z:1};applyCam();$('#announce').textContent='Zoom reset to 100%.'};
$('#zoom-fit').onclick=fit;
function fit(){if(!objects.length){cam={x:0,y:0,z:1};applyCam();return}const minX=Math.min(...objects.map(o=>o.x))-30,minY=Math.min(...objects.map(o=>o.y))-30,maxX=Math.max(...objects.map(o=>o.x+W))+30,maxY=Math.max(...objects.map(o=>o.y+OH))+30;const r=$('#board').getBoundingClientRect();const availW=r.width-24,availH=r.height-24;cam.z=Math.min(2,Math.max(.25,Math.min(availW/(maxX-minX),availH/(maxY-minY))));cam.x=-minX*cam.z+(r.width-(maxX-minX)*cam.z)/2;cam.y=-minY*cam.z+(r.height-(maxY-minY)*cam.z)/2;applyCam();$('#announce').textContent='Fit all objects.'}
// wheel zoom at cursor (page never scrolls)
$('#board').addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.deltaY<0?1.12:1/1.12,e.clientX,e.clientY)},{passive:false});
// pinch
let pinch=null;
$('#board').addEventListener('touchstart',e=>{if(e.touches.length===2){pinch={d:Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY)};e.preventDefault()}},{passive:false});
$('#board').addEventListener('touchmove',e=>{if(pinch&&e.touches.length===2){const nd=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);zoomAt(nd/pinch.d,(e.touches[0].clientX+e.touches[1].clientX)/2,(e.touches[0].clientY+e.touches[1].clientY)/2);pinch.d=nd;e.preventDefault()}},{passive:false});
$('#board').addEventListener('touchend',()=>pinch=null);
// pan: space-drag or middle-mouse
let panning=null,spaceDown=false;
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['TEXTAREA','INPUT','SELECT'].includes(e.target.tagName)){spaceDown=true;$('#board').style.cursor='grab'}});
document.addEventListener('keyup',e=>{if(e.code==='Space'){spaceDown=false;$('#board').style.cursor=''}});
$('#board').addEventListener('pointerdown',e=>{if(e.button===1||spaceDown){panning={x:e.clientX,y:e.clientY};e.preventDefault();return}if(!e.target.closest('.obj'))startMarquee(e)});
document.addEventListener('pointermove',e=>{if(panning){cam.x+=e.clientX-panning.x;cam.y+=e.clientY-panning.y;panning={x:e.clientX,y:e.clientY};applyCam()}});
document.addEventListener('pointerup',()=>{panning=null});
// keyboard shortcuts
document.addEventListener('keydown',e=>{const typing=['TEXTAREA','INPUT','SELECT'].includes(e.target.tagName);
 if(e.ctrlKey&&e.key==='1'){e.preventDefault();fit()}
 if(e.ctrlKey&&e.key==='0'){e.preventDefault();cam={x:0,y:0,z:1};applyCam()}
 if(e.ctrlKey&&!e.shiftKey&&e.key.toLowerCase()==='z'){e.preventDefault();undo()}
 if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='z'){e.preventDefault();redo()}
 if(e.ctrlKey&&e.key.toLowerCase()==='d'){e.preventDefault();duplicateSel()}
 if((e.key==='Delete'||e.key==='Backspace')&&selected&&selected.size&&!typing){e.preventDefault();pushHistory();objects=objects.filter(o=>!selected.has(o.id));connections=connections.filter(c=>!selected.has(c.from)&&!selected.has(c.to));selected=new Set();hideInspector();render();$('#announce').textContent=`Deleted. ${objects.length} objects remain.`}
 if(e.key==='Escape'){connectCancel();if(selected&&selected.size){selected=new Set();hideInspector();drawSel()}}
 if(!e.ctrlKey&&!typing){const k={n:'sticky',i:'sticky',t:'task',l:'link',f:'frame'}[e.key.toLowerCase()];if(k)addObject(k)}});
// ---- marquee + multi-select — hit-test against LIVE rendered rects ----
function startMarquee(e){if(connectMode)return;const stage=$('#board');const stageRect=stage.getBoundingClientRect();const m=document.createElement('div');m.id='marquee';m.style.cssText='position:absolute;border:1.5px solid var(--dy-action);background:var(--dy-accent-soft);opacity:.45;pointer-events:none;z-index:5;border-radius:2px';stage.appendChild(m);const start={x:e.clientX,y:e.clientY};let moved=false;
 const move=ev=>{moved=true;const r={left:Math.min(start.x,ev.clientX),top:Math.min(start.y,ev.clientY),right:Math.max(start.x,ev.clientX),bottom:Math.max(start.y,ev.clientY)};m.style.left=(r.left-stageRect.left)+'px';m.style.top=(r.top-stageRect.top)+'px';m.style.width=(r.right-r.left)+'px';m.style.height=(r.bottom-r.top)+'px';selected=new Set(objects.filter(o=>{const el=document.querySelector(`[data-id="${o.id}"]`);if(!el)return false;const er=el.getBoundingClientRect();return er.left<r.right&&er.right>r.left&&er.top<r.bottom&&er.bottom>r.top}).map(o=>o.id));drawSel()};
 const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);m.remove();if(!moved){selected.clear();hideInspector();drawSel()}if(selected.size)$('#announce').textContent=`${selected.size} object(s) selected. Drag any selected card to move the group.`};
 document.addEventListener('pointermove',move);document.addEventListener('pointerup',up)}
function drawSel(){document.querySelectorAll('.obj').forEach(el=>{el.classList.toggle('selected',selected&&selected.has(+el.dataset.id||NaN));el.classList.toggle('dimmed',!!(selected&&selected.size&&!selected.has(+el.dataset.id||NaN)))});const chip=$('#sel-chip');if(chip){const n=selected?selected.size:0;chip.hidden=!n;if(n)chip.textContent=n+' selected · Esc to clear'}}
// ---- connectors ----
let connectFrom=null,connectMode=false;
$('#connect-tool').onclick=()=>{connectMode=!connectMode;$('#connect-tool').classList.toggle('active',connectMode);connectFrom=null;$('#announce').textContent=connectMode?'Connector mode: click the source card, then the target. Arrow = leads to. Esc cancels.':'Connector mode off.'};
function connectCancel(){connectMode=false;connectFrom=null;$('#connect-tool').classList.remove('active');document.querySelectorAll('.obj').forEach(el=>el.classList.remove('connect-src'))}
function handleObjClick(id,ev){if(connectMode){if(!connectFrom){connectFrom=id;const src=document.querySelector(`[data-id="${id}"]`);if(src)src.classList.add('connect-src');$('#announce').textContent='Source selected. Now click the target.'}
 else if(connectFrom!==id&&!connections.some(c=>c.from===connectFrom&&c.to===id)){pushHistory();connections.push({from:connectFrom,to:id});$('#announce').textContent='Connector added; it orders the collated plan.';connectCancel();render()}else{connectCancel();render()}return}
 if(ev&&ev.shiftKey){selected.has(id)?selected.delete(id):selected.add(id)}else if(!selected.has(id)){selected=new Set([id])}
 drawSel();const o=objects.find(x=>x.id===id);if(selected.size===1)showInspector(o);else hideInspector()}
// ---- tidy ----
$('#tidy').onclick=()=>{pushHistory();let x=40,y=40,rowH=0;objects.forEach((o)=>{const sz=objSize(o);if(x+sz.w>WORLD_W-40&&x>40){x=40;y+=rowH+32;rowH=0}o.x=x;o.y=y;rowH=Math.max(rowH,sz.h);x+=sz.w+32});render();fit();$('#announce').textContent='Objects arranged in a grid.'};
// ---- render ----
function render(){const w=world();let hint=w.querySelector('.board-empty');if(!hint){hint=document.createElement('div');hint.className='board-empty';hint.textContent='Empty canvas. Press N for a sticky, F for a frame, or drag here to select.';w.appendChild(hint)}w.innerHTML='';const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.style.cssText='position:absolute;left:0;top:0;width:5000px;height:3400px;pointer-events:none';
 const defs=document.createElementNS('http://www.w3.org/2000/svg','defs');defs.innerHTML='<marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L7,3.5 L0,7" fill="none" stroke="var(--dy-accent-border)" stroke-width="1.6"/></marker>';svg.appendChild(defs);
 drawWires(svg);w.appendChild(svg);
 objects.forEach(o=>{const el=document.createElement('div');el.className=`obj ${o.kind} ${selected===o.id?'selected':''} ${o.state==='promoted'?'promoted':''} ${o.ai?'model-suggestion':''} ${connectFrom===o.id?'connect-src':''}${selected.has(o.id)?' selected':''}`;el.style.left=o.x+'px';el.style.top=o.y+'px';el.dataset.id=o.id;el.tabIndex=0;el.setAttribute('role','button');el.setAttribute('aria-label',`${KIND_LABEL[o.kind]}: ${o.kind==='link'?o.label:o.text}${o.ai?', suggested by model':''}`);
  el.dataset.colour=o.colour||'';
 if(o.kind==='frame'){el.style.width=(o.frameW||320)+'px';el.style.height=(o.frameH||200)+'px';el.innerHTML=`<span class="frame-title">${o.text||'Frame'}</span>`}
 else if(o.kind==='link'){el.innerHTML=`<span aria-hidden="true">🌐</span><a href="${o.url}" onclick="event.stopPropagation()">${o.label||o.url}</a>`}
 else if(o.kind==='task'){el.innerHTML=`<span class="task-head"><input type="checkbox" aria-label="Mark done" onclick="event.stopPropagation()"><span class="kind">${KIND_LABEL[o.kind]}${o.ai?' · suggested':''}</span></span></span><p>${o.text}</p>${o.ref?`<p class="src" style="font-size:11px;color:var(--dy-text-2);margin-top:6px">↗ ${o.ref}</p>`:''}<span class="foot"><span class="state">${o.state==='promoted'?'Promoted · '+o.ref:'Scratch'}</span><span class="grip" aria-hidden="true">⠿</span></span>`}
 else{el.innerHTML=`<span class="kind">${KIND_LABEL[o.kind]}${o.ai?' · suggested':''}</span><p>${o.text}</p>${o.ref?`<p class="src" style="font-size:11px;opacity:.7;margin-top:6px">↗ ${o.ref}</p>`:''}<span class="foot"><span class="state">${o.state==='promoted'?'Promoted · '+o.ref:'Scratch'}</span></span>`}
 el.addEventListener('pointerdown',ev=>{if(ev.button===0&&!connectMode&&!(ev.target.closest('.foot'))){ev.stopPropagation();if(!selected.has(o.id))selected=new Set([o.id]);drawSel();let dragIds=[...selected];if(o.kind==='frame'){const fw=o.frameW||320,fh=o.frameH||200;objects.forEach(c=>{if(c.id!==o.id&&c.kind!=='frame'&&c.x>=o.x&&c.x<o.x+fw&&c.y>=o.y&&c.y<o.y+fh&&!dragIds.includes(c.id))dragIds.push(c.id)})}objDrag={ids:dragIds,ox:ev.clientX,oy:ev.clientY,moved:false}}});
  el.addEventListener('click',ev=>{ev.stopPropagation();handleObjClick(o.id,ev)});
  el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();handleObjClick(o.id,{})}});
  w.appendChild(el)});
 // frame membership: children move with frame
 // (membership = containment test against frame rect)
 if(hint)hint.hidden=objects.length>0;
 applyCam()}
function drawWires(svg){
 const rect=o=>({x:o.x,y:o.y,w:o.kind==='frame'?(o.frameW||320):(o.kind==='sticky'?170:(o.kind==='link'?el=>0:W)),h:o.kind==='frame'?(o.frameH||200):OH});
 const dims=o=>{const el=document.querySelector(`[data-id="${o.id}"]`);if(el){const r=el.getBoundingClientRect();return{w:r.width/cam.z,h:r.height/cam.z}}return{w:W,h:OH}};
 connections.forEach(c=>{const a=objects.find(o=>o.id===c.from),t=objects.find(o=>o.id===c.to);if(!a||!t)return;
  const ad=dims(a),td=dims(t);
  const ac={x:a.x+ad.w/2,y:a.y+ad.h/2},tc={x:t.x+td.w/2,y:t.y+td.h/2};
  // pick edge midpoints facing each other (Miro/FigJam model)
  let p1,p2,elbow=null;
  const dx=tc.x-ac.x,dy=tc.y-ac.y;
  if(Math.abs(dx)>=Math.abs(dy)){
    // horizontal dominance: attach on left/right edges
    if(dx>=0){p1={x:a.x+ad.w,y:ac.y};p2={x:t.x,y:tc.y}}else{p1={x:a.x,y:ac.y};p2={x:t.x+td.w,y:tc.y}}
    if(Math.abs(dy)>4){elbow={mx:(p1.x+p2.x)/2}}
  }else{
    if(dy>=0){p1={x:ac.x,y:a.y+ad.h};p2={x:tc.x,y:t.y}}else{p1={x:ac.x,y:a.y};p2={x:tc.x,y:t.y+td.h}}
    if(Math.abs(dx)>4){elbow={my:(p1.y+p2.y)/2}}
  }
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');
  const d=elbow?(elbow.mx!==undefined?`M${p1.x} ${p1.y} L${elbow.mx} ${p1.y} L${elbow.mx} ${p2.y} L${p2.x} ${p2.y}`:`M${p1.x} ${p1.y} L${p1.x} ${elbow.my} L${p2.x} ${elbow.my} L${p2.x} ${p2.y}`):`M${p1.x} ${p1.y} L${p2.x} ${p2.y}`;
  path.setAttribute('d',d);path.setAttribute('fill','none');path.setAttribute('stroke','var(--dy-accent-border)');path.setAttribute('stroke-width','2');path.setAttribute('marker-end','url(#arrow)');svg.appendChild(path)})
}
function hideInspector(){$('#inspector').hidden=true}
function closeInspector(){hideInspector();selected=new Set();drawSel();$('#board').focus()}
document.addEventListener('DOMContentLoaded',()=>{const b=$('#insp-close');if(b)b.onclick=closeInspector});
// immediate bind too (script at end of body)
(()=>{const b=document.getElementById('insp-close');if(b)b.onclick=closeInspector})();
let objDrag=null;
document.addEventListener('pointermove',ev=>{if(!objDrag)return;const dx=(ev.clientX-objDrag.ox)/cam.z,dy=(ev.clientY-objDrag.oy)/cam.z;if(!objDrag.moved&&Math.hypot(dx,dy)<3)return;if(!objDrag.moved){objDrag.moved=true;pushHistory();objDrag.ids.forEach(id=>{const el=document.querySelector(`[data-id="${id}"]`);if(el)el.classList.add('dragging')})}objDrag.ox=ev.clientX;objDrag.oy=ev.clientY;objDrag.ids.forEach(id=>{const o=objects.find(x=>x.id===id);o.x=clampWorld(o,'x',o.x+dx);o.y=clampWorld(o,'y',o.y+dy);const el=document.querySelector(`[data-id="${id}"]`);if(el){el.style.left=o.x+'px';el.style.top=o.y+'px'}});const svg=world().querySelector('svg');svg.querySelectorAll('line,path').forEach(l=>l.remove());drawWires(svg)});
function objSize(o){if(o.kind==='frame')return{w:o.frameW||320,h:o.frameH||200};const el=document.querySelector(`[data-id="${o.id}"]`);if(el){const r=el.getBoundingClientRect();return{w:r.width/cam.z,h:r.height/cam.z}}return o.kind==='sticky'?{w:170,h:150}:o.kind==='link'?{w:220,h:38}:{w:230,h:150}}
function objSizeStatic(o){return o.kind==='frame'?{w:o.frameW||320,h:o.frameH||200}:o.kind==='sticky'?{w:170,h:150}:o.kind==='link'?{w:220,h:38}:{w:230,h:150}}
function clampWorld(o,axis,v){const sz=objSize(o),m=6,maxX=WORLD_W-sz.w,maxY=WORLD_H-sz.h;const vv=axis==='x'?v:v;return Math.max(6,axis==='x'?Math.min(v,maxX):Math.min(v,maxY))}
document.addEventListener('pointerup',()=>{if(objDrag&&objDrag.moved){objDrag.ids.forEach(id=>{const el=document.querySelector(`[data-id="${id}"]`);if(el)el.classList.remove('dragging')});const ids=[...objDrag.ids];objDrag=null;deoverlap(ids);render();return}objDrag=null});
function deoverlap(ids){ids.forEach(id=>{const o=objects.find(x=>x.id===id);if(!o)return;const sz=objSizeStatic(o);let tries=0;while(tries<80&&objects.some(s=>{const ss=objSizeStatic(s);return o.x<s.x+ss.w+8&&o.x+sz.w>s.x+8&&o.y<s.y+ss.h+8&&o.y+sz.h>s.y+8})){o.x+=16;o.y+=16;tries++}})}
// ---- add / duplicate ----
function addObject(kind){pushHistory();selected=new Set();connectCancel();hideInspector();
 const size=kind==='frame'?{w:320,h:200}:{w:W,h:OH};
 let px=40,py=40,found=false;
 for(let y=24;y<WORLD_H-size.h-8&&!found;y+=size.h+32){for(let x=24;x<WORLD_W-size.w-8;x+=size.w+32){
  const free=objects.every(r=>{const rs=objSizeStatic(r);return x>=r.x+rs.w+12||x+size.w<=r.x-12||y>=r.y+rs.h+12||y+size.h<=r.y-12});
  if(free){px=x;py=y;found=true;break}}
 }
 if(!found){let y=24;while(y<WORLD_H-size.h-8&&objects.some(r=>{const rs=objSizeStatic(r);return y>=r.y-40&&y+size.h<=r.y+rs.h+40}))y+=size.h+32;px=24;py=y}
const o={id:Date.now()+Math.random(),kind,colour:kind==='sticky'?'yellow':undefined,frameW:kind==='frame'?320:undefined,frameH:kind==='frame'?200:undefined,x:px,y:py,state:'scratch',text:kind==='sticky'?'New sticky':kind==='task'?'New task':kind==='frame'?'':'',url:kind==='link'?'https://':undefined,label:kind==='link'?'New link':undefined};objects.push(o);selected=new Set([o.id]);render();showInspector(o)}
document.querySelectorAll('.tool').forEach(t=>{if(['connect-tool','tidy','undo','redo'].includes(t.id))return;t.addEventListener('click',()=>{if(t.dataset.add)addObject(t.dataset.add)})});
function duplicateSel(){if(!selected.size)return;pushHistory();const clones=[];selected.forEach(id=>{const o=objects.find(x=>x.id===id);clones.push({...o,id:Date.now()+Math.random(),x:o.x+24,y:o.y+24,state:'scratch',ref:undefined,ai:false})});objects.push(...clones);selected=new Set(clones.map(c=>c.id));render();$('#announce').textContent='Duplicated (clones stay scratch).'}
// ---- inspector ----
function showInspector(o){const insp=$('#inspector');insp.hidden=false;$('#insp-kind').textContent=KIND_LABEL[o.kind]+(o.ai?' · model suggestion':'');
 const swatches=o.kind==='sticky'?`<div class="field"><span style="font-size:12px;font-weight:600">Colour</span><div class="swatches" id="swatches">${['yellow','pink','blue','green'].map(c=>`<button class="swatch ${o.colour===c?'on':''}" data-c="${c}" aria-label="${c}" style="background:var(--dy-sticky-${c},${{yellow:'#ffe89a',pink:'#ffc9dd',blue:'#bfe0ff',green:'#c6efc8'}[c]})"></button>`).join('')}</div></div>`:'';
 $('#insp-body').innerHTML=`<div class="field"><label for="insp-text" style="font-size:12px;font-weight:600">${o.kind==='link'?'Label':'Content'}</label><textarea id="insp-text">${o.kind==='link'?o.label:o.text}</textarea></div>${swatches}${o.kind==='link'?'':'<p class="prov">Scratch object. It stays on the canvas until you promote it.</p>'}<div class="row">${o.state!=='promoted'?'<button class="button primary" id="promote">Promote to backlog</button>':`<button class="button" disabled>${o.ref} created</button>`}<button class="button" id="to-plan">Include in plan draft</button>${o.ai?'<button class="button" id="dismiss-sugg">Dismiss suggestion</button>':''}</div>${o.ai?'<p class="prov">Suggested by the model review. Accepting keeps it as a normal scratch object; dismissing removes it.</p>':''}`;
 const prom=$('#promote');if(prom)prom.onclick=()=>{pushHistory();o.state='promoted';o.ref='DEMO-'+(17+objects.filter(x=>x.state==='promoted').length);$('#announce').textContent=`Promoted to backlog item ${o.ref}. Prototype only — nothing created.`;insp.hidden=true;selected=new Set();selected.add(o.id);render()};
 $('#to-plan').onclick=()=>{if(!planPicks.includes(o.id))planPicks.push(o.id);$('#announce').textContent='Included in the next draft.';insp.hidden=true;selected.clear();drawSel()};
 const sw=$('#swatches');if(sw)sw.querySelectorAll('.swatch').forEach(b=>b.onclick=()=>{pushHistory();o.colour=b.dataset.c;showInspector(o);render()});
 const dis=$('#dismiss-sugg');if(dis)dis.onclick=()=>{pushHistory();objects=objects.filter(x=>x.id!==o.id);insp.hidden=true;selected=new Set();render()}}
// ---- collate ----
let planPicks=[];
$('#collate').onclick=()=>{const picks=objects.filter(o=>planPicks.includes(o.id)||['task','idea'].includes(o.kind));const ordered=[...picks];connections.forEach(c=>{const ai=ordered.findIndex(o=>o.id===c.from),bi=ordered.findIndex(o=>o.id===c.to);if(ai>-1&&bi>-1&&ai>bi){const [mv]=ordered.splice(ai,1);ordered.splice(bi,0,mv)}});
 const grouped={Context:ordered.filter(o=>o.kind==='note'),Requirements:ordered.filter(o=>o.kind==='idea'||o.kind==='task'),References:ordered.filter(o=>o.kind==='link')};
 $('#plan-title').textContent='Checkout reliability plan — draft';
 $('#plan-body').innerHTML=`<p>A draft assembled from ${ordered.length} canvas objects${connections.length?` and ${connections.length} connector(s) (ordering follows dependency arrows)`:''}. Nothing has been saved or scheduled. Edit before treating as the plan.</p>${Object.entries(grouped).map(([g,items])=>items.length?`<h3>${g}</h3><ul>${items.map(o=>`<li>${o.kind==='link'?o.label:o.text}${o.ref?` <span class="src">(from ${o.ref})</span>`:''}</li>`).join('')}</ul>`:'').join('')}<p class="plan-note">A plan, not a promise. Dates and effort are not estimated from canvas notes. Backlog items referenced: ${ordered.filter(o=>o.ref).map(o=>o.ref).join(', ')||'none promoted yet'}.</p><div style="display:flex;gap:10px;margin-top:16px"><button class="button primary" id="plan-accept">Save draft</button><button class="button" id="plan-edit">Edit in document</button></div>`;
 $('#plan-dialog').showModal();
 $('#plan-accept').onclick=()=>{$('#plan-body').innerHTML='<p role="status">Prototype only. Nothing was saved.</p>'};
 $('#plan-edit').onclick=()=>{$('#plan-body').innerHTML='<p role="status">Prototype only. “Edit in document” would open the existing document editor.</p>'}};
$('#plan-close').onclick=()=>$('#plan-dialog').close();
// ---- assistant / cron ----
$('#assistant').onchange=e=>{assistantOn=e.target.checked;$('#announce').textContent=assistantOn?'Active assistant on.':'Active assistant off.'};
$('#cron').onchange=e=>{cronOn=e.target.checked;$('#cron-freq').hidden=!cronOn;$('#announce').textContent=cronOn?'Scheduled review enabled (sample).':'Scheduled review disabled.'};
$('#frequency').onchange=()=>{$('#announce').textContent='Frequency saved in sample only.'};
$('#run-review').onclick=()=>{queue=[{text:'Suggested note: "Rate-limit checkout retries; 3 bursts observed in logs."',kind:'note'},{text:'Flagged: idea "webhook replay protection" overlaps DEMO-16 scope.',kind:'issue'},{text:'Research suggestion: "Stripe idempotency guide" link worth pinning to the canvas.',kind:'link'}];renderQueue();$('#announce').textContent='Review finished. Three suggestions queued — nothing applied without your approval.';$('#last-run').textContent='Last run: just now (sample)'};
function renderQueue(){const q=$('#queue');if(!queue.length){q.hidden=true;return}q.hidden=false;$('#queue-count').textContent=queue.length+' pending — nothing applied until you accept';$('#queue-list').innerHTML=queue.map((s,i)=>`<div class="sugg"><p>${s.text}</p><button class="small-btn accept" data-acc="${i}">Accept</button><button class="small-btn dismiss" data-dis="${i}">Dismiss</button></div>`).join('');
 q.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>{const s=queue.splice(+b.dataset.acc,1)[0];if(s.kind!=='issue'){pushHistory();const o={id:Date.now()+Math.random(),kind:s.kind==='note'?'note':'idea',state:'scratch',ai:true,text:s.text.replace(/^Suggested note: "|"$/g,'').replace('Research suggestion: ','')};placedS: for(let row=0;row<20;row++){for(let col=0;col<8;col++){const px=40+col*240,py=40+row*180;if(!objects.some(r=>px<r.x+W&&px+W>r.x&&py<r.y+OH&&py+OH>r.y)){o.x=px;o.y=py;break placedS}}}objects.push(o)}render();renderQueue()});
 q.querySelectorAll('[data-dis]').forEach(b=>b.onclick=()=>{queue.splice(+b.dataset.dis,1);renderQueue()})}
$('#queue-clear').onclick=()=>{queue=[];renderQueue()};
// ---- theme ----
$('#theme').onchange=e=>{$('.dockyard-root').dataset.theme=e.target.value};
// ---- notes ----
$('#review-notes').onclick=()=>{$('#plan-title').textContent='Canvas review notes';$('#plan-body').innerHTML=`<p>v3 fixes: board is a hard-framed stage (inset border, dot-grid surface); zoom anchors inside that stage — only the world moves; marquee selects by live rendered rectangles; dragging any selected card moves the whole selection.</p><ul><li>Wheel zoom at cursor; buttons; Ctrl+1 fit; Ctrl+0 = 100%; space-drag or middle-drag pans.</li><li>Drag empty canvas to multi-select; group move works directly.</li><li>Connector = leads to. Esc cancels. Connectors order the collated draft.</li><li>Scratch → promote keeps provenance; duplicates stay scratch; Del/Backspace removes selected.</li></ul><p class="plan-note">Deferred: minimap, freehand, embeds, real-time collaboration, export. Prototype only — no persistence, no real model, no cron.</p>`;$('#plan-dialog').showModal()};
// ---- tabs ----
document.querySelectorAll('[data-ptab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-ptab]').forEach(x=>x.setAttribute('aria-current',String(x===b)));const canvas=b.dataset.ptab==='canvas';$('#tab-canvas').hidden=!canvas;$('#tab-list').hidden=canvas});
// ---- init ----
$('#cron-freq').hidden=true;render();fit();
// ---- canvas AI assistant (chat) v2 ----
let chatLog=[],chatBusy=false,chatProposal=null;
function chatEl(){return document.getElementById('chat')}
function chatRender(){const p=chatEl();if(!p)return;const log=document.getElementById('chat-log');if(!log)return;
 log.innerHTML=chatLog.map((m,i)=>{
  if(m.role==='user')return `<div class="chat-msg user"><span class="chat-who">You</span><p>${m.text.replace(/</g,'&lt;')}</p></div>`;
  let html=`<div class="chat-msg assistant" data-i="${i}"><span class="chat-who">Assistant</span><p>${m.text.replace(/</g,'&lt;')}</p>`;
  if(m.stopped)html+=`<p class="chat-stopped">stopped by you</p>`;
  html+=`<div class="chat-acts"><button class="chat-act" data-act="copy" data-i="${i}" title="Copy">Copy</button><button class="chat-act" data-act="retry" data-i="${i}" title="Retry last">Retry</button></div></div>`;
  return html}).join('');
 log.scrollTop=log.scrollHeight}
function chatPush(role,text){chatLog.push({role,text});chatRender()}
function chatScroll(){const log=document.getElementById('chat-log');if(log)log.scrollTop=log.scrollHeight}
function openChat(){const p=chatEl();if(p){p.hidden=false;setTimeout(()=>document.getElementById('chat-input').focus(),30)}renderChat()}
function closeChat(){const p=chatEl();if(p)p.hidden=true}
function renderChat(){/* placeholder for compat */}
function chatClear(){chatLog=[];chatBusy=false;chatRender();document.getElementById('chat-log').innerHTML='<p class="chat-empty">Ask me to summarise the board, flag risks, suggest ideas, or draft tasks. I propose — you approve — nothing lands on the canvas uninvited.</p>';chatRender()}
function assistantReply(t){
 const lower=t.toLowerCase();const log=document.getElementById('chat-log');
 chatBusy=true;const stopBtn=document.getElementById('chat-stop');if(stopBtn)stopBtn.hidden=false;
 const typing=document.createElement('div');typing.className='chat-msg assistant';typing.id='chat-typing';typing.innerHTML='<span class="chat-who">Assistant</span><p class="typing"><span></span><span></span><span></span></p>';log.appendChild(typing);chatScroll();
 let replyText='',proposal=null;
 const n=objects.filter(o=>o.kind==='sticky').length,tk=objects.filter(o=>o.kind==='task').length,lk=objects.filter(o=>o.kind==='link').length,fr=objects.filter(o=>o.kind==='frame').length;
 if(lower.includes('summaris')||lower.includes('summary')||lower.includes('overview')){
  replyText=`This board holds ${n} stickies, ${tk} ${tk===1?'task':'tasks'}, ${lk} link${lk===1?'':'s'} and ${fr} frame${fr===1?'':'s'}, wired with ${connections.length} connector${connections.length===1?'':'s'}. ${objects.filter(o=>o.state==='promoted').length} item is already promoted to the backlog; the rest stays scratch until you promote it.`}
 else if(lower.includes('risk')){replyText='Two risks stand out: the webhook replay idea overlaps the idempotency work (possible duplicate-charge path), and load-testing is planned at 3x peak but the incident log shows bursts above that.';proposal={kind:'note',text:'Risk: retry bursts above 3x peak may double-charge'}}
 else if(lower.includes('idea')||lower.includes('what if')){replyText='Proposed idea: a rate-limiter in front of the retry queue with jittered backoff. Approve below to add it to the canvas as a scratch sticky.';proposal={kind:'sticky',text:'Rate-limit retry queue with jittered backoff'}}
 else if(lower.includes('task')||lower.includes('draft')){replyText='Proposed task: draft the load-test script for 3x peak traffic. Approve below to add it as a scratch task.';proposal={kind:'task',text:'Draft load-test script for 3x peak traffic'}}
 else{replyText='I can summarise the board, flag risks, suggest an idea, or draft a task. Ask for one — I will propose the item and only add it if you approve.'}
 const finish=()=>{if(typing.parentNode)typing.remove();
  chatLog.push({role:'assistant',text:replyText});chatRender();
  if(proposal){chatProposal=proposal;renderProposal()}
  chatBusy=false;if(stopBtn)stopBtn.hidden=true};
 chatTimer=setTimeout(finish,420)}
let chatTimer=null;
function renderProposal(){const old=document.getElementById('chat-propose');if(old)old.remove();
 if(!chatProposal)return;const card=document.createElement('div');card.className='chat-propose';card.id='chat-propose';
  card.innerHTML=`<p>Proposed ${chatProposal.kind}: “${chatProposal.text.replace(/</g,'&lt;')}”</p><div class="chat-prop-acts"><button class="button primary" id="chat-approve">Approve · add to canvas</button><button class="button" id="chat-reject">Discard</button></div>`;
  document.getElementById('chat-log').appendChild(card);chatScroll();
  document.getElementById('chat-approve').onclick=()=>{const k=chatProposal.kind,tx=chatProposal.text;addObject(k);const o=objects[objects.length-1];o.text=tx;o.ai=true;render();hideInspector();chatLog.push({role:'assistant',text:`Added to the canvas as a scratch ${k}. Dismiss it any time from its card.`});chatRender();chatProposal=null;renderProposal();chatScroll()};
  document.getElementById('chat-reject').onclick=()=>{chatLog.push({role:'assistant',text:'Discarded. Nothing was added.'});chatRender();chatProposal=null;renderProposal();chatScroll()}}
document.addEventListener('click',e=>{
 if(e.target.id==='chat-open'){openChat();return}
 if(e.target.id==='chat-close'){closeChat();return}
 if(e.target.id==='chat-send'&&!chatBusy){const inp=document.getElementById('chat-input');const t=inp.value.trim();if(!t)return;inp.value='';inp.style.height='auto';chatPush('user',t);if(chatProposal){chatLog.push({role:'assistant',text:'(previous suggestion left unapproved — it no longer applies)',stopped:true});chatProposal=null;renderProposal()}assistantReply(t);return}
 if(e.target.id==='chat-stop'&&chatBusy){clearTimeout(chatTimer);chatBusy=false;const stopBtn=document.getElementById('chat-stop');if(stopBtn)stopBtn.hidden=true;const log=document.getElementById('chat-log');const ty=log.querySelector('#chat-typing');if(ty)ty.remove();chatLog.push({role:'assistant',text:'(stopped before it finished)',stopped:true});chatRender();return}
 if(e.target.closest('#chat-suggest button')){const b=e.target.closest('button');document.getElementById('chat-input').value=b.textContent;document.getElementById('chat-send').click();return}
 if(e.target.id==='chat-clear'){chatLog=[];chatProposal=null;document.getElementById('chat-log').innerHTML='<p class="chat-empty">Ask me to summarise the board, flag risks, suggest ideas, or draft tasks. I propose — you approve — nothing lands on the canvas uninvited.</p>';return}
 if(e.target.dataset.act==='copy'){const m=chatLog[+e.target.dataset.i];if(m&&navigator.clipboard)navigator.clipboard.writeText(m.text);return}
 if(e.target.dataset.act==='retry'){const i=+e.target.dataset.i;let prompt='';for(let j=i-1;j>=0;j--)if(chatLog[j]&&chatLog[j].role==='user'){prompt=chatLog[j].text;break}chatLog.splice(i);chatRender();chatProposal=null;assistantReply(prompt);return}
});
document.addEventListener('DOMContentLoaded',()=>{renderChat()});
chatRender();
document.addEventListener('DOMContentLoaded',()=>{renderChat()});

document.getElementById('chat-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();document.getElementById('chat-send').click()}});
document.getElementById('chat-input').addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'});
