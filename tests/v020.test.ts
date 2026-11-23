import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialData } from '../src/core/defaults';
import { restoreData } from '../src/core/storage';
import { homeworkOn, homeworkVisible, mergeHomework } from '../src/core/homework';
import { canvasAutoSyncSlot, nextCanvasAutoSync } from '../src/core/canvas-sync';
import { upcomingReminders } from '../src/core/reminders';
import { plannerContext } from '../src/services/ai';
import type { CanvasAssignment, Task } from '../src/core/types';
const at=(day:string,time='00:00')=>new Date(`${day}T${time}:00+08:00`).toISOString();
const work:CanvasAssignment={id:'1:1',courseId:'1',courseName:'数学',title:'截止作业',description:'练习',dueAt:at('2026-10-29','12:00'),createdAt:at('2026-10-27'),firstSeenAt:at('2026-10-28'),url:'https://canvas.tongji.edu.cn/courses/1/assignments/1',submitted:false,completed:false};
test('homework display defaults, overrides and the master switch have predictable priority',()=>{
 const settings=structuredClone(initialData.settings),undated={...work,dueAt:null};
 assert.equal(homeworkVisible(work,settings),true);assert.equal(homeworkVisible(undated,settings),false);
 assert.equal(homeworkVisible(undated,settings,{visibility:'show',deleted:false}),true);
 assert.equal(homeworkVisible(work,settings,{visibility:'hide',deleted:false}),false);
 settings.showDatedHomeworkByDefault=false;assert.equal(homeworkVisible(work,settings),false);assert.equal(homeworkVisible(work,settings,{visibility:'show',deleted:false}),true);
 settings.showUndatedHomeworkByDefault=true;assert.equal(homeworkVisible(undated,settings),true);
 settings.showHomeworkInTodo=false;assert.equal(homeworkVisible(work,settings,{visibility:'show',deleted:false}),false);
 settings.showHomeworkInTodo=true;assert.equal(homeworkVisible(work,settings,{visibility:'show',deleted:true}),false);
});
test('an explicitly shown undated assignment spans dates after its start without inventing a deadline',()=>{
 const data=structuredClone(initialData),undated={...work,dueAt:null};
 const prefs={'1:1':{visibility:'show' as const,deleted:false}};
 assert.equal(homeworkOn([undated],'2026-10-26',data.settings,prefs).length,0);
 for(const date of ['2026-10-27','2026-10-29','2027-01-01']){
  const occurrence=homeworkOn([undated],date,data.settings,prefs)[0]!;assert.equal(occurrence.homeworkDueAt,undefined);assert.equal(occurrence.id,'canvas:1:1');
 }
 data.canvas.assignments=[undated];data.canvas.preferences=prefs;data.settings.homeworkNotifications=true;
 assert.equal(upcomingReminders(data,new Date(at('2026-10-26'))).length,0);
});
test('local deletion and display choices survive sync, missing snapshots and application restoration',()=>{
 const data=structuredClone(initialData);data.canvas.assignments=[work];data.canvas.preferences[work.id]={visibility:'show',deleted:true};
 data.canvas.assignments=mergeHomework(data.canvas.assignments,[{...work,title:'服务端更新'}]);
 assert.equal(homeworkOn(data.canvas.assignments,'2026-10-29',data.settings,data.canvas.preferences).length,0);
 data.canvas.assignments=[];const restored=restoreData(JSON.parse(JSON.stringify(data)));
 restored.canvas.assignments=mergeHomework([], [work]);
 assert.equal(restored.canvas.preferences[work.id]!.deleted,true);
 assert.equal(homeworkOn(restored.canvas.assignments,'2026-10-29',restored.settings,restored.canvas.preferences).length,0);
 restored.canvas.preferences[work.id]!.deleted=false;
 assert.equal(homeworkOn(restored.canvas.assignments,'2026-10-29',restored.settings,restored.canvas.preferences).length,1);
});
test('homework notifications are independent and support one, two and three hour offsets',()=>{
 const data=structuredClone(initialData);data.canvas.assignments=[work];data.settings.homeworkNotifications=true;
 data.settings.todoNotifications=false;data.settings.courseNotifications=false;data.settings.showHomeworkInTodo=false;
 for(const minutes of [60,120,180]){data.settings.reminderMinutes=minutes;const r=upcomingReminders(data,new Date(at('2026-10-27')));assert.equal(r.length,1);assert.equal(r[0]!.category,'homework');assert.equal(r[0]!.at.getTime(),new Date(work.dueAt!).getTime()-minutes*60000);}
 data.settings.homeworkNotifications=false;assert.equal(upcomingReminders(data,new Date(at('2026-10-27'))).length,0);
 const task:Task={id:'todo',title:'普通任务',description:'',location:'',date:'2026-10-29',time:'12:00',duration:30,color:'#123B64',kind:'todo',repeat:null,subtasks:[],completedDates:[]};
 data.tasks=[task];data.settings.todoNotifications=true;assert.deepEqual(upcomingReminders(data,new Date(at('2026-10-27'))).map(r=>r.title),['普通任务']);
 data.settings.homeworkNotifications=true;data.canvas.preferences[work.id]={visibility:'default',deleted:true};assert.deepEqual(upcomingReminders(data,new Date(at('2026-10-27'))).map(r=>r.title),['普通任务']);
});
test('0.1.x migration retains prior notification behavior and restores all new preferences',()=>{
 const old=JSON.parse(JSON.stringify(initialData));old.settings.todoNotifications=true;
 for(const key of ['homeworkNotifications','showHomeworkInTodo','showDatedHomeworkByDefault','showUndatedHomeworkByDefault'])delete old.settings[key];
 delete old.canvas.preferences;old.canvas.assignments=[{...work,firstSeenAt:undefined}];old.canvas.lastSync=at('2026-10-28');
 const data=restoreData(old);assert.equal(data.settings.homeworkNotifications,true);assert.equal(data.settings.showHomeworkInTodo,true);assert.equal(data.settings.showUndatedHomeworkByDefault,false);assert.equal(data.canvas.assignments[0]!.firstSeenAt,old.canvas.lastSync);
 data.settings.homeworkNotifications=false;data.settings.reminderMinutes=180;data.settings.showUndatedHomeworkByDefault=true;
 const again=restoreData(JSON.parse(JSON.stringify(data)));assert.equal(again.settings.homeworkNotifications,false);assert.equal(again.settings.reminderMinutes,180);assert.equal(again.settings.showUndatedHomeworkByDefault,true);
});
test('automatic Canvas scheduling only permits midnight and noon and handles date boundaries',()=>{
 for(const time of ['00:01','00:59','08:00','11:59','12:01','23:59'])assert.equal(canvasAutoSyncSlot(new Date(at('2026-10-29',time))),null);
 assert.equal(canvasAutoSyncSlot(new Date(at('2026-10-29','00:00'))),'2026-10-29T00:00');
 assert.equal(canvasAutoSyncSlot(new Date(at('2026-10-29','12:00'))),'2026-10-29T12:00');
 assert.equal(nextCanvasAutoSync(new Date(at('2026-10-29','08:00'))).toISOString(),at('2026-10-29','12:00'));
 assert.equal(nextCanvasAutoSync(new Date(at('2026-12-31','12:00'))).toISOString(),at('2027-01-01','00:00'));
});
test('local deletion removes homework from future AI planning without changing Canvas data',()=>{
 const data=structuredClone(initialData);data.canvas.assignments=[{...work,title:'已删除案例'}];data.canvas.preferences[work.id]={visibility:'default',deleted:true};
 assert.equal(plannerContext(data,new Date(at('2026-10-29','08:00'))).includes('已删除案例'),false);
 assert.equal(data.canvas.assignments[0]!.title,'已删除案例');
});
