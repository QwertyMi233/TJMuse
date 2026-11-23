import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {HaokeError,withHaokeLoginRecovery,verifyHaokeAccount} from '../src/core/haoke-api';
import {trustedHaokeLoginPage,HAOKE_STUDENT_LOGIN_URL,haokeReadSessionScript} from '../src/services/haoke-login-script';
test('Haoke autofill accepts only the official passport login for the Tongji tenant',()=>{
  assert.equal(trustedHaokeLoginPage(HAOKE_STUDENT_LOGIN_URL),true);
  for(const url of ['http://passport.aihaoke.net/auth/login?tenantSiteUrl=https://tongji.aihaoke.net','https://passport.aihaoke.net.example.test/auth/login?tenantSiteUrl=https://tongji.aihaoke.net','https://passport.aihaoke.net/auth/login?tenantSiteUrl=https://example.test','https://passport.aihaoke.net/auth/login','https://passport.aihaoke.net/auth/reset?tenantSiteUrl=https://tongji.aihaoke.net','https://user:pass@passport.aihaoke.net/auth/login?tenantSiteUrl=https://tongji.aihaoke.net'])assert.equal(trustedHaokeLoginPage(url),false);
});
test('an expired Haoke token can trigger one recovery, while network and account errors do not submit a password',async()=>{
  for(const code of [401,403]){let count=0;const result=await withHaokeLoginRecovery(async()=>{throw new HaokeError('expired',code);},async()=>{count++;return 'restored';});assert.equal(result,'restored');assert.equal(count,1);}
  for(const code of [0,409,429,500]){let count=0;await assert.rejects(withHaokeLoginRecovery(async()=>{throw new HaokeError('blocked',code);},async()=>{count++;return 'wrong';}));assert.equal(count,0);}
  let count=0;await assert.rejects(withHaokeLoginRecovery(async()=>{throw new HaokeError('expired',401);},async()=>{count++;throw new Error('challenge');}),/challenge/);assert.equal(count,1);
});
test('a different recovered Haoke account stays blocked instead of replacing the saved account',async()=>{
  let login=false;
  await assert.rejects(withHaokeLoginRecovery(()=>verifyHaokeAccount('fixture-token','10001',async()=>new Response(JSON.stringify({code:200,data:{userInfo:{userId:'20002'}}}))),async()=>{login=true;}),error=>error instanceof HaokeError&&error.code===409);
  assert.equal(login,false);
});
test('Haoke token extraction waits for a server-verified frontend session and never emits an expired cookie',async()=>{
  const messages:any[]=[],intervals:Array<()=>void>=[],timeouts:Array<{fn:()=>void;delay:number}>=[];let token='';
  const context={location:{origin:'https://tongji.aihaoke.net'},document:{cookie:''},sessionStorage:{getItem:()=>token},AbortController,fetch:async()=>({ok:token==='fixture-school-token',json:async()=>token==='fixture-school-token'?{code:200,data:{userInfo:{userId:'10001'}}}:{code:401}}),window:{ReactNativeWebView:{postMessage:(v:string)=>messages.push(JSON.parse(v))}},setInterval:(fn:()=>void)=>{intervals.push(fn);return 1;},clearInterval:()=>{},setTimeout:(fn:()=>void,delay:number)=>{timeouts.push({fn,delay});return 1;},clearTimeout:()=>{}};
  vm.runInNewContext(haokeReadSessionScript('nonce'),context);assert.equal(messages.length,0);
  token='expired-cookie';intervals[0]!();await new Promise(setImmediate);assert.equal(messages.length,0);
  token='fixture-school-token';intervals[0]!();await new Promise(setImmediate);assert.equal(messages[0].token,token);assert.equal(messages[0].nonce,'nonce');timeouts.find(t=>t.delay===25000)!.fn();assert.equal(messages.length,1);
  const foreign={...context,location:{origin:'https://passport.aihaoke.net'}};vm.runInNewContext(haokeReadSessionScript('foreign'),foreign);assert.equal(messages.length,1);
});
