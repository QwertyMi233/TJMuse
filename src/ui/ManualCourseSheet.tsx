import React,{useState} from 'react';
import {Platform,Switch,View} from 'react-native';
import Text from './LocalizedText';

import {useStore} from '../state/store';
import {dateKey} from '../core/calendar';
import {uid,TASK_COLORS} from '../core/defaults';
import {appendManualCourse,manualCourseWeeks} from '../core/manual-course';
import {courseColor} from '../core/timetable-grid';
import {validateTimetable} from '../core/timetable';
import type {Timetable} from '../core/types';
import {Button,ConfirmSheet,Field,Hint,Pill,Sheet,Tap} from './components';
import {EditorFooter} from './EditorForm';
import DateField from './DateField';
import SemesterWeekField from './SemesterWeekField';
import {useTheme} from './theme';
import {useSheetDismiss} from './useSheetDismiss';
export default function ManualCourseSheet({onClose,onSaved,timetableId,sessionId,onDelete}:{onClose:()=>void;onSaved:()=>void;timetableId?:string;sessionId?:string;onDelete?:()=>void}){
  const {data,saveTimetable}=useStore(),t=useTheme();
  const {closeRef,dismiss}=useSheetDismiss(onClose);
  const existing=data.timetables.find(v=>v.id===timetableId)?.sessions.find(s=>s.id===sessionId),editing=!!existing;
  const [target,setTarget]=useState(timetableId||data.timetables.find(v=>v.enabled)?.id||''),[name,setName]=useState('手动课表');
  const [semester,setSemester]=useState(data.settings.semesterStartDate||dateKey(new Date()));
  const [title,setTitle]=useState(existing?.title||''),[location,setLocation]=useState(existing?.location||''),[teacher,setTeacher]=useState(existing?.teacher||'');
  const [weekday,setWeekday]=useState(existing?.weekday||1),[first,setFirst]=useState(String(existing?Math.min(...existing.weeks):1)),[last,setLast]=useState(String(existing?Math.max(...existing.weeks):16)),[parity,setParity]=useState<'all'|'odd'|'even'>('all');
  const [specificWeeks,setSpecificWeeks]=useState(existing?.weeks.join('、')||''),[color,setColor]=useState(existing?.color||courseColor(existing?.title||''));
  const [start,setStart]=useState(String(existing?.startPeriod||1)),[end,setEnd]=useState(String(existing?.endPeriod||2)),[custom,setCustom]=useState(!!existing?.startTime),[startTime,setStartTime]=useState(existing?.startTime||'08:00'),[endTime,setEndTime]=useState(existing?.endTime||'09:35');
  const [error,setError]=useState(''),[saved,setSaved]=useState(false),[confirmDelete,setConfirmDelete]=useState(false);
  const table=data.timetables.find(v=>v.id===target),periods=table?.periods||data.settings.lessonPeriods;
  const from=periods.find(p=>p.number===Number(start)),to=periods.find(p=>p.number===Number(end));
  const save=()=>{if(saved)return;try{
    if(target&&!table)throw new Error('所选课表已不存在，请重新选择。');
    const base:Timetable=table||{id:uid(),name:name.trim(),enabled:true,semesterStartDate:semester,weekStartsOn:data.settings.weekStartsOn,importedAt:new Date().toISOString(),periods:data.settings.lessonPeriods.map(p=>({...p})),sessions:[]};
    const weeks=specificWeeks.trim()?specificWeeks.split(/[,，、\s]+/).filter(Boolean).map(Number):manualCourseWeeks(Number(first),Number(last),parity);
    const draft={id:existing?.id||uid(),title:title.trim(),teacher:teacher.trim(),location:location.trim(),weekday,startPeriod:Number(start),endPeriod:Number(end),weeks:[...new Set(weeks)].sort((a,b)=>a-b),color,...(custom?{startTime,endTime}:{})};
    const next=editing?validateTimetable({...base,sessions:base.sessions.map(s=>s.id===existing.id?draft:s)}):appendManualCourse(base,draft);
    setSaved(true);dismiss(()=>{saveTimetable(next);onSaved();});
  }catch(e){setError(e instanceof Error?e.message:'课程未保存。');}};
  return <Sheet visible closeRef={closeRef} size="large" title={editing?'编辑课程':'手动添加课程'} onClose={onClose} footer={editing?<EditorFooter onSave={save} saveLabel="保存课程更改" deleteLabel="删除这条课程排课" onDelete={onDelete?()=>setConfirmDelete(true):undefined}/>:<Button title="保存手动课程" onPress={save} disabled={saved}/>}>
    {editing&&<Hint>修改这条排课的全部教学周，其他同名排课记录不变。</Hint>}
    <Field label="课程名称" value={title} onChangeText={setTitle} maxLength={150}/>
    <Field label="上课地点" value={location} onChangeText={setLocation} maxLength={200}/>
    <Field label="授课教师" value={teacher} onChangeText={setTeacher} maxLength={150}/>
    <Text style={{color:t.fg,fontWeight:'600'}}>添加到课表</Text>
    {!editing&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{data.timetables.map(v=><Pill key={v.id} title={v.name} selected={target===v.id} onPress={()=>{setTarget(v.id);setError('');}}/>)}<Pill title="新建课表" selected={!target} onPress={()=>setTarget('')}/></View>}
    {!target?<><Field label="新课表名称" value={name} onChangeText={setName} maxLength={60}/><SemesterWeekField value={semester} onChange={setSemester} weekStartsOn={data.settings.weekStartsOn}/></>:<Hint>{table?.name} · 学期第一周 {table?.semesterStartDate}{table?.enabled?'':' · 当前隐藏，保存后可在课表管理中勾选显示。'}</Hint>}
    <Text style={{color:t.fg,fontWeight:'600'}}>星期</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[1,2,3,4,5,6,7].map(d=><Pill key={d} title={`周${'一二三四五六日'[d-1]}`} selected={weekday===d} onPress={()=>setWeekday(d)}/>)}</View>
    <View style={{flexDirection:'row',gap:12}}><View style={{flex:1}}><Field label="开始教学周" value={first} onChangeText={v=>{setFirst(v);setSpecificWeeks('');}} keyboardType="number-pad" maxLength={2}/></View><View style={{flex:1}}><Field label="结束教学周" value={last} onChangeText={v=>{setLast(v);setSpecificWeeks('');}} keyboardType="number-pad" maxLength={2}/></View></View>
    <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>{([['每周','all'],['单周','odd'],['双周','even']] as const).map(([label,value])=><Pill key={value} title={label} selected={!specificWeeks&&parity===value} onPress={()=>{setParity(value);setSpecificWeeks('');}}/>)}</View>
    <Field label="指定教学周（可选，逗号分隔）" value={specificWeeks} onChangeText={setSpecificWeeks} placeholder="例如 1、3、5；留空使用上方范围"/>
    <Field label="课程颜色" value={color} onChangeText={setColor} autoCapitalize="characters" maxLength={7}/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{['#347BB8','#189596','#BC5275',...TASK_COLORS].map(c=><Tap key={c} label={`课程配色 ${c}`} onPress={()=>setColor(c)} style={{width:34,height:34,borderRadius:11,backgroundColor:c,borderWidth:color===c?3:1,borderColor:color===c?t.accent:t.line}}><View/></Tap>)}</View>
    <View style={{flexDirection:'row',gap:12}}><View style={{flex:1}}><Field label="开始节次" value={start} onChangeText={setStart} keyboardType="number-pad" maxLength={2}/></View><View style={{flex:1}}><Field label="结束节次" value={end} onChangeText={setEnd} keyboardType="number-pad" maxLength={2}/></View></View>
    <Hint>可选节次：{periods.map(p=>p.number).join('、')}。默认上课时间 {from?.start||'—'}–{to?.end||'—'}。</Hint>
    <View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={{flex:1,color:t.fg}}>自定义上课时间</Text><Switch accessibilityLabel="自定义上课时间" value={custom} onValueChange={v=>{if(v){setStartTime(from?.start||'08:00');setEndTime(to?.end||'09:35');}setCustom(v);}} trackColor={{false:t.line,true:t.accent}}/></View>
    {custom&&<><View style={{flexDirection:'row',gap:12}}>{Platform.OS==='web'?<><View style={{flex:1}}><Field label="课程开始时间" value={startTime} onChangeText={setStartTime} maxLength={5}/></View><View style={{flex:1}}><Field label="课程结束时间" value={endTime} onChangeText={setEndTime} maxLength={5}/></View></>:<><DateField mode="time" label="课程开始时间" value={startTime} onChange={setStartTime}/><DateField mode="time" label="课程结束时间" value={endTime} onChange={setEndTime}/></>}</View><Hint>节次决定周课表中的位置，自定义时间用于首页日程、AI规划和课程提醒。</Hint></>}
    {!!error&&<Hint error>{error}</Hint>}
    <ConfirmSheet visible={confirmDelete} title="删除这条课程排课？" description="这条排课的全部教学周都会移除，其他排课记录保留。" onClose={()=>setConfirmDelete(false)} onConfirm={()=>{try{dismiss(()=>onDelete?.());}catch(e){setError((e as Error).message);}}}/>
  </Sheet>;
}
