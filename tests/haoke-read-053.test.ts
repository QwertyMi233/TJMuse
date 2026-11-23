import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHaokeSessionRead} from '../src/core/haoke-session-read';
import {haokeReadSessionScript} from '../src/services/haoke-login-script';
import {haokeClient,withHaokeRequestDeadline,HaokeError} from '../src/core/haoke-api';

const tick=()=>new Promise(setImmediate);
function page({cookie='',session='',local='',url='https://tongji.aihaoke.net/student/course',fetcher=async(token:string)=>({ok:true,redirected:false,json:async()=>({code:token==='current-cookie'?200:401,data:{userInfo:{userId:'10001'}}})})}:{cookie?:string;session?:string;local?:string;url?:string;fetcher?:(token:string,signal:AbortSignal)=>Promise<any>}={}){
 const messages:any[]=[],requests:string[]=[],intervals:Function[]=[],timers:{fn:()=>void;delay:number;cleared:boolean}[]=[];
 const win:any={ReactNativeWebView:{postMessage:(value:string)=>messages.push(JSON.parse(value))}};win.top=win.self=win;
 const context:any={window:win,location:{origin:new URL(url).origin,href:url},URL,document:{cookie},sessionStorage:{getItem:()=>session},localStorage:{getItem:()=>local},AbortController,
 fetch:async(_url:string,options:any)=>{assert.equal(_url,'https://tongji.aihaoke.net/api/auth/queryCurrentUserInfo');assert.equal(options.method,'POST');const token=options.headers.Authorization.slice(7);requests.push(token);return fetcher(token,options.signal);},
 setTimeout:(fn:()=>void,delay:number)=>{timers.push({fn,delay,cleared:false});return timers.length;},clearTimeout:(id:number)=>{if(timers[id-1])timers[id-1]!.cleared=true;},setInterval:(fn:Function)=>{intervals.push(fn);return intervals.length;},clearInterval:()=>{}};
 return {context,messages,requests,intervals,timers,run:(nonce='read-1')=>vm.runInNewContext(haokeReadSessionScript(nonce),context),fire:(delay:number)=>{for(const timer of [...timers])if(timer.delay===delay&&!timer.cleared){timer.cleared=true;timer.fn();}}};
}
test('Haoke uses the official URL/cookie/session ordering instead of a stale session token',async()=>{
 const p=page({cookie:'haoke-token=current-cookie',session:'expired-session'});p.run();await tick();
 assert.deepEqual(p.requests,['current-cookie']);assert.equal(p.messages.length,1);assert.equal(p.messages[0].token,'current-cookie');
 const q=page({url:'https://tongji.aihaoke.net/student/course?haoke-token=url-token',cookie:'haoke-token=current-cookie',fetcher:async token=>({ok:true,json:async()=>({code:200,data:{userInfo:{userId:'10001'},token}})})});q.run();await tick();assert.deepEqual(q.requests,['url-token']);
});
test('rejected first candidate does not hide a valid cookie; returned refreshed credentials are forwarded',async()=>{
 const p=page({url:'https://tongji.aihaoke.net/student/course?haoke-token=expired-url',cookie:'haoke-token=current-cookie',fetcher:async token=>({ok:true,json:async()=>token==='current-cookie'?{code:200,data:{userInfo:{userId:'10001'},token:'refreshed-token'}}:{code:401}})});
 p.run();await tick();assert.deepEqual(p.requests,['expired-url','current-cookie']);assert.equal(p.messages[0].token,'refreshed-token');
});
test('persistent token fallback is server verified and malformed cookie storage does not block other candidates',async()=>{
 const p=page({cookie:'haoke-token=%ZZ',local:'current-cookie'});p.context.sessionStorage.getItem=()=>{throw Error('blocked');};p.run();await tick();assert.equal(p.messages[0].token,'current-cookie');assert.equal(p.messages[0].status,'ok');
});
test('a hanging body is interrupted even when fetch ignores abort, allowing the next credential to be checked',async()=>{
 let firstSignal:AbortSignal|undefined;
 const p=page({cookie:'haoke-token=hanging',session:'current-cookie',fetcher:async(token,signal)=>{
  if(token==='hanging'){firstSignal=signal;return {ok:true,json:()=>new Promise(()=>{})};}
  return {ok:true,json:async()=>({code:200,data:{userInfo:{userId:'10001'}}})};
 }});
 p.run();await tick();assert.equal(p.messages.length,0);p.fire(5000);await tick();assert.equal(firstSignal?.aborted,true);assert.equal(p.messages[0].token,'current-cookie');
});
test('page deadline reports failure once, and a late response cannot produce a successful connection',async()=>{
 let resolve!:(value:any)=>void;const p=page({cookie:'haoke-token=current-cookie',fetcher:()=>new Promise(r=>{resolve=r;})});p.run();await tick();p.fire(25000);assert.equal(p.messages[0].token,'');assert.equal(p.messages[0].status,'timeout');
 resolve({ok:true,json:async()=>({code:200,data:{userInfo:{userId:'10001'}}})});await tick();assert.equal(p.messages.length,1);
});
test('reinjecting the reader aborts the previous probe, and foreign/iframe pages do not read credentials',async()=>{
 let resolve!:(value:any)=>void,calls=0;
 const p=page({cookie:'haoke-token=current-cookie',fetcher:async()=>++calls===1?await new Promise(r=>{resolve=r;}):{ok:true,json:async()=>({code:200,data:{userInfo:{userId:'10001'}}})}});
 p.run('old');p.run('new');await tick();resolve({ok:true,json:async()=>({code:200,data:{userInfo:{userId:'10001'}}})});await tick();assert.equal(p.messages.length,1);assert.equal(p.messages[0].nonce,'new');
 const foreign=page({url:'https://passport.aihaoke.net/auth/login',session:'current-cookie'});foreign.run();assert.equal(foreign.requests.length,0);
 const iframe=page({cookie:'haoke-token=current-cookie'});iframe.context.window.top={};iframe.run();assert.equal(iframe.requests.length,0);
});
test('native read watchdog clears the spinner; retries reject old messages and duplicate clicks',()=>{
 const readings:boolean[]=[],timers:Function[]=[],cleared:number[]=[];let expired=0;
 const read=createHaokeSessionRead({nonce:'job',reading:v=>readings.push(v),expired:()=>expired++,setTimer:((fn:Function)=>{timers.push(fn);return timers.length;}) as any,clearTimer:((id:number)=>cleared.push(id)) as any});
 const first=read.begin();assert.ok(first);assert.equal(read.begin(),null);assert.deepEqual(readings,[true]);timers[0]!();assert.deepEqual(readings,[true,false]);assert.equal(expired,1);
 const second=read.begin();assert.notEqual(first,second);assert.equal(read.accept(first),false);assert.equal(read.accept(second),true);assert.equal(read.accept(second),false);assert.deepEqual(readings,[true,false,true,false]);assert.equal(expired,1);assert.ok(cleared.length>=2);read.dispose();assert.equal(read.begin(),null);
});
test('navigation invalidates old read results and disposing cancels the native timer',()=>{
 const timers:Function[]=[],readings:boolean[]=[];let expired=0;
 const read=createHaokeSessionRead({nonce:'job',reading:v=>readings.push(v),expired:()=>expired++,setTimer:((fn:Function)=>{timers.push(fn);return timers.length;}) as any,clearTimer:(()=>{}) as any});
 const first=read.begin();read.cancel();assert.equal(read.accept(first),false);read.begin();read.dispose();timers.forEach(fn=>fn());assert.equal(expired,0);assert.deepEqual(readings,[true,false,true,false]);
});
test('native API timeout rejects even when the network ignores cancellation',{timeout:1000},async()=>{
 let signal:AbortSignal|undefined;await assert.rejects(withHaokeRequestDeadline(s=>{signal=s;return new Promise(()=>{});},undefined,2),error=>error instanceof HaokeError&&/超时/.test(error.message));assert.equal(signal?.aborted,true);
});
test('native identity body can be cancelled without waiting for a nonresponsive transport',async()=>{
 const c=new AbortController();let calls=0;const post=haokeClient('fixture-token',async()=>{calls++;return {ok:true,url:'',text:()=>new Promise(()=>{})} as any;},c.signal);
 const result=post('/api/auth/queryCurrentUserInfo',{});await tick();c.abort();await assert.rejects(result,/取消或超时/);assert.equal(calls,1);
 const cancelled=new AbortController();cancelled.abort();await assert.rejects(haokeClient('fixture-token',async()=>{throw Error('should not run');},cancelled.signal)('/api/auth/queryCurrentUserInfo',{}),/取消/);
});
