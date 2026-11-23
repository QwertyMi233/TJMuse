import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createTongjiLoginVault,LOGIN_INTERRUPTION_RETRY_MS} from '../src/core/tongji-login';
import {haokeClient,HaokeError,withHaokeLoginRecovery} from '../src/core/haoke-api';
import {isExpiredPlatformSession,transientWebNavigationError} from '../src/core/platform-session-errors';
import {zhixuemengMonitorScript,zhixuemengCaptureScript} from '../src/services/zhixuemeng-page';
test('interrupted process reservations recover after backoff, but an actively running attempt cannot be duplicated',async()=>{
 let raw:string|null=null,now=1000000;const store={get:async()=>raw,set:async(v:string)=>{raw=v;},remove:async()=>{raw=null;}};
 const original=createTongjiLoginVault(store,undefined,()=>now);await original.save('20260001','fixture-password',true);const pending=await original.reserve();assert.ok(pending);
 now+=LOGIN_INTERRUPTION_RETRY_MS+1;assert.equal(await original.reserve(),null,'live attempt stays exclusive');
 const restarted=createTongjiLoginVault(store,undefined,()=>now);assert.equal((await restarted.status()).state,'ready');assert.ok(await restarted.reserve(),'cold start can recover without a manual toggle');
});
test('explicitly rejected credentials remain blocked across restarts and cannot turn into an automatic retry loop',async()=>{
 let raw:string|null=null,now=1000000;const store={get:async()=>raw,set:async(v:string)=>{raw=v;},remove:async()=>{raw=null;}};
 const original=createTongjiLoginVault(store,undefined,()=>now);await original.save('20260001','fixture-password',true);const attempt=(await original.reserve())!;await original.failed(attempt.id,attempt.attemptId!);now+=600000;
 const restarted=createTongjiLoginVault(store,undefined,()=>now);assert.equal((await restarted.status()).state,'needs-user');assert.equal((await restarted.status()).retryAt,undefined);assert.equal(await restarted.reserve(),null);await restarted.retry();assert.ok(await restarted.reserve());
});
test('short interruption advertises a retry time without exposing credentials',async()=>{
 let raw:string|null=null,now=1000000;const store={get:async()=>raw,set:async(v:string)=>{raw=v;},remove:async()=>{raw=null;}};
 const a=createTongjiLoginVault(store,undefined,()=>now);await a.save('20260001','fixture-password',true);await a.reserve();const b=createTongjiLoginVault(store,undefined,()=>now);const s=await b.status();assert.equal(s.retryAt,now+LOGIN_INTERRUPTION_RETRY_MS);assert.ok(!JSON.stringify(s).includes('fixture-password'));
});
test('HTTP 200 application-level expired-token replies trigger one Haoke recovery; network errors and wrong passwords do not',async()=>{
 assert.equal(isExpiredPlatformSession(200,500,'Token失效，请重新登录！'),true);assert.equal(isExpiredPlatformSession(200,500,'用户名或密码错误'),false);assert.equal(isExpiredPlatformSession(200,500,'读取失败'),false);
 let restored=0;const result=await withHaokeLoginRecovery(()=>haokeClient('fixture-token',async()=>new Response(JSON.stringify({code:500,message:'token已过期，请重新登录'})))('/api/auth/queryCurrentUserInfo',{}),async()=>{restored++;return {recovered:true};});assert.deepEqual(result,{recovered:true});assert.equal(restored,1);
 assert.equal(transientWebNavigationError(-999),true);assert.equal(transientWebNavigationError(-1009),false);
});
test('anonymous SPA transitions do not repeatedly fail and close a manual login before its form renders',()=>{
 const output:any[]=[],timers:Function[]=[],win:any={ReactNativeWebView:{postMessage:(s:string)=>output.push(JSON.parse(s))},addEventListener:()=>{},removeEventListener:()=>{}};
 const context={window:win,location:{origin:'https://h5.zhixuemeng.com'},document:{querySelectorAll:()=>[]},getComputedStyle:()=>({visibility:'visible'}),localStorage:{getItem:()=>null},setInterval:(fn:Function)=>{timers.push(fn);return 1;},clearInterval:()=>{},setTimeout:()=>{}};
 vm.runInNewContext(zhixuemengMonitorScript('fixture'),context);for(let i=0;i<10;i++)timers[0]!();assert.equal(output.length,1);assert.equal(output[0].error,'login_required');assert.doesNotThrow(()=>new Function(zhixuemengCaptureScript('fixture')));
});
