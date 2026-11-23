import React,{useState} from 'react';
import {Switch,View} from 'react-native';
import Text from './LocalizedText';

import {useStore} from '../state/store';
import {minutes,validTime} from '../core/calendar';
import {periodEnd,validateLessonPeriods} from '../core/lesson-periods';
import {Button,Field,Hint,Pill,Sheet} from './components';
import {useTheme} from './theme';
import {useSheetDismiss} from './useSheetDismiss';
export default function TimetableSettingsSheet({onClose,fitted=60}:{onClose:()=>void;fitted?:number}){
  const {closeRef,dismiss}=useSheetDismiss(onClose);
  const {data,updateSettings,saveTimetable}=useStore(),t=useTheme(),initial=data.timetables.find(v=>v.enabled)||data.timetables[0];
  const [auto,setAuto]=useState(data.settings.timetableRowHeight===null),[manual,setManual]=useState(String(Math.max(28,Math.round(data.settings.timetableRowHeight||fitted))));
  const [target,setTarget]=useState(initial?.id||''),[periods,setPeriods]=useState((initial?.periods||data.settings.lessonPeriods).map(p=>({...p}))),[duration,setDuration]=useState<Record<number,string>>({});
  const [times,setTimes]=useState(false),[error,setError]=useState('');
  const changeTarget=(id:string)=>{setTarget(id);setPeriods((data.timetables.find(v=>v.id===id)?.periods||data.settings.lessonPeriods).map(p=>({...p})));setDuration({});setError('');};
  const setStart=(number:number,start:string)=>setPeriods(old=>old.map(p=>{if(p.number!==number)return p;let end=p.end;try{end=periodEnd(start,Number(duration[number]??(minutes(p.end)-minutes(p.start))));}catch{}return {...p,start,end};}));
  const setEnd=(number:number,end:string)=>{setDuration(old=>{const next={...old};delete next[number];return next;});setPeriods(old=>old.map(p=>p.number===number?{...p,end}:p));};
  const setMinutes=(number:number,value:string)=>{setDuration(old=>({...old,[number]:value}));setPeriods(old=>old.map(p=>{if(p.number!==number)return p;try{return {...p,end:periodEnd(p.start,Number(value))};}catch{return p;}}));};
  const save=()=>{try{
    const n=Number(manual);if(!auto&&(!Number.isInteger(n)||n<28||n>180))throw new Error('行高请填写28–180。');
    for(const raw of Object.values(duration))if(!/^\d+$/.test(raw)||Number(raw)<1||Number(raw)>360)throw new Error('每节时长请填写1–360分钟。');
    const validated=validateLessonPeriods(periods);
    const table=target?data.timetables.find(v=>v.id===target):undefined;
    if(target&&!table)throw new Error('所选课表已不存在，请重新选择。');
    dismiss(()=>{if(table)saveTimetable({...table,periods:validated});updateSettings({timetableRowHeight:auto?null:n,...(!target?{lessonPeriods:validated}:{})});onClose();});
  }catch(e){setError(e instanceof Error?e.message:'设置未保存。');}};
  return <Sheet visible closeRef={closeRef} keyboardInput title="课程表设置" onClose={onClose} footer={<Button title="保存显示设置" onPress={save}/>}>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={{color:t.fg,flex:1}}>自动适应屏幕</Text><Switch accessibilityLabel="课表自动行高" value={auto} onValueChange={setAuto} trackColor={{false:t.line,true:t.accent}}/></View>
    <Hint>自动模式在有效空间内显示全部节次。手动加大行高后，可上下滚动查看。</Hint>
    {!auto&&<><Field label="每节课行高" value={manual} onChangeText={setManual} keyboardType="number-pad" maxLength={3}/><View style={{flexDirection:'row',gap:12}}><Button secondary title="减小行高" onPress={()=>setManual(String(Math.max(28,(Number(manual)||60)-8)))}/><Button secondary title="增大行高" onPress={()=>setManual(String(Math.min(180,(Number(manual)||60)+8)))}/></View></>}
    <Button secondary title={times?'收起节次时间':'设置节次时间与时长'} onPress={()=>setTimes(v=>!v)}/>
    {times&&<><Text style={{color:t.fg,fontWeight:'600'}}>修改哪份课表的时间</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}><Pill title="默认时间模板" selected={!target} onPress={()=>changeTarget('')}/>{data.timetables.map(v=><Pill key={v.id} title={v.name} selected={target===v.id} onPress={()=>changeTarget(v.id)}/>)}</View><Hint>{target?'调整所选课表的节次时间。已单独指定时间的课程继续使用自己的时间。':'默认模板用于今后新增或导入的课表，已有课表保留各自的时间。'}起始时间、结束时间和时长联动，时长单位为分钟。</Hint>
      {periods.map(p=><View key={p.number} style={{padding:12,borderWidth:1,borderColor:t.line,borderRadius:16,gap:12}}><Text style={{color:t.fg,fontWeight:'600'}}>第 {p.number} 节</Text><View style={{flexDirection:'row',gap:8}}><View style={{flex:1}}><Field label={`第${p.number}节开始时间`} value={p.start} onChangeText={v=>setStart(p.number,v)} placeholder="08:00" maxLength={5}/></View><View style={{flex:1}}><Field label={`第${p.number}节结束时间`} value={p.end} onChangeText={v=>setEnd(p.number,v)} placeholder="08:45" maxLength={5}/></View><View style={{flex:1}}><Field label={`第${p.number}节时长`} value={duration[p.number]??(validTime(p.start)&&validTime(p.end)?String(minutes(p.end)-minutes(p.start)):'')} onChangeText={v=>setMinutes(p.number,v)} keyboardType="number-pad" maxLength={3}/></View></View></View>)}
    </>}
    {!!error&&<Hint error>{error}</Hint>}
  </Sheet>;
}
