import React from 'react';
import {View} from 'react-native';
import Text from './LocalizedText';

import { dateKey, parseDate, validDate, weekDates, CN_WEEKDAYS } from '../core/calendar';
import { useTheme } from './theme';
import DateField from './DateField';
import { Hint } from './components';

export default function SemesterWeekField({ value, onChange, weekStartsOn, hint }: { value: string; onChange: (value: string) => void; weekStartsOn: 0 | 1; hint?: string }) {
  const t = useTheme();
  const days = validDate(value) ? weekDates(parseDate(value), weekStartsOn) : [];
  const range = days.length ? `${dateKey(days[0]!).replace(/-/g, '.')} — ${dateKey(days[6]!).replace(/-/g, '.')}` : '';
  return <View style={{ gap: 15 }}>
    <DateField mode="date" label="学期第一周内的任意一天" value={value} onChange={onChange} />
    {!!range && <View accessibilityLabel={`学期第一周 ${range}`} style={{ backgroundColor: t.soft, borderRadius: 20, padding: 16, gap: 14 }}>
      <Text style={{ color: t.accent, fontSize: 12, fontWeight: '700' }}>第 1 周 · {range}</Text>
      <View style={{ flexDirection: 'row' }}>{days.map(day => <View key={dateKey(day)} style={{ flex: 1, alignItems: 'center', gap: 7 }}><Text style={{ fontSize: 11, color: t.muted }}>周{CN_WEEKDAYS[day.getDay()]}</Text><Text style={{ fontSize: 19, color: t.fg, fontWeight: dateKey(day) === value ? '700' : '400' }}>{day.getDate()}</Text></View>)}</View>
    </View>}
    <Hint>{hint || '选择这学期第一周中的任意日期，整周都会记作第 1 周。周次跨月、跨年连续计算；更换学期时可在“我的 → 日历与作息”修改。'}</Hint>
  </View>;
}
