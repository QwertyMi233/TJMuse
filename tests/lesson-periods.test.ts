import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_PERIODS,periodEnd,validateLessonPeriods} from '../src/core/lesson-periods';
import {restoreData} from '../src/core/storage';
import {initialData} from '../src/core/defaults';
test('lesson duration derives the end time and rejects overnight or invalid values',()=>{
  assert.equal(periodEnd('08:00',45),'08:45');assert.equal(periodEnd('10:50',95),'12:25');
  for(const n of [0,-1,1.5,361,NaN])assert.throws(()=>periodEnd('08:00',n));assert.throws(()=>periodEnd('23:45',30));
});
test('period changes reject overlap and leave the default template intact',()=>{
  const periods=structuredClone(DEFAULT_PERIODS);periods[0]!.end='08:55';assert.throws(()=>validateLessonPeriods(periods),/重叠/);assert.equal(DEFAULT_PERIODS[0]!.end,'08:45');
});
test('default time template survives restart, migrates old data, and rejects corrupt settings',()=>{
  const data=structuredClone(initialData);data.settings.lessonPeriods[0]!.start='07:50';const restored=restoreData(JSON.parse(JSON.stringify(data)));assert.equal(restored.settings.lessonPeriods[0]!.start,'07:50');
  const old:any=structuredClone(initialData);delete old.settings.lessonPeriods;assert.deepEqual(restoreData(old).settings.lessonPeriods,DEFAULT_PERIODS);
  old.settings.lessonPeriods=[{number:1,start:'25:00',end:'26:00'}];assert.deepEqual(restoreData(old).settings.lessonPeriods,DEFAULT_PERIODS);
});
