import type {LessonPeriod} from './types';
import {minutes,validTime} from './calendar';
export const DEFAULT_PERIODS:LessonPeriod[]=[[480,525],[530,575],[600,645],[650,695],[810,855],[860,905],[930,975],[980,1025],[1110,1155],[1160,1205],[1210,1255]].map(([start,end],i)=>({number:i+1,start:clock(start!),end:clock(end!)}));
function clock(value:number){return `${String(Math.floor(value/60)).padStart(2,'0')}:${String(value%60).padStart(2,'0')}`;}
export function periodEnd(start:string,duration:number){
  if(!validTime(start)||!Number.isInteger(duration)||duration<1||duration>360||minutes(start)+duration>=1440)throw new Error('每节时长请填写1–360分钟，结束时间需在当天。');
  return clock(minutes(start)+duration);
}
export function validateLessonPeriods(periods:LessonPeriod[]){
  if(!Array.isArray(periods)||!periods.length||periods.length>24)throw new Error('节次应为1–24节。');
  const sorted=[...periods].sort((a,b)=>a.number-b.number),ids=new Set<number>();
  for(const p of sorted){
    if(!Number.isInteger(p.number)||p.number<1||p.number>24||ids.has(p.number)||!validTime(p.start)||!validTime(p.end)||minutes(p.start)>=minutes(p.end))throw new Error('请检查节次的起止时间。');
    ids.add(p.number);
  }
  for(let i=1;i<sorted.length;i++)if(minutes(sorted[i-1]!.end)>minutes(sorted[i]!.start))throw new Error('相邻节次不能重叠。');
  return sorted;
}
