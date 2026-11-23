import React from 'react';
import {View} from 'react-native';
import Text from './LocalizedText';

import { useStore } from '../state/store';
import { useTheme } from './theme';
import { Icon, Tap } from './components';
export default function SubmittedHomeworkToggle({ count }: { count: number }) {
  const { data, updateSettings } = useStore(), t = useTheme(), collapsed = data.settings.collapseSubmittedHomework;
  if (!count) return null;
  return <Tap label={`${collapsed ? '展开' : '折叠'}已提交作业（${count}）`} onPress={() => updateSettings({ collapseSubmittedHomework: !collapsed })} style={{ paddingVertical: 11, paddingHorizontal: 13, borderRadius: 15, backgroundColor: t.soft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
    <Text style={{ color: t.fg, fontSize: 12, fontWeight: '600', flex: 1 }}>已提交的作业 · {count}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Text style={{ color: t.accent, fontSize: 11 }}>{collapsed ? '展开' : '折叠'}</Text><Icon name={collapsed ? 'chevron-down' : 'chevron-up'} color={t.accent} size={15} /></View>
  </Tap>;
}
