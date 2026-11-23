import type { AppData, TaskCategory, TaskOccurrence } from './types';
import { dailyTasks } from './homework';
import { allHomework, allHomeworkPreferences } from './platforms';
import { regularTasksOn } from './timetable';
import { isComplete, dateKey, dateTime, addDays, parseDate, taskEnd, tasksOn, startsOn, validDate } from './calendar';
import { homeworkCompleted, homeworkVisible, homeworkDeadlineTasks } from './homework';
import {DEFAULT_CATEGORY_ORDER,normalizeCategoryOrder} from './category-order';
export const CATEGORY_ORDER=DEFAULT_CATEGORY_ORDER;
export const CATEGORY_NAMES: Record<TaskCategory,string> = { course:'课程', homework:'作业', todo:'To-do' };
export const taskCategory = (task: TaskOccurrence):TaskCategory => task.kind==='course'?'course':task.homeworkId?'homework':'todo';
export function homeTasksOn(data: AppData,key:string) {
  return dailyTasks(regularTasksOn(data,key),allHomework(data),key,'timeline',data.settings,allHomeworkPreferences(data));
}
export function occurrenceEnd(task:TaskOccurrence){return task.homeworkDueAt?new Date(task.homeworkDueAt):dateTime(task.endDate,task.endTime);}
export function dailyOverviewTasks(data:AppData,key:string,now=new Date()){
  return homeTasksOn(data,key).filter(t=>!isComplete(t,key)&&(t.kind!=='course'||occurrenceEnd(t)>now));
}
// Only completed To-dos remain in the selected day's collapsed history.
// Ended courses and completed homework are hidden from the home page.
export function homeAgenda(data:AppData,key:string,now=new Date()){
  const cutoff=new Date(Math.min(now.getTime(),dateTime(dateKey(addDays(parseDate(key),1)),'00:00').getTime()));
  const daily=homeTasksOn(data,key);
  const completed=daily.filter(t=>t.kind==='todo'&&!t.homeworkId&&isComplete(t,key));
  const pending=daily.filter(t=>!isComplete(t,key)&&occurrenceEnd(t)>now);
  const overdue:TaskOccurrence[]=[];
  for(const task of data.tasks){
    if(task.kind!=='todo'||task.homeworkId||!validDate(task.date))continue;
    const last=dateKey(cutoff);
    for(let day=parseDate(task.date);dateKey(day)<=last;day=addDays(day,1)){
      const at=dateKey(day);
      if(startsOn(task,at)&&!task.completedDates.includes(at)&&taskEnd(task,at)<=cutoff){
        const item=tasksOn([task],at).find(t=>t.occurrenceDate===at);if(item)overdue.push(item);
      }
      if(!task.repeat)break;
    }
  }
  const prefs=allHomeworkPreferences(data);
  for(const a of allHomework(data)){
    if(!a.dueAt||new Date(a.dueAt)>cutoff||homeworkCompleted(a)||!homeworkVisible(a,data.settings,prefs[a.id]))continue;
    overdue.push(...tasksOn(homeworkDeadlineTasks([a]),dateKey(new Date(a.dueAt))));
  }
  overdue.sort((a,b)=>occurrenceEnd(a).getTime()-occurrenceEnd(b).getTime());
  return {pending,completed,overdue};
}
export function homeGroups(tasks: TaskOccurrence[],key:string,order:TaskCategory[]=DEFAULT_CATEGORY_ORDER) {
  return normalizeCategoryOrder(order).map(category=>{
    const items=tasks.filter(task=>taskCategory(task)===category);
    return {category,items,pending:items.filter(task=>!isComplete(task,key)),completed:items.filter(task=>isComplete(task,key))};
  });
}
