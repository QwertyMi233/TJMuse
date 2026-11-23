import React, { useEffect, useState } from 'react';
import {Image,Platform,ScrollView,View,Share} from 'react-native';
import Constants from 'expo-constants';
import {diagnosticEntries} from '../core/diagnostics';
import Text from '../ui/LocalizedText';

import { SafeAreaView } from 'react-native-safe-area-context';
import { version as APP_VERSION } from '../../package.json';
import { router, useLocalSearchParams } from 'expo-router';
import { useStore } from '../state/store';
import {profileCountry} from '../core/countries';
import {useLanguage} from '../ui/LocaleContext';
import { useTheme } from '../ui/theme';
import { Button,ConfirmSheet, Icon, Sheet, Tap, type IconName } from '../ui/components';
import { AISettingsSheet, CalendarSettingsSheet, HolidaySettingsSheet, NotificationsSheet, ProfileSheet } from '../ui/SettingsSheets';
import LanguageSettingsSheet from '../ui/LanguageSettingsSheet';
import PersonalizationSettingsSheet from '../ui/PersonalizationSettingsSheet';
import TimetableSettingsSheet from '../ui/TimetableSettingsSheet';
import HomeworkScreen from './HomeworkScreen';
import BrandLogo from '../ui/BrandLogo';
type Panel = 'language' | 'profile' | 'ai' | 'notifications' | 'calendar' | 'holidays' | 'history' | 'about' | 'personalization' | 'timetable' | 'assignments' | null;
export default function MeScreen() {
  const { data, clearMessages,updateSettings } = useStore(), t = useTheme(),language=useLanguage(), [panel, setPanel] = useState<Panel>(null);
  const params = useLocalSearchParams<{ settings?: string }>();
  useEffect(() => { if (params.settings === 'ai') { setPanel('ai'); router.setParams({ settings: undefined }); } }, [params.settings]);
  const close = () => setPanel(null);
  const row = (icon: IconName, title: string, detail: string, target: Panel, extra?: React.ReactNode) => <Tap key={title} label={title} onPress={() => setPanel(target)} style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 19, paddingHorizontal: 17 }}><View style={{ width: 35, height: 35, borderRadius: 12, backgroundColor: t.soft, justifyContent: 'center', alignItems: 'center' }}><Icon name={icon} size={18} color={t.accent} /></View><View style={{ flex: 1, gap: 5 }}><Text style={{ fontSize: 14, fontWeight: '600', color: t.fg }}>{title}</Text><Text style={{ fontSize: 10, color: t.muted }}>{detail}</Text></View>{extra}<Icon name="chevron-forward" size={15} color={t.muted} /></Tap>;
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.bg }}><ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 26, paddingBottom: Platform.OS === 'android' ? 40 : 130, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}><Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 2, color: t.muted }}>A SPACE OF YOUR OWN</Text><Text style={{ fontSize: 11, color: t.muted }}>TJMuse / {APP_VERSION}</Text></View>
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 17, marginBottom: 31 }}>
      <Tap label="编辑头像" onPress={() => setPanel('profile')} style={{ width: 77, height: 77, borderRadius: 27, backgroundColor: t.soft, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>{data.profile.avatar ? <Image source={{ uri: data.profile.avatar }} style={{ width: 77, height: 77 }} /> : <Icon name="person-outline" size={33} color={t.accent} />}</Tap>
      <View style={{ flex: 1, paddingTop: 6, gap: 10 }}><Text translate={false} numberOfLines={1} style={{ color: t.fg, fontSize: 29, fontWeight: '700', letterSpacing: -1 }}>{data.profile.nickname}</Text><View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}><Icon name="location-outline" size={12} color={t.muted} /><Text testID="profile-region" translate={false} style={{color:t.muted,fontSize:11}}>{profileCountry(data.profile,language)}</Text><Text style={{color:t.muted,fontSize:11}}> · {data.profile.gender||'不愿透露'}</Text></View></View>
      <Tap label="编辑个人资料" onPress={() => setPanel('profile')} style={{ paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: t.line, borderRadius: 15, backgroundColor: t.surface }}><Text style={{ color: t.accent, fontWeight: '600', fontSize: 11 }}>Edit</Text></Tap>
    </View>
    <View style={{ backgroundColor: t.soft, borderRadius: 22, paddingHorizontal: 20, paddingVertical: 19, gap: 7, marginBottom: 27 }}><Text style={{ fontSize: 17, color: t.fg, fontWeight: '600', letterSpacing: -.5 }}>把日子，过成喜欢的样子。</Text><Text style={{ fontSize: 11, color: t.muted }}>Less rush. More room for you.</Text></View>
    <Text style={{ color: t.muted, fontSize: 10, letterSpacing: 1.3, marginBottom: 11, marginLeft: 5 }}>PREFERENCES · 偏好设置</Text>
    <View style={{ backgroundColor: t.surface, borderRadius: 24, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
      {row('color-palette-outline', '外观', '主题颜色 · 首页排版', 'personalization')}
      <View style={{ height: 1, backgroundColor: t.line, marginLeft: 65 }} />
      {row('calendar-outline', '课程表设置', '行高 · 节次起止时间 · 时长', 'timetable')}
      <View style={{ height: 1, backgroundColor: t.line, marginLeft: 65 }} />
      {row('sparkles-outline', 'AI 设置', `${data.settings.provider === 'openai' ? 'ChatGPT' : data.settings.provider === 'deepseek' ? 'DeepSeek' : '自定义接口'} · 模型与 API Key`, 'ai')}
      <View style={{ height: 1, backgroundColor: t.line, marginLeft: 65 }} />
      {row('book-outline', '作业设置', 'Canvas · 好课 · 智学盟 · 连接与同步', 'assignments')}
      <View style={{ height: 1, backgroundColor: t.line, marginLeft: 65 }} />
      {row('language-outline','语言','跟随系统或选择你的语言','language')}
      <View testID="language-notifications-divider" style={{ height: 1, backgroundColor: t.line, marginLeft: 65 }} />
      {row('notifications-outline', '通知', `${data.settings.todoNotifications ? 'To-do 提醒已开启' : 'To-do 提醒已关闭'}`, 'notifications')}
      <View style={{ height: 1, backgroundColor: t.line, marginLeft: 65 }} />
      {row('calendar-outline', '日历与作息', `学期第一周 · 每周从${data.settings.weekStartsOn === 1 ? '周一' : '周日'}开始`, 'calendar')}
      <View style={{ height: 1, backgroundColor: t.line, marginLeft: 65 }} />
      {row('sunny-outline', '中国大陆调休', data.settings.holidayEnabled ? '节假日与补班日期' : '已关闭显示', 'holidays')}
    </View>
    <Text style={{ color: t.muted, fontSize: 10, letterSpacing: 1.3, marginTop: 27, marginBottom: 11, marginLeft: 5 }}>MORE · 其他</Text>
    <View style={{ backgroundColor: t.surface, borderRadius: 24, borderWidth: 1, borderColor: t.line, overflow: 'hidden' }}>
      {row('chatbubble-ellipses-outline', '清除历史对话', `${data.messages.length} 条本地对话记录`, 'history')}
      <View style={{ height: 1, backgroundColor: t.line, marginLeft: 65 }} />
      {row('information-circle-outline', '关于我们', 'TJMuse', 'about')}
    </View>
    <Tap label="重新体验初始化设置" onPress={()=>{setPanel(null);updateSettings({onboardingCompleted:false,onboardingStep:0});}} style={{padding:18}}><Text style={{color:t.muted,textAlign:'center'}}>重新体验初始化设置</Text></Tap>
    <View style={{ alignItems: 'center', marginTop: 30, gap: 9 }}><BrandLogo size={26}/><Text style={{ color: t.muted, fontSize: 10, letterSpacing: 1.4 }}>MAKE ROOM FOR WHAT MATTERS.</Text></View>
  </ScrollView>
    {panel==='language'&&<LanguageSettingsSheet onClose={close}/>}
    {panel==='personalization'&&<PersonalizationSettingsSheet onClose={close}/>}
    {panel==='timetable'&&<TimetableSettingsSheet onClose={close}/>}
    {panel==='assignments'&&<HomeworkScreen settingsOnly onClose={close}/>}
    {panel === 'profile' && <ProfileSheet onClose={close} />}{panel === 'ai' && <AISettingsSheet onClose={close} />}{panel === 'notifications' && <NotificationsSheet onClose={close} />}{panel === 'calendar' && <CalendarSettingsSheet onClose={close} />}{panel === 'holidays' && <HolidaySettingsSheet onClose={close} />}
    <ConfirmSheet visible={panel === 'history'} title="清除历史对话？" description="本地保存的所有 AI 对话都会被清除，To-do 和自由事项会保留。" onClose={close} onConfirm={clearMessages} />
    <Sheet visible={panel === 'about'} title="关于我们" onClose={close}><View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24, gap: 14 }}><Text style={{ color: t.fg, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>TJMuse {APP_VERSION}</Text><Text style={{ color: t.muted, fontSize: 12, textAlign: 'center' }}>© {new Date().getFullYear()} OrstaLogic. All rights reserved.</Text><Text style={{ color: t.muted, fontSize: 12, textAlign: 'center' }}>Contributor qp338113</Text><Text style={{color:t.muted,fontSize:12}}>Build {Constants.expoConfig?.ios?.buildNumber||30}</Text></View><Button title="生成问题诊断" secondary onPress={()=>{void Share.share({message:JSON.stringify({version:APP_VERSION,build:Constants.expoConfig?.ios?.buildNumber||30,platform:Platform.OS,events:diagnosticEntries()},null,2)});}}/></Sheet>
  </SafeAreaView>;
}
