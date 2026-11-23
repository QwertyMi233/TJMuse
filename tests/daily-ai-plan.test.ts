import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDailyAIPlanner,createAIRequestGate,parseDailyPlanLedger} from '../src/core/daily-ai-plan';
function setup(){
 let raw:string|null=null,day='2026-11-05',calls=0,keys=0;const errors:unknown[]=[];
 const options={today:()=>day,read:async()=>raw,write:async(v:string)=>{raw=v;},key:async()=>{keys++;return 'fixture-key';},generate:async()=>{assert.ok(parseDailyPlanLedger(raw).includes(day));calls++;},report:(e:unknown)=>{errors.push(e);}};
 return {options,raw:()=>raw,setRaw:(v:string)=>{raw=v;},day:(v:string)=>{day=v;},calls:()=>calls,keys:()=>keys,errors};
}
test('daily startup planning persists before HTTP and never repeats after remount or same-day foreground events',async()=>{
 const s=setup(),a=createDailyAIPlanner(s.options);await Promise.all([a.request(),a.request(),a.request()]);await a.request();assert.equal(s.calls(),1);a.dispose();await createDailyAIPlanner(s.options).request();assert.equal(s.calls(),1);
 s.day('2026-11-06');await createDailyAIPlanner(s.options).request();assert.equal(s.calls(),2);s.day('2026-11-05');await createDailyAIPlanner(s.options).request();assert.equal(s.calls(),2);
});
test('concurrent controllers share an atomic native-runtime claim',async()=>{
 const s=setup();await Promise.all([createDailyAIPlanner(s.options).request(),createDailyAIPlanner(s.options).request()]);assert.equal(s.calls(),1);
});
test('no key and later key configuration do not silently create a same-day request',async()=>{
 const s=setup();await createDailyAIPlanner({...s.options,key:async()=>''}).request();await createDailyAIPlanner(s.options).request();assert.equal(s.calls(),0);
});
test('network failure consumes only one automatic attempt, with no implicit retries',async()=>{
 const s=setup();let calls=0;const options={...s.options,generate:async()=>{calls++;throw Error('offline');}};
 await createDailyAIPlanner(options).request();await createDailyAIPlanner(options).request();assert.equal(calls,1);assert.equal(s.errors.length,1);
});
test('cancelled or disposed automatic requests remain consumed across restart',async()=>{
 const s=setup();let started=()=>{};const ready=new Promise<void>(r=>{started=r;});
 const planner=createDailyAIPlanner({...s.options,generate:async(_d:string,_k:string,signal:AbortSignal)=>{started();await new Promise<void>((_r,reject)=>signal.addEventListener('abort',()=>reject(Error('cancelled')),{once:true}));}});
 const job=planner.request();await ready;planner.cancel();await job;await createDailyAIPlanner(s.options).request();assert.equal(s.calls(),0);assert.equal(s.errors.length,0);
});
test('storage failures or malformed ledger fail closed before any model request',async()=>{
 const s=setup();await createDailyAIPlanner({...s.options,write:async()=>{throw Error('disk full');}}).request();assert.equal(s.calls(),0);assert.equal(s.keys(),0);
 s.setRaw('broken');await createDailyAIPlanner(s.options).request();assert.equal(s.calls(),0);assert.equal(s.errors.length,2);
});
test('request leases prevent overlap and stale cleanup cannot release a newer request',()=>{
 const gate=createAIRequestGate(),first=gate.claim()!;assert.equal(gate.claim(),null);first.release();const second=gate.claim()!;first.release();assert.equal(gate.claim(),null);second.release();assert.ok(gate.claim());
});
