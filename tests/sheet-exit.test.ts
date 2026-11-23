import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SheetExit} from '../src/ui/sheet-exit';

test('save commits only after dismissal, once, without running the cancel/back callback',()=>{
  const exit=new SheetExit(),events:string[]=[];
  exit.request(()=>events.push('dismiss'),()=>events.push('save'));
  exit.request(()=>events.push('dismiss again'),()=>events.push('save twice'));
  assert.deepEqual(events,['dismiss']);
  exit.complete(()=>events.push('back'));
  exit.complete(()=>events.push('back again'));
  assert.deepEqual(events,['dismiss','save']);
});
test('X and a native swipe each close their presentation only once',()=>{
  for(const request of [true,false]){
    const exit=new SheetExit(),events:string[]=[];
    if(request)exit.request(()=>events.push('dismiss'));
    exit.complete(()=>events.push('close'));
    exit.complete(()=>events.push('reopen parent'));
    exit.request(()=>events.push('late dismiss'),()=>events.push('late save'));
    assert.deepEqual(events,request?['dismiss','close']:['close']);
  }
});
test('navigation starts after the old presenter finishes and never calls its close callback',()=>{
  const exit=new SheetExit(),events:string[]=[];
  exit.request(()=>events.push('dismiss old'),()=>events.push('open child'));
  assert.deepEqual(events,['dismiss old']);
  exit.complete(()=>events.push('close settings'));
  assert.deepEqual(events,['dismiss old','open child']);
});
