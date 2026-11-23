import { EXTRACT_TIMETABLE_SCRIPT, HOVER_TIMETABLE_SCRIPT, READ_TIMETABLE_POPUP_SCRIPT } from './timetable-page-scripts';
export function timetableCaptureScript(nonce: string) {
  return `(async function(){
    const nonce=${JSON.stringify(nonce)};
    const trusted=()=>location.origin==='https://1.tongji.edu.cn'&&location.pathname==='/GraduateStudentTimeTable';
    const send=(data)=>window.ReactNativeWebView.postMessage(JSON.stringify({nonce,kind:'timetable',...data}));
    try {
      if(!trusted()){send({error:'请先完成登录，打开学生个人课表。'});return;}
      const payload=JSON.parse(${EXTRACT_TIMETABLE_SCRIPT});
      if(payload.error){send({error:payload.error});return;}
      if(!Array.isArray(payload.rows)||payload.rows.length>500){send({error:'课表数量异常，请确认只显示一份个人课表。'});return;}
      const popups=[],seen=new Set();
      for(const target of (payload.hoverTargets||[]).slice(0,150)){
        if(!trusted())return;
        if(!Number.isFinite(target.x)||!Number.isFinite(target.y)||!target.weekday||!target.startPeriod)continue;
        const key=[target.weekday,target.startPeriod,target.endPeriod].join(':');if(seen.has(key))continue;seen.add(key);
        const hovered=${HOVER_TIMETABLE_SCRIPT.replace('__X__','target.x').replace('__Y__','target.y')};if(!hovered)continue;
        await new Promise(resolve=>setTimeout(resolve,220));
        const popup=JSON.parse(${READ_TIMETABLE_POPUP_SCRIPT});
        if(popup.found&&typeof popup.text==='string'&&popup.text.length<=30000)popups.push({text:popup.text,weekday:target.weekday,startPeriod:target.startPeriod,endPeriod:target.endPeriod});
      }
      if(!trusted())return;
      const capture={rows:payload.rows,popups};
      if(JSON.stringify(capture).length>700000){send({error:'课表数据过多，请缩小页面显示范围后重试。'});return;}
      send({capture});
    }catch(_){send({error:'课表读取未完成，请等待页面完整显示后重试。'});}
  })();true;`;
}
