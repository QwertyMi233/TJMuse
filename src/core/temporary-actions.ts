import type {AppData,AIStateChange,HomeworkPreference} from './types';
import {courseTasksOn} from './timetable';
import {dateTime,validDate,tasksOn} from './calendar';
import {courseOccurrenceKey,validateCourseEdit,validateHomeworkEdit,projectHomework} from './local-overrides';
import {homeworkPlatform} from './platforms';
import {applyStateChanges} from './ai-state-actions';
// Shared by manual editors and AI. All changes stay in local preferences and can be reset.
export function proposeTemporaryActions(data:AppData,raw:string,kind:'course-local'|'homework-local',now=new Date()){
 const args=JSON.parse(raw);if(!args||Object.keys(args).some(k=>k!=='items')||!Array.isArray(args.items)||!args.items.length||args.items.length>20)throw new Error('临时修改参数无效');
 let working=data;const changes:AIStateChange[]=[];
 for(const item of args.items){
  if(!item||typeof item!=='object'||Array.isArray(item))throw new Error('临时修改参数无效');
  let change:AIStateChange;
  if(kind==='course-local'){
   if(Object.keys(item).some(k=>!['occurrence_id','date','changes','reset'].includes(k))||typeof item.occurrence_id!=='string'||typeof item.date!=='string'||!validDate(item.date)||typeof item.reset!=='boolean')throw new Error('本次课程参数无效');
   const task=tasksOn(courseTasksOn(working,item.date),item.date).find(t=>t.id===item.occurrence_id);
   if(!task||dateTime(item.date,task.time)<=now)throw new Error('仅可临时编辑尚未开始的课程');
   const key=courseOccurrenceKey(task,item.date),before=working.courseOverrides?.[key];
   const after=item.reset?undefined:validateCourseEdit({...before,...validateCourseEdit(item.changes)});
   if(after?.time&&dateTime(item.date,after.time)<=now)throw new Error('不能把课程移到已经过去的时间');
   change={kind:'course-local',id:task.id,date:item.date,before,after,fingerprint:JSON.stringify(task),title:task.title};
  }else{
   if(Object.keys(item).some(k=>!['homework_id','changes','reset','active'].includes(k))||typeof item.homework_id!=='string'||typeof item.reset!=='boolean'||item.active!==undefined&&typeof item.active!=='boolean')throw new Error('作业临时修改参数无效');
   const platform=homeworkPlatform(item.homework_id),state=working[platform],a=state.assignments.find(a=>a.id===item.homework_id),before=state.preferences[item.homework_id];
   if(!a||before?.deleted)throw new Error('没有找到这份作业');
   const after:HomeworkPreference={visibility:'default',deleted:false,...before};
   if(item.reset)delete after.localEdit;
   else if(item.changes!==undefined){const patch=validateHomeworkEdit(item.changes);if(Object.keys(patch).length)after.localEdit=validateHomeworkEdit({...before?.localEdit,...patch});}
   if(item.active!==undefined)after.temporaryDisabled=!item.active;
   const effective=projectHomework(a,after);
   if(effective.unlockAt&&effective.dueAt&&Date.parse(effective.unlockAt)>Date.parse(effective.dueAt))throw new Error('作业截止时间不能早于开始时间');
   change={kind:'homework',platform,id:a.id,accountId:state.userId,before,beforeOverride:a.completedOverride,beforeCompleted:a.completed,after,title:effective.title};
  }
  working=applyStateChanges(working,[change],now);changes.push(change);
 }
 return {data:working,changes};
}
const tool=(name:string,description:string,properties:Record<string,unknown>)=>({type:'function',function:{name,description,parameters:{type:'object',properties:{items:{type:'array',minItems:1,maxItems:20,items:{type:'object',properties,required:name==='edit_course_occurrences'?['occurrence_id','date','reset']:['homework_id','reset'],additionalProperties:false}}},required:['items'],additionalProperties:false}}});
export const temporaryCourseTool=tool('edit_course_occurrences','临时编辑某一天的一节课，其他教学周不变。先 get_schedule 核对 occurrence_id 和日期。changes 可修改名称、说明、地点、开始结束时间和颜色；reset=true 恢复这一次的原排课。停用或恢复用 set_course_active。',{occurrence_id:{type:'string'},date:{type:'string'},reset:{type:'boolean'},changes:{type:'object',properties:{title:{type:'string'},description:{type:'string'},location:{type:'string'},time:{type:'string'},endTime:{type:'string'},color:{type:'string'}},additionalProperties:false}});
export const temporaryHomeworkTool=tool('edit_homework_local','临时编辑或禁用本机作业，先 get_homework 核对ID。changes 修改本机名称、说明、课程名、开始和截止时间（ISO8601带时区或null）；平台原文保留。active=false 临时禁用，true 恢复，禁用不等于完成或删除。reset=true 恢复平台原文；不会自动改变active。',{homework_id:{type:'string'},reset:{type:'boolean'},active:{type:'boolean'},changes:{type:'object',properties:{title:{type:'string'},description:{type:'string'},courseName:{type:'string'},unlockAt:{type:['string','null']},dueAt:{type:['string','null']}},additionalProperties:false}});
