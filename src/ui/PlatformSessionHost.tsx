import React, { useCallback, useEffect, useRef, useState } from 'react';

import WebSessionScreen from './WebSessionScreen';
import BackgroundWebSession from './BackgroundWebSession';
import {createCanvasListLifecycle} from '../core/canvas-list-lifecycle';
import {createHaokeSessionRead} from '../core/haoke-session-read';
import {canUseSavedPlatformLogin} from '../core/session-login-policy';
import {canvasManualTokenScript} from '../services/canvas-manual-token';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { CANVAS_ROTATION_SCRIPT } from '../services/canvas-rotation-script';
import { registerSessionHost, WebSessionError,sessionTimeoutMs, type SessionJob, type SessionResult } from '../services/web-session';
import {transientWebNavigationError} from '../core/platform-session-errors';
import { Button } from './components';
import { timetableCaptureScript, TIMETABLE_DESKTOP_AGENT, TONGJI_TIMETABLE_URL } from '../services/timetable';
import { FORCE_TIMETABLE_DESKTOP_SCRIPT } from '../services/timetable-page-scripts';
import { sameFrameNavigationScript, sessionWebViewNavigation } from '../services/web-navigation';
import { canvasSessionCheckScript } from '../services/canvas-session-check';
import { tongjiStudentLoginScript, trustedTongjiLoginPage, trustedTongjiIdpPage, TONGJI_STUDENT_LOGIN_URL } from '../services/tongji-login-script';
import { canvasStudentLogin } from '../services/tongji-credentials';
import {haokeStudentLogin} from '../services/haoke-credentials';
import ZhixuemengSession from './ZhixuemengSession';
import {HAOKE_STUDENT_LOGIN_URL,haokeStudentLoginScript,haokeReadSessionScript,trustedHaokeLoginPage} from '../services/haoke-login-script';

