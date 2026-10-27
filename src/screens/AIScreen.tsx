import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { SvgXml } from 'react-native-svg';
import { useStore } from '../state/store';
import { useTheme } from '../ui/theme';
import { dateKey } from '../core/calendar';
import type { FlexibleTask, Message } from '../core/types';
import { uid } from '../core/defaults';
import { requestAI } from '../services/ai';
import { getApiKey } from '../services/secrets';
import { Button, Checkbox, Fab, Hint, Icon, IconButton, Tap } from '../ui/components';
import FlexibleEditor from '../ui/FlexibleEditor';
import openaiLogo from '../assets/openai';
import deepseekLogo from '../assets/deepseek';

type ChatInput = Pick<Message, 'role' | 'content'>[];
export default function AIScreen() {
  const store = useStore(), t = useTheme(), current = useRef(store); current.current = store;
  const [text, setText] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState(''), [missingKey, setMissingKey] = useState(false), [editor, setEditor] = useState<FlexibleTask | 'new' | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null), controller = useRef<AbortController | null>(null), generation = useRef(0), busyRef = useRef(false), retryHistory = useRef<ChatInput>([]);
  const today = dateKey(new Date()), messages = store.data.messages.filter(m => m.date === today);
  const provider = store.data.settings.provider;
  const run = useCallback(async (history: ChatInput) => {
    const token = ++generation.current;
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    busyRef.current = true; setBusy(true); setError(''); setMissingKey(false); retryHistory.current = history;
    try {
      const snapshot = current.current;
      const key = await getApiKey(snapshot.data.settings.provider);
      if (token !== generation.current) return;
      if (!key) { setMissingKey(true); return; }
      const reply = await requestAI(snapshot.data, key, history, snapshot.getHoliday(dateKey(new Date())), abort.signal);
      if (token !== generation.current || abort.signal.aborted) return;
      snapshot.addMessages([{ id: uid(), role: 'assistant', content: reply, date: dateKey(new Date()), createdAt: new Date().toISOString() }]);
    } catch (e) { if (token === generation.current && !abort.signal.aborted) setError(e instanceof Error ? e.message : 'AI 请求失败，请重试。'); }
    finally { if (token === generation.current) { busyRef.current = false; setBusy(false); } }
  }, []);
  useFocusEffect(useCallback(() => {
    void run([{ role: 'user', content: '请基于最新任务和当前时间，重新生成今天的时间规划。' }]);
    return () => { generation.current++; controller.current?.abort(); busyRef.current = false; setBusy(false); };
  }, [run]));
  const send = () => {
    if (!text.trim() || busyRef.current) return;
    const question: Message = { id: uid(), role: 'user', content: text.trim(), date: today, createdAt: new Date().toISOString() };
    store.addMessages([question]); setText('');
    void run([...messages.map(({ role, content }) => ({ role, content })), question]);
  };
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.bg }}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center', paddingBottom: Platform.OS === 'android' ? 0 : 98 }}>
      <View style={{ flex: 2, minHeight: 270, paddingTop: 20, paddingHorizontal: 23 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
          <Tap label="打开 AI 设置" onPress={() => router.navigate({ pathname: '/me', params: { settings: 'ai' } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: provider === 'deepseek' ? '#173A7C' : provider === 'openai' ? '#151818' : t.accent, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24 }}>
            {provider !== 'custom' ? <SvgXml xml={(provider === 'openai' ? openaiLogo : deepseekLogo).replace(/currentColor/g, '#FFFFFF')} width={21} height={21} color="#FFFFFF" /> : <Icon name="sparkles" size={18} color="#FFFFFF" />}
            <Text style={{ fontSize: 14, color: '#FFFFFF', fontWeight: '600' }}>{provider === 'openai' ? 'ChatGPT' : provider === 'deepseek' ? 'DeepSeek' : '自定义 AI'}</Text><Icon name="chevron-down" size={12} color="#FFFFFF99" />
          </Tap>
          <IconButton icon="refresh-outline" label="重新生成今日规划" onPress={() => { if (!busyRef.current) void run([{ role: 'user', content: '请基于最新任务和当前时间，重新生成今天的时间规划。' }]); }} color={t.muted} />
        </View>
        <Text numberOfLines={1} style={{ fontSize: 9, lineHeight: 14, minHeight: 14, flexShrink: 0, letterSpacing: 1.2, color: t.muted, marginLeft: 5, marginBottom: 10 }}>YOUR DAY, A LITTLE MORE IN TUNE · {store.data.settings.aiProfiles[provider].model || '选择模型'}</Text>
        <ScrollView ref={scroll} style={{ flex: 1, minHeight: 0 }} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 18, paddingTop: 8, paddingBottom: 20 }} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {!messages.length && !busy && !missingKey && !error && <View style={{ alignItems: 'center', paddingVertical: 25, gap: 12 }}><Icon name="sparkles-outline" size={32} color={t.accent} /><Text style={{ color: t.fg, fontSize: 20, fontWeight: '600' }}>把时间，留给你在意的事</Text><Hint>从今天的待办开始，一起理清节奏。</Hint></View>}
          {messages.map(message => <View key={message.id} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'stretch', maxWidth: message.role === 'user' ? '88%' : '100%', backgroundColor: message.role === 'user' ? t.soft : 'transparent', borderRadius: 20, paddingHorizontal: message.role === 'user' ? 15 : 2, paddingVertical: message.role === 'user' ? 11 : 0, gap: 7 }}>
            {message.role === 'assistant' && <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><Icon name="sparkles" size={12} color={t.accent} /><Text style={{ color: t.accent, fontSize: 10, fontWeight: '600' }}>Muse 的时间提案</Text></View>}
            <Text selectable style={{ fontSize: 13, lineHeight: 23, color: t.fg }}>{message.content}</Text>
          </View>)}
          {busy && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}><ActivityIndicator size="small" color={t.accent} /><Text style={{ fontSize: 12, color: t.muted }}>正在为今天寻找合适的节奏…</Text><IconButton icon="stop-circle-outline" label="停止生成" onPress={() => { generation.current++; controller.current?.abort(); busyRef.current = false; setBusy(false); }} color={t.muted} /></View>}
          {missingKey && <View style={{ backgroundColor: t.soft, padding: 21, borderRadius: 22, gap: 15 }}><Icon name="sparkles-outline" size={27} color={t.accent} /><Text style={{ color: t.fg, fontSize: 21, lineHeight: 29, fontWeight: '600', letterSpacing: -.5 }}>让今天，{`\n`}有自己的节奏。</Text><Hint>连接你的 AI，结合当天待办与自由事项，生成具体到分钟的时间提案。</Hint><Button title="连接我的 AI" icon="arrow-forward" onPress={() => router.navigate({ pathname: '/me', params: { settings: 'ai' } })} /></View>}
          {!!error && <View style={{ gap: 9, padding: 15, backgroundColor: t.surface, borderRadius: 18 }}><Hint error>{error}</Hint><Button title="重试" secondary onPress={() => { void run(retryHistory.current); }} /></View>}
        </ScrollView>
        <View style={{ marginTop: 8, marginBottom: 17, minHeight: 53, flexShrink: 0, borderWidth: 1, borderColor: t.line, borderRadius: 24, backgroundColor: t.surface, paddingLeft: 16, paddingRight: 5, flexDirection: 'row', alignItems: 'center' }}>
          <TextInput accessibilityLabel="和 AI 聊聊安排" value={text} onChangeText={setText} placeholder="聊聊今天的安排…" placeholderTextColor={t.muted} style={{ flex: 1, color: t.fg, fontSize: 13, paddingVertical: 14, maxHeight: 100 }} maxLength={4000} multiline onSubmitEditing={send} />
          <Tap label="发送消息" disabled={!text.trim() || busy || missingKey} onPress={send} style={{ width: 35, height: 35, borderRadius: 18, backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center', margin: 3 }}><Icon name="arrow-up" size={20} color={t.onAccent} /></Tap>
        </View>
      </View>
      <View style={{ flex: 1, minHeight: 145, borderTopWidth: 1, borderColor: t.line, paddingHorizontal: 23, paddingTop: 17 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}><View style={{ gap: 5 }}><Text style={{ fontSize: 16, fontWeight: '600', color: t.fg, letterSpacing: -.4 }}>慢慢实现的小事</Text><Text style={{ color: t.muted, fontSize: 10 }}>可自行安排且无时限的事项。</Text></View><Fab small label="添加自由事项" onPress={() => setEditor('new')} /></View>
        <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ paddingBottom: 14, gap: 6 }}>
          {!store.data.flexibleTasks.length && <Tap label="添加第一件自由事项" onPress={() => setEditor('new')} style={{ paddingVertical: 24, flexDirection: 'row', gap: 13, alignItems: 'center' }}><Icon name="flower-outline" size={26} color={t.muted} /><Text style={{ fontSize: 11, color: t.muted, lineHeight: 19 }}>一本想读的书，一次想去的散步。{`\n`}不着急，先把它记下来。</Text></Tap>}
          {store.data.flexibleTasks.map(task => <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderColor: t.line, gap: 7, opacity: task.completed ? .5 : 1 }}><Checkbox checked={task.completed} onPress={() => store.toggleFlexible(task.id)} label={`完成自由事项 ${task.title}`} /><Tap label={`编辑自由事项 ${task.title}`} onPress={() => setEditor(task)} style={{ flex: 1, gap: 4 }}><Text numberOfLines={1} style={{ color: t.fg, fontSize: 13, fontWeight: '600', textDecorationLine: task.completed ? 'line-through' : 'none' }}>{task.title}</Text>{!!task.description && <Text numberOfLines={1} style={{ color: t.muted, fontSize: 10 }}>{task.description}</Text>}</Tap><IconButton icon="ellipsis-horizontal" label={`更多 ${task.title}`} onPress={() => setEditor(task)} color={t.muted} /></View>)}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
    {editor && <FlexibleEditor task={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} />}
  </SafeAreaView>;
}
