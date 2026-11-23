import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData} from '../src/core/defaults';
import {dateTime,isComplete} from '../src/core/calendar';
import {homeAgenda,homeGroups,dailyOverviewTasks} from '../src/core/home-layout';
import {widgetView} from '../src/core/widget-agenda';
import type {Task,CanvasAssignment} from '../src/core/types';

const day='2027-09-13',now=dateTime(day,'12:00');
const task=(id:string,kind:'todo'|'course'='todo',time='09:00'):Task=>({id,title:id,kind,date:day,time,duration:60,color:'#0066B3',description:'',location:'',repeat:null,subtasks:[],completedDates:[]});
const homework=(id:string,completed=true):CanvasAssignment=>({id,title:id,courseId:'1',courseName:'math',description:'',url:'https://canvas.tongji.edu.cn',unlockAt:dateTime(day,'08:00').toISOString(),dueAt:dateTime(day,'23:59').toISOString(),submitted:false,completed});
test('only completed To-dos remain in home history, ended courses and completed homework stay hidden',()=>{
  const d=structuredClone(initialData);
  d.tasks=[task('past-course','course'),task('next-course','course','14:00'),{...task('done-todo'),completedDates:[day]},task('missed'),task('later','todo','15:00')];
  d.canvas.assignments=[homework('done-homework'),homework('future-homework',false)];
  const before=JSON.stringify(d),a=homeAgenda(d,day,now);
  assert.deepEqual(a.pending.map(t=>t.id),['canvas:future-homework','next-course','later']);
  assert.deepEqual(a.overdue.map(t=>t.id),['missed']);
  const groups=homeGroups([...a.pending,...a.completed],day,d.settings.homeCategoryOrder);
  assert.deepEqual(groups.map(g=>[g.category,g.completed.map(t=>t.id)]),[['todo',['done-todo']],['course',[]],['homework',[]]]);
  assert.ok(a.completed.every(t=>isComplete(t,day)));
  assert.equal(JSON.stringify(d),before,'filtering never edits source data');
  assert.deepEqual(dailyOverviewTasks(d,day,now).map(t=>t.id),['canvas:future-homework','missed','next-course','later']);
  assert.ok(widgetView(d,now).rows.every(t=>!['done-todo','past-course','done-homework'].includes(t.title)));
});
test('completed history stays scoped to selected day and honors homework visibility/deactivation',()=>{
  const d=structuredClone(initialData);
  d.tasks=[{...task('repeat'),date:'2027-09-12',repeat:{unit:'day',interval:1,weekdays:[],weekStartsOn:1},completedDates:['2027-09-12']},task('course','course')];
  d.canvas.assignments=[homework('hidden'),homework('disabled'),homework('deleted')];
  d.canvas.preferences={hidden:{visibility:'hide',deleted:false},disabled:{visibility:'default',deleted:false,temporaryDisabled:true},deleted:{visibility:'default',deleted:true}};
  const today=homeAgenda(d,day,now);
  assert.deepEqual(today.completed.map(t=>t.id),[]);
  assert.deepEqual(today.overdue.map(t=>t.occurrenceDate),[day]);
  assert.deepEqual(homeAgenda(d,'2027-09-12',now).completed.map(t=>t.id),['repeat']);
  assert.equal(homeAgenda(d,'2027-09-14',now).completed.length,0);
});
test('a cross-day completed To-do can be unchecked and returns to the correct active or overdue section',()=>{
  const d=structuredClone(initialData);
  d.tasks=[{...task('overnight','todo','23:00'),date:'2027-09-12',duration:840,completedDates:['2027-09-12']}];
  assert.deepEqual(homeAgenda(d,day,now).completed.map(t=>t.id),['overnight']);
  d.tasks[0]!.completedDates=[];
  const active=homeAgenda(d,day,now);assert.equal(active.completed.length,0);assert.equal(active.pending[0]!.id,'overnight');
  const late=homeAgenda(d,day,dateTime(day,'14:00'));assert.equal(late.pending.length,0);assert.equal(late.overdue[0]!.id,'overnight');
});
