import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData} from '../src/core/defaults';
import {restoreData} from '../src/core/storage';
import {DEFAULT_PERIODS,timetableTasksOn,validateTimetable} from '../src/core/timetable';
import {timetableGrid} from '../src/core/timetable-grid';
test('custom course colors and manual row height survive restoration and feed both the grid and home timeline',()=>{
  const data=structuredClone(initialData);data.settings.timetableRowHeight=72;data.timetables=[{id:'a',name:'课程表',enabled:true,semesterStartDate:'2026-09-14',weekStartsOn:1,importedAt:'2026-11-05T00:00:00Z',periods:DEFAULT_PERIODS,sessions:[{id:'m',title:'数学',teacher:'',location:'北301',weekday:1,startPeriod:1,endPeriod:2,weeks:[1,2],color:'#123456'}]}];
  const restored=restoreData(JSON.parse(JSON.stringify(data)));assert.equal(restored.settings.timetableRowHeight,72);assert.equal(restored.timetables[0]!.sessions[0]!.color,'#123456');assert.equal(timetableTasksOn(restored.timetables,'2026-09-14')[0]!.color,'#123456');assert.equal(timetableGrid(restored.timetables,'2026-09-14',1)[0]!.color,'#123456');
  const invalid=structuredClone(data);invalid.timetables[0]!.sessions[0]!.color='invalid';assert.throws(()=>validateTimetable(invalid.timetables[0]!),/颜色/);invalid.settings.timetableRowHeight=100000;assert.equal(restoreData(invalid).settings.timetableRowHeight,null);
});
test('older settings default to automatic row fitting and preserve the user AI write switch',()=>{
  const data:any=structuredClone(initialData);delete data.settings.timetableRowHeight;data.settings.aiWriteEnabled=false;const restored=restoreData(data);assert.equal(restored.settings.timetableRowHeight,null);assert.equal(restored.settings.aiWriteEnabled,false);
});
