export { timetableCaptureScript } from './timetable-capture-script';
import { Platform } from 'react-native';
import { runOfficialSession, WebSessionError } from './web-session';
import { DEMO_MODE, demoDelay } from './demo-mode';
import { parseTimetableCapture, type TimetableCapture } from '../core/timetable';
export const TONGJI_TIMETABLE_URL = 'https://1.tongji.edu.cn/GraduateStudentTimeTable';
export const TIMETABLE_DESKTOP_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
export async function captureTongjiTimetable() {
  let capture: TimetableCapture;
  if (DEMO_MODE) {
    await demoDelay(); const weekday=new Date().getDay()||7;
    capture={rows:[
      {text:'示例教师(10001) 线性代数(DEMO101) [1-16] 教学楼 101',weekday,startPeriod:1,endPeriod:2},
      {text:'示例教师(10002) 大学物理(DEMO102) [1-16单] 教学楼 203',weekday,startPeriod:5,endPeriod:6},
      {text:'示例教师(10003) 学术英语(DEMO103) [2,4,6,8,10,12,14,16] 语言中心 305',weekday:weekday===7?1:weekday+1,startPeriod:3,endPeriod:4},
    ],popups:[]};
  } else {
    if(Platform.OS==='web')throw new WebSessionError('unavailable');
    const result=await runOfficialSession({kind:'timetable'});
    if(!result.timetable)throw new Error('未获取到课表数据。');capture=result.timetable;
  }
  return parseTimetableCapture(capture);
}
