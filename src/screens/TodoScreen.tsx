import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useStore } from '../state/store';
import { useTheme } from '../ui/theme';
import { addDays, dateKey, dateLabel, monthWeek, parseDate, tasksOn, WEEKDAYS, weekDates } from '../core/calendar';
import type { Task } from '../core/types';
import { Button, Fab, Hint, Icon, IconButton, Sheet, Tap } from '../ui/components';
import DateField from '../ui/DateField';
import TaskEditor from '../ui/TaskEditor';
import TaskCard from '../ui/TaskCard';

export default function TodoScreen() {
  const { data, getHoliday } = useStore(), t = useTheme();
  const [today, setToday] = useState(dateKey(new Date())), [selected, setSelected] = useState(today), [editor, setEditor] = useState<Task | 'new' | null>(null), [jump, setJump] = useState(false), [jumpDate, setJumpDate] = useState(selected);
  useEffect(() => { const timer = setInterval(() => setToday(dateKey(new Date())), 30000); return () => clearInterval(timer); }, []);
  const date = parseDate(selected), days = weekDates(date, data.settings.weekStartsOn), tasks = tasksOn(data.tasks, selected), completed = tasks.filter(task => task.completedDates.includes(selected)).length;
  const holiday = getHoliday(selected), yearKnown = !!data.holidays[date.getFullYear()] || date.getFullYear() === 2026;
  const latestPlan = [...data.messages].reverse().find(m => m.date === today && m.role === 'assistant');
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.bg }}>
    <View style={{ flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingTop: 15 }}>
      <View style={{ paddingHorizontal: 24, gap: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}><Icon name="leaf-outline" size={17} color={t.accent} /><Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 2, color: t.accent }}>TJMUSE</Text></View><Text style={{ color: t.muted, fontSize: 10, letterSpacing: .8 }}>A LITTLE SPACE FOR YOUR DAY</Text></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Tap label="选择日程日期" onPress={() => { setJumpDate(selected); setJump(true); }} style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, flex: 1, flexWrap: 'wrap' }}><Text style={{ fontSize: 34, fontWeight: '800', letterSpacing: -1.8, color: t.fg }}>{date.toLocaleString('en-US', { month: 'long' }).toUpperCase()}</Text><Text style={{ fontSize: 11, color: t.muted }}>第 {monthWeek(date, data.settings.weekStartsOn)} 周</Text></Tap>
          <Tap label="跳转到今天" onPress={() => setSelected(today)} style={{ width: 38, height: 38, borderRadius: 14, borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.accent, fontWeight: '600', fontSize: 15 }}>今</Text></Tap>
        </View>
      </View>
      <View style={{ flexDirection: 'row', marginTop: 14, paddingHorizontal: 19 }}>
        {days.map(day => { const key = dateKey(day), active = key === selected, isToday = key === today, h = getHoliday(key), hasTask = tasksOn(data.tasks, key).length > 0;
          return <Tap key={key} label={`${key}${isToday ? ' 今天' : ''}${h ? ` ${h.isOffDay ? '休息' : '补班'}` : ''}`} onPress={() => setSelected(key)} style={{ flex: 1, alignItems: 'center', gap: 9, paddingTop: 11, paddingBottom: 8, borderRadius: 19, backgroundColor: active ? t.soft : 'transparent' }}>
            <Text style={{ fontSize: 9, fontWeight: '600', letterSpacing: .8, color: active ? t.accent : t.muted }}>{WEEKDAYS[day.getDay()]}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}><Text style={{ fontSize: 25, lineHeight: 29, fontWeight: isToday || active ? '700' : '400', color: active || isToday ? t.accent : key < today ? (t.dark ? '#7A847D' : '#747A75') : (t.dark ? '#C2CDC5' : '#AFBAB0') }}>{day.getDate()}</Text>{h && <Text style={{ position: 'absolute', right: -9, top: -4, color: h.isOffDay ? '#B57060' : t.accent, fontSize: 8 }}>{h.isOffDay ? '休' : '班'}</Text>}</View>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: hasTask || isToday ? (active ? t.accent : t.muted) : 'transparent' }} />
          </Tap>;
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24, paddingRight: 14, marginTop: 12, marginBottom: 8 }}>
        <View style={{ gap: 4 }}><Text style={{ fontSize: 15, fontWeight: '600', color: t.fg }}>{selected === today ? '今天，慢慢来' : dateLabel(selected)}</Text><Text style={{ fontSize: 10, color: t.muted }}>{date.getFullYear()} · {tasks.length} 件事{tasks.length ? `，已完成 ${completed} 件` : '，留一点时间给自己'}{holiday ? ` · ${holiday.name}${holiday.isOffDay ? '休息' : '补班'}` : ''}</Text></View>
        <View style={{ flexDirection: 'row' }}><IconButton icon="chevron-back" label="上一周" onPress={() => setSelected(dateKey(addDays(date, -7)))} color={t.muted} style={{ width: 32 }} /><IconButton icon="chevron-forward" label="下一周" onPress={() => setSelected(dateKey(addDays(date, 7)))} color={t.muted} style={{ width: 32 }} /></View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 6, paddingBottom: Platform.OS === 'android' ? 100 : 190, gap: 9 }}>
        {tasks.map(task => <TaskCard key={task.id} task={task} date={selected} onEdit={() => setEditor(task)} />)}
        {!tasks.length && <View style={{ alignItems: 'center', paddingVertical: 44, gap: 14 }}>
          <View style={{ width: 112, height: 112, borderRadius: 40, backgroundColor: t.soft, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-7deg' }] }}><Icon name="calendar-clear-outline" size={49} color={t.accent} /><View style={{ position: 'absolute', bottom: 15, right: 14, backgroundColor: t.surface, borderRadius: 12, padding: 5 }}><Icon name="leaf-outline" size={18} color={t.accent} /></View></View>
          <Text style={{ color: t.fg, fontSize: 20, fontWeight: '600', letterSpacing: -.5 }}>一天的可能，从这里开始</Text><Text style={{ color: t.muted, fontSize: 12, lineHeight: 21, textAlign: 'center' }}>写下第一件小事，{`\n`}让生活有条不紊，也从容一点。</Text>
          <Tap label="创建第一项 To-do" onPress={() => setEditor('new')} style={{ marginTop: 8, flexDirection: 'row', gap: 7, padding: 12 }}><Text style={{ fontSize: 13, color: t.accent, fontWeight: '600' }}>添加 To-do</Text><Icon name="arrow-forward" size={16} color={t.accent} /></Tap>
        </View>}
        {data.settings.holidayEnabled && !yearKnown && <Hint>{date.getFullYear()} 年调休数据尚未同步，可在“我的 → 中国大陆调休”中获取。</Hint>}
        <Tap label="查看 AI 时间规划" onPress={() => router.navigate('/ai')} style={{ padding: 17, borderRadius: 20, backgroundColor: t.soft, gap: 8, marginTop: 9 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><View style={{ flexDirection: 'row', gap: 7 }}><Icon name="sparkles-outline" size={16} color={t.accent} /><Text style={{ fontSize: 12, color: t.accent, fontWeight: '600' }}>给时间一点灵感</Text></View><Icon name="arrow-up-right-box-outline" size={16} color={t.accent} /></View><Text numberOfLines={2} style={{ fontSize: 11, color: t.muted, lineHeight: 19 }}>{latestPlan ? latestPlan.content.replace(/[#*]/g, '') : '让 AI 看看今天的计划，为重要的事找到合适的时间。'}</Text></Tap>
      </ScrollView>
      <View pointerEvents="box-none" style={{ position: 'absolute', bottom: Platform.OS === 'android' ? 22 : 105, right: 24 }}><Fab onPress={() => setEditor('new')} /></View>
    </View>
    {editor && <TaskEditor task={editor === 'new' ? undefined : editor} date={selected} onClose={() => setEditor(null)} />}
    <Sheet visible={jump} title="去往某一天" onClose={() => setJump(false)} footer={<Button title="查看日程" onPress={() => { setSelected(jumpDate); setJump(false); }} />}><DateField mode="date" value={jumpDate} onChange={setJumpDate} /></Sheet>
  </SafeAreaView>;
}
