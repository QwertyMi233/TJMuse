import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailyTasks, homeworkOn, homeworkStart, mergeHomework } from '../src/core/homework';
import { isComplete } from '../src/core/calendar';
import { upcomingReminders } from '../src/core/reminders';
import { initialData } from '../src/core/defaults';
import { plannerContext } from '../src/services/ai';
import type { CanvasAssignment, Task } from '../src/core/types';
const iso=(date:string,time='00:00')=>new Date(`${date}T${time}:00+08:00`).toISOString();
const assignment:CanvasAssignment={id:'1:7',courseId:'1',courseName:'数学',title:'跨日作业',description:'练习',unlockAt:iso('2026-10-28','15:00'),createdAt:iso('2026-10-20'),firstSeenAt:iso('2026-10-29'),dueAt:iso('2026-10-30','18:00'),url:'https://canvas.tongji.edu.cn/courses/1/assignments/7',submitted:false,completed:false};
test('assignment appears once on every date of its inclusive window with shared completion',()=>{
  const dates=['2026-10-28','2026-10-29','2026-10-30'];
  assert.equal(homeworkOn([assignment],'2026-10-27').length,0);
  assert.equal(homeworkOn([assignment],'2026-10-31').length,0);
  for(const date of dates){const items=homeworkOn([assignment],date);assert.equal(items.length,1);assert.equal(items[0]!.id,'canvas:1:7');assert.equal(items[0]!.homeworkDueAt,assignment.dueAt);assert.equal(isComplete(items[0]!,date),false);}
  for(const completed of [{...assignment,completed:true},{...assignment,submitted:true}])for(const date of dates)assert.equal(isComplete(homeworkOn([completed],date)[0]!,date),true);
  assert.equal(assignment.completed,false);
});
test('start date prefers unlock, falls back to creation or first sync, and handles legacy cache',()=>{
  assert.equal(homeworkStart(assignment)!.source,'开放');
  const creation={...assignment,unlockAt:null};assert.equal(homeworkStart(creation)!.source,'创建');assert.equal(homeworkOn([creation],'2026-10-20').length,1);
  const seen={...creation,createdAt:null};assert.equal(homeworkStart(seen)!.source,'首次同步');assert.equal(homeworkOn([seen],'2026-10-28').length,0);assert.equal(homeworkOn([seen],'2026-10-29').length,1);
  const legacy={...seen,firstSeenAt:null};assert.equal(homeworkOn([legacy],'2026-10-29').length,0);assert.equal(homeworkOn([legacy],'2026-10-30').length,1);
  assert.equal(homeworkOn([{...assignment,dueAt:null}],'2026-10-29').length,0);
});
test('all placement options work throughout the window, using start, ongoing and due times',()=>{
  for(const [date,timeline]of [['2026-10-28',['n','canvas:1:7']],['2026-10-29',['canvas:1:7','n']],['2026-10-30',['n','canvas:1:7']]] as const){
    const task:Task={id:'n',title:'普通事项',date,time:'12:00',duration:30,description:'',location:'',color:'#123B64',kind:'todo',repeat:null,subtasks:[],completedDates:[]};
    assert.deepEqual(dailyTasks([task],[assignment],date,'timeline').map(t=>t.id),[...timeline]);
    assert.deepEqual(dailyTasks([task],[assignment],date,'top').map(t=>t.id),['canvas:1:7','n']);
    assert.deepEqual(dailyTasks([task],[assignment],date,'bottom').map(t=>t.id),['n','canvas:1:7']);
  }
});
test('midnight deadlines, year boundaries and windows longer than 365 days are inclusive',()=>{
  const wide={...assignment,unlockAt:iso('2024-12-31','23:00'),dueAt:iso('2026-01-01','00:00')};
  for(const day of ['2024-12-31','2025-01-01','2025-12-31','2026-01-01'])assert.equal(homeworkOn([wide],day).length,1);
  assert.equal(homeworkOn([wide],'2026-01-02').length,0);
  assert.equal(homeworkOn([wide],'bad-date').length,0);
});
test('sync retains first seen and completion while updated Canvas dates change visibility',()=>{
  const old={...assignment,completed:true,firstSeenAt:iso('2026-10-25')};
  const next=mergeHomework([old],[{...assignment,unlockAt:iso('2026-10-27'),dueAt:iso('2026-11-01'),firstSeenAt:iso('2026-10-29')}]);
  assert.equal(next[0]!.firstSeenAt,old.firstSeenAt);assert.equal(next[0]!.completed,true);
  assert.equal(homeworkOn(next,'2026-10-27').length,1);assert.equal(homeworkOn(next,'2026-11-01').length,1);
  const fresh=mergeHomework([],next);assert.equal(fresh[0]!.completed,false);
  const legacy={...assignment,firstSeenAt:undefined};assert.equal(mergeHomework([legacy],[assignment],iso('2026-10-26'))[0]!.firstSeenAt,iso('2026-10-26'));
});
test('daily visibility creates only one deadline reminder and AI receives the availability window',()=>{
  const data=structuredClone(initialData);data.canvas.assignments=[assignment];data.settings.homeworkNotifications=true;
  const reminders=upcomingReminders(data,new Date(iso('2026-10-28','08:00')));
  assert.equal(reminders.length,1);assert.equal(reminders[0]!.at.toISOString(),iso('2026-10-30','17:50'));
  const context=plannerContext(data,new Date(iso('2026-10-29','08:00')));assert.ok(context.includes(assignment.unlockAt!));assert.ok(context.includes(assignment.dueAt!));assert.ok(context.includes('列表逐日显示不代表整个区间持续占用'));
  data.canvas.assignments[0]!.completed=true;assert.equal(upcomingReminders(data,new Date(iso('2026-10-28','08:00'))).length,0);
});
