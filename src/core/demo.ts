import { initialData } from './defaults';
import { addDays, dateKey, weekStart } from './calendar';
import type { AppData, CanvasAssignment } from './types';
import {DEFAULT_PERIODS} from './timetable';
export function demoAssignments(platform: 'canvas' | 'haoke' | 'zhixuemeng'): CanvasAssignment[] {
  const now = new Date(), start = addDays(now, -1), due = addDays(now, platform === 'canvas' ? 2 : 1);
  start.setHours(9, 0, 0, 0); due.setHours(22, 0, 0, 0);
  if(platform==='zhixuemeng')return [{id:'zhixuemeng:demo:work9',platform,courseId:'demo',courseName:'示例高等数学',title:'第9周作业',description:'1. 上传练习册第57页图片\n2. 上传练习册第58页图片\n3. 上传练习册第59页图片\n4. 上传练习册第60页图片',dueAt:due.toISOString(),unlockAt:start.toISOString(),createdAt:start.toISOString(),firstSeenAt:now.toISOString(),submitted:false,completed:false,url:'https://h5.zhixuemeng.com/#/pages/class/banji_bjzy?courseCode=demo'}];
  return [{ id: platform === 'canvas' ? '1:101' : 'haoke:2:201', platform, courseId: platform === 'canvas' ? '1' : '2',
    courseName: platform === 'canvas' ? '线性代数' : '大学物理', title: platform === 'canvas' ? '完成第三章习题' : '实验课前预习',
    description: '演示数据，用于检查作业同步与待办显示。', dueAt: due.toISOString(), createdAt: start.toISOString(), firstSeenAt: now.toISOString(),
    submitted: false, completed: false, url: platform === 'canvas' ? 'https://canvas.tongji.edu.cn/courses/1/assignments/101' : 'https://tongji.aihaoke.net/student/course/2/task' }];
}
export function createDemoData(): AppData {
  const data: AppData = JSON.parse(JSON.stringify(initialData)), today = dateKey(new Date());
  data.settings.onboardingCompleted=true;
  data.settings.semesterStartDate = dateKey(weekStart(addDays(new Date(), -49), 1)); data.settings.holidayEnabled = false;
  data.timetables=[{id:'demo-table',name:'同济秋季示例课表',enabled:true,semesterStartDate:data.settings.semesterStartDate,weekStartsOn:1,importedAt:new Date().toISOString(),periods:DEFAULT_PERIODS.map(p=>({...p})),sessions:[
    ['线性代数 A','北301',1,1,2],['大学物理 A1(I)','南201',1,3,4],['高等数学 B(I)','北301',1,5,6],
    ['习近平新时代中国特色社会主义思想概论','一教126',2,1,3],['大学生国家安全教育','北329',2,5,6],
    ['高等数学 B(I)','北301',3,3,4],['体育','综合训练馆',3,5,6],['大学物理实验 A1(I)','物理馆',3,7,8],
    ['大学物理 A1(I)','南201',4,1,2],['线性代数 A','北129',4,3,4],['高级语言程序设计 A2','南329',4,7,8],
    ['高等数学 B(I)','北301',5,3,4],['工科导论','南407',5,5,6],['社会实践','线上课堂',7,9,10],
  ].map((v,i)=>({id:`demo-course-${i}`,title:String(v[0]),location:String(v[1]),weekday:Number(v[2]),startPeriod:Number(v[3]),endPeriod:Number(v[4]),teacher:'示例教师',weeks:Array.from({length:16},(_,j)=>j+1).filter(w=>i!==5||w%2===0)}))}];
  data.profile.nickname = 'Muse';
  data.tasks = [{ id: 'demo-task', title: '整理本周学习笔记', description: '留一点时间，把知识连起来。', date: today, time: '16:00', duration: 45, kind: 'todo', repeat: null, subtasks: [], completedDates: [], color: '#B8BCE0', location: '图书馆' }];
  data.canvas = { ...data.canvas, connected: true, userId: '10001', lastSync: new Date().toISOString(), assignments: demoAssignments('canvas') };
  data.messages = [{ id: 'demo-plan', role: 'assistant', date: today, createdAt: new Date().toISOString(), content: '今天先完成紧急作业，再用 45 分钟整理学习笔记。为休息留一些空白。' }];
  return data;
}
