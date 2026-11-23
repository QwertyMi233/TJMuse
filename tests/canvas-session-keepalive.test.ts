import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { canvasSessionCheckScript } from '../src/services/canvas-session-check';
import { canvasRenewalDue, canvasSessionCheckDue, canvasSessionCanRecover, withCanvasMaintenance } from '../src/core/canvas-renewal';
import { restoreData } from '../src/core/storage';
import { initialData } from '../src/core/defaults';
import type { CanvasRenewal } from '../src/core/types';

const now=Date.parse('2026-10-31T08:00:00+08:00');
const stamp=(minutes:number)=>new Date(now-minutes*60000).toISOString();
const config=():CanvasRenewal=>({enabled:true,accountId:'10001',tokenId:'101',purpose:'TJMuse',lastAttempt:null,lastRotated:stamp(60),expiresAt:null,status:'ready',message:''});
async function run(profile: unknown={id:10001},status=200,origin='https://canvas.tongji.edu.cn',failure?:string) {
  const calls:any[]=[],messages:any[]=[];
  const context={location:{origin},window:{ReactNativeWebView:{postMessage:(text:string)=>messages.push(JSON.parse(text))}},fetch:async(url:string,options:unknown)=>{
    calls.push({url,options});if(failure==='network')throw new Error('offline');
    return {ok:status>=200&&status<300,status,json:async()=>{if(failure==='html')throw new Error('HTML');return profile;}};
  }};
  vm.runInNewContext(canvasSessionCheckScript('session-test','10001'),context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(messages.length,1);assert.equal(messages[0].nonce,'session-test');assert.equal(messages[0].kind,'done');
  return {calls,messages,result:messages[0].result};
}

test('hidden Canvas keepalive uses only a read-only cookie-backed profile request',async()=>{
  const {calls,result}=await run();assert.deepEqual(result,{status:'ok',accountId:'10001'});
  assert.equal(calls.length,1);assert.equal(calls[0].url,'https://canvas.tongji.edu.cn/api/v1/users/self/profile');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0].options.headers)),{Accept:'application/json'});assert.equal(calls[0].options.credentials,'same-origin');assert.equal(calls[0].options.redirect,'error');
  assert.equal(calls[0].options.body,undefined);assert.equal(calls[0].options.method,undefined);
  assert.equal(canvasSessionCheckScript('x','10001').includes('document.cookie'),false);
  assert.equal(JSON.stringify(result).includes('token'),false);
});
test('keepalive rejects foreign origins and account changes and distinguishes authentication from network errors',async()=>{
  const foreign=await run({},200,'https://example.test');assert.equal(foreign.result.status,'login_required');assert.equal(foreign.calls.length,0);
  assert.equal((await run({id:10002})).result.status,'account_changed');
  assert.equal((await run({},401)).result.status,'login_required');
  assert.equal((await run({},403)).result.status,'http_403');
  assert.equal((await run({},200,undefined,'html')).result.status,'login_or_non_json_response');
  assert.equal((await run({},200,undefined,'network')).result.status,'network_or_session_redirect');
});
test('startup, resume and idle keepalive have independent cooldowns from 30-minute token rotation',()=>{
  const value=config();assert.equal(canvasSessionCheckDue(value,now),true);
  value.lastSessionAttempt=stamp(3);assert.equal(canvasSessionCheckDue(value,now),false);assert.equal(canvasSessionCheckDue(value,now,true),true);
  value.lastSessionAttempt=stamp(1);assert.equal(canvasSessionCheckDue(value,now,true),false);
  value.lastSessionAttempt=stamp(10);assert.equal(canvasSessionCheckDue(value,now),true);
  value.status='needs-login';assert.equal(canvasSessionCheckDue(value,now),false);assert.equal(canvasSessionCheckDue(value,now,true),true);
  value.lastSessionAttempt=stamp(30);assert.equal(canvasSessionCheckDue(value,now),true);
  value.status='ready';value.lastRotated=stamp(30);value.lastSessionAttempt=stamp(0);value.lastSessionCheck=stamp(0);
  assert.equal(canvasRenewalDue(value,now),true);
  value.enabled=false;assert.equal(canvasSessionCheckDue(value,now,true),false);
});
test('expired web sessions do not prevent synchronization with a still-valid saved token',async()=>{
  for(const code of ['login_required','login_or_web_timeout','network_or_session_redirect','http_429','busy']){
    const steps:string[]=[];
    const result=await withCanvasMaintenance(async()=>{steps.push('maintain');throw {code};},async()=>{steps.push('read-saved-token');return {accountId:'10001',assignments:[1,2]};});
    assert.deepEqual(steps,['maintain','read-saved-token']);assert.equal(result.assignments.length,2);
  }
  const rejected=new Error('Bearer is also expired');
  await assert.rejects(withCanvasMaintenance(async()=>{throw {code:'login_required'};},async()=>{throw rejected;}),error=>error===rejected);
});
test('identity, scope and vault failures cannot be hidden by a bearer fallback or a successful cookie check',async()=>{
  for(const code of ['account_changed','bearer_account_changed','wrong_test_token','rotation_identity_or_scope_changed','secure_save_or_bridge_failed','secure_save_failed']){
    const failure={code};let read=false;
    await assert.rejects(withCanvasMaintenance(async()=>{throw failure;},async()=>{read=true;}),error=>error===failure);
    assert.equal(read,false);assert.equal(canvasSessionCanRecover({...config(),lastErrorCode:code}),false);
  }
  assert.equal(canvasSessionCanRecover({...config(),lastErrorCode:'permanent_expiry_requires_action'}),false);
  assert.equal(canvasSessionCanRecover({...config(),lastErrorCode:'login_required'}),true);
});
test('session maintenance status survives restart and old renewal settings gain safe defaults',()=>{
  const data=structuredClone(initialData);data.canvas.userId='10001';
  data.canvas.renewal={...config(),lastSessionAttempt:stamp(3),lastSessionCheck:stamp(5),lastErrorCode:'login_required',status:'needs-login'};
  const restored=restoreData(JSON.parse(JSON.stringify(data))).canvas.renewal!;
  assert.equal(restored.lastSessionAttempt,stamp(3));assert.equal(restored.lastSessionCheck,stamp(5));assert.equal(restored.lastErrorCode,'login_required');
  data.canvas.renewal=config();const old=restoreData(data).canvas.renewal!;
  assert.equal(old.lastSessionAttempt,null);assert.equal(old.lastSessionCheck,null);assert.equal(canvasSessionCheckDue(old,now),true);
});
