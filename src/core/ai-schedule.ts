import {taskPriority,priorityLabel,parsePriority} from './task-priority';
import {applyStateChanges,undoStateChanges} from './ai-state-actions';
import {allHomework,allHomeworkPreferences} from './platforms';
import {homeworkOn} from './homework';
import {courseTasksOn} from './timetable';
import {courseOccurrenceKey} from './local-overrides';
import type {AppData,Task,AITodoChange,Message,FlexibleTask,AIStateChange} from './types';
import {addDays,dateKey,dateTime,daysBetween,parseDate,tasksOn,validDate,validTime} from './calendar';
import {regularTasksOn} from './timetable';
import {mergeFlexible,type FlexibleDraft} from './ai-actions';
import {TASK_COLORS} from './defaults';
import {courseRecordId} from './course-record-actions';

const text={type:'string',maxLength:2000},title={type:'string',minLength:1,maxLength:100},day={type:'string',description:'设备本地日期 YYYY-MM-DD'},time={type:'string',description:'24小时制 HH:mm'};
const fields={title,description:text,location:{type:'string',maxLength:200},date:day,time,end_date:day,end_time:time};
const priorityFields={important:{type:'boolean',description:'是否重要；省略时保留原值，新建默认false'},urgent:{type:'boolean',description:'是否紧急；省略时保留原值，新建默认false'}};
const tool=(name:string,description:string,properties:Record<string,unknown>,required:string[])=>({type:'function',function:{name,description,parameters:{type:'object',properties,required,additionalProperties:false}}});
export const createTodosTool=tool('create_todos','用户要求安排或添加事情时，新建有起止时间的本机 To-do。flexible_id 为小事ID时将它移入日程，普通新增填null。一次1–20项；不能覆盖课程或作业。',{tasks:{type:'array',minItems:1,maxItems:20,items:{type:'object',properties:{...fields,...priorityFields,flexible_id:{type:['string','null']}},required:[...Object.keys(fields),'flexible_id'],additionalProperties:false}}},['tasks']);
export const updateTodosTool=tool('update_todos','用户要求调整已有本机一次性 To-do 时，根据准确任务ID提交完整名称、描述、地点和起止时间。不可修改课程、平台作业或循环系列。',{tasks:{type:'array',minItems:1,maxItems:20,items:{type:'object',properties:{...fields,...priorityFields,task_id:{type:'string'}},required:[...Object.keys(fields),'task_id'],additionalProperties:false}}},['tasks']);
export const readScheduleTool=tool('get_schedule','查询课程（含临时停用的单次课程）、平台作业和本机待办，核对准确ID和时间。最长31天；先读取再安排。',{from_date:day,to_date:day},['from_date','to_date']);
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function strictObject(v:unknown,allowed:string[]){if(!object(v)||Object.keys(v).some(k=>!allowed.includes(k)))throw new Error('任务参数包含无效字段');return v;}
function string(v:unknown,max:number,nonempty=false){if(typeof v!=='string'||v.length>max||(nonempty&&!v.trim()))throw new Error('任务名称、描述或地点无效');return v.trim();}
function parseTime(v:Record<string,unknown>){
  const date=string(v.date,10),time=string(v.time,5),endDate=string(v.end_date,10),endTime=string(v.end_time,5);
  if(!validDate(date)||!validDate(endDate)||!validTime(time)||!validTime(endTime))throw new Error('请提供有效的起止日期和时间');
  const duration=(dateTime(endDate,endTime).getTime()-dateTime(date,time).getTime())/60000;
  if(!Number.isInteger(duration)||duration<1||duration>7*1440)throw new Error('结束时间必须晚于开始时间，单次安排最长7天');
  return {date,time,duration};
}
function editable(task:Task){return task.kind==='todo'&&!task.repeat&&!task.homeworkId&&!task.timetableId;}
export function assertNoConflict(data:AppData,task:Task){
  const start=dateTime(task.date,task.time),end=new Date(start.getTime()+task.duration*60000);
  for(let at=parseDate(task.date);dateTime(dateKey(at),'00:00')<end;at=addDays(at,1)){
    const key=dateKey(at);
    for(const other of tasksOn(regularTasksOn(data,key).filter(t=>t.id!==task.id),key)){
      if(other.completedDates.includes(other.occurrenceDate))continue;
      const a=dateTime(other.occurrenceDate,other.time),b=dateTime(other.endDate,other.endTime);
      if(start<b&&end>a)throw new Error(`与“${other.title}”时间冲突，请另选空闲时段`);
    }
  }
}
export function readAISchedule(data:AppData,raw:string){
  const v=strictObject(JSON.parse(raw),['from_date','to_date']),from=string(v.from_date,10),to=string(v.to_date,10);
  if(!validDate(from)||!validDate(to)||daysBetween(parseDate(from),parseDate(to))<0||daysBetween(parseDate(from),parseDate(to))>30)throw new Error('查询范围须为1–31天');
  const result=[];
  for(let d=parseDate(from);dateKey(d)<=to;d=addDays(d,1)){
    const key=dateKey(d);result.push({date:key,tasks:[...tasksOn([...data.tasks.filter(t=>t.kind!=='course'),...courseTasksOn(data,key)],key),...homeworkOn(allHomework(data),key,{showHomeworkInTodo:true,showDatedHomeworkByDefault:true,showUndatedHomeworkByDefault:true},allHomeworkPreferences(data))].slice(0,200).map(t=>({id:t.id,homework_id:t.homeworkId,course_id:t.kind==='course'?courseRecordId(t.timetableId,t.courseSessionId,t.id):undefined,type:t.kind==='course'?'course':t.homeworkId?'homework':'todo',active:t.homeworkId?!allHomeworkPreferences(data)[t.homeworkId]?.temporaryDisabled:data.courseExceptions?.[courseOccurrenceKey(t,key)]!==false,title:t.title,date:t.occurrenceDate,time:t.time,end_date:t.endDate,end_time:t.endTime,location:t.location,description:t.description,editable:editable(t),completed:t.completedDates.includes(t.occurrenceDate),...(t.kind==='todo'&&!t.homeworkId?{...taskPriority(t),priority:priorityLabel(t)}:{})}))});
  }
  return result;
}
export function proposeTodos(data:AppData,raw:string,mode:'create'|'update',id:()=>string):{data:AppData;changes:AITodoChange[];duplicates:number}{
  const args=strictObject(JSON.parse(raw),['tasks']);if(!Array.isArray(args.tasks)||!args.tasks.length||args.tasks.length>20)throw new Error('每次需安排1–20项任务');
  let working=data,duplicates=0;const changes:AITodoChange[]=[];
  for(const value of args.tasks){
    const v=strictObject(value,[...Object.keys(fields),...Object.keys(priorityFields),mode==='create'?'flexible_id':'task_id']);
    const details={title:string(v.title,100,true),description:string(v.description,2000),location:string(v.location,200),...parseTime(v)};
    const before=mode==='update'?working.tasks.find(t=>t.id===v.task_id):undefined;
    if(mode==='update'&&(!before||!editable(before)))throw new Error('仅可调整准确ID对应的本机一次性待办');
    if(mode==='create'&&v.flexible_id!=null&&typeof v.flexible_id!=='string')throw new Error('小事ID无效');
    const source=mode==='create'&&typeof v.flexible_id==='string'?working.flexibleTasks.find(f=>f.id===v.flexible_id):undefined;
    if(mode==='create'&&v.flexible_id!=null&&(!source||source.completed))throw new Error('这件小事不存在或已经完成');
    if(!before&&working.tasks.some(t=>t.kind==='todo'&&t.title.normalize('NFKC').trim()===details.title.normalize('NFKC')&&t.date===details.date&&t.time===details.time&&t.duration===details.duration)){
      if(source)throw new Error('同名时段已在日程中，请勿重复移动小事');duplicates++;continue;
    }
    const priority=parsePriority(v,before||source);
    const after:Task=before?{...before,...details,...priority}:{...details,...priority,id:id(),kind:'todo',repeat:null,subtasks:[],completedDates:[],color:TASK_COLORS[changes.length%TASK_COLORS.length]!};
    if(before&&same(before,after)){duplicates++;continue;}
    assertNoConflict(working,after);
    const change:AITodoChange={taskId:after.id,before:before||null,after,...(source?{flexibleSource:source}:{})};
    working=applyTodoChanges(working,[change]);changes.push(change);
  }
  return {data:working,changes,duplicates};
}
export function applyTodoChanges(data:AppData,changes:AITodoChange[]):AppData{
  if(changes.length>30)throw new Error('一次最多写入30项更改');let working=data;
  for(const change of changes){
    const current=working.tasks.find(t=>t.id===change.taskId);
    if(change.before?!same(current,change.before):!!current)throw new Error('相关待办在生成期间已改变，请重新安排');
    if(!editable(change.after)||change.before&&!editable(change.before))throw new Error('不能改写课程、作业或循环系列');
    if(change.flexibleSource&&!same(working.flexibleTasks.find(t=>t.id===change.flexibleSource!.id),change.flexibleSource))throw new Error('这件小事在生成期间已改变，请重新安排');
    assertNoConflict(working,change.after);
    working={...working,tasks:change.before?working.tasks.map(t=>t.id===change.taskId?change.after:t):[...working.tasks,change.after],flexibleTasks:change.flexibleSource?working.flexibleTasks.filter(t=>t.id!==change.flexibleSource!.id):working.flexibleTasks};
  }
  return working;
}
export function commitAIReply(data:AppData,message:Message,drafts:FlexibleDraft[],changes:AITodoChange[],stateChanges:AIStateChange[]=[]):AppData{
  if(data.messages.some(m=>m.id===message.id))return data;
  try{
    if(data.settings.aiWriteEnabled===false&&(drafts.length||changes.length||stateChanges.length))throw new Error('AI 写入权限已关闭');
    const planned=applyTodoChanges(applyStateChanges(data,stateChanges),changes);let n=0;const merged=mergeFlexible(planned.flexibleTasks,drafts,()=>`ai-flex:${message.id}:${n++}`);
    const summary=changes.map(c=>`${c.before?'已调整':'已加入'}：${c.after.title} · ${c.after.date} ${c.after.time}`);
    summary.push(...stateChanges.map(c=>c.kind==='homework'?`已更新本机作业：${c.title}${c.after.temporaryDisabled?'（临时禁用）':''}`:c.kind==='course-local'?`${c.after?'已临时编辑':'已恢复原排课'}：${c.title} · ${c.date}`:c.kind==='course-record'?`${c.date?'已删除本次课程':c.after?'已编辑排课':'已删除排课'}：${c.title}${c.date?' · '+c.date:'（全部教学周）'}`:`${c.after?'已启用':'已停用'}单次课程：${c.title} · ${c.date}`));
    if(merged.added.length)summary.push(`已添加小事：${merged.added.map(t=>t.title).join('、')}`);
    const reply:Message={...message,content:message.content+(summary.length?`\n\n${summary.join('\n')}`:''),...(summary.length?{aiUndo:{changes:JSON.parse(JSON.stringify(changes)),addedFlexible:merged.added.map(t=>({...t})),stateChanges:JSON.parse(JSON.stringify(stateChanges))}}:{})};
    return {...planned,flexibleTasks:merged.tasks,messages:[...(summary.length?data.messages.map(({aiUndo,...m})=>m):data.messages),reply].slice(-500)};
  }catch(e){return {...data,messages:[...data.messages,{...message,content:`这次没有写入任务：${e instanceof Error?e.message:'任务已变化'}。请根据最新日程重新安排。`}].slice(-500)};}
}
export function undoAIReply(data:AppData,messageId:string):AppData{
  const record=data.messages.find(m=>m.id===messageId)?.aiUndo;if(!record)return data;
  try{
    let working=undoStateChanges(data,record.stateChanges||[]);
    for(const change of [...record.changes].reverse()){
      if(!same(working.tasks.find(t=>t.id===change.taskId),change.after))throw new Error('相关任务已被编辑，无法安全撤销');
      if(change.flexibleSource&&working.flexibleTasks.some(f=>f.id===change.flexibleSource!.id))throw new Error('小事已经恢复，无法重复撤销');
      working={...working,tasks:change.before?working.tasks.map(t=>t.id===change.taskId?change.before!:t):working.tasks.filter(t=>t.id!==change.taskId),flexibleTasks:change.flexibleSource?[...working.flexibleTasks,change.flexibleSource]:working.flexibleTasks};
    }
    for(const added of record.addedFlexible)if(!same(working.flexibleTasks.find(t=>t.id===added.id),added))throw new Error('新增小事已被编辑，无法安全撤销');
    return {...working,flexibleTasks:working.flexibleTasks.filter(f=>!record.addedFlexible.some(a=>a.id===f.id)),messages:data.messages.map(m=>{if(m.id!==messageId)return m;const {aiUndo,...rest}=m;return {...rest,content:m.content+'\n\n已撤销这次任务安排。'};})};
  }catch(e){return {...data,messages:data.messages.map(m=>m.id===messageId?{...m,content:m.content+`\n\n${e instanceof Error?e.message:'无法撤销'}。`}:m)};}
}
