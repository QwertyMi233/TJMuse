import {test} from 'node:test';
import assert from 'node:assert/strict';
import {timetableGrid} from '../src/core/timetable-grid';
import {DEFAULT_PERIODS} from '../src/core/timetable';
import type {Timetable} from '../src/core/types';
const table:Timetable={id:'a',name:'A',enabled:true,semesterStartDate:'2026-09-14',weekStartsOn:1,importedAt:'2026-11-05',periods:DEFAULT_PERIODS,sessions:[{id:'c',title:'数学',teacher:'教师',location:'北301',weekday:1,startPeriod:1,endPeriod:2,weeks:[1,3,5]}]};
test('the displayed week respects each table semester anchor, visibility and odd/even weeks',()=>{
  assert.equal(timetableGrid([table],'2026-09-14',1).length,1);
  assert.equal(timetableGrid([table],'2026-09-21',1).length,0);
  assert.equal(timetableGrid([{...table,enabled:false}],'2026-09-14',1).length,0);
  const separate={...table,id:'b',semesterStartDate:'2026-09-21'};
  const result=timetableGrid([table,separate],'2026-09-21',1);assert.equal(result.length,1);assert.equal(result[0]!.task.timetableId,'b');
  assert.equal(timetableGrid([table],'2026-09-14',0)[0]!.weekday,1);
});
test('overlapping courses use separate lanes, while touching periods reuse a full column',()=>{
  const second={...table,id:'b'},third={...table,id:'d',sessions:[{...table.sessions[0]!,id:'later',startPeriod:3,endPeriod:4}]};
  const lessons=timetableGrid([table,second,third],'2026-09-14',1);
  assert.equal(lessons.length,3);assert.equal(lessons[0]!.lanes,2);assert.equal(lessons[1]!.lanes,2);assert.notEqual(lessons[0]!.lane,lessons[1]!.lane);assert.equal(lessons[2]!.lanes,1);
  assert.equal(lessons[0]!.task.time,'08:00');assert.equal(lessons[0]!.task.endTime,'09:35');
});
