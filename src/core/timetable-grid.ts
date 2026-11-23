import {addDays,dateKey,parseDate,tasksOn,weekStart} from './calendar';
import {timetableTasksOn} from './timetable';
import type {Timetable,TaskOccurrence,AppData} from './types';
import {projectCourse} from './local-overrides';
export interface GridLesson {task:TaskOccurrence;weekday:number;start:number;end:number;lane:number;lanes:number;parity:string;color:string}
export function timetableGrid(tables:Timetable[],selected:string,startsOn:0|1,overrides?:AppData['courseOverrides']):GridLesson[] {
  const anchor=weekStart(parseDate(selected),startsOn),result:GridLesson[]=[];
  for(let day=0;day<7;day++){
    const key=dateKey(addDays(anchor,day));
    const lessons=timetableTasksOn(tables,key).map(task=>projectCourse(task,overrides?.[task.id])).flatMap(task=>{
      const session=tables.find(t=>t.id===task.timetableId)?.sessions.find(s=>s.id===task.courseSessionId);
      const occurrence=tasksOn([task],key)[0];if(!session||!occurrence)return [];
      return [{task:occurrence,weekday:day,start:session.startPeriod-1,end:session.endPeriod,lane:0,lanes:1,color:overrides?.[task.id]?.color||session.color||courseColor(session.title),parity:session.weeks.length>1&&session.weeks.every(w=>w%2===1)?'单周':session.weeks.length>1&&session.weeks.every(w=>w%2===0)?'双周':''}];
    }).sort((a,b)=>a.start-b.start||a.end-b.end||a.task.id.localeCompare(b.task.id));
    // Split connected overlap groups into lanes, so multiple imported schedules
    // never cover each other's cards. Touching intervals can reuse the same lane.
    let group:GridLesson[]=[],ends:number[]=[],groupEnd=-1;
    const flush=()=>{for(const lesson of group)lesson.lanes=ends.length;result.push(...group);group=[];ends=[];};
    for(const lesson of lessons){
      if(group.length&&lesson.start>=groupEnd){flush();groupEnd=-1;}
      let lane=ends.findIndex(end=>end<=lesson.start);if(lane<0)lane=ends.length;
      lesson.lane=lane;ends[lane]=lesson.end;group.push(lesson);groupEnd=Math.max(groupEnd,lesson.end);
    }
    flush();
  }
  return result;
}
const COLORS=['#347BB8','#BC5275','#189596','#9970B6','#C07A18','#4F78C7','#8C6E4F'];
export function courseColor(title:string){let hash=0;for(const c of title)hash=(hash*31+c.charCodeAt(0))>>>0;return COLORS[hash%COLORS.length]!;}
