import React from 'react';
import { View } from 'react-native';
import { useStore } from '../state/store';
import { Hint, Pill } from './components';
export default function HomeworkPlacement() {
  const { data, updateSettings } = useStore();
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{([['timeline', '按时间穿插'], ['top', '置于顶部'], ['bottom', '置于底部']] as const).map(([value, title]) => <Pill key={value} title={title} selected={data.settings.homeworkPlacement === value} onPress={() => updateSettings({ homeworkPlacement: value })} />)}</View>
    <Hint>从开始日到截止日每天显示在 To-do 中，完成状态联动。排序选择自动保存。</Hint>
  </View>;
}
