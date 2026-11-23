import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAppOpenSync} from '../src/core/app-open-sync';
test('sync runs once on launch and each return from background, not permission dialogs or duplicate active events',async()=>{
  let count=0;const sync=createAppOpenSync(async()=>{count++;});
  await sync.onState('active');await sync.onState('active');await sync.onState('inactive');await sync.onState('active');assert.equal(count,1);
  await sync.onState('inactive');await sync.onState('background');await sync.onState('active');assert.equal(count,2);
  sync.dispose();await sync.request();assert.equal(count,2);
});
test('overlapping platform recovery requests share one flight; failure does not block the next app open',async()=>{
  let count=0,release=()=>{},errors=0;
  const sync=createAppOpenSync(async()=>{count++;if(count===1)await new Promise<void>(r=>{release=r;});else if(count===2)throw new Error('offline');},()=>{errors++;});
  const first=sync.onState('active');await Promise.resolve();const second=sync.request();release();await Promise.all([first,second]);assert.equal(count,1);
  await sync.onState('background');await sync.onState('active');assert.equal(count,2);assert.equal(errors,1);
  await sync.onState('background');await sync.onState('active');assert.equal(count,3);
});
test('an initially unknown native AppState still syncs on the first active event',async()=>{
  let count=0;const sync=createAppOpenSync(async()=>{count++;});
  await sync.onState('unknown');await sync.onState('inactive');await sync.onState('active');assert.equal(count,1);
});
test('returning from background during a suspended sync queues exactly one fresh sync after it finishes',async()=>{
  let count=0,release=()=>{};const sync=createAppOpenSync(async()=>{count++;if(count===1)await new Promise<void>(r=>{release=r;});});
  const first=sync.onState('active');await Promise.resolve();await sync.onState('background');const resumed=sync.onState('active');sync.request(true);release();await Promise.all([first,resumed]);assert.equal(count,2);
});