const CANVAS = 'https://canvas.tongji.edu.cn', HAOKE = 'https://tongji.aihaoke.net';
interface ActiveJob extends SessionJob { nonce: string; resolve: (value: SessionResult) => void; reject: (error: Error) => void; loginReserved?:boolean; studentAttempt?:{id:string;attemptId:string}; rememberSelected?:boolean; studentLoginEnabled?:boolean; studentRouteVisited?:boolean; returnedToProfile?:boolean; cleanup?:()=>void; submitted?:boolean; needsUser?:boolean }
const isCanvasJob=(job:SessionJob)=>job.kind.startsWith('canvas-');
const loginService=(job:SessionJob)=>isCanvasJob(job)?canvasStudentLogin:job.kind==='haoke-login'?haokeStudentLogin:null;
export default function PlatformSessionHost() {
  const [job, setJob] = useState<ActiveJob | null>(null), [reading, setReading] = useState(false), [messageText, setMessageText] = useState('');
  const active = useRef<ActiveJob | null>(null), web = useRef<WebView<{}>>(null), url = useRef(''), started = useRef(false);
  const [desktop,setDesktop]=useState(true);
  const listClose=useRef<(()=>void)|null>(null),listLifecycle=useRef<ReturnType<typeof createCanvasListLifecycle<SessionResult>>|null>(null);
  const haokeRead=useRef<ReturnType<typeof createHaokeSessionRead>|null>(null);
  const finishNow = useCallback((error?: Error, result?: SessionResult) => {
    const current = active.current; if (!current) return;
    current.cleanup?.();
    if(current.kind==='haoke-login'){haokeRead.current?.dispose();haokeRead.current=null;}
    if(current.kind==='canvas-list'){listLifecycle.current?.dispose();listLifecycle.current=null;current.onDismissed?.();}
    if(error&&current.studentAttempt&&!current.needsUser)void loginService(current)?.release(current.studentAttempt.id,current.studentAttempt.attemptId).catch(()=>{});
    active.current = null; web.current?.stopLoading(); setJob(null); setReading(false);
    if (error) current.reject(error); else current.resolve(result!);
  }, []);
  const finish=useCallback((error?:Error,result?:SessionResult)=>{
    if(active.current?.kind==='canvas-list'&&listLifecycle.current)listLifecycle.current.finish(error,result);
    else finishNow(error,result);
  },[finishNow]);
  useEffect(() => registerSessionHost(request => new Promise((resolve, reject) => {
    if (active.current) return reject(new WebSessionError('busy'));
    const value:ActiveJob = { ...request, resolve, reject, nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` };
    if(value.kind==='canvas-list')listLifecycle.current=createCanvasListLifecycle<SessionResult>({
      nonce:value.nonce,reading:setReading,readTimedOut:()=>setMessageText('网页加载未完成，请重试加载。'),
      requestClose:()=>{if(!listClose.current)return false;listClose.current();return true;},
      forceUnmount:()=>{if(active.current===value)setJob(null);},
      complete:(error,result)=>{if(active.current===value)finishNow(error,result);},
      cancelError:()=>new WebSessionError('cancelled'),
    });
    if(value.kind==='haoke-login')haokeRead.current=createHaokeSessionRead({nonce:value.nonce,reading:setReading,expired:()=>{
      if(active.current!==value)return;
      if(value.silent)finish(new WebSessionError('login_page_not_ready'));
      else setMessageText('登录信息读取超时，请重试读取；当前网页登录会保留。');
    }});
    active.current = value; started.current = false; url.current = ''; setReading(false); setMessageText('');setDesktop(true);
    const abort=()=>{if(active.current===value)finish(request.signal?.reason instanceof Error?request.signal.reason:new WebSessionError('cancelled'));};
    request.signal?.addEventListener('abort',abort,{once:true});value.cleanup=()=>request.signal?.removeEventListener('abort',abort);if(request.signal?.aborted){abort();return;}
    // A manual Canvas page must remain usable while secure credential storage is slow.
    if(value.kind==='canvas-browser')setJob(value);
    const credentials=loginService(value);
    if(credentials)void credentials.status().then(status=>{if(active.current===value){
      value.studentLoginEnabled=canUseSavedPlatformLogin(value.kind,status);setJob(value.kind==='canvas-browser'?{...value}:value);
      if(value.kind==='canvas-browser'&&value.studentLoginEnabled&&trustedTongjiLoginPage(url.current))web.current?.injectJavaScript(tongjiStudentLoginScript(value.nonce));
    }}).catch(()=>{if(active.current===value){if(value.kind==='canvas-browser')setMessageText('请先在官方网页完成登录，再读取连接。');else finish(new WebSessionError('secure_save_or_bridge_failed'));}});
    else setJob(value);
  })), [finish,finishNow]);
  useEffect(() => {
    if (!job) return;
    const timer = setTimeout(() => {if(active.current?.nonce===job.nonce)finish(new WebSessionError(job.kind==='canvas-keepalive'?'login_required':'login_or_web_timeout'));},sessionTimeoutMs(job));
    return () => clearTimeout(timer);
  }, [job, finish]);
  useEffect(() => () => { haokeRead.current?.dispose();listLifecycle.current?.dispose();active.current?.onDismissed?.();active.current?.cleanup?.();active.current?.reject(new WebSessionError('cancelled')); active.current = null; }, []);
  useEffect(()=>{
    const changed=(service:typeof canvasStudentLogin)=>{
    const current=active.current;if(!current||loginService(current)!==service)return;
    if(current.loginReserved){finish(new WebSessionError('cancelled'));return;}
    void service.status().then(status=>{
      if(active.current!==current)return;current.studentLoginEnabled=canUseSavedPlatformLogin(current.kind,status);
      if(isCanvasJob(current)&&status.enabled&&trustedTongjiLoginPage(url.current))web.current?.injectJavaScript('window.__tjmuseLoginProbe=null;'+tongjiStudentLoginScript(current.nonce));
      else if(current.kind==='haoke-login'&&status.enabled&&trustedHaokeLoginPage(url.current))web.current?.injectJavaScript('window.__tjmuseHaokeProbe=null;'+haokeStudentLoginScript(current.nonce));
    }).catch(()=>{if(active.current===current)finish(new WebSessionError('secure_save_or_bridge_failed'));});
    };
    const canvas=canvasStudentLogin.subscribe(()=>changed(canvasStudentLogin)),haoke=haokeStudentLogin.subscribe(()=>changed(haokeStudentLogin));
    return()=>{canvas();haoke();};
  },[finish]);
  const inject = () => {
    const current = active.current; if (!current || reading) return;
    if(current.kind==='canvas-browser'){
      const origin=new URL(String(current.config?.url||CANVAS)).origin;
      if(!url.current.startsWith(origin+'/profile/settings')){setMessageText('请先完成学校登录，进入 Canvas 用户设置页。');return;}
      setReading(true);web.current?.injectJavaScript(canvasManualTokenScript(current.nonce,origin,true));return;
    }
    const origin = current.kind === 'timetable' ? 'https://1.tongji.edu.cn' : current.kind === 'haoke-login' ? HAOKE : CANVAS;
    try { if (new URL(url.current).origin !== origin) throw new Error(); } catch { setMessageText('请先在官方网页完成登录，再读取连接。'); return; }
    if(current.kind==='canvas-list'){
      const nonce=listLifecycle.current?.begin();if(!nonce)return;
      setMessageText('');web.current?.injectJavaScript(`${CANVAS_ROTATION_SCRIPT}\nwindow.CanvasRotation.startList(${JSON.stringify({nonce})});true;`);return;
    }
    if(current.kind==='haoke-login'){
      const nonce=haokeRead.current?.begin();if(!nonce)return;
      setMessageText('');
      try{web.current?.injectJavaScript(haokeReadSessionScript(nonce));}catch{haokeRead.current?.cancel();setMessageText('登录信息读取未完成，请重试读取。');}
      return;
    }
    setMessageText('');
    setReading(true);
    if(current.kind==='timetable'){
      if(new URL(url.current).pathname!=='/GraduateStudentTimeTable'){setReading(false);setMessageText('请先打开学生个人课表页面。');return;}
      web.current?.injectJavaScript(timetableCaptureScript(current.nonce));
    } else if (current.kind === 'canvas-keepalive') {
      web.current?.injectJavaScript(canvasSessionCheckScript(current.nonce,String(current.config?.accountId||'')));
    } else {
      const method = 'start';
      web.current?.injectJavaScript(`${CANVAS_ROTATION_SCRIPT}\nwindow.CanvasRotation.${method}(${JSON.stringify({ ...current.config, nonce: current.nonce, credentialsOnly: true })});true;`);
    }
  };
  const message = async (event: WebViewMessageEvent) => {
    const current = active.current; if (!current || event.nativeEvent.data.length > (current.kind==='timetable'?800000:65536)) return;
    if(current.kind==='canvas-browser'){
      try{const value=JSON.parse(event.nativeEvent.data),origin=new URL(String(current.config?.url||CANVAS)).origin;
        if(value.nonce!==current.nonce||value.kind!=='canvas-manual-token'||new URL(event.nativeEvent.url).origin!==origin)return;
        setReading(false);
        if(typeof value.token==='string'&&/^[A-Za-z0-9._~-]{30,4096}$/.test(value.token))finish(undefined,{status:'ok',token:value.token});
        else setMessageText('没有读到完整令牌。请先创建新令牌并保留显示完整值的窗口，或返回后手动粘贴。');
      }catch{setReading(false);setMessageText('令牌未读取，请重试。');}return;
    }
    const origin = current.kind === 'timetable' ? 'https://1.tongji.edu.cn' : current.kind === 'haoke-login' ? HAOKE : CANVAS;
    try {
      const value = JSON.parse(event.nativeEvent.data);
      if(current.kind==='haoke-login'&&value.kind==='haoke'){
        if(new URL(url.current).origin!==HAOKE||new URL(event.nativeEvent.url).origin!==HAOKE||!haokeRead.current?.accept(value.nonce))return;
        if(typeof value.token==='string'&&/^[!-~]{1,4096}$/.test(value.token))finish(undefined,{status:'ok',token:value.token,loginAttempt:current.studentAttempt});
        else if(current.silent)finish(new WebSessionError('login_page_not_ready'));
        else setMessageText('登录信息读取未完成，请重试读取。');
        return;
      }
      if(current.kind==='canvas-list'&&value.kind==='done'){
        if(new URL(url.current).origin!==CANVAS||new URL(event.nativeEvent.url).origin!==CANVAS)return;
        const error=value.result?.status==='ok'?undefined:new WebSessionError(String(value.result?.status||'invalid_result'));
        if(listLifecycle.current?.accept(value.nonce,error,value.result)&&!error&&current.studentAttempt){
          const attempt=current.studentAttempt;current.studentAttempt=undefined;
          void canvasStudentLogin.succeeded(attempt.id,attempt.attemptId).catch(()=>{});
        }
        return;
      }
      if (value.nonce !== current.nonce) return;
      if(value.kind==='student-login'&&isCanvasJob(current)||value.kind==='haoke-student-login'&&current.kind==='haoke-login'){
        const service=loginService(current)!,trusted=current.kind==='haoke-login'?trustedHaokeLoginPage:trustedTongjiLoginPage;
        if(!trusted(url.current)||!trusted(event.nativeEvent.url))return;
        if(value.status==='submitting'){current.submitted=true;return;}
        if(value.status==='remember-selected'){current.rememberSelected=true;return;}
        if(value.status==='form-ready'&&!current.loginReserved&&current.studentLoginEnabled){
          current.loginReserved=true;
          const credentials=await service.reserve();
          if(!credentials){current.loginReserved=false;if(current.silent)finish(new WebSessionError('login_requires_interaction'));return;}
          if(active.current!==current||!trusted(url.current)){
            await service.release(credentials.id,credentials.attemptId!);return;
          }
          current.studentAttempt={id:credentials.id,attemptId:credentials.attemptId!};
          const script=current.kind==='haoke-login'?haokeStudentLoginScript:tongjiStudentLoginScript;
          web.current?.injectJavaScript(script(current.nonce,{studentId:credentials.studentId,password:credentials.password}));return;
        }
        if(value.status==='page-not-ready'){setMessageText('登录页面尚未就绪，请重新加载网页。');if(current.silent)finish(new WebSessionError('login_page_not_ready'));return;}
        if(['needs-user','remember-missing','credentials-rejected','verification-required'].includes(value.status)){current.needsUser=true;
          if(current.studentAttempt)await service.failed(current.studentAttempt.id,current.studentAttempt.attemptId,value.status==='credentials-rejected'?'credentials-rejected':'verification-required');
          setMessageText('自动登录已暂停，请在官方页面完成验证码／二次验证，或检查保存的学号密码。');
          if(current.kind==='canvas-rotate'||current.kind==='canvas-keepalive'||current.silent)finish(new WebSessionError('login_requires_interaction'));
        }
        return;
      }
      if (new URL(url.current).origin !== origin || new URL(event.nativeEvent.url).origin !== origin) return;
      if(current.kind==='timetable' && value.kind==='timetable'){
        if(value.error){setReading(false);setMessageText(String(value.error).slice(0,200));}
        else if(new URL(url.current).pathname==='/GraduateStudentTimeTable')finish(undefined,{status:'ok',timetable:value.capture});
      } else if (current.kind==='canvas-rotate'&&(value.kind === 'candidate' || value.kind === 'verified')) {
        const kind = value.kind;
        if (kind === 'candidate') await current.onCandidate?.(value.record);
        else await current.onVerified?.();
        if (active.current !== current) return;
        web.current?.injectJavaScript(`window.__canvasLabAck(${JSON.stringify(kind)},true);true;`);
      } else if (isCanvasJob(current)&&value.kind === 'done') {
        if (value.result?.status !== 'ok') finish(new WebSessionError(String(value.result?.status || 'invalid_result')));
        else {
          if(current.studentAttempt&&/^\d+$/.test(value.result?.accountId||String(current.config?.accountId||'')))await canvasStudentLogin.succeeded(current.studentAttempt.id,current.studentAttempt.attemptId);
          if(active.current===current)finish(undefined, value.result);
        }
      }
    } catch { if(active.current===current)finish(new WebSessionError('secure_save_or_bridge_failed')); }
  };
  if (!job) return null;
  if(job.kind==='zhixuemeng-sync')return <ZhixuemengSession key={job.nonce} job={job} onFinish={(error,result)=>{if(active.current?.nonce===job.nonce)finish(error,result);}}/>;
  const hidden = job.kind === 'canvas-rotate' || job.kind === 'canvas-keepalive'||job.silent===true;
  const navigation = sessionWebViewNavigation(job.kind, target => {
    const current = active.current;
    // Wait until the native delegate has cancelled the insecure redirect. Keep the
    // existing WebView/data store, including the school's authenticated cookies.
    setTimeout(() => { if (current && active.current === current) web.current?.injectJavaScript(sameFrameNavigationScript(target)); }, 0);
  }, setMessageText);
  const end=(error:Error)=>{if(active.current?.nonce===job.nonce)finish(error);};
  const body = <WebView<{}> ref={web} key={job.nonce} source={{ uri: job.kind==='timetable'?TONGJI_TIMETABLE_URL:job.kind === 'haoke-login' ? job.config?.forceLogin?HAOKE_STUDENT_LOGIN_URL:`${HAOKE}/student/course` : job.kind==='canvas-browser'?String(job.config?.url||`${CANVAS}/profile/settings`):`${CANVAS}/profile/settings` }}
    userAgent={job.kind==='haoke-login'?'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.34 Mobile Safari/537.36':isCanvasJob(job)||job.kind==='timetable'&&desktop?TIMETABLE_DESKTOP_AGENT:undefined}
    removeIosKeyboardObserver={true} automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never" automaticallyAdjustsScrollIndicatorInsets={false} contentInset={{top:0,left:0,right:0,bottom:0}}
    javaScriptEnabled domStorageEnabled sharedCookiesEnabled thirdPartyCookiesEnabled incognito={false} cacheEnabled useSharedProcessPool mixedContentMode="never" allowFileAccess={false}
    webviewDebuggingEnabled={false} {...navigation}
    onLoadStart={event=>{const current=active.current;if(current?.nonce!==job.nonce)return;
      if(current.kind==='haoke-login'){haokeRead.current?.cancel();started.current=false;url.current=event.nativeEvent.url;}
      if(current.kind==='canvas-browser'||current.kind==='canvas-list')current.onPresented?.();}}
    onNavigationStateChange={state => { if(active.current?.nonce===job.nonce)url.current = state.url; }}
    onLoadEnd={event => {
      const current=active.current;if(!current||current.nonce!==job.nonce)return;url.current = event.nativeEvent.url;
      if(current.kind==='haoke-login'){
        if(trustedHaokeLoginPage(url.current)){if(current.silent&&!current.studentLoginEnabled){finish(new WebSessionError('login_requires_interaction'));return;}web.current?.injectJavaScript(haokeStudentLoginScript(current.nonce));return;}
        try{if(new URL(url.current).origin===HAOKE&&!started.current){started.current=true;inject();return;}}catch{}
      }
      if(current.kind==='canvas-browser'&&url.current.startsWith(CANVAS+'/login/canvas')&&!current.studentRouteVisited){current.studentRouteVisited=true;web.current?.injectJavaScript(sameFrameNavigationScript(TONGJI_STUDENT_LOGIN_URL));return;}
      if(current.kind==='canvas-browser')web.current?.injectJavaScript(canvasManualTokenScript(current.nonce,new URL(String(current.config?.url||CANVAS)).origin));
      if(isCanvasJob(current)&&current.studentLoginEnabled){
        if(trustedTongjiLoginPage(url.current)){web.current?.injectJavaScript(tongjiStudentLoginScript(current.nonce));return;}
        if(url.current.startsWith(CANVAS+'/login/canvas')&&!current.studentRouteVisited){current.studentRouteVisited=true;web.current?.injectJavaScript(sameFrameNavigationScript(TONGJI_STUDENT_LOGIN_URL));return;}
        try{const location=new URL(url.current);if(current.studentAttempt&&!current.returnedToProfile&&location.origin===CANVAS&&!location.pathname.startsWith('/login')&&location.pathname!=='/profile/settings'){current.returnedToProfile=true;web.current?.injectJavaScript(sameFrameNavigationScript(CANVAS+'/profile/settings'));return;}}catch{}
      }
      if(job.kind==='timetable'&&desktop&&url.current.startsWith(TONGJI_TIMETABLE_URL))web.current?.injectJavaScript(FORCE_TIMETABLE_DESKTOP_SCRIPT+';true;');
      if((hidden||current.studentLoginEnabled)&&!started.current&&url.current.startsWith(CANVAS+'/profile/settings')){started.current=true;inject();}
    }}
    onMessage={event => { void message(event); }} onError={event => {if(!transientWebNavigationError(event.nativeEvent.code)){if(hidden)end(new WebSessionError('web_network_error'));else setMessageText('网页加载未完成，请重试加载。');}}}
    onContentProcessDidTerminate={() => end(new WebSessionError('web_process_stopped'))}
    onRenderProcessGone={() => end(new WebSessionError('web_process_stopped'))} style={{ flex: 1 }} />;
  if (hidden) return <BackgroundWebSession>{body}</BackgroundWebSession>;
  return <WebSessionScreen dismissRef={job.kind==='canvas-list'?listClose:undefined} onCloseRequest={job.kind==='canvas-list'?()=>finish(new WebSessionError('cancelled')):undefined} title={job.kind==='timetable'?'同济个人课表':job.kind==='haoke-login'?'好课官方登录':'Canvas 官方登录'} hint={job.kind==='timetable'?'完成学校认证，选择学期后读取个人课表。':job.kind==='haoke-login'?'已保存的学号密码会自动填写，登录成功后自动连接。':'完成学校登录，创建专用令牌后读取并保存。'} message={messageText} onClose={()=>{if(job.kind==='canvas-list'){if(active.current?.nonce===job.nonce)listLifecycle.current?.dismissed();}else finish(new WebSessionError('cancelled'));}} footer={<>
    {job.kind==='timetable'&&<Button secondary title={desktop?'切换手机网页':'切换桌面网页'} onPress={()=>{setDesktop(v=>!v);setTimeout(()=>web.current?.reload(),100);}}/>}
    {!!messageText&&<Button secondary title="重新加载网页" onPress={()=>{started.current=false;web.current?.reload();}}/>}
    <Button title={job.kind==='canvas-browser'?'读取并保存令牌':job.kind==='timetable'?'读取当前个人课表':job.kind==='haoke-login'?'已登录，读取并连接':'已登录，读取可选令牌'} busy={reading} onPress={inject}/>
    {job.kind==='canvas-browser'&&<Button secondary title="返回连接设置" onPress={()=>finish(undefined,{status:'ok'})}/>}
  </>}>{body}</WebSessionScreen>;
}
