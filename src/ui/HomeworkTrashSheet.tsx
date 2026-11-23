import { allHomework, allHomeworkPreferences } from '../core/platforms';
import React, { useEffect, useState } from 'react';
import {Switch,View} from 'react-native';
import Text from './LocalizedText';

import { useStore } from '../state/store';
import { homeworkTrashExpiresAt } from '../core/homework-trash';
import { Button, Hint, Sheet } from './components';
import { useTheme } from './theme';

export default function HomeworkTrashSheet({ onClose }: { onClose: () => void }) {
  const { data, setHomeworkPreference, clearHomeworkTrash } = useStore(), t = useTheme();
  const [allowClear, setAllowClear] = useState(false), [confirm, setConfirm] = useState(false), [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  const preferences = allHomeworkPreferences(data);
  const deleted = allHomework(data).filter(a => preferences[a.id]?.deleted && !preferences[a.id]?.purged);
  return <Sheet visible title={confirm ? '清空已删除作业？' : '已经删除的作业'} onClose={onClose} footer={confirm ? <View style={{ gap: 10 }}><Button title="确认清空" onPress={() => { clearHomeworkTrash(); setConfirm(false); setAllowClear(false); }} /><Button title="保留作业" secondary onPress={() => setConfirm(false)} /></View> : undefined}>
    {confirm ? <Hint>将立即清除这里的 {deleted.length} 份作业，无法恢复。平台上的作业不受影响。</Hint> : <>
      <Hint>作业在删除后保留 3 天，期间可以恢复。到期后自动清除，也可以提前手动清空。</Hint>
      {deleted.length ? deleted.map(a => {
        const expires = homeworkTrashExpiresAt(preferences[a.id]);
        const hours = expires === null ? 72 : Math.max(0, Math.ceil((expires - now) / 3600000));
        const remaining = hours === 0 ? '即将清除' : hours >= 24 ? `剩余 ${Math.floor(hours / 24)} 天${hours % 24 ? ` ${hours % 24} 小时` : ''}` : `剩余 ${hours} 小时`;
        return <View key={a.id} style={{ borderWidth: 1, borderColor: t.line, borderRadius: 17, padding: 13, gap: 10 }}>
          <Text translate={false} style={{ color: t.fg, fontWeight: '600' }}>{a.title}</Text><Text style={{ color: t.muted, fontSize: 12 }}>{a.courseName} · {remaining}</Text>
          <Button title={`恢复作业 ${a.title}`} secondary onPress={() => setHomeworkPreference(a.id, { deleted: false })} />
        </View>;
      }) : <Hint>暂无已删除的作业。</Hint>}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ color: t.fg, flex: 1 }}>启用手动清空</Text><Switch accessibilityLabel="启用手动清空" value={allowClear} onValueChange={setAllowClear} trackColor={{ true: t.accent }} /></View>
      {allowClear && <Button title="清空已删除作业" secondary disabled={!deleted.length} onPress={() => setConfirm(true)} />}
    </>}
  </Sheet>;
}
