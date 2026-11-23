import React, { useCallback, useEffect, useRef, useState } from 'react';
import {Linking,Platform,ScrollView,View} from 'react-native';
import Text from '../ui/LocalizedText';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../ui/theme';
import { useStore } from '../state/store';
import { Button, Checkbox, Field, Hint, Icon, IconButton, Pill, Sheet, Tap } from '../ui/components';
import {runOfficialSession,WebSessionError} from '../services/web-session';
import { canvasSettingsUrl } from '../core/canvas-api';
import { homeworkCompleted, homeworkStartText } from '../core/homework';
import SubmittedHomeworkToggle from '../ui/SubmittedHomeworkToggle';
import AssignmentSheet from '../ui/AssignmentSheet';
import HomeworkTrashSheet from '../ui/HomeworkTrashSheet';
import type { CanvasAssignment } from '../core/types';
import { allHomework, allHomeworkPreferences, assignmentPlatform, platformName, type PlatformSyncResult } from '../core/platforms';
import CanvasRenewalSheet from '../ui/CanvasRenewalSheet';
import { DEMO_MODE } from '../services/demo-mode';
import PlatformAccountSettingsSheet from '../ui/PlatformAccountSettingsSheet';
import ZhixuemengSettingsSheet from '../ui/ZhixuemengSettingsSheet';
import HomeworkDisplaySettings from '../ui/HomeworkDisplaySettings';
import {useSheetDismiss} from '../ui/useSheetDismiss';
import {createCanvasBrowserFlow} from '../core/canvas-browser-flow';

