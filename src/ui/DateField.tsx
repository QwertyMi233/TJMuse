import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { dateKey, parseDate } from '../core/calendar';
import { Button, Icon, Sheet, Tap } from './components';
import { useTheme } from './theme';
export interface DateFieldProps { mode: 'date' | 'time'; value: string; onChange: (value: string) => void; label?: string }
export default function DateField({ mode, value, onChange, label }: DateFieldProps) {
  const t = useTheme(), [open, setOpen] = useState(false);
  const getValue = () => {
    if (mode === 'date') return parseDate(value);
    const d = new Date(); const [h = 8, m = 0] = value.split(':').map(Number); d.setHours(h, m, 0, 0); return d;
  };
  const update = (d?: Date) => { if (d) onChange(mode === 'date' ? dateKey(d) : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`); };
  return <View style={{ flex: 1, gap: 8 }}><Text style={{ fontSize: 12, color: t.muted, fontWeight: '600' }}>{label || (mode === 'date' ? '日期' : '时间')}</Text>
    <Tap label={label || (mode === 'date' ? '选择日期' : '选择时间')} onPress={() => Platform.OS === 'android' ? DateTimePickerAndroid.open({ value: getValue(), mode, is24Hour: true, design: Constants.executionEnvironment === ExecutionEnvironment.StoreClient ? 'default' : 'material', onChange: (event, d) => { if (event.type === 'set') update(d); } }) : setOpen(true)} style={{ flexDirection: 'row', gap: 10, padding: 15, borderRadius: 17, backgroundColor: t.surface, borderWidth: 1, borderColor: t.line }}><Icon name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={t.accent} /><Text style={{ color: t.fg, fontSize: 14 }}>{value}</Text></Tap>
    {open && <Sheet visible title={mode === 'date' ? '选择日期' : '选择时间'} onClose={() => setOpen(false)} footer={<Button title="完成" onPress={() => setOpen(false)} />}><DateTimePicker value={getValue()} mode={mode} display="spinner" locale="zh-CN" is24Hour onChange={(_, d) => update(d)} themeVariant={t.dark ? 'dark' : 'light'} style={{ alignSelf: 'center', width: 300 }} /></Sheet>}
  </View>;
}
