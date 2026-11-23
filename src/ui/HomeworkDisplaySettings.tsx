import React from 'react';
import {Switch,View} from 'react-native';
import Text from './LocalizedText';

import { useStore } from '../state/store';
import { useTheme } from './theme';
import { Hint } from './components';
export default function HomeworkDisplaySettings() {
  const { data, updateSettings } = useStore(), t = useTheme();
  return <View style={{ gap: 19 }}>
    {([['showHomeworkInTodo','在 To-do 显示作业',false],['showDatedHomeworkByDefault','有截止时间的作业默认显示',false],['showUndatedHomeworkByDefault','隐藏无时间限制的作业',true]] as const).map(([key,label,inverted]) => <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ flex: 1, color: t.fg, fontSize: 14, lineHeight: 21 }}>{label}</Text><Switch accessibilityLabel={label} value={inverted ? !data.settings[key] : data.settings[key]} onValueChange={value => updateSettings({ [key]: inverted ? !value : value })} trackColor={{ false: t.line, true: t.accent }} /></View>)}
    <Hint>总开关关闭时隐藏全部作业。单项“显示／隐藏”优先于默认规则，总开关重新开启后恢复各项选择。显示设置与截止通知分别控制。</Hint>
  </View>;
}