export default function HomeworkScreen({settingsOnly=false,onClose}:{settingsOnly?:boolean;onClose?:()=>void}={}) {
  const [displaySettings,setDisplaySettings]=useState(false),[canvasBrowsing,setCanvasBrowsing]=useState(false),[canvasOpening,setCanvasOpening]=useState(false);
  const [selectedEditing,setSelectedEditing]=useState(false);
  const store = useStore(), t = useTheme(), canvas = store.data.canvas;
  const [base, setBase] = useState(canvas.baseUrl), [token, setToken] = useState(''), [showToken, setShowToken] = useState(false), [settings, setSettings] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(false), [selected, setSelected] = useState<CanvasAssignment | null>(null);
  const closeMenus=()=>{setDisplaySettings(false);setSettings(false);setConfirm(false);setRenewal(false);setZxmSettings(false);setHaokeSettings(false);setShowDeleted(false);setToken('');setShowToken(false);setError('');onClose?.();};
  const {closeRef,dismiss}=useSheetDismiss(closeMenus);
  const sync = useCallback(() => { setError(''); void store.syncCanvas().catch(e => setError(e.message)); }, [store.syncCanvas]);
  const [showDeleted, setShowDeleted] = useState(false),[platformsOpen,setPlatformsOpen]=useState(true);
  const [renewal, setRenewal] = useState(false), [allBusy, setAllBusy] = useState(false), [results, setResults] = useState<PlatformSyncResult[]>([]);
  const [haokeSettings, setHaokeSettings] = useState(false), [source, setSource] = useState<'all' | 'canvas' | 'haoke' | 'zhixuemeng'>('all');
  const [zxmSettings,setZxmSettings]=useState(false);
  const haoke = store.data.haoke,browserFlow=useRef<ReturnType<typeof createCanvasBrowserFlow>|null>(null);
  useEffect(()=>()=>browserFlow.current?.dispose(),[]);
  useEffect(()=>{if(!error||settings||haokeSettings)return;const timer=setTimeout(()=>setError(''),3000);return()=>clearTimeout(timer);},[error,settings]);
  const syncAll = async () => { setAllBusy(true); setResults([]); try { setResults(await store.syncAllHomework()); } finally { setAllBusy(false); } };
  const haokeAction = async (action: () => Promise<void>) => { setError(''); try { await action(); setHaokeSettings(false); } catch (e) { setError(e instanceof Error ? e.message : '好课连接失败。'); } };
  const connect = async () => {
    setError(''); setBusy(true);
    try { await store.connectCanvas(base, token); dismiss(closeMenus); }
    catch (e) { setError(e instanceof Error ? e.message : '连接失败，请重试。'); }
    finally { setBusy(false); }
  };
  const disconnect = async () => {
    setBusy(true); setError('');
    try { await store.disconnectCanvas(); dismiss(closeMenus); }
    catch (e) { setError(e instanceof Error ? e.message : '无法清除令牌，请重试。'); }
    finally { setBusy(false); }
  };
  const openSettings = () => {
    if(browserFlow.current?.active)return;
    try {
      const url=canvasSettingsUrl(base);setError('');
      browserFlow.current=createCanvasBrowserFlow({
        dismiss,hideSettings:()=>{setSettings(false);setCanvasBrowsing(true);},
        restoreSettings:()=>{setCanvasBrowsing(false);setSettings(true);},opening:setCanvasOpening,
        onCancel:()=>{setCanvasBrowsing(false);closeMenus();},
        onError:e=>setError(e instanceof Error?e.message:'连接失败，请重试。'),
        open:(signal,onPresented)=>runOfficialSession({kind:'canvas-browser',config:{url},signal,onPresented}),
        onResult:async result=>{if(result.token){await store.connectCanvas(base,result.token);setToken('');setError('');}},
        cancelError:()=>new WebSessionError('cancelled'),openingError:()=>new WebSessionError('busy'),
        isCancelled:e=>e instanceof WebSessionError&&e.code==='cancelled',
      });
      browserFlow.current.start();
    } catch(e){setError((e as Error).message);}
  };
  const closeSettings = closeMenus;
  const preferences = allHomeworkPreferences(store.data);
  const assignments = allHomework(store.data).filter(a => !preferences[a.id]?.deleted && (source === 'all' || assignmentPlatform(a) === source)).sort((a,b)=>Number(homeworkCompleted(a))-Number(homeworkCompleted(b))||(a.dueAt||'9999').localeCompare(b.dueAt||'9999'));
  const deleted = allHomework(store.data).filter(a => preferences[a.id]?.deleted);
  const submittedCount = assignments.filter(a => a.submitted === true).length;
  const visibleAssignments = assignments;
  const platformContent=<>
    {!settingsOnly&&<Button title="一键同步所有平台作业" icon="sync-outline" busy={allBusy} disabled={store.canvasSyncing||store.haokeSyncing||store.zhixuemengSyncing||!canvas.connected&&!haoke.connected&&!store.data.zhixuemeng.connected} onPress={()=>void syncAll()}/>}
    <Tap label={platformsOpen?'折叠作业平台':'展开作业平台'} onPress={()=>setPlatformsOpen(v=>!v)} style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingVertical:12}}><Text style={{color:t.fg,fontSize:17,fontWeight:'600'}}>作业平台</Text><Icon name={platformsOpen?'chevron-up':'chevron-down'} size={18}/></Tap>
    {platformsOpen&&(['canvas','haoke','zhixuemeng'] as const).map(platform=>{const isCanvas=platform==='canvas',value=store.data[platform],name=platformName(platform);return <View key={platform} testID={`platform-${platform}`} style={{padding:16,borderRadius:22,backgroundColor:t.soft,flexDirection:'row',alignItems:'center',gap:12}}>
      <Icon name={isCanvas?'school-outline':'layers-outline'} color={t.accent}/><View style={{flex:1,gap:6}}><Text style={{color:t.fg,fontSize:16,fontWeight:'600'}}>{name}</Text><Text style={{color:t.muted,fontSize:11}}>{value.baseUrl.replace(/^https?:\/\//,'')}</Text></View>
      <IconButton dismiss={settingsOnly} icon={settingsOnly?'settings-outline':'sync-outline'} label={settingsOnly?`${name}设置`:`同步${name}作业`} color={t.accent} onPress={()=>{if(settingsOnly){if(isCanvas){setBase(canvas.baseUrl);setSettings(true);}else if(platform==='zhixuemeng')setZxmSettings(true);else setHaokeSettings(true);}else if(value.connected){if(isCanvas)sync();else if(platform==='zhixuemeng')void store.syncZhixuemeng().catch(e=>setError(e.message));else void haokeAction(store.syncHaoke);}else setError('请在“我的 → 作业设置”中连接平台。');}}/>
    </View>;})}
    {!!results.length&&<Hint>{results.map(r=>`${platformName(r.platform)} · ${r.message}`).join('\n')}</Hint>}
    {!!error&&<Hint error>{error}</Hint>}
  </>;
  return <> {!settingsOnly&&<SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: t.bg }}>
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 30, paddingBottom: Platform.OS === 'android' ? 35 : 130, gap: 22, width: '100%', maxWidth: 760, alignSelf: 'center' }}>
      <View style={{ gap: 9 }}><Text style={{ fontSize: 11, letterSpacing: 2, color: t.muted }}>HOMEWORK</Text><Text style={{ fontSize: 34, fontWeight: '700', color: t.fg }}>作业</Text></View>
      {platformContent}
      <View style={{ flexDirection: 'row', flexWrap:'wrap',gap: 8 }}>{([['all','全部平台'],['canvas','Canvas'],['haoke','好课'],['zhixuemeng','智学盟']] as const).map(([key,title]) => <Pill key={key} title={title} selected={source === key} onPress={() => setSource(key)} />)}</View>
      {canvas.connected && !assignments.length && <Hint>{canvas.lastSync ? '当前可见课程中暂无作业。' : '连接后将自动同步，也可点击同步重试。'}</Hint>}

      {visibleAssignments.map(a => <View key={a.id} style={{ borderWidth: 1, borderColor: t.line, backgroundColor: t.surface, borderRadius: 20, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Checkbox checked={homeworkCompleted(a)} onPress={() => store.toggleHomework(a.id)} label={`${homeworkCompleted(a) ? '取消完成' : '完成'}作业 ${a.title}`} />
        <Tap label={`查看作业 ${a.title}`} onPress={() => {setSelectedEditing(false);setSelected(a);}} style={{ flex: 1, gap: 7 }}><Text translate={false} style={{ color: t.fg, fontSize: 14, fontWeight: '600' }}>{a.title}</Text><Text style={{ color: t.muted, fontSize: 11 }}>{a.courseName} · {platformName(assignmentPlatform(a))}{preferences[a.id]?.temporaryDisabled?' · 临时禁用':''}{preferences[a.id]?.localEdit?' · 本机临时安排':''}</Text><Text style={{ color: t.muted, fontSize: 11 }}>{homeworkStartText(a)}</Text><Text style={{ color: t.accent, fontSize: 11 }}>截止：{a.dueAt ? new Date(a.dueAt).toLocaleString('zh-CN') : '未设置'}{a.submitted ? ' · 已提交' : ''}</Text></Tap>
        <IconButton icon="ellipsis-horizontal" label={`编辑作业 ${a.title}`} onPress={()=>{setSelectedEditing(true);setSelected(a);}} color={t.muted} style={{width:32}}/>
      </View>)}
      <Button dismiss title={`查看已删除作业（${deleted.length}）`} secondary onPress={() => setShowDeleted(true)} />
      <Hint>每次打开 App 或从后台返回时，自动在后台同步已连接平台；也可随时手动同步。同步失败保留已有作业，不会弹出登录页打断使用。</Hint>
      <Hint>有截止时间默认显示，无截止时间默认隐藏。点开每份作业可修改显示选择或本机删除，全局规则在“我的 → 作业设置 → 作业显示设置”中调整。本机勾选不代替 Canvas 提交。</Hint>
    </ScrollView></SafeAreaView>}
    {settingsOnly&&!canvasBrowsing&&!zxmSettings&&!settings&&!renewal&&!haokeSettings&&!showDeleted&&!displaySettings&&<Sheet key="homework-settings" visible title="作业设置" onClose={onClose||(()=>{})}>
      {platformContent}
      <Button dismiss title="作业显示设置" secondary onPress={()=>setDisplaySettings(true)}/>

      <Button title={`查看已删除作业（${deleted.length}）`} secondary onPress={()=>setShowDeleted(true)}/>
      <Hint>每次打开 App 或返回前台时同步已连接平台，也可手动一键同步。设置与作业页共用。</Hint>
    </Sheet>}
    {displaySettings&&<Sheet key="homework-display" visible title="作业显示设置" onClose={closeMenus}><HomeworkDisplaySettings/></Sheet>}
    {settings && <Sheet key="canvas-settings" closeRef={closeRef} visible title={confirm ? '断开 Canvas？' : 'Canvas 设置'} onClose={closeSettings} footer={confirm ? <View style={{ gap: 10 }}><Button title="确认" busy={busy} onPress={() => { void disconnect(); }} /><Button title="保留连接" secondary disabled={busy} onPress={() => setConfirm(false)} /></View> : <Button title="验证令牌并同步" busy={busy} disabled={!token.trim()} onPress={() => { void connect(); }} />}>
      {confirm ? <Hint>将清除本机令牌和作业缓存。如需撤销令牌，请在 Canvas 用户设置中删除对应的访问许可证。</Hint> : <>
      <Field label="Canvas 网站地址" placeholder="https://canvas.tongji.edu.cn/" value={base} onChangeText={setBase} autoCapitalize="none" autoCorrect={false} keyboardType="url" editable={!busy} />
      <Button title="打开网页，读取并保存令牌" secondary onPress={openSettings} busy={canvasOpening} disabled={busy} />

      <Field label="粘贴令牌" placeholder={canvas.connected ? '粘贴新令牌以更新连接' : '粘贴 Canvas 生成的访问令牌'} value={token} onChangeText={setToken} secureTextEntry={!showToken} autoCapitalize="none" autoCorrect={false} textContentType="none" autoComplete="off" editable={!busy} />
      <Tap dismiss label="自动更换令牌" onPress={()=>{setSettings(false);setRenewal(true);}} style={{paddingVertical:14,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{color:t.fg}}>自动更换令牌</Text><Text style={{color:t.muted}}>{canvas.renewal?.enabled?'已开启':'未开启'} ›</Text></Tap>

      <Hint>{Platform.OS === 'web' ? '网页仅在内存中使用令牌，刷新后需要重新填写。学校可能限制跨域请求，请使用 iOS／Android App 完成同步。' : '令牌保存在本机系统安全存储中。应用使用令牌直接读取 Canvas；更换同一账户的令牌会保留已勾选状态。'}</Hint>
      {canvas.connected && <Tap label="断开 Canvas 连接" onPress={()=>{if(!busy)setConfirm(true);}} style={{padding:16,alignItems:'center',backgroundColor:'#D4404012',borderRadius:16}}><Text style={{color:'#D44040',fontWeight:'600'}}>断开 Canvas 连接</Text></Tap>}
      </>}
      {!!error && <Hint error>{error}</Hint>}
    </Sheet>}
    {canvasOpening&&!settings&&<View testID="canvas-browser-opening" style={{position:'absolute',bottom:100,left:24,right:24,padding:18,gap:12,borderRadius:20,backgroundColor:t.surface,borderWidth:1,borderColor:t.line}}><Hint>正在打开官方登录页…</Hint><Button title="取消连接" secondary onPress={()=>browserFlow.current?.cancel()}/></View>}
    {selected && <AssignmentSheet assignment={selected} initialEditing={selectedEditing} onClose={() => setSelected(null)} />}
    {showDeleted && <HomeworkTrashSheet onClose={closeMenus} />}
    {renewal && <CanvasRenewalSheet onClose={closeMenus} />}
    {zxmSettings&&<ZhixuemengSettingsSheet onClose={closeMenus}/>}
    {haokeSettings&&<PlatformAccountSettingsSheet platform="haoke" onClose={closeMenus}/>}
  </>;
}
