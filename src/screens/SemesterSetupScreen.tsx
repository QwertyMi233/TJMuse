import React, { useState } from 'react';
import {ScrollView,View} from 'react-native';
import Text from '../ui/LocalizedText';

import { SafeAreaView } from 'react-native-safe-area-context';
import { dateKey, validDate } from '../core/calendar';
import { useStore } from '../state/store';
import { useTheme } from '../ui/theme';
import { Button, Hint, Icon, Pill } from '../ui/components';
import SemesterWeekField from '../ui/SemesterWeekField';

export default function SemesterSetupScreen() {
  const { data, updateSettings } = useStore(), t = useTheme();
  const [date, setDate] = useState(dateKey(new Date())), [first, setFirst] = useState(data.settings.weekStartsOn), [error, setError] = useState('');
  return <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 26, paddingVertical: 30, gap: 27, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Icon name="calendar-outline" color={t.accent} /><Text style={{ color: t.accent, fontSize: 13, letterSpacing: 2, fontWeight: '700' }}>TJMUSE</Text></View>
      <View style={{ gap: 14 }}><Text accessibilityRole="header" style={{ fontSize: 31, lineHeight: 41, fontWeight: '700', color: t.fg }}>从你的第一周开始</Text><Text style={{ color: t.muted, fontSize: 14, lineHeight: 24 }}>欢迎来到 TJMuse。先选定学期第一周，之后的日程就会显示正确的教学周次。</Text></View>
      <View style={{ gap: 12 }}><Text style={{ color: t.fg, fontSize: 14, fontWeight: '600' }}>每周从哪一天开始？</Text><View style={{ flexDirection: 'row', gap: 10 }}><Pill title="周一" selected={first === 1} onPress={() => setFirst(1)} /><Pill title="周日" selected={first === 0} onPress={() => setFirst(0)} /></View></View>
      <SemesterWeekField value={date} onChange={setDate} weekStartsOn={first} />
      {!!error && <Hint error>{error}</Hint>}
      <View style={{ flex: 1, minHeight: 6 }} />
      <Button title="以这一周作为第 1 周" icon="arrow-forward" onPress={() => { if (!validDate(date)) return setError('请选择有效的第一周日期。'); updateSettings({ semesterStartDate: date, weekStartsOn: first }); }} />
    </ScrollView>
  </SafeAreaView>;
}
