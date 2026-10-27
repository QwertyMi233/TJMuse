import React from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../ui/theme';
export default function HomeworkScreen() {
  const t = useTheme(); return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.bg }}><View style={{ width: '100%', maxWidth: 760, alignSelf: 'center', padding: 26, paddingTop: 32 }}><Text style={{ fontSize: 11, letterSpacing: 2, color: t.muted, marginBottom: 13 }}>HOMEWORK</Text><Text style={{ fontSize: 34, fontWeight: '700', letterSpacing: -1, color: t.fg }}>作业</Text></View></SafeAreaView>;
}
