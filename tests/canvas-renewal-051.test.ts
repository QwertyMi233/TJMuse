import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canvasRenewalDue,canvasSessionCheckDue} from '../src/core/canvas-renewal';
import {restoreData} from '../src/core/storage';
import {initialData} from '../src/core/defaults';
import type {CanvasRenewal} from '../src/core/types';

const start=Date.parse('2026-11-14T08:00:00+08:00'),minute=60000;
const config=():CanvasRenewal=>({enabled:true,accountId:'42',tokenId:'7',purpose:'TJMuse',lastAttempt:new Date(start).toISOString(),lastRotated:new Date(start).toISOString(),expiresAt:null,status:'ready',message:''});
test('Canvas auto renewal becomes due exactly 30 minutes after the last successful rotation',()=>{
 const c=config();
 assert.equal(canvasRenewalDue(c,start+30*minute-1),false);
 assert.equal(canvasRenewalDue(c,start+30*minute),true);
 assert.equal(canvasRenewalDue(c,start+30*minute+1),true);
 // A new successful rotation starts the next half-hour interval.
 const next={...c,lastRotated:new Date(start+30*minute).toISOString(),lastAttempt:new Date(start+30*minute).toISOString()};
 assert.equal(canvasRenewalDue(next,start+60*minute-1),false);
 assert.equal(canvasRenewalDue(next,start+60*minute),true);
});
test('the shorter rotation interval preserves opt-out, login blocking, cooldown and early-expiry handling',()=>{
 const c=config(),now=start+60*minute;
 assert.equal(canvasRenewalDue({...c,enabled:false},now),false);
 assert.equal(canvasRenewalDue({...c,status:'needs-login'},now),false);
 const attempted={...c,lastAttempt:new Date(start+31*minute).toISOString()};
 assert.equal(canvasRenewalDue(attempted,start+61*minute-1),false);
 assert.equal(canvasRenewalDue(attempted,start+61*minute),true);
 assert.equal(canvasRenewalDue({...c,lastAttempt:null,expiresAt:new Date(start+20*minute).toISOString()},start),true);
 assert.equal(canvasSessionCheckDue({...c,lastSessionAttempt:new Date(start).toISOString()},start+10*minute-1),false);
 assert.equal(canvasSessionCheckDue({...c,lastSessionAttempt:new Date(start).toISOString()},start+10*minute),true);
});
test('saved renewal timestamps use the new interval on reopen without resetting user settings',()=>{
 const data=structuredClone(initialData);data.canvas.userId='42';data.canvas.renewal=config();
 data.settings.homeLayout='grouped';data.settings.todoNotifications=false;
 const restored=restoreData(JSON.parse(JSON.stringify(data)));
 assert.deepEqual(restored.settings,data.settings);
 assert.deepEqual(restored.canvas.renewal,{...data.canvas.renewal,lastErrorCode:null,lastSessionAttempt:null,lastSessionCheck:null});
 assert.equal(canvasRenewalDue(restored.canvas.renewal!,start+45*minute),true);
});
