import {ZHIXUEMENG_READER} from '../core/zhixuemeng-reader';
import {EXPIRED_PLATFORM_SESSION_SCRIPT} from '../core/webview-helpers.generated';
export const ZHIXUEMENG_URL='https://h5.zhixuemeng.com/#/pages/index/index';
export const ZHIXUEMENG_LOGIN='https://h5.zhixuemeng.com/#/pages/login/login';
export const ZHIXUEMENG_MOBILE_AGENT='Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.34 Mobile Safari/537.36';
export function zhixuemengCaptureScript(nonce:string,expected?:string){return `(async()=>{
 if(location.origin!=='https://h5.zhixuemeng.com'||window.top!==window.self)return;
 if(window.__tjmuseZxmReading)return;window.__tjmuseZxmReading=true;
 const send=value=>window.ReactNativeWebView.postMessage(JSON.stringify({nonce:${JSON.stringify(nonce)},kind:'zhixuemeng-result',...value}));
 const storage=key=>{const raw=localStorage.getItem(key);try{const v=JSON.parse(raw);return v&&typeof v==='object'&&'data'in v?v.data:v;}catch{return raw;}};
 try{
  const identity=storage('login_user_info'),token=storage('Access-Token')||storage('token');
  if(!identity?.id||typeof token!=='string'||!token)throw Error('login_required');
  const allowed=['/sys/user/queryById','/edu/eduCourseUser/appList','/edu/eduCourseWork/todoList','/edu/eduCourseWorkUser/list','/edu/eduCourseWorkTi/list'];
  const deadline=Date.now()+105000;
  const expired=${EXPIRED_PLATFORM_SESSION_SCRIPT};
  const request=async(path,query)=>{
   if(!allowed.includes(path)||Date.now()>deadline)throw Error('read_timeout');
   const url=new URL('https://admin.zhixuemeng.com/jeecg-boot'+path);for(const[k,v]of Object.entries(query))url.searchParams.set(k,String(v));
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
   try{const r=await fetch(url.href,{method:'GET',headers:{'X-Access-Token':token,Accept:'application/json'},credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal});
    if([401,403].includes(r.status))throw Error('login_required');if(!r.ok)throw Error('read_failed');
    const text=await r.text();if(text.length>5000000)throw Error('result_too_large');const v=JSON.parse(text);
    if(expired(r.status,v.code,v.message))throw Error('login_required');if(v.success!==true||![0,200].includes(Number(v.code))||!v.result)throw Error('read_failed');return v.result;
   }finally{clearTimeout(timer);}
  };
  const read=${ZHIXUEMENG_READER},snapshot=await read(request,identity,${JSON.stringify(expected||'')});send({snapshot});
 }catch(e){const code=String(e.message||'read_failed');send({error:/^[a-z_]+$/.test(code)?code:'read_failed'});}finally{window.__tjmuseZxmReading=false;}
})();true;`;}
export function trustedZhixuemengLogin(raw:string){try{const u=new URL(raw);return u.origin==='https://h5.zhixuemeng.com'&&!u.username&&!u.password&&['#/','#/pages/login/login',''].includes(u.hash);}catch{return false;}}
export function zhixuemengLoginScript(nonce:string,credentials?:{studentId:string;password:string}){return `(function(){
 if(location.origin!=='https://h5.zhixuemeng.com'||!['#/','#/pages/login/login',''].includes(location.hash)||window.top!==window.self)return;
 const nonce=${JSON.stringify(nonce)},credentials=${JSON.stringify(credentials||null)},send=status=>window.ReactNativeWebView.postMessage(JSON.stringify({nonce,kind:'zhixuemeng-login',status}));
 const visible=e=>e&&e.getBoundingClientRect().height>0&&e.getBoundingClientRect().width>0;
 const fields=()=>{const p=[...document.querySelectorAll('input[type=password]')].filter(visible),u=[...document.querySelectorAll('input:not([type=password])')].filter(visible),b=[...document.querySelectorAll('uni-button,button')].filter(e=>visible(e)&&e.textContent.trim()==='登录');return p.length===1&&u.length===1&&b.length===1?{u:u[0],p:p[0],b:b[0]}:null;};
 if(!window.__tjmuseZxmAuthResultHook){
  window.__tjmuseZxmAuthResultHook=true;
  const endpoint=raw=>{try{return new URL(raw,location.href).href==='https://admin.zhixuemeng.com/jeecg-boot/sys/mLogin';}catch{return false;}};
  const result=value=>{if(value?.success===true||!window.__tjmuseZxmSubmitting)return;const text=String(value?.message||value?.msg||'');if(/(?:账号|用户|密码).*(?:错误|不正确|不存在|不匹配)/.test(text))send('credentials-rejected');else if(/验证码|二次验证/.test(text))send('verification-required');else send('page-not-ready');};
  if(typeof window.fetch==='function'){const original=window.fetch;window.fetch=function(...args){const promise=original.apply(this,args);if(endpoint(typeof args[0]==='string'?args[0]:args[0]?.url))promise.then(r=>r.clone().json()).then(result).catch(()=>{});return promise;};}
  if(typeof XMLHttpRequest==='function'){const open=XMLHttpRequest.prototype.open,sendRequest=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.open=function(method,url,...rest){this.__tjmuseLoginRequest=endpoint(url);return open.call(this,method,url,...rest);};XMLHttpRequest.prototype.send=function(...args){if(this.__tjmuseLoginRequest)this.addEventListener('load',()=>{try{result(JSON.parse(this.responseText));}catch{}});return sendRequest.apply(this,args);};}
 }
 if(!credentials){if(window.__tjmuseZxmProbe===nonce)return;window.__tjmuseZxmProbe=nonce;let sent=false;const timer=setInterval(()=>{if(fields()&&!sent){sent=true;send('form-ready');}},400);setTimeout(()=>clearInterval(timer),60000);return;}
 if(window.__tjmuseZxmAttempted)return;window.__tjmuseZxmAttempted=true;const form=fields();if(!form){send('page-not-ready');return;}
 const set=(e,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,v);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));};
 set(form.u,credentials.studentId);set(form.p,credentials.password);setTimeout(()=>{if(fields()?.b!==form.b)return;window.__tjmuseZxmSubmitting=true;send('submitting');form.b.click();setTimeout(()=>{if(fields())send('page-not-ready');},35000);},250);
})();true;`;}
export function zhixuemengMonitorScript(nonce:string,expected?:string){return `(function(){
 if(window.__tjmuseZxmMonitor===${JSON.stringify(nonce)})return;window.__tjmuseZxmMonitor=${JSON.stringify(nonce)};
 let anonymousReported=false;
 const scan=()=>{
   const visible=e=>e.getBoundingClientRect().height>0&&e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden';
   if([...document.querySelectorAll('input[type=password]')].some(visible)){${zhixuemengLoginScript(nonce)}}
   else if(localStorage.getItem('Access-Token')||localStorage.getItem('token')){anonymousReported=false;${zhixuemengCaptureScript(nonce,expected)}}
   else if(!anonymousReported){anonymousReported=true;window.ReactNativeWebView.postMessage(JSON.stringify({nonce:${JSON.stringify(nonce)},kind:'zhixuemeng-result',error:'login_required'}));}
 };
 scan();const timer=setInterval(scan,1600);window.addEventListener('hashchange',scan);setTimeout(()=>{clearInterval(timer);window.removeEventListener('hashchange',scan);},600000);
})();true;`;}
