import React,{useRef,useState} from 'react';
import {View} from 'react-native';
import Text from './LocalizedText';
import type {TaskOccurrence} from '../core/types';
import {dateTime,tasksOn} from '../core/calendar';
import {courseTasksOn} from '../core/timetable';
import {courseOccurrenceKey} from '../core/local-overrides';
import {TemporaryCourseEditor} from './TemporaryEditors';
import {courseRecordId} from '../core/course-record-actions';
import {useStore} from '../state/store';
import {Button,Checkbox,Hint,IconButton,Sheet} from './components';
import ManualCourseSheet from './ManualCourseSheet';
import TaskEditor from './TaskEditor';
import {useTheme} from './theme';
export default function CourseDetailSheet({task,onClose,initialEditing=false}:{task:TaskOccurrence;onClose:()=>void;initialEditing?:boolean}){
 const {data,setCourseActive,deleteCourseRecord,editCourseOccurrence}=useStore(),t=useTheme();
 const date=task.occurrenceDate;
 task=tasksOn(courseTasksOn(data,date),date).find(v=>v.id===task.id)||task;
 const table=data.timetables.find(v=>v.id===task.timetableId),session=table?.sessions.find(s=>s.id===task.courseSessionId),legacy=data.tasks.find(v=>v.id===task.id&&v.kind==='course'),key=courseOccurrenceKey(task,date);
 const future=dateTime(date,task.time)>new Date();
 const [editing,setEditing]=useState(initialEditing&&!future),[error,setError]=useState('');
 const [temporary,setTemporary]=useState(initialEditing&&future);
 const editAfterClose=useRef(false);
 const id=courseRecordId(table?.id,session?.id,task.id),editable=!!session||!!legacy;
 const activation=future&&editable?<View style={{flexDirection:'row',alignItems:'center',gap:10}}><Checkbox checked={data.courseExceptions?.[key]!==false} label="启用本次课程" onPress={()=>{try{setCourseActive(task.id,date,data.courseExceptions?.[key]===false);}catch(e){setError((e as Error).message);}}}/><View style={{flex:1}}><Text style={{color:t.fg}}>启用本次课程</Text><Hint>仅影响这一天，其他周保持不变。</Hint></View></View>:null;
 if(temporary)return <TemporaryCourseEditor task={{...task,date}} onClose={onClose} onSaved={onClose} deleteAll={!session} onDelete={()=>{deleteCourseRecord(id,session?date:undefined);onClose();}}>{activation}{!!data.courseOverrides?.[key]&&<Button dismiss title="恢复本次原始安排" secondary onPress={()=>{try{editCourseOccurrence(task.id,date,null);onClose();}catch(e){setError((e as Error).message);}}}/>}<Button dismiss title="编辑全部教学周" secondary onPress={()=>{setTemporary(false);setEditing(true);}}/>{!!error&&<Hint error>{error}</Hint>}</TemporaryCourseEditor>;
 if(editing)return session?<ManualCourseSheet timetableId={table!.id} sessionId={session.id} onClose={onClose} onSaved={onClose} onDelete={()=>{deleteCourseRecord(id);onClose();}}/>:legacy?<TaskEditor task={legacy} date={task.date} onClose={onClose}/>:null;
 return <Sheet visible title={task.title} subtitle={table?.name||'课程详情'} onClose={()=>{if(editAfterClose.current){editAfterClose.current=false;future?setTemporary(true):setEditing(true);}else onClose();}} headerAction={editable?close=><IconButton icon="ellipsis-horizontal" label="编辑课程" onPress={()=>{editAfterClose.current=true;close();}} color={t.muted}/>:undefined}>
  <View style={{gap:10}}><Text style={{color:t.fg}}>{date} · {task.time}–{task.endTime}</Text><Text translate={false} style={{color:t.fg}}>地点：{task.location||'未标注'}</Text><Text style={{color:t.fg}}>教师：{session?.teacher||'未标注'}</Text><Hint>{task.description}</Hint></View>
  {!!error&&<Hint error>{error}</Hint>}
 </Sheet>;
}
