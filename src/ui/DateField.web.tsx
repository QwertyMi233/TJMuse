import React, { createElement } from 'react';
import { Text, View } from 'react-native';
import type { DateFieldProps } from './DateField';
import { useTheme } from './theme';
export default function DateField({ mode, value, onChange, label }: DateFieldProps) {
  const t = useTheme(); return <View style={{ flex: 1, gap: 8 }}><Text style={{ fontSize: 12, color: t.muted, fontWeight: '600' }}>{label || (mode === 'date' ? '日期' : '时间')}</Text>
    {createElement('input', { type: mode, value, 'aria-label': label || (mode === 'date' ? '选择日期' : '选择时间'), onChange: (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.value) onChange(e.target.value); }, style: { boxSizing: 'border-box', width: '100%', minHeight: 51, border: `1px solid ${t.line}`, borderRadius: 17, background: t.surface, color: t.fg, padding: '12px', fontFamily: 'inherit', fontSize: 14, colorScheme: t.dark ? 'dark' : 'light' } })}
  </View>;
}
