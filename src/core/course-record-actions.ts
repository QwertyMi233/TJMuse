import type {AppData,AICourseRecordChange,CourseSession,Task,Timetable} from './types';
import {validDate,validTime,minutes,parseDate,semesterWeek} from './calendar';
import {timetableTasksOn,validateTimetable} from './timetable';
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
export const courseRecordId=(tableId:string|undefined,sessionId:string|undefined,taskId='')=>tableId&&sessionId?`course-record:${encodeURIComponent(tableId)}:${encodeURIComponent(sessionId)}`:`local-course:${encodeURIComponent(taskId)}`;
const context=(table:Timetable)=>JSON.stringify([table.semesterStartDate,table.weekStartsOn,table.periods]);
export function readCourseRecords(data:AppData,query=''){
 const rows=[...data.timetables.flatMap(table=>table.sessions.map(s=>({course_id:courseRecordId(table.id,s.id),table_id:table.id,table_name:table.name,enabled:table.enabled,title:s.title,teacher:s.teacher,location:s.location,weekday:s.weekday,start_period:s.startPeriod,end_period:s.endPeriod,weeks:s.weeks,start_time:s.startTime||table.periods.find(p=>p.number===s.startPeriod)?.start,end_time:s.endTime||table.periods.find(p=>p.number===s.endPeriod)?.end,color:s.color,semester_start:table.semesterStartDate}))),...data.tasks.filter(t=>t.kind==='course'&&!t.homeworkId).map(t=>({course_id:courseRecordId(undefined,undefined,t.id),title:t.title,location:t.location,date:t.date,start_time:t.time,duration:t.duration,color:t.color}))];
 return rows.filter(row=>!query||row.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0,500);
}
function find(data:AppData,id:string){
 for(const table of data.timetables){const index=table.sessions.findIndex(s=>courseRecordId(table.id,s.id)===id);if(index>=0)return {table,index,before:table.sessions[index]!};}
 const index=data.tasks.findIndex(t=>t.kind==='course'&&!t.homeworkId&&courseRecordId(undefined,undefined,t.id)===id);
 if(index>=0)return {table:null,index,before:data.tasks[index]!};throw new Error('没有找到这条课程，请重新查询');
}
function string(value:unknown,max:number,required=false){if(typeof value!=='string'||value.length>max||required&&!value.trim())throw new Error('课程文字无效');return value.trim();}
function updated(before:CourseSession|Task,patch:Record<string,unknown>,table:Timetable|null):CourseSession|Task{
 const result:any={...before};
 for(const [key,value] of Object.entries(patch)){
  if(['title','teacher','location','description'].includes(key)){if(!table&&key==='teacher'||table&&key==='description')throw new Error('该字段不适用于这条课程');result[key]=string(value,key==='title'||key==='teacher'?150:key==='location'?200:2000,key==='title');}
  else if(key==='color'){if(typeof value!=='string'||!/^#[a-f\d]{6}$/i.test(value))throw new Error('课程颜色无效');result.color=value;}
  else if(table&&['weekday','start_period','end_period','weeks'].includes(key)){result[({start_period:'startPeriod',end_period:'endPeriod'} as Record<string,string>)[key]||key]=value;}
  else if(['start_time','end_time'].includes(key)&&table){const name=key==='start_time'?'startTime':'endTime';if(value===null)delete result[name];else result[name]=string(value,5);}
  else if(!table&&key==='date'){if(typeof value!=='string'||!validDate(value))throw new Error('课程日期无效');result.date=value;}
  else if(!table&&['start_time','end_time'].includes(key)){if(typeof value!=='string'||!validTime(value))throw new Error('课程时间无效');}
  else throw new Error('不支持的课程修改字段');
 }
 if(!table){const start=patch.start_time??(before as Task).time,end=patch.end_time??null;result.time=start;if(end!==null)result.duration=minutes(String(end))-minutes(String(start));if(result.duration<1||result.duration>1440)throw new Error('课程结束时间需晚于开始时间');}
 return result;
}
export function applyCourseRecordChange(data:AppData,c:AICourseRecordChange,undo=false):AppData{
 const expected=undo?c.after:c.before,next=undo?c.before:c.after;
 if(next&&next.id!==c.before.id)throw new Error('课程编号不能更改');
 if(c.tableId){
  const table=data.timetables.find(t=>t.id===c.tableId);if(!table||context(table)!==c.context)throw new Error('课表或节次已改变，请重新读取');
  const actual=table.sessions.find(s=>s.id===c.before.id);if(!same(actual||null,expected))throw new Error('课程已被修改，不能覆盖或撤销');
  const sessions=table.sessions.filter(s=>s.id!==c.before.id);if(next)sessions.splice(Math.min(c.index,sessions.length),0,next as CourseSession);
  const changed=validateTimetable({...table,sessions});return {...data,timetables:data.timetables.map(t=>t.id===table.id?changed:t)};
 }
 const actual=data.tasks.find(t=>t.id===c.before.id);if(!same(actual||null,expected))throw new Error('课程已被修改，不能覆盖或撤销');
 const tasks=data.tasks.filter(t=>t.id!==c.before.id);if(next)tasks.splice(Math.min(c.index,tasks.length),0,next as Task);return {...data,tasks};
}
export function proposeCourseRecordActions(data:AppData,raw:string,mode:'update'|'delete'){
 const args=JSON.parse(raw);if(!args||Object.keys(args).some(k=>k!=='items')||!Array.isArray(args.items)||!args.items.length||args.items.length>20)throw new Error('每次可修改1–20条课程');
 let working=data;const changes:AICourseRecordChange[]=[];
 for(const item of args.items){
  if(!item||typeof item.course_id!=='string'||Object.keys(item).some(k=>!(mode==='update'?['course_id','changes']:['course_id','scope','date']).includes(k)))throw new Error('课程操作参数无效');
  const {table,index,before}=find(working,item.course_id);let after:CourseSession|Task|null=null;
  if(mode==='update'){if(!item.changes||Array.isArray(item.changes)||typeof item.changes!=='object'||!Object.keys(item.changes).length)throw new Error('请提供课程修改内容');after=updated(before,item.changes,table);}
  else if(item.scope==='occurrence'){
   if(!table||typeof item.date!=='string'||!validDate(item.date)||!timetableTasksOn([{...table,enabled:true}],item.date).some(t=>t.courseSessionId===before.id))throw new Error('该日期没有这条课程');
   const week=semesterWeek(parseDate(item.date),table.semesterStartDate,table.weekStartsOn),weeks=(before as CourseSession).weeks.filter(w=>w!==week);after=weeks.length?{...before,weeks} as CourseSession:null;
  }else if(item.scope!=='session')throw new Error('请选择仅本次或所有教学周');
  const change:AICourseRecordChange={kind:'course-record',id:item.course_id,tableId:table?.id||null,before:JSON.parse(JSON.stringify(before)),after:after?JSON.parse(JSON.stringify(after)):null,index,context:table?context(table):'',title:before.title,...(mode==='delete'&&item.scope==='occurrence'?{date:item.date}:{})};
  working=applyCourseRecordChange(working,change);changes.push(change);
 }
 return {data:working,changes};
}
const tool=(name:string,description:string,properties:Record<string,unknown>,required:string[])=>({type:'function',function:{name,description,parameters:{type:'object',properties,required,additionalProperties:false}}});
export const readCoursesTool=tool('get_courses','查询本机课程排课记录（包括隐藏课表），获取准确 course_id、教学周、星期、节次、时间。不同星期的同名课程是不同记录。',{query:{type:'string'}},['query']);
export const updateCoursesTool=tool('update_courses','按用户要求编辑本机课程。必须先查询准确 course_id；改动影响该排课记录的全部教学周，其他同名记录不变。',{items:{type:'array',minItems:1,maxItems:20,items:{type:'object',properties:{course_id:{type:'string'},changes:{type:'object',properties:{title:{type:'string'},teacher:{type:'string'},location:{type:'string'},description:{type:'string'},color:{type:'string'},weekday:{type:'integer'},start_period:{type:'integer'},end_period:{type:'integer'},weeks:{type:'array',items:{type:'integer'}},start_time:{type:['string','null']},end_time:{type:['string','null']},date:{type:'string'}},additionalProperties:false}},required:['course_id','changes'],additionalProperties:false}}},['items']);
export const deleteCoursesTool=tool('delete_courses','按用户明确要求删除课程。scope=occurrence 只删除 date 这一次（从该记录去掉对应教学周）；scope=session 删除该排课记录所有周。先 get_courses 核对ID和范围，不修改其他同名记录。',{items:{type:'array',minItems:1,maxItems:20,items:{type:'object',properties:{course_id:{type:'string'},scope:{type:'string',enum:['occurrence','session']},date:{type:['string','null']}},required:['course_id','scope','date'],additionalProperties:false}}},['items']);
