import React, { useState } from 'react';
import {View} from 'react-native';
import Text from './LocalizedText';

import { useStore } from '../state/store';
import { useTheme } from './theme';
import type { Timetable } from '../core/types';
import { DEFAULT_PERIODS,validateTimetable } from '../core/timetable';
import { captureTongjiTimetable } from '../services/timetable';
import { DEMO_MODE } from '../services/demo-mode';
import { dateKey } from '../core/calendar';
import { uid } from '../core/defaults';
import { Button, Checkbox, Field, Hint, IconButton, Pill, Sheet, Tap } from './components';
import SemesterWeekField from './SemesterWeekField';
import ManualCourseSheet from './ManualCourseSheet';
import {useSheetDismiss} from './useSheetDismiss';
import {WebSessionError} from '../services/web-session';

export default function TimetableManager({ onClose }: { onClose: () => void }) {
  const {closeRef,dismiss}=useSheetDismiss(onClose);
  const { data, saveTimetable, toggleTimetable, deleteTimetable }=useStore(), t=useTheme();
  const [panel,setPanel]=useState<'manage'|'preview'|'delete'|'manual'|null>('manage'),[draft,setDraft]=useState<Timetable|null>(null),[remove,setRemove]=useState<Timetable|null>(null);
  const [warnings,setWarnings]=useState<string[]>([]),[excluded,setExcluded]=useState<string[]>([]),[periodsOpen,setPeriodsOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const read=async()=>{
    setBusy(true);setError('');setPanel(null);
    try {
      await new Promise(resolve=>setTimeout(resolve,350));
      const parsed=await captureTongjiTimetable();
      await new Promise(resolve=>setTimeout(resolve,350));
      const configured=data.settings.lessonPeriods,lastPeriod=Math.max(configured.length,...parsed.sessions.map(s=>s.endPeriod));
      const periods=Array.from({length:lastPeriod},(_,i)=>configured.find(p=>p.number===i+1)?{...configured.find(p=>p.number===i+1)!}:{number:i+1,start:'',end:''});
      setDraft({id:uid(),name:`同济课表 ${data.timetables.length+1}`,enabled:true,semesterStartDate:data.settings.semesterStartDate||dateKey(new Date()),weekStartsOn:data.settings.weekStartsOn,importedAt:new Date().toISOString(),sessions:parsed.sessions,periods});
      setWarnings(parsed.warnings);setExcluded([]);setPeriodsOpen(lastPeriod>DEFAULT_PERIODS.length);setPanel('preview');
    } catch(e) {if(e instanceof WebSessionError&&e.code==='cancelled')onClose();else{setError(e instanceof Error?e.message:'课表读取失败，已有课表保留。');setPanel('manage');}}
    finally {setBusy(false);}
  };
  const save=()=>{
    if(!draft)return;
    try{const next=validateTimetable({...draft,name:draft.name.trim(),sessions:draft.sessions.filter(s=>!excluded.includes(s.id))});dismiss(()=>{saveTimetable(next);onClose();});}
    catch(e){setError(e instanceof Error?e.message:'无法保存课表。');}
  };
  if(panel===null)return null;
  if(panel==='manual')return <ManualCourseSheet onClose={onClose} onSaved={onClose}/>;
  if(panel==='delete')return <Sheet key="delete" visible title="删除这份课表？" onClose={onClose} footer={<Button dismiss title="确认删除课表" onPress={()=>{if(remove)deleteTimetable(remove.id);setRemove(null);onClose();}} />}><Hint>将删除“{remove?.name}”及其课程安排，其他课表、作业和 To-do 保留。</Hint></Sheet>;
  if(panel==='preview'&&draft)return <Sheet key="preview" visible closeRef={closeRef} title="核对课表" onClose={onClose} footer={<Button title="保存这份课表" onPress={save} />}>
    <Field label="课表名称" value={draft.name} onChangeText={name=>setDraft({...draft,name})} maxLength={60} />
    <Hint>{DEMO_MODE?'当前为示例课表，不读取学校真实数据。':'已读取当前网页的个人课表，请核对识别结果。'}保存后课程同时显示在周课表与首页，隐藏课表时两处同步隐藏。</Hint>
    <SemesterWeekField value={draft.semesterStartDate} onChange={semesterStartDate=>setDraft({...draft,semesterStartDate})} weekStartsOn={draft.weekStartsOn} hint="这份课表独立保存学期第一周，其他课表与首页教学周设置不受影响。" />
    <View style={{flexDirection:'row',gap:8}}>{([['周一',1],['周日',0]] as const).map(([name,value])=><Pill key={name} title={`每周从${name}开始`} selected={draft.weekStartsOn===value} onPress={()=>setDraft({...draft,weekStartsOn:value})} />)}</View>
    <Button title={periodsOpen?'收起节次时间':'核对节次时间'} secondary onPress={()=>setPeriodsOpen(v=>!v)} />
    {periodsOpen&&<View style={{gap:12}}><Hint>默认时间参照同济课表项目；请按学校当前安排核对。每份课表可独立修改。</Hint>{draft.periods.map((p,index)=><View key={p.number} style={{flexDirection:'row',alignItems:'center',gap:8}}><Text style={{color:t.fg,width:44}}>第{p.number}节</Text><View style={{flex:1}}><Field label={`第${p.number}节开始`} value={p.start} onChangeText={start=>setDraft({...draft,periods:draft.periods.map((v,i)=>i===index?{...v,start}:v)})} maxLength={5} /></View><View style={{flex:1}}><Field label={`第${p.number}节结束`} value={p.end} onChangeText={end=>setDraft({...draft,periods:draft.periods.map((v,i)=>i===index?{...v,end}:v)})} maxLength={5} /></View></View>)}</View>}
    <Text style={{color:t.fg,fontWeight:'600'}}>保留 {draft.sessions.length-excluded.length} 条排课</Text>
    {draft.sessions.map(s=><View key={s.id} style={{flexDirection:'row',alignItems:'center',gap:8,borderWidth:1,borderColor:t.line,borderRadius:17,padding:10}}><Checkbox checked={!excluded.includes(s.id)} label={`导入课程 ${s.title}`} onPress={()=>setExcluded(v=>v.includes(s.id)?v.filter(id=>id!==s.id):[...v,s.id])} /><View style={{flex:1,gap:5}}><Text translate={false} style={{color:t.fg,fontWeight:'600'}}>{s.title}</Text><Text style={{color:t.muted,fontSize:11}}>周{'一二三四五六日'[s.weekday-1]} · {s.startPeriod}–{s.endPeriod}节 · 第{s.weeks.join('、')}周</Text><Text translate={false} style={{color:t.muted,fontSize:11}}>{s.teacher} · {s.location}</Text></View></View>)}
    {!!warnings.length&&<Hint error>{warnings.length} 条记录未能可靠识别，已跳过：{warnings.slice(0,5).join('；')}</Hint>}
    {!!error&&<Hint error>{error}</Hint>}
  </Sheet>;
  return <Sheet key="manage" visible title="课表管理" onClose={onClose}>
    <Hint>可以保存多份课表，勾选需要显示的课表。显隐同时作用于周课表和首页 To-do。</Hint>
    <Button dismiss title="从同济1系统导入" icon="download-outline" busy={busy} onPress={()=>{void read();}} />
    <Button dismiss title="手动添加课程" icon="add-outline" secondary onPress={()=>setPanel('manual')}/>
    {!data.timetables.length&&<Hint>还没有导入课表。</Hint>}
    {data.timetables.map(table=><View key={table.id} style={{borderWidth:1,borderColor:t.line,borderRadius:19,padding:12,flexDirection:'row',gap:8,alignItems:'center'}}><Checkbox checked={table.enabled} label={`显示课表 ${table.name}`} onPress={()=>toggleTimetable(table.id)} /><Tap dismiss label={`编辑课表 ${table.name}`} onPress={()=>{setDraft({...table,periods:table.periods.map(p=>({...p})),sessions:table.sessions.map(s=>({...s,weeks:[...s.weeks]}))});setWarnings([]);setExcluded([]);setPeriodsOpen(false);setError('');setPanel('preview');}} style={{flex:1,gap:5}}><Text translate={false} style={{color:t.fg,fontWeight:'600'}}>{table.name}</Text><Text style={{color:t.muted,fontSize:11}}>{table.sessions.length} 条排课 · {table.enabled?'显示中':'已隐藏'}</Text></Tap><IconButton dismiss icon="trash-outline" label={`删除课表 ${table.name}`} onPress={()=>{setRemove(table);setPanel('delete');}} color={t.muted} /></View>)}
    {!!error&&<Hint error>{error}</Hint>}
  </Sheet>;
}
