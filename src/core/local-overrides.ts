import type {CanvasAssignment,CourseOccurrenceEdit,HomeworkLocalEdit,HomeworkPreference,Task} from './types';
import {minutes,validTime} from './calendar';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
// Overrides are local projections. Never replace the imported platform record.
export function validateCourseEdit(raw:unknown):CourseOccurrenceEdit{
 if(!object(raw)||Object.keys(raw).some(k=>!['title','description','location','time','endTime','color'].includes(k)))throw new Error('本次课程修改参数无效');
 const result:CourseOccurrenceEdit={};
 for(const [k,v] of Object.entries(raw)){
  if(typeof v!=='string'||v.length>(k==='description'?2000:k==='location'?200:150)||k==='title'&&!v.trim())throw new Error('课程文字无效');
  if((k==='time'||k==='endTime')&&!validTime(v))throw new Error('课程时间无效');
  if(k==='color'&&!/^#[a-f\d]{6}$/i.test(v))throw new Error('课程颜色无效');
  (result as Record<string,string>)[k]=v;
 }
 if((result.time===undefined)!==(result.endTime===undefined)||result.time&&minutes(result.endTime!)<=minutes(result.time))throw new Error('请同时提供开始和结束时间，且结束晚于开始');
 return result;
}
export function validateHomeworkEdit(raw:unknown):HomeworkLocalEdit{
 if(!object(raw)||Object.keys(raw).some(k=>!['title','description','courseName','unlockAt','dueAt'].includes(k)))throw new Error('作业临时修改参数无效');
 const result:HomeworkLocalEdit={};
 for(const [k,v] of Object.entries(raw)){
  if(k==='unlockAt'||k==='dueAt'){
   if(v!==null&&(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT/.test(v)||!Number.isFinite(Date.parse(v))))throw new Error('作业时间需包含日期和时区');
   result[k]=v===null?null:new Date(v as string).toISOString();
  }else{
   if(typeof v!=='string'||v.length>(k==='description'?10000:200)||k==='title'&&!v.trim())throw new Error('作业文字无效');
   (result as Record<string,unknown>)[k]=v;
  }
 }
 return result;
}
export const courseOccurrenceKey=(task:Pick<Task,'id'|'timetableId'>,date:string)=>task.timetableId?task.id:`course-local:${encodeURIComponent(task.id)}:${date}`;
export function projectCourse(task:Task,edit:CourseOccurrenceEdit|undefined):Task{
 if(!edit)return task;
 const {endTime,...patch}=edit;
 return {...task,...patch,...(edit.time&&endTime?{duration:minutes(endTime)-minutes(edit.time)}:{})};
}
export function projectHomework(assignment:CanvasAssignment,preference:HomeworkPreference|undefined):CanvasAssignment{
 return preference?.localEdit?{...assignment,...preference.localEdit}:assignment;
}
