import React, { useEffect } from 'react';
import { ActivityIndicator, Appearance, Platform, Text, View } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { Stack, ThemeProvider, DefaultTheme, DarkTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useStore } from '../src/state/store';
import { useTheme } from '../src/ui/theme';
import { Tap } from '../src/ui/components';
function AppShell() {
  const { ready, error, notice, clearNotice } = useStore(), t = useTheme();
  useEffect(() => {
    if (Platform.OS !== 'web') {
      Appearance.setColorScheme(t.dark ? 'dark' : 'light');
      void SystemUI.setBackgroundColorAsync(t.bg).catch(() => {});
    }
  }, [t.dark, t.bg]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', gap: 20 }}><Text style={{ fontSize: 32, fontWeight: '700', color: t.fg }}>TJMuse</Text>{error ? <Text style={{ padding: 30, color: t.muted }}>{error}</Text> : <ActivityIndicator color={t.accent} />}</View>;
  return <ThemeProvider value={{ ...(t.dark ? DarkTheme : DefaultTheme), colors: { ...(t.dark ? DarkTheme.colors : DefaultTheme.colors), background: t.bg, card: t.bg, text: t.fg, primary: t.accent, border: t.line } }}>
    <StatusBar style={t.dark ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}><Stack.Screen name="(tabs)" /></Stack>
    {!!notice && <View style={{ position: 'absolute', top: 60, left: 20, right: 20, zIndex: 100, alignItems: 'center' }}><Tap label="关闭提示" onPress={clearNotice} style={{ backgroundColor: t.surface, borderWidth: 1, borderColor: t.line, padding: 16, borderRadius: 18, maxWidth: 540, boxShadow: '0px 4px 20px #00000018' }}><Text style={{ color: t.fg, fontSize: 13 }}>{notice}　×</Text></Tap></View>}
  </ThemeProvider>;
}
export default function RootLayout() { return <SafeAreaProvider><AppProvider><AppShell /></AppProvider></SafeAreaProvider>; }
