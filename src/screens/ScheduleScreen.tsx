import React,{useMemo,useState} from 'react';
import {Platform,ScrollView,View} from 'react-native';
import Text from '../ui/LocalizedText';

import {SafeAreaView} from 'react-native-safe-area-context';
import {useStore} from '../state/store';
import {isDark,useTheme} from '../ui/theme';
import {Fab,Hint,IconButton,Tap} from '../ui/components';
import TimetableManager from '../ui/TimetableManager';
import CourseDetailSheet from '../ui/CourseDetailSheet';
import TimetableSettingsSheet from '../ui/TimetableSettingsSheet';
import WeekPager from '../ui/WeekPager';
import {addDays,dateKey,parseDate,semesterWeek,weekDates} from '../core/calendar';
import {DEFAULT_PERIODS} from '../core/timetable';
import {timetableGrid} from '../core/timetable-grid';
import type {TaskOccurrence} from '../core/types';

export default function ScheduleScreen(){
  const {data}=useStore(),t=useTheme();
  const [selected,setSelected]=useState(()=>dateKey(new Date())),[manage,setManage]=useState(false),[course,setCourse]=useState<TaskOccurrence|null>(null),[viewport,setViewport]=useState(0);
  const [display,setDisplay]=useState(false);
  const days=weekDates(parseDate(selected),data.settings.weekStartsOn),today=dateKey(new Date()),primary=data.timetables.find(v=>v.enabled);
  const maxPeriod=Math.max(11,...data.settings.lessonPeriods.map(p=>p.number),...data.timetables.filter(v=>v.enabled).flatMap(v=>v.periods.map(p=>p.number)));
  const periods=Array.from({length:maxPeriod},(_,i)=>primary?.periods.find(p=>p.number===i+1)||data.settings.lessonPeriods.find(p=>p.number===i+1)||DEFAULT_PERIODS[i]||{number:i+1,start:'',end:''});
  const fitted=Math.max(1,(viewport-64)/periods.length),rowHeight=data.settings.timetableRowHeight||fitted;
  const week=semesterWeek(parseDate(selected),primary?.semesterStartDate||data.settings.semesterStartDate,primary?.weekStartsOn??data.settings.weekStartsOn);
  const shift=(n:number)=>setSelected(dateKey(addDays(parseDate(selected),n*7)));
  const openDisplay=()=>setDisplay(true);
  return <SafeAreaView testID="schedule-grid" edges={['top','left','right']} style={{flex:1,backgroundColor:t.bg}}>
    <View style={{paddingHorizontal:16,paddingTop:16,paddingBottom:14,gap:8}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:2}}><View style={{flex:1,gap:6}}><Text style={{fontSize:22,fontWeight:'700',color:t.fg}}>{week?`第 ${week} 周`:'学期未开始'} · 周{'日一二三四五六'[parseDate(selected).getDay()]}</Text><Text style={{color:t.muted,fontSize:11}}>{days[0]!.getFullYear()} / {days[0]!.getMonth()+1} / {days[0]!.getDate()} — {days[6]!.getMonth()+1} / {days[6]!.getDate()}</Text></View><IconButton icon="chevron-back" label="课表上一周" onPress={()=>shift(-1)}/><IconButton icon="chevron-forward" label="课表下一周" onPress={()=>shift(1)}/><Tap label="课表回到本周" onPress={()=>setSelected(today)} style={{padding:10,borderRadius:14,backgroundColor:t.soft}}><Text style={{color:t.accent,fontWeight:'600'}}>今</Text></Tap><IconButton icon="options-outline" label="课程表显示设置" onPress={openDisplay}/></View>
      {!data.timetables.length&&<Hint>点击右下角加号导入课表或手动添加课程，日期栏和课程网格均可左右切周。</Hint>}
    </View>
    <View onLayout={e=>setViewport(old=>Math.abs(old-e.nativeEvent.layout.height)<1?old:e.nativeEvent.layout.height)} style={{flex:1,marginBottom:Platform.OS==='android'?82:155}}>
      {viewport>0&&<WeekPager selected={selected} startsOn={data.settings.weekStartsOn} onSelect={setSelected} renderPage={(anchor,width)=><ScheduleWeek anchor={anchor} selected={selected} today={today} width={width} rowHeight={rowHeight} periods={periods} onSelect={setSelected} onCourse={setCourse}/>}/>} 
    </View>
    <View style={{position:'absolute',right:24,bottom:Platform.OS==='android'?22:105}}><Fab label="添加或管理课表" onPress={()=>setManage(true)}/></View>
    {manage&&<TimetableManager onClose={()=>setManage(false)}/>}{course&&<CourseDetailSheet task={course} onClose={()=>setCourse(null)}/>}
    {display&&<TimetableSettingsSheet fitted={fitted} onClose={()=>setDisplay(false)}/>}
  </SafeAreaView>;
}
function ScheduleWeek({anchor,selected,today,width,rowHeight,periods,onSelect,onCourse}:{anchor:string;selected:string;today:string;width:number;rowHeight:number;periods:typeof DEFAULT_PERIODS;onSelect:(date:string)=>void;onCourse:(task:TaskOccurrence)=>void}){
  const {data}=useStore(),t=useTheme(),days=weekDates(parseDate(anchor),data.settings.weekStartsOn);
  const lessons=useMemo(()=>timetableGrid(data.timetables,anchor,data.settings.weekStartsOn,data.courseOverrides),[data.timetables,anchor,data.settings.weekStartsOn,data.courseOverrides]);
  return <View style={{flex:1,width}}>
    <View testID={`schedule-dates-${anchor}`} style={{height:64,flexDirection:'row',paddingHorizontal:8,paddingTop:2,paddingBottom:10,borderBottomWidth:1,borderColor:t.line}}><View style={{width:36,justifyContent:'center'}}><Text style={{color:t.fg,fontSize:12,fontWeight:'600'}}>{days[0]!.getMonth()+1}月</Text></View>{days.map(day=>{const key=dateKey(day),active=key===today;return <Tap key={key} label={`课表日期 ${key}`} onPress={()=>onSelect(key)} style={{flex:1,alignItems:'center',gap:6}}><Text style={{color:active?t.accent:t.muted,fontSize:12}}>{'日一二三四五六'[day.getDay()]}</Text><Text style={{color:active?t.onAccent:t.fg,backgroundColor:active?t.accent:key===selected?t.soft:'transparent',borderRadius:8,paddingVertical:4,paddingHorizontal:7,fontWeight:'600',fontSize:15}}>{day.getDate()}</Text></Tap>;})}</View>
    <ScrollView testID={`schedule-body-${anchor}`} style={{flex:1}} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" contentContainerStyle={{paddingHorizontal:8}}>
      <View testID={`schedule-rows-${anchor}`} style={{flexDirection:'row',height:rowHeight*periods.length}}>
        <View style={{width:36}}>{periods.map(p=><View key={p.number} style={{height:rowHeight,justifyContent:'center',gap:1}}><Text style={{color:t.fg,fontSize:rowHeight<40?12:15,fontWeight:'600'}}>{p.number}</Text><Text style={{color:t.muted,fontSize:rowHeight<32?6:8,lineHeight:rowHeight<32?7:10}}>{p.start}{'\n'}{p.end}</Text></View>)}</View>
        <View style={{flex:1,height:rowHeight*periods.length}}>
          {periods.map(p=><View key={p.number} style={{position:'absolute',left:0,right:0,top:(p.number-1)*rowHeight,height:rowHeight,borderTopWidth:1,borderColor:t.line+'70'}}/>)}
          {lessons.map(lesson=>{const active=data.courseExceptions?.[lesson.task.id]!==false,color=lesson.color,fg=isDark(color)?'#FFFFFF':'#123B64',height=(lesson.end-lesson.start)*rowHeight-4;return <Tap key={lesson.task.id} label={`课程 ${lesson.task.title} ${lesson.task.date} ${lesson.task.time}`} onPress={()=>onCourse(lesson.task)} style={{position:'absolute',left:`${(lesson.weekday+lesson.lane/lesson.lanes)/7*100}%`,width:`${100/7/lesson.lanes}%`,top:lesson.start*rowHeight+2,height,paddingHorizontal:2,opacity:active?1:.25}}><View testID={`course-color-${lesson.task.courseSessionId}`} style={{flex:1,borderRadius:8,paddingHorizontal:2,paddingVertical:5,alignItems:'center',justifyContent:'center',gap:3,backgroundColor:color,borderWidth:1,borderColor:t.dark?'#FFFFFF33':'#FFFFFFA6',boxShadow:t.dark?`0px 0px 8px ${color}66`:'0px 1px 3px #123B6414',overflow:'hidden'}}><Text translate={false} numberOfLines={Math.max(1,Math.floor((height-(lesson.parity&&height>70?29:12))/15))} style={{color:fg,fontSize:width<360?10:11,fontWeight:'600',lineHeight:15,textAlign:'center'}}>{lesson.task.title}{lesson.task.location?`\n@${lesson.task.location}`:''}</Text>{!!lesson.parity&&height>70&&<Text style={{color:fg,fontSize:8,backgroundColor:'#FFFFFF26',borderRadius:4,paddingHorizontal:3}}>{lesson.parity}</Text>}</View></Tap>;})}
        </View>
        {!lessons.length&&<View pointerEvents="none" style={{position:'absolute',left:44,right:0,top:20}}><Hint>{data.timetables.length?'本周没有已显示的课程，可切换周次或管理课表。':'导入后将在这里显示课程。'}</Hint></View>}
      </View>
    </ScrollView>
  </View>;
}
