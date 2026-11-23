import React,{useEffect,useState} from 'react';
import {Platform,View} from 'react-native';
import Text from './LocalizedText';

import {Button,Checkbox,Field,Hint,Sheet} from './components';
import {useTheme} from './theme';
import {canvasStudentLogin} from '../services/tongji-credentials';
import {haokeStudentLogin} from '../services/haoke-credentials';
import type {TongjiLoginStatus} from '../core/tongji-login';
import {DEMO_MODE} from '../services/demo-mode';
export default function TongjiLoginSheet({onClose,platform='canvas'}:{onClose:()=>void;platform?:'canvas'|'haoke'}){
  const service=platform==='haoke'?haokeStudentLogin:canvasStudentLogin;
  const t=useTheme(),[status,setStatus]=useState<TongjiLoginStatus|null>(null),[studentId,setStudentId]=useState(DEMO_MODE?'20260001':''),[password,setPassword]=useState(DEMO_MODE?'demo-only-password':''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const refresh=async()=>setStatus(await service.status());
  useEffect(()=>{void refresh().catch(e=>setError(e.message));},[]);
  const run=async(work:()=>Promise<void>)=>{setBusy(true);setError('');try{await work();await refresh();}catch(e){setError(e instanceof Error?e.message:'本机登录设置未完成。');}finally{setBusy(false);}};
  return <Sheet visible title={platform==='haoke'?'好课学号自动登录':'Canvas 学号自动登录'} onClose={onClose}>
    <Hint>{DEMO_MODE?'当前为演示，只在本页内存中使用示例学号密码，不连接学校。':`学号和密码仅保存在本机系统安全存储中，只在${platform==='haoke'?'好课':'同济 Canvas'}官方登录页填写，不进入聊天记录、AI 或源码导出。两平台分别保存，分别开关。`}</Hint>
    <View style={{padding:16,backgroundColor:t.soft,borderRadius:18,gap:8}}><Text style={{color:t.fg,fontWeight:'600'}}>{status?.enabled?'本机自动登录已开启':'本机自动登录未开启'}</Text>{status?.enabled&&<Hint>{status.studentId} · {status.state==='needs-user'?'上次登录未完成，已暂停自动重试':'准备就绪'}</Hint>}{status?.lastSuccess&&<Hint>最近成功：{new Date(status.lastSuccess).toLocaleString('zh-CN')}</Hint>}</View>
    <Field label="学校学号" value={studentId} onChangeText={setStudentId} keyboardType="number-pad" autoComplete="username" textContentType="username" autoCapitalize="none" autoCorrect={false} maxLength={20}/>
    <Field label="学号登录密码" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" autoCapitalize="none" autoCorrect={false} maxLength={128}/>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Checkbox checked={consent} label="同意仅在本机安全保存学号和密码" onPress={()=>setConsent(v=>!v)}/><Text style={{flex:1,color:t.fg,fontSize:13,lineHeight:21}}>我同意仅在本机安全保存学号和密码，用于同济官方学号登录。</Text></View>
    <Hint>{platform==='haoke'?'自动选择“学号/教师工号”，核对学校为同济大学，并勾选“一周内自动登录”。':'通过 iam.tongji.edu.cn 统一身份认证登录，沿用学校的会话策略。'}验证码、二次验证或密码错误时停止自动重试，改由你在官方页面完成。</Hint>
    <Hint>{platform==='haoke'?'保存后自动在后台连接；每次打开 App 自动同步，票据失效时自动恢复。':'首次需选择并授权维护 TJMuse 专用令牌；此后每次打开 App 自动同步，统一认证失效时会使用这里保存的信息。'}</Hint>
    <Button title="保存并启用自动登录" busy={busy} disabled={!consent||Platform.OS==='web'&&!DEMO_MODE} onPress={()=>{void run(async()=>{await service.save(studentId,password,consent);setStudentId('');setPassword('');setConsent(false);});}}/>
    {status?.state==='needs-user'&&<Button title="允许再次尝试自动登录" secondary disabled={busy} onPress={()=>{void run(service.retry);}}/>}
    {status?.enabled&&<Button title="关闭并删除本机登录信息" secondary disabled={busy} onPress={()=>{void run(async()=>{await service.clear();setStudentId('');setPassword('');setConsent(false);});}}/>}
    {!!error&&<Hint error>{error}</Hint>}
  </Sheet>;
}
