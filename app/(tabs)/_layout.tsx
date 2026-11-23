import React from 'react';
import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/native-tabs';
import {useT} from '../../src/ui/LocaleContext';
import { useTheme } from '../../src/ui/theme';
export default function TabLayout() {
  const t = useTheme(),txt=useT(); return <NativeTabs tintColor={t.accent} backgroundColor={Platform.OS === 'android' ? t.bg : undefined} indicatorColor={t.soft} labelStyle={{ fontSize: 11 }} minimizeBehavior="never" disableTransparentOnScrollEdge>
    <NativeTabs.Trigger name="index"><NativeTabs.Trigger.Icon sf="checklist" md="checklist" /><NativeTabs.Trigger.Label>{txt('To-do')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    <NativeTabs.Trigger name="schedule"><NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" /><NativeTabs.Trigger.Label>{txt('课程表')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    <NativeTabs.Trigger name="ai"><NativeTabs.Trigger.Icon sf="sparkles" md="auto_awesome" /><NativeTabs.Trigger.Label>{txt('AI')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    <NativeTabs.Trigger name="homework"><NativeTabs.Trigger.Icon sf="book.closed" md="menu_book" /><NativeTabs.Trigger.Label>{txt('作业')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    <NativeTabs.Trigger name="me"><NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" /><NativeTabs.Trigger.Label>{txt('我的')}</NativeTabs.Trigger.Label></NativeTabs.Trigger>
  </NativeTabs>;
}
