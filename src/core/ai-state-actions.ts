import type {AppData,AIStateChange,HomeworkPreference} from './types';
import {dateKey,dateTime,validDate,tasksOn} from './calendar';
import {allHomework,homeworkPlatform} from './platforms';
import {courseTasksOn} from './timetable';
import {courseOccurrenceKey} from './local-overrides';
import {homeworkCompleted} from './homework';
import {applyCourseRecordChange} from './course-record-actions';
const tool=(name:string,description:string,properties:Record<string,unknown>,required:string[])=>({type:'function',function:{name,description,parameters:{type:'object',properties,required,additionalProperties:false}}});
export const homeworkStatusTool=tool('set_homework_completed','按用户明确要求修改本机作业完成勾选，completed=false 可反选。先查询准确作业ID；不提交、不修改平台内容。',{items:{type:'array',minItems:1,maxItems:20,items:{type:'object',properties:{homework_id:{type:'string'},completed:{type:'boolean'}},required:['homework_id','completed'],additionalProperties:false}}},['items']);
export const courseActivationTool=tool('set_course_active','临时开启或停用未来指定日期的一节课。先 get_schedule 读取准确课程发生ID；只影响这一日期，不修改整门课或其他周。',{items:{type:'array',minItems:1,maxItems:20,items:{type:'object',properties:{occurrence_id:{type:'string'},date:{type:'string'},active:{type:'boolean'}},required:['occurrence_id','date','active'],additionalProperties:false}}},['items']);
export const readHomeworkTool=tool('get_homework','查询本机所有未删除作业的准确ID、标题、截止和完成状态，包括已完成、逾期和首页隐藏的作业。',{query:{type:'string',description:'标题或课程名称，空字符串查询全部'}},['query']);
export function readAIHomework(data:AppData,raw:string){
  const args=JSON.parse(raw);if(!args||Object.keys(args).some(k=>k!=='query')||typeof args.query!=='string'||args.query.length>200)throw new Error('作业查询参数无效');
  return allHomework(data).filter(a=>!data[homeworkPlatform(a.id)].preferences[a.id]?.deleted&&(!args.query||[a.title,a.courseName].some(s=>s.toLowerCase().includes(args.query.toLowerCase())))).slice(0,200).map(a=>({id:a.id,title:a.title,description:a.description,course:a.courseName,start_at:a.unlockAt,due_at:a.dueAt,completed:homeworkCompleted(a),active:!data[homeworkPlatform(a.id)].preferences[a.id]?.temporaryDisabled,locally_edited:!!data[homeworkPlatform(a.id)].preferences[a.id]?.localEdit}));
}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function lesson(data:AppData,id:string,date:string,now:Date){
  if(!validDate(date))throw new Error('课程日期无效');
  const task=tasksOn(courseTasksOn(data,date),date).find(t=>t.id===id);
  if(!task||dateTime(date,task.time)<=now)throw new Error('仅可调整仍未开始且课表已启用的单次课程');
  return task;
}
export function applyStateChanges(data:AppData,changes:AIStateChange[],now=new Date()):AppData{
  if(changes.length>30)throw new Error('一次最多30项状态更改');
  let working=data;
  for(const c of changes){
    if(c.kind==='homework'){
      const state=working[c.platform],assignment=state.assignments.find(a=>a.id===c.id);
      if(!assignment||state.userId!==c.accountId||homeworkPlatform(c.id)!==c.platform||state.preferences[c.id]?.deleted||!same(state.preferences[c.id],c.before)||assignment.completedOverride!==c.beforeOverride||assignment.completed!==c.beforeCompleted)throw new Error('作业或连接已改变，请重新读取');
      working={...working,[c.platform]:{...state,preferences:{...state.preferences,[c.id]:c.after},assignments:state.assignments.map(a=>a.id===c.id&&typeof c.after.completedOverride==='boolean'?{...a,completed:c.after.completedOverride,completedOverride:c.after.completedOverride}:a)}};
    }else if(c.kind==='course-record'){
      working=applyCourseRecordChange(working,c);
    }else if(c.kind==='course-local'){
      const task=lesson(working,c.id,c.date,now),key=courseOccurrenceKey(task,c.date);
      if(JSON.stringify(task)!==c.fingerprint||!same(working.courseOverrides?.[key],c.before))throw new Error('这节课已改变，请重新读取');
      const edits={...working.courseOverrides};if(c.after)edits[key]=c.after;else delete edits[key];
      working={...working,courseOverrides:edits};
    }else{
      const task=lesson(working,c.id,c.date,now);
      const key=courseOccurrenceKey(task,c.date);
      if(JSON.stringify(task)!==c.fingerprint||working.courseExceptions?.[key]!==c.before)throw new Error('这节课已改变，请重新读取');
      working={...working,courseExceptions:{...working.courseExceptions,[key]:c.after}};
    }
  }
  return working;
}
export function proposeStateActions(data:AppData,raw:string,kind:'homework'|'course',now=new Date()){
  const v=JSON.parse(raw);
  if(!v||Object.keys(v).some(k=>k!=='items')||!Array.isArray(v.items)||!v.items.length||v.items.length>20)throw new Error('状态参数无效');
  let working=data;const changes:AIStateChange[]=[];
  for(const item of v.items){
    if(!item||typeof item!=='object'||Array.isArray(item))throw new Error('状态参数无效');
    let change:AIStateChange;
    if(kind==='homework'){
      if(Object.keys(item).some(k=>!['homework_id','completed'].includes(k))||typeof item.homework_id!=='string'||typeof item.completed!=='boolean')throw new Error('作业参数无效');
      const platform=homeworkPlatform(item.homework_id),state=working[platform],a=state.assignments.find(a=>a.id===item.homework_id);
      if(!a||state.preferences[a.id]?.deleted)throw new Error('没有找到这份作业');
      const before=state.preferences[a.id],after:HomeworkPreference={visibility:'default',deleted:false,...before,completedOverride:item.completed};
      change={kind:'homework',platform,id:a.id,accountId:state.userId,before,beforeOverride:a.completedOverride,beforeCompleted:a.completed,after,title:a.title};
    }else{
      if(Object.keys(item).some(k=>!['occurrence_id','date','active'].includes(k))||typeof item.occurrence_id!=='string'||typeof item.date!=='string'||typeof item.active!=='boolean')throw new Error('课程参数无效');
      const task=lesson(working,item.occurrence_id,item.date,now);
      change={kind:'course',id:task.id,date:item.date,title:task.title,before:working.courseExceptions?.[courseOccurrenceKey(task,item.date)],after:item.active,fingerprint:JSON.stringify(task)};
    }
    working=applyStateChanges(working,[change],now);changes.push(change);
  }
  return {data:working,changes};
}
export function undoStateChanges(data:AppData,changes:AIStateChange[]):AppData{
  let working=data;
  for(const c of [...changes].reverse()){
    if(c.kind==='homework'){
      const state=working[c.platform];
      if(state.userId!==c.accountId||!same(state.preferences[c.id],c.after))throw new Error('作业已被修改，无法安全撤销');
      const prefs={...state.preferences};if(c.before)prefs[c.id]=c.before;else delete prefs[c.id];
      working={...working,[c.platform]:{...state,preferences:prefs,assignments:state.assignments.map(a=>a.id===c.id?{...a,completed:c.beforeCompleted,completedOverride:c.beforeOverride}:a)}};
    }else if(c.kind==='course-record'){
      working=applyCourseRecordChange(working,c,true);
    }else if(c.kind==='course-local'){
      const task=courseTasksOn(working,c.date).find(t=>t.id===c.id);if(!task)throw new Error('课程已删除，无法撤销');
      const key=courseOccurrenceKey(task,c.date);
      if(!same(working.courseOverrides?.[key],c.after))throw new Error('课程已被修改，无法安全撤销');
      const expected={...working.courseOverrides};if(c.before)expected[key]=c.before;else delete expected[key];
      if(JSON.stringify(lesson({...working,courseOverrides:expected},c.id,c.date,new Date(0)))!==c.fingerprint)throw new Error('原始排课已改变，无法安全撤销');
      const edits={...working.courseOverrides};if(c.before)edits[key]=c.before;else delete edits[key];working={...working,courseOverrides:edits};
    }else{
      const task=courseTasksOn(working,c.date).find(t=>t.id===c.id);if(!task)throw new Error('课程已删除，无法撤销');
      const key=courseOccurrenceKey(task,c.date);
      if(working.courseExceptions?.[key]!==c.after)throw new Error('课程状态已被修改，无法安全撤销');
      const exceptions={...working.courseExceptions};if(c.before===undefined)delete exceptions[key];else exceptions[key]=c.before;
      working={...working,courseExceptions:exceptions};
    }
  }
  return working;
}
