import React, { useState } from 'react';
import {View} from 'react-native';
import Text from './LocalizedText';

import { useStore } from '../state/store';
import { TASK_COLORS, uid } from '../core/defaults';
import type { Task, RepeatUnit, Subtask } from '../core/types';
import { CN_WEEKDAYS, parseDate, validDate, validTime, dateKey, clockTime, taskEnd, durationBetween, MAX_TASK_MINUTES } from '../core/calendar';
import { Button, ConfirmSheet, Field, Hint, Icon, IconButton, Pill, Sheet, Tap } from './components';
import DateField from './DateField';
import { useTheme } from './theme';
import {EditorFooter} from './EditorForm';
import {useSheetDismiss} from './useSheetDismiss';
import PriorityFields from './PriorityFields';

export default function TaskEditor({ task, date, onClose }: { task?: Task; date: string; onClose: () => void }) {
  const { data, saveTask, deleteTask } = useStore(), t = useTheme();
  const {closeRef,dismiss}=useSheetDismiss(onClose);
  const [title, setTitle] = useState(task?.title || ''), [description, setDescription] = useState(task?.description || ''), [location, setLocation] = useState(task?.location || '');
  const [selectedDate, setDate] = useState(task?.date || date), [time, setTime] = useState(task?.time || '09:00'), [duration, setDuration] = useState(String(task?.duration || 30));
  const [endDate, setEndDate] = useState(() => dateKey(taskEnd({ date: task?.date || date, time: task?.time || '09:00', duration: task?.duration || 30 })));
  const [end, setEnd] = useState(() => clockTime(taskEnd({ date: task?.date || date, time: task?.time || '09:00', duration: task?.duration || 30 })));
  const [color, setColor] = useState(task?.color || TASK_COLORS[data.tasks.length % TASK_COLORS.length]!);
  const [recurring, setRecurring] = useState(!!task?.repeat), [expanded, setExpanded] = useState(!!task?.repeat);
  const [unit, setUnit] = useState<RepeatUnit>(task?.repeat?.unit || 'week'), [interval, setInterval] = useState(String(task?.repeat?.interval || 1));
  const [weekdays, setWeekdays] = useState(task?.repeat?.weekdays || [parseDate(date).getDay()]);
  const [subtasks, setSubtasks] = useState<Subtask[]>(task?.subtasks || []), [error, setError] = useState(''), [confirm, setConfirm] = useState(false);
  const isCourse = task?.kind === 'course';
  const [important,setImportant]=useState(task?.important===true),[urgent,setUrgent]=useState(task?.urgent===true);
  const syncEnd = (startDate: string, startTime: string, value: string) => {
    const amount = Number(value);
    if (!validDate(startDate) || !validTime(startTime) || !Number.isSafeInteger(amount) || amount < 1 || amount > MAX_TASK_MINUTES) return;
    const result = taskEnd({ date: startDate, time: startTime, duration: amount });
    setEndDate(dateKey(result)); setEnd(clockTime(result));
  };
  const changeStartDate = (value: string) => { setDate(value); syncEnd(value, time, duration); };
  const changeStartTime = (value: string) => { setTime(value); syncEnd(selectedDate, value, duration); };
  const changeDuration = (value: string) => { setDuration(value); syncEnd(selectedDate, time, value); };
  const changeEnd = (newDate: string, newTime: string) => {
    setEndDate(newDate); setEnd(newTime);
    if (validDate(selectedDate) && validTime(time) && validDate(newDate) && validTime(newTime)) setDuration(String(durationBetween(selectedDate, time, newDate, newTime)));
  };
  const save = () => {
    if (!title.trim()) return setError('请填入 To-do 名称。');
    if (!validDate(selectedDate) || !validTime(time) || !validDate(endDate) || !validTime(end)) return setError('请选择有效的开始和结束日期、时间。');
    if (durationBetween(selectedDate, time, endDate, end) <= 0) return setError('结束日期和时间需要晚于开始日期和时间。');
    if (!Number.isSafeInteger(Number(duration)) || Number(duration) < 1 || Number(duration) > MAX_TASK_MINUTES) return setError('时长请填入 1–525600 分钟的整数（最长 365 天）。');
    if (Number(duration) !== durationBetween(selectedDate, time, endDate, end)) return setError('起止时间与时长不一致，请重新选择。');
    if (recurring && (!Number.isInteger(Number(interval)) || Number(interval) < 1 || Number(interval) > 999)) return setError('循环间隔请填入 1–999 的整数。');
    if (recurring && unit === 'week' && weekdays.length === 0) return setError('请选择每周执行的日期。');
    const next:Task={ id: task?.id || uid(), title: title.trim(), description: description.trim(), location: location.trim(), date: selectedDate, time, duration: Number(duration), color,
      kind: task?.kind || 'todo', repeat: recurring ? { interval: Number(interval), unit, weekdays, weekStartsOn: task?.repeat?.weekStartsOn ?? data.settings.weekStartsOn } : null,
      subtasks: recurring ? [] : subtasks.filter(s => s.title.trim()).map(s => ({ ...s, title: s.title.trim() })), completedDates: task?.completedDates || [],...(!isCourse?{important,urgent}:{}) };
    dismiss(()=>{saveTask(next);onClose();});
  };
  return <Sheet visible closeRef={closeRef} size="large" title={isCourse?'编辑课程':task ? '编辑 To-do' : '为一天添一件事'} subtitle={task ? '把计划调整到合适的节奏。' : '留给重要的事，也留一点空白。'} onClose={onClose} footer={<EditorFooter onSave={save} onDelete={task?()=>setConfirm(true):undefined} deleteLabel={isCourse?'删除课程':'删除 To-do'} saveLabel={task?'保存更改':'确认添加'}/>}>
    <Tap label="展开任务类型" onPress={() => setExpanded(!expanded)} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: t.soft, borderRadius: 17 }}><View style={{ flexDirection: 'row', gap: 10 }}><Icon name={recurring ? 'repeat' : 'calendar-clear-outline'} size={19} color={t.accent} /><Text style={{ color: t.fg, fontWeight: '600', fontSize: 14 }}>{recurring ? '循环 To-do' : '一次性 To-do'}</Text></View><Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={t.muted} /></Tap>
    {expanded && <View style={{ flexDirection: 'row', gap: 10 }}><Pill title="一次性" selected={!recurring} onPress={() => setRecurring(false)} /><Pill title="循环" selected={recurring} onPress={() => setRecurring(true)} /></View>}
    <Field label="TO-DO 名称" placeholder="填入 To-do…" value={title} onChangeText={setTitle} maxLength={100} returnKeyType="next" />
    {!isCourse&&<PriorityFields important={important} urgent={urgent} onImportant={setImportant} onUrgent={setUrgent}/>}
    <View style={{ gap: 13, paddingVertical: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="time-outline" size={18} color={t.accent} /><Text style={{ color: t.fg, fontSize: 14, fontWeight: '600' }}>任务时间</Text></View>
      <View style={{ flexDirection: 'row', gap: 12 }}><DateField mode="date" label="开始日期" value={selectedDate} onChange={changeStartDate} /><DateField mode="time" label="开始时间" value={time} onChange={changeStartTime} /></View>
      <View style={{ flexDirection: 'row', gap: 12 }}><DateField mode="date" label="结束日期" value={endDate} onChange={value => changeEnd(value, end)} /><DateField mode="time" label="结束时间" value={end} onChange={value => changeEnd(endDate, value)} /></View>
      <Field label="时长 / 分钟" value={duration} onChangeText={changeDuration} keyboardType="number-pad" maxLength={6} />
      <Hint>直接选择结束日期和时间，时长会自动算好。也可以填写时长，结束时间会随之更新。</Hint>
      {recurring && <Hint>这里设置首次执行的起止时间，后续每次循环沿用这一时长。</Hint>}
    </View>
    <Field label="描述" placeholder="写下一些细节（可选）" value={description} onChangeText={setDescription} multiline maxLength={2000} />
    <Field label="地点" placeholder="在哪里（可选）" value={location} onChangeText={setLocation} maxLength={100} />
    {!recurring && !isCourse && <View style={{ gap: 10 }}>
      {subtasks.map((sub, i) => <View key={sub.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ flex: 1 }}><Field placeholder={`填入子任务 ${i + 1}…`} value={sub.title} onChangeText={v => setSubtasks(list => list.map(s => s.id === sub.id ? { ...s, title: v } : s))} maxLength={100} /></View><IconButton icon="remove-circle-outline" label={`删除子任务 ${i + 1}`} onPress={() => setSubtasks(list => list.filter(s => s.id !== sub.id))} /></View>)}
      <Tap label="添加子任务" onPress={() => setSubtasks(list => [...list, { id: uid(), title: '', completedDates: [] }])} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 10 }}><Icon name="add" size={20} color={t.accent} /><Text style={{ color: t.accent, fontWeight: '600', fontSize: 14 }}>子任务</Text></Tap>
    </View>}
    {recurring && <View style={{ gap: 15 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ color: t.muted, fontSize: 13 }}>循环每</Text><View style={{ width: 65 }}><Field accessibilityLabel="循环间隔" value={interval} onChangeText={setInterval} keyboardType="number-pad" maxLength={3} /></View><View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>{([['day', '天'], ['week', '周'], ['month', '月'], ['year', '年']] as const).map(([key, label]) => <Pill key={key} title={label} selected={unit === key} onPress={() => setUnit(key)} />)}</View></View>
      {unit === 'week' && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>{Array.from({ length: 7 }, (_, i) => (i + data.settings.weekStartsOn) % 7).map(day => <Tap key={day} label={`周${CN_WEEKDAYS[day]}`} onPress={() => setWeekdays(list => list.includes(day) ? list.filter(d => d !== day) : [...list, day])} style={{ width: 36, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: weekdays.includes(day) ? t.accent : t.surface }}><Text style={{ color: weekdays.includes(day) ? t.onAccent : t.muted, fontSize: 13 }}>{CN_WEEKDAYS[day]}</Text></Tap>)}</View>}
      <Hint>{unit === 'month' || unit === 'year' ? '遇到没有对应日期的月份，在该月最后一天执行。' : '从下方日期开始循环，完成状态按每次日程分别记录。'}{subtasks.length ? '\n切换为循环任务后，保存时将移除子任务。' : ''}</Hint>
    </View>}
    <Hint>支持跨天或连续多天，任务会显示在实际占用的每一天，完成状态与子任务联动；循环任务按每次开始日期分别记录。</Hint>
    <View style={{ gap: 12 }}><Text style={{ color: t.muted, fontSize: 12, fontWeight: '600' }}>边框颜色</Text><View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>{TASK_COLORS.map(c => <Tap key={c} label={`边框颜色 ${c}`} onPress={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: c, alignItems: 'center', justifyContent: 'center' }}>{color === c && <Icon name="checkmark" size={17} color="#344C3D" />}</Tap>)}</View></View>
    {!!task?.repeat && <Hint>更改或删除循环任务将应用于整个循环系列。</Hint>}
    {!!error && <Hint error>{error}</Hint>}
    <ConfirmSheet visible={confirm} title="删除这项 To-do？" description={task?.repeat ? '整个循环系列及完成记录都会被删除。' : '该任务及其子任务会从日程中删除。'} onClose={() => setConfirm(false)} onConfirm={() => { dismiss(()=>{deleteTask(task!.id);onClose();}); }} />
  </Sheet>;
}
