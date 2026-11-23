import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {createCanvasBrowserFlow,type CanvasBrowserResult} from '../src/core/canvas-browser-flow';
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function setup(t:TestContext,saveFails=false){
 t.mock.timers.enable({apis:['setTimeout']});
 const events:string[]=[],requests:{signal:AbortSignal;shown:()=>void;resolve:(v:CanvasBrowserResult)=>void;reject:(e:Error)=>void}[]=[];
 let closed!:()=>void;
 const flow=createCanvasBrowserFlow({dismiss:done=>{closed=done;events.push('dismiss');},hideSettings:()=>events.push('hide'),restoreSettings:()=>events.push('restore'),opening:v=>events.push('opening:'+v),onCancel:()=>events.push('cancel'),onError:()=>events.push('error'),
 open:(signal,shown)=>new Promise((resolve,reject)=>requests.push({signal,shown,resolve,reject})),onResult:async result=>{if(saveFails)throw new Error('save-failed');events.push(result.token?'save-token':'return');},cancelError:()=>new Error('cancelled'),openingError:()=>new Error('busy'),isCancelled:e=>e instanceof Error&&e.message==='cancelled',closeTimeoutMs:20,settleMs:10,openingTimeoutMs:50});
 return {flow,events,requests,close:()=>closed(),tick:(ms:number)=>t.mock.timers.tick(ms)};
}
test('Canvas waits for dismissal before opening and permits a long interactive login after the page appears',async t=>{
 const f=setup(t);assert.equal(f.flow.start(),true);assert.equal(f.flow.start(),false);await flush();assert.equal(f.requests.length,0);
 f.close();f.tick(10);await flush();assert.equal(f.requests.length,1);f.requests[0]!.shown();f.tick(60000);assert.equal(f.flow.active,true);assert.ok(!f.events.includes('error'));
 f.requests[0]!.resolve({token:'fixture-token'});await flush();f.tick(10);assert.equal(f.events.filter(e=>e==='save-token').length,1);assert.equal(f.events.filter(e=>e==='restore').length,1);assert.equal(f.flow.active,false);
});
test('a missing native dismiss callback has a fallback and a late callback cannot open a second browser',async t=>{
 const f=setup(t);f.flow.start();f.tick(19);assert.equal(f.requests.length,0);f.tick(1);f.tick(10);await flush();assert.equal(f.requests.length,1);
 f.close();f.close();f.tick(20);await flush();assert.equal(f.requests.length,1);f.flow.cancel();assert.equal(f.requests[0]!.signal.aborted,true);
});
test('an invisible queued browser times out, releases its own request and lets the user retry',async t=>{
 const f=setup(t);f.flow.start();f.close();f.tick(10);await flush();const old=f.requests[0]!;f.tick(50);assert.equal(old.signal.aborted,true);f.tick(10);assert.equal(f.flow.active,false);assert.ok(f.events.includes('restore'));assert.ok(f.events.includes('error'));
 f.flow.start();f.close();f.tick(10);await flush();old.shown();old.resolve({token:'stale-token'});await flush();assert.ok(!f.events.includes('save-token'));
 f.requests[1]!.shown();f.requests[1]!.resolve({});await flush();f.tick(10);assert.equal(f.events.filter(e=>e==='return').length,1);assert.equal(f.flow.active,false);
});
test('cancel while waiting for dismissal does not launch a browser or return to old settings',async t=>{
 const f=setup(t);f.flow.start();f.flow.cancel();f.close();f.tick(1000);await flush();assert.equal(f.requests.length,0);assert.equal(f.events.filter(e=>e==='cancel').length,1);assert.ok(!f.events.includes('restore'));
});
test('cancel and unmount discard late browser results and credential writes',async t=>{
 const f=setup(t);f.flow.start();f.close();f.tick(10);await flush();const old=f.requests[0]!;f.flow.cancel();old.resolve({token:'stale-token'});await flush();assert.ok(!f.events.includes('save-token'));
 f.flow.start();f.close();f.tick(10);f.flow.dispose();await flush();assert.equal(f.requests.length,1,'unmount before the launch microtask cannot open another session');assert.equal(f.flow.start(),false);
});
test('browser errors restore an operable settings window',async t=>{
 const f=setup(t);f.flow.start();f.close();f.tick(10);await flush();f.requests[0]!.reject(new Error('unavailable'));await flush();f.tick(10);assert.equal(f.flow.active,false);assert.equal(f.events.filter(e=>e==='restore').length,1);
 assert.equal(f.flow.start(),true);f.flow.dispose();
});

test('a token verification or save failure restores settings rather than leaving a closed presenter',async t=>{
 const f=setup(t,true);f.flow.start();f.close();f.tick(10);await flush();f.requests[0]!.shown();f.requests[0]!.resolve({token:'fixture-token'});await flush();f.tick(10);
 assert.equal(f.flow.active,false);assert.ok(f.events.includes('error'));assert.equal(f.events.filter(e=>e==='restore').length,1);
});
