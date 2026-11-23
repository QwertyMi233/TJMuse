import { homeAgenda, homeGroups, CATEGORY_NAMES } from '../core/home-layout';
import CourseDetailSheet from '../ui/CourseDetailSheet';
import { allHomework } from '../core/platforms';
import React, { useEffect, useState } from 'react';
import {AppState,Platform,ScrollView,View} from 'react-native';
import Text from '../ui/LocalizedText';

import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {useSharedValue} from 'react-native-reanimated';
import { useStore } from '../state/store';
import { useTheme } from '../ui/theme';
import { addDays, dateKey, dateLabel, semesterWeek, parseDate,weekStart } from '../core/calendar';
import AssignmentSheet from '../ui/AssignmentSheet';
import type { CanvasAssignment, Task, TaskOccurrence } from '../core/types';
import { Button, Fab, Hint, Icon, IconButton, Sheet, Tap } from '../ui/components';
import DateField from '../ui/DateField';
import TaskEditor from '../ui/TaskEditor';
import TaskCard from '../ui/TaskCard';
import WeekStrip from '../ui/WeekStrip';
import WeekPager from '../ui/WeekPager';
import BrandLogo from '../ui/BrandLogo';

export default function TodoScreen() {
  const { data, getHoliday, updateSettings } = useStore(), t = useTheme();
  const [now,setNow]=useState(()=>new Date()),[unfinishedCollapsed,setUnfinishedCollapsed]=useState(false);
  const [course,setCourse]=useState<TaskOccurrence|null>(null);
  const [assignment, setAssignment] = useState<CanvasAssignment | null>(null);
  const [courseEditing,setCourseEditing]=useState(false),[assignmentEditing,setAssignmentEditing]=useState(false);
  const [today, setToday] = useState(dateKey(new Date())), [selected, setSelected] = useState(today), [editor, setEditor] = useState<Task | 'new' | null>(null), [jump, setJump] = useState(false), [jumpDate, setJumpDate] = useState(selected);
  const [visibleWeek,setVisibleWeek]=useState(selected),previewDate=useSharedValue(selected);
  const previewWeek=(day:string)=>setVisibleWeek(current=>dateKey(weekStart(parseDate(current),data.settings.weekStartsOn))===dateKey(weekStart(parseDate(day),data.settings.weekStartsOn))?current:day);
  const chooseDay=(day:string)=>{previewDate.value=day;setSelected(day);setVisibleWeek(day);};
  useEffect(() => { const timer = setInterval(() => {setToday(dateKey(new Date()));setNow(new Date());}, 15000); const sub=AppState.addEventListener('change',s=>{if(s==='active'){setToday(dateKey(new Date()));setNow(new Date());}});return () => {clearInterval(timer);sub.remove();}; }, []);
  const date = parseDate(selected), currentAgenda=homeAgenda(data,selected,now), allTasks = currentAgenda.pending;
  const tasks = allTasks;
  const openTask=(task:TaskOccurrence,edit:boolean)=>{
    if(task.kind==='course'){setCourseEditing(edit);setCourse(task);}
    else if(task.homeworkId){setAssignmentEditing(edit);setAssignment(allHomework(data).find(a=>a.id===task.homeworkId)||null);}
    else setEditor(task);
  };
  const holiday = getHoliday(selected), yearKnown = !!data.holidays[date.getFullYear()] || date.getFullYear() === 2026;
  const latestPlan = [...data.messages].reverse().find(m => m.date === today && m.role === 'assistant');
  const teachingWeek = semesterWeek(date, data.settings.semesterStartDate, data.settings.weekStartsOn);
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.bg }}>
    <View style={{ flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingTop: 15 }}>
      <View style={{ paddingHorizontal: 24, gap: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}><BrandLogo size={20}/><Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 2, color: t.accent }}>TJMUSE</Text></View><Text style={{ color: t.muted, fontSize: 10, letterSpacing: .8 }}>A LITTLE SPACE FOR YOUR DAY</Text></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Tap label="选择日程日期" onPress={() => { setJumpDate(selected); setJump(true); }} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, flex: 1, flexWrap: 'wrap' }}><Text style={{ fontSize: 34, fontWeight: '800', letterSpacing: -1.8, color: t.fg }}>{date.toLocaleString('en-US', { month: 'long' }).toUpperCase()}</Text><Text style={{ fontSize: 11, color: t.muted }}>{teachingWeek ? `第 ${teachingWeek} 周` : '学期未开始'}</Text></Tap>
          <Tap label="跳转到今天" onPress={() => chooseDay(today)} style={{ minWidth: 44, minHeight: 44, paddingHorizontal: 12, flexShrink: 0, borderRadius: 14, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}><Text numberOfLines={1} style={{ color: t.accent, fontWeight: '600', fontSize: 15 }}>今</Text></Tap>
        </View>
      </View>
      <WeekStrip previewDate={previewDate} selected={selected} today={today} onSelect={chooseDay} visibleWeek={visibleWeek} onWeekChange={setVisibleWeek} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24, paddingRight: 14, marginTop: 12, marginBottom: 8 }}>
        <View style={{ gap: 4 }}><Text style={{ fontSize: 15, fontWeight: '600', color: t.fg }}>{selected === today ? '今天，慢慢来' : dateLabel(selected)}</Text><Text style={{ fontSize: 10, color: t.muted }}>{date.getFullYear()} · {tasks.length+currentAgenda.overdue.length} 件事{!tasks.length&&!currentAgenda.overdue.length?'，留一点时间给自己':''}{holiday ? ` · ${holiday.name}${holiday.isOffDay ? '休息' : '补班'}` : ''}</Text></View>
        <View style={{ flexDirection: 'row' }}><IconButton icon="chevron-back" label="上一周" onPress={() => setVisibleWeek(dateKey(addDays(parseDate(visibleWeek), -7)))} color={t.muted} style={{ width: 32 }} /><IconButton icon="chevron-forward" label="下一周" onPress={() => setVisibleWeek(dateKey(addDays(parseDate(visibleWeek), 7)))} color={t.muted} style={{ width: 32 }} /></View>
      </View>
      <WeekPager selected={selected} startsOn={data.settings.weekStartsOn} step={1} previewDate={previewDate} onPreviewDate={previewWeek} onSelect={chooseDay} renderPage={(selected,width)=>{
        const agenda=homeAgenda(data,selected,now),allTasks=agenda.pending,tasks=allTasks;
        const renderTask=(task:TaskOccurrence)=><TaskCard key={`${task.id}:${task.occurrenceDate}`} task={task} date={selected} onOpen={()=>openTask(task,false)} onEdit={()=>openTask(task,true)}/>;
        const completedSection=(category:'todo'|'course'|'homework',items:TaskOccurrence[])=>{
          if(!items.length)return null;
          const collapsed=data.settings.collapsedCompleted[category],name=CATEGORY_NAMES[category];
          return <View key={category} testID={`completed-${category}`} style={{gap:9}}><Tap label={`${collapsed?'展开':'折叠'}已完成${name}（${items.length}）`} onPress={()=>updateSettings({collapsedCompleted:{...data.settings.collapsedCompleted,[category]:!collapsed}})} style={{padding:12,borderRadius:16,backgroundColor:t.soft,flexDirection:'row',justifyContent:'space-between'}}><Text style={{color:t.accent,fontSize:12}}>已完成 · {name} · {items.length}</Text><Icon name={collapsed?'chevron-down':'chevron-up'} size={15} color={t.accent}/></Tap>{!collapsed&&items.map(renderTask)}</View>;
        };
        return <View testID={`day-content-${selected}`} style={{width,flex:1}}>
      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 6, paddingBottom: Platform.OS === 'android' ? 100 : 190, gap: 9 }}>
        {data.settings.homeLayout==='timeline'?<>{tasks.map(renderTask)}{homeGroups(agenda.completed,selected,data.settings.homeCategoryOrder).map(group=>completedSection(group.category,group.completed))}</>:homeGroups([...tasks,...agenda.completed],selected,data.settings.homeCategoryOrder).map(group=>{
          if(!group.items.length)return null;
          const name=CATEGORY_NAMES[group.category],collapsed=data.settings.collapsedCategories[group.category];
          return <View key={group.category} testID={`category-${group.category}`} style={{gap:9,marginBottom:12}}>
            <Tap label={`${collapsed?'展开':'折叠'}${name}分类`} onPress={()=>updateSettings({collapsedCategories:{...data.settings.collapsedCategories,[group.category]:!collapsed}})} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:12,paddingHorizontal:6}}><Text style={{color:t.fg,fontSize:16,fontWeight:'700'}}>{name} · {group.items.length}</Text><Icon name={collapsed?'chevron-down':'chevron-up'} color={t.muted} size={17} /></Tap>
            {!collapsed&&<>{group.pending.map(renderTask)}{completedSection(group.category,group.completed)}</>}
          </View>;
        }).filter(Boolean)}
        {!!agenda.overdue.length&&<View testID="category-unfinished" style={{gap:9,marginBottom:12}}><Tap label="未完成" onPress={()=>setUnfinishedCollapsed(v=>!v)} style={{paddingVertical:14,flexDirection:'row',justifyContent:'space-between'}}><Text style={{color:t.fg,fontSize:16,fontWeight:'700'}}>未完成 · {agenda.overdue.length}</Text><Icon name={unfinishedCollapsed?'chevron-down':'chevron-up'} size={17} color={t.muted}/></Tap>{!unfinishedCollapsed&&agenda.overdue.map(renderTask)}</View>}
        {!allTasks.length&&!agenda.completed.length&&!agenda.overdue.length && <View style={{ alignItems: 'center', paddingVertical: 44, gap: 14 }}>
          <View style={{ width: 112, height: 112, borderRadius: 40, backgroundColor: t.soft, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-7deg' }] }}><Icon name="calendar-clear-outline" size={49} color={t.accent} /><View style={{ position: 'absolute', bottom: 15, right: 14, backgroundColor: t.surface, borderRadius: 12, padding: 5 }}><BrandLogo size={20}/></View></View>
          <Text style={{ color: t.fg, fontSize: 20, fontWeight: '600', letterSpacing: -.5 }}>一天的可能，从这里开始</Text><Text style={{ color: t.muted, fontSize: 12, lineHeight: 21, textAlign: 'center' }}>写下第一件小事，{`\n`}让生活有条不紊，也从容一点。</Text>
          <Tap label="创建第一项 To-do" onPress={() => setEditor('new')} style={{ marginTop: 8, flexDirection: 'row', gap: 7, padding: 12 }}><Text style={{ fontSize: 13, color: t.accent, fontWeight: '600' }}>添加 To-do</Text><Icon name="arrow-forward" size={16} color={t.accent} /></Tap>
        </View>}
        {data.settings.holidayEnabled && !yearKnown && <Hint>{date.getFullYear()} 年调休数据尚未同步，可在“我的 → 中国大陆调休”中获取。</Hint>}
        <Tap label="查看 AI 时间规划" onPress={() => router.navigate('/ai')} style={{ padding: 17, borderRadius: 20, backgroundColor: t.soft, gap: 8, marginTop: 9 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><View style={{ flexDirection: 'row', gap: 7 }}><Icon name="sparkles-outline" size={16} color={t.accent} /><Text style={{ fontSize: 12, color: t.accent, fontWeight: '600' }}>给时间一点灵感</Text></View><Icon name="arrow-up-right-box-outline" size={16} color={t.accent} /></View><Text numberOfLines={2} style={{ fontSize: 11, color: t.muted, lineHeight: 19 }}>{latestPlan ? latestPlan.content.replace(/[#*]/g, '') : '让 AI 看看今天的计划，为重要的事找到合适的时间。'}</Text></Tap>
      </ScrollView></View>;
      }}/>

      <View pointerEvents="box-none" style={{ position: 'absolute', bottom: Platform.OS === 'android' ? 22 : 105, right: 24 }}><Fab onPress={() => setEditor('new')} /></View>
    </View>
    {course&&<CourseDetailSheet task={course} initialEditing={courseEditing} onClose={()=>setCourse(null)} />}
    {assignment && <AssignmentSheet assignment={assignment} initialEditing={assignmentEditing} onClose={() => setAssignment(null)} />}
    {editor && <TaskEditor task={editor === 'new' ? undefined : editor} date={selected} onClose={() => setEditor(null)} />}
    <Sheet visible={jump} title="去往某一天" onClose={() => setJump(false)} footer={<Button dismiss title="查看日程" onPress={() => { chooseDay(jumpDate); setJump(false); }} />}><DateField mode="date" value={jumpDate} onChange={setJumpDate} /></Sheet>
  </SafeAreaView>;
}
