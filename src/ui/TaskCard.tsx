import React, { useState } from 'react';
import {View} from 'react-native';
import Text from './LocalizedText';

import type { TaskOccurrence } from '../core/types';
import {platformName} from '../core/platforms';
import { isComplete, dateKey, clockTime } from '../core/calendar';
import { useStore } from '../state/store';
import { useTheme } from './theme';
import { Checkbox, Icon, IconButton, Tap } from './components';
export default function TaskCard({ task, date, onEdit,onOpen }: { task: TaskOccurrence; date: string; onEdit: () => void;onOpen?:()=>void }) {
  const t = useTheme(), { toggleTask, toggleSubtask, toggleHomework } = useStore(), [expanded, setExpanded] = useState(false), done = isComplete(task, date);
  const occurrenceDate = task.occurrenceDate, spansDays = !task.homeworkId && task.endDate !== occurrenceDate;
  const label = task.repeat && spansDays ? `${task.title}（${occurrenceDate} 开始）` : task.title;
  const platform = platformName(task.homeworkPlatform||'canvas');
  const deadline = task.homeworkDueAt ? new Date(task.homeworkDueAt) : null;
  return <View testID={`task-${task.id}-${occurrenceDate}`} style={{ backgroundColor: t.surface, borderRadius: 20, borderWidth: 1, borderColor: task.color, boxShadow: t.glow, opacity: done ? .57 : 1 }}>
    <View style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 6, gap: 6 }}>
      {task.kind === 'todo' ? <Checkbox checked={done} onPress={() => task.homeworkId ? toggleHomework(task.homeworkId) : toggleTask(task.id, occurrenceDate)} label={`${done ? '取消完成' : '完成'} ${label}`} color={task.color} /> : <View style={{ width: 35, height: 35, borderRadius: 12, backgroundColor: task.color + '55', justifyContent: 'center', alignItems: 'center' }}><Icon name="school-outline" size={19} color={t.accent} /></View>}
      <Tap onPress={() => task.subtasks.length ? setExpanded(!expanded) : (onOpen||onEdit)()} label={`查看 ${label}`} style={{ flex: 1, paddingVertical: 9, gap: 5 }}>
        <Text translate={false} numberOfLines={1} style={{ fontSize: 13, color: t.fg, fontWeight: '600', letterSpacing: -.3, textDecorationLine: done ? 'line-through' : 'none' }}>{task.title}{!task.homeworkId && <> <Text style={{ fontWeight: '700', color: t.muted }}>·</Text> {spansDays ? `${task.dayStartTime}–${task.dayEndTime}` : task.time}</>}{task.location ? ` · ${task.location}` : ''}</Text>
        {spansDays && <Text style={{ fontSize: 10, color: t.accent, lineHeight: 16 }}>{task.isContinuation ? '跨天续程' : '跨天'} · {occurrenceDate} {task.time} → {task.endDate} {task.endTime}</Text>}
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>{!!task.repeat && <Icon name="repeat" size={12} color={t.muted} />}<Text translate={false} numberOfLines={1} style={{ fontSize: 11, color: task.homeworkId ? t.accent : t.muted, flex: 1 }}>{task.homeworkId ? deadline ? `截止 ${dateKey(deadline)} ${clockTime(deadline)} · ${task.canvasSubmitted ? '已提交' : `${platform} 作业`}` : `无截止时间 · ${task.canvasSubmitted ? '已提交' : `${platform} 作业`}` : task.description || `${task.dayStartTime}–${task.dayEndTime} · 共 ${task.duration} 分钟`}{task.subtasks.length ? ` · 子任务 ${task.subtasks.filter(s => s.completedDates.includes(occurrenceDate)).length}/${task.subtasks.length}` : ''}</Text>{task.subtasks.length > 0 && <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={t.muted} />}</View>
      </Tap>
      <IconButton icon="ellipsis-horizontal" onPress={onEdit} label={`编辑 ${label}`} color={t.muted} style={{ width: 32 }} />
    </View>
    {expanded && <View style={{ paddingHorizontal: 16, paddingBottom: 10, borderTopWidth: 1, borderColor: t.line }}>{task.subtasks.map(s => <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Checkbox checked={s.completedDates.includes(occurrenceDate)} label={`完成子任务 ${s.title}`} onPress={() => toggleSubtask(task.id, s.id, occurrenceDate)} /><Text translate={false} style={{ flex: 1, fontSize: 12, color: t.fg, textDecorationLine: s.completedDates.includes(occurrenceDate) ? 'line-through' : 'none' }}>{s.title}</Text></View>)}</View>}
  </View>;
}
