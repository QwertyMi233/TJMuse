import React,{useState} from 'react';
import {View} from 'react-native';
import Text from './LocalizedText';
import type {CanvasAssignment,TaskOccurrence} from '../core/types';
import {dateTime,validDate,validTime} from '../core/calendar';
import {proposeTemporaryActions} from '../core/temporary-actions';
import {assignmentPlatform,platformName} from '../core/platforms';
import {useStore} from '../state/store';
import {Button,ConfirmSheet,Field,Hint,Sheet,Tap,Icon} from './components';
import {EditorFooter,EditorSection,EditorTypeCard,useEditorRange} from './EditorForm';
import DateField from './DateField';
import {TASK_COLORS} from '../core/defaults';
import {useTheme} from './theme';
import {useSheetDismiss} from './useSheetDismiss';
export function TemporaryCourseEditor({task,onClose,onSaved,onDelete,deleteAll=false,children}:{task:TaskOccurrence;onClose:()=>void;onSaved?:()=>void;onDelete?:()=>void;deleteAll?:boolean;children?:React.ReactNode}){
 const {data,editCourseOccurrence}=useStore(),t=useTheme();
 const {closeRef,dismiss}=useSheetDismiss(onClose);
 const [title,setTitle]=useState(task.title),[description,setDescription]=useState(task.description),[location,setLocation]=useState(task.location),[color,setColor]=useState(task.color),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
 const range=useEditorRange(dateTime(task.date,task.time),dateTime(task.date,task.endTime));
 const save=()=>{try{
  if(range.endDate!==task.date||!Number.isSafeInteger(Number(range.duration))||Number(range.duration)<1)throw new Error('本次课程的结束时间需晚于开始时间，且在同一天。');
  const changes={title,description,location,time:range.startTime,endTime:range.endTime,color};proposeTemporaryActions(data,JSON.stringify({items:[{occurrence_id:task.id,date:task.date,changes,reset:false}]}),'course-local');dismiss(()=>{editCourseOccurrence(task.id,task.date,changes);(onSaved||onClose)();});
 }catch(e){setError((e as Error).message);}};
 return <Sheet visible closeRef={closeRef} size="large" title="编辑课程" subtitle="把课程调整到合适的节奏。" onClose={onClose} footer={<EditorFooter onSave={save} onDelete={onDelete?()=>setConfirm(true):undefined} deleteLabel={deleteAll?'删除这条课程排课':'删除本次课程'}/> }>
  <EditorTypeCard icon="school-outline" title="仅本次课程" subtitle={task.date}/>
  <Field label="课程名称" value={title} onChangeText={setTitle} maxLength={150}/>
  <EditorSection icon="time-outline" title="课程时间"><Field label="课程日期" value={task.date} editable={false}/><View style={{flexDirection:'row',gap:12}}><DateField mode="time" label="课程开始时间" value={range.startTime} onChange={range.changeStartTime}/><DateField mode="time" label="课程结束时间" value={range.endTime} onChange={v=>range.changeEnd(task.date,v)}/></View><Field label="时长 / 分钟" value={range.duration} onChangeText={range.changeDuration} keyboardType="number-pad" maxLength={4}/></EditorSection>
  <Field label="描述" value={description} onChangeText={setDescription} multiline maxLength={2000}/><Field label="上课地点" value={location} onChangeText={setLocation} maxLength={200}/>
  <EditorSection icon="color-palette-outline" title="课程颜色"><View style={{flexDirection:'row',flexWrap:'wrap',gap:10}}>{['#347BB8','#189596',...TASK_COLORS].map(c=><Tap key={c} label={`课程配色 ${c}`} onPress={()=>setColor(c)} style={{width:34,height:34,borderRadius:11,backgroundColor:c,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:color===c?t.accent:t.line}}>{color===c&&<Icon name="checkmark" color={t.fg} size={18}/>}</Tap>)}</View><Field label="课程颜色" value={color} onChangeText={setColor} maxLength={7}/></EditorSection>
  {children}<Hint>仅影响这一天的这一节课；其他周保留原排课，可随时恢复。</Hint>{!!error&&<Hint error>{error}</Hint>}
  <ConfirmSheet visible={confirm} title={deleteAll?'删除这条课程排课？':'删除本次课程？'} description={deleteAll?'这条排课的全部教学周都会移除，其他排课记录保留。':`仅移除 ${task.date} 这一次，其他教学周保留。`} onClose={()=>setConfirm(false)} onConfirm={()=>{try{dismiss(()=>onDelete?.());}catch(e){setError((e as Error).message);}}}/>
 </Sheet>;
}
export function TemporaryHomeworkEditor({assignment,onClose,onSaved,onDelete,children}:{assignment:CanvasAssignment;onClose:()=>void;onSaved?:()=>void;onDelete?:()=>void;children?:React.ReactNode}){
 const {data,editHomeworkLocal}=useStore(),t=useTheme();
 const {closeRef,dismiss}=useSheetDismiss(onClose);
 const initialStart=assignment.unlockAt?new Date(assignment.unlockAt):new Date(),initialEnd=assignment.dueAt?new Date(assignment.dueAt):new Date(initialStart.getTime()+30*60000);
 const [title,setTitle]=useState(assignment.title),[description,setDescription]=useState(assignment.description),[courseName,setCourseName]=useState(assignment.courseName),[hasStart,setHasStart]=useState(!!assignment.unlockAt),[hasDue,setHasDue]=useState(!!assignment.dueAt),[error,setError]=useState(''),[confirm,setConfirm]=useState(false);
 const range=useEditorRange(initialStart,initialEnd);
 const save=()=>{try{
  if(hasStart&&(!validDate(range.startDate)||!validTime(range.startTime))||hasDue&&(!validDate(range.endDate)||!validTime(range.endTime)))throw new Error('请选择有效的开始和结束日期、时间。');
  if(hasStart&&hasDue&&(!Number.isSafeInteger(Number(range.duration))||Number(range.duration)<1))throw new Error('结束日期和时间需要晚于开始日期和时间。');
  const changes={title,description,courseName,unlockAt:hasStart?dateTime(range.startDate,range.startTime).toISOString():null,dueAt:hasDue?dateTime(range.endDate,range.endTime).toISOString():null};proposeTemporaryActions(data,JSON.stringify({items:[{homework_id:assignment.id,changes,reset:false}]}),'homework-local');dismiss(()=>{editHomeworkLocal(assignment.id,changes);(onSaved||onClose)();});
 }catch(e){setError((e as Error).message);}};
 return <Sheet visible closeRef={closeRef} size="large" title="编辑作业" subtitle="把作业安排到合适的节奏。" onClose={onClose} footer={<EditorFooter onSave={save} onDelete={onDelete?()=>setConfirm(true):undefined} deleteLabel="删除作业"/>}>
  <EditorTypeCard icon="book-outline" title="本机临时安排" subtitle={platformName(assignmentPlatform(assignment))}/>
  <Field label="作业名称" value={title} onChangeText={setTitle} maxLength={200}/>
  <EditorSection icon="time-outline" title="作业时间">
   {hasStart&&<View style={{flexDirection:'row',gap:12}}><DateField mode="date" label="开始日期" value={range.startDate} onChange={range.changeStartDate}/><DateField mode="time" label="开始时间" value={range.startTime} onChange={range.changeStartTime}/></View>}
   <Tap label={hasStart?'清除本机开始时间':'设置本机开始时间'} onPress={()=>setHasStart(!hasStart)} style={{alignSelf:'flex-end',paddingVertical:4}}><Text style={{color:t.accent,fontSize:12}}>{hasStart?'清除本机开始时间':'设置本机开始时间'}</Text></Tap>
   {hasDue&&<View style={{flexDirection:'row',gap:12}}><DateField mode="date" label="结束日期" value={range.endDate} onChange={v=>range.changeEnd(v,range.endTime)}/><DateField mode="time" label="结束时间" value={range.endTime} onChange={v=>range.changeEnd(range.endDate,v)}/></View>}
   <Tap label={hasDue?'清除本机截止时间':'设置本机截止时间'} onPress={()=>setHasDue(!hasDue)} style={{alignSelf:'flex-end',paddingVertical:4}}><Text style={{color:t.accent,fontSize:12}}>{hasDue?'清除本机截止时间':'设置本机截止时间'}</Text></Tap>
   {hasStart&&hasDue&&<Field label="时长 / 分钟" value={range.duration} onChangeText={range.changeDuration} keyboardType="number-pad" maxLength={9}/>}<Hint>这里是本机的作业起止窗口，不代表连续占用时间。</Hint>
  </EditorSection>
  <Field label="描述" value={description} onChangeText={setDescription} multiline maxLength={10000}/><Field label="课程名称" value={courseName} onChangeText={setCourseName} maxLength={200}/>
  {children}<Hint>临时名称、说明和时间仅用于本机安排，学校平台的真实截止时间保留。同步后仍保留本机更改，可恢复平台原文。</Hint>{!!error&&<Hint error>{error}</Hint>}
  <ConfirmSheet visible={confirm} title="删除作业？" description="删除后移入“已经删除的作业”，保留 3 天，期间可恢复或手动清空；平台原始作业保留。" onClose={()=>setConfirm(false)} onConfirm={()=>{try{dismiss(()=>onDelete?.());}catch(e){setError((e as Error).message);}}}/>
 </Sheet>;
}
