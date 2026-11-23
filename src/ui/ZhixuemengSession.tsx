import React,{useEffect,useRef,useState} from 'react';
import {WebView,type WebViewMessageEvent} from 'react-native-webview';
import {zhixuemengCaptureScript,zhixuemengMonitorScript,zhixuemengLoginScript,ZHIXUEMENG_URL,ZHIXUEMENG_LOGIN,ZHIXUEMENG_MOBILE_AGENT,trustedZhixuemengLogin} from '../services/zhixuemeng-page';
import {zhixuemengLogin} from '../services/zhixuemeng-credentials';
import {WebSessionError,type SessionJob,type SessionResult} from '../services/web-session';
import {sessionWebViewNavigation,sameFrameNavigationScript} from '../services/web-navigation';
import type {CanvasAssignment} from '../core/types';
import {Button} from './components';
import WebSessionScreen from './WebSessionScreen';
import BackgroundWebSession from './BackgroundWebSession';
import {transientWebNavigationError} from '../core/platform-session-errors';

export default function ZhixuemengSession({job,onFinish}:{job:SessionJob&{nonce:string};onFinish:(error?:Error,result?:SessionResult)=>void}){
 const web=useRef<WebView<{}>>(null),url=useRef(''),alive=useRef(true),recovering=useRef(false),reserved=useRef(false),submitted=useRef(false),needsUser=useRef(false);
 const [ready,setReady]=useState(false),[automatic,setAutomatic]=useState(false),[message,setMessage]=useState('');
 const attempt=useRef<{id:string;attemptId:string}|null>(null);
 const processRestarts=useRef(0);
 useEffect(()=>{alive.current=true;void zhixuemengLogin.status().then(s=>{if(alive.current){setAutomatic(s.enabled&&s.state==='ready');setReady(true);}}).catch(()=>onFinish(new WebSessionError('secure_save_or_bridge_failed')));return()=>{alive.current=false;if(attempt.current&&!needsUser.current)void zhixuemengLogin.release(attempt.current.id,attempt.current.attemptId).catch(()=>{});};},[]);
 const problem=(code:string)=>{if(!alive.current)return;if(job.silent)onFinish(new WebSessionError(code));else setMessage(new WebSessionError(code).message+' 可重试读取或重新加载网页。');};
 const restart=()=>{if(processRestarts.current++<1){web.current?.reload();setMessage('网页进程已重新加载，请稍候。');}else problem('web_process_stopped');};
 const read=()=>web.current?.injectJavaScript(zhixuemengCaptureScript(job.nonce,String(job.config?.expectedAccountId||'')));
 const monitor=zhixuemengMonitorScript(job.nonce,String(job.config?.expectedAccountId||''));
 const receive=async(event:WebViewMessageEvent)=>{
  if(!alive.current)return;
  if(event.nativeEvent.data.length>8000000){onFinish(new WebSessionError('invalid_result'));return;}
  try{
   const v=JSON.parse(event.nativeEvent.data);if(v.nonce!==job.nonce||new URL(event.nativeEvent.url).origin!=='https://h5.zhixuemeng.com')return;
   if(v.kind==='zhixuemeng-login'){
    if(v.status==='submitting'){submitted.current=true;return;}
    if(v.status==='page-not-ready'){problem('login_page_not_ready');return;}
    if(['needs-user','credentials-rejected','verification-required'].includes(v.status)){needsUser.current=true;if(attempt.current)await zhixuemengLogin.failed(attempt.current.id,attempt.current.attemptId,v.status==='credentials-rejected'?'credentials-rejected':'verification-required');setMessage('请检查账号密码，或在网页中完成验证。');if(job.silent)onFinish(new WebSessionError('login_requires_interaction'));return;}
    if(v.status==='form-ready'&&!reserved.current){
     if(!automatic){if(job.silent)onFinish(new WebSessionError('login_requires_interaction'));return;}
     reserved.current=true;const value=await zhixuemengLogin.reserve();
     if(!value){onFinish(new WebSessionError('login_requires_interaction'));return;}
     if(!alive.current||!trustedZhixuemengLogin(url.current)){await zhixuemengLogin.release(value.id,value.attemptId!);return;}
     attempt.current={id:value.id,attemptId:value.attemptId!};web.current?.injectJavaScript(zhixuemengLoginScript(job.nonce,value));
    }return;
   }
   if(v.kind!=='zhixuemeng-result')return;
   if(v.error){
    if(v.error==='login_required'){
      setMessage('请在网页中完成登录，随后会自动读取作业。');
      if(!recovering.current){recovering.current=true;web.current?.injectJavaScript("localStorage.removeItem('Access-Token');localStorage.removeItem('token');localStorage.removeItem('login_user_info');"+sameFrameNavigationScript(ZHIXUEMENG_LOGIN));}
      return;
    }
    problem(v.error);return;
   }
   const snapshot=v.snapshot;
   if(!snapshot||!String(snapshot.userId).match(/^[A-Za-z0-9_-]{1,128}$/)||!Array.isArray(snapshot.assignments)||snapshot.assignments.length>2000)throw Error();
   if(job.silent&&automatic&&!attempt.current&&!(await zhixuemengLogin.matches(String(snapshot.loginAccount||'')))){
    if(recovering.current){onFinish(new WebSessionError('account_changed'));return;}recovering.current=true;
    web.current?.injectJavaScript("localStorage.removeItem('Access-Token');localStorage.removeItem('token');localStorage.removeItem('login_user_info');"+sameFrameNavigationScript(ZHIXUEMENG_LOGIN));return;
   }
   if(job.config?.expectedAccountId&&snapshot.userId!==job.config.expectedAccountId){onFinish(new WebSessionError('account_changed'));return;}
   const seen=new Set<string>();
   for(const a of snapshot.assignments as CanvasAssignment[]){if(a.platform!=='zhixuemeng'||!/^zhixuemeng:[A-Za-z0-9_-]{1,128}:[A-Za-z0-9_-]{1,128}$/.test(a.id)||seen.has(a.id)||typeof a.title!=='string'||a.title.length>24000||typeof a.description!=='string'||a.description.length>30000||!a.url.startsWith('https://h5.zhixuemeng.com/#/pages/class/banji_bjzy?courseCode='))throw Error();seen.add(a.id);}
   if(attempt.current)await zhixuemengLogin.succeeded(attempt.current.id,attempt.current.attemptId);
   if(alive.current)onFinish(undefined,{status:'ok',homework:snapshot});
  }catch{problem('invalid_result');}
 };
 if(!ready)return null;
 const browser=<WebView<{}> ref={web} source={{uri:ZHIXUEMENG_URL}} userAgent={ZHIXUEMENG_MOBILE_AGENT} removeIosKeyboardObserver={true} automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never" automaticallyAdjustsScrollIndicatorInsets={false} contentInset={{top:0,left:0,right:0,bottom:0}} javaScriptEnabled domStorageEnabled sharedCookiesEnabled thirdPartyCookiesEnabled incognito={false} cacheEnabled useSharedProcessPool mixedContentMode="never" allowFileAccess={false} {...sessionWebViewNavigation('zhixuemeng-sync',target=>web.current?.injectJavaScript(sameFrameNavigationScript(target)),setMessage)} onNavigationStateChange={s=>{url.current=s.url;}} onLoadEnd={e=>{url.current=e.nativeEvent.url;web.current?.injectJavaScript(monitor);}} onMessage={e=>{void receive(e);}} onError={e=>{if(!transientWebNavigationError(e.nativeEvent.code))problem('web_network_error');}} onContentProcessDidTerminate={restart} onRenderProcessGone={restart} style={{flex:1}}/>;
 if(job.silent)return <BackgroundWebSession>{browser}</BackgroundWebSession>;
 return <WebSessionScreen title="智学盟登录与同步" hint="已保存的账号密码会自动填写，登录后自动读取作业。" message={message} onClose={()=>onFinish(new WebSessionError('cancelled'))} footer={<>{!!message&&<Button secondary title="重新加载网页" onPress={()=>web.current?.reload()}/>}<Button title="已登录，读取智学盟作业" onPress={read}/></>}>{browser}</WebSessionScreen>;
}
