import type {CourseSession,Timetable} from './types';
import {validateTimetable} from './timetable';
export function manualCourseWeeks(first:number,last:number,parity:'all'|'odd'|'even'){
  if(!Number.isInteger(first)||!Number.isInteger(last)||first<1||last>53||first>last)throw new Error('教学周范围请填写1–53，结束周不能早于开始周。');
  const weeks=Array.from({length:last-first+1},(_,i)=>first+i).filter(w=>parity==='all'||w%2===(parity==='odd'?1:0));
  if(!weeks.length)throw new Error('所选范围没有符合单双周的上课周次。');
  return weeks;
}
export function appendManualCourse(table:Timetable,session:CourseSession){
  if(table.sessions.some(s=>s.id===session.id))throw new Error('这条课程已保存，请勿重复添加。');
  const normalized={...session,title:session.title.trim(),teacher:session.teacher.trim(),location:session.location.trim()};
  if(!normalized.title)throw new Error('请填写课程名称。');
  if(normalized.teacher.length>150||normalized.location.length>200)throw new Error('教师或地点文字过长。');
  return validateTimetable({...table,sessions:[...table.sessions,normalized]});
}
