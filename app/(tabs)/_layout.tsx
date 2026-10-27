import React from 'react';
import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/native-tabs';
import { useTheme } from '../../src/ui/theme';
export default function TabLayout() {
  const t = useTheme(); return <NativeTabs tintColor={t.accent} backgroundColor={Platform.OS === 'android' ? t.bg : undefined} indicatorColor={t.soft} labelStyle={{ fontSize: 11 }} minimizeBehavior="never" disableTransparentOnScrollEdge>
    <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf="checklist" md="checklist" /><NativeTabs.Trigger.Label>To-do</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    <NativeTabs.Trigger name="ai"><NativeTabs.Trigger.Icon sf="sparkles" md="auto_awesome" /><NativeTabs.Trigger.Label>AI</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    <NativeTabs.Trigger name="homework"><NativeTabs.Trigger.Icon sf="book.closed" md="menu_book" /><NativeTabs.Trigger.Label>作业</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    <NativeTabs.Trigger name="me"><NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" /><NativeTabs.Trigger.Label>我的</NativeTabs.Trigger.Label></NativeTabs.Trigger>
  </NativeTabs>;
}
