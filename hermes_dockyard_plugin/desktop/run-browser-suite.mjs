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
const {makeTestStateRoot,stateEnv,disposeTestState}=await import('./test-state-guard.mjs');
const testRoot=makeTestStateRoot('hps-desktop-suite-');
const testEnv=stateEnv(testRoot);
const testPython=path.join(repo,'.venv/bin/python');
const isolatedPythonEnv={...testEnv, STEWARD_TEST_PYTHON:testPython, HPS_BROWSER_STATE_ROOT:testRoot};

process.env.HPS_NODE_TEST_STATE_ROOT = testRoot;
const {outDir,bundle}=buildBundle(true);
const port=Number(process.env.HPS_BROWSER_PORT || 19652);
const base=`http://127.0.0.1:${port}`;
// Refuse to run against a server we did not start: a stale backend on the
// port would answer the health check and silently receive every test call.
{let taken=false;try{taken=(await fetch(base+'/health')).ok;}catch{} if(taken){console.error(`PORT_IN_USE: ${base} already answers /health; stop the stale backend first`);process.exit(2);}}
const server=spawn(path.join(repo,'.venv/bin/python'),[path.join(here,'disposable-backend.py')],{env:{...isolatedPythonEnv,HPS_BROWSER_PORT:String(port),HPS_BROWSER_BUNDLE:bundle,HPS_CANVAS_PROVIDER:process.env.HPS_CANVAS_PROVIDER || 'fake'},stdio:'inherit'});
try {
 for(let n=0;;n++){try {if((await fetch(base+'/health')).ok)break;}catch{} if(n>100)throw Error('backend not ready');await new Promise(r=>setTimeout(r,100));}
 console.log('DISPOSABLE_BACKEND',await (await fetch(base+'/health')).json());
 const files=process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(here).filter(f=>f.endsWith('.test.mjs')).map(f=>path.join(here,f));
 const child=spawn(process.execPath,['--test','--test-concurrency=1',...files],{cwd:repo,env:{...testEnv,STEWARD_DESKTOP_URL:base+'/desktop',STEWARD_API_URL:base+'/api/plugins/hermes-dockyard'},stdio:'inherit'});
 const [code]=await once(child,'exit');process.exitCode=code;
} finally {
 // Only wait for an exit that has not already happened, and never forever:
 // awaiting 'exit' on an already-exited child hangs the runner.
 if(server.exitCode===null && server.signalCode===null){
  const exited=once(server,'exit');
  server.kill('SIGTERM');
  const t=setTimeout(()=>{if(server.exitCode===null && server.signalCode===null)server.kill('SIGKILL');},5000);
  await exited; clearTimeout(t);
 }
 fs.rmSync(outDir,{recursive:true,force:true});disposeTestState(testRoot);
}
