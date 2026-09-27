// Runs every desktop test with a disposable real backend available to the
// formerly external-host tests. Other tests retain their own labelled fixtures.
import {buildBundle} from './browser-harness.mjs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,'../..');
const {outDir,bundle}=buildBundle(true);
const port=Number(process.env.HPS_BROWSER_PORT || 19652);
const base=`http://127.0.0.1:${port}`;
const server=spawn(path.join(repo,'.venv/bin/python'),[path.join(here,'disposable-backend.py')],{env:{...process.env,HPS_BROWSER_PORT:String(port),HPS_BROWSER_BUNDLE:bundle,HPS_CANVAS_PROVIDER:process.env.HPS_CANVAS_PROVIDER || 'fake'},stdio:'inherit'});
try {
 for(let n=0;;n++){try {if((await fetch(base+'/health')).ok)break;}catch{} if(n>100)throw Error('backend not ready');await new Promise(r=>setTimeout(r,100));}
 console.log('DISPOSABLE_BACKEND',await (await fetch(base+'/health')).json());
 const files=process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(here).filter(f=>f.endsWith('.test.mjs')).map(f=>path.join(here,f));
 const child=spawn(process.execPath,['--test','--test-concurrency=1',...files],{cwd:repo,env:{...process.env,STEWARD_DESKTOP_URL:base+'/desktop',STEWARD_API_URL:base+'/api/plugins/hermes-dockyard'},stdio:'inherit'});
 const [code]=await once(child,'exit');process.exitCode=code;
} finally {server.kill('SIGTERM');await once(server,'exit');fs.rmSync(outDir,{recursive:true,force:true});}
