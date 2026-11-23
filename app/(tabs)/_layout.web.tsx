import React from 'react';
import { Tabs } from 'expo-router';
import {View} from 'react-native';
import Text from '../../src/ui/LocalizedText';

import { BlurView } from 'expo-blur';
import { useTheme } from '../../src/ui/theme';
import { Icon, Tap, type IconName } from '../../src/ui/components';
const icons: Record<string, IconName> = { index: 'checkbox-outline', schedule: 'calendar-outline', ai: 'sparkles-outline', homework: 'book-outline', me: 'person-circle-outline' };
export default function TabLayout() {
  const t = useTheme(); return <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg } }} tabBar={({ state, descriptors, navigateToTab }) => <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20, alignItems: 'center' }}>
    <BlurView intensity={80} tint={t.dark ? 'dark' : 'light'} style={{ width: '100%', maxWidth: 440, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: t.dark ? '#FFFFFF22' : '#FFFFFF', boxShadow: '0px 6px 30px #123B6418' }}>
      <View style={{ flexDirection: 'row', padding: 7, backgroundColor: t.dark ? '#1B2A3E80' : '#FFFFFF9C' }}>
        {state.routes.map((route, i) => { const active = state.index === i; return <Tap key={route.key} label={String(descriptors[route.key]?.options.title || route.name)} onPress={() => navigateToTab(route.key)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 57, gap: 4, borderRadius: 24, backgroundColor: active ? t.soft : 'transparent' }}><Icon name={icons[route.name] || 'ellipse-outline'} size={22} color={active ? t.accent : t.muted} /><Text style={{ fontSize: 10, fontWeight: active ? '700' : '500', color: active ? t.accent : t.muted }}>{descriptors[route.key]?.options.title}</Text></Tap>; })}
      </View>
    </BlurView>
  </View>}>
    <Tabs.Screen name="index" options={{ title: 'To-do' }} /><Tabs.Screen name="schedule" options={{ title: '课程表' }} /><Tabs.Screen name="ai" options={{ title: 'AI' }} /><Tabs.Screen name="homework" options={{ title: '作业' }} /><Tabs.Screen name="me" options={{ title: '我的' }} />
  </Tabs>;
}
