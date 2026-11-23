// Adapted from TJ-Class-Schedule (MIT, Copyright (c) 2026 Algernon).
import type { AppData, CourseSession, LessonPeriod, Task, Timetable } from './types';
import { daysBetween, minutes, parseDate, validDate, validTime, weekStart } from './calendar';
import {projectCourse,courseOccurrenceKey} from './local-overrides';
export {DEFAULT_PERIODS} from './lesson-periods';
export interface TimetableRecord { text: string; weekday: number; startPeriod: number; endPeriod: number }
export interface TimetablePopup { text: string; weekday: number; startPeriod: number; endPeriod: number }
export interface TimetableCapture { rows: TimetableRecord[]; popups: TimetablePopup[]; periods?: LessonPeriod[] }
export function parseWeeks(raw: string): number[] {
  if (raw.length > 500) throw new Error('周次描述过长。');
  const parts = raw.replace(/[第周\s()（）]/g,'').replace(/[，、;；]/g,',').replace(/[—–~～至]/g,'-').split(',');
  const weeks = new Set<number>();
  const overall = /[(（]([单双])[)）]\s*$/.exec(raw)?.[1];
  for (const part of parts) {
    const match = /^(\d+)(?:-(\d+))?([单双])?$/.exec(part);
    if (!match) throw new Error(`无法识别周次：${raw}`);
    const from = Number(match[1]), to = Number(match[2] || match[1]), parity = match[3] || overall;
    if (from < 1 || to > 53 || from > to) throw new Error('周次范围应为 1～53。');
    for (let week = from; week <= to; week++) if (!parity || (week % 2 === 1) === (parity === '单')) weeks.add(week);
  }
  if (!weeks.size) throw new Error('没有有效上课周次。');
  return [...weeks].sort((a,b) => a-b);
}
const looksLikeWeeks = (text: string) => /\d/.test(text) && /^[\d\s,，、\-—–~～至第单双周()（）]+$/.test(text);
function recordSession(record: TimetableRecord): Omit<CourseSession,'id'> {
  if (![record.weekday,record.startPeriod,record.endPeriod].every(Number.isInteger) || record.weekday < 1 || record.weekday > 7 || record.startPeriod < 1 || record.endPeriod > 24 || record.startPeriod > record.endPeriod || typeof record.text !== 'string' || record.text.length > 4000) throw new Error('星期或节次无效。');
  const text = record.text.replace(/\s+/g,' ').trim(), week = /\[([^\]]+)\]/.exec(text);
  if (!week || !looksLikeWeeks(week[1]!)) throw new Error('未找到可靠的上课周次。');
  let before = text.slice(0,week.index).trim(), location = text.slice(week.index + week[0].length).trim();
  if (/[（(]$/.test(before)) { before = before.slice(0,-1).trim(); location = location.replace(/[)）]/,' '); }
  before = before.replace(/\([A-Za-z]{2,}[A-Za-z0-9_-]*\)\s*$/,'').trim();
  const teacherPrefix = /^((?:[^\s,，、()]+\(\d+\)\s*[,，、]?\s*)+)/.exec(before);
  let title = before, teacher = '';
  if (teacherPrefix) {
    const names = [...teacherPrefix[1]!.matchAll(/([^\s,，、()]+)\(\d+\)/g)];
    title = before.slice(teacherPrefix[0].length).trim(); teacher = names.map(m => m[1]).join('、');
    if (!title && names.length >= 2) { title = names.at(-1)![0]; teacher = names.slice(0,-1).map(m => m[1]).join('、'); }
  } else {
    const graduate = /^([\u4e00-\u9fa5]{2,4})\s+(\S.*)$/.exec(before);
    if (graduate) { teacher = graduate[1]!; title = graduate[2]!; }
  }
  location = location.replace(/^[\s,，、;；]+|[\s,，、;；]+$/g,'').trim();
  if (!title || title.length > 150 || teacher.length > 150 || location.length > 200) throw new Error('课程标题、教师或地点无法识别。');
  return { title, teacher, location, weekday: record.weekday, startPeriod: record.startPeriod, endPeriod: record.endPeriod, weeks: parseWeeks(week[1]!) };
}
export function parsePopupText(raw: string): TimetableRecord[] {
  if (raw.length > 30000) return [];
  const label = /\[(?:星期|周)([一二三四五六日天])\]/.exec(raw)?.[1];
  if (!label) return [];
  const weekday = '一二三四五六日'.indexOf(label === '天' ? '日' : label) + 1, joined: string[] = [];
  for (const line of raw.split('\n').map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean)) {
    if (/^(?:\d+\s*[.、]\s*)?\[\d+(?:\s*-\s*\d+)?节\]/.test(line) || !joined.length) joined.push(line);
    else joined[joined.length-1] += line;
  }
  const records: TimetableRecord[] = [];
  for (const line of joined) {
    const chunks = [...line.matchAll(/\[(\d+)(?:\s*-\s*(\d+))?节\]/g)];
    for (let i=0;i<chunks.length;i++) {
      const chunk = chunks[i]!, startPeriod = Number(chunk[1]), endPeriod = Number(chunk[2] || chunk[1]);
      let body = line.slice(chunk.index!+chunk[0].length,chunks[i+1]?.index ?? line.length).replace(/\s*\d+\s*[.、]\s*$/,'').trim();
      const lead = /^\[([^\]]+)\]\s*/.exec(body), leading = lead && looksLikeWeeks(lead[1]!) ? lead[1]! : null;
      if (leading) body = body.slice(lead![0].length);
      const segments: string[] = []; let depth=0, from=0;
      for (let j=0;j<body.length;j++) {
        const c=body[j]!; if ('[（('.includes(c)) depth++; else if (']）)'.includes(c)) depth=Math.max(0,depth-1);
        else if (',，'.includes(c) && !depth && /^\s*[\u4e00-\u9fa5]{2,4}\s+\S/.test(body.slice(j+1))) { segments.push(body.slice(from,j));from=j+1; }
      }
      segments.push(body.slice(from));
      for (const value of segments) {
        const segment=value.trim(), code=/\([A-Za-z]{2,}[A-Za-z0-9_-]*\)/.exec(segment);
        if (code && leading) {
          const tail=segment.slice(code.index+code[0].length).trim(), teachers=/^((?:[^\s,，、()]+\(\d+\)\s*[,，、]?\s*)+)/.exec(tail);
          if (teachers) { records.push({ text:`${teachers[0].trim()} ${segment.slice(0,code.index+code[0].length)} [${leading}] ${tail.slice(teachers[0].length).trim()}`,weekday,startPeriod,endPeriod });continue; }
        }
        const graduate=/^([\u4e00-\u9fa5]{2,4})\s+(.+?)[（(]([^)]*?)[)）](.*)$/.exec(segment);
        if (!graduate) continue;
        const innerWeek=/^\s*\[([^\]]+)\]\s*/.exec(graduate[3]!), spec=innerWeek?.[1] || leading;
        if (!spec || !looksLikeWeeks(spec)) continue;
        const location=(innerWeek?graduate[3]!.slice(innerWeek[0].length):graduate[3]!)+' '+graduate[4];
        records.push({text:`${graduate[1]} ${graduate[2]} [${spec}] ${location.trim()}`,weekday,startPeriod,endPeriod});
      }
    }
  }
  return records;
}
export function parseTimetableCapture(capture: TimetableCapture) {
  if (!capture || !Array.isArray(capture.rows) || capture.rows.length > 500 || !Array.isArray(capture.popups) || capture.popups.length > 150) throw new Error('课表数据格式或数量异常。');
  const popupRecords = capture.popups.flatMap(p => {
    if (!p || typeof p.text !== 'string') return [];
    const parsed = parsePopupText(p.text);
    return parsed.length && parsed.every(r => r.weekday===p.weekday && r.startPeriod<=p.endPeriod && p.startPeriod<=r.endPeriod) ? parsed : [];
  });
  const records = [...popupRecords,...capture.rows.filter(card=>!popupRecords.some(p=>p.weekday===card.weekday && p.startPeriod<=card.endPeriod && card.startPeriod<=p.endPeriod))];
  const sessions = new Map<string,CourseSession>(), warnings: string[] = [];
  for (const [i,record] of records.entries()) {
    try {
      const parsed=recordSession(record), key=JSON.stringify([parsed.title,parsed.teacher,parsed.location,parsed.weekday,parsed.startPeriod,parsed.endPeriod]);
      const previous=sessions.get(key);
      if (previous) previous.weeks=[...new Set([...previous.weeks,...parsed.weeks])].sort((a,b)=>a-b);
      else sessions.set(key,{...parsed,id:`session-${i+1}`});
    } catch (e) { warnings.push(`第 ${i+1} 条：${e instanceof Error?e.message:'识别失败'}`); }
  }
  if (!sessions.size) throw new Error('没有识别到有效课程，请确认已登录并显示完整的学生个人课表。');
  return { sessions:[...sessions.values()].sort((a,b)=>a.weekday-b.weekday||a.startPeriod-b.startPeriod||a.title.localeCompare(b.title,'zh')), warnings };
}
export function validateTimetable(table: Timetable) {
  if (!table || !table.id || table.id.length>120 || !table.name.trim() || table.name.length>60 || !validDate(table.semesterStartDate) || ![0,1].includes(table.weekStartsOn) || table.sessions.length>500 || !table.periods.length || table.periods.length>24) throw new Error('请填写课表名称、学期第一周，并保留有效课程。');
  const periods=new Map<number,LessonPeriod>();
  for (const period of table.periods) {
    if (!Number.isInteger(period.number) || period.number<1 || period.number>24 || periods.has(period.number) || !validTime(period.start) || !validTime(period.end) || minutes(period.start)>=minutes(period.end)) throw new Error('请检查节次的起止时间。');
    periods.set(period.number,period);
  }
  const sorted=[...periods.values()].sort((a,b)=>a.number-b.number);
  for (let i=1;i<sorted.length;i++) if (minutes(sorted[i-1]!.end)>minutes(sorted[i]!.start)) throw new Error('相邻节次不能重叠。');
  const ids=new Set<string>();
  for (const s of table.sessions) {
    if (!s.id || ids.has(s.id) || !s.title.trim() || s.title.length>150 || !Number.isInteger(s.weekday) || s.weekday<1 || s.weekday>7 || !Number.isInteger(s.startPeriod) || !Number.isInteger(s.endPeriod) || s.startPeriod>s.endPeriod || !s.weeks.length || s.weeks.length>53 || s.weeks.some(w=>!Number.isInteger(w)||w<1||w>53) || !periods.has(s.startPeriod)||!periods.has(s.endPeriod)) throw new Error('课程的星期、节次或周次无效，请核对导入预览。');
    if(s.color!==undefined&&!/^#[a-fA-F0-9]{6}$/.test(s.color))throw new Error('课程颜色应为六位十六进制色值。');
    if((s.startTime!==undefined||s.endTime!==undefined)&&(!validTime(s.startTime||'')||!validTime(s.endTime||'')||minutes(s.startTime!)>=minutes(s.endTime!)))throw new Error('课程结束时间需晚于开始时间，且在同一天。');
    ids.add(s.id);
  }
  return table;
}
export function timetableTasksOn(tables: Timetable[], key: string): Task[] {
  if (!validDate(key)) return [];
  const date=parseDate(key), result:Task[]=[];
  for (const table of tables) {
    if (!table.enabled) continue;
    const anchor=weekStart(parseDate(table.semesterStartDate),table.weekStartsOn), week=Math.floor(daysBetween(anchor,date)/7)+1;
    if (week<1||week>53) continue;
    for (const session of table.sessions) {
      if (session.weekday%7!==date.getDay() || !session.weeks.includes(week)) continue;
      const start=table.periods.find(p=>p.number===session.startPeriod), end=table.periods.find(p=>p.number===session.endPeriod);
      if (!start || !end) continue;
      const startTime=session.startTime||start.start,endTime=session.endTime||end.end;
      result.push({id:`course:${table.id}:${session.id}:${key}`,timetableId:table.id,courseSessionId:session.id,title:session.title,description:`${table.name} · ${session.teacher || '教师未标注'} · 第 ${week} 周 · ${session.startPeriod}–${session.endPeriod} 节`,location:session.location,date:key,time:startTime,duration:minutes(endTime)-minutes(startTime),color:session.color||'#A8C9EB',kind:'course',repeat:null,subtasks:[],completedDates:[]});
    }
  }
  return result;
}
export function courseTasksOn(data:AppData,key:string){
 return [...data.tasks.filter(t=>t.kind==='course'),...timetableTasksOn(data.timetables,key)].map(t=>projectCourse(t,data.courseOverrides?.[courseOccurrenceKey(t,key)]));
}
export function regularTasksOn(data: AppData, key: string) { return [...data.tasks.filter(t=>t.kind!=='course'),...courseTasksOn(data,key)].filter(task=>task.kind!=='course'||data.courseExceptions?.[courseOccurrenceKey(task,key)]!==false); }
