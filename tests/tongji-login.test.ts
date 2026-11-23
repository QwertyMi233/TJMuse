import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createTongjiLoginVault,validateStudentLogin} from '../src/core/tongji-login';
import {trustedTongjiLoginPage,tongjiStudentLoginScript} from '../src/services/tongji-login-script';
function memory(){let record:string|null=null;return {adapter:{get:async()=>record,set:async(value:string)=>{record=value;},remove:async()=>{record=null;}},raw:()=>record,corrupt:(value:string)=>{record=value;}};}
test('student login requires explicit consent, validates a student ID, and never returns a password in public status',async()=>{
  const store=memory(),vault=createTongjiLoginVault(store.adapter);
  await assert.rejects(vault.save('20260001','test-only-password',false));assert.equal(store.raw(),null);
  for(const id of ['user@example.test','+8613800000000','abc12345','123'])assert.throws(()=>validateStudentLogin(id,'test-only-password'));
  await vault.save('20260001','test-only-password',true);const status=await vault.status();
  assert.equal(status.enabled,true);assert.equal(status.studentId,'202••••01');assert.equal(JSON.stringify(status).includes('test-only-password'),false);
});
test('one durable reservation survives restarts and concurrent login jobs cannot repeatedly submit a password',async()=>{
  const store=memory(),vault=createTongjiLoginVault(store.adapter);await vault.save('20260001','test-only-password',true);
  const values=await Promise.all([vault.reserve(),vault.reserve(),vault.reserve()]);assert.equal(values.filter(Boolean).length,1);
  const restarted=createTongjiLoginVault(store.adapter);assert.equal(await restarted.reserve(),null);assert.equal((await restarted.status()).state,'needs-user');
  const attempt=values[0]!;await restarted.succeeded(attempt.id,attempt.attemptId!);assert.equal((await restarted.status()).state,'ready');assert.ok((await restarted.status()).lastSuccess);
});
test('changing or deleting saved credentials prevents an old login completion from restoring or altering them',async()=>{
  const store=memory(),vault=createTongjiLoginVault(store.adapter);await vault.save('20260001','old-test-password',true);const old=await vault.reserve();
  await vault.save('20260002','new-test-password',true);await vault.succeeded(old!.id,old!.attemptId!);
  assert.equal((await vault.status()).lastSuccess,null);assert.equal((await vault.reserve())!.studentId,'20260002');
  await vault.clear();await vault.succeeded(old!.id,old!.attemptId!);assert.equal(store.raw(),null);assert.equal((await vault.status()).enabled,false);
});
test('explicit retry creates a new reservation; a stale success cannot unlock a new failed attempt',async()=>{
  const store=memory(),vault=createTongjiLoginVault(store.adapter);await vault.save('20260001','test-password',true);const first=(await vault.reserve())!;
  await vault.retry();const second=(await vault.reserve())!;assert.notEqual(first.attemptId,second.attemptId);
  await vault.succeeded(first.id,first.attemptId!);assert.equal((await vault.status()).state,'needs-user');
  await vault.release(second.id,second.attemptId!);assert.equal((await vault.status()).state,'ready');assert.equal((await vault.status()).lastSuccess,null);
});
test('vault failures do not release a password and corrupted values do not appear in error messages',async()=>{
  const store=memory(),vault=createTongjiLoginVault(store.adapter);await vault.save('20260001','test-password',true);
  const broken=createTongjiLoginVault({...store.adapter,set:async()=>{throw new Error('vault-failure');}});await assert.rejects(broken.reserve(),/vault-failure/);
  store.corrupt('{"password":"SECRET_TEST_ONLY",bad');await assert.rejects(vault.status(),error=>error instanceof Error&&!error.message.includes('SECRET_TEST_ONLY'));
});
test('credential injection is confined to HTTPS university login routes and the probe contains no password',()=>{
  assert.equal(trustedTongjiLoginPage('https://iam.tongji.edu.cn/idp/AuthnEngine'),true);
  assert.equal(trustedTongjiLoginPage('https://iam.tongji.edu.cn/idp/authcenter/ActionAuthChain?entityId=SYS20230086'),true);
  for(const url of ['https://canvas.tongji.edu.cn/login/canvas','http://iam.tongji.edu.cn/idp/AuthnEngine','https://iam.tongji.edu.cn.example.test/idp/AuthnEngine','https://iam.tongji.edu.cn/self-service','https://user:pass@iam.tongji.edu.cn/idp/AuthnEngine'])assert.equal(trustedTongjiLoginPage(url),false);
  const probe=tongjiStudentLoginScript('test-nonce');assert.equal(probe.includes('test-password'),false);assert.equal(probe.includes('credentials=null'),true);
});
