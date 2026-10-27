import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { Task } from '../core/types';
import { isComplete, endTime } from '../core/calendar';
import { useStore } from '../state/store';
import { useTheme } from './theme';
import { Checkbox, Icon, IconButton, Tap } from './components';
export default function TaskCard({ task, date, onEdit }: { task: Task; date: string; onEdit: () => void }) {
  const t = useTheme(), { toggleTask, toggleSubtask } = useStore(), [expanded, setExpanded] = useState(false), done = isComplete(task, date);
  return <View style={{ backgroundColor: t.surface, borderRadius: 20, borderWidth: 1, borderColor: task.color, boxShadow: '0px 2px 5px #203B2705', overflow: 'hidden', opacity: done ? .57 : 1 }}>
    <View style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 6, gap: 6 }}>
      {task.kind === 'todo' ? <Checkbox checked={done} onPress={() => toggleTask(task.id, date)} label={`${done ? '取消完成' : '完成'} ${task.title}`} color={task.color} /> : <View style={{ width: 35, height: 35, borderRadius: 12, backgroundColor: task.color + '55', justifyContent: 'center', alignItems: 'center' }}><Icon name="school-outline" size={19} color={t.accent} /></View>}
      <Tap onPress={() => task.subtasks.length ? setExpanded(!expanded) : onEdit()} label={`查看 ${task.title}`} style={{ flex: 1, paddingVertical: 9, gap: 5 }}>
        <Text numberOfLines={1} style={{ fontSize: 13, color: t.fg, fontWeight: '600', letterSpacing: -.3, textDecorationLine: done ? 'line-through' : 'none' }}>{task.title} <Text style={{ fontWeight: '700', color: t.muted }}>·</Text> {task.time}{task.location ? ` · ${task.location}` : ''}</Text>
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>{!!task.repeat && <Icon name="repeat" size={12} color={t.muted} />}<Text numberOfLines={1} style={{ fontSize: 11, color: t.muted, flex: 1 }}>{task.description || `${task.time}–${endTime(task.time, task.duration)} · ${task.duration} 分钟`}{task.subtasks.length ? ` · 子任务 ${task.subtasks.filter(s => s.completedDates.includes(date)).length}/${task.subtasks.length}` : ''}</Text>{task.subtasks.length > 0 && <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={t.muted} />}</View>
      </Tap>
      <IconButton icon="ellipsis-horizontal" onPress={onEdit} label={`编辑 ${task.title}`} color={t.muted} style={{ width: 32 }} />
    </View>
    {expanded && <View style={{ paddingHorizontal: 16, paddingBottom: 10, borderTopWidth: 1, borderColor: t.line }}>{task.subtasks.map(s => <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Checkbox checked={s.completedDates.includes(date)} label={`完成子任务 ${s.title}`} onPress={() => toggleSubtask(task.id, s.id, date)} /><Text style={{ flex: 1, fontSize: 12, color: t.fg, textDecorationLine: s.completedDates.includes(date) ? 'line-through' : 'none' }}>{s.title}</Text></View>)}</View>}
  </View>;
}
