import React, { useEffect,useState } from 'react';
import {ActivityIndicator,Appearance,AppState,Platform,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createDailyOverviewGate} from '../src/core/daily-overview';
import {dateKey} from '../src/core/calendar';
import DailyOverviewScreen from '../src/screens/DailyOverviewScreen';
import Text from '../src/ui/LocalizedText';

import * as SystemUI from 'expo-system-ui';
import { Stack, ThemeProvider, DefaultTheme, DarkTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SheetMotionProvider,SheetScene } from '../src/ui/SheetMotionContext';
import { AppProvider, useStore } from '../src/state/store';
import { useTheme } from '../src/ui/theme';
import { Tap } from '../src/ui/components';
import OnboardingScreen from '../src/screens/OnboardingScreen';
import {LocaleProvider} from '../src/ui/LocaleContext';
import PlatformSessionHost from '../src/ui/PlatformSessionHost';
import {version as APP_VERSION} from '../package.json';
import { ONBOARDING_BLUE } from '../src/ui/onboarding-colors';
import { DEMO_MODE } from '../src/services/demo-mode';
const overviewKey=DEMO_MODE?'tjmuse.demo.daily-overview.v1':'tjmuse.daily-overview.v1';
const overviewGate=createDailyOverviewGate(()=>AsyncStorage.getItem(overviewKey),day=>AsyncStorage.setItem(overviewKey,day));
function AppShell() {
  const { data, ready, error, notice, clearNotice } = useStore(), t = useTheme();
  const [overview,setOverview]=useState(false),[greeting,setGreeting]=useState(0);
  useEffect(()=>{
    if(!ready||!data.settings.onboardingCompleted)return;
    let mounted=true;
    const check=()=>{if(AppState.currentState==='background'||AppState.currentState==='inactive')return;void overviewGate.claim(dateKey(new Date())).then(show=>{if(mounted&&show){setGreeting(overviewGate.greeting());setOverview(true);}}).catch(()=>{});};
    check();const sub=AppState.addEventListener('change',state=>{if(state==='active')check();});
    return()=>{mounted=false;sub.remove();};
  },[ready,data.settings.onboardingCompleted]);
  const sceneBackground=data.settings.onboardingCompleted?t.bg:ONBOARDING_BLUE.paper;
  useEffect(()=>{if(!notice)return;const timer=setTimeout(clearNotice,3000);return()=>clearTimeout(timer);},[notice]);
  useEffect(() => {
    if (Platform.OS !== 'web') {
      Appearance.setColorScheme(data.settings.themeMode === 'system' ? 'unspecified' : data.settings.themeMode);
    }
  }, [data.settings.themeMode]);
  useEffect(() => {
    if (Platform.OS !== 'web') void SystemUI.setBackgroundColorAsync(sceneBackground).catch(() => {});
    else if (typeof document !== 'undefined') document.documentElement.style.colorScheme = t.dark ? 'dark' : 'light';
  }, [t.dark,sceneBackground]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', gap: 20 }}><Text style={{ fontSize: 32, fontWeight: '700', color: t.fg }}>TJMuse</Text>{error ? <Text style={{ padding: 30, color: t.muted }}>{error}</Text> : <ActivityIndicator color={t.accent} />}</View>;
  return <ThemeProvider value={{ ...(t.dark ? DarkTheme : DefaultTheme), colors: { ...(t.dark ? DarkTheme.colors : DefaultTheme.colors), background: t.bg, card: t.bg, text: t.fg, primary: t.accent, border: t.line } }}>
    <View testID="app-backdrop" style={{flex:1,backgroundColor:sceneBackground}}><PlatformSessionHost/><View testID="foreground-app-surface" style={{flex:1,backgroundColor:sceneBackground}}><SheetScene scaleEnabled={data.settings.onboardingCompleted&&!overview}>
    <StatusBar style={!data.settings.onboardingCompleted||t.dark ? 'light' : 'dark'} />
    {DEMO_MODE && data.settings.onboardingCompleted && <View style={{ backgroundColor: t.soft, paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: t.accent, fontSize: 11, fontWeight: '600' }}>TJMuse {APP_VERSION} 演示 · 示例数据</Text><Tap label="重置演示数据" onPress={() => { window.localStorage.removeItem('tjmuse.demo.data.v021'); window.location.href = '/?demo=021'; }}><Text style={{ color: t.muted, fontSize: 11 }}>重置演示</Text></Tap><Tap label="退出演示" onPress={() => { window.sessionStorage.removeItem('tjmuse.demo.v021'); window.location.href = '/'; }}><Text style={{ color: t.muted, fontSize: 11 }}>退出</Text></Tap></View>}
    {data.settings.onboardingCompleted ? <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}><Stack.Screen name="(tabs)" /></Stack> : <OnboardingScreen />}
    {!!notice && <View style={{ position: 'absolute', top: 60, left: 20, right: 20, zIndex: 100, alignItems: 'center' }}><Tap label="关闭提示" onPress={clearNotice} style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, padding: 16, borderRadius: 18, maxWidth: 540, boxShadow: '0px 4px 20px #00000018' }}><Text style={{ color: t.fg, fontSize: 13 }}>{notice}　×</Text></Tap></View>}
    {overview&&data.settings.onboardingCompleted&&<DailyOverviewScreen greeting={greeting} onClose={()=>setOverview(false)}/>}
    </SheetScene></View></View>
  </ThemeProvider>;
}
export default function RootLayout() { return <GestureHandlerRootView style={{flex:1}}><SafeAreaProvider><SheetMotionProvider><AppProvider><LocaleProvider><AppShell /></LocaleProvider></AppProvider></SheetMotionProvider></SafeAreaProvider></GestureHandlerRootView>; }
