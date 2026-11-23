import type {AppData} from './types';
import {addDays,dateKey,dateTime,isComplete,parseDate,semesterWeek} from './calendar';
import {homeTasksOn,occurrenceEnd,taskCategory} from './home-layout';
import {tr,appLanguage} from './i18n';
export interface WidgetView {header:string;date:string;empty:string;more:string;rows:{id:string;title:string;detail:string;time:string}[]}
export function sameWidgetView(a:WidgetView|undefined,b:WidgetView|undefined){
  if(!a||!b||!Array.isArray(a.rows)||!Array.isArray(b.rows)||a.rows.length!==b.rows.length)return false;
  return (['header','date','empty','more'] as const).every(key=>a[key]===b[key])&&a.rows.every((row,i)=>!!b.rows[i]&&(['id','title','detail','time'] as const).every(key=>row[key]===b.rows[i]![key]));
}
export function widgetView(data:AppData,now:Date):WidgetView{
  const key=dateKey(now),week=semesterWeek(now,data.settings.semesterStartDate,data.settings.weekStartsOn);
  const tasks=homeTasksOn(data,key).filter(t=>!isComplete(t,key)&&occurrenceEnd(t)>now).sort((a,b)=>Number(!!a.homeworkId)-Number(!!b.homeworkId)||a.dayStartTime.localeCompare(b.dayStartTime));
  return {header:week?tr('第 {0} 周').replace('{0}',String(week)):tr('学期未开始'),date:now.toLocaleDateString(data.settings.language==='system'?appLanguage():data.settings.language,{weekday:'short',month:'short',day:'numeric'}),empty:tr('今天暂无剩余安排'),more:tasks.length>6?tr('另有 {0} 项').replace('{0}',String(tasks.length-6)):'',rows:tasks.slice(0,6).map(t=>({id:`${t.id}:${t.occurrenceDate}`,title:t.title,detail:[tr(taskCategory(t)==='course'?'课程':t.homeworkId?'作业':'To-do'),t.location].filter(Boolean).join(' · '),time:t.homeworkId?(t.homeworkDueAt?`${t.endDate.slice(5)} ${t.endTime}`:tr('无截止时间')):`${t.dayStartTime}–${t.dayEndTime}`}))};
}
// Each expiration and each midnight has its own entry, including an empty terminal day.
// This contains display data only: no tokens, passwords, or private assignment descriptions.
export function widgetTimeline(data:AppData,now=new Date(),days=7){
  const times=new Set<number>([now.getTime()]);
  for(let i=0;i<days;i++){
    const day=addDays(parseDate(dateKey(now)),i),key=dateKey(day);
    if(i)times.add(dateTime(key,'00:00').getTime());
    for(const t of homeTasksOn(data,key)){const end=occurrenceEnd(t).getTime();if(end>now.getTime()&&dateKey(new Date(end))===key)times.add(end);}
  }
  const terminal=dateTime(dateKey(addDays(parseDate(dateKey(now)),days)),'00:00');times.add(terminal.getTime());
  return [...times].sort((a,b)=>a-b).map(timestamp=>{const date=new Date(timestamp),view=widgetView(data,date);return {date,props:timestamp===terminal.getTime()?{...view,rows:[],more:''}:view};});
}
