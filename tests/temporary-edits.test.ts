import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialData} from '../src/core/defaults';
import {DEFAULT_PERIODS,timetableTasksOn,regularTasksOn} from '../src/core/timetable';
import {proposeTemporaryActions} from '../src/core/temporary-actions';
import {proposeStateActions,undoStateChanges} from '../src/core/ai-state-actions';
import {restoreData} from '../src/core/storage';
import {allHomework} from '../src/core/platforms';
import {mergeCanvasHomework} from '../src/core/homework-trash';
import {homeTasksOn} from '../src/core/home-layout';
import {upcomingReminders} from '../src/core/reminders';
import {readAISchedule,commitAIReply,undoAIReply} from '../src/core/ai-schedule';
import type {AppData} from '../src/core/types';
import {requestAIWithActions} from '../src/services/ai';
const now=new Date('2027-09-13T00:00:00+08:00'),date='2027-09-13';
function fixture(){
 const d:AppData=structuredClone(initialData);d.settings.homeLayout='grouped';d.settings.todoNotifications=d.settings.courseNotifications=d.settings.homeworkNotifications=true;
 d.timetables=[{id:'table',name:'课表',enabled:true,semesterStartDate:date,weekStartsOn:1,importedAt:now.toISOString(),periods:DEFAULT_PERIODS,sessions:[{id:'math',title:'数学',teacher:'张',location:'北301',weekday:1,startPeriod:1,endPeriod:2,weeks:[1,2]}]}];
 for(const platform of ['canvas','haoke','zhixuemeng'] as const){d[platform].userId='1';d[platform].connected=true;d[platform].assignments=[{platform,id:platform==='canvas'?'1:2':`${platform}:1:2`,courseId:'1',courseName:'数学',title:'原始作业',description:'平台说明',dueAt:'2027-09-13T20:00:00+08:00',unlockAt:'2027-09-13T00:00:00+08:00',completed:false,submitted:false,url:'https://example.com'}];}
 return d;
}
const id=timetableTasksOn(fixture().timetables,date)[0]!.id;
test('temporary course edits affect only one date, survive reload, drive the schedule, and safely undo',()=>{
 const original=fixture(),p=proposeTemporaryActions(original,JSON.stringify({items:[{occurrence_id:id,date,reset:false,changes:{title:'临时研讨',location:'南201',time:'10:00',endTime:'11:00',color:'#123456'}}]}),'course-local',now);
 assert.equal(original.timetables[0]!.sessions[0]!.title,'数学');assert.equal(regularTasksOn(p.data,date)[0]!.title,'临时研讨');assert.equal(regularTasksOn(p.data,'2027-09-20')[0]!.title,'数学');
 const restored=restoreData(JSON.parse(JSON.stringify(p.data)),now);assert.equal(regularTasksOn(restored,date)[0]!.time,'10:00');
 assert.equal(readAISchedule(restored,JSON.stringify({from_date:date,to_date:date}))[0]!.tasks.find(t=>t.id===id)?.title,'临时研讨');
 assert.equal(upcomingReminders(restored,now).find(t=>t.id.includes(id))?.title,'临时研讨');
 assert.equal(regularTasksOn(undoStateChanges(restored,p.changes),date)[0]!.title,'数学');
 const reset=proposeTemporaryActions(restored,JSON.stringify({items:[{occurrence_id:id,date,reset:true}]}),'course-local',now);assert.equal(regularTasksOn(reset.data,date)[0]!.time,'08:00');
 assert.throws(()=>proposeTemporaryActions(original,JSON.stringify({items:[{occurrence_id:id,date,reset:false,changes:{time:'10:00',endTime:'09:00'}}]}),'course-local',now));
});
test('temporary course activation is independent of editing and next week stays enabled',()=>{
 let d=fixture();d=proposeStateActions(d,JSON.stringify({items:[{occurrence_id:id,date,active:false}]}),'course',now).data;
 assert.equal(regularTasksOn(d,date).length,0);assert.equal(regularTasksOn(d,'2027-09-20').length,1);
 d=proposeStateActions(d,JSON.stringify({items:[{occurrence_id:id,date,active:true}]}),'course',now).data;assert.equal(regularTasksOn(d,date).length,1);
});
test('legacy repeating local courses can be temporarily disabled and edited per occurrence without changing the series',()=>{
 const d=fixture();d.timetables=[];d.tasks=[{id:'legacy-course',title:'旧版课程',description:'',location:'北301',date,time:'08:00',duration:95,color:'#123456',kind:'course',repeat:{interval:1,unit:'week',weekdays:[1],weekStartsOn:1},subtasks:[],completedDates:[]}];
 let p=proposeTemporaryActions(d,JSON.stringify({items:[{occurrence_id:'legacy-course',date:'2027-09-20',reset:false,changes:{title:'仅下周修改'}}]}),'course-local',now);
 assert.equal(regularTasksOn(p.data,date)[0]!.title,'旧版课程');assert.equal(regularTasksOn(p.data,'2027-09-20')[0]!.title,'仅下周修改');
 const disabled=proposeStateActions(p.data,JSON.stringify({items:[{occurrence_id:'legacy-course',date:'2027-09-20',active:false}]}),'course',now).data;
 assert.equal(regularTasksOn(disabled,date).length,1);assert.equal(regularTasksOn(disabled,'2027-09-20').length,0);assert.equal(regularTasksOn(restoreData(disabled),'2027-09-20').length,0);
});
test('all three platforms retain temporary edits and disabled state across sync and restore without changing completion',()=>{
 for(const platform of ['canvas','haoke','zhixuemeng'] as const){
  const original=fixture(),a=original[platform].assignments[0]!,p=proposeTemporaryActions(original,JSON.stringify({items:[{homework_id:a.id,reset:false,active:false,changes:{title:'本机安排',description:'先写两页',dueAt:'2027-09-13T18:00:00+08:00'}}]}),'homework-local',now);
  assert.equal(p.data[platform].assignments[0]!.title,'原始作业');assert.equal(p.data[platform].assignments[0]!.completed,false);
  let d={...p.data,[platform]:mergeCanvasHomework(p.data[platform],[{...a,title:'平台更新'}],now)};
  d=restoreData(JSON.parse(JSON.stringify(d)),now);assert.equal(allHomework(d).find(v=>v.id===a.id)?.title,'本机安排');assert.equal(d[platform].assignments[0]!.title,'平台更新');
  assert.ok(!homeTasksOn(d,date).some(t=>t.homeworkId===a.id));assert.ok(!upcomingReminders(d,now).some(t=>t.id===`tjmuse:${platform==='canvas'?'canvas:':''}${a.id}:${date}`));
  d=proposeTemporaryActions(d,JSON.stringify({items:[{homework_id:a.id,reset:false,active:true}]}),'homework-local',now).data;assert.ok(homeTasksOn(d,date).some(t=>t.homeworkId===a.id));
  d=proposeTemporaryActions(d,JSON.stringify({items:[{homework_id:a.id,reset:true}]}),'homework-local',now).data;assert.equal(allHomework(d).find(v=>v.id===a.id)?.title,'平台更新');
 }
});
test('an invalid batch is atomic; account changes and concurrent edits cannot overwrite or undo',()=>{
 const d=fixture();assert.throws(()=>proposeTemporaryActions(d,JSON.stringify({items:[{homework_id:'1:2',reset:false,active:false},{homework_id:'missing',reset:false,active:false}]}),'homework-local',now));assert.equal(d.canvas.preferences['1:2'],undefined);
 const p=proposeTemporaryActions(d,JSON.stringify({items:[{homework_id:'1:2',reset:false,active:false}]}),'homework-local',now);
 const later={...p.data,canvas:{...p.data.canvas,preferences:{'1:2':{...p.data.canvas.preferences['1:2']!,visibility:'show' as const}}}};assert.throws(()=>undoStateChanges(later,p.changes));
});
test('the actual AI tool loop stages temporary course edits and homework disabling, commits and undoes together',async()=>{
 const original=fixture(),previous=global.fetch;let round=0;
 global.fetch=async(_url,init)=>{
  const request=JSON.parse(String(init?.body));assert.ok(request.tools.some((t:any)=>t.function.name==='edit_course_occurrences'));assert.ok(request.tools.some((t:any)=>t.function.name==='edit_homework_local'));
  const message=round++===0?{role:'assistant',content:null,tool_calls:[{id:'c',type:'function',function:{name:'edit_course_occurrences',arguments:JSON.stringify({items:[{occurrence_id:id,date,reset:false,changes:{title:'AI 临时课',location:'南201'}}]})}},{id:'h',type:'function',function:{name:'edit_homework_local',arguments:JSON.stringify({items:[{homework_id:'1:2',reset:false,active:false,changes:{description:'本次暂缓'}}]})}}]}:{role:'assistant',content:'已完成本机临时安排。'};
  return new Response(JSON.stringify({choices:[{message,finish_reason:message.tool_calls?'tool_calls':'stop'}]}));
 };
 try{
  const result=await requestAIWithActions(original,'fixture-key',[{role:'user',content:'临时改这次课程地点，并临时禁用作业。'}],undefined,undefined,true);assert.equal(result.stateChanges.length,2);assert.equal(original.courseOverrides,undefined);
  const message={id:'temporary-reply',role:'assistant' as const,content:result.text,date,createdAt:new Date().toISOString()},saved=commitAIReply(original,message,[],[],result.stateChanges);
  assert.equal(regularTasksOn(saved,date)[0]!.title,'AI 临时课');assert.equal(saved.canvas.preferences['1:2']?.temporaryDisabled,true);
  const restored=undoAIReply(saved,message.id);assert.equal(regularTasksOn(restored,date)[0]!.title,'数学');assert.equal(restored.canvas.preferences['1:2'],undefined);
 }finally{global.fetch=previous;}
});
