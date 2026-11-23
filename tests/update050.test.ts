import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {initialData} from '../src/core/defaults';
import type {AppData,Task,CanvasAssignment,Timetable,Message} from '../src/core/types';
import {homeAgenda,homeTasksOn,dailyOverviewTasks} from '../src/core/home-layout';
import {DAILY_GREETINGS} from '../src/core/daily-greetings';
import {tr} from '../src/core/i18n';
import {dateTime,dateKey} from '../src/core/calendar';
import {widgetTimeline,widgetView} from '../src/core/widget-agenda';
import {createDailyOverviewGate} from '../src/core/daily-overview';
import {cleanZhixuemengDescription} from '../src/core/zhixuemeng-description';
import {ZHIXUEMENG_READER} from '../src/core/zhixuemeng-reader';
import {restoreData} from '../src/core/storage';
import {proposeStateActions,applyStateChanges,readAIHomework} from '../src/core/ai-state-actions';
import {commitAIReply,undoAIReply,proposeTodos,readAISchedule} from '../src/core/ai-schedule';
import {regularTasksOn,timetableTasksOn} from '../src/core/timetable';
import {upcomingReminders} from '../src/core/reminders';
import {sheetKeyboardOverlap,sheetExtentLayout} from '../src/ui/sheet-motion';
import {requestAIWithActions} from '../src/services/ai';
const base=()=>structuredClone(initialData),day='2027-09-13',now=()=>dateTime(day,'12:00');
const task=(id:string,date=day,time='09:00',kind:'course'|'todo'='todo'):Task=>({id,title:id,description:'',location:'',date,time,duration:60,kind,color:'#A8C9EB',completedDates:[],repeat:null,subtasks:[]});
const assignment=(id:string,due:string|null,completed=false):CanvasAssignment=>({id,title:id,courseId:'1',courseName:'math',description:'',dueAt:due,url:'https://canvas.tongji.edu.cn',submitted:false,completed,unlockAt:dateTime('2027-09-01','08:00').toISOString()});
const table:Timetable={id:'table',name:'math',enabled:true,semesterStartDate:day,weekStartsOn:1,importedAt:'',periods:[{number:1,start:'14:00',end:'15:00'}],sessions:[{id:'s',title:'数学',teacher:'',location:'北101',weekday:1,startPeriod:1,endPeriod:1,weeks:[1,2]}]};
const message:Message={id:'ai',role:'assistant',content:'已安排',date:day,createdAt:dateTime(day,'12:00').toISOString()};
test('home separates active and completed items and carries only overdue unfinished items into the last section',()=>{
  const d=base();d.tasks=[task('past-course',day,'09:00','course'),task('future-course',day,'14:00','course'),task('old','2027-09-10'),task('future',day,'15:00'),{...task('done'),completedDates:[day]}];
  d.canvas.assignments=[assignment('1:1',dateTime('2027-09-11','23:59').toISOString()),assignment('1:2',dateTime(day,'23:59').toISOString()),assignment('1:3',dateTime(day,'23:59').toISOString(),true)];
  const a=homeAgenda(d,day,now());assert.deepEqual(a.pending.map(t=>t.id),['future-course','future','canvas:1:2']);assert.deepEqual(a.overdue.map(t=>t.id),['old','canvas:1:1']);
  assert.ok(homeTasksOn(d,day).some(t=>t.id==='past-course'),'daily overview retains all today items');
});
test('overdue recurrence uses original occurrence dates and excludes completed dates and courses',()=>{
  const d=base();d.tasks=[{...task('repeat','2027-09-10'),repeat:{unit:'day',interval:1,weekdays:[],weekStartsOn:1},completedDates:['2027-09-11']}];
  assert.deepEqual(homeAgenda(d,day,now()).overdue.map(t=>t.occurrenceDate),['2027-09-10','2027-09-12','2027-09-13']);
});
test('cross-midnight items stay active until their real end, and hidden/deleted homework never enters the backlog',()=>{
  const d=base();d.tasks=[{...task('overnight','2027-09-12','23:00'),duration:840}];
  d.canvas.assignments=[assignment('1:1',dateTime(day,'11:59').toISOString()),assignment('1:2',dateTime(day,'11:59').toISOString())];
  d.canvas.preferences={'1:1':{visibility:'hide',deleted:false},'1:2':{visibility:'default',deleted:true}};
  assert.equal(homeAgenda(d,day,now()).pending[0]!.id,'overnight');assert.equal(homeAgenda(d,day,now()).overdue.length,0);
  assert.equal(homeAgenda(d,day,dateTime(day,'13:00')).overdue[0]!.id,'overnight');
});
test('widget is chronological with homework last and drops every expired item regardless of completion',()=>{
  const d=base();d.tasks=[task('old'),task('later',day,'16:00'),task('course',day,'13:00','course')];d.canvas.assignments=[assignment('1:1',dateTime(day,'19:00').toISOString())];
  const view=widgetView(d,now());assert.deepEqual(view.rows.map(t=>t.title),['course','later','1:1']);
  const entries=widgetTimeline(d,now(),2);const at=entries.find(e=>e.date.getTime()===dateTime(day,'14:00').getTime())!;assert.ok(at);assert.ok(!at.props.rows.some(r=>r.title==='course'));assert.equal(entries.at(-1)!.props.rows.length,0);
  assert.ok(!JSON.stringify(entries).includes('Authorization'));
});
test('daily overview claims once across simultaneous calls and remounts, then once again the next local day',async()=>{
  let value:string|null=null;const read=async()=>value,write=async(day:string)=>{value=day;};const gate=createDailyOverviewGate(read,write);
  assert.deepEqual(await Promise.all([gate.claim(day),gate.claim(day)]),[true,false]);assert.equal(await createDailyOverviewGate(read,write).claim(day),false);assert.equal(await gate.claim('2027-09-14'),true);
});
test('daily opening has at least 50 time-neutral lines, translated in all six languages, with no repeats until the pool is exhausted',async()=>{
  assert.ok(DAILY_GREETINGS.length>=50);assert.equal(new Set(DAILY_GREETINGS).size,DAILY_GREETINGS.length);
  for(const line of DAILY_GREETINGS)for(const language of ['en-US','ja','es','fr'] as const)assert.notEqual(tr(line,language),line,`${language}: ${line}`);
  let raw:string|null=null;const seen:number[]=[];
  for(let i=0;i<51;i++){const gate=createDailyOverviewGate(async()=>raw,async v=>{raw=v;},()=>0),at=new Date(2027,0,i+1);assert.equal(await gate.claim(dateKey(at)),true);seen.push(gate.greeting());assert.equal(await gate.claim(dateKey(at)),false);}
  assert.equal(new Set(seen.slice(0,50)).size,50);assert.notEqual(seen[49],seen[50]);
});
test('daily overview excludes completed todos, completed homework and ended classes, keeping unfinished tasks from today',()=>{
  const d=base();d.tasks=[task('past-class',day,'08:00','course'),{...task('done'),completedDates:[day]},task('missed',day,'10:00'),task('later',day,'15:00')];d.canvas.assignments=[assignment('1:1',dateTime(day,'20:00').toISOString(),true)];
  assert.deepEqual(dailyOverviewTasks(d,day,now()).map(t=>t.title),['missed','later']);
});
test('new installs enable all notification choices, upgrades preserve explicit off choices',()=>{
  assert.ok(initialData.settings.todoNotifications&&initialData.settings.courseNotifications&&initialData.settings.homeworkNotifications);
  const d=base();d.settings.todoNotifications=d.settings.courseNotifications=d.settings.homeworkNotifications=false;const restored=restoreData(d);assert.equal(restored.settings.homeworkNotifications,false);assert.equal(restored.settings.courseNotifications,false);assert.equal(restored.settings.todoNotifications,false);
});
test('platform metadata is stripped without removing real JSON homework instructions or later pages',()=>{
  const raw='生成 JSON 数据的章节范围必须是以下组合：chapter_2058761724731060226, section_2058761724735254529 第一章\n\n1. 请上传练习册第57页图片\n2. 请上传练习册第58页图片\n3. 第59页\n4. 第60页';
  assert.equal(cleanZhixuemengDescription(raw),'1. 请上传练习册第57页图片\n2. 请上传练习册第58页图片\n3. 第59页\n4. 第60页');assert.equal(cleanZhixuemengDescription('编写一个 JSON 解析器'),'编写一个 JSON 解析器');
  const d=base();d.zhixuemeng.assignments=[{...assignment('zhixuemeng:math:work',null),platform:'zhixuemeng',description:raw}];assert.doesNotMatch(restoreData(d).zhixuemeng.assignments[0]!.description,/chapter_|section_|生成 JSON/);
  assert.doesNotThrow(()=>vm.runInNewContext('('+ZHIXUEMENG_READER+')'));
});
test('AI marks and unmarks local homework, survives sync metadata, and undo restores the exact original local choice',()=>{
  const d=base();d.canvas.assignments=[assignment('1:1',null)];const p=proposeStateActions(d,JSON.stringify({items:[{homework_id:'1:1',completed:true}]}),'homework');const saved=commitAIReply(d,message,[],[],p.changes);
  assert.equal(saved.canvas.assignments[0]!.completedOverride,true);assert.equal(undoAIReply(saved,'ai').canvas.assignments[0]!.completedOverride,undefined);
  const p2=proposeStateActions(saved,JSON.stringify({items:[{homework_id:'1:1',completed:false}]}),'homework');assert.equal(p2.data.canvas.assignments[0]!.completedOverride,false);
  assert.equal(readAIHomework(p2.data,'{"query":"1:1"}').length,1);
});
test('AI homework writes reject changed account, manual changes and disabled permission atomically',()=>{
  const d=base();d.canvas.assignments=[assignment('1:1',null)];const p=proposeStateActions(d,JSON.stringify({items:[{homework_id:'1:1',completed:true}]}),'homework');
  const other=structuredClone(d);other.canvas.userId='other';assert.throws(()=>applyStateChanges(other,p.changes),/连接已改变/);
  const blocked=structuredClone(d);blocked.settings.aiWriteEnabled=false;const result=commitAIReply(blocked,message,[],[],p.changes);assert.equal(result.canvas.assignments[0]!.completedOverride,undefined);assert.match(result.messages[0]!.content,/没有写入/);
});
test('single lesson activation affects only that date and propagates to home, widget, conflict checks and reminders',()=>{
  const d=base();d.timetables=[structuredClone(table)];const id=timetableTasksOn(d.timetables,day)[0]!.id;
  const p=proposeStateActions(d,JSON.stringify({items:[{occurrence_id:id,date:day,active:false}]}),'course',now());assert.equal(regularTasksOn(p.data,day).length,0);assert.equal(regularTasksOn(p.data,'2027-09-20').length,1);assert.equal(widgetView(p.data,now()).rows.length,0);
  assert.ok(!upcomingReminders(p.data,now()).some(r=>r.id.includes(id)));assert.equal(readAISchedule(p.data,JSON.stringify({from_date:day,to_date:day}))[0]!.tasks[0]!.active,false);
  const saved=commitAIReply(d,message,[],[],p.changes);assert.equal(saved.courseExceptions?.[id],false);assert.equal(undoAIReply(saved,'ai').courseExceptions?.[id],undefined);
  assert.throws(()=>proposeStateActions(d,JSON.stringify({items:[{occurrence_id:id,date:day,active:false}]}),'course',dateTime(day,'14:01')),/未开始/);
});
test('keyboard avoidance counts only the part not already resized away by the presenter',()=>{
  assert.equal(sheetKeyboardOverlap(300,900,900),300);assert.equal(sheetKeyboardOverlap(300,900,600),0);assert.equal(sheetKeyboardOverlap(300,900,750),150);
  const layout=sheetExtentLayout(800,800,800,300);assert.equal(layout.bottom+layout.height,800);
});
test('provider tool loop stages homework completion and one lesson deactivation; no remote school writes are made',async()=>{
  const d=base();d.timetables=[structuredClone(table)];d.canvas.assignments=[assignment('1:1',null)];const id=timetableTasksOn(d.timetables,day)[0]!.id,fetchBefore=global.fetch;let calls=0;
  global.fetch=(async(url,init)=>{
    assert.match(String(url),/chat\/completions$/);const body=JSON.parse(String(init?.body));assert.ok(body.tools.some((t:any)=>t.function.name==='set_homework_completed'));assert.ok(body.tools.some((t:any)=>t.function.name==='set_course_active'));
    const tools=calls++===0?[{id:'read-h',type:'function',function:{name:'get_homework',arguments:'{"query":""}'}},{id:'read-c',type:'function',function:{name:'get_schedule',arguments:JSON.stringify({from_date:day,to_date:day})}}]:calls===2?[{id:'edit-h',type:'function',function:{name:'set_homework_completed',arguments:'{"items":[{"homework_id":"1:1","completed":true}]}'}},{id:'edit-c',type:'function',function:{name:'set_course_active',arguments:JSON.stringify({items:[{occurrence_id:id,date:day,active:false}]})}}]:null;
    return new Response(JSON.stringify({choices:[{finish_reason:tools?'tool_calls':'stop',message:tools?{role:'assistant',content:null,tool_calls:tools}:{role:'assistant',content:'已按要求调整。'}}]}),{status:200,headers:{'Content-Type':'application/json'}});
  }) as typeof fetch;
  try{const outcome=await requestAIWithActions(d,'fixture-key',[{role:'user',content:'标记作业完成，并停用那一天的数学课'}],undefined,undefined,true);assert.equal(outcome.stateChanges.length,2);assert.equal(d.courseExceptions,undefined);assert.equal(d.canvas.assignments[0]!.completedOverride,undefined);const saved=commitAIReply(d,message,outcome.drafts,outcome.todoChanges,outcome.stateChanges);assert.equal(saved.canvas.assignments[0]!.completedOverride,true);assert.equal(saved.courseExceptions?.[id],false);assert.equal(calls,3);}finally{global.fetch=fetchBefore;}
});
