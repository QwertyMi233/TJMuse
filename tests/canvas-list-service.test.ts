import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import ts from 'typescript';
import {WebSessionError,type SessionJob,type SessionResult} from '../src/services/web-session';
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
function service(run:(job:SessionJob)=>Promise<SessionResult>){
 const code=ts.transpileModule(fs.readFileSync('src/services/platform-auth.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports:any={};const context=vm.createContext({exports,Map,Promise,setTimeout,clearTimeout,require:(name:string)=>name==='react-native'?{Platform:{OS:'ios'}}:name==='./web-session'?{runOfficialSession:run,WebSessionError}:{} });
 vm.runInContext(code,context);return exports as {listCanvasSessionTokens:(signal?:AbortSignal)=>Promise<unknown>};
}
test('the actual token-list service waits for browser dismissal even if a queue result arrives first',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let job!:SessionJob,settled=false;
 const api=service(async value=>{job=value;job.onPresented?.();return {status:'ok',accountId:'42',tokens:[{id:'7',purpose:'TJMuse',accountId:'42'}]};});
 const result=api.listCanvasSessionTokens().then(value=>{settled=true;return value;});await flush();assert.equal(settled,false);
 job.onDismissed?.();const value=await result;assert.deepEqual(JSON.parse(JSON.stringify(value)),[{id:'7',purpose:'TJMuse',accountId:'42'}]);
});
test('queue cancellation waits for native close and an unavailable host never waits for a nonexistent modal',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let job!:SessionJob,settled=false;const cancelled=new WebSessionError('cancelled');
 const api=service(async value=>{job=value;job.onPresented?.();throw cancelled;});const result=api.listCanvasSessionTokens().catch(error=>{settled=true;return error;});await flush();assert.equal(settled,false);job.onDismissed?.();assert.equal(await result,cancelled);
 const unavailable=new WebSessionError('unavailable'),noHost=service(async()=>{throw unavailable;});await assert.rejects(noHost.listCanvasSessionTokens(),error=>error===unavailable);
});
