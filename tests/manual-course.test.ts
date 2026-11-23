import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appendManualCourse,manualCourseWeeks} from '../src/core/manual-course';
import {DEFAULT_PERIODS,timetableTasksOn,validateTimetable} from '../src/core/timetable';
import {restoreData} from '../src/core/storage';
import {initialData} from '../src/core/defaults';
import {timetableGrid} from '../src/core/timetable-grid';
import type {Timetable,CourseSession} from '../src/core/types';
const table=():Timetable=>({id:'manual',name:'手动课表',enabled:true,semesterStartDate:'2026-09-14',weekStartsOn:1,importedAt:'2026-11-05T00:00:00Z',periods:structuredClone(DEFAULT_PERIODS),sessions:[]});
const session=():CourseSession=>({id:'one',title:' 数据科学 ',teacher:' 王老师 ',location:' 北301 ',weekday:1,startPeriod:1,endPeriod:2,weeks:manualCourseWeeks(1,16,'odd'),color:'#123456'});
test('manual course week range supports every, odd and even teaching weeks',()=>{
  assert.deepEqual(manualCourseWeeks(2,6,'all'),[2,3,4,5,6]);assert.deepEqual(manualCourseWeeks(2,6,'odd'),[3,5]);assert.deepEqual(manualCourseWeeks(2,6,'even'),[2,4,6]);
  for(const [a,b] of [[0,3],[3,2],[1,54],[1.5,3],[NaN,4]])assert.throws(()=>manualCourseWeeks(a!,b!,'all'));
  assert.throws(()=>manualCourseWeeks(2,2,'odd'),/没有/);
});
test('manual course appears in grid and timeline on matching weeks and hides with its table',()=>{
  const t=appendManualCourse(table(),session());assert.equal(t.sessions[0]!.title,'数据科学');
  assert.equal(timetableTasksOn([t],'2026-09-14').length,1);assert.equal(timetableTasksOn([t],'2026-09-21').length,0);assert.equal(timetableTasksOn([t],'2026-09-15').length,0);
  assert.equal(timetableGrid([t],'2026-09-14',1)[0]!.end,2);assert.equal(timetableTasksOn([{...t,enabled:false}],'2026-09-14').length,0);
});
test('appending preserves imported records and their shared period times',()=>{
  const t=appendManualCourse(table(),session()),before=structuredClone(t),s={...session(),id:'two',weekday:3,startTime:'08:20',endTime:'09:15'};
  const next=appendManualCourse(t,s);assert.deepEqual(t,before);assert.equal(next.sessions.length,2);assert.deepEqual(next.periods,before.periods);assert.deepEqual(next.sessions[0],before.sessions[0]);assert.throws(()=>appendManualCourse(next,s),/重复/);
});
test('custom course times survive restart and feed actual timeline durations',()=>{
  const t=appendManualCourse(table(),{...session(),startTime:'08:20',endTime:'09:15'});
  const data=restoreData(JSON.parse(JSON.stringify({...structuredClone(initialData),timetables:[t]})));
  const task=timetableTasksOn(data.timetables,'2026-09-14')[0]!;assert.equal(task.time,'08:20');assert.equal(task.duration,55);assert.equal(data.timetables[0]!.sessions[0]!.endTime,'09:15');
});
test('invalid manual courses cannot replace a valid saved timetable',()=>{
  const t=appendManualCourse(table(),session());
  for(const bad of [{title:' '},{weekday:8},{startPeriod:3,endPeriod:1},{startPeriod:0},{endPeriod:12},{startTime:'09:00',endTime:'08:00'},{startTime:'bad',endTime:'09:00'},{startTime:'08:00'}])assert.throws(()=>appendManualCourse(t,{...session(),id:'bad',...bad}));
  assert.equal(validateTimetable(t),t);
});
