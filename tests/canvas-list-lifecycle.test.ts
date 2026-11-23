import {test,type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createCanvasListLifecycle} from '../src/core/canvas-list-lifecycle';
import {CANVAS_ROTATION_SCRIPT} from '../src/services/canvas-rotation-script';
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
function setup(t:TestContext,bound=true){
 t.mock.timers.enable({apis:['setTimeout']});const events:string[]=[],values:unknown[]=[];
 const list=createCanvasListLifecycle<{tokens:string[]}>({nonce:'job',reading:v=>events.push(`reading:${v}`),readTimedOut:()=>events.push('timeout'),requestClose:()=>{events.push('request-close');return bound;},forceUnmount:()=>events.push('unmount'),complete:(error,result)=>{events.push('complete');values.push(error||result);},cancelError:()=>new Error('cancelled'),readMs:30,closeMs:15,settleMs:4});
 return {list,events,values,tick:(n:number)=>t.mock.timers.tick(n)};
}
test('token choices are returned only after the browser native dismissal, once',t=>{
 const f=setup(t),nonce=f.list.begin()!;assert.equal(f.list.begin(),null);assert.equal(f.list.accept(nonce,undefined,{tokens:['7']}),true);
 assert.deepEqual(f.values,[],'returning choices before onDismiss would reopen settings over the browser');
 assert.equal(f.list.begin(),null);f.list.dismissed();f.list.dismissed();assert.deepEqual(f.values,[{tokens:['7']}]);f.tick(100);assert.ok(!f.events.includes('unmount'));
});
test('lost native dismissal unmounts the old browser before returning choices',t=>{
 const f=setup(t),nonce=f.list.begin()!;f.list.accept(nonce,undefined,{tokens:['7']});f.tick(15);assert.ok(f.events.includes('unmount'));assert.equal(f.values.length,0);f.tick(4);assert.equal(f.values.length,1);assert.ok(f.events.indexOf('unmount')<f.events.indexOf('complete'));
});
test('a stalled read releases the button and stale results cannot complete a retry',t=>{
 const f=setup(t),old=f.list.begin()!;f.tick(30);assert.ok(f.events.includes('timeout'));const retry=f.list.begin()!;assert.notEqual(old,retry);assert.equal(f.list.accept(old,undefined,{tokens:['old']}),false);assert.equal(f.list.accept(retry,undefined,{tokens:['new']}),true);f.list.dismissed();assert.deepEqual(f.values,[{tokens:['new']}]);
});
test('X or swipe cancellation during reading ignores a late successful response',t=>{
 const f=setup(t),nonce=f.list.begin()!;f.list.dismissed();assert.match(String(f.values[0]),/cancelled/);assert.equal(f.list.accept(nonce,undefined,{tokens:['late']}),false);f.tick(100);assert.equal(f.values.length,1);
});
test('read errors use the same dismissal handshake and cannot be replaced by late success',t=>{
 const f=setup(t),nonce=f.list.begin()!,error=new Error('login_required');f.list.accept(nonce,error);f.list.finish(undefined,{tokens:['late']});assert.equal(f.values.length,0);f.list.dismissed();assert.equal(f.values[0],error);
});
test('missing presenter and disposal cannot leave a pending read timer',t=>{
 const f=setup(t,false);f.list.finish(new Error('unavailable'));assert.ok(f.events.includes('unmount'));f.tick(4);assert.equal(f.values.length,1);
 t.mock.timers.reset();const g=setup(t);g.list.begin();g.list.dispose();g.tick(100);assert.ok(!g.events.includes('timeout'));assert.equal(g.values.length,0);
});
test('native token-list script aborts a hung fetch and reports a bounded failure',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const messages:any[]=[],calls:any[]=[];
 const context=vm.createContext({URL,AbortController,setTimeout,clearTimeout,location:{origin:'https://canvas.tongji.edu.cn'},document:{querySelectorAll:()=>[]},fetch:(url:string,options:unknown)=>{calls.push({url,options});return new Promise(()=>{});},ReactNativeWebView:{postMessage:(text:string)=>messages.push(JSON.parse(text))}});
 vm.runInContext(CANVAS_ROTATION_SCRIPT,context);vm.runInContext("CanvasRotation.startList({nonce:'read-1'})",context);await flush();t.mock.timers.tick(25000);await flush();
 assert.equal(messages.length,1);assert.equal(messages[0].nonce,'read-1');assert.equal(messages[0].result.status,'network_or_session_redirect');assert.equal(calls[0].options.signal.aborted,true);
});
test('real token-list script reads metadata with GET only and returns no secret token value',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const messages:any[]=[],calls:any[]=[];
 const context=vm.createContext({URL,AbortController,setTimeout,clearTimeout,location:{origin:'https://canvas.tongji.edu.cn'},document:{querySelectorAll:()=>[{getAttribute:(key:string)=>key==='rel'?'/profile/tokens/7':'#'}]},fetch:async(url:string,options:any)=>{calls.push({url,options});return {ok:true,json:async()=>url.endsWith('/profile')?{id:42}:{id:7,user_id:42,purpose:'TJMuse',workflow_state:'active',visible_token:'secret-must-not-return'}};},ReactNativeWebView:{postMessage:(text:string)=>messages.push(JSON.parse(text))}});
 vm.runInContext(CANVAS_ROTATION_SCRIPT,context);vm.runInContext("CanvasRotation.startList({nonce:'read-2'})",context);await flush();assert.equal(messages.length,1);assert.deepEqual(JSON.parse(JSON.stringify(messages[0].result)),{status:'ok',accountId:'42',tokens:[{id:'7',purpose:'TJMuse'}]});
 assert.ok(calls.every(c=>!c.options.method||c.options.method==='GET'));assert.ok(calls.every(c=>c.options.body===undefined));assert.ok(!JSON.stringify(messages).includes('secret-must-not-return'));t.mock.timers.tick(30000);await flush();assert.equal(messages.length,1);
});
