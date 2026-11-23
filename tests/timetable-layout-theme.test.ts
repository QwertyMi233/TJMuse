import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { parseWeeks, parsePopupText, parseTimetableCapture, DEFAULT_PERIODS, timetableTasksOn, validateTimetable } from '../src/core/timetable';
import { initialData } from '../src/core/defaults';
import { homeGroups, homeTasksOn } from '../src/core/home-layout';
import { restoreData } from '../src/core/storage';
import { LIGHT_PALETTE, DARK_PALETTE, resolveTheme } from '../src/core/theme';
import { upcomingReminders } from '../src/core/reminders';
import { plannerContext } from '../src/services/ai';
import { timetableCaptureScript } from '../src/services/timetable-capture-script';
import type { Timetable } from '../src/core/types';

const record={text:'示例教师(10001) 示例数学(1)(DEMO101) [1,3,5-9单] 教学楼 101',weekday:1,startPeriod:1,endPeriod:2};
function table():Timetable { return {id:'table-a',name:'秋季课表',enabled:true,semesterStartDate:'2026-09-14',weekStartsOn:1,importedAt:'2026-10-30T00:00:00Z',periods:DEFAULT_PERIODS.map(p=>({...p})),sessions:parseTimetableCapture({rows:[record],popups:[]}).sessions}; }
test('timetable week rules retain gaps, parity and numeric course suffixes',()=>{
  assert.deepEqual(parseWeeks('第1-16周（双）'),[2,4,6,8,10,12,14,16]);
  assert.deepEqual(parseWeeks('1、3、5-9单'),[1,3,5,7,9]);
  assert.deepEqual(parseWeeks('1-3,6,8-10双'),[1,2,3,6,8,10]);
  for(const bad of ['0-3','3-1','1-54','1,abc','1-2单,0'])assert.throws(()=>parseWeeks(bad));
  const sessions=table().sessions;
  assert.equal(sessions[0]!.title,'示例数学(1)');assert.equal(sessions[0]!.teacher,'示例教师');assert.equal(sessions[0]!.location,'教学楼 101');
});
test('popup parsing handles joined and wrapped lines, undergraduate and graduate records',()=>{
  const popup='[星期四] 排课信息\n1.[3-4节] [1,3,5] 示例数学(1)(DEMO101) 示甲乙(1000\n1) 教学楼101 2.[5-6节] [2-16双] 示例物理(DEMO102) 示甲丙(10002) 实验楼201';
  const rows=parsePopupText(popup);assert.equal(rows.length,2);assert.equal(rows[0]!.weekday,4);assert.equal(rows[1]!.startPeriod,5);
  const parsed=parseTimetableCapture({rows:[],popups:[{text:popup,weekday:4,startPeriod:3,endPeriod:6}]});assert.equal(parsed.sessions.length,2);
  assert.equal(parsed.sessions[0]!.teacher,'示甲乙');assert.equal(parsed.sessions[0]!.title,'示例数学(1)');
  const graduate='[星期一] 排课信息\n[1-2节] 示甲乙 示例课程（[1-4]教学楼101），示甲丙 示例课程（[7-8]教学楼203）';
  const result=parseTimetableCapture({rows:parsePopupText(graduate),popups:[]});assert.equal(result.sessions.length,2);assert.deepEqual(result.sessions.map(s=>s.weeks),[[1,2,3,4],[7,8]]);
});
test('stale popups cannot overwrite another cell; duplicate segments merge without filling gaps',()=>{
  const popup='[星期四] 排课信息\n[1-2节] [1-16] 错误课程(DEMO102) 示甲乙(10001) 教学楼101';
  const result=parseTimetableCapture({rows:[record,{...record,text:record.text.replace('[1,3,5-9单]','[11,13]')}],popups:[{text:popup,weekday:1,startPeriod:1,endPeriod:2}]});
  assert.equal(result.sessions.length,1);assert.deepEqual(result.sessions[0]!.weeks,[1,3,5,7,9,11,13]);
  assert.throws(()=>parseTimetableCapture({rows:[],popups:[]}));
});
test('multiple independently anchored timetables appear only on selected weeks and enabled tables',()=>{
  const first=table(), second={...table(),id:'table-b',name:'另一学期',semesterStartDate:'2026-10-26'};
  assert.equal(timetableTasksOn([first],'2026-09-14').length,1);assert.equal(timetableTasksOn([first],'2026-09-21').length,0);
  const both=timetableTasksOn([first,second],'2026-10-26');assert.equal(both.length,2);assert.notEqual(both[0]!.id,both[1]!.id);
  assert.equal(both[0]!.time,'08:00');assert.equal(both[0]!.duration,95);assert.equal(both[0]!.kind,'course');
  assert.equal(timetableTasksOn([{...first,enabled:false},second],'2026-10-26').length,1);
  const sunday={...first,weekStartsOn:0 as const,semesterStartDate:'2026-09-13'};
  assert.equal(timetableTasksOn([sunday],'2026-09-14').length,1);
});
test('timetable migration, validation and visibility are shared by home, AI and course reminders',()=>{
  const data=structuredClone(initialData);data.timetables=[table()];data.settings.courseNotifications=true;
  assert.equal(homeTasksOn(data,'2026-10-26').length,1);
  const now=new Date('2026-10-26T07:00:00+08:00');
  assert.ok(plannerContext(data,now).includes('示例数学'));assert.equal(upcomingReminders(data,now).some(r=>r.title==='示例数学(1)'),true);
  const restored=restoreData(JSON.parse(JSON.stringify(data)));assert.deepEqual(restored.timetables,data.timetables);
  restored.timetables[0]!.enabled=false;
  assert.equal(homeTasksOn(restored,'2026-10-26').length,0);assert.equal(plannerContext(restored,now).includes('示例数学'),false);
  assert.equal(upcomingReminders(restored,now).length,0);
  assert.deepEqual(restoreData({...data,timetables:undefined}).timetables,[]);
  assert.throws(()=>validateTimetable({...table(),periods:[{number:1,start:'09:00',end:'08:00'}]}));
  assert.throws(()=>validateTimetable({...table(),sessions:[{...table().sessions[0]!,weeks:[0]}]}));
});
test('home layout mixes courses and tasks by time and partitions local completion independently',()=>{
  const data=structuredClone(initialData);data.timetables=[table()];data.settings.homeLayout='grouped';
  data.tasks=[{id:'task',title:'普通待办',description:'',date:'2026-10-26',time:'07:00',duration:30,color:'#0066B3',location:'',kind:'todo',repeat:null,subtasks:[],completedDates:['2026-10-26']}];
  data.canvas.assignments=[{id:'1:1',courseId:'1',courseName:'课程',title:'作业',description:'',url:'https://canvas.tongji.edu.cn',dueAt:'2026-10-26T10:00:00+08:00',createdAt:'2026-10-26T09:00:00+08:00',submitted:true,completed:false,completedOverride:false}];
  const tasks=homeTasksOn(data,'2026-10-26');assert.deepEqual(tasks.map(t=>t.title),['普通待办','示例数学(1)','作业']);
  const groups=homeGroups(tasks,'2026-10-26');assert.deepEqual(groups.map(g=>g.category),['todo','course','homework']);assert.equal(groups[0]!.completed.length,1);assert.equal(groups[1]!.pending.length,1);assert.equal(groups[2]!.pending.length,1);
  data.settings.collapsedCategories.course=true;data.settings.collapsedCompleted.todo=false;
  const restored=restoreData(JSON.parse(JSON.stringify(data)));assert.equal(restored.settings.collapsedCategories.course,true);assert.equal(restored.settings.collapsedCompleted.todo,false);
});
test('system and manual theme modes resolve independent palettes and preserve legacy custom colors',()=>{
  const settings=structuredClone(initialData.settings);
  assert.deepEqual(resolveTheme(settings,'dark'),{...DARK_PALETTE,mode:'dark',dark:true});
  assert.deepEqual(resolveTheme(settings,'light'),{...LIGHT_PALETTE,mode:'light',dark:false});
  settings.themeMode='light';assert.equal(resolveTheme(settings,'dark').background,'#FFFFFF');
  settings.themeMode='dark';assert.equal(resolveTheme(settings,'light').foreground,'#F2F6FC');
  const legacy=JSON.parse(JSON.stringify(initialData));delete legacy.settings.themeMode;delete legacy.settings.themePalettes;
  legacy.settings.foreground='#F2F6FC';legacy.settings.background='#111D2D';legacy.settings.accent='#A55D73';
  const restored=restoreData(legacy);assert.equal(restored.settings.themeMode,'dark');assert.equal(resolveTheme(restored.settings,'light').accent,'#A55D73');
  const normal=JSON.parse(JSON.stringify(initialData));delete normal.settings.themeMode;delete normal.settings.themePalettes;
  assert.equal(restoreData(normal).settings.themeMode,'system');
});
test('timetable bridge refuses non-school pages and never reads credentials',async()=>{
  const messages:any[]=[],context=vm.createContext({URL,location:{origin:'https://example.test',pathname:'/GraduateStudentTimeTable'},window:{ReactNativeWebView:{postMessage:(value:string)=>messages.push(JSON.parse(value))}}});
  vm.runInContext(timetableCaptureScript('nonce'),context);await new Promise(resolve=>setImmediate(resolve));
  assert.equal(messages.length,1);assert.equal(messages[0].kind,'timetable');assert.ok(messages[0].error);
  assert.equal(timetableCaptureScript('nonce').includes('document.cookie'),false);assert.equal(timetableCaptureScript('nonce').includes('sessionStorage'),false);
});
