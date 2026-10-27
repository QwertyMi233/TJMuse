import React, { useEffect, useState } from 'react';
import { Image, Linking, Platform, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useStore } from '../state/store';
import { useTheme, isDark } from './theme';
import { ACCENTS, BACKGROUNDS, FOREGROUNDS, uid } from '../core/defaults';
import type { Provider, Settings } from '../core/types';
import { validTime, minutes } from '../core/calendar';
import { completionUrl } from '../services/ai';
import { getApiKey, saveApiKey } from '../services/secrets';
import { requestNotificationPermission } from '../services/notifications';
import { builtIn2026 } from '../services/holidays';
import { Button, Field, Hint, Icon, IconButton, Pill, Sheet, Tap } from './components';
import DateField from './DateField';

export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const { data, updateProfile } = useStore(), t = useTheme();
  const [profile, setProfile] = useState({ ...data.profile }), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const pick = async () => {
    setBusy(true); setError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('请允许访问相册以选择头像。');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: .7, base64: Platform.OS === 'web' });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let uri = asset.uri;
        if (Platform.OS === 'web') uri = asset.base64 ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` : uri;
        else { uri = `${FileSystem.documentDirectory}avatar-${uid()}.jpg`; await FileSystem.copyAsync({ from: asset.uri, to: uri }); }
        setProfile(p => ({ ...p, avatar: uri }));
      }
    } catch (e) { setError(e instanceof Error ? e.message : '无法选择头像。'); }
    finally { setBusy(false); }
  };
  return <Sheet visible title="关于你" subtitle="很高兴，在这里遇见你。" onClose={onClose} footer={<Button title="保存个人资料" busy={busy} onPress={() => { if (!profile.nickname.trim()) return setError('请填写昵称。'); updateProfile({ ...profile, nickname: profile.nickname.trim(), region: profile.region.trim() }); onClose(); }} />}>
    <Tap label="更换头像" onPress={() => { void pick(); }} style={{ alignSelf: 'center', width: 92, height: 92, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: t.soft, overflow: 'hidden' }}>{profile.avatar ? <Image source={{ uri: profile.avatar }} style={{ width: 92, height: 92 }} /> : <Icon name="person-outline" size={36} color={t.accent} />}</Tap>
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}><Pill title="选择照片" selected={false} onPress={() => { void pick(); }} />{!!profile.avatar && <Pill title="移除头像" selected={false} onPress={() => setProfile(p => ({ ...p, avatar: '' }))} />}</View>
    <Field label="昵称" value={profile.nickname} onChangeText={nickname => setProfile(p => ({ ...p, nickname }))} maxLength={30} />
    <Field label="国家 / 地区" value={profile.region} onChangeText={region => setProfile(p => ({ ...p, region }))} maxLength={40} />
    <Text style={{ color: t.muted, fontSize: 12 }}>性别</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['女', '男', '自定义', '不愿透露'].map(gender => <Pill key={gender} title={gender} selected={profile.gender === gender} onPress={() => setProfile(p => ({ ...p, gender }))} />)}</View>
    {(!['女', '男', '不愿透露'].includes(profile.gender)) && <Field label="自定义性别" value={profile.gender === '自定义' ? '' : profile.gender} onChangeText={gender => setProfile(p => ({ ...p, gender }))} maxLength={20} />}
    {!!error && <Hint error>{error}</Hint>}
  </Sheet>;
}

const validHex = (c: string) => /^#[0-9a-fA-F]{6}$/.test(c);
export function ThemeSheet({ onClose }: { onClose: () => void }) {
  const { data, updateSettings } = useStore(), t = useTheme();
  const [foreground, setForeground] = useState(data.settings.foreground), [background, setBackground] = useState(data.settings.background), [accent, setAccent] = useState(data.settings.accent), [error, setError] = useState('');
  const swatches = (colors: string[], value: string, onChange: (c: string) => void) => <View style={{ flexDirection: 'row', gap: 13, flexWrap: 'wrap' }}>{colors.map(c => <Tap key={c} label={`选择颜色 ${c}`} onPress={() => onChange(c)} style={{ width: 36, height: 36, borderRadius: 14, backgroundColor: c, borderWidth: 1, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>{value === c && <Icon name="checkmark" size={19} color={isDark(c) ? '#FFFFFF' : '#243C2D'} />}</Tap>)}</View>;
  return <Sheet visible title="你的颜色" subtitle="为每天的计划，选一种心情。" onClose={onClose} footer={<Button title="应用主题" onPress={() => { if (![foreground, background, accent].every(validHex)) return setError('颜色请使用 #RRGGBB 格式，例如 #416C56。'); if (isDark(foreground) === isDark(background)) return setError('前景与背景颜色过于接近，请选择一深一浅的颜色。'); updateSettings({ foreground, background, accent }); onClose(); }} />}>
    <View style={{ backgroundColor: validHex(background) ? background : t.bg, borderRadius: 23, padding: 23, gap: 10, borderWidth: 1, borderColor: t.line }}><Text style={{ color: validHex(foreground) ? foreground : t.fg, fontSize: 24, fontWeight: '700', letterSpacing: -1 }}>A day, in your color.</Text><Text style={{ color: validHex(accent) ? accent : t.accent, fontSize: 13 }}>每一天，都有自己的颜色。</Text></View>
    <Field label="前景色" value={foreground} onChangeText={setForeground} maxLength={7} autoCapitalize="none" />{swatches(FOREGROUNDS, foreground, setForeground)}
    <Field label="背景色" value={background} onChangeText={setBackground} maxLength={7} autoCapitalize="none" />{swatches(BACKGROUNDS, background, c => { setBackground(c); if (isDark(c) === isDark(foreground)) setForeground(isDark(c) ? '#F2F4EF' : '#202A24'); })}
    <Field label="强调色" value={accent} onChangeText={setAccent} maxLength={7} autoCapitalize="none" />{swatches(ACCENTS, accent, setAccent)}
    {!!error && <Hint error>{error}</Hint>}
  </Sheet>;
}

export function AISettingsSheet({ onClose }: { onClose: () => void }) {
  const { data, updateSettings } = useStore(), t = useTheme();
  const [provider, setProvider] = useState<Provider>(data.settings.provider), [profiles, setProfiles] = useState(data.settings.aiProfiles);
  const [keys, setKeys] = useState<Record<Provider, string>>({ openai: '', deepseek: '', custom: '' }), [show, setShow] = useState(false), [error, setError] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; Promise.all((['openai', 'deepseek', 'custom'] as const).map(async p => [p, await getApiKey(p)] as const)).then(values => { if (active) { setKeys(Object.fromEntries(values) as Record<Provider, string>); setLoading(false); } }).catch(() => { if (active) setError('无法读取安全存储，请关闭后重试。'); }); return () => { active = false; }; }, []);
  const patch = (value: Partial<Settings['aiProfiles'][Provider]>) => setProfiles(p => ({ ...p, [provider]: { ...p[provider], ...value } }));
  const save = async () => {
    setError('');
    try {
      completionUrl(profiles[provider].baseUrl);
      if (!profiles[provider].model.trim()) throw new Error('请填写模型名称。');
      for (const p of Object.values(profiles)) if (!Number.isInteger(p.maxTokens) || p.maxTokens < 64 || p.maxTokens > 32768) throw new Error('输出上限请填写 64–32768 的整数。');
      setBusy(true);
      for (const p of ['openai', 'deepseek', 'custom'] as const) await saveApiKey(p, keys[p].trim());
      updateSettings({ provider, aiProfiles: profiles }); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败。'); }
    finally { setBusy(false); }
  };
  return <Sheet visible title="连接你的 AI" subtitle="你熟悉的模型，读懂你的日常。" onClose={onClose} footer={<Button title="保存 AI 设置" busy={busy || loading} onPress={() => { void save(); }} />}>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{([['openai', 'ChatGPT'], ['deepseek', 'DeepSeek'], ['custom', '自定义']] as const).map(([p, name]) => <Pill key={p} title={name} selected={provider === p} onPress={() => { setProvider(p); setShow(false); }} />)}</View>
    <View style={{ gap: 8 }}><Text style={{ color: t.muted, fontSize: 12, fontWeight: '600' }}>API KEY</Text><View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}><View style={{ flex: 1 }}><Field accessibilityLabel="API Key" placeholder={loading ? '读取安全存储…' : '填入你的 API Key'} value={keys[provider]} onChangeText={v => setKeys(k => ({ ...k, [provider]: v }))} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} editable={!loading} /></View><IconButton icon={show ? 'eye-off-outline' : 'eye-outline'} label={show ? '隐藏密钥' : '显示密钥'} onPress={() => setShow(!show)} color={t.muted} /></View></View>
    <Field label="API BASE URL" placeholder="https://…/v1" value={profiles[provider].baseUrl} onChangeText={baseUrl => patch({ baseUrl })} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
    <Field label="模型名称" placeholder="填入接口支持的模型 ID" value={profiles[provider].model} onChangeText={model => patch({ model })} autoCapitalize="none" autoCorrect={false} />
    <Field label="输出 TOKEN 上限" value={String(profiles[provider].maxTokens || '')} onChangeText={v => patch({ maxTokens: Number(v) })} keyboardType="number-pad" maxLength={5} />
    <Hint>支持 Chat Completions 兼容接口。更换服务商时，请确认模型 ID 和地址。API Key 随服务商分别保存。</Hint>
    <View style={{ padding: 16, backgroundColor: t.soft, borderRadius: 17, flexDirection: 'row', gap: 10 }}><Icon name="shield-checkmark-outline" size={19} color={t.accent} /><View style={{ flex: 1 }}><Hint>{Platform.OS === 'web' ? '网页版密钥仅保留在当前会话内，刷新页面后需要重新填写。' : '密钥保存在设备的系统安全存储中。'}进入 AI 页时，当天任务和自由事项会发送给所选服务商。每次生成可能产生 API 费用。</Hint></View></View>
    {!!error && <Hint error>{error}</Hint>}
  </Sheet>;
}

export function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const { data, updateSettings } = useStore(), t = useTheme();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const toggle = async (key: 'todoNotifications' | 'courseNotifications', enabled: boolean) => {
    setError(''); setBusy(true);
    try { if (enabled) await requestNotificationPermission(); updateSettings({ [key]: enabled }); }
    catch (e) { setError(e instanceof Error ? e.message : '无法开启提醒。'); }
    finally { setBusy(false); }
  };
  return <Sheet visible title="轻轻提醒你" subtitle="重要的事，在合适的时候想起。" onClose={onClose}>
    {([['todoNotifications', 'To-do 通知', '按任务开始时间提醒'], ['courseNotifications', '课程通知', '为后续课表功能保留']] as const).map(([key, title, detail]) => <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}><View style={{ flex: 1, gap: 5 }}><Text style={{ color: t.fg, fontSize: 15, fontWeight: '600' }}>{title}</Text><Text style={{ color: t.muted, fontSize: 12 }}>{detail}</Text></View><Switch accessibilityLabel={title} disabled={busy} value={data.settings[key]} onValueChange={v => { void toggle(key, v); }} trackColor={{ false: t.line, true: t.accent }} /></View>)}
    <Text style={{ color: t.muted, fontSize: 12 }}>提前提醒</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[0, 5, 10, 15, 30].map(value => <Pill key={value} title={value === 0 ? '准时' : `${value} 分钟`} selected={data.settings.reminderMinutes === value} onPress={() => updateSettings({ reminderMinutes: value })} />)}</View>
    <Hint>提醒使用设备本地时间。保存任务或重新打开 App 时，会更新未来 60 天内最近的 48 条提醒。系统省电设置可能影响送达时间。</Hint>
    {Platform.OS !== 'web' && <Button title="打开系统设置" secondary onPress={() => { void Linking.openSettings().catch(() => setError('无法打开系统设置。')); }} />}
    {!!error && <Hint error>{error}</Hint>}
  </Sheet>;
}

export function CalendarSettingsSheet({ onClose }: { onClose: () => void }) {
  const { data, updateSettings } = useStore(), t = useTheme();
  const [start, setStart] = useState(data.settings.dayStart), [end, setEnd] = useState(data.settings.dayEnd), [first, setFirst] = useState(data.settings.weekStartsOn), [error, setError] = useState('');
  return <Sheet visible title="日历与作息" subtitle="按你的习惯，展开一周。" onClose={onClose} footer={<Button title="保存设置" onPress={() => { if (!validTime(start) || !validTime(end) || minutes(start) >= minutes(end)) return setError('可安排时间的结束时间需晚于开始时间。'); updateSettings({ weekStartsOn: first, dayStart: start, dayEnd: end }); onClose(); }} />}>
    <Text style={{ color: t.muted, fontSize: 12 }}>每周第一天</Text><View style={{ flexDirection: 'row', gap: 10 }}><Pill title="周一" selected={first === 1} onPress={() => setFirst(1)} /><Pill title="周日" selected={first === 0} onPress={() => setFirst(0)} /></View>
    <View style={{ flexDirection: 'row', gap: 12 }}><DateField mode="time" label="可安排时间 · 开始" value={start} onChange={setStart} /><DateField mode="time" label="可安排时间 · 结束" value={end} onChange={setEnd} /></View>
    <Hint>AI 会参考这段时间安排自由事项，并保留固定任务原来的时间。修改周起始日不会改变已创建循环任务的周期。</Hint>
    {!!error && <Hint error>{error}</Hint>}
  </Sheet>;
}

export function HolidaySettingsSheet({ onClose }: { onClose: () => void }) {
  const { data, updateSettings, syncHolidays } = useStore(), t = useTheme();
  const [year, setYear] = useState(String(new Date().getFullYear())), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const sync = async () => {
    setMessage(''); setError('');
    if (!/^20\d{2}$/.test(year)) return setError('请输入 2000–2099 范围内的年份。');
    setBusy(true);
    try { await syncHolidays(Number(year)); setMessage(`${year} 年调休数据已更新。`); }
    catch (e) { setError(e instanceof Error ? e.message : '同步失败，已保留本地数据。'); }
    finally { setBusy(false); }
  };
  const sources = data.holidays[year]?.papers || (year === '2026' ? builtIn2026.papers : []);
  return <Sheet visible title="中国大陆调休" subtitle="把休息日与补班日，放进日历里。" onClose={onClose}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: t.fg, fontSize: 15 }}>在日历与 AI 规划中显示</Text><Switch accessibilityLabel="显示中国大陆调休" value={data.settings.holidayEnabled} onValueChange={holidayEnabled => updateSettings({ holidayEnabled })} trackColor={{ false: t.line, true: t.accent }} /></View>
    <Field label="同步年份" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} />
    <Button title="获取 / 更新调休信息" busy={busy} icon="sync-outline" onPress={() => { void sync(); }} />
    <Hint>已内置 2026 年国务院公布的放假调休安排。网络同步使用 holiday-cn 开源数据，并缓存在设备；未公布或获取失败的年份不会推测补班日期。</Hint>
    <Hint>上次网络同步：{data.lastHolidaySync ? new Date(data.lastHolidaySync).toLocaleString('zh-CN') : '尚未同步，使用内置数据'}</Hint>
    {!!message && <Hint>{message}</Hint>}{!!error && <Hint error>{error}</Hint>}
    {sources.map((url, i) => <Tap key={url} label="查看调休数据来源" onPress={() => { void Linking.openURL(url).catch(() => setError('无法打开来源链接。')); }} style={{ paddingVertical: 12 }}><Text style={{ color: t.accent, fontSize: 13 }}>查看原始公告 {sources.length > 1 ? i + 1 : ''} ↗</Text></Tap>)}
  </Sheet>;
}
