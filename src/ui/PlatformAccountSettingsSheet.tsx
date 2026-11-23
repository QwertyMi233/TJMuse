import React,{useEffect,useRef,useState} from 'react';
import {Platform,View} from 'react-native';
import {useStore} from '../state/store';
import {haokeStudentLogin} from '../services/haoke-credentials';
import {zhixuemengLogin} from '../services/zhixuemeng-credentials';
import type {TongjiLoginStatus} from '../core/tongji-login';
import {DEMO_MODE} from '../services/demo-mode';
import {Button,Checkbox,Field,Hint,Sheet} from './components';
import Text from './LocalizedText';
import {useTheme} from './theme';
import {WebSessionError} from '../services/web-session';
import {useSheetDismiss} from './useSheetDismiss';

export default function PlatformAccountSettingsSheet({platform,onClose}:{platform:'haoke'|'zhixuemeng';onClose:()=>void}){
 const {closeRef,dismiss}=useSheetDismiss(onClose);
 const store=useStore(),t=useTheme(),state=store.data[platform],haoke=platform==='haoke',name=haoke?'好课':'智学盟',service=haoke?haokeStudentLogin:zhixuemengLogin;
 const syncing=haoke?store.haokeSyncing:store.zhixuemengSyncing,cancel=haoke?store.cancelHaoke:store.cancelZhixuemeng;
 const [mode,setMode]=useState<'connection'|'login'|'opening'|'disconnect'>('connection'),[account,setAccount]=useState(DEMO_MODE?'20260001':''),[password,setPassword]=useState(DEMO_MODE?'demo-only-password':''),[consent,setConsent]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState<TongjiLoginStatus|null>(null);
 const alive=useRef(true),launch=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;clearTimeout(launch.current);};},[]);
 useEffect(()=>{const refresh=()=>{void service.status().then(s=>{if(alive.current)setStatus(s);}).catch(()=>{});};refresh();return service.subscribe(refresh);},[service,state.lastSync,syncing]);
 const run=async(work:()=>Promise<void>)=>{setBusy(true);setError('');try{await work();if(alive.current)setStatus(await service.status());}catch(e){if(alive.current)setError(e instanceof Error?e.message:'连接未完成。');}finally{if(alive.current)setBusy(false);}};
 const background=()=>{const work=haoke?store.connectHaoke(true):store.connectZhixuemeng(true);void work.catch(e=>{if(alive.current)setError(e.message);});};
 const save=()=>void run(async()=>{await service.save(account,password,consent);setAccount('');setPassword('');setConsent(false);background();});
 const manual=()=>{let cancelled=false;setError('');setMode('opening');launch.current=setTimeout(()=>{launch.current=undefined;void (haoke?store.connectHaoke():store.connectZhixuemeng()).catch(e=>{cancelled=e instanceof WebSessionError&&e.code==='cancelled';if(alive.current){if(cancelled)onClose();else setError(e.message);}}).finally(()=>{if(alive.current&&!cancelled)setMode('connection');});},350);};
 if(mode==='opening')return <View style={{position:'absolute',bottom:100,left:24,right:24,padding:18,gap:12,borderRadius:20,backgroundColor:t.surface,borderWidth:1,borderColor:t.line}}><Hint>正在打开官方登录页…</Hint><Button title="取消连接" secondary onPress={()=>{clearTimeout(launch.current);cancel();setMode('connection');}}/></View>;
 return <Sheet key={mode} closeRef={closeRef} visible size={mode==='login'?'large':'content'} title={mode==='login'?`${name}自动登录`:mode==='disconnect'?`断开${name}连接？`:`${name}连接设置`} onClose={onClose}>
  {mode==='disconnect'?<><Hint>清除本平台连接、作业缓存及本机自动登录信息，其他平台保留。</Hint><Button title={`确认断开${name}`} busy={busy} onPress={()=>void run(async()=>{await (haoke?store.disconnectHaoke():store.disconnectZhixuemeng());dismiss(onClose);})}/><Button dismiss title="保留连接" secondary onPress={()=>setMode('connection')}/></>:<>
   <Text translate={false} style={{color:t.muted}}>{state.baseUrl.replace(/^https?:\/\//,'')}</Text>
   <View style={{padding:16,backgroundColor:t.soft,borderRadius:18,gap:8}}><Text style={{color:t.fg,fontWeight:'600'}}>{status?.enabled?'已开启后台自动登录':'尚未保存自动登录账号'}</Text>{status?.enabled&&<Hint>{status.studentId} · {status.state==='needs-user'?'需要验证或更新密码':'准备就绪'}</Hint>}{syncing&&<Hint>正在后台登录并同步作业…</Hint>}{state.lastSync&&<Hint>最近同步：{new Date(state.lastSync).toLocaleString()}</Hint>}</View>
   {mode==='login'?<>
    <Field label={haoke?'学号／教师工号':'智学盟账号'} value={account} onChangeText={setAccount} autoCapitalize="none" autoCorrect={false} autoComplete="username" textContentType="username" keyboardType={haoke?'number-pad':'default'} maxLength={haoke?20:128}/>
    <Field label="登录密码" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password" maxLength={128}/>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Checkbox label="同意仅在本机安全保存账号密码" checked={consent} onPress={()=>setConsent(v=>!v)}/><Text style={{flex:1,color:t.fg,fontSize:13}}>同意仅在本机安全保存账号密码，用于后台自动登录。</Text></View>
    <Hint>保存后自动在后台登录并同步作业。每次打开 App 或返回前台时自动检查并恢复登录。</Hint>
    {haoke&&<Hint>自动选择学号登录、同济大学及“一周内自动登录”。</Hint>}
    <Button title="保存并启用自动登录" busy={busy} disabled={!consent||Platform.OS==='web'&&!DEMO_MODE} onPress={save}/>
    {status?.state==='needs-user'&&<Button title="允许再次尝试自动登录" secondary onPress={()=>void run(async()=>{await service.retry();background();})}/>}
    {status?.enabled&&<Button title="关闭并删除本机登录信息" secondary onPress={()=>void run(service.clear)}/>}
   </>:<><Button dismiss title="账号自动登录设置" secondary onPress={()=>setMode('login')}/><Hint>保存账号密码后无需手动打开浏览器。登录失效会自动在后台恢复；验证码或二次验证出现时才需要你处理。</Hint></>}
   <Button dismiss title={DEMO_MODE?`连接示例${name}账号`:`在${name}网页登录`} secondary onPress={manual}/>
   {(state.connected||status?.enabled)&&<Button title={`同步${name}作业`} secondary busy={syncing} onPress={()=>void run(async()=>{if(state.connected)await (haoke?store.syncHaoke():store.syncZhixuemeng());else background();})}/>}
   {syncing&&<Button title="取消本次同步" secondary onPress={cancel}/>}
   {state.connected&&<Button dismiss title={`断开${name}连接`} secondary onPress={()=>setMode('disconnect')}/>}
  </>}
  {!!error&&<Hint error>{error}</Hint>}
 </Sheet>;
}
