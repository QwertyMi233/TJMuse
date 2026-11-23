import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSessionQueue,type SessionTask} from '../src/core/session-queue';
import {registerSessionHost,runOfficialSession,WebSessionError} from '../src/services/web-session';
const wait=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const options=(extra:Partial<SessionTask<string>>={}):SessionTask<string>=>({run:async()=> 'ok',background:false,preemptible:false,timeoutMs:200,cancelError:()=>new Error('cancelled'),timeoutError:()=>new Error('timeout'),...extra});
test('a wedged embedded login times out and releases the next login even if the old host ignores cancellation',async()=>{
 const queue=createSessionQueue(0);let aborted=false;
 const stuck=queue.enqueue(options({timeoutMs:10,run:signal=>{signal.addEventListener('abort',()=>aborted=true);return new Promise(()=>{});}}));
 const checked=assert.rejects(stuck,/timeout/),next=queue.enqueue(options());await checked;assert.equal(await next,'ok');assert.equal(aborted,true);
});
test('manual login preempts a silent login, including queued silent recovery, without launching external UI',async()=>{
 const queue=createSessionQueue(0),calls:string[]=[];
 const background=queue.enqueue(options({background:true,preemptible:true,run:async()=>{calls.push('background');return new Promise(()=>{});}}));const stopped=assert.rejects(background,/cancelled/);await wait(1);
 const queued=queue.enqueue(options({background:true,preemptible:true,run:async()=>{calls.push('should-not-start');return 'bad';}}));const removed=assert.rejects(queued,/cancelled/);
 const manual=queue.enqueue(options({run:async()=>{calls.push('manual');return 'connected';}}));await Promise.all([stopped,removed]);assert.equal(await manual,'connected');assert.deepEqual(calls,['background','manual']);
});
test('cancelling a queued login releases its caller immediately and never runs it later',async()=>{
 const queue=createSessionQueue(0),controller=new AbortController();let finish!:(v:string)=>void,called=false;
 const first=queue.enqueue(options({run:()=>new Promise(r=>finish=r)}));await wait(1);
 const second=queue.enqueue(options({signal:controller.signal,run:async()=>{called=true;return 'bad';}}));const stopped=assert.rejects(second,/user-cancel/);controller.abort(new Error('user-cancel'));await stopped;finish('first');assert.equal(await first,'first');await wait(3);assert.equal(called,false);
});
test('a stale completion after cancellation cannot finish or cancel a replacement login',async()=>{
 const queue=createSessionQueue(0),controller=new AbortController();let finish!:(v:string)=>void;
 const first=queue.enqueue(options({signal:controller.signal,run:()=>new Promise(r=>finish=r)}));const stopped=assert.rejects(first,/cancelled/);await wait(1);controller.abort(new Error('cancelled'));await stopped;
 const replacement=queue.enqueue(options({run:async()=>{await wait(5);return 'new-account';}}));finish('stale-account');assert.equal(await replacement,'new-account');
});
test('a foreground login does not interrupt a token rotation that is committing credentials',async()=>{
 const queue=createSessionQueue(0);let finish!:(v:string)=>void,signal!:AbortSignal;
 const rotation=queue.enqueue(options({background:true,preemptible:false,run:s=>{signal=s;return new Promise(r=>finish=r);}}));await wait(1);const manual=queue.enqueue(options());assert.equal(signal.aborted,false);finish('rotated');assert.equal(await rotation,'rotated');assert.equal(await manual,'ok');
});
test('official session bridge passes a cancellable signal through a hidden Haoke login and recovers for manual login',async()=>{
 const seen:boolean[]=[],controller=new AbortController();const remove=registerSessionHost(async job=>{seen.push(!!job.silent);if(job.silent)return new Promise(()=>{});return {status:'ok',token:'fixture-token'};});
 try{const silent=runOfficialSession({kind:'haoke-login',silent:true,signal:controller.signal});const cancelled=assert.rejects(silent,e=>e instanceof WebSessionError&&e.code==='cancelled');await wait(1);controller.abort(new WebSessionError('cancelled'));await cancelled;const result=await runOfficialSession({kind:'haoke-login',silent:false});assert.equal(result.token,'fixture-token');assert.deepEqual(seen,[true,false]);}finally{remove();}
});
